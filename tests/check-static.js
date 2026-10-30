/* =========================================================
   Rà tĩnh – Mẹ Bầu An Yên (chủ: qa-tester; T-00 dựng khung, T-Q1 mở rộng theo tech design 14.4).
   Chạy: node tests/check-static.js [--strict] [-v]
     --strict: MOCK phải false, chuỗi Phụ lục A còn THIẾU ở màn đã làm tính FAIL (dùng trước khi phát hành).
     -v: in cả từng chuỗi microcopy PASS.
   Trạng thái: PASS · FAIL (exit 1) · WARN (không chặn) · CHỜ (phần app chưa có: không xanh, không đỏ).
   Kiểm:
   1. node --check mọi .js của app, tests/, tools/, google_apps_script.js; không có file *.conflict* (Drive).
   2. index.html: lang="vi", viewport không chặn phóng to, referrer no-referrer, thứ tự 18 <script> (3.1), không script
      nội tuyến/ngoài, stylesheet ngoài chỉ Google Fonts, file tồn tại; CSP đủ từng chỉ thị (3.1), không *, không unsafe-eval,
      media-src khớp MUSIC_HOSTS, connect-src chỉ Apps Script + mock local.
   3. Mã (bỏ comment, bỏ chữ trong chuỗi khi grep hành vi): không Web Speech, voice.js, alert/confirm/prompt, onclick=,
      on…= trong HTML của chuỗi, localStorage/sessionStorage.clear(), <audio autoplay>/preload auto, eval/new Function,
      document.cookie, indexedDB, script YouTube; mạng (fetch/XHR/sendBeacon/WebSocket) chỉ ở js/api.js; window.open và
      target=_blank phải noopener; console.* không in pin/token/body; file thuần (util, data, engine, kick-rules, stats)
      không DOM/storage/Date.now()/new Date()/Math.random (trừ util.randomId dự phòng).
   4. Web Storage: chỉ khóa lstp_ (getItem/setItem/removeItem với chuỗi), mọi chuỗi 'lstp_…' nằm trong bảng 5.3,
      chỉ js/store.js gọi thẳng localStorage/sessionStorage.
   5. HTML từ dữ liệu: template có thẻ HTML không được chèn ${…text/note/value/phoneMasked/liên hệ/nhạc} mà không qua esc();
      không insertAdjacentHTML/outerHTML/document.write; innerHTML không nhận thẳng getItem/JSON.parse.
   6. config.js: ngưỡng đã duyệt, FEATURES đã duyệt, liên hệ trống/đúng dạng, MOCK, MOCK_URL chỉ 127.0.0.1/localhost,
      ACCOUNT_ENABLED/TEXT_SYNC_ENABLED, GOOGLE_SCRIPT_URL, không khóa/giá trị giống bí mật, không SĐT viết cứng.
   7. Header "Chủ:" ở mọi js/, css/, styles.css.
   8. Microcopy nguyên văn Phụ lục A (tests/lib/microcopy.js; tự đối chiếu danh mục với PRD hiện tại):
      nhóm chưa làm → CHỜ; màn đã làm mà thiếu chuỗi → WARN THIẾU (--strict: FAIL); chuỗi gần giống mà sai chữ → FAIL.
   9. Từ cấm biến thể Hồng ấm (style guide 2, 5; AC-06, 54, 46, 60, 106; K-AC-48, 49) trong chữ hiển thị.
   10. Whitelist đồng bộ data.js ↔ google_apps_script.js, luật PIN yếu, hằng 14/280 (CHỜ tới khi có file backend).
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const { scan, visible } = require('./lib/jsscan');
const CATALOG = require('./lib/microcopy');

const APP = path.resolve(__dirname, '..');
const DOCS = path.resolve(APP, '..', '..', 'docs', 'specs');
const STRICT = process.argv.includes('--strict');
const VERBOSE = process.argv.includes('-v');
const read = f => fs.readFileSync(path.join(APP, f), 'utf8');
const exists = f => fs.existsSync(path.join(APP, f));
let fails = 0, warns = 0, passes = 0, waits = 0;
const short = d => String(d).replace(/\s+/g, ' ').slice(0, 300);
const T = (name, ok, detail) => { ok ? passes++ : fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? '  → ' + short(detail) : '')); return ok; };
const W = (name, ok, detail) => { if (!ok) warns++; else passes++; console.log((ok ? 'PASS ' : 'WARN ') + name + (detail !== undefined && !ok ? '  → ' + short(detail) : '')); return ok; };
const WAIT = (name, why) => { waits++; console.log('CHỜ  ' + name + (why ? '  → ' + why : '')); };
const section = s => console.log('\n=== ' + s + ' ===');
const stripHtml = s => s.replace(/<!--[\s\S]*?-->/g, '');

function listFiles(dir, ext) {
  const d = path.join(APP, dir);
  if (!fs.existsSync(d)) return [];
  const out = [];
  for (const n of fs.readdirSync(d)) {
    const rel = path.join(dir, n).split(path.sep).join('/');
    if (fs.statSync(path.join(APP, rel)).isDirectory()) out.push(...listFiles(rel, ext));
    else if (n.endsWith(ext)) out.push(rel);
  }
  return out;
}
const JS = listFiles('js', '.js');
const SRC = Object.fromEntries(JS.map(f => [f, scan(read(f))]));
const isStub = f => /STUB của T-00/.test(read(f));
const lineOf = (txt, idx) => txt.slice(0, idx).split('\n').length;
const grepBare = (re, files) => {
  const hits = [];
  for (const f of files || JS) { const b = SRC[f].bare; let m; const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); while ((m = g.exec(b))) hits.push(f + ':' + lineOf(b, m.index)); }
  return hits;
};

/* ===== 1. Cú pháp ===== */
section('1. Cú pháp');
const allJs = [...JS, ...listFiles('tests', '.js'), ...listFiles('tools', '.js')].concat(exists('google_apps_script.js') ? ['google_apps_script.js'] : []);
const bad = [];
for (const f of allJs) { const r = spawnSync(process.execPath, ['--check', path.join(APP, f)], { encoding: 'utf8' }); if (r.status !== 0) bad.push(f + ': ' + r.stderr.split('\n').slice(0, 4).join(' ')); }
T('node --check ' + allJs.length + ' file .js (app, tests, tools, Apps Script)', !bad.length, bad.join(' | '));

/* ===== 1b. File trùng do đồng bộ Drive (*.conflict*) – lên web là mã cũ (review Bước A, NS-5) ===== */
{
  const conflicts = [];
  const walk = d => { for (const n of fs.readdirSync(path.join(APP, d))) { if (n === '.git' || n === 'node_modules') continue; const rel = d ? d + '/' + n : n; const st = fs.statSync(path.join(APP, rel)); if (st.isDirectory()) walk(rel); else if (/\.conflict/i.test(n)) conflicts.push(rel); } };
  walk('');
  T('không có file *.conflict* (bản trùng do đồng bộ Drive) trong thư mục app', !conflicts.length,
    conflicts.join(', ') + ' — so với file chính, giữ bản đúng, xóa file .conflict');
}

/* ===== 2. index.html ===== */
section('2. index.html, CSP');
const html = stripHtml(read('index.html'));
const ORDER = ['config', 'util', 'data', 'engine', 'kick-rules', 'stats', 'store', 'api', 'sync', 'sound', 'players',
  'relax', 'thaigiao', 'habits', 'journey', 'kick', 'account', 'app'].map(n => 'js/' + n + '.js');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
T('index.html: lang="vi"', /<html[^>]*\blang="vi"/.test(html));
T('index.html: viewport không chặn phóng to (không user-scalable=no / maximum-scale)', /name="viewport"/.test(html) && !/user-scalable\s*=\s*(no|0)|maximum-scale/i.test(html));
T('index.html: <meta name="referrer" content="no-referrer">', /<meta\s+name="referrer"\s+content="no-referrer"/.test(html));
T('index.html: thứ tự <script> đúng tech design 3.1 (18 file, app.js cuối)', JSON.stringify(scripts) === JSON.stringify(ORDER), scripts.join(' → '));
T('index.html: không <script> nội tuyến, không script ngoài', !/<script(?![^>]*\bsrc=)[^>]*>/.test(html) && !scripts.some(s => /^(https?:)?\/\//.test(s)));
for (const s of scripts) if (!exists(s)) T('tồn tại ' + s, false);
const sheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]);
T('index.html: stylesheet ngoài chỉ fonts.googleapis.com; file nội bộ tồn tại', sheets.every(h => /^https:\/\/fonts\.googleapis\.com\//.test(h) || (!/^(https?:)?\/\//.test(h) && exists(h))), sheets.join(', '));
T('index.html: không onclick=/on…= nội tuyến, không Web Speech', !/\son[a-z]+\s*=/i.test(html) && !/speechSynthesis/i.test(html));
const csp = (/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html) || [])[1] || '';
const dir = name => ((new RegExp('(?:^|;)\\s*' + name + '\\s+([^;]*)').exec(csp) || [])[1] || '').trim().split(/\s+/).filter(Boolean);
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
T('CSP có mặt', !!csp);
T("CSP default-src 'self'", same(dir('default-src'), ["'self'"]), dir('default-src').join(' '));
T("CSP script-src chỉ 'self' (không unsafe-inline/unsafe-eval/host ngoài)", same(dir('script-src'), ["'self'"]), dir('script-src').join(' '));
T("CSP object-src 'none', base-uri 'none', form-action 'none'", same(dir('object-src'), ["'none'"]) && same(dir('base-uri'), ["'none'"]) && same(dir('form-action'), ["'none'"]));
T("CSP style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", same(dir('style-src'), ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']), dir('style-src').join(' '));
T('CSP font-src https://fonts.gstatic.com', same(dir('font-src'), ['https://fonts.gstatic.com']), dir('font-src').join(' '));
T("CSP img-src 'self' data:", same(dir('img-src'), ["'self'", 'data:']), dir('img-src').join(' '));
const CONNECT_OK = ["'self'", 'https://script.google.com', 'https://script.googleusercontent.com', 'http://127.0.0.1:8790', 'http://localhost:8790'];
T('CSP connect-src chỉ self + Apps Script + mock 127.0.0.1/localhost:8790', dir('connect-src').length > 0 && dir('connect-src').every(x => CONNECT_OK.includes(x)), dir('connect-src').join(' '));
T("CSP frame-src 'none' hoặc chỉ youtube-nocookie (AC-113 v1.0: không nhúng)", dir('frame-src').every(x => x === "'none'" || x === 'https://www.youtube-nocookie.com'), dir('frame-src').join(' '));
T("CSP không có '*' hay 'unsafe-eval' ở bất kỳ chỉ thị nào", !/(^|\s)\*(\s|;|$)|unsafe-eval/.test(csp), csp);

/* ===== 3. Mã ===== */
section('3. Mã nguồn (bỏ comment)');
const FORBID = [
  [/speechSynthesis|SpeechSynthesisUtterance/, 'Web Speech (AC-04, K-AC-14)', 'code'],
  [/voice\.js/, 'voice.js', 'code'],
  [/(?<![\w$.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/, 'alert/confirm/prompt (AC-06, K-AC-49)', 'bare'],
  [/\bonclick\s*=/i, 'onclick=', 'code'],
  [/(?:localStorage|sessionStorage)\s*\.\s*clear\s*\(/, 'localStorage/sessionStorage.clear() (AC-15, K-AC-56)', 'code'],
  [/<audio[^>]*\bautoplay|\.autoplay\s*=\s*true/i, '<audio autoplay> (AC-49, K-AC-14)', 'code'],
  [/preload\s*[=:]\s*["']?auto/i, 'preload="auto" (AC-112: phải preload="none")', 'code'],
  [/\beval\s*\(|new\s+Function\s*\(/, 'eval / new Function', 'bare'],
  [/document\s*\.\s*cookie/, 'document.cookie (AC-11)', 'bare'],
  [/\bindexedDB\b/, 'indexedDB (AC-11)', 'bare'],
  [/youtube\.com\/iframe_api|YT\.Player/, 'script YouTube (9, K-10)', 'code']
];
for (const [re, why, mode] of FORBID) {
  const hit = JS.filter(f => re.test(mode === 'bare' ? SRC[f].bare : SRC[f].code));
  T('không có ' + why, hit.length === 0, hit.join(', '));
}
const inlineOn = [];
for (const f of JS) for (const s of SRC[f].strings) if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(s.text)) inlineOn.push(f + ':' + s.line);
T('chuỗi HTML không có thuộc tính on…= (CSP chặn, dùng data-act)', !inlineOn.length, inlineOn.join(', '));
const net = grepBare(/\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket|new\s+EventSource/).filter(h => !h.startsWith('js/api.js:'));
T('mạng chỉ đi qua js/api.js (AC-09: ẩn danh không gửi gì)', !net.length, net.join(', '));
const wopen = [];
for (const f of JS) { const c = SRC[f].code; let m; const g = /window\.open\s*\(([^;]*)/g; while ((m = g.exec(c))) if (!/noopener/.test(m[1])) wopen.push(f + ':' + lineOf(c, m.index)); }
T('window.open luôn có noopener,noreferrer (AC-113)', !wopen.length, wopen.join(', '));
const blank = [];
for (const f of JS) for (const s of SRC[f].strings) if (/target=["']?_blank/.test(s.raw) && !/noopener/.test(s.raw)) blank.push(f + ':' + s.line);
T('target="_blank" luôn kèm rel="noopener noreferrer" (AC-113)', !blank.length, blank.join(', '));
const logs = grepBare(/console\.(?:log|info|debug|warn|error)\s*\([^;\n]*\b(?:pin|token|body|PIN)\b/);
T('console.* không in pin/token/body (AC-83)', !logs.length, logs.join(', '));
const PURE = ['js/util.js', 'js/data.js', 'js/engine.js', 'js/kick-rules.js', 'js/stats.js'];
for (const f of PURE.filter(exists)) {
  const b = SRC[f].bare;
  const why = [];
  if (/\bdocument\s*\.|\bwindow\.(?:addEventListener|location|document)/.test(b)) why.push('DOM');
  if (/localStorage|sessionStorage/.test(b)) why.push('storage');
  if (/Date\.now\s*\(|new\s+Date\s*\(\s*\)/.test(b)) why.push('tự lấy giờ');
  if (f !== 'js/util.js' && /Math\.random\s*\(/.test(b)) why.push('Math.random');
  T(f + ' thuần: không DOM, storage, Date.now()/new Date(), Math.random', !why.length, why.join(', '));
}

/* ===== 4. Web Storage ===== */
section('4. Khóa lưu trữ (bảng 5.3)');
const KEYS_53 = ['lstp_v1_local', 'lstp_v1_checkins', 'lstp_v1_thaigiao', 'lstp_v1_letters', 'lstp_v1_habits', 'lstp_v1_prefs', 'lstp_profile',
  'lstp_kick_sessions', 'lstp_kick_active', 'lstp_kick_prefs', 'lstp_v1_session', 'lstp_v1_pending', 'lstp_v1_acct', 'lstp_kick_acct_sessions'];
const PREFIXES = ['lstp_', 'lstp_kick_', 'lstp_v1_'];
const badKeys = [];
for (const f of JS) { const c = SRC[f].code; let m; const g = /\b(?:getItem|setItem|removeItem)\s*\(\s*(['"`])([^'"`]*)\1/g; while ((m = g.exec(c))) if (!m[2].startsWith('lstp_')) badKeys.push(f + ':' + m[2]); }
T('getItem/setItem/removeItem với chuỗi: chỉ khóa lstp_ (AC-15)', !badKeys.length, badKeys.join(', '));
const unknown = [];
for (const f of JS) for (const s of SRC[f].strings) if (s.kind === 'q' && /^lstp_[\w]*$/.test(s.text) && !KEYS_53.includes(s.text) && !PREFIXES.includes(s.text)) unknown.push(f + ':' + s.line + ' ' + s.text);
T('mọi chuỗi khóa "lstp_…" nằm trong bảng 5.3 (không khóa nào khác)', !unknown.length, unknown.join(', '));
const direct = grepBare(/\b(?:localStorage|sessionStorage)\b/).filter(h => !h.startsWith('js/store.js:'));
T('chỉ js/store.js đụng thẳng localStorage/sessionStorage (màn hình đi qua S.*)', !direct.length, direct.join(', '));
const storeCode = exists('js/store.js') ? SRC['js/store.js'].bare : '';
T('store.js có chốt chặn khóa ngoài tiền tố lstp_ (guard)', /startsWith\(\s*PREFIX\s*\)|startsWith\(\s*['"]lstp_['"]\s*\)/.test(storeCode));

/* ===== 5. HTML từ dữ liệu ===== */
section('5. Chèn HTML (AC-05, AC-124, K-AC-57)');
const RISKY = /\.(?:text|note|value|phoneMasked|detail|title|url|source|license)\b|\b(?:EMERGENCY_OB|OB_CONTACT|CLINIC_CONTACT|SUPPORT_CHANNELS|MUSIC_LINKS)\b/;
function stripSafeCalls(expr) {
  let s = expr, guard = 0;
  const re = /(?:\b[\w$]+\.)?\b(?:esc|E|escHtml|escape|encodeURIComponent|String\(Number|Number|Math\.\w+|fmtDay|fmtDayShort)\s*\(/g;
  for (let m; (m = re.exec(s)) && guard++ < 200;) {
    let i = m.index + m[0].length, d = 1;
    while (i < s.length && d) { if (s[i] === '(') d++; else if (s[i] === ')') d--; i++; }
    s = s.slice(0, m.index) + 'SAFE' + s.slice(i); re.lastIndex = m.index + 4;
  }
  return s;
}
// Phần được CHÈN của biểu thức: bỏ lời gọi esc()/E(), chuỗi và template lồng (template lồng được quét riêng), khối {…} của
// hàm mũi tên, rồi chỉ giữ nhánh giá trị của ?: và vế sau của && (điều kiện không được chèn vào HTML).
function insertedPart(expr) {
  let e = stripSafeCalls(expr);
  for (let k = 0; k < 5; k++) e = e.replace(/`[^`]*`/g, 'TPL');
  e = e.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, 'STR');
  for (let k = 0; k < 5; k++) e = e.replace(/\{[^{}]*\}/g, 'BLK');
  const q = e.indexOf('?');
  if (q >= 0) e = e.slice(q + 1);
  const a = e.lastIndexOf('&&');
  if (a >= 0) e = e.slice(a + 2);
  return e;
}
const raw = [];
for (const f of JS) for (const it of SRC[f].interps) if (it.tplHasTag && RISKY.test(insertedPart(it.expr))) raw.push(f + ':' + it.line + ' ${' + it.expr.slice(0, 60) + '}');
T('template HTML không chèn text/note/value/liên hệ/nhạc… mà không qua esc()', !raw.length, raw.join(' | '));
const adj = grepBare(/insertAdjacentHTML|outerHTML\s*=|document\.write\s*\(/);
T('không insertAdjacentHTML / outerHTML= / document.write', !adj.length, adj.join(', '));
const ih = [];
for (const f of JS) { const c = SRC[f].code; let m; const g = /\.innerHTML\s*\+?=\s*([^;\n]*)/g; while ((m = g.exec(c))) if (/getItem\s*\(|JSON\.parse\s*\(|location\.|\.value\b/.test(m[1])) ih.push(f + ':' + lineOf(c, m.index)); }
T('innerHTML không nhận thẳng dữ liệu storage / ô nhập / URL', !ih.length, ih.join(', '));

/* ===== 6. config.js ===== */
section('6. config.js');
const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(read('js/config.js'), sb, { filename: 'js/config.js' });
const C = sb.window.LSTP_CONFIG || {};
const APPROVED = { KICK_HOUR_MIN: 60, KICK_GREEN_MIN_PER_HOUR: 4, KICK_EXTRA_HOURS_MAX: 1, KICK_RED_MIN_TOTAL_2H: 10, KICK_CELEBRATE_AT: 10, KICK_MIN_TAP_GAP_MS: 800,
  KICK_SLOTS_PER_DAY: 3, KICK_MAX_TAPS: 200, EDD_MIN_OFFSET_DAYS: -14, EDD_MAX_OFFSET_DAYS: 280, EMERGENCY_NUMBER: '115', TZ_OFFSET_MIN: 420 };
const badCfg = Object.entries(APPROVED).filter(([k, v]) => C[k] !== v).map(([k, v]) => k + '=' + C[k] + ' (duyệt ' + v + ')');
T('config: ngưỡng đếm, ngày dự sinh, 115, TZ đúng số anh duyệt (' + Object.keys(APPROVED).length + ' khóa)', !badCfg.length, badCfg.join(', '));
const FEAT = { pregnancyHarm: true, lossGroup: true, piiSkipBabyNames: true, signsItchVomit: false };
const badF = Object.entries(FEAT).filter(([k, v]) => !C.FEATURES || C.FEATURES[k] !== v).map(([k, v]) => k + '=' + (C.FEATURES || {})[k] + ' (duyệt ' + v + ')');
T('config FEATURES đúng quyết định 29/10/2026 (9.2b, 9.4b, câu 13 bật; 9.3 dòng 12–13 tắt)', !badF.length, badF.join(', '));
const phoneOk = p => p === '' || /^[0-9+ .]{3,16}$/.test(p);
for (const k of ['EMERGENCY_OB', 'OB_CONTACT', 'CLINIC_CONTACT']) T('config ' + k + ' trống hoặc đúng dạng (không tự bịa số)', C[k] && typeof C[k].name === 'string' && phoneOk(C[k].phone || ''), JSON.stringify(C[k]));
T('config SUPPORT_CHANNELS, MUSIC_LINKS, MUSIC_HOSTS là mảng', Array.isArray(C.SUPPORT_CHANNELS) && Array.isArray(C.MUSIC_LINKS) && Array.isArray(C.MUSIC_HOSTS));
const mediaSrc = dir('media-src');
const missingHosts = (C.MUSIC_HOSTS || []).filter(h => !mediaSrc.includes('https://' + h));
T('CSP media-src có mọi host trong MUSIC_HOSTS', !missingHosts.length, missingHosts.join(', '));
const extraHosts = mediaSrc.filter(m => m !== "'self'" && !(C.MUSIC_HOSTS || []).some(h => m === 'https://' + h));
W("CSP media-src không có host thừa ngoài 'self' + MUSIC_HOSTS", !extraHosts.length, extraHosts.join(', '));
T('MUSIC_LINKS: mỗi mục đủ title/url/kind/source/license, https, host ∈ MUSIC_HOSTS (AC-111)', (C.MUSIC_LINKS || []).every(m => m && ['title', 'url', 'kind', 'source', 'license'].every(k => typeof m[k] === 'string' && m[k]) &&
  /^https:\/\//.test(m.url) && (C.MUSIC_HOSTS || []).includes(new URL(m.url).hostname) && ['audio', 'youtube', 'link'].includes(m.kind)), JSON.stringify(C.MUSIC_LINKS));
(STRICT ? T : W)('config MOCK = false' + (STRICT ? ' (--strict)' : ''), C.MOCK === false, 'MOCK đang bật');
T('config MOCK_URL chỉ 127.0.0.1/localhost', /^http:\/\/(127\.0\.0\.1|localhost):\d+\//.test(C.MOCK_URL || ''), C.MOCK_URL);
T('config ACCOUNT_ENABLED chỉ khi có GOOGLE_SCRIPT_URL hoặc MOCK', !C.ACCOUNT_ENABLED || !!C.GOOGLE_SCRIPT_URL || C.MOCK === true);
T('config TEXT_SYNC_ENABLED chỉ khi ACCOUNT_ENABLED', !C.TEXT_SYNC_ENABLED || !!C.ACCOUNT_ENABLED);
T('config GOOGLE_SCRIPT_URL rỗng hoặc https://script.google.com/macros/s/…/exec', C.GOOGLE_SCRIPT_URL === '' || /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(C.GOOGLE_SCRIPT_URL), C.GOOGLE_SCRIPT_URL);
T('config ALLOW_DRAFT_CONTENT là boolean', typeof C.ALLOW_DRAFT_CONTENT === 'boolean');
const secretKey = Object.keys(C).filter(k => /secret|pepper|token|password|passwd|api_?key|private/i.test(k));
const cfgCode = SRC['js/config.js'].strings.map(s => s.text);
const secretVal = cfgCode.filter(v => /^[A-Fa-f0-9]{32,}$|^[A-Za-z0-9+/_-]{40,}={0,2}$/.test(v));
T('config không có khóa/giá trị giống bí mật (pepper, token, hex/base64 dài)', !secretKey.length && !secretVal.length, secretKey.concat(secretVal).join(', '));
const phones = JS.filter(f => SRC[f].strings.some(s => /(?<!\d)0[35789]\d{8}(?!\d)|\+84[35789]\d{8}/.test(s.text.replace(/[ .]/g, '')) && !/0912 ?345 ?678|\+?84912345678/.test(s.text)));
T('không SĐT di động viết cứng trong chuỗi js/ (trừ ví dụ 0912 345 678 của PRD)', !phones.length, phones.join(', '));

/* ===== 7. Header chủ file ===== */
section('7. Header "Chủ:"');
const owned = [...JS, ...listFiles('css', '.css'), 'styles.css'];
const noOwner = owned.filter(f => !/Chủ:|chủ:/.test(read(f).slice(0, 800)));
T('mọi file js/, css/, styles.css có "Chủ:" ở header (' + owned.length + ' file)', !noOwner.length, noOwner.join(', '));

/* ===== 8. Microcopy Phụ lục A ===== */
section('8. Microcopy nguyên văn Phụ lục A (PRD v1.0 + đặc tả mục đếm v1.0, bản đồng bộ 29/10)');
const NFC = s => String(s).normalize('NFC').replace(/️/g, '');
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 8a. Danh mục còn khớp tài liệu?
{
  const docFiles = ['lifestyle-thai-phu-prd.md', 'dem-cu-dong-thai-prd.md'].map(f => path.join(DOCS, f));
  if (!docFiles.every(f => fs.existsSync(f))) WAIT('danh mục microcopy khớp PRD hiện tại', 'không thấy docs/specs');
  else {
    const doc = NFC(docFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n').replace(/\*\*|`/g, '').replace(/(^|[^\w])\*([^*\n]+)\*/g, '$1$2').replace(/[ \t]+/g, ' '));
    const gone = [];
    for (const g of CATALOG) for (const it of g.items) if (!new RegExp(NFC(it).split(/\{[^}]*\}/).map(escRe).join('[\\s\\S]{0,160}?')).test(doc)) gone.push(g.id + ': ' + it);
    T('danh mục microcopy (' + CATALOG.reduce((n, g) => n + g.items.length, 0) + ' chuỗi) còn khớp PRD hiện tại (PRD đổi chữ → cập nhật tests/lib/microcopy.js)', !gone.length, gone.slice(0, 5).join(' | '));
  }
}
// 8b. Chữ hiển thị của từng file: chuỗi/template (không comment), bỏ thẻ HTML; app.js bỏ tiêu đề màn giữ chỗ
const SEP = '\u0001';
const hayOf = f => {
  let strings = SRC[f].strings;
  if (f === 'js/app.js') { const ph = new Set(); const c = SRC[f].code; let m; const g = /placeholder\(\s*(['"])([^'"]*)\1/g; while ((m = g.exec(c))) ph.add(m[2]); strings = strings.filter(s => !ph.has(s.text)); }
  // Chữ trong thuộc tính người dùng nghe/thấy (placeholder, aria-label, title, alt) cũng là chữ hiển thị
  const attrs = strings.flatMap(s => [...s.text.matchAll(/\b(?:aria-label|placeholder|title|alt|aria-description)\s*=\s*"([^"]*)"/g)].map(m => m[1]));
  return strings.map(s => NFC(visible(s.text))).concat(attrs.map(a => NFC(visible(a)))).filter(Boolean).join(SEP);
};
const HAY = Object.fromEntries(JS.map(f => [f, hayOf(f)]));
HAY['index.html'] = NFC(visible(html));
const ALL = Object.values(HAY).join(SEP);
const norm = s => NFC(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const ALLN = ' ' + ALL.split(SEP).map(norm).join(' | ') + ' ';
const SEGS = ALL.split(/[\u0000\u0001]/).flatMap(s => s.split(/(?<=[.!?…])\s+/)).map(s => s.trim()).filter(s => s.length >= 10);
const SEGN = SEGS.map(s => ({ s, n: norm(s) }));
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); if (cur[j] < best) best = cur[j]; }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
// 115 có thể đến từ C.EMERGENCY_NUMBER (chèn bằng ${…}) → cho khớp cả chỗ chèn
const matcher = it => new RegExp(NFC(it).split(/\{[^}]*\}/).map(p => escRe(p).replace(/\s+/g, '\\s+').replace(/115/g, '(?:115|\u0000)')).join('[\\s\\S]{0,160}?'));
const DECOR = /[\p{Extended_Pictographic}\u2190-\u21FF\u2500-\u27BF\u2B00-\u2BFF\u200D]/gu;
const bareText = s => NFC(s).replace(DECOR, '').replace(/\s+/g, ' ').trim();
const ITEMS = new Set(CATALOG.flatMap(g => g.items).map(x => NFC(x)));
function nearMiss(it) {
  if (/\{/.test(it) || it.length < 12) return null;
  // Chỉ khác emoji/hình ●◆▲ (mã ghép từ trường icon riêng) → không phải sai chữ
  if (bareText(it) && ALL.split(/[\u0000\u0001]/).some(x => bareText(x) === bareText(it))) return 'DECOR';
  const n = norm(it);
  if (!n) return null;
  if (ALLN.includes(' ' + n + ' ') || ALLN.includes(n)) {      // khác dấu/chữ hoa/dấu câu/emoji
    const hit = SEGN.find(x => x.n.includes(n));
    return hit ? hit.s : '(khác dấu câu / dấu thanh / chữ hoa)';
  }
  const max = Math.max(2, Math.floor(n.length * 0.12));
  for (const x of SEGN) if (!ITEMS.has(NFC(x.s)) && Math.abs(x.n.length - n.length) <= max && lev(x.n, n, max) <= max) return x.s;
  return null;
}
let mcPass = 0, mcMiss = 0, mcWait = 0, mcNear = 0;
for (const g of CATALOG) {
  const ownHay = g.owner.map(f => HAY[f] || '').join(SEP);
  const started = g.anchor ? g.anchor.some(a => matcher(a).test(ownHay)) : null;
  const res = g.items.map(it => {
    if (matcher(it).test(ALL)) return { it, st: 'ok' };
    const nm = nearMiss(it);
    if (nm === 'DECOR') return { it, st: 'ok', note: 'emoji/hình ghép riêng' };
    if (nm) return { it, st: 'near', nm };
    return { it, st: started === true ? 'miss' : 'wait' };
  });
  const c = k => res.filter(r => r.st === k).length;
  const owners = g.owner.join(', ');
  const ownersStub = g.owner.every(f => !exists(f) || isStub(f));
  for (const r of res) {
    if (r.st === 'ok') { mcPass++; passes++; if (VERBOSE) console.log('PASS ' + g.id + ': "' + r.it + '"'); }
    else if (r.st === 'near') { mcNear++; T(g.id + ': chữ gần giống nhưng KHÔNG nguyên văn "' + r.it + '"', false, 'trong mã: "' + r.nm + '"'); }
    else if (r.st === 'miss') { mcMiss++; (STRICT ? T : W)(g.id + ': THIẾU (màn đã làm, chưa thấy chuỗi) "' + r.it + '"', false, owners); }
    else { mcWait++; waits++; }
  }
  const tag = started === false ? (ownersStub ? 'CHỜ (file còn stub)' : 'CHỜ (chưa thấy câu mốc của màn)') : started === null ? 'chuỗi rời' : 'màn đã làm';
  console.log('  [nhóm ' + (c('near') ? 'có SAI CHỮ' : c('miss') ? 'có THIẾU' : c('wait') ? (c('ok') ? 'một phần' : 'chờ') : 'đủ') + '] ' + g.id + ' [' + owners + '] — ' + tag + ': ' + c('ok') + '/' + g.items.length + ' nguyên văn' +
    (c('miss') ? ', ' + c('miss') + ' THIẾU' : '') + (c('wait') ? ', ' + c('wait') + ' CHỜ' : '') + (c('near') ? ', ' + c('near') + ' SAI CHỮ' : ''));
}
console.log('Microcopy: ' + mcPass + ' nguyên văn · ' + mcNear + ' sai chữ (FAIL) · ' + mcMiss + ' thiếu ở màn đã làm (' + (STRICT ? 'FAIL' : 'WARN') + ') · ' + mcWait + ' CHỜ');

/* ===== 9. Từ cấm biến thể Hồng ấm ===== */
section('9. Từ cấm (Hồng ấm: chị/mình/con; style guide 2, 5)');
// Chữ hiển thị = chuỗi/template trong js/ (trừ data.js: duyệt bằng vm, bỏ KEYWORDS/PII/PIN/từ khóa của DANGER_SIGNS),
// index.html, README.md. Từ khóa an toàn không phải chữ hiển thị.
const dataStrings = (() => {
  try {
    const s2 = { window: {}, console };
    vm.createContext(s2);
    vm.runInContext(read('js/config.js'), s2); vm.runInContext(read('js/data.js'), s2);
    const D = s2.window.LSTP_DATA || {}, out = [];
    const walk = (v, p) => {
      if (typeof v === 'string') out.push({ p, v });
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']'));
      else if (v && typeof v === 'object' && Object.prototype.toString.call(v) !== '[object RegExp]') Object.keys(v).forEach(k => {
        if (['KEYWORDS', 'PII', 'PIN', 'strict', 'loose', 'exclude', 'patterns', 'keywords', 'words'].includes(k)) return;
        walk(v[k], p + '.' + k);
      });
    };
    walk(D, 'D');
    return out;
  } catch (e) { return [{ p: 'LỖI NẠP data.js', v: String(e) }]; }
})();
const displayOf = f => (f === 'js/data.js' ? dataStrings.map(x => x.v) : SRC[f].strings.map(s => visible(s.text)));
const README = exists('README.md') ? read('README.md') : '';
const WORD = w => new RegExp('(?<![\\p{L}])' + w + '(?![\\p{L}])', 'iu');
const RULES = [
  { name: 'AC-06: không xưng "bạn" (Hồng ấm xưng chị/mình/con)', files: JS, words: [WORD('bạn')] },
  { name: 'AC-06/K-AC-48: không "vui lòng", "hệ thống"', files: JS, words: [/vui lòng/i, /hệ thống/i], html: true },
  { name: 'AC-54: không hứa lợi ích (IQ, thông minh hơn, phát triển trí não/não bộ, thiên tài, chứng minh khoa học) — cả README', files: JS,
    words: [/\bIQ\b/, /thông minh hơn/i, /phát triển trí não/i, /phát triển não bộ/i, /thiên tài/i, /chứng minh khoa học/i], html: true, readme: true },
  { name: 'R-10/R-14/K-AC-48: mục đếm không trấn an, không khen tốc độ, không chữ kỹ thuật (kick.js, kick-rules.js)', files: ['js/kick.js', 'js/kick-rules.js'],
    words: ['bình thường', 'thông thường', 'bất thường', 'không sao', 'yên tâm', 'đừng lo', 'khỏe mạnh', 'an toàn rồi', 'tốt rồi', 'ổn rồi', 'giỏi quá', 'nhanh quá',
      'nước lạnh', 'đồ ngọt', 'lay bụng', 'FGR', 'SGA', 'Cardiff', 'baseline', 'mức xanh', 'mức vàng', 'mức đỏ', 'bỏ lỡ', 'quên', 'trễ'].map(w => WORD(w)) },
  { name: 'AC-106: thói quen/thống kê không "mất chuỗi", "thất bại", "cố lên kẻo", "huy hiệu" (habits.js, stats.js, journey.js)', files: ['js/habits.js', 'js/stats.js', 'js/journey.js'],
    words: [/mất chuỗi/i, /thất bại/i, /cố lên kẻo/i, /huy hiệu/i] },
  { name: 'AC-60: màn Thai giáo không đếm chuỗi ngày, không huy hiệu (thaigiao.js)', files: ['js/thaigiao.js'], words: [/chuỗi ngày/i, /huy hiệu/i, /\d+\s*ngày liền/i] },
  { name: 'AC-46: không "hóp bụng", "co ngón chân" (players.js, relax.js, data.js)', files: ['js/players.js', 'js/relax.js', 'js/data.js'], words: [/hóp bụng/i, /co ngón chân/i] },
  { name: 'R-14: không gợi ý đánh thức con (kick.js)', files: ['js/kick.js'], words: [/đánh thức con/i, /lay con dậy/i, /uống nước lạnh/i] }
];
for (const r of RULES) {
  const hits = [];
  for (const f of r.files.filter(exists)) for (const t of displayOf(f)) for (const w of r.words) if (w.test(t)) hits.push(f + ': "' + t.slice(0, 80) + '"');
  if (r.html) for (const w of r.words) if (w.test(visible(html))) hits.push('index.html');
  if (r.readme) for (const w of r.words) if (w.test(README)) hits.push('README.md');
  T(r.name, !hits.length, hits.slice(0, 4).join(' | '));
}
const red = listFiles('css', '.css').concat(['styles.css']).filter(f => /:\s*(?:red|#f00|#ff0000|rgb\(\s*255\s*,\s*0\s*,\s*0\s*\))\s*[;!}]/i.test(read(f)));
W('CSS không dùng đỏ thuần (Hồng ấm "Đỏ: không dùng"; ba mức dùng cặp màu UX + chữ + hình)', !red.length, red.join(', '));

/* ===== 10. Đồng bộ client ↔ Apps Script ===== */
section('10. Whitelist client ↔ google_apps_script.js (tech design 14.4, ADR 0005 mục 3)');
const GAS_NAMES = ['mã cảm xúc', 'tình huống', 'bài', 'phù hợp', 'thói quen', 'lời nhắc TG-01…16', 'bữa', 'mức', 'lý do', 'cảm nhận', 'dấu hiệu kickBefore', 'luật PIN yếu', 'hằng 14/280 ngày dự sinh',
  'ALLOW_PUBLIC_READ=false', 'không Logger.log/console.log pin/token/body', 'doGet không đọc dữ liệu'];
if (!exists('google_apps_script.js')) GAS_NAMES.forEach(n => WAIT('Apps Script: ' + n, 'chưa có google_apps_script.js (backend-dev, Bước B)'));
else {
  const gasRaw = read('google_apps_script.js');
  const gas = scan(gasRaw);
  const gasStr = new Set(gas.strings.map(s => s.text));
  { let m; const g = /(?:^|[{,\s])([A-Za-z_][\w-]*)\s*:/g; while ((m = g.exec(gas.bare))) gasStr.add(m[1]); }   // khóa object kiểu { happy: 'Vui vẻ' }
  let D = {};
  try { const s3 = { window: {}, console }; vm.createContext(s3); vm.runInContext(read('js/config.js'), s3); vm.runInContext(read('js/data.js'), s3); D = s3.window.LSTP_DATA || {}; } catch (e) { /* bỏ qua */ }
  const L = v => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
  const ids = v => L(v).map(x => (typeof x === 'string' ? x : x && (x.id || x.code))).filter(Boolean);
  const sync = (name, list) => { if (!list.length) return WAIT('Apps Script: ' + name, 'data.js chưa có danh mục'); const miss = list.filter(x => !gasStr.has(x)); T('Apps Script nhận đủ ' + name + ' (' + list.length + ')', !miss.length, 'thiếu: ' + miss.join(', ')); };
  sync('mã cảm xúc', ids(D.EMOTIONS)); sync('tình huống', ids(D.CONTEXTS)); sync('bài', ids(D.EXERCISES)); sync('phù hợp', ['fit', 'unfit', 'worse', 'unsure']);
  sync('thói quen', ids(D.HABITS));
  // Lời nhắc: server có thể dựng 'TG-01'…'TG-16' bằng vòng lặp → chạy riêng biểu thức PROMPTS trong sandbox nếu có
  {
    const m = /var\s+PROMPTS\s*=\s*\(\s*(function[\s\S]*?\})\s*\)\s*\(\s*\)\s*;/.exec(gasRaw);
    let keys = null;
    if (m) { try { keys = Object.keys(vm.runInNewContext('(' + m[1] + ')()')); } catch (e) { keys = null; } }
    const want = ids(D.PROMPTS);
    if (keys && want.length) { const miss = want.filter(x => !keys.includes(x)); T('Apps Script nhận đủ lời nhắc TG-01…16 (' + want.length + ')', !miss.length, 'thiếu: ' + miss.join(', ')); }
    else sync('lời nhắc TG-01…16', want);
  } sync('bữa', ['breakfast', 'lunch', 'dinner', 'other']);
  sync('mức', ['green', 'red', 'stopped', 'stopped_yellow']); sync('lý do', ['danger_sign', 'mother_reported', 'h2_low', 'lt10_2h']); sync('cảm nhận', ['same', 'different', 'skipped']);
  sync('dấu hiệu kickBefore', L(D.DANGER_SIGNS).filter(s => s.kickBefore).map(s => s.id));
  T('Apps Script: luật PIN yếu có danh sách ngắn ADR 4.3', ['000000', '111111', '112233', '123321', '666888', '888888', '168168', '686868'].every(p => gasRaw.includes(p)));
  T('Apps Script: hằng ngày dự sinh 14 / 280', /(?:-|−)\s*14\b|\b14\b/.test(gas.bare) && /\b280\b/.test(gas.bare));
  T('Apps Script: ALLOW_PUBLIC_READ = false', /ALLOW_PUBLIC_READ\s*=\s*false/.test(gas.bare));
  T('Apps Script: không Logger.log/console.log có pin|token|body|contents', !/(?:Logger\.log|console\.\w+)\s*\([^;\n]*\b(?:pin|token|body|contents)\b/i.test(gas.bare));
  const doGet = (/function\s+doGet\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/.exec(gas.bare) || [])[1] || '';
  T('Apps Script: doGet không gọi getRange/getValues/getDataRange', !!doGet && !/getRange|getValues|getDataRange/.test(doGet), doGet ? '' : 'không thấy doGet');
}

console.log('\n' + passes + ' PASS · ' + fails + ' FAIL · ' + warns + ' WARN · ' + waits + ' CHỜ' + (STRICT ? ' (--strict)' : ''));
process.exitCode = fails ? 1 : 0;
