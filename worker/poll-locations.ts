/**
 * Normal GPS location poller.
 *
 * Modes (choose one via .env):
 *
 * 1) Interval (default) — every N ms
 *    POLL_INTERVAL_MS=180000
 *
 * 2) Fixed clock times (Asia/Bangkok by default)
 *    POLL_SCHEDULE=08:00,12:00,17:00,21:00
 *    POLL_TZ=Asia/Bangkok
 *
 * If POLL_SCHEDULE is set, schedule mode wins over interval.
 *
 * Catch-up (fills gaps geofence misses between polls):
 *   POLL_CATCHUP_ENABLED=1          (default on)
 *   POLL_CATCHUP_INTERVAL_MS=3600000 (hourly)
 *   POLL_CATCHUP_DAYS=1               (today only; set 2 for today+yesterday)
 *
 * Usage:
 *   npm run worker:poll
 */
import {
  backfillLocationsFromScalefusion,
  logSyncFailure,
  pollLocationsFromScalefusion,
  syncDevicesFromScalefusion,
} from "../src/lib/scalefusion/sync-service";
import { SyncType } from "@prisma/client";
import { getRateLimitStats } from "../src/lib/scalefusion/rate-limiter";

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 180000);
const DAILY_SYNC_MS = 24 * 60 * 60 * 1000;
const POLL_TZ = process.env.POLL_TZ ?? "Asia/Bangkok";
const POLL_SCHEDULE = (process.env.POLL_SCHEDULE ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Geofence only stores latest point — catch-up re-fetches today to fill track gaps. */
const POLL_CATCHUP_ENABLED = process.env.POLL_CATCHUP_ENABLED !== "0";
const POLL_CATCHUP_INTERVAL_MS = Number(
  process.env.POLL_CATCHUP_INTERVAL_MS ?? 3_600_000
);
const POLL_CATCHUP_DAYS = Math.max(
  1,
  Math.min(7, Number(process.env.POLL_CATCHUP_DAYS ?? 1))
);

let pollInFlight = false;
let syncInFlight = false;
let catchupInFlight = false;
/** Prevent double-fire within the same local minute key (YYYY-MM-DDTHH:mm). */
let lastScheduleKey: string | null = null;

function nowInTimeZone(timeZone: string): Date {
  // Create a date whose UTC getters reflect wall-clock in the target TZ.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    )
  );
}

function formatHm(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatScheduleKey(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}T${formatHm(d)}`;
}

function normalizeSchedule(times: string[]): string[] {
  const out: string[] = [];
  for (const raw of times) {
    const m = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) {
      console.warn(`[poll] ignore invalid POLL_SCHEDULE entry: ${raw}`);
      continue;
    }
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      console.warn(`[poll] ignore out-of-range POLL_SCHEDULE entry: ${raw}`);
      continue;
    }
    out.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }
  return [...new Set(out)].sort();
}

async function runPollCycle(reason: string): Promise<void> {
  if (pollInFlight || catchupInFlight) {
    console.warn(
      `[${new Date().toISOString()}] Skip poll (${reason}) — previous cycle still running`
    );
    return;
  }

  pollInFlight = true;
  try {
    const result = await pollLocationsFromScalefusion();
    console.log(
      `[${new Date().toISOString()}] Poll complete (${reason}): ${result.recordsAdded} records, ${result.devicesUpdated} devices`,
      getRateLimitStats()
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] Poll failed:`, message);
    await logSyncFailure(SyncType.LOCATION_POLL, message);
  } finally {
    pollInFlight = false;
  }
}

async function runDailySync(): Promise<void> {
  if (syncInFlight || pollInFlight || catchupInFlight) {
    console.warn(
      `[${new Date().toISOString()}] Defer device sync — another Scalefusion job is running`
    );
    return;
  }

  syncInFlight = true;
  try {
    console.log(`[${new Date().toISOString()}] Running daily device sync...`);
    const result = await syncDevicesFromScalefusion();
    console.log(
      `[${new Date().toISOString()}] Daily sync: ${result.synced} devices, ${result.created} new`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Daily device sync failed:", message);
    await logSyncFailure(SyncType.DEVICE_SYNC, message);
  } finally {
    syncInFlight = false;
  }
}

/**
 * Re-fetch last N calendar days per device (locations.json) so intermediate
 * points between geofence polls are not lost. Uses skipDuplicates — safe to
 * re-run; skipExistingDays=false so days with a few geofence points still fill.
 */
async function runCatchup(reason: string): Promise<void> {
  if (!POLL_CATCHUP_ENABLED) return;

  if (catchupInFlight || pollInFlight || syncInFlight) {
    console.warn(
      `[${new Date().toISOString()}] Skip catch-up (${reason}) — another job is running`
    );
    return;
  }

  catchupInFlight = true;
  try {
    console.log(
      `[${new Date().toISOString()}] Catch-up start (${reason}): last ${POLL_CATCHUP_DAYS} day(s)`
    );
    const result = await backfillLocationsFromScalefusion({
      days: POLL_CATCHUP_DAYS,
      skipExistingDays: false,
      concurrency: 6,
      onProgress: (m) => console.log(`[catch-up] ${m}`),
    });
    console.log(
      `[${new Date().toISOString()}] Catch-up complete (${reason}): +${result.recordsAdded} records, ${result.requestsMade} requests`,
      getRateLimitStats()
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${new Date().toISOString()}] Catch-up failed:`, message);
    await logSyncFailure(SyncType.HISTORY_BACKFILL, message);
  } finally {
    catchupInFlight = false;
  }
}

function startIntervalMode(): void {
  console.log(
    `Mode: interval every ${POLL_INTERVAL_MS}ms (${Math.round(POLL_INTERVAL_MS / 60000)} min)`
  );
  void runPollCycle("startup");
  setInterval(() => void runPollCycle("interval"), POLL_INTERVAL_MS);
}

function startScheduleMode(times: string[]): void {
  console.log(`Mode: schedule at ${times.join(", ")} (${POLL_TZ})`);
  console.log("Worker stays running and fires only at those clock times.");

  // Optional: poll once on startup so map isn't empty until first slot
  if (process.env.POLL_ON_STARTUP !== "0") {
    void runPollCycle("startup");
  }

  setInterval(() => {
    const local = nowInTimeZone(POLL_TZ);
    const hm = formatHm(local);
    if (!times.includes(hm)) return;

    const key = formatScheduleKey(local);
    if (lastScheduleKey === key) return;
    lastScheduleKey = key;

    console.log(
      `[${new Date().toISOString()}] Schedule hit ${hm} ${POLL_TZ} — starting poll`
    );
    void runPollCycle(`schedule:${hm}`);
  }, 15_000);
}

async function main(): Promise<void> {
  const stats = getRateLimitStats();
  const schedule = normalizeSchedule(POLL_SCHEDULE);

  console.log("SPGPS location worker started");
  console.log(
    `  rate limit: polite ${stats.maxPerMinute}/min, gap ${stats.minGapMs}ms`
  );
  console.log(
    "  strategy: 1 bulk call to location_geofence.json per cycle"
  );
  if (POLL_CATCHUP_ENABLED) {
    console.log(
      `  catch-up: last ${POLL_CATCHUP_DAYS} day(s) every ${POLL_CATCHUP_INTERVAL_MS}ms (fills track gaps)`
    );
  } else {
    console.log("  catch-up: disabled (POLL_CATCHUP_ENABLED=0)");
  }

  // Initial device sync once so poll has devices to attach locations to.
  try {
    const result = await syncDevicesFromScalefusion();
    console.log(
      `[${new Date().toISOString()}] Startup device sync: ${result.synced} devices, ${result.created} new`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Startup device sync failed:", message);
    await logSyncFailure(SyncType.DEVICE_SYNC, message);
  }

  if (schedule.length > 0) {
    startScheduleMode(schedule);
  } else {
    startIntervalMode();
  }

  setInterval(runDailySync, DAILY_SYNC_MS);

  if (POLL_CATCHUP_ENABLED) {
    // After startup geofence poll settles, recover gaps from downtime.
    setTimeout(() => void runCatchup("startup"), 5_000);
    setInterval(() => void runCatchup("interval"), POLL_CATCHUP_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error("Worker fatal error:", error);
  process.exit(1);
});
