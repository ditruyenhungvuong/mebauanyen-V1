/* =========================================================
   Mẹ Bầu An Yên – js/thaigiao.js
   Chủ: FE-5 Thai giáo, Thói quen & Hành trình
   Đặc tả: tech design mục 4.3, 5.2 · UX G01, G02 (3.4), F8, F15 · PRD AC-58…69, AC-115…121, A.16, A.17, A.18, A.2c, A.23
   Màn: thaigiao (G01: một màn hai bước — lời nhắc hôm nay + ô viết lời nhắn), letters (G02: Hộp thư gửi con).
   Trước khi cất hoặc tải lời nhắn: kiểm lần lượt tự hại → dấu hiệu nguy hiểm → thông tin nhận diện (engine FE-2),
   mỗi lớp chỉ hỏi một lần cho cùng nội dung, sửa chữ thì kiểm lại (AC-64). Bước A: chỉ lưu trên máy (none/local);
   ô "Lưu lời nhắn của mình lên tài khoản" chỉ hiện khi ACCOUNT_ENABLED và TEXT_SYNC_ENABLED.
   Không điểm, không chuỗi ngày, không huy hiệu ở màn này (AC-60). Mọi chuỗi vào HTML qua esc().
   ========================================================= */
(() => {
  'use strict';

  /* ===== Lời nhắc dự phòng (PRD Phụ lục A.16, nguyên văn) — chỉ dùng khi data.js (FE-2) chưa có danh sách ===== */
  const FALLBACK_PROMPTS = [
    ['TG-01', 'Kể chuyện', 'Hôm nay chị kể cho con nghe một chuyện nhỏ trong ngày nhé. Chuyện bữa sáng, chuyện đi làm, chuyện gì cũng được.'],
    ['TG-02', 'Gọi tên con', 'Chị gọi tên ở nhà của con vài lần, thật nhẹ nhé. Chưa đặt tên thì gọi "con yêu" cũng được.'],
    ['TG-03', 'Đọc thơ', 'Chị đọc cho con nghe vài câu thơ chị thích. Đọc chậm thôi, không cần thuộc.'],
    ['TG-04', 'Hát ru', 'Chị hát ru con một bài nhé. Hát nhỏ thôi, sai lời cũng không sao.', '', { label: 'Ngân "ừm" cùng con ›', exercise: 'HUM' }],
    ['TG-05', 'Xoa bụng khi con đạp', 'Lúc con đạp, chị đặt tay lên chỗ đó, xoa thật nhẹ và nói "mẹ đây". Lúc này con đang nghỉ thì chị cứ đặt tay lên bụng là được.', 'Xoa nhẹ thôi, không ấn, không day mạnh. Bụng gò cứng thì chị dừng, nằm nghiêng nghỉ nhé.'],
    ['TG-06', 'Kể về bố', 'Chị kể cho con nghe về bố nhé. Hoặc nhờ bố nói với con một câu.'],
    ['TG-07', 'Kể về nhà', 'Chị kể cho con nghe về ngôi nhà mình: căn phòng, khung cửa sổ, chậu cây ngoài hiên…'],
    ['TG-08', 'Món ăn', 'Chị tả cho con nghe món chị thích nhất hôm nay: màu gì, mùi gì, vị gì.'],
    ['TG-09', 'Điều mẹ mong', 'Chị nói với con một điều chị mong cho con. Một điều thôi.'],
    ['TG-10', 'Nghe nhạc', 'Hôm nay mình nghe nhạc cùng con nhé. Chị mở vừa đủ nghe, ngồi tựa hoặc nằm nghiêng.', '', { label: 'Nghe nhạc cùng con ›', exercise: 'MUSIC' }],
    ['TG-11', 'Đi dạo', 'Chị đi dạo một chút, rồi kể con nghe chị thấy gì: cái cây, con mèo, bầu trời.', 'Đi chậm, chỗ bằng phẳng. Mệt thì nghỉ nhé.'],
    ['TG-12', 'Đồ cho con', 'Chị kể con nghe chị đã chuẩn bị gì cho con: chiếc áo nhỏ, đôi tất, cái mũ…'],
    ['TG-13', 'Kỷ niệm của mẹ', 'Chị kể cho con nghe một kỷ niệm hồi chị còn bé nhé.'],
    ['TG-14', 'Mệt cũng nói', 'Hôm nay mệt thì chị nói với con: "Hôm nay mẹ mệt, nhưng mẹ vẫn thương con." Mệt cũng được nói ra mà.'],
    ['TG-15', 'Đọc sách', 'Chị đọc to cho con nghe một trang sách chị đang đọc. Sách gì cũng được.'],
    ['TG-16', 'Thời tiết', 'Chị kể con nghe hôm nay trời thế nào: nắng, mưa hay có gió.']
  ].map(([id, type, text, safety, action]) => ({ id, type, text, safety: safety || '', action: action || null, status: 'draft' }));

  const MAX_LEN = 2000;
  const DRAFT_LINE = 'Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt. App không thay cho việc khám thai, không chẩn đoán hay điều trị.';
  const T = {
    toastDone: 'Đã ghi nhận. Hôm nay mẹ đã dành thời gian cho con 💗',
    toastLater: 'Để hôm khác nhé. Không sao đâu.',
    toastSaved: 'Đã cất vào hộp thư của con 💌',
    toastDeleted: 'Đã xóa lời nhắn.',
    toastDeletedCloud: 'Đã xóa lời nhắn, cả trên tài khoản.',
    toastDownloaded: 'Đã tải lời nhắn về máy.',
    toastBlocked: 'Máy này đang chặn lưu dữ liệu. Mình chạy ở chế độ không lưu nhé.',
    toastDropped: 'Đã bỏ các đoạn đó.',
    deleteFail: 'Mình chưa xóa được trên tài khoản. Chị thử lại khi có mạng nhé.'
  };

  let api = null;
  const esc = s => api.esc(s);
  const S = () => api.S;
  const safe = (fn, dflt) => { try { const v = fn(); return v === undefined ? dflt : v; } catch (e) { return dflt; } };
  const today = () => api.today();
  const fmtDMY = day => (typeof day === 'string' && day.length === 10) ? day.slice(8, 10) + '/' + day.slice(5, 7) + '/' + day.slice(0, 4) : '';
  const st = () => (api.state.tg = api.state.tg || {
    day: null, offset: 0, draft: '', ack: { selfHarm: null, signs: null, pii: null },
    signs: null, pii: null, piiShownFor: null, doneDay: null, cloudCardShown: false, cloudLater: false
  });

  /* ===== Lời nhắc ===== */
  function prompts() {
    const D = (api && api.D) || window.LSTP_DATA || {};
    const src = [D.TG_PROMPTS, D.THAIGIAO_PROMPTS, D.THAIGIAO, D.PROMPTS].find(a => Array.isArray(a) && a.length);
    if (!src) return FALLBACK_PROMPTS;
    return src.filter(p => p && (p.id || p.code)).map(p => {
      const id = String(p.id || p.code);
      const fb = FALLBACK_PROMPTS.find(f => f.id === id) || {};
      const act = p.action || p.button || (p.exercise ? { label: p.buttonLabel || p.actionLabel, exercise: p.exercise } : null);
      return {
        id, type: String(p.type || p.kind || p.tag || p.title || fb.type || ''),
        text: String(p.text || p.prompt || fb.text || ''),
        safety: String(p.safety || p.safe || fb.safety || '').replace(/^An toàn:\s*/, ''),
        action: act && (act.label || (fb.action && fb.action.label)) ? Object.assign({}, fb.action || {}, act) : (fb.action || null),
        status: p.status || 'draft'
      };
    });
  }
  const promptById = id => prompts().find(p => p.id === id) || null;
  // Lời nhắc theo ngày: cùng ngày mở lại vẫn là lời đó, không cần ghi gì xuống máy (AC-58).
  // "Đổi lời nhắc khác" đi vòng tuần tự nên không lặp lại trong phiên cho tới khi hết 16 lời (AC-59).
  function currentPrompt() {
    const s = st(), list = prompts();
    if (s.day !== today()) { s.day = today(); s.offset = 0; s.doneDay = s.doneDay === today() ? s.doneDay : null; }
    const base = api.U && typeof api.U.dayNum === 'function' ? api.U.dayNum(today()) : api.ST.dayNum(today());
    const n = list.length || 1;
    return list[(((base + s.offset) % n) + n) % n];
  }

  /* ===== Quyền lưu theo cách dùng và đồng ý ===== */
  const mode = () => api.mode();
  const consent = () => safe(() => S().consent(), null) || {};
  function canSave(kind) {
    if (typeof api.canSave === 'function') return !!safe(() => api.canSave(kind), false);
    // Dự phòng tới khi FE-1 có api.canSave
    if (mode() === 'none' || !mode()) return false;
    if (kind === 'writing') return !!consent().writing;
    if (kind === 'textSync') return false;
    return true;
  }
  const C = () => api.C || {};
  const cloudFeature = () => !!(C().ACCOUNT_ENABLED && C().TEXT_SYNC_ENABLED && mode() === 'account');
  const textSyncOn = () => cloudFeature() && canSave('textSync');

  /* ===== Dữ liệu (qua store FE-1) ===== */
  const RE_DAY = /^\d{4}-\d{2}-\d{2}$/;
  function letters() {
    const l = safe(() => S().letters.list(), []);
    return (Array.isArray(l) ? l : []).filter(r => r && typeof r.id === 'string' && RE_DAY.test(r.day) && typeof r.text === 'string')
      .sort((a, b) => (b.at || 0) - (a.at || 0) || (a.day < b.day ? 1 : -1));
  }
  const tgMarks = () => { const l = safe(() => S().thaigiao.list(), []); return Array.isArray(l) ? l : []; };
  const doneToday = () => st().doneDay === today() || tgMarks().some(r => r && r.day === today() && r.how === 'done');
  function markHabit() {
    // Tự đánh dấu thói quen "Thai giáo" (AC-101): qua api.markHabit của lõi, hoặc API của habits.js
    safe(() => (typeof api.markHabit === 'function' ? api.markHabit('thai_giao', 'a') : window.LSTP_HABITS && window.LSTP_HABITS.mark('thai_giao', today(), 'a')));
  }
  const markThaiGiao = (prompt, how) => safe(() => { S().thaigiao.mark(today(), prompt, how); return true; }, false);

  /* ===== Kiểm an toàn ba lớp (PRD 9.1; AC-64, AC-66, AC-117) ===== */
  function checkLayers(text) {
    const E = api.E || {};
    if (typeof E.safetyCheck === 'function') {
      const sc = safe(() => E.safetyCheck({ text }), {}) || {};
      const pii = typeof E.detectPII === 'function' ? (safe(() => E.detectPII(text), []) || []) : [];
      return { selfHarm: !!sc.selfHarm, signs: Array.isArray(sc.obSigns) ? sc.obSigns : [], pii: Array.isArray(pii) ? pii : [] };
    }
    // Dự phòng: chỉ có api.safetyGate của lõi (trả lớp cao nhất)
    if (typeof api.safetyGate === 'function') {
      const r = safe(() => api.safetyGate(text, { inline: true, from: 'letter' }), {}) || {};
      const f = r.flags || {};
      return {
        selfHarm: r.route === 'urgent' || !!f.selfHarm,
        signs: r.route === 'see_doctor' ? (Array.isArray(r.hits) ? r.hits : Array.isArray(f.obSigns) ? f.obSigns : []) : (Array.isArray(f.obSigns) ? f.obSigns : []),
        pii: r.route === 'pii' && Array.isArray(r.hits) ? r.hits : []
      };
    }
    return { selfHarm: false, signs: [], pii: [] };
  }
  function signLabel(code) {
    const D = api.D || {};
    const sgn = Array.isArray(D.DANGER_SIGNS) ? D.DANGER_SIGNS.find(x => x && (x.id === code || x.code === code)) : null;
    if (sgn && sgn.label) return String(sgn.label);
    if (code && typeof code === 'object') return String(code.label || code.text || code.id || '');
    return String(code || '');
  }

  // Chạy lần lượt ba lớp rồi cất / tải. kind: 'save' | 'download'
  function submit(kind) {
    const s = st();
    const text = s.draft.trim();
    if (!text) return;
    const r = checkLayers(text);
    // 1) Tự hại → trang hỗ trợ khẩn; chữ giữ nguyên trong bộ nhớ (state), không ghi xuống máy
    if (r.selfHarm && s.ack.selfHarm !== text) {
      s.ack.selfHarm = text;
      // "Mình đang an toàn… Tiếp tục" ở trang khẩn quay lại đây (cont) rồi đi tiếp lớp 2, 3 cho cùng nội dung
      s.resume = { token: Math.random().toString(36).slice(2, 10), kind };
      api.go('urgent', {
        from: 'thaigiao',
        signs: r.signs.map(x => (typeof x === 'string' ? x : x && x.id)).filter(Boolean),
        cont: { name: 'thaigiao', params: { resume: s.resume.token } },
        back: { name: 'thaigiao', params: {} }
      });
      return;
    }
    // 2) Dấu hiệu nguy hiểm / con đạp ít → thẻ ngay trên ô, không chuyển màn (AC-66)
    if (r.signs.length && s.ack.signs !== text) {
      s.signs = { text, codes: r.signs, kind };
      s.pii = null;
      paint(true, '#tg-sign');
      return;
    }
    // 3) Thông tin nhận diện → bảng dưới ô; bấm lần nữa với cùng chữ = "Vẫn giữ"
    if (r.pii.length && s.ack.pii !== text) {
      if (s.piiShownFor === text) s.ack.pii = text;
      else { s.pii = { text, hits: r.pii, kind }; s.piiShownFor = text; s.signs = null; paint(true, '#tg-pii'); return; }
    }
    finish(kind, text);
  }
  function finish(kind, text) {
    const s = st();
    const p = currentPrompt();
    if (kind === 'download') {
      download('loi-me-ke-' + today().replace(/-/g, '') + '.txt', 'text/plain;charset=utf-8', letterTxt({ day: today(), prompt: p && p.id, text }));
      api.toast(T.toastDownloaded);
      s.pii = null; s.signs = null;
      paint(false);
      return;
    }
    if (!canSave('writing')) return;
    const ok = safe(() => { const res = S().letters.add({ day: today(), prompt: p ? p.id : null, text }); return res !== false; }, false);
    if (!ok) { api.toast(T.toastBlocked); return; }
    markThaiGiao(p ? p.id : null, 'letter');
    markHabit();
    s.draft = ''; s.ack = { selfHarm: null, signs: null, pii: null }; s.pii = null; s.signs = null; s.piiShownFor = null;
    api.toast(T.toastSaved);
    api.rerender();
    focusSel('#tg-step2');
  }

  /* ===== Tải về (.txt) — file chỉ gồm ngày, lời nhắc của ngày và lời nhắn (AC-67, A.17) ===== */
  function letterTxt(rec) {
    const p = rec.prompt ? promptById(rec.prompt) : null;
    return 'Lời mẹ kể – ' + fmtDMY(rec.day) + '\n' + (p ? 'Lời nhắc hôm ấy: ' + p.text + '\n' : '') + '\n' + rec.text + '\n';
  }
  function download(name, mime, text) {
    if (typeof api.download === 'function') return api.download(name, mime, text);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const allLettersTxt = list => '\uFEFF' + list.map(letterTxt).join('\n————\n\n');

  /* ===== Xác nhận bấm hai lần (dùng api.confirmTwice của lõi nếu có) ===== */
  function confirmTwice(btn, label2, fn) {
    if (typeof api.confirmTwice === 'function') return api.confirmTwice(btn, { label2, ms: 4000 }, fn);
    if (btn.dataset.armed === '1') { btn.dataset.armed = ''; fn(); return; }
    const old = btn.textContent;
    btn.dataset.armed = '1'; btn.textContent = label2; btn.classList.add('is-armed');
    api.lifecycle.later(() => { if (btn.isConnected && btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.textContent = old; btn.classList.remove('is-armed'); } }, 4000);
  }
  function focusSel(sel) {
    const el = document.querySelector('#main ' + sel);
    if (el) { if (!el.hasAttribute('tabindex') && !/^(BUTTON|A|TEXTAREA|INPUT)$/.test(el.tagName)) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: false }); }
  }

  /* ===== G01 – Thai giáo · Lời mẹ kể 💌 ===== */
  function modeLine() {
    if (mode() === 'none') return 'Chế độ không lưu: đóng trang là mất. Chị tải lời nhắn về máy được nhé.';
    if (mode() === 'account' && cloudFeature()) {
      return textSyncOn() ? '☁️ Lời nhắn sẽ được lưu lên tài khoản.'
        : 'Lời nhắn này chỉ nằm trên máy. Muốn đọc lại ở máy khác, chị bật "Lưu lời nhắn của mình lên tài khoản", hoặc tải về nhé.';
    }
    if (!canSave('writing')) return 'Lời nhắn này chỉ ở đây, không được lưu. Muốn giữ lại, chị bật "Lưu cả những gì chị tự viết" trong Dữ liệu của chị, hoặc tải về máy nhé.';
    return '';
  }
  function signCard() {
    const s = st();
    if (!s.signs || s.signs.text !== s.draft.trim()) return '';
    const names = s.signs.codes.map(signLabel).filter(Boolean);
    const list = names.join('", "');   // nhiều dấu hiệu: "A", "B" (ngoặc ngoài nằm sẵn trong câu A.17)
    return `<div class="tg-sign" id="tg-sign" role="alert" tabindex="-1">
      <p><span class="tg-sign-ico" aria-hidden="true">▲</span> Trong lời nhắn có điều mình muốn hỏi lại: chị đang có dấu hiệu "${esc(list)}" phải không? Nếu đang có, chị đi khám ngay nhé.</p>
      <div class="tg-row">
        <button type="button" class="btn btn-urgent-outline" data-go="signs">Xem dấu hiệu cần đi khám</button>
        <button type="button" class="btn btn-secondary" data-act="tgSignOk">Mình đã đi khám rồi</button>
      </div>
    </div>`;
  }
  function piiBox() {
    const s = st();
    if (!s.pii || s.pii.text !== s.draft.trim()) return '';
    return `<div class="tg-pii" id="tg-pii" role="alert" tabindex="-1">
      <p>Có thể có thông tin nhận diện:</p>
      <ul>${s.pii.hits.map(h => `<li><mark>${esc(h && h.text)}</mark> – ${esc(h && h.why)}</li>`).join('')}</ul>
      <p>Chị sửa lại nếu cần, rồi bấm lần nữa nhé.</p>
      ${textSyncOn() ? '<p>Lời nhắn này sẽ được lưu vào tài khoản của chị.</p>' : ''}
      <p class="fine">Bộ lọc không thể phát hiện mọi thông tin.</p>
      <div class="tg-row">
        <button type="button" class="btn btn-secondary" data-act="tgPiiEdit">Sửa lại</button>
        <button type="button" class="btn btn-secondary" data-act="tgPiiDrop">Bỏ đoạn đó</button>
        <button type="button" class="btn btn-ghost" data-act="tgPiiKeep">Vẫn giữ</button>
      </div>
    </div>`;
  }
  function cloudCard() {
    // L13 (Bước B): chỉ khi bật tính năng, đã đăng nhập, chưa từng trả lời công tắc và chị vừa vào ô viết lần đầu
    const s = st();
    if (!cloudFeature() || s.cloudLater || consent().text !== undefined || !s.cloudCardShown) return '';
    return `<div class="tg-cloud" role="region" aria-labelledby="tg-cloud-t">
      <p id="tg-cloud-t"><b>☁️ Lưu lời nhắn lên tài khoản?</b></p>
      <p>Bật thì mình lưu lời nhắn của chị lên tài khoản, chị đăng nhập máy khác vẫn đọc lại được. Trước khi gửi, mình nhắc chị nếu thấy họ tên, số điện thoại hay địa chỉ. Tắt thì lời nhắn chỉ nằm trên máy này.</p>
      <button type="button" class="tg-switch" role="switch" aria-checked="false" data-act="tgCloudOn">
        <span class="sw" aria-hidden="true"><span class="sw-knob"></span></span><span class="sw-txt" aria-hidden="true">Tắt</span>
        <span>Lưu lời nhắn của mình lên tài khoản</span>
      </button>
      <p class="fine">Chị đổi lại được trong Dữ liệu của chị.</p>
      <button type="button" class="btn btn-secondary" data-act="tgCloudLater">Để sau</button>
    </div>`;
  }
  function renderG01() {
    const s = st();
    const p = currentPrompt();
    const done = doneToday();
    const has = s.draft.trim().length > 0;
    const save = canSave('writing') && mode() !== 'none';
    const line = modeLine();
    const draftLine = C().ALLOW_DRAFT_CONTENT !== false && prompts().some(x => x.status !== 'approved');
    const act = p && p.action;
    return `<section class="card tg">
      <h1>Thai giáo · Lời mẹ kể 💌</h1>
      <p>Mỗi ngày một việc nhỏ để mẹ con mình ở gần nhau. Làm hay để hôm khác đều được nhé.</p>
      <p class="fine">Không có điểm. Bỏ một hôm cũng không sao.</p>

      <div class="tg-step">
        <h2 class="section-title"><span class="step-num" aria-hidden="true">1</span> Lời nhắc hôm nay</h2>
        <div class="tg-prompt${done ? ' is-done' : ''}" id="tg-prompt" tabindex="-1" aria-live="polite">
          ${p ? `<span class="badge-tag">${esc(p.type)}</span>
          <p class="tg-prompt-text">${esc(p.text)}</p>
          ${act ? `<button type="button" class="btn btn-secondary tg-prompt-act" data-act="tgPromptAct">${esc(act.label)}</button>` : ''}
          ${p.safety ? `<p class="tg-safety"><b>An toàn:</b> ${esc(p.safety)}</p>` : ''}` : ''}
          ${done ? '<p class="tg-done-band">✓ Hôm nay mẹ đã làm rồi</p>' : ''}
        </div>
        <div class="tg-actions">
          ${done ? '' : `<button type="button" class="btn btn-block ${has ? 'btn-secondary' : 'btn-primary'}" data-act="tgDone" id="tg-done">Mẹ đã làm rồi ✓</button>`}
          <button type="button" class="btn btn-secondary btn-block" data-act="tgNext">Đổi lời nhắc khác</button>
          <button type="button" class="btn-link" data-act="tgLater">Để hôm khác</button>
        </div>
      </div>

      <hr class="section-divider">

      <div class="tg-step" id="tg-step2" tabindex="-1">
        <h2 class="section-title" id="tg-w-title"><span class="step-num" aria-hidden="true">2</span> Hôm nay mẹ đã kể với con điều gì…</h2>
        <p class="tg-warn" id="tg-warn">🔒 Không cần ghi họ tên, số điện thoại hay địa chỉ. Gọi con bằng tên ở nhà là được.</p>
        <div id="tg-sign-box">${signCard()}</div>
        <div id="tg-cloud-box">${cloudCard()}</div>
        <textarea id="tg-text" class="tg-text" rows="6" maxlength="${MAX_LEN}" aria-labelledby="tg-w-title" aria-describedby="tg-warn tg-count"
          placeholder="Hôm nay mẹ kể con nghe chuyện bà ngoại nấu canh chua…">${esc(s.draft)}</textarea>
        <p class="tg-count" id="tg-count" aria-live="${MAX_LEN - s.draft.length <= 100 ? 'polite' : 'off'}">${s.draft.length}/${MAX_LEN} ký tự</p>
        <div id="tg-pii-box">${piiBox()}</div>
        ${line ? `<p class="fine tg-mode">${esc(line)}</p>` : ''}
        <div class="tg-actions">
          ${save ? `<button type="button" class="btn btn-block btn-submit ${has ? 'btn-primary ready' : 'btn-primary'}" data-act="tgSave" id="tg-save" aria-disabled="${!has}" aria-describedby="tg-hint">Cất vào hộp thư 💌</button>` : ''}
          <p class="submit-hint" id="tg-hint" aria-live="polite"${has ? ' hidden' : ''}>💡 ${save ? 'Chị viết vài dòng thì cất được vào hộp thư nhé.' : 'Chị viết vài dòng thì tải được lời nhắn về máy nhé.'}</p>
          <button type="button" class="btn btn-block ${!save && has ? 'btn-primary' : 'btn-secondary'}" data-act="tgDownload" id="tg-dl" aria-disabled="${!has}" aria-describedby="tg-hint">Tải lời nhắn về máy</button>
          <button type="button" class="btn-link" data-act="tgLater">Để hôm khác</button>
        </div>
        <p class="tg-links"><button type="button" class="btn-link" data-go="letters">📖 Hộp thư gửi con ›</button></p>
      </div>
      ${draftLine ? `<p class="fine draft-note">${esc(DRAFT_LINE)}</p>` : ''}
    </section>`;
  }
  // Vẽ lại phần bảng/thẻ mà không mất chữ đang gõ; focus vào khối vừa hiện
  function paint(scroll, focusId) {
    const box = (id, html) => { const el = document.querySelector('#main #' + id); if (el) el.innerHTML = html; };
    box('tg-sign-box', signCard());
    box('tg-pii-box', piiBox());
    box('tg-cloud-box', cloudCard());
    if (focusId) {
      const el = document.querySelector('#main ' + focusId);
      if (el) { el.focus({ preventScroll: true }); if (scroll) el.scrollIntoView({ block: 'center', behavior: api.reduceMotion() ? 'auto' : 'smooth' }); }
    }
  }
  function syncButtons(root) {
    const s = st();
    const has = s.draft.trim().length > 0;
    const save = root.querySelector('#tg-save'), dl = root.querySelector('#tg-dl'), hint = root.querySelector('#tg-hint'), done = root.querySelector('#tg-done');
    if (save) { save.classList.toggle('ready', has); save.setAttribute('aria-disabled', String(!has)); }
    if (dl) { dl.setAttribute('aria-disabled', String(!has)); if (!save) { dl.classList.toggle('btn-primary', has); dl.classList.toggle('btn-secondary', !has); } }
    if (hint) hint.hidden = has;
    // Một nút chính tại một lúc: có chữ thì "Cất" thức dậy, "Mẹ đã làm rồi ✓" lùi thành nút phụ
    if (done) { done.classList.toggle('btn-primary', !has); done.classList.toggle('btn-secondary', has); }
    const cnt = root.querySelector('#tg-count');
    if (cnt) { cnt.textContent = s.draft.length + '/' + MAX_LEN + ' ký tự'; cnt.setAttribute('aria-live', MAX_LEN - s.draft.length <= 100 ? 'polite' : 'off'); }
  }
  function openExercise(action) {
    const D = api.D || {};
    const ex = Array.isArray(D.EXERCISES) ? D.EXERCISES : [];
    let id = action.exercise || (action.params && action.params.id);
    if (id === 'MUSIC') { const m = ex.find(e => e && (e.type === 'music' || /MUSIC/.test(e.id || ''))); id = m ? m.id : id; }
    if (action.go) return api.go(action.go, action.params || {});
    api.go('player', { id, exercise: id, from: 'thaigiao' });   // không tự phát nhạc: trình phát chờ chị bấm (AC-62)
  }
  function mountG01(root, params) {
    const s = st();
    // Quay lại từ trang khẩn bằng "Tiếp tục": chạy tiếp các lớp sau (một lần cho mỗi lượt)
    if (params && params.resume && s.resume && params.resume === s.resume.token) {
      const kind = s.resume.kind; s.resume = null;
      api.lifecycle.later(() => submit(kind), 0);
    }
    const ta = root.querySelector('#tg-text');
    if (ta) {
      api.lifecycle.on(ta, 'input', () => {
        s.draft = ta.value.slice(0, MAX_LEN);
        // Sửa chữ thì kiểm lại: bỏ thẻ/bảng đã hiện cho nội dung cũ
        if ((s.pii && s.pii.text !== s.draft.trim()) || (s.signs && s.signs.text !== s.draft.trim())) { s.pii = null; s.signs = null; paint(false); }
        syncButtons(root);
      });
      api.lifecycle.on(ta, 'focus', () => {
        if (cloudFeature() && !s.cloudCardShown && consent().text === undefined && !s.cloudLater) { s.cloudCardShown = true; paint(false); }
      });
    }
    const p = () => currentPrompt();
    api.screenActions({
      tgDone: () => {
        const cur = p();
        markThaiGiao(cur ? cur.id : null, 'done');
        markHabit();
        s.doneDay = today();
        api.toast(T.toastDone);
        api.rerender();
        focusSel('#tg-prompt');
      },
      tgNext: () => { s.offset++; api.rerender(); focusSel('#tg-prompt'); },
      tgLater: () => { api.toast(T.toastLater); api.resetTo('home'); },
      tgPromptAct: () => { const cur = p(); if (cur && cur.action) openExercise(cur.action); },
      tgSave: el => { if (el.getAttribute('aria-disabled') === 'true') { focusSel('#tg-text'); return; } submit('save'); },
      tgDownload: el => { if (el.getAttribute('aria-disabled') === 'true') { focusSel('#tg-text'); return; } submit('download'); },
      tgSignOk: () => {
        // "Mình đã đi khám rồi" → cất (hoặc tải) bình thường, vẫn qua lớp thông tin nhận diện (AC-66)
        const kind = (s.signs && s.signs.kind) || 'save';
        s.ack.signs = s.draft.trim(); s.signs = null; paint(false);
        submit(kind);
      },
      tgPiiEdit: () => { const t = root.querySelector('#tg-text'); if (t) t.focus(); },
      tgPiiDrop: () => {
        let txt = s.draft;
        for (const h of (s.pii ? s.pii.hits : [])) if (h && h.text) txt = txt.split(String(h.text)).join('');
        s.draft = txt.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?…])/g, '$1').trim();
        s.pii = null; s.piiShownFor = null;
        const t = root.querySelector('#tg-text'); if (t) t.value = s.draft;
        paint(false); syncButtons(root);
        api.toast(T.toastDropped);
        if (t) t.focus();
      },
      tgPiiKeep: () => { const kind = (s.pii && s.pii.kind) || 'save'; s.ack.pii = s.draft.trim(); s.pii = null; paint(false); submit(kind); },
      tgCloudOn: () => {
        safe(() => (typeof S().setConsent === 'function' ? S().setConsent({ text: true }) : null));
        s.cloudCardShown = false; api.rerender(); focusSel('#tg-text');
      },
      tgCloudLater: () => {
        s.cloudLater = true;
        safe(() => (typeof S().setConsent === 'function' ? S().setConsent({ text: false }) : null));
        paint(false); focusSel('#tg-text');
      }
    });
  }

  /* ===== G02 – Hộp thư gửi con 📖 ===== */
  function syncOf(rec) {
    const v = rec.sync || safe(() => (typeof S().letters.syncState === 'function' ? S().letters.syncState(rec.id) : null), null);
    return v === 'cloud' || v === 'pending' || v === 'pending_delete' ? v : 'local';
  }
  const BADGE = { cloud: '☁️ Đã lưu lên tài khoản', pending: '⏳ Đang chờ gửi', pending_delete: '⏳ Đang chờ xóa trên tài khoản', local: '📱 Chỉ trên máy này' };
  function letterCard(rec) {
    const p = rec.prompt ? promptById(rec.prompt) : null;
    const acct = mode() === 'account';
    const sync = syncOf(rec);
    return `<article class="letter" id="lt-${esc(rec.id)}" tabindex="-1" aria-labelledby="lt-d-${esc(rec.id)}">
      <p class="letter-date" id="lt-d-${esc(rec.id)}"><span aria-hidden="true">✉</span> <time datetime="${esc(rec.day)}">${esc(fmtDMY(rec.day))}</time></p>
      ${p ? `<p class="letter-prompt">${esc(p.text)}</p>` : ''}
      <p class="letter-text">${esc(rec.text)}</p>
      <div class="letter-foot">
        ${acct ? `<span class="sync-badge">${esc(BADGE[sync])}</span>` : ''}
        ${acct && sync === 'local' && textSyncOn() && typeof safe(() => S().letters.upload, null) === 'function' ? `<button type="button" class="btn btn-secondary btn-sm" data-act="ltUpload" data-id="${esc(rec.id)}">Lưu lên tài khoản</button>` : ''}
        <button type="button" class="btn btn-secondary btn-sm" data-act="ltDelete" data-id="${esc(rec.id)}" data-cloud="${sync === 'cloud' ? '1' : ''}">🗑 Xóa</button>
      </div>
    </article>`;
  }
  function renderG02() {
    const list = letters();
    const m = mode();
    const acct = m === 'account';
    let body;
    if (!list.length) {
      const msg = m === 'none'
        ? 'Chế độ không lưu nên hộp thư không giữ lại gì. Chị vẫn viết và tải lời nhắn về máy được nhé.'
        : 'Hộp thư còn trống. Hôm nay mẹ kể với con một điều nhỏ nhé.';
      const extra = m !== 'none' && !canSave('writing') && !acct
        ? '<p class="fine">Muốn giữ lời nhắn, chị bật "Lưu cả những gì chị tự viết" trong Dữ liệu của chị nhé.</p>' : '';
      body = `<div class="lt-empty">${JAR_SVG}<p>${esc(msg)}</p>${extra}
        <button type="button" class="btn btn-primary btn-block" data-go="thaigiao">Viết lời nhắn cho con ›</button></div>`;
    } else if (list.length > 50) {
      // Nhiều lá thì nhóm theo tháng (N-53)
      const groups = [];
      for (const r of list) {
        const key = r.day.slice(0, 7);
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) { g = { key, items: [] }; groups.push(g); }
        g.items.push(r);
      }
      body = groups.map(g => `<h2 class="lt-month">Tháng ${+g.key.slice(5, 7)}/${esc(g.key.slice(0, 4))}</h2>${g.items.map(letterCard).join('')}`).join('');
    } else body = list.map(letterCard).join('');
    const accLine = acct && cloudFeature()
      ? `<p class="fine">${esc(textSyncOn() ? '☁️ Lời nhắn sẽ được lưu lên tài khoản.' : 'Lời nhắn này chỉ nằm trên máy. Muốn đọc lại ở máy khác, chị bật "Lưu lời nhắn của mình lên tài khoản", hoặc tải về nhé.')}</p>` : '';
    return `<section class="card tg lt">
      <h1>Hộp thư gửi con 📖</h1>
      <p>Mỗi lời mẹ kể là một lá thư nhỏ. Sau này, chị đọc lại cho con nghe nhé.</p>
      ${accLine}
      ${list.length ? '<button type="button" class="btn btn-secondary btn-block" data-act="ltDownloadAll">Tải cả hộp thư về máy (.txt)</button>' : ''}
      <div class="lt-list">${body}</div>
      <p class="tg-links"><button type="button" class="btn-link" data-go="journey">🗺️ Xem hành trình mang thai ›</button></p>
    </section>`;
  }
  function mountG02(root) {
    api.screenActions({
      ltDownloadAll: () => { download('hop-thu-gui-con-' + today().replace(/-/g, '') + '.txt', 'text/plain;charset=utf-8', allLettersTxt(letters())); api.toast(T.toastDownloaded); },
      ltDelete: el => {
        const id = el.dataset.id, cloud = el.dataset.cloud === '1';
        confirmTwice(el, cloud ? 'Bấm lần nữa để xóa, cả trên tài khoản' : 'Bấm lần nữa để xóa', () => {
          const order = letters().map(r => r.id);
          const nextId = order[order.indexOf(id) + 1] || order[order.indexOf(id) - 1] || null;
          const after = ok => {
            if (!ok) { api.toast(T.deleteFail); return; }
            api.toast(cloud ? T.toastDeletedCloud : T.toastDeleted);
            api.rerender();
            if (nextId && document.querySelector('#main #lt-' + CSS.escape(nextId))) focusSel('#lt-' + CSS.escape(nextId)); else focusSel('h1');
          };
          let res;
          try { res = S().letters.remove(id); } catch (e) { after(false); return; }
          if (res && typeof res.then === 'function') res.then(r => after(r !== false), () => after(false)); else after(res !== false);
        });
      },
      ltUpload: el => {
        // Bước B: lá 📱 → qua bảng PII như khi cất, rồi gửi (store/sync lo hàng chờ)
        const rec = letters().find(r => r.id === el.dataset.id);
        if (!rec) return;
        const r = checkLayers(rec.text);
        if (r.pii.length && el.dataset.armed !== '1') {
          el.dataset.armed = '1';
          el.textContent = 'Có thể có thông tin nhận diện. Bấm lần nữa để vẫn lưu';
          return;
        }
        safe(() => S().letters.upload(rec.id));
        api.rerender();
      }
    });
  }

  // Hũ thư nhỏ cho trạng thái rỗng (vẽ bằng SVG nội tuyến, aria-hidden)
  const JAR_SVG = `<svg class="lt-jar" viewBox="0 0 120 120" width="96" height="96" aria-hidden="true" focusable="false">
    <rect x="34" y="18" width="52" height="12" rx="5" fill="var(--rose-300)"/>
    <path d="M30 34 Q30 30 36 30 H84 Q90 30 90 34 V96 Q90 108 78 108 H42 Q30 108 30 96 Z" fill="var(--rose-50)" stroke="var(--line-strong)" stroke-width="2.5"/>
    <rect x="42" y="56" width="36" height="24" rx="3" fill="#fff" stroke="var(--rose-700)" stroke-width="2"/>
    <path d="M42 58 L60 70 L78 58" fill="none" stroke="var(--rose-700)" stroke-width="2"/>
    <path d="M60 46 c-3-4-9-2-8 2 c1 3 8 7 8 7 s7-4 8-7 c1-4-5-6-8-2z" fill="var(--rose-500)"/>
  </svg>`;

  /* ===== Dự phòng khi store (FE-1) chưa có S.thaigiao / S.letters: giữ trong bộ nhớ, không ghi xuống máy ===== */
  function shimStore(St, U) {
    if (!St) return;
    const rid = () => (U && typeof U.randomId === 'function' ? U.randomId() : Math.random().toString(36).slice(2, 14) + Date.now().toString(36));
    if (!St.thaigiao || typeof St.thaigiao.mark !== 'function') {
      const mem = [];
      St.thaigiao = {
        mark(day, prompt, how) { mem.push({ v: 1, id: rid(), at: Date.now(), day, prompt: prompt || null, how }); },
        list: () => mem.slice(),
        remove(id) { const i = mem.findIndex(r => r.id === id); if (i >= 0) mem.splice(i, 1); },
        _shim: true
      };
    }
    if (!St.letters || typeof St.letters.add !== 'function') {
      const mem = [];
      St.letters = {
        add({ day, prompt, text }) { mem.push({ v: 1, id: rid(), at: Date.now(), day, prompt: prompt || null, text: String(text).slice(0, MAX_LEN) }); },
        list: () => mem.slice(),
        remove(id) { const i = mem.findIndex(r => r.id === id); if (i >= 0) mem.splice(i, 1); },
        clear() { mem.length = 0; },
        _shim: true
      };
    }
  }

  /* ===== Đăng ký module ===== */
  (window.LSTP_MODULES = window.LSTP_MODULES || []).push({
    name: 'thaigiao',
    screens(a) {
      api = a;
      return {
        thaigiao: { title: 'Thai giáo', needs: 'mode', dayLive: true, render: renderG01, mount: mountG01 },
        letters: { title: 'Hộp thư', needs: 'mode', dayLive: true, render: renderG02, mount: mountG02 }
      };
    },
    init(a) { api = a; shimStore(a.S, a.U); },
    onModeChange() { if (api) api.state.tg = null; },     // đổi cách dùng / đăng xuất: bỏ chữ đang viết dở trong bộ nhớ
    homeTiles: () => [
      { go: 'thaigiao', icon: '💌', label: 'Thai giáo', sub: 'Một việc nhỏ cùng con', order: 20 },
      { go: 'letters', icon: '📖', label: 'Hộp thư gửi con', sub: '', order: 50 }
    ]
  });
})();
