/* =========================================================
   Mẹ Bầu An Yên – js/app.js · lõi (chủ: FE-1 Lõi)
   State, router (stack + history), lifecycle, header, toast, hộp thoại, event delegation, module registry,
   đối tượng `api` cho module (tech design 3.3), màn chung (tech design 4.1; UX A01–A03, A09, M01, S01–S04, P01, I01), boot.
   Không Web Speech. Không alert/confirm/prompt. Không gọi mạng ở Bước A.
   Mọi chuỗi không phải hằng vào HTML qua esc(). Chữ hiển thị lấy nguyên văn PRD Phụ lục A (A.x), PRD-K (M-xx), UX 7.2 (N-xx).
   ========================================================= */
(() => {
  'use strict';
  const C = window.LSTP_CONFIG, U = window.LSTP_UTIL, S = window.LSTP_STORE;
  const D = window.LSTP_DATA || {}, E = window.LSTP_ENGINE || {};
  const SOUND = window.LSTP_SOUND || {}, P = window.LSTP_PLAYERS || {};
  const esc = U.esc;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const today = () => U.dayKey(Date.now());
  const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const goAttr = (name, params) => `data-go="${esc(name)}"${params ? ` data-params="${esc(JSON.stringify(params))}"` : ''}`;

  /* ===== Chữ dùng chung (nguyên văn Phụ lục A) ===== */
  const T = {
    draft: 'Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt. App không thay cho việc khám thai, không chẩn đoán hay điều trị.', // A.24
    blocked: 'Máy này đang chặn lưu dữ liệu. Mình chạy ở chế độ không lưu nhé.',          // A.23
    badData: 'Mình không đọc được một phần dữ liệu cũ trên máy này nên đã bỏ qua phần đó.', // M-205
    kickUnsaved: 'Máy chưa cho lưu, lượt này mình chỉ giữ tới khi chị đóng app.',           // M-206
    noSaveLine: 'Chế độ không lưu: đóng trang là mất.',                                     // AC-12
    mantra: 'Mẹ con mình cùng Bình An nhé.',
    eddWarn: 'Ngày này có vẻ chưa đúng. Chị xem lại ngày dự sinh trong sổ khám giúp mình nhé.', // A.29
    savedSettings: 'Đã lưu cài đặt.',                                                       // M-204
    notDoctor: 'App không thay cho việc khám thai.'
  };

  /* ===== Ảnh capybara: ảnh lỗi → emoji trong cùng ô kích thước cố định ===== */
  const CAPY_EMOJI = ['🤩', '😄', '😊', '🙂', '😐', '😕', '☹️', '😟', '😣', '😫', '😭']; // theo 10 − level
  function capy(level = 8, { alt = '', cls = 'capy' } = {}) {
    const lv = U.clamp(Math.round(+level || 8), 1, 10);
    const file = 'capy/capy-level-' + String(lv).padStart(2, '0') + '.png';
    return `<img class="${esc(cls)}" src="${esc((C.ASSET_BASE || 'assets/') + file)}" alt="${esc(alt)}"${alt ? '' : ' aria-hidden="true"'} data-fallback="${esc(CAPY_EMOJI[10 - lv])}" loading="lazy" decoding="async">`;
  }
  document.addEventListener('error', e => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.dataset && t.dataset.fallback) {
      const span = document.createElement('span');
      span.className = 'emoji-fallback ' + t.className;
      if (t.alt) { span.setAttribute('role', 'img'); span.setAttribute('aria-label', t.alt); } else span.setAttribute('aria-hidden', 'true');
      span.textContent = t.dataset.fallback;
      t.replaceWith(span);
    }
  }, true);

  // Hình thai phụ váy hồng, vương miện (SVG nội tuyến, trang trí)
  const FIGURE = `<svg class="figure" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <circle cx="48" cy="48" r="46" fill="#fff5f8"/>
    <path d="M36 17l5 6 7-8 7 8 5-6-2 11H38z" fill="#f0a05a"/>
    <circle cx="48" cy="34" r="9" fill="#f6d2bf"/>
    <path d="M40 30c2-6 14-6 16 0-3-2-13-2-16 0z" fill="#7d3a55"/>
    <path d="M38 46c0-3 4-5 10-5s10 2 10 5l6 34H32z" fill="#e58aae"/>
    <ellipse cx="55" cy="62" rx="11" ry="12" fill="#f6c3d7"/>
    <path d="M44 58c4 3 8 3 11 0" stroke="#b75480" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;

  /* ===== Trạng thái ===== */
  // Module chỉ ghi vào nhánh của mình (state.relax, state.kick, state.tg…)
  const state = { consent: null, checkin: null, rec: null, session: null, kickUi: null, stack: [], bornJustSet: false };
  Object.defineProperty(state, 'mode', { get: () => S.mode(), enumerable: true });

  /* ===== Lifecycle: mọi timer/listener của màn hình gom vào đây, dọn khi rời màn ===== */
  let cleanups = [];
  let currentActions = null; // action riêng của màn đang mở (screenActions)
  const lifecycle = {
    later(fn, ms) { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); return id; },
    every(fn, ms) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); return id; },
    loop(fn) {
      let alive = true, last = performance.now();
      const step = now => { if (!alive) return; fn(Math.min(0.1, (now - last) / 1000), now); last = now; requestAnimationFrame(step); };
      requestAnimationFrame(step);
      cleanups.push(() => { alive = false; });
    },
    on(el, type, fn, opts) { el.addEventListener(type, fn, opts); cleanups.push(() => el.removeEventListener(type, fn, opts)); },
    onCleanup(fn) { cleanups.push(fn); }
  };
  // Listener sống suốt app (module.init dùng): không dọn khi đổi màn
  const lifecycleGlobal = {
    on(el, type, fn, opts) { el.addEventListener(type, fn, opts); },
    every(fn, ms) { return setInterval(fn, ms); }
  };
  function runCleanups() {
    closeDialog();
    const list = cleanups; cleanups = []; currentActions = null;
    list.forEach(fn => { try { fn(); } catch (e) { /* bỏ qua */ } });
  }

  /* ===== Router: stack đồng bộ history (mẫu STOP-4P js/app.js:84–113) =====
     Mỗi mục lịch sử mang { gen, depth }; gen tăng mỗi lần resetTo để Back không quay về lượt cũ. */
  const SCREENS = {};
  let gen = 0, fwd = [];
  const histState = () => ({ gen, depth: state.stack.length });
  function pushHist() { try { history.pushState(histState(), ''); } catch (e) { /* file:, sandbox */ } }
  function replaceHist() { try { history.replaceState(histState(), ''); } catch (e) { /* bỏ qua */ } }
  /* Màn được bảo vệ (review C-1): đang ở trang khẩn tự hại (urgent) hoặc trang đi khám ngay (see_doctor) thì mọi
     go/resetTo KHÔNG do chị bấm (timer, module) bị bỏ qua và ghi vào `blockedNav`. Ngoại lệ duy nhất: đang ở see_doctor,
     module mở lại see_doctor (thêm lý do) thì được thay tại chỗ. Trên urgent không gì được chuyển màn tự động. */
  const PROTECTED = ['urgent', 'see_doctor'];
  let userDepth = 0;            // > 0 khi đang xử lý cú bấm / phím của chị
  let blockedNav = null;        // lần chuyển màn tự động gần nhất bị chặn {name, params, at}
  function navAllowed(name) {
    const cur = state.stack.length ? state.stack[state.stack.length - 1].name : null;
    if (!cur || !PROTECTED.includes(cur) || userDepth > 0) return true;
    if (cur === 'see_doctor' && name === 'see_doctor') return true;
    return false;
  }
  function go(name, params = {}, opts = {}) {
    if (!opts.force && !navAllowed(name)) { blockedNav = { name, params, at: Date.now() }; return false; }
    const top = state.stack[state.stack.length - 1];
    if (opts.replace && state.stack.length) { state.stack[state.stack.length - 1] = { name, params }; replaceHist(); }
    else {
      if (top && top.name === name && JSON.stringify(top.params || {}) === JSON.stringify(params || {})) return; // bấm đúp
      state.stack.push({ name, params });
      fwd = [];
      pushHist();
    }
    render();
    return true;
  }
  function back() {
    if (state.stack.length > 1) { fwd = state.stack.splice(state.stack.length - 1).concat(fwd); render(); }
  }
  window.addEventListener('popstate', e => {
    const s = e.state;
    if (!s || s.gen !== gen) { replaceHist(); return; }
    const d = Math.max(1, s.depth | 0);
    if (d < state.stack.length) { fwd = state.stack.splice(d).concat(fwd); render(); }
    else if (d > state.stack.length && fwd.length >= d - state.stack.length) { state.stack.push(...fwd.splice(0, d - state.stack.length)); render(); }
    else replaceHist();
  });
  const resetTo = (name, params = {}, opts = {}) => {
    if (!opts.force && !navAllowed(name)) { blockedNav = { name, params, at: Date.now(), reset: true }; return false; }
    gen++; state.stack = []; fwd = []; return go(name, params, { force: true });
  };
  // Quay về màn trước nếu có, không thì về trang chính (hoặc trang chào)
  function goBackOr(name) { if (state.stack.length > 1) history.back(); else resetTo(name || (S.mode() ? 'home' : 'welcome')); }

  let noFocus = false, renderedDay = null;
  const current = () => state.stack[state.stack.length - 1] || { name: 'welcome', params: {} };
  function render() {
    runCleanups();
    let top = current();
    let scr = SCREENS[top.name];
    // Guard: màn cần đã chọn cách dùng (tech design 3.4)
    if (!scr || (scr.needs === 'mode' && !S.mode())) { top = { name: 'welcome', params: {} }; scr = SCREENS.welcome; }
    const params = top.params || {};
    renderHeader(top.name, scr, params);
    const main = $('#main');
    const banners = moduleBanners(top.name);
    main.innerHTML = (banners ? `<div class="banners">${banners}</div>` : '') + `<div id="screen" class="screen">${scr.render(params)}</div>`;
    main.dataset.screen = top.name;
    document.title = (scr.title ? scr.title + ' · ' : '') + C.APP_NAME;
    renderedDay = today();
    if (scr.mount) scr.mount(main, params);
    if (!noFocus) {
      window.scrollTo(0, 0);
      const h = $('#screen h1', main) || $('#screen h2', main);
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }
  function rerender() { const y = window.scrollY; noFocus = true; try { render(); } finally { noFocus = false; } window.scrollTo(0, y); }

  /* ===== Header: ‹ · tên màn · Hỗ trợ · ☰ (UX 3.0) ===== */
  const extraMenu = [];   // từ module.headerMenu(api): [{label, act, run?}]
  function renderHeader(name, scr, params) {
    const noBack = typeof scr.noBack === 'function' ? scr.noBack(params) : !!scr.noBack;
    const canBack = state.stack.length > 1 && name !== 'home' && name !== 'welcome' && !noBack;
    const inFlow = !!S.mode();
    const items = [
      inFlow ? '<button type="button" data-go="home">Trang chính</button>' : '<button type="button" data-go="welcome">Trang chào</button>',
      inFlow ? '<button type="button" data-go="data">Dữ liệu của chị</button>' : '',
      '<button type="button" data-go="about">Giới thiệu</button>'
    ].concat(extraMenu.filter(m => !m.when || m.when()).map(m => `<button type="button" data-act="${esc(m.act)}">${esc(m.label)}</button>`));
    $('#header').innerHTML = `
      <div class="bar">
        ${canBack ? '<button type="button" class="icon-btn" data-act="back" aria-label="Quay lại">‹</button>' : '<span class="icon-spacer" aria-hidden="true"></span>'}
        <span class="bar-title">${esc(scr && scr.title || C.APP_NAME)}</span>
        <button type="button" class="pill-support" data-go="support"${name === 'support' ? ' aria-current="page"' : ''}>🤝 Hỗ trợ</button>
        <details class="menu">
          <summary class="icon-btn" aria-label="Mở menu">☰</summary>
          <nav class="menu-panel" aria-label="Menu">${items.join('')}</nav>
        </details>
      </div>`;
  }

  /* ===== Toast thay alert ===== */
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ===== Hộp thoại (Dialog / AlertDialog, UX mục 5): bẫy focus, Esc đóng, trả focus về nút mở =====
     dialog({ title, body (HTML đã esc), actions:[{label, value, kind}], defaultFocus, role }) → Promise<value|null> */
  let dlg = null;
  function dialog({ title, body = '', actions = [], defaultFocus = 0, role = 'alertdialog' } = {}) {
    closeDialog();
    return new Promise(resolve => {
      const prev = document.activeElement;
      const id = 'dlg' + Math.random().toString(36).slice(2, 8);
      const wrap = document.createElement('div');
      wrap.className = 'dlg-backdrop';
      wrap.innerHTML = `<div class="dlg" role="${role === 'dialog' ? 'dialog' : 'alertdialog'}" aria-modal="true" aria-labelledby="${id}"${body ? ` aria-describedby="${id}b"` : ''}>
        <h2 id="${id}" class="dlg-title" tabindex="-1">${esc(title)}</h2>
        ${body ? `<div id="${id}b" class="dlg-body">${body}</div>` : ''}
        <div class="btn-col">${actions.map((a, i) => `<button type="button" class="btn ${esc(a.kind || 'btn-secondary')} btn-block" data-dlg="${i}">${esc(a.label)}</button>`).join('')}</div>
      </div>`;
      const outside = [$('#main'), $('#header')].filter(Boolean);
      const ctl = {};
      const done = (v, byUser) => {
        if (dlg !== ctl) return;
        dlg = null;
        // G2-1: phần chạy sau `await dialog()` là microtask, chạy trước listener click ở document → giữ cờ "do chị bấm"
        // tới hết lượt task hiện tại, để điều hướng sau hộp thoại không bị router chặn trên màn khẩn
        if (byUser) { userDepth++; setTimeout(() => { userDepth--; }, 0); }
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        outside.forEach(el => { el.inert = false; el.removeAttribute('aria-hidden'); });
        if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
        resolve(v);
      };
      const onKey = e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null, true); return; }
        if (e.key === 'Tab') {
          const f = $$('button', wrap);
          if (!f.length) return;
          const i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      };
      wrap.addEventListener('click', e => {
        const b = e.target.closest('[data-dlg]');
        if (b) { const a = actions[+b.dataset.dlg]; done(a && a.value !== undefined ? a.value : +b.dataset.dlg, true); }
      });
      ctl.close = () => done(null);
      dlg = ctl;
      document.body.appendChild(wrap);
      outside.forEach(el => { el.inert = true; el.setAttribute('aria-hidden', 'true'); });
      document.addEventListener('keydown', onKey, true);
      const btns = $$('[data-dlg]', wrap);
      (btns[defaultFocus] || $('.dlg-title', wrap)).focus();
    });
  }
  function closeDialog() { if (dlg) dlg.close(); }

  /* ===== "Bấm lần nữa để xóa" dùng chung (AC-69, M-199) ===== */
  function confirmTwice(btn, { label2 = 'Bấm lần nữa để xóa', ms = 4000 } = {}, fn) {
    if (!btn) return;
    if (btn.dataset.armed === '1') {
      clearTimeout(btn._armT);
      btn.dataset.armed = ''; btn.classList.remove('is-armed');
      if (btn.dataset.label1 != null) btn.textContent = btn.dataset.label1;
      fn && fn();
      return;
    }
    btn.dataset.armed = '1'; btn.dataset.label1 = btn.textContent; btn.textContent = label2; btn.classList.add('is-armed');
    btn._armT = setTimeout(() => {
      if (!btn.isConnected) return;
      btn.dataset.armed = ''; btn.classList.remove('is-armed'); btn.textContent = btn.dataset.label1;
    }, ms);
    cleanups.push(() => clearTimeout(btn._armT));
  }

  /* ===== Tải file về máy (Blob + <a download>); CSV thêm BOM để Excel đọc đúng tiếng Việt ===== */
  function download(name, mime, text) {
    try {
      const body = /csv/.test(mime) && !String(text).startsWith('﻿') ? '﻿' + text : text;
      const url = URL.createObjectURL(new Blob([body], { type: mime + ';charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener'; a.hidden = true;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    } catch (e) { return false; }
  }
  const stamp = () => today().replace(/-/g, '');

  /* ===== Event delegation: data-go="màn" | data-act="hành động" ===== */
  const actions = {
    back: () => history.back(),
    home: () => resetTo(S.mode() ? 'home' : 'welcome')
  };
  const screenActions = obj => { currentActions = Object.assign({}, currentActions, obj); };
  document.addEventListener('click', e => { userDepth++; try { onClickDelegate(e); } finally { userDepth--; } });
  function onClickDelegate(e) {
    const menu = document.querySelector('details.menu[open]');
    if (menu && !e.target.closest('details.menu')) menu.open = false;
    const goEl = e.target.closest('[data-go]');
    const actEl = e.target.closest('[data-act]');
    // Phần tử nằm trong cùng thắng: data-act lồng trong data-go thì chạy action
    if (goEl && !(actEl && actEl !== goEl && goEl.contains(actEl))) {
      e.preventDefault();
      let params = {};
      if (goEl.dataset.params) { try { params = JSON.parse(goEl.dataset.params); } catch (err) { params = {}; } }
      const m = goEl.closest('details'); if (m) m.open = false;
      go(goEl.dataset.go, params);
      return;
    }
    if (actEl) {
      const fn = actions[actEl.dataset.act] || (currentActions && currentActions[actEl.dataset.act]);
      if (fn) {
        e.preventDefault();
        const m = actEl.closest('details'); if (m) m.open = false;
        fn(actEl, e);
      }
    }
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { const m = document.querySelector('details.menu[open]'); if (m) { m.open = false; const s = m.querySelector('summary'); if (s) s.focus(); } }
  });

  /* ===== Trang hiện lại / qua nửa đêm (AC-130, tech design 3.4) =====
     Màn có `dayLive: true` tự vẽ lại khi sang ngày mới; màn có onVisible() được gọi khi trang hiện lại. */
  function onVisible() {
    if (document.visibilityState === 'hidden') return;
    const top = current(), scr = SCREENS[top.name];
    if (!scr) return;
    if (typeof scr.onVisible === 'function') { try { scr.onVisible($('#main'), top.params || {}); } catch (e) { /* bỏ qua */ } }
    checkDay();
  }
  function checkDay() {
    const scr = SCREENS[current().name];
    if (scr && scr.dayLive && renderedDay && today() !== renderedDay && !dlg) rerender();
  }
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pageshow', onVisible);
  window.addEventListener('focus', onVisible);
  setInterval(checkDay, 20000);

  /* ===== Sự kiện của store → báo nhẹ ===== */
  let kickUnsavedShown = false;
  S.onChange(ev => {
    if (ev.type === 'blocked') { toast(T.blocked); return; }
    if (ev.type === 'bad_data') { setTimeout(() => toast(T.badData), 0); return; }
    if (ev.type === 'kick_unsaved') { if (!kickUnsavedShown) { kickUnsavedShown = true; toast(T.kickUnsaved); } return; }
    // Xóa dữ liệu (review NS-1): báo module (hook onCleared) và phát 'lstp:cleared' để mục đếm bỏ lượt dở trong bộ nhớ
    if (ev.type === 'change' && ev.op === 'clear' && ['kick', 'journey', 'all'].includes(ev.kind)) {
      for (const mod of modules) if (typeof mod.onCleared === 'function') { try { mod.onCleared(api, ev.kind); } catch (e) { /* bỏ qua */ } }
      try { window.dispatchEvent(new CustomEvent('lstp:cleared', { detail: { what: ev.kind } })); } catch (e) { /* bỏ qua */ }
    }
    if (ev.type === 'change' && (ev.kind === 'mode' || ev.kind === 'all')) {
      for (const mod of modules) if (typeof mod.onModeChange === 'function') { try { mod.onModeChange(api, S.mode()); } catch (e) { /* bỏ qua */ } }
    }
  });

  /* ===== Vào trang chính: chốt duy nhất (tech design 5.7.1) — A09 tự hiện một lần ở lần đầu ===== */
  function enterHome() {
    if (!S.profile.asked()) resetTo('due_date', { first: true });
    else resetTo('home');
  }

  /* ===== Liên hệ trong config: chỉ số đúng dạng mới thành tel: (AC-32, K-AC-27/35) ===== */
  function telHref(phone) {
    const p = String(phone || '').trim();
    if (!/^[0-9+ .]{3,16}$/.test(p)) return null;
    const d = p.replace(/[ .]/g, '');
    return /^\+?\d{3,15}$/.test(d) ? 'tel:' + d : null;
  }
  const contact = c => (c && telHref(c.phone)) ? { name: String(c.name || '').trim(), phone: String(c.phone).trim(), tel: telHref(c.phone) } : null;
  const emergencyTel = () => telHref(C.EMERGENCY_NUMBER) || 'tel:115';
  const emergencyNum = () => telHref(C.EMERGENCY_NUMBER) ? String(C.EMERGENCY_NUMBER) : '115';
  function channelsHTML() {
    const list = (Array.isArray(C.SUPPORT_CHANNELS) ? C.SUPPORT_CHANNELS : []).filter(ch => ch && (ch.name || ch.detail));
    if (!list.length) return ''; // trống → bỏ hẳn, không câu kỹ thuật
    return `<ul class="plain channels">${list.map(ch => {
      const tel = telHref(ch.phone);
      return `<li><b>${esc(ch.name)}</b>${ch.detail ? ` · ${esc(ch.detail)}` : ''}${tel ? ` · <a class="link-inline" href="${esc(tel)}">📞 ${esc(ch.phone)}</a>` : ''}</li>`;
    }).join('')}</ul>`;
  }

  /* ===== Helper an toàn cho module (tech design 3.3, PRD 9.1) ===== */
  // Thứ tự: tự hại → dấu hiệu nguy hiểm → thông tin nhận diện. Không lớp nào hạ mức lớp trước đã nâng.
  function safetyGate(text, ctx = {}) {
    const t = String(text || '');
    let flags = { selfHarm: false, obSigns: [], human: false, physical: false, loss: false };
    try { if (typeof E.safetyCheck === 'function') flags = Object.assign(flags, E.safetyCheck({ text: t, tension: ctx.tension ?? null, emotions: ctx.emotions || [] }) || {}); } catch (e) { /* engine lỗi: vẫn đi tiếp */ }
    const signs = Array.isArray(flags.obSigns) ? flags.obSigns : [];
    if (flags.selfHarm) return { route: 'urgent', hits: signs, flags };
    if (signs.length) return { route: 'see_doctor', hits: signs, flags, inline: !!ctx.inline };
    if (!ctx.skipPii && t.trim()) {
      let pii = [];
      try { pii = typeof E.detectPII === 'function' ? (E.detectPII(t) || []) : []; } catch (e) { pii = []; }
      if (pii.length) return { route: 'pii', hits: pii, flags };
    }
    return { route: 'ok', hits: [], flags };
  }
  // Bảng thông tin nhận diện (A.17, AC-22): vẽ vào `box`; handlers { onEdit, onDrop, onKeep, note }
  function piiPanel(box, hits, handlers = {}) {
    if (!box) return () => {};
    box.innerHTML = `<div class="pii-panel" role="alert">
      <p><b>Có thể có thông tin nhận diện:</b></p>
      <ul>${(hits || []).map(h => `<li><mark>${esc(h.text)}</mark> – ${esc(h.why)}</li>`).join('')}</ul>
      <p>Chị sửa lại nếu cần, rồi bấm lần nữa nhé.</p>
      ${handlers.note ? `<p>${esc(handlers.note)}</p>` : ''}
      <p class="fine">Bộ lọc không thể phát hiện mọi thông tin.</p>
      <div class="btn-col">
        <button type="button" class="btn btn-secondary btn-block" data-pii="edit">Sửa lại</button>
        <button type="button" class="btn btn-secondary btn-block" data-pii="drop">Bỏ đoạn đó</button>
        <button type="button" class="btn btn-ghost btn-block" data-pii="keep">Vẫn giữ</button>
      </div></div>`;
    const clear = () => { box.innerHTML = ''; };
    const handlePii = e => {
      const b = e.target.closest('[data-pii]');
      if (!b) return;
      const k = b.dataset.pii;
      const fn = k === 'edit' ? handlers.onEdit : k === 'drop' ? handlers.onDrop : handlers.onKeep;
      clear();
      if (fn) fn(hits);
    };
    lifecycle.on(box, 'click', handlePii);
    return clear;
  }
  // Bỏ các đoạn bị đánh dấu khỏi chữ ("Bỏ đoạn đó")
  const dropHits = (text, hits) => (hits || []).reduce((s, h) => h && h.text ? s.split(h.text).join('') : s, String(text || '')).replace(/[ \t]{2,}/g, ' ').trim();
  function stopSounds() {
    try { if (typeof P.stopAll === 'function') P.stopAll(); } catch (e) { /* bỏ qua */ }
    try { if (typeof SOUND.stopAll === 'function') SOUND.stopAll(0); } catch (e) { /* bỏ qua */ }
  }
  // MỘT màn khẩn chung (AC-78). from quyết lối ra (tech design 4.2); back = {name, params} cho "Mình chọn nhầm"
  function openUrgentOB({ reasons = [], signs = [], from = '', back = null } = {}) {
    stopSounds();
    const params = { reasons: reasons.slice(0, 10), signs: signs.slice(0, 20), from: String(from || '') };
    if (back && back.name) params.back = { name: back.name, params: back.params || {} };
    go('see_doctor', params, { replace: current().name === 'see_doctor' });
  }
  function profileNow() { try { return S.profile.get(); } catch (e) { return null; } }
  const born = () => { const p = profileNow(); return !!(p && p.born); };
  // Tuần thai đọc qua đây (tech design 5.7.1). null: chưa có ngày dự sinh, hoặc chị đã bấm "Con đã chào đời" (AC-138)
  function gestAge() { const p = profileNow(); if (!p || p.born) return null; return U.gestAge(p.edd, today()); }
  // Đánh dấu thói quen hôm nay: how 'a' tự đánh dấu (không đè dấu chị tự tick), 'x' tay. Trả true nếu có đổi.
  function markHabit(code, how = 'a') {
    try {
      const day = today();
      const cur = S.habits.getDay(day).marks[code] || '';
      if (how !== 'x' && cur) return false;
      return !!S.habits.setMark(day, code, how === 'x' ? 'x' : 'a');
    } catch (e) { return false; }
  }
  // Dòng trạng thái duyệt (A.24 khi draft; M-04 khi approved)
  function draftLine(item) {
    const st = item && item.status;
    if (st === 'approved') {
      const who = item.reviewedBy ? String(item.reviewedBy) : '';
      const when = item.reviewedAt ? U.fmtDay(String(item.reviewedAt).slice(0, 10)) : '';
      return who && when ? `<p class="draft-note">Nội dung đã được ${esc(who)} duyệt ngày ${esc(when)}.</p>` : '';
    }
    return C.ALLOW_DRAFT_CONTENT === false && st !== 'approved' ? '' : `<p class="draft-note">${esc(T.draft)}</p>`;
  }
  // Thẻ "Chị không phải một mình" (A.22) — FE-3 dùng ở màn gợi ý
  function humanCard({ withButton = true } = {}) {
    return `<div class="human-card">
      <h2 class="h3">🤝 Chị không phải một mình</h2>
      <p>Những gì chị đang mang đáng được lắng nghe. Chị có thể kể với chồng, với người thân, hay với bác sĩ, nữ hộ sinh lúc đi khám thai.</p>
      <p>Buồn hay lo kéo dài hơn hai tuần, chị nói với bác sĩ khám thai nhé. Chuyện này nhiều mẹ gặp, và có cách giúp.</p>
      ${channelsHTML()}
      ${withButton ? '<button type="button" class="btn btn-secondary btn-block" data-go="support">Xem các cách tìm hỗ trợ</button>' : ''}
    </div>`;
  }
  // Dòng theo cách dùng (A.25 / AC-12)
  function modeStrip() {
    const m = S.mode();
    if (m === 'local') return '<button type="button" class="mode-strip" data-go="data">Đang lưu trên máy này · Dữ liệu của chị ›</button>';
    if (m === 'account') {
      const r = S.remote() || {};
      const hasLogout = extraMenu.some(x => x.act === 'logout');
      return `<div class="mode-strip">Đã đăng nhập · ${esc(r.phoneMasked || '')}${hasLogout ? ' · <button type="button" class="link-inline" data-act="logout">Đăng xuất</button>' : ''}</div>`;
    }
    if (m === 'none') return `<p class="mode-strip">${esc(T.noSaveLine)}</p>`;
    return '';
  }

  /* ===== Tuần thai trên Trang chính (UX M01, PRD 3.9, A.25, A.29, luật 9.12) ===== */
  const eddLink = (label, cls = 'link') => `<button type="button" class="${cls}" ${goAttr('due_date', { from: 'home' })}>${esc(label)}</button>`;
  function past42Card() {
    const ob = contact(C.OB_CONTACT);
    const where = (C.OB_CONTACT && String(C.OB_CONTACT.name || '').trim()) || 'nơi chị đang khám thai';
    return `<div class="attn-box gest-card" role="note">
      <p><span aria-hidden="true">ℹ︎ </span>Đã qua ngày dự sinh hơn 2 tuần rồi. Chị liên hệ ${esc(where)} để được hẹn khám nhé. Nếu ngày dự sinh chưa đúng, chị sửa lại ở đây.</p>
      <div class="btn-col">
        ${ob ? `<a class="btn btn-secondary btn-block" href="${esc(ob.tel)}">📞 Gọi ${esc(ob.phone)}</a>` : ''}
        ${eddLink('Sửa ngày dự sinh', 'btn btn-secondary btn-block')}
        <button type="button" class="btn btn-ghost btn-block" data-act="bornAsk">Con đã chào đời 🌸</button>
      </div></div>`;
  }
  // Câu tuần thai theo số ngày (dùng ở M01 và xem trước A09)
  function gestText(g, { home = true } = {}) {
    if (!g) return '';
    if (g.totalDays < 280) return home ? `Hôm nay con được ${g.weeks} tuần ${g.days} ngày 🌱` : `Hôm nay con được ${g.weeks} tuần ${g.days} ngày`;
    if (g.totalDays === 280) return 'Hôm nay là ngày dự sinh của con 🌱';
    if (g.totalDays <= 294) return `Tuần ${g.weeks} + ${g.days} ngày · đã qua ngày dự sinh ${g.totalDays - 280} ngày. Chị nhớ đi khám theo lịch bác sĩ hẹn nhé.`;
    return '';
  }
  function gestBlock() {
    const p = profileNow();
    if (p && p.born) {
      return state.bornJustSet ? `<div class="gest-line"><p>Chúc hai mẹ con luôn Bình An.</p><button type="button" class="link" data-act="bornUndo">Hoàn tác</button></div>` : '';
    }
    const g = gestAge();
    if (!g) return `<p class="gest-add">${eddLink('Thêm ngày dự sinh ›')}</p>`;
    if (g.status === 'past42') return past42Card();
    if (g.status === 'before') return `<div class="attn-box gest-card"><p>${esc(T.eddWarn)}</p>${eddLink('Sửa ngày dự sinh', 'btn btn-secondary btn-block')}</div>`;
    return `<div class="gest-line"><p>${esc(gestText(g))}</p>${eddLink('Sửa ›')}</div>`;
  }
  // "Con đã chào đời" (A.29, AC-138): hỏi lại rồi ghi; Hoàn tác ở cùng chỗ
  const bornActions = {
    bornAsk: async () => {
      const v = await dialog({
        title: 'Con đã chào đời 🌸',
        body: '<p>Chúc mừng hai mẹ con! Mình sẽ thôi hiện tuần thai và tắt mục Đếm cử động thai. Những gì chị đã lưu vẫn còn nhé.</p>',
        actions: [{ label: 'Đúng rồi', value: 'yes', kind: 'btn-primary' }, { label: 'Thôi', value: 'no' }], defaultFocus: 1
      });
      if (v !== 'yes') return;
      S.profile.setBorn(today());
      state.bornJustSet = true;
      rerender();
    },
    bornUndo: () => { S.profile.setBorn(null); state.bornJustSet = false; rerender(); }
  };

  /* ===== API cho module và players (tech design 3.3) ===== */
  const modules = [];
  const api = {
    C, U, S, D, E,
    K: window.LSTP_KICK_RULES || {}, ST: window.LSTP_STATS || {},
    SOUND, P, A: window.LSTP_API || {},
    state, lifecycle, lifecycleGlobal, go, back, resetTo, goBackOr, rerender, screenActions, esc, toast,
    dialog, closeDialog, confirmTwice, download, capy, reduceMotion, enterHome,
    now: () => Date.now(),
    today,
    mode: () => S.mode(),
    canSave: kind => S.canSave(kind),
    safetyGate, piiPanel, dropHits, openUrgentOB, stopSounds,
    gestAge, gestText: g => gestText(g), born, markHabit,
    draftLine, humanCard, modeStrip, telHref, contact, channelsHTML,
    fmtDay: U.fmtDay,
    // Công tắc tiếng chung (K-AC-11), lưu ở lstp_v1_prefs theo đồng ý
    sound: {
      muted: () => { try { return S.prefs.get().sound === false; } catch (e) { return false; } },
      setMuted: m => S.prefs.set({ sound: !m })
    },
    screens: () => Object.keys(SCREENS),
    // Trang khẩn đang mở? (module tự hoãn việc chuyển màn); lần chuyển màn tự động bị chặn gần nhất
    isProtected: () => PROTECTED.includes(current().name),
    blockedNav: () => blockedNav,
    hasScreen: name => !!SCREENS[name]
  };
  // window.LSTP_APP cho test e2e / bảng điều khiển: điều hướng không bị chặn bởi màn được bảo vệ.
  // Module KHÔNG dùng window.LSTP_APP; module nhận `api` (có chặn) qua screens(api)/init(api).
  window.LSTP_APP = Object.assign(Object.create(api), {
    go: (name, params = {}, opts = {}) => go(name, params, Object.assign({}, opts, { force: true })),
    resetTo: (name, params = {}) => resetTo(name, params, { force: true })
  });

  /* ===================================================================
     MÀN LÕI
     =================================================================== */

  /* ===== A01 – Chào (A.1, AC-10; Bước A ẩn nút đăng nhập, K-2) ===== */
  const choice = (icon, title, sub, attrs) => `<button type="button" class="btn-choice" ${attrs}>
      <span class="choice-ic" aria-hidden="true">${icon}</span>
      <span class="choice-txt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
      <span class="choice-arrow" aria-hidden="true">›</span></button>`;
  SCREENS.welcome = {
    title: 'Chào chị',
    render: () => `<section class="card stack">
      ${FIGURE}
      <p><span class="badge-tag">🌸 Mẹ Bầu An Yên</span></p>
      <h1>Chào chị,</h1>
      <p class="lead">Mỗi ngày, chị dành một chút thời gian cho mình và cho con nhé.</p>
      <div class="choice-grid">
        ${C.ACCOUNT_ENABLED ? choice('📱', 'Đăng nhập bằng số điện thoại', 'Lưu nhật ký thói quen, xem lại trên máy khác', 'data-go="login"') : ''}
        ${choice('🕊️', 'Dùng ẩn danh', 'Không cần số điện thoại', 'data-go="guest_choice"')}
      </div>
      ${C.ACCOUNT_ENABLED
        ? '<p class="fine">App không hỏi tên. Khi chị đăng nhập, mình lưu hành trình mang thai của chị (thói quen, lượt đếm và bước chân con, mức căng) vào tài khoản ở bệnh viện. Lời nhắn chị viết cho con chỉ lên tài khoản khi chị tự chọn.</p>'
        : '<p class="fine">Đăng nhập bằng số điện thoại sẽ có ở bản sau.</p><p class="fine">App không hỏi tên.</p>'}
      <p class="fine">App không thay cho việc khám thai. Thấy điều gì lạ trong người, chị đi khám nhé.</p>
      <button type="button" class="link" data-go="signs">Dấu hiệu cần đi khám ngay ›</button>
    </section>`
  };

  /* ===== A02 – Chị muốn lưu trên máy này không? (không ghi khóa nào ở màn này) ===== */
  SCREENS.guest_choice = {
    title: 'Ẩn danh',
    render: () => `<section class="card stack">
      <h1>Chị muốn lưu trên máy này không?</h1>
      <div class="choice-grid">
        ${choice('💾', 'Lưu trên máy này', 'Chỉ máy này xem được. Có thống kê thói quen trên máy.', 'data-go="consent_local"')}
        ${choice('🍃', 'Không lưu gì', 'Đóng trang là mất.', 'data-act="startNone"')}
      </div>
      <p class="fine">Ẩn danh thì app không gửi gì lên mạng.</p>
    </section>`,
    mount() { screenActions({ startNone: () => { S.startNone(); enterHome(); } }); }
  };

  /* ===== A03 – Chị muốn lưu những gì? (A.2; AC-13, 14: chưa ghi khóa nào trước "Tiếp tục") ===== */
  SCREENS.consent_local = {
    title: 'Lưu trên máy',
    render: () => `<section class="card stack text-left">
      <h1>Chị muốn lưu những gì?</h1>
      <p>Mỗi mục là một lựa chọn riêng. Chị đổi lại được bất cứ lúc nào nhé.</p>
      <div class="check-list">
        <label class="check-row" for="c-journey">
          <input type="checkbox" id="c-journey" checked aria-describedby="c-journey-d">
          <span><b>Lưu hành trình</b><small id="c-journey-d">cảm xúc chị chọn, mức căng, bài đã thử, thói quen đã tick, lượt đếm cử động thai, những ngày đã làm thai giáo, ngày dự sinh.</small></span>
        </label>
        <p id="c-err" class="error-box" role="alert" tabindex="-1" hidden></p>
        <label class="check-row" for="c-writing">
          <input type="checkbox" id="c-writing" aria-describedby="c-writing-d">
          <span><b>Lưu cả những gì chị tự viết</b><small id="c-writing-d">lời nhắn cho con, ghi chú. Mặc định tắt.</small></span>
        </label>
      </div>
      <div class="attn-box"><p><span aria-hidden="true">🔒 </span>Dữ liệu nằm trong trình duyệt của máy này. Ai mở được trình duyệt này cũng xem được. Máy dùng chung thì chị chọn "không lưu" nhé.</p></div>
      <button type="button" class="btn btn-primary btn-block" data-act="consentGo">Tiếp tục ›</button>
      <button type="button" class="link" data-act="startNone">Thôi, không lưu gì</button>
    </section>`,
    mount(root) {
      const err = $('#c-err', root), j = $('#c-journey', root);
      lifecycle.on(j, 'change', () => { if (j.checked) { err.hidden = true; err.textContent = ''; j.removeAttribute('aria-invalid'); } });
      screenActions({
        consentGo: () => {
          if (!j.checked) {
            err.textContent = '⚠ Muốn lưu, chị cần chọn mục đầu tiên. Không muốn lưu thì chị chọn "Thôi, không lưu gì" nhé.';
            err.hidden = false; j.setAttribute('aria-invalid', 'true'); err.focus();
            return;
          }
          if (!S.startLocal({ writing: $('#c-writing', root).checked })) { toast(T.blocked); S.startNone(); }
          enterHome();
        },
        startNone: () => { S.startNone(); enterHome(); }
      });
    }
  };

  /* ===== A09 – Con dự sinh vào ngày nào? (A.29; tech design 5.7; UX A09) ===== */
  SCREENS.due_date = {
    title: 'Ngày dự sinh',
    needs: 'mode',
    noBack: p => !!p.first,
    render: (params) => {
      const t = today(), min = U.dayAdd(t, U.EDD_MIN), max = U.dayAdd(t, U.EDD_MAX);
      const p = profileNow(), cur = (p && p.edd) || '';
      const y0 = +min.slice(0, 4), y1 = +max.slice(0, 4);
      const opt = (n, label) => `<option value="${n}">${esc(label)}</option>`;
      const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
      const saved = S.mode() === 'none' ? T.noSaveLine : 'Ngày này được lưu cùng hành trình của chị. Chị sửa lúc nào cũng được trong Dữ liệu của chị.';
      return `<section class="card stack">
        ${FIGURE}
        <h1>Con dự sinh vào ngày nào?</h1>
        <p class="lead">Mỗi ngày, mình tự tính con được bao nhiêu tuần. Chưa nhớ thì chị để sau cũng được nhé.</p>
        <div class="field text-left">
          <label for="edd" class="field-label">Ngày dự sinh</label>
          <p id="edd-hint" class="field-hint">Ngày dự sinh bác sĩ ghi trong sổ khám</p>
          <input id="edd" type="date" class="field-input field-date" min="${esc(min)}" max="${esc(max)}" value="${esc(cur)}" aria-describedby="edd-hint edd-preview edd-warn">
          <fieldset id="edd-parts" class="date-parts" hidden>
            <legend class="sr-only">Ngày dự sinh</legend>
            <label><span>Ngày</span><select id="edd-d" aria-describedby="edd-hint"><option value="">–</option>${range(1, 31).map(n => opt(n, String(n))).join('')}</select></label>
            <label><span>Tháng</span><select id="edd-m"><option value="">–</option>${range(1, 12).map(n => opt(n, String(n))).join('')}</select></label>
            <label><span>Năm</span><select id="edd-y"><option value="">–</option>${range(y0, y1).map(n => opt(n, String(n))).join('')}</select></label>
          </fieldset>
          <button type="button" class="link" data-act="eddParts" aria-controls="edd-parts" aria-expanded="false">Chọn bằng từng ô</button>
        </div>
        <div id="edd-preview" class="info-box" aria-live="polite"></div>
        <div id="edd-warn" class="attn-box" aria-live="polite"></div>
        <button type="button" id="edd-save" class="btn btn-primary btn-block wake" data-act="eddSave" aria-disabled="true" aria-describedby="edd-tip">Lưu ›</button>
        <p id="edd-tip" class="submit-hint" aria-live="polite">💡 Chị chọn ngày dự sinh, hoặc bấm Để sau nhé.</p>
        <button type="button" class="link" data-act="eddLater">Để sau</button>
        <p class="fine">${esc(saved)}</p>
      </section>`;
    },
    mount(root, params) {
      const input = $('#edd', root), parts = $('#edd-parts', root), toggle = $('[data-act=eddParts]', root);
      const pv = $('#edd-preview', root), warn = $('#edd-warn', root), save = $('#edd-save', root), tip = $('#edd-tip', root);
      const sel = id => $('#' + id, root);
      let usingParts = input.type !== 'date'; // trình duyệt không có ô ngày → dùng ba ô
      const setParts = on => {
        usingParts = on; parts.hidden = !on; input.hidden = on;
        toggle.setAttribute('aria-expanded', String(on));
        if (on && input.value) { const [y, m, d] = input.value.split('-'); sel('edd-y').value = String(+y); sel('edd-m').value = String(+m); sel('edd-d').value = String(+d); }
        if (on && input.type !== 'date') toggle.hidden = true;
      };
      const value = () => {
        if (!usingParts) return input.value || '';
        const d = sel('edd-d').value, m = sel('edd-m').value, y = sel('edd-y').value;
        return d && m && y ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
      };
      let ready = false;
      const show = (el, html) => { el.innerHTML = html; el.hidden = !html; };
      function evaluate() {
        const v = value();
        ready = false;
        if (!v) { show(pv, ''); show(warn, ''); tip.hidden = false; }
        else {
          const code = U.validEdd(v, today());
          tip.hidden = true;
          if (code !== 'ok') { show(pv, ''); show(warn, `<p><span aria-hidden="true">ℹ︎ </span>${esc(T.eddWarn)}</p>`); }
          else {
            const g = U.gestAge(v, today());
            show(pv, `<p>${esc(gestText(g, { home: false }))}</p>`);
            show(warn, g.totalDays < 28 ? `<p><span aria-hidden="true">ℹ︎ </span>${esc(T.eddWarn)}</p>` : ''); // dưới 4 tuần: lưu được, nhắc kiểm lại
            ready = true;
          }
        }
        save.setAttribute('aria-disabled', String(!ready));
        save.classList.toggle('ready', ready);
        if (v && !ready) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      }
      const leave = () => { if (params.first) resetTo('home'); else goBackOr('home'); };
      setParts(usingParts);
      ['input', 'change'].forEach(t => lifecycle.on(input, t, evaluate));
      ['edd-d', 'edd-m', 'edd-y'].forEach(id => lifecycle.on(sel(id), 'change', evaluate));
      evaluate();
      screenActions({
        eddParts: () => { setParts(!usingParts); evaluate(); (usingParts ? sel('edd-d') : input).focus(); },
        eddSave: () => {
          const v = value();
          if (!ready) { evaluate(); (usingParts ? sel('edd-d') : input).focus(); return; }
          if (S.profile.set(v) !== 'ok') { evaluate(); return; }
          const g = U.gestAge(v, today());
          toast(`Đã lưu. Hôm nay con được ${g.weeks} tuần ${g.days} ngày 🌱`);
          leave();
        },
        eddLater: () => { S.profile.markAsked(); leave(); }
      });
    }
  };

  /* ===== M01 – Trang chính (A.25, UX 3.2) ===== */
  // Ô Trang chính theo thứ tự PRD A.25: Thư giãn 10 · Thai giáo 20 · Đếm cử động thai 30 · Thói quen 40 · Hộp thư 50 ·
  // Hành trình 60 · Dữ liệu 70. Ô nào không có `order` thì lấy theo bảng dưới (module chưa gán), cuối cùng là 100.
  const homeTiles = [{ go: 'data', icon: '🔒', label: 'Dữ liệu của chị', sub: '', order: 70 }];
  const TILE_ORDER = { pause5: 10, relax: 10, thaigiao: 20, kick_home: 30, habits: 40, letters: 50, journey: 60, data: 70 };
  const tileOrder = t => Number.isFinite(t.order) ? t.order : (TILE_ORDER[t.go] ?? 100);
  const sortedTiles = () => homeTiles.map((t, i) => [t, i]).sort((a, b) => (tileOrder(a[0]) - tileOrder(b[0])) || (a[1] - b[1])).map(x => x[0]);
  SCREENS.home = {
    title: 'Trang chính',
    needs: 'mode',
    dayLive: true,
    render: () => {
      const isBorn = born();
      const tiles = sortedTiles()
        .filter(t => t && t.go && (!isBorn || !/^kick/.test(t.go)))   // AC-138: tắt ô Đếm cử động thai sau khi con chào đời
        .map(t => `<button type="button" class="tile" ${goAttr(t.go, t.params)}>
            <b>${t.icon ? `<span aria-hidden="true">${esc(t.icon)} </span>` : ''}${esc(t.label)}</b>${t.sub ? `<small>${esc(t.sub)}</small>` : ''}
            <span class="tile-arrow" aria-hidden="true">›</span></button>`).join('');
      const tops = moduleHomeTop();
      return `${modeStrip()}
        ${tops}
        <section class="card stack">
          <h1>Hôm nay chị muốn làm gì?</h1>
          ${gestBlock()}
          <div class="tile-grid">${tiles}</div>
          <p class="mantra">${esc(T.mantra)}</p>
          ${capy(9, { cls: 'mascot mascot-sm' })}
        </section>`;
    },
    mount() { screenActions(bornActions); }
  };

  /* ===== S01 – Hỗ trợ (thứ tự đúng AC-73) ===== */
  const KICK_SIGNS = ['Ra máu ở vùng kín', 'Rỉ nước hoặc ra nhiều nước ở vùng kín', 'Đau bụng nhiều', 'Bụng gò cứng từng cơn', 'Nhức đầu nhiều',
    'Mắt nhìn mờ, thấy đốm sáng', 'Mặt, tay hoặc chân sưng phù lên nhanh', 'Con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày',
    'Giờ đầu con cử động 3 lần trở xuống, và giờ thứ hai vẫn vậy.', 'Trong 2 giờ con cử động chưa đủ 10 lần.']; // M-142 (M-46…M-53 + 2 dòng)
  SCREENS.support = {
    title: 'Hỗ trợ',
    render: () => {
      const ob = contact(C.EMERGENCY_OB);
      return `<section class="card stack text-left">
        <h1>Hỗ trợ</h1>
        <button type="button" class="btn btn-urgent-outline btn-block" data-go="signs"><span aria-hidden="true">▲ </span>Dấu hiệu cần đi khám ngay ›</button>
        <a class="btn btn-urgent btn-block" href="${esc(emergencyTel())}">📞 Gọi ${esc(emergencyNum())}</a>
        ${ob ? `<a class="btn btn-urgent-outline btn-block" href="${esc(ob.tel)}">📞 Gọi ${esc(ob.name || 'khoa cấp cứu sản')}</a>` : ''}
        <div class="sub-card">
          <h2 class="h3">Khi nào chị cần đi khám ngay</h2>
          <p>Chị đi khám ngay, không chờ đếm, khi có một trong những điều này:</p>
          <ul class="bullets">${KICK_SIGNS.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
          <p>Linh cảm của mẹ cũng quan trọng. Chị thấy có gì khác lạ là đi khám nhé.</p>
          <div class="attn-box"><p><span class="lv-shape" aria-hidden="true">◆ </span>Giờ đầu con cử động 3 lần trở xuống thì chị đếm thêm 1 giờ, và liên hệ cơ sở sản khoa nếu còn lo.</p></div>
          ${SCREENS.kick_home && !born() ? '<button type="button" class="btn btn-secondary btn-block" data-go="kick_home">👣 Đếm cử động thai ›</button>' : ''}
        </div>
        ${humanCard({ withButton: false })}
      </section>`;
    }
  };

  /* ===== S02 – Dấu hiệu cần đi khám ngay (A.20; danh sách DANGER_SIGNS của data.js, AC-74) ===== */
  // Một danh sách cho ba nơi (tech design 6.2): engine.signs({place:'page'}) đã lọc dòng chưa duyệt
  const signList = () => {
    let L = [];
    try { L = typeof E.signs === 'function' ? E.signs({ place: 'page' }) : (Array.isArray(D.DANGER_SIGNS) ? D.DANGER_SIGNS : []).filter(s => s && s.enabled !== false); } catch (e) { L = []; }
    return (L || []).filter(s => s && s.id && s.label);
  };
  SCREENS.signs = {
    title: 'Dấu hiệu',
    render: () => {
      const list = signList();
      return `<section class="card stack text-left">
        <h1>Dấu hiệu cần đi khám ngay</h1>
        <p>Chị có một trong những điều dưới đây thì đi khám ngay nhé, không cần chờ tới lịch hẹn. Chạm vào điều chị đang gặp.</p>
        <div class="sign-list">${list.map(s => `<button type="button" class="sign-btn" data-act="pickSign" data-id="${esc(s.id)}">
            <span class="lv-shape urgent-ink" aria-hidden="true">▲</span><span>${esc(s.label)}</span><span aria-hidden="true">›</span></button>`).join('')}</div>
        ${list.length ? '' : `<a class="btn btn-urgent btn-block" href="${esc(emergencyTel())}">📞 Gọi ${esc(emergencyNum())}</a>`}
        <button type="button" class="link" data-act="noSign">Mình không có dấu hiệu nào, quay lại</button>
        ${draftLine(list[0] || { status: 'draft' })}
      </section>`;
    },
    mount() {
      screenActions({
        pickSign: el => {
          const id = el.dataset.id;
          // Dòng "con đạp ít" → lý do M-123, như R-06 (tech design 6.2)
          if (id === 'no_movement') {
            // R-06: đang có lượt đếm dở thì chốt đỏ lượt đó (FE-4 cung cấp api.kickReportReduced); silent: không tự chuyển màn
            try { if (typeof api.kickReportReduced === 'function') api.kickReportReduced({ from: 'signs', silent: true }); } catch (e) { /* bỏ qua */ }
            openUrgentOB({ reasons: ['mother_reported'], from: 'signs' });
          }
          else {
            // R-07: dấu hiệu nguy hiểm khác (ra máu, ra nước…) khi có lượt đếm dở → chốt đỏ lý do danger_sign (FE-4)
            try { if (typeof api.kickReportSigns === 'function') api.kickReportSigns({ from: 'signs', signs: [id], silent: true }); } catch (e) { /* bỏ qua */ }
            openUrgentOB({ signs: [id], from: 'signs' });
          }
        },
        noSign: () => goBackOr()
      });
    }
  };

  /* ===== S03 – Chị đi khám ngay nhé: TRANG KHẨN CHUNG (A.20, M-120…M-131, R-08, AC-78) ===== */
  const KICK_REASON = {
    h2_low: 'Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống.',          // M-121
    lt10_2h: 'Trong 2 giờ, con cử động chưa đủ 10 lần.',                    // M-122
    mother_reported: 'Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.' // M-123
  };
  const TAPPED_FROM = ['signs', 'kick_before', 'player', 'unwell'];
  const BACK_LINKS_FROM = ['checkin', 'signs', 'letter', 'thaigiao', 'unwell'];
  function urgentLines(p) {
    const signs = Array.isArray(p.signs) ? p.signs : [], reasons = Array.isArray(p.reasons) ? p.reasons : [];
    const tapped = TAPPED_FROM.includes(p.from);
    try {
      if (typeof E.urgentReasons === 'function') {
        const r = E.urgentReasons({ obSigns: tapped ? [] : signs, kickReasons: reasons, tappedSigns: tapped ? signs : [], kick: /^kick/.test(p.from || '') });
        if (Array.isArray(r) && r.length) return r.map(x => ({ text: String((x && x.text) || ''), intro: !!x && x.code === 'danger_sign_intro' })).filter(x => x.text);
      }
    } catch (e) { /* dùng bản dự phòng dưới */ }
    // Dự phòng khi engine chưa có urgentReasons: thứ tự R-15, không trùng
    const lab = id => { const s = (Array.isArray(D.DANGER_SIGNS) ? D.DANGER_SIGNS : []).find(x => x && x.id === id); return s ? String(s.label) : ''; };
    const out = [], seen = new Set();
    const add = x => { if (x.text && !seen.has(x.text)) { seen.add(x.text); out.push(x); } };
    reasons.forEach(c => add({ text: KICK_REASON[c] || '' }));
    const other = signs.filter(id => id !== 'no_movement').map(lab).filter(Boolean);
    if (signs.includes('no_movement')) add({ text: KICK_REASON.mother_reported });
    if (p.from === 'kick_before' && other.length) add({ text: 'Chị đang thấy:', sub: other });   // M-124
    else other.forEach(t => add({ text: t }));
    return out;
  }
  SCREENS.see_doctor = {
    title: 'Đi khám ngay',
    noBack: p => ['kick', 'player'].includes(p.from),
    render: (p) => {
      const lines = urgentLines(p);
      const ob = contact(C.EMERGENCY_OB);
      const obName = ob && ob.name ? ob.name : 'khoa cấp cứu sản';
      const links = BACK_LINKS_FROM.includes(p.from)
        ? `<button type="button" class="link" data-act="sdBack">Mình chọn nhầm / không phải lúc này, quay lại</button>
           <button type="button" class="link" data-act="sdBack">Mình đã đi khám rồi</button>`
        : p.from === 'kick_before' ? '<button type="button" class="link" data-act="sdBack">Mình chọn nhầm, quay lại</button>' : '';
      return `<section class="card stack text-left urgent-page">
        <div class="urgent-strip" aria-hidden="true"></div>
        <h1 class="urgent-h1"><span class="lv-shape" aria-hidden="true">▲ </span>Chị đi khám ngay nhé</h1>
        ${lines.length ? `<ul class="reason-box">${lines.map(l => l.intro ? `<li class="reason-intro"><span>${esc(l.text)}</span></li>` : `<li><span class="lv-shape" aria-hidden="true">▲</span><span>${esc(l.text)}${l.sub ? `<ul>${l.sub.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}</span></li>`).join('')}</ul>` : ''}
        <p>Mình không biết được chuyện gì đang xảy ra với con. Chỉ khi được khám mới biết. Chị đừng chờ đến mai, cũng đừng chờ đếm thêm nhé.</p>
        <p class="strong">🏥 Đến khoa cấp cứu sản gần nhất ngay bây giờ.</p>
        <a class="btn btn-urgent btn-block btn-tall" href="${esc(emergencyTel())}">📞 Gọi ${esc(emergencyNum())}</a>
        <p>📞 Gọi ${esc(emergencyNum())} nếu chị đau nhiều, ra nhiều máu, thấy choáng, co giật, khó thở nhiều, hoặc không tự đi được.</p>
        ${ob ? `<p>📞 Gọi ${esc(obName)}: ${esc(ob.phone)}</p><a class="btn btn-urgent-outline btn-block" href="${esc(ob.tel)}">📞 Gọi khoa cấp cứu sản</a>` : ''}
        <p>Nhờ người nhà đưa chị đi, chị đừng đi một mình nhé.</p>
        <p>Mang theo sổ khám thai và điện thoại có app này để bác sĩ xem.</p>
        <button type="button" class="btn btn-secondary btn-block" data-act="sdOk">Mình đã hiểu</button>
        ${links}
        <p class="fine">${esc(T.notDoctor)}</p>
      </section>`;
    },
    mount(root, p) {
      stopSounds(); // không âm thanh trên trang khẩn (K-AC-35)
      screenActions({
        sdOk: () => {
          // G2-3: trang khẩn của mục đếm được đẩy lên trên một màn thường khác (vd Gợi ý có thẻ A.22 sau trang tự hại)
          // → "Mình đã hiểu" quay về màn đó, không xóa nó bằng resetTo('kick_home')
          const below = state.stack.length > 1 ? state.stack[state.stack.length - 2].name : null;
          if (/^kick/.test(p.from || '') && below && !/^kick/.test(below) && !['home', 'welcome', ...PROTECTED].includes(below)) history.back();
          else if (/^kick/.test(p.from || '') && SCREENS.kick_home && S.mode()) resetTo('kick_home');
          else resetTo(S.mode() ? 'home' : 'welcome');
        },
        sdBack: () => {
          if (p.back && p.back.name && SCREENS[p.back.name]) go(p.back.name, p.back.params || {}, { replace: true });
          else goBackOr();
        }
      });
    }
  };

  /* ===== S04 – Trang hỗ trợ khẩn – tự hại (A.19; AC-23, 25, 27) =====
     params: { signs?: [] (khớp cả 9.3 → khối dẫn sang S03), from, back?, cont?: {name, params} cho "Mình đang an toàn…" } */
  SCREENS.urgent = {
    title: 'Hỗ trợ khẩn',
    render: (p) => {
      const signs = Array.isArray(p.signs) ? p.signs : [];
      return `<section class="card stack text-left urgent-page">
        <div class="urgent-strip" aria-hidden="true"></div>
        <h1>Cảm ơn chị đã chia sẻ</h1>
        <p>Một vài điều chị viết có thể liên quan tới sự an toàn của chị và con. App không biết chắc được. Và chị không phải một mình đối diện điều này.</p>
        <div class="urgent-box">
          <h2 class="h3">Nếu chị đang nghĩ tới việc làm hại bản thân, hay đang gặp nguy hiểm ngay lúc này</h2>
          <ul class="bullets">
            <li>Gọi ${esc(emergencyNum())} (cấp cứu), hoặc đến khoa cấp cứu gần nhất.</li>
            <li>Nói ngay với một người ở gần chị: chồng, mẹ, chị em, người hàng xóm. Đừng ở một mình nhé.</li>
          </ul>
          ${channelsHTML()}
        </div>
        <p>Trong lúc chờ, chị ngồi xuống, đặt chân chạm sàn, thở theo nhịp tự nhiên. Bài tập không thay được sự giúp đỡ của con người.</p>
        ${signs.length ? `<div class="attn-box"><p>Chị cũng nhắc tới dấu hiệu trong người cần đi khám.</p>
          <button type="button" class="btn btn-urgent-outline btn-block" data-act="urgSigns">Xem dấu hiệu cần đi khám ›</button></div>` : ''}
        <a class="btn btn-urgent btn-block btn-tall" href="${esc(emergencyTel())}">📞 Gọi ${esc(emergencyNum())}</a>
        <button type="button" class="btn btn-secondary btn-block" data-go="support">Xem các cách tìm hỗ trợ</button>
        <button type="button" class="btn btn-ghost btn-block btn-two" data-act="urgSafe"><span>Mình đang an toàn — đó chỉ là cách nói.</span> <span>Tiếp tục</span></button>
      </section>`;
    },
    mount(root, p) {
      stopSounds();
      screenActions({
        urgSigns: () => openUrgentOB({ signs: p.signs || [], from: p.from || 'checkin', back: p.back }),
        urgSafe: () => {
          if (p.cont && p.cont.name && SCREENS[p.cont.name]) go(p.cont.name, p.cont.params || {}, { replace: true });
          else goBackOr();
        }
      });
    }
  };

  /* ===== P01 – Dữ liệu của chị 🔒 (A.18, 10.6, 10.7, A.29; AC-17, 70–72, 109, 127, 138) ===== */
  const sw = (act, on, label, desc) => `<button type="button" class="switch" role="switch" aria-checked="${on}" data-act="${act}"${desc ? ` aria-describedby="${act}-d"` : ''}>
      <span class="sw-track" aria-hidden="true"><span class="sw-thumb"></span></span>
      <span class="sw-state" aria-hidden="true">${on ? 'Bật' : 'Tắt'}</span>
      <span class="sw-label">${esc(label)}</span></button>${desc ? `<p id="${act}-d" class="fine sw-desc">${esc(desc)}</p>` : ''}`;
  const NEVER = [   // PRD 10.7
    'Không hỏi tên, số căn cước. Số điện thoại chỉ dùng để đăng nhập.',
    'Không lưu mã PIN của chị ở dạng đọc được, ở bất kỳ đâu.',
    'Không gửi lời nhắn chị viết cho con lên mạng trừ khi chị tự bật "Lưu lời nhắn của mình lên tài khoản"; chị tắt và xóa được bất cứ lúc nào.',
    'Không cho ai xem dữ liệu của chị qua app. Không bảng xếp hạng, không so với người khác.',
    'Không có trang quản trị trong app, không có số điện thoại đặc biệt trong mã nguồn.'
  ];
  const dataSections = [];
  function eddSection() {
    const p = profileNow();
    if (p && p.born) return `<p>Chúc hai mẹ con luôn Bình An.</p><button type="button" class="btn btn-secondary" data-act="bornUndo">Hoàn tác</button>`;
    const bornBtn = '<button type="button" class="btn btn-ghost" data-act="bornAsk">Con đã chào đời 🌸</button>';
    if (!p || !p.edd) return `<div class="btn-row"><button type="button" class="btn btn-secondary" ${goAttr('due_date', { from: 'data' })}>Thêm ngày dự sinh</button>${bornBtn}</div>`;
    const g = U.gestAge(p.edd, today());
    return `<p>Ngày dự sinh: ${esc(U.fmtDay(p.edd))}</p>
      ${g && g.status === 'ok' ? `<p>Tuần ${g.weeks} + ${g.days} ngày</p>` : ''}
      <div class="btn-row">
        <button type="button" class="btn btn-secondary" ${goAttr('due_date', { from: 'data' })}>Sửa</button>
        <button type="button" class="btn btn-secondary" data-act="eddDel">Xóa</button>
        ${bornBtn}
      </div>`;
  }
  const promptText = id => {
    const L = D.PROMPTS || D.THAIGIAO_PROMPTS;
    const it = Array.isArray(L) ? L.find(x => x && (x.id === id || x.code === id)) : (L && typeof L === 'object' ? L[id] : null);
    return it ? String(it.text || it.title || it.label || id) : (id || '');
  };
  const habitLabel = code => { const L = Array.isArray(D.HABITS) ? D.HABITS : []; const h = L.find(x => x && (x.code === code || x.id === code)); return h ? String(h.label || h.title || code) : code; };
  SCREENS.data = {
    title: 'Dữ liệu',
    needs: 'mode',
    dayLive: true,
    render: () => {
      const m = S.mode(), c = S.consent() || {};
      const usingLine = m === 'local' ? 'Lưu trên máy này' : m === 'account' ? `Đã đăng nhập · ${(S.remote() || {}).phoneMasked || ''}` : 'Không lưu gì';
      const info = m === 'account'
        ? `Thói quen, lượt đếm cử động thai và mức căng của chị được lưu ở Google Sheet của bệnh viện. Mã PIN thì không bao giờ. Lời nhắn cho con chỉ khi chị bật "Lưu lời nhắn của mình lên tài khoản" (đang: ${S.canSave('textSync') ? 'bật' : 'tắt'}).`
        : 'App không gửi gì lên mạng. Những gì chị lưu nằm trong trình duyệt của máy này.';
      const sharedOrigin = /(^|\.)ditruyenhungvuong\.github\.io$/i.test(location.hostname || '');
      const canExport = m === 'local' || m === 'account';
      const sections = dataSections.map((s, i) => { try { return `<div class="sub-card" data-section="${esc(s.id || i)}">${s.render()}</div>`; } catch (e) { return ''; } }).join('');
      return `${modeStrip()}
      <section class="card stack text-left">
        <h1>Dữ liệu của chị 🔒</h1>
        <div class="sub-card">
          <h2 class="h3">Chị đang dùng: ${esc(usingLine)}</h2>
          <p>${esc(info)}</p>
          ${m === 'none' ? `<p class="fine">${esc(T.noSaveLine)}</p>` : ''}
        </div>
        <div class="sub-card">
          <h2 class="h3">Ngày dự sinh</h2>
          ${eddSection()}
        </div>
        ${m === 'local' ? `<div class="sub-card">
          <h2 class="h3">Đồng ý</h2>
          ${sw('swJourney', true, 'Lưu hành trình', 'cảm xúc chị chọn, mức căng, bài đã thử, thói quen đã tick, lượt đếm cử động thai, những ngày đã làm thai giáo, ngày dự sinh.')}
          ${sw('swWriting', !!c.writing, 'Lưu cả những gì chị tự viết', 'lời nhắn cho con, ghi chú. Mặc định tắt.')}
        </div>` : ''}
        <p class="fine">Máy dùng chung thì ai mở trình duyệt cũng xem được. Lúc đó chị dùng ẩn danh "không lưu", hoặc đăng nhập mà không chọn "máy riêng" và nhớ đăng xuất nhé.</p>
        ${sharedOrigin ? '<div class="attn-box"><p><span aria-hidden="true">🔒 </span>Trình duyệt này cũng mở các trang khác cùng địa chỉ ditruyenhungvuong.github.io. Về kỹ thuật, những trang đó đọc được dữ liệu chị lưu ở đây. Chị lo thì chọn "không lưu" và tải lời nhắn về máy nhé.</p></div>' : ''}
        ${canExport ? `<div class="sub-card">
          <h2 class="h3">Tải về</h2>
          <div class="btn-col">
            <button type="button" class="btn btn-secondary btn-block" data-act="expJson">Xuất tất cả (JSON)</button>
            <button type="button" class="btn btn-secondary btn-block" data-act="expLetters">Tải hộp thư (.txt)</button>
            <button type="button" class="btn btn-secondary btn-block" data-act="expHabits">Tải nhật ký thói quen (CSV)</button>
          </div>
        </div>
        <div class="sub-card">
          <h2 class="h3">Xóa</h2>
          <label class="field-label" for="del-day">Xóa đánh dấu của một ngày</label>
          <div class="btn-row">
            <input id="del-day" type="date" class="field-input field-date" max="${esc(today())}" value="${esc(today())}">
            <button type="button" class="btn btn-secondary" data-act="delDay">Xóa đánh dấu ngày này</button>
          </div>
          <div class="btn-col">
            <button type="button" class="btn btn-danger-soft btn-block" data-act="delJourney">Xóa cả hành trình mang thai</button>
            <button type="button" class="btn btn-danger-soft btn-block" data-act="delAll">Xóa toàn bộ dữ liệu trên máy</button>
          </div>
        </div>` : ''}
        ${sections}
        <div class="sub-card" id="privacy">
          <h2 class="h3">Những điều app không bao giờ làm</h2>
          <ul class="never">${NEVER.map(s => `<li><span aria-hidden="true">✕</span><span>${esc(s)}</span></li>`).join('')}</ul>
        </div>
      </section>`;
    },
    mount(root) {
      dataSections.forEach((s, i) => { if (typeof s.mount === 'function') { const el = $(`[data-section="${CSS.escape(String(s.id || i))}"]`, root); if (el) { try { s.mount(el); } catch (e) { /* bỏ qua */ } } } });
      const delAllAsk = async () => {
        const v = await dialog({
          title: 'Xóa toàn bộ dữ liệu trên máy',
          body: '<p>Mọi thứ chị đã lưu trên máy này sẽ mất, không lấy lại được.</p>',
          actions: [{ label: 'Mình hiểu, xóa toàn bộ', value: 'yes', kind: 'btn-urgent' }, { label: 'Thôi, giữ lại', value: 'no' }], defaultFocus: 1
        });
        if (v !== 'yes') return;
        stopSounds();
        S.clearAllLocal();
        state.bornJustSet = false;
        resetTo('welcome');
        toast('Đã xóa toàn bộ dữ liệu trên máy này.');
      };
      screenActions(Object.assign({}, bornActions, {
        eddDel: el => confirmTwice(el, {}, () => { S.profile.clear(); toast('Đã xóa ngày dự sinh.'); rerender(); }),
        swJourney: () => delAllAsk(),   // tắt "Lưu hành trình" = thôi lưu trên máy → hỏi như xóa toàn bộ
        swWriting: async el => {
          const on = el.getAttribute('aria-checked') === 'true';
          if (!on) { S.setLocalConsent({ writing: true }); toast(T.savedSettings); rerender(); return; }
          const v = await dialog({
            title: 'Những gì chị đã viết thì sao?',
            actions: [{ label: 'Xóa luôn những gì đã viết', value: 'drop', kind: 'btn-urgent' }, { label: 'Giữ những gì đã lưu, từ giờ không lưu thêm', value: 'keep' }], defaultFocus: 1
          });
          if (!v) return;
          S.setLocalConsent({ writing: false });
          if (v === 'drop') S.dropWriting();
          toast(T.savedSettings);
          rerender();
        },
        expJson: () => { download(`me-con-binh-an-${stamp()}.json`, 'application/json', JSON.stringify(S.exportAll(), null, 2)); },
        expLetters: () => {
          const list = S.letters.list();
          const body = list.map(l => `Lời mẹ kể – ${U.fmtDay(l.day)}\n${l.prompt ? `Lời nhắc hôm ấy: ${promptText(l.prompt)}\n` : ''}${l.text}\n`).join('\n');
          if (download(`hop-thu-gui-con-${stamp()}.txt`, 'text/plain', body || 'Hộp thư còn trống.\n')) toast('Đã tải lời nhắn về máy.');
        },
        expHabits: () => {
          const days = S.habits.range();
          const codesSeen = [];
          (Array.isArray(D.HABITS) ? D.HABITS.map(h => h && (h.code || h.id)).filter(Boolean) : []).concat(...days.map(d => Object.keys(d.marks)))
            .forEach(c => { if (!codesSeen.includes(c)) codesSeen.push(c); });
          const val = v => v === 'x' ? 'Đã làm' : v === 'a' ? 'Tự đánh dấu' : '';
          const rows = [['Ngày'].concat(codesSeen.map(habitLabel)).map(U.csvCell).join(',')]
            .concat(days.map(d => [U.fmtDay(d.day)].concat(codesSeen.map(c => val(d.marks[c]))).map(U.csvCell).join(',')));
          download(`nhat-ky-thoi-quen-${stamp()}.csv`, 'text/csv', rows.join('\r\n') + '\r\n');
        },
        delDay: el => {
          const day = ($('#del-day', root) || {}).value || '';
          if (!U.isDay(day)) { ($('#del-day', root) || el).focus(); return; }
          confirmTwice(el, {}, () => { S.habits.removeDay(day); toast(`Đã xóa đánh dấu ngày ${U.fmtDayShort(day)}.`); });
        },
        delJourney: async () => {
          const v = await dialog({
            title: 'Xóa cả hành trình mang thai?',
            body: '<p>Mọi lời nhắn, mốc thai giáo và bước chân của con sẽ mất trên máy này và trên tài khoản, không lấy lại được.</p>',
            actions: [{ label: 'Mình hiểu, xóa cả hành trình', value: 'yes', kind: 'btn-urgent' }, { label: 'Thôi, giữ lại', value: 'no' }], defaultFocus: 1
          });
          if (v !== 'yes') return;
          S.clearJourney();
          toast('Đã xóa hành trình.');
          rerender();
        },
        delAll: () => delAllAsk()
      }));
    }
  };

  /* ===== I01 – Giới thiệu (phiên bản, A.24, trạng thái duyệt, nguồn nhạc A.13, nguồn ảnh) ===== */
  SCREENS.about = {
    title: 'Giới thiệu',
    render: () => {
      const music = (Array.isArray(C.MUSIC_LINKS) ? C.MUSIC_LINKS : []).filter(x => x && x.title && x.source);
      return `<section class="card stack text-left">
        <h1>Giới thiệu</h1>
        <p>${esc(C.APP_NAME)} · phiên bản ${esc(C.VERSION)}</p>
        <p>${esc(T.mantra)}</p>
        ${draftLine({ status: (D.REVIEW && D.REVIEW.status) || 'draft', reviewedBy: D.REVIEW && D.REVIEW.reviewedBy, reviewedAt: D.REVIEW && D.REVIEW.reviewedAt })}
        <div class="sub-card">
          <h2 class="h3">Trạng thái duyệt</h2>
          <p>Ngưỡng ba mức của mục Đếm cử động thai: anh Thông duyệt 29/10/2026.</p>
          <p>Lời dẫn bài tập, lời nhắc thai giáo, danh sách dấu hiệu cần đi khám: bản thử nghiệm, đang chờ duyệt.</p>
        </div>
        <div class="sub-card">
          <h2 class="h3">Nguồn nhạc, âm thanh, hình ảnh</h2>
          ${music.length
            ? `<p>Nhạc trong app:</p><ul class="bullets">${music.map(x => `<li>${esc(x.title)} · ${esc(x.source)}${x.license ? ` · ${esc(x.license)}` : ''}</li>`).join('')}</ul>`
            : '<p>Nhạc trong app do đội tự dựng bằng mã.</p>'}
          <p>Âm thanh êm dịu: tự tạo ngay trong app, không lấy từ nguồn ngoài.</p>
          <p>Hình capybara: dùng lại từ hai app Nhật Ký Mẹ Bầu và Check-in Cảm Xúc Mẹ Bầu.</p>
          <p>Chữ: Baloo 2 và Nunito (Google Fonts, giấy phép SIL Open Font License 1.1).</p>
        </div>
        <p class="fine">${esc(T.notDoctor)}</p>
      </section>`;
    }
  };

  /* ===== Module registry (tech design 3.2, ADR 0004) =====
     Hook bắt buộc: screens(api). Tùy chọn: init, headerMenu [{label, act, run, when?}], dataSections [{id, render, mount}],
     homeTiles [{go, label, sub, icon?, params?}], onModeChange(api, mode).
     Hook thêm của FE-1 (tùy chọn): homeTop(api) → HTML đầu Trang chính (thẻ "đang đếm dở" L12);
     banner(api, screenName) → HTML dải trên mọi màn (dải "đang đếm", L12); bootRoute(api) → {name, params} | null (F12). */
  function moduleBanners(name) {
    return modules.map(m => { if (typeof m.banner !== 'function') return ''; try { return m.banner(api, name) || ''; } catch (e) { return ''; } }).join('');
  }
  function moduleHomeTop() {
    return modules.map(m => { if (typeof m.homeTop !== 'function') return ''; try { return m.homeTop(api) || ''; } catch (e) { return ''; } }).join('');
  }
  function registerModules() {
    const mods = window.LSTP_MODULES || [];
    for (const mod of mods) {
      if (!mod) continue;
      modules.push(mod);
      const scr = typeof mod.screens === 'function' ? mod.screens(api) || {} : {};
      for (const key of Object.keys(scr)) {
        if (SCREENS[key]) throw new Error('Trùng tên màn "' + key + '" (module ' + mod.name + ')');
        SCREENS[key] = scr[key];
      }
      if (typeof mod.homeTiles === 'function') homeTiles.push(...(mod.homeTiles(api) || []));
      if (typeof mod.headerMenu === 'function') {
        for (const it of (mod.headerMenu(api) || [])) {
          if (!it || !it.act) continue;
          extraMenu.push(it);
          if (typeof it.run === 'function' && !actions[it.act]) actions[it.act] = it.run;
        }
      }
      if (typeof mod.dataSections === 'function') dataSections.push(...(mod.dataSections(api) || []));
      if (typeof mod.init === 'function') mod.init(api);
    }
  }

  /* ===== Khởi động ===== */
  function boot() {
    registerModules();
    const m = S.detectMode();
    if (m) S._setMode(m);
    // Quy tắc khởi động của module (vd lượt đếm dở, UX F12) chạy trước mọi điều hướng khác
    let route = null;
    for (const mod of modules) {
      if (route || typeof mod.bootRoute !== 'function') continue;
      try { route = mod.bootRoute(api); } catch (e) { route = null; }
    }
    if (route && route.name && SCREENS[route.name]) resetTo(route.name, route.params || {});
    else resetTo(m ? 'home' : 'welcome');   // AC-18: đã lưu trên máy → vào thẳng Trang chính
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
