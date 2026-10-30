/* =========================================================
   E2E gộp từ script thử của FE-5 (fe5-invite.js, 5 ca) – Mẹ Bầu An Yên.
   Chủ: qa-tester (T-Q2 tiếp quản, 29/10/2026). Kiểm: lời mời bật thói quen "Đếm cử động thai" ở tuần 28 (AC-134).
   Thân kịch bản giữ NGUYÊN VĂN của dev; chỉ đổi phần khung: tests/e2e.js truyền ctx
   (launch đã cài chốt chặn script.google 3 lớp, startStatic luôn MOCK, T ghi vào kết quả chung, cổng riêng).
   Chạy qua: tests/e2e.js --only=dev-fe5-invite
   ========================================================= */
'use strict';
const path = require('path');
module.exports = async function (ctx) {
  const { launch, sleep, startStatic, T } = ctx;
  const APP = ctx.APP, APPDIR = ctx.APP;
  let fails = 0, passes = 0, f = 0;

  void fails; void passes; void f; void path;

  const srv = await startStatic({ port: 8792, appDir: APP, mock: true, mockUrl: 'http://127.0.0.1:8790/exec' });
  const OUT = process.env.TMPDIR + '/fe5out';
  require('fs').mkdirSync(OUT, { recursive: true });
  const { page, kill } = await launch({ userDataDir: path.join(OUT, 'c2-' + Date.now()), width: 375, height: 812 });
  await page.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  const ev = e => page.evaluate(e);
  const go = async n => { await ev(`window.LSTP_APP.go(${JSON.stringify(n)})`); await sleep(150); };
  try {
    await page.navigate(srv.url); await sleep(300);
    const today = await ev('window.LSTP_APP.today()');
    const setup = async (eddOff, prefs) => {
      await ev(`Object.keys(localStorage).filter(k=>k.startsWith('lstp_')).forEach(k=>localStorage.removeItem(k));
        localStorage.setItem('lstp_v1_local', JSON.stringify({v:1, consent:{journey:true, writing:true, version:'0.2', at:Date.now()}, createdAt:Date.now()}));
        localStorage.setItem('lstp_profile', JSON.stringify({v:1, edd: window.LSTP_STATS.addDays(${JSON.stringify(today)}, ${eddOff}), asked:true, at:Date.now()}));
        ${prefs ? `localStorage.setItem('lstp_v1_habits', JSON.stringify({prefs:${JSON.stringify(prefs)}, days:{}}));` : ''}`);
      await page.navigate(srv.url); await sleep(300); await go('habits');
    };
    await setup(140, null); // 20 tuần
    T('<28 tuần, chưa lưu cài đặt: kick tắt', await ev("!document.querySelector('[data-code=kick]') && !document.querySelector('.hb-invite')"), '');
    await setup(81, { v: 1, enabled: ['thai_giao', 'breath', 'water', 'side_sleep'], at: Date.now() - 10 * 864e5 });
    T('≥28 tuần, cài đặt lưu trước mốc: mời bật', await ev("!!document.querySelector('.hb-invite')"), await ev("document.querySelector('#main').textContent.slice(0,300)"));
    await page.click('[data-act=hbInviteLater]'); await sleep(150);
    T('Để sau → không hỏi lại', await ev("!document.querySelector('.hb-invite') && !document.querySelector('[data-code=kick]')"), '');
    await page.navigate(srv.url); await sleep(300); await go('habits');
    T('mở lại vẫn không hỏi', await ev("!document.querySelector('.hb-invite')"), '');
    await setup(81, { v: 1, enabled: ['thai_giao', 'breath', 'water', 'side_sleep'], at: Date.now() - 10 * 864e5 });
    await page.click('[data-act=hbInviteOn]'); await sleep(150);
    T('Bật → kick hiện', await ev("!!document.querySelector('[data-code=kick]') && !document.querySelector('.hb-invite')"), '');
    // ảnh chụp
    await ev(`window.LSTP_STORE.habits.setMark(${JSON.stringify(today)},'water','x'); window.LSTP_STORE.habits.setMark(window.LSTP_STATS.addDays(${JSON.stringify(today)},-1),'water','x');window.LSTP_STORE.habits.setMark(window.LSTP_STATS.addDays(${JSON.stringify(today)},-1),'breath','a')`);
    for (const n of ['habits', 'habits_stats', 'thaigiao', 'journey']) { await go(n); await page.screenshot(OUT + '/shot-' + n + '.png', true); }
  } catch (e) { T('run', false, e.stack); } finally { kill(); await srv.close(); }
};
