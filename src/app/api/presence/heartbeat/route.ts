import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  path: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let path: string | undefined;
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (parsed.success) {
      path = parsed.data.path;
    }
  } catch {
    /* empty body is fine */
  }

  const lastSeenAt = new Date();
  await prisma.userPresence.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      lastSeenAt,
      path: path ?? null,
    },
    update: {
      lastSeenAt,
      ...(path !== undefined ? { path } : {}),
    },
  });

  return NextResponse.json({ ok: true, lastSeenAt: lastSeenAt.toISOString() });
}
