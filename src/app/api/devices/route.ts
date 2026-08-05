import { auth } from "@/lib/auth";
import { getAccessibleDeviceIds } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

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
      groups: { include: { group: { select: { id: true, name: true } } } },
    },
    orderBy: { employeeName: "asc" },
  });

  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      scalefusionDeviceId: d.scalefusionDeviceId.toString(),
      deviceName: d.deviceName,
      employeeName: d.employeeName ?? d.deviceName,
      isActive: d.isActive,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
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
      groups: d.groups.map((g) => g.group),
      latestLocation: null,
    })),
  });
}
