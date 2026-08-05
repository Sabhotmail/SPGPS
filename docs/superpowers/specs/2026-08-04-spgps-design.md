# SPGPS System Design Spec

**Date:** 2026-08-04  
**Status:** Implemented (MVP)

## Overview

ระบบ SPGPS ดึงพิกัด GPS จาก Scalefusion API เก็บประวัติไม่จำกัดใน PostgreSQL แสดงแผนที่ Realtime และ playback ประวัติเส้นทาง พร้อม Login และกำหนดสิทธิ์ดูกลุ่มพนักงานแบบ custom

## Requirements

| Item | Choice |
|------|--------|
| Features | Realtime map + route history playback |
| Groups | Custom groups in SPGPS (Admin managed) |
| Stack | Next.js 15 + PostgreSQL + Prisma |
| Roles | Admin + Viewer |
| Scale | ~73 devices |
| Retention | Unlimited |

## Architecture

- **Next.js App** — Frontend, API routes, Admin panel
- **Worker** — Polls Scalefusion every 3 minutes, stores locations
- **PostgreSQL** — Users, groups, devices, location_records, sync_logs
- **Local run** — Next.js app + Node worker + PostgreSQL

## Key Files

- `prisma/schema.prisma` — Database schema
- `src/lib/scalefusion/client.ts` — Scalefusion API client
- `src/lib/scalefusion/sync-service.ts` — Sync/poll business logic
- `worker/poll-locations.ts` — Background polling loop
- `src/lib/permissions.ts` — Group-based access control
- `src/middleware.ts` — Auth + role guards (edge-compatible)

## Data Flow

1. Worker polls `GET /api/v1/devices/location_geofence.json` every 3 min
2. New locations inserted into `location_records` (dedup via unique constraint)
3. Frontend fetches `/api/locations/latest` filtered by user group access
4. History fetched via `/api/locations/history?deviceId=&date=`

## Roles

- **Admin** — Full CRUD on users, groups, devices; sync Scalefusion; view all
- **Viewer** — View map/history for assigned groups only
