// Quy Vân Quán — giao diện. Màn chính là thế giới pixel (QuyVanWorld); chạm công trình mở panel:
// Chính điện (sửa quán), Thư trai (học cuộn chữ, ôn bài), Hồ sen (câu cá ngay trong hồ), Quán trà
// (tiếp khách), Sơn môn (biển cổng, khách quen); Sổ ở nút 簿 trên thanh trên. Khách có chuyện muốn nói
// mang dấu "!" trên đầu; chạm vào khách là mở cảnh.
// Lõi (QuyVanCore) giữ mọi luật; file này chỉ vẽ, nghe sự kiện và lưu state vào localStorage.
//
// Lớp đêm Liêu Trai: mỗi đêm lõi chọn tối đa một khách lạ (Core.ensureNight). Khách đi từ Sơn môn tới
// nơi hẹn (Hồ sen, Tàng Kinh Các, Thư trai…), rồi mới mang dấu "!". Xong cảnh, khách ra cổng và biến mất.
// Ban ngày, chạm đèn lồng Sơn môn để thắp đèn sang đêm trong phiên này.
//
// Ô gõ âm của bài kiểm tra, của lượt câu cá và của bước đọc thơ được dựng MỘT lần rồi cập nhật tại chỗ:
// dựng lại input làm iOS đóng bàn phím sau mỗi câu trả lời.
(function () {
    'use strict';

    var Core = window.QuyVanCore;
    var Sound = window.QuyVanAudio;
    var World = window.QuyVanWorld;
    var STORY = window.QuyVanStory;
    var RAW = window.QuyVanDeck;
    var DECK = Core.indexDeck(RAW);
    var EXAMPLES = Core.indexExamples(window.QuyVanExamples);
    // Gợi âm theo phần chỉ âm (quy-van-phonetic.js, Make Me a Hanzi, LGPL); thiếu tệp thì thẻ không có dòng gợi âm.
    var PHONETIC = Core.indexPhonetic(window.QuyVanPhonetic);
    // Đối từ ở Vọng Vân Đình (quy-van-pairs.js); thiếu tệp thì không có tờ nào.
    var PAIRS = window.QuyVanPairs || { poly: {}, skip: [], traps: [] };
    var TRAPS = {};
    (PAIRS.traps || []).forEach(function (t) { TRAPS[t.w] = t; });

    var SAVE_KEY = 'quyvan.save';
    var NIGHT_KEY = 'quyvan.night';
    // Giờ (ms) người chơi tải hay chép bản lưu lần cuối, để Sổ nhắc khi chưa sao lưu.
    var BACKUP_AT_KEY = 'quyvan.backupAt';
    var TTS_VOICE = 'zh-CN-XiaoxiaoNeural';
    // Giọng dự phòng khi Edge TTS hỏng: giọng nữ phổ thông tiếng Trung của TikTok (CapCut).
    var TTS_FALLBACK_VOICE = 'BV001_streaming';
    var params = new URLSearchParams(window.location.search);
    var SPEED = params.get('srs') === 'fast' ? 1 / 3600 : 1;
    // ?day=N (chỉ để thử): dời ngày gọi món N ngày, không đổi đồng hồ SRS.
    var DAY_SHIFT = (Number(params.get('day')) || 0) * 24 * Core.HOUR;
    var rng = Core.createRng(Number(params.get('seed')) || (Date.now() % 2147483647));
    // ?night=1 ép trời đêm, ?tale=id ép truyện được chọn cho đêm nay (chỉ để thử).
    var URL_NIGHT = params.get('night') === '1';
    var FORCE_TALE = params.get('tale') || '';
    // ?ram=M ép đêm rằm tháng âm M (1–12; 1 là Nguyên tiêu, 8 là Trung thu) để thử đố đèn, dùng cùng ?night=1.
    var URL_RAM = Math.max(0, Math.min(12, parseInt(params.get('ram'), 10) || 0));
    // ?walk=N (chỉ để thử): mọi nhân vật đi nhanh gấp N lần (1–20); bộ e2e chạy ?walk=6.
    var WALK_SCALE = Math.max(1, Math.min(20, Number(params.get('walk')) || 1));
    // ?v= của chính tệp này trong index.html. Thư viện vẽ nét và dữ liệu nét tải sau mang cùng ?v=, vì SW của trang chủ
    // lấy tệp tĩnh từ cache theo đúng URL. document.currentScript chỉ có giá trị lúc tệp đang chạy lần đầu.
    var ASSET_V = (function () {
        var s = document.currentScript;
        var m = s && s.src ? /[?&]v=([^&#]+)/.exec(s.src) : null;
        return m ? m[1] : '';
    }());
    // Đêm thắp bằng đèn lồng Sơn môn chỉ giữ trong phiên này.
    var FORCE_NIGHT_KEY = 'quyvan.forceNight';

    var PLACES = {
        hall: { zh: '三清殿', vi: 'Chính điện' },
        study: { zh: '书斋', vi: 'Thư trai' },
        pond: { zh: '莲池', vi: 'Hồ sen' },
        tea: { zh: '茶馆', vi: 'Quán trà' },
        gate: { zh: '山门', vi: 'Sơn môn' },
        library: { zh: '藏经阁', vi: 'Tàng Kinh Các' },
        kitchen: { zh: '厨房', vi: 'Nhà bếp' },
        garden: { zh: '菜园', vi: 'Vườn rau' },
        pavilion: { zh: '望云亭', vi: 'Vọng Vân Đình' },
        book: { zh: '簿', vi: 'Sổ ghi chép' }
    };
    // Sprite trên bản đồ của từng nhân vật: chỉ dùng làm chân dung khi World chưa có chân dung riêng.
    var FACE = { 'lao-quy': 'turtle', 'ho-nguyet': 'fox', 'tieu-mac': 'cat', 'tieu-ly': 'tanuki', keeper: 'keeper' };
    var SIZE_LABEL = { 1: '小 Cá nhỏ', 2: '中 Cá vừa', 3: '大 Cá lớn' };
    // Sửa xong mục nào thì camera lướt tới chỗ đổi khác trên đảo.
    var REPAIR_FOCUS = { san: 'tea', cau: 'pond', den: 'hall', mai: 'hall' };
    // Ba chữ trên biển cổng.
    var GATE_CHARS = [['归', 'quy', 'về'], ['云', 'vân', 'mây'], ['观', 'quán', 'đạo quán']];
    // Chữ trên biển các nơi mới mở rộng.
    var LIBRARY_CHARS = [['藏', 'tàng', 'cất giữ'], ['经', 'kinh', 'kinh sách'], ['阁', 'các', 'lầu gác']];
    var KITCHEN_CHARS = [['厨', 'trù', 'bếp'], ['房', 'phòng', 'nhà, buồng']];
    var PAVILION_CHARS = [['望', 'vọng', 'trông ra xa'], ['云', 'vân', 'mây'], ['亭', 'đình', 'nhà đình']];
    var GARDEN_CHARS = [['菜', 'thái', 'rau'], ['园', 'viên', 'vườn']];
    // Nơi khách lạ (khách đêm) có thể hẹn: panel của các nơi này có thẻ "Có khách lạ" ở đầu.
    var STRANGER_PLACES = ['pond', 'library', 'study', 'gate', 'garden', 'pavilion'];
    // Khách quen đi dạo quanh chỗ ở; Lão Quy giữ hồ nên không đi.
    var STROLLERS = ['ho-nguyet', 'tieu-mac', 'tieu-ly'];
    // Khách đêm ở hình thật không đi bộ ra cổng mà biến mất tại chỗ, kèm một dòng báo.
    var VANISH = {
        bach: 'Con cá trắng quẫy đuôi một cái rồi lặn xuống hồ.',
        luc: 'Con ong xanh vỗ cánh bay ra cửa sổ, về núi.',
        wang: 'Lục Lang đi về phía miếu nhỏ bên hồ rồi tan vào ánh trăng.',
        huapi: 'Con yêu ôm tấm da cuộn tròn, đi vào màn sương ngoài cổng.',
        xiangyu: 'Hương Ngọc lùi vào khóm mẫu đơn rồi biến mất.',
        lianso: 'Liên Tỏa tan vào ánh trăng; trên hai cột đình còn lại hai dải giấy đỏ.',
        yan: 'Cô gái giấy gấp mình lại, nằm vào giữa trang sách.',
        laoshan: 'Con hạc trắng vỗ cánh, bay về phía núi Lao.',
        huagu: 'Con hươu nhỏ nhảy qua hàng rào, chạy vào rừng sau núi.',
        xiaoqian: 'Bóng trắng nhạt dần bên song cửa, rồi tan vào đêm.'
    };
    // Gợi ý chỗ câu trong Sổ cá cho loài chỉ có ban đêm.
    var FISH_HINT = { bach: 'Chỉ có đêm trăng, sau khi có cuộn thơ' };
    // Khung chân dung (World.PORTRAITS) và toạ độ vùng chạm của bước reveal (World.REVEAL_ZONES).
    var REVEAL_FRAME = 40;
    // Phần cách viết của thẻ chữ: cạnh khung vẽ (px, đúng cỡ hiển thị, vì thư viện đổi toạ độ chạm theo cỡ này), lề quanh
    // chữ, độ dày nét người chơi tô (theo toạ độ chữ 1024 đơn vị: 24 ≈ 5 px trên khung 240), số lần tô sai một nét thì nét
    // đó sáng lên chỉ chỗ viết.
    var STROKE_BOX = 240;
    var STROKE_PAD = 14;
    var STROKE_INK = 24;
    var STROKE_HINT = 3;

    var state = null;
    var place = null;
    var ui = {};
    var world = null;
    var fishing = null;
    var quiz = null;
    var dialog = null;
    var cooking = null;
    // Màn một đèn đố chữ đêm rằm: { id, tried: chữ đã chọn sai, miss, vi, ruby, gain: dòng thưởng sau khi giải }.
    var riddle = null;
    // Màn một tờ Đối từ ở Vọng Vân Đình: { id, tried: phương án đã chọn sai, gain: dòng thưởng sau khi giải }.
    var paper = null;
    var saveTimer = 0;
    // Chuỗi JSON lần lưu cuối của tab này: sự kiện storage mang đúng chuỗi đó là của chính tab này, bỏ qua.
    var lastSaved = '';
    // Bản lưu vừa đọc từ tệp hay mã dán, chờ người chơi bấm "Nạp bản này".
    var pendingSave = null;
    // Trong khung xem thử (artifact, iframe) trình duyệt chặn tải tệp, nên Sổ chỉ hiện Chép mã.
    var IN_FRAME = (function () {
        try { return window.self !== window.top; } catch (e) { return true; }
    }());
    var tickTimer = 0;
    // Lúc trang bị ẩn (ms), để đồng hồ câu cá và bước bùa không chạy trong lúc người chơi ở tab khác.
    var hiddenAt = 0;
    // Bản lưu do bản game mới hơn ghi: tab này không ghi đè (Core.saveInfo 'newer'). saveFailWarned: đã báo một lần
    // rằng localStorage không ghi được (đầy, bị chặn); ghi được lại thì báo lại ở lần hỏng sau.
    var SAVE_BAK_KEY = 'quyvan.save.bak';
    var saveBlocked = false;
    var saveFailWarned = false;
    // Phần tử có focus trước khi mở hộp thoại (nút Sổ, ô chữ…): đóng hộp thoại thì trả focus về đó.
    var sheetReturn = null;
    // Giọng đọc: bản đã tải (khoá 'rate|câu' → { url: blob URL, speed: playbackRate }, ttsOrder giữ thứ tự dùng để bỏ
    // bản cũ nhất), một thẻ <audio> dùng lại cho mọi lần Nghe, câu đang tải, câu người chơi bấm Nghe gần nhất, cờ "trang
    // này không có /api/tts" (server tĩnh khi chạy thử ở máy), giờ Edge hỏng gần nhất (0: Edge đang chạy).
    var TTS_CACHE_MAX = 40;
    var ttsCache = {};
    var ttsOrder = [];
    var ttsEl = null;
    var ttsLoading = {};
    var ttsWant = '';
    var ttsMissing = false;
    var ttsEdgeDownAt = 0;
    var autoOpened = {};
    var nightMode = 'auto';
    var forcedNight = false;
    // Chuỗi JSON của worldState() lần gửi cuối: setState dựng lại actor, nên chỉ gửi khi state đổi.
    var worldKey = '';
    // Khách đêm trong phiên này: 'khách|ngày' → 'walking' (đang đi từ cổng vào) | 'here' (đã tới nơi).
    var arrivals = {};
    // Khách đêm đang được tiễn sau cảnh: { guest, tale, form, ready, going }.
    var leaving = null;
    var strollTimer = 0;
    // Khách quen đang dạo: { id, home }.
    var strolling = null;
    var strollHomes = null;
    // Tra chữ đã học (Tàng Kinh Các, Sổ): chữ đang tìm, bộ lọc, cách xếp nhóm ('day' | 'deck'; '' = theo ngày học khi
    // đã có chữ ghi ngày, không thì theo bộ chữ); đặt lại mỗi lần mở một nơi.
    var dict = { q: '', f: 'all', g: '' };
    // Thẻ chữ đầy đủ mở trên sheet (#cardView): { list, i, label, from }. list: các chữ để đi Trước/Tiếp, theo
    // thứ tự đang thấy trong lưới; from: ô chữ đã chạm, để trả về đúng chỗ khi đóng.
    var card = null;
    // Phần cách viết của thẻ chữ (xem strokeShow). open: người chơi để phần này mở (giữ khi sang chữ khác, sang thẻ sau);
    // writer, svg: writer Hanzi Writer và khung vẽ dùng chung; gc: .glyph-card đang chứa khung vẽ; mode: 'load' | 'play' |
    // 'shown' | 'quiz' | 'done' | 'fail' ('' khi khung vẽ không ở thẻ nào); n: số nét; done: số nét đã tô đúng; miss: số
    // lần tô sai; last: lần tô gần nhất ('ok' | 'bad' | 'hint'); run: tăng mỗi lần gắn hay gỡ khung vẽ, để bỏ kết quả tải
    // và lời báo của thẻ cũ.
    var stroke = { open: false, writer: null, svg: null, gc: null, ch: '', mode: '', n: 0, done: 0, miss: 0, last: '', run: 0 };
    // Promise tải thư viện vẽ nét; số tệp nét → Promise dữ liệu nét của tệp đó.
    var strokeLib = null;
    var strokeFiles = {};
    // Học theo sách (thẻ ở Thư trai, xem bookCardHtml). open: thẻ đang hiện danh sách sách; loading: đang đọc danh sách;
    // busy: 'nguồn:id' của sách đang đọc nội dung. Đặt lại mỗi lần mở một nơi. bookList: kết quả lần đọc danh sách sau
    // cùng ({ at, items: [{ src, id, key, title, note }] }), null khi chưa đọc lần nào.
    var bookPick = { open: false, loading: false, busy: '' };
    var bookList = null;
    // Cờ URL từ Reader (xem applyUrlLinks): ?book=reader:<id> | crawler:<id>, ?card=<chữ>.
    var URL_BOOK = params.get('book') || '';
    var URL_CARD = params.get('card') || '';

    // ---------- tiện ích ----------

    function now() { return Date.now(); }

    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function pct(x) {
        var v = x * 100;
        return v.toLocaleString('vi-VN', { maximumFractionDigits: v < 10 ? 1 : 0 }) + '%';
    }

    function num(x) {
        return Number(x).toLocaleString('vi-VN');
    }

    function fmtIn(ms) {
        if (ms <= 60000) return 'chưa tới 1 phút nữa';
        var min = Math.round(ms / 60000);
        if (min < 60) return min + ' phút nữa';
        var h = Math.round(min / 60);
        if (h < 24) return h + ' giờ nữa';
        return Math.round(h / 24) + ' ngày nữa';
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Core.randInt(rng, i + 1);
            var t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        return arr;
    }

    function storageGet(key) {
        try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }

    function storageSet(key, value) {
        try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
    }

    function storageDel(key) {
        try { window.localStorage.removeItem(key); } catch (e) { /* không có storage */ }
    }

    // sessionStorage: có thể ném lỗi trong khung artifact hay khi trình duyệt chặn dữ liệu trang.
    function sessionGet(key) {
        try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
    }

    function sessionSet(key, value) {
        try { window.sessionStorage.setItem(key, value); } catch (e) { /* không có storage */ }
    }

    function sessionDel(key) {
        try { window.sessionStorage.removeItem(key); } catch (e) { /* không có storage */ }
    }

    function save() {
        clearTimeout(saveTimer);
        saveTimer = 0;
        if (saveBlocked) return;
        // Tab khác chạy bản game mới hơn vừa ghi bản lưu: tab này (bản cũ) không ghi đè.
        var cur = storageGet(SAVE_KEY);
        if (cur && cur !== lastSaved && Core.saveInfo(cur).kind === 'newer') {
            blockSaves();
            return;
        }
        lastSaved = JSON.stringify(state);
        if (storageSet(SAVE_KEY, lastSaved)) {
            saveFailWarned = false;
        } else if (!saveFailWarned) {
            saveFailWarned = true;
            toast('Không lưu được tiến độ: bộ nhớ trình duyệt đầy hoặc bị chặn. Hãy sao lưu ở Sổ → Tiến độ.', 6000);
        }
    }

    function blockSaves() {
        saveBlocked = true;
        toast('Bản lưu trên máy này do bản game mới hơn ghi. Tải lại trang để chơi tiếp; tab này không lưu nữa.', 8000);
    }

    function saveSoon() {
        if (!saveTimer) saveTimer = setTimeout(save, 250);
    }

    // Xin trình duyệt giữ dữ liệu của trang khi máy thiếu chỗ (navigator.storage.persist). Chỉ hỏi một lần trên mỗi máy,
    // ngay sau lượt học xong cuộn chữ đầu tiên: Firefox hiện hộp hỏi người dùng; Chrome và Safari 17+ tự quyết theo mức
    // dùng trang (Safari ưu tiên app thêm vào màn hình chính), không hiện gì. Kết quả không đổi giao diện; lỗi bỏ qua.
    var PERSIST_KEY = 'quyvan.persist';
    function askPersist() {
        var s = navigator.storage;
        if (!s || typeof s.persist !== 'function' || storageGet(PERSIST_KEY)) return;
        storageSet(PERSIST_KEY, String(now()));
        try {
            Promise.resolve(typeof s.persisted === 'function' ? s.persisted() : false)
                .then(function (yes) { return yes || s.persist(); })
                .then(null, function () { /* trình duyệt từ chối */ });
        } catch (e) { /* trình duyệt cũ */ }
    }

    function toast(text, ms) {
        var t = ui.toast;
        t.textContent = text;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
    }

    function sfx(name) {
        if (state.settings.sfx) Sound.play(name);
    }

    function guestOf(id) {
        return STORY.guests[id] || null;
    }

    function teaById(id) {
        for (var i = 0; i < STORY.teas.length; i++) if (STORY.teas[i].id === id) return STORY.teas[i];
        return null;
    }

    function placeName(id) {
        var list = World.PLACES || [];
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].vi;
        return PLACES[id] ? PLACES[id].vi : id;
    }

    // ---------- khách đêm ----------

    function talesList() {
        return STORY.tales || [];
    }

    // Truyện chính rồi các lần khách cũ ghé lại (story.visits), theo thứ tự lịch đêm của lõi xét.
    function nightList() {
        return talesList().concat(STORY.visits || []);
    }

    function isVisit(tale) {
        return !!tale && (STORY.visits || []).indexOf(tale) >= 0;
    }

    // Truyện của một khách đêm (mỗi khách một truyện).
    function taleOfGuest(id) {
        var list = talesList();
        for (var i = 0; i < list.length; i++) if (list[i].guest === id) return list[i];
        return null;
    }

    // Hình hiện tại của khách đêm: 'human' (hình người) hoặc 'true' (hình thật, sau bước reveal).
    function guestForm(id) {
        // Khách cũ ghé lại mang hình của lần ghé (form, mặc định hình người), không lấy hình thật của truyện gốc.
        var cur = nightTale();
        if (cur && cur.guest === id && isVisit(cur)) return cur.form === 'true' ? 'true' : 'human';
        var tale = taleOfGuest(id);
        var rec = tale && state.tales ? state.tales[tale.id] : null;
        return rec && rec.form === 'true' ? 'true' : 'human';
    }

    // Tên sprite trên bản đồ của khách đêm theo hình; sprite ghi ở story.guests (hợp đồng C2).
    function guestSprite(id, form) {
        var g = guestOf(id);
        var tale = taleOfGuest(id);
        var sp = (g && g.sprite) || (tale && tale.sprite) || null;
        if (!sp) return null;
        return (form === 'true' ? sp['true'] : sp.human) || sp.human || null;
    }

    // ---------- tranh: chân dung và cá ----------

    // id là id khách (lao-quy, ho-nguyet…); khách chưa có chân dung riêng thì vẽ sprite trên bản đồ.
    // form: hình của khách đêm ('true' = hình thật); bỏ trống là hình người.
    function faceHtml(id, cls, form) {
        return '<canvas class="face' + (cls ? ' ' + cls : '') + '" data-face="' + esc(id) + '"' +
            (form === 'true' ? ' data-form="true"' : '') + ' aria-hidden="true"></canvas>';
    }

    // Tranh một loài cá; sil = bóng mờ cho loài chưa câu được.
    function fishArtHtml(id, cls, sil) {
        return '<canvas class="fish-art' + (cls ? ' ' + cls : '') + '" data-fish="' + esc(id) + '"' + (sil ? ' data-sil="1"' : '') +
            ' aria-hidden="true"></canvas>';
    }

    function artOf(cv) {
        var fish = cv.getAttribute('data-fish');
        if (fish) {
            var sil = cv.hasAttribute('data-sil');
            return { layer: World.fishLayer(fish, { silhouette: sil }), key: 'f:' + fish + (sil ? ':sil' : ''), center: true };
        }
        var id = cv.getAttribute('data-face');
        var form = cv.getAttribute('data-form') === 'true' ? 'true' : '';
        var portrait = World.portraitLayer ? World.portraitLayer(id, form || undefined) : null;
        if (portrait) return { layer: portrait, key: 'p:' + id + (form ? ':' + form : '') };
        var sprite = World.SPRITES[id] ? id : (FACE[id] || guestSprite(id, form) || 'keeper');
        if (!World.SPRITES[sprite]) sprite = 'keeper';
        return { layer: World.spriteLayer(sprite, 0, false), key: 's:' + sprite, sprite: true };
    }

    // Bitmap của một layer, phóng nguyên lần m (giữ cạnh pixel); dùng lại giữa các lần vẽ.
    var artBitmaps = {};
    function artBitmap(key, S, m) {
        var id = key + '@' + m;
        if (artBitmaps[id]) return artBitmaps[id];
        var base = document.createElement('canvas');
        base.width = S.w;
        base.height = S.h;
        var bg = base.getContext('2d');
        var img = bg.createImageData(S.w, S.h);
        new Uint32Array(img.data.buffer).set(S.px);
        bg.putImageData(img, 0, 0);
        var out = base;
        if (m > 1) {
            out = document.createElement('canvas');
            out.width = S.w * m;
            out.height = S.h * m;
            var og = out.getContext('2d');
            og.imageSmoothingEnabled = false;
            og.drawImage(base, 0, 0, out.width, out.height);
        }
        artBitmaps[id] = out;
        return out;
    }

    // Vẽ tranh vào mọi canvas[data-face], canvas[data-fish] trong root. Bitmap = khung nội dung × DPR.
    // Phóng nguyên lần khi lấp được ≥ 70 % khung. Khung nhỏ hơn (DPR 1, 1,5) thì phóng nguyên lần lên
    // quá cỡ rồi thu lại có làm mịn, để các pixel đều nhau thay vì cột dày cột mỏng.
    // Chỗ tranh nằm trong bitmap ghi vào cv._art (px thiết bị) để đặt các vùng chạm của bước reveal.
    function paintArt(root) {
        var list = (root || document).querySelectorAll('canvas[data-face], canvas[data-fish]');
        var dpr = window.devicePixelRatio || 1;
        for (var i = 0; i < list.length; i++) {
            var cv = list[i];
            var art = artOf(cv);
            var S = art.layer;
            if (!S) continue;
            // Chặn trần: thiếu CSS kích thước thì canvas mặc định rộng 300 px, nhân DPR thành tranh khổng lồ.
            // 240 đủ cho chân dung phóng to ở bước reveal (240 px khi màn hình cao từ 640 px, không thì 168 px).
            var cw = Math.min(240, cv.clientWidth || 48), ch = Math.min(240, cv.clientHeight || cw);
            var W = Math.max(8, Math.round(cw * dpr)), H = Math.max(8, Math.round(ch * dpr));
            var sig = art.key + '|' + W + 'x' + H;
            if (cv.getAttribute('data-painted') === sig) continue;
            var pad = art.sprite ? 4 : 0;
            var fit = Math.min((W - pad) / S.w, (H - pad) / S.h);
            var k = Math.floor(fit);
            var smooth = k < 1 || k / fit < 0.7;
            var scale = smooth ? fit : k;
            var dw = Math.round(S.w * scale), dh = Math.round(S.h * scale);
            cv.width = W;
            cv.height = H;
            var g = cv.getContext('2d');
            g.imageSmoothingEnabled = smooth;
            if (smooth) g.imageSmoothingQuality = 'high';
            g.clearRect(0, 0, W, H);
            var x = Math.floor((W - dw) / 2);
            // Chân dung bán thân chạm đáy khung; cá nằm giữa; sprite cũ chừa một khoảng nhỏ dưới chân.
            var y = art.center ? Math.floor((H - dh) / 2) : H - dh - (art.sprite ? Math.floor(scale / 2) : 0);
            g.drawImage(artBitmap(art.key, S, smooth ? Math.max(1, Math.ceil(fit)) : 1), x, y, dw, dh);
            cv._art = { kind: art.sprite ? 'sprite' : (art.center ? 'fish' : 'portrait'), x: x, y: y, w: dw, h: dh, W: W, H: H };
            cv.setAttribute('data-painted', sig);
        }
    }

    // ---------- chữ có âm Hán Việt ----------

    // Lời thoại: chữ chưa học và chữ vừa học (chưa ôn lần nào) có âm Hán Việt ở trên; chữ đã ôn đúng thì không
    // (chạm để xem). Ngưỡng là Core.RUBY_HIDE_STAGE. opts.mark: chữ được tô nền (chữ đang học trong câu ví dụ);
    // opts.blank: chữ thay bằng ô trống (câu hỏi điền chữ), ô không mang chữ nên chạm vào không lộ đáp án.
    function renderZh(text, opts) {
        var parts = Core.parseZh(text);
        var mode = (opts && opts.ruby) || state.settings.ruby;
        var mark = opts && opts.mark;
        var blank = opts && opts.blank;
        var html = '';
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (!p.cjk) {
                html += esc(p.ch);
                continue;
            }
            if (blank && p.ch === blank) {
                html += '<span class="blank" role="img" aria-label="chữ còn thiếu"></span>';
                continue;
            }
            var entry = DECK.byChar[p.ch];
            var py = (entry && entry.py) || p.hv || (entry ? entry.hv : '');
            var stage = Core.stageOf(state, p.ch);
            var known = stage >= Core.RUBY_HIDE_STAGE;
            var cls = 'c' + (known ? (stage >= Core.STAGE_KNOWN ? ' known' : ' learning') : '') + (p.ch === mark ? ' mark' : '');
            var show = py && (mode === 'always' || (mode === 'auto' && !known));
            var attrs = ' class="' + cls + '" data-ch="' + esc(p.ch) + '"' + (p.hv ? ' data-hv="' + esc(p.hv) + '"' : '');
            if (show) html += '<ruby' + attrs + '>' + esc(p.ch) + '<rt>' + esc(py) + '</rt></ruby>';
            else html += '<span' + attrs + '>' + esc(p.ch) + '</span>';
        }
        return html;
    }

    // Từ cầu nối là bẫy nghĩa (PAIRS.traps, như 明白 minh bạch): âm vẫn giúp nhớ chữ, nhưng ghi kèm nghĩa tiếng Trung.
    function bridgeHtml(entry) {
        return entry.ex.map(function (x) {
            var chars = Array.from(x.w);
            var sylls = x.r.split(' ');
            var r = sylls.map(function (s, i) {
                return chars[i] === entry.ch ? '<mark>' + esc(s) + '</mark>' : esc(s);
            }).join(' ');
            var trap = TRAPS[x.w];
            return '<span><span class="w">' + esc(x.w) + '</span>' + r +
                (trap ? '<small class="trap">⚠ tiếng Trung: ' + esc(trap.m) + '</small>' : '') + '</span>';
        }).join('');
    }

    // Câu ví dụ trên thẻ học: câu lấy từ truyện mà mọi chữ khác đã học trước chữ này, chữ đang học tô nền,
    // từ dịch chữ đó in đậm trong bản dịch. Chữ không có câu thì không hiện gì.
    // Bản dịch câu ví dụ, từ dịch chữ đó (x.hl) in đậm.
    function exampleViHtml(x) {
        var at = x.hl ? x.vi.indexOf(x.hl) : -1;
        return at >= 0
            ? esc(x.vi.slice(0, at)) + '<b>' + esc(x.hl) + '</b>' + esc(x.vi.slice(at + x.hl.length))
            : esc(x.vi);
    }

    function exampleHtml(ch) {
        var x = EXAMPLES.byChar[ch];
        if (!x) return '';
        // 16 cuộn đầu dùng cụm từ (大山, 青山绿水): không có dấu câu thì gọi là "Từ ví dụ".
        var phrase = !/[，、。！？]/.test(x.s);
        return '<div class="fact eg"><b>' + (phrase ? 'Từ ví dụ:' : 'Câu ví dụ:') + '</b>' +
            '<div class="zh-line sm" lang="zh">' + renderZh(x.s, { mark: ch }) + '</div>' +
            '<div class="vi-line">' + exampleViHtml(x) + '</div>' +
            '<button class="chip" data-act="speak" data-text="' + esc(x.s) + '">' + (phrase ? '🔈 Nghe' : '🔈 Nghe câu') + '</button></div>';
    }

    function perThousand(entry) {
        var v = entry.n / DECK.total * 1000;
        if (v >= 1) return v.toLocaleString('vi-VN', { maximumFractionDigits: v < 10 ? 1 : 0 });
        return null;
    }

    // ---------- giọng đọc ----------

    // 20 ms im lặng (WAV PCM 8 bit, 8 kHz): 44 byte đầu tệp rồi 160 byte 0x80, tức 53 lần 'gICA' trong base64.
    var SILENT_WAV = 'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACA' + new Array(54).join('gICA');
    // Thứ tự thử: [engine, chờ bao lâu (ms) trước lượt đó]. Edge hai lần (lần 2 sau 600 ms: phiên Edge thỉnh thoảng rớt
    // giữa chừng, như tts.js của Reader), rồi TikTok ngay, rồi Edge lần cuối sau 1,5 s. Edge hỏng hai lần liền thì trong
    // TTS_EDGE_DOWN_MS sau đó TikTok đi trước, để mỗi lần Nghe không phải chờ Edge hỏng lại; Edge trả lời được là về lại
    // thứ tự thường.
    var TTS_PLAN = [['edge', 0], ['edge', 600], ['tiktok', 0], ['edge', 1500]];
    var TTS_PLAN_EDGE_DOWN = [['tiktok', 0], ['edge', 0], ['tiktok', 1500]];
    var TTS_EDGE_DOWN_MS = 5 * 60 * 1000;

    function ttsAudio() {
        if (!ttsEl) ttsEl = new window.Audio();
        return ttsEl;
    }

    // TikTok không nhận tốc độ đọc: bản của nó phát chậm lại theo đúng tỉ lệ của Edge (−10 → 0,9; −25 → 0,75).
    function ttsSpeed(engine, rate) {
        return engine === 'tiktok' ? Math.max(0.5, 1 + rate / 100) : 1;
    }

    // Phát bản đọc trên thẻ dùng chung. Đổi src đưa playbackRate về defaultPlaybackRate, nên đặt cả hai sau src.
    // AbortError: lần Nghe sau đã đổi src, không phải lỗi. Tên lỗi chỉ ghi vào console (toast cho người chơi không cần
    // tên kỹ thuật).
    function playTts(entry) {
        var el = ttsAudio();
        el.src = entry.url;
        el.defaultPlaybackRate = entry.speed;
        el.playbackRate = entry.speed;
        el.play().catch(function (err) {
            var name = (err && err.name) || 'Error';
            if (name === 'AbortError') return;
            if (window.console && console.info) console.info('Quy Vân: play() lỗi ' + name);
            toast(name === 'NotAllowedError'
                ? 'Trình duyệt chưa cho phát tiếng. Chạm Nghe lần nữa.'
                : 'Chưa phát được giọng đọc. Chạm Nghe lần nữa.');
        });
    }

    // Giữ tối đa TTS_CACHE_MAX bản đọc; bản dùng lâu nhất bị bỏ và thu hồi blob URL (trừ bản thẻ <audio> đang giữ).
    function ttsRemember(key, entry) {
        ttsCache[key] = entry;
        ttsTouch(key);
        while (ttsOrder.length > TTS_CACHE_MAX) {
            var old = ttsOrder.shift();
            var e = ttsCache[old];
            delete ttsCache[old];
            if (e && !(ttsEl && ttsEl.src === e.url)) URL.revokeObjectURL(e.url);
        }
    }

    function ttsTouch(key) {
        var i = ttsOrder.indexOf(key);
        if (i >= 0) ttsOrder.splice(i, 1);
        ttsOrder.push(key);
    }

    function ttsBody(engine, text, rate) {
        return engine === 'tiktok'
            ? { text: text, voice: TTS_FALLBACK_VOICE, engine: 'tiktok' }
            : { text: text, voice: TTS_VOICE, engine: 'edge', rate: rate };
    }

    // Tải bản đọc theo plan, từ lượt step. cb(null, { url, speed }) khi được; cb('missing') khi trang không có proxy
    // (404, 405, 501, hay trả về thứ không phải âm thanh); cb('busy') khi mọi lượt đều lỗi (502 khi Edge TTS rớt, 503
    // khi proxy thiếu token TikTok, 429, mất mạng).
    function fetchTts(text, rate, plan, step, cb) {
        var engine = plan[step][0];
        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ttsBody(engine, text, rate))
        }).then(function (res) {
            if (res.ok && (res.headers.get('Content-Type') || '').indexOf('audio') >= 0) return res.blob();
            var err = new Error('tts ' + res.status);
            err.missing = res.ok || res.status === 404 || res.status === 405 || res.status === 501;
            throw err;
        }).then(function (blob) {
            if (engine === 'edge') ttsEdgeDownAt = 0;
            cb(null, { url: URL.createObjectURL(blob), speed: ttsSpeed(engine, rate) });
        }, function (err) {
            if (err && err.missing) {
                cb('missing');
                return;
            }
            var next = plan[step + 1];
            if (!next) {
                cb('busy');
                return;
            }
            if (engine === 'edge' && next[0] === 'tiktok') ttsEdgeDownAt = Date.now();
            setTimeout(function () { fetchTts(text, rate, plan, step + 1, cb); }, next[1]);
        });
    }

    // opts.rate: tốc độ đọc của Edge TTS (mặc định −10; lời hát đọc chậm hơn, −25).
    // iOS chỉ cho một thẻ <audio> phát tiếng sau khi thẻ đó được play() ngay trong một cú chạm, mà bản đọc chỉ về sau
    // fetch. Nên câu chưa tải thì thẻ dùng chung phát một mẫu im lặng ngay trong cú chạm (cũng dừng giọng đang đọc),
    // bản đọc về thì phát trên đúng thẻ đó. Một lần tải hỏng không tắt giọng đọc: lần Nghe sau tải lại.
    var ttsAudioEl = null;

    function playOnlineTts(cleanText) {
        if (!ttsAudioEl) {
            ttsAudioEl = document.createElement('audio');
            ttsAudioEl.referrerPolicy = 'no-referrer';
            document.body.appendChild(ttsAudioEl);
        }
        try {
            ttsAudioEl.pause();
            ttsAudioEl.currentTime = 0;
            // Split if longer than 150 chars to avoid URL length limit
            var textToPlay = cleanText.length > 150 ? cleanText.slice(0, 150) : cleanText;
            var encoded = encodeURIComponent(textToPlay);
            ttsAudioEl.src = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=' + encoded;
            var p = ttsAudioEl.play();
            if (p && p.catch) {
                p.catch(function (err) {
                    console.warn('Audio play error:', err);
                });
            }
        } catch (e) {
            console.warn('playOnlineTts error:', e);
        }
    }

    function speak(text, opts) {
        if (!text || typeof window === 'undefined') return;
        var clean = (typeof Core !== 'undefined' && Core.plainZh) ? Core.plainZh(text) : String(text);
        clean = clean.replace(/\{[^}]*\}/g, '').trim();
        if (!clean) return;

        // Check if browser has a real native Chinese voice installed
        var hasChineseVoice = false;
        var chosenVoice = null;
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.resume();
                var voices = window.speechSynthesis.getVoices();
                if (voices && voices.length) {
                    for (var i = 0; i < voices.length; i++) {
                        var v = voices[i];
                        if (v.lang === 'zh-CN' || v.lang === 'zh_CN' || (v.lang && v.lang.indexOf('zh') === 0)) {
                            hasChineseVoice = true;
                            chosenVoice = v;
                            break;
                        }
                    }
                }
            } catch (e) {}
        }

        // If native Chinese voice is available (iOS, Android, Mac, or Windows with Chinese language pack):
        if (hasChineseVoice && window.SpeechSynthesisUtterance) {
            try {
                window.speechSynthesis.cancel();
                var u = new SpeechSynthesisUtterance(clean);
                u.voice = chosenVoice;
                u.lang = 'zh-CN';
                u.rate = 0.85;
                if (opts && typeof opts.rate === 'number') {
                    u.rate = Math.max(0.5, Math.min(1.5, 0.85 + opts.rate / 100));
                }
                window._currentUtterance = u;
                u.onend = function () { window._currentUtterance = null; };
                u.onerror = function () {
                    window._currentUtterance = null;
                    playOnlineTts(clean);
                };
                window.speechSynthesis.speak(u);
                return;
            } catch (e) {
                console.warn('SpeechSynthesis error, falling back:', e);
            }
        }

        // Fallback: Online high quality Google Chinese TTS (plays on any device even without Chinese voice pack!)
        playOnlineTts(clean);
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = function () {
                window.speechSynthesis.getVoices();
            };
        }
    }

    // ---------- thế giới, thanh trên, lời nhắc ----------

    // Mặc định: chỉ có đêm sau khi thắp đèn (sửa "den"), để người mới không vào một hòn đảo tối om.
    // Cài đặt "Ngày và đêm" trong Sổ (luôn ngày, luôn đêm) thắng; rồi tới ?night=1 và đèn lồng Sơn môn.
    function isNight() {
        if (nightMode === 'day') return false;
        if (nightMode === 'night') return true;
        if (URL_NIGHT || forcedNight) return true;
        if (!Core.hasRepair(state, 'den')) return false;
        var h = new Date().getHours();
        return h >= 18 || h < 6;
    }

    // Bối cảnh lõi dùng khi xét cảnh: ngày hay đêm, ngày của lịch đêm (Core.nightDay: đồng hồ gọi món lùi 6 giờ,
    // nên 23:50 và 00:10 là cùng một đêm; ?day=N dời được), truyện ép.
    // cover: độ phủ đọc cho điều kiện when.cover (Nhan Như Ngọc chỉ ra khỏi sách khi đã đọc được nhiều).
    // ram: đêm rằm của ngày lịch đêm (Core.ramInfo) cho điều kiện when.ram, null khi không phải.
    function sceneCtx() {
        return { night: isNight(), day: Core.nightDay(orderNow()), forceTale: FORCE_TALE, cover: Core.coverage(state, DECK), ram: ramNow() };
    }

    // ---------- đêm rằm: đố đèn ----------

    // Đêm rằm của đêm nay theo ngày lịch đêm (Core.nightDay, ?day=N dời được); ?ram=M ép rằm tháng M. null khi không phải.
    function ramNow() {
        if (URL_RAM) return Core.ramFor(URL_RAM);
        return Core.ramInfo(Core.nightDay(orderNow()));
    }

    // Đố đèn mở khi: ban đêm, đêm rằm, đã nghe Lão Quy kể tục treo đèn (cảnh quy-ram).
    function ramOpen() {
        return !!(state && state.flags['quy-ram'] && isNight() && ramNow());
    }

    // Chốt bộ đèn của tháng khi đố đèn mở (lõi giữ nguyên bộ trong cả tháng). Trả true khi state đổi.
    function refreshRam() {
        if (!ramOpen()) return false;
        var before = state.ram && state.ram.key;
        Core.ensureRam(state, STORY, DECK, ramNow());
        if (before === state.ram.key) return false;
        saveSoon();
        return true;
    }

    // Số đèn chưa giải của đêm rằm đang mở; 0 khi không có đố đèn hay đã giải đủ.
    function ramLeft() {
        if (!ramOpen()) return 0;
        var info = ramNow();
        var ram = state.ram;
        if (!ram || ram.key !== info.key || !Array.isArray(ram.set)) return info.size;
        return ram.set.filter(function (id) { return !(ram.solved && ram.solved[id]); }).length;
    }

    // Cảnh đang chờ ở một nơi: 'hub', 'tea', 'pond', 'library', 'study', 'gate', 'garden', 'pavilion'.
    function placeScene(id) {
        return Core.nextScene(state, STORY, id, sceneCtx());
    }

    function hubScene() {
        return placeScene('hub');
    }

    function teaScene() {
        return Core.hasRepair(state, 'san') ? placeScene('tea') : null;
    }

    // Lõi chọn khách lạ cho đêm nay (cố định theo ngày). Trả true khi truyện của đêm đổi.
    function refreshNight() {
        var before = state.night ? state.night.day + '|' + state.night.tale : '';
        Core.ensureNight(state, STORY, orderNow(), sceneCtx());
        var after = state.night ? state.night.day + '|' + state.night.tale : '';
        if (before === after) return false;
        saveSoon();
        return true;
    }

    // Truyện của đêm nay; null khi ban ngày hay đêm nay không có khách lạ.
    function nightTale() {
        if (!state.night || !state.night.tale || !isNight()) return null;
        if (state.night.day !== Core.nightDay(orderNow())) return null;
        return Core.taleById(STORY, state.night.tale);
    }

    // Cảnh của khách lạ đêm nay đang chờ ở nơi hẹn: { tale, scene } hoặc null.
    function strangerScene() {
        var tale = nightTale();
        if (!tale) return null;
        var sc = placeScene(tale.place);
        return sc && sc.tale === tale.id ? { tale: tale, scene: sc } : null;
    }

    function arrivalKey(guest) {
        return guest + '|' + (state.night ? state.night.day : '');
    }

    // Khách đêm trên đảo: khi có cảnh chờ, hoặc khi đang được tiễn (actor ở lại tới lúc ra cổng).
    function nightVisitors() {
        var tale = nightTale();
        if (!tale) return [];
        if (!strangerScene() && !(leaving && leaving.tale === tale.id)) return [];
        var form = guestForm(tale.guest);
        return [{ id: tale.guest, sprite: guestSprite(tale.guest, form), place: tale.place, glow: true }];
    }

    // Khách hiện trên đảo khi đang có chuyện ở Quán trà hoặc đã quen.
    function guestShown(id) {
        if (!Core.hasRepair(state, 'san')) return false;
        var tea = teaScene();
        return !!((tea && tea.guest === id) || state.friends[id] || state.residents.indexOf(id) >= 0);
    }

    function worldState() {
        var repairs = {};
        Core.REPAIRS.forEach(function (r) {
            if (Core.hasRepair(state, r.id)) repairs[r.id] = true;
        });
        var marks = {};
        if (hubScene()) marks['lao-quy'] = '!';
        var tea = teaScene();
        if (tea) marks[tea.guest] = '!';
        openOrders().forEach(function (o) {
            if (!marks[o.guest]) marks[o.guest] = '!';
        });
        // Dấu "!" của khách đêm chỉ hiện khi khách đã đi từ cổng tới nơi hẹn.
        var waiting = strangerScene();
        if (waiting && arrivals[arrivalKey(waiting.tale.guest)] === 'here') marks[waiting.tale.guest] = '!';
        // Lưu niệm có vật trên đảo (miếu Thổ Địa, lá bùa trên cổng, mẫu đơn nở).
        var keeps = {};
        Object.keys(state.keepsakes || {}).forEach(function (id) {
            if (state.keepsakes[id]) keeps[id] = true;
        });
        // Tô điểm đã mua (đèn hoa đăng, chuông gió, cá chép, cây đào, hạc).
        var decor = {};
        (state.decor || []).forEach(function (id) { decor[id] = true; });
        return {
            repairs: repairs,
            keeps: keeps,
            decor: decor,
            night: isNight(),
            guests: { quy: true, nguyet: guestShown('ho-nguyet'), mac: guestShown('tieu-mac'), ly: guestShown('tieu-ly') },
            visitors: nightVisitors(),
            // Đêm rằm: trăng tròn trên trời (mọi đêm rằm) và hàng đèn đố chữ dưới hiên Chính điện (khi đố đèn mở).
            ram: !!(isNight() && ramNow()),
            ramLamps: ramOpen() ? (state.ram && Array.isArray(state.ram.set) && state.ram.key === ramNow().key ? state.ram.set.length : ramNow().size) : 0,
            marks: marks
        };
    }

    // Gửi state cho thế giới chỉ khi khác lần trước: setState dựng lại actor, gửi thừa (mỗi lần tick)
    // sẽ phá bước đi đang chạy. Trước đó cho lõi chọn lại khách lạ: đêm chưa có truyện thì câu con cá thứ 5,
    // học xong cuộn, sửa đèn… có thể làm một truyện đủ điều kiện, và khách đến ngay.
    function syncWorld() {
        if (state) {
            refreshNight();
            refreshRam();
        }
        if (world) {
            var ws = worldState();
            var key = JSON.stringify(ws);
            if (key !== worldKey) {
                worldKey = key;
                world.setState(ws);
            }
            arriveVisitors(ws.visitors);
        }
        renderMarks();
    }

    // Đi tới target (id điểm đi hoặc id nơi); actor đang đi dở thì dừng bước cũ trước.
    function walkTo(id, target, opts) {
        if (world.walking(id)) world.stopWalk(id);
        return world.walk(id, target, opts);
    }

    // Khách đêm lần đầu có mặt trong phiên (theo ngày): đi từ Sơn môn vào nơi hẹn, tới nơi mới có dấu "!".
    function arriveVisitors(list) {
        (list || []).forEach(function (v) {
            var key = arrivalKey(v.id);
            if (arrivals[key] || (leaving && leaving.guest === v.id)) return;
            arrivals[key] = 'walking';
            world.show(v.id);
            var landed = function () {
                if (arrivals[key] !== 'walking') return;
                arrivals[key] = 'here';
                syncWorld();
            };
            walkTo(v.id, v.place, { from: 'gate', glow: true }).then(landed, landed);
        });
    }

    // Tiễn khách đêm khi mọi panel đã đóng: khách đi ra Sơn môn rồi biến mất. Cá trắng và ong xanh ở
    // hình thật thì biến mất ngay (lặn xuống hồ, bay đi) kèm một dòng báo.
    function departIfReady() {
        var lv = leaving;
        if (!lv || !lv.ready || lv.going || !world) return;
        if (!ui.sheet.hidden || dialog || quiz || cooking || riddle || paper) return;
        lv.going = true;
        var gone = function () {
            world.hide(lv.guest);
            if (leaving === lv) leaving = null;
            // Khách quay lại (cảnh kế tiếp cùng đêm theo lịch của lõi) thì lại đi từ cổng vào.
            delete arrivals[arrivalKey(lv.guest)];
            syncWorld();
        };
        if (lv.form === 'true' && VANISH[lv.guest]) {
            toast(VANISH[lv.guest]);
            gone();
            return;
        }
        walkTo(lv.guest, 'gate').then(gone, gone);
    }

    // Chạm đèn lồng Sơn môn (World báo onPlace('lantern')) hoặc bấm nút trong panel Sơn môn; chỉ có sau khi sửa
    // "den". Thắp đèn sang đêm trong phiên này, chạm lần nữa thì tắt. Cài đặt "Ngày và đêm" trong Sổ thắng; đêm
    // thật thì đèn đã sáng.
    function onLantern() {
        if (fishing) {
            toast('Đang câu cá. Bấm “Thu cần” để rời hồ.');
            return;
        }
        if (quiz || dialog || cooking || riddle || paper) return;
        if (nightMode === 'day') {
            sfx('tap');
            toast('Sổ đang đặt “Luôn ban ngày”. Đổi ở mục Ngày và đêm để thắp đèn.');
            return;
        }
        if (!isNight()) {
            forcedNight = true;
            sessionSet(FORCE_NIGHT_KEY, '1');
            sfx('bell');
            refreshNight();
            syncWorld();
            toast('Đèn thắp rồi, trăng lên.');
            return;
        }
        if (forcedNight && nightMode !== 'night') {
            forcedNight = false;
            sessionDel(FORCE_NIGHT_KEY);
            sfx('tap');
            refreshNight();
            syncWorld();
            toast(isNight() ? 'Đã tắt đèn lồng.' : 'Đã tắt đèn lồng, trời sáng lại.');
            return;
        }
        sfx('tap');
        toast('Trăng đã lên, đèn lồng Sơn môn đang sáng.');
    }

    // Ban ngày mà có truyện hay lần khách cũ ghé lại đủ điều kiện (chưa xong) hoặc đang dở: trả truyện đó (khách
    // chờ trăng lên), truyện chính trước. Không có thì null.
    function taleAwaitsNight() {
        if (isNight()) return null;
        var ctx = { night: true, day: Core.nightDay(orderNow()), forceTale: '', cover: Core.coverage(state, DECK), ram: ramNow() };
        var list = nightList();
        for (var i = 0; i < list.length; i++) {
            var t = list[i];
            var rec = state.tales ? state.tales[t.id] : null;
            if (rec && rec.done) continue;
            if ((rec && rec.started) || Core.meets(state, t.when, ctx)) return t;
        }
        return null;
    }

    function renderMarks() {
        if (world) {
            var due = Core.dueList(state, now()).length;
            var r = Core.nextRepair(state);
            world.setBadge('study', due ? String(due) : (state.scrolls === 0 && state.flags.intro ? '!' : ''));
            world.setBadge('tea', teaScene() ? '!' : '');
            world.setBadge('hall', (r && state.flags.intro && state.lk >= r.cost) || ramLeft() ? '!' : '');
            var nOrders = openOrders().length;
            world.setBadge('kitchen', nOrders ? String(nOrders) : '');
            // Thư chưa đọc ở Sơn môn (như số món ở bếp); trang sách mới đọc được ở Tàng Kinh Các.
            var mctx = sceneCtx();
            var nLetters = letterList(mctx).filter(function (x) { return x.state === 'unread' || x.state === 'reading'; }).length;
            world.setBadge('gate', nLetters ? String(nLetters) : '');
            world.setBadge('library', pageWaiting(mctx) ? '!' : '');
        }
        renderHint();
    }

    function renderStats(bump) {
        ui.statLk.querySelector('b').textContent = num(state.lk);
        ui.statCover.querySelector('b').textContent = pct(Core.coverage(state, DECK));
        if (bump) {
            ui.statLk.classList.remove('bump');
            void ui.statLk.offsetWidth;
            ui.statLk.classList.add('bump');
        }
        var on = state.settings.sfx || state.settings.music;
        ui.btnSound.textContent = on ? '🔊' : '🔇';
        ui.btnSound.setAttribute('aria-label', on ? 'Tắt âm thanh' : 'Bật âm thanh');
    }

    function hintText() {
        if (!state.flags.intro) return 'Cháu về rồi à? Lại đây ta kể chuyện.';
        if (state.scrolls === 0) return 'Lên Thư trai học cuộn chữ đầu tiên đi.';
        if (hubScene()) return 'Lại đây, ta có chuyện muốn nói.';
        // Khách lạ chỉ ở lại một đêm: nhắc trước việc sửa quán.
        var stranger = strangerScene();
        if (stranger) return (isVisit(stranger.tale) ? 'Có khách cũ ghé lại ở ' : 'Có khách lạ ở ') + placeName(stranger.tale.place) + '.';
        if (ramLeft()) return 'Đêm rằm: trước Chính điện treo đèn đố chữ.';
        // Thư của khách cũ ở Sơn môn, trang mới của sách Như Ngọc ở Tàng Kinh Các.
        var letter = letterWaiting();
        if (letter) return 'Có thư của ' + (guestOf(letter.from) || { name: letter.from }).name + ' ở Sơn môn.';
        if (pageWaiting()) return 'Sách của Như Ngọc có trang mới. Lên Tàng Kinh Các.';
        var r = Core.nextRepair(state);
        if (r && state.lk >= r.cost) return 'Đủ linh khí rồi. Lên Chính điện: ' + r.name.toLowerCase() + '.';
        var tea = teaScene();
        if (tea) return guestOf(tea.guest).name + ' đang chờ ở Quán trà.';
        var orders = openOrders();
        if (orders.length > 1) return 'Có ' + orders.length + ' khách gọi món. Vào Nhà bếp nấu đi.';
        if (orders.length) return guestOf(orders[0].guest).name + ' gọi món. Vào Nhà bếp nấu đi.';
        var waiting = taleAwaitsNight();
        if (waiting) {
            var who = isVisit(waiting) ? 'Khách cũ hẹn ghé lại' : 'Khách lạ chỉ đến';
            return nightMode === 'day'
                ? who + ' khi trăng lên. Sổ đang đặt “Luôn ban ngày”.'
                : who + ' khi trăng lên. Ra thắp đèn lồng ở Sơn môn.';
        }
        // Hàng ôn dồn: nhắc ôn ở Thư trai (có câu nghĩa, điền chữ) trước khi học cuộn mới.
        var pile = Core.reviewBacklog(state, now());
        if (pile) return 'Chữ cũ dồn lại rồi: ' + pile + ' chữ đến hạn ôn. Lên Thư trai ôn trước rồi hẵng học cuộn mới.';
        var dh = dueHint();
        if (dh) return 'Có ' + dh.n + ' chữ đến hạn ôn. ' + (dh.place === 'study' ? 'Lên Thư trai ôn bài.' : 'Ra Hồ sen câu cá là ôn luôn.');
        if (r) return 'Cần thêm ' + (r.cost - state.lk) + ' linh khí để ' + r.name.toLowerCase() + '. Đọc đúng chữ là có linh khí.';
        return 'Quán sửa xong rồi. Học thêm chữ để đọc được nhiều hơn.';
    }

    // Từ 3 chữ đến hạn thì nhắc ôn: ra Hồ sen khi câu cá ôn được hết (Core.fishDueList), còn chữ chờ câu chọn thì lên
    // Thư trai. hintText và hintAction dùng chung để chữ nhắc và nơi mở khớp nhau.
    function dueHint() {
        var due = Core.dueList(state, now()).length;
        if (due < 3) return null;
        return { n: due, place: Core.fishDueList(state, now()).length < due ? 'study' : 'pond' };
    }

    // Chạm lời nhắc thì đi luôn tới việc Lão Quy gợi ý.
    function hintAction() {
        if (hubScene()) {
            openHubScene();
            return;
        }
        if (state.scrolls === 0) return openPlace('study');
        var stranger = strangerScene();
        if (stranger) return openPlace(stranger.tale.place);
        if (ramLeft()) return openPlace('hall');
        if (letterWaiting()) return openPlace('gate');
        if (pageWaiting()) return openPlace('library');
        var r = Core.nextRepair(state);
        if (r && state.lk >= r.cost) return openPlace('hall');
        if (teaScene()) return openPlace('tea');
        if (openOrders().length) return openPlace('kitchen');
        // Panel Sơn môn có nút thắp đèn (đèn đá trên bản đồ khó chạm trúng ở điện thoại).
        if (taleAwaitsNight()) return openPlace(nightMode === 'day' ? 'book' : 'gate');
        if (Core.reviewBacklog(state, now())) return openPlace('study');
        var dh = dueHint();
        if (dh) return openPlace(dh.place);
        if (r) return openPlace('pond');
        openPlace('study');
    }

    function renderHint() {
        var busy = !!(place || quiz || dialog || fishing || cooking || riddle || paper);
        ui.hint.hidden = busy;
        if (!busy) {
            ui.hintText.textContent = hintText();
            paintArt(ui.hint);
        }
    }

    // ---------- panel nơi chốn ----------

    function openPlace(id) {
        if (fishing) {
            toast('Đang câu cá. Bấm “Thu cần” để rời hồ.');
            return;
        }
        if (quiz || dialog || cooking) return;
        place = id;
        dict = { q: '', f: 'all', g: '' };
        bookPick = { open: false, loading: false, busy: bookPick.busy };
        hidePopover();
        sfx('tap');
        if (world && id !== 'book') {
            world.focus(id, 0.2);
            keeperTo(id);
        }
        openSheet(id === 'book' || id === 'library' ? 'tall' : '');
        renderPlace();
    }

    // Quán chủ đi tới nơi vừa mở; nơi không có điểm đi thì đứng yên.
    function keeperTo(id) {
        try {
            var p = walkTo('keeper', id);
            if (p && typeof p.then === 'function') p.then(null, function () { /* nơi không có điểm đi */ });
        } catch (e) { /* nơi không có điểm đi */ }
    }

    // Thẻ đầu panel khi khách lạ của đêm nay đang chờ ở nơi này.
    function strangerHtml(where) {
        var sc = placeScene(where);
        if (!sc || !sc.tale) return '';
        var g = guestOf(sc.guest);
        if (!g) return '';
        var title = isVisit(Core.taleById(STORY, sc.tale)) ? '<span class="zh">归</span>Khách cũ ghé lại' : '<span class="zh">夜</span>Có khách lạ';
        return '<div class="card stranger"><h2>' + title + '</h2><div class="guest-card">' +
            faceHtml(sc.guest, '', guestForm(sc.guest)) +
            '<div><div class="name">' + esc(g.name) + '<span class="zh">' + esc(g.zh) + '</span></div>' +
            '<div class="small muted">' + esc(g.title) + '</div></div></div>' +
            '<div class="row end" style="margin-top:10px"><button class="btn-primary" data-act="scene" data-where="' + esc(where) + '">' +
            (state.progress[sc.id] !== undefined ? 'Tiếp tục' : 'Gặp') + '</button></div></div>';
    }

    function renderPlace() {
        if (!place) return;
        var p = PLACES[place];
        var body;
        if (place === 'hall') body = hallHtml();
        else if (place === 'study') body = studyHtml();
        else if (place === 'pond') body = pondHtml();
        else if (place === 'tea') body = teaHtml();
        else if (place === 'gate') body = gateHtml();
        else if (place === 'library') body = libraryHtml();
        else if (place === 'kitchen') body = kitchenHtml();
        else if (place === 'garden') body = gardenHtml();
        else if (place === 'pavilion') body = pavilionHtml();
        else body = bookHtml();
        if (STRANGER_PLACES.indexOf(place) >= 0) body = strangerHtml(place) + body;
        ui.sheet.innerHTML = '<div class="sheet-title"><span class="zh">' + p.zh + '</span><b>' + esc(p.vi) + '</b>' +
            '<button class="btn-ghost close" data-act="closeSheet">Đóng</button></div>' + body;
        paintArt(ui.sheet);
    }

    function openHubScene() {
        var sc = hubScene();
        if (sc) openScene(sc);
        else toast('Lão Quy: ' + hintText());
    }

    // Chạm nhân vật trên đảo.
    function onActor(id) {
        if (fishing || quiz || dialog || cooking || riddle || paper) return;
        if (id === 'lao-quy') {
            openHubScene();
            return;
        }
        if (id === 'keeper') {
            toast('Đây là bạn, quán chủ mới của Quy Vân Quán.');
            return;
        }
        var g0 = guestOf(id);
        if (g0 && g0.night) {
            // Khách đêm: mở cảnh đang chờ ở nơi hẹn; xong cảnh rồi thì khách đang ra về.
            var tale = taleOfGuest(id);
            var sc = tale ? placeScene(tale.place) : null;
            if (sc && sc.guest === id) openScene(sc);
            else toast(g0.name + ' đang ra về.');
            return;
        }
        var tea = teaScene();
        if (tea && tea.guest === id) {
            openScene(tea);
            return;
        }
        var order = orderOf(id);
        if (order) {
            startCook(order);
            return;
        }
        var g = guestOf(id);
        if (g) toast(g.name + (state.residents.indexOf(id) >= 0 ? ' đang ở lại quán.' : ' đang nghỉ chân.'));
    }

    // ---------- chính điện: sửa quán ----------

    function hallHtml() {
        var html = ramCardHtml();
        if (hubScene()) {
            html += '<div class="card"><div class="hint-line">' + faceHtml('lao-quy') +
                '<p><b>Lão Quy</b> có chuyện muốn nói.</p></div>' +
                '<div class="row end" style="margin-top:8px"><button class="btn-primary" data-act="scene" data-where="hub">Nghe Lão Quy</button></div></div>';
        }
        var r = Core.nextRepair(state);
        html += '<div class="card"><h2><span class="zh">修</span>Sửa quán</h2>';
        if (r) {
            html += '<div class="repair"><div class="grow"><b>' + esc(r.name) + '</b><div class="small muted">' + esc(r.note) + '</div></div>' +
                '<span class="cost">' + r.cost + ' 灵</span></div>' +
                '<p class="small muted" style="margin:6px 0 8px">Đang có ' + num(state.lk) + ' 灵. Đọc đúng chữ (học, ôn, câu cá) là có linh khí.</p>' +
                '<div class="row end"><button class="btn-primary" data-act="repair"' +
                (state.lk >= r.cost && state.flags.intro ? '' : ' disabled') + '>Sửa</button></div>';
        } else {
            html += '<p class="muted">Quy Vân Quán đã sửa xong.</p>';
        }
        html += '<ul class="repair-list">' + Core.REPAIRS.map(function (x) {
            var done = Core.hasRepair(state, x.id);
            return '<li class="' + (done ? 'done' : '') + '">' + (done ? '✓ ' : '· ') + esc(x.name) +
                (done ? '' : ' — ' + x.cost + ' 灵') + '</li>';
        }).join('') + '</ul></div>';
        return html + decorHtml();
    }

    // Thẻ đố đèn ở đầu panel Chính điện (đêm rằm, sau cảnh quy-ram): các đèn của tháng; đèn đã giải hiện đáp án.
    function ramCardHtml() {
        if (!ramOpen()) return '';
        refreshRam();
        var info = ramNow();
        var ram = state.ram;
        var fest = info.fest === 'trungthu' ? ' · Tết Trung thu' : (info.fest === 'nguyentieu' ? ' · Tết Nguyên tiêu' : '');
        var note = ram.done
            ? 'Đã giải đủ ' + ram.set.length + ' đèn. Rằm tháng sau lại có đèn mới.'
            : 'Mỗi đèn là một câu đố về một chữ. Giải đúng được ' + Core.RIDDLE_LK + ' 灵; đủ ' + ram.set.length + ' đèn thêm ' +
                Core.RAM_BONUS + ' 灵.';
        return '<div class="card ram-card"><h2><span class="zh">灯</span>Đố đèn đêm rằm</h2>' +
            '<p class="small muted" style="margin:0 0 8px">' + esc(info.name + fest) + '. ' + esc(note) + '</p>' +
            '<div class="ram-lamps">' + ram.set.map(function (id, i) {
                var r = Core.riddleById(STORY, id);
                var done = !!(ram.solved && ram.solved[id]);
                return '<button class="ram-lamp' + (done ? ' done' : '') + '" data-act="riddle" data-id="' + esc(id) + '">' +
                    '<span class="g" lang="zh">' + esc(done && r ? r.ans : '灯') + '</span>' +
                    '<span class="small">' + (done ? '✓ Đã giải' : 'Đèn ' + (i + 1)) + '</span></button>';
            }).join('') + '</div></div>';
    }

    // Màn một đèn: câu đố (luật âm như hội thoại), nút Dịch, bốn chữ để chọn. Sai hai lần thì hiện cách ghép; đúng thì
    // hiện đáp án, âm, nghĩa, cách ghép và linh khí vừa nhận.
    function openRiddle(id) {
        if (!ramOpen()) return;
        refreshRam();
        var r = Core.riddleById(STORY, id);
        if (!r || state.ram.set.indexOf(id) < 0) return;
        place = null;
        riddle = { id: id, tried: {}, miss: 0, vi: true, ruby: true, gain: '' };
        openSheet('dlg');
        renderRiddle();
    }

    function renderRiddle() {
        var r = Core.riddleById(STORY, riddle.id);
        var ram = state.ram;
        var solved = !!(ram.solved && ram.solved[riddle.id]);
        var rubyOpt = riddle.ruby ? { ruby: 'always' } : null;
        var head = '<div class="sheet-head"><div class="who"><span class="zh">灯谜</span> Đèn ' + (ram.set.indexOf(riddle.id) + 1) +
            '/' + ram.set.length + '<small>' + esc(ramNow() ? ramNow().name : 'Đêm rằm') + '</small></div>' +
            '<button class="btn-ghost close" data-act="closeSheet">Đóng</button></div>';
        var body = '<div class="riddle-card"><div class="zh-line">' + renderZh(r.zh, rubyOpt) + '</div>' +
            (riddle.vi ? '<div class="vi-line">' + esc(r.vi) + '</div>' : '') + '</div>' +
            '<p class="small muted" style="margin:0">Câu đố nói về một chữ. Chọn chữ đó:</p>' +
            '<div class="riddle-opts">' + Core.riddleOptions(r, ram.key).map(function (ch) {
                var cls = solved && ch === r.ans ? ' right' : (riddle.tried[ch] ? ' wrong' : '');
                var optEntry = DECK.byChar[ch];
                var optLabel = (riddle.ruby && optEntry && optEntry.py) ? '<ruby>' + esc(ch) + '<rt>' + esc(optEntry.py) + '</rt></ruby>' : esc(ch);
                return '<button class="riddle-opt' + cls + '" data-act="riddlePick" data-ch="' + esc(ch) + '" lang="zh"' +
                    (solved || riddle.tried[ch] ? ' disabled' : '') + '>' + optLabel + '</button>';
            }).join('') + '</div>';
        var foot = '';
        if (solved) {
            var e = DECK.byChar[r.ans];
            body += '<div class="reply riddle-answer"><b><span class="zh" lang="zh">' + esc(r.ans) + '</span> ' + esc(e ? (e.py ? e.py + ' / ' + e.hv : e.hv) : '') +
                '</b>' + (e ? ' · ' + esc(e.m) : '') + '<div class="small">Ghép: ' + esc(r.parts) + '</div>' +
                (riddle.gain ? '<div class="small riddle-gain">' + esc(riddle.gain) + '</div>' : '') + '</div>';
            var next = nextLamp();
            foot = next ? '<button class="btn-primary" data-act="riddle" data-id="' + esc(next) + '">Đèn tiếp ›</button>'
                : '<button class="btn-primary" data-act="closeRiddle">Xong</button>';
        } else if (riddle.miss >= 2) {
            body += '<p class="small reveal-hint">Gợi ý: ' + esc(r.parts) + '</p>';
        } else if (riddle.miss === 1) {
            body += '<p class="small muted">Chưa đúng. Nhìn kỹ từng phần của câu đố.</p>';
        }
        var tools = '<div class="dlg-tools"><button class="chip" data-act="riddleRuby" aria-pressed="' + riddle.ruby + '">Pinyin</button>' +
            '<button class="chip" data-act="riddleVi" aria-pressed="' + riddle.vi + '">Dịch</button>' +
            '<button class="chip" data-act="riddleSpeak">🔈 Nghe</button></div>';
        ui.sheet.innerHTML = head + body + tools + (foot ? '<div class="sheet-foot">' + foot + '</div>' : '');
    }

    // Đèn chưa giải kế tiếp (sau đèn đang mở, vòng lại từ đầu); '' khi đã giải đủ.
    function nextLamp() {
        var ram = state.ram;
        var i = ram.set.indexOf(riddle.id);
        for (var k = 1; k <= ram.set.length; k++) {
            var id = ram.set[(i + k) % ram.set.length];
            if (!(ram.solved && ram.solved[id])) return id;
        }
        return '';
    }

    function pickRiddle(ch) {
        if (!riddle) return;
        var res = Core.answerRiddle(state, STORY, riddle.id, ch, now(), SPEED);
        if (!res) return;
        if (!res.ok) {
            riddle.tried[ch] = true;
            riddle.miss++;
            sfx('bad');
            renderRiddle();
            return;
        }
        var gain = [];
        if (res.lk) gain.push('+' + res.lk + ' 灵');
        if (res.bonus) gain.push('Giải đủ đèn đêm rằm');
        riddle.gain = gain.join(' · ');
        sfx(res.bonus ? 'bell' : 'perfect');
        save();
        renderStats(res.lk > 0);
        renderRiddle();
    }

    // Tô điểm đạo quán: có sau khi lợp xong mái; món mở theo độ phủ đọc, mua bằng linh khí (Core.DECOR).
    function decorHtml() {
        if (!Core.decorOpen(state)) return '';
        var cover = Core.coverage(state, DECK);
        return '<div class="card"><h2><span class="zh">景</span>Tô điểm đạo quán</h2>' +
            '<p class="small muted" style="margin:0 0 8px">Đang có ' + num(state.lk) + ' 灵. Đọc được càng nhiều chữ, càng mở thêm món.</p>' +
            '<div class="decor-list">' + Core.decorList(state, cover).map(function (x) {
                var d = x.item;
                var right;
                if (x.status === 'done') right = '<span class="small decor-done">✓ Đã có</span>';
                else if (x.status === 'locked') right = '<span class="small muted decor-lock">Mở khi đọc được ' + Math.round(d.cover * 100) + '%</span>';
                else right = '<button class="btn" data-act="decor" data-id="' + d.id + '"' + (x.status === 'ready' ? '' : ' disabled') + '>' +
                    num(d.cost) + ' 灵</button>';
                return '<div class="repair decor ' + x.status + '"><div class="grow"><b><span class="zh" lang="zh">' + esc(d.zh) + '</span> ' +
                    esc(d.name) + '</b><div class="small muted">' + esc(d.hv) + ' · ' + esc(d.note) + '</div></div>' + right + '</div>';
            }).join('') + '</div></div>';
    }

    function doDecor(id) {
        var d = Core.buyDecor(state, id, Core.coverage(state, DECK));
        if (!d) return;
        sfx('bell');
        toast('Đã có: ' + d.name + '.');
        save();
        renderStats(true);
        if (id === 'chuong') applySound();
        closeSheet();
        syncWorld();
        if (world) world.focus(d.place, 0.42);
    }

    function residentsHtml() {
        if (!state.residents.length) return '';
        return '<div class="card"><h2><span class="zh">住</span>Khách đã ở lại</h2><div class="residents">' +
            state.residents.map(function (id) {
                var g = guestOf(id);
                return '<span class="resident">' + faceHtml(id) + esc(g.name) + '</span>';
            }).join('') + '</div></div>';
    }

    // Thẻ chữ đang mở (?card= từ Reader) cũng chặn: mở cảnh sẽ đóng thẻ.
    function maybeAutoScene() {
        var scene = hubScene();
        if (!scene || autoOpened[scene.id] || dialog || quiz || fishing || place || riddle || paper || card) return;
        autoOpened[scene.id] = true;
        setTimeout(function () {
            if (!dialog && !quiz && !fishing && !place && !riddle && !paper && !card) openScene(scene);
        }, 450);
    }

    function doRepair() {
        var r = Core.doRepair(state);
        if (!r) return;
        sfx('bell');
        toast('Đã sửa: ' + r.name + '.');
        save();
        renderStats(true);
        closeSheet();
        if (world) world.focus(REPAIR_FOCUS[r.id] || 'hall', 0.42);
        setTimeout(maybeAutoScene, 1800);
    }

    // ---------- sơn môn ----------

    function plaqueLesson(chars) {
        return '<div class="plaque-lesson">' + chars.map(function (c) {
            return '<span><span class="g" lang="zh">' + c[0] + '</span><span class="r">' + c[1] + '</span><span class="m">' + c[2] + '</span></span>';
        }).join('') + '</div>';
    }

    // Đèn lồng Sơn môn ngay trong panel: đèn đá trên bản đồ chỉ rộng khoảng 18 px ở điện thoại, khó chạm trúng.
    function lanternHtml() {
        var note, btn = '';
        if (nightMode === 'day') {
            note = 'Sổ đang đặt “Luôn ban ngày”. Đổi ở mục Ngày và đêm để thắp đèn.';
        } else if (!isNight()) {
            note = 'Khách lạ chỉ đến khi trăng lên. Thắp đèn thì trời tối ngay, tới khi bạn tắt đèn hoặc đóng tab.';
            btn = 'Thắp đèn lồng';
        } else if (forcedNight && nightMode !== 'night') {
            note = 'Đèn lồng đang sáng.';
            btn = 'Tắt đèn lồng';
        } else {
            note = 'Trăng đã lên, đèn lồng đang sáng.';
        }
        return '<div class="card"><h2><span class="zh">灯</span>Đèn lồng</h2><p class="small muted">' + esc(note) + '</p>' +
            (btn ? '<div class="row end"><button class="btn-primary" data-act="lantern">' + btn + '</button></div>' : '') + '</div>';
    }

    function gateHtml() {
        var html = Core.hasRepair(state, 'den') ? lanternHtml() : '';
        html += lettersHtml();
        html += '<div class="card"><h2><span class="zh">匾</span>Biển cổng</h2>' + plaqueLesson(GATE_CHARS) +
            '<p class="small muted">归云观 Quy Vân Quán: đạo quán nơi mây trở về núi. ' +
            'Khách yêu quái lên núi qua cổng này, rồi ghé Quán trà.</p></div>';
        var friends = Object.keys(state.friends);
        html += '<div class="card"><h2><span class="zh">友</span>Khách quen</h2>' + (friends.length ? '<div class="residents">' +
            friends.map(function (id) {
                var g = guestOf(id);
                return '<span class="resident">' + faceHtml(id) + '<span>' + esc(g.name) + '<span class="zh">' + esc(g.zh) + '</span><br>' +
                    '<span class="small muted">' + '❤'.repeat(Math.min(3, state.friends[id])) +
                    (state.residents.indexOf(id) >= 0 ? ' · ở lại quán' : '') + '</span></span></span>';
            }).join('') + '</div>' : '<p class="small muted">Chưa có khách nào. Sửa sân và treo biển ở Chính điện, khách sẽ tìm tới.</p>') + '</div>';
        return html;
    }

    // ---------- thư của khách cũ (Sơn môn), sách của Như Ngọc (Tàng Kinh Các) ----------
    // Thư và trang sách là cảnh manual: lõi không tự mở (Core.nextScene bỏ qua), app mở bằng openScene từ thẻ Thư ở Sơn
    // môn và thẻ Sách ở Tàng Kinh Các. Thư tới khi đủ when (when.after: số ngày sau khi truyện của khách xong, theo ngày
    // lịch đêm của sceneCtx); trang sách mở theo độ phủ đọc (when.cover) và trang trước.

    function letterScenes() {
        return STORY.scenes.filter(function (s) { return s.manual && s.letter; });
    }

    function pageScenes() {
        return STORY.scenes.filter(function (s) { return s.manual && s.book === 'sach'; })
            .sort(function (a, b) { return (a.page || 0) - (b.page || 0); });
    }

    // Trạng thái một cảnh manual: 'read' (đã xong), 'reading' (đang dở), 'ready' (đã tới mà chưa mở: Core.sceneOpen),
    // 'locked'.
    function manualState(sc, ctx) {
        if (Core.sceneDone(state, sc)) return 'read';
        if (state.progress[sc.id] !== undefined) return 'reading';
        return Core.sceneOpen(state, sc, ctx || sceneCtx()) ? 'ready' : 'locked';
    }

    // Mọi thư theo thứ tự trong story: { id, from, n (thư thứ mấy của khách đó), state: 'locked' | 'unread' | 'reading' |
    // 'read', scene }.
    function letterList(ctx) {
        var c = ctx || sceneCtx();
        var seen = {};
        return letterScenes().map(function (sc) {
            seen[sc.letter] = (seen[sc.letter] || 0) + 1;
            var st = manualState(sc, c);
            return { id: sc.id, from: sc.letter, n: seen[sc.letter], state: st === 'ready' ? 'unread' : st, scene: sc };
        });
    }

    // Thư đang dở ở bước mua giấy mực mà chưa đủ linh khí: lời nhắc bỏ qua, để người chơi thấy việc kiếm linh khí.
    function letterBlocked(sc) {
        var i = state.progress[sc.id];
        var step = i !== undefined ? sc.steps[i] : null;
        return !!(step && step.pay && state.lk < step.pay.cost);
    }

    // Thư lời nhắc nói tới: thư chưa đọc đầu tiên, hay thư đang dở mà đọc tiếp được. null khi không có.
    function letterWaiting(ctx) {
        var list = letterList(ctx);
        for (var i = 0; i < list.length; i++) {
            var x = list[i];
            if (x.state === 'unread' || (x.state === 'reading' && !letterBlocked(x.scene))) return x;
        }
        return null;
    }

    // Có trang sách đọc được mà chưa đọc xong (cần lưu niệm sach).
    function pageWaiting(ctx) {
        if (!(state.keepsakes && state.keepsakes.sach)) return false;
        var c = ctx || sceneCtx();
        return pageScenes().some(function (sc) {
            var st = manualState(sc, c);
            return st === 'ready' || st === 'reading';
        });
    }

    // Thẻ "信 Thư" ở Sơn môn, ngay dưới thẻ Đèn lồng: thư đã tới hay đã đọc, chưa đọc trước. Thư đã đọc không mở lại
    // (đọc lại sẽ cộng linh khí lần nữa).
    function lettersHtml() {
        var list = letterList().filter(function (x) { return x.state !== 'locked'; });
        if (!list.length) return '';
        var rank = { unread: 0, reading: 0, read: 1 };
        list.sort(function (a, b) { return rank[a.state] - rank[b.state]; });
        var NTH = { 2: 'thứ hai', 3: 'thứ ba' };
        return '<div class="card letters"><h2><span class="zh">信</span>Thư</h2>' +
            '<p class="small muted">Khách cũ gửi thư lên núi. Đọc thư, mua giấy mực rồi viết thư trả lời.</p>' +
            '<div class="letter-list">' + list.map(function (x) {
                var g = guestOf(x.from);
                var label = x.state === 'read' ? '✓ Đã đọc' : (x.state === 'reading' ? 'Đang đọc' : 'Chưa đọc');
                var nth = x.n > 1 ? 'Thư ' + (NTH[x.n] || 'thứ ' + x.n) + ' · ' : '';
                var btn = x.state === 'read' ? ''
                    : '<button class="' + (x.state === 'unread' ? 'btn-primary' : 'btn') + '" data-act="letter" data-id="' + esc(x.id) + '">' +
                        (x.state === 'reading' ? 'Đọc tiếp' : 'Đọc thư') + '</button>';
                return '<div class="letter-row ' + x.state + '">' + faceHtml(x.from) +
                    '<div class="grow"><b>Thư của ' + esc(g ? g.name : x.from) + '</b>' +
                    '<div class="small letter-state">' + esc(nth + label) + '</div></div>' + btn + '</div>';
            }).join('') + '</div></div>';
    }

    // Thẻ "书 Sách của Như Ngọc" ở Tàng Kinh Các, ngay dưới thẻ Biển lầu (có sau khi nhận lưu niệm sach).
    function bookPagesHtml() {
        if (!(state.keepsakes && state.keepsakes.sach)) return '';
        var pages = pageScenes();
        if (!pages.length) return '';
        var ctx = sceneCtx();
        return '<div class="card yan-book"><h2><span class="zh">书</span>Sách của Như Ngọc</h2>' +
            '<p class="small muted">Như Ngọc để lại cuốn sách ở đây. Đọc được càng nhiều chữ, sách càng mở thêm trang.</p>' +
            '<div class="page-list">' + pages.map(function (sc) {
                var st = manualState(sc, ctx);
                var right;
                if (st === 'read') right = '<span class="small page-done">✓ Đã đọc</span>';
                else if (st === 'locked') right = '<span class="small muted page-lock">' + esc(pageLockText(sc, ctx)) + '</span>';
                else {
                    right = '<button class="' + (st === 'ready' ? 'btn-primary' : 'btn') + '" data-act="page" data-id="' + esc(sc.id) + '">' +
                        (st === 'reading' ? 'Đọc tiếp' : 'Đọc ngay') + '</button>';
                }
                return '<div class="page-row ' + st + '"><b>Trang ' + (sc.page || '') + '</b>' + right + '</div>';
            }).join('') + '</div></div>';
    }

    // Trang chưa mở: còn thiếu độ phủ đọc (when.cover) thì ghi mốc; đủ rồi mà trang trước chưa đọc thì nói vậy.
    function pageLockText(sc, ctx) {
        var w = sc.when || {};
        if (w.cover && !(ctx.cover >= w.cover)) return 'Mở khi đọc được ' + Math.round(w.cover * 100) + '%';
        if (sc.page > 1) return 'Đọc xong trang ' + (sc.page - 1) + ' trước';
        return 'Chưa mở';
    }

    // Mở một thư hay một trang sách từ thẻ của nó (cảnh manual chưa xong, đang dở hoặc đủ điều kiện).
    function openManual(id) {
        var sc = Core.sceneById(STORY, id);
        if (!sc || !sc.manual) return;
        var st = manualState(sc);
        if (st !== 'ready' && st !== 'reading') return;
        sfx('page');
        openScene(sc);
    }

    // ---------- thư trai ----------

    function studyHtml() {
        var html = '';
        var todayCount = Core.learnedOn(state, now());
        var dueList = Core.dueList(state, now());
        html += '<div class="card" style="background:linear-gradient(135deg,rgba(128,180,220,0.12),rgba(184,64,44,0.06));border:1px dashed var(--color-primary,#80b4dc);border-radius:10px;padding:12px;margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<b style="font-size:1.05em">🎯 Định mức phiên học (5–10 phút)</b>' +
            '<span class="small muted">Chu kỳ 4 tiếng</span></div>' +
            '<div style="margin-top:8px;font-size:0.9em;line-height:1.6">' +
            '<div>📜 <b>1 Cuộn chữ mới:</b> Học 5 chữ Hán (hôm nay đã học: <b>' + num(todayCount) + '</b> chữ)</div>' +
            '<div>🐟 <b>Ôn bài / Câu cá:</b> 5–10 chữ cũ (đang chờ ôn: <b>' + num(dueList.length) + '</b> chữ)</div>' +
            '<div>🍵 <b>1 Lượt cốt truyện:</b> Tiếp khách hoặc nấu 1 món ăn</div>' +
            '</div></div>';

        var next = Core.nextScroll(state, DECK);
        // Học theo sách đang bật: cuộn lấy chữ chưa học gặp nhiều nhất trong sách (next.src 'book', next.fromBook chữ).
        var book = state.book && state.book.on ? state.book : null;
        if (next) {
            var gain = 0;
            next.chars.forEach(function (ch) { gain += DECK.byChar[ch].n; });
            var fromBook = next.src === 'book' && book;
            var bookGain = 0;
            if (fromBook) next.chars.forEach(function (ch) { bookGain += book.counts[ch] || 0; });
            // Dòng bù theo bộ chữ chỉ khi sách có chữ trong bộ chữ; sách không có chữ nào thì thẻ sách đã báo.
            var fill = book && Object.keys(book.counts || {}).length ? next.chars.length - (next.fromBook || 0) : 0;
            var today = Core.learnedOn(state, now());
            // Hàng ôn dồn: Lão Quy khuyên ôn trước, nút ôn thành nút chính; vẫn mở cuộn được.
            var pile = Core.reviewBacklog(state, now());
            html += '<div class="card"><h2><span class="zh">卷</span>Cuộn ' + (next.index + 1) + (fromBook ? ' · theo sách' : '') + '</h2>' +
                '<div class="scroll-preview">' + next.chars.map(function (ch) { return '<span>' + esc(ch) + '</span>'; }).join('') + '</div>' +
                '<p class="small muted">Học xong cuộn này, bạn đọc được thêm khoảng <b>' + pct(gain / DECK.total) +
                '</b> chữ Hán trong truyện' + (fromBook ? ', <b>+' + pct(bookGain / book.total) + '</b> chữ trong sách này' : '') + '.' +
                (today ? ' Hôm nay bạn đã học ' + num(today) + ' chữ mới.' : '') + '</p>' +
                (fill > 0 ? '<p class="small muted book-fill">Sách này còn ít chữ chưa học; cuộn này có ' + fill + ' chữ theo bộ chữ.</p>' : '') +
                (pile
                    ? '<div class="hint-line nudge">' + faceHtml('lao-quy') + '<p><b>Lão Quy:</b> Cháu còn <b>' + num(pile) +
                        '</b> chữ đến hạn ôn. Ôn bớt đi rồi hẵng mở cuộn mới, kẻo chữ cũ rơi rụng mất.</p></div>' +
                        '<div class="row"><button class="btn-primary" data-act="review">Ôn ' + Math.min(pile, REVIEW_BATCH) + ' chữ trước</button>' +
                        '<button class="btn" data-act="lesson">Vẫn mở cuộn</button></div>'
                    : '<button class="btn-primary btn-block" data-act="lesson">Mở cuộn</button>') + '</div>';
        }
        html += bookCardHtml();
        var due = Core.dueList(state, now());
        html += '<div class="card"><h2><span class="zh">温</span>Ôn bài</h2>';
        if (due.length) {
            // Câu cá chỉ ôn chữ chưa có câu chọn (Core.fishDueList): nút câu cá chỉ hiện khi còn chữ như vậy.
            var fishable = Core.fishDueList(state, now()).length;
            html += '<p>Có <b>' + due.length + '</b> chữ đến hạn ôn.</p>' +
                '<p class="small muted">Ôn ngay: gõ âm Hán Việt; chữ đã ôn đúng ít nhất một lần thì hỏi thêm nghĩa hoặc điền chữ ' +
                'vào câu, đúng cả hai mới lên bậc. Câu cá chỉ hỏi âm, nên chỉ ôn chữ chưa ôn đúng lần nào' +
                (fishable ? ': ' + fishable + ' trong ' + due.length + ' chữ đến hạn.' : '; lúc này không có chữ đến hạn nào như vậy.') + '</p>' +
                '<div class="row"><button class="btn-primary" data-act="review">Ôn ngay</button>' +
                (fishable ? '<button class="btn" data-act="closePlace" data-id="pond">Ôn bằng câu cá</button>' : '') + '</div>';
        } else if (Core.countLearned(state)) {
            var nd = Core.nextDue(state);
            html += '<p class="muted">Chưa có chữ đến hạn.' + (nd ? ' Lần ôn kế: ' + fmtIn(nd - now()) + '.' : '') + '</p>';
        } else {
            html += '<p class="muted">Học cuộn đầu tiên rồi ôn ở đây hoặc ra Hồ sen câu cá.</p>';
        }
        html += '</div>' + leechCardHtml();
        var learned = Core.countLearned(state);
        var known = Core.countLearned(state, Core.STAGE_KNOWN);
        var cover = Core.coverage(state, DECK);
        var bookCover = state.book ? Core.bookCoverage(state) || 0 : 0;
        html += '<div class="card"><h2><span class="zh">读</span>Đọc được</h2>' +
            '<div class="meter"><i style="width:' + Math.min(100, cover * 100).toFixed(2) + '%"></i></div>' +
            '<p class="small muted">Đã học <b>' + learned + '</b> chữ (đã thuộc ' + known + '). Số chữ này chiếm <b>' + pct(cover) +
            '</b> chữ Hán trong ' + ((RAW.source && RAW.source.corpusFiles) || 80) + ' bộ truyện mẫu.</p>' +
            (state.book
                ? '<div class="meter book-meter"><i style="width:' + Math.min(100, bookCover * 100).toFixed(2) + '%"></i></div>' +
                    '<p class="small muted book-read">Trong sách <b>' + esc(state.book.title) + '</b>, bạn đọc được <b>' + pct(bookCover) +
                    '</b> chữ Hán.</p>'
                : '') + '</div>';
        return html;
    }

    // ---------- học theo sách (Thư trai) ----------
    // Đọc sách của Reader (IndexedDB vietphrase-reader: books + books-content, bỏ EPUB) và truyện crawler có chương đã lưu
    // (vietphrase-crawler: novels + chapter-content). Chỉ đọc, không ghi. Mở DB không truyền số phiên bản (không nâng phiên
    // bản của Reader); DB chưa có thì huỷ lần nâng cấp trong onupgradeneeded để không tạo DB rỗng; có indexedDB.databases()
    // thì kiểm tên trước. Đọc xong đóng ngay, để Reader nâng phiên bản không bị chặn. Chọn một sách: Core.textCounts đếm
    // chữ, Core.setBook đặt state.book; cuộn kế (Core.nextScroll) lấy 5 chữ chưa học gặp nhiều nhất trong sách.

    var READER_DB = 'vietphrase-reader';
    var CRAWLER_DB = 'vietphrase-crawler';

    // DB đã có của trang này, mở để đọc; không có hay lỗi thì null.
    function idbOpenRead(name) {
        return new Promise(function (resolve) {
            var idb = null;
            try { idb = window.indexedDB; } catch (e) { idb = null; }
            if (!idb) {
                resolve(null);
                return;
            }
            var settled = false;
            var finish = function (db) {
                if (settled) {
                    if (db) db.close();
                    return;
                }
                settled = true;
                resolve(db);
            };
            var go = function () {
                var req;
                try { req = idb.open(name); } catch (e) { finish(null); return; }
                req.onupgradeneeded = function (ev) {
                    // DB chưa có: huỷ để không tạo DB rỗng (open báo lỗi AbortError, coi như không có sách).
                    try { ev.target.transaction.abort(); } catch (e) { /* đã huỷ */ }
                };
                req.onsuccess = function () {
                    var db = req.result;
                    db.onversionchange = function () { db.close(); };
                    finish(db);
                };
                req.onerror = function (ev) {
                    if (ev && ev.preventDefault) ev.preventDefault();
                    finish(null);
                };
            };
            if (typeof idb.databases === 'function') {
                idb.databases().then(function (list) {
                    var has = (list || []).some(function (d) { return d && d.name === name; });
                    if (has) go();
                    else finish(null);
                }, go);
            } else {
                go();
            }
        });
    }

    // Một lệnh đọc trên một store (store thiếu hay lỗi thì fallback): make(store) trả IDBRequest.
    function idbRead(db, name, make, fallback) {
        return new Promise(function (resolve) {
            try {
                if (!db.objectStoreNames.contains(name)) {
                    resolve(fallback);
                    return;
                }
                var req = make(db.transaction(name, 'readonly').objectStore(name));
                req.onsuccess = function () { resolve(req.result == null ? fallback : req.result); };
                req.onerror = function (ev) {
                    if (ev && ev.preventDefault) ev.preventDefault();
                    resolve(fallback);
                };
            } catch (e) {
                resolve(fallback);
            }
        });
    }

    function sizeText(bytes) {
        if (!(bytes > 0)) return '';
        if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
        return (bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' MB';
    }

    function byNewest(a, b) {
        return (Number(b.dateAdded) || 0) - (Number(a.dateAdded) || 0);
    }

    // Sách TXT của Reader, mới thêm trước.
    function readerBooks() {
        return idbOpenRead(READER_DB).then(function (db) {
            if (!db) return [];
            return idbRead(db, 'books', function (s) { return s.getAll(); }, []).then(function (rows) {
                db.close();
                return rows.filter(function (b) { return b && b.id != null && b.format !== 'epub'; }).sort(byNewest).map(function (b) {
                    var size = sizeText(b.size);
                    return { src: 'reader', id: String(b.id), key: b.id, title: String(b.title || 'Sách không tên'),
                        note: 'Reader · ' + String(b.format || 'txt').toUpperCase() + (size ? ' · ' + size : '') };
                });
            });
        });
    }

    // Truyện crawler có chương đã lưu, mới thêm trước.
    function crawlerNovels() {
        return idbOpenRead(CRAWLER_DB).then(function (db) {
            if (!db) return [];
            return idbRead(db, 'novels', function (s) { return s.getAll(); }, []).then(function (rows) {
                db.close();
                return rows.filter(function (n) { return n && n.id != null && n.savedCount > 0; }).sort(byNewest).map(function (n) {
                    return { src: 'crawler', id: String(n.id), key: n.id, title: String(n.title || n.zhTitle || 'Truyện không tên'),
                        note: 'Truyện đã lưu · ' + num(n.savedCount) + ' chương' };
                });
            });
        });
    }

    function loadBookSources() {
        return Promise.all([readerBooks(), crawlerNovels()]).then(function (r) {
            bookList = { at: now(), items: r[0].concat(r[1]) };
            return bookList;
        }, function () {
            bookList = { at: now(), items: [] };
            return bookList;
        });
    }

    // Văn bản của một sách trong danh sách: TXT của Reader (books-content; bản ghi Reader v1 còn nội dung trong books),
    // hay các chương crawler đã lưu nối theo thứ tự chương (zhContent). Không đọc được thì ''.
    function bookText(item) {
        if (item.src === 'reader') {
            return idbOpenRead(READER_DB).then(function (db) {
                if (!db) return '';
                return idbRead(db, 'books-content', function (s) { return s.get(item.key); }, null).then(function (rec) {
                    if (rec && typeof rec.content === 'string') {
                        db.close();
                        return rec.content;
                    }
                    return idbRead(db, 'books', function (s) { return s.get(item.key); }, null).then(function (meta) {
                        db.close();
                        return meta && typeof meta.content === 'string' ? meta.content : '';
                    });
                });
            });
        }
        return idbOpenRead(CRAWLER_DB).then(function (db) {
            if (!db) return '';
            // Khoá [novelId, chapterIndex]: [id] đứng trước mọi chương của truyện, [id, []] đứng sau (mảng lớn hơn số).
            var range = window.IDBKeyRange.bound([item.key], [item.key, []]);
            return idbRead(db, 'chapter-content', function (s) { return s.getAll(range); }, []).then(function (rows) {
                db.close();
                return rows.map(function (r) { return r && typeof r.zhContent === 'string' ? r.zhContent : ''; }).join('\n');
            });
        });
    }

    // Chọn một sách (nút Chọn trong danh sách, hay cờ ?book= khi opts.url): đọc lại danh sách nếu cần, đọc nội dung,
    // đếm chữ rồi đặt làm sách học theo. Không thấy sách thì báo; dưới 20 chữ Hán thì Core.setBook từ chối.
    function useBook(src, id, opts) {
        var fromUrl = !!(opts && opts.url);
        var key = src + ':' + id;
        if (bookPick.busy) return;
        bookPick.busy = key;
        renderBookCard();
        var listed = bookList && !fromUrl ? Promise.resolve(bookList) : loadBookSources();
        listed.then(function (res) {
            var item = res.items.filter(function (x) { return x.src === src && x.id === id; })[0];
            if (!item) return { item: null, text: '' };
            return bookText(item).then(function (text) { return { item: item, text: text }; });
        }).then(function (r) {
            bookPick.busy = '';
            if (!r.item) {
                toast('Không thấy sách trong Reader trên máy này.');
                renderBookCard();
                return;
            }
            var c = Core.textCounts(DECK, r.text);
            var set = Core.setBook(state, DECK, { src: r.item.src, id: r.item.id, title: r.item.title, total: c.total, counts: c.counts });
            if (!set) {
                toast('Sách này không có chữ Hán.');
                renderBookCard();
                return;
            }
            bookPick.open = false;
            save();
            sfx('page');
            toast('Học theo sách: ' + r.item.title + '.');
            if (place === 'study') renderPlace();
        }).then(null, function () {
            bookPick.busy = '';
            toast('Không đọc được sách trong Reader trên máy này.');
            renderBookCard();
        });
    }

    // Mở danh sách sách trong thẻ (đọc lại mỗi lần, để thấy sách mới thêm trong Reader).
    function openBookPicker() {
        bookPick.open = true;
        bookPick.loading = true;
        renderBookCard();
        loadBookSources().then(function () {
            bookPick.loading = false;
            renderBookCard();
        });
    }

    // Thẻ "书 Học theo sách", ngay dưới thẻ Cuộn: chưa chọn sách thì có nút "Chọn sách…"; đã chọn thì tên sách, tỉ lệ đọc
    // được (Core.bookCoverage), công tắc "Cuộn kế theo sách", "Đổi sách", "Bỏ sách"; đang chọn thì danh sách sách.
    function bookCardHtml() {
        var b = state.book;
        var html = '<div class="card book-study" id="bookCard"><h2><span class="zh">书</span>Học theo văn bản (.txt)</h2>';
        if (!b) {
            return html + '<p class="small muted">Tải lên tệp văn bản hoặc tiểu thuyết tiếng Trung (.txt): Quy Vân Quán sẽ tự động phân tích tần suất và gợi ý ưu tiên học các từ xuất hiện nhiều nhất trong văn bản đó.</p>' +
                '<div class="row" style="margin-top:10px; gap:8px;"><button class="btn btn-primary" data-act="manageBook">📂 Quản lý & Tải file .txt</button></div></div>';
        }
        var cover = Core.bookCoverage(state) || 0;
        var order = Core.bookOrder(state, DECK);
        var noDeck = !Object.keys(b.counts || {}).length;
        return html + '<p class="book-title"><b>' + esc(b.title) + '</b> <span class="small muted">(Tệp văn bản đang chọn)</span></p>' +
            '<p class="small muted book-cover">Văn bản có <b>' + num(b.total) + '</b> chữ Hán. Bạn đã đọc được <b>' + pct(cover) + '</b> (còn ' + order.length + ' chữ chưa học trong bộ chữ).</p>' +
            (noDeck ? '<p class="small book-nodeck">Không chữ nào của sách này có trong bộ ' + num(DECK.list.length) +
                ' chữ của Quy Vân Quán (sách chữ phồn thể chẳng hạn), nên cuộn kế vẫn theo bộ chữ.</p>' : '') +
            '<div class="meter book-meter"><i style="width:' + Math.min(100, cover * 100).toFixed(2) + '%"></i></div>' +
            '<div class="setting"><span>Ưu tiên cuộn kế tiếp theo văn bản này</span><button class="switch" role="switch" data-act="bookOn" aria-checked="' +
            !!b.on + '" aria-label="Cuộn kế theo văn bản"></button></div>' +
            '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:10px">' +
            '<button class="btn btn-primary" data-act="manageBook">📚 Quản lý thư viện</button>' +
            '<button class="btn" data-act="viewBookWords">📊 Xem bảng từ</button>' +
            '<button class="btn-ghost" data-act="bookClear" style="color:#d32f2f;">🗑️ Gỡ văn bản</button></div></div>';
    }

    // ---------- Custom TXT Books Library & Management ----------
    function getCustomBooks() {
        try {
            var raw = localStorage.getItem('quyvan.customBooks');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCustomBooks(books) {
        try {
            localStorage.setItem('quyvan.customBooks', JSON.stringify(books));
        } catch (e) {}
    }

    function addCustomBook(book) {
        var books = getCustomBooks();
        var idx = -1;
        for (var i = 0; i < books.length; i++) {
            if (books[i].title === book.title) { idx = i; break; }
        }
        if (idx >= 0) books[idx] = book;
        else books.unshift(book);
        saveCustomBooks(books);
    }

    function openBookManagerModal() {
        var b = state.book;
        var customBooks = getCustomBooks();
        var html = '<div class="lesson-top"><b>Quản lý văn bản học (.txt)</b>' +
            '<button class="btn-ghost" data-act="closeSheet" style="margin-left:auto">Đóng</button></div>';

        // 1. Current Active Book Section
        if (b) {
            var cover = Core.bookCoverage(state) || 0;
            var order = Core.bookOrder(state, DECK);
            html += '<div class="card" style="border: 2px solid var(--accent, #b8402c); border-radius: 10px; padding: 14px; margin: 12px 0; background: rgba(184, 64, 44, 0.04);">' +
                '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                '<h3 style="margin:0; font-size:1.15em;">📖 <b>' + esc(b.title) + '</b></h3>' +
                '<span style="background:#2e7d32; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.75em; font-weight:700;">ĐANG HỌC</span>' +
                '</div>' +
                '<p style="margin:8px 0 4px 0;">Tổng số chữ Hán: <b>' + num(b.total) + '</b> · Độ đọc hiểu: <b>' + pct(cover) + '</b></p>' +
                '<div class="meter book-meter"><i style="width:' + Math.min(100, cover * 100).toFixed(2) + '%"></i></div>' +
                '<p class="small muted" style="margin:4px 0 12px 0;">Còn <b>' + order.length + '</b> chữ chưa học trong bài học này.</p>' +
                '<div class="row" style="flex-wrap:wrap; gap:8px;">' +
                '<button class="btn btn-primary" data-act="startNextScroll">🚀 Học ngay 5 chữ tiếp theo</button>' +
                '<button class="btn" data-act="viewBookWords">📊 Xem bảng từ</button>' +
                '<button class="btn-ghost" data-act="bookClear" style="color:#d32f2f; margin-left:auto;">🗑️ Gỡ văn bản này</button>' +
                '</div>' +
                '</div>';
        } else {
            html += '<div class="card" style="margin: 12px 0; padding: 14px; border-radius: 10px; text-align: center;">' +
                '<p class="muted" style="margin-bottom: 6px;"><b>Chưa có văn bản nào được chọn</b></p>' +
                '<p class="small muted">Các bài học đang diễn ra theo thứ tự 1.546 chữ Hán thông dụng chuẩn của Quy Vân Quán.</p>' +
                '</div>';
        }

        // 2. Saved Books Library
        if (customBooks.length > 0) {
            html += '<h3 style="margin-top:16px; margin-bottom:8px;">📚 Thư viện văn bản đã lưu (' + customBooks.length + ')</h3>' +
                '<div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border, #ddd); border-radius: 8px; margin-bottom: 14px;">' +
                customBooks.map(function (bk) {
                    var isCurrent = b && b.title === bk.title;
                    var cover = Core.bookCoverage({ book: bk, items: state.items }) || 0;
                    return '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border, #eee);' + (isCurrent ? ' background:rgba(0,0,0,0.04);' : '') + '">' +
                        '<div style="flex:1; margin-right:10px;">' +
                        '<b>' + esc(bk.title) + '</b> <span class="small muted">(' + num(bk.total) + ' chữ)</span>' +
                        '<div class="small muted">Đã thuộc: <b>' + pct(cover) + '</b></div>' +
                        '</div>' +
                        '<div class="row" style="gap:6px;">' +
                        (isCurrent ? '<span style="color:#2e7d32; font-weight:700; font-size:0.85em; margin-right:6px;">Đang chọn</span>'
                                   : '<button class="btn" style="padding:4px 10px; font-size:0.85em;" data-act="selectSavedBook" data-title="' + esc(bk.title) + '">Chọn học</button>') +
                        '<button class="btn-ghost" style="padding:4px 8px; font-size:0.85em; color:#d32f2f;" data-act="deleteSavedBook" data-title="' + esc(bk.title) + '">Xóa</button>' +
                        '</div>' +
                        '</div>';
                }).join('') +
                '</div>';
        }

        // 3. Upload New File Section
        html += '<div class="card" style="padding: 14px; border-radius: 10px; margin-top: 10px;">' +
            '<h3 style="margin:0 0 6px 0;">➕ Tải lên văn bản mới</h3>' +
            '<p class="small muted" style="margin-bottom:12px;">Hỗ trợ tệp văn bản .txt tiếng Trung (tiểu thuyết, truyện ngắn, tài liệu HSK...). Hệ thống sẽ tự động quét và phân tích tần suất chữ Hán.</p>' +
            '<button class="btn btn-primary" data-act="uploadTxt">📂 Chọn tệp .txt từ máy tính/điện thoại</button>' +
            '</div>' +
            '<div class="row end" style="margin-top:14px;"><button class="btn-ghost" data-act="closeSheet">Đóng</button></div>';

        ui.sheet.innerHTML = html;
        openSheet('tall');
    }

    function openTxtFilePicker() {
        var inp = $('txtFileInput');
        if (!inp) {
            inp = document.createElement('input');
            inp.id = 'txtFileInput';
            inp.type = 'file';
            inp.accept = '.txt,text/plain';
            inp.style.display = 'none';
            document.body.appendChild(inp);
            inp.addEventListener('change', function (ev) {
                var file = ev.target.files && ev.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function (e) {
                    var text = e.target.result;
                    handleUploadedText(file.name, text);
                };
                reader.readAsText(file, 'utf-8');
                inp.value = '';
            });
        }
        inp.click();
    }

    function handleUploadedText(filename, text) {
        var c = Core.textCounts(DECK, text);
        if (!c || c.total < Core.BOOK_MIN) {
            toast('Tệp văn bản cần ít nhất ' + Core.BOOK_MIN + ' chữ Hán để học theo.');
            return;
        }
        var title = filename.replace(/\.[^/.]+$/, '');
        var book = {
            src: 'upload',
            id: 'txt_' + Date.now(),
            title: title,
            total: c.total,
            counts: c.counts,
            on: true
        };
        addCustomBook(book);
        Core.setBook(state, DECK, book);
        saveSoon();
        toast('Đã nạp văn bản: ' + title + ' (' + num(c.total) + ' chữ Hán)');
        openBookManagerModal();
        if (place === 'study') renderBookCard();
    }

    var bookModalTab = 'unlearned';
    var bookModalSearch = '';

    function showBookModal(b) {
        if (!b) b = state.book;
        if (!b || !b.counts) return;
        var cover = Core.bookCoverage(state) || 0;
        
        var allChars = Object.keys(b.counts).filter(function (ch) {
            return DECK.byChar[ch];
        }).sort(function (x, y) {
            return b.counts[y] - b.counts[x] || DECK.byChar[x].idx - DECK.byChar[y].idx;
        });

        var unlearnedChars = allChars.filter(function (ch) { return !state.items[ch]; });
        var learnedChars = allChars.filter(function (ch) { return !!state.items[ch]; });

        var targetChars = allChars;
        if (bookModalTab === 'unlearned') targetChars = unlearnedChars;
        else if (bookModalTab === 'learned') targetChars = learnedChars;

        var q = (bookModalSearch || '').trim().toLowerCase();
        if (q) {
            targetChars = targetChars.filter(function (ch) {
                var e = DECK.byChar[ch];
                return ch.indexOf(q) >= 0 || (e.py && e.py.toLowerCase().indexOf(q) >= 0) || (e.hv && e.hv.toLowerCase().indexOf(q) >= 0) || (e.m && e.m.toLowerCase().indexOf(q) >= 0);
            });
        }

        var rows = targetChars.slice(0, 150).map(function (ch, idx) {
            var e = DECK.byChar[ch];
            var count = b.counts[ch] || 0;
            var isLearned = !!state.items[ch];
            var statusBadge = isLearned 
                ? '<span style="background:#e8f5e9;color:#2e7d32;padding:2px 6px;border-radius:4px;font-size:0.8em;font-weight:600">Đã học</span>'
                : '<span style="background:#fff3e0;color:#e65100;padding:2px 6px;border-radius:4px;font-size:0.8em;font-weight:600">Chưa học</span>';
            return '<tr style="border-bottom:1px solid rgba(0,0,0,0.06)">' +
                '<td style="padding:6px;text-align:center;color:#888;font-size:0.85em">' + (idx + 1) + '</td>' +
                '<td style="font-size:1.35em;font-weight:bold;padding:6px" class="zh">' + esc(ch) + 
                '<button class="chip" data-act="speak" data-text="' + esc(ch) + '" style="padding:1px 6px;font-size:0.7em;margin-left:6px;vertical-align:middle" title="Nghe phát âm">🔈</button></td>' +
                '<td style="color:var(--accent,#b8402c);font-weight:600;padding:6px">' + esc(e.py) + '</td>' +
                '<td style="padding:6px;color:#555">' + esc(e.hv) + '</td>' +
                '<td style="padding:6px">' + esc(e.m) + '</td>' +
                '<td style="text-align:right;padding:6px"><b>' + num(count) + '</b></td>' +
                '<td style="text-align:center;padding:6px">' + statusBadge + '</td>' +
                '</tr>';
        }).join('');

        var modalHtml = '<div class="lesson-top"><b>Bảng từ vựng: ' + esc(b.title) + '</b>' +
            '<button class="btn-ghost" data-act="closeSheet" style="margin-left:auto">Đóng</button></div>' +
            '<div class="card" style="margin:10px 0;padding:12px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
            '<div>Tổng số chữ Hán: <b>' + num(b.total) + '</b> · Độ đọc hiểu: <b>' + pct(cover) + '</b> (còn ' + unlearnedChars.length + ' chữ chưa học)</div>' +
            '<div class="row" style="gap:6px">' +
            '<button class="btn-ghost" data-act="copyBookVocab" style="font-size:0.85em;padding:4px 8px">📋 Sao chép từ</button>' +
            '<button class="btn-ghost" data-act="exportBookVocab" style="font-size:0.85em;padding:4px 8px">💾 Tải file .txt</button>' +
            '</div></div>' +
            '<div class="meter book-meter" style="margin-top:8px"><i style="width:' + Math.min(100, cover * 100).toFixed(2) + '%"></i></div>' +
            '</div>' +

            '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap">' +
            '<div class="tab-group" style="display:flex;gap:4px">' +
            '<button class="chip' + (bookModalTab === 'unlearned' ? ' active' : '') + '" data-act="setBookTab" data-tab="unlearned">Chưa học (' + unlearnedChars.length + ')</button>' +
            '<button class="chip' + (bookModalTab === 'learned' ? ' active' : '') + '" data-act="setBookTab" data-tab="learned">Đã học (' + learnedChars.length + ')</button>' +
            '<button class="chip' + (bookModalTab === 'all' ? ' active' : '') + '" data-act="setBookTab" data-tab="all">Tất cả (' + allChars.length + ')</button>' +
            '</div>' +
            '<input type="text" id="bookSearchInput" placeholder="🔍 Tìm chữ, Pinyin, nghĩa..." value="' + esc(bookModalSearch) + '" style="margin-left:auto;padding:4px 10px;border:1px solid var(--border,#ccc);border-radius:6px;font-size:0.85em;width:180px">' +
            '</div>' +

            '<div style="max-height:360px;overflow-y:auto;border:1px solid var(--border,#ddd);border-radius:8px;padding:2px">' +
            '<table style="width:100%;border-collapse:collapse;font-size:0.92em">' +
            '<thead><tr style="text-align:left;background:rgba(0,0,0,0.03);border-bottom:1px solid var(--border,#ddd)">' +
            '<th style="padding:6px;text-align:center;width:30px">#</th><th style="padding:6px">Chữ</th><th style="padding:6px">Pinyin</th><th style="padding:6px">Hán Việt</th><th style="padding:6px">Nghĩa tiếng Việt</th><th style="text-align:right;padding:6px">Số lần</th><th style="text-align:center;padding:6px">Trạng thái</th></tr></thead>' +
            '<tbody>' + (rows || '<tr><td colspan="7" style="text-align:center;padding:16px" class="small muted">Không tìm thấy từ phù hợp bộ lọc.</td></tr>') + '</tbody></table></div>' +
            (targetChars.length > 150 ? '<p class="small muted" style="margin:4px 0;text-align:center">Hiển thị top 150 / ' + targetChars.length + ' chữ theo tần suất xuất hiện.</p>' : '') +

            '<div class="row" style="margin-top:12px;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
            '<button class="btn-primary" data-act="startNextScroll">🚀 Học ngay 5 chữ tiếp theo</button>' +
            '<button class="btn" data-act="manageBook">📚 Quản lý văn bản</button>' +
            '<button class="btn-ghost" data-act="closeSheet">Đóng</button></div>';

        ui.sheet.innerHTML = modalHtml;
        openSheet('tall');

        var searchInp = $('bookSearchInput');
        if (searchInp) {
            searchInp.addEventListener('input', function (ev) {
                bookModalSearch = ev.target.value;
                showBookModal(b);
                var inp = $('bookSearchInput');
                if (inp) {
                    inp.focus();
                    inp.selectionStart = inp.selectionEnd = inp.value.length;
                }
            });
        }
    }

    function copyBookVocab() {
        var b = state.book;
        if (!b || !b.counts) return;
        var allChars = Object.keys(b.counts).filter(function (ch) {
            return DECK.byChar[ch];
        }).sort(function (x, y) {
            return b.counts[y] - b.counts[x] || DECK.byChar[x].idx - DECK.byChar[y].idx;
        });
        var lines = ['Chữ\tPinyin\tHán-Việt\tNghĩa\tSố lần\tTrạng thái'];
        allChars.forEach(function (ch) {
            var e = DECK.byChar[ch];
            var count = b.counts[ch] || 0;
            var st = state.items[ch] ? 'Đã học' : 'Chưa học';
            lines.push(ch + '\t' + e.py + '\t' + e.hv + '\t' + e.m + '\t' + count + '\t' + st);
        });
        var text = lines.join('\n');
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                toast('Đã sao chép ' + allChars.length + ' từ vào clipboard!');
            });
        } else {
            toast('Đã chọn ' + allChars.length + ' từ.');
        }
    }

    function exportBookVocab() {
        var b = state.book;
        if (!b || !b.counts) return;
        var allChars = Object.keys(b.counts).filter(function (ch) {
            return DECK.byChar[ch];
        }).sort(function (x, y) {
            return b.counts[y] - b.counts[x] || DECK.byChar[x].idx - DECK.byChar[y].idx;
        });
        var lines = ['# Danh sách từ vựng từ văn bản: ' + b.title, '# Tổng chữ: ' + b.total, 'Chữ\tPinyin\tHán-Việt\tNghĩa\tSố lần\tTrạng thái'];
        allChars.forEach(function (ch) {
            var e = DECK.byChar[ch];
            var count = b.counts[ch] || 0;
            var st = state.items[ch] ? 'Đã học' : 'Chưa học';
            lines.push(ch + '\t' + e.py + '\t' + e.hv + '\t' + e.m + '\t' + count + '\t' + st);
        });
        var blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (b.title || 'tu_vung') + '_tu_vung.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast('Đã xuất file từ vựng .txt thành công!');
    }

    // Vẽ lại riêng thẻ Học theo sách (danh sách đọc xong, đang đọc một sách); thẻ Cuộn chỉ đổi khi sách đổi (renderPlace).
    function renderBookCard() {
        var el = $('bookCard');
        if (!el || place !== 'study') return;
        el.outerHTML = bookCardHtml();
    }

    // Cờ URL từ Reader, sau init: ?book=reader:<id> | crawler:<id> mở Thư trai rồi chọn sách đó; ?card=<chữ> mở thẻ chữ đầy
    // đủ của chữ đó (chữ chưa học vẫn xem được). Xong thì gỡ hai cờ khỏi thanh địa chỉ, để tải lại trang không chọn lại sách.
    function applyUrlLinks() {
        if (URL_BOOK) {
            var m = /^(reader|crawler):(.+)$/.exec(URL_BOOK);
            openPlace('study');
            if (m) useBook(m[1], m[2], { url: true });
            else toast('Không thấy sách trong Reader trên máy này.');
        }
        // Reader tính chip trên mọi chữ Hán, nên chữ có thể nằm ngoài bộ chữ (không có thẻ): báo, không im lặng.
        var ch = Array.from(URL_CARD.trim())[0] || '';
        if (ch && DECK.byChar[ch]) openCard([ch], 0, 'Thẻ chữ', null);
        else if (ch) toast('Chữ ' + ch + ' chưa có trong bộ chữ của Quy Vân Quán.');
        if (URL_BOOK || URL_CARD) dropUrlParams(['book', 'card']);
    }

    // Gỡ cờ một lần (?book=, ?card=, ?reset=) khỏi thanh địa chỉ, để tải lại trang hay mở lại dấu trang không làm lại.
    function dropUrlParams(names) {
        try {
            var u = new URL(window.location.href);
            names.forEach(function (n) { u.searchParams.delete(n); });
            window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
        } catch (e) { /* trình duyệt cũ: giữ nguyên địa chỉ */ }
    }

    function leechCardHtml() {
        var leeches = Core.leechList(state, 15);
        if (!leeches.length) return '';
        return '<div class="card"><h2><span class="zh">难</span>Chữ hay nhầm (' + leeches.length + ')</h2>' +
            '<div class="scroll-preview">' + leeches.slice(0, 8).map(function (ch) { return '<span>' + esc(ch) + '</span>'; }).join('') + '</div>' +
            '<p class="small muted">Những chữ bạn từng gõ sai nhiều lần khi ôn hoặc câu cá. Luyện riêng để nhớ chắc hơn.</p>' +
            '<button class="btn" data-act="reviewLeech">Luyện chữ hay nhầm</button></div>';
    }

    function confuseFactHtml(ch) {
        var list = Core.confuseOf(STORY, ch);
        if (!list.length) return '';
        return '<div class="fact"><b>Dễ nhầm:</b> ' + list.map(function (c) { return esc(c.note); }).join(' ') + '</div>';
    }

    // ---------- bài học & ôn bài ----------

    // Một lượt Ôn bài lấy tối đa chừng này chữ đến hạn (chữ đến hạn sớm nhất trước).
    var REVIEW_BATCH = 20;

    // Cuộn kế tiếp: 5 chữ chưa học tiếp theo trong bộ chữ (Core.nextScroll bỏ qua chữ đã học qua truyện).
    function openLesson() {
        var next = Core.nextScroll(state, DECK);
        if (!next) return;
        place = null;
        quiz = { kind: 'lesson', scroll: next.index, chars: next.chars.slice(), card: 0, phase: 'cards' };
        sfx('page');
        openSheet('tall');
        renderLessonCard();
    }

    // Cuộn truyện: chữ mới khách đêm để lại sau cảnh cuối (lõi đã học sẵn). Chỉ đọc qua, không kiểm tra.
    // note: dòng thưởng của cảnh (linh khí, lưu niệm) hiện ở thẻ đầu thay cho toast (toast che chữ lớn).
    function openTaleLesson(tale, chars, note) {
        var g = guestOf(tale.guest);
        place = null;
        quiz = { kind: 'tale', title: 'Cuộn ' + (g ? g.name : tale.name), note: note || '', chars: chars.slice(), card: 0, phase: 'cards' };
        sfx('page');
        openSheet('tall');
        renderLessonCard();
    }

    // Thân thẻ chữ, dùng chung cho thẻ học và thẻ tra (#cardView): chữ lớn, âm, âm khác, pinyin, nghĩa, nút Cách viết.
    // opts.listen: luôn có nút Nghe (thẻ học chỉ có nút Nghe cạnh pinyin, khi bật pinyin). Phần cách viết (chỗ đặt khung
    // vẽ, dòng trạng thái, nút Xem lại và Viết thử) dựng sẵn theo stroke.open; người gọi gọi strokeSync sau khi gắn HTML.
    function glyphCardHtml(ch, opts) {
        var e = DECK.byChar[ch];
        var open = stroke.open;
        return '<div class="glyph-card' + (open ? ' stroke-on' : '') + '" data-ch="' + esc(ch) + '"><div class="big">' + esc(ch) + '</div>' +
            '<div class="stroke-box"></div>' +
            '<div class="py" style="font-size:1.8em;font-weight:700;color:var(--accent,#b8402c);margin:4px 0">' + esc(e.py) + '</div>' +
            '<div class="mean" style="font-size:1.25em;font-weight:600;margin:6px 0">' + esc(e.m) + '</div>' +
        '<div class="row" style="margin:4px 0"><button class="chip" data-act="speak" data-text="' + esc(ch) + '">🔈 Nghe phát âm</button></div>' +
            '<div class="hv small muted">Âm Hán Việt: <b>' + esc(e.hv) + '</b>' + (e.alts.length ? ' (' + esc(e.alts.join(', ')) + ')' : '') + '</div>' +
            '<div class="glyph-tools"><button class="chip" type="button" data-act="strokeToggle" aria-expanded="' + open + '">✍️ Cách viết</button></div>' +
            '<div class="stroke-panel"' + (open ? '' : ' hidden') + '><p class="stroke-status" aria-live="polite"></p>' +
            '<div class="stroke-btns"><button class="chip" type="button" data-act="strokeReplay">Xem lại</button>' +
            '<button class="chip" type="button" data-act="strokeQuiz">Viết thử</button></div>' +
            '<p class="stroke-src">Nét chữ: Make Me a Hanzi</p></div></div>';
    }

    // Gợi âm: chữ hình thanh có phần chỉ âm khớp âm của thẻ (cùng âm tiết hay cùng vần), kèm tối đa bốn chữ khác trong
    // bộ chữ có cùng phần đó. Dữ liệu chỉ ghi chữ khớp, nên dòng này không bao giờ dẫn sai âm.
    function phoneticFactHtml(ch) {
        var x = PHONETIC.byChar[ch];
        var e = DECK.byChar[ch];
        if (!x || !e) return '';
        var how = x.lv === 3
            ? (Core.syllKey(x.r) === Core.syllKey(e.hv) ? 'đọc y như phần này' : 'cùng âm, khác dấu')
            : 'cùng vần';
        var zh = function (c) { return '<span class="zh" lang="zh">' + esc(c) + '</span>'; };
        var fam = (PHONETIC.family[x.p] || []).filter(function (c) { return c !== ch && DECK.byChar[c]; }).slice(0, 4);
        return '<div class="fact phon"><b>Gợi âm:</b> phần ' + zh(x.p) + ' đọc <b>' + esc(x.r) + '</b> → ' + zh(ch) + ' <b>' + esc(e.hv) +
            '</b> (' + how + ').' +
            (fam.length ? ' Cùng phần ' + zh(x.p) + ': ' + fam.map(function (c) { return zh(c) + ' ' + esc(DECK.byChar[c].hv); }).join(', ') + '.' : '') +
            ' <a class="src" href="phonetic-LGPL.txt" target="_blank" rel="noopener">Nguồn: Make Me a Hanzi</a></div>';
    }

    // Các mục dưới chữ: từ Hán Việt đã biết, gợi âm, câu ví dụ, mẹo nhớ, dễ nhầm, tần suất trong truyện.
    function factsHtml(ch) {
        var e = DECK.byChar[ch];
        var per = perThousand(e);
        var facts = '';
        if (e.ex.length) {
            facts += '<div class="fact"><b>Bạn đã biết:</b><div class="bridge">' + bridgeHtml(e) + '</div></div>';
        } else {
            facts += '<div class="fact">Chữ này ít có trong từ Hán Việt quen thuộc. Nhớ theo nghĩa: <b>' + esc(e.m) + '</b>.</div>';
        }
        facts += phoneticFactHtml(ch);
        facts += exampleHtml(ch);
        if (e.note) facts += '<div class="fact"><b>Mẹo nhớ:</b> ' + esc(e.note) + '</div>';
        facts += confuseFactHtml(ch);
        if (per) facts += '<div class="fact">Cứ 1.000 chữ trong truyện thì có khoảng <b>' + per + '</b> chữ ' + esc(ch) + '.</div>';
        return '<div class="facts">' + facts + '</div>';
    }

    function renderLessonCard() {
        var ch = quiz.chars[quiz.card];
        var last = quiz.card === quiz.chars.length - 1;
        var dots = quiz.chars.map(function (c, i) { return '<i class="' + (i <= quiz.card ? 'on' : '') + '"></i>'; }).join('');
        // Cuộn truyện kết thúc bằng "Xong" (chữ đã học qua truyện); cuộn thường sang bài kiểm tra.
        var nextBtn = last && quiz.kind === 'tale'
            ? '<button class="btn-primary" data-act="closeSheet">Xong</button>'
            : '<button class="btn-primary" data-act="lessonNext">' + (last ? 'Làm bài kiểm tra' : 'Tiếp ›') + '</button>';
        var tale = quiz.kind === 'tale';
        ui.sheet.innerHTML =
            '<div class="lesson-top' + (tale ? ' tale' : '') + '"><b>' + esc(quiz.title || 'Cuộn ' + (quiz.scroll + 1)) + '</b>' +
            '<span class="small muted">chữ ' + (quiz.card + 1) + '/' + quiz.chars.length + '</span><span class="lesson-dots">' + dots + '</span>' +
            '<button class="btn-ghost" data-act="closeSheet">Đóng</button></div>' +
            (tale && quiz.note && quiz.card === 0 ? '<p class="small gain">' + esc(quiz.note) + '</p>' : '') +
            glyphCardHtml(ch) + factsHtml(ch) +
            '<div class="sheet-foot"><button class="btn" data-act="lessonPrev"' + (quiz.card ? '' : ' disabled') + '>‹ Trước</button>' +
            nextBtn + '</div>';
        ui.sheet.scrollTop = 0;
        strokeSync(ui.sheet.querySelector('.glyph-card'));
    }

    function startQuiz(kind, chars) {
        if (kind === 'review' || kind === 'leech') {
            place = null;
            quiz = { kind: kind, chars: chars.slice() };
            openSheet('tall');
        }
        quiz.phase = 'quiz';
        // part 'read': gõ âm từng chữ; 'pick': các câu chọn (Ôn bài, luyện chữ hay nhầm), hỏi sau khi xong phần gõ âm
        // để bàn phím điện thoại chỉ đóng một lần. pending: chữ đã gõ đúng âm, chờ câu chọn mới chấm SRS (ch → { mode,
        // exact }); follow: các câu chọn còn chờ; cur: câu chọn đang hiện; tally: số câu đúng ngay lần đầu.
        quiz.part = 'read';
        quiz.queue = shuffle(chars.slice());
        quiz.total = chars.length;
        quiz.cleared = 0;
        quiz.first = {};
        quiz.awaitNext = false;
        quiz.hint = false;
        quiz.pending = {};
        quiz.follow = [];
        quiz.cur = null;
        quiz.picksTotal = 0;
        quiz.picksDone = 0;
        quiz.tally = { read: 0, pick: 0 };
        var title = quiz.kind === 'lesson'
            ? 'Cuộn ' + (quiz.scroll + 1) + ' · Kiểm tra'
            : (quiz.kind === 'leech' ? 'Luyện chữ hay nhầm' : 'Ôn bài');
        ui.sheet.innerHTML =
            '<div class="lesson-top"><b>' + title + '</b>' +
            '<span class="small muted" id="quizCount"></span>' +
            '<button class="btn-ghost" data-act="closeSheet" style="margin-left:auto">Đóng</button></div>' +
            '<div class="quiz-glyph" id="quizGlyph"></div>' +
            '<div class="quiz-sub" id="quizSub">Gõ Pinyin (vd: ren, ren2 hoặc rén)</div>' +
            '<div class="quiz-pick" id="quizPick" hidden></div>' +
            answerFormHtml('quizInput', 'Đọc') +
            '<div class="feedback" id="quizFeedback" aria-live="polite"></div>' +
            '<div class="tool-row"><button class="btn-ghost" type="button" data-act="quizHint" id="quizHintBtn">Gợi ý</button>' +
            '<button class="btn-ghost" type="button" data-act="speakQuiz" id="quizSpeakBtn">🔈 Nghe</button></div>';
        ui.quizInput = $('quizInput');
        bindAnswerForm(ui.quizInput, submitQuiz);
        renderQuizItem();
        focusInput(ui.quizInput);
    }

    function answerFormHtml(id, label) {
        return '<form class="answer" data-form="' + id + '" autocomplete="off" novalidate>' +
            '<input id="' + id + '" type="text" inputmode="text" lang="vi" autocapitalize="off" autocorrect="off" ' +
            'autocomplete="off" spellcheck="false" enterkeyhint="go" placeholder="Gõ Pinyin (vd: ren, ren2, rén)…" aria-label="Pinyin">' +
            '<button class="btn-primary" type="submit">' + esc(label) + '</button></form>';
    }

    // Nút gửi giữ focus ở ô gõ (pointerdown + preventDefault), để bàn phím điện thoại không đóng.
    function bindAnswerForm(input, onSubmit) {
        var form = input.form;
        var btn = form.querySelector('button[type="submit"]');
        btn.addEventListener('pointerdown', function (ev) { ev.preventDefault(); });
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            onSubmit(input.value);
        });
        input.addEventListener('input', function () {
            input.classList.remove('ok', 'bad');
        });
    }

    function focusInput(input) {
        if (!input) return;
        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
        setTimeout(function () {
            if (document.activeElement === input && input.scrollIntoView) input.scrollIntoView({ block: 'nearest' });
        }, 300);
    }

    function renderQuizItem() {
        var ch = quiz.queue[0];
        $('quizGlyph').textContent = ch;
        renderQuizCount();
        $('quizFeedback').className = 'feedback';
        $('quizFeedback').innerHTML = '';
        ui.quizInput.value = '';
        ui.quizInput.classList.remove('ok', 'bad');
        ui.quizInput.form.querySelector('button').textContent = 'Đọc';
        quiz.awaitNext = false;
        quiz.hint = false;
        quiz.busy = false;
    }

    // Phần gõ âm: "đã xong/tổng số chữ"; phần câu chọn: "câu chọn đã đúng/tổng số câu".
    function renderQuizCount() {
        var el = $('quizCount');
        if (el) el.textContent = quiz.part === 'pick' ? 'câu chọn ' + quiz.picksDone + '/' + quiz.picksTotal : quiz.cleared + '/' + quiz.total;
    }

    // noMeaning: chữ còn câu chọn phía sau, nên chưa hiện nghĩa (câu chọn vẫn là một lần nhớ lại).
    function feedbackHtml(entry, res, noMeaning) {
        if (res.ok) {
            var extra = res.exact ? '' : (res.toneOff ? ' (chưa đúng số thanh)' : '');
            return '✓ <span class="zh">' + esc(entry.ch) + '</span> <b class="py" style="color:var(--accent,#b8402c);font-size:1.15em">' + esc(res.matched || entry.py) + '</b>' + '<button class="chip" type="button" data-act="speak" data-text="' + esc(entry.ch) + '" style="margin-left:6px;padding:1px 6px;font-size:0.8em;vertical-align:middle">🔈</button>' +
                esc(extra) + (noMeaning ? '' : ' · <span class="m">' + esc(entry.m) + '</span>');
        }
        var conf = Core.confuseOf(STORY, entry.ch);
        var tip = conf.length ? '<div class="small muted" style="margin-top:4px">' + esc(conf[0].note) + '</div>'
            : (entry.note ? '<div class="small muted" style="margin-top:4px">' + esc(entry.note) + '</div>' : '');
        return '✗ <span class="zh">' + esc(entry.ch) + '</span> Pinyin là <b class="py" style="color:var(--accent,#b8402c);font-size:1.15em">' + esc(entry.py) + '</b>' + '<button class="chip" type="button" data-act="speak" data-text="' + esc(entry.ch) + '" style="margin-left:6px;padding:1px 6px;font-size:0.8em;vertical-align:middle">🔈</button> · ' +
            esc(entry.m) + (res.near ? ' (cần đúng thanh điệu)' : '') + tip;
    }

    function submitQuiz(text) {
        // busy: vừa gõ đúng, chữ đó đã ra khỏi hàng đợi mà chữ kế chưa hiện. Enter lần nữa (phím "Đi" bấm đúp) không
        // được chấm câu trả lời cũ cho chữ kế tiếp.
        if (!quiz || quiz.phase !== 'quiz' || quiz.part !== 'read' || quiz.busy) return;
        var ch = quiz.queue[0];
        if (quiz.awaitNext) {
            quiz.queue.push(quiz.queue.shift());
            renderQuizItem();
            return;
        }
        var e = DECK.byChar[ch];
        var res = Core.checkReading(e, text, { strict: state.settings.strict });
        if (res.empty) return;
        var fb = $('quizFeedback');
        var held = false;
        if ((quiz.kind === 'review' || quiz.kind === 'leech') && !quiz.first[ch]) {
            quiz.first[ch] = true;
            var it = state.items[ch];
            var qMode = quiz.kind === 'leech' && (!it || it.due > now() || it.s >= Core.STAGE_DONE) ? 'practice' : 'due';
            var clean = res.ok && !quiz.hint;
            if (clean) quiz.tally.read++;
            // Gõ đúng ngay lần đầu, không gợi ý: chữ từ bậc RULES.followStage còn một câu chọn, chấm SRS khi trả lời câu đó.
            var fu = clean ? Core.followUp(state, DECK, EXAMPLES, STORY, ch, rng) : null;
            if (fu) {
                held = true;
                quiz.pending[ch] = { mode: qMode, exact: res.exact };
                quiz.follow.push(fu);
            } else {
                Core.answer(state, ch, qMode, { ok: res.ok, exact: res.exact, hint: quiz.hint }, now(), SPEED);
                renderStats(clean);
                saveSoon();
            }
        }
        if (res.ok) {
            speak(e.ch);
            sfx(res.exact ? 'perfect' : 'ok');
            ui.quizInput.classList.add('ok');
            fb.className = 'feedback ok';
            fb.innerHTML = feedbackHtml(e, res, held);
            quiz.queue.shift();
            quiz.cleared++;
            quiz.busy = true;
            renderQuizCount();
            setTimeout(function () {
                if (!quiz || quiz.phase !== 'quiz' || quiz.part !== 'read') return;
                if (quiz.queue.length) renderQuizItem();
                else if (quiz.follow.length) startFollow();
                else finishQuiz();
            }, res.exact ? 650 : 1100);
        } else {
            sfx('bad');
            ui.quizInput.classList.add('bad');
            fb.className = 'feedback bad';
            fb.innerHTML = feedbackHtml(e, res);
            quiz.awaitNext = true;
            ui.quizInput.form.querySelector('button').textContent = 'Tiếp';
        }
    }

    function quizHint() {
        if (!quiz || quiz.phase !== 'quiz' || quiz.part !== 'read' || quiz.awaitNext || quiz.busy) return;
        var e = DECK.byChar[quiz.queue[0]];
        quiz.hint = true;
        var fb = $('quizFeedback');
        fb.className = 'feedback';
        fb.innerHTML = 'Nghĩa: <b>' + esc(e.m) + '</b> · Pinyin bắt đầu bằng: “<b>' + esc((e.py || '').slice(0, 1)) + '…</b>” (Hán Việt: ' + esc(e.hv) + ')';
        focusInput(ui.quizInput);
    }

    // ---------- câu chọn sau phần gõ âm (Ôn bài, luyện chữ hay nhầm) ----------
    // Câu nghĩa: chữ lớn và bốn nghĩa. Câu điền chữ: câu ví dụ có một ô trống, bản dịch (từ dịch chữ đó in đậm), bốn chữ.
    // Lần chọn đầu chấm SRS cho chữ đang chờ (Core.answer, exact theo phần gõ âm, nên linh khí như trước); chọn sai thì
    // bậc tụt như gõ sai và câu đó hỏi lại ở cuối phần câu chọn. Phím 1–4 chọn, Enter sang câu kế sau khi chọn sai.

    // Hết phần gõ âm: ẩn ô gõ (bàn phím điện thoại đóng một lần cho cả phần này), xáo các câu chọn.
    function startFollow() {
        quiz.part = 'pick';
        quiz.follow = shuffle(quiz.follow);
        quiz.picksTotal = quiz.follow.length;
        quiz.picksDone = 0;
        if (document.activeElement === ui.quizInput) ui.quizInput.blur();
        ui.quizInput.form.hidden = true;
        $('quizHintBtn').hidden = true;
        $('quizFeedback').className = 'feedback';
        $('quizFeedback').innerHTML = '';
        nextFollow();
    }

    function nextFollow() {
        quiz.cur = quiz.follow.shift() || null;
        quiz.awaitNext = false;
        if (!quiz.cur) {
            finishQuiz();
            return;
        }
        quiz.cur.picked = '';
        quiz.cur.fb = '';
        renderFollow();
        ui.sheet.scrollTop = 0;
    }

    function followOptHtml(q, c, i) {
        var o = DECK.byChar[c];
        var done = !!q.picked;
        var cls = done ? (c === q.ch ? ' right' : (c === q.picked ? ' wrong' : ' dim')) : '';
        // Sau khi chọn: phương án đúng và phương án đã chọn ghi kèm chữ và âm (câu nghĩa) hay âm (câu điền chữ).
        var who = done && (c === q.ch || c === q.picked)
            ? '<small>' + (q.kind === 'mean' ? '<span class="zh" lang="zh">' + esc(c) + '</span> ' : '') + esc(o.hv) + '</small>' : '';
        var body = q.kind === 'mean'
            ? '<span class="t">' + esc(Core.plainMeaning(o.m)) + who + '</span>'
            : '<span class="g" lang="zh">' + esc(c) + '</span>' + who;
        return '<button class="quiz-opt' + cls + '" data-act="quizPick" data-ch="' + esc(c) + '"' + (done ? ' disabled' : '') + '>' +
            '<span class="k" aria-hidden="true">' + (i + 1) + '</span>' + body + '</button>';
    }

    function renderFollow() {
        var q = quiz.cur;
        var cloze = q.kind === 'cloze';
        var done = !!q.picked;
        var glyph = $('quizGlyph');
        glyph.hidden = cloze;
        glyph.textContent = cloze ? '' : q.ch;
        $('quizSub').textContent = cloze ? 'Chọn chữ còn thiếu trong câu' : 'Chữ này nghĩa là gì?';
        var html = '';
        if (cloze) {
            // Chưa chọn: ô trống; đã chọn: điền chữ đúng, tô nền.
            html += '<div class="quiz-cloze"><div class="zh-line" lang="zh">' +
                renderZh(q.ex.s, done ? { mark: q.ch } : { blank: q.ch }) + '</div>' +
                '<div class="vi-line">' + exampleViHtml(q.ex) + '</div></div>';
        }
        html += '<div class="quiz-opts ' + (cloze ? 'glyphs' : 'mean') + '" role="group" aria-label="' +
            (cloze ? 'Chữ để điền' : 'Nghĩa để chọn') + '">' +
            q.opts.map(function (c, i) { return followOptHtml(q, c, i); }).join('') + '</div>' +
            '<div class="feedback' + (done ? (q.picked === q.ch ? ' ok' : ' bad') : '') + '" id="pickFeedback" aria-live="polite">' +
            (q.fb || '') + '</div>';
        if (done && q.picked !== q.ch) {
            // Chọn sai: câu nghĩa có thêm câu ví dụ của chữ (câu điền chữ đã hiện câu); nút Tiếp, câu này hỏi lại sau.
            if (!cloze) html += exampleHtml(q.ch);
            html += '<div class="sheet-foot"><button class="btn-primary" data-act="quizNext">Tiếp ›</button></div>';
        }
        var pick = $('quizPick');
        pick.innerHTML = html;
        pick.hidden = false;
        // Câu điền chữ: chỉ nghe câu sau khi đã chọn (nghe trước là lộ đáp án).
        $('quizSpeakBtn').hidden = cloze && !done;
        renderQuizCount();
    }

    function pickFollow(choice) {
        var q = quiz && quiz.phase === 'quiz' && quiz.part === 'pick' ? quiz.cur : null;
        if (!q || q.picked || q.opts.indexOf(choice) < 0) return;
        var ok = choice === q.ch;
        var e = DECK.byChar[q.ch];
        q.picked = choice;
        var pend = quiz.pending[q.ch];
        var lk = 0;
        if (pend) {
            delete quiz.pending[q.ch];
            if (ok) quiz.tally.pick++;
            lk = Core.answer(state, q.ch, pend.mode, { ok: ok, exact: pend.exact, hint: false }, now(), SPEED).lk;
            renderStats(lk > 0);
            saveSoon();
        }
        if (ok) {
            quiz.picksDone++;
            sfx(pend && pend.exact ? 'perfect' : 'ok');
            q.fb = '✓ <span class="zh">' + esc(q.ch) + '</span> <span class="hv">' + esc(e.hv) + '</span> · ' + esc(e.m) +
                (lk ? ' · +' + lk + ' 灵' : '');
            renderFollow();
            setTimeout(function () {
                if (quiz && quiz.cur === q) nextFollow();
            }, q.kind === 'cloze' ? 1500 : 900);
            return;
        }
        sfx('bad');
        quiz.awaitNext = true;
        var o = DECK.byChar[choice];
        var conf = Core.confuseOf(STORY, q.ch).filter(function (c) { return c.other === choice; })[0];
        q.fb = '✗ <span class="zh">' + esc(q.ch) + '</span> <span class="hv">' + esc(e.hv) + '</span> nghĩa là ' + esc(e.m) +
            '<div class="small muted" style="margin-top:4px">' + (conf ? esc(conf.note)
                : 'Bạn chọn <span class="zh" lang="zh">' + esc(choice) + '</span> ' + esc(o.hv) + ': ' + esc(o.m) + '.') + '</div>';
        renderFollow();
    }

    // Sau khi chọn sai: hỏi lại câu này ở cuối phần câu chọn (phương án đổi thứ tự), sang câu kế.
    function followNext() {
        if (!quiz || quiz.part !== 'pick' || !quiz.awaitNext || !quiz.cur) return;
        var q = quiz.cur;
        quiz.follow.push({ kind: q.kind, ch: q.ch, opts: shuffle(q.opts.slice()), ex: q.ex });
        nextFollow();
    }

    function speakQuiz() {
        if (!quiz || quiz.phase !== 'quiz') return;
        if (quiz.part === 'pick') {
            var q = quiz.cur;
            if (!q) return;
            if (q.kind !== 'cloze') speak(q.ch);
            else if (q.picked) speak(q.ex.s);
        } else if (quiz.queue && quiz.queue.length && !quiz.busy) {
            // Lúc busy, queue[0] đã là chữ kế tiếp chưa hiện: đọc nó là lộ đáp án.
            speak(quiz.queue[0]);
        }
    }

    // Rời bài ôn khi còn câu chọn chưa trả lời (Đóng, Esc, rời trang): chữ đã gõ đúng âm được chấm theo phần gõ âm, như
    // trước khi có câu chọn.
    function settleQuiz() {
        if (!quiz || !quiz.pending) return;
        var chars = Object.keys(quiz.pending);
        if (!chars.length) return;
        var t = now();
        chars.forEach(function (ch) {
            var p = quiz.pending[ch];
            Core.answer(state, ch, p.mode, { ok: true, exact: p.exact, hint: false }, t, SPEED);
        });
        quiz.pending = {};
        renderStats(true);
        save();
    }

    function finishQuiz() {
        var t = now();
        if (quiz.kind === 'lesson') {
            var before = Core.coverage(state, DECK);
            var bookBefore = state.book ? Core.bookCoverage(state) || 0 : 0;
            var ev = Core.completeScroll(state, DECK, quiz.chars, t, SPEED);
            var after = Core.coverage(state, DECK);
            save();
            askPersist();
            sfx('bell');
            renderStats(true);
            var first = state.scrolls === 1;
            ui.sheet.innerHTML =
                '<div class="glyph-card"><div class="big" style="font-size:64px">' + esc(quiz.chars.join('')) + '</div>' +
                '<div class="hv">Học xong cuộn ' + (quiz.scroll + 1) + '</div>' +
                '<div class="mean">+' + (ev ? ev.lk : 0) + ' 灵 · đọc được ' + pct(before) + ' → <b>' + pct(after) + '</b> chữ trong truyện</div>' +
                (state.book ? '<div class="small book-gain">Sách ' + esc(state.book.title) + ': ' + pct(bookBefore) + ' → <b>' +
                    pct(Core.bookCoverage(state) || 0) + '</b></div>' : '') + '</div>' +
                '<p class="small muted" style="text-align:center;margin:0">Các chữ này sẽ quay lại để ôn sau ' +
                fmtIn(Core.interval(1, SPEED)).replace(' nữa', '') + '. Chúng cũng mắc vào lưỡi câu ở Hồ sen.</p>' +
                '<div class="sheet-foot"><button class="btn" data-act="closePlace" data-id="study">Ở lại Thư trai</button>' +
                (first ? '<button class="btn-primary" data-act="closeHub">Gặp Lão Quy</button>'
                    : '<button class="btn-primary" data-act="closePlace" data-id="pond">Ra Hồ sen câu cá</button>') + '</div>';
        } else {
            sfx('bell');
            var tally = quiz.tally || { read: 0, pick: 0 };
            ui.sheet.innerHTML =
                '<div class="glyph-card"><div class="hv">Ôn xong ' + quiz.total + ' chữ</div>' +
                '<div class="mean">Linh khí hiện có: ' + num(state.lk) + ' 灵</div></div>' +
                '<p class="small muted quiz-tally">Gõ âm đúng ngay ' + tally.read + '/' + quiz.total + ' chữ' +
                (quiz.picksTotal ? ' · câu chọn đúng ngay ' + tally.pick + '/' + quiz.picksTotal : '') + '.</p>' +
                '<div class="sheet-foot"><button class="btn-primary" data-act="closeSheet">Xong</button></div>';
            save();
        }
        quiz.phase = 'done';
        renderMarks();
    }

    // ---------- hồ sen: câu cá ngay trong hồ ----------

    function pondHtml() {
        if (!Core.countLearned(state)) {
            return '<div class="card"><p>Cá ở đây chỉ cắn câu khi bạn đọc được chữ. Học cuộn đầu tiên ở Thư trai đã.</p>' +
                '<button class="btn-primary" data-act="closePlace" data-id="study">Lên Thư trai</button></div>';
        }
        // Chữ đến hạn có câu chọn chờ ở Ôn bài (Thư trai); cá chỉ hỏi chữ đến hạn còn lại (Core.fishDueList).
        var due = Core.fishDueList(state, now()).length;
        var wait = Core.dueList(state, now()).length - due;
        var html = '<div class="card"><h2><span class="zh">钓</span>Câu cá</h2>' +
            '<p class="small muted">Mỗi con cá mang một chữ. Gõ âm Hán Việt của chữ để kéo cá lại gần. ' +
            (due ? 'Có <b>' + due + '</b> chữ đến hạn: cá sẽ hỏi các chữ này trước.'
                : (wait ? 'Cá hỏi chữ bạn đã học để luyện.' : 'Chưa có chữ đến hạn: cá hỏi chữ bạn đã học để luyện.')) +
            '</p>' + (wait ? '<p class="small muted pond-wait"><b>' + wait + '</b> chữ đến hạn khác chờ ở Ôn bài trong Thư trai: ' +
            'các chữ này còn câu hỏi nghĩa hoặc điền chữ, nên câu cá không cho lên bậc.</p>' : '') +
            (Core.hasRepair(state, 'cau') ? '' :
            '<p class="small muted">Cầu gỗ còn gãy, nên chỉ đứng trên bờ câu cá nhỏ và cá vừa. Sửa cầu ở Chính điện để ra chỗ nước sâu.</p>') +
            (wait
                ? '<div class="row"><button class="btn-primary" data-act="cast">Thả câu</button>' +
                    '<button class="btn" data-act="closePlace" data-id="study">Lên Thư trai ôn</button></div>'
                : '<button class="btn-primary btn-block" data-act="cast">Thả câu</button>') + '</div>';
        html += bagHtml();
        return html;
    }

    function bagHtml() {
        var rows = STORY.fish.filter(function (f) { return state.bag[f.id]; }).map(function (f) {
            return '<div class="fish-row">' + fishArtHtml(f.id) + '<span class="zh">' + esc(f.zh) + '</span><span>' + esc(f.hv) + '</span>' +
                '<span class="muted small">' + esc(f.vi) + '</span><span class="n">× ' + state.bag[f.id] + '</span></div>';
        });
        return '<div class="card"><h2><span class="zh">篓</span>Giỏ cá</h2>' +
            (rows.length ? '<div class="fish-list">' + rows.join('') + '</div>' : '<p class="small muted">Giỏ trống.</p>') + '</div>';
    }

    function startFishing() {
        if (!Core.countLearned(state)) return;
        if (!ui.sheet.hidden) closeSheet();
        var fish = Core.rollFish(STORY.fish, state, rng, sceneCtx());
        if (!fish) return;
        var seconds = Core.fishSeconds(fish);
        fishing = {
            phase: 'cast',
            fish: fish,
            need: Core.fishNeed(fish),
            got: 0,
            total: seconds * 1000,
            deadline: now() + seconds * 1000,
            q: null,
            recent: [],
            // Chữ đã hỏi trong lượt, theo thứ tự hỏi: { ch, ok } (ok null: cá sẩy khi chữ đó chưa được đọc).
            asked: [],
            hint: false,
            awaitNext: false
        };
        sfx('splash');
        // Điện thoại: thanh câu ở trên, hồ sen nằm ngay dưới thanh; máy tính: thanh ở đáy, hồ ở trên.
        var phone = window.matchMedia && window.matchMedia('(max-width: 899px)').matches;
        if (world) world.fish.start({ size: fish.size, deep: Core.hasRepair(state, 'cau'), id: fish.id, frac: phone ? 0.47 : 0.32 });
        ui.fishSize.textContent = SIZE_LABEL[fish.size];
        ui.fishMeta.hidden = false;
        ui.fishAsk.hidden = false;
        ui.fishbar.hidden = false;
        ui.fishTools.hidden = false;
        ui.fishResult.hidden = true;
        ui.fishFeedback.hidden = false;
        ui.fishFeedback.className = 'feedback';
        ui.fishFeedback.innerHTML = '';
        ui.qtile.hidden = false;
        renderPips();
        nextFishQuestion();
        renderHint();
        focusInput(ui.fishInput);
        clearInterval(tickTimer);
        tickTimer = setInterval(tickFishing, 200);
        tickFishing();
    }

    function renderPips() {
        var pips = '';
        for (var i = 0; i < fishing.need; i++) pips += i < fishing.got ? '●' : '○';
        ui.pips.textContent = pips;
    }

    function popTile(cls) {
        ui.qtile.classList.remove('pop', 'shake');
        void ui.qtile.offsetWidth;
        ui.qtile.classList.add(cls);
    }

    function nextFishQuestion() {
        var q = Core.pickChar(state, now(), rng, fishing.recent);
        fishing.q = q;
        fishing.hint = false;
        fishing.awaitNext = false;
        fishing.recent.push(q.ch);
        if (fishing.recent.length > Core.RULES.practiceAvoid) fishing.recent.shift();
        ui.qchar.textContent = q.ch;
        ui.qmode.textContent = q.mode === 'due' ? 'Ôn' : 'Luyện';
        ui.askChar.textContent = q.ch;
        ui.askMode.textContent = ui.qmode.textContent;
        popTile('pop');
        fishing.busy = false;
        ui.fishInput.value = '';
        ui.fishInput.classList.remove('ok', 'bad');
        ui.fishSubmit.textContent = 'Đọc';
        if (!ui.fishFeedback.classList.contains('ok')) {
            ui.fishFeedback.className = 'feedback';
            ui.fishFeedback.innerHTML = '';
        }
    }

    function submitFishing(text) {
        // busy: vừa gõ đúng, câu kế chưa hiện (450 ms). Enter lần nữa không được tính thêm một lần trúng.
        if (!fishing || fishing.phase !== 'cast' || fishing.busy) return;
        if (fishing.awaitNext) {
            ui.fishFeedback.className = 'feedback';
            ui.fishFeedback.innerHTML = '';
            nextFishQuestion();
            return;
        }
        var ch = fishing.q.ch;
        var e = DECK.byChar[ch];
        var res = Core.checkReading(e, text, { strict: state.settings.strict });
        if (res.empty) return;
        noteAsked(ch, res.ok);
        var ev = Core.answer(state, ch, fishing.q.mode, { ok: res.ok, exact: res.exact, hint: fishing.hint }, now(), SPEED);
        saveSoon();
        renderStats(ev.lk > 0);
        if (res.ok) {
            fishing.got++;
            sfx('reel');
            sfx(res.exact ? 'perfect' : 'ok');
            ui.fishInput.classList.add('ok');
            ui.fishFeedback.className = 'feedback ok';
            ui.fishFeedback.innerHTML = feedbackHtml(e, res) + (ev.lk ? ' · +' + ev.lk + ' 灵' : '');
            renderPips();
            if (world) {
                world.fish.progress(fishing.got / fishing.need);
                world.fish.splash();
            }
            if (fishing.got >= fishing.need) {
                landFishing();
                return;
            }
            fishing.busy = true;
            setTimeout(function () {
                if (fishing && fishing.phase === 'cast' && !fishing.awaitNext) nextFishQuestion();
            }, 450);
        } else {
            sfx('bad');
            fishing.deadline -= 3000;
            ui.fishInput.classList.add('bad');
            ui.fishFeedback.className = 'feedback bad';
            ui.fishFeedback.innerHTML = feedbackHtml(e, res) + ' · Nhấn Tiếp.';
            ui.fishSubmit.textContent = 'Tiếp';
            fishing.awaitNext = true;
            if (world) world.fish.tug();
            popTile('shake');
        }
    }

    function fishHint() {
        if (!fishing || fishing.phase !== 'cast' || fishing.awaitNext || fishing.busy) return;
        var e = DECK.byChar[fishing.q.ch];
        fishing.hint = true;
        ui.fishFeedback.className = 'feedback';
        ui.fishFeedback.innerHTML = 'Nghĩa: <b>' + esc(e.m) + '</b> · bắt đầu bằng “' + esc(e.hv.slice(0, Math.min(2, e.hv.length))) + '”';
        focusInput(ui.fishInput);
    }

    // Trang vừa hiện lại sau ms bị ẩn: dời hạn của lượt câu và của bước bùa đang chạy.
    function shiftTimers(ms) {
        if (!(ms > 0)) return;
        if (fishing && fishing.phase === 'cast') fishing.deadline += ms;
        var c = dialog && dialog.charm;
        if (c && !c.missed && dialog.read && !dialog.read.done) c.end += ms;
    }

    function tickFishing() {
        if (!fishing || fishing.phase !== 'cast') {
            clearInterval(tickTimer);
            return;
        }
        // Trang ẩn (chuyển tab, tắt màn hình): đồng hồ đứng; lúc hiện lại shiftTimers dời hạn bằng thời gian ẩn.
        if (document.hidden) return;
        var left = fishing.deadline - now();
        ui.timerBar.style.transform = 'scaleX(' + Math.max(0, left / fishing.total).toFixed(3) + ')';
        if (left <= 0) escapeFishing();
    }

    // Ghi một chữ vừa hỏi trong lượt câu. Chữ hỏi lại trong cùng lượt giữ chỗ cũ; một lần đọc sai là sai cả lượt.
    function noteAsked(ch, ok) {
        if (!fishing || !ch) return;
        var a = null;
        for (var i = 0; i < fishing.asked.length; i++) if (fishing.asked[i].ch === ch) a = fishing.asked[i];
        if (!a) {
            fishing.asked.push({ ch: ch, ok: ok });
            return;
        }
        if (ok === false || a.ok === null) a.ok = ok;
    }

    // Các chữ của lượt câu vừa xong, theo thứ tự hỏi. Chạm một ô mở thẻ chữ đầy đủ; Trước/Tiếp đi trong các chữ của lượt
    // (ô cùng lớp .tile với lưới Tàng Kinh Các, nên openCardFromTile và closeCard dùng chung).
    function fishRecapHtml() {
        var asked = (fishing && fishing.asked) || [];
        var tiles = asked.map(function (a) {
            var e = DECK.byChar[a.ch];
            var it = state.items[a.ch];
            if (!e || !it) return '';
            var label = a.ok === true ? 'đọc đúng' : (a.ok === false ? 'đọc sai' : 'chưa kịp đọc');
            return '<button class="tile' + (a.ok === true ? '' : ' miss') + '" data-act="tile" data-ch="' + esc(a.ch) + '" ' +
                'style="--stage-color:' + stageColor(it.s) + '" aria-label="' + esc(a.ch + ' ' + e.hv + ', ' + label) + '">' +
                '<span class="g">' + esc(a.ch) + '</span><span class="r">' + esc(e.hv) + '</span>' +
                '<i class="mk" aria-hidden="true">' + (a.ok === true ? '✓' : '✗') + '</i></button>';
        }).join('');
        if (!tiles) return '';
        return '<div class="fish-recap"><p class="small muted">Chữ trong lượt này, chạm để xem lại thẻ:</p>' +
            '<div class="tiles" data-label="Lượt câu vừa rồi">' + tiles + '</div></div>';
    }

    // Kết quả lượt câu thay chỗ ô gõ; bàn phím đóng lại.
    function showFishResult(html) {
        ui.fishAsk.hidden = true;
        ui.fishMeta.hidden = true;
        ui.fishTools.hidden = true;
        ui.fishFeedback.hidden = true;
        ui.fishResult.innerHTML = html + fishRecapHtml() + '<div class="row end"><button class="btn" data-act="stopFish">Xong</button>' +
            '<button class="btn-primary" data-act="cast">Thả câu tiếp</button></div>';
        ui.fishResult.hidden = false;
        paintArt(ui.fishResult);
        if (document.activeElement === ui.fishInput) ui.fishInput.blur();
    }

    function landFishing() {
        clearInterval(tickTimer);
        var f = fishing.fish;
        var ev = Core.landFish(state, f);
        fishing.phase = 'landed';
        fishing.lk = ev.lk;
        save();
        sfx('catch');
        renderStats(true);
        if (world) world.fish.land();
        ui.qchar.textContent = f.zh;
        ui.qmode.textContent = f.hv;
        popTile('pop');
        var first = state.caught[f.id] === 1;
        showFishResult('<div class="catch">' + fishArtHtml(f.id, 'big') + '<div class="catch-name"><span class="zh">' + esc(f.zh) + '</span>' +
            '<b>' + esc(f.hv) + '</b><span class="muted">' + esc(f.vi) + '</span>' +
            (first ? '<span class="new">Loài mới, đã ghi vào Sổ</span>' : '') + '</div><span class="lk">+' + ev.lk + ' 灵</span></div>');
        renderMarks();
    }

    function escapeFishing() {
        clearInterval(tickTimer);
        fishing.phase = 'escaped';
        sfx('splash');
        if (world) world.fish.escape();
        ui.qtile.hidden = true;
        save();
        // Chữ đang hiện lúc cá sẩy cũng vào danh sách: người chơi chưa kịp đọc, nên đáng xem lại.
        if (fishing.q && !fishing.awaitNext) noteAsked(fishing.q.ch, null);
        showFishResult('<p style="margin:0">Cá sẩy mất rồi… Lần sau gõ nhanh hơn chút.</p>');
    }

    function endFishing() {
        clearInterval(tickTimer);
        fishing = null;
        if (world) world.fish.stop();
        ui.fishbar.hidden = true;
        // Gỡ ô chữ của lượt cũ: thanh câu chỉ ẩn, không xoá, nên .tile cũ còn nằm trong trang.
        ui.fishResult.innerHTML = '';
        ui.qtile.hidden = true;
        if (document.activeElement === ui.fishInput) ui.fishInput.blur();
        syncWorld();
    }

    // ---------- quán trà & hội thoại ----------

    function teaHtml() {
        if (!Core.hasRepair(state, 'san')) {
            return '<div class="card"><p>Quán còn đóng cửa, bàn ghế đổ ngổn ngang. Quét sân và treo biển ở Chính điện trước đã.</p>' +
                '<button class="btn" data-act="closePlace" data-id="hall">Lên Chính điện</button></div>';
        }
        var scene = teaScene();
        var html = '';
        if (scene) {
            var g = guestOf(scene.guest);
            html += '<div class="card"><div class="guest-card">' + faceHtml(scene.guest) +
                '<div><div class="name">' + esc(g.name) + '<span class="zh">' + esc(g.zh) + '</span></div>' +
                '<div class="small muted">' + esc(g.title) + ' · đang chờ</div></div></div>' +
                '<div class="row end" style="margin-top:10px"><button class="btn-primary" data-act="scene" data-where="tea">' +
                (state.progress[scene.id] !== undefined ? 'Tiếp tục' : 'Tiếp khách') + '</button></div></div>';
        }
        var orders = openOrders();
        if (orders.length) {
            html += '<div class="card"><h2><span class="zh">单</span>Khách chờ món</h2>' + orders.map(function (o) {
                var dish = Core.dishById(STORY, o.dish);
                return '<div class="order-row">' + faceHtml(o.guest) + '<div class="grow"><b>' + esc(guestOf(o.guest).name) + '</b>' +
                    '<div class="small muted">gọi ' + esc(dish.vi) + '</div></div></div>';
            }).join('') + '<div class="row end" style="margin-top:8px"><button class="btn-primary" data-act="closePlace" data-id="kitchen">Vào bếp</button></div></div>';
        }
        if (!scene && !orders.length) {
            html += '<div class="card"><p class="muted">Chưa có khách. Học thêm chữ, câu cá và sửa quán: khách sẽ tìm tới.</p></div>';
        }
        html += residentsHtml();
        return html;
    }

    function openScene(scene) {
        place = null;
        dialog = {
            scene: scene, step: Core.sceneStepIndex(state, scene), vi: true, ruby: true, tried: {}, reply: null, right: false,
            read: null, reveal: null, charm: null
        };
        openSheet('dlg');
        renderDialog();
    }

    function stepOf() {
        return dialog.scene.steps[dialog.step];
    }

    function renderDialog() {
        var scene = dialog.scene;
        var step = stepOf();
        var speakerId = step.say && step.say !== 'note' ? step.say : scene.guest;
        var speaker = guestOf(speakerId);
        var closeBtn = '<button class="btn-ghost close" data-act="closeSheet">Để sau</button>';
        // Thư và trang sách (cảnh manual) ghi nơi đọc như cảnh khách đêm; trang sách ghi thêm số trang.
        var where = scene.where === 'tea' ? 'Quán trà'
            : (scene.tale || scene.manual ? placeName(scene.where) + (scene.book && scene.page ? ' · Trang ' + scene.page : '') : 'Quy Vân Quán');
        // Bước reveal có chân dung lớn bên dưới: đầu khung chỉ ghi tên, không lặp chân dung nhỏ. Tờ thư có chân dung người
        // gửi trong thư, bước mua giấy mực không có người nói: đầu khung chỉ ghi nơi như lời dẫn.
        var head = step.say === 'note' || step.letter || step.pay
            ? '<div class="sheet-head"><div class="who muted">' + esc(where) + '</div>' + closeBtn + '</div>'
            : '<div class="sheet-head">' + (step.reveal ? '' : faceHtml(speakerId, '', guestForm(speakerId))) +
              '<div class="who">' + esc(speaker.name) + '<span class="zh">' + esc(speaker.zh) + '</span><small>' + esc(speaker.title) + '</small></div>' +
              closeBtn + '</div>';
        var rubyOpt = dialog.ruby ? { ruby: 'always' } : null;
        var tools = '<div class="dlg-tools">' +
            '<button class="chip" data-act="dlgRuby" aria-pressed="' + dialog.ruby + '">Pinyin</button>' +
            '<button class="chip" data-act="dlgVi" aria-pressed="' + dialog.vi + '">Dịch</button>' +
            '<button class="chip" data-act="dlgSpeak">' + (step.song ? '♪ Nghe hát' : '🔈 Nghe') + '</button></div>';
        var body = '';
        var foot = '';
        if (step.say === 'note' && step.yi) {
            body = yiHtml(step);
            foot = '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button>';
            tools = '<div class="dlg-tools"><button class="chip" data-act="dlgSpeak">🔈 Nghe</button></div>';
        } else if (step.say === 'note') {
            body = '<p class="note-line">' + esc(step.vi) + '</p>';
            foot = '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button>';
            tools = '';
        } else if (step.say) {
            body = '<div class="zh-line' + (step.song ? ' song' : '') + '">' + renderZh(step.zh, rubyOpt) + '</div>' +
                (dialog.vi ? '<div class="vi-line">' + esc(step.vi) + '</div>' : '');
            foot = '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button>';
        } else if (step.read) {
            if (!dialog.read) dialog.read = newRead(step);
            body = readHtml(step);
            tools = '';
        } else if (step.charm) {
            if (!dialog.read) startCharm(step);
            body = charmHtml(step);
            tools = '';
        } else if (step.reveal) {
            if (!dialog.reveal) dialog.reveal = { tried: {}, miss: 0, last: '', nudge: false, found: guestForm(scene.guest) === 'true' };
            body = revealHtml(step);
            if (dialog.reveal.found) foot = '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button>';
            tools = '';
        } else if (step.choose) {
            body = '<p class="small muted" style="margin:0">Bạn trả lời:</p><div class="choices">' + step.choose.map(function (c, i) {
                var tried = dialog.tried[i];
                return '<button class="choice' + (dialog.right === i ? ' right' : '') + '" data-act="choose" data-i="' + i + '"' +
                    (tried || dialog.right !== false ? ' disabled' : '') + '><div class="zh-line sm">' + renderZh(c.zh, rubyOpt) + '</div>' +
                    (dialog.vi ? '<div class="vi-line">' + esc(c.vi) + '</div>' : '') + '</button>';
            }).join('') + '</div>';
            if (dialog.reply) {
                body += '<div class="reply"><div class="zh-line sm">' + renderZh(dialog.reply.zh, rubyOpt) + '</div>' +
                    (dialog.vi ? '<div class="vi-line">' + esc(dialog.reply.vi) + '</div>' : '') + '</div>';
            }
            if (dialog.right !== false) foot = '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button>';
        } else if (step.serve) {
            body = serveHtml(step, rubyOpt);
        } else if (step.spot) {
            if (!dialog.spot) dialog.spot = { line: step.spot.line, at: step.spot.at, right: step.spot.right, tried: {}, found: false };
            // Dòng dịch của bước này ghi câu đúng ("Nhãn đúng là 红茶…"): chỉ hiện sau khi người chơi tìm ra chữ bị tráo.
            body = '<p class="small muted" style="margin:0">' + esc(step.ask || 'Chạm vào chữ bị tráo.') + '</p>' + spotHtml(dialog.spot) +
                (dialog.vi && step.vi && dialog.spot.found ? '<div class="vi-line">' + esc(step.vi) + '</div>' : '');
            if (dialog.spot.found) foot = '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button>';
            tools = '';
        } else if (step.cook) {
            var cookDish = Core.dishById(STORY, step.cook);
            if (!dialog.cook) dialog.cook = newCook(step.cook, dialog.scene.id, { src: 'scene', guest: dialog.scene.guest });
            if (!Core.canCook(state, cookDish) && dialog.cook.phase !== 'done') {
                body = '<p style="margin:0">Món ' + esc(cookDish.vi) + ' cần cá. Giỏ cá đang trống.</p>' +
                    '<div class="sheet-foot"><button class="btn" data-act="closeSheet">Để sau</button>' +
                    '<button class="btn-primary" data-act="closePlace" data-id="pond">Ra Hồ sen</button></div>';
            } else {
                body = '<p class="small muted" style="margin:0">' + esc(step.ask || 'Nấu món khách gọi.') + '</p>' + cookHtml(dialog.cook);
            }
            tools = '';
        } else if (step.letter) {
            // Tờ thư: chip Âm Hán Việt, Dịch, Nghe (đọc cả thư) như lời thoại.
            body = letterHtml(step, rubyOpt);
            foot = '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button>';
        } else if (step.pay) {
            var lack = state.lk < step.pay.cost;
            body = payHtml(step, lack);
            foot = (lack ? '<button class="btn" data-act="closeSheet">Để sau</button>' : '') +
                '<button class="btn-primary" data-act="pay"' + (lack ? ' disabled' : '') + '>Trả ' + num(step.pay.cost) + ' 灵</button>';
            tools = '';
        }
        // Bước nấu, bước đọc và bước bùa có ô gõ: dùng khung cao (neo trên ở điện thoại) để bàn phím không che ô gõ.
        var wantTall = !!(step.cook || step.read || step.charm);
        if (wantTall !== ui.sheet.classList.contains('tall')) openSheet(wantTall ? 'tall' : 'dlg');
        ui.sheet.innerHTML = head + body + tools + (foot ? '<div class="sheet-foot">' + foot + '</div>' : '');
        paintArt(ui.sheet);
        if (step.reveal) placeRevealZones();
        bindCookForm();
        bindReadForm();
    }

    // Dòng 异史氏曰 (Dị Sử Thị viết) cuối truyện: lời bình kiểu Liêu Trai, luôn có âm Hán Việt và lời dịch.
    // Lời này là phỏng tác, không trích nguyên văn Bồ Tùng Linh, nên nhãn ghi rõ để người học không nhầm.
    function yiHtml(step) {
        return '<div class="yi-card"><div class="yi-title"><span class="seal" lang="zh">异史氏曰</span>' +
            '<small>Dị Sử Thị viết (phỏng tác)</small></div>' +
            '<div class="zh-line">' + renderZh(step.zh, { ruby: 'always' }) + '</div>' +
            (step.vi ? '<div class="vi-line">' + esc(step.vi) + '</div>' : '') + '</div>';
    }

    // ---------- thư: tờ thư (letter), mua giấy mực (pay) ----------

    // Tờ thư: góc 信, chân dung và tên người gửi; mỗi dòng có âm theo cài đặt (chip Âm Hán Việt hiện hết) và dòng dịch.
    function letterHtml(step, rubyOpt) {
        var lt = step.letter;
        var g = guestOf(lt.from);
        return (step.ask ? '<p class="small muted" style="margin:0">' + esc(step.ask) + '</p>' : '') +
            '<div class="letter-sheet"><span class="letter-seal" lang="zh" aria-hidden="true">信</span>' +
            '<div class="letter-from">' + faceHtml(lt.from) + '<div><b>' + esc(g ? g.name : lt.from) + '</b>' +
            (g && g.zh ? '<span class="zh" lang="zh">' + esc(g.zh) + '</span>' : '') + '</div></div>' +
            (lt.lines || []).map(function (ln) {
                return '<div class="letter-line"><div class="zh-line sm" lang="zh">' + renderZh(ln.zh, rubyOpt) + '</div>' +
                    (dialog.vi && ln.vi ? '<div class="vi-line">' + esc(ln.vi) + '</div>' : '') + '</div>';
            }).join('') + '</div>';
    }

    // Bước mua giấy mực: dòng pay.vi, giá và số linh khí đang có; thiếu thì ghi rõ còn thiếu (nút Trả bị khoá).
    function payHtml(step, lack) {
        var cost = step.pay.cost;
        return (step.ask ? '<p class="small muted" style="margin:0">' + esc(step.ask) + '</p>' : '') +
            '<div class="pay-card"><p class="pay-vi">' + esc(step.pay.vi) + '</p>' +
            '<p class="pay-cost"><span class="zh" lang="zh">灵</span> ' + num(cost) + '</p>' +
            (lack ? '<p class="small pay-lack">Cần ' + num(cost) + ' 灵, bạn có ' + num(state.lk) + '.</p>'
                : '<p class="small muted">Bạn đang có ' + num(state.lk) + ' 灵.</p>') + '</div>';
    }

    // Trả linh khí rồi sang bước kế. Ghi bước kế ngay (save, không chờ): đóng rồi mở lại thư không phải trả lần hai.
    function payStep() {
        var step = dialog ? stepOf() : null;
        if (!step || !step.pay) return;
        if (!Core.spendLk(state, step.pay.cost)) {
            sfx('bad');
            renderDialog();
            return;
        }
        sfx('bell');
        renderStats(true);
        Core.setSceneStep(state, dialog.scene, dialog.step + 1);
        save();
        dlgNext();
    }

    // ---------- bước đọc (read): đọc từng chữ của một câu ----------
    // Chữ đang hỏi được tô; chữ đã đọc đúng hiện âm phía trên. Gõ một âm mỗi lần, hoặc nhiều âm cách nhau
    // bằng dấu cách cho các chữ kế tiếp. Ô gõ dựng một lần, cập nhật tại chỗ (giữ bàn phím trên iOS).

    function newRead(step) {
        var parts = Core.parseZh(step.read.line);
        var items = [];
        var at = {};
        parts.forEach(function (p, i) {
            if (!p.cjk) return;
            var e = DECK.byChar[p.ch];
            if (!e && !p.hv) return;
            // "字{âm}" chọn âm riêng ở chỗ này: chỉ âm đó được tính.
            var entry = p.hv ? { ch: p.ch, hv: p.hv, py: e ? e.py : '', alts: [], m: e ? e.m : '' } : e;
            at[i] = items.length;
            items.push({ ch: p.ch, entry: entry });
        });
        return { parts: parts, items: items, at: at, pos: 0, hint: false, tries: 0, first: {}, msg: null, done: !items.length, shown: true };
    }

    function readLineHtml(rd) {
        return rd.parts.map(function (p, i) {
            if (!p.cjk) return '<span class="rd-p">' + esc(p.ch) + '</span>';
            var k = rd.at[i];
            if (k === undefined) return '<span class="rd" lang="zh">' + esc(p.ch) + '</span>';
            var rubyText = (rd.items[k].entry.py || rd.items[k].entry.hv || '');
            if (rd.done || k < rd.pos) {
                return '<span class="rd rd-done" lang="zh"><ruby>' + esc(p.ch) + '<rt>' + esc(rubyText) + '</rt></ruby></span>';
            }
            // Hiện sẵn Pinyin trên mọi chữ để người học theo dõi và học phát âm
            var ch = (rd.shown !== false) ? '<ruby>' + esc(p.ch) + '<rt>' + esc(rubyText) + '</rt></ruby>' : esc(p.ch);
            return '<span class="rd' + (k === rd.pos ? ' rd-cur' : '') + '" lang="zh">' + ch + '</span>';
        }).join('');
    }

    function readHtml(step) {
        var rd = dialog.read;
        var curIt = rd && !rd.done && rd.items[rd.pos];
        var hintBar = curIt ? '<div class="read-cur-hint" style="margin:8px 0;padding:6px 12px;background:rgba(217,119,6,0.12);border-radius:6px;font-size:0.95em;text-align:center;">' +
            'Chữ đang đọc: <b class="zh" style="font-size:1.25em;color:var(--color-primary,#b45309)">' + esc(curIt.ch) + '</b>' +
            (curIt.entry.py ? ' · Pinyin: <b style="color:var(--color-accent,#16a34a)">' + esc(curIt.entry.py) + '</b>' : '') +
            (curIt.entry.hv ? ' (' + esc(curIt.entry.hv) + ')' : '') +
            (curIt.entry.m ? ' — <i>' + esc(curIt.entry.m) + '</i>' : '') +
            '</div>' : '';
        return '<p class="small muted" style="margin:0">' + esc(step.ask || 'Đọc từng chữ của câu (nhập Pinyin hoặc âm đọc).') + '</p>' +
            '<div class="read-line" id="readLine">' + readLineHtml(rd) + '</div>' +
            hintBar +
            (step.read.vi ? '<div class="vi-line read-vi" id="readVi"' + (dialog.vi || rd.done ? '' : ' hidden') + '>' + esc(step.read.vi) + '</div>' : '') +
            '<div id="readAsk"' + (rd.done ? ' hidden' : '') + '>' + answerFormHtml('readInput', 'Đọc') + '</div>' +
            '<div class="feedback' + (rd.msg && rd.msg.kind ? ' ' + rd.msg.kind : '') + '" id="readFeedback" aria-live="polite">' +
            (rd.msg ? rd.msg.html : '') + '</div>' +
            '<div class="tool-row" id="readTools"' + (rd.done ? ' hidden' : '') + '>' +
            '<button class="btn-ghost" type="button" data-act="readHint">Gợi ý</button>' +
            '<button class="btn-ghost" type="button" data-act="readSkip">Bỏ qua / Điền xong</button>' +
            '<button class="btn-ghost" type="button" data-act="dlgSpeak">🔈 Nghe</button></div>' +
            '<div class="sheet-foot" id="readFoot"' + (rd.done ? '' : ' hidden') + '>' +
            '<button class="btn-primary" data-act="dlgNext">Tiếp ›</button></div>';
    }

    function bindReadForm() {
        var input = $('readInput');
        if (!input) return;
        bindAnswerForm(input, submitRead);
        if (dialog && dialog.read && !dialog.read.done) focusInput(input);
    }

    function showEl(id, on) {
        var el = $(id);
        if (el) el.hidden = !on;
    }

    function updateRead() {
        var rd = dialog && dialog.read;
        if (!rd) return;
        var line = $('readLine');
        if (line) line.innerHTML = readLineHtml(rd);
        var fb = $('readFeedback');
        if (fb) {
            fb.className = 'feedback' + (rd.msg && rd.msg.kind ? ' ' + rd.msg.kind : '');
            fb.innerHTML = rd.msg ? rd.msg.html : '';
        }
        if (rd.done) {
            var input = $('readInput');
            if (input && document.activeElement === input) input.blur();
            showEl('readAsk', false);
            showEl('readTools', false);
            showEl('readVi', true);
            showEl('readFoot', true);
        }
    }

    // Lần trả lời đầu tiên của mỗi chữ được ghi: chữ đã học vào SRS kiểu luyện tập, không cộng linh khí
    // (linh khí của truyện đến từ then.lk của cảnh); chữ chưa học chỉ vào thống kê.
    function readGrade(rd, it, res) {
        // Bước bùa hiện sẵn âm: gõ theo âm có sẵn không phải là nhớ chữ, nên không ghi SRS hay thống kê.
        if (rd.first[rd.pos] || rd.shown) return;
        rd.first[rd.pos] = true;
        if (Core.stageOf(state, it.ch) >= 1) {
            Core.answer(state, it.ch, 'practice', { ok: res.ok, exact: res.exact, hint: rd.hint, noLk: true }, now(), SPEED);
        } else {
            state.stats.answers++;
            if (res.ok) {
                state.stats.correct++;
                if (res.exact) state.stats.exact++;
            }
        }
        saveSoon();
    }

    function readHintHtml(it) {
        var py = it.entry.py ? 'Pinyin: <b>' + esc(it.entry.py) + '</b> · ' : '';
        var hv = it.entry.hv ? 'Hán-Việt: <span class="hv">' + esc(it.entry.hv) + '</span>' : '';
        var m = it.entry.m ? ' · nghĩa: ' + esc(it.entry.m) : '';
        return py + hv + m;
    }

    function readSkip() {
        var rd = dialog && dialog.read;
        if (!rd || rd.done) return;
        rd.pos = rd.items.length;
        rd.done = true;
        rd.msg = { kind: 'ok', html: '✓ Đã hoàn thành câu.' };
        updateRead();
        var st = stepOf();
        var line = (st && st.read && st.read.line) || '';
        if (line) speak(Core.plainZh(line));
    }

    function submitRead(text) {
        var rd = dialog && dialog.read;
        if (!rd || rd.done) return;
        var sylls = String(text || '').trim().split(/\s+/).filter(Boolean);
        var strict = !!state.settings.strict;
        var last = null;
        for (var k = 0; k < sylls.length && !rd.done; k++) {
            var it = rd.items[rd.pos];
            var res = Core.checkReading(it.entry, sylls[k], { strict: strict });
            if (res.empty) continue;
            readGrade(rd, it, res);
            last = { it: it, res: res, typed: sylls[k] };
            if (!res.ok) break;
            rd.pos++;
            rd.hint = false;
            rd.tries = 0;
            if (rd.pos >= rd.items.length) rd.done = true;
        }
        if (!last) return;
        var input = $('readInput');
        if (last.res.ok) {
            sfx(last.res.exact ? 'perfect' : 'ok');
            input.value = '';
            input.classList.remove('bad');
            input.classList.add('ok');
            var charm = dialog.charm;
            if (rd.done && charm) {
                clearInterval(charm.timer);
                rd.msg = { kind: 'ok', html: '✓ ' + esc(charm.step.hit.vi) };
            } else {
                rd.msg = { kind: 'ok', html: feedbackHtml(last.it.entry, last.res) + (rd.done ? ' · Đọc xong cả câu.' : '') };
            }
        } else {
            sfx('bad');
            rd.tries++;
            input.classList.remove('ok');
            input.classList.add('bad');
            // Sai hai lần một chữ: hiện luôn âm (tính là có gợi ý).
            if (rd.tries >= 2) rd.hint = true;
            rd.msg = {
                kind: 'bad',
                html: '✗ <span class="zh">' + esc(last.it.ch) + '</span> không đọc là “' + esc(last.typed) + '”' +
                    (last.res.near ? ' (cần đúng dấu)' : '') + '. ' +
                    (rd.tries >= 2 ? readHintHtml(last.it) + '. Gõ lại nhé.' : 'Gõ lại, hoặc bấm Gợi ý.')
            };
            try { input.select(); } catch (e) { /* trình duyệt cũ */ }
        }
        updateRead();
    }

    function readHint() {
        var rd = dialog && dialog.read;
        if (!rd || rd.done) return;
        rd.hint = true;
        rd.msg = { kind: '', html: readHintHtml(rd.items[rd.pos]) };
        updateRead();
        focusInput($('readInput'));
    }

    // ---------- bước bùa (charm): gõ âm từng chữ của dòng bùa trước khi hết giờ ----------
    // Dùng lại bước đọc (dialog.read: ô gõ, chấm âm, gợi ý), âm hiện sẵn trên chữ, thêm đồng hồ. Gõ xong kịp giờ
    // thì hiện hit.vi; hết giờ thì bước xong với miss.vi. Cả hai nhánh đi tiếp. Đồng hồ tự dừng khi hội thoại
    // đóng hay sang bước khác (dialog.charm không còn là nó); mở lại cảnh thì tính giờ lại từ đầu.

    function startCharm(step) {
        var rd = newRead({ read: step.charm });
        rd.shown = true;
        dialog.read = rd;
        var total = step.charm.seconds * 1000;
        var c = { step: step, total: total, end: now() + total, missed: false, timer: 0 };
        dialog.charm = c;
        c.timer = setInterval(function () { charmTick(c); }, 200);
    }

    function charmLeft(c) {
        return Math.max(0, c.end - now());
    }

    function charmTick(c) {
        var rd = dialog && dialog.charm === c ? dialog.read : null;
        if (!rd || rd.done) {
            clearInterval(c.timer);
            return;
        }
        if (document.hidden) return;
        var left = charmLeft(c);
        var bar = $('charmBar');
        if (bar) bar.style.width = (left / c.total * 100).toFixed(1) + '%';
        if (left > 0) return;
        clearInterval(c.timer);
        c.missed = true;
        rd.done = true;
        rd.msg = { kind: 'bad', html: esc(c.step.miss.vi) };
        var timer = $('charmTimer');
        if (timer) timer.classList.add('missed');
        sfx('bad');
        updateRead();
    }

    function charmHtml(step) {
        var c = dialog.charm;
        var left = dialog.read.done ? 0 : charmLeft(c);
        return '<div class="charm-timer' + (c.missed ? ' missed' : '') + '" id="charmTimer" role="timer" aria-label="Thời gian viết bùa">' +
            '<span id="charmBar" style="width:' + (left / c.total * 100).toFixed(1) + '%"></span></div>' +
            readHtml({ read: step.charm, ask: step.ask });
    }

    // ---------- bước nhận ra hình thật (reveal) ----------
    // Chân dung hình người phóng lớn; ba vùng chạm trong suốt (World.REVEAL_ZONES, khung 40×40), một vùng
    // là chi tiết lệch (step.reveal.tell). Chạm trúng: khách hiện hình thật, sprite trên đảo đổi theo.

    function framePct(v) {
        return (v / REVEAL_FRAME * 100).toFixed(3) + '%';
    }

    function revealHtml(step) {
        var rv = dialog.reveal;
        var guest = dialog.scene.guest;
        var zones = (World.REVEAL_ZONES && World.REVEAL_ZONES[guest]) || [];
        var html = '<p class="small muted" style="margin:0">' + esc(step.ask || 'Chạm vào chỗ lạ trên người khách.') + '</p>' +
            '<div class="reveal' + (rv.found ? ' found' : '') + (rv.nudge ? ' nudge' : '') + '"' + (rv.found ? '' : ' data-act="revealMiss"') + '>' +
            faceHtml(guest, 'reveal-face', rv.found ? 'true' : 'human');
        if (!rv.found) {
            html += '<div class="reveal-zones" id="revealZones">' + zones.map(function (z, i) {
                var tried = !!rv.tried[z.id];
                return '<button type="button" class="reveal-zone' + (tried ? ' miss' : '') + (rv.last === z.id ? ' shake' : '') + '"' +
                    ' data-act="reveal" data-zone="' + esc(z.id) + '" aria-label="Chỗ ' + (i + 1) + '"' + (tried ? ' disabled' : '') +
                    ' style="left:' + framePct(z.x) + ';top:' + framePct(z.y) + ';width:' + framePct(z.w) + ';height:' + framePct(z.h) + '"></button>';
            }).join('') + '</div>';
        }
        html += '</div>';
        if (rv.found) html += '<p class="note-line reveal-note">' + esc(step.reveal.note) + '</p>';
        else if (rv.miss >= 2) html += '<p class="small reveal-hint">Gợi ý: ' + esc(step.reveal.note) + '</p>';
        else if (rv.miss) html += '<p class="small muted" style="margin:0">Chỗ đó không lạ. Nhìn kỹ lại.</p>';
        else if (rv.nudge) html += '<p class="small muted" style="margin:0">Chạm thẳng vào chỗ lạ trên người khách.</p>';
        // Hiệu ứng rung chỉ chạy ở lần vẽ ngay sau cú chạm.
        rv.last = '';
        rv.nudge = false;
        return html;
    }

    // Lớp vùng chạm phủ đúng chỗ paintArt vẽ chân dung trong canvas (phóng nguyên lần, căn giữa, chạm đáy),
    // nên vùng khớp tranh ở mọi DPR. Chưa có chân dung thì lớp phủ cả khung (CSS mặc định).
    function placeRevealZones() {
        var box = $('revealZones');
        var cv = ui.sheet.querySelector('canvas.reveal-face');
        var r = cv && cv._art;
        if (!box || !r || r.kind !== 'portrait' || !cv.clientWidth) return;
        var k = cv.clientWidth / r.W;
        box.style.left = (cv.offsetLeft + cv.clientLeft + r.x * k) + 'px';
        box.style.top = (cv.offsetTop + cv.clientTop + r.y * k) + 'px';
        box.style.width = (r.w * k) + 'px';
        box.style.height = (r.h * k) + 'px';
    }

    // zoneId rỗng: chạm vào chân dung nhưng ngoài ba vùng (chỉ nhắc, không tính là sai).
    function revealTap(zoneId) {
        var step = stepOf();
        var rv = dialog.reveal;
        if (!step.reveal || !rv || rv.found) return;
        if (!zoneId) {
            rv.nudge = true;
            sfx('tap');
            renderDialog();
            return;
        }
        if (rv.tried[zoneId]) return;
        if (zoneId === step.reveal.tell) {
            rv.found = true;
            var id = dialog.scene.tale;
            if (id) {
                var rec = state.tales[id] || (state.tales[id] = { started: '', lastDay: '', form: 'human', done: false });
                rec.form = 'true';
            }
            save();
            sfx('perfect');
            renderDialog();
            syncWorld();
            return;
        }
        rv.tried[zoneId] = true;
        rv.miss++;
        rv.last = zoneId;
        sfx('bad');
        renderDialog();
    }

    function serveHtml(step, rubyOpt) {
        var s = step.serve;
        var html = '<p class="small muted" style="margin:0">' + esc(step.ask || 'Chọn món khách gọi.') + '</p>';
        if (!Core.canServe(state, step)) {
            return html + '<p style="margin:0">' + esc(step.empty || 'Chưa có đủ món.') + '</p>' +
                '<div class="sheet-foot"><button class="btn" data-act="closeSheet">Để sau</button>' +
                '<button class="btn-primary" data-act="closePlace" data-id="pond">Ra Hồ sen</button></div>';
        }
        var items = [];
        if (s.kind === 'tea') {
            // Chỉ trà quán đang có (Core.teaList: trà cần lưu niệm chỉ có sau khi nhận lưu niệm đó).
            var have = Core.teaList(STORY, state).map(function (t) { return t.id; });
            items = (s.options || have).filter(function (id) { return have.indexOf(id) >= 0; }).map(function (id) {
                var t = teaById(id);
                return { id: id, zh: id, vi: t ? t.vi : '', ico: '🍵', count: '' };
            });
        } else {
            items = STORY.fish.filter(function (f) { return state.bag[f.id]; }).map(function (f) {
                return { id: s.want === '*' ? '*' : f.id, fid: f.id, zh: f.zh, vi: f.vi, art: fishArtHtml(f.id), count: '× ' + state.bag[f.id] };
            });
        }
        html += '<div class="serve-grid">' + items.map(function (it) {
            var wrong = dialog.tried[it.fid || it.id];
            return '<button class="jar' + (wrong ? ' wrong' : '') + '" data-act="serve" data-id="' + esc(it.id) + '" data-fid="' +
                esc(it.fid || it.id) + '"' + (wrong ? ' disabled' : '') + '>' + (it.art || '<span class="ico" aria-hidden="true">' + it.ico + '</span>') +
                '<span class="zh-line sm">' + renderZh(it.zh, rubyOpt) + '</span>' +
                (dialog.vi ? '<span class="vi-line">' + esc(it.vi) + '</span>' : '') +
                (it.count ? '<span class="count">' + esc(it.count) + '</span>' : '') + '</button>';
        }).join('') + '</div>';
        if (dialog.reply) {
            html += '<div class="reply"><div class="zh-line sm">' + renderZh(dialog.reply.zh, rubyOpt) + '</div>' +
                (dialog.vi ? '<div class="vi-line">' + esc(dialog.reply.vi) + '</div>' : '') + '</div>';
        }
        return html;
    }

    function dlgNext() {
        dialog.step++;
        dialog.tried = {};
        dialog.reply = null;
        dialog.right = false;
        dialog.spot = null;
        dialog.cook = null;
        dialog.read = null;
        dialog.reveal = null;
        dialog.charm = null;
        sfx('tap');
        if (dialog.step >= dialog.scene.steps.length) {
            finishDialog();
            return;
        }
        Core.setSceneStep(state, dialog.scene, dialog.step);
        saveSoon();
        renderDialog();
    }

    function choose(i) {
        var step = stepOf();
        var c = step.choose[i];
        if (!c) return;
        if (c.ok) {
            dialog.right = i;
            dialog.reply = c.reply || null;
            sfx('ok');
            if (!c.reply) {
                dlgNext();
                return;
            }
        } else {
            dialog.tried[i] = true;
            dialog.reply = c.reply || null;
            sfx('bad');
        }
        renderDialog();
    }

    function serveItem(id, fid) {
        var step = stepOf();
        var s = step.serve;
        var right = s.kind === 'tea' ? id === s.want : (s.want === '*' || fid === s.want);
        if (right && Core.serve(state, step, s.kind === 'fish' && s.want !== '*' ? fid : id)) {
            sfx('perfect');
            save();
            dlgNext();
            return;
        }
        dialog.tried[fid || id] = true;
        dialog.reply = step.wrong || { zh: '不是这个。', vi: 'Không phải cái này.' };
        sfx('bad');
        renderDialog();
    }

    function finishDialog() {
        var scene = dialog.scene;
        var tale = scene.tale ? Core.taleById(STORY, scene.tale) : null;
        // day theo đồng hồ gọi món (?day=N dời được) để cảnh đêm sau không mở ngay trong cùng đêm; now cho SRS.
        var fx = Core.finishScene(state, scene, { now: now(), deck: DECK, speed: SPEED, day: sceneCtx().day });
        save();
        // Khách đêm: actor ở lại tới khi mọi panel đóng (kể cả thẻ cuộn truyện), rồi mới ra cổng.
        var lv = tale ? { guest: scene.guest, tale: tale.id, form: guestForm(scene.guest), ready: false, going: false } : null;
        if (lv) leaving = lv;
        closeSheet();
        renderStats(fx.lk > 0);
        var learned = fx.learned && fx.learned.length ? fx.learned : [];
        var keep = fx.keepsake && STORY.keepsakes ? STORY.keepsakes[fx.keepsake] : null;
        var msgs = [];
        if (fx.lk) msgs.push('+' + fx.lk + ' 灵');
        if (fx.friend) msgs.push(guestOf(fx.friend).name + ' thân thiết hơn');
        if (fx.moveIn) {
            msgs.push(guestOf(fx.moveIn).name + ' dọn đến ở');
            sfx('bell');
        }
        if (fx.bag) {
            msgs.push('Giỏ cá ' + Object.keys(fx.bag).map(function (id) {
                var f = STORY.fish.filter(function (x) { return x.id === id; })[0];
                return '+' + fx.bag[id] + ' ' + (f ? f.vi : id);
            }).join(', '));
        }
        if (keep) {
            msgs.push('Lưu niệm: ' + keep.name);
            sfx('bell');
        }
        if (learned.length) msgs.push(learned.length + ' chữ mới');
        if (refreshNight()) syncWorld();
        if (lv) lv.ready = true;
        // Cuộn chữ của cảnh: cuộn truyện khách đêm, lần khách cũ ghé lại, hay cảnh chương 2 của khách quen.
        if (learned.length) {
            openTaleLesson(tale || { guest: scene.guest, name: '' }, learned, msgs.join(' · '));
        } else {
            if (msgs.length) toast(msgs.join(' · '), keep ? 4000 : 0);
            departIfReady();
            // Thư và trang sách mở từ thẻ ở Sơn môn / Tàng Kinh Các: đọc xong thì về lại thẻ đó (thư kế, trang kế).
            if (scene.manual) openPlace(scene.where);
        }
        maybeAutoScene();
    }

    // ---------- sổ ----------

    function stageColor(s) {
        if (s >= 9) return 'var(--stage-9)';
        if (s >= 7) return 'var(--stage-7)';
        if (s >= 5) return 'var(--stage-5)';
        return 'var(--stage-1)';
    }

    // ---------- tàng kinh các, nhà bếp, vọng vân đình ----------

    function libraryHtml() {
        return '<div class="card"><h2><span class="zh">匾</span>Biển lầu</h2>' + plaqueLesson(LIBRARY_CHARS) +
            '<p class="small muted">藏经阁 Tàng Kinh Các: lầu cất kinh sách của đạo quán. Chữ nào bạn đã học, ở Thư trai ' +
            'hay qua truyện của khách, đều được chép vào đây. Tìm theo chữ, âm, nghĩa; chạm một chữ để xem lại cả thẻ.</p></div>' +
            bookPagesHtml() + leechCardHtml() + learnedHtml();
    }

    function kitchenHtml() {
        var html = '';
        if (!state.flags.kitchen) {
            html += '<div class="card"><p class="muted" style="margin:0">Bếp còn nguội. Khi khách quen đã ghé quán, Lão Quy sẽ nhóm lửa giúp bạn.</p></div>';
        } else {
            var list = todayOrders();
            html += '<div class="card"><h2><span class="zh">单</span>Món khách gọi hôm nay</h2>';
            if (!list.length) html += '<p class="small muted">Hôm nay chưa ai gọi món.</p>';
            html += list.map(function (o) {
                var busy = !o.done && Core.guestHasScene(state, STORY, o.guest, sceneCtx());
                var right = o.done ? '<span class="done">✓ Đã mang ra</span>'
                    : (busy ? '<span class="small muted">Đang có chuyện ở Quán trà</span>'
                        : '<button class="btn-primary" data-act="cook" data-guest="' + esc(o.guest) + '">Nấu</button>');
                return '<div class="order-row">' + faceHtml(o.guest) + '<div class="grow"><b>' + esc(guestOf(o.guest).name) + '</b>' +
                    '<div class="zh-line sm">' + renderZh(Core.orderLine(STORY, o).zh) + '</div></div>' + right + '</div>';
            }).join('');
            html += '<p class="small muted" style="margin:6px 0 0">Sang ngày mới, khách quen lại gọi món khác.</p></div>' + recipesHtml();
        }
        return html + '<div class="card"><h2><span class="zh">匾</span>Chữ trên cửa bếp</h2>' + plaqueLesson(KITCHEN_CHARS) +
            '<p class="small muted">厨房 trù phòng: nhà bếp. Cá câu ở Hồ sen được đem về bếp; rau trong vườn sau nhà ' +
            'đủ cho cả quán.</p></div>' + fishHtml();
    }

    // Vườn rau sau bếp: biển 菜园; góc rào có khóm mẫu đơn trắng (nở sau truyện Hương Ngọc) và cây trà hoa đỏ.
    function gardenHtml() {
        var bloom = !!(state.keepsakes && state.keepsakes.hoa);
        return '<div class="card"><h2><span class="zh">匾</span>Tấm biển trên rào</h2>' + plaqueLesson(GARDEN_CHARS) +
            '<p class="small muted">菜园 thái viên: vườn rau. Cải, hành, củ cải và bí trồng ở đây đủ cho bếp của quán. ' +
            (bloom ? 'Góc rào có khóm mẫu đơn trắng đang nở, cạnh cây trà hoa đỏ.'
                : 'Góc rào có một khóm mẫu đơn chưa nở và một cây trà hoa đỏ.') + '</p></div>';
    }

    function dishReading(dish) {
        return Array.from(dish.zh).map(function (c) { return DECK.byChar[c] ? DECK.byChar[c].hv : '?'; }).join(' ');
    }

    // 鱼 cá + 汤 canh → canh cá: chữ chỉ loại đứng trước chữ chỉ món.
    function structureHtml(dish) {
        return Array.from(dish.zh).map(function (c) {
            return '<span class="zh">' + esc(c) + '</span> ' + esc(STORY.pantry[c] || '');
        }).join(' + ') + ' → <b>' + esc(dish.vi) + '</b>';
    }

    function recipesHtml() {
        var known = STORY.dishes.filter(function (d) { return state.cooked[d.id]; }).length;
        return '<div class="card"><h2><span class="zh">谱</span>Sổ món (' + known + '/' + STORY.dishes.length + ')</h2><div class="recipes">' +
            STORY.dishes.map(function (d) {
                var n = state.cooked[d.id] || 0;
                if (!n) return '<div class="recipe locked"><span class="zh">？？</span><span class="small muted">chưa nấu</span></div>';
                return '<div class="recipe"><span class="zh" lang="zh">' + esc(d.zh) + '</span><span class="hv">' + esc(dishReading(d)) + '</span>' +
                    '<span class="small muted">' + esc(d.vi) + ' · ' + n + ' lần</span></div>';
            }).join('') + '</div></div>';
    }

    // ---------- nấu ăn ----------
    // Món khách gọi trong ngày; đồng hồ riêng (orderNow) để ?day=N chỉ dời ngày gọi món.
    function orderNow() {
        return now() + DAY_SHIFT;
    }

    function todayOrders() {
        return Core.ensureOrders(state, STORY, orderNow());
    }

    function openOrders() {
        return Core.openOrders(state, STORY, orderNow(), sceneCtx());
    }

    function orderOf(guest) {
        var list = openOrders();
        for (var i = 0; i < list.length; i++) if (list[i].guest === guest) return list[i];
        return null;
    }

    // Trạng thái một lần nấu, dùng chung cho món gọi ở bếp (cooking) và bước cook trong cảnh (dialog.cook):
    // phase 'spot' (bắt chữ Tiểu Ly tráo) → 'pick' (chọn nguyên liệu theo thứ tự) → 'name' (đọc tên món) → 'done'.
    function newCook(dishId, seed, extra) {
        var ck = {
            dish: dishId, phase: 'pick', cards: Core.kitchenCards(STORY, Core.dishById(STORY, dishId), seed),
            picks: [], msg: null, hint: false, result: null, spot: null, spotLk: 0
        };
        Object.keys(extra || {}).forEach(function (k) { ck[k] = extra[k]; });
        return ck;
    }

    function activeCook() {
        return cooking || (dialog && dialog.cook) || null;
    }

    function startCook(order) {
        if (fishing || quiz || dialog) return;
        var dish = Core.dishById(STORY, order.dish);
        if (!Core.canCook(state, dish)) {
            toast(guestOf(order.guest).name + ' gọi ' + dish.vi + ', món này cần cá. Giỏ đang trống: ra Hồ sen câu một con đã.');
            return;
        }
        var line = Core.orderLine(STORY, order);
        cooking = newCook(order.dish, state.orders.day + '|' + order.guest, {
            src: 'order', order: order, guest: order.guest, line: line,
            plain: Core.orderLine(STORY, { guest: order.guest, dish: order.dish })
        });
        if (order.swap && !order.spotted) {
            cooking.phase = 'spot';
            cooking.spot = { line: line.zh, at: line.spotAt, right: order.swap.right, tried: {}, found: false };
        }
        place = null;
        hidePopover();
        sfx('tap');
        openSheet('tall');
        renderCook();
    }

    function renderCook() {
        var ck = cooking;
        var g = guestOf(ck.guest);
        var vi = !!state.settings.vi;
        var html = '<div class="sheet-head">' + faceHtml(ck.guest) + '<div class="who">' + esc(g.name) + '<span class="zh">' + esc(g.zh) +
            '</span><small>gọi món</small></div><button class="btn-ghost close" data-act="cookBack">' + (ck.phase === 'done' ? 'Đóng' : 'Để sau') + '</button></div>';
        if (ck.phase === 'spot') {
            html += '<p class="small muted" style="margin:0">Tiểu Ly lại tráo một chữ trong lời gọi món. Chạm vào chữ sai.</p>' +
                spotHtml(ck.spot) + (vi ? '<div class="vi-line">' + esc(ck.line.vi) + '</div>' : '');
            if (ck.spot.found) html += '<div class="sheet-foot"><button class="btn-primary" data-act="cookAfterSpot">Vào nấu ›</button></div>';
        } else {
            html += '<div class="order-line"><div class="zh-line sm">' + renderZh(ck.plain.zh) + '</div>' +
                (vi ? '<div class="vi-line">' + esc(ck.plain.vi) + '</div>' : '') + '</div>' + cookHtml(ck);
        }
        ui.sheet.innerHTML = html;
        paintArt(ui.sheet);
        bindCookForm();
    }

    function rubyShown(ch) {
        var mode = state.settings.ruby;
        if (mode === 'always') return true;
        if (mode === 'never') return false;
        return Core.stageOf(state, ch) < Core.RUBY_HIDE_STAGE;
    }

    // Chạm vào chữ bị tráo: mỗi chữ Hán là một nút; chữ thường (dấu câu) để nguyên.
    function spotHtml(sp) {
        var html = '<div class="spot-line">' + Core.parseZh(sp.line).map(function (p, i) {
            if (!p.cjk) return '<span class="spot-p">' + esc(p.ch) + '</span>';
            var cls = 'spot-c' + (sp.tried[i] ? ' tried' : '') + (sp.found && i === sp.at ? ' found' : '');
            return '<button class="' + cls + '" data-act="spot" data-i="' + i + '"' + (sp.found || sp.tried[i] ? ' disabled' : '') +
                ' lang="zh">' + esc(p.ch) + '</button>';
        }).join('') + '</div>';
        if (sp.found) {
            var wrong = Array.from(sp.line)[sp.at];
            var pair = null;
            STORY.confuse.forEach(function (c) { if (c.right === sp.right && c.wrong === wrong) pair = c; });
            var side = function (ch, cls) {
                var e = DECK.byChar[ch];
                return '<div class="side ' + cls + '"><span class="g" lang="zh">' + esc(ch) + '</span><b>' + esc(e ? e.hv : '') + '</b>' +
                    '<small>' + esc(e ? e.m : '') + '</small></div>';
            };
            html += '<div class="spot-pair">' + side(wrong, 'bad') + '<span class="arrow" aria-hidden="true">→</span>' + side(sp.right, 'ok') + '</div>' +
                (pair ? '<p class="small" style="margin:0">' + esc(pair.note) + '</p>' : '');
        } else if (Object.keys(sp.tried).length) {
            html += '<p class="small muted" style="margin:0">Chữ đó không sai. Nhìn kỹ các chữ còn lại.</p>';
        }
        return html;
    }

    function cookHtml(ck) {
        var dish = Core.dishById(STORY, ck.dish);
        var chars = Array.from(dish.zh);
        var vi = !!state.settings.vi;
        var html = '<div class="pot" aria-label="Nồi">';
        for (var i = 0; i < chars.length; i++) {
            var ch = ck.phase === 'pick' ? ck.picks[i] : chars[i];
            if (i) html += '<span class="plus" aria-hidden="true">+</span>';
            html += '<button class="slot' + (ch ? ' on' : '') + '" data-act="cookUnpick" data-i="' + i + '"' +
                (ch && ck.phase === 'pick' ? '' : ' disabled') + ' lang="zh">' + (ch ? esc(ch) : '') + '</button>';
        }
        html += '</div>';
        if (ck.phase === 'pick') {
            html += '<p class="small muted" style="margin:0;text-align:center">Chọn nguyên liệu theo đúng thứ tự trong tên món.</p>' +
                '<div class="ing-grid">' + ck.cards.map(function (c, i) {
                    var e = DECK.byChar[c];
                    return '<button class="ing" data-act="cookPick" data-i="' + i + '"' + (ck.picks.indexOf(c) >= 0 ? ' disabled' : '') + '>' +
                        '<span class="g" lang="zh">' + esc(c) + '</span>' + (rubyShown(c) && e ? '<span class="hv">' + esc(e.hv) + '</span>' : '') +
                        (vi ? '<span class="m">' + esc(STORY.pantry[c] || '') + '</span>' : '') + '</button>';
                }).join('') + '</div>';
        } else if (ck.phase === 'name') {
            html += '<p class="small muted" style="margin:0;text-align:center">Đọc tên món: gõ âm Hán Việt từng chữ, cách nhau bằng dấu cách.</p>' +
                answerFormHtml('cookInput', 'Mang ra');
        }
        if (ck.phase !== 'done') {
            html += '<div class="feedback' + (ck.msg && ck.msg.kind ? ' ' + ck.msg.kind : '') + '" id="cookFeedback" aria-live="polite">' +
                (ck.msg ? '<span>' + ck.msg.html + '</span>' : '') + '</div>';
        }
        if (ck.phase === 'name') {
            html += '<div class="tool-row"><button class="btn-ghost" type="button" data-act="cookHint">Gợi ý</button>' +
                '<button class="btn-ghost" type="button" data-act="cookSpeak">🔈 Nghe</button></div>';
        }
        if (ck.phase === 'done') {
            html += '<div class="cook-result"><div class="dish" lang="zh">' + esc(dish.zh) + '</div><div class="hv">' + esc(dishReading(dish)) + '</div>' +
                '<p class="small">' + structureHtml(dish) + '</p></div>';
            var res = ck.result || {};
            if (res.thanks) {
                html += '<div class="reply"><div class="zh-line sm">' + renderZh(res.thanks.zh) + '</div>' +
                    (vi ? '<div class="vi-line">' + esc(res.thanks.vi) + '</div>' : '') + '</div>';
            }
            if (res.lk) html += '<p class="small gain">+' + res.lk + ' 灵 · ' + esc(guestOf(ck.guest).name) + ' thân thiết hơn</p>';
            html += '<div class="sheet-foot"><button class="btn-primary" data-act="' + (ck.src === 'scene' ? 'dlgNext' : 'cookDone') + '">' +
                (ck.src === 'scene' ? 'Tiếp ›' : 'Xong') + '</button></div>';
        }
        return html;
    }

    function rerenderCook() {
        if (cooking) renderCook();
        else if (dialog) renderDialog();
    }

    function bindCookForm() {
        var input = $('cookInput');
        if (!input) return;
        bindAnswerForm(input, submitCookName);
        focusInput(input);
    }

    function cookSpot(i) {
        var sp = cooking ? cooking.spot : (dialog && dialog.spot);
        if (!sp || sp.found || sp.tried[i]) return;
        if (i === sp.at) {
            sp.found = true;
            sfx('ok');
            if (cooking) {
                cooking.spotLk = Core.spotOrder(state, cooking.order);
                save();
                renderStats(cooking.spotLk > 0);
            }
        } else {
            sp.tried[i] = true;
            sfx('bad');
        }
        rerenderCook();
    }

    function cookPick(i) {
        var ck = activeCook();
        if (!ck || ck.phase !== 'pick') return;
        var ch = ck.cards[i];
        if (!ch || ck.picks.indexOf(ch) >= 0) return;
        var dish = Core.dishById(STORY, ck.dish);
        ck.picks.push(ch);
        ck.msg = null;
        if (ck.picks.length < Array.from(dish.zh).length) {
            sfx('tap');
        } else {
            var res = Core.cookCheck(dish, ck.picks);
            if (res === 'ok') {
                ck.phase = 'name';
                sfx('ok');
            } else {
                ck.msg = res === 'order'
                    ? { kind: 'bad', html: 'Đúng nguyên liệu nhưng sai thứ tự. Tiếng Trung đặt chữ chỉ loại trước: ' + structureHtml(dish) + '.' }
                    : { kind: 'bad', html: 'Không phải món khách gọi. Đọc lại tên món rồi chọn lại.' };
                ck.picks = [];
                sfx('bad');
            }
        }
        rerenderCook();
    }

    function cookUnpick(i) {
        var ck = activeCook();
        if (!ck || ck.phase !== 'pick' || !ck.picks[i]) return;
        ck.picks.splice(i, 1);
        ck.msg = null;
        rerenderCook();
    }

    function cookHint() {
        var ck = activeCook();
        if (!ck || ck.phase !== 'name') return;
        ck.hint = true;
        ck.msg = { kind: '', html: 'Âm Hán Việt: <span class="hv">' + esc(dishReading(Core.dishById(STORY, ck.dish))) + '</span>' };
        rerenderCook();
    }

    function submitCookName(text) {
        var ck = activeCook();
        if (!ck || ck.phase !== 'name') return;
        var dish = Core.dishById(STORY, ck.dish);
        var res = Core.checkDishName(DECK, dish, text, { strict: state.settings.strict });
        if (res.empty) return;
        if (!res.ok) {
            ck.hint = true;
            ck.msg = { kind: 'bad', html: '✗ <span class="zh">' + esc(dish.zh) + '</span> đọc là <span class="hv">' + esc(res.expected) + '</span>' +
                (res.near ? ' (cần đúng dấu)' : '') + '. Gõ lại để mang ra.' };
            sfx('bad');
            rerenderCook();
            return;
        }
        if (ck.src === 'scene') {
            if (!Core.cookForScene(state, STORY, ck.dish)) {
                toast('Giỏ cá đang trống: ra Hồ sen câu một con đã.');
                return;
            }
            ck.phase = 'done';
            ck.result = { lk: 0 };
            save();
            sfx('perfect');
            renderDialog();
            return;
        }
        var r = Core.serveOrder(state, STORY, ck.order, { exact: res.exact && !ck.hint });
        if (!r.ok) {
            toast(r.reason === 'fish' ? 'Giỏ cá đang trống: ra Hồ sen câu một con đã.' : 'Món này đã mang ra rồi.');
            closeCook();
            return;
        }
        ck.phase = 'done';
        ck.result = { lk: r.lk + (ck.spotLk || 0), thanks: Core.orderThanks(STORY, ck.order, state.orders.day) };
        save();
        renderStats(true);
        sfx('perfect');
        renderCook();
    }

    // Để sau hoặc xong: quay lại bảng Nhà bếp (còn món khác thì nấu tiếp).
    function closeCook() {
        cooking = null;
        place = null;
        openPlace('kitchen');
    }

    function pavilionHtml() {
        var learned = Object.keys(state.items).length;
        return pairCardHtml() + '<div class="card"><h2><span class="zh">匾</span>Biển đình</h2>' + plaqueLesson(PAVILION_CHARS) +
            '<p class="small muted">望云亭 Vọng Vân Đình: đình ngắm mây trên đảo nhỏ, nối với Tàng Kinh Các bằng cầu treo.</p></div>' +
            '<div class="card"><h2><span class="zh">望</span>Nhìn lại đường đã đi</h2><p class="small">' +
            'Đã học <b>' + num(learned) + '</b> chữ. Chừng ấy chữ chiếm <b>' + pct(Core.coverage(state, DECK)) + '</b> số chữ ' +
            'trong một trang truyện; riêng chữ đã thuộc chiếm <b>' + pct(Core.coverage(state, DECK, 5)) + '</b>.</p>' +
            '<p class="small muted" style="margin:6px 0 0">Đã đọc ' + num(state.stats.answers) + ' lần, đúng ' +
            num(state.stats.correct) + ' lần. Tổng linh khí đã nhận: ' + num(state.lkTotal) + '.</p></div>' + keepsakesHtml();
    }

    // ---------- Vọng Vân Đình: đối từ ----------
    // Xấp giấy đỏ Liên Tỏa để lại (lưu niệm doi). Mỗi ngày PAIR_SIZE tờ (Core.ensurePairs, ngày theo giờ máy như món gọi):
    // tờ "Đọc" hỏi cách đọc cả từ có chữ đa âm, tờ "Nghĩa" hỏi nghĩa của từ có âm Hán Việt dễ hiểu lầm.

    function pairsOpen() {
        return !!(state.keepsakes && state.keepsakes.doi);
    }

    function pairDay() {
        return Core.dayKey(orderNow());
    }

    // Chốt hay dựng lại xấp giấy hôm nay; lưu khi xấp đổi. null khi chưa có lưu niệm doi.
    function refreshPairs() {
        if (!pairsOpen()) return null;
        var before = state.pairs && state.pairs.day + '|' + (state.pairs.set || []).join(',');
        var p = Core.ensurePairs(state, DECK, PAIRS, pairDay());
        if (before !== p.day + '|' + p.set.join(',')) saveSoon();
        return p;
    }

    // Thẻ Đối từ ở đầu panel Vọng Vân Đình: các tờ của hôm nay; tờ đã giải hiện từ. Chưa đủ PAIR_MIN câu dùng được thì
    // nhắc học thêm chữ.
    function pairCardHtml() {
        var p = refreshPairs();
        if (!p) return '';
        var head = '<div class="card ram-card pair-card"><h2><span class="zh">对</span>Đối từ</h2>';
        if (p.set.length < Core.PAIR_MIN) {
            return head + '<p class="small muted" style="margin:0">Liên Tỏa để lại một xấp giấy đỏ, mỗi tờ viết một từ. ' +
                'Các từ còn chữ bạn chưa học: học thêm vài cuộn rồi quay lại.</p></div>';
        }
        var note = p.done
            ? 'Đã giải đủ ' + p.set.length + ' tờ hôm nay. Mai có giấy mới.'
            : 'Liên Tỏa để lại một xấp giấy đỏ, mỗi tờ viết một từ: chọn cách đọc đúng, hay nghĩa đúng. Đúng ngay lần đầu được ' +
                Core.PAIR_LK + ' 灵; đủ ' + p.set.length + ' tờ hôm nay thêm ' + Core.PAIR_BONUS + ' 灵.';
        return head + '<p class="small muted" style="margin:0 0 8px">' + esc(note) + '</p>' +
            '<div class="ram-lamps">' + p.set.map(function (id, i) {
                var it = Core.pairItem(DECK, PAIRS, id);
                var done = !!(p.solved && p.solved[id]);
                var kind = it && it.kind === 'read' ? 'Đọc' : 'Nghĩa';
                return '<button class="ram-lamp pair-paper' + (done ? ' done' : '') + '" data-act="paper" data-id="' + esc(id) + '"' +
                    ' aria-label="Tờ ' + (i + 1) + ', ' + kind + (done ? ', đã giải' : '') + '">' +
                    '<span class="g" lang="zh">' + esc(done && it ? it.w : '对') + '</span>' +
                    '<span class="small">' + (done ? '✓ ' : '') + kind + '</span></button>';
            }).join('') + '</div></div>';
    }

    function openPaper(id) {
        var p = refreshPairs();
        if (!p || p.set.length < Core.PAIR_MIN || p.set.indexOf(id) < 0) return;
        place = null;
        paper = { id: id, tried: {}, gain: '' };
        sfx('page');
        openSheet('dlg');
        renderPaper();
    }

    // Từ trên tờ giấy, mỗi chữ kèm âm của chính từ đó. Tờ Đọc chưa giải: chữ đa âm không hiện âm; chữ khác hiện âm theo cài
    // đặt âm Hán Việt (như lời thoại), chữ ngoài bộ chữ luôn hiện. Tờ Nghĩa và tờ đã giải: mọi chữ hiện âm.
    function paperWordHtml(q, solved) {
        var sylls = q.r.split(' ');
        return Array.from(q.w).map(function (ch, i) {
            var poly = q.kind === 'read' && q.polys.indexOf(i) >= 0;
            var show = solved || q.kind === 'mean' || (!poly && (!DECK.byChar[ch] || rubyShown(ch)));
            var cls = poly ? ' class="poly"' : '';
            return show ? '<ruby' + cls + '>' + esc(ch) + '<rt>' + esc(sylls[i] || '') + '</rt></ruby>' : '<span' + cls + '>' + esc(ch) + '</span>';
        }).join('');
    }

    // Lời giải sau khi chọn đúng. Tờ Đọc: mỗi chữ đa âm, từng âm với nghĩa ngắn và từ cầu nối khác (âm của từ này in đậm).
    // Tờ Nghĩa: nghĩa trong truyện, nghĩa của từ tiếng Việt cùng âm, lời thêm.
    function paperAnswerHtml(q) {
        var html = '<div class="reply riddle-answer pair-answer"><b><span class="zh" lang="zh">' + esc(q.w) + '</span> ' + esc(q.r) + '</b>';
        if (q.kind === 'read') {
            Core.pairExplain(DECK, PAIRS, q.w, q.r).forEach(function (x) {
                x.reads.forEach(function (rd) {
                    var words = rd.words.map(function (w) { return '<span lang="zh">' + esc(w.w) + '</span> ' + esc(w.r); }).join(', ');
                    var label = '<span class="zh" lang="zh">' + esc(x.ch) + '</span> đọc ' + esc(rd.r) + ' (' + esc(rd.sense) + ')';
                    html += '<div class="small">' + (rd.used ? '<b>' + label + '</b>' : label) + (words ? ': ' + words : '') + '</div>';
                });
            });
        } else {
            html += ' · ' + esc(q.m) + '<div class="small">Tiếng Việt “' + esc(q.r) + '” là ' + esc(q.vi) + '.</div>' +
                (q.note ? '<div class="small">' + esc(q.note) + '</div>' : '');
        }
        if (paper.gain) html += '<div class="small riddle-gain">' + esc(paper.gain) + '</div>';
        return html + '</div>';
    }

    function renderPaper() {
        var p = state.pairs;
        var q = Core.pairQuestion(DECK, PAIRS, paper.id, p.day);
        if (!q) {
            closeSheet();
            return;
        }
        var solved = !!(p.solved && p.solved[paper.id]);
        var read = q.kind === 'read';
        var polyChars = read ? q.polys.map(function (i) { return Array.from(q.w)[i]; }).join(', ') : '';
        var head = '<div class="sheet-head"><div class="who"><span class="zh">对</span> Tờ ' + (p.set.indexOf(paper.id) + 1) + '/' + p.set.length +
            '<small>Đối từ · ' + (read ? 'Đọc' : 'Nghĩa') + '</small></div>' +
            '<button class="btn-ghost close" data-act="closeSheet">Đóng</button></div>';
        var ask = read
            ? 'Chữ <span class="zh" lang="zh">' + esc(polyChars) + '</span> có nhiều âm. Từ này đọc là:'
            : 'Âm Hán Việt là “' + esc(q.r) + '”. Trong truyện, từ này thường nghĩa là:';
        var body = '<div class="riddle-card pair-word-card"><div class="pair-word" lang="zh">' + paperWordHtml(q, solved) + '</div></div>' +
            '<p class="small muted pair-ask" style="margin:0">' + ask + '</p>' +
            '<div class="quiz-opts mean pair-opts" role="group" aria-label="' + (read ? 'Cách đọc để chọn' : 'Nghĩa để chọn') + '">' +
            q.opts.map(function (o, i) {
                var tried = !!paper.tried[o];
                var cls = solved ? (o === q.ans ? ' right' : (tried ? ' wrong' : ' dim')) : (tried ? ' wrong' : '');
                return '<button class="quiz-opt pair-opt' + cls + '" data-act="paperPick" data-i="' + i + '"' + (solved || tried ? ' disabled' : '') + '>' +
                    '<span class="k" aria-hidden="true">' + (i + 1) + '</span><span class="t">' + esc(o) + '</span></button>';
            }).join('') + '</div>';
        var foot = '';
        if (solved) {
            body += paperAnswerHtml(q);
            var next = nextPaper();
            foot = next ? '<button class="btn-primary" data-act="paper" data-id="' + esc(next) + '">Tờ tiếp ›</button>'
                : '<button class="btn-primary" data-act="closePaper">Xong</button>';
        }
        var tools = '<div class="dlg-tools"><button class="chip" data-act="paperSpeak">🔈 Nghe</button></div>';
        ui.sheet.innerHTML = head + body + tools + (foot ? '<div class="sheet-foot">' + foot + '</div>' : '');
    }

    // Tờ chưa giải kế tiếp (sau tờ đang mở, vòng lại từ đầu); '' khi đã giải đủ.
    function nextPaper() {
        var p = state.pairs;
        var i = p.set.indexOf(paper.id);
        for (var k = 1; k <= p.set.length; k++) {
            var id = p.set[(i + k) % p.set.length];
            if (!(p.solved && p.solved[id])) return id;
        }
        return '';
    }

    // Chọn phương án thứ i của tờ đang mở. Sai: đánh dấu, ghi vào bản lưu (lõi nhớ câu chọn sai để hỏi lại). Đúng: thưởng,
    // lời giải, nút tờ tiếp.
    function pickPaper(i) {
        if (!paper) return;
        var p = state.pairs;
        if (p.solved && p.solved[paper.id]) return;
        var q = Core.pairQuestion(DECK, PAIRS, paper.id, p.day);
        var choice = q ? q.opts[i] : null;
        if (choice == null || paper.tried[choice]) return;
        var res = Core.answerPair(state, DECK, PAIRS, paper.id, choice, now(), SPEED);
        if (!res) return;
        if (!res.ok) {
            paper.tried[choice] = true;
            sfx('bad');
            saveSoon();
            renderPaper();
            return;
        }
        var gain = [];
        if (res.lk) gain.push('+' + res.lk + ' 灵');
        if (res.bonus) gain.push('Giải đủ giấy hôm nay');
        paper.gain = gain.join(' · ');
        sfx(res.bonus ? 'bell' : 'perfect');
        save();
        renderStats(res.lk > 0);
        renderPaper();
    }

    // Lưu niệm khách đêm để lại: chữ lớn, tên, lời, kèm dòng 异史氏曰 của truyện (có âm Hán Việt).
    // Lưu niệm chưa có: ô mờ "？".
    function keepsakesHtml() {
        var ks = STORY.keepsakes || {};
        var ids = Object.keys(ks);
        if (!ids.length) return '';
        var have = state.keepsakes || {};
        return '<div class="card"><h2><span class="zh">留念</span>Lưu niệm</h2>' +
            '<p class="small muted">Đã tiễn ' + Core.talesDone(state, STORY) + '/' + talesList().length + ' khách lạ.</p>' +
            '<div class="keepsakes">' + ids.map(function (id) {
                var k = ks[id];
                if (!have[id]) {
                    return '<div class="keepsake locked"><span class="g" aria-hidden="true">？</span>' +
                        '<span class="small muted">Chưa có</span></div>';
                }
                var tale = k.tale ? Core.taleById(STORY, k.tale) : null;
                var yi = tale && tale.yi
                    ? '<div class="yi-mini"><div class="yi-title"><span class="seal" lang="zh">异史氏曰</span><small>phỏng tác</small></div>' +
                        '<div class="zh-line sm">' +
                        renderZh(tale.yi.zh, { ruby: 'always' }) + '</div><div class="vi-line">' + esc(tale.yi.vi) + '</div></div>'
                    : '';
                return '<div class="keepsake"><span class="g" lang="zh">' + esc(k.zh) + '</span><div class="grow"><b>' + esc(k.name) + '</b>' +
                    '<div class="small muted">' + esc(k.vi) + '</div>' + yi + '</div></div>';
            }).join('') + '</div></div>';
    }

    // ---------- tra chữ đã học (Tàng Kinh Các, Sổ) ----------
    // Ô tìm dựng một lần; gõ chữ hay đổi bộ lọc chỉ vẽ lại #dictBody, vì dựng lại input làm iOS đóng bàn phím.
    // Không tìm, không lọc: lưới chia nhóm 100 chữ theo thứ tự bộ chữ, rồi nhóm theo khách (chữ trong truyện đã
    // xong). Có tìm hay lọc: một danh sách phẳng. Chạm một chữ mở thẻ đầy đủ (#cardView); Trước/Tiếp đi trong
    // nhóm (hay danh sách) chứa ô đã chạm.

    var DICT_FILTERS = [
        { id: 'all', label: 'Tất cả' },
        { id: 'new', label: 'Mới học' },
        { id: 'known', label: 'Đã thuộc' },
        { id: 'long', label: 'Nhớ lâu' },
        { id: 'leech', label: 'Hay nhầm' },
        { id: 'due', label: 'Đến hạn' }
    ];
    var DICT_BAND = 100;
    // Bậc từ đó chữ tính là "Nhớ lâu" (gồm Khắc cốt, Thành thạo), cùng mốc màu xanh lam của stageColor.
    var STAGE_LONG = 7;
    // Cách xếp lưới khi không tìm, không lọc: theo ngày học (Core.learnDays) hay theo bộ chữ (nhóm 100 chữ, rồi nhóm theo
    // truyện như trước).
    var DICT_GROUPS = [
        { id: 'day', label: 'Ngày học' },
        { id: 'deck', label: 'Bộ chữ' }
    ];
    var WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    // Tên một ngày học ('YYYY-MM-DD', giờ máy): "Hôm nay", "Hôm qua", "Thứ Tư 14/10"; năm khác thì thêm năm.
    function dayName(key) {
        var t = now();
        if (key === Core.dayKey(t)) return 'Hôm nay';
        if (key === Core.dayKey(t - 24 * Core.HOUR)) return 'Hôm qua';
        var p = key.split('-');
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        return WEEKDAYS[d.getDay()] + ' ' + p[2] + '/' + p[1] + (Number(p[0]) !== new Date(t).getFullYear() ? '/' + p[0] : '');
    }

    // Lưới theo ngày học: mỗi ngày một nhóm, ngày gần nhất trước; "đợt" là số lần học trong ngày (một cuộn, một cuộn
    // truyện). Chữ học trước khi game ghi ngày học và đã trả lời thì vào nhóm cuối.
    function dayGroupsHtml() {
        var g = Core.learnDays(state, DECK);
        var html = '';
        g.days.forEach(function (d) {
            var batches = {};
            d.chars.forEach(function (c) { batches[state.items[c].at] = true; });
            var n = Object.keys(batches).length;
            var name = dayName(d.day);
            html += dictGroupHtml(esc(name) + (n > 1 ? '<small>' + n + ' đợt</small>' : ''), d.chars, name);
        });
        if (g.undated.length) {
            html += dictGroupHtml('Chưa ghi ngày học', g.undated, 'Chưa ghi ngày học') +
                '<p class="small muted dict-foot">Game ghi ngày học từ 16/10/2026. Chữ học trước đó và đã ôn thì không có ngày.</p>';
        }
        return html;
    }

    // Chữ đã học theo thứ tự bộ chữ.
    function learnedChars() {
        var out = [];
        DECK.list.forEach(function (e) { if (state.items[e.ch]) out.push(e.ch); });
        return out;
    }

    // Chữ của từng bộ lọc, giữ thứ tự bộ chữ. Mới học: bậc 1–4; đã thuộc: 5–6; nhớ lâu: từ 7.
    function dictSets(learned) {
        var t = now();
        var leech = {};
        Core.leechList(state, 0).forEach(function (c) { leech[c] = true; });
        var sets = { all: learned, new: [], known: [], long: [], leech: [], due: [] };
        learned.forEach(function (ch) {
            var it = state.items[ch];
            if (it.s >= STAGE_LONG) sets.long.push(ch);
            else if (it.s >= Core.STAGE_KNOWN) sets.known.push(ch);
            else sets['new'].push(ch);
            if (leech[ch]) sets.leech.push(ch);
            if (it.s < Core.STAGE_DONE && it.due <= t) sets.due.push(ch);
        });
        return sets;
    }

    function tileHtml(ch) {
        var e = DECK.byChar[ch];
        var it = state.items[ch];
        return '<button class="tile" data-act="tile" data-ch="' + esc(ch) + '" style="--stage-color:' + stageColor(it.s) + '" ' +
            'title="' + esc(Core.stageLabel(it.s)) + '"><span class="g">' + esc(ch) + '</span><span class="r">' + esc(e.hv) + '</span></button>';
    }

    // Một nhóm ô chữ; label là tên nhóm hiện trên đầu thẻ chữ khi mở từ nhóm này.
    function tilesHtml(chars, label) {
        return '<div class="tiles" data-label="' + esc(label) + '">' + chars.map(tileHtml).join('') + '</div>';
    }

    function dictGroupHtml(head, chars, label) {
        return '<section class="dict-group"><h3>' + head + '<span class="n">' + num(chars.length) + '</span></h3>' +
            tilesHtml(chars, label) + '</section>';
    }

    function dictBodyHtml(learned) {
        var sets = dictSets(learned);
        var chips = DICT_FILTERS.map(function (f) {
            var n = sets[f.id].length;
            if (!n && f.id !== 'all' && f.id !== dict.f) return '';
            return '<button class="chip" data-act="dictFilter" data-f="' + f.id + '" aria-pressed="' + (dict.f === f.id) + '">' +
                f.label + ' <span class="n">' + num(n) + '</span></button>';
        }).join('');
        var html = '<div class="dict-chips" role="group" aria-label="Lọc chữ đã học">' + chips + '</div>';
        var query = dict.q.trim();
        var filter = DICT_FILTERS.filter(function (f) { return f.id === dict.f; })[0] || DICT_FILTERS[0];
        if (query || filter.id !== 'all') {
            var found = Core.searchChars(DECK, sets[filter.id], query);
            // Chữ Hán đã học nhưng không thuộc mục đang lọc thì không phải "chưa học".
            var missing = found.missing.filter(function (c) { return !state.items[c]; });
            var label = query ? 'Tìm “' + query + '”' : filter.label;
            html += '<p class="small muted dict-note">' + (found.list.length
                ? (query ? 'Tìm thấy ' + num(found.list.length) + ' chữ' : num(found.list.length) + ' chữ') +
                    (query && filter.id !== 'all' ? ' trong mục ' + filter.label : '') + '.'
                : 'Không có chữ nào khớp' + (filter.id !== 'all' ? ' trong mục ' + filter.label : '') + '.') +
                (missing.length ? ' Chưa học: <span class="zh">' + esc(missing.join(' ')) + '</span>.' : '') + '</p>';
            if (found.list.length) html += tilesHtml(found.list, label);
            return html;
        }
        // Mặc định xếp theo ngày học khi đã có chữ ghi ngày (học từ 16/10/2026), không thì theo bộ chữ.
        var hasDays = learned.some(function (c) { return state.items[c].at > 0; });
        var by = dict.g || (hasDays ? 'day' : 'deck');
        html += '<div class="dict-by" role="group" aria-label="Xếp chữ đã học"><span class="small muted">Xếp theo</span>' +
            DICT_GROUPS.map(function (x) {
                return '<button class="chip" data-act="dictGroup" data-g="' + x.id + '" aria-pressed="' + (by === x.id) + '">' +
                    x.label + '</button>';
            }).join('') + '</div>';
        if (by === 'day') return html + dayGroupsHtml();
        // Nhóm 100 chữ theo thứ tự bộ chữ: chữ hay gặp đứng trước, cũng là thứ tự các cuộn ở Thư trai.
        var bands = [];
        learned.forEach(function (ch) {
            var b = Math.floor(DECK.byChar[ch].idx / DICT_BAND);
            (bands[b] = bands[b] || []).push(ch);
        });
        var stories = Core.storyGroups(state, STORY);
        if (stories.length) html += '<h3 class="dict-sub">Theo bộ chữ <small>chữ hay gặp đứng trước</small></h3>';
        bands.forEach(function (chars, b) {
            if (!chars) return;
            var range = num(b * DICT_BAND + 1) + '–' + num(Math.min((b + 1) * DICT_BAND, DECK.list.length));
            html += dictGroupHtml('Chữ ' + range, chars, 'Chữ ' + range);
        });
        if (stories.length) {
            html += '<h3 class="dict-sub">Theo truyện <small>chữ trong cảnh đã xong</small></h3>';
            stories.forEach(function (g) {
                var guest = guestOf(g.guest);
                var name = guest ? guest.name : g.guest;
                html += dictGroupHtml((guest && guest.zh ? '<span class="zh" lang="zh">' + esc(guest.zh) + '</span>' : '') + esc(name),
                    g.chars, 'Truyện ' + name);
            });
        }
        return html;
    }

    function learnedHtml() {
        var learned = learnedChars();
        var html = '<div class="card dict"><h2><span class="zh">字</span>Chữ đã học (' + num(learned.length) + ')</h2>';
        if (!learned.length) return html + '<p class="muted">Chưa học chữ nào.</p></div>';
        return html + '<input id="dictQ" class="dict-q" type="search" value="' + esc(dict.q) + '" ' +
            'placeholder="Tìm chữ, âm Hán Việt, nghĩa, pinyin" aria-label="Tìm chữ đã học" lang="vi" ' +
            'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">' +
            '<div id="dictBody">' + dictBodyHtml(learned) + '</div>' +
            '<p class="small muted" style="margin:8px 0 0">Vạch màu dưới chữ: vàng = mới học, xanh lá = đã thuộc, ' +
            'xanh lam = nhớ lâu, tím = thành thạo.</p></div>';
    }

    // Gõ trong ô tìm hay đổi bộ lọc: chỉ vẽ lại phần dưới ô tìm.
    function renderDictBody() {
        var body = $('dictBody');
        if (body) body.innerHTML = dictBodyHtml(learnedChars());
    }

    function setDictQuery(value) {
        if (dict.q === value) return;
        dict.q = value;
        renderDictBody();
    }

    // ---------- thẻ chữ đầy đủ (#cardView) ----------
    // Lớp riêng trên sheet (dưới ô tra chữ), nên lưới, ô tìm và chỗ cuộn bên dưới giữ nguyên; mở được cả từ ô tra
    // chữ ("Xem thẻ") khi một hội thoại hay bài học đang mở. Đóng thì xoá nội dung để không còn .glyph-card ẩn.

    function openCard(list, i, label, from) {
        card = { list: list, i: i, label: label || 'Thẻ chữ', from: from || null };
        hidePopover();
        ui.cardBack.hidden = false;
        ui.cardView.hidden = false;
        renderCard();
        syncCovered();
        var btn = ui.cardView.querySelector('[data-act="cardClose"]');
        if (btn) {
            try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }
        }
    }

    // Chạm một ô trong lưới: Trước/Tiếp đi theo các ô của cùng nhóm, đúng thứ tự đang thấy.
    function openCardFromTile(tile) {
        var grid = tile.closest('.tiles');
        var tiles = grid ? grid.querySelectorAll('.tile') : [tile];
        var list = [];
        var at = 0;
        for (var i = 0; i < tiles.length; i++) {
            if (tiles[i] === tile) at = list.length;
            list.push(tiles[i].getAttribute('data-ch'));
        }
        sfx('page');
        openCard(list, at, grid ? grid.getAttribute('data-label') : '', tile);
    }

    // Bậc nhớ, lần ôn kế, số lần đúng và sai, ngày học của một chữ đã học. Chữ chưa học (thẻ mở bằng ?card= từ Reader)
    // chỉ ghi "Chưa học".
    function cardMetaHtml(ch) {
        var it = state.items[ch];
        if (!it) return '<p class="card-meta unlearned">Chưa học</p>';
        var parts = [Core.stageLabel(it.s)];
        if (it.s >= Core.STAGE_DONE) parts.push('không cần ôn nữa');
        else if (it.due <= now()) parts.push('đến hạn ôn');
        else parts.push('lần ôn kế: ' + fmtIn(it.due - now()));
        if (it.ok || it.bad) parts.push('đúng ' + num(it.ok || 0) + ', sai ' + num(it.bad || 0));
        if (Core.leechList(state, 0).indexOf(ch) >= 0) parts.push('hay nhầm');
        if (it.at > 0) {
            var day = dayName(Core.dayKey(it.at));
            parts.push(/^Hôm/.test(day) ? 'học ' + day.toLowerCase() : 'học ' + day.replace(/^\S+ \S+ /, 'ngày '));
        }
        return '<p class="card-meta" style="--stage-color:' + stageColor(it.s) + '">' + esc(parts.join(' · ')) + '</p>';
    }

    function renderCard() {
        var ch = card.list[card.i];
        var n = card.list.length;
        ui.cardView.innerHTML =
            '<div class="lesson-top"><b>' + esc(card.label) + '</b>' +
            (n > 1 ? '<span class="small muted">chữ ' + (card.i + 1) + '/' + n + '</span>' : '') +
            '<button class="btn-ghost" data-act="cardClose" style="margin-left:auto">Đóng</button></div>' +
            glyphCardHtml(ch, { listen: true }) + cardMetaHtml(ch) + factsHtml(ch) +
            (n > 1 ? '<div class="sheet-foot"><button class="btn" data-act="cardPrev"' + (card.i ? '' : ' disabled') + '>‹ Trước</button>' +
                '<button class="btn-primary" data-act="cardNext"' + (card.i < n - 1 ? '' : ' disabled') + '>Tiếp ›</button></div>' : '');
        ui.cardView.scrollTop = 0;
        strokeSync(ui.cardView.querySelector('.glyph-card'));
    }

    function cardStep(d) {
        if (!card) return;
        var j = card.i + d;
        if (j < 0 || j >= card.list.length) return;
        card.i = j;
        hidePopover();
        sfx('page');
        renderCard();
    }

    // Đóng thẻ: về đúng ô của chữ đang xem trong lưới (Trước/Tiếp có thể đã sang chữ khác), cuộn tới ô đó nếu cần.
    // quiet: sheet bên dưới cũng sắp đóng hay đổi nội dung, không trả focus, và gỡ khung vẽ nét dù nó đang ở thẻ nào.
    function closeCard(quiet) {
        if (quiet) strokeRelease();
        if (!card) return;
        var c = card;
        card = null;
        if (stroke.gc && ui.cardView.contains(stroke.gc)) strokeRelease();
        ui.cardView.hidden = true;
        ui.cardBack.hidden = true;
        ui.cardView.innerHTML = '';
        syncCovered();
        hidePopover();
        // Thẻ mở bằng "Xem thẻ" trên một bài học: thẻ học bên dưới lấy lại khung vẽ nét.
        if (!quiet) strokeSync(ui.sheet.querySelector('.glyph-card'));
        var from = c.from;
        if (quiet || !from || !from.isConnected) return;
        var grid = from.closest('.tiles');
        var cur = c.list[c.i];
        var target = from;
        if (grid) {
            var tiles = grid.querySelectorAll('.tile');
            for (var i = 0; i < tiles.length; i++) {
                if (tiles[i].getAttribute('data-ch') === cur) {
                    target = tiles[i];
                    break;
                }
            }
        }
        if (target !== from && target.scrollIntoView) target.scrollIntoView({ block: 'nearest' });
        try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }

    // ---------- cách viết (thẻ chữ) ----------
    // Nút "Cách viết" của thẻ chữ thay chữ lớn bằng khung vẽ ô chữ mễ: chữ tự viết từng nét theo thứ tự (Xem lại), rồi
    // người chơi tô theo nét mờ bằng ngón tay hay chuột (Viết thử); tô sai STROKE_HINT lần ở một nét thì nét đó sáng lên.
    // Viết thử không đổi bậc nhớ, không cho linh khí. Thư viện Hanzi Writer (lib/hanzi-writer.min.js) chỉ tải khi mở lần
    // đầu; dữ liệu nét tải theo tệp (strokes/<Core.strokeFile>.json). Cả hai dựng bằng tools/quy-van/build-strokes.mjs.
    // Cả phiên chỉ có MỘT writer: mỗi writer gắn listener vào document mà thư viện không gỡ, nên khung vẽ chuyển sang thẻ
    // đang mở và writer đổi chữ bằng setCharacter. Sau một lần tải hỏng, hàm của writer ném lỗi cho tới lần setCharacter
    // sau, nên mọi lệnh gọi writer đều bọc try.

    function assetUrl(p) {
        return ASSET_V ? p + '?v=' + ASSET_V : p;
    }

    function loadStrokeLib() {
        if (window.HanziWriter) return Promise.resolve(window.HanziWriter);
        if (!strokeLib) {
            strokeLib = new Promise(function (resolve, reject) {
                var s = document.createElement('script');
                s.src = assetUrl('lib/hanzi-writer.min.js');
                s.onload = function () {
                    if (window.HanziWriter) resolve(window.HanziWriter);
                    else reject(new Error('lib/hanzi-writer.min.js không có HanziWriter'));
                };
                s.onerror = function () { reject(new Error('không tải được lib/hanzi-writer.min.js')); };
                document.head.appendChild(s);
            });
            // Tải hỏng thì lần mở sau tải lại.
            strokeLib.catch(function () { strokeLib = null; });
        }
        return strokeLib;
    }

    // Dữ liệu nét { strokes, medians } của chữ ch. Mỗi tệp chỉ tải một lần; tải hỏng thì lần sau tải lại.
    function strokeData(ch) {
        var f = Core.strokeFile(DECK, ch);
        if (f < 0) return Promise.reject(new Error('chữ ngoài bộ chữ: ' + ch));
        if (!strokeFiles[f]) {
            strokeFiles[f] = fetch(assetUrl('strokes/' + f + '.json')).then(function (r) {
                if (!r.ok) throw new Error('strokes/' + f + '.json: HTTP ' + r.status);
                return r.json();
            });
            strokeFiles[f].catch(function () { delete strokeFiles[f]; });
        }
        return strokeFiles[f].then(function (all) {
            if (!all[ch]) throw new Error('strokes/' + f + '.json không có chữ ' + ch);
            return all[ch];
        });
    }

    // Khung vẽ: svg đúng STROKE_BOX px (không co giãn bằng CSS), nền ô chữ mễ như giấy tập viết.
    function strokeSvg() {
        if (stroke.svg) return stroke.svg;
        var NS = 'http://www.w3.org/2000/svg';
        var S = STROKE_BOX;
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'stroke-svg');
        svg.setAttribute('width', String(S));
        svg.setAttribute('height', String(S));
        svg.setAttribute('role', 'img');
        [[0, 0, S, S], [S, 0, 0, S], [S / 2, 0, S / 2, S], [0, S / 2, S, S / 2]].forEach(function (l) {
            var line = document.createElementNS(NS, 'line');
            line.setAttribute('class', 'stroke-grid');
            line.setAttribute('x1', String(l[0]));
            line.setAttribute('y1', String(l[1]));
            line.setAttribute('x2', String(l[2]));
            line.setAttribute('y2', String(l[3]));
            svg.appendChild(line);
        });
        stroke.svg = svg;
        return svg;
    }

    function cssColor(name, fallback) {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    }

    function strokeWriter() {
        if (stroke.writer) return stroke.writer;
        stroke.writer = new window.HanziWriter(strokeSvg(), {
            width: STROKE_BOX,
            height: STROKE_BOX,
            padding: STROKE_PAD,
            showCharacter: false,
            strokeColor: cssColor('--ink', '#2a1f17'),
            outlineColor: cssColor('--paper-3', '#e7dbbb'),
            drawingColor: cssColor('--red', '#b8402c'),
            highlightColor: cssColor('--jade', '#3d7a50'),
            drawingWidth: STROKE_INK,
            delayBetweenStrokes: 280,
            showHintAfterMisses: STROKE_HINT,
            // Nét gợi ý tự vẽ từ đầu nét rồi mờ đi, khoảng 1–1,4 giây (mặc định 2 thì chỉ chớp 0,4 giây).
            strokeHighlightSpeed: 0.7,
            charDataLoader: function (ch, onLoad, onError) { strokeData(ch).then(onLoad, onError); },
            // Có hàm này thì lần tải hỏng không thành lỗi Promise chưa bắt; strokeShow tự báo hỏng qua strokeData.
            onLoadCharDataError: function () { /* xem strokeShow */ }
        });
        return stroke.writer;
    }

    function motionOk() {
        return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // Đưa phần cách viết của thẻ gc về đúng stroke.open: mở thì gắn khung vẽ (strokeShow), đóng thì gỡ.
    function strokeSync(gc) {
        if (!gc) return;
        var btn = gc.querySelector('[data-act="strokeToggle"]');
        var panel = gc.querySelector('.stroke-panel');
        if (btn) btn.setAttribute('aria-expanded', String(stroke.open));
        if (panel) panel.hidden = !stroke.open;
        if (stroke.open) {
            strokeShow(gc);
        } else {
            if (stroke.gc === gc) strokeRelease();
            gc.classList.remove('stroke-on', 'stroke-writing');
        }
    }

    function strokeToggle(el) {
        var gc = el.closest('.glyph-card');
        if (!gc) return;
        stroke.open = !stroke.open;
        sfx('tap');
        strokeSync(gc);
        var box = gc.querySelector('.stroke-box');
        if (stroke.open && box && box.scrollIntoView) box.scrollIntoView({ block: 'nearest' });
    }

    // Gắn khung vẽ vào thẻ gc, tải thư viện và dữ liệu nét rồi cho chữ tự viết. Người chơi chọn giảm chuyển động thì hiện
    // cả chữ ngay; nút Xem lại vẫn cho chữ tự viết.
    function strokeShow(gc) {
        strokeRelease();
        var run = stroke.run;
        var ch = gc.getAttribute('data-ch');
        var svg = strokeSvg();
        stroke.gc = gc;
        stroke.ch = ch;
        stroke.n = 0;
        stroke.done = 0;
        stroke.miss = 0;
        stroke.last = '';
        svg.setAttribute('aria-label', 'Cách viết chữ ' + ch);
        gc.querySelector('.stroke-box').appendChild(svg);
        strokeMode('load');
        loadStrokeLib().then(function () {
            if (run !== stroke.run) return null;
            // setCharacter xoá ngay chữ cũ trong khung vẽ, rồi tải dữ liệu qua strokeData (đã tải thì có ngay).
            return Promise.all([strokeData(ch), strokeWriter().setCharacter(ch)]).then(function (res) {
                if (run !== stroke.run) return;
                stroke.n = res[0].strokes.length;
                strokePlay(!motionOk());
            });
        }).catch(function () {
            if (run === stroke.run) strokeMode('fail');
        });
    }

    // Gỡ khung vẽ khỏi thẻ đang chứa nó: dừng hoạt hình và lượt Viết thử, bỏ kết quả tải còn chờ. stroke.open giữ nguyên.
    function strokeRelease() {
        stroke.run++;
        if (stroke.writer) {
            try {
                stroke.writer.cancelQuiz();
                stroke.writer.pauseAnimation();
            } catch (e) { /* chữ trước tải hỏng: writer chờ setCharacter mới */ }
        }
        if (stroke.svg && stroke.svg.parentNode) stroke.svg.parentNode.removeChild(stroke.svg);
        if (stroke.gc) stroke.gc.classList.remove('stroke-writing');
        stroke.gc = null;
        stroke.mode = '';
    }

    // Cho chữ tự viết từng nét; still: hiện cả chữ ngay, không chạy hoạt hình.
    function strokePlay(still) {
        var w = stroke.writer;
        var run = stroke.run;
        if (!w || !stroke.gc) return;
        stroke.last = '';
        try {
            if (still) {
                w.cancelQuiz();
                w.showCharacter({ duration: 0 });
                strokeMode('shown');
                return;
            }
            strokeMode('play');
            w.animateCharacter({
                onComplete: function (res) {
                    if (run === stroke.run && stroke.mode === 'play' && !(res && res.canceled)) strokeMode('shown');
                }
            });
        } catch (e) {
            strokeMode('fail');
        }
    }

    // Xem lại: chữ tự viết lại từ đầu. Sau một lần tải hỏng thì tải lại (nút này ghi "Thử lại").
    function strokeReplay(el) {
        var gc = el.closest('.glyph-card');
        if (!gc) return;
        if (stroke.gc !== gc || stroke.mode === 'fail') strokeShow(gc);
        else if (stroke.mode !== 'load') strokePlay(false);
    }

    // Viết thử: người chơi tô từng nét theo nét mờ, đúng thứ tự mới được tính.
    function strokeQuiz(el) {
        var w = stroke.writer;
        var run = stroke.run;
        if (!w || stroke.gc !== el.closest('.glyph-card') || stroke.mode === 'load' || stroke.mode === 'fail') return;
        stroke.done = 0;
        stroke.miss = 0;
        stroke.last = '';
        try {
            w.quiz({
                onCorrectStroke: function (d) {
                    if (run !== stroke.run) return;
                    stroke.done = d.strokeNum + 1;
                    stroke.last = 'ok';
                    if (d.strokesRemaining > 0) sfx('tap');
                    strokeMode('quiz');
                },
                onMistake: function (d) {
                    if (run !== stroke.run) return;
                    stroke.miss = d.totalMistakes;
                    stroke.last = d.mistakesOnStroke >= STROKE_HINT ? 'hint' : 'bad';
                    strokeMode('quiz');
                },
                onComplete: function (d) {
                    if (run !== stroke.run) return;
                    stroke.done = stroke.n;
                    stroke.miss = d.totalMistakes;
                    sfx(d.totalMistakes ? 'ok' : 'perfect');
                    strokeMode('done');
                }
            });
            strokeMode('quiz');
        } catch (e) {
            strokeMode('fail');
        }
    }

    // Vẽ lại phần cách viết của thẻ đang chứa khung vẽ theo mode: khung vẽ thay chữ lớn (trừ khi tải hỏng), ô tô nét chặn
    // cuộn trang chỉ khi đang Viết thử, dòng trạng thái, hai nút. data-* trên .stroke-panel để kịch bản e2e đọc.
    function strokeMode(mode) {
        stroke.mode = mode;
        var gc = stroke.gc;
        if (!gc) return;
        var panel = gc.querySelector('.stroke-panel');
        var replay = panel.querySelector('[data-act="strokeReplay"]');
        var write = panel.querySelector('[data-act="strokeQuiz"]');
        gc.classList.toggle('stroke-on', mode !== 'fail');
        gc.classList.toggle('stroke-writing', mode === 'quiz');
        panel.setAttribute('data-mode', mode);
        panel.setAttribute('data-n', String(stroke.n));
        panel.setAttribute('data-done', String(stroke.done));
        panel.setAttribute('data-miss', String(stroke.miss));
        panel.querySelector('.stroke-status').textContent = strokeStatus();
        replay.textContent = mode === 'fail' ? 'Thử lại' : 'Xem lại';
        replay.disabled = mode === 'load';
        write.hidden = mode === 'load' || mode === 'fail';
        write.textContent = mode === 'quiz' || mode === 'done' ? 'Viết lại' : 'Viết thử';
    }

    function strokeStatus() {
        var ch = stroke.ch;
        var n = stroke.n;
        var k = stroke.done + 1;
        switch (stroke.mode) {
        case 'load': return 'Đang tải nét chữ…';
        case 'fail': return 'Chưa tải được nét chữ. Kiểm tra mạng rồi bấm Thử lại.';
        case 'play': return 'Chữ ' + ch + ' có ' + n + ' nét. Xem thứ tự viết.';
        case 'shown': return 'Chữ ' + ch + ' có ' + n + ' nét. Bấm Viết thử để tự tô từng nét.';
        case 'quiz':
            if (stroke.last === 'hint') return 'Nét ' + k + ' vừa sáng lên: tô theo nét đó.';
            if (stroke.last === 'bad') return 'Chưa đúng nét ' + k + '. Thử lại.';
            return (stroke.last === 'ok' ? 'Đúng. ' : 'Tô theo nét mờ, đúng thứ tự. ') + 'Nét ' + k + '/' + n + '.';
        case 'done':
            return stroke.miss ? 'Viết xong chữ ' + ch + ', tô sai ' + stroke.miss + ' lần.' : 'Viết xong chữ ' + ch + ', không tô sai nét nào.';
        default: return '';
        }
    }

    // Sổ cá: đủ mọi loài; loài chưa câu được chỉ hiện bóng mờ và lời gợi ý chỗ câu.
    function fishHtml() {
        var caught = STORY.fish.filter(function (f) { return state.caught[f.id]; });
        return '<div class="card"><h2><span class="zh">鱼</span>Cá đã câu (' + caught.length + '/' + STORY.fish.length + ' loài)</h2>' +
            '<div class="fish-dex">' + STORY.fish.map(function (f) {
                var n = state.caught[f.id] || 0;
                if (!n) {
                    var where = FISH_HINT[f.id] || (f.night ? 'Chỉ có đêm trăng' : (f.size === 3 ? 'Cá lớn, ở chỗ nước sâu' : 'Chưa câu được'));
                    return '<div class="fish-cell unknown">' + fishArtHtml(f.id, '', true) + '<div class="fish-name"><span class="zh">？？</span></div>' +
                        '<div class="small muted">' + where + (f.rare ? ' · hiếm gặp' : '') + '</div></div>';
                }
                return '<div class="fish-cell">' + fishArtHtml(f.id) + '<div class="fish-name"><span class="zh">' + esc(f.zh) + '</span>' +
                    '<b>' + esc(f.hv) + '</b></div><div class="small muted">' + esc(f.vi) + ' · đã&nbsp;câu&nbsp;' + n +
                    (state.bag[f.id] ? ' · giỏ&nbsp;' + state.bag[f.id] : '') + '</div></div>';
            }).join('') + '</div></div>';
    }

    // Sổ: lưới chữ đã học có thể dài cả nghìn chữ, nên đầu Sổ có hàng nút nhảy tới từng mục.
    function bookHtml() {
        var html = '<div class="row book-nav">' + [['bookDict', 'Chữ đã học'], ['bookFish', 'Cá đã câu'], ['bookSettings', 'Cài đặt'],
            ['bookProgress', 'Tiến độ']].map(function (x) {
            return '<button class="chip" data-act="jump" data-to="' + x[0] + '">' + x[1] + '</button>';
        }).join('') + '</div>';
        html += '<div id="bookDict">' + learnedHtml() + '</div><div id="bookFish">' + fishHtml() + '</div>';
        html += '<div class="card" id="bookSettings"><h2><span class="zh">设</span>Cài đặt</h2><div class="settings">' +
            '<label class="setting"><span>Âm Hán Việt trên chữ</span><select id="setRuby" data-set="ruby">' +
            option('auto', 'Ẩn khi đã ôn đúng một lần', state.settings.ruby) + option('always', 'Luôn hiện', state.settings.ruby) +
            option('never', 'Không hiện', state.settings.ruby) + '</select></label>' +
            '<label class="setting"><span>Ngày và đêm</span><select id="setNight" data-set="night">' +
            option('auto', 'Theo giờ máy (khi đã thắp đèn)', nightMode) + option('day', 'Luôn ban ngày', nightMode) +
            option('night', 'Luôn ban đêm', nightMode) + '</select></label>' +
            switchRow('strict', 'Bắt buộc gõ đúng dấu') + switchRow('pinyin', 'Hiện pinyin khi học') +
            switchRow('sfx', 'Hiệu ứng âm thanh') + switchRow('music', 'Tiếng nền') + '</div></div>';
        html += '<div class="card" id="bookProgress"><h2><span class="zh">录</span>Tiến độ</h2><p class="small muted">Đã trả lời ' + num(state.stats.answers) +
            ' lần, đúng ' + num(state.stats.correct) + ' (đúng cả dấu ' + num(state.stats.exact) + '). Tổng linh khí đã nhận: ' +
            num(state.lkTotal) + '.' + (state.flags['quy-ram'] ? ' Đêm rằm đã giải đủ đèn: ' + num((state.ramDone || []).length) + ' lần.' : '') +
            '</p>' + saveCardHtml() +
            '<div class="row save-reset"><button class="btn" data-act="reset">Xóa tiến độ</button></div></div>';
        return html;
    }

    // Sao lưu trong thẻ Tiến độ: tải/nạp tệp, chép/dán mã. Hộp #saveBox hiện lời hỏi lại, ô dán mã hay lỗi.
    function saveCardHtml() {
        return '<p class="small muted">Tiến độ chỉ lưu trên trình duyệt này. Safari trên iPhone có thể xóa dữ liệu của trang ' +
            'nếu 7 ngày dùng Safari mà không mở game, nên thỉnh thoảng hãy tải bản lưu về máy. <span id="backupNote">' +
            esc(backupNote()) + '</span></p>' +
            '<div class="row">' + (IN_FRAME ? '' : '<button class="btn" data-act="saveExport">Tải bản lưu</button>') +
            '<label class="btn file-btn">Nạp bản lưu<input type="file" accept=".json,application/json" data-set="saveFile" ' +
            'aria-label="Chọn tệp bản lưu"></label></div>' +
            '<div class="row save-alt"><button class="chip" data-act="saveCopy">Chép mã bản lưu</button>' +
            '<button class="chip" data-act="savePaste">Dán mã bản lưu</button></div>' +
            '<div id="saveBox" class="save-box" hidden></div>';
    }

    function option(value, label, current) {
        return '<option value="' + value + '"' + (value === current ? ' selected' : '') + '>' + esc(label) + '</option>';
    }

    function switchRow(key, label) {
        var on = !!state.settings[key];
        return '<div class="setting"><span>' + esc(label) + '</span><button class="switch" role="switch" data-act="toggle" data-key="' +
            key + '" aria-checked="' + on + '" aria-label="' + esc(label) + '"></button></div>';
    }

    function resetProgress(btn) {
        if (!btn.dataset.armed) {
            btn.dataset.armed = '1';
            btn.textContent = 'Bấm lần nữa để xóa hết';
            btn.classList.add('btn-primary');
            setTimeout(function () {
                if (btn.isConnected) {
                    delete btn.dataset.armed;
                    btn.textContent = 'Xóa tiến độ';
                    btn.classList.remove('btn-primary');
                }
            }, 4000);
            return;
        }
        storageDel(SAVE_KEY);
        // Người chơi tự xoá: được ghi lại từ đầu, kể cả khi trước đó tab này không ghi đè bản lưu của bản mới hơn.
        saveBlocked = false;
        replaceState(Core.newState(now()));
        toast('Đã xóa tiến độ.');
    }

    // Thay cả state (xóa tiến độ, nạp bản lưu, tab khác vừa ghi bản lưu): dọn mọi thứ đang mở rồi để
    // closeSheet → syncWorld vẽ lại thế giới (sửa chữa, ngày đêm, khách). noSave: state đã nằm trong storage
    // (lấy từ sự kiện storage), lưu lại sẽ gửi sự kiện ngược về tab kia.
    function replaceState(next, noSave) {
        state = next;
        if (!state.created) state.created = now();
        autoOpened = {};
        arrivals = {};
        leaving = null;
        pendingSave = null;
        if (fishing) endFishing();
        if (!noSave) save();
        applySound();
        closeSheet();
        if (world) world.home();
        maybeAutoScene();
    }

    // ---------- sao lưu tiến độ ----------

    function fmtDate(ms) {
        return new Date(ms).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function backupNote() {
        var at = Number(storageGet(BACKUP_AT_KEY)) || 0;
        return at ? 'Sao lưu lần cuối: ' + fmtDate(at) + '.' : 'Chưa sao lưu lần nào.';
    }

    function markBackup() {
        storageSet(BACKUP_AT_KEY, String(now()));
        var note = $('backupNote');
        if (note) note.textContent = backupNote();
    }

    function saveBox(html) {
        var box = $('saveBox');
        if (!box) return null;
        box.innerHTML = html;
        box.hidden = !html;
        if (html && box.scrollIntoView) box.scrollIntoView({ block: 'nearest' });
        return box;
    }

    function saveText() {
        save();
        return Core.exportSave(state, now());
    }

    function exportSaveFile() {
        var name = 'quy-van-' + new Date(now()).toISOString().slice(0, 10) + '.json';
        var url = '';
        try {
            url = URL.createObjectURL(new Blob([saveText()], { type: 'application/json' }));
            var a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            toast('Không tạo được tệp. Dùng "Chép mã bản lưu" thay thế.');
            return;
        }
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
        markBackup();
        toast('Đã tạo tệp ' + name + '.');
    }

    // Chép mã: clipboard phải gọi ngay trong lúc bấm. Trình duyệt từ chối thì hiện mã trong ô để tự chép.
    function copySaveCode() {
        var text = saveText();
        var manual = function () {
            var box = saveBox('<p class="small">Chạm giữ ô dưới, chọn tất cả rồi chép:</p>' +
                '<textarea class="save-code" readonly aria-label="Mã bản lưu">' + esc(text) + '</textarea>');
            var ta = box && box.querySelector('textarea');
            if (ta) {
                ta.addEventListener('copy', markBackup);
                ta.focus();
                ta.select();
            }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                markBackup();
                saveBox('');
                toast('Đã chép mã bản lưu. Dán vào Ghi chú hay tin nhắn để giữ.', 3600);
            }, manual);
        } else {
            manual();
        }
    }

    function openPasteBox() {
        var box = saveBox('<label class="small" for="saveCode">Dán mã bản lưu đã chép vào ô dưới:</label>' +
            '<textarea id="saveCode" class="save-code" autocomplete="off" spellcheck="false"></textarea>' +
            '<div class="row"><button class="btn" data-act="savePasteRead">Đọc mã</button>' +
            '<button class="btn-ghost" data-act="saveCancel">Thôi</button></div>');
        var ta = box && box.querySelector('textarea');
        if (ta) ta.focus();
    }

    function readSaveFile(input) {
        var file = input.files && input.files[0];
        if (!file) return;
        var reset = function () { input.value = ''; };
        if (file.size > 5 * 1024 * 1024) {
            reset();
            offerSave('', file.name);
            return;
        }
        file.text().then(function (text) {
            reset();
            offerSave(text, file.name);
        }, function () {
            reset();
            saveBox('<p class="save-error">Không đọc được tệp ' + esc(file.name) + '.</p>');
        });
    }

    // Bản lưu đọc được thì hỏi lại ngay trong thẻ (khung artifact không có hộp confirm()); hỏng thì báo, giữ tiến độ.
    function offerSave(text, from) {
        var next = Core.parseSave(text, now());
        if (!next) {
            pendingSave = null;
            saveBox('<p class="save-error">' + esc(from) + ' không phải bản lưu Quy Vân Quán, hoặc đã hỏng. ' +
                'Tiến độ hiện tại giữ nguyên.</p>');
            return;
        }
        pendingSave = next;
        var a = Core.saveSummary(next);
        var b = Core.saveSummary(state);
        saveBox('<p>Bản lưu này có <b>' + num(a.learned) + ' chữ</b> đã học, ' + num(a.lk) + ' 灵' +
            (a.created ? ', bắt đầu chơi ngày ' + fmtDate(a.created) : '') + '.</p>' +
            '<p class="small muted">Tiến độ trên máy này (' + num(b.learned) + ' chữ, ' + num(b.lk) + ' 灵) sẽ bị thay.</p>' +
            '<div class="row"><button class="btn-primary" data-act="saveApply">Nạp bản này</button>' +
            '<button class="btn" data-act="saveCancel">Thôi</button></div>');
    }

    function applyPendingSave() {
        var next = pendingSave;
        if (!next) return;
        // Người chơi tự chọn nạp bản này: ghi đè bản trên máy là đúng ý, kể cả bản của bản game mới hơn (save() bỏ
        // qua phép kiểm khi chuỗi trong storage là chuỗi tab này đã biết).
        saveBlocked = false;
        lastSaved = storageGet(SAVE_KEY) || '';
        replaceState(next);
        toast('Đã nạp bản lưu: ' + num(Core.saveSummary(state).learned) + ' chữ đã học.');
    }

    // Tab khác vừa ghi bản lưu (trang chủ hay Reader khôi phục backup, một tab game khác): nhận bản đó ngay,
    // nếu không thì lần lưu sau của tab này sẽ ghi đè nó bằng state cũ.
    function onStorage(ev) {
        if (ev.key !== SAVE_KEY || !ev.newValue || ev.newValue === lastSaved) return;
        var next = Core.parseSave(ev.newValue, now());
        if (!next) return;
        lastSaved = ev.newValue;
        replaceState(next, true);
        toast('Tiến độ vừa được cập nhật từ trang khác.');
    }

    // ---------- sheet, popover ----------

    // kind: '' panel nơi chốn (nền mờ nhẹ), 'dlg' hội thoại, 'tall' bài học/kiểm tra/sổ.
    function openSheet(kind) {
        closeCard(true);
        var opening = ui.sheet.hidden;
        if (opening) {
            var a = document.activeElement;
            sheetReturn = a && a !== document.body && !ui.sheet.contains(a) && !ui.cardView.contains(a) ? a : null;
        }
        ui.sheet.className = 'sheet' + (kind === 'tall' ? ' tall' : (kind === 'dlg' ? ' dlg' : ''));
        ui.sheet.hidden = false;
        ui.sheetBack.className = 'sheet-backdrop' + (kind === 'tall' ? '' : ' light');
        ui.sheetBack.hidden = false;
        hidePopover();
        renderHint();
        syncCovered();
        // Nội dung vẽ ngay sau lệnh này; người gọi có thể đã đặt focus vào trong (ô gõ). Chưa có thì focus khung.
        if (opening) setTimeout(focusSheet, 0);
    }

    function focusSheet() {
        if (ui.sheet.hidden || ui.sheet.contains(document.activeElement)) return;
        focusEl(ui.sheet);
    }

    function focusEl(el) {
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }

    // Thế giới vẽ thưa hơn khi bài học, bài kiểm tra, Sổ hay thẻ chữ che gần hết màn hình (đỡ tốn pin). Điện thoại
    // (cùng mốc 899 px với CSS): hộp thoại cao phủ gần trọn màn hình dưới lớp mờ, nên thế giới đứng yên ('full'). Máy
    // tính: hộp thoại rộng tối đa 620 px ở giữa, hai bên vẫn thấy đảo, nên chỉ vẽ thưa ('part').
    var PHONE_MQ = window.matchMedia ? window.matchMedia('(max-width: 899px)') : null;
    function syncCovered() {
        if (!world || !world.setCovered) return;
        var on = !!card || (!ui.sheet.hidden && ui.sheet.classList.contains('tall'));
        world.setCovered(on ? (PHONE_MQ && PHONE_MQ.matches ? 'full' : 'part') : false);
    }
    if (PHONE_MQ) {
        if (PHONE_MQ.addEventListener) PHONE_MQ.addEventListener('change', syncCovered);
        else if (PHONE_MQ.addListener) PHONE_MQ.addListener(syncCovered);
    }

    // Tên hộp thoại cho trình đọc màn hình: tên nơi chốn, tên người đang nói, tiêu đề bài học hay thẻ đầu tiên.
    // Chỉ lấy chữ quốc ngữ (bỏ chữ Hán trang trí và dòng phụ).
    function labelSheet() {
        var el = ui.sheet.querySelector('.sheet-title b, .lesson-top b, .sheet-head .who, h2');
        var text = '';
        if (el) {
            for (var n = el.firstChild; n; n = n.nextSibling) {
                if (n.nodeType === 3) text += n.nodeValue;
                else if (n.nodeType === 1 && !n.classList.contains('zh') && n.tagName !== 'SMALL') text += n.textContent;
            }
        }
        ui.sheet.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim() || 'Hộp thoại');
    }

    // Hộp thoại (aria-modal) giữ phím Tab ở bên trong: Tab ở phần tử cuối quay về đầu, Shift+Tab ở đầu sang cuối.
    // Popover chữ mở đè lên thì để trình duyệt tự đi.
    function keepTabInside(ev) {
        if (!ui.pop.hidden) return;
        var box = card ? ui.cardView : (!ui.sheet.hidden ? ui.sheet : null);
        if (!box) return;
        var list = Array.prototype.filter.call(
            box.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
            function (el) { return !el.disabled && el.getClientRects().length > 0; });
        var a = document.activeElement;
        if (!list.length) {
            ev.preventDefault();
            focusEl(box);
            return;
        }
        var first = list[0];
        var last = list[list.length - 1];
        if (ev.shiftKey ? (a === first || a === box || !box.contains(a)) : (a === last || !box.contains(a))) {
            ev.preventDefault();
            focusEl(ev.shiftKey ? last : first);
        }
    }

    function closeSheet() {
        closeCard(true);
        settleQuiz();
        var back = sheetReturn;
        sheetReturn = null;
        ui.sheet.hidden = true;
        ui.sheetBack.hidden = true;
        ui.sheet.innerHTML = '';
        place = null;
        quiz = null;
        dialog = null;
        cooking = null;
        riddle = null;
        paper = null;
        ui.quizInput = null;
        hidePopover();
        syncCovered();
        syncWorld();
        departIfReady();
        // Focus vừa mất theo nội dung hộp thoại: trả về chỗ đã mở hộp thoại (nút Sổ, ô chữ…).
        var a = document.activeElement;
        if (back && back.isConnected && (!a || a === document.body)) focusEl(back);
    }

    function showPopover(ch, hvOverride, target) {
        var e = DECK.byChar[ch];
        if (!e) return;
        var stage = Core.stageOf(state, ch);
        var conf = Core.confuseOf(STORY, ch);
        var pop = ui.pop;
        pop.innerHTML = '<div class="g">' + esc(ch) + '</div>' +
            '<div class="py" style="font-size:1.3em;font-weight:700;color:var(--accent,#b8402c)">' + esc(e.py) + '</div>' +
            '<div class="m" style="font-size:1.05em;font-weight:600;margin:2px 0">' + esc(e.m) + '</div>' +
        '<div style="margin:4px 0"><button class="chip" data-act="speak" data-text="' + esc(ch) + '">🔈 Nghe phát âm</button></div>' +
            '<div class="hv small muted">Hán Việt: ' + esc(hvOverride || e.hv) + '</div>' +
            (e.note ? '<div class="small muted" style="margin-top:4px">Mẹo: ' + esc(e.note) + '</div>' : '') +
            (conf.length ? '<div class="small muted" style="margin-top:4px">Dễ nhầm: ' + esc(conf[0].note) + '</div>' : '') +
            '<div class="st">' + esc(Core.stageLabel(stage)) + (stage ? '' : ' · cuộn ' + (Math.floor(e.idx / DECK.scrollSize) + 1)) + '</div>' +
            '<div class="row" style="margin-top:8px">' +
            (stage ? '<button class="chip" data-act="cardOpen" data-ch="' + esc(ch) + '">Xem thẻ chi tiết</button>' : '') + '</div>';
        pop.hidden = false;
        var r = target.getBoundingClientRect();
        var w = pop.offsetWidth;
        var h = pop.offsetHeight;
        var left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
        var top = r.top - h - 10;
        if (top < 12) top = r.bottom + 10;
        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
    }

    function hidePopover() {
        if (ui.pop) ui.pop.hidden = true;
    }

    // ---------- sự kiện ----------

    function onClick(ev) {
        var t = ev.target;
        var c = t.closest ? t.closest('.zh-line .c, .tile') : null;
        if (c && !t.closest('[data-act="choose"], [data-act="serve"]')) {
            ev.preventDefault();
            // Ô trong lưới chữ đã học mở thẻ đầy đủ; chữ trong câu (lời thoại, câu ví dụ) mở ô tra nhỏ.
            if (c.classList.contains('tile')) openCardFromTile(c);
            else showPopover(c.getAttribute('data-ch'), c.getAttribute('data-hv'), c);
            return;
        }
        var el = t.closest ? t.closest('[data-act]') : null;
        if (!el) {
            if (!t.closest || !t.closest('#pop')) hidePopover();
            return;
        }
        var act = el.getAttribute('data-act');
        switch (act) {
        case 'closePlace': closeSheet(); openPlace(el.getAttribute('data-id')); break;
        case 'closeHub': closeSheet(); openHubScene(); break;
        case 'repair': doRepair(); break;
        case 'decor': doDecor(el.getAttribute('data-id')); break;
        case 'scene': {
            var sc = placeScene(el.getAttribute('data-where'));
            if (sc) openScene(sc);
            break;
        }
        case 'letter':
        case 'page': openManual(el.getAttribute('data-id')); break;
        case 'pay': payStep(); break;
        case 'bookPick': openBookPicker(); break;
        case 'bookCancel': bookPick.open = false; renderBookCard(); break;
        case 'bookUse': useBook(el.getAttribute('data-src'), el.getAttribute('data-id')); break;
        case 'bookOn':
            if (state.book) {
                Core.setBookOn(state, !state.book.on);
                sfx('tap');
                save();
                renderPlace();
            }
            break;
        case 'manageBook': openBookManagerModal(); break;
        case 'uploadTxt': openTxtFilePicker(); break;
        case 'viewBookWords': showBookModal(state.book); break;
        case 'startNextScroll': closeSheet(); startLesson(); break;
        case 'selectSavedBook': {
            var title = el.getAttribute('data-title');
            var books = getCustomBooks();
            for (var i = 0; i < books.length; i++) {
                if (books[i].title === title) {
                    Core.setBook(state, DECK, books[i]);
                    sfx('tap');
                    saveSoon();
                    toast('Đã chọn học theo: ' + title);
                    openBookManagerModal();
                    if (place === 'study') renderBookCard();
                    break;
                }
            }
            break;
        }
        case 'deleteSavedBook': {
            var title = el.getAttribute('data-title');
            var books = getCustomBooks().filter(function(x) { return x.title !== title; });
            saveCustomBooks(books);
            if (state.book && state.book.title === title) {
                Core.clearBook(state);
                saveSoon();
                toast('Đã xóa và gỡ văn bản: ' + title);
            } else {
                toast('Đã xóa văn bản: ' + title);
            }
            openBookManagerModal();
            if (place === 'study') renderBookCard();
            break;
        }
        case 'bookClear':
            Core.clearBook(state);
            sfx('tap');
            saveSoon();
            toast('Đã gỡ văn bản. Cuộn học tiếp theo sẽ theo thứ tự bộ chữ thông dụng.');
            openBookManagerModal();
            if (place === 'study') renderBookCard();
            break;
        case 'speak': speak(el.getAttribute('data-text')); break;
        case 'speakQuiz': speakQuiz(); break;
        case 'speakFish': if (fishing && fishing.q) speak(fishing.q.ch); break;
            sfx('tap');
            save();
            renderPlace();
            break;
        case 'lesson': openLesson(); break;
        case 'lessonPrev': if (quiz && quiz.card > 0) { quiz.card--; renderLessonCard(); sfx('page'); } break;
        case 'lessonNext':
            if (!quiz) break;
            if (quiz.card < quiz.chars.length - 1) { quiz.card++; renderLessonCard(); sfx('page'); }
            else {
                strokeRelease();
                startQuiz('lesson', quiz.chars);
            }
            break;
        case 'review': {
            var due = Core.dueList(state, now()).slice(0, REVIEW_BATCH);
            if (due.length) startQuiz('review', due);
            break;
        }
        case 'reviewLeech': {
            var leeches = Core.leechList(state, 15);
            if (leeches.length) startQuiz('leech', leeches);
            break;
        }
        case 'quizHint': quizHint(); break;
        case 'speakQuiz': speakQuiz(); break;
        case 'quizPick': pickFollow(el.getAttribute('data-ch')); break;
        case 'quizNext': followNext(); break;
        case 'closeSheet': closeSheet(); break;
        case 'cast': startFishing(); break;
        case 'fishHint': fishHint(); break;
        case 'speakFish': if (fishing && fishing.q) speak(fishing.q.ch); break;
        case 'stopFish': endFishing(); break;
        case 'dlgNext': dlgNext(); break;
        case 'dlgVi':
            dialog.vi = !dialog.vi;
            state.settings.vi = dialog.vi;
            saveSoon();
            renderDialog();
            break;
        case 'dlgRuby': dialog.ruby = !dialog.ruby; renderDialog(); break;
        case 'readSkip': readSkip(); break;
        case 'setBookTab': bookModalTab = el.getAttribute('data-tab') || 'unlearned'; showBookModal(state.book); break;
        case 'copyBookVocab': copyBookVocab(); break;
        case 'exportBookVocab': exportBookVocab(); break;
        case 'dlgSpeak': {
            // Lời thoại, cả câu của bước đọc, cả tờ thư, hoặc câu đáp của bước chọn; lời hát đọc chậm.
            var st = stepOf();
            var letterText = st.letter ? (st.letter.lines || []).map(function (x) { return x.zh; }).join('') : '';
            var line = st.zh || (st.read && st.read.line) || (st.charm && st.charm.line) || letterText || (dialog.reply && dialog.reply.zh) || '';
            speak(Core.plainZh(line), st.song ? { rate: -25 } : null);
            break;
        }
        case 'readHint': readHint(); break;
        case 'lantern': onLantern(); renderPlace(); break;
        case 'reveal': revealTap(el.getAttribute('data-zone') || ''); break;
        case 'riddle': openRiddle(el.getAttribute('data-id')); break;
        case 'riddlePick': pickRiddle(el.getAttribute('data-ch')); break;
        case 'riddleVi': if (riddle) { riddle.vi = !riddle.vi; renderRiddle(); } break;
        case 'riddleRuby': if (riddle) { riddle.ruby = !riddle.ruby; renderRiddle(); } break;
        case 'riddleSpeak': {
            var rr = riddle ? Core.riddleById(STORY, riddle.id) : null;
            if (rr) speak(Core.plainZh(rr.zh));
            break;
        }
        case 'closeRiddle': closeSheet(); openPlace('hall'); break;
        case 'paper': openPaper(el.getAttribute('data-id')); break;
        case 'paperPick': pickPaper(Number(el.getAttribute('data-i'))); break;
        case 'paperSpeak': if (paper) speak(Core.pairItem(DECK, PAIRS, paper.id).w); break;
        case 'closePaper': closeSheet(); openPlace('pavilion'); break;
        case 'revealMiss': revealTap(''); break;
        case 'choose': choose(Number(el.getAttribute('data-i'))); break;
        case 'serve': serveItem(el.getAttribute('data-id'), el.getAttribute('data-fid')); break;
        case 'cook': {
            var ord = orderOf(el.getAttribute('data-guest'));
            if (ord) startCook(ord);
            break;
        }
        case 'spot': cookSpot(Number(el.getAttribute('data-i'))); break;
        case 'cookAfterSpot': if (cooking) { cooking.phase = 'pick'; renderCook(); } break;
        case 'cookPick': cookPick(Number(el.getAttribute('data-i'))); break;
        case 'cookUnpick': cookUnpick(Number(el.getAttribute('data-i'))); break;
        case 'cookHint': cookHint(); break;
        case 'cookSpeak': {
            var ck = activeCook();
            if (ck) speak(Core.dishById(STORY, ck.dish).zh);
            break;
        }
        case 'cookBack':
        case 'cookDone':
            closeCook();
            break;
        case 'speak': speak(el.getAttribute('data-text')); break;
        case 'cardOpen': {
            // "Xem thẻ" trong ô tra: thẻ một chữ. Mở từ câu ví dụ của một thẻ khác thì vẫn trả về ô lưới ban đầu.
            var och = el.getAttribute('data-ch');
            if (state.items[och]) openCard([och], 0, 'Thẻ chữ', card ? card.from : null);
            break;
        }
        case 'cardClose': closeCard(); break;
        case 'cardPrev': cardStep(-1); break;
        case 'cardNext': cardStep(1); break;
        case 'strokeToggle': strokeToggle(el); break;
        case 'strokeReplay': strokeReplay(el); break;
        case 'strokeQuiz': strokeQuiz(el); break;
        case 'dictFilter': {
            var f = el.getAttribute('data-f');
            dict.f = dict.f === f ? 'all' : f;
            sfx('tap');
            renderDictBody();
            break;
        }
        case 'dictGroup':
            dict.g = el.getAttribute('data-g');
            sfx('tap');
            renderDictBody();
            break;
        case 'jump': {
            var to = $(el.getAttribute('data-to'));
            if (to && to.scrollIntoView) to.scrollIntoView({ block: 'start', behavior: 'smooth' });
            break;
        }
        case 'toggle': {
            var key = el.getAttribute('data-key');
            state.settings[key] = !state.settings[key];
            el.setAttribute('aria-checked', String(state.settings[key]));
            applySound();
            save();
            break;
        }
        case 'reset': resetProgress(el); break;
        case 'saveExport': exportSaveFile(); break;
        case 'saveCopy': copySaveCode(); break;
        case 'savePaste': openPasteBox(); break;
        case 'savePasteRead': {
            var code = $('saveCode');
            offerSave(code ? code.value.trim() : '', 'Mã vừa dán');
            break;
        }
        case 'saveApply': applyPendingSave(); break;
        case 'saveCancel':
            pendingSave = null;
            saveBox('');
            break;
        default: break;
        }
    }

    function applySound() {
        Sound.setEnabled({ sfx: state.settings.sfx, music: state.settings.music });
        // Chuông gió (tô điểm 'chuong'): nhạc nền thỉnh thoảng có tiếng chuông.
        if (Sound.setChime) Sound.setChime(Core.hasDecor(state, 'chuong'));
        renderStats();
    }

    function onChange(ev) {
        var el = ev.target;
        var key = el.getAttribute && el.getAttribute('data-set');
        if (key === 'ruby') {
            state.settings.ruby = el.value;
            save();
        } else if (key === 'night') {
            nightMode = el.value;
            storageSet(NIGHT_KEY, nightMode);
            refreshNight();
            syncWorld();
        } else if (key === 'saveFile') {
            readSaveFile(el);
        }
    }

    function bind() {
        document.addEventListener('click', onClick);
        document.addEventListener('change', onChange);
        ui.btnSound.addEventListener('click', function () {
            var on = state.settings.sfx || state.settings.music;
            state.settings.sfx = !on;
            state.settings.music = !on;
            applySound();
            save();
        });
        ui.btnBook.addEventListener('click', function () {
            if (!ui.sheet.hidden && place === 'book') closeSheet();
            else if (!quiz && !dialog) {
                if (!ui.sheet.hidden) closeSheet();
                openPlace('book');
            }
        });
        ui.hint.addEventListener('click', function () {
            sfx('tap');
            hintAction();
        });
        ui.sheetBack.addEventListener('click', function () {
            // Bài kiểm tra đang dở thì không đóng khi chạm ra ngoài (dễ chạm nhầm trên điện thoại).
            if (quiz && quiz.phase === 'quiz') return;
            closeSheet();
        });
        ui.cardBack.addEventListener('click', function () { closeCard(); });
        bindAnswerForm(ui.fishInput, submitFishing);
        // Ô tìm chữ đã học: chờ bộ gõ ghép xong chữ (compositionend) rồi mới lọc.
        document.addEventListener('input', function (ev) {
            if (ev.target && ev.target.id === 'dictQ' && !ev.isComposing) setDictQuery(ev.target.value);
        });
        document.addEventListener('compositionend', function (ev) {
            if (ev.target && ev.target.id === 'dictQ') setDictQuery(ev.target.value);
        });
        document.addEventListener('keydown', function (ev) {
            var t = ev.target;
            var typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
            if (ev.key === 'Escape') {
                // Bộ gõ đang ghép chữ (Telex có gạch chân, bàn phím tiếng Trung): Esc chỉ huỷ phần đang ghép.
                if (ev.isComposing || ev.keyCode === 229) return;
                // Esc trong ô tìm đang có chữ: chỉ xoá chữ, không đóng Sổ.
                if (t && t.id === 'dictQ' && t.value) {
                    ev.preventDefault();
                    t.value = '';
                    setDictQuery('');
                } else if (!ui.pop.hidden) hidePopover();
                else if (card) closeCard();
                else if (!ui.sheet.hidden) {
                    // Bài kiểm tra đang dở: Esc không đóng, giống chạm ra nền (dễ bấm nhầm). Đóng bằng nút Đóng.
                    if (!(quiz && quiz.phase === 'quiz')) closeSheet();
                } else if (fishing) endFishing();
            } else if (ev.key === 'Tab') {
                keepTabInside(ev);
            } else if (card && !typing && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
                ev.preventDefault();
                cardStep(ev.key === 'ArrowLeft' ? -1 : 1);
            } else if (quiz && quiz.part === 'pick' && quiz.cur && !card && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey &&
                (/^[1-4]$/.test(ev.key) || (ev.key === 'Enter' && quiz.awaitNext && !(t && t.tagName === 'BUTTON')))) {
                // Câu chọn: phím 1–4 chọn phương án; Enter sang câu kế sau khi chọn sai (nút đang focus thì để nút nhận Enter).
                ev.preventDefault();
                if (ev.key === 'Enter') followNext();
                else pickFollow(quiz.cur.opts[Number(ev.key) - 1]);
            } else if (paper && !card && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey && /^[1-4]$/.test(ev.key)) {
                // Tờ Đối từ: phím 1–4 chọn phương án.
                ev.preventDefault();
                pickPaper(Number(ev.key) - 1);
            } else if (ev.key === 'Enter' && t && t.id === 'dictQ') {
                // Phím Tìm trên bàn phím điện thoại: gập bàn phím để thấy kết quả.
                t.blur();
            }
        });
        // iOS chỉ cho mở âm thanh trong sự kiện được tính là thao tác của người dùng: nhấc tay
        // (pointerup, touchend), click, phím. pointerdown của cú chạm không tính, nên không dùng.
        var UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'];
        var unlock = function () {
            Sound.unlock();
            applySound();
            if (Sound.ready()) {
                UNLOCK_EVENTS.forEach(function (t) { document.removeEventListener(t, unlock, true); });
            }
        };
        UNLOCK_EVENTS.forEach(function (t) { document.addEventListener(t, unlock, true); });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                hiddenAt = now();
                save();
                Sound.suspend();
            } else {
                if (hiddenAt) shiftTimers(now() - hiddenAt);
                hiddenAt = 0;
                Sound.resume();
                tick();
            }
        });
        window.addEventListener('pagehide', function () {
            settleQuiz();
            save();
        });
        window.addEventListener('storage', onStorage);
        setInterval(function () {
            if (!document.hidden) tick();
        }, 30000);
    }

    // Mỗi 30 giây và khi trang hiện lại: cập nhật số chữ đến hạn; qua 18 giờ / 6 giờ thì đổi ngày đêm;
    // sang đêm mới thì lõi chọn khách lạ (refreshNight trong syncWorld). syncWorld chỉ gửi state cho
    // thế giới khi có gì đổi.
    function tick() {
        syncWorld();
    }

    // ---------- khách quen đi dạo ----------

    // Điểm đi gần chỗ ở nhất của từng khách quen, tính một lần từ World.worldActors và World.WAYPOINTS.
    function strollHome(id) {
        if (!strollHomes) {
            strollHomes = {};
            World.worldActors({ guests: { quy: true, nguyet: true, mac: true, ly: true } }).forEach(function (d) {
                if (STROLLERS.indexOf(d.id) < 0) return;
                var best = null, bestD = Infinity;
                World.WAYPOINTS.forEach(function (w) {
                    var dx = w.at[0] - d.at[0], dy = w.at[1] - d.at[1];
                    if (dx * dx + dy * dy < bestD) {
                        bestD = dx * dx + dy * dy;
                        best = w;
                    }
                });
                if (best) strollHomes[d.id] = best;
            });
        }
        return strollHomes[id] || null;
    }

    // Ngẫu nhiên bằng Math.random (không dùng rng có seed) để ?seed=N của câu cá vẫn tất định.
    function scheduleStroll() {
        clearTimeout(strollTimer);
        strollTimer = setTimeout(strollTick, 25000 + Math.floor(Math.random() * 25001));
    }

    // Một khách quen đang hiện đi tới một điểm kề chỗ ở, nghỉ 8–15 giây rồi đi về điểm nhà. Không đi khi
    // có hội thoại, bài học, câu cá, panel hay bếp đang mở. Trả về id khách đi dạo, hoặc null.
    function strollTick() {
        scheduleStroll();
        if (!world || document.hidden || strolling) return null;
        if (dialog || quiz || fishing || place || cooking || riddle || paper) return null;
        var ids = STROLLERS.filter(function (id) { return guestShown(id) && !world.walking(id); });
        if (!ids.length) return null;
        var id = ids[Math.floor(Math.random() * ids.length)];
        var home = strollHome(id);
        var links = home && home.links ? home.links : [];
        if (!links.length) return null;
        var trip = { id: id, home: home.id, to: links[Math.floor(Math.random() * links.length)] };
        strolling = trip;
        var end = function () {
            if (strolling === trip) strolling = null;
        };
        world.walk(id, trip.to).then(function (ok) {
            if (!ok || strolling !== trip) {
                end();
                return;
            }
            setTimeout(function () {
                if (strolling !== trip) return;
                world.walk(id, trip.home).then(end, end);
            }, 8000 + Math.floor(Math.random() * 7001));
        }, end);
        return id;
    }

    // Vùng nhìn thấy thật (trừ bàn phím ảo): sheet bài kiểm tra và thanh câu cá neo theo đây.
    function trackViewport() {
        var vv = window.visualViewport;
        if (!vv) return;
        var root = document.documentElement;
        var apply = function () {
            root.style.setProperty('--vvh', Math.round(vv.height) + 'px');
            root.style.setProperty('--vvt', Math.round(vv.offsetTop) + 'px');
        };
        vv.addEventListener('resize', apply);
        vv.addEventListener('scroll', apply);
        apply();
    }

    function init() {
        trackViewport();
        ui = {
            app: $('app'), stage: $('stage'), sheet: $('sheet'), sheetBack: $('sheetBack'), pop: $('pop'), toast: $('toast'),
            cardView: $('cardView'), cardBack: $('cardBack'),
            statLk: $('statLk'), statCover: $('statCover'), btnSound: $('btnSound'), btnBook: $('btnBook'),
            hint: $('hint'), hintText: $('hintText'),
            fishMeta: $('fishMeta'), fishAsk: $('fishAsk'), askChar: $('askChar'), askMode: $('askMode'),
            fishSize: $('fishSize'), pips: $('pips'), timerBar: $('timerBar'),
            fishbar: $('fishbar'), fishForm: $('fishForm'), fishInput: $('fishInput'), fishFeedback: $('fishFeedback'),
            fishTools: $('fishTools'), fishResult: $('fishResult'),
            qtile: $('qtile'), qchar: $('qchar'), qmode: $('qmode')
        };
        ui.fishSubmit = ui.fishForm.querySelector('button[type="submit"]');
        // Mỗi lần nội dung hộp thoại vẽ lại (đổi cả innerHTML), đặt lại tên hộp thoại theo tiêu đề mới.
        if (window.MutationObserver) new window.MutationObserver(labelSheet).observe(ui.sheet, { childList: true });
        if (params.get('reset') === '1') {
            storageDel(SAVE_KEY);
            dropUrlParams(['reset']);
        }
        lastSaved = storageGet(SAVE_KEY) || '';
        // Bản lưu đọc không được thì loadState trả state mới, và lần lưu kế sẽ ghi đè nó: giữ một bản sao trước.
        // Bản lưu của bản game mới hơn thì không ghi đè (saveBlocked).
        var info = Core.saveInfo(lastSaved);
        var lostSave = info.kind === 'corrupt' || info.kind === 'older';
        if (lostSave) storageSet(SAVE_BAK_KEY, lastSaved);
        if (info.kind === 'newer') saveBlocked = true;
        state = Core.loadState(lastSaved, now());
        if (!state.created) state.created = now();
        var nm = storageGet(NIGHT_KEY);
        if (nm === 'day' || nm === 'night' || nm === 'auto') nightMode = nm;
        forcedNight = sessionGet(FORCE_NIGHT_KEY) === '1';
        refreshNight();
        refreshRam();
        bind();
        renderStats();
        var ws = worldState();
        worldKey = JSON.stringify(ws);
        world = World.create({
            stage: ui.stage,
            state: ws,
            fishTile: ui.qtile,
            walkScale: WALK_SCALE,
            // Tên đọc cho trình đọc màn hình của dấu "!" trên khách (world chỉ biết id).
            markLabel: function (id) {
                var g = guestOf(id);
                return 'Gặp ' + (g && g.name ? g.name : id);
            },
            onPlace: function (id) {
                if (!ui.sheet.hidden) return;
                if (id === 'lantern') {
                    onLantern();
                    return;
                }
                openPlace(id);
            },
            onActor: function (id) {
                if (!ui.sheet.hidden) return;
                onActor(id);
            }
        });
        ui.qtile.hidden = true;
        arriveVisitors(ws.visitors);
        renderMarks();
        maybeAutoScene();
        applyUrlLinks();
        scheduleStroll();
        // Báo sau cùng để toast khác lúc mở trang không che mất.
        if (saveBlocked) blockSaves();
        else if (lostSave) toast('Bản lưu cũ đọc không được nên game bắt đầu lại. Bản cũ vẫn được giữ riêng trong trình duyệt.', 8000);
    }

    // Móc cho kiểm tra tự động (headless): đọc state, mở nơi chốn, trả lời.
    window.QuyVan = {
        state: function () { return state; },
        deck: DECK,
        openPlace: openPlace,
        closeSheet: closeSheet,
        save: save,
        speedFast: SPEED !== 1,
        world: function () { return world; },
        place: function () { return place; },
        fishing: function () { return fishing; },
        quiz: function () { return quiz; },
        dialog: function () { return dialog; },
        cooking: function () { return cooking; },
        orders: function () { return todayOrders(); },
        // Lớp đêm và đi lại (cho kịch bản CDP).
        sceneCtx: sceneCtx,
        placeScene: placeScene,
        isNight: isNight,
        refreshNight: refreshNight,
        syncWorld: syncWorld,
        worldState: worldState,
        strollTick: strollTick,
        strolling: function () { return strolling; },
        leaving: function () { return leaving; },
        arrivals: function () { return arrivals; },
        // Đêm rằm và đố đèn (đợt E).
        ramNow: ramNow,
        ramOpen: ramOpen,
        openRiddle: openRiddle,
        riddle: function () { return riddle; },
        // Đối từ ở Vọng Vân Đình (bước 2 sau review 19/10).
        pairDay: pairDay,
        openPaper: openPaper,
        paper: function () { return paper; },
        // Tra chữ đã học và thẻ chữ đầy đủ.
        dict: function () { return dict; },
        card: function () { return card; },
        // Học theo sách, thư của khách cũ, sách của Như Ngọc (đợt F). bookSources: kết quả lần đọc danh sách sách sau
        // cùng. letters: mọi thư { id, from, state: 'locked' | 'unread' | 'reading' | 'read' }; pages: 6 trang { id, page,
        // state: 'locked' | 'ready' | 'reading' | 'read', cover }.
        book: function () { return state.book || null; },
        bookSources: function () { return bookList; },
        letters: function () {
            return letterList().map(function (x) { return { id: x.id, from: x.from, state: x.state }; });
        },
        pages: function () {
            var c = sceneCtx();
            return pageScenes().map(function (sc) {
                return { id: sc.id, page: sc.page, state: manualState(sc, c), cover: (sc.when && sc.when.cover) || 0 };
            });
        },
        // Cách viết của thẻ chữ: trạng thái, cỡ khung vẽ và ?v= của các tệp tải sau.
        stroke: function () {
            return { open: stroke.open, mode: stroke.mode, ch: stroke.ch, n: stroke.n, done: stroke.done, miss: stroke.miss,
                box: STROKE_BOX, pad: STROKE_PAD, v: ASSET_V };
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
