import { auth } from "@/lib/auth";
import {
  backfillLocationsFromScalefusion,
  fetchLocationsForDevice,
  logSyncFailure,
  pollLocationsFromScalefusion,
  syncDevicesFromScalefusion,
} from "@/lib/scalefusion/sync-service";
import { prisma } from "@/lib/db";
import { SyncType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

/** Prevent Admin UI spam from burning the shared Scalefusion 30/min budget. */
const MANUAL_COOLDOWN_MS = Number(
  process.env.SCALEFUSION_MANUAL_COOLDOWN_MS ?? 60_000
);
/** Per-device pull can be faster — still avoid spam. */
const DEVICE_PULL_COOLDOWN_MS = Number(
  process.env.SCALEFUSION_DEVICE_PULL_COOLDOWN_MS ?? 5_000
);
/** Admin UI backfill is capped — full 30-day fleet runs via worker. */
const UI_BACKFILL_MAX_DAYS = Number(
  process.env.SCALEFUSION_UI_BACKFILL_MAX_DAYS ?? 1
);

function syncTypeForAction(action: string): SyncType {
  if (action === "poll" || action === "device-poll") {
    return SyncType.LOCATION_POLL;
  }
  if (action === "backfill") return SyncType.HISTORY_BACKFILL;
  return SyncType.DEVICE_SYNC;
}

async function assertManualCooldown(
  syncType: SyncType,
  cooldownMs = MANUAL_COOLDOWN_MS
): Promise<string | null> {
  const last = await prisma.syncLog.findFirst({
    where: { syncType },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return null;

  const elapsed = Date.now() - last.createdAt.getTime();
  if (elapsed < cooldownMs) {
    const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
    return `รออีก ${waitSec} วินาทีก่อนเรียกอีกครั้ง (กัน rate limit)`;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action ?? "devices";
  const syncType = syncTypeForAction(action);

  // Per-device pull: short cooldown only (don't block behind full fleet poll)
  if (action !== "device-poll") {
    const cooldownMsg = await assertManualCooldown(syncType);
    if (cooldownMsg) {
      return NextResponse.json({ error: cooldownMsg }, { status: 429 });
    }
  } else {
    const cooldownMsg = await assertManualCooldown(
      SyncType.LOCATION_POLL,
      DEVICE_PULL_COOLDOWN_MS
    );
    if (cooldownMsg) {
      return NextResponse.json({ error: cooldownMsg }, { status: 429 });
    }
  }

  try {
    if (action === "poll") {
      const result = await pollLocationsFromScalefusion();
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "device-poll") {
      if (typeof body.deviceId !== "string" || !body.deviceId) {
        return NextResponse.json(
          { error: "deviceId is required" },
          { status: 400 }
        );
      }
      const result = await fetchLocationsForDevice({
        deviceId: body.deviceId,
        date: typeof body.date === "string" ? body.date : undefined,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "backfill") {
      const days = Math.min(
        UI_BACKFILL_MAX_DAYS,
        Math.max(
          1,
          Number(body.days ?? UI_BACKFILL_MAX_DAYS) || UI_BACKFILL_MAX_DAYS
        )
      );
      const result = await backfillLocationsFromScalefusion({
        days,
        deviceId: typeof body.deviceId === "string" ? body.deviceId : undefined,
        skipExistingDays: body.force !== true,
      });
      return NextResponse.json({
        ok: true,
        ...result,
        note: `UI จำกัดที่ ${UI_BACKFILL_MAX_DAYS} วัน — ดึงเต็ม ~30 วันใช้ npm run worker:backfill`,
      });
    }

    const result = await syncDevicesFromScalefusion();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await logSyncFailure(syncType, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
