/* =========================================================
   Unit test js/kick-rules.js – Mẹ Bầu An Yên (chủ: qa-tester, T-Q1).
   Nguồn ca: tech design mục 7.2, 7.6 (20 ca bắt buộc); đặc tả dem-cu-dong-thai-prd.md v1.0 R-01…R-17,
   K-AC-06, 09, 21…32, 37…39, 41…44, 47, 75; mục 5.4 (ô theo giờ VN).
   Giờ giả: mọi ca truyền `now` cố định; đồng hồ của vm đếm số lần Date.now()/new Date() để chứng minh
   hàm thuần KHÔNG tự lấy giờ. Cả bộ chạy lại dưới 4 múi giờ máy (Asia/Ho_Chi_Minh, America/Los_Angeles,
   Pacific/Kiritimati, UTC) và phải ra kết quả giống hệt (tech design 5.7.3 #14, PRD AC-131).
   Hàm nào chưa có → CHỜ (không xanh, không đỏ). Có FAIL → exit 1.
   Chạy: node tests/unit-kick.js
   ========================================================= */
'use strict';
const path = require('path');
const { createHarness, runInTimezones, rng, fmt } = require('./lib/harness');
const { loadApp, isStub } = require('./lib/load');

if (runInTimezones(__filename, 'unit-kick')) main();

function main() {
  const H = createHarness('unit-kick');
  const app = loadApp(['js/config.js', 'js/util.js', 'js/data.js', 'js/kick-rules.js']);
  const K = app.win.LSTP_KICK_RULES || {};
  const C = app.win.LSTP_CONFIG;
  const why = isStub('js/kick-rules.js') ? 'kick-rules.js còn stub (FE-4)' : 'chưa có hàm';
  const MIN = 60000, HR = 60 * MIN;
  // cfg đúng tech design 7.2, lấy từ config (số anh duyệt). Thêm MIN_TAP_GAP_MS cho acceptTap.
  const cfg = { HOUR_MS: C.KICK_HOUR_MIN * MIN, GREEN_MIN: C.KICK_GREEN_MIN_PER_HOUR, EXTRA_HOURS: C.KICK_EXTRA_HOURS_MAX,
    RED_MIN_TOTAL_2H: C.KICK_RED_MIN_TOTAL_2H, CELEBRATE_AT: C.KICK_CELEBRATE_AT, MIN_TAP_GAP_MS: C.KICK_MIN_TAP_GAP_MS };
  const T = Date.UTC(2026, 9, 29, 1, 5);        // 08:05 giờ VN ngày 29/10/2026
  const tapsAt = mins => mins.map(m => ({ t: Math.round(m * MIN), x: 0.5, y: 0.6 }));
  const sess = o => Object.assign({ v: 1, id: 'k000000000000000test', startAt: T, endAt: null, meal: null, taps: [], signs: [],
    motherReportedAt: null, doneAt: null, stoppedAt: null, feel: null }, o);
  const ev = (s, nowMin) => K.evaluate(s, T + Math.round(nowMin * MIN), cfg);
  const has = (...f) => H.has(K, ...f);
  const near = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;
  const LEVELS = ['pending', 'yellow', 'green', 'red', 'stopped', 'stopped_yellow'];

  /* ===== Bảng 7.6 (tech design) + K-AC-44 ===== */
  H.section('Bảng 7.6 – evaluate');
  const CASES = [];   // [tên, session, nowMin, kiểm(r) → [ok, chi tiết]] — dùng lại cho R-17
  const add = (name, s, nowMin, check) => CASES.push({ name, s, nowMin, check });
  add('#1 giờ 1 có 4 chạm, tới T+60 → green, needFeel, không celebrate (K-AC-23)', sess({ taps: tapsAt([5, 10, 20, 30]) }), 60,
    r => r.level === 'green' && r.needFeel === true && r.celebrate === false && r.hadYellow === false);
  add('#2 giờ 1 có 3, tới T+60 → yellow, phase h2, còn 60:00', sess({ taps: tapsAt([5, 10, 20]) }), 60,
    r => r.level === 'yellow' && r.phase === 'h2' && r.hour === 2 && near(r.remainingMs, 60 * MIN, 1000) && r.h2 === 0 && r.total === 3);
  add('#3 3 + 3, tới T+120 → red [h2_low, lt10_2h] (K-AC-28)', sess({ taps: tapsAt([5, 10, 20, 65, 80, 100]) }), 120,
    r => r.level === 'red' && fmt(r.reasons) === fmt(['h2_low', 'lt10_2h']));
  add('#4 3 + 6, tới T+120 → red [lt10_2h] (K-AC-29)', sess({ taps: tapsAt([5, 10, 20, 61, 70, 80, 90, 100, 110]) }), 120,
    r => r.level === 'red' && fmt(r.reasons) === fmt(['lt10_2h']));
  add('#5 3 + 7 trước T+120 → green, hadYellow, không celebrate (K-AC-30)', sess({ taps: tapsAt([5, 10, 20, 61, 66, 70, 75, 80, 90, 95]) }), 100,
    r => r.level === 'green' && r.hadYellow === true && r.celebrate === false && r.total === 10 && r.finalAt === T + 95 * MIN);
  add('#6 0 + 10 trước T+120 → green, hadYellow', sess({ taps: tapsAt([61, 63, 66, 70, 75, 80, 85, 90, 100, 110]) }), 115,
    r => r.level === 'green' && r.hadYellow === true && r.h1 === 0 && r.h2 === 10);
  add('#7a tự báo ở giờ 1 → red mother_reported (K-AC-31)', sess({ taps: tapsAt([5, 9]), motherReportedAt: T + 10 * MIN }), 11,
    r => r.level === 'red' && r.reasons.includes('mother_reported'));
  add('#7b tự báo ở giờ 2 → red mother_reported', sess({ taps: tapsAt([5, 9, 20, 65]), motherReportedAt: T + 70 * MIN }), 71,
    r => r.level === 'red' && r.reasons.includes('mother_reported'));
  add('#7c tự báo sau xanh, trước khi đóng màn → red', sess({ taps: tapsAt([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), motherReportedAt: T + 11 * MIN }), 12,
    r => r.level === 'red' && r.reasons.includes('mother_reported') && r.celebrate === false);
  add('#8 9 lần + tự báo → red (K-AC-32)', sess({ taps: tapsAt([1, 2, 3, 4, 5, 6, 7, 8, 9]), motherReportedAt: T + 12 * MIN }), 13,
    r => r.level === 'red' && r.reasons.includes('mother_reported'));
  add('#9 chạm thứ 10 lúc T+18 → green, celebrate, min10 = 18, finalAt = lúc chạm (K-AC-21)', sess({ taps: tapsAt([1, 2, 3, 4, 5, 6, 7, 8, 9, 18]) }), 18,
    r => r.level === 'green' && r.celebrate === true && r.min10 === 18 && r.min4 === 4 && r.finalAt === T + 18 * MIN);
  add('#10 5 lần + "Xong ✓" lúc T+25 → green, min4 = 12 (floor) (K-AC-22)', sess({ taps: tapsAt([3, 7, 9.5, 12.7, 20]), doneAt: T + 25 * MIN }), 25,
    r => r.level === 'green' && r.min4 === 12 && r.celebrate === false && r.finalAt === T + 25 * MIN);
  add('#11 feel "different" sau đủ 10 → red, không celebrate (K-AC-24)', sess({ taps: tapsAt([1, 2, 3, 4, 5, 6, 7, 8, 9, 18]), feel: 'different' }), 20,
    r => r.level === 'red' && r.celebrate === false && r.reasons.includes('mother_reported'));
  add('#12 có signs → red, danger_sign đứng đầu (K-AC-33)', sess({ signs: ['bleeding', 'headache'] }), 0,
    r => r.level === 'red' && r.reasons[0] === 'danger_sign');
  add('#13 mở lại T+70 với 2 lần → yellow, còn 50:00 ±1 s (K-AC-37)', sess({ taps: tapsAt([10, 30]) }), 70,
    r => r.level === 'yellow' && r.hour === 2 && near(r.remainingMs, 50 * MIN, 1000));
  add('#14 mở lại T+3h với 2 lần → red cả hai lý do (K-AC-38)', sess({ taps: tapsAt([10, 30]) }), 180,
    r => r.level === 'red' && r.reasons.includes('h2_low') && r.reasons.includes('lt10_2h'));
  add('#15 giờ 1 có 5, mở lại T+90 → green, không sang giờ 2, needFeel (K-AC-39)', sess({ taps: tapsAt([5, 10, 20, 30, 40]) }), 90,
    r => r.level === 'green' && r.phase !== 'h2' && r.h2 === 0 && r.needFeel === true);
  add('#16a dừng lúc T+20 với 2 → stopped (K-AC-41)', sess({ taps: tapsAt([5, 10]), stoppedAt: T + 20 * MIN }), 21,
    r => r.level === 'stopped' && r.reasons.length === 0);
  add('#16b dừng ở giờ 2 (sau vàng) → stopped_yellow (K-AC-42)', sess({ taps: tapsAt([5, 10, 20, 65]), stoppedAt: T + 70 * MIN }), 71,
    r => r.level === 'stopped_yellow' && r.hadYellow === true);
  add('thêm: giờ 1 có 2 lúc T+10 → pending, còn 50:00', sess({ taps: tapsAt([5, 9]) }), 10,
    r => r.level === 'pending' && r.phase === 'h1' && r.hour === 1 && near(r.remainingMs, 50 * MIN, 1000));
  add('thêm: 4 lần lúc T+30 chưa bấm Xong → vẫn pending (R-02 chỉ xác định khi 10 / Xong / T+60)', sess({ taps: tapsAt([5, 10, 20, 25]) }), 30,
    r => r.level === 'pending' && r.needFeel === false);
  add('thêm K-AC-06: bắt đầu 8:05, 2 lần, mở lại 8:40 → giờ 1 còn 25:00', sess({ taps: tapsAt([5, 15]) }), 35,
    r => r.hour === 1 && near(r.remainingMs, 25 * MIN, 1000) && r.h1 === 2);
  add('thêm: chạm đúng mốc T+60 tính cho giờ 2 (h1: t < HOUR_MS)', sess({ taps: tapsAt([5, 10, 20, 60]) }), 61,
    r => r.level === 'yellow' && r.h1 === 3 && r.h2 === 1 && r.total === 4);
  add('thêm K-AC-43: dấu hiệu + tự báo → đủ hai lý do, danger_sign trước mother_reported', sess({ signs: ['bleeding'], motherReportedAt: T + 1 * MIN }), 2,
    r => r.level === 'red' && r.reasons[0] === 'danger_sign' && r.reasons.includes('mother_reported'));
  add('thêm: signs có no_movement → red mother_reported (DANGER_SIGNS dòng 5 = R-06)', sess({ signs: ['no_movement'] }), 0,
    r => r.level === 'red' && r.reasons.includes('mother_reported'));
  add('thêm: feel "same" sau xanh → green, needFeel=false', sess({ taps: tapsAt([5, 10, 20, 30]), feel: 'same' }), 60,
    r => r.level === 'green' && r.needFeel === false);
  add('thêm: dừng ở giờ 1 khi đã ≥ 4 = như "Xong ✓" (tech design K-13)', sess({ taps: tapsAt([5, 10, 20, 30]), stoppedAt: T + 35 * MIN }), 36,
    r => r.level === 'green');

  for (const c of CASES) {
    if (!has('evaluate')) { H.wait(c.name, why); continue; }
    H.run(c.name, () => {
      app.clock.reset();
      const before = JSON.stringify(c.s);
      const r = ev(c.s, c.nowMin);
      const ok = !!r && c.check(r);
      H.ok(c.name, ok, fmt(r && { level: r.level, phase: r.phase, hour: r.hour, remainingMs: r.remainingMs, h1: r.h1, h2: r.h2, total: r.total, min4: r.min4, min10: r.min10, hadYellow: r.hadYellow, celebrate: r.celebrate, needFeel: r.needFeel, reasons: r.reasons, finalAt: r.finalAt && (r.finalAt - T) / MIN }));
      c.r = r;
      c.mutated = JSON.stringify(c.s) !== before;
      c.calls = app.clock.calls;
    });
  }
  if (has('evaluate')) {
    H.ok('evaluate không đổi session đầu vào (hàm thuần)', CASES.every(c => !c.mutated), CASES.filter(c => c.mutated).map(c => c.name).join(' | '));
    H.ok('evaluate không gọi Date.now()/new Date() (nhận now qua tham số)', CASES.every(c => c.calls === 0), CASES.filter(c => c.calls).map(c => c.name + ':' + c.calls).join(' | '));
    H.ok('mọi kết quả có total = h1 + h2 và level trong danh sách', CASES.every(c => c.r && c.r.total === c.r.h1 + c.r.h2 && LEVELS.includes(c.r.level)));
  } else ['evaluate không đổi session đầu vào (hàm thuần)', 'evaluate không gọi Date.now()/new Date() (nhận now qua tham số)', 'mọi kết quả có total = h1 + h2 và level trong danh sách'].forEach(n => H.wait(n, why));

  /* #17 Đã đỏ thì thêm chạm không đổi gì (K-AC-43) */
  H.section('#17 đã đỏ, thêm chạm');
  const n17a = '#17a đỏ theo giờ (3+3 ở T+120), thêm chạm T+125 → vẫn red, total 6';
  const n17b = '#17b đỏ do tự báo T+10 (2 lần), thêm chạm T+15 → vẫn red, h1 vẫn 2';
  if (has('evaluate')) {
    H.run(n17a, () => { const r = ev(sess({ taps: tapsAt([5, 10, 20, 65, 80, 100, 125]) }), 126); H.ok(n17a, r.level === 'red' && r.total === 6, fmt(r)); });
    H.run(n17b, () => { const r = ev(sess({ taps: tapsAt([5, 9, 15]), motherReportedAt: T + 10 * MIN }), 16); H.ok(n17b, r.level === 'red' && r.h1 === 2, fmt(r)); });
  } else { H.wait(n17a, why); H.wait(n17b, why); }

  /* #18 acceptTap 799 / 800 ms (K-AC-09) */
  H.section('#18 acceptTap');
  const n18 = ['#18 acceptTap 799 ms → từ chối', '#18 acceptTap 800 ms → nhận', 'acceptTap lần đầu (chưa có lần trước) → nhận'];
  if (has('acceptTap')) {
    H.eq(n18[0], K.acceptTap(10000, 10799, cfg), false);
    H.eq(n18[1], K.acceptTap(10000, 10800, cfg), true);
    H.eq(n18[2], K.acceptTap(null, 10800, cfg), true);
  } else n18.forEach(n => H.wait(n, why));

  /* #19 slotOf theo giờ VN (mục 5.4) — chạy dưới mọi múi giờ máy */
  H.section('#19 slotOf');
  const vn = (h, m) => Date.UTC(2026, 9, 29, h - 7, m);   // h:m giờ VN
  const n19 = '#19 slotOf(null, 10:59/11:00/16:59/17:00 giờ VN) → morning/noon/noon/evening';
  const n19b = 'slotOf theo bữa: breakfast/lunch/dinner/other → morning/noon/evening/other (K-AC-04)';
  const n19c = 'slotOf(null, 00:30 giờ VN = 17:30 UTC hôm trước) → morning';
  if (has('slotOf')) {
    H.eq(n19, [vn(10, 59), vn(11, 0), vn(16, 59), vn(17, 0)].map(ms => K.slotOf(null, ms, 420)), ['morning', 'noon', 'noon', 'evening']);
    H.eq(n19b, ['breakfast', 'lunch', 'dinner', 'other'].map(m => K.slotOf(m, vn(20, 0), 420)), ['morning', 'noon', 'evening', 'other']);
    H.eq(n19c, K.slotOf(null, Date.UTC(2026, 9, 28, 17, 30), 420), 'morning');
  } else [n19, n19b, n19c].forEach(n => H.wait(n, why));

  /* #20 1.000 phiên ngẫu nhiên: bất biến */
  H.section('#20 1.000 phiên ngẫu nhiên');
  const n20 = ['#20 level luôn trong danh sách', '#20 total = h1 + h2 ở mọi lần tính', '#20 đã đỏ thì mọi lần tính sau vẫn đỏ (không bao giờ xanh/vàng sau đỏ)', '#20 total không vượt số chạm đã ghi'];
  if (has('evaluate')) {
    const rand = rng(20261029);
    let badLevel = [], badSum = [], afterRed = [], over = [];
    for (let i = 0; i < 1000; i++) {
      const n = Math.floor(rand() * 16);
      const ts = Array.from({ length: n }, () => Math.floor(rand() * 150 * MIN)).sort((a, b) => a - b);
      const s = sess({ taps: ts.map(t => ({ t, x: rand() < 0.2 ? null : Math.round(rand() * 1000) / 1000, y: null })).map(p => (p.x === null ? { t: p.t, x: null, y: null } : { t: p.t, x: p.x, y: 0.5 })) });
      if (rand() < 0.15) s.motherReportedAt = T + Math.floor(rand() * 150 * MIN);
      if (rand() < 0.15) s.doneAt = T + Math.floor(rand() * 60 * MIN);
      if (rand() < 0.15) s.stoppedAt = T + Math.floor(rand() * 120 * MIN);
      if (rand() < 0.05) s.signs = ['pain'];
      if (rand() < 0.2) s.feel = ['same', 'different', 'skipped'][Math.floor(rand() * 3)];
      const nows = Array.from({ length: 8 }, () => Math.floor(rand() * 200 * MIN)).sort((a, b) => a - b);
      let red = false;
      for (const t of nows) {
        const r = K.evaluate(s, T + t, cfg);
        if (!LEVELS.includes(r.level)) badLevel.push(i);
        if (r.total !== r.h1 + r.h2) badSum.push(i);
        if (r.total > s.taps.length) over.push(i);
        if (red && r.level !== 'red') afterRed.push(i + ':' + (t / MIN).toFixed(0) + ':' + r.level);
        if (r.level === 'red') red = true;
      }
    }
    H.ok(n20[0], !badLevel.length, badLevel.slice(0, 10).join(','));
    H.ok(n20[1], !badSum.length, badSum.slice(0, 10).join(','));
    H.ok(n20[2], !afterRed.length, afterRed.slice(0, 10).join(','));
    H.ok(n20[3], !over.length, over.slice(0, 10).join(','));
  } else n20.forEach(n => H.wait(n, why));

  /* R-17 / K-AC-75: tuần thai không bao giờ đổi kết quả */
  H.section('R-17 / K-AC-75 gaDays');
  const n75 = 'K-AC-75: chạy lại mọi ca bảng 7.6 với gaDays = null/150/195/196/280/290/294 → kết quả giống hệt';
  if (has('evaluate')) {
    const diff = [];
    for (const c of CASES) {
      const base = fmt(ev(c.s, c.nowMin));
      for (const g of [null, 150, 195, 196, 280, 290, 294]) {
        const r = fmt(ev(Object.assign({}, c.s, { gaDays: g, edd: '2027-02-05' }), c.nowMin));
        if (r !== base) diff.push(c.name + ' gaDays=' + g);
      }
    }
    H.ok(n75, !diff.length, diff.slice(0, 5).join(' | '));
    const src = require('fs').readFileSync(path.join(__dirname, '..', 'js', 'kick-rules.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
    // Thân evaluate + timeline (từ "function timeline"/"function evaluate" tới hàm kế tiếp ở cùng mức thụt lề)
    const bodies = ['timeline', 'evaluate'].map(n => { const m = new RegExp('function ' + n + '\\s*\\([\\s\\S]*?\\n  \\}\\n').exec(src); return m ? m[0] : ''; });
    const nSrc = 'K-AC-75: thân evaluate/timeline (bỏ comment) không đọc gaDays, edd, gestAge';
    if (!bodies[1]) H.ok(nSrc, false, 'không tách được thân function evaluate để kiểm');
    else H.ok(nSrc, !bodies.some(b => /\bgaDays\b|\bedd\b|gestAge/.test(b)), 'thấy gaDays/edd/gestAge trong evaluate/timeline');
  } else { H.wait(n75, why); H.wait('K-AC-75: thân evaluate/timeline (bỏ comment) không đọc gaDays, edd, gestAge', why); }

  /* Vùng chạm M-173, zones (K-AC-47) */
  H.section('zoneOf / zones');
  const nz = ['zoneOf: 4 góc + giữa → 5 vùng khác nhau', 'zoneOf(null, null) → không vùng (bấm nút)', 'zones: vùng nhiều nhất đúng', 'zones: hòa thì nêu cả hai vùng', 'zones: đếm lần bấm nút (không vị trí) riêng (M-176)'];
  if (has('zoneOf', 'zones')) {
    const z5 = [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9], [0.5, 0.5]].map(([x, y]) => K.zoneOf(x, y));
    H.ok(nz[0], new Set(z5).size === 5 && z5.every(z => typeof z === 'string' && z), fmt(z5));
    H.ok(nz[1], K.zoneOf(null, null) == null, fmt(K.zoneOf(null, null)));
    const tl = K.zoneOf(0.1, 0.1), br = K.zoneOf(0.9, 0.9);
    const r1 = K.zones([{ t: 1, x: 0.1, y: 0.1 }, { t: 2, x: 0.15, y: 0.2 }, { t: 3, x: 0.9, y: 0.9 }, { t: 4, x: null, y: null }]);
    const top = r1 && (r1.top || r1.most || r1.max);
    H.ok(nz[2], Array.isArray(top) ? top.length === 1 && top[0] === tl : top === tl, fmt(r1));
    const r2 = K.zones([{ t: 1, x: 0.1, y: 0.1 }, { t: 2, x: 0.9, y: 0.9 }]);
    const top2 = r2 && (r2.top || r2.most || r2.max);
    H.ok(nz[3], Array.isArray(top2) && top2.length === 2 && top2.includes(tl) && top2.includes(br), fmt(r2));
    H.ok(nz[4], r1 && (r1.noPos === 1 || r1.noPosition === 1 || r1.buttons === 1), fmt(r1));
  } else nz.forEach(n => H.wait(n, why));

  /* daySummary (K-AC-03, 47) */
  H.section('daySummary');
  const nd = ['daySummary: lượt sau ăn trưa vào ô Trưa', 'daySummary: lượt không chọn bữa lúc 18:00 VN vào ô Tối', 'daySummary: lượt 23:30 VN ngày 28 không lẫn sang ngày 29', 'daySummary: cộng số lần trong ngày (28/10: 10 + 7 + 5 = 22, K-AC-47)'];
  if (has('daySummary')) {
    const s1 = sess({ id: 'a0000000000000000001', meal: 'lunch', startAt: vn(12, 30), level: 'green', total: 7 });
    const s2 = sess({ id: 'a0000000000000000002', meal: null, startAt: vn(18, 0), level: 'green', total: 5 });
    const s3 = sess({ id: 'a0000000000000000003', meal: null, startAt: Date.UTC(2026, 9, 28, 16, 30), level: 'green', total: 4 });
    const r = K.daySummary([s1, s2, s3], '2026-10-29', 420);
    const inSlot = (res, slot, id) => res && Array.isArray(res[slot]) && res[slot].some(x => x && x.id === id);
    H.ok(nd[0], inSlot(r, 'noon', s1.id), fmt(r));
    H.ok(nd[1], inSlot(r, 'evening', s2.id), fmt(r));
    H.ok(nd[2], !['morning', 'noon', 'evening', 'other'].some(k => inSlot(r, k, s3.id)), fmt(r));
    const d28 = [10, 7, 5].map((n, i) => sess({ id: 'b000000000000000000' + i, startAt: Date.UTC(2026, 9, 28, 1 + i * 4), level: 'green', total: n }));
    const r28 = K.daySummary(d28, '2026-10-28', 420);
    H.eq(nd[3], r28 && r28.total, 22);
  } else nd.forEach(n => H.wait(n, why));

  /* Không tự lấy giờ ở các hàm phụ */
  H.section('thuần');
  const np = 'acceptTap/slotOf/zones/daySummary không gọi Date.now()/new Date()';
  if (has('acceptTap', 'slotOf', 'zones', 'daySummary')) {
    app.clock.reset();
    K.acceptTap(1, 2000, cfg); K.slotOf(null, T, 420); K.zones([{ t: 1, x: 0.2, y: 0.2 }]); K.daySummary([sess({})], '2026-10-29', 420);
    H.eq(np, app.clock.calls, 0);
  } else H.wait(np, why);

  H.done();
}
