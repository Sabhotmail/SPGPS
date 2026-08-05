# Password Reset via Resend — Design

**Date:** 2026-08-05  
**Status:** Pending user review  
**App:** SPGPS

## Goal

ให้ผู้ใช้รีเซ็ตรหัสผ่านผ่านอีเมล (Resend) ได้สองทาง: self-serve จากหน้า login และ Admin ส่งลิงก์จากหน้าผู้ใช้ ลิงก์หมดอายุ 1 ชั่วโมง ภาษาไทยเป็นหลัก

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Who can trigger | Both: user forgot-password + Admin send link |
| Token expiry | 1 hour |
| Language | Thai-first |
| Approach | DB-backed hashed tokens + Resend email |

## Flow

### A. Self-serve

1. `/login` → link “ลืมรหัสผ่าน”
2. `/forgot-password` — enter email → submit
3. Create single-use token (1h TTL), email link via Resend
4. Always respond: “ถ้าอีเมลมีในระบบ คุณจะได้รับลิงก์…” (no user enumeration)
5. `/reset-password?token=…` — set new password → redirect `/login`

### B. Admin

1. Admin → ผู้ใช้ → “ส่งลิงก์รีเซ็ต”
2. Same token + Resend path
3. UI shows success/failure of email send (Admin may know the user exists)

### Rules

- Inactive users (`isActive=false`): do not send email; self-serve still returns generic success
- New request for same user invalidates prior unused tokens
- Token in email is raw random; DB stores **hash only**
- Token is single-use (`usedAt` set on successful reset)
- Min password length: 6 (match existing admin user API)

## Data model

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_reset_tokens")
}
```

Add `passwordResetTokens PasswordResetToken[]` on `User`.

## Components / modules

| Unit | Responsibility |
|------|----------------|
| `src/lib/email/smtp.ts` | Send email via Microsoft 365 / Outlook SMTP (nodemailer) |
| `src/lib/password-reset.ts` | Create token, validate, consume, invalidate siblings; build reset URL from request host |
| `POST /api/auth/forgot-password` | Public; rate-limit lightly; generic response |
| `POST /api/auth/reset-password` | Public; `{ token, password }` → update `passwordHash` |
| `POST /api/admin/users/[id]/reset-password` | Admin-only; send reset email for that user |
| `/forgot-password` | Form UI (Thai) |
| `/reset-password` | Form UI; validate token on load (optional soft check) |
| Login + Admin users UI | Links / button |

Reuse existing `hashPassword()` from `src/lib/auth.ts`.

## Email (Microsoft 365 SMTP)

- Env: `SMTP_HOST` (default `smtp.office365.com`), `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `SMTP_FROM` should match the authenticated mailbox (`SMTP_USER`) for O365
- Mailbox must have SMTP AUTH enabled (or use an app password when MFA is on)
- Subject: `รีเซ็ตรหัสผ่าน SPGPS`
- Body (Thai): short explanation + button/link to `{origin}/reset-password?token={rawToken}`
- Origin: derive from request `Host` / `x-forwarded-*` when available (Tailscale-friendly); fallback `AUTH_URL` only if set

## Middleware / auth

- Allow public: `/forgot-password`, `/reset-password`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- Keep existing Credentials login unchanged

## Error handling

| Case | Behavior |
|------|----------|
| Unknown email (self-serve) | Generic success message |
| Inactive user | Generic success (no email) |
| Invalid / expired / used token | Error on reset page + API 400 |
| Resend failure (self-serve) | Log error; still generic success to client (avoid leaking); optionally log sync |
| Resend failure (Admin) | Return 502 + clear error in Admin UI |
| Password too short | 400 validation |

## Rate limiting (minimal)

- Forgot-password: reject if same email requested within last 60s (reuse last token window or simple check on latest `createdAt`)
- Admin: no special limit beyond existing admin session

## Out of scope

- Changing password while logged in (account settings)
- Magic-link login / OAuth
- Multi-language i18n framework
- Invalidating JWT sessions after reset (JWT remains until expiry; acceptable for v1)

## Testing (manual)

1. Forgot password for known active user → receive email → reset → login
2. Forgot password for unknown email → generic success, no email
3. Expired / reused token → rejected
4. Admin “ส่งลิงก์รีเซ็ต” → email arrives → reset works
5. Access reset link via Tailscale host → link uses that host, no localhost redirect

## Spec self-review

- [x] No unresolved placeholders
- [x] Consistent with approach 1 (DB token + Resend)
- [x] Scope limited to reset flows only
- [x] Security: hashed token, generic self-serve response, single-use, TTL 1h
