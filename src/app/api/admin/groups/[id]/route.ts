import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  deviceIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, deviceIds } = parsed.data;

  if (deviceIds !== undefined) {
    await prisma.groupDevice.deleteMany({ where: { groupId: id } });
    if (deviceIds.length > 0) {
      await prisma.groupDevice.createMany({
        data: deviceIds.map((deviceId) => ({ groupId: id, deviceId })),
      });
    }
  }

  const group = await prisma.employeeGroup.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
    include: {
      devices: {
        include: {
          device: {
            select: {
              id: true,
              deviceName: true,
              employeeName: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      devices: group.devices.map((d) => d.device),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.employeeGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
