/**
 * ============================================================
 *  GOOGLE APPS SCRIPT – MẸ BẦU AN YÊN (Bước B: tài khoản SĐT + mã PIN, 29/10/2026)
 *  Chủ: backend-dev · Đặc tả: docs/adr/0005-lstp-apps-script-tai-khoan-sdt-pin.md
 *  (gốc: docs/style/apps-script-template.js; kế thừa cách kiểm dữ liệu của
 *   apps/checkin-me-bau/google_apps_script.js đã qua 4 lượt review)
 * ============================================================
 *  Script này là "máy chủ" của app. Nó nhận dữ liệu của chị đã đăng nhập, ghi vào
 *  HAI file Google Sheet, và chỉ trả lại dữ liệu của CHÍNH người đang đăng nhập.
 *
 *   - File 1 "MBAY – Dữ liệu" (script gắn với file này), 9 tab:
 *       NguoiDung (SĐT + mã PIN đã băm, KHÔNG có dữ liệu sức khỏe) · PhienDangNhap ·
 *       DangNhapSai · ThoiQuen · CheckIn · ThaiGiao · DemConDap · DauChan (vị trí chạm) · HoSo (ngày dự sinh)
 *   - File 2 "MBAY – Chữ riêng", tab ChuRieng: lời nhắn cho con, chữ "kể thêm".
 *       Chỉ có khi chị tự bật "Lưu lời nhắn của mình lên tài khoản". KHÔNG có SĐT.
 *       Tách file vì quyền trên Google Sheet tính theo FILE: anh chia sẻ file 1 cho
 *       người được giao mà file 2 vẫn chỉ mình anh mở được.
 *   - Các tab dữ liệu chỉ mang "Mã người dùng" ngẫu nhiên (u + 23 ký tự), không mang SĐT.
 *   - Mở URL web app trên trình duyệt chỉ thấy "public_read_disabled": không có đường
 *     nào đọc dữ liệu qua đường link.
 *
 *  ------------------------------------------------------------
 *  HƯỚNG DẪN CÀI ĐẶT (anh Thông tự làm, khoảng 20 phút, làm đúng thứ tự)
 *  ------------------------------------------------------------
 *  BƯỚC 0 – Chọn tài khoản Google giữ dữ liệu
 *    Sheet sẽ có SĐT, dữ liệu sức khỏe thai kỳ và (nếu chị đồng ý) chữ riêng tư: dữ liệu cá nhân
 *    nhạy cảm theo Nghị định 13/2023/NĐ-CP. Đội đề nghị dùng tài khoản Google Workspace CỦA BỆNH VIỆN
 *    (anh hỏi phòng CNTT / pháp chế ai được mở). Làm MỌI bước dưới đây bằng CÙNG một tài khoản đó.
 *
 *  BƯỚC 1 – Tạo file 1 "MBAY – Dữ liệu"
 *    1.1 Vào drive.google.com (tài khoản ở bước 0) → Mới → Google Trang tính → Bảng tính trống.
 *    1.2 Đặt tên file:  MBAY – Dữ liệu
 *    1.3 KHÔNG bấm "Chia sẻ → Bất kỳ ai có đường liên kết". File 2 ở bước 3 thì KHÔNG chia sẻ cho ai.
 *    1.4 QUYỀN CHỈNH SỬA FILE 1 = QUYỀN XEM MỌI THỨ. Ai có quyền Chỉnh sửa file 1 thì mở được Apps Script,
 *        thấy PIN_PEPPER, thấy cột ẩn (muối, băm PIN), sửa được code. Có pepper + băm thì dò lại được PIN
 *        6 số của mọi chị, rồi đăng nhập đọc cả CHỮ RIÊNG ở file 2. Vì vậy CHỈ anh (hoặc một người anh tin
 *        như chính mình) giữ quyền Chỉnh sửa (anh Thông quyết 29/10/2026). Không cấp quyền Chỉnh sửa cho ai
 *        khác, kể cả nhân viên phòng khám, kể cả chỉ để đặt lại PIN.
 *    1.5 Người khác CHỈ được quyền Xem, và chỉ khi thật cần: thêm đúng email, quyền Người xem, rồi Chia sẻ → bánh răng → BỎ tick
 *        "Người xem và người nhận xét có thể thấy tùy chọn tải xuống, in và sao chép". Nói rõ với họ:
 *        người xem thấy TOÀN BỘ số điện thoại ở tab NguoiDung và nối được với dữ liệu sức khỏe qua Mã người dùng.
 *
 *  BƯỚC 2 – Dán script
 *    2.1 Trên file vừa tạo: Tiện ích mở rộng (Extensions) → Apps Script.
 *    2.2 Trong Code.gs xóa hết, dán TOÀN BỘ file này vào. Bấm Lưu (Ctrl+S).
 *    2.3 Bánh răng "Cài đặt dự án" (Project Settings): Múi giờ chọn (GMT+07:00) Bangkok/Hà Nội/
 *        Jakarta (hoặc Asia/Ho_Chi_Minh). Giữ "Bật thời gian chạy Chrome V8".
 *
 *  BƯỚC 3 – Chạy hàm setup (tạo 9 tab, sinh pepper, tạo file 2 "MBAY – Chữ riêng")
 *    3.1 Ô chọn hàm cạnh nút Chạy (Run) → chọn  setup  → bấm Chạy.
 *    3.2 Lần đầu Google hỏi quyền: Xem lại quyền → chọn tài khoản → Nâng cao (Advanced) →
 *        Đi tới … (không an toàn) → Cho phép. Đây là script của chính anh nên cảnh báo này là bình thường.
 *    3.3 Mở Nhật ký thực thi: thấy "setup: XONG" và đường link file 2. File 2 nằm trong
 *        "Drive của tôi"; anh kéo nó vào thư mục riêng được (ID không đổi). KHÔNG chia sẻ file 2.
 *        (Muốn tự tạo file 2: tạo Sheet trống tên "MBAY – Chữ riêng", chép ID trong đường link
 *         /d/<ID>/edit, thêm Thuộc tính tập lệnh  PRIVATE_SHEET_ID = <ID>  TRƯỚC khi chạy setup.)
 *    3.4 Chạy lại setup bao nhiêu lần cũng được: chỉ thêm tab/cột còn thiếu, không xóa gì,
 *        KHÔNG BAO GIỜ đổi pepper.
 *
 *  BƯỚC 4 – SAO LƯU PEPPER (rất quan trọng, làm ngay)
 *    4.1 Cài đặt dự án → Thuộc tính tập lệnh (Script Properties) → thấy PIN_PEPPER (64 ký tự).
 *    4.2 Chép giá trị đó vào nơi an toàn: trình quản lý mật khẩu / két của bệnh viện, hoặc giấy
 *        cất tủ khóa. KHÔNG gửi qua Zalo, email; KHÔNG dán vào Sheet, vào code hay lên GitHub.
 *    4.3 KHÔNG sửa, KHÔNG xóa PIN_PEPPER. Mất hoặc đổi pepper = mọi chị phải nhờ phòng khám đặt lại
 *        mã PIN. Nếu phải tạo lại project: dán lại đúng pepper cũ vào Thuộc tính tập lệnh trước khi chạy setup.
 *
 *  BƯỚC 5 – Chọn số vòng băm mã PIN
 *    5.1 Chọn hàm  benchPinHash  → Chạy. Nhật ký thực thi hiện thời gian của 1.000 / 2.000 / 5.000 vòng.
 *    5.2 Chọn số vòng lớn nhất mà thời gian còn trong khoảng 0,3–0,8 giây, sửa dòng
 *            var PIN_HASH_ITER = 2000;
 *        ở phần Cấu hình bên dưới → Lưu. (Tăng số vòng về sau được: chị đăng nhập đúng là tự băm lại.)
 *
 *  BƯỚC 6 – Tự kiểm tra
 *    Chọn hàm  selfTest  → Chạy. Nhật ký thực thi lần lượt "test_: …" và cuối cùng "test_: XONG".
 *    Hàm dùng một SĐT thử sinh ngẫu nhiên, ghi thử rồi TỰ XÓA tài khoản thử.
 *
 *  BƯỚC 7 – Triển khai web app
 *    7.1 Triển khai (Deploy) → Triển khai mới (New deployment) → bánh răng → Ứng dụng web (Web app).
 *    7.2 Thực thi với tư cách (Execute as): TÔI (Me).
 *        Ai có quyền truy cập (Who has access): BẤT KỲ AI (Anyone).
 *        Không chọn "Bất kỳ ai có Tài khoản Google": app sẽ nhận trang đăng nhập Google thay vì dữ liệu.
 *        Tài khoản Workspace mà KHÔNG thấy lựa chọn "Bất kỳ ai": quản trị viên đã tắt. Nhờ CNTT bệnh viện mở
 *        cho dự án này (hoặc dùng tài khoản khác theo BƯỚC 0). URL dạng .../a/macros/<miền>/s/.../exec vẫn dùng được.
 *    7.3 Bấm Triển khai, chép dòng URL ứng dụng web (https://script.google.com/macros/s/…/exec).
 *
 *  BƯỚC 8 – Kiểm tra sau khi triển khai
 *    8.1 Dán URL vào trình duyệt → phải thấy  {"result":"error","error":"public_read_disabled"}
 *    8.2 Mở Terminal (Ubuntu) hoặc PowerShell (Windows, gõ curl.exe thay cho curl):
 *          curl -sL -X POST -H "Content-Type: text/plain;charset=utf-8" -d "{\"action\":\"ping\"}" "<URL>"
 *        phải thấy  {"result":"success","api":"1","ready":true}
 *        • "ready":false → chưa chạy setup (bước 3) hoặc thiếu PIN_PEPPER / PRIVATE_SHEET_ID.
 *        • Thấy trang HTML đăng nhập Google → bước 7.2 chọn sai "Ai có quyền truy cập".
 *        • Thấy trang HTML lỗi 405 / "unable to open the file": một số bản curl giữ phương thức POST
 *          khi theo chuyển hướng 302. Bỏ "-X POST" (lệnh vẫn gửi POST vì có -d) rồi chạy lại:
 *          curl -sL -H "Content-Type: text/plain;charset=utf-8" -d "{\"action\":\"ping\"}" "<URL>"
 *    8.3 Gửi URL cho đội. Đội chỉ bật đăng nhập trong app (ACCOUNT_ENABLED trong js/config.js)
 *        sau khi code-reviewer duyệt phần bảo mật.
 *
 *  BƯỚC 9 – Đặt lại mã PIN khi chị quên (không có câu hỏi bảo mật)
 *    Anh Thông quyết 29/10/2026: CHỈ anh (hoặc người anh tin tuyệt đối, xem 1.4) tự đặt lại PIN qua menu.
 *    Quên PIN thì app hướng dẫn chị liên hệ phòng khám; phòng khám báo anh, anh đặt lại rồi đọc mã cho chị.
 *    (Menu chỉ chạy với người có quyền Chỉnh sửa file 1; không có cách đặt lại nào khác.)
 *    9.1 Mở file 1 → menu "Mẹ Bầu An Yên" (hiện sau khi tải lại trang) → "Đặt lại mã PIN cho một số điện thoại…".
 *    9.2 Gõ SĐT của chị → OK. Hộp thoại hiện MÃ ĐẶT LẠI 6 SỐ (hạn 24 giờ). Đọc mã cho chị
 *        (gọi lại đúng số đó hoặc tại quầy). Mã KHÔNG được ghi vào Sheet; đóng hộp thoại là không xem lại được.
 *    9.3 Mã PIN cũ hết dùng NGAY; mọi máy đang đăng nhập bằng số đó bị đăng xuất.
 *    9.4 Chị vào app → "Quên mã PIN?" → "Phòng khám đã cho mình mã đặt lại ›" → nhập SĐT, mã, PIN mới.
 *        Cột "Đặt lại mã PIN" của tab NguoiDung cho biết trạng thái.
 *
 *  BƯỚC 10 – Dọn hằng ngày (BẮT BUỘC)
 *    setup tự cài trình kích hoạt  cleanupDaily  chạy hằng ngày lúc 2 giờ sáng. Kiểm: biểu tượng đồng hồ
 *    (Trình kích hoạt) bên trái phải có dòng cleanupDaily; hoặc menu "Mẹ Bầu An Yên → Kiểm tra cài đặt".
 *    Không thấy thì tự thêm: Thêm trình kích hoạt → hàm cleanupDaily → Theo thời gian → Bộ hẹn giờ theo ngày → 1–2 giờ sáng.
 *    Hàm xóa phiên hết hạn, lượt sai cũ, mã đặt lại quá hạn. Thiếu bước này Sheet sẽ phình dần.
 *
 *  BƯỚC 11 – Lần sau sửa code
 *    Dán code mới → Lưu → Triển khai → Quản lý bản triển khai → bút chì → Phiên bản: Phiên bản mới
 *    → Triển khai. URL giữ nguyên.
 *
 *  QUY TẮC KHI MỞ SHEET
 *    - Ô có dấu ' ở đầu (ví dụ '=…) là bình thường: script chặn công thức do người lạ gửi vào.
 *    - KHÔNG đổi tên tab, KHÔNG đổi thứ tự cột, KHÔNG sửa cột ẩn (Muối, Băm PIN, Khóa SĐT, epoch…).
 *      Tab NguoiDung, PhienDangNhap, DangNhapSai có cảnh báo khi sửa: đó là để tránh sửa nhầm.
 *    - Muốn xóa dữ liệu của một chị: chị tự bấm "Xóa tài khoản" trong app (xóa ở cả hai file).
 *    - Không có tài khoản quản trị nào trong app; mọi việc quản trị chỉ làm trên Sheet.
 *    - Sai mã PIN 5 lần thì số đó bị khóa đúng 15 phút (cố định, không tăng dần); anh đặt lại PIN cũng mở khóa.
 *      Tab DangNhapSai chỉ chứa mã băm của số điện thoại, tối đa 3.000 dòng, tự dọn hằng ngày.
 *    - Giới hạn chống làm đầy Sheet: 30 đăng ký mới/giờ toàn hệ thống; mỗi chị mỗi ngày tối đa 10 lượt đếm,
 *      20 check-in, 10 mốc thai giáo, 10 lời nhắn. Menu "Kiểm tra cài đặt" cảnh báo khi file vượt 70 % trần 10 triệu ô.
 *
 *  Phía web gửi bằng (js/api.js):
 *    fetch(URL, { method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
 *                 body: JSON.stringify({ action, v:'1', token?, … }), redirect:'follow', credentials:'omit' })
 *    (text/plain để không có preflight CORS; token chỉ nằm trong thân, không bao giờ trên URL.)
 * ============================================================
 */

/* =====================================================================
 *  CẤU HÌNH (anh sửa được; đổi xong bấm Lưu và tạo Phiên bản mới ở bước 11)
 * ===================================================================== */
var API_VERSION = '1';
var TIME_ZONE = 'Asia/Ho_Chi_Minh';
var TZ_OFFSET_MIN = 420;                 // giờ Việt Nam cho "ngày" (khớp js/config.js)
var PIN_HASH_ITER = 2000;                // đặt theo benchPinHash: mục tiêu 0,3–0,8 giây/lần
var PIN_MAX_FAIL = 5;                    // sai 5 lần → khóa
var PIN_LOCK_MIN = 15;                   // khóa CỐ ĐỊNH 15 phút mỗi lần (anh Thông quyết 29/10/2026: không leo thang)
var FAIL_RESET_HOURS = 6;                // lần sai cũ hơn 6 giờ thì đếm lại từ 0 (cùng luật cho mọi số)
var FAIL_ROWS_MAX = 3000;               // DangNhapSai tối đa 3.000 dòng; đầy thì dùng lại dòng cũ nhất không đang khóa
var SESSION_PRIVATE_DAYS = 30;           // tick "máy riêng"
var SESSION_SHORT_HOURS = 12;            // không tick
var RESET_VALID_HOURS = 24;              // hạn mã đặt lại
var RESET_REQUIRE_CODE = true;           // true: chị phải nhập mã 6 số anh đọc cho chị
var MAX_BODY = 60000;                    // ký tự; quá là rác
var BATCH_MAX = 20;                      // bản ghi mỗi lần saveRecords
var DELETE_MAX = 50;                     // mục mỗi lần deleteRecords
var LETTER_MAX = 2000;                   // ký tự lời nhắn cho con
var NOTE_MAX = 1000;                     // ký tự "kể thêm" ở check-in
var KICK_MAX_TAPS = 200;                 // điểm chạm tối đa mỗi lượt
var KICK_TAP_T_MAX_MS = 7260000;         // 120 phút + 1 phút dư
var KICK_HOUR_MS = 3600000;
var COUNT_MAX = 200;                     // số lần đếm tối đa
var GA_DAYS_MAX = 294;                   // tuổi thai tối đa (42 tuần)
var AGE_MAX_MS = 8 * 24 * 3600 * 1000;   // hàng chờ trên máy giữ 7 ngày
var DAY_BACK = 2, DAY_FWD = 1;           // sửa "hôm nay và 2 ngày trước" (AC-102)
var EDD_MIN_OFFSET = -14;                // ngày dự sinh từ ngàyThựcHiện − 14
var EDD_MAX_OFFSET = 280;                // tới ngàyThựcHiện + 280 (khớp js/config.js)
var GLOBAL_FAIL_SLOW_PER_MIN = 30;       // > 30 lần sai/phút toàn hệ thống → chậm 1,5 s
var GLOBAL_FAIL_STOP_PER_MIN = 120;      // > 120 → tạm từ chối mọi lượt đăng nhập 60 s
var REGISTER_MAX_PER_HOUR = 30;          // đăng ký mới toàn hệ thống mỗi giờ (dự kiến ~300 chị; một buổi lớp vẫn đủ)
var SESSION_CALLS_PER_10MIN = 200;       // lời gọi mỗi NGƯỜI (uid) mỗi 10 phút
var SESSION_MAX_PER_USER = 10;           // phiên còn hạn tối đa mỗi người; đăng nhập thêm thì thu hồi phiên cũ nhất
var LOGIN_OK_MAX_PER_HOUR = 20;          // đăng nhập thành công tối đa mỗi số mỗi giờ
// Trần bản ghi MỚI mỗi người mỗi ngày (theo "Thời gian ghi" của server; sửa bản ghi cũ không tính).
// Đếm thật trên Sheet (dòng ghi hôm nay của người đó), không phụ thuộc đệm.
var DAILY_QUOTA = { kick: 10, checkin: 20, thaigiao: 10, letter: 10 };
var TOTAL_QUOTA = { kick: 3000, checkin: 6000, thaigiao: 3000, letter: 3000 };
var LIST_DEFAULT_DAYS = 400;
var LIST_MAX_PER_KIND = 3000;
var INACTIVE_DELETE_MONTHS = 0;          // > 0: cleanupDaily xóa tài khoản không dùng N tháng (K-15). 0 = tắt
var ALLOW_PUBLIC_READ = false;           // luôn false: doGet không đọc Sheet dù đặt gì ở đây
var LOCK_WAIT_MS = 10000;
var SESSION_CACHE_SEC = 600;             // đệm phiên 10 phút
var BLOCK_READ_MIN = 40;                 // ≥ 40 dòng của một người: đọc một khối thay vì từng dòng
var PRIVATE_FILE_NAME = 'MBAY – Chữ riêng';
var CELL_LIMIT = 10000000;               // trần ô mỗi file Google Sheets (tính cả ô trống của lưới)
var CELL_WARN_RATIO = 0.7;               // vượt 70 % thì checkSetup / cleanupDaily cảnh báo

/* ===== Danh mục cố định (PHẢI trùng js/data.js; check-static so). Mã → chữ hiện trên Sheet ===== */
var EMOTIONS = { happy: 'Vui vẻ', sad: 'Buồn', worried: 'Lo lắng', angry: 'Tức giận', panicked: 'Hoảng hốt',
                 uncomfortable: 'Khó chịu', tired: 'Mệt', unsure: 'Chưa rõ' };
var CONTEXTS = { sleep: 'Khó ngủ', before_visit: 'Sắp đi khám', worry_baby: 'Lo cho con', body: 'Mệt trong người',
                 family: 'Chuyện gia đình', work: 'Công việc', other: 'Khác' };
var EXERCISES = { STOP_PAUSE: 'Dừng 5 giây', BREATHE_46: 'Thở chậm 4 vào – 6 ra', HUM: 'Ngân "ừm" cùng con',
                  BELLY_BREATH: 'Thở bụng nhẹ, tay ôm con', GROUND_54321: 'Về với lúc này 5-4-3-2-1',
                  RELEASE_ZONES: 'Thả lỏng từng vùng', AUDIO_CALM: 'Âm thanh êm dịu', MUSIC: 'Nghe nhạc cùng con' };
var FITS = { fit: 'Phù hợp', unfit: 'Không phù hợp', worse: 'Khó chịu hơn', unsure: 'Chưa chắc' };
var HABITS = { kick: '👣 Đếm cử động thai', thai_giao: '💌 Thai giáo', breath: '🌬️ Thở / ngân',
               move: '🚶 Vận động sau ăn', water: '💧 Uống đủ nước', side_sleep: '🛏️ Ngủ nghiêng' };
var HABIT_ORDER = ['kick', 'thai_giao', 'breath', 'move', 'water', 'side_sleep'];
var MARKS = { '': '', x: 'Có', a: 'Tự đánh dấu' };
var TG_HOW = { done: 'Đã làm', letter: 'Có viết lời nhắn' };
var MEALS = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối', other: 'Lúc khác' };
var KICK_LEVELS = { green: 'Con cử động đều', red: 'Đã báo đi khám', stopped: 'Dừng giữa chừng',
                    stopped_yellow: 'Dừng khi đang cần chú ý' };
var KICK_REASONS = { danger_sign: 'Có dấu hiệu nguy hiểm', mother_reported: 'Mẹ thấy con cử động khác mọi ngày',
                     h2_low: 'Giờ thứ hai từ 3 lần trở xuống', lt10_2h: 'Dưới 10 lần trong 2 giờ' };
var KICK_FEELS = { same: 'Như mọi ngày', different: 'Khác mọi ngày', skipped: 'Bỏ qua' };
var KICK_SIGNS = { bleeding: 'Ra máu', fluid: 'Ra nước', pain: 'Đau bụng', contractions: 'Bụng gò cứng',
                   headache: 'Đau đầu', vision: 'Nhìn mờ', swelling: 'Phù', no_movement: 'Con cử động ít hơn hẳn' };
var PROMPTS = { 'TG-01': 'TG-01', 'TG-02': 'TG-02', 'TG-03': 'TG-03', 'TG-04': 'TG-04', 'TG-05': 'TG-05', 'TG-06': 'TG-06', 'TG-07': 'TG-07',
                'TG-08': 'TG-08', 'TG-09': 'TG-09', 'TG-10': 'TG-10', 'TG-11': 'TG-11', 'TG-12': 'TG-12', 'TG-13': 'TG-13', 'TG-14': 'TG-14',
                'TG-15': 'TG-15', 'TG-16': 'TG-16' };
// Mã PIN dễ đoán (cùng luật E.weakPin ở client, ADR 0005 mục 4.3)
var WEAK_PINS = ['000000', '111111', '112233', '123321', '666888', '888888', '168168', '686868'];
// Mẫu bàn phím / số đẹp hay gặp (review T-RB). js/data.js PIN.weakList cần thêm y hệt (việc của FE-2)
var WEAK_PINS_EXTRA = ['147258', '258369', '159753', '789456', '456123', '147852', '520520', '131420', '123654', '321654',
                       '741852', '852963', '159357', '753951'];

var ID_RE = /^[0-9a-z]{12,40}$/;
var TOKEN_RE = /^[0-9a-f]{64}$/;
var VERSION_RE = /^\d{1,3}(\.\d{1,3}){0,2}$/;

/* ===== Tab và cột. Kiểu: 't' văn bản (định dạng @), 'n' số. Cột thứ 3 = 1 → ẩn ===== */
var TAB = { USERS: 'NguoiDung', SESS: 'PhienDangNhap', FAIL: 'DangNhapSai', HABIT: 'ThoiQuen', CHECKIN: 'CheckIn',
            TG: 'ThaiGiao', KICK: 'DemConDap', TAPS: 'DauChan', PROFILE: 'HoSo', PRIV: 'ChuRieng' };
var DATA_TABS = [TAB.USERS, TAB.SESS, TAB.FAIL, TAB.HABIT, TAB.CHECKIN, TAB.TG, TAB.KICK, TAB.TAPS, TAB.PROFILE];
var PROTECTED_TABS = [TAB.USERS, TAB.SESS, TAB.FAIL];
var SCHEMA = {};
SCHEMA[TAB.USERS] = [['Mã người dùng', 't'], ['Số điện thoại', 't'], ['Ngày tạo', 't'], ['Lần dùng cuối', 't'],
  ['Đồng ý', 't'], ['Gửi chữ tự viết', 't'], ['Thói quen đang theo dõi', 't'], ['Đặt lại mã PIN', 't'],
  ['Muối', 't', 1], ['Băm PIN', 't', 1], ['Số vòng', 'n', 1], ['Băm mã đặt lại', 't', 1], ['Hạn đặt lại', 'n', 1],
  ['Khóa SĐT', 't', 1]];
SCHEMA[TAB.SESS] = [['Băm phiên', 't'], ['Mã người dùng', 't'], ['Tạo lúc', 't'], ['Loại', 't'], ['Hết hạn', 'n', 1], ['Thu hồi', 't']];
SCHEMA[TAB.FAIL] = [['Khóa SĐT', 't'], ['Số lần sai', 'n'], ['Lần sai gần nhất', 'n', 1], ['Khóa tới', 'n', 1]];
SCHEMA[TAB.HABIT] = [['Mã người dùng', 't'], ['Ngày', 't']]
  .concat(HABIT_ORDER.map(function (c) { return [HABITS[c], 't']; }))
  .concat([['Cập nhật lúc', 't'], ['epoch', 'n', 1]]);
SCHEMA[TAB.CHECKIN] = [['Thời gian ghi', 't'], ['Mã người dùng', 't'], ['Mã lượt', 't'], ['Giờ check-in', 't'],
  ['Cảm xúc', 't'], ['Mức căng trước', 'n'], ['Mức căng sau', 'n'], ['Bài', 't'], ['Phù hợp', 't'], ['Tình huống', 't'],
  ['Số phút', 'n'], ['epoch', 'n', 1]];
SCHEMA[TAB.TG] = [['Thời gian ghi', 't'], ['Mã người dùng', 't'], ['Mã mốc', 't'], ['Ngày', 't'], ['Lời nhắc', 't'],
  ['Cách', 't'], ['epoch', 'n', 1]];
SCHEMA[TAB.KICK] = [['Thời gian ghi (server)', 't'], ['Mã người dùng', 't'], ['Mã lượt', 't'], ['Giờ bắt đầu', 't'],
  ['Bữa', 't'], ['Số lần giờ 1', 'n'], ['Số lần giờ 2', 'n'], ['Tổng', 'n'], ['Phút đạt 4', 'n'], ['Phút đạt 10', 'n'],
  ['Mức', 't'], ['Đã qua giờ cần chú ý', 't'], ['Lý do', 't'], ['Cảm nhận của mẹ', 't'], ['Dấu hiệu đã chọn', 't'],
  ['Tuổi thai (ngày)', 'n'], ['Tuần thai', 't'], ['epoch bắt đầu', 'n', 1]];
SCHEMA[TAB.TAPS] = [['Mã người dùng', 't'], ['Mã lượt', 't'], ['Số điểm', 'n'], ['Các điểm', 't'], ['epoch', 'n', 1]];
SCHEMA[TAB.PROFILE] = [['Mã người dùng', 't'], ['Ngày dự sinh', 't'], ['Con đã chào đời', 't'], ['Cập nhật lúc', 't'], ['epoch', 'n', 1]];
SCHEMA[TAB.PRIV] = [['Thời gian ghi', 't'], ['Mã người dùng', 't'], ['Loại', 't'], ['Mã bản ghi', 't'], ['Ngày', 't'],
  ['Lời nhắc', 't'], ['Nội dung', 't'], ['epoch', 'n', 1]];

// Số cột (1-based) dùng trong code — khớp thứ tự SCHEMA ở trên
var U = { UID: 1, PHONE: 2, CREATED: 3, LAST: 4, CONSENT: 5, TEXT: 6, HABITS: 7, RESET_NOTE: 8, SALT: 9, HASH: 10,
          ITER: 11, RHASH: 12, REXP: 13, PKEY: 14, N: 14 };
var S = { HASH: 1, UID: 2, CREATED: 3, TYPE: 4, EXP: 5, REVOKED: 6, N: 6 };
var F = { KEY: 1, COUNT: 2, LAST: 3, LOCK: 4, N: 4 };
var H = { UID: 1, DAY: 2, MARK0: 3, UPD: 9, EPOCH: 10, N: 10 };
var CI = { TIME: 1, UID: 2, ID: 3, AT: 4, EMO: 5, BEFORE: 6, AFTER: 7, EX: 8, FIT: 9, CTX: 10, MIN: 11, EPOCH: 12, N: 12 };
var TG = { TIME: 1, UID: 2, ID: 3, DAY: 4, PROMPT: 5, HOW: 6, EPOCH: 7, N: 7 };
var K = { TIME: 1, UID: 2, ID: 3, START: 4, MEAL: 5, H1: 6, H2: 7, TOTAL: 8, MIN4: 9, MIN10: 10, LEVEL: 11, YELLOW: 12,
          REASONS: 13, FEEL: 14, SIGNS: 15, GA: 16, GAW: 17, EPOCH: 18, N: 18 };
var T = { UID: 1, ID: 2, COUNT: 3, PTS: 4, EPOCH: 5, N: 5 };
var P = { UID: 1, EDD: 2, BORN: 3, UPD: 4, EPOCH: 5, N: 5 };
var L = { TIME: 1, UID: 2, TYPE: 3, ID: 4, DAY: 5, PROMPT: 6, TEXT: 7, EPOCH: 8, N: 8 };
var PRIV_LETTER = 'Lời nhắn cho con';
var PRIV_NOTE = 'Kể thêm ở check-in';
var REVOKED_MARK = 'Có';
var LIST_KINDS = ['habit', 'prefs', 'profile', 'checkin', 'thaigiao', 'kick', 'letter'];
var EMPTY_HABITS = '(không bật thói quen nào)';

/* =====================================================================
 *  TIỆN ÍCH CHUNG
 * ===================================================================== */

// Đệm trong MỘT lần chạy (Apps Script nạp lại biến toàn cục mỗi lời gọi; mock thì không nên doPost đặt lại)
var REQ_ = null;
function req_() { if (!REQ_) REQ_ = { ss: null, priv: null, sheets: {} }; return REQ_; }

function now_() { return new Date().getTime(); }
function has_(map, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(map, k); }
function err_(code, extra) {
  var o = { result: 'error', error: code };
  if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
  return o;
}
function ok_(obj) {
  var o = { result: 'success' };
  if (obj) for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) o[k] = obj[k];
  return o;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Phòng thủ lớp hai chống chèn công thức: Sheets coi ô bắt đầu bằng = + - @ (và tab, CR) là công thức.
 * Thêm dấu nháy ' phía trước → Sheets hiểu là văn bản. Áp cho MỌI chuỗi trước khi ghi, dù đã whitelist.
 */
function safeText_(s) {
  var t = String(s == null ? '' : s);
  if (!t) return t;
  var c = t.charAt(0);
  if (c === '=' || c === '+' || c === '-' || c === '@' || c === '\t' || c === '\r') return "'" + t;
  return t;
}

/** Giờ Việt Nam để hiện trên Sheet. */
function fmtTime_(ms) { return Utilities.formatDate(new Date(ms), TIME_ZONE, 'HH:mm:ss dd/MM/yyyy'); }
function fmtDay_(ms) { return Utilities.formatDate(new Date(ms), TIME_ZONE, 'dd/MM/yyyy'); }
function fmtShort_(ms) { return Utilities.formatDate(new Date(ms), TIME_ZONE, 'HH:mm dd/MM/yyyy'); }
/** 'YYYY-MM-DD' theo lịch Việt Nam, không phụ thuộc múi giờ máy chủ (giống U.dayKey ở client). */
function dayKey_(ms) { return new Date(ms + TZ_OFFSET_MIN * 60000).toISOString().slice(0, 10); }
/** Ngày có thật → chuỗi dựng lại bằng Date.UTC; sai → ''. */
function validDay_(s) {
  if (typeof s !== 'string') return '';
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return '';
  var y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2000 || y > 2100) return '';
  var dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return dt.toISOString().slice(0, 10);
}
function dayNum_(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000; }
function addDays_(day, n) { return new Date((dayNum_(day) + n) * 86400000).toISOString().slice(0, 10); }
/** Ô ngày đọc từ Sheet (thường là chuỗi vì cột @; ai đó đổi định dạng thì có thể thành Date). */
function cellDay_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TIME_ZONE, 'yyyy-MM-dd');
  return validDay_(String(v == null ? '' : v));
}
function isInt_(v, lo, hi) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= lo && v <= hi; }
function num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v === '' || v == null) return null;
  var n = Number(v);
  return isFinite(n) ? n : null;
}

/* ===== Băm, ngẫu nhiên ===== */
/** Byte của Java có dấu (−128…127): (b + 256) % 256 trước khi đổi hex. */
function hex_(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) { var b = (bytes[i] + 256) % 256; s += (b < 16 ? '0' : '') + b.toString(16); }
  return s;
}
function sha256hex_(str) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8)); }
function hmacHex_(key, msg) { return hex_(Utilities.computeHmacSha256Signature(msg, key, Utilities.Charset.UTF_8)); }
function uuidHex_() { return Utilities.getUuid().replace(/-/g, ''); }
/** 64 hex ngẫu nhiên: SHA-256 của 3 UUID (≈ 366 bit từ SecureRandom) → token 256 bit. */
function random64_() { return sha256hex_(uuidHex_() + uuidHex_() + uuidHex_()); }
function newSalt_() { return random64_().slice(0, 32); }
/** Mã 6 số đều (loại bỏ phần dư để không lệch phân bố). */
function randomDigits6_() {
  for (;;) {
    var n = parseInt(uuidHex_().slice(0, 8), 16);
    if (n < 4294000000) { var s = String(n % 1000000); return '000000'.slice(s.length) + s; }
  }
}
/** So hai chuỗi hex cùng độ dài trong thời gian không phụ thuộc vị trí khác nhau. */
function ctEq_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length || !a.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
/**
 * Băm PIN (S-02): h = SHA-256(pepper|muối|pin), rồi lặp h = SHA-256(h) thêm iter − 1 lần.
 * KHÔNG gọi trong lock (mất ~0,5 s). Không log PIN, không log kết quả.
 */
function hashPin_(pin, salt, iter, pepper) {
  var alg = Utilities.DigestAlgorithm.SHA_256;
  var h = Utilities.computeDigest(alg, pepper + '|' + salt + '|' + pin, Utilities.Charset.UTF_8);
  for (var i = 1; i < iter; i++) h = Utilities.computeDigest(alg, h);
  return hex_(h);
}
function makeCred_(pin, pepper) { var salt = newSalt_(); return { salt: salt, hash: hashPin_(pin, salt, PIN_HASH_ITER, pepper), iter: PIN_HASH_ITER }; }
function resetCodeHash_(pepper, uid, code) { return sha256hex_(pepper + '|reset|' + uid + '|' + code); }
function acct_(uid) { return sha256hex_('acct|' + uid).slice(0, 12); }

/* ===== Script Properties ===== */
function props_() { return PropertiesService.getScriptProperties(); }
function pepper_() { var p = props_().getProperty('PIN_PEPPER'); return (p && /^[0-9a-f]{64}$/.test(p)) ? p : ''; }
function ready_() { return !!pepper_() && !!props_().getProperty('PRIVATE_SHEET_ID'); }

/* ===== SĐT (viết giống normalizePhone của STOP-4P / js/util.js) ===== */
function normalizePhone_(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return '';
  var s0 = String(raw);
  if (s0.length > 30) return '';
  var d = s0.replace(/[^\d+]/g, '');
  if (d.indexOf('+84') === 0) d = d.slice(3);
  else if (d.indexOf('84') === 0 && d.length === 11) d = d.slice(2);
  else if (d.charAt(0) === '0') d = d.slice(1);
  if (!/^[35789]\d{8}$/.test(d)) return '';
  return '+84' + d;
}
function localPhone_(e164) { return '0' + e164.slice(3); }
function maskPhone_(e164) { return e164 ? e164.slice(0, 4) + ' ••• ••' + e164.slice(-3) : ''; }
function phoneKey_(e164, pepper) { return hmacHex_(pepper, e164); }

/* ===== Mã PIN ===== */
function isPinFormat_(p) { return typeof p === 'string' && /^\d{6}$/.test(p); }
/** PIN dễ đoán: 6 số giống nhau, dãy tăng/giảm liên tiếp, lặp 3 hoặc 2 số, 6 số cuối SĐT, danh sách ngắn. */
function isWeakPin_(pin, e164) {
  if (/^(\d)\1{5}$/.test(pin)) return true;
  var up = true, down = true;
  for (var i = 1; i < 6; i++) {
    var a = +pin.charAt(i - 1), b = +pin.charAt(i);
    if (b !== a + 1) up = false;
    if (b !== a - 1) down = false;
  }
  if (up || down) return true;
  if (pin.slice(0, 3) === pin.slice(3)) return true;
  if (pin.slice(0, 2) === pin.slice(2, 4) && pin.slice(2, 4) === pin.slice(4)) return true;
  if (e164 && e164.slice(-6) === pin) return true;
  return WEAK_PINS.indexOf(pin) >= 0 || WEAK_PINS_EXTRA.indexOf(pin) >= 0;
}

/* ===== Lock: kiểm dữ liệu xong mới khóa; không băm trong lock ===== */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);   // lỗi → ném ra → doPost trả server_busy, chưa ghi gì
  try { return fn(); }
  finally { try { lock.releaseLock(); } catch (ignored) {} }
}

/* ===== Đếm trong CacheService (giới hạn tần suất; mất đệm thì chỉ là đếm lại) ===== */
function cache_() { return CacheService.getScriptCache(); }
function cacheNum_(key) { var v = cache_().get(key); var n = v ? parseInt(v, 10) : 0; return isFinite(n) ? n : 0; }
function cacheIncr_(key, ttlSec) { var n = cacheNum_(key) + 1; cache_().put(key, String(n), ttlSec); return n; }
function failKey_(ms) { return 'gf:' + Math.floor(ms / 60000); }

/* =====================================================================
 *  SHEET
 * ===================================================================== */
function dataSs_() { var r = req_(); if (!r.ss) r.ss = SpreadsheetApp.getActiveSpreadsheet(); return r.ss; }
function privSs_() {
  var r = req_();
  if (!r.priv) r.priv = SpreadsheetApp.openById(props_().getProperty('PRIVATE_SHEET_ID'));
  return r.priv;
}
function sheet_(name) {
  var r = req_();
  if (r.sheets[name]) return r.sheets[name];
  var ss = name === TAB.PRIV ? privSs_() : dataSs_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ensureTab_(ss, name);   // tab bị xóa nhầm: tạo lại tiêu đề, không mất gì khác
  r.sheets[name] = sh;
  return sh;
}
function fmts_(name) { return SCHEMA[name].map(function (c) { return c[1] === 'n' ? '0' : '@'; }); }

/** Tạo tab (nếu thiếu) với tiêu đề tô hồng, đóng băng hàng 1, cột văn bản @, ẩn cột kỹ thuật.
 *  Chỉ thêm, không đổi. Cắt cột thừa của lưới (Google tính trần 10 triệu ô theo CẢ ô trống). */
function ensureTab_(ss, name) {
  var cols = SCHEMA[name];
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var lastCol = sh.getLastColumn();
  var have = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  for (var c = 0; c < cols.length; c++) {
    if (String(have[c] == null ? '' : have[c]) === '') sh.getRange(1, c + 1).setValue(cols[c][0]);
  }
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold').setBackground('#F8BBD0').setFontColor('#880E4F');
  sh.setFrozenRows(1);
  var maxC = sh.getMaxColumns();
  if (maxC > cols.length && sh.getLastColumn() <= cols.length) sh.deleteColumns(cols.length + 1, maxC - cols.length);
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  for (var j = 0; j < cols.length; j++) {
    sh.getRange(2, j + 1, rows, 1).setNumberFormat(cols[j][1] === 'n' ? '0' : '@');
    if (cols[j][2]) sh.hideColumns(j + 1);
  }
  return sh;
}

/** Số dòng (≥ 2) có ô ở cột col khớp đúng value. Dùng TextFinder (khớp cả ô, phân biệt hoa thường).
 *  CHÚ Ý: số dòng chỉ đúng tại lúc tìm. Ngoài lock, lần chạy khác có thể xóa dòng phía trên làm dòng dịch lên,
 *  nên mọi lần đọc theo số dòng phải KIỂM LẠI cột khóa (ownRows_, verifiedUser_, auth_). */
function findRows_(sh, col, value) {
  var last = sh.getLastRow();
  if (last < 2 || !value) return [];
  var found = sh.getRange(2, col, last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findAll();
  var out = [];
  for (var i = 0; i < found.length; i++) out.push(found[i].getRow());
  return out.sort(function (a, b) { return a - b; });
}
function findRow_(sh, col, value) { var r = findRows_(sh, col, value); return r.length ? r[0] : -1; }
/** Đọc các dòng; nhiều dòng thì đọc một khối từ dòng nhỏ nhất tới lớn nhất (ít lời gọi hơn). */
function readRows_(sh, rows, width) {
  if (!rows.length) return [];
  var out = [];
  if (rows.length >= BLOCK_READ_MIN) {
    var lo = rows[0], hi = Math.min(rows[rows.length - 1], sh.getMaxRows());
    var block = hi >= lo ? sh.getRange(lo, 1, hi - lo + 1, width).getValues() : [];
    for (var i = 0; i < rows.length; i++) out.push({ row: rows[i], v: block[rows[i] - lo] || [] });
  } else {
    for (var j = 0; j < rows.length; j++) {
      out.push({ row: rows[j], v: rows[j] <= sh.getMaxRows() ? sh.getRange(rows[j], 1, 1, width).getValues()[0] : [] });
    }
  }
  return out;
}
/**
 * Mọi dòng có cột keyCol = key, ĐÃ KIỂM LẠI sau khi đọc (dòng dịch vì bị xóa giữa chừng thì bị loại).
 * Số dòng đọc được không khớp số dòng tìm thấy → tìm lại (tối đa 3 lần), vẫn lệch → ném lỗi (server_busy, client thử lại).
 * Không bao giờ trả dòng của người khác.
 */
function ownRows_(name, keyCol, key) {
  var sh = sheet_(name), width = SCHEMA[name].length;
  for (var attempt = 0; attempt < 3; attempt++) {
    var rows = findRows_(sh, keyCol, key);
    var got = readRows_(sh, rows, width).filter(function (r) { return String(r.v[keyCol - 1]) === key; });
    if (got.length === rows.length) return got;
  }
  throw new Error('rows_shifted');
}
function userRows_(name, uidCol, uid) { return ownRows_(name, uidCol, uid); }

/** Ghi một dòng: row < 0 → dòng mới cuối bảng. fromCol > 1 → giữ các cột trước (ví dụ "Thời gian ghi" lần đầu). */
function writeRow_(name, row, values, fromCol) {
  var sh = sheet_(name);
  var start = (row > 0 && fromCol) ? fromCol : 1;
  if (row < 0) row = sh.getLastRow() + 1;
  // getRange ngoài lưới thì Sheets báo lỗi: thêm dòng trống trước (tab mới chỉ có 1.000 dòng)
  if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), Math.max(500, row - sh.getMaxRows()));
  var vals = [], fm = fmts_(name).slice(start - 1);
  for (var i = start - 1; i < values.length; i++) {
    var v = values[i];
    vals.push(v == null ? '' : (typeof v === 'number' ? v : safeText_(v)));
  }
  sh.getRange(row, start, 1, vals.length).setNumberFormats([fm]).setValues([vals]);
  return row;
}
function setCells_(name, row, col, values) {
  var vals = values.map(function (v) { return v == null ? '' : (typeof v === 'number' ? v : safeText_(v)); });
  var fm = fmts_(name).slice(col - 1, col - 1 + vals.length);
  sheet_(name).getRange(row, col, 1, vals.length).setNumberFormats([fm]).setValues([vals]);
}
/** Xóa dòng từ dưới lên, gộp các dòng liền nhau. (Chỉ gọi trong lock.) */
function deleteRows_(name, rows) {
  if (!rows.length) return 0;
  var sh = sheet_(name);
  var rs = rows.slice().sort(function (a, b) { return b - a; });
  var uniq = [];
  for (var i = 0; i < rs.length; i++) if (!uniq.length || uniq[uniq.length - 1] !== rs[i]) uniq.push(rs[i]);
  // Sheets không cho xóa HẾT các dòng không đóng băng: luôn chừa dòng trống ở cuối
  if (uniq[0] >= sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 100);
  var i2 = 0;
  while (i2 < uniq.length) {
    var hi = uniq[i2], lo = hi;
    while (i2 + 1 < uniq.length && uniq[i2 + 1] === lo - 1) { i2++; lo--; }
    sh.deleteRows(lo, hi - lo + 1);
    i2++;
  }
  return uniq.length;
}
/**
 * Dòng của bản ghi theo mã (cột idCol) và chủ (cột uidCol); typeCol/type để lọc thêm "Loại" ở ChuRieng.
 * Trả {row, all} | {conflict:true} (mã đang thuộc người khác). Gọi trong lock.
 */
function ownedRow_(name, idCol, uidCol, id, uid, typeCol, type) {
  var sh = sheet_(name), width = SCHEMA[name].length;
  var rows = readRows_(sh, findRows_(sh, idCol, id), width).filter(function (r) {
    return String(r.v[idCol - 1]) === id && (!typeCol || String(r.v[typeCol - 1]) === type);
  });
  var mine = [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].v[uidCol - 1]) !== uid) return { conflict: true };
    mine.push(rows[i].row);
  }
  return { row: mine.length ? mine[0] : -1, all: mine };
}

/* ===== Người dùng ===== */
function parseUser_(row, v) {
  var consent = String(v[U.CONSENT - 1]);
  var m = /^Sheet (\S+)/.exec(consent);
  var habits = String(v[U.HABITS - 1]);
  return {
    row: row, uid: String(v[U.UID - 1]), phone: String(v[U.PHONE - 1]), createdAt: String(v[U.CREATED - 1]),
    lastUsed: String(v[U.LAST - 1]), version: m ? m[1] : '', text: String(v[U.TEXT - 1]).indexOf('Có') === 0,
    habits: habits === '' ? null : (habits === EMPTY_HABITS ? [] : habits.split(/,\s*/).filter(function (c) { return has_(HABITS, c); })),
    salt: String(v[U.SALT - 1]), hash: String(v[U.HASH - 1]), iter: num_(v[U.ITER - 1]) || 0,
    resetHash: String(v[U.RHASH - 1]), resetExp: num_(v[U.REXP - 1]) || 0, pkey: String(v[U.PKEY - 1])
  };
}
function readUser_(row) { return parseUser_(row, sheet_(TAB.USERS).getRange(row, 1, 1, U.N).getValues()[0]); }
/** Người dùng theo cột khóa (uid hoặc Khóa SĐT), đã kiểm lại dòng đọc được đúng là của khóa đó. */
function verifiedUser_(col, key) {
  var rows = ownRows_(TAB.USERS, col, key);
  return rows.length ? parseUser_(rows[0].row, rows[0].v) : null;
}
function userByKey_(pkey) { return verifiedUser_(U.PKEY, pkey); }
function userByUid_(uid) { return verifiedUser_(U.UID, uid); }
function e164Of_(user) { return '+84' + String(user.phone).replace(/^0/, ''); }
function consentOut_(user) { return { sheet: true, text: !!user.text, version: user.version }; }
/** Hồ sơ {edd, born} của uid (HoSo, đã kiểm lại dòng). */
function profileOf_(uid) {
  var rows = userRows_(TAB.PROFILE, P.UID, uid);
  if (!rows.length) return { edd: null, born: null };
  return { edd: cellDay_(rows[0].v[P.EDD - 1]) || null, born: cellDay_(rows[0].v[P.BORN - 1]) || null };
}

/* ===== Phiên ===== */
/** "Bia mộ" trong đệm: phiên đã thu hồi không bao giờ được đọc lại từ đệm như phiên sống. */
function tombstone_(hashes) {
  var c = cache_();
  for (var i = 0; i < hashes.length; i++) c.put('tk:' + hashes[i], '{"revoked":1}', SESSION_CACHE_SEC + 60);
}
/**
 * Tạo phiên (trong lock). Đồng thời dọn phiên đã chết của người này và giữ tối đa SESSION_MAX_PER_USER
 * phiên còn hạn (thu hồi phiên cũ nhất) → PhienDangNhap không phình vì đăng nhập lại nhiều lần.
 */
function createSession_(uid, privateDevice, now) {
  var mine = userRows_(TAB.SESS, S.UID, uid), dead = [], alive = [];
  mine.forEach(function (r) {
    if (String(r.v[S.REVOKED - 1]) !== '' || !((num_(r.v[S.EXP - 1]) || 0) > now)) dead.push(r); else alive.push(r);
  });
  var drop = dead.concat(alive.slice(0, Math.max(0, alive.length - (SESSION_MAX_PER_USER - 1))));
  if (drop.length) {
    tombstone_(drop.map(function (r) { return String(r.v[S.HASH - 1]); }));
    deleteRows_(TAB.SESS, drop.map(function (r) { return r.row; }));
  }
  var token = random64_();
  var h = sha256hex_(token);
  var exp = now + (privateDevice ? SESSION_PRIVATE_DAYS * 86400000 : SESSION_SHORT_HOURS * 3600000);
  writeRow_(TAB.SESS, -1, [h, uid, fmtTime_(now), privateDevice ? 'Máy riêng' : 'Phiên ngắn', exp, '']);
  cache_().put('tk:' + h, JSON.stringify({ uid: uid, exp: exp }), SESSION_CACHE_SEC);
  return { token: token, exp: exp };
}
function sessionOut_(sess, user) {
  var pf = profileOf_(user.uid);
  return ok_({ token: sess.token, exp: sess.exp, acct: acct_(user.uid), phoneMasked: maskPhone_(e164Of_(user)),
               consent: consentOut_(user), habits: user.habits, edd: pf.edd, born: pf.born });
}
/** Thu hồi mọi phiên của một người (đặt lại PIN, xóa tài khoản). Trong lock; đệm tk: thành bia mộ. */
function revokeAll_(uid) {
  var rows = userRows_(TAB.SESS, S.UID, uid);
  var hashes = [];
  for (var i = 0; i < rows.length; i++) {
    hashes.push(String(rows[i].v[S.HASH - 1]));
    if (String(rows[i].v[S.REVOKED - 1]) !== REVOKED_MARK) setCells_(TAB.SESS, rows[i].row, S.REVOKED, [REVOKED_MARK]);
  }
  tombstone_(hashes);
  return rows;
}
/**
 * token (body) → {uid, exp, h} hoặc null. Thiếu, sai dạng, không có, hết hạn, đã thu hồi: đều null.
 * Đệm trống → đọc dòng phiên TRONG lock (mọi thao tác thu hồi/xóa cũng trong lock, nên không thể đọc nhầm dòng
 * đã dịch hay ghi lại vào đệm một phiên vừa bị thu hồi), kiểm lại cột "Băm phiên" rồi mới ghi đệm.
 */
function auth_(d) {
  var t = d.token;
  if (typeof t !== 'string' || !TOKEN_RE.test(t)) return null;
  var h = sha256hex_(t), now = now_(), s = null;
  var c = cache_().get('tk:' + h);
  if (c) { try { s = JSON.parse(c); } catch (e) { s = null; } }
  if (s && s.revoked) return null;
  if (!s || typeof s.uid !== 'string') {
    s = withLock_(function () {
      var rows = ownRows_(TAB.SESS, S.HASH, h);
      if (!rows.length) return null;
      var v = rows[0].v;
      if (String(v[S.REVOKED - 1]) !== '') return null;
      var x = { uid: String(v[S.UID - 1]), exp: num_(v[S.EXP - 1]) || 0 };
      var t2 = now_();
      if (x.exp > t2) cache_().put('tk:' + h, JSON.stringify(x), Math.max(1, Math.min(SESSION_CACHE_SEC, Math.floor((x.exp - t2) / 1000))));
      return x;
    });
    if (!s) return null;
  }
  if (!(s.exp > now)) return null;
  return { uid: s.uid, exp: s.exp, h: h };
}
/** Giới hạn tần suất theo NGƯỜI (uid), không theo phiên: đăng nhập lại không vượt được. */
function sessionRate_(s) {
  var win = Math.floor(now_() / 600000);
  var n = cacheIncr_('rt:' + s.uid + ':' + win, 660);
  if (n > SESSION_CALLS_PER_10MIN) return err_('rate_limited', { retryAfterSec: Math.max(1, Math.ceil(((win + 1) * 600000 - now_()) / 1000)) });
  return null;
}
function touchLastUsed_(user, now) {
  var today = fmtDay_(now);
  if (user.lastUsed !== today) { setCells_(TAB.USERS, user.row, U.LAST, [today]); user.lastUsed = today; }
}

/* ===== Đếm sai, khóa (S-03, ADR 4.4) =====
 * MỌI số (đã hay chưa đăng ký) dùng CÙNG một nơi (tab DangNhapSai, một dòng mỗi Khóa SĐT, cập nhật chứ không thêm),
 * cùng luật, cùng cửa sổ (FAIL_RESET_HOURS = 6 giờ; khóa cố định PIN_LOCK_MIN = 15 phút), cùng số lời gọi Sheet
 * → câu trả lời và thời gian không lộ số nào có tài khoản.
 * Không làm đầy Sheet: tối đa FAIL_ROWS_MAX dòng; đầy thì dùng lại dòng có lần sai cũ nhất mà không đang khóa
 * (muốn đẩy dòng của một chị ra phải dò hàng nghìn số khác, chậm hơn dò thẳng). Không còn dòng nào dùng lại được
 * → rate_limited (không xảy ra được dưới giới hạn chung 120 lần sai/phút). cleanupDaily xóa dòng cũ. */
function failLoad_(pkey) {
  var rows = ownRows_(TAB.FAIL, F.KEY, pkey);
  if (!rows.length) return { pkey: pkey, row: -1, count: 0, last: 0, lock: 0 };
  var v = rows[0].v;
  return { pkey: pkey, row: rows[0].row, count: num_(v[F.COUNT - 1]) || 0, last: num_(v[F.LAST - 1]) || 0, lock: num_(v[F.LOCK - 1]) || 0 };
}
/** Ghi; dòng mới khi bảng đầy thì dùng lại dòng cũ nhất không đang khóa. Không còn chỗ → false. */
function failSave_(f, now) {
  if (f.row < 0) {
    var sh = sheet_(TAB.FAIL), n = sh.getLastRow() - 1;
    if (n >= FAIL_ROWS_MAX) {
      var vals = sh.getRange(2, 1, n, F.N).getValues(), best = -1, bestLast = Infinity;
      for (var i = 0; i < vals.length; i++) {
        var lk = num_(vals[i][F.LOCK - 1]) || 0, ls = num_(vals[i][F.LAST - 1]) || 0;
        if (!(lk > now) && ls < bestLast) { best = i + 2; bestLast = ls; }
      }
      if (best < 0) return false;
      f.row = best;
    }
  }
  f.row = writeRow_(TAB.FAIL, f.row, [f.pkey, f.count, f.last, f.lock]);
  return true;
}
/** Bước 1 (trong lock): kiểm khóa và GIỮ CHỖ một lượt thử trước khi băm. */
function reserveAttempt_(f, now) {
  if (f.lock > now) return { locked: true, retryAfterSec: Math.ceil((f.lock - now) / 1000) };
  if (f.lock) { f.count = 0; f.lock = 0; }
  if (f.last && now - f.last > FAIL_RESET_HOURS * 3600000) f.count = 0;
  if (f.count >= PIN_MAX_FAIL) {
    f.lock = now + PIN_LOCK_MIN * 60000;
    if (!failSave_(f, now)) return { full: true };
    return { locked: true, retryAfterSec: PIN_LOCK_MIN * 60 };
  }
  f.count += 1; f.last = now;
  if (!failSave_(f, now)) return { full: true };
  return { locked: false };
}
/** Bước 3 (trong lock): đúng → về 0; sai → giữ lượt đã giữ chỗ, đủ 5 thì khóa 15 phút. */
function finishAttempt_(f0, ok, now) {
  var f = failLoad_(f0.pkey);
  if (ok) { if (f.count || f.lock) { f.count = 0; f.lock = 0; failSave_(f, now); } return null; }
  if (!f.count) { f.count = 1; f.last = now; }
  if (f.count >= PIN_MAX_FAIL && !(f.lock > now)) f.lock = now + PIN_LOCK_MIN * 60000;
  failSave_(f, now);
  return { remaining: Math.max(0, PIN_MAX_FAIL - f.count), retryAfterSec: f.lock > now ? Math.ceil((f.lock - now) / 1000) : 0 };
}

/* =====================================================================
 *  CÁC ACTION
 * ===================================================================== */
var PUBLIC_ACTIONS = { ping: 1, register: 1, login: 1, setPinAfterReset: 1 };
var HANDLERS = {
  ping: ping_, register: register_, login: login_, setPinAfterReset: setPinAfterReset_, whoami: whoami_,
  logout: logout_, saveRecords: saveRecords_, listMine: listMine_, exportMine: exportMine_,
  deleteRecords: deleteRecords_, setConsent: setConsent_, deleteAccount: deleteAccount_
};

/** NHẬN DỮ LIỆU TỪ WEB. Mọi lỗi nội bộ chỉ trả server_busy, không trả chi tiết. */
function doPost(e) {
  REQ_ = null;
  try {
    var body = e && e.postData && e.postData.contents;
    if (typeof body !== 'string' || !body) return json_(err_('no_data'));
    if (body.length > MAX_BODY) return json_(err_('too_large'));
    var d;
    try { d = JSON.parse(body); } catch (parseErr) { return json_(err_('bad_json')); }
    if (!d || typeof d !== 'object' || Array.isArray(d)) return json_(err_('bad_json'));
    var action = d.action;
    if (!has_(HANDLERS, action)) return json_(err_('unknown_action'));
    if (action === 'ping') return json_(ping_());
    if (!ready_()) return json_(err_('server_not_ready'));
    if (action === 'logout') return json_(logout_(d));
    if (PUBLIC_ACTIONS[action]) return json_(HANDLERS[action](d));
    var s = auth_(d);
    if (!s) return json_(err_('session_expired'));
    var limited = sessionRate_(s);
    if (limited) return json_(limited);
    return json_(HANDLERS[action](d, s));
  } catch (err) {
    return json_({ result: 'error', error: 'server_busy', retry: true });
  } finally {
    REQ_ = null;
  }
}

/** ĐỌC QUA URL: ĐÃ TẮT. Không đọc Sheet, không JSONP, không tham số nào mở được. */
function doGet() {
  return json_({ result: 'error', error: 'public_read_disabled' });
}

function ping_() { return ok_({ api: API_VERSION, ready: ready_() }); }

/* ----- register ----- */
function register_(d) {
  var phone = normalizePhone_(d.phone);
  if (!phone) return err_('phone_invalid');
  if (!isPinFormat_(d.pin)) return err_('pin_invalid');
  if (isWeakPin_(d.pin, phone)) return err_('pin_weak');
  var c = d.consent;
  if (!c || typeof c !== 'object' || c.sheet !== true || typeof c.version !== 'string' || !VERSION_RE.test(c.version) ||
      (c.text !== undefined && typeof c.text !== 'boolean')) return err_('consent_required');
  var now = now_();
  var hourKey = 'rg:' + Math.floor(now / 3600000);
  if (cacheNum_(hourKey) >= REGISTER_MAX_PER_HOUR) {
    return err_('rate_limited', { retryAfterSec: Math.max(1, Math.ceil((Math.floor(now / 3600000) + 1) * 3600 - now / 1000)) });
  }
  var pepper = pepper_();
  var pkey = phoneKey_(phone, pepper);
  var cred = makeCred_(d.pin, pepper);              // băm NGOÀI lock
  var priv = d.privateDevice === true;
  return withLock_(function () {
    cacheIncr_(hourKey, 3700);
    if (findRow_(sheet_(TAB.USERS), U.PKEY, pkey) > 0) return err_('phone_taken');
    var t = now_();
    var uid;
    do { uid = 'u' + uuidHex_().slice(0, 23); } while (findRow_(sheet_(TAB.USERS), U.UID, uid) > 0);
    var row = writeRow_(TAB.USERS, -1, [uid, localPhone_(phone), fmtTime_(t), fmtDay_(t),
      'Sheet ' + c.version + ' · ' + fmtDay_(t), c.text === true ? 'Có · ' + fmtDay_(t) : '', '', '',
      cred.salt, cred.hash, cred.iter, '', '', pkey]);
    var user = readUser_(row);
    return sessionOut_(createSession_(uid, priv, t), user);
  });
}

/* ----- login / setPinAfterReset: chung luồng giữ chỗ → băm ngoài lock → chốt ----- */
function login_(d) {
  var phone = normalizePhone_(d.phone);
  if (!phone) return err_('phone_invalid');
  if (!isPinFormat_(d.pin)) return err_('pin_invalid');
  return credentialFlow_(phone, d, false);
}
function setPinAfterReset_(d) {
  var phone = normalizePhone_(d.phone);
  if (!phone) return err_('phone_invalid');
  if (!isPinFormat_(d.pin)) return err_('pin_invalid');
  if (isWeakPin_(d.pin, phone)) return err_('pin_weak');
  return credentialFlow_(phone, d, true);
}
function resetValid_(u, code, pepper, now) {
  // Luôn băm mã một lần (kể cả số chưa đăng ký / không có dấu đặt lại) cho thời gian như nhau
  var h = resetCodeHash_(pepper, u ? u.uid : 'none', typeof code === 'string' ? code : '');
  if (!u || !u.resetHash || !(u.resetExp > now)) return false;
  if (!RESET_REQUIRE_CODE) return true;
  return typeof code === 'string' && /^\d{6}$/.test(code) && ctEq_(h, u.resetHash);
}
function credentialFlow_(phone, d, isReset) {
  var now = now_();
  if (cacheNum_(failKey_(now)) > GLOBAL_FAIL_STOP_PER_MIN) return err_('rate_limited', { retryAfterSec: 60 });
  var pepper = pepper_();
  var pkey = phoneKey_(phone, pepper);
  var okKey = 'lo:' + pkey.slice(0, 24) + ':' + Math.floor(now / 3600000);
  if (cacheNum_(okKey) >= LOGIN_OK_MAX_PER_HOUR) {
    return err_('rate_limited', { retryAfterSec: Math.max(1, Math.ceil((Math.floor(now / 3600000) + 1) * 3600 - now / 1000)) });
  }
  var snap = null, f0 = null;
  // 1. (lock) kiểm khóa, giữ chỗ. Mọi số (đã và chưa đăng ký) đếm cùng tab DangNhapSai, một dòng mỗi Khóa SĐT, cùng luật.
  var res = withLock_(function () {
    snap = userByKey_(pkey);
    if (!snap) sheet_(TAB.USERS).getRange(1, 1, 1, U.N).getValues();   // số chưa đăng ký: đọc bù cho bằng số lời gọi Sheet
    f0 = failLoad_(pkey);
    return reserveAttempt_(f0, now_());
  });
  if (res.full) return err_('rate_limited', { retryAfterSec: 60 });
  if (res.locked) return err_('locked', { retryAfterSec: res.retryAfterSec });
  // 2. băm NGOÀI lock. Số chưa đăng ký / PIN đang trống vẫn băm đủ PIN_HASH_ITER vòng để thời gian trả lời như nhau
  var ok = false, cred = null, dummySalt = newSalt_();   // mọi nhánh cùng một lần sinh muối
  if (!isReset) {
    if (snap && snap.hash && snap.salt && snap.iter > 0) {
      ok = ctEq_(hashPin_(d.pin, snap.salt, snap.iter, pepper), snap.hash);
      if (ok && snap.iter < PIN_HASH_ITER) cred = makeCred_(d.pin, pepper);              // tăng số vòng: băm lại
      else if (snap.iter < PIN_HASH_ITER) hashPin_(d.pin, snap.salt, PIN_HASH_ITER - snap.iter, pepper);   // băm bù cho bằng giờ
    } else {
      hashPin_(d.pin, dummySalt, PIN_HASH_ITER, pepper);
    }
  } else {
    cred = makeCred_(d.pin, pepper);
    ok = resetValid_(snap, d.code, pepper, now_());
  }
  // 3. (lock) chốt
  var out = withLock_(function () {
    var t = now_();
    var cur = ok ? userByKey_(pkey) : null;
    // Dòng đổi giữa chừng (vừa đặt lại, vừa xóa tài khoản) → coi như sai
    if (ok && (!cur || cur.uid !== snap.uid || cur.hash !== snap.hash || cur.resetHash !== snap.resetHash)) ok = false;
    if (ok && isReset && !resetValid_(cur, d.code, pepper, t)) ok = false;
    var f = finishAttempt_(f0, ok, t);
    if (!ok) { cacheIncr_(failKey_(t), 180); return { fail: f }; }
    if (cred) {
      setCells_(TAB.USERS, cur.row, U.SALT, [cred.salt, cred.hash, cred.iter]);
      cur.salt = cred.salt; cur.hash = cred.hash; cur.iter = cred.iter;
    }
    if (isReset) {
      setCells_(TAB.USERS, cur.row, U.RHASH, ['', '']);
      setCells_(TAB.USERS, cur.row, U.RESET_NOTE, ['Đã đặt mã mới lúc ' + fmtShort_(t)]);
      revokeAll_(cur.uid);
    }
    touchLastUsed_(cur, t);
    cacheIncr_(okKey, 3700);
    return { ok: sessionOut_(createSession_(cur.uid, d.privateDevice === true, t), cur) };
  });
  if (out.ok) return out.ok;
  if (cacheNum_(failKey_(now_())) > GLOBAL_FAIL_SLOW_PER_MIN) Utilities.sleep(1500);   // chậm lại (K-6), ngoài lock
  var extra = { remaining: out.fail.remaining };
  if (out.fail.remaining === 0) extra.retryAfterSec = out.fail.retryAfterSec || PIN_LOCK_MIN * 60;
  return err_('bad_credentials', extra);
}

/* ----- whoami, logout ----- */
function whoami_(d, s) {
  var user = userByUid_(s.uid);       // đã kiểm lại dòng: không bao giờ là người khác
  if (!user) return err_('session_expired');
  if (user.lastUsed !== fmtDay_(now_())) {
    try { withLock_(function () { var u2 = userByUid_(s.uid); if (u2) touchLastUsed_(u2, now_()); }); } catch (busy) { /* không quan trọng */ }
  }
  var pf = profileOf_(user.uid);
  return ok_({ phoneMasked: maskPhone_(e164Of_(user)), exp: s.exp, acct: acct_(user.uid), consent: consentOut_(user),
               habits: user.habits, edd: pf.edd, born: pf.born });
}
/** Luôn thành công, kể cả token sai (không cho dò token). */
function logout_(d) {
  var t = d.token;
  if (typeof t === 'string' && TOKEN_RE.test(t)) {
    var h = sha256hex_(t);
    withLock_(function () {
      var r = findRow_(sheet_(TAB.SESS), S.HASH, h);
      if (r > 0) setCells_(TAB.SESS, r, S.REVOKED, [REVOKED_MARK]);
      tombstone_([h]);
    });
  }
  return ok_({});
}

/* ----- saveRecords: kiểm từng bản ghi TRƯỚC khi khóa ----- */
function bad_(key, field) { return { key: key, error: 'record_invalid', field: field }; }
/** Mảng mã không trùng, đều trong map, ≤ max. undefined → []. Sai → null. */
function codes_(arr, map, max) {
  if (arr === undefined || arr === null) return [];
  if (!Array.isArray(arr) || arr.length > max) return null;
  var seen = {};
  for (var i = 0; i < arr.length; i++) {
    if (!has_(map, arr[i]) || seen[arr[i]]) return null;
    seen[arr[i]] = 1;
  }
  return arr.slice();
}
function optCode_(v, map) { return (v === null || v === undefined) ? { v: null } : (has_(map, v) ? { v: v } : null); }
function optInt_(v, lo, hi) { return (v === null || v === undefined) ? { v: null } : (isInt_(v, lo, hi) ? { v: v } : null); }
/** Chữ tự viết: NFC, bỏ ký tự điều khiển (giữ xuống dòng), cắt theo số ký tự. Không phải chuỗi → null. */
function cleanText_(s, max) {
  if (typeof s !== 'string') return null;
  var t = s.normalize('NFC').replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g, '');
  t = t.replace(/^\s+|\s+$/g, '');
  var cps = Array.from(t);
  if (cps.length > max) t = cps.slice(0, max).join('').replace(/\s+$/, '');
  return t;
}
function keyOf_(r, i) {
  if (r && typeof r === 'object') {
    if ((r.kind === 'prefs' || r.kind === 'profile')) return r.kind;
    if (r.kind === 'habit' && validDay_(r.day)) return 'habit:' + r.day;
    if (has_({ checkin: 1, thaigiao: 1, kick: 1, letter: 1 }, r.kind) && typeof r.id === 'string' && ID_RE.test(r.id)) return r.kind + ':' + r.id;
  }
  return '#' + i;
}
/** ageMs → {doneAt, day} ; sai → null. */
function age_(v, now) { if (!isInt_(v, 0, AGE_MAX_MS)) return null; var at = now - v; return { at: at, day: dayKey_(at) }; }
function inWindow_(day, execDay, back, fwd) { var n = dayNum_(day), e = dayNum_(execDay); return n >= e - back && n <= e + fwd; }

function cleanRecord_(r, i, now) {
  var key = keyOf_(r, i);
  if (!r || typeof r !== 'object' || Array.isArray(r)) return bad_(key, 'kind');
  var kind = r.kind, a, x;
  if (!has_({ habit: 1, prefs: 1, profile: 1, checkin: 1, thaigiao: 1, kick: 1, letter: 1 }, kind)) return bad_(key, 'kind');
  if (has_({ checkin: 1, thaigiao: 1, kick: 1, letter: 1 }, kind) && !(typeof r.id === 'string' && ID_RE.test(r.id))) return bad_(key, 'id');
  var out = { key: key, kind: kind, id: r.id };
  switch (kind) {
    case 'habit':
      if (!(a = age_(r.ageMs, now))) return bad_(key, 'ageMs');
      out.day = validDay_(r.day);
      if (!out.day || !inWindow_(out.day, a.day, DAY_BACK, DAY_FWD)) return bad_(key, 'day');
      if (!r.marks || typeof r.marks !== 'object' || Array.isArray(r.marks)) return bad_(key, 'marks');
      out.marks = {};
      for (var mk in r.marks) {
        if (!Object.prototype.hasOwnProperty.call(r.marks, mk)) continue;
        if (!has_(HABITS, mk) || !has_(MARKS, r.marks[mk])) return bad_(key, 'marks');
        out.marks[mk] = r.marks[mk];
      }
      out.at = a.at;
      return out;
    case 'prefs':
      if (!(out.enabled = codes_(r.enabled, HABITS, HABIT_ORDER.length)) || !Array.isArray(r.enabled)) return bad_(key, 'enabled');
      return out;
    case 'profile':
      if (!(a = age_(r.ageMs, now))) return bad_(key, 'ageMs');
      if (r.edd === null) out.edd = null;
      else {
        out.edd = validDay_(r.edd);
        if (!out.edd || !inWindow_(out.edd, a.day, -EDD_MIN_OFFSET, EDD_MAX_OFFSET)) return bad_(key, 'edd');
      }
      // born (ngày bấm "Con đã chào đời", AC-138): thiếu = giữ giá trị đang lưu; null = hoàn tác;
      // ngày có thật, không sau ngàyThựcHiện + 1
      if (r.born === undefined) out.born = undefined;
      else if (r.born === null) out.born = null;
      else {
        out.born = validDay_(r.born);
        if (!out.born || dayNum_(out.born) > dayNum_(a.day) + 1) return bad_(key, 'born');
      }
      return out;
    case 'checkin':
      if (!(a = age_(r.ageMs, now))) return bad_(key, 'ageMs');
      out.at = a.at; out.day = a.day;
      if (!(out.emotions = codes_(r.emotions, EMOTIONS, 8))) return bad_(key, 'emotions');
      if (!(x = optInt_(r.before, 0, 10))) return bad_(key, 'before'); out.before = x.v;
      if (!(x = optInt_(r.after, 0, 10))) return bad_(key, 'after'); out.after = x.v;
      if (!(x = optCode_(r.exercise, EXERCISES))) return bad_(key, 'exercise'); out.exercise = x.v;
      if (!(x = optCode_(r.fit, FITS))) return bad_(key, 'fit'); out.fit = x.v;
      if (!(out.contexts = codes_(r.contexts, CONTEXTS, 7))) return bad_(key, 'contexts');
      if (!(x = optInt_(r.minutes, 0, 120))) return bad_(key, 'minutes'); out.minutes = x.v;
      if (r.note === undefined || r.note === null) out.note = '';
      else if ((out.note = cleanText_(r.note, NOTE_MAX)) === null) return bad_(key, 'note');
      return out;
    case 'thaigiao':
      if (!(a = age_(r.ageMs, now))) return bad_(key, 'ageMs');
      out.at = a.at;
      out.day = validDay_(r.day);
      if (!out.day || !inWindow_(out.day, a.day, DAY_BACK, DAY_FWD)) return bad_(key, 'day');
      if (!has_(PROMPTS, r.prompt)) return bad_(key, 'prompt'); out.prompt = r.prompt;
      if (!has_(TG_HOW, r.how)) return bad_(key, 'how'); out.how = r.how;
      return out;
    case 'letter':
      if (!(a = age_(r.ageMs, now))) return bad_(key, 'ageMs');
      out.at = a.at;
      out.day = validDay_(r.day);
      if (!out.day || !inWindow_(out.day, a.day, DAY_BACK, DAY_FWD)) return bad_(key, 'day');
      if (!(x = optCode_(r.prompt, PROMPTS))) return bad_(key, 'prompt'); out.prompt = x.v;
      out.text = cleanText_(r.text, LETTER_MAX);
      if (!out.text) return bad_(key, 'text');
      return out;
    case 'kick':
      return cleanKick_(r, out, now);
  }
  return bad_(key, 'kind');
}

/** Lượt đếm (đặc tả mục con 5.5 + ADR 4.8): số trong khoảng, mã trong danh sách, các số phải khớp nhau. */
function cleanKick_(r, out, now) {
  var key = out.key, x;
  if (!isInt_(r.startAgeMs, 0, AGE_MAX_MS)) return bad_(key, 'startAgeMs');
  out.startAt = now - r.startAgeMs;
  if (!(x = optCode_(r.meal, MEALS))) return bad_(key, 'meal'); out.meal = x.v;
  var f = ['h1', 'h2', 'total'];
  for (var i = 0; i < f.length; i++) { if (!isInt_(r[f[i]], 0, COUNT_MAX)) return bad_(key, f[i]); out[f[i]] = r[f[i]]; }
  if (out.total !== out.h1 + out.h2) return bad_(key, 'total');
  if (!(x = optInt_(r.min4, 0, 120))) return bad_(key, 'min4'); out.min4 = x.v;
  if (!(x = optInt_(r.min10, 0, 120))) return bad_(key, 'min10'); out.min10 = x.v;
  if (!has_(KICK_LEVELS, r.level)) return bad_(key, 'level'); out.level = r.level;
  if (r.hadYellow !== undefined && typeof r.hadYellow !== 'boolean') return bad_(key, 'hadYellow');
  out.hadYellow = r.hadYellow === true;
  if (!(out.reasons = codes_(r.reasons, KICK_REASONS, 4))) return bad_(key, 'reasons');
  if (!(x = optCode_(r.feel, KICK_FEELS))) return bad_(key, 'feel'); out.feel = x.v;
  if (!(out.signs = codes_(r.signs, KICK_SIGNS, 8))) return bad_(key, 'signs');
  if (!(x = optInt_(r.gaDays, 0, GA_DAYS_MAX))) return bad_(key, 'gaDays'); out.gaDays = x.v;
  // Khớp nhau: đỏ ⇔ có lý do; xanh không qua vàng ⇒ giờ 1 ≥ 4; xanh sau vàng ⇒ giờ 1 ≤ 3 và tổng ≥ 10
  if ((out.level === 'red') !== (out.reasons.length > 0)) return bad_(key, 'reasons');
  if (out.level === 'green' && !out.hadYellow && out.h1 < 4) return bad_(key, 'level');
  if (out.level === 'green' && out.hadYellow && !(out.h1 <= 3 && out.total >= 10)) return bad_(key, 'level');
  // Vị trí chạm: ≤ 200 điểm; t nguyên ms không giảm; x, y cùng là số 0–1 hoặc cùng null; h (nếu có) khớp t
  var taps = r.taps === undefined ? [] : r.taps;
  if (!Array.isArray(taps) || taps.length > KICK_MAX_TAPS) return bad_(key, 'taps');
  var pts = [], prev = 0;
  for (var j = 0; j < taps.length; j++) {
    var p = taps[j];
    if (!p || typeof p !== 'object' || Array.isArray(p)) return bad_(key, 'taps');
    if (!isInt_(p.t, prev, KICK_TAP_T_MAX_MS)) return bad_(key, 'taps');
    prev = p.t;
    var xn = p.x === null || p.x === undefined, yn = p.y === null || p.y === undefined;
    if (xn !== yn) return bad_(key, 'taps');
    if (!xn && !(typeof p.x === 'number' && isFinite(p.x) && p.x >= 0 && p.x <= 1 &&
                 typeof p.y === 'number' && isFinite(p.y) && p.y >= 0 && p.y <= 1)) return bad_(key, 'taps');
    if (p.h !== undefined && p.h !== (p.t < KICK_HOUR_MS ? 1 : 2)) return bad_(key, 'taps');
    pts.push({ t: Math.floor(p.t / 1000), x: xn ? null : Math.round(p.x * 1000), y: xn ? null : Math.round(p.y * 1000) });
  }
  out.pts = pts;
  return out;
}
/** Chuỗi điểm do SERVER dựng từ số đã kiểm (không chép chuỗi client): "t,x,y;t,,". */
function ptsString_(pts) {
  return pts.map(function (p) { return p.t + ',' + (p.x === null ? '' : p.x) + ',' + (p.y === null ? '' : p.y); }).join(';');
}
function parsePts_(s) {
  var out = [];
  if (!s) return out;
  var parts = String(s).split(';');
  for (var i = 0; i < parts.length && out.length < KICK_MAX_TAPS; i++) {
    var m = /^(\d{1,4}),(\d{0,4}),(\d{0,4})$/.exec(parts[i]);
    if (!m) continue;
    var hasXY = m[2] !== '' && m[3] !== '';
    var x = hasXY ? +m[2] / 1000 : null, y = hasXY ? +m[3] / 1000 : null;
    if (hasXY && (x > 1 || y > 1)) continue;
    out.push({ t: +m[1] * 1000, x: x, y: y });
  }
  return out;
}
function labels_(codes, map) { return codes.map(function (c) { return map[c]; }).join(', '); }

function saveRecords_(d, s) {
  if (!Array.isArray(d.records)) return err_('bad_records');
  if (d.records.length > BATCH_MAX) return err_('too_many_records');
  var now = now_();
  var items = d.records.map(function (r, i) { return cleanRecord_(r, i, now); });
  return withLock_(function () {
    var user = userByUid_(s.uid);
    if (!user) return err_('session_expired');
    var saved = [], rejected = [], warn = [], ctx = { q: {} };
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.error) { var rj = { key: it.key, error: it.error }; if (it.field) rj.field = it.field; rejected.push(rj); continue; }
      var w = writeRecord_(it, user, now, ctx);
      if (w && w.error) { var rj2 = { key: it.key, error: w.error }; if (w.field) rj2.field = w.field; rejected.push(rj2); continue; }
      saved.push(it.key);
      if (w && w.warn) warn.push({ key: it.key, warn: w.warn });
    }
    var out = { saved: saved, rejected: rejected };
    if (warn.length) out.warn = warn;
    return ok_(out);
  });
}

/**
 * Trần bản ghi MỚI theo người (chống một tài khoản làm đầy Sheet), đếm THẬT trên Sheet (trong lock):
 * - tổng: số dòng của người đó ở tab;
 * - hôm nay: số dòng có "Thời gian ghi" (server) là hôm nay. Dòng mới luôn nằm cuối bảng, nên chỉ cần đọc một khối nhỏ
 *   quanh (DAILY_QUOTA + 1) dòng mới nhất của người đó.
 * Quá trần → record_invalid {field:'quota'}. Sửa bản ghi đã có không bị tính.
 */
function quota_(ctx, kind, uid, now, tab, uidCol, typeCol, type) {
  var c = ctx.q[kind];
  if (!c) {
    var sh = sheet_(tab), rows = findRows_(sh, uidCol, uid), today = fmtDay_(now), lim = DAILY_QUOTA[kind] + 1;
    var tail = rows.slice(-Math.min(rows.length, lim * 3)), daily = 0, total = rows.length;
    if (tail.length) {
      var lo = tail[0], hi = tail[tail.length - 1];
      var block = sh.getRange(lo, 1, hi - lo + 1, Math.max(uidCol, typeCol || 1)).getValues();
      tail.forEach(function (r) {
        var v = block[r - lo];
        if (String(v[uidCol - 1]) !== uid || (typeCol && String(v[typeCol - 1]) !== type)) return;
        if (String(v[0]).slice(-10) === today) daily++;
      });
    }
    c = ctx.q[kind] = { daily: daily, total: total };
  }
  if (c.daily >= DAILY_QUOTA[kind] || c.total >= TOTAL_QUOTA[kind]) return { error: 'record_invalid', field: 'quota' };
  c.daily++; c.total++;
  return null;
}
/** Ghi một bản ghi đã kiểm (đang trong lock). uid luôn lấy từ token, không từ bản ghi. */
function writeRecord_(it, user, now, ctx) {
  var uid = user.uid, o, w = null, q;
  ctx = ctx || { q: {} };
  switch (it.kind) {
    case 'habit': {
      var rows = userRows_(TAB.HABIT, H.UID, uid), row = -1;
      for (var i = 0; i < rows.length; i++) if (cellDay_(rows[i].v[H.DAY - 1]) === it.day) { row = rows[i].row; break; }
      var vals = [uid, it.day];
      HABIT_ORDER.forEach(function (c) { vals.push(MARKS[it.marks[c] || '']); });
      vals.push(fmtTime_(now), it.at);
      writeRow_(TAB.HABIT, row, vals);
      return null;
    }
    case 'prefs': {
      var ordered = HABIT_ORDER.filter(function (c) { return it.enabled.indexOf(c) >= 0; });
      setCells_(TAB.USERS, user.row, U.HABITS, [ordered.length ? ordered.join(', ') : EMPTY_HABITS]);
      user.habits = ordered;
      return null;
    }
    case 'profile': {
      var pr = userRows_(TAB.PROFILE, P.UID, uid);
      var born = it.born === undefined ? (pr.length ? cellDay_(pr[0].v[P.BORN - 1]) : '') : (it.born || '');
      writeRow_(TAB.PROFILE, pr.length ? pr[0].row : -1, [uid, it.edd || '', born || '', fmtTime_(now), now]);
      if (pr.length > 1) deleteRows_(TAB.PROFILE, pr.slice(1).map(function (x) { return x.row; }));
      return null;
    }
    case 'checkin': {
      if ((o = ownedRow_(TAB.CHECKIN, CI.ID, CI.UID, it.id, uid)).conflict) return { error: 'record_invalid', field: 'id' };
      var note = ownedRow_(TAB.PRIV, L.ID, L.UID, it.id, uid, L.TYPE, PRIV_NOTE);
      if (note.conflict) return { error: 'record_invalid', field: 'id' };
      if (o.row < 0 && (q = quota_(ctx, 'checkin', uid, now, TAB.CHECKIN, CI.UID))) return q;
      writeRow_(TAB.CHECKIN, o.row, [fmtTime_(now), uid, it.id, fmtTime_(it.at), labels_(it.emotions, EMOTIONS),
        it.before, it.after, it.exercise ? EXERCISES[it.exercise] : '', it.fit ? FITS[it.fit] : '',
        labels_(it.contexts, CONTEXTS), it.minutes, it.at], 2);
      if (it.note && !user.text) w = { warn: 'note_dropped' };
      else if (it.note) writeRow_(TAB.PRIV, note.row, [fmtTime_(now), uid, PRIV_NOTE, it.id, it.day, '', it.note, it.at], 2);
      else if (user.text && note.row > 0) deleteRows_(TAB.PRIV, note.all);   // chị đã xóa chữ kể thêm
      return w;
    }
    case 'thaigiao':
      if ((o = ownedRow_(TAB.TG, TG.ID, TG.UID, it.id, uid)).conflict) return { error: 'record_invalid', field: 'id' };
      if (o.row < 0 && (q = quota_(ctx, 'thaigiao', uid, now, TAB.TG, TG.UID))) return q;
      writeRow_(TAB.TG, o.row, [fmtTime_(now), uid, it.id, it.day, it.prompt, TG_HOW[it.how], it.at], 2);
      return null;
    case 'letter':
      if (!user.text) return { error: 'text_consent_required' };
      if ((o = ownedRow_(TAB.PRIV, L.ID, L.UID, it.id, uid, L.TYPE, PRIV_LETTER)).conflict) return { error: 'record_invalid', field: 'id' };
      if (o.row < 0 && (q = quota_(ctx, 'letter', uid, now, TAB.PRIV, L.UID, L.TYPE, PRIV_LETTER))) return q;
      writeRow_(TAB.PRIV, o.row, [fmtTime_(now), uid, PRIV_LETTER, it.id, it.day, it.prompt || '', it.text, it.at], 2);
      return null;
    case 'kick': {
      var kr = ownedRow_(TAB.KICK, K.ID, K.UID, it.id, uid), tr = ownedRow_(TAB.TAPS, T.ID, T.UID, it.id, uid);
      if (kr.conflict || tr.conflict) return { error: 'record_invalid', field: 'id' };
      if (kr.row < 0 && (q = quota_(ctx, 'kick', uid, now, TAB.KICK, K.UID))) return q;
      var ga = it.gaDays === null ? '' : Math.floor(it.gaDays / 7) + ' tuần ' + (it.gaDays % 7) + ' ngày';
      writeRow_(TAB.KICK, kr.row, [fmtTime_(now), uid, it.id, fmtTime_(it.startAt), it.meal ? MEALS[it.meal] : '',
        it.h1, it.h2, it.total, it.min4, it.min10, KICK_LEVELS[it.level], it.hadYellow ? 'Có' : 'Không',
        labels_(it.reasons, KICK_REASONS), it.feel ? KICK_FEELS[it.feel] : '', labels_(it.signs, KICK_SIGNS),
        it.gaDays, ga, it.startAt], 2);
      writeRow_(TAB.TAPS, tr.row, [uid, it.id, it.pts.length, ptsString_(it.pts), it.startAt]);
      return null;
    }
  }
  return { error: 'record_invalid', field: 'kind' };
}

/* ----- listMine / exportMine: chỉ dữ liệu của uid trong token ----- */
var REV_ = {};
function rev_(name, map) {
  if (!REV_[name]) { var r = {}; for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) r[map[k]] = k; REV_[name] = r; }
  return REV_[name];
}
function revOne_(name, map, label) { var r = rev_(name, map); var s = String(label == null ? '' : label); return has_(r, s) ? r[s] : null; }
function revList_(name, map, s) {
  if (!s) return [];
  var r = rev_(name, map), out = [];
  String(s).split(', ').forEach(function (l) { if (has_(r, l) && out.indexOf(r[l]) < 0) out.push(r[l]); });
  return out;
}
function intOrNull_(v, lo, hi) { var n = num_(v); return (n !== null && isInt_(n, lo, hi)) ? n : null; }

function collect_(user, kinds, sinceDay, withText, out) {
  var uid = user.uid, truncated = false;
  var since = dayNum_(sinceDay);
  function keep(arr) { if (arr.length > LIST_MAX_PER_KIND) { truncated = true; return arr.slice(arr.length - LIST_MAX_PER_KIND); } return arr; }
  var privRows = null;
  function priv() { if (!privRows) privRows = userRows_(TAB.PRIV, L.UID, uid); return privRows; }
  if (kinds.habit) {
    out.habit = keep(userRows_(TAB.HABIT, H.UID, uid).map(function (r) {
      var day = cellDay_(r.v[H.DAY - 1]);
      if (!day || dayNum_(day) < since) return null;
      var marks = {};
      HABIT_ORDER.forEach(function (c, i) { marks[c] = revOne_('marks', MARKS, r.v[H.MARK0 - 1 + i]) || ''; });
      return { day: day, marks: marks };
    }).filter(Boolean).sort(function (a, b) { return a.day < b.day ? -1 : 1; }));
  }
  if (kinds.prefs) out.prefs = { enabled: user.habits };
  if (kinds.profile) out.profile = profileOf_(uid);
  if (kinds.checkin) {
    var notes = {};
    if (withText) priv().forEach(function (r) { if (String(r.v[L.TYPE - 1]) === PRIV_NOTE) notes[String(r.v[L.ID - 1])] = String(r.v[L.TEXT - 1]); });
    out.checkin = keep(userRows_(TAB.CHECKIN, CI.UID, uid).map(function (r) {
      var at = num_(r.v[CI.EPOCH - 1]);
      if (at === null || Math.floor((at + TZ_OFFSET_MIN * 60000) / 86400000) < since) return null;
      var id = String(r.v[CI.ID - 1]);
      var o = { id: id, at: at, emotions: revList_('emo', EMOTIONS, r.v[CI.EMO - 1]),
        before: intOrNull_(r.v[CI.BEFORE - 1], 0, 10), after: intOrNull_(r.v[CI.AFTER - 1], 0, 10),
        exercise: revOne_('ex', EXERCISES, r.v[CI.EX - 1]), fit: revOne_('fit', FITS, r.v[CI.FIT - 1]),
        contexts: revList_('ctx', CONTEXTS, r.v[CI.CTX - 1]), minutes: intOrNull_(r.v[CI.MIN - 1], 0, 120) };
      if (withText && has_(notes, id)) o.note = notes[id];
      return o;
    }).filter(Boolean).sort(function (a, b) { return a.at - b.at; }));
  }
  if (kinds.thaigiao) {
    out.thaigiao = keep(userRows_(TAB.TG, TG.UID, uid).map(function (r) {
      var day = cellDay_(r.v[TG.DAY - 1]);
      if (!day || dayNum_(day) < since) return null;
      return { id: String(r.v[TG.ID - 1]), at: num_(r.v[TG.EPOCH - 1]), day: day,
               prompt: has_(PROMPTS, String(r.v[TG.PROMPT - 1])) ? String(r.v[TG.PROMPT - 1]) : null,
               how: revOne_('how', TG_HOW, r.v[TG.HOW - 1]) };
    }).filter(Boolean).sort(function (a, b) { return a.at - b.at; }));
  }
  if (kinds.kick) {
    var taps = {};
    userRows_(TAB.TAPS, T.UID, uid).forEach(function (r) { taps[String(r.v[T.ID - 1])] = parsePts_(r.v[T.PTS - 1]); });
    out.kick = keep(userRows_(TAB.KICK, K.UID, uid).map(function (r) {
      var startAt = num_(r.v[K.EPOCH - 1]);
      if (startAt === null || Math.floor((startAt + TZ_OFFSET_MIN * 60000) / 86400000) < since) return null;
      var id = String(r.v[K.ID - 1]);
      return { id: id, startAt: startAt, meal: revOne_('meal', MEALS, r.v[K.MEAL - 1]),
        h1: intOrNull_(r.v[K.H1 - 1], 0, COUNT_MAX), h2: intOrNull_(r.v[K.H2 - 1], 0, COUNT_MAX),
        total: intOrNull_(r.v[K.TOTAL - 1], 0, COUNT_MAX), min4: intOrNull_(r.v[K.MIN4 - 1], 0, 120),
        min10: intOrNull_(r.v[K.MIN10 - 1], 0, 120), level: revOne_('lv', KICK_LEVELS, r.v[K.LEVEL - 1]),
        hadYellow: String(r.v[K.YELLOW - 1]) === 'Có', reasons: revList_('rs', KICK_REASONS, r.v[K.REASONS - 1]),
        feel: revOne_('feel', KICK_FEELS, r.v[K.FEEL - 1]), signs: revList_('sg', KICK_SIGNS, r.v[K.SIGNS - 1]),
        gaDays: intOrNull_(r.v[K.GA - 1], 0, GA_DAYS_MAX), taps: has_(taps, id) ? taps[id] : [] };
    }).filter(Boolean).sort(function (a, b) { return a.startAt - b.startAt; }));
  }
  if (kinds.letter) {
    out.letter = !withText ? [] : keep(priv().map(function (r) {
      if (String(r.v[L.TYPE - 1]) !== PRIV_LETTER) return null;
      var day = cellDay_(r.v[L.DAY - 1]);
      if (!day || dayNum_(day) < since) return null;
      var pr = String(r.v[L.PROMPT - 1]);
      return { id: String(r.v[L.ID - 1]), at: num_(r.v[L.EPOCH - 1]), day: day, prompt: has_(PROMPTS, pr) ? pr : null,
               text: String(r.v[L.TEXT - 1]) };
    }).filter(Boolean).sort(function (a, b) { return a.at - b.at; }));
  }
  return truncated;
}
function kindSet_(kinds) {
  var o = {};
  (kinds === undefined ? LIST_KINDS : kinds).forEach(function (k) { if (LIST_KINDS.indexOf(k) >= 0) o[k] = 1; });
  return o;
}
function listMine_(d, s) {
  if (d.kinds !== undefined && !Array.isArray(d.kinds)) return err_('bad_records');
  var now = now_(), today = dayKey_(now);
  var since = d.sinceDay === undefined || d.sinceDay === null ? addDays_(today, -LIST_DEFAULT_DAYS) : validDay_(d.sinceDay);
  if (!since) return err_('bad_records');
  var user = userByUid_(s.uid);
  if (!user) return err_('session_expired');
  var records = {};
  // checkin.note và letter chỉ trả khi đồng ý gửi chữ đang bật
  var truncated = collect_(user, kindSet_(d.kinds), since, user.text, records);
  return ok_({ records: records, serverDay: today, truncated: truncated });
}
/** Xuất mọi thứ đang lưu về chị (kể cả chữ đã gửi trước khi chị tắt đồng ý mà chọn "Giữ"). */
function exportMine_(d, s) {
  var user = userByUid_(s.uid);
  if (!user) return err_('session_expired');
  var records = {};
  var truncated = collect_(user, kindSet_(undefined), '2000-01-01', true, records);
  return ok_({ account: { phoneMasked: maskPhone_(e164Of_(user)), createdAt: user.createdAt, consent: consentOut_(user),
                          edd: records.profile ? records.profile.edd : null, born: records.profile ? records.profile.born : null },
               records: records, truncated: truncated });
}

/* ----- deleteRecords ----- */
function deleteRecords_(d, s) {
  if (!Array.isArray(d.items)) return err_('bad_records');
  if (d.items.length > DELETE_MAX) return err_('too_many_records');
  var items = [];
  for (var i = 0; i < d.items.length; i++) {
    var it = d.items[i];
    if (!it || typeof it !== 'object') return err_('bad_records');
    if (it.kind === 'habit') { var day = validDay_(it.day); if (!day) return err_('bad_records'); items.push({ kind: 'habit', day: day }); }
    else if (has_({ checkin: 1, thaigiao: 1, kick: 1, letter: 1 }, it.kind) && typeof it.id === 'string' && ID_RE.test(it.id)) items.push({ kind: it.kind, id: it.id });
    else return err_('bad_records');
  }
  return withLock_(function () {
    var uid = s.uid, del = {}, n = 0;
    function mark(tab, rows) { if (!rows.length) return false; del[tab] = (del[tab] || []).concat(rows); return true; }
    function mineById(tab, idCol, uidCol, id, typeCol, type) {
      var sh = sheet_(tab), out = [];
      findRows_(sh, idCol, id).forEach(function (r) {
        var v = sh.getRange(r, 1, 1, SCHEMA[tab].length).getValues()[0];
        if (String(v[uidCol - 1]) === uid && (!typeCol || String(v[typeCol - 1]) === type)) out.push(r);
      });
      return out;
    }
    var habitRows = null;
    items.forEach(function (it) {
      var hit = false;
      if (it.kind === 'habit') {
        if (!habitRows) habitRows = userRows_(TAB.HABIT, H.UID, uid);
        hit = mark(TAB.HABIT, habitRows.filter(function (r) { return cellDay_(r.v[H.DAY - 1]) === it.day; }).map(function (r) { return r.row; }));
      } else if (it.kind === 'checkin') {
        hit = mark(TAB.CHECKIN, mineById(TAB.CHECKIN, CI.ID, CI.UID, it.id));
        hit = mark(TAB.PRIV, mineById(TAB.PRIV, L.ID, L.UID, it.id, L.TYPE, PRIV_NOTE)) || hit;
      } else if (it.kind === 'thaigiao') {
        hit = mark(TAB.TG, mineById(TAB.TG, TG.ID, TG.UID, it.id));
      } else if (it.kind === 'kick') {
        hit = mark(TAB.KICK, mineById(TAB.KICK, K.ID, K.UID, it.id));
        hit = mark(TAB.TAPS, mineById(TAB.TAPS, T.ID, T.UID, it.id)) || hit;
      } else if (it.kind === 'letter') {
        hit = mark(TAB.PRIV, mineById(TAB.PRIV, L.ID, L.UID, it.id, L.TYPE, PRIV_LETTER));
      }
      if (hit) n++;
    });
    for (var tab in del) if (Object.prototype.hasOwnProperty.call(del, tab)) deleteRows_(tab, del[tab]);
    return ok_({ deleted: n });
  });
}

/* ----- setConsent ----- */
function setConsent_(d, s) {
  if (typeof d.text !== 'boolean' || (d.deleteText !== undefined && typeof d.deleteText !== 'boolean')) return err_('bad_json');
  return withLock_(function () {
    var user = userByUid_(s.uid);
    if (!user) return err_('session_expired');
    setCells_(TAB.USERS, user.row, U.TEXT, [d.text ? 'Có · ' + fmtDay_(now_()) : '']);
    user.text = d.text;
    if (!d.text && d.deleteText === true) deleteRows_(TAB.PRIV, findRows_(sheet_(TAB.PRIV), L.UID, user.uid));
    return ok_({ consent: consentOut_(user) });
  });
}

/* ----- deleteAccount: xóa mọi dòng của người này ở CẢ HAI file ----- */
function deleteUserData_(user) {
  revokeAll_(user.uid);
  var byUid = [[TAB.SESS, S.UID], [TAB.HABIT, H.UID], [TAB.CHECKIN, CI.UID], [TAB.TG, TG.UID], [TAB.KICK, K.UID],
               [TAB.TAPS, T.UID], [TAB.PROFILE, P.UID], [TAB.PRIV, L.UID]];
  byUid.forEach(function (x) { deleteRows_(x[0], findRows_(sheet_(x[0]), x[1], user.uid)); });
  if (user.pkey) deleteRows_(TAB.FAIL, findRows_(sheet_(TAB.FAIL), F.KEY, user.pkey));
  deleteRows_(TAB.USERS, findRows_(sheet_(TAB.USERS), U.UID, user.uid));
}
function deleteAccount_(d, s) {
  if (d.confirm !== 'DELETE') return err_('confirm_required');
  return withLock_(function () {
    var user = userByUid_(s.uid);
    if (!user) return err_('session_expired');
    deleteUserData_(user);
    return ok_({});
  });
}

/* =====================================================================
 *  MENU TRÊN SHEET (chỉ người có quyền sửa file thấy) — đặt lại PIN, kiểm tra, dọn
 * ===================================================================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Mẹ Bầu An Yên')
    .addItem('Đặt lại mã PIN cho một số điện thoại…', 'menuResetPin')
    .addItem('Kiểm tra cài đặt', 'menuCheckSetup')
    .addItem('Dọn phiên hết hạn', 'menuCleanup')
    .addToUi();
}

/**
 * Đặt lại PIN (S-06, ADR 4.6): sinh mã 6 số hạn 24 giờ, lưu BĂM của mã, xóa băm PIN (mã cũ hết dùng ngay),
 * thu hồi mọi phiên, đếm sai về 0. Trả mã thô CHỈ để hiện trong hộp thoại; không ghi Sheet, không log.
 */
function resetPinFor_(raw) {
  REQ_ = null;
  try {
    var phone = normalizePhone_(raw);
    if (!phone) return { error: 'phone_invalid' };
    if (!ready_()) return { error: 'server_not_ready' };
    var pepper = pepper_();
    var pkey = phoneKey_(phone, pepper);
    return withLock_(function () {
      var user = userByKey_(pkey);
      if (!user) return { error: 'not_found' };
      var now = now_(), code = randomDigits6_(), exp = now + RESET_VALID_HOURS * 3600000;
      setCells_(TAB.USERS, user.row, U.HASH, ['']);
      setCells_(TAB.USERS, user.row, U.RHASH, [resetCodeHash_(pepper, user.uid, code), exp]);
      setCells_(TAB.USERS, user.row, U.RESET_NOTE, ['Đang chờ chị đặt mã mới – hạn ' + fmtShort_(exp)]);
      revokeAll_(user.uid);
      var f = failLoad_(pkey);
      if (f.row > 0) { f.count = 0; f.lock = 0; failSave_(f, now); }
      return { code: code, exp: exp, masked: maskPhone_(phone), expText: fmtShort_(exp) };
    });
  } finally { REQ_ = null; }
}
function menuResetPin() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('Đặt lại mã PIN', 'Số điện thoại của chị (ví dụ 0912 345 678):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  var r;
  try { r = resetPinFor_(resp.getResponseText()); } catch (busy) { r = { error: 'busy' }; }
  var msg = {
    phone_invalid: 'Số điện thoại chưa đúng định dạng Việt Nam.',
    not_found: 'Không thấy tài khoản nào dùng số này.',
    server_not_ready: 'Chưa cài xong: chạy hàm setup trước (bước 3 ở đầu script).',
    busy: 'Sheet đang bận, anh/chị thử lại sau ít giây.'
  };
  if (r.error) { ui.alert('Đặt lại mã PIN', msg[r.error] || 'Chưa đặt lại được.', ui.ButtonSet.OK); return; }
  ui.alert('Mã đặt lại cho số ' + r.masked,
    'Mã đặt lại: ' + r.code + '\n\nHạn dùng: ' + r.expText + ' (24 giờ).\n' +
    'Đọc mã này cho chị (gọi lại đúng số đó hoặc tại quầy). Mã KHÔNG được lưu ở đâu: đóng hộp thoại là không xem lại được.\n' +
    'Mã PIN cũ đã hết dùng; mọi máy đang đăng nhập bằng số này đã bị đăng xuất.', ui.ButtonSet.OK);
}
/** Kiểm tra cài đặt; không bao giờ hiện pepper. */
function checkSetup_() {
  REQ_ = null;
  var lines = [], ok = true;
  var p = props_().getProperty('PIN_PEPPER');
  if (pepper_()) lines.push('PIN_PEPPER: có (đã sao lưu chưa? xem bước 4)');
  else { ok = false; lines.push(p ? 'PIN_PEPPER: SAI DẠNG – không sửa tay; liên hệ đội' : 'PIN_PEPPER: CHƯA CÓ – chạy setup'); }
  var id = props_().getProperty('PRIVATE_SHEET_ID');
  if (!id) { ok = false; lines.push('File "Chữ riêng": CHƯA CÓ – chạy setup'); }
  else {
    try { var pss = SpreadsheetApp.openById(id); lines.push('File "Chữ riêng": mở được (' + pss.getName() + ')' + (pss.getSheetByName(TAB.PRIV) ? '' : ' – thiếu tab ChuRieng, chạy setup')); }
    catch (e) { ok = false; lines.push('File "Chữ riêng": KHÔNG MỞ ĐƯỢC – kiểm PRIVATE_SHEET_ID'); }
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet(), miss = [];
  DATA_TABS.forEach(function (n) { if (!ss.getSheetByName(n)) miss.push(n); });
  if (miss.length) { ok = false; lines.push('Thiếu tab: ' + miss.join(', ') + ' – chạy setup'); } else lines.push('Đủ 9 tab dữ liệu');
  var trig = false;
  try { trig = hasCleanupTrigger_(); } catch (e) { trig = false; }
  if (trig) lines.push('Trình kích hoạt cleanupDaily: có');
  else { ok = false; lines.push('Trình kích hoạt cleanupDaily: CHƯA CÓ – chạy lại setup hoặc làm BƯỚC 10'); }
  if (id) { var cw = cellWarnings_(); if (cw.length) { ok = false; lines = lines.concat(cw); } else lines.push('Số ô: dưới 70 % trần'); }
  lines.push('Số vòng băm PIN_HASH_ITER = ' + PIN_HASH_ITER + ' · RESET_REQUIRE_CODE = ' + RESET_REQUIRE_CODE + ' · ALLOW_PUBLIC_READ = ' + ALLOW_PUBLIC_READ);
  REQ_ = null;
  return { ok: ok, lines: lines };
}
function menuCheckSetup() {
  var r = checkSetup_();
  SpreadsheetApp.getUi().alert(r.ok ? 'Cài đặt: ỔN' : 'Cài đặt: CẦN SỬA', r.lines.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}
function menuCleanup() {
  var r = cleanupDaily_();
  SpreadsheetApp.getUi().alert('Đã dọn', 'Phiên: ' + r.sessions + ' · Lượt sai cũ: ' + r.fails + ' · Mã đặt lại quá hạn: ' + r.resets +
    (INACTIVE_DELETE_MONTHS > 0 ? ' · Tài khoản lâu không dùng: ' + r.inactive : '') + (r.warnings.length ? '\n' + r.warnings.join('\n') : ''), SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Dọn: phiên hết hạn/đã thu hồi, lượt sai cũ, mã đặt lại quá hạn, (tùy chọn) tài khoản lâu không dùng. */
function cleanupDaily_() {
  REQ_ = null;
  try {
    return withLock_(function () {
      var now = now_(), out = { sessions: 0, fails: 0, resets: 0, inactive: 0 };
      var ss = sheet_(TAB.SESS), last = ss.getLastRow(), del = [], keys = [];
      if (last >= 2) ss.getRange(2, 1, last - 1, S.N).getValues().forEach(function (v, i) {
        if (String(v[S.REVOKED - 1]) !== '' || !((num_(v[S.EXP - 1]) || 0) > now)) { del.push(i + 2); keys.push(String(v[S.HASH - 1])); }
      });
      if (keys.length) tombstone_(keys);
      out.sessions = deleteRows_(TAB.SESS, del);
      var fs = sheet_(TAB.FAIL); last = fs.getLastRow(); del = [];
      if (last >= 2) fs.getRange(2, 1, last - 1, F.N).getValues().forEach(function (v, i) {
        if (!((num_(v[F.LOCK - 1]) || 0) > now) && now - (num_(v[F.LAST - 1]) || 0) > FAIL_RESET_HOURS * 3600000) del.push(i + 2);
      });
      out.fails = deleteRows_(TAB.FAIL, del);
      var us = sheet_(TAB.USERS); last = us.getLastRow();
      var inactive = [];
      if (last >= 2) us.getRange(2, 1, last - 1, U.N).getValues().forEach(function (v, i) {
        var rexp = num_(v[U.REXP - 1]) || 0;
        if (String(v[U.RHASH - 1]) !== '' && rexp && rexp <= now) {
          setCells_(TAB.USERS, i + 2, U.RHASH, ['', '']);
          setCells_(TAB.USERS, i + 2, U.RESET_NOTE, ['Mã đặt lại đã hết hạn – cần đặt lại lần nữa']);
          out.resets++;
        }
        if (INACTIVE_DELETE_MONTHS > 0) {
          var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v[U.LAST - 1]));
          if (m && now - Date.UTC(+m[3], +m[2] - 1, +m[1]) > INACTIVE_DELETE_MONTHS * 30 * 86400000) inactive.push(String(v[U.UID - 1]));
        }
      });
      inactive.forEach(function (uid) { var u = userByUid_(uid); if (u) { deleteUserData_(u); out.inactive++; } });
      out.warnings = cellWarnings_();
      out.warnings.forEach(function (w) { Logger.log('cleanupDaily: ' + w); });
      return out;
    });
  } finally { REQ_ = null; }
}

/* =====================================================================
 *  CÀI ĐẶT, ĐO SỐ VÒNG, TỰ KIỂM TRA (chạy trong editor)
 * ===================================================================== */
/** Tạo 9 tab + file Chữ riêng + pepper. Chạy lại an toàn: chỉ thêm, không ghi đè pepper. */
function setup_() {
  REQ_ = null;
  try {
    return withLock_(function () {
      var props = props_();
      var existing = props.getProperty('PIN_PEPPER');
      if (!existing) props.setProperty('PIN_PEPPER', sha256hex_(uuidHex_() + uuidHex_() + uuidHex_() + uuidHex_()));
      else if (!/^[0-9a-f]{64}$/.test(existing)) throw new Error('PIN_PEPPER đang có nhưng sai dạng: KHÔNG ghi đè. Kiểm lại Thuộc tính tập lệnh.');
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      DATA_TABS.forEach(function (n) { ensureTab_(ss, n); });
      // Tab trống mặc định của file mới ("Trang tính1" / "Sheet1") thì bỏ cho gọn; có dữ liệu thì giữ nguyên
      ss.getSheets().forEach(function (sh) {
        if ((sh.getName() === 'Trang tính1' || sh.getName() === 'Sheet1') && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
      });
      PROTECTED_TABS.forEach(function (n) {
        var sh = ss.getSheetByName(n);
        if (!sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) {
          sh.protect().setDescription('Mẹ Bầu An Yên: không sửa tay (đặt lại PIN dùng menu)').setWarningOnly(true);
        }
      });
      var id = props.getProperty('PRIVATE_SHEET_ID'), priv;
      if (id) {
        try { priv = SpreadsheetApp.openById(id); }
        catch (e) { throw new Error('Không mở được file Chữ riêng theo PRIVATE_SHEET_ID. Kiểm lại ID; setup không tự tạo file mới để khỏi lạc dữ liệu.'); }
      } else {
        priv = SpreadsheetApp.create(PRIVATE_FILE_NAME);
        props.setProperty('PRIVATE_SHEET_ID', priv.getId());
      }
      var first = priv.getSheets()[0];
      ensureTab_(priv, TAB.PRIV);
      if (first && first.getName() !== TAB.PRIV && first.getLastRow() === 0 && priv.getSheets().length > 1) priv.deleteSheet(first);
      var trig = ensureCleanupTrigger_();
      Logger.log('setup: đủ 9 tab ở file này; file Chữ riêng: ' + priv.getUrl());
      Logger.log(trig ? 'setup: đã có trình kích hoạt cleanupDaily chạy hằng ngày lúc 2 giờ sáng'
                      : 'setup: CHƯA cài được trình kích hoạt cleanupDaily – làm tay theo BƯỚC 10 (bắt buộc)');
      Logger.log('setup: nhớ SAO LƯU PIN_PEPPER (bước 4). setup: XONG');
      return { privateUrl: priv.getUrl() };
    });
  } finally { REQ_ = null; }
}
/** Số ô lưới của từng file; dòng cảnh báo khi vượt CELL_WARN_RATIO trần ô. */
function cellWarnings_() {
  var out = [];
  var files = [SpreadsheetApp.getActiveSpreadsheet()];
  try { var id = props_().getProperty('PRIVATE_SHEET_ID'); if (id) files.push(SpreadsheetApp.openById(id)); } catch (e) { /* checkSetup_ đã báo */ }
  files.forEach(function (f) {
    var cells = 0;
    f.getSheets().forEach(function (sh) { cells += sh.getMaxRows() * sh.getMaxColumns(); });
    if (cells > CELL_LIMIT * CELL_WARN_RATIO) {
      out.push('CẢNH BÁO: file "' + f.getName() + '" đã dùng ' + Math.round(cells / CELL_LIMIT * 100) + ' % trần 10 triệu ô – báo đội để lưu trữ năm cũ (ADR 0005 mục 8)');
    }
  });
  return out;
}
/** Trình kích hoạt dọn dẹp hằng ngày là BẮT BUỘC (không có thì phiên hết hạn, lượt sai cũ tích lại). */
function hasCleanupTrigger_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'cleanupDaily'; });
}
function ensureCleanupTrigger_() {
  try {
    if (!hasCleanupTrigger_()) ScriptApp.newTrigger('cleanupDaily').timeBased().everyDays(1).atHour(2).create();
    return hasCleanupTrigger_();
  } catch (e) { return false; }
}
/** Đo thời gian băm để chọn PIN_HASH_ITER. Không log PIN. */
function benchPinHash_() {
  var pepper = pepper_() || random64_(), salt = newSalt_(), pin = String(100000 + (parseInt(uuidHex_().slice(0, 6), 16) % 900000));
  var out = [];
  [1000, 2000, 5000].forEach(function (n) {
    var t0 = new Date().getTime();
    hashPin_(pin, salt, n, pepper);
    var ms = new Date().getTime() - t0;
    out.push({ iter: n, ms: ms });
    Logger.log('benchPinHash_: ' + n + ' vòng = ' + ms + ' ms');
  });
  Logger.log('benchPinHash_: chọn số vòng lớn nhất còn trong 300–800 ms, sửa PIN_HASH_ITER (đang là ' + PIN_HASH_ITER + ').');
  return out;
}
/** Tự kiểm tra trên Sheet thật: SĐT thử ngẫu nhiên, tài khoản thử tự xóa. Không log PIN, token. */
function test_() {
  var post = function (o) { return JSON.parse(doPost({ postData: { contents: JSON.stringify(o) } }).getContent()); };
  var say = function (name, ok) { Logger.log('test_: ' + name + (ok ? ' → đúng' : ' → SAI')); return ok; };
  var all = true;
  all = say('ping ready', post({ action: 'ping' }).ready === true) && all;
  all = say('GET không trả dữ liệu', JSON.parse(doGet({ parameter: {} }).getContent()).error === 'public_read_disabled') && all;
  var phone, pin;
  do { phone = '09' + String(parseInt(uuidHex_().slice(0, 8), 16) % 100000000 + 100000000).slice(1); } while (!normalizePhone_(phone));
  do { pin = String(parseInt(uuidHex_().slice(0, 6), 16) % 1000000 + 1000000).slice(1); } while (isWeakPin_(pin, normalizePhone_(phone)));
  var reg = post({ action: 'register', phone: phone, pin: pin, privateDevice: false, consent: { sheet: true, text: false, version: '0.2' } });
  all = say('đăng ký', reg.result === 'success') && all;
  if (reg.result === 'success') {
    var tk = reg.token, today = dayKey_(now_());
    var sv = post({ action: 'saveRecords', token: tk, records: [
      { kind: 'habit', day: today, marks: { water: 'x' }, ageMs: 0 },
      { kind: 'kick', id: 'test' + uuidHex_().slice(0, 16), startAgeMs: 0, meal: null, h1: 4, h2: 0, total: 4, min4: 20, min10: null,
        level: 'green', hadYellow: false, reasons: [], feel: 'same', signs: [], taps: [{ t: 1000, x: 0.5, y: 0.5 }, { t: 5000, x: null, y: null }] },
      { kind: 'thaigiao', id: 'test' + uuidHex_().slice(0, 16), ageMs: 0, day: today, prompt: '=IMPORTXML("x";"//a")', how: 'done' }] });
    all = say('ghi 2 bản ghi, chặn 1 bản ghi có công thức', sv.saved && sv.saved.length === 2 && sv.rejected.length === 1) && all;
    var ls = post({ action: 'listMine', token: tk, kinds: ['habit', 'kick'] });
    all = say('đọc lại của chính mình', ls.result === 'success' && ls.records.kick.length === 1 && ls.records.kick[0].taps.length === 2) && all;
    all = say('token sai bị từ chối', post({ action: 'whoami', token: tk.replace(/^./, tk.charAt(0) === 'a' ? 'b' : 'a') }).error === 'session_expired') && all;
    var wrong = pin === '258147' ? '369258' : '258147';
    all = say('sai PIN báo còn 4 lần', post({ action: 'login', phone: phone, pin: wrong }).remaining === 4) && all;
    all = say('xóa tài khoản thử', post({ action: 'deleteAccount', token: tk, confirm: 'DELETE' }).result === 'success') && all;
    all = say('phiên đã hết sau khi xóa', post({ action: 'whoami', token: tk }).error === 'session_expired') && all;
  }
  Logger.log(all ? 'test_: XONG' : 'test_: CÓ MỤC SAI – gửi Nhật ký thực thi cho đội (không chứa PIN, token)');
  return all;
}

/* ===== Tên chạy được trong ô chọn hàm của editor / menu / trình kích hoạt =====
   (Apps Script ẩn hàm có dấu _ ở cuối khỏi ô chọn hàm, nên mỗi hàm cài đặt có một tên không dấu _) */
function setup() { return setup_(); }
function benchPinHash() { return benchPinHash_(); }
function selfTest() { return test_(); }
function cleanupDaily() { return cleanupDaily_(); }
