/* =========================================================
   Unit test js/stats.js – Mẹ Bầu An Yên
   Chủ: qa-tester (T-Q1) — TIẾP QUẢN từ bản FE-5 viết trước (29/10/2026). Mọi ca của FE-5 giữ nguyên
   (khối "Ca của FE-5"), chỉ đổi sang bộ ghi chung tests/lib/harness.js (PASS/FAIL/CHỜ, so nhiều múi giờ).
   Nguồn ca thêm của QA: tech design mục 8 (interface ST.*), 14.1; PRD AC-79, 100, 103–107; AC-131 (múi giờ).
   Kiểm: chuỗi ngày (hôm nay chưa tick, lỡ một ngày, qua nửa đêm giờ VN, qua tháng/năm, năm nhuận),
   lịch tháng 28/29/30/31 ngày + ô trống đầu tuần, 7 ngày qua, "tháng này {n} ngày", số lượt đếm theo ngày,
   tuần thai của một ngày; hàm thuần không tự lấy giờ, không đổi dữ liệu vào.
   Cả bộ chạy dưới 4 múi giờ máy (Asia/Ho_Chi_Minh, America/Los_Angeles, Pacific/Kiritimati, UTC): kết quả phải giống hệt.
   Hàm chưa có → CHỜ. Có FAIL → exit 1.
   Chạy: node tests/unit-stats.js
   ========================================================= */
'use strict';
const { createHarness, runInTimezones, fmt } = require('./lib/harness');
const { loadApp } = require('./lib/load');

if (runInTimezones(__filename, 'unit-stats')) main();

function main() {
  const H = createHarness('unit-stats');
  const app = loadApp(['js/config.js', 'js/util.js', 'js/stats.js']);
  const ST = app.win.LSTP_STATS || {};
  const why = 'stats.js chưa có hàm (FE-5)';
  const NEED = ['dayNum', 'addDays', 'weekdayMon0', 'daysInMonth', 'dayKey', 'streak', 'markedDays', 'dayCount', 'monthGrid', 'monthLead',
    'monthCount', 'anyMarked', 'last7', 'week', 'kickCountByDay', 'gaWeekOf'];
  const missing = NEED.filter(f => typeof ST[f] !== 'function');
  const eq = (name, got, want) => H.eq(name, got, want);

  /* ===== Ca của FE-5 (giữ nguyên) ===== */
  H.section('Ca của FE-5');
  if (missing.length) H.wait('bộ ca FE-5 (50 ca)', why + ': ' + missing.join(', '));
  else H.run('bộ ca FE-5', () => feCases(ST, eq));

  /* ===== Ca thêm của QA ===== */
  H.section('QA – interface tech design mục 8');
  const HD = (day, marks) => ({ v: 1, day, marks, at: 0 });
  const enabled = ['kick', 'thai_giao', 'breath', 'water', 'side_sleep'];
  const has = (...f) => H.has(ST, ...f);
  const q = (name, fns, fn) => (has(...fns) ? H.run(name, fn) : H.wait(name, why));

  q('AC-103: hôm nay chưa tick + lỡ hôm qua → current 0; chuỗi về 0 vẫn giữ longest', ['streak'], () =>
    eq('AC-103: hôm nay chưa tick + lỡ hôm qua → current 0; chuỗi về 0 vẫn giữ longest', ST.streak(new Set(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-27']), '2026-10-29'), { current: 0, longest: 5 }));
  q('AC-103: hôm nay theo giờ VN — 23:59 VN chưa tick vẫn tính chuỗi tới hôm qua; 00:00 VN hôm sau mới đứt', ['streak', 'dayKey'], () => {
    const days = new Set(['2026-10-27', '2026-10-28']);
    const t1 = ST.dayKey(Date.UTC(2026, 9, 29, 16, 59)), t2 = ST.dayKey(Date.UTC(2026, 9, 29, 17, 0));   // 23:59 ngày 29 / 00:00 ngày 30 giờ VN
    eq('AC-103: hôm nay theo giờ VN — 23:59 VN chưa tick vẫn tính chuỗi tới hôm qua; 00:00 VN hôm sau mới đứt', [ST.streak(days, t1).current, ST.streak(days, t2).current], [2, 0]);
  });
  q('AC-100: monthGrid/week/monthCount bỏ thói quen đang tắt; dữ liệu cũ không mất (đối tượng vào không đổi)', ['monthGrid', 'week', 'monthCount'], () => {
    const days = { '2026-10-10': HD('2026-10-10', { move: 'x', water: 'x' }), '2026-10-11': HD('2026-10-11', { move: 'a' }) };
    const before = JSON.stringify(days);
    const g = ST.monthGrid(2026, 10, days, enabled, '2026-10-29');
    const w = ST.week(days, enabled, '2026-10-12');
    const n = ST.monthCount(days, 2026, 10, enabled);
    eq('AC-100: monthGrid/week/monthCount bỏ thói quen đang tắt; dữ liệu cũ không mất (đối tượng vào không đổi)',
      [g[9].n, g[10].n, w.some(x => x.code === 'move'), n, JSON.stringify(days) === before], [1, 0, false, 1, true]);
  });
  q('AC-104: monthGrid mọi ô có day YYYY-MM-DD liên tiếp từ ngày 1; ô tương lai n = 0', ['monthGrid'], () => {
    const g = ST.monthGrid(2028, 2, { '2028-02-29': HD('2028-02-29', { water: 'x' }) }, enabled, '2028-02-28');
    eq('AC-104: monthGrid mọi ô có day YYYY-MM-DD liên tiếp từ ngày 1; ô tương lai n = 0', [g.length, g[0].day, g[28].day, g[28].future, g[28].n], [29, '2028-02-01', '2028-02-29', true, 0]);
  });
  q('AC-105: week trả đúng 7 ngày gần nhất, n trong 0..7', ['week'], () => {
    const days = {};
    for (let i = 0; i < 10; i++) { const d = new Date(Date.UTC(2026, 9, 20 + i)).toISOString().slice(0, 10); days[d] = HD(d, { water: 'x' }); }
    eq('AC-105: week trả đúng 7 ngày gần nhất, n trong 0..7', ST.week(days, ['water'], '2026-10-29'), [{ code: 'water', n: 7 }]);
  });
  q('AC-79/AC-107: kickCountByDay chỉ đếm green|red; "yellow", null, bản ghi rác không tính', ['kickCountByDay'], () => {
    const T = Date.UTC(2026, 9, 29, 2);
    eq('AC-79/AC-107: kickCountByDay chỉ đếm green|red; "yellow", null, bản ghi rác không tính',
      ST.kickCountByDay([{ startAt: T, level: 'green' }, { startAt: T, level: 'red' }, { startAt: T, level: 'yellow' }, { startAt: T, level: null }, { startAt: 'x', level: 'green' }, 'rác', 7], '2026-10-29'), 2);
  });
  q('thuần: các hàm thống kê không gọi Date.now()/new Date()', ['streak', 'monthGrid', 'week', 'monthCount', 'kickCountByDay'], () => {
    app.clock.reset();
    ST.streak(new Set(['2026-10-28']), '2026-10-29'); ST.monthGrid(2026, 10, {}, enabled, '2026-10-29'); ST.week({}, enabled, '2026-10-29');
    ST.monthCount({}, 2026, 10, enabled); ST.kickCountByDay([{ startAt: Date.UTC(2026, 9, 29), level: 'green' }], '2026-10-29');
    eq('thuần: các hàm thống kê không gọi Date.now()/new Date()', app.clock.calls, 0);
  });
  q('AC-106: kết quả thống kê chỉ là số/ngày — không có chữ "mất chuỗi", "thất bại"', ['streak', 'monthGrid', 'week'], () => {
    const s = fmt([ST.streak(new Set(['2026-10-01']), '2026-10-29'), ST.week({}, enabled, '2026-10-29'), ST.monthGrid(2026, 10, {}, enabled, '2026-10-29')]);
    H.ok('AC-106: kết quả thống kê chỉ là số/ngày — không có chữ "mất chuỗi", "thất bại"', !/mất chuỗi|thất bại|cố lên/i.test(s));
  });

  H.done();
}

/* ===== Nguyên văn các ca của FE-5 (chỉ đổi helper H → HD, eq → bộ ghi chung) ===== */
function feCases(ST, eq) {
  const HD = (day, marks) => ({ v: 1, day, marks, at: 0 });
  const set = arr => new Set(arr);

  /* ----- Ngày lịch ----- */
  eq('dayNum 1970-01-01 = 0', ST.dayNum('1970-01-01'), 0);
  eq('dayNum ngày không có thật → NaN', [ST.dayNum('2026-02-30'), ST.dayNum('2026-2-3'), ST.dayNum(''), ST.dayNum(null)].map(Number.isNaN), [true, true, true, true]);
  eq('addDays qua năm', ST.addDays('2026-12-31', 1), '2027-01-01');
  eq('addDays lùi qua tháng 3 năm nhuận', ST.addDays('2028-03-01', -1), '2028-02-29');
  eq('addDays tuần có DST châu Âu không lệch', ST.addDays('2026-03-28', 2), '2026-03-30');
  eq('weekdayMon0: 2026-10-26 là thứ Hai', ST.weekdayMon0('2026-10-26'), 0);
  eq('weekdayMon0: 2026-11-01 là Chủ nhật', ST.weekdayMon0('2026-11-01'), 6);
  eq('daysInMonth 2026-02 / 2028-02 / 2026-04 / 2026-10', [ST.daysInMonth(2026, 2), ST.daysInMonth(2028, 2), ST.daysInMonth(2026, 4), ST.daysInMonth(2026, 10)], [28, 29, 30, 31]);
  eq('dayKey 23:59 giờ VN / 00:00 giờ VN', [ST.dayKey(Date.UTC(2026, 9, 28, 16, 59)), ST.dayKey(Date.UTC(2026, 9, 28, 17, 0))], ['2026-10-28', '2026-10-29']);

  /* ----- Chuỗi ngày (AC-103) ----- */
  eq('streak rỗng', ST.streak(set([]), '2026-10-29'), { current: 0, longest: 0 });
  eq('streak hôm nay đã tick, 3 ngày liền', ST.streak(set(['2026-10-27', '2026-10-28', '2026-10-29']), '2026-10-29'), { current: 3, longest: 3 });
  eq('streak hôm nay CHƯA tick: tính tới hôm qua, chưa đứt', ST.streak(set(['2026-10-26', '2026-10-27', '2026-10-28']), '2026-10-29'), { current: 3, longest: 3 });
  eq('streak lỡ hôm qua → current 0, longest giữ', ST.streak(set(['2026-10-25', '2026-10-26', '2026-10-27']), '2026-10-29'), { current: 0, longest: 3 });
  eq('streak lỡ một ngày giữa chừng', ST.streak(set(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-25', '2026-10-28', '2026-10-29']), '2026-10-29'), { current: 2, longest: 4 });
  eq('streak qua tháng (30/09 → 01/10)', ST.streak(set(['2026-09-29', '2026-09-30', '2026-10-01']), '2026-10-01'), { current: 3, longest: 3 });
  eq('streak qua năm (30/12 → 01/01)', ST.streak(set(['2026-12-30', '2026-12-31', '2027-01-01']), '2027-01-01'), { current: 3, longest: 3 });
  eq('streak qua 29/02 năm nhuận', ST.streak(set(['2028-02-28', '2028-02-29', '2028-03-01']), '2028-03-01'), { current: 3, longest: 3 });
  eq('streak bỏ ngày tương lai và chuỗi hỏng', ST.streak(set(['2026-10-29', '2026-10-30', 'abc', '2026-02-30']), '2026-10-29'), { current: 1, longest: 1 });
  eq('streak nhận cả mảng', ST.streak(['2026-10-28', '2026-10-29'], '2026-10-29'), { current: 2, longest: 2 });
  // Qua nửa đêm giờ VN: lần tick lúc 23:59 VN và 00:01 VN thuộc hai ngày liền nhau
  const d1 = ST.dayKey(Date.UTC(2026, 9, 28, 16, 59)), d2 = ST.dayKey(Date.UTC(2026, 9, 28, 17, 1));
  eq('streak qua nửa đêm giờ VN = 2 ngày liền', ST.streak(set([d1, d2]), d2), { current: 2, longest: 2 });

  /* ----- markedDays, dayCount ----- */
  const days = {
    '2026-10-27': HD('2026-10-27', { thai_giao: 'x', water: 'x', breath: 'a' }),
    '2026-10-28': HD('2026-10-28', { thai_giao: 'a', water: '', side_sleep: 'x', move: 'x' }),
    '2026-10-29': HD('2026-10-29', { water: 'x' }),
    '2026-09-30': HD('2026-09-30', { thai_giao: 'x' }),
    '2026-10-01': HD('2026-10-01', { thai_giao: '', water: '' })
  };
  const enabled = ['kick', 'thai_giao', 'breath', 'water', 'side_sleep'];
  eq('markedDays thai_giao (x và a đều tính)', [...ST.markedDays(days, 'thai_giao')].sort(), ['2026-09-30', '2026-10-27', '2026-10-28']);
  eq('dayCount chỉ tính thói quen đang bật (move tắt)', ST.dayCount(days['2026-10-28'], enabled), 2);
  eq('dayCount nhận HabitDay hỏng', [ST.dayCount(null, enabled), ST.dayCount({ marks: 'x' }, enabled)], [0, 0]);
  eq('markedDays nhận mảng HabitDay', [...ST.markedDays(Object.values(days), 'water')].sort(), ['2026-10-27', '2026-10-29']);

  /* ----- Lịch tháng (AC-104) ----- */
  const g = ST.monthGrid(2026, 10, days, enabled, '2026-10-29');
  eq('monthGrid tháng 10 có 31 ô', g.length, 31);
  eq('monthGrid ô 27/10 = 3 việc', g[26], { day: '2026-10-27', n: 3, future: false, today: false });
  eq('monthGrid ô 28/10 = 2 (move đang tắt)', g[27].n, 2);
  eq('monthGrid hôm nay', g[28], { day: '2026-10-29', n: 1, future: false, today: true });
  eq('monthGrid ngày tương lai mờ', [g[29].future, g[30].future, g[30].n], [true, true, 0]);
  eq('monthGrid 01/10 tick rỗng = 0', g[0].n, 0);
  eq('monthGrid tháng 2/2026 = 28, tháng 2/2028 = 29, tháng 4 = 30', [ST.monthGrid(2026, 2, {}, enabled, '2026-10-29').length, ST.monthGrid(2028, 2, {}, enabled, '2026-10-29').length, ST.monthGrid(2026, 4, {}, enabled, '2026-10-29').length], [28, 29, 30]);
  eq('monthGrid tháng tương lai toàn ô mờ', ST.monthGrid(2026, 11, {}, enabled, '2026-10-29').every(c => c.future), true);
  eq('monthLead: 01/10/2026 thứ Năm → 3 ô trống; 01/02/2027 thứ Hai → 0; 01/11/2026 CN → 6', [ST.monthLead(2026, 10), ST.monthLead(2027, 2), ST.monthLead(2026, 11)], [3, 0, 6]);

  /* ----- "Tháng này chị đã làm {n} ngày" ----- */
  eq('monthCount tháng 10 (bỏ ngày tick rỗng)', ST.monthCount(days, 2026, 10, enabled), 3);
  eq('monthCount tháng 9', ST.monthCount(days, 2026, 9, enabled), 1);
  eq('monthCount không truyền danh sách: tính mọi mã', ST.monthCount({ '2026-10-05': HD('2026-10-05', { move: 'x' }) }, 2026, 10), 1);
  eq('monthCount có danh sách: move tắt thì không tính', ST.monthCount({ '2026-10-05': HD('2026-10-05', { move: 'x' }) }, 2026, 10, enabled), 0);
  eq('anyMarked', [ST.anyMarked(days, enabled), ST.anyMarked({}, enabled), ST.anyMarked({ '2026-10-01': HD('2026-10-01', { water: '' }) }, enabled)], [true, false, false]);

  /* ----- 7 ngày qua (AC-105) ----- */
  eq('last7 qua tháng', ST.last7('2026-10-03'), ['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']);
  eq('week: n/7 từng thói quen (30/09 nằm trong 7 ngày tới 03/10)', ST.week(days, ['thai_giao', 'water'], '2026-10-03'), [{ code: 'thai_giao', n: 1 }, { code: 'water', n: 0 }]);
  eq('week tới 29/10', ST.week(days, enabled, '2026-10-29'), [{ code: 'kick', n: 0 }, { code: 'thai_giao', n: 2 }, { code: 'breath', n: 1 }, { code: 'water', n: 2 }, { code: 'side_sleep', n: 1 }]);
  eq('week qua năm', ST.week({ '2026-12-31': HD('2026-12-31', { water: 'x' }), '2027-01-02': HD('2027-01-02', { water: 'a' }) }, ['water'], '2027-01-03'), [{ code: 'water', n: 2 }]);
  eq('week ngày ngoài 7 ngày không tính', ST.week({ '2026-10-22': HD('2026-10-22', { water: 'x' }) }, ['water'], '2026-10-29'), [{ code: 'water', n: 0 }]);

  /* ----- Số lượt đếm cử động thai theo ngày (chỉ green|red) ----- */
  const T0 = Date.UTC(2026, 9, 28, 17, 30); // 00:30 ngày 29/10 giờ VN (vẫn là 28/10 theo UTC)
  const sessions = [
    { startAt: T0, level: 'green' }, { startAt: T0 + 3600e3, level: 'red' }, { startAt: T0 + 7200e3, level: 'stopped' },
    { startAt: T0 + 9000e3, level: 'stopped_yellow' }, { startAt: Date.UTC(2026, 9, 28, 16, 0), level: 'green' }, null, { level: 'green' }
  ];
  eq('kickCountByDay 29/10 giờ VN: 2 lượt có mức (bỏ stopped)', ST.kickCountByDay(sessions, '2026-10-29'), 2);
  eq('kickCountByDay 28/10 giờ VN: lượt 23:00 VN', ST.kickCountByDay(sessions, '2026-10-28'), 1);
  eq('kickCountByDay danh sách hỏng', ST.kickCountByDay('x', '2026-10-29'), 0);

  /* ----- Tuần thai của một ngày (J01 nhóm theo tuần) ----- */
  eq('gaWeekOf: dự sinh 2027-01-21, ngày 2026-10-29 → 28 tuần 0 ngày', ST.gaWeekOf('2026-10-29', '2027-01-21'), { week: 28, days: 0, start: '2026-10-29', end: '2026-11-04' });
  eq('gaWeekOf: 28 tuần 3 ngày', ST.gaWeekOf('2026-11-01', '2027-01-21'), { week: 28, days: 3, start: '2026-10-29', end: '2026-11-04' });
  eq('gaWeekOf qua năm', ST.gaWeekOf('2027-01-01', '2027-01-01'), { week: 40, days: 0, start: '2027-01-01', end: '2027-01-07' });
  eq('gaWeekOf: thiếu ngày dự sinh / trước tuần 0 / quá 42 tuần → null', [ST.gaWeekOf('2026-10-29', null), ST.gaWeekOf('2026-01-01', '2027-01-21'), ST.gaWeekOf('2026-10-29', '2026-10-14')], [null, null, null]);

}
