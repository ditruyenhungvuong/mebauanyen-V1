/* =========================================================
   Danh mục chữ NGUYÊN VĂN – Mẹ Bầu An Yên (chủ: qa-tester). Dùng cho check-static mục 7.
   Nguồn: docs/specs/lifestyle-thai-phu-prd.md v1.0 Phụ lục A (A.x) và docs/specs/dem-cu-dong-thai-prd.md v1.0
   Phụ lục A (M-xx), bản ĐÃ đồng bộ 8 câu theo docs/specs/lifestyle-thai-phu-van-phong.md mục 5b (29/10/2026).
   Mỗi nhóm: { id, owner: [file chính], anchor: [câu đặc trưng, tìm trong owner] | null, items: [chuỗi] }.
   - {…} trong chuỗi = phần thay theo dữ liệu (khớp mọi đoạn ngắn).
   - Chữ in đậm/nghiêng của PRD đã bỏ dấu **, *; nút hai dòng tách làm hai chuỗi.
   - check-static tự kiểm danh mục này còn khớp tài liệu (mỗi chuỗi phải có trong PRD) để không lệch khi PRD đổi.
   Cách chấm (check-static): nhóm chưa có anchor trong mã → CHỜ cả nhóm; nhóm đã có → chuỗi thiếu là THIẾU (WARN,
   --strict thì FAIL); chuỗi "gần giống" mà không nguyên văn → FAIL.
   ========================================================= */
'use strict';

module.exports = [
  /* ===== PRD lifestyle – Phụ lục A ===== */
  { id: 'A.1 Màn chào', owner: ['js/app.js'], anchor: ['Mỗi ngày, chị dành một chút thời gian cho mình và cho con nhé.'], items: [
    '🌸 Mẹ Bầu An Yên', 'Chào chị,', 'Mỗi ngày, chị dành một chút thời gian cho mình và cho con nhé.',
    'Dùng ẩn danh', 'Không cần số điện thoại',
    'App không hỏi tên. Khi chị đăng nhập, mình lưu hành trình mang thai của chị (thói quen, lượt đếm và bước chân con, mức căng) vào tài khoản ở bệnh viện. Lời nhắn chị viết cho con chỉ lên tài khoản khi chị tự chọn.',
    'App không thay cho việc khám thai. Thấy điều gì lạ trong người, chị đi khám nhé.',
    'Dấu hiệu cần đi khám ngay ›'] },
  { id: 'A.1 Chọn cách lưu (A02)', owner: ['js/app.js'], anchor: ['Chị muốn lưu trên máy này không?'], items: [
    'Chị muốn lưu trên máy này không?', 'Lưu trên máy này', 'Chỉ máy này xem được. Có thống kê thói quen trên máy.',
    'Không lưu gì', 'Đóng trang là mất.', 'Ẩn danh thì app không gửi gì lên mạng.'] },
  { id: 'A.2 Đồng ý lưu (A03)', owner: ['js/app.js'], anchor: ['Chị muốn lưu những gì?'], items: [
    'Chị muốn lưu những gì?', 'Mỗi mục là một lựa chọn riêng. Chị đổi lại được bất cứ lúc nào nhé.',
    'Lưu hành trình', 'cảm xúc chị chọn, mức căng, bài đã thử, thói quen đã tick, lượt đếm cử động thai, những ngày đã làm thai giáo, ngày dự sinh.',
    'Lưu cả những gì chị tự viết', 'lời nhắn cho con, ghi chú. Mặc định tắt.',
    'Dữ liệu nằm trong trình duyệt của máy này. Ai mở được trình duyệt này cũng xem được. Máy dùng chung thì chị chọn "không lưu" nhé.',
    'Tiếp tục ›', 'Thôi, không lưu gì',
    'Muốn lưu, chị cần chọn mục đầu tiên. Không muốn lưu thì chị chọn "Thôi, không lưu gì" nhé.'] },
  { id: 'A.2b Đồng ý tài khoản (A06)', owner: ['js/account.js'], anchor: ['Trước khi lưu, chị đọc giúp mình nhé'], items: [
    'Trước khi lưu, chị đọc giúp mình nhé',
    'Khi chị đăng nhập, mình lưu hành trình mang thai của chị ở Google Sheet của bệnh viện: thói quen chị tick, những ngày đã làm thai giáo, mức căng trước và sau bài, bài đã làm, lượt đếm cử động thai (giờ, số lần, mức), chỗ con đạp trên bụng mẹ và ngày dự sinh. Nhờ vậy, chị xem lại được bản đồ bước chân của con trên máy khác.',
    'Mình không bao giờ gửi mã PIN của chị lên. Lời nhắn chị viết cho con chỉ lên khi chị bật ô bên dưới.',
    'Chị xóa tài khoản lúc nào cũng được. Khi đó, mình xóa hết dữ liệu của chị trên Sheet.',
    'Mình đồng ý lưu nhật ký lên Sheet của bệnh viện', 'Lưu lời nhắn của mình lên tài khoản', 'Lưu cả những gì mình tự viết trên máy này',
    'Đồng ý và tạo tài khoản ›', 'Thôi, mình dùng ẩn danh',
    'Muốn đăng nhập, chị cần đồng ý mục đầu tiên. Không muốn thì chị dùng ẩn danh nhé.'] },
  { id: 'A.2c Lưu lời nhắn lên tài khoản', owner: ['js/account.js'], anchor: ['Lời nhắn này sẽ được lưu vào tài khoản của chị.'], items: [
    'Lời nhắn cho con, những gì chị kể thêm và ghi lại sẽ được lưu vào tài khoản, để đăng nhập máy khác vẫn đọc lại được. Trước khi lưu, mình sẽ nhắc nếu trong chữ có họ tên, số điện thoại hay địa chỉ. Chị tắt lúc nào cũng được.',
    'Gửi cả {n} lời nhắn đã có trên máy này lên tài khoản không?', 'Gửi lên', 'Thôi, chỉ từ giờ',
    'Những lời nhắn đã lưu lên tài khoản thì sao?', 'Xóa luôn trên tài khoản', 'Giữ những gì đã gửi, từ giờ không gửi thêm',
    'Lời nhắn này sẽ được lưu vào tài khoản của chị.',
    'Lời nhắn này chỉ ở trên máy này. Muốn đọc lại ở máy khác, chị bật "Lưu lời nhắn của mình lên tài khoản" trong Dữ liệu của chị nhé.',
    'Đã lưu lên tài khoản', 'Đã xóa lời nhắn, cả trên tài khoản.', 'Đã tắt lưu lời nhắn lên tài khoản.',
    'Mình chưa xóa được trên tài khoản. Chị thử lại khi có mạng nhé.'] },
  { id: 'A.3 Dừng 5 giây (T01)', owner: ['js/relax.js', 'js/players.js', 'js/data.js'], anchor: ['Lúc này mình đang thế nào?'], items: [
    'Chị thả lỏng vai, đặt tay lên bụng nếu muốn, và tự hỏi:', 'Lúc này mình đang thế nào?', 'Bỏ qua', 'Tiếp tục ›'] },
  { id: 'A.4 Check-in (T02)', owner: ['js/relax.js'], anchor: ['Lúc này chị thấy thế nào?'], items: [
    'Lúc này chị thấy thế nào?', 'Chạm chọn một hoặc vài bé capybara giống chị nhất. Không chọn cũng được.',
    'Vui vẻ', 'Buồn', 'Lo lắng', 'Tức giận', 'Hoảng hốt', 'Khó chịu', 'Mệt', 'Chưa rõ',
    'Chị đang căng ở mức nào?', 'Không muốn trả lời', 'Tự đánh giá, không phải thang chẩn đoán.',
    'Chị muốn kể thêm không? (không bắt buộc)', 'Sáng nay đi khám về, mình hơi lo…',
    '🔒 Không ghi họ tên, số điện thoại, số căn cước hay mã hồ sơ khám thai nhé.',
    'Điều gì đang làm chị bận lòng?', 'Khó ngủ', 'Sắp đi khám', 'Lo cho con', 'Mệt trong người', 'Chuyện gia đình', 'Công việc', 'Khác',
    'Chị có bao nhiêu phút?', 'Xem gợi ý ›', 'Vào thẳng thư viện'] },
  { id: 'A.5 Gợi ý (T03)', owner: ['js/relax.js'], anchor: ['Mình thử cùng nhau nhé'], items: [
    'Mình thử cùng nhau nhé', 'Cảm ơn chị đã dừng lại lắng nghe mình.',
    'Lo trước buổi khám là điều rất thường gặp. Mình thử cho hơi thở chậm lại một chút nhé.',
    'Đầu óc còn chạy thì khó ngủ lắm. Mình thử giúp cơ thể mềm xuống nhé.',
    'Thương con nên mới lo. Mình thử ở cùng con vài phút nhé.', 'Buồn cũng đáng được lắng nghe. Chị không cần phải vui lên ngay.',
    'Bực bội là chuyện tự nhiên. Mình dừng lại một chút, rồi chị chọn điều chị muốn làm tiếp nhé.',
    'Mệt thì nghỉ thôi. Mình chọn bài nhẹ nhất nhé.', 'Có vẻ trong người chị đang không khỏe. Mình ưu tiên nghỉ trước nhé.',
    'Bắt đầu ›', 'Đổi gợi ý', 'Xem cả thư viện',
    'Thư viện đang chờ duyệt nội dung. Trong lúc chờ, chị cứ thở theo nhịp tự nhiên của mình nhé.'] },
  { id: 'A.6 Thẻ tư thế', owner: ['js/players.js', 'js/relax.js', 'js/data.js'], anchor: ['Chị ngồi tựa lưng thoải mái, hoặc nằm nghiêng bên trái, kê một chiếc gối giữa hai đầu gối. Khi bụng đã lớn, nhất là 3 tháng cuối, chị tránh nằm ngửa lâu nhé.'], items: [
    'Chị ngồi tựa lưng thoải mái, hoặc nằm nghiêng bên trái, kê một chiếc gối giữa hai đầu gối. Khi bụng đã lớn, nhất là 3 tháng cuối, chị tránh nằm ngửa lâu nhé.',
    'Bụng đã lớn rồi, chị tránh nằm ngửa lâu nhé. Nằm nghiêng bên trái là dễ chịu nhất.',
    'Thấy chóng mặt, hụt hơi, bụng gò cứng hay đau bụng, chị dừng ngay và bấm "Mình thấy khó chịu" nhé.'] },
  { id: 'A.7 Thở chậm 4–6', owner: ['js/players.js', 'js/data.js'], anchor: ['Thở ra dài hơn hít vào một chút, cơ thể dịu lại.'], items: [
    'Thở ra dài hơn hít vào một chút, cơ thể dịu lại.', 'Không nín thở, không cố hít thật sâu. Nhịp chỉ là gợi ý, chị luôn có thể thở tự nhiên.',
    'Hít vào nhẹ bằng mũi, như bé rồng lấy hơi.', 'Thở ra chậm bằng miệng, như thổi cho chong chóng quay thật lâu.',
    'Hơi thở ra hết thì thôi. Không giữ hơi lại, không cố thêm.', 'Hít vào nhẹ nhàng', 'Thở ra chậm, dài', 'Ngắn hơn', 'Gợi ý', 'Âm báo khi đổi nhịp',
    '▶ Bắt đầu', '❚❚ Tạm dừng', '▶ Tiếp tục', '■ Dừng',
    'Vòng tròn chỉ là gợi ý. Nhịp không hợp thì chị cứ thở theo cách của mình nhé.', 'Xong rồi. Chị thở tự nhiên thêm vài hơi nhé.'] },
  { id: 'A.8 Thở bụng nhẹ', owner: ['js/players.js', 'js/data.js'], anchor: ['Đặt tay lên bụng, cảm nhận hơi thở đi vào, đi ra.'], items: [
    'Đặt tay lên bụng, cảm nhận hơi thở đi vào, đi ra.', 'Bụng phồng nhẹ là đủ. Không ấn tay, không gồng bụng, không nín hơi.',
    'Chị đặt một tay lên ngực, một tay lên bụng. Đặt nhẹ thôi, không ấn.', 'Hít vào bằng mũi. Để bụng phồng lên một chút dưới bàn tay.',
    'Thở ra chậm, môi hơi chúm, như đang thổi nguội một thìa canh.', 'Bụng lớn rồi thì thở được đến đâu hay đến đó. Không cần cố.',
    'Cứ thế vài hơi thở, hoặc bao nhiêu chị thấy thoải mái.', 'Tiếp ›',
    'Chị vừa dành cho mình mấy hơi thở chậm. Khác hay không khác đều ổn.'] },
  { id: 'A.9 Ngân "ừm"', owner: ['js/players.js', 'js/data.js'], anchor: ['Thở ra kèm tiếng ngân khẽ, hơi thở tự chậm lại.'], items: [
    'Thở ra kèm tiếng ngân khẽ, hơi thở tự chậm lại.', 'Ngân khẽ thôi, không cần to. Hít vào tự nhiên, không nín hơi trước khi ngân. Chóng mặt thì dừng nhé.',
    'Chị khép nhẹ môi, hai hàm răng hơi tách nhau.', 'Hít vào nhẹ bằng mũi.', 'Thở ra và ngân "ừmmm" thật khẽ. Chị nghe tiếng rung nhẹ ở môi, ở ngực.',
    'Hơi hết thì tiếng ngân cũng hết. Không kéo dài cố.', 'Nếu muốn, chị đặt tay lên bụng trong lúc ngân.', 'Thở ra, ngân "ừmmm" khẽ',
    'Xong rồi. Chị ngồi yên thêm một chút, nghe cơ thể mình nhé.'] },
  { id: 'A.10 Về với lúc này', owner: ['js/players.js', 'js/data.js'], anchor: ['Lần lượt nhìn, chạm, nghe, ngửi, cảm nhận để trở về với lúc này.'], items: [
    'Lần lượt nhìn, chạm, nghe, ngửi, cảm nhận để trở về với lúc này.', 'Không cần tìm cho đủ. Mang thai hay nhạy mùi, chị bỏ qua bước nào cũng được.',
    'Tìm 5 thứ chị nhìn thấy: một màu sắc, một hình dạng, một vệt nắng…', '4 thứ chị cảm nhận khi chạm vào: vải áo, tay ghế, bàn chân chạm sàn…',
    '3 âm thanh quanh chị, gần hoặc xa.', '2 mùi. Hoặc chỉ cảm nhận không khí mát đi qua mũi.', '1 cảm giác trong cơ thể lúc này, như hơi ấm của bàn tay đặt trên bụng.',
    'Chạm vào một chấm mỗi khi chị nhận ra một điều.', 'Xong ›', 'Chị đang ở đây, lúc này. Cơ thể có khác gì không? Không cần phải khác đâu.'] },
  { id: 'A.11 Thả lỏng từng vùng', owner: ['js/players.js', 'js/data.js'], anchor: ['Siết nhẹ rồi thả lỏng vài vùng cơ, để cơ thể nhận ra thế nào là mềm.'], items: [
    'Siết nhẹ rồi thả lỏng vài vùng cơ, để cơ thể nhận ra thế nào là mềm.', 'Không siết bụng. Bụng, lưng, chân chỉ thả lỏng. Siết thật nhẹ, vẫn thở đều, không nín hơi.',
    'Siết nhẹ chừng 3 phần 10 sức trong khoảng 5 giây, vẫn thở đều. Rồi thả lỏng khoảng 10 giây.', 'Chỉ thả lỏng, không siết vùng nào',
    'Nắm nhẹ hai bàn tay', 'Mở bàn tay ra, để các ngón tay nghỉ.', 'Gập nhẹ khuỷu tay', 'Thả tay xuống, để cánh tay nặng xuống.',
    'Nhún vai nhẹ lên gần tai', 'Để vai rơi xuống, rời xa tai.', 'Nhíu mày, mím môi nhẹ', 'Thả lỏng trán, mắt, hàm. Răng không chạm nhau.',
    'Bụng mềm ra. Không hóp, không gồng. Thở tự nhiên.', 'Để gối hay lưng ghế đỡ lưng chị. Hông mềm ra.',
    'Để hai chân nặng xuống. Giữ bàn chân thả tự nhiên, không duỗi thẳng mũi chân.',
    'Nhẹ thôi, vẫn thở đều nhé', 'Để ý cảm giác khi cơ mềm ra', 'Bỏ qua vùng này', 'Xong rồi. Chị để cả cơ thể nghỉ thêm vài hơi thở tự nhiên nhé.'] },
  { id: 'A.12 Âm thanh êm dịu', owner: ['js/players.js', 'js/data.js', 'js/relax.js'], anchor: ['Âm nền dịu đều, không lời, để chị nghỉ ngơi.'], items: [
    'Âm nền dịu đều, không lời, để chị nghỉ ngơi.', 'Mở vừa đủ nghe. Để điện thoại cách bụng, không áp loa hay tai nghe lên bụng.',
    'Sóng biển', 'Mưa nhẹ', 'Gió êm', '▶ Phát', 'Còn {m:ss}', 'Âm nền không lời, đều và nhỏ, tự nhỏ dần khi hết giờ.', 'Hết giờ rồi. Chị nằm thêm một chút nếu thích nhé.'] },
  { id: 'A.13 Nghe nhạc cùng con', owner: ['js/players.js', 'js/data.js', 'js/relax.js'], anchor: ['Giai điệu chậm, êm, không lời. Vài phút để chị thư giãn và dành cho con.'], items: [
    'Giai điệu chậm, êm, không lời. Vài phút để chị thư giãn và dành cho con.',
    'Mở âm lượng vừa đủ chị nghe dễ chịu. Để điện thoại cách bụng, không áp loa hay tai nghe lên bụng nhé.',
    'Chị ngồi tựa lưng hoặc nằm nghiêng bên trái. Nếu muốn, chị đặt tay lên bụng, hoặc hát theo nho nhỏ.',
    'Danh sách nhạc đang được bổ sung. Trong lúc chờ, chị nghe âm thanh êm dịu nhé.', 'Nhạc tự nhỏ dần rồi tắt khi hết giờ.',
    'Hết giờ rồi. Những phút vừa rồi là của hai mẹ con.',
    'Bài này mở ở trang khác. Chị để âm lượng vừa phải, để điện thoại cách bụng, không áp loa hay tai nghe lên bụng nhé. App không tự tắt được nhạc ở trang đó, chị nhớ tắt sau 10–15 phút.',
    'Mở bài nhạc ›', 'Thôi, nghe âm thanh êm dịu'] },
  { id: 'A.14 Mình thấy khó chịu', owner: ['js/players.js', 'js/relax.js'], anchor: ['Mình dừng lại nhé'], items: [
    'Mình thấy khó chịu', '🍃 Trở về thở tự nhiên', 'Kết thúc → Check-out', 'Mình dừng lại nhé',
    'Bài đã tạm dừng. Chị ngồi xuống, hoặc nằm nghiêng bên trái. Thở theo nhịp tự nhiên.', 'Chị đang thấy thế nào? (chọn nếu muốn)',
    'Chóng mặt, hoa mắt', 'Hụt hơi', 'Bụng gò cứng', 'Đau bụng', 'Ra máu hoặc ra nước', 'Thấy lạ trong người', 'Chỉ thấy không hợp bài này',
    'Chị nghỉ thêm vài phút, uống vài ngụm nước. Nằm nghiêng bên trái nếu được. Không đỡ thì nhờ người nhà đưa đi khám nhé.',
    'Mỗi người hợp một kiểu. Mình đổi bài khác nhé.', 'Xem dấu hiệu cần đi khám', 'Đổi bài khác', 'Quay lại bài', 'Trở về thở tự nhiên',
    'Không cần đếm. Để hơi thở tự đi theo nhịp của nó. Nếu vẫn thấy không ổn, chị dừng lại và tìm người hỗ trợ nhé.'] },
  { id: 'A.15 Check-out, hoàn tất', owner: ['js/relax.js'], anchor: ['Sau bài này, chị thấy thế nào?'], items: [
    'Sau bài này, chị thấy thế nào?', 'Bài này với chị:', 'Phù hợp', 'Không phù hợp', 'Khó chịu hơn', 'Chưa chắc',
    'Cảm ơn chị đã nói ra. Mình dừng ở đây nhé. Chị thở tự nhiên, nghỉ một chút. Trong người thấy lạ thì chị đi khám nhé.', 'Xong ›',
    'Chị đã dành thời gian cho mình', 'Trước {X} → Sau {Y}', 'Khác hay không khác đều ổn. Điều quan trọng là chị đã lắng nghe mình.',
    'Mẹ con mình cùng Bình An nhé.', 'Về trang chính', 'Hôm nay mẹ muốn kể gì với con không? ›'] },
  { id: 'A.16 Thai giáo – lời nhắc', owner: ['js/thaigiao.js', 'js/data.js'], anchor: ['Thai giáo · Lời mẹ kể 💌'], items: [
    'Thai giáo · Lời mẹ kể 💌', 'Mỗi ngày một việc nhỏ để mẹ con mình ở gần nhau. Làm hay để hôm khác đều được nhé.',
    'Không có điểm. Bỏ một hôm cũng không sao.', 'Lời nhắc hôm nay', 'Mẹ đã làm rồi ✓', 'Đổi lời nhắc khác', 'Để hôm khác',
    'Hôm nay chị kể cho con nghe một chuyện nhỏ trong ngày nhé. Chuyện bữa sáng, chuyện đi làm, chuyện gì cũng được.',
    'Chị gọi tên ở nhà của con vài lần, thật nhẹ nhé. Chưa đặt tên thì gọi "con yêu" cũng được.',
    'Chị đọc cho con nghe vài câu thơ chị thích. Đọc chậm thôi, không cần thuộc.',
    'Chị hát ru con một bài nhé. Hát nhỏ thôi, sai lời cũng không sao.', 'Ngân "ừm" cùng con ›',
    'Lúc con đạp, chị đặt tay lên chỗ đó, xoa thật nhẹ và nói "mẹ đây". Lúc này con đang nghỉ thì chị cứ đặt tay lên bụng là được.',
    'Xoa nhẹ thôi, không ấn, không day mạnh. Bụng gò cứng thì chị dừng, nằm nghiêng nghỉ nhé.',
    'Chị kể cho con nghe về bố nhé. Hoặc nhờ bố nói với con một câu.',
    'Chị kể cho con nghe về ngôi nhà mình: căn phòng, khung cửa sổ, chậu cây ngoài hiên…',
    'Chị tả cho con nghe món chị thích nhất hôm nay: màu gì, mùi gì, vị gì.', 'Chị nói với con một điều chị mong cho con. Một điều thôi.',
    'Hôm nay mình nghe nhạc cùng con nhé. Chị mở vừa đủ nghe, ngồi tựa hoặc nằm nghiêng.', 'Nghe nhạc cùng con ›',
    'Chị đi dạo một chút, rồi kể con nghe chị thấy gì: cái cây, con mèo, bầu trời.', 'Đi chậm, chỗ bằng phẳng. Mệt thì nghỉ nhé.',
    'Chị kể con nghe chị đã chuẩn bị gì cho con: chiếc áo nhỏ, đôi tất, cái mũ…', 'Chị kể cho con nghe một kỷ niệm hồi chị còn bé nhé.',
    'Hôm nay mệt thì chị nói với con: "Hôm nay mẹ mệt, nhưng mẹ vẫn thương con." Mệt cũng được nói ra mà.',
    'Chị đọc to cho con nghe một trang sách chị đang đọc. Sách gì cũng được.', 'Chị kể con nghe hôm nay trời thế nào: nắng, mưa hay có gió.'] },
  { id: 'A.17 Ô viết lời nhắn', owner: ['js/thaigiao.js'], anchor: ['Hôm nay mẹ đã kể với con điều gì…'], items: [
    'Hôm nay mẹ đã kể với con điều gì…', 'Hôm nay mẹ kể con nghe chuyện bà ngoại nấu canh chua…',
    '🔒 Không cần ghi họ tên, số điện thoại hay địa chỉ. Gọi con bằng tên ở nhà là được.',
    'Chế độ không lưu: đóng trang là mất. Chị tải lời nhắn về máy được nhé.',
    'Lời nhắn này chỉ ở đây, không được lưu. Muốn giữ lại, chị bật "Lưu cả những gì chị tự viết" trong Dữ liệu của chị, hoặc tải về máy nhé.',
    'Cất vào hộp thư 💌', 'Tải lời nhắn về máy',
    'Có thể có thông tin nhận diện: {danh sách}. Chị sửa lại nếu cần, rồi bấm lần nữa nhé.', 'Bộ lọc không thể phát hiện mọi thông tin.',
    'Sửa lại', 'Bỏ đoạn đó', 'Vẫn giữ',
    'Trong lời nhắn có điều mình muốn hỏi lại: chị đang có dấu hiệu "{tên dòng}" phải không? Nếu đang có, chị đi khám ngay nhé.',
    'Mình đã đi khám rồi', 'Lời mẹ kể – {ngày}', 'Lời nhắc hôm ấy: {lời nhắc}'] },
  { id: 'A.18 Hộp thư gửi con (G02)', owner: ['js/thaigiao.js'], anchor: ['Hộp thư gửi con 📖'], items: [
    'Hộp thư gửi con 📖', 'Mỗi lời mẹ kể là một lá thư nhỏ. Sau này, chị đọc lại cho con nghe nhé.',
    'Hộp thư còn trống. Hôm nay mẹ kể với con một điều nhỏ nhé.',
    'Chế độ không lưu nên hộp thư không giữ lại gì. Chị vẫn viết và tải lời nhắn về máy được nhé.',
    'Những lời nhắn chưa lưu lên tài khoản vẫn nằm trên máy cũ của chị.', 'Xóa', 'Bấm lần nữa để xóa', 'Tải cả hộp thư về máy (.txt)'] },
  { id: 'A.18 Dữ liệu của chị (P01)', owner: ['js/app.js'], anchor: ['Dữ liệu của chị 🔒'], items: [
    'Dữ liệu của chị 🔒', 'App không gửi gì lên mạng. Những gì chị lưu nằm trong trình duyệt của máy này.',
    'Máy dùng chung thì ai mở trình duyệt cũng xem được. Lúc đó chị dùng ẩn danh "không lưu", hoặc đăng nhập mà không chọn "máy riêng" và nhớ đăng xuất nhé.',
    'Xuất tất cả (JSON)', 'Tải hộp thư (.txt)', 'Tải nhật ký thói quen (CSV)', 'Xóa toàn bộ dữ liệu trên máy',
    'Mọi thứ chị đã lưu trên máy này sẽ mất, không lấy lại được.', 'Mình hiểu, xóa toàn bộ', 'Thôi, giữ lại',
    'Những gì chị đã viết thì sao?', 'Xóa luôn những gì đã viết', 'Giữ những gì đã lưu, từ giờ không lưu thêm'] },
  { id: 'A.19 Hỗ trợ khẩn – tự hại (S04)', owner: ['js/app.js'], anchor: ['Một vài điều chị viết có thể liên quan tới sự an toàn của chị và con. App không biết chắc được. Và chị không phải một mình đối diện điều này.'], items: [
    'Cảm ơn chị đã chia sẻ',
    'Một vài điều chị viết có thể liên quan tới sự an toàn của chị và con. App không biết chắc được. Và chị không phải một mình đối diện điều này.',
    'Nếu chị đang nghĩ tới việc làm hại bản thân, hay đang gặp nguy hiểm ngay lúc này',
    'Gọi 115 (cấp cứu), hoặc đến khoa cấp cứu gần nhất.', 'Nói ngay với một người ở gần chị: chồng, mẹ, chị em, người hàng xóm. Đừng ở một mình nhé.',
    'Trong lúc chờ, chị ngồi xuống, đặt chân chạm sàn, thở theo nhịp tự nhiên. Bài tập không thay được sự giúp đỡ của con người.',
    'Chị cũng nhắc tới dấu hiệu trong người cần đi khám.', 'Xem dấu hiệu cần đi khám ›',
    '📞 Gọi 115', 'Xem các cách tìm hỗ trợ', 'Mình đang an toàn — đó chỉ là cách nói. Tiếp tục'] },
  { id: 'A.20 Trang dấu hiệu (S02)', owner: ['js/app.js'], anchor: ['Chị có một trong những điều dưới đây thì đi khám ngay nhé, không cần chờ tới lịch hẹn. Chạm vào điều chị đang gặp.'], items: [
    'Dấu hiệu cần đi khám ngay',
    'Chị có một trong những điều dưới đây thì đi khám ngay nhé, không cần chờ tới lịch hẹn. Chạm vào điều chị đang gặp.',
    'Mình không có dấu hiệu nào, quay lại'] },
  { id: 'A.20 Trang khẩn chung (S03, M-120…131)', owner: ['js/app.js'], anchor: ['Mình không biết được chuyện gì đang xảy ra với con. Chỉ khi được khám mới biết. Chị đừng chờ đến mai, cũng đừng chờ đếm thêm nhé.'], items: [
    'Chị đi khám ngay nhé',
    'Mình không biết được chuyện gì đang xảy ra với con. Chỉ khi được khám mới biết. Chị đừng chờ đến mai, cũng đừng chờ đếm thêm nhé.',
    '🏥 Đến khoa cấp cứu sản gần nhất ngay bây giờ.',
    '📞 Gọi 115 nếu chị đau nhiều, ra nhiều máu, thấy choáng, co giật, khó thở nhiều, hoặc không tự đi được.',
    'Nhờ người nhà đưa chị đi, chị đừng đi một mình nhé.', 'Mang theo sổ khám thai và điện thoại có app này để bác sĩ xem.',
    '📞 Gọi 115', '📞 Gọi khoa cấp cứu sản', 'Mình đã hiểu', 'Mình chọn nhầm / không phải lúc này, quay lại', 'Mình đã đi khám rồi',
    'App không thay cho việc khám thai.'] },
  { id: 'A.22 Chị không phải một mình', owner: ['js/app.js', 'js/relax.js'], anchor: ['Những gì chị đang mang đáng được lắng nghe. Chị có thể kể với chồng, với người thân, hay với bác sĩ, nữ hộ sinh lúc đi khám thai.'], items: [
    'Những gì chị đang mang đáng được lắng nghe. Chị có thể kể với chồng, với người thân, hay với bác sĩ, nữ hộ sinh lúc đi khám thai.',
    'Buồn hay lo kéo dài hơn hai tuần, chị nói với bác sĩ khám thai nhé. Chuyện này nhiều mẹ gặp, và có cách giúp.', 'Xem các cách tìm hỗ trợ',
    'Có vẻ trong người chị đang không khỏe. Chị nghỉ một chút, nằm nghiêng bên trái, uống vài ngụm nước. Không đỡ thì chị đi khám nhé.'] },
  { id: 'A.23 Toast', owner: ['js/app.js', 'js/thaigiao.js', 'js/relax.js', 'js/account.js'], anchor: null, items: [
    'Đã ghi nhận. Hôm nay mẹ đã dành thời gian cho con 💗', 'Để hôm khác nhé. Không sao đâu.', 'Đã cất vào hộp thư của con 💌',
    'Đã xóa lời nhắn.', 'Đã tải lời nhắn về máy.', 'Đã xóa toàn bộ dữ liệu trên máy này.',
    'Trình duyệt này chưa phát được âm thanh. Chị thử trình duyệt khác nhé.', 'Máy này đang chặn lưu dữ liệu. Mình chạy ở chế độ không lưu nhé.',
    'Đã đăng xuất.', 'Đã xóa tài khoản và dữ liệu của chị.'] },
  { id: 'A.24 Dòng bản thử nghiệm', owner: ['js/app.js', 'js/relax.js', 'js/thaigiao.js'], anchor: null, items: [
    'Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt. App không thay cho việc khám thai, không chẩn đoán hay điều trị.'] },
  { id: 'A.25 Trang chính (M01)', owner: ['js/app.js'], anchor: ['Hôm nay chị muốn làm gì?'], items: [
    'Hôm nay con được {X} tuần {Y} ngày 🌱', 'Thêm ngày dự sinh ›', 'Hôm nay chị muốn làm gì?',
    'Mẹ con mình cùng Bình An nhé.', 'Đang lưu trên máy này', 'Dữ liệu của chị ›'] },
  { id: 'A.25 Ô trang chính (homeTiles)', owner: ['js/relax.js', 'js/thaigiao.js', 'js/kick.js', 'js/habits.js'], anchor: ['Thở, ngân, nghe nhạc', 'Một việc nhỏ cùng con', 'Hôm nay chị đã làm gì cho mình và cho con'], items: [
    'Thư giãn', 'Thở, ngân, nghe nhạc', 'Thai giáo', 'Một việc nhỏ cùng con', 'Đếm cử động thai', 'Sau bữa ăn, chị dành một giờ lắng nghe con nhé.',
    'Nhật ký thói quen', 'Hôm nay chị đã làm gì cho mình và cho con', 'Hộp thư gửi con'] },
  { id: 'A.26 Đăng nhập, PIN', owner: ['js/account.js'], anchor: ['Đặt mã PIN cho chị'], items: [
    'Đăng nhập', 'Số điện thoại', '0912 345 678', 'Mã PIN 6 số', 'Hiện mã', 'Đây là máy riêng của mình', 'giữ đăng nhập 30 ngày',
    'Đăng nhập ›', 'Lần đầu dùng? Đặt mã PIN', 'Quên mã PIN?',
    'Máy dùng chung thì chị đừng chọn "máy riêng" nhé. Mình sẽ tự đăng xuất khi chị không dùng nữa.',
    'Đặt mã PIN cho chị', 'Chị chọn 6 số dễ nhớ với mình mà người khác khó đoán. Đừng dùng ngày sinh hay 6 số cuối của số điện thoại nhé.', 'Nhập lại mã PIN',
    'Số điện thoại chưa đúng định dạng Việt Nam (ví dụ 0912 345 678).', 'Mã PIN cần đủ 6 số nhé.', 'Hai lần nhập chưa giống nhau. Chị nhập lại nhé.',
    'Mã này dễ đoán quá. Chị chọn 6 số khác nhé.', 'Số điện thoại hoặc mã PIN chưa đúng. Chị còn {n} lần thử nhé.',
    'Mình tạm khóa đăng nhập của số này 15 phút để giữ an toàn cho chị. Chị thử lại sau nhé. Quên mã thì chị liên hệ phòng khám.',
    'Số này đã có mã PIN. Chị đăng nhập bằng mã cũ, hoặc liên hệ phòng khám nếu quên mã nhé.', 'Mạng đang chập chờn. Chị thử lại sau ít phút nhé.',
    'Phiên đăng nhập đã hết. Chị đăng nhập lại nhé.',
    'Không sao đâu. Chị gọi hoặc đến phòng khám thai, nhờ nhân viên đặt lại mã cho số điện thoại của chị nhé.',
    'Đặt lại xong, chị đăng nhập bằng số điện thoại và đặt mã PIN mới.', 'Vì an toàn của chị, app không có cách tự đặt lại mã.',
    'Đặt mã PIN mới', 'Phòng khám đã đặt lại mã cho số của chị. Chị chọn 6 số mới nhé.', 'Đăng xuất',
    'Còn {n} mục chưa gửi được lên. Đăng xuất bây giờ thì các mục này sẽ mất.', 'Đợi gửi xong', 'Vẫn đăng xuất',
    'Chị không dùng app một lúc nên mình đã đăng xuất để giữ riêng tư cho chị.',
    'Mọi dữ liệu của chị trên Sheet của bệnh viện và trên máy này sẽ mất, không lấy lại được.', 'Mình hiểu, xóa tài khoản'] },
  { id: 'A.27 Nhật ký thói quen (N01, N02)', owner: ['js/habits.js', 'js/data.js'], anchor: ['Hôm nay chị đã làm được gì?'], items: [
    'Hôm nay chị đã làm được gì?', 'Chạm vào việc chị đã làm. Chưa làm cũng không sao, ngày mai còn nữa mà.',
    '👣 Đếm cử động thai', '💌 Thai giáo', '🌬️ Thở / ngân', '🚶 Vận động sau ăn', '💧 Uống đủ nước', '🛏️ Đêm qua mình ngủ nghiêng',
    'từ tuần 28 · {n}/3 lượt', 'tự đánh dấu', 'Chạm để bỏ nếu chưa đúng', 'Đã ghi nhận 💗', 'Chọn thói quen của chị ›', 'Xem thống kê ›',
    'Chị muốn theo dõi những gì?', 'Bác sĩ dặn nghỉ ngơi thì chị tắt "Vận động sau ăn" nhé.'] },
  { id: 'A.27 Thống kê (N03)', owner: ['js/habits.js'], anchor: ['Chị đã đi qua thế nào'], items: [
    'Chị đã đi qua thế nào', '{tên}: {n} ngày liền · dài nhất {m} ngày', 'Tháng này chị đã làm {n} ngày.',
    'Bắt đầu lại lúc nào cũng được. Một ngày nhỏ cũng là một ngày.', 'Ô càng đậm, hôm đó chị làm càng nhiều việc.', '7 ngày qua', '{n}/7 ngày',
    'Vài mục chưa gửi kịp, mình sẽ gửi khi có mạng.',
    'Chế độ không lưu nên mình chưa có thống kê. Chị đăng nhập hoặc chọn "Lưu trên máy này" để xem lại các ngày nhé.',
    'Thống kê này chỉ có trên máy này.'] },
  { id: 'A.29 Ngày dự sinh (A09)', owner: ['js/app.js'], anchor: ['Con dự sinh vào ngày nào?'], items: [
    'Con dự sinh vào ngày nào?', 'Ngày dự sinh bác sĩ ghi trong sổ khám',
    'Mỗi ngày, mình tự tính con được bao nhiêu tuần. Chưa nhớ thì chị để sau cũng được nhé.', 'Lưu ›', 'Để sau',
    'Ngày này được lưu cùng hành trình của chị. Chị sửa lúc nào cũng được trong Dữ liệu của chị.',
    'Ngày này có vẻ chưa đúng. Chị xem lại ngày dự sinh trong sổ khám giúp mình nhé.', 'Đã lưu. Hôm nay con được {X} tuần {Y} ngày 🌱',
    'Tuần {X} + {Y} ngày', 'Hôm nay là ngày dự sinh của con 🌱',
    'Tuần {X} + {Y} ngày · đã qua ngày dự sinh {n} ngày. Chị nhớ đi khám theo lịch bác sĩ hẹn nhé.',
    'Đã qua ngày dự sinh hơn 2 tuần rồi. Chị liên hệ {nơi} để được hẹn khám nhé. Nếu ngày dự sinh chưa đúng, chị sửa lại ở đây.', 'Sửa ngày dự sinh',
    'Ngày dự sinh: {dd/mm/yyyy}', 'Sửa', 'Thêm ngày dự sinh',
    'Con đã được 28 tuần. Chị muốn thêm "Đếm cử động thai" vào nhật ký thói quen không?', 'Bật',
    'Con đã chào đời 🌸', 'Chúc mừng hai mẹ con! Mình sẽ thôi hiện tuần thai và tắt mục Đếm cử động thai. Những gì chị đã lưu vẫn còn nhé.',
    'Đúng rồi', 'Thôi', 'Chúc hai mẹ con luôn Bình An.', 'Hoàn tác'] },

  /* ===== Đặc tả "Đếm cử động thai" – Phụ lục A (M-xx) ===== */
  { id: 'M A.1 Chung của mục', owner: ['js/kick.js'], anchor: ['Không ai theo dõi ngay lúc chị đếm. Thấy con cử động khác mọi ngày, chị tự đi khám ngay nhé.'], items: [
    'Bản thử nghiệm: nội dung chưa được hội đồng chuyên môn duyệt.',
    'Không ai theo dõi ngay lúc chị đếm. Thấy con cử động khác mọi ngày, chị tự đi khám ngay nhé.',
    '‹ Về trang Đếm cử động thai', 'Con cử động khác mọi ngày', 'Ngừng máy, máy yếu hoặc ít hơn hẳn'] },
  { id: 'M A.3 kick_home (K01)', owner: ['js/kick.js'], anchor: ['Hôm nay mẹ con mình đếm cùng nhau nhé.'], items: [
    'Đếm cử động thai', 'Mục này thường dùng từ tuần 28, hoặc khi bác sĩ dặn. Chị vẫn đếm được nếu muốn nhé.',
    'Mỗi ngày 2–3 lần, sau bữa ăn, chị đếm cử động của con trong một giờ. Con đạp ở đâu, chị chạm vào đó nhé.', 'Đã hiểu', 'Đọc hướng dẫn',
    'Hôm nay mẹ con mình đếm cùng nhau nhé.', 'Hôm nay', '🌅 Sáng', '☀️ Trưa', '🌙 Tối', 'Lúc khác',
    '● Con cử động đều · {n} lần', '◆ Cần chú ý · đang đếm giờ thứ hai', '● Đủ 10 lần trong 2 giờ', '▲ Đã báo đi khám', '✕ Dừng giữa chừng', 'Chưa đếm',
    '👣 Bắt đầu đếm ›', '📈 Theo dõi', '👣 Dấu chân con', '📖 Hướng dẫn', '🗂️ Lượt đếm của chị',
    'Chị đang dùng ẩn danh và không lưu trên máy. Đóng app là các lượt đếm hôm nay sẽ mất.', 'Chị đang đếm dở từ {hh:mm} · {n} lần', 'Đếm tiếp ›'] },
  { id: 'M A.4 kick_before (K02)', owner: ['js/kick.js'], anchor: ['Chị vừa ăn bữa nào?'], items: [
    'Trước khi đếm', 'Chị vừa ăn bữa nào?', 'Không nhớ cũng được, chị bỏ qua nhé.', '🌅 Sau ăn sáng', '☀️ Sau ăn trưa', '🌙 Sau ăn tối',
    'Lúc này chị có thấy điều nào dưới đây không?', 'Chỉ chọn nếu có. Không có thì chị bấm Bắt đầu nhé.',
    'Ra máu ở vùng kín', 'Rỉ nước hoặc ra nhiều nước ở vùng kín', 'Đau bụng nhiều', 'Bụng gò cứng từng cơn', 'Nhức đầu nhiều', 'Mắt nhìn mờ, thấy đốm sáng',
    'Mặt, tay hoặc chân sưng phù lên nhanh', 'Con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày', 'Bắt đầu ›', 'Xem cần làm gì ngay ›', 'Mình chọn nhầm, quay lại'] },
  { id: 'M A.5 kick_pause5 (K03)', owner: ['js/kick.js'], anchor: ['Dừng 5 giây cùng con'], items: [
    'Dừng 5 giây cùng con', 'Chị nằm nghiêng bên trái, hoặc ngồi tựa thật thoải mái. Đặt tay lên bụng, thở chậm và chào con một câu nhé.',
    'Mẹ đây rồi. Mình cùng chơi nhé con.', 'Bỏ qua', 'Bắt đầu đếm ›'] },
  { id: 'M A.6 kick_count (K04)', owner: ['js/kick.js'], anchor: ['Con đạp ở đâu, chị chạm vào đó nhé'], items: [
    'Con đạp ở đâu, chị chạm vào đó nhé', 'Đạp, xoay, trườn, máy đều tính. Con nấc cụt thì không tính.', '{n} lần', 'Đã đếm {n} lần trong giờ thứ {h}',
    'Giờ thứ {h} · còn {mm:ss}', 'Tổng 2 giờ: {n} lần', 'Hình bụng mẹ. Chạm vào chỗ con vừa đạp.', '👣 Con vừa đạp', 'Dùng nút này nếu khó chạm đúng chỗ',
    'hihi', '↶ Bỏ lần vừa chạm', 'Đã bỏ lần vừa chạm.',
    'Con đã cử động 4 lần trong giờ này. Chị đếm tiếp tới 10 lần hoặc hết giờ, hay dừng ở đây cũng được nhé.', 'Xong ✓', '🔊 Tiếng khi chạm', 'Dừng lượt đếm'] },
  { id: 'M A.6b Dải đang đếm (M-84a, M-84b, R-18)', owner: ['js/kick.js'], anchor: ['👣 Đang đếm cử động thai'], items: [
    '👣 Đang đếm cử động thai', 'Về màn đếm ›', '▲ Đếm cử động thai: Chị đi khám ngay nhé ›'] },
  { id: 'M A.7 Lớp vàng', owner: ['js/kick.js'], anchor: ['Chị đếm tiếp thêm 1 giờ nữa nhé. Chị nằm nghiêng bên trái, để ý từng cử động của con. Mình đã bắt đầu giờ thứ hai cho chị.'], items: [
    '◆ Cần chú ý', 'Giờ vừa rồi con cử động {n} lần.',
    'Chị đếm tiếp thêm 1 giờ nữa nhé. Chị nằm nghiêng bên trái, để ý từng cử động của con. Mình đã bắt đầu giờ thứ hai cho chị.',
    'Nếu chị còn lo, chị liên hệ cơ sở sản khoa ngay, không cần chờ hết giờ.', 'Nếu chị còn lo, chị gọi cho nơi chị đang khám thai nhé.',
    'Đếm tiếp giờ thứ hai ›', '📞 Gọi {tên}', '◆ Đang đếm thêm giờ thứ hai. Chị còn lo thì liên hệ cơ sở sản khoa nhé.'] },
  { id: 'M A.8 kick_feel, màn xanh (K05, K06)', owner: ['js/kick.js'], anchor: ['Chị thấy con cử động hôm nay thế nào?'], items: [
    'Chị thấy con cử động hôm nay thế nào?', 'Như mọi ngày', 'Bỏ qua', 'Đủ 10 lần rồi 💗', 'Xong lượt đếm 💗', 'Con cử động {n} lần trong {m} phút.',
    'Con đang cử động đều. Chị nhớ đếm lại vào bữa sau nhé.', 'Cảm ơn chị đã dành thời gian lắng nghe con.', 'Chị đặt tay lên bụng, nói với con một câu nhé.',
    'Nếu chị thấy con cử động khác mọi ngày, kể cả khi đã đếm đủ, chị đi khám ngay nhé.',
    'Chị đang không lưu trên máy, lượt này sẽ mất khi đóng app.', '👣 Xem dấu chân con ›', 'Con đã cử động đủ 10 lần trong 2 giờ',
    'Giờ đầu con cử động ít, giờ thứ hai con cử động nhiều hơn. Mình đã ghi lại cả hai giờ.', 'Nếu chị vẫn còn lo, chị liên hệ cơ sở sản khoa nhé.'] },
  { id: 'M A.9 Dừng giữa chừng (K07)', owner: ['js/kick.js'], anchor: ['Mình đã ghi lại lượt đếm này'], items: [
    'Chị muốn dừng lượt đếm này?', 'Con mới cử động {n} lần. Mình sẽ ghi lượt này là dừng giữa chừng.', 'Đếm tiếp', 'Mình đã ghi lại lượt đếm này',
    'Nếu chị dừng vì thấy con cử động ít hơn mọi ngày, chị đi khám ngay nhé, đừng chờ đến lượt đếm sau.',
    'Lượt đếm này đang cần chú ý. Chị liên hệ cơ sở sản khoa ngay nhé.'] },
  { id: 'M A.10 Lý do trang khẩn (M-121…124)', owner: ['js/data.js', 'js/engine.js', 'js/app.js'], anchor: null, items: [
    'Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống.', 'Trong 2 giờ, con cử động chưa đủ 10 lần.',
    'Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.', 'Chị đang thấy:'] },
  { id: 'M A.10 Khối Hỗ trợ (M-140…144)', owner: ['js/app.js', 'js/kick.js'], anchor: ['Khi nào chị cần đi khám ngay'], items: [
    'Khi nào chị cần đi khám ngay', 'Chị đi khám ngay, không chờ đếm, khi có một trong những điều này:',
    'Giờ đầu con cử động 3 lần trở xuống, và giờ thứ hai vẫn vậy.', 'Trong 2 giờ con cử động chưa đủ 10 lần.',
    'Linh cảm của mẹ cũng quan trọng. Chị thấy có gì khác lạ là đi khám nhé.',
    'Giờ đầu con cử động 3 lần trở xuống thì chị đếm thêm 1 giờ, và liên hệ cơ sở sản khoa nếu còn lo.'] },
  { id: 'M A.11 Theo dõi (K08)', owner: ['js/kick.js'], anchor: ['📈 Theo dõi của con'], items: [
    '📈 Theo dõi của con', 'Các lượt đếm 14 ngày', '● Con cử động đều · ◆ Cần chú ý · ▲ Đã báo đi khám · ✕ Dừng giữa chừng',
    'Chưa có lượt đếm nào. Sau bữa ăn tới, mình cùng đếm nhé.', 'Số lần con cử động mỗi ngày', 'Cộng các lần chị chạm trong ngày.',
    'Biểu đồ để chị tự theo dõi, và mở cho bác sĩ xem khi đi khám nếu chị muốn. Không phải để chấm điểm con.', 'Xem dạng bảng', 'Ẩn bảng',
    'Chị đang không lưu trên máy, nên mình chưa vẽ được các ngày trước.'] },
  { id: 'M A.12 Dấu chân con (K09)', owner: ['js/kick.js', 'js/journey.js'], anchor: ['Mỗi dấu chân là một lần chị chạm.'], items: [
    '👣 Dấu chân con', 'Mỗi dấu chân là một lần chị chạm.', 'Con hay đạp nhất ở {vùng}.', 'Con hay đạp nhất ở {vùng 1} và {vùng 2}.',
    'phía trên bên trái', 'phía trên bên phải', 'phía dưới bên trái', 'phía dưới bên phải', 'ở giữa',
    'Hình bụng nhìn như lúc chị cúi xuống nhìn bụng mình: bên trái hình là bên trái của chị.',
    'Bản đồ để mẹ nhớ những lần con đạp, không cho biết tư thế hay sức khỏe của con.', 'Có {k} lần chị bấm nút, không ghi vị trí.',
    'Chưa có dấu chân nào. Lượt đếm tới, chị chạm đúng chỗ con đạp nhé.', '7 ngày', 'Tất cả'] },
  { id: 'M A.13 Hướng dẫn (K10)', owner: ['js/kick.js'], anchor: ['📖 Hướng dẫn đếm cử động thai'], items: [
    '📖 Hướng dẫn đếm cử động thai', 'Đếm khi nào?', 'Mỗi ngày 2–3 lần, sau bữa ăn no, lúc chị thư thả. Từ tuần 28, hoặc từ khi bác sĩ dặn.',
    'Đếm thế nào?', 'Chị nằm nghiêng bên trái hoặc ngồi tựa. Mỗi lần con đạp, xoay, trườn, máy, chị chạm một lần vào đúng chỗ đó. Con nấc cụt thì không tính nhé.',
    'Đếm bao lâu?', 'Một giờ. App tự bấm giờ. Con cử động từ 4 lần trở lên trong giờ đó thì chị đếm lại vào bữa sau.',
    'Giờ đầu con cử động ít?', 'Con cử động 3 lần trở xuống thì chị đếm thêm 1 giờ nữa, và liên hệ cơ sở sản khoa nếu còn lo.',
    'Khi nào đi khám ngay?', 'Mẹ con mình.',
    'Lúc đếm là lúc chị ngồi yên với con. Chị có thể xoa bụng, hát, hay kể con nghe hôm nay thế nào. Những phút như vậy là của riêng hai mẹ con.',
    'App không thay thế việc khám.', 'App chỉ giúp chị ghi lại. Chị vẫn đi khám thai đúng hẹn nhé.'] },
  { id: 'M A.14 Lượt đếm của chị (K11)', owner: ['js/kick.js'], anchor: ['🗂️ Lượt đếm của chị'], items: [
    '🗂️ Lượt đếm của chị',
    'Mình lưu trên máy này: giờ bắt đầu, bữa ăn chị chọn, các lần chạm (giờ và vị trí trên hình), và kết quả từng lượt. Mình không gửi đi đâu.',
    'Mỗi lượt đếm được ghi vào nhật ký của chị và lưu lên tài khoản: giờ, bữa, số lần, kết quả và chỗ chị chạm trên hình bụng, để vẽ bản đồ bước chân của con trên máy nào cũng được.',
    'Cài đặt quyền riêng tư và tài khoản ›', '⬇️ Tải lượt đếm (JSON)', '⬇️ Tải lượt đếm (CSV)', '📳 Rung khi chạm',
    'Máy không hỗ trợ rung thì mục này không có tác dụng.', 'Chạm lần nữa để xóa', 'Đã xóa lượt đếm.', 'Xóa mọi lượt đếm',
    'Xóa mọi lượt đếm của chị? Không lấy lại được đâu.', 'Mình hiểu, xóa mọi lượt đếm', 'Đã xóa mọi lượt đếm.', 'Đã lưu cài đặt.',
    'Mình không đọc được một phần dữ liệu cũ trên máy này nên đã bỏ qua phần đó.', 'Máy chưa cho lưu, lượt này mình chỉ giữ tới khi chị đóng app.',
    'Mình chưa tải được các lượt đếm cũ của chị. Chị vẫn đếm được, lát nữa mình thử lại nhé.', 'Mình đang tải các lượt đếm của chị…'] },
  { id: 'M A.15 Cột CSV', owner: ['js/kick.js'], anchor: ['Số lần giờ thứ hai'], items: [
    'Ngày', 'Giờ bắt đầu', 'Tuần thai', 'Bữa', 'Số lần giờ đầu', 'Số lần giờ thứ hai', 'Tổng', 'Phút đạt 4 lần', 'Phút đạt 10 lần', 'Kết quả',
    'Có giờ cần chú ý', 'Lý do', 'Cảm nhận của mẹ', 'Con cử động đều', 'Cần chú ý', 'Đã báo đi khám', 'Dừng giữa chừng', 'Dừng khi đang cần chú ý'] }
];
