/* ==========================================================================
   Sound polish: a room reverb on every effect, and extra body layered under the
   hits, blades, shots and blasts so they land with weight.
   ========================================================================== */

(function soundPolish() {
  const ROOM = [1.9, 2.2, 0.22];
  const MAP = {
    punch: [['impact', 0.9]], kick: [['impact', 1.1]], smash: [['impact', 1.3], ['soft', 1]], palm: [['impact', 1]], bash: [['impact', 1.1]],
    ko: [['impact', 1.2], ['soft', 1.4]], down: [['soft', 1.3]], hurt: [['impact', 0.8]], thud: [['soft', 1]], land: [['soft', 0.8]],
    slam: [['heavy', 0.9]], crash: [['heavy', 1]], stomp: [['heavy', 0.7]], bossko: [['heavy', 1.1]], break: [['impact', 0.8]], shatter: [['steel', 1.2]],
    swish: [['air', 0.8]], sweep: [['air', 1]], whip: [['air', 1.1]], dash: [['air', 1.2]], whoosh: [['air', 1]], thrust: [['air', 1], ['steel', 0.6]],
    slash: [['air', 1], ['steel', 1]], parry: [['steel', 1.3]], clang: [['steel', 1]], star: [['steel', 0.7]], counter: [['steel', 1], ['impact', 0.8]],
    pickup: [['shine', 1]], coin: [['shine', 1]], chifull: [['shine', 1.2]], dragon: [['heavy', 0.6], ['air', 1.4]], crit: [['steel', 1], ['impact', 1.2]]
  };
  function impulse(c, seconds, decay) {
    const len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  /** Built once, the first time a sound plays: effects bus -> short hall -> master. */
  function room(chip) {
    if (chip.room || !chip.ctx || !chip.sfxBus || !chip.master) return;
    chip.room = true;
    try {
      const c = chip.ctx, cv = c.createConvolver(), wet = c.createGain(), lp = c.createBiquadFilter();
      cv.buffer = impulse(c, ROOM[0], ROOM[1]);
      lp.type = 'lowpass'; lp.frequency.value = 3800;
      wet.gain.value = ROOM[2];
      chip.sfxBus.connect(cv); cv.connect(lp); lp.connect(wet); wet.connect(chip.master);
    } catch (e) { /* no reverb on this browser: the dry sound still plays */ }
  }
  const r = (a, b) => a + Math.random() * (b - a);
  const LAYER = {
    impact(s, t, k) {
      // struck wood and padded cloth: a low knock, no bright crack
      s.tone(t, 112 * r(0.9, 1.1), 0.1, 'sin', 0.3 * k, null, { slide: 46 });
      s.noise(t, 0.035, 0.26 * k, 'bandpass', r(700, 1100), 2.4);
      s.tone(t, r(620, 760), 0.03, 'tri', 0.08 * k, null, { slide: 300 });
    },
    heavy(s, t, k) {
      s.tone(t, 78, 0.42, 'sin', 0.4 * k, null, { slide: 27 });
      s.noise(t, 0.7, 0.3 * k, 'lowpass', 240, 0.6, null, { sweep: 60 });
      for (let i = 0; i < 5; i++) s.noise(t + 0.12 + i * r(0.05, 0.09), 0.03, 0.09 * k, 'highpass', r(2000, 5000), 0.8);
    },
    air(s, t, k) { s.noise(t, 0.13, 0.13 * k, 'bandpass', r(1100, 2000), 0.7, null, { sweep: r(4600, 6200) }); },
    steel(s, t, k) {
      s.tone(t, r(3300, 3900), 0.2, 'sin', 0.035 * k, null, { slide: 2500 });
      s.noise(t, 0.05, 0.1 * k, 'highpass', 5200, 0.8, null, { metal: true });
    },
    shot(s, t, k) {
      s.tone(t, 130, 0.08, 'sin', 0.24 * k, null, { slide: 46 });
      s.noise(t + 0.02, 0.26, 0.09 * k, 'lowpass', 1500, 0.5, null, { sweep: 260 });
    },
    soft(s, t, k) { s.tone(t, 96, 0.07, 'sin', 0.14 * k, null, { slide: 50 }); },
    shine(s, t, k) { s.tone(t + 0.02, r(2900, 3300), 0.22, 'sin', 0.03 * k, null, { decay: 0.06, sus: 0.3 }); }
  };
  const base = Chip.prototype.sfx;
  Chip.prototype.sfx = function (name, opt) {
    if (this.ok() && !this.mute) {
      room(this);
      const m = MAP[name];
      if (m) { const t = this.ctx.currentTime; for (const [kind, k] of m) LAYER[kind](this, t, k * 0.5); }
    }
    return base.call(this, name, opt);
  };
})();

/* ==========================================================================
   Dragon Pagoda's own sound: a temple hall. Effects are struck wood, silk and
   bronze rather than synth tones; the music is plucked strings, bamboo flute,
   taiko, woodblock and gong over a low drone, in pentatonic modes.
   ========================================================================== */

(function templeSound() {
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function seedOf(name) { let s = 7; for (let i = 0; i < name.length; i++) s = s * 31 + name.charCodeAt(i); return s; }
  function hall(chip, bus, seconds, decay, wetGain, echo) {
    try {
      const c = chip.ctx, len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
      const cv = c.createConvolver(), wet = c.createGain();
      cv.buffer = buf; wet.gain.value = wetGain;
      bus.connect(cv); cv.connect(wet); wet.connect(chip.master);
      if (echo) {
        const dl = c.createDelay(1), fb = c.createGain(), dw = c.createGain(), lp = c.createBiquadFilter();
        dl.delayTime.value = echo[0]; fb.gain.value = echo[1]; dw.gain.value = echo[2]; lp.type = 'lowpass'; lp.frequency.value = 2400;
        bus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(dw); dw.connect(chip.master);
      }
    } catch (e) { /* dry sound still plays */ }
  }
  function envGain(c, t, dur, vol, a, rel, opt) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (opt && opt.decay) g.gain.setTargetAtTime(vol * (opt.sus || 0.5), t + a, opt.decay);
    g.gain.setValueAtTime(opt && opt.decay ? vol * (opt.sus || 0.5) : vol, Math.max(t + a, t + dur - rel));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    return g;
  }
  function startScore(chip, name, table, stepFn, make) {
    chip.stopMusic(true);
    const c = chip.ctx;
    const song = { name, s: SONGS[name], step: 0, next: c.currentTime + 0.08, stepDur: 60 / table[name].bpm / 4, score: make(name, table[name]) };
    song.gain = c.createGain(); song.gain.gain.value = 0.0001; song.gain.gain.setTargetAtTime(table[name].gain || 1, c.currentTime, 0.25);
    song.gain.connect(chip.musicBus);
    song.pad = c.createGain(); song.pad.connect(song.gain);
    chip.song = song;
    const tick = () => {
      if (chip.song !== song) return;
      while (song.next < c.currentTime + 0.16) { stepFn.call(chip, song, song.step, song.next); song.step++; song.next += song.stepDur; }
    };
    tick();
    song.timer = setInterval(tick, 25);
  }

  /* Every old chip tone becomes a soft struck bell: triangle body, a quiet octave, quick bloom. */
  const baseTone = Chip.prototype.tone;
  Chip.prototype.tone = function (t, freq, dur, wave, vol, bus, opt) {
    if (wave === 'sin' || wave === 'tri') return baseTone.call(this, t, freq, dur, wave, vol, bus, opt);
    const c = this.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(Math.min(7000, freq * 5 + 500), t);
    f.frequency.exponentialRampToValueAtTime(Math.min(6000, freq * 1.6 + 200), t + Math.max(0.04, dur));
    const g = envGain(c, t, dur, vol * 1.25, 0.003, Math.max((opt && opt.r) || 0.04, 0.04), opt && opt.decay ? opt : { decay: Math.max(0.03, dur * 0.35), sus: 0.25 });
    for (const [type, mul, lvl] of [['triangle', 1, 1], ['sine', 2, 0.32], ['sine', 3.01, 0.1]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq * mul, t);
      if (opt && opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide * mul), t + dur);
      const og = c.createGain(); og.gain.value = lvl; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.05);
    }
    f.connect(g); g.connect(bus || this.sfxBus);
  };

  /** Plucked silk string (guzheng): bright attack that mellows as it rings. */
  Chip.prototype.pluck = function (t, freq, vol, bus, ring) {
    const c = this.ctx, dur = ring || 0.9;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(Math.min(9000, freq * 9), t); f.frequency.exponentialRampToValueAtTime(freq * 1.3 + 120, t + dur * 0.5);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const [type, det, lvl] of [['sawtooth', 0, 0.6], ['triangle', 5, 0.7]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq * 1.012, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.05); o.detune.value = det;
      const og = c.createGain(); og.gain.value = lvl; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.05);
    }
    f.connect(g); g.connect(bus);
    this.noise(t, 0.012, vol * 0.5, 'bandpass', Math.min(6000, freq * 4), 2, bus);
  };
  /** Bamboo flute (dizi): breathy sine that leans into its vibrato. */
  Chip.prototype.flute = function (t, freq, dur, vol, bus, bend) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * (bend ? 0.94 : 0.985), t); o.frequency.exponentialRampToValueAtTime(freq, t + (bend ? 0.12 : 0.04));
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(freq * 2, t);
    const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * 0.012, t + Math.min(dur, 0.45));
    l.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.07); g.gain.setValueAtTime(vol, Math.max(t + 0.07, t + dur - 0.1)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const g2 = c.createGain(); g2.gain.value = 0.12;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus);
    for (const x of [o, o2, l]) { x.start(t); x.stop(t + dur + 0.05); }
    this.noise(t, Math.min(dur, 0.5), vol * 0.22, 'bandpass', freq * 2, 3, bus);
  };

  // root is a MIDI note; mode lists the pentatonic steps; shift moves the drone for a bar
  const YU = [0, 3, 5, 7, 10], GONG = [0, 2, 4, 7, 9], SHANG = [0, 2, 5, 7, 10];
  const TABLE = {
    title: { bpm: 80, root: 50, mode: GONG, calm: true, gain: 1.7 }, entry: { bpm: 88, root: 53, mode: GONG, calm: true, gain: 1.8 }, ending: { bpm: 76, root: 55, mode: GONG, calm: true, gain: 2 },
    floorA: { bpm: 100, root: 50, mode: YU, gain: 1.3 }, floorB: { bpm: 108, root: 52, mode: SHANG, gain: 1.3 }, summit: { bpm: 116, root: 47, mode: YU, gain: 1.3 },
    boss: { bpm: 128, root: 45, mode: YU, war: true, gain: 0.78 }, final: { bpm: 136, root: 43, mode: YU, war: true, gain: 0.78 }
  };
  function make(name, cfg) {
    const R = rng(seedOf(name)), flute = [];
    let d = 5 + Math.floor(R() * 3);
    for (let bar = 0; bar < 8; bar++) {
      const spots = bar % 4 === 3 ? [0] : R() < 0.5 ? [0, 8, 12] : [0, 6, 10];
      for (const s of spots) {
        if (R() < 0.15) continue;
        d = Math.max(3, Math.min(10, d + (R() < 0.5 ? -1 : 1) * (R() < 0.7 ? 1 : 2)));
        flute.push({ at: bar * 16 + s, d, len: bar % 4 === 3 ? 12 : s === 0 ? 5 : 3.6 });
      }
    }
    const strum = []; for (let i = 0; i < 16; i++) strum.push(R() < 0.72 ? Math.floor(R() * 5) : -1);
    return { cfg, flute, strum };
  }
  const note = (cfg, deg) => cfg.root + cfg.mode[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5);

  function templeStep(song, i, t) {
    const S = song.score, cfg = S.cfg, sd = song.stepDur, bus = song.gain, pad = song.pad;
    const bar = Math.floor(i / 16), st = i % 16, sec = Math.floor((bar % 16) / 4);
    const shift = bar % 8 === 6 || bar % 8 === 7 ? 3 : 0; // the strings lean on the fourth before each return
    if (st === 0 && bar % 2 === 0) {
      // drone: root and fifth, barely there
      this.tone(t, hz(cfg.root - 12), sd * 31, 'sin', 0.09, pad, { a: 0.6, r: 0.8 });
      this.tone(t, hz(cfg.root - 5), sd * 31, 'tri', 0.03, pad, { a: 0.8, r: 0.8 });
      if (bar % 16 === 0) this.gong(t, cfg.calm ? 0.12 : 0.2, bus);
    }
    // plucked strings: a rolling figure, with a rising run into every fourth bar
    const run = bar % 4 === 3 && st >= 11;
    if (run) this.pluck(t, hz(note(cfg, st - 11 + shift + 5)), 0.11, bus, 0.7);
    else if (sec >= 1 || !cfg.calm || st % 4 === 0) {
      const k = S.strum[(st + (bar % 2) * 5) % 16];
      if (k >= 0 && (st % 2 === 0 || cfg.war)) this.pluck(t, hz(note(cfg, k + shift + (st % 8 === 0 ? 0 : 5))), st % 4 === 0 ? 0.13 : 0.085, bus);
    }
    // percussion: taiko and woodblock, no drum kit
    if (!cfg.calm || sec >= 2) {
      const beat = cfg.war ? [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1] : [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];
      if (beat[st]) this.taiko(t, cfg.war ? (st % 4 === 0 ? 0.5 : 0.3) : st === 0 ? 0.42 : 0.26, bus);
      if (st % 4 === 2 && sec >= 1) { this.tone(t, 1180, 0.05, 'sin', 0.12, bus, { r: 0.03 }); this.tone(t, 1770, 0.03, 'sin', 0.05, bus); }
      if (cfg.war && st % 2 === 1) this.noise(t, 0.03, 0.05, 'bandpass', 3200, 2, bus);
    }
    // bamboo flute sings over the top from the second section on
    if (sec >= 2 || (cfg.calm && sec >= 1)) {
      const at = (bar % 8) * 16 + st;
      for (const n of S.flute) if (n.at === at) this.flute(t, hz(note(cfg, n.d) + 12), sd * n.len, cfg.calm ? 0.1 : 0.12, bus, n.len > 4);
    }
    // low strings drive the guardian fights
    if (cfg.war && st % 2 === 0) this.tone(t, hz(cfg.root - 12 + (st === 14 ? 3 : 0)), sd * 1.6, 'tri', 0.2, bus, { r: 0.03 });
  }
  Chip.prototype.scoreStep = templeStep;

  const basePlay = Chip.prototype.play;
  Chip.prototype.play = function (name, onEnd) {
    const s = SONGS[name];
    if (!this.ctx || !s || !s.loop || !TABLE[name]) return basePlay.call(this, name, onEnd);
    startScore(this, name, TABLE, templeStep, make);
  };

  function space(chip) {
    if (chip.spaced || !chip.ctx || !chip.musicBus || !chip.master) return;
    chip.spaced = true;
    chip.metalBuf = chip.noiseBuf;
    hall(chip, chip.musicBus, 2.8, 2.2, 0.3, [0.42, 0.22, 0.1]);
  }
  const baseInit = Chip.prototype.initCtx;
  Chip.prototype.initCtx = function (c) { baseInit.call(this, c); space(this); };
  const baseSfx = Chip.prototype.sfx;
  Chip.prototype.sfx = function (name, opt) { space(this); return baseSfx.call(this, name, opt); };
})();
