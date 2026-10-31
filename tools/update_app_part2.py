# -*- coding: utf-8 -*-
import sys

def update():
    with open('quy-van-app.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update ensureDailyQuests list & recordQuestProgress
    old_quests_block = """        if (!st.dailyQuests || st.dailyQuests.day !== today) {
            st.dailyQuests = {
                day: today,
                claimed: false,
                list: [
                    {
                        id: 'scroll',
                        title: 'Khởi Tâm Mở Cuộn',
                        desc: 'Mở 1 cuộn chữ mới (học 5 chữ Hán + Pinyin + cụm từ)',
                        target: 1,
                        cur: 0,
                        lk: 20,
                        exp: 25,
                        act: 'lesson',
                        btnText: 'Mở Cuộn Học Ngay'
                    },
                    {
                        id: 'review',
                        title: 'Ôn Cố Tri Tân',
                        desc: 'Ôn tập thẻ chữ đến hạn theo lịch lặp lại ngắt quãng (SRS)',
                        target: 10,
                        cur: 0,
                        lk: 25,
                        exp: 30,
                        act: 'openQuizFromQuest',
                        btnText: 'Ôn Bài Ngay'
                    },
                    {
                        id: 'game',
                        title: 'Đấu Pháp Ngữ Cảnh',
                        desc: 'Hoàn thành 1 lượt (5 câu) Ghép từ hoặc Đố ngữ cảnh',
                        target: 1,
                        cur: 0,
                        lk: 25,
                        exp: 30,
                        act: 'openCompoundGame',
                        btnText: 'Chơi Ghép Từ Ngay'
                    },
                    {
                        id: 'event',
                        title: 'Kỳ Ngộ & Trùng Tu',
                        desc: 'Gặp 1 vị khách đến quán, giải câu đố hoặc sửa chữa công trình',
                        target: 1,
                        cur: 0,
                        lk: 30,
                        exp: 35,
                        act: 'doEventQuest',
                        btnText: 'Thực Hiện Ngay'
                    }
                ]
            };
        }
        return st.dailyQuests;
    }

    function recordQuestProgress(id, amt) {
        if (!state.dailyQuests || !state.dailyQuests.list) ensureDailyQuests(state, now());
        var q = null;
        for (var i = 0; i < state.dailyQuests.list.length; i++) {
            if (state.dailyQuests.list[i].id === id) {
                q = state.dailyQuests.list[i];
                break;
            }
        }
        if (!q) return;
        var prevCur = q.cur;
        q.cur = Math.min(q.target, q.cur + (amt || 1));
        if (q.cur >= q.target && prevCur < q.target) {
            state.lk += q.lk;
            addExp(q.exp, 'Nhiệm vụ: ' + q.title);
            sfx('perfect');
            toast('🎉 Hoàn thành nhiệm vụ: ' + q.title + ' (+' + q.lk + ' 灵, +' + q.exp + ' Tu vi)!', 4000);
        }
        checkAchievements();
        save();
    }"""

    new_quests_block = """        if (!st.dailyQuests || st.dailyQuests.day !== today) {
            st.dailyQuests = {
                day: today,
                claimed: false,
                list: [
                    {
                        id: 'scroll',
                        title: 'Khởi Tâm Mở Cuộn',
                        desc: 'Mở 1 cuộn chữ mới (học 5 chữ Hán + Pinyin + cụm từ)',
                        target: 1,
                        cur: 0,
                        claimed: false,
                        lk: 20,
                        exp: 25,
                        act: 'startNextScroll',
                        btnText: 'Mở Cuộn Học'
                    },
                    {
                        id: 'review',
                        title: 'Ôn Cố Tri Tân',
                        desc: 'Ôn tập thẻ chữ đến hạn theo lịch lặp lại ngắt quãng (SRS)',
                        target: 10,
                        cur: 0,
                        claimed: false,
                        lk: 25,
                        exp: 30,
                        act: 'openQuizFromQuest',
                        btnText: 'Ôn Bài Ngay'
                    },
                    {
                        id: 'hunt',
                        title: 'Trảm Yêu Lịch Luyện',
                        desc: 'Lên Trảm Yêu Đài đánh bại 1 yêu quái rèn luyện kiếm quyết',
                        target: 1,
                        cur: 0,
                        claimed: false,
                        lk: 25,
                        exp: 30,
                        act: 'openHunt',
                        btnText: 'Lên Trảm Yêu Đài'
                    },
                    {
                        id: 'hz_tool',
                        title: 'Thiên Địa Đạo Văn',
                        desc: 'Khám phá 1 bài trong Bách Tự, Bộ Thủ hoặc Lượng Từ của HanziGuru',
                        target: 1,
                        cur: 0,
                        claimed: false,
                        lk: 25,
                        exp: 30,
                        act: 'openPractice',
                        btnText: 'Vào Tu Luyện'
                    },
                    {
                        id: 'fast_quiz',
                        title: 'Lôi Đình Đấu Pháp',
                        desc: 'Tham gia 1 trận đấu tốc lôi 60 giây để thử thách phản xạ chữ',
                        target: 1,
                        cur: 0,
                        claimed: false,
                        lk: 30,
                        exp: 35,
                        act: 'startFastQuiz',
                        btnText: 'Đấu Pháp Tốc Lôi'
                    }
                ]
            };
        }
        return st.dailyQuests;
    }

    function recordQuestProgress(id, amt) {
        if (!state.dailyQuests || !state.dailyQuests.list) ensureDailyQuests(state, now());
        var q = null;
        for (var i = 0; i < state.dailyQuests.list.length; i++) {
            if (state.dailyQuests.list[i].id === id) {
                q = state.dailyQuests.list[i];
                break;
            }
        }
        if (!q) return;
        var prevCur = q.cur;
        q.cur = Math.min(q.target, q.cur + (amt || 1));
        if (q.cur >= q.target && prevCur < q.target) {
            sfx('perfect');
            toast('🎯 Đã hoàn thành nhiệm vụ: ' + q.title + '! Hãy vào mục Nhiệm Vụ nhận thưởng.', 4000);
        }
        checkAchievements();
        save();
        updateQuestBadge();
    }"""

    if old_quests_block in content:
        content = content.replace(old_quests_block, new_quests_block)
        print("Updated daily quests block")
    else:
        print("WARN: old_quests_block not found")

    # 2. Update TIEN_NGHICH_MAIN_QUESTS
    old_main_quests = """    var TIEN_NGHICH_MAIN_QUESTS = [
        { id: 'mq_1', chap: 1, title: 'Chương 1: Hằng Nhạc Nhập Môn', reqDesc: 'Học 10 chữ Hán đầu tiên tại Hằng Nhạc Phái', req: 10, lk: 30, exp: 50, rewardName: 'Danh hiệu [Hằng Nhạc Tạp Dịch]' },
        { id: 'mq_2', chap: 2, title: 'Chương 2: Thiên Nghịch Thức Tỉnh', reqDesc: 'Rơi xuống sơn động, thức tỉnh Thiên Nghịch Châu (50 chữ)', req: 50, lk: 50, exp: 100, rewardName: 'Pháp Bảo [Thiên Nghịch Châu]' },
        { id: 'mq_3', chap: 3, title: 'Chương 3: Dẫn Lực Phi Kiếm', reqDesc: 'Tu luyện Dẫn Lực Thuật, ngự kiếm phi hành (150 chữ)', req: 150, lk: 80, exp: 180, rewardName: 'Vũ Khí [Hằng Nhạc Phi Kiếm]' },
        { id: 'mq_4', chap: 4, title: 'Chương 4: Phong Vân Tông Môn', reqDesc: 'Đạt Ngưng Khí Đỉnh Phong, đoạt Càn Khôn Túi (350 chữ)', req: 350, lk: 120, exp: 300, rewardName: 'Bảo Vật [Túi Càn Khôn]' },
        { id: 'mq_5', chap: 5, title: 'Chương 5: Trúc Cơ Đột Phá', reqDesc: 'Xung kích Trúc Cơ thành công, đan điền hóa dịch (650 chữ)', req: 650, lk: 200, exp: 500, rewardName: 'Chí Bảo [Trúc Cơ Đan]' },
        { id: 'mq_6', chap: 6, title: 'Chương 6: Huyết Hải Tu Ma', reqDesc: 'Dấn thân Tu Ma Hải, lĩnh ngộ Định Thân Thuật (1,100 chữ)', req: 1100, lk: 300, exp: 800, rewardName: 'Thần Thông [Định Thân Thuật]' },
        { id: 'mq_7', chap: 7, title: 'Chương 7: Bách Vạn Hồn Phiên', reqDesc: 'Luyện chế Hồn Phiên, thu thập vạn ma oán hồn (1,800 chữ)', req: 1800, lk: 500, exp: 1200, rewardName: 'Ma Bảo [Bách Vạn Hồn Phiên]' },
        { id: 'mq_8', chap: 8, title: 'Chương 8: Lôi Kiếp Cực Cảnh', reqDesc: 'Dung hợp thiên lôi, sinh ra Cực Cảnh vô địch (2,800 chữ)', req: 2800, lk: 800, exp: 1800, rewardName: 'Sát Chiêu [Cực Cảnh Thần Thức]' },
        { id: 'mq_9', chap: 9, title: 'Chương 9: Hóa Phàm Ngộ Đạo', reqDesc: 'Hóa Thần Hóa Phàm, ngộ Sinh Tử Ý Cảnh (4,200 chữ)', req: 4200, lk: 1200, exp: 2800, rewardName: 'Pháp Bảo [Khắc Mộc Thần Đao]' },
        { id: 'mq_10', chap: 10, title: 'Chương 10: Nghịch Chuyển Luân Hồi', reqDesc: 'Đạp Thiên Chí Tôn, cứu sống Lý Mộ Uyển (11,092 từ HSK 9)', req: 11092, lk: 5000, exp: 10000, rewardName: 'Chí Tôn [Đạp Thiên Nghịch Mệnh]' }
    ];"""

    new_main_quests = """    var TIEN_NGHICH_MAIN_QUESTS = [
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
    ];"""

    if old_main_quests in content:
        content = content.replace(old_main_quests, new_main_quests)
        print("Updated TIEN_NGHICH_MAIN_QUESTS")
    else:
        print("WARN: old_main_quests not found")

    # 3. Update openQuestDashboard buttons (both main and daily)
    old_main_action = """                    <div>
                    (isClaimed ? '<span style="font-size:0.8em;color:var(--jade);font-weight:700">✓ Đã nhận</span>'
                        : (isCompleted ? '<button class="btn-primary" data-act="claimMainQuest" data-id="' + esc(mq.id) + '" style="font-size:0.8em;padding:6px 12px;background:#d97706;border-color:#b45309">Nhận Thưởng</button>'
                            : '<span style="font-size:0.75em;color:#94a3b8;font-weight:700">Chưa xong</span>')) +
                    '</div></div>';"""

    new_main_action = """                    <div>
                    (isClaimed ? '<span style="font-size:0.8em;color:var(--jade);font-weight:700">✓ Đã nhận</span>'
                        : (isCompleted ? '<button class="btn-primary" data-act="claimMainQuest" data-id="' + esc(mq.id) + '" style="font-size:0.8em;padding:6px 12px;background:#d97706;border-color:#b45309;font-weight:700">Nhận Thưởng</button>'
                            : '<button class="btn-primary" data-act="' + esc(mq.act) + '"' + (mq.actData ? ' data-vol="' + esc(mq.actData) + '"' : '') + ' style="font-size:0.8em;padding:5px 12px">' + esc(mq.btnText) + '</button>')) +
                    '</div></div>';"""

    if old_main_action in content:
        content = content.replace(old_main_action, new_main_action)
        print("Updated main quest action button")
    else:
        print("WARN: old_main_action not found")

    old_daily_action = """                    <div>
                    (isDone ? '<button class="btn" disabled style="opacity:0.6;font-size:0.8em;padding:5px 10px">✓ Xong</button>'
                        : '<button class="btn-primary" data-act="' + esc(q.act) + '" style="font-size:0.8em;padding:5px 10px">' + esc(q.btnText) + '</button>') +
                    '</div></div>';"""

    new_daily_action = """                    <div>
                    (isDone ? (q.claimed ? '<button class="btn" disabled style="opacity:0.6;font-size:0.8em;padding:5px 10px">✓ Đã nhận</button>'
                                          : '<button class="btn-primary" data-act="claimDailyQuest" data-idx="' + k + '" style="font-size:0.8em;padding:5px 12px;background:#16a34a;border-color:#15803d;font-weight:700">Nhận Thưởng</button>')
                            : '<button class="btn-primary" data-act="' + esc(q.act) + '" style="font-size:0.8em;padding:5px 10px">' + esc(q.btnText) + '</button>') +
                    '</div></div>';"""

    if old_daily_action in content:
        content = content.replace(old_daily_action, new_daily_action)
        print("Updated daily quest action button")
    else:
        print("WARN: old_daily_action not found")

    # 4. Add claimDailyQuest, claimDailyChest, openPracticeHub, openPondDashboard, openAlchemyDashboard, openGateDashboard
    insert_marker = "// =========================================================================\r\n    // 2. TRẢM YÊU DASHBOARD & MINI-GAME CHIẾN ĐẤU"
    if insert_marker not in content:
        insert_marker = "// =========================================================================\n    // 2. TRẢM YÊU DASHBOARD & MINI-GAME CHIẾN ĐẤU"

    new_helpers = """    function claimDailyQuest(idx) {
        idx = Number(idx);
        if (!state.dailyQuests || !state.dailyQuests.list || !state.dailyQuests.list[idx]) return;
        var q = state.dailyQuests.list[idx];
        if (q.cur < q.target || q.claimed) return;
        q.claimed = true;
        state.lk = (state.lk || 0) + (q.lk || 20);
        addExp(q.exp || 20, 'Nhiệm vụ: ' + q.title);
        sfx('bell');
        toast('🎁 Đã nhận: +' + q.lk + ' 💎 Linh Thạch, +' + q.exp + ' ✨ Tu Vi!', 3500);
        save();
        openQuestDashboard();
        updateQuestBadge();
        updateTopBar();
    }

    function claimDailyChest() {
        if (!state.dailyQuests || state.dailyQuests.claimed) return;
        var qList = state.dailyQuests.list || [];
        var allDone = qList.length > 0 && qList.every(function(q) { return q.cur >= q.target; });
        if (!allDone) {
            toast('Chưa hoàn thành đủ tất cả nhiệm vụ ngày!');
            return;
        }
        state.dailyQuests.claimed = true;
        state.lk = (state.lk || 0) + 100;
        addExp(80, 'Rương Tu Hành Hằng Ngày');
        sfx('win');
        toast('🎉 Chúc mừng! Mở rương thành công: +100 💎 Linh Thạch, +80 ✨ Tu Vi!', 4500);
        save();
        openQuestDashboard();
        updateQuestBadge();
        updateTopBar();
    }

    function openPracticeHub() {
        openStudyDashboard();
    }

    function openPondDashboard() {
        place = 'pond';
        var html = '<div class="sheet-title"><span class="zh">池</span><b>Tụ Linh Trì — Bế Quan Tụ Khí</b>' +
            '<button class="btn-ghost close" data-act="closeSheet">Đóng</button></div>' +
            '<div class="card" style="background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;border-radius:14px;padding:14px;margin-bottom:12px">' +
            '<h3 style="margin:0 0 4px 0">🌊 Tụ Linh Trì Hằng Nhạc Phái</h3>' +
            '<p class="small" style="margin:0;opacity:0.95;line-height:1.5">Nơi ngưng tụ linh tuyền thiên địa, mặt hồ tĩnh lặng tỏa lam quang. Đệ tử bế quan tại đây để gột rửa tạp niệm, tôi luyện thần thức và thi đấu lôi đài.</p>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div><b>🧘 Tĩnh Tọa Thổ Nạp</b><div class="small muted">Hấp thu linh khí linh tuyền (+30 💎 Linh Thạch mỗi ngày)</div></div>' +
            '<button class="btn-primary" data-act="pondMeditate" style="background:#0284c7;border-color:#0369a1">Thổ Nạp</button>' +
            '</div>' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div><b>⚡ Lôi Đình Đấu Pháp</b><div class="small muted">Thử thách 60 giây nhận diện chữ tốc độ cao giành linh thạch</div></div>' +
            '<button class="btn-primary" data-act="startFastQuiz" style="background:#d97706;border-color:#b45309">Khiêu Chiến</button>' +
            '</div>' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div><b>📜 Thiên Địa Đạo Văn</b><div class="small muted">Học 214 bộ thủ Khang Hy để hiểu cấu tạo linh phù</div></div>' +
            '<button class="btn" data-act="openRadicals214">Xem Bộ Thủ</button>' +
            '</div>' +
            '</div>';
        ui.sheet.innerHTML = html;
        openSheet('tall');
    }

    function pondMeditate() {
        var today = new Date().toISOString().slice(0, 10);
        if (!state.sectData) state.sectData = {};
        if (state.sectData.lastMeditate === today) {
            toast('Hôm nay đệ tử đã tĩnh tọa thổ nạp rồi! Ngày mai hãy quay lại.');
            return;
        }
        state.sectData.lastMeditate = today;
        state.lk = (state.lk || 0) + 30;
        addExp(40, 'Tĩnh tọa Tụ Linh Trì');
        sfx('bell');
        toast('🌊 Thổ nạp viên mãn! Nhận +30 💎 Linh Thạch và +40 ✨ Tu Vi.', 4000);
        save();
        openPondDashboard();
        updateTopBar();
    }

    function openAlchemyDashboard() {
        place = 'kitchen';
        var html = '<div class="sheet-title"><span class="zh">炉</span><b>Luyện Đan Lô — Đan Đạo Tiên Gia</b>' +
            '<button class="btn-ghost close" data-act="closeSheet">Đóng</button></div>' +
            '<div class="card" style="background:linear-gradient(135deg,#b91c1c,#7f1d1d);color:#fff;border-radius:14px;padding:14px;margin-bottom:12px">' +
            '<h3 style="margin:0 0 4px 0">🔥 Bát Quái Đan Lô Hằng Nhạc</h3>' +
            '<p class="small" style="margin:0;opacity:0.95;line-height:1.5">Lò luyện đan thượng cổ hấp thu địa hỏa ngàn năm. Tiêu hao linh thạch để luyện chế linh đan diệu dược trợ lực đột phá cảnh giới và trảm yêu trừ ma.</p>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div style="flex:1;min-width:0;margin-right:8px">' +
            '<div style="font-weight:700">💊 Trúc Cơ Đan <span style="font-size:0.75em;color:#d97706;font-weight:700">50 💎</span></div>' +
            '<div class="small muted">Nuốt vào tăng ngay +150 ✨ Tu Vi, củng cố đan điền</div></div>' +
            '<button class="btn-primary" data-act="craftAlchemyPill" data-type="trucco" style="background:#b91c1c;border-color:#991b1b">Luyện Đan</button>' +
            '</div>' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div style="flex:1;min-width:0;margin-right:8px">' +
            '<div style="font-weight:700">🩸 Hồi Khí Đan <span style="font-size:0.75em;color:#d97706;font-weight:700">30 💎</span></div>' +
            '<div class="small muted">Khôi phục đầy 100% Khí Huyết (HP) ngay lập tức khi Trảm Yêu</div></div>' +
            '<button class="btn-primary" data-act="craftAlchemyPill" data-type="hoikhi" style="background:#b91c1c;border-color:#991b1b">Luyện Đan</button>' +
            '</div>' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div style="flex:1;min-width:0;margin-right:8px">' +
            '<div style="font-weight:700">⚔️ Sát Lục Đan <span style="font-size:0.75em;color:#d97706;font-weight:700">80 💎</span></div>' +
            '<div class="small muted">Vĩnh viễn tăng +10 Sát Thương Công Kích cho phi kiếm</div></div>' +
            '<button class="btn-primary" data-act="craftAlchemyPill" data-type="satluc" style="background:#b91c1c;border-color:#991b1b">Luyện Đan</button>' +
            '</div>' +
            '</div>';
        ui.sheet.innerHTML = html;
        openSheet('tall');
    }

    function craftAlchemyPill(type) {
        if (!state.pillBuffs) state.pillBuffs = { bonusAtk: 0 };
        if (type === 'trucco') {
            if ((state.lk || 0) < 50) {
                toast('Không đủ linh thạch! Cần 50 💎 để luyện Trúc Cơ Đan.');
                return;
            }
            state.lk -= 50;
            addExp(150, 'Uống Trúc Cơ Đan');
            sfx('perfect');
            toast('🎉 Luyện thành 1 Trúc Cơ Đan (+150 ✨ Tu Vi)!', 3500);
        } else if (type === 'hoikhi') {
            if ((state.lk || 0) < 30) {
                toast('Không đủ linh thạch! Cần 30 💎 để luyện Hồi Khí Đan.');
                return;
            }
            state.lk -= 30;
            combatState.playerHp = combatState.playerMaxHp || 200;
            sfx('perfect');
            toast('🩸 Khí huyết sung mãn! HP đã hồi phục 100%.', 3500);
        } else if (type === 'satluc') {
            if ((state.lk || 0) < 80) {
                toast('Không đủ linh thạch! Cần 80 💎 để luyện Sát Lục Đan.');
                return;
            }
            state.lk -= 80;
            state.pillBuffs.bonusAtk = (state.pillBuffs.bonusAtk || 0) + 10;
            sfx('perfect');
            toast('⚔️ Sát khí xung thiên! Công kích vĩnh viễn tăng +10.', 4000);
        }
        save();
        openAlchemyDashboard();
        updateTopBar();
    }

    function openGateDashboard() {
        place = 'gate';
        var html = '<div class="sheet-title"><span class="zh">门</span><b>Hằng Nhạc Sơn Môn — Khởi Điểm Nghịch Mệnh</b>' +
            '<button class="btn-ghost close" data-act="closeSheet">Đóng</button></div>' +
            '<div class="card" style="background:linear-gradient(135deg,#047857,#065f46);color:#fff;border-radius:14px;padding:14px;margin-bottom:12px">' +
            '<h3 style="margin:0 0 4px 0">⛩️ Tiên Sơn Hằng Nhạc</h3>' +
            '<p class="small" style="margin:0;opacity:0.95;line-height:1.5">Cổng vào môn phái ẩn hiện trong mây mờ Triệu Quốc. Vương Lâm từng quỳ nơi đây để cầu duyên tiên đạo, dốc lòng bước vào tu chân giới khốc liệt.</p>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div><b>🗣️ Tư Đồ Nam Tiền Bối</b><div class="small muted">Nhận lời chỉ điểm tu luyện từ lão ma đầu</div></div>' +
            '<button class="btn-primary" data-act="listenSiTuNam" style="background:#047857;border-color:#065f46">Nghe Chỉ Điểm</button>' +
            '</div>' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div><b>⚔️ Xuất Sơn Lịch Luyện</b><div class="small muted">Tiến vào Trảm Yêu Đài diệt yêu thú, đoạt bảo</div></div>' +
            '<button class="btn-primary" data-act="openHunt" style="background:#b91c1c;border-color:#991b1b">Trảm Yêu</button>' +
            '</div>' +
            '<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">' +
            '<div><b>🏛️ Tông Môn Điện</b><div class="small muted">Kiểm tra cống hiến môn phái và đệ tử</div></div>' +
            '<button class="btn" data-act="openSect">Tông Môn</button>' +
            '</div>' +
            '</div>';
        ui.sheet.innerHTML = html;
        openSheet('tall');
    }\n\n    """

    if insert_marker in content:
        content = content.replace(insert_marker, new_helpers + insert_marker)
        print("Inserted dashboard helpers")
    else:
        print("WARN: insert_marker not found")

    with open('quy-van-app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Step 2 done")

if __name__ == '__main__':
    update()
