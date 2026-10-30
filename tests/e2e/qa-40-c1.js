/* =========================================================
   E2E (QA) – lỗi C-1 và NS-1 của review Bước A (docs/qa/lifestyle-thai-phu-code-review-buoc-a.md).
   Chủ: qa-tester. Mẫu: probe của reviewer /tmp/claude-1000/rv-lstp-a/probes/p1.js, p2.js.
   Luật: trang khẩn (urgent A.19, see_doctor A.20) không bao giờ bị mục đếm kéo sang màn khác (PRD 9.1);
   mẹ báo con cử động ít ở bất kỳ đâu khi có lượt dở → lượt chốt đỏ (R-06); xóa hành trình phải xóa trọn (NS-1);
   đổi pha giờ 2 khi đang ở màn khác → không kéo đi, chỉ hiện dải báo (L12).
   Kịch bản: c1-urgent | c1-signs | c1-report | c1-journey | c1-relax
   ========================================================= */
'use strict';
module.exports = (H) => {
  const { open, enter, check, wait, sleep, MIN } = H;
  async function ready(P, extra) {
    const miss = await H.needScreens(P, ['kick_before', 'kick_pause5', 'kick_count', 'signs', 'see_doctor', 'urgent', 'checkin'].concat(extra || []));
    if (miss.length) { wait('C-1', 'chưa có màn: ' + miss.join(', ')); return false; }
    return true;
  }
  /* Bắt đầu một lượt và chạm n lần (đồng hồ giả, mỗi lần cách 1 s) */
  async function startTaps(P, n) {
    await P.ev("LSTP_APP.resetTo('home')"); await P.go('kick_before');
    await P.ev("document.querySelectorAll('[data-act=kickSign][aria-pressed=true]').forEach(b => b.click())"); await sleep(60);
    await P.act('kickBeforeGo'); await P.act('kickStart');
    for (let i = 0; i < n; i++) { await P.tick(1000); await P.act('kickTapBtn'); }
    return P.ev("((LSTP_APP.S.kick.getActive() || {}).taps || []).length");
  }
  const h1 = P => P.ev("(document.querySelector('#main h1') || {}).innerText || ''");
  const checkinSend = async (P, text) => {
    await P.ev("LSTP_APP.resetTo('home')"); await P.go('checkin');
    await P.ev(`(() => { const t = document.querySelector('#ck-text'); t.focus(); t.value = ${JSON.stringify(text)}; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await P.act('ckNext');
  };
  /* Tua giờ rồi đợi globalTick (mỗi 1 s) chạy ít nhất hai lần */
  const jump = async (P, ms) => { await P.tick(ms); await sleep(2300); };
  const lastKick = P => P.ev('JSON.stringify(LSTP_APP.S.kick.list()[0] || null)').then(JSON.parse);

  return {
    /* (A) có lượt dở, viết "mình muốn chết" ở check-in → urgent; tua T+61 và T+121 → vẫn urgent */
    async 'c1-urgent'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        check('C-1 A: chuẩn bị – lượt dở có 2 lần chạm', await startTaps(P, 2) === 2);
        await checkinSend(P, 'mình muốn chết');
        check('C-1 A: "mình muốn chết" → trang hỗ trợ khẩn (urgent)', await P.screen() === 'urgent' && /Cảm ơn chị đã chia sẻ/.test(await h1(P)), await P.screen());
        await jump(P, 61 * MIN);
        check('C-1 A: tua tới T+61 (lượt sang giờ 2) → vẫn ở urgent, không bị kéo sang màn đếm', await P.screen() === 'urgent' && /Cảm ơn chị đã chia sẻ/.test(await h1(P)), await P.screen() + ' · ' + await h1(P));
        check('C-1 A: trang khẩn không có lời mời "Đếm tiếp giờ thứ hai"', !/Đếm tiếp giờ thứ hai|Chị đếm tiếp thêm 1 giờ/.test(await P.text()));
        await jump(P, 60 * MIN);
        check('C-1 A: tua tới T+121 (lượt lên đỏ) → vẫn ở urgent (A.19 không bị A.20 thay)', await P.screen() === 'urgent' && /Cảm ơn chị đã chia sẻ/.test(await h1(P)), await P.screen() + ' · ' + await h1(P));
        check('C-1 A: A.19 vẫn còn "Nói ngay với một người ở gần chị…"', (await P.text()).includes('Nói ngay với một người ở gần chị'));
        const k = await lastKick(P);
        check('C-1 A: lượt vẫn được chốt đỏ (lưu, không chuyển màn)', !!k && k.level === 'red', JSON.stringify(k));
        check('C-1 A: bấm ‹ / Back không bị stack của mục đếm chen vào (stack có urgent ở đỉnh)', await P.ev("LSTP_APP.state.stack.at(-1).name") === 'urgent');
        const s80 = await P.ev("(s => !!s && !s.hidden ? s.innerText.replace(/\\s+/g, ' ').trim() : '')(document.querySelector('#kick-strip'))");
        check('AC-80/M-84b: đang ở urgent khi lượt đỏ → dải "▲ Đếm cử động thai: Chị đi khám ngay nhé ›"', s80.includes('▲ Đếm cử động thai: Chị đi khám ngay nhé ›'), s80);
        check('AC-80: lượt đỏ chờ hiện được giữ ở lstp_kick_active với level red', await P.ev("(JSON.parse(localStorage.getItem('lstp_kick_active') || 'null') || {}).level") === 'red');
        await P.click('#header [data-go=support]'); await sleep(1500);            // cú bấm thật: rời sang màn thường
        const top = await P.ev("JSON.stringify(LSTP_APP.state.stack.at(-1))").then(JSON.parse);
        check('AC-80: rời urgent sang màn thường → mở see_doctor của mục đếm, lý do lt10_2h', top.name === 'see_doctor' && top.params && top.params.from === 'kick' && (top.params.reasons || []).includes('lt10_2h'), JSON.stringify(top));
        await P.click('#header [data-go=support]'); await sleep(1500);
        check('AC-80: sau khi đã hiện, không còn lượt dở, rời đi không quay lại see_doctor', await P.screen() === 'support' && !(await P.ev("localStorage.getItem('lstp_kick_active')")), await P.screen());
      } finally { await P.kill(); }
    },

    /* (B) chạm "Ra máu" ở trang Dấu hiệu khi có lượt dở → see_doctor; tua T+61/T+121 → vẫn see_doctor */
    async 'c1-signs'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        check('C-1 B: chuẩn bị – lượt dở có 1 lần chạm', await startTaps(P, 1) === 1);
        await P.ev("LSTP_APP.resetTo('home')"); await P.go('signs');
        await P.act('pickSign', '[data-id=bleeding]');
        check('C-1 B: chạm "Ra máu ở vùng kín, dù ít" → see_doctor', await P.screen() === 'see_doctor' && /Chị đi khám ngay nhé/.test(await h1(P)), await P.screen());
        const reasons0 = await P.text();
        await jump(P, 61 * MIN);
        check('C-1 B: tua T+61 → vẫn ở see_doctor, không bị kéo sang màn đếm', await P.screen() === 'see_doctor' && /Chị đi khám ngay nhé/.test(await h1(P)), await P.screen() + ' · ' + await h1(P));
        check('C-1 B: trang khẩn không có lời mời đếm tiếp', !/Đếm tiếp giờ thứ hai|Chị đếm tiếp thêm 1 giờ/.test(await P.text()));
        await jump(P, 60 * MIN);
        check('C-1 B: tua T+121 → vẫn ở see_doctor', await P.screen() === 'see_doctor', await P.screen());
        check('C-1 B: lý do "Ra máu" vẫn hiện', /Ra máu ở vùng kín/.test(await P.text()) && /Ra máu ở vùng kín/.test(reasons0));
        // AC-81 (LSTP-QA-05 đã sửa): "Ra máu" ở trang Dấu hiệu khi có lượt dở → chốt đỏ danger_sign + mã bleeding ngay lúc chọn
        const k = await lastKick(P);
        check('AC-81: "Ra máu" ở trang Dấu hiệu khi có lượt dở → lượt chốt red, danger_sign, mã bleeding; không còn lượt dở', !!k && k.level === 'red' && (k.reasons || [])[0] === 'danger_sign' && (k.signs || []).includes('bleeding') && !(await P.ev('!!LSTP_APP.S.kick.getActive()')), JSON.stringify(k && [k.level, k.reasons, k.signs]));
        check('AC-81: trang khẩn không mời đếm tiếp', !/Đếm tiếp|Bắt đầu đếm/.test(await P.text()));
      } finally { await P.kill(); }
    },

    /* (C) lượt dở + báo "con cử động ít" ở trang Dấu hiệu và ở check-in → lượt chốt đỏ mother_reported (R-06) */
    async 'c1-report'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        await startTaps(P, 2);
        await P.ev("LSTP_APP.resetTo('home')"); await P.go('signs');
        await P.act('pickSign', '[data-id=no_movement]');
        await sleep(1300);
        let k = await lastKick(P);
        check('C-1 C/R-06: trang Dấu hiệu "Con đạp ít hơn hẳn…" khi có lượt dở → trang khẩn M-123, lượt chốt đỏ mother_reported, hết lượt dở',
          await P.screen() === 'see_doctor' && (await P.text()).includes('Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.') && !!k && k.level === 'red' && (k.reasons || []).includes('mother_reported') && !(await P.ev('!!LSTP_APP.S.kick.getActive()')),
          JSON.stringify({ scr: await P.screen(), k, active: await P.ev('!!LSTP_APP.S.kick.getActive()') }));
        await jump(P, 61 * MIN);
        check('C-1 C: sau đó tới T+61 không còn lời mời đếm tiếp, vẫn ở trang khẩn', await P.screen() === 'see_doctor' && !/Đếm tiếp giờ thứ hai/.test(await P.text()), await P.screen());
        await startTaps(P, 3);
        await checkinSend(P, 'con đạp ít hơn mọi ngày');
        await sleep(1300);
        k = await lastKick(P);
        check('C-1 C/R-06: viết "con đạp ít hơn mọi ngày" ở check-in khi có lượt dở → lượt chốt đỏ mother_reported',
          await P.screen() === 'see_doctor' && !!k && k.total === 3 && k.level === 'red' && (k.reasons || []).includes('mother_reported') && !(await P.ev('!!LSTP_APP.S.kick.getActive()')), JSON.stringify(k));
      } finally { await P.kill(); }
    },

    /* (D) NS-1: "Xóa cả hành trình" khi đang đếm → xóa trọn; chạm tiếp không ghi lại lstp_kick_active */
    async 'c1-journey'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P, ['data']))) return;
        await startTaps(P, 2);
        await P.ev("LSTP_APP.resetTo('data')"); await sleep(150);
        const okBtn = await P.act('delJourney');
        const okDlg = okBtn && await P.ev("(b => { if (!b) return false; b.click(); return true; })([...document.querySelectorAll('[data-dlg]')].find(b => /xóa cả hành trình/i.test(b.textContent)))");
        await sleep(300);
        const keys = await P.ev("JSON.stringify([localStorage.getItem('lstp_kick_active'), localStorage.getItem('lstp_kick_sessions')])").then(JSON.parse);
        check('NS-1: "Xóa cả hành trình" → lstp_kick_active và lstp_kick_sessions đều mất', okBtn && okDlg && keys[0] == null && keys[1] == null, JSON.stringify({ okBtn, okDlg, keys }));
        await sleep(1500);
        check('NS-1: sau khi xóa, dải "Đang đếm…" không hiện lại', !(await P.ev("(s => !!s && !s.hidden)(document.getElementById('kick-strip'))")));
        await P.ev("LSTP_APP.resetTo('home')"); await P.go('kick_home');
        check('NS-1: trang mục không còn "Chị đang đếm dở"', !/Chị đang đếm dở/.test(await P.text()));
        await P.go('kick_count'); await P.tick(1000); await P.act('kickTapBtn'); await sleep(200);
        check('NS-1: mở lại màn đếm và chạm → không ghi lại lượt cũ vào lstp_kick_active', await P.ev("(v => !v || JSON.parse(v).taps.length < 3)(localStorage.getItem('lstp_kick_active'))"),
          await P.ev("localStorage.getItem('lstp_kick_active')"));
      } finally { await P.kill(); }
    },

    /* (E) đổi pha giờ 2 khi đang ở màn Thư giãn → không bị kéo đi, có dải báo ◆ */
    async 'c1-relax'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P, ['library', 'player']))) return;
        await startTaps(P, 2);
        for (const [scr, params] of [['library', {}], ['player', { id: 'BELLY_BREATH' }], ['habits', {}]]) {
          await P.ev("LSTP_APP.resetTo('home')"); await P.go(scr, params);
          const depth = await P.ev('LSTP_APP.state.stack.length'), snd = (await P.qa()).sound.bum;
          if (scr === 'library') await jump(P, 61 * MIN); else await jump(P, 1000);
          const strip = await P.ev("(s => !!s && !s.hidden ? s.innerText.replace(/\\s+/g, ' ') : '')(document.getElementById('kick-strip'))");
          check('AC-79/C-1 E: đang ở "' + scr + '" khi lượt sang giờ 2 → vẫn ở ' + scr + ', đỉnh stack giữ nguyên', await P.screen() === scr && await P.ev('LSTP_APP.state.stack.length') === depth && await P.ev('LSTP_APP.state.stack.at(-1).name') === scr, await P.screen());
          check('AC-79/M-84a: có dải ◆ "👣 Đang đếm cử động thai · còn mm:ss · Về màn đếm ›", không thẻ ◆ ở màn này, không tiếng', /◆/.test(strip) && /👣 Đang đếm cử động thai · còn \d\d:\d\d · Về màn đếm ›/.test(strip) && !(await P.ev("!!document.querySelector('#main .kick-attn')")) && (await P.qa()).sound.bum === snd, strip);
        }
        // AC-23 phần 2 / R-18: 5 lần ở giờ 1, đang ở thư viện lúc T+60 → không chuyển, dải không đồng hồ, bấm dải → kick_feel
        await P.go('kick_count'); await P.act('kickStop'); await P.act('kickStopConfirm');   // kết thúc lượt cũ (đang ở giờ 2)
        check('chuẩn bị AC-23: lượt cũ đã dừng, không còn lượt dở', !(await P.ev('!!LSTP_APP.S.kick.getActive()')));
        await startTaps(P, 5);
        await P.ev("LSTP_APP.resetTo('home')"); await P.go('library'); await jump(P, 61 * MIN);
        const s23 = await P.ev("(s => !!s && !s.hidden ? s.innerText.replace(/\\s+/g, ' ').trim() : '')(document.getElementById('kick-strip'))");
        check('AC-23/R-18: ở thư viện lúc T+60 (5 lần) → không chuyển màn; dải M-84a không đồng hồ, không ◆', await P.screen() === 'library' && /👣 Đang đếm cử động thai · Về màn đếm ›/.test(s23) && !/còn \d|◆/.test(s23), s23);
        await P.click('#kick-strip .kick-strip-btn'); await sleep(300);
        check('AC-23: bấm dải → kick_feel', await P.screen() === 'kick_feel', await P.screen());
      } finally { await P.kill(); }
    }
  };
};
