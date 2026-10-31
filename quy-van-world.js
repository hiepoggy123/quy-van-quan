// Quy Vân Quán — thế giới pixel isometric, vẽ hoàn toàn bằng code (không dùng ảnh).
// Một sườn núi bậc thang nổi trên biển mây: chính điện trên đỉnh, thư trai, hồ sen, quán trà
// 妖客来 và sơn môn ở chân núi. Mức sửa quán đổi sprite tại chỗ (mái thủng → lợp lại, đèn tắt →
// sáng, cầu gãy → liền), có ngày và đêm.
//
// Phần vẽ (Layer, địa hình, nhà, cây, nhân vật) là JS thuần, chạy được trong Node để xuất ảnh xem
// trước. Phần engine (canvas, camera, chạm, hoạt cảnh, nhãn DOM) chỉ chạy trong trình duyệt.
// Toạ độ: điểm thế giới (x, y, z) → màn hình ((x − y)·16, (x + y)·8 − z), đơn vị là pixel nghệ thuật.
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.QuyVanWorld = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    // ---------- bảng màu ----------
    // Mỗi dải xếp từ tối tới sáng. Ánh nắng chiếu từ trên bên trái: mặt trái sáng, mặt phải tối.
    var PAL = {
        sky: ['#80b4dc', '#8fbfe2', '#a2cbe7', '#b8d8ec', '#d0e5ef', '#e6eeec', '#f3e8d6', '#f7dfbf'],
        skyN: ['#0f1529', '#131a32', '#18213c', '#1e2947', '#253252', '#2e3a5d', '#3a4268', '#474872'],
        mtn: ['#6f8ca6', '#86a1b8', '#9db4c8', '#b4c7d6', '#cad8e2', '#dde7ec'],
        mtnN: ['#1b2540', '#222e4b', '#2a3756', '#334061', '#3d4a6b', '#475375'],
        cloud: ['#a9a3c2', '#c7c2da', '#dedbea', '#f0eef5', '#ffffff'],
        cloudN: ['#30335a', '#3d416a', '#4b5079', '#5a6088', '#6b7197'],
        grass: ['#425c25', '#53712c', '#668634', '#7a983c', '#90ab4a', '#a9bf62'],
        dirt: ['#5c4330', '#76583c', '#90704b', '#a8875c'],
        stone: ['#5d5853', '#77716a', '#908a80', '#a8a297', '#beb8ac', '#d4cfc3'],
        rock: ['#2e2a28', '#433c37', '#5a5049', '#71665c', '#887c70', '#a09484'],
        water: ['#1f4652', '#285a66', '#336e78', '#40838b', '#529a9f', '#6db3b3', '#97d0ca'],
        plaster: ['#b8a98c', '#cfc1a4', '#e2d7bf', '#f0e8d4'],
        red: ['#4f1712', '#6e2219', '#932f22', '#b8402c', '#d65a3c'],
        wood: ['#2f1f15', '#47301f', '#61432b', '#7c5838', '#987047'],
        roof: ['#1d2127', '#272c33', '#323840', '#3f464f', '#4e5660', '#606973', '#7a838c'],
        teal: ['#173b3d', '#22564f', '#2f7064', '#4a8e7b'],
        gold: ['#6e4a14', '#9a6c1c', '#c99632', '#ecc35a', '#f8e08e'],
        paper: ['#c2b392', '#dccfb0', '#efe6cd', '#fbf5e4'],
        maple: ['#5c1c16', '#8a2a1e', '#b53d24', '#d8582c', '#ee7f3a', '#f7a957'],
        ginkgo: ['#5e4512', '#8c6a1c', '#b99027', '#ddb536', '#f0d25a', '#f9e89a'],
        pine: ['#132822', '#1b3a30', '#25503f', '#326650', '#467f61', '#5f9873'],
        bamboo: ['#284620', '#3a6229', '#4f7f35', '#6b9d45', '#8fbd60'],
        trunk: ['#241812', '#38261b', '#4e3625', '#664731', '#7d5a3e'],
        leaf: ['#9a3220', '#c4502a', '#e07a34', '#eba341', '#d9b445'],
        lotus: ['#28502a', '#376a33', '#4c863f', '#68a052'],
        lotusF: ['#b5506f', '#da7d98', '#f2b2c4', '#fde6ee'],
        bronze: ['#22241e', '#33392c', '#4a553b', '#64714b', '#8b9360', '#bdb877'],
        lantern: ['#4f1712', '#8f2a1e', '#cd3f2b', '#ec6a47', '#f6a273'],
        glow: ['#ff9a3d', '#ffc56b', '#ffe6a6', '#fff7e0'],
        straw: ['#3b2c16', '#57421f', '#755a2a', '#927234', '#ad8a42', '#c4a256', '#d8bc74'],
        persim: ['#26331a', '#3a4d25', '#526a30', '#6d863c', '#89a04c', '#a7b866'],
        jar: ['#2a1a12', '#4a2c1c', '#6c3f24', '#8e5630', '#b0743e'],
        // Hoa đào (tô điểm đợt D): hồng sẫm ở rìa khối tán tới hồng phấn gần trắng ở chỗ đón nắng.
        peach: ['#6e2440', '#a03a62', '#cf5f88', '#ea8bab', '#f7b5cb', '#fde0ea'],
        ink: '#1a1512',
        dark: '#120d0a'
    };

    function u32(hex) {
        var n = parseInt(hex.slice(1), 16);
        return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0;
    }

    var C = (function () {
        var out = {};
        Object.keys(PAL).forEach(function (k) {
            var v = PAL[k];
            out[k] = Array.isArray(v) ? v.map(u32) : u32(v);
        });
        return out;
    }());

    // ---------- nhiễu, ngẫu nhiên, dither ----------
    function hash2(x, y, s) {
        var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1442695041);
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }

    function vnoise(x, y, s) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var xf = x - xi, yf = y - yi;
        var a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
        var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }

    function rng(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    function dith(x, y) {
        return (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
    }

    // Chọn màu trên dải theo t ∈ [0, 1]; phần lẻ giữa hai bậc trộn bằng dither Bayer.
    function ramp(cols, t, x, y) {
        var n = cols.length - 1;
        var f = Math.max(0, Math.min(0.9999, t)) * n;
        var i = Math.floor(f);
        return (f - i) > dith(x, y) ? cols[i + 1] : cols[i];
    }

    // Chọn bậc không dither (mảng màu phẳng).
    function step(cols, t) {
        var n = cols.length;
        return cols[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
    }

    function clamp(v, a, b) {
        return v < a ? a : (v > b ? b : v);
    }

    // ---------- Layer: bộ đệm pixel đặt ở toạ độ màn hình thế giới ----------
    function Layer(x, y, w, h) {
        this.x = Math.floor(x);
        this.y = Math.floor(y);
        this.w = Math.max(1, Math.ceil(w));
        this.h = Math.max(1, Math.ceil(h));
        this.px = new Uint32Array(this.w * this.h);
    }

    Layer.prototype.set = function (x, y, c) {
        var lx = x - this.x, ly = y - this.y;
        if (c && lx >= 0 && ly >= 0 && lx < this.w && ly < this.h) {
            this.px[ly * this.w + lx] = c;
        }
    };

    Layer.prototype.get = function (x, y) {
        var lx = x - this.x, ly = y - this.y;
        return (lx >= 0 && ly >= 0 && lx < this.w && ly < this.h) ? this.px[ly * this.w + lx] : 0;
    };

    Layer.prototype.rect = function (x, y, w, h, c) {
        x = Math.round(x);
        y = Math.round(y);
        for (var j = 0; j < h; j++) {
            for (var i = 0; i < w; i++) {
                this.set(x + i, y + j, typeof c === 'function' ? c(x + i, y + j, i, j) : c);
            }
        }
    };

    // Tô đa giác (toạ độ thực), lấy mẫu ở tâm pixel; fn(x, y) trả màu, 0 thì bỏ qua.
    Layer.prototype.poly = function (pts, fn) {
        var n = pts.length, i, minY = Infinity, maxY = -Infinity;
        for (i = 0; i < n; i++) {
            if (pts[i][1] < minY) minY = pts[i][1];
            if (pts[i][1] > maxY) maxY = pts[i][1];
        }
        var y0 = Math.max(Math.floor(minY), this.y);
        var y1 = Math.min(Math.ceil(maxY), this.y + this.h - 1);
        var xs = [];
        for (var y = y0; y <= y1; y++) {
            var cy = y + 0.5;
            xs.length = 0;
            for (i = 0; i < n; i++) {
                var a = pts[i], b = pts[(i + 1) % n];
                if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) {
                    xs.push(a[0] + (cy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
                }
            }
            xs.sort(function (p, q) { return p - q; });
            for (var k = 0; k + 1 < xs.length; k += 2) {
                var xa = Math.ceil(xs[k] - 0.5), xb = Math.ceil(xs[k + 1] - 0.5) - 1;
                for (var x = xa; x <= xb; x++) {
                    var c = typeof fn === 'function' ? fn(x, y) : fn;
                    if (c) this.set(x, y, c);
                }
            }
        }
    };

    // Hình bình hành O, O+U, O+U+V, O+V; fn(u, v, x, y) với u, v ∈ [0, 1).
    Layer.prototype.para = function (O, U, V, fn) {
        var det = U[0] * V[1] - U[1] * V[0];
        if (Math.abs(det) < 1e-9) return;
        var pts = [O, [O[0] + U[0], O[1] + U[1]], [O[0] + U[0] + V[0], O[1] + U[1] + V[1]], [O[0] + V[0], O[1] + V[1]]];
        this.poly(pts, function (x, y) {
            var px = x + 0.5 - O[0], py = y + 0.5 - O[1];
            var u = (px * V[1] - py * V[0]) / det;
            var v = (U[0] * py - U[1] * px) / det;
            return typeof fn === 'function' ? fn(clamp(u, 0, 0.9999), clamp(v, 0, 0.9999), x, y) : fn;
        });
    };

    // Elip tâm (cx, cy); fn(x, y, nx, ny) với (nx, ny) là độ lệch chuẩn hoá trong [-1, 1].
    Layer.prototype.ellipse = function (cx, cy, rx, ry, fn) {
        for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                var nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
                if (nx * nx + ny * ny <= 1) {
                    var c = typeof fn === 'function' ? fn(x, y, nx, ny) : fn;
                    if (c) this.set(x, y, c);
                }
            }
        }
    };

    Layer.prototype.line = function (x0, y0, x1, y1, c) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
        var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
        for (var guard = 0; guard < 4096; guard++) {
            this.set(x0, y0, typeof c === 'function' ? c(x0, y0) : c);
            if (x0 === x1 && y0 === y1) break;
            var e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
    };

    // Chép src lên layer; pixel bán trong suốt (bóng chân, hồn ma) trộn với pixel bên dưới.
    Layer.prototype.blit = function (src, dx, dy) {
        dx = Math.round(dx || 0);
        dy = Math.round(dy || 0);
        for (var j = 0; j < src.h; j++) {
            for (var i = 0; i < src.w; i++) {
                var c = src.px[j * src.w + i];
                if (!c) continue;
                var tx = src.x + i + dx, ty = src.y + j + dy;
                if ((c >>> 24) < 255) {
                    var under = this.get(tx, ty);
                    if (under) c = mixOver(under, c);
                }
                this.set(tx, ty, c);
            }
        }
    };

    // Phủ màu c (có alpha) lên màu nền d; kết quả giữ alpha lớn hơn của hai màu.
    function mixOver(d, c) {
        var a = (c >>> 24) / 255, ia = 1 - a;
        var r = Math.round((c & 255) * a + (d & 255) * ia);
        var g = Math.round(((c >>> 8) & 255) * a + ((d >>> 8) & 255) * ia);
        var b = Math.round(((c >>> 16) & 255) * a + ((d >>> 16) & 255) * ia);
        var al = Math.max(c >>> 24, d >>> 24);
        return ((al << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }

    // Bản lật ngang của một layer (nhân vật đi sang phải); giữ nguyên x, y, w, h.
    function flipLayer(L) {
        var out = new Layer(L.x, L.y, L.w, L.h);
        for (var y = 0; y < L.h; y++) {
            for (var x = 0; x < L.w; x++) out.px[y * L.w + x] = L.px[y * L.w + (L.w - 1 - x)];
        }
        return out;
    }

    // Viền ngoài 1 pixel quanh mọi pixel đặc (4 hướng). `only(c)` lọc pixel nào được tính là đặc.
    Layer.prototype.outline = function (c, only) {
        var w = this.w, h = this.h, px = this.px, out = [];
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                if (px[y * w + x]) continue;
                var hit = false;
                var nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
                for (var k = 0; k < 4 && !hit; k++) {
                    var nx = nb[k][0], ny = nb[k][1];
                    if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
                        var v = px[ny * w + nx];
                        if (v && (!only || only(v))) hit = true;
                    }
                }
                if (hit) out.push(y * w + x);
            }
        }
        for (var i = 0; i < out.length; i++) px[out[i]] = c;
    };

    // Cắt về khung nhỏ nhất chứa pixel đặc.
    Layer.prototype.trim = function () {
        var minX = this.w, minY = this.h, maxX = -1, maxY = -1;
        for (var y = 0; y < this.h; y++) {
            for (var x = 0; x < this.w; x++) {
                if (this.px[y * this.w + x]) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return new Layer(this.x, this.y, 1, 1);
        var out = new Layer(this.x + minX, this.y + minY, maxX - minX + 1, maxY - minY + 1);
        for (var j = 0; j < out.h; j++) {
            for (var i = 0; i < out.w; i++) {
                out.px[j * out.w + i] = this.px[(j + minY) * this.w + i + minX];
            }
        }
        return out;
    };

    // ---------- phép chiếu ----------
    function P(x, y, z) {
        return [(x - y) * 16, (x + y) * 8 - (z || 0)];
    }

    // Hộp [x0,x1]×[y0,y1]×[z0,z1]: mặt trên, mặt trái (+y) và mặt phải (+x). Mặt trái: u chạy theo
    // +x (trái → phải trên màn hình); mặt phải: u chạy theo −y (cũng trái → phải); v từ trên xuống.
    function box(L, x0, y0, z0, x1, y1, z1, top, left, right) {
        var h = z1 - z0;
        if (left) L.para(P(x0, y1, z1), [16 * (x1 - x0), 8 * (x1 - x0)], [0, h], left);
        if (right) L.para(P(x1, y1, z1), [16 * (y1 - y0), -8 * (y1 - y0)], [0, h], right);
        if (top) L.poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top);
    }

    // ---------- bản đồ: các bậc thang trên sườn núi ----------
    var GRID = 32;
    var WATER_DROP = 4;

    // Bậc thang (ô nửa mở [x0, x1) × [y0, y1)), từ đỉnh xuống chân núi theo đường chữ chi.
    var TERRACES = [
        { id: 'dinh', x0: 1, y0: 1, x1: 9, y1: 7, z: 36 },
        { id: 'trai', x0: 4, y0: 7, x1: 10, y1: 12, z: 24 },
        { id: 'ho', x0: 10, y0: 8, x1: 16, y1: 14, z: 12 },
        { id: 'tra', x0: 10, y0: 14, x1: 17, y1: 19, z: 0 },
        { id: 'mon', x0: 17, y0: 15, x1: 22, y1: 19, z: 0 },
        // Đất mới (bản đồ mở rộng): dải nối sân đỉnh, mỏm đá Tàng Kinh Các, vườn bếp, đảo nhỏ Vọng Vân Đình.
        { id: 'dinh-dong', x0: 9, y0: 1, x1: 10, y1: 7, z: 36 },
        { id: 'kinh', x0: 10, y0: 1, x1: 18, y1: 8, z: 36, rock: true },
        { id: 'vuon', x0: 1, y0: 12, x1: 10, y1: 19, z: 12 },
        { id: 'dao', x0: 20, y0: 2, x1: 24, y1: 6, z: 32, rock: true, cliff: [30, 42] }
    ];

    // Lát đá (ô); nước hồ (ô).
    var PAVE = [
        [2, 5, 8, 7], [7, 7, 9, 9], [7, 9, 10, 11], [10, 10, 12, 12], [10, 12, 16, 14],
        [10, 14, 12, 16], [10, 17, 17, 19], [17, 16, 22, 18],
        [8, 5, 10, 7], [10, 5, 16, 8], [15, 3, 18, 5], [5, 12, 10, 14], [2, 14, 5, 16], [21, 3, 23, 5]
    ];
    // Đất trồng rau (luống).
    var SOIL = [[6, 15, 10, 19]];
    var POND = [[12, 8, 16, 12]];
    var POND_CUT = [[12, 8], [15, 11]];

    function buildTerrain() {
        var hgt = [], typ = [], rock = [], cliff = [];
        var x, y, k, r;
        for (x = 0; x < GRID; x++) {
            hgt.push([]);
            typ.push([]);
            rock.push([]);
            cliff.push([]);
            for (y = 0; y < GRID; y++) {
                hgt[x].push(null);
                typ[x].push('');
                rock[x].push(false);
                cliff[x].push(null);
            }
        }
        TERRACES.forEach(function (t) {
            for (x = t.x0; x < t.x1; x++) {
                for (y = t.y0; y < t.y1; y++) {
                    hgt[x][y] = t.z;
                    typ[x][y] = 'grass';
                    rock[x][y] = !!t.rock;
                    cliff[x][y] = t.cliff || null;
                }
            }
        });
        for (k = 0; k < PAVE.length; k++) {
            r = PAVE[k];
            for (x = r[0]; x < r[2]; x++) {
                for (y = r[1]; y < r[3]; y++) {
                    if (hgt[x][y] !== null) typ[x][y] = 'stone';
                }
            }
        }
        for (k = 0; k < POND.length; k++) {
            r = POND[k];
            for (x = r[0]; x < r[2]; x++) {
                for (y = r[1]; y < r[3]; y++) {
                    hgt[x][y] -= WATER_DROP;
                    typ[x][y] = 'water';
                }
            }
        }
        POND_CUT.forEach(function (p) {
            hgt[p[0]][p[1]] += WATER_DROP;
            typ[p[0]][p[1]] = 'grass';
        });
        for (k = 0; k < SOIL.length; k++) {
            r = SOIL[k];
            for (x = r[0]; x < r[2]; x++) {
                for (y = r[1]; y < r[3]; y++) {
                    if (hgt[x][y] !== null) typ[x][y] = 'soil';
                }
            }
        }
        return { hgt: hgt, typ: typ, rock: rock, cliff: cliff };
    }

    var T_NONE = 0, T_GRASS = 1, T_STONE = 2, T_WATER = 3, T_WALL = 4, T_CLIFF = 5, T_SOIL = 6;
    var TYPE_ID = { grass: T_GRASS, stone: T_STONE, water: T_WATER, soil: T_SOIL };

    function terrainBounds(ter) {
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (var x = 0; x < GRID; x++) {
            for (var y = 0; y < GRID; y++) {
                if (ter.hgt[x][y] === null) continue;
                var z = ter.hgt[x][y];
                var a = P(x, y + 1, z), b = P(x + 1, y, z), c = P(x, y, z), d = P(x + 1, y + 1, z - 80);
                minX = Math.min(minX, a[0]);
                maxX = Math.max(maxX, b[0]);
                minY = Math.min(minY, c[1]);
                maxY = Math.max(maxY, d[1]);
            }
        }
        return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }

    // ---------- tô mặt đất ----------
    function grassColor(x, y, wet) {
        var n = vnoise(x * 0.11, y * 0.19, 3) * 0.7 + vnoise(x * 0.33, y * 0.5, 9) * 0.3;
        var t = n * 0.95 + (hash2(x, y, 4) - 0.5) * 0.18 - (wet || 0);
        if (t < 0.3) return C.grass[1];
        if (t < 0.5) return C.grass[2];
        if (t < 0.72) return C.grass[3];
        return C.grass[4];
    }

    // Đá lát: phiến nửa ô xếp so le; mạch vữa 1 px, mép trên sáng, mép dưới tối.
    function slabId(wx, wy) {
        var v = Math.floor(wy * 2);
        var u = Math.floor(wx * 2 + ((v & 1) ? 0.5 : 0));
        return u * 1031 + v;
    }

    function worldXY(sx, sy, z) {
        var a = (sx + 0.5) / 16, b = (sy + 0.5 + z) / 8;
        return [(a + b) / 2, (b - a) / 2];
    }

    function stoneColor(x, y, z) {
        var p = worldXY(x, y, z), up = worldXY(x, y - 1, z), left = worldXY(x - 1, y, z), down = worldXY(x, y + 1, z);
        var id = slabId(p[0], p[1]);
        if (id !== slabId(up[0], up[1]) || id !== slabId(left[0], left[1])) return C.stone[1];
        var tone = 2 + Math.floor(hash2(id, 7, 5) * 3);
        if (id !== slabId(down[0], down[1])) tone = Math.max(1, tone - 1);
        if (hash2(x, y, 6) < 0.05) tone = Math.max(1, tone - 1);
        return C.stone[Math.min(5, tone)];
    }

    // Vách đá đảo: tảng đá có vân ngang, rêu ở mép trên, đáy tan dần vào mây.
    function cliffColor(u, v, x, y, depth) {
        var fy = v * depth;
        if (fy < 1.5) return C.grass[1];
        if (fy < 3 && hash2(x, y, 31) < 0.55) return C.grass[0];
        var n = vnoise(x * 0.15, y * 0.45, 21);
        var t = 0.62 - fy / depth * 0.42 + (n - 0.5) * 0.35 + (hash2(x, y, 22) - 0.5) * 0.12;
        var band = Math.floor((y + Math.floor(vnoise(x * 0.07, 3, 23) * 5)) / 5);
        if (((y + Math.floor(vnoise(x * 0.07, 3, 23) * 5)) % 5) === 0 && hash2(band, Math.floor(x / 6), 24) < 0.7) t -= 0.25;
        var fade = fy / depth;
        if (fade > 0.62 && dith(x, y) < (fade - 0.62) * 2.4) return 0;
        return ramp(C.rock, t, x, y);
    }

    // Kè đá giữa hai bậc: đá khối xếp hàng 4 px, mép trên là gờ đá sáng.
    function wallColor(u, v, x, y, len, hgt, lit) {
        var fx = Math.floor(u * len), fy = Math.floor(v * hgt);
        if (fy === 0) return lit ? C.stone[5] : C.stone[4];
        if (fy === 1) return lit ? C.stone[3] : C.stone[2];
        if (fy >= hgt - 1) return C.stone[0];
        var row = Math.floor((fy - 2) / 4);
        var off = (row & 1) ? 5 : 0;
        if ((fy - 2) % 4 === 3) return C.stone[1];
        if ((fx + off) % 10 === 0) return C.stone[1];
        var tone = (lit ? 3 : 2) + (hash2(Math.floor((fx + off) / 10), row, 41) < 0.3 ? -1 : 0);
        if (hash2(x, y, 42) < 0.04) tone -= 1;
        return C.stone[clamp(tone, 1, 5)];
    }

    // Luống rau: đất tơi, rãnh sẫm chạy dọc trục x, mỗi luống rộng nửa ô.
    function soilColor(x, y, z) {
        var p = worldXY(x, y, z);
        var f = p[1] * 2 - Math.floor(p[1] * 2);
        if (f < 0.22) return C.dirt[0];
        if (f > 0.8) return C.dirt[1];
        return ramp(C.dirt, 0.5 + (vnoise(x * 0.4, y * 0.6, 57) - 0.5) * 0.5 + (hash2(x, y, 58) - 0.5) * 0.2, x, y);
    }

    // Vách đá tự nhiên giữa hai bậc (mỏm đá): như vách đảo nhưng không tan vào mây.
    function rockFace(u, v, x, y, depth) {
        var fy = v * depth;
        if (fy < 1.5) return C.grass[1];
        if (fy < 3 && hash2(x, y, 31) < 0.55) return C.grass[0];
        var n = vnoise(x * 0.15, y * 0.45, 21);
        var t = 0.6 - v * 0.3 + (n - 0.5) * 0.35 + (hash2(x, y, 22) - 0.5) * 0.12;
        if (((y + Math.floor(vnoise(x * 0.07, 3, 23) * 5)) % 5) === 0 && hash2(Math.floor(y / 5), Math.floor(x / 6), 24) < 0.7) t -= 0.25;
        return ramp(C.rock, t, x, y);
    }

    // Bờ hồ: đất ẩm sẫm.
    function bankColor(u, v, x, y) {
        return v < 0.35 ? C.grass[0] : ramp(C.dirt, 0.25 - v * 0.2 + (hash2(x, y, 51) - 0.5) * 0.2, x, y);
    }

    // Dựng lớp mặt đất: mặt ô, kè, vách, nước. Trả { layer, types } (types: loại địa hình từng pixel).
    function renderGround(ter) {
        var bb = terrainBounds(ter);
        var L = new Layer(bb.x - 8, bb.y - 8, bb.w + 16, bb.h + 16);
        var types = new Uint8Array(L.w * L.h);
        function mark(x, y, t) {
            var lx = x - L.x, ly = y - L.y;
            if (lx >= 0 && ly >= 0 && lx < L.w && ly < L.h) types[ly * L.w + lx] = t;
        }
        var order = [];
        for (var x = 0; x < GRID; x++) {
            for (var y = 0; y < GRID; y++) {
                if (ter.hgt[x][y] !== null) order.push([x, y]);
            }
        }
        order.sort(function (a, b) { return (a[0] + a[1]) - (b[0] + b[1]) || a[0] - b[0]; });
        order.forEach(function (t) {
            var x = t[0], y = t[1], z = ter.hgt[x][y], kind = ter.typ[x][y];
            var tid = TYPE_ID[kind];
            L.poly([P(x, y, z), P(x + 1, y, z), P(x + 1, y + 1, z), P(x, y + 1, z)], function (sx, sy) {
                mark(sx, sy, tid);
                if (kind === 'stone') return stoneColor(sx, sy, z);
                if (kind === 'water') return C.water[3];
                if (kind === 'soil') return soilColor(sx, sy, z);
                return grassColor(sx, sy);
            });
            // Mặt trái (+y) và mặt phải (+x) nếu ô bên cạnh thấp hơn hoặc là vực.
            [[0, 1], [1, 0]].forEach(function (d) {
                var nx = x + d[0], ny = y + d[1];
                var nz = (nx < GRID && ny < GRID) ? ter.hgt[nx][ny] : null;
                if (nz !== null && nz >= z) return;
                var cliff = nz === null;
                var cd = ter.cliff[x][y] || [46, 68];
                var depth = cliff ? cd[0] + Math.floor(hash2(x, y, 61) * (cd[1] - cd[0])) : z - nz;
                var rocky = ter.rock[x][y];
                var isLeft = d[1] === 1;
                var O = isLeft ? P(x, y + 1, z) : P(x + 1, y + 1, z);
                var U = isLeft ? [16, 8] : [16, -8];
                var bank = !cliff && ter.typ[nx][ny] === 'water';
                L.para(O, U, [0, depth], function (u, v, sx, sy) {
                    if (cliff) {
                        var c = cliffColor(u, v, sx, sy, depth);
                        if (c) mark(sx, sy, T_CLIFF);
                        return c && !isLeft ? darker(c) : c;
                    }
                    mark(sx, sy, T_WALL);
                    // Vách cao đứng trong nước: chỉ mấy pixel sát mặt nước là bờ đất ẩm.
                    if (bank && v * depth >= depth - WATER_DROP - 1) return bankColor(u, v, sx, sy);
                    if (rocky) {
                        var rc = rockFace(u, v, sx, sy, depth);
                        return isLeft ? rc : darker(rc);
                    }
                    return wallColor(isLeft ? u : 1 - u, v, sx, sy, 16, depth, isLeft);
                });
            });
        });
        shadeWater(L, types);
        edgeStone(L, types);
        return { layer: L, types: types };
    }

    // Màu tối hơn một bậc (cho mặt phải của vách): tra ngược trong các dải đã biết.
    var DARKER = (function () {
        var map = {};
        ['rock', 'grass', 'stone', 'dirt', 'plaster', 'red', 'wood', 'roof', 'maple', 'ginkgo', 'pine', 'bamboo', 'trunk', 'bronze', 'water', 'straw', 'persim', 'jar']
            .forEach(function (k) {
                var r = C[k];
                for (var i = 1; i < r.length; i++) map[r[i]] = r[i - 1];
                map[r[0]] = r[0];
            });
        return map;
    }());
    function darker(c) {
        return DARKER[c] || c;
    }

    // Nước: càng xa bờ càng sẫm; mép sát bờ là vệt sáng.
    function shadeWater(L, types) {
        var w = L.w, h = L.h, n = w * h, dist = new Float32Array(n), i, x, y;
        for (i = 0; i < n; i++) dist[i] = types[i] === T_WATER ? 1e9 : 0;
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                i = y * w + x;
                if (!dist[i]) continue;
                if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + 1);
                if (y > 0) dist[i] = Math.min(dist[i], dist[i - w] + 1);
            }
        }
        for (y = h - 1; y >= 0; y--) {
            for (x = w - 1; x >= 0; x--) {
                i = y * w + x;
                if (!dist[i]) continue;
                if (x < w - 1) dist[i] = Math.min(dist[i], dist[i + 1] + 1);
                if (y < h - 1) dist[i] = Math.min(dist[i], dist[i + w] + 1);
            }
        }
        for (y = 0; y < h; y++) {
            for (x = 0; x < w; x++) {
                i = y * w + x;
                if (types[i] !== T_WATER) continue;
                var d = dist[i];
                var sx = x + L.x, sy = y + L.y;
                var c;
                if (d <= 1) c = C.water[6];
                else if (d <= 2) c = C.water[5];
                else c = ramp(C.water, 0.72 - Math.min(1, (d - 2) / 14) * 0.62 + (vnoise(sx * 0.2, sy * 0.4, 71) - 0.5) * 0.12, sx, sy);
                // Bóng bờ phía xa (phía trên) phản chiếu sẫm hơn.
                if (y > 2 && types[i - w] !== T_WATER && types[i - w] !== 0 && d < 5) c = C.water[1];
                if (y > 3 && types[i - 2 * w] !== T_WATER && types[i - 2 * w] !== 0 && d < 5) c = C.water[2];
                L.px[i] = c;
            }
        }
    }

    // Mép sân lát đá giáp cỏ: viền đá sẫm cho rõ khối.
    function edgeStone(L, types) {
        var w = L.w, h = L.h, out = [];
        for (var y = 1; y < h - 1; y++) {
            for (var x = 1; x < w - 1; x++) {
                var i = y * w + x;
                if (types[i] !== T_STONE) continue;
                if (types[i - 1] === T_GRASS || types[i + 1] === T_GRASS || types[i - w] === T_GRASS || types[i + w] === T_GRASS) out.push(i);
            }
        }
        for (var k = 0; k < out.length; k++) L.px[out[k]] = C.stone[1];
    }

    // ---------- trang trí mặt đất (cỏ, hoa, lá rụng, sen) ----------
    function decorGround(G, ter, opt) {
        var L = G.layer, types = G.types;
        var r = rng(opt.seed || 7);
        var w = L.w, h = L.h;
        function typeAt(x, y) {
            var lx = x - L.x, ly = y - L.y;
            return (lx >= 0 && ly >= 0 && lx < w && ly < h) ? types[ly * w + lx] : 0;
        }
        var i, x, y;
        // Khóm cỏ: chữ V sáng có chân sẫm.
        for (i = 0; i < 420; i++) {
            x = L.x + Math.floor(r() * w);
            y = L.y + Math.floor(r() * h);
            if (typeAt(x, y) !== T_GRASS || typeAt(x, y + 2) !== T_GRASS || typeAt(x - 1, y) !== T_GRASS || typeAt(x + 1, y) !== T_GRASS) continue;
            L.set(x, y + 1, C.grass[1]);
            L.set(x - 1, y, C.grass[4]);
            L.set(x + 1, y, C.grass[5]);
            L.set(x, y, C.grass[3]);
            if (r() < 0.4) L.set(x, y - 1, C.grass[5]);
        }
        // Hoa nhỏ.
        var flowers = [C.paper[3], C.gold[4], C.lotusF[2], '#ffffff'];
        for (i = 0; i < 70; i++) {
            x = L.x + Math.floor(r() * w);
            y = L.y + Math.floor(r() * h);
            if (typeAt(x, y) !== T_GRASS || typeAt(x, y + 1) !== T_GRASS) continue;
            L.set(x, y, typeof flowers[i % 4] === 'string' ? u32(flowers[i % 4]) : flowers[i % 4]);
            L.set(x, y + 1, C.grass[1]);
        }
        // Lá phong rụng quanh gốc cây.
        (opt.leafAt || []).forEach(function (p) {
            for (var k = 0; k < (p.n || 26); k++) {
                var a = r() * Math.PI * 2, d = Math.sqrt(r()) * (p.r || 22);
                var lx = Math.round(p.x + Math.cos(a) * d * 1.4), ly = Math.round(p.y + Math.sin(a) * d * 0.7);
                var t = typeAt(lx, ly);
                if (t !== T_GRASS && t !== T_STONE) continue;
                var col = (p.pal || C.leaf)[Math.floor(r() * 4)];
                L.set(lx, ly, col);
                if (r() < 0.5) L.set(lx + 1, ly, col);
            }
        });
        // Lá sen trên mặt nước.
        (opt.lotus || []).forEach(function (p) {
            var rx = p.r || 4, ry = Math.max(2, Math.round(rx * 0.55));
            var notch = r() * Math.PI * 2;
            L.ellipse(p.x, p.y, rx, ry, function (sx, sy, nx, ny) {
                if (typeAt(sx, sy) !== T_WATER) return 0;
                var a = Math.atan2(ny, nx);
                var dd = Math.abs(((a - notch + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
                if (dd < 0.32 && nx * nx + ny * ny > 0.08) return 0;
                if (nx * nx + ny * ny > 0.72) return C.lotus[0];
                return ny < -0.1 ? C.lotus[3] : (ny < 0.35 ? C.lotus[2] : C.lotus[1]);
            });
            if (p.flower) {
                var fx = Math.round(p.x), fy = Math.round(p.y - 2);
                L.set(fx, fy - 1, C.lotusF[2]);
                L.set(fx - 1, fy, C.lotusF[1]);
                L.set(fx, fy, C.lotusF[3]);
                L.set(fx + 1, fy, C.lotusF[1]);
                L.set(fx, fy + 1, C.lotusF[0]);
            }
        });
        // Lá khô và cỏ dại phủ sân đá khi chưa quét dọn.
        (opt.mess || []).forEach(function (p) {
            for (var k = 0; k < (p.n || 40); k++) {
                var a = r() * Math.PI * 2, d = Math.sqrt(r()) * (p.r || 14);
                var lx = Math.round(p.x + Math.cos(a) * d * 1.5), ly = Math.round(p.y + Math.sin(a) * d * 0.7);
                if (typeAt(lx, ly) !== T_STONE) continue;
                if (r() < 0.3) {
                    L.set(lx, ly, C.grass[3]);
                    L.set(lx, ly - 1, C.grass[4]);
                    L.set(lx + 1, ly, C.grass[2]);
                } else {
                    var col = [C.dirt[1], C.dirt[2], C.leaf[0], C.leaf[1], C.dirt[3]][Math.floor(r() * 5)];
                    L.set(lx, ly, col);
                    L.set(lx + 1, ly, col);
                    if (r() < 0.5) L.set(lx, ly - 1, darker(col));
                }
            }
        });
    }

    // ---------- mái ngói ----------
    // Mái chái (bốn mái) góc cong: hình chữ nhật mép mái [x0,x1]×[y0,y1] ở độ cao ze, nóc cao zr
    // chạy dọc trục dài. o.broken: mái thủng (lộ rui, cỏ mọc); o.tone: dịch sáng/tối cả mái.
    function hipRoof(L, o) {
        var x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1, ze = o.ze, zr = o.zr;
        var alongX = (x1 - x0) >= (y1 - y0);
        var lift = o.lift || 0;
        var half = alongX ? (y1 - y0) / 2 : (x1 - x0) / 2;
        var inset = half * (o.inset || 1);
        var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
        var R0, R1;
        if (alongX) {
            R0 = [x0 + inset, ym, zr];
            R1 = [x1 - inset, ym, zr];
        } else {
            R0 = [xm, y0 + inset, zr];
            R1 = [xm, y1 - inset, zr];
        }
        var curve = function (t) {
            var k = Math.abs(2 * t - 1);
            return lift * Math.pow(k, 2.4);
        };
        // Mép mái cong lên ở hai đầu: chia mép thành nhiều đoạn.
        function edge(ax, ay, bx, by) {
            var pts = [];
            for (var i = 0; i <= 12; i++) {
                var t = i / 12;
                pts.push(P(ax + (bx - ax) * t, ay + (by - ay) * t, ze + curve(t)));
            }
            return pts;
        }
        var faces;
        if (alongX) {
            faces = [
                { pts: edge(x1, y0, x0, y0), ridge: [R0, R1], hidden: true },
                { pts: edge(x0, y0, x0, y1), ridge: [R0], hidden: true },
                { pts: edge(x0, y1, x1, y1), ridge: [R1, R0], lit: true, A: [x0, y1, x1, y1] },
                { pts: edge(x1, y1, x1, y0), ridge: [R1], lit: false, A: [x1, y1, x1, y0] }
            ];
        } else {
            faces = [
                { pts: edge(x0, y1, x0, y0), ridge: [R0, R1], hidden: true },
                { pts: edge(x1, y0, x0, y0), ridge: [R0], hidden: true },
                { pts: edge(x0, y1, x1, y1), ridge: [R1], lit: true, A: [x0, y1, x1, y1] },
                { pts: edge(x1, y1, x1, y0), ridge: [R0, R1], lit: false, A: [x1, y1, x1, y0] }
            ];
        }
        var shift = o.tone || 0;
        var RP = o.pal || C.roof;
        var holes = [];
        if (o.broken) {
            var r = rng(o.seed || 3);
            for (var hI = 0; hI < 3; hI++) holes.push({ s: 0.18 + r() * 0.64, h: 0.25 + r() * 0.4, rs: 0.07 + r() * 0.05, rh: 0.16 + r() * 0.12 });
        }
        faces.forEach(function (f) {
            var pts = f.pts.slice();
            f.ridge.forEach(function (p) { pts.push(P(p[0], p[1], p[2])); });
            if (f.hidden) {
                L.poly(pts, RP[1]);
                return;
            }
            // Toạ độ (s, h) trên mặt mái: s dọc mép mái, h từ mép lên nóc.
            var E0 = P(f.A[0], f.A[1], ze), E1 = P(f.A[2], f.A[3], ze);
            var A = [E1[0] - E0[0], E1[1] - E0[1]];
            var Rz = f.ridge[0];
            var foot = (f.A[1] === f.A[3]) ? P(Rz[0], f.A[1], ze) : P(f.A[0], Rz[1], ze);
            var top = P(Rz[0], Rz[1], Rz[2]);
            var D = [top[0] - foot[0], top[1] - foot[1]];
            var det = A[0] * D[1] - A[1] * D[0];
            var slopeLen = Math.sqrt(D[0] * D[0] + D[1] * D[1]);
            var lenUnits = Math.abs(f.A[2] - f.A[0]) + Math.abs(f.A[3] - f.A[1]);
            L.poly(pts, function (x, y) {
                var qx = x + 0.5 - E0[0], qy = y + 0.5 - E0[1];
                var s = (qx * D[1] - qy * D[0]) / det;
                var hh = (A[0] * qy - A[1] * qx) / det;
                // Mép mái cong: h tính từ mép đã nâng.
                var hEdge = -curve(clamp(s, 0, 1)) * A[0] / det;
                var hp = (hh - hEdge) * slopeLen;
                if (o.thatch) {
                    // Mái tranh: từng lớp rơm 5 px, sợi rơm sáng tối theo nhiễu, mép mái dày sẫm.
                    var band = Math.floor(hp / 5);
                    var tt = (f.lit ? 0.6 : 0.36) + (vnoise(s * lenUnits * 9 + band * 3.1, band * 1.7, 87) - 0.5) * 0.4 +
                        (hash2(x, y, 88) - 0.5) * 0.16;
                    if ((Math.floor(hp) % 5) === 0) tt -= 0.18;
                    if (hp < 2.2) tt -= 0.2;
                    return ramp(RP, clamp(tt, 0.02, 0.98), x, y);
                }
                var stripe = s * lenUnits * 4;
                var ph = stripe - Math.floor(stripe);
                var base = f.lit ? 4 : 2;
                var tone = base + shift;
                if (ph < 0.25) tone += 1;
                else if (ph >= 0.75) tone -= 2;
                // Hàng ngói ngang mỗi 4 px theo chiều dốc.
                if ((Math.floor(hp) % 4) === 0 && ph >= 0.25) tone -= 1;
                // Đầu ngói ở mép mái.
                if (hp < 2.2) tone = ph < 0.5 ? base + 2 + shift : base - 2 + shift;
                for (var k = 0; k < holes.length; k++) {
                    var hs = (s - holes[k].s) / holes[k].rs, hv = (hh - holes[k].h) / holes[k].rh;
                    var dd = hs * hs + hv * hv + (vnoise(x * 0.4, y * 0.4, 81 + k) - 0.5) * 0.9;
                    if (dd < 1) {
                        var rafter = (Math.floor(s * lenUnits * 16 / 3) % 2) === 0;
                        if (dd < 0.75) return rafter ? C.wood[2] : C.dark;
                        return RP[f.lit ? 2 : 1];
                    }
                    if (dd < 1.5 && hash2(x, y, 83) < 0.3) return C.grass[3];
                }
                if (o.broken && hash2(x, y, 84) < 0.025) return C.grass[2 + Math.floor(hash2(x, y, 85) * 3)];
                return RP[clamp(tone, 0, 6)];
            });
        });
        // Bóng dưới mép mái (độ dày tàu mái).
        var edgeFront = edge(x0, y1, x1, y1);
        var edgeSide = edge(x1, y1, x1, y0);
        [edgeFront, edgeSide].forEach(function (pts) {
            for (var i = 0; i + 1 < pts.length; i++) {
                L.line(pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, RP[0]);
                L.line(pts[i][0], pts[i][1] + 2, pts[i + 1][0], pts[i + 1][1] + 2, C.wood[1]);
            }
        });
        // Nóc mái và hai đầu đao (chim vẫn).
        var a = P(R0[0], R0[1], R0[2]), b = P(R1[0], R1[1], R1[2]);
        for (var t = 0; t <= 2; t++) {
            L.line(a[0], a[1] - t, b[0], b[1] - t, t === 2 ? RP[5] : (t === 1 ? RP[3] : RP[1]));
        }
        L.line(a[0], a[1] + 1, b[0], b[1] + 1, RP[0]);
        // Gờ chái: từ đầu nóc xuống góc mái trước.
        var cornerFront = P(x1, y1, ze + lift), cornerLeft = P(x0, y1, ze + lift), cornerRight = P(x1, y0, ze + lift);
        var hips = alongX ? [[a, cornerLeft], [b, cornerFront], [b, cornerRight]] : [[b, cornerLeft], [b, cornerFront], [a, cornerRight]];
        hips.forEach(function (hp) {
            L.line(hp[0][0], hp[0][1], hp[1][0], hp[1][1], RP[5]);
            L.line(hp[0][0], hp[0][1] + 1, hp[1][0], hp[1][1] + 1, RP[2]);
        });
        // Đầu đao cong vút ở các góc.
        if (!o.thatch) {
            [cornerFront, cornerLeft, cornerRight].forEach(function (c) {
                L.set(Math.round(c[0]), Math.round(c[1]) - 1, RP[5]);
                L.set(Math.round(c[0]), Math.round(c[1]) - 2, RP[6]);
            });
        }
        if (o.apex) {
            // Mái chóp: bầu hồ lô đồng trên đỉnh thay cho hai đầu đao.
            var ax = Math.round(a[0]), ay = Math.round(a[1]);
            L.rect(ax - 1, ay - 4, 3, 3, C.gold[2]);
            L.set(ax - 1, ay - 4, C.gold[4]);
            L.set(ax + 1, ay - 2, C.gold[1]);
            L.set(ax, ay - 5, C.gold[2]);
            L.rect(ax - 1, ay - 8, 3, 3, C.gold[3]);
            L.set(ax - 1, ay - 8, C.gold[4]);
            L.set(ax + 1, ay - 6, C.gold[1]);
            L.set(ax, ay - 9, C.gold[3]);
            L.set(ax, ay - 10, C.gold[4]);
        } else if (!o.thatch && !(o.broken && o.noOrnament)) {
            ridgeOrnament(L, Math.round(a[0]), Math.round(a[1]), -1);
            ridgeOrnament(L, Math.round(b[0]), Math.round(b[1]), 1);
        }
        if (o.pearl) {
            var mx = Math.round((a[0] + b[0]) / 2), my = Math.round((a[1] + b[1]) / 2) - 3;
            L.rect(mx - 1, my - 1, 3, 3, C.gold[3]);
            L.set(mx - 1, my - 1, C.gold[4]);
            L.set(mx, my - 2, C.gold[2]);
        }
    }

    // Đầu đao trên nóc: hình móc cong (dir: -1 bên trái, 1 bên phải).
    function ridgeOrnament(L, x, y, dir) {
        var shape = ['.##', '#..', '#.#', '##.'];
        for (var j = 0; j < shape.length; j++) {
            for (var i = 0; i < 3; i++) {
                if (shape[j][i] === '#') L.set(x + (dir > 0 ? i : -i), y - 4 + j, j === 0 ? C.roof[5] : C.roof[1]);
            }
        }
    }

    // ---------- nhà ----------
    // Mặt tiền điện: cửa bức bàn (song giấy trên, ván dưới), giữa hai cột đỏ mỗi gian.
    function facadeDoors(u, v, x, y, len, hgt, opt) {
        var fx = Math.floor(u * len), fy = Math.floor(v * hgt);
        var bay = 16 * (opt.bay || 1);
        var bx = fx % bay;
        if (fy < 4) {
            // Xà sơn xanh có chấm vàng.
            if (fy === 0) return C.teal[0];
            if (fy === 3) return C.red[1];
            return ((fx + fy * 3) % 6 === 0) ? C.gold[3] : (fy === 1 ? C.teal[2] : C.teal[1]);
        }
        if (bx < 2) return bx === 0 ? C.red[3] : C.red[2];
        var mid = Math.floor(opt.bays / 2);
        var b = Math.floor(fx / bay);
        if (opt.openMiddle && b === mid && fy > 5) {
            // Cửa giữa mở: trong tối, tượng vàng mờ.
            var cx = bx - bay / 2;
            if (fy > hgt - 9 && fy < hgt - 2 && Math.abs(cx) < 2) return fy === hgt - 8 ? C.gold[3] : C.gold[1];
            if (fy === hgt - 2 && Math.abs(cx) < 4) return C.red[1];
            return fy < 8 ? C.wood[0] : C.dark;
        }
        if (fy >= hgt - 2) return C.wood[1];
        var leaf = (bx - 2) % 4;
        if (leaf === 3) return C.wood[1];
        var lower = fy >= hgt - 9;
        if (lower) return fy === hgt - 6 ? C.wood[4] : C.red[2];
        // Song cửa: lưới 3 px.
        if (leaf === 1 && ((fy - 5) % 3 === 1)) return C.wood[2];
        if (((fy - 5) % 3) === 0) return C.wood[2];
        return opt.lit ? C.glow[2] : (fy < 7 ? C.paper[1] : C.paper[2]);
    }

    // Tường hồi: tường vôi, khung gỗ đỏ ở mép, chân tường đá.
    function sideWall(u, v, x, y, len, hgt, opt) {
        var fx = Math.floor(u * len), fy = Math.floor(v * hgt);
        if (fy < 4) {
            if (fy === 0) return C.teal[0];
            return ((fx * 2 + fy) % 6 === 0) ? C.gold[2] : C.teal[1];
        }
        if (fx < 2 || fx >= len - 2) return fx === 0 || fx === len - 1 ? C.red[1] : C.red[2];
        if (fy >= hgt - 3) return fy === hgt - 3 ? C.stone[2] : C.stone[1];
        if (opt && opt.window) {
            var wx = fx - len / 2, wy = fy - hgt / 2;
            if (opt.round) {
                var rr = Math.min(len, hgt) * 0.3;
                var d = Math.sqrt(wx * wx * 0.9 + wy * wy * 1.2);
                if (d < rr) {
                    if (d > rr - 1.3) return C.wood[1];
                    if ((Math.floor(wx + 50) % 3 === 0) || (Math.floor(wy + 50) % 3 === 0)) return C.wood[2];
                    return opt.lit ? C.glow[2] : C.paper[1];
                }
                if (d < rr + 1) return C.plaster[0];
            } else if (Math.abs(wx) < 5 && Math.abs(wy) < 4) {
                if (Math.abs(wx) > 3.5 || Math.abs(wy) > 2.5) return C.wood[1];
                if ((Math.floor(wx + 50) % 2 === 0) && (Math.floor(wy + 50) % 2 === 0)) return C.wood[2];
                return opt.lit ? C.glow[2] : C.paper[1];
            }
        }
        var n = hash2(x, y, 91);
        var tone = 2 + (n < 0.06 ? -1 : 0) - (opt && opt.dim ? 1 : 0);
        if (fy < 6) tone -= 1;
        return C.plaster[clamp(tone, 0, 3)];
    }

    // Cột đỏ đứng tự do (hiên trước).
    function pillar(L, x, y, z0, z1, w) {
        w = w || 0.18;
        box(L, x - w / 2, y - w / 2, z0, x + w / 2, y + w / 2, z1, C.red[3], function (u) {
            return u < 0.34 ? C.red[4] : C.red[3];
        }, function (u) {
            return u > 0.66 ? C.red[1] : C.red[2];
        });
        // Chân tảng đá.
        box(L, x - w / 2 - 0.05, y - w / 2 - 0.05, z0, x + w / 2 + 0.05, y + w / 2 + 0.05, z0 + 2, C.stone[4], C.stone[3], C.stone[2]);
    }

    // Đèn lồng đỏ treo dưới mái (5×6 px), dây và tua vàng.
    function hangLantern(L, sx, sy, len) {
        sx = Math.round(sx);
        sy = Math.round(sy);
        for (var k = 0; k < len; k++) L.set(sx, sy + k, C.ink);
        var y = sy + len;
        L.rect(sx - 1, y, 3, 1, C.gold[2]);
        L.rect(sx - 2, y + 1, 5, 4, function (x, yy, i, j) {
            if ((i === 0 || i === 4) && (j === 0 || j === 3)) return 0;
            return i < 2 ? C.lantern[3] : (i === 4 ? C.lantern[1] : C.lantern[2]);
        });
        L.set(sx - 1, y + 2, C.lantern[4]);
        L.rect(sx - 1, y + 5, 3, 1, C.gold[2]);
        L.set(sx, y + 6, C.gold[3]);
        L.set(sx, y + 7, C.red[2]);
        light(sx, y + 3, 16, 0.9);
    }

    // Đêm rằm: một sợi dây võng giữa hai điểm (toạ độ thế giới xa..xb, cùng y, z), n đèn tròn đỏ treo đều; dưới mỗi đèn
    // một dải giấy đố chữ có vệt mực. Thân đèn và dải giấy dùng màu phát sáng (EMISSIVE) nên ban đêm không bị nhuộm.
    function drawRamLamps(L, xa, xb, y, z, n) {
        var a = P(xa, y, z), b = P(xb, y, z);
        var steps = Math.max(2, Math.round(Math.abs(b[0] - a[0])));
        var rope = function (t) {
            return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 6 * 4 * t * (1 - t)];
        };
        // Dây màu vàng sẫm: dây mực đen chìm mất trên mái đêm.
        for (var k = 0; k <= steps; k++) {
            var p = rope(k / steps);
            L.set(Math.round(p[0]), Math.round(p[1]), C.gold[2]);
        }
        for (var i = 0; i < n; i++) {
            var q = rope((i + 1) / (n + 1));
            var sx = Math.round(q[0]), sy = Math.round(q[1]);
            L.set(sx, sy + 1, C.ink);
            L.rect(sx - 2, sy + 2, 5, 1, C.gold[2]);
            L.rect(sx - 3, sy + 3, 7, 6, function (x, yy, ii, jj) {
                if ((ii === 0 || ii === 6) && (jj === 0 || jj === 5)) return 0;
                return ii < 2 ? C.lantern[3] : (ii > 4 ? C.lantern[1] : C.lantern[2]);
            });
            L.set(sx - 1, sy + 5, C.lantern[4]);
            L.rect(sx - 2, sy + 9, 5, 1, C.gold[2]);
            L.rect(sx - 1, sy + 10, 3, 6, C.glow[2]);
            L.set(sx, sy + 11, C.ink);
            L.set(sx, sy + 13, C.ink);
            L.set(sx - 1, sy + 14, C.ink);
            light(sx, sy + 6, 18, 0.9);
        }
    }

    function drawHall(L, o) {
        var z = o.z;
        var x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1;
        var yw = y1 - 0.55; // mặt tiền lùi vào để có hiên
        // Nền đá thấp.
        box(L, x0 - 0.2, y0 - 0.2, z, x1 + 0.2, y1 + 0.15, z + 3, function (x, y) {
            return hash2(x, y, 101) < 0.08 ? C.stone[3] : C.stone[4];
        }, function (u, v, x, y) {
            return v < 0.34 ? C.stone[4] : C.stone[2];
        }, function (u, v) {
            return v < 0.34 ? C.stone[3] : C.stone[1];
        });
        var zb = z + 3, zt = z + 3 + o.wallH;
        var lenL = (x1 - x0) * 16, lenR = (yw - y0) * 16;
        box(L, x0, y0, zb, x1, yw, zt, null, function (u, v, x, y) {
            return facadeDoors(u, v, x, y, lenL, o.wallH, { bay: 1, bays: Math.round(x1 - x0), openMiddle: true, lit: o.night && o.lit });
        }, function (u, v, x, y) {
            return sideWall(u, v, x, y, lenR, o.wallH, { window: true, dim: true, lit: o.night && o.lit });
        });
        // Bóng mái đổ lên mặt tiền.
        L.para(P(x0, yw, zt), [lenL, lenL / 2], [0, 3], function (u, v, x, y) {
            var c = L.get(x, y);
            return c ? darker(c) : 0;
        });
        // Hàng cột hiên.
        for (var cx = x0 + 0.1; cx <= x1 - 0.05; cx += 1) {
            pillar(L, cx, y1 - 0.12, zb, zt + 2);
        }
        pillar(L, x1 - 0.1, y1 - 0.12, zb, zt + 2);
        // Xà ngang trên đầu cột.
        box(L, x0, y1 - 0.2, zt, x1, y1 - 0.04, zt + 3, C.red[2], function (u, v, x, y) {
            return v < 0.4 ? C.teal[2] : ((Math.floor(u * lenL) % 5 === 0) ? C.gold[3] : C.teal[1]);
        }, C.teal[0]);
        hipRoof(L, {
            x0: x0 - 0.7, y0: y0 - 0.6, x1: x1 + 0.7, y1: y1 + 0.45,
            ze: zt + 2, zr: zt + 2 + o.roofH, inset: 0.82, lift: 6,
            broken: o.broken, seed: 17, pearl: !o.broken
        });
        if (o.lanterns) {
            for (var lx = x0 + 0.6; lx < x1 - 0.3; lx += 1) {
                var p = P(lx, y1 + 0.5, zt + 3);
                hangLantern(L, p[0], p[1], 4);
            }
        }
        // Đêm rằm: hàng đèn đố chữ trên dây trước hiên, thấp hơn hàng đèn lồng (o.ramLamps đèn).
        if (o.ramLamps) drawRamLamps(L, x0 + 0.3, x1 - 0.3, y1 + 0.85, zt - 2, o.ramLamps);
        // Biển ngạch giữa mái hiên.
        var mid = (x0 + x1) / 2;
        if (o.night && o.lit) {
            var door = P(mid, y1 + 0.3, zb + 6);
            light(door[0], door[1], 30, 0.9);
        }
        L.para(P(mid - 0.9, y1 + 0.05, zt + 11), [28.8, 14.4], [0, 8], function (u, v) {
            if (u < 0.04 || u > 0.96 || v < 0.13 || v > 0.86) return C.gold[2];
            return C.ink;
        });
    }

    function drawTeahouse(L, o) {
        var z = o.z, x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1;
        var yw = y1 - 0.5;
        box(L, x0 - 0.15, y0 - 0.15, z, x1 + 0.15, y1 + 0.1, z + 2, C.stone[4], C.stone[3], C.stone[2]);
        var zb = z + 2, zt = zb + o.wallH;
        var lenL = (x1 - x0) * 16, lenR = (yw - y0) * 16;
        box(L, x0, y0, zb, x1, yw, zt, null, function (u, v, x, y) {
            var fx = Math.floor(u * lenL), fy = Math.floor(v * o.wallH);
            if (fy < 3) return fy === 0 ? C.wood[1] : C.wood[3];
            if (fx < 2 || fx >= lenL - 2) return C.wood[2];
            // Quầy mở: trong tối ấm, kệ hũ trà, mép quầy gỗ.
            var open = fx > 8 && fx < lenL - 22;
            if (open && o.closed) {
                if ((fx + fy * 2) % 9 < 1) return C.wood[1];
                return (Math.floor(fy / 3) % 2) ? C.wood[2] : C.wood[3];
            }
            if (open) {
                if (fy >= o.wallH - 7) {
                    if (fy === o.wallH - 7) return C.wood[4];
                    return fy > o.wallH - 3 ? C.wood[1] : C.wood[3];
                }
                var shelfY = 8;
                if (fy === shelfY) return C.wood[2];
                if (fy === shelfY - 1 || fy === shelfY - 2) {
                    var jar = (fx + 1) % 5;
                    if (jar < 3) return jar === 0 ? C.plaster[3] : (fx % 10 < 5 ? C.teal[2] : C.red[3]);
                }
                return o.night && o.lit ? C.glow[0] : C.wood[0];
            }
            // Cửa sổ song tròn bên phải.
            if (fx >= lenL - 20 && fx < lenL - 6 && fy > 4 && fy < o.wallH - 5) {
                if ((fx + fy) % 3 === 0 || (fx - fy + 60) % 3 === 0) return C.wood[2];
                return o.night && o.lit ? C.glow[1] : C.paper[2];
            }
            return fy > o.wallH - 3 ? C.wood[2] : C.wood[3];
        }, function (u, v, x, y) {
            return sideWall(u, v, x, y, lenR, o.wallH, { window: true, round: true, lit: o.night && o.lit });
        });
        L.para(P(x0, yw, zt), [lenL, lenL / 2], [0, 2], function (u, v, x, y) {
            var c = L.get(x, y);
            return c ? darker(c) : 0;
        });
        pillar(L, x0 + 0.08, y1 - 0.1, zb, zt + 1, 0.16);
        pillar(L, x1 - 0.08, y1 - 0.1, zb, zt + 1, 0.16);
        if (o.night && o.lit) {
            var lamp = o.closed ? P(x1 + 0.2, (y0 + yw) / 2, zb + 8) : P((x0 + x1) / 2, y1 + 0.3, zb + 6);
            light(lamp[0], lamp[1], o.closed ? 18 : 34, o.closed ? 0.6 : 1);
        }
        // Rèm vải trước quầy.
        var cur = P(x0 + 0.55, yw + 0.02, zt - 1);
        if (!o.closed) L.para(cur, [16 * (x1 - x0 - 1.9), 8 * (x1 - x0 - 1.9)], [0, 5], function (u, v, x, y) {
            var seg = Math.floor(u * 5);
            if (v > 0.6 && (Math.floor(u * 5 * 16) % 16) < 2) return 0;
            return seg % 2 ? C.teal[1] : C.teal[2];
        });
        hipRoof(L, {
            x0: x0 - 0.6, y0: y0 - 0.55, x1: x1 + 0.6, y1: y1 + 0.4,
            ze: zt + 1, zr: zt + 1 + o.roofH, inset: 0.9, lift: 4, seed: 23, tone: 0
        });
        if (o.lanterns) {
            [0.2, 0.8].forEach(function (f) {
                var p = P(x0 + (x1 - x0) * f, y1 + 0.42, zt + 2);
                hangLantern(L, p[0], p[1], 3);
            });
        }
        // Giá treo biển (biển chỉ có sau khi quét sân).
        var sb = P((x0 + x1) / 2 - 0.85, y1 + 0.08, zt + 9);
        if (o.sign) {
            L.para(sb, [27.2, 13.6], [0, 9], function (u, v) {
                if (u < 0.05 || u > 0.95 || v < 0.12 || v > 0.86) return C.gold[2];
                return C.wood[1];
            });
        } else {
            L.set(Math.round(sb[0]) + 3, Math.round(sb[1]) + 1, C.ink);
            L.set(Math.round(sb[0]) + 24, Math.round(sb[1]) + 13, C.ink);
        }
    }

    function drawStudy(L, o) {
        var z = o.z, x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1;
        box(L, x0 - 0.12, y0 - 0.12, z, x1 + 0.12, y1 + 0.12, z + 2, C.stone[4], C.stone[3], C.stone[2]);
        var zb = z + 2, zt = zb + o.wallH;
        var lenL = (x1 - x0) * 16, lenR = (y1 - y0) * 16;
        box(L, x0, y0, zb, x1, y1, zt, null, function (u, v, x, y) {
            return sideWall(u, v, x, y, lenL, o.wallH, { window: true, lit: o.night && o.lit });
        }, function (u, v, x, y) {
            var fx = Math.floor(u * lenR), fy = Math.floor(v * o.wallH);
            // Mặt tiền: cửa song bên trái, cửa sổ tròn bên phải.
            if (fx >= 5 && fx < 15 && fy >= 4) {
                if (fx === 5 || fx === 14 || fy === 4) return C.wood[1];
                if (fy >= o.wallH - 6) return fy === o.wallH - 6 ? C.wood[3] : C.wood[2];
                if ((fx - 5) % 3 === 0 || (fy - 4) % 3 === 0) return C.wood[1];
                return o.night && o.lit ? C.glow[1] : C.paper[1];
            }
            return sideWall(fx >= 15 ? (u - 15 / lenR) / (1 - 15 / lenR) : u, v, x, y, fx >= 15 ? lenR - 15 : lenR, o.wallH,
                fx >= 15 ? { window: true, round: true, lit: o.night && o.lit, dim: true } : { dim: true });
        });
        hipRoof(L, {
            x0: x0 - 0.55, y0: y0 - 0.55, x1: x1 + 0.55, y1: y1 + 0.55,
            ze: zt, zr: zt + o.roofH, inset: 0.75, lift: 4, seed: 29, tone: -1
        });
        if (o.night && o.lit) {
            var win = P(x1 + 0.3, (y0 + y1) / 2 + 0.6, zb + 8);
            light(win[0], win[1], 24, 0.8);
        }
    }

    // Sơn môn (cổng tam quan một gian): hai cột đỏ, xà, biển, mái nhỏ. Đứng vắt ngang trục y.
    function drawGate(L, o) {
        var x = o.x, y0 = o.y0, y1 = o.y1, z = o.z;
        var zt = z + 30;
        [y0 + 0.2, y1 - 0.2].forEach(function (py) {
            box(L, x - 0.22, py - 0.22, z, x + 0.22, py + 0.22, z + 4, C.stone[4], C.stone[3], C.stone[2]);
            pillar(L, x, py, z + 4, zt + 4, 0.22);
        });
        // Xà dưới, biển, xà trên.
        box(L, x - 0.12, y0 - 0.15, zt - 6, x + 0.12, y1 + 0.15, zt - 3, C.red[2], C.red[2], function (u) {
            return (Math.floor(u * 64) % 6 === 0) ? C.gold[3] : C.red[3];
        });
        box(L, x - 0.06, y0 + 0.55, zt - 3, x + 0.06, y1 - 0.55, zt + 6, C.gold[2], C.gold[2], function (u, v) {
            if (u < 0.05 || u > 0.95 || v < 0.1 || v > 0.88) return C.gold[2];
            return C.ink;
        });
        box(L, x - 0.14, y0 - 0.3, zt + 6, x + 0.14, y1 + 0.3, zt + 9, C.red[2], C.red[2], function (u) {
            return (Math.floor(u * 64) % 5 === 0) ? C.gold[3] : C.teal[1];
        });
        hipRoof(L, {
            x0: x - 0.55, y0: y0 - 0.6, x1: x + 0.55, y1: y1 + 0.6,
            ze: zt + 9, zr: zt + 17, inset: 0.6, lift: 4, seed: 31
        });
    }

    // Bậc đá đi xuống theo hướng dir ('+y' hoặc '+x'), có lan can đá hai bên.
    function drawStairs(L, o) {
        var n = Math.max(2, Math.round((o.zTop - o.zBot) / 3));
        var dz = (o.zTop - o.zBot) / n;
        for (var i = 0; i < n; i++) {
            var zTop = o.zTop - dz * i;
            var a = i / n, b = (i + 1) / n;
            var shade = function (lit) {
                return function (u, v, x, y) {
                    if (o.fade && (zTop < o.fade) && dith(x, y) < (o.fade - zTop) / 30) return 0;
                    return v < 0.4 ? (lit ? C.stone[5] : C.stone[3]) : (lit ? C.stone[3] : C.stone[1]);
                };
            };
            var top = function (x, y) {
                if (o.fade && (zTop < o.fade) && dith(x, y) < (o.fade - zTop) / 30) return 0;
                return hash2(x, y, 111) < 0.08 ? C.stone[3] : C.stone[4];
            };
            if (o.dir === '+y') {
                var ya = o.y0 + (o.y1 - o.y0) * a, yb = o.y0 + (o.y1 - o.y0) * b;
                box(L, o.x0, ya, Math.max(o.zBot, zTop - dz - 30), o.x1, yb, zTop - dz, null, shade(true), shade(false));
                box(L, o.x0, ya, zTop - dz, o.x1, yb, zTop, top, shade(true), shade(false));
            } else {
                var xa = o.x0 + (o.x1 - o.x0) * a, xb = o.x0 + (o.x1 - o.x0) * b;
                box(L, xa, o.y0, Math.max(o.zBot, zTop - dz - 30), xb, o.y1, zTop - dz, null, shade(true), shade(false));
                box(L, xa, o.y0, zTop - dz, xb, o.y1, zTop, top, shade(true), shade(false));
            }
        }
        // Lan can đá.
        if (o.rail) {
            var rails = o.dir === '+y' ? [[o.x0 - 0.12, o.x0 + 0.04], [o.x1 - 0.04, o.x1 + 0.12]] : [[o.y0 - 0.12, o.y0 + 0.04], [o.y1 - 0.04, o.y1 + 0.12]];
            rails.forEach(function (r) {
                for (var i = 0; i < n; i++) {
                    var zz = o.zTop - dz * i + 4;
                    var a = i / n, b = (i + 1) / n;
                    if (o.dir === '+y') {
                        box(L, r[0], o.y0 + (o.y1 - o.y0) * a, zz - 6, r[1], o.y0 + (o.y1 - o.y0) * b, zz, C.stone[5], C.stone[4], C.stone[2]);
                    } else {
                        box(L, o.x0 + (o.x1 - o.x0) * a, r[0], zz - 6, o.x0 + (o.x1 - o.x0) * b, r[1], zz, C.stone[5], C.stone[4], C.stone[2]);
                    }
                }
            });
        }
    }

    // ---------- cây ----------
    var LIGHT = (function () {
        var v = [-0.55, -0.68, 0.48], m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / m, v[1] / m, v[2] / m];
    }());

    // Tán cây từ nhiều khối cầu: tô theo pháp tuyến, dither giữa các bậc, viền sẫm, rìa khối sẫm.
    function crown(L, blobs, pal, seed, outline) {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        blobs.forEach(function (b) {
            minX = Math.min(minX, b.x - b.rx);
            maxX = Math.max(maxX, b.x + b.rx);
            minY = Math.min(minY, b.y - b.ry);
            maxY = Math.max(maxY, b.y + b.ry);
        });
        var T = new Layer(minX - 2, minY - 2, maxX - minX + 5, maxY - minY + 5);
        var own = new Int16Array(T.w * T.h).fill(-1);
        for (var y = T.y; y < T.y + T.h; y++) {
            for (var x = T.x; x < T.x + T.w; x++) {
                var best = -1, bh = -1e9, bn = null;
                for (var k = 0; k < blobs.length; k++) {
                    var b = blobs[k];
                    var dx = (x + 0.5 - b.x) / b.rx, dy = (y + 0.5 - b.y) / b.ry;
                    var d2 = dx * dx + dy * dy;
                    if (d2 > 1) continue;
                    var hz = Math.sqrt(1 - d2) * b.rx + (b.z || 0);
                    if (hz > bh) {
                        bh = hz;
                        best = k;
                        bn = [dx, dy, Math.sqrt(1 - d2)];
                    }
                }
                if (best < 0) continue;
                own[(y - T.y) * T.w + (x - T.x)] = best;
                var sh = bn[0] * LIGHT[0] + bn[1] * LIGHT[1] + bn[2] * LIGHT[2];
                var t = 0.42 + sh * 0.5 + (hash2(x, y, seed) - 0.5) * 0.26 + (blobs[best].tone || 0);
                T.set(x, y, ramp(pal, clamp(t, 0.12, 1), x, y));
            }
        }
        // Rìa giữa hai khối: khối nằm dưới bị khối trên đè thì kẻ vệt sẫm.
        for (var j = 1; j < T.h; j++) {
            for (var i = 0; i < T.w; i++) {
                var me = own[j * T.w + i], up = own[(j - 1) * T.w + i];
                if (me >= 0 && up >= 0 && me !== up && (blobs[me].z || 0) < (blobs[up].z || 0) + 0.01 && blobs[me].y > blobs[up].y) {
                    T.px[j * T.w + i] = pal[1];
                }
            }
        }
        // Điểm sáng lá.
        var r = rng(seed);
        for (var s = 0; s < (T.w * T.h) / 40; s++) {
            var hx = T.x + Math.floor(r() * T.w), hy = T.y + Math.floor(r() * T.h);
            var cur = T.get(hx, hy);
            if (cur && cur === pal[pal.length - 2]) T.set(hx, hy, pal[pal.length - 1]);
        }
        if (outline !== false) T.outline(pal[0]);
        L.blit(T, 0, 0);
    }

    function trunk(L, bx, by, h, lean, w, pal) {
        pal = pal || C.trunk;
        for (var k = 0; k <= h; k++) {
            var t = k / h;
            var cx = Math.round(bx + lean * t * t);
            var y = by - k;
            var ww = k < 2 ? w + 2 : w;
            var x0 = cx - Math.floor(ww / 2);
            for (var i = 0; i < ww; i++) {
                L.set(x0 + i, y, i === 0 ? pal[3] : (i === ww - 1 ? pal[1] : pal[2]));
            }
        }
    }

    function drawBlobTree(L, bx, by, o) {
        var r = rng(o.seed);
        var R = o.r;
        var top = by - o.th;
        trunk(L, bx, by, o.th + 4, o.lean || 0, o.w || 3, C.trunk);
        // Cành.
        var cxT = bx + (o.lean || 0);
        L.line(cxT, top + 2, cxT - 5, top - 3, C.trunk[2]);
        L.line(cxT + 1, top + 1, cxT + 6, top - 4, C.trunk[1]);
        var blobs = [];
        var ccx = cxT, ccy = top - R * 0.45;
        blobs.push({ x: ccx, y: ccy, rx: R * 0.78, ry: R * 0.66, z: 0 });
        var n = o.n || 7;
        for (var k = 0; k < n; k++) {
            var ang = (k / n) * Math.PI * 2 + r() * 0.6;
            var d = R * (0.45 + r() * 0.35);
            var dy = Math.sin(ang) * d * 0.62;
            blobs.push({
                x: ccx + Math.cos(ang) * d * 1.05,
                y: ccy + dy,
                rx: R * (0.42 + r() * 0.22),
                ry: R * (0.36 + r() * 0.2),
                z: dy > 0 ? 3 : -2,
                tone: dy > 0 ? 0.04 : -0.05
            });
        }
        blobs.push({ x: ccx - R * 0.15, y: ccy - R * 0.45, rx: R * 0.5, ry: R * 0.4, z: 1, tone: 0.08 });
        crown(L, blobs, o.pal, o.seed + 1);
    }

    // Thông Hoàng Sơn: thân xoắn nghiêng, tán từng tầng dẹt.
    function drawPine(L, bx, by, o) {
        var r = rng(o.seed);
        var h = o.th;
        var lean = o.lean || 6;
        var pts = [];
        for (var k = 0; k <= h; k++) {
            var t = k / h;
            pts.push([bx + lean * Math.sin(t * 2.2) * (0.6 + t * 0.4), by - k]);
        }
        pts.forEach(function (p, k) {
            var w = k < 3 ? 4 : (k > h * 0.75 ? 2 : 3);
            var x0 = Math.round(p[0]) - Math.floor(w / 2);
            for (var i = 0; i < w; i++) L.set(x0 + i, Math.round(p[1]), i === 0 ? C.trunk[3] : (i === w - 1 ? C.trunk[0] : C.trunk[2]));
        });
        var pads = [];
        var tiers = o.tiers || 4;
        for (var i = 0; i < tiers; i++) {
            var t = 0.45 + (i / (tiers - 1)) * 0.55;
            var p = pts[Math.floor(t * h)];
            var side = i % 2 === 0 ? 1 : -1;
            var reach = (1 - t) * 10 + 7;
            var px = p[0] + side * reach * (0.5 + r() * 0.4);
            if (i > 0) L.line(p[0], p[1], px, p[1] + 1, C.trunk[1]);
            pads.push({ x: px, y: p[1] - 2, rx: 7 + (1 - t) * 8 + r() * 3, ry: 3 + r() * 1.5, z: i, tone: 0.05 });
            if (r() < 0.6) pads.push({ x: px + side * 6, y: p[1] + 1, rx: 5 + r() * 3, ry: 2.6, z: i - 0.5 });
        }
        var tp = pts[h];
        pads.push({ x: tp[0], y: tp[1] - 3, rx: 9, ry: 4, z: tiers + 1, tone: 0.1 });
        crown(L, pads, C.pine, o.seed + 3);
    }

    function drawBamboo(L, bx, by, o) {
        var r = rng(o.seed);
        var stalks = o.n || 7;
        for (var s = 0; s < stalks; s++) {
            var ox = bx + (s - stalks / 2) * 2.6 + r() * 2;
            var oy = by + Math.floor(r() * 4) - 2;
            var h = (o.h || 40) - Math.floor(r() * 12);
            var lean = (r() - 0.5) * 6;
            for (var k = 0; k < h; k++) {
                var x = Math.round(ox + lean * (k / h) * (k / h));
                var y = oy - k;
                var node = (k % 7) === 6;
                L.set(x, y, node ? C.bamboo[1] : C.bamboo[3]);
                L.set(x + 1, y, node ? C.bamboo[0] : C.bamboo[2]);
            }
            // Lá: các vệt chéo ngắn gần ngọn.
            for (var l = 0; l < 9; l++) {
                var kk = Math.floor(h * (0.45 + r() * 0.55));
                var lx = Math.round(ox + lean * (kk / h) * (kk / h));
                var ly = oy - kk;
                var dir = r() < 0.5 ? -1 : 1;
                var len = 3 + Math.floor(r() * 3);
                for (var q = 0; q < len; q++) {
                    L.set(lx + dir * (q + 1), ly + Math.floor(q / 2), q < 2 ? C.bamboo[3] : C.bamboo[2]);
                    L.set(lx + dir * (q + 1), ly + Math.floor(q / 2) + 1, C.bamboo[0]);
                }
            }
        }
    }

    function drawRock(L, bx, by, o) {
        var r = rng(o.seed);
        var blobs = [];
        var n = o.n || 3;
        for (var k = 0; k < n; k++) {
            blobs.push({ x: bx + (r() - 0.5) * o.w, y: by - o.h * 0.4 - r() * o.h * 0.3, rx: o.w * (0.35 + r() * 0.2), ry: o.h * (0.4 + r() * 0.2), z: k });
        }
        crown(L, blobs, C.rock.slice(0, 6), o.seed + 5);
        if (o.moss) {
            for (var m = 0; m < o.w * 2; m++) {
                var mx = Math.round(bx + (r() - 0.5) * o.w);
                for (var yy = Math.round(by - o.h * 1.2); yy < by; yy++) {
                    var c = L.get(mx, yy);
                    if (c && c !== C.rock[0]) {
                        L.set(mx, yy, C.grass[3]);
                        L.set(mx, yy + 1, C.grass[2]);
                        break;
                    }
                }
            }
        }
    }

    // Đá Thái Hồ: khối cao, có lỗ thủng.
    function drawTaihu(L, bx, by, o) {
        var r = rng(o.seed);
        var blobs = [];
        for (var k = 0; k < 5; k++) {
            blobs.push({ x: bx + (r() - 0.5) * 7, y: by - 4 - k * (o.h / 5), rx: 4 + r() * 3, ry: 4 + r() * 2.5, z: r() * 2 });
        }
        crown(L, blobs, [C.rock[1], C.rock[2], C.rock[3], C.rock[4], C.rock[5], C.stone[5]], o.seed + 7);
        [[0.35, -1], [0.62, 1], [0.8, -0.5]].forEach(function (hh) {
            var hx = Math.round(bx + hh[1] * 2), hy = Math.round(by - o.h * hh[0]);
            L.ellipse(hx, hy, 1.6, 1.2, function (x, y, nx, ny) {
                return L.get(x, y) ? (ny < 0 ? C.rock[0] : C.rock[1]) : 0;
            });
        });
    }

    // ---------- đồ vật ----------
    function drawStoneLantern(L, bx, by, o) {
        var s = C.stone;
        L.rect(bx - 3, by - 2, 7, 2, function (x, y, i) { return i < 3 ? s[4] : s[2]; });
        L.rect(bx - 1, by - 8, 3, 6, function (x, y, i) { return i === 0 ? s[4] : (i === 2 ? s[1] : s[3]); });
        L.rect(bx - 3, by - 9, 7, 1, s[3]);
        L.rect(bx - 2, by - 14, 5, 5, function (x, y, i, j) {
            if (i >= 1 && i <= 3 && j >= 1 && j <= 3) return o.lit ? (j === 1 ? C.glow[3] : C.glow[1]) : C.dark;
            return i < 2 ? s[4] : s[2];
        });
        L.rect(bx - 4, by - 16, 9, 2, function (x, y, i, j) {
            if (j === 0 && (i === 0 || i === 8)) return 0;
            return i < 4 ? s[5] : s[3];
        });
        L.rect(bx - 1, by - 18, 3, 2, function (x, y, i, j) { return j === 0 && i !== 1 ? 0 : (i < 2 ? s[4] : s[2]); });
        if (!o.lit) {
            L.set(bx - 3, by - 15, C.grass[3]);
            L.set(bx + 3, by - 16, C.grass[2]);
        } else {
            light(bx, by - 11, 22, 1);
        }
    }

    function drawBurner(L, bx, by) {
        var b = C.bronze;
        L.ellipse(bx, by - 1, 9, 4, function (x, y, nx, ny) { return ny < 0 ? C.stone[4] : C.stone[2]; });
        [[-5, 0], [5, 0], [0, 2]].forEach(function (l) {
            L.rect(bx + l[0] - 1, by - 4 + l[1], 2, 3, b[1]);
        });
        L.ellipse(bx, by - 8, 7, 5, function (x, y, nx, ny) {
            var sh = -nx * 0.6 - ny * 0.5 + (hash2(x, y, 121) - 0.5) * 0.3;
            return ramp(b, 0.45 + sh * 0.45, x, y);
        });
        L.ellipse(bx, by - 12, 6, 2, function (x, y, nx, ny) { return ny < 0.2 ? b[0] : b[3]; });
        L.ellipse(bx, by - 12, 4, 1.2, C.stone[3]);
        // Tai đỉnh.
        L.rect(bx - 6, by - 15, 1, 3, b[3]);
        L.rect(bx - 5, by - 16, 1, 1, b[3]);
        L.rect(bx + 5, by - 15, 1, 3, b[1]);
        L.rect(bx + 4, by - 16, 1, 1, b[1]);
        // Nén hương.
        L.rect(bx - 1, by - 17, 1, 5, C.red[2]);
        L.rect(bx + 1, by - 16, 1, 4, C.red[2]);
        L.set(bx - 1, by - 18, C.glow[1]);
        L.set(bx + 1, by - 17, C.glow[1]);
        light(bx, by - 17, 6, 0.5);
    }

    function drawTable(L, x, y, z, o) {
        box(L, x - 0.32, y - 0.32, z + 5, x + 0.32, y + 0.32, z + 7, C.wood[4], C.wood[3], C.wood[2]);
        [[-0.25, 0.25], [0.25, 0.25], [0.25, -0.25]].forEach(function (d) {
            box(L, x + d[0] - 0.04, y + d[1] - 0.04, z, x + d[0] + 0.04, y + d[1] + 0.04, z + 5, C.wood[2], C.wood[2], C.wood[1]);
        });
        if (o.set) {
            var p = P(x, y, z + 7);
            var px = Math.round(p[0]), py = Math.round(p[1]);
            // Ấm trà và hai chén.
            L.rect(px - 2, py - 4, 4, 3, function (xx, yy, i) { return i === 0 ? C.wood[4] : C.wood[2]; });
            L.set(px + 2, py - 3, C.wood[2]);
            L.set(px - 1, py - 5, C.wood[3]);
            L.set(px - 6, py - 1, C.paper[3]);
            L.set(px - 5, py - 1, C.paper[2]);
            L.set(px + 5, py + 1, C.paper[3]);
            L.set(px + 6, py + 1, C.paper[2]);
        }
        // Đôn ngồi.
        [[-0.75, 0.05], [0.05, 0.75]].forEach(function (d) {
            if (!o.set && d[0] < 0) return;
            var q = P(x + d[0], y + d[1], z);
            L.ellipse(q[0], q[1] - 4, 3.4, 1.8, C.wood[4]);
            L.rect(Math.round(q[0]) - 3, Math.round(q[1]) - 4, 7, 3, function (xx, yy, i) { return i < 3 ? C.wood[3] : C.wood[2]; });
            L.ellipse(q[0], q[1] - 5, 3.4, 1.6, C.wood[4]);
        });
    }

    // Dù đỏ che bàn trà.
    function drawParasol(L, x, y, z) {
        var base = P(x, y, z), top = P(x, y, z + 30);
        L.line(base[0], base[1], top[0], top[1], C.wood[2]);
        L.ellipse(top[0], top[1] + 2, 16, 7, function (xx, yy, nx, ny) {
            var a = Math.atan2(ny, nx);
            var seg = Math.floor((a + Math.PI) / (Math.PI / 6));
            if (ny > 0.55) return C.red[1];
            var t = 0.55 - ny * 0.35 - nx * 0.2;
            var c = seg % 2 ? C.red[3] : C.red[2];
            return t > 0.75 ? C.red[4] : c;
        });
        L.ellipse(top[0], top[1] + 1, 3, 1.5, C.red[4]);
        L.set(Math.round(top[0]), Math.round(top[1]) - 2, C.gold[3]);
        L.set(Math.round(top[0]), Math.round(top[1]) - 1, C.gold[2]);
    }

    // Cờ trà: cột gỗ, lá cờ vải dài (chữ 茶 đặt bằng DOM).
    function drawFlag(L, x, y, z) {
        var base = P(x, y, z), top = P(x, y, z + 40);
        L.line(base[0], base[1], top[0], top[1], C.wood[2]);
        L.line(base[0] + 1, base[1], top[0] + 1, top[1], C.wood[1]);
        L.line(top[0] - 4, top[1] + 1, top[0] + 1, top[1] + 1, C.wood[2]);
        L.rect(Math.round(top[0]) - 4, Math.round(top[1]) + 2, 6, 19, function (xx, yy, i, j) {
            if (j > 15 && (i === 1 || i === 4)) return 0;
            if (i === 0 || j === 0 || j === 15) return C.red[2];
            return i === 5 ? C.paper[1] : C.paper[2];
        });
    }

    // Cầu gỗ bắc ra giữa hồ (gãy giữa nhịp khi chưa sửa).
    function drawBridge(L, o) {
        var z = o.z;
        var n = Math.round((o.y1 - o.y0) / 0.2);
        for (var i = 0; i < n; i++) {
            var ya = o.y0 + i * 0.2, yb = ya + 0.18;
            if (o.broken && i >= o.gapA && i < o.gapB) continue;
            var sag = (o.broken && (i === o.gapA - 1 || i === o.gapB)) ? -1.5 : 0;
            box(L, o.x0, ya, z - 2 + sag, o.x1, yb, z + sag, C.wood[4], C.wood[3], C.wood[2]);
        }
        // Cọc và tay vịn.
        [o.x0 - 0.02, o.x1 + 0.02].forEach(function (px, side) {
            for (var y = o.y0; y <= o.y1 + 0.01; y += 0.8) {
                if (o.broken && side === 0 && y > o.y0 + o.gapA * 0.2 - 0.4 && y < o.y0 + o.gapB * 0.2 + 0.2) continue;
                box(L, px - 0.05, y - 0.05, z - 6, px + 0.05, y + 0.05, z + 7, C.wood[3], C.wood[2], C.wood[1]);
            }
            if (!(o.broken && side === 0)) {
                box(L, px - 0.04, o.y0, z + 6, px + 0.04, o.y1, z + 7, C.wood[4], C.wood[3], C.wood[2]);
            } else {
                box(L, px - 0.04, o.y0 + o.gapB * 0.2, z + 6, px + 0.04, o.y1, z + 7, C.wood[4], C.wood[3], C.wood[2]);
            }
        });
        if (o.broken) {
            // Tấm ván trôi trên mặt nước.
            var f = P(o.x0 - 0.6, o.y0 + o.gapA * 0.2 + 0.2, z - 6);
            L.rect(Math.round(f[0]), Math.round(f[1]), 7, 1, C.wood[3]);
            L.rect(Math.round(f[0]) + 1, Math.round(f[1]) + 1, 7, 1, C.wood[1]);
        }
    }

    // ---------- công trình vùng đất mới ----------
    // Tàng Kinh Các: lầu hai tầng mái chồng diêm trên mỏm đá; mặt tiền quay về +y.
    function drawLibrary(L, o) {
        var z = o.z, x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1;
        var lit = o.night && o.lit;
        var mid = (x0 + x1) / 2;
        box(L, x0 - 0.25, y0 - 0.25, z, x1 + 0.25, y1 + 0.2, z + 4, function (x, y) {
            return hash2(x, y, 131) < 0.08 ? C.stone[3] : C.stone[4];
        }, function (u, v) {
            return v < 0.3 ? C.stone[4] : C.stone[2];
        }, function (u, v) {
            return v < 0.3 ? C.stone[3] : C.stone[1];
        });
        box(L, mid - 0.45, y1 + 0.2, z, mid + 0.45, y1 + 0.5, z + 2, C.stone[4], C.stone[3], C.stone[2]);
        var zb = z + 4, zt = zb + o.h1;
        var lenL = (x1 - x0) * 16, lenR = (y1 - y0) * 16;
        // Tầng dưới: cửa bức bàn song giấy, nửa dưới ván đỏ.
        box(L, x0, y0, zb, x1, y1, zt, null, function (u, v, x, y) {
            var fx = Math.floor(u * lenL), fy = Math.floor(v * o.h1);
            if (fy < 3) return fy === 0 ? C.teal[0] : (((fx + fy * 3) % 6 === 0) ? C.gold[3] : C.teal[1]);
            var bx = fx % 16;
            if (bx < 2) return bx === 0 ? C.red[3] : C.red[2];
            if (fy >= o.h1 - 2) return C.wood[1];
            if (fy >= o.h1 - 6) return fy === o.h1 - 6 ? C.wood[4] : C.red[2];
            if (bx === 9) return C.wood[1];
            if ((fy - 3) % 3 === 0 || (bx - 2) % 3 === 0) return C.wood[2];
            return lit ? C.glow[2] : (fy < 6 ? C.paper[1] : C.paper[2]);
        }, function (u, v, x, y) {
            return sideWall(u, v, x, y, lenR, o.h1, { window: true, round: true, dim: true, lit: lit });
        });
        L.para(P(x0, y1, zt), [lenL, lenL / 2], [0, 2], function (u, v, x, y) {
            var c = L.get(x, y);
            return c ? darker(c) : 0;
        });
        // Mái dưới (diêm thứ nhất); tầng trên lùi vào, chân tường nằm trên dốc mái dưới.
        var e0 = { x0: x0 - 0.6, y0: y0 - 0.55, x1: x1 + 0.6, y1: y1 + 0.5 };
        var ze = zt + 1, zr = ze + 9;
        hipRoof(L, { x0: e0.x0, y0: e0.y0, x1: e0.x1, y1: e0.y1, ze: ze, zr: zr, inset: 0.9, lift: 4, seed: 41 });
        var ux0 = x0 + 0.5, uy0 = y0 + 0.4, ux1 = x1 - 0.5, uy1 = y1 - 0.45;
        var half = (e0.y1 - e0.y0) / 2;
        var ub = Math.round(ze + (zr - ze) * Math.min(1, (e0.y1 - uy1) / half)) - 1;
        var ut = ub + o.h2;
        var ulenL = (ux1 - ux0) * 16, ulenR = (uy1 - uy0) * 16;
        box(L, ux0, uy0, ub, ux1, uy1, ut, null, function (u, v, x, y) {
            var fx = Math.floor(u * ulenL), fy = Math.floor(v * o.h2);
            if (fy < 3) return fy === 0 ? C.teal[0] : (((fx + fy * 3) % 6 === 0) ? C.gold[3] : C.teal[1]);
            var bx = fx % 12;
            if (bx < 2) return bx === 0 ? C.red[3] : C.red[2];
            if (fy >= o.h2 - 2) return fy === o.h2 - 1 ? C.red[1] : C.red[2];
            if ((fy - 3) % 3 === 0 || bx === 7) return C.wood[2];
            return lit ? C.glow[2] : (fy < 5 ? C.paper[1] : C.paper[2]);
        }, function (u, v, x, y) {
            return sideWall(u, v, x, y, ulenR, o.h2, { dim: true });
        });
        // Biển 藏经阁 giữa tầng trên (chữ đặt bằng DOM).
        L.para(P(mid - 0.72, uy1 + 0.03, ut - 4), [23, 11.5], [0, 8], function (u, v) {
            if (u < 0.05 || u > 0.95 || v < 0.13 || v > 0.86) return C.gold[2];
            return C.ink;
        });
        hipRoof(L, {
            x0: ux0 - 0.55, y0: uy0 - 0.5, x1: ux1 + 0.55, y1: uy1 + 0.4,
            ze: ut + 1, zr: ut + 1 + o.roofH, inset: 0.78, lift: 6, seed: 43, pearl: !o.broken, broken: o.broken
        });
        if (o.lanterns) {
            [[e0.x0 + 0.3, e0.y1 - 0.02], [e0.x1 - 0.3, e0.y1 - 0.02]].forEach(function (q) {
                var p = P(q[0], q[1], ze + 4);
                hangLantern(L, p[0], p[1], 3);
            });
        }
        if (lit) {
            var door = P(mid, y1 + 0.3, zb + 6);
            light(door[0], door[1], 26, 0.8);
            var up = P(mid, uy1 + 0.2, ub + 5);
            light(up[0], up[1], 20, 0.6);
        }
    }

    // Thác nước: suối nhỏ trên mỏm đá chảy ra mép rồi đổ xuống hồ sen. Engine vẽ thêm vệt nước chảy.
    function fallGeom(o) {
        var w = o.x1 - o.x0;
        return { O: P(o.x0, o.yEdge, o.zTop), U: [16 * w, 8 * w], h: o.zTop - o.zBot, foot: P((o.x0 + o.x1) / 2, o.yEdge + 0.22, o.zBot) };
    }

    function drawFalls(L, o) {
        var x0 = o.x0, x1 = o.x1, ye = o.yEdge, zt = o.zTop;
        var g = fallGeom(o);
        // Bờ suối đá rồi lòng suối.
        L.poly([P(x0 - 0.14, o.yStart, zt), P(x1 + 0.14, o.yStart, zt), P(x1 + 0.14, ye, zt), P(x0 - 0.14, ye, zt)], function (x, y) {
            return hash2(x, y, 161) < 0.45 ? C.stone[2] : C.stone[3];
        });
        L.poly([P(x0, o.yStart + 0.12, zt), P(x1, o.yStart + 0.12, zt), P(x1, ye, zt), P(x0, ye, zt)], function (x, y) {
            var n = vnoise(x * 0.35, y * 0.7, 163);
            return n > 0.66 ? C.water[6] : (n > 0.42 ? C.water[5] : C.water[4]);
        });
        // Dải thác trên vách: sọc dọc sáng tối, mép tràn sáng.
        L.para(g.O, g.U, [0, g.h], function (u, v, x, y) {
            var col = Math.floor(u * g.U[0]);
            var fy = v * g.h;
            if (fy < 1.5) return C.water[6];
            if (col === 0 || col >= Math.floor(g.U[0]) - 1) return dith(x, y) < 0.5 ? C.water[3] : C.water[2];
            var n = vnoise(col * 0.8, fy * 0.07, 171);
            var t = 0.62 + (n - 0.5) * 0.7 + (hash2(col, Math.floor(fy / 3), 173) - 0.5) * 0.2;
            if (t > 0.86) return C.cloud[4];
            return ramp(C.water, clamp(t, 0.35, 1), x, y);
        });
        // Bọt trắng dưới chân thác.
        L.ellipse(g.foot[0], g.foot[1], g.U[0] * 0.75 + 3, 3, function (x, y, nx, ny) {
            var d = nx * nx + ny * ny;
            if (d > 0.6 && dith(x, y) < 0.55) return 0;
            return d < 0.3 ? C.cloud[4] : C.cloud[3];
        });
        // Mạch nước: tảng đá rêu ở đầu suối.
        var sp = P((x0 + x1) / 2, o.yStart, zt);
        drawRock(L, Math.round(sp[0]), Math.round(sp[1]) + 2, { w: 14, h: 6, seed: 167, n: 3, moss: true });
    }

    // Cầu treo: ván gỗ võng giữa nhịp, hai dây tay vịn buộc cọc ở hai đầu; chạy dọc trục x.
    function drawRopeBridge(L, o) {
        var span = o.x1 - o.x0;
        function zAt(t) {
            return o.z0 + (o.z1 - o.z0) * t - o.sag * Math.sin(Math.PI * t);
        }
        function post(x, y, z) {
            box(L, x - 0.06, y - 0.06, z - 2, x + 0.06, y + 0.06, z + 9, C.wood[3], C.wood[2], C.wood[1]);
            var p = P(x, y, z + 9);
            L.set(Math.round(p[0]), Math.round(p[1]) - 1, C.wood[4]);
        }
        function rope(y, back) {
            var prev = null;
            for (var i = 0; i <= 24; i++) {
                var t = i / 24;
                var p = P(o.x0 + span * t, y, zAt(t) + 8 + o.sag * 0.4 * Math.sin(Math.PI * t));
                if (prev) L.line(prev[0], prev[1], p[0], p[1], back ? C.dirt[1] : C.dirt[2]);
                if (i % 4 === 2) {
                    var q = P(o.x0 + span * t, y, zAt(t));
                    L.line(p[0], p[1] + 1, q[0], q[1] - 1, C.dirt[1]);
                }
                prev = p;
            }
        }
        post(o.x0, o.y0 - 0.06, o.z0);
        post(o.x1, o.y0 - 0.06, o.z1);
        rope(o.y0 - 0.06, true);
        var n = Math.round(span / 0.2);
        for (var i = 0; i < n; i++) {
            var ta = (i + 0.08) / n, tb = (i + 0.92) / n;
            var zz = zAt((ta + tb) / 2);
            box(L, o.x0 + span * ta, o.y0, zz - 1.5, o.x0 + span * tb, o.y1, zz, (i % 3 === 1) ? C.wood[3] : C.wood[4], C.wood[3], C.wood[1]);
        }
        post(o.x0, o.y1 + 0.06, o.z0);
        post(o.x1, o.y1 + 0.06, o.z1);
        rope(o.y1 + 0.06, false);
    }

    // Vọng Vân Đình: đình vuông bốn cột, ghế tựa ba phía, mái chóp có bầu hồ lô.
    function drawPavilion(L, o) {
        var cx = o.x, cy = o.y, z = o.z, s = o.s;
        var x0 = cx - s, y0 = cy - s, x1 = cx + s, y1 = cy + s;
        var lit = o.night && o.lit;
        box(L, x0 - 0.2, y0 - 0.2, z, x1 + 0.2, y1 + 0.2, z + 3, function (x, y) {
            return hash2(x, y, 141) < 0.1 ? C.stone[3] : C.stone[4];
        }, function (u, v) {
            return v < 0.34 ? C.stone[4] : C.stone[2];
        }, function (u, v) {
            return v < 0.34 ? C.stone[3] : C.stone[1];
        });
        var zb = z + 3, zt = zb + o.h;
        var w = 0.15;
        function bench(ax, ay, bx, by) {
            box(L, ax, ay, zb + 4, bx, by, zb + 6, C.red[3], C.red[2], C.red[1]);
        }
        function beam(ax, ay, bx, by) {
            box(L, ax, ay, zt - 3, bx, by, zt, C.red[2], function (u, v) {
                return v < 0.4 ? C.teal[2] : ((Math.floor(u * 40) % 5 === 0) ? C.gold[3] : C.teal[1]);
            }, C.teal[0]);
        }
        // Phía sau: cột sau, ghế, xà; rồi bàn đá giữa đình; cuối cùng cột trước.
        pillar(L, x0 + w, y0 + w, zb, zt, w);
        beam(x0, y0, x1, y0 + 0.12);
        beam(x0, y0, x0 + 0.12, y1);
        bench(x0 + 0.2, y0 + 0.08, x1 - 0.2, y0 + 0.22);
        bench(x0 + 0.08, y0 + 0.2, x0 + 0.22, y1 - 0.2);
        pillar(L, x1 - w, y0 + w, zb, zt, w);
        pillar(L, x0 + w, y1 - w, zb, zt, w);
        drawTable(L, cx, cy, zb, { set: true });
        bench(x1 - 0.22, y0 + 0.2, x1 - 0.08, y1 - 0.2);
        pillar(L, x1 - w, y1 - w, zb, zt, w);
        beam(x0, y1 - 0.12, x1, y1);
        beam(x1 - 0.12, y0, x1, y1);
        // Biển 望云亭 trên xà trước (chữ đặt bằng DOM).
        L.para(P(cx - 0.52, y1 + 0.02, zt - 1), [16.6, 8.3], [0, 7], function (u, v) {
            if (u < 0.06 || u > 0.94 || v < 0.15 || v > 0.84) return C.gold[2];
            return C.ink;
        });
        hipRoof(L, {
            x0: x0 - 0.38, y0: y0 - 0.38, x1: x1 + 0.38, y1: y1 + 0.38,
            ze: zt + 1, zr: zt + 1 + o.roofH, inset: 1, lift: 5, seed: 47, apex: true, broken: o.broken
        });
        if (o.lanterns) {
            var p = P(cx, y1 + 0.3, zt + 1);
            hangLantern(L, p[0], p[1], 2);
        }
        if (lit) {
            var c = P(cx, cy, zb + 8);
            light(c[0], c[1], 18, 0.5);
        }
    }

    // Chum sành (sx, sy: chân chum trên màn hình).
    function drawJar(L, sx, sy, r) {
        r = r || 4;
        L.ellipse(sx, sy - r, r, r + 0.5, function (x, y, nx, ny) {
            var t = 0.55 - nx * 0.35 - ny * 0.3 + (hash2(x, y, 191) - 0.5) * 0.1;
            return ramp(C.jar, clamp(t, 0.05, 0.98), x, y);
        });
        L.ellipse(sx, sy - 2 * r, r * 0.62, 1.2, C.jar[0]);
        L.set(Math.round(sx - r * 0.45), Math.round(sy - r * 1.35), C.jar[4]);
    }

    // Nhà bếp: tường vôi khung gỗ, mái tranh, ống khói đất; cửa mở thấy lửa bếp.
    function drawKitchen(L, o) {
        var z = o.z, x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1;
        var lit = o.night && o.lit;
        box(L, x0 - 0.1, y0 - 0.1, z, x1 + 0.1, y1 + 0.1, z + 2, C.stone[3], C.stone[3], C.stone[1]);
        var zb = z + 2, zt = zb + o.wallH;
        var lenL = (x1 - x0) * 16, lenR = (y1 - y0) * 16;
        var door0 = Math.round(lenL * 0.26), door1 = door0 + 11;
        var win0 = Math.round(lenL * 0.62), win1 = win0 + 10;
        box(L, x0, y0, zb, x1, y1, zt, null, function (u, v, x, y) {
            var fx = Math.floor(u * lenL), fy = Math.floor(v * o.wallH);
            if (fx < 2 || fx >= lenL - 2) return fx === 0 ? C.wood[3] : C.wood[2];
            if (fy === 0) return C.wood[1];
            if (fy === 1) return C.wood[3];
            if (fx >= door0 && fx < door1 && fy >= 3) {
                if (fx === door0 || fx === door1 - 1 || fy === 3) return C.wood[1];
                // Trong bếp tối, lò đất đỏ lửa sát đáy.
                if (fy >= o.wallH - 4 && fx > door0 + 2 && fx < door1 - 3) {
                    if (fy === o.wallH - 4) return C.dirt[1];
                    return ((fx + fy) & 1) ? C.glow[0] : C.lantern[3];
                }
                return lit ? C.wood[1] : C.dark;
            }
            if (fx >= win0 && fx < win1 && fy >= 4 && fy < 10) {
                if (fx === win0 || fx === win1 - 1 || fy === 4 || fy === 9) return C.wood[1];
                if ((fx - win0) % 2 === 0) return C.wood[2];
                return lit ? C.glow[1] : C.wood[0];
            }
            if (fy >= o.wallH - 2) return C.stone[1];
            return C.plaster[hash2(x, y, 151) < 0.07 ? 1 : (fy < 4 ? 1 : 2)];
        }, function (u, v, x, y) {
            var fx = Math.floor(u * lenR), fy = Math.floor(v * o.wallH);
            if (fx < 2 || fx >= lenR - 2) return fx >= lenR - 1 ? C.wood[1] : C.wood[2];
            if (fy === 0) return C.wood[1];
            if (fy >= o.wallH - 2) return C.stone[1];
            return C.plaster[hash2(x, y, 152) < 0.07 ? 0 : 1];
        });
        // Chuỗi ớt khô treo cạnh cửa.
        var ch = P(x0 + (door1 + 3) / 16, y1, zt - 2);
        for (var k = 0; k < 7; k++) L.set(Math.round(ch[0]) + (k & 1), Math.round(ch[1]) + k, k === 0 ? C.bamboo[2] : (k % 2 ? C.red[3] : C.red[4]));
        // Củi chất bên hông phải: đầu khúc củi tròn.
        box(L, x1 + 0.1, y0 + 0.25, zb - 2, x1 + 0.42, y1 - 0.25, zb + 7, function (x, y) {
            return hash2(x, y, 153) < 0.5 ? C.wood[3] : C.wood[2];
        }, function (u, v) {
            return v < 0.25 ? C.wood[3] : C.wood[2];
        }, function (u, v, x, y) {
            var q = (x + (Math.floor(y / 2) % 2) * 2) % 4;
            if ((y % 2) === 0 && q === 0) return C.wood[1];
            return q === 1 ? C.dirt[3] : C.wood[4];
        });
        var roof = { x0: x0 - 0.35, y0: y0 - 0.3, x1: x1 + 0.35, y1: y1 + 0.32, ze: zt, zr: zt + o.roofH, inset: 0.86, lift: 0, seed: 51, pal: C.straw, thatch: true };
        hipRoof(L, roof);
        // Ống khói đất ở góc sau bên phải, nhô lên khỏi nóc.
        var cx = x1 - 0.75, cy = y0 + 0.35, zr = roof.zr;
        box(L, cx - 0.16, cy - 0.16, zr - 5, cx + 0.16, cy + 0.16, zr + 6, C.dirt[3], C.dirt[2], C.dirt[1]);
        box(L, cx - 0.21, cy - 0.21, zr + 6, cx + 0.21, cy + 0.21, zr + 8, C.stone[3], C.stone[2], C.stone[1]);
        // Chum nước trước cửa.
        var j1 = P(x0 + 0.3, y1 + 0.42, zb - 2), j2 = P(x0 + 0.72, y1 + 0.5, zb - 2);
        drawJar(L, Math.round(j1[0]), Math.round(j1[1]), 4);
        drawJar(L, Math.round(j2[0]), Math.round(j2[1]), 3);
        if (lit) {
            var d = P(x0 + (door0 + 5) / 16, y1 + 0.3, zb + 4);
            light(d[0], d[1], 24, 0.9);
        }
    }

    // Giếng đá có giá gỗ và gàu (bx, by: chân giếng trên màn hình).
    function drawWell(L, bx, by) {
        var s = C.stone;
        L.ellipse(bx, by - 2, 7, 3.4, function (x, y, nx) { return nx < -0.3 ? s[3] : s[2]; });
        L.rect(bx - 7, by - 7, 15, 5, function (x, y, i, j) {
            if (j % 2 === 1 && ((i + (j >> 1)) % 4 === 0)) return s[1];
            return i < 4 ? s[4] : (i > 10 ? s[1] : s[3]);
        });
        L.ellipse(bx, by - 7, 7.5, 3.6, function (x, y, nx, ny) { return ny < 0 ? s[5] : s[4]; });
        L.ellipse(bx, by - 7, 5, 2.2, function (x, y, nx, ny) { return ny < -0.2 ? C.water[0] : C.water[1]; });
        L.set(bx + 1, by - 7, C.water[4]);
        // Giá gỗ và trục quay.
        [-6, 6].forEach(function (dx) {
            for (var k = 6; k < 22; k++) L.set(bx + dx, by - k, dx < 0 ? C.wood[3] : C.wood[1]);
        });
        L.rect(bx - 7, by - 22, 15, 2, function (x, y, i, j) { return j === 0 ? C.wood[4] : C.wood[2]; });
        L.rect(bx - 2, by - 20, 5, 2, C.wood[2]);
        for (var r = 0; r < 5; r++) L.set(bx, by - 18 + r, C.dirt[2]);
        L.rect(bx - 2, by - 13, 5, 3, function (x, y, i) { return i < 2 ? C.wood[4] : C.wood[2]; });
        L.rect(bx - 2, by - 13, 5, 1, C.bronze[2]);
    }

    // Luống rau: bắp cải, hành, củ cải, bí đỏ; rào tre thấp ở hai mép trước.
    function drawPlant(L, kind, px, py, r) {
        if (kind === 'cabbage') {
            L.ellipse(px, py - 2, 3.4, 2.4, function (x, y, nx, ny) {
                var t = 0.62 - ny * 0.3 - nx * 0.2 + (hash2(x, y, 181) - 0.5) * 0.2;
                return ramp(C.lotus, clamp(t, 0.05, 0.98), x, y);
            });
            L.set(px, py - 3, C.grass[5]);
            L.set(px - 1, py - 2, C.grass[4]);
        } else if (kind === 'onion') {
            for (var k = -1; k <= 1; k++) {
                var h = 5 + ((k + 1 + Math.floor(r() * 2)) % 2);
                for (var j = 0; j < h; j++) L.set(px + k * 2 + (j > 3 ? k : 0), py - j, j < 1 ? C.paper[3] : (j % 2 ? C.grass[3] : C.grass[4]));
            }
        } else if (kind === 'radish') {
            L.set(px, py - 1, C.paper[3]);
            L.set(px + 1, py - 1, C.paper[2]);
            [[-2, -3], [-1, -4], [1, -4], [2, -3], [0, -5]].forEach(function (d, i) {
                L.set(px + d[0], py + d[1], i % 2 ? C.grass[4] : C.grass[3]);
                L.set(px + d[0], py + d[1] + 1, C.grass[2]);
            });
        } else {
            L.ellipse(px + 3, py - 2, 3, 1.6, function (x, y, nx, ny) { return ny < 0 ? C.lotus[3] : C.lotus[2]; });
            L.ellipse(px, py - 2, 2.6, 2.1, function (x, y, nx, ny) {
                if (Math.abs(nx) < 0.18) return C.leaf[0];
                return ny < -0.2 && nx < 0 ? C.leaf[3] : C.leaf[2];
            });
            L.set(px, py - 5, C.bamboo[1]);
        }
    }

    function drawGarden(L, o) {
        var r = rng(o.seed || 61);
        var kinds = ['cabbage', 'onion', 'radish', 'cabbage', 'pumpkin', 'onion', 'radish', 'cabbage'];
        var row = 0;
        for (var gy = o.y0 + 0.25; gy < o.y1; gy += 0.5, row++) {
            for (var gx = o.x0 + 0.3; gx < o.x1 - 0.15; gx += 0.55) {
                if (r() < 0.1) continue;
                var p = P(gx + (r() - 0.5) * 0.06, gy, o.z);
                drawPlant(L, kinds[row % kinds.length], Math.round(p[0]), Math.round(p[1]), r);
            }
        }
        // Rào tre: cọc mỗi nửa ô, hai thanh ngang.
        function fence(ax, ay, bx, by) {
            var len = Math.hypot(bx - ax, by - ay), n = Math.round(len / 0.5);
            for (var i = 0; i <= n; i++) {
                var t = i / n, fx = ax + (bx - ax) * t, fy = ay + (by - ay) * t;
                box(L, fx - 0.04, fy - 0.04, o.z, fx + 0.04, fy + 0.04, o.z + 8, C.bamboo[3], C.bamboo[3], C.bamboo[1]);
            }
            [3, 6].forEach(function (h) {
                var a = P(ax, ay, o.z + h), b = P(bx, by, o.z + h);
                L.line(a[0], a[1], b[0], b[1], C.bamboo[2]);
                L.line(a[0], a[1] + 1, b[0], b[1] + 1, C.bamboo[0]);
            });
        }
        fence(o.x0 + 0.1, o.y1 - 0.08, o.x1 - 0.08, o.y1 - 0.08);
        fence(o.x1 - 0.08, o.y0 + 0.1, o.x1 - 0.08, o.y1 - 0.08);
    }

    // Bia đá trên lưng rùa đá (quy phu bi) trước Tàng Kinh Các; bx, by là chân bia trên màn hình.
    function drawStele(L, bx, by) {
        L.ellipse(bx, by - 3, 9, 4, function (x, y, nx, ny) {
            var t = 0.6 - ny * 0.35 - nx * 0.25 + (hash2(x, y, 201) - 0.5) * 0.15;
            if ((x + y) % 5 === 0 && ny < 0.3) t -= 0.22;
            return ramp(C.stone, clamp(t, 0.05, 0.98), x, y);
        });
        L.ellipse(bx - 10, by - 2, 2.6, 2, function (x, y, nx, ny) { return ny < 0 ? C.stone[4] : C.stone[2]; });
        L.set(bx - 11, by - 3, C.ink);
        L.rect(bx - 4, by - 25, 9, 20, function (x, y, i, j) {
            if (j < 2 && (i < 2 || i > 6)) return 0;
            if (j === 2 && (i === 0 || i === 8)) return 0;
            if (i === 0 || (j < 3 && i < 3)) return C.rock[5];
            if (i === 8) return C.rock[1];
            if (i >= 2 && i <= 6 && j >= 6 && j <= 17 && j % 3 === 0 && i !== 4) return C.rock[1];
            return i < 4 ? C.rock[4] : C.rock[3];
        });
        L.rect(bx - 5, by - 6, 11, 2, function (x, y, i) { return i < 4 ? C.stone[4] : C.stone[2]; });
    }

    // Hai nong tre phơi ớt và đậu trên giá thấp; bx, by là tâm giá trên màn hình.
    function drawTrays(L, bx, by) {
        [[-7, -2, C.red], [7, 2, C.gold]].forEach(function (t) {
            var cx = bx + t[0], cy = by + t[1];
            for (var k = 0; k < 5; k++) {
                L.set(cx - 5, cy - k, C.wood[2]);
                L.set(cx + 5, cy - k, C.wood[1]);
                L.set(cx, cy - k + 1, C.wood[2]);
            }
            L.ellipse(cx, cy - 6, 7.5, 3.6, function (x, y, nx, ny) {
                var d = nx * nx + ny * ny;
                if (d > 0.7) return ny < 0 ? C.straw[5] : C.straw[2];
                if (hash2(x, y, 211) < 0.55) return t[2][hash2(x, y, 212) < 0.5 ? 3 : 4];
                return C.straw[4];
            });
        });
    }

    // Cây hồng: tán xanh vàng, quả cam lấm tấm.
    function drawPersimmon(L, bx, by, o) {
        var T = new Layer(bx - 40, by - 70, 80, 76);
        drawBlobTree(T, bx, by, { th: o.th, r: o.r, seed: o.seed, pal: C.persim });
        var r = rng(o.seed + 9);
        for (var k = 0, tries = 0; k < 15 && tries < 400; tries++) {
            var fx = bx - o.r + Math.floor(r() * o.r * 2), fy = Math.round(by - o.th - o.r * 1.1) + Math.floor(r() * o.r * 1.2);
            if (!T.get(fx, fy) || !T.get(fx + 1, fy + 1) || T.get(fx, fy) === C.persim[0]) continue;
            T.set(fx, fy, C.maple[5]);
            T.set(fx + 1, fy, C.maple[4]);
            T.set(fx, fy + 1, C.maple[4]);
            T.set(fx + 1, fy + 1, C.maple[3]);
            k++;
        }
        L.blit(T, 0, 0);
    }

    // ---------- vật theo lưu niệm khách đêm (đợt C) ----------
    // bx, by là chân vật trên màn hình (giữa đáy), như drawWell. Vật nhỏ, không viền mực như các đồ vật khác: sáng
    // bên trái, tối bên phải.

    // Miếu Thổ Địa nhỏ bên Hồ sen (lưu niệm của Vương Lục Lang), rộng 13, cao 15: bệ đá, thân đá trổ khám đỏ có
    // bài vị vàng, mái ngói cong vểnh hai đầu, chỏm vàng; lư nhỏ trên bệ cắm một nén hương (đầu hương sáng cả
    // đêm), chén trà trắng đặt trên bệ.
    function drawShrine(L, bx, by) {
        var s = C.stone;
        L.rect(bx - 6, by - 2, 13, 3, function (x, y, i, j) {
            if (j === 0) return i < 7 ? s[5] : s[4];
            return i < 4 ? s[4] : (i > 9 ? s[1] : s[3]);
        });
        L.rect(bx - 5, by - 9, 11, 7, function (x, y, i, j) {
            if (i >= 3 && i <= 8 && j >= 1) {
                if (j === 1) return C.red[0];
                if ((i === 5 || i === 6) && j >= 2 && j <= 5) return j === 2 ? C.gold[4] : (i === 6 ? C.gold[2] : C.gold[3]);
                return (i === 8 || j === 6) ? C.red[1] : C.red[2];
            }
            if (j === 0) return i < 5 ? s[5] : s[4];
            return i < 3 ? s[4] : (i > 8 ? s[1] : s[3]);
        });
        // Mái ngói: nóc thẳng, hai đầu đao vểnh lên, mép mái sẫm.
        var roof = ['r...........r', 'rr.KKKKKKK.rr', '.rKkkkkkkkkr.', '..RRRRRRRRR..'];
        var rc = { r: C.roof[5], K: C.roof[4], k: C.roof[3], R: C.roof[1] };
        for (var j = 0; j < roof.length; j++) {
            for (var i = 0; i < roof[j].length; i++) {
                var ch = roof[j][i];
                if (ch !== '.') L.set(bx - 6 + i, by - 13 + j, i > 7 && ch === 'k' ? C.roof[2] : rc[ch]);
            }
        }
        L.set(bx, by - 14, C.gold[3]);
        // Lư nhỏ và nén hương trước vách trái, khói mảnh; chén trà bên phải.
        L.rect(bx - 5, by - 3, 3, 1, function (x, y, i) { return i < 2 ? C.bronze[3] : C.bronze[1]; });
        L.rect(bx - 4, by - 7, 1, 4, C.red[3]);
        L.set(bx - 4, by - 8, C.glow[1]);
        L.set(bx - 5, by - 10, C.paper[1]);
        L.set(bx - 4, by - 12, C.paper[0]);
        L.rect(bx + 3, by - 4, 3, 2, function (x, y, i, j) { return j === 0 ? C.paper[3] : (i === 2 ? C.paper[1] : C.paper[2]); });
        L.set(bx + 4, by - 4, C.straw[4]);
        light(bx - 4, by - 8, 6, 0.4);
    }

    // Lá bùa giấy vàng dán trên cột cổng Sơn môn (lưu niệm của Họa Bì), rộng 4, cao 9: mép phải tối, nét bút son
    // chạy dọc, dấu son ở đầu, góc dưới hơi vểnh. Giấy dùng màu đèn (C.glow) nên ban đêm lá bùa vẫn sáng mờ, như
    // lúc bùa linh nghiệm trong truyện; nét son tối đi theo đêm.
    function drawTalisman(L, bx, by) {
        var rows = ['yyyY', 'yRRY', 'yyrY', 'yrrY', 'yyrY', 'yryY', 'yyrY', 'yrrY', 'yyY.'];
        var pc = { y: C.glow[2], Y: C.glow[1], r: C.red[3], R: C.red[2] };
        for (var j = 0; j < rows.length; j++) {
            for (var i = 0; i < 4; i++) {
                var ch = rows[j][i];
                if (ch !== '.') L.set(bx - 2 + i, by - 8 + j, pc[ch]);
            }
        }
        L.set(bx + 1, by, C.gold[2]);
    }

    // Khóm mẫu đơn trắng góc Vườn rau (lưu niệm của Hương Ngọc), rộng 12, cao 10: tán lá xanh; o.bloom: ba bông
    // trắng nhuỵ vàng, không thì nụ khép xanh trắng.
    function drawPeony(L, bx, by, o) {
        o = o || {};
        crown(L, [
            { x: bx, y: by - 3.8, rx: 5, ry: 3.2, z: 0 },
            { x: bx - 2.8, y: by - 5.2, rx: 2.8, ry: 2.4, z: 1, tone: 0.05 },
            { x: bx + 2.6, y: by - 4.8, rx: 2.8, ry: 2.4, z: 1 },
            { x: bx + 0.2, y: by - 6.4, rx: 2.8, ry: 2.2, z: 2, tone: 0.08 }
        ], C.lotus, 421);
        L.set(bx, by, C.trunk[2]);
        L.set(bx - 1, by, C.trunk[1]);
        var spots = o.bloom ? [[-3, -7], [2, -8], [4, -5]] : [[-3, -7], [1, -9], [4, -6], [-1, -6]];
        spots.forEach(function (p) {
            var x = bx + p[0], y = by + p[1];
            if (o.bloom) {
                L.rect(x - 1, y - 1, 3, 3, function (xx, yy, i, j) {
                    if (i === 1 && j === 1) return C.gold[3];
                    if ((i === 0 || i === 2) && (j === 0 || j === 2)) return j === 2 ? C.paper[1] : 0;
                    return i === 2 || j === 2 ? C.paper[2] : C.paper[3];
                });
                L.set(x - 2, y, C.paper[2]);
                L.set(x + 2, y, C.paper[1]);
                L.set(x, y - 2, C.paper[3]);
            } else {
                L.set(x, y, C.paper[2]);
                L.set(x, y - 1, C.paper[3]);
                L.set(x + 1, y, C.lotus[1]);
            }
        });
    }

    // Cây trà hoa đỏ (Giáng Tuyết) góc Vườn rau, rộng 12, cao 14: gốc ngắn, tán lá sẫm bóng, năm bông đỏ nhuỵ vàng.
    function drawCamellia(L, bx, by) {
        trunk(L, bx, by, 3, 0, 2, C.trunk);
        crown(L, [
            { x: bx, y: by - 6.8, rx: 4.8, ry: 3.8, z: 0 },
            { x: bx - 2.4, y: by - 9, rx: 2.8, ry: 2.8, z: 1, tone: 0.06 },
            { x: bx + 2.2, y: by - 8.6, rx: 2.8, ry: 2.8, z: 1 },
            { x: bx, y: by - 10.8, rx: 2.6, ry: 2.2, z: 2, tone: 0.1 }
        ], C.pine, 431);
        [[-3, -9], [2, -11], [3, -7], [-2, -6], [0, -9]].forEach(function (p, k) {
            var x = bx + p[0], y = by + p[1];
            L.set(x, y - 1, C.red[4]);
            L.set(x - 1, y, C.red[3]);
            L.set(x + 1, y, C.red[2]);
            L.set(x, y + 1, C.red[1]);
            L.set(x, y, k % 2 ? C.gold[3] : C.gold[4]);
        });
    }

    // Câu đối đỏ dán cột (lưu niệm của Liên Tỏa): một dải giấy đỏ đứng 3 px × o.h (mặc định 12), viền sẫm, chữ là nét
    // mực đen xen vài chấm nhũ vàng; (x, y) là điểm giữa mép trên. o.seed đổi nét chữ để hai vế không giống nhau;
    // o.slant = 1 hạ cột phải (dán trên mặt cột hướng +y), −1 hạ cột trái (mặt hướng +x), 0 thẳng đứng.
    var COUPLET = { paper: u32('#c81f2b'), lit: u32('#e0393b'), edge: u32('#6c1119'), rim: u32('#4a0b10') };
    function drawCouplet(L, x, y, o) {
        o = o || {};
        var h = Math.max(6, o.h || 12), seed = o.seed || 0, slant = o.slant || 0;
        x = Math.round(x);
        y = Math.round(y);
        // Mỗi chữ chiếm hai hàng; nét chữ chọn theo seed: chấm, gạch dọc hai pixel, hoặc nét lệch sang cột sáng.
        var marks = {};
        for (var j = 2; j < h - 2; j += 2) {
            var r = hash2(j, seed, 241), g = hash2(j, seed, 242);
            marks[j] = C.ink;
            if (r < 0.45) marks[j + 1] = C.ink;
            else if (r < 0.7) marks[(j + 1) + ':0'] = C.ink;
            if (g < 0.3) marks[j + ':0'] = C.gold[3];
            else if (g > 0.85) marks[(j + 1) + ':2'] = C.gold[2];
        }
        for (var i = 0; i < 3; i++) {
            var dy = (slant > 0 && i === 2) || (slant < 0 && i === 0) ? 1 : 0;
            for (var k = 0; k < h; k++) {
                var c;
                if (k === 0 || k === h - 1) c = COUPLET.rim;
                else if (i === 2) c = marks[k + ':2'] || COUPLET.edge;
                else if (i === 0) c = marks[k + ':0'] || COUPLET.lit;
                else c = marks[k] || COUPLET.paper;
                L.set(x - 1 + i, y + k + dy, c);
            }
        }
    }

    // ---------- vật theo lưu niệm khách đêm và món tô điểm (đợt D) ----------
    // Như đợt C: vật nhỏ, không viền mực, sáng bên trái, tối bên phải; hàng chữ đặt bằng stampRows.
    function stampRows(L, rows, x, y, pc) {
        for (var j = 0; j < rows.length; j++) {
            for (var i = 0; i < rows[j].length; i++) {
                var ch = rows[j][i];
                if (ch !== '.' && pc[ch]) L.set(x + i, y + j, pc[ch]);
            }
        }
    }

    // Trăng giấy của đạo sĩ Lao Sơn (lưu niệm `trang`), dán trên mặt +x cột bắc cổng Sơn môn: đĩa tròn 5×5 cắt từ giấy,
    // (x, y) là tâm đĩa trên màn hình. Giấy dùng màu đèn (C.glow) nên ban đêm vẫn sáng như trăng rằm (chi tiết 剪纸为月);
    // nửa phải và một vệt mờ như bóng cây quế tối một bậc; quầng sáng lạnh (tint 'moon').
    function drawMoonPaper(L, x, y) {
        stampRows(L, ['.aab.', 'aaAab', 'aAAab', 'aaabb', '.bbb.'], x - 2, y - 2, { a: C.glow[3], A: C.glow[2], b: C.glow[2] });
        // Mép giấy dán: một chấm hồ trên đỉnh đĩa.
        L.set(x, y - 3, C.paper[1]);
        light(x, y, 12, 0.8, 'moon');
    }

    // Bó thảo dược Hoa Cô Tử để lại (lưu niệm `thuoc`), treo trên tường bên trái cửa Nhà bếp, rộng 6, cao 11; (x, y) là
    // móc treo. Dây gai, nút buộc đỏ, chùm lá khô xanh xám xen lá ngả vàng và hai bông cúc trắng, cuống rơm chĩa xuống.
    function drawHerbs(L, x, y) {
        stampRows(L, [
            '..c...',
            '..c...',
            '.rRr..',
            '.gGlg.',
            'glGgGg',
            'GgyGlG',
            '.wGgGg',
            'gGgwgG',
            '.gGyG.',
            '..ssS.',
            '.s..S.'
        ], x - 2, y, {
            c: C.straw[2], r: C.red[3], R: C.red[2], g: C.persim[3], G: C.persim[1], l: C.persim[5], y: C.straw[5],
            w: C.paper[3], s: C.straw[4], S: C.straw[3]
        });
    }

    // Đèn lồng giấy trắng của Thư trai (lưu niệm `dang`, ngọn đèn Nhiếp Tiểu Thiến ở lại giữ), treo dưới mái trước song
    // cửa, rộng 5, cao 10; (x, y) là móc treo. Ngày: thân giấy trắng ngà, nắp và đáy gỗ, tua đỏ. Đêm: thân giấy đổi sang
    // màu đèn (C.glow, không bị nhuộm trăng), nan tre in bóng, quầng ấm lớn hơn cửa sổ.
    function drawPaperLamp(L, x, y, night) {
        var pc = night ? { w: C.glow[3], W: C.glow[2], v: C.glow[1], n: C.glow[0] } : { w: C.paper[3], W: C.paper[2], v: C.paper[1], n: C.paper[0] };
        pc.k = C.ink;
        pc.d = C.wood[2];
        pc.D = C.wood[1];
        pc.r = C.red[3];
        stampRows(L, [
            '..k..',
            '..k..',
            '.dDD.',
            'wwWWv',
            'wnWnv',
            'wwWWv',
            'wnWnv',
            '.wWv.',
            '.dDD.',
            '..r..',
            '..r..'
        ], x - 2, y, pc);
        if (night) light(x, y + 5, 18, 1);
    }

    // Chuông gió dưới góc mái Chính điện (món tô điểm `chuong`), cao 16; dây treo từ (x, y − 3), sát mép đầu đao. Dây,
    // chuông đồng xanh miệng loe, lưỡi chuông, dải giấy đỏ đón gió có chấm vàng. sway ∈ {−1, 0, 1}: lưỡi chuông lệch nửa
    // nhịp, dải giấy lệch một pixel; engine luân phiên các khung (o.anim) nên chuông đung đưa.
    function drawChime(L, x, y, sway) {
        var b = C.bronze;
        for (var k = -3; k < 2; k++) L.set(x, y + k, C.ink);
        stampRows(L, ['.aAb.', 'aAbbB', 'ABBBB'], x - 2, y + 2, { a: b[5], A: b[4], b: b[3], B: b[2] });
        L.set(x + (sway > 0 ? 1 : 0), y + 5, b[1]);
        L.set(x + sway, y + 6, C.ink);
        var s = x + sway;
        L.rect(s, y + 7, 2, 5, function (xx, yy, i, j) {
            if (j === 2 && i === 0) return C.gold[3];
            return i === 0 ? C.red[4] : C.red[2];
        });
        L.set(s + (sway < 0 ? 0 : 1), y + 12, C.red[3]);
    }

    // Cây đào (món tô điểm `dao`) cạnh Sơn môn: cây tán như phong/bạch quả nhưng bảng màu hoa đào, thêm cành sẫm thò
    // qua tán, chùm hoa trắng hồng lấm tấm và cánh hoa rụng quanh gốc.
    function drawPeach(L, bx, by, o) {
        var T = new Layer(bx - 40, by - 70, 80, 76);
        drawBlobTree(T, bx, by, { th: o.th, r: o.r, seed: o.seed, pal: C.peach, n: 8 });
        var r = rng(o.seed + 7);
        var top = by - o.th;
        // Đầu cành sẫm thò ra ngoài mép tán (pixel viền có ô trống phía ngoài), ngọn cành có một nụ hồng.
        for (var b = 0, bt = 0; b < 6 && bt < 600; bt++) {
            var ex = T.x + Math.floor(r() * T.w), ey = T.y + Math.floor(r() * (T.h * 0.6));
            var dx = ex < bx ? -1 : 1;
            if (T.get(ex, ey) !== C.peach[0] || T.get(ex + dx, ey) || T.get(ex + dx * 2, ey - 1)) continue;
            T.set(ex + dx, ey, C.trunk[1]);
            T.set(ex + dx * 2, ey - 1, C.trunk[2]);
            T.set(ex + dx * 2, ey - 2, C.peach[4]);
            b++;
        }
        for (var k = 0, tries = 0; k < 22 && tries < 500; tries++) {
            var fx = bx - o.r + Math.floor(r() * o.r * 2), fy = Math.round(top - o.r * 1.15) + Math.floor(r() * o.r * 1.3);
            var c = T.get(fx, fy);
            if (!c || c === C.peach[0] || !T.get(fx + 1, fy) || !T.get(fx, fy + 1)) continue;
            T.set(fx, fy, C.peach[5]);
            T.set(fx + 1, fy, k % 3 ? C.peach[4] : C.peach[5]);
            T.set(fx, fy + 1, C.peach[3]);
            k++;
        }
        L.blit(T, 0, 0);
        // Cánh hoa rụng trên đất quanh gốc.
        for (var p = 0; p < 9; p++) {
            var px = bx - 9 + Math.floor(r() * 19), py = by - 2 + Math.floor(r() * 5);
            if (Math.abs(px - bx) < 2 && py < by + 1) continue;
            L.set(px, py, p % 2 ? C.peach[4] : C.peach[3]);
        }
    }

    // ---------- nhân vật (pixel vẽ tay) ----------
    var SPRITES = {
        keeper: {
            pal: { k: '#2a2430', K: '#4a4258', o: '#a87a4a', s: '#f3d2b0', S: '#d9a983', e: '#2a2430', p: '#ef9f8c',
                w: '#f4f1e8', r: '#6f88a8', R: '#4f6688', l: '#8ea5c2', d: '#3a3550', u: '#e8e4dc', b: '#2b2a35' },
            frames: [[
                '.....kk.....',
                '....okko....',
                '....kkkk....',
                '...kkkkkk...',
                '..kkKKkkkk..',
                '..kkkkkkkk..',
                '..kssssssk..',
                '..ksessesk..',
                '..kpsssspk..',
                '...ssssss...',
                '....SSSS....',
                '...lwrrwR...',
                '..llrwwrRR..',
                '.lllrrrrRRR.',
                '.llddddddRR.',
                '.slrrrrrrRs.',
                '..lrrrrrRR..',
                '..lrrrrrRR..',
                '...uu..uu...',
                '...bb..bb...'
            ]],
            blink: [7, '..ksSssSsk..']
        },
        fox: {
            pal: { d: '#a4501e', f: '#e07a30', F: '#f4a85c', p: '#f2b49a', w: '#fbf3e6', e: '#2a2430', n: '#3a2a2a',
                b: '#a9c6e2', B: '#7d9dc6', L: '#d4e4f2', t: '#3f5f8f', c: '#cfe6d8', y: '#f3e3a0' },
            frames: [[
                '...d......d...',
                '..dfd....dfd..',
                '..fpf....fpf..',
                '..fpffffffpf..',
                '..ffffffffffy.',
                '..fFFFFFFFFf..',
                '..fFeFFFFeFf..',
                '..ffwwwwwwff..',
                '...fwwnnwwf...',
                '....fwwwwf..w.',
                '....LbwwbB.wwf',
                '...bbLbbbBBwff',
                '..bbbbbbbbBBff',
                '..bbfccfbbBffF',
                '..bbtttttbBfFf',
                '..bbbbbbbbBfFf',
                '..bbbbbbbbBBff',
                '..bbbbbbbbBBf.',
                '...bbbbbbBB...',
                '....dd..dd....'
            ], [
                '...d......d...',
                '..dfd....dfd..',
                '..fpf....fpf..',
                '..fpffffffpf..',
                '..ffffffffffy.',
                '..fFFFFFFFFf..',
                '..fFeFFFFeFf..',
                '..ffwwwwwwff..',
                '...fwwnnwwf...',
                '....fwwwwf.w..',
                '....LbwwbBwwf.',
                '...bbLbbbBBwff',
                '..bbbbbbbbBBff',
                '..bbfccfbbBffF',
                '..bbtttttbBfFf',
                '..bbbbbbbbBfFf',
                '..bbbbbbbbBBff',
                '..bbbbbbbbBBf.',
                '...bbbbbbBB...',
                '....dd..dd....'
            ]],
            blink: [6, '..fFdFFFFdFf..']
        },
        cat: {
            pal: { k: '#2b2632', K: '#433d50', h: '#625c78', y: '#f3c94a', e: '#15111a', p: '#e88aa0', r: '#d8432f', R: '#9c2c22', w: '#e8e4ec' },
            frames: [[
                '.k.....k....',
                '.kk...kk....',
                '.kKkkkKk....',
                '.kyekyekk...',
                '.kkkpkkkk...',
                '..rRrrRr....',
                '.kkkkkkkk.k.',
                '.kKkkkkKk.k.',
                '.kKkkkkKkkk.',
                '..kk..kk....'
            ], [
                '.k.....k....',
                '.kk...kk....',
                '.kKkkkKk....',
                '.kyekyekk...',
                '.kkkpkkkk...',
                '..rRrrRr....',
                '.kkkkkkkk..k',
                '.kKkkkkKk.k.',
                '.kKkkkkKkkk.',
                '..kk..kk....'
            ]],
            blink: [3, '.kkkkkkkk...']
        },
        // Tiểu Ly: lửng con ngồi, mặt nạ sẫm quanh mắt, lá xanh trên đầu, đuôi khoang.
        tanuki: {
            pal: { b: '#8a6446', B: '#ad845a', m: '#3b2c25', w: '#efe2c4', e: '#15111a', n: '#2a2026',
                l: '#7cad52', L: '#3f6a2c', t: '#4e382a' },
            frames: [[
                '..lL.........',
                '.mLlm........',
                'mbBBbm.......',
                'bmmBmmb......',
                'bmewemb......',
                '.wwnwwbbb....',
                '..wwwbbbbb.t.',
                '..bwwwwbbbbtt',
                '.bbwwwwwbbbBt',
                '.bbwwwwwbbbtt',
                '.bbbwwwbbbbt.',
                '..mm...mm....'
            ], [
                '..lL.........',
                '.mLlm........',
                'mbBBbm.......',
                'bmmBmmb......',
                'bmewemb......',
                '.wwnwwbbb..t.',
                '..wwwbbbbbttt',
                '..bwwwwbbbbBt',
                '.bbwwwwwbbbtt',
                '.bbwwwwwbbbt.',
                '.bbbwwwbbbb..',
                '..mm...mm....'
            ]],
            blink: [4, 'bmmmmmb......']
        },
        turtle: {
            pal: { H: '#3f5a2a', G: '#6f8f4a', g: '#94b366', y: '#c8b47a', s: '#9fb07f', S: '#7d8c5e', W: '#f6f3ea', w: '#f3efe4',
                v: '#d3ccbd', o: '#2a2430', l: '#d4ecf2', b: '#4f70a3', B: '#37527e' },
            frames: [[
                '..........HHHHH.....',
                '........HHgGgGgHH...',
                '.......HgGgHHHgGgH..',
                '......HgGHgggGHGGgH.',
                '..ss..HGHgggggHGHGH.',
                '.sWWs.HGGHgggHGGGGH.',
                'ssolss.HHHHHHHHHHHH.',
                '.sssssbbyyyyyyyyyyy.',
                '..wvsBbSSSSSSSSSSS..',
                '..wwwv..SS.....SS...',
                '..wvw...SS.....SS...',
                '...w................'
            ], [
                '..........HHHHH.....',
                '........HHgGgGgHH...',
                '.......HgGgHHHgGgH..',
                '......HgGHgggGHGGgH.',
                '......HGHgggggHGHGH.',
                '..ss..HGGHgggHGGGGH.',
                '.sWWss.HHHHHHHHHHHH.',
                'ssolssbbyyyyyyyyyyy.',
                '.sssvBbSSSSSSSSSSS..',
                '..wwwv..SS.....SS...',
                '..wvw...SS.....SS...',
                '..w.................'
            ]],
            blink: [6, 'ssSSss.HHHHHHHHHHHH.']
        },
        // ----- khách đêm (Liêu Trai): mỗi khách một hình người và một hình thật -----
        // Bạch Thu Luyện: áo trắng, tóc đen ướt xoã qua vai (vệt sáng ướt), cổ tay trái có vảy bạc.
        'lady-white': {
            pal: { k: '#1f2433', K: '#353d55', h: '#7f93b3', s: '#f6e2d4', S: '#dcbfae', e: '#1f2433', p: '#efb6b0',
                w: '#f7f5ef', W: '#d7dbe3', v: '#b3bccb', b: '#a7cbe0', g: '#9fb4cf', f: '#c7cfda' },
            frames: [[
                '....kkkk....',
                '...kKhKkk...',
                '..kkKkkkkk..',
                '..kkkkkkkk..',
                '.kkkkkkkkkk.',
                '.kkksssskkk.',
                '.kksssssskk.',
                '.kksesseskk.',
                '.kkpsssspkk.',
                '.kkksssskkk.',
                '.kkkkSSkkkk.',
                '.kkwvwwvWkk.',
                '.khwwvwwWWk.',
                '.wwwwwvwWWW.',
                '.wwbbbbbbWW.',
                '.sgwwwwwWWs.',
                '..wwwwwwWW..',
                '..wwwwwwWW..',
                '..vwwwwwWv..',
                '...ff..ff...'
            ]],
            blink: [7, '.kksSssSskk.']
        },
        // Bạch Thu Luyện hình thật: cá trắng nhìn nghiêng, đầu bên trái.
        'fish-white': {
            pal: { w: '#f6f3ea', W: '#d6d9de', v: '#c3ced8', e: '#2a2a33' },
            frames: [[
                '..............',
                '....vvvv......',
                '..wwwwwwww..vv',
                '.wewwwwwwwwvW.',
                'wwwwwwwwwwwW..',
                '.WwwwwwwwWWvW.',
                '..WWWWWWWW..vv',
                '.....vv.......'
            ], [
                '..............',
                '....vvvv......',
                '..wwwwwwww.vv.',
                '.wewwwwwwwwvW.',
                'wwwwwwwwwwwWv.',
                '.WwwwwwwwWWvW.',
                '..WWWWWWWW.vv.',
                '.....vv.......'
            ]],
            rate: 0.45
        },
        // Tiểu Tạ: búi tóc đôi buộc dải hồng, áo xanh rất nhạt, cười nhe, tay cầm bút lông.
        'girl-pale': {
            pal: { k: '#3d3a4b', K: '#5c5a72', r: '#f0b8c4', s: '#f8ebe2', S: '#e6d0c4', e: '#3d3a4b', p: '#f2bcbc', m: '#d48a8a',
                c: '#d6e9f0', C: '#adcbd8', v: '#8db0c2', w: '#fdfdfb', f: '#8494aa', i: '#26232c', b: '#9b7a58' },
            frames: [[
                '..kk....kk..',
                '.kKrk..krKk.',
                '..kkKkkkkk..',
                '..kkkkkkkk..',
                '.kkkkkkkkkk.',
                '.kkksssskkk.',
                '..kssssssk..',
                '..ksessesk..',
                '..kpsssspk..',
                '...ssmmss...',
                '....SSSS....',
                '...cwccwC...',
                '..cccwwcCC..',
                '.cccccccCCC.',
                '.ccvvvvvvCCi',
                '.scccccccCsb',
                '..ccccccCC.b',
                '..ccccccCC..',
                '...ww..ww...',
                '...ff..ff...'
            ]],
            blink: [7, '..ksSssSsk..']
        },
        // Tiểu Tạ hình thật: cùng hình, không chân, không bóng.
        'girl-pale-ghost': {
            pal: { k: '#3d3a4b', K: '#5c5a72', r: '#f0b8c4', s: '#f8ebe2', S: '#e6d0c4', e: '#3d3a4b', p: '#f2bcbc', m: '#d48a8a',
                c: '#d6e9f0', C: '#adcbd8', v: '#8db0c2', w: '#fdfdfb', f: '#8494aa', i: '#26232c', b: '#9b7a58' },
            frames: [],
            blink: [7, '..ksSssSsk..'],
            rate: 0.9
        },
        // Lục Y Nữ: búi tóc cao cài trâm vàng, áo xanh lục eo thắt dải vàng, hai vệt cánh mờ sau vai.
        'girl-green': {
            pal: { k: '#262a22', K: '#43493a', y: '#e2c25a', s: '#f3dcc8', S: '#d9b9a0', e: '#262a22', p: '#eda9a2',
                l: '#9fcf7f', g: '#5da35b', G: '#3c7a44', w: '#eef5e6', a: '#e4f4f6', A: '#a9d0dc', f: '#3d4f33' },
            frames: [[
                '......kkk.....',
                '.....kKkky....',
                '...kkkKkkkk...',
                '...kkkkkkkk...',
                '..kkkkkkkkkk..',
                '..kkksssskkk..',
                '...kssssssk...',
                '...ksessesk...',
                '.a.kpsssspk.a.',
                '.Aa.ssssss.aA.',
                '..Aa.SSSS.aA..',
                '...AlgwwgGA...',
                '...lggwggGG...',
                '..llggggggGG..',
                '..llGyyyyGGG..',
                '..slgggggGGs..',
                '...lgggggGG...',
                '..lggggggGGG..',
                '..GggggggGGG..',
                '....ff..ff....'
            ]],
            blink: [7, '...ksSssSsk...']
        },
        // Lục Y Nữ hình thật: con ong xanh nhìn nghiêng, đầu bên trái, bay lơ lửng (khung đệm cho đủ 8×8).
        bee: {
            pal: { k: '#1d2b22', g: '#56b26e', G: '#2f7a4c', y: '#c6ea86', a: '#eef9fb', A: '#b9dde6', e: '#f2fff0' },
            frames: [[
                '........',
                '..aA.aA.',
                '...aaaa.',
                '.kkGyGy.',
                'kekgygyG',
                '.kkGyGy.',
                '..k..k..',
                '........'
            ], [
                '........',
                '........',
                '.aAaaAa.',
                '.kkGyGy.',
                'kekgygyG',
                '.kkGyGy.',
                '..k..k..',
                '........'
            ]],
            rate: 0.11
        },
        // ----- khách đêm đợt C (khung bước, mặt sau, hồn ma dựng ở khối hậu xử lý "đợt C") -----
        // Vương Lục Lang: áo ngắn xanh lam xám, tóc búi thấp sau gáy hơi rối, ống quần sẫm vì ướt, dép cỏ.
        'boy-blue': {
            pal: { k: '#1d2230', K: '#384259', h: '#7d93b0', s: '#f2d7c0', S: '#dcb59c', e: '#1d2230', p: '#eba595',
                w: '#eef3f5', l: '#d6e4ec', b: '#b0c7d4', B: '#86a0b2', d: '#46586c', t: '#4f6378', T: '#36475a',
                f: '#c4a46a', F: '#8f7346' },
            frames: [[
                '...k.kkk....',
                '...kKKkkkk..',
                '..kKhKkkkkk.',
                '.kkkkkkkkkk.',
                '.kkkkkkkkkk.',
                '..kskkskkkk.',
                '..sssssSkkk.',
                '.sessesSKkk.',
                '..pssspkkk..',
                '..sssssk.Kk.',
                '...SSSS.kKkk',
                '..lwbbwBB...',
                '..lbwwbBBB..',
                '.llbbbbBBBB.',
                '.lddddddBBB.',
                '.slbdbbbbBs.',
                '..lbdbbbBBB.',
                '..ttt..tTT..',
                '..ttT..tTT..',
                '.fff..fff...'
            ]],
            blink: [7, '.sSssSsSKkk.']
        },
        // Vương Lục Lang hình thật (ma nước): cùng hình, da xanh tái, tóc xoã ướt nhỏ giọt, rong quấn cổ chân, không chân.
        'boy-ghost': {
            pal: { k: '#162a2e', K: '#2c4a50', h: '#7fb3b4', s: '#cfe8e1', S: '#a3cbc3', e: '#1b3036', p: '#b7dcd2',
                w: '#eaf6f4', l: '#d2e4e6', b: '#a6c3c9', B: '#7c9ea6', d: '#4a6670', t: '#587a82', T: '#3e5c64',
                f: '#c4a46a', F: '#8f7346', g: '#5aa05a', G: '#2f6a3a', q: '#d8f4fa' },
            frames: [],
            rate: 0.9
        },
        // Họa Bì (hình người): mỹ nữ áo đỏ đai vàng, búi cao cài trâm vàng, mặt trắng như phấn, môi đỏ.
        'lady-red': {
            pal: { k: '#1a1418', K: '#3a2c36', h: '#6a5466', s: '#fdf6f1', S: '#ecdcd6', e: '#1a1418', p: '#f5c4c4', m: '#d0303a',
                w: '#fbf1e6', r: '#c63c2e', R: '#8e2620', l: '#e46a4c', y: '#efc65a', Y: '#b88a2c', f: '#5a1e1a' },
            frames: [[
                '.....kkk....',
                '....kKkkyy..',
                '...kKkkkkY..',
                '..kkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kksssskkkk.',
                '.ssssssskkk.',
                '.sessesSkkk.',
                '.kpssspkkk..',
                '..ssmsk.....',
                '...SSSS.....',
                '..lwrrwRR...',
                '..lrwwrRRR..',
                '.llrrrrRRRR.',
                '.lyyyyyyRRR.',
                '.slrrrrrrRs.',
                '..lrrrrrRRR.',
                '..lrrrrrRRR.',
                '.lrrrrrrRRRR',
                '..fff.fff...'
            ]],
            blink: [7, '.sSssSsSkkk.']
        },
        // Họa Bì hình thật: cùng dáng áo đỏ, mặt xanh lục, răng cưa trắng, tóc xổ tung, hai tay cầm cuộn da (cuộn
        // tranh nhạt, một vệt son vẽ dở). Mắt màu đèn (C.glow) nên ban đêm vẫn sáng.
        'demon-green': {
            pal: { k: '#1a1418', K: '#3a2c36', g: '#7fc35a', G: '#4f8e3a', e: '#ffc56b', w: '#fbfbf2', v: '#3a1a1a',
                r: '#c63c2e', R: '#8e2620', l: '#e46a4c', y: '#efc65a', f: '#5a1e1a', P: '#f5e6d6', Q: '#d5bca6', x: '#e0707a' },
            frames: [[
                'k...kk...k..',
                '.k.kkKkk.k..',
                '..kKkkkkkkk.',
                '.kkkkkkkkkkk',
                'kkkkkkkkkkk.',
                '.kkgggkkkkk.',
                '.gggggggkkkk',
                '.gegggeGkkk.',
                '.kwvwvwgkkkk',
                '..gggggkkkk.',
                '...GGGG.kkk.',
                '..lwrrwRRkk.',
                '..lrwwrRRRk.',
                '.llrrrrRRRR.',
                '.lyyyyyyRRR.',
                '.gPPPxPPPQg.',
                '..lrrrrrRRR.',
                '..lrrrrrRRR.',
                '.lrrrrrrRRRR',
                '..fff.fff...'
            ]],
            blink: [7, '.gGgggGGkkk.']
        },
        // Hương Ngọc: áo trắng ngà, đai hồng nhạt, cài một bông mẫu đơn trắng nhuỵ vàng sau búi, cười tươi.
        'girl-white': {
            pal: { k: '#2e2226', K: '#4a3a40', s: '#f8e8dc', S: '#e6cfc0', e: '#2e2226', p: '#f3b8b8', m: '#d0707a',
                F: '#fdfcf6', E: '#dcdcd6', o: '#f2c94c', n: '#4f8a42',
                w: '#fbf5e4', W: '#e3d8bf', v: '#cbbd9e', x: '#f2b8c3', X: '#d58b9c', f: '#d9a3ad' },
            frames: [[
                '....kkkk....',
                '...kKkkkFF..',
                '..kKkkkFoFF.',
                '..kkkkkkFEn.',
                '.kkkkkkkkkk.',
                '.kksssskkkk.',
                '.ssssssskkk.',
                '.sessesSkkk.',
                '.kpssspkkkk.',
                '..smmsk.kk..',
                '...SSSS..k..',
                '..wvwwvWW...',
                '..wwvvwWWW..',
                '.wwwwwwWWWW.',
                '.wxxxxxxWWW.',
                '.swwwXwwwWs.',
                '..wwwXwwWWW.',
                '..wwwwwwWWW.',
                '..vwwwwwWWv.',
                '..fff.fff...'
            ]],
            blink: [7, '.sSssSsSkkk.']
        },
        // Hương Ngọc hình thật: khóm mẫu đơn trắng ba bông nhuỵ vàng, lá xanh sẫm; không đi, hai khung đung đưa.
        'peony-white': {
            pal: { F: '#fbfaf2', E: '#dedfd8', y: '#f0c84a', n: '#4f8a42', N: '#2e5a2c', l: '#79ad5a', b: '#5a4630' },
            frames: [[
                '....FFF.....',
                '...FFFFF....',
                '...FEyEF.FF.',
                '.FF.EEEnFFFF',
                'FFFFlnnFFyEF',
                'FEyEFnlnEEE.',
                '.EEEnnNlnnn.',
                '.lnnNnnnNnl.',
                '..nNnbNnnN..',
                '...nnbbnn...',
                '....NbbN....',
                '.....bb.....'
            ], [
                '.....FFF....',
                '....FFFFF...',
                '....FEyEF.FF',
                '.FF..EEEnFFF',
                'FFFFlnnFFFyE',
                'FEyEFnlnnEEE',
                '.EEEnnNlnnn.',
                '.lnnNnnnNnl.',
                '..nNnbNnnN..',
                '...nnbbnn...',
                '....NbbN....',
                '.....bb.....'
            ]],
            rate: 0.9
        },
        // ----- khách đêm đợt C phần 2 (khung bước, mặt sau, hồn ma dựng ở khối hậu xử lý "đợt C phần 2") -----
        // Liên Tỏa: áo xám tím nhạt, mái bằng, tóc đen dài thẳng buộc thấp sau gáy bằng dải đỏ, đuôi tóc rủ sau lưng;
        // tay phải (bên trái màn hình, phía cô nhìn) giơ tờ giấy thơ đỏ trước ngực.
        'girl-grey': {
            pal: { k: '#2a2631', K: '#464054', s: '#f5e7df', S: '#dcc6bc', e: '#2a2631', p: '#eab0ae',
                c: '#c2b8cf', C: '#9a8fae', v: '#73698c', w: '#f4f1f8', r: '#c43b3f', R: '#7e2530', f: '#5f5874' },
            frames: [[
                '....kkkk....',
                '...kKKkkk...',
                '..kKkkkkkk..',
                '..kkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.sssssskkkk.',
                '.sessesSkkk.',
                '..pssspkkkk.',
                '..sssssSkkk.',
                '...SSSSkrrk.',
                'rrcwccwCkRk.',
                'rRccwwcCCkk.',
                'rscccccCCCk.',
                '.cvvvvvvvCk.',
                '.ccccccccCk.',
                '..ccccccCCk.',
                '..ccccccCCC.',
                '...ww..ww...',
                '..fff.fff...'
            ]],
            blink: [7, '.sSssSsSkkk.']
        },
        // Liên Tỏa hình thật: cùng hình, không chân, không bóng (như hồn ma Tiểu Tạ).
        'girl-grey-ghost': {
            pal: { k: '#2a2631', K: '#464054', s: '#f5e7df', S: '#dcc6bc', e: '#2a2631', p: '#eab0ae',
                c: '#c2b8cf', C: '#9a8fae', v: '#73698c', w: '#f4f1f8', r: '#c43b3f', R: '#7e2530', f: '#5f5874' },
            frames: [],
            blink: [7, '.sSssSsSkkk.'],
            rate: 0.9
        },
        // Nhan Như Ngọc: thiếu nữ áo dài kiểu cổ, áo trong màu kem, áo khoác ngọc nhạt tay rộng, tóc vấn cài trâm ngọc
        // chéo (hạt ngọc ở đầu trâm); tay phải (bên trái màn hình) ôm cuốn sách mỏng bìa chàm trước ngực.
        'lady-paper': {
            pal: { k: '#2b2326', K: '#4b3e43', s: '#f9ede3', S: '#e3cec0', e: '#2b2326', p: '#f0b0ac',
                a: '#f4ecd6', A: '#d8cbab', j: '#b6dac8', J: '#86b9a3', g: '#4f8f78', y: '#7fd0ae', n: '#34466e', u: '#efe5c8',
                f: '#5e8c7a' },
            frames: [[
                '.....kkkk...',
                '....kKkkkk..',
                '...kkkkkkkgy',
                '..kKkkkkkgk.',
                '.kkkkkkkgkk.',
                '.kkssskkkkk.',
                '.sssssskkkk.',
                '.sessesSkkk.',
                '.kpssspkkk..',
                '..sssssk....',
                '...SSSS.....',
                '..jaaaajJ...',
                'nnjjaajJJJ..',
                'unjaaaaaJJJ.',
                'nnjggggggJJJ',
                'jjjaaaaaaJJJ',
                'gggaaaaaaggg',
                '..aaaaaaAA..',
                '..aaaaaaAAA.',
                '..fff.fff...'
            ]],
            blink: [7, '.sSssSsSkkk.']
        },
        // Nhan Như Ngọc hình thật: hình người cắt bằng giấy trắng kiểu búp bê giấy (dang tay, váy xoè), tóc tô mực,
        // chấm ngọc ở trâm, nếp gấp dọc giữa (nửa phải giấy nghiêng nên tối hơn) và nếp gấp ngang ở gấu váy như hình
        // người. Nhìn thẳng, đối xứng; khung 2 tay áo và gấu giấy phất lên.
        'paper-doll': {
            pal: { w: '#fbfaf4', W: '#e2e0d6', v: '#bdb9aa', i: '#2c2622', g: '#5aa88a' },
            frames: [[
                '.....ii.....',
                '....iiig....',
                '...iiiiii...',
                '...iwwWWi...',
                '...wiwWiW...',
                '...wwwWWW...',
                '....wwWW....',
                '.....wW.....',
                '.wwwwiiWWWW.',
                'wwwwwwWWWWWW',
                'w..wwwWWW..W',
                '...iiiiii...',
                '...wwwWWW...',
                '..wwwwWWWW..',
                '..wwwwWWWW..',
                '.wwwwwWWWWW.',
                '.vvvvvvvvvv.',
                'wwwwwwWWWWWW',
                '...ww..WW...',
                '...ww..WW...'
            ], [
                '.....ii.....',
                '....iiig....',
                '...iiiiii...',
                '...iwwWWi...',
                '...wiwWiW...',
                '...wwwWWW...',
                '....wwWW....',
                '.....wW.....',
                '.wwwwiiWWWW.',
                'wwwwwwWWWWWW',
                '...wwwWWW...',
                '...iiiiii...',
                '...wwwWWW...',
                '..wwwwWWWW..',
                '..wwwwWWWW..',
                '.wwwwwWWWWW.',
                'wvvvvvvvvvvW',
                '.wwwwwWWWWW.',
                '...ww..WW...',
                '...ww..WW...'
            ]],
            rate: 0.5
        },
        // ----- khách đêm đợt D (khung bước, mặt sau, hồn ma dựng ở khối hậu xử lý "đợt D") -----
        // Đạo sĩ Lao Sơn: ông già lưng còng (gù bên phải, đầu chúi về trước), búi tóc bạc xuyên trâm gỗ, mày bạc rậm, râu
        // trắng dài phủ ngực tới thắt lưng, áo đạo xám dây lưng sẫm có hai miếng vá nâu, tay trái màn hình chống gậy gỗ.
        'taoist-old': {
            pal: { h: '#c8c4ba', H: '#8e897f', n: '#7a5532', s: '#efcfae', S: '#cfa585', e: '#2a2430',
                w: '#f6f3ec', W: '#cfcac0', g: '#9298a0', G: '#666c75', d: '#3c3834', q: '#a08560', Q: '#c4a679',
                t: '#8c6a40', T: '#5c4428', f: '#3a342e' },
            frames: [[
                '.....HH.....',
                '...nnHHnn...',
                '....hhhhH...',
                '...hhhhhhH..',
                'Tt.hhhhhhHH.',
                'tT.ssssshHH.',
                't.wwswwShHH.',
                'tsesseSShHH.',
                't.swwwwShH..',
                't.wwWwwwH...',
                't.wwwWwwGG..',
                'tsgwwWwWGGG.',
                't.gwwWWgGGGG',
                't.ggwWggGGG.',
                't.gddddddGG.',
                't.ggqQgggGG.',
                't.ggqqgggGG.',
                't.gggggggGGG',
                't..ggggggGG.',
                't.fff.fff...'
            ]],
            blink: [7, 'tsSssSSShHH.']
        },
        // Đạo sĩ Lao Sơn hình thật: hạc đầu đỏ đứng một chân, nhìn nghiêng mỏ bên trái: đỉnh đầu đỏ, mặt và cổ trước đen, vệt
        // trắng sau gáy, thân trắng, lông đuôi đen rủ, chân xám đen co một chân. Dùng lại làm món tô điểm `hac` bên Hồ sen.
        crane: {
            pal: { r: '#d8302a', R: '#9e1c1c', w: '#f7f6f0', W: '#d3d7dc', v: '#a9b0b9', k: '#1c1c22', K: '#3c3c46',
                g: '#a3a274', G: '#6f6f4a', l: '#4a4a54' },
            frames: [[
                '..rR........',
                '.krrw.......',
                'gGkkwW......',
                '..kkw.......',
                '..kkw.......',
                '...kkw......',
                '...kkw......',
                '....kww.....',
                '....wwwwW...',
                '...wwwwwwWW.',
                '...wwwwwWWKk',
                '...WwwwWWKkk',
                '....WWWvkkkk',
                '.....vWkkkK.',
                '......lK.k..',
                '......l..l..',
                '......l.l...',
                '......l.l...',
                '......l.....',
                '.....lll....'
            ], [
                '...rR.......',
                '..krrw......',
                '.gkkwW......',
                'gG.kkw......',
                '...kkw......',
                '...kkw......',
                '...kkw......',
                '....kww.....',
                '....wwwwW...',
                '...wwwwwwWW.',
                '...wwwwwWWKk',
                '...WwwwWWKkk',
                '....WWWvkkkk',
                '.....vWkkkK.',
                '......lK.k..',
                '......l..l..',
                '......l.l...',
                '......l.l...',
                '......l.....',
                '.....lll....'
            ]],
            rate: 1.1
        },
        // Hoa Cô Tử: tóc nâu hạt dẻ búi hai bên cài lá xanh, áo nâu nhạt chấm trắng thắt dải nâu sẫm, tay phải (bên trái màn
        // hình) xách giỏ tre đầy cây thuốc ở ngang hông.
        'girl-fawn': {
            pal: { k: '#4a3226', K: '#6e4c3a', l: '#86b85a', L: '#477a32', s: '#f6e0cc', S: '#dcbca4', e: '#2a2026',
                p: '#efa9a0', m: '#c8706a', c: '#c4926a', C: '#9a6a48', v: '#6a442c', w: '#fbf3e4',
                b: '#e6c67e', B: '#9c7638', g: '#5ea848', f: '#6a4a34' },
            frames: [[
                '..lL....lL..',
                '.kKkk..kKkk.',
                '..kkKkkkkk..',
                '..kkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kksssskkkk.',
                '.sssssskkk..',
                '.sessesSkk..',
                '.kpssspkkk..',
                '..ssmssk....',
                '...SSSS.....',
                '..cwcccCC...',
                'g.ccwcwCCC..',
                'ggscccccCwC.',
                'BbBvvvvvvCC.',
                'bBbcwcccwCs.',
                'BbBccwcccCC.',
                '..cwcccwcCC.',
                '..vcccccCCv.',
                '..fff.fff...'
            ]],
            blink: [7, '.sSssSsSkk..']
        },
        // Hoa Cô Tử hình thật: hươu xạ con nhìn nghiêng đầu bên trái, tai to, lông nâu lốm đốm trắng trên lưng, đuôi trắng.
        fawn: {
            pal: { b: '#b0743f', B: '#7e4c28', E: '#6a4024', p: '#e9a990', w: '#f6ead2', e: '#1a1210', n: '#2a1c16',
                d: '#3a2618' },
            frames: [[
                '.EE.........',
                '.pEE........',
                '..bbE.......',
                '.bbbbb......',
                'nbebbbw.....',
                '.bbbbw......',
                '...bbbbbbb..',
                '..bbwbbwbbBw',
                '..bbbwbbwbBw',
                '..BbbbbbbbB.',
                '...b.b..bb..',
                '...b.b..b.b.',
                '...d.d..d.d.'
            ], [
                '..EE........',
                '.pEE........',
                '..bbE.......',
                '.bbbbb......',
                'nbebbbw.....',
                '.bbbbw......',
                '...bbbbbbb..',
                '..bbwbbwbbBw',
                '..bbbwbbwbB.',
                '..BbbbbbbbB.',
                '...b.b..bb..',
                '...b.b..b.b.',
                '...d.d..d.d.'
            ]],
            blink: [4, 'nbbbbbw.....'],
            rate: 0.8
        },
        // Nhiếp Tiểu Thiến (15/10/2026, vẽ từ ảnh AI qua tools/quy-van/ai-pixel.mjs, khuôn quán chủ): búi tóc nhỏ buộc lụa
        // đỏ trên đỉnh, đuôi lụa rủ bên phải; tóc đen dài thẳng buông sau lưng (không ôm mặt, khác Bạch Thu Luyện); áo trắng
        // ngà viền xanh nhạt ở cổ và gấu; hai tay nâng thỏi vàng trước bụng; mặt nhợt, không má hồng.
        'lady-qian': {
            pal: { a: '#272528', b: '#da2c26', c: '#4d4659', d: '#f7dcb9', e: '#e4b68c', f: '#abc4e4', g: '#86a8d9',
                h: '#f9f6e9', i: '#e7ae03', j: '#fcd939', k: '#63779d', l: '#fceaca', m: '#b0484c' },
            frames: [[
                '.....aa.....',
                '....abbab...',
                '....aaaa.b..',
                '...aaaaaa.b.',
                '..accaaaaa..',
                '..aaaaaaaaa.',
                '..dddddaaaa.',
                '.daddadeaaa.',
                '..dddddaaa..',
                '..ddmddaaa..',
                '...fddgaaa..',
                '..hfdfhhaa..',
                '..ihjhihha..',
                '.hiiiiihhha.',
                '.hdiiidfhha.',
                '.ffhhhgfhha.',
                '..hhhhghha..',
                '..ffffgfff..',
                '...hh..hh...',
                '..kkk.kkk...'
            ]],
            blink: [7, '.deddedeaaa.']
        },
        // Nhiếp Tiểu Thiến hình thật: cùng hình, không chân, không bóng (như hồn ma Liên Tỏa).
        'lady-qian-ghost': {
            pal: { a: '#272528', b: '#da2c26', c: '#4d4659', d: '#f7dcb9', e: '#e4b68c', f: '#abc4e4', g: '#86a8d9',
                h: '#f9f6e9', i: '#e7ae03', j: '#fcd939', k: '#63779d', l: '#fceaca', m: '#b0484c' },
            frames: [],
            blink: [7, '.deddedeaaa.'],
            rate: 0.9
        }
    };

    // Chép hàng của một khung, thay các hàng từ chỉ số `from` bằng `repl` (khung bước, khung hồn ma).
    function rowsWith(rows, from, repl) {
        var out = rows.slice();
        for (var k = 0; k < repl.length; k++) out[from + k] = repl[k];
        return out;
    }

    // Khung bước: chép khung đứng, đổi hàng chân (dang chân hoặc nhấc một chân, vạt áo đưa theo).
    // Khung cũ của cáo, mèo, lửng là vẫy đuôi (giữ cho lúc đứng); khung bước thêm vào cuối.
    (function () {
        var S = SPRITES;
        S.keeper.frames.push(rowsWith(S.keeper.frames[0], 17, ['..lrrrrrRRR.', '..uu...bb...', '..bb........']));
        S.fox.frames.push(rowsWith(S.fox.frames[0], 19, ['...dd....dd...']));
        S.cat.frames.push(rowsWith(S.cat.frames[0], 9, ['.kk....kk...']));
        S.tanuki.frames.push(rowsWith(S.tanuki.frames[0], 11, ['.mm.....mm...']));
        S['lady-white'].frames.push(rowsWith(S['lady-white'].frames[0], 17, ['..wwwwwwWWv.', '..vwwwwwWW..', '..ff....ff..']));
        S['girl-pale'].frames.push(rowsWith(S['girl-pale'].frames[0], 17, ['..ccccccCCC.', '..ww....ww..', '..ff....ff..']));
        S['girl-green'].frames.push(rowsWith(S['girl-green'].frames[0], 17, ['...lggggggGGG.', '..GggggggGGG..', '...ff....ff...']));
        // Hồn ma: hai hàng chân bỏ trống; khung 2 vạt áo lay như đang lơ lửng.
        var blank = '............';
        S['girl-pale-ghost'].frames.push(rowsWith(S['girl-pale'].frames[0], 18, [blank, blank]));
        S['girl-pale-ghost'].frames.push(rowsWith(S['girl-pale'].frames[0], 17, ['...cccccCCC.', blank, blank]));
        // idle: khung luân phiên lúc đứng (mặc định mọi khung); walk: khung lúc đi (đổi mỗi 0,25 s).
        // face: hướng nhìn của hình gốc (−1 trái); đi sang phải thì lật. shadow: [cột tâm, bán trục] bóng chân.
        S.keeper.idle = [0];
        S.keeper.walk = [0, 1];
        S.keeper.shadow = [5.5, 5];
        S.fox.idle = [0, 1];
        S.fox.walk = [0, 2];
        S.fox.shadow = [6.5, 5.5];
        S.cat.idle = [0, 1];
        S.cat.walk = [0, 2];
        S.cat.shadow = [4.5, 5];
        S.tanuki.idle = [0, 1];
        S.tanuki.walk = [0, 2];
        S.tanuki.shadow = [5, 5.5];
        S['lady-white'].idle = [0];
        S['lady-white'].shadow = [5.5, 5];
        S['girl-pale'].idle = [0];
        S['girl-pale'].shadow = [5.5, 5];
        S['girl-green'].idle = [0];
        S['girl-green'].shadow = [6.5, 5];
        Object.keys(S).forEach(function (k) {
            if (!S[k].walk) S[k].walk = S[k].frames.length > 1 ? [0, 1] : [0];
            if (!S[k].face) S[k].face = -1;
        });
        // ----- đợt 4b: hướng nhìn và tư thế câu (WP-A) -----
        // Mặt trước 3/4 nhìn trái (face −1), mặt sau (back, cũng "nhìn trái": engine lật chung), tư thế câu của
        // quán chủ (fish, nhìn phải, không lật). Chỉ gán, không push vào mảng cũ: chạy lại cho cùng kết quả.
        // Mặt trước người: mắt dịch 2 cột sang trái, mũi nhô một pixel ra ngoài má, tóc và tai dồn sang phải
        // (gáy), vạt áo chéo lệch trái, mũi giày chĩa trái. Mặt sau: không mặt, vật cầm ở tay trái của nhân vật
        // đổi sang bên trái màn hình (bút của Tiểu Tạ, trâm của Lục Y Nữ, trăng của Hồ Tiểu Nguyệt).
        var ghostBlank = '............';

        // Quán chủ.
        S.keeper.frames = [[
            '.....kk.....',
            '....okko....',
            '....kkkkk...',
            '...kkkkkkk..',
            '..kKKkkkkkk.',
            '..kkkkkkkkk.',
            '..sssssKkkk.',
            '.sessesSkkk.',
            '..pssspkkk..',
            '..sssssk....',
            '...SSSS.....',
            '..lwrrwRR...',
            '..lrwwrRRR..',
            '.llrrrrRRRR.',
            '.lddddddRRR.',
            '..lrdrrrrRs.',
            '..lrrrrrRR..',
            '..lrrrrrRRR.',
            '...uu..uu...',
            '..bbb.bbb...'
        ]];
        S.keeper.frames[1] = rowsWith(S.keeper.frames[0], 17, ['..lrrrrrRRR.', '..uu...bbb..', '.bbb........']);
        S.keeper.blink = [7, '.sSssSsSkkk.'];
        // Mặt sau: má trái ló một pixel, cổ áo trắng sau gáy, nút đai sau lưng; áo vẫn sáng bên trái màn hình.
        S.keeper.back = {
            frames: [[
                '.....kk.....',
                '....okko....',
                '....kkkk....',
                '...kkkkkk...',
                '..kKKkkkkk..',
                '..kKkkkkkk..',
                '..kkkkkkkk..',
                '.skkkkkkkk..',
                '..kkkkkkkk..',
                '...kkkkkk...',
                '....SSSS....',
                '...lwwwwR...',
                '..llrrrrRR..',
                '.lllrrrrRRR.',
                '.llddddddRR.',
                '.slrrddrrRs.',
                '..lrrrrrRR..',
                '..lrrrrrRR..',
                '...uu..uu...',
                '...bb..bb...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        S.keeper.back.frames[1] = rowsWith(S.keeper.back.frames[0], 17, ['..lrrrrrRRR.', '..uu...bb...', '..bb........']);
        // Tư thế câu: nghiêng hẳn nhìn phải, tay phải đưa ra trước cầm cần trúc (màu o) chĩa lên bên phải,
        // đốc cần lộ dưới cổ tay. Khung 1: thân cần cong ra một pixel (cá rỉa mồi); bàn tay và ngọn cần
        // đứng yên ở cả hai khung để dây câu không rời cần.
        S.keeper.fish = {
            frames: [[
                '...kk.............',
                '..okko...........o',
                '..kkkk..........o.',
                '.kkkkkkk........o.',
                'kKKkkkkkk......o..',
                'kkkkkkkkkk....o...',
                'kkkkkksssk....o...',
                'kkkkSssess...o....',
                '.kkkSspss...o.....',
                '..kkkSss...o......',
                '....SS.....o......',
                '...lrwrr..o.......',
                '..llrrrwws........',
                '..lllrrRo.........',
                '..ldddddR.........',
                '..lrrrrRR.........',
                '..lrrrrRR.........',
                '..lrrrrRRR........',
                '...uu..uu.........',
                '...bbb.bbb........'
            ], [
                '...kk.............',
                '..okko...........o',
                '..kkkk...........o',
                '.kkkkkkk........o.',
                'kKKkkkkkk.......o.',
                'kkkkkkkkkk.....o..',
                'kkkkkksssk.....o..',
                'kkkkSssess....o...',
                '.kkkSspss....o....',
                '..kkkSss....o.....',
                '....SS.....o......',
                '...lrwrr..o.......',
                '..llrrrwws........',
                '..lllrrRo.........',
                '..ldddddR.........',
                '..lrrrrRR.........',
                '..lrrrrRR.........',
                '..lrrrrRRR........',
                '...uu..uu.........',
                '...bbb.bbb........'
            ]],
            idle: [0, 1],
            anchor: 6,
            tip: [17, 1],
            hand: [9, 12],
            shadow: [6, 5]
        };

        // Hồ Tiểu Nguyệt: mặt trước giữ nguyên (đuôi bên phải đã cho thấy hướng). Mặt sau vẽ tay vì màu trắng
        // của mõm cũng là chóp đuôi: đầu lông cam, tai sau sẫm, trăng khuyết sang trái, không tách trà, đai vòng ra sau.
        S.fox.back = {
            frames: [[
                '...d......d...',
                '..dfd....dfd..',
                '..fdf....fdf..',
                '..fFffffffff..',
                '.yfFFfffffff..',
                '..fFffffffff..',
                '..ffffffffff..',
                '..ffffffffff..',
                '...ffffffff...',
                '....ffffff..w.',
                '....bbLLbB.wwf',
                '...bbbbbbBBwff',
                '..bbbbbbbbBBff',
                '..bbbbbbbbBffF',
                '..bbttttttBfFf',
                '..bbbbbbbbBfFf',
                '..bbbbbbbbBBff',
                '..bbbbbbbbBBf.',
                '...bbbbbbBB...',
                '....dd..dd....'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        S.fox.back.frames[1] = rowsWith(S.fox.back.frames[0], 19, ['...dd....dd...']);

        // Mèo mun: mắt và mũi chỉ có ở mặt, nên mặt sau suy ra bằng map (đầu đen, vòng cổ đỏ vẫn thấy).
        S.cat.back = { map: { y: 'k', e: 'k', p: 'k' } };

        // Tiểu Ly: vẽ tay vì màu mặt nạ cũng là chân và chóp tai. Gáy nâu, cổ sẫm tách đầu khỏi lưng, sống lưng sáng, đuôi khoang.
        S.tanuki.back = {
            frames: [[
                '..lL.........',
                '.mLlm........',
                'mbBBbm.......',
                'bBBbbbm......',
                'bBbbbbm......',
                '.mbbbmBBb....',
                '..mmmBBbbb...',
                '..bbBbbbbbBt.',
                '.bbBbbbbbbtBt',
                '.bbbbbbbbbBtt',
                '.bbbbbbbbbbt.',
                '..mm...mm....'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        S.tanuki.back.frames[1] = rowsWith(S.tanuki.back.frames[0], 11, ['.mm.....mm...']);

        // Lão Quy: vẽ tay từ hai khung mặt trước: đầu nhìn từ sau (không kính, không râu), khăn cổ vẫn thấy.
        S.turtle.back = {
            frames: [[
                '..........HHHHH.....',
                '........HHgGgGgHH...',
                '.......HgGgHHHgGgH..',
                '......HgGHgggGHGGgH.',
                '.sss..HGHgggggHGHGH.',
                'ssssS.HGGHgggHGGGGH.',
                'sssSSS.HHHHHHHHHHHH.',
                '.sSSSSbbyyyyyyyyyyy.',
                '..SSSBbSSSSSSSSSSS..',
                '........SS.....SS...',
                '........SS.....SS...',
                '....................'
            ], [
                '..........HHHHH.....',
                '........HHgGgGgHH...',
                '.......HgGgHHHgGgH..',
                '......HgGHgggGHGGgH.',
                '......HGHgggggHGHGH.',
                '.sss..HGGHgggHGGGGH.',
                'ssssSS.HHHHHHHHHHHH.',
                'sssSSSbbyyyyyyyyyyy.',
                '.sSSSBbSSSSSSSSSSS..',
                '........SS.....SS...',
                '........SS.....SS...',
                '....................'
            ]],
            idle: [0, 1],
            walk: [0, 1]
        };

        // Bạch Thu Luyện: mặt trước 3/4, lọn tóc bên xa mảnh lại, má che lọn tóc, vạt sau xoè sang phải; vảy bạc vẫn
        // ở cổ tay bên trái màn hình.
        S['lady-white'].frames = [[
            '....kkkk....',
            '...kKhKkk...',
            '..kkKkkkkk..',
            '..kkkkkkkkk.',
            '.kkkkkkkkkk.',
            '.kksssskkkk.',
            '.ssssssskkk.',
            '.sessesSkkk.',
            '.kpssspkkkk.',
            '.kksssskkkk.',
            '.kkkSSkkkkk.',
            '.kwvwwvWWkk.',
            '.khwvwwWWWk.',
            '.wwwwvwWWWW.',
            '.wbbbbbbbWW.',
            '.sgwwwwwWWs.',
            '..wwwwwwWWW.',
            '..wwwwwwWWW.',
            '..vwwwwwWWv.',
            '..fff.fff...'
        ]];
        S['lady-white'].frames[1] = rowsWith(S['lady-white'].frames[0], 17, ['..wwwwwwWWv.', '..vwwwwwWW..', '.fff....ff..']);
        S['lady-white'].blink = [7, '.sSssSsSkkk.'];
        // Mặt sau: tóc dài phủ lưng, nhọn dần xuống đai; vảy bạc sang cổ tay bên phải màn hình (cùng một cổ tay).
        S['lady-white'].back = {
            frames: [[
                '....kkkk....',
                '...kKhKkk...',
                '..kkKkkkkk..',
                '..kkkkkkkk..',
                '.kKkkkkkkkk.',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.wkkkkkkkkW.',
                '.wkkkkkkkWW.',
                '.wwkkhkkkWW.',
                '.wbbkkkkbWW.',
                '.swwkkkwWgs.',
                '..wwwwwwWW..',
                '..wwwwwwWW..',
                '..vwwwwwWv..',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        S['lady-white'].back.frames[1] = rowsWith(S['lady-white'].back.frames[0], 17, ['..wwwwwwWWv.', '..vwwwwwWW..', '..ff....ff..']);

        // Tiểu Tạ: mặt trước 3/4, búi xa lùi vào một cột, miệng cười lệch trái; bút vẫn bên phải màn hình.
        S['girl-pale'].frames = [[
            '...kk...kk..',
            '..kKrk.krKk.',
            '..kkKkkkkk..',
            '..kkkkkkkkk.',
            '.kkkkkkkkkk.',
            '.kksssskkkk.',
            '.sssssskkk..',
            '.sessesSkk..',
            '.kpssspkkk..',
            '..ssmmsk....',
            '...SSSS.....',
            '..cwccwCC...',
            '..ccwwcCCC..',
            '.cccccccCCC.',
            '.cvvvvvvvCCi',
            '.scccccccCsb',
            '..ccccccCC.b',
            '..ccccccCCC.',
            '...ww..ww...',
            '..fff.fff...'
        ]];
        S['girl-pale'].frames[1] = rowsWith(S['girl-pale'].frames[0], 17, ['..ccccccCCC.', '..ww....ww..', '.fff....ff..']);
        S['girl-pale'].blink = [7, '.sSssSsSkk..'];
        // Mặt sau: hai búi và dải hồng nhìn từ sau, má trái ló, cổ áo trắng, nơ đai sau lưng, bút sang trái.
        S['girl-pale'].back = {
            frames: [[
                '..kk....kk..',
                '.kKrk..krKk.',
                '..kkKkkkkk..',
                '..kKkkkkkk..',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.skkkkkkkk..',
                '..kkkkkkkk..',
                '..kkkkkkkk..',
                '...kkkkkk...',
                '....SSSS....',
                '...cwwwwC...',
                '..ccccccCC..',
                '.cccccccCCC.',
                'iccvvvvvvCC.',
                'bscccvvccCs.',
                'b.ccccccCC..',
                '..ccccccCC..',
                '...ww..ww...',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        S['girl-pale'].back.frames[1] = rowsWith(S['girl-pale'].back.frames[0], 17, ['..ccccccCCC.', '..ww....ww..', '..ff....ff..']);
        // Hồn ma dựng lại từ khung mới của Tiểu Tạ theo đúng công thức cũ: hai hàng chân trống, khung 2 vạt áo lay.
        S['girl-pale-ghost'].frames = [
            rowsWith(S['girl-pale'].frames[0], 18, [ghostBlank, ghostBlank]),
            rowsWith(S['girl-pale'].frames[0], 17, ['...cccccCCC.', ghostBlank, ghostBlank])
        ];
        S['girl-pale-ghost'].blink = [S['girl-pale'].blink[0], S['girl-pale'].blink[1]];
        S['girl-pale-ghost'].back = {
            frames: [
                rowsWith(S['girl-pale'].back.frames[0], 18, [ghostBlank, ghostBlank]),
                rowsWith(S['girl-pale'].back.frames[0], 17, ['...cccccCCC.', ghostBlank, ghostBlank])
            ],
            idle: [0, 1],
            walk: [0, 1]
        };

        // Lục Y Nữ: mặt trước 3/4, cổ vẫn sau cằm; hai vệt cánh giữ chỗ cũ sau vai.
        S['girl-green'].frames = [[
            '......kkk.....',
            '.....kKkky....',
            '...kkkKkkkk...',
            '...kkkkkkkkk..',
            '..kkkkkkkkkk..',
            '..kkssskkkkk..',
            '..sssssskkk...',
            '..sessesSkk...',
            '.a.pssspkk..a.',
            '.Aa.ssssk..aA.',
            '..Aa.SSSS.aA..',
            '...AgwwgGGA...',
            '...lgwwggGG...',
            '..llggggggGG..',
            '..lyyyyyGGGG..',
            '..slgggggGGs..',
            '...lgggggGG...',
            '..lggggggGGG..',
            '..GggggggGGGG.',
            '...fff.fff....'
        ]];
        S['girl-green'].frames[1] = rowsWith(S['girl-green'].frames[0], 17, ['...lggggggGGG.', '..GggggggGGGG.', '..fff....ff...']);
        S['girl-green'].blink = [7, '..sSssSsSkk...'];
        // Mặt sau: búi cao, trâm vàng sang trái, má trái ló; hai cánh mờ xoè từ lưng ra quá vai.
        S['girl-green'].back = {
            frames: [[
                '......kkk.....',
                '....ykKkk.....',
                '...kkkKkkkk...',
                '...kKkkkkkk...',
                '..kKkkkkkkkk..',
                '..kkkkkkkkkk..',
                '..skkkkkkkk...',
                '...kkkkkkkk...',
                'aa.kkkkkkkk.aa',
                'AAa.kkkkkk.aAA',
                '.AAa.SSSS.aAA.',
                '..AAaggggaAA..',
                '...AAgggGAA...',
                '..llggggggGG..',
                '..llyyyyyyGG..',
                '..slgggggGGs..',
                '...lgggggGG...',
                '..lggggggGGG..',
                '..GggggggGGG..',
                '....ff..ff....'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        S['girl-green'].back.frames[1] = rowsWith(S['girl-green'].back.frames[0], 17, ['...lggggggGGG.', '..GggggggGGG..', '...ff....ff...']);

        // Cá trắng và ong: hình nghiêng sẵn (đầu bên trái), lật là đổi hướng; không cần mặt sau, miễn test bất đối xứng.
        S['fish-white'].symmetric = true;
        S.bee.symmetric = true;

        // ----- đợt C: Vương Lục Lang, Họa Bì, Hương Ngọc -----
        // Khung 0 vẽ sẵn mặt trước 3/4 nhìn trái trong khối SPRITES; ở đây thêm khung bước, mặt sau, hồn ma. Gán thẳng
        // walk/idle/shadow vì vòng forEach ở trên chạy lúc các sprite này mới có một khung (walk = [0]).
        // Vương Lục Lang: khung bước nhấc chân sau; mặt sau búi tóc thấp giữa gáy, nút đai sau lưng.
        var wang = S['boy-blue'];
        wang.frames[1] = rowsWith(wang.frames[0], 17, ['..tt...tTT..', '..tt...fff..', '.fff........']);
        wang.idle = [0];
        wang.walk = [0, 1];
        wang.shadow = [5.5, 5];
        wang.back = {
            frames: [[
                '...k.kkk....',
                '...kKKkkkk..',
                '..kKhKkkkkk.',
                '.kKkkkkkkkk.',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.skkkkkkkkk.',
                '..kkkkkkkk..',
                '...kKKkkk...',
                '....kkkk....',
                '...lwwwwB...',
                '..llbbbbBB..',
                '.llbbbbbBBB.',
                '.lddddddBBB.',
                '.slbbddbbBs.',
                '..lbbdbbBBB.',
                '..ttt..tTT..',
                '..ttT..tTT..',
                '..ff...ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        wang.back.frames[1] = rowsWith(wang.back.frames[0], 17, ['..tt...tTT..', '..tt...ff...', '..ff........']);
        // Ma nước dựng từ khung của Lục Lang: hàng 5–11 thay tóc búi bằng tóc xoã ướt (một giọt nước dưới ngọn tóc),
        // hàng 17 rong quấn cổ chân, hai hàng chân trống; khung 2 ống quần lay như đang lơ lửng. Không bóng chân.
        var wangHair = [
            '.kkkkkkkkkk.',
            '.ksssssKkkk.',
            '.sessesSkkk.',
            '.kpssspkkkk.',
            '.ksssssk.kk.',
            '...SSSS..kk.',
            '..lwbbwBB.q.'
        ];
        var wangHairBack = [
            '.kkkkkkkkkk.',
            '.kkkkkkkkkk.',
            '.skkkkkkkkk.',
            '.kkkkkkkkkk.',
            '..kkkkkkkk..',
            '...kkkkkk...',
            '...lkkkkB...'
        ];
        var wangGhost = S['boy-ghost'];
        var wg0 = rowsWith(rowsWith(wang.frames[0], 5, wangHair), 17, ['..tgt..tTg..', ghostBlank, ghostBlank]);
        var wb0 = rowsWith(rowsWith(wang.back.frames[0], 5, wangHairBack), 17, ['..tgt..tTg..', ghostBlank, ghostBlank]);
        wangGhost.frames = [wg0, rowsWith(wg0, 16, ['...lbdbbbBBB', '...tgt..tTg.'])];
        wangGhost.blink = [7, '.sSssSsSkkk.'];
        wangGhost.walk = [0, 1];
        wangGhost.back = { frames: [wb0, rowsWith(wb0, 16, ['...lbbdbbBBB', '...tgt..tTg.'])], idle: [0, 1], walk: [0, 1] };

        // Họa Bì: khung bước như Bạch Thu Luyện; mặt sau búi cao, trâm vàng sang trái, nơ đai sau lưng.
        var huapi = S['lady-red'];
        huapi.frames[1] = rowsWith(huapi.frames[0], 17, ['..lrrrrrRRR.', '.lrrrrrRRRR.', '.fff....ff..']);
        huapi.idle = [0];
        huapi.walk = [0, 1];
        huapi.shadow = [5.5, 5];
        huapi.back = {
            frames: [[
                '.....kkk....',
                '..yykkKk....',
                '..Ykkkkkk...',
                '..kkKkkkkk..',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.skkkkkkkkk.',
                '.kkkkkkkkkk.',
                '..kkkkkkkk..',
                '...kkkkkk...',
                '....SSSS....',
                '...lwwwwR...',
                '..llrrrrRR..',
                '.lllrrrrRRR.',
                '.lyyyyyyRRR.',
                '.slrryyrrRs.',
                '..lrrrrrRRR.',
                '..lrrrrrRRR.',
                '.lrrrrrrRRRR',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        huapi.back.frames[1] = rowsWith(huapi.back.frames[0], 17, ['..lrrrrrRRR.', '.lrrrrrRRRR.', '..ff....ff..']);
        // Con yêu: tóc xổ phủ kín lưng tới thắt lưng; hai đầu cuộn da ló ra hai bên hông.
        var demon = S['demon-green'];
        demon.frames[1] = rowsWith(demon.frames[0], 17, ['..lrrrrrRRR.', '.lrrrrrRRRR.', '.fff....ff..']);
        demon.idle = [0];
        demon.walk = [0, 1];
        demon.shadow = [5.5, 5];
        demon.back = {
            frames: [[
                '..k..kk...k.',
                '..kk.kKk.k..',
                '.kkkkkkkkKk.',
                'kkkKkkkkkkkk',
                '.kKkkkkkkkkk',
                'kkkkkkkkkkk.',
                '.gkkkkkkkkkk',
                '.kkkkkkkkkk.',
                'kkkkkkkkkkkk',
                '.kkkkkkkkkk.',
                '..kkkkkkkk..',
                '..lkkkkkkR..',
                '..llkkkkRR..',
                '.lllrkkrRRR.',
                '.lyyyyyyRRR.',
                'PglrryyrrRgQ',
                '..lrrrrrRRR.',
                '..lrrrrrRRR.',
                '.lrrrrrrRRRR',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        demon.back.frames[1] = rowsWith(demon.back.frames[0], 17, ['..lrrrrrRRR.', '.lrrrrrRRRR.', '..ff....ff..']);

        // Hương Ngọc: khung bước như Bạch Thu Luyện; mặt sau bông mẫu đơn sang trái, nơ đai hồng sau lưng.
        var xiangyu = S['girl-white'];
        xiangyu.frames[1] = rowsWith(xiangyu.frames[0], 17, ['..wwwwwwWWv.', '..vwwwwwWW..', '.fff....ff..']);
        xiangyu.idle = [0];
        xiangyu.walk = [0, 1];
        xiangyu.shadow = [5.5, 5];
        xiangyu.back = {
            frames: [[
                '....kkkk....',
                '..FFkkkKk...',
                '.FFoFkkkkk..',
                '.nEFkkkkkkk.',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.skkkkkkkkk.',
                '.kkkkkkkkkk.',
                '..kkkkkkkk..',
                '...kkkkkk...',
                '....SSSS....',
                '...wvwwvW...',
                '..wwwwwwWW..',
                '.wwwwwwwWWW.',
                '.wxxxxxxWWW.',
                '.swwxXxwwWs.',
                '..wwXwXwWWW.',
                '..wwwwwwWWW.',
                '..vwwwwwWWv.',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        xiangyu.back.frames[1] = rowsWith(xiangyu.back.frames[0], 17, ['..wwwwwwWWv.', '..vwwwwwWW..', '..ff....ff..']);
        // Khóm mẫu đơn: nhìn đối xứng, không có mặt sau; idle = hai khung đung đưa.
        S['peony-white'].symmetric = true;
        S['peony-white'].shadow = [5.5, 4.5];

        // ----- đợt C phần 2: Liên Tỏa, Nhan Như Ngọc -----
        // Vòng gán idle/walk ở trên chạy khi các sprite này mới có một khung, nên gán lại đủ ở đây.
        var lien = S['girl-grey'];
        lien.frames[1] = rowsWith(lien.frames[0], 17, ['..ccccccCCC.', '..ww....ww..', '.fff....ff..']);
        lien.idle = [0];
        lien.walk = [0, 1];
        lien.shadow = [5.5, 5];
        // Mặt sau: đuôi tóc dài rủ giữa lưng tới hông, nơ đỏ buộc ở gáy, má trái ló; góc tờ giấy thơ ló bên phải màn hình.
        lien.back = {
            frames: [[
                '....kkkk....',
                '...kKKkkk...',
                '..kKkkkkkk..',
                '..kKkkkkkk..',
                '.kKkkkkkkkk.',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.skkkkkkkkk.',
                '..kkkkkkkk..',
                '...kkkkkk...',
                '....kkkk....',
                '...crRRrC...',
                '..ccrKkrCCrr',
                '.ccccKkcCCRr',
                '.cvvvKkvvCC.',
                '.scccKkccCC.',
                '..ccccKcCC..',
                '..ccccccCCC.',
                '...ww..ww...',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        lien.back.frames[1] = rowsWith(lien.back.frames[0], 17, ['..ccccccCCC.', '..ww....ww..', '..ff....ff..']);
        // Hồn ma Liên Tỏa: hai hàng chân trống, khung 2 vạt áo lay (cùng công thức hồn ma Tiểu Tạ).
        var lienGhost = S['girl-grey-ghost'];
        lienGhost.frames = [
            rowsWith(lien.frames[0], 18, [ghostBlank, ghostBlank]),
            rowsWith(lien.frames[0], 17, ['...cccccCCC.', ghostBlank, ghostBlank])
        ];
        lienGhost.blink = [lien.blink[0], lien.blink[1]];
        lienGhost.walk = [0, 1];
        lienGhost.back = {
            frames: [
                rowsWith(lien.back.frames[0], 18, [ghostBlank, ghostBlank]),
                rowsWith(lien.back.frames[0], 17, ['...cccccCCC.', ghostBlank, ghostBlank])
            ],
            idle: [0, 1],
            walk: [0, 1]
        };

        var yan = S['lady-paper'];
        yan.frames[1] = rowsWith(yan.frames[0], 17, ['..aaaaaaAAA.', '..aaaaaaAA..', '.fff....ff..']);
        yan.idle = [0];
        yan.walk = [0, 1];
        yan.shadow = [5.5, 5];
        // Mặt sau: tóc vấn, trâm ngọc sang trái màn hình, cổ áo kem sau gáy, áo khoác ngọc phủ lưng, tay áo rộng hai bên;
        // sách ôm trước ngực nên khuất.
        yan.back = {
            frames: [[
                '...kkkk.....',
                '..kKkkkk....',
                'ygkkkkkkk...',
                '.kgkkkkkkk..',
                '.kkgkkkkkkk.',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.skkkkkkkkk.',
                '..kkkkkkkk..',
                '...kkkkkk...',
                '....SSSS....',
                '...jaaaaJ...',
                '..jjjjjjJJ..',
                '.jjjjjjjJJJ.',
                'jjjggggggJJJ',
                'jjjjjjjJJJJJ',
                'gggaaaaaAggg',
                '..aaaaaaAA..',
                '..aaaaaaAAA.',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        yan.back.frames[1] = rowsWith(yan.back.frames[0], 17, ['..aaaaaaAAA.', '..aaaaaaAA..', '..ff....ff..']);

        // Người giấy: nhìn thẳng, đối xứng; lật trái/phải không đổi gì nên miễn test bất đối xứng. Đứng yên cũng phất phơ.
        S['paper-doll'].symmetric = true;
        S['paper-doll'].idle = [0, 1];
        S['paper-doll'].walk = [0, 1];
        S['paper-doll'].shadow = [5.5, 4];

        // ----- đợt D: đạo sĩ Lao Sơn, Hoa Cô Tử, Nhiếp Tiểu Thiến -----
        // Vòng gán idle/walk ở trên chạy khi các sprite này mới có một khung, nên gán lại đủ ở đây.
        // Đạo sĩ: khung bước nhấc chân trước, gậy đứng yên; mặt sau búi và trâm như mặt trước, tóc bạc phủ gáy, lưng gù rộng
        // có miếng vá, gậy sang phải màn hình.
        var taoist = S['taoist-old'];
        taoist.frames[1] = rowsWith(taoist.frames[0], 17, ['t.gggggggGGG', 't.ggggggGGG.', 'tfff....ff..']);
        taoist.idle = [0];
        taoist.walk = [0, 1];
        taoist.shadow = [5.5, 5];
        taoist.back = {
            frames: [[
                '.....HH.....',
                '...nnHHnn...',
                '....hhhhH...',
                '...hhhhhhH..',
                '..hhhhhhhHTt',
                '..hhhhhhhH.T',
                '..hhhhhhhH.t',
                '.shhhhhhhH.t',
                '..hhhhhhH..t',
                '...HhhhH...t',
                '..ggggggGG.t',
                '.gggggggGGGt',
                '.gggqQgggGst',
                '.gggqqgggGGt',
                '.gdddddddGGt',
                '.ggggggggGGt',
                '..gggggggGGt',
                '..ggggggGGGt',
                '..ggggggGG.t',
                '...ff..ff..t'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        taoist.back.frames[1] = rowsWith(taoist.back.frames[0], 17, ['..ggggggGGGt', '..ggggggGG.t', '..ff....ff.t']);
        // Hạc và hươu con: hình nghiêng sẵn (đầu bên trái) như cá trắng và ong, lật là đổi hướng; không đi, không mặt sau.
        var crane = S.crane;
        crane.symmetric = true;
        crane.idle = [0, 1];
        crane.walk = [0, 1];
        crane.shadow = [6, 3.5];
        var fawn = S.fawn;
        fawn.symmetric = true;
        fawn.idle = [0, 1];
        fawn.walk = [0, 1];
        fawn.shadow = [5.5, 4.5];
        // Hoa Cô Tử: khung bước như Tiểu Tạ; mặt sau hai búi cài lá, nơ dải nâu sau lưng, giỏ thuốc sang phải màn hình.
        var huagu = S['girl-fawn'];
        huagu.frames[1] = rowsWith(huagu.frames[0], 17, ['..cwcccwcCC.', '..vcccccCC..', '.fff....ff..']);
        huagu.idle = [0];
        huagu.walk = [0, 1];
        huagu.shadow = [5.5, 5];
        huagu.back = {
            frames: [[
                '..Ll....Ll..',
                '.kkKk..kkKk.',
                '..kKkkkkkk..',
                '..kKkkkkkk..',
                '.kKkkkkkkkk.',
                '.kkkkkkkkkk.',
                '.skkkkkkkk..',
                '..kkkkkkkk..',
                '..kkkkkkkk..',
                '...kkkkkk...',
                '....SSSS....',
                '...cwccwC...',
                '..ccccwcCC.g',
                '.cwccccccCgg',
                '.cvvvBvvvBbB',
                '.sccvBvccbBb',
                '..cwcccwcBbB',
                '..ccwcccCC..',
                '..vcccccCv..',
                '...ff..ff...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        huagu.back.frames[1] = rowsWith(huagu.back.frames[0], 17, ['..ccwcccCCC.', '..vcccccCC..', '..ff....ff..']);
        // Nhiếp Tiểu Thiến: khung bước dạng chân (như Bạch Thu Luyện); mặt sau (ảnh AI, cùng bảng màu) tóc đen dài phủ kín
        // lưng tới gối, búi tóc lụa đỏ, thỏi vàng khuất trước ngực.
        var qian = S['lady-qian'];
        qian.frames[1] = rowsWith(qian.frames[0], 17, ['..ffffgfff..', '..hh....hh..', '.kkk....kk..']);
        qian.idle = [0];
        qian.walk = [0, 1];
        qian.shadow = [5.5, 5];
        qian.back = {
            frames: [[
                '.....aa.....',
                '....abbab...',
                '....aaaa.b..',
                '...aaaaaa.b.',
                '..aaaaaaaa..',
                '..aaaaaaaa..',
                '..aaaaaaaa..',
                '.laaaaaaaal.',
                '..daaaaaad..',
                '...aaaaaa...',
                '...aaaaaa...',
                '...aaaaaa...',
                '..haaaaaah..',
                '.hhaaaaaahh.',
                '.fhaaaaaahf.',
                '..haaaaaah..',
                '..hhaaaahh..',
                '..ffffffff..',
                '...hh..hh...',
                '..kkk.kkk...'
            ]],
            idle: [0],
            walk: [0, 1]
        };
        qian.back.frames[1] = rowsWith(qian.back.frames[0], 17, ['..ffffffff..', '..hh....hh..', '.kkk....kk..']);
        // Hồn ma Tiểu Thiến: hai hàng chân trống, khung 2 vạt áo lay (cùng công thức hồn ma Liên Tỏa).
        var qianGhost = S['lady-qian-ghost'];
        qianGhost.frames = [
            rowsWith(qian.frames[0], 18, [ghostBlank, ghostBlank]),
            rowsWith(qian.frames[0], 17, ['...ffffgfff.', ghostBlank, ghostBlank])
        ];
        qianGhost.blink = [qian.blink[0], qian.blink[1]];
        qianGhost.idle = [0, 1];
        qianGhost.walk = [0, 1];
        qianGhost.back = {
            frames: [
                rowsWith(qian.back.frames[0], 18, [ghostBlank, ghostBlank]),
                rowsWith(qian.back.frames[0], 17, ['...ffffffff.', ghostBlank, ghostBlank])
            ],
            idle: [0, 1],
            walk: [0, 1]
        };
    }());

    // Bóng chân mờ: elip bán trong suốt ở hai hàng đáy (ngang mặt đất), chỉ phủ pixel còn trống.
    var SPRITE_SHADOW = u32a('#1a1420', 92);
    function spriteShadow(L, s) {
        var cx = s[0] + 1.5, rx = s[1], cy = L.h - 1, ry = 1.3;
        for (var y = L.h - 2; y < L.h; y++) {
            for (var x = 0; x < L.w; x++) {
                var nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
                if (nx * nx + ny * ny > 1 || L.px[y * L.w + x]) continue;
                L.px[y * L.w + x] = SPRITE_SHADOW;
            }
        }
    }

    // Layer của một khung dạng hàng chữ: rows[j][i] nằm ở (i + 1, j + 1) (chừa viền mực 1 px), '.' trong suốt,
    // ký tự khác tra `pal`; `shadow` ([cột tâm, bán trục]) thêm bóng chân mờ. Dùng chung cho mọi tập khung.
    function rowsLayer(rows, pal, shadow) {
        var w = 0;
        rows.forEach(function (r) { w = Math.max(w, r.length); });
        var L = new Layer(0, 0, w + 2, rows.length + 2);
        for (var j = 0; j < rows.length; j++) {
            for (var i = 0; i < rows[j].length; i++) {
                var ch = rows[j][i];
                if (ch !== '.' && pal[ch]) L.set(i + 1, j + 1, u32(pal[ch]));
            }
        }
        L.outline(C.ink);
        if (shadow) spriteShadow(L, shadow);
        return L;
    }

    // Một khung của sprite. set: 'front' (mặc định: mặt trước, chớp mắt được) | 'back' | 'fish'; tập không có → null.
    function spriteLayer(name, frame, blink, set) {
        var sp = SPRITES[name];
        if (!set || set === 'front') {
            var rows = sp.frames[frame % sp.frames.length].slice();
            if (blink && sp.blink) rows[sp.blink[0]] = sp.blink[1];
            return rowsLayer(rows, sp.pal, sp.shadow);
        }
        var S = spriteSets(name)[set];
        return S ? rowsLayer(S.frames[frame % S.frames.length], sp.pal, S.shadow) : null;
    }

    // Thay ký tự từng hàng theo map (mặt sau suy từ mặt trước); ký tự không có trong map giữ nguyên.
    function mapRows(rows, map) {
        return rows.map(function (r) {
            var out = '';
            for (var i = 0; i < r.length; i++) {
                var ch = r[i];
                out += Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
            }
            return out;
        });
    }

    // Ba tập khung của một sprite dạng hàng chữ (chưa dựng Layer), cho engine, test và ảnh xem trước:
    //  - front: mặt trước (frames, blink, idle, walk, shadow);
    //  - back: mặt sau, từ back.frames (vẽ tay, thắng map) hoặc thay ký tự từng khung mặt trước theo back.map;
    //    không chớp mắt; sprite không có back → null;
    //  - fish: tư thế câu (frames, idle, walk, anchor, tip, hand, shadow), vẽ nhìn phải; không có → null.
    // Mọi tập dùng chung pal. idle/walk của back, fish thiếu thì lấy theo mặt trước (bỏ chỉ số vượt số khung),
    // không còn gì thì mặc định; shadow thiếu thì dùng bóng mặt trước. Sprite tiêm thêm lúc chạy (test) có thể
    // thiếu idle/walk/shadow: mặt trước mặc định idle mọi khung, walk [0] như engine trước đây.
    function spriteSets(name) {
        var sp = SPRITES[name];
        if (!sp) return null;
        function every(n) {
            var r = [];
            for (var i = 0; i < n; i++) r.push(i);
            return r;
        }
        function copy(frames) {
            return frames.map(function (rows) { return rows.slice(); });
        }
        function pick(own, base, n, def) {
            if (own && own.length) return own.slice();
            var ok = (base || []).filter(function (i) { return i >= 0 && i < n; });
            return ok.length ? ok : def;
        }
        function pt(p) {
            return p && p.length >= 2 ? [p[0], p[1]] : null;
        }
        var n0 = sp.frames.length;
        var front = {
            frames: copy(sp.frames), blink: sp.blink ? sp.blink.slice() : null,
            idle: pick(sp.idle, null, n0, every(n0)), walk: pick(sp.walk, null, n0, [0]),
            shadow: sp.shadow ? sp.shadow.slice() : null, anchor: null, tip: null, hand: null
        };
        var back = null, b = sp.back;
        if (b && ((b.frames && b.frames.length) || b.map)) {
            var bf = b.frames && b.frames.length ? copy(b.frames) : sp.frames.map(function (rows) { return mapRows(rows, b.map); });
            back = {
                frames: bf, blink: null,
                idle: pick(b.idle, front.idle, bf.length, every(bf.length)),
                walk: pick(b.walk, front.walk, bf.length, bf.length > 1 ? [0, 1] : [0]),
                shadow: b.shadow ? b.shadow.slice() : front.shadow, anchor: null, tip: null, hand: null
            };
        }
        var fish = null, f = sp.fish;
        if (f && f.frames && f.frames.length) {
            var nf = f.frames.length, fidle = pick(f.idle, null, nf, every(nf));
            fish = {
                frames: copy(f.frames), blink: null, idle: fidle, walk: pick(f.walk, fidle, nf, [0]),
                shadow: f.shadow ? f.shadow.slice() : front.shadow,
                anchor: typeof f.anchor === 'number' ? f.anchor : null, tip: pt(f.tip), hand: pt(f.hand)
            };
        }
        return { front: front, back: back, fish: fish };
    }

    // Độ lệch gương của khung 0 mặt trước: so ô (j, i) với ô đối xứng (j, w − 1 − i), w là bề rộng lớn nhất của
    // khung, hàng ngắn đệm '.'. Mỗi cặp ô đối xứng lệch nhau tính 2 ô. Trả { chars, shape, eyes, feature }:
    //  - chars: số ô khác ký tự;
    //  - shape: số ô mà "trong suốt ('.') hay không" khác ô đối xứng (viền dáng);
    //  - eyes: số ô mà "là mắt 'e' hay không" khác ô đối xứng (pal không có khoá e thì 0);
    //  - feature = shape + eyes: số đo hướng nhìn. Tô sáng trái, tối phải đã làm mọi sprite lệch theo ký tự, nên
    //    chars không cho biết lật trái/phải có nhìn thấy hay không. Sprite lạ → null.
    function mirrorDiff(name) {
        var sp = SPRITES[name];
        if (!sp) return null;
        var rows = sp.frames[0], w = 0, out = { chars: 0, shape: 0, eyes: 0, feature: 0 };
        var eye = !!sp.pal && Object.prototype.hasOwnProperty.call(sp.pal, 'e');
        rows.forEach(function (r) { w = Math.max(w, r.length); });
        for (var j = 0; j < rows.length; j++) {
            for (var i = 0; i < w; i++) {
                var a = rows[j].charAt(i) || '.', b = rows[j].charAt(w - 1 - i) || '.';
                if (a !== b) out.chars++;
                if ((a === '.') !== (b === '.')) out.shape++;
                if (eye && (a === 'e') !== (b === 'e')) out.eyes++;
            }
        }
        out.feature = out.shape + out.eyes;
        return out;
    }

    // ---------- chân dung bán thân (40×40) và tranh cá (36×20) cho giao diện ----------
    // Sprite nhỏ ở trên dùng trên bản đồ; khung thoại, lời nhắc, thẻ khách dùng chân dung này.
    // Ánh sáng từ trên bên trái. Mỗi phần vẽ trên lớp riêng rồi viền một màu sẫm, cả hình viền mực.
    function u32a(hex, a) {
        return ((u32(hex) & 0xffffff) | ((a & 255) << 24)) >>> 0;
    }

    function artPal(o) {
        var r = {};
        Object.keys(o).forEach(function (k) { r[k] = u32(o[k]); });
        return r;
    }

    function artLit(nx, ny) {
        var nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        return -0.5 * nx - 0.6 * ny + 0.62 * nz;
    }

    function artStamp(L, rows, x, y, pc) {
        for (var j = 0; j < rows.length; j++) {
            for (var i = 0; i < rows[j].length; i++) {
                var ch = rows[j][i];
                if (ch !== '.' && pc[ch]) L.set(x + i, y + j, pc[ch]);
            }
        }
    }

    // Đối xứng qua trục giữa khung 40 px.
    function artMirror(pts) {
        return pts.map(function (p) { return [40 - p[0], p[1]]; });
    }

    function artSides(fn) {
        fn(1, function (p) { return p; });
        fn(-1, artMirror);
    }

    function artPart(L, draw, line) {
        var T = new Layer(0, 0, L.w, L.h);
        draw(T);
        if (line) T.outline(line);
        L.blit(T, 0, 0);
    }

    function artNorm(cx, cy, rx, ry) {
        return function (x, y) { return [(x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry]; };
    }

    var PORTRAITS = {
        // Hồ Tiểu Nguyệt: hồ ly cam, má trắng, trâm trăng khuyết, áo xanh, hai tay ôm chén trà.
        'ho-nguyet': function () {
            var pc = artPal({ D: '#5a240e', d: '#a2441b', f: '#d8672a', F: '#ee8b3f', G: '#f8b36b',
                w: '#fdf6ea', W: '#e7d2b8', p: '#f6bca4', q: '#de8d76',
                e: '#2a1812', i: '#6a3a1a', I: '#b5722e', h: '#ffffff', n: '#2a1e22', N: '#4a3a40', m: '#7a3020', s: '#f59c86',
                b: '#b6d1ea', B: '#88a8cf', t: '#4a6b9a', T: '#2f4a74', c: '#f3f7fb', C: '#c6d5e5',
                y: '#f6dc7e', Y: '#c39634', j: '#6cc3a8', k: '#d6ece2', K: '#9cc6b2', a: '#c58a3c', A: '#e2b264', u: '#5f8a76' });
            var L = new Layer(0, 0, 40, 40);
            function fur(t) { return t < 0.16 ? pc.d : t < 0.7 ? pc.f : t < 0.9 ? pc.F : pc.G; }
            // Đuôi sau lưng, chóp trắng.
            artPart(L, function (T) {
                T.ellipse(34.2, 32.4, 5.2, 8.6, function (x, y, nx, ny) {
                    if (ny < -0.46) return nx > 0.25 && ny > -0.8 ? pc.W : pc.w;
                    return fur(artLit(nx, ny));
                });
            }, pc.D);
            // Áo giao lĩnh: vạt trái đè vạt phải.
            artPart(L, function (T) {
                var N = artNorm(20, 42, 17, 13);
                T.poly([[3.4, 40], [5.2, 34.2], [9.2, 31], [15, 29.4], [25, 29.4], [30.8, 31], [34.8, 34.2], [36.6, 40]], function (x, y) {
                    var n = N(x, y), t = artLit(n[0], n[1]);
                    return t < 0.18 ? pc.t : t < 0.66 ? pc.B : pc.b;
                });
                T.poly([[15.6, 29.4], [24.4, 29.4], [20.2, 35]], function (x) { return x > 20 ? pc.C : pc.c; });
                T.line(15, 29, 20.6, 35.6, pc.T);
                T.line(25, 29, 16.6, 39.6, pc.T);
                T.line(24, 29, 15.8, 39.6, pc.t);
                [[8, 35], [11, 32], [30, 34], [33, 37], [6, 38], [28, 31]].forEach(function (p) { T.set(p[0], p[1], pc.b); });
            }, pc.T);
            // Lông cổ.
            artPart(L, function (T) {
                T.poly([[12.4, 26.6], [14.4, 30], [16.6, 28.8], [18.4, 31], [20, 29.2], [21.6, 31], [23.4, 28.8], [25.6, 30], [27.6, 26.6]],
                    function (x) { return x > 22 ? pc.W : pc.w; });
            });
            // Tai.
            artSides(function (s, m) {
                artPart(L, function (T) {
                    T.poly(m([[7.4, 14.6], [9.4, 2.4], [17.8, 9]]), function (x, y) { return y < 5 ? pc.D : y < 7 ? pc.d : (s > 0 ? pc.F : pc.f); });
                }, pc.D);
                L.poly(m([[10.2, 12.2], [10.8, 5.8], [15.4, 9.8]]), function (x, y) { return y < 7.5 ? pc.q : pc.p; });
                L.poly(m([[10.4, 12.6], [11.2, 10], [13.4, 11.4]]), pc.w);
            });
            // Đầu, má trắng, mõm trắng, chỏm lông trán.
            artPart(L, function (T) {
                T.ellipse(20, 18.6, 12.6, 10.4, function (x, y, nx, ny) { return fur(artLit(nx, ny)); });
                artSides(function (s, m) {
                    T.poly(m([[9.4, 18.6], [4.4, 25], [8.2, 24.2], [7, 27.8], [13, 26.6]]), s > 0 ? pc.w : pc.W);
                });
                T.poly([[8.6, 21], [12.2, 20.8], [15.6, 21.4], [18, 20], [22, 20], [24.4, 21.4], [27.8, 20.8], [31.4, 21], [29.6, 25.2],
                    [25, 28.2], [20, 29], [15, 28.2], [10.4, 25.2]], function (x, y) { return x > 24 && y > 22 ? pc.W : pc.w; });
                T.poly([[15.4, 9.8], [17.4, 7.2], [18.8, 9.2], [20.6, 6.6], [22.4, 9.2], [24.8, 9.8], [20, 11.2]], function (x) { return x < 21 ? pc.G : pc.F; });
            }, pc.D);
            var eye = ['.eee.', 'ehhie', 'ehiie', 'eiIIe', 'eIIIe', '.eee.'];
            artStamp(L, eye, 12, 15, pc);
            artStamp(L, eye, 23, 15, pc);
            artStamp(L, ['e', 'e'], 11, 14, pc);
            artStamp(L, ['e', 'e'], 28, 14, pc);
            artStamp(L, ['Nnnn', '.nn.'], 18, 22, pc);
            artStamp(L, ['m.mm.m', '.m..m.'], 17, 24, pc);
            artStamp(L, ['ss'], 11, 22, pc);
            artStamp(L, ['ss'], 27, 22, pc);
            // Trâm trăng khuyết, giọt ngọc.
            artStamp(L, ['.yyy.', 'yyY..', 'yY...', 'yyY..', '.yyy.', '...Y.', '...j.', '...j.'], 25, 6, pc);
            // Tay áo, tay và chén trà.
            artPart(L, function (T) {
                artSides(function (s, m) {
                    T.poly(m([[4.6, 40], [7, 35.4], [11.6, 33.8], [15.4, 36], [15.4, 40]]), function (x, y) { return y < 36 ? pc.b : pc.B; });
                    T.poly(m([[11, 34.8], [13.2, 33.4], [14.6, 34.6], [13.2, 37.6], [11.2, 37.4]]), pc.c);
                });
            }, pc.T);
            artPart(L, function (T) {
                artStamp(T, ['FFF', 'FFG', 'fFF', 'ff.'], 14, 34, pc);
                artStamp(T, ['FFF', 'FFF', 'FFf', '.ff'], 23, 34, pc);
            }, pc.d);
            artPart(L, function (T) {
                artStamp(T, ['.kkkkkk.', 'kaAaaaak', 'kkkkkkkK', '.kkkkkK.', '.KkkkKK.', '..KKKK..'], 16, 33, pc);
            }, pc.u);
            L.outline(C.ink);
            return L;
        },
        // Lão Quy: rùa già mai lục giác, mày bạc rủ, kính tròn, râu dài, khăn xanh, ôm cuộn thẻ tre.
        'lao-quy': function () {
            var pc = artPal({ H: '#29421f', G: '#52733a', g: '#789a4e', x: '#9fba6e', X: '#bfd28c',
                s: '#dcd39a', S: '#b8ae72', z: '#8e8550', Z: '#5f5a34',
                W: '#f8f5ee', w: '#ded7c8', v: '#b6ac98',
                q: '#3d2c12', Q: '#7d5c22', l: '#ffffff', L: '#ecebc6',
                e: '#211b21', h: '#ffffff', m: '#7a6a3a',
                b: '#5675a8', B: '#3a5582', a: '#86a2cc', A: '#22355a',
                o: '#ead08e', O: '#b88f46', k: '#d9bb74', c: '#8a6a32', r: '#a8382a', R: '#5e4320', y: '#dccb8e', Y: '#b7a265' });
            var L = new Layer(0, 0, 40, 40);
            // Mai: mỗi pixel thuộc ô gần nhất của lưới lục giác; đường nối sẫm, giữa ô nổi sáng.
            var cells = [];
            [[17, [8, 20, 32]], [25.6, [2, 14, 26, 38]], [34.2, [8, 20, 32]], [8.4, [14, 26]]].forEach(function (r) {
                r[1].forEach(function (x) { cells.push([x, r[0]]); });
            });
            artPart(L, function (T) {
                T.ellipse(20, 28, 19.4, 16.6, function (x, y, nx, ny) {
                    var d1 = 1e9, d2 = 1e9;
                    cells.forEach(function (c) {
                        var d = Math.hypot(x + 0.5 - c[0], (y + 0.5 - c[1]) * 1.15);
                        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
                    });
                    if (d2 - d1 < 1.1) return pc.H;
                    var t = artLit(nx, ny);
                    if (d1 < 2.2 && t > 0.2) return pc.X;
                    return t < 0.14 ? pc.G : t < 0.62 ? pc.g : pc.x;
                });
            }, pc.H);
            // Yếm bụng.
            artPart(L, function (T) {
                T.ellipse(20, 41, 10, 10.6, function (x, y, nx) { return (y === 33 || y === 37 || nx > 0.5) ? pc.Y : pc.y; });
            }, pc.Z);
            // Khăn quàng.
            artPart(L, function (T) {
                T.poly([[9.6, 26.8], [30.4, 26.8], [31.4, 30.6], [8.6, 30.6]], function (x, y) {
                    if (y >= 29) return pc.B;
                    return ((x + y) % 4 === 0) ? pc.a : pc.b;
                });
            }, pc.A);
            // Đầu to tròn, chỏm vảy.
            artPart(L, function (T) {
                T.ellipse(20, 18.2, 11.2, 9.8, function (x, y, nx, ny) {
                    var t = artLit(nx, ny);
                    if (ny < -0.62 && ((x + 2 * y) % 5 === 0)) return pc.z;
                    return t < 0.2 ? pc.z : t < 0.7 ? pc.S : pc.s;
                });
            }, pc.Z);
            // Cuộn thẻ tre ôm ngang trước ngực.
            artPart(L, function (T) {
                T.rect(9, 33, 22, 5, function (x, y) {
                    if (x === 13 || x === 26) return pc.r;
                    if (y === 33) return pc.o;
                    if (y === 37) return pc.O;
                    return x % 2 ? pc.o : pc.k;
                });
                artStamp(T, ['.cc', 'cOc', 'cOc', 'cOc', '.cc'], 7, 33, pc);
                artStamp(T, ['cc.', 'cOc', 'cOc', 'cOc', 'cc.'], 30, 33, pc);
            }, pc.R);
            artSides(function (s, m) {
                artPart(L, function (T) {
                    T.poly(m([[4.6, 40], [6.2, 33.4], [9.6, 31], [12.6, 33.2], [12.4, 36.8], [10, 38.4], [8.6, 40]]), function (x, y) {
                        if ((x * 3 + y * 5) % 9 === 0) return pc.z;
                        return s > 0 && y < 34 ? pc.s : pc.S;
                    });
                }, pc.Z);
            });
            // Râu dài phủ lên cuộn tre, ria mép.
            artPart(L, function (T) {
                T.poly([[15.6, 25], [24.4, 25], [23.8, 29], [22.4, 32], [20, 35], [17.6, 32], [16.2, 29]], function (x, y) {
                    if (x >= 22 || (x === 18 && y > 28) || (x === 21 && y > 30)) return pc.w;
                    return pc.W;
                });
                T.poly([[13.4, 25.6], [16.8, 23.8], [20, 24.6], [23.2, 23.8], [26.6, 25.6], [24.6, 26.8], [20, 26], [15.4, 26.8]],
                    function (x) { return x > 22 ? pc.w : pc.W; });
            }, pc.v);
            // Mắt hiền sau cặp kính tròn.
            artStamp(L, ['mmm', '.he', '.ee'], 14, 18, pc);
            artStamp(L, ['mmm', 'he.', 'ee.'], 23, 18, pc);
            function rim(cx, cy) {
                for (var y = Math.floor(cy - 4); y <= cy + 4; y++) {
                    for (var x = Math.floor(cx - 4); x <= cx + 4; x++) {
                        var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), cur = L.get(x, y);
                        if (d <= 3.7 && d >= 2.75) L.set(x, y, y + 0.5 > cy + 1 ? pc.q : pc.Q);
                        else if (d < 2.75 && cur !== pc.e && cur !== pc.h && cur !== pc.m) L.set(x, y, pc.L);
                    }
                }
            }
            rim(16, 19.6);
            rim(24, 19.6);
            artStamp(L, ['QQ'], 19, 19, pc);
            L.set(14, 21, pc.l);
            L.set(22, 21, pc.l);
            L.set(18, 23, pc.Z);
            L.set(21, 23, pc.Z);
            // Mày bạc rủ quá mặt.
            artSides(function (s, m) {
                artPart(L, function (T) {
                    T.poly(m([[17.6, 13.4], [18.6, 15.2], [15.6, 15.6], [11.6, 17.4], [6.8, 18.8], [8.2, 15.8], [12, 13.8]]),
                        function (x, y) { return y > 16 ? pc.w : pc.W; });
                }, pc.v);
            });
            L.outline(C.ink);
            return L;
        },
        // Tiểu Mặc: mèo đen lông xù, mắt hổ phách, khăn đỏ, liếm mép, cầm xương cá.
        'tieu-mac': function () {
            var pc = artPal({ k: '#221d29', K: '#36304a', h: '#544c6c', H: '#776f92',
                y: '#f6cf4c', Y: '#d99628', e: '#120e16', w: '#ffffff', p: '#f2a2b6', P: '#cf7690', t: '#ea6a86',
                r: '#d8432f', R: '#97291f', o: '#f2775a', O: '#5c1812', g: '#bdb7cc', b: '#f1ebdd', B: '#c4b9a5', u: '#6d6455' });
            var L = new Layer(0, 0, 40, 40);
            function fur(t) { return t < 0.55 ? pc.k : t < 0.8 ? pc.K : t < 0.93 ? pc.h : pc.H; }
            artPart(L, function (T) {
                var N = artNorm(20, 42, 15, 13);
                T.poly([[6, 40], [8, 33], [12.6, 29.4], [27.4, 29.4], [32, 33], [34, 40]], function (x, y) {
                    var n = N(x, y);
                    return fur(artLit(n[0], n[1]) - 0.08);
                });
            }, pc.K);
            artSides(function (s, m) {
                artPart(L, function (T) {
                    T.poly(m([[6.6, 14], [7.8, 2], [17, 9]]), function (x, y) { return s > 0 && y < 8 ? pc.K : pc.k; });
                });
                L.poly(m([[9, 11.6], [9.2, 5.4], [14.2, 9.6]]), function (x, y) { return y < 8 ? pc.P : pc.p; });
            });
            // Đầu, má xù.
            artPart(L, function (T) {
                T.ellipse(20, 19.2, 13, 11, function (x, y, nx, ny) { return fur(artLit(nx, ny)); });
                artSides(function (s, m) {
                    T.poly(m([[8.4, 17.6], [4, 21.6], [7.2, 22.2], [4.6, 25.8], [8.4, 25.2], [7.4, 28.4], [12.4, 27]]), s > 0 ? pc.K : pc.k);
                });
                T.poly([[15, 9.4], [17, 6.6], [18.6, 8.8], [20.6, 6.2], [22.2, 8.6], [25, 9.4], [20, 10.6]], pc.h);
            });
            // Mắt hổ phách, con ngươi dọc.
            var eye = ['..yy..', '.wyyy.', 'ywyeyy', 'yyyeyy', 'yyyeyy', '.YYeY.', '..YY..'];
            artStamp(L, eye, 11, 14, pc);
            artStamp(L, eye, 23, 14, pc);
            artStamp(L, ['pp', 'PP'], 19, 22, pc);
            artStamp(L, ['h.hh.h', '.h..h.'], 17, 24, pc);
            artStamp(L, ['tt', 'tt'], 20, 25, pc);
            // Khăn đỏ thắt nút.
            artPart(L, function (T) {
                T.poly([[11, 27.6], [29, 27.6], [28.4, 30.4], [11.6, 30.4]], function (x, y) { return y > 29 ? pc.R : pc.r; });
                T.poly([[14, 30], [26, 30], [20.2, 37.6]], function (x, y) { return x > 21 ? pc.R : (x < 17 && y < 32 ? pc.o : pc.r); });
                artStamp(T, ['.RR.', 'RrrR', '.RR.'], 18, 28, pc);
            }, pc.O);
            // Xương cá trong tay.
            artPart(L, function (T) {
                artStamp(T, ['b.b.b.b...', 'bbbbbbbbbB', 'b.b.b.b...'], 6, 34, pc);
                artStamp(T, ['.b', 'bb', '.b'], 16, 34, pc);
            }, pc.u);
            artPart(L, function (T) {
                artStamp(T, ['.kkk.', 'kKkkk', 'kkkkk', '.kkk.'], 13, 35, pc);
            }, pc.K);
            L.outline(C.ink);
            // Ria vẽ sau viền để giữ nét mảnh: trên lông thì xám nhạt, ra ngoài thì mực.
            artSides(function (s) {
                [[9, 23, 2, 22], [9, 24.5, 2, 25.5]].forEach(function (q) {
                    var x0 = s > 0 ? q[0] : 39 - q[0], x1 = s > 0 ? q[2] : 39 - q[2];
                    L.line(x0, q[1], x1, q[3], function (x, y) { var v = L.get(x, y); return v && v !== C.ink ? pc.g : C.ink; });
                });
            });
            return L;
        },
        // Tiểu Ly: lửng con mặt nạ sẫm, lá trên đầu, cười nhe răng, cầm mảnh giấy viết chữ, đuôi khoang.
        'tieu-ly': function () {
            var pc = artPal({ d: '#5b412e', b: '#8a6446', B: '#ad845a', c: '#c9a272',
                m: '#3b2c25', M: '#271c17', w: '#efe2c4', W: '#d5c09a',
                e: '#15111a', h: '#ffffff', E: '#7a5a42', n: '#2a2026', N: '#5a4a50', t: '#fbf7ee', o: '#b8472c',
                l: '#7cad52', L: '#3f6a2c', j: '#a9d27a', s: '#e8a08a', p: '#fbf6e9', P: '#d9cfb8', i: '#2a2430', r: '#c0392b', u: '#8f8572' });
            var L = new Layer(0, 0, 40, 40);
            function fur(t) { return t < 0.16 ? pc.d : t < 0.68 ? pc.b : t < 0.9 ? pc.B : pc.c; }
            artPart(L, function (T) {
                T.ellipse(33.6, 30, 4.6, 9, function (x, y, nx, ny) { return (Math.floor((y + 1) / 3) % 2) ? pc.m : fur(artLit(nx, ny)); });
            }, pc.M);
            artPart(L, function (T) {
                var N = artNorm(20, 42, 15, 13);
                T.poly([[6, 40], [8, 33], [12.6, 29.2], [27.4, 29.2], [32, 33], [34, 40]], function (x, y) {
                    var n = N(x, y);
                    return fur(artLit(n[0], n[1]));
                });
                T.ellipse(20, 39, 7.4, 7, function (x, y, nx) { return nx > 0.4 ? pc.W : pc.w; });
            }, pc.d);
            artSides(function (s, m) {
                artPart(L, function (T) {
                    var c = m([[10.4, 9.6]])[0];
                    T.ellipse(c[0], c[1], 3.8, 3.6, function (x, y, nx, ny) { return Math.hypot(nx, ny) < 0.55 ? pc.M : pc.m; });
                });
            });
            // Đầu, mặt nạ quanh mắt, mõm và mày kem.
            artPart(L, function (T) {
                T.ellipse(20, 19.4, 12.6, 10.6, function (x, y, nx, ny) { return fur(artLit(nx, ny)); });
                artSides(function (s, m) {
                    T.poly(m([[8.6, 19.4], [5, 24.4], [8.8, 23.8], [8.4, 27], [12.4, 25.6]]), s > 0 ? pc.b : pc.d);
                    T.poly(m([[9.4, 16.6], [14.6, 14.4], [18.2, 17.4], [17.4, 21.6], [13.6, 24.8], [9, 22.4]]), pc.m);
                });
                T.ellipse(20, 23.8, 6.8, 4.6, function (x, y, nx) { return nx > 0.45 ? pc.W : pc.w; });
                T.poly([[18, 15], [22, 15], [21.4, 21], [18.6, 21]], pc.w);
                artSides(function (s, m) { T.poly(m([[11, 13.6], [14.6, 12.4], [16, 13.6], [12, 14.8]]), pc.w); });
            }, pc.d);
            var eye = ['.ee.', 'ehee', 'eeee', '.ee.'];
            artStamp(L, eye, 13, 17, pc);
            artStamp(L, eye, 23, 17, pc);
            L.set(12, 18, pc.E);
            L.set(27, 18, pc.E);
            artStamp(L, ['.Nn.', 'nnnn', '.nn.'], 18, 20, pc);
            artStamp(L, ['n......n', '.nooootn', '..nnnn..'], 16, 24, pc);
            artStamp(L, ['ss'], 11, 23, pc);
            artStamp(L, ['ss'], 27, 23, pc);
            // Lá trên đầu.
            artPart(L, function (T) {
                T.poly([[17.6, 9.4], [20.8, 1.6], [24.8, 5.8]], function (x, y) { return x + y < 27 ? pc.j : pc.l; });
                T.line(18, 9, 22, 4, pc.L);
                T.line(18, 10, 17, 11, pc.L);
            }, pc.L);
            // Mảnh giấy có chữ viết nguệch ngoạc.
            artPart(L, function (T) {
                T.rect(14, 31, 8, 7, function (x, y) { return x > 20 || y > 36 ? pc.P : pc.p; });
                T.line(16, 33, 19, 33, pc.i);
                T.line(17, 32, 17, 36, pc.i);
                T.line(16, 35, 19, 34, pc.i);
                T.set(20, 32, pc.r);
            }, pc.u);
            artPart(L, function (T) {
                artStamp(T, ['.bb', 'bBb', 'bbb', '.b.'], 11, 32, pc);
                artStamp(T, ['bb.', 'bBb', 'bbb', '.b.'], 22, 33, pc);
            }, pc.d);
            L.outline(C.ink);
            return L;
        },
        // ----- khách đêm: hình người (toàn thân, xem nightGirl) và hình thật (khoá `id:true`) -----
        // Bạch Thu Luyện: áo trắng, tóc đen ướt xoã dài nhỏ nước xuống ván cầu. Chi tiết lệch: vảy bạc ở cổ tay
        // phải (bên phải tranh), lộ dưới miệng tay áo.
        bach: function () {
            var pc = artPal({ g: '#a8875f', G: '#917252', j: '#6c5539',
                s: '#f7e6da', S: '#e2c6b6', r: '#b08a7c', q: '#f0b4ae',
                e: '#1d2233', h: '#ffffff', i: '#4f6b8f', m: '#c98884',
                k: '#1b2030', K: '#2c3448', H: '#6a7f9e', D: '#0f121c',
                a: '#fbf9f3', b: '#e6e8ec', c: '#c3cad5', d: '#8d97a8', w: '#ffffff', x: '#a9c3d8',
                y: '#a9cde2', Y: '#7fa9c6', f: '#d8dee6', F: '#8c97a6', t: '#7f98b8', V: '#f2f8ff', u: '#a8d4ec' });
            pc.v = NIGHT_ART.scale;
            return nightGirl(pc, {
                // Ván cầu: tấm ván ngang ba hàng pixel, khe sẫm, đầu ván so le.
                tex: function (x, y) {
                    var row = Math.floor((y - 31) / 3);
                    if ((y - 31) % 3 === 2) return pc.j;
                    if ((x + ((row & 1) ? 7 : 0)) % 14 === 0) return pc.j;
                    return hash2(x, y, 301) < 0.14 ? pc.G : ((row & 1) ? pc.G : pc.g);
                },
                shadow: true,
                back: function (T) {
                    T.poly([[11, 8.6], [29, 8.6], [30.6, 18], [30, 30.2], [27.2, 32], [12.8, 32], [10, 30.2], [9.4, 18]], function (x, y) {
                        if (y > 12 && (x * 5 + Math.floor(y / 6)) % 7 === 0) return pc.H;
                        return x < 20 ? pc.K : pc.k;
                    });
                },
                front: hairParted(pc),
                mouth: ['mm'],
                extra: function (B) {
                    // Cổ tay phải lộ ra dưới miệng tay áo: da trắng, vảy bạc xếp lớp, một đốm lấp lánh.
                    artStamp(B, ['.ss.', 'svvs', 'vtvV', 'svvs', '.ss.'], 26, 25, pc);
                    // Trâm ngọc trắng trên tóc.
                    artStamp(B, ['VV', '.V'], 24, 3, pc);
                },
                post: function (L) {
                    [[10, 32], [10, 34], [29, 33], [30, 35], [12, 37]].forEach(function (p) { L.set(p[0], p[1], pc.u); });
                }
            });
        },
        // Tiểu Tạ: búi tóc đôi buộc dải hồng, áo xanh rất nhạt, cười nhe, cầm bút lông; sàn ván Tàng Kinh Các có
        // cuộn kinh rơi. Chi tiết lệch: không có bóng dưới chân.
        ta: function () {
            return taPortrait(false);
        },
        // Lục Y Nữ: áo xanh lục eo thắt nhỏ, búi tóc cao cài trâm vàng, miệng hé đang hát, đứng trên chiếu cói
        // Thư trai. Chi tiết lệch: hai vệt cánh mờ sau vai phải (bên phải tranh).
        luc: function () {
            var pc = artPal({ g: '#cbb57e', G: '#b09a64', j: '#6e5c38',
                s: '#f6e2d0', S: '#e2c4ac', r: '#b48c74', q: '#efaaa4',
                e: '#262a22', h: '#ffffff', i: '#4f7a4a', m: '#b8606a',
                k: '#252a20', K: '#3c4434', H: '#69745a', D: '#151a12',
                a: '#94cf7c', b: '#5fa75c', c: '#3f8248', d: '#24502c', w: '#f0f6e6', x: '#2f6a3a',
                y: '#e8c75a', Y: '#bd9a34', f: '#4a5a3a', F: '#2c3624' });
            return nightGirl(pc, {
                // Chiếu cói: nan đan chéo hai màu.
                tex: function (x, y) {
                    var u = Math.floor((x + y) / 2), v = Math.floor((x - y + 40) / 2);
                    if ((u + v) % 2 === 0) return (x + y) % 2 ? pc.G : pc.g;
                    return (x - y) % 2 ? pc.g : pc.G;
                },
                shadow: true,
                waist: 3.6,
                back: function (T) {
                    T.ellipse(20, 10.8, 8.7, 8.1, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
                    T.ellipse(20, 2.8, 4, 2.7, function (x, y, nx, ny) { return artLit(nx, ny) > 0.4 ? pc.H : pc.K; });
                    T.poly([[11.6, 11], [12.8, 11], [12.6, 18.6], [11.4, 16.4]], pc.k);
                },
                front: function (T) {
                    // Mái lệch sang phải, để lộ trán bên trái; trâm vàng cài chéo qua búi.
                    T.poly([[11.6, 12], [12, 6.6], [15, 3.6], [20, 2.8], [25, 3.6], [28, 6.6], [28.4, 12.4], [27, 9.8], [24.8, 7.6],
                        [21.8, 6.4], [18.4, 6.2], [15.6, 7.2], [13.4, 9]], function (x, y) {
                        if (y < 5 && x > 14 && x < 18) return pc.H;
                        return x < 20 ? pc.K : pc.k;
                    });
                    T.line(22.4, 1.4, 27.4, 4.2, pc.y);
                    T.set(28, 4, pc.Y);
                    T.set(27, 5, pc.Y);
                },
                mouth: ['mm', 'mm'],
                post: function (L) {
                    // Hai vệt cánh sau vai phải: chỉ tô chỗ còn trống (nằm sau người), trong suốt, có gân giữa.
                    function wing(cx, cy, ra, rb, ang) {
                        var ca = Math.cos(ang), sa = Math.sin(ang);
                        for (var y = Math.floor(cy - ra - 1); y <= cy + ra + 1; y++) {
                            for (var x = Math.floor(cx - ra - 1); x <= cx + ra + 1; x++) {
                                var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
                                var u = (dx * ca + dy * sa) / ra, v = (-dx * sa + dy * ca) / rb;
                                var d = u * u + v * v;
                                if (d > 1 || L.get(x, y)) continue;
                                L.set(x, y, (d > 0.6 || Math.abs(v) < 0.2) ? NIGHT_ART.wingEdge : NIGHT_ART.wing);
                            }
                        }
                    }
                    wing(32.6, 11.6, 7.2, 2.2, -0.86);
                    wing(32.4, 17.2, 5, 1.7, -0.42);
                }
            });
        },
        // Hình thật của Bạch Thu Luyện: cá trắng lượn trong nước hồ đêm, trăng in mặt nước, lá sen góc dưới.
        'bach:true': function () {
            var pc = artPal({ W0: '#0e2a36', W1: '#15394a', W2: '#1e4c5e', W3: '#2a6273', M: '#cfe3e6', m: '#8fb6bf',
                l: '#3f6a3a', L: '#5b8a4a', o: '#2a4a28', p: '#e9a6bb', P: '#c46f8c' });
            var L = new Layer(0, 0, 40, 40);
            L.poly([[1, 10.6], [2.6, 5.4], [7.4, 2.4], [32.6, 2.4], [37.4, 5.4], [39, 10.6], [39, 40], [1, 40]], function (x, y) {
                var t = y / 40 + (vnoise(x * 0.3, y * 0.5, 311) - 0.5) * 0.16;
                return t < 0.28 ? pc.W3 : t < 0.52 ? pc.W2 : t < 0.78 ? pc.W1 : pc.W0;
            });
            L.ellipse(29, 7.4, 4.6, 2, function (x, y) { return (y % 2 === 0 || dith(x, y) < 0.5) ? pc.M : pc.m; });
            // Gợn sóng: nửa trên của vòng elip mảnh.
            [[8, 10, 3.4], [33, 31, 3], [21, 34.6, 4.4]].forEach(function (r) {
                for (var a = 0; a < 18; a++) {
                    var ang = Math.PI + a / 17 * Math.PI;
                    L.set(Math.round(r[0] + Math.cos(ang) * r[2] * 1.6), Math.round(r[1] + Math.sin(ang) * r[2] * 0.6), pc.m);
                }
            });
            // Lá sen khuyết một góc và một nụ hồng ở góc dưới trái.
            L.ellipse(8, 34.8, 6.2, 3.3, function (x, y, nx, ny) {
                if (nx > 0.2 && ny < -0.1 && nx < 0.7) return 0;
                return nx * nx + ny * ny > 0.7 ? pc.o : (ny < 0 ? pc.L : pc.l);
            });
            artStamp(L, ['.p.', 'pPp', '.P.'], 13, 30, pc);
            L.blit(fishLayer('bach'), 2, 11);
            L.outline(C.ink);
            return L;
        },
        // Hình thật của Tiểu Tạ: cùng dáng, trong suốt, lạnh màu, không chân, không bóng; sương thay đôi chân.
        'ta:true': function () {
            return taPortrait(true);
        },
        // Hình thật của Lục Y Nữ: con ong xanh đậu trên tờ giấy, chân dính mực để lại vệt chấm phía sau.
        'luc:true': function () {
            var pc = artPal({ p: '#f6efdc', P: '#e6dcc0', q: '#bcae88', n: '#1e1a18',
                k: '#1c2a20', g: '#58b46e', G: '#33814e', y: '#cbe98a', Y: '#9fc95e', e: '#0c1410', E: '#5fa07a', h: '#f4fff4' });
            var L = new Layer(0, 0, 40, 40);
            artPart(L, function (T) {
                T.poly([[2.6, 8.4], [33, 4.4], [37.8, 9.4], [38.6, 38.8], [4.2, 39.6]], function (x, y) {
                    if (hash2(x, y, 321) < 0.08) return pc.P;
                    return x + y > 62 ? pc.P : pc.p;
                });
                T.poly([[33, 4.4], [37.8, 9.4], [33.6, 9.2]], pc.q);
            }, pc.q);
            [[6, 35], [8, 34], [7, 32], [9, 31], [8, 29], [10, 28], [12, 28], [11, 26], [13, 25]].forEach(function (p, i) {
                L.set(p[0], p[1], pc.n);
                if (i % 3 === 0) L.set(p[0] + 1, p[1], pc.n);
            });
            var B = new Layer(0, 0, 40, 40);
            // Chân và râu (mực), vẽ trước để thân đè lên gốc chân.
            artPart(B, function (T) {
                T.line(17, 24, 14.6, 28.4, pc.n);
                T.line(19.6, 25, 18.8, 29.2, pc.n);
                T.line(22.2, 25, 24, 28.8, pc.n);
                T.line(12.6, 18.6, 10.4, 14.6, pc.n);
                T.line(10.4, 14.6, 8.6, 14.2, pc.n);
                T.line(14.4, 18.2, 13.4, 14, pc.n);
                T.line(13.4, 14, 11.8, 13.2, pc.n);
            });
            artPart(B, function (T) {
                // Bụng sọc: dải sẫm, xanh, vàng chanh luân phiên; ngòi ở đuôi.
                T.ellipse(27.6, 23.4, 7.2, 5.2, function (x, y, nx, ny) {
                    var band = Math.floor((x - 21) / 2.6);
                    var t = artLit(nx, ny);
                    if (band % 3 === 0) return pc.k;
                    if (band % 3 === 1) return t > 0.5 ? pc.y : pc.Y;
                    return t > 0.45 ? pc.g : pc.G;
                });
                T.line(34.8, 23.6, 36.4, 24.4, pc.k);
            }, pc.k);
            artPart(B, function (T) {
                T.ellipse(19.6, 21.6, 4.4, 4.2, function (x, y, nx, ny) {
                    var t = artLit(nx, ny) + (hash2(x, y, 331) - 0.5) * 0.3;
                    return t > 0.5 ? pc.g : pc.G;
                });
            }, pc.k);
            artPart(B, function (T) {
                T.ellipse(13.6, 21.4, 3.6, 3.4, pc.k);
                T.ellipse(12.8, 20.6, 2, 2.4, function (x, y, nx, ny) { return ny < -0.3 && nx < 0.2 ? pc.E : pc.e; });
                T.set(12, 19, pc.h);
            }, pc.e);
            B.outline(C.ink);
            L.blit(B, 0, 0);
            // Cánh trong suốt xếp trên lưng, vẽ sau cùng để trộn lên thân và giấy.
            var Wg = new Layer(0, 0, 40, 40);
            function wing(cx, cy, ra, rb, ang) {
                var ca = Math.cos(ang), sa = Math.sin(ang);
                for (var y = Math.floor(cy - ra - 1); y <= cy + ra + 1; y++) {
                    for (var x = Math.floor(cx - ra - 1); x <= cx + ra + 1; x++) {
                        var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
                        var u = (dx * ca + dy * sa) / ra, v = (-dx * sa + dy * ca) / rb;
                        var d = u * u + v * v;
                        if (d > 1) continue;
                        Wg.set(x, y, (d > 0.6 || Math.abs(v) < 0.2) ? NIGHT_ART.wingEdge : NIGHT_ART.wing);
                    }
                }
            }
            wing(24, 15.2, 7, 2.8, -0.38);
            wing(28.6, 16.8, 5.6, 2.3, -0.16);
            L.blit(Wg, 0, 0);
            return L;
        },
        // ----- khách đêm đợt C (mặt người vẽ bằng nightFace) -----
        // Vương Lục Lang: chàng trai áo ngắn xanh lam xám, tóc rối, mặt hiền, đứng trên cầu ván giữa Hồ sen. Chi tiết
        // lệch: lọn tóc mai và vai áo bên phải tranh nhỏ nước tong tỏng dù trời không mưa.
        wang: function () {
            return wangPortrait(false);
        },
        // Hình thật của Vương Lục Lang: ma nước hiền lành, da xanh tái, tóc xoã ướt, rong quấn cổ chân, không có chân,
        // lơ lửng trên mặt hồ đêm.
        'wang:true': function () {
            return wangPortrait(true);
        },
        // Họa Bì: mỹ nữ áo đỏ mặt phấn trên sân đá Sơn môn. Chi tiết lệch: mép da ở cằm trái tranh cong lên như giấy.
        huapi: function () {
            return huapiPortrait(false);
        },
        // Hình thật của Họa Bì: mặt xanh, răng cưa, tóc xổ tung, hai tay cầm cuộn da vừa lột.
        'huapi:true': function () {
            return huapiPortrait(true);
        },
        // Hương Ngọc: cô gái áo trắng ngà đai hồng, búi tóc cài một bông mẫu đơn trắng, cười tươi, đứng trên luống đất
        // Vườn rau. Chi tiết lệch: một cánh hoa trắng mọc ra từ chân tóc ở thái dương trái tranh (không phải hoa cài).
        xiangyu: function () {
            var pc = artPal({ g: '#7c5c40', G: '#664a32', j: '#3e2c1e', l: '#6f9a48', L: '#4e7a36',
                s: '#fbece2', S: '#ecd2c4', r: '#c09c8c', q: '#f6b4b8',
                e: '#3a2a2e', h: '#ffffff', i: '#7a4a38', I: '#ad7652', m: '#d0707a', n: '#3a2a2e',
                k: '#2e2224', K: '#463438', H: '#7a6068', D: '#1c1416',
                a: '#fffaf0', b: '#f2e9d6', c: '#dacdb2', d: '#a8977a', w: '#ffffff', x: '#e9b8c2',
                y: '#f4bcc8', Y: '#d88c9e', f: '#eaa8b4', F: '#b87888',
                p: '#fdfcf6', P: '#e0ded4', o: '#f2c94c', O: '#cf9a2c', u: '#4f8a42', U: '#2e5a2c' });
            return nightGirl(pc, {
                // Luống đất vườn: vồng đất nâu chạy ngang, rãnh sẫm, vài khóm cỏ non.
                tex: function (x, y) {
                    var v = (y - 31) % 4;
                    if (v === 3) return pc.j;
                    if (v === 0 && hash2(x, y, 381) < 0.5) return pc.g;
                    return hash2(x, y, 382) < 0.16 ? pc.g : pc.G;
                },
                floor: function (L) {
                    [[5, 34], [33, 35], [9, 38], [30, 38]].forEach(function (p) {
                        artStamp(L, ['l.l', '.L.'], p[0], p[1], pc);
                    });
                },
                shadow: true,
                back: function (T) {
                    // Tóc dài sau lưng, búi tròn lệch phải trên đỉnh.
                    T.ellipse(20, 11.2, 9, 8.6, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
                    T.poly([[12, 14], [28, 14], [28.8, 22.4], [26.6, 24], [13.4, 24], [11.2, 22.4]], function (x) { return x < 20 ? pc.K : pc.k; });
                    T.ellipse(24.4, 3.4, 4.2, 3, function (x, y, nx, ny) { return artLit(nx, ny) > 0.45 ? pc.H : (nx < 0 ? pc.K : pc.k); });
                },
                face: nightFace(pc, {
                    eyes: [['.eee.', 'ehiie', 'eiiIe', '.III.'], ['.eee.', 'ehiie', 'eiiIe', '.III.']], ex: [13, 22],
                    mouth: ['mmmm', '.mm.'], mx: 18
                }),
                front: function (T) {
                    // Mái thưa tròn, rẽ bên trái để lộ chân tóc thái dương trái; mái dừng trên hàng mi.
                    T.poly([[12, 11.6], [12.4, 6.4], [15.2, 3.6], [20, 2.8], [25, 3.6], [27.8, 6.4], [28.2, 12.4], [26.6, 9.4],
                        [24.6, 8.4], [22.6, 9.2], [20.6, 8.2], [18.6, 9], [16.8, 7.8], [15.4, 7.2], [13.8, 8.8]], function (x, y) {
                        if (y < 5.4 && x > 15 && x < 19) return pc.H;
                        return x < 20 ? pc.K : pc.k;
                    });
                },
                extra: function (B) {
                    // Bông mẫu đơn cài sau búi (bên phải tranh): cánh trắng, nhuỵ vàng, hai lá.
                    artPart(B, function (T) {
                        artStamp(T, ['..uu.....', '.uUu.pp..', '..ppppPp.', '.ppopppPp', '.pooOppPp', '..ppPpPp.', '...pPPu..',
                            '.....uU..'], 25, 0, pc);
                    }, pc.P);
                    // Cánh hoa mọc từ chân tóc thái dương trái tranh: gốc hồng bám chân tóc nơi tóc gặp da, cánh dài cong
                    // chĩa lên ra ngoài, lòi khỏi mép tóc.
                    [[11, 8], [12, 8], [10, 7], [11, 7], [10, 6], [11, 6], [9, 5], [10, 5], [10, 4]].forEach(function (p) {
                        B.set(p[0], p[1], NIGHT_ART.petal);
                    });
                    [[12, 9], [13, 10]].forEach(function (p) { B.set(p[0], p[1], NIGHT_ART.petalBase); });
                }
            });
        },
        // Hình thật của Hương Ngọc: bông mẫu đơn trắng nở to giữa vườn đêm, nhuỵ vàng, lá xẻ thuỳ, một nụ bên trái và
        // một bông trà đỏ (Giáng Tuyết) ở góc dưới phải.
        'xiangyu:true': function () {
            var pc = artPal({ B0: '#121e1a', B1: '#172820', B2: '#1e3228', B3: '#263e30', g: '#c8e0c0',
                p: '#ffffff', P: '#f3f1e8', q: '#dedcd0', Q: '#bdbab0', k: '#f8e2ea', K: '#ebc6d2',
                o: '#f6d04e', O: '#d4962a', y: '#fff3a8',
                l: '#6ea456', L: '#4a7e3c', n: '#2c5a2a', v: '#9cca72',
                c: '#d8203a', C: '#9e142a', z: '#f6d24a', t: '#3a2a1e' });
            var L = new Layer(0, 0, 40, 40);
            L.poly([[1, 10.6], [2.6, 5.4], [7.4, 2.4], [32.6, 2.4], [37.4, 5.4], [39, 10.6], [39, 40], [1, 40]], function (x, y) {
                var t = y / 40 + (vnoise(x * 0.3, y * 0.5, 371) - 0.5) * 0.2;
                return t < 0.3 ? pc.B3 : t < 0.55 ? pc.B2 : t < 0.8 ? pc.B1 : pc.B0;
            });
            // Đom đóm / sương lấp lánh trên nền.
            [[6, 8], [33, 9], [35, 20], [4, 22], [10, 13]].forEach(function (p) { L.set(p[0], p[1], pc.g); });
            // Lá mẫu đơn xẻ thuỳ hai bên dưới bông, gân sáng.
            artPart(L, function (T) {
                artSides(function (s, m) {
                    T.poly(m([[20, 30], [12, 26.4], [5.2, 27.6], [8.8, 29.6], [3.6, 32.4], [9.6, 32.6], [7.4, 36.6], [13.6, 33.6], [16.6, 36.4], [18.2, 32.6]]),
                        function (x, y) { return (s > 0 ? y < 31 : y < 30) ? pc.l : (s > 0 ? pc.L : pc.n); });
                    var a = m([[19, 30.6], [8, 30.4]]);
                    T.line(a[0][0], a[0][1], a[1][0], a[1][1], pc.v);
                });
            }, pc.n);
            // Nụ bên trái trên cuống mảnh.
            artPart(L, function (T) {
                T.line(7, 26, 6, 18, pc.L);
                T.ellipse(6, 15.6, 2.4, 2.8, function (x, y, nx, ny) { return ny < -0.2 ? pc.P : (nx < 0 ? pc.l : pc.L); });
            }, pc.n);
            // Bông hoa: vẽ từng cánh từ sau ra trước, mỗi cánh viền xám nhạt nên các cánh tách nhau; mép ngoài cánh gợn
            // sóng, gốc cánh hồng, gân giữa cánh lớn; nhuỵ vàng chấm cam ở giữa.
            var fx = 20.5, fy = 17.6;
            function petal(cx, cy, ang, len, wid, k) {
                artPart(L, function (T) {
                    var ca = Math.cos(ang), sa = Math.sin(ang), R = Math.max(len, wid) + 1;
                    for (var y = Math.floor(cy - R); y <= cy + R; y++) {
                        for (var x = Math.floor(cx - R); x <= cx + R; x++) {
                            var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
                            var u = (dx * ca + dy * sa) / len, v = (-dx * sa + dy * ca) / wid;
                            var rim = u > 0.2 ? 0.86 + 0.14 * Math.cos(v * 9 + k) : 1;
                            if (u * u + v * v > rim) continue;
                            var t = -(x + 0.5 - fx) / 14 * 0.5 - (y + 0.5 - fy) / 12 * 0.6 + u * 0.22 + (hash2(x, y, 393 + k) - 0.5) * 0.14;
                            var c = u < -0.55 ? pc.K : u < -0.3 ? pc.k : t > 0.16 ? pc.p : t > -0.26 ? pc.P : pc.q;
                            if (len > 4 && Math.abs(v) < 0.12 && u > -0.2 && u < 0.6) c = c === pc.p ? pc.P : pc.q;
                            T.set(x, y, c);
                        }
                    }
                }, pc.Q);
            }
            var ring = function (n, off, dist, len, wid, sy) {
                var list = [];
                for (var i = 0; i < n; i++) {
                    var a = off + i * Math.PI * 2 / n;
                    list.push({ a: a, x: fx + Math.cos(a) * dist, y: fy + Math.sin(a) * dist * sy, k: i });
                }
                list.sort(function (p, q) { return p.y - q.y; });
                list.forEach(function (p) { petal(p.x, p.y, p.a, len, wid, p.k + n); });
            };
            ring(8, -Math.PI / 2, 7, 6.2, 4.8, 0.82);
            ring(6, -Math.PI / 2 + 0.5, 3.8, 4.6, 3.6, 0.8);
            ring(4, -Math.PI / 4, 1.7, 3, 2.6, 0.8);
            artPart(L, function (T) {
                T.ellipse(fx, fy - 0.4, 2.6, 2, function (x, y) { return hash2(x, y, 391) < 0.35 ? pc.O : ((x + y) % 2 ? pc.o : pc.y); });
            }, pc.O);
            // Bông trà đỏ của Giáng Tuyết ở góc dưới phải.
            artPart(L, function (T) {
                T.ellipse(33.4, 34.4, 3.2, 2.8, function (x, y, nx, ny) {
                    if (nx * nx + ny * ny < 0.16) return pc.z;
                    return ny < -0.1 && nx < 0.3 ? pc.c : pc.C;
                });
                artStamp(T, ['nn.', 'nLn'], 28, 36, pc);
            }, pc.t);
            L.outline(C.ink);
            return L;
        },
        // Giáng Tuyết: tinh cây trà hoa đỏ, chỉ nói trong hội thoại. Áo đỏ thẫm, tóc đen dài thẳng mái bằng, vẻ lạnh
        // (mi khép nửa, mày thẳng, môi khép), một bông trà đỏ nhỏ ở cổ áo; đứng trên đất vườn đọng sương muối.
        jiangxue: function () {
            var pc = artPal({ g: '#6c5442', G: '#584434', j: '#382a1e', z: '#e6eef2', Z: '#b6c2ca',
                s: '#f7eae4', S: '#e6d2cc', r: '#b8968e', q: '#efc8c8',
                e: '#1a1418', h: '#ffffff', i: '#3a2a32', I: '#5e4450', m: '#a84452', n: '#1a1418',
                k: '#121016', K: '#23202a', H: '#4a4658', D: '#08070a',
                a: '#bc3a4c', b: '#922438', c: '#6c1628', d: '#3e0a14', w: '#f4ece6', x: '#4e0c18',
                y: '#5a1220', Y: '#3a0a14', f: '#2a0c12', F: '#160608',
                o: '#e02840', O: '#a01428', u: '#f6d24a', l: '#2e5a3a' });
            return nightGirl(pc, {
                // Đất vườn đọng sương muối: hạt trắng lấm tấm trên đất nâu.
                tex: function (x, y) {
                    var v = hash2(x, y, 401);
                    if (v < 0.1) return pc.z;
                    if (v < 0.16) return pc.Z;
                    return (y - 31) % 4 === 3 ? pc.j : (v < 0.5 ? pc.G : pc.g);
                },
                floor: function (L) {
                    artStamp(L, ['oO'], 31, 37, pc);
                },
                shadow: true,
                waist: 4.6,
                back: function (T) {
                    // Tóc đen dài thẳng phủ lưng tới ngang hông.
                    T.poly([[11, 8.4], [29, 8.4], [30.4, 18], [30.2, 29.4], [27.4, 30.6], [12.6, 30.6], [9.8, 29.4], [9.6, 18]], function (x, y) {
                        if (y > 12 && x % 6 === 2) return pc.H;
                        return x < 20 ? pc.K : pc.k;
                    });
                },
                // Mi khép nửa, mày giấu dưới mái bằng, không má hồng: vẻ lạnh.
                face: nightFace(pc, {
                    eyes: [['....', 'eeee', 'ehie', '.ii.'], ['....', 'eeee', 'ehie', '.ii.']],
                    mouth: ['mm'], blush: false
                }),
                front: function (T) {
                    // Mái bằng thẳng ngang mày, hai lọn mai thẳng rủ tới vai.
                    T.poly([[11.6, 12], [12, 6.4], [15, 3.4], [20, 2.6], [25, 3.4], [28, 6.4], [28.4, 12], [27, 8.2], [13, 8.2]], function (x, y) {
                        if (y < 5 && x > 14 && x < 18) return pc.H;
                        return x < 20 ? pc.K : pc.k;
                    });
                    artSides(function (s, m) {
                        T.poly(m([[11.6, 8.4], [13.6, 8.4], [13.8, 20.4], [12.4, 22.6], [11.2, 20.4]]), s > 0 ? pc.K : pc.k);
                    });
                },
                extra: function (B) {
                    // Bông trà đỏ nhỏ ở cổ áo, nhuỵ vàng, một lá.
                    artPart(B, function (T) {
                        artStamp(T, ['.oo.', 'ooOo', 'oOuO', '.OO.'], 15, 19, pc);
                        artStamp(T, ['ll'], 14, 22, pc);
                    }, pc.d);
                }
            });
        },
        // Liên Tỏa: áo xám tím, mái bằng, tóc dài buộc thấp dải đỏ, cầm tờ giấy thơ đỏ; sàn đá Vọng Vân Đình. Chi tiết
        // lệch: ánh trăng lọt qua tay áo bên phải tranh, rơi thành đốm sáng trên sàn.
        lianso: function () {
            return lianPortrait(false);
        },
        // Hình thật của Liên Tỏa: hồn ma cùng dáng, trong suốt, lạnh màu, không chân, không bóng; dải đỏ và tờ giấy
        // thơ vẫn giữ sắc đỏ.
        'lianso:true': function () {
            return lianPortrait(true);
        },
        // Nhan Như Ngọc: áo khoác dài ngọc nhạt tay rộng trên váy kem, tóc vấn cài trâm ngọc, cầm sách bìa chàm; sàn ván
        // Tàng Kinh Các. Chi tiết lệch: nếp gấp thẳng tắp như giấy gấp vắt ngang gấu áo.
        yan: function () {
            return yanPortrait();
        },
        // Hình thật của Nhan Như Ngọc: người giấy cắt hình thiếu nữ đứng giữa trang sách mở, nét mực trên giấy trắng.
        'yan:true': function () {
            return yanPaper();
        },
        // ----- khách đêm đợt D -----
        // Đạo sĩ Lao Sơn: ông già áo đạo xám có vá, râu trắng dài, búi bạc cài trâm gỗ, đứng cạnh bó củi ở Sơn môn. Chi tiết
        // lệch: chiếc lông hạc trắng đầu đen chìa ra khỏi tay áo bên phải tranh.
        laoshan: function () {
            return laoshanPortrait();
        },
        // Hình thật của đạo sĩ Lao Sơn: hạc đầu đỏ trước vầng trăng.
        'laoshan:true': function () {
            return cranePortrait();
        },
        // Vương Sinh: học trò của đạo sĩ, chỉ nói trong truyện Lao Sơn; trán u một cục đỏ.
        wangsheng: function () {
            return wangshengPortrait();
        },
        // Hoa Cô Tử: cô gái áo nâu chấm trắng xách giỏ cây thuốc ở Vườn rau. Chi tiết lệch: tai hươu có lông sau mái tóc.
        huagu: function () {
            return huaguPortrait();
        },
        // Hình thật của Hoa Cô Tử: hươu xạ con ngậm nhánh cây thuốc.
        'huagu:true': function () {
            return fawnPortrait();
        },
        // Nhiếp Tiểu Thiến: thiếu nữ áo trắng ngà viền xanh, tóc dài buông, cầm thỏi vàng, cây đèn sau vai. Chi tiết lệch:
        // ánh đèn xuyên qua vai phải. Từ 15/10/2026 PIXEL_PORTRAITS (ảnh AI) thay hai hình này; giữ lại để quay về (khi đó
        // trả REVEAL_ZONES.xiaoqian về vùng cũ: shoulder 23,17,10×10; hair 9,8,8×13; ingot 6,26,10×8).
        xiaoqian: function () {
            return xiaoqianPortrait(false);
        },
        // Hình thật của Nhiếp Tiểu Thiến: hồn ma cùng dáng, trong suốt, không chân; thỏi vàng và ngọn đèn giữ sắc.
        'xiaoqian:true': function () {
            return xiaoqianPortrait(true);
        }
    };

    // ----- chân dung khách đêm -----
    // Khách quen vẽ bán thân; khách đêm vẽ toàn thân kiểu đầu to, đứng trên một mảng sàn, vì bước reveal cần
    // thấy cả cổ tay, eo, vạt áo và bóng dưới chân (chỗ để soi chi tiết lệch). Sàn không viền mực, nhân vật
    // viền mực như chân dung cũ. Khung 40×40: đầu tâm (20, 10.6), eo y≈24, gấu áo y≈35, giày y≈35–36,5,
    // sàn từ y≈31 tới đáy khung (phủ kín hàng đáy như chân dung bán thân).
    // Màu cố định của bóng chân, vảy bạc và cánh: test và ảnh xem trước dùng để soi đúng vùng reveal.
    // Đợt C: giọt nước (thân drip, đáy sáng dripHi) của Vương Lục Lang; mép da cong (seamEdge) và vệt xanh dưới
    // da (seam) của Họa Bì; cánh hoa mọc từ chân tóc (petal, gốc hồng petalBase) của Hương Ngọc. Mỗi màu chỉ có
    // trong vùng reveal đầu tiên của chân dung hình người.
    var NIGHT_ART = {
        shadow: u32('#2e2420'),
        scale: u32('#b8c9dc'),
        wing: u32a('#dff3f7', 150),
        wingEdge: u32a('#8fc0d0', 200),
        drip: u32('#4fa6d6'),
        dripHi: u32('#e6fbff'),
        seam: u32('#5daa48'),
        seamEdge: u32('#fffdf9'),
        petal: u32('#fff6fa'),
        petalBase: u32('#f3c3d3'),
        // Đợt C phần 2: ánh trăng lọt qua tay áo Liên Tỏa (lõi moon, quầng moonDim, đốm sáng trên sàn); nếp gấp giấy
        // ở gấu áo Nhan Như Ngọc (nét gấp fold, mép sáng foldHi). Mỗi màu chỉ có trong vùng reveal đầu tiên.
        moon: u32('#f3fbff'),
        moonDim: u32('#bcd5ee'),
        fold: u32('#a9a089'),
        foldHi: u32('#fffdf5'),
        // Đợt D: lông hạc trắng chìa ra khỏi tay áo đạo sĩ Lao Sơn (phiến lông feather, đầu lông đen featherTip); tai hươu có
        // lông lộ sau tóc Hoa Cô Tử (lông ear, lòng tai earIn); ánh đèn xuyên qua vai Nhiếp Tiểu Thiến (lõi lampCore, quầng
        // lampHalo). Mỗi màu chỉ có trong vùng reveal đầu tiên.
        feather: u32('#fafcff'),
        featherTip: u32('#262833'),
        ear: u32('#b98352'),
        earIn: u32('#f4bfae'),
        lampCore: u32('#fff3c0'),
        lampHalo: u32('#f2b866')
    };

    // pc: bảng màu (sàn g/G/j, da s/S/r/q, mắt e/h/i, miệng m, tóc k/K/H/D, áo a/b/c/d, cổ áo w, viền x,
    // thắt lưng y/Y, giày f/F). o.tex(x, y): màu sàn; o.floor(L): vật trên sàn; o.shadow: có bóng chân;
    // o.waist: nửa bề ngang eo; o.back/o.front(T): tóc sau lưng/tóc trước; o.mouth: hàng pixel miệng;
    // o.legs(B, w): thay váy xoè và giày (áo ngắn, ống quần); o.face(B): thay cổ, đầu, mắt, má, miệng mặc định
    // (xem nightFace); o.extra(B): chi tiết riêng trên lớp nhân vật (trước viền mực); o.ghost(B): biến nhân vật
    // thành hồn ma (sau viền mực); o.post(L): vẽ sau cùng.
    function nightGirl(pc, o) {
        var L = new Layer(0, 0, 40, 40);
        L.ellipse(20, 40.6, 22.6, 9.3, function (x, y, nx, ny) {
            return nx * nx + ny * ny > 0.84 ? pc.j : o.tex(x, y);
        });
        if (o.floor) o.floor(L);
        if (o.shadow) {
            L.ellipse(20, 36.5, 12.6, 2.7, function (x, y, nx, ny) {
                return (nx * nx + ny * ny > 0.78 && dith(x, y) < 0.5) ? 0 : NIGHT_ART.shadow;
            });
        }
        var B = new Layer(0, 0, 40, 40);
        var w = o.waist || 5.2;
        if (o.back) artPart(B, o.back, pc.D);
        if (o.legs) {
            o.legs(B, w);
        } else {
            // Váy xoè từ eo tới gấu: hai nếp gấp sẫm, viền gấu.
            artPart(B, function (T) {
                var N = artNorm(20, 27, 12, 11);
                T.poly([[20 - w, 24.2], [20 + w, 24.2], [27.6, 33.4], [26.6, 34.8], [13.4, 34.8], [12.4, 33.4]], function (x, y) {
                    var n = N(x, y), t = artLit(n[0], n[1]);
                    var f1 = 18 - (y - 24) * 0.26, f2 = 22 + (y - 24) * 0.26;
                    if (y >= 34) return pc.x;
                    if (Math.abs(x + 0.5 - f1) < 0.5 || Math.abs(x + 0.5 - f2) < 0.5) return pc.c;
                    return t < 0.1 ? pc.c : t < 0.58 ? pc.b : pc.a;
                });
            }, pc.d);
            // Giày ló dưới gấu áo.
            artPart(B, function (T) {
                T.ellipse(17.4, 35.4, 2, 1.1, function (x) { return x < 17 ? pc.f : pc.F; });
                T.ellipse(22.6, 35.4, 2, 1.1, function (x) { return x < 23 ? pc.f : pc.F; });
            }, pc.F);
        }
        // Tay áo rộng rủ hai bên tới ngang hông; bên trái tranh đón sáng.
        artSides(function (s, m) {
            artPart(B, function (T) {
                T.poly(m([[13.4, 19.2], [16, 20.2], [16.4, 24.8], [15.8, 27.6], [11.8, 28.4], [9.2, 27.2], [10.4, 22.4]]), function (x, y) {
                    if (y >= 26.8) return pc.c;
                    var outer = s > 0 ? x < 11.8 : x > 28.2;
                    if (s > 0) return outer ? pc.a : pc.b;
                    return outer ? pc.c : pc.b;
                });
            }, pc.d);
        });
        artSides(function (s, m) {
            var c = m([[12.9, 28.7]])[0];
            artPart(B, function (T) { T.ellipse(c[0], c[1], 1.7, 1.3, s > 0 ? pc.s : pc.S); }, pc.r);
        });
        // Thân áo, cổ áo giao lĩnh (vạt trái đè vạt phải), thắt lưng.
        artPart(B, function (T) {
            T.poly([[14.2, 19], [25.8, 19], [26.6, 21.2], [20 + w + 0.4, 24.6], [20 - w - 0.4, 24.6], [13.4, 21.2]], function (x) {
                return x < 19 ? pc.a : x < 24 ? pc.b : pc.c;
            });
            T.poly([[17.4, 19], [22.6, 19], [20, 22.4]], pc.w);
            T.line(16.6, 19, 21.4, 23.6, pc.x);
            T.line(23.4, 19, 20.4, 21.8, pc.x);
            T.poly([[20 - w - 0.2, 23.2], [20 + w + 0.2, 23.2], [20 + w + 0.2, 25], [20 - w - 0.2, 25]], function (x, y) {
                return y > 24 ? pc.Y : pc.y;
            });
        }, pc.d);
        // Cổ và đầu.
        if (o.face) {
            o.face(B);
        } else {
            artPart(B, function (T) {
                T.rect(19, 17, 3, 3, pc.S);
                T.ellipse(20, 10.6, 8, 7.5, function (x, y, nx, ny) { return artLit(nx, ny) < 0.22 ? pc.S : pc.s; });
            }, pc.r);
            artStamp(B, ['eee', 'ehi', 'eii'], 15, 11, pc);
            artStamp(B, ['eee', 'ihe', 'iie'], 23, 11, pc);
            artStamp(B, ['qq'], 13, 14, pc);
            artStamp(B, ['qq'], 25, 14, pc);
            artStamp(B, o.mouth || ['mm'], 19, 15, pc);
        }
        if (o.front) artPart(B, o.front, pc.D);
        if (o.extra) o.extra(B);
        B.outline(C.ink);
        if (o.ghost) o.ghost(B);
        L.blit(B, 0, 0);
        if (o.post) o.post(L);
        return L;
    }

    // Tóc trước rẽ ngôi giữa, ôm mặt; dùng cho Bạch Thu Luyện.
    function hairParted(pc) {
        return function (T) {
            T.poly([[11.8, 12.6], [12, 6.6], [14.6, 3.6], [20, 2.4], [25.4, 3.6], [28, 6.6], [28.2, 12.6], [26.8, 9.4],
                [24.6, 6.6], [21, 5.2], [20, 5.8], [19, 5.2], [15.4, 6.6], [13.2, 9.4]], function (x, y) {
                if (y < 5 && x > 14 && x < 18) return pc.H;
                return x < 20 ? pc.K : pc.k;
            });
            T.poly([[11.8, 10.6], [13.6, 10.6], [13.8, 19.6], [12.6, 23.4], [11.2, 20.6]], function (x, y) { return y % 4 === 1 ? pc.H : pc.K; });
            T.poly([[28.2, 10.6], [26.4, 10.6], [26.2, 19.6], [27.4, 23.4], [28.8, 20.6]], pc.k);
        };
    }

    // Tiểu Tạ: tuỳ chọn chung cho hình người và hình hồn ma (cùng tóc, cùng áo, cùng bút).
    function taPortrait(ghost) {
        var pc = artPal({ g: '#7c5a44', G: '#68493a', j: '#3e2b22',
            s: '#fbefe7', S: '#ead5c8', r: '#b89488', q: '#f4b8bc',
            e: '#3a3346', h: '#ffffff', i: '#6a6496', m: '#c9707c',
            k: '#3a3646', K: '#545068', H: '#7c7896', D: '#24212e',
            a: '#eef7fa', b: '#d4e6ee', c: '#adc9d6', d: '#7d9bb0', w: '#ffffff', x: '#f0a6b6',
            y: '#f2b4c2', Y: '#d78398', f: '#8c98ae', F: '#5c6680',
            n: '#9b7a58', N: '#6b5038', o: '#22202a', p: '#f7f0dc', P: '#d8cba8', u: '#b0a07e' });
        return nightGirl(pc, {
            // Sàn Tàng Kinh Các: ván gỗ sẫm xếp so le; cuộn kinh rơi ở góc trái.
            tex: function (x, y) {
                var row = Math.floor((y - 31) / 2);
                if ((y - 31) % 2 === 1 && hash2(x >> 3, row, 331) < 0.7) return (x + row * 5) % 11 === 0 ? pc.j : pc.G;
                return ((x + row * 5) % 11 === 0) ? pc.j : (hash2(x, y, 332) < 0.12 ? pc.G : pc.g);
            },
            floor: function (L) {
                artPart(L, function (T) {
                    T.rect(3, 34, 7, 3, function (x, y) { return y === 36 ? pc.P : (x === 9 ? pc.u : pc.p); });
                    T.ellipse(3, 35.5, 1.2, 1.6, pc.n);
                    T.line(4, 35, 8, 35, pc.o);
                }, pc.N);
            },
            shadow: false,
            back: function (T) {
                T.ellipse(20, 11.4, 9.2, 8.6, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
                T.ellipse(13, 3.8, 3.4, 3.1, function (x, y, nx, ny) { return artLit(nx, ny) > 0.45 ? pc.H : pc.K; });
                T.ellipse(27, 3.8, 3.4, 3.1, function (x, y, nx, ny) { return artLit(nx, ny) > 0.45 ? pc.H : pc.k; });
            },
            front: function (T) {
                // Mái bằng tỉa răng cưa, một nhúm tóc vểnh trên đỉnh.
                T.poly([[11.6, 12.2], [12, 6.4], [15, 3.4], [20, 2.6], [25, 3.4], [28, 6.4], [28.4, 12.2], [27, 8.8], [25.2, 9.4],
                    [23.6, 8.2], [21.6, 9.6], [19.8, 8.2], [17.8, 9.6], [16, 8.2], [13.6, 9.2]], function (x, y) {
                    if (y < 5.4 && x > 15 && x < 19) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                T.poly([[19.4, 3.2], [20.6, 0.4], [22.4, 1.2], [21.2, 3.4]], pc.K);
                // Dải ruy băng hồng buộc hai búi.
                artStamp(T, ['y.y', '.Y.', 'y.y'], 9, 5, pc);
                artStamp(T, ['y.y', '.Y.', 'y.y'], 28, 5, pc);
            },
            mouth: ['m..m', '.mm.'],
            extra: function (B) {
                // Bút lông cầm ở tay phải (bên phải tranh): cán gỗ dựng chéo, đầu bút đẫm mực.
                B.line(27.6, 29.2, 30.6, 22, pc.n);
                B.line(28.6, 29.2, 31.4, 22.6, pc.N);
                B.rect(30, 19.8, 2, 2, pc.o);
                B.set(31, 19, pc.o);
            },
            ghost: ghost ? function (B) {
                // Hồn ma: không chân, vạt áo tan dần thành sương, toàn thân trong và lạnh màu.
                for (var y = 0; y < B.h; y++) {
                    for (var x = 0; x < B.w; x++) {
                        var i = y * B.w + x, c = B.px[i];
                        if (!c) continue;
                        if (y > 33 || (y > 28 && dith(x, y) < (y - 28) / 6)) {
                            B.px[i] = 0;
                            continue;
                        }
                        var r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
                        r = Math.round(r * 0.72 + 40);
                        g = Math.round(g * 0.8 + 44);
                        b = Math.min(255, Math.round(b * 0.85 + 60));
                        B.px[i] = ((150 << 24) | (b << 16) | (g << 8) | r) >>> 0;
                    }
                }
            } : null,
            post: ghost ? function (L) {
                // Vài sợi sương mờ lượn dưới vạt áo, thay cho đôi chân.
                var mist = u32a('#d9eef6', 110);
                [[14, 30], [15, 31], [16, 32], [23, 31], [24, 32], [25, 33], [19, 32], [20, 33], [21, 34]].forEach(function (p) {
                    var c = L.get(p[0], p[1]);
                    L.set(p[0], p[1], c ? mixOver(c, mist) : mist);
                });
            } : null
        });
    }

    // ----- chân dung đợt C: mặt người kiểu mới, áo ngắn, Họa Bì -----
    // Mặt người cho nightGirl (o.face): da phẳng một màu, chỉ mép phải tối; không dùng artLit vì bóng dưới cằm trông
    // như râu bẩn. f.eyes = [mắt trái, mắt phải]: hàng chữ cao 4 hàng có mi, góc trên trái ở (f.ex[0], f.ey) và
    // (f.ex[1], f.ey), mặc định cột 14 và 22, hàng 10; mi rủ ở đuôi mắt cùng đầu mày trong nhướng lên thì ra vẻ buồn.
    // Má hồng hàng f.by (mặc định 14; f.blush === false thì bỏ); miệng f.mouth đặt ở (f.mx, f.my), mặc định (19, 15).
    // Viền mái tóc (vẽ sau mặt) đè lên hàng ngay dưới mái, nên mái phải dừng trên hàng mi ít nhất hai hàng; lông mày
    // vẽ ở o.extra (sau mái tóc).
    function nightFace(pc, f) {
        var ex = f.ex || [14, 22], ey = f.ey || 10, by = f.by || 14;
        return function (B) {
            artPart(B, function (T) {
                T.rect(19, 17, 3, 3, pc.S);
                T.ellipse(20, 10.6, 8, 7.5, function (x, y, nx) { return nx > 0.7 ? pc.S : pc.s; });
            }, pc.r);
            artStamp(B, f.eyes[0], ex[0], ey, pc);
            artStamp(B, f.eyes[1], ex[1], ey, pc);
            if (f.blush !== false) {
                artStamp(B, ['qq'], 13, by, pc);
                artStamp(B, ['qq'], 25, by, pc);
            }
            artStamp(B, f.mouth || ['mm'], f.mx === undefined ? 19 : f.mx, f.my || 15, pc);
        };
    }

    // Thân dưới của Vương Lục Lang cho nightGirl (o.legs): áo ngắn tới gối xoè nhẹ, ống quần sẫm vì ướt (t/T, mép
    // sáng u), dép cỏ (f/F). feet === false: không có bàn chân (ma nước; ống quần tan vào nước ở o.ghost).
    function shortRobe(pc, feet) {
        return function (B, w) {
            artPart(B, function (T) {
                T.poly([[15.4, 28.6], [19.4, 28.6], [19.2, 34.4], [15.8, 34.4]], function (x) { return x < 16.5 ? pc.u : pc.t; });
                T.poly([[20.6, 28.6], [24.6, 28.6], [24.2, 34.4], [20.8, 34.4]], function (x) { return x > 23 ? pc.T : pc.t; });
            }, pc.D);
            if (feet !== false) {
                artPart(B, function (T) {
                    T.ellipse(17.4, 35.4, 2, 1.1, function (x) { return x < 17 ? pc.f : pc.F; });
                    T.ellipse(22.6, 35.4, 2, 1.1, function (x) { return x < 23 ? pc.f : pc.F; });
                }, pc.F);
            }
            artPart(B, function (T) {
                var N = artNorm(20, 27, 12, 11);
                T.poly([[20 - w, 24.2], [20 + w, 24.2], [26, 30.2], [25.2, 31.4], [14.8, 31.4], [14, 30.2]], function (x, y) {
                    var n = N(x, y), t = artLit(n[0], n[1]);
                    if (y >= 31) return pc.x;
                    if (x === 20 && y > 25) return pc.c;
                    return t < 0.1 ? pc.c : t < 0.58 ? pc.b : pc.a;
                });
            }, pc.d);
        };
    }

    // Họa Bì: tuỳ chọn chung cho hình người (mỹ nữ mặt phấn, búi cao cài trâm) và hình thật (mặt xanh, răng cưa,
    // tóc xổ, hai tay cầm cuộn da). Cùng áo đỏ, cùng sân đá Sơn môn.
    function huapiPortrait(demon) {
        var pc = artPal({ g: '#aaa49a', G: '#938c82', j: '#5f5952',
            s: demon ? '#8cc866' : '#fff8f4', S: demon ? '#64a248' : '#f0e0da', r: demon ? '#3c6c2c' : '#c8a49a', q: '#f7c6c8',
            e: '#1c1418', h: '#ffffff', i: demon ? '#ffd23e' : '#5a2c34', I: demon ? '#e0902a' : '#8e4c52', m: '#d22a36', n: '#1c1418',
            k: '#16121a', K: '#2a2230', H: '#5a4a62', D: '#0c0a10',
            a: '#e8664c', b: '#c63c2e', c: '#94291f', d: '#5c1612', w: '#fff4e8', x: '#e8b44a',
            y: '#f0c85a', Y: '#b8892c', f: '#3a1a18', F: '#220e0c', o: '#e23c3c', O: '#9a1e22',
            v: '#3a0e12', t: '#fffdf2', P: '#f6e6d4', Q: '#d9c2aa', R: '#a88c76' });
        return nightGirl(pc, {
            // Sân đá Sơn môn: phiến đá chữ nhật xếp so le, mạch vữa sẫm.
            tex: function (x, y) {
                var row = Math.floor((y - 31) / 3), off = (row & 1) * 4;
                if ((y - 31) % 3 === 2 || (x + off) % 8 === 0) return pc.j;
                return hash2(Math.floor((x + off) / 8), row, 351) < 0.35 ? pc.G : pc.g;
            },
            shadow: true,
            waist: 4.4,
            back: demon ? function (T) {
                // Tóc xổ tung: bờm nhọn quanh đầu, rủ lởm chởm xuống hai vai.
                var pts = [];
                for (var k = 0; k <= 16; k++) {
                    var a = Math.PI * (0.92 + k / 16 * 1.16);
                    var r = (k % 2 ? 13.2 : 10.4) + (hash2(k, 1, 361) - 0.5) * 1.6;
                    pts.push([20 + Math.cos(a) * r, 11 + Math.sin(a) * r * 0.95]);
                }
                pts.push([33.2, 20.4], [31.4, 22.4], [33.4, 27.4], [29.4, 25.8], [27.4, 29.2], [12.6, 29.2], [10.6, 25.8],
                    [6.6, 27.4], [8.6, 22.4], [6.8, 20.4]);
                T.poly(pts, function (x, y) {
                    if ((x * 3 + y) % 11 === 0 && y > 4) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
            } : function (T) {
                // Tóc vấn gọn sau đầu, búi cao trên đỉnh.
                T.ellipse(20, 10.8, 8.8, 8.2, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
                T.ellipse(20, 2.8, 4.4, 2.9, function (x, y, nx, ny) { return artLit(nx, ny) > 0.45 ? pc.H : (nx < 0 ? pc.K : pc.k); });
            },
            face: nightFace(pc, demon ? {
                eyes: [['ee...', '.eeee', 'eieie', '.eie.'], ['...ee', 'eeee.', 'eieie', '.eie.']], ex: [13, 22],
                mouth: ['vvvvvvvv', 'tvtvtvtv', 'vtvtvtvt', '.vvvvvv.'], mx: 16, my: 14, blush: false
            } : {
                eyes: [['e....', '.eeee', '.ihiI', '..iI.'], ['....e', 'eeee.', 'ihiI.', '.iI..']], ex: [13, 22],
                mouth: ['mm']
            }),
            front: demon ? function (T) {
                // Vài lọn tóc rối rủ xuống trán.
                T.poly([[12, 9.4], [12.6, 5.4], [16, 3], [20, 2.4], [24, 3], [27.4, 5.4], [28, 9.4], [26.4, 7.2], [25.2, 9.6],
                    [23.4, 6.6], [21.4, 8.8], [20, 6.4], [18.4, 8.6], [16.6, 6.4], [14.8, 9.4], [13.6, 7.2]], function (x) {
                    return x < 20 ? pc.K : pc.k;
                });
            } : function (T) {
                // Tóc rẽ giữa chải ra sau, hai mai ôm má (mai trái ngắn, chừa cằm).
                T.poly([[11.8, 11.4], [12.2, 6.4], [15, 3.8], [20, 3.2], [25, 3.8], [27.8, 6.4], [28.2, 12.6], [26.8, 9],
                    [24.4, 6.6], [21, 5.8], [20, 6.6], [19, 5.8], [15.6, 6.6], [13.2, 9]], function (x, y) {
                    if (y < 5.6 && x > 14 && x < 18) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                T.poly([[27, 9], [28.4, 10], [28.2, 15.8], [27, 14.4]], pc.k);
            },
            extra: demon ? function (B) {
                // Mày chau, trâm vàng tuột lệch trên tóc.
                artStamp(B, ['nn..', '.nnn'], 13, 8, pc);
                artStamp(B, ['..nn', 'nnn.'], 23, 8, pc);
                B.line(26, 2, 31, 5, pc.y);
                B.set(31, 6, pc.o);
                // Cuộn da cầm ngang trước bụng: thân nhạt, hai đầu cuộn, một nét mày mực và vệt son vẽ dở lộ ra.
                artPart(B, function (T) {
                    T.rect(11, 26, 18, 3, function (x, y) { return y === 26 ? pc.P : (y === 28 ? pc.Q : (x > 24 ? pc.Q : pc.P)); });
                    T.rect(10, 26, 1, 3, pc.R);
                    T.rect(29, 26, 1, 3, pc.R);
                    T.set(10, 27, pc.Q);
                    T.set(29, 27, pc.Q);
                    T.line(16, 27, 18, 27, pc.n);
                    T.set(22, 27, pc.m);
                    T.set(23, 27, pc.m);
                }, pc.R);
                artStamp(B, ['ss', 'SS'], 12, 27, pc);
                artStamp(B, ['ss', 'SS'], 26, 27, pc);
            } : function (B) {
                // Mày lá liễu; trâm vàng xuyên búi, quả châu đỏ rủ bên phải tranh.
                artStamp(B, ['.nnn', 'n...'], 13, 8, pc);
                artStamp(B, ['nnn.', '...n'], 23, 8, pc);
                B.line(13, 2, 27, 4, pc.y);
                B.set(27, 3, pc.Y);
                B.line(27, 5, 27, 6, pc.Y);
                artStamp(B, ['oo', 'OO'], 27, 7, pc);
                // Mép da ở cằm trái tranh cong lên như giấy (mép trắng chìa ra ngoài má, bóng mép ở dưới), lộ một vệt
                // xanh bên dưới.
                [[13, 13], [13, 14], [14, 15], [15, 16]].forEach(function (p) { B.set(p[0], p[1], NIGHT_ART.seam); });
                [[12, 13], [11, 14], [12, 15], [13, 16], [14, 17]].forEach(function (p) { B.set(p[0], p[1], NIGHT_ART.seamEdge); });
                B.set(14, 16, pc.r);
            }
        });
    }

    // Vương Lục Lang: tuỳ chọn chung cho hình người (áo ngắn, tóc rối, nước nhỏ từ mai tóc và vai áo bên phải tranh,
    // đứng trên cầu ván giữa hồ) và hình thật (ma nước: da xanh tái, tóc xoã ướt, rong quấn cổ chân, không chân, lơ
    // lửng trên mặt hồ đêm). Giọt nước dùng màu NIGHT_ART.drip/dripHi.
    function wangPortrait(ghost) {
        var pc = artPal({ g: '#9b8c74', G: '#857762', j: '#544838', W: '#2e5f6a', V: '#22505a', z: '#8fc3cf',
            l: '#4c863f', L: '#376a33',
            s: ghost ? '#d2eae2' : '#f6dcc6', S: ghost ? '#a9d0c6' : '#e4c0a8', r: ghost ? '#6e9c96' : '#b08a74', q: '#f2b4a4',
            e: ghost ? '#1c3036' : '#262a36', h: '#ffffff', i: ghost ? '#3e6e78' : '#3e4a5e', I: ghost ? '#6a9aa2' : '#6a7c96',
            m: ghost ? '#6a8e8a' : '#b0645a', n: ghost ? '#1c3036' : '#2c3240',
            k: ghost ? '#14262c' : '#1c2230', K: ghost ? '#22383e' : '#2e374b', H: ghost ? '#5a8a94' : '#6a82a4', D: ghost ? '#0a1418' : '#10141e',
            a: ghost ? '#d8e8ec' : '#dce8ef', b: ghost ? '#aac6ce' : '#b4c9d7', c: ghost ? '#7ea0aa' : '#8ba5b9', d: ghost ? '#4e6e78' : '#5a7286',
            w: '#f4f8fa', x: ghost ? '#6e8e98' : '#7d97ab', y: ghost ? '#7e9ea8' : '#7f99ae', Y: ghost ? '#62828c' : '#647e93',
            t: ghost ? '#4e6a74' : '#536880', T: ghost ? '#38525c' : '#3a4c60', u: ghost ? '#6a8690' : '#7088a0',
            f: '#e2c47c', F: '#a8864c', o: '#5aa052', O: '#2f6a3a' });
        var drop = function (B, x, y) {
            B.set(x, y, NIGHT_ART.drip);
            B.set(x, y + 1, NIGHT_ART.dripHi);
        };
        return nightGirl(pc, {
            tex: ghost ? function (x, y) {
                // Mặt hồ đêm.
                var t = (y - 31) / 9 + (vnoise(x * 0.4, y * 0.8, 343) - 0.5) * 0.3;
                return t < 0.42 ? pc.W : pc.V;
            } : function (x, y) {
                // Cầu ván giữa hồ: ván ngang so le, hai bên là nước.
                var dx = Math.abs(x + 0.5 - 20);
                if (dx > 13.5) return (x + y) % 5 === 0 ? pc.z : pc.W;
                if (dx > 12.5) return pc.j;
                var row = Math.floor((y - 31) / 3);
                if ((y - 31) % 3 === 2 || (x + ((row & 1) ? 5 : 0)) % 12 === 0) return pc.j;
                return hash2(x, y, 341) < 0.14 ? pc.G : ((row & 1) ? pc.G : pc.g);
            },
            floor: function (L) {
                // Lá sen trên mặt nước bên trái; hồn ma có thêm gợn nước tròn ngay dưới chỗ lơ lửng.
                L.ellipse(3.6, 36.4, 2.8, 1.5, function (x, y, nx, ny) { return ny < 0 ? pc.l : pc.L; });
                if (ghost) {
                    [[20, 36.4, 7.6, 1.9], [20, 37.4, 12, 2.9]].forEach(function (r) {
                        L.ellipse(r[0], r[1], r[2], r[3], function (x, y, nx, ny) { return nx * nx + ny * ny > 0.62 ? pc.z : 0; });
                    });
                }
            },
            shadow: !ghost,
            legs: shortRobe(pc, !ghost),
            back: ghost ? function (T) {
                // Tóc xoã ướt rủ quá vai.
                T.poly([[11, 8.4], [29, 8.4], [30.2, 17.6], [29.6, 24.4], [26.4, 23], [13.6, 23], [10.4, 24.4], [9.8, 17.6]], function (x, y) {
                    if (y > 11 && x % 5 === 1) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
            } : function (T) {
                // Tóc vén gọn sát đầu (búi thấp sau gáy, nhìn thẳng không thấy).
                T.ellipse(20, 9.6, 8.6, 7.8, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
            },
            // Mắt hiền mí dày; hồn ma mi rủ ở đuôi mắt.
            face: nightFace(pc, ghost ? {
                eyes: [['.eee', 'ehii', 'eiiI', '.II.'], ['eee.', 'ehie', 'iiIe', '.II.']], ey: 11, my: 16, blush: false
            } : {
                eyes: [['.ee.', 'ehee', 'eiie', '.II.'], ['.ee.', 'ehee', 'eiie', '.II.']], ey: 11, by: 15, my: 16
            }),
            front: ghost ? function (T) {
                // Mái ướt bết từng lọn, hai mai dài rủ xuống ngực.
                T.poly([[11.6, 12], [12, 6.6], [14.6, 3.6], [20, 2.6], [25.4, 3.6], [28, 6.6], [28.4, 12], [27.2, 9.6], [25.6, 8.6],
                    [24, 6.6], [22, 6.2], [21, 7.8], [20, 5.6], [18.4, 6.4], [17.4, 8.2], [16, 6.6], [14.6, 8.8], [13, 10]], function (x, y) {
                    if (y < 5 && x > 14 && x < 18) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                artSides(function (s, m) {
                    T.poly(m([[11.4, 10], [13.4, 10], [13.6, 18], [12.6, 22.4], [11.4, 18.6]]), s > 0 ? pc.K : pc.k);
                });
            } : function (T) {
                // Tóc vén ra sau rẽ lệch, một lọn rơi trước trán, hai sợi vểnh trên đỉnh; một lọn ướt ở thái dương
                // phải rủ tới quai hàm (giọt nước treo ở ngọn).
                T.poly([[11.8, 10.4], [12, 6.2], [14.6, 3.2], [20, 2], [25.4, 3.2], [28, 6.2], [28.2, 10.4], [26.8, 8.2], [24.6, 6.6],
                    [22, 5.8], [19.4, 5.4], [17.6, 6.2], [16, 7.6], [14.2, 7], [13, 9]], function (x, y) {
                    if (y < 5 && x > 14 && x < 18) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                T.poly([[17.4, 2.6], [16, 0.2], [19.2, 2.2]], pc.K);
                T.poly([[23.2, 2.8], [25.8, 0.6], [24.8, 3.4]], pc.k);
                T.poly([[17.2, 5.6], [18.6, 5.4], [17, 9], [16.2, 8.6]], pc.K);
                T.poly([[26.4, 7.4], [27.6, 7.8], [27.8, 13.6], [27.2, 16.6], [26.4, 13.6]], pc.k);
            },
            extra: function (B) {
                if (ghost) {
                    // Đầu mày trong nhướng: buồn mà hiền. Nước vẫn nhỏ từ ngọn tóc.
                    artStamp(B, ['..n', 'nn.'], 14, 8, pc);
                    artStamp(B, ['n..', '.nn'], 23, 8, pc);
                    drop(B, 12, 23);
                    drop(B, 27, 24);
                    return;
                }
                // Tai lộ hai bên (tóc vén gọn), mày ngang.
                [[11, 11], [11, 12], [28, 11], [28, 12]].forEach(function (p) { B.set(p[0], p[1], p[0] < 20 ? pc.s : pc.S); });
                B.set(11, 13, pc.r);
                B.set(28, 13, pc.r);
                artStamp(B, ['nnn'], 14, 9, pc);
                artStamp(B, ['nnn'], 23, 9, pc);
                // Nước nhỏ từ ngọn lọn tóc phải và từ vai áo, dù trời không mưa: vệt ướt sẫm trên vai, giọt treo ở
                // ngọn tóc, hai giọt đang rơi cạnh tay áo (ngoài hình nên có viền mực), giọt đọng ở mép tay áo.
                [[25, 19], [26, 19], [27, 19], [26, 20], [27, 20], [28, 20], [27, 21], [28, 21]].forEach(function (p) { B.set(p[0], p[1], pc.t); });
                drop(B, 27, 18);
                drop(B, 32, 20);
                drop(B, 32, 24);
                drop(B, 30, 28);
            },
            ghost: ghost ? function (B) {
                // Không có chân: ống quần nhạt dần rồi tan vào mặt hồ.
                for (var y = 31; y < B.h; y++) {
                    for (var x = 0; x < B.w; x++) {
                        var i = y * B.w + x;
                        if (!B.px[i]) continue;
                        if (y > 34 || dith(x, y) < (y - 30) / 5) B.px[i] = 0;
                    }
                }
            } : null,
            post: ghost ? function (L) {
                // Rong nước quấn cổ chân trái, một sợi rủ xuống mặt hồ.
                [[15, 31], [16, 31], [17, 32], [18, 31], [19, 32]].forEach(function (p) { L.set(p[0], p[1], pc.o); });
                [[16, 32], [15, 33], [15, 34], [16, 35], [15, 36]].forEach(function (p) { L.set(p[0], p[1], pc.O); });
            } : null
        });
    }

    // ----- chân dung đợt C phần 2: Liên Tỏa, Nhan Như Ngọc -----
    // Hồn ma cho o.ghost: mọi pixel nhân vật trong suốt (alpha 150) và lạnh màu, vạt áo tan dần thành sương từ hàng
    // `from` tới `to` (dưới `to` mất hẳn). keep(c): pixel giữ sắc, không tan, chỉ hơi trong (alpha 200), cho vật mang
    // dấu hiệu của khách.
    function ghostFade(B, from, to, keep) {
        for (var y = 0; y < B.h; y++) {
            for (var x = 0; x < B.w; x++) {
                var i = y * B.w + x, c = B.px[i];
                if (!c) continue;
                var kept = !!(keep && keep(c));
                if (!kept && (y > to || (y > from && dith(x, y) < (y - from) / (to - from + 1)))) {
                    B.px[i] = 0;
                    continue;
                }
                var r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
                if (!kept) {
                    r = Math.round(r * 0.7 + 46);
                    g = Math.round(g * 0.74 + 48);
                    b = Math.min(255, Math.round(b * 0.82 + 66));
                }
                B.px[i] = (((kept ? 200 : 150) << 24) | (b << 16) | (g << 8) | r) >>> 0;
            }
        }
    }

    // Liên Tỏa: tuỳ chọn chung cho hình người và hình hồn ma (cùng mái bằng, tóc dài buộc thấp dải đỏ, áo xám tím, tờ
    // giấy thơ đỏ ở tay phải, tức bên trái tranh); sàn đá Vọng Vân Đình. Hình người có bóng chân. Chi tiết lệch: tay áo
    // bên phải tranh để lọt ánh trăng (một quầng sáng xanh nhạt xuyên qua vải) và một vũng trăng trên sàn ngay dưới.
    function lianPortrait(ghost) {
        var pc = artPal({ g: '#aeb0b9', G: '#989aa4', j: '#62646f',
            s: '#f8ece6', S: '#e5d1c8', r: '#b8988e', q: '#efb4b6',
            e: '#2a2530', h: '#ffffff', i: '#6c6286', I: '#4a405f', m: '#c08488',
            k: '#221e29', K: '#332d3e', H: '#5c556e', D: '#141119',
            a: '#e8e3ef', b: '#cec6da', c: '#a99fbd', d: '#6c6385', w: '#faf9fc', x: '#8b81a5',
            y: '#8d81a6', Y: '#6c6186', f: '#8a829c', F: '#625a78',
            R: '#c63c40', Q: '#8c2633', P: '#d8473c', p: '#b13229', n: '#2b1b1b' });
        var red = {};
        [pc.R, pc.Q, pc.P, pc.p, pc.n].forEach(function (c) { red[c] = 1; });
        return nightGirl(pc, {
            // Sàn đá: phiến vuông, mạch sẫm, hàng so le.
            tex: function (x, y) {
                var row = Math.floor((y - 31) / 3), off = (row & 1) ? 4 : 0;
                if ((y - 31) % 3 === 2 || (x + off) % 8 === 0) return pc.j;
                return hash2(x >> 1, y, 341) < 0.18 ? pc.G : pc.g;
            },
            shadow: !ghost,
            back: function (T) {
                // Tóc dài thẳng buông sau lưng tới ngang hông; dải đỏ buộc thấp ló bên phải cổ, hai đuôi bay chếch lên.
                T.poly([[11.4, 8], [28.6, 8], [29.6, 16], [29.4, 29.4], [27.4, 30.6], [12.6, 30.6], [10.6, 29.4], [10.4, 16]], function (x) {
                    return x < 20 ? pc.K : pc.k;
                });
                artStamp(T, ['..RR', '.RQR', 'RRQ.', 'QR..'], 28, 15, pc);
            },
            front: function (T) {
                // Mái bằng cắt thẳng trên mày (dừng trên mày hai hàng để viền mái không đè lông mày), hai lọn mai ôm má.
                T.poly([[11.6, 12.6], [12, 6.4], [15, 3.4], [20, 2.6], [25, 3.4], [28, 6.4], [28.4, 12.6], [27, 7], [13, 7]], function (x, y) {
                    if (y < 5 && x > 14 && x < 18) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                T.poly([[11.6, 9], [13.6, 9], [13.8, 18.6], [12.4, 19.6], [11.4, 17]], function (x, y) { return y % 4 === 1 ? pc.H : pc.K; });
                T.poly([[28.4, 9], [26.4, 9], [26.2, 18.6], [27.6, 19.6], [28.6, 17]], pc.k);
            },
            face: nightFace(pc, {
                // Mắt buồn: mi trên rủ ở đuôi mắt, viền mi dưới hồng (cười mà mắt đỏ hoe).
                eyes: [['eeee', 'ehii', '.iiI', '.qq.'], ['eeee', 'hiie', 'Iii.', '.qq.']],
                ey: 11, by: 15, mouth: ['mm'], my: 16
            }),
            extra: function (B) {
                // Lông mày mảnh: đầu mày trong nhướng lên (buồn).
                artStamp(B, ['..H', 'HH.'], 14, 8, pc);
                artStamp(B, ['H..', '.HH'], 23, 8, pc);
                // Tờ giấy thơ đỏ cầm ở tay phải (bên trái tranh), một cột chữ mực; bàn tay vẽ lại đè lên góc giấy.
                artPart(B, function (T) {
                    T.rect(8, 25, 4, 7, function (x) { return x === 11 ? pc.p : pc.P; });
                    [[9, 26], [9, 27], [10, 29], [9, 30]].forEach(function (q) { T.set(q[0], q[1], pc.n); });
                }, pc.Q);
                artPart(B, function (T) { T.ellipse(12.4, 28.2, 1.7, 1.3, pc.s); }, pc.r);
                if (ghost) return;
                // Ánh trăng lọt qua tay áo bên phải tranh: một quầng sáng tròn xuyên vải (lõi trắng xanh, viền xanh nhạt);
                // chỉ tô lên pixel vải.
                var cloth = {};
                cloth[pc.a] = cloth[pc.b] = cloth[pc.c] = 1;
                for (var my = 20; my <= 27; my++) {
                    for (var mx = 24; mx <= 30; mx++) {
                        var d = Math.hypot((mx - 26.8) / 2.6, (my - 23.6) / 3.4);
                        if (d > 1 || !cloth[B.get(mx, my)]) continue;
                        B.set(mx, my, d < 0.62 ? NIGHT_ART.moon : NIGHT_ART.moonDim);
                    }
                }
            },
            ghost: ghost ? function (B) {
                ghostFade(B, 28, 33, function (c) { return red[c]; });
            } : null,
            post: function (L) {
                if (!ghost) {
                    // Vũng trăng rơi xuống sàn ngay dưới tay áo (giữa bóng chân, chỗ lẽ ra tối); chỉ tô lên sàn và bóng.
                    var floor = {};
                    floor[pc.g] = floor[pc.G] = floor[pc.j] = floor[NIGHT_ART.shadow] = 1;
                    L.ellipse(28.6, 35.6, 2.8, 1.25, function (x, y, nx, ny) {
                        if (!floor[L.get(x, y)]) return 0;
                        return nx * nx + ny * ny < 0.35 ? NIGHT_ART.moon : NIGHT_ART.moonDim;
                    });
                    return;
                }
                // Hồn ma: vài sợi sương dưới vạt áo thay đôi chân, vài đốm trăng lơ lửng quanh người.
                var mist = u32a('#e3e6f6', 110);
                [[14, 30], [15, 31], [16, 32], [23, 31], [24, 32], [25, 33], [19, 32], [20, 33], [21, 34]].forEach(function (q) {
                    var c = L.get(q[0], q[1]);
                    L.set(q[0], q[1], c ? mixOver(c, mist) : mist);
                });
                [[6, 12], [33, 9], [35, 21], [4, 22], [31, 28]].forEach(function (q) {
                    L.set(q[0], q[1], u32a('#f3fbff', 200));
                });
            }
        });
    }

    // Nhan Như Ngọc: thiếu nữ mặc áo khoác dài ngọc nhạt tay rộng (kiểu bối tử, mở vạt trước lộ váy kem), tóc vấn cài
    // trâm ngọc có hạt rủ, tay phải (bên trái tranh) cầm cuốn sách bìa chàm; sàn ván Tàng Kinh Các, chồng sách bên phải.
    // Chi tiết lệch: một nếp gấp thẳng tắp như giấy gấp vắt ngang gấu áo (nét gấp sẫm, sống gấp sáng, vạt dưới tối
    // một bậc), mép áo khuyết ở hai đầu nếp gấp, góc gấu trái quăn như góc trang.
    function yanPortrait() {
        var pc = artPal({ g: '#7f5c45', G: '#6b4b3b', j: '#3f2c23',
            s: '#fbf0e7', S: '#ecd8ca', r: '#bf9d8b', q: '#f3b9b5',
            e: '#2b2124', h: '#ffffff', i: '#6a4c3e', I: '#45322a', m: '#cf6f78',
            k: '#2a2124', K: '#3f3337', H: '#6a5a60', D: '#171113',
            a: '#e2f1e8', b: '#c4e0d1', c: '#9dcab5', d: '#5c957d', w: '#fbf6e6', x: '#9dcab5',
            y: '#78b89e', Y: '#55927a', f: '#86b8a2', F: '#5a8e78',
            n: '#34466e', N: '#24324f', u: '#f6eed7', U: '#ddd0ae', t: '#c9b98f',
            v: '#8fdcbc', V: '#3f8a6e', o: '#8a5a3a', O: '#5e3c26', l: '#4a5d86' });
        return nightGirl(pc, {
            // Sàn ván Tàng Kinh Các: ván gỗ xếp so le hai hàng pixel.
            tex: function (x, y) {
                var row = Math.floor((y - 31) / 2);
                if ((y - 31) % 2 === 1 && hash2(x >> 3, row, 351) < 0.7) return (x + row * 7) % 13 === 0 ? pc.j : pc.G;
                return ((x + row * 7) % 13 === 0) ? pc.j : (hash2(x, y, 352) < 0.12 ? pc.G : pc.g);
            },
            floor: function (L) {
                // Chồng sách đóng chỉ bên phải: ba cuốn so le, gáy trang kem.
                artPart(L, function (T) {
                    [[31, 33, pc.l], [32, 31, pc.o], [31, 29, pc.n]].forEach(function (b) {
                        T.rect(b[0], b[1], 7, 2, function (x, y) {
                            if (y === b[1] + 1) return x === b[0] + 6 ? pc.U : pc.u;
                            return x === b[0] + 6 ? pc.N : b[2];
                        });
                    });
                }, pc.O);
            },
            shadow: true,
            back: function (T) {
                // Tóc vấn: khối tóc sau đầu và búi cao lệch phải.
                T.ellipse(20, 10.8, 8.6, 8, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
                T.ellipse(22.4, 3.4, 4.6, 3, function (x, y, nx, ny) { return artLit(nx, ny) > 0.45 ? pc.H : (nx < 0 ? pc.K : pc.k); });
            },
            front: function (T) {
                // Mái rẽ lệch trái, vuốt sang hai bên lên búi, lộ trán; trâm ngọc cắm chéo qua búi, chìa ra bên phải,
                // hạt ngọc ở đầu trâm và một hạt rủ.
                T.poly([[11.8, 11.4], [12.2, 6.4], [15, 3.6], [20, 2.8], [25, 3.6], [28, 6.4], [28.2, 11.4], [26.8, 8.4], [24, 6.6],
                    [20.6, 6], [17.6, 6.8], [15.6, 6.4], [13.6, 8.4]], function (x, y) {
                    if (y < 5 && x > 14 && x < 18) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                T.line(22, 5, 28, 2, pc.v);
                T.line(23, 5, 28, 3, pc.V);
                artStamp(T, ['vv.', 'vVv', '..V'], 28, 1, pc);
            },
            face: nightFace(pc, {
                eyes: [['eeee', 'ehii', '.iiI', '..I.'], ['eeee', 'hiie', 'Iii.', '.I..']],
                mouth: ['m.m', '.m.']
            }),
            extra: function (B) {
                // Lông mày cong nhẹ.
                artStamp(B, ['.HH', 'H..'], 14, 8, pc);
                artStamp(B, ['HH.', '..H'], 23, 8, pc);
                // Vạt trước mở của áo khoác: váy kem lộ giữa hai mép áo (đúng hai nếp váy của nightGirl).
                for (var y = 25; y < 34; y++) {
                    var f1 = 18 - (y - 24) * 0.26, f2 = 22 + (y - 24) * 0.26;
                    for (var x = Math.ceil(f1); x < f2 - 0.5; x++) {
                        if (B.get(x, y)) B.set(x, y, x > 20 ? pc.U : pc.u);
                    }
                }
                // Cuốn sách bìa chàm cầm ở tay phải (bên trái tranh): nhãn tên kem, chỉ đóng gáy; bàn tay đè lên mép sách.
                artPart(B, function (T) {
                    T.rect(7, 23, 5, 8, function (x) { return x === 11 ? pc.N : pc.n; });
                    T.rect(8, 24, 1, 4, pc.u);
                    [[11, 24], [11, 27], [11, 29]].forEach(function (q) { T.set(q[0], q[1], pc.t); });
                }, pc.N);
                artPart(B, function (T) { T.ellipse(12.4, 28.2, 1.7, 1.3, pc.s); }, pc.r);
                // Nếp gấp như giấy: một đường gấp thẳng tắp vắt ngang gấu áo, cắt ngang cả nếp vải lẫn váy kem; dưới nếp
                // gấp cả vạt áo tối đi một bậc như mặt giấy gập nghiêng, sống gấp sáng một đoạn; hai đầu nếp gấp mép áo
                // khuyết vào một pixel (viền mực lấp chỗ khuyết); góc gấu trái quăn lên như góc trang sách. Chỉ đổi pixel vải.
                var darker = {};
                darker[pc.a] = pc.b;
                darker[pc.b] = pc.c;
                darker[pc.c] = pc.d;
                darker[pc.u] = pc.U;
                darker[pc.U] = pc.t;
                for (var fy = 32; fy <= 35; fy++) {
                    for (var gx = 12; gx <= 27; gx++) {
                        var c0 = B.get(gx, fy);
                        if (darker[c0]) B.set(gx, fy, darker[c0]);
                    }
                }
                for (var fx = 12; fx <= 27; fx++) {
                    var c1 = B.get(fx, 31);
                    if (darker[c1] || c1 === pc.d || c1 === pc.t) B.set(fx, 31, NIGHT_ART.fold);
                }
                B.px[31 * B.w + 12] = 0;
                B.px[31 * B.w + 27] = 0;
                [14, 15, 16, 17, 18, 19, 20, 21].forEach(function (hx) { if (B.get(hx, 32)) B.set(hx, 32, NIGHT_ART.foldHi); });
                artStamp(B, ['ZY', 'ZZ'], 13, 33, { Z: NIGHT_ART.foldHi, Y: NIGHT_ART.fold });
            }
        });
    }

    // Hình thật của Nhan Như Ngọc: người giấy cắt hình thiếu nữ (dang tay, tay áo rộng, váy xoè) đứng giữa trang sách mở:
    // giấy trắng, viền mực mảnh, tóc tô mực, môi son, chấm ngọc ở trâm; nếp gấp dọc giữa (nửa phải giấy nghiêng nên tối
    // hơn) và nếp gấp ngang ở gấu váy, đúng chỗ nếp gấp trên hình người.
    function yanPaper() {
        var pc = artPal({ p: '#f2e8cd', P: '#e0d3b1', q: '#c4b48e', l: '#a39478', L: '#7e7158',
            w: '#fefdf8', W: '#e8e5da', v: '#bdb7a4', n: '#2b2521', j: '#5aa88a', m: '#c8424a', r: '#f2c4c4' });
        var L = new Layer(0, 0, 40, 40);
        // Sách mở: hai trang hơi cong, gáy sẫm ở giữa, cột chữ mờ, mép trang dày ở hai bên.
        artPart(L, function (T) {
            T.poly([[1.4, 14.2], [10, 12.6], [19.8, 14.8], [19.8, 40], [1.4, 40]], function (x, y) {
                if (x < 3) return (y % 2) ? pc.P : pc.q;
                return x > 17 ? pc.P : pc.p;
            });
            T.poly([[20.2, 14.8], [30, 12.6], [38.6, 14.2], [38.6, 40], [20.2, 40]], function (x, y) {
                if (x > 36) return (y % 2) ? pc.P : pc.q;
                return x < 22 ? pc.P : pc.p;
            });
            T.rect(19, 15, 2, 25, function (x) { return x === 19 ? pc.q : pc.P; });
        }, pc.L);
        [5, 8, 11, 14, 25, 28, 31, 34].forEach(function (cx, k) {
            for (var y = 17; y < 39; y++) {
                if (hash2(cx, Math.floor(y / 2), 361 + k) < 0.22) continue;
                if (y % 2 === 0) L.set(cx, y, pc.l);
            }
        });
        // Người giấy trên lớp riêng: bóng in xuống trang (lệch xuống phải một pixel) rồi tờ giấy, nét mực, viền mực.
        var D = new Layer(0, 0, 40, 40);
        function doll(T, ink) {
            T.ellipse(20, 3.4, 3.2, 2.3, ink ? pc.n : pc.w);
            T.ellipse(20, 9.2, 5.2, 5, pc.w);
            T.poly([[14.4, 15], [25.6, 15], [33.4, 16.2], [37.6, 18.4], [37.2, 21.8], [34.4, 24.2], [32.2, 21.2], [26, 19.6],
                [27, 22.4], [30.6, 34.8], [9.4, 34.8], [13, 22.4], [14, 19.6], [7.8, 21.2], [5.6, 24.2], [2.8, 21.8], [2.4, 18.4], [6.6, 16.2]], pc.w);
            T.rect(18, 13, 4, 3, pc.w);
            T.rect(15, 34, 3, 3, pc.w);
            T.rect(22, 34, 3, 3, pc.w);
        }
        var Sh = new Layer(0, 0, 40, 40);
        doll(Sh, false);
        for (var i = 0; i < 1600; i++) {
            var sx = i % 40, sy = Math.floor(i / 40);
            if (Sh.px[i] && sx < 39 && sy < 39 && L.get(sx + 1, sy + 1)) L.set(sx + 1, sy + 1, pc.q);
        }
        doll(D, true);
        // Nửa phải nghiêng (giấy gấp dọc giữa): tối hơn một bậc; nếp gấp dọc là một đường xám mảnh.
        for (var k = 0; k < 1600; k++) {
            var dx = k % 40;
            if (D.px[k] === pc.w && dx > 20) D.px[k] = pc.W;
            if (D.px[k] && dx === 20 && D.px[k] !== pc.n) D.px[k] = pc.v;
        }
        // Tóc tô mực phần trên đầu, mai tóc hai bên; trâm ngọc cắm qua búi.
        D.ellipse(20, 8.6, 5.4, 4.8, function (x, y, nx, ny) { return ny < -0.42 || (ny < 0.2 && Math.abs(nx) > 0.82) ? pc.n : 0; });
        D.line(22, 2, 25, 3, pc.j);
        // Mắt nhắm cười (nét cong), má son nhạt, môi son, cổ áo chữ V, đai lưng, tay áo; nếp gấp ngang ở gấu váy.
        [[16, 10], [17, 11], [18, 10], [22, 10], [23, 11], [24, 10]].forEach(function (q) { D.set(q[0], q[1], pc.n); });
        D.set(16, 12, pc.r);
        D.set(24, 12, pc.r);
        D.set(20, 12, pc.m);
        D.line(17, 15, 20, 18, pc.n);
        D.line(23, 15, 20, 18, pc.n);
        D.line(14, 21, 26, 21, pc.n);
        D.line(9, 18, 13, 20, pc.v);
        D.line(31, 18, 27, 20, pc.v);
        for (var fx = 10; fx <= 30; fx++) {
            if (!D.get(fx, 30)) continue;
            D.set(fx, 30, pc.v);
        }
        D.outline(pc.n);
        L.blit(D, 0, 0);
        return L;
    }

    // ----- chân dung đợt D: đạo sĩ Lao Sơn, Vương Sinh, Hoa Cô Tử, Nhiếp Tiểu Thiến -----
    // Sân đá Sơn môn (cùng kiểu sàn Họa Bì): phiến đá chữ nhật xếp so le, mạch vữa sẫm; pc cần g, G, j.
    function gateFloor(pc) {
        return function (x, y) {
            var row = Math.floor((y - 31) / 3), off = (row & 1) * 4;
            if ((y - 31) % 3 === 2 || (x + off) % 8 === 0) return pc.j;
            return hash2(Math.floor((x + off) / 8), row, 351) < 0.35 ? pc.G : pc.g;
        };
    }

    // Miếng vá vuông 3×3 trên áo: vải vá nâu, mép phải dưới tối, bốn mũi chỉ ở góc.
    function robePatch(B, x, y, pc) {
        artStamp(B, ['zpz', 'ppP', 'zPz'], x, y, pc);
    }

    // Đạo sĩ Lao Sơn: ông già áo đạo xám có hai miếng vá, búi tóc bạc xuyên trâm gỗ, mày bạc rủ, mắt cười híp, râu trắng
    // dài quá thắt lưng; đứng trên sân đá Sơn môn cạnh bó củi. Chi tiết lệch: một chiếc lông hạc trắng đầu đen chìa ra
    // khỏi miệng tay áo bên phải tranh.
    function laoshanPortrait() {
        var pc = artPal({ g: '#aaa49a', G: '#938c82', j: '#5f5952',
            s: '#f0cfb0', S: '#dcb092', r: '#a8826a', e: '#2a2026', h: '#ffffff', i: '#5a4a44', m: '#9a6a5a', n: '#f1eee6',
            k: '#cfcbc2', K: '#b3aea4', H: '#ece9e2', D: '#68645c',
            a: '#b4b8be', b: '#979ca4', c: '#777c85', d: '#4a4e57', w: '#e6e1d4', x: '#5e636c',
            y: '#4c4038', Y: '#2e2620', f: '#3a332c', F: '#221c16',
            o: '#a07c4a', O: '#6a5030', u: '#d2b07e', l: '#b8946a',
            t: '#fbfaf6', T: '#dedad0', R: '#b2ada2', p: '#a68a62', P: '#7a6448', z: '#dcc8a0' });
        return nightGirl(pc, {
            tex: gateFloor(pc),
            floor: function (L) {
                // Bó củi bên trái: ba khúc chất so le, đầu khúc sáng vân gỗ, hai vòng dây buộc.
                artPart(L, function (T) {
                    [[4, 31, 7], [3, 33, 9], [2, 35, 9]].forEach(function (q) {
                        T.rect(q[0], q[1], q[2], 2, function (x, y, i, j) { return j === 0 ? pc.o : pc.O; });
                        T.set(q[0], q[1], pc.u);
                        T.set(q[0], q[1] + 1, pc.l);
                    });
                    T.rect(7, 31, 1, 6, pc.y);
                    T.rect(9, 33, 1, 4, pc.y);
                }, pc.O);
            },
            shadow: true,
            waist: 5.8,
            back: function (T) {
                T.ellipse(20, 10.8, 8.6, 8, function (x, y, nx) { return nx < 0 ? pc.k : pc.K; });
                // Búi tóc bạc tròn trên đỉnh.
                T.ellipse(20, 2.6, 3.6, 2.6, function (x, y, nx, ny) { return artLit(nx, ny) > 0.45 ? pc.H : (nx < 0 ? pc.k : pc.K); });
            },
            // Mắt cười híp (hai vòng cung), không má hồng; miệng khuất dưới ria.
            face: nightFace(pc, { eyes: [['....', '.ee.', 'e..e', '....'], ['....', '.ee.', 'e..e', '....']], ex: [14, 22], blush: false, mouth: [''] }),
            front: function (T) {
                // Tóc chải ngược lên búi, chân tóc cao lộ trán; tóc mai bạc tới mang tai.
                T.poly([[12, 9], [12.4, 5.6], [15, 3], [20, 2.2], [25, 3], [27.6, 5.6], [28, 9], [26.8, 6.6], [23.6, 4.8], [20, 4.4],
                    [16.4, 4.8], [13.2, 6.6]], function (x, y) {
                    if (y < 4.4 && x > 15 && x < 19) return pc.H;
                    return x < 20 ? pc.k : pc.K;
                });
                artSides(function (s, m) {
                    T.poly(m([[11.6, 7.4], [13.2, 7.4], [13.4, 13.4], [12, 14.4], [11.4, 12]]), s > 0 ? pc.k : pc.K);
                });
            },
            extra: function (B) {
                // Trâm gỗ xuyên qua búi (chỉ thấy hai đầu ló ra hai bên); mày bạc rậm rủ xuống đuôi mắt; nếp nhăn trán; sống mũi.
                artStamp(B, ['Oo'], 14, 2, pc);
                artStamp(B, ['ooO'], 24, 3, pc);
                artStamp(B, ['.nnnn', 'nn...'], 12, 8, pc);
                artStamp(B, ['nnnn.', '...nn'], 23, 8, pc);
                B.line(17, 6, 23, 6, pc.r);
                artStamp(B, ['S', 'S', 'Sr'], 20, 11, pc);
                // Ria rủ hai bên và chòm râu dài thon dần tới quá thắt lưng, sợi râu sẫm xen kẽ.
                artPart(B, function (T) {
                    T.poly([[15.2, 14.6], [24.8, 14.6], [25.6, 18], [24.4, 22.6], [22.4, 26.4], [20.4, 28.6], [19.2, 28], [17.4, 25.6],
                        [15.6, 22], [14.6, 18]], function (x, y) {
                        var c = x < 18.5 ? pc.t : x < 22.5 ? pc.T : pc.R;
                        if (y > 16 && (x + Math.floor(y / 4)) % 4 === 0) c = c === pc.t ? pc.T : pc.R;
                        return c;
                    });
                    T.poly([[16.4, 13.6], [23.6, 13.6], [25.4, 16.6], [23.4, 15.4], [20, 15], [16.6, 15.4], [14.6, 16.6]], function (x) {
                        return x < 20 ? pc.t : pc.T;
                    });
                }, pc.R);
                // Hai miếng vá: trên vạt áo trái và trên tay áo trái tranh.
                robePatch(B, 15, 29, pc);
                robePatch(B, 10, 23, pc);
                // Lông hạc trắng chìa ra khỏi miệng tay áo bên phải tranh: phiến lông chéo lên ngoài, mép dưới xám nhạt, đầu lông đen.
                artStamp(B, [
                    '......TT',
                    '.....ffT',
                    '....fffg',
                    '...fffg.',
                    '..fffg..',
                    '.fffg...',
                    'ffg.....',
                    'fg......'
                ], 28, 20, { f: NIGHT_ART.feather, g: pc.R, T: NIGHT_ART.featherTip });
            }
        });
    }

    // Hình thật của đạo sĩ Lao Sơn: hạc đầu đỏ nhìn nghiêng mỏ bên trái, cổ cong chữ S, đứng trước vầng trăng rằm trên
    // nền trời đêm; một cành thông góc trên trái.
    function cranePortrait() {
        var pc = artPal({ W0: '#121a33', W1: '#18223f', W2: '#1f2b4c', W3: '#28365a', M: '#fbf2d6', m: '#e2d4ae', o: '#c8bc98',
            p: '#1b3a30', P: '#2c5644', Q: '#467f61', t: '#3a2a20',
            w: '#fafaf6', v: '#d8dce2', V: '#aab2bd', k: '#17171d', K: '#30303a', r: '#e0342c', R: '#a51c1c',
            b: '#c8c492', B: '#8e8c60', e: '#0c0c10', E: '#5a5a66', h: '#ffffff' });
        var L = new Layer(0, 0, 40, 40);
        L.poly([[1, 10.6], [2.6, 5.4], [7.4, 2.4], [32.6, 2.4], [37.4, 5.4], [39, 10.6], [39, 40], [1, 40]], function (x, y) {
            var t = y / 40 + (vnoise(x * 0.3, y * 0.5, 371) - 0.5) * 0.14;
            return t < 0.3 ? pc.W0 : t < 0.55 ? pc.W1 : t < 0.8 ? pc.W2 : pc.W3;
        });
        // Trăng rằm sau đầu hạc, mép sáng, vài vệt mờ.
        L.ellipse(27, 13, 7.4, 7.4, function (x, y, nx, ny) {
            if (nx * nx + ny * ny > 0.82) return pc.m;
            return hash2(x >> 1, y >> 1, 373) < 0.12 ? pc.o : pc.M;
        });
        // Cành thông góc trên trái.
        artPart(L, function (T) {
            T.line(2, 9, 12, 5, pc.t);
            [[5, 6, 3.6, 1.8], [10, 4, 3.2, 1.6], [3, 10, 2.8, 1.4]].forEach(function (q) {
                T.ellipse(q[0], q[1], q[2], q[3], function (x, y, nx, ny) { return ny < -0.2 ? pc.Q : (ny < 0.4 ? pc.P : pc.p); });
            });
        });
        var B = new Layer(0, 0, 40, 40);
        // Thân trắng, lông đuôi đen rủ phía sau (bên phải tranh).
        artPart(B, function (T) {
            T.ellipse(27, 37, 12.4, 8.4, function (x, y, nx, ny) { return ny < -0.3 && nx < 0.3 ? pc.w : (nx > 0.4 ? pc.V : pc.v); });
            T.poly([[33, 31], [39, 33], [39, 40], [31, 40], [34, 36]], function (x, y) { return (x + y) % 3 === 0 ? pc.K : pc.k; });
        }, pc.V);
        // Cổ cong chữ S: mặt trước đen, vệt trắng chạy dọc gáy (phía sau, bên phải tranh).
        artPart(B, function (T) {
            [[22, 32], [20.4, 29], [19, 26], [18, 23], [17.6, 20], [17, 17], [15.8, 14]].forEach(function (q) {
                T.ellipse(q[0], q[1], 2.7, 2.2, function (x) { return x + 0.5 - q[0] > 0.7 ? pc.w : (x + 0.5 - q[0] > -0.6 ? pc.K : pc.k); });
            });
        }, pc.e);
        // Đầu: chỏm đỏ, mặt đen, mảng trắng sau mắt; mắt có viền xám, đốm sáng.
        artPart(B, function (T) {
            T.ellipse(14.6, 12, 4.2, 3.3, function (x, y, nx, ny) {
                if (ny < -0.35 && nx > -0.7) return ny < -0.7 ? pc.R : pc.r;
                return nx > 0.35 ? pc.w : pc.k;
            });
        }, pc.e);
        artStamp(B, ['.vv.', 'vehv', '.vv.'], 12, 10, pc);
        // Mỏ dài màu ô liu, hàm trên sáng, hàm dưới tối, chĩa xuống trái.
        artPart(B, function (T) {
            T.line(11, 12, 2, 15, pc.b);
            T.line(11, 13, 3, 15, pc.B);
            T.set(11, 11, pc.b);
        }, pc.e);
        B.outline(C.ink);
        L.blit(B, 0, 0);
        return L;
    }

    // Vương Sinh: học trò trẻ áo xanh nhạt khăn búi xanh, vừa lao đầu vào tường: cục u đỏ to giữa trán, mắt nhắm tịt,
    // mày chau, miệng méo, nước mắt ứa; đứng trên sân đá Sơn môn. Chỉ có chân dung (khách cameo).
    function wangshengPortrait() {
        var pc = artPal({ g: '#aaa49a', G: '#938c82', j: '#5f5952',
            s: '#f6dcc6', S: '#e4c0a8', r: '#b08a74', q: '#f2b0a0', e: '#262a36', h: '#ffffff', i: '#3e4a5e', m: '#9c4a46',
            n: '#2c3240', k: '#1c1a22', K: '#2e2a36', H: '#5a566a', D: '#0e0c12',
            a: '#e4eef0', b: '#c0d2da', c: '#93abb8', d: '#5a7484', w: '#ffffff', x: '#7790a2',
            y: '#55697c', Y: '#3c4e60', f: '#3a3440', F: '#24202a',
            o: '#e0453c', O: '#a82a2a', l: '#ff9e8c', t: '#a6dcf4', u: '#7aa0c0', U: '#4f7496' });
        return nightGirl(pc, {
            tex: gateFloor(pc),
            shadow: true,
            waist: 4.8,
            back: function (T) {
                T.ellipse(20, 10.6, 8.6, 8, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
                // Búi tóc trên đỉnh quấn khăn xanh học trò.
                T.ellipse(20, 2.4, 3.4, 2.4, function (x, y, nx) { return nx < -0.2 ? pc.u : pc.U; });
            },
            // Mắt nhắm tịt vì đau (hai dấu > <), miệng méo há.
            face: nightFace(pc, { eyes: [['....', 'ee..', '..ee', 'ee..'], ['....', '..ee', 'ee..', '..ee']], ex: [14, 22], mouth: ['.mm.', 'm..m'], mx: 18 }),
            front: function (T) {
                // Tóc chải ngược lên búi, chân tóc cao: cả vầng trán (chỗ cục u) lộ ra.
                T.poly([[12, 9.4], [12.4, 5.6], [15, 3], [20, 2.2], [25, 3], [27.6, 5.6], [28, 9.4], [26.8, 6.4], [23.4, 4.6], [20, 4.2],
                    [16.6, 4.6], [13.2, 6.4]], function (x, y) {
                    if (y < 4.2 && x > 15 && x < 19) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                artSides(function (s, m) {
                    T.poly(m([[11.8, 7.6], [13.2, 7.6], [13.2, 12.6], [12, 13.4]]), s > 0 ? pc.K : pc.k);
                });
            },
            extra: function (B) {
                artStamp(B, ['n...', '.nnn'], 13, 8, pc);
                artStamp(B, ['...n', 'nnn.'], 23, 8, pc);
                // Cục u đỏ giữa trán, đốm sáng trên trái.
                artPart(B, function (T) {
                    T.ellipse(20, 6.2, 2.6, 2.2, function (x, y, nx, ny) {
                        if (nx < -0.1 && ny < -0.1) return pc.l;
                        return nx > 0.35 || ny > 0.45 ? pc.O : pc.o;
                    });
                }, pc.O);
                // Nước mắt ứa ở đuôi mắt.
                [[12, 13], [12, 14], [28, 13], [28, 14], [27, 15]].forEach(function (q) { B.set(q[0], q[1], pc.t); });
            },
            post: function (L) {
                // Ba vạch đau toé ra trên đầu, ngoài hình.
                [[[12, 2], [13, 3]], [[27, 2], [26, 3]], [[30, 6], [29, 6]]].forEach(function (seg) {
                    seg.forEach(function (q) { L.set(q[0], q[1], pc.o); });
                });
            }
        });
    }

    // Hoa Cô Tử: cô gái áo nâu nhạt chấm trắng thắt dải nâu sẫm, tóc nâu hạt dẻ hai búi cài lá, mắt to tròn hiền, tay phải
    // (bên trái tranh) xách giỏ tre đầy cây thuốc; đứng trên luống đất Vườn rau. Chi tiết lệch: một cái tai hươu có lông lộ
    // ra sau mái tóc bên phải tranh.
    function huaguPortrait() {
        var pc = artPal({ g: '#6e5038', G: '#5a4030', j: '#38281c', l: '#86b85a', L: '#477a32',
            s: '#f8e4d2', S: '#e8cab4', r: '#bc947e', q: '#f4aaa2',
            e: '#2a2026', h: '#ffffff', i: '#6e4a38', I: '#4a3028', m: '#c8706a', n: '#3e2a20',
            k: '#3e2a20', K: '#5a3e2e', H: '#8c6448', D: '#22150e',
            a: '#e2b892', b: '#c8986e', c: '#a0704c', d: '#6a442c', w: '#fbf3e4', x: '#7a5236',
            y: '#7e4c2e', Y: '#5a3420', f: '#6a4a34', F: '#4a3020',
            u: '#e6c67e', U: '#9c7638', v: '#c49a52', o: '#5ea848', O: '#3a7a34', z: '#fbfbf2', Z: '#f0d04a' });
        return nightGirl(pc, {
            // Luống đất Vườn rau: vồng đất chạy ngang, rãnh sẫm; vài mầm cây thuốc.
            tex: function (x, y) {
                var v = (y - 31) % 4;
                if (v === 3) return pc.j;
                if (v === 0 && hash2(x, y, 411) < 0.5) return pc.g;
                return hash2(x, y, 412) < 0.16 ? pc.g : pc.G;
            },
            floor: function (L) {
                [[30, 34], [34, 37], [26, 38]].forEach(function (p) { artStamp(L, ['l.l', '.L.'], p[0], p[1], pc); });
            },
            shadow: true,
            waist: 4.4,
            back: function (T) {
                // Tai hươu vẽ trước khối tóc nên gốc tai khuất sau đầu, chỉ đầu tai lòi ra: lông nâu, lòng tai hồng.
                var cx = 30.4, cy = 10.6, ca = Math.cos(-0.45), sa = Math.sin(-0.45);
                for (var y = 5; y <= 15; y++) {
                    for (var x = 25; x <= 36; x++) {
                        var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
                        var u = (dx * ca + dy * sa) / 3.7, v = (-dx * sa + dy * ca) / 1.7;
                        if (u * u + v * v > 1) continue;
                        T.set(x, y, Math.abs(v) < 0.42 && u > -0.4 && u < 0.7 ? NIGHT_ART.earIn : NIGHT_ART.ear);
                    }
                }
                T.ellipse(20, 11, 8.8, 8.4, function (x, y, nx) { return nx < 0 ? pc.K : pc.k; });
                // Hai búi tròn trên đỉnh.
                [[13.4, 3.6], [26.6, 3.6]].forEach(function (q) {
                    T.ellipse(q[0], q[1], 3.2, 2.9, function (x, y, nx, ny) { return artLit(nx, ny) > 0.45 ? pc.H : (nx < 0 ? pc.K : pc.k); });
                });
            },
            face: nightFace(pc, {
                eyes: [['.eee.', 'ehhie', 'eiiIe', '.III.'], ['.eee.', 'ehhie', 'eiiIe', '.III.']], ex: [13, 22],
                mouth: ['m..m', '.mm.'], mx: 18
            }),
            front: function (T) {
                // Mái thưa rẽ lệch phải, vén sau tai.
                T.poly([[12, 11.4], [12.4, 6.4], [15.2, 3.6], [20, 2.8], [25, 3.6], [27.8, 6.4], [28.2, 11.4], [26.8, 8.6], [24.4, 7.6],
                    [22.2, 8.6], [20.4, 7.4], [18.4, 8.4], [16.6, 7.2], [14.6, 7.8], [13.2, 9.4]], function (x, y) {
                    if (y < 5.4 && x > 15 && x < 19) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
            },
            extra: function (B) {
                // Lá cài trên hai búi.
                artStamp(B, ['.ll', 'lLL', 'L..'], 10, 0, pc);
                artStamp(B, ['ll.', 'LLl', '..L'], 27, 0, pc);
                artStamp(B, ['.nn', 'n..'], 14, 8, pc);
                artStamp(B, ['nn.', '..n'], 23, 8, pc);
                // Chấm trắng rải trên vải áo (như lông hươu).
                var cloth = {};
                cloth[pc.a] = cloth[pc.b] = cloth[pc.c] = 1;
                for (var y = 19; y < 35; y++) {
                    for (var x = 8; x < 33; x++) {
                        if (cloth[B.get(x, y)] && (x * 3 + y * 5) % 11 === 0) B.set(x, y, pc.w);
                    }
                }
                // Giỏ tre xách bên trái tranh: quai cong, thân đan nan, cây thuốc và hoa trắng, một bông vàng chìa lên.
                artPart(B, function (T) {
                    T.line(4, 27, 7, 23, pc.U);
                    T.line(8, 23, 11, 27, pc.U);
                    T.rect(7, 22, 1, 1, pc.U);
                    [[4, 24], [5, 22], [6, 25], [8, 24], [9, 25]].forEach(function (q, k) {
                        T.line(q[0], 27, q[0] + (k % 2 ? 1 : -1), q[1], k % 2 ? pc.O : pc.o);
                    });
                    artStamp(T, ['z.', '.z'], 5, 21, pc);
                    T.set(10, 23, pc.Z);
                    T.rect(3, 27, 10, 7, function (x, y, i, j) {
                        if (j === 0) return pc.U;
                        if ((i === 0 || i === 9) && j === 6) return 0;
                        return (i + j) % 2 ? pc.v : (i > 6 ? pc.U : pc.u);
                    });
                }, pc.Y);
                artPart(B, function (T) { T.ellipse(12.6, 27.6, 1.6, 1.3, pc.s); }, pc.r);
            }
        });
    }

    // Hình thật của Hoa Cô Tử: hươu xạ con nhìn thẳng, tai to xoè ngang lòng hồng, mắt to đen bóng, mõm trắng ngậm một
    // nhánh cây thuốc hoa trắng, cổ nâu lốm đốm trắng, yếm trắng.
    function fawnPortrait() {
        var pc = artPal({ D: '#3a2214', d: '#7a4a28', f: '#a8683a', F: '#c48450', G: '#dca06a',
            w: '#fbf3e4', W: '#e6d6bc', p: '#f2b8a8', q: '#d88878', e: '#140e0c', E: '#3e2c24', h: '#ffffff',
            n: '#22160f', N: '#5a463c', l: '#86b85a', L: '#477a32', z: '#fbfbf2', y: '#f0d04a' });
        var L = new Layer(0, 0, 40, 40);
        function fur(t) { return t < 0.16 ? pc.d : t < 0.66 ? pc.f : t < 0.88 ? pc.F : pc.G; }
        // Cổ và vai: lông nâu đốm trắng, yếm trắng giữa ngực.
        artPart(L, function (T) {
            var N = artNorm(20, 36, 14, 10);
            T.poly([[6, 40], [8.6, 32], [13.4, 26.6], [26.6, 26.6], [31.4, 32], [34, 40]], function (x, y) {
                var n = N(x, y);
                if (x > 15.6 && x < 24.4 && y > 30 && Math.abs(x + 0.5 - 20) < 4.4 - (y - 30) * 0.12) return x > 21 ? pc.W : pc.w;
                if (((x * 7 + y * 3) % 13 === 0) && y > 29) return pc.w;
                return fur(artLit(n[0], n[1]));
            });
        }, pc.D);
        // Tai to xoè ngang hai bên, lòng tai hồng viền lông trắng.
        artSides(function (s, m) {
            artPart(L, function (T) {
                T.poly(m([[3.4, 13.4], [6.4, 8.6], [12.6, 8.2], [16, 11.4], [12.6, 15], [7.4, 15.6]]), function (x, y) {
                    return y < 11 ? pc.F : (s > 0 ? pc.f : pc.d);
                });
            }, pc.D);
            L.poly(m([[5.8, 12.6], [7.8, 10], [12, 9.8], [14, 11.6], [11.6, 13.6], [7.8, 14]]), function (x, y) { return y < 11 ? pc.q : pc.p; });
        });
        // Đầu: trán rộng, mõm thon xuống; đốm sáng trán; mõm trắng.
        artPart(L, function (T) {
            T.ellipse(20, 15, 8.4, 8.4, function (x, y, nx, ny) { return fur(artLit(nx, ny)); });
            T.poly([[14.6, 17], [25.4, 17], [24.4, 24.6], [20, 27.6], [15.6, 24.6]], function (x, y) {
                return y > 22 ? (x > 21 ? pc.W : pc.w) : (x < 20 ? pc.F : pc.f);
            });
            artStamp(T, ['.ww.', 'wWWw'], 18, 9, pc);
        }, pc.D);
        // Mắt to đen bóng, hai đốm sáng; mi dưới nâu; mũi đen bóng; miệng.
        var eye = ['.eee.', 'eEhhe', 'eEhee', 'eeeee', '.eee.'];
        artStamp(L, eye, 12, 14, pc);
        artStamp(L, eye, 23, 14, pc);
        artStamp(L, ['.nnnn.', 'nNnnNn', '.nnnn.'], 17, 22, pc);
        artStamp(L, ['n..n', '.nn.'], 18, 25, pc);
        // Nhánh cây thuốc ngậm ở khoé miệng bên phải tranh: cọng xanh, ba lá, chùm hoa trắng nhuỵ vàng.
        artPart(L, function (T) {
            T.line(21, 26, 31, 22, pc.L);
            artStamp(T, ['.l.', 'lLl'], 24, 22, pc);
            artStamp(T, ['ll', '.L'], 28, 24, pc);
            artStamp(T, ['.z.', 'zyz', '.z.'], 31, 20, pc);
        }, pc.L);
        L.outline(C.ink);
        return L;
    }

    // Nhiếp Tiểu Thiến: thiếu nữ áo trắng ngà viền xanh nhạt, tóc đen dài buông (một lọn rủ trước vai trái tranh), mặt nhợt
    // không má hồng, mắt buồn; tay phải (bên trái tranh) cầm thỏi vàng; đứng trên chiếu Thư trai, sau vai phải là cây đèn
    // dầu (ngọn lửa ló bên vai, chân đèn dưới tay áo). Chi tiết lệch: ánh đèn xuyên qua vai phải như qua giấy. ghost: hình
    // thật hồn ma, cả người trong suốt, không chân; thỏi vàng và ngọn đèn giữ sắc.
    function xiaoqianPortrait(ghost) {
        var pc = artPal({ g: '#c8b27c', G: '#ad9762', j: '#6c5a36',
            s: '#f6efec', S: '#e2d6d4', r: '#b4a2a4', e: '#1c1a26', h: '#ffffff', i: '#4a4660', I: '#2e2a40', m: '#b06a76',
            n: '#2a2638', k: '#16141e', K: '#262334', H: '#4a4660', D: '#0a080e',
            a: '#f8f2e2', b: '#e8dec8', c: '#cdc1a6', d: '#8f8670', w: '#a9cfe0', x: '#7fa9c2',
            y: '#a9cfe0', Y: '#7fa9c2', f: '#8d97a6', F: '#636c7c',
            o: '#f2c94c', O: '#b8892c', u: '#fff0a0', t: '#5a3e2a', T: '#3a281a', l: '#ffcf70', L: '#e08a3a' });
        var keep = {};
        [pc.o, pc.O, pc.u, pc.l, pc.L, C.glow[2], C.glow[3]].forEach(function (c) { keep[c] = 1; });
        return nightGirl(pc, {
            // Chiếu cói Thư trai: nan đan chéo hai màu.
            tex: function (x, y) {
                var u = Math.floor((x + y) / 2), v = Math.floor((x - y + 40) / 2);
                if ((u + v) % 2 === 0) return (x + y) % 2 ? pc.G : pc.g;
                return (x - y) % 2 ? pc.g : pc.G;
            },
            floor: function (L) {
                // Cây đèn dầu đứng sau vai phải: chân đế, cột gỗ, đĩa dầu, ngọn lửa (phần lớn khuất sau người).
                artPart(L, function (T) {
                    T.ellipse(30.6, 36.6, 2.6, 1, pc.T);
                    T.rect(30, 19, 2, 18, function (x) { return x === 30 ? pc.t : pc.T; });
                    T.rect(28, 18, 6, 1, pc.T);
                    artStamp(T, ['.l.', 'lul', 'LlL'], 29, 15, pc);
                    T.set(30, 14, C.glow[3]);
                }, pc.T);
            },
            shadow: !ghost,
            waist: 4.4,
            back: function (T) {
                // Tóc đen dài thẳng buông sau lưng tới ngang hông.
                T.poly([[11, 8.4], [29, 8.4], [30.2, 18], [29.8, 30.6], [27.4, 31.8], [12.6, 31.8], [10, 30.6], [9.6, 18]], function (x, y) {
                    if (y > 12 && x % 6 === 4) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
            },
            // Mắt buồn: mi trên rủ ở đuôi, mi dưới nhạt; không má hồng.
            face: nightFace(pc, { eyes: [['eeee', 'ehii', '.iiI', '....'], ['eeee', 'hiie', 'Iii.', '....']], ey: 11, my: 16, blush: false }),
            front: function (T) {
                // Tóc rẽ ngôi giữa ôm mặt; lọn dài rủ trước vai trái tranh tới ngang hông, lọn bên phải nằm sau vai.
                T.poly([[11.8, 12.6], [12, 6.6], [14.6, 3.6], [20, 2.4], [25.4, 3.6], [28, 6.6], [28.2, 12.6], [26.8, 9.4], [24.6, 6.6],
                    [21, 5.2], [20, 5.8], [19, 5.2], [15.4, 6.6], [13.2, 9.4]], function (x, y) {
                    if (y < 5 && x > 14 && x < 18) return pc.H;
                    return x < 20 ? pc.K : pc.k;
                });
                T.poly([[11.6, 10.6], [13.8, 10.6], [14.6, 19], [14.2, 26.6], [12.6, 28.2], [11.6, 24], [11, 17]], function (x, y) {
                    return y % 4 === 1 ? pc.H : pc.K;
                });
                T.poly([[28.2, 10.6], [26.4, 10.6], [26.2, 17.4], [27.2, 19], [28.6, 17]], pc.k);
            },
            extra: function (B) {
                artStamp(B, ['..n', 'nn.'], 14, 8, pc);
                artStamp(B, ['n..', '.nn'], 23, 8, pc);
                // Thỏi vàng (nguyên bảo) cầm ở tay bên trái tranh, bàn tay đè lên mép thỏi.
                artPart(B, function (T) { artStamp(T, ['o..uo', 'ouoOo', '.OOO.'], 8, 28, pc); }, pc.O);
                artPart(B, function (T) { T.ellipse(12.8, 28.6, 1.6, 1.3, pc.s); }, pc.r);
                if (ghost) return;
                // Vai phải trong như giấy: chỗ cây đèn đứng sau lưng, vải để lọt ngọn lửa (lõi) và quầng ấm; chỉ tô lên vải.
                var cloth = {};
                cloth[pc.a] = cloth[pc.b] = cloth[pc.c] = 1;
                for (var y = 18; y <= 25; y++) {
                    for (var x = 23; x <= 31; x++) {
                        var d = Math.hypot((x + 0.5 - 26.8) / 2.8, (y + 0.5 - 21.4) / 3);
                        if (d > 1 || !cloth[B.get(x, y)]) continue;
                        B.set(x, y, d < 0.5 ? NIGHT_ART.lampCore : NIGHT_ART.lampHalo);
                    }
                }
            },
            ghost: ghost ? function (B) {
                ghostFade(B, 28, 33, function (c) { return keep[c]; });
            } : null,
            post: function (L) {
                // Quầng đèn ấm mờ quanh ngọn lửa (chỉ chỗ trống, ngoài người).
                var glow = u32a('#ffcf70', 80);
                for (var y = 11; y <= 20; y++) {
                    for (var x = 27; x <= 36; x++) {
                        var d = Math.hypot(x + 0.5 - 30.5, (y + 0.5 - 15.5) * 1.2);
                        if (d < 4.6 && !L.get(x, y)) L.set(x, y, glow);
                    }
                }
                if (!ghost) return;
                // Hồn ma: sương thay đôi chân.
                var mist = u32a('#e3e6f6', 110);
                [[14, 30], [15, 31], [16, 32], [23, 31], [24, 32], [25, 33], [19, 32], [20, 33], [21, 34]].forEach(function (q) {
                    var c = L.get(q[0], q[1]);
                    L.set(q[0], q[1], c ? mixOver(c, mist) : mist);
                });
            }
        });
    }

    // Chân dung dạng lưới ký tự: ảnh AI (media MCP) đã nắn về khung 40×40 bằng tools/quy-van/ai-pixel.mjs (snap, khối
    // .txt dán vào đây). Mỗi mục { pal: { chữ: '#rrggbb' hoặc '#rrggbbaa' }, rows: 40 chuỗi 40 ký tự }, '.' trong suốt;
    // '#rrggbbaa' cho phần bán trong suốt (hồn ma). Khoá như PORTRAITS ('id' hình người, 'id:true' hình thật). Mục ở đây
    // thay chân dung vẽ bằng code cùng khoá, nên REVEAL_ZONES của khách đó phải đặt lại theo tranh mới (vùng đầu tiên vẫn
    // là chi tiết lệch, và chi tiết ấy phải có trong tranh).
    var PIXEL_PORTRAITS = {
        // Nhiếp Tiểu Thiến (15/10/2026, ảnh AI codex qua khuôn chân dung Hồ Tiểu Nguyệt, nắn từ lưới 62 ô): búi tóc lụa đỏ,
        // lọn tóc trước vai trái tranh, thỏi vàng góc dưới trái, đèn lồng sau vai phải. Chi tiết lệch: hoa văn đèn in xuyên
        // qua vai phải, tô đúng NIGHT_ART.lampCore (y) và lampHalo (z), chỉ nằm trong vùng reveal đầu tiên.
        'xiaoqian': {
            pal: { a: '#3e3937', b: '#211916', c: '#e92e2a', d: '#ae2320', e: '#e2d3b2', f: '#fbeddd', g: '#f7d8aa',
                h: '#c89a81', i: '#583218', j: '#fcf9ef', k: '#895723', l: '#fbd357', m: '#ca891e', n: '#fdfab9',
                o: '#95aac9', p: '#c7d0dd', y: '#fff3c0', z: '#f2b866' },
            rows: [
                '....................aabbab..............',
                '...................aaaaabbb.............',
                '..................babbabbbb.............',
                '..............bbbbbcccccbbbb............',
                '...........baaaaaabbaabdcccb............',
                '..........baaaabbaaaaaabbccb............',
                '.........bbaabbbbbbaaaaaabbcb...........',
                '........babaaabbbaaaaaababbcb...........',
                '........aababbbbbbbaaaabbbbbdd..........',
                '.......aaaaabbebbbbbaaaabbbbdd..........',
                '.......abaaaabbbbaabbaaaabbbbdbb........',
                '......babaaabbfgbbaabbbaabbbbdbb........',
                '......bbaaabfffffhbaabbbaabbbdcb........',
                '......baaabgfffffgbaabbbbbbbbbccb.......',
                '......baaaggfffffggbabaabbbbb.ccb.b.....',
                '......aabbbffffffffgbbbaaabbb.ccb.ib....',
                '......aabbfffffffbbghabababbb.cc..ib....',
                '......bbbbbbbfffffffgbabaaabb.b..bbb....',
                '......bbbbjjbffffbbffbabbbbbb...ikkib...',
                '......bbbbjkbffffbjibbabggbb..bikkiiiib.',
                '.......bbbhkbffffbiibbbbifbb.blmllmllmib',
                '........bbfffffffbkbfbagffaaimllnnlnnllm',
                '........abfffkfffffffbbgfbbabllnnnlnnnll',
                '........aafffffffffffbabbbaabllnnnlnnnll',
                '........abbfffdffffffbabbbbbbblnnnlnnnll',
                '........aabbffffffffibabbbbbabnnnnlnnnll',
                '.......baabbbfffffeggbaobbbbabllllllnlll',
                '.......baabbbbbbbgggfbaojeeebannnnlnnnll',
                '......baabbffpofhggffbajjezyzyblnnlllnll',
                '......baabbffjoffgffpbajjzyyeeybnnlnnnll',
                '.....baabbjjjjopjhfoobajeyzzyzzylylllllm',
                '....bbaabbjjjjjppjhopbajeyyyyzyzlllllll.',
                '...mlnmikkkbjjpppjojjbaeezzzzzzzbiiiib..',
                '..bmllnijjlljbbjpjojjajeyzyyyzyyybkki...',
                '..kkmmkljlllillijopjjajjjzyyyzyyzyikb...',
                '.bffmmlmlllmmlmijojjjajjjzzzzzzzeybkb...',
                '.biiimllllllkkijofjjfajjjezyyzyyeebbb...',
                '.bfffillllmkfffbojjjpajjjjezyzyzeefbb...',
                '.pgfffllllkkiffffjjppbajjjjeeeeffefjib..',
                '.pggffmllmkffffffbjpfbbjjjjjeefffpfjbb..'
            ]
        },
        // Hình thật: hồn ma cùng dáng, lam nhạt bán trong suốt (alpha d2, viền sáng 9c), gấu áo tan thành sương; đèn lồng và
        // thỏi vàng giữ màu đặc. Không có màu chi tiết lệch của hình người.
        'xiaoqian:true': {
            pal: { a: '#5a7d9ad2', b: '#a8c6e0d2', c: '#c6f9fd9c', d: '#7394b1d2', e: '#e9f6fcd2', f: '#cce5f6d2', g: '#88aecfd2',
                h: '#381e0e', i: '#613615', j: '#8c551b', k: '#ee9336', l: '#fce069', m: '#fdfbbc', n: '#fcd244',
                o: '#c88e0e' },
            rows: [
                '...................abbbbaaa.............',
                '..................cbbbbbddac............',
                '................ccabddbdddda............',
                '............ccaaaaaefffeddddc...........',
                '...........abbbbbbddbbafeeedc...........',
                '..........abbbbddbbbbbbaaeeac...........',
                '.........addbddddddbbbbbbdaeac..........',
                '........abdbbbdddbbbbbbdbddeac..........',
                '.......cbbdbddgddddbbbbddddaffc.........',
                '......cabddbddfddddbbbbbddddffc.........',
                '......cabdbbbddddbbddbbbbdddafaa........',
                '......abdbbbdaefadbbdddbbdddafda........',
                '......adbbbfeeeeebabbdddbbddafedc.......',
                '......abbbafeeeeefabbdbddddddaeea.......',
                '.....cdbbbffeeeeeffdbdbbdddddceeachh....',
                '.....cbbddaaeeeeeeefaddbdbbdaceeaci.....',
                '.....cbbdaeeeeeeeaaffbdbgbbdaceec.i.....',
                '.....cdddaaaaeeeeeeefabddbbddcac..hh....',
                '......addaeeaeeeeaaeeabaadddacc.ijjih...',
                '......adddegaeeeeaedaabaeeadc.hijjiiii..',
                '......cadgfgaeeeeaddaabadeaachkkllkllki.',
                '.......cdaeeeeeeeabaeabeeebbckllmmkmmlnk',
                '.......cbaeeeeeeeeeeeadeeadbaclmmmkmmmln',
                '.......cbbeeeeeeeeeeeabaadbbaclmmmkmmmll',
                '.......cbbdeeeddeeeeeabadddbaammmmkmmmll',
                '.......cbbddeeeeeeeedabaadddbammmmnmmmll',
                '.......abbddddeeeefffabeadddbbcnnnnnnnnn',
                '......cabbdddddddfffeabgefdddbcmmmnmmmll',
                '......abbddbffgfgffeeabeefffffacnnnnnnnn',
                '.....cdbbddeeegfffeegabeeffeefdammnmmmll',
                '.....abbddefeegbegeegabeefeefffdclkllnnk',
                '...chhbbddefeeebbegggabefeefeeffcnkllnk.',
                '..honmoijjjheebbbegeeabefefeeefediihhh..',
                '..honnmieennehhebegeebdfeefeeefebdjji...',
                '.cjjooonennninniegbefbdeefeeeeebeeifh...',
                '.aeeoononnnoonoiegeefbdeeeeebbeef.beh...',
                '.ajjjonnnnnnjjjegfeffbbdeeebeeebeefh....',
                '.aeeeinnnnojeeeageeffdgddeeebeffbbe..f..',
                'ceeeeennnnjddeeeeeefeeebdeebef..fff.....',
                'ceeeefonnojeeeeeeffeb.edde..e.f..f..e...'
            ]
        }
    };

    function pixelPortrait(def) {
        var h = def.rows.length, w = h ? def.rows[0].length : 0;
        if (w !== 40 || h !== 40) throw new Error('pixelPortrait: cần 40×40, nhận ' + w + '×' + h);
        var pc = {};
        Object.keys(def.pal).forEach(function (k) {
            var hex = def.pal[k];
            pc[k] = hex.length === 9 ? u32a(hex.slice(0, 7), parseInt(hex.slice(7), 16)) : u32(hex);
        });
        var L = new Layer(0, 0, w, h);
        def.rows.forEach(function (row, y) {
            if (row.length !== w) throw new Error('pixelPortrait: hàng ' + y + ' dài ' + row.length);
            for (var x = 0; x < w; x++) {
                var ch = row.charAt(x);
                if (ch === '.') continue;
                if (!pc[ch]) throw new Error('pixelPortrait: thiếu màu cho "' + ch + '"');
                L.px[y * w + x] = pc[ch];
            }
        });
        return L;
    }

    Object.keys(PIXEL_PORTRAITS).forEach(function (key) {
        PORTRAITS[key] = function () { return pixelPortrait(PIXEL_PORTRAITS[key]); };
    });

    var portraitCache = {};
    // Chân dung của khách (id trong story.guests); không có thì trả null để giao diện dùng sprite.
    // form === 'true': hình thật của khách đêm (khoá `id:true`); mặc định hình người. Cache theo khoá đầy đủ.
    function portraitLayer(id, form) {
        var key = form === 'true' && PORTRAITS[id + ':true'] ? id + ':true' : id;
        if (!PORTRAITS[key]) return null;
        if (!portraitCache[key]) portraitCache[key] = PORTRAITS[key]();
        return portraitCache[key];
    }

    // Vùng chạm của bước reveal trên chân dung hình người (toạ độ khung 40×40). Vùng đầu tiên là chi tiết
    // lệch thật; hai vùng sau là chỗ nhử, có chi tiết bình thường. Ba vùng không chồng nhau, mỗi vùng ≥ 8×8.
    var REVEAL_ZONES = {
        bach: [{ id: 'wrist', x: 25, y: 24, w: 11, h: 9 }, { id: 'hair', x: 11, y: 0, w: 18, h: 8 }, { id: 'sleeve', x: 3, y: 21, w: 11, h: 10 }],
        ta: [{ id: 'shadow', x: 11, y: 32, w: 18, h: 8 }, { id: 'eyes', x: 12, y: 8, w: 16, h: 8 }, { id: 'collar', x: 13, y: 17, w: 14, h: 8 }],
        luc: [{ id: 'wings', x: 28, y: 5, w: 11, h: 15 }, { id: 'waist', x: 15, y: 21, w: 10, h: 8 }, { id: 'hem', x: 10, y: 30, w: 20, h: 9 }],
        // Đợt C. Vương Lục Lang: nước nhỏ ở mai tóc và vai phải; nhử ở cổ áo và ống quần ướt (ướt vì ngồi thõng chân
        // xuống hồ, đã kể ở đêm 1). Họa Bì: mép da ở cằm; nhử ở trâm và đai vàng. Hương Ngọc: cánh hoa ở chân tóc;
        // nhử ở bông mẫu đơn cài tóc và đai hồng.
        wang: [{ id: 'drip', x: 26, y: 12, w: 9, h: 19 }, { id: 'collar', x: 15, y: 17, w: 9, h: 8 }, { id: 'legs', x: 13, y: 31, w: 12, h: 8 }],
        huapi: [{ id: 'seam', x: 9, y: 12, w: 8, h: 8 }, { id: 'pin', x: 22, y: 0, w: 10, h: 9 }, { id: 'belt', x: 14, y: 21, w: 12, h: 8 }],
        xiangyu: [{ id: 'petal', x: 7, y: 2, w: 9, h: 10 }, { id: 'flower', x: 24, y: 0, w: 11, h: 9 }, { id: 'sash', x: 13, y: 21, w: 14, h: 8 }],
        lianso: [{ id: 'sleeve', x: 23, y: 20, w: 10, h: 18 }, { id: 'ribbon', x: 27, y: 11, w: 10, h: 9 }, { id: 'paper', x: 4, y: 25, w: 10, h: 11 }],
        yan: [{ id: 'fold', x: 11, y: 29, w: 18, h: 8 }, { id: 'pin', x: 22, y: 0, w: 11, h: 9 }, { id: 'book', x: 2, y: 21, w: 9, h: 12 }],
        // Đợt D. Đạo sĩ Lao Sơn: lông hạc ở tay áo phải; nhử ở chòm râu và bó củi. Hoa Cô Tử: tai hươu sau tóc; nhử ở búi
        // cài lá và giỏ thuốc. Nhiếp Tiểu Thiến: vai phải lọt ánh đèn; nhử ở lọn tóc trước vai trái và thỏi vàng.
        laoshan: [{ id: 'feather', x: 26, y: 19, w: 11, h: 11 }, { id: 'beard', x: 15, y: 14, w: 10, h: 10 }, { id: 'wood', x: 1, y: 29, w: 11, h: 9 }],
        huagu: [{ id: 'ear', x: 27, y: 5, w: 10, h: 10 }, { id: 'leaf', x: 8, y: 0, w: 10, h: 8 }, { id: 'basket', x: 1, y: 21, w: 12, h: 13 }],
        // Tiểu Thiến dùng chân dung PIXEL_PORTRAITS (ảnh AI) từ 15/10/2026: vùng đặt theo tranh đó.
        xiaoqian: [{ id: 'shoulder', x: 22, y: 27, w: 14, h: 13 }, { id: 'hair', x: 4, y: 14, w: 8, h: 14 }, { id: 'ingot', x: 2, y: 31, w: 13, h: 9 }]
    };

    // Tranh cá nhìn nghiêng, đầu bên trái. len: dài thân, H: nửa bề cao, p: chỗ thân cao nhất,
    // pd: cuống đuôi, tl: dài đuôi.
    var FISH_ART = {
        // Diếc: thân cao, lưng xám ô liu, bụng trắng bạc.
        diec: { len: 21, H: 6, p: 0.85, pd: 0.36, tail: 'fork', tl: 6, dorsal: 'long', scale: 'dot',
            pal: { back: '#56654a', side: '#a7ab86', belly: '#ebe7d4', hi: '#c8cba6', sc: '#8a8e6c', fin: '#a3a084', finD: '#73715a', line: '#38412e' } },
        // Cá vàng: thân tròn đỏ cam, mắt lồi, đuôi đôi rủ.
        vang: { len: 16, H: 5.8, p: 1, pd: 0.42, tail: 'veil', tl: 12, dorsal: 'tall', scale: 'dot', bigEye: true,
            pal: { back: '#c43a18', side: '#f0682a', belly: '#fbb46c', hi: '#ff9a4a', sc: '#dc5222', fin: '#f9ac70', finD: '#e0743a', line: '#7a2410' } },
        // Chép: vảy vàng đồng, râu, vây và đuôi đỏ.
        chep: { len: 24, H: 5.6, p: 0.85, pd: 0.32, tail: 'fork', tl: 7, dorsal: 'long', scale: 'scale', barbel: true,
            pal: { back: '#5c4c20', side: '#c99c36', belly: '#f0dc9c', hi: '#e6c35e', sc: '#9a772a', fin: '#e0602e', finD: '#aa3c1e',
                line: '#3d3214', dors: '#86652a', dorsD: '#5a4218' } },
        // Trắm cỏ: thân dài, ô liu vàng, lưới vảy.
        tram: { len: 26, H: 4.6, p: 0.95, pd: 0.34, tail: 'fork', tl: 6, dorsal: 'short', scale: 'scale',
            pal: { back: '#4a5032', side: '#a09e60', belly: '#e6e0b8', hi: '#bdb978', sc: '#74733f', fin: '#9a8a58', finD: '#6a5c38', line: '#2e3220' } },
        // Trắm đen: thân dài, xám xanh đen, vây đen.
        den: { len: 26, H: 4.8, p: 0.95, pd: 0.34, tail: 'fork', tl: 6, dorsal: 'short', scale: 'scale',
            pal: { back: '#1a1e25', side: '#39424e', belly: '#8a929a', hi: '#525d6a', sc: '#262c35', fin: '#2a2f37', finD: '#14171b', line: '#0b0d10' } },
        // Quế: thân cao dẹt, đốm sẫm, vây lưng gai, vạch qua mắt, miệng rộng, đuôi tròn.
        que: { len: 23, H: 6.2, p: 0.72, pd: 0.38, tail: 'round', tl: 6, dorsal: 'spiny', scale: 'blotch', stripe: true, jaw: true,
            pal: { back: '#7a6632', side: '#c8ac62', belly: '#f1e6bc', hi: '#dcc47e', sc: '#3e2e12', fin: '#c4a865', finD: '#4e3c1c', line: '#2a200c' } },
        // Cá trắng (Bạch Thu Luyện): thân trắng ngà thon dài, vảy bạc mờ, vây mỏng gần như trong.
        bach: { len: 24, H: 4.9, p: 0.9, pd: 0.33, tail: 'fork', tl: 7, dorsal: 'short', scale: 'scale',
            pal: { back: '#c9d0d6', side: '#f4efe2', belly: '#fdfbf4', hi: '#ffffff', sc: '#dfe3e2', fin: '#eef3f4', finD: '#c3d0d8', line: '#8f9ba6' } }
    };
    var FISH_W = 36, FISH_H = 20;
    var fishCache = {};

    // Tranh một loài cá (36×20). opts.silhouette: bóng mờ cho loài chưa câu được.
    function fishLayer(id, opts) {
        var sil = !!(opts && opts.silhouette);
        var key = id + (sil ? ':sil' : '');
        if (fishCache[key]) return fishCache[key];
        var S = FISH_ART[id];
        if (!S) return null;
        var pc = artPal(S.pal);
        var B = new Layer(0, 0, FISH_W, FISH_H);
        var F = new Layer(0, 0, FISH_W, FISH_H);
        var hx = Math.round((FISH_W - S.len - S.tl) / 2), px = hx + S.len, cy = 10.5, cyi = Math.floor(cy);
        function hh(u) {
            u = clamp(u, 0, 1);
            var a = Math.pow(Math.max(Math.sin(Math.PI * Math.pow(u, S.p)), 0), 0.6);
            if (u > 0.55) a = Math.max(a, S.pd);
            return S.H * a;
        }
        function topY(x) { return cy - hh((x + 0.5 - hx) / S.len) * 1.06; }
        function botY(x) { return cy + hh((x + 0.5 - hx) / S.len) * 0.94; }
        var ph = S.H * S.pd, tl = S.tl;
        // Đuôi (vẽ trước, nằm sau thân).
        if (S.tail === 'fork') {
            F.poly([[px - 1, cy - ph], [px + tl * 0.92, cy - ph - tl * 0.78], [px + tl, cy - ph - tl * 0.5], [px + tl * 0.5, cy],
                [px + tl, cy + ph + tl * 0.5], [px + tl * 0.92, cy + ph + tl * 0.78], [px - 1, cy + ph]], pc.fin);
            F.line(px, cy - 1, px + tl * 0.88, cy - ph - tl * 0.7, pc.finD);
            F.line(px, cy + 1, px + tl * 0.88, cy + ph + tl * 0.7, pc.finD);
        } else if (S.tail === 'round') {
            F.ellipse(px + tl * 0.42, cy, tl * 0.74, ph + 3, function (x, y, nx, ny) {
                return Math.hypot(nx, ny) > 0.82 ? pc.finD : (hash2(x, y, 5) > 0.8 ? pc.sc : pc.fin);
            });
        } else {
            F.poly([[px - 1, cy - ph], [px + tl * 0.45, cy - ph - 4.2], [px + tl * 0.95, cy - 3.4], [px + tl * 0.62, cy - 0.6],
                [px + tl, cy + 3.8], [px + tl * 0.55, cy + ph + 5.4], [px + tl * 0.1, cy + ph + 2.6], [px - 1, cy + ph]], pc.fin);
            F.line(px, cy - 1, px + tl * 0.8, cy - 3, pc.finD);
            F.line(px, cy + 1, px + tl * 0.85, cy + 3.6, pc.finD);
            F.line(px, cy + 2, px + tl * 0.5, cy + ph + 4.4, pc.finD);
        }
        // Vây lưng: từ u0 đến u1 của thân; gai thì xen gai cao với màng thấp.
        function dorsal(u0, u1, hFront, hBack, spiny) {
            var x0 = hx + u0 * S.len, x1 = hx + u1 * S.len;
            for (var x = Math.floor(x0); x <= Math.ceil(x1); x++) {
                var f = (x - x0) / Math.max(1, x1 - x0);
                if (f < 0 || f > 1) continue;
                var hgt = f < 0.2 ? hFront * (0.55 + f * 2.25) : hFront + (hBack - hFront) * (f - 0.2) / 0.8;
                if (spiny) hgt = x % 2 ? hFront * (1 - f * 0.2) : hFront * 0.45;
                var top = topY(x) - hgt;
                for (var y = Math.floor(top); y <= topY(x) + 1; y++) {
                    if (y + 0.5 < top) continue;
                    F.set(x, y, spiny ? (x % 2 ? pc.finD : pc.fin) : (x % 2 ? (pc.dors || pc.fin) : (pc.dorsD || pc.finD)));
                }
            }
        }
        if (S.dorsal === 'long') dorsal(0.34, 0.8, 3.2, 1.2);
        else if (S.dorsal === 'short') dorsal(0.4, 0.58, 3.6, 1.6);
        else if (S.dorsal === 'tall') dorsal(0.3, 0.66, 3.4, 2.2);
        else { dorsal(0.16, 0.5, 3.2, 3, true); dorsal(0.5, 0.8, 2.8, 1.6); }
        // Vây bụng và vây hậu môn, xuôi về sau.
        var pv = hx + 0.44 * S.len, an = hx + 0.72 * S.len;
        F.poly([[pv, botY(Math.floor(pv)) - 0.6], [pv + 4, botY(Math.floor(pv)) + 2.2], [pv + 2.4, botY(Math.floor(pv)) - 0.6]], pc.fin);
        F.poly([[an, botY(Math.floor(an)) - 0.6], [an + 3.6, botY(Math.floor(an)) + 2], [an + 2.6, botY(Math.floor(an)) - 0.6]], pc.fin);
        // Thân: lưng sẫm, vệt sáng, sườn, bụng nhạt; vảy hoặc đốm trên sườn.
        for (var x = hx; x < px; x++) {
            var t0 = topY(x), b0 = botY(x), u = (x + 0.5 - hx) / S.len;
            for (var y = Math.floor(t0); y <= Math.ceil(b0); y++) {
                var yc = y + 0.5;
                if (yc < t0 || yc > b0) continue;
                var v = (yc - t0) / Math.max(1, b0 - t0);
                var wav = Math.sin(x * 0.8) * 0.04;
                var c = v < 0.3 + wav ? pc.back : v < 0.42 + wav ? pc.hi : v < 0.74 ? pc.side : pc.belly;
                if (u > 0.26 && v > 0.12 && v < 0.76) {
                    var lat = (x + (y % 2) * 2) % 4;
                    if (S.scale === 'dot' && lat === 0) c = pc.sc;
                    if (S.scale === 'scale' && lat === 0) c = v < 0.3 ? pc.line : pc.sc;
                    if (S.scale === 'scale' && lat === 1 && v > 0.3) c = pc.hi;
                    if (S.scale === 'blotch' && (vnoise(x / 2.8, y / 2.2, 9) > 0.56 || hash2(x, y, 31) > 0.88)) c = pc.sc;
                }
                B.set(x, y, c);
            }
        }
        // Mép mang cong.
        var gx = Math.round(hx + 0.22 * S.len);
        for (var gy = Math.ceil(topY(gx)) + 1; gy < botY(gx) - 0.5; gy++) {
            var k = (gy + 0.5 - cy) / S.H;
            B.set(gx + Math.round(1.4 * (1 - k * k)) - 1, gy, pc.line);
        }
        B.poly([[gx + 1, cy + 1], [gx + 5, cy + 2.4], [gx + 1.6, cy + 3.2]], pc.fin);
        // Mắt, vạch qua mắt, miệng, râu.
        var ex = Math.round(hx + 0.11 * S.len) + 1, ey = Math.round(cy - S.H * 0.3);
        var eyes = { e: u32('#15110e'), w: u32('#f4f0e4') };
        if (S.stripe) {
            B.line(hx, cy, ex + 1, ey, pc.line);
            B.line(ex + 1, ey, ex + 6, ey - 3, pc.line);
        }
        if (S.bigEye) artStamp(B, ['.ee', 'ewe', 'eee'], ex - 1, ey - 1, eyes);
        else artStamp(B, ['we', 'ee'], ex, ey - 1, eyes);
        B.set(hx, cyi, pc.line);
        if (S.jaw) {
            B.line(hx, cyi, hx + 4, cyi + 1, pc.line);
            F.set(hx - 1, cyi + 1, pc.belly);
        }
        if (S.barbel) F.line(hx, cyi + 1, hx - 2, cyi + 3, pc.finD);
        F.blit(B, 0, 0);
        if (sil) {
            var shade = u32a(PAL.ink, 76);
            for (var i = 0; i < F.px.length; i++) if (F.px[i]) F.px[i] = shade;
        } else {
            F.outline(C.ink);
        }
        fishCache[key] = F;
        return F;
    }

    // ---------- bố cục thế giới ----------
    // Món tô điểm đã mua (st.decor): app gửi map { id: true }; core lưu mảng id, nên nhận cả hai; thiếu thì {}.
    function decorOf(st) {
        var d = st && st.decor, out = {};
        if (Array.isArray(d)) d.forEach(function (id) { out[id] = true; });
        else if (d) Object.keys(d).forEach(function (id) { if (d[id]) out[id] = true; });
        return out;
    }

    // Mỗi vật: footprint [x0,y0,x1,y1] để xếp trước sau, place = nơi chạm vào được.
    function worldObjects(st) {
        var rep = st.repairs || {};
        var night = !!st.night;
        var objs = [];
        function add(o) { objs.push(o); return o; }
        add({ id: 'hall', place: 'hall', fp: [1.8, 1.4, 8.0, 5.1], draw: function (L) {
            drawHall(L, { x0: 2.2, y0: 1.8, x1: 7.6, y1: 4.6, z: 36, wallH: 25, roofH: 21, broken: !rep.mai, lanterns: !!rep.den, night: night, lit: !!rep.den,
                ramLamps: night ? (st.ramLamps || 0) : 0 });
        } });
        add({ id: 'stairs-1', floor: true, fp: [7.6, 7.0, 9.0, 8.5], draw: function (L) {
            drawStairs(L, { x0: 7.6, x1: 9.0, y0: 7.0, y1: 8.5, zTop: 36, zBot: 24, dir: '+y', rail: true });
        } });
        add({ id: 'study', place: 'study', fp: [4.3, 7.6, 7.1, 11.4], draw: function (L) {
            drawStudy(L, { x0: 4.5, y0: 7.8, x1: 6.9, y1: 11.2, z: 24, wallH: 18, roofH: 16, night: night, lit: true });
        } });
        add({ id: 'stairs-2', floor: true, fp: [10.0, 10.0, 11.5, 11.4], draw: function (L) {
            drawStairs(L, { x0: 10.0, x1: 11.5, y0: 10.0, y1: 11.4, zTop: 24, zBot: 12, dir: '+x', rail: true });
        } });
        add({ id: 'bridge', place: 'pond', floor: true, fp: [12.7, 9.3, 13.5, 12.1], draw: function (L) {
            drawBridge(L, { x0: 12.75, x1: 13.45, y0: 9.4, y1: 12.0, z: 12, broken: !rep.cau, gapA: 5, gapB: 8 });
        } });
        add({ id: 'stairs-3', floor: true, fp: [11.2, 14.0, 12.6, 15.5], draw: function (L) {
            drawStairs(L, { x0: 11.2, x1: 12.6, y0: 14.0, y1: 15.5, zTop: 12, zBot: 0, dir: '+y', rail: true });
        } });
        add({ id: 'tea', place: 'tea', fp: [11.1, 14.3, 15.6, 16.8], draw: function (L) {
            drawTeahouse(L, { x0: 12.6, y0: 14.4, x1: 16.2, y1: 16.6, z: 0, wallH: 18, roofH: 15, sign: !!rep.san, closed: !rep.san, lanterns: !!rep.den, night: night, lit: true });
        } });
        add({ id: 'gate', place: 'gate', fp: [20.3, 15.6, 20.9, 18.4], draw: function (L) {
            drawGate(L, { x: 20.6, y0: 15.8, y1: 18.2, z: 0 });
        } });
        add({ id: 'stairs-exit', floor: true, fp: [22.0, 16.3, 25.5, 17.7], draw: function (L) {
            drawStairs(L, { x0: 22.0, x1: 25.5, y0: 16.3, y1: 17.7, zTop: 0, zBot: -40, dir: '+x', fade: -6 });
        } });
        // Sân đỉnh: lư hương, đèn đá.
        add({ id: 'burner', fp: [4.4, 5.5, 5.2, 6.3], draw: function (L) {
            var p = P(4.8, 5.9, 36);
            drawBurner(L, Math.round(p[0]), Math.round(p[1]));
        } });
        [[2.6, 5.7, 36], [7.1, 5.7, 36], [10.8, 13.6, 12], [19.9, 15.5, 0], [19.9, 18.5, 0],
            [11.9, 5.35, 36], [14.15, 5.35, 36], [5.55, 14.75, 12]].forEach(function (q, i) {
            add({ id: 'lamp-' + i, lamp: true, at: q, fp: [q[0] - 0.2, q[1] - 0.2, q[0] + 0.2, q[1] + 0.2], draw: function (L) {
                var p = P(q[0], q[1], q[2]);
                drawStoneLantern(L, Math.round(p[0]), Math.round(p[1]), { lit: !!rep.den });
            } });
        });
        // Bàn trà và dù đỏ trước quán.
        add({ id: 'table-1', fp: [12.6, 17.4, 13.4, 18.2], draw: function (L) { drawTable(L, 13.0, 17.8, 0, { set: !!rep.san }); } });
        add({ id: 'table-2', fp: [14.8, 17.2, 15.6, 18.0], draw: function (L) {
            drawTable(L, 15.2, 17.6, 0, { set: !!rep.san });
            if (rep.san) drawParasol(L, 15.2, 17.6, 0);
        } });
        if (rep.san) add({ id: 'flag', fp: [11.6, 16.8, 11.9, 17.1], draw: function (L) { drawFlag(L, 11.75, 16.95, 0); } });
        // Cây.
        var trees = [
            { k: 'pine', x: 1.6, y: 6.2, z: 36, th: 26, seed: 201, lean: -5 },
            { k: 'maple', x: 8.4, y: 1.8, z: 36, th: 14, r: 15, seed: 202 },
            { k: 'pine', x: 1.4, y: 2.0, z: 36, th: 30, seed: 203, lean: 6 },
            { k: 'ginkgo', x: 9.2, y: 11.3, z: 24, th: 14, r: 13, seed: 204 },
            { k: 'maple', x: 15.4, y: 13.2, z: 12, th: 12, r: 13, seed: 205 },
            { k: 'maple', x: 10.6, y: 8.6, z: 12, th: 10, r: 11, seed: 206 },
            { k: 'maple', x: 16.4, y: 14.5, z: 0, th: 12, r: 14, seed: 207 },
            { k: 'ginkgo', x: 10.6, y: 18.4, z: 0, th: 12, r: 12, seed: 208 },
            { k: 'pine', x: 18.4, y: 18.4, z: 0, th: 22, seed: 209, lean: 5 },
            { k: 'maple', x: 21.4, y: 15.5, z: 0, th: 10, r: 11, seed: 212 },
            { k: 'bamboo', x: 4.4, y: 8.2, z: 24, seed: 210 },
            { k: 'bamboo', x: 4.4, y: 10.6, z: 24, seed: 211 },
            { k: 'persimmon', x: 1.9, y: 17.4, z: 12, th: 12, r: 13, seed: 213 },
            { k: 'bamboo', x: 1.4, y: 12.5, z: 12, seed: 214 },
            { k: 'maple', x: 5.3, y: 18.3, z: 12, th: 11, r: 12, seed: 216 },
            { k: 'pine', x: 17.3, y: 1.7, z: 36, th: 28, seed: 217, lean: 7 },
            { k: 'maple', x: 17.2, y: 7.3, z: 36, th: 11, r: 12, seed: 218 },
            { k: 'pine', x: 23.3, y: 2.5, z: 32, th: 20, seed: 219, lean: 8 }
        ];
        trees.forEach(function (t) {
            add({ id: 'tree-' + t.seed, tree: t.k, fp: [t.x - 0.3, t.y - 0.3, t.x + 0.3, t.y + 0.3], draw: function (L) {
                var p = P(t.x, t.y, t.z);
                var bx = Math.round(p[0]), by = Math.round(p[1]);
                if (t.k === 'pine') drawPine(L, bx, by, { th: t.th, seed: t.seed, lean: t.lean });
                else if (t.k === 'bamboo') drawBamboo(L, bx, by, { seed: t.seed, h: 58, n: 8 });
                else if (t.k === 'persimmon') drawPersimmon(L, bx, by, { th: t.th, r: t.r, seed: t.seed });
                else drawBlobTree(L, bx, by, { th: t.th, r: t.r, seed: t.seed, pal: t.k === 'maple' ? C.maple : C.ginkgo });
            } });
        });
        // Đá: đá Thái Hồ bên hồ, đá phẳng cho Lão Quy.
        add({ id: 'taihu', fp: [11.0, 8.4, 11.6, 9.0], draw: function (L) {
            var p = P(11.3, 8.7, 12);
            drawTaihu(L, Math.round(p[0]), Math.round(p[1]), { h: 24, seed: 221 });
        } });
        add({ id: 'turtle-rock', fp: [12.4, 8.3, 13.8, 9.3], draw: function (L) {
            var p = P(13.1, 8.9, 8);
            drawRock(L, Math.round(p[0]), Math.round(p[1]) + 2, { w: 18, h: 7, seed: 222, n: 3, moss: true });
        } });
        add({ id: 'rock-a', fp: [5.4, 6.4, 5.8, 6.8], draw: function (L) {
            var p = P(5.6, 6.6, 36);
            drawRock(L, Math.round(p[0]), Math.round(p[1]), { w: 8, h: 5, seed: 223, n: 2, moss: true });
        } });
        // ----- vùng đất mới -----
        add({ id: 'library', place: 'library', fp: [10.75, 1.3, 15.55, 5.0], draw: function (L) {
            drawLibrary(L, { x0: 11.4, y0: 1.9, x1: 14.9, y1: 4.5, z: 36, h1: 15, h2: 16, roofH: 16, broken: !rep.mai, lanterns: !!rep.den, night: night, lit: true });
        } });
        add({ id: 'falls', fall: fallGeom(FALLS), fp: [14.45, 5.2, 15.45, 8.45], draw: function (L) { drawFalls(L, FALLS); } });
        add({ id: 'rope-bridge', floor: true, fp: [17.85, 3.5, 20.15, 4.5], draw: function (L) {
            drawRopeBridge(L, { x0: 17.95, x1: 20.05, y0: 3.62, y1: 4.38, z0: 36, z1: 32, sag: 4 });
        } });
        add({ id: 'pavilion', place: 'pavilion', fp: [20.85, 2.85, 22.95, 4.95], draw: function (L) {
            drawPavilion(L, { x: 21.9, y: 3.9, z: 32, s: 0.78, h: 22, roofH: 16, broken: !rep.mai, lanterns: !!rep.den, night: night, lit: true });
        } });
        add({ id: 'kitchen', place: 'kitchen', smoke: P(4.35, 12.85, 50), fp: [1.4, 12.05, 5.6, 14.95], draw: function (L) {
            drawKitchen(L, { x0: 1.9, y0: 12.5, x1: 5.1, y1: 14.4, z: 12, wallH: 16, roofH: 11, night: night, lit: true });
        } });
        add({ id: 'garden', place: 'garden', fp: [6.0, 15.0, 10.0, 19.0], draw: function (L) {
            drawGarden(L, { x0: 6.0, y0: 15.0, x1: 10.0, y1: 19.0, z: 12, seed: 61 });
        } });
        add({ id: 'well', place: 'kitchen', fp: [8.1, 14.1, 8.8, 14.8], draw: function (L) {
            var p = P(8.45, 14.45, 12);
            drawWell(L, Math.round(p[0]), Math.round(p[1]));
        } });
        add({ id: 'stele', fp: [16.4, 5.9, 17.0, 6.5], draw: function (L) {
            var p = P(16.7, 6.2, 36);
            drawStele(L, Math.round(p[0]), Math.round(p[1]));
        } });
        add({ id: 'trays', fp: [2.4, 15.7, 3.4, 16.5], draw: function (L) {
            var p = P(2.9, 16.1, 12);
            drawTrays(L, Math.round(p[0]), Math.round(p[1]));
        } });
        add({ id: 'rock-dao', fp: [20.4, 5.2, 20.9, 5.7], draw: function (L) {
            var p = P(20.65, 5.45, 32);
            drawRock(L, Math.round(p[0]), Math.round(p[1]), { w: 9, h: 5, seed: 224, n: 3, moss: true });
        } });
        // Góc bắc Vườn rau, hai bên chỗ khách đêm đứng (VISIT_AT.garden): khóm mẫu đơn trắng (nụ; nở khi có lưu
        // niệm hoa của Hương Ngọc) và cây trà hoa đỏ của Giáng Tuyết (luôn có). Không nằm trên đường ho ↔ garden.
        var keeps = st.keeps || {};
        add({ id: 'peony', place: 'garden', fp: [6.95, 14.3, 7.55, 14.9], draw: function (L) {
            var p = P(7.25, 14.6, 12);
            drawPeony(L, Math.round(p[0]), Math.round(p[1]), { bloom: !!keeps.hoa });
        } });
        add({ id: 'camellia', place: 'garden', fp: [8.3, 12.3, 8.9, 12.9], draw: function (L) {
            var p = P(8.6, 12.6, 12);
            drawCamellia(L, Math.round(p[0]), Math.round(p[1]));
        } });
        // Miếu Thổ Địa của Vương Lục Lang: bờ tây Hồ sen, ngoài đường bậc 2 ↔ ho và ho ↔ garden.
        if (keeps.mieu) add({ id: 'shrine', place: 'pond', fp: [10.3, 11.9, 10.9, 12.5], draw: function (L) {
            var p = P(10.6, 12.2, 12);
            drawShrine(L, Math.round(p[0]), Math.round(p[1]));
        } });
        // Lá bùa Họa Bì dán mặt nam cột cổng phía nam (mặt nhìn ra máy quay); footprint đặt ngay ngoài footprint cổng
        // để lá bùa vẽ sau cột.
        if (keeps.phu) add({ id: 'talisman', place: 'gate', fp: [20.4, 18.41, 20.8, 18.5], draw: function (L) {
            var p = P(20.6, 18.23, 20);
            drawTalisman(L, Math.round(p[0]), Math.round(p[1]));
        } });
        // Câu đối Liên Tỏa: hai dải giấy đỏ trên mặt trước hai cột trước Vọng Vân Đình (cột ở y1 − w = 4,53 của
        // drawPavilion), đầu dải dưới mép mái vài px; footprint ngay ngoài footprint đình để dải vẽ sau cột.
        if (keeps.doi) {
            [21.27, 22.53].forEach(function (x, i) {
                add({ id: 'couplet-' + i, place: 'pavilion', fp: [x - 0.08, 4.96, x + 0.08, 5.0], draw: function (L) {
                    var p = P(x, 4.62, 51);
                    // slant 1: dải dán trên mặt cột hướng +y; seed khác nhau để hai vế không giống nhau.
                    drawCouplet(L, Math.round(p[0]), Math.round(p[1]), { slant: 1, seed: 11 + i * 7 });
                } });
            });
        }
        // ----- đợt D: lưu niệm của đạo sĩ Lao Sơn, Hoa Cô Tử, Nhiếp Tiểu Thiến -----
        // Trăng giấy: mặt +x cột bắc cổng Sơn môn (mặt nhìn ra bậc xuống núi), dưới xà cổng; cột nam đã có lá bùa. Footprint
        // ngay ngoài footprint cổng phía +x để đĩa giấy vẽ sau cột.
        if (keeps.trang) add({ id: 'moon-paper', place: 'gate', fp: [20.91, 15.9, 21.0, 16.1], draw: function (L) {
            var p = P(20.72, 16.0, 19);
            drawMoonPaper(L, Math.round(p[0]), Math.round(p[1]));
        } });
        // Bó thảo dược: tường trước Nhà bếp, bên trái cửa (chuỗi ớt khô ở bên phải), trên hai chum nước; móc ngay dưới mép
        // mái rơm. Footprint ngay ngoài footprint bếp phía +y để bó lá vẽ sau tường.
        if (keeps.thuoc) add({ id: 'herbs', place: 'kitchen', fp: [2.3, 14.96, 2.7, 15.0], draw: function (L) {
            var p = P(2.5, 14.42, 27);
            drawHerbs(L, Math.round(p[0]), Math.round(p[1]));
        } });
        // Đèn lồng giấy Thư trai: treo trước cửa song mặt +x, ngay dưới mép mái (mái che phần dây phía trên); xa tán bạch quả
        // và chỗ khách đêm đứng. Footprint ngay ngoài footprint Thư trai phía +x.
        if (keeps.dang) add({ id: 'study-lamp', place: 'study', fp: [7.11, 10.5, 7.3, 10.7], draw: function (L) {
            var p = P(7.2, 10.6, 35);
            drawPaperLamp(L, Math.round(p[0]), Math.round(p[1]), night);
        } });
        // ----- đợt D: món tô điểm mua bằng linh khí (st.decor) -----
        var decor = decorOf(st);
        // Chuông gió treo dưới đầu đao góc trước phải mái Chính điện, ngay bên phải cột góc nên dải giấy đỏ nổi trên tường vôi
        // hồi; bốn khung đung đưa (o.anim).
        if (decor.chuong) {
            var chimeAt = function (sway) {
                return function (L) {
                    var p = P(8.3, 4.5, 64);
                    drawChime(L, Math.round(p[0]), Math.round(p[1]), sway);
                };
            };
            add({ id: 'chime', place: 'hall', fp: [8.2, 5.11, 8.4, 5.2], draw: chimeAt(0),
                anim: { draws: [chimeAt(-1), chimeAt(0), chimeAt(1), chimeAt(0)], dt: 0.45 } });
        }
        // Cây đào trên bãi cỏ phía bắc lối vào Sơn môn, giữa cây phong (tree-207) và mép trái mái cổng: tán hồng nhô lên khỏi
        // mái cổng; cánh hoa rơi là hạt 'leaf' màu hồng.
        if (decor.dao) add({ id: 'tree-peach', tree: 'peach', fp: [17.1, 14.85, 17.7, 15.45], draw: function (L) {
            var p = P(17.4, 15.15, 0);
            drawPeach(L, Math.round(p[0]), Math.round(p[1]), { th: 11, r: 12, seed: 231 });
        } });
        // Tiên hạc: sprite hình thật của đạo sĩ Lao Sơn (khung 0, có bóng chân) đứng trên mũi cỏ góc nam Hồ sen, sát mép
        // nước, dưới nhãn Hồ sen; xa chỗ câu, Lão Quy và Tiểu Mặc.
        if (decor.hac) add({ id: 'crane', place: 'pond', fp: [15.35, 11.25, 15.75, 11.65], draw: function (L) {
            var S = spriteLayer('crane', 0, false);
            var p = P(15.55, 11.45, 12);
            S.x = Math.round(p[0] - S.w / 2);
            S.y = Math.round(p[1] - S.h + 1);
            L.blit(S, 0, 0);
        } });
        return objs;
    }

    // Thác đổ từ mép mỏm đá Tàng Kinh Các xuống hồ sen.
    var FALLS = { x0: 14.62, x1: 15.24, yStart: 5.55, yEdge: 8.0, zTop: 36, zBot: 8 };

    // Nhân vật trong cảnh: người giữ quán, khách quen ở chỗ quen, khách đêm (st.visitors) ở VISIT_AT
    // của nơi hẹn. Vị trí ở đây là chỗ đứng gốc; engine giữ chỗ đang đứng khi nhân vật đã đi.
    function worldActors(st) {
        var g = st.guests || {};
        var out = [{ id: 'keeper', sprite: 'keeper', at: [5.6, 6.3, 36] }];
        if (g.quy !== false) out.push({ id: 'lao-quy', sprite: 'turtle', at: [13.2, 8.95, 13], place: 'pond' });
        if (g.nguyet) out.push({ id: 'ho-nguyet', sprite: 'fox', at: [13.7, 17.25, 0], place: 'tea' });
        if (g.mac) out.push({ id: 'tieu-mac', sprite: 'cat', at: [14.6, 12.45, 12], place: 'pond' });
        if (g.ly) out.push({ id: 'tieu-ly', sprite: 'tanuki', at: [4.3, 15.4, 12], place: 'kitchen' });
        (st.visitors || []).forEach(function (v) {
            if (!v || !v.id || !SPRITES[v.sprite]) return;
            for (var i = 0; i < out.length; i++) if (out[i].id === v.id) return;
            var spot = VISIT_AT[v.place] || waypointAt(v.place) || VISIT_AT.gate;
            out.push({ id: v.id, sprite: v.sprite, at: spot.slice(), place: v.place, glow: !!v.glow, visitor: true });
        });
        return out;
    }

    // ---------- đi lại: đồ thị điểm đi, chỗ đứng của khách đêm ----------
    // Mọi toạ độ đo bằng `node tools/quy-van/world-preview.mjs --only waypoints|visitors` (chấm đỏ trên cảnh
    // r4), không ước lượng tay. Điểm nằm trên ô đất (không nước, không trong footprint công trình, trừ
    // điểm trên bậc thang và cầu). Mỗi bậc thang có ba điểm: đầu (-t), giữa (z nội suy giữa hai bậc) và
    // chân (-b), để nội suy tuyến tính bám mặt bậc. Điểm phụ (lib-e, spring, rope-w, rope-e, ho, tea-s,
    // tea-m, mon-s, mon) đưa đường vòng qua đèn đá, đầu suối, bàn trà, cây thông và chỗ hồ ly đứng.
    // Chân bậc 3 (stairs3-b) nằm trong footprint xếp lớp của Quán trà (footprint này rộng hơn tường quán
    // để quán vẽ sau bậc đá) nhưng là sân trống phía tây quán; mái quán che bậc 3 trên màn hình, nên ai đi
    // bậc này khuất sau mái chừng một giây.
    var WAY_POINTS = [
        ['hall', 6.4, 6.1, 36], ['kinh', 10.2, 6.1, 36], ['library', 14.0, 5.95, 36],
        ['lib-e', 13.85, 5.03, 36], ['spring', 15.65, 5.1, 36], ['rope-w', 17.75, 4.0, 36],
        ['ropebridge', 19.0, 4.0, 30], ['rope-e', 20.3, 4.0, 32], ['pavilion', 21.0, 5.35, 32],
        ['stairs1-t', 8.3, 6.85, 36], ['stairs1', 8.3, 7.75, 30], ['stairs1-b', 8.3, 8.65, 24],
        ['study', 8.55, 9.4, 24],
        ['stairs2-t', 9.85, 10.7, 24], ['stairs2', 10.75, 10.7, 18], ['stairs2-b', 11.65, 10.7, 12],
        ['ho', 11.5, 12.75, 12], ['pond', 13.3, 12.6, 12], ['bridge', 13.1, 10.4, 12],
        ['stairs3-t', 11.9, 13.85, 12], ['stairs3', 11.9, 14.75, 6], ['stairs3-b', 11.9, 15.65, 0],
        ['tea', 11.2, 17.95, 0], ['tea-s', 13.05, 18.85, 0], ['tea-m', 13.85, 18.8, 0], ['mon-s', 16.3, 18.45, 0],
        ['mon', 17.3, 16.95, 0], ['gate', 19.95, 16.75, 0], ['garden', 6.4, 14.1, 12], ['kitchen', 5.4, 15.5, 12]
    ];
    var WAY_EDGES = [
        ['hall', 'kinh'], ['hall', 'stairs1-t'], ['kinh', 'stairs1-t'], ['kinh', 'library'], ['library', 'lib-e'],
        ['lib-e', 'spring'], ['spring', 'rope-w'], ['rope-w', 'ropebridge'], ['ropebridge', 'rope-e'], ['rope-e', 'pavilion'],
        ['stairs1-t', 'stairs1'], ['stairs1', 'stairs1-b'], ['stairs1-b', 'study'], ['study', 'stairs2-t'],
        ['stairs2-t', 'stairs2'], ['stairs2', 'stairs2-b'], ['stairs2-b', 'ho'], ['ho', 'pond'], ['pond', 'bridge'],
        ['ho', 'stairs3-t'], ['stairs3-t', 'stairs3'], ['stairs3', 'stairs3-b'], ['stairs3-b', 'tea'],
        ['tea', 'tea-s'], ['tea-s', 'tea-m'], ['tea-m', 'mon-s'], ['mon-s', 'mon'], ['mon', 'gate'],
        ['ho', 'garden'], ['garden', 'kitchen']
    ];
    // Điểm nằm trên bậc thang hay cầu (được phép ở trong footprint của vật đó, độ cao khác ô đất).
    var WAY_RAMPS = { 'stairs1': 'stairs-1', 'stairs2': 'stairs-2', 'stairs3': 'stairs-3', 'bridge': 'bridge', 'ropebridge': 'rope-bridge' };
    var WAYPOINTS = WAY_POINTS.map(function (p) {
        var links = [];
        WAY_EDGES.forEach(function (e) {
            if (e[0] === p[0]) links.push(e[1]);
            else if (e[1] === p[0]) links.push(e[0]);
        });
        return { id: p[0], at: [p[1], p[2], p[3]], links: links };
    });
    var WAY_BY_ID = {};
    WAYPOINTS.forEach(function (w) { WAY_BY_ID[w.id] = w; });

    function waypointAt(id) {
        return WAY_BY_ID[id] ? WAY_BY_ID[id].at.slice() : null;
    }

    // Chỗ khách đêm đứng ở mỗi nơi: gần điểm cùng tên nhưng lệch trên màn hình ≥ 14 px để người giữ quán
    // đi tới nơi đó không đứng chồng lên khách, và không bị mái, tán cây hay cột che. Vọng Vân Đình: đứng
    // trước đình chứ không trong đình, vì đình là một khối vẽ liền (mái, bàn, cột trước) nên người đứng bên
    // trong sẽ bị mái che nửa người hoặc đè lên cột. Sơn môn: đứng ngay ngoài cổng, giữa hai cột trên màn
    // hình; phía trong cổng thì cột trái hoặc thông che mất người. Nhãn nơi chốn (DOM) không được đè lên
    // khách ở camera mặc định của cả 390 px lẫn 1280 px. Hồ sen: bờ tây sát mép nước, đối diện cầu; chỗ cũ
    // [12.1, 12.3] nằm ngay sau nhãn Quán trà: nhãn che 87 % người ở 390 px và 27 % ở 1280 px.
    var VISIT_AT = {
        pond: [11.95, 11.0, 12],
        library: [12.45, 5.3, 36],
        study: [7.3, 9.05, 24],
        gate: [21.3, 17.55, 0],
        pavilion: [22.0, 5.5, 32],
        tea: [16.0, 17.9, 0],
        kitchen: [3.7, 16.5, 12],
        hall: [8.0, 5.45, 36],
        // Vườn rau: góc bắc của luống rau, sau và lệch phải giếng (giếng không che người), giữa khóm mẫu đơn (bên
        // trái, phía trước) và cây trà hoa đỏ (bên phải). Góc tây nam rộng hơn nhưng tán cây phong (tree-216) che kín
        // người đứng ở đó.
        garden: [8.1, 13.3, 12]
    };

    // Đường đi ngắn nhất (theo số chặng) giữa hai điểm; trả mảng id kể cả hai đầu, không có đường thì null.
    // blocked: { id: true } các điểm không đi qua được (cầu hồ sen khi còn gãy).
    function findPath(fromId, toId, blocked) {
        blocked = blocked || {};
        if (!WAY_BY_ID[fromId] || !WAY_BY_ID[toId] || blocked[toId]) return null;
        if (fromId === toId) return [fromId];
        var prev = {}, queue = [fromId], seen = {};
        seen[fromId] = true;
        while (queue.length) {
            var id = queue.shift();
            var links = WAY_BY_ID[id].links;
            for (var i = 0; i < links.length; i++) {
                var nx = links[i];
                if (seen[nx] || blocked[nx]) continue;
                seen[nx] = true;
                prev[nx] = id;
                if (nx === toId) {
                    var path = [toId];
                    while (path[0] !== fromId) path.unshift(prev[path[0]]);
                    return path;
                }
                queue.push(nx);
            }
        }
        return null;
    }

    function pathLength(ids) {
        var len = 0;
        for (var i = 1; i < ids.length; i++) len += flatDist(WAY_BY_ID[ids[i - 1]].at, WAY_BY_ID[ids[i]].at);
        return len;
    }

    function flatDist(a, b) {
        return Math.hypot(b[0] - a[0], b[1] - a[1]);
    }

    // Đoạn thẳng a → b đi được không: cùng độ cao, mọi điểm trên đoạn (mẫu 0,1 ô) nằm trên ô đất cùng độ cao,
    // không nước, không trong footprint vật cản (nhà, cây, đèn, bàn, giếng, vườn…). Cổng Sơn môn đi qua được,
    // trừ hai chân cột. Dùng cho chặng nối chỗ đứng bất kỳ (chỗ nghỉ, chỗ dừng giữa đường) vào đồ thị.
    var HOP_MAX = 2.6;
    // Mọi lưu niệm và món tô điểm có vật trên đảo: đường đi tránh chúng dù người chơi đã có hay chưa.
    var HOP_KEEPS = { mieu: true, phu: true, hoa: true, doi: true, trang: true, thuoc: true, dang: true };
    var HOP_DECOR = { hoadang: true, chuong: true, cachep: true, dao: true, hac: true };
    var hopCache = null;
    function hopData() {
        if (hopCache) return hopCache;
        var skip = { 'stairs-1': 1, 'stairs-2': 1, 'stairs-3': 1, 'stairs-exit': 1, bridge: 1, 'rope-bridge': 1, falls: 1, gate: 1 };
        var fps = [];
        worldObjects({ repairs: { san: true, cau: true, den: true, mai: true }, keeps: HOP_KEEPS, decor: HOP_DECOR }).forEach(function (o) {
            if (!skip[o.id]) fps.push(o.fp);
        });
        fps.push([20.38, 15.78, 20.82, 16.22], [20.38, 17.78, 20.82, 18.22]);
        hopCache = { ter: buildTerrain(), fps: fps };
        return hopCache;
    }

    function hopClear(a, b) {
        if (a[2] !== b[2]) return false;
        var D = hopData(), ter = D.ter, fps = D.fps;
        var n = Math.max(1, Math.ceil(flatDist(a, b) / 0.1));
        for (var i = 0; i <= n; i++) {
            var x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
            var tx = Math.floor(x), ty = Math.floor(y);
            if (tx < 0 || ty < 0 || tx >= GRID || ty >= GRID) return false;
            if (ter.hgt[tx][ty] !== a[2] || ter.typ[tx][ty] === 'water') return false;
            for (var k = 0; k < fps.length; k++) {
                var f = fps[k];
                if (x > f[0] && x < f[2] && y > f[1] && y < f[3]) return false;
            }
        }
        return true;
    }

    // Lập đường đi từ toạ độ `at` tới đích; trả { nodes: [id điểm], points: [[x, y, z], …], ids } hoặc null.
    // target: id điểm đi hoặc id nơi (điểm cùng tên). o.home + o.rest: khi target === o.home thì đi tới điểm
    // nối thẳng được vào chỗ nghỉ o.rest rồi bước vào (khách quen về chỗ cũ, khách đêm tới VISIT_AT).
    // o.from: id điểm xuất phát (bỏ qua `at`). o.via: id điểm đầu đoạn đang đi (actor dừng giữa chặng).
    // o.blocked: điểm cấm. Chọn cặp điểm vào/ra cho tổng quãng ngắn nhất.
    function planRoute(at, target, o) {
        o = o || {};
        var blocked = o.blocked || {};
        var toRest = !!(o.rest && o.home && target === o.home);
        if (!toRest && (!WAY_BY_ID[target] || blocked[target])) return null;
        var fromNode = o.from && WAY_BY_ID[o.from] ? o.from : null;
        var start = fromNode ? WAY_BY_ID[fromNode].at : at;
        // Đã ở chỗ nghỉ: không đi. Chỗ nghỉ nối thẳng được từ chỗ đứng: bước thẳng vào (không vòng qua điểm).
        if (toRest) {
            var direct = flatDist(start, o.rest);
            if (direct < 1e-6 && Math.abs(start[2] - o.rest[2]) < 1e-6) return { nodes: [], points: [start.slice()], ids: [fromNode], length: 0 };
            if (!fromNode && direct <= HOP_MAX && hopClear(start, o.rest)) {
                return { nodes: [], points: [start.slice(), o.rest.slice()], ids: [null, null], length: direct };
            }
        }
        var starts = [];
        if (fromNode) {
            starts.push({ id: fromNode, cost: 0 });
        } else {
            var seen = {};
            (o.via || []).forEach(function (id) {
                if (WAY_BY_ID[id] && !blocked[id] && !seen[id]) {
                    seen[id] = true;
                    starts.push({ id: id, cost: flatDist(at, WAY_BY_ID[id].at) });
                }
            });
            WAYPOINTS.forEach(function (w) {
                if (seen[w.id] || blocked[w.id]) return;
                var d = flatDist(at, w.at);
                if (d <= HOP_MAX && hopClear(at, w.at)) starts.push({ id: w.id, cost: d });
            });
            if (!starts.length) {
                var nw = nearestWaypoint(at);
                starts.push({ id: nw, cost: flatDist(at, WAY_BY_ID[nw].at) });
            }
        }
        var ends = [];
        if (toRest) {
            WAYPOINTS.forEach(function (w) {
                if (blocked[w.id]) return;
                var d = flatDist(w.at, o.rest);
                if (d <= HOP_MAX && hopClear(w.at, o.rest)) ends.push({ id: w.id, cost: d });
            });
            if (!ends.length) {
                var nr = nearestWaypoint(o.rest);
                ends.push({ id: nr, cost: flatDist(WAY_BY_ID[nr].at, o.rest) });
            }
        } else {
            ends.push({ id: target, cost: 0 });
        }
        var best = null;
        starts.forEach(function (s) {
            ends.forEach(function (e) {
                var path = findPath(s.id, e.id, blocked);
                if (!path) return;
                var len = s.cost + e.cost + pathLength(path);
                if (!best || len < best.len - 1e-9) best = { len: len, path: path };
            });
        });
        if (!best) return null;
        var points = [start.slice()], ids = [fromNode];
        best.path.forEach(function (id) {
            var p = WAY_BY_ID[id].at;
            var last = points[points.length - 1];
            if (flatDist(last, p) < 1e-6 && Math.abs(last[2] - p[2]) < 1e-6) {
                ids[ids.length - 1] = id;
                return;
            }
            points.push(p.slice());
            ids.push(id);
        });
        if (toRest) {
            var tail = points[points.length - 1];
            if (flatDist(tail, o.rest) > 1e-6 || Math.abs(tail[2] - o.rest[2]) > 1e-6) {
                points.push(o.rest.slice());
                ids.push(null);
            }
        }
        return { nodes: best.path, points: points, ids: ids, length: best.len };
    }

    // Điểm đi gần một toạ độ nhất; chênh độ cao tính rất nặng để không chọn điểm ở bậc khác (sau vách kè).
    function nearestWaypoint(at) {
        var best = null, bd = Infinity;
        WAYPOINTS.forEach(function (w) {
            var d = Math.hypot(w.at[0] - at[0], w.at[1] - at[1]) + Math.abs(w.at[2] - (at[2] || 0)) * 0.5;
            if (d < bd) {
                bd = d;
                best = w.id;
            }
        });
        return best;
    }

    // Chặng đi: danh sách toạ độ [x, y, z]; walkStep đi theo dt (giây) với tốc độ ô/giây trên mặt phẳng x, y,
    // nội suy tuyến tính cả z. Trả { at, dir, away, done }: dir = +1 khi đi sang phải màn hình, -1 sang trái, 0 thẳng
    // đứng (giữ hướng cũ). away = true khi đoạn đang đi xa máy quay (dx + dy < 0), false khi lại gần (dx + dy > 0);
    // đoạn ngang màn hình (dx + dy = 0) giữ giá trị trước (lưu trong w.away, chưa có thì null); không di chuyển
    // (dt = 0 hay đã tới) trả null. Một bước qua nhiều đoạn lấy đoạn đang đi sau bước, như dir.
    // Phần thuần này chạy được trong Node; engine chỉ đặt actor theo kết quả.
    function walkPlan(points, speed) {
        return { pts: points.map(function (p) { return [p[0], p[1], p[2]]; }), seg: 0, u: 0, speed: speed || 1.6, done: points.length < 2 };
    }

    function walkStep(w, dt) {
        var pts = w.pts, left = Math.max(0, dt) * w.speed, dir = 0;
        var moving = !w.done && left > 0;
        var away = w.away === true || w.away === false ? w.away : null;
        while (!w.done && left > 0) {
            var a = pts[w.seg], b = pts[w.seg + 1];
            var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            var sx = (b[0] - a[0]) - (b[1] - a[1]), sy = (b[0] - a[0]) + (b[1] - a[1]);
            if (Math.abs(sx) > 1e-6) dir = sx > 0 ? 1 : -1;
            if (Math.abs(sy) > 1e-6) away = sy < 0;
            if (len - w.u > left) {
                w.u += left;
                left = 0;
            } else {
                left -= Math.max(0, len - w.u);
                w.seg++;
                w.u = 0;
                if (w.seg >= pts.length - 1) w.done = true;
            }
        }
        var at;
        if (w.done) {
            at = pts[pts.length - 1].slice();
        } else {
            var p = pts[w.seg], q = pts[w.seg + 1];
            var L = Math.hypot(q[0] - p[0], q[1] - p[1]);
            var k = L > 1e-9 ? w.u / L : 1;
            at = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
            var s2 = (q[0] - p[0]) - (q[1] - p[1]), t2 = (q[0] - p[0]) + (q[1] - p[1]);
            if (Math.abs(s2) > 1e-6) dir = s2 > 0 ? 1 : -1;
            if (Math.abs(t2) > 1e-6) away = t2 < 0;
        }
        if (moving) w.away = away;
        return { at: at, dir: dir, away: moving ? away : null, done: w.done };
    }

    // Nhãn nơi chốn (DOM) và chữ trên biển.
    var PLACES = [
        { id: 'hall', zh: '恒岳殿', vi: 'Tông Môn Điện', at: [5.0, 3.2, 104] },
        { id: 'study', zh: '天逆界', vi: 'Thiên Nghịch Động', at: [5.7, 9.5, 66] },
        { id: 'pond', zh: '聚灵池', vi: 'Tụ Linh Hồ', at: [15.3, 10.6, 30] },
        { id: 'tea', zh: '斩妖台', vi: 'Trảm Yêu Đài', at: [14.4, 15.5, 52] },
        { id: 'gate', zh: '山门', vi: 'Hằng Nhạc Sơn Môn', at: [20.6, 17.0, 62] },
        { id: 'library', zh: '藏经阁', vi: 'Tàng Kinh Các', at: [13.15, 3.2, 110] },
        { id: 'kitchen', zh: '炼丹房', vi: 'Luyện Đan Lô', at: [3.5, 13.45, 62] },
        { id: 'garden', zh: '灵药圃', vi: 'Linh Dược Phố', at: [8.3, 17.3, 24] },
        { id: 'pavilion', zh: '望仙台', vi: 'Vọng Tiên Đài', at: [21.9, 3.9, 92] }
    ];
    var PLAQUES = [
        { id: 'gate', text: '恒岳派', at: [20.6, 17.0, 31.5], face: 'x', len: 1.5, size: 6.2 },
        { id: 'tea', text: '斩妖台', at: [14.4, 16.68, 24.5], face: 'y', len: 1.7, size: 6.2, need: 'san' },
        { id: 'flag', text: '修', at: [11.75, 16.95, 30], face: 'flat', size: 5, need: 'san' },
        { id: 'library', text: '藏经阁', at: [13.15, 4.08, 68], face: 'y', len: 1.4, size: 5.2 },
        { id: 'pavilion', text: '望仙台', at: [21.9, 4.7, 52.5], face: 'y', len: 1.0, size: 4 }
    ];

    // Đèn lồng Sơn môn để thắp đêm: đèn đá đứng bên trái cổng trên màn hình (lamp-4 trong worldObjects). Đèn đá
    // bên kia (lamp-3) nằm khuất sau cột phải của cổng nên không làm vùng chạm, để không cướp cú chạm vào cổng.
    // Vùng chạm: tròn bán kính 6 px nghệ thuật quanh ô đèn (tâm cách chân đèn 11 px, như drawStoneLantern).
    var GATE_LANTERNS = [[19.9, 18.5, 0]];
    var LANTERN_R = 6;
    function lanternHit(wx, wy) {
        for (var i = 0; i < GATE_LANTERNS.length; i++) {
            var p = P(GATE_LANTERNS[i][0], GATE_LANTERNS[i][1], GATE_LANTERNS[i][2]);
            var dx = wx - Math.round(p[0]), dy = wy - (Math.round(p[1]) - 11);
            if (dx * dx + dy * dy <= LANTERN_R * LANTERN_R) return true;
        }
        return false;
    }

    // Xếp trước sau theo footprint: A sau B nếu A nằm hẳn phía −x hoặc −y của B.
    function sortDrawables(list) {
        var n = list.length, i, j;
        var before = [];
        for (i = 0; i < n; i++) before.push([]);
        // Vật sàn (floor: cầu, bậc thang): actor có footprint chạm footprint của nó thì đang đứng TRÊN sàn, vẽ sau sàn
        // (kể cả lan can) thay vì bị luật tách footprint xếp ra sau như với vật thường (quán chủ câu ở cuối cầu bị
        // lan can che thân).
        function onFloor(o, a) {
            return !!(o.floor && a.actor) && a.fp[0] < o.fp[2] && o.fp[0] < a.fp[2] && a.fp[1] < o.fp[3] && o.fp[1] < a.fp[3];
        }
        function behind(a, b) {
            if (onFloor(a, b)) return true;
            if (onFloor(b, a)) return false;
            return a.fp[2] <= b.fp[0] + 1e-6 || a.fp[3] <= b.fp[1] + 1e-6;
        }
        for (i = 0; i < n; i++) {
            for (j = 0; j < n; j++) {
                if (i === j) continue;
                var a = list[i], b = list[j];
                if (!overlap2d(a, b)) continue;
                if (behind(a, b) && !behind(b, a)) before[j].push(i);
                else if (!behind(a, b) && !behind(b, a)) {
                    var ka = (a.fp[0] + a.fp[2]) + (a.fp[1] + a.fp[3]), kb = (b.fp[0] + b.fp[2]) + (b.fp[1] + b.fp[3]);
                    if (ka < kb || (ka === kb && i < j)) before[j].push(i);
                }
            }
        }
        var out = [], state = new Uint8Array(n);
        function visit(k) {
            if (state[k] === 2) return;
            if (state[k] === 1) return;
            state[k] = 1;
            before[k].forEach(visit);
            state[k] = 2;
            out.push(list[k]);
        }
        var idx = [];
        for (i = 0; i < n; i++) idx.push(i);
        idx.sort(function (p, q) {
            var a = list[p], b = list[q];
            return (a.fp[2] + a.fp[3]) - (b.fp[2] + b.fp[3]);
        });
        idx.forEach(visit);
        return out;
    }

    function overlap2d(a, b) {
        if (!a.box || !b.box) return true;
        return a.box[0] < b.box[2] && b.box[0] < a.box[2] && a.box[1] < b.box[3] && b.box[1] < a.box[3];
    }

    // Vẽ một vật vào layer riêng rồi cắt gọn; box = khung màn hình để xếp chồng.
    function renderObject(o) {
        var a = P(o.fp[0], o.fp[3], 0), b = P(o.fp[2], o.fp[1], 0);
        var L = new Layer(a[0] - 120, b[1] - 220, (b[0] - a[0]) + 240, 340);
        LIGHTS = [];
        o.draw(L);
        o.lights = LIGHTS;
        LIGHTS = null;
        var T = L.trim();
        o.layer = T;
        o.box = [T.x, T.y, T.x + T.w, T.y + T.h];
        // Vật có khung động (o.anim.draws, đổi khung mỗi o.anim.dt giây; chuông gió): mỗi khung một layer cắt gọn riêng,
        // không ghi nguồn sáng; box là hộp chung của mọi khung. o.layer (o.draw) vẫn là hình tĩnh cho ảnh xem trước.
        if (o.anim) {
            o.anim.layers = o.anim.draws.map(function (fn) {
                var F = new Layer(L.x, L.y, L.w, L.h);
                fn(F);
                F = F.trim();
                o.box = [Math.min(o.box[0], F.x), Math.min(o.box[1], F.y), Math.max(o.box[2], F.x + F.w), Math.max(o.box[3], F.y + F.h)];
                return F;
            });
        }
        return o;
    }

    function actorLayer(a, frame, blink) {
        var S = spriteLayer(a.sprite, frame, blink);
        var p = P(a.at[0], a.at[1], a.at[2]);
        S.x = Math.round(p[0] - S.w / 2);
        S.y = Math.round(p[1] - S.h + 1);
        return S;
    }

    // ---------- nền: trời, núi xa, mây ----------
    // Màu núi theo lớp: lớp xa nhạt, ít tương phản; lớp gần đậm, có thông trên đỉnh.
    var MTN = {
        day: [
            { rim: '#cfdbe4', lit: '#bccbd8', mid: '#adbfce', dark: '#9fb3c4' },
            { rim: '#b6c8d5', lit: '#a2b8c9', mid: '#8fa8bb', dark: '#7e98ad' },
            { rim: '#9cb3bf', lit: '#86a1ae', mid: '#718e9d', dark: '#5e7b8c' }
        ],
        night: [
            { rim: '#404d6e', lit: '#384463', mid: '#323d5a', dark: '#2d3752' },
            { rim: '#36425f', lit: '#2f3a55', mid: '#29334c', dark: '#242d44' },
            { rim: '#2d3752', lit: '#27304a', mid: '#212a41', dark: '#1c2439' }
        ],
        mist: { day: '#e4ecf0', night: '#2c3554' }
    };

    // Núi đá vôi ba lớp: đỉnh tròn, vách dựng, sườn trái sáng, sườn phải tối, sương ở chân mỗi lớp.
    function renderMountains(w, h, night, seed) {
        var L = new Layer(0, 0, w, h);
        var set = night ? MTN.night : MTN.day;
        var mist = u32(night ? MTN.mist.night : MTN.mist.day);
        var cfg = [
            { base: 0.7, minH: 0.3, maxH: 0.72, count: 11, wMin: 0.03, wMax: 0.075 },
            { base: 0.86, minH: 0.26, maxH: 0.6, count: 9, wMin: 0.04, wMax: 0.09 },
            { base: 1.0, minH: 0.18, maxH: 0.46, count: 8, wMin: 0.05, wMax: 0.1, pines: true }
        ];
        cfg.forEach(function (ly, li) {
            var r = rng(seed + li * 31);
            var col = set[li];
            var rim = u32(col.rim), lit = u32(col.lit), mid = u32(col.mid), dark = u32(col.dark);
            var peaks = [];
            for (var k = 0; k < ly.count; k++) {
                peaks.push({
                    x: (k + 0.1 + r() * 0.8) / ly.count * w,
                    hh: h * (ly.minH + r() * (ly.maxH - ly.minH)),
                    ww: w * (ly.wMin + r() * (ly.wMax - ly.wMin)),
                    k: 1.6 + r() * 1.8,
                    q: 0.35 + r() * 0.4,
                    lean: (r() - 0.5) * 0.6
                });
            }
            var base = h * ly.base;
            for (var x = 0; x < w; x++) {
                var top = base, owner = null, ownD = 0;
                for (var k2 = 0; k2 < peaks.length; k2++) {
                    var pk = peaks[k2];
                    var d = (x + 0.5 - pk.x) / pk.ww;
                    if (d <= -1 || d >= 1) continue;
                    d -= pk.lean * (1 - d * d) * 0.5;
                    var ad = Math.min(0.999, Math.abs(d));
                    var prof = Math.pow(1 - Math.pow(ad, pk.k), pk.q);
                    var yTop = base - pk.hh * prof;
                    if (yTop < top) {
                        top = yTop;
                        owner = pk;
                        ownD = d;
                    }
                }
                top += (vnoise(x * 0.3, li * 7.3, seed) - 0.5) * (2 + li) + (hash2(x, li, seed) - 0.5) * 0.8;
                var ty = Math.floor(top);
                for (var y = Math.max(0, ty); y < h; y++) {
                    var c = mid;
                    if (owner) {
                        c = ownD < -0.28 ? lit : (ownD < 0.3 ? mid : dark);
                        // Khe đá dọc.
                        if (c !== dark && vnoise(x * 0.8, y * 0.05, seed + li) > 0.74) c = c === lit ? mid : dark;
                    }
                    if (y - top < 1.2) c = rim;
                    var mt = (y - (base - h * 0.22)) / (h * 0.22);
                    if (mt > 0 && dith(x, y) < mt * 1.1) c = mist;
                    L.set(x, y, c);
                }
                if (ly.pines && owner && hash2(x, 3, seed) < 0.18) {
                    L.set(x, ty - 1, dark);
                    L.set(x, ty - 2, dark);
                    L.set(x - 1, ty - 1, dark);
                    L.set(x + 1, ty, dark);
                }
            }
        });
        return L;
    }

    // Trời: dải màu dither; ban ngày có mặt trời nhạt, ban đêm có trăng khuyết và sao. full: đêm rằm, trăng tròn có
    // quầng (hai vòng dither) thay trăng khuyết.
    function renderSky(w, h, night, full) {
        var L = new Layer(0, 0, w, h);
        var pal = night ? C.skyN : C.sky;
        for (var y = 0; y < h; y++) {
            var t = y / Math.max(1, h - 1);
            for (var x = 0; x < w; x++) L.px[y * w + x] = ramp(pal, t, x, y);
        }
        var sx = Math.round(w * 0.76), sy = Math.round(Math.min(h * 0.16, 60));
        if (night) {
            var r = rng(404);
            for (var k = 0; k < w * h / 260; k++) {
                var x0 = Math.floor(r() * w), y0 = Math.floor(r() * h * 0.6);
                L.set(x0, y0, r() < 0.2 ? u32('#ffffff') : C.cloudN[4]);
            }
            if (full) {
                [[16, C.skyN[5]], [12, C.skyN[7]]].forEach(function (ring) {
                    L.ellipse(sx, sy, ring[0], ring[0], function (x, y) {
                        return dith(x, y) < 0.5 ? ring[1] : 0;
                    });
                });
                // Mặt trăng tròn: viền phải tối một bậc, hai vệt mờ.
                L.ellipse(sx, sy, 9, 9, function (x, y, nx, ny) {
                    if (nx * nx + ny * ny > 0.72 && nx > 0.25) return u32('#efe2b8');
                    var m1 = (nx + 0.3) * (nx + 0.3) + (ny + 0.15) * (ny + 0.15);
                    var m2 = (nx - 0.25) * (nx - 0.25) + (ny - 0.35) * (ny - 0.35);
                    return m1 < 0.06 || m2 < 0.04 ? u32('#ece0b8') : u32('#fdf4d8');
                });
            } else {
                L.ellipse(sx, sy, 8, 8, function (x, y, nx, ny) {
                    var mx = nx + 0.55, my = ny + 0.25;
                    if (mx * mx + my * my < 0.8) return 0;
                    return nx < -0.2 ? u32('#fdf4d8') : u32('#efe2b8');
                });
            }
        } else {
            [[16, C.sky[6]], [12, C.sky[7]]].forEach(function (ring) {
                L.ellipse(sx, sy, ring[0], ring[0], function (x, y) {
                    return dith(x, y) < 0.5 ? ring[1] : 0;
                });
            });
            L.ellipse(sx, sy, 8, 8, function (x, y, nx, ny) {
                return (nx * nx + ny * ny) < 0.55 ? u32('#fffaf0') : u32('#fbecc8');
            });
        }
        return L;
    }

    // Các khối mây tròn: khối nằm trước (z lớn) đè khối sau; mép trên khối sau sát khối trước tối
    // đi một bậc để tách khối. fill: phần dưới tâm mỗi khối kéo dài xuống đáy (biển mây).
    function puffs(L, list, pal, fill) {
        if (!list.length) return;
        var minX = Infinity, maxX = -Infinity, minY = Infinity;
        list.forEach(function (p) {
            minX = Math.min(minX, p.x - p.r);
            maxX = Math.max(maxX, p.x + p.r);
            minY = Math.min(minY, p.y - p.r * 0.82);
        });
        var x0 = Math.max(L.x, Math.floor(minX)), x1 = Math.min(L.x + L.w - 1, Math.ceil(maxX));
        var y0 = Math.max(L.y, Math.floor(minY)), y1 = L.y + L.h - 1;
        var W = x1 - x0 + 1, H = y1 - y0 + 1;
        if (W <= 0 || H <= 0) return;
        var own = new Int16Array(W * H).fill(-1);
        var nrm = new Float32Array(W * H * 2);
        var cols = [];
        for (var ci = 0; ci < W; ci++) cols.push([]);
        list.forEach(function (p, qi) {
            var a0 = Math.max(0, Math.floor(p.x - p.r) - x0), a1 = Math.min(W - 1, Math.ceil(p.x + p.r) - x0);
            for (var cx = a0; cx <= a1; cx++) cols[cx].push(qi);
        });
        for (var y = y0; y <= y1; y++) {
            for (var x = x0; x <= x1; x++) {
                var best = -1, bz = -1e9, bx = 0, by = 0;
                var cand = cols[x - x0];
                for (var qq = 0; qq < cand.length; qq++) {
                    var q = cand[qq];
                    var p = list[q];
                    var dx = (x + 0.5 - p.x) / p.r;
                    if (dx <= -1 || dx >= 1) continue;
                    var dy = (y + 0.5 - p.y) / (p.r * 0.82);
                    var d2 = dx * dx + dy * dy;
                    if (d2 > 1 && !(fill && dy > 0)) continue;
                    if (!fill && y >= p.base) continue;
                    var score = p.z * 1000 + (d2 <= 1 ? Math.sqrt(1 - d2) : 0);
                    if (score > bz) {
                        bz = score;
                        best = q;
                        bx = dx;
                        by = dy;
                    }
                }
                var i = (y - y0) * W + (x - x0);
                own[i] = best;
                nrm[i * 2] = bx;
                nrm[i * 2 + 1] = by;
            }
        }
        for (var j = 0; j < H; j++) {
            for (var i2 = 0; i2 < W; i2++) {
                var k = j * W + i2, o = own[k];
                if (o < 0) continue;
                var nx = nrm[k * 2], ny = nrm[k * 2 + 1];
                var nz = Math.sqrt(Math.max(0, 1 - nx * nx - Math.min(1, ny * ny)));
                var t = 0.56 + 0.5 * (-0.32 * nx - 0.78 * Math.min(1, ny) + 0.3 * nz);
                if (ny > 0.35) t -= (ny - 0.35) * 0.4;
                if (j + 1 < H) {
                    var below = own[k + W];
                    if (below >= 0 && below !== o && list[below].z >= list[o].z + 5) t -= 0.2;
                }
                if (j > 0 && own[k - W] < 0) t += 0.15;
                var sx = x0 + i2, sy = y0 + j;
                L.set(sx, sy, ramp(pal, clamp(t + (list[o].tone || 0), 0.02, 1), sx, sy));
            }
        }
    }

    // Đám mây trôi rời: đáy phẳng.
    function renderCloud(seed, wdt, night) {
        var r = rng(seed);
        var pal = night ? C.cloudN : C.cloud;
        var hgt = wdt * (0.3 + r() * 0.1);
        var list = [];
        var n = 4 + Math.floor(wdt / 14);
        for (var k = 0; k < n; k++) {
            var t = (k + 0.5) / n;
            var bulge = Math.sin(t * Math.PI);
            var rr = hgt * (0.35 + bulge * 0.5) * (0.8 + r() * 0.35);
            list.push({ x: t * wdt + (r() - 0.5) * 6, y: -rr * (0.35 + r() * 0.25), r: rr, z: bulge + r() * 0.3, base: 0 });
        }
        var L = new Layer(-hgt, -hgt * 2.2, wdt + hgt * 2, hgt * 2.2);
        puffs(L, list, pal, false);
        return L.trim();
    }

    // Biển mây: các hàng khối mây, hàng sau cao hơn; vẽ các hàng [from, to).
    function renderCloudSea(w, h, night, seed, from, to) {
        var L = new Layer(0, 0, w, h);
        var pal = night ? C.cloudN : C.cloud;
        var list = [];
        for (var k = from || 0; k < (to || 4); k++) {
            var r = rng(seed + k * 13);
            var base = h * (0.24 + k * 0.19);
            var x = -30 + r() * 20;
            while (x < w + 30) {
                var rad = 12 + r() * 16 + k * 5;
                list.push({ x: x, y: base - r() * 10, r: rad, z: k * 10 + r(), tone: -0.04 * (3 - k) });
                x += rad * (0.7 + r() * 0.6);
            }
        }
        puffs(L, list, pal, true);
        return L;
    }

    // Biển mây phủ kín dải cao h: n hàng cách đều, hàng dưới đè hàng trên.
    function renderCloudSeaRows(w, h, night, seed, n) {
        var L = new Layer(0, 0, w, h);
        var pal = night ? C.cloudN : C.cloud;
        var list = [];
        var gap = Math.min(70, h / (n + 0.5));
        for (var k = 0; k < n; k++) {
            var r = rng(seed + 100 + k * 17);
            var base = 22 + k * gap;
            if (base > h + 20) break;
            var x = -30 + r() * 20;
            while (x < w + 30) {
                var rad = 12 + r() * 16 + Math.min(k, 3) * 4;
                list.push({ x: x, y: base - r() * 10, r: rad, z: k * 10 + r(), tone: k === 0 ? -0.02 : 0.02 });
                x += rad * (0.7 + r() * 0.6);
            }
        }
        puffs(L, list, pal, true);
        return L;
    }

    // ---------- toàn cảnh (Node / xem trước): ghép mọi lớp vào một Layer ----------
    function renderScene(st, opt) {
        opt = opt || {};
        var ter = buildTerrain();
        var G = renderGround(ter);
        decorGround(G, ter, groundDecor(st));
        var objs = worldObjects(st).map(renderObject);
        var actors = worldActors(st).map(function (a) {
            var S = actorLayer(a, 0, false);
            var g = P(a.at[0], a.at[1], a.at[2]);
            return { id: a.id, fp: [a.at[0] - 0.2, a.at[1] - 0.2, a.at[0] + 0.2, a.at[1] + 0.2], layer: S, box: [S.x, S.y, S.x + S.w, S.y + S.h],
                glow: !!a.glow, foot: [Math.round(g[0]), Math.round(g[1])] };
        });
        if (st.night) {
            gradeNight(G.layer);
            objs.forEach(function (o) { gradeNight(o.layer); });
            actors.forEach(function (a) { gradeNight(a.layer); });
        }
        var all = sortDrawables(objs.concat(actors));
        var pad = opt.pad || 40;
        var GL = G.layer;
        var S = new Layer(GL.x - pad, GL.y - pad - 60, GL.w + pad * 2, GL.h + pad * 2 + 60);
        var sky = renderSky(S.w, S.h, st.night, !!(st.night && st.ram));
        sky.x = S.x;
        sky.y = S.y;
        S.blit(sky, 0, 0);
        var mtn = renderMountains(S.w, Math.round(S.h * 0.45), st.night, 5);
        mtn.x = S.x;
        mtn.y = S.y + Math.round(S.h * 0.12);
        S.blit(mtn, 0, 0);
        var seaH = Math.round(S.h * 0.4);
        var seaBack = renderCloudSea(S.w, seaH, st.night, 61, 0, 2);
        seaBack.x = S.x;
        seaBack.y = S.y + S.h - seaH;
        S.blit(seaBack, 0, 0);
        cloudBank(S, st.night);
        S.blit(GL, 0, 0);
        // Cá chép và đèn hoa đăng ở t = 0: engine vẽ chúng mỗi khung ở cùng chỗ trong thứ tự (sau mặt nước, trước vật).
        pondDecorLayers(st, 0).forEach(function (D) { S.blit(D, 0, 0); });
        all.forEach(function (d) { S.blit(d.layer, 0, 0); });
        if (st.night) {
            objs.forEach(function (o) {
                (o.lights || []).forEach(function (l) { addGlow(S, l.x, l.y, l.r, l.k, l.tint); });
            });
            // Khách đêm cầm đèn: quầng sáng ở chân (engine vẽ cùng bán kính, bám theo khi đi).
            actors.forEach(function (a) {
                if (a.glow) addGlow(S, a.foot[0], a.foot[1], ACTOR_GLOW_R, 0.85);
            });
            if (decorOf(st).hoadang) {
                pondLanterns(0).forEach(function (q) {
                    var s = P(q[0], q[1], q[2]);
                    addGlow(S, Math.round(s[0]), Math.round(s[1]) - 2, LANTERN_GLOW_R, 0.6);
                });
            }
        }
        var seaFront = renderCloudSea(S.w, seaH, st.night, 61, 2, 4);
        seaFront.x = S.x;
        seaFront.y = S.y + S.h - seaH + 26;
        S.blit(seaFront, 0, 0);
        return { layer: S, objects: objs, actors: actors, ground: G };
    }

    // Biển mây tĩnh cho ảnh xem trước (engine tự vẽ mây trôi).
    function cloudBank(S, night) {
        var r = rng(55);
        for (var k = 0; k < 5; k++) {
            var cl = renderCloud(300 + k, 46 + Math.floor(r() * 40), night);
            var x = S.x + r() * S.w;
            var y = S.y + S.h * (0.3 + r() * 0.25);
            S.blit(cl, Math.round(x - cl.x - cl.w / 2), Math.round(y - cl.y - cl.h));
        }
    }

    function groundDecor(st) {
        var rep = st.repairs || {};
        var leafAt = [];
        [[8.4, 1.8, 36], [15.4, 13.2, 12], [10.6, 8.6, 12], [16.4, 14.5, 0], [9.2, 11.3, 24], [10.6, 18.4, 0]].forEach(function (t, i) {
            var p = P(t[0], t[1], t[2]);
            leafAt.push({ x: p[0], y: p[1] + 2, r: 16, n: 30, pal: (i === 4 || i === 5) ? [C.ginkgo[3], C.ginkgo[4], C.ginkgo[2], C.ginkgo[5]] : null });
        });
        var lotus = [];
        var r = rng(91);
        for (var k = 0; k < 14; k++) {
            var lx = 12.3 + r() * 3.4, ly = 8.3 + r() * 3.4;
            if (lx > 12.5 && lx < 13.7) continue;
            if ((lx < 13 && ly < 9) || (lx > 15 && ly > 11)) continue;
            var p = P(lx, ly, 8);
            lotus.push({ x: p[0], y: p[1], r: 3 + Math.floor(r() * 3), flower: r() < 0.35 });
        }
        var mess = [];
        if (!rep.san) {
            [[4.0, 5.6, 36], [6.4, 6.4, 36], [8.5, 9.6, 24], [13.6, 17.8, 0], [11.0, 17.0, 0], [18.8, 16.6, 0], [21.0, 17.2, 0], [12.4, 12.9, 12],
                [11.6, 6.3, 36], [16.4, 3.7, 36], [3.4, 15.0, 12], [7.4, 12.9, 12], [21.6, 4.9, 32]].forEach(function (t) {
                var p = P(t[0], t[1], t[2]);
                mess.push({ x: p[0], y: p[1], r: 12, n: 46 });
            });
        }
        return { seed: 7, leafAt: leafAt, lotus: lotus, mess: mess };
    }

    // ---------- ban đêm ----------
    // Pixel phát sáng (cửa sổ thắp đèn, đèn lồng) giữ nguyên màu; mọi pixel khác nhuộm ánh trăng.
    var EMISSIVE = (function () {
        var m = {};
        C.glow.forEach(function (c) { m[c] = 1; });
        C.lantern.slice(2).forEach(function (c) { m[c] = 1; });
        return m;
    }());

    // Giữ alpha của pixel (bóng chân bán trong suốt vẫn trong suốt về đêm).
    function gradeNight(L) {
        var px = L.px;
        for (var i = 0; i < px.length; i++) {
            var c = px[i];
            if (!c || EMISSIVE[c]) continue;
            var r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
            r = Math.min(255, (r * 0.34 + 8) | 0);
            g = Math.min(255, (g * 0.4 + 10) | 0);
            b = Math.min(255, (b * 0.62 + 22) | 0);
            px[i] = (((c >>> 24) << 24) | (b << 16) | (g << 8) | r) >>> 0;
        }
    }

    // Màu cộng của quầng sáng theo tint: mặc định ánh đèn ấm; 'moon' ánh trăng lạnh (trăng giấy Sơn môn). [R, G, B]
    // cộng thêm ở ảnh xem trước (addGlow) và màu quầng của engine (glowSprite).
    var GLOW_TINT = {
        warm: { add: [70, 44, 12], rgb: [255, 168, 70] },
        moon: { add: [36, 52, 70], rgb: [170, 205, 255] }
    };

    // Vùng sáng quanh nguồn đèn (ảnh xem trước): ba vòng dither, cộng màu ấm (tint 'moon': màu trăng).
    function addGlow(L, x, y, r, k, tint) {
        var add = (GLOW_TINT[tint] || GLOW_TINT.warm).add;
        for (var yy = Math.floor(y - r); yy <= y + r; yy++) {
            for (var xx = Math.floor(x - r * 1.6); xx <= x + r * 1.6; xx++) {
                var dx = (xx - x) / 1.6, dy = yy - y;
                var d = Math.sqrt(dx * dx + dy * dy) / r;
                if (d >= 1) continue;
                var a = d < 0.35 ? 1 : (d < 0.65 ? (dith(xx, yy) < 0.6 ? 0.55 : 0.3) : (dith(xx, yy) < 0.4 ? 0.28 : 0));
                if (!a) continue;
                var c = L.get(xx, yy);
                if (!c) continue;
                var R = c & 255, G = (c >>> 8) & 255, B = (c >>> 16) & 255;
                R = Math.min(255, R + add[0] * a * k) | 0;
                G = Math.min(255, G + add[1] * a * k) | 0;
                B = Math.min(255, B + add[2] * a * k) | 0;
                L.set(xx, yy, ((255 << 24) | (B << 16) | (G << 8) | R) >>> 0);
            }
        }
    }

    // Bán kính quầng đèn của khách đêm (pixel nghệ thuật), dùng chung cho ảnh xem trước và engine.
    var ACTOR_GLOW_R = 14;

    // Nguồn sáng được các hàm vẽ ghi lại trong lúc dựng sprite; tint (tuỳ chọn) là khoá của GLOW_TINT.
    var LIGHTS = null;
    function light(x, y, r, k, tint) {
        if (!LIGHTS) return;
        var l = { x: Math.round(x), y: Math.round(y), r: r, k: k || 1 };
        if (tint) l.tint = tint;
        LIGHTS.push(l);
    }

    // ---------- engine (chỉ chạy trong trình duyệt) ----------
    function layerCanvas(L) {
        var c = document.createElement('canvas');
        c.width = L.w;
        c.height = L.h;
        var g = c.getContext('2d');
        var img = g.createImageData(L.w, L.h);
        new Uint32Array(img.data.buffer).set(L.px);
        g.putImageData(img, 0, 0);
        return c;
    }

    function glowSprite(r, tint) {
        var rgb = (GLOW_TINT[tint] || GLOW_TINT.warm).rgb;
        var w = Math.ceil(r * 3.2) + 1, h = Math.ceil(r * 2) + 1;
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        var g = c.getContext('2d');
        var img = g.createImageData(w, h);
        var d = img.data;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var dx = (x - w / 2) / 1.6, dy = y - h / 2;
                var dist = Math.sqrt(dx * dx + dy * dy) / r;
                if (dist >= 1) continue;
                var a = dist < 0.35 ? 0.42 : (dist < 0.65 ? (dith(x, y) < 0.6 ? 0.26 : 0.14) : (dith(x, y) < 0.4 ? 0.12 : 0));
                var i = (y * w + x) * 4;
                d[i] = rgb[0];
                d[i + 1] = rgb[1];
                d[i + 2] = rgb[2];
                d[i + 3] = Math.round(a * 255);
            }
        }
        g.putImageData(img, 0, 0);
        return c;
    }

    // Năm bậc ban đầu (sống lưng của đảo, từ chính điện xuống sơn môn): camera gốc đặt giữa khung này,
    // vùng đất mới hai bên chỉ lộ một phần để người chơi kéo sang xem.
    var CORE_TERRACES = { dinh: 1, trai: 1, ho: 1, tra: 1, mon: 1 };
    function coreBounds() {
        var x0 = Infinity, x1 = -Infinity;
        TERRACES.forEach(function (t) {
            if (!CORE_TERRACES[t.id]) return;
            x0 = Math.min(x0, P(t.x0, t.y1, t.z)[0]);
            x1 = Math.max(x1, P(t.x1, t.y0, t.z)[0]);
        });
        return { x0: x0, x1: x1, cx: (x0 + x1) / 2 };
    }

    // Cảnh tĩnh (mặt đất + công trình + cây) chỉ phụ thuộc mức sửa và ngày/đêm; nhân vật vẽ riêng.
    function prepScene(ter, st) {
        var G = renderGround(ter);
        decorGround(G, ter, groundDecor(st));
        var objs = worldObjects(st).map(renderObject);
        var lights = [];
        objs.forEach(function (o) {
            (o.lights || []).forEach(function (l) { lights.push(l); });
        });
        var water = [];
        for (var i = 0; i < G.types.length; i++) {
            if (G.types[i] === T_WATER) water.push(i);
        }
        if (st.night) {
            gradeNight(G.layer);
            objs.forEach(function (o) {
                gradeNight(o.layer);
                if (o.anim) o.anim.layers.forEach(gradeNight);
            });
        }
        objs.forEach(function (o) {
            o.canvas = layerCanvas(o.layer);
            if (o.anim) o.anim.canvases = o.anim.layers.map(layerCanvas);
        });
        return {
            ground: layerCanvas(G.layer), G: G, water: water,
            objects: objs, lights: lights, bounds: sceneBounds(G.layer, objs), core: coreBounds()
        };
    }

    function sceneBounds(GL, objs) {
        var x0 = GL.x, y0 = GL.y, x1 = GL.x + GL.w, y1 = GL.y + GL.h;
        objs.forEach(function (o) {
            x0 = Math.min(x0, o.box[0]);
            y0 = Math.min(y0, o.box[1]);
            x1 = Math.max(x1, o.box[2]);
            y1 = Math.max(y1, o.box[3]);
        });
        y0 -= 26;
        return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }

    // Khoá cảnh: ngày/đêm, bốn mục sửa, bảy lưu niệm có vật trên đảo (miếu Thổ Địa, lá bùa cổng, mẫu đơn nở, câu đối
    // Vọng Vân Đình; đợt D: trăng giấy, bó thảo dược, đèn Thư trai) và năm món tô điểm (đèn hoa đăng, chuông gió, cá
    // chép, cây đào, tiên hạc). Đèn hoa đăng và cá chép engine vẽ mỗi khung, nhưng vẫn vào khoá để debug().key đổi khi mua.
    // Ký tự cuối (đợt E): số đèn đố chữ đêm rằm dưới hiên Chính điện (0 khi không có; chỉ vẽ ban đêm).
    function stateKey(st) {
        var r = st.repairs || {};
        var k = st.keeps || {};
        var d = decorOf(st);
        return [st.night ? 'n' : 'd', r.san ? 1 : 0, r.cau ? 1 : 0, r.den ? 1 : 0, r.mai ? 1 : 0,
            k.mieu ? 1 : 0, k.phu ? 1 : 0, k.hoa ? 1 : 0, k.doi ? 1 : 0, k.trang ? 1 : 0, k.thuoc ? 1 : 0, k.dang ? 1 : 0,
            d.hoadang ? 1 : 0, d.chuong ? 1 : 0, d.cachep ? 1 : 0, d.dao ? 1 : 0, d.hac ? 1 : 0,
            st.night ? Math.min(9, st.ramLamps || 0) : 0].join('');
    }

    // ---------- món tô điểm động trên Hồ sen (đợt D): đèn hoa đăng, cá chép đỏ ----------
    // Hàm thuần theo thời gian t (giây): engine gọi mỗi khung, ảnh xem trước lấy t = 0. Toạ độ thế giới trên mặt nước
    // (z 8) trong vùng nước phía đông cầu, x 13,8–15,8 và y 8,7–10,8: mọi ô ở đó là nước, cách cầu, đá rùa của Lão Quy
    // và chân thác; nhãn Hồ sen nằm phía trên vùng này.
    var POND_DECOR = { cx: 14.8, cy: 9.75, z: 8 };
    var LANTERN_GLOW_R = 7;

    // Đèn hoa đăng: sáu đèn trôi chậm một vòng quanh hồ (một vòng 90 s), cách đều nhau; mỗi đèn lệch bán kính và nhấp
    // nhô riêng một chút cho khỏi đều như bánh xe. Trả [[x, y, z], …].
    function pondLanterns(t) {
        var out = [];
        for (var i = 0; i < 6; i++) {
            var a = t * (Math.PI * 2 / 90) + i * Math.PI / 3 + (hash2(i, 1, 501) - 0.5) * 0.5;
            var rx = 0.8 + hash2(i, 2, 501) * 0.12, ry = 0.86 + hash2(i, 3, 501) * 0.1;
            var wob = Math.sin(t * 0.7 + i * 1.9) * 0.05;
            out.push([POND_DECOR.cx + Math.cos(a) * rx + wob, POND_DECOR.cy + Math.sin(a) * ry - wob, POND_DECOR.z]);
        }
        return out;
    }

    // Cá chép đỏ: ba con lượn theo đường cong Lissajous chậm, mỗi con một nhịp. Trả [{ at, dir, flap }]: dir −1 khi
    // đang bơi sang trái màn hình, 1 sang phải; flap đổi khung đuôi ba lần mỗi giây.
    function pondKoi(t) {
        var out = [];
        for (var i = 0; i < 3; i++) {
            var w1 = 0.11 + i * 0.023, w2 = 0.17 + i * 0.031, p = i * 2.1;
            var x = POND_DECOR.cx + Math.sin(t * w1 + p) * 0.82, y = POND_DECOR.cy + Math.sin(t * w2 + p * 1.7) * 0.94;
            var dx = Math.cos(t * w1 + p) * w1, dy = Math.cos(t * w2 + p * 1.7) * w2;
            out.push({ at: [x, y, POND_DECOR.z], dir: dx - dy >= 0 ? 1 : -1, flap: Math.floor(t * 3 + i * 0.5) % 2 });
        }
        return out;
    }

    // Cá chép nhìn từ trên xuống hơi nghiêng, đầu bên trái (dir −1; dir 1 lật ngang), dài 7: đầu trắng, lưng đỏ cam,
    // bụng cam, đuôi nhạt xoè; khung 1 đuôi quẫy sang hàng khác. Layer có x, y âm: điểm neo (tâm thân, trên mặt nước) ở
    // (0, 0). Không viền mực: cá ở dưới nước. Đêm: nhuộm trăng như mọi vật.
    function koiLayer(dir, flap, night) {
        var rows = flap ? ['..RRr..', 'WRrRoot', '..o....'] : ['..RRr.t', 'WRrRoo.', '..o...t'];
        var pc = { W: u32('#fff0e2'), R: u32('#e4532c'), r: u32('#b93a22'), o: u32('#f59a52'), t: u32('#f6c09a') };
        var L = new Layer(-3, -1, 7, 3);
        for (var j = 0; j < 3; j++) {
            for (var i = 0; i < 7; i++) {
                var ch = rows[j][dir > 0 ? 6 - i : i];
                if (ch !== '.') L.set(L.x + i, L.y + j, pc[ch]);
            }
        }
        if (night) gradeNight(L);
        return L;
    }

    // Đèn hoa đăng: đài sen hồng ôm ngọn nến, đế lá sen, một vệt sáng in xuống nước. Điểm neo (mặt nước) ở hàng đáy giữa.
    // Chỉ có ban đêm nên màu chọn sẵn cho đêm: cánh sen được nến soi từ trong nên sáng, ngọn nến dùng màu đèn.
    function lanternLayer() {
        var L = new Layer(-2, -3, 5, 5);
        stampRows(L, ['..y..', '.aYa.', 'aAbAa', 'AgGgA', '..r..'], -2, -3, {
            y: C.glow[3], Y: C.glow[2], b: C.glow[1], a: u32('#ffc9d6'), A: u32('#ee8aa6'), g: u32('#3c6a44'), G: u32('#2a4c34'),
            r: u32a('#ffd9a0', 120)
        });
        return L;
    }

    // Layer đã đặt chỗ của cá chép (mọi lúc) và đèn hoa đăng (chỉ ban đêm) ở thời điểm t, cho ảnh xem trước (renderScene).
    function pondDecorLayers(st, t) {
        var d = decorOf(st), out = [];
        if (d.cachep) {
            pondKoi(t).forEach(function (k) {
                var s = P(k.at[0], k.at[1], k.at[2]), L = koiLayer(k.dir, k.flap, st.night);
                L.x += Math.round(s[0]);
                L.y += Math.round(s[1]);
                out.push(L);
            });
        }
        if (d.hoadang && st.night) {
            pondLanterns(t).forEach(function (q) {
                var s = P(q[0], q[1], q[2]), L = lanternLayer();
                L.x += Math.round(s[0]);
                L.y += Math.round(s[1]);
                out.push(L);
            });
        }
        return out;
    }

    // Cá câu được (bay lên khỏi mặt nước): màu thân và chấm sáng theo loài. Loài mới trong story phải có ở đây
    // (test kiểm), không thì cá bay lên mang màu cá diếc.
    var CATCH_COLOR = {
        diec: ['#8a96a0', '#c3ccd2'], vang: ['#e0a020', '#ffe07a'], chep: ['#d0702c', '#f2b061'],
        tram: ['#6f7f3a', '#a7b65e'], den: ['#3c4a5c', '#71839a'], que: ['#8a6a2c', '#d8b25a'],
        bach: ['#d6e0e6', '#ffffff']
    };

    // Chỗ đứng câu: chưa sửa cầu thì đứng trên bờ, sửa rồi thì ra cuối cầu (chỗ nước sâu).
    var FISH_SPOT = {
        shore: { at: [13.1, 12.32, 12], hook: [14.15, 11.0, 8], area: [14.0, 8.7, 15.6, 10.6] },
        deep: { at: [13.1, 10.25, 12], hook: [14.05, 9.7, 8], area: [14.4, 8.4, 15.7, 10.2] }
    };
    var KEEPER_HOME = [5.6, 6.3, 36];

    // Tạo thế giới trong phần tử `stage` (position: relative).
    // opts.onPlace(id) khi chạm công trình, opts.onActor(id) khi chạm nhân vật; opts.fishTile: phần tử
    // DOM (thẻ chữ) được engine đặt ngay trên con cá trong lúc câu; opts.walkScale: hệ số tốc độ đi của mọi
    // nhân vật (mặc định 1; chỉ để chạy thử, app lấy từ ?walk=N).
    function create(opts) {
        var stage = opts.stage;
        var canvas = document.createElement('canvas');
        canvas.className = 'qw-canvas';
        var overlay = document.createElement('div');
        overlay.className = 'qw-overlay';
        stage.appendChild(canvas);
        stage.appendChild(overlay);
        var ctx = canvas.getContext('2d');
        var ter = buildTerrain();
        var st = { repairs: {}, guests: {}, night: false, marks: {} };
        var scene = null, sceneKey = '';
        var cache = {};
        var dpr = 1, scale = 4, userScale = 0, vw = 1, vh = 1;
        var cam = { x: 0, y: 0, tx: null, ty: null };
        var homeCam = { x: 0, y: 0 };
        var bg = { key: '', sky: null, mtn: null, seaBack: null, seaFront: null, clouds: [] };
        var glows = {};
        var parts = [];
        var running = false, raf = 0, lastFrame = 0, t0 = 0;
        var labels = {}, plaques = [], marks = {};
        var actors = [], order = [], keeperAt = KEEPER_HOME.slice();
        var spriteCache = {};
        var fish = null;
        var labelsOn = true;
        var onPlace = opts.onPlace || function () {};
        var onActor = opts.onActor || function () {};
        var fishTile = opts.fishTile || null;
        var walkScale = opts.walkScale > 0 ? opts.walkScale : 1;
        // Tên đọc của dấu "!" (app biết tên khách); mặc định theo id.
        var markLabel = typeof opts.markLabel === 'function' ? opts.markLabel : function (id) { return 'Gặp ' + id; };
        // covered: hộp thoại cao che màn hình. 'part' (máy tính, hai bên hộp thoại vẫn thấy đảo): vẽ ~4 khung/s.
        // 'full' (điện thoại, hộp thoại phủ gần trọn màn hình): không vẽ lại. Có người đi, camera đang lướt hay đang câu
        // cá thì vẫn vẽ ~12 khung/s; khoảng 80–97 ms nằm dưới mức kẹp 0,1 s của stepWalks, nên người đi không chậm lại.
        // calm: người dùng bật giảm chuyển động. Mây, nước, khói và đèn đứng yên, camera tới thẳng chỗ mới, nên khung tĩnh
        // không vẽ lại; người đi lại vẫn di chuyển, vì đó là thông tin của trò chơi.
        // Mọi thay đổi trạng thái (setState, walk, kéo, phóng to, câu cá…) gọi requestDraw(), nên vẫn có một khung mới.
        var covered = '';
        var frames = 0;
        var calmMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        var calm = !!(calmMq && calmMq.matches);

        // ----- nhãn DOM -----
        PLACES.forEach(function (p) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'qw-label';
            b.setAttribute('data-place', p.id);
            b.innerHTML = '<b lang="zh">' + p.zh + '</b><span>' + p.vi + '</span><i class="qw-badge" hidden></i>';
            b.addEventListener('click', function (ev) {
                ev.stopPropagation();
                onPlace(p.id);
            });
            overlay.appendChild(b);
            labels[p.id] = { el: b, def: p, badge: b.querySelector('.qw-badge') };
        });
        PLAQUES.forEach(function (p) {
            var d = document.createElement('div');
            d.className = 'qw-plaque qw-plaque-' + p.face;
            d.setAttribute('lang', 'zh');
            d.textContent = p.text;
            overlay.appendChild(d);
            plaques.push({ el: d, def: p });
        });

        // Dựng lại cảnh khi mức sửa hay ngày/đêm đổi; actor còn id thì giữ chỗ đứng và đường đang đi (app chỉ
        // gọi khi state thật sự đổi, nên world không so sánh).
        function setState(next) {
            next = next || {};
            st = {
                repairs: next.repairs || {},
                keeps: next.keeps || {},
                decor: decorOf(next),
                guests: next.guests || {},
                night: !!next.night,
                marks: next.marks || {},
                visitors: next.visitors || [],
                // Đêm rằm: trăng tròn trên nền, và số đèn đố chữ dưới hiên Chính điện.
                ram: !!next.ram,
                ramLamps: Number(next.ramLamps) || 0
            };
            var key = stateKey(st);
            var first = !scene;
            // Nền dựng lại theo khoá riêng (cỡ khung, ngày/đêm, trăng tròn): vào đêm rằm khi chưa treo đèn thì khoá cảnh
            // không đổi nhưng trời vẫn phải đổi trăng.
            if (scene && bg.key !== bgKey()) buildBackground();
            if (key !== sceneKey || !scene) {
                if (!cache[key]) {
                    cache[key] = prepScene(ter, st);
                    var keys = Object.keys(cache);
                    if (keys.length > 3) delete cache[keys[0] === key ? keys[1] : keys[0]];
                }
                scene = cache[key];
                sceneKey = key;
                if (bg.key !== bgKey()) buildBackground();
                setupParticles();
                plaques.forEach(function (p) {
                    p.el.hidden = !!(p.def.need && !st.repairs[p.def.need]);
                });
            }
            rebuildActors();
            syncMarks();
            if (first) home();
            lastOverlay = '';
            requestDraw();
        }

        // ----- nhân vật -----
        // Khung của một sprite theo ngày/đêm, ba tập dựng từ spriteSets: front, back, fish (tập không có là null).
        // Khung lật ngang (đi sang phải) dựng lần đầu cần tới rồi giữ. Tập fish vẽ nhìn phải, không bao giờ lật.
        function spriteFrames(name) {
            var key = name + (st.night ? '|n' : '|d');
            if (spriteCache[key]) return spriteCache[key];
            var sp = SPRITES[name], sets = spriteSets(name);
            function frameOf(rows, shadow) {
                var L = rowsLayer(rows, sp.pal, shadow);
                if (st.night) gradeNight(L);
                return { layer: L, canvas: layerCanvas(L), flipped: null };
            }
            function build(s, fixed) {
                if (!s) return null;
                var blink = null;
                if (s.blink) {
                    var br = s.frames[0].slice();
                    br[s.blink[0]] = s.blink[1];
                    blink = frameOf(br, s.shadow);
                }
                return {
                    frames: s.frames.map(function (rows) { return frameOf(rows, s.shadow); }), blink: blink,
                    idle: s.idle, walk: s.walk, anchor: s.anchor, tip: s.tip, hand: s.hand, fixed: !!fixed
                };
            }
            spriteCache[key] = {
                front: build(sets.front, false), back: build(sets.back, false), fish: build(sets.fish, true),
                rate: sp.rate || 0.7, face: sp.face || -1
            };
            return spriteCache[key];
        }

        function flipOf(fr) {
            if (!fr.flipped) {
                var L = flipLayer(fr.layer);
                fr.flipped = { layer: L, canvas: layerCanvas(L) };
            }
            return fr.flipped;
        }

        // Tập khung đang dùng: tư thế câu > mặt sau > mặt trước; sprite thiếu tập nào thì dùng mặt trước.
        function setOf(a) {
            if (a.pose === 'fish' && a.sets.fish) return 'fish';
            if (a.facing === 'back' && a.sets.back) return 'back';
            return 'front';
        }

        // Đặt actor theo a.at: chọn tập khung (a.set tên tập, a.cur tập), khung vẽ, hộp xếp lớp, footprint, ô phần tư
        // (đổi ô hay đổi tập thì người gọi xếp lại thứ tự vẽ). Vùng chạm lấy theo khung 0 của tập đang dùng, lật cùng
        // hướng đang nhìn (tập fish không lật). Tập có anchor: cột anchor của hàng chữ (cột anchor + 1 của Layer)
        // đứng đúng a.ax; không có thì căn giữa khung như cũ.
        function placeActor(a) {
            var set = setOf(a), S = a.sets[set];
            var flip = a.flip && !S.fixed;
            var L = flip ? flipOf(S.frames[0]).layer : S.frames[0].layer;
            var p = P(a.at[0], a.at[1], a.at[2]);
            var col = Math.floor(L.w / 2);
            if (typeof S.anchor === 'number') col = flip ? L.w - 2 - S.anchor : S.anchor + 1;
            a.set = set;
            a.cur = S;
            a.ax = Math.round(p[0]);
            a.ay = Math.round(p[1]);
            a.layer = { x: a.ax - col, y: a.ay - L.h + 1, w: L.w, h: L.h, px: L.px };
            a.box = [a.layer.x, a.layer.y, a.layer.x + L.w, a.layer.y + L.h];
            a.fp = [a.at[0] - 0.2, a.at[1] - 0.2, a.at[0] + 0.2, a.at[1] + 0.2];
            a.cell = Math.floor(a.at[0] * 4) + ',' + Math.floor(a.at[1] * 4);
        }

        // Dựng lại danh sách actor theo định nghĩa mới. Actor còn id thì giữ chỗ đứng, chiều lật (flip), hướng nhìn
        // (facing), tư thế (pose), đường đang đi và trạng thái ẩn; sprite, nơi, quầng đèn, chỗ nghỉ lấy theo định nghĩa
        // mới (đổi hình người sang hình thật tại chỗ). Actor mất khỏi định nghĩa: đường đang đi kết thúc với false.
        function rebuildActors() {
            var prev = {}, alive = {};
            actors.forEach(function (a) { prev[a.id] = a; });
            actors = worldActors(st).map(function (d) {
                var fr = spriteFrames(d.sprite);
                var a = prev[d.id];
                if (!a) {
                    a = {
                        id: d.id, actor: true, at: d.at.slice(), flip: false, facing: 'front', pose: null,
                        seed: Math.floor(hash2(Math.round(d.at[0] * 10), Math.round(d.at[1] * 10), 5) * 1000)
                    };
                }
                alive[d.id] = true;
                a.place = d.place;
                a.sprite = d.sprite;
                a.home = d.place || (d.id === 'keeper' ? 'hall' : null);
                a.rest = d.at.slice();
                a.glow = !!d.glow;
                a.visitor = !!d.visitor;
                a.sets = fr;
                a.rate = fr.rate;
                a.face = fr.face;
                placeActor(a);
                return a;
            });
            Object.keys(walks).forEach(function (id) { if (!alive[id]) endWalk(id, false); });
            Object.keys(hidden).forEach(function (id) { if (!alive[id]) delete hidden[id]; });
            resort();
        }

        function resort() {
            order = sortDrawables(scene.objects.concat(actors.filter(function (a) { return !hidden[a.id]; })));
        }

        function actorById(id) {
            for (var i = 0; i < actors.length; i++) if (actors[i].id === id) return actors[i];
            return null;
        }

        // Actor đang hiện (không ẩn): dùng cho dấu "!", chạm, quầng đèn.
        function shownActor(id) {
            return hidden[id] ? null : actorById(id);
        }

        // ----- đi lại -----
        // walks[id] = { plan (walkPlan), ids (id điểm theo từng toạ độ), to, glow, total, done, last, resolve }.
        var walks = {}, hidden = {}, fishFrom = null;

        // Kết thúc đường đi. Tới nơi (ok): quay mặt ra máy quay để chạm và hiện dấu "!"; dừng giữa đường giữ hướng.
        function endWalk(id, ok) {
            var w = walks[id];
            if (!w) return;
            delete walks[id];
            if (ok) faceFront(actorById(id));
            w.resolve(ok);
        }

        // Quay mặt ra (facing 'front'); tập khung đổi thì đặt lại actor và xếp lại thứ tự vẽ.
        function faceFront(a) {
            if (!a || a.facing === 'front') return;
            var set = a.set;
            a.facing = 'front';
            placeActor(a);
            if (a.set !== set) resort();
        }

        // Hai đầu đoạn actor đang đi (để lập đường mới từ giữa chặng mà không cắt ngang vật cản).
        function viaOf(id) {
            var w = walks[id];
            if (!w) return [];
            var k = Math.min(w.plan.seg, w.ids.length - 2);
            return [w.ids[k], w.ids[k + 1]].filter(function (x) { return !!x; });
        }

        function blockedNow() {
            return st.repairs.cau ? {} : { bridge: true };
        }

        // Dịch actor tới at; đổi ô phần tư hay đổi tập khung (tư thế, hướng nhìn vừa đổi) thì xếp lại thứ tự vẽ.
        function moveTo(a, at) {
            var cell = a.cell, set = a.set;
            a.at = [at[0], at[1], at[2]];
            placeActor(a);
            if (a.cell !== cell || a.set !== set) resort();
        }

        // Đích là "về nhà" khi là nơi của actor (khách quen, khách đêm; người giữ quán là Chính điện) hoặc là điểm
        // đi gần chỗ nghỉ nhất (app tính "điểm nhà" của khách quen đi dạo theo cách này): khi đó đi tiếp vào đúng
        // chỗ nghỉ thay vì dừng ở điểm.
        function homeKey(a, target) {
            if (!a.rest) return a.home;
            return target === a.home || target === nearestWaypoint(a.rest) ? target : a.home;
        }

        // Đi tới target (id điểm hoặc id nơi). opts.from: id điểm xuất phát (actor dịch ngay tới đó);
        // opts.speed: ô/giây (mặc định 1.6); opts.glow: cầm đèn trong lúc đi. Promise → true khi tới; false khi
        // stopWalk, hide, teleport, lần walk mới, actor mất khỏi định nghĩa, hoặc không có đường.
        function walk(id, target, opts) {
            opts = opts || {};
            return new Promise(function (resolve) {
                var a = actorById(id);
                if (!a || hidden[id] || !scene) {
                    resolve(false);
                    return;
                }
                var via = viaOf(id);
                endWalk(id, false);
                var from = opts.from && WAY_BY_ID[opts.from] ? opts.from : null;
                var route = planRoute(a.at, target, { from: from, via: via, home: homeKey(a, target), rest: a.rest, blocked: blockedNow() });
                if (!route) {
                    resolve(false);
                    return;
                }
                if (from) moveTo(a, WAY_BY_ID[from].at);
                var total = 0;
                for (var i = 1; i < route.points.length; i++) total += flatDist(route.points[i - 1], route.points[i]);
                if (route.points.length < 2 || total < 1e-6) {
                    faceFront(a);
                    lastOverlay = '';
                    requestDraw();
                    resolve(true);
                    return;
                }
                walks[id] = {
                    plan: walkPlan(route.points, opts.speed > 0 ? opts.speed : 1.6), ids: route.ids, to: target,
                    glow: !!opts.glow, total: total, done: 0, last: 0, resolve: resolve
                };
                lastOverlay = '';
                requestDraw();
            });
        }

        // Mỗi khung vẽ: đẩy mọi actor đang đi theo thời gian thật (dt kẹp ≤ 0,1 s để quay lại tab không nhảy cóc,
        // rồi nhân walkScale), lật hướng theo chiều đi trên màn hình, quay lưng khi đi xa máy quay (walkStep.away), xếp
        // lại thứ tự vẽ khi đổi ô phần tư hay đổi tập khung, cho dấu "!" bám theo. Tới nơi thì endWalk quay mặt ra.
        function stepWalks(now) {
            var ids = Object.keys(walks);
            if (!ids.length) return;
            var moved = false, arrived = [];
            ids.forEach(function (id) {
                var w = walks[id], a = actorById(id);
                if (!a) {
                    endWalk(id, false);
                    return;
                }
                var dt = w.last ? Math.min(0.1, Math.max(0, now - w.last) / 1000) * walkScale : 0;
                w.last = now;
                var r = walkStep(w.plan, dt);
                w.done = Math.min(w.total, w.done + dt * w.plan.speed);
                var cell = a.cell, set = a.set;
                a.at = r.at;
                if (r.dir) a.flip = r.dir * a.face < 0;
                if (r.away === true || r.away === false) a.facing = r.away ? 'back' : 'front';
                placeActor(a);
                if (a.cell !== cell || a.set !== set) moved = true;
                if (r.done) arrived.push(id);
            });
            if (moved) resort();
            lastOverlay = '';
            arrived.forEach(function (id) { endWalk(id, true); });
        }

        function stopWalk(id) {
            endWalk(id, false);
        }

        // Dịch ngay tới target: id điểm, id nơi ("về nhà" như walk thì về chỗ nghỉ), hoặc toạ độ [x, y, z].
        function teleport(id, target) {
            var a = actorById(id);
            if (!a) return false;
            var at = null;
            if (Object.prototype.toString.call(target) === '[object Array]') at = target;
            else if (a.rest && target === homeKey(a, target)) at = a.rest;
            else if (WAY_BY_ID[target]) at = WAY_BY_ID[target].at;
            if (!at) return false;
            endWalk(id, false);
            moveTo(a, at);
            lastOverlay = '';
            requestDraw();
            return true;
        }

        function hide(id) {
            if (!actorById(id) || hidden[id]) return;
            hidden[id] = true;
            endWalk(id, false);
            resort();
            syncMarks();
            lastOverlay = '';
            requestDraw();
        }

        function show(id) {
            if (!hidden[id]) return;
            delete hidden[id];
            resort();
            syncMarks();
            lastOverlay = '';
            requestDraw();
        }

        function syncMarks() {
            Object.keys(marks).forEach(function (id) {
                if (!st.marks[id] || !shownActor(id)) {
                    marks[id].remove();
                    delete marks[id];
                }
            });
            Object.keys(st.marks).forEach(function (id) {
                if (!st.marks[id] || !shownActor(id)) return;
                var el = marks[id];
                if (!el) {
                    el = document.createElement('button');
                    el.type = 'button';
                    el.className = 'qw-mark';
                    el.setAttribute('data-id', id);
                    el.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        onActor(id);
                    });
                    overlay.appendChild(el);
                    marks[id] = el;
                }
                el.textContent = st.marks[id];
                el.setAttribute('aria-label', markLabel(id));
            });
        }

        function bgKey() {
            return vw + 'x' + vh + (st.night ? 'n' : 'd') + (st.night && st.ram ? 'f' : '');
        }

        function buildBackground() {
            bg.key = bgKey();
            bg.sky = layerCanvas(renderSky(vw, vh, st.night, !!(st.night && st.ram)));
            // Núi trôi theo camera với thị sai 0,3: rộng hơn màn hình đủ cho cả tầm kéo ngang của đảo.
            var b = scene.bounds;
            var pan = Math.max(0, (b.w - vw) / 2 + 24) + Math.abs(scene.core.cx - (b.x + b.w / 2));
            bg.mtnPad = 80 + Math.ceil(pan * 0.3);
            var mw = vw + bg.mtnPad * 2, mh = clamp(Math.round(vh * 0.36), 110, 220);
            bg.mtn = layerCanvas(renderMountains(mw, mh, st.night, 5));
            var sw = Math.max(vw + 96, 320);
            bg.seaBack = layerCanvas(renderCloudSea(sw, clamp(Math.round(vh * 0.36), 140, 260), st.night, 61, 0, 2));
            // Hàng trước cao bằng cả màn hình: khi thu nhỏ, mây phủ kín tới đáy, không lộ dải phẳng.
            var fh = Math.max(200, vh);
            bg.seaFront = layerCanvas(renderCloudSeaRows(sw, fh, st.night, 61, 6));
            bg.seaColor = rgbaOf(st.night ? C.cloudN[1] : C.cloud[1], 1);
            bg.clouds = [];
            var r = rng(99);
            for (var k = 0; k < 4; k++) {
                var L = renderCloud(500 + k, 40 + Math.floor(r() * 46), st.night);
                bg.clouds.push({ c: layerCanvas(L), w: L.w, h: L.h, x: r() * (vw + 200), y: 0.18 + r() * 0.4, v: 2 + r() * 3, mist: k === 3 });
            }
        }

        function rgbaOf(c, a) {
            return 'rgba(' + (c & 255) + ',' + ((c >>> 8) & 255) + ',' + ((c >>> 16) & 255) + ',' + a + ')';
        }

        // ----- kích thước, tỉ lệ pixel -----
        function autoScale(devW, devH) {
            // Điện thoại dọc: đảo vừa chiều ngang (~300 px nghệ thuật); máy tính: ~2×.
            var s = Math.round(Math.min(devW / 300, devH / 330));
            return clamp(s, 2, 6);
        }

        function resize() {
            dpr = window.devicePixelRatio || 1;
            var cssW = stage.clientWidth || window.innerWidth, cssH = stage.clientHeight || window.innerHeight;
            var devW = Math.round(cssW * dpr), devH = Math.round(cssH * dpr);
            scale = userScale || autoScale(devW, devH);
            vw = Math.ceil(devW / scale);
            vh = Math.ceil(devH / scale);
            canvas.width = vw;
            canvas.height = vh;
            canvas.style.width = (vw * scale / dpr) + 'px';
            canvas.style.height = (vh * scale / dpr) + 'px';
            ctx.imageSmoothingEnabled = false;
            if (scene && bg.key !== bgKey()) buildBackground();
            clampCam();
            lastOverlay = '';
            requestDraw();
        }

        function home() {
            var b = scene.bounds;
            cam.x = scene.core.cx;
            cam.y = b.h + 40 > vh ? b.y - 20 + vh / 2 : b.y + b.h * 0.52;
            cam.tx = cam.ty = null;
            clampCam();
            homeCam.x = cam.x;
            homeCam.y = cam.y;
        }

        function clampCam() {
            if (!scene) return;
            var b = scene.bounds;
            var mx = Math.max(0, (b.w - vw) / 2 + 24), my = Math.max(0, (b.h - vh) / 2 + 40);
            var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
            cam.x = clamp(cam.x, cx - mx, cx + mx);
            cam.y = clamp(cam.y, cy - my, cy + my);
            if (cam.tx !== null) {
                cam.tx = clamp(cam.tx, cx - mx, cx + mx);
                cam.ty = clamp(cam.ty, cy - my - vh * 0.3, cy + my + vh * 0.3);
            }
        }

        // Đưa điểm (toạ độ màn hình thế giới) về vị trí frac (0 = mép trên, 1 = mép dưới) của khung nhìn.
        function focusPoint(sx, sy, frac) {
            cam.tx = sx;
            cam.ty = sy + vh * (0.5 - (frac === undefined ? 0.5 : frac));
            requestDraw();
        }

        function focus(id, frac) {
            var p = null;
            PLACES.forEach(function (q) { if (q.id === id) p = q; });
            if (!p) return;
            var s = P(p.at[0], p.at[1], p.at[2] - 30);
            focusPoint(s[0], s[1], frac);
        }

        // ----- hạt: khói hương, lá rơi, đom đóm -----
        function setupParticles() {
            parts = [];
            var r = rng(7);
            scene.objects.forEach(function (o) {
                if (o.id === 'burner') {
                    for (var k = 0; k < 7; k++) {
                        parts.push({ kind: 'smoke', x: (o.box[0] + o.box[2]) / 2, y: o.box[1] + 2, ph: k / 7, life: 3.2 });
                    }
                }
                if (o.smoke) {
                    for (var c = 0; c < 8; c++) {
                        parts.push({ kind: 'smoke', x: o.smoke[0], y: o.smoke[1], ph: c / 8, life: 4.2, rise: 40, big: true });
                    }
                }
                if (o.tree === 'maple' || o.tree === 'ginkgo' || o.tree === 'peach') {
                    // Cây đào rụng nhiều cánh hơn (bốn hạt, ba sắc hồng).
                    var peach = o.tree === 'peach';
                    for (var j = 0; j < (peach ? 4 : 2); j++) {
                        parts.push({
                            kind: 'leaf', x: o.box[0] + 4 + r() * (o.box[2] - o.box[0] - 8), y: o.box[1] + 6 + r() * 8,
                            ph: r(), life: 5 + r() * 3,
                            col: rgbaOf(peach ? C.peach[3 + j % 3] : (o.tree === 'maple' ? C.maple[3 + j] : C.ginkgo[4 - j]), 1),
                            drop: (o.box[3] - o.box[1]) * 0.8 + 10
                        });
                    }
                }
            });
            if (st.night) {
                var G = scene.G.layer;
                for (var f = 0; f < 12; f++) {
                    var w = scene.water[Math.floor(r() * scene.water.length)] || 0;
                    parts.push({ kind: 'fly', x: G.x + (w % G.w) + (r() - 0.5) * 60, y: G.y + Math.floor(w / G.w) - 6 - r() * 30, ph: r() * 10 });
                }
            }
        }

        // ----- câu cá -----
        function waterAt(x, y) {
            var G = scene.G.layer;
            var lx = x - G.x, ly = y - G.y;
            return lx >= 0 && ly >= 0 && lx < G.w && ly < G.h && scene.G.types[ly * G.w + lx] === T_WATER;
        }

        // Câu cá giữ cơ chế cũ: người giữ quán dịch ngay tới chỗ câu (dừng đường đang đi), câu xong dịch về chỗ
        // đứng ngay trước khi câu (đang đi thì về đích của đường đó). Trước khi có đi lại, chỗ đó luôn là nhà.
        function fishStart(o) {
            o = o || {};
            var spot = o.deep ? FISH_SPOT.deep : FISH_SPOT.shore;
            var kp = actorById('keeper');
            if (kp && !fish) {
                var kw = walks.keeper;
                fishFrom = kw ? kw.plan.pts[kw.plan.pts.length - 1].slice() : kp.at.slice();
            }
            // App cho người giữ quán đi tới Hồ sen khi mở panel; bấm Thả câu lúc đang đi thì dừng bước đó trước.
            stopWalk('keeper');
            // Tư thế câu: vẽ nhìn phải (không lật), quay mặt ra; teleport ngay dưới đặt lại khung và thứ tự vẽ.
            if (kp) {
                kp.flip = false;
                kp.facing = 'front';
                kp.pose = 'fish';
            }
            keeperAt = spot.at.slice();
            teleport('keeper', keeperAt);
            var r = rng((Date.now() & 0xffff) + 7);
            var a = spot.area, start = null;
            for (var k = 0; k < 40 && !start; k++) {
                var wx = a[0] + r() * (a[2] - a[0]), wy = a[1] + r() * (a[3] - a[1]);
                var s = P(wx, wy, 8);
                if (waterAt(Math.round(s[0]), Math.round(s[1]))) start = s;
            }
            var hook = P(spot.hook[0], spot.hook[1], spot.hook[2]);
            start = start || [hook[0] + 30, hook[1] - 14];
            fish = {
                size: o.size || 1, id: o.id || 'diec', start: start, hook: hook,
                p: 0, pt: 0, pos: start.slice(), dir: hook[0] < start[0] ? -1 : 1,
                phase: 'swim', t: 0, tug: 0, rings: [], drops: [], alpha: 1
            };
            var pond = P(14, 10.2, 8);
            focusPoint(pond[0], pond[1], o.frac === undefined ? 0.3 : o.frac);
            labelsOn = false;
            lastOverlay = '';
            requestDraw();
        }

        function fishProgress(p) {
            if (fish) fish.pt = clamp(p, 0, 1);
        }

        function fishSplash() {
            if (!fish) return;
            var now = performance.now();
            fish.rings.push({ x: fish.pos[0], y: fish.pos[1], t: now });
            for (var k = 0; k < 6; k++) {
                fish.drops.push({ x: fish.pos[0], y: fish.pos[1], vx: (k - 2.5) * 6, vy: -18 - (k % 3) * 6, t: now });
            }
        }

        function fishTug() {
            if (fish) fish.tug = performance.now();
        }

        function fishLand() {
            if (!fish) return;
            fishSplash();
            fish.phase = 'land';
            fish.t = performance.now();
            // Cá bay về ngay trên bàn tay cầm cần (4 px).
            var k = actorById('keeper');
            var hand = k ? rodOf(k).hand : null;
            fish.to = hand ? [hand[0], hand[1] - 4] : fish.hook;
            fish.from = fish.pos.slice();
        }

        function fishEscape() {
            if (!fish) return;
            fish.phase = 'escape';
            fish.t = performance.now();
            fish.from = fish.pos.slice();
            fish.to = [fish.start[0] + (fish.start[0] - fish.hook[0]) * 0.6, fish.start[1] - 4];
            fish.rings.push({ x: fish.pos[0], y: fish.pos[1], t: fish.t });
        }

        function fishStop() {
            fish = null;
            keeperAt = (fishFrom || KEEPER_HOME).slice();
            fishFrom = null;
            labelsOn = true;
            // Bỏ tư thế câu; teleport đặt lại khung (về tập mặt trước) và xếp lại thứ tự vẽ.
            var kp = actorById('keeper');
            if (kp) kp.pose = null;
            teleport('keeper', keeperAt);
            if (fishTile) fishTile.style.transform = 'translate(-9999px,0)';
            lastOverlay = '';
            requestDraw();
        }

        // Thân cá: bóng sẫm dưới nước; khi bay lên thì là con cá có màu.
        var FISH_SHAPE = {
            1: ['.###.', '#####', '.###.'],
            2: ['..####..', '########', '.######.', '..####..'],
            3: ['...#####...', '.#########.', '###########', '.#########.', '...#####...']
        };

        function drawFishBody(x, y, size, dir, fill, clip) {
            var shape = FISH_SHAPE[size] || FISH_SHAPE[1];
            var w = shape[0].length, h = shape.length;
            var x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
            ctx.fillStyle = fill;
            for (var j = 0; j < h; j++) {
                for (var i = 0; i < w; i++) {
                    if (shape[j][i] !== '#') continue;
                    var px = x0 + (dir > 0 ? w - 1 - i : i), py = y0 + j;
                    if (clip && !clip(px, py)) continue;
                    ctx.fillRect(px, py, 1, 1);
                }
            }
            // Đuôi chẻ phía sau thân.
            var tx = dir > 0 ? x0 - 1 : x0 + w;
            var tail = [[0, -1], [0, 1], [dir > 0 ? -1 : 1, -2], [dir > 0 ? -1 : 1, 2]];
            if (size === 1) tail = [[0, -1], [0, 1]];
            tail.forEach(function (d) {
                var px = tx + d[0], py = Math.round(y) + d[1];
                if (!clip || clip(px, py)) ctx.fillRect(px, py, 1, 1);
            });
        }

        // Cần câu của người giữ quán, toạ độ thế giới. Đang dùng tập fish có tip: cần nằm trong hình (art), ngọn cần và
        // bàn tay lấy từ tip/hand của tập (rows[j][i] ở layer + (i + 1, j + 1)). Không thì cần vẽ bằng code từ chỗ cố
        // định bên phải chân như trước (ngọn ax + 12, ay − 24; tay ax + 2, ay − 12: cá bay về ay − 16 như cũ).
        function rodOf(k) {
            var S = k.set === 'fish' ? k.cur : null;
            function world(pt) {
                return [k.layer.x + pt[0] + 1, k.layer.y + pt[1] + 1];
            }
            return {
                art: !!(S && S.tip),
                tip: S && S.tip ? world(S.tip) : [k.ax + 12, k.ay - 24],
                hand: S && S.hand ? world(S.hand) : [k.ax + 2, k.ay - 12]
            };
        }

        function drawFishing(now, ox, oy) {
            if (!fish) return;
            var dt = 1 / 30;
            var night = st.night;
            if (fish.phase === 'swim') {
                fish.p += (fish.pt - fish.p) * 0.07;
                var tsec = now / 1000;
                var wig = Math.sin(tsec * 2.3) * (4 - fish.p * 3);
                var bx = fish.start[0] + (fish.hook[0] - fish.start[0]) * fish.p;
                var by = fish.start[1] + (fish.hook[1] - fish.start[1]) * fish.p;
                var shake = fish.tug && now - fish.tug < 450 ? Math.sin((now - fish.tug) / 30) * 3 : 0;
                var nx = bx + wig * 0.4 + shake, ny = by + Math.cos(tsec * 1.7) * 1.5;
                if (Math.abs(nx - fish.pos[0]) > 0.05) fish.dir = nx > fish.pos[0] ? 1 : -1;
                fish.pos = [nx, ny];
            } else {
                var k = clamp((now - fish.t) / (fish.phase === 'land' ? 750 : 650), 0, 1);
                var ex = fish.from[0] + (fish.to[0] - fish.from[0]) * k;
                var ey = fish.from[1] + (fish.to[1] - fish.from[1]) * k - (fish.phase === 'land' ? Math.sin(k * Math.PI) * 26 : 0);
                fish.pos = [ex, ey];
                fish.alpha = fish.phase === 'escape' ? 1 - k : (k >= 1 ? 0 : 1);
                if (fish.phase === 'land' && k > 0.02) fish.dir = fish.to[0] > fish.from[0] ? 1 : -1;
            }
            var fx = Math.round(fish.pos[0] + ox), fy = Math.round(fish.pos[1] + oy);
            var clip = function (px, py) { return waterAt(px - ox, py - oy); };
            // Dây câu: từ ngọn cần xuống con cá, võng nhẹ. Sprite chưa có tư thế câu thì vẽ cần bằng code (13 chấm).
            var keeper = actorById('keeper');
            if (keeper && fish.phase !== 'escape') {
                var rod = rodOf(keeper);
                var tipX = rod.tip[0] + ox, tipY = rod.tip[1] + oy;
                if (!rod.art) {
                    ctx.fillStyle = 'rgba(122,88,56,1)';
                    for (var q = 0; q <= 12; q++) {
                        ctx.fillRect(Math.round(keeper.ax + 3 + ox + (tipX - keeper.ax - 3 - ox) * q / 12), Math.round(keeper.ay - 9 + oy + (tipY - keeper.ay + 9 - oy) * q / 12), 1, 1);
                    }
                }
                if (fish.phase === 'swim') {
                    ctx.fillStyle = night ? 'rgba(200,210,240,0.7)' : 'rgba(250,248,235,0.85)';
                    var mx = (tipX + fx) / 2, my = Math.max(tipY, fy) + 6;
                    for (var s = 0; s <= 40; s++) {
                        var u = s / 40;
                        var lx = (1 - u) * (1 - u) * tipX + 2 * (1 - u) * u * mx + u * u * fx;
                        var ly = (1 - u) * (1 - u) * tipY + 2 * (1 - u) * u * my + u * u * (fy - 1);
                        ctx.fillRect(Math.round(lx), Math.round(ly), 1, 1);
                    }
                }
            }
            if (fish.alpha > 0) {
                if (fish.phase === 'swim' || fish.phase === 'escape') {
                    ctx.globalAlpha = fish.alpha;
                    drawFishBody(fx, fy, fish.size, fish.dir, night ? 'rgba(4,10,24,0.68)' : 'rgba(12,30,40,0.62)', clip);
                    ctx.globalAlpha = 1;
                } else {
                    var col = CATCH_COLOR[fish.id] || CATCH_COLOR.diec;
                    drawFishBody(fx, fy, fish.size, fish.dir, col[0]);
                    ctx.fillStyle = col[1];
                    ctx.fillRect(fx - 1, fy - 1, 2, 1);
                }
            }
            // Vòng sóng và giọt nước.
            fish.rings = fish.rings.filter(function (rg) {
                var k2 = (now - rg.t) / 900;
                if (k2 >= 1) return false;
                var rr = 2 + k2 * 10;
                ctx.fillStyle = (night ? 'rgba(200,215,255,' : 'rgba(235,250,248,') + (0.8 * (1 - k2)).toFixed(2) + ')';
                for (var a = 0; a < 28; a++) {
                    var ang = a / 28 * Math.PI * 2;
                    var px = Math.round(rg.x + ox + Math.cos(ang) * rr * 1.6), py = Math.round(rg.y + oy + Math.sin(ang) * rr * 0.8);
                    if (clip(px, py)) ctx.fillRect(px, py, 1, 1);
                }
                return true;
            });
            fish.drops = fish.drops.filter(function (d) {
                var tt = (now - d.t) / 1000;
                if (tt > 0.55) return false;
                ctx.fillStyle = night ? 'rgba(200,215,255,0.85)' : 'rgba(240,252,250,0.9)';
                ctx.fillRect(Math.round(d.x + ox + d.vx * tt), Math.round(d.y + oy + d.vy * tt + 60 * tt * tt), 1, 1);
                return true;
            });
            void dt;
        }

        // ----- vẽ -----
        var needDraw = true;
        function requestDraw() {
            needDraw = true;
        }

        function draw(now) {
            // Mốc của khung rAF đầu tiên có thể sớm hơn performance.now() lúc start(): t hơi âm thì phép chia lấy dư
            // chọn khung (cá chép, chuông gió) ra số âm và trỏ ra ngoài mảng.
            var t = Math.max(0, (now - t0) / 1000);
            // Đồng hồ của chuyển động trang trí (mây, biển mây, nước, khói, thác, đèn, nhịp đứng của nhân vật): đứng yên khi
            // bật giảm chuyển động. Bước đi của người đi lại vẫn theo t.
            var td = calm ? 0 : t;
            stepWalks(now);
            if (cam.tx !== null) {
                // Giảm chuyển động, hay hộp thoại phủ kín màn hình (không ai thấy camera lướt): tới thẳng chỗ mới.
                var jump = calm || covered === 'full';
                if (!jump) {
                    cam.x += (cam.tx - cam.x) * 0.16;
                    cam.y += (cam.ty - cam.y) * 0.16;
                }
                if (jump || (Math.abs(cam.tx - cam.x) < 0.5 && Math.abs(cam.ty - cam.y) < 0.5)) {
                    cam.x = cam.tx;
                    cam.y = cam.ty;
                    cam.tx = cam.ty = null;
                }
            }
            var ox = Math.round(vw / 2 - cam.x), oy = Math.round(vh / 2 - cam.y);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(bg.sky, 0, 0);
            // Núi xa trôi chậm theo camera (thị sai 0,3): chân núi ở 58 % chiều cao màn hình khi camera ở vị trí gốc.
            var mtnBase = Math.round(vh * 0.58 + (homeCam.y - cam.y) * 0.3);
            ctx.drawImage(bg.mtn, Math.round(-bg.mtnPad + (homeCam.x - cam.x) * 0.3), mtnBase - bg.mtn.height);
            // Mây rời phía sau đảo.
            bg.clouds.forEach(function (c) {
                if (c.mist) return;
                var x = ((c.x + td * c.v) % (vw + c.w + 40)) - c.w - 20;
                ctx.drawImage(c.c, Math.round(x + (ox - vw / 2) * 0.4), Math.round(c.y * vh + (oy - vh / 2) * 0.4));
            });
            // Biển mây neo theo đáy đảo: hàng sau trôi chậm hơn (thị sai 0,85).
            var groundBottom = scene.G.layer.y + scene.G.layer.h;
            drawSea(bg.seaBack, Math.round(vh / 2 + (groundBottom - 150 - cam.y) * 0.85), td * 2.2, 0.7, ox);
            ctx.drawImage(scene.ground, scene.G.layer.x + ox, scene.G.layer.y + oy);
            drawWater(td, ox, oy);
            order.forEach(function (d) {
                if (d.actor) {
                    // Tập khung đang dùng (placeActor chọn). Đang đi: luân phiên khung bước mỗi 0,25 s, không chớp mắt.
                    // Đứng: khung idle theo nhịp riêng. Tập fish không lật.
                    var S = d.cur, fr;
                    if (walks[d.id]) {
                        fr = S.frames[S.walk[Math.floor(t / 0.25 + d.seed) % S.walk.length]] || S.frames[0];
                    } else {
                        fr = S.frames[S.idle[Math.floor(td / d.rate + d.seed) % S.idle.length]] || S.frames[0];
                        if (S.blink && !calm && ((t + d.seed * 0.37) % 4.2) < 0.14) fr = S.blink;
                    }
                    ctx.drawImage(d.flip && !S.fixed ? flipOf(fr).canvas : fr.canvas, d.layer.x + ox, d.layer.y + oy);
                } else {
                    var A = d.anim;
                    if (A && A.canvases) {
                        var fi = Math.floor(td / A.dt) % A.canvases.length;
                        ctx.drawImage(A.canvases[fi], A.layers[fi].x + ox, A.layers[fi].y + oy);
                    } else {
                        ctx.drawImage(d.canvas, d.layer.x + ox, d.layer.y + oy);
                    }
                    if (d.fall) drawFall(d.fall, td, ox, oy);
                }
            });
            drawFishing(now, ox, oy);
            drawParticles(td, ox, oy);
            drawSea(bg.seaFront, Math.round(groundBottom - 92 + oy), td * 3.4, 1, ox);
            // Một dải sương mỏng trôi ngang qua đảo (归云: mây về núi).
            bg.clouds.forEach(function (c) {
                if (!c.mist) return;
                var x = ((td * 6 + c.x) % (vw + c.w * 3)) - c.w * 1.5;
                ctx.globalAlpha = 0.42;
                ctx.drawImage(c.c, Math.round(x), Math.round(vh * 0.46 + (oy - vh / 2) * 0.9));
                ctx.globalAlpha = 1;
            });
            if (st.night) drawGlows(td, ox, oy);
            placeOverlay(ox, oy);
        }

        function drawSea(img, y, drift, par, ox) {
            var w = img.width;
            var x = -(((drift + (vw / 2 - ox) * (1 - par)) % w) + w) % w;
            for (var k = -1; k < Math.ceil(vw / w) + 1; k++) {
                ctx.drawImage(img, Math.round(x + k * w), y);
            }
            var bottom = y + img.height;
            if (bottom < vh) {
                ctx.fillStyle = bg.seaColor;
                ctx.fillRect(0, bottom, vw, vh - bottom);
            }
        }

        // Thác: vệt nước sáng chạy xuống theo từng cột, bọt nảy lên ở chân thác.
        function drawFall(f, t, ox, oy) {
            var cols = Math.max(2, Math.floor(f.U[0]) - 2);
            ctx.fillStyle = st.night ? 'rgba(185,205,240,0.6)' : 'rgba(255,255,255,0.78)';
            for (var k = 0; k < cols; k++) {
                var u = (k + 1.5) / (cols + 2);
                var speed = 34 + hash2(k, 5, 9) * 22;
                var len = 3 + Math.floor(hash2(k, 6, 2) * 4);
                var v = ((t * speed + hash2(k, 8, 4) * f.h) % (f.h + len)) - len;
                var x = f.O[0] + f.U[0] * u, y = f.O[1] + f.U[1] * u;
                var a = Math.max(0, v), b = Math.min(f.h - 1, v + len);
                if (b > a) ctx.fillRect(Math.round(x + ox), Math.round(y + a + oy), 1, Math.round(b - a));
            }
            for (var j = 0; j < 7; j++) {
                var q = (t * 1.6 + j * 0.37) % 1;
                var fx = f.foot[0] + Math.sin(j * 2.1 + Math.floor(t * 1.6 + j * 0.37) * 1.3) * (3 + j * 1.2);
                var fy = f.foot[1] - 1 - q * 6;
                ctx.fillStyle = st.night ? 'rgba(200,215,245,' + (0.7 * (1 - q)).toFixed(2) + ')' : 'rgba(255,255,255,' + (0.9 * (1 - q)).toFixed(2) + ')';
                ctx.fillRect(Math.round(fx + ox), Math.round(fy + oy), 1, 1);
            }
        }

        // Mặt hồ lấp lánh: vệt sáng ngắn bật tắt; khi không câu thì có bóng cá lượn chậm.
        function drawWater(t, ox, oy) {
            var W = scene.water, G = scene.G.layer;
            if (!W.length) return;
            var n = Math.min(40, Math.floor(W.length / 45));
            var col = st.night ? 'rgba(200,220,255,' : 'rgba(225,250,245,';
            for (var k = 0; k < n; k++) {
                var cyc = t * 0.55 + k * 0.618;
                var idx = W[Math.floor(hash2(k, Math.floor(cyc), 3) * W.length)];
                var a = Math.sin((cyc % 1) * Math.PI);
                var x = G.x + (idx % G.w), y = G.y + Math.floor(idx / G.w);
                ctx.fillStyle = col + (0.75 * a).toFixed(2) + ')';
                ctx.fillRect(x + ox, y + oy, a > 0.6 ? 3 : 2, 1);
            }
            decorDrawn.koi = 0;
            decorDrawn.lanterns = 0;
            if (!fish) {
                ctx.fillStyle = st.night ? 'rgba(10,20,40,0.35)' : 'rgba(20,50,60,0.32)';
                for (var f = 0; f < 2; f++) {
                    var base = W[Math.floor(W.length * (0.35 + f * 0.3))];
                    var cx = G.x + (base % G.w), cy = G.y + Math.floor(base / G.w);
                    var fx = Math.round(cx + Math.sin(t * 0.4 + f * 2) * 14), fy = Math.round(cy + Math.cos(t * 0.33 + f) * 5);
                    if (!waterAt(fx, fy)) continue;
                    ctx.fillRect(fx - 2 + ox, fy + oy, 5, 1);
                    ctx.fillRect(fx - 1 + ox, fy - 1 + oy, 3, 1);
                    ctx.fillRect(fx + (Math.cos(t * 0.4 + f * 2) > 0 ? -4 : 3) + ox, fy + oy, 2, 1);
                }
            }
            // Món tô điểm trên mặt hồ (đợt D), vẽ trước mọi vật nên cầu, tán cây phía trước che đúng: cá chép đỏ lặn khi
            // đang câu (như bóng cá), đèn hoa đăng chỉ có ban đêm và vẫn trôi khi câu.
            var dec = st.decor || {};
            if (!dec.cachep && !(dec.hoadang && st.night)) return;
            var art = decorArt();
            if (dec.cachep && !fish) {
                pondKoi(t).forEach(function (k) {
                    var s = P(k.at[0], k.at[1], k.at[2]), sx = Math.round(s[0]), sy = Math.round(s[1]);
                    if (!waterAt(sx, sy)) return;
                    var c = art.koi[k.dir > 0 ? 1 : 0][k.flap];
                    ctx.drawImage(c.canvas, sx - c.ax + ox, sy - c.ay + oy);
                    decorDrawn.koi++;
                });
            }
            if (dec.hoadang && st.night) {
                pondLanterns(t).forEach(function (q) {
                    var s = P(q[0], q[1], q[2]), sx = Math.round(s[0]), sy = Math.round(s[1]);
                    if (!waterAt(sx, sy)) return;
                    ctx.drawImage(art.lantern.canvas, sx - art.lantern.ax + ox, sy - art.lantern.ay + oy);
                    decorDrawn.lanterns++;
                });
            }
        }

        // Canvas của cá chép (hai hướng × hai khung đuôi) và đèn hoa đăng, dựng lần đầu cần tới, theo ngày/đêm. ax, ay:
        // điểm neo (điểm thế giới trên mặt nước) tính từ góc trên trái canvas.
        var decorArtCache = {};
        var decorDrawn = { koi: 0, lanterns: 0 };
        function decorArt() {
            var key = st.night ? 'n' : 'd';
            if (decorArtCache[key]) return decorArtCache[key];
            function wrap(L) {
                return { canvas: layerCanvas(L), ax: -L.x, ay: -L.y };
            }
            var koi = [[], []];
            [0, 1].forEach(function (flap) {
                koi[0].push(wrap(koiLayer(-1, flap, st.night)));
                koi[1].push(wrap(koiLayer(1, flap, st.night)));
            });
            decorArtCache[key] = { koi: koi, lantern: wrap(lanternLayer()) };
            return decorArtCache[key];
        }

        function drawParticles(t, ox, oy) {
            parts.forEach(function (p) {
                if (p.kind === 'smoke') {
                    var k = ((t / p.life) + p.ph) % 1;
                    var x = p.x + Math.sin(t * 1.3 + p.ph * 9) * (2 + k * 5) + k * 6;
                    var y = p.y - k * (p.rise || 30);
                    ctx.fillStyle = st.night ? 'rgba(170,180,210,' + (0.5 * (1 - k)).toFixed(2) + ')' : 'rgba(235,235,240,' + (0.7 * (1 - k)).toFixed(2) + ')';
                    var sz = p.big ? (k > 0.5 ? 3 : 2) : (k > 0.4 ? 2 : 1);
                    ctx.fillRect(Math.round(x + ox), Math.round(y + oy), sz, p.big && k > 0.3 ? 2 : 1);
                } else if (p.kind === 'leaf') {
                    var q = ((t / p.life) + p.ph) % 1;
                    var lx = p.x + Math.sin(t * 2 + p.ph * 7) * 4 - q * 10;
                    var ly = p.y + q * p.drop;
                    ctx.globalAlpha = q > 0.85 ? (1 - q) / 0.15 : 1;
                    ctx.fillStyle = p.col;
                    ctx.fillRect(Math.round(lx + ox), Math.round(ly + oy), Math.sin(t * 5 + p.ph * 3) > 0 ? 2 : 1, 1);
                    ctx.globalAlpha = 1;
                } else if (p.kind === 'fly') {
                    var b = Math.sin(t * 2.2 + p.ph * 3);
                    if (b < 0) return;
                    var fx = p.x + Math.sin(t * 0.5 + p.ph) * 12, fy = p.y + Math.cos(t * 0.37 + p.ph * 2) * 6;
                    ctx.fillStyle = 'rgba(230,255,140,' + (0.9 * b).toFixed(2) + ')';
                    ctx.fillRect(Math.round(fx + ox), Math.round(fy + oy), 1, 1);
                    if (b > 0.7) {
                        ctx.fillStyle = 'rgba(200,255,120,0.25)';
                        ctx.fillRect(Math.round(fx + ox) - 1, Math.round(fy + oy), 3, 1);
                        ctx.fillRect(Math.round(fx + ox), Math.round(fy + oy) - 1, 1, 3);
                    }
                }
            });
        }

        function drawGlows(t, ox, oy) {
            ctx.globalCompositeOperation = 'lighter';
            scene.lights.forEach(function (l, i) {
                var gk = l.r + (l.tint || '');
                var g = glows[gk] || (glows[gk] = glowSprite(l.r, l.tint));
                ctx.globalAlpha = l.k * (0.86 + 0.14 * Math.sin(t * 7 + i * 1.7) * Math.sin(t * 3.1 + i));
                ctx.drawImage(g, Math.round(l.x + ox - g.width / 2), Math.round(l.y + oy - g.height / 2));
            });
            // Quầng đèn của khách đêm (glow trong định nghĩa, hoặc walk có opts.glow): ở chân actor, đi theo actor.
            actors.forEach(function (a, i) {
                if (hidden[a.id] || !(a.glow || (walks[a.id] && walks[a.id].glow))) return;
                var g = glows[ACTOR_GLOW_R] || (glows[ACTOR_GLOW_R] = glowSprite(ACTOR_GLOW_R));
                ctx.globalAlpha = 0.85 * (0.86 + 0.14 * Math.sin(t * 6.3 + i * 2.1) * Math.sin(t * 2.7 + i));
                ctx.drawImage(g, Math.round(a.ax + ox - g.width / 2), Math.round(a.ay + oy - g.height / 2));
            });
            // Đèn hoa đăng: quầng nhỏ trên từng ngọn đèn, trôi theo đèn, chập chờn như ngọn nến.
            if ((st.decor || {}).hoadang) {
                var lg = glows[LANTERN_GLOW_R] || (glows[LANTERN_GLOW_R] = glowSprite(LANTERN_GLOW_R));
                pondLanterns(t).forEach(function (q, i) {
                    var s = P(q[0], q[1], q[2]);
                    ctx.globalAlpha = 0.6 * (0.8 + 0.2 * Math.sin(t * 5.3 + i * 2.3) * Math.sin(t * 1.9 + i));
                    ctx.drawImage(lg, Math.round(s[0] + ox - lg.width / 2), Math.round(s[1] - 2 + oy - lg.height / 2));
                });
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        // Nhãn, dấu "!" trên khách, chữ trên biển và thẻ chữ trên con cá theo phép chiếu.
        var lastOverlay = '';
        function placeOverlay(ox, oy) {
            var k = scale / dpr;
            if (fishTile && fish) {
                fishTile.style.transform = 'translate(' + Math.round((fish.pos[0] + ox) * k) + 'px,' + Math.round((fish.pos[1] - 7 + oy) * k) + 'px) translate(-50%,-100%)';
            }
            var sig = ox + ',' + oy + ',' + k + ',' + labelsOn;
            if (sig === lastOverlay) return;
            lastOverlay = sig;
            PLACES.forEach(function (p) {
                var s = P(p.at[0], p.at[1], p.at[2]);
                var el = labels[p.id].el;
                el.hidden = !labelsOn;
                el.style.transform = 'translate(' + Math.round((s[0] + ox) * k) + 'px,' + Math.round((s[1] + oy) * k) + 'px) translate(-50%,-100%)';
            });
            Object.keys(marks).forEach(function (id) {
                var a = shownActor(id);
                if (!a) return;
                marks[id].hidden = !labelsOn;
                marks[id].style.transform = 'translate(' + Math.round((a.ax + ox) * k) + 'px,' + Math.round((a.layer.y - 2 + oy) * k) + 'px) translate(-50%,-100%)';
            });
            plaques.forEach(function (p) {
                var s = P(p.def.at[0], p.def.at[1], p.def.at[2]);
                var skew = p.def.face === 'y' ? 'skewY(26.565deg)' : (p.def.face === 'x' ? 'skewY(-26.565deg)' : '');
                p.el.style.fontSize = (p.def.size * k) + 'px';
                p.el.style.transform = 'translate(' + ((s[0] + ox) * k).toFixed(1) + 'px,' + ((s[1] + oy) * k).toFixed(1) + 'px) translate(-50%,-50%) ' + skew;
            });
        }

        // Có gì đang chuyển động mà một khung tĩnh không thay được: người đi, camera đang lướt, cá đang bơi, cá bay lên hay
        // sẩy (750 ms), vòng sóng và giọt nước chưa tan. Cá đã lên và tan sóng thì khung đứng yên dù lượt câu chưa đóng.
        function isMoving() {
            if (cam.tx !== null) return true;
            if (fish && (fish.phase === 'swim' || performance.now() - fish.t < 1000 || fish.rings.length || fish.drops.length)) return true;
            for (var id in walks) if (walks.hasOwnProperty(id)) return true;
            return false;
        }

        // Khoảng cách tối thiểu giữa hai khung (ms); Infinity: chỉ vẽ khi có requestDraw().
        function frameGap() {
            var moving = isMoving();
            if (!moving && (calm || covered === 'full')) return Infinity;
            if (covered) return moving ? 80 : 250;
            return 32;
        }

        function loop(now) {
            raf = 0;
            if (!running) return;
            if (needDraw || now - lastFrame >= frameGap()) {
                lastFrame = now;
                needDraw = false;
                if (scene) {
                    draw(now);
                    frames++;
                }
            }
            raf = window.requestAnimationFrame(loop);
        }

        function start() {
            if (running) return;
            running = true;
            if (!t0) t0 = performance.now();
            raf = window.requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
            if (raf) window.cancelAnimationFrame(raf);
            raf = 0;
        }

        // ----- chạm, kéo, phóng to -----
        var pointers = {}, drag = null, pinch = null;
        function worldAt(clientX, clientY) {
            var rect = canvas.getBoundingClientRect();
            var vx = (clientX - rect.left) * dpr / scale, vy = (clientY - rect.top) * dpr / scale;
            return [Math.floor(vx - Math.round(vw / 2 - cam.x)), Math.floor(vy - Math.round(vh / 2 - cam.y))];
        }

        // Vật trên cùng tại điểm chạm (nhân vật hoặc công trình; chỉ tính pixel đặc). Nhân vật đứng trước thắng.
        // Hai đèn đá hai bên Sơn môn (khi đã thắp, st.repairs.den) là vùng chạm 'lantern': thắng công trình kề
        // bên (cột cổng che một phần đèn). Mặt nước trống là Hồ sen.
        function hitTest(wx, wy) {
            var front = null;
            for (var i = order.length - 1; i >= 0 && !front; i--) {
                var d = order[i];
                if (!d.place && !d.actor) continue;
                var L = d.layer;
                if (wx < L.x || wy < L.y || wx >= L.x + L.w || wy >= L.y + L.h) continue;
                if (L.px[(wy - L.y) * L.w + (wx - L.x)]) front = d;
            }
            if (front && front.actor) return front;
            if (st.repairs.den && lanternHit(wx, wy)) return { place: 'lantern' };
            if (front) return front;
            return waterAt(wx, wy) ? { place: 'pond' } : null;
        }

        canvas.addEventListener('pointerdown', function (ev) {
            pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
            var ids = Object.keys(pointers);
            if (ids.length === 1) {
                drag = { x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y, moved: false };
            } else if (ids.length === 2) {
                var a = pointers[ids[0]], b = pointers[ids[1]];
                pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale };
                drag = null;
            }
            try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* trình duyệt cũ */ }
        });
        canvas.addEventListener('pointermove', function (ev) {
            if (!pointers[ev.pointerId]) return;
            pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
            var ids = Object.keys(pointers);
            if (pinch && ids.length === 2) {
                var a = pointers[ids[0]], b = pointers[ids[1]];
                var ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d;
                var next = clamp(Math.round(pinch.s * ratio), 2, 8);
                if (next !== scale) setZoom(next);
                return;
            }
            if (!drag) return;
            var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
            if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
            if (drag.moved) {
                cam.tx = cam.ty = null;
                cam.x = drag.cx - dx * dpr / scale;
                cam.y = drag.cy - dy * dpr / scale;
                clampCam();
                requestDraw();
            }
        });
        // Toạ độ chạm lấy từ lần pointerdown/move cuối: pointerup của cảm ứng có thể mang toạ độ rỗng.
        function up(ev) {
            var last = pointers[ev.pointerId];
            if (!last) return;
            delete pointers[ev.pointerId];
            if (pinch) {
                if (!Object.keys(pointers).length) pinch = null;
                drag = null;
                return;
            }
            // Chạm (không kéo): chờ sự kiện click ngay sau đó mới mở panel. Mở ngay ở pointerup thì click
            // của lần chạm rơi xuống lớp nền vừa hiện và đóng panel lại (iOS, Chrome cảm ứng).
            tapAt = drag && !drag.moved && scene ? { x: last.x, y: last.y, t: performance.now() } : null;
            drag = null;
        }
        var tapAt = null;
        canvas.addEventListener('click', function () {
            var tp = tapAt;
            tapAt = null;
            if (!tp || performance.now() - tp.t > 800) return;
            var w = worldAt(tp.x, tp.y);
            var hit = hitTest(w[0], w[1]);
            if (hit && hit.actor) onActor(hit.id);
            else if (hit) onPlace(hit.place);
        });
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        canvas.addEventListener('wheel', function (ev) {
            ev.preventDefault();
            if (ev.ctrlKey) {
                setZoom(clamp(scale + (ev.deltaY < 0 ? 1 : -1), 2, 8));
            } else {
                cam.tx = cam.ty = null;
                cam.x += ev.deltaX * dpr / scale;
                cam.y += ev.deltaY * dpr / scale;
                clampCam();
                requestDraw();
            }
        }, { passive: false });

        function setZoom(s) {
            userScale = s;
            resize();
        }

        function setBadge(id, text) {
            var l = labels[id];
            if (!l) return;
            l.badge.hidden = !text;
            l.badge.textContent = text || '';
        }

        window.addEventListener('resize', resize);
        resize();
        setState(opts.state || {});
        start();
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stop();
            else start();
        });
        if (calmMq) {
            var onCalm = function () {
                calm = calmMq.matches;
                requestDraw();
            };
            if (calmMq.addEventListener) calmMq.addEventListener('change', onCalm);
            else if (calmMq.addListener) calmMq.addListener(onCalm);
        }

        return {
            setState: setState,
            // on: false, 'part' (hay true, như trước) hoặc 'full'.
            setCovered: function (on) {
                var level = on === 'full' ? 'full' : (on ? 'part' : '');
                if (level === covered) return;
                covered = level;
                requestDraw();
            },
            focus: focus,
            focusPoint: focusPoint,
            home: function () { home(); requestDraw(); },
            zoom: function (d) { setZoom(clamp(scale + d, 2, 8)); },
            setBadge: setBadge,
            resize: resize,
            start: start,
            stop: stop,
            fish: {
                start: fishStart, progress: fishProgress, splash: fishSplash, tug: fishTug,
                land: fishLand, escape: fishEscape, stop: fishStop,
                active: function () { return !!fish; }
            },
            walk: walk,
            walking: function (id) { return !!walks[id]; },
            stopWalk: stopWalk,
            teleport: teleport,
            hide: hide,
            show: show,
            pick: function (cx, cy) {
                var w = worldAt(cx, cy);
                var h = hitTest(w[0], w[1]);
                return { world: w, hit: h ? (h.actor ? 'actor:' + h.id : h.place) : null };
            },
            // facing/pose/frame theo id actor (frame: hộp Layer khung 0 của tập đang dùng, toạ độ thế giới); fish thêm
            // cần câu (art: cần trong hình, tip/hand toạ độ thế giới) và đích cá bay về (to) để đo bằng số qua CDP.
            debug: function () {
                var kp = actorById('keeper'), rod = fish && kp ? rodOf(kp) : null;
                return {
                    scale: scale, vw: vw, vh: vh, dpr: dpr, cam: [Math.round(cam.x), Math.round(cam.y)], key: sceneKey,
                    objects: scene ? scene.objects.length : 0, actors: actors.map(function (a) { return a.id; }),
                    order: order.map(function (d) { return d.id; }),
                    lights: scene ? scene.lights.length : 0,
                    // Món tô điểm đang có và số cá chép, đèn hoa đăng đã vẽ ở khung gần nhất (CDP đếm bằng số).
                    decor: { ids: Object.keys(st.decor || {}), koi: decorDrawn.koi, lanterns: decorDrawn.lanterns },
                    // Đêm rằm: trăng tròn trên nền (bg.key có 'f') và số đèn đố chữ dưới hiên Chính điện.
                    ram: { moon: /f$/.test(bg.key), lamps: st.night ? (st.ramLamps || 0) : 0 },
                    fish: fish ? {
                        phase: fish.phase, p: +fish.p.toFixed(2), size: fish.size,
                        art: rod ? rod.art : false, tip: rod ? rod.tip : null, hand: rod ? rod.hand : null,
                        to: fish.to ? [Math.round(fish.to[0]), Math.round(fish.to[1])] : null
                    } : null,
                    marks: Object.keys(marks), ptrs: Object.keys(pointers), drag: drag ? { moved: drag.moved } : null, pinch: !!pinch,
                    walkScale: walkScale,
                    covered: !!covered,
                    cover: covered,
                    moving: isMoving(),
                    gap: frameGap(),
                    frames: frames,
                    calm: calm,
                    walks: Object.keys(walks).map(function (id) {
                        var w = walks[id];
                        return { id: id, to: w.to, p: +(w.done / w.total).toFixed(2) };
                    }),
                    visitors: actors.filter(function (a) { return a.visitor; }).map(function (a) { return a.id; }),
                    hidden: Object.keys(hidden),
                    flipped: actors.filter(function (a) { return a.flip; }).map(function (a) { return a.id; }),
                    at: actors.reduce(function (m, a) {
                        m[a.id] = [+a.at[0].toFixed(2), +a.at[1].toFixed(2), +a.at[2].toFixed(1)];
                        return m;
                    }, {}),
                    facing: actors.reduce(function (m, a) {
                        m[a.id] = a.facing;
                        return m;
                    }, {}),
                    pose: actors.reduce(function (m, a) {
                        m[a.id] = a.pose;
                        return m;
                    }, {}),
                    frame: actors.reduce(function (m, a) {
                        m[a.id] = { x: a.layer.x, y: a.layer.y, w: a.layer.w, h: a.layer.h, set: a.set };
                        return m;
                    }, {})
                };
            }
        };
    }

    return {
        PAL: PAL,
        C: C,
        Layer: Layer,
        P: P,
        hash2: hash2,
        rng: rng,
        buildTerrain: buildTerrain,
        renderGround: renderGround,
        decorGround: decorGround,
        groundDecor: groundDecor,
        worldObjects: worldObjects,
        worldActors: worldActors,
        renderObject: renderObject,
        actorLayer: actorLayer,
        spriteLayer: spriteLayer,
        spriteSets: spriteSets,
        mirrorDiff: mirrorDiff,
        portraitLayer: portraitLayer,
        fishLayer: fishLayer,
        PORTRAITS: PORTRAITS,
        PIXEL_PORTRAITS: PIXEL_PORTRAITS,
        pixelPortrait: pixelPortrait,
        FISH_ART: FISH_ART,
        sortDrawables: sortDrawables,
        renderSky: renderSky,
        renderMountains: renderMountains,
        renderCloud: renderCloud,
        renderCloudSea: renderCloudSea,
        renderCloudSeaRows: renderCloudSeaRows,
        renderScene: renderScene,
        gradeNight: gradeNight,
        create: create,
        PLACES: PLACES,
        PLAQUES: PLAQUES,
        SPRITES: SPRITES,
        CATCH_COLOR: CATCH_COLOR,
        WAYPOINTS: WAYPOINTS,
        VISIT_AT: VISIT_AT,
        REVEAL_ZONES: REVEAL_ZONES,
        OBJECT_ART: { shrine: drawShrine, talisman: drawTalisman, peony: drawPeony, camellia: drawCamellia, couplet: drawCouplet,
            moonPaper: drawMoonPaper, herbs: drawHerbs, paperLamp: drawPaperLamp, chime: drawChime, peach: drawPeach },
        decorOf: decorOf,
        pondLanterns: pondLanterns,
        pondKoi: pondKoi,
        NIGHT_ART: NIGHT_ART,
        GATE_LANTERNS: GATE_LANTERNS,
        lanternHit: lanternHit,
        findPath: findPath,
        nearestWaypoint: nearestWaypoint,
        planRoute: planRoute,
        hopClear: hopClear,
        walkPlan: walkPlan,
        walkStep: walkStep,
        sortDrawables: sortDrawables,
        flipLayer: flipLayer
    };
}));
