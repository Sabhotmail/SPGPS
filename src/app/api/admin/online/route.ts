import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const rows = await prisma.userPresence.findMany({
    where: { lastSeenAt: { gte: since } },
    orderBy: { lastSeenAt: "desc" },
    include: {
      user: {
        select: { id: true, email: true, role: true, isActive: true },
      },
    },
  });

  const users = rows
    .filter((r) => r.user.isActive)
    .map((r) => ({
      id: r.user.id,
      email: r.user.email,
      role: r.user.role,
      lastSeenAt: r.lastSeenAt.toISOString(),
      path: r.path,
    }));

  return NextResponse.json({ count: users.length, users });
}
