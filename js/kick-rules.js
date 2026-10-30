/* =========================================================
   Mẹ Bầu An Yên – js/kick-rules.js · window.LSTP_KICK_RULES
   Chủ: FE-4 Đếm cử động thai
   Đặc tả: docs/specs/dem-cu-dong-thai-prd.md v1.0 mục 5.3 (R-01…R-17), 5.4, 5.5;
           docs/specs/lifestyle-thai-phu-tech-design.md mục 7.2, 7.4, 7.6
   Hàm THUẦN: không DOM, không storage, không tự lấy giờ (luôn nhận `now`).
   Node nạp được bằng vm với `window` giả (tests/unit-kick.js).
   - evaluate(session, now, cfg) → kết quả ba mức theo GIỜ THẬT (không đếm số lần interval chạy).
   - acceptTap, slotOf, zoneOf, zones, daySummary, severity, clean, cfgFrom.
   R-17: tuần thai (gaDays) KHÔNG BAO GIỜ là đầu vào của evaluate. Hàm này không đọc gaDays hay ngày dự sinh.
   ========================================================= */
window.LSTP_KICK_RULES = (() => {
  'use strict';

  /* ===== Cấu hình ===== */
  // Số mặc định = số anh Thông duyệt 29/10/2026 (config.js là nguồn chính; đây chỉ để hàm thuần chạy độc lập)
  const DEFAULTS = {
    HOUR_MS: 60 * 60000,       // KICK_HOUR_MIN
    GREEN_MIN: 4,              // KICK_GREEN_MIN_PER_HOUR: ≥ 4 trong giờ 1 là đủ
    EXTRA_HOURS: 1,            // KICK_EXTRA_HOURS_MAX: theo dõi thêm tối đa 1 giờ
    RED_MIN_TOTAL_2H: 10,      // KICK_RED_MIN_TOTAL_2H: < 10 trong 2 giờ là cần khám ngay
    CELEBRATE_AT: 10,          // KICK_CELEBRATE_AT: đủ 10 ở giờ 1 thì tự kết thúc + mưa tim
    MIN_TAP_GAP_MS: 800,       // KICK_MIN_TAP_GAP_MS
    MAX_TAPS: 200,             // KICK_MAX_TAPS: số điểm có vị trí tối đa mỗi lượt
    TZ_OFFSET_MIN: 420
  };
  function cfgFrom(C) {
    C = C || {};
    const n = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    return {
      HOUR_MS: n(C.KICK_HOUR_MIN, 60) * 60000,
      GREEN_MIN: n(C.KICK_GREEN_MIN_PER_HOUR, DEFAULTS.GREEN_MIN),
      EXTRA_HOURS: n(C.KICK_EXTRA_HOURS_MAX, DEFAULTS.EXTRA_HOURS),
      RED_MIN_TOTAL_2H: n(C.KICK_RED_MIN_TOTAL_2H, DEFAULTS.RED_MIN_TOTAL_2H),
      CELEBRATE_AT: n(C.KICK_CELEBRATE_AT, DEFAULTS.CELEBRATE_AT),
      MIN_TAP_GAP_MS: n(C.KICK_MIN_TAP_GAP_MS, DEFAULTS.MIN_TAP_GAP_MS),
      MAX_TAPS: n(C.KICK_MAX_TAPS, DEFAULTS.MAX_TAPS),
      TZ_OFFSET_MIN: n(C.TZ_OFFSET_MIN, DEFAULTS.TZ_OFFSET_MIN)
    };
  }
  const BASE = (typeof window !== 'undefined' && window.LSTP_CONFIG) ? cfgFrom(window.LSTP_CONFIG) : Object.assign({}, DEFAULTS);
  const norm = cfg => Object.assign({}, BASE, cfg || {});

  /* ===== Danh sách cố định (khớp whitelist server, mục 5.5) ===== */
  const MEALS = ['breakfast', 'lunch', 'dinner', 'other'];
  const LEVELS = ['green', 'red', 'stopped', 'stopped_yellow'];            // mức đã chốt lưu trong bản ghi
  const REASONS = ['danger_sign', 'mother_reported', 'h2_low', 'lt10_2h']; // đúng thứ tự R-15 khi hiển thị
  const FEELS = ['same', 'different', 'skipped'];
  const SLOTS = ['morning', 'noon', 'evening', 'other'];
  const ZONES = ['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center'];
  const isNum = v => typeof v === 'number' && isFinite(v);

  /* ===== Diễn biến theo giờ thật, tính tới mốc `cut` (ms kể từ T) =====
     Trả { level: pending|yellow|green|stopped|stopped_yellow|red, fin (ms kể từ T, null nếu chưa chốt),
           counted: [t…] các lần chạm được tính, hadYellow, celebrate, timeRed: [lý do] }. */
  function timeline(ts, cut, D, S, cfg) {
    const H = cfg.HOUR_MS;
    const W = H * (1 + Math.max(0, cfg.EXTRA_HOURS));
    const upTo = (lim, incl) => ts.filter(t => (incl ? t <= lim : t < lim));
    const inH1 = t => t < H;

    // --- Giờ 1: sự kiện sớm nhất trong [0, H) quyết định
    const h1Taps = ts.filter(t => inH1(t) && t <= cut);
    const ev = [];
    if (h1Taps.length >= cfg.CELEBRATE_AT) ev.push({ at: h1Taps[cfg.CELEBRATE_AT - 1], kind: 'cel', o: 0 });
    if (D != null && D < H && D <= cut && upTo(D, true).filter(inH1).length >= cfg.GREEN_MIN) ev.push({ at: D, kind: 'done', o: 1 });
    if (S != null && S < H && S <= cut) ev.push({ at: S, kind: upTo(S, true).filter(inH1).length >= cfg.GREEN_MIN ? 'done' : 'stop', o: 2 });
    ev.sort((a, b) => a.at - b.at || a.o - b.o);
    const first = ev[0];
    if (first) {
      const counted = upTo(first.at, true).filter(inH1);
      if (first.kind === 'cel') return { level: 'green', fin: first.at, counted, hadYellow: false, celebrate: true, timeRed: [] };
      if (first.kind === 'done') return { level: 'green', fin: first.at, counted, hadYellow: false, celebrate: false, timeRed: [] };
      return { level: 'stopped', fin: first.at, counted, hadYellow: false, celebrate: false, timeRed: [] };
    }
    if (cut < H) return { level: 'pending', fin: null, counted: h1Taps, hadYellow: false, celebrate: false, timeRed: [] };
    const h1 = ts.filter(inH1);
    if (h1.length >= cfg.GREEN_MIN) return { level: 'green', fin: H, counted: h1, hadYellow: false, celebrate: false, timeRed: [] };

    // --- ≤ 3 ở giờ 1 → cần chú ý; giờ 2 bắt đầu NGAY tại H (R-03), không chờ chị bấm
    if (W <= H) {
      // Không có giờ thêm (cấu hình khác số duyệt): coi như hết 2 giờ ngay tại H
      return { level: 'red', fin: H, counted: h1, hadYellow: true, celebrate: false, timeRed: ['h2_low', 'lt10_2h'] };
    }
    const all2 = ts.filter(t => t < W && t <= cut);
    const ev2 = [];
    if (all2.length >= cfg.RED_MIN_TOTAL_2H) ev2.push({ at: all2[cfg.RED_MIN_TOTAL_2H - 1], kind: 'green', o: 0 });
    if (S != null && S >= H && S < W && S <= cut) ev2.push({ at: S, kind: 'stop', o: 1 });
    ev2.sort((a, b) => a.at - b.at || a.o - b.o);
    if (ev2[0]) {
      const counted = upTo(ev2[0].at, true).filter(t => t < W);
      return { level: ev2[0].kind === 'green' ? 'green' : 'stopped_yellow', fin: ev2[0].at, counted, hadYellow: true, celebrate: false, timeRed: [] };
    }
    if (cut < W) return { level: 'yellow', fin: null, counted: all2, hadYellow: true, celebrate: false, timeRed: [] };
    // --- Hết giờ 2 (R-04, R-05)
    const counted = ts.filter(t => t < W);
    const h2n = counted.filter(t => t >= H).length;
    const timeRed = [];
    if (h2n <= cfg.GREEN_MIN - 1) timeRed.push('h2_low');
    if (counted.length < cfg.RED_MIN_TOTAL_2H) timeRed.push('lt10_2h');
    return { level: 'red', fin: W, counted, hadYellow: true, celebrate: false, timeRed };
  }

  /* ===== K.evaluate(session, now, cfg) → Result (tech design 7.2) ===== */
  function evaluate(session, now, cfg) {
    cfg = norm(cfg);
    const s = session || {};
    const H = cfg.HOUR_MS;
    const W = H * (1 + Math.max(0, cfg.EXTRA_HOURS));
    const start = isNum(s.startAt) ? s.startAt : (isNum(now) ? now : 0);
    const nowMs = isNum(now) ? now : start;
    const e = Math.max(0, nowMs - start);
    // Mốc chỉ tính khi ĐÃ xảy ra (≤ now): hàm thuần dùng được cho mọi `now`
    const at = v => (isNum(v) && v - start <= e ? Math.max(0, v - start) : null);
    const M = at(s.motherReportedAt), D = at(s.doneAt), S = at(s.stoppedAt);
    const ts = (Array.isArray(s.taps) ? s.taps : [])
      .map(p => (p && isNum(p.t) ? p.t : NaN))
      .filter(t => isNum(t) && t >= 0 && t <= e)
      .sort((a, b) => a - b);
    const signs = Array.isArray(s.signs) ? s.signs.filter(x => typeof x === 'string' && x) : [];
    const feelDiff = s.feel === 'different';
    const reported = M != null || feelDiff || signs.indexOf('no_movement') >= 0;

    // Tự báo lúc M: lượt dừng ở M, chạm sau M không tính (R-06)
    const cut = M != null ? Math.min(e, M) : e;
    const tl = timeline(ts, cut, D, S, cfg);

    // --- Đỏ thắng mọi thứ (R-15): dấu hiệu → tự báo → theo giờ thật
    const red = new Set();
    if (signs.some(x => x !== 'no_movement')) red.add('danger_sign');
    if (reported) red.add('mother_reported');
    tl.timeRed.forEach(r => red.add(r));
    // Đã chốt đỏ trước đó thì giữ đỏ, kể cả khi dữ liệu sau này thay đổi (K-AC-43)
    if (s.level === 'red') {
      (Array.isArray(s.reasons) ? s.reasons : []).forEach(r => { if (REASONS.indexOf(r) >= 0) red.add(r); });
      if (!red.size) red.add('mother_reported');
    }

    const counted = tl.counted;
    const h1 = counted.filter(t => t < H).length;
    const h2 = counted.filter(t => t >= H && t < W).length;
    const minOf = k => (counted.length >= k ? Math.floor(counted[k - 1] / 60000) : null);
    const out = {
      phase: 'final', hour: 1, remainingMs: 0,
      h1, h2, total: h1 + h2,
      min4: minOf(cfg.GREEN_MIN), min10: minOf(cfg.RED_MIN_TOTAL_2H),
      level: tl.level, hadYellow: tl.hadYellow, celebrate: false, needFeel: false,
      reasons: [], finalAt: null
    };

    if (red.size) {
      out.level = 'red';
      out.reasons = REASONS.filter(r => red.has(r));
      const cands = [];
      if (red.has('danger_sign') || signs.length) cands.push(0);
      if (M != null) cands.push(M);
      if (tl.timeRed.length) cands.push(tl.fin);
      if (!cands.length) cands.push(tl.fin != null ? tl.fin : e);   // feel 'different' sau khi đã đủ
      const fin = Math.min.apply(null, cands);
      out.finalAt = start + fin;
      out.hour = fin >= H ? 2 : 1;
      return out;
    }

    if (tl.level === 'pending') {
      out.phase = 'h1'; out.hour = 1; out.remainingMs = Math.max(0, H - e);
      return out;
    }
    if (tl.level === 'yellow') {
      out.phase = 'h2'; out.hour = 2; out.remainingMs = Math.max(0, W - e);
      return out;
    }
    out.finalAt = start + tl.fin;
    out.hour = tl.fin >= H ? 2 : 1;
    if (tl.level === 'green') {
      out.celebrate = tl.celebrate;
      out.needFeel = !(s.feel === 'same' || s.feel === 'skipped');
    }
    return out;
  }

  /* ===== Chặn chạm đúp: nhận khi cách lần trước ≥ MIN_TAP_GAP_MS (K-AC-09) ===== */
  function acceptTap(lastTapMs, nowMs, cfg) {
    cfg = norm(cfg);
    if (!isNum(lastTapMs)) return true;
    return nowMs - lastTapMs >= cfg.MIN_TAP_GAP_MS;
  }

  /* ===== Ngày, giờ theo lịch Việt Nam (không phụ thuộc múi giờ máy) ===== */
  const dayKey = (ms, off) => new Date(ms + (isNum(off) ? off : BASE.TZ_OFFSET_MIN) * 60000).toISOString().slice(0, 10);
  const hourVN = (ms, off) => new Date(ms + (isNum(off) ? off : BASE.TZ_OFFSET_MIN) * 60000).getUTCHours();

  /* ===== Ô Sáng / Trưa / Tối / Lúc khác (PRD 5.4): chọn bữa thì theo bữa, không thì theo giờ bắt đầu ===== */
  function slotOf(meal, startAt, tzOffsetMin) {
    if (meal === 'breakfast') return 'morning';
    if (meal === 'lunch') return 'noon';
    if (meal === 'dinner') return 'evening';
    if (meal === 'other') return 'other';
    const h = hourVN(isNum(startAt) ? startAt : 0, tzOffsetMin);
    if (h < 11) return 'morning';
    if (h < 17) return 'noon';
    return 'evening';
  }

  /* ===== Vùng trên bụng (M-173). Bên trái hình = bên trái của chị (M-174) ===== */
  const CENTER_R = 0.2;
  function zoneOf(x, y) {
    if (!isNum(x) || !isNum(y)) return null;
    const dx = x - 0.5, dy = y - 0.5;
    if (dx * dx + dy * dy <= CENTER_R * CENTER_R) return 'center';
    return (y < 0.5 ? 'top_' : 'bottom_') + (x < 0.5 ? 'left' : 'right');
  }
  // zones(taps) → { counts:{vùng:n}, withPos, noPos, top:[vùng nhiều nhất, hòa thì nhiều vùng] }
  function zones(taps) {
    const counts = {}; ZONES.forEach(z => { counts[z] = 0; });
    let withPos = 0, noPos = 0;
    (Array.isArray(taps) ? taps : []).forEach(p => {
      const z = p ? zoneOf(p.x, p.y) : null;
      if (z) { counts[z]++; withPos++; } else if (p) noPos++;
    });
    const max = Math.max.apply(null, ZONES.map(z => counts[z]));
    const top = max > 0 ? ZONES.filter(z => counts[z] === max) : [];
    return { counts, withPos, noPos, top };
  }

  /* ===== Độ nặng để chọn hình cho ô có nhiều lượt (N-25) ===== */
  function severity(level, hadYellow) {
    if (level === 'red') return 5;
    if (level === 'yellow' || level === 'stopped_yellow') return 4;
    if (level === 'green' && hadYellow) return 3;
    if (level === 'green') return 2;
    if (level === 'stopped') return 1;
    return 0;
  }

  /* ===== Tóm tắt một ngày: các lượt theo ô, cộng số lần (AC-47) ===== */
  function daySummary(sessions, day, tzOffsetMin) {
    const out = { day, morning: [], noon: [], evening: [], other: [], total: 0, count: 0 };
    (Array.isArray(sessions) ? sessions : []).forEach(s => {
      if (!s || !isNum(s.startAt) || dayKey(s.startAt, tzOffsetMin) !== day) return;
      out[slotOf(s.meal, s.startAt, tzOffsetMin)].push(s);
      out.total += isNum(s.total) ? s.total : 0;
      out.count++;
    });
    SLOTS.forEach(k => out[k].sort((a, b) => a.startAt - b.startAt));
    return out;
  }

  /* ===== Kiểm bản ghi đọc lại (storage, server): input không tin được (K-AC-57, AC-72) =====
     Trả bản ghi sạch (chỉ trường đã biết) hoặc null. Không bao giờ ném lỗi. */
  const ID_RE = /^[0-9a-z]{12,40}$/;
  const SIGN_RE = /^[a-z_]{2,24}$/;
  const MAX_T = 2 * 60 * 60000 + 60000;                     // 120 phút + 1 phút dư (khớp server)
  const intIn = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const optTime = v => v === null || v === undefined || (isNum(v) && v > 0);
  function clean(rec) {
    try {
      if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return null;
      if (typeof rec.id !== 'string' || !ID_RE.test(rec.id)) return null;
      if (!isNum(rec.startAt) || rec.startAt <= 0) return null;
      if (!optTime(rec.endAt) || !optTime(rec.motherReportedAt) || !optTime(rec.doneAt) || !optTime(rec.stoppedAt)) return null;
      const meal = rec.meal == null ? null : rec.meal;
      if (meal !== null && MEALS.indexOf(meal) < 0) return null;
      if (!Array.isArray(rec.taps) || rec.taps.length > 1000) return null;
      const taps = [];
      let last = -1;
      for (const p of rec.taps) {
        if (!p || typeof p !== 'object') return null;
        if (!Number.isInteger(p.t) || p.t < 0 || p.t > MAX_T || p.t < last) return null;
        const xn = p.x === null || p.x === undefined, yn = p.y === null || p.y === undefined;
        if (xn !== yn) return null;
        if (!xn && !(isNum(p.x) && isNum(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)) return null;
        if (!xn && taps.length >= BASE.MAX_TAPS) return null;  // vị trí chỉ có ở 200 điểm đầu
        taps.push({ t: p.t, x: xn ? null : p.x, y: xn ? null : p.y });
        last = p.t;
      }
      const signs = rec.signs == null ? [] : rec.signs;
      if (!Array.isArray(signs) || signs.length > 13 || signs.some(x => typeof x !== 'string' || !SIGN_RE.test(x))) return null;
      const feel = rec.feel == null ? null : rec.feel;
      if (feel !== null && FEELS.indexOf(feel) < 0) return null;
      const level = rec.level == null ? null : rec.level;
      if (level !== null && LEVELS.indexOf(level) < 0) return null;
      const reasons = rec.reasons == null ? [] : rec.reasons;
      if (!Array.isArray(reasons) || reasons.some(r => REASONS.indexOf(r) < 0)) return null;
      const cnt = k => (rec[k] == null ? 0 : rec[k]);
      for (const k of ['h1', 'h2', 'total']) if (!intIn(cnt(k), 0, 1000)) return null;
      for (const k of ['min4', 'min10']) if (!(rec[k] == null || intIn(rec[k], 0, 121))) return null;
      const ga = rec.gaDays == null ? null : rec.gaDays;
      if (ga !== null && !intIn(ga, 0, 294)) return null;
      if (rec.hadYellow != null && typeof rec.hadYellow !== 'boolean') return null;
      return {
        v: 1, id: rec.id, startAt: rec.startAt, endAt: rec.endAt == null ? null : rec.endAt, meal, taps,
        signs: signs.slice(), motherReportedAt: rec.motherReportedAt == null ? null : rec.motherReportedAt,
        doneAt: rec.doneAt == null ? null : rec.doneAt, stoppedAt: rec.stoppedAt == null ? null : rec.stoppedAt,
        feel, level, hadYellow: !!rec.hadYellow, reasons: REASONS.filter(r => reasons.indexOf(r) >= 0),
        h1: cnt('h1'), h2: cnt('h2'), total: cnt('total'),
        min4: rec.min4 == null ? null : rec.min4, min10: rec.min10 == null ? null : rec.min10, gaDays: ga
      };
    } catch (e) { return null; }
  }

  return {
    DEFAULTS, MEALS, LEVELS, REASONS, FEELS, SLOTS, ZONES,
    cfgFrom, evaluate, acceptTap, slotOf, zoneOf, zones, severity, daySummary, dayKey, clean
  };
})();
