/* =========================================================
   Smoke test khung – Mẹ Bầu An Yên (chủ: qa-tester; T-00 viết bản đầu). QA thay/mở rộng bằng tests/e2e.js.
   Chrome headless qua CDP (tests/lib/cdp.js), server tĩnh trong tiến trình (tests/lib/static-server.js, MOCK bật).
   Kiểm: mở trang không lỗi console/exception; màn chào có "Dùng ẩn danh"; "Dùng ẩn danh" → "Không lưu gì"
   → màn ngày dự sinh A09 (một lần) → "Để sau" → Trang chính; trong suốt luồng localStorage/sessionStorage không có khóa nào (AC-11); không request
   tới script.google.com.
   Chạy (Ubuntu, cần Node ≥ 22):
     export TMPDIR=/tmp/claude-1000/qa-lstp; mkdir -p $TMPDIR
     $NODE tests/smoke.js [--port=8767] [--out=$TMPDIR/out]
   ========================================================= */
'use strict';
const path = require('path');
const os = require('os');
const { launch, sleep } = require('./lib/cdp');
const { startStatic } = require('./lib/static-server');

const argv = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)=?(.*)$/); return m ? [m[1], m[2] || true] : [a, true]; }));
const PORT = +(argv.port || 8767);
const OUT = path.resolve(argv.out || path.join(os.tmpdir(), 'lstp-qa'));
let fails = 0, passes = 0;
const T = (name, ok, detail) => { ok ? passes++ : fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail !== undefined ? '  → ' + String(detail).slice(0, 300) : '')); };

(async () => {
  const srv = await startStatic({ port: PORT, appDir: path.resolve(__dirname, '..'), mock: true, mockUrl: 'http://127.0.0.1:8790/exec' });
  const { page, kill } = await launch({ userDataDir: path.join(OUT, 'chrome-smoke'), width: 375, height: 812 });
  const errors = [], requests = [];
  page.on('Runtime.exceptionThrown', p => errors.push('exception: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
  page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push('console.error: ' + p.args.map(a => a.value ?? a.description).join(' ')); });
  page.on('Log.entryAdded', p => { if (p.entry.level === 'error' && !/fonts\.(googleapis|gstatic)/.test(p.entry.url || '')) errors.push('log: ' + p.entry.text + ' ' + (p.entry.url || '')); });
  page.on('Network.requestWillBeSent', p => requests.push(p.request.url));
  // Chặn Google Fonts cho tất định
  await page.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  try {
    await page.navigate(srv.url);
    await sleep(300);
    const storage = () => page.evaluate('JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)])');
    T('màn chào hiện', await page.evaluate("document.querySelector('#main').dataset.screen") === 'welcome');
    T('có nút "Dùng ẩn danh"', await page.evaluate("!!document.querySelector('[data-go=guest_choice]')"));
    T('có nút Hỗ trợ ở header', await page.evaluate("!!document.querySelector('#header [data-go=support]')"));
    T('Bước A: không có nút đăng nhập', await page.evaluate("!document.querySelector('[data-go=login]')"));
    await page.click('[data-go=guest_choice]'); await sleep(100);
    T('sang màn guest_choice', await page.evaluate("document.querySelector('#main').dataset.screen") === 'guest_choice');
    await page.click('[data-act=startNone]'); await sleep(100);
    const scr = () => page.evaluate("document.querySelector('#main').dataset.screen");
    // PRD 3.9 / UX A09 / tech design 5.7.1: màn ngày dự sinh tự hiện MỘT lần trước Trang chính (cả chế độ không lưu)
    T('"Không lưu gì" → màn ngày dự sinh (A09) hiện trước Trang chính', await scr() === 'due_date', await scr());
    T('A09 có nút "Để sau"', await page.evaluate("!!document.querySelector('[data-act=eddLater]')"));
    T('A09 chưa ghi khóa nào (AC-137)', await storage() === '[[],[]]', await storage());
    await page.click('[data-act=eddLater]'); await sleep(100);
    T('"Để sau" → Trang chính', await scr() === 'home', await scr());
    T('Trang chính có liên kết "Thêm ngày dự sinh ›" (AC-126)', await page.evaluate("document.querySelector('#main').innerText.includes('Thêm ngày dự sinh ›')"));
    // Về Trang chính lần nữa trong cùng phiên: A09 không hiện lại
    await page.evaluate("LSTP_APP.enterHome ? LSTP_APP.enterHome() : LSTP_APP.resetTo('home')"); await sleep(100);
    T('A09 hiện đúng một lần trong phiên: vào Trang chính lần hai không hỏi lại', await scr() === 'home', await scr());
    T('h1 được focus', await page.evaluate("document.activeElement && document.activeElement.tagName === 'H1'"));
    T('không ghi khóa nào vào localStorage/sessionStorage (AC-11)', await storage() === '[[],[]]', await storage());
    await page.click('#header [data-go=support]'); await sleep(100);
    T('Hỗ trợ có tel:115', await page.evaluate("!!document.querySelector('a[href=\"tel:115\"]')"));
    T('không request tới script.google.com', !requests.some(u => /script\.google/.test(u)), requests.join(' '));
    T('không lỗi console / exception', errors.length === 0, errors.join(' | '));
  } catch (e) {
    T('smoke chạy hết', false, e.stack);
  } finally {
    kill();
    await srv.close();
  }
  console.log('\n' + passes + ' PASS · ' + fails + ' FAIL');
  if (requests.some(u => /script\.google/.test(u))) process.exitCode = 1;
  process.exitCode = fails ? 1 : (process.exitCode || 0);
})();
