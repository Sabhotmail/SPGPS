import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await prisma.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      syncType: l.syncType,
      status: l.status,
      recordsAdded: l.recordsAdded,
      errorMessage: l.errorMessage,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
