import { auth } from "@/lib/auth";
import { getAccessibleDeviceIds } from "@/lib/permissions";
import { prisma } from "@/lib/db";
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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deviceIds = await getAccessibleDeviceIds(
    session.user.id,
    session.user.role
  );

  const devices = await prisma.device.findMany({
    where: { id: { in: deviceIds } },
    include: {
      groups: {
        include: { group: { select: { id: true, name: true } } },
      },
      locationRecords: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { employeeName: "asc" },
  });

  const result = devices.map((d) => ({
    id: d.id,
    scalefusionDeviceId: d.scalefusionDeviceId.toString(),
    deviceName: d.deviceName,
    employeeName: d.employeeName ?? d.deviceName,
    lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
    ...serializeDeviceMeta(d),
    groups: d.groups.map((g) => g.group),
    latestLocation: d.locationRecords[0]
      ? {
          latitude: Number(d.locationRecords[0].latitude),
          longitude: Number(d.locationRecords[0].longitude),
          accuracy: d.locationRecords[0].accuracy
            ? Number(d.locationRecords[0].accuracy)
            : null,
          recordedAt: d.locationRecords[0].recordedAt.toISOString(),
        }
      : null,
  }));

  return NextResponse.json({ devices: result });
}
