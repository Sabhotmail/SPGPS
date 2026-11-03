# SPGPS UI Redesign — Soft Field Station (oil-ui)

**Date:** 2026-11-03  
**Status:** Approved for planning  
**Method:** oil-ui (single recommended direction) + product brainstorming

## Product facts

| Item | Fact |
|------|------|
| Product | SPGPS — internal fleet / device GPS tracking from Scalefusion |
| Users | Admin + Viewer (group-scoped) |
| Core tasks | See live device positions; filter/search; play route history; manage devices/groups/users |
| Surfaces | Login/auth, realtime map, history playback, admin tables |
| Stack constraint | Next.js 15, Tailwind, shadcn/ui, Leaflet — keep; no API/auth/schema changes |
| Brand | Name **SPGPS** retained; previous teal palette may be replaced |
| Tone | Clean, airy, premium **product** UI (not marketing) |
| Delivery mode | One locked direction; confirm before implement |

## Direction

**Name:** Soft Field Station  

**North star:** *Morning field station — the map is the main surface; chrome stays thin and airy; status is readable at a glance.*

### Tone scales

| Scale | Choice | Visible as |
|-------|--------|------------|
| Energy | Quiet | Low saturation chrome; one cool accent |
| Finish | Refined | Strict alignment; minimal shadow; crisp edges |
| Density | Airy chrome / dense lists | Generous header/sidebar padding; compact device rows |
| Weight | Light | Moderate type weights; translucent/light panels |
| Seriousness | Calm operational | No playful illustration; utility copy |

### Palette (open; replace teal)

- **Surface:** cool gray-blue wash  
- **Ink:** deep blue-gray  
- **Accent (single):** cool sky-blue for primary actions / active nav cue  
- **Status:** green / amber / slate for online / idle / offline (must not compete with accent)  
- **Dark mode:** same roles, inverted surfaces; map remains legible

Exact CSS variables to be set in `globals.css` during implementation; light and dark both updated.

### Typography

- Brand/display: distinctive sans (not Inter / Roboto / Arial / system default stack) for **SPGPS** wordmark  
- UI body/controls: clear workhorse sans  
- Times and counts: `tabular-nums`  
- Page titles stay subordinate to the map on map/history screens

### Information architecture

Unchanged routes and roles. Visual refresh only.

| Area | Role |
|------|------|
| Login | Split brand panel + form; more air; short copy |
| Map | Full-bleed map in workspace; slim left device panel; light status chips |
| History | Map + thin playback/controls; shared status colors |
| Admin | Table-first; calm page header; one primary action per page |
| Shell | Slim sidebar; thin accent bar for active; collapsible + mobile drawer |

### Memorable moments (only these)

1. Selecting a device links list row ↔ map marker with a short motion  
2. Entering the map after login: soft fade-up of the device panel  

Everything else stays quiet.

## Implementation scope

### In scope

- Design tokens (light/dark) and fonts via layout/globals  
- `AppShell`, `AuthFrame`, ThemeToggle styling  
- Map page + related map chrome  
- History page/client + playback chrome  
- Admin pages (devices, groups, users)  
- Shared UI primitives as needed for consistency (button, input, table, badge, empty-state, page-header, select, etc.)  
- Two intentional motions above  

### Out of scope

- API, auth, permissions, workers, Prisma  
- New features (KPIs, reports, geofence product UI, etc.)  
- Route / IA changes  
- Multi-style comparison pages  
- Full custom icon set (keep Lucide; tune size/weight only)

### Rollout order

1. Tokens + fonts + shell + auth  
2. Map (representative screen)  
3. History → Admin  
4. Polish + desktop/mobile visual check  

### Success criteria

- One coherent Soft Field Station language across auth, map, history, admin  
- Map is the primary subject on map/history  
- Status colors scan faster than chrome decoration  
- Existing behavior and permissions unchanged  

## Rejected alternatives

| Direction | Why not |
|-----------|---------|
| Ink Dispatch Desk | Too document-like; weakens map primacy |
| Split Day/Night Ops | Dual visual worlds harder to unify across Login/Admin |

## oil-ui notes

- Category: operational fleet / device tracking workspace  
- Existing-project mode: UI refresh — may replace accidental visual defaults; keep product name and flows  
- Open-source oil-ui used for direction; Pro covers deeper dashboard/usability patterns if needed later  

## Open decisions for implementation plan

- Exact Google Fonts (or local) pairing for brand + UI  
- Final OKLCH values for tokens  
- Whether map tile style needs a lighter basemap to match airy chrome (prefer yes if contrast allows markers)  
