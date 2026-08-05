import { NextRequest, NextResponse } from "next/server";
import { consumeResetToken } from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  const result = await consumeResetToken({
    rawToken: token,
    newPassword: password,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "ตั้งรหัสผ่านใหม่แล้ว กรุณาเข้าสู่ระบบ",
  });
}
