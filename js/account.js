/* =========================================================
   Mẹ Bầu An Yên – js/account.js
   Chủ: FE-6 Tài khoản
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 12.4; ADR 0005
   Việc: (Bước B) Màn: login (A04), register (A05), consent_account (A06), forgot_pin (A07), reset_pin (A08), lớp L10/L11. headerMenu: Đăng xuất. dataSections: tài khoản, đồng ý gửi chữ, xóa tài khoản. Stub ở Bước A.
   STUB của T-00 (architect): chưa có logic. Chỉ chủ file sửa file này.
   ========================================================= */
(() => {
  'use strict';
  if (!window.LSTP_CONFIG.ACCOUNT_ENABLED) return; // Bước A: không đăng ký màn nào
  (window.LSTP_MODULES = window.LSTP_MODULES || []).push({
    name: 'account',
    screens: () => ({})
  });
})();
