/* =========================================================
   Unit test js/store.js – Mẹ Bầu An Yên (chủ: qa-tester, T-Q1).
   Nguồn ca: tech design 5.3 (bảng khóa lstp_ đầy đủ), 5.4 (ba chế độ), 5.5 (interface), 5.6 (xuất/xóa), 14.1;
   PRD AC-11, 13, 15, 16, 17, 70, 71, 80, 127, 136, 137; đặc tả mục đếm K-AC-51, 52, 56, 57, 73.
   Web Storage giả (tests/lib/load.js): đếm clear(), giả lập trình duyệt chặn lưu. Đồng hồ giả.
   Hàm chưa có → CHỜ. Có FAIL → exit 1.
   Chạy: node tests/unit-store.js
   ========================================================= */
'use strict';
const { createHarness, fmt } = require('./lib/harness');
const { loadApp, FakeStorage } = require('./lib/load');

const H = createHarness('unit-store');
const FILES = ['js/config.js', 'js/util.js', 'js/data.js', 'js/store.js'];
const NOW = Date.UTC(2026, 9, 29, 1, 0);         // 08:00 giờ VN 29/10/2026
const TODAY = '2026-10-29';
const ALLOWED = ['lstp_v1_local', 'lstp_v1_checkins', 'lstp_v1_thaigiao', 'lstp_v1_letters', 'lstp_v1_habits', 'lstp_v1_prefs', 'lstp_profile',
  'lstp_kick_sessions', 'lstp_kick_active', 'lstp_kick_prefs', 'lstp_v1_session', 'lstp_v1_pending', 'lstp_v1_acct', 'lstp_kick_acct_sessions'];
const FOREIGN_LOCAL = { myJourneys: '[{"a":1}]', user_0900000000: '{"x":1}', musicMuted: 'true', checkin_me_bau_pending: '[1,2]', stop4p_voice: 'on', pendingCheckins: '[]', user_0912345678: 'u' };
const FOREIGN_SESSION = { stop4p_active: 'abc', tlad_token: 't' };
const XSS = '<img src=x onerror=window.__xss=1>';
const fresh = opts => loadApp(FILES, Object.assign({ now: NOW }, opts || {}));
const why = 'store.js chưa có hàm (FE-1)';
const keysOf = st => Object.keys(st);
const kickSess = (id, o) => Object.assign({ v: 1, id, startAt: NOW, endAt: null, meal: 'lunch', taps: [{ t: 60000, x: 0.4123, y: 0.6 }, { t: 120000, x: null, y: null }],
  signs: [], motherReportedAt: null, doneAt: NOW + 25 * 60000, stoppedAt: null, feel: 'same', level: 'green', hadYellow: false, reasons: [], h1: 2, h2: 0, total: 2, min4: null, min10: null }, o || {});

function withS(names, name, fn) {
  const app = fresh();
  const S = app.win.LSTP_STORE || {};
  if (!H.has(S, ...names)) { H.wait(name, why); return; }
  H.run(name, () => fn(app, S));
}
const seedForeign = app => { Object.entries(FOREIGN_LOCAL).forEach(([k, v]) => app.local.setItem(k, v)); Object.entries(FOREIGN_SESSION).forEach(([k, v]) => app.session.setItem(k, v)); };
const foreignIntact = app => Object.entries(FOREIGN_LOCAL).every(([k, v]) => app.local.getItem(k) === v) && Object.entries(FOREIGN_SESSION).every(([k, v]) => app.session.getItem(k) === v);

/* ===== Lớp an toàn ===== */
H.section('lớp an toàn, nhận chế độ');
withS(['detectMode'], 'raw: khóa không có tiền tố lstp_ → ném lỗi (không bao giờ đụng khóa app khác)', (app, S) => {
  let threw = 0;
  for (const k of ['myJourneys', 'musicMuted', 'stop4p_voice', '', null]) { try { S.raw.set('local', k, 'x'); } catch (e) { threw++; } }
  H.ok('raw: khóa không có tiền tố lstp_ → ném lỗi (không bao giờ đụng khóa app khác)', threw === 5 && keysOf(app.local).length === 0, 'ném ' + threw + '/5; khóa: ' + keysOf(app.local));
});
withS(['detectMode'], 'mở app (nạp store + detectMode) không ghi khóa nào (AC-13: không ghi khóa thăm dò)', (app, S) => {
  S.detectMode();
  H.ok('mở app (nạp store + detectMode) không ghi khóa nào (AC-13: không ghi khóa thăm dò)', keysOf(app.local).length === 0 && keysOf(app.session).length === 0 && !app.local.log.some(x => x[0] === 'set'), fmt(app.local.log));
});
withS(['detectMode'], 'detectMode: máy trống → null (về màn chào)', (app, S) => H.eq('detectMode: máy trống → null (về màn chào)', S.detectMode(), null));
withS(['detectMode'], 'detectMode: chỉ có lstp_kick_active trong sessionStorage → none (tải lại giữa lượt đếm, R-09)', (app, S) => {
  app.session.setItem('lstp_kick_active', JSON.stringify(kickSess('k0000000000000000001')));
  H.eq('detectMode: chỉ có lstp_kick_active trong sessionStorage → none (tải lại giữa lượt đếm, R-09)', S.detectMode(), 'none');
});
withS(['detectMode', 'startLocal'], 'detectMode: có lstp_v1_local hợp lệ → local (AC-18)', (app, S) => {
  S.startLocal({ writing: false });
  const app2 = fresh({ local: app.local });
  H.eq('detectMode: có lstp_v1_local hợp lệ → local (AC-18)', app2.win.LSTP_STORE.detectMode(), 'local');
});
withS(['detectMode'], 'detectMode: lstp_v1_local hỏng (chuỗi rác) → không ném lỗi, không coi là local', (app, S) => {
  app.local.setItem('lstp_v1_local', '{rác' + XSS);
  let r; try { r = S.detectMode(); } catch (e) { r = 'NÉM: ' + e.message; }
  H.ok('detectMode: lstp_v1_local hỏng (chuỗi rác) → không ném lỗi, không coi là local', r !== 'local' && !String(r).startsWith('NÉM'), r);
});
{
  const name = 'trình duyệt chặn đọc storage (SecurityError) → detectMode không ném lỗi';
  const app = fresh({ localOpts: { blockGet: true }, sessionOpts: { blockGet: true } });
  const S = app.win.LSTP_STORE || {};
  if (!H.has(S, 'detectMode')) H.wait(name, why);
  else { let ok = true; try { S.detectMode(); } catch (e) { ok = false; } H.ok(name, ok); }
}

/* ===== AC-11, AC-80, AC-137: "Không lưu gì" ===== */
H.section('chế độ none (AC-11, 80, 137)');
const n11 = 'AC-11/AC-80: none + check-in, thai giáo, thói quen, lời nhắn, ngày dự sinh, lượt đếm → localStorage không có khóa; sessionStorage chỉ lstp_kick_*';
withS(['startNone', 'checkins', 'thaigiao', 'habits', 'letters', 'profile', 'kick'], n11, (app, S) => {
  S.startNone();
  S.checkins.add({ emotions: ['worried'], before: 5, note: 'Sáng nay đi khám về, mình hơi lo' });
  S.thaigiao.mark(TODAY, 'TG-05', 'done');
  S.habits.setMark(TODAY, 'water', 'x');
  const L = S.letters.add({ day: TODAY, prompt: 'TG-01', text: 'Con yêu ơi' });
  S.profile.set('2027-02-05');
  S.kick.setActive(kickSess('k0000000000000000001'));
  S.kick.save(kickSess('k0000000000000000002'));
  const sk = keysOf(app.session);
  H.ok(n11, keysOf(app.local).length === 0 && sk.every(k => k.startsWith('lstp_kick_')) && sk.length >= 1 && L == null,
    'local: ' + keysOf(app.local) + ' · session: ' + sk + ' · letters.add → ' + fmt(L));
});
const n137 = 'AC-137: none → ngày dự sinh chỉ ở bộ nhớ (get() trả lại được, không ghi khóa)';
withS(['startNone', 'profile'], n137, (app, S) => {
  S.startNone();
  const code = S.profile.set('2027-02-05');
  const p = S.profile.get();
  H.ok(n137, code === 'ok' && p && p.edd === '2027-02-05' && keysOf(app.local).length === 0 && keysOf(app.session).length === 0, fmt([code, p, keysOf(app.local), keysOf(app.session)]));
});
const n11b = 'AC-11: none → "đóng tab rồi mở lại" (sessionStorage mới) → detectMode null, A09 hỏi lại (asked false)';
withS(['startNone', 'profile', 'detectMode'], n11b, (app, S) => {
  S.startNone(); S.profile.markAsked();
  const app2 = fresh({ local: app.local });                 // tab mới: localStorage giữ, sessionStorage mới
  const S2 = app2.win.LSTP_STORE;
  H.ok(n11b, S2.detectMode() === null && S2.profile.asked() === false, fmt([S2.detectMode(), S2.profile.asked()]));
});
const n80 = 'AC-80/K-AC-52: none → lượt đếm dở và lượt đã xong nằm ở sessionStorage (lstp_kick_active, lstp_kick_sessions)';
withS(['startNone', 'kick'], n80, (app, S) => {
  S.startNone();
  S.kick.setActive(kickSess('k0000000000000000003'));
  S.kick.save(kickSess('k0000000000000000004'));
  H.ok(n80, app.session.getItem('lstp_kick_active') != null && app.session.getItem('lstp_kick_sessions') != null && S.kick.list().length === 1, fmt(keysOf(app.session)));
});

/* ===== AC-15, AC-71, K-AC-56: khóa của app khác ===== */
H.section('khóa lstp_ và khóa của app khác (AC-15, 71, K-AC-56)');
const n15 = 'AC-15: lưu trên máy + dùng mọi API → mọi khóa app tạo có tiền tố lstp_ và nằm trong bảng 5.3';
const n71 = 'AC-71: clearAllLocal → mọi khóa lstp_ ở cả local và session mất, khóa của app khác còn nguyên giá trị, không clear()';
const n56 = 'K-AC-56: kick.clearAll → chỉ lstp_kick_* mất; lstp_v1_* và khóa app khác còn nguyên';
withS(['startLocal', 'checkins', 'thaigiao', 'letters', 'habits', 'kick', 'profile', 'prefs', 'clearAllLocal'], n15, (app, S) => {
  seedForeign(app);
  S.startLocal({ writing: true });
  S.checkins.add({ emotions: ['tired'], before: 6, note: 'mệt' });
  S.thaigiao.mark(TODAY, 'TG-02', 'done');
  S.letters.add({ day: TODAY, prompt: 'TG-02', text: 'Mẹ thương con' });
  S.habits.setMark(TODAY, 'breath', 'a'); S.habits.setPrefs(['kick', 'water']);
  S.kick.setActive(kickSess('k0000000000000000005')); S.kick.save(kickSess('k0000000000000000006')); S.kick.setPrefs({ sound: false });
  S.profile.set('2027-02-05'); S.prefs.set({ sound: false });
  const mine = [...keysOf(app.local), ...keysOf(app.session)].filter(k => !(k in FOREIGN_LOCAL) && !(k in FOREIGN_SESSION));
  H.ok(n15, mine.length >= 8 && mine.every(k => ALLOWED.includes(k)), 'khóa: ' + mine.join(', '));
  // K-AC-56 trước, rồi xóa toàn bộ
  S.kick.clearAll();
  const left = keysOf(app.local);
  H.ok(n56, !left.some(k => k.startsWith('lstp_kick_')) && left.includes('lstp_v1_checkins') && left.includes('lstp_v1_local') && foreignIntact(app), 'còn: ' + left.join(', '));
  S.clearAllLocal();
  const rest = [...keysOf(app.local), ...keysOf(app.session)];
  H.ok(n71, !rest.some(k => k.startsWith('lstp_')) && foreignIntact(app) && app.local.clearCalls === 0 && app.session.clearCalls === 0 && S.mode() == null,
    fmt({ rest, clear: [app.local.clearCalls, app.session.clearCalls], mode: S.mode() }));
});
if (!H.results.some(r => r.name.endsWith(n56))) { H.wait(n56, why); H.wait(n71, why); }

/* ===== AC-13, 14, 16, 17: đồng ý tách riêng ===== */
H.section('đồng ý (AC-13, 14, 16, 17)');
const n16 = 'AC-16: lưu hành trình nhưng KHÔNG lưu chữ tự viết → letters.add không ghi chữ xuống máy; mốc thai giáo vẫn lưu';
withS(['startLocal', 'letters', 'thaigiao'], n16, (app, S) => {
  S.startLocal({ writing: false });
  const r = S.letters.add({ day: TODAY, prompt: 'TG-05', text: 'BÍ MẬT-lời nhắn-123' });
  S.thaigiao.mark(TODAY, 'TG-05', 'done');
  const blob = JSON.stringify(app.local.dump());
  H.ok(n16, r == null && !blob.includes('BÍ MẬT-lời nhắn-123') && S.thaigiao.list().length === 1 && app.local.getItem('lstp_v1_thaigiao') != null, fmt([r, blob.slice(0, 200)]));
});
const n16b = 'AC-116/5.2: không đồng ý chữ tự viết → "kể thêm" của check-in không nằm trên máy, phần còn lại vẫn lưu';
withS(['startLocal', 'checkins'], n16b, (app, S) => {
  S.startLocal({ writing: false });
  S.checkins.add({ emotions: ['worried'], before: 7, note: 'KỂ-THÊM-XYZ' });
  const blob = JSON.stringify(app.local.dump());
  const l = S.checkins.list();
  H.ok(n16b, !blob.includes('KỂ-THÊM-XYZ') && l.length === 1 && l[0].before === 7 && !l[0].note, fmt(l));
});
const n68 = 'AC-68: đồng ý chữ tự viết → lời nhắn được cất, Hộp thư liệt kê mới nhất trước';
withS(['startLocal', 'letters'], n68, (app, S) => {
  S.startLocal({ writing: true });
  S.letters.add({ day: '2026-10-28', prompt: 'TG-01', text: 'lá thứ nhất' });
  app.clock.add(60000);
  S.letters.add({ day: TODAY, prompt: 'TG-02', text: 'lá thứ hai' });
  const l = S.letters.list();
  H.ok(n68, l.length === 2 && l[0].text === 'lá thứ hai' && l[1].prompt === 'TG-01', fmt(l));
});
const n17 = 'AC-17: tắt "Lưu cả những gì chị tự viết" → "Giữ" thì lá cũ còn, lá mới không lưu; "Xóa luôn" (dropWriting) thì hết chữ';
withS(['startLocal', 'setLocalConsent', 'letters', 'dropWriting'], n17, (app, S) => {
  S.startLocal({ writing: true });
  S.letters.add({ day: TODAY, text: 'lá cũ' });
  S.setLocalConsent({ journey: true, writing: false });
  const added = S.letters.add({ day: TODAY, text: 'lá mới' });
  const keep = S.letters.list().length;
  S.dropWriting();
  H.ok(n17, added == null && keep === 1 && S.letters.list().length === 0 && !JSON.stringify(app.local.dump()).includes('lá cũ'), fmt([added, keep, S.letters.list()]));
});
const n14 = 'AC-14: bỏ "Lưu hành trình" → setLocalConsent({journey:false}) không ghi gì';
withS(['setLocalConsent'], n14, (app, S) => {
  const r = S.setLocalConsent({ journey: false, writing: false });
  H.ok(n14, !r && keysOf(app.local).length === 0, fmt([r, keysOf(app.local)]));
});
const nBlk = 'A.23: trình duyệt chặn lưu → startLocal trả false, không ném lỗi, không vào chế độ local';
{
  const app = fresh({ localOpts: { blockSet: true } });
  const S = app.win.LSTP_STORE || {};
  if (!H.has(S, 'startLocal')) H.wait(nBlk, why);
  else H.run(nBlk, () => { const r = S.startLocal({ writing: false }); H.ok(nBlk, r === false && S.mode() !== 'local', fmt([r, S.mode()])); });
}

/* ===== K-AC-57, AC-124: dữ liệu đọc lại không tin được ===== */
H.section('dữ liệu hỏng / XSS (K-AC-57)');
const n57a = 'K-AC-57: lstp_kick_sessions là chuỗi hỏng → kick.list() trả [] không ném lỗi, báo bad_data (M-205) một lần';
withS(['startLocal', 'kick', 'onChange'], n57a, (app, S) => {
  S.startLocal({ writing: false });
  const evs = []; S.onChange(e => evs.push(e && e.type));
  app.local.setItem('lstp_kick_sessions', '{hỏng' + XSS);
  let l; try { l = S.kick.list(); S.kick.list(); } catch (e) { l = 'NÉM ' + e.message; }
  H.ok(n57a, Array.isArray(l) && l.length === 0 && evs.filter(t => t === 'bad_data').length === 1, fmt([l, evs]));
});
const n57b = 'K-AC-57: bản ghi có <img onerror> ở trường mã (meal, level, id, signs) bị bỏ, bản ghi đúng giữ lại, window.__xss không đặt';
withS(['startLocal', 'kick'], n57b, (app, S) => {
  S.startLocal({ writing: false });
  const good = kickSess('k0000000000000000010');
  const bad = [kickSess('k0000000000000000011', { meal: XSS }), kickSess('k0000000000000000012', { level: XSS }), kickSess(XSS), kickSess('k0000000000000000013', { signs: [XSS] }),
    kickSess('k0000000000000000014', { taps: [{ t: 1, x: 5, y: 0.2 }] }), kickSess('k0000000000000000015', { taps: [{ t: 1, x: '0.5', y: 0.2 }] }), null, 'chuỗi', 42];
  app.local.setItem('lstp_kick_sessions', JSON.stringify([good, ...bad]));
  const l = S.kick.list();
  H.ok(n57b, l.length === 1 && l[0].id === good.id && app.win.__xss === undefined, fmt(l.map(x => x.id)));
});
const n57c = 'AC-124: check-in đọc lại có mã cảm xúc / tình huống lạ hoặc before ngoài 0–10 bị bỏ';
withS(['startLocal', 'checkins'], n57c, (app, S) => {
  S.startLocal({ writing: false });
  const ok = { v: 1, id: 'c0000000000000000001', at: NOW, emotions: [], before: 3, after: null, exercise: null, fit: null, contexts: [], minutes: 3 };
  app.local.setItem('lstp_v1_checkins', JSON.stringify([ok, Object.assign({}, ok, { id: 'c0000000000000000002', emotions: [XSS] }), Object.assign({}, ok, { id: 'c0000000000000000003', before: 11 }),
    Object.assign({}, ok, { id: 'c0000000000000000004', fit: XSS }), Object.assign({}, ok, { id: 'c0000000000000000005', minutes: 7 })]));
  H.eq(n57c, S.checkins.list().map(x => x.id), ['c0000000000000000001']);
});
const n57d = 'AC-124: lời nhắn đọc lại giữ NGUYÊN VĂN chữ có thẻ HTML (escape là việc của màn hình, không mất chữ)';
withS(['startLocal', 'letters'], n57d, (app, S) => {
  S.startLocal({ writing: true });
  S.letters.add({ day: TODAY, text: XSS });
  H.eq(n57d, S.letters.list().map(x => x.text), [XSS]);
});

/* ===== Giới hạn số bản ghi (5.3) ===== */
H.section('giới hạn số bản ghi');
const nL1 = '5.3: check-in ≤ 500, bỏ cũ nhất (thêm 510 → còn 500, bản cũ nhất mất)';
withS(['startLocal', 'checkins'], nL1, (app, S) => {
  S.startLocal({ writing: false });
  const ids = [];
  for (let i = 0; i < 510; i++) { app.clock.add(1000); ids.push(S.checkins.add({ before: i % 11 }).id); }
  const l = S.checkins.list();
  H.ok(nL1, l.length === 500 && !l.some(x => x.id === ids[0]) && l.some(x => x.id === ids[509]), 'còn ' + l.length);
});
const nL2 = '5.3: mốc thai giáo ≤ 1000 (1.008 mốc khác nhau → còn 1000)';
withS(['startLocal', 'thaigiao'], nL2, (app, S) => {
  S.startLocal({ writing: false });
  for (let d = 0; d < 63; d++) for (let p = 1; p <= 16; p++) {
    app.clock.add(1000);
    S.thaigiao.mark(new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString().slice(0, 10), 'TG-' + String(p).padStart(2, '0'), 'done');
  }
  H.eq(nL2, S.thaigiao.list().length, 1000);
});
const nTg = 'thai giáo: cùng ngày + cùng lời nhắc → một mốc (không nhân đôi), không có chữ';
withS(['startLocal', 'thaigiao'], nTg, (app, S) => {
  S.startLocal({ writing: false });
  S.thaigiao.mark(TODAY, 'TG-05', 'done'); S.thaigiao.mark(TODAY, 'TG-05', 'done');
  const l = S.thaigiao.list();
  H.ok(nTg, l.length === 1 && !('text' in l[0]), fmt(l));
});

/* ===== Ngày dự sinh (5.7.1, AC-127, 128, 136) ===== */
H.section('ngày dự sinh');
const nP1 = 'AC-136: lưu trên máy → lstp_profile = {v:1, edd, asked:true}; không lưu tuần thai';
withS(['startLocal', 'profile'], nP1, (app, S) => {
  S.startLocal({ writing: false });
  const code = S.profile.set('2027-02-05');
  const raw = JSON.parse(app.local.getItem('lstp_profile') || 'null');
  H.ok(nP1, code === 'ok' && raw && raw.v === 1 && raw.edd === '2027-02-05' && raw.asked === true && !('weeks' in raw) && !('gaDays' in raw), fmt(raw));
});
const nP2 = 'AC-128: profile.set ngoài khoảng (14/10/2026, 06/08/2027) → trả mã lỗi, không ghi đè ngày cũ';
withS(['startLocal', 'profile'], nP2, (app, S) => {
  S.startLocal({ writing: false });
  S.profile.set('2027-02-05');
  const a = S.profile.set('2026-10-14'), b = S.profile.set('2027-08-06'), c = S.profile.set('05/02/2027');
  H.ok(nP2, a === 'too_early' && b === 'too_far' && c === 'format' && S.profile.get().edd === '2027-02-05', fmt([a, b, c, S.profile.get()]));
});
const nP3 = 'AC-127/5.7.1: xóa ngày dự sinh → edd null, asked vẫn true (không hỏi lại)';
withS(['startLocal', 'profile'], nP3, (app, S) => {
  S.startLocal({ writing: false });
  S.profile.set('2027-02-05'); S.profile.clear();
  const p = S.profile.get();
  H.ok(nP3, p && p.edd === null && S.profile.asked() === true, fmt(p));
});
const nP4 = '5.7.1: lần đầu asked() = false; "Để sau" (markAsked) → true, lần mở sau (local) vẫn true';
withS(['startLocal', 'profile'], nP4, (app, S) => {
  S.startLocal({ writing: false });
  const a0 = S.profile.asked();
  S.profile.markAsked();
  const app2 = fresh({ local: app.local }); const S2 = app2.win.LSTP_STORE; S2._setMode && S2._setMode(S2.detectMode());
  H.ok(nP4, a0 === false && S.profile.asked() === true && S2.profile.asked() === true, fmt([a0, S.profile.asked(), S2.profile.asked()]));
});

/* ===== Đếm cử động thai (5.3, K-AC-51, 73) ===== */
H.section('lượt đếm');
const nK1 = 'K-AC-51: lưu trên máy → lượt nằm ở localStorage lstp_kick_sessions, lượt dở ở lstp_kick_active';
withS(['startLocal', 'kick'], nK1, (app, S) => {
  S.startLocal({ writing: false });
  S.kick.setActive(kickSess('k0000000000000000020'));
  const act = app.local.getItem('lstp_kick_active');
  S.kick.save(kickSess('k0000000000000000021')); S.kick.clearActive();
  H.ok(nK1, act != null && app.local.getItem('lstp_kick_sessions') != null && app.local.getItem('lstp_kick_active') == null && keysOf(app.session).length === 0, fmt([keysOf(app.local), keysOf(app.session)]));
});
const nK2 = 'K-AC-54/7.5: cùng mã lượt lưu hai lần → một lượt (cập nhật, không nhân đôi)';
withS(['startLocal', 'kick'], nK2, (app, S) => {
  S.startLocal({ writing: false });
  S.kick.save(kickSess('k0000000000000000022')); S.kick.save(kickSess('k0000000000000000022', { total: 3 }));
  H.eq(nK2, S.kick.list().map(x => [x.id, x.total]), [['k0000000000000000022', 3]]);
});
const nK3 = '7.4: vị trí chạm giữ được (x,y số 0–1, null khi bấm nút) sau khi lưu và đọc lại';
withS(['startLocal', 'kick'], nK3, (app, S) => {
  S.startLocal({ writing: false });
  S.kick.save(kickSess('k0000000000000000023'));
  const t = (S.kick.get('k0000000000000000023') || {}).taps;
  H.ok(nK3, Array.isArray(t) && t.length === 2 && Math.abs(t[0].x - 0.412) <= 0.001 && t[1].x === null && t[1].y === null, fmt(t));
});
const nK4 = 'K-AC-73 (đặc tả 5.5): gaDays của lượt được lưu cùng lượt (181 → đọc lại 181; null giữ null)';
withS(['startLocal', 'kick'], nK4, (app, S) => {
  S.startLocal({ writing: false });
  S.kick.save(kickSess('k0000000000000000024', { gaDays: 181 })); S.kick.save(kickSess('k0000000000000000025', { gaDays: null }));
  const a = S.kick.get('k0000000000000000024'), b = S.kick.get('k0000000000000000025');
  H.ok(nK4, a && a.gaDays === 181 && b && b.gaDays === null, fmt([a && a.gaDays, b && b.gaDays]));
});
const nK5 = 'kick.remove(id) → lượt mất khỏi danh sách (K-AC-59)';
withS(['startLocal', 'kick'], nK5, (app, S) => {
  S.startLocal({ writing: false });
  S.kick.save(kickSess('k0000000000000000026')); S.kick.save(kickSess('k0000000000000000027', { startAt: NOW + 3600e3 }));
  S.kick.remove('k0000000000000000026');
  H.eq(nK5, S.kick.list().map(x => x.id), ['k0000000000000000027']);
});

/* ===== Thói quen ===== */
H.section('thói quen');
const nH1 = 'habits.setMark/getDay: "x", "a", "" đúng; mã lạ hoặc ngày sai bị từ chối';
withS(['startLocal', 'habits'], nH1, (app, S) => {
  S.startLocal({ writing: false });
  S.habits.setMark(TODAY, 'water', 'x'); S.habits.setMark(TODAY, 'breath', 'a'); S.habits.setMark(TODAY, 'water', '');
  const bad = [S.habits.setMark(TODAY, XSS, 'x'), S.habits.setMark('29/10/2026', 'water', 'x'), S.habits.setMark(TODAY, 'water', 'yes')];
  const d = S.habits.getDay(TODAY);
  H.ok(nH1, d.marks.water === '' && d.marks.breath === 'a' && bad.every(x => x == null || x === false), fmt([d, bad]));
});
const nH2 = 'AC-109: habits.removeDay xóa đánh dấu của một ngày';
withS(['startLocal', 'habits'], nH2, (app, S) => {
  S.startLocal({ writing: false });
  S.habits.setMark('2026-10-28', 'water', 'x'); S.habits.setMark(TODAY, 'water', 'x');
  S.habits.removeDay('2026-10-28');
  H.eq(nH2, S.habits.range().map(r => r.day), [TODAY]);
});

/* ===== Xuất (AC-70) ===== */
H.section('xuất');
const nX = 'AC-70: exportAll gồm đồng ý, check-in, lời nhắn, mốc thai giáo (và thói quen, lượt đếm, ngày dự sinh)';
withS(['startLocal', 'exportAll', 'checkins', 'letters', 'thaigiao'], nX, (app, S) => {
  S.startLocal({ writing: true });
  S.checkins.add({ before: 4 }); S.letters.add({ day: TODAY, text: 'thư' }); S.thaigiao.mark(TODAY, 'TG-01', 'done'); S.profile && S.profile.set('2027-02-05');
  const x = S.exportAll();
  H.ok(nX, x && x.consent && x.consent.journey === true && x.checkins.length === 1 && x.letters.length === 1 && x.thaigiao.length === 1 && x.profile && x.profile.edd === '2027-02-05', fmt(x).slice(0, 300));
});

H.done();
