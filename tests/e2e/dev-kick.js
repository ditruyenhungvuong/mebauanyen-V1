/* =========================================================
   E2E gộp từ script thử của FE-4 (kick-probe.js, 48 ca) – Mẹ Bầu An Yên.
   Chủ: qa-tester (T-Q2 tiếp quản, 29/10/2026). Kiểm: chạm trong/ngoài bụng, chạm đúp 0,8 s, T+60/T+120 bằng đồng hồ giả, tải lại lúc T+70, XSS, xóa.
   Thân kịch bản giữ NGUYÊN VĂN của dev; chỉ đổi phần khung: tests/e2e.js truyền ctx
   (launch đã cài chốt chặn script.google 3 lớp, startStatic luôn MOCK, T ghi vào kết quả chung, cổng riêng).
   Đồng hồ: QA ghim 12:00 giờ VN 29/10/2026 (ctx.base) — bản gốc dùng giờ thật nên ca "K08 ô nặng nhất ×3" đỏ/xanh tùy lúc chạy.
   Chạy qua: tests/e2e.js --only=dev-kick
   ========================================================= */
'use strict';
const path = require('path');
module.exports = async function (ctx) {
  const { launch, sleep, startStatic, T } = ctx;
  const APP = ctx.APP, APPDIR = ctx.APP;
  let fails = 0, passes = 0, f = 0;
  const MIN = 60000;
  void fails; void passes; void f; void path;

  const srv = await startStatic({ port: 8781, appDir: APP, mock: false });
  const { page, kill } = await launch({ userDataDir: path.join(process.env.TMPDIR, 'chrome-kick-probe'), width: 375, height: 667 });
  const errors = [], reqs = [];
  page.on('Runtime.exceptionThrown', p => errors.push('exc: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
  page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push('console: ' + p.args.map(a => a.value ?? a.description).join(' ')); });
  page.on('Network.requestWillBeSent', p => reqs.push(p.request.url));
  await page.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{const N=Date.now.bind(Date),B=${ctx.base};let o=+(sessionStorage.getItem('lstp_probe_off')||0);window.__setOff=v=>{o=v;sessionStorage.setItem('lstp_probe_off',String(v));};Date.now=()=>N()+B+o;const RD=Date;window.Date=class extends RD{constructor(...a){a.length?super(...a):super(N()+B+o)}static now(){return N()+B+o}};window.Date.UTC=RD.UTC;window.Date.parse=RD.parse;})();` });
  const ev = e => page.evaluate(e);
  const scr = () => ev("document.querySelector('#main').dataset.screen");
  const go = n => ev(`window.LSTP_APP.go('${n}')`);
  try {
    await page.navigate(srv.url); await sleep(300);
    await page.click('[data-go=guest_choice]'); await sleep(80);
    await page.click('[data-act=startNone]'); await sleep(120);
    console.log('sau "Không lưu gì":', await scr());
    await ev("window.LSTP_APP.resetTo('home')"); await sleep(80);
    T('ô "👣 Đếm cử động thai" trên trang chính', await ev("!!document.querySelector('#main [data-go=kick_home]')"));
    await page.click('#main [data-go=kick_home]'); await sleep(100);
    T('K01 hiện, có M-05, M-30, thẻ M-20a', await ev("(t=>t.includes('Không ai theo dõi ngay')&&t.includes('Đóng app là các lượt')&&t.includes('Mỗi ngày 2–3 lần'))(document.querySelector('#main').innerText)"));
    T('K01 ô hôm nay "Chưa đếm"', await ev("document.querySelectorAll('.kick-slot').length===3 && document.querySelector('.kick-slot').innerText.includes('Chưa đếm')"));
    await page.click('[data-act=kickSeenTip]'); await sleep(80);
    T('Đã hiểu → ẩn thẻ', await ev("!document.querySelector('.kick-tip')"));
    T('chế độ none: không khóa localStorage', await ev("Object.keys(localStorage).length===0"));
    // AC-01: Bắt đầu đếm › → Bắt đầu › → Bỏ qua
    await page.click('[data-go=kick_before]'); await sleep(80);
    T('K02 có 8 dấu hiệu aria-pressed', await ev("document.querySelectorAll('.kick-sign[aria-pressed=false]').length===8"));
    await page.click('[data-act=kickSign]'); await sleep(50);
    T('chọn dấu hiệu → nút "Xem cần làm gì ngay ›"', (await ev("document.querySelector('#kBeforeGo').textContent")) === 'Xem cần làm gì ngay ›');
    await page.click('[data-act=kickSign]'); await sleep(50);
    T('bỏ chọn → "Bắt đầu ›"', (await ev("document.querySelector('#kBeforeGo').textContent")) === 'Bắt đầu ›');
    await page.click('#kBeforeGo'); await sleep(80);
    T('sang K03 nút "Bỏ qua"', (await scr()) === 'kick_pause5' && (await ev("document.querySelector('#kPauseGo').textContent")) === 'Bỏ qua');
    await page.click('#kPauseGo'); await sleep(150);
    T('vào K04', (await scr()) === 'kick_count');
    T('lstp_kick_active ở sessionStorage', await ev("!!sessionStorage.getItem('lstp_kick_active')"));
    T('đồng hồ Giờ thứ 1 · còn 60:00/59:59', /Giờ thứ 1 · còn (60:00|59:5\d)/.test(await ev("document.querySelector('#kTimer').textContent")));
    // Chạm giữa bụng
    await page.click('#kBelly'); await sleep(120);
    T('chạm giữa bụng → 1 lần', (await ev("document.querySelector('#kN').textContent")) === '1');
    const tap1 = JSON.parse(await ev("sessionStorage.getItem('lstp_kick_active')")).taps[0];
    T('lưu x,y ≈ 0.5', Math.abs(tap1.x - 0.5) < 0.02 && Math.abs(tap1.y - 0.5) < 0.02, JSON.stringify(tap1));
    await page.click('#kBelly'); await sleep(100);
    T('chạm lại < 0,8 s → không đếm', (await ev("document.querySelector('#kN').textContent")) === '1');
    await sleep(800);
    // Chạm góc (trong khung button, ngoài hình tròn)
    const r = JSON.parse(await ev("JSON.stringify(document.querySelector('#kBelly').getBoundingClientRect())"));
    for (const t of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type: t, x: r.left + 4, y: r.top + 4, button: 'left', clickCount: 1 });
    await sleep(100);
    T('chạm ngoài hình tròn → không đếm (AC-08)', (await ev("document.querySelector('#kN').textContent")) === '1');
    await sleep(850);
    await page.click('[data-act=kickTapBtn]'); await sleep(100);
    T('nút "Con vừa đạp" → 2, x=y=null', (await ev("document.querySelector('#kN').textContent")) === '2' && JSON.parse(await ev("sessionStorage.getItem('lstp_kick_active')")).taps[1].x === null);
    T('aria-live đọc "Đã đếm 2 lần trong giờ thứ 1"', await (async () => { await sleep(700); return (await ev("document.querySelector('#kLive').textContent")) === 'Đã đếm 2 lần trong giờ thứ 1'; })());
    await page.click('#kUndo'); await sleep(100);
    T('Bỏ lần vừa chạm → 1', (await ev("document.querySelector('#kN').textContent")) === '1');
    await sleep(850); await page.click('[data-act=kickTapBtn]'); await sleep(850); await page.click('[data-act=kickTapBtn]'); await sleep(100);
    T('3 lần, chưa có Xong ✓', (await ev("document.querySelector('#kN').textContent")) === '3' && await ev("document.querySelector('#kDone').hidden"));
    T('bong bóng hihi ở lần 3', await ev("document.querySelector('#kHihi').classList.contains('show')"));
    // Tua tới T+60 → ◆
    await ev(`window.__setOff(61*${MIN})`); await sleep(500);
    T('T+60 với 3 lần → thẻ ◆, giờ thứ 2', await ev("!!document.querySelector('.kick-attn')") && /Giờ thứ 2 · còn (58:5\d|59:\d\d)/.test(await ev("document.querySelector('#kTimer').textContent")), await ev("document.querySelector('#kTimer').textContent"));
    T('focus tiêu đề thẻ ◆', (await ev("document.activeElement && document.activeElement.id")) === 'kAttnT');
    T('thẻ ◆ có M-153a (OB trống), không nút gọi', await ev("(t=>t.includes('gọi cho nơi chị đang khám thai')&&!document.querySelector('.kick-attn a[href^=tel]'))(document.querySelector('.kick-attn').innerText)"));
    T('dòng Tổng 2 giờ: 3 lần', (await ev("document.querySelector('#kTotal2').textContent")) === 'Tổng 2 giờ: 3 lần');
    await page.click('#kBelly'); await sleep(150);
    T('chạm bụng ở giờ 2 → đếm 1, thẻ thu thành thanh M-156', (await ev("document.querySelector('#kN').textContent")) === '1' && await ev("!document.querySelector('.kick-attn') && !!document.querySelector('.kick-attn-bar')"));
    // Rời màn đếm → dải L12
    await go('kick_guide'); await sleep(1200);
    T('dải L12 hiện ở màn khác', await ev("!document.querySelector('#kick-strip').hidden && document.querySelector('#kick-strip').innerText.includes('Đang đếm cử động thai')"));
    // T+121 → tự chuyển trang khẩn dù đang ở Hướng dẫn
    await ev(`window.__setOff(121*${MIN})`); await sleep(1300);
    T('T+120 tổng 4 → tự sang see_doctor', (await scr()) === 'see_doctor');
    const top = JSON.parse(await ev("JSON.stringify(window.LSTP_APP.state.stack[window.LSTP_APP.state.stack.length-1].params)"));
    T('lý do h2_low + lt10_2h, from kick', JSON.stringify(top.reasons) === '["h2_low","lt10_2h"]' && top.from === 'kick', JSON.stringify(top));
    const saved = JSON.parse(await ev("sessionStorage.getItem('lstp_kick_sessions')") || '[]');
    T('lượt lưu red, active đã xóa', saved.length === 1 && saved[0].level === 'red' && !(await ev("sessionStorage.getItem('lstp_kick_active')")), JSON.stringify(saved[0] && saved[0].level));
    // Lượt 2: 10 lần → mưa tim → K05 → Như mọi ngày → K06
    await ev(`window.__setOff(200*${MIN})`);
    await go('kick_home'); await sleep(80);
    await page.click('[data-go=kick_before]'); await sleep(60);
    await page.click('#kBeforeGo'); await sleep(60);
    await page.click('#kPauseGo'); await sleep(120);
    for (let i = 0; i < 10; i++) { await page.click('#kBelly'); await sleep(820); }
    // QA (NS-3 review Bước A): chỉ nhận true; màn đếm giữ mưa ~2 s trước khi chốt (kick.js), nên dò trong 2 giây
    { let on = false; for (let i = 0; i < 20 && !on; i++) { on = await ev("!!document.querySelector('#kRain.on')") === true; if (!on) await sleep(100); }
      T('đủ 10 → mưa tim', on === true); }
    await sleep(2300);
    T('sang kick_feel', (await scr()) === 'kick_feel', await scr());
    await page.click('[data-act=kickFeel][data-feel=same]'); await sleep(150);
    T('K06 "Đủ 10 lần rồi 💗" + M-102 + M-105', (await scr()) === 'kick_result' && await ev("(t=>t.includes('Đủ 10 lần rồi 💗')&&t.includes('Con đang cử động đều. Chị nhớ đếm lại vào bữa sau nhé.')&&t.includes('kể cả khi đã đếm đủ'))(document.querySelector('#main').innerText)"));
    // Lượt 3: tải lại giữa lượt (R-09)
    await go('kick_home'); await sleep(60);
    await page.click('[data-go=kick_before]'); await sleep(60); await page.click('#kBeforeGo'); await sleep(60); await page.click('#kPauseGo'); await sleep(120);
    await page.click('#kBelly'); await sleep(850); await page.click('#kBelly'); await sleep(100);
    await ev(`window.__setOff(270*${MIN})`);
    await page.navigate(srv.url); await sleep(1300);
    // QA (sau review C-1): app không TỰ chuyển nữa; mở lại ở Trang chính có dải ◆ → chị bấm dải mới vào màn đếm
    T('mở lại T+70 với 2 lần → ở Trang chính, có dải ◆ "Đang đếm cử động thai"', (await scr()) === 'home' && /◆/.test(await ev("(s=>s&&!s.hidden?s.innerText:'')(document.querySelector('#kick-strip'))")), await scr());
    await page.click('#kick-strip .kick-strip-btn'); await sleep(300);
    T('mở lại T+70 với 2 lần → K04 có thẻ ◆, còn ~50:00', (await scr()) === 'kick_count' && !!(await ev("!!document.querySelector('.kick-attn')")) && /Giờ thứ 2 · còn (49:5\d|50:0\d)/.test(await ev("document.querySelector('#kTimer').textContent")), (await scr()) + ' ' + await ev("document.querySelector('#kTimer') && document.querySelector('#kTimer').textContent"));
    await page.click('[data-act=kickSelfReport]'); await sleep(200);
    T('tự báo trong thẻ ◆ → see_doctor mother_reported', (await scr()) === 'see_doctor' && (await ev("JSON.stringify(window.LSTP_APP.state.stack.at(-1).params.reasons)")) === '["mother_reported"]');
    // XSS + dữ liệu hỏng
    await ev(`(()=>{const l=JSON.parse(sessionStorage.getItem('lstp_kick_sessions'));l.push({v:1,id:'<img src=x onerror=window.__xss=1>',startAt:Date.now(),taps:[]});l.push({v:1,id:'abcdefghijkl12345678',startAt:Date.now(),meal:'<img src=x onerror=window.__xss=1>',taps:[]});sessionStorage.setItem('lstp_kick_sessions',JSON.stringify(l));})()`);
    for (const s of ['kick_home', 'kick_track', 'kick_footprints', 'kick_data', 'kick_guide']) { await go(s); await sleep(150); }
    T('XSS không chạy, các màn vẫn hiện', !(await ev("window.__xss")) && (await scr()) === 'kick_guide');
    await go('kick_track'); await sleep(100);
    T('K08 ô nặng nhất ▲ ×3 (cùng ô)', await ev("(b=>!!b && b.innerText.includes('×3'))(document.querySelector('.kick-cell.lv-urgent'))"), await ev("[...document.querySelectorAll('.kick-cell')].map(b=>b.className+':'+b.innerText).join('|')"));
    await page.click('.kick-cell'); await sleep(120);
    T('chạm ô → chi tiết 3 lượt', await ev("document.querySelectorAll('#kCellDetail li').length===3"));
    await page.click('[data-act=kickTable]'); await sleep(100);
    T('Xem dạng bảng → bảng có thead', await ev("!!document.querySelector('.kick-table thead')"));
    await go('kick_footprints'); await sleep(100);
    await page.click('[data-act=kickRange][data-range=all]'); await sleep(100);
    T('K09 có dấu chân + câu vùng', await ev("document.querySelectorAll('.fp-dot').length>0 && document.querySelector('#main').innerText.includes('Con hay đạp nhất')"));
    await go('kick_data'); await sleep(100);
    const nBefore = await ev("document.querySelectorAll('.kick-item').length");
    await page.click('[data-act=kickDel]'); await sleep(60);
    T('Xóa lần 1 → "Chạm lần nữa để xóa"', (await ev("document.querySelector('[data-act=kickDel]').textContent")) === 'Chạm lần nữa để xóa');
    await page.click('[data-act=kickDel]'); await sleep(120);
    T('Xóa lần 2 → bớt một lượt', (await ev("document.querySelectorAll('.kick-item').length")) === nBefore - 1);
    await page.click('#kClearAll'); await sleep(80);
    T('L08 focus "Thôi, giữ lại"', (await ev("document.activeElement.textContent")) === 'Thôi, giữ lại');
    await page.click('[data-act=kickClearDo]'); await sleep(120);
    T('Xóa mọi lượt → hết khóa lstp_kick_*', await ev("Object.keys(sessionStorage).filter(k=>k.startsWith('lstp_kick_')).length===0"));
    // 320 px: không cuộn ngang ở màn đếm
    await page.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
    await go('kick_home'); await sleep(60); await page.click('[data-go=kick_before]'); await sleep(60); await page.click('#kBeforeGo'); await sleep(60); await page.click('#kPauseGo'); await sleep(150);
    T('320px: không cuộn ngang, bụng ≥ 256', await ev("document.documentElement.scrollWidth<=320 && document.querySelector('#kBelly').getBoundingClientRect().width>=255"), await ev("document.documentElement.scrollWidth+' '+document.querySelector('#kBelly').getBoundingClientRect().width"));
    await page.screenshot(path.join(process.env.TMPDIR, 'k04-320.png'));
    await page.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 1, mobile: true });
    await sleep(100);
    T('375×667: bụng, bộ đếm, đồng hồ, nút Con vừa đạp trong màn đầu', await ev("(()=>{const b=document.querySelector('.kick-tap-btn').getBoundingClientRect();return b.bottom<=667 && document.querySelector('#kBelly').getBoundingClientRect().width>=260})()"), await ev("document.querySelector('.kick-tap-btn').getBoundingClientRect().bottom"));
    await page.screenshot(path.join(process.env.TMPDIR, 'k04-375.png'));
    T('không request script.google.com', !reqs.some(u => /script\.google/.test(u)));
    T('không lỗi console', errors.length === 0, errors.join(' | '));
  } catch (e) { T('probe chạy hết', false, e.stack); }
  finally { kill(); await srv.close(); }
};
