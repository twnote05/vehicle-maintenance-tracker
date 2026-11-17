/**
 * Smart Old Car — ตัว API บางๆ ให้หน้าเว็บบน GitHub อ่าน/เขียน Google Sheet
 * ติดตั้ง: ดู README ส่วน "เชื่อม Google Sheet"
 * ตั้ง TOKEN เป็นรหัสลับของคุณเอง (ใส่เดียวกันในหน้า ตั้งค่า ของเว็บ)
 */
const TOKEN = 'เปลี่ยนเป็นรหัสลับของคุณ';
const SHEET = 'Maintenance_Log';
const HEAD = ['id', 'date', 'vehicle', 'type', 'km', 'cost'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('@'); // เก็บวันที่เป็นข้อความ yyyy-mm-dd
  }
  return sh;
}

const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const day_ = v => v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);

function doGet(e) {
  if (e.parameter.token !== TOKEN) return out_({ ok: false, error: 'รหัสลับไม่ถูกต้อง' });
  const sh = sheet_(), n = sh.getLastRow() - 1;
  const rows = n > 0 ? sh.getRange(2, 1, n, 6).getValues().map(r =>
    ({ id: r[0], date: day_(r[1]), vehicle: String(r[2]), type: String(r[3]), km: r[4], cost: r[5] })) : [];
  return out_({ ok: true, rows });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (_) { return out_({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }); }
  if (b.token !== TOKEN) return out_({ ok: false, error: 'รหัสลับไม่ถูกต้อง' });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    if (b.action === 'add') {
      const r = b.rec;
      if (!r || !r.vehicle || !r.type || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return out_({ ok: false, error: 'ข้อมูลไม่ครบ' });
      const num = v => v === '' || v == null || isNaN(+v) || +v < 0 ? '' : +v;
      sh.appendRow([r.id, r.date, String(r.vehicle).slice(0, 80), String(r.type).slice(0, 80), num(r.km), num(r.cost)]);
      return out_({ ok: true });
    }
    if (b.action === 'del') {
      const n = sh.getLastRow() - 1;
      const ids = n > 0 ? sh.getRange(2, 1, n, 1).getValues().map(r => r[0]) : [];
      const i = ids.indexOf(b.id);
      if (i < 0) return out_({ ok: false, error: 'ไม่พบรายการ' });
      sh.deleteRow(i + 2);
      return out_({ ok: true });
    }
    return out_({ ok: false, error: 'ไม่รู้จักคำสั่ง' });
  } finally { lock.releaseLock(); }
}
