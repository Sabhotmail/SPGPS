import { auth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "VIEWER"]),
  groupIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      groupAccess: {
        include: { group: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      groups: u.groupAccess.map((ga) => ga.group),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, role, groupIds = [] } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role: role as Role,
      groupAccess: {
        create: groupIds.map((groupId) => ({ groupId })),
      },
    },
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
