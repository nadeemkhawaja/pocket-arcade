/* ==========================================================================
   Sound polish: a room reverb on every effect, and extra body layered under the
   hits, blades, shots and blasts so they land with weight.
   ========================================================================== */

(function soundPolish() {
  const ROOM = [1.3, 2.3, 0.15];
  const MAP = {
    hit: [['impact', 1]], down: [['impact', 1], ['soft', 1.2]], hurt: [['impact', 0.9]], die: [['impact', 1.2], ['soft', 1.4]], chop: [['impact', 1]],
    crate: [['impact', 0.9], ['soft', 1]], thud: [['soft', 1.2]], land: [['soft', 0.8]], clang: [['steel', 1.1], ['impact', 0.6]], tink: [['steel', 1]],
    knife: [['air', 0.9], ['steel', 0.5]], katana: [['air', 1.1], ['steel', 0.8]], thrust: [['air', 1], ['steel', 0.7]], throw: [['air', 0.9]],
    star: [['steel', 0.6]], dash: [['air', 1.1]], whoosh: [['air', 0.9]], jump2: [['air', 0.6]], crit: [['steel', 1], ['impact', 1.2]],
    shot: [['shot', 1]], snipe: [['shot', 1.3]], rocket: [['shot', 0.8], ['air', 1.2]], boom: [['heavy', 1]], roar: [['heavy', 0.6]],
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
      if (m) { const t = this.ctx.currentTime; for (const [kind, k] of m) LAYER[kind](this, t, k); }
    }
    return base.call(this, name, opt);
  };
})();
