/* =========================================================
   Mẹ Bầu An Yên – js/engine.js · window.LSTP_ENGINE
   Chủ: FE-2 An toàn & nội dung (T-02)
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 6.3; PRD v1.0 mục 9.
   Hàm THUẦN: không DOM, không storage, không tự lấy giờ. Đọc window.LSTP_CONFIG lúc GỌI (không lúc nạp) để test bật/tắt cờ.
   Nguyên tắc: luật an toàn chạy TRƯỚC gợi ý; chỉ gợi ý ID trong danh mục; tối đa 2 bài; không chẩn đoán.
   Không khớp luật nào KHÔNG có nghĩa là đã chứng minh an toàn.
   Cách so nhóm tự hại chép NGUYÊN VĂN apps/STOP-4P-Healthcare-Staff/js/engine.js:82–96 (bản sau review lần 7).
   ========================================================= */
window.LSTP_ENGINE = (() => {
  'use strict';
  const D = window.LSTP_DATA;
  const { EXERCISES, KEYWORDS: K, DANGER_SIGNS, EMOTIONS, CONTEXTS, URGENT_REASONS, LIBRARY_ORDER, SUMMARIES, REASONS } = D;
  const cfg = () => window.LSTP_CONFIG || {};
  const feat = k => !!(cfg().FEATURES || {})[k];
  const draftOk = ex => !!cfg().ALLOW_DRAFT_CONTENT || ex.status === 'approved';

  /* ===== Chuẩn hóa chữ (giống STOP-4P) ===== */
  const stripMarks = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const tokens = s => ' ' + s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
  const has = (t, list) => list.some(k => t.includes(' ' + k + ' '));

  function hasAny(text, list, loose = true) {
    const t = tokens(loose ? stripMarks(text) : String(text || '').toLowerCase().normalize('NFC'));
    return list.some(k => t.includes(' ' + (loose ? stripMarks(k) : k.normalize('NFC')) + ' '));
  }

  // Mọi cách nhìn một đoạn chữ mà các nhóm luật cần. Phần STOP-4P giữ đúng thứ tự và phép biến đổi của js/engine.js:84–95.
  function views(text) {
    const U = K.urgent;
    const flat = tokens(stripMarks(text));                         // bỏ dấu, tách từ
    const nfc = tokens(String(text).toLowerCase().normalize('NFC')); // CÓ dấu, tách từ
    // Như nfc nhưng GIỮ dấu câu thành từ riêng ("." cho . ! ? ; …, "," cho dấu phẩy) — chỉ cho mẫu chạy trên nfcP.
    const nfcP = ' ' + String(text).toLowerCase().normalize('NFC').replace(/[.!?;…]+/g, ' . ').replace(/,+/g, ' , ')
      .replace(/[^\p{L}\p{N}.,]+/gu, ' ').replace(/\s+/g, ' ').trim() + ' ';
    const teenD = w => (Object.hasOwn(U.teen, w) ? U.teen[w] : w);             // teen → chữ có dấu
    const teenL = w => (Object.hasOwn(U.teen, w) ? stripMarks(U.teen[w]) : w); // teen → chữ không dấu
    const nfcU = tokens(nfc.replace(/[^ ]+/g, teenD)), flatU = tokens(stripMarks(nfcU));
    // Thêm cho nhóm mới của thai kỳ (không dùng cho nhóm STOP-4P):
    const spaced = s => ' ' + s.trim().replace(/\s+/g, ' ') + ' ';
    const nfcUL = tokens(nfc.replace(/[^ ]+/g, teenL));              // NFC giữ dấu, teen → không dấu: so cụm KHÔNG dấu
    const nfcPU = spaced(nfcP.replace(/[^ ]+/g, teenD));             // giữ dấu câu, teen → có dấu
    const nfcPL = spaced(nfcP.replace(/[^ ]+/g, teenL));             // giữ dấu câu, teen → không dấu
    return { flat, nfc, nfcP, nfcU, flatU, nfcUL, nfcPU, nfcPL };
  }

  /* ===== 9.2 Tự hại — kế thừa NGUYÊN VĂN STOP-4P ===== */
  function selfHarmStop4p(v) {
    const U = K.urgent;
    return has(v.nfcU, U.strict.map(k => k.normalize('NFC'))) || U.strictPatterns.some(re => re.test(v.nfcU))
      || has(v.flatU, U.loose) || U.patterns.some(re => re.test(v.nfcP));
  }

  /* ===== 9.2b Ý nghĩ làm hại con ===== */
  function harmBabyOf(v) {
    if (!feat('pregnancyHarm')) return false;
    return K.harmBaby.strictPatterns.some(re => re.test(v.nfcPU)) || K.harmBaby.patterns.some(re => re.test(v.nfcPL));
  }

  // Nhóm có strict (so có dấu) + loose (so chữ gõ không dấu) theo quy ước của nhóm mới
  const hitGroup = (g, v) => has(v.nfcU, g.strict.map(k => k.normalize('NFC'))) || has(v.nfcUL, g.loose);

  /* ===== 9.3 Dấu hiệu nguy hiểm thai kỳ ===== */
  const signOn = s => !s.feature || feat(s.feature);
  function matchSigns(v) {
    const out = [];
    for (const s of DANGER_SIGNS) {
      if (!signOn(s)) continue;
      let a = v.nfcU, b = v.nfcUL;
      for (const re of s.exclude || []) a = a.replace(re, ' ⊘');
      for (const re of s.excludeLoose || []) b = b.replace(re, ' ⊘');
      if (has(a, s.strict.map(k => k.normalize('NFC'))) || has(b, s.loose)) out.push(s.id);
    }
    return out;
  }

  /* ===== Kiểm tra an toàn (luồng vận hành, không phải sàng lọc) =====
     input: chuỗi, hoặc { text, tension (0–10 | null), emotions: ['sad', …] } (nhận cả `narrative` như STOP-4P). */
  function safetyCheck(input) {
    const o = typeof input === 'string' ? { text: input } : (input || {});
    const text = String(o.text ?? o.narrative ?? '');
    const v = views(text);
    const harmBaby = harmBabyOf(v);
    const selfHarm = selfHarmStop4p(v) || harmBaby;
    const obSigns = matchSigns(v);
    const lossOn = feat('lossGroup');
    const loss = lossOn && hitGroup(K.loss, v);
    const notKeeping = lossOn && hitGroup(K.notKeeping, v);
    const alone = lossOn && hitGroup(K.alone, v);
    const tension = Number.isFinite(o.tension) ? o.tension : null;
    const emo = new Set(o.emotions || []);
    const reasons = [];
    // 9.4 kế thừa STOP-4P (so như js/engine.js:97–99, không teen code)
    if (hasAny(text, K.human) || hasAny(text, K.humanStrict, false) || K.humanPatterns.some(re => re.test(v.flat))) reasons.push('keyword');
    if (tension !== null && tension >= 9) reasons.push('tension');
    if (tension !== null && tension >= 7 && (emo.has('sad') || emo.has('unsure'))) reasons.push('emotion');
    if (loss) reasons.push('loss');
    if (notKeeping) reasons.push('not_keeping');
    if (alone) reasons.push('alone');
    const physical = hasAny(text, K.physical) || hasAny(text, K.physicalStrict, false) || has(v.nfcUL, K.physicalPlain);
    return {
      selfHarm, harmBaby,
      obSigns, motherReported: obSigns.includes('no_movement'),
      human: reasons.length > 0, humanReasons: reasons,
      loss, notKeeping, alone, physical,
      // Thứ tự 9.1: tự hại → dấu hiệu → (PII do api.safetyGate kiểm sau) → gợi ý. Không lớp nào hạ mức lớp trước.
      route: selfHarm ? 'urgent' : obSigns.length ? 'see_doctor' : 'ok'
    };
  }

  /* ===== Thông tin nhận diện (PRD 9.8; kế thừa STOP-4P js/engine.js:19–79). Không thể phát hiện hết. ===== */
  const W = D.PII.why;
  const PII_PATTERNS = [
    { re: /(?:\+?84|\b0)(?:[\s.-]?\d){9,10}\b/g, why: W.phone },
    { re: /\b\d{6,}\b/g, why: W.digits },
    { re: /[\w.+-]+@[\w-]+\.[\w.]+/g, why: W.email },
    { re: /(?:mã\s*(?:bệnh án|hồ sơ(?:\s*khám thai)?|thai phụ|bn)|số\s*hồ sơ(?:\s*khám thai)?|(?<![\p{L}\p{N}])pid(?!\p{L})|số nhập viện)[:\s#]*\S+/giu, why: W.record },
    // Địa chỉ. Không cờ i: phần tên phải Viết Hoa thật (cờ i làm \p{Lu} khớp cả chữ thường), nên chữ đầu từ khóa ghi cả hai dạng.
    { re: /[Ss]ố nhà[\p{Zs}\t]*\d+[\p{L}\d/-]*/gu, why: W.address },
    { re: /\b\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)*[\p{Zs}\t]+(?:[Đđ]ường|[Pp]hố|[Hh]ẻm|[Nn]gõ|[Nn]gách|[Kk]iệt)(?:[\p{Zs}\t]+(?:số[\p{Zs}\t]*)?\d+[\p{L}\d/]*|(?:[\p{Zs}\t]+\p{Lu}\p{Ll}*)+)/gu, why: W.address },
    { re: /(?:[Đđ]ường|[Pp]hố|[Hh]ẻm|[Nn]gõ|[Nn]gách|[Kk]iệt)(?:[\p{Zs}\t]+(?:số[\p{Zs}\t]*)?\d+[\p{L}\d/]*|(?:[\p{Zs}\t]+\p{Lu}\p{Ll}*)+)/gu, why: W.address },
    { re: /(?:[Pp]hường|[Xx]ã|[Qq]uận|[Hh]uyện)(?:[\p{Zs}\t]+(?:\d+|\p{Lu}\p{Ll}*))+/gu, why: W.address }
  ];
  const NAME_WORD = /^\p{Lu}\p{Ll}*$/u;
  const ABBR = new Set(D.PII.abbrTitles), SENTENCE_START = new Set(D.PII.sentenceStart);
  // Danh xưng + Từ Viết Hoa → có thể là tên người. Thuật toán của STOP-4P (review lần 3 R-1, lần 4 G-2), mở rộng danh xưng 3 chữ.
  function detectNames(text) {
    const titles = new Set(D.PII.titles.concat(feat('piiSkipBabyNames') ? [] : D.PII.babyTitles));
    const words = [...text.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ w: m[0], lw: m[0].toLowerCase(), s: m.index, e: m.index + m[0].length }));
    const sameLine = (a, b, dot) => (dot ? /^\.?[\p{Zs}\t]+$/u : /^[\p{Zs}\t]+$/u).test(text.slice(a.e, b.s));
    const hits = [];
    for (let i = 0; i < words.length; i++) {
      let t = 0;
      for (let n = 3; n >= 1 && !t; n--) {
        if (i + n > words.length) continue;
        let ok = true;
        for (let k = i + 1; k < i + n; k++) if (!sameLine(words[k - 1], words[k])) ok = false;
        if (ok && titles.has(words.slice(i, i + n).map(x => x.lw).join(' '))) t = n;
      }
      if (!t) continue;
      let j = i + t, last = -1;
      const dotOk = t === 1 && ABBR.has(words[i].lw);
      // có dấu chấm sau danh xưng viết tắt mà từ kế là từ mở câu → câu mới, bỏ qua
      if (dotOk && j < words.length && /\./.test(text.slice(words[i].e, words[j].s)) && SENTENCE_START.has(words[j].lw)) continue;
      while (j < words.length && sameLine(words[j - 1], words[j], j === i + t && dotOk) && NAME_WORD.test(words[j].w)) { last = j; j++; }
      if (last < 0) continue;
      hits.push({ text: text.slice(words[i].s, words[last].e), why: W.name });
      i = last;
    }
    return hits;
  }

  function detectPII(text) {
    if (!text) return [];
    // NFC: văn bản tổ hợp (Unikey "Unicode tổ hợp", dán từ macOS) phải về dạng dựng sẵn mới khớp (STOP-4P G-01)
    const str = String(text).normalize('NFC');
    let hits = [];
    for (const p of PII_PATTERNS) {
      for (const m of str.matchAll(p.re)) hits.push({ text: m[0].trim(), why: p.why, s: m.index, e: m.index + m[0].length });
    }
    // Một vùng nằm GỌN trong vùng của mẫu khác (dãy số trong SĐT, "đường Lê Lợi" trong "12 đường Lê Lợi") thì không báo lần hai.
    // So theo vị trí, không theo chuỗi con: "gọi 0912345678 hoặc CCCD 912345678" vẫn báo cả CCCD (STOP-4P G-03).
    hits = hits.filter((h, i) => !hits.some((o, k) => k !== i && o.s <= h.s && o.e >= h.e && (o.e - o.s > h.e - h.s || k < i)));
    hits.sort((a, b) => a.s - b.s);
    hits.push(...detectNames(str));
    const seen = new Set();
    return hits.map(h => ({ text: h.text, why: h.why })).filter(h => (seen.has(h.text) ? false : seen.add(h.text)));
  }

  /* ===== Suy luận chip tình huống (9.6). Chị đã tự sửa nhãn → giữ nguyên lựa chọn của chị. ===== */
  const CONTEXT_CODES = new Set(CONTEXTS.map(c => c.code));
  const physicalText = t => hasAny(t, K.physical) || hasAny(t, K.physicalStrict, false) || has(views(t).nfcUL, K.physicalPlain);
  function inferContexts(input) {
    const o = input || {};
    const set = new Set((o.contexts || []).filter(c => CONTEXT_CODES.has(c)));
    if (o.labelsEdited) return [...set];
    const t = String(o.text ?? o.narrative ?? '');
    if (hasAny(t, K.sleep)) set.add('sleep');
    for (const [code, list] of Object.entries(K.contexts)) if (hasAny(t, list)) set.add(code);
    if (physicalText(t)) set.add('body');
    return CONTEXTS.map(c => c.code).filter(c => set.has(c));
  }

  /* ===== Lọc bài dùng chung cho gợi ý và thư viện (UX T04: "lọc theo cùng luật với engine") ===== */
  function allowed(id, opts = {}) {
    const ex = EXERCISES[id];
    if (!ex || ex.holdsBreath || !draftOk(ex)) return false;
    if (opts.unwell && !ex.okWhenUnwell) return false;
    if (opts.noBaby && ex.withBaby) return false;
    return true;
  }
  const fits = (id, minutes) => !minutes || EXERCISES[id].min <= minutes;
  const library = (opts = {}) => LIBRARY_ORDER.filter(id => allowed(id, opts));

  /* ===== Gợi ý theo luật 9.7 — dừng ở dòng đầu tiên khớp, lọc phút, xoay vòng, tối đa 2 =====
     input: { text, tension, emotions, contexts, labelsEdited, minutes }; attempt: số lần bấm "Đổi gợi ý". */
  const RULES = [
    { key: 'physical', when: x => x.unwell, ids: ['AUDIO_CALM', 'GROUND_54321', 'STOP_PAUSE'] },
    // Mất con: PRD 9.7 ghi "Thở bụng nhẹ, tay ôm con"; theo B2 (Team Lead 29/10/2026) thay bằng bài trung tính Thở chậm 4–6
    { key: 'sad', when: x => x.s.loss, ids: ['AUDIO_CALM', 'BREATHE_46', 'STOP_PAUSE'] },
    { key: 'sleep', when: x => x.ctx.has('sleep'), ids: ['AUDIO_CALM', 'RELEASE_ZONES', 'BREATHE_46'] },
    { key: 'worried', when: x => x.ctx.has('before_visit') || x.emo.has('worried') || x.emo.has('panicked'), ids: ['BREATHE_46', 'GROUND_54321', 'HUM'] },
    { key: 'worry_baby', when: x => x.ctx.has('worry_baby'), ids: ['HUM', 'BELLY_BREATH', 'MUSIC'] },
    { key: 'irritated', when: x => x.ctx.has('family') || x.emo.has('angry'), ids: ['STOP_PAUSE', 'GROUND_54321', 'BREATHE_46'] },
    { key: 'sad', when: x => x.emo.has('sad') || x.emo.has('unsure') || x.s.human, ids: ['BELLY_BREATH', 'MUSIC', 'AUDIO_CALM'] },
    { key: 'tired', when: x => x.emo.has('tired'), ids: ['AUDIO_CALM', 'BELLY_BREATH'] },
    { key: 'default', when: () => true, ids: ['BELLY_BREATH', 'MUSIC', 'HUM', 'BREATHE_46'] }
  ];

  function recommend(input, attempt = 0) {
    const o = input || {};
    const s = safetyCheck(o);
    const contexts = inferContexts(o);
    const ctx = new Set(contexts), emo = new Set(o.emotions || []);
    const minutes = o.minutes || null;
    // Khó chịu trong người (9.5), chip "Mệt trong người", hoặc chị bấm "chọn nhầm" sau trang khẩn vì dấu hiệu cơ thể
    // → chỉ bài không theo nhịp (AC-30). "Con đạp ít" không phải triệu chứng của mẹ nên không tính vào đây.
    const unwell = s.physical || ctx.has('body') || s.obSigns.some(id => id !== 'no_movement');
    const noBaby = !!s.loss;                                   // AC-36
    const rule = RULES.find(r => r.when({ s, ctx, emo, unwell }));
    const opts = { unwell, noBaby };
    let pool = rule.ids.filter(id => allowed(id, opts) && fits(id, minutes));
    if (!pool.length) pool = ['STOP_PAUSE'].filter(id => allowed(id, opts)); // AC-34
    const extras = LIBRARY_ORDER.filter(id => !pool.includes(id) && allowed(id, opts) && fits(id, minutes));
    const full = [...pool, ...extras];
    const start = (attempt * 2) % Math.max(full.length, 1);
    const ids = [full[start], full[(start + 1) % full.length]].filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 2);
    return {
      support: s.selfHarm ? 'urgent' : s.obSigns.length ? 'see_doctor' : s.human ? 'human' : 'routine',
      askHuman: s.selfHarm || s.human,                         // thẻ A.22 (AC-25, AC-29)
      unwell,                                                  // dòng A.22b
      noBabyInvites: noBaby,                                   // ẩn lời mời sang Thai giáo, bài "cùng con" (AC-36)
      summaryKey: rule.key, summary: SUMMARIES[rule.key],
      suggestions: validate(ids.map(id => ({ exercise_id: id, reason: REASONS[id] }))),
      contexts, emotions: [...emo], safety: s,
      source: 'rules', rules_version: '0.1'
    };
  }

  // Chỉ giữ ID trong danh mục, không bài nín thở, và (nếu không cho bản nháp) đã duyệt. Tối đa 2.
  function validate(list) {
    return (list || []).filter(x => x && Object.hasOwn(EXERCISES, x.exercise_id) && allowed(x.exercise_id)).slice(0, 2);
  }

  /* ===== Dòng lý do trên trang khẩn chung (A.20, R-15: dấu hiệu → mẹ báo → giờ 2 → 2 giờ) =====
     obSigns: mã khớp từ ô viết; tappedSigns: mã chạm ở trang `signs`, `kick_before`, chip L01; kickReasons: reasons của mục đếm.
     kick: true → chữ của mục đếm (kickLabel) và dòng mở đầu M-124. Không trùng; mã lạ bị bỏ. */
  function urgentReasons({ obSigns = [], tappedSigns = [], kickReasons = [], kick = false } = {}) {
    const ids = new Set([...tappedSigns, ...obSigns]);
    const kr = new Set(kickReasons);
    const signs = DANGER_SIGNS.filter(s => ids.has(s.id));
    const out = [];
    const rows = new Set();
    const danger = signs.filter(s => s.reason === 'danger_sign').filter(s => {
      if (kick) return true;
      if (rows.has(s.row)) return false;                       // dòng 6: "đau đầu" và "nhìn mờ" là một dòng
      rows.add(s.row); return true;
    });
    if (danger.length) {
      if (kick) out.push({ code: 'danger_sign_intro', text: URGENT_REASONS.danger_sign });
      for (const s of danger) out.push({ code: 'danger_sign', sign: s.id, text: kick && s.kickLabel ? s.kickLabel : s.label });
    }
    if (signs.some(s => s.reason === 'mother_reported') || kr.has('mother_reported')) out.push({ code: 'mother_reported', text: URGENT_REASONS.mother_reported });
    for (const c of ['h2_low', 'lt10_2h']) if (kr.has(c)) out.push({ code: c, text: URGENT_REASONS[c] });
    return out;
  }

  /* ===== Danh sách dấu hiệu theo nơi dùng ===== */
  // signs({ place: 'page' | 'kick' | 'all' }) → mảng DANGER_SIGNS đang bật
  function signs({ place = 'page' } = {}) {
    return DANGER_SIGNS.filter(s => signOn(s) && (place === 'all' || (place === 'kick' ? s.kickBefore : s.signsPage)));
  }

  /* ===== PIN yếu (AC-81, ADR 0005 mục 4.3) — cùng luật với server =====
     Chỉ trả lời "yếu hay không" cho PIN đúng 6 chữ số; PIN sai dạng trả false (kiểm định dạng là việc khác: pin_invalid). */
  function weakPin(pin, phone) {
    const p = String(pin ?? '');
    if (!/^\d{6}$/.test(p)) return false;
    const d = [...p].map(Number);
    const steps = d.slice(1).map((x, i) => x - d[i]);
    if (steps.every(x => x === 0) || steps.every(x => x === 1) || steps.every(x => x === -1)) return true;
    if (p.slice(0, 3) === p.slice(3)) return true;                                  // 123123
    if (p.slice(0, 2) === p.slice(2, 4) && p.slice(2, 4) === p.slice(4)) return true; // 121212
    if (D.PIN.weakList.includes(p)) return true;
    const digits = String(phone ?? '').replace(/\D/g, '');
    return digits.length >= 6 && digits.slice(-6) === p;
  }

  const labelOf = (list, code) => (list.find(x => x.code === code) || {}).label || code;

  return {
    safetyCheck, detectPII, inferContexts, recommend, validate, urgentReasons, weakPin,
    signs, library, allowed, stripMarks,
    signById: id => DANGER_SIGNS.find(s => s.id === id) || null,
    emotionLabel: c => labelOf(EMOTIONS, c), contextLabel: c => labelOf(CONTEXTS, c)
  };
})();
