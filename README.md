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

วันในหน้า **ประวัติเส้นทาง** และปฏิทินจุดพิกัดอิง `APP_TIMEZONE` (ค่าเริ่มต้น **Asia/Bangkok**) — ไม่ใช่ UTC

เปิด http://localhost:3000 — Login ด้วย:
- Email: `admin@spgps.local`
- Password: `admin123`

### Worker (Polling GPS)

รันใน terminal แยก:

```bash
npm run worker:poll
```

เลือกโหมดใน `.env`:

**1) ทุกช่วงเวลา (ค่าเริ่มต้น)** — ทุก 3 นาที

```env
POLL_INTERVAL_MS=180000
```

**2) ตามนาฬิกาที่กำหนด** — เช่น วันละ 4 รอบ

```env
POLL_SCHEDULE=08:00,12:00,17:00,21:00
POLL_TZ=Asia/Bangkok
```

ถ้ามี `POLL_SCHEDULE` จะใช้โหมดตามเวลานี้แทน interval  
ค่าเริ่มต้นจะ poll รอบหนึ่งตอนสตาร์ทด้วย (ปิดได้ด้วย `POLL_ON_STARTUP=0`)

### Backfill ประวัติย้อนหลัง (~30 วัน)

Scalefusion เก็บประวัติประมาณ **30 วัน** — SPGPS ดึงมาเก็บใน PostgreSQL เองเพื่อเก็บยาวกว่านั้น

```bash
# ดึงย้อนหลัง 30 วันทุกอุปกรณ์ที่เปิดติดตาม (แนะนำรันครั้งแรก)
npm run worker:backfill

# กำหนดจำนวนวัน / concurrency / บังคับดึงซ้ำวันที่มีข้อมูลแล้ว
npm run worker:backfill -- --days=30 --concurrency=6
npm run worker:backfill -- --days=7 --force
```

ประมาณการ: ยิงแบบ aggressive จนเจอ 429 แล้วพักตาม Retry-After — มักเร็วกว่าจำกัด 28/min แบบเดิม  
วันที่มีข้อมูลใน DB แล้วจะถูกข้ามอัตโนมัติ (ยกเว้น `--force`)  
Concurrency เริ่มต้น 8 — poll ปกติยังใช้โหมด polite แยกต่างหาก

ใน Admin → อุปกรณ์ มีปุ่ม **Backfill 1 วัน** สำหรับดึงสั้นๆ จาก UI

### Sync ครั้งแรก

1. Login เป็น Admin
2. **Admin → อุปกรณ์** → Sync Scalefusion  
   (ดึงรายชื่อ + รายละเอียดเครื่องจาก `/api/v3/devices/{id}` เช่น แบต, Online/Offline, รุ่น — ใช้เวลา ~2–3 นาที สำหรับ ~73 เครื่อง)  
   ปุ่ม **รายละเอียด** ต่อแถว = รีเฟรชเครื่องเดียว  
3. **Admin → กลุ่ม** → จัดกลุ่มพนักงาน
4. **Admin → ผู้ใช้** → กำหนดสิทธิ์ Viewer  
   (มีปุ่ม **ส่งลิงก์รีเซ็ต** — ส่งอีเมลผ่าน O365 SMTP; ผู้ใช้ทั่วไปใช้ **/forgot-password**)

## Production

```bash
npm run build
npm start
```

`next start` — ใช้พอร์ตจาก `PORT` ใน `.env` (ค่าเริ่มต้น **3000**)

`dev` / `start` bind ที่ `0.0.0.0` และใช้พอร์ตจาก `PORT` ใน `.env` เพื่อให้เข้าจากเครื่องอื่นในเครือข่ายได้ (รวม Tailscale)

อย่าเปิด URL ที่ Next แสดงเป็น `http://0.0.0.0:<port>` ในเบราว์เซอร์ — ใช้ `http://localhost:<port>` หรือ Tailscale IP แทน

### เข้าผ่าน Tailscale

1. ให้เครื่องนี้และมือถือ/เครื่องอื่นอยู่ใน Tailscale เดียวกัน
2. รัน `npm run start` (หรือ `npm run dev`)
3. เปิดจากเครื่องอื่น:

```text
http://100.106.34.125:3000
```

(เปลี่ยน `3000` ตาม `PORT` ใน `.env` ถ้าตั้งค่าอื่น เช่น `8080`)

หรือชื่อเครื่อง Tailscale เช่น `http://it-thanuphat-nb:3000` (ถ้า MagicDNS เปิดอยู่)

มี `AUTH_TRUST_HOST=true` และ**อย่าตั้ง** `AUTH_URL`/`NEXTAUTH_URL` เป็น localhost — ไม่เช่นนั้น login จะเด้งกลับ localhost  
ถ้า Windows Firewall ถาม ให้ Allow พอร์ตที่ตั้งใน `PORT` สำหรับ Node

รัน worker แยก (PM2 แนะนำบน Windows, หรือ systemd บน Linux):

```bash
npm run worker:poll
```

### Windows — PM2 (Production)

ติดตั้ง PM2 ครั้งแรก (ครั้งเดียว):

```powershell
npm install -g pm2
```

เตรียมโปรเจกต์บน server:

```powershell
cd C:\NextJSTest\SPGPS
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

ตั้งค่า `PORT` และตัวแปรอื่นใน `.env` แล้วสตาร์ท:

```powershell
cd C:\NextJSTest\SPGPS
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\pm2-install.ps1
```

สคริปต์จะรัน 2 process:
- **spgps-web** — Next.js (`next start -H 0.0.0.0`)
- **spgps-worker** — GPS poll worker

คำสั่งที่ใช้บ่อย:

```powershell
npm run pm2:status
npm run pm2:logs
npm run pm2:restart
pm2 restart spgps-web
pm2 restart spgps-worker
```

หยุดและลบออกจาก PM2:

```powershell
.\scripts\pm2-remove.ps1
```

#### หน้าต่างดำ node.exe (Windows)

บน Windows ถ้ารัน PM2 จาก PowerShell อาจมีหน้าต่างดำ `node.exe` ค้างอยู่ (PM2 daemon) — **อย่าปิดหน้าต่างนั้น** เพราะจะหยุดทุก process

วิธีแก้ถาวร: ติดตั้ง PM2 เป็น Windows Service (PowerShell as Administrator):

```powershell
cd C:\NextJSTest\SPGPS
.\scripts\pm2-service-install.ps1
.\scripts\pm2-install.ps1
```

ตอนติดตั้ง service จะถามคำถามหลายข้อ — ตอบ **Y** ทุกข้อ (ใช้ค่า default ได้)  
Warning เรื่อง `circular dependency` จาก Node ไม่เป็นไร

ถ้าค้างหลังคำถามแรก ให้กด Ctrl+C แล้วรัน `git pull` และ `.\scripts\pm2-service-install.ps1` อีกครั้ง (สคริปต์จะ patch inquirer ให้)

#### ให้ PM2 รันอัตโนมัติหลัง reboot (Windows)

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

หลัง deploy ใหม่:

```powershell
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart all
```

#### ย้ายจาก NSSM มา PM2

1. ลบ NSSM services เก่า (PowerShell as Administrator):

```powershell
.\scripts\nssm-remove.ps1
```

2. ติดตั้ง PM2 ตามด้านบน

3. ตรวจสอบ:

```powershell
pm2 status
curl http://localhost:3003
```

Firewall (ตัวอย่างพอร์ต 3003):

```cmd
netsh advfirewall firewall add rule name="SPGPS Web 3003" dir=in action=allow protocol=TCP localport=3003
```

### Windows — NSSM (legacy)

ยังมีสคริปต์ NSSM ไว้สำหรับเครื่องที่ใช้อยู่แล้ว — แนะนำย้ายมา PM2 แทน

```powershell
.\scripts\nssm-install.ps1
.\scripts\nssm-remove.ps1
```

คำสั่ง NSSM:

```cmd
nssm status "SPGPS Web"
nssm restart "SPGPS Web"
nssm restart "SPGPS Worker"
```

**สำคัญ:** ชื่อ service มีช่องว่าง — ใส่ quote เสมอ (`"SPGPS Web"`).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SCALEFUSION_API_KEY` | Scalefusion API key |
| `SCALEFUSION_BASE_URL` | Default: https://api.scalefusion.com |
| `AUTH_SECRET` | NextAuth secret (min 32 chars) |
| `AUTH_TRUST_HOST` | `true` — จำเป็นสำหรับ `next start` / Tailscale |
| `PORT` | พอร์ตเว็บ (ค่าเริ่มต้น `3000`) — ตั้งใน `.env` แล้ว restart service |
| `AUTH_URL` / `NEXTAUTH_URL` | **อย่าตั้งเป็น localhost** — ถ้าตั้ง จะ redirect ไป localhost ตลอด. เว้นว่างให้ `AUTH_TRUST_HOST=true` ตาม Host ที่เปิด (public IP / Tailscale / LAN) หรือตั้งเป็น URL จริง เช่น `http://203.x.x.x:3003` |
| `SMTP_HOST` | SMTP server (ค่าเริ่มต้นใช้งานกับ O365: `smtp.office365.com`) |
| `SMTP_PORT` | พอร์ต SMTP (ค่าเริ่มต้น `587`) |
| `SMTP_USER` | อีเมลกล่อง O365 ที่ใช้ส่ง (ต้องเปิด SMTP AUTH) |
| `SMTP_PASS` | รหัสผ่านกล่อง หรือ App password |
| `SMTP_FROM` | From ที่แสดงในเมล (ควรเป็นอีเมลเดียวกับ `SMTP_USER`) |
| `POLL_INTERVAL_MS` | Interval poll (default 180000 = 3 นาที). ถูกข้ามถ้ามี POLL_SCHEDULE |
| `POLL_SCHEDULE` | เวลาที่กำหนด เช่น `08:00,12:00,17:00` (ถ้าตั้งค่าจะใช้โหมดนี้) |
| `POLL_TZ` | Timezone ของ schedule (default Asia/Bangkok) |
| `APP_TIMEZONE` | Timezone สำหรับแบ่งวันในประวัติ/ปฏิทิน/backfill (default `Asia/Bangkok`) |
| `NEXT_PUBLIC_APP_TIMEZONE` | ค่าเดียวกับ `APP_TIMEZONE` สำหรับ UI (date picker, วันนี้) |
| `POLL_ON_STARTUP` | `0` = ไม่ poll ตอนสตาร์ทในโหมด schedule |
| `SCALEFUSION_MIN_GAP_MS` | Min gap between API calls (default ~2100) |
| `BACKFILL_CONCURRENCY` | Parallel backfill fetches (default 8) |
| `SEED_ADMIN_EMAIL` | Admin email for seed |
| `SEED_ADMIN_PASSWORD` | Admin password for seed |

## Rate Limits (Scalefusion)

Official: **30 requests/minute**, **43,200/day**. Exceeding returns HTTP **429**.

SPGPS stays under the limit by:

1. Polling **one bulk endpoint** `location_geofence.json` (not 73 per-device calls)
2. Default poll every **3 minutes** (~20 calls/hour)
3. Client-side limiter: max **28 RPM** (under official 30), min ~**2.1s** between requests
4. Skip overlapping poll cycles; handle 429 with Retry-After backoff
5. Backfill ใช้โหมด **aggressive**: ยิงจนเจอ 429 แล้วพักตาม Retry-After

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
