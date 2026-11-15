/* ==========================================================================
   Sound. Everything is generated in the browser: dry, weighty body hits,
   swings, grabs and falls, and a street-funk soundtrack sequenced in code
   (drums, slap bass, stabs, pad and lead).
   ========================================================================== */

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MODES = { min: [0, 2, 3, 5, 7, 8, 10], maj: [0, 2, 4, 5, 7, 9, 11], dor: [0, 2, 3, 5, 7, 9, 10], mix: [0, 2, 4, 5, 7, 9, 10] };

/* bpm, root note, mode, one chord degree per bar, and the character of each part */
const SONGS = {
  title: { bpm: 96, root: 45, mode: 'dor', prog: [0, 3, 0, 4, 0, 3, 5, 4], drums: 'half', bass: 'slap', arp: 'stab', lead: 13, cut: 1700, loop: true },
  market: { bpm: 112, root: 40, mode: 'dor', prog: [0, 0, 3, 3, 0, 0, 4, 6], drums: 'funk', bass: 'slap', arp: 'stab', lead: 29, cut: 2000, loop: true },
  yard: { bpm: 120, root: 38, mode: 'min', prog: [0, 6, 5, 4, 0, 6, 3, 4], drums: 'rock', bass: 'drive', arp: 'stab', lead: 41, cut: 1800, loop: true },
  foundry: { bpm: 128, root: 41, mode: 'min', prog: [0, 0, 5, 6, 0, 3, 5, 4], drums: 'rock', bass: 'drive', arp: 'up', lead: 59, cut: 1500, loop: true },
  tower: { bpm: 132, root: 43, mode: 'dor', prog: [0, 5, 3, 4, 0, 5, 6, 4], drums: 'funk', bass: 'slap', arp: 'updown', lead: 71, cut: 2300, loop: true },
  boss: { bpm: 140, root: 39, mode: 'min', prog: [0, 1, 0, 6, 0, 1, 5, 4], drums: 'break', bass: 'drive', arp: 'up', lead: 89, cut: 1900, loop: true },
  clear: { bpm: 118, root: 48, mode: 'maj', prog: [0, 3, 4, 0], drums: 'none', bass: 'slap', arp: 'up', lead: 7, cut: 2600, loop: false, bars: 4 },
  over: { bpm: 82, root: 45, mode: 'min', prog: [0, 5, 3, 0], drums: 'none', bass: 'slap', arp: 'none', lead: 11, cut: 1200, loop: false, bars: 4 },
  ending: { bpm: 104, root: 48, mode: 'mix', prog: [0, 6, 3, 4, 0, 6, 3, 4], drums: 'funk', bass: 'slap', arp: 'updown', lead: 101, cut: 2400, loop: true }
};

const DRUMS = {
  funk: { k: 'x..x..x...x..x..', s: '....x..x....x...', h: 'xxxxxxxxxxxxxxxx', o: '......x.......x.' },
  rock: { k: 'x...x.x...x.x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
  half: { k: 'x.........x.....', s: '........x.......', h: 'x.x.x.x.x.x.x.x.', o: '................' },
  break: { k: 'x.....x...x.....', s: '....x.......x..x', h: 'x.xxx.xxx.xxx.xx', o: '................' },
  none: { k: '................', s: '................', h: '................', o: '................' }
};
const BASS = { slap: 'l..lh.l.l..l.hl.', drive: 'llllllllllllllll', pulse: 'l..l..l.l..l..l.' };

class Chip {
  constructor() { this.ctx = null; this.song = null; this.songName = ''; this.mute = false; }
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
    // noise source shared by drums and effects
    const nlen = c.sampleRate * 2; this.noiseBuf = c.createBuffer(1, nlen, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, on = settings.muted ? 0 : 1;
    this.sfxBus.gain.setTargetAtTime(on * settings.sfx * 0.9, t, 0.05);
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

  /* ---- effects --------------------------------------------------------------------- */
  /**
   * Effects. Hits are built as a body would sound: a low, short thump plus a
   * narrow slap of cloth and skin. Nothing bright or cracking, so a punch never
   * reads as a gunshot. opt.v scales the level, opt.p nudges the pitch.
   */
  sfx(name, opt) {
    if (!this.ok() || settings.muted) return;
    const t = this.ctx.currentTime, T = (...a) => this.tone(...a), N = (...a) => this.noise(...a);
    const v = (opt && opt.v) || 1, pk = ((opt && opt.p) || 1) * (0.93 + Math.random() * 0.14);
    const thump = (f0, f1, dur, lvl) => T(t, f0 * pk, dur, 'sine', lvl * v, null, { slide: f1 * pk, a: 0.006, r: dur * 0.6 });
    const slap = (fc, dur, lvl, d) => N(t + (d || 0.003), dur, lvl * v, 'bandpass', fc * pk, 1.4);
    switch (name) {
      case 'move': T(t, 880, 0.05, 'triangle', 0.16, null, { slide: 1180 }); break;
      case 'select': T(t, 660, 0.07, 'triangle', 0.2); T(t + 0.06, 990, 0.12, 'triangle', 0.2, null, { echo: true }); break;
      case 'back': T(t, 520, 0.09, 'triangle', 0.16, null, { slide: 330 }); break;
      case 'swing': N(t, 0.13, 0.42 * v, 'bandpass', 700 * pk, 1.0, null, { sweep: 2200 * pk, a: 0.03 }); break;
      case 'swingH': N(t, 0.22, 0.5 * v, 'bandpass', 380 * pk, 1, null, { sweep: 1300 * pk, a: 0.05 }); break;
      case 'punch': thump(170, 64, 0.085, 0.5); slap(420, 0.045, 0.3); break;
      case 'kick': thump(130, 48, 0.12, 0.56); slap(330, 0.06, 0.32); break;
      case 'heavy': thump(110, 38, 0.2, 0.64); slap(260, 0.09, 0.36); N(t, 0.25, 0.1 * v, 'lowpass', 500, 0.7); break;
      case 'block': T(t, 260, 0.06, 'triangle', 0.2 * v, null, { slide: 180 }); slap(700, 0.04, 0.2); break;
      case 'metal': thump(150, 70, 0.08, 0.4); T(t, 1240 * pk, 0.45, 'triangle', 0.12 * v, null, { decay: 0.1, sus: 0.2 }); T(t, 1860 * pk, 0.32, 'sine', 0.07 * v, null, { decay: 0.08 }); break;
      case 'wood': thump(220, 120, 0.07, 0.4); slap(900, 0.05, 0.3); break;
      case 'slash': N(t, 0.16, 0.22 * v, 'highpass', 2600, 0.8, null, { sweep: 6000 }); thump(200, 90, 0.05, 0.25); break;
      case 'grab': slap(600, 0.08, 0.3); T(t, 160, 0.08, 'sine', 0.25 * v, null, { slide: 120 }); break;
      case 'throw': N(t, 0.32, 0.55 * v, 'bandpass', 360, 1, null, { sweep: 1300, a: 0.06 }); T(t, 180, 0.2, 'sine', 0.2 * v, null, { slide: 90 }); break;
      case 'fall': thump(95, 34, 0.26, 0.7); N(t, 0.3, 0.2 * v, 'lowpass', 420, 0.8); slap(220, 0.12, 0.2, 0.02); break;
      case 'land': thump(120, 50, 0.08, 0.3); break;
      case 'step': thump(160, 90, 0.03, 0.08); break;
      case 'crate': thump(140, 60, 0.12, 0.5); for (let i = 0; i < 4; i++) N(t + i * 0.03 + Math.random() * 0.02, 0.06, 0.2 * v, 'bandpass', 1000 + Math.random() * 900, 2); break;
      case 'glass': for (let i = 0; i < 6; i++) T(t + i * 0.025 + Math.random() * 0.02, 2400 + Math.random() * 2400, 0.12, 'sine', 0.06 * v, null, { decay: 0.03 }); N(t, 0.2, 0.12 * v, 'highpass', 5000, 0.7); break;
      case 'knife': N(t, 0.25, 0.45 * v, 'bandpass', 1500, 2, null, { sweep: 800 }); break;
      case 'food': [0, 4, 7].forEach((n, i) => T(t + i * 0.06, hz(76 + n), 0.14, 'triangle', 0.18, null, { echo: true })); break;
      case 'pickup': T(t, 520, 0.06, 'square', 0.12, null, { cut: 2400 }); T(t + 0.05, 780, 0.1, 'square', 0.12, null, { cut: 2400 }); break;
      case 'oneup': [0, 4, 7, 12, 16].forEach((n, i) => T(t + i * 0.07, hz(72 + n), 0.22, 'triangle', 0.2, null, { echo: true, decay: 0.08 })); break;
      case 'special': N(t, 0.6, 0.3, 'bandpass', 300, 1, null, { sweep: 3400, a: 0.05 }); T(t, 90, 0.5, 'sawtooth', 0.18, null, { slide: 260, cut: 900 }); break;
      case 'power': [0, 7, 12].forEach((n, i) => T(t + i * 0.05, hz(64 + n), 0.3, 'sawtooth', 0.1, null, { cut: 2200, echo: true })); break;
      case 'hurt': T(t, 300 * pk, 0.14, 'sawtooth', 0.08 * v, null, { slide: 180 * pk, cut: 1200 }); break;
      case 'ko': thump(80, 30, 0.4, 0.6); T(t + 0.05, 220, 0.6, 'sawtooth', 0.12, null, { slide: 70, cut: 900 }); break;
      case 'roar': N(t, 0.9, 0.3, 'bandpass', 220, 1.5, null, { sweep: 120, a: 0.08 }); T(t, 70, 0.9, 'sawtooth', 0.2, null, { slide: 52, cut: 600 }); break;
      case 'go': [0, 7].forEach((n, i) => T(t + i * 0.1, hz(69 + n), 0.22, 'square', 0.14, null, { cut: 2200, echo: true })); break;
      case 'count': T(t, 440, 0.16, 'square', 0.16, null, { cut: 1800 }); break;
      case 'win': [0, 4, 7, 12].forEach((n, i) => T(t + i * 0.09, hz(67 + n), 0.3, 'square', 0.14, null, { cut: 2600, echo: true })); break;
      case 'medal': [0, 7, 12, 19].forEach((n, i) => T(t + i * 0.06, hz(76 + n), 0.25, 'sine', 0.16, null, { echo: true })); break;
      case 'join': [0, 5, 9].forEach((n, i) => T(t + i * 0.06, hz(70 + n), 0.2, 'triangle', 0.2, null, { echo: true })); break;
      case 'tick': T(t, 1900, 0.02, 'square', 0.06, null, { cut: 4000 }); break;
      case 'warn': T(t, 740, 0.09, 'square', 0.12, null, { cut: 2000 }); break;
      case 'train': N(t, 3, 0.2, 'lowpass', 300, 0.8, null, { a: 0.6 }); for (let i = 0; i < 8; i++) thump(90, 60, 0.05, 0.12 * (1 - Math.abs(i - 4) / 5)); break;
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
      const pl = def.bass === 'slap' ? 1.1 : 1.7;
      this.tone(t, hz(m), s.len * pl, def.bass === 'slap' ? 'square' : 'sawtooth', 0.32, mb, { cut: 240 + def.cut * (bp === 'h' ? 0.9 : 0.45), cutTo: 150, q: 3.5, a: 0.003, r: 0.04 });
      this.tone(t, hz(m - 12), s.len * pl, 'sine', 0.3, mb, { a: 0.004, r: 0.04 });
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
      if (def.arp === 'stab') {
        if ([2, 6, 10, 14].includes(i) && (i !== 14 || bar % 2)) for (const k of [0, 2, 4]) this.tone(t, hz(this.degree(def, chord + k, 2)), s.len * 0.7, 'square', 0.05, mb, { cut: def.cut * 1.2, cutTo: 700, q: 2, decay: 0.04, sus: 0.2 });
        return this.stepLead(s, def, chord, bar, i, t, section, mb, loop);
      }
      const pat = { up: [0, 2, 4, 7], updown: [0, 2, 4, 7, 4, 2], wide: [0, 4, 7, 9, 7, 4, 2, 4] }[def.arp];
      const on = def.arp === 'wide' ? true : i % 2 === 0 || section >= 2;
      if (on) {
        const m = this.degree(def, chord + pat[(def.arp === 'wide' ? i : Math.floor(i / (section >= 2 ? 1 : 2))) % pat.length], 2);
        this.tone(t, hz(m), s.len * 0.9, 'square', 0.075, mb, { cut: def.cut, cutTo: 500, q: 2, decay: 0.05, sus: 0.3, echo: true });
      }
    }
    this.stepLead(s, def, chord, bar, i, t, section, mb, loop);
  }
  stepLead(s, def, chord, bar, i, t, section, mb, loop) {
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
