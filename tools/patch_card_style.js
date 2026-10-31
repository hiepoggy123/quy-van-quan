const fs = require('fs');
let s = fs.readFileSync('quy-van-app.js', 'utf8');

const i1 = s.indexOf('<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">');
const i2 = s.indexOf('<div class="small muted" style="font-size:0.78em;background:#f8fafc;');

if (i1 !== -1 && i2 !== -1) {
    const repl = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">\' +\r\n' +
        '            \'<div style="background:#fffdf7;border:1.5px solid var(--line);border-radius:12px;padding:12px 6px;text-align:center">\' +\r\n' +
        '            \'<div style="font-size:1.35em;font-weight:900;color:var(--red-2);margin-bottom:2px">\' + learnedCount + \' <span style="font-size:0.65em;color:#666">/ 11,092</span></div>\' +\r\n' +
        '            \'<div style="font-weight:700;font-size:0.82em;color:var(--ink)">Tiến độ từ vựng (\' + totalPct + \'%)</div>\' +\r\n' +
        '            \'<div class="small muted" style="font-size:0.7em;margin-top:2px">Mục tiêu tối thượng HSK 9</div>\' +\r\n' +
        '            \'</div>\' +\r\n' +
        '            \'<div style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:12px;padding:12px 6px;text-align:center">\' +\r\n' +
        '            \'<div style="font-size:1.35em;font-weight:900;color:#0284c7;margin-bottom:2px">\' + corpusPct + \'</div>\' +\r\n' +
        '            \'<div style="font-weight:700;font-size:0.82em;color:#0369a1">Độ phủ tần suất văn bản</div>\' +\r\n' +
        '            \'<div class="small muted" style="font-size:0.7em;margin-top:2px">Tần suất xuất hiện trong sách truyện</div>\' +\r\n' +
        '            \'</div>\' +\r\n' +
        '            \'</div>\' +\r\n            \'';
    s = s.slice(0, i1) + repl + s.slice(i2);
    fs.writeFileSync('quy-van-app.js', s, 'utf8');
    console.log('SUCCESSFULLY REPLACED IN quy-van-app.js');
} else {
    console.log('INDICES NOT FOUND');
}
