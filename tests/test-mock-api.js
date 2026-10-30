/* =========================================================
   Test contract HTTP của tools/mock-api.js (chủ: backend-dev, T-B1). Node ≥ 22 (fetch có sẵn), không npm.
   Mock chạy CHÍNH google_apps_script.js trong tests/lib/gas-sandbox.js → contract ở đây là contract của Apps Script thật.
   Kiểm: 302 → GET như Apps Script, CORS *, text/plain không cần preflight, shape phản hồi của 12 action,
   đường dev /__mock/*, chế độ --hang / --flaky / --busy / --latency / --no-redirect,
   và js/api.js thật (nạp trong vm, dùng fetch của Node) gọi mock: luôn resolve, timeout, network, bad_response.
   Chỉ nghe 127.0.0.1, cổng ngẫu nhiên. Không gọi Google.
   Chạy: node tests/test-mock-api.js        (FAIL → exit 1)
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const { startMock } = require('../tools/mock-api');

const APP = path.resolve(__dirname, '..');
let passes = 0, fails = 0;
const T = (name, ok, detail) => {
  if (ok) passes++; else fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 300) : ''));
};
const PIN = '258147', PIN2 = '369258';
let seq = 0;
const newPhone = () => '0902' + String(100000 + (++seq)).slice(-6);
const DAYMS = 86400000;
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const rid = (() => { let n = 0; return () => 'mock' + String(++n).padStart(16, '0'); })();

async function post(url, obj, init) {
  const res = await fetch(url, Object.assign({ method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: typeof obj === 'string' ? obj : JSON.stringify(obj), redirect: 'follow' }, init || {}));
  return { status: res.status, headers: res.headers, json: JSON.parse(await res.text()) };
}
const getJson = async url => JSON.parse(await (await fetch(url)).text());
const DEV = { 'X-Mock-Dev': '1' };
const devGet = async url => JSON.parse(await (await fetch(url, { headers: DEV })).text());
const devPost = async url => JSON.parse(await (await fetch(url, { method: 'POST', headers: DEV })).text());

function loadApi(cfg) {
  const win = { LSTP_CONFIG: Object.assign({ ACCOUNT_ENABLED: true, MOCK: true, API_TIMEOUT_MS: 1500, LOGIN_TIMEOUT_MS: 3000 }, cfg) };
  const ctx = vm.createContext({ window: win, fetch, AbortController, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'api.js'), 'utf8'), ctx);
  return win.LSTP_API;
}

(async () => {
  const m = await startMock({ port: 0, iter: 30 });
  const base = 'http://127.0.0.1:' + m.port;
  try {
    console.log('=== HTTP như Apps Script ===');
    const raw = await fetch(m.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: '{"action":"ping"}', redirect: 'manual' });
    const loc = raw.headers.get('location') || '';
    T('POST /exec → 302 sang /macros/echo?user_content_key=… (như script.googleusercontent.com)', raw.status === 302 && /\/macros\/echo\?user_content_key=[0-9a-f]+$/.test(loc), [raw.status, loc]);
    T('phản hồi 302 có Access-Control-Allow-Origin: *', raw.headers.get('access-control-allow-origin') === '*');
    const echo = await fetch(loc);
    T('GET echo → 200 JSON, CORS *', echo.status === 200 && /application\/json/.test(echo.headers.get('content-type')) && echo.headers.get('access-control-allow-origin') === '*' && (await echo.json()).ready === true);
    T('echo chỉ dùng một lần', (await fetch(loc)).status === 404);
    const f = await post(m.url, { action: 'ping' });
    T('fetch redirect:"follow" theo 302 (POST → GET) → {result, api, ready}', f.status === 200 && JSON.stringify(f.json) === '{"result":"success","api":"1","ready":true}', f.json);
    T('GET /exec (mở URL trên trình duyệt) → public_read_disabled', JSON.stringify(await getJson(m.url)) === '{"result":"error","error":"public_read_disabled"}');
    T('GET /exec?callback=x&action=listMine → vẫn public_read_disabled, không JSONP', JSON.stringify(await getJson(m.url + '?callback=x&action=listMine')) === '{"result":"error","error":"public_read_disabled"}');
    const opt = await fetch(m.url, { method: 'OPTIONS' });
    T('OPTIONS trả 204 + CORS (client text/plain không cần tới)', opt.status === 204 && opt.headers.get('access-control-allow-origin') === '*');
    T('đường lạ → 404', (await fetch(base + '/khac')).status === 404);
    T('thân hỏng → bad_json; quá 60.000 ký tự → too_large', (await post(m.url, '{')).json.error === 'bad_json' && (await post(m.url, JSON.stringify({ action: 'ping', p: 'x'.repeat(61000) }))).json.error === 'too_large');

    console.log('=== Shape phản hồi 12 action (qua HTTP) ===');
    const phone = newPhone();
    const reg = (await post(m.url, { action: 'register', phone, pin: PIN, privateDevice: false, consent: { sheet: true, text: true, version: '0.2' } })).json;
    const sessionKeys = ['acct', 'born', 'consent', 'edd', 'exp', 'habits', 'phoneMasked', 'result', 'token'];
    T('register → Session {token, exp, acct, phoneMasked, consent, habits, edd, born}', JSON.stringify(Object.keys(reg).sort()) === JSON.stringify(sessionKeys) && /^[0-9a-f]{64}$/.test(reg.token), reg);
    const tk = reg.token;
    const wh = (await post(m.url, { action: 'whoami', token: tk })).json;
    T('whoami → {phoneMasked, exp, acct, consent, habits, edd, born}', JSON.stringify(Object.keys(wh).sort()) === JSON.stringify(['acct', 'born', 'consent', 'edd', 'exp', 'habits', 'phoneMasked', 'result']), wh);
    const kid = rid();
    const recs = [
      { kind: 'habit', day: today(), marks: { water: 'x' }, ageMs: 0 },
      { kind: 'prefs', enabled: ['kick', 'water'] },
      { kind: 'profile', edd: null, ageMs: 0 },
      { kind: 'checkin', id: rid(), ageMs: 0, emotions: ['happy'], before: 5, after: 3, exercise: 'HUM', fit: 'fit', contexts: [], minutes: 2, note: '<img src=x onerror=alert(1)>' },
      { kind: 'thaigiao', id: rid(), ageMs: 0, day: today(), prompt: 'TG-01', how: 'letter' },
      { kind: 'letter', id: rid(), ageMs: 0, day: today(), prompt: null, text: 'Mẹ yêu con' },
      { kind: 'kick', id: kid, startAgeMs: 3600000, meal: 'lunch', h1: 10, h2: 0, total: 10, min4: 5, min10: 18, level: 'green', hadYellow: false, reasons: [], feel: 'same', signs: [], taps: [{ t: 1000, x: 0.5, y: 0.5 }] },
      { kind: 'kick', id: 'x', startAgeMs: 0 }
    ];
    const sv = (await post(m.url, { action: 'saveRecords', token: tk, records: recs })).json;
    T('saveRecords → {saved:[key], rejected:[{key, error, field}]}', sv.result === 'success' && sv.saved.length === 7 && sv.rejected.length === 1 && sv.rejected[0].error === 'record_invalid' && sv.rejected[0].field === 'id' && sv.saved.includes('kick:' + kid) && sv.saved.includes('habit:' + today()), sv);
    const lm = (await post(m.url, { action: 'listMine', token: tk })).json;
    T('listMine → {records:{7 loại}, serverDay, truncated}', lm.result === 'success' && Object.keys(lm.records).length === 7 && lm.serverDay === today() && lm.truncated === false && lm.records.kick[0].taps.length === 1, lm);
    T('chữ <img onerror> trả về nguyên văn trong JSON (client escape)', lm.records.checkin[0].note === '<img src=x onerror=alert(1)>');
    const ex = (await post(m.url, { action: 'exportMine', token: tk })).json;
    T('exportMine → {account, records}', ex.result === 'success' && ex.account.phoneMasked === reg.phoneMasked && 'kick' in ex.records);
    const dr = (await post(m.url, { action: 'deleteRecords', token: tk, items: [{ kind: 'kick', id: kid }] })).json;
    T('deleteRecords → {deleted}', JSON.stringify(dr) === '{"result":"success","deleted":1}', dr);
    const sc = (await post(m.url, { action: 'setConsent', token: tk, text: false, deleteText: true })).json;
    T('setConsent → {consent}', sc.result === 'success' && sc.consent.text === false && sc.consent.sheet === true);
    const lo = (await post(m.url, { action: 'logout', token: tk })).json;
    T('logout → {} và token hết hiệu lực', JSON.stringify(lo) === '{"result":"success"}' && (await post(m.url, { action: 'whoami', token: tk })).json.error === 'session_expired');
    const li = (await post(m.url, { action: 'login', phone, pin: PIN2 })).json;
    T('login sai → bad_credentials {remaining}', li.error === 'bad_credentials' && li.remaining === 4, li);
    const ok = (await post(m.url, { action: 'login', phone, pin: PIN, privateDevice: true })).json;
    T('login đúng → Session 30 ngày', ok.result === 'success' && Math.abs(ok.exp - Date.now() - 30 * DAYMS) < 60000);

    console.log('=== Đường dev /__mock ===');
    const rp = await devPost(base + '/__mock/reset-pin?phone=' + encodeURIComponent(phone));
    T('/__mock/reset-pin → mã 6 số (giả lập menu đặt lại)', rp.result === 'success' && /^\d{6}$/.test(rp.code), rp);
    T('sau đặt lại: phiên cũ hết', (await post(m.url, { action: 'whoami', token: ok.token })).json.error === 'session_expired');
    const sp = (await post(m.url, { action: 'setPinAfterReset', phone, code: rp.code, pin: PIN2 })).json;
    T('setPinAfterReset với mã đó → Session', sp.result === 'success' && /^[0-9a-f]{64}$/.test(sp.token));
    T('/__mock/reset-pin số chưa có → not_found', (await devPost(base + '/__mock/reset-pin?phone=' + newPhone())).error === 'not_found');
    const dump = await devGet(base + '/__mock/dump');
    const dumpText = JSON.stringify(dump);
    T('/__mock/dump có 9 tab + file Chữ riêng, không có PIN / token thô', Object.keys(dump.files['MBAY – Dữ liệu']).length === 9 && 'MBAY – Chữ riêng' in dump.files && !dumpText.includes(PIN2) && !dumpText.includes(sp.token));
    const reqs = await devGet(base + '/__mock/requests');
    T('/__mock/requests ghi thân request + Content-Type text/plain', reqs.length > 5 && reqs.every(r => /^text\/plain/.test(r.contentType)) && reqs.some(r => r.body.action === 'saveRecords'));
    const reqText = JSON.stringify(reqs);
    T('/__mock/requests che PIN, mã đặt lại, token, SĐT (giữ tên trường)', !reqText.includes(PIN) && !reqText.includes(PIN2) && !reqText.includes(rp.code) && !reqText.includes(sp.token) && !reqText.includes(phone) &&
      reqs.some(r => r.body.pin === '<pin>') && reqs.some(r => r.body.code === '<code>') && reqs.some(r => r.body.token === '<token 64>'));
    const dev = await fetch(base + '/__mock/requests', { headers: DEV });
    T('/__mock/* không có CORS', dev.status === 200 && dev.headers.get('access-control-allow-origin') === null);
    const st = async (path, init) => (await fetch(base + path, init)).status;
    T('/__mock/* thiếu header X-Mock-Dev → 403 (kể cả GET kiểu <img src>)', await st('/__mock/requests') === 403 && await st('/__mock/reset') === 403 && await st('/__mock/reset-pin?phone=' + phone, { method: 'POST' }) === 403);
    T('/__mock/* có Origin hoặc Referer → 403', await st('/__mock/requests', { headers: Object.assign({ Origin: 'https://evil.example' }, DEV) }) === 403 &&
      await st('/__mock/reset-pin?phone=' + phone, { method: 'POST', headers: Object.assign({ Referer: 'http://127.0.0.1:8767/' }, DEV) }) === 403);
    T('đường đổi trạng thái chỉ nhận POST (GET → 405)', await st('/__mock/reset', { headers: DEV }) === 405 && await st('/__mock/advance?ms=1', { headers: DEV }) === 405 && await st('/__mock/reset-pin?phone=' + phone, { headers: DEV }) === 405);
    T('preflight OPTIONS tới /__mock/* bị từ chối', await st('/__mock/reset', { method: 'OPTIONS' }) === 403);
    const adv = await devPost(base + '/__mock/advance?ms=' + (12 * 3600000 + 5000));
    T('/__mock/advance tua đồng hồ server → phiên ngắn hết hạn', adv.result === 'success' && (await post(m.url, { action: 'whoami', token: sp.token })).json.error === 'session_expired');
    await devPost(base + '/__mock/reset');
    T('/__mock/reset xóa sạch (số cũ như chưa đăng ký)', (await post(m.url, { action: 'login', phone, pin: PIN2 })).json.remaining === 4);

    console.log('=== js/api.js thật gọi mock ===');
    const nBefore = (await devGet(base + '/__mock/requests')).length;
    const A = loadApi({ MOCK_URL: m.url });
    const p2 = newPhone();
    const ra = await A.register({ phone: p2, pin: PIN, privateDevice: false, consent: { sheet: true, text: false, version: '0.2' } });
    T('A.register → Session', ra.result === 'success' && /^[0-9a-f]{64}$/.test(ra.token), ra);
    const calls = await Promise.all([A.ping(), A.whoami(ra.token), A.saveRecords(ra.token, [{ kind: 'habit', day: today(), marks: { kick: 'a' }, ageMs: 0 }]),
      A.listMine(ra.token, { kinds: ['habit'] }), A.exportMine(ra.token), A.deleteRecords(ra.token, [{ kind: 'habit', day: today() }]),
      A.setConsent(ra.token, { text: true })]);
    T('A.ping/whoami/saveRecords/listMine/exportMine/deleteRecords/setConsent → success', calls.every(r => r.result === 'success'), calls.map(r => r.error));
    T('A.listMine đọc lại đúng bản ghi', calls[3].records.habit[0].marks.kick === 'a');
    T('A.login sai → bad_credentials, A.setPinAfterReset không có đặt lại → bad_credentials', (await A.login({ phone: p2, pin: PIN2 })).error === 'bad_credentials' && (await A.setPinAfterReset({ phone: p2, code: '123456', pin: PIN2 })).error === 'bad_credentials');
    T('A.logout + A.deleteAccount', (await A.deleteAccount(ra.token)).result === 'success' && (await A.logout(ra.token)).result === 'success' && (await A.whoami(ra.token)).error === 'session_expired');
    T('A.whoami(null) → session_expired (không ném lỗi)', (await A.whoami(null)).error === 'session_expired');
    const reqs2 = (await devGet(base + '/__mock/requests')).slice(nBefore);
    T('client gửi text/plain, không preflight (mock không nhận OPTIONS nào từ client), thân có v:"1"', reqs2.length >= 12 && reqs2.every(r => /^text\/plain;charset=utf-8$/.test(r.contentType) && r.body.v === '1'), reqs2.map(r => r.contentType + ' ' + r.body.v));

    console.log('=== Chế độ lỗi ===');
    await devPost(base + '/__mock/mode?hang=1');
    const t0 = Date.now();
    const hung = await loadApi({ MOCK_URL: m.url, API_TIMEOUT_MS: 400 }).whoami('a'.repeat(64));
    T('--hang → client timeout sau API_TIMEOUT_MS, vẫn resolve', hung.error === 'timeout' && Date.now() - t0 < 2500, hung);
    await devPost(base + '/__mock/mode?hang=0&flaky=1');
    T('--flaky (cắt kết nối) → network', (await A.ping()).error === 'network');
    await devPost(base + '/__mock/mode?flaky=0&busy=1');
    const busy = await A.register({ phone: newPhone(), pin: PIN, consent: { sheet: true, version: '0.2' } });
    T('--busy (lock lỗi) → server_busy {retry:true}, isTransient', busy.error === 'server_busy' && busy.retry === true && A.isTransient(busy));
    await devPost(base + '/__mock/mode?busy=0&latency=300');
    const t1 = Date.now();
    T('--latency 300 → chậm nhưng thành công', (await A.ping()).result === 'success' && Date.now() - t1 >= 290);
    await devPost(base + '/__mock/mode?latency=0&redirect=0');
    const nr = await fetch(m.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: '{"action":"ping"}', redirect: 'manual' });
    T('--no-redirect → 200 JSON thẳng', nr.status === 200 && (await nr.json()).ready === true);
    await devPost(base + '/__mock/mode?redirect=1');

    console.log('=== Client với server lỗi / tắt ===');
    const htmlSrv = http.createServer((q, r) => { q.resume(); q.on('end', () => { r.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }); r.end('<html>Đăng nhập Google</html>'); }); });
    await new Promise(r => htmlSrv.listen(0, '127.0.0.1', r));
    const hb = await loadApi({ MOCK_URL: 'http://127.0.0.1:' + htmlSrv.address().port + '/exec' }).ping();
    T('server trả HTML lạ → bad_response, reason not_json', hb.error === 'bad_response' && hb.reason === 'not_json', hb);
    const loginSrv = http.createServer((q, r) => { q.resume(); q.on('end', () => { r.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }); r.end('<html><a href="https://accounts.google.com/ServiceLogin">Đăng nhập</a></html>'); }); });
    await new Promise(r => loginSrv.listen(0, '127.0.0.1', r));
    const gl = await loadApi({ MOCK_URL: 'http://127.0.0.1:' + loginSrv.address().port + '/exec' }).ping();
    T('nhận trang đăng nhập Google (triển khai chưa "Bất kỳ ai" / Workspace chặn) → bad_response, reason google_login (không im lặng)', gl.error === 'bad_response' && gl.reason === 'google_login', gl);
    await new Promise(r => loginSrv.close(r));
    const GW = 'https://script.google.com/a/macros/benhvien.vn/s/AKfycbTESTtestTEST123/exec';
    const winW = { LSTP_CONFIG: { ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: GW } }; const seenW = [];
    const ctxW = vm.createContext({ window: winW, fetch: (u) => { seenW.push(u); return Promise.resolve({ ok: true, url: u, text: () => Promise.resolve('{"result":"success","api":"1","ready":true}') }); }, AbortController, setTimeout, clearTimeout });
    vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'api.js'), 'utf8'), ctxW);
    T('api.js nhận URL Google Workspace /a/macros/<miền>/s/…/exec', (await winW.LSTP_API.ping()).ready === true && seenW[0] === GW);
    const winE = { LSTP_CONFIG: { ACCOUNT_ENABLED: true, GOOGLE_SCRIPT_URL: 'https://script.google.com.evil.example/macros/s/AKfycbTESTtestTEST123/exec' } };
    const ctxE = vm.createContext({ window: winE, fetch: () => { throw new Error('không được gọi'); }, AbortController, setTimeout, clearTimeout });
    vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'api.js'), 'utf8'), ctxE);
    const ne = await winE.LSTP_API.ping();
    T('URL giả dạng script.google.com → no_url, reason url_not_allowed', ne.error === 'no_url' && ne.reason === 'url_not_allowed', ne);
    const deadPort = htmlSrv.address().port;
    await new Promise(r => htmlSrv.close(r));
    T('cổng đóng → network', (await loadApi({ MOCK_URL: 'http://127.0.0.1:' + deadPort + '/exec' }).ping()).error === 'network');
    let fetched = false;
    const winOff = { LSTP_CONFIG: { ACCOUNT_ENABLED: false, MOCK: true, MOCK_URL: m.url } };
    const ctxOff = vm.createContext({ window: winOff, fetch: (...a) => { fetched = true; return fetch(...a); }, AbortController, setTimeout, clearTimeout });
    vm.runInContext(fs.readFileSync(path.join(APP, 'js', 'api.js'), 'utf8'), ctxOff);
    const off = await winOff.LSTP_API.login({ phone: newPhone(), pin: PIN });
    T('ACCOUNT_ENABLED=false → no_url (reason disabled), không request nào (S-13)', off.error === 'no_url' && off.reason === 'disabled' && !fetched);
  } catch (e) {
    T('không có ngoại lệ trong test', false, String(e && e.stack || e));
  } finally {
    await m.close();
  }
  console.log('\n' + passes + ' PASS · ' + fails + ' FAIL');
  process.exit(fails ? 1 : 0);
})();
