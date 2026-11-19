# Android WebView + Admin TOTP PIN — Design

**Date:** 2026-11-19  
**Status:** Approved  
**App:** SPGPS

## Goal

แอพ Android ห่อเว็บ SPGPS ด้วย WebView ให้ตั้งค่า base URL/IP ในแอพได้ และปลดล็อกหน้าตั้งค่าด้วยรหัส TOTP 6 หลักที่แอดมินดูได้จากหน้าเว็บ Admin (ไม่ต้องมีแอพที่สอง)

## Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| App type | Kotlin native WebView wrapper |
| Server URL | Configurable in-app (SharedPreferences) |
| Settings lock | TOTP 6 digits / 30s, viewable on web Admin |
| First launch | Settings without PIN; later changes require TOTP |
| Companion app | None — web Admin replaces it |
| Auth | Existing NextAuth cookies inside WebView |
| Cleartext HTTP | Allowed for LAN `http://IP:PORT` |

## Architecture

```
Android (android/)                    Next.js SPGPS
─────────────────                     ─────────────
MainActivity (WebView) ──HTTP/HTTPS──► /login, /map, …
PinActivity (TOTP offline)
SettingsActivity (base URL)
SharedPreferences (base_url)

BuildConfig.TOTP_SECRET  ≈  .env MOBILE_SETTINGS_TOTP_SECRET
                              │
                              ▼
                         /admin/mobile
                         GET /api/admin/mobile-pin
```

## Web

1. `MOBILE_SETTINGS_TOTP_SECRET` in `.env` / `.env.example` (UTF-8 string key material; never returned by API).
2. `src/lib/totp.ts` — RFC 6238 TOTP (HMAC-SHA1, 30s, 6 digits, ±1 window helpers).
3. `GET /api/admin/mobile-pin` — ADMIN only → `{ code, periodSeconds, remainingSeconds }`.
4. `/admin/mobile` — live code + countdown + short instructions.
5. AppShell admin nav link “แอพมือถือ”.

## Android

1. Module under `android/`, package `com.spgps.app`, minSdk 26+.
2. Secret via `local.properties` → `BuildConfig.MOBILE_SETTINGS_TOTP_SECRET` (not committed).
3. Screens: Main (WebView), Pin (TOTP), Settings (URL + test connect).
4. First launch with empty URL → Settings unlocked; subsequent Settings → Pin first.
5. Offline error overlay with retry + open settings.

## Out of scope (v1)

Push notifications, second companion app, iOS, Play Store CI, regenerating TOTP secret from UI, offline web caching.

## Verification

- Fresh install → set URL → SPGPS login in WebView.
- Admin `/admin/mobile` code unlocks Settings.
- Wrong code rejected; ±1 step accepted.
- Airplane mode: TOTP still unlocks Settings.
- Back navigates WebView history.
