# SPGPS — ข้อมูลสำหรับอัปโหลด Google Play

ใช้ไฟล์นี้คัดลอกใส่ Play Console ได้เลย  
แอสเซ็ตกราฟิกอยู่โฟลเดอร์เดียวกับไฟล์นี้: [`android/play-store/`](./)

---

## 1) ข้อมูลแอพ (App identity)

| รายการ | ค่า |
|--------|-----|
| ชื่อแอป (แสดงในสโตร์) | **SPGPS** |
| ชื่อเต็ม (แนะนำ) | SiriPro GPS |
| Application ID / Package name | `com.spgps.app` |
| versionName | `1.0.0` |
| versionCode | `1` |
| minSdk | 26 (Android 8.0+) |
| targetSdk / compileSdk | 35 |
| ภาษาหลักของลิสติ้ง | ไทย (th-TH) + อังกฤษ (en-US) เป็นรอง |
| หมวดหมู่ (Category) | **Business** |
| แท็ก / คำค้นแนะนำ | GPS, fleet, tracking, map, Scalefusion, realtime |

---

## 2) ข้อความ Store listing (คัดลอกได้)

### ชื่อแอป (App name) — สูงสุด ~30 ตัวอักษร

```
SPGPS
```

### คำอธิบายสั้น (Short description) — สูงสุด 80 ตัวอักษร

**ไทย**

```
ติดตามพิกัดทีมแบบเรียลไทม์ แผนที่และประวัติเส้นทางในที่เดียว
```

**English**

```
Realtime team GPS tracking — live map and route history in one app
```

### คำอธิบายเต็ม (Full description)

**ไทย**

```
SiriPro GPS

แอพสำหรับดูตำแหน่งทีมงานแบบเรียลไทม์ ผ่านแผนที่และประวัติเส้นทาง
เชื่อมต่อกับเซิร์ฟเวอร์ SPGPS ขององค์กรคุณ (ข้อมูลจาก Scalefusion ที่ซิงก์ไว้แล้ว)

ความสามารถหลัก
• แผนที่ตำแหน่งล่าสุดของอุปกรณ์/พนักงาน
• กรองตามกลุ่มและสถานะ (ออนไลน์ / ไม่เคลื่อนไหว / ออฟไลน์)
• ดูประวัติเส้นทางย้อนหลัง
• เข้าสู่ระบบด้วยบัญชีที่แอดมินกำหนดสิทธิ์
• ตั้งค่าที่อยู่เซิร์ฟเวอร์ในแอพ (สำหรับแอดมินปลดล็อกด้วยรหัสจากหน้าเว็บ)

เหมาะสำหรับ
ทีมปฏิบัติการภาคสนาม ผู้ดูแลฟลีท และองค์กรที่ใช้ Scalefusion

หมายเหตุ
ต้องเชื่อมต่อเซิร์ฟเวอร์ SPGPS ขององค์กร และใช้อินเทอร์เน็ตในการใช้งาน
```

**English**

```
SiriPro GPS

A companion app for realtime team GPS tracking — live map and route history —
connected to your organization’s SPGPS server (synced from Scalefusion).

Key features
• Live map of latest device/employee locations
• Filter by group and status (online / idle / offline)
• Route history playback
• Sign-in with accounts provisioned by your admin
• Configurable server URL (admin unlock via web TOTP code)

Built for
Field ops teams, fleet supervisors, and organizations using Scalefusion

Note
Requires your organization’s SPGPS server and an internet connection.
```

---

## 3) กราฟิกที่ต้องอัปโหลด

| Play Console field | ไฟล์ | สถานะ |
|--------------------|------|--------|
| App icon (512×512) | [`icon-512.png`](./icon-512.png) | พร้อม |
| Feature graphic (1024×500) | [`feature-graphic-1024x500.png`](./feature-graphic-1024x500.png) | พร้อม |
| Phone screenshots (อย่างน้อย 2) | [`screenshot-01-login.png`](./screenshot-01-login.png), [`screenshot-02-map.png`](./screenshot-02-map.png), [`screenshot-03-history.png`](./screenshot-03-history.png) | พร้อม (UI จริง) |

คำบรรยายภาพหน้าจอ (ไม่บังคับ แต่แนะนำ)

1. เข้าสู่ระบบ SPGPS  
2. แผนที่ตำแหน่งเรียลไทม์  
3. ประวัติเส้นทาง  

ถ่ายสกรีนใหม่จากเว็บจริง:

```bash
node --env-file=.env scripts/capture-play-store-shots.mjs
```

---

## 4) ข้อมูลติดต่อในสโตร์ (ต้องใส่เอง)

แทนที่ด้วยข้อมูลบริษัทจริงก่อนเผยแพร่:

| ช่อง | ค่าตัวอย่าง / ที่ต้องใส่ |
|------|---------------------------|
| Email (บังคับ) | เช่น `noreply@siripro.co.th` หรืออีเมลซัพพอร์ตจริง |
| เว็บไซต์ | URL เซิร์ฟเวอร์ / หน้าบริษัท |
| โทรศัพท์ | (ถ้ามี) |
| Privacy policy URL | **บังคับสำหรับแอพที่เก็บ/ส่งข้อมูลผู้ใช้** — ต้องมีหน้า HTTPS สาธารณะ |

ร่างเนื้อหานโยบายความเป็นส่วนตัวสั้น ๆ อยู่ด้านล่าง — นำไปโฮสต์เป็นหน้าเว็บแล้วใส่ลิงก์

---

## 5) Data safety (แบบสอบถามความปลอดภัยของข้อมูล)

ตอบตามพฤติกรรมแอพปัจจุบัน (WebView + ตั้งค่า URL ในเครื่อง):

| คำถามแนว | คำแนะนำการตอบ |
|----------|----------------|
| เก็บข้อมูลผู้ใช้หรือไม่ | **ใช่** — อีเมล/บัญชีผ่านเซิร์ฟเวอร์องค์กร; session ใน WebView |
| ตำแหน่ง (location) | แอพนี้**ไม่ได้**ขอ GPS ของโทรศัพท์ผู้ใช้โดยตรง — แสดงพิกัดอุปกรณ์ที่เซิร์ฟเวอร์เก็บจาก Scalefusion |
| ส่งข้อมูลไปเซิร์ฟเวอร์ของนักพัฒนา | **ใช่** — ไปยังเซิร์ฟเวอร์ SPGPS ที่องค์กรตั้งค่า |
| แชร์กับบุคคลที่สามเพื่อโฆษณา | **ไม่** |
| เข้ารหัสระหว่างส่ง (in transit) | แนะนำใช้ **HTTPS** ในโปรดักชัน; ถ้าใช้ HTTP ใน LAN ให้ระบุตามจริง |
| ผู้ใช้ลบบัญชีได้หรือไม่ | ผ่านแอดมินองค์กร / นโยบายภายใน |

ข้อมูลที่อาจเกี่ยวข้อง: อีเมลบัญชี, คุกกี้เซสชัน, การตั้งค่า URL เซิร์ฟเวอร์บนเครื่อง, ข้อมูลตำแหน่งพนักงานที่แสดงในแอป (จากเซิร์ฟเวอร์)

สิทธิ์ Android ที่ประกาศ:

- `INTERNET`
- `ACCESS_NETWORK_STATE`

---

## 6) Content rating

ทำแบบสอบถาม IARC ใน Play Console:

- หมวดธุรกิจ / ไม่ใช่เกม  
- ไม่มีเนื้อหาความรุนแรง / ผู้ใหญ่ / การพนัน  
- ไม่มี UGC สาธารณะแบบโซเชียล  
- กลุ่มอายุโดยทั่วไป: **Everyone** หรือเทียบเท่า (ขึ้นกับคำตอบแบบฟอร์ม)

---

## 7) กลุ่มเป้าหมายและข่าวสาร

| ช่อง | แนะนำ |
|------|--------|
| Target age | 18+ (พนักงานองค์กร) หรือตามนโยบายบริษัท |
| Store listing contact | อีเมลองค์กร |
| News apps / COVID apps | ไม่ใช่ |

---

## 8) ไฟล์ที่ต้อง build สำหรับอัปโหลด

Play ต้องการ **Android App Bundle (.aab)** ลงนามด้วย upload key

```bash
cd android
# ตั้งค่า signing ใน keystore ก่อน (อย่า commit keystore / รหัสผ่าน)
.\gradlew.bat bundleRelease
```

ผลลัพธ์โดยทั่วไป:

`android/app/build/outputs/bundle/release/app-release.aab`

### ก่อน release จริง ควรทำ

1. สร้าง keystore upload (เก็บสำรองปลอดภัย)  
2. ตั้ง `MOBILE_SETTINGS_TOTP_SECRET` ให้ตรงกับเซิร์ฟเวอร์โปรดักชัน  
3. ใช้ **HTTPS** เป็นค่าเริ่มต้นของเซิร์ฟเวอร์ (Play / ผู้ใช้ภายนอกไม่เหมาะกับ cleartext HTTP)  
4. ทดสอบบนเครื่องจริงหลังติดตั้งจาก Internal testing track  
5. เตรียม Privacy policy URL ที่เปิดได้สาธารณะ  

---

## 9) ร่าง Privacy Policy (สั้น — โฮสต์เป็นหน้าเว็บ)

```
นโยบายความเป็นส่วนตัว — SPGPS

แอพ SPGPS เป็นไคลเอนต์สำหรับเข้าถึงระบบติดตามพิกัดขององค์กรคุณ
ข้อมูลบัญชี (เช่น อีเมล) และการใช้งานจะถูกส่งไปยังเซิร์ฟเวอร์ SPGPS
ที่องค์กรกำหนด เพื่อยืนยันตัวตนและแสดงตำแหน่งอุปกรณ์ตามสิทธิ์ของผู้ใช้

แอพไม่ได้ขายข้อมูลให้บุคคลที่สามเพื่อโฆษณา
การตั้งค่าที่อยู่เซิร์ฟเวอร์ถูกเก็บในเครื่องของคุณ
สำหรับคำถามด้านข้อมูลส่วนบุคคล ติดต่อผู้ดูแลระบบขององค์กร
หรือ [อีเมลติดต่อ]

อัปเดตล่าสุด: 2026-11-19
```

---

## 10) เช็คลิสต์อัปโหลด Play Console

- [ ] สร้างแอพใหม่ / เลือกแอป `com.spgps.app`
- [ ] กรอกชื่อ + คำอธิบายสั้น/ยาว (ไทย / อังกฤษ)
- [ ] อัปโหลด icon, feature graphic, screenshots ≥ 2
- [ ] ใส่ Privacy policy URL
- [ ] กรอก Data safety ตามตารางด้านบน
- [ ] ทำ Content rating
- [ ] สร้าง Internal testing → อัปโหลด `.aab`
- [ ] เชิญเทสเตอร์ → ติดตั้งจากลิงก์ Play
- [ ] เมื่อพร้อม → Production / Closed testing ตามนโยบายบริษัท

---

## หมายเหตุสำคัญ

แอพนี้เป็น **WebView ไปยังเซิร์ฟเวอร์องค์กร** ไม่ใช่แอพเก็บ GPS ของมือถือผู้ใช้เอง  
หากเผยแพร่สาธารณะบน Play ควรมีโดเมน HTTPS คงที่ และ Privacy policy ที่ชัดเจน  
หากใช้เฉพาะภายในองค์กร พิจารณา **Google Play private apps / Managed Google Play** แทนการเผยแพร่สาธารณะ
