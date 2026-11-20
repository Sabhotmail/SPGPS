# SPGPS Play Store assets

SiriPro GPS pack for Google Play Console upload.

**ลิสติ้ง + เช็คลิสต์อัปโหลด:** [`STORE-LISTING.md`](./STORE-LISTING.md) (ข้อความ TH/EN, Data safety, privacy draft, AAB)

## Files

| File | Spec | Use in Play Console |
|------|------|---------------------|
| `icon-512.png` | 512×512 PNG | App icon (high-res) |
| `feature-graphic-1024x500.png` | 1024×500 PNG | Feature graphic |
| `screenshot-01-login.png` | ~1080×… | Phone screenshot (**real UI**) |
| `screenshot-02-map.png` | ~1080×… | Phone screenshot (**real UI**) |
| `screenshot-03-history.png` | ~1080×… | Phone screenshot (**real UI**) |

Screenshots are captured from the live SiriPro GPS web UI (mobile viewport) via:

```bash
node --env-file=.env scripts/capture-play-store-shots.mjs
```

Design notes:
- [`docs/superpowers/specs/2026-11-19-play-store-assets-design.md`](../../docs/superpowers/specs/2026-11-19-play-store-assets-design.md)
- [`docs/superpowers/specs/2026-11-19-soft-field-visual-refresh-design.md`](../../docs/superpowers/specs/2026-11-19-soft-field-visual-refresh-design.md)

`icon-512.png` / `feature-graphic-1024x500.png` remain designed brand assets (not page screenshots).

## Copy on feature graphic

- **SPGPS**
- ติดตามพิกัดทีมแบบเรียลไทม์
- Realtime team GPS tracking

## Upload checklist

1. Play Console → Store presence → Main store listing
2. Upload `icon-512.png`
3. Upload `feature-graphic-1024x500.png`
4. Upload at least 2 phone screenshots (`screenshot-01` … `03`)
5. Rebuild the Android app so the new launcher icon ships in the AAB/APK

## Rebuild app icon into APK

```bash
cd android
./gradlew.bat assembleDebug
```

Then install the new APK on devices.
