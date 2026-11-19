# SPGPS Android (WebView)

Kotlin WebView client for the SPGPS web app. Configure the server IP/URL in-app; unlock Settings with a TOTP code shown at **Admin → แอพมือถือ**.

## Prerequisites

- Android Studio Ladybug+ (JDK 17 bundled)
- Android SDK 35
- Running SPGPS web (`npm run dev` binds `0.0.0.0:3000`)

## Secret setup

1. Set the same value in both places:

```env
# repo root .env
MOBILE_SETTINGS_TOTP_SECRET=your-long-random-secret
```

```properties
# android/local.properties (gitignored)
sdk.dir=C:\\Users\\YOU\\AppData\\Local\\Android\\Sdk
mobile.settings.totp.secret=your-long-random-secret
```

2. Copy from example if needed:

```bash
cp android/local.properties.example android/local.properties
```

## Open & build

1. Android Studio → **Open** → select the `android/` folder
2. Let Gradle sync
3. Run on a device/emulator, or **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Debug APK path after build:

`android/app/build/outputs/apk/debug/app-debug.apk`

## First-run flow

1. Install APK → open app → Settings (no PIN on first launch)
2. Enter base URL, e.g. `http://192.168.1.10:3000` (phone and PC on same LAN / Tailscale)
3. Optional: **ทดสอบการเชื่อมต่อ** → **บันทึก**
4. WebView loads SPGPS login (same as browser)

Later URL changes: menu **ตั้งค่า** → enter 6-digit code from web **Admin → แอพมือถือ**.

## Manual verification checklist

- [ ] Fresh install → set URL → SPGPS login appears
- [ ] Admin `/admin/mobile` code unlocks Settings
- [ ] Wrong / stale code rejected; code from current or previous 30s window accepted
- [ ] Airplane mode: TOTP still unlocks Settings; WebView shows offline UI
- [ ] Hardware back walks WebView history, then exits
- [ ] Cleartext `http://` LAN URL loads (usesCleartextTraffic + network security config)

## Out of scope (v1)

Push notifications, iOS, Play Store publishing, second companion app.
