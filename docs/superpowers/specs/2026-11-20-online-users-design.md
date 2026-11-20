# Online Users (Admin) — Design

**Date:** 2026-11-20  
**Status:** Approved  
**App:** SPGPS / SiriPro GPS

## Goal

ให้แอดมินเห็นว่าผู้ใช้คนไหนกำลังใช้งานระบบอยู่ตอนนี้ ผ่านเมนู Admin และหน้ารายชื่อที่อัปเดตอัตโนมัติ

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Who can see | Admin only |
| Online definition | Activity within the last **2 minutes** |
| UI | Named list (email, role, last seen) with auto-refresh |
| Not in scope | Force logout/kick, long presence history, WebSockets |
| Tracking method | DB presence + client heartbeat (JWT-friendly) |

## Architecture

```
Logged-in browser (Admin or Viewer)
  AppShell → POST /api/presence/heartbeat every ~40s
                │
                ▼
         UserPresence (userId, lastSeenAt, optional path)
                │
Admin /admin/online ← GET /api/admin/online (lastSeenAt >= now-2m)
```

### Data

New Prisma model `UserPresence`:

- `userId` (PK / unique FK → `User`)
- `lastSeenAt` (DateTime)
- `path` (optional String — last known pathname, best-effort)
- `updatedAt`

Upsert on each heartbeat. No history table in this version.

### APIs

1. **`POST /api/presence/heartbeat`**  
   - Auth: any logged-in user  
   - Body (optional): `{ path?: string }`  
   - Upserts presence for `session.user.id`  
   - Not listed in aggressive caching; NetworkOnly for PWA if applicable

2. **`GET /api/admin/online`**  
   - Auth: ADMIN only  
   - Returns users with `lastSeenAt` within 2 minutes, joined with email + role  
   - Ordered by `lastSeenAt` desc  
   - Include `count`

Protect `/api/admin/online` via existing admin matcher / role checks. Heartbeat route must be reachable for Viewers (do **not** put under `/api/admin`).

### UI

- Admin nav link: **Online** → `/admin/online` (icon: e.g. `Radio` / `UsersRound`)
- Page shows:
  - Header + live count of online users
  - Table/list: email, role badge, last seen (relative + absolute)
  - Auto-refresh every ~15–20s while page is open
- Empty state: “ไม่มีผู้ใช้ออนไลน์”
- Match existing Soft Field / SiriPro admin styling (AppShell + workspace table patterns)

### Client heartbeat

- Mount a small client helper inside `AppShell` (session present):
  - Interval ~40s
  - Also fire once on mount / visibility regain (`document.visibilityState === "visible"`)
  - Skip when tab hidden (optional battery save) — resume on visible
- Do not block UI on heartbeat failures

## Auth / proxy

- Add `/api/admin/online` to protected admin API paths (already covered by `/api/admin/:path*` if used)
- Ensure `/api/presence/heartbeat` requires login (return 401 if anonymous) but is available to VIEWER + ADMIN

## Error handling & testing

- Unauthenticated heartbeat → 401
- Viewer calling `/api/admin/online` → 403
- Admin page loads empty list when no recent heartbeats
- After login + wait one heartbeat, user appears on Online page
- After 2+ minutes without heartbeat, user drops off the list
- `npm run build` succeeds

## Out of scope

- Kick / revoke session
- Multi-device distinction beyond last heartbeat overwrite
- Presence analytics / historical charts
- Realtime WebSocket push

## Success criteria

1. Admin can open **Online** from the admin menu.
2. Users with a recent heartbeat (< 2 minutes) appear with email, role, and last seen.
3. Viewers cannot access the Online page or its API.
4. Presence does not require changing NextAuth from JWT.
