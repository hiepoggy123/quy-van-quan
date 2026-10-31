# -*- coding: utf-8 -*-
import json
import os

CORE_100 = [
    # Quyển 1: Số mục & Thiên Địa (1-20)
    {"ch": "一", "py": "yī", "hv": "nhất", "m": "số một, bắt đầu", "s": 1, "vol": 1, "cp": ["一定 (nhất định)", "一起 (cùng nhau)"], "eg": "一个人走在路上。(Một người đi trên đường.)"},
    {"ch": "二", "py": "èr", "hv": "nhị", "m": "số hai", "s": 2, "vol": 1, "cp": ["十二 (mười hai)", "第二 (thứ hai)"], "eg": "这是第二本秘籍。(Đây là cuốn bí tịch thứ hai.)"},
    {"ch": "三", "py": "sān", "hv": "tam", "m": "số ba", "s": 3, "vol": 1, "cp": ["三天 (ba ngày)", "三年 (ba năm)"], "eg": "他闭关修炼了三天。(Hắn bế quan tu luyện ba ngày.)"},
    {"ch": "四", "py": "sì", "hv": "tứ", "m": "số bốn", "s": 5, "vol": 1, "cp": ["四周 (bốn phía)", "四季 (bốn mùa)"], "eg": "四方灵气汇聚于此。(Linh khí bốn phương hội tụ về đây.)"},
    {"ch": "五", "py": "wǔ", "hv": "ngũ", "m": "số năm", "s": 4, "vol": 1, "cp": ["五行 (ngũ hành)", "五月 (tháng năm)"], "eg": "天地运转五行之力。(Trời đất vận chuyển sức mạnh ngũ hành.)"},
    {"ch": "六", "py": "liù", "hv": "lục", "m": "số sáu", "s": 4, "vol": 1, "cp": ["六合 (lục hợp)", "六月 (tháng sáu)"], "eg": "六品灵石极为稀有。(Linh thạch lục phẩm cực kỳ hiếm thấy.)"},
    {"ch": "七", "py": "qī", "hv": "thất", "m": "số bảy", "s": 2, "vol": 1, "cp": ["七天 (bảy ngày)", "七星 (thất tinh)"], "eg": "七星连珠，天象大变。(Thất tinh liên châu, thiên tượng đổi dời.)"},
    {"ch": "八", "py": "bā", "hv": "bát", "m": "số tám", "s": 2, "vol": 1, "cp": ["八方 (bát phương)", "八品 (bát phẩm)"], "eg": "声震八方仙门。(Tiếng vang chấn động bát phương tiên môn.)"},
    {"ch": "九", "py": "jiǔ", "hv": "cửu", "m": "số chín, chí cao", "s": 2, "vol": 1, "cp": ["九重 (cửu trùng)", "九州 (cửu châu)"], "eg": "踏上九重云端。(Đặt chân lên cửu trùng mây xanh.)"},
    {"ch": "十", "py": "shí", "hv": "thập", "m": "số mười, hoàn mỹ", "s": 2, "vol": 1, "cp": ["十年 (mười năm)", "十全 (thập toàn)"], "eg": "十年磨一剑。(Mười năm mài một thanh kiếm.)"},
    {"ch": "百", "py": "bǎi", "hv": "bách", "m": "trăm", "s": 6, "vol": 1, "cp": ["百万 (bách vạn)", "百姓 (bách tính)"], "eg": "百万修士齐聚宗门。(Trăm vạn tu sĩ cùng tề tựu ở tông môn.)"},
    {"ch": "千", "py": "qiān", "hv": "thiên", "m": "nghìn", "s": 3, "vol": 1, "cp": ["千里 (nghìn dặm)", "千面 (nghìn mặt)"], "eg": "神识可扫千万里。(Thần thức có thể quét nghìn vạn dặm.)"},
    {"ch": "万", "py": "wàn", "hv": "vạn", "m": "mười nghìn, vạn vật", "s": 3, "vol": 1, "cp": ["万物 (vạn vật)", "万里 (vạn dặm)"], "eg": "天地万物皆有灵。(Trời đất vạn vật đều có linh tính.)"},
    {"ch": "天", "py": "tiān", "hv": "thiên", "m": "trời, ngày", "s": 4, "vol": 1, "cp": ["逆天 (nghịch thiên)", "天地 (thiên địa)"], "eg": "我命由我不由天！(Mạng ta do ta định đoạt chứ không do trời!)"},
    {"ch": "地", "py": "dì", "hv": "địa", "m": "mặt đất, đất đai", "s": 6, "vol": 1, "cp": ["大地 (đại địa)", "洞天福地 (động thiên phúc địa)"], "eg": "灵气沉入大地之中。(Linh khí chìm sâu vào trong lòng đất.)"},
    {"ch": "日", "py": "rì", "hv": "nhật", "m": "mặt trời, ban ngày", "s": 4, "vol": 1, "cp": ["白日 (ngày trắng)", "日光 (ánh mặt trời)"], "eg": "日出东方，晨曦吐纳。(Mặt trời mọc đằng đông, ban mai thổ nạp.)"},
    {"ch": "月", "py": "yuè", "hv": "nguyệt", "m": "mặt trăng, tháng", "s": 4, "vol": 1, "cp": ["明月 (trăng sáng)", "岁月 (tháng năm)"], "eg": "冷月当空，杀气漫延。(Trăng lạnh giữa trời, sát khí lan tỏa.)"},
    {"ch": "山", "py": "shān", "hv": "sơn", "m": "ngọn núi", "s": 3, "vol": 1, "cp": ["恒岳山 (Hằng Nhạc Sơn)", "山门 (sơn môn)"], "eg": "恒岳山顶云雾缭绕。(Đỉnh Hằng Nhạc Sơn mây mù lượn lờ.)"},
    {"ch": "水", "py": "shuǐ", "hv": "thủy", "m": "dòng nước", "s": 4, "vol": 1, "cp": ["灵水 (linh thủy)", "水流 (dòng nước)"], "eg": "池中灵水滋养万物。(Linh thủy trong hồ nuôi dưỡng vạn vật.)"},
    {"ch": "火", "py": "huǒ", "hv": "hỏa", "m": "ngọn lửa", "s": 4, "vol": 1, "cp": ["真火 (chân hỏa)", "灵火 (linh hỏa)"], "eg": "祭出丹火炼制灵丹。(Vận chuyển đan hỏa luyện chế linh đan.)"},

    # Quyển 2: Ngũ Hành & Vạn Vật (21-40)
    {"ch": "木", "py": "mù", "hv": "mộc", "m": "cây cối, gỗ", "s": 4, "vol": 2, "cp": ["木雕 (khắc gỗ)", "草木 (cỏ cây)"], "eg": "王林手中握着木雕。(Vương Lâm trong tay nắm bức tượng khắc gỗ.)"},
    {"ch": "土", "py": "tǔ", "hv": "thổ", "m": "đất đai, ngũ hành", "s": 3, "vol": 2, "cp": ["土地 (thổ địa)", "灵土 (linh thổ)"], "eg": "这方灵土适合种植灵草。(Mảnh linh thổ này thích hợp trồng linh thảo.)"},
    {"ch": "金", "py": "jīn", "hv": "kim", "m": "vàng, kim loại", "s": 8, "vol": 2, "cp": ["黄金 (hoàng kim)", "金属 (kim loại)"], "eg": "金光护体，坚不可摧。(Kim quang hộ thể, kiên cố bất khả xâm phạm.)"},
    {"ch": "石", "py": "shí", "hv": "thạch", "m": "hòn đá, linh thạch", "s": 5, "vol": 2, "cp": ["灵石 (linh thạch)", "巨石 (tảng đá lớn)"], "eg": "他拿出一颗下品灵石。(Hắn lấy ra một viên hạ phẩm linh thạch.)"},
    {"ch": "田", "py": "tián", "hv": "điền", "m": "ruộng đồng, đan điền", "s": 5, "vol": 2, "cp": ["丹田 (đan điền)", "药田 (ruộng thuốc)"], "eg": "灵气缓缓汇入丹田。(Linh khí từ từ chảy vào đan điền.)"},
    {"ch": "风", "py": "fēng", "hv": "phong", "m": "ngọn gió, phong ba", "s": 4, "vol": 2, "cp": ["罡风 (cương phong)", "风波 (phong ba)"], "eg": "九天罡风呼啸而过。(Cương phong chín tầng trời gào thét thổi qua.)"},
    {"ch": "雨", "py": "yǔ", "hv": "vũ", "m": "cơn mưa", "s": 8, "vol": 2, "cp": ["灵雨 (mưa linh khí)", "雨水 (nước mưa)"], "eg": "漫天化作剑气灵雨。(Cả bầu trời hóa thành cơn mưa kiếm khí.)"},
    {"ch": "云", "py": "yún", "hv": "vân", "m": "mây trời", "s": 4, "vol": 2, "cp": ["白云 (mây trắng)", "云海 (biển mây)"], "eg": "脚踏祥云傲视群雄。(Chân đạp tường vân ngạo nghễ nhìn chúng sinh.)"},
    {"ch": "气", "py": "qì", "hv": "khí", "m": "linh khí, khí thế", "s": 4, "vol": 2, "cp": ["灵气 (linh khí)", "凝气 (ngưng khí)"], "eg": "此地灵气极为浓郁。(Linh khí nơi đây cực kỳ nồng đậm.)"},
    {"ch": "人", "py": "rén", "hv": "nhân", "m": "con người", "s": 2, "vol": 2, "cp": ["凡人 (phàm nhân)", "仙人 (tiên nhân)"], "eg": "凡人亦可逆天修真。(Phàm nhân cũng có thể nghịch thiên tu chân.)"},
    {"ch": "大", "py": "dà", "hv": "đại", "m": "to lớn", "s": 3, "vol": 2, "cp": ["大殿 (đại điện)", "大道 (đại đạo)"], "eg": "踏入恒岳宗大殿。(Bước vào trong đại điện Hằng Nhạc Tông.)"},
    {"ch": "小", "py": "xiǎo", "hv": "tiểu", "m": "nhỏ bé", "s": 3, "vol": 2, "cp": ["小试 (thử sức nhỏ)", "小心 (cẩn thận)"], "eg": "出门在外需多加小心。(Ra ngoài hành tẩu cần phải hết sức cẩn thận.)"},
    {"ch": "中", "py": "zhōng", "hv": "trung", "m": "ở giữa, trong lòng", "s": 4, "vol": 2, "cp": ["心中 (trong lòng)", "中间 (ở giữa)"], "eg": "天逆珠藏于怀中。(Thiên Nghịch Châu giấu kín trong ngực.)"},
    {"ch": "口", "py": "kǒu", "hv": "khẩu", "m": "cái miệng, cửa", "s": 3, "vol": 2, "cp": ["入口 (lối vào)", "洞口 (cửa động)"], "eg": "他守在古洞入口。(Hắn canh giữ ở lối vào cổ động.)"},
    {"ch": "目", "py": "mù", "hv": "mục", "m": "con mắt, ánh nhìn", "s": 5, "vol": 2, "cp": ["目中 (trong mắt)", "目标 (mục tiêu)"], "eg": "双目如电射向前方。(Đôi mắt như tia chớp bắn thẳng về phía trước.)"},
    {"ch": "耳", "py": "ěr", "hv": "nhĩ", "m": "tai nghe", "s": 6, "vol": 2, "cp": ["耳闻 (nghe thấy)", "耳目 (tai mắt)"], "eg": "耳边传来雷鸣之声。(Bên tai truyền đến tiếng sấm rền vang.)"},
    {"ch": "手", "py": "shǒu", "hv": "thủ", "m": "bàn tay, ra tay", "s": 4, "vol": 2, "cp": ["出手 (ra tay)", "双手 (hai tay)"], "eg": "他翻手打出一道剑光。(Hắn lật tay tung ra một đạo kiếm quang.)"},
    {"ch": "足", "py": "zú", "hv": "túc", "m": "bàn chân, đầy đủ", "s": 7, "vol": 2, "cp": ["立足 (đứng vững)", "充足 (đầy đủ)"], "eg": "灵气充足，适合冲关。(Linh khí dồi dào, thích hợp để đột phá.)"},
    {"ch": "心", "py": "xīn", "hv": "tâm", "m": "trái tim, tâm cảnh", "s": 4, "vol": 2, "cp": ["道心 (đạo tâm)", "用心 (dốc lòng)"], "eg": "道心坚定，无所畏惧。(Đạo tâm kiên định, không sợ hãi bất cứ điều gì.)"},
    {"ch": "力", "py": "lì", "hv": "lực", "m": "sức mạnh, uy lực", "s": 2, "vol": 2, "cp": ["力量 (sức mạnh)", "法力 (pháp lực)"], "eg": "引力术能御使飞剑。(Dẫn Lực Thuật có thể ngự khiển phi kiếm.)"},

    # Quyển 3: Nhân Luân & Vị Trí (41-60)
    {"ch": "门", "py": "mén", "hv": "môn", "m": "cửa, môn phái", "s": 3, "vol": 3, "cp": ["宗门 (tông môn)", "掌门 (chưởng môn)"], "eg": "拜入恒岳派宗门。(Bái nhập tông môn Hằng Nhạc Phái.)"},
    {"ch": "家", "py": "jiā", "hv": "gia", "m": "nhà cửa, gia đình", "s": 10, "vol": 3, "cp": ["家族 (gia tộc)", "回家 (về nhà)"], "eg": "为了家族的期盼而求仙。(Vì kỳ vọng của gia tộc mà đi cầu tiên.)"},
    {"ch": "女", "py": "nǚ", "hv": "nữ", "m": "nữ nhi, phụ nữ", "s": 3, "vol": 3, "cp": ["女修 (nữ tu)", "神女 (thần nữ)"], "eg": "李慕婉是一位温婉的女修。(Lý Mộ Uyển là một nữ tu dịu dàng.)"},
    {"ch": "子", "py": "zǐ", "hv": "tử", "m": "đứa con, đệ tử", "s": 3, "vol": 3, "cp": ["弟子 (đệ tử)", "朱雀子 (Chu Tước Tử)"], "eg": "外门弟子正在早课。(Các đệ tử ngoại môn đang làm bài học sáng.)"},
    {"ch": "父", "py": "fù", "hv": "phụ", "m": "cha, bậc sinh thành", "s": 4, "vol": 3, "cp": ["父亲 (cha ruột)", "父母 (cha mẹ)"], "eg": "父亲送他登上求道之路。(Người cha tiễn chàng bước lên con đường cầu đạo.)"},
    {"ch": "母", "py": "mǔ", "hv": "mẫu", "m": "mẹ hiền", "s": 5, "vol": 3, "cp": ["母亲 (mẹ hiền)", "母爱 (tình mẫu tử)"], "eg": "母亲缝制的布鞋。(Đôi giày vải người mẹ đã khâu.)"},
    {"ch": "友", "py": "yǒu", "hv": "hữu", "m": "bạn hữu, đạo hữu", "s": 4, "vol": 3, "cp": ["道友 (đạo hữu)", "朋友 (bạn bè)"], "eg": "请问道友高姓大名？(Dám hỏi đạo hữu danh tính là gì?)"},
    {"ch": "上", "py": "shàng", "hv": "thượng", "m": "ở trên, đi lên", "s": 3, "vol": 3, "cp": ["山顶上 (trên đỉnh núi)", "向上 (hướng lên)"], "eg": "一步步登上云霄。(Từng bước một bước lên mây xanh.)"},
    {"ch": "下", "py": "xià", "hv": "hạ", "m": "ở dưới, hạ giới", "s": 3, "vol": 3, "cp": ["山下 (dưới chân núi)", "天下 (thiên hạ)"], "eg": "山下一片宁静。(Dưới chân núi một dải thanh bình.)"},
    {"ch": "左", "py": "zuǒ", "hv": "tả", "m": "bên trái", "s": 5, "vol": 3, "cp": ["左侧 (bên trái)", "左手 (tay trái)"], "eg": "左侧是一片竹林。(Bên trái là một rừng trúc xanh mát.)"},
    {"ch": "右", "py": "yòu", "hv": "hữu", "m": "bên phải", "s": 5, "vol": 3, "cp": ["右边 (bên phải)", "右手 (tay phải)"], "eg": "右手并指如剑。(Tay phải chụm ngón tay như kiếm.)"},
    {"ch": "前", "py": "qián", "hv": "tiền", "m": "phía trước, tiền bối", "s": 9, "vol": 3, "cp": ["前辈 (tiền bối)", "前方 (phía trước)"], "eg": "司徒南前辈现身指点。(Tiền bối Tư Đồ Nam hiện thân chỉ điểm.)"},
    {"ch": "后", "py": "hòu", "hv": "hậu", "m": "phía sau, hậu bối", "s": 6, "vol": 3, "cp": ["随后 (ngay sau đó)", "后退 (lùi lại)"], "eg": "他向后退了一步。(Hắn lùi lại phía sau một bước.)"},
    {"ch": "多", "py": "duō", "hv": "đa", "m": "nhiều", "s": 6, "vol": 3, "cp": ["多年 (nhiều năm)", "多少 (bao nhiêu)"], "eg": "多年苦修终成正果。(Nhiều năm khổ tu rốt cuộc thành quả tốt đẹp.)"},
    {"ch": "少", "py": "shǎo", "hv": "thiểu", "m": "ít, thiếu niên", "s": 4, "vol": 3, "cp": ["少年 (thiếu niên)", "稀少 (ít ỏi)"], "eg": "少年王林心志坚定。(Thiếu niên Vương Lâm ý chí vô cùng kiên định.)"},
    {"ch": "高", "py": "gāo", "hv": "cao", "m": "cao lớn, cao sâu", "s": 10, "vol": 3, "cp": ["高手 (cao thủ)", "高山 (núi cao)"], "eg": "遇见真正的修真高手。(Gặp gỡ cao thủ tu chân thực sự.)"},
    {"ch": "白", "py": "bái", "hv": "bạch", "m": "màu trắng", "s": 5, "vol": 3, "cp": ["白发 (tóc trắng)", "白雪 (tuyết trắng)"], "eg": "一夜白发，化凡悟道。(Một đêm bạc tóc, hóa phàm ngộ đạo.)"},
    {"ch": "黑", "py": "hēi", "hv": "hắc", "m": "màu đen, hắc ám", "s": 12, "vol": 3, "cp": ["黑夜 (đêm đen)", "黑色 (màu đen)"], "eg": "黑夜之中杀机隐现。(Trong màn đêm đen sát cơ ẩn hiện.)"},
    {"ch": "红", "py": "hóng", "hv": "hồng", "m": "màu đỏ, chu sa", "s": 6, "vol": 3, "cp": ["红袍 (áo đỏ)", "血红 (đỏ như máu)"], "eg": "血红色的杀戮之气。(Khí tức sát lục đỏ rực như máu.)"},
    {"ch": "绿", "py": "lǜ", "hv": "lục", "m": "màu xanh lá", "s": 11, "vol": 3, "cp": ["绿洲 (ốc đảo)", "草木青绿 (cỏ cây xanh ngắt)"], "eg": "深谷之中有一汪绿水。(Trong hẻm núi sâu có một đầm nước xanh biếc.)"},

    # Quyển 4: Động Tác & Sinh Tử (61-80)
    {"ch": "好", "py": "hǎo", "hv": "hảo", "m": "tốt, lành, đẹp", "s": 6, "vol": 4, "cp": ["极好 (cực tốt)", "好久 (rất lâu)"], "eg": "这真是一颗好丹药。(Đây thật sự là một viên linh đan tuyệt hảo.)"},
    {"ch": "生", "py": "shēng", "hv": "sinh", "m": "sống, sinh ra", "s": 5, "vol": 4, "cp": ["生死 (sinh tử)", "生命 (sinh mệnh)"], "eg": "参透生死意境。(Tham thấu Sinh Tử Ý Cảnh.)"},
    {"ch": "死", "py": "sǐ", "hv": "tử", "m": "chết, tiêu vong", "s": 6, "vol": 4, "cp": ["死气 (tử khí)", "生死道 (đạo sinh tử)"], "eg": "生是死的开始，死是生的起点。(Sinh là khởi đầu của tử, tử là điểm về của sinh.)"},
    {"ch": "看", "py": "kàn", "hv": "khán", "m": "nhìn, xem xét", "s": 9, "vol": 4, "cp": ["看见 (nhìn thấy)", "观看 (quan sát)"], "eg": "王林仔细看去。(Vương Lâm nhìn kỹ lại.)"},
    {"ch": "见", "py": "jiàn", "hv": "kiến", "m": "thấy, gặp gỡ", "s": 4, "vol": 4, "cp": ["相见 (gặp gỡ)", "再见 (hẹn gặp lại)"], "eg": "终于见到了师尊。(Cuối cùng đã gặp được sư tôn.)"},
    {"ch": "听", "py": "tīng", "hv": "thính", "m": "lắng nghe", "s": 7, "vol": 4, "cp": ["听到 (nghe thấy)", "静听 (lắng nghe)"], "eg": "静听天地风雨声。(Lắng nghe tiếng gió mưa trong trời đất.)"},
    {"ch": "说", "py": "shuō", "hv": "thuyết", "m": "nói, đàm luận", "s": 9, "vol": 4, "cp": ["传闻 (nghe đồn)", "说明 (nói rõ)"], "eg": "司徒南沉声说道。(Tư Đồ Nam trầm giọng nói.)"},
    {"ch": "读", "py": "dú", "hv": "độc", "m": "đọc sách", "s": 10, "vol": 4, "cp": ["读书 (đọc sách)", "朗读 (đọc to)"], "eg": "细读这门无上仙法。(Đọc kỹ môn tiên pháp vô thượng này.)"},
    {"ch": "写", "py": "xiě", "hv": "tả", "m": "viết, vẽ bùa", "s": 5, "vol": 4, "cp": ["写字 (viết chữ)", "画符 (vẽ phù lục)"], "eg": "提起朱砂笔写下一道神符。(Cầm bút chu sa viết nên một đạo thần phù.)"},
    {"ch": "学", "py": "xué", "hv": "học", "m": "học tập, rèn luyện", "s": 8, "vol": 4, "cp": ["修学 (học tập)", "学会 (học được)"], "eg": "他很快学会了引力术。(Hắn rất nhanh đã học được Dẫn Lực Thuật.)"},
    {"ch": "吃", "py": "chī", "hv": "ngật", "m": "ăn, phục dụng", "s": 6, "vol": 4, "cp": ["吃下 (nuốt vào)", "服食 (ăn uống)"], "eg": "服下这颗灵药。(Uống viên linh dược này vào.)"},
    {"ch": "喝", "py": "hē", "hv": "hát", "m": "uống nước, uống rượu", "s": 12, "vol": 4, "cp": ["喝酒 (uống rượu)", "喝茶 (uống trà)"], "eg": "举杯喝下一壶仙酿。(Nâng chén uống cạn một vò tiên tửu.)"},
    {"ch": "走", "py": "zǒu", "hv": "tẩu", "m": "bước đi, hành tẩu", "s": 7, "vol": 4, "cp": ["行走 (hành tẩu)", "走进 (bước vào)"], "eg": "王林独自一人向前走去。(Vương Lâm một mình rảo bước đi về phía trước.)"},
    {"ch": "来", "py": "lái", "hv": "lai", "m": "đến, trở về", "s": 7, "vol": 4, "cp": ["归来 (trở về)", "来到 (đến nơi)"], "eg": "历经沧桑终归来。(Trải qua vạn dặm dâu bể rốt cuộc cũng trở về.)"},
    {"ch": "去", "py": "qù", "hv": "khứ", "m": "đi xa", "s": 5, "vol": 4, "cp": ["前去 (đi tới)", "归去 (trở về)"], "eg": "化作一道长虹远去。(Hóa thành một dải cầu vồng bay xa.)"},
    {"ch": "出", "py": "chū", "hv": "xuất", "m": "ra ngoài, xuất thủ", "s": 5, "vol": 4, "cp": ["出手 (xuất thủ)", "出关 (xuất quan)"], "eg": "闭关百年今日出关！(Bế quan trăm năm, hôm nay xuất quan!)"},
    {"ch": "入", "py": "rù", "hv": "nhập", "m": "vào trong, nhập môn", "s": 2, "vol": 4, "cp": ["入门 (nhập môn)", "进入 (đi vào)"], "eg": "进入天逆空间。(Đi vào trong không gian Thiên Nghịch Châu.)"},
    {"ch": "开", "py": "kāi", "hv": "khai", "m": "mở ra, khai sơn", "s": 4, "vol": 4, "cp": ["开启 (mở ra)", "开山 (khai sơn)"], "eg": "开启储物袋。(Mở túi trữ vật ra.)"},
    {"ch": "关", "py": "guān", "hv": "quan", "m": "đóng lại, cửa ải", "s": 6, "vol": 4, "cp": ["关门 (đóng cửa)", "冲关 (vượt ải)"], "eg": "正在全力冲刺元婴大关。(Đang dốc toàn lực đột phá đại quan Nguyên Anh.)"},
    {"ch": "问", "py": "wèn", "hv": "vấn", "m": "hỏi han, vấn đỉnh", "s": 6, "vol": 4, "cp": ["问鼎 (vấn đỉnh)", "请问 (xin hỏi)"], "eg": "问鼎修真巅峰！(Vấn đỉnh đỉnh cao tu chân!)"},

    # Quyển 5: Đạo Pháp & Tiên Ma (81-100)
    {"ch": "答", "py": "dá", "hv": "đáp", "m": "trả lời, giải đáp", "s": 12, "vol": 5, "cp": ["回答 (trả lời)", "答谢 (đáp tạ)"], "eg": "前辈解答了他的疑惑。(Tiền bối đã giải đáp nỗi thắc mắc của hắn.)"},
    {"ch": "买", "py": "mǎi", "hv": "mãi", "m": "mua sắm", "s": 6, "vol": 5, "cp": ["买下 (mua lấy)", "买卖 (buôn bán)"], "eg": "在坊市买下所需灵药。(Ở phường thị mua linh dược cần thiết.)"},
    {"ch": "卖", "py": "mài", "hv": "mại", "m": "bán ra", "s": 8, "vol": 5, "cp": ["出售 (bán ra)", "叫卖 (rao bán)"], "eg": "将妖兽精魄卖予商行。(Đem tinh phách yêu thú bán cho thương hội.)"},
    {"ch": "明", "py": "míng", "hv": "minh", "m": "sáng tỏ, rõ ràng", "s": 8, "vol": 5, "cp": ["明悟 (ngộ ra)", "光明 (quang minh)"], "eg": "心中豁然明朗。(Trong lòng bỗng chốc sáng tỏ thông suốt.)"},
    {"ch": "剑", "py": "jiàn", "hv": "kiếm", "m": "thanh kiếm, phi kiếm", "s": 9, "vol": 5, "cp": ["飞剑 (phi kiếm)", "剑气 (kiếm khí)"], "eg": "飞剑斩出漫天寒芒。(Phi kiếm chém ra luồng hàn quang ngợp trời.)"},
    {"ch": "道", "py": "dào", "hv": "đạo", "m": "con đường, thiên đạo", "s": 12, "vol": 5, "cp": ["天道 (thiên đạo)", "修道 (tu đạo)"], "eg": "顺应天道为凡，逆修天道为仙！(Thuận theo thiên đạo là phàm, nghịch sửa thiên đạo là tiên!)"},
    {"ch": "丹", "py": "dān", "hv": "đan", "m": "viên đan, đan dược", "s": 4, "vol": 5, "cp": ["筑基丹 (Trúc Cơ Đan)", "金丹 (Kim Đan)"], "eg": "吞下一颗筑基丹。(Nuốt một viên Trúc Cơ Đan.)"},
    {"ch": "仙", "py": "xiān", "hv": "tiên", "m": "tiên nhân, tiên đạo", "s": 5, "vol": 5, "cp": ["修仙 (tu tiên)", "仙剑 (tiên kiếm)"], "eg": "踏上逆天求仙之路。(Bước lên con đường nghịch thiên cầu tiên.)"},
    {"ch": "魔", "py": "mó", "hv": "ma", "m": "ma đạo, sát phạt", "s": 21, "vol": 5, "cp": ["修魔海 (Tu Ma Hải)", "魔头 (ma đầu)"], "eg": "身在修魔海，心存浩然意。(Thân ở Tu Ma Hải, tâm giữ ý chí hiên ngang.)"},
    {"ch": "神", "py": "shén", "hv": "thần", "m": "thần thức, cổ thần", "s": 9, "vol": 5, "cp": ["神识 (thần thức)", "古神 (Cổ Thần)"], "eg": "极境神识无敌同阶！(Cực Cảnh Thần Thức vô địch cùng cấp!)"},
    {"ch": "年", "py": "nián", "hv": "niên", "m": "năm tháng", "s": 6, "vol": 5, "cp": ["百年 (trăm năm)", "千年 (nghìn năm)"], "eg": "苦修数百年。(Khổ tu hàng trăm năm.)"},
    {"ch": "时", "py": "shí", "hv": "thời", "m": "thời gian, thời cơ", "s": 7, "vol": 5, "cp": ["时机 (thời cơ)", "岁月 (thời gian)"], "eg": "突破时机已到。(Thời cơ đột phá đã đến.)"},
    {"ch": "分", "py": "fēn", "hv": "phân", "m": "phân chia, phút", "s": 4, "vol": 5, "cp": ["分别 (phân biệt)", "分出 (chia ra)"], "eg": "分出一缕神念。(Tách ra một tia thần niệm.)"},
    {"ch": "点", "py": "diǎn", "hv": "điểm", "m": "chỉ điểm, giọt", "s": 9, "vol": 5, "cp": ["指点 (chỉ điểm)", "一点 (một chút)"], "eg": "得高人指点迷津。(Được cao nhân chỉ điểm soi sáng đường đi.)"},
    {"ch": "话", "py": "huà", "hv": "thoại", "m": "lời nói, đàm thoại", "s": 8, "vol": 5, "cp": ["神话 (thần thoại)", "话语 (lời nói)"], "eg": "司徒南的话在脑海回荡。(Lời của Tư Đồ Nam vang vọng trong tâm trí.)"},
    {"ch": "字", "py": "zì", "hv": "tự", "m": "chữ Hán, đạo văn", "s": 6, "vol": 5, "cp": ["汉字 (chữ Hán)", "文字 (văn tự)"], "eg": "悟透这枚远古文字。(Ngộ thấu chữ văn tự viễn cổ này.)"},
    {"ch": "车", "py": "chē", "hv": "xa", "m": "xe cộ, chiến xa", "s": 4, "vol": 5, "cp": ["战车 (chiến xa)", "飞车 (phi xa)"], "eg": "古神战车碾压虚空。(Chiến xa Cổ Thần nghiền nát hư không.)"},
    {"ch": "书", "py": "shū", "hv": "thư", "m": "kinh thư, sách vở", "s": 4, "vol": 5, "cp": ["秘籍 (bí tịch)", "经书 (kinh thư)"], "eg": "手捧一本古卷经书。(Tay nâng một cuốn kinh thư cổ điển.)"},
    {"ch": "鱼", "py": "yú", "hv": "ngư", "m": "loài cá, linh ngư", "s": 8, "vol": 5, "cp": ["灵鱼 (linh ngư)", "金鱼 (kim ngư)"], "eg": "聚灵池中游荡着金鳞灵鱼。(Trong hồ Tụ Linh cá linh vẩy vàng đang bơi lội.)"},
    {"ch": "鸟", "py": "niǎo", "hv": "điểu", "m": "loài chim, chu tước", "s": 5, "vol": 5, "cp": ["青鸟 (thanh điểu)", "神鸟 (thần điểu)"], "eg": "朱雀神鸟长鸣九天。(Thần điểu Chu Tước hót vang chín tầng trời.)"}
]

RADICALS_214 = [
    # 1 nét (1-6)
    {"id": 1, "r": "一", "n": "Nhất", "s": 1, "m": "Số một, bắt đầu, đồng nhất", "ex": "七、三、不"},
    {"id": 2, "r": "丨", "n": "Cổn", "s": 1, "m": "Nét sổ thẳng đứng", "ex": "中、丰、串"},
    {"id": 3, "r": "丶", "n": "Chủ", "s": 1, "m": "Dấu chấm, đốm lửa, điểm nhấn", "ex": "丸、凡、丹"},
    {"id": 4, "r": "丿", "n": "Phiệt", "s": 1, "m": "Nét phẩy nghiêng trái", "ex": "久、升、生"},
    {"id": 5, "r": "乙/乛", "n": "Ất", "s": 1, "m": "Can thứ hai, uốn lượn", "ex": "九、也、习"},
    {"id": 6, "r": "亅", "n": "Quyết", "s": 1, "m": "Nét móc đứng", "ex": "了、予、事"},

    # 2 nét (7-29)
    {"id": 7, "r": "二", "n": "Nhị", "s": 2, "m": "Số hai, cân bằng", "ex": "于、云、五"},
    {"id": 8, "r": "亠", "n": "Đầu", "s": 2, "m": "Mái chóp, phần đỉnh", "ex": "亡、交、京"},
    {"id": 9, "r": "人/亻", "n": "Nhân", "s": 2, "m": "Con người, hành vi con người", "ex": "仙、修、你"},
    {"id": 10, "r": "儿", "n": "Nhi", "s": 2, "m": "Đứa trẻ, đôi chân người đi", "ex": "先、元、光"},
    {"id": 11, "r": "入", "n": "Nhập", "s": 2, "m": "Đi vào, thâm nhập", "ex": "内、全、两"},
    {"id": 12, "r": "八/丷", "n": "Bát", "s": 2, "m": "Số tám, chia rẽ hai bên", "ex": "公、六、共"},
    {"id": 13, "r": "冂", "n": "Quynh", "s": 2, "m": "Vùng biên cương xa xôi", "ex": "冈、冉、册"},
    {"id": 14, "r": "冖", "n": "Mịch", "s": 2, "m": "Khăn trùm, che phủ", "ex": "军、写、冠"},
    {"id": 15, "r": "冫", "n": "Băng", "s": 2, "m": "Băng giá, lạnh lẽo, đông cứng", "ex": "冷、冻、冰"},
    {"id": 16, "r": "几", "n": "Kỷ", "s": 2, "m": "Cái bàn trà nhỏ, ghế đẩu", "ex": "凡、凤、凭"},
    {"id": 17, "r": "凵", "n": "Khảm", "s": 2, "m": "Hố sâu, đồ đựng rỗng", "ex": "凶、出、击"},
    {"id": 18, "r": "刀/刂", "n": "Đao", "s": 2, "m": "Con dao, thanh kiếm, chém phạt", "ex": "剑、分、别"},
    {"id": 19, "r": "力", "n": "Lực", "s": 2, "m": "Sức mạnh, công lực, bắp thịt", "ex": "功、加、势"},
    {"id": 20, "r": "勹", "n": "Bao", "s": 2, "m": "Bao bọc, ôm lấy", "ex": "包、句、旬"},
    {"id": 21, "r": "匕", "n": "Chủy", "s": 2, "m": "Cái thìa, con dao găm nhỏ", "ex": "化、北、匙"},
    {"id": 22, "r": "匚", "n": "Phương", "s": 2, "m": "Hòm gỗ, tủ đựng đồ", "ex": "匠、匡、匣"},
    {"id": 23, "r": "匸", "n": "Hệ", "s": 2, "m": "Che giấu, cất kín", "ex": "匹、区、医"},
    {"id": 24, "r": "十", "n": "Thập", "s": 2, "m": "Số mười, hoàn mỹ, giao điểm", "ex": "古、千、博"},
    {"id": 25, "r": "卜", "n": "Bặc", "s": 2, "m": "Bói toán, tiên tri thiên cơ", "ex": "卡、占、卦"},
    {"id": 26, "r": "卩/⺋", "n": "Tiết", "s": 2, "m": "Đốt tre, ấn tín, người quỳ", "ex": "印、却、危"},
    {"id": 27, "r": "厂", "n": "Hán", "s": 2, "m": "Sườn núi dốc, vách đá", "ex": "原、厚、厉"},
    {"id": 28, "r": "厶", "n": "Khư", "s": 2, "m": "Riêng tư, kín đáo", "ex": "去、县、参"},
    {"id": 29, "r": "又", "n": "Hựu", "s": 2, "m": "Bàn tay phải, lặp lại", "ex": "反、友、发"},

    # 3 nét (30-60)
    {"id": 30, "r": "口", "n": "Khẩu", "s": 3, "m": "Cái miệng, ăn uống, lời nói", "ex": "叫、吃、问"},
    {"id": 31, "r": "囗", "n": "Vi", "s": 3, "m": "Vây quanh, tường thành kiên cố", "ex": "四、国、回"},
    {"id": 32, "r": "土", "n": "Thổ", "s": 3, "m": "Đất đai, ngũ hành thổ", "ex": "地、城、在"},
    {"id": 33, "r": "士", "n": "Sĩ", "s": 3, "m": "Kẻ sĩ, tu sĩ, người có tài", "ex": "壮、声、壹"},
    {"id": 34, "r": "夂", "n": "Truy", "s": 3, "m": "Đi sau, theo đuôi", "ex": "处、条、备"},
    {"id": 35, "r": "夊", "n": "Tuy", "s": 3, "m": "Bước đi chậm rãi", "ex": "复、夏、夔"},
    {"id": 36, "r": "夕", "n": "Tịch", "s": 3, "m": "Buổi chiều tối, hoàng hôn", "ex": "夜、多、够"},
    {"id": 37, "r": "大", "n": "Đại", "s": 3, "m": "To lớn, vĩ đại", "ex": "天、太、头"},
    {"id": 38, "r": "女", "n": "Nữ", "s": 3, "m": "Người nữ, mẹ hiền", "ex": "好、如、始"},
    {"id": 39, "r": "子", "n": "Tử", "s": 3, "m": "Đứa con, đệ tử", "ex": "字、学、存"},
    {"id": 40, "r": "宀", "n": "Miên", "s": 3, "m": "Mái nhà, phủ đệ", "ex": "安、宗、家"},
    {"id": 41, "r": "寸", "n": "Thốn", "s": 3, "m": "Đơn vị tấc, quy củ, bàn tay", "ex": "封、射、寻"},
    {"id": 42, "r": "小/⺌", "n": "Tiểu", "s": 3, "m": "Nhỏ bé, vi mô", "ex": "少、尖、尘"},
    {"id": 43, "r": "尢/尣", "n": "Uông", "s": 3, "m": "Chân què, khập khiễng", "ex": "尤、就、尬"},
    {"id": 44, "r": "尸", "n": "Thi", "s": 3, "m": "Xác chết, thân thể, ngôi nhà", "ex": "居、展、属"},
    {"id": 45, "r": "屮", "n": "Triệt", "s": 3, "m": "Mầm cỏ mới nhú", "ex": "屯、出、屮"},
    {"id": 46, "r": "山", "n": "Sơn", "s": 3, "m": "Ngọn núi, linh sơn", "ex": "岳、峰、岛"},
    {"id": 47, "r": "巛/川", "n": "Xuyên", "s": 3, "m": "Dòng sông, dòng chảy vô tận", "ex": "州、巡、顺"},
    {"id": 48, "r": "工", "n": "Công", "s": 3, "m": "Thợ thủ công, công cụ làm việc", "ex": "左、巧、巨"},
    {"id": 49, "r": "己/已/巳", "n": "Kỷ", "s": 3, "m": "Bản thân mình, can thứ sáu", "ex": "巴、异、导"},
    {"id": 50, "r": "巾", "n": "Cân", "s": 3, "m": "Khăn vải, cờ lệnh", "ex": "市、常、带"},
    {"id": 51, "r": "干", "n": "Can", "s": 3, "m": "Lá chắn khiên giáp, can thiệp", "ex": "平、年、并"},
    {"id": 52, "r": "幺", "n": "Yêu", "s": 3, "m": "Nhỏ bé, sợi tơ mảnh", "ex": "幻、幼、幽"},
    {"id": 53, "r": "广", "n": "Quảng", "s": 3, "m": "Mái hiên rộng, dinh điện", "ex": "座、庄、府"},
    {"id": 54, "r": "廴", "n": "Dẫn", "s": 3, "m": "Bước đi dài, kéo dài", "ex": "延、廷、建"},
    {"id": 55, "r": "廾", "n": "Củng", "s": 3, "m": "Hai tay chắp lại dâng lên", "ex": "开、弁、异"},
    {"id": 56, "r": "弋", "n": "Dặc", "s": 3, "m": "Mũi tên có buộc dây", "ex": "式、弑、武"},
    {"id": 57, "r": "弓", "n": "Cung", "s": 3, "m": "Cây cung bắn tên", "ex": "引、张、强"},
    {"id": 58, "r": "彐/彑", "n": "Kệ", "s": 3, "m": "Đầu con heo rừng", "ex": "当、归、寻"},
    {"id": 59, "r": "彡", "n": "Sam", "s": 3, "m": "Lông sam dài, hoa văn", "ex": "形、彩、影"},
    {"id": 60, "r": "彳", "n": "Sách", "s": 3, "m": "Bước chân bên trái, hành lang", "ex": "行、很、律"},

    # 4 nét (61-94)
    {"id": 61, "r": "心/忄", "n": "Tâm", "s": 4, "m": "Trái tim, tình cảm, đạo tâm", "ex": "情、想、感"},
    {"id": 62, "r": "戈", "n": "Qua", "s": 4, "m": "Ngọn giáo mác, chiến tranh", "ex": "战、戏、戒"},
    {"id": 63, "r": "戶/户", "n": "Hộ", "s": 4, "m": "Cánh cửa một cánh, hộ gia đình", "ex": "房、所、扇"},
    {"id": 64, "r": "手/扌", "n": "Thủ", "s": 4, "m": "Bàn tay, thao tác xuất thủ", "ex": "打、抓、按"},
    {"id": 65, "r": "支", "n": "Chi", "s": 4, "m": "Cành cây, chống đỡ", "ex": "支、翅、鼓"},
    {"id": 66, "r": "攴/攵", "n": "Phác", "s": 4, "m": "Gõ nhẹ, đánh đòn", "ex": "改、攻、教"},
    {"id": 67, "r": "文", "n": "Văn", "s": 4, "m": "Chữ viết, văn tự, hoa văn", "ex": "文、齐、斋"},
    {"id": 68, "r": "斗", "n": "Đẩu", "s": 4, "m": "Cái đấu đong rượu gạo", "ex": "料、斛、斜"},
    {"id": 69, "r": "斤", "n": "Cân", "s": 4, "m": "Cái rìu bổ củi, cân nặng", "ex": "断、斩、新"},
    {"id": 70, "r": "方", "n": "Phương", "s": 4, "m": "Phương hướng, góc vuông", "ex": "施、旁、族"},
    {"id": 71, "r": "无", "n": "Vô", "s": 4, "m": "Không có, hư vô", "ex": "无、既、旡"},
    {"id": 72, "r": "日", "n": "Nhật", "s": 4, "m": "Mặt trời, ánh sáng, ban ngày", "ex": "明、春、易"},
    {"id": 73, "r": "曰", "n": "Viết", "s": 4, "m": "Nói rằng, đàm luận", "ex": "曰、曲、更"},
    {"id": 74, "r": "月", "n": "Nguyệt", "s": 4, "m": "Mặt trăng; thân thể thịt (nhục)", "ex": "朝、望、期"},
    {"id": 75, "r": "木", "n": "Mộc", "s": 4, "m": "Cây cối, gỗ rừng", "ex": "林、根、样"},
    {"id": 76, "r": "欠", "n": "Khiếm", "s": 4, "m": "Há miệng thở, thiếu hụt", "ex": "歌、欧、次"},
    {"id": 77, "r": "止", "n": "Chỉ", "s": 4, "m": "Dừng lại, đứng yên", "ex": "正、步、武"},
    {"id": 78, "r": "歹/歺", "n": "Đãi", "s": 4, "m": "Xương tàn, chết chóc", "ex": "死、残、殊"},
    {"id": 79, "r": "殳", "n": "Thù", "s": 4, "m": "Binh khí gỗ đánh đập", "ex": "段、殷、殿"},
    {"id": 80, "r": "毋/母", "n": "Vô/Mẫu", "s": 4, "m": "Đừng làm; người mẹ", "ex": "每、毒、贯"},
    {"id": 81, "r": "比", "n": "Bỉ", "s": 4, "m": "So sánh, sóng đôi", "ex": "毕、毙、毖"},
    {"id": 82, "r": "毛", "n": "Mao", "s": 4, "m": "Lông tóc, nhung mịn", "ex": "毫、毯、毡"},
    {"id": 83, "r": "氏", "n": "Thị", "s": 4, "m": "Dòng họ, thị tộc", "ex": "民、氓、氐"},
    {"id": 84, "r": "气", "n": "Khí", "s": 4, "m": "Linh khí, hơi thở", "ex": "氛、氧、氮"},
    {"id": 85, "r": "水/氵", "n": "Thủy", "s": 4, "m": "Dòng nước, chất lỏng", "ex": "海、江、清"},
    {"id": 86, "r": "火/灬", "n": "Hỏa", "s": 4, "m": "Ngọn lửa, đan hỏa", "ex": "热、然、炼"},
    {"id": 87, "r": "爪/爫", "n": "Trảo", "s": 4, "m": "Móng vuốt thú dữ", "ex": "爬、爱、妥"},
    {"id": 88, "r": "父", "n": "Phụ", "s": 4, "m": "Người cha, phụ mẫu", "ex": "爷、爸、爹"},
    {"id": 89, "r": "爻", "n": "Hào", "s": 4, "m": "Các hào trong Kinh Dịch", "ex": "爽、尔、爻"},
    {"id": 90, "r": "爿/丬", "n": "Tường", "s": 4, "m": "Mảnh gỗ xẻ bên trái", "ex": "壮、状、将"},
    {"id": 91, "r": "片", "n": "Phiến", "s": 4, "m": "Mảnh gỗ xẻ bên phải", "ex": "版、牌、牒"},
    {"id": 92, "r": "牙", "n": "Nha", "s": 4, "m": "Răng nanh thú", "ex": "邪、芽、雅"},
    {"id": 93, "r": "牛/牜", "n": "Ngưu", "s": 4, "m": "Con trâu, con bò", "ex": "物、特、牧"},
    {"id": 94, "r": "犬/犭", "n": "Khuyển", "s": 4, "m": "Loài chó săn, thú ăn thịt", "ex": "狂、独、猛"},

    # 5 nét (95-117)
    {"id": 95, "r": "玄", "n": "Huyền", "s": 5, "m": "Huyền bí, màu đen sâu thẳm", "ex": "率、玄、玆"},
    {"id": 96, "r": "玉/王", "n": "Ngọc/Vương", "s": 5, "m": "Ngọc báu quý giá, đế vương", "ex": "玩、现、珍"},
    {"id": 97, "r": "瓜", "n": "Qua", "s": 5, "m": "Dưa quả leo giàn", "ex": "瓣、瓤、瓠"},
    {"id": 98, "r": "瓦", "n": "Ngõa", "s": 5, "m": "Gạch ngói đất nung", "ex": "瓶、瓷、瓮"},
    {"id": 99, "r": "甘", "n": "Cam", "s": 5, "m": "Vị ngọt, cam lòng", "ex": "甚、甜、某"},
    {"id": 100, "r": "生", "n": "Sinh", "s": 5, "m": "Sinh sôi nảy nở, sống", "ex": "产、甥、苏"},
    {"id": 101, "r": "用", "n": "Dụng", "s": 5, "m": "Sử dụng, ứng dụng", "ex": "甩、甫、佣"},
    {"id": 102, "r": "田", "n": "Điền", "s": 5, "m": "Ruộng đồng, ô đất", "ex": "界、留、男"},
    {"id": 103, "r": "疋/⽾", "n": "Sơ", "s": 5, "m": "Bàn chân bước, xấp vải", "ex": "疏、疑、蛋"},
    {"id": 104, "r": "疒", "n": "Nạch", "s": 5, "m": "Bệnh tật, đau đớn", "ex": "病、痛、疗"},
    {"id": 105, "r": "癶", "n": "Bát", "s": 5, "m": "Hai chân gập lại giẫm đất", "ex": "癸、登、发"},
    {"id": 106, "r": "白", "n": "Bạch", "s": 5, "m": "Màu trắng tinh khiết", "ex": "百、皇、皆"},
    {"id": 107, "r": "皮", "n": "Bì", "s": 5, "m": "Da thú, vỏ ngoài", "ex": "破、颇、疲"},
    {"id": 108, "r": "皿", "n": "Mãnh", "s": 5, "m": "Bát đĩa, đồ đựng thức ăn", "ex": "盆、益、盘"},
    {"id": 109, "r": "目", "n": "Mục", "s": 5, "m": "Con mắt, nhìn ngắm", "ex": "看、眼、睛"},
    {"id": 110, "r": "矛", "n": "Mâu", "s": 5, "m": "Ngọn giáo mâu đâm thủng", "ex": "矜、矟、柔"},
    {"id": 111, "r": "矢", "n": "Thỉ", "s": 5, "m": "Mũi tên bay thẳng", "ex": "知、短、矩"},
    {"id": 112, "r": "石", "n": "Thạch", "s": 5, "m": "Hòn đá, linh thạch", "ex": "破、硬、确"},
    {"id": 113, "r": "示/礻", "n": "Thị", "s": 5, "m": "Bàn thờ, thần linh phù hộ", "ex": "神、祖、礼"},
    {"id": 114, "r": "禸", "n": "Nhựu", "s": 5, "m": "Dấu chân dã thú", "ex": "禹、离、禽"},
    {"id": 115, "r": "禾", "n": "Hòa", "s": 5, "m": "Cây lúa trĩu bông", "ex": "秋、种、私"},
    {"id": 116, "r": "穴", "n": "Huyệt", "s": 5, "m": "Hang động ngầm", "ex": "空、穿、究"},
    {"id": 117, "r": "立", "n": "Lập", "s": 5, "m": "Đứng vững trên mặt đất", "ex": "站、端、竞"},

    # 6 nét (118-146)
    {"id": 118, "r": "竹/⺮", "n": "Trúc", "s": 6, "m": "Cây tre, ống sáo trúc", "ex": "笔、符、笑"},
    {"id": 119, "r": "米", "n": "Mễ", "s": 6, "m": "Hạt gạo, lương thực", "ex": "精、类、粉"},
    {"id": 120, "r": "糸/纟", "n": "Mịch", "s": 6, "m": "Sợi tơ mảnh, dây buộc", "ex": "红、结、绝"},
    {"id": 121, "r": "缶", "n": "Phẫu", "s": 6, "m": "Chum vò đất nung", "ex": "缺、缸、罐"},
    {"id": 122, "r": "网/罒", "n": "Võng", "s": 6, "m": "Tấm lưới đánh bắt", "ex": "罗、置、罩"},
    {"id": 123, "r": "羊", "n": "Dương", "s": 6, "m": "Con dê, tốt lành", "ex": "美、群、着"},
    {"id": 124, "r": "羽", "n": "Vũ", "s": 6, "m": "Lông chim, cánh bay", "ex": "翼、翔、扇"},
    {"id": 125, "r": "老/耂", "n": "Lão", "s": 6, "m": "Người già tóc bạc", "ex": "者、考、教"},
    {"id": 126, "r": "而", "n": "Nhi", "s": 6, "m": "Râu mép; liên từ mà", "ex": "耍、耐、端"},
    {"id": 127, "r": "耒", "n": "Lỗi", "s": 6, "m": "Cái cày bừa đất", "ex": "耕、耗、耘"},
    {"id": 128, "r": "耳", "n": "Nhĩ", "s": 6, "m": "Tai lắng nghe", "ex": "闻、聪、聚"},
    {"id": 129, "r": "聿", "n": "Duật", "s": 6, "m": "Cây bút cầm tay viết", "ex": "肃、肆、肇"},
    {"id": 130, "r": "肉/月", "n": "Nhục", "s": 6, "m": "Thịt thân thể, cơ bắp", "ex": "能、脂、肥"},
    {"id": 131, "r": "臣", "n": "Thần", "s": 6, "m": "Bầy tôi bề dưới", "ex": "卧、臧、临"},
    {"id": 132, "r": "自", "n": "Tự", "s": 6, "m": "Cái mũi, tự mình", "ex": "臭、息、鼻"},
    {"id": 133, "r": "至", "n": "Chí", "s": 6, "m": "Mũi tên bay tới đích", "ex": "致、到、臻"},
    {"id": 134, "r": "臼", "n": "Cữu", "s": 6, "m": "Cối giã gạo đá", "ex": "毁、舅、舀"},
    {"id": 135, "r": "舌", "n": "Thiệt", "s": 6, "m": "Cái lưỡi nếm vị", "ex": "乱、甜、舒"},
    {"id": 136, "r": "舛", "n": "Suyễn", "s": 6, "m": "Hai chân quay nghịch", "ex": "舜、舞、舛"},
    {"id": 137, "r": "舟", "n": "Chu", "s": 6, "m": "Chiếc thuyền phi chu", "ex": "船、般、航"},
    {"id": 138, "r": "艮", "n": "Cấn", "s": 6, "m": "Quẻ Cấn, kiên định", "ex": "很、根、眼"},
    {"id": 139, "r": "色", "n": "Sắc", "s": 6, "m": "Màu sắc, thần sắc", "ex": "艳、绝、色"},
    {"id": 140, "r": "艸/艹", "n": "Thảo", "s": 6, "m": "Cỏ cây hoa lá, linh dược", "ex": "草、药、花"},
    {"id": 141, "r": "虍", "n": "Hổ", "s": 6, "m": "Vằn lông cọp dữ", "ex": "虎、虚、虑"},
    {"id": 142, "r": "虫", "n": "Trùng", "s": 6, "m": "Côn trùng sâu bọ", "ex": "虽、蛇、蛮"},
    {"id": 143, "r": "血", "n": "Huyết", "s": 6, "m": "Máu trong huyết mạch", "ex": "众、衅、衄"},
    {"id": 144, "r": "行", "n": "Hành", "s": 6, "m": "Hành tẩu, ngã tư đường", "ex": "术、街、衙"},
    {"id": 145, "r": "衣/衤", "n": "Y", "s": 6, "m": "Quần áo y phục, pháp bào", "ex": "初、被、装"},
    {"id": 146, "r": "襾/覀", "n": "Á", "s": 6, "m": "Đậy nắp lại, phương tây", "ex": "西、要、覆"},

    # 7 nét (147-166)
    {"id": 147, "r": "見/见", "n": "Kiến", "s": 7, "m": "Mắt nhìn thấy, gặp gỡ", "ex": "规、观、视"},
    {"id": 148, "r": "角", "n": "Giác", "s": 7, "m": "Sừng linh thú, góc nhọn", "ex": "解、触、触"},
    {"id": 149, "r": "言/讠", "n": "Ngôn", "s": 7, "m": "Lời nói, ngôn ngữ", "ex": "说、话、语"},
    {"id": 150, "r": "谷", "n": "Cốc", "s": 7, "m": "Thung lũng sâu, khe núi", "ex": "豁、欲、却"},
    {"id": 151, "r": "豆", "n": "Đậu", "s": 7, "m": "Hạt đậu, đài tế thần", "ex": "登、短、豉"},
    {"id": 152, "r": "豕", "n": "Thỉ", "s": 7, "m": "Con heo lợn", "ex": "象、豪、豫"},
    {"id": 153, "r": "豸", "n": "Trĩ", "s": 7, "m": "Loài mãnh thú không sừng", "ex": "貌、豹、豺"},
    {"id": 154, "r": "貝/贝", "n": "Bối", "s": 7, "m": "Vỏ sò tiền tệ ngày xưa", "ex": "财、贵、贼"},
    {"id": 155, "r": "赤", "n": "Xích", "s": 7, "m": "Màu đỏ rực, trần trụi", "ex": "赫、赭、赦"},
    {"id": 156, "r": "走", "n": "Tẩu", "s": 7, "m": "Chạy nhanh, bước đi", "ex": "起、越、超"},
    {"id": 157, "r": "足/𧾷", "n": "Túc", "s": 7, "m": "Bàn chân giẫm bước", "ex": "路、跳、跟"},
    {"id": 158, "r": "身", "n": "Thân", "s": 7, "m": "Thân thể, nhục thân", "ex": "躯、躲、躺"},
    {"id": 159, "r": "車/车", "n": "Xa", "s": 7, "m": "Cỗ xe bánh tròn", "ex": "转、轻、轮"},
    {"id": 160, "r": "辛", "n": "Tân", "s": 7, "m": "Vị cay đắng, khổ cực", "ex": "辜、辟、辣"},
    {"id": 161, "r": "辰", "n": "Thần", "s": 7, "m": "Can Thần, rồng bay, sao", "ex": "晨、农、辱"},
    {"id": 162, "r": "辵/辶", "n": "Sước", "s": 7, "m": "Vừa đi vừa dừng", "ex": "道、进、逆"},
    {"id": 163, "r": "邑/阝(hữu)", "n": "Ấp", "s": 7, "m": "Xóm làng, đô thành", "ex": "部、都、郭"},
    {"id": 164, "r": "酉", "n": "Dậu", "s": 7, "m": "Vò rượu ủ men", "ex": "酒、醉、配"},
    {"id": 165, "r": "釆", "n": "Biện", "s": 7, "m": "Phân biệt rõ ràng", "ex": "释、番、釉"},
    {"id": 166, "r": "里", "n": "Lý", "s": 7, "m": "Làng quê, dặm đường", "ex": "重、野、量"},

    # 8 nét (167-175)
    {"id": 167, "r": "金/钅", "n": "Kim", "s": 8, "m": "Kim loại, phi kiếm sắt", "ex": "银、铁、锋"},
    {"id": 168, "r": "長/长", "n": "Trường", "s": 8, "m": "Dài lâu, trưởng bối", "ex": "肆、套、张"},
    {"id": 169, "r": "門/门", "n": "Môn", "s": 8, "m": "Cánh cổng lớn môn phái", "ex": "开、闭、闪"},
    {"id": 170, "r": "阜/阝(tả)", "n": "Phụ", "s": 8, "m": "Gò đất cao phòng ngự", "ex": "防、降、阳"},
    {"id": 171, "r": "隶", "n": "Đãi", "s": 8, "m": "Bắt kịp, nô bộc", "ex": "隶、逮、隶"},
    {"id": 172, "r": "隹", "n": "Chuy", "s": 8, "m": "Chim đuôi ngắn", "ex": "集、难、谁"},
    {"id": 173, "r": "雨", "n": "Vũ", "s": 8, "m": "Mưa giông sấm chớp", "ex": "雷、雪、霜"},
    {"id": 174, "r": "靑/青", "n": "Thanh", "s": 8, "m": "Màu xanh ngọc thanh khiết", "ex": "靓、静、靛"},
    {"id": 175, "r": "非", "n": "Phi", "s": 8, "m": "Sai trái, chẳng phải", "ex": "靠、靡、辈"},

    # 9 nét (176-186)
    {"id": 176, "r": "面", "n": "Diện", "s": 9, "m": "Khuôn mặt, bề mặt", "ex": "靥、面、腼"},
    {"id": 177, "r": "革", "n": "Cách", "s": 9, "m": "Da thú thuộc", "ex": "靴、鞋、鞭"},
    {"id": 178, "r": "韋/韦", "n": "Vi", "s": 9, "m": "Vây quanh da mềm", "ex": "韧、韩、韬"},
    {"id": 179, "r": "韭", "n": "Cửu", "s": 9, "m": "Cây rau hẹ xanh", "ex": "韭、韱、齑"},
    {"id": 180, "r": "音", "n": "Âm", "s": 9, "m": "Âm thanh tiếng vang", "ex": "韶、韵、响"},
    {"id": 181, "r": "頁/页", "n": "Hiệp", "s": 9, "m": "Trang sách, cái đầu", "ex": "顶、顺、项"},
    {"id": 182, "r": "風/风", "n": "Phong", "s": 9, "m": "Ngọn gió thổi", "ex": "飘、飙、飒"},
    {"id": 183, "r": "飛/飞", "n": "Phi", "s": 9, "m": "Bay lượn trên trời", "ex": "飞、翻、升"},
    {"id": 184, "r": "食/饣", "n": "Thực", "s": 9, "m": "Thức ăn đan dược", "ex": "饱、饮、馆"},
    {"id": 185, "r": "首", "n": "Thủ", "s": 9, "m": "Cái đầu, đứng đầu", "ex": "道、首、馗"},
    {"id": 186, "r": "香", "n": "Hương", "s": 9, "m": "Mùi thơm linh thảo", "ex": "馥、馨、馨"},

    # 10 nét (187-194)
    {"id": 187, "r": "馬/马", "n": "Mã", "s": 10, "m": "Ngựa chiến phi nước đại", "ex": "骑、驱、腾"},
    {"id": 188, "r": "骨", "n": "Cốt", "s": 10, "m": "Khung xương cốt nhục", "ex": "骸、髓、体"},
    {"id": 189, "r": "高", "n": "Cao", "s": 10, "m": "Lầu cao vút trời", "ex": "高、嵩、膏"},
    {"id": 190, "r": "髟", "n": "Bưu", "s": 10, "m": "Tóc dài bay trong gió", "ex": "发、鬓、须"},
    {"id": 191, "r": "鬥", "n": "Đấu", "s": 10, "m": "Đánh nhau chiến đấu", "ex": "闹、斗、争"},
    {"id": 192, "r": "鬯", "n": "Sưởng", "s": 10, "m": "Rượu cúng thơm nức", "ex": "鬯、郁、鬱"},
    {"id": 193, "r": "鬲", "n": "Cách", "s": 10, "m": "Cái nồi ba chân", "ex": "融、隔、鬲"},
    {"id": 194, "r": "鬼", "n": "Quỷ", "s": 10, "m": "Linh hồn, ma quỷ", "ex": "魂、魄、魄"},

    # 11 nét (195-200)
    {"id": 195, "r": "魚/鱼", "n": "Ngư", "s": 11, "m": "Loài cá biển hồ", "ex": "鲜、鲁、鲨"},
    {"id": 196, "r": "鳥/鸟", "n": "Điểu", "s": 11, "m": "Loài chim có lông", "ex": "鸣、鸿、鹏"},
    {"id": 197, "r": "鹵/卤", "n": "Lỗ", "s": 11, "m": "Đất mặn, muối biển", "ex": "碱、盐、卤"},
    {"id": 198, "r": "鹿", "n": "Lộc", "s": 11, "m": "Hươu nai rừng sâu", "ex": "麟、尘、麝"},
    {"id": 199, "r": "麥/麦", "n": "Mạch", "s": 11, "m": "Cây lúa mạch", "ex": "面、麴、麸"},
    {"id": 200, "r": "麻", "n": "Ma", "s": 11, "m": "Cây gai dầu may áo", "ex": "摩、磨、魔"},

    # 12 nét (201-204)
    {"id": 201, "r": "黃/黄", "n": "Hoàng", "s": 12, "m": "Màu vàng của đất", "ex": "黉、潢、磺"},
    {"id": 202, "r": "黍", "n": "Thử", "s": 12, "m": "Cây kê dẻo nấu rượu", "ex": "黏、黎、黍"},
    {"id": 203, "r": "黑", "n": "Hắc", "s": 12, "m": "Màu đen khói lửa", "ex": "默、墨、黛"},
    {"id": 204, "r": "黹", "n": "Chỉ", "s": 12, "m": "Thêu may kim chỉ", "ex": "黻、黼、黹"},

    # 13 nét (205-208)
    {"id": 205, "r": "黽/黾", "n": "Mãnh", "s": 13, "m": "Con ếch, loài lưỡng cư", "ex": "黾、鼋、鼍"},
    {"id": 206, "r": "鼎", "n": "Đỉnh", "s": 13, "m": "Cái đỉnh đồng nấu đan", "ex": "鼎、鼐、鼒"},
    {"id": 207, "r": "鼓", "n": "Cổ", "s": 13, "m": "Cái trống gióng trận", "ex": "鼓、鼗、鼙"},
    {"id": 208, "r": "鼠", "n": "Thử", "s": 13, "m": "Loài chuột núi nhanh nhẹn", "ex": "鼠、鼯、鼬"},

    # 14-17 nét (209-214)
    {"id": 209, "r": "鼻", "n": "Tị", "s": 14, "m": "Cái mũi hít thở linh khí", "ex": "鼻、鼾、齁"},
    {"id": 210, "r": "齊/齐", "n": "Tề", "s": 14, "m": "Bằng phẳng, tề chỉnh", "ex": "斋、霁、齑"},
    {"id": 211, "r": "齒/齿", "n": "Xỉ", "s": 15, "m": "Răng nhai tuổi tác", "ex": "龄、啮、龊"},
    {"id": 212, "r": "龍/龙", "n": "Long", "s": 16, "m": "Con rồng bay lượn chín tầng trời", "ex": "庞、龚、龛"},
    {"id": 213, "r": "龜/龟", "n": "Quy", "s": 16, "m": "Con rùa trường thọ", "ex": "龟、鼈、秋"},
    {"id": 214, "r": "龠", "n": "Dược", "s": 17, "m": "Ống sáo ba lỗ thổi nhạc", "ex": "龠、龢、龣"}
]

PHONETIC_FAMILIES = [
    {
        "root": "青", "rootPy": "qīng", "meaning": "màu xanh thanh khiết",
        "desc": "Gốc phát âm QING tạo nên cả một họ chữ vô cùng phổ biến trong tiếng Trung:",
        "members": [
            {"ch": "清", "py": "qīng", "m": "nước trong suốt", "rad": "氵 (Thủy)"},
            {"ch": "晴", "py": "qíng", "m": "trời nắng ráo", "rad": "日 (Nhật)"},
            {"ch": "情", "py": "qíng", "m": "tình cảm, cảm xúc", "rad": "忄 (Tâm)"},
            {"ch": "请", "py": "qǐng", "m": "xin, mời, thỉnh", "rad": "讠 (Ngôn)"},
            {"ch": "睛", "py": "jīng", "m": "tròng mắt, ánh nhìn", "rad": "目 (Mục)"},
            {"ch": "静", "py": "jìng", "m": "yên tĩnh, thanh tịnh", "rad": "争 (Tranh)"}
        ]
    },
    {
        "root": "包", "rootPy": "bāo", "meaning": "bao bọc, cuộn tròn",
        "desc": "Gốc BAO biến hóa theo các hành vi của con người và vật chất:",
        "members": [
            {"ch": "饱", "py": "bǎo", "m": "ăn no bụng", "rad": "饣 (Thực)"},
            {"ch": "抱", "py": "bào", "m": "ôm ấp bằng tay", "rad": "扌 (Thủ)"},
            {"ch": "跑", "py": "pǎo", "m": "chạy nhanh bằng chân", "rad": "足 (Túc)"},
            {"ch": "泡", "py": "pào", "m": "bọt nước, ngâm nước", "rad": "氵 (Thủy)"},
            {"ch": "炮", "py": "pào", "m": "pháo nổ, đạn lửa", "rad": "火 (Hỏa)"},
            {"ch": "胞", "py": "bāo", "m": "tế bào, đồng bào", "rad": "月 (Nhục)"}
        ]
    },
    {
        "root": "方", "rootPy": "fāng", "meaning": "phương hướng, vuông vức",
        "desc": "Gốc FANG gắn liền với không gian, nơi chốn và phòng bị:",
        "members": [
            {"ch": "房", "py": "fáng", "m": "căn phòng, gian nhà", "rad": "户 (Hộ)"},
            {"ch": "放", "py": "fàng", "m": "buông tay, phóng thích", "rad": "攵 (Phác)"},
            {"ch": "访", "py": "fǎng", "m": "thăm viếng, phỏng vấn", "rad": "讠 (Ngôn)"},
            {"ch": "防", "py": "fáng", "m": "phòng ngự, chắn giữ", "rad": "阝 (Phụ)"},
            {"ch": "芳", "py": "fāng", "m": "hương thơm cỏ hoa", "rad": "艹 (Thảo)"},
            {"ch": "妨", "py": "fáng", "m": "trở ngại, phương hại", "rad": "女 (Nữ)"}
        ]
    },
    {
        "root": "也", "rootPy": "yě", "meaning": "cũng, vậy",
        "desc": "Gốc YE tạo nên các đại từ và địa lý quen thuộc nhất:",
        "members": [
            {"ch": "他", "py": "tā", "m": "anh ấy, người ấy", "rad": "亻 (Nhân)"},
            {"ch": "她", "py": "tā", "m": "cô ấy, nàng", "rad": "女 (Nữ)"},
            {"ch": "地", "py": "dì", "m": "mặt đất, đất đai", "rad": "土 (Thổ)"},
            {"ch": "池", "py": "chí", "m": "ao hồ chứa nước", "rad": "氵 (Thủy)"},
            {"ch": "驰", "py": "chí", "m": "phi ngựa nước đại", "rad": "马 (Mã)"}
        ]
    },
    {
        "root": "巴", "rootPy": "bā", "meaning": "dính chặt, bám lấy",
        "desc": "Gốc BA biểu âm cho các từ chỉ đồ vật, quan hệ và âm thanh:",
        "members": [
            {"ch": "把", "py": "bǎ", "m": "cầm nắm, cán cầm", "rad": "扌 (Thủ)"},
            {"ch": "吧", "py": "ba", "m": "nhé, đi (trợ từ ngữ khí)", "rad": "口 (Khẩu)"},
            {"ch": "爸", "py": "bà", "m": "bố, cha", "rad": "父 (Phụ)"},
            {"ch": "疤", "py": "bā", "m": "vết sẹo thương tích", "rad": "疒 (Nạch)"},
            {"ch": "靶", "py": "bǎ", "m": "bia bắn tên", "rad": "革 (Cách)"}
        ]
    },
    {
        "root": "羊", "rootPy": "yáng", "meaning": "con dê, tốt lành",
        "desc": "Gốc YANG mang nghĩa biểu âm cho các từ phát âm YANG/XIANG:",
        "members": [
            {"ch": "样", "py": "yàng", "m": "hình mẫu, kiểu dáng", "rad": "木 (Mộc)"},
            {"ch": "洋", "py": "yáng", "m": "đại dương mênh mông", "rad": "氵 (Thủy)"},
            {"ch": "详", "py": "xiáng", "m": "tường tận, rõ ràng", "rad": "讠 (Ngôn)"},
            {"ch": "翔", "py": "xiáng", "m": "lượn bay trên trời", "rad": "羽 (Vũ)"},
            {"ch": "鲜", "py": "xiān", "m": "tươi ngon, cá tươi", "rad": "鱼 (Ngư)"}
        ]
    },
    {
        "root": "门", "rootPy": "mén", "meaning": "cánh cổng, môn phái",
        "desc": "Gốc MEN nằm ở kết cấu bao quanh, biểu âm cho các trạng thái cửa:",
        "members": [
            {"ch": "问", "py": "wèn", "m": "hỏi han, chất vấn", "rad": "口 (Khẩu)"},
            {"ch": "闪", "py": "shǎn", "m": "tia chớp, né tránh", "rad": "人 (Nhân)"},
            {"ch": "闭", "py": "bì", "m": "đóng cửa, bế quan", "rad": "才 (Tài)"},
            {"ch": "闲", "py": "xián", "m": "nhàn rỗi, thanh nhàn", "rad": "木 (Mộc)"},
            {"ch": "闷", "py": "mèn", "m": "u sầu, ngột ngạt", "rad": "心 (Tâm)"}
        ]
    },
    {
        "root": "马", "rootPy": "mǎ", "meaning": "con ngựa chiến",
        "desc": "Gốc MA biểu âm cho các từ phát âm MA cực kỳ quen thuộc:",
        "members": [
            {"ch": "妈", "py": "mā", "m": "mẹ hiền", "rad": "女 (Nữ)"},
            {"ch": "骂", "py": "mà", "m": "mắng mỏ, trách phạt", "rad": "口 (Khẩu)"},
            {"ch": "码", "py": "mǎ", "m": "con số, bến tàu", "rad": "石 (Thạch)"},
            {"ch": "蚂", "py": "mǎ", "m": "con kiến, cào cào", "rad": "虫 (Trùng)"},
            {"ch": "冯", "py": "féng", "m": "họ Phùng, dựa vào", "rad": "冫 (Băng)"}
        ]
    },
    {
        "root": "亢", "rootPy": "kàng", "meaning": "cao vút, kiên cường",
        "desc": "Gốc KANG biểu âm cho các âm HANG/KANG:",
        "members": [
            {"ch": "航", "py": "háng", "m": "hàng hải, bay lượn", "rad": "舟 (Chu)"},
            {"ch": "坑", "py": "kēng", "m": "hố sâu, hãm hại", "rad": "土 (Thổ)"},
            {"ch": "抗", "py": "kàng", "m": "kháng cự, chống cự", "rad": "扌 (Thủ)"},
            {"ch": "杭", "py": "háng", "m": "Hàng Châu, vượt sông", "rad": "木 (Mộc)"}
        ]
    },
    {
        "root": "寺", "rootPy": "sì", "meaning": "ngôi chùa, đền tự",
        "desc": "Gốc SI biểu âm cho các từ phát âm SHI/CHI/DAI:",
        "members": [
            {"ch": "诗", "py": "shī", "m": "thơ ca, thi phẩm", "rad": "讠 (Ngôn)"},
            {"ch": "等", "py": "děng", "m": "chờ đợi, đẳng cấp", "rad": "竹 (Trúc)"},
            {"ch": "持", "py": "chí", "m": "nắm giữ, kiên trì", "rad": "扌 (Thủ)"},
            {"ch": "待", "py": "dài", "m": "đối đãi, chờ mong", "rad": "彳 (Sách)"},
            {"ch": "侍", "py": "shì", "m": "hầu hạ, thị vệ", "rad": "亻 (Nhân)"}
        ]
    },
    {
        "root": "莫", "rootPy": "mò", "meaning": "chớ, đừng, hoàng hôn",
        "desc": "Gốc MO biểu âm cho các từ phát âm MO/MU:",
        "members": [
            {"ch": "漠", "py": "mò", "m": "sa mạc cằn cỗi", "rad": "氵 (Thủy)"},
            {"ch": "摸", "py": "mō", "m": "sờ mó, lần mò", "rad": "扌 (Thủ)"},
            {"ch": "模", "py": "mó", "m": "khuôn mẫu, mô hình", "rad": "木 (Mộc)"},
            {"ch": "膜", "py": "mó", "m": "màng bao bọc", "rad": "月 (Nhục)"},
            {"ch": "寞", "py": "mò", "m": "cô quạnh, tịch mịch", "rad": "宀 (Miên)"}
        ]
    },
    {
        "root": "占", "rootPy": "zhān", "meaning": "chiêm bói, chiếm giữ",
        "desc": "Gốc ZHAN biểu âm cho các từ phát âm ZHAN/DIAN:",
        "members": [
            {"ch": "站", "py": "zhàn", "m": "đứng vững, trạm dừng", "rad": "立 (Lập)"},
            {"ch": "点", "py": "diǎn", "m": "chấm nhỏ, điểm tâm", "rad": "灬 (Hỏa)"},
            {"ch": "战", "py": "zhàn", "m": "chiến đấu, chiến trường", "rad": "戈 (Qua)"},
            {"ch": "贴", "py": "tiē", "m": "dán vào, kề cận", "rad": "贝 (Bối)"},
            {"ch": "沾", "py": "zhān", "m": "dính nước, thấm đượm", "rad": "氵 (Thủy)"}
        ]
    }
]

MEASURE_WORDS = [
    {
        "word": "把", "py": "bǎ", "icon": "🗡️", "use": "Dùng cho vật có cán cầm, đồ vật nắm được trong tay",
        "examples": [
            {"zh": "一把飞剑", "py": "yī bǎ fēijiàn", "vi": "Một thanh phi kiếm"},
            {"zh": "一把刀", "py": "yī bǎ dāo", "vi": "Một con dao găm"},
            {"zh": "一把伞", "py": "yī bǎ sǎn", "vi": "Một chiếc ô che mưa"}
        ]
    },
    {
        "word": "本", "py": "běn", "icon": "📖", "use": "Dùng cho sách vở, công pháp, bí tịch đóng thành cuốn",
        "examples": [
            {"zh": "一本秘籍", "py": "yī běn mìjí", "vi": "Một cuốn bí tịch"},
            {"zh": "一本书", "py": "yī běn shū", "vi": "Một quyển sách cổ"},
            {"zh": "一本功法", "py": "yī běn gōngfǎ", "vi": "Một cuốn công pháp"}
        ]
    },
    {
        "word": "张", "py": "zhāng", "icon": "📜", "use": "Dùng cho vật có bề mặt phẳng, mỏng như giấy, phù lục, bàn, da",
        "examples": [
            {"zh": "一张神符", "py": "yī zhāng shénfú", "vi": "Một lá thần phù"},
            {"zh": "一张纸", "py": "yī zhāng zhǐ", "vi": "Một tờ giấy chu sa"},
            {"zh": "一张桌子", "py": "yī zhāng zhuōzi", "vi": "Một chiếc bàn đá"}
        ]
    },
    {
        "word": "条", "py": "tiáo", "icon": "🐉", "use": "Dùng cho vật thon dài uốn khúc như rồng, cá, sông, đường sá",
        "examples": [
            {"zh": "一条灵龙", "py": "yī tiáo línglóng", "vi": "Một con rồng linh"},
            {"zh": "一条金鱼", "py": "yī tiáo jīnyú", "vi": "Một con cá vàng"},
            {"zh": "一条大道", "py": "yī tiáo dàdào", "vi": "Một con đường đại đạo"}
        ]
    },
    {
        "word": "只", "py": "zhī", "icon": "🦅", "use": "Dùng cho loài chim thú hoặc một chiếc trong đôi (tay, mắt)",
        "examples": [
            {"zh": "一只仙鹤", "py": "yī zhī xiānhè", "vi": "Một con tiên hạc"},
            {"zh": "一只妖兽", "py": "yī zhī yāoshòu", "vi": "Một con yêu thú"},
            {"zh": "一只手", "py": "yī zhī shǒu", "vi": "Một bàn tay"}
        ]
    },
    {
        "word": "颗", "py": "kē", "icon": "💊", "use": "Dùng cho vật nhỏ hình cầu như đan dược, ngọc trai, hạt châu, sao",
        "examples": [
            {"zh": "一颗筑基丹", "py": "yī kē zhùjīdān", "vi": "Một viên Trúc Cơ Đan"},
            {"zh": "一颗灵珠", "py": "yī kē língzhū", "vi": "Một viên ngọc linh châu"},
            {"zh": "一颗星", "py": "yī kē xīng", "vi": "Một ngôi sao sáng"}
        ]
    },
    {
        "word": "粒", "py": "lì", "icon": "🌾", "use": "Dùng cho vật nhỏ li ti như hạt gạo, hạt mầm, viên đan nhỏ",
        "examples": [
            {"zh": "一粒灵米", "py": "yī lì língmǐ", "vi": "Một hạt gạo linh khí"},
            {"zh": "一粒种子", "py": "yī lì zhǒngzi", "vi": "Một hạt giống linh thảo"},
            {"zh": "一粒尘埃", "py": "yī lì chén'āi", "vi": "Một hạt bụi trần phàm"}
        ]
    },
    {
        "word": "门", "py": "mén", "icon": "🔮", "use": "Dùng cho công pháp tu tiên, tuyệt chiêu thần thông, khẩu đại bác",
        "examples": [
            {"zh": "一门神通", "py": "yī mén shéntōng", "vi": "Một môn thần thông vô thượng"},
            {"zh": "一门功法", "py": "yī mén gōngfǎ", "vi": "Một môn công pháp"},
            {"zh": "一门仙术", "py": "yī mén xiānshù", "vi": "Một môn tiên thuật bí truyền"}
        ]
    },
    {
        "word": "道", "py": "dào", "icon": "⚡", "use": "Dùng cho kiếm khí, lôi điện, ánh sáng, sắc lệnh hoặc vết thương",
        "examples": [
            {"zh": "一道剑气", "py": "yī dào jiànqì", "vi": "Một đạo kiếm khí bén ngót"},
            {"zh": "一道雷电", "py": "yī dào léidiàn", "vi": "Một tia lôi điện giáng xuống"},
            {"zh": "一道光芒", "py": "yī dào guāngmáng", "vi": "Một luồng hào quang rực rỡ"}
        ]
    },
    {
        "word": "缕", "py": "lǚ", "icon": "💨", "use": "Dùng cho làn khói mỏng, luồng linh khí, thần niệm, tóc mai",
        "examples": [
            {"zh": "一缕神识", "py": "yī lǚ shénshí", "vi": "Một sợi thần thức mong manh"},
            {"zh": "一缕青烟", "py": "yī lǚ qīngyān", "vi": "Một làn khói lam thanh khiết"},
            {"zh": "一缕清风", "py": "yī lǚ qīngfēng", "vi": "Một làn gió nhẹ thanh tao"}
        ]
    },
    {
        "word": "支", "py": "zhī", "icon": "🖌️", "use": "Dùng cho vật thon thẳng như cây bút, mũi tên, quân đội",
        "examples": [
            {"zh": "一支神笔", "py": "yī zhī shénbǐ", "vi": "Một cây thần bút chu sa"},
            {"zh": "一支利箭", "py": "yī zhī lìjiàn", "vi": "Một mũi tên sắc bén"},
            {"zh": "一支队伍", "py": "yī zhī duìwu", "vi": "Một đội tu sĩ tinh nhuệ"}
        ]
    },
    {
        "word": "首", "py": "shǒu", "icon": "🎵", "use": "Dùng cho bài thơ cổ, khúc nhạc, chiến ca",
        "examples": [
            {"zh": "一首仙乐", "py": "yī shǒu xiānyuè", "vi": "Một khúc tiên nhạc"},
            {"zh": "一首战歌", "py": "yī shǒu zhàngē", "vi": "Một bài chiến ca xung trận"},
            {"zh": "一首古诗", "py": "yī shǒu gǔshī", "vi": "Một bài thơ cổ điển"}
        ]
    },
    {
        "word": "顶", "py": "dǐng", "icon": "👑", "use": "Dùng cho vật che trên đầu như mũ đạo quán, lều trướng",
        "examples": [
            {"zh": "一顶道冠", "py": "yī dǐng dàoguān", "vi": "Một chiếc mũ đạo quán"},
            {"zh": "一顶帽子", "py": "yī dǐng màozi", "vi": "Một chiếc mũ che nắng"},
            {"zh": "一顶帐篷", "py": "yī dǐng zhàngpeng", "vi": "Một chiếc lều bế quan"}
        ]
    },
    {
        "word": "扇", "py": "shàn", "icon": "🚪", "use": "Dùng cho cánh cửa lớn, cánh cửa sổ",
        "examples": [
            {"zh": "一扇石门", "py": "yī shàn shímén", "vi": "Một cánh cửa đá cổ động"},
            {"zh": "一扇窗户", "py": "yī shàn chuānghu", "vi": "Một khung cửa sổ"},
            {"zh": "一扇大门", "py": "yī shàn dàmén", "vi": "Một cánh cổng lớn sơn môn"}
        ]
    },
    {
        "word": "阵", "py": "zhèn", "icon": "🌪️", "use": "Dùng cho hiện tượng xảy ra theo đợt ngắn: trận gió, cơn mưa, hồi sấm",
        "examples": [
            {"zh": "一阵狂风", "py": "yī zhèn kuángfēng", "vi": "Một cơn gió lốc dữ dội"},
            {"zh": "一阵雷声", "py": "yī zhèn léishēng", "vi": "Một hồi sấm rền vang"},
            {"zh": "一阵掌声", "py": "yī zhèn zhǎngshēng", "vi": "Một tràng vỗ tay hoan hô"}
        ]
    },
    {
        "word": "滴", "py": "dī", "icon": "💧", "use": "Dùng cho giọt nước, giọt máu, giọt linh dịch ngưng tụ",
        "examples": [
            {"zh": "一滴精血", "py": "yī dī jīngxuè", "vi": "Một giọt tinh huyết sinh mệnh"},
            {"zh": "一滴灵水", "py": "yī dī língshuǐ", "vi": "Một giọt linh dịch tinh khiết"},
            {"zh": "一滴眼泪", "py": "yī dī yǎnlèi", "vi": "Một giọt nước mắt chia ly"}
        ]
    },
    {
        "word": "尊", "py": "zūn", "icon": "🏺", "use": "Dùng cho tượng thần, đỉnh đồng cổ kính, đại năng tôn kính",
        "examples": [
            {"zh": "一尊古鼎", "py": "yī zūn gǔdǐng", "vi": "Một chiếc đỉnh đồng viễn cổ"},
            {"zh": "一尊神像", "py": "yī zūn shénxiàng", "vi": "Một pho tượng thần trang nghiêm"},
            {"zh": "一尊大能", "py": "yī zūn dànéng", "vi": "Một vị đại năng cái thế"}
        ]
    },
    {
        "word": "具", "py": "jù", "icon": "🗿", "use": "Dùng cho cỗ thi hài, khôi lỗi tu chân, quan tài",
        "examples": [
            {"zh": "一具傀儡", "py": "yī jù kuǐlěi", "vi": "Một con khôi lỗi chiến đấu"},
            {"zh": "一具骸骨", "py": "yī jù háigǔ", "vi": "Một bộ hài cốt thượng cổ"},
            {"zh": "一具古棺", "py": "yī jù gǔguān", "vi": "Một cỗ quan tài ngàn năm"}
        ]
    },
    {
        "word": "座", "py": "zuò", "icon": "🏔️", "use": "Dùng cho công trình kiến trúc đồ sộ, ngọn núi hùng vĩ cố định",
        "examples": [
            {"zh": "一座洞府", "py": "yī zuò dòngfǔ", "vi": "Một tòa động phủ tu luyện"},
            {"zh": "一座高山", "py": "yī zuò gāoshān", "vi": "Một ngọn núi sừng sững"},
            {"zh": "一座大殿", "py": "yī zuò dàdiàn", "vi": "Một tòa đại điện uy nghi"}
        ]
    },
    {
        "word": "个", "py": "gè", "icon": "👤", "use": "Lượng từ vạn năng phổ biến nhất, dùng cho con người hoặc đồ vật chung chung",
        "examples": [
            {"zh": "一个人", "py": "yī gè rén", "vi": "Một người tu sĩ"},
            {"zh": "一个字", "py": "yī gè zì", "vi": "Một chữ đạo văn"},
            {"zh": "一个朋友", "py": "yī gè péngyou", "vi": "Một người đạo hữu tri kỷ"}
        ]
    }
]

INITIALS = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's']
FINALS = ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong']

PINYIN_MAP = {
    # Initials (standard Mandarin phonics pronunciation represented as Chinese characters)
    "b": "玻", "p": "坡", "m": "摸", "f": "佛", "d": "得", "t": "特", "n": "讷", "l": "勒",
    "g": "哥", "k": "科", "h": "喝", "j": "基", "q": "欺", "x": "希", "zh": "知", "ch": "吃",
    "sh": "诗", "r": "日", "z": "资", "c": "疵", "s": "思", "y": "衣", "w": "乌",

    # Finals
    "a": "阿", "o": "喔", "e": "鹅", "i": "衣", "u": "乌", "ü": "迂", "v": "迂",
    "ai": "哀", "ei": "诶", "ao": "熬", "ou": "欧", "an": "安", "en": "恩", "ang": "昂", "eng": "鞥", "ong": "翁",
    "ia": "鸭", "iao": "腰", "ian": "烟", "iang": "央", "ie": "椰", "iong": "雍", "iu": "忧", "in": "因", "ing": "英",
    "ua": "蛙", "uo": "窝", "uai": "歪", "uan": "弯", "uang": "汪", "ui": "威", "un": "温", "ueng": "瓮",

    # Syllables with A
    "ba": "八", "pa": "趴", "ma": "妈", "fa": "发", "da": "搭", "ta": "他", "na": "拿", "la": "拉",
    "ga": "嘎", "ka": "咖", "ha": "哈", "zha": "扎", "cha": "叉", "sha": "沙", "za": "杂", "ca": "擦", "sa": "撒",
    "ya": "鸭", "wa": "挖",

    # Syllables with O / UO
    "bo": "波", "po": "坡", "mo": "摸", "fo": "佛", "luo": "罗", "duo": "多", "tuo": "拖", "nuo": "挪",
    "guo": "国", "kuo": "阔", "huo": "火", "zhuo": "桌", "chuo": "戳", "shuo": "说", "ruo": "若",
    "zuo": "左", "cuo": "错", "suo": "梭", "wo": "我",

    # Syllables with E
    "me": "么", "de": "得", "te": "特", "ne": "呢", "le": "乐", "ge": "哥", "ke": "科", "he": "喝",
    "zhe": "者", "che": "车", "she": "舌", "re": "热", "ze": "责", "ce": "策", "se": "色", "ye": "也",

    # Syllables with I
    "bi": "逼", "pi": "批", "mi": "咪", "di": "低", "ti": "梯", "ni": "你", "li": "里",
    "ji": "鸡", "qi": "七", "xi": "西", "zhi": "知", "chi": "吃", "shi": "诗", "ri": "日",
    "zi": "资", "ci": "词", "si": "四", "yi": "一",

    # Syllables with U / Ü
    "bu": "不", "pu": "普", "mu": "木", "fu": "福", "du": "读", "tu": "土", "nu": "怒", "lu": "路",
    "gu": "古", "ku": "苦", "hu": "虎", "zhu": "主", "chu": "出", "shu": "书", "ru": "如",
    "zu": "祖", "cu": "粗", "su": "苏", "wu": "无",
    "nv": "女", "nü": "女", "lv": "绿", "lü": "绿", "ju": "居", "qu": "去", "xu": "虚", "yu": "雨",

    # AI / EI / AO / OU
    "bai": "白", "pai": "拍", "mai": "买", "dai": "带", "tai": "态", "nai": "奶", "lai": "来",
    "gai": "该", "kai": "开", "hai": "海", "zhai": "摘", "chai": "拆", "shai": "晒", "zai": "在", "cai": "菜", "sai": "赛",
    "bei": "北", "pei": "配", "mei": "美", "fei": "飞", "dei": "得", "nei": "内", "lei": "雷",
    "gei": "给", "hei": "黑", "shei": "谁", "zei": "贼",
    "bao": "包", "pao": "跑", "mao": "猫", "dao": "道", "tao": "桃", "nao": "闹", "lao": "老",
    "gao": "高", "kao": "考", "hao": "好", "zhao": "照", "chao": "超", "shao": "少", "rao": "绕",
    "zao": "早", "cao": "草", "sao": "扫", "yao": "药",
    "dou": "豆", "tou": "头", "nou": "耨", "lou": "楼", "gou": "狗", "kou": "口", "hou": "后",
    "zhou": "周", "chou": "丑", "shou": "手", "rou": "肉", "zou": "走", "cou": "凑", "sou": "搜", "you": "有",

    # AN / EN / ANG / ENG / ONG
    "ban": "半", "pan": "盘", "man": "满", "fan": "凡", "dan": "丹", "tan": "探", "nan": "南", "lan": "蓝",
    "gan": "干", "kan": "看", "han": "汉", "zhan": "战", "chan": "禅", "shan": "山", "ran": "然",
    "zan": "赞", "can": "残", "san": "三", "yan": "言", "wan": "万",
    "ben": "本", "pen": "喷", "men": "门", "fen": "分", "nen": "嫩", "gen": "根", "ken": "肯", "hen": "很",
    "zhen": "真", "chen": "晨", "shen": "神", "ren": "人", "zen": "怎", "cen": "参", "sen": "森", "wen": "问",
    "bang": "帮", "pang": "旁", "mang": "忙", "fang": "方", "dang": "当", "tang": "堂", "nang": "囊", "lang": "狼",
    "gang": "刚", "kang": "康", "hang": "行", "zhang": "张", "chang": "长", "shang": "上", "rang": "让",
    "zang": "脏", "cang": "藏", "sang": "桑", "yang": "阳", "wang": "王",
    "beng": "崩", "peng": "朋", "meng": "梦", "feng": "风", "deng": "灯", "teng": "腾", "neng": "能", "leng": "冷",
    "geng": "更", "keng": "坑", "heng": "恒", "zheng": "正", "cheng": "成", "sheng": "生", "reng": "扔",
    "zeng": "增", "ceng": "层", "seng": "僧", "ying": "影", "weng": "翁",
    "dong": "东", "tong": "通", "nong": "农", "long": "龙", "gong": "工", "kong": "空", "hong": "红",
    "zhong": "中", "chong": "重", "rong": "容", "zong": "宗", "cong": "从", "song": "宋", "yong": "勇",

    # Compound I/U
    "bing": "冰", "ping": "平", "ming": "明", "ding": "丁", "ting": "听", "ning": "宁", "ling": "灵",
    "jing": "京", "qing": "清", "xing": "星",
    "bin": "宾", "pin": "品", "min": "民", "nin": "您", "lin": "林", "jin": "金", "qin": "琴", "xin": "心", "yin": "音",
    "biao": "表", "piao": "飘", "miao": "妙", "diao": "雕", "tiao": "条", "niao": "鸟", "liao": "了",
    "jiao": "脚", "qiao": "桥", "xiao": "小",
    "bian": "边", "pian": "片", "mian": "面", "dian": "点", "tian": "天", "nian": "年", "lian": "连",
    "jian": "剑", "qian": "千", "xian": "仙",
    "bie": "别", "pie": "撇", "mie": "灭", "die": "跌", "tie": "铁", "nie": "捏", "lie": "列",
    "jie": "结", "qie": "切", "xie": "写",
    "duan": "段", "tuan": "团", "nuan": "暖", "luan": "乱", "guan": "关", "kuan": "宽", "huan": "幻",
    "zhuan": "转", "chuan": "传", "shuan": "栓", "ruan": "软", "zuan": "钻", "cuan": "窜", "suan": "算", "yuan": "元",
    "dun": "顿", "tun": "吞", "lun": "轮", "gun": "滚", "kun": "困", "hun": "魂",
    "zhun": "准", "chun": "春", "shun": "顺", "run": "润", "zun": "尊", "cun": "村", "sun": "孙", "yun": "云",
    "gui": "归", "kui": "亏", "hui": "会", "zhui": "追", "chui": "吹", "shui": "水", "rui": "瑞",
    "zui": "最", "cui": "催", "sui": "岁",
    "jiang": "江", "qiang": "枪", "xiang": "香",
    "jue": "绝", "que": "缺", "xue": "雪", "yue": "月",
    "jun": "军", "qun": "群", "xun": "寻",
    "jia": "家", "qia": "恰", "xia": "下"
}

output_js = f"""// Quy Vân Quán / Tiên Nghịch — Module 5 Công Cụ HanziGuru & Hệ Thống Đạo Văn
(function (root) {{
    'use strict';

    var HZ_TOOLS = {{}};

    // 1. 100 CHỮ HÁN XÂY NỀN (Bách Tự Trúc Cơ - 5 Quyển theo giáo trình HanziGuru)
    HZ_TOOLS.CORE_100 = {json.dumps(CORE_100, ensure_ascii=False, indent=4)};

    // 2. 214 BỘ THỦ KHANG HY TIÊU BIỂU (Toàn Bộ 214 Đạo Văn Thiên Địa)
    HZ_TOOLS.RADICALS_214 = {json.dumps(RADICALS_214, ensure_ascii=False, indent=4)};

    // 3. 12 HỌ CHỮ HÌNH THANH (Vạn Kiếm Quy Tông)
    HZ_TOOLS.PHONETIC_FAMILIES = {json.dumps(PHONETIC_FAMILIES, ensure_ascii=False, indent=4)};

    // 4. 20 LƯỢNG TỪ TRỰC QUAN (Vạn Vật Danh Số Biểu)
    HZ_TOOLS.MEASURE_WORDS = {json.dumps(MEASURE_WORDS, ensure_ascii=False, indent=4)};

    // 5. MA TRẬN ÂM TIẾT PINYIN (Đại La Âm Trận)
    HZ_TOOLS.INITIALS = {json.dumps(INITIALS, ensure_ascii=False)};
    HZ_TOOLS.FINALS = {json.dumps(FINALS, ensure_ascii=False)};

    // BẢNG QUY ĐỔI PHÁT ÂM PINYIN CHUẨN SANG CHỮ HÁN BẢN XỨ (Tránh đọc đánh vần tiếng Anh "pi ây")
    HZ_TOOLS.PINYIN_MAP = {json.dumps(PINYIN_MAP, ensure_ascii=False, indent=4)};

    // Tra cứu chữ Hán chuẩn để phát âm tiếng Trung bản địa
    HZ_TOOLS.getPinyinHanzi = function (pinyin) {{
        if (!pinyin) return '';
        var raw = String(pinyin).toLowerCase().trim();
        // Bỏ dấu thanh điệu nếu có (1, 2, 3, 4 hoặc thanh sắc huyền hỏi ngã)
        var clean = raw.replace(/[0-9]/g, '');
        if (HZ_TOOLS.PINYIN_MAP[clean]) {{
            return HZ_TOOLS.PINYIN_MAP[clean];
        }}
        if (HZ_TOOLS.PINYIN_MAP[raw]) {{
            return HZ_TOOLS.PINYIN_MAP[raw];
        }}
        return pinyin;
    }};

    // Lấy 20 chữ theo từng Quyển của Bách Tự Trúc Cơ (vol = 1..5)
    HZ_TOOLS.getCoreVolume = function (vol) {{
        vol = Number(vol) || 1;
        return HZ_TOOLS.CORE_100.filter(function (item) {{
            return item.vol === vol;
        }});
    }};

    // Lọc bộ thủ theo số nét
    HZ_TOOLS.getRadicalsByStroke = function (s) {{
        if (!s) return HZ_TOOLS.RADICALS_214;
        s = Number(s);
        return HZ_TOOLS.RADICALS_214.filter(function (r) {{
            return r.s === s;
        }});
    }};

    root.HZ_TOOLS = HZ_TOOLS;

}})(typeof globalThis !== 'undefined' ? globalThis : this);
"""

with open("quy-van-hanziguru.js", "w", encoding="utf-8") as f:
    f.write(output_js)

print("quy-van-hanziguru.js generated successfully!")
print(f"CORE_100: {len(CORE_100)} words")
print(f"RADICALS_214: {len(RADICALS_214)} radicals")
print(f"PHONETIC_FAMILIES: {len(PHONETIC_FAMILIES)} families")
print(f"MEASURE_WORDS: {len(MEASURE_WORDS)} measure words")
print(f"PINYIN_MAP: {len(PINYIN_MAP)} syllables")
