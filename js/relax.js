/* =========================================================
   Mẹ Bầu An Yên – js/relax.js · module Thư giãn & tâm lý
   Chủ: FE-3 Thư giãn
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 4.3, 9; UX T01–T05, T08, T09, L01, L02;
           PRD 3.5, 3.6, 9.1, 9.7, 9.10, AC-19…57, 101, 135; chữ nguyên văn PRD Phụ lục A.3–A.6, A.14, A.15, A.22b.
   Màn: pause5 (T01), checkin (T02), result (T03), library (T04), player (T05 + lớp L01 "Mình thấy khó chịu",
   L02 "Trở về thở tự nhiên"), checkout (T08), done (T09).
   Trạng thái chỉ ghi vào api.state.relax. Dữ liệu bài, cảm xúc, nhãn đọc từ data.js (FE-2); luật an toàn và gợi ý
   từ api.safetyGate / engine.js (FE-2); lưu qua S.checkins; thói quen "Thở / ngân" qua api.markHabit('breath','a')
   ở Check-out (AC-101). Không Web Speech. Mọi chuỗi không phải hằng qua esc().
   ========================================================= */
(() => {
  'use strict';

  /* ===== Chữ dự phòng (nguyên văn PRD A.4) khi data.js thiếu mục ===== */
  const FB_TENSION = ['Rất nhẹ nhõm', 'Nhẹ nhõm', 'Khá thả lỏng', 'Hơi căng', 'Căng nhẹ', 'Căng vừa', 'Khá căng', 'Căng nhiều', 'Rất căng', 'Cực kỳ căng', 'Căng nhất'];
  const FB_FITS = [{ code: 'fit', label: 'Phù hợp' }, { code: 'unfit', label: 'Không phù hợp' }, { code: 'worse', label: 'Khó chịu hơn' }, { code: 'unsure', label: 'Chưa chắc' }];
  const FB_UNWELL = [
    { code: 'dizzy', label: 'Chóng mặt, hoa mắt', action: 'rest' },
    { code: 'breathless', label: 'Hụt hơi', action: 'rest' },
    { code: 'contractions', label: 'Bụng gò cứng', action: 'see_doctor', signs: ['contractions'] },
    { code: 'pain', label: 'Đau bụng', action: 'see_doctor', signs: ['pain'] },
    { code: 'bleeding', label: 'Ra máu hoặc ra nước', action: 'see_doctor', signs: ['bleeding', 'fluid'] },
    { code: 'strange', label: 'Thấy lạ trong người', action: 'rest' },
    { code: 'unfit', label: 'Chỉ thấy không hợp bài này', action: 'change' }
  ];
  const FB_POSTURE = {
    card: 'Chị ngồi tựa lưng thoải mái, hoặc nằm nghiêng bên trái, kê một chiếc gối giữa hai đầu gối. Khi bụng đã lớn, nhất là 3 tháng cuối, chị tránh nằm ngửa lâu nhé.',
    bigBellyFromWeek: 28,
    bigBelly: 'Bụng đã lớn rồi, chị tránh nằm ngửa lâu nhé. Nằm nghiêng bên trái là dễ chịu nhất.',
    safetyLine: 'Thấy chóng mặt, hụt hơi, bụng gò cứng hay đau bụng, chị dừng ngay và bấm "Mình thấy khó chịu" nhé.'
  };
  const GROUP_OF = { breath46: 'breath', bellyBreath: 'breath', hum: 'breath', pause5: 'present', grounding: 'present', release: 'present', calmAudio: 'listen', music: 'listen' };
  const FB_GROUPS = [{ code: 'breath', label: 'Thở và ngân' }, { code: 'present', label: 'Về với lúc này' }, { code: 'listen', label: 'Nghe' }];
  const EMPTY_LIB = 'Thư viện đang chờ duyệt nội dung. Trong lúc chờ, chị cứ thở theo nhịp tự nhiên của mình nhé.';
  const UNWELL_LINE = 'Có vẻ trong người chị đang không khỏe. Chị nghỉ một chút, nằm nghiêng bên trái, uống vài ngụm nước. Không đỡ thì chị đi khám nhé.';
  const REST_MSG = 'Chị nghỉ thêm vài phút, uống vài ngụm nước. Nằm nghiêng bên trái nếu được. Không đỡ thì nhờ người nhà đưa đi khám nhé.';
  const CHANGE_MSG = 'Mỗi người hợp một kiểu. Mình đổi bài khác nhé.';
  const WORSE_MSG = 'Cảm ơn chị đã nói ra. Mình dừng ở đây nhé. Chị thở tự nhiên, nghỉ một chút. Trong người thấy lạ thì chị đi khám nhé.';

  const freshCheckin = () => ({ emotions: [], tension: null, optOut: false, text: '', contexts: [], labelsEdited: false, minutes: null, piiShownFor: null });
  const freshSession = () => ({ exercise: null, recId: null, habitMarked: false, after: null, afterOptOut: false, fit: null });
  const fresh = () => ({ checkin: freshCheckin(), gate: null, rec: null, attempt: 0, selfHarm: false, session: freshSession(), finished: false });

  function screens(api) {
    const C = api.C || {}, S = api.S || {}, esc = api.esc, lc = api.lifecycle;
    const D = () => api.D || window.LSTP_DATA || {};
    const E = () => api.E || window.LSTP_ENGINE || {};
    const P = () => api.P || window.LSTP_PLAYERS || {};
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const st = () => { if (!api.state.relax) api.state.relax = fresh(); return api.state.relax; };
    const list = (v, fb) => (Array.isArray(v) && v.length ? v : fb);
    const params = o => `data-params="${esc(JSON.stringify(o))}"`;
    const draft = item => (typeof api.draftLine === 'function' ? api.draftLine(item)
      : (C.ALLOW_DRAFT_CONTENT !== false && (!item || item.status !== 'approved') ? '<p class="draft-note fine">Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt. App không thay cho việc khám thai, không chẩn đoán hay điều trị.</p>' : ''));

    /* ===== Bài tập: đọc từ D.EXERCISES (object theo id hoặc mảng) ===== */
    function exMap() {
      const src = D().EXERCISES;
      const out = {};
      if (Array.isArray(src)) src.forEach(x => { if (x && x.id) out[x.id] = x; });
      else if (src && typeof src === 'object') Object.keys(src).forEach(id => { const x = src[id]; if (x) out[id] = x.id ? x : Object.assign({ id }, x); });
      return out;
    }
    const playerName = ex => (ex && P()[ex.player] && typeof P()[ex.player].mount === 'function' ? ex.player
      : ex && P()[ex.type] && typeof P()[ex.type].mount === 'function' ? ex.type : null);
    // Cùng luật với engine (UX T04): không bài nín thở, có trình phát, bản nháp chỉ khi ALLOW_DRAFT_CONTENT
    function allowed(ex) {
      if (!ex || ex.holdsBreath || ex.enabled === false || !playerName(ex)) return false;
      const e = E();
      if (typeof e.allowed === 'function') { try { return !!e.allowed(ex.id); } catch (err) { return false; } }
      return C.ALLOW_DRAFT_CONTENT !== false || ex.status === 'approved';
    }
    function libraryList() {
      const m = exMap();
      // G-6: phiên có nhóm mất con → thư viện cũng không hiện bài "cùng con" (cùng luật engine library({noBaby}))
      const nb = noBaby();
      let ids = null;
      try { if (typeof E().library === 'function') ids = E().library({ noBaby: nb }); } catch (e) { ids = null; }
      if (!Array.isArray(ids)) ids = list(D().LIBRARY_ORDER, Object.keys(m));
      return ids.map(id => m[id]).filter(allowed).filter(ex => !(nb && ex.withBaby));
    }
    const findEx = id => { const ex = exMap()[id]; return allowed(ex) ? ex : null; };
    function fmtMin(ex) {
      const lo = Math.max(1, Math.ceil(+ex.min || 1)), hi = Math.max(lo, Math.round(+ex.max || lo));
      return lo === hi ? `${hi} phút` : `${lo}–${hi} phút`;
    }
    const labels = () => list(D().TENSION_LABELS, FB_TENSION);
    const tLabel = t => labels()[t] || '';

    /* ===== Capybara theo mức căng: căng 0 → ảnh mức 10 (vui nhất), căng 10 → mức 1 ===== */
    const EMO_T = ['😌', '😌', '🙂', '🙂', '😐', '😐', '😕', '😟', '😟', '😣', '😣'];
    function capyFor(t, alt = '') {
      if (typeof api.capy === 'function') return api.capy(t == null ? 6 : Math.max(1, 10 - t), { alt, cls: 'rx-capy-img' });
      return `<span class="rx-capy-emoji"${alt ? ` role="img" aria-label="${esc(alt)}"` : ' aria-hidden="true"'}>${t == null ? '🙂' : EMO_T[t]}</span>`;
    }

    /* ===== Thanh mức căng dùng chung cho Check-in và Check-out ===== */
    function sliderHTML(id, value, optOut, title) {
      const has = value != null && !optOut;
      return `<div class="rx-tension">
        <div class="rx-capy" id="${id}-capy">${capyFor(has ? value : null, has ? `Capybara mức ${value}: ${tLabel(value)}` : '')}</div>
        <p class="rx-tension-val" id="${id}-val" aria-live="polite">${has ? `${value} · ${esc(tLabel(value))}` : optOut ? 'Chị chọn không trả lời.' : 'Chưa chọn, chị kéo thanh nếu muốn nhé.'}</p>
        <input type="range" class="rx-range" id="${id}" min="0" max="10" step="1" value="${has ? value : 5}" aria-label="${esc(title)}"
          aria-valuetext="${has ? esc(value + ' · ' + tLabel(value)) : 'Chưa chọn'}" data-unset="${!has}"${optOut ? ' disabled aria-describedby="' + id + '-why"' : ''}>
        <div class="rx-range-ends" aria-hidden="true"><span>${esc(labels()[0])}</span><span>${esc(labels()[10])}</span></div>
        <button type="button" class="rx-chip" id="${id}-opt" aria-pressed="${!!optOut}">Không muốn trả lời</button>
        <p class="fine" id="${id}-why"${optOut ? '' : ' hidden'}>Thanh đang tắt vì chị chọn không trả lời. Chạm lại nút trên để bật.</p>
      </div>`;
    }
    function bindSlider(root, id, get, set) {
      const r = $('#' + id, root), opt = $('#' + id + '-opt', root);
      const paint = () => {
        const { value, optOut } = get();
        const has = value != null && !optOut;
        r.disabled = !!optOut;
        r.dataset.unset = String(!has);
        if (optOut) r.setAttribute('aria-describedby', id + '-why'); else r.removeAttribute('aria-describedby');
        r.setAttribute('aria-valuetext', has ? value + ' · ' + tLabel(value) : 'Chưa chọn');
        $('#' + id + '-val', root).textContent = has ? `${value} · ${tLabel(value)}` : optOut ? 'Chị chọn không trả lời.' : 'Chưa chọn, chị kéo thanh nếu muốn nhé.';
        $('#' + id + '-capy', root).innerHTML = capyFor(has ? value : null, has ? `Capybara mức ${value}: ${tLabel(value)}` : '');
        $('#' + id + '-why', root).hidden = !optOut;
        opt.setAttribute('aria-pressed', String(!!optOut));
      };
      const onVal = () => { set({ value: +r.value, optOut: false }); paint(); };
      lc.on(r, 'input', onVal);
      lc.on(r, 'change', onVal);
      lc.on(opt, 'click', () => { const o = !get().optOut; set({ value: o ? null : get().value, optOut: o }); paint(); });
    }
    // Chip aria-pressed: multi = chọn nhiều; một = chạm lại để bỏ
    const chipHTML = (name, items, isOn) => items.map(it =>
      `<button type="button" class="rx-chip" data-${name}="${esc(it.code)}" aria-pressed="${!!isOn(it.code)}">${esc(it.label)}</button>`).join('');

    /* ===== Cổng an toàn (PRD 9.1): tự hại → dấu hiệu nguy hiểm → thông tin nhận diện ===== */
    function gate(text, ck) {
      const ctx = { tension: ck.optOut ? null : ck.tension, emotions: ck.emotions, from: 'checkin' };
      if (typeof api.safetyGate === 'function') return api.safetyGate(text, ctx);
      const e = E();
      let flags = {};
      try { flags = typeof e.safetyCheck === 'function' ? e.safetyCheck(Object.assign({ text }, ctx)) || {} : {}; } catch (err) { flags = {}; }
      const signs = Array.isArray(flags.obSigns) ? flags.obSigns : [];
      if (flags.selfHarm) return { route: 'urgent', hits: signs, flags };
      if (signs.length) return { route: 'see_doctor', hits: signs, flags };
      let pii = [];
      try { pii = text.trim() && typeof e.detectPII === 'function' ? e.detectPII(text) || [] : []; } catch (err) { pii = []; }
      if (pii.length) return { route: 'pii', hits: pii, flags };
      return { route: 'ok', hits: [], flags };
    }

    /* ===== Gợi ý (PRD 9.7, engine của FE-2) ===== */
    function computeRec(attempt = 0) {
      const s = st(), ck = s.checkin;
      const input = { text: ck.text, tension: ck.optOut ? null : ck.tension, emotions: ck.emotions, contexts: ck.contexts, labelsEdited: ck.labelsEdited, minutes: ck.minutes };
      let r = null;
      try { r = typeof E().recommend === 'function' ? E().recommend(input, attempt) : null; } catch (e) { r = null; }
      const flags = (s.gate && s.gate.flags) || {};
      if (!r || typeof r !== 'object') r = { suggestions: [], summary: '', askHuman: !!flags.human, unwell: !!flags.physical, noBabyInvites: !!flags.loss };
      const m = exMap();
      r.suggestions = (Array.isArray(r.suggestions) ? r.suggestions : []).filter(x => x && allowed(m[x.exercise_id]))
        // Lưới an toàn AC-36: phiên có nhóm mất con thì không gợi ý bài "cùng con"
        .filter(x => !(r.noBabyInvites && m[x.exercise_id].withBaby)).slice(0, 2);
      s.rec = r; s.attempt = attempt;
      return r;
    }
    const summaryText = r => {
      if (r && typeof r.summary === 'string' && r.summary) return r.summary;
      const sm = D().SUMMARIES || {};
      return sm[r && r.summaryKey] || sm.default || 'Cảm ơn chị đã dừng lại lắng nghe mình.';
    };
    const noBaby = () => { const s = st(); return !!((s.rec && s.rec.noBabyInvites) || (s.gate && s.gate.flags && s.gate.flags.loss)); };

    /* ===== Tư thế (A.6, AC-37, AC-135): từ 28 tuần câu tránh nằm ngửa lâu lên đầu, in đậm ===== */
    function postureHTML() {
      const PO = Object.assign({}, FB_POSTURE, D().POSTURE || {});
      let g = null;
      try { g = typeof api.gestAge === 'function' ? api.gestAge() : null; } catch (e) { g = null; }
      const big = !!(g && Number.isFinite(g.totalDays) && g.totalDays >= (+PO.bigBellyFromWeek || 28) * 7);
      const body = big ? String(PO.card).replace(/\s*Khi bụng đã lớn[^.]*\.\s*$/u, '') : PO.card;
      return `<div class="rx-posture" role="note">
          <svg viewBox="0 0 120 56" class="rx-posture-art" aria-hidden="true" focusable="false">
            <rect x="4" y="40" width="112" height="10" rx="5" class="bed"/>
            <ellipse cx="16" cy="32" rx="12" ry="7" class="pillow"/>
            <circle cx="20" cy="26" r="8" class="skin"/>
            <path d="M28 26 Q52 14 74 28 Q90 34 104 34 L104 40 L30 40 Z" class="dress"/>
            <ellipse cx="56" cy="34" rx="15" ry="9" class="dress"/>
            <ellipse cx="94" cy="37" rx="6" ry="4" class="pillow"/>
          </svg>
          <div>${big ? `<p class="rx-posture-big"><b>${esc(PO.bigBelly)}</b></p>` : ''}<p>${esc(body)}</p></div>
        </div>
        <p class="rx-safety-line"><span aria-hidden="true">⚠︎ </span>${esc(PO.safetyLine)}</p>`;
    }

    /* =========================== T01 – Dừng 5 giây =========================== */
    const pause5 = {
      title: 'Thư giãn',
      needs: 'mode',
      render: () => `<section class="card rx rx-pause">
          <div class="pause-orb rx-pause-orb" aria-hidden="true"><span>✋</span></div>
          <p class="rx-lead">Chị thả lỏng vai, đặt tay lên bụng nếu muốn, và tự hỏi:</p>
          <h1>Lúc này mình đang thế nào?</h1>
          <div class="rx-row" aria-live="polite"><button type="button" class="btn btn-secondary" id="p5btn" data-go="checkin">Bỏ qua</button></div>
        </section>`,
      mount(root) {
        // Lượt mới khi vào lại từ Trang chính sau một lượt đã xong
        if (!api.state.relax || api.state.relax.finished) api.state.relax = fresh();
        // Sau 5 giây: "Tiếp tục ›" thành nút chính, không cướp focus (AC-19)
        lc.later(() => {
          const b = $('#p5btn', root);
          if (b) { b.textContent = 'Tiếp tục ›'; b.classList.remove('btn-secondary'); b.classList.add('btn-primary'); }
        }, 5000);
      }
    };

    /* =========================== T02 – Check-in =========================== */
    const checkin = {
      title: 'Check-in',
      needs: 'mode',
      render: () => {
        const ck = st().checkin;
        const emos = list(D().EMOTIONS, []);
        const base = (C.ASSET_BASE || 'assets/') + 'capy/';
        const ctxs = list(D().CONTEXTS, []);
        const mins = list(D().MINUTES, [1, 3, 5, 10, 15]);
        const none = typeof api.mode === 'function' && api.mode() === 'none';
        return `<section class="card rx rx-checkin text-left">
          <h1>Lúc này chị thấy thế nào?</h1>

          <h2 class="section-title" id="ck-emo-t"><span class="step-num" aria-hidden="true">1</span> Chị giống bé capybara nào?</h2>
          <p class="section-hint">Chạm chọn một hoặc vài bé capybara giống chị nhất. Không chọn cũng được.</p>
          <div class="rx-capy-grid" role="group" aria-labelledby="ck-emo-t">
            ${emos.map(e => `<button type="button" class="capy-card rx-emo" data-emo="${esc(e.code)}" aria-pressed="${ck.emotions.includes(e.code)}">
                <span class="rx-emo-pic">${e.img ? `<img src="${esc(base + e.img)}" alt="" aria-hidden="true" data-fallback="${esc(e.emoji || '🙂')}" loading="lazy" decoding="async">` : `<span class="rx-emo-emoji" aria-hidden="true">${esc(e.emoji || '🙂')}</span>`}</span>
                <span class="rx-emo-name">${esc(e.label)}</span><span class="check-mark-badge" aria-hidden="true">✓</span></button>`).join('')}
          </div>
          <hr class="section-divider">

          <h2 class="section-title" id="ck-t-t"><span class="step-num" aria-hidden="true">2</span> Chị đang căng ở mức nào?</h2>
          ${sliderHTML('ck-t', ck.tension, ck.optOut, 'Chị đang căng ở mức nào?')}
          <p class="fine">Tự đánh giá, không phải thang chẩn đoán.</p>
          <hr class="section-divider">

          <h2 class="section-title"><span class="step-num" aria-hidden="true">3</span> <label for="ck-text">Chị muốn kể thêm không? (không bắt buộc)</label></h2>
          <textarea id="ck-text" class="rx-text" rows="4" maxlength="1000" placeholder="Sáng nay đi khám về, mình hơi lo…" aria-describedby="ck-privacy">${esc(ck.text)}</textarea>
          <p class="fine" id="ck-privacy">🔒 Không ghi họ tên, số điện thoại, số căn cước hay mã hồ sơ khám thai nhé.</p>
          ${none ? '<p class="fine">Chế độ không lưu: đóng trang là mất.</p>' : ''}
          <div id="ck-pii"></div>
          <hr class="section-divider">

          <h2 class="section-title" id="ck-c-t"><span class="step-num" aria-hidden="true">4</span> Điều gì đang làm chị bận lòng?</h2>
          <div class="rx-chips" role="group" aria-labelledby="ck-c-t">${chipHTML('ctx', ctxs, c => ck.contexts.includes(c))}</div>

          <h2 class="section-title" id="ck-m-t"><span class="step-num" aria-hidden="true">5</span> Chị có bao nhiêu phút?</h2>
          <div class="rx-chips" role="group" aria-labelledby="ck-m-t">${chipHTML('min', mins.map(m => ({ code: String(m), label: m + ' phút' })), c => +c === ck.minutes)}</div>

          <div class="rx-actions">
            <button type="button" class="btn btn-primary btn-block" data-act="ckNext">Xem gợi ý ›</button>
            <button type="button" class="rx-link" data-act="ckLib">Vào thẳng thư viện</button>
          </div>
        </section>`;
      },
      mount(root) {
        const s = st(), ck = s.checkin;
        const ta = $('#ck-text', root);
        lc.on(root, 'click', e => {
          const emo = e.target.closest('[data-emo]');
          if (emo) {
            const c = emo.dataset.emo;
            ck.emotions = ck.emotions.includes(c) ? ck.emotions.filter(x => x !== c) : ck.emotions.concat(c).slice(0, 8);
            emo.setAttribute('aria-pressed', String(ck.emotions.includes(c)));
            emo.classList.toggle('selected', ck.emotions.includes(c));
            return;
          }
          const cx = e.target.closest('[data-ctx]');
          if (cx) {
            const c = cx.dataset.ctx;
            ck.contexts = ck.contexts.includes(c) ? ck.contexts.filter(x => x !== c) : ck.contexts.concat(c);
            ck.labelsEdited = true;
            cx.setAttribute('aria-pressed', String(ck.contexts.includes(c)));
            return;
          }
          const mn = e.target.closest('[data-min]');
          if (mn) {
            const v = +mn.dataset.min;
            ck.minutes = ck.minutes === v ? null : v;
            $$('[data-min]', root).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.min === ck.minutes)));
          }
        });
        $$('[data-emo]', root).forEach(b => b.classList.toggle('selected', ck.emotions.includes(b.dataset.emo)));
        bindSlider(root, 'ck-t', () => ({ value: ck.tension, optOut: ck.optOut }), v => { ck.tension = v.value; ck.optOut = v.optOut; });
        lc.on(ta, 'input', () => { ck.text = ta.value; });

        const proceed = target => {
          ck.text = ta.value;
          const g = gate(ck.text, ck) || { route: 'ok', hits: [], flags: {} };
          s.gate = g;
          s.selfHarm = g.route === 'urgent';
          computeRec(0);
          const signs = (g.flags && Array.isArray(g.flags.obSigns)) ? g.flags.obSigns : [];
          // R-06: chị viết con cử động ít / khác mọi ngày → lượt đếm đang dở (nếu có) chốt đỏ ngay, rồi mới mở trang khẩn.
          // Hàm của mục đếm (FE-4); chưa có thì bỏ qua. silent: chỉ chốt và lưu, màn do module này mở.
          if (signs.includes('no_movement') || (g.flags && g.flags.motherReported)) {
            try { if (typeof api.kickReportReduced === 'function') api.kickReportReduced({ from: 'checkin', silent: true }); } catch (e) { /* bỏ qua */ }
          }
          if (g.route === 'urgent') { api.go('urgent', { signs, from: 'checkin', back: { name: target }, cont: { name: target } }); return; }
          if (g.route === 'see_doctor') { api.openUrgentOB({ signs, from: 'checkin', back: { name: target } }); return; }
          if (g.route === 'pii' && ck.piiShownFor !== ck.text) {
            ck.piiShownFor = ck.text;
            showPii(g.hits || [], target);
            return;
          }
          api.go(target);
        };
        function showPii(hits, target) {
          const box = $('#ck-pii', root);
          const handlers = {
            onEdit: () => {
              ta.focus();
              const h = hits.find(x => x && x.text && ta.value.includes(x.text));
              if (h) { const i = ta.value.indexOf(h.text); ta.setSelectionRange(i, i + h.text.length); }
            },
            onDrop: () => {
              ta.value = typeof api.dropHits === 'function' ? api.dropHits(ta.value, hits)
                : hits.reduce((t, h) => (h && h.text ? t.split(h.text).join('') : t), ta.value).replace(/[ \t]{2,}/g, ' ').trim();
              ck.text = ta.value; ck.piiShownFor = null;
              api.toast('Đã bỏ các đoạn đó.');
              ta.focus();
            },
            onKeep: () => { ck.piiShownFor = ta.value; api.go(target); }
          };
          if (typeof api.piiPanel === 'function') api.piiPanel(box, hits, handlers);
          else {
            box.innerHTML = `<div class="pii-panel" role="alert"><p><b>Có thể có thông tin nhận diện:</b></p>
              <ul>${hits.map(h => `<li><mark>${esc(h.text)}</mark> – ${esc(h.why)}</li>`).join('')}</ul>
              <p>Chị sửa lại nếu cần, rồi bấm lần nữa nhé.</p><p class="fine">Bộ lọc không thể phát hiện mọi thông tin.</p>
              <div class="rx-row"><button type="button" class="btn btn-secondary" data-pii="edit">Sửa lại</button>
              <button type="button" class="btn btn-secondary" data-pii="drop">Bỏ đoạn đó</button>
              <button type="button" class="btn btn-ghost" data-pii="keep">Vẫn giữ</button></div></div>`;
            lc.on(box, 'click', e => {
              const b = e.target.closest('[data-pii]'); if (!b) return;
              const k = b.dataset.pii; box.innerHTML = '';
              (k === 'edit' ? handlers.onEdit : k === 'drop' ? handlers.onDrop : handlers.onKeep)();
            });
          }
          const panel = box.firstElementChild;
          if (panel) { panel.setAttribute('tabindex', '-1'); panel.focus({ preventScroll: true }); panel.scrollIntoView({ block: 'center' }); }
        }
        api.screenActions({ ckNext: () => proceed('result'), ckLib: () => proceed('library') });
      }
    };

    /* =========================== T03 – Gợi ý =========================== */
    const result = {
      title: 'Gợi ý',
      needs: 'mode',
      render: () => {
        const s = st();
        const r = s.rec || computeRec(0);
        const m = exMap();
        const human = s.selfHarm || !!r.askHuman || !!(s.gate && s.gate.flags && s.gate.flags.human);
        const cards = r.suggestions.map((x, i) => {
          const ex = m[x.exercise_id];
          const reason = typeof x.reason === 'string' && x.reason ? x.reason : ex.goal;
          return `<article class="rx-sugg">
              <h2 class="rx-h3"><span aria-hidden="true">${esc(ex.icon || '')}</span> ${esc(ex.title)} <span class="rx-meta">· ${esc(fmtMin(ex))}</span></h2>
              <p>${esc(reason)}</p>
              <button type="button" class="btn ${i === 0 ? 'btn-primary' : 'btn-secondary'} btn-block" data-go="player" ${params({ id: ex.id })}>Bắt đầu ›</button>
            </article>`;
        }).join('');
        return `<section class="card rx rx-result text-left">
          <h1>Mình thử cùng nhau nhé</h1>
          <p class="rx-lead">${esc(summaryText(r))}</p>
          ${human ? (typeof api.humanCard === 'function' ? api.humanCard() : '') : ''}
          ${r.unwell ? `<p class="rx-warm">${esc(UNWELL_LINE)}</p>` : ''}
          ${cards ? `${cards}
            <button type="button" class="btn btn-secondary btn-block" data-act="reSwap">Đổi gợi ý</button>
            <p class="rx-center"><button type="button" class="rx-link" data-go="library">Xem cả thư viện</button></p>`
            : `<p>${esc(EMPTY_LIB)}</p><button type="button" class="btn btn-primary btn-block" data-act="home">Về trang chính</button>`}
          ${draft(r.suggestions[0] ? m[r.suggestions[0].exercise_id] : { status: 'draft' })}
        </section>`;
      },
      mount() {
        api.screenActions({
          reSwap: () => { computeRec((st().attempt || 0) + 1); api.rerender(); api.toast('Đã đổi sang gợi ý khác.'); }
        });
      }
    };

    /* =========================== T04 – Thư viện =========================== */
    const library = {
      title: 'Thư viện',
      needs: 'mode',
      render: () => {
        const items = libraryList();
        const groups = list(D().LIBRARY_GROUPS, FB_GROUPS);
        const grp = ex => ex.group || GROUP_OF[playerName(ex)] || 'present';
        const card = ex => `<button type="button" class="rx-excard" data-go="player" ${params({ id: ex.id })}>
            <span class="rx-ex-title"><span aria-hidden="true">${esc(ex.icon || '')}</span> ${esc(ex.title)}</span>
            <span class="rx-ex-goal">${esc(ex.goal || '')}</span>
            <span class="rx-ex-meta">${esc(fmtMin(ex))}${ex.posture ? ' · 🛋️ Ngồi tựa hoặc nằm nghiêng' : ''}</span>
            <span class="rx-ex-arrow" aria-hidden="true">›</span></button>`;
        const body = items.length ? groups.map(g => {
          const inG = items.filter(ex => grp(ex) === g.code);
          return inG.length ? `<h2 class="rx-h2">${esc(g.label)}</h2><div class="rx-exlist">${inG.map(card).join('')}</div>` : '';
        }).join('') + (() => { const rest = items.filter(ex => !groups.some(g => g.code === grp(ex))); return rest.length ? `<div class="rx-exlist">${rest.map(card).join('')}</div>` : ''; })()
          : `<p>${esc(EMPTY_LIB)}</p><button type="button" class="btn btn-primary btn-block" data-act="home">Về trang chính</button>`;
        return `<section class="card rx rx-library text-left">
          <h1>Thư viện</h1>
          ${draft(items.find(x => x.status !== 'approved') || items[0] || { status: 'draft' })}
          ${body}
        </section>`;
      }
    };

    /* =========================== T05 – Trình phát =========================== */
    const LISTEN = ['calmAudio', 'music'];
    const player = {
      needs: 'mode',
      get title() {
        const top = api.state.stack && api.state.stack[api.state.stack.length - 1];
        const ex = top && top.params ? findEx(top.params.id) : null;
        return ex ? ex.title : 'Bài tập';
      },
      render: p => {
        const ex = findEx(p && p.id);
        if (!ex) {
          return `<section class="card rx"><h1>Không tìm thấy bài này</h1>
            <p>Bài này chưa có trong thư viện.</p>
            <button type="button" class="btn btn-primary btn-block" data-go="library">Mở thư viện</button></section>`;
        }
        const pl = P()[playerName(ex)];
        const unwellChips = list(D().UNWELL_CHIPS, FB_UNWELL);
        return `<section class="card rx rx-player text-left" data-player="${esc(playerName(ex))}">
            <header class="rx-player-head">
              <h1><span aria-hidden="true">${esc(ex.icon || '')}</span> ${esc(ex.title)}</h1>
              <p class="rx-lead">${esc(ex.goal || '')}</p>
            </header>
            ${ex.posture ? postureHTML() : ''}
            ${ex.safety && !LISTEN.includes(playerName(ex)) ? `<p class="rx-safety-line"><b>An toàn:</b> ${esc(ex.safety)}</p>` : ''}
            <div class="rx-player-body" id="player-body">${pl.render(ex, api)}</div>
            ${draft(ex)}
            <footer class="rx-foot">
              <div class="rx-foot-row">
                <button type="button" class="btn btn-secondary" data-act="unwell" id="btn-unwell"><span aria-hidden="true">✋ </span>Mình thấy khó chịu</button>
                <button type="button" class="btn btn-secondary" data-act="finishExercise">Kết thúc → Check-out</button>
              </div>
              <button type="button" class="btn btn-ghost btn-block" data-act="natural" id="btn-natural">🍃 Trở về thở tự nhiên</button>
            </footer>
          </section>
          <div class="rx-layer" id="l01" role="dialog" aria-modal="true" aria-labelledby="l01-t" hidden>
            <div class="rx-layer-card text-left">
              <h2 id="l01-t" data-layer-title>Mình dừng lại nhé</h2>
              <p>Bài đã tạm dừng. Chị ngồi xuống, hoặc nằm nghiêng bên trái. Thở theo nhịp tự nhiên.</p>
              <p class="rx-label" id="l01-q">Chị đang thấy thế nào? (chọn nếu muốn)</p>
              <div class="rx-chips" role="group" aria-labelledby="l01-q">${chipHTML('unwell', unwellChips, () => false)}</div>
              <div class="rx-msg" id="l01-msg" aria-live="polite"></div>
              <div class="rx-col">
                <button type="button" class="btn btn-primary btn-block" data-act="finishExercise">Kết thúc → Check-out</button>
                <button type="button" class="btn btn-secondary btn-block" data-go="signs">Xem dấu hiệu cần đi khám</button>
                <button type="button" class="btn btn-secondary btn-block" data-go="support">Hỗ trợ</button>
              </div>
              <div class="rx-row" id="l01-change">
                <button type="button" class="btn btn-secondary" data-act="unwellSwap">Đổi bài khác</button>
                <button type="button" class="rx-link" data-act="unwellBack">Quay lại bài</button>
              </div>
            </div>
          </div>
          <div class="rx-layer" id="l02" role="dialog" aria-modal="true" aria-labelledby="l02-t" hidden>
            <div class="rx-layer-card rx-natural">
              <div class="rx-natural-dot" aria-hidden="true"></div>
              <h2 id="l02-t" data-layer-title>Trở về thở tự nhiên</h2>
              <p>Không cần đếm. Để hơi thở tự đi theo nhịp của nó. Nếu vẫn thấy không ổn, chị dừng lại và tìm người hỗ trợ nhé.</p>
              <div class="rx-col">
                <button type="button" class="btn btn-primary btn-block" data-act="naturalBack">Quay lại bài</button>
                <button type="button" class="btn btn-secondary btn-block" data-go="support">Hỗ trợ</button>
                <button type="button" class="btn btn-secondary btn-block" data-act="finishExercise">Kết thúc → Check-out</button>
              </div>
            </div>
          </div>`;
      },
      mount(root, p) {
        const ex = findEx(p && p.id);
        if (!ex) return;
        const s = st();
        if (s.finished) { api.state.relax = fresh(); }
        const ss = st();
        if (ss.session.exercise !== ex.id) { ss.session = freshSession(); ss.session.exercise = ex.id; }
        const PL = P();
        // Rời màn bằng bất kỳ cách nào: mọi đồng hồ dừng, âm nhỏ dần ≤ 3 s (AC-48)
        lc.onCleanup(() => { try { PL.stopAll(); } catch (e) { /* bỏ qua */ } });
        const papi = Object.assign({}, api, { finish: () => api.go('checkout') });
        let pauseFn = null;
        try { pauseFn = PL[playerName(ex)].mount($('#player-body', root), ex, papi) || null; } catch (e) { pauseFn = null; }
        const l01 = $('#l01', root), l02 = $('#l02', root);
        let close01 = null, close02 = null;
        const setChange = show => { $('#l01-change', l01).hidden = !show; };
        api.screenActions({
          unwell: () => {
            // ≤ 300 ms: dừng đồng hồ ngay (đồng bộ), âm nhỏ dần ≤ 3 s (AC-39)
            PL.stopAll();
            $$('[data-unwell]', l01).forEach(b => b.setAttribute('aria-pressed', 'false'));
            $('#l01-msg', l01).textContent = '';
            setChange(true);
            close01 = PL.layer(api, l01, { returnTo: $('#btn-unwell', root) });
          },
          unwellBack: () => { if (close01) close01(); close01 = null; },
          unwellSwap: () => api.go('library'),
          natural: () => {
            if (pauseFn) { try { pauseFn(); } catch (e) { /* bỏ qua */ } }
            close02 = PL.layer(api, l02, { returnTo: $('#btn-natural', root), onEscape: () => { if (close02) close02(); close02 = null; } });
          },
          naturalBack: () => { if (close02) close02(); close02 = null; },
          finishExercise: () => api.go('checkout')
        });
        lc.on(l01, 'click', e => {
          const b = e.target.closest('[data-unwell]');
          if (!b) return;
          const chip = list(D().UNWELL_CHIPS, FB_UNWELL).find(c => c.code === b.dataset.unwell);
          if (!chip) return;
          if (chip.action === 'see_doctor') {
            // Bụng gò cứng / đau bụng / ra máu hoặc ra nước → trang khẩn chung ngay, không hỏi lại (AC-40)
            const signs = Array.isArray(chip.signs) ? chip.signs : [];
            // R-07: có lượt đếm dở thì chốt đỏ (danger_sign) trước, rồi mở trang khẩn như cũ (hàm của FE-4, chỉ chốt và lưu)
            try { if (typeof api.kickReportSigns === 'function') api.kickReportSigns({ from: 'player', signs, silent: true }); } catch (e) { /* bỏ qua */ }
            api.openUrgentOB({ signs, from: 'player' });
            return;
          }
          const on = b.getAttribute('aria-pressed') !== 'true';
          $$('[data-unwell]', l01).forEach(x => x.setAttribute('aria-pressed', String(on && x === b)));
          const msg = $('#l01-msg', l01);
          if (!on) { msg.textContent = ''; setChange(true); return; }
          if (chip.action === 'rest') { msg.textContent = REST_MSG; setChange(false); }      // AC-41: không "Quay lại bài"
          else { msg.textContent = CHANGE_MSG; setChange(true); }                            // AC-42
        });
      }
    };

    /* =========================== T08 – Check-out =========================== */
    const checkout = {
      title: 'Check-out',
      needs: 'mode',
      render: () => {
        const ss = st().session;
        const fits = list(D().FITS, FB_FITS);
        return `<section class="card rx rx-checkout text-left">
          <h1>Sau bài này, chị thấy thế nào?</h1>
          ${sliderHTML('co-t', ss.after, ss.afterOptOut, 'Sau bài này, chị căng ở mức nào?')}
          <p class="rx-label" id="co-fit-t">Bài này với chị:</p>
          <div class="rx-chips" role="group" aria-labelledby="co-fit-t">${chipHTML('fit', fits, c => c === ss.fit)}</div>
          <div id="co-worse" aria-live="polite">${ss.fit === 'worse' ? worseHTML() : ''}</div>
          <button type="button" class="btn btn-primary btn-block" data-act="coDone">Xong ›</button>
        </section>`;
      },
      mount(root) {
        const s = st(), ss = s.session, ck = s.checkin;
        // Tới Check-out: "Thở / ngân" hôm nay tự đánh dấu (AC-101); không đè dấu chị tự tick
        if (!ss.habitMarked) {
          ss.habitMarked = true;
          try { if (typeof api.markHabit === 'function') api.markHabit('breath', 'a'); } catch (e) { /* bỏ qua */ }
        }
        // Ghi lượt check-in (store tự quyết theo chế độ và đồng ý; "kể thêm" chỉ khi đồng ý lưu chữ tự viết)
        if (!ss.recId && S.checkins && typeof S.checkins.add === 'function') {
          const rec = {
            emotions: ck.emotions.slice(0, 8), before: ck.optOut ? null : ck.tension, after: null,
            exercise: ss.exercise || null, fit: null,
            contexts: (s.rec && Array.isArray(s.rec.contexts) ? s.rec.contexts : ck.contexts).slice(0, 12),
            minutes: ck.minutes || null
          };
          if (ck.text && ck.text.trim() && typeof api.canSave === 'function' && api.canSave('writing')) rec.note = ck.text.slice(0, 1000);
          try { const r = S.checkins.add(rec); ss.recId = r && r.id ? r.id : null; } catch (e) { ss.recId = null; }
        }
        bindSlider(root, 'co-t', () => ({ value: ss.after, optOut: ss.afterOptOut }), v => { ss.after = v.value; ss.afterOptOut = v.optOut; });
        lc.on(root, 'click', e => {
          const b = e.target.closest('[data-fit]');
          if (!b) return;
          ss.fit = ss.fit === b.dataset.fit ? null : b.dataset.fit;
          $$('[data-fit]', root).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.fit === ss.fit)));
          $('#co-worse', root).innerHTML = ss.fit === 'worse' ? worseHTML() : '';
        });
        api.screenActions({
          coDone: () => {
            if (ss.recId && S.checkins && typeof S.checkins.update === 'function') {
              try { S.checkins.update(ss.recId, { after: ss.afterOptOut ? null : ss.after, fit: ss.fit }); } catch (e) { /* bỏ qua */ }
            }
            s.finished = true;
            api.go('done', {}, { replace: true });
          }
        });
      }
    };
    function worseHTML() {
      return `<div class="rx-warm-box" role="note"><p>${esc(WORSE_MSG)}</p>
        <div class="rx-row"><button type="button" class="btn btn-secondary" data-go="signs">Xem dấu hiệu cần đi khám</button>
        <button type="button" class="btn btn-secondary" data-go="support">Hỗ trợ</button></div></div>`;
    }

    /* =========================== T09 – Hoàn tất (tĩnh, không pháo hoa) =========================== */
    const done = {
      title: 'Hoàn tất',
      needs: 'mode',
      render: () => {
        const s = st(), ck = s.checkin, ss = s.session;
        const before = ck.optOut ? null : ck.tension, after = ss.afterOptOut ? null : ss.after;
        // Capybara luôn hiện (AC-57): theo điểm sau, không có thì điểm trước, không có nữa thì ảnh trung tính.
        // Khối "Trước → Sau" chỉ hiện khi đủ cả hai điểm.
        const both = before != null && after != null;
        const hasTG = typeof api.hasScreen === 'function' ? api.hasScreen('thaigiao') : true;
        return `<section class="card rx rx-done">
          <svg class="success-checkmark rx-tick" viewBox="0 0 52 52" aria-hidden="true" focusable="false">
            <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
            <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
          <h1>Chị đã dành thời gian cho mình</h1>
          <div class="rx-capy rx-done-capy">${capyFor(after != null ? after : before, '')}</div>
          ${both ? `<div class="success-summary rx-ba">
              <span class="rx-ba-capy">${capyFor(before, `Trước: mức ${before}`)}</span>
              <span>Trước <b>${before}</b> → Sau <b>${after}</b></span>
              <span class="rx-ba-capy">${capyFor(after, `Sau: mức ${after}`)}</span>
            </div>` : ''}
          <p>Khác hay không khác đều ổn. Điều quan trọng là chị đã lắng nghe mình.</p>
          <p class="rx-mantra">Mẹ con mình cùng Bình An nhé.</p>
          <button type="button" class="btn btn-primary btn-block" data-act="home">Về trang chính</button>
          ${hasTG && !noBaby() ? '<p class="rx-center"><button type="button" class="rx-link" data-go="thaigiao">Hôm nay mẹ muốn kể gì với con không? ›</button></p>' : ''}
        </section>`;
      },
      mount() { st().finished = true; }
    };

    return { pause5, checkin, result, library, player, checkout, done };
  }

  (window.LSTP_MODULES = window.LSTP_MODULES || []).push({
    name: 'relax',
    screens,
    // Ô đầu tiên trên Trang chính (PRD A.25)
    homeTiles: () => [{ go: 'pause5', icon: '🌬️', label: 'Thư giãn', sub: 'Thở, ngân, nghe nhạc', order: 10 }],
    // Đổi chế độ / đăng xuất: bỏ lượt đang làm dở
    onModeChange: api => { if (api && api.state) api.state.relax = null; }
  });
})();
