# SPGPS Play Store Assets — Design

**Date:** 2026-11-19  
**Status:** Approved  
**App:** SPGPS Android

## Goal

Deliver a complete first-pass Play Store graphic pack and update the in-app launcher icon to SiriPro GPS branding.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope | Full set: icon 512, feature graphic, phone screenshots |
| Visual direction | SiriPro GPS (cool gray-blue, sky accent) |
| Copy language | Bilingual short (SPGPS + Thai + English line) |
| Production | AI-generated graphics + real/mock screenshots |

## Deliverables

Folder: `android/play-store/`

| File | Size | Notes |
|------|------|-------|
| `icon-512.png` | 512×512 | No transparency; Play Console high-res icon |
| `feature-graphic-1024x500.png` | 1024×500 | Store banner |
| `screenshot-*.png` | ~1080×1920 (or device native) | Min 2 phone screenshots |
| `README.md` | — | Upload checklist |

In-app: replace adaptive icon foreground/background under `android/app/src/main/res/`.

## Copy

- Brand: **SPGPS**
- Thai: ติดตามพิกัดทีมแบบเรียลไทม์
- English: Realtime team GPS tracking

## Out of scope

Tablet screenshots, promo video, localized store listings beyond TH/EN short lines on graphics.
