/* ==========================================================================
   More sound: movement and weapon effects, synthesized voices, stage ambience
   ========================================================================== */

(function moreSound() {
  const base = Chip.prototype.sfx;
  Chip.prototype.sfx = function (name, opt) {
    if (!this.ok() || this.mute) return 0;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'dash':
        this.noise(t, 0.16, 0.34, 'bandpass', 700, 0.8, null, { sweep: 2800 });
        break;
      case 'whoosh':
        this.noise(t, 0.2, 0.22, 'bandpass', 500, 0.9, null, { sweep: 1900 });
        break;
      case 'dodge':
        this.tone(t, 1320, 0.07, 'p12', 0.07); this.tone(t + 0.05, 1980, 0.12, 'p12', 0.07, null, { decay: 0.05, sus: 0.3 });
        break;
      case 'jump2':
        this.tone(t, 340, 0.1, 'p25', 0.08, null, { slide: 760 });
        this.noise(t, 0.08, 0.1, 'highpass', 2400, 0.7);
        break;
      case 'katana':
        this.noise(t, 0.13, 0.5, 'highpass', 3600, 0.8, null, { sweep: 9000 });
        this.tone(t, 3100, 0.16, 'sin', 0.05, null, { slide: 2300 });
        this.tone(t + 0.01, 4650, 0.1, 'sin', 0.025);
        break;
      case 'thrust':
        this.noise(t, 0.1, 0.55, 'highpass', 2000, 0.7, null, { sweep: 6400 });
        this.tone(t, 1500, 0.07, 'p12', 0.07, null, { slide: 3600 });
        break;
      case 'crit':
        this.tone(t, 1568, 0.05, 'p50', 0.1); this.tone(t + 0.04, 2349, 0.14, 'p25', 0.1, null, { decay: 0.05, sus: 0.35 });
        this.noise(t, 0.09, 0.3, 'bandpass', 2600, 1.2);
        break;
      case 'finisher':
        this.noise(t, 0.5, 0.5, 'highpass', 1800, 0.7, null, { sweep: 9000 });
        [523, 784, 1047, 1568].forEach((f, i) => this.tone(t + i * 0.05, f, 0.3, 'p25', 0.09, null, { decay: 0.1, sus: 0.4 }));
        break;
      case 'star':
        this.noise(t, 0.08, 0.3, 'highpass', 4200, 0.8, null, { metal: true });
        this.tone(t, 2600, 0.06, 'p12', 0.04, null, { slide: 1700 });
        break;
      case 'poof':
        this.noise(t, 0.3, 0.3, 'lowpass', 1400, 0.6, null, { sweep: 300 });
        break;
      case 'flameJet':
        this.noise(t, 0.2, 0.26, 'bandpass', 520, 0.6, null, { sweep: 900 });
        break;
      case 'shield':
        this.tone(t, 880, 0.14, 'sin', 0.12, null, { slide: 1500 }); this.tone(t, 1320, 0.1, 'p12', 0.04);
        break;
      case 'thud':
        this.tone(t, 110, 0.16, 'sin', 0.4, null, { slide: 40 }); this.noise(t, 0.1, 0.22, 'lowpass', 600);
        break;
      case 'medal':
        [784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.06, f, 0.14, 'p25', 0.085, null, { decay: 0.06, sus: 0.4 }));
        break;
      case 'step': {
        const s = opt && opt.surf;
        if (s === 'rail') this.noise(t, 0.05, 0.07, 'highpass', 1800, 0.7);
        else if (s === 'citadel') this.noise(t, 0.035, 0.07, 'bandpass', 1100, 1.5);
        else if (s === 'refinery') this.noise(t, 0.05, 0.06, 'lowpass', 900, 0.7);
        else this.noise(t, 0.045, 0.06, 'lowpass', 520, 0.8);
        break;
      }
      default: return base.call(this, name, opt);
    }
    return 0;
  };

  /* Voices: a buzzing source pushed through two vowel formants, with a falling pitch. */
  const VOX = {
    kiai: { f0: 250, f1: 150, dur: 0.16, F: [820, 1250], vol: 0.2 },
    pain: { f0: 210, f1: 120, dur: 0.22, F: [600, 1050], vol: 0.2 },
    down: { f0: 190, f1: 70, dur: 0.5, F: [560, 900], vol: 0.2 },
    grunt: { f0: 150, f1: 85, dur: 0.17, F: [480, 980], vol: 0.13 },
    thanks: { f0: 330, f1: 420, dur: 0.2, F: [700, 1900], vol: 0.1 },
    laugh: { f0: 130, f1: 100, dur: 0.14, F: [520, 1100], vol: 0.2 }
  };
  Chip.prototype.voice = function (kind) {
    if (!this.ok() || this.mute) return;
    const v = VOX[kind];
    if (!v) return;
    const c = this.ctx, t = c.currentTime, jitter = 0.94 + Math.random() * 0.12;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(v.f0 * jitter, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, v.f1 * jitter), t + v.dur);
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(v.vol, t + 0.015);
    out.gain.setTargetAtTime(0.0001, t + v.dur * 0.55, v.dur * 0.2);
    for (const f of v.F) {
      const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 5;
      o.connect(b); b.connect(out);
    }
    out.connect(this.sfxBus);
    o.start(t); o.stop(t + v.dur + 0.25);
    // breath on top
    this.noise(t, v.dur * 0.8, v.vol * 0.35, 'bandpass', v.F[1], 1.4);
  };

  /* Ambience: a quiet looping bed per stage (wind, rain, jungle hush), with the odd bird or clank. */
  const BEDS = {
    jungle: { type: 'bandpass', freq: 2600, q: 0.5, vol: 0.022, chirp: true },
    rail: { type: 'bandpass', freq: 420, q: 0.6, vol: 0.06, wobble: 0.18 },
    refinery: { type: 'lowpass', freq: 300, q: 0.7, vol: 0.075, hum: 55 },
    citadel: { type: 'highpass', freq: 2400, q: 0.4, vol: 0.05, rain: true }
  };
  Chip.prototype.ambience = function (id) {
    if (this.amb) {
      const a = this.amb; this.amb = null;
      clearInterval(a.timer);
      if (this.ctx) { a.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2); setTimeout(() => { try { a.src.stop(); if (a.hum) a.hum.stop(); if (a.lfo) a.lfo.stop(); a.gain.disconnect(); } catch (e) { /* gone */ } }, 900); }
    }
    this.ambWant = id;
    const B = BEDS[id];
    if (!B || !this.ctx || this.mute) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = B.type; f.frequency.value = B.freq; f.Q.value = B.q;
    const gain = c.createGain(); gain.gain.setValueAtTime(0.0001, t); gain.gain.setTargetAtTime(B.vol, t, 0.8);
    src.connect(f); f.connect(gain); gain.connect(this.sfxBus);
    src.start(t);
    const a = { src, gain };
    if (B.wobble) {
      const l = c.createOscillator(); l.frequency.value = B.wobble; const lg = c.createGain(); lg.gain.value = 180;
      l.connect(lg); lg.connect(f.frequency); l.start(t); a.lfo = l;
    }
    if (B.hum) {
      const h = c.createOscillator(); h.type = 'sawtooth'; h.frequency.value = B.hum; const hg = c.createGain(); hg.gain.value = 0.012;
      const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 220;
      h.connect(hf); hf.connect(hg); hg.connect(gain); h.start(t); a.hum = h;
    }
    a.timer = setInterval(() => {
      if (this.amb !== a || !this.ok() || this.mute || document.hidden) return;
      const now = c.currentTime;
      if (B.chirp && Math.random() < 0.5) {
        const f0 = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.tone(now + i * 0.09, f0 * (1 + i * 0.06), 0.06, 'sin', 0.012, null, { slide: f0 * 1.25 });
      }
      if (B.hum && Math.random() < 0.25) this.tone(now, 620 + Math.random() * 200, 0.3, 'tri', 0.008, null, { slide: 500 });
    }, 1700);
    this.amb = a;
  };
})();
