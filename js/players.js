/* =========================================================
   Mẹ Bầu An Yên – js/players.js · window.LSTP_PLAYERS
   Chủ: FE-3 Thư giãn
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 9; UX T05a…T05h, L03; PRD 3.5, 9.10,
           AC-37…53, 110…114; lời dẫn nguyên văn PRD Phụ lục A.3, A.7…A.13.
   Kế thừa (chỉ đọc): apps/STOP-4P-Healthcare-Staff/js/players.js — thở theo nhịp, dừng 5 giây, grounding,
   PMR, âm thanh. Đã bỏ: thở hộp, 4-7-8, cổng nín thở, chip nhịp ×1,25, pha siết ở bụng/lưng/chân, giọng đọc.

   Interface: mỗi player là { render(ex, api) → HTML, mount(body, ex, api) → pause() }.
   `ex.player` (data.js của FE-2; dự phòng `ex.type`) chọn player: pause5 | breath46 | hum | bellyBreath | grounding |
   release | calmAudio | music. Chữ lấy từ ex (steps, lead, phases, zones, sounds, end…) nếu có; hằng ở đây là dự phòng
   chép nguyên văn PRD Phụ lục A. Lưới an toàn: chỉ nhận pha in/out, nhịp ≤ ×1, vùng releaseOnly không có câu siết.
   Player gọi api.finish() (relax.js truyền vào) hoặc vẽ nút data-act="finishExercise" để sang Check-out.
   Hàm chung: P.stopAll() — dừng đồng hồ của bài đang mở NGAY (đồng bộ) và nhỏ dần mọi âm ≤ 3 s (AC-39, 48);
   P.musicLinks(C) — lọc MUSIC_LINKS (AC-111); P.layer(api, el, opts) — lớp hộp thoại có inert + trả focus.
   Bài lỗi cũ STOP-4P đã tránh: không gắn data-act lên chính nút đang được bấm (T-05); chặn chạm đúp ở nút
   bước (N-03, e.detail > 1); bài theo nhịp tự tạm dừng khi ẩn tab (G-2 bài ngồi); lớp phủ có inert (G-06).
   ========================================================= */
window.LSTP_PLAYERS = (() => {
  'use strict';
  const SOUND = window.LSTP_SOUND;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mmss = sec => { const s = Math.max(0, Math.ceil(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const vibrate = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* bỏ qua */ } };
  const focusTo = el => { if (!el) return; el.setAttribute('tabindex', '-1'); try { el.focus({ preventScroll: false }); } catch (e) { /* bỏ qua */ } };
  const FINISH_BTN = '<button class="btn btn-primary rx-finish" data-act="finishExercise">Kết thúc → Check-out</button>';
  // Chữ trong data.js là hằng của FE-2, vẫn qua esc() cho chắc (dấu nháy trong 'ngân "ừmmm"' hiện đúng)
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const str = (v, fb) => (typeof v === 'string' && v.trim() ? v : fb);
  const arr = (v, fb) => (Array.isArray(v) && v.length ? v : fb);
  // Câu kết "Câu đầu. Phần sau" → tiêu đề + đoạn
  const splitEnd = t => { const i = t.indexOf('. '); return i > 0 ? [t.slice(0, i + 1), t.slice(i + 2)] : [t, '']; };

  /* ===== Bài đang mở: để P.stopAll() dừng được đồng hồ ngay ===== */
  let current = null;
  function register(api, halt) {
    const me = { halt };
    current = me;
    api.lifecycle.onCleanup(() => { if (current === me) current = null; });
  }
  function stopAll() {
    if (current) { try { current.halt(); } catch (e) { /* bỏ qua */ } }
    if (SOUND) SOUND.stopAll(2000);
  }
  // Bộ đếm giờ riêng của một bài (dọn được từng cái khi tạm dừng, dọn hết khi rời màn)
  function timers(api) {
    const ids = new Set();
    const t = {
      every(fn, ms) { const id = setInterval(fn, ms); ids.add(id); return id; },
      clear(id) { if (id != null) { clearInterval(id); ids.delete(id); } return null; },
      clearAll() { ids.forEach(id => clearInterval(id)); ids.clear(); }
    };
    api.lifecycle.onCleanup(() => t.clearAll());
    return t;
  }

  /* ===== Chip chọn một (aria-pressed) ===== */
  function chips(name, labelId, items, on) {
    return `<div class="rx-chips" role="group" aria-labelledby="${labelId}">${items.map(it =>
      `<button type="button" class="rx-chip" data-${name}="${it.v}" aria-pressed="${String(it.v) === String(on)}">${it.label}</button>`).join('')}</div>`;
  }
  function bindChips(body, name, onPick) {
    $$(`[data-${name}]`, body).forEach(b => b.addEventListener('click', () => {
      $$(`[data-${name}]`, body).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      onPick(b.dataset[name]);
    }));
  }

  /* ===== Lớp hộp thoại (L01, L02, L03): role=dialog, inert phía sau, Esc tùy lớp, trả focus ===== */
  function layer(api, el, opts = {}) {
    const opener = opts.opener || document.activeElement;
    const inerted = [];
    const mark = n => { if (n && !n.hasAttribute('inert')) { n.setAttribute('inert', ''); inerted.push(n); } };
    mark(document.getElementById('header'));
    for (let n = el; n && n.parentElement && n.id !== 'main' && n !== document.body; n = n.parentElement) {
      [...n.parentElement.children].forEach(sib => { if (sib !== n) mark(sib); });
    }
    el.hidden = false;
    focusTo(el.querySelector('[data-layer-title]') || el.querySelector('h2, h3'));
    let open = true;
    const onKey = e => { if (open && e.key === 'Escape' && typeof opts.onEscape === 'function') { e.preventDefault(); opts.onEscape(); } };
    document.addEventListener('keydown', onKey);
    function close(returnFocus = true) {
      if (!open) return;
      open = false;
      el.hidden = true;
      inerted.forEach(n => n.removeAttribute('inert'));
      document.removeEventListener('keydown', onKey);
      const back = opts.returnTo || opener;
      if (returnFocus && back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } }
    }
    api.lifecycle.onCleanup(() => close(false));
    return close;
  }

  /* ===== Lọc MUSIC_LINKS (AC-111): đủ trường, https:, host đúng danh sách, kind hợp lệ ===== */
  function musicLinks(C) {
    const hosts = new Set(((C && C.MUSIC_HOSTS) || []).map(h => String(h).trim().toLowerCase()).filter(Boolean));
    return ((C && C.MUSIC_LINKS) || []).filter(m => {
      if (!m || typeof m !== 'object') return false;
      if (!['title', 'url', 'kind', 'source', 'license'].every(k => typeof m[k] === 'string' && m[k].trim())) return false;
      if (!['audio', 'youtube', 'link'].includes(m.kind)) return false;
      try {
        const u = new URL(m.url);
        return u.protocol === 'https:' && !u.username && !u.password && hosts.has(u.hostname.toLowerCase());
      } catch (e) { return false; }
    }).slice(0, 50);
  }

  /* ================= T05a – Dừng 5 giây (bài) – A.3 ================= */
  const PAUSE_STEPS = [
    ['✋', 'Dừng lại', 'Chị tạm dừng việc đang làm vài giây.'],
    ['😌', 'Thả lỏng vai và hàm', 'Vai hạ xuống, hàm mềm ra, răng không chạm nhau.'],
    ['🌬️', 'Một hơi thở tự nhiên', 'Chỉ cần biết một hơi vào, một hơi ra. Không cần đổi gì.'],
    ['👀', 'Quan sát', 'Lúc này mình đang thấy gì? Cơ thể đang báo điều gì?'],
    ['🧭', 'Chọn bước tiếp', 'Mình cần gì: nghỉ một chút, kể với ai đó, hay một bài dài hơn?']
  ];
  const pause5 = {
    render: () => `
      <p class="rx-progress" id="p5-prog"></p>
      <div class="rx-step-card" id="p5-card"></div>
      <div class="rx-row">
        <button type="button" class="btn btn-secondary" id="p5-prev">‹ Trước</button>
        <button type="button" class="btn btn-primary" id="p5-next">Tiếp ›</button>
      </div>`,
    mount(body, ex, api) {
      let i = 0;
      const STEPS = arr(ex && ex.steps, null) ? ex.steps.map(x => [x.icon || '•', x.title || '', x.text || '']) : PAUSE_STEPS;
      const show = focus => {
        const [ic, h, p] = STEPS[i];
        $('#p5-prog', body).textContent = `Bước ${i + 1}/${STEPS.length}`;
        $('#p5-card', body).innerHTML = `<div class="rx-step-icon" aria-hidden="true">${E(ic)}</div><h2>${E(h)}</h2><p>${E(p)}</p>`;
        $('#p5-prev', body).disabled = i === 0;
        $('#p5-next', body).textContent = i === STEPS.length - 1 ? 'Xong ›' : 'Tiếp ›';
        if (focus) focusTo($('#p5-card h2', body));
      };
      // Chặn cú thứ hai của một lần chạm đúp (bài học STOP-4P N-03): chạm đúp ở bước 4 không nhảy qua bước 5
      $('#p5-next', body).addEventListener('click', e => {
        if (e.detail > 1) return;
        if (i < STEPS.length - 1) { i++; show(true); } else if (typeof api.finish === 'function') api.finish();
      });
      $('#p5-prev', body).addEventListener('click', e => { if (e.detail > 1) return; if (i > 0) { i--; show(true); } });
      show(false);
      register(api, () => {});
      return () => {};
    }
  };

  /* ================= T05b / T05c – Thở theo nhịp (không pha giữ, không nhịp ×1,25) ================= */
  const PACED = {
    breath46: {
      art: '🐉',
      pattern: [['in', 4, 'Hít vào nhẹ nhàng'], ['out', 6, 'Thở ra chậm, dài']],
      guide: [
        'Hít vào nhẹ bằng mũi, như bé rồng lấy hơi.',
        'Thở ra chậm bằng miệng, như thổi cho chong chóng quay thật lâu.',
        'Hơi thở ra hết thì thôi. Không giữ hơi lại, không cố thêm.'
      ],
      end: 'Xong rồi. Chị thở tự nhiên thêm vài hơi nhé.'
    },
    hum: {
      art: '🎵',
      pattern: [['in', 4, 'Hít vào nhẹ bằng mũi'], ['out', 6, 'Thở ra, ngân "ừmmm" khẽ']],
      guide: [
        'Chị khép nhẹ môi, hai hàm răng hơi tách nhau.',
        'Hít vào nhẹ bằng mũi.',
        'Thở ra và ngân "ừmmm" thật khẽ. Chị nghe tiếng rung nhẹ ở môi, ở ngực.',
        'Hơi hết thì tiếng ngân cũng hết. Không kéo dài cố.',
        'Nếu muốn, chị đặt tay lên bụng trong lúc ngân.'
      ],
      end: 'Xong rồi. Chị ngồi yên thêm một chút, nghe cơ thể mình nhé.'
    }
  };
  // Hai nhịp duy nhất: "Ngắn hơn" ×0,75 và "Gợi ý" ×1 (AC-43). Không có giá trị > 1.
  const TEMPOS = [{ v: '0.75', label: 'Ngắn hơn' }, { v: '1', label: 'Gợi ý' }];
  const DURS = [1, 2, 3, 5];
  // Ghép cấu hình từ ex (data.js) với dự phòng. Lưới an toàn: chỉ nhận pha vào/ra (pha giữ hơi bị bỏ),
  // hệ số nhịp ≤ 1 (không bao giờ có nhịp ×1,25), thời lượng trong 1–5 phút.
  function pacedCfg(type, ex) {
    const fb = PACED[type];
    const phases = arr(ex && ex.phases, null);
    let pattern = phases ? phases.map(p => [p.code, +p.sec, String(p.label || '')]) : fb.pattern;
    pattern = pattern.filter(p => (p[0] === 'in' || p[0] === 'out') && p[1] > 0 && p[1] <= 8);
    if (!pattern.some(p => p[0] === 'in') || !pattern.some(p => p[0] === 'out')) pattern = fb.pattern;
    const paces = arr(ex && ex.paces, null);
    let tempos = paces ? paces.filter(p => +p.factor > 0 && +p.factor <= 1).map(p => ({ v: String(+p.factor), label: E(p.label) })) : TEMPOS;
    if (!tempos.some(t => t.v === '1')) tempos = TEMPOS;
    const durs = (arr(ex && ex.durations, DURS)).map(Number).filter(m => m >= 1 && m <= 5);
    return {
      art: E(str(ex && ex.icon, fb.art)), pattern, tempos, durs: durs.length ? durs : DURS,
      guide: arr(ex && ex.lead, fb.guide).map(E),
      fine: E(str(ex && ex.fine, 'Vòng tròn chỉ là gợi ý. Nhịp không hợp thì chị cứ thở theo cách của mình nhé.')),
      end: str(ex && ex.end, fb.end)
    };
  }
  function paced(type) {
    return {
      render(ex, api) {
        const cfg = pacedCfg(type, ex);
        const want = api.state && api.state.relax && api.state.relax.checkin ? api.state.relax.checkin.minutes : null;
        const def = want ? cfg.durs.filter(m => m <= want).pop() || cfg.durs[0] : (cfg.durs.includes(2) ? 2 : cfg.durs[0]);
        return `
          <div class="rx-guide">
            <h2 class="rx-h3">Trước khi bắt đầu</h2>
            <ol>${cfg.guide.map(g => `<li>${g}</li>`).join('')}</ol>
          </div>
          <div class="rx-orb-wrap">
            <div class="orb rx-orb" id="orb" aria-hidden="true"><span>${cfg.art}</span></div>
            <div class="rx-orb-label"><p id="phase" class="rx-phase" aria-live="polite">Sẵn sàng</p><p id="count" class="rx-orb-count" aria-hidden="true"></p></div>
          </div>
          <div class="rx-controls">
            <p class="rx-label" id="tempo-l">Nhịp</p>
            ${chips('tempo', 'tempo-l', cfg.tempos, '1')}
            <p class="rx-label" id="dur-l">Thời lượng</p>
            ${chips('dur', 'dur-l', cfg.durs.map(m => ({ v: m, label: m + ' phút' })), def)}
            <label class="rx-check"><input type="checkbox" id="chime"> <span>Âm báo khi đổi nhịp</span></label>
          </div>
          <div class="rx-row">
            <button type="button" class="btn btn-primary" id="bplay">▶ Bắt đầu</button>
            <button type="button" class="btn btn-secondary" id="bstop" hidden>■ Dừng</button>
          </div>
          <p class="rx-timer" id="remain" role="timer" aria-live="off"></p>
          <div id="bend"></div>
          <p class="fine">${cfg.fine}</p>`;
      },
      mount(body, ex, api) {
        const cfg = pacedCfg(type, ex), pattern = cfg.pattern;
        const T = timers(api);
        let durMin = +(($('[data-dur][aria-pressed="true"]', body) || {}).dataset || {}).dur || 2;
        let tempo = 1, running = false, t = 0, total = 0, lastPhase = -1, timer = null, lastTs = 0;
        const orb = $('#orb', body), phaseEl = $('#phase', body), countEl = $('#count', body), remainEl = $('#remain', body);
        const chimeBox = $('#chime', body), play = $('#bplay', body), stopBtn = $('#bstop', body);
        const rm = api.reduceMotion();
        const cycle = () => pattern.reduce((s, p) => s + p[1] * tempo, 0);
        // Giảm chuyển động: không đổi cỡ, chỉ đổi độ đậm (AC-02)
        const setScale = s => {
          if (rm) { orb.style.transform = 'none'; orb.style.opacity = String(0.4 + 0.6 * (s - 0.55) / 0.45); }
          else { orb.style.transform = `scale(${s})`; orb.style.opacity = ''; }
        };
        setScale(0.55);
        bindChips(body, 'tempo', v => { tempo = Math.min(1, +v || 1); });
        bindChips(body, 'dur', v => { durMin = +v || 2; if (running || t > 0) total = durMin * 60; });
        // Bật âm báo là một cú chạm → được tạo AudioContext lúc này (AC-49)
        chimeBox.addEventListener('change', () => { if (chimeBox.checked && SOUND) SOUND.unlock(); });

        function tick() {
          const now = performance.now(); t += Math.min(1, (now - lastTs) / 1000); lastTs = now;
          if (t >= total) { finish(); return; }
          const c = cycle(); let inC = t % c, idx = 0;
          while (idx < pattern.length - 1 && inC >= pattern[idx][1] * tempo) { inC -= pattern[idx][1] * tempo; idx++; }
          const [kind, sec, label] = pattern[idx];
          const len = sec * tempo, frac = Math.min(1, inC / len);
          if (idx !== lastPhase) {
            lastPhase = idx; phaseEl.textContent = label;
            if (chimeBox.checked && SOUND) SOUND.chime(kind === 'in' ? 528 : 396);
          }
          countEl.textContent = String(Math.max(1, Math.ceil(len - inC)));
          setScale(kind === 'in' ? 0.55 + 0.45 * frac : 1 - 0.45 * frac);
          remainEl.textContent = 'Còn khoảng ' + mmss(total - t);
        }
        function start() {
          if (!total || t >= total) { t = 0; total = durMin * 60; lastPhase = -1; }
          $('#bend', body).innerHTML = '';
          running = true; lastTs = performance.now();
          timer = T.every(tick, 100);
          play.textContent = '❚❚ Tạm dừng'; stopBtn.hidden = false;
        }
        function pause() {
          if (!running) return;
          running = false; timer = T.clear(timer);
          play.textContent = '▶ Tiếp tục';
        }
        function reset(label) {
          running = false; timer = T.clear(timer);
          t = 0; total = 0; lastPhase = -1; setScale(0.55); countEl.textContent = ''; remainEl.textContent = '';
          phaseEl.textContent = label;
          play.textContent = '▶ Bắt đầu'; stopBtn.hidden = true;
        }
        function finish() {
          reset(cfg.end);
          // Nút Check-out là phần tử MỚI (không đổi chính nút đang bấm thành data-act – lỗi T-05 STOP-4P)
          $('#bend', body).innerHTML = FINISH_BTN;
        }
        play.addEventListener('click', () => (running ? pause() : start()));
        stopBtn.addEventListener('click', () => { reset('Đã dừng'); focusTo(play); });
        // Ẩn tab (khóa màn hình, chuyển app) → tạm dừng, quay lại chị tự bấm Tiếp tục
        api.lifecycle.on(document, 'visibilitychange', () => { if (document.hidden && running) pause(); });
        register(api, pause);
        return pause;
      }
    };
  }
  const breath46 = paced('breath46');
  const hum = paced('hum');

  /* ================= T05d – Thở bụng nhẹ, tay ôm con – A.8 ================= */
  const BELLY_STEPS = [
    'Chị đặt một tay lên ngực, một tay lên bụng. Đặt nhẹ thôi, không ấn.',
    'Hít vào bằng mũi. Để bụng phồng lên một chút dưới bàn tay.',
    'Thở ra chậm, môi hơi chúm, như đang thổi nguội một thìa canh.',
    'Bụng lớn rồi thì thở được đến đâu hay đến đó. Không cần cố.',
    'Cứ thế vài hơi thở, hoặc bao nhiêu chị thấy thoải mái.'
  ];
  const BELLY_END = 'Chị vừa dành cho mình mấy hơi thở chậm. Khác hay không khác đều ổn.';
  // Hình thai phụ một tay trên ngực, một tay trên bụng (trang trí, aria-hidden)
  const momHandsSVG = () => `
    <svg viewBox="0 0 160 170" class="rx-figure rx-mom" aria-hidden="true" focusable="false">
      <circle cx="80" cy="30" r="20" class="skin"/>
      <path d="M60 28 Q62 8 80 8 Q98 8 100 28 Q92 20 80 20 Q68 20 60 28 Z" class="hair"/>
      <path d="M58 56 Q80 46 102 56 L108 160 L52 160 Z" class="dress"/>
      <ellipse cx="88" cy="112" rx="30" ry="28" class="dress belly-swell"/>
      <ellipse cx="80" cy="70" rx="12" ry="7" class="skin"/>
      <ellipse cx="94" cy="112" rx="13" ry="8" class="skin"/>
    </svg>`;
  const bellyBreath = {
    render: ex => `
      <div class="rx-figure-wrap">${momHandsSVG()}</div>
      <div class="rx-step-card" id="bb-card"></div>
      <div class="rx-row">
        <button type="button" class="btn btn-primary" id="bb-next">Tiếp ›</button>
      </div>
      <p class="rx-center"><button type="button" class="rx-link" id="bb-skip">Bỏ qua</button></p>
      <p class="rx-label" id="bbt-l">Hẹn giờ mềm (tùy chọn)</p>
      ${chips('bbt', 'bbt-l', arr(ex && ex.softTimer, [1, 2, 3]).map(Number).filter(m => m > 0 && m <= 10).map(m => ({ v: m, label: m + ' phút' })), '')}
      <div id="bb-end" aria-live="polite"></div>`,
    mount(body, ex, api) {
      const T = timers(api);
      let i = 0, done = false, leftMs = 0, timer = null, lastTs = 0, held = false;
      const STEPS = arr(ex && ex.steps, null) ? ex.steps.map(x => String(x.text || '')) : BELLY_STEPS;
      const END = str(ex && ex.end, BELLY_END);
      const card = $('#bb-card', body), next = $('#bb-next', body), skip = $('#bb-skip', body);
      const show = focus => {
        card.innerHTML = `<h2 class="rx-h3">Bước ${i + 1}/${STEPS.length}</h2><p>${E(STEPS[i])}</p>`;
        next.textContent = i === STEPS.length - 1 ? 'Xong ›' : 'Tiếp ›';
        if (focus) focusTo($('h2', card));
      };
      const end = () => {
        if (done) return;
        done = true; timer = T.clear(timer);
        card.hidden = true; next.hidden = true; skip.hidden = true;
        $('#bb-end', body).innerHTML = `<div class="rx-step-card"><h2 class="rx-h3">Xong rồi</h2><p>${E(END)}</p>${FINISH_BTN}</div>`;
        focusTo($('#bb-end h2', body));
      };
      next.addEventListener('click', e => { if (e.detail > 1) return; if (i < STEPS.length - 1) { i++; show(true); } else end(); });
      skip.addEventListener('click', end);
      // Hẹn giờ mềm: không có vòng đếm ngược, hết giờ thì hiện lời kết (AC-45)
      const run = () => {
        if (done || held || leftMs <= 0 || timer) return;
        lastTs = Date.now();
        timer = T.every(() => {
          const now = Date.now(); leftMs -= now - lastTs; lastTs = now;
          if (leftMs <= 0) end();
        }, 500);
      };
      const stop = () => { timer = T.clear(timer); };
      bindChips(body, 'bbt', v => { leftMs = (+v || 0) * 60000; held = false; stop(); run(); });
      api.lifecycle.on(document, 'visibilitychange', () => { if (document.hidden) stop(); else run(); });
      show(false);
      const pause = () => { held = true; stop(); };
      register(api, pause);
      return pause;
    }
  };

  /* ================= T05e – Về với lúc này 5-4-3-2-1 – A.10 (không nhắc cử động của con) ================= */
  const GROUND = [
    [5, '👀', 'Nhìn', 'Tìm 5 thứ chị nhìn thấy: một màu sắc, một hình dạng, một vệt nắng…'],
    [4, '✋', 'Chạm', '4 thứ chị cảm nhận khi chạm vào: vải áo, tay ghế, bàn chân chạm sàn…'],
    [3, '👂', 'Nghe', '3 âm thanh quanh chị, gần hoặc xa.'],
    [2, '👃', 'Ngửi', '2 mùi. Hoặc chỉ cảm nhận không khí mát đi qua mũi.', true],
    [1, '💗', 'Cảm nhận', '1 cảm giác trong cơ thể lúc này, như hơi ấm của bàn tay đặt trên bụng.']
  ];
  const grounding = {
    render: () => `
      <p class="rx-progress" id="g-prog"></p>
      <div class="rx-step-card" id="ground"></div>`,
    mount(body, ex, api) {
      let i = 0;
      const STEPS = arr(ex && ex.steps, null) ? ex.steps.map(x => [+x.n || 1, x.icon || '•', x.title || '', x.text || '', !!x.skippable]) : GROUND;
      const FINE = str(ex && ex.fine, 'Chạm vào một chấm mỗi khi chị nhận ra một điều.');
      const [endH, endP] = splitEnd(str(ex && ex.end, 'Chị đang ở đây, lúc này. Cơ thể có khác gì không? Không cần phải khác đâu.'));
      const show = focus => {
        const box = $('#ground', body);
        if (i >= STEPS.length) {
          $('#g-prog', body).textContent = '';
          box.innerHTML = `<div class="rx-step-icon" aria-hidden="true">🌿</div><h2>${E(endH)}</h2>
            <p>${E(endP)}</p>${FINISH_BTN}`;
          focusTo($('h2', box));
          return;
        }
        const [n, ic, h, p, canSkip] = STEPS[i];
        $('#g-prog', body).textContent = `Bước ${i + 1}/${STEPS.length}`;
        box.innerHTML = `
          <div class="rx-step-icon" aria-hidden="true">${E(ic)}</div>
          <h2>${n} — ${E(h)}</h2><p>${E(p)}</p>
          <p class="fine">${E(FINE)}</p>
          <div class="rx-dots">${Array.from({ length: Math.min(n, 9) }, (_, k) => `<button type="button" class="rx-dot" aria-pressed="false" aria-label="Đã nhận ra điều thứ ${k + 1}"></button>`).join('')}</div>
          <div class="rx-row"><button type="button" class="btn btn-primary" id="gnext">${i < STEPS.length - 1 ? 'Tiếp ›' : 'Xong ›'}</button></div>
          ${canSkip ? '<p class="rx-center"><button type="button" class="rx-link" id="gskip">Bỏ qua bước này</button></p>' : ''}`;
        $$('.rx-dot', box).forEach(d => d.addEventListener('click', () => { d.setAttribute('aria-pressed', String(d.getAttribute('aria-pressed') !== 'true')); vibrate(15); }));
        $('#gnext', box).addEventListener('click', e => { if (e.detail > 1) return; i++; show(true); });
        const sk = $('#gskip', box); if (sk) sk.addEventListener('click', e => { if (e.detail > 1) return; i++; show(true); });
        if (focus) focusTo($('h2', box));
      };
      show(false);
      register(api, () => {});
      return () => {};
    }
  };

  /* ================= T05f – Thả lỏng từng vùng – A.11 =================
     Vùng 5–7 (bụng, lưng và hông, chân và bàn chân) KHÔNG có câu siết trong dữ liệu → không thể có pha siết,
     kể cả khi tắt "Chỉ thả lỏng" (AC-46). */
  const ZONES = [
    { name: 'Bàn tay', tense: 'Nắm nhẹ hai bàn tay', relax: 'Mở bàn tay ra, để các ngón tay nghỉ.' },
    { name: 'Cánh tay', tense: 'Gập nhẹ khuỷu tay', relax: 'Thả tay xuống, để cánh tay nặng xuống.' },
    { name: 'Vai', tense: 'Nhún vai nhẹ lên gần tai', relax: 'Để vai rơi xuống, rời xa tai.' },
    { name: 'Mặt và hàm', tense: 'Nhíu mày, mím môi nhẹ', relax: 'Thả lỏng trán, mắt, hàm. Răng không chạm nhau.' },
    { name: 'Bụng', tense: null, relax: 'Bụng mềm ra. Không hóp, không gồng. Thở tự nhiên.' },
    { name: 'Lưng và hông', tense: null, relax: 'Để gối hay lưng ghế đỡ lưng chị. Hông mềm ra.' },
    { name: 'Chân và bàn chân', tense: null, relax: 'Để hai chân nặng xuống. Giữ bàn chân thả tự nhiên, không duỗi thẳng mũi chân.' }
  ];
  const TENSE_S = 5, RELAX_S = 10;
  // Vùng từ data.js; vùng releaseOnly (hoặc thiếu câu siết) luôn tense = null. Phải đúng 7 vùng, không thì dùng dự phòng.
  function releaseCfg(ex) {
    let zones = arr(ex && ex.zones, null);
    zones = zones && zones.length === 7 ? zones.map(z => ({ name: String(z.title || z.name || ''), tense: z.releaseOnly ? null : (z.tense || null), relax: String(z.release || z.relax || '') })) : ZONES;
    // Lưới an toàn AC-46: ba vùng cuối (bụng, lưng và hông, chân) không bao giờ có pha siết
    zones = zones.map((z, k) => (k >= 4 ? Object.assign({}, z, { tense: null }) : z));
    const sec = (v, fb) => (+v > 0 && +v <= 20 ? +v : fb);
    return {
      zones,
      tenseS: sec(ex && ex.tenseSec, TENSE_S), relaxS: sec(ex && ex.releaseSec, RELAX_S),
      lead: str(ex && ex.lead, 'Siết nhẹ chừng 3 phần 10 sức trong khoảng 5 giây, vẫn thở đều. Rồi thả lỏng khoảng 10 giây.'),
      tenseNote: str(ex && ex.tenseNote, 'Nhẹ thôi, vẫn thở đều nhé'),
      relaxNote: str(ex && ex.releaseNote, 'Để ý cảm giác khi cơ mềm ra'),
      onlyLabel: str(ex && ex.releaseOnlyLabel, 'Chỉ thả lỏng, không siết vùng nào'),
      end: str(ex && ex.end, 'Xong rồi. Chị để cả cơ thể nghỉ thêm vài hơi thở tự nhiên nhé.')
    };
  }
  // Hình thai phụ ngồi; vùng đang làm tô màu + có chữ tên vùng ở dưới (không chỉ dựa vào màu)
  const sitSVG = () => `
    <svg viewBox="0 0 180 190" class="rx-figure rx-sit" aria-hidden="true" focusable="false">
      <rect x="18" y="96" width="20" height="80" rx="8" class="chair"/>
      <rect x="18" y="136" width="120" height="14" rx="7" class="chair"/>
      <g class="z" data-z="5"><path d="M44 70 Q40 112 52 136 L70 136 Q62 104 64 72 Z" class="dress"/></g>
      <circle cx="78" cy="30" r="19" class="skin z" data-z="3"/>
      <path d="M58 52 Q78 44 98 52 L102 76 L56 76 Z" class="dress z" data-z="2"/>
      <ellipse cx="96" cy="104" rx="30" ry="27" class="dress z" data-z="4"/>
      <path d="M60 50 Q48 74 60 100" class="limb z" data-z="1"/>
      <circle cx="66" cy="108" r="7" class="skin z" data-z="0"/>
      <path d="M70 140 L126 140 L128 176 L116 176 L112 152 L70 152 Z" class="dress z" data-z="6"/>
    </svg>`;
  const release = {
    render: ex => { const cfg = releaseCfg(ex); return `
      <p>${E(cfg.lead)}</p>
      <button type="button" class="rx-switch" role="switch" aria-checked="false" id="ronly"><span class="rx-switch-ui" aria-hidden="true"></span><span>${E(cfg.onlyLabel)}</span></button>
      <div class="rx-figure-wrap">${sitSVG()}</div>
      <p class="rx-progress" id="rprog"></p>
      <div class="rx-step-card" id="rcard" aria-live="polite"></div>
      <div class="rx-bar" aria-hidden="true"><i id="rbar"></i></div>
      <div class="rx-row">
        <button type="button" class="btn btn-primary" id="rplay">▶ Bắt đầu</button>
      </div>
      <p class="rx-center"><button type="button" class="rx-link" id="rskip">Bỏ qua vùng này</button></p>
      <div id="rend"></div>
      <ol class="rx-zones" id="rzones">${cfg.zones.map((z, k) => `<li data-k="${k}">${E(z.name)}${z.tense ? '' : ' <small>(chỉ thả lỏng)</small>'}</li>`).join('')}</ol>`; },
    mount(body, ex, api) {
      const cfg = releaseCfg(ex), ZONES = cfg.zones;
      const T = timers(api);
      let gi = 0, phase = 'tense', t = 0, running = false, timer = null, lastTs = 0;
      const sw = $('#ronly', body), play = $('#rplay', body), skip = $('#rskip', body);
      const releaseOnly = () => sw.getAttribute('aria-checked') === 'true';
      const hasTense = k => !!ZONES[k].tense && !releaseOnly();
      const phaseLen = () => (phase === 'tense' ? cfg.tenseS : cfg.relaxS);
      const show = () => {
        $$('#rzones li', body).forEach((li, k) => {
          li.classList.toggle('done', k < gi);
          if (k === gi) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        });
        $$('.rx-sit .z', body).forEach(n => n.classList.toggle('on', +n.dataset.z === gi));
        if (gi >= ZONES.length) {
          running = false; timer = T.clear(timer);
          $('#rprog', body).textContent = '';
          $('#rcard', body).hidden = true; play.hidden = true; skip.hidden = true;
          $('#rbar', body).style.width = '100%';
          const [eh, ep] = splitEnd(cfg.end);
          $('#rend', body).innerHTML = `<div class="rx-step-card"><h2 class="rx-h3">${E(eh)}</h2><p>${E(ep)}</p>${FINISH_BTN}</div>`;
          focusTo($('#rend h2', body));
          return;
        }
        if (phase === 'tense' && !hasTense(gi)) phase = 'relax';
        const z = ZONES[gi];
        $('#rprog', body).textContent = `Vùng ${gi + 1}/${ZONES.length} · ${z.name}`;
        $('#rcard', body).innerHTML = phase === 'tense'
          ? `<p class="rx-phase-name">Siết nhẹ</p><h2 class="rx-h3">${E(z.tense)}</h2><p class="fine">${E(cfg.tenseNote)}</p>`
          : `<p class="rx-phase-name">Thả lỏng</p><h2 class="rx-h3">${E(z.relax)}</h2><p class="fine">${E(cfg.relaxNote)}</p>`;
      };
      const tick = () => {
        const now = performance.now(); t += Math.min(1, (now - lastTs) / 1000); lastTs = now;
        const len = phaseLen();
        $('#rbar', body).style.width = Math.min(100, (t / len) * 100) + '%';
        if (t >= len) {
          t = 0;
          if (phase === 'tense') phase = 'relax';
          else { phase = 'tense'; gi++; }
          show();
        }
      };
      function pause() {
        if (!running) return;
        running = false; timer = T.clear(timer);
        play.textContent = '▶ Tiếp tục';
      }
      play.addEventListener('click', () => {
        if (running) return pause();
        running = true; lastTs = performance.now(); timer = T.every(tick, 100);
        play.textContent = '❚❚ Tạm dừng';
        show();
      });
      skip.addEventListener('click', e => { if (e.detail > 1) return; gi++; phase = 'tense'; t = 0; $('#rbar', body).style.width = '0%'; show(); });
      sw.addEventListener('click', () => {
        sw.setAttribute('aria-checked', String(!releaseOnly()));
        if (releaseOnly() && phase === 'tense') { phase = 'relax'; t = 0; }
        show();
      });
      api.lifecycle.on(document, 'visibilitychange', () => { if (document.hidden && running) pause(); });
      show();
      register(api, pause);
      return pause;
    }
  };

  /* ===== Phần dùng chung của hai bài nghe ===== */
  const TIMER_MINS = [5, 10, 15];
  // Âm lượng mặc định 30 (AC-50); data.js có defaultVolume thì theo, nhưng không quá 50
  const defVol = ex => { const v = +(ex && ex.defaultVolume); return v >= 0 && v <= 50 ? v : (SOUND ? SOUND.DEFAULT_VOLUME : 30); };
  const volumeHTML = ex => `
    <label class="rx-label" for="avol">Âm lượng</label>
    <div class="rx-vol"><span aria-hidden="true">🔈</span>
      <input type="range" id="avol" min="0" max="100" step="5" value="${defVol(ex)}" aria-valuetext="Âm lượng ${defVol(ex)}">
      <span aria-hidden="true">🔊</span></div>`;
  // Hẹn giờ chỉ 5 / 10 / 15 phút, không có "phát liên tục" (AC-50)
  const timerList = ex => { const l = arr(ex && ex.timers, TIMER_MINS).map(Number).filter(m => TIMER_MINS.includes(m)); return l.length ? l : TIMER_MINS; };
  const timerChips = (ex, def) => `<p class="rx-label" id="amin-l">Hẹn giờ</p>${chips('amin', 'amin-l', timerList(ex).map(m => ({ v: m, label: m + ' phút' })), def)}`;
  const defaultMinutes = (api, ex) => {
    const list = timerList(ex);
    const want = api.state && api.state.relax && api.state.relax.checkin ? api.state.relax.checkin.minutes : null;
    if (list.includes(want)) return want;
    const d = +(ex && ex.defaultTimer);
    return list.includes(d) ? d : (list.includes(10) ? 10 : list[0]);
  };
  const NO_AUDIO = 'Trình duyệt này chưa phát được âm thanh. Chị thử trình duyệt khác nhé.';

  /* ================= T05g – Âm thanh êm dịu – A.12 ================= */
  const KINDS = [
    { v: 'waves', label: 'Sóng biển (lên xuống chậm)' },
    { v: 'rain', label: 'Mưa nhẹ' },
    { v: 'wind', label: 'Gió êm (âm đều)' }
  ];
  const wavesSVG = `<svg viewBox="0 0 240 40" class="rx-waves" aria-hidden="true" focusable="false">
      <path d="M0 22 Q30 6 60 22 T120 22 T180 22 T240 22"/><path d="M0 32 Q30 18 60 32 T120 32 T180 32 T240 32"/></svg>`;
  const soundKinds = ex => {
    const l = arr(ex && ex.sounds, null);
    const ok = l ? l.filter(k => ['waves', 'rain', 'wind'].includes(k.code)).map(k => ({ v: k.code, label: E(k.label) })) : [];
    return ok.length ? ok : KINDS;
  };
  const calmAudio = {
    render: (ex, api) => `
      <div class="rx-safety-card"><p><span aria-hidden="true">🎧</span> <b>An toàn:</b> ${E(str(ex && ex.safety, 'Mở vừa đủ nghe. Để điện thoại cách bụng, không áp loa hay tai nghe lên bụng.'))}</p></div>
      <fieldset class="rx-radios"><legend class="rx-label">Âm nền</legend>
        ${soundKinds(ex).map((k, i) => `<label class="rx-radio"><input type="radio" name="akind" value="${k.v}"${i === 0 ? ' checked' : ''}> <span>${k.label}</span></label>`).join('')}
      </fieldset>
      ${timerChips(ex, defaultMinutes(api, ex))}
      ${volumeHTML(ex)}
      <div class="rx-row"><button type="button" class="btn btn-primary" id="aplay">▶ Phát</button></div>
      <p class="rx-timer" id="aleft" role="timer" aria-live="off"></p>
      <div id="aend" aria-live="polite"></div>
      ${wavesSVG}
      <p class="fine">${E(str(ex && ex.alt, 'Âm nền không lời, đều và nhỏ, tự nhỏ dần khi hết giờ.'))}</p>`,
    mount(body, ex, api) {
      const T = timers(api);
      let h = null, timer = null, mins = +(($('[data-amin][aria-pressed="true"]', body) || {}).dataset || {}).amin || 10;
      const play = $('#aplay', body), left = $('#aleft', body), volEl = $('#avol', body);
      const kind = () => (($('input[name=akind]:checked', body) || {}).value) || 'waves';
      const paint = () => { if (h && h.endsAt) left.textContent = 'Còn ' + mmss((h.endsAt - Date.now()) / 1000); };
      function ended() {
        if (!h) return;
        h = null; timer = T.clear(timer);
        play.textContent = '▶ Phát'; left.textContent = '';
        $('#aend', body).innerHTML = `<p>${E(str(ex && ex.end, 'Hết giờ rồi. Chị nằm thêm một chút nếu thích nhé.'))}</p>${FINISH_BTN}`;
      }
      function start(minutes) {
        $('#aend', body).innerHTML = '';
        h = SOUND ? SOUND.ambient(kind(), { volume: +volEl.value, minutes, onEnd: ended }) : null;
        if (!h) { api.toast(NO_AUDIO); play.textContent = '▶ Phát'; return; }
        play.textContent = '■ Dừng';
        paint();
        timer = T.every(() => { paint(); if (h && h.endsAt && Date.now() >= h.endsAt + 1500) { try { h.stop(0); } catch (e) { /* bỏ qua */ } ended(); } }, 1000);
      }
      function stop(fade = 1500) {
        timer = T.clear(timer);
        if (h) { try { h.stop(fade); } catch (e) { /* bỏ qua */ } h = null; }
        play.textContent = '▶ Phát'; left.textContent = '';
      }
      const restart = () => { if (!h) return; const rest = Math.max(0.2, (h.endsAt - Date.now()) / 60000); stop(800); start(rest); };
      play.addEventListener('click', () => (h ? stop() : start(mins)));
      bindChips(body, 'amin', v => { mins = +v || 10; if (h) { stop(800); start(mins); } });
      $$('input[name=akind]', body).forEach(r => r.addEventListener('change', restart));
      volEl.addEventListener('input', () => { volEl.setAttribute('aria-valuetext', 'Âm lượng ' + volEl.value); if (h) h.setVolume(+volEl.value); });
      // Âm nghe được khi tắt màn hình là chủ ý (chị nằm nghe); quay lại thì cập nhật đồng hồ ngay
      api.lifecycle.on(document, 'visibilitychange', () => { if (!document.hidden) paint(); });
      const pause = () => stop(1500);
      register(api, pause);
      return pause;
    }
  };

  /* ================= T05h – Nghe nhạc cùng con – A.13, A.13b, AC-110…114 =================
     audio  → <audio preload="none"> tạo SAU cú chạm "Phát", URL dùng nguyên văn, hẹn giờ + nhỏ dần 10 s.
     youtube / link → KHÔNG nhúng (AC-113 v1.0): thẻ nhắc L03 rồi mở tab mới rel="noopener noreferrer".
     Chưa có link hợp lệ → giai điệu êm tự tạo bằng WebAudio (AC-110). */
  const BUILTIN = 'builtin';
  const music = {
    render(ex, api) {
      const links = musicLinks(api.C);
      const list = links.length ? `
        <fieldset class="rx-radios"><legend class="rx-label">Chọn bài</legend>
          ${links.map((m, i) => `<label class="rx-radio"><input type="radio" name="mpick" value="${i}"${i === 0 ? ' checked' : ''}> <span>${api.esc(m.title)} <small>· ${m.kind === 'audio' ? 'Phát trong app' : 'Mở ở trang khác ↗'}</small></span></label>`).join('')}
          <label class="rx-radio"><input type="radio" name="mpick" value="${BUILTIN}"> <span>Âm thanh êm dịu <small>· Phát trong app</small></span></label>
        </fieldset>`
        : `<p class="fine">${E(str(ex && ex.empty, 'Danh sách nhạc đang được bổ sung. Trong lúc chờ, chị nghe âm thanh êm dịu nhé.'))}</p>`;
      const note = str(ex && ex.linkNote, 'Bài này mở ở trang khác. Chị để âm lượng vừa phải, để điện thoại cách bụng, không áp loa hay tai nghe lên bụng nhé. App không tự tắt được nhạc ở trang đó, chị nhớ tắt sau 10–15 phút.');
      const [noteH, noteP] = splitEnd(note);
      const tl = timerList(ex), dm = tl.includes(+(ex && ex.defaultTimer)) ? +ex.defaultTimer : (tl.includes(10) ? 10 : tl[0]);
      return `
        <p>${E(str(ex && ex.lead, 'Chị ngồi tựa lưng hoặc nằm nghiêng bên trái. Nếu muốn, chị đặt tay lên bụng, hoặc hát theo nho nhỏ.'))}</p>
        <div class="rx-safety-card rx-volume-card">
          <p class="rx-volume-art" aria-hidden="true">📱 ↔ 🤰</p>
          <p>${E(str(ex && ex.safety, 'Mở âm lượng vừa đủ chị nghe dễ chịu. Để điện thoại cách bụng, không áp loa hay tai nghe lên bụng nhé.'))}</p>
        </div>
        ${list}
        ${timerChips(ex, dm)}
        <p class="fine">${E(str(ex && ex.fine, 'Nhạc tự nhỏ dần rồi tắt khi hết giờ.'))}</p>
        ${volumeHTML(ex)}
        <div class="rx-row"><button type="button" class="btn btn-primary" id="mplay">▶ Phát</button></div>
        <p class="rx-status" id="mstatus" aria-live="polite"></p>
        <p class="rx-timer" id="mleft" role="timer" aria-live="off"></p>
        <div id="mend" aria-live="polite"></div>
        <div class="rx-layer" id="l03" role="dialog" aria-modal="true" aria-labelledby="l03-t" hidden>
          <div class="rx-layer-card">
            <h2 id="l03-t" data-layer-title>${E(noteH)}</h2>
            <p>${E(noteP)}</p>
            <div class="rx-row"><a class="btn btn-primary" id="mopen" target="_blank" rel="noopener noreferrer">Mở bài nhạc ›</a></div>
            <p class="rx-center"><button type="button" class="rx-link" id="mcalm">Thôi, nghe âm thanh êm dịu</button></p>
          </div>
        </div>`;
    },
    mount(body, ex, api) {
      const T = timers(api);
      const links = musicLinks(api.C);
      let h = null, el = null, timer = null, endAt = 0, closeL03 = null, v0 = 0.3;
      let mins = +(($('[data-amin][aria-pressed="true"]', body) || {}).dataset || {}).amin || 10;
      const play = $('#mplay', body), status = $('#mstatus', body), left = $('#mleft', body), volEl = $('#avol', body);
      // Lớp L03 phải nằm ngoài card (card có backdrop-filter làm position:fixed bám theo card) → chuyển ra #main
      const l03 = $('#l03', body);
      const host = document.getElementById('main');
      if (host && l03) host.appendChild(l03);
      const pick = () => { const r = $('input[name=mpick]:checked', body); return !r || r.value === BUILTIN ? null : links[+r.value] || null; };
      const paint = () => { if (endAt) left.textContent = 'Còn ' + mmss((endAt - Date.now()) / 1000); };
      function ended() {
        if (!h) return;
        h = null; el = null; endAt = 0; timer = T.clear(timer);
        play.textContent = '▶ Phát'; left.textContent = ''; status.textContent = '';
        $('#mend', body).innerHTML = `<p>${E(str(ex && ex.end, 'Hết giờ rồi. Những phút vừa rồi là của hai mẹ con.'))}</p>${FINISH_BTN}`;
      }
      function stop(fade = 1500) {
        timer = T.clear(timer);
        if (h) { try { h.stop(fade); } catch (e) { /* bỏ qua */ } }
        h = null; el = null; endAt = 0;
        play.textContent = '▶ Phát'; left.textContent = ''; status.textContent = '';
      }
      function fail() {
        stop(0);
        $('#mend', body).innerHTML = `<p>Chưa tải được bài này. Chị nghe âm thanh êm dịu trong lúc chờ nhé.</p>
          <div class="rx-row"><button type="button" class="btn btn-secondary" id="mcalm2">Nghe âm thanh êm dịu ›</button></div>`;
        $('#mcalm2', body).addEventListener('click', () => { const b = $('input[name=mpick][value=' + BUILTIN + ']', body); if (b) b.checked = true; startBuiltin(); });
      }
      function tickFn() {
        paint();
        const rest = endAt - Date.now();
        // <audio>: nhỏ dần 10 s cuối nếu trình duyệt cho đổi volume (iPhone không cho → dừng hẳn lúc hết giờ)
        if (el && h && h.volumeWorks && rest <= 10000 && rest > 0 && h.volumeWorks()) { try { el.volume = Math.max(0, v0 * rest / 10000); } catch (e) { /* bỏ qua */ } }
        if (rest <= 0) {
          if (el) { try { h.stop(0); } catch (e) { /* bỏ qua */ } ended(); }
          else if (rest <= -1500) { try { h.stop(0); } catch (e) { /* bỏ qua */ } ended(); }
        }
      }
      function startBuiltin() {
        $('#mend', body).innerHTML = '';
        h = SOUND ? SOUND.ambient('melody', { volume: +volEl.value, minutes: mins, onEnd: ended }) : null;
        if (!h) { api.toast(NO_AUDIO); return; }
        endAt = h.endsAt; play.textContent = '■ Dừng'; paint();
        timer = T.every(tickFn, 500);
      }
      function startAudio(m) {
        $('#mend', body).innerHTML = '';
        el = document.createElement('audio');
        el.preload = 'none'; el.loop = true; el.setAttribute('playsinline', '');
        el.className = 'rx-hidden-audio';
        v0 = Math.min(1, Math.max(0, +volEl.value / 100));
        el.src = m.url;                       // nguyên văn, app không thêm tham số (AC-114)
        try { el.volume = v0; } catch (e) { /* bỏ qua */ }
        body.appendChild(el);
        const mine = el;
        h = SOUND ? SOUND.media(el, { onEnd: ended }) : { stop: () => { try { mine.pause(); } catch (e) { /* bỏ qua */ } }, setVolume: () => {} };
        status.textContent = 'Đang tải bài nhạc…';
        mine.addEventListener('playing', () => { if (el === mine) status.textContent = ''; });
        mine.addEventListener('error', () => { if (el === mine) fail(); });
        try { const p = mine.play(); if (p && p.catch) p.catch(() => { if (el === mine) fail(); }); } catch (e) { fail(); return; }
        endAt = Date.now() + mins * 60000; play.textContent = '■ Dừng'; paint();
        timer = T.every(tickFn, 250);
      }
      function openLink(m) {
        const a = $('#mopen', l03);
        a.setAttribute('href', m.url);          // chỉ gắn link khi chị đã bấm Phát (AC-113)
        closeL03 = layer(api, l03, { opener: play, onEscape: () => { if (closeL03) closeL03(); a.removeAttribute('href'); } });
      }
      play.addEventListener('click', () => {
        if (h) { stop(); return; }
        const m = pick();
        if (!m) startBuiltin();
        else if (m.kind === 'audio') startAudio(m);
        else openLink(m);
      });
      $('#mopen', l03).addEventListener('click', () => {
        // Đóng lớp sau khi trình duyệt đã mở tab mới (đóng ngay trong lúc bấm có thể làm mất thao tác mở link)
        $('#mend', body).innerHTML = `<p>Bài nhạc đang mở ở trang khác. App không tự tắt được nhạc ở trang đó, chị nhớ tắt sau 10–15 phút nhé.</p>${FINISH_BTN}`;
        setTimeout(() => { if (closeL03) closeL03(false); focusTo($('#mend p', body)); }, 0);
      });
      $('#mcalm', l03).addEventListener('click', () => {
        if (closeL03) closeL03();
        $('#mopen', l03).removeAttribute('href');
        const b = $('input[name=mpick][value=' + BUILTIN + ']', body); if (b) b.checked = true;
        startBuiltin();
      });
      bindChips(body, 'amin', v => { mins = +v || 10; if (h && endAt) endAt = Date.now() + mins * 60000; if (h && !el) { stop(800); startBuiltin(); } });
      volEl.addEventListener('input', () => {
        volEl.setAttribute('aria-valuetext', 'Âm lượng ' + volEl.value);
        v0 = Math.min(1, Math.max(0, +volEl.value / 100));
        if (h && h.setVolume) h.setVolume(+volEl.value);
      });
      api.lifecycle.on(document, 'visibilitychange', () => { if (!document.hidden) paint(); });
      const pause = () => { if (closeL03) closeL03(false); stop(1500); };
      register(api, pause);
      return pause;
    }
  };

  return {
    pause5, breath46, hum, bellyBreath, grounding, release, calmAudio, music,
    stopAll, musicLinks, layer,
    TYPES: ['pause5', 'breath46', 'hum', 'bellyBreath', 'grounding', 'release', 'calmAudio', 'music']
  };
})();
