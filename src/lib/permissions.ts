import { Role } from "@prisma/client";
import { prisma } from "./db";

export async function getAccessibleDeviceIds(
  userId: string,
  role: Role
): Promise<string[]> {
  if (role === Role.ADMIN) {
    const devices = await prisma.device.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return devices.map((d) => d.id);
  }

  const access = await prisma.userGroupAccess.findMany({
    where: { userId },
    select: {
      group: {
        select: {
          devices: {
            select: { deviceId: true },
          },
        },
      },
    },
  });

  const deviceIds = new Set<string>();
  for (const entry of access) {
    for (const gd of entry.group.devices) {
      deviceIds.add(gd.deviceId);
    }
  }

  const activeDevices = await prisma.device.findMany({
    where: {
      id: { in: Array.from(deviceIds) },
      isActive: true,
    },
    select: { id: true },
  });

  return activeDevices.map((d) => d.id);
}

export async function getAccessibleGroupIds(
  userId: string,
  role: Role
): Promise<string[] | "all"> {
  if (role === Role.ADMIN) return "all";

  const access = await prisma.userGroupAccess.findMany({
    where: { userId },
    select: { groupId: true },
  });

  return access.map((a) => a.groupId);
}

export async function canAccessDevice(
  userId: string,
  role: Role,
  deviceId: string
): Promise<boolean> {
  const ids = await getAccessibleDeviceIds(userId, role);
  return ids.includes(deviceId);
}
