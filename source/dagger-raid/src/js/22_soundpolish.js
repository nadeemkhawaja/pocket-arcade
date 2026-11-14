/* ==========================================================================
   Sound polish: a room reverb on every effect, and extra body layered under the
   hits, blades, shots and blasts so they land with weight.
   ========================================================================== */

(function soundPolish() {
  const ROOM = [0.5, 3, 0.05];
  const MAP = {
    hit: [['impact', 1]], down: [['impact', 1], ['soft', 1.2]], hurt: [['impact', 0.9]], die: [['impact', 1.2], ['soft', 1.4]], chop: [['impact', 1]],
    crate: [['impact', 0.9], ['soft', 1]], thud: [['soft', 1.2]], land: [['soft', 0.8]], clang: [['steel', 1.1], ['impact', 0.6]], tink: [['steel', 1]],
    knife: [['air', 0.9], ['steel', 0.5]], katana: [['air', 1.1], ['steel', 0.8]], thrust: [['air', 1], ['steel', 0.7]], throw: [['air', 0.9]],
    star: [['steel', 0.6]], dash: [['air', 1.1]], whoosh: [['air', 0.9]], jump2: [['air', 0.6]], crit: [['steel', 1], ['impact', 1.2]],
    rocket: [['shot', 0.8], ['air', 1.2]], roar: [['heavy', 0.6]],
    pickup: [['shine', 1]], weapon: [['shine', 1], ['steel', 0.6]], coin: [['shine', 1]], free: [['shine', 1.1]], finisher: [['heavy', 0.7], ['steel', 1.2]]
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
      // hard and metallic: a sharp crack over a short thump
      s.tone(t, 170 * r(0.9, 1.1), 0.07, 'sin', 0.22 * k, null, { slide: 60 });
      s.noise(t, 0.022, 0.3 * k, 'highpass', r(3200, 4600), 1);
      s.noise(t + 0.01, 0.07, 0.1 * k, 'bandpass', 1500, 0.8, null, { metal: true });
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
   Dagger Raid's own sound: a war zone. The music is a film-style battle
   score (marching snare cadence, war drums, urgent low strings, horns and a
   distant choir); the effects are dry cracks, booms and long outdoor tails.
   No synth leads, no dance beat.
   ========================================================================== */

(function warSound() {
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


  /* Every old chip tone becomes a short horn note: saws whose filter opens with the breath. */
  const baseTone = Chip.prototype.tone;
  Chip.prototype.tone = function (t, freq, dur, wave, vol, bus, opt) {
    if (wave === 'sin' || wave === 'tri') return baseTone.call(this, t, freq, dur, wave, vol, bus, opt);
    const c = this.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.9;
    const open = Math.min(5200, freq * 4.5 + 400);
    f.frequency.setValueAtTime(freq * 1.1 + 150, t); f.frequency.linearRampToValueAtTime(open, t + Math.min(0.05, dur * 0.5)); f.frequency.setTargetAtTime(freq * 2.2 + 200, t + 0.06, Math.max(0.05, dur * 0.5));
    const g = envGain(c, t, dur, vol * 1.05, Math.max((opt && opt.a) || 0.004, 0.012), Math.max((opt && opt.r) || 0.04, 0.04), opt);
    for (const det of [-8, 7]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.setValueAtTime(freq, t);
      if (opt && opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + dur);
      const og = c.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.05);
    }
    f.connect(g); g.connect(bus || this.sfxBus);
  };

  /** French horns: three players, a slow swell and a warm, covered tone. */
  Chip.prototype.horn = function (t, freq, dur, vol, bus) {
    const c = this.ctx;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(freq * 1.2, t); f.frequency.linearRampToValueAtTime(Math.min(3200, freq * 4.2), t + 0.16); f.frequency.setTargetAtTime(freq * 2.4, t + 0.2, 0.5);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.11); g.gain.setValueAtTime(vol * 0.92, Math.max(t + 0.11, t + dur - 0.16)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 4.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * 0.004, t + 0.5); l.connect(lg); l.start(t); l.stop(t + dur + 0.05);
    for (const det of [-9, 0, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.setValueAtTime(freq, t); lg.connect(o.frequency); const og = c.createGain(); og.gain.value = 0.34; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.05); }
    f.connect(g); g.connect(bus);
  };
  /** Low strings, short bows: the engine of the battle music. */
  Chip.prototype.spicc = function (t, freq, vol, bus, len) {
    const c = this.ctx, dur = len || 0.13;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(Math.min(4200, freq * 7), t); f.frequency.exponentialRampToValueAtTime(freq * 2 + 150, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const det of [-12, 0, 11]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = freq; const og = c.createGain(); og.gain.value = 0.36; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.03); }
    f.connect(g); g.connect(bus);
    this.noise(t, 0.012, vol * 0.25, 'bandpass', Math.min(5000, freq * 6), 1.5, bus);
  };
  /** Choir: saws through two vowel formants, far away. */
  Chip.prototype.choir = function (t, freq, dur, vol, bus) {
    const c = this.ctx;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.5); g.gain.setValueAtTime(vol, Math.max(t + 0.5, t + dur - 0.5)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const forms = [700, 1150].map((fq) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fq; b.Q.value = 4; b.connect(g); return b; });
    for (const det of [-14, -4, 6, 13]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = freq; for (const b of forms) o.connect(b); o.start(t); o.stop(t + dur + 0.05); }
    g.connect(bus);
  };
  /** War drum: a huge low skin with a short room slap. */
  Chip.prototype.warDrum = function (t, vol, bus, pitch) {
    const f0 = pitch || 86;
    baseTone.call(this, t, f0, 0.5, 'sin', vol, bus, { slide: f0 * 0.5, r: 0.2 });
    baseTone.call(this, t, f0 * 1.5, 0.12, 'tri', vol * 0.35, bus, { slide: f0 * 0.8, r: 0.06 });
    this.noise(t, 0.09, vol * 0.5, 'lowpass', 520, 0.7, bus);
  };
  Chip.prototype.snareHit = function (t, vol, bus) {
    this.noise(t, 0.09, vol, 'bandpass', 2300, 0.9, bus);
    this.noise(t, 0.05, vol * 0.7, 'highpass', 5200, 0.7, bus);
    baseTone.call(this, t, 210, 0.05, 'tri', vol * 0.5, bus, { slide: 160 });
  };

  // each chord is [semitones above the key, minor?]
  const I = [0, 1], VI = [8, 0], VII = [10, 0], iv = [5, 1], III = [3, 0], v = [7, 1], II = [1, 0];
  const TABLE = {
    title: { bpm: 84, root: 38, prog: [I, VI, III, VII], solemn: true, gain: 1.25 }, entry: { bpm: 88, root: 41, prog: [I, VI, III, VII], solemn: true, gain: 1.25 }, ending: { bpm: 80, root: 43, prog: [[0, 0], [5, 0], [9, 1], [7, 0]], solemn: true, gain: 1.3 },
    stageA: { bpm: 112, root: 38, prog: [I, I, VI, VII] }, stageB: { bpm: 118, root: 40, prog: [I, iv, I, v] },
    stageC: { bpm: 108, root: 36, prog: [I, VI, iv, VII] }, stageD: { bpm: 124, root: 35, prog: [I, VII, VI, v] },
    boss: { bpm: 138, root: 37, prog: [I, II, I, II], siege: true, gain: 0.74 }
  };
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  function make(name, cfg) {
    const R = rng(seedOf(name) + 4242), theme = [];
    // a four bar horn call, answered a step lower: long notes and rising fourths and fifths
    let d = 4;
    for (let bar = 0; bar < 8; bar++) {
      if (bar % 4 === 3) { theme.push({ at: bar * 16, d: bar === 7 ? 0 : 4, len: 14 }); continue; }
      for (const s of bar % 2 ? [0, 8] : [0, 6, 12]) {
        const x = R(); d = Math.max(0, Math.min(9, d + (x < 0.35 ? 3 : x < 0.6 ? 4 : x < 0.8 ? -2 : -1)));
        if (d > 7) d -= 4;
        theme.push({ at: bar * 16 + s, d, len: s === 12 ? 3.6 : bar % 2 ? 7.4 : 5.4 });
      }
    }
    // the string figure: which chord tone each sixteenth plays (-1 rests)
    const fig = [[0, 0, 2, 0, 1, 0, 2, 0, 0, 0, 2, 0, 1, 2, 1, 0], [0, -1, 0, 0, 2, -1, 0, 0, 1, -1, 0, 0, 2, 0, 1, 0], [0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 2, 1, 2]][Math.floor(R() * 3)];
    const drum = [[0, 6, 10], [0, 3, 8, 11], [0, 8, 14]][Math.floor(R() * 3)];
    return { cfg, theme, fig, drum };
  }

  function warStep(song, i, t) {
    const S = song.score, cfg = S.cfg, sd = song.stepDur, bus = song.gain, pad = song.pad;
    const bar = Math.floor(i / 16), st = i % 16, sec = Math.floor((bar % 16) / 4);
    const ch = cfg.prog[bar % 4], root = cfg.root + ch[0], tones = [0, 7, ch[1] ? 3 : 4];
    const build = sec >= 1 || cfg.siege, full = sec >= 2 || cfg.siege;
    if (st === 0) {
      // basses hold the ground; the choir enters once the battle is joined
      baseTone.call(this, t, hz(root - 12), sd * 15.8, 'sin', 0.16, pad, { a: 0.15, r: 0.4 });
      baseTone.call(this, t, hz(root), sd * 15.8, 'tri', 0.05, pad, { a: 0.3, r: 0.4 });
      if (full || cfg.solemn) for (const n of [12 + tones[2], 19, 24]) this.choir(t, hz(root + n), sd * 15.6, cfg.solemn ? 0.035 : 0.028, pad);
    }
    // marching snare: steady taps, flams on the beat, a roll into every fourth bar
    const roll = bar % 4 === 3 && st >= 10;
    if (roll) { this.snareHit(t, 0.07 + (st - 10) * 0.022, bus); this.snareHit(t + sd * 0.5, 0.06 + (st - 10) * 0.02, bus); }
    else if (cfg.solemn ? [0, 6, 8, 12, 14].includes(st) : build ? st % 2 === 0 || st === 3 || st === 11 : st % 4 === 0) {
      const accent = st % 8 === 4 || (cfg.solemn && st === 8);
      if (accent) this.snareHit(t - 0.02, 0.07, bus);
      this.snareHit(t, accent ? 0.2 : 0.085, bus);
    }
    // war drums
    if (!cfg.solemn || sec >= 2) {
      if (S.drum.includes(st) && (build || st === 0)) this.warDrum(t, st === 0 ? 0.55 : 0.36, bus, st === 0 ? 82 : 98);
      if (cfg.siege && st % 4 === 2) this.warDrum(t, 0.26, bus, 120);
    } else if (st === 0 && bar % 2 === 0) this.warDrum(t, 0.4, bus, 74);
    if (bar % 4 === 3 && st === 8 && full) this.noise(t, sd * 8, 0.07, 'highpass', 3000, 0.5, bus, { sweep: 9000 }); // cymbal swell
    if (bar % 8 === 0 && st === 0 && build) { this.noise(t, 1.4, 0.12, 'highpass', 4200, 0.5, bus); this.warDrum(t, 0.6, bus, 62); }
    // low strings: short urgent bows
    if (!cfg.solemn) {
      const k = S.fig[st];
      if (k >= 0 && (build || st % 2 === 0)) this.spicc(t, hz(root + tones[k] + (full && st % 8 === 6 ? 12 : 0)), st % 4 === 0 ? 0.16 : 0.11, bus, sd * 0.95);
      if (full && st % 4 === 0) this.spicc(t, hz(root + 12 + tones[(bar + st / 4) % 3]), 0.07, bus, sd * 1.6);
    } else if (st % 8 === 0 && sec >= 1) this.spicc(t, hz(root), 0.1, bus, sd * 3);
    // horns carry the theme
    if (full || (cfg.solemn && sec >= 1)) {
      const at = (bar % 8) * 16 + st;
      for (const n of S.theme) if (n.at === at) {
        const m = cfg.root + 12 + MINOR[n.d % 7] + 12 * Math.floor(n.d / 7);
        this.horn(t, hz(m), sd * n.len, 0.1, bus);
        if (cfg.siege || sec === 3) this.horn(t, hz(m - 12), sd * n.len, 0.06, bus);
      }
    }
    // trombone stabs punch the off beats in the fights
    if (cfg.siege && (st === 3 || st === 6 || st === 11 || st === 14)) for (const n of [0, 7]) this.horn(t, hz(root + n), sd * 1.4, 0.07, bus);
  }
  Chip.prototype.scoreStep = warStep;

  const basePlay = Chip.prototype.play;
  Chip.prototype.play = function (name, onEnd) {
    const s = SONGS[name];
    if (!this.ctx || !s || !s.loop || !TABLE[name]) return basePlay.call(this, name, onEnd);
    startScore(this, name, TABLE, warStep, make);
  };

  function space(chip) {
    if (chip.spaced || !chip.ctx || !chip.musicBus || !chip.master) return;
    chip.spaced = true;
    chip.metalBuf = chip.noiseBuf;
    hall(chip, chip.musicBus, 2.4, 2.4, 0.26, null);          // scoring stage
    hall(chip, chip.sfxBus, 1.5, 1.6, 0.12, [0.19, 0.18, 0.16]); // open ground: a slap off the far tree line
  }
  const baseInit = Chip.prototype.initCtx;
  Chip.prototype.initCtx = function (c) { baseInit.call(this, c); space(this); };

  /* Gunfire and blasts rebuilt for the field: crack, body, thump, then the report rolling away. */
  const baseSfx = Chip.prototype.sfx;
  Chip.prototype.sfx = function (name, opt) {
    space(this);
    if (this.ok() && !this.mute) {
      const t = this.ctx.currentTime;
      if (name === 'shot' || name === 'snipe') {
        const big = name === 'snipe' ? 1.3 : 1;
        this.noise(t, 0.012, 0.5 * big, 'highpass', 3800, 0.7);
        this.noise(t, 0.07, 0.4 * big, 'bandpass', 900, 0.8, null, { sweep: 300 });
        baseTone.call(this, t, 150, 0.09, 'sin', 0.3 * big, null, { slide: 45 });
        this.noise(t + 0.03, 0.5 * big, 0.1 * big, 'lowpass', 1400, 0.5, null, { sweep: 180 });
        return 0;
      }
      if (name === 'boom') {
        const big = opt && opt.big ? 1.25 : 1;
        this.noise(t, 0.02, 0.32, 'highpass', 2500, 0.7);
        baseTone.call(this, t, 95, 0.7 * big, 'sin', 0.36, null, { slide: 26, r: 0.3 });
        this.noise(t, 0.9 * big, 0.3, 'lowpass', 700, 0.6, null, { sweep: 60 });
        for (let k = 0; k < 7; k++) this.noise(t + 0.15 + Math.random() * 0.6, 0.04, 0.06, 'bandpass', 1500 + Math.random() * 3000, 2);
        return 0;
      }
    }
    return baseSfx.call(this, name, opt);
  };

  /* The battlefield never goes quiet: distant rifle fire, bursts and far shelling under every stage. */
  const baseAmb = Chip.prototype.ambience;
  Chip.prototype.ambience = function (id) {
    baseAmb.call(this, id);
    clearInterval(this.warTimer);
    if (!id) return;
    this.warTimer = setInterval(() => {
      if (!this.ok() || this.mute || document.hidden || this.ambWant !== id) return;
      const t = this.ctx.currentTime, x = Math.random();
      if (x < 0.4) { const n = 1 + Math.floor(Math.random() * 4); for (let k = 0; k < n; k++) this.noise(t + k * 0.11 + Math.random() * 0.03, 0.09, 0.035, 'bandpass', 600 + Math.random() * 500, 1.2, null, { sweep: 250 }); }
      else if (x < 0.55) { baseTone.call(this, t, 60, 0.9, 'sin', 0.06, null, { slide: 30, r: 0.4 }); this.noise(t, 1.2, 0.04, 'lowpass', 300, 0.6, null, { sweep: 70 }); }
    }, 2300);
  };
})();
