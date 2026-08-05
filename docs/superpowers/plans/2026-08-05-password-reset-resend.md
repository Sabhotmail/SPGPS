# Password Reset (Resend) Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Password reset via Resend email — self-serve + Admin trigger, 1h single-use hashed tokens, Thai UI.

**Architecture:** `PasswordResetToken` in Postgres; `src/lib/password-reset.ts` + Resend mailer; public forgot/reset pages and APIs; Admin button on users page.

**Tech Stack:** Next.js 15, Prisma, bcrypt (`hashPassword`), Resend SDK, Auth.js Credentials (unchanged login).

## Global Constraints

- Token TTL: 1 hour; store hash only; single-use; invalidate siblings on new request
- Self-serve: generic success message (no enumeration)
- Inactive users: no email
- Min password: 6 chars
- Thai-first copy
- Env: `RESEND_API_KEY`, `RESEND_FROM`; do not force AUTH_URL to localhost

---

### Task 1: Dependency + schema

- [ ] `npm install resend`
- [ ] Add `PasswordResetToken` model + User relation
- [ ] `prisma db push` (or migration) + generate

### Task 2: Lib — email + password-reset

- [ ] `src/lib/email/resend.ts` — sendResetPasswordEmail
- [ ] `src/lib/password-reset.ts` — create/validate/consume; origin from request host

### Task 3: Public APIs

- [ ] `POST /api/auth/forgot-password`
- [ ] `POST /api/auth/reset-password`

### Task 4: Admin API

- [ ] `POST /api/admin/users/[id]/reset-password`

### Task 5: Pages + UI wiring

- [ ] `/forgot-password`, `/reset-password`
- [ ] Login link; Admin users “ส่งลิงก์รีเซ็ต”
- [ ] Middleware: ensure public routes not blocked (matcher already excludes them if not listed)

### Task 6: Env + docs

- [ ] `.env.example` + README notes
- [ ] Mark design status approved in spec header

### Manual test

- Forgot known user → email → reset → login
- Unknown email → generic OK
- Admin send → email works
- Bad/expired token → error
