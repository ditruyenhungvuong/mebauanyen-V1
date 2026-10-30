/* =========================================================
   E2E gộp từ script thử của FE-1 (fe1-check.js, 95 ca) – Mẹ Bầu An Yên.
   Chủ: qa-tester (T-Q2 tiếp quản, 29/10/2026). Kiểm: luồng none/local, A09, S01–S04, P01, I01, thứ tự ô A.25, 375/320 px, vùng chạm ≥ 44 px.
   Thân kịch bản giữ NGUYÊN VĂN của dev; chỉ đổi phần khung: tests/e2e.js truyền ctx
   (launch đã cài chốt chặn script.google 3 lớp, startStatic luôn MOCK, T ghi vào kết quả chung, cổng riêng).
   Chạy qua: tests/e2e.js --only=dev-fe1
   ========================================================= */
'use strict';
const path = require('path');
module.exports = async function (ctx) {
  const { launch, sleep, startStatic, T } = ctx;
  const APP = ctx.APP, APPDIR = ctx.APP;
  let fails = 0, passes = 0, f = 0;

  void fails; void passes; void f; void path;

  const srv = await startStatic({ port: 8781, appDir: APPDIR, mock: false });
  const { page, kill } = await launch({ userDataDir: path.join(process.env.TMPDIR, 'fe1-chrome-' + Date.now()), width: 375, height: 740 });
  const errors = [], reqs = [];
  page.on('Runtime.exceptionThrown', p => errors.push('exc: ' + (p.exceptionDetails.exception?.description || p.exceptionDetails.text)));
  page.on('Runtime.consoleAPICalled', p => { if (p.type === 'error') errors.push('console: ' + p.args.map(a => a.value ?? a.description).join(' ')); });
  page.on('Network.requestWillBeSent', p => reqs.push(p.request.url));
  await page.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  const ev = e => page.evaluate(e);
  const scr = () => ev("document.querySelector('#main').dataset.screen");
  const click = async s => { await page.click(s); await sleep(150); };
  const act = async (name) => { await ev(`document.querySelector('[data-act="${name}"]').click()`); await sleep(150); };
  const keys = () => ev('JSON.stringify([Object.keys(localStorage).sort(), Object.keys(sessionStorage).sort()])');
  const layoutCheck = async (label) => {
    const r = JSON.parse(await ev(`(() => {
      const over = document.scrollingElement.scrollWidth > innerWidth + 1;
      const small = [...document.querySelectorAll('#main button, #main a, #main select, #main input, #header button, #header summary, .dlg button')]
        .filter(el => el.offsetParent !== null && !el.classList.contains('link-inline') && el.type !== 'checkbox')
        .map(el => { const b = el.getBoundingClientRect(); return [el.textContent.trim().slice(0, 30) || el.getAttribute('aria-label') || el.tagName, Math.round(b.width), Math.round(b.height)]; })
        .filter(x => x[1] < 44 || x[2] < 44);
      return JSON.stringify({ over, small, sw: document.scrollingElement.scrollWidth, w: innerWidth });
    })()`));
    T(label + ': không cuộn ngang', !r.over, r.sw + ' > ' + r.w);
    T(label + ': mọi vùng chạm ≥ 44 px', r.small.length === 0, JSON.stringify(r.small));
  };
  try {
    const base = srv.url;
    await page.navigate(base); await sleep(300);
    await ev("localStorage.setItem('myJourneys','x'); localStorage.setItem('user_0900000000','y'); localStorage.setItem('musicMuted','1'); sessionStorage.setItem('stop4p_voice','z')");
    await page.navigate(base); await sleep(300);
    T('welcome', await scr() === 'welcome');
    T('Bước A: không nút đăng nhập, có dòng K-2', await ev("!document.querySelector('[data-go=login]') && document.body.innerText.includes('Đăng nhập bằng số điện thoại sẽ có ở bản sau.')"));
    await layoutCheck('A01 375');
    await click('[data-go=guest_choice]');
    T('guest_choice', await scr() === 'guest_choice');
    await layoutCheck('A02 375');
    await click('[data-act=startNone]');
    T('none → A09 due_date (lần đầu)', await scr() === 'due_date');
    T('A09: h1 focus "Con dự sinh vào ngày nào?"', await ev("document.activeElement.tagName==='H1' && document.activeElement.textContent.includes('Con dự sinh vào ngày nào?')"));
    T('A09 none: dòng "Chế độ không lưu"', await ev("document.body.innerText.includes('Chế độ không lưu: đóng trang là mất.')"));
    T('A09: không có nút ‹ ở lần đầu', await ev("!document.querySelector('#header [data-act=back]')"));
    await layoutCheck('A09 375');
    await act('eddLater');
    T('Để sau → home', await scr() === 'home');
    T('home: "Thêm ngày dự sinh ›" + dải không lưu', await ev("document.body.innerText.includes('Thêm ngày dự sinh ›') && document.body.innerText.includes('Chế độ không lưu: đóng trang là mất.')"));
    await layoutCheck('M01 375');
    T('M01: thứ tự ô A.25', JSON.stringify(await ev("[...document.querySelectorAll('.tile')].map(t=>t.dataset.go)")) === JSON.stringify(['pause5','thaigiao','kick_home','habits','letters','journey','data']), JSON.stringify(await ev("[...document.querySelectorAll('.tile')].map(t=>t.dataset.go)")));
    await click('[data-go=due_date]');
    T('home → due_date', await scr() === 'due_date');
    // nhập ngày ngoài khoảng (−15) bằng ba ô
    await act('eddParts');
    await ev("(()=>{const t=new Date(Date.now()+7*3600e3);t.setUTCDate(t.getUTCDate()-15);const s=(id,v)=>{const e=document.getElementById(id);e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}))};s('edd-y',t.getUTCFullYear());s('edd-m',t.getUTCMonth()+1);s('edd-d',t.getUTCDate());})()");
    T('ngoài khoảng: nhắc A.29, nút Lưu chưa sẵn', await ev("document.getElementById('edd-warn').innerText.includes('Ngày này có vẻ chưa đúng') && document.getElementById('edd-save').getAttribute('aria-disabled')==='true'"));
    await act('eddSave');
    T('ngoài khoảng: bấm Lưu không lưu, vẫn ở A09', await scr() === 'due_date');
    await act('eddParts');
    await ev("(()=>{const t=new Date(Date.now()+7*3600e3);t.setUTCDate(t.getUTCDate()+99);const e=document.getElementById('edd');e.value=t.toISOString().slice(0,10);e.dispatchEvent(new Event('input',{bubbles:true}))})()");
    T('xem trước "Hôm nay con được 25 tuần 6 ngày"', await ev("document.getElementById('edd-preview').innerText.includes('Hôm nay con được 25 tuần 6 ngày')"), await ev("document.getElementById('edd-preview').innerText"));
    await act('eddSave');
    T('Lưu → về home, có dòng tuần thai', await scr() === 'home' && await ev("document.body.innerText.includes('Hôm nay con được 25 tuần 6 ngày 🌱')"));
    T('toast A.29', await ev("document.getElementById('toast').textContent.includes('Đã lưu. Hôm nay con được 25 tuần 6 ngày')"));
    T('none: không ghi khóa lstp_ nào', !/lstp_/.test(await keys()), await keys());
    await click('#header [data-go=support]');
    T('support: thứ tự signs → tel:115', await ev("(()=>{const a=[...document.querySelectorAll('#screen a,#screen button')];return a[0].dataset.go==='signs' && a[1].getAttribute('href')==='tel:115'})()"));
    await layoutCheck('S01 375');
    await click('#screen [data-go=signs]');
    const nSigns = await ev("document.querySelectorAll('.sign-btn').length");
    T('signs: có danh sách dấu hiệu từ data.js', nSigns >= 11, nSigns);
    await layoutCheck('S02 375');
    await click('.sign-btn');
    T('chạm dấu hiệu → see_doctor, h1 + lý do', await scr() === 'see_doctor' && await ev("document.querySelector('.reason-box') && document.querySelector('h1').textContent.includes('Chị đi khám ngay nhé')"));
    T('see_doctor: tel:115, M-125, M-129, M-130, 2 link quay lại, không nút gọi khoa', await ev("!!document.querySelector('a[href=\"tel:115\"]') && document.body.innerText.includes('Chỉ khi được khám mới biết') && document.body.innerText.includes('Nhờ người nhà đưa chị đi') && document.body.innerText.includes('Mang theo sổ khám thai') && document.querySelectorAll('[data-act=sdBack]').length===2 && !document.body.innerText.includes('Gọi khoa cấp cứu sản')"));
    await layoutCheck('S03 375');
    await act('sdBack');
    T('"Mình chọn nhầm" → về signs', await scr() === 'signs');
    await ev("LSTP_APP.openUrgentOB({reasons:['h2_low','lt10_2h'], from:'kick'})"); await sleep(150);
    T('see_doctor từ kick: M-121 + M-122, không link quay lại, không ‹', await ev("document.body.innerText.includes('Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống.') && document.body.innerText.includes('Trong 2 giờ, con cử động chưa đủ 10 lần.') && !document.querySelector('[data-act=sdBack]') && !document.querySelector('#header [data-act=back]')"));
    await ev("LSTP_APP.openUrgentOB({signs:['bleeding','headache'],from:'kick_before'})"); await sleep(150);
    T('kick_before: M-124 Chị đang thấy + 2 dấu hiệu + link M-56', await ev("document.querySelectorAll('.reason-box > li').length>=3 && document.body.innerText.includes('Mình chọn nhầm, quay lại')"), await ev("document.querySelector('.reason-box').innerText"));
    await ev("LSTP_APP.go('urgent',{signs:['bleeding'],from:'checkin'})"); await sleep(150);
    T('urgent: h1, tel:115, nút an toàn, khối dấu hiệu', await ev("document.querySelector('h1').textContent==='Cảm ơn chị đã chia sẻ' && !!document.querySelector('a[href=\"tel:115\"]') && !!document.querySelector('[data-act=urgSafe]') && !!document.querySelector('[data-act=urgSigns]')"));
    await layoutCheck('S04 375');
    await act('urgSigns');
    T('urgent → see_doctor với dấu hiệu', await scr() === 'see_doctor');
    await ev("LSTP_APP.resetTo('data')"); await sleep(150);
    T('data none: có 10.7, không nút xuất/xóa', await ev("document.body.innerText.includes('Những điều app không bao giờ làm') && !document.querySelector('[data-act=expJson]')"));
    await layoutCheck('P01 none 375');
    await ev("LSTP_APP.go('about')"); await sleep(150);
    T('about: phiên bản + nguồn ảnh', await ev("document.body.innerText.includes('phiên bản') && document.body.innerText.includes('Hình capybara')"));
    await layoutCheck('I01 375');

    /* ===== local ===== */
    await page.navigate(base); await sleep(300);
    T('mở lại (none) → welcome', await scr() === 'welcome');
    await click('[data-go=guest_choice]'); await click('[data-go=consent_local]');
    T('consent_local', await scr() === 'consent_local');
    await layoutCheck('A03 375');
    await ev("document.getElementById('c-journey').click()"); await act('consentGo');
    T('bỏ mục 1: lỗi A.2, focus lỗi, không ghi khóa', await ev("!document.getElementById('c-err').hidden && document.activeElement.id==='c-err'") && !/lstp_/.test(await keys()), await keys());
    await ev("document.getElementById('c-journey').click()"); await act('consentGo');
    T('Tiếp tục → A09; có lstp_v1_local', await scr() === 'due_date' && /lstp_v1_local/.test(await keys()));
    await ev("(()=>{const t=new Date(Date.now()+7*3600e3);const e=document.getElementById('edd');e.value=t.toISOString().slice(0,10);e.dispatchEvent(new Event('input',{bubbles:true}))})()");
    T('edd = hôm nay → "Hôm nay là ngày dự sinh của con 🌱"', await ev("document.getElementById('edd-preview').innerText.includes('Hôm nay là ngày dự sinh của con')"));
    await act('eddSave');
    T('home có dòng ngày dự sinh + dải lưu trên máy', await scr()==='home' && await ev("document.body.innerText.includes('Hôm nay là ngày dự sinh của con 🌱') && document.body.innerText.includes('Đang lưu trên máy này · Dữ liệu của chị ›')"));
    await page.navigate(base); await sleep(300);
    T('mở lại (local) → thẳng home (AC-18)', await scr() === 'home');
    await click('.mode-strip');
    T('dải → data', await scr() === 'data');
    T('data: ngày dự sinh dd/mm/yyyy + Sửa/Xóa + Con đã chào đời', await ev("/Ngày dự sinh: \\d\\d\\/\\d\\d\\/\\d{4}/.test(document.body.innerText) && !!document.querySelector('[data-act=eddDel]') && !!document.querySelector('[data-act=bornAsk]')"));
    await layoutCheck('P01 local 375');
    await act('swWriting');
    T('bật "tự viết" → aria-checked true', await ev("document.querySelector('[data-act=swWriting]').getAttribute('aria-checked')==='true' && JSON.parse(localStorage.lstp_v1_local).consent.writing===true"));
    await act('swWriting');
    T('tắt "tự viết" → hộp hỏi A.18', await ev("!!document.querySelector('.dlg') && document.querySelector('.dlg-title').textContent.includes('Những gì chị đã viết thì sao?')"));
    await layoutCheck('L09 375');
    await page.key('Escape'); await sleep(100);
    T('Esc đóng hộp, giữ nguyên', await ev("!document.querySelector('.dlg') && JSON.parse(localStorage.lstp_v1_local).consent.writing===true"));
    await ev("document.querySelector('[data-act=eddDel]').click()"); await sleep(50);
    T('Xóa ngày dự sinh: lần 1 đổi chữ', await ev("document.querySelector('[data-act=eddDel]').textContent==='Bấm lần nữa để xóa'"));
    await act('eddDel');
    T('lần 2: xóa, còn nút Thêm ngày dự sinh', await ev("document.body.innerText.includes('Thêm ngày dự sinh') && JSON.parse(localStorage.lstp_profile).edd===null && JSON.parse(localStorage.lstp_profile).asked===true"));
    await act('bornAsk'); await ev("document.querySelector('.dlg [data-dlg=\"0\"]').click()"); await sleep(150);
    T('Con đã chào đời → "Chúc hai mẹ con luôn Bình An." + Hoàn tác', await ev("document.body.innerText.includes('Chúc hai mẹ con luôn Bình An.') && !!document.querySelector('[data-act=bornUndo]')"));
    await act('bornUndo');
    T('Hoàn tác', await ev("!JSON.parse(localStorage.lstp_profile).born"));
    await act('delAll'); await sleep(100);
    T('xóa toàn bộ → hộp, focus "Thôi, giữ lại"', await ev("document.activeElement.textContent==='Thôi, giữ lại'"));
    await ev("document.querySelector('.dlg [data-dlg=\"0\"]').click()"); await sleep(200);
    T('đã xóa → welcome, khóa lstp_ mất, khóa lạ còn (AC-15, 71)', await scr()==='welcome' && await keys() === JSON.stringify([['musicMuted','myJourneys','user_0900000000'],['stop4p_voice']]), await keys());
    T('toast A.23 xóa toàn bộ', await ev("document.getElementById('toast').textContent==='Đã xóa toàn bộ dữ liệu trên máy này.'"));

    /* ===== 320 px ===== */
    await page.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
    await page.navigate(base); await sleep(300);
    await layoutCheck('A01 320');
    await click('[data-go=guest_choice]'); await click('[data-act=startNone]');
    await layoutCheck('A09 320'); await act('eddLater');
    await layoutCheck('M01 320');
    for (const s of ['support', 'signs', 'data', 'about']) { await ev(`LSTP_APP.go('${s}')`); await sleep(120); await layoutCheck(s + ' 320'); }
    await ev("LSTP_APP.openUrgentOB({signs:['bleeding'],from:'checkin'})"); await sleep(120); await layoutCheck('see_doctor 320');
    await ev("LSTP_APP.go('urgent',{signs:['bleeding'],from:'checkin'})"); await sleep(120); await layoutCheck('urgent 320');
    await ev("document.querySelector('#header summary').click()"); await sleep(100); await layoutCheck('menu mở 320');

    T('không request tới script.google.com', !reqs.some(u => /script\.google/.test(u)));
    T('không lỗi console / exception', errors.length === 0, errors.join(' | '));
  } catch (e) { T('chạy hết', false, e.stack); }
  finally { kill(); await srv.close(); }
};
