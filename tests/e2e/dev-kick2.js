/* =========================================================
   E2E gộp từ script thử của FE-4 (kick-probe2.js bản 17:21, 30 ca) – Mẹ Bầu An Yên.
   Chủ: qa-tester (gộp 29/10/2026, sau review Bước A). Kiểm thiết kế C-1:
   - trang khẩn (urgent / see_doctor) đứng yên khi lượt đổi pha hay lên đỏ; lượt đỏ chưa hiện được giữ ở
     lstp_kick_active với level 'red' + dải ▲; tải lại → khởi động vào thẳng see_doctor (from:'kick'), rồi hết lượt dở,
     rời đi không quay lại (R-09);
   - K-AC-38 "đóng app" thật: đếm 2 lần, đóng trang, tua 3 giờ, mở lại → see_doctor lý do ["h2_low","lt10_2h"], lượt red;
   - kick_home không bị chuyển, có dải ◆; LSTP_KICK.reportReduced / reportSigns chốt đỏ không chuyển màn (R-06, R-07);
   - G-7 hộp L07/L08 (inert, bẫy Tab, Esc); NS-1 S.kick.clearAll() khi đang đếm.
   Thân kịch bản giữ NGUYÊN VĂN của dev; khung chạy do tests/e2e.js truyền (ctx: launch có chốt chặn script.google,
   startStatic luôn MOCK, T ghi vào kết quả chung). Chạy: tests/e2e.js --only=dev-kick2
   ========================================================= */
'use strict';
const path = require('path');
module.exports = async function (ctx) {
  const { launch, sleep, startStatic, T } = ctx;
  const APP = ctx.APP;
  let fails = 0, passes = 0;
  void fails; void passes; void path;

  const srv = await startStatic({ port: 8782, appDir: APP, mock: false });
  const { page: P, kill } = await launch({ userDataDir: path.join(process.env.TMPDIR, 'ud-kick-probe2'), width: 375, height: 740 });
  const errors = [];
  P.on('Runtime.exceptionThrown', p => errors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text));
  await P.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await P.send('Page.addScriptToEvaluateOnNewDocument', { source: "(()=>{const m=/kpoff:(-?\\d+)/.exec(window.name);let o=m?+m[1]:0;Object.defineProperty(window,'__off',{get:()=>o,set:v=>{o=v;window.name='kpoff:'+v;}});const n=Date.now.bind(Date);Date.now=()=>n()+o;})();" });
  const ev = e => P.evaluate(e);
  const clk = async s => { await ev(`document.querySelector(${JSON.stringify(s)}).click()`); await sleep(150); };
  const scr = () => ev('document.querySelector("#main").dataset.screen');
  const top = async () => JSON.parse(await ev('JSON.stringify(LSTP_APP.state.stack.at(-1))'));
  const active = async () => JSON.parse(await ev("localStorage.getItem('lstp_kick_active')"));
  const sessions = async () => JSON.parse(await ev("localStorage.getItem('lstp_kick_sessions')") || '[]');
  const strip = () => ev("(s=>s&&!s.hidden?s.innerText:'')(document.querySelector('#kick-strip'))");
  const leave = async () => { await P.click('#header [data-go=support]'); await sleep(250); };   // cú bấm thật của chị
  const start = async (taps) => {
    await leave();
    await ev("LSTP_APP.resetTo('home'); LSTP_APP.go('kick_before')"); await sleep(150);
    await clk('[data-act=kickBeforeGo]'); await clk('[data-act=kickStart]');
    for (let i = 0; i < taps; i++) { await clk('[data-act=kickTapBtn]'); await sleep(850); }
  };
  try {
    await P.navigate(srv.url); await sleep(400);
    await clk('[data-go=guest_choice]'); await clk('[data-go=consent_local]'); await clk('[data-act=consentGo]'); await clk('[data-act=eddLater]');
    T('chế độ local', (await ev('LSTP_APP.mode()')) === 'local');

    // A. Trang tự hại không bị chen
    await start(2);
    await ev("LSTP_APP.resetTo('home'); LSTP_APP.go('checkin')"); await sleep(200);
    await ev("const t=document.querySelector('#ck-text'); t.value='mình muốn chết'; t.dispatchEvent(new Event('input',{bubbles:true}))");
    await clk('[data-act=ckNext]');
    T('A: vào urgent', (await scr()) === 'urgent', await scr());
    await ev("window.__off += 61*60000"); await sleep(1600);
    T('A: T+61 vẫn ở urgent', (await scr()) === 'urgent', await scr());
    T('A: dải ◆ đang đếm hiện', /Đang đếm/.test(await strip()), await strip());
    await ev("window.__off += 60*60000"); await sleep(1600);
    T('A: T+121 vẫn ở urgent', (await scr()) === 'urgent', await scr());
    const sA = await sessions();
    T('A: lượt đã lưu đỏ, lượt dở giữ level red (chờ chị thấy trang khẩn)', sA.length === 1 && sA[0].level === 'red' && ((await active()) || {}).level === 'red', JSON.stringify(sA.map(x => x.level)));
    T('A: dải ▲ nhẹ', /Chị đi khám ngay nhé/.test(await strip()), await strip());
    await P.send('Page.reload', {}); await P.once('Page.loadEventFired'); await sleep(1200);
    const tR = await top();
    T('R-09: tải lại khi lượt đỏ còn chờ (đang ở urgent) → khởi động vào thẳng see_doctor from kick', tR.name === 'see_doctor' && tR.params.from === 'kick' && tR.params.reasons.includes('lt10_2h'), JSON.stringify(tR));
    T('sau khi hiện: hết lượt dở', !(await active()));
    await leave(); await sleep(1300);
    T('rời trang khẩn → không quay lại see_doctor', (await scr()) === 'support', await scr());

    // K-AC-38 thật: đếm dở, ĐÓNG app, 3 giờ sau mở lại → vào thẳng trang khẩn
    await start(2);
    await P.navigate('about:blank'); await sleep(200);
    await P.navigate(srv.url); await sleep(300);
    await ev("window.__off += 180*60000"); await P.navigate('about:blank'); await sleep(100);
    await P.navigate(srv.url); await sleep(1200);
    const t38 = await top();
    T('K-AC-38: đóng app, mở lại T+3h → see_doctor h2_low + lt10_2h, lượt lưu red', t38.name === 'see_doctor' && t38.params.from === 'kick' && JSON.stringify(t38.params.reasons) === '["h2_low","lt10_2h"]' && (await sessions())[0].level === 'red' && !(await active()), JSON.stringify(t38));
    // Lên đỏ khi đang ở màn thường: chuyển ngay, lượt dở xóa (tech design 7.3, K-AC-51)
    await start(2);
    await leave(); await ev("window.__off += 121*60000"); await sleep(1500);
    const tN = await top();
    T('đỏ khi ở màn thường → see_doctor ngay, lượt dở đã xóa', tN.name === 'see_doctor' && tN.params.from === 'kick' && !(await active()), JSON.stringify(tN));

    // B. see_doctor từ Dấu hiệu khi đang đếm; sang giờ 2 không chen
    await start(1);
    await leave(); await ev("LSTP_APP.resetTo('home'); LSTP_APP.go('signs')"); await sleep(150);
    await clk('[data-act=pickSign][data-id=bleeding]');
    T('B: vào see_doctor', (await scr()) === 'see_doctor', await scr());
    // QA (LSTP-QA-05 đã sửa, AC-81): chọn "Ra máu" khi có lượt dở → lượt chốt đỏ danger_sign + mã bleeding ngay, hết lượt dở
    { const sB0 = (await sessions()).slice().sort((a, b) => b.startAt - a.startAt)[0];   // lượt mới nhất (lượt B)
      T('B/AC-81: "Ra máu" ở trang Dấu hiệu → lượt chốt red, danger_sign, mã bleeding, hết lượt dở', !!sB0 && sB0.level === 'red' && sB0.reasons[0] === 'danger_sign' && (sB0.signs || []).includes('bleeding') && !(await active()), JSON.stringify(sB0 && [sB0.level, sB0.reasons, sB0.signs])); }
    await ev("window.__off += 61*60000"); await sleep(1600);
    T('B: T+61 vẫn ở see_doctor', (await scr()) === 'see_doctor', await scr());
    // Lượt B đã chốt ở trên → tự báo từ ngoài lúc này không còn lượt dở để chốt
    const rB = JSON.parse(await ev("JSON.stringify(LSTP_APP.kickReportReduced({from:'signs'}))"));
    T('kickReportReduced sau khi lượt B đã chốt → {hadActive:false}', rB.hadActive === false, JSON.stringify(rB));
    T('kickReportReduced không chuyển màn, không tạo lượt mới', (await scr()) === 'see_doctor' && !(await active()) && (await sessions()).filter(x => x.level === 'red').length >= 1);
    await sleep(1300);
    T('B: không bị chuyển sau khi báo', (await scr()) === 'see_doctor');
    T('không có lượt → {hadActive:false}', JSON.parse(await ev("JSON.stringify(window.LSTP_KICK.reportReduced({from:'checkin'}))")).hadActive === false);

    // kickReportSigns (R-07)
    await start(1);
    const rS = JSON.parse(await ev("JSON.stringify(LSTP_APP.kickReportSigns({from:'signs', signs:['bleeding']}))"));
    const sS = (await sessions()).find(x => x.id === rS.sessionId);
    T('kickReportSigns chốt đỏ danger_sign + mã dấu hiệu', sS && sS.level === 'red' && sS.reasons[0] === 'danger_sign' && sS.signs.includes('bleeding'), JSON.stringify(sS && [sS.reasons, sS.signs]));

    // F. Sang giờ 2 ở màn thường: không tự chuyển, chỉ dải ◆
    await start(1);
    await leave(); await ev("LSTP_APP.resetTo('home'); LSTP_APP.go('kick_home')"); await sleep(200);
    await ev("window.__off += 61*60000"); await sleep(1600);
    T('F: T+61 ở kick_home không bị chuyển', (await scr()) === 'kick_home', await scr());
    T('F: dải ◆', /◆/.test(await strip()) && /Đang đếm/.test(await strip()), await strip());
    await clk('#kick-strip .kick-strip-btn'); await sleep(200);
    T('F: bấm dải → màn đếm có thẻ ◆', (await scr()) === 'kick_count' && await ev("!!document.querySelector('.kick-attn')"));

    // G-7. Hộp dừng lượt: nền inert, Esc = Đếm tiếp
    await clk('[data-act=kickStop]');
    T('G-7: hộp mở, #main và #header inert', await ev("!!document.querySelector('.kick-dialog') && document.querySelector('#main').inert && document.querySelector('#header').inert"));
    T('G-7: focus "Đếm tiếp"', (await ev('document.activeElement.textContent')) === 'Đếm tiếp');
    await P.key('Tab'); await P.key('Tab');
    T('G-7: Tab xoay vòng trong hộp', !!(await ev("document.activeElement.closest('.kick-dialog')")));
    await P.key('Escape'); await sleep(100);
    T('G-7: Esc đóng, bỏ inert, vẫn đếm', await ev("!document.querySelector('.kick-dialog') && !document.querySelector('#main').inert") && (await scr()) === 'kick_count');
    await clk('[data-act=kickStop]'); await clk('[data-act=kickStopConfirm]'); await sleep(300);
    T('G-7: xác nhận dừng ở giờ 2 → kick_stopped, bỏ inert', (await scr()) === 'kick_stopped' && await ev("!document.querySelector('#main').inert"), await scr());

    // NS-1. Xóa khi đang đếm
    await start(2);
    await ev("LSTP_STORE.kick.clearAll()"); await sleep(1300);
    T('NS-1: sau xóa, hết lượt dở và dải', !(await active()) && !(await strip()), JSON.stringify(await active()));
    await sleep(900); await ev("document.querySelector('[data-act=kickTapBtn]') && document.querySelector('[data-act=kickTapBtn]').click()"); await sleep(300);
    T('NS-1: chạm thêm không ghi lại khóa', !(await active()) && (await scr()) !== 'kick_count', (await scr()) + ' ' + JSON.stringify(await active()));
    T('không lỗi JS', errors.length === 0, errors.join(' | '));
  } catch (e) { T('probe chạy hết', false, e.stack); }
  finally { kill(); await srv.close(); }
};
