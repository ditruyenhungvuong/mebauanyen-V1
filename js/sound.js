/* =========================================================
   Mẹ Bầu An Yên – js/sound.js · window.LSTP_SOUND
   Chủ: FE-3 Thư giãn
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 9; PRD 3.5 dòng 9–10, AC-49…53, 110…112
   Kế thừa cơ chế: apps/STOP-4P-Healthcare-Staff/js/players.js:18–34 (getCtx, chime), :361–428 (âm nền, nhỏ dần).

   Quy tắc cứng:
   - KHÔNG tạo AudioContext lúc nạp trang. Chỉ unlock() (gọi trong handler của cú chạm "Phát", "Bắt đầu" khi
     bật âm báo, chạm vòng bụng) mới tạo (AC-49). chime() không tự tạo context.
   - Âm tự tạo: trần gain 0,5 (thanh âm lượng 100 = gain 0,5), mặc định 30 (AC-50).
   - Mọi nguồn đang phát nằm trong `live`; stopAll(fadeMs ≤ 3000) nhỏ dần rồi tắt hết (AC-39, AC-48).
   - Hẹn giờ của âm tự tạo đặt trên đồng hồ âm thanh (ctx.currentTime): tab nền bị giãn timer vẫn tắt đúng giờ.
   - Không Web Speech, không tải file âm thanh nào cho âm tự tạo (AC-52).

   Interface (dùng chung cho players.js và kick.js):
     SOUND.supported()            → bool   trình duyệt có WebAudio
     SOUND.unlock()               → ctx|null  tạo/resume context — CHỈ gọi trong handler cú chạm
     SOUND.created()              → bool   đã có context chưa (e2e kiểm AC-49)
     SOUND.vol(v0..100)           → gain 0..0,5
     SOUND.DEFAULT_VOLUME         = 30
     SOUND.muted() / setMuted(b)  công tắc tiếng chung (lstp_v1_prefs.sound), chỉ chặn chime/bum/giggle
     SOUND.chime(freq, dur)       tiếng chuông nhỏ (cần context đã có)
     SOUND.bum() / giggle()       hiệu ứng chạm của mục đếm (tự unlock vì luôn gọi trong cú chạm)
     SOUND.ambient(kind, {volume, minutes, onEnd}) → handle | null   kind: 'waves'|'rain'|'wind'|'melody'
     SOUND.media(el, {onEnd})     → handle   đăng ký <audio> để stopAll nhỏ dần được
       handle = { kind, endsAt, setVolume(v), stop(fadeMs) }
     SOUND.fadeOut(ms) = SOUND.stopAll(ms)   (mặc định 2000, tối đa 3000)
     SOUND.playing()              → số nguồn đang phát
   ========================================================= */
window.LSTP_SOUND = (() => {
  'use strict';
  const GAIN_CAP = 0.5;          // như STOP-4P vol(): thanh 100 → gain 0,5
  const DEFAULT_VOLUME = 30;     // PRD 3.5 dòng 9 (STOP-4P là 40)
  const FADE_MAX = 3000;         // AC-39: tắt hẳn trong ≤ 3 giây
  const END_FADE_S = 10;         // AC-51: nhỏ dần ~10 giây khi hết giờ

  let ctx = null;
  let melodyBuf = null;          // bộ đệm giai điệu tự tạo, dựng một lần cho mỗi context
  let mutedMem = false;          // dự phòng khi store chưa có S.prefs
  const live = new Set();

  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const vol = v => clamp(+v || 0, 0, 100) / 100 * GAIN_CAP;
  const Ctor = () => (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) || null;
  const supported = () => !!Ctor();

  /* ===== Context: chỉ tạo khi có cú chạm ===== */
  function unlock() {
    if (!ctx) {
      const A = Ctor();
      if (!A) return null;
      try { ctx = new A(); } catch (e) { ctx = null; return null; }
      // Safari: âm "ambient" tôn trọng gạt im lặng của iPhone (đặc tả mục con 5.6)
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* bỏ qua */ }
    }
    if (ctx.state === 'suspended') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* bỏ qua */ } }
    return ctx;
  }

  /* ===== Công tắc tiếng chung (K-AC-11) ===== */
  // Store (FE-1) có S.prefs thì đọc mỗi lần (công tắc đổi ở màn khác vẫn đúng); chưa có thì nhớ trong bộ nhớ.
  const storePrefs = () => { const S = window.LSTP_STORE; return S && S.prefs && typeof S.prefs.get === 'function' ? S.prefs : null; };
  function muted() {
    try { const P = storePrefs(); if (P) { const p = P.get(); return !!(p && p.sound === false); } } catch (e) { /* bỏ qua */ }
    return !!mutedMem;
  }
  function setMuted(b) {
    mutedMem = !!b;
    // Store tự quyết ghi hay không theo chế độ (none: chỉ bộ nhớ, AC-11)
    try { const P = storePrefs(); if (P && typeof P.set === 'function') P.set({ sound: !mutedMem }); } catch (e) { /* bỏ qua */ }
  }

  /* ===== Tiếng ngắn ===== */
  function tone(c, freq, dur, peak, type, at) {
    const t0 = at || c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  // Chuông báo đổi nhịp: chỉ dùng context đã có (người dùng đã bật "Âm báo" bằng một cú chạm)
  function chime(freq = 528, dur = 0.7) {
    if (!ctx || muted()) return;
    try { tone(ctx, freq, dur, 0.07); } catch (e) { /* bỏ qua */ }
  }
  // "Bum" khi chạm bụng: tiếng trầm ngắn, rơi cao độ (luôn gọi trong cú chạm → được unlock)
  function bum() {
    if (muted()) return;
    const c = unlock(); if (!c) return;
    try {
      const t0 = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t0);
      o.frequency.exponentialRampToValueAtTime(55, t0 + 0.22);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0 + 0.35);
    } catch (e) { /* bỏ qua */ }
  }
  // Tiếng cười khúc khích: bốn tiếng "chíp" ngắn đi lên
  function giggle() {
    if (muted()) return;
    const c = unlock(); if (!c) return;
    try {
      const t0 = c.currentTime;
      [740, 880, 988, 1175].forEach((f, i) => tone(c, f, 0.12, 0.05, 'triangle', t0 + i * 0.11));
    } catch (e) { /* bỏ qua */ }
  }

  /* ===== Bộ đệm âm nền tự tạo ===== */
  // Nhiễu nâu / hồng 8 giây, nối vòng không "tách" (STOP-4P players.js:384–395)
  function noiseBuffer(c, kind) {
    const len = c.sampleRate * 8, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'waves') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.06; }
    }
    const drift = d[len - 1] - d[0];
    for (let i = 0; i < len; i++) d[i] -= drift * i / len;
    return buf;
  }
  // Giai điệu êm không lời, tự dựng: ngũ cung Đô trưởng, nốt sine mềm, nền trầm Đô–Son.
  // Vòng 32 giây nối liền: tần số nền và nhịp rung chọn sao cho đủ số chu kỳ nguyên trong 32 giây.
  function melodyBuffer(c) {
    if (melodyBuf && melodyBuf.sampleRate === c.sampleRate) return melodyBuf;
    const SEC = 32, sr = c.sampleRate, len = SEC * sr;
    const buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // Nền: Đô3 (130,8125 Hz × 32 s = 4186 chu kỳ) + Son3 (196 Hz × 32 = 6272), rung biên độ 0,125 Hz (4 chu kỳ)
    const TWO_PI = Math.PI * 2;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const trem = 0.75 + 0.25 * Math.sin(TWO_PI * 0.125 * t);
      d[i] = (Math.sin(TWO_PI * 130.8125 * t) * 0.05 + Math.sin(TWO_PI * 196 * t) * 0.03) * trem;
    }
    // Giai điệu: bước đi ±1–2 bậc, mỗi câu 8 nốt cách 0,8 s rồi nghỉ; không đặt nốt trong 3 giây cuối để nối vòng êm
    let idx = 2, t = 0.6;
    const BEAT = 0.8, NOTE_LEN = 2.6;
    while (t < SEC - 3) {
      for (let k = 0; k < 8 && t < SEC - 3; k++) {
        const f = SCALE[idx];
        const n0 = Math.floor(t * sr), n1 = Math.min(len, n0 + Math.floor(NOTE_LEN * sr));
        for (let i = n0; i < n1; i++) {
          const x = (i - n0) / sr;
          const env = (x < 0.08 ? x / 0.08 : 1) * Math.exp(-x * 1.6);
          d[i] += (Math.sin(TWO_PI * f * x) + 0.25 * Math.sin(TWO_PI * 2 * f * x)) * env * 0.16;
        }
        const step = rnd() < 0.5 ? (rnd() < 0.5 ? -1 : 1) : (rnd() < 0.5 ? -2 : 2);
        idx = clamp(idx + step, 0, SCALE.length - 1);
        t += k === 7 ? BEAT * 2 : BEAT * (rnd() < 0.2 ? 2 : 1);
      }
    }
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak > 0) for (let i = 0; i < len; i++) d[i] *= 0.7 / peak;
    melodyBuf = buf;
    return buf;
  }

  /* ===== Âm nền: sóng biển, mưa nhẹ, gió êm, giai điệu ===== */
  function ambient(kind, opts = {}) {
    const c = unlock();
    if (!c) return null;
    try {
      const src = c.createBufferSource();
      src.buffer = kind === 'melody' ? melodyBuffer(c) : noiseBuffer(c, kind);
      src.loop = true;
      const amp = c.createGain();
      const master = c.createGain();
      master.gain.value = 0.0001;
      let chain = src;
      if (kind !== 'melody') {
        const filt = c.createBiquadFilter();
        // Sóng: nhiễu nâu lọc thấp + lên xuống chậm. Mưa: nhiễu hồng dải giữa. Gió êm: nhiễu hồng lọc thấp, đều.
        filt.type = kind === 'rain' ? 'bandpass' : 'lowpass';
        filt.frequency.value = kind === 'rain' ? 2500 : kind === 'waves' ? 900 : 1400;
        filt.Q.value = 0.5;
        chain = src.connect(filt);
        amp.gain.value = kind === 'waves' ? 0.6 : kind === 'wind' ? 1.4 : 1;
      } else amp.gain.value = 1;
      chain.connect(amp).connect(master).connect(c.destination);
      let lfo = null;
      if (kind === 'waves') {
        lfo = c.createOscillator(); const depth = c.createGain();
        lfo.frequency.value = 0.09; depth.gain.value = 0.4;
        lfo.connect(depth).connect(amp.gain); lfo.start();
      }
      src.start();
      const now = c.currentTime;
      master.gain.setTargetAtTime(vol(opts.volume ?? DEFAULT_VOLUME), now, 1.2);
      const handle = { kind, endsAt: 0, stopped: false };
      // Hẹn giờ trên đồng hồ âm thanh: nhỏ dần 10 s cuối rồi dừng (AC-51)
      if (opts.minutes > 0) {
        const end = now + opts.minutes * 60;
        handle.endsAt = Date.now() + opts.minutes * 60000;
        master.gain.setTargetAtTime(0.0001, Math.max(now + 0.5, end - END_FADE_S), END_FADE_S / 4);
        src.stop(end + 0.2);
        if (lfo) lfo.stop(end + 0.2);
      }
      src.onended = () => {
        if (!live.has(handle)) return;
        live.delete(handle);
        handle.stopped = true;
        if (typeof opts.onEnd === 'function') { try { opts.onEnd(); } catch (e) { /* bỏ qua */ } }
      };
      handle.setVolume = v => { if (!handle.stopped) { try { master.gain.cancelScheduledValues(c.currentTime); master.gain.setTargetAtTime(vol(v), c.currentTime, 0.2); if (handle.endsAt) { const end = c.currentTime + (handle.endsAt - Date.now()) / 1000; master.gain.setTargetAtTime(0.0001, Math.max(c.currentTime + 0.5, end - END_FADE_S), END_FADE_S / 4); } } catch (e) { /* bỏ qua */ } } };
      handle.stop = (fadeMs = 1500) => {
        if (handle.stopped) return;
        handle.stopped = true;
        live.delete(handle);
        const f = clamp(fadeMs, 0, FADE_MAX) / 1000;
        try {
          const t = c.currentTime;
          master.gain.cancelScheduledValues(t);
          master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
          master.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, f));
          src.stop(t + Math.max(0.05, f) + 0.05);
          if (lfo) lfo.stop(t + Math.max(0.05, f) + 0.05);
        } catch (e) { try { src.stop(); } catch (e2) { /* bỏ qua */ } }
      };
      live.add(handle);
      return handle;
    } catch (e) { return null; }
  }

  /* ===== <audio> của MUSIC_LINKS: đăng ký để nhỏ dần / dừng chung ===== */
  // iPhone không cho đổi volume của <audio> → nhỏ dần không được thì dừng hẳn (AC-112, R11).
  function volumeWorks(el) {
    try { const old = el.volume; el.volume = old > 0.5 ? 0.4 : 0.6; const ok = Math.abs(el.volume - (old > 0.5 ? 0.4 : 0.6)) < 0.01; el.volume = old; return ok; } catch (e) { return false; }
  }
  function media(el, opts = {}) {
    const handle = { kind: 'media', endsAt: 0, stopped: false, el };
    const release = () => {
      try { el.pause(); } catch (e) { /* bỏ qua */ }
      try { el.removeAttribute('src'); el.load(); } catch (e) { /* bỏ qua */ }
    };
    handle.setVolume = v => { try { el.volume = clamp(+v || 0, 0, 100) / 100; } catch (e) { /* bỏ qua */ } };
    handle.stop = (fadeMs = 1500) => {
      if (handle.stopped) return;
      handle.stopped = true;
      live.delete(handle);
      const f = clamp(fadeMs, 0, FADE_MAX);
      if (!f || !volumeWorks(el)) { release(); return; }
      const v0 = el.volume, steps = Math.max(1, Math.round(f / 100));
      let i = 0;
      const id = setInterval(() => {
        i++;
        try { el.volume = Math.max(0, v0 * (1 - i / steps)); } catch (e) { /* bỏ qua */ }
        if (i >= steps) { clearInterval(id); release(); }
      }, 100);
    };
    handle.volumeWorks = () => volumeWorks(el);
    el.addEventListener('ended', () => {
      if (!live.has(handle)) return;
      live.delete(handle); handle.stopped = true;
      if (typeof opts.onEnd === 'function') { try { opts.onEnd(); } catch (e) { /* bỏ qua */ } }
    });
    live.add(handle);
    return handle;
  }

  /* ===== Dừng tất cả (≤ 3 s) ===== */
  function stopAll(fadeMs = 2000) {
    [...live].forEach(h => { try { h.stop(Math.min(fadeMs, FADE_MAX)); } catch (e) { /* bỏ qua */ } });
  }

  return {
    DEFAULT_VOLUME, GAIN_CAP,
    supported, unlock, created: () => !!ctx, vol,
    muted, setMuted,
    chime, bum, giggle,
    ambient, media,
    stopAll, fadeOut: ms => stopAll(ms),
    playing: () => live.size
  };
})();
