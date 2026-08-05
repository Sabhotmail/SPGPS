import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendResetPasswordEmail } from "@/lib/email/smtp";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const MIN_PASSWORD_LENGTH = 6;
const COOLDOWN_MS = 60_000;

export const GENERIC_FORGOT_MESSAGE =
  "ถ้าอีเมลนี้มีในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านในไม่ช้า";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const xfHost = request.headers.get("x-forwarded-host");
  const xfProto = request.headers.get("x-forwarded-proto");
  const host = xfHost ?? request.headers.get("host") ?? url.host;
  const proto =
    xfProto ??
    (url.protocol.replace(":", "") ||
      (host.includes("localhost") ? "http" : "http"));
  return `${proto}://${host}`;
}

async function issueTokenForUser(
  userId: string,
  origin: string
): Promise<{ rawToken: string; resetUrl: string }> {
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
  return { rawToken, resetUrl };
}

/**
 * Self-serve forgot password. Always resolves with generic message.
 * Returns whether an email was actually sent (for logging).
 */
export async function requestPasswordResetByEmail(options: {
  email: string;
  origin: string;
}): Promise<{ emailed: boolean; reason: string }> {
  const email = options.email.toLowerCase().trim();
  if (!email) return { emailed: false, reason: "empty_email" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { emailed: false, reason: "unknown_email" };
  }
  if (!user.isActive) {
    return { emailed: false, reason: "inactive" };
  }

  const latest = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (
    latest &&
    Date.now() - latest.createdAt.getTime() < COOLDOWN_MS &&
    !latest.usedAt
  ) {
    // Still within cooldown — skip new email but pretend success
    return { emailed: false, reason: "cooldown" };
  }

  const { resetUrl } = await issueTokenForUser(user.id, options.origin);
  try {
    await sendResetPasswordEmail({ to: user.email, resetUrl });
  } catch (error) {
    // Allow immediate retry if SMTP failed after token was issued
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    throw error;
  }
  return { emailed: true, reason: "sent" };
}

/** Admin-triggered reset for a known user. Throws on failure. */
export async function requestPasswordResetForUserId(options: {
  userId: string;
  origin: string;
}): Promise<{ email: string }> {
  const user = await prisma.user.findUnique({ where: { id: options.userId } });
  if (!user) {
    throw new Error("ไม่พบผู้ใช้");
  }
  if (!user.isActive) {
    throw new Error("ผู้ใช้ถูกปิดการใช้งาน ไม่สามารถส่งลิงก์ได้");
  }

  const { resetUrl } = await issueTokenForUser(user.id, options.origin);
  await sendResetPasswordEmail({ to: user.email, resetUrl });
  return { email: user.email };
}

export async function validateResetToken(
  rawToken: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  if (!rawToken) {
    return { ok: false, error: "ลิงก์ไม่ถูกต้อง" };
  }

  const tokenHash = hashToken(rawToken);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.usedAt) {
    return { ok: false, error: "ลิงก์ไม่ถูกต้องหรือถูกใช้ไปแล้ว" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "ลิงก์หมดอายุแล้ว กรุณาขอใหม่" };
  }

  return { ok: true, userId: row.userId };
}

export async function consumeResetToken(options: {
  rawToken: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (options.newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`,
    };
  }

  const validated = await validateResetToken(options.rawToken);
  if (!validated.ok) return validated;

  const tokenHash = hashToken(options.rawToken);
  const passwordHash = await hashPassword(options.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: validated.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: validated.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

export { MIN_PASSWORD_LENGTH };
