/* =========================================================
   Mẹ Bầu An Yên – js/habits.js
   Chủ: FE-5 Thai giáo, Thói quen & Hành trình
   Đặc tả: tech design mục 4.3, 8 · UX N01–N03 (3.7) · PRD 3.8, AC-99…109, A.27, A.29 (mời bật ở tuần 28)
   Màn: habits (N01 hôm nay + 2 ngày trước), habits_choose (N02), habits_stats (N03: chuỗi ngày, lịch tháng,
   7 ngày qua — lời mềm, không đỏ, không trách khi lỡ ngày, không huy hiệu — AC-106).
   API cho module khác (FE-3, FE-4 tự đánh dấu): window.LSTP_HABITS.mark(code, day?, how?) và api.habits.
   Dữ liệu chỉ qua S.habits (store, FE-1); thống kê qua ST (stats.js, thuần). Mọi chuỗi vào HTML qua esc().
   Tải CSV và xóa đánh dấu một ngày (AC-109) nằm ở màn "Dữ liệu của chị" của lõi (FE-1), không lặp ở đây.
   Qua nửa đêm giờ VN: màn có dayLive nên lõi tự vẽ lại.
   ========================================================= */
(() => {
  'use strict';

  /* ===== Danh mục dự phòng (PRD 3.8, A.27) — chỉ dùng khi data.js (FE-2) chưa có D.HABITS ===== */
  const FALLBACK_HABITS = [
    { code: 'kick', icon: '👣', label: 'Đếm cử động thai', defaultOn: true, autoBy: 'kick' },
    { code: 'thai_giao', icon: '💌', label: 'Thai giáo', defaultOn: true, autoBy: 'thaigiao' },
    { code: 'breath', icon: '🌬️', label: 'Thở / ngân', defaultOn: true, autoBy: 'relax' },
    { code: 'move', icon: '🚶', label: 'Vận động sau ăn', defaultOn: false },
    { code: 'water', icon: '💧', label: 'Uống đủ nước', defaultOn: true },
    { code: 'side_sleep', icon: '🛏️', label: 'Đêm qua mình ngủ nghiêng', defaultOn: true }
  ];
  const EDIT_BACK_DAYS = 2;          // sửa được hôm nay và 2 ngày trước (AC-102, PRD câu 20)
  const KICK_INVITE_DAYS = 28 * 7;   // tuần 28 (A.29 "Mời bật thói quen ở tuần 28")

  let api = null;
  const st = () => (api.state.habits = api.state.habits || { day: null, ym: null, pick: null, table: false });
  const today = () => api.today();
  const fmtDM = day => day.slice(8, 10) + '/' + day.slice(5, 7);

  /* ===== Danh mục thói quen ===== */
  function habitList() {
    const D = (api && api.D) || window.LSTP_DATA || {};
    const src = Array.isArray(D.HABITS) && D.HABITS.length ? D.HABITS : FALLBACK_HABITS;
    return src.filter(h => h && typeof h.code === 'string').map(h => {
      const fb = FALLBACK_HABITS.find(f => f.code === h.code) || {};
      return { code: h.code, icon: String(h.icon || fb.icon || ''), label: String(h.label || fb.label || h.code), defaultOn: h.defaultOn !== undefined ? !!h.defaultOn : !!fb.defaultOn };
    });
  }
  const codes = () => habitList().map(h => h.code);
  const habitBy = code => habitList().find(h => h.code === code);
  // Tên kèm icon, không lặp icon nếu data.js đã gắn sẵn trong label
  const nameOf = h => (h.icon && !h.label.startsWith(h.icon) ? h.icon + ' ' : '') + h.label;

  /* ===== Lớp mỏng quanh store (FE-1). Mọi lỗi storage nuốt ở đây: màn hình không vỡ ===== */
  const S = () => api.S;
  const safe = (fn, dflt) => { try { const v = fn(); return v === undefined ? dflt : v; } catch (e) { return dflt; } };
  const getDay = day => safe(() => S().habits.getDay(day), null);
  const prefs = () => safe(() => S().habits.prefs(), null);
  function allDays() {
    // Lấy tối đa 400 ngày (store giữ 400 ngày). range() có thể trả object {day: HabitDay} hoặc mảng.
    const from = api.ST.addDays(today(), -400);
    const r = safe(() => S().habits.range(from, today()), null);
    const out = {};
    if (Array.isArray(r)) { for (const h of r) if (h && typeof h.day === 'string') out[h.day] = h; }
    else if (r && typeof r === 'object') { for (const k of Object.keys(r)) if (r[k] && typeof r[k] === 'object') out[k] = r[k]; }
    return out;
  }
  const kickSessions = () => { const l = safe(() => S().kick.list({}), []); return Array.isArray(l) ? l : []; };
  const gest = () => safe(() => (typeof api.gestAge === 'function' ? api.gestAge() : null), null);
  const profileEdd = () => safe(() => { const p = S().profile.get(); return p && p.edd; }, null);

  /* ===== Thói quen đang bật =====
     Chưa từng lưu cài đặt: theo mặc định PRD 3.8; "Đếm cử động thai" tắt khi có ngày dự sinh và con chưa đủ 28 tuần (A.29). */
  function enabledCodes() {
    const known = codes();
    const p = prefs();
    if (p && Array.isArray(p.enabled)) return known.filter(c => p.enabled.includes(c));
    const g = gest();
    const under28 = g && g.status === 'ok' && g.totalDays < KICK_INVITE_DAYS;
    return habitList().filter(h => h.defaultOn && !(h.code === 'kick' && under28)).map(h => h.code);
  }
  // Mời bật "Đếm cử động thai" một lần khi con vừa đủ 28 tuần: chưa bật, đã ≥ 28 tuần, và cài đặt chưa được lưu từ mốc đó
  // (bấm "Bật" hay "Để sau" đều lưu cài đặt → không hỏi lại). Không cần khóa lưu riêng.
  function kickInviteDue() {
    if (enabledCodes().includes('kick') || !codes().includes('kick')) return false;
    const g = gest();
    if (!g || g.status !== 'ok' || g.totalDays < KICK_INVITE_DAYS) return false;
    const edd = profileEdd();
    if (!edd) return false;
    const day28 = api.ST.addDays(edd, -(280 - KICK_INVITE_DAYS));
    const p = prefs();
    if (!p) return true;
    if (!Number.isFinite(p.at)) return true;
    return api.U.dayKey(p.at) < day28;
  }
  function setPrefs(list) {
    const ok = safe(() => { S().habits.setPrefs(codes().filter(c => list.includes(c))); return true; }, false);
    return ok;
  }

  /* ===== Ngày sửa được ===== */
  function editableDays() {
    if (api.mode() === 'none') return [today()];                 // không lưu: chỉ hôm nay (AC-108)
    return [EDIT_BACK_DAYS, 1, 0].map(n => api.ST.addDays(today(), -n));
  }
  const isEditable = day => editableDays().includes(day);

  /* ===== API công khai: đánh dấu thói quen (AC-101) =====
     mark(code, day = hôm nay, how = 'a') → { ok, val, changed, reason? }
       how 'a' = tự đánh dấu (Thư giãn, Thai giáo, Đếm cử động thai), 'x' = chị tick tay.
       Ngày đã 'x' thì 'a' không ghi đè. Ngày ngoài [hôm nay − 2, hôm nay] → { ok:false, reason:'day' }.
     unmark(code, day = hôm nay) → bỏ đánh dấu (chị chạm lại). */
  const H = {
    list: () => habitList(),
    enabled: () => enabledCodes(),
    editableDays,
    mark(code, day, how) {
      if (!api) return { ok: false, reason: 'not_ready' };
      const d = day || today();
      const h = how === 'x' ? 'x' : 'a';
      if (!codes().includes(code)) return { ok: false, reason: 'code' };
      if (!isEditable(d)) return { ok: false, reason: 'day' };
      const cur = ((getDay(d) || {}).marks || {})[code] || '';
      if (cur === 'x' || cur === h) return { ok: true, val: cur, changed: false };
      const ok = safe(() => { S().habits.setMark(d, code, h); return true; }, false);
      return ok ? { ok: true, val: h, changed: true } : { ok: false, reason: 'store' };
    },
    unmark(code, day) {
      const d = day || today();
      if (!codes().includes(code) || !isEditable(d)) return { ok: false, reason: 'day' };
      const ok = safe(() => { S().habits.setMark(d, code, ''); return true; }, false);
      return { ok, val: '', changed: ok };
    }
  };
  window.LSTP_HABITS = H;

  /* ===== Dự phòng khi store (FE-1) chưa có S.habits: giữ trong bộ nhớ, không ghi gì xuống máy ===== */
  function shimStore(S) {
    if (!S || (S.habits && typeof S.habits.setMark === 'function')) return;
    const mem = { prefs: null, days: {} };
    S.habits = {
      getDay: day => mem.days[day] || null,
      setMark(day, code, val) {
        const rec = mem.days[day] || { v: 1, day, marks: {}, at: 0 };
        rec.marks = Object.assign({}, rec.marks, { [code]: val }); rec.at = Date.now();
        mem.days[day] = rec;
      },
      range(from, to) { const o = {}; for (const k of Object.keys(mem.days)) if (k >= from && k <= to) o[k] = mem.days[k]; return o; },
      prefs: () => mem.prefs,
      setPrefs(list) { mem.prefs = { v: 1, enabled: list.slice(), at: Date.now() }; },
      removeDay(day) { delete mem.days[day]; },
      _shim: true
    };
  }

  /* ===== Mẩu giao diện dùng chung ===== */
  const modeLine = () => api.mode() === 'none' ? '<p class="fine hb-mode">Chế độ không lưu: đóng trang là mất.</p>' : '';
  function kickSub(day) {
    const n = api.ST.kickCountByDay(kickSessions(), day);
    const per = (api.C && api.C.KICK_SLOTS_PER_DAY) || 3;
    return 'từ tuần 28 · ' + n + '/' + per + ' lượt';
  }

  /* ===== N01 – Hôm nay chị đã làm được gì? ===== */
  function renderToday() {
    const s = st();
    const days = editableDays();
    if (!days.includes(s.day)) s.day = today();
    const day = s.day;
    const marks = (getDay(day) || {}).marks || {};
    const en = enabledCodes();
    const list = habitList().filter(h => en.includes(h.code));
    const labels = { 0: 'Hôm nay', 1: 'Hôm qua', 2: 'Hôm kia' };
    const switcher = days.length > 1 ? `
      <div class="hb-days" role="group" aria-label="Chọn ngày">
        ${days.map(d => { const back = -api.ST.dayDiff(today(), d); return `<button type="button" class="chip hb-day" data-act="hbDay" data-day="${api.esc(d)}" aria-pressed="${d === day}">${back ? '‹ ' : ''}${api.esc(labels[back])}${back ? '' : ' · ' + api.esc(fmtDM(d))}</button>`; }).join('')}
      </div>` : '';
    const invite = kickInviteDue() ? `
      <div class="hb-invite" role="region" aria-labelledby="hb-inv-t">
        <p id="hb-inv-t"><b>Con đã được 28 tuần.</b> Chị muốn thêm "Đếm cử động thai" vào nhật ký thói quen không?</p>
        <div class="hb-row">
          <button type="button" class="btn btn-secondary" data-act="hbInviteOn">Bật</button>
          <button type="button" class="btn-link" data-act="hbInviteLater">Để sau</button>
        </div>
      </div>` : '';
    const items = list.map(h => {
      const v = marks[h.code] || '';
      const subs = [];
      if (h.code === 'kick') subs.push(kickSub(day));
      if (v === 'a') subs.push('tự đánh dấu · Chạm để bỏ nếu chưa đúng');
      return `<li><button type="button" class="hb-btn${v ? ' on' : ''}" data-act="hbToggle" data-code="${api.esc(h.code)}" aria-pressed="${v ? 'true' : 'false'}">
          <span class="hb-ico" aria-hidden="true">${api.esc(h.icon)}</span>
          <span class="hb-txt"><b>${api.esc(h.icon && h.label.startsWith(h.icon) ? h.label.slice(h.icon.length).trim() : h.label)}</b>${subs.map(t => `<small>${api.esc(t)}</small>`).join('')}</span>
          <span class="hb-check" aria-hidden="true">✓</span>
        </button></li>`;
    }).join('');
    return `<section class="card hb">
      <h1>Hôm nay chị đã làm được gì?</h1>
      <p>Chạm vào việc chị đã làm. Chưa làm cũng không sao, ngày mai còn nữa mà.</p>
      ${invite}
      ${switcher}
      ${list.length ? `<ul class="hb-list">${items}</ul>` : `<p class="hb-empty">Chị đang tắt hết thói quen. Muốn thì chị bật lại vài việc trong "Chọn thói quen" nhé.</p>`}
      ${modeLine()}
      <p class="hb-links"><button type="button" class="btn-link" data-go="habits_choose">Chọn thói quen của chị ›</button></p>
      <button type="button" class="btn btn-secondary btn-block" data-go="habits_stats">Xem thống kê ›</button>
    </section>`;
  }
  function mountToday() {
    const s = st();
    const refocus = sel => { api.rerender(); const el = document.querySelector('#main ' + sel); if (el) el.focus(); };
    api.screenActions({
      hbDay: el => { s.day = el.dataset.day; refocus('[data-act=hbDay][data-day="' + s.day + '"]'); },
      hbToggle: el => {
        const code = el.dataset.code, day = s.day || today();
        const cur = ((getDay(day) || {}).marks || {})[code] || '';
        const r = cur ? H.unmark(code, day) : H.mark(code, day, 'x');
        if (r.ok && !cur) api.toast('Đã ghi nhận 💗');           // chạm tắt: không toast, aria-pressed đã đọc ra
        if (r.ok && navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* bỏ qua */ } }
        refocus('[data-act=hbToggle][data-code="' + code + '"]');
      },
      hbInviteOn: () => { setPrefs(enabledCodes().concat('kick')); api.toast('Đã lưu cài đặt.'); refocus('[data-act=hbToggle][data-code="kick"]'); },
      hbInviteLater: () => { setPrefs(enabledCodes()); refocus('h1'); }
    });
  }
  /* ===== N02 – Chọn thói quen ===== */
  function renderChoose() {
    const en = enabledCodes();
    const rows = habitList().map(h => {
      const on = en.includes(h.code);
      return `<li><button type="button" class="hb-switch" role="switch" aria-checked="${on}" data-act="hbSwitch" data-code="${api.esc(h.code)}">
        <span class="hb-ico" aria-hidden="true">${api.esc(h.icon)}</span>
        <span class="hb-sw-name">${api.esc(h.icon && h.label.startsWith(h.icon) ? h.label.slice(h.icon.length).trim() : h.label)}</span>
        <span class="sw" aria-hidden="true"><span class="sw-knob"></span></span>
        <span class="sw-txt" aria-hidden="true">${on ? 'Bật' : 'Tắt'}</span>
      </button></li>`;
    }).join('');
    return `<section class="card hb">
      <h1>Chị muốn theo dõi những gì?</h1>
      <ul class="hb-list">${rows}</ul>
      <p class="fine">Bác sĩ dặn nghỉ ngơi thì chị tắt "Vận động sau ăn" nhé.</p>
      ${api.mode() === 'none' ? '<p class="fine">Chế độ không lưu: đóng trang là mất.</p>' : ''}
      <button type="button" class="btn btn-primary btn-block" data-act="hbDone">Xong ›</button>
    </section>`;
  }
  function mountChoose() {
    api.screenActions({
      hbSwitch: el => {
        const code = el.dataset.code;
        const en = enabledCodes();
        const next = en.includes(code) ? en.filter(c => c !== code) : en.concat(code);
        if (!setPrefs(next)) { api.toast('Máy này đang chặn lưu dữ liệu. Mình chạy ở chế độ không lưu nhé.'); return; }
        api.rerender();
        const b = document.querySelector('#main [data-act=hbSwitch][data-code="' + code + '"]'); if (b) b.focus();
      },
      hbDone: () => {
        // Lưu lần nữa để đóng dấu thời điểm (cũng là "đã trả lời" lời mời tuần 28 nếu có)
        setPrefs(enabledCodes());
        api.toast('Đã lưu cài đặt.');
        if (api.state.stack && api.state.stack.length > 1) history.back(); else api.go('habits');
      }
    });
  }

  /* ===== N03 – Chị đã đi qua thế nào ===== */
  function renderStats() {
    const mode = api.mode();
    const C = api.C || {};
    if (mode === 'none') {
      return `<section class="card hb">
        <h1>Chị đã đi qua thế nào</h1>
        <p>Chế độ không lưu nên mình chưa có thống kê. Chị đăng nhập hoặc chọn "Lưu trên máy này" để xem lại các ngày nhé.</p>
        <div class="stack">
          ${C.ACCOUNT_ENABLED ? '<button type="button" class="btn btn-secondary" data-go="login">Đăng nhập bằng số điện thoại</button>' : ''}
          <button type="button" class="btn btn-secondary" data-go="consent_local">Lưu trên máy này</button>
        </div>
      </section>`;
    }
    const s = st();
    if (s.loading) {
      return `<section class="card hb" aria-busy="true">
        <h1>Chị đã đi qua thế nào</h1>
        <p role="status">Đang lấy thống kê của chị…</p>
        <div class="hb-skel" aria-hidden="true"><span></span><span></span><span></span></div>
      </section>`;
    }
    if (s.loadError === 'nocache') {
      return `<section class="card hb">
        <h1>Chị đã đi qua thế nào</h1>
        <p role="alert">Mạng đang chập chờn nên mình chưa lấy được thống kê.</p>
        <button type="button" class="btn btn-secondary" data-act="hbRetry">Thử lại</button>
      </section>`;
    }
    const ST = api.ST, esc = api.esc, t = today();
    const days = allDays();
    const en = enabledCodes();
    const list = habitList().filter(h => en.includes(h.code));
    const notes = [];
    if (mode === 'local') notes.push('<p class="fine">Thống kê này chỉ có trên máy này.</p>');
    const pending = safe(() => (typeof S().pendingCount === 'function' ? S().pendingCount() : 0), 0);
    if (mode === 'account' && pending > 0) notes.push('<p class="hb-note">Vài mục chưa gửi kịp, mình sẽ gửi khi có mạng.</p>');
    if (s.loadError === 'cache') notes.push('<p class="hb-note">Mạng đang chập chờn. Đây là thống kê lần trước trên máy này, có mạng mình cập nhật nhé.</p>');

    if (!ST.anyMarked(days, en)) {
      return `<section class="card hb">
        <h1>Chị đã đi qua thế nào</h1>
        ${notes.join('')}
        <p>Chưa có ngày nào được đánh dấu. Hôm nay chị chạm vào một việc đã làm nhé.</p>
        <button type="button" class="btn btn-primary btn-block" data-act="hbBackToday">‹ Về hôm nay</button>
      </section>`;
    }
    const [ty, tm] = [+t.slice(0, 4), +t.slice(5, 7)];
    if (!s.ym) s.ym = { y: ty, m: tm };
    const { y, m } = s.ym;
    const monthN = ST.monthCount(days, ty, tm, en);

    // Chuỗi ngày: một dòng mỗi thói quen, không thanh, không huy hiệu (A.27)
    const streaks = list.map(h => {
      const r = ST.streak(ST.markedDays(days, h.code), t);
      const txt = r.current > 0
        ? `${r.current} ngày liền · dài nhất ${Math.max(r.longest, r.current)} ngày`
        : 'Bắt đầu lại lúc nào cũng được. Một ngày nhỏ cũng là một ngày.';
      return `<li><span aria-hidden="true">${esc(h.icon)}</span> <b>${esc(plain(h))}:</b> ${esc(txt)}</li>`;
    }).join('');

    // Lịch tháng
    const grid = ST.monthGrid(y, m, days, en, t);
    const lead = ST.monthLead(y, m);
    const isCurMonth = y === ty && m === tm;
    const cells = Array.from({ length: lead }, () => '<span class="cal-cell cal-blank" aria-hidden="true"></span>').join('') +
      grid.map(c => {
        const lv = Math.min(c.n, 5);
        const dd = +c.day.slice(8, 10);
        const label = c.future ? `Ngày ${fmtDM(c.day)}: chưa tới` : `Ngày ${fmtDM(c.day)}: ${c.n} việc${c.today ? ', hôm nay' : ''}`;
        return `<button type="button" class="cal-cell heat-${lv}${c.today ? ' is-today' : ''}${s.pick === c.day ? ' is-pick' : ''}" data-act="hbPick" data-day="${esc(c.day)}"${c.future ? ' disabled' : ''} aria-label="${esc(label)}"${s.pick === c.day ? ' aria-current="date"' : ''}>
          <span class="cal-d">${dd}</span><span class="cal-n">${c.future ? '' : c.n}</span></button>`;
      }).join('');
    const pick = s.pick && s.pick.startsWith(y + '-' + String(m).padStart(2, '0')) ? s.pick : null;
    let detail = '';
    if (pick) {
      const mk = (days[pick] || {}).marks || {};
      const doneList = list.filter(h => mk[h.code] === 'x' || mk[h.code] === 'a');
      detail = `<p><b>Ngày ${esc(fmtDM(pick))}: chị đã làm ${doneList.length} việc.</b></p>` +
        (doneList.length ? `<ul class="hb-detail-list">${doneList.map(h => `<li>✓ ${esc(nameOf(h))}</li>`).join('')}</ul>` : '');
    }

    // 7 ngày qua
    const wk = ST.week(days, en, t);
    const bars = wk.map(w => {
      const h = habitBy(w.code);
      return `<li class="bar-row"><span class="bar-name">${esc(nameOf(h))}</span>
        <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${Math.round(w.n / 7 * 100)}%"></span></span>
        <span class="bar-val">${w.n}/7 ngày</span></li>`;
    }).join('');
    const d7 = ST.last7(t);
    const table = s.table ? `<div class="hb-table-wrap"><table class="hb-table">
        <caption>7 ngày qua, từng việc chị đã làm</caption>
        <thead><tr><th scope="col">Việc</th>${d7.map(d => `<th scope="col">${esc(fmtDM(d))}</th>`).join('')}</tr></thead>
        <tbody>${list.map(h => `<tr><th scope="row">${esc(nameOf(h))}</th>${d7.map(d => { const v = ((days[d] || {}).marks || {})[h.code]; return `<td>${v === 'x' || v === 'a' ? '✓ đã làm' : '–'}</td>`; }).join('')}</tr>`).join('')}</tbody>
      </table></div>` : '';

    return `<section class="card hb hb-stats">
      <h1>Chị đã đi qua thế nào</h1>
      ${notes.join('')}
      <p class="hb-month">Tháng này chị đã làm ${monthN} ngày.</p>
      <h2>Chuỗi ngày</h2>
      <ul class="hb-streaks">${streaks}</ul>
      <h2>Lịch tháng</h2>
      <div class="cal-head">
        <button type="button" class="icon-btn cal-nav" data-act="hbMonth" data-step="-1" aria-label="Tháng trước">‹</button>
        <span class="cal-title" aria-live="polite">Tháng ${m}/${y}</span>
        <button type="button" class="icon-btn cal-nav" data-act="hbMonth" data-step="1" aria-label="Tháng sau"${isCurMonth ? ' disabled' : ''}>›</button>
      </div>
      <div class="cal-wrap">
        <div class="cal-dow" aria-hidden="true"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
        <div class="cal-grid">${cells}</div>
      </div>
      <p class="fine">Ô càng đậm, hôm đó chị làm càng nhiều việc.</p>
      <div class="cal-legend" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map(n => `<span class="cal-cell heat-${n}"><span class="cal-n">${n === 5 ? '5+' : n}</span></span>`).join('')}</div>
      <div class="hb-detail" aria-live="polite">${detail}</div>
      <h2>7 ngày qua</h2>
      <ul class="bars">${bars}</ul>
      <button type="button" class="btn btn-secondary" data-act="hbTable" aria-expanded="${s.table}">${s.table ? 'Ẩn bảng' : 'Xem dạng bảng'}</button>
      ${table}
    </section>`;
  }
  const plain = h => (h.icon && h.label.startsWith(h.icon) ? h.label.slice(h.icon.length).trim() : h.label);
  function mountStats() {
    const s = st();
    // Bước B: đã đăng nhập thì kéo dữ liệu mới từ tài khoản (store/sync lo; ở Bước A không có S.pull)
    if (api.mode() === 'account' && typeof S().pull === 'function' && !s.loading && !s.pulled) {
      s.loading = true; s.loadError = null;
      Promise.resolve().then(() => S().pull(['habit', 'prefs', 'kick'])).then(() => { s.loadError = null; })
        .catch(() => { s.loadError = Object.keys(allDays()).length ? 'cache' : 'nocache'; })
        .then(() => { s.loading = false; s.pulled = true; if (document.querySelector('#main[data-screen=habits_stats]')) api.rerender(); });
    }
    api.screenActions({
      hbMonth: el => {
        const step = +el.dataset.step;
        let { y, m } = s.ym; m += step;
        if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
        s.ym = { y, m }; s.pick = null; api.rerender();
        const b = document.querySelector('#main [data-act=hbMonth][data-step="' + step + '"]');
        (b && !b.disabled ? b : document.querySelector('#main .cal-title')).focus?.();
      },
      hbPick: el => { s.pick = el.dataset.day; api.rerender(); const b = document.querySelector('#main [data-act=hbPick][data-day="' + s.pick + '"]'); if (b) b.focus(); },
      hbTable: () => { s.table = !s.table; api.rerender(); const b = document.querySelector('#main [data-act=hbTable]'); if (b) b.focus(); },
      hbBackToday: () => { s.day = today(); api.go('habits'); },
      hbRetry: () => { s.pulled = false; s.loadError = null; api.rerender(); mountStats(); }
    });
  }

  /* ===== Đăng ký module ===== */
  (window.LSTP_MODULES = window.LSTP_MODULES || []).push({
    name: 'habits',
    screens(a) {
      api = a;
      return {
        habits: { title: 'Thói quen', needs: 'mode', dayLive: true, render: renderToday, mount: mountToday },
        habits_choose: { title: 'Chọn thói quen', needs: 'mode', dayLive: true, render: renderChoose, mount: mountChoose },
        habits_stats: { title: 'Thống kê', needs: 'mode', dayLive: true, render: renderStats, mount: mountStats }
      };
    },
    init(a) {
      api = a;
      shimStore(a.S);
      a.habits = H;
      // FE-1 có api.markHabit riêng thì giữ; chưa có thì dùng của module này (cùng luật giữ 'x')
      if (typeof a.markHabit !== 'function') a.markHabit = (code, how) => H.mark(code, a.today(), how || 'a');
    },
    onModeChange() { if (api) api.state.habits = null; },
    homeTiles: () => [{ go: 'habits', icon: '✅', label: 'Nhật ký thói quen', sub: 'Hôm nay chị đã làm gì cho mình và cho con', order: 40 }]
  });
})();
