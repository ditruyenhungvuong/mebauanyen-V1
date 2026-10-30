/* =========================================================
   Mẹ Bầu An Yên – js/data.js · window.LSTP_DATA
   Chủ: FE-2 An toàn & nội dung (T-02)
   Đặc tả: docs/specs/lifestyle-thai-phu-tech-design.md mục 5.2, 6.1, 6.2, 8; PRD v1.0 mục 3.5, 3.8, 9, Phụ lục A.
   Danh mục nội dung có trạng thái duyệt. Mọi chữ ở đây đang 'draft' tới khi anh Thông xem trên bản chạy thử.
   Không DOM, không storage. Nạp sau config.js, trước engine.js.
   ========================================================= */
window.LSTP_DATA = (() => {
  'use strict';

  /* ===== Trạng thái duyệt chung (style guide mục 6) ===== */
  const REVIEW = {
    version: '0.1-draft', owner: 'Nhóm Mẹ Bầu An Yên',
    reviewedBy: 'Chờ anh Thông / hội đồng chuyên môn duyệt', reviewedAt: null, status: 'draft'
  };

  /* ===== Thư viện bài (PRD 3.5, Phụ lục A.3, A.6–A.13) =====
     Không bài nào có pha nín thở (AC-08): không có BOX_4444, BREATHE_478, không trường holdsBreath.
     Trường dùng cho engine và trình phát:
       player        tên trình phát trong players.js (FE-3)
       posture       có thẻ tư thế A.6 trước nút Bắt đầu (AC-37)
       paced         bài theo nhịp thở / gồng-thả → không gợi ý khi chị khó chịu trong người (9.5, AC-30)
       okWhenUnwell  được gợi ý khi chị khó chịu trong người (9.7 dòng 1)
       withBaby      bài gắn với con (có chữ "con" ở tên / lời dẫn) → không gợi ý, không hiện ở thư viện lọc noBaby trong phiên
                     có nhóm mất con (9.4b, AC-36; Team Lead quyết B2 29/10/2026: gồm cả "Thở bụng nhẹ, tay ôm con")
       group         nhóm ở thư viện (UX T04): breath | present | listen */
  const EXERCISES = {
    STOP_PAUSE: {
      title: 'Dừng 5 giây', icon: '✋', min: 0.5, max: 1, type: 'steps', player: 'pause5', group: 'present',
      posture: false, paced: false, okWhenUnwell: true, withBaby: false,
      goal: 'Dừng lại, thả lỏng vai và hàm, rồi chọn bước tiếp theo.',
      safety: 'Không dùng sức. Chị bỏ qua bước nào cũng được.',
      steps: [
        { icon: '✋', title: 'Dừng lại', text: 'Chị tạm dừng việc đang làm vài giây.' },
        { icon: '😌', title: 'Thả lỏng vai và hàm', text: 'Vai hạ xuống, hàm mềm ra, răng không chạm nhau.' },
        { icon: '🌬️', title: 'Một hơi thở tự nhiên', text: 'Chỉ cần biết một hơi vào, một hơi ra. Không cần đổi gì.' },
        { icon: '👀', title: 'Quan sát', text: 'Lúc này mình đang thấy gì? Cơ thể đang báo điều gì?' },
        { icon: '🧭', title: 'Chọn bước tiếp', text: 'Mình cần gì: nghỉ một chút, kể với ai đó, hay một bài dài hơn?' }
      ]
    },
    BREATHE_46: {
      title: 'Thở chậm 4 vào – 6 ra', icon: '🐉', min: 1, max: 5, type: 'breath', player: 'breath46', group: 'breath',
      posture: true, paced: true, okWhenUnwell: false, withBaby: false,
      goal: 'Thở ra dài hơn hít vào một chút, cơ thể dịu lại.',
      safety: 'Không nín thở, không cố hít thật sâu. Nhịp chỉ là gợi ý, chị luôn có thể thở tự nhiên.',
      lead: [
        'Hít vào nhẹ bằng mũi, như bé rồng lấy hơi.',
        'Thở ra chậm bằng miệng, như thổi cho chong chóng quay thật lâu.',
        'Hơi thở ra hết thì thôi. Không giữ hơi lại, không cố thêm.'
      ],
      // Hai pha, không có pha giữ (AC-43). Không có chip "Chậm hơn" (PRD câu 12a).
      phases: [{ code: 'in', label: 'Hít vào nhẹ nhàng', sec: 4 }, { code: 'out', label: 'Thở ra chậm, dài', sec: 6 }],
      paces: [{ code: 'short', label: 'Ngắn hơn', factor: 0.75 }, { code: 'suggest', label: 'Gợi ý', factor: 1 }],
      durations: [1, 2, 3, 5],
      fine: 'Vòng tròn chỉ là gợi ý. Nhịp không hợp thì chị cứ thở theo cách của mình nhé.',
      end: 'Xong rồi. Chị thở tự nhiên thêm vài hơi nhé.'
    },
    BELLY_BREATH: {
      title: 'Thở bụng nhẹ, tay ôm con', icon: '💗', min: 1, max: 3, type: 'steps', player: 'bellyBreath', group: 'breath',
      posture: true, paced: true, okWhenUnwell: false, withBaby: true,
      goal: 'Đặt tay lên bụng, cảm nhận hơi thở đi vào, đi ra.',
      safety: 'Bụng phồng nhẹ là đủ. Không ấn tay, không gồng bụng, không nín hơi.',
      steps: [
        { text: 'Chị đặt một tay lên ngực, một tay lên bụng. Đặt nhẹ thôi, không ấn.' },
        { text: 'Hít vào bằng mũi. Để bụng phồng lên một chút dưới bàn tay.' },
        { text: 'Thở ra chậm, môi hơi chúm, như đang thổi nguội một thìa canh.' },
        { text: 'Bụng lớn rồi thì thở được đến đâu hay đến đó. Không cần cố.' },
        { text: 'Cứ thế vài hơi thở, hoặc bao nhiêu chị thấy thoải mái.' }
      ],
      softTimer: [1, 2, 3],                 // hẹn giờ mềm tùy chọn, không đồng hồ ép (AC-45)
      end: 'Chị vừa dành cho mình mấy hơi thở chậm. Khác hay không khác đều ổn.'
    },
    HUM: {
      title: 'Ngân "ừm" cùng con', icon: '🎵', min: 1, max: 3, type: 'breath', player: 'hum', group: 'breath',
      posture: true, paced: true, okWhenUnwell: false, withBaby: true,
      goal: 'Thở ra kèm tiếng ngân khẽ, hơi thở tự chậm lại.',
      safety: 'Ngân khẽ thôi, không cần to. Hít vào tự nhiên, không nín hơi trước khi ngân. Chóng mặt thì dừng nhé.',
      lead: [
        'Chị khép nhẹ môi, hai hàm răng hơi tách nhau.',
        'Hít vào nhẹ bằng mũi.',
        'Thở ra và ngân "ừmmm" thật khẽ. Chị nghe tiếng rung nhẹ ở môi, ở ngực.',
        'Hơi hết thì tiếng ngân cũng hết. Không kéo dài cố.',
        'Nếu muốn, chị đặt tay lên bụng trong lúc ngân.'
      ],
      phases: [{ code: 'in', label: 'Hít vào nhẹ bằng mũi', sec: 4 }, { code: 'out', label: 'Thở ra, ngân "ừmmm" khẽ', sec: 6 }],
      paces: [{ code: 'short', label: 'Ngắn hơn', factor: 0.75 }, { code: 'suggest', label: 'Gợi ý', factor: 1 }],
      durations: [1, 2, 3],
      end: 'Xong rồi. Chị ngồi yên thêm một chút, nghe cơ thể mình nhé.'
    },
    GROUND_54321: {
      title: 'Về với lúc này 5-4-3-2-1', icon: '🌿', min: 2, max: 4, type: 'grounding', player: 'grounding', group: 'present',
      posture: true, paced: false, okWhenUnwell: true, withBaby: false,
      goal: 'Lần lượt nhìn, chạm, nghe, ngửi, cảm nhận để trở về với lúc này.',
      safety: 'Không cần tìm cho đủ. Mang thai hay nhạy mùi, chị bỏ qua bước nào cũng được.',
      // Không bước nào nhắc cử động của con (AC-47)
      steps: [
        { n: 5, icon: '👀', title: 'Nhìn', text: 'Tìm 5 thứ chị nhìn thấy: một màu sắc, một hình dạng, một vệt nắng…' },
        { n: 4, icon: '✋', title: 'Chạm', text: '4 thứ chị cảm nhận khi chạm vào: vải áo, tay ghế, bàn chân chạm sàn…' },
        { n: 3, icon: '👂', title: 'Nghe', text: '3 âm thanh quanh chị, gần hoặc xa.' },
        { n: 2, icon: '👃', title: 'Ngửi', text: '2 mùi. Hoặc chỉ cảm nhận không khí mát đi qua mũi.', skippable: true },
        { n: 1, icon: '💗', title: 'Cảm nhận', text: '1 cảm giác trong cơ thể lúc này, như hơi ấm của bàn tay đặt trên bụng.' }
      ],
      fine: 'Chạm vào một chấm mỗi khi chị nhận ra một điều.',
      end: 'Chị đang ở đây, lúc này. Cơ thể có khác gì không? Không cần phải khác đâu.'
    },
    RELEASE_ZONES: {
      title: 'Thả lỏng từng vùng', icon: '💆', min: 5, max: 8, type: 'release', player: 'release', group: 'present',
      posture: true, paced: true, okWhenUnwell: false, withBaby: false,
      goal: 'Siết nhẹ rồi thả lỏng vài vùng cơ, để cơ thể nhận ra thế nào là mềm.',
      safety: 'Không siết bụng. Bụng, lưng, chân chỉ thả lỏng. Siết thật nhẹ, vẫn thở đều, không nín hơi.',
      lead: 'Siết nhẹ chừng 3 phần 10 sức trong khoảng 5 giây, vẫn thở đều. Rồi thả lỏng khoảng 10 giây.',
      tenseSec: 5, releaseSec: 10,
      tenseNote: 'Nhẹ thôi, vẫn thở đều nhé',
      releaseNote: 'Để ý cảm giác khi cơ mềm ra',
      releaseOnlyLabel: 'Chỉ thả lỏng, không siết vùng nào',
      // Đúng 7 vùng, đúng thứ tự (AC-46). releaseOnly: KHÔNG BAO GIỜ có pha siết, kể cả khi tắt công tắc.
      zones: [
        { code: 'hands', title: 'Bàn tay', tense: 'Nắm nhẹ hai bàn tay', release: 'Mở bàn tay ra, để các ngón tay nghỉ.' },
        { code: 'arms', title: 'Cánh tay', tense: 'Gập nhẹ khuỷu tay', release: 'Thả tay xuống, để cánh tay nặng xuống.' },
        { code: 'shoulders', title: 'Vai', tense: 'Nhún vai nhẹ lên gần tai', release: 'Để vai rơi xuống, rời xa tai.' },
        { code: 'face', title: 'Mặt và hàm', tense: 'Nhíu mày, mím môi nhẹ', release: 'Thả lỏng trán, mắt, hàm. Răng không chạm nhau.' },
        { code: 'belly', title: 'Bụng', releaseOnly: true, tense: null, release: 'Bụng mềm ra. Không hóp, không gồng. Thở tự nhiên.' },
        { code: 'back', title: 'Lưng và hông', releaseOnly: true, tense: null, release: 'Để gối hay lưng ghế đỡ lưng chị. Hông mềm ra.' },
        { code: 'legs', title: 'Chân và bàn chân', releaseOnly: true, tense: null, release: 'Để hai chân nặng xuống. Giữ bàn chân thả tự nhiên, không duỗi thẳng mũi chân.' }
      ],
      end: 'Xong rồi. Chị để cả cơ thể nghỉ thêm vài hơi thở tự nhiên nhé.'
    },
    AUDIO_CALM: {
      title: 'Âm thanh êm dịu', icon: '🎧', min: 5, max: 15, type: 'audio', player: 'calmAudio', group: 'listen',
      posture: true, paced: false, okWhenUnwell: true, withBaby: false,
      goal: 'Âm nền dịu đều, không lời, để chị nghỉ ngơi.',
      safety: 'Mở vừa đủ nghe. Để điện thoại cách bụng, không áp loa hay tai nghe lên bụng.',
      sounds: [
        { code: 'waves', label: 'Sóng biển (lên xuống chậm)' },
        { code: 'rain', label: 'Mưa nhẹ' },
        { code: 'wind', label: 'Gió êm (âm đều)' }
      ],
      timers: [5, 10, 15], defaultTimer: 10, defaultVolume: 30,
      alt: 'Âm nền không lời, đều và nhỏ, tự nhỏ dần khi hết giờ.',
      end: 'Hết giờ rồi. Chị nằm thêm một chút nếu thích nhé.'
    },
    MUSIC: {
      title: 'Nghe nhạc cùng con', icon: '🎶', min: 5, max: 15, type: 'music', player: 'music', group: 'listen',
      posture: true, paced: false, okWhenUnwell: false, withBaby: true,
      goal: 'Giai điệu chậm, êm, không lời. Vài phút để chị thư giãn và dành cho con.',
      safety: 'Mở âm lượng vừa đủ chị nghe dễ chịu. Để điện thoại cách bụng, không áp loa hay tai nghe lên bụng nhé.',
      lead: 'Chị ngồi tựa lưng hoặc nằm nghiêng bên trái. Nếu muốn, chị đặt tay lên bụng, hoặc hát theo nho nhỏ.',
      empty: 'Danh sách nhạc đang được bổ sung. Trong lúc chờ, chị nghe âm thanh êm dịu nhé.',
      timers: [5, 10, 15], defaultTimer: 10, defaultVolume: 30,
      fine: 'Nhạc tự nhỏ dần rồi tắt khi hết giờ.',
      linkNote: 'Bài này mở ở trang khác. Chị để âm lượng vừa phải, để điện thoại cách bụng, không áp loa hay tai nghe lên bụng nhé. App không tự tắt được nhạc ở trang đó, chị nhớ tắt sau 10–15 phút.',
      end: 'Hết giờ rồi. Những phút vừa rồi là của hai mẹ con.'
    }
  };
  Object.keys(EXERCISES).forEach(id => Object.assign(EXERCISES[id], { id }, REVIEW));
  // Thứ tự hiện ở thư viện (UX T04)
  const LIBRARY_ORDER = ['BREATHE_46', 'BELLY_BREATH', 'HUM', 'STOP_PAUSE', 'GROUND_54321', 'RELEASE_ZONES', 'AUDIO_CALM', 'MUSIC'];
  const LIBRARY_GROUPS = [
    { code: 'breath', label: 'Thở và ngân' },
    { code: 'present', label: 'Về với lúc này' },
    { code: 'listen', label: 'Nghe' }
  ];

  /* ===== Thẻ tư thế và dòng an toàn chung (A.6) ===== */
  const POSTURE = {
    card: 'Chị ngồi tựa lưng thoải mái, hoặc nằm nghiêng bên trái, kê một chiếc gối giữa hai đầu gối. Khi bụng đã lớn, nhất là 3 tháng cuối, chị tránh nằm ngửa lâu nhé.',
    bigBellyFromWeek: 28,                 // PRD câu 16b
    bigBelly: 'Bụng đã lớn rồi, chị tránh nằm ngửa lâu nhé. Nằm nghiêng bên trái là dễ chịu nhất.',
    safetyLine: 'Thấy chóng mặt, hụt hơi, bụng gò cứng hay đau bụng, chị dừng ngay và bấm "Mình thấy khó chịu" nhé.'
  };

  /* ===== Check-in (A.4): 8 thẻ, chọn nhiều ===== */
  const EMOTIONS = [
    { code: 'happy', label: 'Vui vẻ', img: 'vui.jpg', emoji: '😊' },
    { code: 'sad', label: 'Buồn', img: 'buon.jpg', emoji: '😢' },
    { code: 'worried', label: 'Lo lắng', img: 'khoc.jpg', emoji: '😟' },
    { code: 'angry', label: 'Tức giận', img: 'tuc.jpg', emoji: '😠' },
    { code: 'panicked', label: 'Hoảng hốt', img: 'hoang_hot.jpg', emoji: '😨' },
    { code: 'uncomfortable', label: 'Khó chịu', img: 'kho_chiu.jpg', emoji: '😣' },
    { code: 'tired', label: 'Mệt', img: null, emoji: '😴' },
    { code: 'unsure', label: 'Chưa rõ', img: null, emoji: '🤍' }
  ];

  // Chip tình huống (PRD 9.6). Từ khóa suy luận nằm ở KEYWORDS.contexts; chị sửa được.
  const CONTEXTS = [
    { code: 'sleep', label: 'Khó ngủ' },
    { code: 'before_visit', label: 'Sắp đi khám' },
    { code: 'worry_baby', label: 'Lo cho con' },
    { code: 'body', label: 'Mệt trong người' },
    { code: 'family', label: 'Chuyện gia đình' },
    { code: 'work', label: 'Công việc' },
    { code: 'other', label: 'Khác' }
  ];

  const MINUTES = [1, 3, 5, 10, 15];

  // Thang "mức căng" 0–10 (A.4, = TENSION_LABELS của STOP-4P js/data.js:106)
  const TENSION_LABELS = [
    'Rất nhẹ nhõm', 'Nhẹ nhõm', 'Khá thả lỏng', 'Hơi căng', 'Căng nhẹ', 'Căng vừa',
    'Khá căng', 'Căng nhiều', 'Rất căng', 'Cực kỳ căng', 'Căng nhất'
  ];

  // Check-out (A.15)
  const FITS = [
    { code: 'fit', label: 'Phù hợp' },
    { code: 'unfit', label: 'Không phù hợp' },
    { code: 'worse', label: 'Khó chịu hơn' },
    { code: 'unsure', label: 'Chưa chắc' }
  ];

  /* ===== Câu tóm tắt ở màn Gợi ý theo luật 9.7 (A.5) ===== */
  const SUMMARIES = {
    default: 'Cảm ơn chị đã dừng lại lắng nghe mình.',
    worried: 'Lo trước buổi khám là điều rất thường gặp. Mình thử cho hơi thở chậm lại một chút nhé.',
    sleep: 'Đầu óc còn chạy thì khó ngủ lắm. Mình thử giúp cơ thể mềm xuống nhé.',
    worry_baby: 'Thương con nên mới lo. Mình thử ở cùng con vài phút nhé.',
    sad: 'Buồn cũng đáng được lắng nghe. Chị không cần phải vui lên ngay.',
    irritated: 'Bực bội là chuyện tự nhiên. Mình dừng lại một chút, rồi chị chọn điều chị muốn làm tiếp nhé.',
    tired: 'Mệt thì nghỉ thôi. Mình chọn bài nhẹ nhất nhé.',
    physical: 'Có vẻ trong người chị đang không khỏe. Mình ưu tiên nghỉ trước nhé.'
  };

  // Câu lý do ngắn trên thẻ gợi ý (UX T03)
  const REASONS = {
    STOP_PAUSE: 'Dừng thật ngắn, thả lỏng vai và hàm',
    BREATHE_46: 'Thở ra dài hơn một chút, cơ thể dịu lại',
    BELLY_BREATH: 'Đặt tay lên bụng, thở theo nhịp của mình',
    HUM: 'Ngân khẽ để hơi thở tự chậm lại',
    GROUND_54321: 'Trở về với lúc này qua các giác quan',
    RELEASE_ZONES: 'Thả lỏng từng vùng, không siết bụng',
    AUDIO_CALM: 'Âm nền dịu đều để nghỉ',
    MUSIC: 'Vài phút nhạc êm cho hai mẹ con'
  };

  /* ===== "Mình thấy khó chịu" (A.14, lớp L01) =====
     action: see_doctor → trang khẩn chung với các dấu hiệu ở signs (AC-40); rest → lời nghỉ (AC-41); change → đổi bài (AC-42) */
  const UNWELL_CHIPS = [
    { code: 'dizzy', label: 'Chóng mặt, hoa mắt', action: 'rest' },
    { code: 'breathless', label: 'Hụt hơi', action: 'rest' },
    { code: 'contractions', label: 'Bụng gò cứng', action: 'see_doctor', signs: ['contractions'] },
    { code: 'pain', label: 'Đau bụng', action: 'see_doctor', signs: ['pain'] },
    { code: 'bleeding', label: 'Ra máu hoặc ra nước', action: 'see_doctor', signs: ['bleeding', 'fluid'] },
    { code: 'strange', label: 'Thấy lạ trong người', action: 'rest' },
    { code: 'unfit', label: 'Chỉ thấy không hợp bài này', action: 'change' }
  ];

  /* ===== Thai giáo – 16 lời nhắc (A.16) ===== */
  const PROMPTS = [
    { id: 'TG-01', kind: 'Kể chuyện', text: 'Hôm nay chị kể cho con nghe một chuyện nhỏ trong ngày nhé. Chuyện bữa sáng, chuyện đi làm, chuyện gì cũng được.' },
    { id: 'TG-02', kind: 'Gọi tên con', text: 'Chị gọi tên ở nhà của con vài lần, thật nhẹ nhé. Chưa đặt tên thì gọi "con yêu" cũng được.' },
    { id: 'TG-03', kind: 'Đọc thơ', text: 'Chị đọc cho con nghe vài câu thơ chị thích. Đọc chậm thôi, không cần thuộc.' },
    { id: 'TG-04', kind: 'Hát ru', text: 'Chị hát ru con một bài nhé. Hát nhỏ thôi, sai lời cũng không sao.', action: { label: 'Ngân "ừm" cùng con ›', exercise: 'HUM' } },
    { id: 'TG-05', kind: 'Xoa bụng khi con đạp', text: 'Lúc con đạp, chị đặt tay lên chỗ đó, xoa thật nhẹ và nói "mẹ đây". Lúc này con đang nghỉ thì chị cứ đặt tay lên bụng là được.', safety: 'Xoa nhẹ thôi, không ấn, không day mạnh. Bụng gò cứng thì chị dừng, nằm nghiêng nghỉ nhé.' },
    { id: 'TG-06', kind: 'Kể về bố', text: 'Chị kể cho con nghe về bố nhé. Hoặc nhờ bố nói với con một câu.' },
    { id: 'TG-07', kind: 'Kể về nhà', text: 'Chị kể cho con nghe về ngôi nhà mình: căn phòng, khung cửa sổ, chậu cây ngoài hiên…' },
    { id: 'TG-08', kind: 'Món ăn', text: 'Chị tả cho con nghe món chị thích nhất hôm nay: màu gì, mùi gì, vị gì.' },
    { id: 'TG-09', kind: 'Điều mẹ mong', text: 'Chị nói với con một điều chị mong cho con. Một điều thôi.' },
    { id: 'TG-10', kind: 'Nghe nhạc', text: 'Hôm nay mình nghe nhạc cùng con nhé. Chị mở vừa đủ nghe, ngồi tựa hoặc nằm nghiêng.', action: { label: 'Nghe nhạc cùng con ›', exercise: 'MUSIC' } },
    { id: 'TG-11', kind: 'Đi dạo', text: 'Chị đi dạo một chút, rồi kể con nghe chị thấy gì: cái cây, con mèo, bầu trời.', safety: 'Đi chậm, chỗ bằng phẳng. Mệt thì nghỉ nhé.' },
    { id: 'TG-12', kind: 'Đồ cho con', text: 'Chị kể con nghe chị đã chuẩn bị gì cho con: chiếc áo nhỏ, đôi tất, cái mũ…' },
    { id: 'TG-13', kind: 'Kỷ niệm của mẹ', text: 'Chị kể cho con nghe một kỷ niệm hồi chị còn bé nhé.' },
    { id: 'TG-14', kind: 'Mệt cũng nói', text: 'Hôm nay mệt thì chị nói với con: "Hôm nay mẹ mệt, nhưng mẹ vẫn thương con." Mệt cũng được nói ra mà.' },
    { id: 'TG-15', kind: 'Đọc sách', text: 'Chị đọc to cho con nghe một trang sách chị đang đọc. Sách gì cũng được.' },
    { id: 'TG-16', kind: 'Thời tiết', text: 'Chị kể con nghe hôm nay trời thế nào: nắng, mưa hay có gió.' }
  ];
  PROMPTS.forEach(p => Object.assign(p, REVIEW));

  /* ===== Nhật ký thói quen (PRD 3.8, A.27) =====
     autoBy: module tự đánh dấu ('a') — relax ở check-out, thaigiao khi "Mẹ đã làm rồi ✓"/cất lời nhắn, kick khi lượt có mức */
  const HABITS = [
    { code: 'kick', label: 'Đếm cử động thai', sub: 'từ tuần 28', icon: '👣', defaultOn: true, autoBy: 'kick' },
    { code: 'thai_giao', label: 'Thai giáo', icon: '💌', defaultOn: true, autoBy: 'thaigiao' },
    { code: 'breath', label: 'Thở / ngân', icon: '🌬️', defaultOn: true, autoBy: 'relax' },
    { code: 'move', label: 'Vận động sau ăn', icon: '🚶', defaultOn: false, autoBy: null },
    { code: 'water', label: 'Uống đủ nước', icon: '💧', defaultOn: true, autoBy: null },
    { code: 'side_sleep', label: 'Đêm qua mình ngủ nghiêng', icon: '🛏️', defaultOn: true, autoBy: null }
  ];

  /* ===== Dấu hiệu nguy hiểm thai kỳ (PRD 9.3) — MỘT danh sách cho ba nơi (tech design 6.2) =====
     Trang `signs` (chạm), luật từ khóa ô viết, `kick_before` (R-07) cùng dùng mảng này.
       row        dòng ở bảng PRD 9.3
       label      chữ ở trang "Dấu hiệu cần đi khám ngay" và dòng lý do ở trang khẩn chung
       kickLabel  chữ ở "Trước khi đếm" (M-46…M-53); chỉ có ở 8 dấu hiệu kickBefore
       signsPage  false = không có nút riêng ở trang `signs` (dòng 6 của 9.3 đã có nút ở `headache`)
       reason     'mother_reported' → lý do M-123 (R-06, AC-28); còn lại 'danger_sign'
       feature    tên cờ trong C.FEATURES; cờ tắt thì dòng này không hiện, không bắt từ khóa (dòng 12, 13)
     Cách so (engine.js):
       strict     cụm có dấu, so trên chuỗi NFC chữ thường giữ dấu, tách từ, sau bảng viết tắt teen
       loose      cụm không dấu, so trên chuỗi NFC chữ thường KHÔNG bỏ dấu (teen đổi sang chữ không dấu)
                  → chỉ khớp khi chị gõ không dấu. Không so trên chuỗi đã bỏ dấu vì "chạy mau", "có thật", "mở mắt",
                  "đau lưng và bụng" có dấu sẽ thành "chay mau", "co that", "mo mat", "va bung" (bài học C-1 của STOP-4P).
       exclude    vùng chữ bị bỏ trước khi so strict; excludeLoose: trước khi so loose. Regex có cờ g, chạy trên chuỗi
                  ' từ từ … ' (mỗi từ cách một dấu cách, có dấu cách hai đầu). */
  const DANGER_SIGNS = [
    { id: 'bleeding', row: 1, label: 'Ra máu ở vùng kín, dù ít', kickBefore: true, kickLabel: 'Ra máu ở vùng kín',
      strict: ['ra máu', 'ra huyết', 'chảy máu', 'ra máu đỏ', 'rong huyết'],
      loose: ['ra mau', 'ra huyet', 'chay mau'],
      exclude: [/ chảy máu (?:chân răng|cam|mũi|tay)(?= )/gu],
      excludeLoose: [/ chay mau (?:chan rang|cam|mui|tay)(?= )/gu] },
    { id: 'fluid', row: 2, label: 'Ra nước nhiều, hoặc rỉ nước liên tục ở vùng kín', kickBefore: true, kickLabel: 'Rỉ nước hoặc ra nhiều nước ở vùng kín',
      // "ra nhiều nước", "ra nhieu nuoc": thêm theo code review Bước A G-1 (cách nói khác của dấu hiệu đã duyệt)
      strict: ['ra nước', 'rỉ nước', 'vỡ ối', 'rỉ ối', 'rò ối', 'ra nhiều nước'],
      loose: ['ra nuoc nhieu', 'ra nuoc lien tuc', 'ri nuoc', 'vo oi', 'ri oi', 'ra nhieu nuoc'],
      exclude: [/ ra nước ngoài(?= )/gu] },
    { id: 'pain', row: 3, label: 'Đau bụng nhiều, đau không dứt', kickBefore: true, kickLabel: 'Đau bụng nhiều',
      strict: ['đau bụng dữ dội', 'đau bụng nhiều', 'đau bụng liên tục', 'quặn bụng'],
      loose: ['dau bung du doi', 'dau bung nhieu', 'dau bung lien tuc', 'quan bung'] },
    { id: 'contractions', row: 4, label: 'Bụng gò cứng nhiều lần, đều đặn, khi chưa tới ngày sinh', kickBefore: true, kickLabel: 'Bụng gò cứng từng cơn',
      strict: ['gò cứng', 'bụng gò', 'gò bụng', 'cơn gò', 'co thắt bụng', 'bụng co thắt'],
      loose: ['go cung', 'bung go', 'go bung', 'con go', 'co that'] },
    { id: 'no_movement', row: 5, label: 'Con đạp ít hơn hẳn mọi ngày, hoặc không thấy con đạp', kickBefore: true,
      kickLabel: 'Con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày', reason: 'mother_reported',
      strict: ['con đạp ít', 'ít đạp', 'không thấy con đạp', 'con không đạp', 'thai máy ít', 'không thấy thai máy', 'con không cử động', 'con nằm im',
        // Thêm theo code review Bước A G-1 (mục đổi tên "Đếm cử động thai"): cách nói "cử động" / "máy" của CÙNG dấu hiệu đã duyệt.
        // Luôn có chủ ngữ con / bé / em bé / thai đứng liền → không bắt "cử động tay chân", "cử động ít thôi cho đỡ mỏi" của mẹ.
        'con ít cử động', 'bé ít cử động', 'thai ít cử động', 'con cử động ít', 'bé cử động ít', 'thai cử động ít',
        'con cử động yếu', 'bé cử động yếu', 'thai cử động yếu', 'bé không cử động', 'thai không cử động',
        'không thấy con cử động', 'không thấy bé cử động', 'không thấy thai cử động',
        'thai máy yếu', 'con không thấy máy', 'không thấy con máy',
        'con ngừng máy', 'thai ngừng máy', 'con ngừng cử động', 'bé ngừng cử động', 'thai ngừng cử động'],
      loose: ['con dap it', 'it dap', 'khong thay con dap', 'con khong dap', 'thai may it', 'khong thay thai may', 'con nam im',
        'con it cu dong', 'be it cu dong', 'thai it cu dong', 'con cu dong it', 'be cu dong it', 'thai cu dong it',
        'con cu dong yeu', 'be cu dong yeu', 'thai cu dong yeu', 'con khong cu dong', 'be khong cu dong', 'thai khong cu dong',
        'khong thay con cu dong', 'khong thay be cu dong', 'khong thay thai cu dong',
        'thai may yeu', 'con khong thay may', 'khong thay con may',
        'con ngung may', 'thai ngung may', 'con ngung cu dong', 'be ngung cu dong', 'thai ngung cu dong'],
      // Cố ý KHÔNG loại trừ "… cử động tay/chân": chuỗi so đã bỏ dấu câu, loại trừ sẽ làm lọt "con không cử động, tay mình run".
      exclude: [/ ít đạp xe(?= )/gu], excludeLoose: [/ it dap xe(?= )/gu] },
    // Dòng 6 của 9.3 tách hai mã vì mục đếm có hai ô riêng (M-50, M-51). Trang `signs` chỉ hiện một nút (ở `headache`).
    { id: 'headache', row: 6, label: 'Đau đầu nhiều, nhìn mờ, thấy đom đóm mắt', kickBefore: true, kickLabel: 'Nhức đầu nhiều',
      strict: ['đau đầu dữ dội', 'nhức đầu dữ dội'],
      loose: ['dau dau du doi', 'nhuc dau du doi'] },
    { id: 'vision', row: 6, label: 'Nhìn mờ, thấy đom đóm mắt', kickBefore: true, kickLabel: 'Mắt nhìn mờ, thấy đốm sáng', signsPage: false,
      strict: ['nhìn mờ', 'mờ mắt', 'đom đóm mắt'],
      loose: ['nhin mo', 'mo mat', 'dom dom mat'] },
    { id: 'swelling', row: 7, label: 'Mặt, tay, chân sưng phù lên nhanh', kickBefore: true, kickLabel: 'Mặt, tay hoặc chân sưng phù lên nhanh',
      strict: ['phù mặt', 'sưng mặt', 'phù nhanh', 'phù toàn thân'],
      loose: ['phu mat', 'sung mat', 'phu nhanh'] },
    { id: 'seizure', row: 8, label: 'Co giật, ngất, xỉu',
      strict: ['co giật', 'lên cơn giật', 'ngất', 'xỉu', 'ngất xỉu'],
      loose: ['co giat', 'len con giat', 'ngat xiu'],
      exclude: [/ cao ngất(?= )/gu, / ngất (?:ngây|ngưởng)(?= )/gu] },
    { id: 'breathing', row: 9, label: 'Khó thở nhiều, đau ngực',
      strict: ['khó thở nhiều', 'khó thở dữ dội', 'thở không nổi', 'đau ngực', 'tức ngực dữ dội'],
      loose: ['kho tho nhieu', 'tho khong noi', 'dau nguc'] },
    { id: 'fever', row: 10, label: 'Sốt cao, lạnh run',
      strict: ['sốt cao', 'lạnh run', 'rét run'],
      loose: ['sot cao', 'lanh run', 'ret run'] },
    { id: 'fall', row: 11, label: 'Bị té ngã hay va đập vào bụng',
      strict: ['té ngã', 'bị ngã', 'va bụng', 'đập bụng', 'tai nạn'],
      loose: ['te nga', 'bi nga', 'va bung', 'dap bung', 'tai nan'] },
    // Dòng 12, 13: anh quyết khi xem bản chạy thử (PRD câu 9) → cờ C.FEATURES.signsItchVomit, đang false.
    { id: 'itch', row: 12, label: 'Ngứa nhiều ở lòng bàn tay, lòng bàn chân', feature: 'signsItchVomit',
      strict: ['ngứa lòng bàn tay', 'ngứa lòng bàn chân'],
      loose: ['ngua long ban tay', 'ngua long ban chan'] },
    { id: 'vomit', row: 13, label: 'Nôn nhiều, không ăn uống được', feature: 'signsItchVomit',
      strict: ['nôn nhiều', 'nôn liên tục', 'không ăn uống được'],
      loose: ['non nhieu', 'non lien tuc', 'khong an uong duoc'] }
  ];
  DANGER_SIGNS.forEach(s => Object.assign(s, { kickBefore: !!s.kickBefore, signsPage: s.signsPage !== false, reason: s.reason || 'danger_sign' }, REVIEW));

  /* ===== Lý do trên trang khẩn chung (A.20; M-121…M-124 của đặc tả mục đếm). Thứ tự R-15. ===== */
  const URGENT_REASONS = {
    order: ['danger_sign', 'mother_reported', 'h2_low', 'lt10_2h'],
    danger_sign: 'Chị đang thấy:',                       // M-124: dòng mở đầu, sau đó mỗi dấu hiệu một dòng
    mother_reported: 'Chị thấy con ngừng máy, máy yếu, hoặc ít hơn hẳn mọi ngày.', // M-123
    h2_low: 'Giờ đếm thứ hai, con vẫn cử động 3 lần trở xuống.',                     // M-121
    lt10_2h: 'Trong 2 giờ, con cử động chưa đủ 10 lần.'                             // M-122
  };

  /* ===== Từ khóa =====
     Mọi bộ lọc đều có thể sai: luôn có lối "Mình đang an toàn — đó chỉ là cách nói" / "Mình chọn nhầm".
     urgent, human, humanStrict, humanPatterns, sleep: CHÉP NGUYÊN VĂN apps/STOP-4P-Healthcare-Staff/js/data.js
     (bản sau review lần 7, dòng 141–203 và 226). Không sửa ở đây khi chưa sửa bên STOP-4P và chưa qua bộ câu thử
     (tests/unit-engine.js so từng phần tử với file STOP-4P). */
  const KEYWORDS = {
    urgent: {
      // 'rạch tay', 'cắt tay' chuyển sang strictPatterns (có loại trừ) — review lần 4, K-1.
      strict: ['tự tử', 'tự sát', 'muốn chết', 'không muốn sống', 'kết thúc cuộc đời', 'kết liễu', 'tự hại', 'tự làm hại', 'làm hại bản thân',
        'nhảy lầu', 'chết cho xong', 'không còn lý do để sống', 'biến mất mãi mãi', 'làm hại người khác', 'uống thuốc để chết'],
      // Bản KHÔNG DẤU của chính các từ có dấu ở trên (không thêm khái niệm mới — review lần 3, G-2).
      // "tự tử" cố ý không có bản không dấu vì "tu tu" trùng "từ từ".
      loose: ['tu sat', 'muon chet', 'khong muon song', 'ket thuc cuoc doi', 'ket lieu', 'tu lam hai ban than', 'tu lam hai minh', 'lam hai ban than',
        'nhay lau', 'chet cho xong', 'khong con ly do de song', 'khong con ly do song', 'bien mat mai mai', 'lam hai nguoi khac', 'uong thuoc de chet'],
      // CÓ DẤU, có loại trừ (review lần 4, K-1): "rạch/cắt (cổ) tay" — trừ khi đứng sau "bị" hoặc theo sau là
      // "khi/lúc/do/vì/trong/tại/vào/ở/áo" (tai nạn khi làm việc, "cắt tay áo"). So trên chuỗi NFC chữ thường, tách từ.
      strictPatterns: [
        / (?<!bị )(?:rạch|cắt) (?:cổ )?tay (?!(?:khi|lúc|do|vì|trong|tại|vào|ở|áo) )/
      ],
      // KHÔNG DẤU, bắt từ gốc + loại trừ ngữ cảnh vô hại (review lần 3 C-1, lần 4 K-1/K-2 — theo bản mẫu proto4 của code-reviewer).
      // Chạy trên chuỗi NFC chữ thường KHÔNG bỏ dấu → chỉ khớp khi người dùng GÕ KHÔNG DẤU. Câu có dấu "Áp lực từ hai phía"
      // không bao giờ bị coi là "tự hại"; câu có dấu đã có strict / strictPatterns lo.
      // Bắt nhầm (chỉ với chữ không dấu mơ hồ, vd "ap luc tu hai phia") chỉ tốn một lần bấm "Tôi đang an toàn — đó chỉ là cách nói".
      //  1) "tu hai" — mẫu của code-reviewer (review lần 5, K-2), chỉnh theo quyết định của anh Thông 29/10/2026 (lượt sửa 6):
      //     "bắt '… nay' gần, bỏ qua khứ". Loại trừ (= coi là "từ hai…") khi ngay sau là:
      //     • giờ/phút/tiếng/tuổi/mười/trăm/nghìn/ngàn/triệu;
      //     • tuần/tháng/năm/ngày/buổi — trừ khi kèm "qua/ngoái" ("tu hai tuan nay", "tu hai thang truoc" KHÔNG khẩn);
      //     • hôm/đêm — trừ khi kèm "qua/ngoái/NAY" ("tự hại hôm nay / đêm nay / hôm qua" BẮT);
      //     • sáng — trừ khi kèm "nay/qua" HOẶC đứng cuối câu / trước dấu câu ("tu hai sang." BẮT, "tu hai sang roi" không);
      //       chiều/tối/trưa — trừ khi kèm "nay/qua";
      //     • số VIẾT BẰNG CHỮ + đơn vị thời gian, có thể có dấu phẩy trước ("tu hai, ba hom nay", "tu hai ba ngay" KHÔNG khẩn).
      //       CHỮ SỐ không được miễn: "tu hai 3 hom nay", "da tu hai 3 dem lien" vẫn khẩn (review lần 6, K-3);
      //     • đến/tới/hoặc/và/hay + SỐ ("từ hai đến ba");
      //     • người/đứa/lần — trừ khi kèm "rồi/nữa/đêm"; "cả" — trừ khi kèm "rồi/nữa/đêm/tuần/ngày/tháng/năm/buổi".
      //     Chạy trên chuỗi NFC giữ dấu câu ("." cho . ! ? ; …, "," cho dấu phẩy) để nhận ra "cuối câu".
      //  2) "rach/cat (co) tay" — trừ khi đứng sau "bi" hoặc theo sau là "khi/luc/do/vi/trong/tai/vao/o/ao", kể cả có dấu phẩy
      //     chen giữa ("cat tay, luc got tao" — review lần 6, R-3).
      patterns: [
        / tu hai (?!(?:gio|phut|tieng|tuoi|muoi|tram|nghin|ngan|trieu) |(?:tuan|thang|nam|ngay|buoi) (?!qua |ngoai )|(?:hom|dem) (?!qua |ngoai |nay )|sang (?=[^\s.,])(?!nay |qua )|(?:chieu|toi|trua) (?!nay |qua )|(?:, )?(?:mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi) (?:tuan|thang|nam|ngay|hom|buoi|dem|gio|phut|tieng) |(?:den|toi|hoac|va|hay) (?:mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi|\d+) |(?:nguoi|dua|lan) (?!roi |nua |dem )|ca (?!roi |nua |dem |tuan |ngay |thang |nam |buoi ))/,
        / (?<!bi )(?:rach|cat) (?:co )?tay (?!(?:, )?(?:khi|luc|do|vi|trong|tai|vao|o|ao) )/
      ],
      // Cách viết tắt / teen code của CHÍNH các từ đã duyệt (review lần 4, G-1) — chỉ dùng khi so nhóm khẩn, không thêm khái niệm mới.
      // Thay từng từ trên chuỗi CÓ DẤU (NFC, chữ thường) TRƯỚC khi so strict và trước khi bỏ dấu cho nhóm loose.
      // Khóa giữ dấu để không nhầm: "mún" → "muốn" nhưng "mụn" (nặn mụn) thì không đổi. "mun"/"hong" không dấu vẫn đổi
      // (người gõ không dấu) — chấp nhận "nan mun chet" bắt nhầm, có nút "Tôi đang an toàn".
      teen: {
        ko: 'không', k: 'không', kh: 'không', khg: 'không', hok: 'không', 'hông': 'không', hong: 'không', hk: 'không',
        'mún': 'muốn', mun: 'muốn', 'chít': 'chết', chit: 'chết', die: 'chết',
        'tữ': 'tử', 'tựtử': 'tự tử', 'tựtữ': 'tự tử'
      }
    },
    // T-07: 'keo dai' đứng một mình bắt cả "ca mổ kéo dài" → chỉ giữ cụm có ngữ cảnh (xem humanPatterns).
    // 'bao hanh' (trùng "bảo hành") và 'khong thiet' (trùng "không thiệt") chuyển sang humanStrict có dấu,
    // nhóm bỏ dấu giữ cụm có ngữ cảnh 'bi bao hanh', 'khong thiet song' (review lần 2, N-01).
    human: ['kiet suc', 'suy sup', 'mat hung thu', 'khong chiu noi', 'tuyet vong', 'vo vong', 'nhieu tuan', 'may tuan', 'hang thang',
      'met keo dai', 'kiet suc keo dai', 'buon keo dai', 'khong ngu keo dai', 'mat ngu keo dai',
      'bi bao hanh', 'khong thiet song', 'chang thiet song',
      'bi danh', 'quay roi', 'de doa', 'khong ai hieu', 'mot minh qua', 'bat luc'],
    humanStrict: ['bạo hành', 'không thiết'],
    // "kéo dài" có ngữ cảnh, so trên chuỗi đã bỏ dấu và tách từ (review lần 3, R-2 — mẫu của code-reviewer, 17/17 bắt, 0/10 nhầm):
    //  1) trạng thái/cảm xúc (+ "này/đó/ấy/cứ/vẫn") + kéo dài: "áp lực kéo dài", "căng thẳng cứ kéo dài", "chán kéo dài"…;
    //     trừ "kéo dài thời gian" ("lo kéo dài thời gian").
    //  2) kéo dài + ÍT NHẤT MỘT lượng từ (chữ hoặc số) + tuần/tháng/năm: "kéo dài hai tuần", "kéo dài ba tháng nay", "kéo dài 3 tuần".
    //     Bỏ dấu thì "năm" (5) trùng "năm" (12 tháng), "thang" trùng "thẳng" → bắt buộc lượng từ, và loại "năm" đi với
    //     tiếng/giờ/phút/giây/rưỡi: KHÔNG bắt "Ca mổ kéo dài năm tiếng", "tới năm giờ sáng", "kéo dài thẳng tới trưa".
    humanPatterns: [
      / (?:met|met moi|kiet suc|buon|buon ba|chan|cang|cang thang|stress|ap luc|lo|lo au|lo lang|chan nan|so hai|khong ngu|mat ngu|kho ngu|tinh trang|cam giac|tam trang)(?: nay| do| ay| cu| van)? keo dai (?!thoi gian )/,
      / keo dai (?:(?:ca|nhieu|may|vai|hang|hon|gan|suot|den|toi|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi|\d+) )+(?:tuan|thang|nam)(?! (?:tieng|gio|phut|giay|ruoi) )/
    ],

    /* ----- 9.2b Ý nghĩ làm hại con → nhóm khẩn (C.FEATURES.pregnancyHarm; anh duyệt câu 10a, chữ 'draft') -----
       So trên chuỗi NFC chữ thường giữ dấu VÀ giữ dấu câu ("." cho . ! ? ; …, "," cho dấu phẩy), sau bảng viết tắt teen
       (strictPatterns: teen đổi sang chữ có dấu; patterns: teen đổi sang chữ không dấu → chỉ khớp khi gõ không dấu).
       Loại trừ (đề xuất của FE-2, CHỜ ANH DUYỆT, có test hai chiều):
       • "con người" ("rác thải làm hại con người");
       • câu hỏi lo lắng: cụm đứng trước "không/chưa" (+ tiểu từ nhỉ/ạ/à/hả/vậy/ta) ở cuối câu, chen tối đa 3 từ ("uống cà phê có làm hại con không?",
         "thuốc này có làm hại em bé không nhỉ"). Đây là nỗi lo thường gặp của mẹ bầu, không phải ý nghĩ làm hại con.
       Vẫn khẩn: "mình sợ mình sẽ làm hại con", "mình muốn làm hại con", "không muốn làm hại con mà cứ nghĩ tới". */
    harmBaby: {
      strictPatterns: [
        / (?:làm hại (?:con(?! người )|em bé|thai)|hại con mình) (?!(?:[^\s.,]+ ){0,3}(?:không|khong|chưa|chua) (?:(?:nhỉ|nhể|ạ|à|hả|vậy|ta|nhi|a|ha|vay) )?(?:[.,] |$))/u
      ],
      patterns: [
        / lam hai (?:con(?! nguoi )|em be|thai) (?!(?:[^\s.,]+ ){0,3}(?:không|khong|chưa|chua) (?:(?:nhỉ|nhể|ạ|à|hả|vậy|ta|nhi|a|ha|vay) )?(?:[.,] |$))/u
      ]
    },

    /* ----- 9.4b Cần người hỗ trợ (C.FEATURES.lossGroup; anh duyệt câu 10b, 10c; chữ 'draft') -----
       strict: so có dấu (NFC, teen → chữ có dấu); loose: so chữ gõ không dấu (NFC, teen → chữ không dấu), như DANGER_SIGNS.
       "mat con" không dấu trùng "mất công" gõ sai → chỉ bắt bản có dấu (PRD 9.4b). */
    loss: {
      strict: ['mất con', 'sẩy thai', 'thai lưu', 'hư thai', 'mất bé', 'thai mất'],
      loose: ['say thai', 'thai luu', 'hu thai']
    },
    notKeeping: {                           // lời không phán xét; không ra trang khẩn
      strict: ['không muốn giữ thai', 'muốn bỏ thai', 'không muốn có con'],
      loose: ['khong muon giu thai', 'muon bo thai']
    },
    alone: {
      strict: ['không ai giúp', 'khóc suốt', 'khóc cả ngày'],
      loose: ['khong ai giup', 'khoc suot', 'khoc ca ngay']
    },

    /* ----- 9.5 Khó chịu trong người (kế thừa physical của STOP-4P, chỉnh theo PRD) -----
       Bỏ 'dau nguc', 'ngat xiu' (chuyển sang DANGER_SIGNS dòng 9, 8). Thêm hoa mắt, hụt hơi, chuột rút, buồn nôn (so bỏ dấu
       như STOP-4P), "mệt lả": có dấu ở physicalStrict, không dấu ở physicalPlain (bỏ dấu thì trùng "mệt là"). */
    physical: ['chong mat', 'kho tho', 'tuc nguc', 'hoi hop', 'tim dap nhanh', 'choang vang', 'hoa mat', 'hut hoi', 'chuot rut', 'buon non'],
    physicalStrict: ['hồi hộp', 'mệt lả'],
    physicalPlain: ['met la'],

    /* ----- Suy luận chip tình huống (PRD 9.6). Chỉ để gợi ý bài, chị sửa nhãn được; so bỏ dấu. ----- */
    sleep: ['kho ngu', 'mat ngu', 'tran troc', 'khong ngu duoc', 'nam mai khong ngu', 'thuc giac'],
    contexts: {
      before_visit: ['di kham', 'sieu am', 'xet nghiem', 'ket qua', 'test duong', 'choc oi'],
      worry_baby: ['lo cho con', 'so con', 'con co sao khong', 'lo be'],
      family: ['me chong', 'nha chong', 'cai nhau', 'gian chong'],
      work: ['di lam', 'cong viec', 'sep']
      // body: dùng chính nhóm 9.5 (physical); sleep: KEYWORDS.sleep
    }
  };

  /* ===== Bộ lọc thông tin nhận diện (PRD 9.8; kế thừa detectPII STOP-4P js/engine.js:19–79) ===== */
  const PII = {
    // Bỏ: bn, bệnh nhân, người bệnh, đd, dd, điều dưỡng, trưởng khoa, sếp. Thêm: chồng, vợ, bố, ba, mẹ chồng, bố chồng,
    // bà/ông ngoại/nội, nữ hộ sinh. Tối đa 3 chữ một danh xưng.
    titles: ['sản phụ', 'chị', 'anh', 'cô', 'chú', 'bác', 'bs', 'bác sĩ', 'hộ sinh', 'nữ hộ sinh', 'ông', 'bà', 'em', 'mẹ',
      'người nhà', 'bạn', 'chồng', 'vợ', 'bố', 'ba', 'mẹ chồng', 'bố chồng', 'bà ngoại', 'bà nội', 'ông ngoại', 'ông nội'],
    // Tên ở nhà của con: chỉ coi là danh xưng khi C.FEATURES.piiSkipBabyNames tắt (PRD câu 13: "Bé Bơ", "con Na" không cảnh báo)
    babyTitles: ['bé', 'con', 'em bé'],
    abbrTitles: ['bs'],
    // Sau "BS." mà là các từ này thì là câu mới (review STOP-4P lần 4, G-2). Cố ý không có "Mai".
    sentenceStart: ['hôm', 'sáng', 'chiều', 'tối', 'trưa', 'đêm', 'nay', 'giờ', 'lúc', 'khi', 'sau', 'rồi', 'mình', 'tôi', 'em',
      'cảm', 'đã', 'cũng', 'vì', 'nhưng', 'và', 'còn', 'thấy', 'bạn', 'không', 'có'],
    why: {
      phone: 'số điện thoại', digits: 'dãy số dài (số căn cước, mã hồ sơ…)', email: 'email',
      record: 'mã hồ sơ', address: 'địa chỉ', name: 'có thể là tên người'
    }
  };

  /* ===== PIN yếu (AC-81, ADR 0005 mục 4.3) — CÙNG luật với server; check-static so danh sách này ===== */
  const PIN = {
    length: 6,
    weakList: ['000000', '111111', '112233', '123321', '666888', '888888', '168168', '686868',
      // = WEAK_PINS_EXTRA của google_apps_script.js (mẫu bàn phím / số đẹp, review T-RB)
      '147258', '258369', '159753', '789456', '456123', '147852', '520520', '131420', '123654', '321654',
      '741852', '852963', '159357', '753951']
  };

  return {
    REVIEW, EXERCISES, LIBRARY_ORDER, LIBRARY_GROUPS, POSTURE, EMOTIONS, CONTEXTS, MINUTES, TENSION_LABELS, FITS,
    SUMMARIES, REASONS, UNWELL_CHIPS, PROMPTS, HABITS, DANGER_SIGNS, URGENT_REASONS, KEYWORDS, PII, PIN
  };
})();
