# Smart Old Car

บันทึกการดูแลรถสำหรับผู้ใช้สูงวัย: เว็บหน้าเดียวบน GitHub Pages + Google Sheet เป็นฐานข้อมูล. วิธีตั้งค่าดู [QUICK_START.md](QUICK_START.md)

- `index.html` — แอป (ไม่มี dependency)
- `apps-script/Code.gs` — API บางๆ ที่อ่าน/เขียน Google Sheet
- `legacy/` — โค้ดเมนู Google Sheets เวอร์ชันเก่า (เลิกใช้)

## Log

### 2026-11-17 — ย้ายเป็นเว็บบน GitHub Pages
- เขียน `index.html` ใหม่: บันทึกงาน / สุขภาพรถ / ประวัติ / ตั้งค่า, UI ไทยตัวใหญ่, ไม่ตั้งค่า Sheet = เก็บใน localStorage, ไฟล์สำรอง JSON
- เพิ่ม `apps-script/Code.gs` (doGet list, doPost add/del, ป้องกันด้วย TOKEN, LockService)
- ย้าย `vehicle_maintenance*.gs` ไป `legacy/`; เขียน QUICK_START ใหม่
- ตรวจแค่ syntax + render ในพรีวิว (localStorage ใช้ไม่ได้ในพรีวิว); **ยังไม่ได้ทดสอบกับ Google Sheet จริง**

### Next steps
- ทดสอบ end-to-end กับ Sheet จริง (เพิ่ม/ลบ/ซิงค์)
- พิจารณา offline queue ถ้าสัญญาณมือถือไม่เสถียร, เตือนรายการอื่นนอกจากน้ำมันเครื่อง

### 2026-11-17 (2) — Deploy API เข้าโปรเจค Apps Script เดิม
- เพิ่ม `Api.js` (จาก `apps-script/Code.gs`, ชีต `Car_Log`, TOKEN สุ่มใหม่ — ไม่เก็บใน repo) ในโปรเจคเดิม; แก้ `doGet` ใน `รหัส.js` ให้ถ้ามี `?token=` ส่งไป `apiGet` ไม่งั้นแสดงหน้า CRV G3 เดิม
- Deploy ใหม่ @28 (ไม่แตะ deployment @27 ที่ใช้งานอยู่); ทดสอบ list / add / del / token ผิด ผ่านด้วย curl+node
- ยังไม่ได้ทดสอบจากหน้าเว็บ GitHub Pages จริง

### Next steps
- ใส่ลิงก์ /exec + รหัสลับในเมนู ตั้งค่า แล้วลองบันทึกจริง
