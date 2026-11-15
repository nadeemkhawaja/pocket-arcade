/* ==========================================================================
   Sound. Everything is generated in the browser: a geared engine that follows
   the speedometer, tyres, wind and nitro, the effects, and a synthwave
   soundtrack sequenced in code (drums, bass, arpeggio, pad and lead).
   ========================================================================== */

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MODES = { min: [0, 2, 3, 5, 7, 8, 10], maj: [0, 2, 4, 5, 7, 9, 11], dor: [0, 2, 3, 5, 7, 9, 10], mix: [0, 2, 4, 5, 7, 9, 10] };

/* bpm, root note, mode, one chord degree per bar, and the character of each part */
const SONGS = {
  title: { bpm: 98, root: 45, mode: 'min', prog: [0, 5, 2, 6, 0, 5, 3, 4], drums: 'half', bass: 'pulse', arp: 'up', lead: 11, cut: 1500, loop: true },
  coast: { bpm: 118, root: 41, mode: 'maj', prog: [0, 4, 5, 3, 0, 4, 1, 4], drums: 'four', bass: 'octave', arp: 'updown', lead: 23, cut: 2100, loop: true },
  mesa: { bpm: 124, root: 38, mode: 'dor', prog: [0, 6, 3, 4, 0, 6, 2, 4], drums: 'break', bass: 'gallop', arp: 'up', lead: 37, cut: 1900, loop: true },
  pine: { bpm: 112, root: 43, mode: 'maj', prog: [0, 5, 3, 4, 2, 5, 3, 4], drums: 'four', bass: 'pulse', arp: 'wide', lead: 51, cut: 2300, loop: true },
  neon: { bpm: 128, root: 40, mode: 'min', prog: [0, 0, 5, 6, 0, 3, 5, 4], drums: 'four', bass: 'octave', arp: 'updown', lead: 67, cut: 1700, loop: true },
  aurora: { bpm: 134, root: 42, mode: 'min', prog: [0, 5, 2, 6, 3, 5, 6, 4], drums: 'break', bass: 'gallop', arp: 'wide', lead: 83, cut: 2400, loop: true },
  clear: { bpm: 120, root: 48, mode: 'maj', prog: [0, 3, 4, 0], drums: 'none', bass: 'pulse', arp: 'up', lead: 5, cut: 2600, loop: false, bars: 4 },
  over: { bpm: 84, root: 45, mode: 'min', prog: [0, 5, 3, 0], drums: 'none', bass: 'pulse', arp: 'none', lead: 9, cut: 1200, loop: false, bars: 4 },
  ending: { bpm: 104, root: 48, mode: 'maj', prog: [0, 4, 5, 3, 0, 4, 3, 4], drums: 'half', bass: 'octave', arp: 'updown', lead: 97, cut: 2400, loop: true }
};

const DRUMS = {
  four: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', o: '..............x.' },
  half: { k: 'x.........x.....', s: '........x.......', h: 'x.x.x.x.x.x.x.x.', o: '................' },
  break: { k: 'x.....x...x.....', s: '....x.......x..x', h: 'x.xxx.xxx.xxx.xx', o: '................' },
  none: { k: '................', s: '................', h: '................', o: '................' }
};
const BASS = { octave: 'l.h.l.h.l.h.l.hh', pulse: 'l..l..l.l..l..l.', gallop: 'l.lll.lll.lll.lh' };

class Chip {
  constructor() { this.ctx = null; this.song = null; this.songName = ''; this.mute = false; this.eng = null; }
  ok() { return !!this.ctx && this.ctx.state === 'running'; }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.init(new AC()); } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.pending && this.ok()) { const p = this.pending; this.pending = null; this.play(p); }
  }

  init(c) {
    this.ctx = c;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master = c.createGain(); this.master.gain.value = 0.76;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.engBus = c.createGain(); this.engBus.connect(this.master);
    this.musicBus = c.createGain(); this.musicBus.connect(this.master);
    this.duck = c.createGain(); this.duck.connect(this.musicBus);          // pumps with the kick drum
    this.drumBus = c.createGain(); this.drumBus.connect(this.musicBus);
    // echo for the arpeggio and lead
    const dl = c.createDelay(1.5), fb = c.createGain(), lp = c.createBiquadFilter();
    dl.delayTime.value = 0.36; fb.gain.value = 0.36; lp.type = 'lowpass'; lp.frequency.value = 2600;
    this.echo = c.createGain(); this.echo.gain.value = 0.34;
    this.echo.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(this.duck);
    this.delay = dl;
    // a short room on everything so it does not sound dry
    const len = Math.floor(c.sampleRate * 1.6), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const cv = c.createConvolver(), wet = c.createGain();
    cv.buffer = buf; wet.gain.value = 0.16;
    this.sfxBus.connect(cv); this.duck.connect(cv); cv.connect(wet); wet.connect(this.master);
    // inside a tunnel the engine rings off the walls
    this.tunSend = c.createGain(); this.tunSend.gain.value = 0; this.engBus.connect(this.tunSend); this.tunSend.connect(cv);
    // noise source shared by drums and effects
    const nlen = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, nlen, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    this.initEngine();
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, on = settings.muted ? 0 : 1;
    this.sfxBus.gain.setTargetAtTime(on * settings.sfx * 0.9, t, 0.05);
    this.engBus.gain.setTargetAtTime(on * settings.sfx * 0.3, t, 0.05);
    this.musicBus.gain.setTargetAtTime(on * settings.music * 0.9, t, 0.05);
  }

  /* ---- building blocks ---------------------------------------------------------- */
  tone(t, freq, dur, type, vol, bus, o) {
    const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (o && o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o && o.detune) osc.detune.value = o.detune;
    const a = (o && o.a) || 0.005, r = Math.min((o && o.r) || 0.05, dur * 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    if (o && o.decay) g.gain.setTargetAtTime(vol * (o.sus === undefined ? 0.4 : o.sus), t + a, o.decay);
    g.gain.setTargetAtTime(0.0001, t + dur - r, r / 3);
    let out = g;
    if (o && o.cut) {
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.cut, t);
      if (o.cutTo) f.frequency.exponentialRampToValueAtTime(o.cutTo, t + dur);
      g.connect(f); out = f;
    }
    osc.connect(g); out.connect(bus || this.sfxBus);
    if (o && o.echo) out.connect(this.echo);
    osc.start(t); osc.stop(t + dur + 0.1);
  }
  noise(t, dur, vol, type, freq, q, bus, o) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq || 4000, t); f.Q.value = q || 0.7;
    if (o && o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
    const a = (o && o.a) || 0.002;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
  }

  /* ---- the car ------------------------------------------------------------------- */
  initEngine() {
    const c = this.ctx, e = {};
    e.f = c.createBiquadFilter(); e.f.type = 'lowpass'; e.f.frequency.value = 500; e.f.Q.value = 1.1;
    e.g = c.createGain(); e.g.gain.value = 0;
    e.o = [['sawtooth', 1, 0.36], ['triangle', 0.5, 0.6], ['sawtooth', 1.012, 0.22], ['sine', 0.25, 0.5], ['triangle', 2, 0.1]].map(([type, mul, lvl]) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = 60 * mul; g.gain.value = lvl;
      o.connect(g); g.connect(e.f); o.start(); return [o, mul];
    });
    e.f.connect(e.g); e.g.connect(this.engBus);
    const loop = (type, freq, q) => {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(this.engBus); s.start(); return [f, g];
    };
    e.skid = loop('bandpass', 1500, 5); e.wind = loop('lowpass', 500, 0.5); e.nitro = loop('bandpass', 2600, 0.8); e.dirt = loop('lowpass', 260, 0.9);
    this.eng = e; this.gear = 1;
  }
  /** Called every frame while driving: o = { on, speed 0..1.3, gas, nitro, skid 0..1, dirt 0..1 }. */
  engine(o) {
    const e = this.eng;
    if (!e || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (!o || !o.on || !this.ok()) {
      e.g.gain.setTargetAtTime(0, t, 0.08);
      for (const k of ['skid', 'wind', 'nitro', 'dirt']) e[k][1].gain.setTargetAtTime(0, t, 0.08);
      return;
    }
    const sp = clamp(o.speed, 0, 1.4);
    const G = [0, 0.16, 0.34, 0.54, 0.76, 1.02, 9];
    let gear = this.gear;
    if (sp > G[gear] - 0.01 && gear < 5) gear++; else if (sp < G[gear - 1] - 0.05 && gear > 1) gear--;
    if (gear !== this.gear) { this.gear = gear; if (o.gas && sp > 0.1) e.g.gain.setTargetAtTime(0.25, t, 0.01); }
    const lo = G[gear - 1], hi = Math.min(G[gear], 1.3);
    const rpm = clamp(0.3 + 0.7 * (sp - lo) / (hi - lo), 0.2, 1.25);
    const f = 46 + rpm * 118 + gear * 5;
    for (const [osc, mul] of e.o) osc.frequency.setTargetAtTime(f * mul, t, 0.035);
    e.f.frequency.setTargetAtTime(300 + rpm * 1150 * (o.gas ? 1 : 0.5) + (o.nitro ? 800 : 0), t, 0.05);
    this.tunSend.gain.setTargetAtTime(o.tunnel ? 2.6 : 0, t, 0.08);
    e.g.gain.setTargetAtTime((o.gas ? 0.62 : 0.34) + (o.nitro ? 0.16 : 0), t, 0.06);
    e.skid[0].frequency.setTargetAtTime(1300 + sp * 600, t, 0.05);
    e.skid[1].gain.setTargetAtTime(clamp(o.skid || 0, 0, 1) * 0.5, t, 0.04);
    e.wind[0].frequency.setTargetAtTime(300 + sp * 900, t, 0.1);
    e.wind[1].gain.setTargetAtTime(sp * sp * 0.3, t, 0.1);
    e.nitro[1].gain.setTargetAtTime(o.nitro ? 0.42 : 0, t, 0.06);
    e.dirt[1].gain.setTargetAtTime(clamp(o.dirt || 0, 0, 1) * sp * 1.4, t, 0.05);
  }

  /* ---- effects --------------------------------------------------------------------- */
  sfx(name, opt) {
    if (!this.ok() || settings.muted) return;
    const t = this.ctx.currentTime, T = (...a) => this.tone(...a), N = (...a) => this.noise(...a);
    switch (name) {
      case 'move': T(t, 880, 0.05, 'triangle', 0.16, null, { slide: 1180 }); break;
      case 'select': T(t, 660, 0.07, 'triangle', 0.2); T(t + 0.06, 990, 0.12, 'triangle', 0.2, null, { echo: true }); break;
      case 'back': T(t, 520, 0.09, 'triangle', 0.16, null, { slide: 330 }); break;
      case 'count': T(t, 440, 0.16, 'square', 0.16, null, { cut: 1800 }); break;
      case 'go': T(t, 880, 0.5, 'square', 0.18, null, { cut: 2600, decay: 0.12 }); T(t, 1320, 0.5, 'triangle', 0.1, null, { echo: true }); break;
      case 'check': [0, 4, 7, 12, 16].forEach((n, i) => T(t + i * 0.07, hz(72 + n), 0.22, 'triangle', 0.2, null, { echo: true, decay: 0.08 })); break;
      case 'time': T(t, 1040, 0.08, 'sine', 0.22); T(t + 0.09, 1560, 0.16, 'sine', 0.22, null, { echo: true }); break;
      case 'pickup': T(t, 620, 0.06, 'square', 0.12, null, { cut: 3000 }); T(t + 0.05, 930, 0.06, 'square', 0.12, null, { cut: 3000 }); T(t + 0.1, 1240, 0.14, 'square', 0.12, null, { cut: 3000, echo: true }); break;
      case 'coin': T(t, 1568, 0.05, 'sine', 0.16); T(t + 0.045, 2093, 0.13, 'sine', 0.16, null, { decay: 0.04 }); break;
      case 'nitro': N(t, 0.7, 0.4, 'bandpass', 500, 1.2, null, { sweep: 5200, a: 0.05 }); T(t, 110, 0.5, 'sawtooth', 0.2, null, { slide: 420, cut: 1200 }); break;
      case 'near': N(t, 0.2, 0.3, 'bandpass', 2400, 1.5, null, { sweep: 600 }); T(t + 0.03, 1760, 0.1, 'sine', 0.12, null, { echo: true }); break;
      case 'pass': N(t, 0.28, 0.2, 'bandpass', 1500, 1, null, { sweep: 380 }); break;
      case 'slip': T(t, 330, 0.3, 'sine', 0.1, null, { slide: 990 }); break;
      case 'bump': T(t, 120, 0.16, 'sine', 0.5, null, { slide: 46, a: 0.004 }); N(t, 0.12, 0.34, 'bandpass', 900, 1.2); N(t, 0.2, 0.16, 'highpass', 3600, 0.7); break;
      case 'crash': T(t, 96, 0.4, 'sine', 0.6, null, { slide: 30 }); N(t, 0.5, 0.5, 'lowpass', 2200, 0.7, null, { sweep: 200 }); for (let i = 0; i < 6; i++) N(t + 0.05 + i * 0.05 + Math.random() * 0.03, 0.05, 0.16, 'highpass', 3000 + Math.random() * 3000, 0.9); break;
      case 'cone': T(t, 300, 0.07, 'triangle', 0.26, null, { slide: 140 }); N(t, 0.05, 0.18, 'bandpass', 1400, 2); break;
      case 'oil': T(t, 240, 0.5, 'sine', 0.2, null, { slide: 120 }); N(t, 0.5, 0.2, 'bandpass', 900, 3, null, { sweep: 2600 }); break;
      case 'splash': N(t, 0.4, 0.3, 'bandpass', 2600, 0.6, null, { sweep: 700, a: 0.02 }); break;
      case 'drift': N(t, 0.3, 0.26, 'bandpass', 700, 1, null, { sweep: 3800 }); T(t, 220, 0.25, 'sawtooth', 0.14, null, { slide: 660, cut: 1800 }); break;
      case 'warn': T(t, 740, 0.09, 'square', 0.12, null, { cut: 2000 }); break;
      case 'rival': T(t, 196, 0.28, 'sawtooth', 0.2, null, { cut: 1400 }); T(t + 0.14, 233, 0.4, 'sawtooth', 0.2, null, { cut: 1400, echo: true }); break;
      case 'win': [0, 4, 7, 12].forEach((n, i) => T(t + i * 0.09, hz(67 + n), 0.3, 'square', 0.14, null, { cut: 2600, echo: true })); break;
      case 'medal': [0, 7, 12, 19].forEach((n, i) => T(t + i * 0.06, hz(76 + n), 0.25, 'sine', 0.16, null, { echo: true })); break;
      case 'horn': T(t, 392, 0.3, 'square', 0.12, null, { cut: 1500 }); T(t, 494, 0.3, 'square', 0.12, null, { cut: 1500 }); break;
      case 'sirenHi': T(t, 880, 0.4, 'square', 0.13 * ((opt && opt.vol) || 1), null, { cut: 2200, a: 0.03, r: 0.1 }); T(t, 884, 0.4, 'sawtooth', 0.07 * ((opt && opt.vol) || 1), null, { cut: 1800, a: 0.03 }); break;
      case 'sirenLo': T(t, 660, 0.4, 'square', 0.13 * ((opt && opt.vol) || 1), null, { cut: 2200, a: 0.03, r: 0.1 }); T(t, 663, 0.4, 'sawtooth', 0.07 * ((opt && opt.vol) || 1), null, { cut: 1800, a: 0.03 }); break;
      case 'cheer': N(t, 2.2, 0.26, 'bandpass', 1300, 0.5, null, { a: 0.5, sweep: 1900 }); N(t + 0.2, 1.8, 0.14, 'bandpass', 2600, 0.8, null, { a: 0.6 }); break;
      case 'blow': N(t, 0.32, 0.2, 'highpass', 2800, 0.7, null, { sweep: 7000 }); break;
      case 'tick': T(t, 1900, 0.02, 'square', 0.06, null, { cut: 4000 }); break;
      case 'rumble': N(t, 0.07, 0.22, 'lowpass', 300, 0.8); break;
      default: break;
    }
  }

  /* ---- music ----------------------------------------------------------------------- */
  play(name) {
    if (!SONGS[name]) return;
    if (!this.ok()) { this.pending = name; return; }
    if (this.songName === name && this.song) return;
    this.stopMusic();
    const def = SONGS[name], rnd = seeded(def.lead * 7919 + 13);
    // a four-bar lead phrase; bars repeat as A A' B A so the tune is easy to hold on to
    const phrase = [];
    for (let b = 0; b < 4; b++) {
      const bar = []; let pos = 0, deg = [0, 2, 4][Math.floor(rnd() * 3)] + 7;
      while (pos < 16) {
        const len = [2, 2, 3, 4, 6][Math.floor(rnd() * 5)];
        if (rnd() < 0.82) bar.push([pos, Math.min(len, 16 - pos), deg]);
        deg = clamp(deg + [-2, -1, -1, 1, 1, 2, 3][Math.floor(rnd() * 7)], 4, 13);
        pos += len;
      }
      phrase.push(bar);
    }
    this.song = { def, phrase, step: 0, next: this.ctx.currentTime + 0.08, len: 60 / def.bpm / 4 };
    this.songName = name;
    this.delay.delayTime.setTargetAtTime(this.song.len * 3, this.ctx.currentTime, 0.05);
    this.duck.gain.cancelScheduledValues(this.ctx.currentTime); this.duck.gain.setValueAtTime(1, this.ctx.currentTime);
    this.drumBus.gain.setValueAtTime(1, this.ctx.currentTime);
  }
  stopMusic() {
    this.pending = null;
    if (!this.song || !this.ctx) { this.song = null; this.songName = ''; return; }
    const t = this.ctx.currentTime;
    // let what is already scheduled fade under a quick dip rather than cutting dead
    this.duck.gain.cancelScheduledValues(t); this.duck.gain.setTargetAtTime(0, t, 0.05); this.duck.gain.setTargetAtTime(1, t + 0.45, 0.02);
    this.drumBus.gain.setTargetAtTime(0, t, 0.05); this.drumBus.gain.setTargetAtTime(1, t + 0.45, 0.02);
    this.song = null; this.songName = '';
  }
  /** Keeps a quarter second of music scheduled ahead of the clock. */
  tick() {
    const s = this.song;
    if (!s || !this.ok()) return;
    const now = this.ctx.currentTime;
    if (s.next < now - 0.5) s.next = now + 0.05;
    let guard = 0;
    while (s.next < now + 0.25 && guard++ < 32) {
      this.step(s, s.step, s.next);
      s.next += s.len; s.step++;
      if (!s.def.loop && s.step >= (s.def.bars || 4) * 16) { this.song = null; this.songName = ''; return; }
    }
  }
  degree(def, d, oct) {
    const m = MODES[def.mode], n = ((d % 7) + 7) % 7;
    return def.root + m[n] + 12 * (Math.floor(d / 7) + (oct || 0));
  }
  step(s, n, t) {
    const def = s.def, bar = Math.floor(n / 16), i = n % 16, loop = def.loop;
    const section = loop ? Math.floor(bar / 8) % 4 : 1;          // 0 intro groove, 1 and 2 with the lead, 3 a breakdown
    const chord = def.prog[bar % def.prog.length];
    const D = DRUMS[def.drums], full = section !== 3 || bar % 8 >= 6;
    const mb = this.duck, db = this.drumBus;
    // drums
    if (full && D.k[i] === 'x') {
      this.tone(t, 150, 0.2, 'sine', 0.8, db, { slide: 42, a: 0.002 });
      this.noise(t, 0.02, 0.2, 'highpass', 3000, 0.7, db);
      this.duck.gain.setValueAtTime(0.5, t); this.duck.gain.setTargetAtTime(1, t + 0.03, 0.09);
    }
    if (full && D.s[i] === 'x') { this.noise(t, 0.2, 0.42, 'bandpass', 1900, 0.8, db); this.tone(t, 210, 0.12, 'triangle', 0.3, db, { slide: 150 }); this.noise(t, 0.3, 0.1, 'highpass', 5000, 0.6, db); }
    if (D.h[i] === 'x' && (full || i % 4 === 2)) this.noise(t, 0.035, 0.12 + (i % 4 === 2 ? 0.06 : 0), 'highpass', 8000, 0.8, db);
    if (D.o[i] === 'x' && full) this.noise(t, 0.16, 0.12, 'highpass', 7000, 0.8, db);
    if (loop && i === 0 && bar % 8 === 0 && bar > 0) this.noise(t, 1.4, 0.16, 'highpass', 4000, 0.6, db, { a: 0.005 });   // crash into each section
    if (loop && bar % 8 === 7 && i >= 12 && section !== 3) this.noise(t, 0.08, 0.3, 'bandpass', 1500 + i * 120, 1, db);   // fill
    // bass
    const bp = BASS[def.bass][i];
    if (bp !== '.' && (section !== 3 || i % 8 === 0)) {
      const m = this.degree(def, chord, bp === 'h' ? 1 : 0);
      this.tone(t, hz(m), s.len * 1.7, 'sawtooth', 0.34, mb, { cut: 180 + def.cut * 0.45, cutTo: 160, q: 3, a: 0.004, r: 0.04 });
      this.tone(t, hz(m - 12), s.len * 1.7, 'sine', 0.3, mb, { a: 0.004, r: 0.04 });
    }
    // pad: one soft chord per bar
    if (i === 0) {
      const dur = s.len * 16;
      for (const k of [0, 2, 4, 6]) {
        const f = hz(this.degree(def, chord + k, 1));
        for (const det of [-9, 8]) this.tone(t, f, dur, 'sawtooth', section === 3 ? 0.06 : 0.04, mb, { cut: def.cut * 0.55, a: 0.25, r: 0.5, detune: det });
      }
    }
    // arpeggio
    if (def.arp !== 'none' && (section > 0 || bar % 8 >= 4)) {
      const pat = { up: [0, 2, 4, 7], updown: [0, 2, 4, 7, 4, 2], wide: [0, 4, 7, 9, 7, 4, 2, 4] }[def.arp];
      const on = def.arp === 'wide' ? true : i % 2 === 0 || section >= 2;
      if (on) {
        const m = this.degree(def, chord + pat[(def.arp === 'wide' ? i : Math.floor(i / (section >= 2 ? 1 : 2))) % pat.length], 2);
        this.tone(t, hz(m), s.len * 0.9, 'square', 0.075, mb, { cut: def.cut, cutTo: 500, q: 2, decay: 0.05, sus: 0.3, echo: true });
      }
    }
    // lead
    if (section === 1 || section === 2 || !loop) {
      const pb = [0, 1, 2, 0][bar % 4], shift = bar % 4 === 1 ? 1 : 0;
      for (const [pos, len, deg] of s.phrase[pb]) {
        if (pos !== i) continue;
        const f = hz(this.degree(def, chord + deg + shift - 7, 3) - (section === 2 ? 0 : 0));
        const dur = len * s.len * 0.95;
        this.tone(t, f, dur, 'sawtooth', 0.11, mb, { cut: def.cut * 1.5, q: 1.5, a: 0.012, r: 0.08, decay: 0.2, sus: 0.7, echo: true, detune: -6 });
        this.tone(t, f, dur, 'triangle', 0.13, mb, { a: 0.012, r: 0.08, detune: 6 });
        if (section === 2) this.tone(t, f * 2, dur, 'sine', 0.04, mb, { a: 0.02, r: 0.08, echo: true });
      }
    }
  }
}

const chip = new Chip();
