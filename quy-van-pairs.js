// Quy Vân Quán — dữ liệu Đối từ ở Vọng Vân Đình (bước 2 sau review 19/10, ngày 22/10/2026;
// docs/plans/2026-10-22-quy-van-pavilion-words-design.md). Mở khi người chơi có lưu niệm doi của Liên Tỏa.
// UMD như quy-van-story.js: test Node require được, trang web dùng window.QuyVanPairs.
// Tệp này tách khỏi quy-van-story.js vì build-deck nối mọi chữ Hán trong quy-van-story.js vào bộ chữ, mà lời giải ở đây
// có chữ ngoài bộ chữ (猩猩, 玻璃, 采访…).
//
// poly: chữ đa âm → { âm: nghĩa ngắn của âm đó }. Câu "đọc" lấy từ cầu nối của bộ chữ (quy-van-deck.js) có chữ này
// ở một âm trong danh sách; phương án là từ đó đọc theo từng âm trong danh sách. Không đưa vào: chữ mà từ điển nhận cả
// hai âm cho cùng một từ (长 tràng/trường: 长江 tràng giang; 领 lĩnh/lãnh; 时 thì/thời; 宗 tông/tôn; 诡 quỷ/ngụy: 诡辩,
// 诡计; 迫 bách/bức: 压迫), âm Nôm (散 tan).
// skip: từ cầu nối không hỏi. Tiếng Việt dùng được cả hai cách đọc: 经营 kinh doanh/kinh dinh, 营寨 doanh trại/dinh trại,
// 勾结 cấu kết/câu kết, 强迫 cưỡng bức/cưỡng bách, 散乱 tán/tản loạn, 任职 nhậm/nhiệm chức, 正当 (zhèngdāng "đang lúc" đọc
// chính đương), 高潮 (cao triều là triều cường). Tên riêng hai cách gọi: 伯乐 Bá Lạc/Bá Nhạc. Phiên âm tiếng Phạn: 舍利.
// Từ cổ ít gặp: 干与.
// traps: bẫy nghĩa, từ có âm Hán Việt trùng một từ tiếng Việt mà nghĩa khác. w: từ; r: âm Hán Việt; m: nghĩa hay gặp
// trong truyện (phương án đúng); vi: nghĩa của từ tiếng Việt cùng âm (phương án bẫy); note: thêm, có thể rỗng. Xếp theo
// số lần gặp trong 80 tệp đầu của corpus truyện (corpus-holdout-2026-08-26), nhiều trước. Nghĩa do người soạn viết; app
// Hanzii chỉ dùng để soát, không chép chữ nào. Dan soát ngày 23/10/2026, bỏ 到底, 非常, 过度, 下流: người đọc truyện convert
// không bị các từ này đánh lừa.
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.QuyVanPairs = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    return {
        poly: {
            '中': { 'trung': 'giữa, trong', 'trúng': 'trúng, đúng vào' },
            '好': { 'hảo': 'tốt, hay', 'hiếu': 'thích, ham' },
            '要': { 'yếu': 'quan trọng, cốt yếu', 'yêu': 'đòi, xin' },
            '少': { 'thiếu': 'trẻ', 'thiểu': 'ít' },
            '过': { 'quá': 'vượt quá, đã qua', 'qua': 'đi qua, xuyên qua' },
            '和': { 'hòa': 'hòa hợp, và', 'họa': 'họa theo, đáp lời' },
            '间': { 'gian': 'khoảng giữa', 'gián': 'cách quãng' },
            '长': { 'trường': 'dài', 'trưởng': 'lớn lên; đứng đầu' },
            '将': { 'tương': 'sắp, sẽ', 'tướng': 'tướng cầm quân' },
            '从': { 'tòng': 'theo', 'thung': 'thong thả' },
            '当': { 'đương': 'đang; gánh vác', 'đáng': 'thích đáng, xứng' },
            '行': { 'hành': 'đi, làm', 'hàng': 'hàng lối; ngành nghề' },
            '分': { 'phân': 'chia', 'phận': 'phần được chia; số phận, bổn phận' },
            '住': { 'trú': 'ở, cư trú', 'trụ': 'dừng, giữ' },
            '与': { 'dữ': 'và, với', 'dự': 'dự vào' },
            '处': { 'xử': 'xử lý, sắp đặt', 'xứ': 'nơi, chốn' },
            '相': { 'tương': 'lẫn nhau', 'tướng': 'diện mạo; tể tướng' },
            '强': { 'cường': 'mạnh', 'cưỡng': 'ép, gượng' },
            '难': { 'nan': 'khó', 'nạn': 'tai họa' },
            '并': { 'tịnh': 'cùng, và', 'tính': 'gộp vào' },
            '传': { 'truyền': 'truyền lại', 'truyện': 'truyện ghi chép' },
            '干': { 'cán': 'làm; cốt cán', 'can': 'dính vào, can dự' },
            '任': { 'nhậm': 'nhận chức', 'nhiệm': 'việc được giao, giao việc' },
            '背': { 'bối': 'lưng, phía sau', 'bội': 'làm trái, phản' },
            '散': { 'tán': 'tan ra, rải ra', 'tản': 'rời rạc, thong thả' },
            '兴': { 'hưng': 'thịnh, dấy lên', 'hứng': 'hứng thú' },
            '易': { 'dị': 'dễ', 'dịch': 'đổi, trao đổi' },
            '刺': { 'thứ': 'gai; thứ sử (chức quan)', 'thích': 'đâm, ám sát (thích khách)' },
            '使': { 'sử': 'sai khiến, dùng', 'sứ': 'người được sai đi' },
            '调': { 'điều': 'điều hòa, điều động', 'điệu': 'giọng, điệu' },
            '推': { 'thôi': 'đẩy', 'suy': 'suy ra' },
            '弹': { 'đạn': 'viên đạn', 'đàn': 'gảy, bật; đè nén (đàn áp)' },
            '司': { 'ti': 'cơ quan, sở', 'tư': 'trông coi' },
            '划': { 'hoa': 'chèo, rạch', 'hoạch': 'vạch ra' },
            '藏': { 'tàng': 'cất giấu', 'tạng': 'kho; Tây Tạng' },
            '营': { 'doanh': 'kinh doanh; doanh trại', 'dinh': 'dinh thự, đồn; lo liệu (dinh dưỡng)' },
            '值': { 'trị': 'giá, đáng giá', 'trực': 'trực phiên' },
            '乐': { 'nhạc': 'âm nhạc', 'lạc': 'vui' },
            '炮': { 'pháo': 'súng lớn', 'bào': 'bào chế thuốc' },
            '降': { 'giáng': 'rơi xuống, hạ xuống', 'hàng': 'đầu hàng' },
            '泥': { 'nê': 'bùn', 'nệ': 'bám chặt, câu nệ' },
            '舍': { 'xá': 'nhà', 'xả': 'bỏ' },
            '诸': { 'chư': 'các, mọi', 'gia': 'họ Gia Cát' },
            '旋': { 'toàn': 'xoay', 'hoàn': 'trở về (khải hoàn)' },
            '冠': { 'quan': 'mũ', 'quán': 'đội mũ; đứng đầu' },
            '累': { 'lũy': 'chồng chất', 'lụy': 'vướng vào' },
            '塞': { 'tắc': 'lấp, nghẽn', 'tái': 'cửa ải biên giới' },
            '潮': { 'triều': 'thủy triều', 'trào': 'dâng lên' },
            '宿': { 'túc': 'ngủ trọ', 'tú': 'chòm sao' }
        },

        skip: ['干与', '经营', '营寨', '勾结', '强迫', '散乱', '正当', '任职', '高潮', '伯乐', '舍利'],

        traps: [
            { w: '自己', r: 'tự kỷ', m: 'bản thân, chính mình', vi: 'chứng tự kỷ', note: '' },
            { w: '只是', r: 'chỉ thị', m: 'chỉ là; nhưng mà', vi: 'mệnh lệnh của cấp trên', note: '' },
            { w: '说道', r: 'thuyết đạo', m: 'nói, nói rằng', vi: 'giảng đạo',
                note: 'Rất hay gặp trong truyện: 他笑着说道 là "hắn cười nói".' },
            { w: '东西', r: 'đông tây', m: 'đồ vật, đồ đạc', vi: 'hướng đông và hướng tây',
                note: 'Đọc dōngxi (chữ sau đọc nhẹ) là đồ vật; đọc dōngxī mới là hai hướng.' },
            { w: '所以', r: 'sở dĩ', m: 'cho nên, vì vậy', vi: 'lý do vì sao',
                note: 'Tiếng Việt "sở dĩ… là vì…" nêu nguyên nhân; 所以 đứng trước kết quả: 因为下雨，所以没来 là "vì mưa nên không đến". Riêng 之所以…是因为… mới giống "sở dĩ… là vì…".' },
            { w: '虽然', r: 'tuy nhiên', m: 'tuy, mặc dù', vi: 'nhưng, song',
                note: '虽然 mở vế nhượng bộ; vế sau thường có 但是 "nhưng".' },
            { w: '心里', r: 'tâm lý', m: 'trong lòng', vi: 'tâm lý học, đời sống tinh thần',
                note: 'Tâm lý (học) tiếng Trung là 心理; 心里 là "trong lòng".' },
            { w: '大家', r: 'đại gia', m: 'mọi người', vi: 'người giàu có', note: '大家好 là "chào mọi người".' },
            { w: '地方', r: 'địa phương', m: 'chỗ, nơi', vi: 'vùng, miền (đối với trung ương)',
                note: 'Đọc dìfang là chỗ (哪个地方 "chỗ nào"); đọc dìfāng (地方官) mới là địa phương.' },
            { w: '一切', r: 'nhất thiết', m: 'tất cả, hết thảy', vi: 'nhất định phải', note: '' },
            { w: '明白', r: 'minh bạch', m: 'hiểu', vi: 'không khuất tất (tài chính, sổ sách)',
                note: 'Cũng có nghĩa "rõ ràng", nhưng trong truyện hay gặp nhất là 我明白了 "tôi hiểu rồi".' },
            { w: '意思', r: 'ý tứ', m: 'ý, ý nghĩa', vi: 'tế nhị, kín đáo', note: '什么意思 là "ý gì".' },
            { w: '表情', r: 'biểu tình', m: 'nét mặt, vẻ mặt', vi: 'tuần hành phản đối', note: '' },
            { w: '告诉', r: 'cáo tố', m: 'nói cho biết', vi: 'tố giác, vạch tội',
                note: 'Nghe như đảo chữ của "tố cáo", nhưng 告诉你 là "nói cho ngươi biết".' },
            { w: '实在', r: 'thực tại', m: 'thật là, quả thật', vi: 'hiện thực đang có', note: '实在太好了 là "thật là tốt quá".' },
            { w: '安排', r: 'an bài', m: 'sắp xếp, bố trí', vi: 'số phận đã định sẵn', note: '' },
            { w: '情绪', r: 'tình tự', m: 'tâm trạng, cảm xúc', vi: 'trò chuyện yêu đương', note: '' },
            { w: '家人', r: 'gia nhân', m: 'người nhà', vi: 'người làm, đầy tớ', note: '' },
            { w: '激动', r: 'kích động', m: 'xúc động, phấn khích', vi: 'xúi giục, khích bác', note: '他很激动 là "hắn rất xúc động".' },
            { w: '紧张', r: 'khẩn trương', m: 'căng thẳng, hồi hộp', vi: 'nhanh gấp, khẩn cấp', note: '别紧张 là "đừng căng thẳng".' },
            { w: '答应', r: 'đáp ứng', m: 'nhận lời, đồng ý', vi: 'thỏa mãn, đạt (nhu cầu, tiêu chuẩn)', note: '我答应你 là "ta hứa với ngươi".' },
            { w: '女儿', r: 'nữ nhi', m: 'con gái (của cha mẹ)', vi: 'phận đàn bà con gái', note: '我女儿 là "con gái tôi".' },
            { w: '仔细', r: 'tử tế', m: 'kỹ lưỡng, cẩn thận', vi: 'tốt bụng, đàng hoàng', note: '仔细看 là "nhìn kỹ".' },
            { w: '保持', r: 'bảo trì', m: 'giữ, duy trì', vi: 'bảo dưỡng máy móc', note: '保持冷静 là "giữ bình tĩnh".' },
            { w: '开心', r: 'khai tâm', m: 'vui vẻ', vi: 'mở mang trí óc cho trẻ', note: '' },
            { w: '必要', r: 'tất yếu', m: 'cần thiết', vi: 'không tránh khỏi', note: '' },
            { w: '始终', r: 'thủy chung', m: 'từ đầu đến cuối; luôn', vi: 'một lòng một dạ (trong tình yêu)',
                note: '他始终不说话 là "hắn mãi không nói".' },
            { w: '方便', r: 'phương tiện', m: 'tiện, thuận tiện', vi: 'xe cộ, công cụ', note: '不方便 là "không tiện".' },
            { w: '伤害', r: 'thương hại', m: 'làm tổn thương, làm hại', vi: 'thương xót, tội nghiệp', note: '' },
            { w: '手术', r: 'thủ thuật', m: 'ca mổ, phẫu thuật', vi: 'mẹo, cách làm khéo', note: '' },
            { w: '主意', r: 'chủ ý', m: 'ý kiến, cách, kế', vi: 'cố ý, có chủ đích', note: '好主意 là "ý hay".' },
            { w: '入口', r: 'nhập khẩu', m: 'lối vào', vi: 'mua hàng từ nước ngoài', note: 'Nhập khẩu tiếng Trung là 进口.' },
            { w: '老婆', r: 'lão bà', m: 'vợ', vi: 'bà già', note: 'Bà cụ là 老太太 hay 老婆婆.' },
            { w: '便宜', r: 'tiện nghi', m: 'rẻ; được lợi, hời', vi: 'đồ dùng tiện lợi, thoải mái', note: 'Đọc piányi là rẻ; 占便宜 là "được hời".' },
            { w: '秘书', r: 'bí thư', m: 'thư ký', vi: 'người đứng đầu cấp ủy đảng, đoàn', note: 'Bí thư (đảng) tiếng Trung là 书记.' },
            { w: '颜色', r: 'nhan sắc', m: 'màu sắc', vi: 'vẻ đẹp của phụ nữ',
                note: 'Truyện cổ trang có khi dùng 颜色 cho nhan sắc (有几分颜色); 给他点颜色看看 là "cho hắn biết tay".' },
            { w: '丈夫', r: 'trượng phu', m: 'chồng', vi: 'người đàn ông có chí khí',
                note: 'Đọc zhàngfu là chồng; đọc zhàngfū (văn cổ, 大丈夫) mới là đàn ông, trượng phu.' },
            { w: '老家', r: 'lão gia', m: 'quê nhà', vi: 'ông chủ', note: '老爷 cũng đọc lão gia, nghĩa là ông chủ.' },
            { w: '计算', r: 'kế toán', m: 'tính toán', vi: 'ghi chép sổ sách tiền bạc', note: 'Nghề kế toán tiếng Trung là 会计.' },
            { w: '工资', r: 'công tư', m: 'tiền lương', vi: 'việc công và việc tư', note: 'Việc công, việc tư là 公私, cùng âm.' },
            { w: '水晶', r: 'thủy tinh', m: 'pha lê, thạch anh', vi: 'kính, thủy tinh thường', note: 'Kính, thủy tinh tiếng Trung là 玻璃.' },
            { w: '点心', r: 'điểm tâm', m: 'bánh ngọt, món ăn nhẹ', vi: 'bữa sáng', note: '' },
            { w: '星星', r: 'tinh tinh', m: 'ngôi sao', vi: 'con tinh tinh', note: 'Con tinh tinh tiếng Trung là 黑猩猩; 猩猩 cũng đọc tinh tinh.' },
            { w: '开会', r: 'khai hội', m: 'họp', vi: 'mở lễ hội', note: '' },
            { w: '假装', r: 'giả trang', m: 'giả vờ', vi: 'cải trang, đổi lốt', note: '' },
            { w: '包子', r: 'bao tử', m: 'bánh bao', vi: 'dạ dày', note: '' },
            { w: '心事', r: 'tâm sự', m: 'điều lo nghĩ trong lòng', vi: 'kể chuyện riêng cho nhau nghe', note: '有心事 là "có chuyện lo nghĩ".' },
            { w: '同情', r: 'đồng tình', m: 'thương cảm', vi: 'đồng ý, tán thành', note: '' },
            { w: '外公', r: 'ngoại công', m: 'ông ngoại', vi: 'võ công bên ngoài', note: 'Võ ngoại công là 外功, cùng âm.' },
            { w: '老是', r: 'lão thị', m: 'luôn luôn, cứ', vi: 'mắt lão (khó nhìn gần)', note: '' },
            { w: '相亲', r: 'tương thân', m: 'đi xem mắt', vi: 'giúp đỡ lẫn nhau', note: '相亲相爱 là "tương thân tương ái"; 相亲 đứng riêng là đi xem mắt.' },
            { w: '教师', r: 'giáo sư', m: 'giáo viên', vi: 'chức danh cao ở đại học', note: 'Giáo sư tiếng Trung là 教授.' },
            { w: '体操', r: 'thể thao', m: 'thể dục, thể dục dụng cụ', vi: 'mọi môn thể thao', note: 'Thể thao tiếng Trung là 体育.' }
        ]
    };
}));
