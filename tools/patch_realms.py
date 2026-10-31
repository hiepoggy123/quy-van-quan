# -*- coding: utf-8 -*-
import re

print("Starting patch_realms.py...")

# -------------------------------------------------------------
# 1. PATCH quy-van-core.js
# -------------------------------------------------------------
with open('quy-van-core.js', 'r', encoding='utf-8') as f:
    core_content = f.read()

# Replace REALMS and getRealm and MOBS/BOSSES in quy-van-core.js
realms_code = '''    var REALMS = [
        { level: 1, name: 'Phàm Nhân Tạp Dịch', title: 'Tạp Dịch', minWords: 0, maxWords: 20, minExp: 0, maxExp: 100, icon: '🪵', desc: 'Vương Lâm (Thiết Trụ) vừa bước lên Hằng Nhạc Phái, làm tạp dịch gánh nước chẻ củi, may mắn nhặt được Thiên Nghịch Châu trong sơn động.' },
        { level: 2, name: 'Ngưng Khí Sơ Kỳ (Tầng 1 - 5)', title: 'Ngưng Khí', minWords: 20, maxWords: 60, minExp: 100, maxExp: 300, icon: '🌱', desc: 'Tư Đồ Nam trong Thiên Nghịch Châu tỉnh giấc, chỉ điểm hô hấp thổ nạp, linh khí nhập thể đan điền.' },
        { level: 3, name: 'Ngưng Khí Trung Kỳ (Tầng 6 - 10)', title: 'Ngưng Khí', minWords: 60, maxWords: 150, minExp: 300, maxExp: 800, icon: '📜', desc: 'Luyện thành dẫn lực thuật, ngự sử phi kiếm gỗ, mở rộng thần thức nhận biết vạn vật xung quanh.' },
        { level: 4, name: 'Ngưng Khí Đỉnh Phong (Tầng 11-15)', title: 'Đỉnh Phong', minWords: 150, maxWords: 300, minExp: 800, maxExp: 1800, icon: '⚔️', desc: 'Tham gia tông môn đại tỷ Hằng Nhạc Phái, đoạt Trúc Cơ Đan, chuẩn bị xung kích Trúc Cơ.' },
        { level: 5, name: 'Trúc Cơ Sơ Kỳ', title: 'Trúc Cơ', minWords: 300, maxWords: 600, minExp: 1800, maxExp: 3500, icon: '🏮', desc: 'Đan điền hóa dịch, kinh mạch mở rộng, bước vào con đường nghịch thiên cải mệnh thực thụ.' },
        { level: 6, name: 'Trúc Cơ Viên Mãn', title: 'Trúc Cơ', minWords: 600, maxWords: 1000, minExp: 3500, maxExp: 6000, icon: '💎', desc: 'Dấn thân vào Tu Ma Hải, luyện chế Huyết Kiếm và Hồn Phiên, kinh nghiệm sinh tử phong phú.' },
        { level: 7, name: 'Kết Đan Kỳ (Cực Cảnh)', title: 'Kết Đan', minWords: 1000, maxWords: 1700, minExp: 6000, maxExp: 10500, icon: '⚡', desc: 'Dung hợp thiên kiếp lôi đình, sinh ra Cực Cảnh Thần Thức vô địch đồng cấp, sát phạt quyết đoán!' },
        { level: 8, name: 'Nguyên Anh Kỳ', title: 'Nguyên Anh', minWords: 1700, maxWords: 2600, minExp: 10500, maxExp: 16500, icon: '🏯', desc: 'Ngưng kết Nguyên Anh, nhục thân dù nát hồn vẫn bất diệt, xưng bá một phương tại Triệu Quốc.' },
        { level: 9, name: 'Hóa Thần Kỳ (Hóa Phàm)', title: 'Hóa Thần', minWords: 2600, maxWords: 3800, minExp: 16500, maxExp: 24500, icon: '🌸', desc: 'Trở về nhân gian làm người thợ khắc gỗ, ngộ ra Sinh Tử Ý Cảnh: Sinh là điểm đầu của Tử, Tử là điểm về của Sinh.' },
        { level: 10, name: 'Anh Biến Kỳ', title: 'Anh Biến', minWords: 3800, maxWords: 5200, minExp: 24500, maxExp: 34500, icon: '🔥', desc: 'Hấp thu tiên khí, chuyển hóa ma khí thành tiên lực, đặt chân lên vũ trụ tinh không Chu Tước Tinh.' },
        { level: 11, name: 'Vấn Đỉnh Kỳ (Chu Tước Tử)', title: 'Vấn Đỉnh', minWords: 5200, maxWords: 6800, minExp: 34500, maxExp: 46500, icon: '🦅', desc: 'Kế thừa Chu Tước Thần Đạo, chấp chưởng phong vân Chu Tước Tinh, chuẩn bị phá toái hư không.' },
        { level: 12, name: 'Đệ Nhị Bộ: Khuy Niết - Tịnh Niết - Toái Niết', title: 'Toái Niết', minWords: 6800, maxWords: 8500, minExp: 46500, maxExp: 60000, icon: '🌌', desc: 'Tung hoành La Thiên Tinh Vực, ngộ Chân Giả Ý Cảnh và Nhân Quả Ý Cảnh, sáng tạo Tàn Dạ thần thông.' },
        { level: 13, name: 'Đệ Tam Bộ: Không Niết - Không Linh - Không Huyền', title: 'Không Huyền', minWords: 8500, maxWords: 10000, minExp: 60000, maxExp: 75000, icon: '🔮', desc: 'Vượt qua hư vô bản nguyên, đúc thành Cổ Thần Cửu Tinh, thần thông chấn động Giới Nội Giới Ngoại.' },
        { level: 14, name: 'Không Kiếp Kỳ / Đại Thiên Tôn', title: 'Thiên Tôn', minWords: 10000, maxWords: 11092, minExp: 75000, maxExp: 90000, icon: '👑', desc: 'Đỉnh phong Tiên Cương Đại Lục, chúa tể quy tắc càn khôn vạn vật, bước chân tới cánh cửa Đạp Thiên.' },
        { level: 15, name: 'Đạp Thiên Cảnh (Cực Đạo Đỉnh Phong - 11092 từ HSK 9)', title: 'Đạp Thiên', minWords: 11092, maxWords: 99999, minExp: 90000, maxExp: 999999, icon: '🌟', desc: 'Cửu Khinh Đạp Thiên, nghịch chuyển luân hồi cứu Lý Mộ Uyển! Nắm giữ trọn vẹn 11,092 từ Hán ngữ HSK 9 tối cao!' }
    ];

    function getRealm(arg1, arg2) {
        var exp = 0;
        var words = 0;
        if (typeof arg1 === 'object' && arg1 !== null) {
            exp = Math.max(0, arg1.exp || 0);
            words = typeof countLearned === 'function' ? countLearned(arg1, 1) : Object.keys(arg1.items || {}).length;
        } else if (arg2 !== undefined) {
            exp = Math.max(0, Number(arg1) || 0);
            words = Math.max(0, Number(arg2) || 0);
        } else {
            exp = Math.max(0, Number(arg1) || 0);
            for (var k = REALMS.length - 1; k >= 0; k--) {
                if (exp >= REALMS[k].minExp) return REALMS[k];
            }
            return REALMS[0];
        }

        // Đột phá cảnh giới yêu cầu ĐỦ CẢ HAI: Số chữ Hán đã ngộ VÀ Điểm Tu Vi tích lũy
        for (var i = REALMS.length - 1; i >= 0; i--) {
            if (words >= REALMS[i].minWords && exp >= REALMS[i].minExp) {
                return REALMS[i];
            }
        }
        // Trường hợp chữ đạt nhưng EXP thiếu một chút (hoặc ngược lại): cảnh giới bị khống chế bởi mốc chữ Hán tối thiểu
        for (var j = REALMS.length - 1; j >= 0; j--) {
            if (words >= REALMS[j].minWords) {
                return REALMS[j];
            }
        }
        return REALMS[0];
    }

    var MOBS = [
        { id: 'son_chuot', name: 'Sơn Thử Yêu (Chuột Núi)', reqLevel: 1, realm: 'Phàm Nhân - Ngưng Khí 1', hp: 80, atk: 12, drop: 'Linh Thảo Thô', lk: 15, exp: 20, img: 'assets/sprites/mob/icon_son_chuot.png' },
        { id: 'sau_truc', name: 'Trúc Trùng Yêu (Sâu Trúc)', reqLevel: 2, realm: 'Ngưng Khí 2 - 3', hp: 130, atk: 18, drop: 'Trúc Tiết Tinh', lk: 25, exp: 35, img: 'assets/sprites/mob/icon_sau_truc.png' },
        { id: 'cho_lang', name: 'Thiết Nha Lang (Chó Sói)', reqLevel: 2, realm: 'Ngưng Khí 4 - 6', hp: 200, atk: 28, drop: 'Lang Nha Huyết Thạch', lk: 35, exp: 50, img: 'assets/sprites/mob/icon_cho_lang.png' },
        { id: 'doc_dang_yeu', name: 'Độc Đằng Thụ Yêu (Cây Độc)', reqLevel: 3, realm: 'Ngưng Khí 7 - 9', hp: 300, atk: 40, drop: 'Độc Mộc Tâm', lk: 50, exp: 75, img: 'assets/sprites/mob/icon_doc_dang_yeu.png' },
        { id: 'xuyen_son_giap', name: 'Xuyên Sơn Giáp Thú', reqLevel: 4, realm: 'Ngưng Khí Đỉnh Phong', hp: 420, atk: 55, drop: 'Xuyên Sơn Giáp Phiến', lk: 70, exp: 110, img: 'assets/sprites/mob/icon_xuyen_son_giap.png' },
        { id: 'thach_giap_yeu', name: 'Thạch Giáp Yêu (Quái Đá)', reqLevel: 5, realm: 'Trúc Cơ Sơ Kỳ', hp: 580, atk: 75, drop: 'Huyền Thạch Tinh Hoa', lk: 95, exp: 160, img: 'assets/sprites/mob/icon_thach_giap_yeu.png' },
        { id: 'u_minh_cu_mang', name: 'U Minh Cự Mãng', reqLevel: 5, realm: 'Trúc Cơ Trung Kỳ', hp: 760, atk: 98, drop: 'Mãng Xà Đan', lk: 130, exp: 220, img: 'assets/sprites/mob/icon_u_minh_cu_mang.png' },
        { id: 'nhen_bach_ngoc', name: 'Bạch Ngọc Chu Thú', reqLevel: 6, realm: 'Trúc Cơ Viên Mãn', hp: 980, atk: 125, drop: 'Ngọc Chu Ti', lk: 180, exp: 300, img: 'assets/sprites/mob/icon_nhen_bach_ngoc.png' },
        { id: 'thi_khoi_bach', name: 'Bạch Cốt Thi Khôi', reqLevel: 7, realm: 'Kết Đan Sơ Kỳ', hp: 1250, atk: 160, drop: 'U Hồn Hạt', lk: 240, exp: 400, img: 'assets/sprites/mob/icon_thi_khoi_bach.png' },
        { id: 'bach_ho_tuyet', name: 'Tuyết Phong Bạch Hổ', reqLevel: 7, realm: 'Kết Đan Đỉnh Phong', hp: 1600, atk: 205, drop: 'Bạch Hổ Tinh Phách', lk: 320, exp: 550, img: 'assets/sprites/mob/icon_bach_ho_tuyet.png' }
    ];

    var BOSSES = [
        { id: 'boss_linh_ho', name: 'Trấn Sơn Linh Hổ Vương', reqLevel: 4, realm: 'Ngưng Khí Đỉnh Phong', hp: 850, atk: 90, desc: 'Linh thú thủ sơn Hằng Nhạc Phái bị ma khí xâm thực, gầm vang chấn động cửu phong!', reward: 'Thiên Lam Ngọc Giản + Trúc Cơ Đan', lk: 200, exp: 400, img: 'assets/sprites/mob/icon_linh_ho_tran_son.png' },
        { id: 'boss_xich_mang', name: 'Thượng Cổ Xích Mãng Vương', reqLevel: 6, realm: 'Trúc Cơ Đỉnh Phong', hp: 1800, atk: 180, desc: 'Cự thú ngủ vạn năm dưới đáy Đầm Lầy Độc Mãng Tu Ma Hải, nuốt hồn luyện phách!', reward: 'Thần Thức Huyết Tinh + Hồn Phiên Tàn Mảnh', lk: 450, exp: 900, img: 'assets/sprites/mob/icon_xich_mang_vuong.png' },
        { id: 'boss_khoi_loi', name: 'Viễn Cổ Hắc Diệu Khôi Lỗi', reqLevel: 7, realm: 'Kết Đan Kỳ (Cực Cảnh)', hp: 3200, atk: 300, desc: 'Chiến giáp cơ quan từ thời Cổ Thần lưu lạc, mình đồng da sắt đao thương bất nhập!', reward: 'Cực Cảnh Lôi Thạch + Toái Toái Tiên Tinh', lk: 1000, exp: 2000, img: 'assets/sprites/mob/icon_khoi_loi_huyen_thiet.png' }
    ];'''

# Replace from 'var REALMS =' to the end of BOSSES definition
start_pos = core_content.find('    var REALMS = [')
end_target = "reward: 'Cực Cảnh Lôi Thạch + Toái Toái Tiên Tinh', lk: 1000, exp: 2000, img: 'assets/sprites/mob/icon_khoi_loi_huyen_thiet.png' }\n    ];"
end_pos = core_content.find(end_target)

if start_pos != -1 and end_pos != -1:
    end_pos += len(end_target)
    core_content = core_content[:start_pos] + realms_code + core_content[end_pos:]
    print("Successfully replaced REALMS, getRealm, MOBS, BOSSES in quy-van-core.js")
else:
    print("ERROR: Could not locate REALMS or BOSSES in quy-van-core.js")

# Also update calcCombatStats in quy-van-core.js
calc_start = core_content.find('    function calcCombatStats(state) {')
calc_end = core_content.find('        return { cp: cp, hp: hp, atk: atk, def: def, mind: mind };\n    }')
if calc_start != -1 and calc_end != -1:
    calc_end += len('        return { cp: cp, hp: hp, atk: atk, def: def, mind: mind };\n    }')
    new_calc = '''    function calcCombatStats(state) {
        var s = state || {};
        var learned = typeof countLearned === 'function' ? countLearned(s, 1) : Object.keys(s.items || {}).length;
        var r = getRealm(s);
        var arrayLvl = (s.sectData && s.sectData.arrayLevel) || 1;
        var atk = 30 + (r.level * 25) + Math.floor(learned * 1.5) + (arrayLvl * 5);
        var hp = 200 + (r.level * 150) + (learned * 6) + (arrayLvl * 25);
        var def = 10 + (r.level * 18) + Math.floor(learned * 0.8) + (arrayLvl * 4);
        var mind = 10 + (r.level * 28) + Math.floor(learned * 1.2) + (arrayLvl * 5);
        var cp = Math.round(atk * 2.5 + hp * 0.5 + def * 1.8 + mind * 2);
        return { cp: cp, hp: hp, atk: atk, def: def, mind: mind };
    }'''
    core_content = core_content[:calc_start] + new_calc + core_content[calc_end:]
    print("Successfully updated calcCombatStats in quy-van-core.js")

with open('quy-van-core.js', 'w', encoding='utf-8') as f:
    f.write(core_content)


# -------------------------------------------------------------
# 2. PATCH index.html
# -------------------------------------------------------------
with open('index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Update statCover title and text
html_content = html_content.replace(
    '<span class="stat" id="statCover" title="Độ phủ từ vựng trong truyện .txt đã học"><span class="zh-ico">📖</span><b>0%</b></span>',
    '<span class="stat" id="statCover" data-act="openRealm" title="Chữ Hán đã học trên tổng mục tiêu 11,092 từ HSK 9"><span class="zh-ico">📖</span><b>0 / 11k</b></span>'
)
html_content = html_content.replace(
    '<span class="stat" id="statExp" title="Điểm Tu Vi (EXP)"><span class="zh-ico">✨</span><b id="expVal">0</b></span>',
    '<span class="stat" id="statExp" data-act="openRealm" title="Điểm Tu Vi (EXP)"><span class="zh-ico">✨</span><b id="expVal">0</b></span>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)
print("Successfully patched index.html")

print("Done with part 1!")
