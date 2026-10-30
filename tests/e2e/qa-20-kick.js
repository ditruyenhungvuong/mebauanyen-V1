/* =========================================================
   E2E (QA, T-Q2) – mục "Đếm cử động thai", phần giao diện còn thiếu sau script của FE-4 (dev-kick.js).
   Chủ: qa-tester. Nguồn: docs/specs/dem-cu-dong-thai-prd.md v1.0 mục 6, Phụ lục A (M-xx nguyên văn).
   Đồng hồ giả của tests/e2e.js (P.tick): mọi mốc T+60/T+120 theo giờ thật đã tua, không chờ thật.
   Kịch bản: kick-ui | kick-levels | kick-contacts | kick-data | kick-reduced | kick-audiofail
   ========================================================= */
'use strict';
module.exports = (H) => {
  const { open, enter, check, wait, limit, sleep, MIN, XSS } = H;
  const M = {
    m03: 'Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt.',
    m75: 'Hình bụng mẹ. Chạm vào chỗ con vừa đạp.',
    m79a: 'Con đã cử động 4 lần trong giờ này. Chị đếm tiếp tới 10 lần hoặc hết giờ, hay dừng ở đây cũng được nhé.',
    m96: 'Nếu chị dừng vì thấy con cử động ít hơn mọi ngày, chị đi khám ngay nhé, đừng chờ đến lượt đếm sau.',
    m98: 'Lượt đếm này đang cần chú ý. Chị liên hệ cơ sở sản khoa ngay nhé.',
    m105: 'Nếu chị thấy con cử động khác mọi ngày, kể cả khi đã đếm đủ, chị đi khám ngay nhé.',
    m108: 'Con đã cử động đủ 10 lần trong 2 giờ',
    m109: 'Giờ đầu con cử động ít, giờ thứ hai con cử động nhiều hơn. Mình đã ghi lại cả hai giờ.',
    m110: 'Nếu chị vẫn còn lo, chị liên hệ cơ sở sản khoa nhé.',
    m121: 'Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống.',
    m122: 'Trong 2 giờ, con cử động chưa đủ 10 lần.',
    m123: 'Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.',
    m153a: 'Nếu chị còn lo, chị gọi cho nơi chị đang khám thai nhé.',
    m162: '● Con cử động đều · ◆ Cần chú ý · ▲ Đã báo đi khám · ✕ Dừng giữa chừng',
    m205: 'Mình không đọc được một phần dữ liệu cũ trên máy này nên đã bỏ qua phần đó.'
  };
  const SCREENS = ['kick_home', 'kick_before', 'kick_pause5', 'kick_count', 'kick_feel', 'kick_result', 'kick_stopped', 'kick_track', 'kick_data'];
  async function ready(P) {
    const miss = await H.needScreens(P, SCREENS);
    if (miss.length) { wait('mục Đếm cử động thai', 'chưa có màn: ' + miss.join(', ')); return false; }
    return true;
  }
  /* Vào màn đếm: K01 → K02 (Bắt đầu ›) → K03 (Bỏ qua) → K04 */
  async function startCount(P) {
    await P.go('kick_home');
    await P.act('kickSeenTip');
    await P.go('kick_before');
    // Bỏ chọn dấu hiệu còn sót (sau "Mình chọn nhầm, quay lại" màn giữ lựa chọn để chị sửa)
    await P.ev("document.querySelectorAll('[data-act=kickSign][aria-pressed=true]').forEach(b => b.click())"); await sleep(80);
    await P.click('#kBeforeGo');
    await P.click('#kPauseGo');
    return P.screen();
  }
  /* Bấm "👣 Con vừa đạp" n lần, mỗi lần cách gapMs theo đồng hồ giả (> 0,8 s) */
  async function taps(P, n, gapMs) { for (let i = 0; i < n; i++) { await P.tick(gapMs || 1000); await P.act('kickTapBtn'); } }
  const count = P => P.ev("+(document.querySelector('#kN') || {}).textContent || 0");
  const toast = P => P.ev("document.querySelector('#toast').textContent");
  const noErr = async P => check('không lỗi console / exception', !P.errors.length && !(await P.qa()).errors.length, P.errors.concat((await P.qa()).errors).join(' | '));

  return {
    /* K-AC-02, 05, 10, 11, 12, 15, 16, 17, 18, 20, 22, 40, 41, 45, 65, 66, AC-79 */
    async 'kick-ui'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        await P.go('kick_home');
        const tip = /Mỗi ngày 2–3 lần, sau bữa ăn, chị đếm cử động của con trong một giờ/.test(await P.text());
        check('K-AC-02: lần đầu có thẻ M-20a với "Đã hiểu" và "Đọc hướng dẫn"', tip && /Đã hiểu/.test(await P.text()) && /Đọc hướng dẫn/.test(await P.text()));
        await P.act('kickSeenTip'); await P.reload(); await P.go('kick_home');
        check('K-AC-02: bấm "Đã hiểu" → mở lại không hiện thẻ nữa', !/Mỗi ngày 2–3 lần, sau bữa ăn, chị đếm/.test(await P.text()));
        await P.go('kick_guide');
        check('K-AC-45: Hướng dẫn có dòng M-03', (await P.text()).includes(M.m03));
        await P.go('kick_before');
        check('K-AC-45: Trước khi đếm có dòng M-03', (await P.text()).includes(M.m03));
        check('K-AC-50: Trước khi đếm – bữa bỏ qua được, dấu hiệu không chọn sẵn', /Không nhớ cũng được, chị bỏ qua nhé\./.test(await P.text()) && await P.ev("[...document.querySelectorAll('[data-act=kickSign]')].every(b => b.getAttribute('aria-pressed') === 'false')"));
        await P.click('#kBeforeGo');
        check('K-AC-05: Dừng 5 giây cùng con – nút lúc đầu "Bỏ qua"', await P.ev("document.querySelector('#kPauseGo').textContent.trim()") === 'Bỏ qua');
        await sleep(5400);                                         // hẹn giờ 5 giây thật của màn (setTimeout), không tua được
        check('K-AC-05: sau 5 giây nút thành "Bắt đầu đếm ›"', await P.ev("document.querySelector('#kPauseGo').textContent.trim()") === 'Bắt đầu đếm ›', await P.ev("document.querySelector('#kPauseGo').textContent"));
        await P.click('#kPauseGo');
        check('→ màn đếm', await P.screen() === 'kick_count', await P.screen());
        check('K-AC-17: vòng bụng có aria-label M-75', await P.ev("document.querySelector('#kBelly').getAttribute('aria-label')") === M.m75, await P.ev("document.querySelector('#kBelly').getAttribute('aria-label')"));
        check('K-AC-17: bàn chân, tim, bong bóng aria-hidden', await P.ev("[...document.querySelectorAll('.belly-fx, #kHihi, #kRain')].every(e => e.closest('[aria-hidden=true]'))"));
        check('K-AC-66: công tắc tiếng là <button aria-pressed> nhãn "🔊 Tiếng khi chạm"', await P.ev("(b => !!b && b.tagName === 'BUTTON' && b.hasAttribute('aria-pressed') && b.textContent.trim() === '🔊 Tiếng khi chạm')(document.querySelector('#kSound'))"), await P.ev("(document.querySelector('#kSound')||{}).outerHTML"));
        const q0 = await P.qa();
        await taps(P, 3);
        const q1 = await P.qa();
        check('K-AC-10: tiếng bật – lần 1, 2, 3 có "bum"; lần 3 có tiếng cười', q1.sound.bum - q0.sound.bum === 3 && q1.sound.giggle - q0.sound.giggle === 1, JSON.stringify(q1.sound));
        check('K-AC-10: bong bóng "hihi" ở lần 3', await P.ev("document.querySelector('#kHihi').classList.contains('show')"));
        check('K-AC-12: navigator.vibrate được gọi khi chạm', q1.vibrate.length - q0.vibrate.length === 3, JSON.stringify(q1.vibrate));
        await P.act('kickSoundToggle');
        check('K-AC-66: bấm công tắc tiếng → chỉ đổi aria-pressed, nhãn giữ nguyên', await P.ev("document.querySelector('#kSound').getAttribute('aria-pressed')") === 'false' && await P.ev("document.querySelector('#kSound').textContent.trim()") === '🔊 Tiếng khi chạm');
        await taps(P, 3);
        const q2 = await P.qa();
        check('K-AC-11: tắt tiếng → lần 4–6 không âm thanh, bong bóng "hihi" vẫn hiện ở lần 6', q2.sound.bum === q1.sound.bum && q2.sound.giggle === q1.sound.giggle && await P.ev("document.querySelector('#kHihi').classList.contains('show')"), JSON.stringify(q2.sound));
        check('K-AC-20: ≥ 4 lần → có nút "Xong ✓" và dòng M-79a', await P.ev("(b => !!b && !b.hidden && b.offsetParent !== null)(document.querySelector('#kDone'))") && (await P.text()).includes(M.m79a));
        await P.tick(10 * MIN);
        check('K-AC-18: tắt màn hình 10 phút rồi mở → đồng hồ theo giờ thật (Giờ thứ 1 · còn 49:xx)', /Giờ thứ 1 · còn 49:\d\d/.test(await P.ev("document.querySelector('#kTimer').textContent")), await P.ev("document.querySelector('#kTimer').textContent"));
        await P.act('kickUndo');
        check('K-AC-16: "↶ Bỏ lần vừa chạm" → còn 5, toast "Đã bỏ lần vừa chạm."', await count(P) === 5 && await toast(P) === 'Đã bỏ lần vừa chạm.', (await count(P)) + ' · ' + await toast(P));
        await P.act('kickDone');
        check('K-AC-22: "Xong ✓" → kick_feel', await P.screen() === 'kick_feel', await P.screen());
        await P.act('kickFeel', '[data-feel=skipped]');
        const tr = await P.text();
        check('K-AC-22: "Bỏ qua" → màn "Xong lượt đếm 💗"', await P.screen() === 'kick_result' && /Xong lượt đếm 💗/.test(tr), tr.slice(0, 200));
        check('K-AC-40: màn xanh có M-105 và nút tự báo', tr.includes(M.m105) && await P.ev("!!document.querySelector('#main [data-act=kickSelfReport]')"));
        const saved = await P.ev("JSON.stringify(LSTP_APP.S.kick.list()[0] || null)").then(JSON.parse);
        check('K-AC-22: lưu level green, feel skipped', saved && saved.level === 'green' && saved.feel === 'skipped', JSON.stringify(saved));
        if (await P.has('habits')) {
          await P.go('habits');
          const t = await P.text();
          check('AC-79/K-AC: lượt có mức → thói quen "Đếm cử động thai" tự đánh dấu + "1/3 lượt", không ghi mức', /1\/3 lượt/.test(t) && await P.ev("(b => !!b && b.getAttribute('aria-pressed') === 'true')(document.querySelector('[data-code=kick]'))") && !/Con cử động đều|Cần chú ý/.test(t), t.slice(0, 300));
        }
        await P.go('kick_home');
        check('K-AC-03: ô "🌅 Sáng" (bắt đầu 08:00, không chọn bữa) ghi "● Con cử động đều · 5 lần"', await P.ev("[...document.querySelectorAll('.kick-slot')].some(s => /🌅 Sáng/.test(s.innerText) && /● Con cử động đều · 5 lần/.test(s.innerText.replace(/\\s+/g, ' ')))"),
          await P.ev("[...document.querySelectorAll('.kick-slot')].map(s => s.innerText.replace(/\\s+/g, ' ')).join(' | ')"));
        check('K-AC-03: ô chưa đếm ghi "Chưa đếm", không "bỏ lỡ/quên/trễ"', /Chưa đếm/.test(await P.text()) && !/bỏ lỡ|quên|trễ/i.test(await P.text()));
        /* Bàn phím (K-AC-15, 65 phần đếm) — lượt này bắt đầu 13:00 giờ VN (ô Trưa) để ô chỉ có lượt dừng */
        await P.tick(5 * 60 * MIN);
        await startCount(P);
        await P.ev("document.querySelector('[data-act=kickTapBtn]').focus()"); await P.tick(1000); await P.page.key('Enter'); await sleep(150);
        await P.tick(1000); await P.page.key('Space'); await sleep(150);
        await P.ev("document.querySelector('#kBelly').focus()"); await P.tick(1000); await P.page.key('Enter'); await sleep(150);
        const k = await P.ev("JSON.stringify((LSTP_APP.S.kick.getActive() || {}).taps || [])").then(JSON.parse);
        check('K-AC-15: Enter, Space trên nút "Con vừa đạp" và Enter trên vòng bụng → đếm 3, không vị trí', k.length === 3 && k.every(t => t.x === null && t.y === null), JSON.stringify(k));
        await P.act('kickStop'); await P.act('kickStopConfirm');
        const ts = await P.text();
        check('K-AC-41: dừng ở giờ 1 với 3 lần → màn "Mình đã ghi lại lượt đếm này", M-96, nút tự báo', await P.screen() === 'kick_stopped' && ts.includes('Mình đã ghi lại lượt đếm này') && ts.includes(M.m96) && await P.ev("!!document.querySelector('#main [data-act=kickSelfReport]')"), ts.slice(0, 200));
        await P.go('kick_home');
        check('K-AC-41: trang mục ô "☀️ Trưa" ghi "✕ Dừng giữa chừng" (không ghi mức)', await P.ev("[...document.querySelectorAll('.kick-slot')].some(s => /☀️ Trưa/.test(s.innerText) && /✕ Dừng giữa chừng/.test(s.innerText))"),
          await P.ev("[...document.querySelectorAll('.kick-slot')].map(s => s.innerText.replace(/\\s+/g, ' ')).join(' | ')"));
        await P.go('kick_data');
        check('K-AC-66: công tắc "🔊 Tiếng khi chạm", "📳 Rung khi chạm" là <button aria-pressed>', await P.ev("[...document.querySelectorAll('[data-act=kickPref]')].map(b => b.tagName + ':' + b.hasAttribute('aria-pressed') + ':' + b.textContent.trim()).join('|')") === 'BUTTON:true:🔊 Tiếng khi chạm|BUTTON:true:📳 Rung khi chạm');
        await noErr(P);
      } finally { await P.kill(); }
    },

    /* K-AC-23, 24, 29, 30, 31, 32, 33, 39, 42, 43 */
    async 'kick-levels'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        // K-AC-21 (đối chứng cho bộ đếm mưa): 10 lần ở giờ 1 → có mưa tim trên màn đếm, rồi sang kick_feel
        { const r0 = (await P.qa()).rain; await startCount(P); await taps(P, 9); await P.tick(1000); await P.act('kickTapBtn');
          const onNow = await P.ev("(e => !!e && e.classList.contains('on') && e.querySelectorAll('span').length > 0)(document.querySelector('#kRain'))");
          await sleep(2300);
          check('K-AC-21: chạm lần 10 ở giờ 1 → mưa tim ngay trên màn đếm (#kRain.on có tim)', onNow && (await P.qa()).rain === r0 + 1, JSON.stringify({ onNow, rain: (await P.qa()).rain - r0 }));
          check('K-AC-21: sau mưa tim tự sang kick_feel', await P.screen() === 'kick_feel', await P.screen());
          await P.act('kickFeel', '[data-feel=same]'); }
        // K-AC-23: 6 lần, tới T+60 tự sang kick_feel
        const rain0 = (await P.qa()).rain;
        await startCount(P); await taps(P, 6); await P.tick(60 * MIN);
        check('K-AC-23: giờ 1 có 6 lần, tới T+60 → tự sang kick_feel', await P.screen() === 'kick_feel', await P.screen());
        await P.act('kickFeelDiff');
        const t24 = await P.text();
        check('K-AC-24: "Con ngừng máy…" ở kick_feel → trang khẩn M-123', await P.screen() === 'see_doctor' && t24.includes(M.m123), t24.slice(0, 200));
        check('K-AC-24: suốt lượt (6 lần, báo khác) không có mưa tim (#kRain.on)', (await P.qa()).rain === rain0, (await P.qa()).rain - rain0);
        // K-AC-29: 3 + 5 tới T+120 → chỉ M-122
        await P.ev("LSTP_APP.resetTo('home')");
        await startCount(P); await taps(P, 3); await P.tick(60 * MIN); await taps(P, 5); await P.tick(60 * MIN);
        const t29 = await P.text();
        check('K-AC-29: 3 + 5, tới T+120 → trang khẩn M-122, không M-121', await P.screen() === 'see_doctor' && t29.includes(M.m122) && !t29.includes(M.m121), await P.screen() + ' · ' + t29.slice(0, 200));
        await P.go('kick_home');
        const t43 = await P.text();
        check('K-AC-43: sau đỏ – trang mục không còn "đếm dở", ô ghi "▲ Đã báo đi khám"', !/Chị đang đếm dở/.test(t43) && /▲ Đã báo đi khám/.test(t43), t43.slice(0, 300));
        // K-AC-30: 3 rồi giờ 2 tới tổng 10 → không mưa tim, không tiếng cười, kick_feel → M-108…110
        await startCount(P); await taps(P, 3); await P.tick(60 * MIN);
        const g0 = (await P.qa()).sound.giggle, r30 = (await P.qa()).rain;
        await taps(P, 7); await sleep(400);
        check('K-AC-30: giờ 2 đạt tổng 10 → tự sang kick_feel, không tiếng cười', await P.screen() === 'kick_feel' && (await P.qa()).sound.giggle === g0, await P.screen());
        check('K-AC-30/R-11: giờ 2 đạt tổng 10 → không mưa tim (#kRain.on không bật)', (await P.qa()).rain === r30, (await P.qa()).rain - r30);
        await P.act('kickFeel', '[data-feel=same]');
        const t30 = await P.text();
        check('K-AC-30: màn "Con đã cử động đủ 10 lần trong 2 giờ" có M-109, M-110 (OB trống → M-153a)', t30.includes(M.m108) && t30.includes(M.m109) && t30.includes(M.m110) && t30.includes(M.m153a), t30.slice(0, 300));
        const s30 = await P.ev("JSON.stringify(LSTP_APP.S.kick.list()[0])").then(JSON.parse);
        check('K-AC-30: lưu level green, hadYellow true', s30 && s30.level === 'green' && s30.hadYellow === true, JSON.stringify(s30));
        // K-AC-31: tự báo ở trang mục (không có lượt dở) → trang khẩn M-123, không bản ghi mới (K-13)
        const n31 = await P.ev('LSTP_APP.S.kick.list().length');
        await P.go('kick_home'); await P.act('kickSelfReport');
        check('K-AC-31: tự báo ở trang mục → trang khẩn M-123 ngay, không hộp hỏi lại', await P.screen() === 'see_doctor' && (await P.text()).includes(M.m123) && !(await P.ev("!!document.querySelector('.dlg')")));
        check('K-13: tự báo khi không có lượt dở → không tạo bản ghi', await P.ev('LSTP_APP.S.kick.list().length') === n31);
        // K-AC-32: 9 lần + tự báo → đỏ
        await startCount(P); await taps(P, 9); await P.act('kickSelfReport');
        check('K-AC-32: giờ 1 đã 9 lần, bấm tự báo → đỏ', await P.screen() === 'see_doctor' && await P.ev("LSTP_APP.S.kick.list()[0].level") === 'red');
        // K-AC-33: chọn hai dấu hiệu
        await P.go('kick_before');
        await P.clickText('Ra máu ở vùng kín'); await P.clickText('Nhức đầu nhiều');
        check('K-AC-33: chọn 2 dấu hiệu → nút "Xem cần làm gì ngay ›"', await P.ev("document.querySelector('#kBeforeGo').textContent.trim()") === 'Xem cần làm gì ngay ›');
        await P.click('#kBeforeGo');
        const t33 = await P.text();
        check('K-AC-33: trang khẩn liệt kê đúng hai dấu hiệu (M-124), chỉ có "Mình chọn nhầm, quay lại"', await P.screen() === 'see_doctor' && t33.includes('Chị đang thấy:') && t33.includes('Ra máu ở vùng kín') && /Nhức đầu nhiều|Đau đầu nhiều/.test(t33) && t33.includes('Mình chọn nhầm, quay lại') && !t33.includes('Mình chọn nhầm / không phải lúc này'), t33.slice(0, 300));
        await P.clickText('Mình chọn nhầm, quay lại');
        check('M-56: "Mình chọn nhầm, quay lại" → về Trước khi đếm, không vào màn đếm', await P.screen() === 'kick_before', await P.screen());
        // K-AC-39: 5 lần, đóng app, mở lại T+90 → xanh, kick_feel
        await P.ev("LSTP_APP.resetTo('home')");
        await startCount(P); await taps(P, 5); await P.tick(90 * MIN); await P.reload(); await sleep(600);
        // Thiết kế C-1: không tự chuyển; dải trỏ tới kick_feel. Bấm dải (cú bấm thật) rồi kiểm.
        if (await P.screen() !== 'kick_feel') await P.click('#kick-strip .kick-strip-btn').catch(() => {});
        check('K-AC-39: giờ 1 có 5, mở lại T+90 → lượt đã xanh, dải dẫn thẳng tới kick_feel (giờ 2 không bắt đầu)', await P.screen() === 'kick_feel' && await P.ev("!((LSTP_APP.S.kick.getActive() || {}).taps || []).some(t => t.t >= 3600000)"), await P.screen());
        await P.act('kickFeel', '[data-feel=same]');
        // K-AC-42: dừng ở giờ 2 sau vàng → stopped_yellow, M-98
        await startCount(P); await taps(P, 2); await P.tick(61 * MIN); await taps(P, 1);
        await P.act('kickStop'); await P.act('kickStopConfirm');
        const t42 = await P.text();
        check('K-AC-42: dừng ở giờ 2 → màn có M-98, nút tự báo; lưu stopped_yellow', await P.screen() === 'kick_stopped' && t42.includes(M.m98) && await P.ev("!!document.querySelector('#main [data-act=kickSelfReport]')") && await P.ev('LSTP_APP.S.kick.list()[0].level') === 'stopped_yellow', t42.slice(0, 200));
        await noErr(P);
      } finally { await P.kill(); }
    },

    /* K-AC-27, 36 (và AC-32 phía có số): liên hệ có giá trị thử, chuỗi qua esc() */
    async 'kick-contacts'() {
      const cfg = { OB_CONTACT: { name: 'Khoa Sản <i>Thử</i>', phone: '0283 999 999' }, EMERGENCY_OB: { name: 'Cấp cứu sản Thử', phone: '0283.888.888' } };
      const P = await open({ cfg });
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        await startCount(P); await taps(P, 2); await P.tick(60 * MIN);
        const ob = await P.ev("JSON.stringify([...document.querySelectorAll('#main a[href^=\"tel:\"]')].map(a => [a.getAttribute('href'), a.textContent.trim()]))").then(JSON.parse);
        check('K-AC-27: OB_CONTACT có số → thẻ ◆ có nút "📞 Gọi {name}" href="tel:0283999999"', ob.some(([h, t]) => h === 'tel:0283999999' && /📞 Gọi Khoa Sản <i>Thử<\/i>/.test(t)), JSON.stringify(ob));
        check('K-AC-27: tên liên hệ qua esc() (không thành thẻ <i>)', await P.ev("!document.querySelector('#main a[href^=\"tel:\"] i')"));
        await P.tick(61 * MIN);
        const em = await P.ev("JSON.stringify([...document.querySelectorAll('#main a[href^=\"tel:\"]')].map(a => [a.getAttribute('href'), a.textContent.trim()]))").then(JSON.parse);
        // K-AC-36 ghi nút "📞 Gọi {name}"; PRD A.20 ghi nút "📞 Gọi khoa cấp cứu sản" + dòng M-128 "📞 Gọi {tên khoa}: {số}" → chấp nhận cách PRD A.20 (ghi lệch ở báo cáo)
        check('K-AC-36/A.20: EMERGENCY_OB có số → nút tel:0283888888, dòng M-128 có tên khoa, vẫn có tel:115', await P.screen() === 'see_doctor' && em.some(([h]) => h === 'tel:0283888888') && em.some(([h]) => h === 'tel:115') &&
          (await P.text()).includes('📞 Gọi Cấp cứu sản Thử: 0283.888.888'), JSON.stringify(em) + ' · ' + (await P.text()).slice(0, 300));
      } finally { await P.kill(); }
    },

    /* K-AC-46, 47, 52, 57, 58; AC-80 */
    async 'kick-data'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        const d = Date.UTC(2026, 9, 28, 0, 0);       // 07:00 giờ VN 28/10
        const mk = (i, total, level, extra) => Object.assign({ v: 1, id: 'qa' + String(i).padStart(18, '0'), startAt: d + i * 4 * 3600e3, endAt: d + i * 4 * 3600e3 + 3600e3, meal: null,
          taps: Array.from({ length: total }, (_, j) => ({ t: (j + 1) * 60000, x: j % 2 ? 0.25 : null, y: j % 2 ? 0.3 : null })), signs: [], motherReportedAt: null, doneAt: null, stoppedAt: null,
          feel: 'same', level, hadYellow: false, reasons: level === 'red' ? ['lt10_2h'] : [], h1: total, h2: 0, total, min4: 4, min10: total >= 10 ? 10 : null, gaDays: null }, extra || {});
        const sessions = [mk(0, 10, 'green'), mk(1, 7, 'green'), mk(2, 5, 'red', { hadYellow: true, h1: 3, h2: 2 })];
        await P.ev(`localStorage.setItem('lstp_kick_sessions', ${JSON.stringify(JSON.stringify(sessions))})`);
        await P.reload();
        await P.go('kick_track');
        const t = await P.text();
        check('K-AC-46: Theo dõi có chú thích đủ bốn hình (M-162), không đường "thường ngày"', t.includes(M.m162) && !/thường ngày/i.test(t), t.slice(0, 300));
        check('K-AC-47: biểu đồ "Số lần con cử động mỗi ngày" có cột 28/10 = 22', /Số lần con cử động mỗi ngày/.test(t) && await P.ev("/\\b22\\b/.test(document.querySelector('#main').innerText)"), t.slice(0, 400));
        await P.act('kickTable');
        check('K-AC-46: "Xem dạng bảng" → bảng có <th>, đọc được', await P.ev("!!document.querySelector('#main table th')"));
        await P.go('kick_data');
        await P.act('kickDl', '[data-fmt=json]');
        const q = await P.qa();
        const js = JSON.parse(await P.dl(-1) || 'null');
        check('K-AC-58: tải JSON tên dem-con-dap-YYYYMMDD.json, đủ 3 lượt', /^dem-con-dap-\d{8}\.json$/.test((q.downloads.slice(-1)[0] || {}).name) && Array.isArray(js && (js.sessions || js)) && (js.sessions || js).length === 3, JSON.stringify(q.downloads.map(x => x.name)));
        await P.act('kickDl', '[data-fmt=csv]');
        const q2 = await P.qa();
        const csv = String(await P.dl(-1) || '').replace(/^﻿/, '');
        const lines = csv.split(/\r?\n/).filter(Boolean);
        const cells = l => (l.match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g) || []).filter((x, i, a) => i < a.length - 1 || x !== '').map(x => x.replace(/,$/, '').replace(/^"([\s\S]*)"$/, '$1').replace(/""/g, '"'));
        check('K-AC-58: tải CSV tên dem-con-dap-YYYYMMDD.csv, hàng tiêu đề đúng A.15, một dòng một lượt', /^dem-con-dap-\d{8}\.csv$/.test((q2.downloads.slice(-1)[0] || {}).name) &&
          cells(lines[0] || '').join(',') === 'Ngày,Giờ bắt đầu,Tuần thai,Bữa,Số lần giờ đầu,Số lần giờ thứ hai,Tổng,Phút đạt 4 lần,Phút đạt 10 lần,Kết quả,Có giờ cần chú ý,Lý do,Cảm nhận của mẹ' && lines.length === 4, lines.slice(0, 2).join(' / '));
        check('K-AC-58: cột "Kết quả" dùng chữ A.15 (Con cử động đều / Đã báo đi khám)', /Con cử động đều/.test(csv) && /Đã báo đi khám/.test(csv));
        check('K-AC-58: không ô nào bắt đầu bằng = + - @ (chống công thức)', !lines.some(l => cells(l).some(c => /^[=+\-@]/.test(c))), lines.join(' / ').slice(0, 300));
        // K-AC-57: dữ liệu hỏng → toast M-205, không chết
        await P.ev(`localStorage.setItem('lstp_kick_sessions', ${JSON.stringify(JSON.stringify([sessions[0], { v: 1, id: XSS, startAt: Date.now(), taps: [] }, 'rác']))})`);
        await P.reload(); await P.go('kick_home'); await sleep(200);
        check('K-AC-57: bản ghi hỏng → toast M-205, màn vẫn hiện, XSS không chạy', (await toast(P)) === M.m205 && await P.screen() === 'kick_home' && await P.ev('window.__xss === undefined'), await toast(P));
      } finally { await P.kill(); }
      /* K-AC-52 / AC-80: không lưu → lượt chỉ ở sessionStorage, localStorage trống */
      const Q = await open({ tag: 'none' });
      try {
        await enter(Q, 'none');
        if (!(await ready(Q))) return;
        await startCount(Q); await taps(Q, 4); await Q.act('kickDone'); await Q.act('kickFeel', '[data-feel=same]');
        const st = await Q.storage();
        check('K-AC-52/AC-80: không lưu → lượt xong nằm ở sessionStorage lstp_kick_*, localStorage trống', !st.l.length && st.s.includes('lstp_kick_sessions') && st.s.every(k => k.startsWith('lstp_kick_')), JSON.stringify(st));
        await Q.go('kick_home');
        check('K-AC-52: ba mức vẫn chạy đủ, lượt hiện ở ô hôm nay', /Con cử động đều · 4 lần/.test(await Q.text()));
        check('M-30: trang mục báo "không lưu trên máy"', /Đóng app là các lượt đếm hôm nay sẽ mất/.test(await Q.text()));
        limit('K-AC-52 "tải lại trong tab khác"', 'CDP mở lại cùng tab; đã kiểm localStorage trống — tab mới không thấy lượt (sessionStorage theo tab)');
      } finally { await Q.kill(); }
    },

    /* K-AC-06: đếm dở từ 8:05 với 2 lần, đóng lúc 8:30, mở lại 8:40 → thẻ "Chị đang đếm dở…", "Đếm tiếp ›" → còn 25:00 */
    async 'kick-resume'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        await P.tick(5 * MIN - 2000);                              // 08:05 giờ VN
        await startCount(P); await taps(P, 2, 1000);
        await P.tick(25 * MIN); await P.reload();                  // 08:30 "đóng tab"
        await P.tick(10 * MIN);                                    // 08:40 mở lại
        await P.reload(); await sleep(1300);
        const s06 = await P.ev("(s => !!s && !s.hidden ? s.innerText.replace(/\\s+/g, ' ').trim() : '')(document.querySelector('#kick-strip'))");
        check('AC-06/R-09: mở lại 8:40 → Trang chính có dải M-84a "👣 Đang đếm cử động thai · còn 25:00 · Về màn đếm ›" (không ◆), không tự vào màn đếm', await P.screen() === 'home' && /👣 Đang đếm cử động thai · còn (25:0[01]|24:5\d) · Về màn đếm ›/.test(s06) && !/◆/.test(s06), await P.screen() + ' · ' + s06);
        await P.go('kick_home');
        const t = await P.text();
        check('K-AC-06: trang mục có thẻ "Chị đang đếm dở từ 8:05 · 2 lần" và "Đếm tiếp ›"', /Chị đang đếm dở từ 0?8:05 · 2 lần/.test(t) && /Đếm tiếp ›/.test(t), t.slice(0, 300));
        await P.clickText('Đếm tiếp ›');
        const tm = await P.ev("document.querySelector('#kTimer').textContent");
        check('K-AC-06: "Đếm tiếp ›" → màn đếm, đồng hồ "Giờ thứ 1 · còn 25:00" (±1 giây)', await P.screen() === 'kick_count' && /Giờ thứ 1 · còn (25:0[01]|24:5\d)/.test(tm), tm);
        // K-AC-37: lượt mới 2 lần, đóng app, mở lại T+70 → vào thẳng màn đếm giờ 2, thẻ ◆, còn 50:00 (±1 s)
        await P.act('kickStop'); await P.act('kickStopConfirm');
        await startCount(P); await taps(P, 2, 1000); await P.tick(70 * MIN - 2000); await P.reload(); await sleep(1300);
        const s37 = await P.ev("(s => !!s && !s.hidden ? s.innerText : '')(document.querySelector('#kick-strip'))");
        check('K-AC-37 (thiết kế C-1): mở lại T+70 → không tự chuyển, có dải ◆', /◆/.test(s37), await P.screen() + ' · ' + s37);
        if (await P.screen() !== 'kick_count') await P.click('#kick-strip .kick-strip-btn').catch(() => {});
        await sleep(300);
        const tm37 = await P.ev("(document.querySelector('#kTimer') || {}).textContent || ''");
        check('K-AC-37: bấm dải → màn đếm, thẻ ◆, "Giờ thứ 2 · còn 50:00" (±1 s), có nút tự báo', await P.screen() === 'kick_count' && /Giờ thứ 2 · còn (50:0[01]|49:5\d)/.test(tm37) && await P.ev("!!document.querySelector('.kick-attn')") && await P.ev("!!document.querySelector('#main [data-act=kickSelfReport]')"), await P.screen() + ' · ' + tm37);
        // K-AC-38: cùng lượt, mở lại T+3 giờ → vào thẳng trang khẩn M-121 + M-122, lượt lưu red
        // Chốt an toàn KHÔNG nới: đỏ lúc app ĐÓNG → mở lại phải đưa chị thẳng tới trang khẩn (không chỉ dải)
        await P.ev("LSTP_APP.resetTo('home')"); await sleep(200);
        await P.closedFor(110 * MIN); await sleep(1500);
        const t38 = await P.text();
        check('K-AC-38: mở lại T+3 giờ → vào thẳng trang khẩn với M-121 và M-122; lượt lưu red', await P.screen() === 'see_doctor' && t38.includes(M.m121) && t38.includes(M.m122) && await P.ev("(LSTP_APP.S.kick.list()[0] || {}).level") === 'red', await P.screen() + ' · ' + t38.slice(0, 200));
      } finally { await P.kill(); }
    },

    /* K-AC-19, AC-02 (mục đếm) */
    async 'kick-reduced'() {
      const P = await open({ reduced: true });
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        await startCount(P);
        await P.tick(1000); await P.click('#kBelly'); await sleep(80);
        const r = await P.ev("JSON.stringify({ hearts: document.querySelectorAll('.heart-fly.go').length, shake: document.querySelector('#kBelly').classList.contains('shake') || !!document.querySelector('.shake'), foot: document.querySelectorAll('.kick-foot.show').length })").then(JSON.parse);
        check('K-AC-19/AC-02: giảm chuyển động → không tim bay, không rung hình; dấu chân vẫn hiện', r.hearts === 0 && !r.shake && r.foot >= 1, JSON.stringify(r));
        const r19 = (await P.qa()).rain;
        await taps(P, 9); await sleep(300);
        check('K-AC-19: đủ 10 ở giờ 1 với giảm chuyển động → không mưa tim (#kRain.on không bật)', (await P.qa()).rain === r19, (await P.qa()).rain - r19);
      } finally { await P.kill(); }
    },

    /* K-AC-13: WebAudio lỗi */
    async 'kick-audiofail'() {
      const P = await open({ audioFail: true });
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        await startCount(P);
        await P.tick(1000); await P.click('#kBelly'); await taps(P, 2);
        check('K-AC-13: WebAudio lỗi → vẫn đếm (3), vẫn hiện dấu chân, không toast lỗi', await count(P) === 3 && await P.ev("document.querySelectorAll('.kick-foot.show').length") >= 1 && !(await toast(P)), (await count(P)) + ' · toast: ' + await toast(P));
        await P.tick(60 * MIN);
        check('K-AC-13: luật vẫn chạy (T+60 với 3 lần → thẻ ◆)', /Giờ vừa rồi con cử động 3 lần\./.test(await P.text()));
        check('K-AC-13: không exception lọt ra', !P.errors.length, P.errors.join(' | '));
      } finally { await P.kill(); }
    }
  };
};
