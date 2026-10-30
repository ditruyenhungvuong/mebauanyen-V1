/* =========================================================
   Mẹ Bầu An Yên – js/journey.js
   Chủ: FE-5 Thai giáo, Thói quen & Hành trình
   Đặc tả: tech design mục 4.3 · UX J01 (3.4), F9, L15 · đặc tả Đếm cử động thai M-169…M-178 (bản đồ dấu chân)
   Màn: journey (J01 "Hành trình mang thai"): bản đồ bước chân gộp mọi lượt đếm (vùng theo K.zoneOf/K.zones của
   FE-4) + dòng thời gian thai giáo và lượt đếm, nhóm theo tuần thai khi có ngày dự sinh (không thì theo tháng);
   xóa một mục (bấm hai lần) / xóa cả hành trình (hộp L15) qua store. Không điểm, không chuỗi ngày, không ghi mức
   của lượt đếm (R-10). Mọi chuỗi vào HTML qua esc().
   ========================================================= */
(() => {
  'use strict';

  let api = null;
  const esc = s => api.esc(s);
  const S = () => api.S;
  const safe = (fn, dflt) => { try { const v = fn(); return v === undefined ? dflt : v; } catch (e) { return dflt; } };
  const today = () => api.today();
  const RE_DAY = /^\d{4}-\d{2}-\d{2}$/;
  const fmtDM = d => d.slice(8, 10) + '/' + d.slice(5, 7);
  const fmtDMY = d => fmtDM(d) + '/' + d.slice(0, 4);
  const st = () => (api.state.journey = api.state.journey || { filter: 'all', range: 'all', table: false, open: {} });

  /* ===== Vùng trên bụng (M-173). Ưu tiên K.zoneOf của FE-4 để J01 và K09 cùng một cách chia ===== */
  const ZONES = ['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center'];
  const ZONE_TEXT = { top_left: 'phía trên bên trái', top_right: 'phía trên bên phải', bottom_left: 'phía dưới bên trái', bottom_right: 'phía dưới bên phải', center: 'ở giữa' };
  const ZONE_ALIAS = { tl: 'top_left', tr: 'top_right', bl: 'bottom_left', br: 'bottom_right', c: 'center', mid: 'center', middle: 'center', centre: 'center',
    upper_left: 'top_left', upper_right: 'top_right', lower_left: 'bottom_left', lower_right: 'bottom_right' };
  // Hình bụng nhìn như lúc chị cúi xuống nhìn bụng mình: x nhỏ là bên trái của chị (M-174)
  function ownZone(x, y) {
    if (Math.hypot(x - 0.5, y - 0.5) < 0.17) return 'center';
    return (y < 0.5 ? 'top_' : 'bottom_') + (x < 0.5 ? 'left' : 'right');
  }
  function zoneOf(x, y) {
    const K = api.K || {};
    if (typeof K.zoneOf === 'function') {
      const z = safe(() => K.zoneOf(x, y), null);
      const code = typeof z === 'string' ? (ZONE_TEXT[z] ? z : ZONE_ALIAS[z]) : (z && (ZONE_TEXT[z.code] ? z.code : ZONE_ALIAS[z.code]));
      if (code) return code;
    }
    return ownZone(x, y);
  }
  const zonePhrase = z => (z === 'center' ? 'ở giữa' : 'ở ' + ZONE_TEXT[z]);

  /* ===== Đọc dữ liệu (store FE-1), kiểm kiểu từng trường: bản ghi sai bị bỏ ===== */
  const asArr = v => (Array.isArray(v) ? v : []);
  const letters = () => asArr(safe(() => S().letters.list(), [])).filter(r => r && typeof r.id === 'string' && RE_DAY.test(r.day) && typeof r.text === 'string');
  const marks = () => asArr(safe(() => S().thaigiao.list(), [])).filter(r => r && typeof r.id === 'string' && RE_DAY.test(r.day));
  const validTap = t => t && Number.isFinite(t.x) && Number.isFinite(t.y) && t.x >= 0 && t.x <= 1 && t.y >= 0 && t.y <= 1;
  const sessions = () => asArr(safe(() => S().kick.list({}), [])).filter(s => s && typeof s.id === 'string' && Number.isFinite(s.startAt))
    .map(s => Object.assign({}, s, { day: api.U.dayKey(s.startAt), taps: asArr(s.taps).filter(t => t && typeof t === 'object') }));
  const edd = () => safe(() => { const p = S().profile.get(); return p && RE_DAY.test(p.edd) ? p.edd : null; }, null);
  const gest = () => safe(() => (typeof api.gestAge === 'function' ? api.gestAge() : null), null);
  function promptName(id) {
    const D = api.D || {};
    const src = [D.TG_PROMPTS, D.THAIGIAO_PROMPTS, D.THAIGIAO, D.PROMPTS].find(a => Array.isArray(a) && a.length) || [];
    const p = src.find(x => x && (x.id === id || x.code === id));
    return p ? String(p.type || p.kind || p.tag || p.title || '') : '';
  }
  function promptText(id) {
    const D = api.D || {};
    const src = [D.TG_PROMPTS, D.THAIGIAO_PROMPTS, D.THAIGIAO, D.PROMPTS].find(a => Array.isArray(a) && a.length) || [];
    const p = src.find(x => x && (x.id === id || x.code === id));
    return p ? String(p.text || p.prompt || '') : '';
  }

  /* ===== Phạm vi bản đồ: Tuần này (theo tuần thai nếu có ngày dự sinh) · Tháng này · Cả hành trình ===== */
  function rangeOf(range) {
    const t = today(), ST = api.ST;
    if (range === 'week') {
      const w = edd() ? ST.gaWeekOf(t, edd()) : null;
      return w ? [w.start, w.end] : [ST.addDays(t, -6), t];
    }
    if (range === 'month') return [t.slice(0, 8) + '01', t];
    return ['0000-01-01', '9999-12-31'];
  }
  const RANGE_TEXT = { week: 'tuần này', month: 'tháng này', all: 'cả hành trình' };

  /* ===== Bản đồ bước chân (gộp mọi lượt trong phạm vi) ===== */
  function footprints(range) {
    const [a, b] = rangeOf(range);
    const pts = [], counts = { top_left: 0, top_right: 0, bottom_left: 0, bottom_right: 0, center: 0 };
    let noPos = 0;
    for (const s of sessions()) {
      if (s.day < a || s.day > b) continue;
      for (const t of s.taps) {
        if (validTap(t)) { pts.push(t); counts[zoneOf(t.x, t.y)]++; }
        else noPos++;
      }
    }
    const max = Math.max(0, ...Object.values(counts));
    const top = max > 0 ? ZONES.filter(z => counts[z] === max) : [];
    return { pts, counts, top: top.length > 2 ? [] : top, noPos };
  }
  function zoneRect(z) {
    // Khung gạch đứt quanh vùng nhiều nhất (tọa độ viewBox 0–100)
    if (z === 'center') return '<circle cx="50" cy="50" r="17" class="fp-zone"/>';
    const x = z.endsWith('left') ? 6 : 50, y = z.startsWith('top') ? 6 : 50;
    return `<rect x="${x}" y="${y}" width="44" height="44" rx="6" class="fp-zone"/>`;
  }
  function mapHtml(range) {
    const f = footprints(range);
    const n = f.pts.length;
    const topTxt = f.top.length ? f.top.map(zonePhrase).join(' và ') : '';
    const aria = n
      ? `Bản đồ bước chân ${RANGE_TEXT[range]}: ${n} bước chân${topTxt ? ', nhiều nhất ' + topTxt.replace(/^ở /, '').replace(' và ở ', ' và ') : ''}.`
      : `Bản đồ bước chân ${RANGE_TEXT[range]}: chưa có bước chân nào.`;
    const feet = f.pts.slice(-1200).map(t => `<text x="${(t.x * 100).toFixed(1)}" y="${(t.y * 100).toFixed(1)}" class="fp-foot">👣</text>`).join('');
    const s = st();
    const table = s.table ? `<table class="jr-table"><caption>Số lần chạm theo vùng (${esc(RANGE_TEXT[range])})</caption>
        <tbody>${ZONES.map(z => `<tr><th scope="row">${esc(ZONE_TEXT[z].charAt(0).toUpperCase() + ZONE_TEXT[z].slice(1))}</th><td>${f.counts[z]} lần</td></tr>`).join('')}</tbody></table>` : '';
    return `<div class="jr-map">
      <svg class="fp-belly" viewBox="0 0 100 100" role="img" aria-label="${esc(aria)}">
        <circle cx="50" cy="50" r="48" class="fp-bg"/>
        ${f.top.map(zoneRect).join('')}
        ${feet}
      </svg>
      <p class="fp-sides" aria-hidden="true"><span>← Bên trái của chị</span><span>Bên phải của chị →</span></p>
      ${n ? (topTxt ? `<p class="fp-top">Con hay đạp nhất ${esc(topTxt)}.</p>` : '') : '<p>Chưa có dấu chân nào. Lượt đếm tới, chị chạm đúng chỗ con đạp nhé.</p>'}
      ${f.noPos ? `<p class="fine">Có ${f.noPos} lần chị bấm nút, không ghi vị trí.</p>` : ''}
      <div class="chips" role="group" aria-label="Phạm vi bản đồ">
        ${['week', 'month', 'all'].map(r => `<button type="button" class="chip" data-act="jrRange" data-range="${r}" aria-pressed="${r === range}">${{ week: 'Tuần này', month: 'Tháng này', all: 'Cả hành trình' }[r]}</button>`).join('')}
      </div>
      <p class="fine">Hình bụng nhìn như lúc chị cúi xuống nhìn bụng mình: bên trái hình là bên trái của chị.</p>
      <p class="fine">Bản đồ để mẹ nhớ những lần con đạp, không cho biết tư thế hay sức khỏe của con.</p>
      <div class="jr-row">
        <button type="button" class="btn btn-secondary" data-act="jrTable" aria-expanded="${s.table}">${s.table ? 'Ẩn bảng' : 'Xem dạng bảng'}</button>
        <button type="button" class="btn btn-secondary" data-go="kick_footprints">👣 Mở bản đồ đầy đủ ›</button>
      </div>
      ${table}
    </div>`;
  }

  /* ===== Dòng thời gian: mỗi ngày tối đa hai mốc (💌 thai giáo, 👣 đếm), mới nhất trên cùng ===== */
  function entries() {
    const byDay = {};
    const get = d => (byDay[d] = byDay[d] || { day: d, tg: { marks: [], letters: [] }, kick: [] });
    for (const m of marks()) get(m.day).tg.marks.push(m);
    for (const l of letters()) get(l.day).tg.letters.push(l);
    for (const s of sessions()) get(s.day).kick.push(s);
    const out = [];
    for (const d of Object.keys(byDay).sort().reverse()) {
      const e = byDay[d];
      if (e.tg.marks.length || e.tg.letters.length) out.push({ type: 'tg', day: d, marks: e.tg.marks, letters: e.tg.letters.sort((a, b) => (b.at || 0) - (a.at || 0)) });
      if (e.kick.length) out.push({ type: 'kick', day: d, sessions: e.kick });
    }
    return out;
  }
  // Nhóm theo tuần thai (có ngày dự sinh, chưa quá 42 tuần) hoặc theo tháng
  function groupKey(day) {
    const g = gest();
    const e = edd();
    const w = e && !(g && g.status === 'past42') ? api.ST.gaWeekOf(day, e) : null;
    if (w) return { key: 'w' + w.week, label: `Tuần ${w.week} · ${fmtDM(w.start)} – ${fmtDM(w.end)}`, chip: 'T' + w.week };
    return { key: 'm' + day.slice(0, 7), label: `Tháng ${+day.slice(5, 7)}/${day.slice(0, 4)}`, chip: 'Th' + (+day.slice(5, 7)) };
  }
  function entryHtml(e) {
    const s = st();
    const dDel = e.type === 'tg'
      ? (e.letters.some(l => l.sync === 'cloud') ? 'cloud' : '')
      : (e.sessions.some(x => x.sync === 'cloud') ? 'cloud' : '');
    const del = `<button type="button" class="btn btn-secondary btn-sm jr-del" data-act="jrDel" data-type="${e.type}" data-day="${esc(e.day)}" data-cloud="${dDel}" aria-label="Xóa mốc ngày ${esc(fmtDM(e.day))}">🗑</button>`;
    if (e.type === 'kick') {
      const steps = e.sessions.reduce((n, x) => n + x.taps.length, 0);
      return `<li class="jr-item jr-kick" id="jr-${e.type}-${esc(e.day)}" tabindex="-1">
        <p class="jr-line"><span class="jr-dot" aria-hidden="true"></span><time datetime="${esc(e.day)}">${esc(fmtDM(e.day))}</time> · 👣 ${e.sessions.length} lượt đếm · ${steps} bước chân</p>
        ${del}</li>`;
    }
    const names = [...new Set(e.marks.filter(m => m.how === 'done').map(m => promptName(m.prompt)).filter(Boolean))];
    const head = names.length ? `💌 Mẹ đã làm: ${names.join(', ')}` : '💌 Lời mẹ kể';
    const acct = api.mode() === 'account';
    const lts = e.letters.map(l => {
      const open = !!s.open[l.id];
      const badge = acct ? `<span class="sync-badge">${esc(l.sync === 'cloud' ? '☁️ Đã lưu lên tài khoản' : l.sync === 'pending' ? '⏳ Đang chờ gửi' : '📱 Chỉ trên máy này')}</span>` : '';
      const pt = l.prompt ? promptText(l.prompt) : '';
      return `<div class="letter jr-letter">
        ${pt ? `<p class="letter-prompt">${esc(pt)}</p>` : ''}
        <p class="letter-text${open ? '' : ' is-clamp'}" id="jr-lt-${esc(l.id)}">${esc(l.text)}</p>
        <div class="letter-foot">${badge}
          <button type="button" class="btn-link" data-act="jrOpen" data-id="${esc(l.id)}" aria-expanded="${open}" aria-controls="jr-lt-${esc(l.id)}">${open ? 'Thu gọn' : 'Đọc hết'}</button>
        </div></div>`;
    }).join('');
    return `<li class="jr-item jr-tg" id="jr-${e.type}-${esc(e.day)}" tabindex="-1">
      <p class="jr-line"><span class="jr-dot" aria-hidden="true"></span><time datetime="${esc(e.day)}">${esc(fmtDM(e.day))}</time> · ${esc(head)}</p>
      ${lts}${del}</li>`;
  }
  function timelineHtml(list) {
    if (!list.length) return '';
    const groups = [];
    for (const e of list) {
      const g = groupKey(e.day);
      let last = groups[groups.length - 1];
      if (!last || last.key !== g.key) { last = Object.assign({ items: [] }, g); groups.push(last); }
      last.items.push(e);
    }
    const rail = groups.length > 1 ? `<nav class="jr-rail" aria-label="Nhảy nhanh tới tuần"><div class="jr-rail-in">
      ${groups.slice().reverse().map(g => `<button type="button" class="chip" data-act="jrJump" data-key="${esc(g.key)}">${esc(g.chip)}</button>`).join('')}</div></nav>` : '';
    const noEdd = !edd() ? '<p class="fine"><button type="button" class="btn-link" data-go="due_date">Thêm ngày dự sinh để xem theo tuần ›</button></p>' : '';
    return rail + noEdd + groups.map(g => `<h3 class="jr-group" id="jr-g-${esc(g.key)}" tabindex="-1">${esc(g.label)}</h3>
      <ol class="jr-list">${g.items.map(entryHtml).join('')}</ol>`).join('');
  }

  /* ===== J01 ===== */
  function render() {
    const s = st();
    const m = api.mode();
    const all = entries();
    const hasKick = sessions().length > 0;
    const list = all.filter(e => s.filter === 'all' || (s.filter === 'tg' ? e.type === 'tg' : e.type === 'kick'));
    const src = m === 'account' ? '<p class="fine">☁️ Đang xem từ tài khoản của chị.</p>'
      : m === 'local' ? '<p class="fine">Chỉ có trên máy này.</p>'
        : '<p class="fine">Chị đang không lưu trên máy, nên mình chưa vẽ được các ngày trước.</p>';
    if (!all.length) {
      return `<section class="card jr">
        <h1>Hành trình mang thai 🗺️</h1>
        <p>Những lời mẹ kể và những bước chân của con, giữ lại cho hai mẹ con.</p>
        ${src}
        <div class="lt-empty">${JAR}<p>Hành trình còn trống. Hôm nay mẹ kể với con một điều nhỏ, hoặc đếm cử động thai sau bữa ăn nhé.</p>
          <button type="button" class="btn btn-primary btn-block" data-go="thaigiao">💌 Thai giáo hôm nay ›</button></div>
      </section>`;
    }
    const chip = (v, t) => `<button type="button" class="chip" data-act="jrFilter" data-filter="${v}" aria-pressed="${s.filter === v}">${t}</button>`;
    return `<section class="card jr">
      <h1>Hành trình mang thai 🗺️</h1>
      <p>Những lời mẹ kể và những bước chân của con, giữ lại cho hai mẹ con.</p>
      ${src}
      <div class="chips" role="group" aria-label="Xem">${chip('all', 'Tất cả')}${chip('tg', '💌 Thai giáo')}${chip('kick', '👣 Bước chân')}</div>
      <div class="jr-cols">
        ${s.filter !== 'tg' ? `<div class="jr-col-map"><h2>Bản đồ bước chân</h2>${hasKick ? mapHtml(s.range) : '<p>Chưa có dấu chân nào. Lượt đếm tới, chị chạm đúng chỗ con đạp nhé.</p>'}</div>` : ''}
        <div class="jr-col-tl"><h2>Dòng thời gian</h2>
          ${list.length ? timelineHtml(list) : '<p>Chưa có mốc nào ở mục này.</p>'}
        </div>
      </div>
      <div class="stack jr-foot">
        <button type="button" class="btn btn-secondary btn-block" data-act="jrTxt">Tải hành trình về máy (.txt)</button>
        <button type="button" class="btn btn-urgent-text btn-block" data-act="jrClearAsk">Xóa cả hành trình</button>
      </div>
    </section>`;
  }

  /* ===== Xóa ===== */
  function confirmTwice(btn, label2, fn) {
    if (typeof api.confirmTwice === 'function') return api.confirmTwice(btn, { label2, ms: 4000 }, fn);
    if (btn.dataset.armed === '1') { btn.dataset.armed = ''; fn(); return; }
    const old = btn.textContent;
    btn.dataset.armed = '1'; btn.textContent = label2; btn.classList.add('is-armed');
    api.lifecycle.later(() => { if (btn.isConnected && btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.textContent = old; btn.classList.remove('is-armed'); } }, 4000);
  }
  // Mốc thai giáo: xóa lời nhắn + mốc "đã làm" của ngày đó. Mốc đếm: xóa các lượt đếm của ngày đó (kể cả vị trí chạm).
  // Không đụng lượt đang đếm dở (lstp_kick_active), thói quen, check-in.
  function removeDay(type, day) {
    const call = (fn) => { try { const r = fn(); return r && typeof r.then === 'function' ? r : Promise.resolve(r); } catch (e) { return Promise.reject(e); } };
    const jobs = [];
    if (type === 'tg') {
      for (const l of letters()) if (l.day === day) jobs.push(call(() => S().letters.remove(l.id)));
      for (const m of marks()) if (m.day === day) jobs.push(call(() => S().thaigiao.remove(m.id)));
    } else {
      for (const s of sessions()) if (s.day === day) jobs.push(call(() => S().kick.remove(s.id)));
    }
    return Promise.all(jobs.map(j => j.then(r => r !== false, () => false))).then(r => r.every(Boolean));
  }
  function clearAll() {
    const days = new Set();
    const jobs = [];
    for (const l of letters()) days.add('tg|' + l.day);
    for (const m of marks()) days.add('tg|' + m.day);
    for (const s of sessions()) days.add('kick|' + s.day);
    for (const k of days) { const [t, d] = k.split('|'); jobs.push(removeDay(t, d)); }
    return Promise.all(jobs).then(r => r.every(Boolean));
  }

  /* ===== Hộp L15 (alertdialog, bẫy focus, Esc đóng, trả focus): dùng api.dialog của lõi nếu có ===== */
  function askClear() {
    const acct = api.mode() === 'account';
    const body = `<p>Mọi lời nhắn, mốc thai giáo và bước chân của con sẽ mất trên máy này${acct ? ' và trên tài khoản' : ''}, không lấy lại được.</p>`;
    if (typeof api.dialog === 'function') {
      return api.dialog({
        title: 'Xóa cả hành trình mang thai?', body,
        actions: [{ label: 'Mình hiểu, xóa cả hành trình', value: 'yes', kind: 'btn-urgent' }, { label: 'Thôi, giữ lại', value: 'no', kind: 'btn-secondary' }],
        defaultFocus: 1
      });
    }
    return Promise.resolve(null);   // không có hộp thoại thì không xóa
  }

  /* ===== Tải hành trình (.txt) ===== */
  function journeyTxt() {
    const lines = ['Hành trình mang thai – Mẹ Bầu An Yên', 'Tải về ngày ' + fmtDMY(today()), ''];
    for (const e of entries()) {
      if (e.type === 'tg') {
        const names = [...new Set(e.marks.filter(m => m.how === 'done').map(m => promptName(m.prompt)).filter(Boolean))];
        lines.push(fmtDMY(e.day) + ' · ' + (names.length ? 'Mẹ đã làm: ' + names.join(', ') : 'Lời mẹ kể'));
        for (const l of e.letters) {
          const pt = l.prompt ? promptText(l.prompt) : '';
          if (pt) lines.push('  Lời nhắc hôm ấy: ' + pt);
          lines.push('  ' + l.text.replace(/\n/g, '\n  '));
        }
      } else {
        const steps = e.sessions.reduce((n, x) => n + x.taps.length, 0);
        lines.push(fmtDMY(e.day) + ' · ' + e.sessions.length + ' lượt đếm · ' + steps + ' bước chân');
      }
      lines.push('');
    }
    return '﻿' + lines.join('\n');
  }
  function download(name, mime, text) {
    if (typeof api.download === 'function') return api.download(name, mime, text);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function mount() {
    const s = st();
    const focus = sel => { const el = document.querySelector('#main ' + sel); if (el) el.focus(); };
    api.screenActions({
      jrFilter: el => { s.filter = el.dataset.filter; api.rerender(); focus('[data-act=jrFilter][data-filter="' + s.filter + '"]'); },
      jrRange: el => { s.range = el.dataset.range; api.rerender(); focus('[data-act=jrRange][data-range="' + s.range + '"]'); },
      jrTable: () => { s.table = !s.table; api.rerender(); focus('[data-act=jrTable]'); },
      jrOpen: el => { s.open[el.dataset.id] = !s.open[el.dataset.id]; api.rerender(); focus('[data-act=jrOpen][data-id="' + CSS.escape(el.dataset.id) + '"]'); },
      jrJump: el => {
        const h = document.querySelector('#main #jr-g-' + CSS.escape(el.dataset.key));
        if (h) { h.scrollIntoView({ block: 'start', behavior: api.reduceMotion() ? 'auto' : 'smooth' }); h.focus({ preventScroll: true }); }
      },
      jrDel: el => {
        const type = el.dataset.type, day = el.dataset.day, cloud = el.dataset.cloud === 'cloud';
        confirmTwice(el, cloud ? 'Bấm lần nữa để xóa, cả trên tài khoản' : 'Bấm lần nữa để xóa', () => {
          removeDay(type, day).then(ok => {
            api.toast(ok ? (type === 'tg' ? (cloud ? 'Đã xóa lời nhắn, cả trên tài khoản.' : 'Đã xóa mốc thai giáo ngày ' + fmtDM(day) + '.') : 'Đã xóa lượt đếm ngày ' + fmtDM(day) + '.')
              : 'Mình chưa xóa được trên tài khoản. Chị thử lại khi có mạng nhé.');
            if (document.querySelector('#main[data-screen=journey]')) { api.rerender(); focus('h1'); }
          });
        });
      },
      jrTxt: () => { download('hanh-trinh-mang-thai-' + today().replace(/-/g, '') + '.txt', 'text/plain;charset=utf-8', journeyTxt()); api.toast('Đã tải hành trình về máy.'); },
      jrClearAsk: () => {
        askClear().then(v => {
          if (v !== 'yes') return;
          clearAll().then(ok => {
            api.toast(ok ? 'Đã xóa hành trình.' : 'Mình chưa xóa được trên tài khoản. Chị thử lại khi có mạng nhé.');
            if (document.querySelector('#main[data-screen=journey]')) { api.rerender(); focus('h1'); }
          });
        });
      }
    });
  }

  const JAR = `<svg class="lt-jar" viewBox="0 0 120 120" width="96" height="96" aria-hidden="true" focusable="false">
    <rect x="34" y="18" width="52" height="12" rx="5" fill="var(--rose-300)"/>
    <path d="M30 34 Q30 30 36 30 H84 Q90 30 90 34 V96 Q90 108 78 108 H42 Q30 108 30 96 Z" fill="var(--rose-50)" stroke="var(--line-strong)" stroke-width="2.5"/>
    <text x="60" y="80" text-anchor="middle" font-size="26">👣</text>
  </svg>`;

  (window.LSTP_MODULES = window.LSTP_MODULES || []).push({
    name: 'journey',
    screens(a) { api = a; return { journey: { title: 'Hành trình', needs: 'mode', dayLive: true, render, mount } }; },
    init(a) { api = a; },   // S.kick do FE-1/FE-4 lo; chưa có thì sessions() trả rỗng (safe), không tự vá store
    onModeChange() { if (api) api.state.journey = null; },
    homeTiles: () => [{ go: 'journey', icon: '🗺️', label: 'Hành trình mang thai', sub: 'Những lời mẹ kể và bước chân con', order: 60 }]
  });
})();
