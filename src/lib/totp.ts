import { createHmac } from "crypto";

const PERIOD_SECONDS = 30;
const DIGITS = 6;

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const otp = binary % 10 ** DIGITS;
  return otp.toString().padStart(DIGITS, "0");
}

function secretBuffer(secret: string): Buffer {
  return Buffer.from(secret, "utf8");
}

export function getTotpPeriodSeconds(): number {
  return PERIOD_SECONDS;
}

export function generateTotp(
  secret: string,
  atMs: number = Date.now()
): { code: string; remainingSeconds: number; periodSeconds: number } {
  const periodMs = PERIOD_SECONDS * 1000;
  const counter = Math.floor(atMs / periodMs);
  const remainingSeconds =
    PERIOD_SECONDS - (Math.floor(atMs / 1000) % PERIOD_SECONDS);

  return {
    code: hotp(secretBuffer(secret), counter),
    remainingSeconds: remainingSeconds === 0 ? PERIOD_SECONDS : remainingSeconds,
    periodSeconds: PERIOD_SECONDS,
  };
}

/** Returns true if `code` matches current step or ±1 window. */
export function verifyTotp(
  secret: string,
  code: string,
  atMs: number = Date.now(),
  window: number = 1
): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const periodMs = PERIOD_SECONDS * 1000;
  const counter = Math.floor(atMs / periodMs);
  const key = secretBuffer(secret);

  for (let w = -window; w <= window; w++) {
    if (hotp(key, counter + w) === normalized) return true;
  }
  return false;
}
