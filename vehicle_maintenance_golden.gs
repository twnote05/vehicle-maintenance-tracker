/**
 * Smart Old Car - บันทึกการดูแลรถ (ฉบับผู้ใช้สูงวัย)
 * ใช้ได้ทั้งเมนูใน Google Sheets และ Web App (มือถือ/แท็บเล็ต/คอม)
 */

/* ===== CONFIG ===== */
const MAINTENANCE_SHEET = 'Maintenance_Log';
const VEHICLE_INFO_SHEET = 'VehicleInfo';
const LOG_HEADER = ['วันที่', 'รถ', 'งานที่ทำ', 'เลขไมล์ (กม.)', 'ค่าใช้จ่าย (บาท)', 'หมายเหตุ', 'บันทึกเมื่อ'];

const OIL_KM = 5000;        // เปลี่ยนน้ำมันเครื่องทุกกี่ กม.
const OIL_MONTHS = 6;       // หรือทุกกี่เดือน (แล้วแต่อย่างไหนถึงก่อน)
const SOON_RATIO = 0.8;     // เกิน 80% ของรอบ = "ใกล้ถึงกำหนด"
const SERVICE_TYPES = ['เปลี่ยนน้ำมันเครื่อง', 'เปลี่ยนยาง', 'เปลี่ยนแบตเตอรี่', 'เปลี่ยนผ้าเบรก', 'ตรวจเช็คระยะ', 'อื่นๆ'];
const OIL_RE = /น้ำมันเครื่อง|oil/i;

const ss_ = () => SpreadsheetApp.getActiveSpreadsheet();

/* ===== MENU ===== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🚗 ดูแลรถ')
    .addItem('➕ บันทึกงานซ่อม/บำรุง', 'showQuickAddDialog')
    .addItem('📊 สุขภาพรถ', 'showDashboard')
    .addToUi();
}

function showQuickAddDialog() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(page_('form')).setWidth(460).setHeight(560), 'บันทึกงานซ่อม/บำรุง');
}

function showDashboard() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(page_('dash')).setWidth(560).setHeight(620), 'สุขภาพรถ');
}

/* ===== WEB APP ===== */
function doGet(e) {
  const p = (e && e.parameter && e.parameter.page) === 'dash' ? 'dash' : 'form';
  return HtmlService.createHtmlOutput(page_(p))
    .setTitle('ดูแลรถ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ===== SERVER API (เรียกจากหน้าเว็บด้วย google.script.run) ===== */
function addRecord(r) {
  const type = String(r.serviceType || '').trim();
  if (!type) throw new Error('กรุณาเลือกงานที่ทำ');
  const km = r.mileage === '' || r.mileage == null ? '' : Number(r.mileage);
  const cost = r.cost === '' || r.cost == null ? '' : Number(r.cost);
  if ((km !== '' && !(km >= 0)) || (cost !== '' && !(cost >= 0))) throw new Error('เลขไมล์และค่าใช้จ่ายต้องเป็นตัวเลข');
  const now = new Date();
  logSheet_().appendRow([now, r.vehicle || 'ไม่ระบุรถ', type, km, cost, String(r.notes || '').slice(0, 300), now]);
  return true;
}

function getVehicles() {
  const sh = ss_().getSheetByName(VEHICLE_INFO_SHEET);
  if (!sh) return [];
  const names = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues().slice(1)
    .map(r => String(r[0]).trim()).filter(Boolean);
  return [...new Set(names)];
}

/* ===== HEALTH LOGIC ===== */
// คืนสถานะของรถแต่ละคัน: ok | soon | overdue | none
function getHealth() {
  const sh = logSheet_();
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : [];
  const tz = Session.getScriptTimeZone();
  const byCar = {};
  getVehicles().forEach(v => byCar[v] = { vehicle: v, km: 0, oil: null, spent: 0, count: 0 });
  rows.forEach(([date, vehicle, type, km, cost]) => {
    const name = String(vehicle || 'ไม่ระบุรถ');
    const c = byCar[name] || (byCar[name] = { vehicle: name, km: 0, oil: null, spent: 0, count: 0 });
    const d = new Date(date);
    c.count++; c.spent += Number(cost) || 0;
    c.km = Math.max(c.km, Number(km) || 0);
    if (OIL_RE.test(type) && !isNaN(d) && (!c.oil || d > c.oil.date)) c.oil = { date: d, km: Number(km) || 0 };
  });
  const now = new Date();
  return Object.values(byCar).map(c => {
    let status = 'none', msg = 'ยังไม่เคยบันทึกการเปลี่ยนน้ำมันเครื่อง';
    if (c.oil) {
      const months = (now - c.oil.date) / (30.44 * 864e5);
      const kmSince = c.oil.km && c.km ? c.km - c.oil.km : 0;
      const ratio = Math.max(kmSince / OIL_KM, months / OIL_MONTHS);
      status = ratio >= 1 ? 'overdue' : ratio >= SOON_RATIO ? 'soon' : 'ok';
      const nextKm = c.oil.km ? ` หรือที่ ${(c.oil.km + OIL_KM).toLocaleString('th-TH')} กม.` : '';
      const nextDate = Utilities.formatDate(new Date(c.oil.date.getTime() + OIL_MONTHS * 30.44 * 864e5), tz, 'd/M/yyyy');
      msg = (status === 'overdue' ? 'เกินกำหนดเปลี่ยนน้ำมันเครื่อง' : 'เปลี่ยนน้ำมันเครื่องครั้งต่อไป') + ` ภายใน ${nextDate}${nextKm}`;
    }
    return { vehicle: c.vehicle, status, msg, spent: c.spent, count: c.count, km: c.km };
  });
}

/* ===== HELPERS ===== */
function logSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(MAINTENANCE_SHEET);
  if (!sh) { sh = ss.insertSheet(MAINTENANCE_SHEET); sh.appendRow(LOG_HEADER); sh.setFrozenRows(1); }
  return sh;
}

const esc_ = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ===== UI ===== */
const CSS_ = `
:root{--bg:#f6f2ea;--card:#fff;--ink:#1d1b16;--sub:#55504a;--line:#cfc7b8;--brand:#1f5c3a;--brand-d:#174a2f;
--ok:#1f6b3a;--ok-bg:#e3f2e8;--soon:#7a4b00;--soon-bg:#fdf0cf;--bad:#9b1c1c;--bad-bg:#fbe4e1}
*{box-sizing:border-box}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:18px/1.5 'Sarabun','Noto Sans Thai','Segoe UI',Tahoma,sans-serif}
.wrap{max-width:560px;margin:0 auto}
h1{font-size:24px;margin:0 0 16px;line-height:1.25}
label{display:block;font-weight:700;margin:0 0 6px}
.opt{font-weight:400;color:var(--sub)}
.f{margin-bottom:18px}
input,select,textarea{width:100%;min-height:52px;padding:10px 14px;font:inherit;color:inherit;background:var(--card);border:2px solid var(--line);border-radius:10px}
input:focus,select:focus,textarea:focus,button:focus-visible,a:focus-visible{outline:3px solid #1b6fd1;outline-offset:2px}
::selection{background:#bfe0c9}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.chip{min-height:44px;padding:6px 14px;font:inherit;background:var(--card);border:2px solid var(--line);border-radius:22px;cursor:pointer}
.chip[aria-pressed=true]{background:var(--brand);border-color:var(--brand);color:#fff}
.btn{display:block;width:100%;min-height:58px;font:inherit;font-weight:700;font-size:20px;color:#fff;background:var(--brand);border:0;border-radius:12px;cursor:pointer;text-align:center;text-decoration:none;padding:14px}
.btn:hover{background:var(--brand-d)}
.btn:disabled{opacity:.6;cursor:wait}
.msg{padding:12px 14px;border-radius:10px;margin-bottom:16px;font-weight:700}
.msg.err{background:var(--bad-bg);color:var(--bad)}
.msg.good{background:var(--ok-bg);color:var(--ok)}
.hint{color:var(--sub);font-size:16px;margin-top:4px}
.car{background:var(--card);border:2px solid var(--line);border-radius:14px;padding:16px;margin-bottom:14px}
.car h2{font-size:21px;margin:0 0 8px}
.tag{display:inline-block;padding:4px 12px;border-radius:16px;font-weight:700;font-size:18px;margin-bottom:8px}
.ok{background:var(--ok-bg);color:var(--ok)}.soon{background:var(--soon-bg);color:var(--soon)}
.overdue{background:var(--bad-bg);color:var(--bad)}.none{background:#ece8df;color:var(--sub)}
.meta{color:var(--sub);font-size:16px;margin:6px 0 0;font-variant-numeric:tabular-nums}
.empty{padding:24px;text-align:center;color:var(--sub)}
.nav{margin-top:18px}.nav a{color:var(--brand);font-weight:700}
@media(min-width:700px){body{padding:32px}}
@media(prefers-reduced-motion:no-preference){.btn{transition:background .15s}}
`;

function page_(which) {
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS_}</style>`;
  return which === 'dash' ? `<!DOCTYPE html><html lang="th"><head>${head}</head><body><div class="wrap">${dashBody_()}</div></body></html>`
                          : `<!DOCTYPE html><html lang="th"><head>${head}</head><body><div class="wrap">${formBody_()}</div></body></html>`;
}

function dashBody_() {
  const L = { ok: 'ปกติ', soon: 'ใกล้ถึงกำหนด', overdue: 'เกินกำหนด', none: 'ยังไม่มีข้อมูล' };
  const cars = getHealth().sort((a, b) => ['overdue', 'soon', 'none', 'ok'].indexOf(a.status) - ['overdue', 'soon', 'none', 'ok'].indexOf(b.status));
  const body = cars.length ? cars.map(c => `
    <section class="car">
      <h2>${esc_(c.vehicle)}</h2>
      <span class="tag ${c.status}">${L[c.status]}</span>
      <div>${esc_(c.msg)}</div>
      <p class="meta">${c.count} รายการ · ใช้ไปแล้ว ${c.spent.toLocaleString('th-TH')} บาท${c.km ? ' · ไมล์ล่าสุด ' + c.km.toLocaleString('th-TH') + ' กม.' : ''}</p>
    </section>`).join('') : '<div class="empty">ยังไม่มีรถในระบบ เพิ่มชื่อรถในชีต VehicleInfo คอลัมน์ A</div>';
  return `<h1>สุขภาพรถ</h1>${body}<p class="hint">เปลี่ยนน้ำมันเครื่องทุก ${OIL_KM.toLocaleString('th-TH')} กม. หรือ ${OIL_MONTHS} เดือน แล้วแต่อย่างไหนถึงก่อน</p>
  <p class="nav"><a href="?">← บันทึกงานใหม่</a></p>`;
}

function formBody_() {
  const cars = getVehicles();
  const opts = (cars.length === 1 ? '' : '<option value="">เลือกรถ</option>') + cars.map(v => `<option>${esc_(v)}</option>`).join('');
  const chips = SERVICE_TYPES.map(t => `<button type="button" class="chip" aria-pressed="false">${esc_(t)}</button>`).join('');
  return `<h1>บันทึกงานซ่อม/บำรุง</h1>
  <div id="msg" role="alert" hidden></div>
  <form id="f" novalidate>
    <div class="f"><label for="v">รถคันไหน</label><select id="v">${opts}</select></div>
    <div class="f"><label for="t">ทำอะไรไป</label><input id="t" autocomplete="off" placeholder="พิมพ์ หรือกดเลือกด้านล่าง"><div class="chips">${chips}</div></div>
    <div class="f"><label for="k">เลขไมล์ตอนนี้ <span class="opt">(ไม่บังคับ)</span></label><input id="k" type="number" inputmode="numeric" min="0" placeholder="เช่น 85000"><div class="hint">หน่วย กม. ช่วยให้เตือนรอบเปลี่ยนน้ำมันได้แม่นขึ้น</div></div>
    <div class="f"><label for="c">ค่าใช้จ่าย <span class="opt">(บาท, ไม่บังคับ)</span></label><input id="c" type="number" inputmode="numeric" min="0" placeholder="เช่น 1800"></div>
    <button class="btn" id="go" type="submit">บันทึก</button>
  </form>
  <p class="nav"><a href="?page=dash">ดูสุขภาพรถ →</a></p>
  <script>
  const $=i=>document.getElementById(i),msg=$('msg');
  function say(t,k){msg.className='msg '+k;msg.textContent=t;msg.hidden=false}
  document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x===b));
    $('t').value=b.textContent});
  $('t').oninput=()=>document.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x.textContent===$('t').value));
  $('f').onsubmit=e=>{e.preventDefault();
    if(!$('t').value.trim()){say('กรุณาเลือกหรือพิมพ์ว่าทำอะไรไป','err');$('t').focus();return}
    const go=$('go');go.disabled=true;go.textContent='กำลังบันทึก…';
    google.script.run
      .withSuccessHandler(()=>{say('บันทึกเรียบร้อยแล้ว','good');$('f').reset();
        document.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed','false'));
        go.disabled=false;go.textContent='บันทึก';
        if(google.script.host)setTimeout(()=>google.script.host.close(),1200)})
      .withFailureHandler(er=>{say('บันทึกไม่สำเร็จ: '+er.message+' ลองกดบันทึกอีกครั้ง','err');go.disabled=false;go.textContent='บันทึก'})
      .addRecord({vehicle:$('v').value,serviceType:$('t').value,mileage:$('k').value,cost:$('c').value})};
  </script>`;
}
