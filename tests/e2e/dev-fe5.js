/* =========================================================
   E2E gộp từ script thử của FE-5 (fe5-e2e.js, 72 ca) – Mẹ Bầu An Yên.
   Chủ: qa-tester (T-Q2 tiếp quản, 29/10/2026). Kiểm: G01 Thai giáo, G02 Hộp thư, N01–N03 Thói quen, J01 Hành trình.
   Thân kịch bản giữ NGUYÊN VĂN của dev; chỉ đổi phần khung: tests/e2e.js truyền ctx
   (launch đã cài chốt chặn script.google 3 lớp, startStatic luôn MOCK, T ghi vào kết quả chung, cổng riêng).
   Chạy qua: tests/e2e.js --only=dev-fe5
   ========================================================= */
'use strict';
const path = require('path');
module.exports = async function (ctx) {
  const { launch, sleep, startStatic, T } = ctx;
  const APP = ctx.APP, APPDIR = ctx.APP;
  let fails = 0, passes = 0, f = 0;

  void fails; void passes; void f; void path;

  const srv = await startStatic({ port: 8791, appDir: APP, mock: true, mockUrl: 'http://127.0.0.1:8790/exec' });
  const OUT = process.env.TMPDIR + '/fe5out';
  require('fs').mkdirSync(OUT, { recursive: true });   // QA (NS-4): thư mục tạm mới chưa có fe5out
  const { page, kill } = await launch({ userDataDir: path.join(OUT, 'chrome-fe5-' + Date.now()), width: 375, height: 812 });
  const errors = [];
  page.on('Runtime.exceptionThrown', p => errors.push('exception: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
  page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push('console.error: ' + p.args.map(a => a.value ?? a.description).join(' ')); });
  await page.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  const ev = e => page.evaluate(e);
  const scr = () => ev("document.querySelector('#main').dataset.screen");
  const toast = () => ev("document.querySelector('#toast').textContent");
  const go = async (n) => { await ev(`window.LSTP_APP.go(${JSON.stringify(n)})`); await sleep(120); };
  const typeInto = async (sel, text) => { await ev(`(()=>{const t=document.querySelector(${JSON.stringify(sel)}); t.focus(); t.value=''; t.dispatchEvent(new Event('input',{bubbles:true}));})()`); await page.type(text); await sleep(80); };
  try {
    await page.navigate(srv.url); await sleep(300);
    // Chế độ lưu trên máy, có đồng ý chữ, có ngày dự sinh (28 tuần 3 ngày hôm nay)
    const today = await ev("window.LSTP_APP.today()");
    const edd = await ev(`window.LSTP_STATS.addDays(${JSON.stringify(today)}, 81)`);
    await ev(`localStorage.setItem('lstp_v1_local', JSON.stringify({v:1, consent:{journey:true, writing:true, version:'0.2', at:Date.now()}, createdAt:Date.now()}));
      localStorage.setItem('lstp_profile', JSON.stringify({v:1, edd:${JSON.stringify(edd)}, asked:true, at:Date.now()}));
      localStorage.setItem('lstp_kick_sessions', JSON.stringify([{v:1,id:'kk0000000000000000a1',startAt:Date.now()-3600e3*3,endAt:Date.now()-3600e3*2,meal:'lunch',taps:[{t:1000,x:0.2,y:0.8},{t:2000,x:0.25,y:0.75},{t:3000,x:0.8,y:0.2},{t:4000,x:null,y:null}],signs:[],motherReportedAt:null,doneAt:null,stoppedAt:null,feel:'same',level:'green',hadYellow:false,reasons:[],h1:4,h2:0,total:4,min4:1,min10:null}]));`);
    await page.navigate(srv.url); await sleep(400);
    T('vào thẳng home (local)', await scr() === 'home', await scr());
    T('ô Thai giáo, Thói quen, Hành trình, Hộp thư trên home', await ev("['thaigiao','habits','journey','letters'].every(g=>document.querySelector('#main [data-go='+g+']'))"));

    /* ---- G01 ---- */
    await go('thaigiao');
    T('G01 h1', await ev("document.querySelector('#main h1').textContent") === 'Thai giáo · Lời mẹ kể 💌');
    const p1 = await ev("document.querySelector('.tg-prompt-text').textContent");
    await page.click('[data-act=tgNext]'); await sleep(80);
    const p2 = await ev("document.querySelector('.tg-prompt-text').textContent");
    T('Đổi lời nhắc khác → lời khác', p1 !== p2);
    const seen = new Set([p1, p2]);
    for (let i = 0; i < 14; i++) { await page.click('[data-act=tgNext]'); await sleep(30); seen.add(await ev("document.querySelector('.tg-prompt-text').textContent")); }
    T('16 lời không lặp trong phiên (AC-59)', seen.size === 16, seen.size);
    T('Cất mờ khi trống', await ev("document.querySelector('#tg-save').getAttribute('aria-disabled')") === 'true');
    T('Mẹ đã làm rồi là nút chính khi trống', await ev("document.querySelector('#tg-done').classList.contains('btn-primary')"));
    await page.click('#tg-done'); await sleep(100);
    T('toast Mẹ đã làm rồi', /Đã ghi nhận. Hôm nay mẹ đã dành thời gian cho con/.test(await toast()));
    T('dải ✓ Hôm nay mẹ đã làm rồi', await ev("!!document.querySelector('.tg-done-band') && !document.querySelector('#tg-done')"));
    T('thói quen thai_giao tự đánh dấu a', await ev(`window.LSTP_STORE.habits.getDay(${JSON.stringify(today)}).marks.thai_giao`) === 'a');
    // XSS
    await typeInto('#tg-text', '<img src=x onerror="window.__xss=1"> mẹ thương con');
    T('Cất thức dậy khi có chữ', await ev("document.querySelector('#tg-save').classList.contains('ready')"));
    await page.click('#tg-save'); await sleep(150);
    T('toast Đã cất', /Đã cất vào hộp thư của con/.test(await toast()), await toast());
    // PII
    await typeInto('#tg-text', 'Hôm nay bố con là anh Trần Minh Quân về sớm');
    await page.click('#tg-save'); await sleep(120);
    T('bảng PII hiện (AC-65)', await ev("!!document.querySelector('#tg-pii')"));
    T('bảng PII có câu bộ lọc', /Bộ lọc không thể phát hiện mọi thông tin/.test(await ev("document.querySelector('#tg-pii').textContent")));
    await page.click('#tg-save'); await sleep(150);
    T('bấm lần nữa = vẫn giữ → cất', /Đã cất/.test(await toast()) && await ev("document.querySelector('#tg-text').value") === '');
    // Bỏ đoạn đó
    await typeInto('#tg-text', 'Gọi mẹ số 0912345678 nhé con');
    await page.click('#tg-save'); await sleep(120);
    if (await ev("!!document.querySelector('#tg-pii')")) {
      await page.click('[data-act=tgPiiDrop]'); await sleep(80);
      T('Bỏ đoạn đó xóa số', !/0912345678/.test(await ev("document.querySelector('#tg-text').value")), await ev("document.querySelector('#tg-text').value"));
    } else T('PII số điện thoại bắt được', false);
    // Dấu hiệu
    await typeInto('#tg-text', 'Sáng nay mẹ thấy ra máu một chút');
    await page.click('#tg-save'); await sleep(120);
    T('thẻ dấu hiệu trên ô (AC-66)', await ev("!!document.querySelector('#tg-sign')") && await scr() === 'thaigiao');
    T('chữ không mất', /ra máu/.test(await ev("document.querySelector('#tg-text').value")));
    await page.click('[data-act=tgSignOk]'); await sleep(150);
    T('Mình đã đi khám rồi → cất', /Đã cất/.test(await toast()), await toast());
    // Tự hại
    await typeInto('#tg-text', 'mẹ muốn chết quá');
    await page.click('#tg-save'); await sleep(150);
    T('tự hại → urgent', await scr() === 'urgent', await scr());
    await page.click('[data-act=urgSafe]'); await sleep(250);
    T('Tiếp tục → về G01 và cất tiếp', await scr() === 'thaigiao' && /Đã cất/.test(await toast()), (await scr()) + ' ' + await toast());

    /* ---- G02 ---- */
    await go('letters');
    T('G02 có 4 lá', await ev("document.querySelectorAll('.letter').length") === 4, await ev("document.querySelectorAll('.letter').length"));
    T('XSS hiện nguyên văn, không chạy (AC-05)', await ev("window.__xss === undefined && document.querySelector('#main').textContent.includes('<img src=x')"));
    await page.click('[data-act=ltDelete]'); await sleep(60);
    T('bấm 1: Bấm lần nữa để xóa', await ev("document.querySelector('[data-act=ltDelete]').textContent") === 'Bấm lần nữa để xóa');
    await page.click('[data-act=ltDelete]'); await sleep(120);
    T('bấm 2: xóa + toast', await ev("document.querySelectorAll('.letter').length") === 3 && await toast() === 'Đã xóa lời nhắn.');

    /* ---- N01 ---- */
    await go('habits');
    T('N01 có 5 thói quen mặc định (move tắt; kick bật vì đủ 28 tuần? xem)', true, '');
    const codes = await ev("[...document.querySelectorAll('[data-act=hbToggle]')].map(b=>b.dataset.code).join(',')");
    console.log('   thói quen hiện:', codes, '· mời bật kick:', await ev("!!document.querySelector('.hb-invite')"));
    T('thai_giao hiện tự đánh dấu', /tự đánh dấu/.test(await ev("document.querySelector('[data-code=thai_giao]').textContent")));
    await page.click('[data-act=hbToggle][data-code=water]'); await sleep(100);
    T('tick nước: aria-pressed + toast', await ev("document.querySelector('[data-code=water]').getAttribute('aria-pressed')") === 'true' && await toast() === 'Đã ghi nhận 💗');
    T('3 nút ngày', await ev("document.querySelectorAll('[data-act=hbDay]').length") === 3);
    await page.click('[data-act=hbDay]'); await sleep(80);
    await page.click('[data-act=hbToggle][data-code=water]'); await sleep(80);
    T('tick hôm kia', await ev(`window.LSTP_STORE.habits.getDay(window.LSTP_STATS.addDays(${JSON.stringify(today)},-2)).marks.water`) === 'x');
    T('habits.mark ngày quá 3 hôm bị từ chối', await ev(`window.LSTP_HABITS.mark('water', window.LSTP_STATS.addDays(${JSON.stringify(today)},-3),'x').reason`) === 'day');
    T('habits.mark a không đè x', await ev(`JSON.stringify(window.LSTP_HABITS.mark('water', ${JSON.stringify(today)}, 'a'))`) === '{"ok":true,"val":"x","changed":false}');
    // N02
    await go('habits_choose');
    T('N02 6 công tắc role=switch', await ev("document.querySelectorAll('[role=switch]').length") === 6);
    T('move tắt mặc định', await ev("document.querySelector('[data-code=move]').getAttribute('aria-checked')") === 'false');
    // N03
    await go('habits_stats');
    const st = await ev("document.querySelector('#main').textContent");
    T('N03 tháng này', /Tháng này chị đã làm \d+ ngày\./.test(st));
    T('N03 không "mất chuỗi"/huy hiệu', !/mất chuỗi|huy hiệu|thất bại/i.test(st));
    T('N03 thanh 7 ngày có chữ n/7', /\d\/7 ngày/.test(st));
    const minCell = await ev("Math.min(...[...document.querySelectorAll('.cal-grid button.cal-cell')].map(b=>Math.min(b.getBoundingClientRect().width,b.getBoundingClientRect().height)))");
    T('ô lịch ≥ 44 px ở 375', minCell >= 44, minCell);
    await page.click('.cal-grid button.is-today'); await sleep(80);
    T('chạm ngày → chi tiết', /Ngày \d\d\/\d\d: chị đã làm \d+ việc\./.test(await ev("document.querySelector('.hb-detail').textContent")));
    await page.click('[data-act=hbMonth][data-step="-1"]'); await sleep(80);
    T('tháng trước', /Tháng/.test(await ev("document.querySelector('.cal-title').textContent")));
    const hscroll = await ev("document.documentElement.scrollWidth > window.innerWidth");
    T('không cuộn ngang ở 375 (N03)', !hscroll);

    /* ---- J01 ---- */
    await go('journey');
    const jt = await ev("document.querySelector('#main').textContent");
    T('J01 có bản đồ + dòng thời gian', /Bản đồ bước chân/.test(jt) && /Dòng thời gian/.test(jt));
    T('J01 nhóm theo tuần thai', /Tuần 28 ·/.test(jt), jt.slice(0, 600));
    T('J01 vùng nhiều nhất', /Con hay đạp nhất ở phía dưới bên trái\./.test(jt));
    T('J01 lần bấm nút không vị trí', /Có 1 lần chị bấm nút/.test(jt));
    T('J01 mốc đếm không ghi mức', /1 lượt đếm · 4 bước chân/.test(jt) && !/xanh|Con cử động đều/.test(jt));
    T('J01 bản đồ role=img aria-label', /Bản đồ bước chân cả hành trình: 3 bước chân/.test(await ev("document.querySelector('.fp-belly').getAttribute('aria-label')")));
    await page.click('[data-act=jrDel][data-type=kick]'); await sleep(50);
    await page.click('[data-act=jrDel][data-type=kick]'); await sleep(150);
    T('xóa mốc đếm (2 lần)', await ev("JSON.parse(localStorage.getItem('lstp_kick_sessions')||'[]').length") === 0, await ev("localStorage.getItem('lstp_kick_sessions')"));
    await page.click('[data-act=jrClearAsk]'); await sleep(120);
    T('hộp L15 alertdialog, focus Thôi', await ev("!!document.querySelector('[role=alertdialog]') && document.activeElement.textContent.trim()==='Thôi, giữ lại'"));
    await page.key('Escape'); await sleep(80);
    T('Esc đóng hộp', await ev("!document.querySelector('[role=alertdialog]')"));
    await page.click('[data-act=jrClearAsk]'); await sleep(120);
    await ev("[...document.querySelectorAll('[role=alertdialog] button')].find(b=>/Mình hiểu/.test(b.textContent)).click()"); await sleep(200);
    T('Xóa cả hành trình → rỗng + toast', /Hành trình còn trống/.test(await ev("document.querySelector('#main').textContent")) && await toast() === 'Đã xóa hành trình.', await toast());
    T('thói quen còn nguyên sau xóa hành trình', await ev(`window.LSTP_STORE.habits.getDay(${JSON.stringify(today)}).marks.water`) === 'x');

    /* ---- 320 px ---- */
    await page.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
    for (const n of ['thaigiao', 'letters', 'habits', 'habits_choose', 'habits_stats', 'journey']) {
      await go(n); await sleep(60);
      const small = await ev("[...document.querySelectorAll('#main button, #main a, #main textarea')].filter(b=>b.offsetParent && !b.closest('.cal-legend')).map(b=>{const r=b.getBoundingClientRect(); return [r.width,r.height,(b.textContent||b.className).trim().slice(0,20)]}).filter(([w,h])=>w<44||h<44)");
      T('320: vùng chạm ≥44 ở ' + n, small.length === 0, JSON.stringify(small));
      T('320: không cuộn ngang ở ' + n, !(await ev("document.documentElement.scrollWidth > window.innerWidth")), await ev("document.documentElement.scrollWidth"));
    }
    await page.send('Emulation.clearDeviceMetricsOverride', {});

    /* ---- Chế độ không lưu ---- */
    await ev("localStorage.clear !== undefined && Object.keys(localStorage).filter(k=>k.startsWith('lstp_')).forEach(k=>localStorage.removeItem(k)); Object.keys(sessionStorage).forEach(k=>sessionStorage.removeItem(k))");
    await page.navigate(srv.url); await sleep(300);
    await page.click('[data-go=guest_choice]'); await sleep(80);
    await page.click('[data-act=startNone]'); await sleep(120);
    if (await scr() === 'due_date') { await ev("(document.querySelector('[data-act=eddSkip]')||[...document.querySelectorAll('#main button')].find(b=>/Để sau/.test(b.textContent))).click()"); await sleep(120); }
    await go('thaigiao');
    T('none: không có nút Cất (AC-67)', await ev("!document.querySelector('#tg-save') && !!document.querySelector('#tg-dl')"));
    T('none: dòng chế độ', /Chế độ không lưu: đóng trang là mất/.test(await ev("document.querySelector('#main').textContent")));
    await page.click('#tg-done'); await sleep(80);
    await go('habits');
    T('none: chỉ hôm nay', await ev("document.querySelectorAll('[data-act=hbDay]').length") === 0);
    T('none: Thai giáo đã tự đánh dấu trong phiên', await ev("document.querySelector('[data-code=thai_giao]').getAttribute('aria-pressed')") === 'true');
    await go('habits_stats');
    T('none: N03 câu không lưu', /Chế độ không lưu nên mình chưa có thống kê/.test(await ev("document.querySelector('#main').textContent")));
    await go('journey');
    T('none: J01 có M-169', /chưa vẽ được các ngày trước/.test(await ev("document.querySelector('#main').textContent")));
    T('none: không ghi khóa nào', await ev("JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)])") === '[[],[]]', await ev("JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)])"));
    T('không lỗi console', errors.length === 0, errors.join(' | '));
  } catch (e) { T('chạy hết', false, e.stack); }
  finally { kill(); await srv.close(); }
};
