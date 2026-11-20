# Next.js 16 + Installable PWA — Design

**Date:** 2026-11-20  
**Status:** Approved  
**App:** SPGPS

## Goal

อัปเกรดเว็บ SPGPS เป็น Next.js 16 แล้วเพิ่ม Progressive Web App ให้ติดตั้งลงหน้าจอได้ แคชเปลือกแอป (app shell) และแสดงหน้าออฟไลน์เมื่อไม่มีเครือข่าย โดยไม่แคชข้อมูล GPS, API หรือหน้าล็อกอิน

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Upgrade path | Option A — upgrade to Next.js 16, then add PWA |
| PWA scope | Installable + app-shell cache + offline page |
| Not in scope | Full offline maps/GPS, push notifications, `cacheComponents` |
| Service worker stack | `@serwist/turbopack` (Turbopack-default compatible) |
| Manifest | Next.js App Router `src/app/manifest.ts` |
| Icons | Derive 192×192 and 512×512 from `android/play-store/icon-512.png` |
| SW registration | Production only (`next build` + `next start`); disabled in `next dev` |
| Android WebView | No native change required; loads the same web origin |

## Why not other options

- **Custom hand-written SW only** — works, but Serwist on Turbopack already covers precache + offline fallback with less maintenance.
- **`next-pwa` / `@ducanh2912/next-pwa`** — webpack plugins; do nothing under Next.js 16’s default Turbopack builds unless forced with `--webpack`.
- **Broad `defaultCache`** — too aggressive for a live GPS dashboard; would risk stale location/API responses.

## Architecture

```
Browser / Android WebView
        │
        ▼
Next.js 16 (Turbopack default)
  ├── src/app/manifest.ts          → /manifest.webmanifest
  ├── public/icons/*               → install icons
  ├── src/app/offline/page.tsx     → Thai offline UI
  ├── src/app/sw.ts                → Serwist worker source
  ├── src/app/serwist/[path]/route.ts
  └── ServiceWorkerRegister        → register only in production

Caching policy
  ✅ /_next/static/* (CacheFirst)
  ✅ /icons/* and offline document (precache)
  ❌ /api/* (NetworkOnly)
  ❌ auth / login flows (NetworkOnly)
  ❌ map tiles / live location fetches (NetworkOnly)
  Navigation documents → network first; offline → /offline
```

## Next.js 16 upgrade (in this work)

- Bump `next`, `eslint-config-next`, and peer React packages to versions required by Next.js 16.
- Run official upgrade guidance / codemods as needed for this repo:
  - async Request APIs if any sync `params` / `searchParams` / `cookies` / `headers` remain
  - `middleware` → `proxy` rename only if required for the chosen Next 16 release path used here
- Keep existing auth edge protection behavior for `/login`, `/map`, `/history`, `/admin`, and protected APIs.
- Do **not** enable `cacheComponents` in this change set.
- Preserve current scripts (`dev` / `build` / `start` host binding) unless Next 16 requires a mechanical rename.

## PWA surface

### Manifest

- `name`: `SPGPS — Soft Field Station`
- `short_name`: `SPGPS`
- `lang`: `th`
- `start_url`: `/`
- `display`: `standalone`
- `background_color` / `theme_color`: brand blues aligned with Soft Field Station tokens (light shell)

### Offline page

- Route: `/offline`
- Thai copy explaining that a network connection is required
- Link or button to retry / reload
- No fake GPS data

### Service worker

- Precache offline page + icons
- Runtime: CacheFirst for hashed Next static assets only
- NetworkOnly for `/api/*` and other dynamic/live resources
- Document navigation fallback to `/offline` when offline
- Avoid Serwist `defaultCache` presets that cache API or HTML broadly

### Metadata / installability

- Wire manifest via App Router convention
- Ensure icons meet installability sizes (at least 192 and 512 PNG)
- Viewport / theme metadata remain compatible with existing layout

## Error handling & testing

- Offline with no prior visit → show `/offline`
- Online live map/history → always network; no stale GPS from SW
- Dev mode → no SW interference with HMR
- Production smoke: Manifest valid, SW activated, offline fallback works, API requests still hit network
- After upgrade: `npm run build` succeeds; auth-protected routes still redirect/login as today

## Out of scope

- iOS-specific packaging beyond standard web install
- Push notifications / Web Push
- Caching Leaflet tiles or location history
- Play Store / TWA packaging changes
- Enabling Next.js Cache Components / PPR

## Success criteria

1. Project runs on Next.js 16 with Turbopack default tooling.
2. Desktop/mobile Chromium can install SPGPS from the web origin over HTTPS (or localhost).
3. Offline reload shows the Thai offline page, not a blank browser error.
4. Live GPS and `/api/*` responses are never served from the service worker cache.
