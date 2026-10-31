// Quy Vân Quán / Tiên Nghịch — Module 5 Công Cụ HanziGuru & Đấu Pháp Tốc Lôi
(function (root) {
    'use strict';

    var HZ_TOOLS = {};

    // 1. 100 CHỮ HÁN XÂY NỀN (Bách Tự Trúc Cơ)
    HZ_TOOLS.CORE_100 = [
        { ch: '一', py: 'yī', hv: 'nhất', m: 'số một, bắt đầu' },
        { ch: '二', py: 'èr', hv: 'nhị', m: 'số hai' },
        { ch: '三', py: 'sān', hv: 'tam', m: 'số ba' },
        { ch: '四', py: 'sì', hv: 'tứ', m: 'số bốn' },
        { ch: '五', py: 'wǔ', hv: 'ngũ', m: 'số năm' },
        { ch: '六', py: 'liù', hv: 'lục', m: 'số sáu' },
        { ch: '七', py: 'qī', hv: 'thất', m: 'số bảy' },
        { ch: '八', py: 'bā', hv: 'bát', m: 'số tám' },
        { ch: '九', py: 'jiǔ', hv: 'cửu', m: 'số chín' },
        { ch: '十', py: 'shí', hv: 'thập', m: 'số mười' },
        { ch: '百', py: 'bǎi', hv: 'bách', m: 'trăm' },
        { ch: '千', py: 'qiān', hv: 'thiên', m: 'nghìn' },
        { ch: '万', py: 'wàn', hv: 'vạn', m: 'mười nghìn, vạn' },
        { ch: '人', py: 'rén', hv: 'nhân', m: 'người' },
        { ch: '大', py: 'dà', hv: 'đại', m: 'to lớn' },
        { ch: '小', py: 'xiǎo', hv: 'tiểu', m: 'nhỏ bé' },
        { ch: '中', py: 'zhōng', hv: 'trung', m: 'ở giữa, trung tâm' },
        { ch: '天', py: 'tiān', hv: 'thiên', m: 'trời, ngày' },
        { ch: '地', py: 'dì', hv: 'địa', m: 'đất đai' },
        { ch: '日', py: 'rì', hv: 'nhật', m: 'mặt trời, ngày' },
        { ch: '月', py: 'yuè', hv: 'nguyệt', m: 'mặt trăng, tháng' },
        { ch: '山', py: 'shān', hv: 'sơn', m: 'núi non' },
        { ch: '水', py: 'shuǐ', hv: 'thủy', m: 'nước' },
        { ch: '火', py: 'huǒ', hv: 'hỏa', m: 'ngọn lửa' },
        { ch: '木', py: 'mù', hv: 'mộc', m: 'cây cối, gỗ' },
        { ch: '土', py: 'tǔ', hv: 'thổ', m: 'đất' },
        { ch: '金', py: 'jīn', hv: 'kim', m: 'vàng, kim loại' },
        { ch: '石', py: 'shí', hv: 'thạch', m: 'hòn đá' },
        { ch: '田', py: 'tián', hv: 'điền', m: 'ruộng đồng' },
        { ch: '风', py: 'fēng', hv: 'phong', m: 'ngọn gió' },
        { ch: '雨', py: 'yǔ', hv: 'vũ', m: 'cơn mưa' },
        { ch: '云', py: 'yún', hv: 'vân', m: 'mây bay' },
        { ch: '气', py: 'qì', hv: 'khí', m: 'linh khí, không khí' },
        { ch: '口', py: 'kǒu', hv: 'khẩu', m: 'miệng' },
        { ch: '目', py: 'mù', hv: 'mục', m: 'con mắt' },
        { ch: '耳', py: 'ěr', hv: 'nhĩ', m: 'tai nghe' },
        { ch: '手', py: 'shǒu', hv: 'thủ', m: 'bàn tay' },
        { ch: '足', py: 'zú', hv: 'túc', m: 'bàn chân' },
        { ch: '心', py: 'xīn', hv: 'tâm', m: 'trái tim, lòng dạ' },
        { ch: '女', py: 'nǚ', hv: 'nữ', m: 'phụ nữ, con gái' },
        { ch: '子', py: 'zǐ', hv: 'tử', m: 'con cái, đứa trẻ' },
        { ch: '父', py: 'fù', hv: 'phụ', m: 'cha, bố' },
        { ch: '母', py: 'mǔ', hv: 'mẫu', m: 'mẹ' },
        { ch: '友', py: 'yǒu', hv: 'hữu', m: 'bạn bè' },
        { ch: '门', py: 'mén', hv: 'môn', m: 'cửa, cánh cổng, môn phái' },
        { ch: '家', py: 'jiā', hv: 'gia', m: 'nhà, gia đình' },
        { ch: '上', py: 'shàng', hv: 'thượng', m: 'ở trên, lên trên' },
        { ch: '下', py: 'xià', hv: 'hạ', m: 'ở dưới, xuống dưới' },
        { ch: '左', py: 'zuǒ', hv: 'tả', m: 'bên trái' },
        { ch: '右', py: 'yòu', hv: 'hữu', m: 'bên phải' },
        { ch: '前', py: 'qián', hv: 'tiền', m: 'phía trước' },
        { ch: '后', py: 'hòu', hv: 'hậu', m: 'phía sau' },
        { ch: '多', py: 'duō', hv: 'đa', m: 'nhiều' },
        { ch: '少', py: 'shǎo', hv: 'thiểu', m: 'ít' },
        { ch: '高', py: 'gāo', hv: 'cao', m: 'cao lớn' },
        { ch: '白', py: 'bái', hv: 'bạch', m: 'màu trắng' },
        { ch: '黑', py: 'hēi', hv: 'hắc', m: 'màu đen' },
        { ch: '红', py: 'hóng', hv: 'hồng', m: 'màu đỏ' },
        { ch: '绿', py: 'lǜ', hv: 'lục', m: 'màu xanh lá' },
        { ch: '好', py: 'hǎo', hv: 'hảo', m: 'tốt, đẹp' },
        { ch: '生', py: 'shēng', hv: 'sinh', m: 'sống, sinh ra' },
        { ch: '死', py: 'sǐ', hv: 'tử', m: 'chết' },
        { ch: '看', py: 'kàn', hv: 'khán', m: 'nhìn, xem' },
        { ch: '见', py: 'jiàn', hv: 'kiến', m: 'thấy, gặp' },
        { ch: '听', py: 'tīng', hv: 'thính', m: 'nghe' },
        { ch: '说', py: 'shuō', hv: 'thuyết', m: 'nói' },
        { ch: '读', py: 'dú', hv: 'độc', m: 'đọc' },
        { ch: '写', py: 'xiě', hv: 'tả', m: 'viết' },
        { ch: '学', py: 'xué', hv: 'học', m: 'học tập' },
        { ch: '吃', py: 'chī', hv: 'ngật', m: 'ăn' },
        { ch: '喝', py: 'hē', hv: 'hát', m: 'uống' },
        { ch: '走', py: 'zǒu', hv: 'tẩu', m: 'đi' },
        { ch: '来', py: 'lái', hv: 'lai', m: 'đến' },
        { ch: '去', py: 'qù', hv: 'khứ', m: 'đi' },
        { ch: '出', py: 'chū', hv: 'xuất', m: 'ra ngoài' },
        { ch: '入', py: 'rù', hv: 'nhập', m: 'vào trong' },
        { ch: '开', py: 'kāi', hv: 'khai', m: 'mở ra' },
        { ch: '关', py: 'guān', hv: 'quan', m: 'đóng lại, cửa ải' },
        { ch: '买', py: 'mǎi', hv: 'mãi', m: 'mua' },
        { ch: '卖', py: 'mài', hv: 'mại', m: 'bán' },
        { ch: '问', py: 'wèn', hv: 'vấn', m: 'hỏi' },
        { ch: '答', py: 'dá', hv: 'đáp', m: 'trả lời' },
        { ch: '明', py: 'míng', hv: 'minh', m: 'sáng sủa, rõ ràng' },
        { ch: '力', py: 'lì', hv: 'lực', m: 'sức mạnh' },
        { ch: '剑', py: 'jiàn', hv: 'kiếm', m: 'thanh kiếm' },
        { ch: '道', py: 'dào', hv: 'đạo', m: 'con đường, đạo lý' },
        { ch: '丹', py: 'dān', hv: 'đan', m: 'viên đan, màu đỏ' },
        { ch: '仙', py: 'xiān', hv: 'tiên', m: 'tiên nhân' },
        { ch: '魔', py: 'mó', hv: 'ma', m: 'ma đạo' },
        { ch: '神', py: 'shén', hv: 'thần', m: 'thần thánh, thần thức' }
    ];

    // 2. 214 BỘ THỦ KHANG HY TIÊU BIỂU (Đạo Văn Thiên Địa)
    HZ_TOOLS.RADICALS_214 = [
        { r: '一', n: 'Nhất', s: 1, m: 'Số một, khởi đầu vạn vật' },
        { r: '丨', n: 'Cổn', s: 1, m: 'Nét sổ thẳng đứng' },
        { r: '丶', n: 'Chủ', s: 1, m: 'Dấu chấm, đốm lửa' },
        { r: '丿', n: 'Phiệt', s: 1, m: 'Nét phẩy, nghiêng qua trái' },
        { r: '乙', n: 'Ất', s: 1, m: 'Can thứ hai, uốn khúc' },
        { r: '亅', n: 'Quyết', s: 1, m: 'Nét móc lên' },
        { r: '二', n: 'Nhị', s: 2, m: 'Số hai' },
        { r: '十', n: 'Thập', s: 2, m: 'Số mười, hoàn chỉnh' },
        { r: '卜', n: 'Bặc', s: 2, m: 'Bói toán, tiên tri' },
        { r: '人/亻', n: 'Nhân', s: 2, m: 'Con người, hành vi con người' },
        { r: '刀/刂', n: 'Đao', s: 2, m: 'Con dao, thanh kiếm, cắt bổ' },
        { r: '力', n: 'Lực', s: 2, m: 'Sức mạnh, cơ bắp' },
        { r: '又', n: 'Hựu', s: 2, m: 'Bàn tay phải, lại nữa' },
        { r: '口', n: 'Khẩu', s: 3, m: 'Cái miệng, ăn uống, lời nói' },
        { r: '囗', n: 'Vi', s: 3, m: 'Vây quanh, bức tường thành' },
        { r: '土', n: 'Thổ', s: 3, m: 'Đất đai, mặt đất' },
        { r: '士', n: 'Sĩ', s: 3, m: 'Kẻ sĩ, người tài' },
        { r: '夕', n: 'Tịch', s: 3, m: 'Buổi chiều tối' },
        { r: '大', n: 'Đại', s: 3, m: 'To lớn, người dang tay' },
        { r: '女', n: 'Nữ', s: 3, m: 'Phụ nữ, mẹ, cô gái' },
        { r: '子', n: 'Tử', s: 3, m: 'Đứa trẻ, con cái' },
        { r: '宀', n: 'Miên', s: 3, m: 'Mái nhà, nơi che chở' },
        { r: '寸', n: 'Thốn', s: 3, m: 'Đơn vị đo tấc, bàn tay đo' },
        { r: '小', n: 'Tiểu', s: 3, m: 'Nhỏ bé' },
        { r: '尸', n: 'Thi', s: 3, m: 'Xác người, thân thể nằm' },
        { r: '山', n: 'Sơn', s: 3, m: 'Ngọn núi, sơn mạch' },
        { r: '川', n: 'Xuyên', s: 3, m: 'Dòng sông, dòng chảy' },
        { r: '工', n: 'Công', s: 3, m: 'Thợ, công cụ làm việc' },
        { r: '巾', n: 'Cân', s: 3, m: 'Khăn vải, cờ xí' },
        { r: '广', n: 'Quảng', s: 3, m: 'Mái hiên rộng, dinh thự' },
        { r: '弓', n: 'Cung', s: 3, m: 'Cây cung bắn tên' },
        { r: '心/忄', n: 'Tâm', s: 4, m: 'Trái tim, tình cảm, suy nghĩ' },
        { r: '手/扌', n: 'Thủ', s: 4, m: 'Bàn tay, động tác cầm nắm' },
        { r: '日', n: 'Nhật', s: 4, m: 'Mặt trời, ban ngày, thời gian' },
        { r: '月', n: 'Nguyệt', s: 4, m: 'Mặt trăng, bóng đêm; thịt cơ thể' },
        { r: '木', n: 'Mộc', s: 4, m: 'Cây cối, rừng rậm' },
        { r: '水/氵', n: 'Thủy', s: 4, m: 'Nước, sông biển, chất lỏng' },
        { r: '火/灬', n: 'Hỏa', s: 4, m: 'Ngọn lửa, sức nóng, nấu nướng' },
        { r: '牛/牜', n: 'Ngưu', s: 4, m: 'Con trâu, con bò' },
        { r: '犬/犭', n: 'Khuyển', s: 4, m: 'Chó săn, loài thú bốn chân' },
        { r: '王/玉', n: 'Vương/Ngọc', s: 4, m: 'Vua chúa, ngọc báu' },
        { r: '示/礻', n: 'Thị', s: 5, m: 'Bàn thờ, thần linh, cúng tế' },
        { r: '禾', n: 'Hòa', s: 5, m: 'Cây lúa, hoa màu nông nghiệp' },
        { r: '穴', n: 'Huyệt', s: 5, m: 'Hang động, lỗ hổng' },
        { r: '目', n: 'Mục', s: 5, m: 'Con mắt, ánh nhìn' },
        { r: '石', n: 'Thạch', s: 5, m: 'Hòn đá, vách đá' },
        { r: '竹/⺮', n: 'Trúc', s: 6, m: 'Cây tre, ống nứa, bút viết' },
        { r: '米', n: 'Mễ', s: 6, m: 'Hạt gạo, lương thực' },
        { r: '糸/纟', n: 'Mịch', s: 6, m: 'Sợi tơ, may vá, trói buộc' },
        { r: '言/讠', n: 'Ngôn', s: 7, m: 'Lời nói, ngôn ngữ, đàm đạo' },
        { r: '走', n: 'Tẩu', s: 7, m: 'Chạy nhanh, di chuyển' },
        { r: '足/𧾷', n: 'Túc', s: 7, m: 'Bàn chân, bước chân' },
        { r: '车/車', n: 'Xa', s: 7, m: 'Xe cộ, cỗ xe' },
        { r: '金/钅', n: 'Kim', s: 8, m: 'Kim loại, sắt thép, tiền bạc' },
        { r: '门/門', n: 'Môn', s: 8, m: 'Cánh cổng lớn, môn phái' },
        { r: '雨', n: 'Vũ', s: 8, m: 'Cơn mưa, mây giông sấm sét' },
        { r: '食/饣', n: 'Thực', s: 9, m: 'Thức ăn, ẩm thực' },
        { r: '马/馬', n: 'Mã', s: 10, m: 'Ngựa chiến, phi nước đại' },
        { r: '鱼/魚', n: 'Ngư', s: 11, m: 'Loài cá, thủy tộc' },
        { r: '鸟/鳥', n: 'Điểu', s: 11, m: 'Loài chim trời' }
    ];

    // 3. HỌ CHỮ HÌNH THANH (Vạn Kiếm Quy Tông)
    HZ_TOOLS.PHONETIC_FAMILIES = [
        {
            root: '青', rootPy: 'qīng', meaning: 'màu xanh thanh khiết',
            desc: 'Gốc phát âm QING tạo nên cả một họ chữ vô cùng phổ biến trong tiếng Trung:',
            members: [
                { ch: '清', py: 'qīng', m: 'nước trong suốt', rad: '氵 (Thủy)' },
                { ch: '晴', py: 'qíng', m: 'trời nắng ráo', rad: '日 (Nhật)' },
                { ch: '情', py: 'qíng', m: 'tình cảm, cảm xúc', rad: '忄 (Tâm)' },
                { ch: '请', py: 'qǐng', m: 'xin, mời, thỉnh', rad: '讠 (Ngôn)' },
                { ch: '睛', py: 'jīng', m: 'tròng mắt, ánh nhìn', rad: '目 (Mục)' },
                { ch: '静', py: 'jìng', m: 'yên tĩnh, thanh tịnh', rad: '争 (Tranh)' }
            ]
        },
        {
            root: '包', rootPy: 'bāo', meaning: 'bao bọc, cuộn lại',
            desc: 'Gốc BAO biến hóa theo các hành vi của con người và vật chất:',
            members: [
                { ch: '饱', py: 'bǎo', m: 'ăn no bụng', rad: '饣 (Thực)' },
                { ch: '抱', py: 'bào', m: 'ôm ấp bằng tay', rad: '扌 (Thủ)' },
                { ch: '跑', py: 'pǎo', m: 'chạy nhanh bằng chân', rad: '足 (Túc)' },
                { ch: '泡', py: 'pào', m: 'bọt nước, ngâm', rad: '氵 (Thủy)' },
                { ch: '炮', py: 'pào', m: 'pháo nổ, đạn lửa', rad: '火 (Hỏa)' }
            ]
        },
        {
            root: '方', rootPy: 'fāng', meaning: 'phương hướng, vuông vức',
            desc: 'Gốc FANG gắn liền với không gian, lời nói và hành vi:',
            members: [
                { ch: '房', py: 'fáng', m: 'căn phòng, gian nhà', rad: '户 (Hộ)' },
                { ch: '放', py: 'fàng', m: 'buông tay, phóng thích', rad: '攵 (Phác)' },
                { ch: '访', py: 'fǎng', m: 'thăm viếng, phỏng vấn', rad: '讠 (Ngôn)' },
                { ch: '防', py: 'fáng', m: 'phòng ngự, gò đất chắn', rad: '阝 (Phụ)' }
            ]
        },
        {
            root: '也', rootPy: 'yě', meaning: 'cũng, vậy',
            desc: 'Gốc YE tạo nên các đại từ và địa lý quen thuộc nhất:',
            members: [
                { ch: '他', py: 'tā', m: 'anh ấy, người ấy', rad: '亻 (Nhân)' },
                { ch: '她', py: 'tā', m: 'cô ấy, nàng', rad: '女 (Nữ)' },
                { ch: '地', py: 'dì', m: 'mặt đất, đất đai', rad: '土 (Thổ)' },
                { ch: '池', py: 'chí', m: 'ao hồ chứa nước', rad: '氵 (Thủy)' }
            ]
        },
        {
            root: '巴', rootPy: 'bā', meaning: 'dính chặt, bám lấy',
            desc: 'Gốc BA biểu âm cho các từ chỉ đồ vật và cơ thể:',
            members: [
                { ch: '把', py: 'bǎ', m: 'cầm nắm, cán cầm', rad: '扌 (Thủ)' },
                { ch: '吧', py: 'ba', m: 'nhé, đi (trợ từ ngữ khí)', rad: '口 (Khẩu)' },
                { ch: '爸', py: 'bà', m: 'bố, cha', rad: '父 (Phụ)' }
            ]
        }
    ];

    // 4. LƯỢNG TỪ TRỰC QUAN (Vạn Vật Danh Số Biểu)
    HZ_TOOLS.MEASURE_WORDS = [
        {
            word: '把', py: 'bǎ', icon: '🗡️', use: 'Dùng cho vật có cán cầm, đồ vật nắm được trong tay',
            examples: [
                { zh: '一把剑', py: 'yī bǎ jiàn', vi: 'Một thanh kiếm' },
                { zh: '一把刀', py: 'yī bǎ dāo', vi: 'Một con dao' },
                { zh: '一把伞', py: 'yī bǎ sǎn', vi: 'Một chiếc ô' }
            ]
        },
        {
            word: '本', py: 'běn', icon: '📖', use: 'Dùng cho sách vở, công pháp, bí tịch đóng thành cuốn',
            examples: [
                { zh: '一本书', py: 'yī běn shū', vi: 'Một quyển sách' },
                { zh: '一本功法', py: 'yī běn gōngfǎ', vi: 'Một cuốn công pháp' },
                { zh: '一本秘籍', py: 'yī běn mìjí', vi: 'Một cuốn bí tịch' }
            ]
        },
        {
            word: '张', py: 'zhāng', icon: '📜', use: 'Dùng cho vật có bề mặt phẳng, mỏng như giấy, phù lục, bàn, giường',
            examples: [
                { zh: '一张纸', py: 'yī zhāng zhǐ', vi: 'Một tờ giấy' },
                { zh: '一张符', py: 'yī zhāng fú', vi: 'Một lá bùa phù' },
                { zh: '一张桌子', py: 'yī zhāng zhuōzi', vi: 'Một chiếc bàn' }
            ]
        },
        {
            word: '条', py: 'tiáo', icon: '🐉', use: 'Dùng cho vật thon dài, uốn khúc như rồng, cá, sông, đường sá',
            examples: [
                { zh: '一条鱼', py: 'yī tiáo yú', vi: 'Một con cá' },
                { zh: '一条龙', py: 'yī tiáo lóng', vi: 'Một con rồng' },
                { zh: '一条路', py: 'yī tiáo lù', vi: 'Một con đường' }
            ]
        },
        {
            word: '只', py: 'zhī', icon: '🦅', use: 'Dùng cho loài chim thú hoặc một chiếc trong đôi (tay, mắt)',
            examples: [
                { zh: '一只鸟', py: 'yī zhī niǎo', vi: 'Một con chim' },
                { zh: '一只兽', py: 'yī zhī shòu', vi: 'Một con thú' },
                { zh: '一只手', py: 'yī zhī shǒu', vi: 'Một bàn tay' }
            ]
        },
        {
            word: '颗', py: 'kē', icon: '💊', use: 'Dùng cho vật nhỏ hình cầu như đan dược, ngọc trai, ngôi sao',
            examples: [
                { zh: '一颗丹药', py: 'yī kē dānyào', vi: 'Một viên đan dược' },
                { zh: '一颗星', py: 'yī kē xīng', vi: 'Một ngôi sao' },
                { zh: '一颗珠子', py: 'yī kē zhūzi', vi: 'Một viên hạt châu' }
            ]
        },
        {
            word: '座', py: 'zuò', icon: '🏔️', use: 'Dùng cho công trình kiến trúc lớn, ngọn núi hùng vĩ cố định',
            examples: [
                { zh: '一座山', py: 'yī zuò shān', vi: 'Một ngọn núi' },
                { zh: '一座大殿', py: 'yī zuò dàdiàn', vi: 'Một toà đại điện' },
                { zh: '一座城', py: 'yī zuò chéng', vi: 'Một toà thành' }
            ]
        },
        {
            word: '个', py: 'gè', icon: '👤', use: 'Lượng từ vạn năng phổ biến nhất, dùng cho người, vật chung chung',
            examples: [
                { zh: '一个人', py: 'yī gè rén', vi: 'Một người' },
                { zh: '一个字', py: 'yī gè zì', vi: 'Một chữ Hán' },
                { zh: '一个朋友', py: 'yī gè péngyou', vi: 'Một người bạn' }
            ]
        }
    ];

    // 5. MA TRẬN ÂM TIẾT PINYIN (Đại La Âm Trận)
    HZ_TOOLS.INITIALS = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'];
    HZ_TOOLS.FINALS = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong'];

    root.HZ_TOOLS = HZ_TOOLS;

})(typeof globalThis !== 'undefined' ? globalThis : this);
