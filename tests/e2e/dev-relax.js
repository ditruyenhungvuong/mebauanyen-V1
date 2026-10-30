/* =========================================================
   E2E gộp từ script thử của FE-3 (probe-relax.js, 124 ca; --music 130 ca) – Mẹ Bầu An Yên.
   Chủ: qa-tester (T-Q2 tiếp quản, 29/10/2026). Kiểm: 8 trình phát, L01/L02, ba đường khẩn, AC-31, inert, AudioContext = 0 trước khi bấm, MUSIC_LINKS giả.
   Thân kịch bản giữ NGUYÊN VĂN của dev; chỉ đổi phần khung: tests/e2e.js truyền ctx
   (launch đã cài chốt chặn script.google 3 lớp, startStatic luôn MOCK, T ghi vào kết quả chung, cổng riêng).
   Chạy qua: tests/e2e.js --only=dev-relax
   ========================================================= */
'use strict';
const path = require('path');
module.exports = async function (ctx) {
  const { launch, sleep, startStatic, T } = ctx;
  const APP = ctx.APP, APPDIR = ctx.APP;
  let fails = 0, passes = 0, f = 0;
  const MUSIC = !!ctx.music;
  const WIDTH = ctx.width || 375;
  void fails; void passes; void f; void path;

  const srv = await startStatic({ port: 8781, appDir: APP, mock: true, mockUrl: 'http://127.0.0.1:8790/exec' });
  const { page, kill } = await launch({ userDataDir: path.join(process.env.TMPDIR || '/tmp', 'fe3-chrome'), width: WIDTH, height: 760 });
  const errors = [];
  page.on('Runtime.exceptionThrown', p => errors.push('exc: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
  page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push('console: ' + p.args.map(a => a.value ?? a.description).join(' ')); });
  page.on('Log.entryAdded', p => { if (p.entry.level === 'error' && !/fonts\.|example\.org/.test(p.entry.url || '') && !/media-src|example\.org/.test(p.entry.text)) errors.push('log: ' + p.entry.text + ' ' + (p.entry.url || '')); });
  const reqs = [];
  page.on('Network.requestWillBeSent', p => reqs.push(p.request.url));
  await page.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  // Đếm AudioContext; (tùy chọn) MUSIC_LINKS giả
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__ac = 0;
    const A = window.AudioContext; window.AudioContext = function(...a){ window.__ac++; return new A(...a); }; window.AudioContext.prototype = A.prototype;
    ${MUSIC ? `let _c; Object.defineProperty(window, 'LSTP_CONFIG', { configurable: true, get(){ return _c; }, set(v){
      v.MUSIC_HOSTS = ['example.org'];
      v.MUSIC_LINKS = [
        { title: 'Ru con <b>x</b>', url: 'https://example.org/ru.mp3', kind: 'audio', source: 's', license: 'l' },
        { title: 'Trang ngoài', url: 'https://example.org/page?a=1', kind: 'link', source: 's', license: 'l' },
        { title: 'YT', url: 'https://example.org/watch?v=1', kind: 'youtube', source: 's', license: 'l' },
        { title: 'HTTP', url: 'http://example.org/a.mp3', kind: 'audio', source: 's', license: 'l' },
        { title: 'Host lạ', url: 'https://evil.test/a.mp3', kind: 'audio', source: 's', license: 'l' },
        { title: 'Thiếu', url: 'https://example.org/a.mp3', kind: 'audio', source: 's' }
      ]; _c = v; } });` : ''}` });
  const ev = e => page.evaluate(e);
  const scr = () => ev("document.querySelector('#main').dataset.screen");
  const go = (n, p) => ev(`LSTP_APP.go(${JSON.stringify(n)}, ${JSON.stringify(p || {})})`);
  const overflow = () => ev('document.documentElement.scrollWidth > window.innerWidth + 1');
  const smallTargets = () => ev(`[...document.querySelectorAll('#main button, #main a, #main input[type=range], #main .rx-radio')].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && el.offsetParent !== null && (r.height < 43.5 || r.width < 43.5); }).map(el => (el.id || el.className) + ':' + Math.round(el.getBoundingClientRect().height)).slice(0, 8)`);
  const layoutCheck = async name => {
    T(name + ': không cuộn ngang @' + WIDTH, !(await overflow()));
    const s = await smallTargets(); T(name + ': vùng chạm ≥ 44', s.length === 0, s.join(', '));
  };
  try {
    await page.navigate(srv.url); await sleep(300);
    await page.click('[data-go=guest_choice]'); await sleep(80);
    await page.click('[data-act=startNone]'); await sleep(120);
    if (await scr() === 'due_date') { await ev("LSTP_APP.resetTo('home')"); await sleep(80); }
    T('home có ô Thư giãn đầu tiên', await ev("(document.querySelector('.tile')||{}).getAttribute && document.querySelector('.tile').getAttribute('data-go')") === 'pause5', await ev("document.querySelector('.tile') && document.querySelector('.tile').outerHTML"));
    await page.click('[data-go=pause5]'); await sleep(100);
    T('T01 Dừng 5 giây: có "Bỏ qua" ngay', await ev("document.querySelector('#p5btn').textContent.trim()") === 'Bỏ qua');
    await layoutCheck('T01');
    await sleep(5200);
    T('T01 sau 5 s: "Tiếp tục ›" nút chính', await ev("document.querySelector('#p5btn').textContent.trim()==='Tiếp tục ›' && document.querySelector('#p5btn').classList.contains('btn-primary')"));
    await page.click('#p5btn'); await sleep(100);
    T('T02 check-in hiện', await scr() === 'checkin');
    T('T02 có 8 thẻ capybara aria-pressed', await ev("document.querySelectorAll('[data-emo][aria-pressed]').length") === 8);
    T('T02 có thang 0–10 và "Không muốn trả lời"', await ev("!!document.querySelector('#ck-t[min=\"0\"][max=\"10\"]') && /Không muốn trả lời/.test(document.querySelector('#ck-t-opt').textContent)"));
    T('T02 có dòng "Tự đánh giá…" và dòng chế độ không lưu', await ev("/Tự đánh giá, không phải thang chẩn đoán/.test(document.body.innerText) && /Chế độ không lưu: đóng trang là mất/.test(document.body.innerText)"));
    await layoutCheck('T02');
    await page.click('[data-emo=worried]'); await sleep(30);
    T('chạm thẻ → aria-pressed=true', await ev("document.querySelector('[data-emo=worried]').getAttribute('aria-pressed')") === 'true');
    await ev("{ const r=document.querySelector('#ck-t'); r.value=7; r.dispatchEvent(new Event('input',{bubbles:true})) }");
    T('thanh trượt: nhãn + aria-valuetext', await ev("document.querySelector('#ck-t').getAttribute('aria-valuetext')") === '7 · Căng nhiều');
    // XSS + PII
    await page.click('#ck-text'); await page.type('<img src=x onerror="window.__xss=1"> số mình 0912 345 678');
    await page.click('[data-act=ckNext]'); await sleep(150);
    T('PII: bảng cảnh báo hiện, vẫn ở check-in', await scr() === 'checkin' && await ev("!!document.querySelector('.pii-panel')"));
    T('PII: chuỗi hiện dạng chữ, không chạy (AC-05)', await ev("window.__xss === undefined && !document.querySelector('#ck-pii img')"));
    await page.click('[data-act=ckNext]'); await sleep(150);
    T('PII: bấm lần hai mới đi tiếp → result', await scr() === 'result');
    T('T03: ≤ 2 thẻ gợi ý, có Đổi gợi ý, Xem cả thư viện', await ev("document.querySelectorAll('.rx-sugg').length") <= 2 && await ev("!!document.querySelector('[data-act=reSwap]') && !!document.querySelector('[data-go=library]')"));
    T('T03: chỉ một nút chính', await ev("document.querySelectorAll('#main .btn-primary').length") === 1);
    const s1 = await ev("[...document.querySelectorAll('.rx-sugg h2')].map(h=>h.textContent).join('|')");
    await page.click('[data-act=reSwap]'); await sleep(150);
    T('Đổi gợi ý: toast + đổi thẻ', /Đã đổi sang gợi ý khác/.test(await ev("document.querySelector('#toast').textContent")) && s1 !== await ev("[...document.querySelectorAll('.rx-sugg h2')].map(h=>h.textContent).join('|')"), s1);
    T('T03 dòng bản thử nghiệm', await ev("/Bản thử nghiệm/.test(document.querySelector('#main').innerText)"));
    await layoutCheck('T03');

    // Dấu hiệu nguy hiểm → trang khẩn → chọn nhầm → result còn dữ liệu (AC-26, 31)
    await go('checkin'); await sleep(100);
    await ev("{ const t=document.querySelector('#ck-text'); t.value='sáng nay mình ra máu'; t.dispatchEvent(new Event('input',{bubbles:true})) }");
    await page.click('[data-act=ckNext]'); await sleep(150);
    T('ra máu → see_doctor', await scr() === 'see_doctor');
    await page.click('[data-act=sdBack]'); await sleep(150);
    T('chọn nhầm → result, check-in còn nguyên', await scr() === 'result' && await ev("LSTP_APP.state.relax.checkin.emotions.includes('worried') && LSTP_APP.state.relax.checkin.tension===7"));
    // Tự hại → urgent → an toàn → result + thẻ A.22
    await go('checkin'); await sleep(100);
    await ev("{ const t=document.querySelector('#ck-text'); t.value='mình muốn chết cho xong'; t.dispatchEvent(new Event('input',{bubbles:true})) }");
    await page.click('[data-act=ckNext]'); await sleep(150);
    T('tự hại → urgent', await scr() === 'urgent');
    await page.click('[data-act=urgSafe]'); await sleep(150);
    T('"Mình đang an toàn" → result có thẻ A.22', await scr() === 'result' && await ev("!!document.querySelector('.human-card')"));
    // Khó chịu trong người → A.22b
    await go('checkin'); await sleep(100);
    await ev("{ const t=document.querySelector('#ck-text'); t.value='mình hơi chong mat'; t.dispatchEvent(new Event('input',{bubbles:true})) }");
    await page.click('[data-act=ckNext]'); await sleep(150);
    T('chóng mặt → dòng A.22b, gợi ý không theo nhịp', await ev("!!document.querySelector('.rx-warm')") && await ev("[...document.querySelectorAll('.rx-sugg [data-go=player]')].every(b=>['AUDIO_CALM','GROUND_54321','STOP_PAUSE'].includes(JSON.parse(b.dataset.params).id))"));
    await ev("LSTP_APP.state.relax.checkin.text=''");

    // Thư viện
    await go('library'); await sleep(100);
    T('T04: 8 bài, 3 nhóm', await ev("document.querySelectorAll('.rx-excard').length") === 8 && await ev("document.querySelectorAll('.rx-library .rx-h2').length") === 3);
    T('T04: không bài nín thở', await ev("!/BOX_4444|BREATHE_478|nín thở 4|4-7-8/.test(document.querySelector('#main').innerHTML)"));
    await layoutCheck('T04');

    // Mọi bài: chân dính 3 nút, có thẻ tư thế trừ Dừng 5 giây
    const ids = await ev("[...document.querySelectorAll('.rx-excard')].map(b=>JSON.parse(b.dataset.params).id)");
    for (const id of ids) {
      await go('player', { id }); await sleep(120);
      const info = await ev(`({ foot: document.querySelectorAll('.rx-foot [data-act]').length, posture: !!document.querySelector('.rx-posture'), unwell: !!document.querySelector('.rx-foot [data-act=unwell]'), natural: !!document.querySelector('.rx-foot [data-act=natural]'), fin: !!document.querySelector('.rx-foot [data-act=finishExercise]'), sticky: getComputedStyle(document.querySelector('.rx-foot')).position, title: document.querySelector('.bar-title') && document.querySelector('.bar-title').textContent })`);
      T(id + ': chân 3 nút, sticky', info.foot === 3 && info.unwell && info.natural && info.fin && info.sticky === 'sticky', JSON.stringify(info));
      T(id + ': thẻ tư thế ' + (id === 'STOP_PAUSE' ? 'không có' : 'có'), info.posture === (id !== 'STOP_PAUSE'));
      await layoutCheck(id);
      const footVisible = await ev("(() => { const r=document.querySelector('.rx-foot').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top < innerHeight; })()");
      T(id + ': chân trình phát thấy được ngay', footVisible);
    }
    T('chưa bấm Phát: chưa có AudioContext (AC-49)', await ev('window.__ac') === 0, await ev('window.__ac'));

    // Thở 4–6
    await go('player', { id: 'BREATHE_46' }); await sleep(120);
    T('4–6: nhịp chỉ "Ngắn hơn","Gợi ý"', await ev("[...document.querySelectorAll('[data-tempo]')].map(b=>b.textContent).join(',')") === 'Ngắn hơn,Gợi ý');
    T('4–6: không "Chậm hơn", không pha giữ', await ev("!/Chậm hơn|Giữ/.test(document.querySelector('#main').innerText)"));
    T('4–6: thời lượng 1/2/3/5', await ev("[...document.querySelectorAll('[data-dur]')].map(b=>b.dataset.dur).join(',')") === '1,2,3,5');
    await page.click('#bplay'); await sleep(1200);
    const sc1 = await ev("document.querySelector('#orb').style.transform");
    T('4–6: đang chạy, quả cầu đổi cỡ', /scale\(0\.[6-9]|scale\(1/.test(sc1) && await ev("document.querySelector('#bplay').textContent") === '❚❚ Tạm dừng', sc1);
    T('4–6: không tạo AudioContext khi âm báo tắt', await ev('window.__ac') === 0);
    // Mình thấy khó chịu: dừng đồng hồ ngay
    await page.click('[data-act=unwell]'); await sleep(50);
    const r1 = await ev("document.querySelector('#remain').textContent"); await sleep(600);
    T('L01: đồng hồ dừng ≤ 300 ms', r1 === await ev("document.querySelector('#remain').textContent") && await ev("document.querySelector('#bplay').textContent") === '▶ Tiếp tục', r1);
    T('L01: role=dialog mở, focus h2, phía sau inert', await ev("!document.querySelector('#l01').hidden && document.activeElement.id==='l01-t' && document.querySelector('.rx-player').inert && document.querySelector('#header').inert"));
    T('L01: 7 chip', await ev("document.querySelectorAll('[data-unwell]').length") === 7);
    await page.click('[data-unwell=dizzy]'); await sleep(50);
    T('L01 chóng mặt: lời nghỉ, không "Quay lại bài"', /nghỉ thêm vài phút/.test(await ev("document.querySelector('#l01-msg').textContent")) && await ev("document.querySelector('#l01-change').hidden"));
    await page.click('[data-unwell=unfit]'); await sleep(50);
    T('L01 không hợp: "Đổi bài khác" + "Quay lại bài"', await ev("!document.querySelector('#l01-change').hidden"));
    await page.click('[data-act=unwellBack]'); await sleep(50);
    T('Quay lại bài: lớp đóng, gỡ inert, focus về nút', await ev("document.querySelector('#l01').hidden && !document.querySelector('.rx-player').inert && !document.querySelector('#header').inert && document.activeElement.id==='btn-unwell'"));
    // L02
    await page.click('#bplay'); await sleep(300);
    await page.click('[data-act=natural]'); await sleep(50);
    T('L02 mở, bài tạm dừng', await ev("!document.querySelector('#l02').hidden && document.querySelector('#bplay').textContent==='▶ Tiếp tục'"));
    await page.key('Escape'); await sleep(50);
    T('L02 Esc → đóng, focus về 🍃', await ev("document.querySelector('#l02').hidden && document.activeElement.id==='btn-natural'"));
    // ẩn tab → tạm dừng
    await page.click('#bplay'); await sleep(300);
    await ev("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange'))");
    T('ẩn tab → tạm dừng', await ev("document.querySelector('#bplay').textContent") === '▶ Tiếp tục');
    await ev("delete document.hidden");
    // L01 chip nguy hiểm
    await page.click('[data-act=unwell]'); await sleep(50);
    await page.click('[data-unwell=contractions]'); await sleep(150);
    T('L01 bụng gò cứng → see_doctor from player, không quay lại', await scr() === 'see_doctor' && await ev("!document.querySelector('[data-act=sdBack]') && !document.querySelector('#header [data-act=back]')"));
    T('rời trình phát: không còn inert', await ev("!document.querySelector('[inert]')"));

    // Ngân ừm
    await go('player', { id: 'HUM' }); await sleep(100);
    T('ngân ừm: pha đúng A.9, không Chậm hơn', await ev("!/Chậm hơn/.test(document.body.innerText)"));
    // Thả lỏng từng vùng: vùng 5–7 không có pha siết
    await go('player', { id: 'RELEASE_ZONES' }); await sleep(100);
    T('PMR: 7 vùng', await ev("document.querySelectorAll('#rzones li').length") === 7);
    T('PMR: không "hóp bụng", "co ngón chân"', await ev("!/hóp bụng|co ngón chân|co nhẹ các ngón chân/i.test(document.querySelector('#main').innerText)"));
    for (let k = 0; k < 4; k++) await page.click('#rskip');
    await sleep(50);
    let ok57 = true;
    for (let k = 4; k < 7; k++) {
      const t = await ev("document.querySelector('#rcard').innerText");
      if (/Siết/.test(t) || !/Thả lỏng/.test(t)) ok57 = false;
      await page.click('#rplay'); await sleep(250);
      if (/Siết/.test(await ev("document.querySelector('#rcard').innerText"))) ok57 = false;
      await page.click('#rplay'); await page.click('#rskip'); await sleep(50);
    }
    T('PMR: vùng 5–7 không bao giờ có pha siết (switch tắt)', ok57);
    T('PMR: hết vùng → nút Check-out', await ev("!!document.querySelector('#rend [data-act=finishExercise]')"));
    // Grounding
    await go('player', { id: 'GROUND_54321' }); await sleep(100);
    T('5-4-3-2-1: bước 1 có 5 chấm 44px', await ev("document.querySelectorAll('.rx-dot').length") === 5);
    for (let k = 0; k < 3; k++) { await page.click('#gnext'); await sleep(60); }
    T('5-4-3-2-1: bước Ngửi có "Bỏ qua bước này"', await ev("!!document.querySelector('#gskip')"));
    T('5-4-3-2-1: không nhắc cử động của con', !/con đạp|cử động của con/.test(await ev("document.querySelector('#main').innerText")));
    // Dừng 5 giây bài: chạm đúp bước 4
    await go('player', { id: 'STOP_PAUSE' }); await sleep(100);
    for (let k = 0; k < 3; k++) { await page.click('#p5-next'); await sleep(450); }
    await page.click('#p5-next', 2); await sleep(150);
    T('Dừng 5 giây: chạm đúp ở bước 4 → vẫn ở bước 5', await scr() === 'player' && /Bước 5\/5/.test(await ev("document.querySelector('#p5-prog').textContent")));
    // Thở bụng
    await go('player', { id: 'BELLY_BREATH' }); await sleep(100);
    T('thở bụng: Tiếp ›, Bỏ qua, hẹn giờ 1/2/3', await ev("!!document.querySelector('#bb-next') && !!document.querySelector('#bb-skip') && [...document.querySelectorAll('[data-bbt]')].map(b=>b.dataset.bbt).join()==='1,2,3'"));
    await page.click('#bb-skip'); await sleep(60);
    T('thở bụng: Bỏ qua → lời kết + Check-out', await ev("!!document.querySelector('#bb-end [data-act=finishExercise]')"));

    // Âm thanh êm dịu
    await go('player', { id: 'AUDIO_CALM' }); await sleep(100);
    T('âm thanh: 3 âm nền, hẹn giờ 5/10/15, âm lượng 30', await ev("document.querySelectorAll('input[name=akind]').length===3 && [...document.querySelectorAll('[data-amin]')].map(b=>b.dataset.amin).join()==='5,10,15' && document.querySelector('#avol').value==='30'"));
    T('âm thanh: dòng an toàn trước nút Phát', await ev("!!(document.querySelector('.rx-safety-card').compareDocumentPosition(document.querySelector('#aplay')) & Node.DOCUMENT_POSITION_FOLLOWING)"));
    await page.click('#aplay'); await sleep(400);
    T('Phát → tạo đúng 1 AudioContext, đang phát', await ev('window.__ac') === 1 && await ev('LSTP_SOUND.playing()') === 1);
    T('Phát → "Còn m:ss"', /Còn \d+:\d\d/.test(await ev("document.querySelector('#aleft').textContent")));
    T('âm tự tạo: không tải file âm thanh', !reqs.some(u => /\.(mp3|ogg|wav|m4a)/.test(u)));
    await ev('history.back()'); await sleep(200);
    T('rời màn: âm dừng (AC-48)', await ev('LSTP_SOUND.playing()') === 0);
    // Nghe nhạc
    await go('player', { id: 'MUSIC' }); await sleep(100);
    if (!MUSIC) {
      T('nhạc rỗng: câu "Danh sách nhạc đang được bổ sung"', /Danh sách nhạc đang được bổ sung/.test(await ev("document.querySelector('#main').innerText")));
      T('nhạc: thẻ nhắc âm lượng trước Phát, hẹn giờ mặc định 10', await ev("!!(document.querySelector('.rx-volume-card').compareDocumentPosition(document.querySelector('#mplay')) & Node.DOCUMENT_POSITION_FOLLOWING) && document.querySelector('[data-amin][aria-pressed=true]').dataset.amin==='10'"));
      await page.click('#mplay'); await sleep(300);
      T('nhạc rỗng → âm tự tạo phát', await ev('LSTP_SOUND.playing()') === 1);
      await page.click('#mplay'); await sleep(100);
    } else {
      T('MUSIC_LINKS: chỉ giữ 3 mục hợp lệ + âm tự tạo', await ev("document.querySelectorAll('input[name=mpick]').length") === 4);
      T('MUSIC_LINKS: tiêu đề qua esc', await ev("!document.querySelector('.rx-radios b') && /Ru con <b>x<\\/b>/.test(document.querySelector('.rx-radios').innerText)"));
      T('link: chưa gắn href trước khi Phát', await ev("!document.querySelector('#mopen').getAttribute('href')"));
      await ev("document.querySelector('input[name=mpick][value=\"1\"]').checked=true");
      await page.click('#mplay'); await sleep(80);
      T('link → L03 mở, href nguyên văn, rel noopener noreferrer, target _blank', await ev("!document.querySelector('#l03').hidden && document.querySelector('#mopen').getAttribute('href')==='https://example.org/page?a=1' && document.querySelector('#mopen').rel==='noopener noreferrer' && document.querySelector('#mopen').target==='_blank'"));
      T('L03 nằm ngoài card (fixed theo màn hình)', await ev("document.querySelector('#l03').parentElement.id==='main'"));
      await page.click('#mcalm'); await sleep(200);
      T('"Thôi, nghe âm thanh êm dịu" → đóng lớp, phát âm tự tạo', await ev("document.querySelector('#l03').hidden") && await ev('LSTP_SOUND.playing()') === 1);
      await page.click('#mplay'); await sleep(100);
      T('không request tới example.org trước khi phát audio', !reqs.some(u => /example\.org/.test(u)));
      await ev("document.querySelector('input[name=mpick][value=\"0\"]').checked=true");
      await page.click('#mplay'); await sleep(800);
      T('audio bị chặn/lỗi → khối N-15 + nút nghe âm tự tạo', /Chưa tải được bài này/.test(await ev("document.querySelector('#mend').innerText")) && await ev("!!document.querySelector('#mcalm2')"), await ev("document.querySelector('#mend').innerText + '|' + document.querySelector('#mstatus').innerText"));
      T('<audio preload=none>', await ev("[...document.querySelectorAll('audio')].every(a=>a.preload==='none')"));
    }

    // Tư thế từ 28 tuần
    await ev("LSTP_APP.S.profile.set(LSTP_APP.U.dayKey(Date.now() + 80*86400000))"); // 200 ngày ≈ 28w4d
    await go('player', { id: 'BREATHE_46' }); await sleep(100);
    T('≥ 28 tuần: câu tránh nằm ngửa in đậm lên đầu', await ev("!!document.querySelector('.rx-posture-big b') && /Bụng đã lớn rồi/.test(document.querySelector('.rx-posture').innerText) && !/Khi bụng đã lớn/.test(document.querySelector('.rx-posture').innerText)"), await ev("JSON.stringify(LSTP_APP.gestAge())"));
    await ev("LSTP_APP.S.profile.set(LSTP_APP.U.dayKey(Date.now() + 200*86400000))");
    await go('player', { id: 'HUM' }); await sleep(100);
    T('< 28 tuần: thẻ A.6 gốc', await ev("!document.querySelector('.rx-posture-big') && /Khi bụng đã lớn/.test(document.querySelector('.rx-posture').innerText)"));

    // Check-out → hoàn tất
    await page.click('.rx-foot [data-act=finishExercise]'); await sleep(150);
    T('T08 check-out', await scr() === 'checkout');
    T('T08: Thở/ngân tự đánh dấu "a" (AC-101)', await ev("LSTP_APP.S.habits.getDay(LSTP_APP.today()).marks.breath") === 'a');
    T('T08: 4 lựa chọn + Không muốn trả lời', await ev("document.querySelectorAll('[data-fit]').length===4 && !!document.querySelector('#co-t-opt')"));
    await page.click('[data-fit=worse]'); await sleep(50);
    T('Khó chịu hơn → lời A.15 + 2 nút', /Cảm ơn chị đã nói ra/.test(await ev("document.querySelector('#co-worse').innerText")) && await ev("!!document.querySelector('#co-worse [data-go=signs]') && !!document.querySelector('#co-worse [data-go=support]')"));
    await ev("{ const r=document.querySelector('#co-t'); r.value=4; r.dispatchEvent(new Event('input',{bubbles:true})) }");
    await layoutCheck('T08');
    await page.click('[data-act=coDone]'); await sleep(150);
    T('T09 hoàn tất, Trước 7 → Sau 4', await scr() === 'done' && /Trước 7 → Sau 4/.test(await ev("document.querySelector('.rx-ba').innerText.replace(/\\s+/g,' ')")), await ev("document.querySelector('#main').innerText"));
    T('T09: không pháo hoa, có mantra, Về trang chính', await ev("!document.querySelector('.confetti,.heart-rain,.heart-fly') && /Mẹ con mình cùng Bình An nhé/.test(document.body.innerText) && !!document.querySelector('[data-act=home]')"));
    T('bản ghi check-in có after/fit', await ev("(() => { const l = LSTP_APP.S.checkins.list(); const r = l[l.length-1]; return r && r.after===4 && r.fit==='worse' && r.before===7 && r.exercise==='HUM'; })()"), await ev("JSON.stringify(LSTP_APP.S.checkins.list())"));
    T('chế độ không lưu: không khóa storage nào', await ev("Object.keys(localStorage).length===0 && Object.keys(sessionStorage).length===0"), await ev("JSON.stringify([Object.keys(localStorage),Object.keys(sessionStorage)])"));
    await layoutCheck('T09');
    // Giảm chuyển động
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await go('player', { id: 'BREATHE_46' }); await sleep(100);
    await page.click('#bplay'); await sleep(900);
    T('reduced-motion: quả cầu không đổi cỡ', await ev("document.querySelector('#orb').style.transform") === 'none' && await ev("getComputedStyle(document.querySelector('#orb')).transform") === 'none');
    await go('done'); await sleep(50);
    T('không lỗi console/exception', errors.length === 0, errors.join(' | '));
  } catch (e) { T('probe chạy hết', false, e.stack); }
  finally { kill(); await srv.close(); }
};
