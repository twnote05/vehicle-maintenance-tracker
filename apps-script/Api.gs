/* Api.gs สำหรับโปรเจค CRV_Maintenance_App: แทนที่ตั้งแต่บรรทัด const SHEET ลงไปทั้งหมด
 * เก็บบรรทัด const TOKEN = '...' เดิมของคุณไว้บนสุด (ห้ามประกาศ TOKEN ซ้ำที่อื่น)
 * doGet อยู่ที่ รหัส.gs ตามเดิม (ส่งต่อมา apiGet เมื่อมี ?token=) — สร้างจาก Code.gs อัตโนมัติ อย่าแก้สองที่ */
const SHEET = 'Car_Log';
const HEAD = ['id', 'date', 'vehicle', 'type', 'km', 'cost', 'note', 'carId'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('@'); // เก็บวันที่เป็นข้อความ yyyy-mm-dd
  }
  if (sh.getMaxColumns() < HEAD.length) sh.insertColumnsAfter(sh.getMaxColumns(), HEAD.length - sh.getMaxColumns());
  if (sh.getRange(1, HEAD.length).getValue() !== HEAD[HEAD.length - 1]) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]);
  return sh;
}

const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
const day_ = v => v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);
const num_ = v => v === '' || v == null || isNaN(+v) || +v < 0 ? '' : +v;

// ตรวจและแปลง rec จากเว็บเป็นแถว; คืน null ถ้าข้อมูลไม่ครบ
function row_(r) {
  if (!r || !r.vehicle || !r.type || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  return [r.id, r.date, String(r.vehicle).slice(0, 80), String(r.type).slice(0, 80), num_(r.km), num_(r.cost),
    String(r.note || '').slice(0, 200), String(r.carId || '').slice(0, 40)];
}

function apiGet(e) {
  if (e.parameter.token !== TOKEN) return out_({ ok: false, error: 'รหัสลับไม่ถูกต้อง' });
  const sh = sheet_(), n = sh.getLastRow() - 1;
  const rows = n > 0 ? sh.getRange(2, 1, n, HEAD.length).getValues().map(r =>
    ({ id: r[0], date: day_(r[1]), vehicle: String(r[2]), type: String(r[3]), km: r[4], cost: r[5], note: String(r[6]), carId: String(r[7]) })) : [];
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
    const findRow = id => {
      const n = sh.getLastRow() - 1;
      const ids = n > 0 ? sh.getRange(2, 1, n, 1).getValues().map(r => String(r[0])) : [];
      const i = ids.indexOf(String(id));
      return i < 0 ? 0 : i + 2;
    };
    if (b.action === 'add') {
      const row = row_(b.rec);
      if (!row) return out_({ ok: false, error: 'ข้อมูลไม่ครบ' });
      sh.appendRow(row);
      return out_({ ok: true });
    }
    if (b.action === 'edit') {
      const row = row_(b.rec), at = row && findRow(b.rec.id);
      if (!row) return out_({ ok: false, error: 'ข้อมูลไม่ครบ' });
      if (!at) return out_({ ok: false, error: 'ไม่พบรายการ' });
      sh.getRange(at, 1, 1, HEAD.length).setValues([row]);
      return out_({ ok: true });
    }
    if (b.action === 'del') {
      const at = findRow(b.id);
      if (!at) return out_({ ok: false, error: 'ไม่พบรายการ' });
      sh.deleteRow(at);
      return out_({ ok: true });
    }
    return out_({ ok: false, error: 'ไม่รู้จักคำสั่ง' });
  } finally { lock.releaseLock(); }
}

/* ---------- แจ้งเตือนทางอีเมลทุกเช้า ----------
 * ใช้: เลือกฟังก์ชัน installReminder แล้วกด Run หนึ่งครั้ง (จะขอสิทธิ์ส่งอีเมล) ถึงจะตั้งเวลา 08:00 ทุกวัน
 * ส่งถึงอีเมลเจ้าของสคริปต์ เฉพาะเมื่อมีรายการเกิน/ใกล้ถึงกำหนด
 * ponytail: รอบด้านล่างซ้ำกับ REMINDERS ใน index.html — รอบที่แก้ในแอป และวันภาษีในโปรไฟล์รถ ไม่ตามมาที่นี่
 * (ภาษีเตือนจากบันทึกงาน "ต่อภาษี" เท่านั้น) */
const RULES = [
  { label: 'เปลี่ยนน้ำมันเครื่อง', re: /น้ำมันเครื่อง|oil/i, not: /ไส้กรอง/, km: 5000, mo: 6 },
  { label: 'ต่อภาษี / พ.ร.บ.', re: /ภาษี|พ\.ร\.บ|พรบ/, mo: 12 },
  { label: 'ล้างรถ', re: /ล้างรถ|wash/i, mo: 1 },
  { label: 'ไส้กรองน้ำมันเครื่อง', re: /ไส้กรองน้ำมันเครื่อง/, km: 10000, mo: 12 },
  { label: 'ไส้กรองอากาศ', re: /กรองอากาศ/, km: 20000, mo: 24 },
  { label: 'ตรวจเช็คระยะ', re: /ตรวจเช็ค/, km: 10000, mo: 12 },
  { label: 'น้ำมันเกียร์', re: /น้ำมันเกียร์/, km: 40000, mo: 48 },
  { label: 'น้ำมันเบรก', re: /น้ำมันเบรก/, mo: 24 },
  { label: 'ผ้าเบรก', re: /ผ้าเบรก/, km: 40000, mo: 36 },
  { label: 'ยาง', re: /ยาง/, km: 40000, mo: 48 },
  { label: 'แบตเตอรี่', re: /แบต/, mo: 24 }
];

function installReminder() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'dailyReminder').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyReminder').timeBased().everyDays(1).atHour(8).create();
}

function dailyReminder() {
  const sh = sheet_(), n = sh.getLastRow() - 1;
  if (n < 1) return;
  const MO = 30.44 * 864e5, now = Date.now(), by = {}, lines = [];
  sh.getRange(2, 1, n, HEAD.length).getValues().forEach(r => {
    const k = r[7] || r[2];
    (by[k] = by[k] || { name: String(r[2]), rs: [] }).rs.push({ date: day_(r[1]), type: String(r[3]), km: +r[4] || 0 });
  });
  Object.keys(by).forEach(k => {
    const { name, rs } = by[k], cur = Math.max(0, ...rs.map(r => r.km));
    RULES.forEach(R => {
      let last = null;
      rs.forEach(r => { if (R.re.test(r.type) && !(R.not && R.not.test(r.type)) && (!last || r.date > last.date)) last = r; });
      if (!last) return;
      const due = new Date(last.date).getTime() + R.mo * MO;
      const kmLeft = R.km && last.km && cur ? last.km + R.km - cur : null;
      const ratio = Math.max(1 - (due - now) / (R.mo * MO), kmLeft == null ? 0 : 1 - kmLeft / R.km);
      if (ratio >= 0.8) lines.push((ratio >= 1 ? 'เกินกำหนด' : 'ใกล้ถึงกำหนด') + ': ' + name + ' — ' + R.label);
    });
  });
  if (lines.length) MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'ดูแลรถ: ' + lines.length + ' เรื่องที่ต้องจัดการ', lines.join('\n'));
}
