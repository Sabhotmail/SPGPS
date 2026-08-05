import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const devices = await prisma.device.findMany({
    orderBy: { deviceName: "asc" },
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      scalefusionDeviceId: d.scalefusionDeviceId.toString(),
      deviceName: d.deviceName,
      employeeName: d.employeeName,
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
    })),
  });
}
