#!/usr/bin/env node
/* =========================================================
   mock-api.js – giả lập Web App Apps Script của Mẹ Bầu An Yên (chủ: backend-dev, T-B1).
   KHÔNG viết lại logic: nạp CHÍNH google_apps_script.js vào tests/lib/gas-sandbox.js rồi gọi doPost/doGet,
   nên frontend, QA và Apps Script thật dùng cùng một contract (ADR 0005 mục 5).
   Node thuần, không npm. Chỉ nghe 127.0.0.1. Dữ liệu CHỈ trong bộ nhớ (không ghi file). Không gọi Google.

   Chạy:   node tools/mock-api.js                 (cổng 8790; URL http://127.0.0.1:8790/exec)
           node tools/mock-api.js --iter 50       (giảm số vòng băm PIN cho test nhanh; mặc định 50)
           node tools/mock-api.js --latency 800   (mọi request trễ 800 ms)
           node tools/mock-api.js --flaky 0.2     (20 % request bị cắt kết nối → client báo "network")
           node tools/mock-api.js --hang          (không trả lời → client báo "timeout")
           node tools/mock-api.js --busy 0.3      (30 % lần lấy lock lỗi → server_busy {retry:true})
           node tools/mock-api.js --no-redirect   (trả JSON thẳng, không mô phỏng 302)
           node tools/mock-api.js --port 9000 --quiet
   Như Apps Script thật: POST /exec → 302 Location /macros/echo?user_content_key=… → GET trả JSON,
   mọi phản hồi có Access-Control-Allow-Origin: *. fetch(…, {redirect:'follow'}) tự theo và đổi sang GET.
   Đường dev (chỉ máy này; mọi đường cần header  X-Mock-Dev: 1 , không Origin/Referer; đổi trạng thái chỉ POST):
     POST /__mock/reset                  xóa sạch, cài lại (setup_)
     GET /__mock/dump                    toàn bộ tab (để QA soi; có băm, KHÔNG có PIN/token thô)
     POST /__mock/reset-pin?phone=…      giả lập anh Thông bấm menu "Đặt lại mã PIN" → {code, exp}
     POST /__mock/advance?ms=…           tua đồng hồ của "server" (phiên hết hạn, mở khóa 15 phút…)
     GET /__mock/requests                các thân request đã nhận (PIN, mã, token, SĐT đã che)
     POST /__mock/mode?hang=0|1&flaky=…&busy=…&latency=…   đổi chế độ khi đang chạy
   Ví dụ: curl -X POST -H 'X-Mock-Dev: 1' 'http://127.0.0.1:8790/__mock/reset-pin?phone=0901000001'
   Dán vào js/config.js khi chạy local: MOCK: true, MOCK_URL: 'http://127.0.0.1:8790/exec'
   ========================================================= */
'use strict';
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { URL } = require('url');
const { createGas } = require(path.join(__dirname, '..', 'tests', 'lib', 'gas-sandbox.js'));

const DEFAULT_PORT = 8790;
const MAX_REQ = 1024 * 1024;   // chặn thân quá lớn ở tầng HTTP (script còn tự chặn ở MAX_BODY)

function startMock(opts) {
  const o = Object.assign({ port: DEFAULT_PORT, iter: 50, latency: 0, flaky: 0, hang: false, busy: 0, redirect: true, quiet: true }, opts || {});
  const mode = { latency: o.latency, flaky: o.flaky, hang: o.hang, busy: o.busy, redirect: o.redirect };
  let env = null;
  const echoes = new Map();
  const requests = [];
  const hung = new Set();
  const sockets = new Set();

  function fresh() {
    env = createGas({ clock: 'real', consts: { PIN_HASH_ITER: o.iter } });
    env.setup();
    echoes.clear();
    requests.length = 0;
  }
  fresh();

  const log = (...a) => { if (!o.quiet) console.log(...a); };
  const CORS = { 'Access-Control-Allow-Origin': '*' };
  function send(res, status, body, type, extra) {
    res.writeHead(status, Object.assign({ 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, CORS, extra || {}));
    res.end(body);
  }
  function reply(req, res, text, port) {
    if (!mode.redirect) return send(res, 200, text);
    const key = crypto.randomBytes(12).toString('hex');
    echoes.set(key, text);
    setTimeout(() => echoes.delete(key), 60000).unref();
    res.writeHead(302, Object.assign({ Location: 'http://127.0.0.1:' + port + '/macros/echo?user_content_key=' + key, 'Cache-Control': 'no-store' }, CORS));
    res.end();
  }

  const server = http.createServer((req, res) => {
    const port = server.address().port;
    const u = new URL(req.url, 'http://127.0.0.1');
    let body = '', tooBig = false;
    req.setEncoding('utf8');
    req.on('data', d => { if (body.length + d.length > MAX_REQ) { tooBig = true; return; } body += d; });
    req.on('end', async () => {
      try {
        if (req.method === 'OPTIONS' && u.pathname.startsWith('/__mock/')) { res.writeHead(403); return res.end(); }
        if (req.method === 'OPTIONS') {
          // Client gửi text/plain nên KHÔNG có preflight; trả lời cho đủ nếu ai đó thử
          res.writeHead(204, Object.assign({ 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type' }, CORS));
          return res.end();
        }
        /* ----- đường dev: KHÔNG CORS, từ chối mọi request có Origin (trang web đang mở trên máy không gọi được) ----- */
        if (u.pathname.startsWith('/__mock/')) {
          const sendDev = (st, b) => { res.writeHead(st, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(b); };
          const send = (r2, st, b) => sendDev(st, b);   // eslint-disable-line no-shadow
          const name = u.pathname.slice(8);
          // Chỉ Node/curl trên máy này: phải có header X-Mock-Dev: 1 (trình duyệt gửi chéo trang thì phải preflight → bị chặn),
          // không Origin / Referer; đường đổi trạng thái chỉ nhận POST (không kích hoạt được bằng <img src>).
          if (req.headers.origin || req.headers.referer || req.headers['x-mock-dev'] !== '1') return sendDev(403, '{"result":"error","error":"forbidden"}');
          if (['reset', 'reset-pin', 'advance', 'mode'].indexOf(name) >= 0 && req.method !== 'POST') return sendDev(405, '{"result":"error","error":"post_only"}');
          if (name === 'reset') { fresh(); return send(res, 200, JSON.stringify({ result: 'success' })); }
          if (name === 'dump') return send(res, 200, JSON.stringify(env.dump()));
          if (name === 'reset-pin') { const r = env.resetPin(u.searchParams.get('phone') || ''); return send(res, 200, JSON.stringify(r.error ? { result: 'error', error: r.error } : { result: 'success', code: r.code, exp: r.exp })); }
          if (name === 'advance') { const ms = Number(u.searchParams.get('ms')); if (!isFinite(ms)) return send(res, 400, '{"result":"error","error":"ms"}'); env.advance(ms); return send(res, 200, JSON.stringify({ result: 'success', now: env.clock.now() })); }
          if (name === 'requests') return send(res, 200, JSON.stringify(requests));
          if (name === 'mode') {
            const p = u.searchParams;
            if (p.has('hang')) mode.hang = p.get('hang') === '1';
            if (p.has('flaky')) mode.flaky = Number(p.get('flaky')) || 0;
            if (p.has('busy')) mode.busy = Number(p.get('busy')) || 0;
            if (p.has('latency')) mode.latency = Number(p.get('latency')) || 0;
            if (p.has('redirect')) mode.redirect = p.get('redirect') !== '0';
            if (!mode.hang) { hung.forEach(r => { try { r.destroy(); } catch (e) { /* đã đóng */ } }); hung.clear(); }
            return send(res, 200, JSON.stringify({ result: 'success', mode }));
          }
          return send(res, 404, '{"result":"error","error":"not_found"}');
        }
        /* ----- echo sau 302 (như script.googleusercontent.com) ----- */
        if (u.pathname === '/macros/echo' && req.method === 'GET') {
          const key = u.searchParams.get('user_content_key') || '';
          if (!echoes.has(key)) return send(res, 404, '<html><body>Không tìm thấy</body></html>', 'text/html; charset=utf-8');
          const text = echoes.get(key); echoes.delete(key);
          return send(res, 200, text);
        }
        if (u.pathname !== '/exec') return send(res, 404, '<html><body>Not Found</body></html>', 'text/html; charset=utf-8');
        /* ----- /exec ----- */
        if (mode.hang) { hung.add(res); return; }
        if (mode.flaky && Math.random() < mode.flaky) { req.socket.destroy(); return; }
        if (mode.latency) await new Promise(r => setTimeout(r, mode.latency));
        if (req.method === 'GET') return reply(req, res, JSON.stringify(env.get(Object.fromEntries(u.searchParams))), port);
        if (req.method !== 'POST') return send(res, 405, '<html><body>405</body></html>', 'text/html; charset=utf-8');
        if (tooBig) return send(res, 413, '<html><body>413</body></html>', 'text/html; charset=utf-8');
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (e) { parsed = { _raw: body.slice(0, 200) }; }
        requests.push({ t: Date.now(), contentType: req.headers['content-type'] || '', body: maskBody(parsed) });
        if (requests.length > 500) requests.shift();
        env.lock.failRate = mode.busy;
        const out = env.postRaw(body).getContent();
        env.lock.failRate = 0;
        log('POST', parsed && parsed.action, '→', out.slice(0, 120));
        return reply(req, res, out, port);
      } catch (e) {
        send(res, 500, '<html><body>mock lỗi</body></html>', 'text/html; charset=utf-8');
      }
    });
  });
  server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(o.port, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        port, url: 'http://127.0.0.1:' + port + '/exec', mode,
        get env() { return env; },
        reset: fresh,
        close: () => new Promise(r => { hung.forEach(x => { try { x.destroy(); } catch (e) { /* bỏ qua */ } }); sockets.forEach(s => s.destroy()); server.close(() => r()); })
      });
    });
  });
}

/** Che PIN, mã đặt lại, token trong nhật ký request của mock (QA có thể gõ dữ liệu thật). */
function maskBody(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
  const o = Object.assign({}, b);
  if (o.pin !== undefined) o.pin = '<pin>';
  if (o.code !== undefined) o.code = '<code>';
  if (o.token !== undefined) o.token = typeof o.token === 'string' ? '<token ' + o.token.length + '>' : '<token>';
  if (o.phone !== undefined) o.phone = typeof o.phone === 'string' ? '<phone …' + o.phone.slice(-3) + '>' : '<phone>';
  return o;
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === '--port') o.port = Number(next());
    else if (a === '--iter') o.iter = Number(next());
    else if (a === '--latency') o.latency = Number(next());
    else if (a === '--flaky') { const v = argv[i + 1]; o.flaky = v && !v.startsWith('--') ? Number(next()) : 0.2; }
    else if (a === '--busy') { const v = argv[i + 1]; o.busy = v && !v.startsWith('--') ? Number(next()) : 0.3; }
    else if (a === '--hang') o.hang = true;
    else if (a === '--no-redirect') o.redirect = false;
    else if (a === '--quiet') o.quiet = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else { console.error('Không hiểu tham số: ' + a); process.exit(2); }
  }
  if (process.env.PORT && !o.port) o.port = Number(process.env.PORT);
  return o;
}

if (require.main === module) {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(1, 30).join('\n')); process.exit(0); }
  if (o.quiet === undefined) o.quiet = false;
  startMock(o).then(m => {
    console.log('mock-api Mẹ Bầu An Yên: ' + m.url + '  (iter ' + (o.iter || 50) + (o.hang ? ', hang' : '') + (o.flaky ? ', flaky ' + o.flaky : '') +
      (o.busy ? ', busy ' + o.busy : '') + (o.latency ? ', latency ' + o.latency + ' ms' : '') + (o.redirect === false ? ', no-redirect' : '') + ')');
    console.log('Dán vào js/config.js: MOCK: true, MOCK_URL: \'' + m.url + '\'');
  }).catch(e => { console.error('Không mở được cổng: ' + e.message); process.exit(1); });
}

module.exports = { startMock, parseArgs, maskBody };
