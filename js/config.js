/* =========================================================
   Mẹ Bầu An Yên – js/config.js (chủ: FE-1 Lõi; devops chỉ sửa GOOGLE_SCRIPT_URL / ACCOUNT_ENABLED lúc deploy)
   Cấu hình do đơn vị triển khai chỉnh. MỌI THỨ Ở ĐÂY LÀ CÔNG KHAI với trình duyệt:
   không đặt mật khẩu, khóa, pepper, token, số điện thoại nhân viên.
   Nguồn: docs/specs/lifestyle-thai-phu-tech-design.md mục 10.
   ========================================================= */
window.LSTP_CONFIG = {
  APP_NAME: 'Mẹ Bầu An Yên',
  VERSION: '0.1.0',
  PRIVACY_VERSION: '0.2',
  TZ_OFFSET_MIN: 420,                       // giờ Việt Nam cho "ngày" (thói quen, ô bữa, chuỗi ngày, tuần thai)
  ASSET_BASE: 'assets/',                    // ảnh capybara đã nén (K-9); ảnh lỗi → emoji
  ALLOW_DRAFT_CONTENT: true,                // false khi nội dung đã được anh/hội đồng duyệt

  /* ===== Tài khoản + Sheet (Bước B) ===== */
  ACCOUNT_ENABLED: false,                   // Bước A: false. Bật khi Apps Script đã cài và code-reviewer duyệt phần bảo mật
  GOOGLE_SCRIPT_URL: '',                    // 'https://script.google.com/macros/s/<ID>/exec' (công khai, không phải bí mật)
  MOCK: false,                              // true → gọi tools/mock-api.js; upload.sh/upload.bat và check-static --strict chặn đẩy khi true
  MOCK_URL: 'http://127.0.0.1:8790/exec',
  TEXT_SYNC_ENABLED: false,                 // ô đồng ý "Lưu lời nhắn của mình lên tài khoản" — chỉ bật khi app đã ở origin riêng (ADR 0006)
  API_TIMEOUT_MS: 10000,
  LOGIN_TIMEOUT_MS: 15000,
  AUTO_LOGOUT_MIN: 30,                      // không tick "máy riêng"
  SESSION_DAYS: 30,                         // chỉ để hiện chữ; server quyết hạn thật
  PENDING_MAX: 50,
  PENDING_DAYS: 7,
  SYNC_BATCH: 20,

  /* ===== Liên hệ — ĐỂ TRỐNG tới khi anh xác nhận bằng văn bản. Không tự bịa số. ===== */
  EMERGENCY_NUMBER: '115',
  EMERGENCY_OB:   { name: '', phone: '' },  // khoa cấp cứu sản (mức đỏ, trang khẩn chung)
  OB_CONTACT:     { name: '', phone: '' },  // cơ sở sản khoa (mức vàng của mục đếm)
  CLINIC_CONTACT: { name: '', phone: '' },  // phòng khám để chị gọi khi quên PIN
  SUPPORT_CHANNELS: [],                     // [{ name, detail, phone }]

  /* ===== Nhạc cùng con — anh bổ sung; nguồn + giấy phép ghi cả ở NGUON.md ===== */
  MUSIC_LINKS: [],                          // [{ title, url, kind: 'audio'|'youtube'|'link', source, license }]
  MUSIC_HOSTS: [],                          // hostname chính xác (vd 'example.org'). Thêm host .mp3 vào đây thì PHẢI thêm 'https://<host>' vào media-src của CSP trong index.html (check-static so hai chỗ)

  /* ===== Đếm cử động thai — ngưỡng anh Thông duyệt 29/10/2026; check-static báo lỗi nếu đổi ===== */
  KICK_HOUR_MIN: 60,                        // một giờ theo dõi (R-01)
  KICK_GREEN_MIN_PER_HOUR: 4,               // ≥ 4 là xanh; ≤ 3 là vàng ở giờ 1, đỏ ở giờ 2
  KICK_EXTRA_HOURS_MAX: 1,                  // theo dõi thêm tối đa 1 giờ sau vàng
  KICK_RED_MIN_TOTAL_2H: 10,                // < 10 trong 2 giờ là đỏ
  KICK_CELEBRATE_AT: 10,                    // đủ 10 ở giờ 1: tự kết thúc + mưa tim
  KICK_MIN_TAP_GAP_MS: 800,                 // bỏ qua cú chạm thứ hai trong 0,8 giây
  KICK_SLOTS_PER_DAY: 3,                    // Sáng / Trưa / Tối
  KICK_MAX_TAPS: 200,                       // tối đa điểm chạm ghi vị trí mỗi lượt

  /* ===== Ngày dự sinh (tech design mục 5.7) ===== */
  EDD_MIN_OFFSET_DAYS: -14,                 // nhập được từ hôm nay − 14 ngày
  EDD_MAX_OFFSET_DAYS: 280,                 // tới hôm nay + 280 ngày

  /* ===== Nhóm từ khóa mới. Anh duyệt "theo đề xuất" 29/10/2026 (PRD câu 10, 13); chữ vẫn status 'draft'.
     signsItchVomit: PRD 9.3 dòng 12–13 không có đề xuất (để anh quyết) → giữ false. ===== */
  FEATURES: {
    pregnancyHarm: true,                    // PRD 9.2b: ý nghĩ làm hại con → nhóm khẩn
    lossGroup: true,                        // PRD 9.4b: mất con / không muốn giữ thai / không ai giúp
    piiSkipBabyNames: true,                 // PRD câu 13: "Bé Bơ" không cảnh báo
    signsItchVomit: false                   // PRD 9.3 dòng 12–13
  }
};
