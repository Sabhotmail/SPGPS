import { auth } from "@/lib/auth";
import { getAccessibleDeviceIds } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

function serializeDeviceMeta(d: {
  make: string | null;
  model: string | null;
  osVersion: string | null;
  connectionStatus: string | null;
  batteryPercent: number | null;
  batteryCharging: boolean | null;
  batteryHealth: string | null;
  phoneNo: string | null;
  simNetwork: string | null;
  sfGroupName: string | null;
  licenseActive: boolean | null;
  licenseExpiresAt: Date | null;
  detailsFetchedAt: Date | null;
}) {
  return {
    make: d.make,
    model: d.model,
    osVersion: d.osVersion,
    connectionStatus: d.connectionStatus,
    batteryPercent: d.batteryPercent,
    batteryCharging: d.batteryCharging,
    batteryHealth: d.batteryHealth,
    phoneNo: d.phoneNo,
    simNetwork: d.simNetwork,
    sfGroupName: d.sfGroupName,
    licenseActive: d.licenseActive,
    licenseExpiresAt: d.licenseExpiresAt?.toISOString() ?? null,
    detailsFetchedAt: d.detailsFetchedAt?.toISOString() ?? null,
  };
}

type LatestRow = {
  deviceId: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  accuracy: Prisma.Decimal | null;
  recordedAt: Date;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceIds = await getAccessibleDeviceIds(
    session.user.id,
    session.user.role
  );

  if (deviceIds.length === 0) {
    return NextResponse.json({ devices: [] });
  }

  const [devices, latestRows] = await Promise.all([
    prisma.device.findMany({
      where: { id: { in: deviceIds } },
      include: {
        groups: {
          include: { group: { select: { id: true, name: true } } },
        },
      },
      orderBy: { employeeName: "asc" },
    }),
    prisma.$queryRaw<LatestRow[]>`
      SELECT DISTINCT ON (device_id)
        device_id AS "deviceId",
        latitude,
        longitude,
        accuracy,
        recorded_at AS "recordedAt"
      FROM location_records
      WHERE device_id IN (${Prisma.join(deviceIds)})
      ORDER BY device_id, recorded_at DESC
    `,
  ]);

  const latestByDevice = new Map(
    latestRows.map((row) => [
      row.deviceId,
      {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        accuracy: row.accuracy != null ? Number(row.accuracy) : null,
        recordedAt: row.recordedAt.toISOString(),
      },
    ])
  );

  const result = devices.map((d) => ({
    id: d.id,
    scalefusionDeviceId: d.scalefusionDeviceId.toString(),
    deviceName: d.deviceName,
    employeeName: d.employeeName ?? d.deviceName,
    lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    ...serializeDeviceMeta(d),
    groups: d.groups.map((g) => g.group),
    latestLocation: latestByDevice.get(d.id) ?? null,
  }));

  return NextResponse.json({ devices: result });
}
