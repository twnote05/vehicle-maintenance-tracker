# Smart Old Car

บันทึกการดูแลรถสำหรับผู้ใช้สูงวัย (Google Apps Script + Google Sheets). วิธีติดตั้งดู [QUICK_START.md](QUICK_START.md) (ยังเป็นเวอร์ชันเก่า ดู Next steps)

## Log

### 2026-11-17 — ปรับปรุงการใช้งานครั้งใหญ่ (`vehicle_maintenance_golden.gs`)
**แก้บั๊ก**
- ฟอร์มเมนูบันทึกไม่ได้จริง (เรียก `document`/`setTimeout` ฝั่ง server) → ใช้ `google.script.run.addRecord`
- Dashboard ใช้ `window.innerWidth` ฝั่ง server → ลบออก
- Web App เดิมส่ง HTML ผ่าน `ContentService`, ไม่มี `doPost`, URL ฝังในโค้ด → `doGet` ใช้ `HtmlService`, ฟอร์ม/แดชบอร์ดใช้โค้ดชุดเดียวกันทั้งเมนูและเว็บ
- ตรรกะ "เกินกำหนด" ผิด (`mileage % 5000`) → คำนวณรายคัน จากน้ำมันเครื่องครั้งล่าสุด (กม. หรือเดือน แล้วแต่ถึงก่อน)
- วันที่เก็บเป็นข้อความ → เก็บเป็น Date จริง; escape ชื่อรถกัน HTML injection

**UX**
- UI ภาษาไทย, ตัวอักษร 18px+, ปุ่ม ≥52px, สถานะมีคำกำกับ (ไม่ใช้สีอย่างเดียว), focus ชัด
- ฟอร์ม: ชิปเลือกงานที่ใช้บ่อย, ถ้ามีรถคันเดียวเลือกให้เอง, สถานะกำลังบันทึก/ผิดพลาดบอกวิธีแก้
- Dashboard: การ์ดต่อรถ เรียงคันที่เร่งด่วนก่อน, หน่วย กม./บาท
- สร้างชีต `Maintenance_Log` + หัวตารางอัตโนมัติถ้ายังไม่มี

**ยังไม่ได้ทดสอบ** ใน Google Sheets จริง (ตรวจแค่ syntax)

### Next steps
- วางโค้ดใหม่ใน Apps Script แล้วทดสอบเมนู + Deploy เป็น Web App (Execute as: me)
- อัปเดต `QUICK_START.md` ให้ตรงเวอร์ชันนี้ (ลบ URL เก่า, ตัดส่วน health score 0-100)
- ลบ `vehicle_maintenance.gs` เวอร์ชันเก่าถ้าไม่ใช้แล้ว (ไม่ได้แตะในรอบนี้)
- พิจารณาเตือนรายการอื่นนอกจากน้ำมันเครื่อง (ยาง, แบตเตอรี่)

### 2026-11-17 (2) — อัปเดต QUICK_START.md
- เขียนใหม่ให้ตรงเวอร์ชันปัจจุบัน (เมนูภาษาไทย, ?page=dash, กติกาเตือนน้ำมันเครื่อง, ขั้นตอน Deploy)
- Deploy ผ่าน clasp ยังไม่ทำ: ไม่มี `.clasp.json` (ต้องใช้ Script ID)

### Next steps (ปรับ)
- ได้ Script ID แล้ว: `clasp clone` → copy .gs เป็น Code.gs → `clasp push` → `clasp deploy`
