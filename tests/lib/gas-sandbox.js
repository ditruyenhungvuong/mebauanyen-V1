/* =========================================================
   Giả lập Google Apps Script cho Mẹ Bầu An Yên (chủ: backend-dev, T-B1).
   Nạp CHÍNH file google_apps_script.js vào vm với các dịch vụ giả, để test-gas.js,
   tools/mock-api.js (và e2e qua mock) chạy đúng một contract với Apps Script thật.
   KHÔNG gọi mạng, KHÔNG ghi file.

   Giả lập:
   - SpreadsheetApp: nhiều file (getActiveSpreadsheet = "MBAY – Dữ liệu", create, openById), tab, Range
     (getValues/setValues/setNumberFormat(s)/TextFinder…), deleteRows, hideColumns, protect, getUi (prompt/alert/menu).
     Ghi ô giống Sheets: chuỗi bắt đầu bằng ' → văn bản (bỏ dấu '), ô không định dạng @ thì chuỗi số → số,
     'YYYY-MM-DD' → Date; chuỗi bắt đầu = + - @ tab CR mà không có ' → ghi vào env.formulaWrites (lỗi chèn công thức).
   - Utilities: computeDigest (byte CÓ DẤU −128…127 như Java; nhận chuỗi hoặc Byte[]),
     computeHmacSha256Signature, getUuid, formatDate (múi Asia/Ho_Chi_Minh +7), sleep (không chờ thật).
   - CacheService (hạn theo đồng hồ giả), LockService (một người giữ; lồng nhau → hết giờ như thật),
     PropertiesService, ContentService, Logger, console (ghi vào env.logs).
   - Đồng hồ: 'manual' (test tua giờ) hoặc 'real' (mock; tua bằng advance).
   - hooks.onDigest(info): test dùng để chạy lời gọi "song song" chen giữa lúc đang băm (S-03).

   Dùng:
     const { createGas } = require('./lib/gas-sandbox');
     const env = createGas({ clock: 'manual', consts: { PIN_HASH_ITER: 20 } });
     env.setup(); const r = env.post({ action: 'ping' });
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const APP_DIR = path.resolve(__dirname, '..', '..');
const DEFAULT_SRC = path.join(APP_DIR, 'google_apps_script.js');
const DEFAULT_START = Date.UTC(2026, 9, 29, 3, 0, 0);   // 10:00 giờ Việt Nam, 29/10/2026

function createGas(opts) {
  const o = opts || {};
  const src = o.source || fs.readFileSync(o.srcPath || DEFAULT_SRC, 'utf8');

  /* ===== Đồng hồ ===== */
  const clock = {
    manual: (o.clock || 'manual') === 'manual',
    t: o.now || DEFAULT_START,
    offset: 0,
    now() { return this.manual ? this.t : Date.now() + this.offset; },
    advance(ms) { if (this.manual) this.t += ms; else this.offset += ms; },
    set(ms) { if (this.manual) this.t = ms; else this.offset = ms - Date.now(); }
  };
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(clock.now()); else super(...a); }
    static now() { return clock.now(); }
  }

  const env = {
    clock, logs: [], formulaWrites: [], alerts: [], menus: [],
    ui: { responses: [] },
    hooks: {},
    stats: { digest: 0, digestInLock: 0, sleeps: [], sheetReads: 0, sheetWrites: 0 },
    lock: { held: false, waits: 0, fails: 0, plan: [], failAlways: false, failRate: 0, maxDepthTried: 0 },
    files: {}, props: {}, cache: {}
  };

  /* ===== Sheet ===== */
  let fileSeq = 0;
  function cellDisplay(v) {
    if (v instanceof RealDate) return v.toISOString().slice(0, 10);
    return v == null ? '' : String(v);
  }
  function makeSheet(file, name) {
    const sh = { _name: name, _file: file, rows: [], colFmt: {}, hidden: new Set(), frozen: 0, protections: [], deleted: false, maxRows: 1000, maxCols: 26 };
    const rowObj = r => { while (sh.rows.length < r) sh.rows.push({ v: [], f: [], forced: [] }); return sh.rows[r - 1]; };
    sh.fmtAt = (r, c) => { const row = sh.rows[r - 1]; return (row && row.f[c - 1]) || sh.colFmt[c] || ''; };
    sh.writeCell = (r, c, val) => {
      if (val === undefined) throw new Error('setValues: giá trị undefined ở ' + name + ' ' + r + ',' + c);
      if (typeof val === 'number' && !isFinite(val)) throw new Error('setValues: số không hữu hạn ở ' + name);
      let v = val, forced = false;
      if (typeof v === 'string') {
        if (v.charAt(0) === "'") { v = v.slice(1); forced = true; }
        else {
          if (/^[=+\-@\t\r]/.test(v)) env.formulaWrites.push({ file: file._name, sheet: name, r, c, v });
          if (sh.fmtAt(r, c) !== '@') {
            if (/^[+-]?\d+(\.\d+)?$/.test(v) && v.length < 16) v = Number(v);
            else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v = new FakeDate(v + 'T00:00:00Z');
          }
        }
      }
      const row = rowObj(r);
      row.v[c - 1] = v; row.forced[c - 1] = forced;
      env.stats.sheetWrites++;
    };
    sh.readCell = (r, c) => { const row = sh.rows[r - 1]; const v = row ? row.v[c - 1] : undefined; return v == null ? '' : v; };
    const nonEmpty = row => row && row.v.some(x => x !== '' && x != null);
    sh.getName = () => name;
    sh.setName = n => { delete file.sheets[name]; name = n; sh._name = n; file.sheets[n] = sh; return sh; };
    sh.getLastRow = () => { for (let i = sh.rows.length; i >= 1; i--) if (nonEmpty(sh.rows[i - 1])) return i; return 0; };
    sh.getLastColumn = () => { let m = 0; sh.rows.forEach(row => row.v.forEach((x, j) => { if (x !== '' && x != null) m = Math.max(m, j + 1); })); return m; };
    sh.getMaxRows = () => sh.maxRows;
    sh.getMaxColumns = () => sh.maxCols;
    sh.appendRow = vals => { const r = sh.getLastRow() + 1; if (r > sh.maxRows) sh.maxRows = r; vals.forEach((x, j) => sh.writeCell(r, j + 1, x)); return sh; };
    sh.insertRowsAfter = (after, n) => { if (!(after >= 1 && after <= sh.maxRows && n >= 1)) throw new Error('insertRowsAfter: tham số sai'); sh.maxRows += n; const at = after; if (at < sh.rows.length) sh.rows.splice(at, 0, ...Array.from({ length: n }, () => ({ v: [], f: [], forced: [] }))); return sh; };
    sh.deleteColumns = (c, n) => {
      if (!(c >= 1 && n >= 1 && c + n - 1 <= sh.maxCols)) throw new Error('deleteColumns: ngoài lưới');
      if (n >= sh.maxCols) throw new Error('deleteColumns: không xóa hết cột được');
      sh.rows.forEach(row => { row.v.splice(c - 1, n); row.f.splice(c - 1, n); row.forced.splice(c - 1, n); });
      sh.maxCols -= n; return sh;
    };
    sh.deleteRow = r => sh.deleteRows(r, 1);
    sh.deleteRows = (r, n) => {
      if (!(r >= 1) || !(n >= 1) || r + n - 1 > sh.maxRows) throw new Error('deleteRows: tham số sai / ngoài lưới');
      // Như Sheets thật: "không thể xóa tất cả các hàng không được cố định"
      if (r <= sh.frozen + 1 && r + n - 1 >= sh.maxRows) throw new Error('Sorry, it is not possible to delete all non-frozen rows.');
      sh.maxRows -= n;
      if (r - 1 < sh.rows.length) sh.rows.splice(r - 1, n);
      env.stats.sheetWrites++;
      return sh;
    };
    sh.setFrozenRows = n => { sh.frozen = n; return sh; };
    sh.getFrozenRows = () => sh.frozen;
    sh.hideColumns = (c, n) => { for (let i = 0; i < (n || 1); i++) sh.hidden.add(c + i); return sh; };
    sh.isColumnHiddenByUser = c => sh.hidden.has(c);
    sh.setColumnWidth = () => sh;
    sh.protect = () => {
      const p = { desc: '', warning: false, setDescription(d) { this.desc = d; return this; }, getDescription() { return this.desc; },
                  setWarningOnly(w) { this.warning = !!w; return this; }, isWarningOnly() { return this.warning; } };
      sh.protections.push(p); return p;
    };
    sh.getProtections = () => sh.protections.slice();
    sh.getRange = (r, c, nr, nc) => makeRange(sh, r, c, nr || 1, nc || 1);
    sh.getDataRange = () => makeRange(sh, 1, 1, Math.max(1, sh.getLastRow()), Math.max(1, sh.getLastColumn()));
    sh.getParent = () => file;
    /* Dữ liệu thô (không qua API, cho test) */
    sh.values = () => { const n = sh.getLastRow(); const out = []; for (let i = 1; i <= n; i++) { const row = sh.rows[i - 1]; out.push(row.v.map(x => (x == null ? '' : x))); } return out; };
    sh.forcedAt = (r, c) => !!(sh.rows[r - 1] && sh.rows[r - 1].forced[c - 1]);
    return sh;
  }
  function makeRange(sh, r, c, nr, nc) {
    if (!(r >= 1 && c >= 1 && nr >= 1 && nc >= 1)) throw new Error('getRange: tham số sai ' + [r, c, nr, nc].join(','));
    // Như Sheets thật: vùng ngoài lưới → "The coordinates of the range are outside the dimensions of the sheet."
    if (r + nr - 1 > sh.maxRows || c + nc - 1 > sh.maxCols) throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    const rg = {
      getRow: () => r, getColumn: () => c, getNumRows: () => nr, getNumColumns: () => nc, getLastRow: () => r + nr - 1,
      getValues() { env.stats.sheetReads++; const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(sh.readCell(r + i, c + j)); out.push(row); } return out; },
      getValue() { env.stats.sheetReads++; return sh.readCell(r, c); },
      getDisplayValues() { return rg.getValues().map(row => row.map(cellDisplay)); },
      setValues(vals) {
        if (!Array.isArray(vals) || vals.length !== nr || vals.some(row => !Array.isArray(row) || row.length !== nc)) {
          throw new Error('setValues: kích thước không khớp vùng ' + nr + 'x' + nc);
        }
        vals.forEach((row, i) => row.forEach((x, j) => sh.writeCell(r + i, c + j, x)));
        return rg;
      },
      setValue(x) { sh.writeCell(r, c, x); return rg; },
      setNumberFormat(f) {
        if (nr >= 500) { for (let j = 0; j < nc; j++) sh.colFmt[c + j] = f; }
        else for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const row = (() => { while (sh.rows.length < r + i) sh.rows.push({ v: [], f: [], forced: [] }); return sh.rows[r + i - 1]; })(); row.f[c + j - 1] = f; }
        return rg;
      },
      setNumberFormats(fm) {
        if (!Array.isArray(fm) || fm.length !== nr || fm.some(row => row.length !== nc)) throw new Error('setNumberFormats: kích thước không khớp');
        fm.forEach((row, i) => row.forEach((f, j) => { while (sh.rows.length < r + i) sh.rows.push({ v: [], f: [], forced: [] }); sh.rows[r + i - 1].f[c + j - 1] = f; }));
        return rg;
      },
      getNumberFormat: () => sh.fmtAt(r, c),
      setFontWeight: () => rg, setBackground: () => rg, setFontColor: () => rg, setWrap: () => rg, setHorizontalAlignment: () => rg,
      clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sh.writeCell(r + i, c + j, ''); return rg; },
      createTextFinder(text) {
        const tf = { entire: false, kase: false };
        tf.matchEntireCell = b => { tf.entire = !!b; return tf; };
        tf.matchCase = b => { tf.kase = !!b; return tf; };
        tf.useRegularExpression = () => { throw new Error('sandbox: không hỗ trợ regex'); };
        tf.findAll = () => {
          env.stats.sheetReads++;
          const want = tf.kase ? String(text) : String(text).toLowerCase();
          const out = [];
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
            let s = cellDisplay(sh.readCell(r + i, c + j));
            if (!tf.kase) s = s.toLowerCase();
            if (tf.entire ? s === want : (want && s.indexOf(want) >= 0)) out.push(makeRange(sh, r + i, c + j, 1, 1));
          }
          // Test chen một lần chạy song song NGAY SAU khi tìm, trước khi đọc dòng (mô phỏng tranh chấp ngoài lock)
          if (env.hooks.afterFind && !env.hooks._inFind) {
            env.hooks._inFind = true;
            try { env.hooks.afterFind({ sheet: sh._name, text: String(text), count: out.length, inLock: env.lock.held }); }
            finally { env.hooks._inFind = false; }
          }
          return out;
        };
        tf.findNext = () => tf.findAll()[0] || null;
        return tf;
      }
    };
    return rg;
  }
  function makeFile(name, id) {
    const file = { _name: name, _id: id || ('file' + (++fileSeq) + crypto.randomBytes(6).toString('hex')), sheets: {}, order: [] };
    file.getId = () => file._id;
    file.getName = () => file._name;
    file.getUrl = () => 'https://docs.google.com/spreadsheets/d/' + file._id + '/edit';
    file.getSheetByName = n => (file.sheets[n] && !file.sheets[n].deleted ? file.sheets[n] : null);
    file.insertSheet = n => {
      if (file.sheets[n]) throw new Error('insertSheet: tab đã có ' + n);
      const sh = makeSheet(file, n); file.sheets[n] = sh; file.order.push(sh); return sh;
    };
    file.getSheets = () => file.order.filter(s => !s.deleted);
    file.deleteSheet = sh => { sh.deleted = true; delete file.sheets[sh._name]; file.order = file.order.filter(x => x !== sh); };
    file.toast = () => {};
    env.files[file._id] = file;
    return file;
  }
  const dataFile = makeFile('MBAY – Dữ liệu', 'datafile');
  dataFile.insertSheet('Trang tính1');

  /* ===== Dịch vụ giả ===== */
  const toBytes = v => {
    if (typeof v === 'string') return Buffer.from(v, 'utf8');
    if (Array.isArray(v)) { if (v.some(b => !Number.isInteger(b) || b < -128 || b > 255)) throw new Error('Byte[] sai'); return Buffer.from(v.map(b => b & 255)); }
    throw new Error('computeDigest: giá trị phải là chuỗi hoặc Byte[]');
  };
  const signed = buf => Array.from(buf, b => (b > 127 ? b - 256 : b));
  const ALG = { SHA_256: 'sha256', SHA_1: 'sha1', MD5: 'md5', SHA_512: 'sha512' };
  const pad = n => ('0' + n).slice(-2);
  const Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256', SHA_1: 'SHA_1', MD5: 'MD5', SHA_512: 'SHA_512' },
    Charset: { UTF_8: 'UTF_8', US_ASCII: 'US_ASCII' },
    computeDigest(alg, value, charset) {
      if (!ALG[alg]) throw new Error('computeDigest: thuật toán lạ');
      env.stats.digest++;
      if (env.lock.held) env.stats.digestInLock++;
      if (env.hooks.onDigest && !env.hooks._inHook) {
        env.hooks._inHook = true;
        try { env.hooks.onDigest({ inLock: env.lock.held, bytes: Array.isArray(value), n: env.stats.digest }); }
        finally { env.hooks._inHook = false; }
      }
      return signed(crypto.createHash(ALG[alg]).update(toBytes(value)).digest());
    },
    computeHmacSha256Signature(value, key) {
      return signed(crypto.createHmac('sha256', toBytes(key)).update(toBytes(value)).digest());
    },
    getUuid: () => crypto.randomUUID(),
    formatDate(date, tz, fmt) {
      const off = tz === 'Asia/Ho_Chi_Minh' || tz === 'Asia/Bangkok' || tz === 'GMT+7' ? 7 : (tz === 'UTC' || tz === 'GMT' ? 0 : null);
      if (off === null) throw new Error('sandbox formatDate: múi giờ chưa hỗ trợ ' + tz);
      const d = new RealDate(date.getTime() + off * 3600000);
      return fmt.replace(/yyyy|MM|dd|HH|mm|ss/g, t => ({
        yyyy: String(d.getUTCFullYear()), MM: pad(d.getUTCMonth() + 1), dd: pad(d.getUTCDate()),
        HH: pad(d.getUTCHours()), mm: pad(d.getUTCMinutes()), ss: pad(d.getUTCSeconds())
      })[t]);
    },
    sleep(ms) { env.stats.sleeps.push(ms); if (clock.manual) clock.advance(ms); },
    base64Encode: s => Buffer.from(typeof s === 'string' ? s : s.map(b => b & 255)).toString('base64')
  };
  const cacheObj = {
    get(k) { const e = env.cache[k]; if (!e) return null; if (e.exp <= clock.now()) { delete env.cache[k]; return null; } return e.v; },
    put(k, v, ttl) { if (typeof v !== 'string') throw new Error('cache.put: phải là chuỗi'); env.cache[k] = { v, exp: clock.now() + Math.min(ttl || 600, 21600) * 1000 }; },
    remove(k) { delete env.cache[k]; },
    removeAll(keys) { keys.forEach(k => delete env.cache[k]); },
    getAll(keys) { const out = {}; keys.forEach(k => { const v = cacheObj.get(k); if (v !== null) out[k] = v; }); return out; }
  };
  const CacheService = { getScriptCache: () => cacheObj, getUserCache: () => cacheObj, getDocumentCache: () => cacheObj };
  const LockService = {
    getScriptLock() {
      let mine = false;
      return {
        waitLock() {
          const L = env.lock;
          const planned = L.plan.length ? L.plan.shift() : false;
          if (L.failAlways || planned || (L.failRate && Math.random() < L.failRate) || L.held) {
            L.fails++; throw new Error('Lock timeout: another process was holding the lock for too long.');
          }
          L.waits++; L.held = true; mine = true;
        },
        tryLock() { try { this.waitLock(); return true; } catch (e) { return false; } },
        releaseLock() { if (mine) { env.lock.held = false; mine = false; } },
        hasLock: () => mine
      };
    }
  };
  LockService.getDocumentLock = LockService.getScriptLock;
  const propStore = env.props;
  const scriptProps = {
    getProperty: k => (Object.prototype.hasOwnProperty.call(propStore, k) ? propStore[k] : null),
    setProperty(k, v) { propStore[k] = String(v); return scriptProps; },
    deleteProperty(k) { delete propStore[k]; return scriptProps; },
    getProperties: () => Object.assign({}, propStore),
    setProperties(obj) { Object.assign(propStore, obj); return scriptProps; }
  };
  const PropertiesService = { getScriptProperties: () => scriptProps };
  const ContentService = {
    MimeType: { JSON: 'application/json', JAVASCRIPT: 'application/javascript', TEXT: 'text/plain' },
    createTextOutput(t) {
      const out = { text: String(t), mime: 'text/plain' };
      out.setMimeType = m => { out.mime = m; return out; };
      out.getMimeType = () => out.mime;
      out.getContent = () => out.text;
      return out;
    }
  };
  const ui = {
    Button: { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO', CLOSE: 'CLOSE' },
    ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO' },
    createMenu(name) { const m = { name, items: [] }; const api = { addItem(l, fn) { m.items.push({ label: l, fn }); return api; }, addSeparator() { return api; }, addToUi() { env.menus.push(m); } }; return api; },
    prompt(title, msg) { const r = env.ui.responses.shift() || { button: 'CANCEL', text: '' }; env.alerts.push({ kind: 'prompt', title, msg }); return { getSelectedButton: () => r.button, getResponseText: () => r.text }; },
    alert(title, msg) { env.alerts.push({ kind: 'alert', title: String(title), msg: msg === undefined ? '' : String(msg) }); return 'OK'; }
  };
  const SpreadsheetApp = {
    getActiveSpreadsheet: () => dataFile,
    getActive: () => dataFile,
    openById(id) { const f = env.files[id]; if (!f || f === dataFile && o.denyDataOpen) throw new Error('Không tìm thấy bảng tính'); return f; },
    create(name) { return makeFile(name); },
    getUi: () => ui,
    ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' },
    flush() {}
  };
  const triggers = [];
  const ScriptApp = {
    getProjectTriggers: () => triggers.slice(),
    newTrigger(fn) {
      const t = { fn, kind: null, getHandlerFunction: () => fn };
      const b = { timeBased() { t.kind = 'time'; return b; }, everyDays(n) { t.days = n; return b; }, everyHours(n) { t.hours = n; return b; }, atHour(h) { t.hour = h; return b; },
                  create() { if (env.denyTriggers) throw new Error('Không có quyền tạo trình kích hoạt'); triggers.push(t); return t; } };
      return b;
    },
    deleteTrigger(t) { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
  };
  env.triggers = triggers;
  const logFn = (...a) => { env.logs.push(a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
  const sandbox = {
    SpreadsheetApp, Utilities, CacheService, LockService, PropertiesService, ContentService, ScriptApp,
    Logger: { log: logFn },
    console: { log: logFn, info: logFn, warn: logFn, error: logFn },
    Date: FakeDate, Math, JSON, String, Number, Array, Object, Error, RegExp, isFinite, parseInt, parseFloat
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'google_apps_script.js' });
  if (o.consts) for (const k of Object.keys(o.consts)) {
    if (!(k in sandbox)) throw new Error('consts: không có hằng ' + k);
    sandbox[k] = o.consts[k];
  }

  /* ===== API cho test / mock ===== */
  env.ctx = sandbox;
  env.dataFile = dataFile;
  env.privFile = () => env.files[propStore.PRIVATE_SHEET_ID] || null;
  env.postRaw = contents => sandbox.doPost(contents === undefined ? {} : { postData: { contents, type: 'text/plain', length: String(contents).length }, parameter: {} });
  env.post = body => {
    const out = env.postRaw(typeof body === 'string' ? body : JSON.stringify(body));
    env.lastMime = out.getMimeType();
    return JSON.parse(out.getContent());
  };
  env.get = params => { const out = sandbox.doGet({ parameter: params || {}, parameters: {} }); env.lastMime = out.getMimeType(); return JSON.parse(out.getContent()); };
  env.setup = () => sandbox.setup_();
  env.resetPin = phone => sandbox.resetPinFor_(phone);
  env.advance = ms => clock.advance(ms);
  env.sheet = (name, which) => (which === 'priv' ? (env.privFile() && env.privFile().getSheetByName(name)) : dataFile.getSheetByName(name));
  /* Mọi dòng dữ liệu (bỏ tiêu đề) của một tab */
  env.rows = (name, which) => { const sh = env.sheet(name, which); return sh ? sh.values().slice(1) : []; };
  /* Mọi ô của mọi tab ở mọi file: [{file, sheet, r, c, v}] */
  env.allCells = () => {
    const out = [];
    Object.values(env.files).forEach(f => f.getSheets().forEach(sh => sh.values().forEach((row, i) => row.forEach((v, j) => {
      if (v !== '' && v != null) out.push({ file: f._name, sheet: sh._name, r: i + 1, c: j + 1, v });
    }))));
    return out;
  };
  env.dump = () => {
    const out = { props: Object.keys(propStore), files: {} };
    Object.values(env.files).forEach(f => { out.files[f._name] = {}; f.getSheets().forEach(sh => { out.files[f._name][sh._name] = sh.values(); }); });
    return out;
  };
  return env;
}

module.exports = { createGas, DEFAULT_SRC, DEFAULT_START };
