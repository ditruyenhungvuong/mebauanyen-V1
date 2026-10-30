/* =========================================================
   Mẹ Bầu An Yên – js/store.js · window.LSTP_STORE (chủ: FE-1 Lõi)
   Ba chế độ none | local | account (tech design 5.3–5.6, ADR 0004). Màn hình CHỈ gọi các hàm ở đây.
   Quy tắc cứng:
   - CHỈ đọc/ghi/xóa khóa bắt đầu 'lstp_'. Không bao giờ localStorage.clear().
   - Mọi thao tác bọc try/catch; trình duyệt chặn lưu → phát sự kiện 'blocked' (app.js báo A.23) và chạy như "không lưu".
   - Dữ liệu đọc lại là input không tin được (app khác cùng origin có thể sửa): kiểm kiểu TỪNG TRƯỜNG
     bằng whitelist, bỏ bản ghi sai, phát 'bad_data' một lần (app.js báo M-205).
   - Chế độ none không ghi gì, trừ lstp_kick_* trong sessionStorage (AC-11, AC-80).
   - Không biết tới fetch: chế độ account ghi đệm rồi gọi adapter.enqueue(op); sync.js (Bước B) lo gửi.
   Quy ước trả về: list() mới nhất trước; habits.range() theo ngày tăng dần; hàm ghi trả bản ghi đã làm sạch,
   hoặc null nếu bản ghi sai shape / không được phép lưu (vd lời nhắn khi chưa đồng ý "tự viết").
   ========================================================= */
window.LSTP_STORE = (() => {
  'use strict';
  const C = window.LSTP_CONFIG || {};
  const U = window.LSTP_UTIL;
  const D = () => window.LSTP_DATA || {};   // đọc lười: data.js có thể đổi danh mục
  const PREFIX = 'lstp_';
  const KEY = {
    local: 'lstp_v1_local', checkins: 'lstp_v1_checkins', thaigiao: 'lstp_v1_thaigiao', letters: 'lstp_v1_letters',
    habits: 'lstp_v1_habits', prefs: 'lstp_v1_prefs', profile: 'lstp_profile',
    kickSessions: 'lstp_kick_sessions', kickActive: 'lstp_kick_active', kickPrefs: 'lstp_kick_prefs',
    session: 'lstp_v1_session', pending: 'lstp_v1_pending', acct: 'lstp_v1_acct', kickAcct: 'lstp_kick_acct_sessions'
  };
  const LIMIT = { checkins: 500, thaigiao: 1000, letters: 500, habitDays: 400, kickDays: 400 };
  const now = () => Date.now();
  const today = () => U.dayKey(now());

  /* ===== Lớp an toàn quanh Web Storage ===== */
  function guard(key) {
    if (typeof key !== 'string' || !key.startsWith(PREFIX)) throw new Error('store: khóa ngoài tiền tố lstp_: ' + key);
  }
  function area(name) {
    try { return name === 'session' ? window.sessionStorage : window.localStorage; } catch (e) { return null; }
  }
  function rawGet(name, key) {
    guard(key);
    try { const a = area(name); return a ? a.getItem(key) : null; } catch (e) { return null; }
  }
  function rawSet(name, key, value) {
    guard(key);
    try { const a = area(name); if (!a) return false; a.setItem(key, value); return true; } catch (e) { return false; }
  }
  function rawDel(name, key) {
    guard(key);
    try { const a = area(name); if (a) a.removeItem(key); } catch (e) { /* bỏ qua */ }
  }
  // Liệt kê khóa lstp_ của một vùng (để xóa toàn bộ mà không clear())
  function rawKeys(name) {
    try {
      const a = area(name); if (!a) return [];
      const out = [];
      for (let i = 0; i < a.length; i++) { const k = a.key(i); if (typeof k === 'string' && k.startsWith(PREFIX)) out.push(k); }
      return out;
    } catch (e) { return []; }
  }
  // JSON đọc lại: { value } nếu đọc được, { missing } nếu chưa có, { bad } nếu hỏng
  function readRaw(name, key) {
    const raw = rawGet(name, key);
    if (raw == null) return { missing: true, value: null };
    try { return { value: JSON.parse(raw) }; } catch (e) { return { bad: true, value: null }; }
  }
  const readJSON = (name, key) => readRaw(name, key).value;
  const writeJSON = (name, key, obj) => rawSet(name, key, JSON.stringify(obj));

  /* ===== Sự kiện cho màn hình (onChange) ===== */
  const listeners = [];
  function emit(ev) { listeners.slice().forEach(fn => { try { fn(ev); } catch (e) { /* bỏ qua */ } }); }
  let badReported = false;
  function reportBad() { if (!badReported) { badReported = true; emit({ type: 'bad_data' }); } }

  /* ===== Kiểm shape (whitelist từng trường, tech design 5.1–5.2) ===== */
  const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const isId = s => typeof s === 'string' && /^[0-9a-z]{12,40}$/.test(s);
  const isCodeStr = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s);
  const isMs = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
  const msOrNull = n => n == null ? null : (isMs(n) ? n : undefined);
  const numOrNull = n => n == null ? null : (typeof n === 'number' && Number.isFinite(n) ? n : undefined);
  const enumOrNull = (v, list) => v == null ? null : (list.includes(v) ? v : undefined);
  const isPrompt = s => typeof s === 'string' && /^TG-\d{2}$/.test(s);
  // Mã có trong danh mục của data.js không. Danh mục chưa có (đang làm) → chỉ kiểm dạng mã.
  function inList(code, name) {
    if (!isCodeStr(code)) return false;
    const L = D()[name];
    if (Array.isArray(L) && L.length) return L.some(x => x && (x.code === code || x.id === code));
    if (isObj(L) && Object.keys(L).length) return Object.prototype.hasOwnProperty.call(L, code);
    return true;
  }
  // Mảng mã: thiếu → []; sai kiểu, quá dài, mã lạ → undefined (bản ghi bị bỏ)
  function codes(v, max, name) {
    if (v == null) return [];
    if (!Array.isArray(v) || v.length > max) return undefined;
    return v.every(c => name ? inList(c, name) : isCodeStr(c)) ? v.slice() : undefined;
  }
  const tension = v => v == null ? null : (Number.isInteger(v) && v >= 0 && v <= 10 ? v : undefined);
  const anyUndef = o => Object.values(o).some(x => x === undefined);

  function cleanCheckin(r) {
    if (!isObj(r) || !isId(r.id) || !isMs(r.at)) return null;
    const out = {
      v: 1, id: r.id, at: r.at,
      emotions: codes(r.emotions, 8, 'EMOTIONS'),
      before: tension(r.before), after: tension(r.after),
      exercise: r.exercise == null ? null : (inList(r.exercise, 'EXERCISES') ? r.exercise : undefined),
      fit: enumOrNull(r.fit, ['fit', 'unfit', 'worse', 'unsure']),
      contexts: codes(r.contexts, 12, 'CONTEXTS'),
      minutes: enumOrNull(r.minutes, [1, 2, 3, 5, 10, 15])
    };
    if (anyUndef(out)) return null;
    if (r.note != null) { if (typeof r.note !== 'string') return null; if (r.note.trim()) out.note = r.note.slice(0, 1000); }
    return out;
  }
  function cleanThaiGiao(r) {
    if (!isObj(r) || !isId(r.id) || !isMs(r.at) || !U.isDay(r.day) || !isPrompt(r.prompt) || !['done', 'letter'].includes(r.how)) return null;
    return { v: 1, id: r.id, at: r.at, day: r.day, prompt: r.prompt, how: r.how };
  }
  function cleanLetter(r) {
    if (!isObj(r) || !isId(r.id) || !isMs(r.at) || !U.isDay(r.day)) return null;
    if (r.prompt != null && !isPrompt(r.prompt)) return null;
    if (typeof r.text !== 'string' || !r.text.trim()) return null;
    return { v: 1, id: r.id, at: r.at, day: r.day, prompt: r.prompt ?? null, text: r.text.slice(0, 2000) };
  }
  function cleanHabitDay(r) {
    if (!isObj(r) || !U.isDay(r.day) || !isObj(r.marks)) return null;
    const marks = {};
    for (const [k, v] of Object.entries(r.marks)) {
      if (!inList(k, 'HABITS') || !['', 'x', 'a'].includes(v)) return null;
      marks[k] = v;
    }
    const at = msOrNull(r.at);
    if (at === undefined) return null;
    return { v: 1, day: r.day, marks, at };
  }
  function cleanHabitPrefs(r) {
    if (!isObj(r)) return null;
    const enabled = codes(r.enabled, 20, 'HABITS');
    const at = msOrNull(r.at);
    if (!enabled || at === undefined) return null;
    return { v: 1, enabled, at };
  }
  const unit = n => n == null ? null : (typeof n === 'number' && n >= 0 && n <= 1 ? Math.round(n * 1000) / 1000 : undefined);
  function cleanKick(r) {
    if (!isObj(r) || !isId(r.id) || !isMs(r.startAt)) return null;
    if (r.taps != null && !Array.isArray(r.taps)) return null;
    const taps = [];
    for (const t of (r.taps || []).slice(0, C.KICK_MAX_TAPS || 200)) {
      if (!isObj(t) || typeof t.t !== 'number' || !Number.isFinite(t.t) || t.t < 0) return null;
      const x = unit(t.x), y = unit(t.y);
      if (x === undefined || y === undefined) return null;
      taps.push({ t: t.t, x, y });
    }
    const out = {
      v: 1, id: r.id, startAt: r.startAt, endAt: msOrNull(r.endAt),
      meal: enumOrNull(r.meal, ['breakfast', 'lunch', 'dinner', 'other']),
      taps, signs: codes(r.signs, 20, 'DANGER_SIGNS'),
      motherReportedAt: msOrNull(r.motherReportedAt), doneAt: msOrNull(r.doneAt), stoppedAt: msOrNull(r.stoppedAt),
      feel: enumOrNull(r.feel, ['same', 'different', 'skipped']),
      level: enumOrNull(r.level, ['green', 'yellow', 'red', 'stopped', 'stopped_yellow']),
      hadYellow: r.hadYellow == null ? false : (typeof r.hadYellow === 'boolean' ? r.hadYellow : undefined),
      reasons: codes(r.reasons, 10),
      h1: numOrNull(r.h1), h2: numOrNull(r.h2), total: numOrNull(r.total), min4: numOrNull(r.min4), min10: numOrNull(r.min10),
      // Tuổi thai (ngày) lúc bắt đầu lượt, số nguyên [0, 294] hoặc null (PRD-K 5.5, K-AC-73)
      gaDays: r.gaDays == null ? null : (Number.isInteger(r.gaDays) && r.gaDays >= 0 && r.gaDays <= 294 ? r.gaDays : undefined)
    };
    return anyUndef(out) ? null : out;
  }
  function cleanProfile(r) {
    if (!isObj(r)) return null;
    const edd = r.edd == null ? null : (U.isDay(r.edd) ? r.edd : undefined);
    const born = r.born == null ? null : (U.isDay(r.born) ? r.born : undefined);
    const at = msOrNull(r.at);
    if (edd === undefined || born === undefined || at === undefined) return null;
    return { v: 1, edd, born, asked: r.asked === true, at };
  }
  const cleanPrefs = r => isObj(r) && typeof r.sound === 'boolean' ? { v: 1, sound: r.sound } : null;
  const cleanKickPrefs = r => isObj(r) ? { v: 1, sound: r.sound !== false, vibrate: r.vibrate !== false, seenTip: r.seenTip === true } : null;
  function cleanLocal(r) {
    if (!isObj(r) || !isObj(r.consent) || r.consent.journey !== true) return null;
    return { v: 1, consent: { journey: true, writing: r.consent.writing === true, version: String(r.consent.version || ''), at: isMs(r.consent.at) ? r.consent.at : null }, createdAt: isMs(r.createdAt) ? r.createdAt : null };
  }
  // Làm sạch một mảng đọc lại: bỏ bản ghi sai, báo M-205 một lần
  function cleanList(v, fn) {
    if (v == null) return [];
    if (!Array.isArray(v)) { reportBad(); return []; }
    const out = [];
    let dropped = false;
    for (const r of v) { const c = fn(r); if (c) out.push(c); else dropped = true; }
    if (dropped) reportBad();
    return out;
  }

  /* ===== Chế độ và nơi chứa ===== */
  let mode = null;          // null (chưa chọn) | 'none' | 'local' | 'account'
  let localConsent = null;  // {journey, writing, version, at} khi mode === 'local'
  let remote = null;        // adapter Bước B: { acct, area, privateDevice, consent, enqueue(op), pull(kinds), pendingCount() }
  const freshMem = () => ({ checkins: [], thaigiao: [], letters: [], habits: { prefs: null, days: {} }, prefs: null, profile: null, kickPrefs: null, kickSessions: [], kickActive: null });
  let mem = freshMem();
  const remoteArea = () => (remote && remote.area === 'local') ? 'local' : 'session';

  // Mỗi loại dữ liệu nằm ở đâu theo chế độ (bảng 5.3). {mem:true} = chỉ bộ nhớ; {area,key[,sub]} = Web Storage.
  function where(kind) {
    if (mode === 'local') {
      const map = { checkins: KEY.checkins, thaigiao: KEY.thaigiao, letters: KEY.letters, habits: KEY.habits, prefs: KEY.prefs,
        profile: KEY.profile, kickSessions: KEY.kickSessions, kickActive: KEY.kickActive, kickPrefs: KEY.kickPrefs };
      return { area: 'local', key: map[kind] };
    }
    if (mode === 'account' && remote) {
      const ra = remoteArea();
      if (['checkins', 'thaigiao', 'habits', 'prefs'].includes(kind)) return { area: ra, key: KEY.acct, sub: kind };
      if (kind === 'letters') return remote.privateDevice ? { area: 'local', key: KEY.letters } : { mem: true }; // K-11
      if (kind === 'kickPrefs') return remote.privateDevice ? { area: 'local', key: KEY.kickPrefs } : { mem: true };
      if (kind === 'profile') return { area: ra, key: KEY.profile };
      if (kind === 'kickSessions') return { area: ra, key: KEY.kickAcct };
      if (kind === 'kickActive') return { area: ra, key: KEY.kickActive };
    }
    // none (và chưa chọn): chỉ bộ nhớ, trừ lượt đếm ở sessionStorage của tab (R-09)
    if (kind === 'kickActive') return { area: 'session', key: KEY.kickActive };
    if (kind === 'kickSessions') return { area: 'session', key: KEY.kickSessions };
    return { mem: true };
  }
  function load(kind) {
    const w = where(kind);
    if (w.mem) return mem[kind];
    const r = readRaw(w.area, w.key);
    if (r.bad) { reportBad(); return null; }
    if (w.sub) { const blob = r.value; return isObj(blob) && remote && blob.acct === remote.acct ? blob[w.sub] ?? null : null; }
    return r.value;
  }
  function save(kind, value) {
    const w = where(kind);
    if (w.mem) { mem[kind] = value; return true; }
    let ok;
    if (w.sub) {
      let blob = readJSON(w.area, w.key);
      if (!isObj(blob) || blob.acct !== remote.acct) blob = { v: 1, acct: remote.acct, pulledAt: null };
      blob[w.sub] = value;
      ok = writeJSON(w.area, w.key, blob);
    } else ok = value == null ? (rawDel(w.area, w.key), true) : writeJSON(w.area, w.key, value);
    if (!ok) { blocked(kind, value); return false; }
    return true;
  }
  // Trình duyệt chặn lưu giữa chừng (đầy bộ nhớ, chế độ riêng tư): chép dữ liệu đang có sang bộ nhớ, chạy như "không lưu"
  function blocked(kind, value) {
    if (mode === 'local') {
      const m = freshMem();
      for (const k of ['checkins', 'thaigiao', 'letters', 'habits', 'prefs', 'profile', 'kickPrefs']) { try { const v = load(k); if (v != null) m[k] = v; } catch (e) { /* bỏ qua */ } }
      mode = 'none'; localConsent = null; mem = m;
    }
    if (kind && !['kickActive', 'kickSessions'].includes(kind)) mem[kind] = value;
    emit({ type: 'blocked' });
  }
  function enqueue(op) {
    if (mode !== 'account' || !remote || typeof remote.enqueue !== 'function') return;
    try { remote.enqueue(op); } catch (e) { /* hàng chờ lỗi không được làm vỡ màn hình */ }
  }
  const changed = (kind, op) => emit({ type: 'change', kind, op });

  /* ===== Đồng ý và chế độ ===== */
  function canSave(kind) {
    if (kind === 'journey') return mode === 'local' || mode === 'account';
    if (kind === 'writing') {
      if (mode === 'local') return !!(localConsent && localConsent.writing);
      if (mode === 'account') return !!(remote && remote.privateDevice && remote.consent && remote.consent.writing);
      return false;
    }
    if (kind === 'textSync') return mode === 'account' && !!C.TEXT_SYNC_ENABLED && !!(remote && remote.consent && remote.consent.text);
    return false;
  }
  function consent() {
    if (mode === 'local' && localConsent) return Object.assign({}, localConsent);
    if (mode === 'account' && remote && remote.consent) return Object.assign({}, remote.consent);
    return null;
  }
  // Nhận chế độ lúc mở app (tech design 5.4). Account do account.js (Bước B) xác nhận bằng whoami rồi attachRemote.
  function detectMode() {
    const r = readRaw('local', KEY.local);
    if (r.bad) reportBad();
    if (cleanLocal(r.value)) return 'local';
    if (rawGet('session', KEY.kickActive) != null) return 'none'; // tải lại giữa lượt đếm ở chế độ không lưu (R-09)
    return null;
  }
  function setMode(m) {
    mode = m;
    if (m === 'local') { const l = cleanLocal(readJSON('local', KEY.local)); localConsent = l ? l.consent : { journey: true, writing: false, version: C.PRIVACY_VERSION, at: null }; }
    else localConsent = null;
  }
  function startNone() {
    if (mode !== 'none') mem = freshMem();
    mode = 'none'; localConsent = null; remote = null;
    changed('mode', 'none');
  }
  // "Tiếp tục" ở A.2: ghi khóa đầu tiên rồi đọc lại; trình duyệt chặn → false (app báo A.23, chạy như không lưu)
  function startLocal({ writing = false } = {}) {
    const rec = { v: 1, consent: { journey: true, writing: !!writing, version: C.PRIVACY_VERSION || '', at: now() }, createdAt: now() };
    const ok = writeJSON('local', KEY.local, rec) && !!cleanLocal(readJSON('local', KEY.local));
    if (!ok) { rawDel('local', KEY.local); return false; }
    const prev = mode, carry = mem;
    setMode('local');
    // Từ "không lưu" chuyển sang "lưu trên máy" trong cùng phiên: mang theo những gì đang có trong bộ nhớ
    if (prev === 'none') {
      if (carry.profile) save('profile', carry.profile);
      if (carry.checkins.length) save('checkins', carry.checkins.map(r => { const c = Object.assign({}, r); if (!writing) delete c.note; return c; }));
      if (carry.thaigiao.length) save('thaigiao', carry.thaigiao);
      if (Object.keys(carry.habits.days).length || carry.habits.prefs) save('habits', carry.habits);
      if (carry.prefs) save('prefs', carry.prefs);
      for (const k of [KEY.kickActive, KEY.kickSessions]) {
        const v = rawGet('session', k);
        if (v != null && rawSet('local', k, v)) rawDel('session', k);
      }
    }
    mem = freshMem();
    changed('mode', 'local');
    return true;
  }
  // Đổi đồng ý ở "Dữ liệu của chị" (chỉ chế độ local). Tắt "tự viết" KHÔNG tự xóa chữ: màn gọi dropWriting() nếu chị chọn xóa.
  function setLocalConsent({ journey = true, writing } = {}) {
    if (mode !== 'local' || !journey) return false;
    const cur = cleanLocal(readJSON('local', KEY.local)) || { v: 1, consent: { journey: true }, createdAt: now() };
    cur.consent = { journey: true, writing: writing == null ? !!(localConsent && localConsent.writing) : !!writing, version: C.PRIVACY_VERSION || '', at: now() };
    if (!writeJSON('local', KEY.local, cur)) { blocked(); return false; }
    localConsent = cur.consent;
    changed('consent', 'set');
    return true;
  }
  // "Xóa luôn những gì đã viết": lời nhắn + phần "kể thêm" của check-in
  function dropWriting() {
    letters.clear();
    const list = cleanList(load('checkins'), cleanCheckin);
    if (list.some(r => r.note)) save('checkins', list.map(r => { const c = Object.assign({}, r); delete c.note; return c; }));
    changed('writing', 'drop');
  }

  /* ===== Bảng dạng danh sách (check-in, thai giáo, lời nhắn) ===== */
  function makeList(kind, cleanFn, limit, dayOf) {
    const all = () => cleanList(load(kind), cleanFn);
    const put = list => {
      if (list.length > limit) list = list.slice().sort((a, b) => a.at - b.at).slice(list.length - limit); // bỏ cũ nhất
      return save(kind, list);
    };
    return {
      all, put,
      list({ sinceDay } = {}) {
        let l = all();
        if (sinceDay) l = l.filter(r => dayOf(r) >= sinceDay);
        return l.sort((a, b) => b.at - a.at);
      },
      get(id) { return all().find(r => r.id === id) || null; },
      remove(id) {
        const l = all();
        const n = l.filter(r => r.id !== id);
        if (n.length === l.length) return false;
        put(n);
        enqueue({ op: 'delete', kind: kind.replace(/s$/, ''), ref: { id }, key: kind.replace(/s$/, '') + ':' + id });
        changed(kind, 'remove');
        return true;
      },
      clear() {
        const l = all();
        save(kind, []);
        l.forEach(r => enqueue({ op: 'delete', kind: kind.replace(/s$/, ''), ref: { id: r.id }, key: kind.replace(/s$/, '') + ':' + r.id }));
        changed(kind, 'clear');
      }
    };
  }
  const dayOfAt = r => U.dayKey(r.at);
  const CK = makeList('checkins', cleanCheckin, LIMIT.checkins, dayOfAt);
  const TG = makeList('thaigiao', cleanThaiGiao, LIMIT.thaigiao, r => r.day);
  const LT = makeList('letters', cleanLetter, LIMIT.letters, r => r.day);

  const checkins = {
    // rec: {emotions, before, after, exercise, fit, contexts, minutes, note?}; id/at/v tự điền nếu thiếu
    add(rec) {
      const r = cleanCheckin(Object.assign({ v: 1, id: U.randomId(), at: now(), emotions: [], before: null, after: null, exercise: null, fit: null, contexts: [], minutes: null }, rec || {}));
      if (!r) return null;
      if (!canSave('writing')) delete r.note;
      CK.put(CK.all().filter(x => x.id !== r.id).concat(r));
      enqueue({ op: 'save', kind: 'checkin', rec: textSyncStrip(r), key: 'checkin:' + r.id });
      changed('checkins', 'add');
      return r;
    },
    update(id, patch) {
      const l = CK.all();
      const i = l.findIndex(x => x.id === id);
      if (i < 0) return null;
      const r = cleanCheckin(Object.assign({}, l[i], patch || {}, { id, v: 1 }));
      if (!r) return null;
      if (!canSave('writing')) delete r.note;
      l[i] = r;
      CK.put(l);
      enqueue({ op: 'save', kind: 'checkin', rec: textSyncStrip(r), key: 'checkin:' + r.id });
      changed('checkins', 'update');
      return r;
    },
    list: CK.list, get: CK.get, remove: CK.remove
  };
  // "Kể thêm" chỉ lên server khi đồng ý gửi chữ (AC-116)
  function textSyncStrip(r) { if (!r.note || canSave('textSync')) return r; const c = Object.assign({}, r); delete c.note; return c; }

  const thaigiao = {
    // Mốc "đã làm" của một lời nhắc trong ngày; cùng ngày + cùng lời nhắc thì cập nhật, không nhân đôi
    mark(day, prompt, how = 'done') {
      const l = TG.all();
      const old = l.find(r => r.day === day && r.prompt === prompt);
      const r = cleanThaiGiao(Object.assign({ v: 1, id: U.randomId(), at: now() }, old || {}, { day, prompt, how: (old && old.how === 'letter') ? 'letter' : how }));
      if (!r) return null;
      TG.put(l.filter(x => x.id !== r.id).concat(r));
      enqueue({ op: 'save', kind: 'thaigiao', rec: r, key: 'thaigiao:' + r.id });
      changed('thaigiao', 'mark');
      return r;
    },
    list: TG.list, get: TG.get, remove: TG.remove, clear: TG.clear
  };

  const letters = {
    // Chỉ lưu khi canSave('writing') (AC-16); không thì null — màn hiện câu A.17 và cho tải về
    add({ day, prompt = null, text } = {}) {
      if (!canSave('writing')) return null;
      const r = cleanLetter({ v: 1, id: U.randomId(), at: now(), day: day || today(), prompt, text });
      if (!r) return null;
      LT.put(LT.all().concat(r));
      if (canSave('textSync')) enqueue({ op: 'save', kind: 'letter', rec: r, key: 'letter:' + r.id });
      changed('letters', 'add');
      return r;
    },
    list: LT.list, get: LT.get, remove: LT.remove, clear: LT.clear
  };

  /* ===== Thói quen: một bản ghi mỗi ngày (ghi đè cả ngày) ===== */
  function habitsBlob() {
    const raw = load('habits');
    if (raw == null) return { prefs: null, days: {} };
    if (!isObj(raw)) { reportBad(); return { prefs: null, days: {} }; }
    const days = {};
    let dropped = false;
    for (const [d, rec] of Object.entries(isObj(raw.days) ? raw.days : {})) { const c = cleanHabitDay(rec); if (c && c.day === d) days[d] = c; else dropped = true; }
    const prefs = raw.prefs == null ? null : cleanHabitPrefs(raw.prefs);
    if (dropped || (raw.prefs != null && !prefs)) reportBad();
    return { prefs, days };
  }
  function putHabits(blob) {
    const keys = Object.keys(blob.days).sort();
    if (keys.length > LIMIT.habitDays) keys.slice(0, keys.length - LIMIT.habitDays).forEach(k => delete blob.days[k]);
    return save('habits', blob);
  }
  const habits = {
    getDay(day) { const d = habitsBlob().days[day]; return d ? JSON.parse(JSON.stringify(d)) : { v: 1, day, marks: {}, at: null }; },
    // val: '' bỏ đánh dấu · 'x' chị tick · 'a' tự đánh dấu
    setMark(day, code, val) {
      if (!U.isDay(day) || !inList(code, 'HABITS') || !['', 'x', 'a'].includes(val)) return null;
      const b = habitsBlob();
      const rec = b.days[day] || { v: 1, day, marks: {}, at: null };
      rec.marks[code] = val; rec.at = now();
      b.days[day] = rec;
      putHabits(b);
      enqueue({ op: 'save', kind: 'habit', rec, key: 'habit:' + day });
      changed('habits', 'mark');
      return JSON.parse(JSON.stringify(rec));
    },
    range(fromDay, toDay) {
      return Object.values(habitsBlob().days).filter(r => (!fromDay || r.day >= fromDay) && (!toDay || r.day <= toDay)).sort((a, b) => a.day < b.day ? -1 : 1);
    },
    // null = chị chưa chọn, màn thói quen tự dùng mặc định (bảng 3.8, AC-134)
    prefs() { return habitsBlob().prefs; },
    setPrefs(list) {
      const p = cleanHabitPrefs({ enabled: list, at: now() });
      if (!p) return null;
      const b = habitsBlob(); b.prefs = p; putHabits(b);
      enqueue({ op: 'save', kind: 'habitPrefs', rec: p, key: 'prefs' });
      changed('habits', 'prefs');
      return p;
    },
    removeDay(day) {
      const b = habitsBlob();
      if (!b.days[day]) return false;
      delete b.days[day]; putHabits(b);
      enqueue({ op: 'delete', kind: 'habit', ref: { day }, key: 'habit:' + day });
      changed('habits', 'removeDay');
      return true;
    }
  };

  /* ===== Đếm cử động thai (luật ở kick-rules.js; store chỉ giữ bản ghi) ===== */
  const kick = {
    getActive() {
      const v = load('kickActive');
      if (v == null) return null;
      const c = cleanKick(v);
      if (!c) reportBad();
      return c;
    },
    // Ghi MỖI LẦN CHẠM (tech design 13.1); trả false nếu không ghi được (M-206 do màn đếm báo)
    setActive(s) {
      const c = cleanKick(s);
      if (!c) return false;
      const w = where('kickActive');
      const ok = w.mem ? (mem.kickActive = c, true) : writeJSON(w.area, w.key, c);
      if (!ok) { mem.kickActive = c; emit({ type: 'kick_unsaved' }); }
      return ok;
    },
    clearActive() { const w = where('kickActive'); if (w.mem) mem.kickActive = null; else rawDel(w.area, w.key); },
    save(session) {
      const c = cleanKick(session);
      if (!c) return null;
      let l = kick._all().filter(x => x.id !== c.id).concat(c);
      if (mode === 'local' || mode === 'account') { const min = U.dayAdd(today(), -LIMIT.kickDays); l = l.filter(x => U.dayKey(x.startAt) >= min); }
      const w = where('kickSessions');
      if (!writeJSON(w.area, w.key, l)) emit({ type: 'kick_unsaved' });
      enqueue({ op: 'save', kind: 'kick', rec: c, key: 'kick:' + c.id });
      changed('kick', 'save');
      return c;
    },
    _all() { const w = where('kickSessions'); const r = readRaw(w.area, w.key); if (r.bad) reportBad(); return cleanList(r.value, cleanKick); },
    list({ sinceDay } = {}) {
      let l = kick._all();
      if (sinceDay) l = l.filter(x => U.dayKey(x.startAt) >= sinceDay);
      return l.sort((a, b) => b.startAt - a.startAt);
    },
    get(id) { return kick._all().find(x => x.id === id) || null; },
    remove(id) {
      const l = kick._all(), n = l.filter(x => x.id !== id);
      if (n.length === l.length) return false;
      const w = where('kickSessions'); writeJSON(w.area, w.key, n);
      enqueue({ op: 'delete', kind: 'kick', ref: { id }, key: 'kick:' + id });
      changed('kick', 'remove');
      return true;
    },
    // "Xóa mọi lượt đếm": mọi lượt, lượt dở, cài đặt tiếng/rung của mục (bảng 5.3)
    clearAll() {
      const l = kick._all();
      const w = where('kickSessions'); rawDel(w.area, w.key);
      kick.clearActive();
      save('kickPrefs', null);
      l.forEach(x => enqueue({ op: 'delete', kind: 'kick', ref: { id: x.id }, key: 'kick:' + x.id }));
      changed('kick', 'clear');
    },
    prefs() { return cleanKickPrefs(load('kickPrefs')) || { v: 1, sound: true, vibrate: true, seenTip: false }; },
    setPrefs(patch) { const p = cleanKickPrefs(Object.assign({}, kick.prefs(), patch || {})); save('kickPrefs', p); changed('kick', 'prefs'); return p; }
  };

  /* ===== Hồ sơ: ngày dự sinh + cờ đã hỏi lần đầu (tech design 5.7.1) ===== */
  function readProfile() {
    const v = load('profile');
    if (v == null) return null;
    const c = cleanProfile(v);
    if (!c) reportBad();
    return c;
  }
  function writeProfile(p) {
    const rec = { v: 1, edd: p.edd ?? null, born: p.born ?? null, asked: true, at: now() };
    const prev = readProfile();
    save('profile', rec);
    enqueue({ op: 'save', kind: 'profile', rec: { kind: 'profile', edd: rec.edd, born: rec.born }, key: 'profile' });
    if (!prev || prev.edd !== rec.edd) regaKick(rec.edd);
    changed('profile', 'set');
    return rec;
  }
  // Sửa / xóa ngày dự sinh: tính lại gaDays của mọi lượt đếm trên máy theo ngày bắt đầu lượt (PRD-K 5.5)
  const gaOf = (edd, startAt) => { const g = edd ? U.gestAge(edd, U.dayKey(startAt)) : null; return g && g.totalDays >= 0 && g.totalDays <= 294 ? g.totalDays : null; };
  function regaKick(edd) {
    const l = kick._all();
    let n = 0;
    const out = l.map(x => { const ga = gaOf(edd, x.startAt); if (ga === x.gaDays) return x; n++; return Object.assign({}, x, { gaDays: ga }); });
    if (!n) return;
    const w = where('kickSessions');
    if (!writeJSON(w.area, w.key, out)) emit({ type: 'kick_unsaved' });
    out.forEach((x, i) => { if (x !== l[i]) enqueue({ op: 'save', kind: 'kick', rec: x, key: 'kick:' + x.id }); });
    changed('kick', 'rega');
  }
  const profile = {
    // → {edd, born, asked, at} | null (chưa từng hỏi). edd null = chị bỏ qua hoặc đã xóa.
    get() { const p = readProfile(); return p ? { edd: p.edd, born: p.born, asked: p.asked, at: p.at } : null; },
    // Kiểm bằng U.validEdd với hôm nay giờ VN; trả 'ok' hoặc mã lỗi, không lưu khi lỗi
    set(edd) {
      const code = U.validEdd(edd, today());
      if (code !== 'ok') return code;
      const p = readProfile() || {};
      writeProfile({ edd, born: p.born });
      return 'ok';
    },
    clear() { const p = readProfile() || {}; writeProfile({ edd: null, born: p.born }); },   // asked vẫn true
    asked() { const p = readProfile(); return !!(p && p.asked); },
    markAsked() { const p = readProfile(); if (!p || !p.asked) writeProfile({ edd: p ? p.edd : null, born: p ? p.born : null }); },
    // AC-138 "Con đã chào đời": day = ngày bấm; null = Hoàn tác
    setBorn(day) { if (day != null && !U.isDay(day)) return false; const p = readProfile() || {}; writeProfile({ edd: p.edd ?? null, born: day }); return true; }
  };

  /* ===== Công tắc tiếng chung (K-AC-11) ===== */
  const prefs = {
    get() { return cleanPrefs(load('prefs')) || { v: 1, sound: true }; },
    set(patch) { const p = cleanPrefs(Object.assign({}, prefs.get(), patch || {})); if (!p) return null; save('prefs', p); enqueue({ op: 'save', kind: 'prefs', rec: p, key: 'appPrefs' }); changed('prefs', 'set'); return p; }
  };

  /* ===== Xuất, xóa (tech design 5.6) ===== */
  function exportAll() {
    return {
      app: C.APP_NAME, version: C.VERSION, privacyVersion: C.PRIVACY_VERSION, exportedAt: new Date(now()).toISOString(),
      mode, consent: consent(), profile: profile.get(),
      checkins: CK.list(), thaigiao: TG.list(), letters: LT.list(),
      habits: { prefs: habits.prefs(), days: habits.range() },
      prefs: prefs.get(), kick: { prefs: kick.prefs(), sessions: kick.list() }
    };
  }
  // Bản ghi ẩn danh "lưu trên máy" (đọc thẳng khóa local) để mang vào tài khoản (câu 22). Chữ chỉ khi textSync.
  function exportLocalForImport({ textSync = false } = {}) {
    if (!cleanLocal(readJSON('local', KEY.local))) return [];
    const rd = k => { const r = readRaw('local', k); if (r.bad) reportBad(); return r.value; };
    const out = [];
    cleanList(rd(KEY.checkins), cleanCheckin).forEach(r => { const c = Object.assign({ kind: 'checkin' }, r); if (!textSync) delete c.note; out.push(c); });
    cleanList(rd(KEY.thaigiao), cleanThaiGiao).forEach(r => out.push(Object.assign({ kind: 'thaigiao' }, r)));
    const hb = rd(KEY.habits);
    if (isObj(hb) && isObj(hb.days)) Object.values(hb.days).map(cleanHabitDay).filter(Boolean).forEach(r => out.push(Object.assign({ kind: 'habit' }, r)));
    if (isObj(hb) && hb.prefs) { const p = cleanHabitPrefs(hb.prefs); if (p) out.push(Object.assign({ kind: 'habitPrefs' }, p)); }
    cleanList(rd(KEY.kickSessions), cleanKick).forEach(r => out.push(Object.assign({ kind: 'kick' }, r)));
    const pf = cleanProfile(rd(KEY.profile));
    if (pf && (pf.edd || pf.born)) out.push({ kind: 'profile', edd: pf.edd, born: pf.born });
    if (textSync) cleanList(rd(KEY.letters), cleanLetter).forEach(r => out.push(Object.assign({ kind: 'letter' }, r)));
    return out;
  }
  const hasLocalData = () => !!cleanLocal(readJSON('local', KEY.local));
  // Xóa mọi khóa lstp_ ở cả localStorage và sessionStorage (AC-71); khóa của app khác còn nguyên (AC-15)
  function clearAllLocal() {
    for (const a of ['local', 'session']) rawKeys(a).forEach(k => rawDel(a, k));
    mode = null; localConsent = null; remote = null; mem = freshMem(); badReported = false;
    changed('all', 'clear');
  }
  // "Xóa cả hành trình mang thai" (N-69, L15): lời nhắn, mốc thai giáo, lượt đếm và bước chân. Không xóa thói quen, check-in.
  function clearJourney() {
    LT.clear(); TG.clear(); kick.clearAll();
    changed('journey', 'clear');
  }

  /* ===== Bước B: cổng remote adapter (sync.js cắm vào) ===== */
  // adapter = { acct, area: 'session'|'local', privateDevice, consent: {sheet, text, writing, version},
  //             enqueue(op), pull(kinds) → Promise, pendingCount() }
  function attachRemote(adapter) {
    if (!adapter || !adapter.acct) return false;
    remote = adapter; mode = 'account'; localConsent = null; mem = freshMem();
    const blob = readJSON(remoteArea(), KEY.acct);
    if (!isObj(blob) || blob.acct !== adapter.acct) writeJSON(remoteArea(), KEY.acct, { v: 1, acct: adapter.acct, pulledAt: null });
    changed('mode', 'account');
    return true;
  }
  // Đăng xuất / đổi tài khoản: xóa đệm tài khoản; lời nhắn trên máy riêng giữ lại (K-11). Hàng chờ do sync.js xóa.
  function detachRemote() {
    if (remote) for (const k of [KEY.acct, KEY.kickAcct, KEY.profile, KEY.kickActive]) rawDel(remoteArea(), k);
    remote = null; mode = null; mem = freshMem();
    changed('mode', null);
  }
  // pull() xong: ghi đè đệm của một loại bằng dữ liệu server (đã kiểm shape), rồi báo màn vẽ lại
  function applyRemote(kind, value) {
    if (mode !== 'account' || !remote) return false;
    const fns = { checkins: v => cleanList(v, cleanCheckin), thaigiao: v => cleanList(v, cleanThaiGiao), letters: v => cleanList(v, cleanLetter),
      kick: v => cleanList(v, cleanKick), profile: v => cleanProfile(Object.assign({ asked: true, at: now() }, v)), prefs: cleanPrefs,
      habits: v => { const days = {}; (Array.isArray(v) ? v : []).map(cleanHabitDay).filter(Boolean).forEach(r => { days[r.day] = r; }); return { prefs: habits.prefs(), days }; } };
    if (!fns[kind]) return false;
    const val = fns[kind](value);
    if (kind === 'kick') writeJSON(remoteArea(), KEY.kickAcct, val);
    else save(kind, val);
    changed(kind, 'pull');
    return true;
  }

  return {
    PREFIX, KEY,
    raw: { get: rawGet, set: rawSet, del: rawDel, keys: rawKeys, readJSON, writeJSON },
    mode: () => mode,
    detectMode, startNone, startLocal, setLocalConsent, consent, canSave, dropWriting,
    checkins, thaigiao, letters, habits, kick, profile, prefs,
    exportAll, exportLocalForImport, hasLocalData, clearAllLocal, clearJourney,
    attachRemote, detachRemote, applyRemote,
    remote: () => remote,
    pendingCount: () => { try { return remote && typeof remote.pendingCount === 'function' ? remote.pendingCount() : 0; } catch (e) { return 0; } },
    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    _setMode: setMode     // app.js dùng lúc boot sau detectMode(); màn hình không gọi
  };
})();
