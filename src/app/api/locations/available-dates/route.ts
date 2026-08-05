import { auth } from "@/lib/auth";
import { canAccessDevice } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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

  const rows = await prisma.$queryRaw<
    { date: string; count: number }[]
  >(Prisma.sql`
    SELECT
      to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM location_records
    WHERE device_id = ${deviceId}
    GROUP BY 1
    ORDER BY 1 DESC
  `);

  return NextResponse.json({
    dates: rows.map((r) => ({
      date: r.date,
      count: Number(r.count),
    })),
  });
}
