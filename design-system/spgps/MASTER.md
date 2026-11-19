# Design System Master File — SPGPS

> **LOGIC:** When building a specific page, first check `design-system/spgps/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> Otherwise follow the rules below.

---

**Project:** SPGPS  
**Updated:** 2026-11-19  
**Direction:** Premium Ops Console (approved)  
**Note:** UI UX Pro Max auto-suggest (orange OLED / landing pattern) was **rejected** — product is an internal ops console, not a marketing or sports-tracking landing page. Checklist items from Pro Max are retained below.

---

## North star

คอนโซลปฏิบัติการพรีเมียม — เงียบ สงบ ชัด — แผนที่เป็นพระเอก โครง UI เป็นกรอบหรูที่ไม่แย่งซีน

## Pattern

**App workspace shell** (not landing hero):

1. Slim sidebar / mobile tabs  
2. Thin top chrome  
3. Full-bleed map or table workspace  
4. One primary action per view  

## Style

| Scale | Choice |
|-------|--------|
| Energy | Quiet–refined |
| Density | Airy chrome / dense lists |
| Mode | Light + Dark first-class |
| Finish | Soft surfaces, crisp edges, minimal shadow |

**Avoid:** purple gradients, glow clutter, pill clusters, emoji icons, Inter-as-brand, orange sports palette, landing testimonials.

## Color (cool sky ops)

Map to existing shadcn CSS variables in `src/app/globals.css` (oklch). Roles:

| Role | Intent |
|------|--------|
| Background / Sidebar / Card | Distinct cool gray-blue surface layers |
| Primary | Cool sky-blue — nav active, primary CTAs |
| Muted foreground | Secondary labels |
| Status online / idle / offline | Green / amber / slate — must not compete with primary |
| Destructive | Red for danger only |
| Border / Ring | Low-contrast borders; visible focus ring |

Dark mode: same roles, inverted surfaces; map remains legible.

## Typography

- Brand / UI: **Manrope** (`--font-brand`) + **Noto Sans Thai** for Thai body  
- Do **not** switch to Inter  
- Times / counts: `tabular-nums`  
- Page titles subordinate to map on map/history screens  

## Motion

- Duration: **150–250ms**  
- Shell: sidebar width, mobile sheet, page enter (`FadeIn` / `PageTransition`)  
- Magic UI: auth/brand accents only (2–4 components max)  
- Respect `prefers-reduced-motion`  

## Stack

- Next.js 15 App Router  
- shadcn **base-nova** + `@base-ui/react` (Radix role via Base UI — do not migrate to classic Radix)  
- Tailwind CSS variables  
- Lucide icons  
- Leaflet maps (logic unchanged)  
- Storybook for UI catalog  
- Playwright + axe-core for smoke / a11y  

## Component rules

- Cursor pointer on clickable elements  
- Hover transitions 150–300ms  
- Visible focus states  
- Touch targets ≥ 44px on mobile nav  
- No cards in hero/auth brand panel unless interaction requires a container  

## Pre-delivery checklist (from UI UX Pro Max)

- [ ] No emojis as icons (Lucide only)  
- [ ] `cursor-pointer` on clickable elements  
- [ ] Hover states 150–300ms  
- [ ] Light + dark text contrast ≥ 4.5:1  
- [ ] Focus states visible  
- [ ] `prefers-reduced-motion` respected  
- [ ] Responsive: 375 / 768 / 1024 / 1440  
