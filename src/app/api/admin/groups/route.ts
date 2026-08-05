import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  deviceIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await prisma.employeeGroup.findMany({
    orderBy: { name: "asc" },
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
      _count: { select: { userAccess: true } },
    },
  });

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      userCount: g._count.userAccess,
      devices: g.devices.map((d) => d.device),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, deviceIds = [] } = parsed.data;

  const group = await prisma.employeeGroup.create({
    data: {
      name,
      description,
      devices: {
        create: deviceIds.map((deviceId) => ({ deviceId })),
      },
    },
    include: {
      devices: { include: { device: true } },
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
