/* ==========================================================================
   Sound polish: a room reverb on every effect, and extra body layered under the
   hits, blades, shots and blasts so they land with weight.
   ========================================================================== */

(function soundPolish() {
  const ROOM = [1.1, 2.6, 0.17];
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
      s.tone(t, 150 * r(0.88, 1.12), 0.09, 'sin', 0.24 * k, null, { slide: 52 });
      s.noise(t, 0.028, 0.24 * k, 'bandpass', r(2200, 3200), 1.2);
      s.noise(t + 0.012, 0.06, 0.1 * k, 'lowpass', 900, 0.7);
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
   Modern voice: the old sound-chip square waves are replaced by warm detuned
   saw voices through a sweeping low-pass filter, the chip hiss by clean noise,
   and the music gets its own hall and echo. Same notes, present-day sound.
   ========================================================================== */

(function modernVoice() {
  const baseTone = Chip.prototype.tone;
  Chip.prototype.tone = function (t, freq, dur, wave, vol, bus, opt) {
    if (wave === 'sin' || wave === 'tri') return baseTone.call(this, t, freq, dur, wave, vol, bus, opt);
    const c = this.ctx, music = !!bus && bus !== this.sfxBus;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = music ? 2.2 : 1;
    const top = Math.min(9000, freq * (wave === 'p12' ? 9 : wave === 'p25' ? 7 : 5.5) + 700);
    const low = Math.min(top, freq * 1.8 + 260);
    f.frequency.setValueAtTime(top, t);
    f.frequency.exponentialRampToValueAtTime(low, t + Math.max(0.05, dur * 0.85));
    const g = c.createGain();
    const a = Math.max((opt && opt.a) || 0.004, 0.006), rel = Math.max((opt && opt.r) || 0.04, 0.03);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (opt && opt.decay) g.gain.setTargetAtTime(vol * (opt.sus || 0.5), t + a, opt.decay);
    g.gain.setValueAtTime(opt && opt.decay ? vol * (opt.sus || 0.5) : vol, Math.max(t + a, t + dur - rel));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    let lfo = null;
    if (opt && opt.vib) {
      lfo = c.createGain(); lfo.gain.value = opt.vib[1];
      const l = c.createOscillator(); l.frequency.value = opt.vib[0];
      l.connect(lfo); l.start(t + (opt.vib[2] || 0.1)); l.stop(t + dur + 0.05);
    }
    const spread = dur > 0.09 ? [-9, 9] : [0];
    for (const d of spread) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.detune.value = d;
      o.frequency.setValueAtTime(freq, t);
      if (opt && opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + dur);
      if (lfo) lfo.connect(o.frequency);
      const og = c.createGain(); og.gain.value = spread.length > 1 ? 0.62 : 0.9;
      o.connect(og); og.connect(f);
      o.start(t); o.stop(t + dur + 0.05);
    }
    // weight under the bass line
    if (music && freq < 150 && dur > 0.08) baseTone.call(this, t, freq, dur, 'sin', vol * 0.7, bus, { a: 0.01, r: rel });
    f.connect(g); g.connect(bus || this.sfxBus);
  };

  /** One-time wiring: clean noise instead of chip hiss, and space around the music. */
  function space(chip) {
    if (chip.spaced || !chip.ctx || !chip.musicBus || !chip.master) return;
    chip.spaced = true;
    chip.metalBuf = chip.noiseBuf;
    try {
      const c = chip.ctx, len = Math.floor(c.sampleRate * 2.2), buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
      const cv = c.createConvolver(), wet = c.createGain();
      cv.buffer = buf; wet.gain.value = 0.24;
      chip.musicBus.connect(cv); cv.connect(wet); wet.connect(chip.master);
      const dl = c.createDelay(1), fb = c.createGain(), dw = c.createGain(), lp = c.createBiquadFilter();
      dl.delayTime.value = 0.29; fb.gain.value = 0.3; dw.gain.value = 0.16; lp.type = 'lowpass'; lp.frequency.value = 2600;
      chip.musicBus.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(dw); dw.connect(chip.master);
    } catch (e) { /* dry music still plays */ }
  }
  const baseInit = Chip.prototype.initCtx;
  Chip.prototype.initCtx = function (c) { baseInit.call(this, c); space(this); };
  const baseSfx = Chip.prototype.sfx;
  Chip.prototype.sfx = function (name, opt) { space(this); return baseSfx.call(this, name, opt); };
})();
