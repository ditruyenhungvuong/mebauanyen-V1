/* =========================================================
   E2E (QA) – 3 gợi ý của review Bước A lần 2 (docs/qa/lifestyle-thai-phu-code-review-buoc-a-lan-2.md), đã sửa.
   Chủ: qa-tester. Mẫu: /tmp/claude-1000/rv-lstp-a/probes/p5.js.
   - G2-3: đang ở urgent (tự hại) có lượt dở; lượt lên đỏ; "Mình đang an toàn" → Gợi ý có thẻ A.22 → trang khẩn mục đếm
           → "Mình đã hiểu" quay về Gợi ý (không về trang đếm).
   - G2-1: api.dialog trên màn khẩn; bấm nút có điều hướng → điều hướng chạy (không bị router chặn); Esc đóng hộp.
           Gọi qua API của module (Object.getPrototypeOf(LSTP_APP), có chặn), như p5.js. LSTP_APP trực tiếp là lối test, không chặn.
   - G2-2: lượt dở + trong bài chạm chip "Ra máu hoặc ra nước" ở L01 → lượt đỏ danger_sign / bleeding rồi see_doctor.
   Mọi bấm của chị là cú bấm chuột thật (P.click / P.clickText) để router coi là do chị bấm.
   Kịch bản: g2-safe-return | g2-dialog | g2-player-sign
   ========================================================= */
'use strict';
module.exports = (H) => {
  const { open, enter, check, wait, sleep, MIN } = H;
  async function ready(P, extra) {
    const miss = await H.needScreens(P, ['kick_before', 'kick_count', 'checkin', 'result', 'urgent', 'see_doctor', 'signs'].concat(extra || []));
    if (miss.length) { wait('G2', 'chưa có màn: ' + miss.join(', ')); return false; }
    return true;
  }
  async function startTaps(P, n) {
    await P.ev("LSTP_APP.resetTo('home')"); await P.go('kick_before');
    await P.ev("document.querySelectorAll('[data-act=kickSign][aria-pressed=true]').forEach(b => b.click())"); await sleep(60);
    await P.act('kickBeforeGo'); await P.act('kickStart');
    for (let i = 0; i < n; i++) { await P.tick(1000); await P.act('kickTapBtn'); }
  }
  const top = P => P.ev('JSON.stringify(LSTP_APP.state.stack.at(-1))').then(JSON.parse);
  const card = P => P.ev("document.querySelector('#main').innerText.includes('Những gì chị đang mang đáng được lắng nghe.')");
  const lastKick = P => P.ev('JSON.stringify(LSTP_APP.S.kick.list().slice().sort((a, b) => b.startAt - a.startAt)[0] || null)').then(JSON.parse);

  return {
    /* G2-3 */
    async 'g2-safe-return'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P))) return;
        await startTaps(P, 2);
        await P.ev("LSTP_APP.resetTo('home')"); await P.go('checkin');
        await P.ev("(() => { const t = document.querySelector('#ck-text'); t.focus(); t.value = 'mình muốn chết'; t.dispatchEvent(new Event('input', { bubbles: true })); })()");
        await P.click('[data-act=ckNext]');
        check('G2-3: chuẩn bị – "mình muốn chết" → urgent', await P.screen() === 'urgent', await P.screen());
        await P.tick(121 * MIN); await sleep(2300);
        check('G2-3: lượt lên đỏ trong lúc ở urgent → vẫn ở urgent, lượt giữ level red', await P.screen() === 'urgent' && await P.ev("(JSON.parse(localStorage.getItem('lstp_kick_active') || 'null') || {}).level") === 'red', await P.screen());
        await P.click('[data-act=urgSafe]'); await sleep(1500);
        const t1 = await top(P);
        check('G2-3: "Mình đang an toàn — Tiếp tục" → trang khẩn mục đếm mở trên màn Gợi ý', t1.name === 'see_doctor' && t1.params && t1.params.from === 'kick' && await P.ev("LSTP_APP.state.stack.some(x => x.name === 'result')"), JSON.stringify(t1));
        await P.clickText('Mình đã hiểu');
        await sleep(400);
        check('G2-3: "Mình đã hiểu" → quay về màn Gợi ý (không về trang đếm)', await P.screen() === 'result', await P.screen());
        check('G2-3/AC-25: màn Gợi ý vẫn có thẻ "Chị không phải một mình" (A.22)', await card(P));
        check('G2-3: lượt đỏ đã hiện, không còn lượt dở', !(await P.ev("localStorage.getItem('lstp_kick_active')")) && (await lastKick(P) || {}).level === 'red');
      } finally { await P.kill(); }
    },

    /* G2-1 */
    async 'g2-dialog'() {
      const P = await open();
      try {
        await enter(P, 'none');
        if (!(await ready(P, ['about']))) return;
        await P.click('#header [data-go=support]'); await P.clickText('Dấu hiệu cần đi khám ngay');
        await P.click('[data-act=pickSign][data-id=fever]'); await sleep(300);
        check('G2-1: chuẩn bị – đang ở see_doctor (màn được bảo vệ)', await P.screen() === 'see_doctor' && await P.ev("typeof LSTP_APP.isProtected === 'function' ? LSTP_APP.isProtected() : true"), await P.screen());
        // Module hỏi bằng api.dialog rồi điều hướng sau khi chị bấm nút trong hộp
        await P.ev("{ window.__r = 'chưa'; const A = Object.getPrototypeOf(LSTP_APP); A.dialog({ title: 'Thử QA', actions: [{ label: 'Đồng ý', value: 'yes', kind: 'btn-primary' }, { label: 'Thôi', value: 'no' }] }).then(v => { window.__r = v === 'yes' ? A.go('about') : 'esc:' + v; }); } 0");
        await sleep(200);
        check('G2-1: hộp thoại mở được trên màn khẩn', await P.ev("!!document.querySelector('.dlg')"));
        await P.click('[data-dlg="0"]'); await sleep(400);
        check('G2-1: bấm "Đồng ý" (cú bấm thật) → điều hướng sau await chạy, sang "about"', await P.screen() === 'about' && await P.ev('window.__r') !== false, JSON.stringify({ scr: await P.screen(), r: await P.ev('window.__r') }));
        // Esc đóng hộp, không điều hướng
        await P.ev("history.back()"); await sleep(300);
        await P.ev("{ window.__r = 'chưa'; const A = Object.getPrototypeOf(LSTP_APP); A.dialog({ title: 'Thử Esc', actions: [{ label: 'Đồng ý', value: 'yes' }] }).then(v => { window.__r = v === 'yes' ? A.go('about') : 'esc:' + v; }); } 0");
        await sleep(200);
        const before = await P.screen();
        await P.page.key('Escape'); await sleep(300);
        check('G2-1: Esc đóng hộp, không điều hướng', !(await P.ev("!!document.querySelector('.dlg')")) && await P.screen() === before && String(await P.ev('window.__r')).startsWith('esc:'), JSON.stringify({ before, scr: await P.screen(), r: await P.ev('window.__r') }));
        check('không lỗi console / exception', !P.errors.length && !(await P.qa()).errors.length, P.errors.concat((await P.qa()).errors).join(' | '));
      } finally { await P.kill(); }
    },

    /* G2-2 */
    async 'g2-player-sign'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ready(P, ['player']))) return;
        await startTaps(P, 2);
        await P.ev("LSTP_APP.resetTo('home')"); await P.go('player', { id: 'BREATHE_46' });
        await P.click('#btn-unwell'); await sleep(300);
        check('G2-2: chuẩn bị – lớp L01 "Mình dừng lại nhé" mở', await P.ev("(l => !!l && !l.hidden)(document.querySelector('#l01'))"));
        const ok = await P.clickText('Ra máu hoặc ra nước', '#l01');
        await sleep(1300);
        const k = await lastKick(P);
        check('G2-2: chip "Ra máu hoặc ra nước" ở L01 khi có lượt dở → lượt chốt red, danger_sign, mã bleeding, hết lượt dở', ok && !!k && k.level === 'red' && (k.reasons || [])[0] === 'danger_sign' && (k.signs || []).includes('bleeding') && !(await P.ev('!!LSTP_APP.S.kick.getActive()')), JSON.stringify(k && [k.level, k.reasons, k.signs]));
        check('G2-2: rồi mở see_doctor (AC-40: không có "Quay lại bài")', await P.screen() === 'see_doctor' && !/Quay lại bài/.test(await P.text()), await P.screen());
      } finally { await P.kill(); }
    }
  };
};
