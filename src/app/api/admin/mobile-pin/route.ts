import { auth } from "@/lib/auth";
import { generateTotp } from "@/lib/totp";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.MOBILE_SETTINGS_TOTP_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "MOBILE_SETTINGS_TOTP_SECRET is not configured. Add it to .env and restart the server.",
      },
      { status: 503 }
    );
  }

  const { code, remainingSeconds, periodSeconds } = generateTotp(secret);

  return NextResponse.json({
    code,
    periodSeconds,
    remainingSeconds,
  });
}
