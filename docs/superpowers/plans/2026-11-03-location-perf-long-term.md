# Location performance — long-term

**Goal:** Keep map/history fast as `location_records` grows (already ~8.8M / 3GB).

## Changes

1. **Denormalize latest point onto `devices`** — `last_latitude/longitude/accuracy` (+ existing `last_seen_at`)
2. **`location_day_stats`** — per-device calendar day counts for `available-dates`
3. **Maintain both on poll/backfill insert**
4. **`LOCATION_RETENTION_DAYS`** — optional prune script (+ worker hook)

## Success

- `/api/locations/latest` reads devices only (ms)
- `/api/locations/available-dates` reads day stats (ms)
- One-time backfill completes; poll keeps columns current
