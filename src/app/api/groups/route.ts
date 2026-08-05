import { auth } from "@/lib/auth";
import { getAccessibleGroupIds } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupIds = await getAccessibleGroupIds(
    session.user.id,
    session.user.role
  );

  const groups =
    groupIds === "all"
      ? await prisma.employeeGroup.findMany({
          orderBy: { name: "asc" },
          include: {
            _count: { select: { devices: true, userAccess: true } },
          },
        })
      : await prisma.employeeGroup.findMany({
          where: { id: { in: groupIds } },
          orderBy: { name: "asc" },
          include: {
            _count: { select: { devices: true, userAccess: true } },
          },
        });

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      deviceCount: g._count.devices,
      userCount: g._count.userAccess,
    })),
  });
}
