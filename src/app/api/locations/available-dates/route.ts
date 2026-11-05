import { auth } from "@/lib/auth";
import { canAccessDevice } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceId = request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  const allowed = await canAccessDevice(
    session.user.id,
    session.user.role,
    deviceId
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.locationDayStat.findMany({
    where: { deviceId },
    orderBy: { day: "desc" },
    select: { day: true, pointCount: true },
  });

  return NextResponse.json({
    dates: rows.map((r) => {
      // @db.Date arrives as UTC midnight of that calendar day
      const y = r.day.getUTCFullYear();
      const m = String(r.day.getUTCMonth() + 1).padStart(2, "0");
      const d = String(r.day.getUTCDate()).padStart(2, "0");
      return { date: `${y}-${m}-${d}`, count: r.pointCount };
    }),
  });
}
