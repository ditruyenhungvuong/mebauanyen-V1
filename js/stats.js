/* =========================================================
   Mẹ Bầu An Yên – js/stats.js · window.LSTP_STATS
   Chủ: FE-5 Thai giáo, Thói quen & Hành trình
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 8 (AC-103…107)
   Hàm THUẦN: không DOM, không storage, không tự lấy giờ. Mọi "ngày" là chuỗi 'YYYY-MM-DD' theo lịch
   Việt Nam (U.dayKey). Tính ngày bằng Date.UTC nên không lệch vì múi giờ máy hay giờ mùa hè.
   Node nạp được qua vm với window giả (tests/unit-stats.js).
   ========================================================= */
window.LSTP_STATS = (() => {
  'use strict';
  const C = (typeof window !== 'undefined' && window.LSTP_CONFIG) || {};
  const DAY_MS = 86400000;

  /* ===== Ngày lịch (không múi giờ) ===== */
  const RE_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
  // 'YYYY-MM-DD' → số ngày từ 1970-01-01; sai định dạng hoặc ngày không có thật → NaN
  function dayNum(day) {
    const m = RE_DAY.exec(String(day ?? ''));
    if (!m) return NaN;
    const y = +m[1], mo = +m[2], d = +m[3];
    const t = Date.UTC(y, mo - 1, d);
    const back = new Date(t);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN;
    return t / DAY_MS;
  }
  const pad = n => String(n).padStart(2, '0');
  function dayFromNum(n) {
    const d = new Date(n * DAY_MS);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  const addDays = (day, n) => dayFromNum(dayNum(day) + n);
  const dayDiff = (a, b) => dayNum(b) - dayNum(a);
  const isDay = day => !Number.isNaN(dayNum(day));
  // ms → ngày theo giờ VN (giống U.dayKey; để stats tự đủ khi test riêng)
  const dayKey = (ms, offsetMin = C.TZ_OFFSET_MIN ?? 420) => new Date(ms + offsetMin * 60000).toISOString().slice(0, 10);
  // Thứ trong tuần, thứ Hai = 0 … Chủ nhật = 6 (lịch Việt Nam bắt đầu từ thứ Hai)
  const weekdayMon0 = day => ((dayNum(day) % 7) + 7 + 3) % 7;     // 1970-01-01 là thứ Năm
  const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate(); // month 1–12

  /* ===== Chuẩn hóa dữ liệu thói quen =====
     habitDays nhận cả hai dạng: { 'YYYY-MM-DD': HabitDay } hoặc [HabitDay]. HabitDay.marks[code] ∈ '' | 'x' | 'a'. */
  function toMap(habitDays) {
    if (!habitDays) return {};
    if (Array.isArray(habitDays)) {
      const out = {};
      for (const h of habitDays) if (h && isDay(h.day)) out[h.day] = h;
      return out;
    }
    return habitDays;
  }
  const done = v => v === 'x' || v === 'a';
  // Số thói quen (đang bật) đã làm trong một ngày
  function dayCount(habitDay, enabledCodes) {
    const marks = habitDay && habitDay.marks;
    if (!marks || typeof marks !== 'object') return 0;
    const codes = Array.isArray(enabledCodes) ? enabledCodes : Object.keys(marks);
    let n = 0;
    for (const c of codes) if (done(marks[c])) n++;
    return n;
  }
  // Tập ngày đã làm một thói quen
  function markedDays(habitDays, code) {
    const map = toMap(habitDays), out = new Set();
    for (const day of Object.keys(map)) if (isDay(day) && done(map[day] && map[day].marks && map[day].marks[code])) out.add(day);
    return out;
  }

  /* ===== Chuỗi ngày (AC-103) =====
     current: số ngày liền nhau tính tới hôm nay; hôm nay chưa làm thì tính tới hôm qua (chuỗi chưa đứt cho tới hết ngày).
     longest: chuỗi dài nhất từng có (chỉ tính ngày ≤ hôm nay). */
  function streak(days, today) {
    // Nhận Set hoặc mảng (không dùng instanceof: Set từ realm khác, vd vm của test, vẫn phải chạy)
    const list = days && typeof days[Symbol.iterator] === 'function' && typeof days !== 'string' ? Array.from(days) : [];
    const t = dayNum(today);
    const nums = [...new Set(list)].map(dayNum).filter(n => !Number.isNaN(n) && n <= t).sort((a, b) => a - b);
    const has = new Set(nums);
    let current = 0;
    let cur = has.has(t) ? t : t - 1;
    while (has.has(cur)) { current++; cur--; }
    let longest = 0, run = 0, prev = NaN;
    for (const n of nums) {
      run = (n === prev + 1) ? run + 1 : (n === prev ? run : 1);
      if (run > longest) longest = run;
      prev = n;
    }
    return { current, longest };
  }

  /* ===== Lịch tháng (AC-104) — month 1–12 =====
     Trả mọi ngày của tháng: { day, n (số việc đã làm), future (sau hôm nay), today } */
  function monthGrid(year, month, habitDays, enabledCodes, today) {
    const map = toMap(habitDays), t = dayNum(today), out = [];
    const len = daysInMonth(year, month);
    for (let d = 1; d <= len; d++) {
      const day = year + '-' + pad(month) + '-' + pad(d);
      const num = dayNum(day);
      const future = num > t;
      out.push({ day, n: future ? 0 : dayCount(map[day], enabledCodes), future, today: num === t });
    }
    return out;
  }
  // Số ô trống đầu lưới (thứ Hai đầu tuần)
  const monthLead = (year, month) => weekdayMon0(year + '-' + pad(month) + '-01');

  /* ===== 7 ngày qua (AC-105): mỗi thói quen n/7 ngày, từ hôm nay − 6 tới hôm nay ===== */
  function week(habitDays, enabledCodes, today) {
    const map = toMap(habitDays), codes = Array.isArray(enabledCodes) ? enabledCodes : [];
    const days = last7(today);
    return codes.map(code => ({ code, n: days.filter(d => done(map[d] && map[d].marks && map[d].marks[code])).length }));
  }
  const last7 = today => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  /* ===== "Tháng này chị đã làm {n} ngày" — số ngày có ít nhất một việc (thói quen đang bật nếu truyền danh sách) ===== */
  function monthCount(habitDays, year, month, enabledCodes) {
    const map = toMap(habitDays), prefix = year + '-' + pad(month) + '-';
    let n = 0;
    for (const day of Object.keys(map)) if (day.startsWith(prefix) && isDay(day) && dayCount(map[day], enabledCodes) > 0) n++;
    return n;
  }
  // Có ngày nào được đánh dấu chưa (màn thống kê rỗng N-58)
  function anyMarked(habitDays, enabledCodes) {
    const map = toMap(habitDays);
    return Object.keys(map).some(day => isDay(day) && dayCount(map[day], enabledCodes) > 0);
  }

  /* ===== Đếm cử động thai: số lượt có mức trong ngày (green | red; không tính stopped) — AC-79, AC-107 ===== */
  function kickCountByDay(sessions, day, offsetMin) {
    if (!Array.isArray(sessions)) return 0;
    return sessions.filter(s => s && (s.level === 'green' || s.level === 'red') && Number.isFinite(s.startAt) &&
      dayKey(s.startAt, offsetMin) === day).length;
  }

  /* ===== Tuần thai của một ngày (nhóm dòng thời gian J01) =====
     edd 'YYYY-MM-DD' → { week, days, start, end } với start/end là ngày đầu/cuối của tuần thai đó; null khi thiếu
     ngày dự sinh, ngày sai, tuổi thai < 0 hoặc > 294 ngày (khi đó nhóm theo tháng). */
  function gaWeekOf(day, edd) {
    if (!isDay(day) || !isDay(edd)) return null;
    const total = 280 - dayDiff(day, edd);
    if (total < 0 || total > 294) return null;
    const w = Math.floor(total / 7), d = total % 7;
    const start = addDays(day, -d);
    return { week: w, days: d, start, end: addDays(start, 6) };
  }

  return {
    dayNum, dayFromNum, addDays, dayDiff, isDay, dayKey, weekdayMon0, daysInMonth,
    dayCount, markedDays, streak, monthGrid, monthLead, week, last7, monthCount, anyMarked,
    kickCountByDay, gaWeekOf
  };
})();
