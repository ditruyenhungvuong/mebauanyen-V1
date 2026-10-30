/* =========================================================
   E2E – Mẹ Bầu An Yên (chủ: qa-tester; T-Q1 dựng khung, T-Q2 mở rộng). Chrome headless thật qua CDP (tests/lib/cdp.js),
   server tĩnh trong tiến trình (tests/lib/static-server.js: vá js/config.js trong bộ nhớ, MOCK bật, GOOGLE_SCRIPT_URL='').
   Kế thừa: STOP-4P tests/e2e.js (ghi kết quả, "giới hạn đã biết" in riêng), checkin-me-bau tests/e2e.js (chốt chặn 4 lớp).

   Chạy (Ubuntu, Node ≥ 22; bọc flock vì agent khác có thể chạy e2e song song):
     export TMPDIR=/tmp/claude-1000/qa1; mkdir -p $TMPDIR
     flock /tmp/claude-1000/e2e.lock $NODE tests/e2e.js [--port=8767] [--out=$TMPDIR/out] [--only=none,local,...] [-v]
   Kịch bản (tech design 14.6): none | local | profile | support | relax | thaigiao | kick | habits | layout | a11y | network
   + tests/e2e/qa-*.js (T-Q2, mỗi file một nhóm AC) + tests/e2e/dev-*.js (script thử của FE-1, FE-3, FE-4, FE-5 đã gộp) | account (Bước B)
   Màn/route chưa có (LSTP_APP.hasScreen = false) → CHỜ (không xanh, không đỏ). account (Bước B) → CHỜ tới T-QB.

   AN TOÀN – chốt chặn 4 lớp, không bao giờ gọi Apps Script thật:
   1. static-server vá config trong bộ nhớ (MOCK:true, GOOGLE_SCRIPT_URL='') và e2e đọc lại bản phục vụ: còn chữ
      script.google(usercontent).com trong GOOGLE_SCRIPT_URL → dừng trước khi mở Chrome.
   2. HOOK cài trước mọi script của trang: window.fetch / XMLHttpRequest / sendBeacon từ chối URL chứa script.google.
   3. Fetch domain của Chrome chặn *script.google.com* và *script.googleusercontent.com* (BlockedByClient), giả lập Google Fonts.
   4. Trước mọi thao tác có thể gửi dữ liệu (kịch bản account): đọc LSTP_CONFIG trong trang; URL thật → throw, không bấm.
   Kết thúc: có FAIL hoặc có BẤT KỲ request nào tới script.google → process.exitCode = 1. Lỗi khung test → 2.
   Không ghi gì vào thư mục app; profile Chrome, ảnh, JSON kết quả vào --out.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { launch, sleep } = require('./lib/cdp');
const { startStatic } = require('./lib/static-server');

const APP = path.resolve(__dirname, '..');
const argv = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--?([^=]+)=?(.*)$/); return m ? [m[1], m[2] || true] : [a, true]; }));
const PORT = +(argv.port || 8767);
const OUT = path.resolve(argv.out || path.join(process.env.TMPDIR || os.tmpdir(), 'lstp-qa'));
const ONLY = argv.only ? String(argv.only).split(',') : null;
const VERBOSE = !!argv.v;
const MOCK_URL = 'http://127.0.0.1:8790/exec';
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const GOOGLE = /script\.google(?:usercontent)?\.com/;
const MIN = 60000;
const T0 = Date.UTC(2026, 9, 29, 1, 0);          // 08:00 giờ VN 29/10/2026 – "hôm nay" giả của mọi kịch bản
const XSS = '<img src=x onerror="window.__xss=1">';
const FOREIGN = { myJourneys: '[{"a":1}]', user_0900000000: '{"x":1}', musicMuted: 'true', checkin_me_bau_pending: '[1]', stop4p_voice: 'on' };

/* ===== Ghi kết quả ===== */
const results = [], knownLimits = [], googleHits = [];
let scenario = '', fails = 0;
const rec = (status, name, detail) => {
  results.push({ scenario, name, status, detail: detail === undefined ? '' : String(detail).slice(0, 500) });
  if (status === 'FAIL') fails++;
  if (status !== 'PASS' || VERBOSE) console.log((status === 'PASS' ? 'PASS ' : status === 'FAIL' ? 'FAIL ' : 'CHỜ  ') + '[' + scenario + '] ' + name + (status !== 'PASS' && detail ? '  → ' + String(detail).slice(0, 300) : ''));
};
const check = (name, ok, detail) => { rec(ok ? 'PASS' : 'FAIL', name, ok ? '' : detail); return !!ok; };
const wait = (name, why) => rec('CHỜ', name, why);
const limit = (name, why) => knownLimits.push({ scenario, name, why });

/* ===== HOOK chạy trước script của trang (lớp 2) + đồng hồ giả + đếm AudioContext ===== */
const HOOK = `(() => {
  const O = window.__qaOpts || {};
  const qa = window.__qa = { errors: [], blocked: [], audioCtx: 0, fetches: [], alerts: [], downloads: [], vibrate: [], sound: { bum: 0, giggle: 0, chime: 0 }, rain: 0 };
  /* Mưa tim (K-AC-19, 21, 24, R-11): app thêm lớp .on vào #kRain → đếm, không phụ thuộc màn còn hay đã chuyển */
  new MutationObserver(ms => ms.forEach(m => { const t = m.target; if (t.id === 'kRain' && t.classList.contains('on') && !String(m.oldValue || '').split(/\s+/).includes('on')) qa.rain++; }))
    .observe(document, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
  /* Tải file: giữ Blob, không cho trình duyệt tải thật (AC-67, 70, 109, K-AC-58) */
  const blobs = {};
  const oURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = b => { const u = oURL(b); blobs[u] = b; return u; };
  const oClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) { qa.downloads.push({ name: this.download, url: this.href, blob: blobs[this.href] }); return; } return oClick.apply(this, arguments); };
  qa.dlText = i => { const d = qa.downloads[i < 0 ? qa.downloads.length + i : i]; return d && d.blob ? d.blob.text() : Promise.resolve(null); };
  try { Object.defineProperty(navigator, 'vibrate', { configurable: true, value: p => { qa.vibrate.push(p); return true; } }); } catch (e) {}
  /* Ghi đè cấu hình theo kịch bản (vd OB_CONTACT có số thử, ALLOW_DRAFT_CONTENT:false) */
  if (O.cfg) { let c; Object.defineProperty(window, 'LSTP_CONFIG', { configurable: true, get() { return c; }, set(v) { const m = (t, s) => { for (const k of Object.keys(s)) { if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') m(t[k], s[k]); else t[k] = s[k]; } }; m(v, O.cfg); c = v; } }); }
  /* Đếm tiếng chạm của mục đếm (K-AC-10, 11) */
  { let snd; Object.defineProperty(window, 'LSTP_SOUND', { configurable: true, get() { return snd; }, set(v) { if (v) for (const k of ['bum', 'giggle', 'chime']) if (typeof v[k] === 'function') { const f = v[k]; v[k] = function () { qa.sound[k]++; return f.apply(this, arguments); }; } snd = v; } }); }
  /* Đồng hồ giả: lệch giờ lưu trong window.name để còn sau khi tải lại trang (R-09 mở lại app) */
  const RealDate = Date;
  const off = () => { const m = /qaoff:(-?\\d+)/.exec(window.name || ''); return m ? +m[1] : 0; };
  class QADate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + off()); }
    static now() { return RealDate.now() + off(); }
  }
  QADate.UTC = RealDate.UTC; QADate.parse = RealDate.parse;
  window.Date = QADate;
  const perfNow = performance.now.bind(performance);
  qa.setOffset = ms => { window.name = 'qaoff:' + Math.round(ms); };
  void perfNow;
  /* Lớp 2: chặn mạng tới Apps Script thật ngay trong trang */
  const bad = u => /script\\.google(usercontent)?\\.com/.test(String(u));
  const of = window.fetch && window.fetch.bind(window);
  window.fetch = (u, init) => { qa.fetches.push(String(u && u.url || u)); if (bad(u && u.url || u)) { qa.blocked.push(String(u)); return Promise.reject(new Error('QA chặn script.google')); } return of(u, init); };
  const xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { if (bad(u)) { qa.blocked.push(String(u)); throw new Error('QA chặn script.google'); } return xo.apply(this, arguments); };
  if (navigator.sendBeacon) { const sb = navigator.sendBeacon.bind(navigator); navigator.sendBeacon = (u, d) => { if (bad(u)) { qa.blocked.push(String(u)); return false; } return sb(u, d); }; }
  /* AC-49: đếm AudioContext được tạo */
  for (const k of ['AudioContext', 'webkitAudioContext']) if (window[k]) { const A = window[k]; window[k] = class extends A { constructor(...a) { qa.audioCtx++; if (O.audioFail) throw new Error('QA: WebAudio lỗi giả lập'); super(...a); } }; }
  window.alert = m => { qa.alerts.push('alert:' + m); }; window.confirm = m => { qa.alerts.push('confirm:' + m); return true; }; window.prompt = m => { qa.alerts.push('prompt:' + m); return null; };
  window.addEventListener('error', e => qa.errors.push('onerror: ' + e.message));
  window.addEventListener('unhandledrejection', e => qa.errors.push('unhandledrejection: ' + (e.reason && e.reason.message || e.reason)));
})();`;

/* ===== Mở Chrome cho một kịch bản ===== */
let srv;
async function open(opts) {
  const o = Object.assign({ width: 375, height: 667 }, opts);
  const { page, kill } = await launch({ userDataDir: path.join(OUT, 'ud-' + scenario + (o.tag ? '-' + o.tag : '')), width: o.width, height: o.height });
  const errors = [];
  page.on('Runtime.exceptionThrown', p => errors.push('exception: ' + (p.exceptionDetails.exception && p.exceptionDetails.exception.description || p.exceptionDetails.text)));
  page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push('console.error: ' + p.args.map(a => a.value ?? a.description).join(' ')); });
  page.on('Network.requestWillBeSent', p => { if (GOOGLE.test(p.request.url)) googleHits.push(scenario + ': ' + p.request.url); });
  /* Lớp 3: Fetch domain */
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*fonts.googleapis.com/*' }, { urlPattern: '*fonts.gstatic.com/*' }, { urlPattern: '*script.google.com/*' }, { urlPattern: '*script.googleusercontent.com/*' }] });
  page.on('Fetch.requestPaused', async p => {
    try {
      if (GOOGLE.test(p.request.url)) { googleHits.push(scenario + ' (Fetch chặn): ' + p.request.url); await page.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }); }
      else await page.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/css' }], body: Buffer.from('/* font giả */').toString('base64') });
    } catch (e) { /* request đã hủy */ }
  });
  await page.send('Emulation.setDeviceMetricsOverride', { width: o.width, height: o.height, deviceScaleFactor: 2, mobile: true });
  if (o.reduced) await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__qaOpts = ' + JSON.stringify({ cfg: o.cfg || null, audioFail: !!o.audioFail }) + ';' + HOOK });
  const P = {
    page, errors,
    /* Đóng Chrome; trước đó gom các lần app CỐ gọi script.google mà HOOK đã chặn (lớp 2) → cũng tính là request Google */
    async kill() {
      try { const b = await page.evaluate('JSON.stringify((window.__qa && window.__qa.blocked) || [])'); JSON.parse(b).forEach(u => googleHits.push(scenario + ' (HOOK chặn trong trang): ' + u)); } catch (e) { /* trang đã đóng */ }
      kill();
    },
    ev: expr => page.evaluate(expr),
    async load(offsetMs) {
      await page.navigate(srv.url + 'index.html');
      await P.ev(`__qa.setOffset(${(offsetMs == null ? T0 - Date.now() : offsetMs)})`);
      await page.navigate(srv.url + 'index.html');          // nạp lại để app thấy giờ giả ngay từ lúc boot
      await sleep(250);
    },
    async reload() { await page.send('Page.reload', {}); await page.once('Page.loadEventFired'); await sleep(250); },
    /* "Đóng app" ms mili giây: sang trang cùng origin không có mã app (404), tua đồng hồ, rồi mở lại app.
       Khác tick()+reload(): trong lúc "đóng", không màn nào của app chạy để phản ứng trước (R-09). */
    async closedFor(ms) {
      await page.navigate(srv.url + '__qa_closed__');
      await P.ev(`(() => { const m = /qaoff:(-?\\d+)/.exec(window.name); window.name = 'qaoff:' + ((m ? +m[1] : 0) + ${ms}); })()`);
      await page.navigate(srv.url + 'index.html'); await sleep(300);
    },
    setTime: ms => P.ev(`__qa.setOffset(${ms} - (Date.now() - (/qaoff:(-?\\d+)/.exec(window.name)||[0,0])[1]*1))`),
    async tick(ms) { await P.ev(`(() => { const m = /qaoff:(-?\\d+)/.exec(window.name); __qa.setOffset((m ? +m[1] : 0) + ${ms}); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); })()`); await sleep(400); },
    screen: () => P.ev("document.querySelector('#main') && document.querySelector('#main').dataset.screen || ''"),
    // Chữ hiển thị đã gộp khoảng trắng (nút hai dòng, số và đơn vị nằm ở hai phần tử)
    text: () => P.ev("(document.querySelector('#main') || document.body).innerText.replace(/\\s+/g, ' ').trim()"),
    has: name => P.ev(`!!(window.LSTP_APP && LSTP_APP.hasScreen && LSTP_APP.hasScreen(${JSON.stringify(name)}))`),
    go: (name, params) => P.ev(`LSTP_APP.go(${JSON.stringify(name)}, ${JSON.stringify(params || {})})`).then(() => sleep(150)),
    storage: () => P.ev('JSON.stringify({ l: Object.keys(localStorage).sort(), s: Object.keys(sessionStorage).sort() })').then(JSON.parse),
    async click(sel) { await page.click(sel); await sleep(150); },
    /* Bấm nút/link/thẻ có chữ hiển thị chứa `t` (chữ nguyên văn PRD). Không thấy → false */
    async clickText(t, scope) {
      const ok = await P.ev(`(() => { const want = ${JSON.stringify(t)}; const root = document.querySelector(${JSON.stringify(scope || 'body')});
        const els = [...root.querySelectorAll('button, a, [role=button], label, summary')].filter(e => e.offsetParent !== null || e.getClientRects().length);
        const el = els.find(e => e.innerText.replace(/\\s+/g, ' ').trim() === want) || els.find(e => e.innerText.replace(/\\s+/g, ' ').includes(want));
        if (!el) return false; el.setAttribute('data-qa-click', '1'); return true; })()`);
      if (!ok) return false;
      await page.click('[data-qa-click="1"]');
      await P.ev("document.querySelectorAll('[data-qa-click]').forEach(e => e.removeAttribute('data-qa-click'))").catch(() => {});
      await sleep(200);
      return true;
    },
    async shot(name) { try { await page.screenshot(path.join(OUT, 'shots', scenario + '-' + name + '.png')); } catch (e) { /* bỏ qua */ } },
    qa: () => P.ev('JSON.stringify(window.__qa, (k, v) => (k === "blob" ? undefined : v))').then(JSON.parse),
    dl: i => P.ev(`__qa.dlText(${i == null ? -1 : i})`),
    act: (name, extra) => P.ev(`(() => { const el = document.querySelector('[data-act="${name}"]${extra || ''}'); if (!el) return false; el.click(); return true; })()`).then(async r => { await sleep(180); return r; })
  };
  return P;
}
/* Đi qua màn chào → cách dùng → (A09 Để sau) → Trang chính */
async function enter(P, how) {
  await P.load();
  await P.clickText('Dùng ẩn danh');
  if (how === 'none') await P.clickText('Không lưu gì');
  else { await P.clickText('Lưu trên máy này'); await P.clickText('Tiếp tục ›'); }
  if (await P.screen() === 'due_date') await P.clickText('Để sau');
  return P.screen();
}
async function needScreens(P, names) {
  const miss = [];
  for (const n of names) if (!(await P.has(n))) miss.push(n);
  return miss;
}
/* Lớp 4: kiểm cấu hình trong trang trước khi cho bất kỳ thao tác gửi dữ liệu nào */
async function assertSafeConfig(P) {
  const c = await P.ev('JSON.stringify({ u: LSTP_CONFIG.GOOGLE_SCRIPT_URL, m: LSTP_CONFIG.MOCK, mu: LSTP_CONFIG.MOCK_URL })').then(JSON.parse);
  if (GOOGLE.test(c.u || '') || c.m !== true || !/^http:\/\/127\.0\.0\.1:\d+\//.test(c.mu || '')) throw new Error('AN TOÀN: cấu hình trong trang có URL thật / MOCK tắt: ' + JSON.stringify(c) + ' — DỪNG, không bấm');
  return c;
}

/* ===== Kịch bản ===== */
const SCENARIOS = {
  /* AC-10, 11, 12, 80, 137 */
  async none() {
    const P = await open();
    try {
      await P.load();
      check('AC-10: màn chào có "Dùng ẩn danh"; Bước A không có nút đăng nhập (K-2)', /Dùng ẩn danh/.test(await P.text()) && !(await P.ev("!!document.querySelector('[data-go=login]')")));
      await P.clickText('Dùng ẩn danh');
      const t = await P.text();
      check('AC-10: sau "Dùng ẩn danh" có hai lựa chọn ngang hàng "Lưu trên máy này" / "Không lưu gì"', /Lưu trên máy này/.test(t) && /Không lưu gì/.test(t), t.slice(0, 200));
      await P.clickText('Không lưu gì');
      check('AC-125: A09 hiện trước Trang chính ở chế độ không lưu', await P.screen() === 'due_date', await P.screen());
      await P.clickText('Để sau');
      check('Để sau → Trang chính', await P.screen() === 'home', await P.screen());
      const st = await P.storage();
      check('AC-11/137: chưa có khóa nào trong localStorage/sessionStorage', !st.l.length && !st.s.length, JSON.stringify(st));
      // Dùng vài tính năng có sẵn
      for (const [scr, act] of [['thaigiao', 'Mẹ đã làm rồi ✓'], ['habits', '💧 Uống đủ nước']]) {
        if (!(await P.has(scr))) { wait('AC-11: dùng ' + scr + ' ở chế độ không lưu', 'chưa có màn ' + scr); continue; }
        await P.go(scr); const ok = await P.clickText(act);
        check('AC-11: ' + scr + ' – bấm "' + act + '"', ok);
      }
      const st2 = await P.storage();
      check('AC-11/AC-80: sau khi dùng: localStorage trống, sessionStorage chỉ lstp_kick_*', !st2.l.length && st2.s.every(k => k.startsWith('lstp_kick_')), JSON.stringify(st2));
      const cookies = (await P.page.send('Network.getAllCookies')).cookies || [];
      const idb = await P.ev('indexedDB.databases ? indexedDB.databases().then(d => d.length) : 0');
      check('AC-11: không cookie, không IndexedDB', !cookies.length && !idb, JSON.stringify({ cookies: cookies.length, idb }));
      if (await P.has('habits_stats')) { await P.go('habits_stats'); check('AC-108/A.27: thống kê ở chế độ không lưu hiện câu "không lưu"', /Chế độ không lưu nên mình chưa có thống kê/.test(await P.text())); }
      else wait('AC-108: thống kê chế độ không lưu', 'chưa có habits_stats');
      await P.reload();
      check('AC-11: tải lại (không có lượt đếm dở) → về màn chào', await P.screen() === 'welcome', await P.screen());
      limit('AC-11 "đóng tab rồi mở lại"', 'CDP chỉ tải lại cùng tab (sessionStorage còn); đóng tab thật kiểm tay ở 14.5, hoặc unit-store mô phỏng tab mới');
      check('không lỗi console / exception', !P.errors.length && !(await P.qa()).errors.length, P.errors.concat((await P.qa()).errors).join(' | '));
    } finally { await P.kill(); }
  },

  /* AC-13…18, 71, 136 */
  async local() {
    const P = await open();
    try {
      await P.load();
      await P.ev(`Object.entries(${JSON.stringify(FOREIGN)}).forEach(([k, v]) => localStorage.setItem(k, v))`);
      await P.reload();
      await P.clickText('Dùng ẩn danh'); await P.clickText('Lưu trên máy này');
      const st0 = await P.storage();
      check('AC-13: màn đồng ý chưa ghi khóa lstp_ nào', !st0.l.some(k => k.startsWith('lstp_')), JSON.stringify(st0));
      const t = await P.text();
      check('AC-13: hai mục "Lưu hành trình" / "Lưu cả những gì chị tự viết" + cảnh báo máy dùng chung', /Lưu hành trình/.test(t) && /Lưu cả những gì chị tự viết/.test(t) && /Máy dùng chung/.test(t), t.slice(0, 300));
      await P.clickText('Tiếp tục ›');
      if (await P.screen() === 'due_date') {
        const typed = await P.ev(`(() => { const i = document.querySelector('#main input[type=date]'); if (!i) return false; i.value = '2027-02-05'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        if (typed) await P.clickText('Lưu ›'); else await P.clickText('Để sau');
        check('AC-125/136: A09 nhập ngày dự sinh 05/02/2027 → Trang chính', await P.screen() === 'home', await P.screen());
        if (typed) check('AC-129: Trang chính "Hôm nay con được 25 tuần 6 ngày" (hôm nay giả 29/10/2026)', /Hôm nay con được 25 tuần 6 ngày/.test(await P.text()), (await P.text()).slice(0, 200));
      } else check('AC-125: A09 hiện sau đồng ý', false, await P.screen());
      const st = await P.storage();
      const allowed = ['lstp_v1_local', 'lstp_v1_checkins', 'lstp_v1_thaigiao', 'lstp_v1_letters', 'lstp_v1_habits', 'lstp_v1_prefs', 'lstp_profile', 'lstp_kick_sessions', 'lstp_kick_active', 'lstp_kick_prefs'];
      const mine = st.l.filter(k => !(k in FOREIGN));
      check('AC-15: mọi khóa app tạo có tiền tố lstp_ và nằm trong bảng 5.3', mine.length > 0 && mine.every(k => allowed.includes(k)), mine.join(', '));
      check('AC-18: dòng "Đang lưu trên máy này · Dữ liệu của chị ›"', /Đang lưu trên máy này/.test(await P.text()));
      await P.reload();
      check('AC-18/AC-126: mở lại → vào thẳng Trang chính, A09 không hỏi lại', await P.screen() === 'home', await P.screen());
      if (await P.has('data')) {
        await P.go('data');
        const a = await P.clickText('Xóa toàn bộ dữ liệu trên máy');
        const b = a && await P.clickText('Mình hiểu, xóa toàn bộ');
        const st2 = await P.storage();
        const foreignOk = await P.ev(`Object.entries(${JSON.stringify(FOREIGN)}).every(([k, v]) => localStorage.getItem(k) === v)`);
        check('AC-71: "Xóa toàn bộ" → "Mình hiểu, xóa toàn bộ" → hết khóa lstp_, khóa app khác còn nguyên, về màn chào', a && b && !st2.l.concat(st2.s).some(k => k.startsWith('lstp_')) && foreignOk && await P.screen() === 'welcome',
          JSON.stringify({ a, b, st2, foreignOk, scr: await P.screen() }));
      } else wait('AC-71: xóa toàn bộ', 'chưa có màn data');
      check('không lỗi console / exception', !P.errors.length && !(await P.qa()).errors.length, P.errors.concat((await P.qa()).errors).join(' | '));
    } finally { await P.kill(); }
  },

  /* A09 ngày dự sinh ở ba chế độ (5.7.1), AC-128, 130, 134 */
  async profile() {
    const P = await open();
    try {
      await P.load();
      await P.clickText('Dùng ẩn danh'); await P.clickText('Không lưu gì');
      if (await P.screen() !== 'due_date') { check('A09 hiện ở lần đầu', false, await P.screen()); return; }
      const setEdd = v => P.ev(`(() => { const i = document.querySelector('#main input[type=date]'); if (!i) return false; i.value = ${JSON.stringify(v)}; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      if (!(await setEdd('2026-10-14'))) { wait('AC-128: ngoài khoảng', 'A09 không có <input type=date>'); return; }
      await P.clickText('Lưu ›');
      check('AC-128: 14/10/2026 (−15 ngày) → không lưu, câu "Ngày này có vẻ chưa đúng…"', await P.screen() === 'due_date' && /Ngày này có vẻ chưa đúng/.test(await P.text()), (await P.text()).slice(0, 200));
      await setEdd('2027-01-22'); await P.clickText('Lưu ›');
      check('AC-128/129: 22/01/2027 lưu được → Trang chính 27 tuần 6 ngày', await P.screen() === 'home' && /27 tuần 6 ngày/.test(await P.text()), (await P.text()).slice(0, 200));
      check('AC-137: chế độ không lưu → ngày dự sinh không ghi khóa nào', !(await P.storage()).l.length);
      if (await P.has('kick_home')) {
        await P.go('kick_home');
        check('AC-134/K-AC-74: dưới 28 tuần → kick_home có dòng M-20b, vẫn có "👣 Bắt đầu đếm ›"', /Mục này thường dùng từ tuần 28/.test(await P.text()) && /Bắt đầu đếm/.test(await P.text()));
        await P.tick(24 * 60 * MIN);                       // qua nửa đêm giờ VN → đủ 28 tuần 0 ngày
        await P.go('home'); await P.go('kick_home');
        check('AC-130: qua nửa đêm (đồng hồ giả +24 giờ) → 28 tuần, hết dòng M-20b', !/Mục này thường dùng từ tuần 28/.test(await P.text()), (await P.text()).slice(0, 200));
      } else wait('AC-134: ghi chú dưới 28 tuần ở kick_home', 'chưa có kick_home');
    } finally { await P.kill(); }
  },

  /* AC-32, 73, 74, 78 */
  async support() {
    const P = await open();
    try {
      await enter(P, 'none');
      await P.click('#header [data-go=support]');
      const t = await P.text();
      const hrefs = await P.ev("[...document.querySelectorAll('#main a[href^=\"tel:\"]')].map(a => a.getAttribute('href'))");
      check('AC-73: Hỗ trợ có "Dấu hiệu cần đi khám ngay" trước tel:115', t.indexOf('Dấu hiệu cần đi khám ngay') >= 0 && t.indexOf('Dấu hiệu cần đi khám ngay') < Math.max(t.indexOf('115'), 0) + 1 && hrefs.includes('tel:115'), JSON.stringify(hrefs));
      check('AC-32: config liên hệ trống → không số nào ngoài 115', hrefs.every(h => h === 'tel:115'), JSON.stringify(hrefs));
      check('AC-73: khối "Khi nào chị cần đi khám ngay" + lối vào "👣 Đếm cử động thai"', /Khi nào chị cần đi khám ngay/.test(t) && /Đếm cử động thai/.test(t));
      if (!(await P.has('signs'))) { wait('AC-74: trang dấu hiệu', 'chưa có màn signs'); return; }
      await P.go('signs');
      const ok = await P.clickText('Ra máu ở vùng kín, dù ít');
      const t2 = await P.text();
      check('AC-74/78: chạm "Ra máu ở vùng kín, dù ít" → trang khẩn chung, có lý do, có 📞 Gọi 115, không nút đếm tiếp', ok && await P.screen() === 'see_doctor' && /Chị đi khám ngay nhé/.test(t2) && /Ra máu ở vùng kín/.test(t2) && !/Đếm tiếp/.test(t2), t2.slice(0, 300));
      check('A.20: có "Mình chọn nhầm / không phải lúc này, quay lại" khi mở từ trang dấu hiệu', /Mình chọn nhầm \/ không phải lúc này, quay lại/.test(t2));
    } finally { await P.kill(); }
  },

  /* AC-19…22, 37…48 (phần giao diện; bộ câu an toàn đủ ở unit-engine) */
  async relax() {
    const P = await open();
    try {
      await enter(P, 'none');
      const miss = await needScreens(P, ['pause5', 'checkin', 'result', 'player', 'checkout', 'done']);
      if (miss.length) { wait('luồng Thư giãn', 'chưa có màn: ' + miss.join(', ')); return; }
      await P.go('pause5');
      check('AC-19: Dừng 5 giây có "Bỏ qua" ngay từ đầu', /Bỏ qua/.test(await P.text()));
      await P.clickText('Bỏ qua');
      check('Bỏ qua → check-in', await P.screen() === 'checkin', await P.screen());
      const ta = await P.ev("!!document.querySelector('#main textarea')");
      if (ta) {
        await P.ev(`(() => { const t = document.querySelector('#main textarea'); t.focus(); t.value = 'mình muốn chết'; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
        await P.clickText('Xem gợi ý ›');
        check('AC-23: "mình muốn chết" → trang hỗ trợ khẩn (urgent) có tel:115 và "Mình đang an toàn — đó chỉ là cách nói. Tiếp tục"',
          await P.screen() === 'urgent' && await P.ev("!!document.querySelector('#main a[href=\"tel:115\"]')") && /Mình đang an toàn — đó chỉ là cách nói. Tiếp tục/.test(await P.text()), await P.screen());
      } else check('AC-20: check-in có ô viết', false);
      check('AC-49: đi qua các màn Thư giãn mà chưa bấm Phát → 0 AudioContext', (await P.qa()).audioCtx === 0, (await P.qa()).audioCtx);
    } finally { await P.kill(); }
  },

  /* AC-05 XSS, AC-12, 58, 60, 63, 67 */
  async thaigiao() {
    const P = await open();
    try {
      await enter(P, 'none');
      if (!(await P.has('thaigiao'))) { wait('Thai giáo', 'chưa có màn thaigiao'); return; }
      await P.go('thaigiao');
      const t = await P.text();
      check('AC-58: có "Mẹ đã làm rồi ✓", "Đổi lời nhắc khác", "Để hôm khác"', /Mẹ đã làm rồi ✓/.test(t) && /Đổi lời nhắc khác/.test(t) && /Để hôm khác/.test(t));
      check('AC-12: chế độ không lưu có dòng "đóng trang là mất"', /đóng trang là mất/.test(t));
      check('AC-60: màn Thai giáo không có chuỗi ngày / huy hiệu', !/ngày liền|chuỗi ngày|huy hiệu/i.test(t));
      const p1 = await P.ev("(document.querySelector('#main') || {}).innerText.match(/TG-\\d\\d|Hôm nay chị[^\\n]*|Chị [^\\n]*/) ? 1 : 0");
      void p1;
      const ta = await P.ev("!!document.querySelector('#main textarea')");
      if (!ta) { check('AC-63: có ô viết lời nhắn', false); return; }
      await P.ev(`(() => { const t = document.querySelector('#main textarea'); t.focus(); t.value = ${JSON.stringify(XSS)}; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      await P.clickText('Tải lời nhắn về máy');
      await sleep(300);
      check('AC-05: chữ <img onerror> ở ô lời nhắn không chạy (window.__xss vẫn undefined)', await P.ev('window.__xss === undefined'));
    } finally { await P.kill(); }
  },

  /* K-AC-01…45 phần giao diện, tua giờ thật (R-01, R-09) */
  async kick() {
    const P = await open();
    try {
      await enter(P, 'local');
      const miss = await needScreens(P, ['kick_home', 'kick_before', 'kick_pause5', 'kick_count']);
      if (miss.length) { wait('luồng Đếm cử động thai', 'chưa có màn: ' + miss.join(', ')); return; }
      await P.go('kick_home');
      await P.clickText('Đã hiểu');
      check('K-AC-60: trang mục có M-05', /Không ai theo dõi ngay lúc chị đếm/.test(await P.text()));
      await P.clickText('👣 Bắt đầu đếm ›');
      check('K-AC-01: "Bắt đầu đếm" → Trước khi đếm', await P.screen() === 'kick_before', await P.screen());
      await P.clickText('Bắt đầu ›');
      check('→ Dừng 5 giây cùng con', await P.screen() === 'kick_pause5', await P.screen());
      await P.clickText('Bỏ qua');
      check('K-AC-01/05: "Bỏ qua" → màn đếm', await P.screen() === 'kick_count', await P.screen());
      for (let i = 0; i < 3; i++) { await P.tick(1500); await P.clickText('👣 Con vừa đạp'); }
      check('K-AC-15: bấm "👣 Con vừa đạp" 3 lần (cách 1,5 s) → bộ đếm 3', /(^|\s)3 lần(\s|$)/.test(await P.text()), (await P.text()).slice(0, 200));
      check('K-AC-20: 3 lần → chưa có "Xong ✓"', !/Xong ✓/.test(await P.text()));
      const st = await P.storage();
      check('K-AC-51: lượt dở ghi ngay ở localStorage lstp_kick_active', st.l.includes('lstp_kick_active'), JSON.stringify(st));
      await P.tick(60 * MIN);
      const t60 = await P.text();
      check('K-AC-25: tới T+60 với 3 lần → thẻ ◆ "Giờ vừa rồi con cử động 3 lần.", "Giờ thứ 2"', /Giờ vừa rồi con cử động 3 lần\./.test(t60) && /Giờ thứ 2/.test(t60), t60.slice(0, 300));
      await P.reload(); await sleep(600);
      // K-AC-37 theo thiết kế C-1 (29/10): mở lại → Trang chính có dải ◆; chị bấm dải → màn đếm giờ 2 (đặc tả cần cập nhật chữ K-AC-37)
      const strip37 = await P.ev("(s => !!s && !s.hidden ? s.innerText : '')(document.querySelector('#kick-strip'))");
      check('K-AC-37/R-09: tải lại giữa giờ 2 → có dải ◆ "Đang đếm cử động thai… Về màn đếm ›"', /◆/.test(strip37) && /Về màn đếm ›/.test(strip37), await P.screen() + ' · ' + strip37);
      if (await P.screen() !== 'kick_count') await P.click('#kick-strip .kick-strip-btn');
      check('K-AC-37: bấm dải → màn đếm giờ thứ 2 có thẻ ◆', await P.screen() === 'kick_count' && /Giờ thứ 2/.test(await P.text()), await P.screen());
      await P.tick(61 * MIN);
      if (await P.screen() !== 'see_doctor') await P.go('kick_home');
      const tr = await P.text();
      check('K-AC-28/38: tới T+120 với 3 + 0 → trang khẩn chung có M-121 và M-122, không "Mình chọn nhầm"', await P.screen() === 'see_doctor' && /Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống\./.test(tr) &&
        /Trong 2 giờ, con cử động chưa đủ 10 lần\./.test(tr) && !/Mình chọn nhầm/.test(tr), await P.screen() + ' · ' + tr.slice(0, 300));
      check('K-AC-35: trang khẩn có <a href="tel:115">, không phát âm thanh', await P.ev("!!document.querySelector('#main a[href=\"tel:115\"]')"));
      const st2 = await P.storage();
      check('K-AC-51: lượt đỏ lưu ở lstp_kick_sessions, lượt dở đã xóa', st2.l.includes('lstp_kick_sessions') && !st2.l.includes('lstp_kick_active'), JSON.stringify(st2));
      check('K-AC-51: không request nào tới script.google.com từ mục đếm', !googleHits.some(h => h.startsWith('kick')));
      check('không lỗi console / exception', !P.errors.length && !(await P.qa()).errors.length, P.errors.concat((await P.qa()).errors).join(' | '));
    } finally { await P.kill(); }
  },

  /* AC-99…108 */
  async habits() {
    const P = await open();
    try {
      await enter(P, 'local');
      if (!(await P.has('habits'))) { wait('Nhật ký thói quen', 'chưa có màn habits'); return; }
      await P.go('habits');
      const pressed = () => P.ev("[...document.querySelectorAll('#main [aria-pressed]')].map(b => b.getAttribute('aria-pressed'))");
      const before = await pressed();
      check('AC-99: thói quen là nút có aria-pressed', before.length >= 5, JSON.stringify(before));
      check('AC-100: "Vận động sau ăn" mặc định tắt (không có ở màn hôm nay)', !/Vận động sau ăn/.test(await P.text()));
      await P.clickText('💧 Uống đủ nước');
      check('AC-99: chạm "Uống đủ nước" → aria-pressed đổi', JSON.stringify(await pressed()) !== JSON.stringify(before));
      if (await P.has('habits_stats')) {
        await P.go('habits_stats');
        const t = await P.text();
        check('AC-106: thống kê không "mất chuỗi", "thất bại"', !/mất chuỗi|thất bại|cố lên kẻo/i.test(t));
        check('AC-104/105: có "Tháng này chị đã làm" và "7 ngày qua"', /Tháng này chị đã làm \d+ ngày\./.test(t) && /7 ngày qua/.test(t), t.slice(0, 300));
      } else wait('AC-103…106 thống kê', 'chưa có habits_stats');
    } finally { await P.kill(); }
  },

  /* AC-01, 375×667 và 320×568 không cuộn ngang */
  async layout() {
    for (const [w, h] of [[375, 667], [320, 568]]) {
      const P = await open({ width: w, height: h, tag: w + 'x' + h });   // mỗi cỡ một profile Chrome riêng
      try {
        await enter(P, 'local');
        const names = (await P.ev('LSTP_APP.screens ? LSTP_APP.screens() : []')).filter(n => !/^(login|register|consent_account|forgot_pin|reset_pin|player)$/.test(n));
        const over = [];
        for (const n of names) {
          await P.go(n);
          const r = await P.ev('[document.documentElement.scrollWidth, document.documentElement.clientWidth]');
          if (r[0] > r[1] + 1) over.push(n + ' (' + r[0] + '>' + r[1] + ')');
          await P.ev("LSTP_APP.resetTo('home')"); await sleep(80);
        }
        check('AC-01: ' + w + '×' + h + ' – ' + names.length + ' màn không cuộn ngang', names.length > 0 && !over.length, over.join(', '));
      } finally { await P.kill(); }
    }
  },

  /* AC-03: đổi màn thì focus vào h1; header luôn có Hỗ trợ */
  async a11y() {
    const P = await open();
    try {
      await enter(P, 'local');
      const names = (await P.ev('LSTP_APP.screens()')).filter(n => !/^(login|register|consent_account|forgot_pin|reset_pin)$/.test(n));
      const noFocus = [], noSupport = [];
      for (const n of names) {
        await P.go(n);
        if (!(await P.ev("!!document.activeElement && /^H[12]$/.test(document.activeElement.tagName)"))) noFocus.push(n);
        if (!(await P.ev("!!document.querySelector('#header [data-go=support]')"))) noSupport.push(n);
        await P.ev("LSTP_APP.resetTo('home')"); await sleep(80);
      }
      check('AC-03: ' + names.length + ' màn – đổi màn thì focus vào tiêu đề', !noFocus.length, noFocus.join(', '));
      check('AC-01: nút "Hỗ trợ" ở header mọi màn', !noSupport.length, noSupport.join(', '));
      limit('K-AC-64 tương phản ≥ 4,5:1 / 3:1 mọi trạng thái', 'nền gradient + lớp mờ: đo bằng mắt/công cụ ở 14.5; UX 4.2 đã đo bảng màu');
      limit('K-AC-65 đi trọn mục đếm chỉ bằng Tab, :focus-visible rõ', 'e2e kiểm Enter/Space trên nút và vòng bụng, focus tiêu đề khi đổi màn; nhìn viền focus kiểm tay ở 14.5');
    } finally { await P.kill(); }
  },

  /* AC-09, 49: ẩn danh không request mang dữ liệu; không AudioContext khi chưa bấm Phát */
  async network() {
    const P = await open();
    const reqs = [];
    P.page.on('Network.requestWillBeSent', p => reqs.push({ url: p.request.url, method: p.request.method }));
    try {
      await enter(P, 'local');
      for (const n of await P.ev('LSTP_APP.screens()')) if (!/^(player|login|register|consent_account|forgot_pin|reset_pin)$/.test(n)) { await P.go(n); await P.ev("LSTP_APP.resetTo('home')"); }
      const ext = reqs.filter(r => !r.url.startsWith(srv.url) && !/^data:|fonts\.(googleapis|gstatic)\.com/.test(r.url));
      check('AC-09: ẩn danh đi mọi màn → không request nào ra ngoài (ngoài font)', !ext.length, ext.map(r => r.url).join(' | '));
      check('AC-09: không POST nào', !reqs.some(r => r.method === 'POST'), reqs.filter(r => r.method === 'POST').map(r => r.url).join(' | '));
      check('AC-49: đi mọi màn mà không bấm Phát → 0 AudioContext', (await P.qa()).audioCtx === 0, (await P.qa()).audioCtx);
      check('không alert/confirm/prompt nào được gọi', !(await P.qa()).alerts.length, (await P.qa()).alerts.join(' | '));
    } finally { await P.kill(); }
  },

  /* Bước B: AC-81…98 (T-QB, cần tools/mock-api.js) */
  async account() {
    const names = ['AC-81 đăng ký', 'AC-82 ô nhập PIN', 'AC-83 PIN chỉ trong thân POST', 'AC-85 đăng nhập đúng', 'AC-86 sai PIN câu giống nhau', 'AC-87 khóa 5 lần',
      'AC-88 quên PIN', 'AC-89 đăng xuất', 'AC-90 tự đăng xuất', 'AC-91 phiên hết hạn', 'AC-92 xóa tài khoản', 'AC-98 hàng chờ', 'AC-115…121 đồng ý gửi chữ'];
    const cfg = fs.readFileSync(path.join(APP, 'js', 'config.js'), 'utf8');
    if (!fs.existsSync(path.join(APP, 'tools', 'mock-api.js')) || /ACCOUNT_ENABLED:\s*false/.test(cfg)) { names.forEach(n => wait(n, 'Bước B: chờ tools/mock-api.js + account.js (T-B1, T-B2, T-QB)')); return; }
    const P = await open();
    try { await P.load(); await assertSafeConfig(P); names.forEach(n => wait(n, 'kịch bản account sẽ viết ở T-QB')); } finally { await P.kill(); }
  }
};

/* ===== Script thử của dev đã gộp (tests/e2e/dev-*.js): chạy với khung an toàn của QA =====
   ctx.launch: Chrome của test + chặn script.google ở Fetch domain + chặn trong trang (báo về qua Runtime binding)
   ctx.startStatic: luôn MOCK (GOOGLE_SCRIPT_URL=''), cổng riêng; ctx.T ghi vào kết quả chung. */
const GUARD = `(() => {
  const bad = u => /script\\.google(usercontent)?\\.com/.test(String(u));
  const tell = u => { try { window.__qaGoogle(String(u)); } catch (e) {} };
  const of = window.fetch && window.fetch.bind(window);
  window.fetch = (u, i) => { const x = u && u.url || u; if (bad(x)) { tell(x); return Promise.reject(new Error('QA chặn script.google')); } return of(u, i); };
  const xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { if (bad(u)) { tell(u); throw new Error('QA chặn script.google'); } return xo.apply(this, arguments); };
  if (navigator.sendBeacon) { const sb = navigator.sendBeacon.bind(navigator); navigator.sendBeacon = (u, d) => { if (bad(u)) { tell(u); return false; } return sb(u, d); }; }
})();`;
let devPort = 0, devLaunch = 0;
function devCtx(extra) {
  fs.mkdirSync(process.env.TMPDIR || os.tmpdir(), { recursive: true });   // NS-4: script dev ghi ảnh vào $TMPDIR/...
  return Object.assign({
    APP, sleep,
    T: (n, ok, d) => check(n, ok, d),
    async startStatic() {
      const s = await startStatic({ port: 8800 + (devPort++ % 40), appDir: APP, mock: true, mockUrl: MOCK_URL, account: false });
      const u = (/^\s*GOOGLE_SCRIPT_URL:\s*'([^']*)'/m.exec(s.servedConfig) || [])[1];
      if (u !== '') { await s.close(); throw new Error('AN TOÀN: config phục vụ còn GOOGLE_SCRIPT_URL – DỪNG'); }
      return s;
    },
    async launch(o) {
      const r = await launch(Object.assign({}, o, { userDataDir: path.join(OUT, 'ud-' + scenario + '-' + (devLaunch++)) }));
      const page = r.page;
      const sc = scenario;
      page.on('Network.requestWillBeSent', p => { if (GOOGLE.test(p.request.url)) googleHits.push(sc + ': ' + p.request.url); });
      page.on('Runtime.bindingCalled', p => { if (p.name === '__qaGoogle') googleHits.push(sc + ' (chặn trong trang): ' + p.payload); });
      await page.send('Runtime.addBinding', { name: '__qaGoogle' });
      await page.send('Fetch.enable', { patterns: [{ urlPattern: '*script.google.com/*' }, { urlPattern: '*script.googleusercontent.com/*' }] });
      page.on('Fetch.requestPaused', async p => { googleHits.push(sc + ' (Fetch chặn): ' + p.request.url); try { await page.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }); } catch (e) { /* đã hủy */ } });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: GUARD });
      return r;
    }
  }, extra || {});
}
const DEV = {
  'dev-fe1': () => require('./e2e/dev-fe1')(devCtx()),
  'dev-relax': () => require('./e2e/dev-relax')(devCtx()),
  'dev-relax-music': () => require('./e2e/dev-relax')(devCtx({ music: true })),
  'dev-relax-320': () => require('./e2e/dev-relax')(devCtx({ width: 320 })),
  'dev-fe5': () => require('./e2e/dev-fe5')(devCtx()),
  'dev-fe5-invite': () => require('./e2e/dev-fe5-invite')(devCtx()),
  // FE-4 giả định ba lượt (bắt đầu T, T+200′, T+200′) cùng ô Trưa (11:00–16:59 giờ VN) → ghim đồng hồ lúc 12:00 giờ VN 29/10/2026
  'dev-kick': () => require('./e2e/dev-kick')(devCtx({ base: T0 + 4 * 60 * MIN - Date.now() })),
  'dev-kick2': () => require('./e2e/dev-kick2')(devCtx())
};
/* Kịch bản bổ sung của QA (T-Q2) ở tests/e2e/qa-*.js: nhận bộ công cụ chung */
const TOOLS = { open, enter, check, wait, limit, sleep, needScreens, assertSafeConfig, T0, MIN, XSS, FOREIGN, GOOGLE, googleHits, srvUrl: () => srv.url };
const QA_MORE = {};
for (const f of fs.readdirSync(path.join(__dirname, 'e2e')).filter(n => /^qa-.*\.js$/.test(n)).sort()) Object.assign(QA_MORE, require('./e2e/' + f)(TOOLS));
const ALL_SCENARIOS = Object.assign({}, Object.fromEntries(Object.entries(SCENARIOS).filter(([k]) => k !== 'account')), QA_MORE, DEV, { account: SCENARIOS.account });

/* ===== Chạy ===== */
(async () => {
  const t0 = Date.now();
  try {
    srv = await startStatic({ port: PORT, appDir: APP, mock: true, mockUrl: MOCK_URL, account: false });
    /* Lớp 1: bản config phục vụ cho test không còn URL Apps Script thật */
    const u = (/^\s*GOOGLE_SCRIPT_URL:\s*'([^']*)'/m.exec(srv.servedConfig) || [])[1];
    if (u !== '' || !/MOCK:\s*true/.test(srv.servedConfig)) throw new Error('AN TOÀN: config phục vụ còn GOOGLE_SCRIPT_URL="' + u + '" hoặc MOCK chưa bật – DỪNG');
    for (const [name, fn] of Object.entries(ALL_SCENARIOS)) {
      if (ONLY && !ONLY.includes(name)) continue;
      scenario = name;
      try { await fn(); } catch (e) { rec('FAIL', 'kịch bản chạy hết', e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); if (/AN TOÀN/.test(String(e && e.message))) throw e; }
    }
  } catch (e) {
    console.log('LỖI KHUNG TEST: ' + (e && e.stack || e));
    process.exitCode = 2;
  } finally {
    if (srv) await srv.close();
  }
  const c = s => results.filter(r => r.status === s).length;
  if (googleHits.length) console.log('\nAN TOÀN: ' + googleHits.length + ' request tới script.google.com:\n  ' + googleHits.join('\n  '));
  if (knownLimits.length) {
    console.log('\nGiới hạn đã biết (không tính vào số xanh): ' + knownLimits.length);
    knownLimits.forEach(k => console.log('  · [' + k.scenario + '] ' + k.name + ' — ' + k.why));
  }
  fs.writeFileSync(path.join(OUT, 'e2e-results.json'), JSON.stringify({ ran_at: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), results, knownLimits, googleHits }, null, 1));
  console.log('\ne2e: ' + c('PASS') + ' PASS · ' + c('FAIL') + ' FAIL · ' + c('CHỜ') + ' CHỜ · ' + knownLimits.length + ' giới hạn đã biết · ' + googleHits.length + ' request Google · ' + Math.round((Date.now() - t0) / 1000) + ' s');
  if (fails || googleHits.length) process.exitCode = 1;
})();
