/**
 * จัดระเบียบ Google Sheet "ตารางการซ่อมบำรุงรถ CRV G3 2.0E 4WD" — รันครั้งเดียวด้วยมือ
 * วิธีใช้: วางไฟล์นี้ในโปรเจค Apps Script ที่ผูกกับชีตนี้ → เลือก previewTidy กด Run ดูผลใน Execution log
 * → ถ้าโอเคค่อยเลือก applyTidy กด Run
 *
 * ปลอดภัย: ไม่ลบข้อมูลใดเลย ไม่แตะชีต "ข้อมูลตัวรถ" และ "VehicleInfo"
 * applyTidy ทำสำเนาทั้งไฟล์ไว้ก่อนเสมอ (ชื่อ "สำรองก่อนจัดระเบียบ …" ใน Google Drive ของคุณ)
 * ทุกขั้นตรวจก่อนว่าชีต/ข้อมูลตรงตามที่คาดไว้ ถ้าไม่ตรงจะข้าม
 */
const CLEAN_ORDER = ['ข้อมูลตัวรถ', 'Car_Log', 'ข้อมูลการเปลี่ยนถ่าย', 'Master_Items', 'แผนบูรณะ 4 ปี', 'Vehicle_Status', 'VehicleInfo'];

function previewTidy() { tidy_(false); }
function applyTidy() { tidy_(true); }

function tidy_(apply) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), log = [];
  const say = m => log.push((apply ? '✔ ' : '• ') + m);
  if (apply) DriveApp.getFileById(ss.getId()).makeCopy('สำรองก่อนจัดระเบียบ ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));

  const logSh = ss.getSheetByName('Car_Log'), old = ss.getSheetByName('Maintenance_Log');

  // 1) Car_Log: เติมหัวคอลัมน์ note / carId ให้ตรงกับ Code.gs เวอร์ชันใหม่
  if (logSh && (logSh.getMaxColumns() < 7 || logSh.getRange(1, 7).getValue() === '')) {
    say('Car_Log: เพิ่มหัวคอลัมน์ note, carId');
    if (apply) {
      if (logSh.getMaxColumns() < 8) logSh.insertColumnsAfter(logSh.getMaxColumns(), 8 - logSh.getMaxColumns());
      logSh.getRange(1, 7, 1, 2).setValues([['note', 'carId']]);
      logSh.setFrozenRows(1);
    }
  }

  // 2) Maintenance_Log (แบบเก่า): ย้ายหมายเหตุไปไว้ที่แถวเดียวกันใน Car_Log (จับคู่ด้วยวันที่ + เลขไมล์) แล้วซ่อนชีตเก่า
  if (old && logSh) {
    const o = old.getDataRange().getValues().slice(1), l = logSh.getDataRange().getValues();
    o.forEach(r => {
      const date = r[1] instanceof Date ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[1]), km = +r[3], note = String(r[5] || '');
      const i = l.findIndex((x, j) => j > 0 && String(x[1]).slice(0, 10) === date && +x[4] === km);
      if (i > 0 && note && !l[i][6]) { say('ย้ายหมายเหตุ "' + note + '" ไปที่ Car_Log แถว ' + (i + 1)); if (apply) logSh.getRange(i + 1, 7).setValue(note); }
      else if (i < 0) say('⚠ แถวใน Maintenance_Log (' + date + ', ' + km + ') ไม่มีใน Car_Log — ไม่ได้ย้าย ตรวจเอง');
    });
    say('เปลี่ยนชื่อ Maintenance_Log เป็น "_เก่า_Maintenance_Log" และซ่อน (เปิดคืนได้จากเมนู ดู > ชีตที่ซ่อน)');
    if (apply) { old.setName('_เก่า_Maintenance_Log'); old.hideSheet(); }
  }

  // 3) เลขไมล์ปัจจุบัน: ให้ที่เดียว (Vehicle_Status) คำนวณจาก Car_Log แล้วให้ชีตอื่นอ้างถึง
  const vs = ss.getSheetByName('Vehicle_Status');
  if (vs && logSh && String(vs.getRange('A2').getValue()).indexOf('เลขไมล์') === 0) {
    say('Vehicle_Status!B2 เปลี่ยนเป็นสูตร =MAX(Car_Log!E2:E) (เดิม ' + vs.getRange('B2').getValue() + ')');
    if (apply) vs.getRange('B2').setFormula('=MAX(Car_Log!E2:E)');
  }
  const chg = ss.getSheetByName('ข้อมูลการเปลี่ยนถ่าย');
  if (chg && String(chg.getRange('B1').getValue()).indexOf('เลขไมล์') === 0) {
    say('ข้อมูลการเปลี่ยนถ่าย!C1 อ้างถึง Vehicle_Status!B2 (เดิม ' + chg.getRange('C1').getValue() + ')');
    if (apply) chg.getRange('C1').setFormula('=Vehicle_Status!B2');
  }

  // 4) ชื่อชีตที่สื่อความหมาย
  const s3 = ss.getSheetByName('ชีต3');
  if (s3) { say('เปลี่ยนชื่อ "ชีต3" เป็น "แผนบูรณะ 4 ปี"'); if (apply) s3.setName('แผนบูรณะ 4 ปี'); }

  // 5) เรียงลำดับแท็บ
  say('เรียงแท็บ: ' + CLEAN_ORDER.join(' → '));
  if (apply) CLEAN_ORDER.forEach((n, i) => { const s = ss.getSheetByName(n); if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); } });

  Logger.log((apply ? 'ทำแล้ว:\n' : 'จะทำ (ยังไม่ได้แก้อะไร):\n') + log.join('\n'));
}
