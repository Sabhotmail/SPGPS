import { auth } from "@/lib/auth";
import { appDayRange } from "@/lib/app-timezone";
import { canAccessDevice } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId");
  const date = request.nextUrl.searchParams.get("date");

  if (!deviceId || !date) {
    return NextResponse.json(
      { error: "deviceId and date are required" },
      { status: 400 }
    );
  }

  const allowed = await canAccessDevice(
    session.user.id,
    session.user.role,
    deviceId
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { start, end } = appDayRange(date);

  const records = await prisma.locationRecord.findMany({
    where: {
      deviceId,
      recordedAt: { gte: start, lte: end },
    },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({
    locations: records.map((r) => ({
      id: r.id,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      accuracy: r.accuracy ? Number(r.accuracy) : null,
      recordedAt: r.recordedAt.toISOString(),
    })),
  });
}
