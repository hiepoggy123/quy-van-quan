# -*- coding: utf-8 -*-

def update():
    with open('quy-van-app.js', 'r', encoding='utf-8') as f:
        content = f.read()

    start_str = "    function openCore100Modal() {\n        var list = (window.HZ_TOOLS && window.HZ_TOOLS.CORE_100) || [];"
    if start_str not in content:
        start_str = "    function openCore100Modal() {\r\n        var list = (window.HZ_TOOLS && window.HZ_TOOLS.CORE_100) || [];"

    end_str = "    var TIEN_NGHICH_TREASURES = ["

    idx_start = content.find(start_str)
    idx_end = content.find(end_str)

    if idx_start == -1 or idx_end == -1:
        print(f"ERROR: could not locate block: idx_start={idx_start}, idx_end={idx_end}")
        return

    new_block = """    function openCore100Modal(vol) {
        recordQuestProgress('hz_tool', 1);
        vol = vol !== undefined && vol !== null ? Number(vol) : 0;
        var allList = (window.HZ_TOOLS && window.HZ_TOOLS.CORE_100) || [];
        var list = vol > 0 ? allList.filter(function(x) { return x.vol === vol; }) : allList;

        var volTitles = {
            0: 'Tất cả (100 Chữ Hán Xây Nền)',
            1: 'Quyển 1: Số Mục & Thiên Địa (Chữ 1-20)',
            2: 'Quyển 2: Ngũ Hành & Vạn Vật (Chữ 21-40)',
            3: 'Quyển 3: Nhân Luân & Vị Trí (Chữ 41-60)',
            4: 'Quyển 4: Động Tác & Sinh Tử (Chữ 61-80)',
            5: 'Quyển 5: Đạo Pháp & Tiên Ma (Chữ 81-100)'
        };

        var html = '<div class="lesson-top"><b>🧱 Bách Tự Trúc Cơ (100 Chữ Hán HanziGuru)</b>' +
            '<button class="btn-ghost" data-act="openPractice" style="margin-left:auto">‹ Quay lại</button></div>' +
            '<div class="card" style="margin:10px 0;background:linear-gradient(135deg,#fcf8ec,#f5e9cb);border:1.5px solid var(--line);border-radius:12px;padding:12px">' +
            '<b>' + (volTitles[vol] || 'Bách Tự Trúc Cơ') + ':</b> Chạm vào biểu tượng 🔊 để nghe phát âm chuẩn bản xứ, xem cụm từ ghép và câu ví dụ Tiên Nghịch!' +
            '</div>' +
            '<div class="tab-bar" style="overflow-x:auto;white-space:nowrap;padding-bottom:6px;margin-bottom:10px">' +
            '<button class="tab-btn ' + (vol === 0 ? 'active' : '') + '" data-act="openCore100Lesson" data-vol="0">Tất cả (100)</button>' +
            '<button class="tab-btn ' + (vol === 1 ? 'active' : '') + '" data-act="openCore100Lesson" data-vol="1">Quyển 1 (1-20)</button>' +
            '<button class="tab-btn ' + (vol === 2 ? 'active' : '') + '" data-act="openCore100Lesson" data-vol="2">Quyển 2 (21-40)</button>' +
            '<button class="tab-btn ' + (vol === 3 ? 'active' : '') + '" data-act="openCore100Lesson" data-vol="3">Quyển 3 (41-60)</button>' +
            '<button class="tab-btn ' + (vol === 4 ? 'active' : '') + '" data-act="openCore100Lesson" data-vol="4">Quyển 4 (61-80)</button>' +
            '<button class="tab-btn ' + (vol === 5 ? 'active' : '') + '" data-act="openCore100Lesson" data-vol="5">Quyển 5 (81-100)</button>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px">';

        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var cpText = (item.cp && item.cp.length) ? item.cp.join(' · ') : '';
            html += '<div class="card" style="display:flex;align-items:flex-start;gap:12px;padding:10px 12px;margin:0">' +
                '<div style="text-align:center;min-width:48px">' +
                '<div class="zh" style="font-size:2.2em;font-weight:700;line-height:1;color:var(--ink)">' + esc(item.ch) + '</div>' +
                '<button class="btn-ghost" data-act="speakCard" data-text="' + esc(item.ch) + '" style="font-size:0.75em;padding:2px 6px;margin-top:4px">🔊 Nghe</button>' +
                '</div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="display:flex;align-items:baseline;gap:8px">' +
                '<span style="font-weight:700;font-size:1.05em;color:var(--red-2)">' + esc(item.py) + '</span>' +
                '<span style="font-size:0.85em;font-weight:700;color:var(--jade)">(' + esc(item.hv) + ')</span>' +
                '<span style="font-size:0.75em;color:#94a3b8;margin-left:auto">' + (item.s || 0) + ' nét</span>' +
                '</div>' +
                '<div style="font-size:0.88em;color:var(--ink-2);margin-top:2px;font-weight:500">' + esc(item.m) + '</div>' +
                (cpText ? '<div style="font-size:0.78em;color:#0284c7;margin-top:4px;background:#f0f9ff;padding:3px 6px;border-radius:6px">🔗 <b>Cụm từ:</b> ' + esc(cpText) + '</div>' : '') +
                (item.eg ? '<div style="font-size:0.78em;color:#b45309;margin-top:3px;font-style:italic">📖 ' + esc(item.eg) + '</div>' : '') +
                '</div></div>';
        }
        html += '</div>';
        ui.sheet.innerHTML = html;
        openSheet('tall');
    }

    function openRadicals214Modal(strokeFilter) {
        recordQuestProgress('hz_tool', 1);
        var allList = (window.HZ_TOOLS && window.HZ_TOOLS.RADICALS_214) || [];
        strokeFilter = strokeFilter || 'all';

        var list = allList;
        if (strokeFilter === '1-2') list = allList.filter(function(r) { return r.s <= 2; });
        else if (strokeFilter === '3-4') list = allList.filter(function(r) { return r.s >= 3 && r.s <= 4; });
        else if (strokeFilter === '5-6') list = allList.filter(function(r) { return r.s >= 5 && r.s <= 6; });
        else if (strokeFilter === '7+') list = allList.filter(function(r) { return r.s >= 7; });

        var html = '<div class="lesson-top"><b>📜 Thiên Địa Đạo Văn (214 Bộ Thủ Khang Hy)</b>' +
            '<button class="btn-ghost" data-act="openPractice" style="margin-left:auto">‹ Quay lại</button></div>' +
            '<div class="card" style="margin:10px 0;background:#f8fafc;border:1.5px solid #0284c7;border-radius:12px;padding:12px">' +
            '<b>214 Bộ Thủ Khang Hy:</b> Mỗi bộ thủ là một cấu kiện đạo văn ngũ hành biểu ý. Nắm vững bộ thủ giúp bạn thấu suốt cấu tạo và ý nghĩa của hàng vạn chữ Hán!' +
            '</div>' +
            '<div class="tab-bar" style="margin-bottom:10px">' +
            '<button class="tab-btn ' + (strokeFilter === 'all' ? 'active' : '') + '" data-act="filterRadicals" data-stroke="all">Tất cả (' + allList.length + ')</button>' +
            '<button class="tab-btn ' + (strokeFilter === '1-2' ? 'active' : '') + '" data-act="filterRadicals" data-stroke="1-2">1-2 nét</button>' +
            '<button class="tab-btn ' + (strokeFilter === '3-4' ? 'active' : '') + '" data-act="filterRadicals" data-stroke="3-4">3-4 nét</button>' +
            '<button class="tab-btn ' + (strokeFilter === '5-6' ? 'active' : '') + '" data-act="filterRadicals" data-stroke="5-6">5-6 nét</button>' +
            '<button class="tab-btn ' + (strokeFilter === '7+' ? 'active' : '') + '" data-act="filterRadicals" data-stroke="7+">7+ nét</button>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px">';

        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            html += '<div class="card" style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin:0">' +
                '<div class="zh" style="font-size:2em;font-weight:700;color:var(--red-2);min-width:44px;text-align:center">' + esc(r.r) + '</div>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:700;font-size:0.95em">Bộ ' + esc(r.n) + ' <span style="font-size:0.8em;color:#666">(' + r.s + ' nét)</span></div>' +
                '<div class="small muted" style="margin-top:2px">' + esc(r.m) + '</div>' +
                (r.ex ? '<div style="font-size:0.75em;color:var(--jade);margin-top:2px">Ví dụ: ' + esc(r.ex) + '</div>' : '') +
                '</div>' +
                '<button class="btn-ghost" data-act="speakCard" data-text="' + esc(r.r.charAt(0)) + '" style="font-size:0.8em">🔊</button>' +
                '</div>';
        }
        html += '</div>';
        ui.sheet.innerHTML = html;
        openSheet('tall');
    }

    function openPhoneticFamiliesModal() {
        recordQuestProgress('hz_tool', 1);
        var fams = (window.HZ_TOOLS && window.HZ_TOOLS.PHONETIC_FAMILIES) || [];
        var html = '<div class="lesson-top"><b>🗡️ Vạn Kiếm Quy Tông (12 Họ Chữ Hình Thanh)</b>' +
            '<button class="btn-ghost" data-act="openPractice" style="margin-left:auto">‹ Quay lại</button></div>' +
            '<div class="card" style="margin:10px 0;background:linear-gradient(135deg,#fcf8ec,#f5e9cb);border:1.5px solid var(--line);border-radius:12px;padding:12px">' +
            '<b>Quy tắc hình thanh HanziGuru:</b> Hơn 80% chữ Hán cấu tạo từ một gốc biểu âm kết hợp bộ thủ biểu ý. Nắm 1 gốc phát âm là thông suốt cả một tông môn chữ!' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:12px">';

        for (var i = 0; i < fams.length; i++) {
            var f = fams[i];
            html += '<div class="card" style="padding:12px;margin:0;border-left:4px solid var(--red-2)">' +
                '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
                '<span class="zh" style="font-size:1.8em;font-weight:700;color:var(--red-2)">' + esc(f.root) + '</span>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:700;font-size:1em">Gốc biểu âm: ' + esc(f.rootPy) + ' <span style="font-size:0.85em;color:#666">(' + esc(f.meaning) + ')</span></div>' +
                '<div class="small muted" style="font-size:0.8em">' + esc(f.desc) + '</div>' +
                '</div>' +
                '<button class="btn-ghost" data-act="speakCard" data-text="' + esc(f.root) + '">🔊</button>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-top:8px">';

            for (var j = 0; j < f.members.length; j++) {
                var m = f.members[j];
                html += '<div style="background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:6px 8px;display:flex;align-items:center;gap:8px">' +
                    '<span class="zh" style="font-size:1.4em;font-weight:700">' + esc(m.ch) + '</span>' +
                    '<div style="flex:1;min-width:0">' +
                    '<div style="font-weight:700;font-size:0.82em;color:var(--red-2)">' + esc(m.py) + '</div>' +
                    '<div style="font-size:0.75em;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(m.m) + '</div>' +
                    '<div style="font-size:0.68em;color:#94a3b8">' + esc(m.rad) + '</div>' +
                    '</div>' +
                    '<button class="btn-ghost" data-act="speakCard" data-text="' + esc(m.ch) + '" style="font-size:0.7em;padding:2px">🔊</button>' +
                    '</div>';
            }
            html += '</div></div>';
        }
        html += '</div>';
        ui.sheet.innerHTML = html;
        openSheet('tall');
    }

    function openMeasureWordsModal() {
        recordQuestProgress('hz_tool', 1);
        var mws = (window.HZ_TOOLS && window.HZ_TOOLS.MEASURE_WORDS) || [];
        var html = '<div class="lesson-top"><b>📦 Vạn Vật Danh Số Biểu (20 Lượng Từ Trực Quan)</b>' +
            '<button class="btn-ghost" data-act="openPractice" style="margin-left:auto">‹ Quay lại</button></div>' +
            '<div class="card" style="margin:10px 0;background:#f8fafc;border:1.5px solid #0284c7;border-radius:12px;padding:12px">' +
            '<b>Bảo bối danh số HanziGuru:</b> Tiếng Trung dùng lượng từ riêng biệt cho từng hình dáng vật thể. Nắm vững lượng từ giúp bạn miêu tả đồ vật và giao tiếp chuẩn xác như người bản xứ!' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">';

        for (var i = 0; i < mws.length; i++) {
            var item = mws[i];
            html += '<div class="card" style="padding:12px;margin:0">' +
                '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
                '<span style="font-size:1.8em">' + item.icon + '</span>' +
                '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:700;font-size:1.1em;color:var(--red-2)">' + esc(item.word) + ' <span style="font-size:0.85em;color:#666">(' + esc(item.py) + ')</span></div>' +
                '<div class="small muted" style="font-size:0.85em">' + esc(item.use) + '</div>' +
                '</div>' +
                '<button class="btn-ghost" data-act="speakCard" data-text="' + esc(item.word) + '">🔊</button>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px;background:#f8fafc;padding:8px 10px;border-radius:8px">';

            for (var j = 0; j < item.examples.length; j++) {
                var eg = item.examples[j];
                html += '<div style="display:flex;align-items:center;justify-content:space-between;font-size:0.85em">' +
                    '<span><b class="zh" style="font-size:1.1em">' + esc(eg.zh) + '</b> <span style="color:#666;font-size:0.85em">(' + esc(eg.py) + ')</span> : ' + esc(eg.vi) + '</span>' +
                    '<button class="btn-ghost" data-act="speakCard" data-text="' + esc(eg.zh) + '" style="font-size:0.75em;padding:2px 4px">🔊</button>' +
                    '</div>';
            }
            html += '</div></div>';
        }
        html += '</div>';
        ui.sheet.innerHTML = html;
        openSheet('tall');
    }

    function openPinyinMatrixModal() {
        recordQuestProgress('hz_tool', 1);
        var inits = (window.HZ_TOOLS && window.HZ_TOOLS.INITIALS) || [];
        var finals = (window.HZ_TOOLS && window.HZ_TOOLS.FINALS) || [];

        var sampleSylls = [
            'ba', 'pa', 'ma', 'fa', 'da', 'ta', 'na', 'la',
            'ga', 'ka', 'ha', 'ji', 'qi', 'xi',
            'zha', 'cha', 'sha', 're', 'zi', 'ci', 'si',
            'wo', 'ni', 'ta', 'hao', 'ren', 'dao', 'tian', 'di'
        ];

        var html = '<div class="lesson-top"><b>🌐 Đại La Âm Trận (Ma Trận Âm Tiết Pinyin)</b>' +
            '<button class="btn-ghost" data-act="openPractice" style="margin-left:auto">‹ Quay lại</button></div>' +
            '<div class="card" style="margin:10px 0;background:linear-gradient(135deg,#fcf8ec,#f5e9cb);border:1.5px solid var(--line);border-radius:12px;padding:12px">' +
            '<b>Bảng ma trận âm thanh HanziGuru:</b> Chạm vào bất kỳ âm tiết nào bên dưới để nghe phát âm tiếng Trung chuẩn xác tuyệt đối (đã xử lý mapping tránh lỗi đánh vần tiếng Anh)!' +
            '</div>' +
            '<p class="small muted" style="margin:4px 0 8px 0"><b>Thanh mẫu (Initials - Phụ âm đầu):</b></p>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';

        for (var i = 0; i < inits.length; i++) {
            var initCh = (window.HZ_TOOLS && window.HZ_TOOLS.getPinyinHanzi(inits[i])) || inits[i];
            html += '<button class="chip" data-act="speakPinyin" data-syll="' + inits[i] + '" style="font-size:0.9em;padding:5px 12px;font-weight:700">' +
                inits[i] + ' <span style="font-size:0.75em;color:#b45309">(' + initCh + ')</span>' +
                '</button>';
        }

        html += '</div>' +
            '<p class="small muted" style="margin:4px 0 8px 0"><b>Vận mẫu (Finals - Nguyên âm):</b></p>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';

        for (var j = 0; j < finals.length; j++) {
            var finCh = (window.HZ_TOOLS && window.HZ_TOOLS.getPinyinHanzi(finals[j])) || finals[j];
            html += '<button class="chip" data-act="speakPinyin" data-syll="' + finals[j] + '" style="font-size:0.9em;padding:5px 12px;font-weight:700">' +
                finals[j] + ' <span style="font-size:0.75em;color:#b45309">(' + finCh + ')</span>' +
                '</button>';
        }

        html += '</div>' +
            '<p class="small muted" style="margin:4px 0 8px 0"><b>Âm tiết thông dụng (Chạm để nghe âm chuẩn):</b></p>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px">';

        for (var k = 0; k < sampleSylls.length; k++) {
            var syll = sampleSylls[k];
            var reprHanzi = (window.HZ_TOOLS && window.HZ_TOOLS.getPinyinHanzi(syll)) || '';
            html += '<button class="card" style="text-align:center;padding:8px 4px;margin:0;cursor:pointer;border:1px solid var(--line);border-radius:8px" data-act="speakPinyin" data-syll="' + syll + '">' +
                '<div style="font-weight:700;color:var(--red-2);font-size:0.95em">' + syll + '</div>' +
                (reprHanzi ? '<div class="zh" style="font-size:0.8em;color:#666;margin-top:2px">[' + reprHanzi + ']</div>' : '') +
                '</button>';
        }
        html += '</div>';

        ui.sheet.innerHTML = html;
        openSheet('tall');
    }\n\n    """

    content = content[:idx_start] + new_block + content[idx_end:]

    # Also make sure speakPinyin uses getPinyinHanzi directly
    target_speakPinyin = """        case 'speakPinyin': {
            var syll = el.getAttribute('data-syll') || '';
            speak(syll);
            break;
        }"""
    replace_speakPinyin = """        case 'speakPinyin': {
            var syll = el.getAttribute('data-syll') || '';
            var targetZh = (window.HZ_TOOLS && window.HZ_TOOLS.getPinyinHanzi) ? window.HZ_TOOLS.getPinyinHanzi(syll) : syll;
            speak(targetZh || syll);
            break;
        }"""
    if target_speakPinyin in content:
        content = content.replace(target_speakPinyin, replace_speakPinyin)
        print("Updated speakPinyin in clickAct")
    else:
        # Check with CRLF
        target_speakPinyin_crlf = target_speakPinyin.replace('\n', '\r\n')
        replace_speakPinyin_crlf = replace_speakPinyin.replace('\n', '\r\n')
        if target_speakPinyin_crlf in content:
            content = content.replace(target_speakPinyin_crlf, replace_speakPinyin_crlf)
            print("Updated speakPinyin (CRLF) in clickAct")

    # Record hunt progress when combat won
    combat_win_marker = "state.lk += loot.lk;\n            addExp(loot.exp, 'Trảm yêu: ' + combatState.mob.name);"
    combat_win_replace = "state.lk += loot.lk;\n            recordQuestProgress('hunt', 1);\n            addExp(loot.exp, 'Trảm yêu: ' + combatState.mob.name);"
    if combat_win_marker in content:
        content = content.replace(combat_win_marker, combat_win_replace)
        print("Added hunt progress on combat win")
    else:
        combat_win_marker_crlf = combat_win_marker.replace('\n', '\r\n')
        combat_win_replace_crlf = combat_win_replace.replace('\n', '\r\n')
        if combat_win_marker_crlf in content:
            content = content.replace(combat_win_marker_crlf, combat_win_replace_crlf)
            print("Added hunt progress on combat win (CRLF)")

    # Record fast_quiz progress when fast quiz finished
    fq_win_marker = "state.lk += rewardLk;\n            addExp(rewardExp, 'Đấu Pháp Tốc Lôi');"
    fq_win_replace = "state.lk += rewardLk;\n            recordQuestProgress('fast_quiz', 1);\n            addExp(rewardExp, 'Đấu Pháp Tốc Lôi');"
    if fq_win_marker in content:
        content = content.replace(fq_win_marker, fq_win_replace)
        print("Added fast_quiz progress on fast quiz end")
    else:
        fq_win_marker_crlf = fq_win_marker.replace('\n', '\r\n')
        fq_win_replace_crlf = fq_win_replace.replace('\n', '\r\n')
        if fq_win_marker_crlf in content:
            content = content.replace(fq_win_marker_crlf, fq_win_replace_crlf)
            print("Added fast_quiz progress on fast quiz end (CRLF)")

    with open('quy-van-app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Step 4 done successfully!")

if __name__ == '__main__':
    update()
