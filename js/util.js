/* =========================================================
   Mẹ Bầu An Yên – js/util.js · window.LSTP_UTIL (chủ: FE-1 Lõi)
   Hàm THUẦN: không đụng DOM, không đụng storage, không tự lấy giờ (nhận ms / ngày qua tham số).
   Node nạp được qua vm với window giả (tests/unit-util.js).
   Có: esc, dayKey, dayNum, dayDiff, dayAdd, fromDayNum, isDay, fmtDay, fmtDayShort, randomId,
       validEdd, gestAge (tech design 5.7.2), csvCell, clamp, normalizePhone, maskPhone.
   ========================================================= */
window.LSTP_UTIL = (() => {
  'use strict';
  const C = window.LSTP_CONFIG || {};

  /* ===== Escape mọi chuỗi trước khi vào HTML (kể cả dữ liệu từ storage và từ Sheet) ===== */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ===== Ngày theo lịch Việt Nam, không phụ thuộc múi giờ máy =====
     Mọi "ngày" là chuỗi 'YYYY-MM-DD'. Không dùng new Date('YYYY-MM-DD') (máy hiểu là giờ UTC → lệch một ngày). */
  // dayKey(ms) → 'YYYY-MM-DD' (dịch ms theo TZ_OFFSET_MIN rồi đọc phần UTC)
  const dayKey = (ms, offsetMin = C.TZ_OFFSET_MIN ?? 420) => new Date(ms + offsetMin * 60000).toISOString().slice(0, 10);
  const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  // dayNum('YYYY-MM-DD') → số ngày kể từ 1970-01-01; sai định dạng → NaN. Dùng Date.UTC nên không có DST.
  function dayNum(day) {
    const m = DAY_RE.exec(String(day ?? ''));
    if (!m) return NaN;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000;
  }
  const dayDiff = (a, b) => dayNum(b) - dayNum(a);
  // fromDayNum(n) → 'YYYY-MM-DD' (ngược với dayNum)
  const fromDayNum = n => Number.isFinite(n) ? new Date(n * 86400000).toISOString().slice(0, 10) : '';
  const dayAdd = (day, n) => fromDayNum(dayNum(day) + n);
  // Ngày có thật không (loại 2026-02-30, 2026-13-01): đổi qua lại phải ra đúng chuỗi cũ
  function isDay(day) {
    const n = dayNum(day);
    return Number.isFinite(n) && fromDayNum(n) === day;
  }
  // 'YYYY-MM-DD' → 'dd/mm/yyyy' (kiểu Việt Nam) · 'dd/mm'
  const fmtDay = day => isDay(day) ? day.slice(8, 10) + '/' + day.slice(5, 7) + '/' + day.slice(0, 4) : '';
  const fmtDayShort = day => isDay(day) ? day.slice(8, 10) + '/' + day.slice(5, 7) : '';

  /* ===== id bản ghi: 20 ký tự [0-9a-z], khớp regex server ^[0-9a-z]{12,40}$ ===== */
  function randomId(len = 20) {
    const abc = '0123456789abcdefghijklmnopqrstuvwxyz';
    let out = '';
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
    const bytes = c ? c.getRandomValues(new Uint8Array(len)) : Array.from({ length: len }, () => Math.floor(Math.random() * 256));
    for (let i = 0; i < len; i++) out += abc[bytes[i] % 36];
    return out;
  }

  /* ===== Ngày dự sinh và tuần thai (tech design 5.7.2; PRD 3.9) =====
     Khoảng nhận khi NHẬP: [today − 14, today + 280] (tuổi thai lúc nhập 0+0 … 42+0).
     Server có hàm cùng luật (ADR 0005 mục 4.8); check-static so hai hằng 14 và 280. */
  const EDD_MIN = C.EDD_MIN_OFFSET_DAYS ?? -14;
  const EDD_MAX = C.EDD_MAX_OFFSET_DAYS ?? 280;
  // → 'ok' | 'format' | 'invalid_date' | 'too_early' | 'too_far'
  function validEdd(edd, today) {
    if (typeof edd !== 'string' || !DAY_RE.test(edd)) return 'format';
    if (!isDay(edd)) return 'invalid_date';
    const d = dayDiff(today, edd);           // edd − today (ngày)
    if (!Number.isFinite(d)) return 'format'; // today sai: không kết luận được
    if (d < EDD_MIN) return 'too_early';
    if (d > EDD_MAX) return 'too_far';
    return 'ok';
  }
  // → null nếu thiếu / sai định dạng / ngày không có thật; ngược lại
  //   { totalDays: 280 − (edd − today), weeks, days, status: 'ok' | 'past42' (> 294) | 'before' (< 0) }
  function gestAge(edd, today) {
    if (typeof edd !== 'string' || !isDay(edd) || !isDay(today)) return null;
    const totalDays = 280 - dayDiff(today, edd);
    const status = totalDays > 294 ? 'past42' : totalDays < 0 ? 'before' : 'ok';
    return { totalDays, weeks: Math.floor(totalDays / 7), days: ((totalDays % 7) + 7) % 7, status };
  }

  /* ===== CSV: một ô, chặn công thức (K-AC-58) =====
     Ô bắt đầu bằng = + - @ (hoặc tab/CR) bị Excel/Sheets coi là công thức → chèn dấu nháy đơn ở đầu. */
  function csvCell(v) {
    let t = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  }

  /* ===== Số điện thoại: giống hệt STOP-4P / server (ADR 0005 mục 4.1) =====
     '+84' / '84' (11 số) / '0' đầu → '+84' + 9 số di động bắt đầu [35789]; sai → null. */
  function normalizePhone(raw) {
    let d = String(raw || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+84')) d = d.slice(3);
    else if (d.startsWith('84') && d.length === 11) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    if (!/^[35789]\d{8}$/.test(d)) return null;
    return '+84' + d;
  }
  // '+84912345123' → '+849 ••• ••123'
  const maskPhone = e164 => (typeof e164 === 'string' && e164.length >= 7) ? e164.slice(0, 4) + ' ••• ••' + e164.slice(-3) : '';

  return { esc, clamp, dayKey, dayNum, dayDiff, dayAdd, fromDayNum, isDay, fmtDay, fmtDayShort, randomId,
           validEdd, gestAge, csvCell, normalizePhone, maskPhone, EDD_MIN, EDD_MAX };
})();
