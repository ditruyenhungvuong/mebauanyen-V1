/* =========================================================
   E2E (QA, T-Q2) – phần giao diện còn thiếu sau script của FE-1, FE-3, FE-5 (dev-*.js).
   Chủ: qa-tester. Nguồn: PRD lifestyle v1.0 mục 6 (AC-xx), Phụ lục A (chữ nguyên văn), style guide mục 2, 6.
   Kịch bản: core-draft | core-consent | core-checkin | core-thaigiao | core-export | core-edd | core-edge | core-reduced
   ========================================================= */
'use strict';
module.exports = (H) => {
  const { open, enter, check, wait, limit, sleep, T0, XSS } = H;
  const A24 = 'Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt. App không thay cho việc khám thai, không chẩn đoán hay điều trị.';
  const DAY = 86400000;
  const dayKey = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
  const TODAY = dayKey(T0);
  /* Chế độ "lưu trên máy" dựng sẵn: đồng ý (writing tùy chọn), đã hỏi ngày dự sinh (edd tùy chọn) */
  async function seedLocal(P, o) {
    const x = o || {};
    await P.load();
    await P.ev(`(() => {
      localStorage.setItem('lstp_v1_local', JSON.stringify({ v: 1, consent: { journey: true, writing: ${!!x.writing}, version: '0.2', at: Date.now() }, createdAt: Date.now() }));
      localStorage.setItem('lstp_profile', JSON.stringify({ v: 1, edd: ${JSON.stringify(x.edd || null)}, asked: true, at: Date.now() }));
    })()`);
    await P.reload();
    return P.screen();
  }
  const ok = async (P, names) => { const miss = await H.needScreens(P, names); if (miss.length) { wait(names.join(', '), 'chưa có màn: ' + miss.join(', ')); return false; } return true; };
  const typeIn = (P, sel, text) => P.ev(`(() => { const t = document.querySelector(${JSON.stringify(sel)}); if (!t) return false; t.focus(); t.value = ${JSON.stringify(text)}; t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  const toast = P => P.ev("document.querySelector('#toast').textContent");
  const noErr = async P => check('không lỗi console / exception', !P.errors.length && !(await P.qa()).errors.length, P.errors.concat((await P.qa()).errors).join(' | '));

  return {
    /* AC-07: dòng bản thử nghiệm A.24; ALLOW_DRAFT_CONTENT:false → thư viện có lời giải thích A.5 */
    async 'core-draft'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ok(P, ['library', 'player', 'thaigiao', 'signs']))) return;
        for (const [scr, params] of [['library'], ['player', { id: 'BREATHE_46' }], ['thaigiao'], ['signs']]) {
          await P.go(scr, params);
          check('AC-07: ' + scr + ' có dòng A.24 (nội dung draft)', (await P.text()).includes(A24));
        }
      } finally { await P.kill(); }
      const Q = await open({ cfg: { ALLOW_DRAFT_CONTENT: false }, tag: 'nodraft' });
      try {
        await enter(Q, 'local');
        await Q.go('library');
        const t = await Q.text();
        check('AC-07: ALLOW_DRAFT_CONTENT:false, chưa bài nào approved → thư viện hiện lời A.5, không trống', t.includes('Thư viện đang chờ duyệt nội dung. Trong lúc chờ, chị cứ thở theo nhịp tự nhiên của mình nhé.'), t.slice(0, 200));
      } finally { await Q.kill(); }
    },

    /* AC-17, AC-14 (đồng ý), AC-16 */
    async 'core-consent'() {
      const P = await open();
      try {
        await seedLocal(P, { writing: true });
        if (!(await ok(P, ['thaigiao', 'data', 'letters']))) return;
        await P.go('thaigiao');
        await typeIn(P, '#tg-text', 'Mẹ thương con nhiều lắm');
        await P.act('tgSave');
        check('chuẩn bị: cất 1 lời nhắn (đồng ý lưu chữ)', await P.ev('LSTP_APP.S.letters.list().length') === 1);
        await P.go('data');
        await P.act('swWriting');
        const dlg = await P.ev("(document.querySelector('.dlg') || {}).innerText || ''");
        check('AC-17: tắt "Lưu cả những gì chị tự viết" → hỏi hai lựa chọn nguyên văn', /Xóa luôn những gì đã viết/.test(dlg) && /Giữ những gì đã lưu, từ giờ không lưu thêm/.test(dlg), dlg);
        await P.clickText('Giữ những gì đã lưu, từ giờ không lưu thêm', '.dlg');
        check('AC-17: "Giữ…" → lá cũ còn, đồng ý writing tắt', await P.ev('LSTP_APP.S.letters.list().length') === 1 && await P.ev("JSON.parse(localStorage.lstp_v1_local).consent.writing") === false);
        await P.go('thaigiao');
        await typeIn(P, '#tg-text', 'lá viết sau khi tắt');
        const hasSave = await P.ev("(b => !!b && !b.hidden && b.offsetParent !== null)(document.querySelector('[data-act=tgSave]'))");
        check('AC-16/A.17: đã tắt lưu chữ → không có nút Cất, có câu A.17, vẫn có "Tải lời nhắn về máy"', !hasSave && (await P.text()).includes('Lời nhắn này chỉ ở đây, không được lưu.') && /Tải lời nhắn về máy/.test(await P.text()));
        await P.go('data'); await P.act('swWriting');                 // bật lại
        await P.act('swWriting');                                      // tắt lần nữa → chọn xóa
        await P.clickText('Xóa luôn những gì đã viết', '.dlg');
        check('AC-17: "Xóa luôn…" → hết lời nhắn trên máy', await P.ev('LSTP_APP.S.letters.list().length') === 0 && !(await P.ev("JSON.stringify(localStorage)")).includes('Mẹ thương con nhiều lắm'));
        await noErr(P);
      } finally { await P.kill(); }
    },

    /* AC-21, 22, 34, 36, 38, 57 */
    async 'core-checkin'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ok(P, ['checkin', 'result', 'player', 'checkout', 'done']))) return;
        await P.go('checkin'); await P.act('ckNext');
        check('AC-21: không chọn gì, bấm "Xem gợi ý ›" → vẫn đi tiếp', await P.screen() === 'result', await P.screen());
        await P.go('checkin');
        await typeIn(P, '#ck-text', 'chồng mình là anh Trần Minh Quân');
        await P.act('ckNext');
        const t22 = await P.text();
        check('AC-22: "chồng mình là anh Trần Minh Quân" → bảng A.17 (Sửa / Bỏ đoạn đó / Vẫn giữ + câu bộ lọc), vẫn ở check-in', await P.screen() === 'checkin' && t22.includes('Bộ lọc không thể phát hiện mọi thông tin.') && /Bỏ đoạn đó/.test(t22) && /Vẫn giữ/.test(t22), t22.slice(0, 300));
        await P.act('ckNext');
        check('AC-22: bấm tiếp lần hai mới đi qua', await P.screen() === 'result', await P.screen());
        await P.go('checkin'); await P.act('min', ''); await P.ev("document.querySelector('[data-min=\"1\"]').click()"); await sleep(80); await P.act('ckNext');
        const s34 = await P.ev("JSON.stringify([...document.querySelectorAll('#main [data-go=player]')].map(b => JSON.parse(b.dataset.params || '{}').id))").then(JSON.parse);
        const mins = await P.ev("JSON.stringify(Object.fromEntries(LSTP_APP.D.EXERCISES.map(e => [e.id, e.min])))").then(JSON.parse).catch(() => ({}));
        check('AC-34: chọn 1 phút → không bài có min > 1', s34.length > 0 && s34.every(id => !(mins[id] > 1)), JSON.stringify(s34));
        await P.go('checkin'); await typeIn(P, '#ck-text', 'mình bị sẩy thai năm ngoái, giờ lại lo'); await P.act('ckNext');
        const t36 = await P.text();
        check('AC-36: nhóm mất con → thẻ "Chị không phải một mình", không "Nghe nhạc cùng con", không "Ngân ừm cùng con"', /Những gì chị đang mang đáng được lắng nghe/.test(t36) && !/Nghe nhạc cùng con/.test(t36) && !/Ngân "ừm" cùng con/.test(t36), t36.slice(0, 300));
        // AC-38: chân trình phát luôn thấy ba nút, kể cả khi cuộn
        await P.go('player', { id: 'BELLY_BREATH' });
        const foot = async () => P.ev("JSON.stringify([...document.querySelectorAll('.rx-foot [data-act]')].map(b => { const r = b.getBoundingClientRect(); return [b.dataset.act, r.top >= 0 && r.bottom <= innerHeight + 1]; }))").then(JSON.parse);
        const f0 = await foot();
        await P.ev('window.scrollTo(0, document.body.scrollHeight)'); await sleep(100);
        const f1 = await foot();
        check('AC-38: chân trình phát có 3 nút (khó chịu, trở về thở tự nhiên, check-out), luôn trong màn hình kể cả khi cuộn', f0.length === 3 && f0.every(x => x[1]) && f1.every(x => x[1]), JSON.stringify([f0, f1]));
        // AC-57: vào bài thẳng (không có điểm trước) → hoàn tất không có dòng "Trước → Sau"
        await P.act('finishExercise');
        await P.ev("(() => { const r = document.querySelector('#co-t'); if (r) { r.value = 3; r.dispatchEvent(new Event('input', { bubbles: true })); } })()");
        await P.act('coDone');
        const t57 = await P.text();
        check('AC-57: thiếu điểm trước → màn hoàn tất không có dòng "Trước → Sau", có lời ghi nhận A.15 + mantra', await P.screen() === 'done' && !/Trước \d+ → Sau/.test(t57) && t57.includes('Khác hay không khác đều ổn. Điều quan trọng là chị đã lắng nghe mình.') && t57.includes('Mẹ con mình cùng Bình An nhé.'), t57.slice(0, 300));
        check('AC-57: màn hoàn tất có capybara (kể cả khi thiếu điểm)', await P.ev("!!document.querySelector('#main img, #main .capy, #main [class*=capy]')"), await P.ev("document.querySelector('#main').innerHTML.slice(0, 300)"));
        await noErr(P);
      } finally { await P.kill(); }
    },

    /* AC-61, 62, 64, 65, 67 */
    async 'core-thaigiao'() {
      const P = await open();
      try {
        await enter(P, 'none');
        if (!(await ok(P, ['thaigiao']))) return;
        await P.go('thaigiao');
        // Đổi lời nhắc tới khi gặp TG-05 và TG-10 (16 lời không lặp, AC-59)
        let saw5 = false, saw10 = false, music = false;
        for (let i = 0; i < 17 && !(saw5 && saw10); i++) {
          const t = await P.ev("document.querySelector('#tg-prompt').innerText.replace(/\\s+/g, ' ')");
          if (t.includes('Lúc con đạp, chị đặt tay lên chỗ đó, xoa thật nhẹ')) { saw5 = true; check('AC-61: TG-05 có dòng an toàn A.16 nguyên văn', t.includes('Xoa nhẹ thôi, không ấn, không day mạnh. Bụng gò cứng thì chị dừng, nằm nghiêng nghỉ nhé.'), t); }
          if (t.includes('Hôm nay mình nghe nhạc cùng con nhé.')) {
            saw10 = true;
            const a0 = (await P.qa()).audioCtx;
            await P.act('tgPromptAct');
            music = await P.screen() === 'player' && /Nghe nhạc cùng con/.test(await P.text());
            check('AC-62: TG-10 "Nghe nhạc cùng con ›" → mở đúng trình phát, nhạc không tự phát (không AudioContext mới)', music && (await P.qa()).audioCtx === a0, await P.screen());
            await P.go('thaigiao');
          }
          await P.act('tgNext');
        }
        check('AC-61/62: gặp đủ TG-05 và TG-10 khi đổi lời nhắc', saw5 && saw10, JSON.stringify({ saw5, saw10 }));
        // AC-65: "Bé Bơ ơi, mẹ thương con" không cảnh báo (anh duyệt câu 13)
        await P.go('thaigiao');
        await typeIn(P, '#tg-text', 'Bé Bơ ơi, mẹ thương con');
        await P.act('tgDownload');
        check('AC-65: "Bé Bơ ơi, mẹ thương con" → không bảng thông tin nhận diện, tải được', !(await P.ev("(b => !!b && !b.hidden && b.innerText.trim().length > 0)(document.querySelector('#tg-pii-box, #tg-pii'))")) && (await P.qa()).downloads.length === 1);
        // AC-67: file chỉ gồm ngày, lời nhắc của ngày và lời nhắn
        const txt = await P.dl(-1);
        check('AC-67: không lưu → "Tải lời nhắn về máy (.txt)": "Lời mẹ kể – {ngày}", lời nhắc, lời nhắn', /^Lời mẹ kể – \d\d\/\d\d\/\d{4}/.test(txt || '') && /Lời nhắc hôm ấy: /.test(txt || '') && (txt || '').includes('Bé Bơ ơi, mẹ thương con') && /\.txt$/.test((await P.qa()).downloads[0].name), txt);
        check('AC-67: chế độ không lưu → không có nút "Cất vào hộp thư 💌"', !(await P.ev("(b => !!b && b.offsetParent !== null)(document.querySelector('[data-act=tgSave]'))")));
        // AC-64: tự hại → dấu hiệu → PII theo thứ tự; sửa chữ thì kiểm lại
        await typeIn(P, '#tg-text', 'mẹ muốn chết, sáng nay ra máu, gọi 0912 345 678');
        await P.act('tgDownload');
        check('AC-64: lớp 1 tự hại chạy trước (→ trang hỗ trợ khẩn)', await P.screen() === 'urgent', await P.screen());
        await P.go('thaigiao');
        await typeIn(P, '#tg-text', 'sáng nay mẹ thấy ra máu, gọi 0912 345 678');
        await P.act('tgDownload');
        const sign = await P.ev("(b => !!b && b.offsetParent !== null)(document.querySelector('#tg-sign-box, #tg-sign'))");
        const pii = await P.ev("(b => !!b && b.offsetParent !== null && b.innerText.trim().length > 0)(document.querySelector('#tg-pii-box, #tg-pii'))");
        check('AC-64/66: lớp 2 dấu hiệu hiện thẻ trên ô (chưa hiện bảng PII)', sign && !pii && await P.screen() === 'thaigiao');
        await P.act('tgSignOk');
        const pii2 = await P.ev("(b => !!b && b.offsetParent !== null && b.innerText.trim().length > 0)(document.querySelector('#tg-pii-box, #tg-pii'))");
        check('AC-64: "Mình đã đi khám rồi" → lớp 3 PII (số điện thoại)', pii2, await P.text());
        const n0 = (await P.qa()).downloads.length;
        await typeIn(P, '#tg-text', 'sáng nay mẹ thấy ra máu, gọi 0987 654 321');
        await P.act('tgDownload');
        const pii3 = await P.ev("(b => !!b && b.offsetParent !== null && b.innerText.trim().length > 0)(document.querySelector('#tg-pii-box, #tg-pii'))");
        const sign3 = await P.ev("(b => !!b && b.offsetParent !== null)(document.querySelector('#tg-sign-box, #tg-sign'))");
        check('AC-64: sửa chữ thì kiểm lại từ đầu (chữ còn "ra máu" → thẻ dấu hiệu / bảng PII hiện lại), chưa tải', (sign3 || pii3) && (await P.qa()).downloads.length === n0, JSON.stringify({ sign3, pii3 }));
        check('AC-11: không lưu → không khóa localStorage nào', !(await P.storage()).l.length);
        await noErr(P);
      } finally { await P.kill(); }
    },

    /* AC-70, 109, 114 */
    async 'core-export'() {
      const cfg = { MUSIC_HOSTS: ['example.org'], MUSIC_LINKS: [{ title: 'Ru con buổi tối', url: 'https://example.org/ru.mp3', kind: 'audio', source: 'Nguồn Thử QA', license: 'CC BY 4.0 (thử)' }] };
      const P = await open({ cfg });
      try {
        await seedLocal(P, { writing: true, edd: '2027-02-05' });
        if (!(await ok(P, ['data', 'thaigiao', 'habits', 'about']))) return;
        await P.ev(`(() => { const S = LSTP_APP.S; S.checkins.add({ before: 6, emotions: ['worried'] }); S.thaigiao.mark('${TODAY}', 'TG-01', 'done');
          S.letters.add({ day: '${TODAY}', prompt: 'TG-01', text: ${JSON.stringify('Con ơi ' + XSS)} });
          S.habits.setMark('${TODAY}', 'water', 'x'); S.habits.setMark('${dayKey(T0 - DAY)}', 'water', 'x'); })()`);
        await P.go('data');
        await P.act('expJson');
        const js = JSON.parse(await P.dl(-1) || 'null');
        const nm = (await P.qa()).downloads.slice(-1)[0].name;
        check('AC-70: "Xuất tất cả (JSON)" → me-con-binh-an-YYYYMMDD.json gồm đồng ý, check-in, lời nhắn, mốc thai giáo', /^me-con-binh-an-\d{8}\.json$/.test(nm) && js && js.consent && js.checkins.length === 1 && js.letters.length === 1 && js.thaigiao.length === 1, nm + ' ' + JSON.stringify(js).slice(0, 200));
        await P.act('expLetters');
        const tx = await P.dl(-1);
        check('AC-70: "Tải hộp thư (.txt)" → đọc được bằng mắt, giữ nguyên văn chữ', /^Lời mẹ kể – \d\d\/\d\d\/\d{4}/.test(tx || '') && (tx || '').includes('Con ơi ' + XSS), tx);
        await P.act('expHabits');
        const csv = String(await P.dl(-1) || '').replace(/^﻿/, '');
        check('AC-109: "Tải nhật ký thói quen (CSV)" → có tiêu đề và 2 ngày', csv.split(/\r?\n/).filter(Boolean).length >= 3 && /\.csv$/.test((await P.qa()).downloads.slice(-1)[0].name), csv.slice(0, 200));
        await P.ev(`(() => { const i = document.querySelector('#del-day'); i.value = '${dayKey(T0 - DAY)}'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
        await P.act('delDay');
        const first = await P.ev("LSTP_APP.S.habits.range().length");
        await P.act('delDay');
        check('AC-109: xóa đánh dấu của một ngày phải bấm 2 lần', first === 2 && await P.ev("LSTP_APP.S.habits.range().length") === 1, JSON.stringify([first, await P.ev("LSTP_APP.S.habits.range().length")]));
        check('AC-05: lời nhắn có thẻ HTML không chạy ở mọi màn đã mở', await P.ev('window.__xss === undefined'));
        await P.go('about');
        const ab = await P.text();
        check('AC-114/AC-52: màn Giới thiệu có tên bài, nguồn và giấy phép từng bài nhạc', ab.includes('Ru con buổi tối') && ab.includes('Nguồn Thử QA') && ab.includes('CC BY 4.0 (thử)'), ab.slice(0, 300));
        await noErr(P);
      } finally { await P.kill(); }
    },

    /* AC-127, 132, 133, 138 (+ AC-134 phía ô đếm) */
    async 'core-edd'() {
      const P = await open();
      try {
        const eddFor = total => dayKey(T0 + (280 - total) * DAY);
        await seedLocal(P, { edd: eddFor(285) });
        if (!(await ok(P, ['home', 'data', 'due_date']))) return;
        await P.go('home');
        const t132 = await P.text();
        check('AC-132: tuổi thai 285 ngày → "Tuần 40 + 5 ngày · đã qua ngày dự sinh 5 ngày. Chị nhớ đi khám theo lịch bác sĩ hẹn nhé."', t132.includes('Tuần 40 + 5 ngày · đã qua ngày dự sinh 5 ngày. Chị nhớ đi khám theo lịch bác sĩ hẹn nhé.'), t132.slice(0, 300));
        check('AC-132: không mở trang khẩn, ô Đếm cử động thai vẫn có', await P.screen() === 'home' && await P.ev("!!document.querySelector('#main [data-go=kick_home]')"));
        await P.ev(`(() => { const p = JSON.parse(localStorage.lstp_profile); p.edd = '${eddFor(300)}'; localStorage.setItem('lstp_profile', JSON.stringify(p)); })()`);
        await P.reload(); await P.go('home');
        const t133 = await P.text();
        check('AC-133: > 294 ngày → không hiện số tuần; thẻ A.29 "Đã qua ngày dự sinh hơn 2 tuần rồi…" với "nơi chị đang khám thai"', !/Tuần \d+ \+|\d+ tuần \d+ ngày/.test(t133) && t133.includes('Đã qua ngày dự sinh hơn 2 tuần rồi. Chị liên hệ nơi chị đang khám thai để được hẹn khám nhé.'), t133.slice(0, 300));
        check('AC-133: có nút "Sửa ngày dự sinh" và "Con đã chào đời 🌸", không có nút gọi (OB_CONTACT trống)', /Sửa ngày dự sinh/.test(t133) && /Con đã chào đời 🌸/.test(t133) && !(await P.ev("[...document.querySelectorAll('#main a[href^=\"tel:\"]')].some(a => a.getAttribute('href') !== 'tel:115')")));
        await P.clickText('Con đã chào đời 🌸');
        const dlg = await P.ev("(document.querySelector('.dlg') || {}).innerText || ''");
        check('AC-138: xác nhận nguyên văn A.29', dlg.includes('Chúc mừng hai mẹ con! Mình sẽ thôi hiện tuần thai và tắt mục Đếm cử động thai. Những gì chị đã lưu vẫn còn nhé.'), dlg);
        await P.clickText('Đúng rồi', '.dlg');
        await P.go('home');
        const t138 = await P.text();
        check('AC-138: sau "Đúng rồi" → không dòng tuần thai, không thẻ quá 42 tuần, ô Đếm cử động thai tắt', !/Đã qua ngày dự sinh hơn 2 tuần/.test(t138) && !/tuần \d+ ngày|Tuần \d+ \+/.test(t138) && !(await P.ev("!!document.querySelector('#main .tile[data-go=kick_home]')")), t138.slice(0, 300));
        await P.go('data');
        check('AC-138: có "Hoàn tác" ở cùng chỗ', /Hoàn tác/.test(await P.text()));
        await P.act('bornUndo');
        await P.go('home');
        check('AC-138: Hoàn tác → ô Đếm cử động thai trở lại', await P.ev("!!document.querySelector('#main [data-go=kick_home]')"));
        // AC-127: sửa ngày dự sinh ở "Dữ liệu của chị" → Trang chính đổi ngay
        await P.go('data');
        await P.clickText('Sửa');
        check('AC-127: "Sửa" → màn ngày dự sinh', await P.screen() === 'due_date', await P.screen());
        await P.ev(`(() => { const i = document.querySelector('#edd'); i.value = '${eddFor(181)}'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
        await P.act('eddSave');
        await P.go('home');
        check('AC-127: Trang chính đổi ngay "Hôm nay con được 25 tuần 6 ngày"', (await P.text()).includes('Hôm nay con được 25 tuần 6 ngày'), (await P.text()).slice(0, 200));
        if (await P.has('kick_home')) { await P.go('kick_home'); check('AC-127/134: mục đếm đổi theo (25 tuần → có dòng M-20b)', /Mục này thường dùng từ tuần 28/.test(await P.text())); }
        await noErr(P);
      } finally { await P.kill(); }
    },

    /* Ca biên của QA: rỗng, quá dài, ký tự đặc biệt, bấm đúp, back/refresh giữa chừng, desktop */
    async 'core-edge'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ok(P, ['checkin', 'thaigiao']))) return;
        await P.go('checkin');
        const long = 'à'.repeat(1200);
        await typeIn(P, '#ck-text', long);
        const lenCk = await P.ev("document.querySelector('#ck-text').maxLength + ':' + document.querySelector('#ck-text').value.length");
        check('AC-20: ô kể thêm giới hạn 1.000 ký tự (maxlength)', /^1000:/.test(lenCk), lenCk);
        await P.go('thaigiao');
        const ml = await P.ev("document.querySelector('#tg-text').maxLength");
        await P.ev("document.querySelector('#tg-text').focus()"); await P.page.type('ơ'.repeat(30)); await sleep(100);
        check('AC-63: ô lời nhắn tối đa 2.000 ký tự, có đếm ký tự', ml === 2000 && /\b30\b/.test(await P.ev("(document.querySelector('#tg-count') || {}).textContent || ''")), ml + ' · ' + await P.ev("(document.querySelector('#tg-count') || {}).textContent"));
        const weird = '🙂👶🏻 مرحبا ‮test‬ "quote" \'apos\' & <b>b</b> \\ `tick` ${x}';
        await typeIn(P, '#tg-text', weird);
        await P.act('tgSave');
        const l = await P.ev("JSON.stringify(LSTP_APP.S.letters.list())").then(JSON.parse);
        check('ký tự đặc biệt (emoji, RTL, ngoặc, &, <b>, ${}) → không cất được do chưa đồng ý chữ / hoặc giữ nguyên văn, không lỗi', !P.errors.length && (l.length === 0 || l[0].text === weird), JSON.stringify(l).slice(0, 200));
        // Bấm đúp ô trang chính: không đẩy trùng màn
        await P.ev("LSTP_APP.resetTo('home')"); await sleep(150);
        const h0 = await P.ev('history.length');
        await P.page.click('#main .tile[data-go=thaigiao]', 2); await sleep(250);
        check('bấm đúp ô Thai giáo → vào một lần (lịch sử +1, back về Trang chính)', await P.screen() === 'thaigiao' && await P.ev('history.length') - h0 === 1, String(await P.ev('history.length') - h0));
        await P.ev('history.back()'); await sleep(250);
        check('nút Back của trình duyệt → về Trang chính', await P.screen() === 'home', await P.screen());
        // Refresh giữa check-in
        await P.go('checkin'); await typeIn(P, '#ck-text', 'đang viết dở'); await P.reload();
        check('tải lại giữa check-in → app chạy lại bình thường (không trắng màn, không lỗi)', ['home', 'checkin', 'welcome'].includes(await P.screen()) && !P.errors.length, await P.screen());
        // Ô trống: cất lời nhắn rỗng
        await P.go('thaigiao'); await typeIn(P, '#tg-text', '   ');
        const n0 = (await P.qa()).downloads.length;
        await P.act('tgDownload');
        check('ô lời nhắn chỉ có khoảng trắng → không tải file rỗng', (await P.qa()).downloads.length === n0);
        await noErr(P);
      } finally { await P.kill(); }
      // Desktop 1280×800: không cuộn ngang trên mọi màn
      const D = await open({ width: 1280, height: 800, tag: 'desktop' });
      try {
        await enter(D, 'local');
        const names = (await D.ev('LSTP_APP.screens()')).filter(n => !/^(login|register|consent_account|forgot_pin|reset_pin)$/.test(n));
        const over = [];
        for (const n of names) { await D.go(n, n === 'player' ? { id: 'BREATHE_46' } : {}); const r = await D.ev('[document.documentElement.scrollWidth, document.documentElement.clientWidth]'); if (r[0] > r[1] + 1) over.push(n); await D.ev("LSTP_APP.resetTo('home')"); await sleep(60); }
        check('desktop 1280×800: ' + names.length + ' màn không cuộn ngang', names.length > 20 && !over.length, over.join(', '));
        check('desktop: không lỗi console', !D.errors.length && !(await D.qa()).errors.length, D.errors.concat((await D.qa()).errors).join(' | '));
      } finally { await D.kill(); }
    },

    /* AC-39: "Mình thấy khó chịu" khi đang phát âm thanh → âm tắt hẳn ≤ 3 giây; AC-51 hết giờ nhạc (5–15 phút thật) ghi giới hạn */
    async 'core-stop'() {
      const P = await open();
      try {
        await enter(P, 'local');
        if (!(await ok(P, ['player']))) return;
        await P.go('player', { id: 'AUDIO_CALM' });
        await P.click('#aplay'); await sleep(400);
        const on = await P.ev('LSTP_SOUND.playing()');
        await P.act('unwell');
        await sleep(3100);
        check('AC-39: đang phát âm thanh, bấm "Mình thấy khó chịu" → lớp L01 hiện, âm tắt hẳn trong ≤ 3 giây', on === 1 && await P.ev("!!document.querySelector('#l01') && !document.querySelector('#l01').hidden") && await P.ev('LSTP_SOUND.playing()') === 0, JSON.stringify([on, await P.ev('LSTP_SOUND.playing()')]));
        limit('AC-51 nhạc hết giờ nhỏ dần 10 giây', 'hẹn giờ 5/10/15 phút dùng setTimeout thật, không tua bằng đồng hồ giả; kiểm tay ở 14.5 (hẹn 5 phút)');
      } finally { await P.kill(); }
    },

    /* AC-02: prefers-reduced-motion – màn hoàn tất, thai giáo không vật thể bay */
    async 'core-reduced'() {
      const P = await open({ reduced: true });
      try {
        await enter(P, 'local');
        if (!(await ok(P, ['thaigiao', 'done']))) return;
        await P.go('thaigiao'); await P.act('tgDone'); await sleep(300);
        const a1 = await P.ev("document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().duration > 50 && /transform|scale|translate/.test(JSON.stringify(a.effect.getKeyframes ? a.effect.getKeyframes() : ''))).length");
        check('AC-02: Thai giáo "Mẹ đã làm rồi ✓" với giảm chuyển động → không hoạt ảnh biến hình', a1 === 0, a1);
        await P.go('player', { id: 'HUM' }); await P.act('finishExercise'); await P.act('coDone'); await sleep(300);
        const a2 = await P.ev("document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().duration > 50 && /transform|scale|translate/.test(JSON.stringify(a.effect.getKeyframes ? a.effect.getKeyframes() : ''))).length");
        check('AC-02: màn hoàn tất với giảm chuyển động → không pháo hoa, không vật thể bay', await P.screen() === 'done' && a2 === 0 && !(await P.ev("!!document.querySelector('.confetti, .heart-rain, .heart-fly.go')")), a2);
      } finally { await P.kill(); }
    }
  };
};
