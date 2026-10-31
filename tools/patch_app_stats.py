# -*- coding: utf-8 -*-
import sys

print("Starting patch_app_stats.py...")

with open('quy-van-app.js', 'r', encoding='utf-8') as f:
    app_code = f.read()

# 1. Update renderStats
old_render_stats = '''    function renderStats(bump) {
        ui.statLk.querySelector('b').textContent = num(state.lk);
        ui.statCover.querySelector('b').textContent = pct(Core.coverage(state, DECK));
        var expEl = document.getElementById('expVal');
        if (expEl) expEl.textContent = num(state.exp || 0);
        var realmEl = document.getElementById('realmBadge');
        if (realmEl && Core.getRealm) {
            var r = Core.getRealm(state.exp || 0);
            realmEl.textContent = r.title;
        }'''

new_render_stats = '''    function renderStats(bump) {
        ui.statLk.querySelector('b').textContent = num(state.lk || 0);
        var learned = Core.countLearned ? Core.countLearned(state, 1) : Object.keys(state.items || {}).length;
        var cover = Core.coverage ? Core.coverage(state, DECK) : 0;
        
        var coverEl = ui.statCover.querySelector('b');
        if (coverEl) {
            coverEl.textContent = learned + ' / 11k';
        }
        ui.statCover.setAttribute('title', 'Đã học: ' + learned + ' / 11,092 từ HSK 9 (' + (learned / 11092 * 100).toFixed(1) + '%). Tần suất xuất hiện văn bản: ' + pct(cover) + '.');
        
        var expEl = document.getElementById('expVal');
        if (expEl) expEl.textContent = num(state.exp || 0);
        var realmEl = document.getElementById('realmBadge');
        if (realmEl && Core.getRealm) {
            var r = Core.getRealm(state);
            realmEl.textContent = r.title;
            realmEl.setAttribute('title', r.name + ' (Cấp ' + r.level + ')');
        }'''

if old_render_stats in app_code:
    app_code = app_code.replace(old_render_stats, new_render_stats, 1)
    print("Successfully replaced renderStats in quy-van-app.js")
else:
    print("WARNING: old_render_stats not found in quy-van-app.js")

# 2. Update addExp
old_add_exp = '''    function addExp(amount, reason) {
        if (!amount || amount <= 0) return;
        state.exp = (state.exp || 0) + amount;
        var oldR = Core.getRealm ? Core.getRealm(state.exp - amount) : { level: 1 };
        var newR = Core.getRealm ? Core.getRealm(state.exp) : { level: 1 };
        if (newR.level > oldR.level) {
            showLevelUpModal(oldR, newR);
            sfx('bell');
        }
        renderStats();
        checkAchievements();
        save();
    }'''

new_add_exp = '''    function addExp(amount, reason) {
        if (!amount || amount <= 0) return;
        var oldR = Core.getRealm ? Core.getRealm(state) : { level: 1 };
        state.exp = (state.exp || 0) + amount;
        var newR = Core.getRealm ? Core.getRealm(state) : { level: 1 };
        if (newR.level > oldR.level) {
            showLevelUpModal(oldR, newR);
            sfx('bell');
        }
        renderStats();
        checkAchievements();
        save();
    }'''

if old_add_exp in app_code:
    app_code = app_code.replace(old_add_exp, new_add_exp, 1)
    print("Successfully replaced addExp in quy-van-app.js")
else:
    print("WARNING: old_add_exp not found in quy-van-app.js")

# 3. Update TIEN_NGHICH_MAIN_QUESTS
old_mqs = '''    var TIEN_NGHICH_MAIN_QUESTS = [
        { id: 'mq_1', chap: 1, title: 'Chương 1: Hằng Nhạc Nhập Môn', reqDesc: 'Học 20 chữ Hán đầu tiên (Quyển 1: Số Mục & Thiên Địa)', req: 20, lk: 50, exp: 80, rewardName: 'Danh hiệu [Hằng Nhạc Tạp Dịch]', btnText: 'Tu Luyện Quyển 1', act: 'openCore100Lesson', actData: '1' },
        { id: 'mq_2', chap: 2, title: 'Chương 2: Thiên Nghịch Thức Tỉnh', reqDesc: 'Rơi xuống sơn động, thức tỉnh Thiên Nghịch Châu (50 chữ)', req: 50, lk: 80, exp: 150, rewardName: 'Pháp Bảo [Thiên Nghịch Châu]', btnText: 'Học 214 Bộ Thủ', act: 'openRadicals' },
        { id: 'mq_3', chap: 3, title: 'Chương 3: Dẫn Lực Phi Kiếm', reqDesc: 'Tu luyện Dẫn Lực Thuật, lên Trảm Yêu Đài ngự kiếm (150 chữ)', req: 150, lk: 120, exp: 250, rewardName: 'Vũ Khí [Hằng Nhạc Phi Kiếm]', btnText: 'Lên Trảm Yêu Đài', act: 'openHunt' },
        { id: 'mq_4', chap: 4, title: 'Chương 4: Vạn Kiếm Quy Tông', reqDesc: 'Lĩnh ngộ họ chữ Hình Thanh, ngưng khí đại thành (350 chữ)', req: 350, lk: 180, exp: 400, rewardName: 'Bảo Vật [Túi Càn Khôn]', btnText: 'Luyện Hình Thanh', act: 'openPhonetic' },
        { id: 'mq_5', chap: 5, title: 'Chương 5: Trúc Cơ Đột Phá', reqDesc: 'Làm chủ Lượng từ trực quan & luyện chế Trúc Cơ Đan (650 chữ)', req: 650, lk: 300, exp: 700, rewardName: 'Chí Bảo [Trúc Cơ Đan]', btnText: 'Học Lượng Từ', act: 'openMeasureWords' },
        { id: 'mq_6', chap: 6, title: 'Chương 6: Huyết Hải Tu Ma', reqDesc: 'Dấn thân Tu Ma Hải, Đại La Âm Trận luyện âm (1,100 chữ)', req: 1100, lk: 500, exp: 1200, rewardName: 'Thần Thông [Định Thân Thuật]', btnText: 'Đại La Âm Trận', act: 'openPinyinMatrix' },
        { id: 'mq_7', chap: 7, title: 'Chương 7: Bách Vạn Hồn Phiên', reqDesc: 'Luyện chế Hồn Phiên, khiêu chiến yêu ma đầu đàn (1,800 chữ)', req: 1800, lk: 800, exp: 2000, rewardName: 'Ma Bảo [Bách Vạn Hồn Phiên]', btnText: 'Khiêu Chiến Boss', act: 'openHunt' },
        { id: 'mq_8', chap: 8, title: 'Chương 8: Lôi Kiếp Cực Cảnh', reqDesc: 'Đấu pháp tốc lôi, dung hợp thiên lôi sinh Cực Cảnh (2,800 chữ)', req: 2800, lk: 1200, exp: 3500, rewardName: 'Sát Chiêu [Cực Cảnh Thần Thức]', btnText: 'Lôi Đình Đấu Pháp', act: 'startFastQuiz' },
        { id: 'mq_9', chap: 9, title: 'Chương 9: Hóa Phàm Ngộ Đạo', reqDesc: 'Hóa Thần Hóa Phàm, ngộ Sinh Tử Ý Cảnh (4,200 chữ)', req: 4200, lk: 2000, exp: 6000, rewardName: 'Pháp Bảo [Khắc Mộc Thần Đao]', btnText: 'Sinh Tử Đạo Văn', act: 'openCore100Lesson', actData: '4' },
        { id: 'mq_10', chap: 10, title: 'Chương 10: Nghịch Chuyển Luân Hồi', reqDesc: 'Đạp Thiên Chí Tôn, cứu sống Lý Mộ Uyển (11,092 từ HSK 9)', req: 11092, lk: 8000, exp: 20000, rewardName: 'Chí Tôn [Đạp Thiên Nghịch Mệnh]', btnText: 'Tàng Kinh Các', act: 'openLibraryPlace' }
    ];'''

new_mqs = '''    var TIEN_NGHICH_MAIN_QUESTS = [
        { id: 'mq_1', chap: 1, title: 'Chương 1: Hằng Nhạc Nhập Môn', reqDesc: 'Học 20 chữ Hán đầu tiên (Quyển 1: Số Mục & Thiên Địa)', req: 20, lk: 50, exp: 50, rewardName: 'Danh hiệu [Hằng Nhạc Tạp Dịch]', btnText: 'Tu Luyện Quyển 1', act: 'openCore100Lesson', actData: '1' },
        { id: 'mq_2', chap: 2, title: 'Chương 2: Thiên Nghịch Thức Tỉnh', reqDesc: 'Rơi xuống sơn động, thức tỉnh Thiên Nghịch Châu (60 chữ)', req: 60, lk: 80, exp: 100, rewardName: 'Pháp Bảo [Thiên Nghịch Châu]', btnText: 'Học 214 Bộ Thủ', act: 'openRadicals' },
        { id: 'mq_3', chap: 3, title: 'Chương 3: Dẫn Lực Phi Kiếm', reqDesc: 'Tu luyện Dẫn Lực Thuật, lên Trảm Yêu Đài ngự kiếm (150 chữ)', req: 150, lk: 120, exp: 200, rewardName: 'Vũ Khí [Hằng Nhạc Phi Kiếm]', btnText: 'Lên Trảm Yêu Đài', act: 'openHunt' },
        { id: 'mq_4', chap: 4, title: 'Chương 4: Vạn Kiếm Quy Tông', reqDesc: 'Lĩnh ngộ họ chữ Hình Thanh, ngưng khí đại thành (300 chữ)', req: 300, lk: 180, exp: 350, rewardName: 'Bảo Vật [Túi Càn Khôn]', btnText: 'Luyện Hình Thanh', act: 'openPhonetic' },
        { id: 'mq_5', chap: 5, title: 'Chương 5: Trúc Cơ Đột Phá', reqDesc: 'Làm chủ Lượng từ trực quan & luyện chế Trúc Cơ Đan (600 chữ)', req: 600, lk: 300, exp: 600, rewardName: 'Chí Bảo [Trúc Cơ Đan]', btnText: 'Học Lượng Từ', act: 'openMeasureWords' },
        { id: 'mq_6', chap: 6, title: 'Chương 6: Huyết Hải Tu Ma', reqDesc: 'Dấn thân Tu Ma Hải, Đại La Âm Trận luyện âm (1,000 chữ)', req: 1000, lk: 500, exp: 1000, rewardName: 'Thần Thông [Định Thân Thuật]', btnText: 'Đại La Âm Trận', act: 'openPinyinMatrix' },
        { id: 'mq_7', chap: 7, title: 'Chương 7: Bách Vạn Hồn Phiên', reqDesc: 'Luyện chế Hồn Phiên, khiêu chiến yêu ma đầu đàn (1,700 chữ)', req: 1700, lk: 800, exp: 1800, rewardName: 'Ma Bảo [Bách Vạn Hồn Phiên]', btnText: 'Khiêu Chiến Boss', act: 'openHunt' },
        { id: 'mq_8', chap: 8, title: 'Chương 8: Lôi Kiếp Cực Cảnh', reqDesc: 'Đấu pháp tốc lôi, dung hợp thiên lôi sinh Cực Cảnh (2,600 chữ)', req: 2600, lk: 1200, exp: 3000, rewardName: 'Sát Chiêu [Cực Cảnh Thần Thức]', btnText: 'Lôi Đình Đấu Pháp', act: 'startFastQuiz' },
        { id: 'mq_9', chap: 9, title: 'Chương 9: Hóa Phàm Ngộ Đạo', reqDesc: 'Hóa Thần Hóa Phàm, ngộ Sinh Tử Ý Cảnh (5,200 chữ)', req: 5200, lk: 2500, exp: 5500, rewardName: 'Pháp Bảo [Khắc Mộc Thần Đao]', btnText: 'Sinh Tử Đạo Văn', act: 'openCore100Lesson', actData: '4' },
        { id: 'mq_10', chap: 10, title: 'Chương 10: Nghịch Chuyển Luân Hồi', reqDesc: 'Đạp Thiên Chí Tôn, cứu sống Lý Mộ Uyển (11,092 từ HSK 9)', req: 11092, lk: 8000, exp: 15000, rewardName: 'Chí Tôn [Đạp Thiên Nghịch Mệnh]', btnText: 'Tàng Kinh Các', act: 'openLibraryPlace' }
    ];'''

if old_mqs in app_code:
    app_code = app_code.replace(old_mqs, new_mqs, 1)
    print("Successfully replaced TIEN_NGHICH_MAIN_QUESTS in quy-van-app.js")
else:
    print("WARNING: old_mqs not found in quy-van-app.js")

# 4. Update openHuntDashboard with realm locks
old_hunt = '''        html += '<h3 style="margin:8px 0 6px 0;font-size:1.05em">👹 Yêu Thú Thử Thách (Săn Quái Rơi Đồ)</h3>' +
            '<div style="display:flex;flex-direction:column;gap:8px">';

        for (var i = 0; i < mobs.length; i++) {
            var m = mobs[i];
            html += '<div class="hunt-card">' +
                '<div class="mob-avatar"><img src="' + esc(m.img) + '" alt="' + esc(m.name) + '"></div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:700;font-size:0.95em">' + esc(m.name) + '</div>' +
                '<div style="display:flex;gap:6px;margin:2px 0">' +
                '<span class="stat-pill" style="color:#b91c1c">Cảnh: ' + esc(m.realm) + '</span>' +
                '<span class="stat-pill" style="color:#16a34a">HP ' + m.hp + '</span>' +
                '<span class="stat-pill" style="color:#2563eb">ATK ' + m.atk + '</span>' +
                '</div>' +
                '<div class="small muted" style="font-size:0.78em">Rơi: ' + esc(m.drop) + ' (+' + m.lk + ' 💎, +' + m.exp + ' ✨)</div>' +
                '</div>' +
                '<button class="btn-primary" data-act="startCombat" data-id="' + esc(m.id) + '" style="font-size:0.82em;padding:6px 12px">Khiêu Chiến</button>' +
                '</div>';
        }
        html += '</div>';

        html += '<h3 style="margin:16px 0 6px 0;font-size:1.05em;color:#b91c1c">👑 Đại Boss Cốt Truyện Vượt Cảnh</h3>' +
            '<div style="display:flex;flex-direction:column;gap:10px">';

        for (var j = 0; j < bosses.length; j++) {
            var b = bosses[j];
            html += '<div class="hunt-card" style="border:2px solid #b91c1c;background:#fff5f5">' +
                '<div class="mob-avatar" style="border-color:#f87171"><img src="' + esc(b.img) + '" alt="' + esc(b.name) + '"></div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:800;font-size:1em;color:#991b1b">' + esc(b.name) + '</div>' +
                '<div class="small muted" style="font-size:0.8em;margin:2px 0">' + esc(b.desc) + '</div>' +
                '<div style="font-size:0.78em;font-weight:700;color:#dc2626">Thưởng: ' + esc(b.reward) + ' (+' + b.lk + ' 💎, +' + b.exp + ' ✨)</div>' +
                '</div>' +
                '<button class="btn-primary" data-act="startBossCombat" data-id="' + esc(b.id) + '" style="background:#dc2626;border-color:#b91c1c;font-size:0.82em;padding:6px 12px">Đại Chiến</button>' +
                '</div>';
        }'''

new_hunt = '''        var curR = Core.getRealm ? Core.getRealm(state) : { level: 1 };
        html += '<h3 style="margin:8px 0 6px 0;font-size:1.05em">👹 Yêu Thú Thử Thách (Săn Quái Rơi Đồ)</h3>' +
            '<div style="display:flex;flex-direction:column;gap:8px">';

        for (var i = 0; i < mobs.length; i++) {
            var m = mobs[i];
            var isMobUnlocked = curR.level >= (m.reqLevel || 1);
            html += '<div class="hunt-card' + (isMobUnlocked ? '' : ' locked') + '">' +
                '<div class="mob-avatar"><img src="' + esc(m.img) + '" alt="' + esc(m.name) + '"></div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:700;font-size:0.95em">' + esc(m.name) + '</div>' +
                '<div style="display:flex;gap:6px;margin:2px 0">' +
                '<span class="stat-pill" style="color:#b91c1c">Cảnh: ' + esc(m.realm) + '</span>' +
                '<span class="stat-pill" style="color:#16a34a">HP ' + m.hp + '</span>' +
                '<span class="stat-pill" style="color:#2563eb">ATK ' + m.atk + '</span>' +
                '</div>' +
                '<div class="small muted" style="font-size:0.78em">Rơi: ' + esc(m.drop) + ' (+' + m.lk + ' 💎, +' + m.exp + ' ✨)</div>' +
                '</div>' +
                (isMobUnlocked ? '<button class="btn-primary" data-act="startCombat" data-id="' + esc(m.id) + '" style="font-size:0.82em;padding:6px 12px">Khiêu Chiến</button>'
                    : '<button class="btn" disabled style="font-size:0.75em;padding:5px 8px;opacity:0.6;cursor:not-allowed">Cần Cảnh Cấp ' + (m.reqLevel || 1) + '</button>') +
                '</div>';
        }
        html += '</div>';

        html += '<h3 style="margin:16px 0 6px 0;font-size:1.05em;color:#b91c1c">👑 Đại Boss Cốt Truyện Vượt Cảnh</h3>' +
            '<div style="display:flex;flex-direction:column;gap:10px">';

        for (var j = 0; j < bosses.length; j++) {
            var b = bosses[j];
            var isBossUnlocked = curR.level >= (b.reqLevel || 1);
            html += '<div class="hunt-card" style="border:2px solid #b91c1c;background:' + (isBossUnlocked ? '#fff5f5' : '#f8fafc') + '">' +
                '<div class="mob-avatar" style="border-color:#f87171"><img src="' + esc(b.img) + '" alt="' + esc(b.name) + '"></div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:800;font-size:1em;color:#991b1b">' + esc(b.name) + '</div>' +
                '<div class="small muted" style="font-size:0.8em;margin:2px 0">' + esc(b.desc) + '</div>' +
                '<div style="font-size:0.78em;font-weight:700;color:#dc2626">Thưởng: ' + esc(b.reward) + ' (+' + b.lk + ' 💎, +' + b.exp + ' ✨)</div>' +
                '</div>' +
                (isBossUnlocked ? '<button class="btn-primary" data-act="startBossCombat" data-id="' + esc(b.id) + '" style="background:#dc2626;border-color:#b91c1c;font-size:0.82em;padding:6px 12px">Đại Chiến</button>'
                    : '<button class="btn" disabled style="background:#64748b;border-color:#475569;color:#fff;font-size:0.75em;padding:5px 8px;cursor:not-allowed">Cần Cảnh Cấp ' + (b.reqLevel || 1) + '</button>') +
                '</div>';
        }'''

if old_hunt in app_code:
    app_code = app_code.replace(old_hunt, new_hunt, 1)
    print("Successfully replaced openHuntDashboard in quy-van-app.js")
else:
    print("WARNING: old_hunt not found in quy-van-app.js")

# 5. Update openRealmDashboard
realm_dash_start = app_code.find('    function openRealmDashboard() {')
realm_dash_end = app_code.find('    function openHanziBlueprint() {')

if realm_dash_start != -1 and realm_dash_end != -1:
    new_realm_dash = '''    function openRealmDashboard() {
        place = 'realm';
        updateBottomNavActive('realm');
        checkAchievements();
        var r = Core.getRealm ? Core.getRealm(state) : { level: 1, name: 'Phàm Nhân Tạp Dịch', title: 'Tạp Dịch', icon: '🪵', minWords: 0, maxWords: 20, minExp: 0, maxExp: 100 };
        var learnedCount = Core.countLearned ? Core.countLearned(state, 1) : Object.keys(state.items || {}).length;
        var cover = Core.coverage ? Core.coverage(state, DECK) : 0;
        var nextRealm = (Core.REALMS && Core.REALMS[r.level]) || null;
        var curExp = state.exp || 0;
        var stats = Core.calcCombatStats ? Core.calcCombatStats(state) : { cp: 100, hp: 200, atk: 30, def: 10, mind: 10 };
        var totalPct = ((learnedCount / 11092) * 100).toFixed(2);
        var corpusPct = pct(cover);

        var html = '<div class="sheet-title"><span class="zh">修</span><b>Tu Vi & Cảnh Giới Tiên Nghịch</b>' +
            '<button class="btn-ghost close" data-act="closeSheet">Đóng</button></div>' +
            '<div class="card" style="text-align:center;padding:16px 14px;background:linear-gradient(135deg,#fcf8ec,#f5e9cb);border:2px solid var(--line);border-radius:16px;margin-bottom:12px">' +
            '<div style="font-size:3.5em;margin-bottom:4px">' + r.icon + '</div>' +
            '<div style="font-size:0.8em;font-weight:700;color:var(--ink-2)">CẢNH GIỚI HIỆN TẠI (15 CẢNH GIỚI HSK 9)</div>' +
            '<h2 style="font-size:1.6em;color:var(--red-2);margin:4px 0">' + esc(r.name) + '</h2>' +
            '<div style="display:inline-block;background:var(--red-2);color:#fff;font-weight:700;padding:2px 10px;border-radius:10px;font-size:0.8em;margin-bottom:8px">Cấp ' + r.level + ' · ' + esc(r.title) + '</div>' +
            '<p class="small muted" style="margin:4px auto;max-width:380px">' + esc(r.desc) + '</p>';

        if (nextRealm) {
            var wordProgressPct = Math.min(100, Math.round((learnedCount / nextRealm.minWords) * 100));
            var expProgressPct = Math.min(100, Math.round((curExp / nextRealm.minExp) * 100));
            var canBreakthrough = learnedCount >= nextRealm.minWords && curExp >= nextRealm.minExp;

            html += '<div style="background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:12px;margin-top:10px;text-align:left">' +
                '<div style="font-weight:700;font-size:0.9em;color:#b45309;margin-bottom:6px">⚡ Điều Kiện Đột Phá: ' + esc(nextRealm.name) + ' (Cấp ' + nextRealm.level + ')</div>' +
                '<div style="font-size:0.82em;display:flex;justify-content:space-between;margin-bottom:2px">' +
                '<span>📖 Chữ Hán cần nắm: <b>' + learnedCount + ' / ' + nextRealm.minWords + '</b></span>' +
                '<span style="font-weight:700;color:' + (learnedCount >= nextRealm.minWords ? 'var(--jade)' : '#dc2626') + '">' + (learnedCount >= nextRealm.minWords ? '✓ Đạt' : 'Thiếu ' + (nextRealm.minWords - learnedCount) + ' chữ') + '</span>' +
                '</div>' +
                '<div style="height:7px;background:rgba(0,0,0,0.08);border-radius:4px;overflow:hidden;margin-bottom:8px">' +
                '<div style="height:100%;width:' + wordProgressPct + '%;background:' + (learnedCount >= nextRealm.minWords ? 'var(--jade)' : '#d97706') + '"></div>' +
                '</div>' +
                '<div style="font-size:0.82em;display:flex;justify-content:space-between;margin-bottom:2px">' +
                '<span>✨ Điểm Tu Vi: <b>' + curExp + ' / ' + nextRealm.minExp + '</b></span>' +
                '<span style="font-weight:700;color:' + (curExp >= nextRealm.minExp ? 'var(--jade)' : '#dc2626') + '">' + (curExp >= nextRealm.minExp ? '✓ Đạt' : 'Thiếu ' + (nextRealm.minExp - curExp) + ' EXP') + '</span>' +
                '</div>' +
                '<div style="height:7px;background:rgba(0,0,0,0.08);border-radius:4px;overflow:hidden">' +
                '<div style="height:100%;width:' + expProgressPct + '%;background:' + (curExp >= nextRealm.minExp ? 'var(--jade)' : '#2563eb') + '"></div>' +
                '</div>';

            if (canBreakthrough) {
                html += '<div style="margin-top:10px;text-align:center"><button class="btn-primary" data-act="breakthroughRealm" style="background:#16a34a;border-color:#15803d;padding:8px 18px;font-weight:800">⚡ ĐỘT PHÁ CẢNH GIỚI!</button></div>';
            } else if (learnedCount < nextRealm.minWords) {
                html += '<div class="small muted" style="margin-top:6px;color:#dc2626">⚠️ Gặp bình cảnh tâm cảnh! Cần học thêm <b>' + (nextRealm.minWords - learnedCount) + ' chữ Hán</b> để mở thông kinh mạch.</div>';
            }
            html += '</div>';
        } else {
            html += '<div style="background:rgba(22,163,74,0.1);border:1px dashed #16a34a;border-radius:10px;padding:10px;margin-top:10px">' +
                '<b style="color:#16a34a">👑 Tuyệt Đỉnh Phong Thần: Đã chinh phục trọn vẹn 11,092 từ HSK 9!</b></div>';
        }
        html += '</div>';

        // Bảng thống kê tiến độ học và độ phủ văn bản rõ ràng
        html += '<div class="card" style="background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:12px;margin-bottom:12px">' +
            '<h3 style="margin:0 0 8px 0;font-size:1em;color:var(--ink)">📊 Thống Kê Tiến Độ Học & Độ Phủ Văn Bản</h3>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
            '<div class="hunt-card" style="margin:0;padding:10px;text-align:center">' +
            '<div style="font-size:1.4em;font-weight:900;color:var(--red-2)">' + learnedCount + ' <span style="font-size:0.6em;color:#666">/ 11,092</span></div>' +
            '<div class="small" style="font-weight:700;color:var(--ink)">Tiến độ từ vựng (' + totalPct + '%)</div>' +
            '<div class="small muted" style="font-size:0.72em">Mục tiêu tối thượng HSK 9</div>' +
            '</div>' +
            '<div class="hunt-card" style="margin:0;padding:10px;text-align:center">' +
            '<div style="font-size:1.4em;font-weight:900;color:#2563eb">' + corpusPct + '</div>' +
            '<div class="small" style="font-weight:700;color:var(--ink)">Độ phủ tần suất văn bản</div>' +
            '<div class="small muted" style="font-size:0.72em">Tần suất xuất hiện trong sách truyện</div>' +
            '</div>' +
            '</div>' +
            '<div class="small muted" style="font-size:0.78em;background:#f8fafc;padding:8px;border-radius:8px;line-height:1.5">' +
            '💡 <b>Giải thích chỉ số:</b> Nhờ định luật Zipf trong ngôn ngữ, chỉ cần học các chữ thông dụng nhất đã có thể bao phủ tới ' + corpusPct + ' tần suất xuất hiện trong tiểu thuyết. Tuy nhiên, toàn bộ đại đạo tu tiên yêu cầu nắm vững trọn vẹn 11,092 từ để đạt đến Đạp Thiên Cảnh!' +
            '</div>' +
            '</div>';

        // Bảng thuộc tính chiến đấu
        html += '<div class="card" style="background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:12px;margin-bottom:12px">' +
            '<h3 style="margin:0 0 8px 0;font-size:1em;color:var(--ink)">⚔️ Thuộc Tính Tác Chiến Trảm Yêu</h3>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
            '<div class="hunt-card" style="margin:0;padding:8px">' +
            '<div><b>Lực Chiến:</b> <span style="color:#d97706;font-weight:800">' + stats.cp + '</span></div>' +
            '</div>' +
            '<div class="hunt-card" style="margin:0;padding:8px">' +
            '<div><b>Công Kích:</b> <span style="color:#2563eb;font-weight:800">' + stats.atk + '</span></div>' +
            '</div>' +
            '<div class="hunt-card" style="margin:0;padding:8px">' +
            '<div><b>Khí Huyết:</b> <span style="color:#16a34a;font-weight:800">' + stats.hp + '</span></div>' +
            '</div>' +
            '<div class="hunt-card" style="margin:0;padding:8px">' +
            '<div><b>Thần Thức:</b> <span style="color:#9333ea;font-weight:800">' + stats.mind + '</span></div>' +
            '</div>' +
            '</div></div>';

        // Nút mở kho báu pháp bảo
        html += '<button class="btn btn-block" data-act="openTreasures" style="padding:10px;font-weight:700;margin-bottom:12px;color:#b45309">🔮 Xem 12 Pháp Bảo Tiên Nghịch Thức Tỉnh</button>';

        // Nút nhập truyện .txt
        html += '<button class="btn-primary btn-block" data-act="manageBook" style="padding:10px;font-size:0.95em">📄 Quản Lý & Nhập File Truyện (.txt)</button>';

        ui.sheet.innerHTML = html;
        openSheet('tall');
    }\n\n'''

    app_code = app_code[:realm_dash_start] + new_realm_dash + app_code[realm_dash_end:]
    print("Successfully replaced openRealmDashboard in quy-van-app.js")
else:
    print("WARNING: openRealmDashboard bounds not found in quy-van-app.js")

# 6. Update claimMainQuest and init exp clamp
old_claim_mq = '''        case 'claimMainQuest': {
            var mqId = el.getAttribute('data-id');
            var mq = null;
            for (var mqI = 0; mqI < TIEN_NGHICH_MAIN_QUESTS.length; mqI++) {
                if (TIEN_NGHICH_MAIN_QUESTS[mqI].id === mqId) { mq = TIEN_NGHICH_MAIN_QUESTS[mqI]; break; }
            }
            if (mq && !state.claimedMainQuests[mqId]) {
                state.claimedMainQuests[mqId] = true;
                state.lk += mq.lk;
                addExp(mq.exp, 'Chính tuyến: ' + mq.title);
                sfx('bell');
                toast('🎉 Hoàn thành ' + mq.title + '! +' + mq.lk + ' 💎, +' + mq.exp + ' ✨', 4000);
                openQuestDashboard();
            }
            break;
        }'''

new_claim_mq = '''        case 'claimMainQuest': {
            var mqId = el.getAttribute('data-id');
            var mq = null;
            for (var mqI = 0; mqI < TIEN_NGHICH_MAIN_QUESTS.length; mqI++) {
                if (TIEN_NGHICH_MAIN_QUESTS[mqI].id === mqId) { mq = TIEN_NGHICH_MAIN_QUESTS[mqI]; break; }
            }
            var learnedCount = Core.countLearned ? Core.countLearned(state, 1) : Object.keys(state.items || {}).length;
            if (mq && learnedCount < mq.req) {
                toast('Chưa đạt yêu cầu! Cần học đủ ' + mq.req + ' chữ Hán để hoàn thành.');
                break;
            }
            if (mq && !state.claimedMainQuests[mqId]) {
                state.claimedMainQuests[mqId] = true;
                state.lk += mq.lk;
                addExp(mq.exp, 'Chính tuyến: ' + mq.title);
                sfx('bell');
                toast('🎉 Hoàn thành ' + mq.title + '! +' + mq.lk + ' 💎, +' + mq.exp + ' ✨', 4000);
                openQuestDashboard();
            }
            break;
        }
        case 'breakthroughRealm': {
            var curR = Core.getRealm ? Core.getRealm(state) : { level: 1 };
            var nextR = (Core.REALMS && Core.REALMS[curR.level]) || null;
            if (nextR) {
                showLevelUpModal(curR, nextR);
                sfx('bell');
                openRealmDashboard();
            }
            break;
        }'''

if old_claim_mq in app_code:
    app_code = app_code.replace(old_claim_mq, new_claim_mq, 1)
    print("Successfully replaced claimMainQuest in quy-van-app.js")
else:
    print("WARNING: old_claim_mq not found in quy-van-app.js")

# 7. Clamp existing state.exp if learned words < 20
old_init_tail = "        renderStats();\n        var ws = worldState();"
new_init_tail = """        // Kiểm tra và ổn định chỉ số EXP nếu từ save cũ bị lệch so với số từ đã học
        var initLearned = Core.countLearned ? Core.countLearned(state, 1) : Object.keys(state.items || {}).length;
        if (initLearned < 20 && (state.exp || 0) > 100) {
            state.exp = Math.min(state.exp, 90);
            save();
        }
        renderStats();
        var ws = worldState();"""

if old_init_tail in app_code:
    app_code = app_code.replace(old_init_tail, new_init_tail, 1)
    print("Successfully added exp clamp to init in quy-van-app.js")
else:
    print("WARNING: old_init_tail not found in quy-van-app.js")

# Also check startCombat to prevent fighting over-level targets
old_start_combat = '''    function startCombat(id, isBoss) {
        var list = isBoss ? (Core.BOSSES || []) : (Core.MOBS || []);
        var target = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) { target = list[i]; break; }
        }
        if (!target) return;'''

new_start_combat = '''    function startCombat(id, isBoss) {
        var list = isBoss ? (Core.BOSSES || []) : (Core.MOBS || []);
        var target = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) { target = list[i]; break; }
        }
        if (!target) return;

        var curRealm = Core.getRealm ? Core.getRealm(state) : { level: 1 };
        if (target.reqLevel && curRealm.level < target.reqLevel) {
            toast('⚠️ Cảnh giới chưa đủ! Cần đạt Cấp ' + target.reqLevel + ' mới có thể khiêu chiến ' + target.name + '.');
            return;
        }'''

if old_start_combat in app_code:
    app_code = app_code.replace(old_start_combat, new_start_combat, 1)
    print("Successfully added realm requirement check to startCombat in quy-van-app.js")
else:
    print("WARNING: old_start_combat not found in quy-van-app.js")

with open('quy-van-app.js', 'w', encoding='utf-8') as f:
    f.write(app_code)

print("Done with patch_app_stats.py!")
