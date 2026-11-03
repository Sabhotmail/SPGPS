# SPGPS Soft Field Station UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the entire SPGPS UI to the Soft Field Station direction (airy cool gray-blue surfaces, sky-blue accent, map-first workspace) without changing backend behavior.

**Architecture:** Token-first redesign — replace CSS variables and fonts at the root, then restyle shell/auth, map, history, and admin against the same language. Keep Next.js + shadcn + Leaflet; no API/auth/schema work.

**Tech Stack:** Next.js 15, Tailwind 3, shadcn/Base UI, Lucide, Leaflet, next/font (Manrope + Noto Sans Thai)

**Spec:** `docs/superpowers/specs/2026-11-03-spgps-oil-ui-redesign-design.md`

## Global Constraints

- Visual refresh only — no API, auth, permissions, worker, or Prisma changes
- Keep routes and Thai utility copy; shorten auth marketing fluff only if already verbose
- One accent hue (cool sky-blue ~ hue 230–250); status greens/ambers stay distinct
- Do not use Inter / Roboto / Arial / bare system as the brand face
- Light + dark tokens both updated
- Memorable motions only: device select list↔pin; map panel fade-up on enter
- Prefer editing shared tokens/components over one-off page hacks
- Verify with `npm run lint` and real browser screenshots (desktop ~1440, mobile ~390) — no unit-test requirement for pure CSS/layout

## File map

| File | Responsibility |
|------|----------------|
| `src/app/globals.css` | Soft Field Station tokens, map chrome, component utility classes |
| `src/app/layout.tsx` | Font loading (Manrope brand/UI latin + Noto Sans Thai) |
| `tailwind.config.ts` | `fontFamily.sans` / optional `font-brand` |
| `src/components/AppShell.tsx` | Sidebar density, wordmark, active cue |
| `src/components/AuthFrame.tsx` | Login split layout air + brand display |
| `src/components/ui/*` | Shared control look (button radius/weight if needed, page-header air) |
| `src/app/(dashboard)/map/page.tsx` | Device panel air, status chips, select motion hook |
| `src/components/map/RealtimeMap.tsx` | Pin active state / selection feedback if needed |
| `src/app/(dashboard)/history/HistoryClient.tsx` | Thin controls chrome |
| `src/app/admin/{devices,groups,users}/page.tsx` | Header/table calm styling via tokens + PageHeader |
| `.oil-ui/spgps-soft-field/` | Optional screenshot evidence only (not shipped) |

---

### Task 1: Design tokens + fonts

**Files:**
- Modify: `src/app/globals.css` (`:root` / `.dark` token block, comment)
- Modify: `src/app/layout.tsx`
- Modify: `tailwind.config.ts` (`fontFamily`)

**Interfaces:**
- Consumes: existing CSS var names (`--background`, `--primary`, `--status-*`, etc.)
- Produces: same var names with Soft Field Station values; `--font-brand` / `--font-sans` available on `<html>`

- [ ] **Step 1: Replace light/dark tokens in `globals.css`**

Replace the `:root` and `.dark` color blocks with Soft Field Station values (keep all existing variable **names**):

```css
:root {
  color-scheme: light;
  /* Soft Field Station — cool gray-blue surface, sky accent */
  --background: oklch(0.975 0.008 240);
  --foreground: oklch(0.22 0.03 255);
  --card: oklch(0.99 0.005 240);
  --card-foreground: oklch(0.22 0.03 255);
  --popover: oklch(0.995 0.004 240);
  --popover-foreground: oklch(0.22 0.03 255);
  --primary: oklch(0.48 0.12 245);
  --primary-foreground: oklch(0.99 0.01 245);
  --secondary: oklch(0.945 0.01 240);
  --secondary-foreground: oklch(0.28 0.03 255);
  --muted: oklch(0.95 0.01 240);
  --muted-foreground: oklch(0.45 0.02 255);
  --accent: oklch(0.94 0.025 245);
  --accent-foreground: oklch(0.3 0.06 250);
  --destructive: oklch(0.52 0.19 27);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(0.88 0.012 240);
  --input: oklch(0.88 0.012 240);
  --ring: oklch(0.55 0.1 245);
  --radius: 0.375rem;
  --sidebar: oklch(0.96 0.01 240);
  --sidebar-foreground: oklch(0.32 0.025 255);
  --sidebar-primary: oklch(0.48 0.12 245);
  --sidebar-primary-foreground: oklch(0.99 0.01 245);
  --sidebar-accent: oklch(0.93 0.02 245);
  --sidebar-accent-foreground: oklch(0.28 0.05 250);
  --sidebar-border: oklch(0.88 0.012 240);
  --sidebar-ring: oklch(0.55 0.1 245);
  --brand: oklch(0.48 0.12 245);
  --brand-soft: oklch(0.94 0.025 245);
  --scrim: oklch(0.22 0.03 255 / 0.4);
  --status-online: oklch(0.55 0.12 155);
  --status-idle: oklch(0.68 0.13 75);
  --status-offline: oklch(0.58 0.02 255);
}

.dark {
  color-scheme: dark;
  --background: oklch(0.18 0.02 250);
  --foreground: oklch(0.96 0.008 240);
  --card: oklch(0.21 0.02 250);
  --card-foreground: oklch(0.96 0.008 240);
  --popover: oklch(0.23 0.02 250);
  --popover-foreground: oklch(0.96 0.008 240);
  --primary: oklch(0.78 0.1 245);
  --primary-foreground: oklch(0.2 0.04 250);
  --secondary: oklch(0.27 0.02 250);
  --secondary-foreground: oklch(0.94 0.008 240);
  --muted: oklch(0.25 0.02 250);
  --muted-foreground: oklch(0.75 0.015 240);
  --accent: oklch(0.28 0.035 250);
  --accent-foreground: oklch(0.92 0.03 245);
  --destructive: oklch(0.7 0.16 25);
  --destructive-foreground: oklch(0.16 0.03 25);
  --border: oklch(0.32 0.02 250);
  --input: oklch(0.32 0.02 250);
  --ring: oklch(0.78 0.1 245);
  --sidebar: oklch(0.16 0.02 250);
  --sidebar-foreground: oklch(0.88 0.01 240);
  --sidebar-primary: oklch(0.78 0.1 245);
  --sidebar-primary-foreground: oklch(0.2 0.04 250);
  --sidebar-accent: oklch(0.26 0.03 250);
  --sidebar-accent-foreground: oklch(0.94 0.02 245);
  --sidebar-border: oklch(0.3 0.02 250);
  --sidebar-ring: oklch(0.78 0.1 245);
  --brand: oklch(0.78 0.1 245);
  --brand-soft: oklch(0.28 0.035 250);
  --scrim: oklch(0.08 0.02 250 / 0.62);
  --status-online: oklch(0.78 0.12 155);
  --status-idle: oklch(0.8 0.12 75);
  --status-offline: oklch(0.7 0.015 255);
}
```

- [ ] **Step 2: Swap fonts in `layout.tsx`**

Remove `Inter` and unused `Geist` if Geist is only for `--font-sans` clash. Load:

```tsx
import { Manrope, Noto_Sans_Thai } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

// <html className={cn(manrope.variable, notoSansThai.variable, "font-sans")} ...>
```

- [ ] **Step 3: Update `tailwind.config.ts` fontFamily**

```ts
fontFamily: {
  sans: [
    "var(--font-brand)",
    "var(--font-noto-thai)",
    "system-ui",
    "sans-serif",
  ],
  brand: ["var(--font-brand)", "var(--font-noto-thai)", "sans-serif"],
},
```

- [ ] **Step 4: Verify tokens apply**

Run: `npm run dev` (if not running), open `/login`, toggle light/dark.  
Expected: cool gray-blue surfaces (not warm paper/teal); Manrope on Latin UI text.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx tailwind.config.ts
git commit -m "$(cat <<'EOF'
style: adopt Soft Field Station tokens and Manrope fonts

EOF
)"
```

---

### Task 2: Shell + Auth chrome

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/AuthFrame.tsx`
- Modify: `src/components/ui/page-header.tsx` (airier header)

**Interfaces:**
- Consumes: new tokens + `font-brand`
- Produces: consistent shell/auth look used by all dashboard/admin pages

- [ ] **Step 1: Soften AppShell wordmark and sidebar**

In `AppShell.tsx` brand link:
- Apply `font-brand` on the SPGPS wordmark
- Keep thin left active bar (`bg-primary`); avoid full-row solid fills
- Slightly increase sidebar padding air (`py-5` header, nav gap) without widening past ~220px / 64px collapsed
- Ensure sidebar `bg-sidebar` reads close to page background (token already handles)

- [ ] **Step 2: Air out AuthFrame**

In `AuthFrame.tsx`:
- Left brand panel: larger `SPGPS` with `font-brand`, keep short Thai subtitle
- Increase vertical rhythm (`gap` / `py`) on form column; keep `max-w-[340px]` form width
- Preserve ThemeToggle position

- [ ] **Step 3: PageHeader spacing**

In `page-header.tsx`: keep structure; ensure `mb-8` / `pb-6` and title weight stay calm (no larger than `text-[1.75rem]`).

- [ ] **Step 4: Visual check**

Open `/login`, `/map` (sidebar), one admin page.  
Expected: unified cool palette; wordmark distinctive; active nav = thin bar + primary icon color.

- [ ] **Step 5: Commit**

```bash
git add src/components/AppShell.tsx src/components/AuthFrame.tsx src/components/ui/page-header.tsx
git commit -m "$(cat <<'EOF'
style: refine AppShell and AuthFrame for Soft Field Station

EOF
)"
```

---

### Task 3: Map workspace (representative screen)

**Files:**
- Modify: `src/app/(dashboard)/map/page.tsx`
- Modify: `src/components/map/RealtimeMap.tsx` (only if pin/selection classes need update)
- Modify: `src/app/globals.css` (`.spgps-pin` / panel helpers if needed)

**Interfaces:**
- Consumes: tokens, status colors, existing `selectedDeviceId` state
- Produces: airy device panel + selection motion cue

- [ ] **Step 1: Restyle device list panel header/filters**

In `DeviceListPanel` (`map/page.tsx`):
- Header title stays subordinate (`text-xl` max)
- Status filter chips: light border, not inverted solid when pressed — use `border-primary bg-accent text-accent-foreground` (or equivalent token classes) so map remains louder than chrome
- Keep search + group select; ensure `tabular-nums` on counts

- [ ] **Step 2: Selection memorable moment**

When `selectedDeviceId` changes:
- Active list row: soft `bg-accent/60` + left accent bar (mirror nav)
- Active pin already uses `.spgps-pin.is-active` — bump transition:

```css
.spgps-pin {
  transition: width 160ms ease, height 160ms ease, border-width 160ms ease;
}
```

- Ensure list row scroll-into-view remains

- [ ] **Step 3: Panel enter motion**

On map page root / left panel wrapper, keep or add `animate-fade-up` once on mount (respect `prefers-reduced-motion` via existing globals rule).

- [ ] **Step 4: Visual check desktop + mobile**

Desktop: map full-bleed, slim left panel.  
Mobile: bottom sheet still usable; scrim uses `--scrim`.  
Expected: status chips readable; selected device linked visually list↔pin.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/map/page.tsx src/components/map/RealtimeMap.tsx src/app/globals.css
git commit -m "$(cat <<'EOF'
style: Soft Field Station map panel and selection motion

EOF
)"
```

---

### Task 4: History + Admin surfaces

**Files:**
- Modify: `src/app/(dashboard)/history/HistoryClient.tsx`
- Modify: `src/app/admin/devices/page.tsx`
- Modify: `src/app/admin/groups/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: shared UI only if gaps remain (`empty-state.tsx`, `badge.tsx`, `table` usage classes)

**Interfaces:**
- Consumes: tokens, PageHeader, workspace-table
- Produces: history/admin matching Soft Field Station without flow changes

- [ ] **Step 1: History chrome**

In `HistoryClient.tsx`:
- Header bar: `bg-background/95` overlays stay thin; reduce visual weight of borders if heavy
- Playback controls strip: keep functional layout; ensure primary actions use `primary`; stats use `tabular-nums`
- Do not change playback logic, date APIs, or map component props beyond classNames

- [ ] **Step 2: Admin pages**

For devices/groups/users:
- Rely on PageHeader + `workspace-table` tokens (hover already uses `--brand`)
- Ensure one clear primary button per page (existing Sync / Add actions)
- Remove any accidental double-card wrappers only if present; do not invent new card grids

- [ ] **Step 3: Lint**

Run: `npm run lint`  
Expected: no new errors from edited files.

- [ ] **Step 4: Visual sweep**

Check `/history`, `/admin/devices`, `/admin/groups`, `/admin/users` light+dark.  
Expected: same language as map/auth; tables calm; no teal leftovers.

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/history/HistoryClient.tsx src/app/admin/devices/page.tsx src/app/admin/groups/page.tsx src/app/admin/users/page.tsx src/components/ui/
git commit -m "$(cat <<'EOF'
style: align history and admin with Soft Field Station

EOF
)"
```

---

### Task 5: Polish + visual acceptance

**Files:**
- Touch only leftovers found in sweep (`ThemeToggle.tsx`, forgot/reset auth pages using AuthFrame, `empty-state.tsx`)
- Optional evidence: `.oil-ui/spgps-soft-field/screenshots/` (gitignored if under `.oil-ui`)

**Interfaces:**
- Consumes: completed Tasks 1–4
- Produces: acceptance notes in PR/commit message

- [ ] **Step 1: Auth siblings**

Confirm `/forgot-password` and `/reset-password` inherit AuthFrame look — adjust only if local overrides fight tokens.

- [ ] **Step 2: Screenshot pass**

Capture desktop (~1440) and mobile (~390) for: login, map (with selection), history, one admin page.  
Store under `.oil-ui/spgps-soft-field/` if using oil-ui workspace; do not commit large binaries unless asked.

- [ ] **Step 3: Spec checklist**

Confirm against spec success criteria:
- [ ] Coherent Soft Field Station across surfaces
- [ ] Map is primary on map/history
- [ ] Status colors outrank chrome decoration
- [ ] Behavior unchanged (login, filters, playback, admin CRUD)

- [ ] **Step 4: Final commit**

```bash
git add -u
git commit -m "$(cat <<'EOF'
style: Soft Field Station polish across auth siblings

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| Tokens light/dark sky-blue | Task 1 |
| Distinctive sans (not Inter) | Task 1 |
| AppShell / AuthFrame | Task 2 |
| Map-first + chips + select motion | Task 3 |
| History + Admin | Task 4 |
| Memorable moments (2) | Task 3 |
| No backend / IA changes | Global Constraints |
| Visual verify desktop/mobile | Tasks 3–5 |

Open decisions from spec resolved in plan: Manrope + Noto Sans Thai; OKLCH values listed in Task 1; basemap stays OSM (dark tile filter already exists) — no tile URL change unless markers fail contrast after token swap.
