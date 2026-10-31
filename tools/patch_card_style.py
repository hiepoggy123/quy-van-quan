# -*- coding: utf-8 -*-
with open('quy-van-app.js', 'r', encoding='utf-8') as f:
    s = f.read()

# Normalize line endings for replacement
is_crlf = '\r\n' in s
s_norm = s.replace('\r\n', '\n')

target = """            <div class="hunt-card" style="margin:0;padding:10px;text-align:center">' +
            '<div style="font-size:1.4em;font-weight:900;color:var(--red-2)">' + learnedCount + ' <span style="font-size:0.6em;color:#666">/ 11,092</span></div>' +
            '<div class="small" style="font-weight:700;color:var(--ink)">Tiến độ từ vựng (' + totalPct + '%)</div>' +
            '<div class="small muted" style="font-size:0.72em">Mục tiêu tối thượng HSK 9</div>' +
            '</div>' +
            '<div class="hunt-card" style="margin:0;padding:10px;text-align:center">' +
            '<div style="font-size:1.4em;font-weight:900;color:#2563eb">' + corpusPct + '</div>' +
            '<div class="small" style="font-weight:700;color:var(--ink)">Độ phủ tần suất văn bản</div>' +
            '<div class="small muted" style="font-size:0.72em">Tần suất xuất hiện trong sách truyện</div>' +
            '</div>"""

repl = """            <div style="background:#fffdf7;border:1.5px solid var(--line);border-radius:12px;padding:12px 6px;text-align:center">' +
            '<div style="font-size:1.35em;font-weight:900;color:var(--red-2);margin-bottom:2px">' + learnedCount + ' <span style="font-size:0.65em;color:#666">/ 11,092</span></div>' +
            '<div style="font-weight:700;font-size:0.82em;color:var(--ink)">Tiến độ từ vựng (' + totalPct + '%)</div>' +
            '<div class="small muted" style="font-size:0.7em;margin-top:2px">Mục tiêu tối thượng HSK 9</div>' +
            '</div>' +
            '<div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:12px;padding:12px 6px;text-align:center">' +
            '<div style="font-size:1.35em;font-weight:900;color:#0284c7;margin-bottom:2px">' + corpusPct + '</div>' +
            '<div style="font-weight:700;font-size:0.82em;color:#0369a1">Độ phủ tần suất văn bản</div>' +
            '<div class="small muted" style="font-size:0.7em;margin-top:2px">Tần suất xuất hiện trong sách truyện</div>' +
            '</div>"""

if target in s_norm:
    s_norm = s_norm.replace(target, repl, 1)
    if is_crlf:
        s_norm = s_norm.replace('\n', '\r\n')
    with open('quy-van-app.js', 'w', encoding='utf-8') as f:
        f.write(s_norm)
    print("SUCCESS: replaced stat card styling")
else:
    print("WARNING: target not found")
