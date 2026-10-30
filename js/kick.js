/* =========================================================
   Mẹ Bầu An Yên – js/kick.js · module "kick" (Đếm cử động thai)
   Chủ: FE-4 Đếm cử động thai
   Đặc tả: docs/specs/dem-cu-dong-thai-prd.md v1.0 (R-01…R-17, AC-01…AC-78, Phụ lục A nguyên văn);
           docs/specs/lifestyle-thai-phu-tech-design.md mục 7; docs/specs/lifestyle-thai-phu-ux.md mục 2.10–2.12, 3.5, 3.6
   Màn: kick_home (K01), kick_before (K02), kick_pause5 (K03), kick_count (K04, thẻ ◆ L06, hộp dừng L07),
        kick_feel (K05), kick_result (K06), kick_stopped (K07), kick_track (K08), kick_footprints (K09),
        kick_guide (K10), kick_data (K11, hộp L08). Dải L12 "đang đếm" chèn dưới header mọi màn.
   Quy tắc:
   - Luật CHỈ gọi LSTP_KICK_RULES.evaluate (hàm thuần, giờ thật). Không tự viết luật ở đây.
   - Cần khám ngay → api.openUrgentOB({reasons, signs, from}) (trang khẩn chung của FE-1), dù chị đang ở màn nào.
   - Lưu qua S.kick (FE-1, tech design 5.5). Chưa có S.kick thì dùng lớp dự phòng trên S.raw, chỉ khóa lstp_kick_*.
   - Không gọi mạng. Âm thanh WebAudio chỉ sau cú chạm; lỗi âm/rung/hình không bao giờ chặn đếm.
   - Mọi chuỗi không phải hằng vào HTML qua esc(). Không alert/confirm/prompt.
   ========================================================= */
(() => {
  'use strict';
  const K = window.LSTP_KICK_RULES;

  /* ===== Chữ hiển thị (PRD Phụ lục A, trạng thái draft) ===== */
  const T = {
    selfMain: 'Con cử động khác mọi ngày',                                        // M-07
    selfSub: 'Ngừng máy, máy yếu hoặc ít hơn hẳn',
    back: '‹ Về trang Đếm cử động thai',                                               // M-06
    draft: 'Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt.',       // M-03
    m05: 'Không ai theo dõi ngay lúc chị đếm. Thấy con cử động khác mọi ngày, chị tự đi khám ngay nhé.',
    m20b: 'Mục này thường dùng từ tuần 28, hoặc khi bác sĩ dặn. Chị vẫn đếm được nếu muốn nhé.',
    m20a: 'Mỗi ngày 2–3 lần, sau bữa ăn, chị đếm cử động của con trong một giờ. Con đạp ở đâu, chị chạm vào đó nhé.',
    m30: 'Chị đang dùng ẩn danh và không lưu trên máy. Đóng app là các lượt đếm hôm nay sẽ mất.',
    m105: 'Nếu chị thấy con cử động khác mọi ngày, kể cả khi đã đếm đủ, chị đi khám ngay nhé.',
    m153: 'Nếu chị còn lo, chị liên hệ cơ sở sản khoa ngay, không cần chờ hết giờ.',
    m153a: 'Nếu chị còn lo, chị gọi cho nơi chị đang khám thai nhé.',
    m205: 'Mình không đọc được một phần dữ liệu cũ trên máy này nên đã bỏ qua phần đó.',
    m206: 'Máy chưa cho lưu, lượt này mình chỉ giữ tới khi chị đóng app.'
  };
  const SIGN_TEXT = {                                                            // M-46…M-53
    bleeding: 'Ra máu ở vùng kín',
    fluid: 'Rỉ nước hoặc ra nhiều nước ở vùng kín',
    pain: 'Đau bụng nhiều',
    contractions: 'Bụng gò cứng từng cơn',
    headache: 'Nhức đầu nhiều',
    vision: 'Mắt nhìn mờ, thấy đốm sáng',
    swelling: 'Mặt, tay hoặc chân sưng phù lên nhanh',
    no_movement: 'Con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày'
  };
  const MEAL_CHIPS = [['breakfast', '🌅 Sau ăn sáng'], ['lunch', '☀️ Sau ăn trưa'], ['dinner', '🌙 Sau ăn tối'], ['other', 'Lúc khác']]; // M-43
  const MEAL_TEXT = { breakfast: 'Sau ăn sáng', lunch: 'Sau ăn trưa', dinner: 'Sau ăn tối', other: 'Lúc khác' };
  const SLOT_TEXT = { morning: '🌅 Sáng', noon: '☀️ Trưa', evening: '🌙 Tối', other: 'Lúc khác' };      // M-23
  const SLOT_PLAIN = { morning: 'Sáng', noon: 'Trưa', evening: 'Tối', other: 'Lúc khác' };
  const ZONE_TEXT = {                                                            // M-173
    top_left: 'phía trên bên trái', top_right: 'phía trên bên phải',
    bottom_left: 'phía dưới bên trái', bottom_right: 'phía dưới bên phải', center: 'ở giữa'
  };
  const REASON_TEXT = {                                                          // M-121…M-123 (lý do trong bảng)
    h2_low: 'Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống.',
    lt10_2h: 'Trong 2 giờ, con cử động chưa đủ 10 lần.',
    mother_reported: 'Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.'
  };
  const RESULT_CSV = { green: 'Con cử động đều', yellow: 'Cần chú ý', red: 'Đã báo đi khám', stopped: 'Dừng giữa chừng', stopped_yellow: 'Dừng khi đang cần chú ý' }; // A.15
  const FEEL_CSV = { same: 'Như mọi ngày', different: 'Khác mọi ngày', skipped: 'Bỏ qua' };
  const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  /* ===== Hình nội tuyến (không phụ thuộc mạng, AC-66) ===== */
  const FOOT_SVG = '<svg viewBox="0 0 24 32" focusable="false" aria-hidden="true"><ellipse cx="12" cy="20.5" rx="6.6" ry="10"/><circle cx="5.6" cy="7.4" r="2.2"/><circle cx="9.4" cy="4.8" r="2.4"/><circle cx="13.8" cy="4.4" r="2.3"/><circle cx="17.6" cy="6.2" r="2"/><circle cx="19.9" cy="9.8" r="1.7"/></svg>';
  const HEART_SVG = '<svg viewBox="0 0 24 22" focusable="false" aria-hidden="true"><path d="M12 21s-8.6-5.3-10.8-10.4C-.4 6.6 2.3 1.5 6.7 1.5c2.4 0 4 1.3 5.3 3.1 1.3-1.8 2.9-3.1 5.3-3.1 4.4 0 7.1 5.1 5.5 9.1C20.6 15.7 12 21 12 21z"/></svg>';
  const SIDE_SVG = '<svg class="kick-side-pic" viewBox="0 0 160 70" focusable="false" aria-hidden="true"><rect x="6" y="52" width="148" height="10" rx="5" class="bed"/><circle cx="26" cy="36" r="10" class="skin"/><path d="M36 40 C 56 30, 70 30, 84 34 C 98 18, 124 20, 128 40 C 132 50, 118 54, 100 52 L 40 52 C 34 52, 32 46, 36 40 Z" class="dress"/><path d="M100 52 L 140 50 C 146 50, 148 54, 142 56 L 100 56 Z" class="skin"/></svg>';

  /* ===== Trạng thái riêng của mục (chỉ trong bộ nhớ) ===== */
  let api = null, C = {}, U = {}, S = {}, esc = s => String(s), cfg = null;
  const mem = {
    active: null, prefs: null, memSessions: {}, lastFinal: null,
    lastTap: null, attnAck: {}, yellowSeen: {}, rained: {}, finishing: false, routing: false,
    warned205: false, warned206: false,
    before: { meal: null, signs: [] }, fpRange: '7', trackCell: null, showTable: false
  };

  /* ===== Tiện ích nhỏ ===== */
  const isNum = v => typeof v === 'number' && isFinite(v);
  const round3 = v => Math.round(v * 1000) / 1000;
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const tz = () => (isNum(C.TZ_OFFSET_MIN) ? C.TZ_OFFSET_MIN : 420);
  const vnIso = ms => new Date(ms + tz() * 60000).toISOString();
  const hhmm = ms => vnIso(ms).slice(11, 16);
  const ddmm = ms => { const s = vnIso(ms); return s.slice(8, 10) + '/' + s.slice(5, 7); };
  const dayOf = ms => vnIso(ms).slice(0, 10);
  const dayNum = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000;
  const dayFromNum = n => new Date(n * 86400000).toISOString().slice(0, 10);
  const weekday = d => WEEKDAY[((dayNum(d) + 4) % 7 + 7) % 7];        // 1970-01-01 là thứ Năm
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const weekText = ga => (Number.isInteger(ga) ? 'Tuần ' + Math.floor(ga / 7) + ' + ' + (ga % 7) + ' ngày' : '');
  const weekCsv = ga => (Number.isInteger(ga) ? Math.floor(ga / 7) + ' tuần ' + (ga % 7) + ' ngày' : '');
  const now = () => api.now();
  const reduce = () => { try { return !!api.reduceMotion(); } catch (e) { return false; } };
  const screenName = () => { const st = api.state && api.state.stack; const top = st && st[st.length - 1]; return top ? top.name : ''; };
  const toast = msg => { try { api.toast(msg); } catch (e) { /* bỏ qua */ } };
  const warn205 = () => { if (!mem.warned205) { mem.warned205 = true; toast(T.m205); } };
  const warn206 = () => { if (!mem.warned206) { mem.warned206 = true; toast(T.m206); } };
  const params = obj => esc(JSON.stringify(obj));

  /* ===== Lưu trữ: S.kick (FE-1) nếu có, không thì lớp dự phòng trên S.raw — chỉ khóa lstp_kick_* =====
     Giả định interface tech design 5.5: S.kick.getActive · setActive · clearActive · save · list · remove · clearAll.
     Dự phòng: chế độ local → localStorage; none (và account trước khi FE-6 nối) → sessionStorage (AC-11, AC-80). */
  const KEYS = { sessions: 'lstp_kick_sessions', active: 'lstp_kick_active', prefs: 'lstp_kick_prefs' };
  const hasS = fn => !!(S && S.kick && typeof S.kick[fn] === 'function');
  const area = () => (api.mode() === 'local' ? 'local' : 'session');
  function readRawList() {
    if (!S.raw) return [];
    const txt = S.raw.get(area(), KEYS.sessions);
    if (txt == null) return [];
    let arr = null;
    try { arr = JSON.parse(txt); } catch (e) { arr = null; }
    if (!Array.isArray(arr)) { warn205(); return []; }
    return arr;
  }
  const store = {
    getActive() {
      if (mem.active) return mem.active;
      let raw = null, txt = null;
      try {
        if (hasS('getActive')) raw = S.kick.getActive();
        else if (S.raw) { txt = S.raw.get(area(), KEYS.active); raw = txt == null ? null : JSON.parse(txt); }
      } catch (e) { raw = null; if (txt != null) warn205(); }
      const a = raw ? K.clean(raw) : null;
      if (raw && !a) { warn205(); this.clearActive(); }
      mem.active = a;
      return a;
    },
    setActive(a) {
      mem.active = a;
      let ok = false;
      try { ok = hasS('setActive') ? !!S.kick.setActive(a) : !!(S.raw && S.raw.writeJSON(area(), KEYS.active, a)); } catch (e) { ok = false; }
      if (!ok) warn206();
    },
    clearActive() {
      mem.active = null;
      try {
        if (hasS('clearActive')) S.kick.clearActive();
        else if (S.raw) { S.raw.del('session', KEYS.active); S.raw.del('local', KEYS.active); }
      } catch (e) { /* bỏ qua */ }
    },
    list() {
      let raw = [];
      try { raw = hasS('list') ? S.kick.list({}) : readRawList(); } catch (e) { raw = []; }
      if (!Array.isArray(raw)) { warn205(); raw = []; }
      const out = [], seen = {};
      let bad = 0;
      raw.forEach(r => { const c = K.clean(r); if (c && !seen[c.id]) { seen[c.id] = 1; out.push(c); } else if (!c) bad++; });
      if (bad) warn205();
      Object.keys(mem.memSessions).forEach(id => { if (!seen[id]) out.push(mem.memSessions[id]); });
      return out.sort((a, b) => b.startAt - a.startAt);
    },
    save(rec) {
      const c = K.clean(rec);
      if (!c) return false;
      mem.lastFinal = c;
      let ok = false;
      try {
        if (hasS('save')) {
          const res = S.kick.save(c);                       // FE-1 trả bản ghi đã làm sạch hoặc null
          ok = !!res;
          // Lớp lưu chung chưa giữ gaDays → ngừng tính lại tuần thai để khỏi ghi lặp (báo FE-1)
          if (res && typeof res === 'object' && !('gaDays' in res)) mem.gaUnsupported = true;
        }
        else if (S.raw) {
          const keepFrom = c.startAt - 400 * 86400000;      // giữ 400 ngày (tech design 5.3)
          const list = readRawList().filter(x => x && x.id !== c.id && isNum(x.startAt) && x.startAt >= keepFrom);
          list.push(c);
          ok = S.raw.writeJSON(area(), KEYS.sessions, list);
        }
      } catch (e) { ok = false; }
      if (ok) delete mem.memSessions[c.id];
      else { mem.memSessions[c.id] = c; warn206(); }
      return ok;
    },
    remove(id) {
      delete mem.memSessions[id];
      if (mem.lastFinal && mem.lastFinal.id === id) mem.lastFinal = null;
      try {
        if (hasS('remove')) S.kick.remove(id);
        else if (S.raw && S.raw.get(area(), KEYS.sessions) != null) S.raw.writeJSON(area(), KEYS.sessions, readRawList().filter(x => !x || x.id !== id));
      } catch (e) { /* bỏ qua */ }
    },
    clearAll() {
      mem.memSessions = {}; mem.active = null; mem.prefs = null; mem.lastFinal = null;
      try {
        if (hasS('clearAll')) S.kick.clearAll();
        else if (S.raw) for (const k of Object.values(KEYS)) { S.raw.del('local', k); S.raw.del('session', k); }
      } catch (e) { /* bỏ qua */ }
    },
    // Công tắc tiếng, rung, đã xem thẻ hướng dẫn. Chế độ local: lstp_kick_prefs; chế độ khác: chỉ bộ nhớ.
    prefs() {
      if (mem.prefs) return mem.prefs;
      let p = null;
      try {
        if (hasS('prefs')) p = S.kick.prefs();
        else if (S.raw && api.mode() === 'local') p = S.raw.readJSON('local', KEYS.prefs);
      } catch (e) { p = null; }
      p = p && typeof p === 'object' ? p : {};
      mem.prefs = { v: 1, sound: p.sound !== false, vibrate: p.vibrate !== false, seenTip: p.seenTip === true };
      return mem.prefs;
    },
    setPrefs(patch) {
      mem.prefs = Object.assign({}, this.prefs(), patch);
      try {
        if (hasS('setPrefs')) S.kick.setPrefs(mem.prefs);
        else if (S.raw && api.mode() === 'local') S.raw.writeJSON('local', KEYS.prefs, mem.prefs);
      } catch (e) { /* bỏ qua */ }
    }
  };
  const findRec = id => store.list().find(x => x.id === id) || (mem.lastFinal && mem.lastFinal.id === id ? mem.lastFinal : null);

  /* ===== Tuần thai (chỉ để hiển thị và lưu gaDays; KHÔNG vào luật, R-17) =====
     Giả định: api.gestAge() → {totalDays, weeks, days, status} | null (FE-1); U.gestAge(edd, day); S.profile.get() → {edd}. */
  const gaOk = g => (g && Number.isInteger(g.totalDays) && g.totalDays >= 0 && g.totalDays <= 294 ? g.totalDays : null);
  function eddNow() {
    if (!(S.profile && typeof S.profile.get === 'function')) return undefined;   // chưa có phần chung → không biết
    try { const p = S.profile.get(); return p && typeof p.edd === 'string' ? p.edd : null; } catch (e) { return undefined; }
  }
  function gaDaysAt(ms) {
    try {
      const edd = eddNow();
      if (edd !== undefined && typeof U.gestAge === 'function') return edd ? gaOk(U.gestAge(edd, dayOf(ms))) : null;
      if (typeof api.gestAge === 'function') return gaOk(api.gestAge());
    } catch (e) { /* bỏ qua */ }
    return null;
  }
  function gaToday() {
    try { if (typeof api.gestAge === 'function') return api.gestAge(); } catch (e) { /* bỏ qua */ }
    return null;
  }
  // Sửa / xóa ngày dự sinh ở phần chung → tính lại gaDays của mọi lượt (AC-77). Chạy khi mở các màn của mục.
  function syncGa() {
    const edd = eddNow();
    if (edd === undefined || typeof U.gestAge !== 'function' || mem.gaUnsupported) return;
    store.list().forEach(rec => {
      let g = null;
      try { g = edd ? gaOk(U.gestAge(edd, dayOf(rec.startAt))) : null; } catch (e) { return; }
      if (g !== rec.gaDays) { rec.gaDays = g; store.save(rec); }
    });
  }

  /* ===== Nội dung dùng chung của app (FE-1, FE-2) theo interface; chưa có thì dùng chữ của đặc tả ===== */
  function kickSigns() {
    const D = (api && api.D) || window.LSTP_DATA || {};
    const list = Array.isArray(D.DANGER_SIGNS)
      ? D.DANGER_SIGNS.filter(s => s && s.kickBefore && s.enabled !== false && typeof s.id === 'string' && /^[a-z_]{2,24}$/.test(s.id))
      : [];
    if (!list.length) return Object.keys(SIGN_TEXT).map(id => ({ id, label: SIGN_TEXT[id] }));
    return list.map(s => ({ id: s.id, label: SIGN_TEXT[s.id] || String(s.kickLabel || s.label || s.id) }));
  }
  function signLabel(id) { const s = kickSigns().find(x => x.id === id); return s ? s.label : (SIGN_TEXT[id] || id); }
  function reviewLine() {
    const D = (api && api.D) || window.LSTP_DATA || {};
    const r = D.REVIEW && D.REVIEW.kick;
    if (r && r.status === 'approved' && r.by && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) {
      const d = String(r.date);
      return `<p class="fine kick-review">Nội dung đã được ${esc(r.by)} duyệt ngày ${esc(d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4))}.</p>`; // M-04
    }
    return `<p class="fine kick-review">${esc(T.draft)}</p>`;
  }
  // OB_CONTACT (◆) / EMERGENCY_OB: kiểm số bằng api.contact/telHref của lõi (một luật cho cả app, G-3)
  function contact(kind) {
    let x = null;
    try { x = typeof api.contact === 'function' ? api.contact(C && C[kind]) : null; } catch (e) { x = null; }
    return x && x.tel ? { tel: x.tel, name: String(x.name || '') } : { tel: '', name: '' };
  }
  function obCallBtn(cls) {
    const ob = contact('OB_CONTACT');
    if (!ob.tel) return '';
    return `<a class="btn ${cls || 'btn-secondary'} btn-block kick-call" href="${esc(ob.tel)}">📞 Gọi ${esc(ob.name || 'cơ sở sản khoa')}</a>`; // M-155
  }
  const selfBtn = sid => `<button type="button" class="btn-urgent-outline" data-act="kickSelfReport"${sid ? ` data-sid="${esc(sid)}"` : ''}>
      <span class="kick-self-main"><span aria-hidden="true">▲ </span>${esc(T.selfMain)}</span>
      <span class="kick-self-sub">${esc(T.selfSub)}</span></button>`;
  const backBtn = () => `<button type="button" class="btn btn-secondary btn-block" data-act="kickToHome">${esc(T.back)}</button>`;

  /* ===== Hình + chữ cho mức (không chỉ dùng màu, AC-64) ===== */
  function lv(level, hadYellow) {
    if (level === 'red') return { cls: 'urgent', shape: '▲', text: 'Đã báo đi khám' };
    if (level === 'stopped') return { cls: 'stop', shape: '✕', text: 'Dừng giữa chừng' };
    if (level === 'stopped_yellow') return { cls: 'attn', shape: '◆', text: 'Dừng khi đang cần chú ý' };
    if (level === 'yellow') return { cls: 'attn', shape: '◆', text: 'Cần chú ý' };
    if (level === 'green' && hadYellow) return { cls: 'ok', shape: '●', text: 'Đủ 10 lần trong 2 giờ' };
    if (level === 'green') return { cls: 'ok', shape: '●', text: 'Con cử động đều' };
    return { cls: 'none', shape: '', text: 'Đang đếm' };
  }
  const shape = l => (l.shape ? `<span class="kick-shape" aria-hidden="true">${l.shape}</span> ` : '');

  /* ===== Âm thanh, rung (US-12, PRD 5.6) =====
     Dùng api.SOUND.bum/giggle (FE-3) khi có; chưa có thì WebAudio nhỏ ở đây. Không <audio>, không Web Speech. */
  const fallbackAudio = {
    ctx: null,
    ensure() {
      if (this.ctx === false) return null;
      if (!this.ctx) {
        try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* bỏ qua */ }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this.ctx = false; return null; }
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    tone(type, f0, f1, at, dur, peak) {
      const ctx = this.ensure(); if (!ctx) return;
      const t0 = ctx.currentTime + at;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.02);
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    },
    bum() { this.tone('sine', 90, 55, 0, 0.14, 0.22); },                        // thịch trầm, nhỏ (UX 3.6)
    giggle() { [0, 0.15, 0.3].forEach((d, i) => this.tone('triangle', 600 + i * 60, 900 + i * 40, d, 0.11, 0.1)); }
  };
  function soundMuted() {
    try { if (api.SOUND && typeof api.SOUND.muted === 'function' && api.SOUND.muted()) return true; } catch (e) { /* bỏ qua */ }
    return !store.prefs().sound;
  }
  function play(kind) {
    if (soundMuted()) return;
    try {
      if (api.SOUND && typeof api.SOUND[kind] === 'function') api.SOUND[kind]();
      else fallbackAudio[kind]();
    } catch (e) { /* WebAudio lỗi: im lặng, vẫn đếm (AC-13) */ }
  }
  function buzz(pattern) {
    if (!store.prefs().vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* máy không có rung: bỏ qua (AC-12) */ }
  }
  function markHabit(rec) {
    if (!rec || (rec.level !== 'green' && rec.level !== 'red')) return;
    try { if (typeof api.markHabit === 'function') api.markHabit('kick', 'a'); } catch (e) { /* bỏ qua */ }
  }

  /* ===== Chốt lượt và chuyển màn ===== */
  function finalRecord(a, r) {
    return Object.assign({}, a, {
      endAt: r.finalAt, level: r.level, hadYellow: !!r.hadYellow, reasons: r.reasons.slice(),
      h1: r.h1, h2: r.h2, total: r.total, min4: r.min4, min10: r.min10
    });
  }
  // Ngăn xếp sau khi chốt: Trang chính › Đếm cử động thai › màn kết quả (Back không quay về lượt đã xong)
  function routeTo(name, prm) {
    api.resetTo('home');
    api.go('kick_home');
    if (typeof name === 'function') name(); else api.go(name, prm || {});
  }
  function openUrgent(reasons, signs, from) {
    api.openUrgentOB({ reasons: reasons.slice(), signs: (signs || []).slice(), from });
  }
  // Màn khẩn không bao giờ bị mục đếm chen hay đặt lại ngăn xếp (review C-1, PRD 9.1)
  const PROTECTED = ['urgent', 'see_doctor'];
  const isProtected = () => {
    try { if (typeof api.isProtected === 'function') return !!api.isProtected(); } catch (e) { /* dùng danh sách riêng */ }
    return PROTECTED.indexOf(screenName()) >= 0;
  };
  const isKickScreen = () => /^kick_/.test(screenName());
  // Mở trang khẩn khi lượt lên đỏ: đang ở màn của mục → ngăn xếp gọn; màn khác → đẩy lên trên (Back về chỗ cũ, chữ đang viết còn)
  function urgentFromKick(reasons, signs) {
    if (isKickScreen()) routeTo(() => openUrgent(reasons, signs, 'kick'));
    else openUrgent(reasons, signs, 'kick');
  }
  // opts.silent: chỉ ghi, không chuyển màn (gọi từ kiểm toàn app hoặc từ module khác)
  function finalize(a, r, opts) {
    const silent = !!(opts && opts.silent);
    mem.finishing = false;
    if (r.level === 'red') {
      const rec = finalRecord(a, r);
      store.save(rec); markHabit(rec);
      if (silent) { store.clearActive(); return rec; }       // người gọi (module khác) tự mở trang khẩn
      buzz(120);
      if (isProtected()) {
        // Đang ở trang khẩn: không chen (C-1). Lượt đỏ CHƯA được hiện thì giữ ở lstp_kick_active (level 'red')
        // để khi chị rời trang khẩn, hoặc mở lại app, vẫn vào trang khẩn của lượt đếm (R-09, F12)
        store.setActive(rec); showRedStrip(rec);
        return rec;
      }
      store.clearActive();                                   // tech design 7.3: đỏ → save, clearActive, trang khẩn
      routeRed(rec);
      return rec;
    }
    if (r.level === 'green' && r.needFeel) {
      store.setActive(a);
      if (!silent && screenName() !== 'kick_feel') routeTo('kick_feel');
      return null;
    }
    if (r.level === 'green' || r.level === 'stopped' || r.level === 'stopped_yellow') {
      const rec = finalRecord(a, r);
      store.save(rec); store.clearActive(); markHabit(rec);
      if (!silent) routeTo(r.level === 'green' ? 'kick_result' : 'kick_stopped', { id: rec.id });
      return rec;
    }
    return null;
  }
  // Tự báo (R-06): bất kỳ lúc nào, không hỏi lại. Có lượt đang đếm → lượt kết thúc đỏ.
  function selfReport(sid, asFeel) {
    const t = now();
    const a = store.getActive();
    if (a && (!sid || a.id === sid)) {
      a.motherReportedAt = t;
      if (asFeel) a.feel = 'different';
      store.setActive(a);
      return finalize(a, K.evaluate(a, t, cfg));
    }
    const rec = sid ? findRec(sid) : null;
    if (rec) {                                         // sau màn ● hoặc màn dừng: sửa lượt vừa ghi thành đỏ
      rec.motherReportedAt = rec.motherReportedAt || t;
      const r = K.evaluate(rec, t, cfg);
      store.save(finalRecord(rec, r));
      buzz(120);
      return urgentFromKick(r.reasons, rec.signs);
    }
    buzz(120);
    openUrgent(['mother_reported'], [], 'kick');       // không có lượt nào: chỉ mở trang khẩn, không tạo bản ghi (K-13)
  }
  /* ===== Hộp thoại của mục (L07, L08): gắn vào body, nền inert + aria-hidden, bẫy Tab, Esc = nút an toàn (G-7) ===== */
  let kdlg = null;
  function openKickDialog(html, focusIdx, escAct) {
    closeKickDialog();
    const wrap = document.createElement('div');
    wrap.className = 'kick-backdrop';
    wrap.innerHTML = html;
    const outside = ['#header', '#main', '#kick-strip'].map(q => document.querySelector(q)).filter(Boolean);
    const prev = document.activeElement;
    const onKey = e => {
      const btns = Array.from(wrap.querySelectorAll('button'));
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); const b = wrap.querySelector(`[data-act="${escAct}"]`); if (b) b.click(); else closeKickDialog(); }
      else if (e.key === 'Tab' && btns.length) {
        const i = btns.indexOf(document.activeElement);
        e.preventDefault(); btns[(i + (e.shiftKey ? btns.length - 1 : 1) + btns.length) % btns.length].focus();
      }
    };
    document.body.appendChild(wrap);
    outside.forEach(el => { el.inert = true; el.setAttribute('aria-hidden', 'true'); });
    document.addEventListener('keydown', onKey, true);
    kdlg = { wrap, close(refocus) {
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
      outside.forEach(el => { el.inert = false; el.removeAttribute('aria-hidden'); });
      kdlg = null;
      if (refocus !== false && prev && prev.isConnected && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
    } };
    const btns = wrap.querySelectorAll('button');
    (btns[focusIdx] || btns[0]).focus();
  }
  function closeKickDialog(refocus) { if (kdlg) kdlg.close(refocus); }

  /* ===== Báo từ ngoài mục đếm (trang Dấu hiệu, check-in): chốt đỏ lượt dở, KHÔNG chuyển màn =====
     api.kickReportReduced({from, signs?, silent?}) → {hadActive, sessionId}: R-06 "con ngừng máy, máy yếu, ít hơn hẳn".
     api.kickReportSigns({from, signs})    → {hadActive, sessionId}: R-07 dấu hiệu nguy hiểm khác (ra máu…).
     Người gọi tự mở trang khẩn (openUrgentOB). Không có lượt dở → không ghi gì. */
  function reportFromOutside(o, reduced) {
    o = o || {};
    try {
      const a = store.getActive();
      if (!a) return { hadActive: false, sessionId: null };
      const t = now();
      if (reduced) a.motherReportedAt = a.motherReportedAt || t;
      const add = Array.isArray(o.signs) ? o.signs.filter(x => typeof x === 'string' && /^[a-z_]{2,24}$/.test(x)) : [];
      add.forEach(x => { if (a.signs.indexOf(x) < 0 && a.signs.length < 13) a.signs.push(x); });
      const r = K.evaluate(a, t, cfg);
      if (r.level === 'red') finalize(a, r, { silent: true });
      else store.setActive(a);
      return { hadActive: true, sessionId: a.id };
    } catch (e) { return { hadActive: false, sessionId: null }; }
  }

  function resetMem() {
    mem.active = null; mem.prefs = null; mem.memSessions = {}; mem.lastFinal = null; mem.lastTap = null;
    mem.attnAck = {}; mem.yellowSeen = {}; mem.rained = {}; mem.finishing = false; mem.routing = false;
    hideStrip();
  }

  /* ===== Kiểm toàn app (UX 2.11, 2.12 sau review C-1) =====
     - Lên ▲ ở màn thường → mở trang khẩn ngay. Đang ở `urgent`/`see_doctor` → chỉ ghi + dải ▲, mở khi chị rời trang khẩn.
     - Sang giờ 2 (◆), đủ giờ 1 chờ cảm nhận: KHÔNG tự chuyển màn ở đâu cả; chỉ dải L12 (màn đếm tự hiện thẻ ◆). */
  let strip = null;
  // Mở trang khẩn cho lượt đỏ (chỉ gọi khi chị đang ở màn thường); chặn gọi lồng trong lúc chuyển màn
  function routeRed(rec) {
    if (mem.routing) return;
    mem.routing = true;
    try { urgentFromKick(rec.reasons, rec.signs); }
    finally { mem.routing = false; }
  }
  function globalTick() {
    try {
      if (mem.routing) return;
      if (!api || !api.mode()) { hideStrip(); return; }
      const cur = screenName();
      const a = store.getActive();
      if (!a) { hideStrip(); return; }
      if (cur === 'kick_count') { hideStrip(); return; }     // màn đếm tự lo (mỗi 250 ms)
      const r = K.evaluate(a, now(), cfg);
      if (r.level === 'red') {
        if (a.level !== 'red') { finalize(a, r); return; }   // vừa lên đỏ: ghi + mở trang khẩn hoặc dải ▲
        if (isProtected()) { showRedStrip(a); return; }     // lượt đỏ đang chờ: chị còn ở trang khẩn → không chen
        store.clearActive(); hideStrip(); routeRed(a); return;   // chị đã rời trang khẩn → mở trang khẩn của lượt đếm
      }
      if (r.phase === 'final' && !(r.level === 'green' && r.needFeel)) { finalize(a, r, { silent: true }); hideStrip(); return; }
      showStrip(r, a);
    } catch (e) { /* không để lỗi hiển thị chặn luật lần sau */ }
  }
  function showRedStrip(rec) {
    if (!strip || !rec) return;
    const prm = { reasons: rec.reasons, signs: rec.signs, from: 'kick' };
    strip.innerHTML = `<button type="button" class="kick-strip-btn kick-strip-red" data-go="see_doctor" data-params="${esc(JSON.stringify(prm))}"><span aria-hidden="true">▲ </span>Đếm cử động thai: Chị đi khám ngay nhé ›</button>`;
    strip.hidden = false;
    strip.dataset.sid = rec.id;
  }
  function showStrip(r, a) {
    if (!strip) return;
    const cur = screenName();
    if (cur === 'kick_count' || cur === 'kick_feel') { hideStrip(); return; }
    const go = r.phase === 'final' ? 'kick_feel' : 'kick_count';
    const time = r.phase === 'final' ? '' : ' · còn ' + mmss(r.remainingMs);
    strip.innerHTML = `<button type="button" class="kick-strip-btn" data-go="${go}">${r.phase === 'h2' ? '<span aria-hidden="true">◆ </span>' : ''}👣 Đang đếm cử động thai${esc(time)} · Về màn đếm ›</button>`; // N-41
    strip.hidden = false;
    strip.dataset.sid = a.id;
  }
  function hideStrip() { if (strip && !strip.hidden) { strip.hidden = true; strip.innerHTML = ''; } }

  /* ===== Màn hình ===== */
  function screens(apiIn) {
    api = apiIn; C = api.C || window.LSTP_CONFIG || {}; U = api.U || window.LSTP_UTIL || {}; S = api.S || window.LSTP_STORE || {};
    esc = api.esc || U.esc; cfg = K.cfgFrom(C);
    const L = api.lifecycle;

    // Action dùng chung cho mọi màn của mục (đăng ký lại ở mỗi mount vì screenActions bị dọn khi đổi màn)
    const common = {
      kickSelfReport: btn => selfReport(btn.dataset.sid || '', false),
      kickToHome: () => { api.resetTo('home'); api.go('kick_home'); }
    };

    /* ---------- K01 Trang mục ---------- */
    const kick_home = {
      title: 'Đếm cử động thai', needs: 'mode', dayLive: true,
      render() {
        const prefs = store.prefs();
        const a = store.getActive();
        const r = a ? K.evaluate(a, now(), cfg) : null;
        const ga = gaToday();
        const under28 = ga && Number.isInteger(ga.totalDays) && ga.status !== 'past42' && ga.totalDays < 196;
        const today = dayOf(now());
        const sum = K.daySummary(store.list(), today, tz());
        if (a && r && (r.phase !== 'final' || r.needFeel)) {
          sum[K.slotOf(a.meal, a.startAt, tz())].push({ pseudo: true, level: r.phase === 'h2' ? 'yellow' : 'pending', total: r.total, startAt: a.startAt });
        }
        const slots = ['morning', 'noon', 'evening'].concat(sum.other.length ? ['other'] : []);
        const cell = k => {
          const list = sum[k];
          let body = '<span class="kick-slot-empty">Chưa đếm</span>', cls = 'none';          // M-26
          if (list.length) {
            const top = list.slice().sort((x, y) => K.severity(y.level, y.hadYellow) - K.severity(x.level, x.hadYellow))[0];
            const l = lv(top.level, top.hadYellow);
            let text = l.text;
            if (top.pseudo && top.level === 'yellow') text = 'Cần chú ý · đang đếm giờ thứ hai';                  // M-25
            else if (top.pseudo) text = 'Đang đếm · ' + top.total + ' lần';
            else if (top.level === 'green' && !top.hadYellow) text = 'Con cử động đều · ' + top.total + ' lần'; // M-24
            body = shape(l) + esc(text) + (list.length > 1 ? ` <span class="kick-times">×${list.length}</span>` : '');
            cls = l.cls;
          }
          return `<li class="kick-slot lv-${cls}"><b>${esc(SLOT_TEXT[k])}</b><span>${body}</span></li>`;
        };
        let activeCard = '';
        if (a && r && (r.phase !== 'final' || r.needFeel)) {
          activeCard = `<div class="kick-note kick-active-card" role="status">
            <p>${r.phase === 'h2' ? '<span aria-hidden="true">◆ </span>' : ''}Chị đang đếm dở từ ${esc(hhmm(a.startAt))} · ${r.total} lần</p>
            <button type="button" class="btn btn-primary btn-block" data-go="${r.phase === 'final' ? 'kick_feel' : 'kick_count'}">Đếm tiếp ›</button></div>`; // M-31, M-32
        }
        return `<section class="card stack kick">
          <h1>Đếm cử động thai</h1>
          ${prefs.seenTip ? '' : `<div class="kick-note kick-tip"><p>${esc(T.m20a)}</p>
            <div class="kick-row"><button type="button" class="btn btn-secondary" data-act="kickSeenTip">Đã hiểu</button>
            <button type="button" class="btn-link" data-go="kick_guide">Đọc hướng dẫn</button></div></div>`}
          ${activeCard}
          ${under28 ? `<p class="kick-note kick-info"><span aria-hidden="true">ℹ︎ </span>${esc(T.m20b)}</p>` : ''}
          <p>Hôm nay mẹ con mình đếm cùng nhau nhé.</p>
          <h2 class="kick-h2">Hôm nay</h2>
          <ul class="kick-slots${slots.length === 4 ? ' four' : ''}">${slots.map(cell).join('')}</ul>
          ${a ? '' : '<button type="button" class="btn btn-primary btn-block" data-go="kick_before">👣 Bắt đầu đếm ›</button>'}
          <p class="kick-m05">${esc(T.m05)}</p>
          ${selfBtn('')}
          ${api.mode() === 'none' ? `<p class="fine">${esc(T.m30)}</p>` : ''}
          <nav class="kick-links" aria-label="Các mục của Đếm cử động thai">
            <button type="button" data-go="kick_track">📈 Theo dõi</button>
            <button type="button" data-go="kick_footprints">👣 Dấu chân con</button>
            <button type="button" data-go="kick_guide">📖 Hướng dẫn</button>
            <button type="button" data-go="kick_data">🗂️ Lượt đếm của chị</button>
          </nav>
        </section>`;
      },
      mount() {
        syncGa();
        api.screenActions(Object.assign({}, common, {
          kickSeenTip: () => { store.setPrefs({ seenTip: true }); api.rerender(); }
        }));
      }
    };

    /* ---------- K02 Trước khi đếm ---------- */
    const kick_before = {
      title: 'Trước khi đếm', needs: 'mode',
      render() {
        const b = mem.before;
        const signs = kickSigns();
        const any = b.signs.length > 0;
        return `<section class="card stack kick kick-left">
          <h1>Trước khi đếm</h1>
          <div class="kick-step">
            <h2 class="section-title" id="kMealT"><span class="step-num">1</span> Chị vừa ăn bữa nào?</h2>
            <p class="section-hint">Không nhớ cũng được, chị bỏ qua nhé.</p>
            <div class="kick-chips" role="group" aria-labelledby="kMealT">
              ${MEAL_CHIPS.map(([k, t]) => `<button type="button" class="kick-chip" data-act="kickMeal" data-meal="${k}" aria-pressed="${b.meal === k}">${esc(t)}</button>`).join('')}
            </div>
          </div>
          <hr class="section-divider">
          <div class="kick-step">
            <h2 class="section-title" id="kSignT"><span class="step-num">2</span> Lúc này chị có thấy điều nào dưới đây không?</h2>
            <p class="section-hint">Chỉ chọn nếu có. Không có thì chị bấm Bắt đầu nhé.</p>
            <div class="kick-signs" role="group" aria-labelledby="kSignT">
              ${signs.map(s => `<button type="button" class="kick-sign" data-act="kickSign" data-sign="${esc(s.id)}" aria-pressed="${b.signs.indexOf(s.id) >= 0}"><span class="kick-box" aria-hidden="true"></span><span>${esc(s.label)}</span></button>`).join('')}
            </div>
          </div>
          <button type="button" id="kBeforeGo" class="btn btn-block ${any ? 'btn-urgent' : 'btn-primary'}" data-act="kickBeforeGo">${any ? 'Xem cần làm gì ngay ›' : 'Bắt đầu ›'}</button>
          <p class="kick-sr" aria-live="polite" id="kBeforeLive"></p>
          ${reviewLine()}
        </section>`;
      },
      mount(root) {
        if (store.getActive()) { setTimeout(() => api.go('kick_count', {}, { replace: true }), 0); return; }
        const goBtn = root.querySelector('#kBeforeGo'), live = root.querySelector('#kBeforeLive');
        const refresh = () => {
          const any = mem.before.signs.length > 0;
          const label = any ? 'Xem cần làm gì ngay ›' : 'Bắt đầu ›';                         // M-54 / M-55
          if (goBtn.textContent !== label) { goBtn.textContent = label; live.textContent = label; }
          goBtn.classList.toggle('btn-urgent', any); goBtn.classList.toggle('btn-primary', !any);
        };
        api.screenActions(Object.assign({}, common, {
          kickMeal: btn => {
            const m = btn.dataset.meal;
            mem.before.meal = mem.before.meal === m ? null : m;
            root.querySelectorAll('[data-act=kickMeal]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.meal === mem.before.meal)));
          },
          kickSign: btn => {
            const id = btn.dataset.sign, i = mem.before.signs.indexOf(id);
            if (i >= 0) mem.before.signs.splice(i, 1); else mem.before.signs.push(id);
            btn.setAttribute('aria-pressed', String(i < 0));
            refresh();
          },
          kickBeforeGo: () => {
            if (!mem.before.signs.length) { api.go('kick_pause5'); return; }
            // R-07: có dấu hiệu → trang khẩn, không vào màn đếm. Ghi một lượt ▲ kèm mã dấu hiệu (Q18).
            const t = now();
            const rec = newSession(t);
            rec.signs = mem.before.signs.slice(); rec.taps = [];
            const r = K.evaluate(rec, t, cfg);
            store.save(finalRecord(rec, r));
            buzz(120);
            openUrgent(r.reasons, rec.signs, 'kick_before');
          }
        }));
      }
    };

    /* ---------- K03 Dừng 5 giây cùng con ---------- */
    const kick_pause5 = {
      title: 'Dừng 5 giây cùng con', needs: 'mode',
      render: () => `<section class="card stack kick">
          <div class="kick-pause-orb" aria-hidden="true"><span>🤰</span></div>
          <h1>Dừng 5 giây cùng con</h1>
          <p>Chị nằm nghiêng bên trái, hoặc ngồi tựa thật thoải mái. Đặt tay lên bụng, thở chậm và chào con một câu nhé.</p>
          <p class="kick-quote">"Mẹ đây rồi. Mình cùng chơi nhé con."</p>
          <button type="button" id="kPauseGo" class="btn btn-primary btn-block" data-act="kickStart">Bỏ qua</button>
        </section>`,
      mount(root) {
        const btn = root.querySelector('#kPauseGo');
        L.later(() => { btn.textContent = 'Bắt đầu đếm ›'; }, 5000);                                // M-63 → M-64
        api.screenActions(Object.assign({}, common, { kickStart: () => startSession() }));
      }
    };
    function newSession(t) {
      return {
        v: 1, id: U.randomId(), startAt: t, endAt: null, meal: mem.before.meal, taps: [], signs: [],
        motherReportedAt: null, doneAt: null, stoppedAt: null, feel: null, level: null, hadYellow: false,
        reasons: [], h1: 0, h2: 0, total: 0, min4: null, min10: null, gaDays: gaDaysAt(t)
      };
    }
    // T bắt đầu khi vào màn đếm (AC-05). gaDays tính MỘT lần lúc này (PRD 5.5).
    function startSession() {
      if (!store.getActive()) {
        store.setActive(newSession(now()));
        mem.before = { meal: null, signs: [] };
        mem.lastTap = null;
      }
      api.go('kick_count', {}, { replace: true });
    }

    /* ---------- K04 Màn đếm ---------- */
    const kick_count = {
      title: 'Đếm cử động thai', needs: 'mode',
      render() {
        const a = store.getActive();
        if (!a) return '<section class="card stack kick"><h1>Đếm cử động thai</h1></section>';
        const p = store.prefs();
        const foot = Array.from({ length: 12 }, () => `<span class="kick-foot">${FOOT_SVG}</span>`).join('');
        const hearts = Array.from({ length: 6 }, () => `<span class="heart-fly">${HEART_SVG}</span>`).join('');
        return `<section class="card stack kick kick-count-card">
          <h1>Con đạp ở đâu, chị chạm vào đó nhé</h1>
          <div id="kAttn"></div>
          <p class="kick-timer" role="timer" aria-live="off"><span aria-hidden="true">⏱ </span><span id="kTimer">Giờ thứ 1 · còn 60:00</span></p>
          <p id="kTotal2" class="kick-total2" hidden></p>
          <div id="kAttnBar"></div>
          <div class="belly-wrap">
            <button type="button" class="belly" id="kBelly" aria-label="Hình bụng mẹ. Chạm vào chỗ con vừa đạp.">
              <span class="belly-navel" aria-hidden="true"></span>
              <span class="belly-fx" aria-hidden="true">${foot}${hearts}</span>
              <span class="kick-count" id="kCount" aria-hidden="true"><b id="kN">0</b><small>lần</small></span>
            </button>
            <span class="kick-hihi" id="kHihi" aria-hidden="true">hihi</span>
            <div class="kick-rain" id="kRain" aria-hidden="true"></div>
          </div>
          <p class="kick-sides" aria-hidden="true">← Bên trái của chị · Bên phải của chị →</p>
          <button type="button" class="btn btn-secondary btn-block kick-tap-btn" data-act="kickTapBtn">
            <span class="kick-self-main">👣 Con vừa đạp</span><span class="kick-self-sub">Dùng nút này nếu khó chạm đúng chỗ</span></button>
          <p class="section-hint">Đạp, xoay, trườn, máy đều tính. Con nấc cụt thì không tính.</p>
          <p id="kEnough" class="kick-enough" aria-live="polite"></p>
          <button type="button" id="kDone" class="btn btn-primary btn-block" data-act="kickDone" hidden>Xong ✓</button>
          <div class="kick-row">
            <button type="button" id="kUndo" class="btn btn-secondary" data-act="kickUndo" disabled>↶ Bỏ lần vừa chạm</button>
            <button type="button" id="kSound" class="btn btn-secondary kick-toggle" data-act="kickSoundToggle" aria-pressed="${p.sound}">🔊 Tiếng khi chạm</button>
          </div>
          ${selfBtn('')}
          <button type="button" class="btn-link" id="kStop" data-act="kickStop">Dừng lượt đếm</button>
          <p class="kick-sr" id="kLive" aria-live="polite"></p>
        </section>`;
      },
      mount(root) {
        const a0 = store.getActive();
        if (!a0) { setTimeout(() => api.go('kick_home', {}, { replace: true }), 0); return; }
        const sid = a0.id;
        const $ = id => root.querySelector('#' + id);
        const el = { timer: $('kTimer'), total2: $('kTotal2'), n: $('kN'), count: $('kCount'), belly: $('kBelly'), hihi: $('kHihi'),
          rain: $('kRain'), enough: $('kEnough'), done: $('kDone'), undo: $('kUndo'), live: $('kLive'), attn: $('kAttn'), bar: $('kAttnBar') };
        const feet = Array.from(root.querySelectorAll('.kick-foot')), hearts = Array.from(root.querySelectorAll('.heart-fly'));
        let footI = 0, heartI = 0, lastFoot = null, attnState = '', liveT = null, hihiT = null;
        mem.finishing = false;

        // Phần tử hiệu ứng tái dùng (UX 3.6: pool 12, chỉ animate transform/opacity)
        const restart = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
        function effects(r, pos, n) {
          try {
            const rm = reduce();
            if (pos) {
              const f = feet[footI++ % feet.length];
              f.style.left = (pos.x * 100) + '%'; f.style.top = (pos.y * 100) + '%';
              f.style.setProperty('--rot', (Math.round(Math.random() * 40) - 20) + 'deg');
              restart(f, 'show'); lastFoot = f;
            } else lastFoot = null;
            if (!rm && r.phase === 'h1') {                       // giờ cần chú ý: không 💗 (R-11)
              const h = hearts[heartI++ % hearts.length];
              h.style.left = ((pos ? pos.x : 0.5) * 100) + '%'; h.style.top = ((pos ? pos.y : 0.45) * 100) + '%';
              restart(h, 'go');
            }
            restart(el.belly, rm ? 'glow' : 'shake');
            if (!rm) restart(el.count, 'bump');
            const giggle = r.phase === 'h1' && n > 0 && n % 3 === 0 && n < cfg.CELEBRATE_AT;
            if (giggle) {                                       // tắt tiếng vẫn hiện bong bóng (AC-11)
              restart(el.hihi, 'show');
              clearTimeout(hihiT); hihiT = setTimeout(() => el.hihi.classList.remove('show'), 1250);
            }
            play('bum');
            if (giggle || r.celebrate) play('giggle');
            buzz(r.celebrate ? 200 : giggle ? [30, 60, 30] : 25);
          } catch (e) { /* hiệu ứng lỗi không chặn đếm (AC-13) */ }
        }
        function announce(n, h) {
          clearTimeout(liveT);
          liveT = setTimeout(() => { el.live.textContent = `Đã đếm ${n} lần trong giờ thứ ${h}`; }, 600); // M-73, gom 600 ms
        }
        L.onCleanup(() => { clearTimeout(liveT); clearTimeout(hihiT); });

        function attnHtml(a, r) {
          const ob = contact('OB_CONTACT');
          return `<section class="kick-attn" role="region" aria-labelledby="kAttnT">
            <h2 id="kAttnT" tabindex="-1"><span aria-hidden="true">◆ </span>Cần chú ý</h2>
            <p>Giờ vừa rồi con cử động ${r.h1} lần.</p>
            <p>Chị đếm tiếp thêm 1 giờ nữa nhé. Chị nằm nghiêng bên trái, để ý từng cử động của con. Mình đã bắt đầu giờ thứ hai cho chị.</p>
            <p>${esc(ob.tel ? T.m153 : T.m153a)}</p>
            <button type="button" class="btn btn-primary btn-block" data-act="kickAttnAck">Đếm tiếp giờ thứ hai ›</button>
            ${obCallBtn('btn-secondary')}
            ${selfBtn('')}
            ${reviewLine()}
          </section>`;
        }
        function renderAttn(a, r) {
          const want = r.phase !== 'h2' ? '' : (mem.attnAck[a.id] ? 'bar' : 'card');
          if (want === attnState) return;
          attnState = want;
          el.attn.innerHTML = want === 'card' ? attnHtml(a, r) : '';
          el.bar.innerHTML = want === 'bar' ? '<button type="button" class="kick-attn-bar" data-act="kickAttnOpen"><span aria-hidden="true">◆ </span>Đang đếm thêm giờ thứ hai. Chị còn lo thì liên hệ cơ sở sản khoa nhé.</button>' : ''; // M-156
          if (want === 'card' && !mem.yellowSeen[a.id]) {
            mem.yellowSeen[a.id] = 1;
            buzz(120);                                            // một nhịp khi lên ◆, không tiếng cười (AC-25)
            const h = root.querySelector('#kAttnT'); if (h) h.focus({ preventScroll: false });
          }
        }

        function update() {
          if (mem.finishing) return;
          const a = store.getActive();
          if (!a || a.id !== sid) { api.go('kick_home', {}, { replace: true }); return; }
          const t = now();
          const r = K.evaluate(a, t, cfg);
          if (r.phase === 'final') {
            if (r.level === 'green' && r.celebrate && !mem.rained[a.id] && t - r.finalAt < 5000) {
              mem.rained[a.id] = 1; mem.finishing = true;
              if (!reduce()) rain();
              el.n.textContent = String(r.h1); el.done.hidden = true; el.undo.hidden = true;
              L.later(() => finalize(store.getActive() || a, K.evaluate(store.getActive() || a, now(), cfg)), reduce() ? 600 : 2000);
              return;
            }
            finalize(a, r);
            return;
          }
          el.timer.textContent = `Giờ thứ ${r.hour} · còn ${mmss(r.remainingMs)}`;                   // M-74
          const n = r.phase === 'h2' ? r.h2 : r.h1;
          if (el.n.textContent !== String(n)) el.n.textContent = String(n);
          el.total2.hidden = r.phase !== 'h2';
          if (r.phase === 'h2') el.total2.textContent = `Tổng 2 giờ: ${r.total} lần`;                   // M-74a
          const enough = r.phase === 'h1' && r.h1 >= cfg.GREEN_MIN;
          el.done.hidden = !enough;
          const msg = enough ? 'Con đã cử động 4 lần trong giờ này. Chị đếm tiếp tới 10 lần hoặc hết giờ, hay dừng ở đây cũng được nhé.' : ''; // M-79a
          if (el.enough.textContent !== msg) el.enough.textContent = msg;
          el.undo.disabled = n === 0;
          renderAttn(a, r);
        }
        function rain() {
          const parts = [];
          for (let i = 0; i < 18; i++) parts.push(`<span style="left:${Math.round(Math.random() * 92)}%;animation-delay:${(Math.random() * 0.9).toFixed(2)}s">${HEART_SVG}</span>`);
          el.rain.innerHTML = parts.join('');
          el.rain.classList.add('on');
        }
        function doTap(x, y) {
          const a = store.getActive();
          if (!a || a.id !== sid || mem.finishing) return;
          const t = now();
          if (K.evaluate(a, t, cfg).phase === 'final') return;        // đã có mức: không đếm thêm
          if (!K.acceptTap(mem.lastTap, t, cfg)) return;               // < 0,8 s: bỏ qua lặng lẽ (AC-09)
          mem.lastTap = t;
          const lastT = a.taps.length ? a.taps[a.taps.length - 1].t : 0;
          const withPos = x != null && a.taps.length < cfg.MAX_TAPS;   // tối đa 200 điểm có vị trí (AC-68)
          a.taps.push({ t: Math.max(lastT, Math.round(t - a.startAt), 0), x: withPos ? x : null, y: withPos ? y : null });
          store.setActive(a);
          if (attnState === 'card') { mem.attnAck[a.id] = 1; }         // chạm bụng thì thu thẻ ◆ (AC-26)
          const r = K.evaluate(a, t, cfg);
          const n = r.phase === 'h2' ? r.h2 : (r.phase === 'final' ? (r.hadYellow ? r.h2 : r.h1) : r.h1);
          effects(r, withPos ? { x, y } : null, n);
          announce(n, r.phase === 'h2' || r.hadYellow ? 2 : 1);
          update();
        }

        // Chạm vòng bụng: đếm ở pointerdown (≤ 100 ms), chỉ trong hình tròn (AC-07, AC-08)
        L.on(el.belly, 'pointerdown', e => {
          if (e.button > 0) return;
          const rc = el.belly.getBoundingClientRect();
          const rad = rc.width / 2, dx = e.clientX - (rc.left + rad), dy = e.clientY - (rc.top + rc.height / 2);
          if (dx * dx + dy * dy > rad * rad) return;
          doTap(clamp01(round3((e.clientX - rc.left) / rc.width)), clamp01(round3((e.clientY - rc.top) / rc.height)));
        });
        // Bàn phím / trình đọc màn hình: click không có con trỏ (detail 0) = một lần, không vị trí (AC-15)
        L.on(el.belly, 'click', e => { if (e.detail === 0) doTap(null, null); });
        L.on(el.belly, 'keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.repeat) e.preventDefault(); });
        // Giờ thật: tính lại mỗi 250 ms và ngay khi trang hiện lại (R-01, R-09, AC-18)
        L.every(update, 250);
        L.on(document, 'visibilitychange', () => { if (!document.hidden) update(); });
        L.on(window, 'pageshow', update);
        L.on(window, 'focus', update);
        // Màn hình không tự tắt khi đang đếm (US-15, P1): Wake Lock nếu trình duyệt có
        let lock = null;
        const wake = () => { try { if (navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => {}); } catch (e) { /* bỏ qua */ } };
        wake();
        L.on(document, 'visibilitychange', wake);
        L.onCleanup(() => { try { if (lock) lock.release(); } catch (e) { /* bỏ qua */ } });

        L.onCleanup(() => closeKickDialog(false));
        api.screenActions(Object.assign({}, common, {
          kickTapBtn: () => doTap(null, null),
          kickDone: () => {
            const a = store.getActive(); if (!a) return;
            a.doneAt = now(); store.setActive(a); update();
          },
          kickUndo: () => {
            const a = store.getActive(); if (!a || !a.taps.length) return;
            const r = K.evaluate(a, now(), cfg);
            if (r.phase === 'final' || (r.phase === 'h2' ? r.h2 : r.h1) === 0) return;
            a.taps.pop(); store.setActive(a);
            if (lastFoot) { lastFoot.classList.remove('show'); lastFoot = null; }
            toast('Đã bỏ lần vừa chạm.');                                                         // M-79
            update();
          },
          kickSoundToggle: btn => {
            const on = !store.prefs().sound;
            store.setPrefs({ sound: on });
            btn.setAttribute('aria-pressed', String(on));
          },
          kickAttnAck: () => {
            const a = store.getActive(); if (!a) return;
            mem.attnAck[a.id] = 1; update();
            el.belly.focus({ preventScroll: true });
            try { el.belly.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' }); } catch (e) { /* bỏ qua */ }
          },
          kickAttnOpen: () => {
            const a = store.getActive(); if (!a) return;
            delete mem.attnAck[a.id]; update();
            const h = root.querySelector('#kAttnT'); if (h) h.focus();
          },
          kickStop: () => {
            const a = store.getActive(); if (!a) return;
            const r = K.evaluate(a, now(), cfg);
            if (r.phase === 'h1' && r.h1 >= cfg.GREEN_MIN) { a.doneAt = now(); store.setActive(a); update(); return; } // K-13: như "Xong ✓"
            openKickDialog(`<div class="kick-dialog" role="alertdialog" aria-modal="true" aria-labelledby="kStopT" aria-describedby="kStopD">
              <h2 id="kStopT">Chị muốn dừng lượt đếm này?</h2>
              <p id="kStopD">Con mới cử động ${r.total} lần. Mình sẽ ghi lượt này là dừng giữa chừng.</p>
              <button type="button" class="btn btn-primary btn-block" data-act="kickStopCancel">Đếm tiếp</button>
              <button type="button" class="btn btn-secondary btn-block" data-act="kickStopConfirm">Dừng lượt đếm</button>
            </div>`, 0, 'kickStopCancel');                                                       // M-94; Esc = Đếm tiếp
          },
          kickStopCancel: () => closeKickDialog(),
          kickStopConfirm: () => {
            closeKickDialog(false);
            const a = store.getActive(); if (!a) return;
            a.stoppedAt = now(); store.setActive(a);
            update();
          }
        }));
        update();
      }
    };

    /* ---------- K05 Cảm nhận ---------- */
    const kick_feel = {
      title: 'Cảm nhận của chị', needs: 'mode',
      render: () => `<section class="card stack kick">
          <h1>Chị thấy con cử động hôm nay thế nào?</h1>
          <button type="button" class="btn btn-primary btn-block" data-act="kickFeel" data-feel="same">Như mọi ngày</button>
          <button type="button" class="btn-urgent-outline" data-act="kickFeelDiff">
            <span class="kick-self-main"><span aria-hidden="true">▲ </span>${esc(T.selfMain)}</span><span class="kick-self-sub">${esc(T.selfSub)}</span></button>
          <button type="button" class="btn-link" data-act="kickFeel" data-feel="skipped">Bỏ qua</button>
        </section>`,
      mount() {
        const a = store.getActive();
        if (!a) { setTimeout(() => api.go('kick_home', {}, { replace: true }), 0); return; }
        const r = K.evaluate(a, now(), cfg);
        if (r.phase !== 'final') { setTimeout(() => api.go('kick_count', {}, { replace: true }), 0); return; }
        if (!(r.level === 'green' && r.needFeel)) { setTimeout(() => finalize(a, r), 0); return; }
        api.screenActions(Object.assign({}, common, {
          kickFeel: btn => {
            const x = store.getActive(); if (!x) return;
            x.feel = btn.dataset.feel === 'same' ? 'same' : 'skipped';
            store.setActive(x);
            finalize(x, K.evaluate(x, now(), cfg));
          },
          kickFeelDiff: () => selfReport('', true)                                               // AC-24
        }));
      }
    };

    /* ---------- K06 Kết quả ● ---------- */
    const kick_result = {
      title: 'Xong lượt đếm', needs: 'mode',
      render(prm) {
        const rec = findRec(prm && prm.id);
        if (!rec || rec.level !== 'green') return `<section class="card stack kick"><h1>Đếm cử động thai</h1>${backBtn()}</section>`;
        const minutes = Math.max(1, rec.min10 != null && !rec.hadYellow && rec.total >= cfg.CELEBRATE_AT
          ? rec.min10 : Math.floor(((rec.endAt || rec.startAt) - rec.startAt) / 60000));
        const ob = contact('OB_CONTACT');
        const h1 = rec.hadYellow ? 'Con đã cử động đủ 10 lần trong 2 giờ'                              // M-108
          : rec.total >= cfg.CELEBRATE_AT ? 'Đủ 10 lần rồi 💗' : 'Xong lượt đếm 💗';                  // M-100 / M-100a
        return `<section class="card stack kick">
          <div class="kick-badge lv-ok" aria-hidden="true">●</div>
          <h1>${esc(h1)}</h1>
          <p>Con cử động ${rec.total} lần trong ${minutes} phút.</p>
          <p>${rec.hadYellow ? 'Giờ đầu con cử động ít, giờ thứ hai con cử động nhiều hơn. Mình đã ghi lại cả hai giờ.' : 'Con đang cử động đều. Chị nhớ đếm lại vào bữa sau nhé.'}</p>
          <p>Cảm ơn chị đã dành thời gian lắng nghe con.</p>
          <p>Chị đặt tay lên bụng, nói với con một câu nhé.</p>
          ${rec.hadYellow ? `<div class="kick-note kick-attn-soft"><p>Nếu chị vẫn còn lo, chị liên hệ cơ sở sản khoa nhé.</p>
            ${ob.tel ? obCallBtn('btn-secondary') : `<p>${esc(T.m153a)}</p>`}</div>` : ''}
          <p class="kick-safety">${esc(T.m105)}</p>
          ${selfBtn(rec.id)}
          ${api.mode() === 'none' ? '<p class="fine">Chị đang không lưu trên máy, lượt này sẽ mất khi đóng app.</p>' : ''}
          <button type="button" class="btn btn-primary btn-block" data-go="kick_footprints">👣 Xem dấu chân con ›</button>
          ${backBtn()}
        </section>`;
      },
      mount() { api.screenActions(common); }
    };

    /* ---------- K07 Dừng giữa chừng ---------- */
    const kick_stopped = {
      title: 'Dừng giữa chừng', needs: 'mode',
      render(prm) {
        const rec = findRec(prm && prm.id);
        const y = rec && rec.level === 'stopped_yellow';
        const ob = contact('OB_CONTACT');
        return `<section class="card stack kick">
          <h1><span class="kick-shape" aria-hidden="true">✕ </span>Mình đã ghi lại lượt đếm này</h1>
          ${y ? `<div class="kick-note kick-attn-soft"><p>Lượt đếm này đang cần chú ý. Chị liên hệ cơ sở sản khoa ngay nhé.</p>
                  ${ob.tel ? obCallBtn('btn-primary') : `<p>${esc(T.m153a)}</p>`}</div>`
                : '<p>Nếu chị dừng vì thấy con cử động ít hơn mọi ngày, chị đi khám ngay nhé, đừng chờ đến lượt đếm sau.</p>'}
          ${selfBtn(rec ? rec.id : '')}
          ${backBtn()}
        </section>`;
      },
      mount() { api.screenActions(common); }
    };

    /* ---------- K08 Theo dõi ---------- */
    function last14() {
      const end = dayNum(dayOf(now()));
      return Array.from({ length: 14 }, (_, i) => dayFromNum(end - i));      // mới nhất trước
    }
    function rowText(s) {                                                    // M-168
      const d = dayOf(s.startAt);
      const parts = [`${weekday(d)}, ${ddmm(s.startAt)}`];
      if (Number.isInteger(s.gaDays)) parts.push(weekText(s.gaDays));
      parts.push(s.meal ? MEAL_TEXT[s.meal] : SLOT_PLAIN[K.slotOf(null, s.startAt, tz())]);
      parts.push(`giờ đầu ${s.h1} lần`);
      if (s.hadYellow) parts.push(`giờ thứ hai ${s.h2} lần`);
      parts.push(`tổng ${s.total}`, lv(s.level, s.hadYellow).text);
      return parts.join(' · ');
    }
    function reasonsText(s) {
      return s.reasons.map(r => (r === 'danger_sign'
        ? 'Chị đang thấy: ' + s.signs.filter(x => x !== 'no_movement').map(signLabel).join(', ')
        : REASON_TEXT[r])).join(' ');
    }
    const kick_track = {
      title: 'Theo dõi của con', needs: 'mode', dayLive: true,
      render() {
        const days = last14(), first = days[days.length - 1];
        const all = store.list().filter(s => dayOf(s.startAt) >= first);
        const ga = gaToday();
        const head = `<h1>📈 Theo dõi của con</h1>
          ${ga && ga.status === 'ok' && Number.isInteger(ga.weeks) ? `<p class="kick-ga">Hôm nay con được ${ga.weeks} tuần ${ga.days} ngày</p>` : ''}
          ${api.mode() === 'none' ? '<p class="fine">Chị đang không lưu trên máy, nên mình chưa vẽ được các ngày trước.</p>' : ''}`;
        if (!all.length) {
          return `<section class="card stack kick">${head}
            <p>Chưa có lượt đếm nào. Sau bữa ăn tới, mình cùng đếm nhé.</p>
            <button type="button" class="btn btn-primary btn-block" data-go="kick_home">👣 Bắt đầu đếm ›</button>
            ${backBtn()}</section>`;
        }
        const sums = days.map(d => K.daySummary(all, d, tz()));
        const slots = ['morning', 'noon', 'evening'].concat(sums.some(x => x.other.length) ? ['other'] : []);
        const rows = sums.map(sm => {
          const d = sm.day;
          const cells = slots.map(k => {
            const list = sm[k];
            if (!list.length) return '<td class="kick-cell-empty"><span aria-hidden="true">–</span><span class="kick-sr">Chưa đếm</span></td>';
            const top = list.slice().sort((x, y) => K.severity(y.level, y.hadYellow) - K.severity(x.level, x.hadYellow))[0];
            const l = lv(top.level, top.hadYellow);
            const label = `${SLOT_PLAIN[k]} ${d.slice(8, 10)}/${d.slice(5, 7)}: ${l.text}, ${top.total} lần${list.length > 1 ? ', ' + list.length + ' lượt' : ''}`;
            return `<td><button type="button" class="kick-cell lv-${l.cls}" data-act="kickCell" data-cell="${esc(d + '|' + k)}" aria-label="${esc(label)}">
              <span aria-hidden="true">${l.shape} ${top.level === 'red' ? '' : top.total}${list.length > 1 ? ' ×' + list.length : ''}</span></button></td>`;
          }).join('');
          return `<tr><th scope="row">${esc(weekday(d) + ' ' + d.slice(8, 10) + '/' + d.slice(5, 7))}</th>${cells}</tr>`;
        }).join('');
        // Chi tiết ô đang chọn
        let detail = '';
        if (mem.trackCell) {
          const [d, k] = mem.trackCell.split('|');
          const sm = sums.find(x => x.day === d);
          const list = sm && sm[k] ? sm[k] : [];
          if (list.length) detail = `<h3>Các lượt ${esc(SLOT_PLAIN[k].toLowerCase())} ngày ${esc(d.slice(8, 10) + '/' + d.slice(5, 7))}</h3><ul class="kick-list">${list.map(s => `<li>${esc(hhmm(s.startAt) + ' · ' + rowText(s))}</li>`).join('')}</ul>`; // N-25
        }
        // Biểu đồ số lần mỗi ngày (cũ → mới), SVG aria-hidden + danh sách cho trình đọc màn hình
        const chrono = sums.slice().reverse();
        const max = Math.max(1, ...chrono.map(x => x.total));
        const bw = 22, gap = 6, hgt = 110;
        const bars = chrono.map((x, i) => {
          const h = Math.round((x.total / max) * (hgt - 30));
          const xx = i * (bw + gap);
          return `<g><rect x="${xx}" y="${hgt - 16 - h}" width="${bw}" height="${h}" rx="4" class="kick-bar"/>
            ${x.total ? `<text x="${xx + bw / 2}" y="${hgt - 20 - h}" class="kick-bar-n">${x.total}</text>` : ''}
            <text x="${xx + bw / 2}" y="${hgt - 2}" class="kick-bar-d">${esc(x.day.slice(8, 10))}</text></g>`;
        }).join('');
        const table = mem.showTable ? `<div class="kick-table-wrap"><table class="kick-table">
            <caption class="kick-sr">Các lượt đếm 14 ngày</caption>
            <thead><tr><th scope="col">Ngày</th><th scope="col">Tuần thai</th><th scope="col">Bữa</th><th scope="col">Giờ đầu</th><th scope="col">Giờ thứ hai</th><th scope="col">Tổng</th><th scope="col">Kết quả</th><th scope="col">Lý do</th></tr></thead>
            <tbody>${all.map(s => `<tr><td>${esc(weekday(dayOf(s.startAt)) + ', ' + ddmm(s.startAt) + ' ' + hhmm(s.startAt))}</td><td>${esc(weekText(s.gaDays))}</td>
              <td>${esc(s.meal ? MEAL_TEXT[s.meal] : SLOT_PLAIN[K.slotOf(null, s.startAt, tz())])}</td><td>${s.h1}</td><td>${s.hadYellow ? s.h2 : ''}</td><td>${s.total}</td>
              <td>${shape(lv(s.level, s.hadYellow))}${esc(lv(s.level, s.hadYellow).text)}</td><td>${esc(reasonsText(s))}</td></tr>`).join('')}</tbody></table></div>` : '';
        return `<section class="card stack kick kick-left">${head}
          <h2 class="kick-h2">Các lượt đếm 14 ngày</h2>
          <p class="kick-legend"><span class="lv-ok">● Con cử động đều</span> · <span class="lv-attn">◆ Cần chú ý</span> · <span class="lv-urgent">▲ Đã báo đi khám</span> · <span class="lv-stop">✕ Dừng giữa chừng</span></p>
          <div class="kick-grid-wrap"><table class="kick-grid">
            <caption class="kick-sr">Lưới các lượt đếm, mỗi hàng một ngày</caption>
            <thead><tr><th scope="col"><span class="kick-sr">Ngày</span></th>${slots.map(k => `<th scope="col">${esc(SLOT_TEXT[k])}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody></table></div>
          <div id="kCellDetail" aria-live="polite">${detail}</div>
          <button type="button" class="btn btn-secondary" data-act="kickTable" aria-expanded="${mem.showTable}">${mem.showTable ? 'Ẩn bảng' : 'Xem dạng bảng'}</button>
          ${table}
          <hr class="section-divider">
          <h2 class="kick-h2">Số lần con cử động mỗi ngày</h2>
          <svg class="kick-chart" viewBox="-4 0 ${14 * (bw + gap)} ${hgt}" aria-hidden="true" focusable="false">${bars}</svg>
          <ul class="kick-sr">${chrono.map(x => `<li>${esc(x.day.slice(8, 10) + '/' + x.day.slice(5, 7))}: ${x.total} lần</li>`).join('')}</ul>
          <p class="fine">Cộng các lần chị chạm trong ngày.</p>
          <p class="fine">Biểu đồ để chị tự theo dõi, và mở cho bác sĩ xem khi đi khám nếu chị muốn. Không phải để chấm điểm con.</p>
          ${backBtn()}
        </section>`;
      },
      mount() {
        syncGa();
        api.screenActions(Object.assign({}, common, {
          kickCell: btn => { mem.trackCell = btn.dataset.cell; api.rerender(); const d = document.getElementById('kCellDetail'); if (d) { const h = d.querySelector('h3'); if (h) { h.tabIndex = -1; h.focus(); } } },
          kickTable: () => { mem.showTable = !mem.showTable; api.rerender(); const b = document.querySelector('[data-act=kickTable]'); if (b) b.focus(); }
        }));
      }
    };

    /* ---------- K09 Dấu chân con ---------- */
    const RANGE_TEXT = { today: 'hôm nay', '7': '7 ngày', all: 'tất cả các lượt' };
    function zoneSentence(top) {                                              // M-172 (hòa nêu cả hai)
      const name = z => (z === 'center' ? 'ở giữa' : 'ở ' + ZONE_TEXT[z]);
      if (!top.length) return '';
      return 'Con hay đạp nhất ' + top.map(name).join(' và ') + '.';
    }
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const kick_footprints = {
      title: 'Dấu chân con', needs: 'mode', dayLive: true,
      render() {
        const range = mem.fpRange;
        const today = dayOf(now());
        const from = range === 'today' ? today : range === '7' ? dayFromNum(dayNum(today) - 6) : '0000-00-00';
        const list = store.list().filter(s => dayOf(s.startAt) >= from);
        const taps = [];
        list.forEach(s => s.taps.forEach(p => taps.push(p)));
        const z = K.zones(taps);
        const pts = taps.filter(p => p.x != null).slice(-1000);
        const chips = [['today', 'Hôm nay'], ['7', '7 ngày'], ['all', 'Tất cả']].map(([k, t]) =>
          `<button type="button" class="kick-chip" data-act="kickRange" data-range="${k}" aria-pressed="${range === k}">${t}</button>`).join('');
        const box = zz => (zz === 'center' ? '<span class="fp-zone fp-center" aria-hidden="true"></span>' : `<span class="fp-zone fp-${zz}" aria-hidden="true"></span>`);
        const aria = `Bản đồ bước chân ${RANGE_TEXT[range]}: ${z.withPos} bước chân${z.top.length ? ', nhiều nhất ' + z.top.map(x => ZONE_TEXT[x]).join(' và ') : ''}.`; // N-86
        const body = (z.withPos + z.noPos) === 0
          ? '<p>Chưa có dấu chân nào. Lượt đếm tới, chị chạm đúng chỗ con đạp nhé.</p>'          // M-177
          : `<div class="belly belly-map" role="img" aria-label="${esc(aria)}">
              <span class="belly-navel" aria-hidden="true"></span>
              ${z.top.map(box).join('')}
              ${pts.map(p => `<span class="fp-dot" style="left:${p.x * 100}%;top:${p.y * 100}%">${FOOT_SVG}</span>`).join('')}
            </div>
            <p class="kick-sides" aria-hidden="true">← Bên trái của chị · Bên phải của chị →</p>
            ${z.top.length ? `<p class="kick-zone">${esc(zoneSentence(z.top))}</p>` : ''}
            <p>Mỗi dấu chân là một lần chị chạm.</p>
            <p class="fine">Hình bụng nhìn như lúc chị cúi xuống nhìn bụng mình: bên trái hình là bên trái của chị.</p>
            <p class="fine">Bản đồ để mẹ nhớ những lần con đạp, không cho biết tư thế hay sức khỏe của con.</p>
            ${z.noPos ? `<p class="fine">Có ${z.noPos} lần chị bấm nút, không ghi vị trí.</p>` : ''}
            <button type="button" class="btn btn-secondary" data-act="kickFpTable" aria-expanded="${mem.showTable}">${mem.showTable ? 'Ẩn bảng' : 'Xem dạng bảng'}</button>
            ${mem.showTable ? `<ul class="kick-list">${K.ZONES.map(k => `<li>${esc(cap(ZONE_TEXT[k]))}: ${z.counts[k]} lần</li>`).join('')}</ul>` : ''}`; // N-26
        return `<section class="card stack kick">
          <h1>👣 Dấu chân con</h1>
          <div class="kick-chips" role="group" aria-label="Khoảng thời gian">${chips}</div>
          ${api.mode() === 'none' ? '<p class="fine">Chị đang không lưu trên máy, nên mình chưa vẽ được các ngày trước.</p>' : ''}
          ${body}
          ${backBtn()}
        </section>`;
      },
      mount() {
        syncGa();
        api.screenActions(Object.assign({}, common, {
          kickRange: btn => { mem.fpRange = btn.dataset.range; api.rerender(); const b = document.querySelector(`[data-act=kickRange][data-range="${mem.fpRange}"]`); if (b) b.focus(); },
          kickFpTable: () => { mem.showTable = !mem.showTable; api.rerender(); const b = document.querySelector('[data-act=kickFpTable]'); if (b) b.focus(); }
        }));
      }
    };

    /* ---------- K10 Hướng dẫn ---------- */
    const kick_guide = {
      title: 'Hướng dẫn', needs: 'mode',
      render() {
        const ga = gaToday();
        const under28 = ga && Number.isInteger(ga.totalDays) && ga.status !== 'past42' && ga.totalDays < 196;
        const signs = kickSigns().map(s => `<li>${esc(s.label)}</li>`).join('');
        return `<section class="card stack kick kick-left">
          <h1>📖 Hướng dẫn đếm cử động thai</h1>
          ${under28 ? `<p class="kick-note kick-info"><span aria-hidden="true">ℹ︎ </span>${esc(T.m20b)}</p>` : ''}
          ${SIDE_SVG}
          <h2 class="kick-h3">Đếm khi nào?</h2><p>Mỗi ngày 2–3 lần, sau bữa ăn no, lúc chị thư thả. Từ tuần 28, hoặc từ khi bác sĩ dặn.</p>
          <h2 class="kick-h3">Đếm thế nào?</h2><p>Chị nằm nghiêng bên trái hoặc ngồi tựa. Mỗi lần con đạp, xoay, trườn, máy, chị chạm một lần vào đúng chỗ đó. Con nấc cụt thì không tính nhé.</p>
          <h2 class="kick-h3">Đếm bao lâu?</h2><p>Một giờ. App tự bấm giờ. Con cử động từ 4 lần trở lên trong giờ đó thì chị đếm lại vào bữa sau.</p>
          <h2 class="kick-h3">Giờ đầu con cử động ít?</h2><p>Con cử động 3 lần trở xuống thì chị đếm thêm 1 giờ nữa, và liên hệ cơ sở sản khoa nếu còn lo.</p>
          <h2 class="kick-h3">Khi nào đi khám ngay?</h2>
          <p>Chị đi khám ngay, không chờ đếm, khi có một trong những điều này:</p>
          <ul class="kick-list">${signs}<li>Giờ đầu con cử động 3 lần trở xuống, và giờ thứ hai vẫn vậy.</li><li>Trong 2 giờ con cử động chưa đủ 10 lần.</li></ul>
          <p>Linh cảm của mẹ cũng quan trọng. Chị thấy có gì khác lạ là đi khám nhé.</p>
          <button type="button" class="btn btn-secondary" data-go="support">🤝 Hỗ trợ</button>
          <h2 class="kick-h3">Mẹ con mình.</h2><p>Lúc đếm là lúc chị ngồi yên với con. Chị có thể xoa bụng, hát, hay kể con nghe hôm nay thế nào. Những phút như vậy là của riêng hai mẹ con.</p>
          <h2 class="kick-h3">App không thay thế việc khám.</h2><p>App chỉ giúp chị ghi lại. Chị vẫn đi khám thai đúng hẹn nhé.</p>
          ${reviewLine()}
          ${backBtn()}
        </section>`;
      },
      mount() { api.screenActions(common); }
    };

    /* ---------- K11 Lượt đếm của chị ---------- */
    function csvCell(v) {
      if (typeof U.csvCell === 'function') return U.csvCell(v);
      let s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s;                                  // chống chèn công thức (AC-58)
      return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    function download(name, mime, text) {
      if (typeof api.download === 'function') return api.download(name, mime, text);
      try {
        const url = URL.createObjectURL(new Blob([text], { type: mime }));
        const a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (e) { /* bỏ qua */ }
    }
    const fileDay = () => dayOf(now()).replace(/-/g, '');
    function toCsv(list) {
      const head = ['Ngày', 'Giờ bắt đầu', 'Tuần thai', 'Bữa', 'Số lần giờ đầu', 'Số lần giờ thứ hai', 'Tổng', 'Phút đạt 4 lần', 'Phút đạt 10 lần', 'Kết quả', 'Có giờ cần chú ý', 'Lý do', 'Cảm nhận của mẹ']; // A.15
      const rows = list.slice().reverse().map(s => [
        vnIso(s.startAt).slice(0, 10), hhmm(s.startAt), weekCsv(s.gaDays), s.meal ? MEAL_TEXT[s.meal] : '',
        s.h1, s.hadYellow ? s.h2 : '', s.total, s.min4 == null ? '' : s.min4, s.min10 == null ? '' : s.min10,
        RESULT_CSV[s.level] || '', s.hadYellow ? 'Có' : 'Không', s.reasons.join(' '), s.feel ? FEEL_CSV[s.feel] : ''
      ]);
      return '﻿' + [head].concat(rows).map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
    }
    const kick_data = {
      title: 'Lượt đếm của chị', needs: 'mode',
      render() {
        const p = store.prefs();
        const list = store.list();
        const mode = api.mode();
        const intro = mode === 'account'
          ? 'Mỗi lượt đếm được ghi vào nhật ký của chị và lưu lên tài khoản: giờ, bữa, số lần, kết quả và chỗ chị chạm trên hình bụng, để vẽ bản đồ bước chân của con trên máy nào cũng được.' // M-192
          : 'Mình lưu trên máy này: giờ bắt đầu, bữa ăn chị chọn, các lần chạm (giờ và vị trí trên hình), và kết quả từng lượt. Mình không gửi đi đâu.'; // M-191
        const items = list.map(s => {
          const l = lv(s.level, s.hadYellow);
          const slot = s.meal ? SLOT_TEXT[K.slotOf(s.meal, s.startAt, tz())] : SLOT_TEXT[K.slotOf(null, s.startAt, tz())];
          return `<li class="kick-item"><span>${esc(weekday(dayOf(s.startAt)) + ' ' + ddmm(s.startAt) + ' · ' + hhmm(s.startAt) + ' · ' + slot)}
            ${Number.isInteger(s.gaDays) ? ' · ' + esc(weekText(s.gaDays)) : ''} · <span class="lv-${l.cls}">${shape(l)}${esc(l.text)}</span> · ${s.total} lần</span>
            <button type="button" class="btn btn-secondary kick-del" data-act="kickDel" data-id="${esc(s.id)}">🗑 Xóa</button></li>`;
        }).join('');
        return `<section class="card stack kick kick-left">
          <h1>🗂️ Lượt đếm của chị</h1>
          <p>${esc(intro)}</p>
          ${mode === 'none' ? `<p class="fine">${esc(T.m30)}</p>` : ''}
          <button type="button" class="btn-link" data-go="data">Cài đặt quyền riêng tư và tài khoản ›</button>
          <div class="kick-row">
            <button type="button" class="btn btn-secondary kick-toggle" data-act="kickPref" data-pref="sound" aria-pressed="${p.sound}">🔊 Tiếng khi chạm</button>
            <button type="button" class="btn btn-secondary kick-toggle" data-act="kickPref" data-pref="vibrate" aria-pressed="${p.vibrate}">📳 Rung khi chạm</button>
          </div>
          <p class="fine">Máy không hỗ trợ rung thì mục này không có tác dụng.</p>
          ${list.length && mode !== 'none' ? `<div class="kick-row">
            <button type="button" class="btn btn-secondary" data-act="kickDl" data-fmt="json">⬇️ Tải lượt đếm (JSON)</button>
            <button type="button" class="btn btn-secondary" data-act="kickDl" data-fmt="csv">⬇️ Tải lượt đếm (CSV)</button></div>` : ''}
          ${list.length ? `<ul class="kick-items">${items}</ul>
            <button type="button" class="btn btn-secondary btn-block kick-danger-text" id="kClearAll" data-act="kickClearAsk">Xóa mọi lượt đếm</button>`
            : '<p>Chưa có lượt đếm nào. Sau bữa ăn tới, mình cùng đếm nhé.</p>'}
          ${backBtn()}
        </section>`;
      },
      mount(root) {
        syncGa();
        const armed = {};
        L.onCleanup(() => closeKickDialog(false));
        api.screenActions(Object.assign({}, common, {
          kickPref: btn => {
            const k = btn.dataset.pref === 'vibrate' ? 'vibrate' : 'sound';
            const on = !store.prefs()[k];
            store.setPrefs({ [k]: on });
            btn.setAttribute('aria-pressed', String(on));
            toast('Đã lưu cài đặt.');                                                             // M-204
          },
          kickDl: btn => {
            const list = store.list();
            if (btn.dataset.fmt === 'csv') download(`dem-con-dap-${fileDay()}.csv`, 'text/csv;charset=utf-8', toCsv(list));
            else download(`dem-con-dap-${fileDay()}.json`, 'application/json', JSON.stringify({ app: C.APP_NAME, kind: 'kick_sessions', v: 1, exportedAt: new Date(now()).toISOString(), sessions: list }, null, 2));
          },
          kickDel: btn => {
            const id = btn.dataset.id;
            if (!armed[id]) {                                                                      // M-199: chạm 2 lần
              armed[id] = true; btn.textContent = 'Chạm lần nữa để xóa'; btn.classList.add('armed');
              L.later(() => { if (armed[id]) { armed[id] = false; btn.textContent = '🗑 Xóa'; btn.classList.remove('armed'); } }, 4000);
              return;
            }
            store.remove(id);
            toast('Đã xóa lượt đếm.');                                                            // M-200
            api.rerender();
          },
          kickClearAsk: () => {
            openKickDialog(`<div class="kick-dialog" role="alertdialog" aria-modal="true" aria-labelledby="kClrT">
              <h2 id="kClrT">Xóa mọi lượt đếm của chị? Không lấy lại được đâu.</h2>
              ${api.mode() === 'account' ? '<p>Các lượt đếm và bước chân trên tài khoản cũng sẽ mất.</p>' : ''}
              <button type="button" class="btn btn-block kick-danger" data-act="kickClearDo">Mình hiểu, xóa mọi lượt đếm</button>
              <button type="button" class="btn btn-secondary btn-block" data-act="kickClearCancel">Thôi, giữ lại</button>
            </div>`, 1, 'kickClearCancel');                                                        // M-202, L08; Esc = Thôi, giữ lại
          },
          kickClearCancel: () => closeKickDialog(),
          kickClearDo: () => {
            closeKickDialog(false);
            store.clearAll();
            resetMem();
            toast('Đã xóa mọi lượt đếm.');                                                        // M-203
            api.rerender();
          }
        }));
      }
    };

    return { kick_home, kick_before, kick_pause5, kick_count, kick_feel, kick_result, kick_stopped, kick_track, kick_footprints, kick_guide, kick_data };
  }

  /* ===== Đăng ký module (tech design 3.2) ===== */
  (window.LSTP_MODULES = window.LSTP_MODULES || []).push({
    name: 'kick',
    screens,
    homeTiles: () => [{ go: 'kick_home', label: '👣 Đếm cử động thai', sub: 'Sau bữa ăn, chị dành một giờ lắng nghe con nhé.' }], // M-10, M-11
    dataSections: () => [{
      id: 'kick',
      render: () => '<h2 class="kick-h2">👣 Đếm cử động thai</h2><button type="button" class="btn btn-secondary" data-go="kick_data">🗂️ Lượt đếm của chị ›</button>',
      mount() {}
    }],
    // Gắn kiểm toàn app một lần lúc boot: dải L12 dưới header, ▲ tự chuyển trang khẩn, mở lại app (R-09)
    init(apiIn) {
      if (!api) screens(apiIn);
      const header = document.getElementById('header');
      if (header && !document.getElementById('kick-strip')) {
        strip = document.createElement('div');
        strip.id = 'kick-strip'; strip.className = 'kick-strip'; strip.hidden = true;
        header.insertAdjacentElement('afterend', strip);
      }
      setInterval(globalTick, 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) globalTick(); });
      window.addEventListener('pageshow', globalTick);
      window.addEventListener('focus', globalTick);
      const main = document.getElementById('main');
      if (main && typeof MutationObserver === 'function') new MutationObserver(globalTick).observe(main, { attributes: true, attributeFilter: ['data-screen'] });
      // Chị tự mở trang khẩn từ dải ▲ → lượt đỏ đã được hiện, bỏ khỏi lstp_kick_active
      if (strip) strip.addEventListener('click', () => { if (strip.querySelector('.kick-strip-red')) { const a = store.getActive(); if (a && a.level === 'red') store.clearActive(); hideStrip(); } });
      // NS-1: xóa hành trình / mọi lượt đếm / toàn bộ → bỏ lượt dở trong bộ nhớ, không ghi lại khóa
      try { if (S && typeof S.onChange === 'function') S.onChange(ev => { if (ev && ev.type === 'change' && ((ev.kind === 'kick' && ev.op === 'clear') || ev.kind === 'journey' || ev.kind === 'all')) resetMem(); }); } catch (e) { /* bỏ qua */ }
      try { if (S && typeof S.onCleared === 'function') S.onCleared(resetMem); } catch (e) { /* bỏ qua */ }
      window.addEventListener('lstp:cleared', e => { const w = e && e.detail && e.detail.what; if (!w || w === 'kick' || w === 'journey' || w === 'all') resetMem(); });
      // R-06/R-07 từ module khác (trang Dấu hiệu, check-in): chỉ chốt đỏ lượt dở, người gọi tự mở trang khẩn
      apiIn.kickReportReduced = o => reportFromOutside(o, true);
      apiIn.kickReportSigns = o => reportFromOutside(o, false);
      window.LSTP_KICK = { reportReduced: apiIn.kickReportReduced, reportSigns: apiIn.kickReportSigns };
      setTimeout(globalTick, 0);                      // sau khi app.js boot xong: tính lại lượt dở theo giờ thật
    },
    // F12/R-09: chạy lúc khởi động, trước mọi điều hướng. Lượt dở đã đỏ theo giờ thật (hoặc đỏ chưa được xem)
    // → vào thẳng trang khẩn. Lúc khởi động chị chưa ở màn khẩn nào nên không phạm C-1.
    // Giờ 1 / giờ 2 / chờ cảm nhận → null (không tự chuyển; Trang chính, trang mục và dải L12 dẫn về màn đếm).
    bootRoute(apiIn) {
      try {
        if (!api) screens(apiIn);
        if (!apiIn.mode()) return null;
        const a = store.getActive();
        if (!a) return null;
        const r = K.evaluate(a, now(), cfg);
        if (r.level !== 'red') return null;
        const rec = finalRecord(a, r);
        store.save(rec); store.clearActive(); markHabit(rec);
        return { name: 'see_doctor', params: { reasons: rec.reasons.slice(), signs: rec.signs.slice(), from: 'kick' } };
      } catch (e) { return null; }
    },
    onModeChange() { resetMem(); },
    onCleared(apiIn, what) { if (!what || what === 'kick' || what === 'journey' || what === 'all') resetMem(); }
  });
})();
