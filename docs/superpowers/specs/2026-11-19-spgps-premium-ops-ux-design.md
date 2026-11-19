# SPGPS Premium Ops Console — UX/UI Redesign

**Date:** 2026-11-19  
**Status:** Approved (brainstorming + plan confirmed)  
**Branch:** `feature/premium-ops-ux`

## Decisions locked

| Decision | Choice |
|----------|--------|
| Delivery order | Foundation + tooling first, then pages |
| Visual direction | Premium ops console |
| First UI surface | AppShell + navigation, then Auth → Map → History → Admin |
| Primitives | Keep shadcn base-nova + `@base-ui/react` (no classic Radix migration) |
| Out of scope | GPS/Prisma/Auth logic changes; full Magic UI library dump |

## Product facts

| Item | Fact |
|------|------|
| Product | SPGPS — Scalefusion GPS tracking with group-based access |
| Users | ADMIN, VIEWER |
| Core tasks | Live positions, route history, manage devices/groups/users |
| Stack | Next.js 15, Tailwind, shadcn base-nova, Lucide, Leaflet, dark mode |

## North star

คอนโซลปฏิบัติการพรีเมียม — เงียบ สงบ ชัด — แผนที่เป็นพระเอก

## Architecture

1. **UI UX Pro Max** → `design-system/spgps/MASTER.md` (human-corrected for ops console)  
2. **Tokens** in `src/app/globals.css`  
3. **Motion** wrappers in `src/components/motion/`  
4. **Storybook** + axe for component a11y  
5. **Playwright** smoke: login → map shell → history; theme toggle  
6. Page redesigns reuse shell + tokens; Leaflet business logic unchanged  

## Phases

### Phase 0 — Spec + design intelligence

- Install UI UX Pro Max  
- Persist MASTER.md (Premium ops override)  
- This design doc  

### Phase 1 — Tooling

- `motion`, selected Magic UI pieces, Storybook, Playwright, `@axe-core/playwright`  
- Scripts: `storybook`, `test:e2e`  

### Phase 2 — Tokens + AppShell

- Elevate surface layers / contrast for Premium ops (light + dark)  
- Redesign `AppShell` with light motion  
- Stories for shell-related UI primitives  

### Phase 3 — Pages

1. Auth (`AuthFrame`, login, forgot, reset)  
2. Map chrome (not Leaflet algorithms)  
3. History chrome  
4. Admin tables/forms consistency  

## Acceptance

- WCAG 2.2 AA on shell + auth (axe)  
- Playwright smoke passes  
- Motion 150–250ms; Magic UI only on auth/brand accents  
- Light, dark, and mobile tabs verified  

## Related

- Prior direction: Soft Field Station (`2026-11-03-spgps-oil-ui-redesign-design.md`) — evolves into Premium ops, does not discard cool-blue identity  
- Master tokens narrative: `design-system/spgps/MASTER.md`  
