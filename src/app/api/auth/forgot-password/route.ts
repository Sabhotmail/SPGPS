import { NextRequest, NextResponse } from "next/server";
import {
  GENERIC_FORGOT_MESSAGE,
  getRequestOrigin,
  requestPasswordResetByEmail,
} from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";

  try {
    const result = await requestPasswordResetByEmail({
      email,
      origin: getRequestOrigin(request),
    });
    console.info(
      "[forgot-password]",
      email.toLowerCase().trim() || "(empty)",
      result.reason,
      result.emailed ? "emailed" : "skipped"
    );
  } catch (error) {
    // Do not leak — log server-side only
    console.error(
      "[forgot-password]",
      email.toLowerCase().trim() || "(empty)",
      error instanceof Error ? error.message : error
    );
  }

  return NextResponse.json({ ok: true, message: GENERIC_FORGOT_MESSAGE });
}
