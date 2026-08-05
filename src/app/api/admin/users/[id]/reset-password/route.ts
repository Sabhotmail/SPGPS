import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  getRequestOrigin,
  requestPasswordResetForUserId,
} from "@/lib/password-reset";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await requestPasswordResetForUserId({
      userId: id,
      origin: getRequestOrigin(request),
    });
    return NextResponse.json({
      ok: true,
      message: `ส่งลิงก์รีเซ็ตไปที่ ${result.email} แล้ว`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ส่งอีเมลไม่สำเร็จ";
    const status = message.includes("ไม่พบ") || message.includes("ปิด") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
