# SiriPro GPS visual refresh — Design

**Date:** 2026-11-19  
**Status:** Implemented  
**App:** SPGPS web (desktop + mobile WebView)

## Goal

Align live UI tokens and chrome with SiriPro GPS play-store art while **keeping** existing navigation (sidebar + mobile drawer). No bottom tabs or notification center in this round.

## Decisions

| Topic | Choice |
|-------|--------|
| Scope | Desktop + mobile |
| Fidelity | Tokens / spacing / brand chrome (not mock pixel layouts) |
| Palette | Cool gray-blue surfaces, sky primary (~hue 245) |
| Nav | Unchanged AppShell structure |

## What changed

- [`src/app/globals.css`](../../../src/app/globals.css) — SiriPro GPS light/dark tokens, softer panels
- [`src/components/AuthFrame.tsx`](../../../src/components/AuthFrame.tsx) + login — SiriPro GPS branding
- [`src/components/AppShell.tsx`](../../../src/components/AppShell.tsx) — subtitle SiriPro GPS
- Map / history floating panels — softer glass, calmer chips
- Document title SiriPro GPS

## Out of scope

Bottom tab bar, notification UI, car-speed map markers from store mocks.

## Reference

[`android/play-store/`](../../../android/play-store/) — aspirational store graphics; live UI is token-aligned SiriPro GPS without mock-only chrome.
