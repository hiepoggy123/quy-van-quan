// Quy Vân Quán — nội dung: khách, cảnh hội thoại, trà, cá, truyện khách đêm và lưu niệm.
// Lời thoại tiếng Trung dùng chủ yếu chữ của các cuộn đầu; chữ chưa học tự hiện âm Hán Việt.
// "字{âm}" ghi âm riêng cho chữ đa âm ở đúng chỗ đó (观{quán} là đạo quán, không phải "quan" = xem);
// âm ghi riêng phải là một âm bộ chữ nhận cho chữ đó (tests/quy-van-story.test.mjs kiểm).
// Mỗi chữ Hán ở đây, kể cả trong ghi chú, phải có trong bộ chữ: tools/quy-van/build-deck.mjs quét
// cả file này khi dựng.
//
// Cảnh: { id, where: nơi ('hub', 'tea', 'pond', 'library', 'study'…), guest, when: điều kiện
//         (QuyVanCore.meets), tale: id truyện (chỉ cảnh khách đêm), steps, then: hiệu quả }.
//         Đợt F: manual: true là cảnh không tự mở (QuyVanCore.nextScene bỏ qua), app mở từ panel; cảnh thư có
//         letter: id khách gửi thư, trang sách có book: id lưu niệm và page: số trang.
// Bước: { say: id khách | 'note', zh, vi } · { choose: [{ zh, vi, ok, reply: { zh, vi } }] }
//       · { serve: { kind: 'tea' | 'fish', want, count, options }, ask, wrong: { zh, vi } }
//       · { spot: { line, at, right }, ask, vi }: chạm vào chữ bị tráo (line[at]), chữ đúng là right;
//         dòng spot không ghi {âm} vì app lấy chữ sai theo vị trí ký tự.
//       · { cook: id món, ask }: nấu món ngay trong cảnh (chọn nguyên liệu, đọc tên món).
//       · { read: { line, vi }, ask }: đọc từng chữ của một dòng (gõ âm Hán Việt, không đếm giờ).
//       · { reveal: { tell, note }, ask }: chạm vào chi tiết lệch trên chân dung; tell là id vùng trong
//         QuyVanWorld.REVEAL_ZONES[khách]. Chạm trúng thì khách hiện hình thật, note giải thích.
//       · { say: id khách, zh, vi, song: true }: lời hát, nút Nghe đọc chậm hơn.
//       · { say: 'note', yi: true, zh, vi }: lời bình của Dị Sử Thị, bước cuối của cảnh cuối truyện
//         (zh trùng tale.yi.zh).
//       · { charm: { line, vi, seconds }, ask, hit: { vi }, miss: { vi } }: viết bùa, đọc từng chữ như bước read
//         nhưng có đồng hồ; kịp thì hiện hit.vi, hết giờ thì hiện miss.vi. Cả hai nhánh đi tiếp, không mất gì.
//       · { letter: { from: id khách, lines: [{ zh, vi }] }, ask }: xem một bức thư, chỉ có nút Tiếp; zh ghi {âm} như
//         lời thoại.
//       · { pay: { cost, vi }, ask }: trả cost linh khí (QuyVanCore.spendLk) để mua giấy mực; thiếu thì chưa đi tiếp.
// then: { flag, lk, friend, moveIn, bag: { id cá: số con } (tặng cá vào giỏ), learn: cuộn chữ của cảnh (khách quen
//       chương 2 cũng có) }; cảnh cuối của truyện thêm { tale, keepsake }.
// when.ram: chỉ trong đêm rằm (cảnh Lão Quy mở đố đèn). when.after: { tale, days }: truyện đã xong từ days ngày trở lên
// (thư của khách cũ). Khách cũ ghé lại nằm trong visits, câu đố đêm rằm trong riddles (ở cuối file).
(function (root, data) {
    if (typeof module === 'object' && module.exports) { module.exports = data; }
    if (root) { root.QuyVanStory = data; }
}(typeof globalThis !== 'undefined' ? globalThis : this, {
    guests: {
        'lao-quy': { name: 'Tư Đồ Nam', zh: '司徒南', title: 'Khí linh Thiên Nghịch Châu · Đệ Nhất Ma Đầu' },
        'ho-nguyet': { name: 'Lý Mộ Uyển', zh: '李慕婉', title: 'Lạc Tinh Môn Đan Sư · Hồng nhan tri kỷ' },
        'tieu-mac': { name: 'Tôn Đại Trụ', zh: '孙大柱', title: 'Hằng Nhạc Phái Sư phụ' },
        'tieu-ly': { name: 'Đằng Lệ', zh: '藤厉', title: 'Đằng Gia Thiếu Chủ · Đối đầu tử thù' },
        // Khách đêm (Liêu Trai): chỉ đến khi trăng lên. sprite: tên sprite trong QuyVanWorld.SPRITES,
        // human là hình người, 'true' là hình thật sau bước reveal.
        'bach': { name: 'Bạch Thu Luyện', zh: '白秋练', title: 'Cô gái áo trắng bên hồ', night: true,
            sprite: { human: 'lady-white', 'true': 'fish-white' } },
        'ta': { name: 'Tiểu Tạ', zh: '小谢', title: 'Quỷ nữ nghịch ngợm', night: true,
            sprite: { human: 'girl-pale', 'true': 'girl-pale-ghost' } },
        'luc': { name: 'Lục Y Nữ', zh: '绿衣女', title: 'Cô gái áo xanh hát khẽ', night: true,
            sprite: { human: 'girl-green', 'true': 'bee' } },
        'wang': { name: 'Vương Lục Lang', zh: '王六郎', title: 'Chàng trai áo ướt bên cầu', night: true,
            sprite: { human: 'boy-blue', 'true': 'boy-ghost' } },
        'huapi': { name: 'Họa Bì', zh: '画皮', title: 'Cô gái áo đỏ gõ cổng', night: true,
            sprite: { human: 'lady-red', 'true': 'demon-green' } },
        'xiangyu': { name: 'Hương Ngọc', zh: '香玉', title: 'Cô gái áo trắng trong vườn', night: true,
            sprite: { human: 'girl-white', 'true': 'peony-white' } },
        'lianso': { name: 'Liên Tỏa', zh: '连琐', title: 'Cô gái ngâm nửa câu thơ', night: true,
            sprite: { human: 'girl-grey', 'true': 'girl-grey-ghost' } },
        'yan': { name: 'Nhan Như Ngọc', zh: '颜如玉', title: 'Cô gái bước ra từ trang sách', night: true,
            sprite: { human: 'lady-paper', 'true': 'paper-doll' } },
        // Đợt D (docs/plans/2026-10-14-quy-van-batch-d-design.md): mở theo độ phủ đọc 50 %, 60 %, 70 %.
        'laoshan': { name: 'Đạo sĩ Lao Sơn', zh: '崂山道士', title: 'Lão đạo sĩ áo vá dưới cổng', night: true,
            sprite: { human: 'taoist-old', 'true': 'crane' } },
        'huagu': { name: 'Hoa Cô Tử', zh: '花姑子', title: 'Cô gái hái thuốc dưới trăng', night: true,
            sprite: { human: 'girl-fawn', 'true': 'fawn' } },
        'xiaoqian': { name: 'Nhiếp Tiểu Thiến', zh: '聂小倩', title: 'Cô gái bên song cửa lúc canh ba', night: true,
            sprite: { human: 'lady-qian', 'true': 'lady-qian-ghost' } },
        'spring': { name: 'Tiểu Xuân', zh: '小春', title: 'Cô gái hoa cười bên rặng trúc', night: true,
            sprite: { human: 'girl-fawn', 'true': 'girl-fawn' } },
        // cameo: chỉ nói trong truyện đó (tale.cast), có chân dung, không có sprite và không có truyện riêng.
        // Trên bản đồ, Giáng Tuyết là cây trà hoa đỏ ở góc Vườn rau.
        'jiangxue': { name: 'Giáng Tuyết', zh: '绛雪', title: 'Cô gái áo đỏ thẫm, ít lời', cameo: 'xiangyu' },
        'wangsheng': { name: 'Vương Sinh', zh: '王生', title: 'Học trò bỏ núi về sớm', cameo: 'laoshan' }
    },

    // need: trà chỉ có khi đã có lưu niệm đó (keepsakes; QuyVanCore.teaList lọc).
    teas: [
        { id: '花茶', vi: 'trà hoa' },
        { id: '红茶', vi: 'hồng trà' },
        { id: '绿茶', vi: 'trà xanh (lục trà)' },
        { id: '白茶', vi: 'bạch trà' },
        { id: '蜜茶', vi: 'trà mật', need: 'mat' },
        { id: '药茶', vi: 'trà thảo dược', need: 'thuoc' }
    ],

    // size 1 cần 2 chữ, size 2 cần 3, size 3 cần 4 (QuyVanCore.RULES.fishNeed); cá lớn có sau khi sửa cầu.
    // need: chỉ câu được khi đã có lưu niệm đó; night: chỉ câu được ban đêm (QuyVanCore.rollFish lọc).
    fish: [
        { id: 'diec', zh: '鲫鱼', hv: 'tức ngư', vi: 'cá diếc', size: 1 },
        { id: 'vang', zh: '金鱼', hv: 'kim ngư', vi: 'cá vàng', size: 1, rare: true },
        { id: 'chep', zh: '鲤鱼', hv: 'lý ngư', vi: 'cá chép', size: 2 },
        { id: 'tram', zh: '草鱼', hv: 'thảo ngư', vi: 'cá trắm cỏ', size: 2 },
        { id: 'den', zh: '青鱼', hv: 'thanh ngư', vi: 'cá trắm đen', size: 3 },
        { id: 'que', zh: '鳜鱼', hv: 'quyết ngư', vi: 'cá quế', size: 3, rare: true },
        { id: 'bach', zh: '白鱼', hv: 'bạch ngư', vi: 'cá trắng', size: 2, rare: true, need: 'tho', night: true }
    ],

    // ---------- nhà bếp ----------
    // Món: hai chữ; chữ chỉ loại đứng trước chữ chỉ món (鱼汤 = cá + canh = canh cá). fish: số cá
    // lấy trong giỏ. Âm Hán Việt của món lấy từ bộ chữ, không ghi tay ở đây.
    dishes: [
        { id: 'yutang', zh: '鱼汤', vi: 'canh cá', fish: 1 },
        { id: 'caitang', zh: '菜汤', vi: 'canh rau' },
        { id: 'dantang', zh: '蛋汤', vi: 'canh trứng' },
        { id: 'mifan', zh: '米饭', vi: 'cơm trắng' },
        { id: 'chaofan', zh: '炒饭', vi: 'cơm rang' },
        { id: 'baizhou', zh: '白粥', vi: 'cháo trắng' },
        { id: 'yuzhou', zh: '鱼粥', vi: 'cháo cá', fish: 1 },
        { id: 'chaodan', zh: '炒蛋', vi: 'trứng xào' },
        { id: 'chaocai', zh: '炒菜', vi: 'rau xào' },
        { id: 'doufu', zh: '豆腐', vi: 'đậu phụ' }
    ],

    // Thẻ nguyên liệu trong bếp: nghĩa ngắn của từng chữ khi ghép món.
    pantry: {
        '鱼': 'cá', '汤': 'canh', '菜': 'rau', '蛋': 'trứng', '米': 'gạo', '饭': 'cơm', '炒': 'xào, rang',
        '白': 'trắng', '粥': 'cháo', '豆': 'đậu', '腐': 'phụ (đậu phụ)'
    },

    // Chữ trông giống nhau mà Tiểu Ly hay tráo (Tiểu Tạ thì viết nhầm); note giải thích chỗ khác.
    // Bước spot hiện note của cặp { right, wrong } trùng với chữ đúng và chữ sai của dòng.
    confuse: [
        { right: '白', wrong: '自', note: '白 bạch (trắng) bên trong có một nét ngang; 自 tự (tự mình) có hai.' },
        { right: '鱼', wrong: '鲁', note: '鱼 ngư (cá) dưới cùng là một nét ngang; 鲁 lỗ thì dưới cùng là chữ 日.' },
        { right: '汤', wrong: '扬', note: '汤 thang (canh) bên trái là ba chấm nước 氵; 扬 dương (giương lên) bên trái là bộ tay 扌.' },
        { right: '饭', wrong: '饮', note: '饭 phạn (cơm) bên phải là 反; 饮 ẩm (uống) bên phải là 欠.' },
        { right: '菜', wrong: '采', note: '菜 thái (rau) có bộ cỏ 艹 trên đầu; 采 thái (hái) thì không có. Đọc giống nhau, nghĩa khác hẳn.' },
        { right: '炒', wrong: '抄', note: '炒 sao (xào) có bộ lửa 火; 抄 sao (chép) có bộ tay 扌. Đọc giống nhau, nghĩa khác hẳn.' },
        { right: '米', wrong: '来', note: '来 lai (đến) có thêm một nét ngang trên đầu; 米 mễ (gạo) thì không.' },
        { right: '腐', wrong: '府', note: '腐 hủ (trong 豆腐 đậu phụ) có chữ 肉 (thịt) ở dưới; 府 phủ (dinh phủ) thì không.' },
        { right: '茶', wrong: '荼', note: '荼 đồ (rau đắng, hoa lau) nhiều hơn 茶 trà một nét ngang ở giữa.' },
        { right: '妖', wrong: '夭', note: '妖 yêu (yêu quái) có bộ nữ 女 bên trái; 夭 yểu (chết non) thì không có.' },
        { right: '大', wrong: '犬', note: '犬 khuyển (chó) là chữ 大 đại thêm một chấm ở góc trên bên phải.' },
        { right: '字', wrong: '子', note: '字 tự (chữ) có mái nhà trên đầu; 子 tử (con) thì không có.' },
        { right: '归', wrong: '龟', note: '归 quy (trở về) và 龟 quy (con rùa) đọc giống nhau nhưng khác hình: 龟 có cái mai rùa ở giữa, 归 thì không.' },
        { right: '人', wrong: '入', note: '人 nhân (người) nét phẩy bên trái cao hơn; 入 nhập (đi vào) nét mác bên phải cao hơn.' },
        { right: '日', wrong: '目', note: '日 nhật (mặt trời, ngày) bên trong có một nét ngang; 目 mục (con mắt) có hai nét ngang.' },
        { right: '木', wrong: '本', note: '本 bản (gốc, quyển) là chữ 木 mộc (cây) có thêm một nét ngang đánh dấu gốc cây ở dưới.' },
        { right: '天', wrong: '夫', note: '夫 phu (người đàn ông, chồng) có nét phẩy xuyên qua nét ngang trên cùng; 天 thiên (trời) thì không.' },
        { right: '王', wrong: '玉', note: '玉 ngọc có thêm một chấm ở góc dưới bên phải so với chữ 王 vương (vua).' },
        { right: '水', wrong: '永', note: '永 vĩnh (lâu dài) giống chữ 水 thủy (nước) nhưng có thêm một chấm trên đầu.' },
        { right: '手', wrong: '毛', note: '手 thủ (bàn tay) nét móc cong sang trái; 毛 mao (lông) nét dưới cùng vòng rộng sang phải.' },
        { right: '午', wrong: '牛', note: '牛 ngưu (trâu, bò) có nét sổ xuyên qua nét ngang trên; 午 ngọ (buổi trưa) thì không xuyên qua.' },
        { right: '千', wrong: '干', note: '千 thiên (nghìn) trên cùng là nét phẩy nghiêng; 干 cán (làm; khô) trên cùng là nét ngang phẳng.' },
        { right: '己', wrong: '已', note: '己 kỷ (tự mình) miệng bên trái mở hoàn toàn; 已 dĩ (đã) nét sổ bên trái nhô lên một nửa.' },
        { right: '土', wrong: '士', note: '土 thổ (đất) nét ngang dưới dài hơn nét trên; 士 sĩ (kẻ sĩ) nét ngang trên dài hơn nét dưới.' },
        { right: '买', wrong: '卖', note: '卖 mại (bán) có thêm chữ 十 trên đầu chữ 买 mãi (mua).' },
        { right: '问', wrong: '间', note: '问 vấn (hỏi) trong cổng 门 là cái miệng 口; 间 gian (ở giữa) trong cổng 门 là mặt trời 日.' },
        { right: '请', wrong: '清', note: '请 thỉnh (mời, xin) bên trái là bộ ngôn (lời nói); 清 thanh (trong sạch) bên trái là ba chấm nước 氵.' },
        { right: '话', wrong: '活', note: '话 thoại (lời nói) bên trái là bộ ngôn; 活 hoạt (sống) bên trái là ba chấm nước 氵.' },
        { right: '住', wrong: '往', note: '住 trú (ở) bên trái là một nét phẩy một nét sổ; 往 vãng (đi tới) bên trái có hai nét phẩy chồng nhau.' },
        // Đợt E: bước spot của Tiểu Ly (失/夫) và Tiểu Tạ ghé lại (今/令).
        { right: '失', wrong: '夫', note: '失 thất (mất) có thêm nét phẩy nhỏ chéo trên đầu bên trái; 夫 phu (chồng) thì không.' },
        { right: '今', wrong: '令', note: '今 kim (nay) dưới cùng là một nét ngang gập ngắn; 令 lệnh (ra lệnh) dưới cùng có thêm nét sổ thẳng xuống.' },
        // Đợt F: thư của Tiểu Tạ (鸟/乌; thư thứ hai dùng cặp 买/卖 có sẵn).
        { right: '鸟', wrong: '乌', note: '鸟 điểu (con chim) có một chấm là con mắt; 乌 ô (con quạ) thiếu chấm ấy: quạ đen tuyền nên không thấy mắt.' }
    ],

    // Lời gọi món mỗi ngày: {v} = 喝 (canh, cháo) hoặc 吃; {d} = tên món; {dv} = tên món tiếng Việt.
    // likes: món khách hay gọi (Hồ Tiểu Nguyệt ăn thanh đạm, Tiểu Mặc mê cá, Tiểu Ly thích đồ xào).
    orders: {
        'ho-nguyet': {
            likes: ['caitang', 'baizhou', 'doufu', 'dantang'],
            ask: { zh: '今天我想{v}{d}。', vi: 'Hôm nay ta muốn ăn {dv}.' },
            thanks: [{ zh: '好香！谢谢你。', vi: 'Thơm quá! Cảm ơn cậu.' }, { zh: '真好吃，明天我还来。', vi: 'Ngon thật, mai ta lại đến.' }]
        },
        'tieu-mac': {
            likes: ['yutang', 'yuzhou'],
            ask: { zh: '喵！我要{v}{d}！', vi: 'Meo! Ta muốn ăn {dv}!' },
            thanks: [{ zh: '好吃！好吃！', vi: 'Ngon! Ngon!' }, { zh: '喵，我吃饱了。', vi: 'Meo, ta no rồi.' }]
        },
        'tieu-ly': {
            swap: true,
            likes: ['chaofan', 'chaodan', 'chaocai', 'mifan'],
            ask: { zh: '嘿嘿，给我做{d}吧。', vi: 'Hê hê, làm {dv} cho ta đi.' },
            thanks: [{ zh: '嘿嘿，好吃！', vi: 'Hê hê, ngon!' }, { zh: '你的字对了，菜也对了。', vi: 'Chữ của ngươi đúng, món cũng đúng.' }]
        }
    },

    scenes: [
        {
            id: 'intro', where: 'hub', guest: 'lao-quy',
            steps: [
                { say: 'note', vi: 'Bạn trở về Quy Vân Quán trên núi sau nhiều năm. Cổng đổ, sân đầy lá khô. Dưới hồ sen có ai đó hắng giọng.' },
                { say: 'lao-quy', zh: '你回来了。', vi: 'Cháu về rồi đấy à.' },
                { say: 'lao-quy', zh: '我是老龟。我在这个水里住了三百年。', vi: 'Ta là Lão Quy. Ta sống dưới hồ nước này ba trăm năm rồi.' },
                { say: 'lao-quy', zh: '这里是归云观{quán}。你的爷爷，是这里的主人。', vi: 'Đây là Quy Vân Quán. Ông cháu là chủ nơi này.' },
                { say: 'lao-quy', zh: '他走了以后，客人们就不来了。', vi: 'Từ khi ông đi, khách không đến nữa.' },
                { say: 'lao-quy', zh: '来这里喝茶的客人……不是人，是山里的妖。', vi: 'Khách đến đây uống trà… không phải người, mà là yêu quái trong núi.' },
                { say: 'lao-quy', zh: '妖说的话，你看得懂吗？', vi: 'Lời yêu quái nói, cháu có hiểu không?' },
                {
                    choose: [
                        { zh: '看不懂。', vi: 'Chưa hiểu ạ, cháu là người mới bắt đầu.', ok: true,
                            reply: { zh: '哈哈，不急！我们从最简单的字慢慢学起。', vi: 'Ha ha, không vội! Chúng ta cứ học dần từ những chữ đơn giản nhất.' } },
                        { zh: '看得懂一点。', vi: 'Cháu hiểu một chút ạ.', ok: true,
                            reply: { zh: '很好！去书房看看吧，有很多字等你学呢。', vi: 'Rất tốt! Vào thư phòng xem đi, có nhiều chữ đang đợi cháu học đấy.' } }
                    ]
                },
                { say: 'lao-quy', zh: '不懂没关系。先去书房学字吧。', vi: 'Không hiểu cũng không sao. Trước hết vào thư phòng học chữ đi.' },
                { say: 'note', vi: 'Mở Thư trai và học cuộn chữ đầu tiên.' }
            ],
            then: { flag: 'intro' }
        },
        {
            id: 'quy-scroll1', where: 'hub', guest: 'lao-quy', when: { flag: 'intro', scrolls: 1 },
            steps: [
                { say: 'lao-quy', zh: '好！人、大、小、山、水，你都会读了。', vi: 'Tốt! Nhân, đại, tiểu, sơn, thủy, cháu đều đọc được rồi.' },
                { say: 'note', vi: 'Chữ bạn đã học không còn hiện âm Hán Việt ở trên. Quên thì chạm vào chữ.' },
                { say: 'lao-quy', zh: '去水边钓鱼吧。鱼会帮你记字。', vi: 'Ra bờ nước câu cá đi. Cá sẽ giúp cháu nhớ chữ.' },
                { say: 'note', vi: 'Ở Hồ sen, mỗi con cá mang một chữ. Gõ âm Hán Việt của chữ để kéo cá vào. Gõ không dấu cũng được.' },
                { say: 'lao-quy', zh: '还有，门上的字要挂好。你有十点灵气，就能修了。', vi: 'Còn nữa, tấm biển trên cửa quán trà phải treo lại. Có mười điểm linh khí là sửa được.' }
            ],
            then: { flag: 'quy-s1' }
        },
        {
            id: 'quy-sign', where: 'hub', guest: 'lao-quy', when: { flag: 'quy-s1', repair: 'san' },
            steps: [
                { say: 'note', vi: 'Tấm biển gỗ được treo lại trên cửa quán trà. Bạn lau sạch bụi, ba chữ hiện ra.' },
                { say: 'lao-quy', zh: '妖客来。', vi: 'Yêu Khách Lai: yêu quái đến làm khách.' },
                { say: 'lao-quy', zh: '门开了，客人会来的。', vi: 'Quán mở cửa rồi, khách sẽ đến thôi.' },
                { say: 'lao-quy', zh: '对了，“归云观{quán}”的“归”，不是我“龟”！', vi: 'À phải, chữ “quy” trong Quy Vân Quán là 归 (trở về), không phải 龟 (con rùa) của ta đâu!' },
                { say: 'lao-quy', zh: '很多人都读错。哈哈。', vi: 'Nhiều người đọc nhầm lắm. Ha ha.' }
            ],
            then: { flag: 'quy-sign' }
        },
        {
            id: 'nguyet-1', where: 'tea', guest: 'ho-nguyet', when: { repair: 'san' },
            steps: [
                { say: 'note', vi: 'Một cô hồ ly nhỏ ghé vào quán, đuôi còn đọng sương đêm.' },
                { say: 'ho-nguyet', zh: '你好！这里有茶吗？', vi: 'Chào cậu! Ở đây có trà không?' },
                {
                    choose: [
                        { zh: '有，请坐。', vi: 'Có, mời ngồi.', ok: true },
                        { zh: '没有。', vi: 'Không có.', ok: false,
                            reply: { zh: '没有茶？那我去山上喝风好了……', vi: 'Không có trà? Vậy ta lên núi uống gió vậy…' } },
                        { zh: '我是猫。', vi: 'Tôi là mèo.', ok: false,
                            reply: { zh: '你是猫？我看你是人。', vi: 'Cậu là mèo? Ta thấy cậu là người mà.' } }
                    ]
                },
                { say: 'ho-nguyet', zh: '我叫胡小月。我想喝花茶。', vi: 'Ta tên Hồ Tiểu Nguyệt. Ta muốn uống trà hoa.' },
                {
                    serve: { kind: 'tea', want: '花茶', options: ['红茶', '花茶', '绿茶'] },
                    ask: 'Chọn đúng hũ trà khách gọi.',
                    wrong: { zh: '这个……不是花茶吧？', vi: 'Cái này… không phải trà hoa đâu nhỉ?' }
                },
                { say: 'ho-nguyet', zh: '好香！谢谢你。', vi: 'Thơm quá! Cảm ơn cậu.' },
                { say: 'ho-nguyet', zh: '月亮出来了，我要回山里了。', vi: 'Trăng lên rồi, ta phải về núi đây.' },
                { say: 'ho-nguyet', zh: '明天，我还来。', vi: 'Mai ta lại đến.' }
            ],
            then: { flag: 'nguyet-1', friend: 'ho-nguyet', lk: 5 }
        },
        {
            id: 'mac-1', where: 'tea', guest: 'tieu-mac', when: { repair: 'san', caught: 1 },
            steps: [
                { say: 'note', vi: 'Một con mèo đen tròn lẳn nhảy lên bàn trà, mắt dán vào giỏ cá của bạn.' },
                { say: 'tieu-mac', zh: '喵。我是小墨。', vi: 'Meo. Ta là Tiểu Mặc.' },
                { say: 'tieu-mac', zh: '我在书房里住了很多年。', vi: 'Ta sống trong thư phòng nhiều năm rồi.' },
                { say: 'tieu-mac', zh: '我饿了。你有鱼吗？', vi: 'Ta đói rồi. Ngươi có cá không?' },
                {
                    serve: { kind: 'fish', want: '*', count: 1 },
                    ask: 'Đưa cho Tiểu Mặc một con cá bất kỳ.',
                    empty: 'Giỏ cá đang trống. Ra Hồ sen câu một con rồi quay lại.'
                },
                { say: 'tieu-mac', zh: '好吃！好吃！', vi: 'Ngon! Ngon!' },
                { say: 'tieu-mac', zh: '明天，我还要。', vi: 'Mai ta lại muốn nữa.' }
            ],
            then: { flag: 'mac-1', friend: 'tieu-mac', lk: 5 }
        },
        {
            id: 'quy-kitchen', where: 'hub', guest: 'lao-quy', when: { flag: ['nguyet-1', 'mac-1'] },
            steps: [
                { say: 'lao-quy', zh: '客人们来了，也会饿的。', vi: 'Khách đến rồi thì cũng sẽ đói.' },
                { say: 'lao-quy', zh: '厨房的火，我给你生好了。', vi: 'Lửa trong bếp, ta nhóm sẵn cho cháu rồi.' },
                { say: 'lao-quy', zh: '先说鱼，再说汤，就是鱼汤。', vi: 'Nói "cá" trước, rồi nói "canh", ấy là 鱼汤 (canh cá).' },
                { say: 'note', vi: 'Tiếng Việt nói "canh cá", tiếng Trung nói 鱼汤: chữ chỉ loại (cá) đứng trước chữ chỉ món (canh).' },
                { say: 'note', vi: 'Từ nay mỗi ngày khách quen ghé gọi món. Vào Nhà bếp, chọn nguyên liệu theo đúng thứ tự rồi đọc tên món.' }
            ],
            then: { flag: 'kitchen' }
        },
        {
            id: 'ly-1', where: 'tea', guest: 'tieu-ly', when: { flag: 'kitchen', cooked: 1 },
            steps: [
                { say: 'note', vi: 'Có ai đó đã sửa nhãn trên một hũ trà. Dưới gầm bàn thò ra một cái đuôi khoang.' },
                { say: 'tieu-ly', zh: '嘿嘿，我是小狸。', vi: 'Hê hê, ta là Tiểu Ly.' },
                { say: 'tieu-ly', zh: '我改了茶上的一个字。你看，哪个字不对？', vi: 'Ta đã sửa một chữ trên hũ trà. Ngươi xem, chữ nào sai?' },
                { spot: { line: '红荼', at: 1, right: '茶' }, ask: 'Chạm vào chữ Tiểu Ly đã tráo.', vi: 'Nhãn đúng là 红茶 (hồng trà).' },
                { say: 'tieu-ly', zh: '被你看出来了！', vi: 'Bị ngươi nhìn ra rồi!' },
                { say: 'tieu-ly', zh: '好，我们做朋友吧。', vi: 'Được, chúng ta làm bạn nhé.' }
            ],
            then: { flag: 'ly-1', friend: 'tieu-ly', lk: 5 }
        },
        {
            id: 'nguyet-2', where: 'tea', guest: 'ho-nguyet', when: { flag: 'nguyet-1', scrolls: 4 },
            steps: [
                { say: 'ho-nguyet', zh: '我又来了！', vi: 'Ta lại đến rồi!' },
                { say: 'ho-nguyet', zh: '今天我想喝绿茶。', vi: 'Hôm nay ta muốn uống trà xanh.' },
                {
                    serve: { kind: 'tea', want: '绿茶', options: ['白茶', '绿茶', '红茶'] },
                    ask: 'Chọn đúng hũ trà khách gọi.',
                    wrong: { zh: '不对不对，我要绿茶。', vi: 'Không phải, không phải, ta muốn trà xanh.' }
                },
                { say: 'ho-nguyet', zh: '你看，天上的云，像不像一条鱼？', vi: 'Cậu xem, mây trên trời có giống một con cá không?' },
                {
                    choose: [
                        { zh: '像！', vi: 'Giống!', ok: true,
                            reply: { zh: '是吧！我也这么想。', vi: 'Phải không! Ta cũng nghĩ thế.' } },
                        { zh: '不像，像一只{chích}猫。', vi: 'Không giống, giống một con mèo.', ok: true,
                            reply: { zh: '猫？那我们不要告诉小墨。', vi: 'Mèo à? Vậy đừng kể cho Tiểu Mặc nghe.' } },
                        { zh: '天上没有云。', vi: 'Trên trời không có mây.', ok: false,
                            reply: { zh: '你看错了吧？', vi: 'Cậu nhìn nhầm rồi chăng?' } }
                    ]
                },
                { say: 'ho-nguyet', zh: '我很喜欢这里。', vi: 'Ta rất thích nơi này.' }
            ],
            then: { flag: 'nguyet-2', friend: 'ho-nguyet', lk: 5 }
        },
        {
            id: 'mac-2', where: 'tea', guest: 'tieu-mac', when: { flag: 'mac-1', scrolls: 6 },
            steps: [
                { say: 'tieu-mac', zh: '喵！今天我想吃鲤鱼。', vi: 'Meo! Hôm nay ta muốn ăn cá chép.' },
                {
                    serve: { kind: 'fish', want: 'chep', count: 1 },
                    ask: 'Tìm trong giỏ đúng con cá Tiểu Mặc muốn.',
                    empty: 'Giỏ chưa có con cá này. Ra Hồ sen câu thêm rồi quay lại.',
                    wrong: { zh: '这不是鲤鱼！', vi: 'Đây không phải cá chép!' }
                },
                { say: 'tieu-mac', zh: '鲤鱼跳龙门……我不跳，我吃。', vi: 'Cá chép vượt Long Môn… ta không vượt, ta ăn.' }
            ],
            then: { flag: 'mac-2', friend: 'tieu-mac', lk: 5 }
        },
        {
            id: 'ly-2', where: 'tea', guest: 'tieu-ly', when: { flag: 'ly-1', scrolls: 7 },
            steps: [
                { say: 'tieu-ly', zh: '我饿了。', vi: 'Ta đói rồi.' },
                { spot: { line: '我想喝自粥。', at: 3, right: '白' }, ask: 'Tiểu Ly lại tráo một chữ. Chạm vào chữ đó.', vi: 'Ta muốn ăn cháo trắng.' },
                { say: 'tieu-ly', zh: '对，是白粥。你会做吗？', vi: 'Đúng, là 白粥 (cháo trắng). Ngươi nấu được không?' },
                { cook: 'baizhou', ask: 'Nấu 白粥 cho Tiểu Ly.' },
                { say: 'tieu-ly', zh: '好吃！你的字，比我的好。', vi: 'Ngon! Chữ của ngươi tốt hơn chữ của ta.' }
            ],
            then: { flag: 'ly-2', friend: 'tieu-ly', lk: 5 }
        },
        {
            id: 'quy-lantern', where: 'hub', guest: 'lao-quy', when: { repair: 'den' },
            steps: [
                { say: 'lao-quy', zh: '灯亮了。夜里的客人也看得见路了。', vi: 'Đèn sáng rồi. Khách đi đêm cũng thấy đường.' }
            ],
            then: { flag: 'quy-lantern' }
        },
        {
            id: 'nguyet-3', where: 'tea', guest: 'ho-nguyet', when: { flag: 'nguyet-2', repair: 'den' },
            steps: [
                { say: 'note', vi: 'Đèn lồng vừa được thắp. Hồ Tiểu Nguyệt đến sớm hơn mọi khi.' },
                { say: 'ho-nguyet', zh: '门上的灯，是你点的吗？', vi: 'Đèn trên cổng là cậu thắp à?' },
                {
                    choose: [
                        { zh: '是我。', vi: 'Là tôi.', ok: true },
                        { zh: '是老龟。', vi: 'Là Lão Quy.', ok: false,
                            reply: { zh: '老龟？他只会睡觉。', vi: 'Lão Quy à? Ông ấy chỉ biết ngủ thôi.' } }
                    ]
                },
                { say: 'ho-nguyet', zh: '今天喝红茶吧。', vi: 'Hôm nay uống hồng trà đi.' },
                {
                    serve: { kind: 'tea', want: '红茶', options: ['红茶', '花茶', '白茶'] },
                    ask: 'Chọn đúng hũ trà khách gọi.',
                    wrong: { zh: '这个是红茶吗？', vi: 'Cái này là hồng trà sao?' }
                },
                { say: 'ho-nguyet', zh: '我……可以住在这里吗？', vi: 'Ta… ở lại đây được không?' },
                {
                    choose: [
                        { zh: '可以！', vi: 'Được chứ!', ok: true },
                        { zh: '不可以。', vi: 'Không được.', ok: false,
                            reply: { zh: '呜……', vi: 'Hu…' } }
                    ]
                },
                { say: 'ho-nguyet', zh: '太好了！', vi: 'Tuyệt quá!' }
            ],
            then: { flag: 'nguyet-3', friend: 'ho-nguyet', moveIn: 'ho-nguyet', lk: 10 }
        },
        {
            id: 'ly-3', where: 'tea', guest: 'tieu-ly', when: { flag: 'ly-2', repair: 'den' },
            steps: [
                { say: 'note', vi: 'Đêm đó biển quán trà có thêm một vết mực mới. Tiểu Ly ngồi chờ dưới đèn lồng.' },
                { say: 'tieu-ly', zh: '你看门上的字。', vi: 'Ngươi xem chữ trên biển kìa.' },
                { spot: { line: '夭客来', at: 0, right: '妖' }, ask: 'Chạm vào chữ bị tráo trên biển.', vi: 'Biển đúng là 妖客来 (Yêu Khách Lai).' },
                { say: 'tieu-ly', zh: '哈哈，你又看出来了。', vi: 'Ha ha, ngươi lại nhìn ra rồi.' },
                { say: 'tieu-ly', zh: '这里有好吃的，还有你。我可以住下吗？', vi: 'Ở đây có đồ ăn ngon, lại có ngươi. Ta ở lại được không?' },
                {
                    choose: [
                        { zh: '好，你住下吧。', vi: 'Được, ở lại đi.', ok: true },
                        { zh: '不可以。', vi: 'Không được.', ok: false,
                            reply: { zh: '我会乖乖的……', vi: 'Ta sẽ ngoan mà…' } }
                    ]
                },
                { say: 'tieu-ly', zh: '太好了！不过，我还会写错字的，嘿嘿。', vi: 'Tuyệt quá! Có điều ta vẫn sẽ viết sai chữ đấy, hê hê.' }
            ],
            then: { flag: 'ly-3', friend: 'tieu-ly', moveIn: 'tieu-ly', lk: 10 }
        },
        {
            id: 'mac-3', where: 'tea', guest: 'tieu-mac', when: { flag: 'mac-2', repair: 'cau' },
            steps: [
                { say: 'tieu-mac', zh: '听说，水深的地方有大鱼。', vi: 'Nghe nói chỗ nước sâu có cá lớn.' },
                { say: 'tieu-mac', zh: '我要两条鱼！', vi: 'Ta muốn hai con cá!' },
                {
                    serve: { kind: 'fish', want: '*', count: 2 },
                    ask: 'Đưa cho Tiểu Mặc hai con cá.',
                    empty: 'Giỏ chưa đủ hai con cá. Ra Hồ sen câu thêm rồi quay lại.'
                },
                { say: 'tieu-mac', zh: '你是好人。我也住在这里吧，书房我熟。', vi: 'Ngươi là người tốt. Ta cũng ở lại đây nhé, thư phòng ta rành lắm.' }
            ],
            then: { flag: 'mac-3', friend: 'tieu-mac', moveIn: 'tieu-mac', lk: 10 }
        },
        {
            id: 'quy-roof', where: 'hub', guest: 'lao-quy', when: { repair: 'mai' },
            steps: [
                { say: 'lao-quy', zh: '归云观{quán}，又是归云观{quán}了。', vi: 'Quy Vân Quán lại là Quy Vân Quán rồi.' },
                { say: 'lao-quy', zh: '你爷爷看见了，一定很高兴。', vi: 'Ông cháu mà thấy, nhất định rất vui.' }
            ],
            then: { flag: 'quy-roof' }
        },
        {
            id: 'quy-end', where: 'hub', guest: 'lao-quy', when: { flag: ['quy-roof', 'nguyet-3', 'mac-3', 'ly-3'] },
            steps: [
                { say: 'lao-quy', zh: '客人们都住下了。', vi: 'Khách đều ở lại cả rồi.' },
                { say: 'lao-quy', zh: '以后，还会有新的客人来。', vi: 'Sau này còn có khách mới đến nữa.' },
                { say: 'note', vi: 'Khách quen vẫn ghé gọi món mỗi ngày; bạn học thêm cuộn chữ, câu cá và ôn bài được. Đêm trăng, thỉnh thoảng có khách lạ ghé quán.' }
            ],
            then: { flag: 'quy-end' }
        },

        // ---------- khách đêm (Liêu Trai) ----------
        // Cảnh có tale chỉ mở trong đêm của truyện đó, mỗi đêm một cảnh (QuyVanCore.nextScene); cảnh
        // của một truyện đứng theo thứ tự đêm, trùng tale.scenes. Lựa chọn thử lòng: đáp án tử tế mới đi tiếp.

        // Bạch Thu Luyện: cá trắng ở hồ sen, ốm vì thiếu thơ. Hai câu 静夜思 thay bài thơ của nguyên tác.
        {
            id: 'bach-1', where: 'pond', tale: 'bach', guest: 'bach',
            steps: [
                { say: 'note', vi: 'Trăng lên. Bên hồ sen có một cô gái áo trắng ngồi quay lưng, tóc còn ướt.' },
                { say: 'bach', zh: '你天天在这里钓鱼。', vi: 'Ngươi ngày nào cũng câu cá ở đây.' },
                { say: 'bach', zh: '我不是来喝茶的。我病了。', vi: 'Ta không đến uống trà. Ta ốm rồi.' },
                {
                    choose: [
                        { zh: '你要吃药吗？', vi: 'Cô có cần thuốc không?', ok: true },
                        { zh: '你是谁？', vi: 'Cô là ai?', ok: true,
                            reply: { zh: '明天你就知道了。', vi: 'Mai ngươi sẽ biết.' } },
                        { zh: '我去叫老龟。', vi: 'Tôi đi gọi Lão Quy.', ok: false,
                            reply: { zh: '老龟睡了。', vi: 'Lão Quy ngủ rồi.' } }
                    ]
                },
                { say: 'bach', zh: '我不要药。我要听诗。', vi: 'Ta không cần thuốc. Ta muốn nghe thơ.' },
                { say: 'bach', zh: '你念一首诗，我就好了。', vi: 'Ngươi đọc một bài thơ, ta sẽ khỏi.' },
                { read: { line: '举头望明月', vi: 'Ngẩng đầu nhìn trăng sáng.' }, ask: 'Đọc từng chữ của câu thơ.' },
                { say: 'bach', zh: '好……再念一句。', vi: 'Hay… đọc thêm một câu.' },
                { read: { line: '低头思故乡', vi: 'Cúi đầu nhớ quê nhà.' }, ask: 'Đọc tiếp câu thứ hai.' },
                { say: 'bach', zh: '我的家，也在水里。', vi: 'Nhà ta cũng ở dưới nước.' },
                { say: 'note', vi: 'Cô gái đứng dậy. Vạt áo không rơi một giọt nước, nhưng mặt hồ gợn sóng.' },
                { say: 'bach', zh: '明天晚上，我再来。', vi: 'Tối mai ta lại đến.' }
            ],
            then: { flag: 'bach-1', lk: 5 }
        },
        {
            id: 'bach-2', where: 'pond', tale: 'bach', guest: 'bach',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai. Cô gái đã ngồi sẵn trên cầu, tay ôm một cuộn giấy.' },
                { say: 'bach', zh: '你念的诗，我记住了。', vi: 'Thơ ngươi đọc, ta nhớ cả rồi.' },
                { say: 'bach', zh: '我叫白秋练。', vi: 'Ta tên Bạch Thu Luyện.' },
                { say: 'bach', zh: '我不是人。你看得出来吗？', vi: 'Ta không phải người. Ngươi nhìn ra không?' },
                {
                    reveal: { tell: 'wrist', note: 'Cổ tay cô có mấy vảy bạc, ánh lên như vảy cá dưới trăng.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'bach', zh: '对，我是鱼。湖里的白鱼。', vi: 'Đúng, ta là cá. Cá trắng trong hồ.' },
                {
                    choose: [
                        { zh: '你回湖里去吧。', vi: 'Cô về hồ đi.', ok: true,
                            reply: { zh: '谢谢你。', vi: 'Cảm ơn ngươi.' } },
                        { zh: '你留下，我天天念诗。', vi: 'Cô ở lại đi, ngày nào tôi cũng đọc thơ.', ok: false,
                            reply: { zh: '我离开水，会死的。', vi: 'Ta rời nước thì sẽ chết.' } },
                        { zh: '我把你钓上来。', vi: 'Tôi câu cô lên.', ok: false,
                            reply: { zh: '……你不是好人。', vi: '… Ngươi không phải người tốt.' } }
                    ]
                },
                { say: 'bach', zh: '这个给你。', vi: 'Cái này cho ngươi.' },
                { say: 'note', vi: 'Cô đặt cuộn giấy vào tay bạn: hai câu thơ bạn vừa đọc, chép dưới đầu đề 静夜思.' },
                { say: 'note', vi: 'Cô gái bước xuống nước. Một con cá trắng lượn quanh cầu rồi lặn mất.' },
                { say: 'note', yi: true, zh: '诗可医心。', vi: 'Thơ có thể chữa lòng.' }
            ],
            then: { flag: 'bach-2', tale: 'bach', keepsake: 'tho', learn: ['诗', '念', '举', '望', '低', '思', '故', '乡', '秋', '练'], lk: 10 }
        },

        // Tiểu Tạ: quỷ nữ ở Tàng Kinh Các, xin học viết chữ. Người chơi dạy chữ, tức là ôn chữ.
        {
            id: 'ta-1', where: 'library', tale: 'ta', guest: 'ta',
            steps: [
                { say: 'note', vi: 'Trong Tàng Kinh Các có tiếng cười khúc khích. Một cuộn kinh rơi xuống sàn, trên đó có mấy chữ mực còn ướt.' },
                { say: 'ta', zh: '嘻嘻，是我写的。', vi: 'Hi hi, là ta viết đấy.' },
                { say: 'ta', zh: '我叫小谢。', vi: 'Ta tên Tiểu Tạ.' },
                { say: 'ta', zh: '我比你早来这里。', vi: 'Ta đến đây còn sớm hơn ngươi.' },
                { spot: { line: '犬人在山上', at: 0, right: '大' }, ask: 'Tiểu Tạ viết sai một chữ. Chạm vào chữ đó.', vi: 'Dòng đúng là 大人在山上 (người lớn ở trên núi).' },
                { say: 'ta', zh: '哈哈，你看出来了。', vi: 'Ha ha, ngươi nhìn ra rồi.' },
                { say: 'ta', zh: '我想学写字。你教我，好不好？', vi: 'Ta muốn học viết chữ. Ngươi dạy ta, được không?' },
                { say: 'ta', zh: '我有笔，没有纸。', vi: 'Ta có bút, không có giấy.' },
                {
                    choose: [
                        { zh: '好，我教你。', vi: 'Được, tôi dạy cô.', ok: true },
                        { zh: '鬼不用写字。', vi: 'Ma quỷ đâu cần viết chữ.', ok: false,
                            reply: { zh: '你怎么知道我是鬼？', vi: 'Sao ngươi biết ta là quỷ?' } },
                        { zh: '你太吵了。', vi: 'Cô ồn quá.', ok: false,
                            reply: { zh: '呜，我不吵了。', vi: 'Hu, ta không ồn nữa.' } }
                    ]
                },
                { read: { line: '我是小谢', vi: 'Ta là Tiểu Tạ.' }, ask: 'Bạn trải giấy ra bàn. Đọc to từng chữ để Tiểu Tạ viết theo.' },
                { say: 'note', vi: 'Tiểu Tạ cầm bút viết lại bốn chữ. Nét run, nhưng đúng.' },
                { say: 'ta', zh: '明天我写给你看！', vi: 'Mai ta viết cho ngươi xem!' }
            ],
            then: { flag: 'ta-1', lk: 5 }
        },
        {
            id: 'ta-2', where: 'library', tale: 'ta', guest: 'ta',
            steps: [
                { say: 'note', vi: 'Trên bàn có tờ giấy 我是小谢. Bên cạnh là một dòng mới.' },
                { spot: { line: '小谢会写子了', at: 4, right: '字' }, ask: 'Dòng mới có một chữ viết sai. Chạm vào chữ đó.', vi: 'Dòng đúng là 小谢会写字了 (Tiểu Tạ biết viết chữ rồi).' },
                { say: 'ta', zh: '又错了……', vi: 'Lại sai rồi…' },
                {
                    choose: [
                        { zh: '错了不怕，再写。', vi: 'Sai thì đừng sợ, viết lại đi.', ok: true,
                            reply: { zh: '好，我再写。', vi: 'Được, ta viết lại.' } },
                        { zh: '你真笨。', vi: 'Cô ngốc thật.', ok: false,
                            reply: { zh: '我不学了！', vi: 'Ta không học nữa!' } }
                    ]
                },
                { read: { line: '小谢会写字了', vi: 'Tiểu Tạ biết viết chữ rồi.' }, ask: 'Tiểu Tạ viết lại. Đọc dòng mới của cô.' },
                {
                    reveal: { tell: 'shadow', note: 'Ngọn đèn chiếu thẳng vào cô, nhưng dưới chân không có bóng.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'ta', zh: '对，我是鬼。你怕吗？', vi: 'Đúng, ta là quỷ. Ngươi sợ không?' },
                {
                    choose: [
                        { zh: '不怕。你是我的学生。', vi: 'Không sợ. Cô là học trò của tôi.', ok: true,
                            reply: { zh: '嘻嘻。', vi: 'Hi hi.' } },
                        { zh: '有一点怕。', vi: 'Hơi sợ một chút.', ok: true,
                            reply: { zh: '我也有一点怕你。', vi: 'Ta cũng hơi sợ ngươi.' } },
                        { zh: '怕！', vi: 'Sợ!', ok: false,
                            reply: { zh: '那我走了……', vi: 'Vậy ta đi đây…' } }
                    ]
                },
                { say: 'ta', zh: '我的笔给你。', vi: 'Bút của ta, cho ngươi.' },
                { say: 'ta', zh: '我去找新的字。', vi: 'Ta đi tìm chữ mới.' },
                { say: 'note', vi: 'Tiểu Tạ đặt cây bút lên bàn rồi tan vào bóng kệ sách.' },
                { say: 'note', yi: true, zh: '鬼亦好{hiếu}学。', vi: 'Quỷ cũng ham học.' }
            ],
            then: { flag: 'ta-2', tale: 'ta', keepsake: 'but', learn: ['鬼', '写', '教', '学', '错', '怕', '笔', '纸', '亦', '会'], lk: 10 }
        },

        // Lục Y Nữ: con ong xanh hát bên cửa sổ Thư trai; được cứu khỏi mạng nhện thì viết chữ 谢 rồi bay đi.
        {
            id: 'luc-1', where: 'study', tale: 'luc', guest: 'luc',
            steps: [
                { say: 'note', vi: 'Đêm khuya trong Thư trai có tiếng hát nhỏ, mỏng như tơ. Một cô gái áo xanh lục đứng bên cửa sổ.' },
                { say: 'luc', zh: '你读书读到这么晚？', vi: 'Ngươi đọc sách đến muộn thế này?' },
                { say: 'luc', zh: '我唱歌给你听。', vi: 'Ta hát cho ngươi nghe.' },
                { say: 'luc', zh: '山里的风，水里的月。', vi: 'Gió trong núi, trăng trong nước.', song: true },
                { say: 'luc', zh: '风来了，月也来了。', vi: 'Gió đến rồi, trăng cũng đến rồi.', song: true },
                {
                    choose: [
                        { zh: '好听！', vi: 'Hay quá!', ok: true,
                            reply: { zh: '谢谢。', vi: 'Cảm ơn.' } },
                        { zh: '你是谁？', vi: 'Cô là ai?', ok: true,
                            reply: { zh: '我？我是唱歌的人。', vi: 'Ta ư? Ta là người hát.' } },
                        { zh: '太吵了，我要看书。', vi: 'Ồn quá, tôi còn phải đọc sách.', ok: false,
                            reply: { zh: '那我走了。', vi: 'Vậy ta đi đây.' } }
                    ]
                },
                { say: 'luc', zh: '我叫绿衣女。你看，我的衣服是绿的。', vi: 'Ta tên Lục Y Nữ. Ngươi xem, áo ta màu xanh lục.' },
                { say: 'luc', zh: '我很小，很小。', vi: 'Ta rất nhỏ, rất nhỏ.' },
                { say: 'note', vi: 'Cô gái ra cửa. Trên lưng áo có hai vệt mỏng như cánh.' }
            ],
            then: { flag: 'luc-1', lk: 5 }
        },
        {
            id: 'luc-2', where: 'study', tale: 'luc', guest: 'luc',
            steps: [
                { say: 'note', vi: 'Góc cửa sổ Thư trai có một mạng nhện. Trong mạng, một con ong xanh đang vùng vẫy.' },
                { say: 'luc', zh: '蛛网……救我……', vi: 'Mạng nhện… cứu ta…' },
                {
                    choose: [
                        { zh: '我救你！', vi: 'Tôi cứu cô!', ok: true },
                        { zh: '一只{chích}小虫，不管它。', vi: 'Một con côn trùng nhỏ, kệ nó.', ok: false,
                            reply: { zh: '……救……我……', vi: '… Cứu… ta… (tiếng vo ve yếu dần)' } }
                    ]
                },
                { say: 'note', vi: 'Bạn gỡ con ong ra. Nó đậu lên nghiên mực, chấm chân vào mực, rồi bò trên bàn.' },
                { read: { line: '谢', vi: 'Cảm ơn.' }, ask: 'Con ong viết một chữ trên bàn. Đọc chữ đó.' },
                { say: 'note', vi: 'Đêm đó cô gái áo xanh đến lần cuối.' },
                { say: 'luc', zh: '谢谢你。我要回山里了。', vi: 'Cảm ơn ngươi. Ta phải về núi rồi.' },
                {
                    reveal: { tell: 'wings', note: 'Sau vai cô có hai vệt cánh mỏng, trong như tơ.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'luc', zh: '对，我是一只{chích}小蜂。', vi: 'Đúng, ta là một con ong nhỏ.' },
                { say: 'luc', zh: '这是蜜，放在你的茶里。', vi: 'Đây là mật, cho vào trà của ngươi.' },
                { say: 'note', vi: 'Con ong xanh bay ra cửa sổ. Sáng hôm sau trên bàn trà có một hũ mật nhỏ.' },
                { say: 'note', yi: true, zh: '小虫知恩。', vi: 'Côn trùng nhỏ bé cũng biết ơn.' }
            ],
            then: { flag: 'luc-2', tale: 'luc', keepsake: 'mat', learn: ['衣', '唱', '歌', '救', '蛛', '网', '蜜', '虫', '恩', '谢'], lk: 10 }
        },

        // Vương Lục Lang: ma chết đuối dưới sông chân núi, lên Hồ sen uống trà (nguyên tác là rượu), lùa cá đền ơn;
        // tha cho mẹ con người đàn bà rơi xuống sông nên được Trời cho làm Thổ Địa.
        {
            id: 'wang-1', where: 'pond', tale: 'wang', guest: 'wang',
            steps: [
                { say: 'note', vi: 'Trăng lên. Trên cầu Hồ sen có một chàng trai áo xanh ngồi thõng chân xuống nước. Ống quần ướt sũng.' },
                { say: 'wang', zh: '你也一个人钓鱼？', vi: 'Cậu cũng câu cá một mình à?' },
                { say: 'wang', zh: '我叫王六郎。我也天天在水边。', vi: 'Ta tên Vương Lục Lang. Ta cũng ngày ngày ở bên nước.' },
                { say: 'wang', zh: '你给我一杯茶，我给你几条鱼。', vi: 'Cậu cho ta một chén trà, ta cho cậu mấy con cá.' },
                {
                    serve: { kind: 'tea', want: '红茶', options: ['绿茶', '红茶', '花茶'] }, ask: 'Mời Lục Lang một chén trà.',
                    wrong: { zh: '不是这个。我想喝红茶。', vi: 'Không phải trà này. Ta muốn uống hồng trà.' }
                },
                { say: 'wang', zh: '好茶！你看，我的手一动，鱼就都来了。', vi: 'Trà ngon! Cậu xem, tay ta khẽ động là cá đến cả.' },
                { say: 'note', vi: 'Lục Lang thò tay xuống nước. Một đàn cá bơi tới chân cầu, nhảy cả vào giỏ của bạn.' },
                {
                    choose: [
                        { zh: '你为什么天天在水边？', vi: 'Sao ngày nào cậu cũng ở bên nước?', ok: true,
                            reply: { zh: '我在等一个人。', vi: 'Ta đang đợi một người.' } },
                        { zh: '你是鱼吗？', vi: 'Cậu là cá à?', ok: true,
                            reply: { zh: '哈哈，我不是鱼。', vi: 'Ha ha, ta không phải cá.' } },
                        { zh: '我想一个人钓鱼。', vi: 'Tôi muốn câu cá một mình.', ok: false,
                            reply: { zh: '好，我走。明天我还来。', vi: 'Được, ta đi. Mai ta lại đến.' } }
                    ]
                },
                { say: 'wang', zh: '明天晚上，我还来喝茶。', vi: 'Tối mai ta lại đến uống trà.' }
            ],
            then: { flag: 'wang-1', lk: 5, bag: { diec: 2, chep: 1 } }
        },
        {
            id: 'wang-2', where: 'pond', tale: 'wang', guest: 'wang',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai, Lục Lang đến muộn. Áo cậu ướt hơn hôm qua, nhưng mặt lại tươi.' },
                { say: 'wang', zh: '今天，我做了一件事。', vi: 'Hôm nay ta đã làm một việc.' },
                { say: 'wang', zh: '我死在山下的河里，已经很久了。', vi: 'Ta chết dưới con sông chân núi lâu lắm rồi.' },
                {
                    reveal: { tell: 'drip', note: 'Trời không mưa, nhưng tóc và vai áo cậu vẫn nhỏ nước tong tong.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'wang', zh: '对，我是水里的鬼。', vi: 'Phải, ta là ma dưới nước.' },
                { say: 'wang', zh: '水里的鬼，要有人来替，才可以走。', vi: 'Ma dưới nước phải có người đến thế chỗ thì mới được đi.' },
                { say: 'wang', zh: '今天，山下有一个女人带着孩子过河，掉进了水里。', vi: 'Hôm nay dưới núi có người đàn bà bế con qua sông, rơi xuống nước.' },
                { say: 'wang', zh: '我可以走了。可是，我救了她们。', vi: 'Ta đã có thể đi. Nhưng ta cứu hai mẹ con.' },
                {
                    choose: [
                        { zh: '你做得对。', vi: 'Cậu làm đúng.', ok: true,
                            reply: { zh: '这样就好。', vi: 'Thế là được rồi.' } },
                        { zh: '你为什么不走？', vi: 'Sao cậu không đi?', ok: true,
                            reply: { zh: '她们的家里，还有人在等。', vi: 'Ở nhà hai mẹ con vẫn còn người đợi.' } },
                        { zh: '你太笨了。', vi: 'Cậu ngốc quá.', ok: false,
                            reply: { zh: '……也许吧。', vi: '… Có lẽ vậy.' } }
                    ]
                },
                { say: 'note', vi: 'Mặt hồ bỗng sáng lên. Một luồng sáng vàng từ trên trời rơi xuống người Lục Lang.' },
                { say: 'wang', zh: '天让我做这里的土地神。', vi: 'Trời cho ta làm Thổ Địa ở đây.' },
                { say: 'wang', zh: '以后，我在湖边的小庙里。你来看我，带一杯茶。', vi: 'Từ nay ta ở miếu nhỏ bên hồ. Cậu đến thăm ta, mang theo một chén trà.' },
                { say: 'note', vi: 'Sáng hôm sau, bên Hồ sen có một miếu Thổ Địa nhỏ. Trước miếu đặt sẵn một chén trà.' },
                { say: 'note', yi: true, zh: '不忍之心，可以为神。', vi: 'Lòng không nỡ hại người có thể làm nên thần.' }
            ],
            then: { flag: 'wang-2', tale: 'wang', keepsake: 'mieu', learn: ['王', '已', '经', '着', '带', '让', '为', '之', '神', '手'], lk: 10 }
        },

        // Họa Bì: con yêu mặt xanh vẽ tấm da người đẹp để được người ta mời vào. Người chơi là chủ đạo quán
        // nên tự viết bùa; con yêu không hại ai, kết bằng bài học "đẹp ở lòng".
        {
            id: 'huapi-1', where: 'gate', tale: 'huapi', guest: 'huapi',
            steps: [
                { say: 'note', vi: 'Trăng mờ. Có tiếng gõ cổng Sơn môn. Ngoài cổng là một cô gái áo đỏ, đẹp như người trong tranh.' },
                { say: 'huapi', zh: '我走了一天的山路。可以让我进来吗？', vi: 'Ta đi đường núi cả ngày. Cho ta vào được không?' },
                { say: 'tieu-mac', zh: '喵呜！', vi: 'Meo gừ! (Tiểu Mặc dựng đứng lông.)' },
                {
                    choose: [
                        { zh: '进来吧，外面冷。', vi: 'Vào đi, ngoài trời lạnh.', ok: true,
                            reply: { zh: '你的心真好。', vi: 'Lòng ngươi tốt thật.' } },
                        { zh: '你从哪里来？', vi: 'Cô từ đâu đến?', ok: true,
                            reply: { zh: '山的那一面。', vi: 'Phía bên kia núi.' } },
                        { zh: '不行，你走吧。', vi: 'Không được, cô đi đi.', ok: false,
                            reply: { zh: '那我明天再来。', vi: 'Vậy mai ta lại đến.' } }
                    ]
                },
                { say: 'note', vi: 'Cô gái ngồi trong quán trà, cười rất đẹp. Tiểu Mặc nằm trên mái, mắt không rời cô.' },
                { say: 'huapi', zh: '你看我，美吗？', vi: 'Ngươi nhìn ta xem, có đẹp không?' },
                { say: 'huapi', zh: '你为什么不笑？', vi: 'Sao ngươi không cười?' },
                { say: 'tieu-mac', zh: '喵……我的眼睛没有错。', vi: 'Meo… mắt ta không nhìn nhầm đâu.' },
                { say: 'note', vi: 'Nửa đêm, đèn quán trà vẫn sáng. Qua giấy cửa sổ, một cái bóng cầm bút tô lên tấm da trải trên bàn.' }
            ],
            then: { flag: 'huapi-1', lk: 5 }
        },
        {
            id: 'huapi-2', where: 'gate', tale: 'huapi', guest: 'huapi',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai. Cô gái áo đỏ đứng chờ ở Sơn môn, mặt trắng hơn hôm qua.' },
                { say: 'huapi', zh: '你昨天晚上看见了吧？', vi: 'Tối qua ngươi thấy rồi phải không?' },
                {
                    reveal: { tell: 'seam', note: 'Ở mép cằm, lớp da cong lên như mép giấy. Bên dưới là một màu xanh lục.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'note', vi: 'Lớp da rơi xuống. Khuôn mặt thật màu xanh, răng nhọn như răng cưa. Nó bước về phía bạn!' },
                {
                    charm: { line: '急急如律令', vi: 'Mau mau theo lệnh!', seconds: 30 },
                    ask: 'Viết bùa trước khi nó tới! Gõ âm từng chữ.',
                    hit: { vi: 'Lá bùa sáng lên trên cổng. Con yêu khựng lại.' },
                    miss: { vi: 'Bạn viết không kịp. Tiểu Mặc nhảy xuống, xù lông gầm lên; con yêu giật mình lùi lại.' }
                },
                { say: 'huapi', zh: '不要……我不害人。', vi: 'Đừng… ta không hại người.' },
                { say: 'huapi', zh: '我的脸是绿色的。人人都怕我的脸。', vi: 'Mặt ta màu xanh. Ai cũng sợ mặt ta.' },
                { say: 'huapi', zh: '所以我画了一张美的皮。', vi: 'Nên ta vẽ một tấm da đẹp.' },
                {
                    choose: [
                        { zh: '你的脸不美，可是你没有害我。', vi: 'Mặt cô không đẹp, nhưng cô không hại tôi.', ok: true,
                            reply: { zh: '谢谢你。', vi: 'Cảm ơn ngươi.' } },
                        { zh: '美在心里，不在脸上。', vi: 'Đẹp ở trong lòng, không ở trên mặt.', ok: true,
                            reply: { zh: '你说的，我记住了。', vi: 'Lời ngươi nói, ta nhớ rồi.' } },
                        { zh: '快走！不然我再画一张符！', vi: 'Đi mau! Không thì tôi vẽ thêm một lá bùa!', ok: false,
                            reply: { zh: '……人都一样。', vi: '… Người nào cũng vậy.' } }
                    ]
                },
                { say: 'note', vi: 'Con yêu nhặt tấm da lên, cuộn lại như cuộn một bức tranh, rồi đi vào màn sương. Lá bùa vẫn dán trên cổng.' },
                { say: 'tieu-mac', zh: '喵，她走了。我的毛还没有下来。', vi: 'Meo, cô ta đi rồi. Lông ta vẫn còn dựng.' },
                { say: 'note', yi: true, zh: '美在心，不在皮。', vi: 'Đẹp ở lòng, không ở lớp da.' }
            ],
            then: { flag: 'huapi-2', tale: 'huapi', keepsake: 'phu', learn: ['画', '皮', '美', '脸', '眼', '笑', '张', '进', '面', '色'], lk: 10 }
        },

        // Hương Ngọc: tinh mẫu đơn trắng ở góc Vườn rau, đi cùng Giáng Tuyết (tinh trà hoa đỏ, chỉ nói, không có
        // truyện riêng). Gió lạnh thay cho người đào hoa của nguyên tác; 白牡丹 cũng là tên một loại bạch trà.
        {
            id: 'xiangyu-1', where: 'garden', tale: 'xiangyu', guest: 'xiangyu',
            steps: [
                { say: 'note', vi: 'Trăng lên. Vườn rau thoang thoảng mùi hoa, dù vườn chỉ có cải với bí. Một cô gái áo trắng cúi ngửi khóm mẫu đơn ở góc rào; sau lưng cô, một cô gái áo đỏ đứng im.' },
                { say: 'xiangyu', zh: '嘻，你看见我了。', vi: 'Hi, ngươi thấy ta rồi.' },
                { say: 'xiangyu', zh: '我叫香玉。我住在这个园子里。', vi: 'Ta tên Hương Ngọc. Ta sống trong khu vườn này.' },
                { say: 'xiangyu', zh: '她叫绛雪。她不爱说话。', vi: 'Cô ấy tên Giáng Tuyết. Cô ấy không thích nói chuyện.' },
                { say: 'jiangxue', zh: '夜里冷，你回去吧。', vi: 'Đêm lạnh, ngươi về đi.' },
                {
                    choose: [
                        { zh: '一起喝茶吧。', vi: 'Cùng uống trà nhé.', ok: true,
                            reply: { zh: '好啊！她也来。', vi: 'Hay quá! Cô ấy cũng đến.' } },
                        { zh: '你们是谁？', vi: 'Hai cô là ai?', ok: true,
                            reply: { zh: '我们是这里的老人。我们比你早来一百年。', vi: 'Bọn ta là người cũ ở đây. Bọn ta đến trước ngươi trăm năm.' } },
                        { zh: '这是我的园子。', vi: 'Đây là vườn của tôi.', ok: false,
                            reply: { zh: '你的？我们和这个园子一起长{trưởng}大的。', vi: 'Của ngươi? Bọn ta lớn lên cùng khu vườn này đấy.' } }
                    ]
                },
                {
                    serve: { kind: 'tea', want: '白茶', options: ['白茶', '红茶', '绿茶'] }, ask: 'Pha trà cho hai cô.',
                    wrong: { zh: '不是这个，我要白茶！', vi: 'Không phải trà này, ta muốn bạch trà!' }
                },
                { say: 'note', vi: 'Hai cô ngồi đến khuya. Hương Ngọc nói không ngớt; Giáng Tuyết chỉ cười một lần.' },
                { say: 'xiangyu', zh: '明天你来看花！', vi: 'Mai ngươi đến xem hoa nhé!' }
            ],
            then: { flag: 'xiangyu-1', lk: 5 }
        },
        {
            id: 'xiangyu-2', where: 'garden', tale: 'xiangyu', guest: 'xiangyu',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai, gió lạnh tràn xuống núi. Khóm mẫu đơn ở góc rào bị gió quật, lá rũ cả xuống.' },
                { say: 'xiangyu', zh: '好冷……我的根……我的叶子……', vi: 'Lạnh quá… rễ của ta… lá của ta…' },
                { say: 'jiangxue', zh: '她怕冷。我不怕。', vi: 'Cô ấy sợ lạnh. Ta thì không.' },
                {
                    choose: [
                        { zh: '我去拿一些土和水。', vi: 'Tôi đi lấy ít đất với nước.', ok: true,
                            reply: { zh: '……好。', vi: '… Được.' } },
                        { zh: '花死了，再种一些。', vi: 'Hoa chết thì trồng cây khác.', ok: false,
                            reply: { zh: '你不懂。', vi: 'Ngươi không hiểu.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn vun đất, ủ rơm quanh gốc. Trên cọc rào có tấm thẻ gỗ khắc tên hoa.' },
                { read: { line: '白牡丹', vi: 'Bạch mẫu đơn: hoa mẫu đơn trắng.' }, ask: 'Đọc tên khóm hoa trên thẻ gỗ.' },
                { say: 'xiangyu', zh: '你叫我的名字了。', vi: 'Ngươi gọi tên ta rồi.' },
                {
                    reveal: { tell: 'petal', note: 'Mái tóc cô thơm mùi mẫu đơn. Một cánh hoa trắng mọc ra từ chân tóc.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'xiangyu', zh: '对，我是这朵白花。', vi: 'Phải, ta là bông hoa trắng này.' },
                { say: 'xiangyu', zh: '她是那边的红花，雪天也开。', vi: 'Cô ấy là cây hoa đỏ đằng kia, trời tuyết cũng nở.' },
                { say: 'xiangyu', zh: '谢谢你。以后，你的茶里有花香。', vi: 'Cảm ơn ngươi. Từ nay trà của ngươi có hương hoa.' },
                { say: 'note', vi: 'Sáng hôm sau, mẫu đơn nở trắng góc vườn. Bên cạnh, cây trà hoa đỏ còn đọng sương.' },
                { say: 'note', yi: true, zh: '花知人心。', vi: 'Hoa cũng biết lòng người.' }
            ],
            then: { flag: 'xiangyu-2', tale: 'xiangyu', keepsake: 'hoa', learn: ['香', '玉', '雪', '她', '和', '冷', '起', '些', '叶', '根'], lk: 10 }
        },

        // Liên Tỏa: hồn ma cô gái chết năm mười bảy tuổi, hai mươi năm ngâm nửa câu đối ở Vọng Vân Đình mà không ai
        // đối (nguyên tác là nửa bài thơ). Dạy cách đối: từng chữ đối từng chữ; dòng đọc là hai vế đầu sách dạy đối
        // Lạp Ông đối vận (đời Thanh).
        {
            id: 'lianso-1', where: 'pavilion', tale: 'lianso', guest: 'lianso',
            steps: [
                { say: 'note', vi: 'Trăng lên. Trong Vọng Vân Đình có tiếng con gái ngâm một câu, ngâm đi ngâm lại, mà không bao giờ có câu sau.' },
                { say: 'lianso', zh: '东山月上……', vi: 'Trăng lên núi đông…', song: true },
                { say: 'lianso', zh: '东山月上，谁来对？', vi: 'Trăng lên núi đông, ai đến đối?' },
                {
                    choose: [
                        { zh: '西水风来', vi: 'Gió đến sông tây', ok: true },
                        { zh: '东水风来', vi: 'Gió đến sông đông', ok: false,
                            reply: { zh: '不对。对子要一个字对一个字。', vi: 'Không đúng. Câu đối phải chữ đối chữ.' } },
                        { zh: '西山月上', vi: 'Trăng lên núi tây', ok: false,
                            reply: { zh: '不对。对子要一个字对一个字。', vi: 'Không đúng. Câu đối phải chữ đối chữ.' } }
                    ]
                },
                { say: 'lianso', zh: '西水风来！对了，对了！', vi: 'Gió đến sông tây! Đúng rồi, đúng rồi!' },
                { say: 'note', vi: 'Một cô gái áo xám nhạt bước ra từ bóng cột đình. Cô cười, mà mắt đỏ hoe.' },
                { say: 'lianso', zh: '我叫连琐。二十年了，没有人对我的句子。', vi: 'Ta tên Liên Tỏa. Hai mươi năm rồi, không ai đối câu của ta.' },
                {
                    choose: [
                        { zh: '你是谁？', vi: 'Cô là ai?', ok: true,
                            reply: { zh: '我是写半句诗的人。', vi: 'Ta là người viết nửa câu thơ.' } },
                        { zh: '你为什么一个人在这里？', vi: 'Sao cô ở đây một mình?', ok: true,
                            reply: { zh: '在等对子的人。', vi: 'Đợi người đối câu.' } },
                        { zh: '太晚了，我要睡了。', vi: 'Muộn quá rồi, tôi đi ngủ đây.', ok: false,
                            reply: { zh: '……又是一个人走了。', vi: '… Lại một người bỏ đi.' } }
                    ]
                },
                { say: 'lianso', zh: '明天晚上，我们再来对。', vi: 'Tối mai chúng ta lại đối tiếp.' }
            ],
            then: { flag: 'lianso-1', lk: 5 }
        },
        {
            id: 'lianso-2', where: 'pavilion', tale: 'lianso', guest: 'lianso',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai, Liên Tỏa chờ sẵn. Trên bàn đá có giấy và bút.' },
                { read: { line: '天对地，雨对风', vi: 'Trời đối đất, mưa đối gió.' }, ask: 'Đọc theo Liên Tỏa hai vế đầu của sách dạy đối.' },
                { say: 'lianso', zh: '你来：黑对什么？', vi: 'Ngươi thử: "đen" đối chữ gì?' },
                {
                    choose: [
                        { zh: '白', vi: 'trắng', ok: true,
                            reply: { zh: '对！', vi: 'Đúng!' } },
                        { zh: '红', vi: 'đỏ', ok: false,
                            reply: { zh: '红是红，黑是黑，不是一对。', vi: 'Đỏ là đỏ, đen là đen, không thành một cặp.' } },
                        { zh: '青', vi: 'xanh', ok: false,
                            reply: { zh: '青是青，黑是黑，不是一对。', vi: 'Xanh là xanh, đen là đen, không thành một cặp.' } }
                    ]
                },
                {
                    reveal: { tell: 'sleeve', note: 'Ánh trăng xuyên qua tay áo cô, rọi cả xuống mặt bàn đá.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'lianso', zh: '对，我是鬼。我十七岁那年就死了。', vi: 'Phải, ta là ma. Năm mười bảy tuổi ta đã chết.' },
                { say: 'lianso', zh: '我的句子只有一半。你给了我另一半。', vi: 'Câu của ta chỉ có một nửa. Ngươi cho ta nửa kia.' },
                {
                    choose: [
                        { zh: '你可以常来这里。', vi: 'Cô cứ đến đây thường xuyên.', ok: true,
                            reply: { zh: '不了。有人对上了，我就可以走了。', vi: 'Thôi. Có người đối được rồi, ta có thể đi.' } },
                        { zh: '你走吧，别再来了。', vi: 'Cô đi đi, đừng đến nữa.', ok: false,
                            reply: { zh: '……好。', vi: '… Được.' } }
                    ]
                },
                { say: 'note', vi: 'Cô viết hai câu lên hai dải giấy đỏ, dán lên hai cột Vọng Vân Đình.' },
                { say: 'lianso', zh: '这一对，留给你。', vi: 'Câu đối này, để lại cho ngươi.' },
                { say: 'note', yi: true, zh: '知音难得。', vi: 'Tri âm khó tìm.' }
            ],
            then: { flag: 'lianso-2', tale: 'lianso', keepsake: 'doi', learn: ['连', '琐', '东', '西', '半', '黑', '别', '音', '难', '雨'], lk: 10 }
        },

        // Nhan Như Ngọc (Thư Si): hình người cắt giấy bước ra khỏi sách khi người chơi đã đọc nhiều (độ phủ ≥ 75 %).
        // Hai câu đọc là văn bản cổ: 书中自有颜如玉 (bài Khuyến học thi đời Tống) và 学而时习之 (câu đầu Luận Ngữ).
        {
            id: 'yan-1', where: 'library', tale: 'yan', guest: 'yan',
            steps: [
                { say: 'note', vi: 'Đêm khuya, Tàng Kinh Các sáng mờ. Một cuốn sách trên kệ tự mở ra; giữa trang có một hình người cắt bằng giấy.' },
                { read: { line: '书中自有颜如玉', vi: 'Trong sách tự có người đẹp như ngọc.' }, ask: 'Đọc câu thơ viết trên trang sách.' },
                { say: 'note', vi: 'Hình giấy rơi xuống sàn, đứng dậy thành một cô gái.' },
                { say: 'yan', zh: '你读了那么多字，我出来看看你。', vi: 'Ngươi đọc nhiều chữ như thế, ta ra xem mặt ngươi.' },
                { say: 'yan', zh: '我叫颜如玉。我在书里住了很多年。', vi: 'Ta tên Nhan Như Ngọc. Ta sống trong sách nhiều năm rồi.' },
                {
                    choose: [
                        { zh: '你是书里的人？', vi: 'Cô là người trong sách?', ok: true,
                            reply: { zh: '是，也不是。', vi: 'Phải, mà cũng không phải.' } },
                        { zh: '你是来考我的吗？', vi: 'Cô đến để khảo tôi à?', ok: true,
                            reply: { zh: '嘻，你怕考吗？', vi: 'Hi, ngươi sợ bị khảo à?' } },
                        { zh: '我不想读书了。', vi: 'Tôi không muốn đọc sách nữa.', ok: false,
                            reply: { zh: '那我回书里去了。', vi: 'Vậy ta về lại trong sách.' } }
                    ]
                },
                { say: 'yan', zh: '明天晚上，我考你一句。', vi: 'Tối mai ta khảo ngươi một câu.' }
            ],
            then: { flag: 'yan-1', lk: 5 }
        },
        {
            id: 'yan-2', where: 'library', tale: 'yan', guest: 'yan',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai, cô gái giấy ngồi trên chồng sách, đung đưa chân.' },
                { say: 'yan', zh: '读书，不是只看字。', vi: 'Đọc sách không phải chỉ nhìn chữ.' },
                { read: { line: '学而时习之', vi: 'Học rồi thường ôn lại.' }, ask: 'Đọc câu đầu sách Luận Ngữ.' },
                { say: 'yan', zh: '学了，还要常常温习。', vi: 'Học rồi còn phải thường xuyên ôn.' },
                {
                    reveal: { tell: 'fold', note: 'Vạt áo cô có nếp gấp thẳng tắp, như tờ giấy bị gấp đôi.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'yan', zh: '对，我是纸人。我从书里来。', vi: 'Phải, ta là người giấy. Ta từ trong sách ra.' },
                {
                    choose: [
                        { zh: '你回书里吧，我会常来看你。', vi: 'Cô về sách đi, tôi sẽ năng đến thăm.', ok: true,
                            reply: { zh: '好。别忘了温习。', vi: 'Được. Đừng quên ôn bài.' } },
                        { zh: '你留下，我不读书了。', vi: 'Cô ở lại đi, tôi thôi đọc sách.', ok: false,
                            reply: { zh: '不读书，我就不见了。', vi: 'Không đọc sách thì ta biến mất.' } }
                    ]
                },
                { say: 'yan', zh: '这本书给你。读完了，我们再见。', vi: 'Cuốn sách này cho ngươi. Đọc xong, chúng ta gặp lại.' },
                { say: 'note', yi: true, zh: '读书在心，不在多。', vi: 'Đọc sách cốt ở lòng, không ở nhiều.' }
            ],
            then: { flag: 'yan-2', tale: 'yan', keepsake: 'sach', learn: ['颜', '如', '而', '常', '温', '习', '考', '本', '完', '忘'], lk: 10 }
        },
        // Đợt D. Đạo sĩ Lao Sơn: học trò Vương Sinh chê chẻ củi, chỉ xin phép xuyên tường (崂山道士).
        {
            id: 'laoshan-1', where: 'gate', tale: 'laoshan', guest: 'laoshan',
            steps: [
                { say: 'note', vi: 'Đêm trăng khuyết. Một lão đạo sĩ áo vá ngồi dưới cổng Sơn môn, cạnh một bó củi.' },
                { say: 'laoshan', zh: '我从崂山来，借你的门口坐一坐。', vi: 'Ta từ núi Lao đến, mượn cổng nhà ngươi ngồi một lát.' },
                {
                    choose: [
                        { zh: '请进来喝杯茶。', vi: 'Mời ông vào uống chén trà.', ok: true,
                            reply: { zh: '好，好。', vi: 'Được, được.' } },
                        { zh: '这里不让人坐。', vi: 'Ở đây không cho ngồi.', ok: false,
                            reply: { zh: '呵呵，那我站着。', vi: 'Ha ha, vậy ta đứng.' } }
                    ]
                },
                { say: 'laoshan', zh: '我有一个学生，叫王生。他上山学道，只学了一个月。', vi: 'Ta có một học trò tên Vương Sinh. Nó lên núi học đạo, chỉ học được một tháng.' },
                { say: 'laoshan', zh: '他说天天砍柴太苦，只想学穿墙的法术。', vi: 'Nó nói ngày nào cũng chẻ củi khổ quá, chỉ muốn học phép xuyên tường.' },
                { say: 'note', vi: 'Ông cắt một tờ giấy tròn, dán lên cột cổng. Tờ giấy sáng lên như trăng rằm.' },
                { say: 'laoshan', zh: '你看，这个月亮是纸做的。', vi: 'Ngươi xem, mặt trăng này làm bằng giấy.' },
                { say: 'laoshan', zh: '明天晚上，王生会来。你看他怎么穿墙。', vi: 'Tối mai Vương Sinh sẽ đến. Ngươi xem nó xuyên tường thế nào.' }
            ],
            then: { flag: 'laoshan-1', lk: 5 }
        },
        {
            id: 'laoshan-2', where: 'gate', tale: 'laoshan', guest: 'laoshan',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai, một chàng trai ôm trán chạy tới cổng. Trên trán sưng một cục to bằng quả trứng.' },
                { say: 'wangsheng', zh: '师父！我对着墙跑过去，头上撞了一个大包！', vi: 'Sư phụ! Con chạy thẳng vào tường, đầu va sưng một cục to!' },
                { say: 'laoshan', zh: '你说，他为什么穿不过去？', vi: 'Ngươi nói xem, vì sao nó không xuyên qua được?' },
                {
                    choose: [
                        { zh: '他不想吃苦，只想走近路。', vi: 'Anh ta không chịu khổ, chỉ muốn đi đường tắt.', ok: true,
                            reply: { zh: '对。', vi: 'Đúng.' } },
                        { zh: '墙太硬了。', vi: 'Bức tường cứng quá.', ok: false,
                            reply: { zh: '哈哈，墙不硬，是他的心不正。', vi: 'Ha ha, tường không cứng, là lòng nó không ngay.' } },
                        { zh: '法术是假的。', vi: 'Phép thuật là giả.', ok: false,
                            reply: { zh: '法术是真的，只是他没学好。', vi: 'Phép là thật, chỉ là nó chưa học tới nơi.' } }
                    ]
                },
                { read: { line: '学道要吃苦', vi: 'Học đạo phải chịu khổ.' }, ask: 'Đọc câu lão đạo sĩ dặn Vương Sinh.' },
                {
                    reveal: { tell: 'feather', note: 'Một chiếc lông trắng dài thò ra từ tay áo lão đạo sĩ.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'laoshan', zh: '对，我不是人，是崂山上的一只老鹤。', vi: 'Phải, ta không phải người, ta là con hạc già trên núi Lao.' },
                { say: 'wangsheng', zh: '师父，我还能回崂山吗？', vi: 'Sư phụ, con còn được về núi Lao không?' },
                {
                    choose: [
                        { zh: '回去吧，从砍柴开始。', vi: 'Về đi, bắt đầu lại từ việc chẻ củi.', ok: true,
                            reply: { zh: '好！我明天就上山砍柴。', vi: 'Được! Mai con lên núi chẻ củi.' } },
                        { zh: '别学了，太苦了。', vi: 'Đừng học nữa, khổ lắm.', ok: false,
                            reply: { zh: '……我也是这么想的。', vi: '… Con cũng nghĩ vậy.' } }
                    ]
                },
                { say: 'laoshan', zh: '这个月亮留给你。晚上读书，它给你照亮。', vi: 'Mặt trăng này để lại cho ngươi. Tối đọc sách, nó soi cho ngươi.' },
                { say: 'note', yi: true, zh: '学，没有近路。', vi: 'Học không có đường tắt.' }
            ],
            then: { flag: 'laoshan-2', tale: 'laoshan', keepsake: 'trang', learn: ['法', '路', '师', '坐', '近', '穿', '术', '亮', '苦', '墙'], lk: 10 }
        },
        // Hoa Cô Tử: hươu xạ con năm xưa sa lưới thợ săn, Lão Quy thả đi; nay cô về trả ơn (花姑子).
        {
            id: 'huagu-1', where: 'garden', tale: 'huagu', guest: 'huagu',
            steps: [
                { say: 'note', vi: 'Đêm sương. Vườn rau có mùi thơm lạ. Một cô gái áo nâu nhạt đang hái lá dưới trăng.' },
                { say: 'huagu', zh: '嘻，被你看见了。我来找药草。', vi: 'Hì, bị ngươi thấy rồi. Ta đến tìm cây thuốc.' },
                {
                    choose: [
                        { zh: '这么晚了，要我送你回家吗？', vi: 'Muộn thế này rồi, có cần tôi đưa cô về không?', ok: true,
                            reply: { zh: '不用，我认得路。', vi: 'Không cần, ta nhớ đường.' } },
                        { zh: '你家在哪里？', vi: 'Nhà cô ở đâu?', ok: true,
                            reply: { zh: '在山后面的林子里。', vi: 'Trong rừng sau núi.' } },
                        { zh: '这是我的菜园，不许拿！', vi: 'Đây là vườn của tôi, không được lấy!', ok: false,
                            reply: { zh: '……对不起，我放回去。', vi: '… Xin lỗi, ta trả lại.' } }
                    ]
                },
                { say: 'huagu', zh: '很多年以前，有人救过我。', vi: 'Nhiều năm trước, có người đã cứu ta.' },
                { say: 'huagu', zh: '那个人，就住在这个道观的湖里。', vi: 'Người đó sống trong hồ của đạo quán này.' },
                { say: 'huagu', zh: '明天晚上，我给你们做一碗药草汤。', vi: 'Tối mai, ta nấu cho các ngươi một bát canh thuốc.' }
            ],
            then: { flag: 'huagu-1', lk: 5 }
        },
        {
            id: 'huagu-2', where: 'garden', tale: 'huagu', guest: 'huagu',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai, cô gái mang tới một nồi đất nhỏ. Hơi thơm bay khắp vườn.' },
                { say: 'huagu', zh: '这汤有一点苦，喝了身上就暖了。', vi: 'Canh này hơi đắng, uống vào người sẽ ấm.' },
                { read: { line: '良药苦口', vi: 'Thuốc tốt thì đắng miệng.' }, ask: 'Đọc câu cô gái nói khi múc canh.' },
                {
                    reveal: { tell: 'ear', note: 'Sau mái tóc lộ ra một cái tai nhỏ có lông, như tai hươu.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'huagu', zh: '对，我是山里的一只小鹿。', vi: 'Phải, ta là một con hươu nhỏ trong núi.' },
                { say: 'lao-quy', zh: '呵呵，是你啊。那年你掉进猎人的网里，才这么一点大。', vi: 'Ha ha, là cháu à. Năm ấy cháu sa vào lưới thợ săn, mới bé tí thế này.' },
                { say: 'huagu', zh: '老龟爷爷放了我。这个恩，我一直记着。', vi: 'Ông Lão Quy đã thả ta. Ơn này ta vẫn luôn nhớ.' },
                {
                    choose: [
                        { zh: '谢谢你的汤。', vi: 'Cảm ơn bát canh của cô.', ok: true,
                            reply: { zh: '是我要谢谢你们。', vi: 'Là ta phải cảm ơn các ngươi.' } },
                        { zh: '你是鹿？那我要抓你！', vi: 'Cô là hươu? Vậy tôi phải bắt cô!', ok: false,
                            reply: { zh: '……你和那个猎人一样吗？', vi: '… Ngươi cũng giống tên thợ săn ấy sao?' } }
                    ]
                },
                { say: 'huagu', zh: '这包药草，挂在厨房门口。冷的时候，放一点在茶里。', vi: 'Gói thuốc này treo ở cửa bếp. Lúc lạnh thì bỏ một ít vào trà.' },
                { say: 'note', yi: true, zh: '好心有好报。', vi: 'Lòng tốt sẽ được đền đáp.' }
            ],
            then: { flag: 'huagu-2', tale: 'huagu', keepsake: 'thuoc', learn: ['找', '爷', '拿', '记', '认', '药', '掉', '抓', '鹿', '暖'], lk: 10 }
        },
        // Nhiếp Tiểu Thiến: hồn ma thử lòng bằng thỏi vàng, nhờ đưa hài cốt về quê (聂小倩). Không có yêu tinh.
        {
            id: 'xiaoqian-1', where: 'study', tale: 'xiaoqian', guest: 'xiaoqian',
            steps: [
                { say: 'note', vi: 'Canh ba. Ngọn đèn Thư trai chao một cái. Ngoài song cửa có tiếng bước chân rất nhẹ.' },
                { say: 'xiaoqian', zh: '这么晚了，你还在读书？', vi: 'Muộn thế này rồi, ngươi còn đọc sách à?' },
                { say: 'xiaoqian', zh: '我叫小倩，住在后山。一个人，好冷。', vi: 'Ta tên Tiểu Thiến, ở sau núi. Một mình, lạnh lắm.' },
                { say: 'note', vi: 'Cô đặt lên bàn một thỏi vàng sáng lóa.' },
                { say: 'xiaoqian', zh: '这块金子，送给你。', vi: 'Thỏi vàng này tặng ngươi.' },
                {
                    choose: [
                        { zh: '不是我的东西，我不要。', vi: 'Không phải của tôi, tôi không lấy.', ok: true,
                            reply: { zh: '……你是第一个不要的人。', vi: '… Ngươi là người đầu tiên không lấy.' } },
                        { zh: '好，谢谢你！', vi: 'Được, cảm ơn cô!', ok: false,
                            reply: { zh: '……原来你也一样。', vi: '… Hóa ra ngươi cũng thế.' } }
                    ]
                },
                { read: { line: '非义之财不取', vi: 'Của phi nghĩa thì không lấy.' }, ask: 'Đọc câu người xưa dạy về vàng không phải của mình.' },
                { say: 'xiaoqian', zh: '以前这个道观没有灯，也没有人。我在这里等了很多年。', vi: 'Trước đây đạo quán này không đèn, cũng không người. Ta đã chờ ở đây nhiều năm.' },
                { say: 'xiaoqian', zh: '明天晚上，我把我的事告诉你。', vi: 'Tối mai, ta kể ngươi nghe chuyện của ta.' }
            ],
            then: { flag: 'xiaoqian-1', lk: 5 }
        },
        {
            id: 'xiaoqian-2', where: 'study', tale: 'xiaoqian', guest: 'xiaoqian',
            steps: [
                { say: 'note', vi: 'Đêm thứ hai, cô gái ngồi bên song cửa, không thắp đèn.' },
                {
                    reveal: { tell: 'shoulder', note: 'Ánh đèn chiếu xuyên qua vai cô, in cả lên vách.' },
                    ask: 'Chạm vào chỗ lạ trên người khách.'
                },
                { say: 'xiaoqian', zh: '对，我是鬼。我死的那年，才十八岁。', vi: 'Phải, ta là ma. Năm ta chết mới mười tám tuổi.' },
                { say: 'xiaoqian', zh: '我的骨头在后山的白杨树下，那里又冷又黑。', vi: 'Xương ta nằm dưới gốc bạch dương sau núi, ở đó vừa lạnh vừa tối.' },
                { say: 'xiaoqian', zh: '你能把我送回家乡吗？', vi: 'Ngươi đưa ta về quê được không?' },
                {
                    choose: [
                        { zh: '好，我答应你。', vi: 'Được, tôi hứa với cô.', ok: true,
                            reply: { zh: '谢谢你。我等这句话，等了很久。', vi: 'Cảm ơn ngươi. Câu này ta đã chờ rất lâu.' } },
                        { zh: '我怕，你别再来了。', vi: 'Tôi sợ, cô đừng đến nữa.', ok: false,
                            reply: { zh: '……我知道，人都怕鬼。', vi: '… Ta biết, người ta ai cũng sợ ma.' } }
                    ]
                },
                { say: 'xiaoqian', zh: '你的灯，以后我替你守着。', vi: 'Ngọn đèn của ngươi, từ nay ta giữ giúp.' },
                { say: 'note', vi: 'Hôm sau, bạn cùng Lão Quy đưa hài cốt cô về quê, chôn dưới một gốc hoa.' },
                { say: 'note', yi: true, zh: '心正不怕鬼。', vi: 'Lòng ngay thì chẳng sợ ma.' }
            ],
            then: { flag: 'xiaoqian-2', tale: 'xiaoqian', keepsake: 'dang', learn: ['非', '杨', '久', '送', '块', '告', '骨', '守', '答', '灯'], lk: 10 }
        },
        {
            id: 'spring-1', where: 'garden', tale: 'spring', guest: 'spring',
            steps: [
                { say: 'note', vi: 'Đêm trăng thanh gió mát, trong vườn thuốc có tiếng cười khúc khích như chuông ngân.' },
                { say: 'spring', zh: '你好！我是小春。', vi: 'Chào bạn! Ta là Tiểu Xuân.' },
                { say: 'spring', zh: '我看你在山里学字，好认真呀。', vi: 'Ta thấy bạn học chữ trên núi chăm chỉ quá đi thôi.' },
                {
                    choose: [
                        { zh: '学字很有趣。', vi: 'Học chữ rất thú vị.', ok: true,
                            reply: { zh: '是吧！字就像春天开出的花一样。', vi: 'Đúng vậy! Chữ Hán cũng giống như hoa nở mùa xuân vậy.' } },
                        { zh: '字太多了，有点难记。', vi: 'Chữ nhiều quá, hơi khó nhớ.', ok: true,
                            reply: { zh: '哈哈，不要只记一个字，要连起来学呀！', vi: 'Ha ha, đừng chỉ nhớ một chữ đơn độc, phải học liền cụm từ chứ!' } }
                    ]
                },
                { say: 'spring', zh: '一个字是一个音，两个字连起来，才有真正的意思。', vi: 'Một chữ chỉ là một âm, hai chữ ghép liền lại mới thành ý nghĩa thực sự.' },
                { read: { line: '春风吹绿水', vi: 'Gió xuân thổi nước biếc.' }, ask: 'Cùng Tiểu Xuân ngâm câu thơ xuân về làn nước biếc.' },
                { say: 'spring', zh: '读得真好！明天晚上，我再来找你玩。', vi: 'Đọc hay lắm! Đêm mai ta lại đến chơi với bạn nhé.' }
            ],
            then: { flag: 'spring-1', lk: 5 }
        },
        {
            id: 'spring-2', where: 'garden', tale: 'spring', guest: 'spring',
            steps: [
                { say: 'note', vi: 'Tiểu Xuân lại đến, trên tay ôm một cành hoa mai trắng ngào ngạt hương thơm.' },
                { say: 'spring', zh: '今晚我们接着念后半句，好吗？', vi: 'Tối nay chúng ta ngâm tiếp nửa câu sau nhé?' },
                { read: { line: '白花满青山', vi: 'Hoa trắng ngợp núi xanh.' }, ask: 'Ngâm câu thơ đối về hoa nở trên sườn núi.' },
                { say: 'spring', zh: '春风吹绿水，白花满青山。多美啊！', vi: 'Gió xuân thổi nước biếc, hoa trắng ngợp núi xanh. Đẹp biết bao!' },
                { say: 'spring', zh: '这朵花送给你。多笑一笑，学字就不累了。', vi: 'Cành hoa này tặng bạn. Cười nhiều một chút, học chữ sẽ chẳng còn mệt mỏi nữa.' },
                { say: 'note', yi: true, zh: '笑者，心自春。', vi: 'Người hay cười, lòng tựa mùa xuân.' }
            ],
            then: { tale: 'spring', keepsake: 'hoa-xuan', lk: 15 }
        },
        // Đợt E (giữa game): chương 2 của khách quen, ban ngày ở Quán trà, mở theo độ phủ đọc 43/53/63 %.
        {
            id: 'nguyet-4', where: 'tea', guest: 'ho-nguyet', when: { flag: 'nguyet-3', cover: 0.43 },
            steps: [
                { say: 'note', vi: 'Hồ Tiểu Nguyệt ngồi bên bàn trà, tay cầm một phong thư, đuôi cụp xuống.' },
                { say: 'ho-nguyet', zh: '我娘给我写信了。', vi: 'Mẹ ta viết thư cho ta rồi.' },
                { say: 'ho-nguyet', zh: '可是信上有几个字，我不认得。你帮我看看？', vi: 'Nhưng trong thư có mấy chữ ta không đọc được. Cậu xem giúp ta nhé?' },
                { read: { line: '月儿，山上冷不冷？住得好不好？', vi: 'Nguyệt nhi, trên núi có lạnh không? Con ở có tốt không?' }, ask: 'Đọc giúp Hồ Tiểu Nguyệt dòng đầu bức thư.' },
                { say: 'ho-nguyet', zh: '我想给娘回信。可是……我只会写我的名字。', vi: 'Ta muốn viết thư trả lời mẹ. Nhưng… ta chỉ biết viết tên mình.' },
                { say: 'ho-nguyet', zh: '我姓胡，古月胡。古和月合在一起，就是胡。', vi: 'Ta họ Hồ, chữ Hồ là cổ ghép nguyệt. 古 với 月 ghép lại là thành 胡.' },
                { say: 'ho-nguyet', zh: '那我考考你：木子是什么字？', vi: 'Vậy ta đố cậu: 木 ghép 子 là chữ gì?' },
                {
                    choose: [
                        { zh: '李', vi: 'Chữ 李 (lý).', ok: true,
                            reply: { zh: '对！木子李。', vi: 'Đúng! Mộc tử Lý.' } },
                        { zh: '林', vi: 'Chữ 林 (lâm).', ok: false,
                            reply: { zh: '林是两个木，没有子。', vi: '林 là hai chữ 木, đâu có 子.' } },
                        { zh: '字', vi: 'Chữ 字 (tự).', ok: false,
                            reply: { zh: '字上面没有木。', vi: 'Trên chữ 字 đâu có 木.' } }
                    ]
                },
                { say: 'ho-nguyet', zh: '十五晚上，大殿前会挂灯。灯上的字，都是这样的。', vi: 'Đêm rằm, trước Chính điện sẽ treo đèn. Chữ trên đèn đều kiểu này cả.' },
                { say: 'ho-nguyet', zh: '谢谢你。我现在就去写信！', vi: 'Cảm ơn cậu. Ta đi viết thư ngay đây!' }
            ],
            then: { flag: 'nguyet-4', friend: 'ho-nguyet', lk: 10, learn: ['现', '给', '住', '名', '信'] }
        },
        {
            id: 'mac-4', where: 'tea', guest: 'tieu-mac', when: { flag: 'mac-3', cover: 0.53 },
            steps: [
                { say: 'note', vi: 'Tiểu Mặc ngồi chồm hổm trên bàn trà, trước mặt là một tờ giấy chi chít chữ.' },
                { say: 'tieu-mac', zh: '一条鱼，一杯茶，一本书。为什么不都说一个？', vi: 'Một con cá, một chén trà, một quyển sách. Sao không nói hết là 一个 cho xong?' },
                { say: 'tieu-mac', zh: '老龟说，东西不一样，用的字也不一样。', vi: 'Lão Quy bảo đồ vật khác nhau thì chữ đi kèm cũng khác nhau.' },
                { say: 'tieu-mac', zh: '那我考考你。门口来了一＿客人。', vi: 'Vậy ta đố ngươi. Ở cổng có một ＿ khách đến.' },
                {
                    choose: [
                        { zh: '位', vi: '位 (vị)', ok: true,
                            reply: { zh: '对，客人用位。', vi: 'Đúng, khách thì dùng 位.' } },
                        { zh: '条', vi: '条 (điều)', ok: false,
                            reply: { zh: '客人又不是鱼！', vi: 'Khách đâu phải con cá!' } },
                        { zh: '本', vi: '本 (bản)', ok: false,
                            reply: { zh: '客人也不是书。', vi: 'Khách cũng chẳng phải quyển sách.' } }
                    ]
                },
                { say: 'tieu-mac', zh: '你有一＿新衣服。', vi: 'Ngươi có một ＿ áo mới.' },
                {
                    choose: [
                        { zh: '件', vi: '件 (kiện)', ok: true,
                            reply: { zh: '对，衣服用件。', vi: 'Đúng, áo thì dùng 件.' } },
                        { zh: '片', vi: '片 (phiến)', ok: false,
                            reply: { zh: '片是叶子用的。', vi: '片 là để nói chiếc lá cơ.' } },
                        { zh: '双', vi: '双 (song)', ok: false,
                            reply: { zh: '双是两个，一双手，一双眼。', vi: '双 là một đôi: một đôi tay, một đôi mắt.' } }
                    ]
                },
                { say: 'tieu-mac', zh: '最后一个：一＿刀。', vi: 'Câu cuối: một ＿ dao.' },
                {
                    choose: [
                        { zh: '把', vi: '把 (bả)', ok: true,
                            reply: { zh: '对，刀用把。', vi: 'Đúng, dao thì dùng 把.' } },
                        { zh: '只{chích}', vi: '只 (chích)', ok: false,
                            reply: { zh: '只{chích}是猫用的，像我。', vi: '只 là để nói con mèo, như ta đây.' } },
                        { zh: '张', vi: '张 (trương)', ok: false,
                            reply: { zh: '张是纸用的。', vi: '张 là để nói tờ giấy.' } }
                    ]
                },
                { say: 'tieu-mac', zh: '一位客人，一双手，一件衣服，一片叶子，一把刀。你都会了！', vi: 'Một vị khách, một đôi tay, một chiếc áo, một chiếc lá, một con dao. Ngươi biết hết rồi!' },
                { say: 'tieu-mac', zh: '我去书房，把这些都写下来。', vi: 'Ta về thư phòng chép hết lại đây.' }
            ],
            then: { flag: 'mac-4', friend: 'tieu-mac', lk: 10, learn: ['把', '位', '双', '片', '件'] }
        },
        {
            id: 'ly-4', where: 'tea', guest: 'tieu-ly', when: { flag: 'ly-3', cover: 0.63 },
            steps: [
                { say: 'note', vi: 'Sáng nay mấy tấm biển trong quán có thêm chữ mới. Dưới gầm bàn lại thò ra cái đuôi khoang.' },
                { say: 'tieu-ly', zh: '嘿嘿，这些字是我写的。好看吗？', vi: 'Hê hê, mấy chữ này ta viết đấy. Đẹp không?' },
                { spot: { line: '小心夫火', at: 2, right: '失' }, ask: 'Tấm biển trên bếp có một chữ bị tráo. Chạm vào chữ đó.', vi: 'Biển đúng là 小心失火 (cẩn thận kẻo cháy).' },
                { say: 'tieu-ly', zh: '对，是小心失火。失和夫，就差一点点。', vi: 'Đúng, là 小心失火. 失 với 夫 chỉ khác nhau một chút xíu.' },
                { spot: { line: '今天客入很多', at: 3, right: '人' }, ask: 'Tấm bảng trước cửa cũng sai một chữ.', vi: 'Bảng đúng là 今天客人很多 (hôm nay đông khách).' },
                { say: 'tieu-ly', zh: '人和入，我老是写反。', vi: '人 với 入, ta toàn viết ngược.' },
                { spot: { line: '书房有一干本书', at: 4, right: '千' }, ask: 'Còn một chữ nữa, trên biển Thư trai.', vi: 'Biển đúng là 书房有一千本书 (thư phòng có một nghìn quyển sách).' },
                { say: 'tieu-ly', zh: '干和千，上面不一样。干{can}杯的干{can}，一千的千。', vi: '干 với 千 khác nhau ở nét trên cùng. 干 trong 干杯 (cạn chén), 千 trong 一千 (một nghìn).' },
                { say: 'tieu-ly', zh: '三个都被你找到了！下次我还写，你还来找，好不好？', vi: 'Cả ba chữ đều bị ngươi tìm ra! Lần sau ta lại viết, ngươi lại tìm, được không?' },
                {
                    choose: [
                        { zh: '好，一言为定。', vi: 'Được, một lời đã định.', ok: true,
                            reply: { zh: '嘻嘻，一言为定！', vi: 'Hi hi, một lời đã định!' } },
                        { zh: '你别再写了。', vi: 'Đừng viết nữa.', ok: false,
                            reply: { zh: '可是写字很好玩……', vi: 'Nhưng viết chữ vui lắm mà…' } }
                    ]
                }
            ],
            then: { flag: 'ly-4', friend: 'tieu-ly', lk: 10, learn: ['反', '干', '失', '千', '差'] }
        },
        // Đợt E: khách cũ ghé lại một đêm (story.visits), hình người, không reveal, không lưu niệm.
        {
            id: 'ta-3', where: 'library', tale: 'ta-ve', guest: 'ta',
            steps: [
                { say: 'note', vi: 'Đêm nay Tàng Kinh Các sáng đèn. Tiểu Tạ ngồi giữa chồng sách, tay cầm một cây bút mới.' },
                { say: 'ta', zh: '我回来了！你看，我会写一整句话了。', vi: 'Ta về rồi! Ngươi xem, ta viết được cả một câu rồi.' },
                { spot: { line: '令天我学了新字', at: 0, right: '今' }, ask: 'Câu của Tiểu Tạ có một chữ viết sai. Chạm vào chữ đó.', vi: 'Câu đúng là 今天我学了新字 (hôm nay ta học chữ mới).' },
                { say: 'ta', zh: '嘻嘻，又被你找到了。今和令，我总是分不清。', vi: 'Hi hi, lại bị ngươi tìm ra rồi. 今 với 令, ta cứ lẫn mãi.' },
                { say: 'ta', zh: '我还写了一首诗。你跟我一起念。', vi: 'Ta còn làm một bài thơ. Ngươi đọc cùng ta nhé.' },
                { read: { line: '白天睡觉，晚上写字。', vi: 'Ban ngày ngủ, ban đêm viết chữ.' }, ask: 'Đọc bài thơ Tiểu Tạ tự làm.' },
                { say: 'ta', zh: '你说，这是不是好诗？', vi: 'Ngươi nói xem, đây có phải thơ hay không?' },
                {
                    choose: [
                        { zh: '是好诗！', vi: 'Thơ hay!', ok: true,
                            reply: { zh: '嘻嘻，我也这么觉得。', vi: 'Hi hi, ta cũng thấy vậy.' } },
                        { zh: '这不太像诗。', vi: 'Cái này không giống thơ lắm.', ok: true,
                            reply: { zh: '哼！下次我写一首长长的给你看。', vi: 'Hừ! Lần sau ta viết một bài thật dài cho ngươi xem.' } }
                    ]
                },
                { say: 'ta', zh: '天快亮了，我要回去了。', vi: 'Trời sắp sáng rồi, ta phải về đây.' },
                { say: 'note', vi: 'Tiểu Tạ để lại trên bàn một tờ giấy chép năm chữ, rồi ôm sách đi ra phía cổng.' }
            ],
            then: { flag: 'ta-3', tale: 'ta-ve', learn: ['话', '觉', '整', '新', '句'], lk: 10 }
        },
        {
            id: 'luc-3', where: 'study', tale: 'luc-ve', guest: 'luc',
            steps: [
                { say: 'note', vi: 'Một cô gái áo xanh lục đứng bên song cửa Thư trai, sau lưng lấp lánh hai vệt mỏng như cánh.' },
                { say: 'luc', zh: '好久不见！我飞了很远，来看你。', vi: 'Lâu quá không gặp! Ta bay xa lắm mới đến thăm ngươi.' },
                { say: 'luc', zh: '山那边的花都开了。我给你唱一首新歌。', vi: 'Bên kia núi hoa nở cả rồi. Ta hát cho ngươi một bài mới.' },
                { say: 'luc', zh: '轻轻飞，慢慢飞，飞过山，飞过水。', vi: 'Nhẹ nhàng bay, chầm chậm bay, bay qua núi, bay qua sông.', song: true },
                { read: { line: '轻轻飞，慢慢飞。', vi: 'Nhẹ nhàng bay, chầm chậm bay.' }, ask: 'Hát theo Lục Y Nữ: đọc câu đầu bài hát.' },
                { say: 'luc', zh: '你听，山上的风，水里的鱼，都在唱歌。', vi: 'Ngươi nghe xem: gió trên núi, cá dưới nước, đều đang hát.' },
                {
                    choose: [
                        { zh: '我听到了。', vi: 'Tôi nghe thấy rồi.', ok: true,
                            reply: { zh: '你也会唱歌了。', vi: 'Ngươi cũng biết hát rồi đấy.' } },
                        { zh: '我只听到你。', vi: 'Tôi chỉ nghe thấy cô thôi.', ok: true,
                            reply: { zh: '嘻嘻，那我再唱一次。', vi: 'Hi hi, vậy ta hát thêm lần nữa.' } }
                    ]
                },
                { say: 'luc', zh: '天亮以前，我要飞回去了。明年花开，我再来。', vi: 'Trước khi trời sáng ta phải bay về. Sang năm hoa nở, ta lại đến.' },
                { say: 'note', vi: 'Cô gái vẫy tay chào rồi đi ra phía cổng. Trên song cửa còn vương mấy hạt phấn hoa.' }
            ],
            then: { flag: 'luc-3', tale: 'luc-ve', learn: ['听', '轻', '飞', '远', '慢'], lk: 10 }
        },
        {
            id: 'bach-3', where: 'pond', tale: 'bach-ve', guest: 'bach',
            steps: [
                { say: 'note', vi: 'Đêm nay mặt hồ phẳng lặng. Bạch Thu Luyện ngồi bên bờ, áo trắng như sương.' },
                { say: 'bach', zh: '你还记得我吗？那天的诗，我一直记着。', vi: 'Ngươi còn nhớ ta không? Bài thơ hôm ấy, ta vẫn nhớ mãi.' },
                { say: 'bach', zh: '我的病终于好了。明天，我要离开这里，回大江去。', vi: 'Bệnh của ta cuối cùng cũng khỏi. Ngày mai ta phải rời nơi này, về với sông lớn.' },
                { read: { line: '江水向东流，流到大海里。', vi: 'Nước sông chảy về đông, chảy ra biển lớn.' }, ask: 'Bạch Thu Luyện ngâm câu cô viết cho dòng sông. Đọc theo cô.' },
                { say: 'bach', zh: '我也想留下来。可是江里，还有我的家人。', vi: 'Ta cũng muốn ở lại. Nhưng dưới sông còn có người nhà của ta.' },
                { say: 'bach', zh: '江水不回头，可是我会。每年秋天，我都回来看你。', vi: 'Nước sông không quay đầu, nhưng ta thì có. Mỗi năm mùa thu, ta đều về thăm ngươi.' },
                {
                    choose: [
                        { zh: '好，我等你。', vi: 'Được, tôi chờ cô.', ok: true,
                            reply: { zh: '好。那我一定回来。', vi: 'Được. Vậy ta nhất định sẽ về.' } },
                        { zh: '江上太远，别回来了。', vi: 'Đường sông xa lắm, đừng về nữa.', ok: false,
                            reply: { zh: '……可是，我还是想回来。', vi: '… Nhưng ta vẫn muốn về.' } }
                    ]
                },
                { say: 'bach', zh: '这条小鱼给你。它会在你的湖里慢慢长{trưởng}大。', vi: 'Con cá nhỏ này tặng ngươi. Nó sẽ lớn dần trong hồ của ngươi.' },
                { say: 'note', vi: 'Cô thả một con cá trắng nhỏ vào giỏ của bạn, cúi chào, rồi đi về phía cổng, áo trắng nhòa vào sương.' }
            ],
            then: { flag: 'bach-3', tale: 'bach-ve', bag: { bach: 1 }, learn: ['离', '流', '终', '每', '留'], lk: 10 }
        },
        // Đợt F: Nhan Như Ngọc ghé lại sau khi người chơi đọc hết 6 trang sách của cô (cờ sach-6). Cuộn 5 chữ ở hạng
        // 969–1119 của bộ chữ: người học theo thứ tự tới độ phủ 85 % (844 chữ đầu) và mở thêm vài cuộn vẫn chưa gặp.
        {
            id: 'yan-3', where: 'library', tale: 'yan-ve', guest: 'yan',
            steps: [
                { say: 'note', vi: 'Đêm nay Tàng Kinh Các sáng đèn. Cuốn sách của Như Ngọc nằm mở ở trang cuối; một cô gái giấy ngồi trên giá sách, đung đưa chân.' },
                { say: 'yan', zh: '你把我的书读完了，一个字也没有忘。', vi: 'Ngươi đọc hết sách của ta rồi, không quên chữ nào.' },
                { say: 'yan', zh: '我们约好的：读完了，就再见。', vi: 'Chúng ta đã hẹn rồi: đọc xong thì gặp lại.' },
                { say: 'yan', zh: '我的书很薄。书架上的书，都比我的厚。', vi: 'Sách của ta mỏng lắm. Sách trên giá đều dày hơn sách của ta.' },
                { read: { line: '手不释卷', vi: 'Tay không rời sách.' }, ask: 'Đọc bốn chữ Như Ngọc viết lên trang cuối.' },
                { say: 'yan', zh: '一本好书，可以读很多遍。读一遍，就多懂一点。', vi: 'Một cuốn sách hay đọc được nhiều lần. Mỗi lần đọc lại hiểu thêm một chút.' },
                { say: 'yan', zh: '以后，你自己去找书读。一个字一个字，读下去。', vi: 'Từ nay ngươi tự đi tìm sách mà đọc. Từng chữ một, cứ thế đọc tiếp.' },
                {
                    choose: [
                        { zh: '我会找一本好书，一个字一个字地读。', vi: 'Tôi sẽ tìm một cuốn sách hay, đọc từng chữ một.', ok: true,
                            reply: { zh: '好。读不懂的字，就来这里学。', vi: 'Tốt. Chữ nào đọc chưa hiểu thì đến đây học.' } },
                        { zh: '我想再读一遍你的书。', vi: 'Tôi muốn đọc lại sách của cô một lần nữa.', ok: true,
                            reply: { zh: '嘻，温故而知新。', vi: 'Hi, ôn cái cũ mà biết điều mới.' } }
                    ]
                },
                { say: 'yan', zh: '天快亮了，我要走了。你读书的时候，我就在纸上。', vi: 'Trời sắp sáng, ta phải đi rồi. Lúc ngươi đọc sách, ta ở ngay trên trang giấy.' },
                { say: 'note', vi: 'Cô gái giấy cúi chào rồi đi ra phía cổng, nhẹ như một tờ giấy bay. Bên lề trang cuối cuốn sách có thêm năm chữ mới, mực còn ướt.' }
            ],
            then: { flag: 'yan-3', tale: 'yan-ve', learn: ['架', '厚', '释', '卷', '遍'], lk: 10 }
        },
        // Đợt E: đêm rằm đầu tiên sau khi thắp đèn lồng, Lão Quy kể tục treo đèn đố chữ (mở thẻ đố đèn ở Chính điện).
        {
            id: 'quy-ram', where: 'hub', guest: 'lao-quy', when: { flag: 'quy-lantern', night: true, ram: true },
            steps: [
                { say: 'note', vi: 'Trăng rằm treo trên đỉnh núi. Lão Quy chậm rãi bò lên bậc Chính điện.' },
                { say: 'lao-quy', zh: '今天是十五，月亮最亮。', vi: 'Hôm nay là rằm, trăng sáng nhất.' },
                { say: 'lao-quy', zh: '从前，每到十五，山下的人都上山来，在大殿前挂灯。', vi: 'Ngày trước, cứ đến rằm, người dưới núi lại lên đây treo đèn trước Chính điện.' },
                { say: 'lao-quy', zh: '灯上写着一句话，说的是一个字。', vi: 'Trên mỗi đèn viết một câu, câu ấy nói về một chữ.' },
                { say: 'lao-quy', zh: '比如：山上还有山。是什么字？', vi: 'Ví dụ: trên núi còn có núi. Là chữ gì?' },
                {
                    choose: [
                        { zh: '出', vi: 'Chữ 出 (xuất).', ok: true,
                            reply: { zh: '对！两个山，就是出。', vi: 'Đúng! Hai chữ 山 chồng lên là 出.' } },
                        { zh: '山', vi: 'Chữ 山 (sơn).', ok: false,
                            reply: { zh: '一个山不够，要两个。', vi: 'Một chữ 山 chưa đủ, phải hai.' } },
                        { zh: '岩', vi: 'Chữ 岩 (nham).', ok: false,
                            reply: { zh: '岩下面是石，不是山。', vi: 'Dưới chữ 岩 là 石, không phải 山.' } }
                    ]
                },
                { say: 'lao-quy', zh: '今晚我也挂了三个灯。你去大殿前看看吧。', vi: 'Đêm nay ta cũng treo ba cái đèn. Cháu ra trước Chính điện xem đi.' },
                { say: 'note', vi: 'Mỗi đêm rằm (14 đến 16 âm lịch), trước Chính điện treo đèn đố chữ. Mở Chính điện để giải.' }
            ],
            then: { flag: 'quy-ram' }
        },

        // ---------- đợt F: thư của khách cũ (Sơn môn) và sách của Như Ngọc (Tàng Kinh Các) ----------
        // docs/plans/2026-10-18-quy-van-batch-f-reader-letters-design.md mục 4. Cảnh manual: không tự mở (nextScene bỏ
        // qua), app mở từ thẻ Thư ở Sơn môn và thẻ Sách ở Tàng Kinh Các. Thư không có tale (không qua cổng đêm, không ghi
        // ngày của truyện): thư 1 đến sau khi truyện xong 2 ngày, thư 2 sau 9 ngày và sau thư 1. Thư không trao lưu niệm,
        // không mở cuộn chữ. Không có thư của Hương Ngọc (khóm hoa trong vườn), Vương Lục Lang (Thổ Địa bên hồ), Họa Bì,
        // Tiểu Thiến và Liên Tỏa (hai hồn ma đã yên nghỉ), Như Ngọc (ở trong sách).

        // Bạch Thu Luyện: viết từ dưới nước, nhớ bài thơ Tĩnh dạ tứ (lưu niệm tho).
        {
            id: 'thu-bach-1', where: 'gate', manual: true, letter: 'bach', guest: 'bach',
            when: { after: { tale: 'bach', days: 2 } },
            steps: [
                { say: 'note', vi: 'Sáng nay, trên bậc đá Sơn môn có một phong thư gấp hình con cá, giấy còn ướt hơi nước. Không ai thấy người mang thư tới.' },
                {
                    letter: {
                        from: 'bach',
                        lines: [
                            { zh: '我是秋练。白天我不能出水，就给你写信。', vi: 'Ta là Thu Luyện. Ban ngày ta không lên khỏi mặt nước được, nên viết thư cho ngươi.' },
                            { zh: '你念的诗，我每天晚上都念一遍。', vi: 'Bài thơ ngươi đọc, tối nào ta cũng đọc lại một lần.' },
                            { zh: '念了诗，水就不冷了。', vi: 'Đọc thơ xong, nước không còn lạnh nữa.' },
                            { zh: '你还在湖边钓鱼吗？别钓到我。', vi: 'Ngươi còn câu cá bên hồ không? Đừng câu trúng ta đấy.' }
                        ]
                    },
                    ask: 'Đọc thư Bạch Thu Luyện gửi.'
                },
                { read: { line: '念了诗，水就不冷了。', vi: 'Đọc thơ xong, nước không còn lạnh nữa.' }, ask: 'Đọc dòng thứ ba của thư.' },
                {
                    pay: { cost: 20, vi: 'Thư gửi xuống nước phải viết trên giấy dầu cho khỏi nhòe. Mua một tờ giấy dầu và một thỏi mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '我每天晚上也念一首诗。', vi: 'Tối nào tôi cũng đọc một bài thơ.', ok: true,
                            reply: { zh: '那我们一起念：你在水边，我在水里。', vi: 'Vậy chúng ta cùng đọc: ngươi bên bờ nước, ta dưới nước.' } },
                        { zh: '我不钓白色的鱼。', vi: 'Tôi không câu cá màu trắng.', ok: true,
                            reply: { zh: '嗯……那我就放心了。', vi: 'Ừm… vậy ta yên tâm rồi.' } },
                        { zh: '水冷，你要多穿衣服。', vi: 'Nước lạnh, cô nhớ mặc thêm áo.', ok: true,
                            reply: { zh: '鱼不穿衣服。不过，谢谢你。', vi: 'Cá đâu có mặc áo. Nhưng mà cảm ơn ngươi.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn gấp thư trả lời thành hình con cá, thả xuống dòng suối dưới Sơn môn. Nước cuốn lá thư đi rất nhanh.' }
            ],
            then: { flag: 'thu-bach-1', lk: 5 }
        },
        {
            id: 'thu-bach-2', where: 'gate', manual: true, letter: 'bach', guest: 'bach',
            when: { flag: 'thu-bach-1', after: { tale: 'bach', days: 9 } },
            steps: [
                { say: 'note', vi: 'Lại một phong thư gấp hình con cá trên bậc Sơn môn. Lần này giấy khô, thoảng mùi sen.' },
                {
                    letter: {
                        from: 'bach',
                        lines: [
                            { zh: '你的信，我收到了。我念了三遍。', vi: 'Thư của ngươi ta nhận được rồi. Ta đọc ba lần.' },
                            { zh: '昨天晚上的月亮很亮。', vi: 'Trăng đêm qua sáng lắm.' },
                            { zh: '我举头望明月，低头，就想起你的茶。', vi: 'Ta ngẩng đầu nhìn trăng sáng, cúi đầu lại nhớ chén trà của ngươi.' },
                            { zh: '水会流走，诗不会。', vi: 'Nước rồi sẽ chảy đi, thơ thì không.' }
                        ]
                    },
                    ask: 'Đọc thư Bạch Thu Luyện gửi.'
                },
                { read: { line: '水会流走，诗不会。', vi: 'Nước rồi sẽ chảy đi, thơ thì không.' }, ask: 'Đọc dòng cuối của thư.' },
                {
                    pay: { cost: 30, vi: 'Lần này bạn muốn chép tặng cô một bài thơ khác. Mua giấy dầu và mực tốt hơn lần trước.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '我把你的信放在诗的旁边。', vi: 'Tôi để thư của cô cạnh cuộn thơ.', ok: true,
                            reply: { zh: '好。诗和信，在一起。', vi: 'Tốt. Thơ với thư ở cùng một chỗ.' } },
                        { zh: '月亮很亮的晚上，我也会想起你。', vi: 'Những đêm trăng sáng, tôi cũng nhớ đến cô.', ok: true,
                            reply: { zh: '那我们看的，是同一个月亮。', vi: 'Vậy chúng ta đang ngắm cùng một vầng trăng.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn kẹp thư của Thu Luyện vào cuộn 静夜思. Mỗi lần mở cuộn thơ, giấy lại thoảng mùi sen.' }
            ],
            then: { flag: 'thu-bach-2', lk: 5 }
        },

        // Tiểu Tạ: đi tìm chữ mới dưới núi (lưu niệm but), thư nào cũng viết sai một chữ (bước spot).
        {
            id: 'thu-ta-1', where: 'gate', manual: true, letter: 'ta', guest: 'ta',
            when: { after: { tale: 'ta', days: 2 } },
            steps: [
                { say: 'note', vi: 'Trên cột Sơn môn có dán một tờ giấy, chữ to chữ nhỏ không đều. Góc giấy có vết mực hình bàn tay nhỏ.' },
                {
                    letter: {
                        from: 'ta',
                        lines: [
                            { zh: '嘻嘻，是我，小谢！', vi: 'Hi hi, là ta, Tiểu Tạ đây!' },
                            { zh: '我在山下的一个书房里找新字。', vi: 'Ta đang tìm chữ mới trong một thư phòng dưới núi.' },
                            { zh: '这里的书很多，字也很多。', vi: 'Ở đây sách nhiều, chữ cũng nhiều.' },
                            { zh: '窗外有一只{chích}乌在唱歌，我也学会写它了。', vi: 'Ngoài cửa sổ có một con chim đang hót, ta cũng học viết được chữ đó rồi.' },
                            { zh: '我的笔在你那里，你要常常写字。', vi: 'Bút của ta ở chỗ ngươi, ngươi phải thường xuyên viết chữ nhé.' }
                        ]
                    },
                    ask: 'Đọc thư Tiểu Tạ gửi.'
                },
                { read: { line: '这里的书很多，字也很多。', vi: 'Ở đây sách nhiều, chữ cũng nhiều.' }, ask: 'Đọc dòng Tiểu Tạ kể về thư phòng dưới núi.' },
                { spot: { line: '窗外有一只乌在唱歌，我也学会写它了。', at: 5, right: '鸟' }, ask: 'Thư của Tiểu Tạ có một chữ viết sai. Chạm vào chữ đó.', vi: 'Câu đúng là 窗外有一只鸟在唱歌 (ngoài cửa sổ có một con chim đang hót).' },
                {
                    pay: { cost: 20, vi: 'Tiểu Tạ sẽ chép theo chữ của bạn, nên phải viết thật nắn nót. Mua một xấp giấy và một thỏi mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '是“鸟”，不是“乌”。', vi: 'Là 鸟 (chim), không phải 乌 (quạ).', ok: true,
                            reply: { zh: '啊，又错了！乌是黑色的鸟，我记住了。', vi: 'A, lại sai rồi! 乌 là con chim màu đen, ta nhớ rồi.' } },
                        { zh: '你的字越写越好了。', vi: 'Chữ của cô càng viết càng đẹp.', ok: true,
                            reply: { zh: '嘻嘻，我就知道！', vi: 'Hi hi, ta biết ngay mà!' } },
                        { zh: '你什么时候回来？', vi: 'Khi nào cô về?', ok: true,
                            reply: { zh: '学完这里的字，我就回去！', vi: 'Học hết chữ ở đây, ta về ngay!' } }
                    ]
                },
                { say: 'note', vi: 'Bạn để thư trả lời dưới cổng Sơn môn. Sáng hôm sau thư đã biến mất, trên bậc đá chỉ còn một vệt mực nhỏ.' }
            ],
            then: { flag: 'thu-ta-1', lk: 5 }
        },
        {
            id: 'thu-ta-2', where: 'gate', manual: true, letter: 'ta', guest: 'ta',
            when: { flag: 'thu-ta-1', after: { tale: 'ta', days: 9 } },
            steps: [
                { say: 'note', vi: 'Lần này thư của Tiểu Tạ kẹp trong một cuốn sách cũ, đặt ngay ngắn dưới cổng Sơn môn.' },
                {
                    letter: {
                        from: 'ta',
                        lines: [
                            { zh: '你的信，我念了很多遍。你的字真好看！', vi: 'Thư của ngươi, ta đọc nhiều lần lắm. Chữ ngươi đẹp thật!' },
                            { zh: '我在这里学了一百个新字。', vi: 'Ở đây ta học được một trăm chữ mới.' },
                            { zh: '我还卖了一本书，书上都是诗。', vi: 'Ta còn mua một cuốn sách, trong sách toàn là thơ.' },
                            { zh: '等我学会了，我就写一首长长的诗给你。', vi: 'Đợi ta học xong, ta sẽ viết tặng ngươi một bài thơ thật dài.' }
                        ]
                    },
                    ask: 'Đọc thư Tiểu Tạ gửi.'
                },
                { read: { line: '我在这里学了一百个新字。', vi: 'Ở đây ta học được một trăm chữ mới.' }, ask: 'Đọc dòng Tiểu Tạ khoe số chữ mới học.' },
                { spot: { line: '我还卖了一本书，书上都是诗。', at: 2, right: '买' }, ask: 'Tiểu Tạ lại viết sai một chữ. Chạm vào chữ đó.', vi: 'Câu đúng là 我还买了一本书 (ta còn mua một cuốn sách).' },
                {
                    pay: { cost: 30, vi: 'Tiểu Tạ đọc từng nét rất kỹ. Mua giấy tốt và mực thật đen để chữ rõ ràng.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '是“买”，不是“卖”。', vi: 'Là 买 (mua), không phải 卖 (bán).', ok: true,
                            reply: { zh: '对对，卖比买多一个十。我又记住了一个字！', vi: 'Đúng đúng, 卖 hơn 买 một chữ 十. Ta lại nhớ thêm được một chữ!' } },
                        { zh: '你学得真快！', vi: 'Cô học nhanh thật!', ok: true,
                            reply: { zh: '因为{vị}我白天睡觉，晚上写字！', vi: 'Vì ban ngày ta ngủ, ban đêm viết chữ!' } },
                        { zh: '我等你的诗。', vi: 'Tôi chờ bài thơ của cô.', ok: true,
                            reply: { zh: '嘻嘻，一定很长很长！', vi: 'Hi hi, nhất định dài thật dài!' } }
                    ]
                },
                { say: 'note', vi: 'Bạn kẹp thư của Tiểu Tạ vào cuốn sách cũ. Bên lề, bạn viết thêm chữ 买 thật to cho cô nhớ.' }
            ],
            then: { flag: 'thu-ta-2', lk: 5 }
        },

        // Lục Y Nữ: chữ nhỏ như chân ong, gửi kèm một bài hát (lưu niệm mat: trà mật).
        {
            id: 'thu-luc-1', where: 'gate', manual: true, letter: 'luc', guest: 'luc',
            when: { after: { tale: 'luc', days: 2 } },
            steps: [
                { say: 'note', vi: 'Trên cành hoa dại cạnh Sơn môn có một mảnh giấy nhỏ xíu, buộc bằng sợi tơ. Chữ trên đó nhỏ như chân ong.' },
                {
                    letter: {
                        from: 'luc',
                        lines: [
                            { zh: '我是绿衣女。我的字很小，你要好好看。', vi: 'Ta là Lục Y Nữ. Chữ ta nhỏ lắm, ngươi phải nhìn cho kỹ.' },
                            { zh: '山那边的花开了，我天天在花里。', vi: 'Bên kia núi hoa nở rồi, ngày nào ta cũng ở trong hoa.' },
                            { zh: '蜜茶好喝吗？那是我最好的蜜。', vi: 'Trà mật có ngon không? Đó là mật ngon nhất của ta.' },
                            { zh: '我给你写了一首小歌：', vi: 'Ta viết cho ngươi một bài hát nhỏ:' },
                            { zh: '花开了，蜂来了，茶也香了。', vi: 'Hoa nở rồi, ong đến rồi, trà cũng thơm rồi.' }
                        ]
                    },
                    ask: 'Đọc thư Lục Y Nữ gửi.'
                },
                { read: { line: '花开了，蜂来了，茶也香了。', vi: 'Hoa nở rồi, ong đến rồi, trà cũng thơm rồi.' }, ask: 'Đọc bài hát nhỏ ở cuối thư.' },
                {
                    pay: { cost: 20, vi: 'Lục Y Nữ nhìn chữ nhỏ không rõ, nên thư trả lời phải viết chữ thật to. Mua một tờ giấy lớn và một thỏi mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '蜜茶很好喝，谢谢你。', vi: 'Trà mật ngon lắm, cảm ơn cô.', ok: true,
                            reply: { zh: '嘻嘻，喝完了，我再送你。', vi: 'Hi hi, uống hết thì ta lại tặng ngươi.' } },
                        { zh: '小心蛛网！', vi: 'Cẩn thận mạng nhện nhé!', ok: true,
                            reply: { zh: '我记住了。现在我飞得很高。', vi: 'Ta nhớ rồi. Giờ ta bay cao lắm.' } },
                        { zh: '你的歌，我也会唱了。', vi: 'Bài hát của cô, tôi cũng hát được rồi.', ok: true,
                            reply: { zh: '那我们一起唱！', vi: 'Vậy chúng ta cùng hát!' } }
                    ]
                },
                { say: 'note', vi: 'Bạn viết thư trả lời bằng chữ thật to, gài lên cành hoa cạnh Sơn môn. Chiều hôm ấy có một con ong xanh lượn quanh cành hoa rất lâu.' }
            ],
            then: { flag: 'thu-luc-1', lk: 5 }
        },
        {
            id: 'thu-luc-2', where: 'gate', manual: true, letter: 'luc', guest: 'luc',
            when: { flag: 'thu-luc-1', after: { tale: 'luc', days: 9 } },
            steps: [
                { say: 'note', vi: 'Một con ong xanh đậu trên cột Sơn môn, chân còn dính mực. Dưới chân cột có một mảnh giấy nhỏ.' },
                {
                    letter: {
                        from: 'luc',
                        lines: [
                            { zh: '你的字很大，我一看就懂了！', vi: 'Chữ ngươi to lắm, ta nhìn là hiểu ngay!' },
                            { zh: '我的家在山里的老树上。', vi: 'Nhà ta ở trên cây cổ thụ trong núi.' },
                            { zh: '花少{thiểu}了，我要回家了。', vi: 'Hoa ít đi rồi, ta phải về nhà.' },
                            { zh: '明年花开，我再来唱歌。', vi: 'Sang năm hoa nở, ta lại đến hát.' }
                        ]
                    },
                    ask: 'Đọc thư Lục Y Nữ gửi.'
                },
                { read: { line: '明年花开，我再来唱歌。', vi: 'Sang năm hoa nở, ta lại đến hát.' }, ask: 'Đọc lời hẹn ở cuối thư.' },
                {
                    pay: { cost: 30, vi: 'Bạn muốn ép một cánh hoa vào thư trả lời. Mua một tờ giấy dày và một thỏi mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '明年见！', vi: 'Sang năm gặp lại!', ok: true,
                            reply: { zh: '明年见！花开的时候。', vi: 'Sang năm gặp lại! Khi hoa nở.' } },
                        { zh: '我给你留一杯蜜茶。', vi: 'Tôi để dành cho cô một chén trà mật.', ok: true,
                            reply: { zh: '嘻嘻，我闻得到。', vi: 'Hi hi, ta ngửi thấy được mà.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn ép một cánh hoa vào thư trả lời rồi đặt dưới chân cột. Sáng hôm sau, cả cánh hoa lẫn lá thư đều không còn.' }
            ],
            then: { flag: 'thu-luc-2', lk: 5 }
        },

        // Đạo sĩ Lao Sơn: kể chuyện Vương Sinh học lại từ chẻ củi; hỏi mặt trăng giấy trên cổng (lưu niệm trang).
        {
            id: 'thu-laoshan-1', where: 'gate', manual: true, letter: 'laoshan', guest: 'laoshan',
            when: { after: { tale: 'laoshan', days: 2 } },
            steps: [
                { say: 'note', vi: 'Một con hạc giấy đậu trên mái Sơn môn. Bạn với lấy nó, hạc giấy mở ra thành một lá thư viết bằng mực đặc.' },
                {
                    letter: {
                        from: 'laoshan',
                        lines: [
                            { zh: '崂山的老道士，问你好。', vi: 'Lão đạo sĩ núi Lao gửi lời hỏi thăm ngươi.' },
                            { zh: '王生回来了，天天砍柴。', vi: 'Vương Sinh về rồi, ngày nào cũng chẻ củi.' },
                            { zh: '他说砍柴很苦，可是他不跑了。', vi: 'Nó nói chẻ củi khổ lắm, nhưng nó không bỏ chạy nữa.' },
                            { zh: '门上的月亮还亮吗？纸做的月亮，怕雨。', vi: 'Mặt trăng trên cổng còn sáng không? Trăng làm bằng giấy, sợ mưa lắm.' }
                        ]
                    },
                    ask: 'Đọc thư lão đạo sĩ gửi.'
                },
                { read: { line: '王生回来了，天天砍柴。', vi: 'Vương Sinh về rồi, ngày nào cũng chẻ củi.' }, ask: 'Đọc dòng lão đạo sĩ kể về Vương Sinh.' },
                {
                    pay: { cost: 20, vi: 'Thư gửi lên núi Lao phải gấp thành hạc giấy. Mua một tờ giấy dai và một thỏi mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '王生一定会学好的。', vi: 'Vương Sinh nhất định sẽ học tới nơi.', ok: true,
                            reply: { zh: '呵呵，砍完一千担柴再说。', vi: 'Ha ha, chẻ xong một nghìn gánh củi rồi hẵng nói.' } },
                        { zh: '月亮还很亮，我每天晚上都看。', vi: 'Mặt trăng vẫn sáng lắm, tối nào tôi cũng ngắm.', ok: true,
                            reply: { zh: '好。读书的时候，它给你照亮。', vi: 'Tốt. Lúc đọc sách, nó soi cho ngươi.' } },
                        { zh: '我也想学穿墙。', vi: 'Tôi cũng muốn học xuyên tường.', ok: true,
                            reply: { zh: '哈哈，你先学完一千五百个字吧。', vi: 'Ha ha, ngươi học xong một nghìn năm trăm chữ trước đã.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn gấp thư trả lời thành một con hạc giấy, đặt dưới mặt trăng giấy trên cột cổng. Đêm ấy có tiếng cánh vỗ rất khẽ.' }
            ],
            then: { flag: 'thu-laoshan-1', lk: 5 }
        },
        {
            id: 'thu-laoshan-2', where: 'gate', manual: true, letter: 'laoshan', guest: 'laoshan',
            when: { flag: 'thu-laoshan-1', after: { tale: 'laoshan', days: 9 } },
            steps: [
                { say: 'note', vi: 'Hạc giấy lại đến, lần này đậu ngay trên bậc đá Sơn môn. Cánh nó dính mấy vụn mùn cưa.' },
                {
                    letter: {
                        from: 'laoshan',
                        lines: [
                            { zh: '你的信，王生也念了。', vi: 'Thư của ngươi, Vương Sinh cũng đọc rồi.' },
                            { zh: '他说，学字和砍柴一样，要一天一天来。', vi: 'Nó nói học chữ cũng như chẻ củi, phải từng ngày một.' },
                            { zh: '他现在会写自己的名字了。', vi: 'Giờ nó viết được tên mình rồi.' },
                            { zh: '学，没有近路。可是有朋友，路就不远了。', vi: 'Học thì không có đường tắt. Nhưng có bạn, đường sẽ không còn xa.' }
                        ]
                    },
                    ask: 'Đọc thư lão đạo sĩ gửi.'
                },
                { read: { line: '他现在会写自己的名字了。', vi: 'Giờ nó viết được tên mình rồi.' }, ask: 'Đọc dòng kể về Vương Sinh.' },
                {
                    pay: { cost: 30, vi: 'Lần này bạn gửi kèm một tờ chữ mẫu cho Vương Sinh tập viết. Mua thêm giấy và mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '请王生来喝茶。', vi: 'Mời Vương Sinh đến uống trà.', ok: true,
                            reply: { zh: '呵呵，砍完柴，他就来。', vi: 'Ha ha, chẻ xong củi là nó đến.' } },
                        { zh: '我也一天一天学。', vi: 'Tôi cũng học từng ngày một.', ok: true,
                            reply: { zh: '好，这就是道。', vi: 'Tốt, thế chính là đạo.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn đọc lại câu cuối thư rồi cất lá thư dưới mặt trăng giấy trên cột cổng.' }
            ],
            then: { flag: 'thu-laoshan-2', lk: 5 }
        },

        // Hoa Cô Tử: hỏi gói thảo dược ở cửa bếp (lưu niệm thuoc), nhờ hỏi thăm Lão Quy.
        {
            id: 'thu-huagu-1', where: 'gate', manual: true, letter: 'huagu', guest: 'huagu',
            when: { after: { tale: 'huagu', days: 2 } },
            steps: [
                { say: 'note', vi: 'Sáng sớm, dưới cổng Sơn môn có một gói lá thơm, bên trong là lá thư gấp gọn. Trên bậc đá còn mấy dấu chân hươu nhỏ.' },
                {
                    letter: {
                        from: 'huagu',
                        lines: [
                            { zh: '我是花姑子。林子里的夜，冷了。', vi: 'Ta là Hoa Cô Tử. Đêm trong rừng đã lạnh rồi.' },
                            { zh: '厨房门口的药草，还香吗？', vi: 'Gói thuốc ở cửa bếp còn thơm không?' },
                            { zh: '冷的时候，你和老龟爷爷都要喝药茶。', vi: 'Lúc lạnh, ngươi với ông Lão Quy đều phải uống trà thảo dược nhé.' },
                            { zh: '请你替我问老龟爷爷好。', vi: 'Nhờ ngươi hỏi thăm ông Lão Quy giúp ta.' }
                        ]
                    },
                    ask: 'Đọc thư Hoa Cô Tử gửi.'
                },
                { read: { line: '厨房门口的药草，还香吗？', vi: 'Gói thuốc ở cửa bếp còn thơm không?' }, ask: 'Đọc dòng Hoa Cô Tử hỏi về gói thuốc.' },
                {
                    pay: { cost: 20, vi: 'Hoa Cô Tử thích giấy thơm mùi cỏ cây. Mua một tờ giấy dó và một thỏi mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '药草还很香。谢谢你。', vi: 'Gói thuốc vẫn thơm lắm. Cảm ơn cô.', ok: true,
                            reply: { zh: '不用谢。是老龟爷爷先救了我。', vi: 'Không cần cảm ơn. Là ông Lão Quy cứu ta trước.' } },
                        { zh: '林子里冷，你也要小心。', vi: 'Trong rừng lạnh, cô cũng phải giữ gìn.', ok: true,
                            reply: { zh: '我有很厚的毛，不怕冷。', vi: 'Ta có bộ lông dày, không sợ lạnh.' } },
                        { zh: '小心猎人的网。', vi: 'Coi chừng lưới thợ săn.', ok: true,
                            reply: { zh: '嗯，我现在跑得很快。', vi: 'Ừm, giờ ta chạy nhanh lắm.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn gói thư trả lời vào mấy chiếc lá thơm, đặt dưới cổng. Sáng hôm sau, gói lá đã biến mất.' }
            ],
            then: { flag: 'thu-huagu-1', lk: 5 }
        },
        {
            id: 'thu-huagu-2', where: 'gate', manual: true, letter: 'huagu', guest: 'huagu',
            when: { flag: 'thu-huagu-1', after: { tale: 'huagu', days: 9 } },
            steps: [
                { say: 'note', vi: 'Lần này, cạnh cổng Sơn môn có một bó cỏ thuốc buộc lạt. Kẹp trong bó cỏ là lá thư của Hoa Cô Tử.' },
                {
                    letter: {
                        from: 'huagu',
                        lines: [
                            { zh: '你的信很香，是药茶的香。', vi: 'Thư của ngươi thơm lắm, thơm mùi trà thảo dược.' },
                            { zh: '我在林子里找到一种新的药草，可以治咳。', vi: 'Ta tìm được trong rừng một loại thuốc mới, chữa được ho.' },
                            { zh: '我放了一点在信里，你可以放在茶里。', vi: 'Ta để một ít trong thư, ngươi bỏ vào trà mà uống.' },
                            { zh: '好心有好报。', vi: 'Lòng tốt sẽ được đền đáp.' },
                            { zh: '老龟爷爷救了我，我也要去救别的小鹿。', vi: 'Ông Lão Quy đã cứu ta, ta cũng sẽ đi cứu những chú hươu nhỏ khác.' }
                        ]
                    },
                    ask: 'Đọc thư Hoa Cô Tử gửi.'
                },
                { read: { line: '你的信很香，是药茶的香。', vi: 'Thư của ngươi thơm lắm, thơm mùi trà thảo dược.' }, ask: 'Đọc dòng đầu của thư.' },
                {
                    pay: { cost: 30, vi: 'Bạn muốn gói thư trả lời trong giấy thơm, như thư của cô. Mua một tờ giấy thơm và một thỏi mực.' },
                    ask: 'Mua giấy mực để viết thư trả lời.'
                },
                {
                    choose: [
                        { zh: '我会用你的药草做茶。', vi: 'Tôi sẽ dùng thuốc của cô để pha trà.', ok: true,
                            reply: { zh: '嗯，一次放一点就够了。', vi: 'Ừm, mỗi lần bỏ một chút là đủ.' } },
                        { zh: '你也是好心的鹿。', vi: 'Cô cũng là một con hươu tốt bụng.', ok: true,
                            reply: { zh: '嘻，是你们先对我好。', vi: 'Hì, là các ngươi tốt với ta trước.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn bỏ mấy lá thuốc trong thư vào hũ trà thảo dược. Cả Sơn môn thoảng mùi rừng sau mưa.' }
            ],
            then: { flag: 'thu-huagu-2', lk: 5 }
        },

        // Sách của Như Ngọc (lưu niệm sach): 6 trang, mỗi trang một câu cổ về việc học; trang sau mở theo độ phủ đọc,
        // mỗi trang thêm 2 %. Dòng chữ nhỏ bên lề là lời Như Ngọc viết sẵn. Đọc hết trang 6 thì Như Ngọc ghé lại (yan-ve).
        {
            id: 'sach-1', where: 'library', manual: true, book: 'sach', page: 1, guest: 'yan',
            when: { keepsake: 'sach', cover: 0.75 },
            steps: [
                { say: 'note', vi: 'Bạn mở cuốn sách Như Ngọc để lại. Trang đầu chỉ có một dòng chữ to, nét mực đã cũ. Bên lề có mấy chữ nhỏ, nét mảnh như đường kéo cắt giấy.' },
                { read: { line: '温故而知新', vi: 'Ôn cái cũ mà biết điều mới.' }, ask: 'Đọc dòng chữ to trên trang đầu (Luận Ngữ).' },
                { say: 'yan', zh: '这句话，你懂吗？', vi: 'Câu này, ngươi hiểu không?' },
                {
                    choose: [
                        { zh: '学过的字常常温习，就会懂新的东西。', vi: 'Chữ đã học thì thường ôn lại, sẽ hiểu ra điều mới.', ok: true,
                            reply: { zh: '对。温是温习，故是学过的东西。', vi: 'Đúng. 温 là ôn lại, 故 là điều đã học.' } },
                        { zh: '旧的不要了，只学新的。', vi: 'Bỏ cái cũ đi, chỉ học cái mới.', ok: false,
                            reply: { zh: '不对。不温故，就不知新。', vi: 'Không phải. Không ôn cái cũ thì chẳng biết được cái mới.' } },
                        { zh: '老故事比新故事好听。', vi: 'Chuyện cũ hay hơn chuyện mới.', ok: false,
                            reply: { zh: '这里的故，不是故事，是学过的东西。', vi: '故 ở đây không phải là câu chuyện, mà là điều đã học.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn định lật sang trang sau, nhưng trang hai còn dính chặt, như chờ bạn đọc được thêm nhiều chữ nữa.' }
            ],
            then: { flag: 'sach-1', lk: 8 }
        },
        {
            id: 'sach-2', where: 'library', manual: true, book: 'sach', page: 2, guest: 'yan',
            when: { keepsake: 'sach', flag: 'sach-1', cover: 0.77 },
            steps: [
                { say: 'note', vi: 'Trang hai mở ra. Có hai dòng chữ xếp đối nhau, dòng nào cũng lặp lại chữ 知.' },
                { read: { line: '知之为知之', vi: 'Biết thì nói là biết.' }, ask: 'Đọc dòng thứ nhất.' },
                { read: { line: '不知为不知', vi: 'Không biết thì nói là không biết.' }, ask: 'Đọc dòng thứ hai.' },
                { say: 'yan', zh: '后面还有三个字：是知也。', vi: 'Phía sau còn ba chữ nữa: thế mới là biết.' },
                {
                    choose: [
                        { zh: '知道就说知道，不知道就说不知道。', vi: 'Biết thì nói biết, không biết thì nói không biết.', ok: true,
                            reply: { zh: '对。不知道的字，就去问。', vi: 'Đúng. Chữ nào chưa biết thì đi hỏi.' } },
                        { zh: '不知道的，也要说知道。', vi: 'Không biết cũng phải nói là biết.', ok: false,
                            reply: { zh: '那就不是知，是不知了。', vi: 'Thế thì không phải là biết nữa, mà là không biết.' } }
                    ]
                },
                { say: 'note', vi: 'Dưới hai dòng chữ, Như Ngọc vẽ một dấu hỏi nhỏ bằng mực son. Trang ba vẫn còn dính.' }
            ],
            then: { flag: 'sach-2', lk: 8 }
        },
        {
            id: 'sach-3', where: 'library', manual: true, book: 'sach', page: 3, guest: 'yan',
            when: { keepsake: 'sach', flag: 'sach-2', cover: 0.79 },
            steps: [
                { say: 'note', vi: 'Trang ba vẽ một con đường núi chạy ngang qua hai giá sách.' },
                { read: { line: '读万卷书', vi: 'Đọc vạn quyển sách.' }, ask: 'Đọc vế đầu.' },
                { read: { line: '行万里路', vi: 'Đi vạn dặm đường.' }, ask: 'Đọc vế sau.' },
                { say: 'yan', zh: '书里有路，路上也有书。', vi: 'Trong sách có đường, trên đường cũng có sách.' },
                {
                    choose: [
                        { zh: '要多读书，也要多走路，多看看。', vi: 'Phải đọc nhiều sách, cũng phải đi nhiều nơi, xem nhiều điều.', ok: true },
                        { zh: '读完一万本书，才可以出门。', vi: 'Đọc xong một vạn cuốn sách mới được ra khỏi nhà.', ok: false,
                            reply: { zh: '那要读到一百岁了。读书和走路，都要。', vi: 'Thế thì phải đọc tới trăm tuổi. Đọc sách và đi đường, cả hai đều cần.' } },
                        { zh: '走路的人不用读书。', vi: 'Người đi đường không cần đọc sách.', ok: false,
                            reply: { zh: '不对。走得远的人，也要读书。', vi: 'Không phải. Người đi xa cũng phải đọc sách.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn nghĩ tới những vị khách đã rời quán đi xa. Có lẽ họ cũng đang đọc gì đó trên đường.' }
            ],
            then: { flag: 'sach-3', lk: 8 }
        },
        {
            id: 'sach-4', where: 'library', manual: true, book: 'sach', page: 4, guest: 'yan',
            when: { keepsake: 'sach', flag: 'sach-3', cover: 0.81 },
            steps: [
                { say: 'note', vi: 'Trang bốn vẽ ba hình người nhỏ đi cùng nhau. Người đi giữa cầm một cuốn sách.' },
                { read: { line: '三人行，必有我师', vi: 'Ba người cùng đi, ắt có người là thầy ta.' }, ask: 'Đọc câu dưới ba hình người (Luận Ngữ).' },
                { say: 'yan', zh: '三个人一起走，谁是我的师？', vi: 'Ba người cùng đi, ai là thầy của ta?' },
                {
                    choose: [
                        { zh: '每个人都有我可以学的地方。', vi: 'Ai cũng có chỗ để ta học.', ok: true,
                            reply: { zh: '对。老龟是你的师，小墨也是。', vi: 'Đúng. Lão Quy là thầy của ngươi, Tiểu Mặc cũng vậy.' } },
                        { zh: '三个人走路，要带一个老师。', vi: 'Ba người đi đường thì phải mang theo một thầy giáo.', ok: false,
                            reply: { zh: '哈哈，不是。是说别人身上，都有可以学的。', vi: 'Ha ha, không phải. Ý là ở người khác đều có điều đáng học.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn nhớ lại những vị khách đã ghé quán. Người nào cũng dạy bạn ít nhất một chữ.' }
            ],
            then: { flag: 'sach-4', lk: 8 }
        },
        {
            id: 'sach-5', where: 'library', manual: true, book: 'sach', page: 5, guest: 'yan',
            when: { keepsake: 'sach', flag: 'sach-4', cover: 0.83 },
            steps: [
                { say: 'note', vi: 'Trang năm vẽ một đôi giày cỏ đặt ở chân núi. Con đường phía sau dài tít lên tận mây.' },
                { read: { line: '千里之行，始于足下', vi: 'Đường đi nghìn dặm bắt đầu từ dưới chân.' }, ask: 'Đọc câu của Lão Tử dưới đôi giày cỏ.' },
                { say: 'yan', zh: '足下，就是脚下。', vi: '足下 tức là dưới chân.' },
                {
                    choose: [
                        { zh: '很远的路，也要从第一步走起。', vi: 'Đường xa mấy cũng phải đi từ bước đầu tiên.', ok: true,
                            reply: { zh: '对。你的第一步，是人、大、小、山、水。', vi: 'Đúng. Bước đầu của ngươi là nhân, đại, tiểu, sơn, thủy.' } },
                        { zh: '一千里太远了，不要走。', vi: 'Nghìn dặm xa quá, đừng đi.', ok: false,
                            reply: { zh: '不走，就一步也到不了。', vi: 'Không đi thì một bước cũng chẳng tới được.' } }
                    ]
                },
                { say: 'note', vi: 'Bạn đếm lại những chữ đã học. Hóa ra con đường của bạn đã dài lắm rồi.' }
            ],
            then: { flag: 'sach-5', lk: 8 }
        },
        {
            id: 'sach-6', where: 'library', manual: true, book: 'sach', page: 6, guest: 'yan',
            when: { keepsake: 'sach', flag: 'sach-5', cover: 0.85 },
            steps: [
                { say: 'note', vi: 'Trang cuối cùng. Giữa trang chỉ có hai dòng chữ, chừa lại rất nhiều giấy trắng.' },
                { read: { line: '活到老', vi: 'Sống đến già.' }, ask: 'Đọc vế đầu.' },
                { read: { line: '学到老', vi: 'Học đến già.' }, ask: 'Đọc vế sau.' },
                { say: 'yan', zh: '书读完了，学还没有完。', vi: 'Sách đọc xong rồi, nhưng học thì chưa xong.' },
                {
                    choose: [
                        { zh: '人老了，也还要学。', vi: 'Người già rồi cũng vẫn phải học.', ok: true,
                            reply: { zh: '对。老龟三百岁了，还在学新字。', vi: 'Đúng. Lão Quy ba trăm tuổi rồi vẫn còn học chữ mới.' } },
                        { zh: '老了，就不用学了。', vi: 'Già rồi thì không cần học nữa.', ok: false,
                            reply: { zh: '不对。老了，也可以学。', vi: 'Không phải. Già rồi vẫn học được.' } }
                    ]
                },
                { say: 'note', vi: 'Dưới hai dòng chữ có một dòng nhỏ của Như Ngọc: "Đọc hết rồi thì gặp lại." Một đêm nào đó, Như Ngọc sẽ ghé lại Tàng Kinh Các.' }
            ],
            then: { flag: 'sach-6', lk: 8 }
        }
    ],

    // ---------- truyện khách đêm ----------
    // Mỗi đêm mở tối đa một truyện (QuyVanCore.ensureNight): truyện dở trước, rồi truyện đủ điều kiện when.
    // chars: cuộn chữ của truyện, 10 chữ, mở khi xong truyện (then.learn của cảnh cuối); mỗi chữ có trong
    // lời thoại của truyện và không thuộc cuộn truyện khác. sprite trùng guests[guest].sprite.
    // tone: 'buon' cho phép kết chia ly, câu đáp lạnh khi chọn ác; 'nhe' giữ giọng vui của khách quen.
    tales: [
        {
            id: 'bach', guest: 'bach', zh: '白秋练', name: 'Bạch Thu Luyện', tone: 'buon', place: 'pond',
            sprite: { human: 'lady-white', 'true': 'fish-white' },
            chars: ['诗', '念', '举', '望', '低', '思', '故', '乡', '秋', '练'],
            keepsake: 'tho', when: { night: true, repair: 'den', caught: 5 },
            scenes: ['bach-1', 'bach-2'],
            yi: { zh: '诗可医心。', vi: 'Thơ có thể chữa lòng.' }
        },
        {
            id: 'ta', guest: 'ta', zh: '小谢', name: 'Tiểu Tạ', tone: 'nhe', place: 'library',
            sprite: { human: 'girl-pale', 'true': 'girl-pale-ghost' },
            chars: ['鬼', '写', '教', '学', '错', '怕', '笔', '纸', '亦', '会'],
            keepsake: 'but', when: { night: true, repair: 'den', scrolls: 12 },
            scenes: ['ta-1', 'ta-2'],
            yi: { zh: '鬼亦好{hiếu}学。', vi: 'Quỷ cũng ham học.' }
        },
        {
            id: 'luc', guest: 'luc', zh: '绿衣女', name: 'Lục Y Nữ', tone: 'nhe', place: 'study',
            sprite: { human: 'girl-green', 'true': 'bee' },
            chars: ['衣', '唱', '歌', '救', '蛛', '网', '蜜', '虫', '恩', '谢'],
            keepsake: 'mat', when: { night: true, repair: 'den', scrolls: 8 },
            scenes: ['luc-1', 'luc-2'],
            yi: { zh: '小虫知恩。', vi: 'Côn trùng nhỏ bé cũng biết ơn.' }
        },
        // Đợt C (docs/plans/2026-10-13-quy-van-batch-c-design.md): cuộn chữ lấy trong dải hạng 80–500 của bộ chữ,
        // dải chữ hay gặp mà trước đợt này chưa cảnh nào dùng. cast: người nói thêm trong truyện.
        {
            id: 'wang', guest: 'wang', zh: '王六郎', name: 'Vương Lục Lang', tone: 'buon', place: 'pond',
            sprite: { human: 'boy-blue', 'true': 'boy-ghost' },
            chars: ['王', '已', '经', '着', '带', '让', '为', '之', '神', '手'],
            keepsake: 'mieu', when: { night: true, repair: 'den', tale: 'bach', caught: 12 },
            scenes: ['wang-1', 'wang-2'],
            yi: { zh: '不忍之心，可以为神。', vi: 'Lòng không nỡ hại người có thể làm nên thần.' }
        },
        {
            id: 'huapi', guest: 'huapi', zh: '画皮', name: 'Họa Bì', tone: 'buon', place: 'gate',
            sprite: { human: 'lady-red', 'true': 'demon-green' },
            chars: ['画', '皮', '美', '脸', '眼', '笑', '张', '进', '面', '色'],
            keepsake: 'phu', when: { night: true, repair: 'den', scrolls: 18, flag: 'mac-3' },
            scenes: ['huapi-1', 'huapi-2'], cast: ['tieu-mac'],
            yi: { zh: '美在心，不在皮。', vi: 'Đẹp ở lòng, không ở lớp da.' }
        },
        {
            id: 'xiangyu', guest: 'xiangyu', zh: '香玉', name: 'Hương Ngọc', tone: 'nhe', place: 'garden',
            sprite: { human: 'girl-white', 'true': 'peony-white' },
            chars: ['香', '玉', '雪', '她', '和', '冷', '起', '些', '叶', '根'],
            keepsake: 'hoa', when: { night: true, repair: 'den', scrolls: 14 },
            scenes: ['xiangyu-1', 'xiangyu-2'], cast: ['jiangxue'],
            yi: { zh: '花知人心。', vi: 'Hoa cũng biết lòng người.' }
        },
        // Đợt C phần 2 (docs/plans/2026-10-13-quy-van-batch-c2-design.md). cover: độ phủ đọc tối thiểu (ctx.cover).
        {
            id: 'lianso', guest: 'lianso', zh: '连琐', name: 'Liên Tỏa', tone: 'buon', place: 'pavilion',
            sprite: { human: 'girl-grey', 'true': 'girl-grey-ghost' },
            chars: ['连', '琐', '东', '西', '半', '黑', '别', '音', '难', '雨'],
            keepsake: 'doi', when: { night: true, repair: 'den', scrolls: 22 },
            scenes: ['lianso-1', 'lianso-2'],
            yi: { zh: '知音难得。', vi: 'Tri âm khó tìm.' }
        },
        {
            id: 'yan', guest: 'yan', zh: '颜如玉', name: 'Nhan Như Ngọc', tone: 'nhe', place: 'library',
            sprite: { human: 'lady-paper', 'true': 'paper-doll' },
            chars: ['颜', '如', '而', '常', '温', '习', '考', '本', '完', '忘'],
            keepsake: 'sach', when: { night: true, repair: 'den', cover: 0.75 },
            scenes: ['yan-1', 'yan-2'],
            yi: { zh: '读书在心，不在多。', vi: 'Đọc sách cốt ở lòng, không ở nhiều.' }
        },
        // Đợt D (docs/plans/2026-10-14-quy-van-batch-d-design.md): lấp quãng giữa Liên Tỏa (22 cuộn) và Nhan Như Ngọc
        // (độ phủ 75 %, khoảng cuộn 102). Mốc 50/60/70 % rơi vào khoảng cuộn 33, 51, 80 khi học theo thứ tự.
        {
            id: 'laoshan', guest: 'laoshan', zh: '崂山道士', name: 'Đạo sĩ Lao Sơn', tone: 'nhe', place: 'gate',
            sprite: { human: 'taoist-old', 'true': 'crane' },
            chars: ['法', '路', '师', '坐', '近', '穿', '术', '亮', '苦', '墙'],
            keepsake: 'trang', when: { night: true, repair: 'den', cover: 0.5 },
            scenes: ['laoshan-1', 'laoshan-2'], cast: ['wangsheng'],
            yi: { zh: '学，没有近路。', vi: 'Học không có đường tắt.' }
        },
        {
            id: 'huagu', guest: 'huagu', zh: '花姑子', name: 'Hoa Cô Tử', tone: 'nhe', place: 'garden',
            sprite: { human: 'girl-fawn', 'true': 'fawn' },
            chars: ['找', '爷', '拿', '记', '认', '药', '掉', '抓', '鹿', '暖'],
            keepsake: 'thuoc', when: { night: true, repair: 'den', cover: 0.6 },
            scenes: ['huagu-1', 'huagu-2'], cast: ['lao-quy'],
            yi: { zh: '好心有好报。', vi: 'Lòng tốt sẽ được đền đáp.' }
        },
        {
            id: 'xiaoqian', guest: 'xiaoqian', zh: '聂小倩', name: 'Nhiếp Tiểu Thiến', tone: 'buon', place: 'study',
            sprite: { human: 'lady-qian', 'true': 'lady-qian-ghost' },
            chars: ['非', '杨', '久', '送', '块', '告', '骨', '守', '答', '灯'],
            keepsake: 'dang', when: { night: true, repair: 'den', cover: 0.7 },
            scenes: ['xiaoqian-1', 'xiaoqian-2'],
            yi: { zh: '心正不怕鬼。', vi: 'Lòng ngay thì chẳng sợ ma.' }
        },
        {
            id: 'spring', guest: 'spring', zh: '小春', name: 'Tiểu Xuân', tone: 'vui', place: 'garden',
            sprite: { human: 'girl-fawn', 'true': 'girl-fawn' },
            chars: ['春', '风', '吹', '花', '草', '笑', '心', '乐', '生', '美'],
            keepsake: 'hoa-xuan', when: { night: true, repair: 'den', cover: 0.15 },
            scenes: ['spring-1', 'spring-2'],
            yi: { zh: '笑者，心自春。', vi: 'Người hay cười, lòng tựa mùa xuân.' }
        }
    ],

    // Lưu niệm khách đêm để lại khi xong truyện; trà và cá có need mở theo lưu niệm.
    keepsakes: {
        tho: { zh: '诗', name: 'Cuộn 静夜思', vi: 'Hai câu thơ Bạch Thu Luyện để lại. Đêm trăng ở Hồ sen có cá trắng.', tale: 'bach' },
        but: { zh: '笔', name: 'Bút của Tiểu Tạ', vi: 'Cây bút Tiểu Tạ để lại trên bàn Tàng Kinh Các. Cô đi tìm chữ mới để học.', tale: 'ta' },
        mat: { zh: '蜜', name: 'Hũ mật của Lục Y Nữ', vi: 'Quán có thêm trà mật.', tale: 'luc' },
        mieu: { zh: '庙', name: 'Miếu Thổ Địa', vi: 'Vương Lục Lang thành Thổ Địa. Miếu nhỏ bên Hồ sen luôn có một chén trà.', tale: 'wang' },
        phu: { zh: '符', name: 'Lá bùa Sơn môn', vi: 'Lá bùa bạn viết vẫn dán trên cổng Sơn môn. Họa Bì không quay lại nữa.', tale: 'huapi' },
        hoa: { zh: '花', name: 'Khóm mẫu đơn trắng', vi: 'Mẫu đơn trắng nở ở góc Vườn rau, cạnh cây trà hoa đỏ của Giáng Tuyết.', tale: 'xiangyu' },
        doi: { zh: '对', name: 'Câu đối Vọng Vân Đình', vi: 'Hai dải giấy đỏ Liên Tỏa dán trên cột đình: 东山月上，西水风来.', tale: 'lianso' },
        sach: { zh: '书', name: 'Cuốn sách của Nhan Như Ngọc', vi: 'Cuốn sách cô gái giấy để lại ở Tàng Kinh Các. Đọc xong thì gặp lại.', tale: 'yan' },
        trang: { zh: '月', name: 'Trăng giấy Lao Sơn', vi: 'Mặt trăng giấy lão đạo sĩ dán trên cột cổng Sơn môn. Đêm nào cũng sáng.', tale: 'laoshan' },
        thuoc: { zh: '药', name: 'Gói thảo dược', vi: 'Gói thuốc Hoa Cô Tử treo ở cửa bếp. Quán có thêm trà thảo dược.', tale: 'huagu' },
        dang: { zh: '灯', name: 'Ngọn đèn Thư trai', vi: 'Tiểu Thiến giữ giúp ngọn đèn Thư trai. Đêm nào đèn cũng sáng ấm.', tale: 'xiaoqian' },
        'hoa-xuan': { zh: '春', name: 'Xuân Tiếu Hoa', vi: 'Cành hoa xuân ngào ngạt của Tiểu Xuân. Nhắc bạn luôn vui vẻ khi học.', tale: 'spring' }
    },

    // Khách cũ ghé lại một đêm sau khi truyện của họ đã xong (đợt E): { id, guest, place, tone, form, chars, when,
    // scenes }. Lịch đêm (QuyVanCore.ensureNight) chỉ đưa khách cũ đến khi không có truyện chính nào đủ điều kiện.
    // form là hình khi ghé lại (hình người); chars là cuộn 5 chữ của lần ghé, có trong lời thoại của cảnh.
    visits: [
        {
            id: 'ta-ve', guest: 'ta', place: 'library', tone: 'nhe', form: 'human',
            chars: ['话', '觉', '整', '新', '句'],
            when: { night: true, tale: 'ta', cover: 0.46 },
            scenes: ['ta-3']
        },
        {
            id: 'luc-ve', guest: 'luc', place: 'study', tone: 'nhe', form: 'human',
            chars: ['听', '轻', '飞', '远', '慢'],
            when: { night: true, tale: 'luc', cover: 0.56 },
            scenes: ['luc-3']
        },
        {
            id: 'bach-ve', guest: 'bach', place: 'pond', tone: 'buon', form: 'human',
            chars: ['离', '流', '终', '每', '留'],
            when: { night: true, tale: 'bach', cover: 0.66 },
            scenes: ['bach-3']
        },
        // Đợt F: Nhan Như Ngọc ghé lại khi người chơi đã đọc hết sách của cô (cờ sach-6, các trang mở theo độ phủ).
        {
            id: 'yan-ve', guest: 'yan', place: 'library', tone: 'nhe', form: 'human',
            chars: ['架', '厚', '释', '卷', '遍'],
            when: { night: true, tale: 'yan', flag: 'sach-6' },
            scenes: ['yan-3']
        }
    ],

    // Câu đố chữ đêm rằm (đố đèn, đợt E): zh câu đố, vi nghĩa câu đố, ans đáp án, opts ba chữ nhiễu, parts cách
    // ghép. Đáp án không nằm trong câu đố; mọi chữ (kể cả trong parts) phải có trong bộ chữ.
    riddles: [
        { id: 'ming', zh: '一个日，一个月。', vi: 'Một mặt trời, một mặt trăng.', ans: '明', opts: ['朋', '早', '星'], parts: '日 + 月' },
        { id: 'hui', zh: '大口吃小口。', vi: 'Miệng lớn nuốt miệng nhỏ.', ans: '回', opts: ['品', '日', '困'], parts: '口 nhỏ nằm trong 口 lớn' },
        { id: 'hao', zh: '一女一子。', vi: 'Một con gái, một con trai.', ans: '好', opts: ['字', '妈', '安'], parts: '女 + 子' },
        { id: 'cha', zh: '人在草木中。', vi: 'Người ở giữa cỏ và cây.', ans: '茶', opts: ['草', '休', '花'], parts: '艹 (cỏ) + 人 + 木' },
        { id: 'zao', zh: '日下有十。', vi: 'Dưới mặt trời có chữ mười.', ans: '早', opts: ['星', '古', '明'], parts: '日 + 十' },
        { id: 'jian', zh: '门里有日。', vi: 'Trong cửa có mặt trời.', ans: '间', opts: ['问', '闪', '闻'], parts: '门 + 日' },
        { id: 'wen', zh: '门里有口。', vi: 'Trong cửa có cái miệng.', ans: '问', opts: ['间', '闪', '回'], parts: '门 + 口' },
        { id: 'cong', zh: '两个人。', vi: 'Hai người.', ans: '从', opts: ['众', '大', '天'], parts: '人 + 人' },
        { id: 'lin', zh: '两个木。', vi: 'Hai cái cây.', ans: '林', opts: ['森', '相', '休'], parts: '木 + 木' },
        { id: 'ti', zh: '人之本。', vi: 'Cái gốc của con người.', ans: '体', opts: ['休', '位', '本'], parts: '人 (viết gọn bên trái) + 本' },
        { id: 'xing', zh: '日在生上。', vi: 'Mặt trời ở trên chữ sinh.', ans: '星', opts: ['明', '早', '生'], parts: '日 + 生' },
        { id: 'xiang', zh: '一木一目。', vi: 'Một cái cây, một con mắt.', ans: '相', opts: ['林', '休', '想'], parts: '木 + 目' },
        { id: 'xin', zh: '人言。', vi: 'Lời của người.', ans: '信', opts: ['位', '说', '体'], parts: '人 (viết gọn bên trái) + 言 (lời)' },
        { id: 'he', zh: '一人一口。', vi: 'Một người, một cái miệng.', ans: '合', opts: ['回', '会', '吗'], parts: '人 + 一 + 口' },
        { id: 'si', zh: '十口一心。', vi: 'Mười cái miệng, một trái tim.', ans: '思', opts: ['想', '田', '古'], parts: '田 (口 + 十) + 心' },
        { id: 'ma', zh: '马会开口。', vi: 'Con ngựa biết mở miệng.', ans: '吗', opts: ['妈', '马', '问'], parts: '口 + 马' },
        { id: 'xian', zh: '人在山边。', vi: 'Người ở bên núi.', ans: '仙', opts: ['出', '山', '休'], parts: '人 (viết gọn bên trái) + 山' },
        { id: 'zhong', zh: '三个人。', vi: 'Ba người.', ans: '众', opts: ['从', '品', '森'], parts: '人 + 人 + 人' },
        { id: 'na', zh: '一人一张口，口下长{trưởng}只{chích}手。', vi: 'Một người một cái miệng, dưới miệng mọc ra một bàn tay.', ans: '拿', opts: ['合', '手', '会'], parts: '合 (人 + 一 + 口) + 手' },
        { id: 'ye', zh: '加土是地，加人是他。', vi: 'Thêm đất thành chữ địa, thêm người thành chữ tha.', ans: '也', opts: ['他', '地', '她'], parts: '土 + 也 = 地; 人 (viết gọn) + 也 = 他' },
        { id: 'pang', zh: '半个月亮。', vi: 'Nửa vầng trăng.', ans: '胖', opts: ['朋', '半', '明'], parts: '月 + 半' },
        { id: 'peng', zh: '两个月亮。', vi: 'Hai vầng trăng.', ans: '朋', opts: ['明', '胖', '林'], parts: '月 + 月' },
        { id: 'jing', zh: '七十二小时。', vi: 'Bảy mươi hai giờ.', ans: '晶', opts: ['品', '明', '星'], parts: '日 + 日 + 日 (72 giờ là ba ngày)' },
        { id: 'jian2', zh: '上小下大。', vi: 'Trên nhỏ, dưới lớn.', ans: '尖', opts: ['大', '小', '尘'], parts: '小 + 大' },
        { id: 'pin', zh: '三个口。', vi: 'Ba cái miệng.', ans: '品', opts: ['回', '晶', '众'], parts: '口 + 口 + 口' },
        { id: 'shan', zh: '门里有人。', vi: 'Trong cửa có người.', ans: '闪', opts: ['问', '间', '们'], parts: '门 + 人' },
        { id: 'hua', zh: '种花要除草，一人来一刀。', vi: 'Trồng hoa phải nhổ cỏ, một người đến với một con dao.', ans: '化', opts: ['花', '草', '什'], parts: '花 bỏ 艹 (cỏ) thì còn 化: một người và một con dao' },
        { id: 'gao', zh: '一口咬掉牛尾巴。', vi: 'Một miệng cắn đứt đuôi con trâu.', ans: '告', opts: ['牛', '吃', '名'], parts: '牛 bỏ đuôi + 口' },
        { id: 'deng', zh: '火边有个丁。', vi: 'Bên lửa có chữ đinh.', ans: '灯', opts: ['火', '打', '伙'], parts: '火 + 丁' },
        { id: 'xiu', zh: '人在木边。', vi: 'Người ở bên cây.', ans: '休', opts: ['林', '体', '仙'], parts: '人 (viết gọn bên trái) + 木' },
        { id: 'sen', zh: '三个木。', vi: 'Ba cái cây.', ans: '森', opts: ['林', '品', '众'], parts: '木 + 木 + 木' },
        { id: 'hu', zh: '一个古，一个月。', vi: 'Một chữ cổ, một chữ nguyệt.', ans: '胡', opts: ['朋', '明', '古'], parts: '古 + 月' },
        { id: 'zhang', zh: '立在上，早在下。', vi: 'Chữ lập ở trên, chữ tảo ở dưới.', ans: '章', opts: ['早', '音', '位'], parts: '立 + 早' },
        { id: 'an', zh: '女在屋下。', vi: 'Người con gái ở dưới mái nhà.', ans: '安', opts: ['好', '字', '妈'], parts: 'mái nhà + 女' },
        { id: 'zi', zh: '子在屋下。', vi: 'Đứa con ở dưới mái nhà.', ans: '字', opts: ['好', '安', '子'], parts: 'mái nhà + 子' },
        { id: 'ka', zh: '上下合一。', vi: 'Trên và dưới gộp làm một.', ans: '卡', opts: ['上', '下', '合'], parts: '上 + 下' },
        { id: 'nan', zh: '田里有力。', vi: 'Trong ruộng có sức.', ans: '男', opts: ['力', '思', '加'], parts: '田 + 力' },
        { id: 'ming2', zh: '鸟开口。', vi: 'Con chim mở miệng.', ans: '鸣', opts: ['鸟', '吗', '叫'], parts: '口 + 鸟' }
    ]
}));
