# Viewer User Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างคู่มือ HTML พิมพ์ได้ภาษาไทยสำหรับ Viewer พร้อม screenshot จริงจากเว็บ SPGPS

**Architecture:** ไฟล์ HTML เดียว + โฟลเดอร์รูป relative path ไม่มี build step ถ่ายภาพจากบัญชี Viewer บนเบราว์เซอร์เดสก์ท็อป แล้วฝังในเล่มพร้อม `@media print`

**Tech Stack:** HTML/CSS, PNG screenshots (Playwright / Cursor browser), Thai copy

## Global Constraints

- Audience: Viewer only (no Admin UI as primary content)
- Channel: web browser only
- Language: Thai entire document
- Delivery: `docs/user-guide/viewer.html` + `docs/user-guide/images/` + short README
- UI labels: **ตำแหน่ง**, **ประวัติ**
- Spec: `docs/superpowers/specs/2026-11-20-viewer-user-guide-design.md`

---

### Task 1: Capture real Viewer screenshots

**Files:**
- Create: `docs/user-guide/images/01-login.png`
- Create: `docs/user-guide/images/02-login-forgot-link.png`
- Create: `docs/user-guide/images/03-sidebar-nav.png`
- Create: `docs/user-guide/images/04-map-overview.png`
- Create: `docs/user-guide/images/05-map-filters.png`
- Create: `docs/user-guide/images/06-map-device-detail.png`
- Create: `docs/user-guide/images/07-history-overview.png`
- Create: `docs/user-guide/images/08-history-route.png`

**Interfaces:**
- Consumes: Running SPGPS web origin + Viewer credentials
- Produces: 8 PNG files listed above (may consolidate if one shot covers two captions clearly; min one image per chapters 2–5)

- [x] **Step 1: Confirm app is reachable**

Run: open `/login` on local or org URL (default `http://localhost:3000/login`)
Expected: login page renders

- [ ] **Step 2: Capture login screens**

Capture full login page → `01-login.png`  
Capture login with forgot-password link visible → `02-login-forgot-link.png` (crop OK if clearer)

- [ ] **Step 3: Sign in as Viewer and capture shell + map**

Login as Viewer (not Admin). Capture sidebar showing **ตำแหน่ง** / **ประวัติ** → `03-sidebar-nav.png`  
Capture `/map` overview → `04-map-overview.png`  
Capture filters (group / status / search) → `05-map-filters.png`  
Capture selected device detail → `06-map-device-detail.png`

- [ ] **Step 4: Capture history**

Open `/history`, capture empty/select state or device picker → `07-history-overview.png`  
Select device + date with route if available → `08-history-route.png`

- [ ] **Step 5: Verify images are Viewer-only chrome**

Open each PNG; Admin links (อุปกรณ์/กลุ่ม/ผู้ใช้/แอพมือถือ) must not dominate. If Admin account was used by mistake, re-capture with Viewer.

---

### Task 2: Build `viewer.html` + README

**Files:**
- Create: `docs/user-guide/viewer.html`
- Create: `docs/user-guide/README.md`
- Modify: `docs/superpowers/specs/2026-11-20-viewer-user-guide-design.md` (Status → Approved / Implemented)

**Interfaces:**
- Consumes: images from Task 1 via relative paths `images/*.png`
- Produces: printable Thai guide with 6 chapters matching the spec outline

- [ ] **Step 1: Create HTML skeleton with print CSS**

Include cover, TOC, sections 1–6, img tags with captions, `@media print` for A4

- [ ] **Step 2: Write Thai step-by-step copy**

Match UI strings: อีเมล, รหัสผ่าน, เข้าสู่ระบบ, ลืมรหัสผ่าน, ตำแหน่ง, ประวัติ, ออนไลน์, ไม่เคลื่อนไหว, ออฟไลน์

- [ ] **Step 3: Write README**

How to open HTML and Save as PDF from browser print dialog

- [ ] **Step 4: Open HTML and visually check**

Expected: all images load; chapters readable; no broken paths

---

### Task 3: Print readiness check

**Files:**
- Modify: `docs/user-guide/viewer.html` only if print issues found

- [ ] **Step 1: Open print preview**

Expected: images visible, text not cut off, chapters reasonably paginated

- [ ] **Step 2: Mark spec status complete**

Update design doc Status field to reflect delivery done
