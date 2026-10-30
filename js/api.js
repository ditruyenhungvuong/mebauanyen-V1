/* =========================================================
   Mẹ Bầu An Yên – js/api.js · window.LSTP_API
   Chủ: backend-dev (T-B1)
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 12.2; docs/adr/0005-lstp-apps-script-tai-khoan-sdt-pin.md mục 5
   Client mỏng gọi Apps Script (hoặc tools/mock-api.js khi MOCK):
   - POST, header DUY NHẤT 'Content-Type: text/plain;charset=utf-8' (không preflight), redirect 'follow'
     (Apps Script trả 302 sang script.googleusercontent.com), credentials 'omit', cache 'no-store', có timeout.
   - Token chỉ nằm trong THÂN request, không bao giờ trên URL. Không console.log thân hay phản hồi (AC-83).
   - Mọi hàm trả Promise LUÔN resolve: thân JSON của server {result:'success'|'error', …}, hoặc
     {result:'error', error:'network'|'timeout'|'bad_response'|'no_url'} do client tự đặt.
   - ACCOUNT_ENABLED = false (Bước A) → mọi hàm trả 'no_url', KHÔNG có lời gọi mạng nào (S-13).
   - URL chỉ nhận https://script.google.com/macros/s/…/exec (hoặc dạng Google Workspace
     https://script.google.com/a/macros/<miền>/s/…/exec), hoặc 127.0.0.1/localhost khi MOCK (không gửi
     PIN/token tới địa chỉ lạ dù config bị sửa nhầm).
   - Lỗi có thêm `reason` để account.js / người cài biết vì sao (không im lặng):
       no_url: 'disabled' (ACCOUNT_ENABLED tắt) | 'url_not_allowed' (URL sai dạng)
       bad_response: 'google_login' (nhận trang đăng nhập Google: triển khai chưa để "Bất kỳ ai",
                     hoặc Workspace chặn) | 'not_json'
     Lưu ý: nếu Google chuyển hướng sang trang đăng nhập KHÔNG có CORS thì trình duyệt chỉ báo 'network';
     cách kiểm chắc chắn là BƯỚC 8 trong google_apps_script.js (mở URL, curl ping).
   ========================================================= */
window.LSTP_API = (() => {
  'use strict';
  const C = window.LSTP_CONFIG || {};
  const API_V = '1';
  const LONG = { register: 1, login: 1, setPinAfterReset: 1 };
  const GAS_URL_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[a-z0-9.-]{1,100}|macros)\/s\/[A-Za-z0-9_-]{10,200}\/exec$/;
  const MOCK_URL_RE = /^http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?\/[A-Za-z0-9_\/.-]*$/;
  /* Mã lỗi nên thử lại sau (sync.js dùng): giữ hàng chờ, lùi dần */
  const TRANSIENT = { network: 1, timeout: 1, bad_response: 1, server_busy: 1, rate_limited: 1, server_not_ready: 1 };

  const fail = (code, reason) => (reason ? { result: 'error', error: code, reason } : { result: 'error', error: code });

  function endpoint() {
    if (!C.ACCOUNT_ENABLED) return '';
    if (C.MOCK) return typeof C.MOCK_URL === 'string' && MOCK_URL_RE.test(C.MOCK_URL) ? C.MOCK_URL : '';
    return typeof C.GOOGLE_SCRIPT_URL === 'string' && GAS_URL_RE.test(C.GOOGLE_SCRIPT_URL) ? C.GOOGLE_SCRIPT_URL : '';
  }
  const looksLikeGoogleLogin = (res, raw) => /accounts\.google\.com|ServiceLogin|signin/i.test(String((res && res.url) || '') + ' ' + String(raw).slice(0, 4000));

  /** Gọi một action. payload là object thường; bỏ trường undefined. Không ném lỗi. */
  async function call(action, payload) {
    const url = endpoint();
    if (!url) return fail('no_url', C.ACCOUNT_ENABLED ? 'url_not_allowed' : 'disabled');
    if (typeof fetch !== 'function') return fail('network');
    const body = Object.assign({}, payload || {}, { action, v: API_V });
    let text;
    try { text = JSON.stringify(body); } catch (e) { return fail('bad_response'); }
    const ms = LONG[action] ? (C.LOGIN_TIMEOUT_MS || 15000) : (C.API_TIMEOUT_MS || 10000);
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; if (ctrl) ctrl.abort(); }, ms);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: text,
        redirect: 'follow',
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: ctrl ? ctrl.signal : undefined
      });
      const raw = await res.text();
      if (timedOut) return fail('timeout');
      let data;
      try { data = JSON.parse(raw); } catch (e) { return fail('bad_response', looksLikeGoogleLogin(res, raw) ? 'google_login' : 'not_json'); }
      if (!data || typeof data !== 'object' || Array.isArray(data) || (data.result !== 'success' && data.result !== 'error')) return fail('bad_response');
      if (data.result === 'error' && typeof data.error !== 'string') return fail('bad_response');
      return data;
    } catch (e) {
      return fail(timedOut ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
  }

  const tok = t => (typeof t === 'string' ? t : '');

  return {
    /* tiện ích cho sync.js / account.js */
    configured: () => !!endpoint(),
    isTransient: res => !!(res && res.result === 'error' && TRANSIENT[res.error]),

    ping: () => call('ping', {}),
    register: ({ phone, pin, privateDevice, consent } = {}) => call('register', {
      phone, pin, privateDevice: privateDevice === true,
      consent: consent ? { sheet: consent.sheet === true, text: consent.text === true, version: consent.version } : undefined
    }),
    login: ({ phone, pin, privateDevice } = {}) => call('login', { phone, pin, privateDevice: privateDevice === true }),
    setPinAfterReset: ({ phone, code, pin, privateDevice } = {}) => call('setPinAfterReset', { phone, code, pin, privateDevice: privateDevice === true }),
    whoami: token => call('whoami', { token: tok(token) }),
    logout: token => call('logout', { token: tok(token) }),
    saveRecords: (token, records) => call('saveRecords', { token: tok(token), records }),
    listMine: (token, { kinds, sinceDay } = {}) => call('listMine', { token: tok(token), kinds, sinceDay }),
    exportMine: token => call('exportMine', { token: tok(token) }),
    deleteRecords: (token, items) => call('deleteRecords', { token: tok(token), items }),
    setConsent: (token, { text, deleteText } = {}) => call('setConsent', { token: tok(token), text, deleteText }),
    deleteAccount: token => call('deleteAccount', { token: tok(token), confirm: 'DELETE' })
  };
})();
