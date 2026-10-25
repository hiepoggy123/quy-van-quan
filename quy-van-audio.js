// Quy Vân Quán — âm thanh tổng hợp bằng Web Audio, không tải file nào.
// - Âm hiệu: gõ phím (gảy dây nhẹ), đúng (hai nốt chuông), đúng dấu (ba nốt), sai (mõ gỗ trầm),
//   kéo cần (tách), cá quẫy (nước), câu được (chuỗi ngũ cung), chuông chùa (học xong cuộn, sửa quán),
//   lật giấy (mở cuộn).
// - Nền: tiếng nước/gió rất nhỏ và thỉnh thoảng một nốt đàn ngũ cung.
// UMD: Node require được để test; không có AudioContext thì mọi hàm không làm gì.
(function (root, factory) {
    var api = factory(root);
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.QuyVanAudio = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    var Ctx = root && (root.AudioContext || root.webkitAudioContext);
    var ctx = null;
    var master = null;
    var sfxBus = null;
    var ambBus = null;
    var noiseBuf = null;
    var enabled = { sfx: true, music: true };
    var ambient = { on: false, timer: 0, source: null };
    // Chuông gió (tô điểm 'chuong' của đạo quán): bật thì nhạc nền thỉnh thoảng có một chuỗi chuông.
    var windChime = false;
    // Ngũ cung (Cung Thương Giốc Chủy Vũ) trên nốt D: D E F# A B.
    var PENTA = [293.66, 329.63, 369.99, 440, 493.88];

    function ensure() {
        if (ctx || !Ctx) return ctx;
        try {
            ctx = new Ctx();
        } catch (e) {
            ctx = null;
            return null;
        }
        master = ctx.createGain();
        master.gain.value = 0.8;
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        master.connect(comp);
        comp.connect(ctx.destination);
        sfxBus = ctx.createGain();
        sfxBus.gain.value = 0.9;
        sfxBus.connect(master);
        ambBus = ctx.createGain();
        ambBus.gain.value = 0.35;
        ambBus.connect(master);
        var len = ctx.sampleRate * 2;
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = noiseBuf.getChannelData(0);
        var last = 0;
        for (var i = 0; i < len; i++) {
            // Nhiễu hồng thô: lọc một cực cho tiếng mềm hơn nhiễu trắng.
            last = 0.97 * last + 0.03 * (Math.random() * 2 - 1);
            data[i] = last * 6;
        }
        return ctx;
    }

    // Gọi trong một cử chỉ của người dùng (iOS chỉ cho phát tiếng sau cử chỉ).
    function unlock() {
        if (!ensure()) return;
        if (ctx.state !== 'running') {
            ctx.resume();
            // iOS: phát một mẫu im lặng ngay trong cử chỉ thì ngữ cảnh mới thật sự mở.
            try {
                var b = ctx.createBuffer(1, 1, 22050);
                var s = ctx.createBufferSource();
                s.buffer = b;
                s.connect(ctx.destination);
                s.start(0);
            } catch (e) { /* trình duyệt cũ */ }
        }
        if (enabled.music && !ambient.on) startAmbient();
    }

    function ready() {
        return !!ctx && ctx.state === 'running';
    }

    function tone(freq, t0, dur, gain, type, bus) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(bus || sfxBus);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
    }

    function chime(freq, t0, gain, bus) {
        tone(freq, t0, 1.1, gain, 'sine', bus);
        tone(freq * 2.01, t0, 0.5, gain * 0.25, 'sine', bus);
        tone(freq * 3.02, t0, 0.25, gain * 0.1, 'sine', bus);
    }

    function noise(t0, dur, gain, filterType, f0, f1, bus) {
        var src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        var f = ctx.createBiquadFilter();
        f.type = filterType;
        f.frequency.setValueAtTime(f0, t0);
        if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(f);
        f.connect(g);
        g.connect(bus || sfxBus);
        src.start(t0, Math.random() * 1.5);
        src.stop(t0 + dur + 0.05);
    }

    function pluck(freq, t0, gain, bus) {
        tone(freq, t0, 0.9, gain, 'triangle', bus);
        tone(freq * 2, t0, 0.35, gain * 0.3, 'sine', bus);
    }

    var SFX = {
        tap: function (t) { pluck(PENTA[Math.floor(Math.random() * 5)] * 2, t, 0.05); },
        ok: function (t) { chime(659.25, t, 0.16); chime(880, t + 0.11, 0.14); },
        perfect: function (t) { chime(659.25, t, 0.15); chime(880, t + 0.1, 0.14); chime(987.77, t + 0.2, 0.13); },
        bad: function (t) {
            var o = ctx.createOscillator();
            var g = ctx.createGain();
            o.frequency.setValueAtTime(190, t);
            o.frequency.exponentialRampToValueAtTime(95, t + 0.14);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.32, t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
            o.connect(g);
            g.connect(sfxBus);
            o.start(t);
            o.stop(t + 0.25);
            noise(t, 0.05, 0.08, 'bandpass', 1200);
        },
        reel: function (t) { noise(t, 0.04, 0.12, 'highpass', 3000); noise(t + 0.07, 0.04, 0.1, 'highpass', 3400); },
        splash: function (t) { noise(t, 0.55, 0.3, 'lowpass', 2400, 300); noise(t + 0.08, 0.3, 0.12, 'bandpass', 900, 400); },
        catch: function (t) {
            var notes = [PENTA[0], PENTA[2], PENTA[3], PENTA[4], PENTA[0] * 2];
            for (var i = 0; i < notes.length; i++) chime(notes[i] * 2, t + i * 0.09, 0.12);
            noise(t, 0.6, 0.2, 'lowpass', 1800, 300);
        },
        bell: function (t) {
            var f = 196;
            var parts = [[1, 0.22, 3.2], [2.76, 0.09, 2.2], [5.4, 0.05, 1.2], [8.93, 0.025, 0.7]];
            for (var i = 0; i < parts.length; i++) tone(f * parts[i][0], t, parts[i][2], parts[i][1], 'sine');
        },
        page: function (t) { noise(t, 0.22, 0.09, 'bandpass', 2600, 1400); }
    };

    function play(name) {
        if (!enabled.sfx || !SFX[name] || !ensure() || ctx.state !== 'running') return;
        try {
            SFX[name](ctx.currentTime + 0.01);
        } catch (e) { /* bỏ qua: âm thanh không được làm hỏng trò chơi */ }
    }

    function scheduleAmbientNote() {
        if (!ambient.on) return;
        if (ctx && ctx.state === 'running' && enabled.music) {
            var f = PENTA[Math.floor(Math.random() * 5)] * (Math.random() < 0.3 ? 0.5 : 1);
            pluck(f, ctx.currentTime + 0.02, 0.05, ambBus);
            if (windChime && Math.random() < 0.2) ringWindChime(ctx.currentTime + 0.9);
        }
        ambient.timer = setTimeout(scheduleAmbientNote, 2600 + Math.random() * 4200);
    }

    // Ba đến bốn tiếng chuông cao, cách nhau không đều, như gió lay chuông dưới mái.
    function ringWindChime(t0) {
        var n = 3 + Math.floor(Math.random() * 2);
        var t = t0;
        for (var i = 0; i < n; i++) {
            chime(PENTA[Math.floor(Math.random() * 5)] * 4, t, 0.018, ambBus);
            t += 0.09 + Math.random() * 0.16;
        }
    }

    function setChime(on) {
        windChime = !!on;
    }

    function startAmbient() {
        if (!ensure() || ambient.on) return;
        ambient.on = true;
        var src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        var f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 520;
        var g = ctx.createGain();
        g.gain.value = 0.05;
        // Tiếng nước dâng hạ chậm.
        var lfo = ctx.createOscillator();
        var lfoGain = ctx.createGain();
        lfo.frequency.value = 0.07;
        lfoGain.gain.value = 0.025;
        lfo.connect(lfoGain);
        lfoGain.connect(g.gain);
        src.connect(f);
        f.connect(g);
        g.connect(ambBus);
        src.start();
        lfo.start();
        ambient.source = { src: src, lfo: lfo };
        scheduleAmbientNote();
    }

    function stopAmbient() {
        ambient.on = false;
        clearTimeout(ambient.timer);
        if (ambient.source) {
            try { ambient.source.src.stop(); ambient.source.lfo.stop(); } catch (e) { /* đã dừng */ }
            ambient.source = null;
        }
    }

    function setEnabled(opts) {
        if (opts.sfx !== undefined) enabled.sfx = !!opts.sfx;
        if (opts.music !== undefined) {
            enabled.music = !!opts.music;
            if (!enabled.music) stopAmbient();
            else if (ctx && ctx.state === 'running') startAmbient();
        }
    }

    function suspend() {
        if (ctx && ctx.state === 'running') ctx.suspend();
    }

    function resume() {
        if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    return {
        unlock: unlock,
        ready: ready,
        play: play,
        setEnabled: setEnabled,
        setChime: setChime,
        suspend: suspend,
        resume: resume,
        SOUNDS: Object.keys(SFX),
        _state: function () { return { context: ctx ? ctx.state : 'none', ambient: ambient.on, enabled: enabled, chime: windChime }; }
    };
}));
