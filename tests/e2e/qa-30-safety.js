/* =========================================================
   E2E (QA, T-Q2) – an toàn qua giao diện check-in thật (style guide mục 6, PRD 9.1–9.8, AC-23…32).
   Chủ: qa-tester. Bộ câu đủ (373 câu STOP-4P + 9.3) chạy ở tests/unit-engine.js; ở đây là đường đi trên màn.
   Kịch bản: safety-ui
   ========================================================= */
'use strict';
module.exports = (H) => {
  const { open, enter, check, wait, limit, sleep } = H;
  async function checkin(P, o) {
    await P.go('checkin');
    // Check-in giữ trạng thái giữa các lần mở trong phiên → đặt lại chữ và cảm xúc mỗi lần
    await P.ev(`(() => { const t = document.querySelector('#ck-text'); t.focus(); t.value = ${JSON.stringify(o.text || '')}; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await P.ev("document.querySelectorAll('[data-emo][aria-pressed=true]').forEach(b => b.click())");
    for (const e of o.emotions || []) await P.ev(`document.querySelector('[data-emo=${e}]').click()`);
    if (o.tension != null) await P.ev(`(() => { const r = document.querySelector('#ck-t'); r.value = ${o.tension}; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await sleep(60);
    if (o.tension != null) check('chuẩn bị: thanh mức căng nhận ' + o.tension, (await P.ev("document.querySelector('#ck-t-val').textContent")).startsWith(o.tension + ' ·'), await P.ev("document.querySelector('#ck-t-val').textContent"));
    await P.act('ckNext');
    return P.screen();
  }
  const card = P => P.ev("document.querySelector('#main').innerText.includes('Những gì chị đang mang đáng được lắng nghe.')");
  return {
    async 'safety-ui'() {
      const P = await open();
      try {
        await enter(P, 'none');
        const miss = await H.needScreens(P, ['checkin', 'result', 'urgent', 'see_doctor']);
        if (miss.length) { wait('an toàn qua check-in', 'chưa có màn: ' + miss.join(', ')); return; }
        // Style guide 6 / AC-23: "mệt muốn chết" (nói quá kiểu tiếng Việt) → trang khẩn có 115 và lối "đó chỉ là cách nói"
        check('style guide 6/AC-23: "mệt muốn chết" → trang hỗ trợ khẩn', await checkin(P, { text: 'mệt muốn chết' }) === 'urgent', await P.screen());
        const tu = await P.text();
        check('AC-23: trang khẩn có <a href="tel:115">, "Mình đang an toàn — đó chỉ là cách nói. Tiếp tục", trước mọi gợi ý', await P.ev("!!document.querySelector('#main a[href=\"tel:115\"]')") && tu.includes('Mình đang an toàn — đó chỉ là cách nói. Tiếp tục') && !/Bắt đầu ›/.test(tu));
        await P.act('urgSafe');
        check('AC-25: "Mình đang an toàn…" → Gợi ý, thẻ "Chị không phải một mình" luôn hiện', await P.screen() === 'result' && await card(P), await P.screen());
        // AC-26: dấu hiệu nguy hiểm → trang khẩn chung
        for (const t of ['sáng nay mình ra máu', 'ra nuoc nhieu', 'bung go cung lien tuc', 'dau dau du doi, nhin mo']) {
          check('AC-26: "' + t + '" → "Chị đi khám ngay nhé" trước gợi ý', await checkin(P, { text: t }) === 'see_doctor' && /Chị đi khám ngay nhé/.test(await P.text()), await P.screen());
        }
        // AC-27: cả hai nhóm → trang tự hại có khối dẫn sang trang khám
        await checkin(P, { text: 'mình muốn chết, sáng nay ra máu' });
        const t27 = await P.text();
        check('AC-27: tự hại + dấu hiệu → trang tự hại có "Chị cũng nhắc tới dấu hiệu trong người cần đi khám." và "Xem dấu hiệu cần đi khám ›"', await P.screen() === 'urgent' && t27.includes('Chị cũng nhắc tới dấu hiệu trong người cần đi khám.') && t27.includes('Xem dấu hiệu cần đi khám ›'), t27.slice(0, 300));
        await P.act('urgSigns');
        check('AC-27: khối dẫn → trang khẩn chung', await P.screen() === 'see_doctor');
        // AC-28: con đạp ít → trang khẩn chung lý do M-123, lối "Mình đã đi khám rồi"/"Mình chọn nhầm", không "đếm thử"
        for (const t of ['con đạp ít hơn mọi ngày', 'khong thay con dap']) {
          await checkin(P, { text: t });
          const t28 = await P.text();
          check('AC-28: "' + t + '" → trang khẩn chung với M-123, có "Mình đã đi khám rồi" / "Mình chọn nhầm", không nút đếm thử', await P.screen() === 'see_doctor' && t28.includes('Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.') &&
            t28.includes('Mình đã đi khám rồi') && t28.includes('Mình chọn nhầm') && !/[Đđ]ếm thử|Bắt đầu đếm/.test(t28), t28.slice(0, 300));
        }
        // AC-29: mức căng ≥ 9 / Buồn + 7 / nhóm 9.4 → thẻ A.22
        await checkin(P, { tension: 9 }); check('AC-29: mức căng 9 → thẻ A.22', await P.screen() === 'result' && await card(P));
        await checkin(P, { tension: 7, emotions: ['sad'] }); check('AC-29: "Buồn" + mức 7 → thẻ A.22', await P.screen() === 'result' && await card(P));
        await checkin(P, { text: 'mình bị bạo hành' }); check('AC-29: "mình bị bạo hành" (9.4) → thẻ A.22', await P.screen() === 'result' && await card(P));
        await checkin(P, { tension: 4, emotions: ['happy'] }); check('AC-29 (ngược): mức 4, Vui vẻ → không thẻ A.22', await P.screen() === 'result' && !(await card(P)));
        // Style guide 6: PII số điện thoại phải cảnh báo
        await checkin(P, { text: 'gọi mình số 0912345678 nhé' });
        check('style guide 6: số điện thoại → cảnh báo thông tin nhận diện', await P.screen() === 'checkin' && /Bộ lọc không thể phát hiện mọi thông tin\./.test(await P.text()));
        // "giường 12", "BN Nguyễn Văn A": checklist chung của QA (app NVYT) nói phải cảnh báo; PRD 9.8 của app này BỎ mẫu giường/phòng và danh xưng bn → ghi giới hạn, không tính đỏ
        for (const t of ['giường 12', 'BN Nguyễn Văn A']) {
          const scr = await checkin(P, { text: t });
          if (scr === 'checkin') check('PII "' + t + '" → cảnh báo', true);
          else limit('PII "' + t + '" không cảnh báo', 'đúng PRD 9.8 (bỏ mẫu giường/phòng, danh xưng bn cho bối cảnh thai phụ); khác checklist chung NVYT của qa-tester');
        }
        check('ẩn danh "không lưu": sau cả luồng an toàn, localStorage/sessionStorage trống', JSON.stringify(await P.storage()) === JSON.stringify({ l: [], s: [] }), JSON.stringify(await P.storage()));
        check('không lỗi console / exception', !P.errors.length && !(await P.qa()).errors.length, P.errors.concat((await P.qa()).errors).join(' | '));
      } finally { await P.kill(); }
    }
  };
};
