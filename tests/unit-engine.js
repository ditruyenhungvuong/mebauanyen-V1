/* =========================================================
   Unit test engine an toàn – Mẹ Bầu An Yên (tests/unit-engine.js)
   Người viết: FE-2 (T-02), vì T-Q1 chưa tạo file này. QA TIẾP QUẢN file này (tech design 14.1); FE-2 không sửa nữa sau khi giao.
   Chủ: qa-tester (T-Q1, tiếp quản 29/10/2026). Phần 1–11 của FE-2 giữ NGUYÊN VĂN; phần "QA thêm" ở cuối file (hàm qaCases)
   dùng tests/lib/harness.js (PASS/FAIL/CHỜ). Tổng kết: có FAIL ở bất kỳ phần nào → exit 1.
   Chạy (Node ≥ 22, không cần trình duyệt):  $NODE tests/unit-engine.js        (FAIL → exit 1)
   Nạp js/config.js → js/data.js → js/engine.js vào vm với `window` giả (tests/lib/load.js chưa có — QA có thể thay loader).
   Nếu có apps/STOP-4P-Healthcare-Staff bên cạnh: nạp thêm engine STOP-4P để so khác biệt nhóm tự hại từng câu.
   Bộ câu:
   1. SAFETY_BANK chép NGUYÊN VĂN từ apps/STOP-4P-Healthcare-Staff/tests/e2e.js (373 câu, bản sau review lần 7), cùng các danh sách
      C-1 / K-1 / T-02 viết trong kịch bản `safety` của file đó (AC-23, AC-24, PRD 9.2).
   2. Nhóm thai kỳ mới hai chiều: 9.2b, 9.3 (mỗi dòng ≥ 2 câu bắt + ≥ 1 câu không bắt), 9.4b, 9.5 (PRD 9.9).
   3. PII (9.8, 9.9, AC-22, AC-65), gợi ý (AC-30, 34, 35, 36), dữ liệu (AC-08), lý do trang khẩn (R-15), PIN yếu (AC-81).
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.resolve(__dirname, '..');
const STOP4P = path.resolve(APP, '..', 'STOP-4P-Healthcare-Staff');
let fails = 0, passes = 0;
const failed = [];
const T = (name, ok, detail) => {
  if (ok) passes++; else { fails++; failed.push(name); }
  if (!ok || process.argv.includes('-v')) console.log((ok ? 'PASS ' : 'FAIL ') + name + (!ok && detail !== undefined ? '  → ' + String(detail).slice(0, 400) : ''));
};
const section = s => console.log('\n=== ' + s + ' ===');

function loadApp(features) {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  for (const f of ['config', 'data', 'engine']) vm.runInContext(fs.readFileSync(path.join(APP, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  const C = ctx.window.LSTP_CONFIG;
  if (features) Object.assign(C.FEATURES, features);
  return { C, D: ctx.window.LSTP_DATA, E: ctx.window.LSTP_ENGINE };
}
function loadStop4p() {
  if (!fs.existsSync(path.join(STOP4P, 'js', 'engine.js'))) return null;
  const ctx = { window: {}, location: { hostname: 'localhost', protocol: 'http:' }, console };
  vm.createContext(ctx);
  for (const f of ['config', 'data', 'engine']) vm.runInContext(fs.readFileSync(path.join(STOP4P, 'js', f + '.js'), 'utf8'), ctx, { filename: 'stop4p-' + f + '.js' });
  return { D: ctx.window.STOP4P_DATA, E: ctx.window.STOP4P_ENGINE };
}

const { C, D, E } = loadApp();
const S4 = loadStop4p();

/* ===== Bộ câu STOP-4P (chép nguyên văn từ apps/STOP-4P-Healthcare-Staff/tests/e2e.js) ===== */
const SAFETY_BANK = [["hom qua minh tu hai","urgent","proto4"],
  ["toi da tu hai","urgent","proto4"],
  ["minh hay tu hai","urgent","proto4"],
  ["nghi den chuyen tu hai","urgent","proto4"],
  ["co y nghi tu hai","urgent","proto4"],
  ["toi rach tay","urgent","proto4"],
  ["da rach tay roi","urgent","proto4"],
  ["lay dao rach tay","urgent","proto4"],
  ["minh muon tu hai","urgent","proto4"],
  ["toi muon rach tay","urgent","proto4"],
  ["tu hai ban than","urgent","proto4"],
  ["nghi toi tu hai minh","urgent","proto4"],
  ["minh da tu rach tay","urgent","proto4"],
  ["hom qua rach co tay","urgent","proto4"],
  ["muon tu hai.","urgent","proto4"],
  ["tu hai","urgent","proto4"],
  ["dang nghi den tu hai","urgent","proto4"],
  ["tu lam hai ban than","urgent","proto4"],
  ["muon cat tay","urgent","proto4"],
  ["toi muon cat co tay","urgent","proto4"],
  ["muon ket lieu ban than","urgent","proto4"],
  ["uong thuoc de chet","urgent","proto4"],
  ["muon bien mat mai mai","urgent","proto4"],
  ["khong con ly do song","urgent","proto4"],
  ["da tu hai 2 lan","urgent","proto4"],
  ["tu hai 3 lan roi","urgent","proto4"],
  ["tu hai ca dem","urgent","proto4"],
  ["toi tu hai toi qua","urgent","proto4"],
  ["tu hai den chay mau","urgent","proto4"],
  ["tu hai qua nhieu","urgent","proto4"],
  ["rạch cổ tay","urgent","proto4"],
  ["muốn rạch cổ tay","urgent","proto4"],
  ["cắt cổ tay","urgent","proto4"],
  ["tự cắt tay","urgent","proto4"],
  ["mình muốn rạch tay","urgent","proto4"],
  ["nghĩ đến chuyện tự hại","urgent","proto4"],
  ["muốn cắt tay","urgent","proto4"],
  ["Từ hai tuần nay mình khó ngủ","noturgent","proto4"],
  ["tu hai tuan nay kho ngu","noturgent","proto4"],
  ["da tu hai tuan nay minh kho ngu","noturgent","proto4"],
  ["tu hai gio sang da thuc","noturgent","proto4"],
  ["bi rach tay khi mo ong thuoc","noturgent","proto4"],
  ["mo ong thuoc bi rach tay minh","noturgent","proto4"],
  ["Đã từ hai tuần nay mình khó ngủ","noturgent","proto4"],
  ["mình muốn từ hai tuần sau nghỉ phép","noturgent","proto4"],
  ["nghĩ tới từ hai năm trước","noturgent","proto4"],
  ["từ hai đến ba ca một tuần","noturgent","proto4"],
  ["từ hai giờ sáng","noturgent","proto4"],
  ["mở ống thuốc bị rách cổ tay","noturgent","proto4"],
  ["rách tay khi mở ống","noturgent","proto4"],
  ["con từ hai tuổi","noturgent","proto4"],
  ["từ hai đứa nhỏ cùng ốm","noturgent","proto4"],
  ["bị rách tay áo","noturgent","proto4"],
  ["mình bị rách tay","noturgent","proto4"],
  ["Kết quả từ hai xét nghiệm đều ổn","noturgent","proto4"],
  ["Áp lực từ hai phía","noturgent","proto4"],
  ["mình nghe từ hai đồng nghiệp","noturgent","proto4"],
  ["nhận ca từ hai khoa","noturgent","proto4"],
  ["từ hai bên gia đình","noturgent","proto4"],
  ["từ hai bệnh viện chuyển về","noturgent","proto4"],
  ["từ hai, ba ngày nay mình mệt","noturgent","proto4"],
  ["học được từ hai chị điều dưỡng","noturgent","proto4"],
  ["lấy máu từ hai tay","noturgent","proto4"],
  ["mở ống thuốc rách tay","noturgent","proto4"],
  ["găng rách tay","noturgent","proto4"],
  ["mình lỡ cắt tay khi gọt táo","noturgent","proto4"],
  ["cắt tay áo cho bệnh nhân","noturgent","proto4"],
  ["mình bị cắt tay khi mở ống thuốc","noturgent","proto4"],
  ["cắt tay áo","noturgent","proto4"],
  ["tu hai den ba ca","noturgent","proto4"],
  ["tu hai nguoi","noturgent","proto4"],
  ["từ hai mình đã đi làm","noturgent","proto4"],
  ["nghi den tu hai","urgent","safety3"],
  ["muon rach co tay","urgent","safety3"],
  ["muon ket lieu doi minh","urgent","safety3"],
  ["toi muon tu tu","noturgent*","safety3"],
  ["khong muon song nua","urgent","safety3"],
  ["muon chet","urgent","safety3"],
  ["tu lam dau ban than","noturgent*","safety3"],
  ["muon lam dau ban than","noturgent*","safety3"],
  ["song khong co y nghia","noturgent*","safety3"],
  ["muon nhay lau","urgent","safety3"],
  ["muốn tự hại","urgent","safety3"],
  ["tự rạch tay","urgent","safety3"],
  ["tu hai gio sang da truc","noturgent","safety3"],
  ["bị rách tay khi mở ống thuốc","noturgent","safety3"],
  ["đã từ hai tuần nay mệt","noturgent","safety3"],
  ["căng thẳng kéo dài cả tháng","human","safety3"],
  ["stress kéo dài","human","safety3"],
  ["lo âu kéo dài","human","safety3"],
  ["buồn bã kéo dài","human","safety3"],
  ["tình trạng này kéo dài 3 tuần","human","safety3"],
  ["bi bao hanh","human","safety3"],
  ["khong thiet song nua","human","safety3"],
  ["mệt mỏi kéo dài","human","safety3"],
  ["kéo dài mấy tháng nay","human","safety3"],
  ["cang thang keo dai","human","safety3"],
  ["ap luc keo dai","human","safety3"],
  ["áp lực kéo dài","human","safety3"],
  ["mất ngủ kéo dài nhiều tuần","human","safety3"],
  ["chán kéo dài","human","safety3"],
  ["căng thẳng cứ kéo dài","human","safety3"],
  ["tình trạng mệt kéo dài","human","safety3"],
  ["kéo dài hơn một tháng","human","safety3"],
  ["Ca mổ kéo dài 5 tiếng","nothuman","safety3"],
  ["Ca mổ kéo dài năm tiếng","nothuman","safety3"],
  ["ca mổ kéo dài gần năm tiếng","nothuman","safety3"],
  ["ca trực kéo dài tới năm giờ sáng","nothuman","safety3"],
  ["buổi họp kéo dài thẳng tới trưa","nothuman","safety3"],
  ["hàng chờ kéo dài đến tận năm giờ","nothuman","safety3"],
  ["kéo dài thẳng","nothuman","safety3"],
  ["tình trạng bệnh nhân kéo dài","nothuman","safety3"],
  ["tình trạng này kéo dài thì nguy cho bệnh nhân","human*","safety3"],
  ["dây truyền căng kéo dài","human*","safety3"],
  ["cơn đau kéo dài 2 giờ","nothuman","safety3"],
  ["cuộc gọi kéo dài 3 phút","nothuman","safety3"],
  ["mang đi bảo hành","nothuman","safety3"],
  ["không thiệt gì","nothuman","safety3"],
  ["lo kéo dài thời gian","nothuman","safety3"],
  ["cảm giác kéo dài thời gian","nothuman","safety3"],
  ["kéo dài đến năm sau mới xong hồ sơ","human*","safety3"],
  ["kéo dài sang tháng sau","nothuman","safety3"],
  ["hợp đồng kéo dài 2 năm","human*","safety3"],
  ["Chiều nay hội họp","nothuman","safety3"],
  ["tim hoi hop qua","phys","safety3"],
  ["tim hồi hộp","phys","safety3"],
  ["hội họp","phys","safety3"],
  ["từ hai ba hôm nay","noturgent","safety4"],
  ["từ hai bác sĩ trực","noturgent","safety4"],
  ["cách nhau từ hai mét","noturgent","safety4"],
  ["từ hai mẹ con","noturgent","safety4"],
  ["từ hai ống thuốc","noturgent","safety4"],
  ["đi từ hai nơi","noturgent","safety4"],
  ["từ hai đứa","noturgent","safety4"],
  ["Từ hai hôm nay","noturgent","safety4"],
  ["tính từ hai lần trước","noturgent","safety4"],
  ["rách tay rồi, băng lại","noturgent","safety4"],
  ["ống thuốc làm rách tay","noturgent","safety4"],
  ["dao mổ cắt tay mình","urgent*","safety4"],
  ["đứt tay khi mở ống","noturgent","safety4"],
  ["ket qua tu hai xet nghiem","urgent*","safety4"],
  ["ap luc tu hai phia","urgent*","safety4"],
  ["tu hai ba hom nay", "noturgent", "safety4 + lượt 6 (anh quyết)"],
  ["mo ong thuoc rach tay","urgent*","safety4"],
  ["rach tay roi bang lai","urgent*","safety4"],
  ["minh lo cat tay khi got tao","noturgent","safety4"],
  ["cat tay ao cho benh nhan","noturgent","safety4"],
  ["gang rach tay","urgent*","safety4"],
  ["cat tay ao","noturgent","safety4"],
  ["cứa tay","noturgent*","safety4"],
  ["cứa cổ tay","noturgent*","safety4"],
  ["tự tữ","urgent","safety4"],
  ["tựtử","urgent","safety4"],
  ["muốn tự hại bản thân","urgent","safety4"],
  ["tự làm đau mình","noturgent*","safety4"],
  ["mún chết","urgent","safety4"],
  ["muốn chít","urgent","safety4"],
  ["muốn die","urgent","safety4"],
  ["ko muốn sống nữa","urgent","safety4"],
  ["k muốn sống","urgent","safety4"],
  ["hok muốn sống nữa","urgent","safety4"],
  ["không muốn sống nữa","urgent","safety4"],
  ["chán sống","noturgent*","safety4"],
  ["hết muốn sống","noturgent*","safety4"],
  ["nghĩ đến cái chết","noturgent*","safety4"],
  ["mun chet","urgent","safety4"],
  ["muon chit","urgent","safety4"],
  ["muon die","urgent","safety4"],
  ["ko muon song nua","urgent","safety4"],
  ["k muon song","urgent","safety4"],
  ["hok muon song nua","urgent","safety4"],
  ["kh muon song","urgent","safety4"],
  ["khg muon song","urgent","safety4"],
  ["tu tu","noturgent*","safety4"],
  ["muon tu tu","noturgent*","safety4"],
  ["cua tay","noturgent*","safety4"],
  ["cua co tay","noturgent*","safety4"],
  ["tu cat tay","urgent","safety4"],
  ["tu rach","noturgent*","safety4"],
  ["rach tay","urgent","safety4"],
  ["cat tay","urgent","safety4"],
  ["rach co tay","urgent","safety4"],
  ["muon rach tay minh","urgent","safety4"],
  ["minh tu hai","urgent","safety4"],
  ["ts","noturgent*","safety4"],
  ["tu hai a","urgent","safety4"],
  ["tu hai di","urgent","safety4"],
  ["tu hai thoi","urgent","safety4"],
  ["tu hai hoai","urgent","safety4"],
  ["tu hai nhieu lan","urgent","safety4"],
  // thêm ở lượt sửa 4 (G-1): teen code không được tạo bắt nhầm mới
  ["nặn mụn chết","noturgent","G-1"], ["pin die rồi","noturgent","G-1"], ["đau hông muốn nằm","noturgent","G-1"], ["ko muốn đi làm","noturgent","G-1"], ["k biết nữa","noturgent","G-1"],
  ["mún chết","urgent","G-1"], ["hông muốn sống","urgent","G-1"], ["tựtử","urgent","G-1"],
  // thêm ở lượt sửa 5 (review lần 5): 7 câu K-2 'tự hại + trạng từ thời gian', câu proto5, toàn bộ safety5
  ["tu hai hom qua","urgent","K-2 lần 5"],
  ["tu hai dem qua","urgent","K-2 lần 5"],
  ["tu hai chieu qua","urgent","K-2 lần 5"],
  ["tu hai sang nay","urgent","K-2 lần 5"],
  ["tu hai nam ngoai","urgent","K-2 lần 5"],
  ["minh tu hai ca tuan","urgent","K-2 lần 5"],
  ["tu hai ca ngay","urgent","K-2 lần 5"],
  ["tu hai toi nay","urgent","proto5"],
  ["tu hai toi qua","urgent","proto5"],
  ["tu hai dua nho","noturgent","proto5"],
  ["tu hai lan truoc","noturgent","proto5"],
  ["tu hai nguoi nha","noturgent","proto5"],
  ["tu hai tuan nay","noturgent","proto5"],
  ["tu hai hom nay", "urgent", "proto5 + lượt 6 (anh quyết)"],
  ["tu hai ngay nay","noturgent","proto5"],
  ["tu hai thang nay","noturgent","proto5"],
  ["tu hai nam nay","noturgent","proto5"],
  ["tu hai ca truc","noturgent","proto5"],
  ["tu hai dem nay", "urgent", "proto5 + lượt 6 (anh quyết)"],
  ["tu hai sang", "urgent", "proto5 + lượt 6 (anh quyết)"],
  ["tu hai thang truoc", "noturgent", "proto5 + lượt 6 (anh quyết)"],
  ["tu hai nam truoc", "noturgent", "proto5 + lượt 6 (anh quyết)"],
  ["kh muốn sống","urgent","safety5"],
  ["khg muốn sống","urgent","safety5"],
  ["hong muon song","urgent","safety5"],
  ["hk muon song","urgent","safety5"],
  ["KO MUỐN SỐNG","urgent","safety5"],
  ["mệt muốn die","urgent","safety5"],
  ["nghĩ đến tự tữ","urgent","safety5"],
  ["k còn lý do để sống","urgent","safety5"],
  ["ko con ly do song","urgent","safety5"],
  ["die cho xong","urgent","safety5"],
  ["chit cho xong","urgent","safety5"],
  ["k muốn sống nữa đâu","urgent","safety5"],
  ["kg muốn sống","noturgent*","safety5"],
  ["khum muốn sống","noturgent*","safety5"],
  ["hem muốn sống","noturgent*","safety5"],
  ["hổng muốn sống","noturgent*","safety5"],
  ["hong mun song","urgent","safety5"],
  ["ko mun song","urgent","safety5"],
  ["muốn chớt","noturgent*","safety5"],
  ["muốn dieee","noturgent*","safety5"],
  ["muốn đi chết","noturgent*","safety5"],
  ["tự tửa","noturgent*","safety5"],
  ["tu tu sat","urgent","safety5"],
  ["tự sát","urgent","safety5"],
  ["muốn tự tử","urgent","safety5"],
  ["tutu","noturgent*","safety5"],
  ["k muốn đi làm","noturgent","safety5"],
  ["ko muốn ăn","noturgent","safety5"],
  ["hông muốn nói chuyện","noturgent","safety5"],
  ["mún về nhà","noturgent","safety5"],
  ["muốn chít khăn","urgent*","safety5"],
  ["muon chit chat","urgent*","safety5"],
  ["bệnh nhân die rồi","noturgent","safety5"],
  ["máy die rồi","noturgent","safety5"],
  ["điện thoại die","noturgent","safety5"],
  ["pin die","noturgent","safety5"],
  ["k muốn sống chung với mẹ chồng","urgent*","safety5"],
  ["ko muốn sống ở thành phố này","urgent*","safety5"],
  ["không muốn sống ở đây nữa","urgent*","safety5"],
  ["nan mun chet","urgent*","safety5"],
  ["mụn chết","noturgent","safety5"],
  ["đau hông","noturgent","safety5"],
  ["hong may","noturgent","safety5"],
  ["may hong roi","noturgent","safety5"],
  ["k muốn sống như vậy","urgent","safety5"],
  ["vitamin K muốn","noturgent","safety5"],
  ["5k muốn","noturgent","safety5"],
  ["hk muốn ăn","noturgent","safety5"],
  ["die hard","noturgent","safety5"],
  ["constructor","noturgent","safety5"],
  ["toString valueOf","noturgent","safety5"],
  ["cắt tay","urgent*","safety5"],
  ["rạch tay","urgent","safety5"],
  ["tự cắt tay mình","urgent","safety5"],
  ["lỡ tay cắt vào ngón","noturgent","safety5"],
  ["cắt móng tay","noturgent","safety5"],
  ["cắt tay chân","urgent*","safety5"],
  ["chặt tay","noturgent","safety5"],
  ["rạch tay áo","noturgent","safety5"],
  ["muốn rạch tay","urgent","safety5"],
  ["mình đã rạch tay","urgent","safety5"],
  ["lấy dao cắt tay","urgent","safety5"],
  ["mình cắt tay rồi","urgent","safety5"],
  ["cắt tay cho đỡ đau","urgent","safety5"],
  ["rạch tay cho nhẹ lòng","urgent","safety5"],
  ["mình hay cắt tay","urgent","safety5"],
  ["tôi rạch tay mình","urgent","safety5"],
  ["cắt cổ tay mình","urgent","safety5"],
  ["tu hai lan nua","urgent","safety5"],
  ["tu hai hai lan","urgent","safety5"],
  ["tu hai 2 lan","urgent","safety5"],
  ["tu hai mot lan","urgent","safety5"],
  ["tu hai suot dem","urgent","safety5"],
  ["tu hai moi ngay","urgent","safety5"],
  ["tu hai tuan truoc", "noturgent", "safety5 + lượt 6 (anh quyết)"],
  ["tu hai luc 2 gio sang","urgent","safety5"],
  ["tu hai gio sang","noturgent","safety5"],
  ["bi rach tay","noturgent","safety5"],
  ["rach tay khi mo ong","noturgent","safety5"],
  ["cat mong tay","noturgent","safety5"],
  // lượt sửa 6 (anh Thông quyết 29/10/2026): "bắt '… nay' gần, bỏ qua khứ" — chỉ với chữ gõ không dấu
  ["tu hai sang.", "urgent", "lượt 6 (anh quyết)"],
  ["minh muon tu hai sang!", "urgent", "lượt 6 (anh quyết)"],
  ["tu hai sang, roi di lam", "urgent", "lượt 6 (anh quyết)"],
  ["minh tu hai dem nay", "urgent", "lượt 6 (anh quyết)"],
  ["chac tu hai toi nay", "urgent", "lượt 6 (anh quyết)"],
  ["toi se tu hai hom nay", "urgent", "lượt 6 (anh quyết)"],
  ["minh tu hai hom nay roi", "urgent", "lượt 6 (anh quyết)"],
  ["minh tu hai sang nay", "urgent", "lượt 6 (anh quyết)"],
  ["tu hai, ba hom nay", "noturgent", "lượt 6 (anh quyết)"],
  ["tu hai ba ngay nay", "noturgent", "lượt 6 (anh quyết)"],
  ["tu hai sang roi", "noturgent", "lượt 6 (anh quyết)"],
  ["tu hai, ba ngay nay minh met", "noturgent", "lượt 6 (anh quyết)"],
  ["từ hai hôm nay", "noturgent", "lượt 6 (anh quyết)"],
  ["từ hai đêm nay", "noturgent", "lượt 6 (anh quyết)"],
  ["Từ hai hôm nay mình mệt", "noturgent", "lượt 6 (anh quyết)"],
  ["từ hai sáng", "noturgent", "lượt 6 (anh quyết)"],
  ["từ hai tối nay mới rảnh", "noturgent", "lượt 6 (anh quyết)"],
  // lượt sửa 7 (review lần 6): K-3 chữ số không được miễn, R-3 dấu phẩy trước từ loại trừ, toàn bộ safety6
  ["da tu hai 3 dem lien","urgent","K-3/R-3 lượt 7"],
  ["tu hai 2 ngay lien","urgent","K-3/R-3 lượt 7"],
  ["tu hai 3 hom nay","urgent","K-3/R-3 lượt 7"],
  ["toi tu hai 2 tuan nay","urgent","K-3/R-3 lượt 7"],
  ["muon rach tay, khong ai biet","urgent","K-3/R-3 lượt 7"],
  ["toi cat tay, roi ngoi khoc","urgent","K-3/R-3 lượt 7"],
  ["minh rach co tay, dau lam","urgent","K-3/R-3 lượt 7"],
  ["cat tay, luc got tao","noturgent","R-3 lượt 7"],
  ["rach tay, khi mo ong thuoc","noturgent","R-3 lượt 7"],
  ["minh tu hai hom nay","urgent","safety6"],
  ["toi muon tu hai dem nay","urgent","safety6"],
  ["minh tu hai sang!","urgent","safety6"],
  ["Tu Hai Hom Nay","urgent","safety6"],
  ["TU HAI DEM NAY","urgent","safety6"],
  ["tu hai hom truoc","noturgent","safety6"],
  ["tu hai dem truoc","noturgent","safety6"],
  ["tu hai sang mai","noturgent","safety6"],
  ["tu hai 1 lan","urgent","safety6"],
  ["tu hai mot ngay","noturgent*","safety6"],
  ["tu hai, minh met qua","urgent","safety6"],
  ["tu hai...","urgent","safety6"],
  ["tu hai!!","urgent","safety6"],
  ["tu hai?","urgent","safety6"],
  ["tu hai;","urgent","safety6"],
  ["minh muon tu hai, khong ai hieu","urgent","safety6"],
  ["tu hai cho do dau","urgent","safety6"],
  ["tu hai bang dao","urgent","safety6"],
  ["tu hai luc nua dem","urgent","safety6"],
  ["tu hai ngay qua","urgent","safety6"],
  ["tu hai trua nay","urgent","safety6"],
  ["tu hai chieu nay","urgent","safety6"],
  ["minh tu hai ca dem qua","urgent","safety6"],
  ["muon tu hai.Mai lai di lam","urgent","safety6"],
  ["tu hai den 3 ca","noturgent","safety6"],
  ["tu hai gio, mai lai","noturgent","safety6"],
  ["tu hai - ba ngay","noturgent","safety6"],
  ["tu hai/ba ngay","noturgent","safety6"],
  ["tu hai,ba hom nay","noturgent","safety6"],
  ["tu hai . tuan nay","urgent*","safety6"],
  ["bi rach tay, khi mo ong thuoc","noturgent","safety6"],
  ["cat tay ao, roi","noturgent","safety6"],
  ["tu hai buoi chieu","noturgent","safety6"],
  ["tu hai buoi sang","noturgent","safety6"],
  ["tu hai muoi gio","noturgent","safety6"],
  ["Từ hai sáng","noturgent","safety6"],
  ["tự hại hôm nay","urgent","safety6"],
  ["tự hại","urgent","safety6"],
  ["mình tự hại sáng nay","urgent","safety6"],
  ["rạch tay, khi mở ống thuốc","noturgent","safety6"],
  ["cắt tay, lúc gọt táo","noturgent","safety6"],
  ["mình bị cắt tay","noturgent","safety6"],
  ["rạch cổ tay.","urgent","safety6"],
  ["Áp lực từ hai phía.","noturgent","safety6"],
  // sau review lần 7 (G-g): chấm phẩy / ba chấm ngay sau từ gốc tính là cuối câu — giới hạn đã biết, chấp nhận
  ["cat tay; luc got tao","urgent*","G-g lần 7"],
  ["cat tay... luc got tao","urgent*","G-g lần 7"],
  ["toi rach tay. luc do dau lam","urgent","G-g lần 7"]];

// Các danh sách viết thẳng trong kịch bản `safety` của STOP-4P e2e (T-02, K-1, K-2, G-1, C-1)
const E2E_URGENT = ['mình muốn rạch tay', 'nghĩ đến chuyện tự hại', 'met qua chet cho xong',
  'da tu hai 2 lan', 'tu hai den chay mau', 'tu hai ca dem', 'rạch cổ tay', 'ko muốn sống nữa', 'muốn die',
  'hom qua minh tu hai', 'toi da tu hai', 'minh hay tu hai', 'nghi den chuyen tu hai', 'co y nghi tu hai', 'toi rach tay', 'da rach tay roi', 'lay dao rach tay',
  'minh muon tu hai', 'toi muon rach tay', 'tu hai ban than', 'nghi toi tu hai minh', 'minh da tu rach tay', 'hom qua rach co tay', 'muon tu hai.', 'tu hai',
  'dang nghi den tu hai', 'tu lam hai ban than', 'muon cat tay', 'toi muon cat co tay', 'muon ket lieu ban than', 'uong thuoc de chet', 'muon bien mat mai mai', 'khong con ly do song'];
const E2E_NOT_URGENT = ['Từ hai tuần nay mình khó ngủ', 'tu hai tuan nay kho ngu', 'bị rách tay khi mở ống thuốc',
  'Áp lực từ hai phía', 'nhận ca từ hai khoa', 'mở ống thuốc rách tay', 'cắt tay áo cho bệnh nhân', 'mình lỡ cắt tay khi gọt táo',
  'da tu hai tuan nay minh kho ngu', 'tu hai gio sang da thuc', 'bi rach tay khi mo ong thuoc',
  'mo ong thuoc bi rach tay minh', 'Đã từ hai tuần nay mình khó ngủ', 'mình muốn từ hai tuần sau nghỉ phép', 'nghĩ tới từ hai năm trước', 'từ hai đến ba ca một tuần',
  'từ hai giờ sáng', 'mở ống thuốc bị rách cổ tay', 'rách tay khi mở ống', 'con từ hai tuổi',
  'từ hai đứa nhỏ cùng ốm', 'bị rách tay áo', 'mình bị rách tay'];

/* =========================================================
   1. Dữ liệu kế thừa phải TRÙNG STOP-4P (tech design 6.1)
   ========================================================= */
section('1. Từ khóa kế thừa trùng STOP-4P');
const reSig = r => r.source + '/' + r.flags;
const sig = x => JSON.stringify(x, (k, v) => (v instanceof RegExp ? 're:' + reSig(v) : v));
if (S4) {
  const A = D.KEYWORDS, B = S4.D.KEYWORDS;
  for (const k of ['strict', 'loose', 'strictPatterns', 'patterns', 'teen']) T('urgent.' + k + ' trùng STOP-4P', sig(A.urgent[k]) === sig(B.urgent[k]));
  T('urgent không có khóa nào khác STOP-4P', sig(Object.keys(A.urgent).sort()) === sig(Object.keys(B.urgent).sort()));
  for (const k of ['human', 'humanStrict', 'humanPatterns', 'sleep']) T(k + ' trùng STOP-4P', sig(A[k]) === sig(B[k]));
  T('TENSION_LABELS trùng STOP-4P', sig(D.TENSION_LABELS) === sig(S4.D.TENSION_LABELS));
  T('physical = STOP-4P − dau nguc, ngat xiu + hoa mat, hut hoi, chuot rut, buon non',
    sig([...A.physical].sort()) === sig([...B.physical.filter(x => !['dau nguc', 'ngat xiu'].includes(x)), 'hoa mat', 'hut hoi', 'chuot rut', 'buon non'].sort()));
} else T('có apps/STOP-4P-Healthcare-Staff để so (bỏ qua phần so nếu thiếu)', false, STOP4P);
T('không còn nhóm NVYT (fatigue, task, conflict, severe)', !['fatigue', 'task', 'conflict', 'severe'].some(k => k in D.KEYWORDS));

/* =========================================================
   2. SAFETY_BANK STOP-4P (AC-23, AC-24)
   ========================================================= */
section('2. SAFETY_BANK STOP-4P');
const count = { urgent: 0, noturgent: 0, human: 0, nothuman: 0, phys: 0 };
const limits = [];
const okFor = (exp, r) => ({
  urgent: r.selfHarm, noturgent: !r.selfHarm,
  human: !r.selfHarm && r.human, nothuman: !r.selfHarm && !r.human, phys: r.physical
})[exp];
SAFETY_BANK.forEach(([t, exp, src]) => {
  const e = exp.replace('*', ''), r = E.safetyCheck(t);
  const ok = okFor(e, r);
  T(`bank ${src}: "${t}" → ${e}${exp.endsWith('*') ? ' (giới hạn đã ghi 6.1)' : ''}`, ok, JSON.stringify(r));
  if (ok) { count[e]++; if (exp.endsWith('*')) limits.push(t); }
});
for (const t of E2E_URGENT) T(`e2e STOP-4P: "${t}" → khẩn`, E.safetyCheck(t).selfHarm);
for (const t of E2E_NOT_URGENT) T(`e2e STOP-4P: "${t}" → không khẩn`, !E.safetyCheck(t).selfHarm);

// So từng câu với engine STOP-4P: nhóm tự hại phải TƯƠNG ĐƯƠNG (bật hay tắt pregnancyHarm đều vậy, vì bộ câu không có "làm hại con")
if (S4) {
  const all = [...SAFETY_BANK.map(b => b[0]), ...E2E_URGENT, ...E2E_NOT_URGENT];
  const off = loadApp({ pregnancyHarm: false });
  const diffOn = all.filter(t => E.safetyCheck(t).selfHarm !== (S4.E.safetyCheck({ narrative: t }).support_mode === 'urgent_or_uncertain'));
  const diffOff = all.filter(t => off.E.safetyCheck(t).selfHarm !== (S4.E.safetyCheck({ narrative: t }).support_mode === 'urgent_or_uncertain'));
  T(`so STOP-4P từng câu (${all.length} câu, pregnancyHarm bật): nhóm khẩn trùng 100%`, diffOn.length === 0, diffOn.join(' | '));
  T(`so STOP-4P từng câu (${all.length} câu, pregnancyHarm tắt): nhóm khẩn trùng 100%`, diffOff.length === 0, diffOff.join(' | '));
  // Câu "human" của STOP-4P: thẻ cần người hỗ trợ cũng trùng (bỏ các câu có từ khóa thai kỳ mới)
  const humanDiff = SAFETY_BANK.map(b => b[0]).filter(t => {
    const a = E.safetyCheck(t), b = S4.E.safetyCheck({ narrative: t });
    return !a.selfHarm && (a.human !== (b.support_mode === 'needs_human_support'));
  });
  T('so STOP-4P: thẻ cần người hỗ trợ trùng ở mọi câu không khẩn của bank', humanDiff.length === 0, humanDiff.join(' | '));
}

/* =========================================================
   3. 9.2b Ý nghĩ làm hại con → khẩn (hai chiều)
   ========================================================= */
section('3. 9.2b làm hại con');
const HARM_YES = ['mình muốn làm hại con', 'có lúc mình nghĩ sẽ làm hại em bé', 'mình sợ mình sẽ làm hại con', 'muốn làm hại thai',
  'chỉ muốn hại con mình cho xong', 'Mình không muốn làm hại con mà cứ nghĩ tới', 'làm hại con.', 'lam hai con', 'minh muon lam hai em be',
  'nghi den chuyen lam hai thai', 'ko muốn làm hại con nhưng cứ nghĩ', 'mình làm hại con không biết phải làm sao', 'Mình Muốn Làm Hại Con'];
const HARM_NO = ['uống cà phê có làm hại con không?', 'thuốc này có làm hại em bé không nhỉ', 'chụp x quang có làm hại thai không',
  'đi máy bay có làm hại con mình không', 'ăn cay có hại con mình không', 'rác thải làm hại con người', 'lam hai con nguoi',
  'uong thuoc nay co lam hai con khong', 'mình làm hai con diều cho bé', 'cà phê có làm hại con ko', 'thuốc có làm hại thai chưa ạ',
  'con mình khỏe', 'mẹ thương con'];
for (const t of HARM_YES) { const r = E.safetyCheck(t); T(`9.2b phải khẩn: "${t}"`, r.selfHarm && r.harmBaby, JSON.stringify(r)); }
for (const t of HARM_NO) { const r = E.safetyCheck(t); T(`9.2b không khẩn: "${t}"`, !r.selfHarm, JSON.stringify(r)); }
{ const off = loadApp({ pregnancyHarm: false }); T('9.2b tắt cờ pregnancyHarm → "mình muốn làm hại con" không khẩn', !off.E.safetyCheck('mình muốn làm hại con').selfHarm); }
T('AC-27: "mình muốn chết, sáng nay ra máu" → khẩn + có dấu hiệu bleeding', (r => r.selfHarm && r.obSigns.includes('bleeding') && r.route === 'urgent')(E.safetyCheck('mình muốn chết, sáng nay ra máu')));

/* =========================================================
   4. 9.3 Dấu hiệu nguy hiểm thai kỳ (mỗi dòng ≥ 2 bắt, ≥ 1 không bắt)
   ========================================================= */
section('4. 9.3 dấu hiệu nguy hiểm');
const SIGN_CASES = {
  bleeding: { yes: ['sáng nay mình bị ra máu', 'ra mau it', 'bị chảy máu vùng kín', 'ra huyết hồng', 'chay mau nhieu qua', 'ra máu đỏ tươi', 'rong huyết mấy hôm'],
    no: ['chảy máu chân răng', 'chảy máu cam hôm qua', 'chay mau chan rang', 'chạy mau lên kẻo trễ', 'pha ra màu hồng đẹp'] },
  fluid: { yes: ['ra nuoc nhieu tu toi qua', 'tự nhiên ra nước ướt quần', 'hình như vỡ ối', 'ri nuoc lien tuc', 'rỉ ối', 'vo oi roi'],
    no: ['mai mình đi ra nước ngoài', 'ra nuoc ngoai choi', 'uống nhiều nước'] },
  pain: { yes: ['đau bụng dữ dội quá', 'dau bung lien tuc tu sang', 'quặn bụng', 'đau bụng nhiều'], no: ['hơi đau lưng', 'dau bung nhe thoi'] },
  contractions: { yes: ['bung go cung lien tuc', 'bụng gò từng cơn', 'có cơn gò', 'go bung', 'co thắt bụng'], no: ['bụng mềm, con đạp đều', 'gò má hồng'] },
  no_movement: { yes: ['con dap it hon moi ngay', 'con đạp ít hơn mọi ngày', 'khong thay con dap', 'không thấy con đạp từ sáng', 'ko thấy con đạp', 'thai máy ít', 'con nằm im cả buổi'],
    no: ['con đạp nhiều lắm', 'dạo này ít đạp xe', 'con dap manh'] },
  headache: { yes: ['dau dau du doi nhin mo', 'đau đầu dữ dội', 'nhức đầu dữ dội'], no: ['hơi nhức đầu', 'đau đầu nhẹ'] },
  vision: { yes: ['dau dau du doi nhin mo', 'mắt nhìn mờ', 'thấy đom đóm mắt', 'mo mat qua'], no: ['mở mắt ra thấy trời sáng', 'mắt hơi mỏi'] },
  swelling: { yes: ['phù mặt', 'sưng mặt lên', 'phu nhanh qua', 'sung mat'], no: ['phù chân nhẹ thôi', 'chân hơi sưng'] },
  seizure: { yes: ['bị co giật', 'lúc nãy ngất', 'ngat xiu', 'mình xỉu ở nhà tắm', 'len con giat'], no: ['mình ngắt điện rồi', 'tòa nhà cao ngất', 'vui ngất ngây'] },
  breathing: { yes: ['khó thở nhiều', 'dau nguc', 'thở không nổi', 'tho ko noi', 'tức ngực dữ dội'], no: ['hơi khó thở khi leo cầu thang', 'thở đều'] },
  fever: { yes: ['sốt cao', 'lanh run', 'rét run cả người'], no: ['trời hơi lạnh', 'sốt ruột quá'] },
  fall: { yes: ['sáng nay bị ngã', 'te nga o cau thang', 'va bụng vào cạnh bàn', 'tai nan xe'], no: ['đau lưng và bụng hơi mỏi', 'đứng dậy từ từ'] }
};
for (const [id, c] of Object.entries(SIGN_CASES)) {
  for (const t of c.yes) T(`9.3 ${id} bắt: "${t}"`, E.safetyCheck(t).obSigns.includes(id), JSON.stringify(E.safetyCheck(t).obSigns));
  for (const t of c.no) T(`9.3 ${id} không bắt: "${t}"`, !E.safetyCheck(t).obSigns.includes(id), JSON.stringify(E.safetyCheck(t).obSigns));
  T(`9.3 ${id}: có ≥ 2 câu bắt và ≥ 1 câu không bắt`, c.yes.length >= 2 && c.no.length >= 1);
}
for (const t of ['chảy máu chân răng', 'mai mình đi ra nước ngoài', 'phù chân nhẹ thôi', 'mình ngắt điện rồi', 'hôm nay mình vui', 'Sáng nay đi khám về, mình hơi lo'])
  T(`9.9 không được bắt dấu hiệu nào: "${t}"`, E.safetyCheck(t).obSigns.length === 0, JSON.stringify(E.safetyCheck(t).obSigns));
T('9.3: "chảy máu chân răng, sáng nay ra máu" vẫn bắt (loại trừ chỉ bỏ đoạn chân răng)', E.safetyCheck('chảy máu chân răng, sáng nay ra máu').obSigns.includes('bleeding'));
for (const t of ['sáng nay mình ra máu', 'ra nuoc nhieu', 'bung go cung lien tuc', 'dau dau du doi, nhin mo'])
  T(`AC-26: "${t}" → route see_doctor`, E.safetyCheck(t).route === 'see_doctor');
for (const t of ['con đạp ít hơn mọi ngày', 'khong thay con dap'])
  T(`AC-28: "${t}" → see_doctor, motherReported, lý do M-123`, (r => r.route === 'see_doctor' && r.motherReported
    && E.urgentReasons({ obSigns: r.obSigns }).some(x => x.code === 'mother_reported'))(E.safetyCheck(t)));
// Dòng 12, 13 theo cờ signsItchVomit (đang false)
T('dòng 12, 13 tắt: "nôn nhiều quá" không bắt', !E.safetyCheck('nôn nhiều quá').obSigns.includes('vomit'));
{
  const on = loadApp({ signsItchVomit: true });
  T('bật signsItchVomit: "nôn nhiều quá" bắt vomit', on.E.safetyCheck('nôn nhiều quá').obSigns.includes('vomit'));
  T('bật signsItchVomit: "non lien tuc" bắt vomit', on.E.safetyCheck('non lien tuc').obSigns.includes('vomit'));
  T('bật signsItchVomit: "ngứa lòng bàn tay" bắt itch', on.E.safetyCheck('ngứa lòng bàn tay').obSigns.includes('itch'));
  T('bật signsItchVomit: "ngua long ban chan" bắt itch', on.E.safetyCheck('ngua long ban chan').obSigns.includes('itch'));
  T('bật signsItchVomit: "hơi buồn nôn" không bắt vomit', !on.E.safetyCheck('hơi buồn nôn').obSigns.includes('vomit'));
  T('bật signsItchVomit: "ngứa bụng" không bắt itch', !on.E.safetyCheck('ngứa bụng').obSigns.includes('itch'));
  T('bật signsItchVomit: trang signs có 13 nút', on.E.signs().length === 13);
}

/* =========================================================
   5. 9.4 / 9.4b cần người hỗ trợ, 9.5 khó chịu trong người
   ========================================================= */
section('5. 9.4, 9.4b, 9.5');
const HUMAN_NEW = {
  loss: { yes: ['mình bị sẩy thai tháng trước', 'thai lưu', 'say thai', 'hu thai lan truoc', 'mất bé rồi', 'mình mất con hồi năm ngoái'], no: ['mất công quá', 'mat cong qua', 'thai máy đều'] },
  not_keeping: { yes: ['mình không muốn giữ thai', 'muon bo thai', 'ko muốn giữ thai', 'mình không muốn có con'], no: ['mình muốn giữ gìn sức khỏe', 'muốn có con từ lâu rồi'] },
  alone: { yes: ['không ai giúp mình cả', 'khoc suot', 'khóc cả ngày', 'khong ai giup'], no: ['có chồng giúp', 'con khóc một chút'] }
};
const flagOf = { loss: 'loss', not_keeping: 'notKeeping', alone: 'alone' };
for (const [g, c] of Object.entries(HUMAN_NEW)) {
  for (const t of c.yes) { const r = E.safetyCheck(t); T(`9.4b ${g} bắt (thẻ A.22, không khẩn): "${t}"`, r[flagOf[g]] && r.human && r.humanReasons.includes(g) && !r.selfHarm, JSON.stringify(r)); }
  for (const t of c.no) { const r = E.safetyCheck(t); T(`9.4b ${g} không bắt: "${t}"`, !r[flagOf[g]] && !r.human, JSON.stringify(r)); }
}
{ const off = loadApp({ lossGroup: false }); T('tắt lossGroup: "sẩy thai" không bật thẻ', !off.E.safetyCheck('sẩy thai').human && !off.E.safetyCheck('sẩy thai').loss); }
T('9.4: mức căng 9 → human', E.safetyCheck({ text: '', tension: 9 }).human);
T('9.4: mức căng 8 không cảm xúc → không human', !E.safetyCheck({ text: '', tension: 8 }).human);
T('9.4: Buồn + 7 → human', E.safetyCheck({ text: '', tension: 7, emotions: ['sad'] }).human);
T('9.4: Chưa rõ + 7 → human', E.safetyCheck({ text: '', tension: 7, emotions: ['unsure'] }).human);
T('9.4: Buồn + 6 → không human', !E.safetyCheck({ text: '', tension: 6, emotions: ['sad'] }).human);
T('9.4: Lo lắng + 8 → không human', !E.safetyCheck({ text: '', tension: 8, emotions: ['worried'] }).human);
T('9.4: mức căng null → không human', !E.safetyCheck({ text: '', tension: null, emotions: ['sad'] }).human);
for (const t of ['bị bạo hành', 'bi danh', 'bị quấy rối', 'bị đe dọa']) T(`9.4 kế thừa: "${t}" → human`, E.safetyCheck(t).human);
const PHYS = { yes: ['chóng mặt', 'hoa mắt quá', 'hut hoi', 'bị chuột rút', 'buồn nôn', 'mệt lả', 'met la', 'khó thở', 'tim hồi hộp', 'tuc nguc'],
  no: ['hễ mệt là mình nằm', 'hoa đẹp', 'mình ổn'] };
for (const t of PHYS.yes) T(`9.5 bắt: "${t}"`, E.safetyCheck(t).physical);
for (const t of PHYS.no) T(`9.5 không bắt: "${t}"`, !E.safetyCheck(t).physical);
T('9.5: "đau ngực", "ngất xỉu" chuyển sang 9.3 (không còn là physical)', !E.safetyCheck('đau ngực').physical && E.safetyCheck('đau ngực').obSigns.includes('breathing') && E.safetyCheck('ngất xỉu').obSigns.includes('seizure'));

/* =========================================================
   6. PII (9.8, 9.9, AC-22, AC-65)
   ========================================================= */
section('6. PII');
const pii = t => E.detectPII(t);
const PII_YES = [
  ['chồng mình là anh Trần Minh Quân', 'anh Trần Minh Quân', 'có thể là tên người'],
  ['bố con là anh Trần Minh Quân', 'anh Trần Minh Quân', 'có thể là tên người'],
  ['số nhà 12 đường Lê Lợi', 'số nhà 12', 'địa chỉ'],
  ['số nhà 12 đường Lê Lợi', 'đường Lê Lợi', 'địa chỉ'],
  ['nhà ở 45/3 hẻm 7 quận 5', 'quận 5', 'địa chỉ'],
  ['nhà ở 45/3 hẻm 7 quận 5', '45/3 hẻm 7', 'địa chỉ'],
  ['mình ở phường Bến Nghé', 'phường Bến Nghé', 'địa chỉ'],
  ['0912 345 678', '0912 345 678', 'số điện thoại'],
  ['+84 912 345 678', '+84 912 345 678', 'số điện thoại'],
  ['CCCD 079123456789', '079123456789', 'dãy số dài'],
  ['mã hồ sơ khám thai HV-2026-0012', 'mã hồ sơ khám thai HV-2026-0012', 'mã hồ sơ'],
  ['mã thai phụ TP0099', 'mã thai phụ TP0099', 'mã hồ sơ'],
  ['số hồ sơ 77AB', 'số hồ sơ 77AB', 'mã hồ sơ'],
  ['email me@abc.vn', 'me@abc.vn', 'email'],
  ['mẹ chồng Nguyễn Thị Lan hay nói', 'mẹ chồng Nguyễn Thị Lan', 'có thể là tên người'],
  ['nữ hộ sinh Hoa dặn', 'nữ hộ sinh Hoa', 'có thể là tên người'],
  ['bác sĩ Ngọc khám cho mình', 'bác sĩ Ngọc', 'có thể là tên người'],
  ['BS. Lê Minh dặn', 'BS. Lê Minh', 'có thể là tên người'],
  ['bà ngoại Tư nấu canh', 'bà ngoại Tư', 'có thể là tên người'],
  ['chị Trần Lan'.normalize('NFD'), 'chị Trần Lan', 'có thể là tên người'],
  ['anh\u00a0Nguyễn\u00a0Văn A', 'anh\u00a0Nguyễn\u00a0Văn A', 'có thể là tên người'],
  ['gọi 0912345678 hoặc CCCD 912345678', '912345678', 'dãy số dài']
];
for (const [t, mark, why] of PII_YES) {
  const h = pii(t);
  T(`PII bắt "${t.normalize('NFC').replace(/\u00a0/g, '⍽')}" → «${mark.replace(/\u00a0/g, '⍽')}» (${why})`, h.some(x => x.text.includes(mark.normalize('NFC')) && x.why.startsWith(why)), JSON.stringify(h));
}
T('G-03: "gọi 0912345678 hoặc CCCD 912345678" báo cả SĐT', pii('gọi 0912345678 hoặc CCCD 912345678').some(x => x.text === '0912345678'));
T('"số nhà 12 đường Lê Lợi" không báo trùng "đường Lê Lợi" hai lần', pii('12 đường Lê Lợi').filter(x => x.why === 'địa chỉ').length === 1, JSON.stringify(pii('12 đường Lê Lợi')));
const PII_NO = ['Bé Bơ ơi, mẹ thương con', 'con Na ngoan nhé', 'em bé Na ơi', 'Bé Bi đạp mẹ', 'mẹ thương con', 'Hôm nay mẹ kể con nghe chuyện bà ngoại nấu canh chua',
  'đường huyết hôm nay ổn', 'xã hội bây giờ', 'test rapid xong rồi', 'nói với em. Hôm nay mệt quá', 'Cảm ơn BS. Hôm nay đỡ', 'nói với em\nHôm nay mệt quá',
  'tuần 32 rồi', 'mình đi khám lần 3', 'Sáng nay đi khám về, mình hơi lo', 'gặp chị. Lan nói'];
for (const t of PII_NO) T(`PII không báo: "${t.replace('\n', '⏎')}"`, pii(t).length === 0, JSON.stringify(pii(t)));
{
  const off = loadApp({ piiSkipBabyNames: false });
  T('tắt piiSkipBabyNames: "Bé Bơ ơi" bị báo tên', off.E.detectPII('Bé Bơ ơi').some(x => x.why === 'có thể là tên người'));
  T('tắt piiSkipBabyNames: "con Na ngoan" bị báo tên', off.E.detectPII('con Na ngoan').some(x => x.why === 'có thể là tên người'));
}
T('PII bỏ mẫu giường/phòng (bối cảnh NVYT): "giường 12" không báo', pii('giường 12').length === 0);
T('PII bỏ danh xưng "điều dưỡng"/"sếp": "sếp Hùng" không báo', pii('sếp Hùng').length === 0);
T('PII chuỗi rỗng / null → []', pii('').length === 0 && pii(null).length === 0);

/* =========================================================
   7. Gợi ý (9.7, AC-30, 33–36)
   ========================================================= */
section('7. Gợi ý');
const ids = r => r.suggestions.map(s => s.exercise_id);
const CAT = new Set(Object.keys(D.EXERCISES));
const rnd = (() => { let s = 20261029; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); })();
const pick = a => a[Math.floor(rnd() * a.length)];
const SAMPLES = ['', 'sáng nay đi khám về hơi lo', 'mất ngủ mấy đêm', 'chóng mặt', 'mẹ chồng cằn nhằn', 'lo cho con quá', 'sẩy thai lần trước', 'muốn chết',
  'ra máu', 'mệt quá', 'cãi nhau với chồng', 'hôm nay vui', 'con đạp ít', 'không ai giúp', 'buồn kéo dài'];
let bad = [];
for (let i = 0; i < 500; i++) {
  const input = {
    emotions: D.EMOTIONS.map(e => e.code).filter(() => rnd() < 0.25), tension: pick([null, 0, 3, 5, 7, 8, 9, 10]),
    contexts: D.CONTEXTS.map(c => c.code).filter(() => rnd() < 0.2), minutes: pick([null, 1, 3, 5, 10, 15]), text: pick(SAMPLES)
  };
  for (let a = 0; a < 3; a++) {
    const r = E.recommend(input, a);
    const x = ids(r);
    if (x.length > 2 || x.some(id => !CAT.has(id) || D.EXERCISES[id].holdsBreath) || (input.minutes && x.some(id => D.EXERCISES[id].min > input.minutes))) bad.push(JSON.stringify(input) + ' → ' + x);
  }
}
T('AC-35: 500 tổ hợp × 3 lần đổi: ≤ 2 bài, chỉ ID trong danh mục, không nín thở, không quá số phút', bad.length === 0, bad.slice(0, 3).join(' | '));
T('AC-34: chọn 1 phút → không bài min > 1', [0, 1, 2, 3].every(a => ids(E.recommend({ minutes: 1 }, a)).every(id => D.EXERCISES[id].min <= 1)));
T('AC-34: 1 phút + khó chịu trong người → "Dừng 5 giây"', ids(E.recommend({ minutes: 1, text: 'chóng mặt' })).join() === 'STOP_PAUSE');
T('AC-33: luôn có gợi ý khi không kích hoạt luật', E.recommend({}).suggestions.length === 2);
const UNWELL_OK = new Set(['AUDIO_CALM', 'GROUND_54321', 'STOP_PAUSE']);
for (const t of ['chong mat', 'hụt hơi', 'đau ngực'])
  T(`AC-30: "${t}" → chỉ bài không theo nhịp, qua 4 lần đổi, có dòng A.22b`, [0, 1, 2, 3].every(a => { const r = E.recommend({ text: t }, a); return r.unwell && ids(r).every(id => UNWELL_OK.has(id)); }));
T('AC-30: chip "Mệt trong người" → chỉ bài không theo nhịp', ids(E.recommend({ contexts: ['body'] })).every(id => UNWELL_OK.has(id)));
for (const t of ['mình bị sẩy thai tháng trước', 'thai lưu', 'mất bé rồi'])
  T(`AC-36: "${t}" → không HUM/MUSIC qua 5 lần đổi, noBabyInvites, thẻ A.22`, [0, 1, 2, 3, 4].every(a => { const r = E.recommend({ text: t, contexts: ['worry_baby'] }, a); return r.noBabyInvites && r.askHuman && !ids(r).some(id => D.EXERCISES[id].withBaby); }));
// Theo B2 (anh Thông duyệt 29/10/2026; Team Lead báo QA): phiên mất con không gợi ý bài gắn với con → thứ tự Âm thanh êm dịu, Thở 4–6, Dừng 5 giây
// (lệch PRD 9.7 có chủ ý, ghi trong engine.js). Ca cũ của FE-2 giữ, chỉ sửa kỳ vọng.
T('9.7 mất con (theo B2): thứ tự ứng viên Âm thanh êm dịu, Thở 4–6 (tối đa 2 gợi ý)', ids(E.recommend({ text: 'sẩy thai' })).join() === 'AUDIO_CALM,BREATHE_46');
const RULE_CASES = [
  [{ contexts: ['sleep'] }, 'sleep', 'AUDIO_CALM,RELEASE_ZONES'],
  [{ text: 'khó ngủ quá' }, 'sleep', 'AUDIO_CALM,RELEASE_ZONES'],
  [{ contexts: ['before_visit'] }, 'worried', 'BREATHE_46,GROUND_54321'],
  [{ emotions: ['panicked'] }, 'worried', 'BREATHE_46,GROUND_54321'],
  [{ contexts: ['worry_baby'] }, 'worry_baby', 'HUM,BELLY_BREATH'],
  [{ emotions: ['angry'] }, 'irritated', 'STOP_PAUSE,GROUND_54321'],
  [{ text: 'mẹ chồng nói nặng' }, 'irritated', 'STOP_PAUSE,GROUND_54321'],
  [{ emotions: ['sad'] }, 'sad', 'BELLY_BREATH,MUSIC'],
  [{ text: 'không ai giúp mình' }, 'sad', 'BELLY_BREATH,MUSIC'],
  [{ emotions: ['tired'] }, 'tired', 'AUDIO_CALM,BELLY_BREATH'],
  [{}, 'default', 'BELLY_BREATH,MUSIC'],
  [{ text: 'hoa mắt', contexts: ['sleep'] }, 'physical', 'AUDIO_CALM,GROUND_54321']
];
for (const [inp, key, want] of RULE_CASES) { const r = E.recommend(inp); T(`9.7 ${JSON.stringify(inp)} → ${key}: ${want}`, r.summaryKey === key && ids(r).join() === want && r.summary === D.SUMMARIES[key], r.summaryKey + ' ' + ids(r)); }
T('9.7 đổi gợi ý xoay sang bài khác', ids(E.recommend({}, 0)).join() !== ids(E.recommend({}, 1)).join());
T('AC-25: sau trang khẩn ("Mình đang an toàn") → askHuman', E.recommend({ text: 'muốn chết' }).askHuman && E.recommend({ text: 'muốn chết' }).support === 'urgent');
T('AC-29: "buồn kéo dài" → askHuman', E.recommend({ text: 'buồn kéo dài' }).askHuman);
T('AC-31: chọn nhầm sau dấu hiệu "ra máu" → vẫn có gợi ý, chỉ bài không theo nhịp', (r => r.suggestions.length > 0 && ids(r).every(id => UNWELL_OK.has(id)))(E.recommend({ text: 'sáng nay ra máu' })));
T('validate: bỏ ID lạ, ID nín thở, tối đa 2', E.validate([{ exercise_id: 'BOX_4444' }, { exercise_id: 'toString' }, { exercise_id: 'HUM' }, { exercise_id: 'MUSIC' }, { exercise_id: 'STOP_PAUSE' }]).map(x => x.exercise_id).join() === 'HUM,MUSIC');
{
  const strict = loadApp(); strict.C.ALLOW_DRAFT_CONTENT = false;
  T('ALLOW_DRAFT_CONTENT=false và mọi bài draft → không gợi ý, thư viện rỗng (A.5)', strict.E.recommend({}).suggestions.length === 0 && strict.E.library().length === 0);
}
T('library(): 8 bài; unwell → 3 bài; noBaby → không HUM, MUSIC', E.library().length === 8 && E.library({ unwell: true }).length === 3 && !E.library({ noBaby: true }).some(id => ['HUM', 'MUSIC'].includes(id)));
T('inferContexts: chị đã sửa nhãn → giữ nguyên', E.inferContexts({ text: 'khó ngủ', contexts: ['work'], labelsEdited: true }).join() === 'work');
T('inferContexts: "sắp đi siêu âm, lo cho con" → before_visit, worry_baby', (x => x.includes('before_visit') && x.includes('worry_baby'))(E.inferContexts({ text: 'sắp đi siêu âm, lo cho con' })));
T('inferContexts: bỏ mã lạ', E.inferContexts({ contexts: ['after_shift', 'sleep'] }).join() === 'sleep');

/* =========================================================
   8. Dữ liệu (AC-08, 6.2, PRD 3.8, A.16)
   ========================================================= */
section('8. Dữ liệu');
const EX = Object.values(D.EXERCISES);
T('AC-08: mọi bài có goal, safety, min, max, type, status, posture', EX.every(x => x.goal && x.safety && x.min > 0 && x.max >= x.min && x.type && x.status && typeof x.posture === 'boolean'));
T('AC-08: không bài nào có holdsBreath; không BOX_4444, BREATHE_478', EX.every(x => !('holdsBreath' in x)) && !D.EXERCISES.BOX_4444 && !D.EXERCISES.BREATHE_478);
T('8 bài: thở 4–6, thở bụng nhẹ, ngân, dừng 5 giây, 5-4-3-2-1, thả lỏng, âm thanh, nhạc', ['BREATHE_46', 'BELLY_BREATH', 'HUM', 'STOP_PAUSE', 'GROUND_54321', 'RELEASE_ZONES', 'AUDIO_CALM', 'MUSIC'].every(id => D.EXERCISES[id]) && EX.length === 8);
T('AC-37: posture true trừ Dừng 5 giây', EX.every(x => x.posture === (x.id !== 'STOP_PAUSE')));
T('AC-43/44: thở 4–6 và ngân chỉ hai pha 4/6, không "Chậm hơn"', ['BREATHE_46', 'HUM'].every(id => { const x = D.EXERCISES[id]; return x.phases.length === 2 && x.phases[0].sec === 4 && x.phases[1].sec === 6 && x.paces.every(p => p.factor <= 1); }));
T('AC-46: thả lỏng 7 vùng; bụng, lưng, chân chỉ thả; không "hóp bụng", "co ngón chân" ở pha siết', (z => z.length === 7 && z.slice(4).every(v => v.releaseOnly && !v.tense) && !JSON.stringify(z).match(/hóp bụng|co ngón chân|co nhẹ các ngón/))(D.EXERCISES.RELEASE_ZONES.zones));
T('AC-47: 5-4-3-2-1 đúng 5 bước, không nhắc con cử động/đạp', D.EXERCISES.GROUND_54321.steps.length === 5 && !/đạp|cử động/.test(JSON.stringify(D.EXERCISES.GROUND_54321.steps)));
T('AC-54: không chuỗi hứa hẹn IQ / thông minh / trí não', !/\bIQ\b|thông minh hơn|phát triển trí não|phát triển não bộ|thiên tài|chứng minh khoa học/i.test(fs.readFileSync(path.join(APP, 'js', 'data.js'), 'utf8')));
T('mọi nội dung đang draft (bài, lời nhắc, dấu hiệu)', [...EX, ...D.PROMPTS, ...D.DANGER_SIGNS].every(x => x.status === 'draft'));
T('EMOTIONS 8 mã, đúng ảnh assets/capy', D.EMOTIONS.length === 8 && D.EMOTIONS.filter(e => e.img).every(e => fs.existsSync(path.join(APP, 'assets', 'capy', e.img))));
T('CONTEXTS 7 mã', D.CONTEXTS.map(c => c.code).join() === 'sleep,before_visit,worry_baby,body,family,work,other');
T('PROMPTS TG-01…TG-16', D.PROMPTS.map(p => p.id).join() === Array.from({ length: 16 }, (_, i) => 'TG-' + String(i + 1).padStart(2, '0')).join());
T('TG-05 có dòng an toàn (AC-61); TG-04, TG-10 có nút kèm đúng bài', !!D.PROMPTS[4].safety && D.PROMPTS[3].action.exercise === 'HUM' && D.PROMPTS[9].action.exercise === 'MUSIC');
T('HABITS 6, "move" mặc định tắt', D.HABITS.length === 6 && D.HABITS.find(h => h.code === 'move').defaultOn === false && D.HABITS.filter(h => h.defaultOn).length === 5);
T('TENSION_LABELS 11 nhãn', D.TENSION_LABELS.length === 11);
T('DANGER_SIGNS: 13 dòng PRD 9.3 (dòng 6 tách headache + vision)', new Set(D.DANGER_SIGNS.map(s => s.row)).size === 13 && D.DANGER_SIGNS.length === 14);
T('DANGER_SIGNS: đúng 8 kickBefore (R-07, M-46…M-53) theo thứ tự', E.signs({ place: 'kick' }).map(s => s.id).join() === 'bleeding,fluid,pain,contractions,no_movement,headache,vision,swelling'
  && E.signs({ place: 'kick' }).every(s => s.kickLabel));
T('trang signs: 11 nút khi dòng 12, 13 tắt (UX S02)', E.signs().length === 11 && !E.signs().some(s => s.id === 'vision'));
T('chip L01 gò/đau/ra máu → see_doctor với mã có trong DANGER_SIGNS', D.UNWELL_CHIPS.filter(c => c.action === 'see_doctor').length === 3 && D.UNWELL_CHIPS.every(c => !c.signs || c.signs.every(id => E.signById(id))));

/* =========================================================
   9. Lý do trang khẩn (A.20, R-15)
   ========================================================= */
section('9. urgentReasons');
const codes = l => l.map(x => x.code + (x.sign ? ':' + x.sign : '')).join(',');
T('R-15: dấu hiệu → mẹ báo → h2_low → lt10_2h', codes(E.urgentReasons({ tappedSigns: ['no_movement', 'pain'], kickReasons: ['lt10_2h', 'h2_low', 'danger_sign'] })) === 'danger_sign:pain,mother_reported,h2_low,lt10_2h');
T('kick: có dòng mở đầu M-124 và chữ kickLabel', (l => l[0].code === 'danger_sign_intro' && l[0].text === 'Chị đang thấy:' && l[1].text === 'Ra máu ở vùng kín')(E.urgentReasons({ tappedSigns: ['bleeding'], kickReasons: ['danger_sign'], kick: true })));
T('không trùng: chạm + ô viết cùng "bleeding" chỉ một dòng', E.urgentReasons({ tappedSigns: ['bleeding'], obSigns: ['bleeding'] }).length === 1);
T('ngoài mục đếm: "đau đầu" + "nhìn mờ" (cùng dòng 6) chỉ một dòng', E.urgentReasons({ obSigns: ['headache', 'vision'] }).length === 1);
T('mã lạ bị bỏ', E.urgentReasons({ tappedSigns: ['<img>'] }).length === 0);
T('kick đỏ chỉ theo giờ: M-121, M-122 đúng chữ', (l => l.map(x => x.text).join('|') === D.URGENT_REASONS.h2_low + '|' + D.URGENT_REASONS.lt10_2h)(E.urgentReasons({ kickReasons: ['h2_low', 'lt10_2h'] })));

/* =========================================================
   10. PIN yếu (AC-81, ADR 0005 mục 4.3)
   ========================================================= */
section('10. weakPin');
for (const p of ['000000', '777777', '123456', '654321', '012345', '987654', '345678', '123123', '121212', '909090', '112233', '123321', '666888', '168168', '686868'])
  T(`PIN yếu: ${p}`, E.weakPin(p, '+84912000111'));
T('PIN yếu: 6 số cuối SĐT', E.weakPin('345678', '+84 912 345 678') && E.weakPin('912345', '0909912345'));
for (const p of ['482913', '205871', '135790', '112234']) T(`PIN không yếu: ${p}`, !E.weakPin(p, '+84912000111'));
T('PIN sai dạng → false (kiểm dạng ở chỗ khác)', !E.weakPin('12345', '') && !E.weakPin('abcdef', '') && !E.weakPin(null, null));

/* =========================================================
   11. Thuần: không DOM, không storage, không tự lấy giờ
   ========================================================= */
section('11. Thuần');
const srcEngine = fs.readFileSync(path.join(APP, 'js', 'engine.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
T('engine.js không dùng document / localStorage / sessionStorage / Date / fetch', !/\bdocument\b|localStorage|sessionStorage|\bDate\b|\bfetch\s*\(/.test(srcEngine));
T('safetyCheck nhận chuỗi, object, null', E.safetyCheck('').route === 'ok' && E.safetyCheck({ narrative: 'muốn chết' }).selfHarm && E.safetyCheck(null).route === 'ok');

/* =========================================================
   12. G-1 code review Bước A (FE-2 thêm 29/10/2026): cách nói "cử động" / "máy" / "ra nhiều nước" của dấu hiệu đã duyệt
   ========================================================= */
section('12. G-1 cử động thai, ra nhiều nước');
const G1_YES = [
  ['thấy con ít cử động', 'no_movement'], ['em bé không cử động từ sáng', 'no_movement'], ['thai cử động ít hơn hôm qua', 'no_movement'],
  ['con cử động yếu lắm', 'no_movement'], ['không thấy thai máy', 'no_movement'], ['thai máy yếu', 'no_movement'],
  ['con không thấy máy', 'no_movement'], ['không thấy con cử động', 'no_movement'], ['bé ngừng cử động rồi', 'no_movement'],
  ['Em Bé Ít Cử Động', 'no_movement'], ['con không cử động, tay mình run', 'no_movement'], ['thai ngừng máy', 'no_movement'],
  ['thay con it cu dong', 'no_movement'], ['em be khong cu dong', 'no_movement'], ['thai cu dong it', 'no_movement'],
  ['ko thấy con cử động', 'no_movement'], ['thai may yeu qua', 'no_movement'], ['khong thay thai cu dong', 'no_movement'],
  ['ra nhiều nước', 'fluid'], ['tự nhiên ra nhiều nước ướt quần', 'fluid'], ['ra nhieu nuoc', 'fluid']
];
const G1_NO = ['cử động ít thôi cho đỡ mỏi', 'mình ít cử động tay chân quá', 'chị cử động nhẹ nhàng nhé', 'con cử động nhiều lắm', 'bé cử động đều',
  'thai máy đều', 'máy yếu pin quá', 'không thấy máy giặt đâu', 'minh it cu dong qua', 'cu dong nhe nhang', 'uống nhiều nước', 'nấu ra nhiều nồi'];
for (const [t, id] of G1_YES) T(`G-1 bắt ${id}: "${t}"`, (r => r.obSigns.includes(id) && r.route === 'see_doctor')(E.safetyCheck(t)), JSON.stringify(E.safetyCheck(t).obSigns));
for (const t of G1_NO) T(`G-1 không bắt: "${t}"`, (s => !s.includes('no_movement') && !s.includes('fluid'))(E.safetyCheck(t).obSigns), JSON.stringify(E.safetyCheck(t).obSigns));
T('G-1: "em bé không cử động" → lý do M-123 (mother_reported)', E.urgentReasons({ obSigns: E.safetyCheck('em bé không cử động').obSigns }).some(x => x.code === 'mother_reported'));

/* =========================================================
   13. PIN yếu khớp Apps Script (FE-2 thêm 29/10/2026): WEAK_PINS + WEAK_PINS_EXTRA của google_apps_script.js
   ========================================================= */
section('13. weakPin khớp server');
{
  const gasFile = path.join(APP, 'google_apps_script.js');
  if (!fs.existsSync(gasFile)) T('có google_apps_script.js để so PIN yếu', false, gasFile);
  else {
    const gas = fs.readFileSync(gasFile, 'utf8');
    const grab = n => ((gas.match(new RegExp('var ' + n + ' = (\\[[^\\]]*\\])')) || [])[1] || '[]').match(/\d{6}/g) || [];
    const server = [...grab('WEAK_PINS'), ...grab('WEAK_PINS_EXTRA')];
    T('server có WEAK_PINS (8) + WEAK_PINS_EXTRA (14)', server.length === 22, server.length);
    T('D.PIN.weakList trùng đúng danh sách server (không thừa, không thiếu)', [...new Set(D.PIN.weakList)].sort().join() === [...new Set(server)].sort().join(), D.PIN.weakList.join());
    for (const p of server) T('weakPin chặn mẫu server: ' + p, E.weakPin(p, '+84900000000'));
  }
  for (const p of ['482913', '205871']) T('weakPin vẫn nhận PIN thường: ' + p, !E.weakPin(p, '+84900000000'));
}

/* ===== Kết quả ===== */
console.log(`\nSAFETY_BANK ${SAFETY_BANK.length} câu: khẩn ${count.urgent} · không khẩn ${count.noturgent} · cần người hỗ trợ ${count.human} · không cần ${count.nothuman} · cơ thể ${count.phys} (trong đó ${limits.length} câu giới hạn đã ghi 6.1, hành vi như STOP-4P)`);
console.log(`Thêm từ e2e STOP-4P: ${E2E_URGENT.length} câu khẩn · ${E2E_NOT_URGENT.length} câu không khẩn. Thai kỳ 9.2b: ${HARM_YES.length} khẩn · ${HARM_NO.length} không khẩn.`);
if (failed.length) console.log('FAIL:\n  ' + failed.slice(0, 40).join('\n  '));
console.log('\nPhần FE-2: ' + passes + ' PASS · ' + fails + ' FAIL');
const qaCount = qaCases();
console.log('\nunit-engine tổng: ' + (passes + qaCount.PASS) + ' PASS · ' + (fails + qaCount.FAIL) + ' FAIL · ' + qaCount['CHỜ'] + ' CHỜ · ' + qaCount['GIỚI HẠN'] + ' giới hạn đã biết (phần FE-2 tự in số giới hạn của SAFETY_BANK)');
if (fails || qaCount.FAIL) process.exitCode = 1;


/* =========================================================
   QA THÊM (T-Q1): ca từ PRD 9.2b–9.8, AC-08/20/27/29/30/33–37/74/78/100, K-AC-34/45/48, ADR 0005 4.3.
   Bọc trong hàm để không trùng tên với phần FE-2. Hàm/danh mục chưa có → CHỜ.
   ========================================================= */
function qaCases() {

  const { createHarness, rng, fmt } = require('./lib/harness');
  const { loadApp, isStub } = require('./lib/load');

  const H = createHarness('unit-engine · phần QA thêm');
  const app = loadApp(['js/config.js', 'js/util.js', 'js/data.js', 'js/engine.js']);
  const C = app.win.LSTP_CONFIG, D = app.win.LSTP_DATA || {}, E = app.win.LSTP_ENGINE || {};
  const F = C.FEATURES || {};
  const whyE = isStub('js/engine.js') ? 'engine.js còn stub (FE-2)' : 'engine.js chưa có hàm';
  const whyD = isStub('js/data.js') ? 'data.js còn stub (FE-2)' : 'data.js chưa có danh mục';
  const list = v => (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : []);
  const idOf = x => x && (x.id || x.code || x.exercise_id);
  const sc = text => E.safetyCheck({ text });
  const has = (...f) => H.has(E, ...f);

  /* SAFETY_BANK (AC-23, 24): đã chạy đủ ở phần 2 của FE-2 — không lặp. */
  /* ===== 9.2b làm hại con (FEATURES.pregnancyHarm) ===== */
  H.section('9.2b làm hại con');
  const harm = [['mình sợ mình sẽ làm hại con', true], ['co luc minh muon lam hai em be', true], ['nghĩ tới chuyện làm hại thai', true], ['lam hai thai', true],
    ['hôm nay mình làm hai việc liền', false], ['lam hai ca lien', false], ['mẹ làm hai món cho con', false]];
  for (const [t, yes] of harm) {
    const name = '9.2b ' + (F.pregnancyHarm ? '(bật)' : '(tắt)') + ': "' + t + '" → ' + (yes && F.pregnancyHarm ? 'khẩn' : 'không khẩn');
    if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
    H.run(name, () => { const r = sc(t); H.ok(name, (r.selfHarm === true) === (yes && !!F.pregnancyHarm), fmt(r)); });
  }

  /* ===== 9.3 dấu hiệu nguy hiểm thai kỳ (AC-26, 28, 9.9) ===== */
  H.section('9.3 dấu hiệu nguy hiểm');
  const SIGN_ROWS = [
    [1, 'bleeding', ['sáng nay mình bị ra máu', 'minh bi chay mau vung kin', 'ra huyet tu toi qua'], ['chảy máu chân răng', 'mình bị chảy máu cam']],
    [2, null, ['mình bị rỉ nước ở vùng kín', 'ra nuoc nhieu tu toi qua', 'hinh nhu vo oi roi'], ['mai mình đi ra nước ngoài']],
    [3, null, ['mình đau bụng dữ dội quá', 'dau bung lien tuc tu sang'], ['mình hơi đau bụng nhẹ thôi']],
    [4, null, ['bụng gò cứng liên tục', 'bung go cung lien tuc'], ['con mèo nhà mình nằm gò lưng ngủ']],
    [5, 'no_movement', ['con đạp ít hơn mọi ngày', 'khong thay con dap', 'con dap it hon moi ngay'], ['hôm nay con đạp nhiều lắm']],
    [6, null, ['đau đầu dữ dội, nhìn mờ', 'dau dau du doi nhin mo'], ['mình hơi nhức đầu một chút']],
    [7, null, ['mặt mình bị phù nhanh quá', 'sung mat tu sang'], ['phù chân nhẹ thôi']],
    [8, null, ['hôm qua mình bị ngất xỉu', 'minh bi co giat'], ['mình ngắt điện rồi']],
    [9, null, ['mình khó thở nhiều lắm', 'dau nguc qua'], ['đi cầu thang hơi khó thở']],
    [10, null, ['mình bị sốt cao', 'lanh run ca dem'], ['trời hôm nay hơi lạnh']],
    [11, null, ['sáng nay mình bị ngã', 'minh bi nga o cau thang'], ['mình ngả lưng nghỉ chút']]
  ];
  for (const [row, id, yes, no] of SIGN_ROWS) {
    for (const t of yes) {
      const name = '9.3 dòng ' + row + ' phải bắt: "' + t + '"' + (id ? ' → ' + id : '');
      if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
      H.run(name, () => { const r = sc(t); H.ok(name, Array.isArray(r.obSigns) && r.obSigns.length > 0 && (!id || r.obSigns.includes(id)) && r.selfHarm !== true, fmt(r.obSigns)); });
    }
    for (const t of no) {
      const name = '9.3 dòng ' + row + ' không được bắt: "' + t + '"';
      if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
      H.run(name, () => { const r = sc(t); H.ok(name, Array.isArray(r.obSigns) && r.obSigns.length === 0, fmt(r.obSigns)); });
    }
  }
  for (const t of ['mình bị ngứa lòng bàn tay', 'non nhieu khong an uong duoc']) {
    const name = '9.3 dòng 12–13 ' + (F.signsItchVomit ? '(bật) phải bắt' : '(tắt, chờ anh duyệt) KHÔNG bắt') + ': "' + t + '"';
    if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
    H.run(name, () => { const r = sc(t); H.ok(name, (r.obSigns.length > 0) === !!F.signsItchVomit, fmt(r.obSigns)); });
  }
  {
    const name = 'AC-27: câu khớp cả tự hại và dấu hiệu → selfHarm và obSigns cùng có (trang tự hại có khối dẫn sang trang khám)';
    if (!has('safetyCheck')) H.wait(name, whyE);
    else { const r = sc('mình muốn chết, sáng nay ra máu'); H.ok(name, r.selfHarm === true && r.obSigns.includes('bleeding'), fmt(r)); }
  }

  /* ===== 9.4 cần người hỗ trợ, 9.4b mất con / không muốn giữ thai / không ai giúp ===== */
  H.section('9.4 / 9.4b');
  const HUMAN = [
    ['9.4: "mình bị bạo hành"', 'mình bị bạo hành', r => r.human === true],
    ['9.4: "bi danh suot" (không dấu)', 'chong minh hay bi danh suot', r => r.human === true || r.selfHarm !== true],
    ['AC-29: mức căng 9 → human', null, () => E.safetyCheck({ text: '', tension: 9 }).human === true],
    ['AC-29: "Buồn" + mức 7 → human', null, () => E.safetyCheck({ text: '', tension: 7, emotions: ['sad'] }).human === true],
    ['AC-29: "Chưa rõ" + mức 7 → human', null, () => E.safetyCheck({ text: '', tension: 7, emotions: ['unsure'] }).human === true],
    ['AC-29: "Buồn" + mức 6 → chưa cần thẻ', null, () => E.safetyCheck({ text: '', tension: 6, emotions: ['sad'] }).human !== true],
    ['AC-29: mức 8, không cảm xúc → chưa cần thẻ', null, () => E.safetyCheck({ text: '', tension: 8 }).human !== true]
  ];
  const LOSS = [
    ['mình bị sẩy thai năm ngoái', true], ['thai luu luc 10 tuan', true], ['bé nhà mình mất con rồi', true],
    ['mất công quá', false], ['mat con duong nay roi', false]
  ];
  for (const [name, t, fn] of HUMAN) {
    if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
    H.run(name, () => { const r = t ? sc(t) : null; H.ok(name, t ? fn(r) : fn(), r ? fmt(r) : ''); });
  }
  for (const [t, yes] of LOSS) {
    const name = '9.4b mất con ' + (F.lossGroup ? '(bật)' : '(tắt)') + ': "' + t + '" → ' + (yes && F.lossGroup ? 'loss' : 'không loss');
    if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
    H.run(name, () => { const r = sc(t); H.ok(name, (r.loss === true) === (yes && !!F.lossGroup) && r.selfHarm !== true, fmt(r)); });
  }
  for (const t of ['mình không muốn giữ thai', 'khong ai giup minh ca', 'mình khóc cả ngày']) {
    const name = '9.4b ' + (F.lossGroup ? '(bật)' : '(tắt)') + ': "' + t + '" → thẻ A.22 (human/loss/notKeeping/alone), không khẩn';
    if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
    H.run(name, () => { const r = sc(t); const card = r.human === true || r.loss === true || r.notKeeping === true || r.alone === true; H.ok(name, card === !!F.lossGroup && r.selfHarm !== true, fmt(r)); });
  }

  /* ===== 9.5 khó chịu trong người (AC-30) ===== */
  H.section('9.5 khó chịu trong người');
  for (const [t, yes] of [['mình thấy chóng mặt', true], ['hut hoi qua', true], ['bị chuột rút ở chân', true], ['buồn nôn cả sáng', true], ['hoa mat', true], ['mệt lả người', true],
    ['mình đọc chuyện con chuột cho con nghe', false], ['hôm nay trời đẹp', false]]) {
    const name = '9.5: "' + t + '" → ' + (yes ? 'physical' : 'không physical');
    if (!has('safetyCheck')) { H.wait(name, whyE); continue; }
    H.run(name, () => { const r = sc(t); H.ok(name, (r.physical === true) === yes, fmt(r)); });
  }

  /* ===== 9.8 thông tin nhận diện (AC-22, 65, 9.9) ===== */
  H.section('9.8 PII');
  const PII = [
    ['Bé Bơ ơi, mẹ thương con', !F.piiSkipBabyNames], ['chồng mình là anh Trần Minh Quân', true], ['bố con là anh Trần Minh Quân', true],
    ['số nhà 12 đường Lê Lợi', true], ['0912 345 678', true], ['CCCD 079123456789', true], ['mã hồ sơ AB12345', true], ['nhà mình ở phường Bến Nghé', true],
    ['email lan.nguyen@gmail.com', true],
    ['Hôm nay mẹ kể con nghe chuyện bà ngoại nấu canh chua…', false], ['Hôm nay mẹ mệt, nhưng mẹ vẫn thương con.', false], ['Sáng nay đi khám về, mình hơi lo…', false]
  ];
  for (const [t, yes] of PII) {
    const name = 'PII: "' + t + '" → ' + (yes ? 'cảnh báo' : 'không cảnh báo');
    if (!has('detectPII')) { H.wait(name, whyE); continue; }
    H.run(name, () => { const r = E.detectPII(t); H.ok(name, Array.isArray(r) && (r.length > 0) === yes && r.every(h => typeof h.text === 'string' && typeof h.why === 'string'), fmt(r)); });
  }

  /* ===== Danh mục (AC-08, 20, 100, 9.6, A.4, A.16) ===== */
  H.section('danh mục data.js');
  const EX = list(D.EXERCISES);
  const cat = (name, cond, fn) => (cond ? H.run(name, fn) : H.wait(name, whyD));
  cat('AC-08: mỗi bài có goal, safety, min, max, type, status, posture; không holdsBreath; không BOX_4444/BREATHE_478', EX.length, () => {
    const bad = EX.filter(e => !['goal', 'safety', 'min', 'max', 'type', 'status'].every(k => e[k] != null && e[k] !== '') || typeof e.posture !== 'boolean' || e.holdsBreath === true);
    H.ok('AC-08: mỗi bài có goal, safety, min, max, type, status, posture; không holdsBreath; không BOX_4444/BREATHE_478', !bad.length && !EX.some(e => ['BOX_4444', 'BREATHE_478'].includes(idOf(e))), bad.map(idOf).join(','));
  });
  cat('AC-37: posture true cho mọi bài trừ Dừng 5 giây', EX.length, () => {
    const p5 = EX.filter(e => /Dừng 5 giây/.test(e.title || e.name || ''));
    H.ok('AC-37: posture true cho mọi bài trừ Dừng 5 giây', p5.length === 1 && p5[0].posture === false && EX.filter(e => e !== p5[0]).every(e => e.posture === true), fmt(EX.map(e => [idOf(e), e.posture])));
  });
  cat('AC-20: 8 cảm xúc (6 của Check-in Mẹ Bầu + Mệt + Chưa rõ), nhãn đúng A.4', list(D.EMOTIONS).length, () =>
    H.eq('AC-20: 8 cảm xúc (6 của Check-in Mẹ Bầu + Mệt + Chưa rõ), nhãn đúng A.4', list(D.EMOTIONS).map(e => e.label), ['Vui vẻ', 'Buồn', 'Lo lắng', 'Tức giận', 'Hoảng hốt', 'Khó chịu', 'Mệt', 'Chưa rõ']));
  cat('AC-20: TENSION_LABELS 0–10 nguyên văn A.4', list(D.TENSION_LABELS).length, () =>
    H.eq('AC-20: TENSION_LABELS 0–10 nguyên văn A.4', list(D.TENSION_LABELS).map(x => (typeof x === 'string' ? x : x.label)),
      ['Rất nhẹ nhõm', 'Nhẹ nhõm', 'Khá thả lỏng', 'Hơi căng', 'Căng nhẹ', 'Căng vừa', 'Khá căng', 'Căng nhiều', 'Rất căng', 'Cực kỳ căng', 'Căng nhất']));
  cat('9.6: 7 ngữ cảnh đúng mã và chip A.4', list(D.CONTEXTS).length, () =>
    H.eq('9.6: 7 ngữ cảnh đúng mã và chip A.4', list(D.CONTEXTS).map(c => [idOf(c), c.label]),
      [['sleep', 'Khó ngủ'], ['before_visit', 'Sắp đi khám'], ['worry_baby', 'Lo cho con'], ['body', 'Mệt trong người'], ['family', 'Chuyện gia đình'], ['work', 'Công việc'], ['other', 'Khác']]));
  cat('PRD 3.8/AC-100: 6 thói quen, mã đúng, chỉ "move" mặc định tắt', list(D.HABITS).length, () =>
    H.eq('PRD 3.8/AC-100: 6 thói quen, mã đúng, chỉ "move" mặc định tắt', list(D.HABITS).map(h => [idOf(h), !!h.defaultOn]),
      [['kick', true], ['thai_giao', true], ['breath', true], ['move', false], ['water', true], ['side_sleep', true]]));
  cat('A.16: đủ 16 lời nhắc TG-01…TG-16, TG-05 có dòng an toàn nguyên văn', list(D.PROMPTS).length, () => {
    const P = list(D.PROMPTS);
    const tg5 = P.find(p => idOf(p) === 'TG-05') || {};
    H.ok('A.16: đủ 16 lời nhắc TG-01…TG-16, TG-05 có dòng an toàn nguyên văn', fmt(P.map(idOf)) === fmt(Array.from({ length: 16 }, (_, i) => 'TG-' + String(i + 1).padStart(2, '0'))) &&
      tg5.safety === 'Xoa nhẹ thôi, không ấn, không day mạnh. Bụng gò cứng thì chị dừng, nằm nghiêng nghỉ nhé.', fmt([P.map(idOf), tg5.safety]));
  });
  const DS = list(D.DANGER_SIGNS);
  const PRD93 = ['Ra máu ở vùng kín, dù ít', 'Ra nước nhiều, hoặc rỉ nước liên tục ở vùng kín', 'Đau bụng nhiều, đau không dứt', 'Bụng gò cứng nhiều lần, đều đặn, khi chưa tới ngày sinh',
    'Con đạp ít hơn hẳn mọi ngày, hoặc không thấy con đạp', 'Đau đầu nhiều, nhìn mờ, thấy đom đóm mắt', 'Mặt, tay, chân sưng phù lên nhanh', 'Co giật, ngất, xỉu', 'Khó thở nhiều, đau ngực',
    'Sốt cao, lạnh run', 'Bị té ngã hay va đập vào bụng'];
  cat('AC-74: DANGER_SIGNS có đủ 11 "Lời hiển thị" của 9.3 (dòng 1–11) nguyên văn', DS.length, () => {
    const labels = DS.map(s => s.label);
    const miss = PRD93.filter(l => !labels.includes(l));
    H.ok('AC-74: DANGER_SIGNS có đủ 11 "Lời hiển thị" của 9.3 (dòng 1–11) nguyên văn', !miss.length, 'thiếu: ' + miss.join(' | '));
  });
  cat('R-07/K-AC-34: đúng 8 dấu hiệu kickBefore (bleeding, fluid, pain, contractions, headache, vision, swelling, no_movement)', DS.length, () =>
    H.eq('R-07/K-AC-34: đúng 8 dấu hiệu kickBefore (bleeding, fluid, pain, contractions, headache, vision, swelling, no_movement)', DS.filter(s => s.kickBefore).map(idOf).sort(),
      ['bleeding', 'contractions', 'fluid', 'headache', 'no_movement', 'pain', 'swelling', 'vision']));
  cat('K-AC-34/A.4: nhãn mục đếm của 8 dấu hiệu nguyên văn M-46…M-53', DS.length, () => {
    const want = { bleeding: 'Ra máu ở vùng kín', fluid: 'Rỉ nước hoặc ra nhiều nước ở vùng kín', pain: 'Đau bụng nhiều', contractions: 'Bụng gò cứng từng cơn', headache: 'Nhức đầu nhiều',
      vision: 'Mắt nhìn mờ, thấy đốm sáng', swelling: 'Mặt, tay hoặc chân sưng phù lên nhanh', no_movement: 'Con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày' };
    const got = {}; Object.keys(want).forEach(id => { const s = DS.find(x => idOf(x) === id) || {}; got[id] = Object.values(s).find(v => typeof v === 'string' && v === want[id]) || s.kickLabel || s.label || null; });
    H.eq('K-AC-34/A.4: nhãn mục đếm của 8 dấu hiệu nguyên văn M-46…M-53', got, want);
  });
  cat('mọi dấu hiệu có status draft|approved (R-16)', DS.length, () => H.ok('mọi dấu hiệu có status draft|approved (R-16)', DS.every(s => ['draft', 'approved'].includes(s.status)), fmt(DS.map(s => [idOf(s), s.status]))));
  cat('K-AC-45: dữ liệu duyệt / chữ hiển thị ghi ngưỡng ba mức "anh Thông duyệt 29/10/2026" (ngoài comment)', Object.keys(D).length, () => {
    const fs = require('fs'), path = require('path'), dir = path.join(__dirname, '..', 'js');
    const code = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')).join('\n');
    H.ok('K-AC-45: dữ liệu duyệt / chữ hiển thị ghi ngưỡng ba mức "anh Thông duyệt 29/10/2026" (ngoài comment)', /anh Thông duyệt 29\/10\/2026/.test(JSON.stringify(D)) || /anh Thông duyệt 29\/10\/2026/.test(code), 'không thấy chuỗi ngoài comment');
  });

  /* Chữ hiển thị trong data.js (không tính KEYWORDS/PII/từ khóa): từ cấm */
  {
    const name = 'AC-06/AC-54: chữ hiển thị trong data.js không có "bạn", "vui lòng", "hệ thống", "IQ", "thông minh hơn", "phát triển trí não/não bộ", "thiên tài", "chứng minh khoa học"';
    if (!Object.keys(D).length) H.wait(name, whyD);
    else {
      const hits = [];
      const walk = (v, p) => {
        if (typeof v === 'string') {
          if (/(?<![\p{L}])bạn(?![\p{L}])|vui lòng|hệ thống|thông minh hơn|phát triển trí não|phát triển não bộ|thiên tài|chứng minh khoa học/iu.test(v) || /\bIQ\b/.test(v)) hits.push(p + ': ' + v);
        } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, p + '[' + i + ']'));
        else if (v && typeof v === 'object' && Object.prototype.toString.call(v) !== '[object RegExp]') Object.keys(v).forEach(k => walk(v[k], p + '.' + k));
      };
      Object.keys(D).filter(k => !['KEYWORDS', 'PII', 'PIN'].includes(k)).forEach(k => {
        if (k === 'DANGER_SIGNS') list(D[k]).forEach((s, i) => Object.keys(s).filter(x => !['strict', 'loose', 'exclude', 'patterns'].includes(x)).forEach(x => walk(s[x], k + '[' + i + '].' + x)));
        else walk(D[k], k);
      });
      H.ok(name, !hits.length, hits.slice(0, 5).join(' | '));
    }
  }
  {
    const name = 'R-10/K-AC-48: lý do trang khẩn (URGENT_REASONS) không có chữ trấn an / kỹ thuật';
    const ur = D.URGENT_REASONS;
    if (!ur) H.wait(name, whyD);
    else {
      const txt = JSON.stringify(ur).toLowerCase();
      const bad = ['bình thường', 'thông thường', 'bất thường', 'không sao', 'yên tâm', 'đừng lo', 'khỏe mạnh', 'an toàn rồi', 'tốt rồi', 'ổn rồi', 'giỏi quá', 'nhanh quá',
        'vui lòng', 'hệ thống', 'fgr', 'sga', 'cardiff', 'baseline', 'mức xanh', 'mức vàng', 'mức đỏ'].filter(w => txt.includes(w));
      H.ok(name, !bad.length, bad.join(', '));
    }
  }

  /* ===== urgentReasons (R-15, AC-78) ===== */
  H.section('urgentReasons');
  {
    const n1 = 'AC-78/R-15: lý do theo thứ tự danger_sign → mother_reported → h2_low → lt10_2h, chữ M-121/M-122/M-123 nguyên văn';
    const n2 = 'AC-78: con đạp ít ở cả ô viết/trang dấu hiệu và mục đếm → M-123 chỉ một lần (không trùng)';
    const n3 = 'M-124: mỗi dấu hiệu một dòng, chữ là tên dòng 9.3';
    if (!has('urgentReasons')) [n1, n2, n3].forEach(n => H.wait(n, whyE));
    else {
      const r = E.urgentReasons({ obSigns: ['bleeding'], kickReasons: ['lt10_2h', 'h2_low', 'mother_reported'], tappedSigns: [] });
      const t = c => (r.find(x => x.code === c) || {}).text;
      H.ok(n1, fmt(r.map(x => x.code).filter((c, i, a) => a.indexOf(c) === i)) === fmt(['danger_sign', 'mother_reported', 'h2_low', 'lt10_2h']) &&
        t('h2_low') === 'Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống.' && t('lt10_2h') === 'Trong 2 giờ, con cử động chưa đủ 10 lần.' &&
        t('mother_reported') === 'Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.', fmt(r));
      const r2 = E.urgentReasons({ obSigns: ['no_movement'], kickReasons: ['mother_reported'], tappedSigns: ['no_movement'] });
      H.ok(n2, r2.filter(x => x.code === 'mother_reported' || /ít hơn hẳn mọi ngày/.test(x.text)).length === 1, fmt(r2));
      const r3 = E.urgentReasons({ obSigns: [], kickReasons: [], tappedSigns: ['bleeding', 'headache'] });
      H.ok(n3, r3.length === 2 && r3.every(x => x.code === 'danger_sign') && r3[0].text === 'Ra máu ở vùng kín, dù ít', fmt(r3));
    }
  }

  /* ===== recommend / validate (AC-33, 34, 35, 30, 36) ===== */
  H.section('recommend / validate');
  const exIds = EX.map(idOf);
  const byTitle = re => (EX.find(e => re.test(e.title || e.name || '')) || {}).id;
  const PAUSE = byTitle(/Dừng 5 giây/), CALM = byTitle(/Âm thanh êm dịu/), GROUND = byTitle(/Về với lúc này/), MUSIC = byTitle(/Nghe nhạc cùng con/), HUM = byTitle(/Ngân/);
  const recInput = o => Object.assign({ emotions: [], tension: null, contexts: [], minutes: null, text: '' }, o);
  {
    const n35 = 'AC-35: 500 tổ hợp ngẫu nhiên → ≤ 2 gợi ý, mọi ID trong danh mục, không holdsBreath, có lý do';
    const n34 = 'AC-34: chọn 1 phút → không bài có min > 1; không còn bài thì gợi ý Dừng 5 giây';
    const n30 = 'AC-30: khó chịu trong người ("chong mat") → chỉ Âm thanh êm dịu / Về với lúc này / Dừng 5 giây';
    const n36 = 'AC-36: nhóm mất con → không "Nghe nhạc cùng con", không "Ngân ừm cùng con"';
    const n33 = 'AC-33: "Đổi gợi ý" (attempt 0 → 1) xoay sang gợi ý khác khi còn ứng viên';
    if (!has('recommend') || !EX.length) [n35, n34, n30, n36, n33].forEach(n => H.wait(n, has('recommend') ? whyD : whyE));
    else {
      const rand = rng(35);
      const EMO = list(D.EMOTIONS).map(idOf), CTX = list(D.CONTEXTS).map(idOf), MINS = [null, 1, 3, 5, 10, 15];
      const TXT = ['', 'mình lo quá', 'khó ngủ mấy hôm nay', 'chong mat', 'mẹ chồng nói nhiều', 'sắp đi siêu âm', 'mình buồn', 'mệt lả', 'sẩy thai năm ngoái', 'bé đạp nhiều'];
      const bad = [];
      for (let i = 0; i < 500; i++) {
        const pick = a => a[Math.floor(rand() * a.length)];
        const inp = recInput({ emotions: EMO.filter(() => rand() < 0.2), tension: rand() < 0.2 ? null : Math.floor(rand() * 11), contexts: CTX.filter(() => rand() < 0.15), minutes: pick(MINS), text: pick(TXT) });
        const r = E.recommend(inp, Math.floor(rand() * 4));
        const s = (r && r.suggestions) || [];
        if (s.length > 2 || s.some(x => !exIds.includes(x.exercise_id) || (EX.find(e => idOf(e) === x.exercise_id) || {}).holdsBreath || !x.reason)) bad.push(fmt([inp, s]));
      }
      H.ok(n35, !bad.length, bad.slice(0, 2).join(' | '));
      const bad34 = [];
      for (const emo of [[], ...EMO.map(e => [e])]) for (const ctx of [[], ...CTX.map(c => [c])]) {
        const s = (E.recommend(recInput({ emotions: emo, contexts: ctx, minutes: 1 }), 0) || {}).suggestions || [];
        if (!s.length || s.some(x => (EX.find(e => idOf(e) === x.exercise_id) || {}).min > 1)) bad34.push(fmt([emo, ctx, s.map(x => x.exercise_id)]));
      }
      // "chong mat" + 1 phút: ứng viên Âm thanh êm dịu (min 5), Về với lúc này (min 2) bị lọc → chỉ còn Dừng 5 giây
      const only = ((E.recommend(recInput({ text: 'chong mat', minutes: 1 }), 0) || {}).suggestions || []).map(x => x.exercise_id);
      H.ok(n34, !bad34.length && fmt(only) === fmt([PAUSE]), bad34.slice(0, 3).join(' | ') + ' · chong mat + 1 phút → ' + fmt(only));
      const s30 = ((E.recommend(recInput({ text: 'chong mat', minutes: 15 }), 0) || {}).suggestions || []).map(x => x.exercise_id);
      H.ok(n30, s30.length > 0 && s30.every(id => [CALM, GROUND, PAUSE].includes(id)), fmt(s30));
      if (!F.lossGroup) H.wait(n36, 'FEATURES.lossGroup đang tắt');
      else {
        const s36 = [0, 1, 2, 3].flatMap(a => ((E.recommend(recInput({ text: 'mình bị sẩy thai năm ngoái', minutes: 15 }), a) || {}).suggestions || []).map(x => x.exercise_id));
        H.ok(n36, s36.length > 0 && !s36.includes(MUSIC) && !s36.includes(HUM), fmt(s36));
      }
      const a0 = ((E.recommend(recInput({ minutes: 15 }), 0) || {}).suggestions || []).map(x => x.exercise_id);
      const a1 = ((E.recommend(recInput({ minutes: 15 }), 1) || {}).suggestions || []).map(x => x.exercise_id);
      H.ok(n33, a0.length >= 1 && fmt(a0) !== fmt(a1), fmt([a0, a1]));
    }
    const nv = 'validate: bỏ ID ngoài danh mục (BOX_4444) và bài holdsBreath, giữ bài hợp lệ';
    if (!has('validate') || !EX.length) H.wait(nv, whyE);
    else {
      const r = E.validate([{ exercise_id: 'BOX_4444', reason: 'x' }, { exercise_id: exIds[1], reason: 'y' }, { exercise_id: 'BREATHE_478', reason: 'z' }]);
      H.ok(nv, Array.isArray(r) && r.length === 1 && r[0].exercise_id === exIds[1], fmt(r));
    }
  }

  /* ===== weakPin (AC-81, ADR 0005 mục 4.3) ===== */
  H.section('weakPin');
  const PHONE = '+84912345678';
  const WEAK = ['000000', '111111', '999999', '123456', '234567', '012345', '654321', '987654', '543210', '123123', '456456', '121212', '909090', '345678',
    '112233', '123321', '666888', '888888', '168168', '686868'];
  const STRONG = ['274915', '583027', '730196', '491862'];
  for (const p of WEAK) {
    const name = 'weakPin("' + p + '", ' + PHONE + ') → yếu' + (p === '345678' ? ' (6 số cuối SĐT)' : '');
    if (!has('weakPin')) { H.wait(name, whyE); continue; }
    H.eq(name, E.weakPin(p, PHONE), true);
  }
  for (const p of STRONG) {
    const name = 'weakPin("' + p + '") → không yếu';
    if (!has('weakPin')) { H.wait(name, whyE); continue; }
    H.eq(name, E.weakPin(p, PHONE), false);
  }
  {
    const name = 'weakPin: "123905" yếu với SĐT +84978123905 (6 số cuối), không yếu với SĐT khác';
    if (!has('weakPin')) H.wait(name, whyE);
    else H.ok(name, E.weakPin('123905', '+84978123905') === true && E.weakPin('123905', '+84912345678') === false, fmt([E.weakPin('123905', '+84978123905'), E.weakPin('123905', '+84912345678')]));
  }

  /* ===== B2 (Team Lead 29/10/2026, FE-2 thêm ca): phiên có mất con / sẩy thai / thai lưu → 0 bài gắn với con =====
     Bài gắn với con = withBaby hoặc có chữ "con" ở tên / lời dẫn (gồm "Thở bụng nhẹ, tay ôm con"). Thay PRD 9.7 dòng "mất con". */
  H.section('B2 mất con: không bài gắn với con');
  {
    const hasCon = e => /(^|[^\p{L}])con(?![\p{L}])/u.test(JSON.stringify([e.title, e.goal, e.safety, e.lead, e.steps, e.end, e.fine, e.empty]));
    const tied = id => { const e = EX.find(x => idOf(x) === id) || {}; return !!e.withBaby || hasCon(e); };
    const nTag = 'B2: mọi bài có chữ "con" ở tên / lời dẫn đều có withBaby';
    if (!EX.length) H.wait(nTag, whyD); else H.ok(nTag, EX.every(e => !hasCon(e) || e.withBaby), fmt(EX.filter(e => hasCon(e) && !e.withBaby).map(idOf)));
    const LOSS_YES = ['mình bị sẩy thai năm ngoái', 'thai luu luc 10 tuan', 'bé nhà mình mất con rồi', 'thai lưu', 'say thai', 'hu thai lan truoc', 'mất bé rồi', 'thai mất tim'];
    const EXTRA = [{}, { contexts: ['worry_baby'] }, { emotions: ['sad'], tension: 8 }, { contexts: ['sleep'] }, { emotions: ['tired'] }];
    for (const t of LOSS_YES) for (const ex of EXTRA) {
      const name = 'B2: "' + t + '" ' + fmt(ex) + ' × 3 lần đổi gợi ý → 0 bài gắn với con, noBabyInvites';
      if (!has('recommend') || !F.lossGroup) { H.wait(name, has('recommend') ? 'FEATURES.lossGroup đang tắt' : whyE); continue; }
      const rs = [0, 1, 2].map(a => E.recommend(recInput(Object.assign({ text: t, minutes: 15 }, ex)), a));
      const got = rs.flatMap(r => r.suggestions.map(x => x.exercise_id));
      H.ok(name, rs.every(r => r.noBabyInvites === true && r.suggestions.length > 0) && !got.some(tied), fmt(got));
    }
    const nLib = 'B2: library({noBaby:true}) chỉ còn bài trung tính (Dừng 5 giây, Thở 4–6, 5-4-3-2-1, Thả lỏng từng vùng, Âm thanh êm dịu)';
    if (!has('library')) H.wait(nLib, whyE);
    else { const l = E.library({ noBaby: true }); H.ok(nLib, l.length === 5 && !l.some(tied) && [PAUSE, CALM, GROUND].every(id => l.includes(id)), fmt(l)); }
    const nKeep = 'B2: không có nhóm mất con → vẫn gợi ý "Thở bụng nhẹ, tay ôm con" (thẻ Mệt)';
    if (!has('recommend')) H.wait(nKeep, whyE);
    else { const s = E.recommend(recInput({ emotions: ['tired'] }), 0).suggestions.map(x => x.exercise_id); H.ok(nKeep, s.includes('BELLY_BREATH') && !E.recommend(recInput({ emotions: ['tired'] }), 0).noBabyInvites, fmt(s)); }
  }

  return H.done();

}
