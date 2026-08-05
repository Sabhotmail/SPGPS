import { auth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "VIEWER"]).optional(),
  isActive: z.boolean().optional(),
  groupIds: z.array(z.string()).optional(),
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
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, role, isActive, groupIds } = parsed.data;

  const data: {
    email?: string;
    passwordHash?: string;
    role?: Role;
    isActive?: boolean;
  } = {};

  if (email) data.email = email.toLowerCase();
  if (password) data.passwordHash = await hashPassword(password);
  if (role) data.role = role as Role;
  if (isActive !== undefined) data.isActive = isActive;

  if (groupIds !== undefined) {
    await prisma.userGroupAccess.deleteMany({ where: { userId: id } });
    if (groupIds.length > 0) {
      await prisma.userGroupAccess.createMany({
        data: groupIds.map((groupId) => ({ userId: id, groupId })),
      });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    include: {
      groupAccess: { include: { group: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      groups: user.groupAccess.map((ga) => ga.group),
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
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
