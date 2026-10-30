/* =========================================================
   Server tĩnh cho test Mẹ Bầu An Yên (chủ: qa-tester; khung T-00 dựa trên
   apps/checkin-me-bau/tests/lib/static-server.js). KHÔNG sửa file gốc trên đĩa.
   - Đọc toàn bộ file app (đệ quy, bỏ tests/ và .git/) vào bộ nhớ một lần lúc khởi động.
   - Khi phục vụ js/config.js: thay trong bộ nhớ các dòng MOCK / MOCK_URL / ACCOUNT_ENABLED theo opts,
     và khi mock bật thì ép GOOGLE_SCRIPT_URL = '' để test KHÔNG BAO GIỜ gọi Apps Script thật.
   - Khi mock bật: thêm origin mock vào connect-src của CSP trong index.html phục vụ (bản phát hành có thể không có, G-2).
   - Chỉ nghe 127.0.0.1.
   Dùng: const { startStatic } = require('./lib/static-server');
         const srv = await startStatic({ port, appDir, mock: true, mockUrl, account: false }); … await srv.close();
   ========================================================= */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.md': 'text/markdown; charset=utf-8'
};

/* Sửa config.js trong bộ nhớ; tách hàm để test được */
function patchConfig(src, o) {
  let out = src;
  const setLine = (key, value) => {
    const re = new RegExp('^(\\s*' + key + ':\\s*)[^,\\n]+,', 'm');
    if (!re.test(out)) throw new Error('config.js: không thấy dòng ' + key);
    out = out.replace(re, '$1' + value + ',');
  };
  if (o.mock) {
    if (typeof o.mockUrl !== 'string' || /script\.google(usercontent)?\.com/.test(o.mockUrl)) throw new Error('mockUrl không hợp lệ: ' + o.mockUrl);
    setLine('MOCK', 'true');
    setLine('MOCK_URL', JSON.stringify(o.mockUrl));
    setLine('GOOGLE_SCRIPT_URL', "''");
  }
  if (typeof o.account === 'boolean') setLine('ACCOUNT_ENABLED', String(o.account));
  if (typeof o.textSync === 'boolean') setLine('TEXT_SYNC_ENABLED', String(o.textSync));
  const m = /^\s*GOOGLE_SCRIPT_URL:\s*'([^']*)'/m.exec(out);
  if (o.mock && (!m || m[1] !== '')) throw new Error('AN TOÀN: config.js phục vụ cho test vẫn có GOOGLE_SCRIPT_URL – DỪNG');
  return out;
}

/* Bản phát hành có thể bỏ host mock khỏi CSP (review Bước A, G-2). Khi test chạy mock: thêm origin của mock vào
   connect-src trong bộ nhớ (file trên đĩa không đổi). Không bao giờ thêm host Google. */
function patchCsp(html, mockUrl) {
  const origin = new URL(mockUrl).origin;
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw new Error('mockUrl phải là 127.0.0.1/localhost: ' + mockUrl);
  return html.replace(/(http-equiv="Content-Security-Policy"\s+content="[^"]*?connect-src)([^;"]*)/, (m, a, b) => (b.split(/\s+/).includes(origin) ? m : a + b + ' ' + origin));
}

function readTree(dir, base, files) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'tests' || name === '.git' || name === 'node_modules') continue;
    const f = path.join(dir, name);
    const rel = path.relative(base, f).split(path.sep).join('/');
    const st = fs.statSync(f);
    if (st.isDirectory()) readTree(f, base, files);
    else files[rel] = fs.readFileSync(f);
  }
  return files;
}

function startStatic(opts) {
  const appDir = path.resolve(opts.appDir);
  const files = readTree(appDir, appDir, {});
  if (!files['index.html'] || !files['js/config.js']) throw new Error('Thiếu index.html hoặc js/config.js ở ' + appDir);
  files['js/config.js'] = Buffer.from(patchConfig(files['js/config.js'].toString('utf8'), opts), 'utf8');
  if (opts.mock) files['index.html'] = Buffer.from(patchCsp(files['index.html'].toString('utf8'), opts.mockUrl), 'utf8');
  const log = [];
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (e) { rel = '/'; }
    rel = rel === '/' ? 'index.html' : rel.replace(/^\/+/, '');
    log.push(req.method + ' ' + rel);
    const data = Object.prototype.hasOwnProperty.call(files, rel) ? files[rel] : null;
    if (!data) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-store' });
    res.end(data);
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(opts.port, '127.0.0.1', () => resolve({
      url: 'http://127.0.0.1:' + opts.port + '/',
      servedConfig: files['js/config.js'].toString('utf8'),
      requestLog: log,
      close: () => new Promise(r => { server.closeAllConnections && server.closeAllConnections(); server.close(() => r()); })
    }));
  });
}

module.exports = { startStatic, patchConfig, patchCsp };
