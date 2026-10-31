// Quy Vân Quán — lõi game thuần, không DOM: bộ chữ, chấm âm Hán Việt, SRS, chọn chữ khi câu cá,
// linh khí và sửa quán, điều kiện và hiệu quả của các cảnh gặp khách, lịch khách đêm (Liêu Trai).
// UMD như van-dao-core.js: test Node require được, trang web dùng window.QuyVanCore.
//
// State là JSON thuần (lưu thẳng vào localStorage); mọi hàm nhận deck/story riêng, nhận thời
// điểm `now` từ ngoài (test và chế độ ?srs=fast đổi được nhịp ôn).
// Bối cảnh ctx = { night, day: 'YYYY-MM-DD' (ngày của lịch đêm, nightDay), forceTale, cover: độ phủ đọc 0–1 } do app
// tạo, core chỉ đọc;
// hàm nào nhận ctx cũng chấp nhận thiếu ctx và coi như ban ngày.
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.QuyVanCore = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var SAVE_VERSION = 1;
    var HOUR = 3600 * 1000;

    // Khoảng ôn theo bậc, tính bằng giờ (theo WaniKani). Bậc 1–4 đang học, 5–6 đã thuộc,
    // 7 nhớ lâu, 8 khắc cốt; trả lời đúng ở bậc 8 thì thành thạo (bậc 9, không ôn nữa).
    var SRS_HOURS = [0, 4, 8, 23, 47, 167, 335, 719, 2879];
    var STAGE_DONE = 9;
    var STAGE_KNOWN = 5;
    // Lời thoại hiện âm Hán Việt trên đầu chữ chưa học và chữ vừa học (bậc 1, chưa ôn lần nào). Chữ đã ôn đúng
    // ít nhất một lần (bậc ≥ 2) thì ẩn âm, chạm để xem.
    var RUBY_HIDE_STAGE = 2;

    var RULES = {
        lkExact: 2,
        lkLoose: 1,
        lkScroll: 5,
        lkServe: 5,
        lkFish: { 1: 2, 2: 3, 3: 5 },
        fishNeed: { 1: 2, 2: 3, 3: 4 },
        fishSeconds: { 1: 40, 2: 50, 3: 60 },
        practiceAvoid: 4,
        // Nhà bếp: mang món ra được lkCook, đọc tên món đúng cả dấu thêm lkCookExact; bắt được chữ
        // Tiểu Ly tráo trong lời gọi món được lkSpot.
        lkCook: 4,
        lkCookExact: 1,
        lkSpot: 2,
        // Ôn bài ở Thư trai: chữ từ bậc followStage gõ đúng âm thì hỏi thêm một câu chọn (nghĩa hoặc điền chữ vào câu).
        followStage: 2,
        // Hàng ôn dồn: từ reviewPile chữ đến hạn trở lên thì Lão Quy nhắc ôn trước khi mở cuộn mới.
        reviewPile: 15
    };

    // Sửa quán theo thứ tự; hub = ảnh sân quán sau khi sửa xong mục đó.
    var REPAIRS = [
        { id: 'san', name: 'Treo biển, quét sân, kê bàn trà', cost: 10, hub: 1,
            note: 'Mở quán trà: khách bắt đầu ghé.' },
        { id: 'cau', name: 'Sửa cầu gỗ bên hồ sen', cost: 25, hub: 1,
            note: 'Ra được chỗ nước sâu: có cá lớn.' },
        { id: 'den', name: 'Vá đèn lồng, thắp đèn', cost: 40, hub: 2,
            note: 'Đèn sáng, khách đêm tìm được đường.' },
        { id: 'mai', name: 'Lợp lại mái ngói', cost: 60, hub: 3,
            note: 'Quy Vân Quán sửa xong.' }
    ];

    // Tô điểm đạo quán (đợt D): mua bằng linh khí sau khi lợp xong mái, theo thứ tự bất kỳ trong các món đã mở.
    // cover: độ phủ đọc tối thiểu (coverage) để mở món; giá tăng theo mốc vì từ cuộn 22 người chơi đã có
    // khoảng 1.000 linh khí và mỗi cuộn sau kiếm thêm 70–90 (docs/plans/2026-10-14-quy-van-batch-d-design.md mục 1).
    // place: nơi camera lướt tới sau khi mua.
    var DECOR = [
        { id: 'hoadang', zh: '荷灯', hv: 'hà đăng', name: 'Thả đèn hoa đăng', cover: 0.42, cost: 300, place: 'pond',
            note: 'Đêm đêm có đèn hoa sen trôi trên Hồ sen.' },
        { id: 'chuong', zh: '风铃', hv: 'phong linh', name: 'Treo chuông gió', cover: 0.48, cost: 500, place: 'hall',
            note: 'Chuông gió dưới mái Chính điện, gió qua là ngân.' },
        { id: 'cachep', zh: '锦鲤', hv: 'cẩm lý', name: 'Thả cá chép đỏ', cover: 0.55, cost: 800, place: 'pond',
            note: 'Ba con cá chép đỏ bơi trong Hồ sen.' },
        { id: 'dao', zh: '桃树', hv: 'đào thụ', name: 'Trồng cây đào', cover: 0.62, cost: 1200, place: 'gate',
            note: 'Cây đào hoa hồng bên Sơn môn, cánh hoa bay theo gió.' },
        { id: 'hac', zh: '仙鹤', hv: 'tiên hạc', name: 'Mời hạc trắng về hồ', cover: 0.68, cost: 1600, place: 'pond',
            note: 'Một con hạc trắng đứng bên Hồ sen.' }
    ];

    var STAGE_LABELS = ['Chưa học', 'Mới học', 'Mới học', 'Mới học', 'Mới học', 'Đã thuộc', 'Đã thuộc',
        'Nhớ lâu', 'Khắc cốt', 'Thành thạo'];
    var REALMS = [
        { level: 1, name: 'Phàm Nhân Tạp Dịch', title: 'Tạp Dịch', minExp: 0, maxExp: 50, icon: '🪵', desc: 'Vương Lâm (Thiết Trụ) vừa bước lên Hằng Nhạc Phái, làm tạp dịch gánh nước chẻ củi, may mắn nhặt được Thiên Nghịch Châu trong sơn động.' },
        { level: 2, name: 'Ngưng Khí Tầng 1 - 5', title: 'Ngưng Khí', minExp: 50, maxExp: 150, icon: '🌱', desc: 'Tư Đồ Nam trong Thiên Nghịch Châu tỉnh giấc, chỉ điểm hô hấp thổ nạp, linh khí nhập thể đan điền.' },
        { level: 3, name: 'Ngưng Khí Tầng 6 - 10', title: 'Ngưng Khí', minExp: 150, maxExp: 350, icon: '📜', desc: 'Luyện thành dẫn lực thuật, ngự sử phi kiếm gỗ, mở rộng thần thức nhận biết vạn vật xung quanh.' },
        { level: 4, name: 'Ngưng Khí Đỉnh Phong (Tầng 11-15)', title: 'Đỉnh Phong', minExp: 350, maxExp: 650, icon: '⚔️', desc: 'Tham gia tông môn đại tỷ Hằng Nhạc Phái, đoạt Trúc Cơ Đan, chuẩn bị xung kích Trúc Cơ.' },
        { level: 5, name: 'Trúc Cơ Sơ Kỳ', title: 'Trúc Cơ', minExp: 650, maxExp: 1100, icon: '🏮', desc: 'Đan điền hóa dịch, kinh mạch mở rộng, bước vào con đường nghịch thiên cải mệnh thực thụ.' },
        { level: 6, name: 'Trúc Cơ Viên Mãn', title: 'Trúc Cơ', minExp: 1100, maxExp: 1800, icon: '💎', desc: 'Dấn thân vào Tu Ma Hải, luyện chế Huyết Kiếm và Hồn Phiên, kinh nghiệm sinh tử phong phú.' },
        { level: 7, name: 'Kết Đan Kỳ (Cực Cảnh)', title: 'Kết Đan', minExp: 1800, maxExp: 2800, icon: '⚡', desc: 'Dung hợp thiên kiếp lôi đình, sinh ra Cực Cảnh Thần Thức vô địch đồng cấp, sát phạt quyết đoán!' },
        { level: 8, name: 'Nguyên Anh Kỳ', title: 'Nguyên Anh', minExp: 2800, maxExp: 4200, icon: '🏯', desc: 'Ngưng kết Nguyên Anh, nhục thân dù nát hồn vẫn bất diệt, xưng bá một phương tại Triệu Quốc.' },
        { level: 9, name: 'Hóa Thần Kỳ (Hóa Phàm)', title: 'Hóa Thần', minExp: 4200, maxExp: 5800, icon: '🌸', desc: 'Trở về nhân gian làm người thợ khắc gỗ, ngộ ra Sinh Tử Ý Cảnh: Sinh là điểm đầu của Tử, Tử là điểm về của Sinh.' },
        { level: 10, name: 'Anh Biến Kỳ', title: 'Anh Biến', minExp: 5800, maxExp: 7500, icon: '🔥', desc: 'Hấp thu tiên khí, chuyển hóa ma khí thành tiên lực, đặt chân lên vũ trụ tinh không Chu Tước Tinh.' },
        { level: 11, name: 'Vấn Đỉnh Kỳ (Chu Tước Tử)', title: 'Vấn Đỉnh', minExp: 7500, maxExp: 9000, icon: '🦅', desc: 'Kế thừa Chu Tước Thần Đạo, chấp chưởng phong vân Chu Tước Tinh, chuẩn bị phá toái hư không.' },
        { level: 12, name: 'Đệ Nhị Bộ: Khuy Niết - Tịnh Niết - Toái Niết', title: 'Toái Niết', minExp: 9000, maxExp: 10200, icon: '🌌', desc: 'Tung hoành La Thiên Tinh Vực, ngộ Chân Giả Ý Cảnh và Nhân Quả Ý Cảnh, sáng tạo Tàn Dạ thần thông.' },
        { level: 13, name: 'Đệ Tam Bộ: Không Niết - Không Linh - Không Huyền', title: 'Không Huyền', minExp: 10200, maxExp: 10800, icon: '🔮', desc: 'Vượt qua hư vô bản nguyên, đúc thành Cổ Thần Cửu Tinh, thần thông chấn động Giới Nội Giới Ngoại.' },
        { level: 14, name: 'Không Kiếp Kỳ / Đại Thiên Tôn', title: 'Thiên Tôn', minExp: 10800, maxExp: 11091, icon: '👑', desc: 'Đỉnh phong Tiên Cương Đại Lục, chúa tể quy tắc càn khôn vạn vật, bước chân tới cánh cửa Đạp Thiên.' },
        { level: 15, name: 'Đạp Thiên Cảnh (Cực Đạo Đỉnh Phong - 11092 từ HSK 9)', title: 'Đạp Thiên', minExp: 11092, maxExp: 999999, icon: '🌟', desc: 'Cửu Khinh Đạp Thiên, nghịch chuyển luân hồi cứu Lý Mộ Uyển! Nắm giữ trọn vẹn 11,092 từ Hán ngữ HSK 9 tối cao!' }
    ];

    function getRealm(exp) {
        var e = Math.max(0, exp || 0);
        for (var i = REALMS.length - 1; i >= 0; i--) {
            if (e >= REALMS[i].minExp) return REALMS[i];
        }
        return REALMS[0];
    }


    // ---------- chữ quốc ngữ ----------

    var TONE_MARKS = '̣̀́̃̉';
    var COMBINING = /[̀-ͯ]/g;
    var HAS_COMBINING = /[̀-ͯ]/;
    var CJK = /[㐀-䶿一-鿿]/;

    function nfc(s) {
        return String(s == null ? '' : s).normalize('NFC');
    }

    // Bỏ mọi dấu (cả mũ, móc, trăng), đ → d: "thủy" → "thuy".
    function looseKey(s) {
        return nfc(s).toLowerCase().normalize('NFD').replace(COMBINING, '')
            .replace(/đ/g, 'd').replace(/[^a-z]+/g, '');
    }

    // i và y cuối âm tiết là hai cách viết của cùng một âm: sau phụ âm ("lý" = "lí") và sau qu ("quý" = "quí").
    // Dùng cho cả khóa có dấu (syllKey) và khóa bỏ dấu khi chấm âm.
    function yFold(base) {
        if (/^[bcdghklmnpqrstvxđ]+y$/.test(base)) return base.slice(0, -1) + 'i';
        if (base === 'quy') return 'qui';
        return base;
    }

    // Khóa so âm có dấu: giữ dấu mũ/móc/trăng và đ, ghi thanh thành số ở cuối, không phụ thuộc vị
    // trí đặt dấu ("thuỷ" = "thủy") và coi i/y cuối như nhau ("lý" = "lí", "quý" = "quí").
    function syllKey(s) {
        var d = nfc(s).toLowerCase().trim().normalize('NFD');
        var tone = 0;
        var base = '';
        for (var i = 0; i < d.length; i++) {
            var t = TONE_MARKS.indexOf(d[i]);
            if (t >= 0) tone = t + 1;
            else base += d[i];
        }
        base = yFold(base.normalize('NFC').replace(/[^a-zà-ỹđ]+/g, ''));
        return base + tone;
    }

    function hasMarks(s) {
        var d = nfc(s).normalize('NFD');
        return HAS_COMBINING.test(d) || /[Đđ]/.test(s);
    }

    // Người gõ kiểu Telex/VNI mà bàn phím không bỏ dấu: "thuyr", "thuy3", "dduwowngf".
    // Âm tiết tiếng Việt không bao giờ kết thúc bằng s f r x j, nên chữ cuối đó là phím dấu.
    function telexLoose(s) {
        var t = nfc(s).toLowerCase().replace(/[0-9]+/g, '');
        t = t.replace(/dd/g, 'd').replace(/aa|aw/g, 'a').replace(/ee/g, 'e').replace(/oo|ow/g, 'o')
            .replace(/uw/g, 'u').replace(/w/g, 'u');
        t = t.replace(/[sfrxj]$/, '');
        return looseKey(t);
    }

    function cleanInput(s) {
        return nfc(s).toLowerCase().replace(/[^a-zÀ-ỹđ\s]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // ---------- bộ chữ ----------

    function indexDeck(raw) {
        var list = [];
        var byChar = {};
        var rows = String(raw.chars || '').split('\n');
        for (var i = 0; i < rows.length; i++) {
            if (!rows[i]) continue;
            var f = rows[i].split('|');
            var ex = [];
            if (f[5]) {
                var parts = f[5].split(';');
                for (var j = 0; j < parts.length; j++) {
                    var kv = parts[j].split(':');
                    if (kv[0] && kv[1]) ex.push({ w: kv[0], r: kv[1] });
                }
            }
            var entry = {
                ch: f[0],
                hv: f[1],
                alts: f[2] ? f[2].split(',') : [],
                py: f[3] || '',
                m: f[4] || '',
                ex: ex,
                n: Number(f[6]) || 0,
                note: f[7] || '',
                idx: list.length
            };
            list.push(entry);
            byChar[entry.ch] = entry;
        }
        return {
            list: list,
            byChar: byChar,
            total: Number(raw.total) || 1,
            scrollSize: raw.scrollSize || 5,
            curatedScrolls: raw.curatedScrolls || 0
        };
    }

    // Câu ví dụ của thẻ học (quy-van-examples.js, dựng bằng tools/quy-van/build-examples.mjs):
    // mỗi dòng chữ|câu|bản dịch|từ trong bản dịch ứng với chữ đó. Thiếu file thì không chữ nào có câu.
    function indexExamples(raw) {
        var byChar = {};
        var rows = String((raw && raw.ex) || '').split('\n');
        for (var i = 0; i < rows.length; i++) {
            var f = rows[i].split('|');
            if (!f[0] || !f[1] || !f[2]) continue;
            byChar[f[0]] = { s: f[1], vi: f[2], hl: f[3] || '' };
        }
        return { byChar: byChar };
    }

    // Gợi âm (quy-van-phonetic.js, dựng bằng tools/quy-van/build-phonetic.mjs từ Make Me a Hanzi): mỗi dòng
    // chữ|phần chỉ âm|âm của phần|mức (3 = cùng âm tiết, 2 = cùng vần). byChar: chữ → { p, r, lv }; family: phần chỉ âm →
    // các chữ có phần đó, theo thứ tự trong tệp (thứ tự bộ chữ). Thiếu tệp thì không chữ nào có gợi âm.
    function indexPhonetic(raw) {
        var byChar = {};
        var family = {};
        String((raw && raw.ph) || '').split('\n').forEach(function (line) {
            var f = line.split('|');
            if (!f[0] || !f[1] || !f[2]) return;
            byChar[f[0]] = { p: f[1], r: f[2], lv: Number(f[3]) || 0 };
            (family[f[1]] = family[f[1]] || []).push(f[0]);
        });
        return { byChar: byChar, family: family };
    }

    // Các âm được nhận của một chữ: âm hiển thị trước, rồi âm khác (chữ đa âm, cách đọc convert).
    function readingsOf(entry) {
        return [entry.hv].concat(entry.alts || []);
    }


    // ---------- Pinyin Parser & Matcher ----------
    var PINYIN_TONE_MAP = {
        'ā': ['a', 1], 'á': ['a', 2], 'ǎ': ['a', 3], 'à': ['a', 4],
        'ē': ['e', 1], 'é': ['e', 2], 'ě': ['e', 3], 'è': ['e', 4],
        'ī': ['i', 1], 'í': ['i', 2], 'ǐ': ['i', 3], 'ì': ['i', 4],
        'ō': ['o', 1], 'ó': ['o', 2], 'ǒ': ['o', 3], 'ò': ['o', 4],
        'ū': ['u', 1], 'ú': ['u', 2], 'ǔ': ['u', 3], 'ù': ['u', 4],
        'ǖ': ['v', 1], 'ǘ': ['v', 2], 'ǚ': ['v', 3], 'ǜ': ['v', 4], 'ü': ['v', 5]
    };

    function parsePinyinSyllable(s) {
        if (!s) return { base: '', tone: 5, raw: '' };
        var str = String(s).toLowerCase().trim();
        var base = '';
        var tone = 5;
        for (var i = 0; i < str.length; i++) {
            var ch = str.charAt(i);
            if (PINYIN_TONE_MAP[ch]) {
                base += PINYIN_TONE_MAP[ch][0];
                tone = PINYIN_TONE_MAP[ch][1];
            } else {
                base += ch;
            }
        }
        var m = base.match(/^([a-z]+)([1-5])$/);
        if (m) {
            base = m[1];
            tone = parseInt(m[2], 10);
        }
        base = base.replace(/u:/g, 'v').replace(/ü/g, 'v');
        return { base: base, tone: tone, raw: str };
    }

    // Chấm một lần gõ (ưu tiên Pinyin, hỗ trợ cả âm Hán Việt).
    // Pinyin hỗ trợ: 'ren2', 'rén' (exact: true); 'ren' (toneOff: true, nếu không strict thì ok: true).
    function checkReading(entry, input, opts) {
        var strict = !!(opts && opts.strict);
        var rawInput = String(input || '').trim();
        var res = { ok: false, exact: false, toneOff: false, near: false, empty: !rawInput, matched: null, expected: entry.py || entry.hv };
        if (!rawInput) return res;

        // 1. Ưu tiên kiểm tra Pinyin
        var userPy = parsePinyinSyllable(rawInput);
        if (userPy.base && entry.py) {
            var expPys = String(entry.py).split(/[,;\/]\s*/);
            for (var p = 0; p < expPys.length; p++) {
                var expPy = expPys[p].trim();
                var expParsed = parsePinyinSyllable(expPy);
                if (userPy.base === expParsed.base) {
                    if (userPy.tone === expParsed.tone || (userPy.tone === 5 && expParsed.tone === 5)) {
                        res.ok = true;
                        res.exact = true;
                        res.matched = expPy;
                        return res;
                    } else if (userPy.tone === 5) {
                        res.matched = expPy;
                        res.toneOff = true;
                        if (strict) {
                            res.near = true;
                        } else {
                            res.ok = true;
                        }
                        return res;
                    } else {
                        res.matched = expPy;
                        res.toneOff = true;
                        return res;
                    }
                }
            }
        }

        // 2. Dự phòng: Kiểm tra âm Hán Việt
        var text = cleanInput(rawInput);
        if (text) {
            var cands = readingsOf(entry);
            var key = syllKey(text);
            var i;
            for (i = 0; i < cands.length; i++) {
                if (syllKey(cands[i]) === key) {
                    res.ok = true;
                    res.exact = true;
                    res.matched = entry.py ? (entry.py + ' (' + cands[i] + ')') : cands[i];
                    return res;
                }
            }
            var lk = yFold(looseKey(text));
            var tk = yFold(telexLoose(text));
            for (i = 0; i < cands.length; i++) {
                var ck = yFold(looseKey(cands[i]));
                if (ck === lk || ck === tk) {
                    res.matched = entry.py ? (entry.py + ' (' + cands[i] + ')') : cands[i];
                    res.toneOff = hasMarks(text) && ck === lk;
                    if (strict) {
                        res.near = true;
                    } else {
                        res.ok = true;
                    }
                    return res;
                }
            }
        }

        return res;
    }

    // ---------- state ----------

    function newState(now) {
        return {
            v: SAVE_VERSION,
            created: now || 0,
            items: {},
            scrolls: 0,
            lk: 0,
            lkTotal: 0,
            repairs: [],
            flags: {},
            progress: {},
            friends: {},
            residents: [],
            bag: {},
            caught: {},
            // Món khách gọi trong ngày (day = ngày theo giờ máy) và số lần đã nấu từng món.
            orders: { day: '', list: [] },
            cooked: {},
            // Lớp đêm: đêm hiện tại (ngày và truyện đang mở), trạng thái từng truyện khách đêm
            // (id → { started, lastDay, form: 'human' | 'true', done }), lưu niệm khách để lại (id → true).
            night: { day: '', tale: '' },
            tales: {},
            keepsakes: {},
            // Tô điểm đã mua (id trong DECOR, theo thứ tự mua).
            decor: [],
            // Đêm rằm: bộ đèn của tháng đang mở (key = ngày rằm, set = id câu đố, solved = id → true, done = đã giải
            // đủ), các tháng đã giải đủ đèn (key) và số lần giải từng câu đố (id → số lần).
            ram: { key: '', set: [], solved: {}, done: false },
            ramDone: [],
            riddles: {},
            // Đối từ ở Vọng Vân Đình: xấp giấy của ngày (day = ngày theo giờ máy, set = id câu, solved và missed: id → true,
            // done = đã giải đủ) và lịch sử từng câu (id → { ok: số lần đúng ngay, miss: số lần sai, last: 'ok' | 'miss',
            // day: ngày gặp gần nhất }).
            pairs: { day: '', set: [], solved: {}, missed: {}, done: false },
            pairLog: {},
            // Học theo sách (đợt F): sách trong Reader người chơi chọn ở Thư trai, null khi chưa chọn.
            // { src: 'reader' | 'crawler', id, title, total: số chữ Hán, counts: chữ trong bộ chữ → số lần, on: cuộn kế theo sách }.
            book: null,
            // taleChars: số chữ học qua cuộn truyện của khách đêm.
            stats: { answers: 0, correct: 0, exact: 0, fish: 0, lessons: 0, served: 0, taleChars: 0 },
            // vi: hiện dòng dịch tiếng Việt trong hội thoại (người mới chưa đọc được chữ nào).
            settings: { ruby: 'auto', strict: false, pinyin: true, sfx: true, music: true, vi: true },
            exp: 0,
            dailyQuests: { day: '', list: [], claimed: false },
            achievements: {},
            streak: { days: 1, lastDay: '' }
        };
    }

    // Đọc bản lưu: thiếu trường nào thì lấy mặc định, sai phiên bản hay hỏng thì bắt đầu lại.
    function loadState(json, now) {
        var base = newState(now);
        var data = null;
        try { data = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { data = null; }
        if (!data || typeof data !== 'object' || data.v !== SAVE_VERSION) return base;
        Object.keys(base).forEach(function (key) {
            if (data[key] === undefined || data[key] === null) return;
            if (typeof base[key] === 'object' && !Array.isArray(base[key])) {
                if (typeof data[key] !== 'object' || Array.isArray(data[key])) return;
                if (key === 'stats' || key === 'settings') {
                    Object.keys(base[key]).forEach(function (k) {
                        if (data[key][k] !== undefined) base[key][k] = data[key][k];
                    });
                } else {
                    base[key] = data[key];
                }
            } else if (Array.isArray(base[key])) {
                if (Array.isArray(data[key])) base[key] = data[key];
            } else if (typeof data[key] === typeof base[key]) {
                base[key] = data[key];
            }
        });
        // Bản lưu nạp từ tệp hay mã dán có thể có mục hỏng ({"a": null}): bỏ mục không phải object, đưa số về
        // khoảng hợp lệ, để dueList và các bảng chữ không ném lỗi mỗi lần mở game.
        base.items = cleanItems(base.items);
        // Lúc học (at) có từ 16/10/2026. Chữ học trước đó mà chưa trả lời lần nào thì seen vẫn là lúc học.
        Object.keys(base.items).forEach(function (ch) {
            var it = base.items[ch];
            if (!it.at && !it.ok && !it.bad && it.seen > 0) it.at = it.seen;
        });
        // book có từ đợt F: vòng trên chép nguyên mọi object, nên kiểm hình ở đây; thiếu hay hỏng thì null.
        base.book = cleanBook(base.book, null);
        return base;
    }

    function finiteOr(v, d) {
        return typeof v === 'number' && isFinite(v) ? v : d;
    }

    // Mỗi chữ đã học là { s, due, ok, bad, seen, at? }. Giữ chữ ngoài bộ chữ hiện tại: tab chạy bản cũ của bộ chữ
    // (thiếu chữ mới thêm) không được xoá tiến độ của chữ đó khi lưu lại.
    function cleanItems(items) {
        var out = {};
        Object.keys(items || {}).forEach(function (ch) {
            var it = items[ch];
            if (!ch || !it || typeof it !== 'object' || Array.isArray(it)) return;
            it.s = Math.max(0, Math.min(STAGE_DONE, Math.round(finiteOr(it.s, 1))));
            it.due = finiteOr(it.due, 0);
            it.ok = Math.max(0, finiteOr(it.ok, 0));
            it.bad = Math.max(0, finiteOr(it.bad, 0));
            it.seen = finiteOr(it.seen, 0);
            if (it.at !== undefined && !(finiteOr(it.at, 0) > 0)) delete it.at;
            out[ch] = it;
        });
        return out;
    }

    // Chuỗi trong localStorage là bản lưu loại nào: 'empty' (chưa có), 'ok' (đúng phiên bản), 'newer' (bản game mới
    // hơn ghi, không được ghi đè), 'older' hay 'corrupt' (không đọc được: giữ một bản sao trước khi bắt đầu lại).
    // state lưu bằng JSON.stringify nên "v" đứng đầu chuỗi; đọc số đó trước, chỉ parse cả chuỗi khi đầu chuỗi lạ.
    function saveInfo(json) {
        if (json === null || json === undefined || json === '') return { kind: 'empty', v: 0 };
        var head = /^\{"v":(\d+)[,}]/.exec(String(json).slice(0, 24));
        var v = head ? Number(head[1]) : NaN;
        if (!head) {
            var data = null;
            try { data = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { data = null; }
            if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.v !== 'number') return { kind: 'corrupt', v: 0 };
            v = data.v;
        } else if (v === SAVE_VERSION) {
            try { JSON.parse(json); } catch (e) { return { kind: 'corrupt', v: v }; }
        }
        if (v > SAVE_VERSION) return { kind: 'newer', v: v };
        if (v < SAVE_VERSION) return { kind: 'older', v: v };
        return { kind: 'ok', v: v };
    }

    // Tệp bản lưu người chơi tải về hay chép đi: { app, v, exportedAt, save }.
    function exportSave(state, now) {
        return JSON.stringify({ app: 'quy-van', v: SAVE_VERSION, exportedAt: new Date(now || 0).toISOString(), save: state });
    }

    // Đọc bản lưu người chơi nạp vào (tệp exportSave hay state trần). Sai phiên bản, hỏng hay thiếu bảng chữ thì
    // trả null. loadState thì trả state mới trong các trường hợp đó, nên chỉ dùng khi mở game: dùng để nạp sẽ
    // xóa tiến độ mà không báo.
    function parseSave(json, now) {
        var data = null;
        try { data = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return null; }
        if (data && typeof data === 'object' && data.app === 'quy-van') data = data.save;
        if (!data || typeof data !== 'object' || Array.isArray(data) || data.v !== SAVE_VERSION) return null;
        if (!data.items || typeof data.items !== 'object' || Array.isArray(data.items)) return null;
        return loadState(data, now);
    }

    // Tóm tắt để người chơi so hai bản lưu trước khi thay: số chữ đã học, linh khí đang có, số lần trả lời.
    function saveSummary(state) {
        return {
            learned: Object.keys(state.items || {}).length,
            lk: state.lk || 0,
            answers: (state.stats && state.stats.answers) || 0,
            created: state.created || 0
        };
    }

    // ---------- SRS ----------

    function interval(stage, speed) {
        var h = SRS_HOURS[Math.max(1, Math.min(stage, SRS_HOURS.length - 1))];
        return h * HOUR * (speed || 1);
    }

    function stageOf(state, ch) {
        var it = state.items[ch];
        return it ? it.s : 0;
    }

    function stageLabel(stage) {
        return STAGE_LABELS[Math.max(0, Math.min(stage, STAGE_LABELS.length - 1))];
    }

    // Mỗi chữ: s bậc, due hạn ôn, ok/bad số lần đúng/sai, seen lần ôn gần nhất, at lúc học (ms). Bản lưu trước
    // 16/10/2026 không có at; loadState điền lại cho chữ chưa trả lời lần nào.
    function learnChars(state, chars, now, speed) {
        for (var i = 0; i < chars.length; i++) {
            var ch = chars[i];
            if (state.items[ch]) continue;
            state.items[ch] = { s: 1, due: now + interval(1, speed), ok: 0, bad: 0, seen: now, at: now };
        }
    }

    function dueList(state, now) {
        var out = [];
        Object.keys(state.items).forEach(function (ch) {
            var it = state.items[ch];
            if (it.s >= 1 && it.s < STAGE_DONE && it.due <= now) out.push(ch);
        });
        out.sort(function (a, b) { return state.items[a].due - state.items[b].due; });
        return out;
    }

    function nextDue(state) {
        var best = 0;
        Object.keys(state.items).forEach(function (ch) {
            var it = state.items[ch];
            if (it.s >= 1 && it.s < STAGE_DONE && (!best || it.due < best)) best = it.due;
        });
        return best;
    }

    // Chữ hay nhầm (leech): đã học, gõ sai từ 2 lần trở lên và tỷ lệ sai cao (bad * 2 > ok), ưu tiên chữ sai nhiều nhất.
    function leechList(state, limit) {
        var out = [];
        Object.keys((state && state.items) || {}).forEach(function (ch) {
            var it = state.items[ch];
            var bad = (it && it.bad) || 0;
            var ok = (it && it.ok) || 0;
            if (it && it.s >= 1 && bad >= 2 && bad * 2 > ok) out.push(ch);
        });
        out.sort(function (a, b) {
            var ia = state.items[a], ib = state.items[b];
            if ((ib.bad || 0) !== (ia.bad || 0)) return (ib.bad || 0) - (ia.bad || 0);
            if (ia.s !== ib.s) return ia.s - ib.s;
            return (ia.due || 0) - (ib.due || 0);
        });
        return limit > 0 ? out.slice(0, limit) : out;
    }

    // Các cặp chữ dễ nhầm của ch trong story.confuse (nếu có).
    function confuseOf(story, ch) {
        var out = [];
        var list = (story && story.confuse) || [];
        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            if (c.right === ch || c.wrong === ch) {
                out.push({ other: c.right === ch ? c.wrong : c.right, note: c.note, right: c.right, wrong: c.wrong });
            }
        }
        return out;
    }

    // grade: 'ok' (đúng), 'hint' (đúng nhờ gợi ý), 'bad' (sai). Chữ đến hạn mới đổi bậc.
    function review(state, ch, grade, now, speed) {
        var it = state.items[ch];
        if (!it) return null;
        var from = it.s;
        if (grade === 'ok') {
            it.s = Math.min(STAGE_DONE, it.s + 1);
            it.due = it.s >= STAGE_DONE ? 0 : now + interval(it.s, speed);
            it.ok++;
        } else if (grade === 'hint') {
            it.due = now + interval(1, speed);
            it.bad++;
        } else {
            it.s = Math.max(1, it.s - (it.s >= STAGE_KNOWN ? 2 : 1));
            it.due = now + interval(it.s, speed);
            it.bad++;
        }
        it.seen = now;
        return { ch: ch, from: from, to: it.s };
    }

    // Luyện tập chữ chưa đến hạn: không đổi bậc; sai thì kéo hạn ôn lại gần để chữ sớm quay lại.
    function practice(state, ch, grade, now, speed) {
        var it = state.items[ch];
        if (!it) return null;
        if (grade === 'ok') {
            it.ok++;
        } else {
            it.bad++;
            if (it.s < STAGE_DONE) it.due = Math.min(it.due || Infinity, now + interval(1, speed));
        }
        it.seen = now;
        return { ch: ch, from: it.s, to: it.s };
    }

    function countLearned(state, minStage) {
        var min = minStage || 1;
        var n = 0;
        Object.keys(state.items).forEach(function (ch) {
            if (state.items[ch].s >= min) n++;
        });
        return n;
    }

    // Tỉ lệ chữ Hán trong truyện (corpus mẫu) mà người chơi đã học.
    function coverage(state, deck, minStage) {
        var min = minStage || 1;
        var sum = 0;
        Object.keys(state.items).forEach(function (ch) {
            var e = deck.byChar[ch];
            if (e && state.items[ch].s >= min) sum += e.n;
        });
        return sum / deck.total;
    }

    // ---------- tra chữ đã học (Tàng Kinh Các, Sổ) ----------

    // Bỏ mọi dấu (tiếng Việt và thanh pinyin), đ → d, chữ thường; ký tự khác chữ và số thành một khoảng trắng.
    // Khác looseKey ở chỗ giữ ranh giới từ: "cất giữ" → "cat giu".
    function foldText(s) {
        return nfc(s).toLowerCase().normalize('NFD').replace(COMBINING, '')
            .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
    }

    // Các từ của một chuỗi tiếng Việt, mỗi từ { b: gốc giữ mũ, móc, trăng và đ; t: thanh '0'–'5' } như syllKey.
    function wordParts(s) {
        return nfc(s).toLowerCase().split(/[^a-zà-ỹđ]+/).filter(Boolean).map(function (w) {
            var k = syllKey(w);
            return { b: k.slice(0, -1), t: k.slice(-1) };
        });
    }

    // Cụm q nằm liền trong tw (cả hai là wordParts; q của query có dấu), bắt đầu ở đầu một từ, không phụ thuộc chỗ
    // đặt dấu thanh ("hoà" = "hòa"). Từ chưa gõ dấu thanh khớp mọi thanh; từ cuối chỉ cần là phần đầu ("lơ" khớp "lớn").
    function phraseIn(tw, q) {
        if (!q.length) return false;
        for (var i = 0; i + q.length <= tw.length; i++) {
            var ok = true;
            for (var j = 0; j < q.length && ok; j++) {
                var a = tw[i + j];
                var b = q[j];
                ok = (j === q.length - 1 ? a.b.indexOf(b.b) === 0 : a.b === b.b) && (b.t === '0' || a.t === b.t);
            }
            if (ok) return true;
        }
        return false;
    }

    // Khoá tìm của một mục bộ chữ, tính một lần (bộ chữ không đổi khi đang chơi): âm bỏ dấu, âm theo syllKey, các
    // từ của âm và của nghĩa, pinyin và nghĩa bỏ dấu.
    var entryKeyCache = typeof WeakMap === 'function' ? new WeakMap() : null;
    function entryKeys(e) {
        var k = entryKeyCache ? entryKeyCache.get(e) : null;
        if (k) return k;
        var reads = readingsOf(e);
        k = {
            loose: reads.map(looseKey),
            syll: reads.map(syllKey),
            readParts: reads.map(wordParts),
            py: foldText(e.py).replace(/[0-9]+/g, '').split(' '),
            m: ' ' + foldText(e.m) + ' ',
            mParts: wordParts(e.m)
        };
        if (entryKeyCache) entryKeyCache.set(e, k);
        return k;
    }

    // Tìm trong chars (mảng chữ, thường là chữ đã học theo thứ tự bộ chữ) theo query người chơi gõ.
    // Query có chữ Hán: lấy đúng các chữ Hán đó theo thứ tự gõ; chữ không nằm trong chars vào missing.
    // Query chữ cái: so với âm Hán Việt (âm chính và âm khác, gõ kiểu Telex cũng được), pinyin (bỏ dấu, bỏ số thanh)
    // và nghĩa (cụm từ bắt đầu ở đầu một từ). Query có dấu thì âm và nghĩa phải đúng cả dấu (không phụ thuộc chỗ đặt
    // dấu thanh); âm chỉ khớp khi bỏ dấu xếp sau cùng. Query không dấu thì so khi bỏ dấu.
    // Hạng: 0 âm khớp trọn, 1 pinyin khớp trọn, 2 âm bắt đầu bằng query, 3 nghĩa, 4 âm chỉ khớp khi bỏ dấu (query
    // có dấu), 5 pinyin bắt đầu bằng query (query không dấu, từ 2 chữ cái). Cùng hạng thì giữ thứ tự của chars.
    // Query rỗng: trả nguyên chars.
    function searchChars(deck, chars, query) {
        var text = nfc(query).trim().toLowerCase();
        if (!text) return { list: chars.slice(), missing: [] };
        var i;
        var hanzi = Array.from(text).filter(function (c) { return CJK.test(c); });
        if (hanzi.length) {
            var have = {};
            for (i = 0; i < chars.length; i++) have[chars[i]] = true;
            var list = [];
            var missing = [];
            hanzi.forEach(function (c) {
                if (list.indexOf(c) >= 0 || missing.indexOf(c) >= 0) return;
                (have[c] ? list : missing).push(c);
            });
            return { list: list, missing: missing };
        }
        var words = foldText(text);
        if (!words) return { list: [], missing: [] };
        var single = words.indexOf(' ') < 0;
        var marked = hasMarks(text);
        var exactKey = syllKey(text);
        var loose = looseKey(text);
        var telex = telexLoose(text);
        var pyQuery = words.replace(/[0-9]+/g, '');
        var markedWords = marked ? wordParts(text) : null;
        var ranked = [];
        for (i = 0; i < chars.length; i++) {
            var e = deck.byChar[chars[i]];
            if (!e) continue;
            var rank = -1;
            var k = entryKeys(e);
            // exact: âm khớp trọn (có dấu thì đúng cả dấu); near: có dấu nhưng âm chỉ khớp khi bỏ dấu.
            var exact = false;
            var near = false;
            if (single) {
                for (var r = 0; r < k.loose.length; r++) {
                    var same = k.loose[r] === loose || k.loose[r] === telex;
                    if (marked ? k.syll[r] === exactKey : same) exact = true;
                    else if (marked && same) near = true;
                }
            }
            if (exact) rank = 0;
            else if (single && pyQuery && k.py.indexOf(pyQuery) >= 0) rank = 1;
            else if (single && (markedWords
                ? k.readParts.some(function (p) { return phraseIn(p, markedWords); })
                : k.loose.some(function (x) { return x.indexOf(loose) === 0; }))) rank = 2;
            else if (markedWords ? phraseIn(k.mParts, markedWords) : k.m.indexOf(' ' + words) >= 0) rank = 3;
            else if (near) rank = 4;
            else if (!marked && single && pyQuery.length >= 2 && k.py.some(function (p) { return p.indexOf(pyQuery) === 0; })) rank = 5;
            if (rank >= 0) ranked.push({ ch: e.ch, rank: rank, at: i });
        }
        ranked.sort(function (a, b) { return a.rank - b.rank || a.at - b.at; });
        return { list: ranked.map(function (x) { return x.ch; }), missing: [] };
    }

    // Chữ đã học trong truyện của từng khách: gom then.learn của các cảnh đã xong, theo thứ tự cảnh trong story.
    // Lõi không ghi chữ học từ đâu, nên một chữ học qua cuộn trước khi gặp khách vẫn nằm trong nhóm của khách đó.
    // Trả [{ guest, chars }], bỏ khách chưa có chữ nào.
    function storyGroups(state, story) {
        var out = [];
        var byGuest = {};
        ((story && story.scenes) || []).forEach(function (sc) {
            var learn = sc.then && sc.then.learn;
            if (!learn || !sc.guest || !sceneDone(state, sc)) return;
            var g = byGuest[sc.guest];
            if (!g) {
                g = byGuest[sc.guest] = { guest: sc.guest, chars: [] };
                out.push(g);
            }
            (Array.isArray(learn) ? learn : readChars(learn)).forEach(function (ch) {
                if (state.items[ch] && g.chars.indexOf(ch) < 0) g.chars.push(ch);
            });
        });
        return out.filter(function (g) { return g.chars.length > 0; });
    }

    // ---------- ngày học ----------

    // Chữ đã học theo ngày học (giờ máy, dayKey), ngày gần nhất trước. Trong một ngày: theo lúc học, nên chữ của cùng
    // một cuộn đứng liền nhau, rồi theo thứ tự bộ chữ. Chữ không có lúc học (học trước 16/10/2026 và đã trả lời) vào
    // undated, theo thứ tự bộ chữ. Trả { days: [{ day: 'YYYY-MM-DD', chars }], undated }.
    function learnDays(state, deck) {
        var byDay = {};
        var days = [];
        var undated = [];
        function idx(ch) {
            var e = deck.byChar[ch];
            return e ? e.idx : 1e9;
        }
        Object.keys(state.items).forEach(function (ch) {
            var it = state.items[ch];
            if (!it || !(it.s >= 1)) return;
            if (!(it.at > 0)) {
                undated.push(ch);
                return;
            }
            var day = dayKey(it.at);
            if (!byDay[day]) {
                byDay[day] = { day: day, chars: [] };
                days.push(byDay[day]);
            }
            byDay[day].chars.push(ch);
        });
        days.sort(function (a, b) { return a.day < b.day ? 1 : (a.day > b.day ? -1 : 0); });
        days.forEach(function (g) {
            g.chars.sort(function (a, b) { return state.items[a].at - state.items[b].at || idx(a) - idx(b); });
        });
        undated.sort(function (a, b) { return idx(a) - idx(b); });
        return { days: days, undated: undated };
    }

    // Số chữ học trong ngày của now (giờ máy).
    function learnedOn(state, now) {
        var key = dayKey(now);
        var n = 0;
        Object.keys(state.items).forEach(function (ch) {
            var at = state.items[ch] && state.items[ch].at;
            if (at > 0 && dayKey(at) === key) n++;
        });
        return n;
    }

    // ---------- cuộn chữ ----------

    function scrollCount(deck) {
        return Math.floor(deck.list.length / deck.scrollSize);
    }

    function scrollChars(deck, index) {
        var start = index * deck.scrollSize;
        return deck.list.slice(start, start + deck.scrollSize).map(function (e) { return e.ch; });
    }

    // Số tệp dữ liệu nét (quy-van/strokes/<số>.json, dựng bằng tools/quy-van/build-strokes.mjs) chứa chữ ch: mỗi tệp
    // là scrollSize chữ liền nhau theo thứ tự bộ chữ. Chữ ngoài bộ chữ: -1.
    function strokeFile(deck, ch) {
        var e = deck.byChar[ch];
        return e ? Math.floor(e.idx / deck.scrollSize) : -1;
    }

    // ---------- học theo sách (Reader) ----------

    // Sách dưới chừng này chữ Hán thì không học theo được (setBook trả null).
    var BOOK_MIN = 20;

    // Chữ Hán khi đếm một sách: khối thống nhất, mở rộng A và chữ tương thích, như ReaderQuyVan.coverage, để thẻ sách
    // trong game và viên "Đọc được X %" của Reader tính trên cùng một tổng. Cả ba khối nằm trong BMP.
    function isHanCode(c) {
        return (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0xF900 && c <= 0xFAFF);
    }

    // Đếm chữ của một văn bản (sách TXT, các chương crawler đã lưu): total là mọi chữ Hán, counts chỉ giữ chữ có trong
    // bộ chữ (chữ → số lần). Duyệt từng mã UTF-16, không dựng mảng ký tự: một sách có thể dài vài triệu chữ.
    function textCounts(deck, text) {
        var s = String(text == null ? '' : text);
        var counts = {};
        var total = 0;
        for (var i = 0; i < s.length; i++) {
            if (!isHanCode(s.charCodeAt(i))) continue;
            total++;
            var ch = s.charAt(i);
            if (deck.byChar[ch]) counts[ch] = (counts[ch] || 0) + 1;
        }
        return { total: total, counts: counts };
    }

    // Kiểm hình một sách (bản lưu, hay sách app đưa vào setBook): sai hình hay dưới BOOK_MIN chữ Hán thì null. counts
    // chỉ giữ số lần dương; có deck thì bỏ cả chữ ngoài bộ chữ. id giữ số (khoá IndexedDB tự tăng) hay chuyển thành chuỗi.
    function cleanBook(book, deck) {
        if (!book || typeof book !== 'object' || Array.isArray(book)) return null;
        var total = Number(book.total);
        var raw = book.counts;
        if (!isFinite(total) || total < BOOK_MIN || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        var counts = {};
        Object.keys(raw).forEach(function (ch) {
            var n = Number(raw[ch]);
            if (!(n > 0) || !isFinite(n) || (deck && !deck.byChar[ch])) return;
            counts[ch] = n;
        });
        return {
            src: String(book.src || ''),
            id: typeof book.id === 'number' ? book.id : String(book.id == null ? '' : book.id),
            title: String(book.title || ''),
            total: total,
            counts: counts,
            on: book.on !== false
        };
    }

    // Chọn sách để học theo: book = { src, id, title, total, counts } (counts từ textCounts). Lọc counts theo bộ chữ,
    // bật cuộn kế theo sách. Sách dưới BOOK_MIN chữ Hán hay sai hình thì không đặt (giữ sách cũ) và trả null.
    function setBook(state, deck, book) {
        var b = cleanBook(book, deck);
        if (!b) return null;
        b.on = true;
        state.book = b;
        return b;
    }

    // Bật hay tắt lấy cuộn kế theo sách, vẫn giữ sách (thẻ sách vẫn hiện tỉ lệ). Chưa chọn sách thì null.
    function setBookOn(state, on) {
        if (!state.book) return null;
        state.book.on = !!on;
        return state.book;
    }

    function clearBook(state) {
        state.book = null;
    }

    // Tỉ lệ chữ Hán của sách mà người chơi đã học (chữ từ bậc minStage, mặc định 1), tính theo số lần gặp trong sách.
    // Chưa chọn sách thì null.
    function bookCoverage(state, minStage) {
        var b = state.book;
        if (!b || !b.counts || !(b.total > 0)) return null;
        var min = minStage || 1;
        var sum = 0;
        Object.keys(b.counts).forEach(function (ch) {
            var it = state.items[ch];
            if (it && it.s >= min) sum += b.counts[ch];
        });
        return sum / b.total;
    }

    // Chữ chưa học của sách có trong bộ chữ: gặp nhiều trước, cùng số lần thì theo thứ tự bộ chữ. Chưa chọn sách thì [].
    function bookOrder(state, deck) {
        var b = state.book;
        if (!b || !b.counts) return [];
        return Object.keys(b.counts).filter(function (ch) {
            return deck.byChar[ch] && !state.items[ch];
        }).sort(function (x, y) {
            return b.counts[y] - b.counts[x] || deck.byChar[x].idx - deck.byChar[y].idx;
        });
    }

    // Cuộn kế tiếp: tối đa scrollSize chữ chưa học. Đang học theo sách (state.book.on) thì lấy trước các chữ đầu của
    // bookOrder, thiếu thì bù theo thứ tự bộ chữ; không thì theo thứ tự bộ chữ. Chữ đã học qua cuộn truyện
    // của khách đêm thì bỏ qua, nên cuộn truyện không đẩy hàng tần suất đi chữ nào. index là số cuộn đã
    // học (gồm cả cuộn truyện và cuộn theo sách), dùng cho tiêu đề "Cuộn index + 1". src: 'book' khi có ít nhất một
    // chữ lấy từ sách, fromBook là số chữ đó; không thì 'deck' và 0. Hết chữ thì null.
    function nextScroll(state, deck) {
        var chars = [];
        var fromBook = 0;
        var i;
        if (state.book && state.book.on) {
            var order = bookOrder(state, deck);
            for (i = 0; i < order.length && chars.length < deck.scrollSize; i++) chars.push(order[i]);
            fromBook = chars.length;
        }
        for (i = 0; i < deck.list.length && chars.length < deck.scrollSize; i++) {
            var ch = deck.list[i].ch;
            if (!state.items[ch] && chars.indexOf(ch) < 0) chars.push(ch);
        }
        if (!chars.length) return null;
        return { index: state.scrolls, chars: chars, src: fromBook ? 'book' : 'deck', fromBook: fromBook };
    }

    // Học xong cuộn kế tiếp. chars là các chữ của bài học đã mở, phải đúng các chữ nextScroll đang đưa ra
    // (cùng thứ tự; đổi sách hay bật tắt công tắc giữa chừng thì lệch); khác thì không ghi gì và trả null.
    function completeScroll(state, deck, chars, now, speed) {
        var next = nextScroll(state, deck);
        if (!next || !Array.isArray(chars) || chars.join('') !== next.chars.join('')) return null;
        var index = state.scrolls;
        learnChars(state, next.chars, now, speed);
        state.scrolls++;
        state.stats.lessons++;
        gainLk(state, RULES.lkScroll);
        return { index: index, chars: next.chars, lk: RULES.lkScroll };
    }

    // Cuộn chữ của một truyện khách đêm: học các chữ có trong bộ chữ mà chưa học; chữ đã học giữ nguyên
    // bậc và hạn ôn. Tính là một cuộn đã học (state.scrolls, bài học, linh khí như cuộn thường) kể cả khi
    // không còn chữ nào mới. chars: mảng chữ (hoặc chuỗi, lấy chữ Hán qua readChars).
    function learnTale(state, deck, chars, now, speed) {
        var list = Array.isArray(chars) ? chars : readChars(chars);
        var fresh = [];
        for (var i = 0; i < list.length; i++) {
            var ch = list[i];
            if (deck.byChar[ch] && !state.items[ch] && fresh.indexOf(ch) < 0) fresh.push(ch);
        }
        learnChars(state, fresh, now, speed);
        state.scrolls++;
        state.stats.lessons++;
        state.stats.taleChars = (state.stats.taleChars || 0) + fresh.length;
        gainLk(state, RULES.lkScroll);
        return { chars: fresh, lk: RULES.lkScroll };
    }

    // ---------- chọn chữ khi câu cá / ôn ----------

    function createRng(seed) {
        return { s: (seed >>> 0) || 1 };
    }

    function rand(rng) {
        // mulberry32
        rng.s = (rng.s + 0x6D2B79F5) >>> 0;
        var t = rng.s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function randInt(rng, n) {
        return Math.floor(rand(rng) * n);
    }

    // Chữ đến hạn mà câu cá ôn được: chỉ chữ dưới bậc RULES.followStage. Từ bậc đó, Ôn bài hỏi thêm nghĩa hoặc điền
    // chữ vào câu, nên chữ đến hạn chờ ở Ôn bài (Thư trai); câu cá chỉ hỏi âm, không cho các chữ này lên bậc.
    function fishDueList(state, now) {
        return dueList(state, now).filter(function (ch) { return state.items[ch].s < RULES.followStage; });
    }

    // Câu cá: chữ đến hạn câu cá ôn được trước (mode 'due', đổi bậc SRS, xem fishDueList); hết thì luyện tập chữ đã
    // học, nghiêng về chữ bậc thấp và chữ hay sai (mode 'practice', không đổi bậc). Chữ đến hạn đang chờ Ôn bài không
    // ra luyện tập, để Ôn bài còn hỏi chữ người chơi chưa vừa thấy đáp án; chỉ khi không còn chữ nào khác.
    function pickChar(state, now, rng, avoid) {
        var recent = avoid || [];
        var due = fishDueList(state, now).filter(function (ch) { return recent.indexOf(ch) < 0; });
        if (due.length) return { ch: due[0], mode: 'due' };
        var learned = Object.keys(state.items).filter(function (ch) { return state.items[ch].s >= 1; });
        if (!learned.length) return null;
        var isDue = {};
        dueList(state, now).forEach(function (ch) { isDue[ch] = true; });
        var pool = learned.filter(function (ch) { return !isDue[ch] && recent.indexOf(ch) < 0; });
        if (!pool.length) pool = learned.filter(function (ch) { return recent.indexOf(ch) < 0; });
        if (!pool.length) pool = learned;
        var weights = pool.map(function (ch) {
            var it = state.items[ch];
            return Math.max(1, 10 - it.s) + 3 * Math.min(it.bad, 4);
        });
        var total = 0;
        for (var i = 0; i < weights.length; i++) total += weights[i];
        var r = rand(rng) * total;
        for (i = 0; i < pool.length; i++) {
            r -= weights[i];
            if (r < 0) return { ch: pool[i], mode: 'practice' };
        }
        return { ch: pool[pool.length - 1], mode: 'practice' };
    }

    // Ghi một câu trả lời: cập nhật SRS theo mode, thống kê, linh khí. Trả về sự kiện cho UI.
    // result.noLk: không cộng linh khí nhưng vẫn ghi SRS và thống kê (bước đọc trong truyện khách đêm:
    // linh khí của truyện chỉ đến từ hiệu quả của cảnh và cuộn truyện).
    function answer(state, ch, mode, result, now, speed) {
        var grade = result.ok ? (result.hint ? 'hint' : 'ok') : 'bad';
        var change = mode === 'due' ? review(state, ch, grade, now, speed) : practice(state, ch, grade, now, speed);
        state.stats.answers++;
        var lk = 0;
        if (result.ok) {
            state.stats.correct++;
            if (result.exact) state.stats.exact++;
            if (!result.hint && !result.noLk) lk = result.exact ? RULES.lkExact : RULES.lkLoose;
        }
        if (lk) gainLk(state, lk);
        return { change: change, lk: lk, grade: grade };
    }

    // ---------- câu chọn khi ôn bài: nghĩa, điền chữ vào câu ----------
    // Ôn bài ở Thư trai (app): chữ từ bậc RULES.followStage gõ đúng âm ngay lần đầu, không dùng gợi ý, thì có thêm một
    // câu chọn. App hoãn answer tới khi trả lời câu chọn, nên bậc chỉ lên khi đọc đúng âm và hiểu đúng nghĩa. Câu cá chỉ
    // gõ âm nên không ôn các chữ này (fishDueList); bài kiểm tra sau cuộn mới chỉ gõ âm (chữ mới học ở bậc 1).

    var CJK_RUN = new RegExp(CJK.source + '+', 'g');
    var CJK_PAREN = new RegExp('\\s*\\([^()]*' + CJK.source + '[^()]*\\)', 'g');
    // Chữ nhiễu bốc ngẫu nhiên trong NEAR_POOL chữ dùng được gần chữ đích nhất trong bộ chữ (độ khó gần nhau).
    var NEAR_POOL = 24;

    // Nghĩa dùng làm phương án chọn: bỏ ngoặc có chữ Hán ("gì (trong 什么)" → "gì"), rồi chữ Hán còn lại ("一起 cùng
    // nhau" → "cùng nhau"), dọn dấu phẩy, chấm phẩy thừa. Nghĩa chỉ là chú thích ngữ pháp có chữ Hán ("(trợ từ: 什么,
    // 怎么)") thành chuỗi rỗng: chữ đó không có câu hỏi nghĩa.
    function plainMeaning(m) {
        return nfc(m).replace(CJK_PAREN, '').replace(CJK_RUN, '').split(';').map(function (part) {
            return part.split(',').map(function (w) { return w.replace(/\s+/g, ' ').trim(); })
                .filter(function (w) { return /[a-zà-ỹđ0-9]/i.test(w); }).join(', ');
        }).filter(Boolean).join('; ');
    }

    // Các cụm của một nghĩa (tách theo dấu phẩy, chấm phẩy); mỗi từ thành syllKey, nên giữ dấu ("mặt" khác "mắt") mà
    // không phụ thuộc chỗ đặt dấu thanh ("hoà" = "hòa"). Tính một lần cho mỗi chuỗi nghĩa.
    var phraseCache = Object.create(null);
    function meaningPhrases(m) {
        var key = String(m == null ? '' : m);
        var out = phraseCache[key];
        if (!out) {
            out = plainMeaning(key).split(/[;,]/).map(function (p) {
                return nfc(p).toLowerCase().split(/[^a-zà-ỹđ0-9]+/).filter(Boolean).map(function (w) {
                    return /[a-zà-ỹđ]/.test(w) ? syllKey(w) : w;
                }).join(' ');
            }).filter(Boolean);
            phraseCache[key] = out;
        }
        return out;
    }

    // Hai nghĩa trùng nhau khi một cụm của nghĩa này nằm trọn trong một cụm của nghĩa kia, tính theo từ có dấu: "lớn"
    // và "to lớn", "đi" và "đi; chạy" trùng; "an" và "bàn", "mắt" và "mặt trời" không. Dùng để một câu chọn không có
    // hai phương án cùng nghĩa.
    function meaningClash(a, b) {
        var pa = meaningPhrases(a);
        var pb = meaningPhrases(b);
        for (var i = 0; i < pa.length; i++) {
            for (var j = 0; j < pb.length; j++) {
                var x = ' ' + pa[i] + ' ';
                var y = ' ' + pb[j] + ' ';
                if (x.indexOf(y) >= 0 || y.indexOf(x) >= 0) return true;
            }
        }
        return false;
    }

    function shuffleWith(rng, arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = randInt(rng, i + 1);
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    // n chữ nhiễu cho câu chọn của chữ ch. Thứ tự ưu tiên: chữ dễ nhầm với ch (opts.story.confuse) đã học; chữ đã học
    // gần ch trong bộ chữ; thiếu nữa thì chữ chưa học gần ch. Bỏ: chữ có trong opts.avoid (chuỗi), chữ trùng nghĩa với
    // ch, với opts.sense (từ dịch của ch trong câu) hay với chữ nhiễu đã chọn, và khi opts.meaning thì chữ không có nghĩa
    // dùng được (plainMeaning rỗng). Có thể trả ít hơn n chữ.
    function pickDistractors(deck, state, ch, n, rng, opts) {
        var o = opts || {};
        var target = deck.byChar[ch];
        var out = [];
        if (!target) return out;
        var avoid = o.avoid || '';
        function usable(c) {
            var e = deck.byChar[c];
            if (!e || c === ch || out.indexOf(c) >= 0 || avoid.indexOf(c) >= 0) return false;
            if (o.meaning && !plainMeaning(e.m)) return false;
            if (meaningClash(target.m, e.m) || (o.sense && meaningClash(o.sense, e.m))) return false;
            for (var i = 0; i < out.length; i++) {
                if (meaningClash(deck.byChar[out[i]].m, e.m)) return false;
            }
            return true;
        }
        function nearer(a, b) {
            var ia = deck.byChar[a].idx;
            var ib = deck.byChar[b].idx;
            return Math.abs(ia - target.idx) - Math.abs(ib - target.idx) || ia - ib;
        }
        function take(pool) {
            var cands = pool.filter(usable).sort(nearer).slice(0, NEAR_POOL);
            while (out.length < n && cands.length) {
                var c = cands.splice(randInt(rng, cands.length), 1)[0];
                if (usable(c)) out.push(c);
            }
        }
        confuseOf(o.story, ch).forEach(function (c) {
            if (out.length < n && state.items[c.other] && usable(c.other)) out.push(c.other);
        });
        if (out.length < n) take(Object.keys(state.items));
        if (out.length < n) {
            take(deck.list.map(function (e) { return e.ch; }).filter(function (c) { return !state.items[c]; }));
        }
        return out;
    }

    // Câu hỏi nghĩa: chữ ch và bốn chữ có nghĩa làm phương án (gồm ch), theo thứ tự hiện. null khi nghĩa của ch không
    // dùng được hay không đủ ba chữ nhiễu.
    function meaningQuestion(state, deck, story, ch, rng) {
        var e = deck.byChar[ch];
        if (!e || !plainMeaning(e.m)) return null;
        var others = pickDistractors(deck, state, ch, 3, rng, { story: story, meaning: true });
        if (others.length < 3) return null;
        return { kind: 'mean', ch: ch, opts: shuffleWith(rng, others.concat([ch])) };
    }

    // Câu hỏi điền chữ: câu ví dụ của ch (examples: indexExamples) bỏ trống chữ ch, bốn chữ để chọn (gồm ch). Chỉ khi ch
    // có đúng một lần trong câu và mọi chữ Hán khác trong câu đã học: câu i+1 theo thứ tự bộ chữ, nhưng chữ học sớm qua
    // truyện có thể đứng trước nhiều chữ chưa học. Chữ nhiễu không có trong câu, không trùng nghĩa với từ dịch (ex.hl).
    function clozeQuestion(state, deck, examples, story, ch, rng) {
        var x = examples && examples.byChar ? examples.byChar[ch] : null;
        if (!x || !deck.byChar[ch]) return null;
        var chars = Array.from(x.s);
        var count = 0;
        for (var i = 0; i < chars.length; i++) {
            if (chars[i] === ch) count++;
            else if (CJK.test(chars[i]) && !state.items[chars[i]]) return null;
        }
        if (count !== 1) return null;
        var others = pickDistractors(deck, state, ch, 3, rng, { story: story, avoid: x.s, sense: x.hl });
        if (others.length < 3) return null;
        return { kind: 'cloze', ch: ch, opts: shuffleWith(rng, others.concat([ch])), ex: x };
    }

    // Câu chọn hỏi thêm cho chữ ch sau khi gõ đúng âm. null nếu chữ dưới bậc RULES.followStage hay không làm được câu
    // nào. Bậc chẵn hỏi nghĩa trước, bậc lẻ điền chữ trước, nên mỗi chữ gặp cả hai kiểu khi lên bậc; kiểu đầu không làm
    // được thì thử kiểu kia. Trả { kind: 'mean' | 'cloze', ch, opts, ex (câu ví dụ, chỉ khi cloze) }.
    function followUp(state, deck, examples, story, ch, rng) {
        var it = state.items[ch];
        if (!it || !(it.s >= RULES.followStage)) return null;
        var kinds = it.s % 2 === 0 ? ['mean', 'cloze'] : ['cloze', 'mean'];
        for (var i = 0; i < kinds.length; i++) {
            var q = kinds[i] === 'mean'
                ? meaningQuestion(state, deck, story, ch, rng)
                : clozeQuestion(state, deck, examples, story, ch, rng);
            if (q) return q;
        }
        return null;
    }

    // Hàng ôn dồn: số chữ đến hạn khi từ RULES.reviewPile chữ trở lên, không thì 0.
    function reviewBacklog(state, now) {
        var n = dueList(state, now).length;
        return n >= RULES.reviewPile ? n : 0;
    }

    // ---------- linh khí, sửa quán ----------

    function gainLk(state, n) {
        state.lk += n;
        state.lkTotal += n;
    }

    // Tiêu linh khí (bước pay của cảnh thư: mua giấy mực). n là số dương: đủ thì trừ và trả true; thiếu, hay n không
    // hợp lệ, thì trả false và không đổi state. Như sửa quán và tô điểm, không trừ lkTotal (tổng đã kiếm).
    function spendLk(state, n) {
        if (typeof n !== 'number' || !(n > 0) || !isFinite(n) || !(state.lk >= n)) return false;
        state.lk -= n;
        return true;
    }

    function hasRepair(state, id) {
        return state.repairs.indexOf(id) >= 0;
    }

    function nextRepair(state) {
        for (var i = 0; i < REPAIRS.length; i++) {
            if (!hasRepair(state, REPAIRS[i].id)) return REPAIRS[i];
        }
        return null;
    }

    function doRepair(state) {
        var r = nextRepair(state);
        if (!r || state.lk < r.cost) return null;
        state.lk -= r.cost;
        state.repairs.push(r.id);
        return r;
    }

    function hasDecor(state, id) {
        return (state.decor || []).indexOf(id) >= 0;
    }

    // Thẻ Tô điểm có khi đã sửa xong mọi mục (mục cuối là lợp mái).
    function decorOpen(state) {
        return hasRepair(state, REPAIRS[REPAIRS.length - 1].id);
    }

    // Từng món kèm trạng thái: 'done' đã mua, 'locked' chưa đủ độ phủ, 'poor' thiếu linh khí, 'ready' mua được.
    function decorList(state, cover) {
        return DECOR.map(function (d) {
            var status = hasDecor(state, d.id) ? 'done' : ((cover || 0) < d.cover ? 'locked' : (state.lk < d.cost ? 'poor' : 'ready'));
            return { item: d, status: status };
        });
    }

    // Mua một món: chỉ khi đã lợp mái, món chưa mua, đủ độ phủ và đủ linh khí. Trả về món, không thì null.
    function buyDecor(state, id, cover) {
        var d = null;
        for (var i = 0; i < DECOR.length; i++) if (DECOR[i].id === id) d = DECOR[i];
        if (!d || !decorOpen(state) || hasDecor(state, id) || (cover || 0) < d.cover || state.lk < d.cost) return null;
        state.lk -= d.cost;
        if (!Array.isArray(state.decor)) state.decor = [];
        state.decor.push(d.id);
        return d;
    }

    function hubLevel(state) {
        var level = 0;
        for (var i = 0; i < REPAIRS.length; i++) {
            if (hasRepair(state, REPAIRS[i].id)) level = Math.max(level, REPAIRS[i].hub);
        }
        return level;
    }

    // ---------- câu cá ----------

    // Cỡ cá: cá lớn chỉ có sau khi sửa cầu. Trong một cỡ, cá hiếm (rare) ra ít hơn. Cá cần lưu niệm
    // (need) chỉ ra khi đã có lưu niệm đó; cá đêm (night) chỉ ra khi ctx.night. Luôn rút đúng hai số
    // ngẫu nhiên, nên bảng cá không có cá đặc biệt cho cùng kết quả như trước.
    function rollFish(fishTable, state, rng, ctx) {
        var big = hasRepair(state, 'cau');
        var kept = state.keepsakes || {};
        var night = !!(ctx && ctx.night);
        var allowed = function (f) {
            return (!f.need || !!kept[f.need]) && (!f.night || night);
        };
        var r = rand(rng);
        var size = big ? (r < 0.4 ? 1 : r < 0.8 ? 2 : 3) : (r < 0.55 ? 1 : 2);
        var pool = fishTable.filter(function (f) { return f.size === size && allowed(f); });
        // Bảng cá thiếu cỡ này (không xảy ra với story thật): lấy trong mọi cá được phép.
        if (!pool.length) pool = fishTable.filter(allowed);
        if (!pool.length) return null;
        var weights = pool.map(function (f) { return f.rare ? 1 : 4; });
        var total = 0;
        for (var i = 0; i < weights.length; i++) total += weights[i];
        var x = rand(rng) * total;
        for (i = 0; i < pool.length; i++) {
            x -= weights[i];
            if (x < 0) return pool[i];
        }
        return pool[pool.length - 1];
    }

    function fishNeed(fish) {
        return RULES.fishNeed[fish.size] || 3;
    }

    function fishSeconds(fish) {
        return RULES.fishSeconds[fish.size] || 50;
    }

    function landFish(state, fish) {
        state.bag[fish.id] = (state.bag[fish.id] || 0) + 1;
        state.caught[fish.id] = (state.caught[fish.id] || 0) + 1;
        state.stats.fish++;
        var lk = RULES.lkFish[fish.size] || 2;
        gainLk(state, lk);
        return { fish: fish, lk: lk };
    }

    function bagCount(state, fishId) {
        if (fishId === '*') {
            var n = 0;
            Object.keys(state.bag).forEach(function (k) { n += state.bag[k]; });
            return n;
        }
        return state.bag[fishId] || 0;
    }

    function takeFish(state, fishId, count) {
        var need = count || 1;
        if (bagCount(state, fishId) < need) return false;
        if (fishId !== '*') {
            state.bag[fishId] -= need;
            return true;
        }
        // Bất kỳ con nào: lấy con nhỏ nhất (nhiều nhất) trước.
        var keys = Object.keys(state.bag).sort(function (a, b) { return state.bag[b] - state.bag[a]; });
        for (var i = 0; i < keys.length && need > 0; i++) {
            var take = Math.min(state.bag[keys[i]], need);
            state.bag[keys[i]] -= take;
            need -= take;
        }
        return true;
    }

    // ---------- khách và cảnh ----------

    function listOf(v) {
        return Array.isArray(v) ? v : [v];
    }

    // Truyện khách đêm đã xong chưa (state dựng tay có thể thiếu state.tales).
    function taleDone(state, id) {
        var t = (state.tales || {})[id];
        return !!(t && t.done);
    }

    // when: { flag, notFlag, scrolls, repair, caught, friend: [id, n], cooked, night, cover, ram, tale, notTale,
    // keepsake, after: { tale, days } }; flag/notFlag/tale/notTale/keepsake nhận một id hoặc mảng id. night: chỉ khi
    // ctx.night. ram: chỉ trong đêm rằm (ctx.ram, app lấy từ ramInfo). tale: truyện đã xong; notTale: truyện chưa xong;
    // keepsake: đã có lưu niệm; after: truyện after.tale đã xong và từ ngày xong (tales[id].lastDay) tới ctx.day đã
    // qua ít nhất after.days ngày (dayDiff, cả hai là ngày lịch đêm), thiếu ctx.day hay lastDay thì chưa đạt.
    // Mọi điều kiện đều phải đúng.
    function meets(state, when, ctx) {
        if (!when) return true;
        var i;
        if (when.flag) {
            var need = listOf(when.flag);
            for (i = 0; i < need.length; i++) if (!state.flags[need[i]]) return false;
        }
        if (when.notFlag) {
            var not = listOf(when.notFlag);
            for (i = 0; i < not.length; i++) if (state.flags[not[i]]) return false;
        }
        if (when.scrolls && state.scrolls < when.scrolls) return false;
        if (when.repair && !hasRepair(state, when.repair)) return false;
        if (when.caught && state.stats.fish < when.caught) return false;
        if (when.friend && (state.friends[when.friend[0]] || 0) < when.friend[1]) return false;
        if (when.cooked && cookedTotal(state) < when.cooked) return false;
        if (when.night && !(ctx && ctx.night)) return false;
        // Độ phủ đọc (0–1, coverage): ctx.cover do app tính, lõi không giữ bộ chữ.
        if (when.cover && !(ctx && ctx.cover >= when.cover)) return false;
        if (when.ram && !(ctx && ctx.ram)) return false;
        if (when.tale) {
            var done = listOf(when.tale);
            for (i = 0; i < done.length; i++) if (!taleDone(state, done[i])) return false;
        }
        if (when.notTale) {
            var open = listOf(when.notTale);
            for (i = 0; i < open.length; i++) if (taleDone(state, open[i])) return false;
        }
        if (when.keepsake) {
            var kept = state.keepsakes || {};
            var want = listOf(when.keepsake);
            for (i = 0; i < want.length; i++) if (!kept[want[i]]) return false;
        }
        if (when.after) {
            var rec = (state.tales || {})[when.after.tale];
            if (!ctx || !ctx.day || !rec || !rec.done || !rec.lastDay) return false;
            // Ngày hỏng cho NaN, so sánh với NaN luôn sai.
            if (!(dayDiff(ctx.day, rec.lastDay) >= (Number(when.after.days) || 0))) return false;
        }
        return true;
    }

    function sceneDone(state, scene) {
        return !!state.flags['scene:' + scene.id];
    }

    // Cổng của cảnh truyện khách đêm (scene.tale); cảnh thường luôn qua. Cảnh truyện chỉ mở trong đêm
    // (ctx.night) mà ensureNight đã chọn đúng truyện đó cho ngày ctx.day, và mỗi đêm một cảnh: cảnh đang dở
    // thì chơi tiếp, cảnh mới chỉ mở khi đêm nay chưa xong cảnh nào của truyện (tales[id].lastDay khác ngày).
    function nightGate(state, scene, ctx) {
        if (!scene.tale) return true;
        if (!ctx || !ctx.night) return false;
        var night = state.night || {};
        if (night.tale !== scene.tale || night.day !== ctx.day) return false;
        if (state.progress[scene.id] !== undefined) return true;
        var t = (state.tales || {})[scene.tale];
        return !t || t.lastDay !== ctx.day;
    }

    // Cảnh chưa xong có chơi được lúc này không: qua cổng đêm, rồi đang dở hoặc đủ điều kiện when. Không xét manual,
    // nên với cảnh thư hay trang sách nó cho biết cảnh đã tới mà chưa xong (app vẽ danh sách thư, trang).
    function sceneOpen(state, scene, ctx) {
        if (sceneDone(state, scene) || !nightGate(state, scene, ctx)) return false;
        return state.progress[scene.id] !== undefined || meets(state, scene.when, ctx);
    }

    // Cảnh kế tiếp ở một nơi (mọi chuỗi: 'hub', 'tea', 'pond', 'library', 'study', 'gate', 'pavilion'):
    // cảnh đang dở trước, rồi cảnh đầu tiên đủ điều kiện theo thứ tự trong story. Cảnh truyện khách
    // đêm còn phải qua nightGate (kể cả khi đang dở: ban ngày không mở tiếp cảnh đêm). Cảnh manual (thư, trang sách)
    // không bao giờ tự mở, kể cả khi đang dở: app mở từ panel bằng openScene.
    function nextScene(state, story, where, ctx) {
        var scenes = story.scenes;
        var i;
        for (i = 0; i < scenes.length; i++) {
            var cur = scenes[i];
            if (cur.where === where && !cur.manual && state.progress[cur.id] !== undefined && !sceneDone(state, cur) &&
                    nightGate(state, cur, ctx)) {
                return cur;
            }
        }
        for (i = 0; i < scenes.length; i++) {
            var s = scenes[i];
            if (s.where !== where || s.manual || sceneDone(state, s) || !nightGate(state, s, ctx)) continue;
            if (meets(state, s.when, ctx)) return s;
        }
        return null;
    }

    function sceneById(story, id) {
        for (var i = 0; i < story.scenes.length; i++) {
            if (story.scenes[i].id === id) return story.scenes[i];
        }
        return null;
    }

    function sceneStepIndex(state, scene) {
        return state.progress[scene.id] || 0;
    }

    function setSceneStep(state, scene, index) {
        state.progress[scene.id] = index;
    }

    // Bước 'serve': kiểm món đưa ra. Trà: chọn đúng hũ; cá: có đủ cá trong giỏ.
    function canServe(state, step) {
        if (step.serve.kind !== 'fish') return true;
        return bagCount(state, step.serve.want) >= (step.serve.count || 1);
    }

    function serve(state, step, choice) {
        var s = step.serve;
        if (s.kind === 'tea') return choice === s.want;
        if (s.kind === 'fish') {
            if (s.want !== '*' && choice !== s.want) return false;
            return takeFish(state, s.want === '*' ? '*' : s.want, s.count || 1);
        }
        return false;
    }

    // Kết thúc cảnh: đánh dấu xong, áp hiệu quả (cờ, linh khí, thân thiết, dọn đến ở; truyện khách đêm:
    // tale = truyện xong, keepsake = lưu niệm, learn = học cuộn truyện). Cảnh có scene.tale ghi ngày chơi
    // vào tales[id].lastDay để đêm nay không mở thêm cảnh nào của truyện. opts = { now, deck, speed, day } tuỳ
    // chọn: thiếu now thì lấy giờ máy, thiếu deck thì bỏ qua learn. day ('YYYY-MM-DD') là ngày của lịch đêm
    // (app truyền sceneCtx().day, cùng đồng hồ gọi món nên ?day=N dời được); thiếu thì lấy nightDay(now). now chỉ
    // dùng cho nhịp SRS. lk trả về là tổng linh khí vừa cộng (của cảnh và của cuộn truyện); learned là các chữ
    // mới học.
    function finishScene(state, scene, opts) {
        var o = opts || {};
        var fx = scene.then || {};
        var now = o.now != null ? o.now : Date.now();
        state.flags['scene:' + scene.id] = true;
        delete state.progress[scene.id];
        if (fx.flag) state.flags[fx.flag] = true;
        var lk = fx.lk || 0;
        if (lk) gainLk(state, lk);
        if (fx.friend) state.friends[fx.friend] = (state.friends[fx.friend] || 0) + 1;
        if (fx.moveIn && state.residents.indexOf(fx.moveIn) < 0) state.residents.push(fx.moveIn);
        // Cá khách tặng vào giỏ: không tính là cá tự câu (stats.fish, sổ cá).
        if (fx.bag) {
            Object.keys(fx.bag).forEach(function (id) {
                state.bag[id] = (state.bag[id] || 0) + fx.bag[id];
            });
        }
        if (scene.where === 'tea') state.stats.served++;
        var day = o.day || nightDay(now);
        if (scene.tale) taleRecord(state, scene.tale, day).lastDay = day;
        if (fx.tale) taleRecord(state, fx.tale, day).done = true;
        if (fx.keepsake) {
            if (!state.keepsakes || typeof state.keepsakes !== 'object') state.keepsakes = {};
            state.keepsakes[fx.keepsake] = true;
        }
        var learned = [];
        if (fx.learn && o.deck) {
            var ev = learnTale(state, o.deck, fx.learn, now, o.speed);
            learned = ev.chars;
            lk += ev.lk;
        }
        return {
            lk: lk, moveIn: fx.moveIn || null, friend: fx.friend || null, bag: fx.bag || null,
            learned: learned, keepsake: fx.keepsake || null, tale: fx.tale || null
        };
    }

    // ---------- nhà bếp ----------

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    // Ngày theo giờ máy của người chơi ('YYYY-MM-DD'): khách gọi món mới khi sang ngày.
    function dayKey(now) {
        var d = new Date(now);
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }

    // Ngày của lịch khách đêm ('YYYY-MM-DD'). Đêm trong game kéo dài 18:00–06:00, nên giờ trước 06:00 thuộc đêm
    // của buổi tối hôm trước: 23:50 và 00:10 là cùng một đêm; 05:30 sáng và 19:00 tối cùng ngày là hai đêm.
    var NIGHT_DAY_SHIFT = 6 * HOUR;

    function nightDay(now) {
        return dayKey(now - NIGHT_DAY_SHIFT);
    }

    // FNV-1a: hạt ngẫu nhiên cố định theo chuỗi.
    function hashStr(text) {
        var h = 2166136261;
        var str = String(text);
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    }

    function dishById(story, id) {
        for (var i = 0; i < story.dishes.length; i++) {
            if (story.dishes[i].id === id) return story.dishes[i];
        }
        return null;
    }

    function cookedTotal(state) {
        var n = 0;
        Object.keys(state.cooked || {}).forEach(function (k) { n += state.cooked[k]; });
        return n;
    }

    // Khách có cảnh truyện đang chờ (đủ điều kiện hoặc đang dở) ở Quán trà: truyện đi trước, món để sau.
    function guestHasScene(state, story, guest, ctx) {
        return story.scenes.some(function (sc) {
            if (sc.where !== 'tea' || sc.guest !== guest) return false;
            return sceneOpen(state, sc, ctx);
        });
    }

    // Khách được gọi món: đã quen (xong cảnh đầu) và bếp đã nhóm lửa (cờ 'kitchen').
    function orderGuests(state, story) {
        if (!state.flags.kitchen) return [];
        return Object.keys(story.orders).filter(function (id) { return (state.friends[id] || 0) >= 1; });
    }

    // Món của một khách trong một ngày: cố định theo (ngày, khách, món đã có người gọi). Món khách thích
    // (story.orders[khách].likes) và món chưa nấu lần nào dễ được gọi hơn; món khách khác đã gọi hôm nay thì bỏ.
    function pickDish(state, story, day, guest, taken) {
        var rng = createRng(hashStr(day + '|' + guest));
        var likes = story.orders[guest].likes || [];
        var weights = story.dishes.map(function (d) {
            if (taken && taken.indexOf(d.id) >= 0) return 0;
            return (state.cooked[d.id] ? 1 : 2) * (likes.indexOf(d.id) >= 0 ? 10 : 1);
        });
        var total = 0;
        for (var i = 0; i < weights.length; i++) total += weights[i];
        var x = rand(rng) * total;
        for (i = 0; i < story.dishes.length; i++) {
            x -= weights[i];
            if (x < 0) return story.dishes[i];
        }
        return story.dishes[story.dishes.length - 1];
    }

    // Tiểu Ly tráo một chữ của món bằng chữ trông giống (story.confuse); cố định theo (ngày, khách).
    function pickSwap(story, dish, day, guest) {
        var cands = [];
        Array.from(dish.zh).forEach(function (ch, i) {
            story.confuse.forEach(function (c) {
                if (c.right === ch) cands.push({ at: i, wrong: c.wrong, right: ch });
            });
        });
        if (!cands.length) return null;
        return cands[randInt(createRng(hashStr(day + '|' + guest + '|swap')), cands.length)];
    }

    // Món khách gọi hôm nay, lưu trong state.orders: gọi lại bao nhiêu lần cũng ra cùng kết quả;
    // sang ngày thì gọi món mới; khách vừa thành khách quen giữa ngày được gọi món ngay.
    function ensureOrders(state, story, now) {
        var day = dayKey(now);
        if (!state.orders || state.orders.day !== day || !Array.isArray(state.orders.list)) {
            state.orders = { day: day, list: [] };
        }
        orderGuests(state, story).forEach(function (g) {
            for (var i = 0; i < state.orders.list.length; i++) if (state.orders.list[i].guest === g) return;
            var taken = state.orders.list.map(function (o) { return o.dish; });
            var dish = pickDish(state, story, day, g, taken);
            var order = { guest: g, dish: dish.id, done: false };
            if (story.orders[g].swap) {
                order.swap = pickSwap(story, dish, day, g);
                order.spotted = false;
            }
            state.orders.list.push(order);
        });
        return state.orders.list;
    }

    // Món đang chờ nấu: chưa mang ra, và khách không có cảnh truyện chờ.
    function openOrders(state, story, now, ctx) {
        return ensureOrders(state, story, now).filter(function (o) {
            return !o.done && !guestHasScene(state, story, o.guest, ctx);
        });
    }

    // Lời gọi món: {v} = 喝 với canh, cháo, còn lại 吃; Tiểu Ly tráo một chữ trong tên món.
    // spotAt: vị trí chữ bị tráo trong lời (tính theo ký tự), -1 nếu không tráo.
    function orderLine(story, order) {
        var dish = dishById(story, order.dish);
        var tpl = story.orders[order.guest].ask;
        var verb = /[汤粥]/.test(dish.zh) ? '喝' : '吃';
        var chars = Array.from(dish.zh);
        if (order.swap) chars[order.swap.at] = order.swap.wrong;
        var head = tpl.zh.split('{d}')[0].replace('{v}', verb);
        return {
            zh: tpl.zh.replace('{v}', verb).replace('{d}', chars.join('')),
            vi: tpl.vi.replace('{dv}', dish.vi),
            spotAt: order.swap ? Array.from(head).length + order.swap.at : -1
        };
    }

    // Lời cảm ơn khi nhận món: cố định theo (ngày, khách).
    function orderThanks(story, order, day) {
        var list = story.orders[order.guest].thanks;
        return list[hashStr(day + '|' + order.guest + '|thanks') % list.length];
    }

    // Thẻ nguyên liệu trong bếp: các chữ của món và chữ gây nhiễu lấy từ story.pantry, cố định theo seed
    // (món gọi trong ngày: ngày + khách; cảnh truyện: id cảnh) để vẽ lại vẫn y nguyên.
    function kitchenCards(story, dish, seed, size) {
        var own = Array.from(dish.zh);
        var pool = Object.keys(story.pantry).filter(function (c) { return own.indexOf(c) < 0; });
        var rng = createRng(hashStr(String(seed) + '|' + dish.id));
        var cards = own.slice();
        while (cards.length < (size || 6) && pool.length) cards.push(pool.splice(randInt(rng, pool.length), 1)[0]);
        for (var i = cards.length - 1; i > 0; i--) {
            var j = randInt(rng, i + 1);
            var t = cards[i];
            cards[i] = cards[j];
            cards[j] = t;
        }
        return cards;
    }

    // Đủ nguyên liệu chưa: món có cá thì giỏ phải có cá.
    function canCook(state, dish) {
        return !dish.fish || bagCount(state, '*') >= dish.fish;
    }

    // Ghép món từ các chữ đã chọn: 'ok' đúng món; 'order' đúng chữ nhưng sai thứ tự (tiếng Trung đặt
    // chữ chỉ loại trước: 鱼汤 chứ không phải 汤鱼); 'wrong' sai chữ.
    function cookCheck(dish, picks) {
        var want = Array.from(dish.zh);
        if (picks.join('') === dish.zh) return 'ok';
        if (picks.length === want.length && picks.slice().sort().join('') === want.slice().sort().join('')) return 'order';
        return 'wrong';
    }

    // Đọc một dòng chữ: gõ âm Hán Việt từng chữ, cách nhau bằng dấu cách (鱼汤 → "ngư thang"). chars là
    // mảng chữ, hoặc chuỗi lời thoại (lấy chữ Hán qua readChars). Chữ ngoài bộ chữ không chấm đúng được;
    // dòng không có chữ Hán nào thì không bao giờ đúng.
    function checkLine(deck, chars, input, opts) {
        if (!Array.isArray(chars)) chars = readChars(chars);
        var parts = cleanInput(input).split(' ').filter(Boolean);
        var res = {
            ok: false, exact: false, near: false, empty: !parts.length, parts: [],
            expected: chars.map(function (c) { return deck.byChar[c] ? deck.byChar[c].hv : '?'; }).join(' ')
        };
        if (!chars.length || parts.length !== chars.length) return res;
        var ok = true, exact = true, near = false;
        for (var i = 0; i < chars.length; i++) {
            var e = deck.byChar[chars[i]];
            var r = e ? checkReading(e, parts[i], opts) : { ok: false, exact: false, near: false };
            res.parts.push(r);
            if (!r.ok) ok = false;
            if (!r.exact) exact = false;
            if (r.near) near = true;
        }
        res.ok = ok;
        res.exact = ok && exact;
        res.near = !ok && near;
        return res;
    }

    // Đọc tên món: một dòng chữ là tên món.
    function checkDishName(deck, dish, input, opts) {
        return checkLine(deck, Array.from(dish.zh), input, opts);
    }

    // Bắt được chữ Tiểu Ly tráo trong lời gọi món: thưởng một lần cho mỗi món.
    function spotOrder(state, order) {
        if (!order.swap || order.spotted) return 0;
        order.spotted = true;
        gainLk(state, RULES.lkSpot);
        return RULES.lkSpot;
    }

    // Mang món ra: lấy cá nếu món cần; ghi sổ món, thân thiết, linh khí. Thiếu cá thì không đổi gì.
    function serveOrder(state, story, order, opts) {
        if (!order || order.done) return { ok: false, reason: 'done' };
        var dish = dishById(story, order.dish);
        if (!dish) return { ok: false, reason: 'dish' };
        if (dish.fish && !takeFish(state, '*', dish.fish)) return { ok: false, reason: 'fish' };
        order.done = true;
        state.cooked[dish.id] = (state.cooked[dish.id] || 0) + 1;
        state.friends[order.guest] = (state.friends[order.guest] || 0) + 1;
        state.stats.served++;
        var lk = RULES.lkCook + (opts && opts.exact ? RULES.lkCookExact : 0);
        gainLk(state, lk);
        return { ok: true, lk: lk, dish: dish };
    }

    // Món nấu trong cảnh truyện (bước cook): chỉ ghi sổ món và lấy cá nếu cần; cảnh tự thưởng.
    function cookForScene(state, story, dishId) {
        var dish = dishById(story, dishId);
        if (!dish) return false;
        if (dish.fish && !takeFish(state, '*', dish.fish)) return false;
        state.cooked[dish.id] = (state.cooked[dish.id] || 0) + 1;
        return true;
    }

    // ---------- lời thoại ----------

    // Tách lời thoại thành từng chữ; "长{trưởng}" ghi âm riêng cho chữ đa âm ở chỗ đó.
    function parseZh(text) {
        var out = [];
        var s = String(text || '');
        var chars = Array.from(s);
        for (var i = 0; i < chars.length; i++) {
            var ch = chars[i];
            if (ch === '{') {
                var end = chars.indexOf('}', i);
                if (end > i && out.length) {
                    out[out.length - 1].hv = chars.slice(i + 1, end).join('');
                    i = end;
                    continue;
                }
            }
            out.push({ ch: ch, cjk: CJK.test(ch) });
        }
        return out;
    }

    function plainZh(text) {
        return String(text || '').replace(/\{[^}]*\}/g, '');
    }

    // Các chữ Hán của một dòng lời thoại theo thứ tự: bỏ âm ghi riêng {…}, dấu câu, chữ Latin.
    function readChars(line) {
        return Array.from(plainZh(line)).filter(function (ch) { return CJK.test(ch); });
    }

    // ---------- khách đêm (Liêu Trai) ----------

    // Truyện khách đêm (story.tales) hay lần khách cũ ghé lại (story.visits) theo id.
    function taleById(story, id) {
        var lists = [story.tales || [], story.visits || []];
        for (var k = 0; k < lists.length; k++) {
            for (var i = 0; i < lists[k].length; i++) {
                if (lists[k][i].id === id) return lists[k][i];
            }
        }
        return null;
    }

    // Số truyện khách đêm đã xong. Có story thì chỉ đếm truyện chính (story.tales), không đếm lần khách cũ ghé lại.
    function talesDone(state, story) {
        var all = state.tales || {};
        var n = 0;
        if (story) {
            (story.tales || []).forEach(function (t) {
                if (all[t.id] && all[t.id].done) n++;
            });
            return n;
        }
        Object.keys(all).forEach(function (id) {
            if (all[id] && all[id].done) n++;
        });
        return n;
    }

    // Bản ghi của một truyện; chưa có thì tạo (truyện bắt đầu ngày day, hình người, chưa xong).
    function taleRecord(state, id, day) {
        if (!state.tales || typeof state.tales !== 'object') state.tales = {};
        var t = state.tales[id];
        if (!t || typeof t !== 'object') {
            t = { started: day || '', lastDay: '', form: 'human', done: false };
            state.tales[id] = t;
        }
        return t;
    }

    // Truyện của đêm nay theo nightDay(now) (cùng đồng hồ với món gọi, đổi ngày lúc 06:00). Đã chọn được truyện
    // thì giữ nguyên cả đêm, gọi lại bao nhiêu lần cũng ra cùng truyện. Đêm chưa có truyện thì mỗi lần gọi chọn
    // lại, nên truyện vừa đủ điều kiện giữa đêm (câu đủ cá, chạm đèn lồng) đến ngay, không chờ ngày sau. Truyện đang dở thắng
    // truyện mới; truyện mới lấy trong các truyện chưa xong đủ điều kiện: ctx.forceTale (chỉ để thử) nếu nó
    // nằm trong số đó, không thì cố định theo hashStr(ngày + '|tale'). Khách cũ ghé lại (story.visits) chỉ đến
    // khi không có truyện chính nào đủ điều kiện (ctx.forceTale vẫn ép được). Ban ngày (thiếu ctx hay ctx.night sai)
    // không đổi state và trả null. Trả về truyện trong story.tales, lần ghé lại trong story.visits, hoặc null.
    function ensureNight(state, story, now, ctx) {
        if (!ctx || !ctx.night) return null;
        var day = nightDay(now);
        if (!state.night || typeof state.night !== 'object') state.night = { day: '', tale: '' };
        if (state.night.day !== day || !state.night.tale) {
            var tales = story.tales || [];
            var visits = story.visits || [];
            var all = tales.concat(visits);
            var pick = null;
            var i;
            for (i = 0; i < all.length && !pick; i++) {
                var t = (state.tales || {})[all[i].id];
                if (t && t.started && !t.done) pick = all[i];
            }
            if (!pick) {
                var ready = function (tale) {
                    return !taleDone(state, tale.id) && meets(state, tale.when, ctx);
                };
                var open = tales.filter(ready);
                var back = visits.filter(ready);
                var both = open.concat(back);
                for (i = 0; i < both.length && !pick; i++) {
                    if (ctx.forceTale && both[i].id === ctx.forceTale) pick = both[i];
                }
                if (!pick && open.length) pick = open[hashStr(day + '|tale') % open.length];
                if (!pick && back.length) pick = back[hashStr(day + '|tale') % back.length];
            }
            var id = pick ? pick.id : '';
            if (state.night.day !== day || state.night.tale !== id) state.night = { day: day, tale: id };
            if (pick) {
                var rec = taleRecord(state, pick.id, day);
                if (!rec.started) rec.started = day;
            }
        }
        return state.night.tale ? taleById(story, state.night.tale) : null;
    }

    // Trà mời khách: trà cần lưu niệm (need) chỉ có khi đã có lưu niệm đó.
    function teaList(story, state) {
        var kept = state.keepsakes || {};
        return (story.teas || []).filter(function (t) { return !t.need || !!kept[t.need]; });
    }

    // ---------- đêm rằm: đố đèn ----------

    // Ngày dương của rằm (15 âm lịch) theo lịch 'chinese' của Intl/ICU (giờ Bắc Kinh), 9/2026–12/2040, tháng âm sau dấu
    // hai chấm, tháng nhuận thêm 'n'. Dựng bằng tools/quy-van/build-ram.mjs; test core so lại từng ngày với Intl.
    // Lịch Việt Nam tính theo UTC+7 nên có tháng mùng 1 sớm hơn lịch ICU một ngày: cửa sổ ±1 ngày quanh ngày trong
    // bảng (đêm 14–16) luôn chứa đêm 15 theo lịch Việt Nam.
    var RAM_DAYS = '2026-09-25:8,2026-10-24:9,2026-11-23:10,2026-12-23:11,2027-01-22:12,2027-02-21:1,2027-03-22:2,2027-04-21:3,' +
        '2027-05-20:4,2027-06-19:5,2027-07-18:6,2027-08-16:7,2027-09-15:8,2027-10-14:9,2027-11-12:10,2027-12-12:11,' +
        '2028-01-11:12,2028-02-09:1,2028-03-10:2,2028-04-09:3,2028-05-09:4,2028-06-07:5,2028-07-07:5n,2028-08-05:6,' +
        '2028-09-03:7,2028-10-03:8,2028-11-01:9,2028-11-30:10,2028-12-30:11,2029-01-29:12,2029-02-27:1,2029-03-29:2,' +
        '2029-04-28:3,2029-05-27:4,2029-06-26:5,2029-07-25:6,2029-08-24:7,2029-09-22:8,2029-10-22:9,2029-11-20:10,' +
        '2029-12-19:11,2030-01-18:12,2030-02-16:1,2030-03-18:2,2030-04-17:3,2030-05-16:4,2030-06-15:5,2030-07-15:6,' +
        '2030-08-13:7,2030-09-12:8,2030-10-11:9,2030-11-10:10,2030-12-09:11,2031-01-08:12,2031-02-06:1,2031-03-07:2,' +
        '2031-04-06:3,2031-05-06:3n,2031-06-04:4,2031-07-04:5,2031-08-02:6,2031-09-01:7,2031-10-01:8,2031-10-30:9,' +
        '2031-11-29:10,2031-12-28:11,2032-01-27:12,2032-02-25:1,2032-03-26:2,2032-04-24:3,2032-05-23:4,2032-06-22:5,' +
        '2032-07-21:6,2032-08-20:7,2032-09-19:8,2032-10-18:9,2032-11-17:10,2032-12-17:11,2033-01-15:12,2033-02-14:1,' +
        '2033-03-15:2,2033-04-14:3,2033-05-13:4,2033-06-11:5,2033-07-11:6,2033-08-09:7,2033-09-08:8,2033-10-07:9,' +
        '2033-11-06:10,2033-12-06:11,2034-01-05:11n,2034-02-03:12,2034-03-05:1,2034-04-03:2,2034-05-03:3,2034-06-01:4,' +
        '2034-06-30:5,2034-07-30:6,2034-08-28:7,2034-09-27:8,2034-10-26:9,2034-11-25:10,2034-12-25:11,2035-01-23:12,' +
        '2035-02-22:1,2035-03-24:2,2035-04-22:3,2035-05-22:4,2035-06-20:5,2035-07-19:6,2035-08-18:7,2035-09-16:8,' +
        '2035-10-15:9,2035-11-14:10,2035-12-14:11,2036-01-12:12,2036-02-11:1,2036-03-12:2,2036-04-11:3,2036-05-10:4,' +
        '2036-06-09:5,2036-07-08:6,2036-08-06:6n,2036-09-05:7,2036-10-04:8,2036-11-02:9,2036-12-02:10,2036-12-31:11,' +
        '2037-01-30:12,2037-03-01:1,2037-03-31:2,2037-04-30:3,2037-05-29:4,2037-06-28:5,2037-07-27:6,2037-08-25:7,' +
        '2037-09-24:8,2037-10-23:9,2037-11-21:10,2037-12-21:11,2038-01-19:12,2038-02-18:1,2038-03-20:2,2038-04-19:3,' +
        '2038-05-18:4,2038-06-17:5,2038-07-16:6,2038-08-15:7,2038-09-13:8,2038-10-13:9,2038-11-11:10,2038-12-10:11,' +
        '2039-01-09:12,2039-02-07:1,2039-03-09:2,2039-04-08:3,2039-05-07:4,2039-06-06:5,2039-07-06:5n,2039-08-04:6,' +
        '2039-09-03:7,2039-10-02:8,2039-11-01:9,2039-11-30:10,2039-12-30:11,2040-01-28:12,2040-02-26:1,2040-03-27:2,' +
        '2040-04-25:3,2040-05-25:4,2040-06-24:5,2040-07-23:6,2040-08-22:7,2040-09-20:8,2040-10-20:9,2040-11-19:10,' +
        '2040-12-18:11';
    // Linh khí đố đèn: mỗi câu giải lần đầu trong tháng, và khi giải đủ đèn của tháng.
    var RIDDLE_LK = 3;
    var RAM_BONUS = 10;
    var RAM_MONTHS = ['', 'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Một', 'Chạp'];
    var ramList = null;

    // Số ngày từ 1970-01-01 của một ngày 'YYYY-MM-DD' (theo lịch, không theo múi giờ).
    function dayNumber(day) {
        var p = String(day).split('-');
        return Math.round(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) / 864e5);
    }

    // Số ngày a − b, hai ngày 'YYYY-MM-DD' theo lịch (when.after so ngày lịch đêm): dayDiff('2026-10-20', '2026-10-18')
    // = 2. Ngày hỏng hay thiếu: NaN.
    function dayDiff(a, b) {
        return dayNumber(a) - dayNumber(b);
    }

    function ramDays() {
        if (!ramList) {
            ramList = RAM_DAYS.split(',').map(function (s) {
                var kv = s.split(':');
                return { day: kv[0], n: dayNumber(kv[0]), month: parseInt(kv[1], 10), leap: /n$/.test(kv[1]) };
            });
        }
        return ramList;
    }

    // Một đêm rằm: key (mỗi tháng một key: ngày rằm trong bảng, hay key cho sẵn khi ép bằng ?ram=M), tháng âm, nhuận,
    // lễ (fest: 'nguyentieu' rằm tháng Giêng, 'trungthu' rằm tháng Tám, không phải tháng nhuận), số đèn (5 vào hai lễ,
    // 3 tháng thường) và tên để hiện.
    function ramFor(month, leap, key) {
        var m = Number(month) || 0;
        var fest = leap ? '' : (m === 1 ? 'nguyentieu' : (m === 8 ? 'trungthu' : ''));
        return {
            key: key || ('test-' + m), month: m, leap: !!leap, fest: fest, size: fest ? 5 : 3,
            name: 'Rằm tháng ' + (RAM_MONTHS[m] || m) + (leap ? ' nhuận' : '')
        };
    }

    // Đêm rằm của ngày lịch đêm day ('YYYY-MM-DD', nightDay: đổi ngày lúc 06:00, nên một đêm qua nửa đêm vẫn là một
    // đêm): đêm 14, 15, 16, tức cách ngày rằm trong bảng ≤ 1 ngày. Ngoài cửa sổ hay ngoài bảng: null.
    function ramInfo(day) {
        if (!day) return null;
        var n = dayNumber(day);
        if (!isFinite(n)) return null;
        var list = ramDays();
        for (var i = 0; i < list.length; i++) {
            if (Math.abs(list[i].n - n) <= 1) return ramFor(list[i].month, list[i].leap, list[i].day);
        }
        return null;
    }

    function riddleById(story, id) {
        var list = (story && story.riddles) || [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    // Bộ đèn của một tháng (info.size câu đố): đáp án đã học mà chưa từng giải trước, rồi đáp án sắp học (vị trí
    // trong bộ chữ < số chữ đã học + 150) chưa từng giải, rồi câu chưa giải khác, cuối cùng câu đã giải. Cùng mức thì
    // theo hashStr(key + '|' + id), nên cùng tháng, cùng tiến độ luôn ra cùng bộ. Trả mảng id câu đố.
    function riddleSet(state, story, deck, info) {
        var list = ((story && story.riddles) || []).slice();
        var solved = state.riddles || {};
        var near = countLearned(state, 1) + 150;
        var keyed = list.map(function (r) {
            var it = state.items[r.ans];
            var e = deck && deck.byChar[r.ans];
            var tier = it && it.s >= 1 ? 0 : (e && e.idx < near ? 1 : 2);
            return { id: r.id, t: solved[r.id] ? 3 + tier : tier, h: hashStr(info.key + '|' + r.id) };
        });
        keyed.sort(function (a, b) { return a.t - b.t || a.h - b.h; });
        return keyed.slice(0, info.size).map(function (x) { return x.id; });
    }

    // Bộ đèn đêm rằm đang mở: chốt ở lần mở đầu tiên của tháng (state.ram.key), để tiến độ trong tháng không làm
    // đổi đèn. info null (không phải đêm rằm): không đổi state, trả null.
    function ensureRam(state, story, deck, info) {
        if (!info) return null;
        var ram = state.ram;
        if (!ram || typeof ram !== 'object' || ram.key !== info.key || !Array.isArray(ram.set)) {
            state.ram = { key: info.key, set: riddleSet(state, story, deck, info), solved: {}, done: false };
        }
        return state.ram;
    }

    // Bốn chữ để chọn cho một đèn: đáp án và ba chữ nhiễu, thứ tự cố định theo tháng (key) và câu đố.
    function riddleOptions(riddle, key) {
        return [riddle.ans].concat(riddle.opts || []).map(function (ch) {
            return { ch: ch, h: hashStr(key + '|' + riddle.id + '|' + ch) };
        }).sort(function (a, b) { return a.h - b.h; }).map(function (x) { return x.ch; });
    }

    // Trả lời một đèn của tháng; choice là chữ người chơi chọn. Đúng lần đầu: +RIDDLE_LK linh khí, đếm vào
    // state.riddles, và nếu đáp án là chữ đã học thì tính một lần luyện (practice: không đổi bậc). Giải đủ đèn của
    // tháng: thêm RAM_BONUS, ghi key vào state.ramDone. Sai không trừ gì. Câu không thuộc bộ đèn của tháng: null.
    function answerRiddle(state, story, id, choice, now, speed) {
        var ram = state.ram;
        var r = riddleById(story, id);
        if (!r || !ram || !Array.isArray(ram.set) || ram.set.indexOf(id) < 0) return null;
        if (choice !== r.ans) return { ok: false, first: false, lk: 0, bonus: 0, done: !!ram.done };
        if (!ram.solved || typeof ram.solved !== 'object') ram.solved = {};
        var first = !ram.solved[id];
        var lk = 0;
        if (first) {
            ram.solved[id] = true;
            if (!state.riddles || typeof state.riddles !== 'object' || Array.isArray(state.riddles)) state.riddles = {};
            state.riddles[id] = (state.riddles[id] || 0) + 1;
            lk += RIDDLE_LK;
            if (state.items[r.ans]) practice(state, r.ans, 'ok', now != null ? now : Date.now(), speed);
        }
        var bonus = 0;
        var all = ram.set.every(function (x) { return !!ram.solved[x]; });
        if (all && !ram.done) {
            ram.done = true;
            if (!Array.isArray(state.ramDone)) state.ramDone = [];
            if (state.ramDone.indexOf(ram.key) < 0) state.ramDone.push(ram.key);
            bonus = RAM_BONUS;
        }
        lk += bonus;
        if (lk) gainLk(state, lk);
        return { ok: true, first: first, lk: lk, bonus: bonus, done: !!ram.done };
    }

    // ---------- Vọng Vân Đình: đối từ ----------

    // Đối từ (bước 2 sau review 19/10, 22/10/2026; dữ liệu quy-van-pairs.js, tham số pairs). Mỗi ngày một xấp giấy đỏ,
    // mỗi tờ hỏi về một từ hai chữ:
    // - câu đọc (id 'r:' + từ): từ cầu nối của bộ chữ có chữ đa âm trong pairs.poly; chọn cách đọc đúng của cả từ;
    // - câu nghĩa (id 'm:' + từ): bẫy nghĩa trong pairs.traps; chọn nghĩa hay gặp trong truyện.
    // Linh khí: tờ chọn đúng ngay lần đầu, ở câu chưa từng đúng ngay lần nào (PAIR_LK); giải đủ giấy của ngày (PAIR_BONUS).
    var PAIR_LK = 2;
    var PAIR_BONUS = 5;
    var PAIR_SIZE = 5;
    // Ít hơn PAIR_MIN câu dùng được thì chưa có xấp giấy: thẻ Đối từ nhắc học thêm chữ.
    var PAIR_MIN = 3;

    function pairsOf(pairs) {
        return {
            poly: (pairs && pairs.poly) || {},
            skip: (pairs && pairs.skip) || [],
            traps: (pairs && pairs.traps) || []
        };
    }

    // Âm trong poly khớp âm syll (theo syllKey), hay '' khi không có.
    function polyReading(map, syll) {
        var key = syllKey(syll || '');
        var list = Object.keys(map);
        for (var i = 0; i < list.length; i++) {
            if (syllKey(list[i]) === key) return list[i];
        }
        return '';
    }

    // Mọi câu đối từ (chưa xét người chơi đã học chữ nào): { id, kind: 'read' | 'mean', w, r, need: chữ phải học trước,
    // rank: câu nhỏ hơn hỏi trước, … }.
    // Câu đọc: polys = vị trí chữ đa âm trong từ. Bỏ từ trong skip và từ đọc chữ đa âm bằng âm không có trong poly; chữ
    // khác của từ có thể ở ngoài bộ chữ (诡辩: 辩), app hiện âm lấy từ âm của từ. Mỗi chữ đa âm (chữ đa âm đầu của từ) hỏi mọi từ đọc khác âm hiển thị và tối đa bấy nhiêu từ đọc theo âm
    // hiển thị (ít nhất một), để đáp án không luôn là âm lạ. need = các chữ đa âm (chữ khác hiện âm như lời thoại); rank =
    // hạng cao nhất của chữ đa âm trong bộ chữ.
    // Câu nghĩa: need = mọi chữ của từ; rank = thứ tự trong traps.
    // Kết quả nhớ theo cặp (deck, pairs) gần nhất; người gọi không sửa các câu trả về.
    var pairCache = { deck: null, pairs: null, items: null };
    function pairItems(deck, pairs) {
        if (pairCache.items && pairCache.deck === deck && pairCache.pairs === pairs) return pairCache.items;
        var items = buildPairItems(deck, pairs);
        pairCache = { deck: deck, pairs: pairs, items: items };
        return items;
    }

    function buildPairItems(deck, pairs) {
        var P = pairsOf(pairs);
        var reads = [];
        var seen = {};
        deck.list.forEach(function (e) {
            e.ex.forEach(function (x) {
                if (seen[x.w]) return;
                seen[x.w] = true;
                if (P.skip.indexOf(x.w) >= 0) return;
                var chars = Array.from(x.w);
                var sylls = x.r.split(' ');
                if (chars.length !== sylls.length) return;
                var polys = [];
                var alt = false;
                for (var i = 0; i < chars.length; i++) {
                    var ce = deck.byChar[chars[i]];
                    var map = P.poly[chars[i]];
                    if (!map) continue;
                    if (!ce || !polyReading(map, sylls[i])) return;
                    polys.push(i);
                    if (syllKey(sylls[i]) !== syllKey(ce.hv)) alt = true;
                }
                if (!polys.length) return;
                var rank = 0;
                polys.forEach(function (i) { rank = Math.max(rank, deck.byChar[chars[i]].idx); });
                reads.push({
                    id: 'r:' + x.w, kind: 'read', w: x.w, r: x.r, polys: polys, alt: alt, head: chars[polys[0]],
                    need: polys.map(function (i) { return chars[i]; }), rank: rank
                });
            });
        });
        var altCount = {};
        var mainCount = {};
        reads.forEach(function (it) { if (it.alt) altCount[it.head] = (altCount[it.head] || 0) + 1; });
        var out = reads.filter(function (it) {
            if (it.alt) return true;
            mainCount[it.head] = (mainCount[it.head] || 0) + 1;
            return mainCount[it.head] <= Math.max(1, altCount[it.head] || 0);
        });
        P.traps.forEach(function (t, i) {
            out.push({ id: 'm:' + t.w, kind: 'mean', w: t.w, r: t.r, m: t.m, vi: t.vi, note: t.note || '', need: Array.from(t.w), rank: i });
        });
        return out;
    }

    function pairItem(deck, pairs, id) {
        var list = pairItems(deck, pairs);
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    // Câu dùng được: mọi chữ trong need đã học (bậc ≥ 1).
    function pairPool(state, deck, pairs) {
        return pairItems(deck, pairs).filter(function (it) {
            return it.need.every(function (ch) { return !!(state.items[ch] && state.items[ch].s >= 1); });
        });
    }

    function pairLogOf(state) {
        var log = state.pairLog;
        return log && typeof log === 'object' && !Array.isArray(log) ? log : {};
    }

    // Xấp giấy của ngày day ('YYYY-MM-DD'): tối đa PAIR_SIZE câu dùng được, xen kẽ câu đọc và câu nghĩa (hashStr(day) chọn
    // loại đi trước). Mỗi loại xếp: câu chưa gặp (theo rank), câu lần gần nhất chọn sai, rồi câu đã đúng (gặp lâu nhất
    // trước); cùng mức thì theo hashStr(day + '|' + id). Trả mảng id.
    function pairSet(state, deck, pairs, day) {
        var log = pairLogOf(state);
        var keyed = pairPool(state, deck, pairs).map(function (it) {
            var l = log[it.id];
            var t = !l ? 0 : (l.last === 'miss' ? 1 : 2);
            var age = t === 2 && l.day ? dayNumber(l.day) : 0;
            return { id: it.id, kind: it.kind, t: t, age: isFinite(age) ? age : 0, rank: it.rank, h: hashStr(day + '|' + it.id) };
        });
        keyed.sort(function (a, b) { return a.t - b.t || a.age - b.age || a.rank - b.rank || a.h - b.h; });
        var reads = keyed.filter(function (x) { return x.kind === 'read'; });
        var means = keyed.filter(function (x) { return x.kind === 'mean'; });
        var lists = hashStr(day) % 2 ? [reads, means] : [means, reads];
        var pos = [0, 0];
        var out = [];
        for (var k = 0; out.length < PAIR_SIZE && (pos[0] < lists[0].length || pos[1] < lists[1].length); k++) {
            var s = k % 2;
            if (pos[s] >= lists[s].length) s = 1 - s;
            out.push(lists[s][pos[s]++].id);
        }
        return out;
    }

    // Xấp giấy đang mở (state.pairs): dựng lại theo tiến độ cho tới khi trả lời tờ đầu tiên của ngày, rồi giữ nguyên tới
    // hết ngày. Tờ không còn trong dữ liệu (bản cập nhật bỏ một từ giữa ngày) bị gỡ khỏi xấp; gỡ hết thì dựng lại, còn lại
    // toàn tờ đã giải thì xấp tính là xong (không thưởng thêm).
    function ensurePairs(state, deck, pairs, day) {
        var p = state.pairs;
        var fresh = !p || typeof p !== 'object' || p.day !== day || !Array.isArray(p.set);
        if (!fresh) {
            var kept = p.set.filter(function (id) { return !!pairItem(deck, pairs, id); });
            if (kept.length !== p.set.length) {
                p.set = kept;
                if (!kept.length) fresh = true;
                else if (!p.done && kept.every(function (id) { return !!(p.solved && p.solved[id]); })) p.done = true;
            }
        }
        var untouched = !fresh && !Object.keys(p.solved || {}).length && !Object.keys(p.missed || {}).length;
        if (fresh || untouched) {
            state.pairs = { day: day, set: pairSet(state, deck, pairs, day), solved: {}, missed: {}, done: false };
        }
        return state.pairs;
    }

    // Một tờ: { id, kind, w, r, need, opts: các phương án (chuỗi), ans: phương án đúng; câu nghĩa thêm m, vi, note }.
    // Câu đọc: cả từ đọc theo từng âm trong poly của mỗi chữ đa âm, tối đa 4 phương án, ưu tiên phương án chỉ khác đáp án một
    // chữ. Câu nghĩa: m, vi và hai nghĩa đúng của bẫy khác, không phương án nào trùng nghĩa nhau (meaningClash). Thứ tự
    // phương án cố định theo ngày và câu. id không có trong dữ liệu: null.
    function pairQuestion(deck, pairs, id, day) {
        var item = pairItem(deck, pairs, id);
        if (!item) return null;
        var P = pairsOf(pairs);
        var opts = [];
        if (item.kind === 'read') {
            var chars = Array.from(item.w);
            var base = item.r.split(' ');
            var baseKey = base.map(syllKey).join(' ');
            var combos = [base];
            item.polys.forEach(function (at) {
                var next = [];
                combos.forEach(function (c) {
                    Object.keys(P.poly[chars[at]]).forEach(function (r) {
                        var copy = c.slice();
                        copy[at] = r;
                        next.push(copy);
                    });
                });
                combos = next;
            });
            var keys = {};
            var cands = [];
            combos.forEach(function (c) {
                var k = c.map(syllKey).join(' ');
                if (keys[k]) return;
                keys[k] = true;
                var diff = 0;
                for (var i = 0; i < c.length; i++) if (syllKey(c[i]) !== syllKey(base[i])) diff++;
                cands.push({ text: k === baseKey ? item.r : c.join(' '), diff: diff, h: hashStr(day + '|' + id + '|' + k) });
            });
            cands.sort(function (a, b) { return a.diff - b.diff || a.h - b.h; });
            opts = cands.slice(0, 4).map(function (x) { return x.text; });
        } else {
            opts = [item.m, item.vi];
            var others = P.traps.filter(function (t) { return t.w !== item.w; }).map(function (t) {
                return { m: t.m, h: hashStr(day + '|' + id + '|' + t.w) };
            }).sort(function (a, b) { return a.h - b.h; });
            for (var j = 0; j < others.length && opts.length < 4; j++) {
                var m = others[j].m;
                if (opts.some(function (o) { return meaningClash(o, m); })) continue;
                opts.push(m);
            }
        }
        opts = opts.map(function (text) { return { text: text, h: hashStr(day + '|' + id + '|' + text) }; })
            .sort(function (a, b) { return a.h - b.h; }).map(function (x) { return x.text; });
        var q = { id: id, kind: item.kind, w: item.w, r: item.r, need: item.need.slice(), opts: opts, ans: item.kind === 'read' ? item.r : item.m };
        if (item.kind === 'read') q.polys = item.polys.slice();
        else { q.m = item.m; q.vi = item.vi; q.note = item.note; }
        return q;
    }

    // Lời giải câu đọc của từ w (âm r): mỗi chữ đa âm, từng âm trong poly với nghĩa ngắn, cờ used (âm của chữ trong từ này)
    // và tối đa hai từ cầu nối khác đọc âm đó. Trả [{ ch, reads: [{ r, sense, used, words: [{ w, r }] }] }].
    function pairExplain(deck, pairs, w, r) {
        var P = pairsOf(pairs);
        var chars = Array.from(w);
        var sylls = String(r || '').split(' ');
        var out = [];
        chars.forEach(function (ch, at) {
            var map = P.poly[ch];
            if (!map || out.some(function (x) { return x.ch === ch; })) return;
            var reads = Object.keys(map).map(function (x) {
                return { r: x, sense: map[x], used: syllKey(x) === syllKey(sylls[at] || ''), words: [] };
            });
            var seen = {};
            deck.list.forEach(function (e) {
                e.ex.forEach(function (x) {
                    if (x.w === w || seen[x.w]) return;
                    var cs = Array.from(x.w);
                    var ss = x.r.split(' ');
                    for (var i = 0; i < cs.length; i++) {
                        if (cs[i] !== ch) continue;
                        var k = syllKey(ss[i] || '');
                        for (var j = 0; j < reads.length; j++) {
                            if (syllKey(reads[j].r) === k && reads[j].words.length < 2) {
                                reads[j].words.push({ w: x.w, r: x.r });
                                seen[x.w] = true;
                                return;
                            }
                        }
                    }
                });
            });
            out.push({ ch: ch, reads: reads });
        });
        return out;
    }

    // Trả lời một tờ của xấp giấy hôm nay (state.pairs); choice là chuỗi phương án. Sai: ghi missed (một lần mỗi tờ) và
    // pairLog (miss, last 'miss'), không trừ gì. Đúng: solved; chưa sai lần nào hôm nay thì pairLog.ok tăng, last 'ok', câu
    // chưa từng đúng ngay lần nào thì +PAIR_LK, câu đọc tính thêm một lần luyện cho các chữ đa âm (practice, không đổi bậc).
    // Giải đủ giấy: +PAIR_BONUS một lần mỗi ngày. Tờ không thuộc xấp hôm nay: null.
    function answerPair(state, deck, pairs, id, choice, now, speed) {
        var p = state.pairs;
        if (!p || typeof p !== 'object' || !Array.isArray(p.set) || p.set.indexOf(id) < 0) return null;
        var q = pairQuestion(deck, pairs, id, p.day);
        if (!q) return null;
        if (!p.solved || typeof p.solved !== 'object') p.solved = {};
        if (!p.missed || typeof p.missed !== 'object') p.missed = {};
        if (!state.pairLog || typeof state.pairLog !== 'object' || Array.isArray(state.pairLog)) state.pairLog = {};
        var log = state.pairLog[id];
        if (!log || typeof log !== 'object') log = state.pairLog[id] = { ok: 0, miss: 0, last: '', day: '' };
        if (p.solved[id]) return { ok: true, first: false, lk: 0, bonus: 0, done: !!p.done, ans: q.ans };
        if (choice !== q.ans) {
            if (!p.missed[id]) {
                p.missed[id] = true;
                log.miss = (log.miss || 0) + 1;
                log.last = 'miss';
                log.day = p.day;
            }
            return { ok: false, first: false, lk: 0, bonus: 0, done: !!p.done, ans: q.ans };
        }
        p.solved[id] = true;
        var clean = !p.missed[id];
        var lk = 0;
        if (clean) {
            if (!(log.ok > 0)) lk += PAIR_LK;
            log.ok = (log.ok || 0) + 1;
            log.last = 'ok';
            if (q.kind === 'read') {
                var t = now != null ? now : Date.now();
                q.need.forEach(function (ch) { if (state.items[ch]) practice(state, ch, 'ok', t, speed); });
            }
        }
        log.day = p.day;
        var bonus = 0;
        if (!p.done && p.set.every(function (x) { return !!p.solved[x]; })) {
            p.done = true;
            bonus = PAIR_BONUS;
        }
        lk += bonus;
        if (lk) gainLk(state, lk);
        return { ok: true, first: clean, lk: lk, bonus: bonus, done: !!p.done, ans: q.ans };
    }

    return {
        SAVE_VERSION: SAVE_VERSION,
        HOUR: HOUR,
        SRS_HOURS: SRS_HOURS,
        STAGE_DONE: STAGE_DONE,
        STAGE_KNOWN: STAGE_KNOWN,
        RUBY_HIDE_STAGE: RUBY_HIDE_STAGE,
        RULES: RULES,
        REPAIRS: REPAIRS,
        DECOR: DECOR,
        looseKey: looseKey,
        syllKey: syllKey,
        telexLoose: telexLoose,
        indexDeck: indexDeck,
        indexExamples: indexExamples,
        indexPhonetic: indexPhonetic,
        readingsOf: readingsOf,
        checkReading: checkReading,
        parsePinyinSyllable: parsePinyinSyllable,
        newState: newState,
        loadState: loadState,
        saveInfo: saveInfo,
        exportSave: exportSave,
        parseSave: parseSave,
        saveSummary: saveSummary,
        interval: interval,
        stageOf: stageOf,
        stageLabel: stageLabel,
        learnChars: learnChars,
        dueList: dueList,
        nextDue: nextDue,
        leechList: leechList,
        confuseOf: confuseOf,
        review: review,
        practice: practice,
        countLearned: countLearned,
        coverage: coverage,
        foldText: foldText,
        searchChars: searchChars,
        storyGroups: storyGroups,
        learnDays: learnDays,
        learnedOn: learnedOn,
        plainMeaning: plainMeaning,
        meaningClash: meaningClash,
        pickDistractors: pickDistractors,
        meaningQuestion: meaningQuestion,
        clozeQuestion: clozeQuestion,
        followUp: followUp,
        reviewBacklog: reviewBacklog,
        scrollCount: scrollCount,
        scrollChars: scrollChars,
        strokeFile: strokeFile,
        textCounts: textCounts,
        setBook: setBook,
        setBookOn: setBookOn,
        clearBook: clearBook,
        bookCoverage: bookCoverage,
        bookOrder: bookOrder,
        nextScroll: nextScroll,
        completeScroll: completeScroll,
        learnTale: learnTale,
        createRng: createRng,
        rand: rand,
        randInt: randInt,
        fishDueList: fishDueList,
        pickChar: pickChar,
        answer: answer,
        gainLk: gainLk,
        spendLk: spendLk,
        hasRepair: hasRepair,
        nextRepair: nextRepair,
        doRepair: doRepair,
        hasDecor: hasDecor,
        decorOpen: decorOpen,
        decorList: decorList,
        buyDecor: buyDecor,
        hubLevel: hubLevel,
        rollFish: rollFish,
        fishNeed: fishNeed,
        fishSeconds: fishSeconds,
        landFish: landFish,
        bagCount: bagCount,
        takeFish: takeFish,
        meets: meets,
        nextScene: nextScene,
        sceneOpen: sceneOpen,
        sceneById: sceneById,
        sceneDone: sceneDone,
        sceneStepIndex: sceneStepIndex,
        setSceneStep: setSceneStep,
        canServe: canServe,
        serve: serve,
        finishScene: finishScene,
        parseZh: parseZh,
        plainZh: plainZh,
        readChars: readChars,
        dayKey: dayKey,
        nightDay: nightDay,
        dayDiff: dayDiff,
        dishById: dishById,
        cookedTotal: cookedTotal,
        guestHasScene: guestHasScene,
        ensureOrders: ensureOrders,
        openOrders: openOrders,
        orderLine: orderLine,
        orderThanks: orderThanks,
        canCook: canCook,
        kitchenCards: kitchenCards,
        cookCheck: cookCheck,
        checkLine: checkLine,
        checkDishName: checkDishName,
        spotOrder: spotOrder,
        serveOrder: serveOrder,
        cookForScene: cookForScene,
        ensureNight: ensureNight,
        taleById: taleById,
        talesDone: talesDone,
        teaList: teaList,
        RAM_DAYS: RAM_DAYS,
        RIDDLE_LK: RIDDLE_LK,
        RAM_BONUS: RAM_BONUS,
        ramInfo: ramInfo,
        ramFor: ramFor,
        riddleById: riddleById,
        riddleSet: riddleSet,
        ensureRam: ensureRam,
        riddleOptions: riddleOptions,
        answerRiddle: answerRiddle,
        PAIR_LK: PAIR_LK,
        PAIR_BONUS: PAIR_BONUS,
        PAIR_SIZE: PAIR_SIZE,
        PAIR_MIN: PAIR_MIN,
        pairItems: pairItems,
        pairItem: pairItem,
        pairPool: pairPool,
        pairSet: pairSet,
        ensurePairs: ensurePairs,
        pairQuestion: pairQuestion,
        pairExplain: pairExplain,
        answerPair: answerPair,
        REALMS: REALMS,
        getRealm: getRealm,
        MOBS: MOBS,
        BOSSES: BOSSES,
        SECTS: SECTS,
        calcCombatStats: calcCombatStats
    };
}));
