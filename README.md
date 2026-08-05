# SPGPS — GPS Tracking from Scalefusion

ระบบเก็บและแสดงพิกัด GPS จาก Scalefusion API พร้อม Login, กำหนดสิทธิ์ดูกลุ่มพนักงาน, แผนที่ Realtime และประวัติเส้นทาง

## Tech Stack

- Next.js 15 + TypeScript
- PostgreSQL + Prisma
- NextAuth.js (Credentials)
- shadcn/ui + Tailwind CSS
- Leaflet + OpenStreetMap

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL (local install หรือ remote)

### Setup

```bash
npm install

cp .env.example .env
# แก้ไข DATABASE_URL, SCALEFUSION_API_KEY, AUTH_SECRET

npm run db:push
npm run db:seed

npm run dev
```

เปิด http://localhost:3000 — Login ด้วย:
- Email: `admin@spgps.local`
- Password: `admin123`

### Worker (Polling GPS)

รันใน terminal แยก:

```bash
npm run worker:poll
```

Worker จะ poll Scalefusion ทุก 3 นาที (ปรับได้ด้วย `POLL_INTERVAL_MS`)

### Backfill ประวัติย้อนหลัง (~30 วัน)

Scalefusion เก็บประวัติประมาณ **30 วัน** — SPGPS ดึงมาเก็บใน PostgreSQL เองเพื่อเก็บยาวกว่านั้น

```bash
# ดึงย้อนหลัง 30 วันทุกอุปกรณ์ที่เปิดติดตาม (แนะนำรันครั้งแรก)
npm run worker:backfill

# กำหนดจำนวนวัน / บังคับดึงซ้ำวันที่มีข้อมูลแล้ว
npm run worker:backfill -- --days=30
npm run worker:backfill -- --days=7 --force
```

ประมาณการ: 73 อุปกรณ์ × 30 วัน ≈ 2,190 API calls (~1.5–2 ชม. ที่ 20 req/min)  
วันที่มีข้อมูลใน DB แล้วจะถูกข้ามอัตโนมัติ (ยกเว้น `--force`)

ใน Admin → อุปกรณ์ มีปุ่ม **Backfill 1 วัน** สำหรับดึงสั้นๆ จาก UI

### Sync ครั้งแรก

1. Login เป็น Admin
2. **Admin → อุปกรณ์** → Sync Scalefusion
3. **Admin → กลุ่ม** → จัดกลุ่มพนักงาน
4. **Admin → ผู้ใช้** → กำหนดสิทธิ์ Viewer

## Production

```bash
npm run build
npm start
```

รัน worker แยก (PM2, Windows Service, หรือ systemd):

```bash
npm run worker:poll
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SCALEFUSION_API_KEY` | Scalefusion API key |
| `SCALEFUSION_BASE_URL` | Default: https://api.scalefusion.com |
| `AUTH_SECRET` | NextAuth secret (min 32 chars) |
| `NEXTAUTH_URL` | App URL |
| `POLL_INTERVAL_MS` | Worker poll interval (default 180000) |
| `SEED_ADMIN_EMAIL` | Admin email for seed |
| `SEED_ADMIN_PASSWORD` | Admin password for seed |

## Rate Limits (Scalefusion)

Official: **30 requests/minute**, **43,200/day**. Exceeding returns HTTP **429**.

SPGPS stays under the limit by:

1. Polling **one bulk endpoint** `location_geofence.json` (not 73 per-device calls)
2. Default poll every **3 minutes** (~20 calls/hour)
3. Client-side limiter: max **20 RPM**, min **3s** between requests
4. Skip overlapping poll cycles; handle 429 with Retry-After backoff

Env knobs: `SCALEFUSION_MAX_RPM`, `SCALEFUSION_MIN_GAP_MS`, `POLL_INTERVAL_MS`

## Roles

| Role | Permissions |
|------|-------------|
| **Admin** | จัดการ users, groups, devices, sync, ดูแผนที่ทั้งหมด |
| **Viewer** | ดูแผนที่และประวัติเฉพาะกลุ่มที่ได้รับสิทธิ์ |

## Architecture

```
Scalefusion API → Worker (poll 3 min) → PostgreSQL ← Next.js App → Browser (Leaflet Map)
```

Scalefusion API คืนได้เพียง 10 จุดล่าสุดต่อ device — SPGPS poll และเก็บประวัติไม่จำกัดใน PostgreSQL
