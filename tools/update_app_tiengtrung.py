# -*- coding: utf-8 -*-
import sys

def update():
    with open('quy-van-app.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update playOnlineTts & speak to translate pinyin to Hanzi
    target_playOnlineTts = """        try {
            ttsAudioEl.pause();
            ttsAudioEl.currentTime = 0;
            // Split if longer than 150 chars to avoid URL length limit
            var textToPlay = cleanText.length > 150 ? cleanText.slice(0, 150) : cleanText;"""
    
    replace_playOnlineTts = """        try {
            ttsAudioEl.pause();
            ttsAudioEl.currentTime = 0;
            // Map pinyin syllables to representative Hanzi to avoid spelling out Latin letters
            if (!/[\\u4e00-\\u9fa5]/.test(cleanText) && window.HZ_TOOLS && window.HZ_TOOLS.getPinyinHanzi) {
                var mappedZh = window.HZ_TOOLS.getPinyinHanzi(cleanText);
                if (mappedZh) cleanText = mappedZh;
            }
            // Split if longer than 150 chars to avoid URL length limit
            var textToPlay = cleanText.length > 150 ? cleanText.slice(0, 150) : cleanText;"""
    
    if target_playOnlineTts in content:
        content = content.replace(target_playOnlineTts, replace_playOnlineTts)
        print("Updated playOnlineTts")
    else:
        print("WARN: target_playOnlineTts not found")

    target_speak = """        var clean = (typeof Core !== 'undefined' && Core.plainZh) ? Core.plainZh(text) : String(text);
        clean = clean.replace(/\\{[^}]*\\}/g, '').trim();
        if (!clean) return;

        // Check if browser has a real native Chinese voice installed"""

    replace_speak = """        var clean = (typeof Core !== 'undefined' && Core.plainZh) ? Core.plainZh(text) : String(text);
        clean = clean.replace(/\\{[^}]*\\}/g, '').trim();
        if (!clean) return;

        // Map pinyin syllables or initials/finals to representative Chinese Hanzi
        if (!/[\\u4e00-\\u9fa5]/.test(clean) && window.HZ_TOOLS && window.HZ_TOOLS.getPinyinHanzi) {
            var mapped = window.HZ_TOOLS.getPinyinHanzi(clean);
            if (mapped) clean = mapped;
        }

        // Check if browser has a real native Chinese voice installed"""

    if target_speak in content:
        content = content.replace(target_speak, replace_speak)
        print("Updated speak")
    else:
        print("WARN: target_speak not found")

    # 2. Update openPlace to route map buildings directly to Tiên Nghịch
    target_openPlace = """        if (world && id !== 'book') {
            world.focus(id, 0.2);
            keeperTo(id);
        }
        openSheet(id === 'book' || id === 'library' ? 'tall' : '');
        renderPlace();"""

    replace_openPlace = """        if (world && id !== 'book') {
            world.focus(id, 0.2);
            keeperTo(id);
        }

        // Chuyển hướng trực tiếp các công trình trên bản đồ theo phong cách Tiên Nghịch
        if (id === 'tea') {
            closeSheet();
            openHuntDashboard();
            return;
        }
        if (id === 'hall') {
            closeSheet();
            openSectDashboard();
            return;
        }
        if (id === 'study') {
            closeSheet();
            openStudyDashboard();
            return;
        }
        if (id === 'pond') {
            closeSheet();
            openPondDashboard();
            return;
        }
        if (id === 'kitchen') {
            closeSheet();
            openAlchemyDashboard();
            return;
        }
        if (id === 'gate') {
            closeSheet();
            openGateDashboard();
            return;
        }
        if (id === 'library') {
            closeSheet();
            openLibraryPlace();
            return;
        }

        openSheet(id === 'book' ? 'tall' : '');
        renderPlace();"""

    if target_openPlace in content:
        content = content.replace(target_openPlace, replace_openPlace)
        print("Updated openPlace")
    else:
        print("WARN: target_openPlace not found")

    # 3. Update onActor for Tư Đồ Nam & Vương Lâm
    target_onActor = """    function onActor(id) {
        if (fishing || quiz || dialog || cooking || riddle || paper) return;
        if (id === 'lao-quy') {
            openHubScene();
            return;
        }
        if (id === 'keeper') {
            toast('Đây là bạn, quán chủ mới của Quy Vân Quán.');
            return;
        }"""

    replace_onActor = """    function onActor(id) {
        if (fishing || quiz || dialog || cooking || riddle || paper) return;
        if (id === 'lao-quy') {
            sfx('tap');
            toast('Tư Đồ Nam: "Tiểu tử Vương Lâm, kiên trì tu luyện, sớm ngày Trúc Cơ để giúp lão phu phục sinh!"', 4000);
            return;
        }
        if (id === 'keeper') {
            sfx('tap');
            toast('Vương Lâm: "Mạng ta do ta định đoạt chứ không do trời! Đang nghịch thiên tu chân."', 4000);
            return;
        }"""

    if target_onActor in content:
        content = content.replace(target_onActor, replace_onActor)
        print("Updated onActor")
    else:
        print("WARN: target_onActor not found")

    with open('quy-van-app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Step 1 done")

if __name__ == '__main__':
    update()
