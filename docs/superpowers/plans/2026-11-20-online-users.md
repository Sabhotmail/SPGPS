# Online Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only Online Users page listing who has heartbeated within the last 2 minutes.

**Architecture:** Add `UserPresence` in Prisma; clients upsert via `POST /api/presence/heartbeat` from AppShell; admins list via `GET /api/admin/online` and `/admin/online` with polling refresh.

**Tech Stack:** Next.js 16, Prisma/PostgreSQL, NextAuth JWT, existing AppShell admin nav

## Global Constraints

- Admin-only visibility for Online page and list API
- Online = `lastSeenAt` within **2 minutes**
- Heartbeat ~40s from AppShell; page refresh ~15–20s
- No force logout, no WebSockets, no presence history
- Spec: `docs/superpowers/specs/2026-11-20-online-users-design.md`

## File Structure

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | `UserPresence` model + User relation |
| `src/app/api/presence/heartbeat/route.ts` | Authenticated upsert |
| `src/app/api/admin/online/route.ts` | Admin list of online users |
| `src/components/PresenceHeartbeat.tsx` | Client interval + visibility resume |
| `src/components/AppShell.tsx` | Mount heartbeat; add Online nav link |
| `src/app/admin/online/page.tsx` | Admin UI |
| `src/proxy.ts` | Protect `/api/presence/heartbeat` for logged-in users |
| `src/lib/auth.config.ts` | Treat heartbeat as protected (login required) |

---

### Task 1: Prisma UserPresence + APIs

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/api/presence/heartbeat/route.ts`
- Create: `src/app/api/admin/online/route.ts`
- Modify: `src/proxy.ts`, `src/lib/auth.config.ts`

**Interfaces:**
- Produces: `UserPresence`; heartbeat 200; admin online JSON `{ count, users: [{ id, email, role, lastSeenAt, path }] }`

- [ ] **Step 1: Add model**

```prisma
model UserPresence {
  userId     String   @id @map("user_id")
  lastSeenAt DateTime @map("last_seen_at")
  path       String?
  updatedAt  DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([lastSeenAt])
  @@map("user_presence")
}
```

Add `presence UserPresence?` on `User`.

- [ ] **Step 2: Migrate**

```bash
npx prisma db push
npx prisma generate
```

- [ ] **Step 3: Heartbeat + admin online routes** (auth checks as in other admin APIs)

- [ ] **Step 4: Protect heartbeat in proxy matcher + auth.config `authorized`**

Add `/api/presence/:path*` to proxy matcher and treat as protected (redirect/401 when not logged in).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add user presence model and online APIs"
```

---

### Task 2: Heartbeat client + Admin Online page

**Files:**
- Create: `src/components/PresenceHeartbeat.tsx`
- Modify: `src/components/AppShell.tsx`
- Create: `src/app/admin/online/page.tsx`

- [ ] **Step 1: PresenceHeartbeat** — POST every 40s with `{ path: pathname }`; fire on mount and when tab becomes visible; pause while hidden

- [ ] **Step 2: AppShell** — render `<PresenceHeartbeat />`; add admin link `{ href: "/admin/online", label: "Online", icon: Radio }`

- [ ] **Step 3: `/admin/online` page** — fetch list every 15s; show count, email, role, last seen; empty state in Thai

- [ ] **Step 4: Build verify + commit**

```bash
npm run build
git commit -m "feat: add Online Users admin page and heartbeat"
```
