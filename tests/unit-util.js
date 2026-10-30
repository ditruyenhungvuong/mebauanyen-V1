/* =========================================================
   Unit test js/util.js – Mẹ Bầu An Yên (chủ: qa-tester, T-Q1).
   Nguồn ca: tech design 5.7.2–5.7.3 (bảng 14 ca ngày dự sinh / tuần thai), 5.1 (dayKey giờ VN), 3.3 (esc),
   12.4 (normalizePhone/maskPhone, ADR 0005 mục 4.1), K-AC-58 (csvCell); PRD AC-128, AC-129 (+ bảng ca biên),
   AC-130 (qua nửa đêm, đồng hồ giả), AC-131 (múi giờ máy).
   Cả bộ chạy dưới 4 múi giờ máy và phải ra kết quả giống hệt. Hàm chưa có → CHỜ. FAIL → exit 1.
   Chạy: node tests/unit-util.js
   ========================================================= */
'use strict';
const { createHarness, runInTimezones, fmt } = require('./lib/harness');
const { loadApp } = require('./lib/load');

if (runInTimezones(__filename, 'unit-util')) main();

function main() {
  const H = createHarness('unit-util');
  const app = loadApp(['js/config.js', 'js/util.js']);
  const U = app.win.LSTP_UTIL || {};
  const why = 'util.js chưa có hàm (FE-1)';
  const need = (names, fn) => (H.has(U, ...names) ? fn() : null);
  const ga = (edd, today) => { const r = U.gestAge(edd, today); return r && { w: r.weeks, d: r.days, total: r.totalDays, status: r.status }; };

  /* ===== Ngày lịch VN ===== */
  H.section('dayKey / dayNum / dayDiff');
  const c12 = '5.7.3 #12: dayKey 23:59 giờ VN → 2026-10-28, 00:00 giờ VN → 2026-10-29';
  need(['dayKey'], () => H.eq(c12, [U.dayKey(Date.UTC(2026, 9, 28, 16, 59)), U.dayKey(Date.UTC(2026, 9, 28, 17, 0))], ['2026-10-28', '2026-10-29'])) ?? H.wait(c12, why);
  const cdk = 'dayKey(ms, 0) đọc theo UTC; mặc định dùng TZ_OFFSET_MIN = 420';
  need(['dayKey'], () => H.eq(cdk, [U.dayKey(Date.UTC(2026, 9, 28, 17, 0), 0), U.dayKey(Date.UTC(2026, 9, 28, 17, 0))], ['2026-10-28', '2026-10-29'])) ?? H.wait(cdk, why);
  const cdn = 'dayNum 1970-01-01 = 0, 2026-10-29 = 20755; sai định dạng → NaN';
  need(['dayNum'], () => H.eq(cdn, [U.dayNum('1970-01-01'), U.dayNum('2026-10-29'), Number.isNaN(U.dayNum('2026-10-29T00:00')), Number.isNaN(U.dayNum(null))], [0, 20755, true, true])) ?? H.wait(cdn, why);
  const cdd = 'dayDiff qua năm nhuận (2028-02-28 → 2028-03-01 = 2) và qua DST châu Âu/Mỹ (không lệch)';
  need(['dayDiff'], () => H.eq(cdd, [U.dayDiff('2028-02-28', '2028-03-01'), U.dayDiff('2026-03-07', '2026-03-09'), U.dayDiff('2026-03-28', '2026-03-30'), U.dayDiff('2026-10-29', '2027-08-05')], [2, 2, 2, 280])) ?? H.wait(cdd, why);

  /* ===== Bảng 5.7.3 ===== */
  H.section('Bảng 5.7.3 – validEdd / gestAge');
  const TD = '2026-10-29';
  const rows = [
    ['#1 edd = today+280 → ok · 0 tuần 0 ngày', TD, '2027-08-05', 'ok', { w: 0, d: 0, total: 0, status: 'ok' }],
    ['#2 edd = today → 40 tuần 0 ngày', TD, '2026-10-29', 'ok', { w: 40, d: 0, total: 280, status: 'ok' }],
    ['#3 edd 2026-11-01 → 277 ngày = 39 tuần 4 ngày', TD, '2026-11-01', 'ok', { w: 39, d: 4, total: 277, status: 'ok' }],
    ['#4 edd today+84 → 196 = 28 tuần 0 ngày (mốc ghi chú mục đếm)', TD, '2027-01-21', 'ok', { w: 28, d: 0, total: 196, status: 'ok' }],
    ['#5 edd 2027-01-22 → 27 tuần 6 ngày (còn ghi chú "từ tuần 28")', TD, '2027-01-22', 'ok', { w: 27, d: 6, total: 195, status: 'ok' }],
    ['#6 edd today−14 → ok · 42 tuần 0 ngày, status ok', TD, '2026-10-15', 'ok', { w: 42, d: 0, total: 294, status: 'ok' }],
    ['#7 edd today−15 → too_early · 42 tuần 1 ngày, past42', TD, '2026-10-14', 'too_early', { w: 42, d: 1, total: 295, status: 'past42' }],
    ['#9 năm nhuận: 2028-02-28 → 2028-03-01 = 39 tuần 5 ngày', '2028-02-28', '2028-03-01', 'ok', { w: 39, d: 5, total: 278, status: 'ok' }],
    ['#10 qua năm: 2026-12-31 → 2027-01-01 = 39 tuần 6 ngày', '2026-12-31', '2027-01-01', 'ok', { w: 39, d: 6, total: 279, status: 'ok' }],
    ['#11a tuần DST châu Âu: today 2026-03-28, edd 2026-04-10 → 38 tuần 1 ngày', '2026-03-28', '2026-04-10', 'ok', { w: 38, d: 1, total: 267, status: 'ok' }],
    ['#11b tuần DST châu Âu: today 2026-03-29, edd 2026-04-10 → 38 tuần 2 ngày', '2026-03-29', '2026-04-10', 'ok', { w: 38, d: 2, total: 268, status: 'ok' }],
    ['AC-129: edd 05/02/2027, hôm nay 29/10/2026 → 181 ngày = Tuần 25 + 6 ngày', TD, '2027-02-05', 'ok', { w: 25, d: 6, total: 181, status: 'ok' }]
  ];
  for (const [name, today, edd, v, g] of rows) {
    if (!H.has(U, 'validEdd', 'gestAge')) { H.wait(name, why); continue; }
    H.run(name, () => H.eq(name, { valid: U.validEdd(edd, today), ga: ga(edd, today) }, { valid: v, ga: g }));
  }
  const c8 = '#8 edd today+281 (2027-08-06) → too_far; gestAge status before';
  need(['validEdd', 'gestAge'], () => H.eq(c8, [U.validEdd('2027-08-06', TD), (U.gestAge('2027-08-06', TD) || {}).status], ['too_far', 'before'])) ?? H.wait(c8, why);
  const c13 = '#13 định dạng: "2026-2-3" / "2026-02-30" / "" / null / "29/10/2026" / "2026-10-29T00:00"';
  need(['validEdd'], () => H.eq(c13, ['2026-2-3', '2026-02-30', '', null, '29/10/2026', '2026-10-29T00:00'].map(x => U.validEdd(x, TD)),
    ['format', 'invalid_date', 'format', 'format', 'format', 'format'])) ?? H.wait(c13, why);
  const c13b = '#13 gestAge thiếu/sai định dạng → null ("", null, undefined, "29/10/2026", "2026-2-3")';
  need(['gestAge'], () => H.eq(c13b, ['', null, undefined, '29/10/2026', '2026-2-3'].map(x => U.gestAge(x, TD)), [null, null, null, null, null])) ?? H.wait(c13b, why);
  const c13c = 'thêm: ngày không có thật 2026-13-01, 2027-02-29 → invalid_date; 2028-02-29 (năm nhuận, hôm nay 2028-01-01) → ok';
  need(['validEdd'], () => H.eq(c13c, [U.validEdd('2026-13-01', TD), U.validEdd('2027-02-29', TD), U.validEdd('2028-02-29', '2028-01-01')], ['invalid_date', 'invalid_date', 'ok'])) ?? H.wait(c13c, why);

  /* AC-128: ranh giới khoảng nhập */
  H.section('AC-128 ranh giới');
  const c128 = 'AC-128: hôm nay 29/10/2026: 14/10/2026 (−15) và 06/08/2027 (+281) không lưu; 15/10/2026 (−14) và 05/08/2027 (+280) lưu được';
  need(['validEdd'], () => H.eq(c128, ['2026-10-14', '2027-08-06', '2026-10-15', '2027-08-05'].map(x => U.validEdd(x, TD)), ['too_early', 'too_far', 'ok', 'ok'])) ?? H.wait(c128, why);

  /* AC-129: bảng ca biên 0 / 279 / 280 / 281 / 294 / 295 */
  H.section('AC-129 ca biên');
  for (const total of [0, 279, 280, 281, 294, 295]) {
    const name = 'AC-129: tuổi thai ' + total + ' ngày → ' + Math.floor(total / 7) + ' tuần ' + (total % 7) + ' ngày, status ' + (total > 294 ? 'past42' : 'ok');
    if (!H.has(U, 'gestAge', 'dayAdd') && !H.has(U, 'gestAge')) { H.wait(name, why); continue; }
    // edd = today + (280 − total); dựng chuỗi bằng Date.UTC (không phụ thuộc util)
    const n = Date.UTC(2026, 9, 29) / 86400000 + (280 - total);
    const edd = new Date(n * 86400000).toISOString().slice(0, 10);
    H.run(name, () => H.eq(name, ga(edd, TD), { w: Math.floor(total / 7), d: total % 7, total, status: total > 294 ? 'past42' : 'ok' }));
  }

  /* AC-130: qua nửa đêm giờ VN với đồng hồ giả — tuần thai tăng đúng 1 ngày */
  H.section('AC-130 nửa đêm (đồng hồ giả)');
  const c130 = 'AC-130: 23:59 ngày 29/10 giờ VN → 181 ngày; 00:00 ngày 30/10 → 182 ngày (edd 05/02/2027)';
  need(['gestAge', 'dayKey'], () => {
    app.clock.set(Date.UTC(2026, 9, 29, 16, 59));
    const a = U.gestAge('2027-02-05', U.dayKey(app.win.Date.now()));
    app.clock.set(Date.UTC(2026, 9, 29, 17, 0));
    const b = U.gestAge('2027-02-05', U.dayKey(app.win.Date.now()));
    return H.eq(c130, [a && a.totalDays, b && b.totalDays], [181, 182]);
  }) ?? H.wait(c130, why);
  const cpure = 'validEdd/gestAge/dayKey/dayDiff không tự gọi Date.now()/new Date() (nhận today qua tham số)';
  need(['validEdd', 'gestAge'], () => {
    app.clock.reset(); U.validEdd('2027-02-05', TD); U.gestAge('2027-02-05', TD); U.dayDiff(TD, '2027-02-05'); U.dayKey(Date.UTC(2026, 9, 29));
    return H.eq(cpure, app.clock.calls, 0);
  }) ?? H.wait(cpure, why);

  /* ===== esc, randomId ===== */
  H.section('esc / randomId');
  const ce = 'esc: & < > " \' đều được thay; null/undefined → ""; số → chuỗi';
  need(['esc'], () => H.eq(ce, [U.esc('<img src=x onerror="window.__xss=1">&\''), U.esc(null), U.esc(undefined), U.esc(0)],
    ['&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt;&amp;&#39;', '', '', '0'])) ?? H.wait(ce, why);
  const cr = 'randomId: 20 ký tự [0-9a-z], khớp regex server ^[0-9a-z]{12,40}$, 2.000 mã không trùng';
  need(['randomId'], () => {
    const ids = Array.from({ length: 2000 }, () => U.randomId());
    return H.ok(cr, ids.every(s => /^[0-9a-z]{20}$/.test(s)) && new Set(ids).size === ids.length, ids.slice(0, 3).join(','));
  }) ?? H.wait(cr, why);

  /* ===== csvCell (K-AC-58, A.15) ===== */
  H.section('csvCell');
  const unq = s => (typeof s === 'string' && s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') ? s.slice(1, -1).replace(/""/g, '"') : s;
  const cc1 = 'csvCell: ô bắt đầu = + - @ được thêm \' ở đầu (chống chèn công thức)';
  need(['csvCell'], () => H.eq(cc1, ['=IMPORTXML("x")', '+1', '-2', '@SUM(A1)'].map(x => unq(U.csvCell(x))), ["'=IMPORTXML(\"x\")", "'+1", "'-2", "'@SUM(A1)"])) ?? H.wait(cc1, why);
  const cc2 = 'csvCell: dấu phẩy, ngoặc kép, xuống dòng được bọc/nhân đôi đúng CSV; null → rỗng';
  need(['csvCell'], () => {
    const a = U.csvCell('a,b'), b = U.csvCell('mẹ nói "con"'), c = U.csvCell('dòng 1\ndòng 2'), d = U.csvCell(null);
    return H.ok(cc2, a === '"a,b"' && b === '"mẹ nói ""con"""' && c === '"dòng 1\ndòng 2"' && (d === '' || d === '""'), fmt([a, b, c, d]));
  }) ?? H.wait(cc2, why);
  const cc3 = 'csvCell: chữ thường và số giữ nguyên nội dung';
  need(['csvCell'], () => H.eq(cc3, [unq(U.csvCell('Con cử động đều')), unq(U.csvCell(25))], ['Con cử động đều', '25'])) ?? H.wait(cc3, why);

  /* ===== Số điện thoại (ADR 0005 mục 4.1, AC-81, AC-85) ===== */
  H.section('normalizePhone / maskPhone');
  const cp1 = 'normalizePhone: 0912 345 678 / 0912.345.678 / +84912345678 / 84912345678 → +84912345678';
  need(['normalizePhone'], () => H.eq(cp1, ['0912 345 678', '0912.345.678', '+84912345678', '84912345678', '+84 912-345-678'].map(U.normalizePhone), Array(5).fill('+84912345678'))) ?? H.wait(cp1, why);
  const cp2 = 'normalizePhone: số bàn 02…, thiếu số, thừa số, chữ, rỗng → null';
  need(['normalizePhone'], () => H.eq(cp2, ['0212345678', '091234567', '09123456789', 'abc', '', null, '+840912345678'].map(U.normalizePhone), Array(7).fill(null))) ?? H.wait(cp2, why);
  const cp3 = 'normalizePhone: đầu số di động 3/5/7/8/9 đều nhận';
  need(['normalizePhone'], () => H.eq(cp3, ['0321234567', '0561234567', '0701234567', '0881234567', '0991234567'].map(U.normalizePhone), ['+84321234567', '+84561234567', '+84701234567', '+84881234567', '+84991234567'])) ?? H.wait(cp3, why);
  const cp4 = 'maskPhone(+84912345123) → "+849 ••• ••123" (A.25, AC-85); rỗng → ""';
  need(['maskPhone'], () => H.eq(cp4, [U.maskPhone('+84912345123'), U.maskPhone(''), U.maskPhone(null)], ['+849 ••• ••123', '', ''])) ?? H.wait(cp4, why);

  /* ===== clamp ===== */
  H.section('clamp');
  const ccl = 'clamp(v, min, max)';
  need(['clamp'], () => H.eq(ccl, [U.clamp(5, 0, 3), U.clamp(-1, 0, 3), U.clamp(2, 0, 3)], [3, 0, 2])) ?? H.wait(ccl, why);

  /* ===== Hằng 14 / 280 khớp config (check-static so thêm với server) ===== */
  H.section('hằng ngày dự sinh');
  const ch = 'validEdd dùng đúng EDD_MIN_OFFSET_DAYS/EDD_MAX_OFFSET_DAYS của config (−14 / 280)';
  need(['validEdd'], () => {
    const C = app.win.LSTP_CONFIG;
    return H.eq(ch, [C.EDD_MIN_OFFSET_DAYS, C.EDD_MAX_OFFSET_DAYS], [-14, 280]);
  }) ?? H.wait(ch, why);

  H.done();
}
