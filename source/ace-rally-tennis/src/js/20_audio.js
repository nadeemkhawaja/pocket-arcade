/* ==========================================================================
   Audio: synthesized racket and court sounds, crowd, music, umpire voice
   ========================================================================== */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.voice = null;
    this.musicOn = false;
    this.speechQueue = [];
    this.lastHitAt = 0;
    if (window.speechSynthesis) {
      const pickVoice = () => { this.voice = this.chooseVoice(); };
      pickVoice();
      try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { /* older browsers */ }
    }
  }

  ok() { return !!(this.ctx && this.ctx.state === 'running'); }

  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { this.ctx = new AC(); }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -16; this.comp.knee.value = 8; this.comp.ratio.value = 3.2;
      this.comp.attack.value = 0.003; this.comp.release.value = 0.22;
      this.master.connect(this.comp); this.comp.connect(c.destination);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.gain.value = 0; this.musicBus.connect(this.master);
      this.crowdBus = c.createGain(); this.crowdBus.gain.value = 0; this.crowdBus.connect(this.master);
      this.noise = this.makeNoise(2.5);
      this.startCrowdBed();
      setTimeout(() => {
        this.applauseBig = this.makeApplause(4.2, 1.0);
        this.applauseSoft = this.makeApplause(2.6, 0.42);
      }, 30);
      this.applySettings();
      if (this.musicOn) this.startMusic();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (!this.speechPrimed && window.speechSynthesis) {
      this.speechPrimed = true;
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
    }
  }

  applySettings() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.mute ? 0 : 0.9, t, 0.04);
    if (settings.mute) this.hush();
    this.sfxBus.gain.setTargetAtTime(settings.sfx ? 1 : 0, t, 0.05);
    this.musicBus.gain.setTargetAtTime(settings.music && this.musicOn ? 0.34 : 0, t, 0.3);
    if (!settings.voice && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  }

  /* ---- building blocks ---------------------------------------------------- */
  makeNoise(seconds) {
    const c = this.ctx, len = Math.floor(seconds * c.sampleRate);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  makeApplause(seconds, density) {
    const c = this.ctx, sr = c.sampleRate, len = Math.floor(seconds * sr);
    const buf = c.createBuffer(2, len, sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const claps = Math.floor(density * 560 * seconds);
    for (let k = 0; k < claps; k++) {
      // claps cluster early and thin out
      const u = Math.pow(Math.random(), 1.35);
      const start = Math.floor(u * (len - sr * 0.03));
      const amp = rand(0.25, 1) * (1 - u * 0.55);
      const decay = rand(0.0018, 0.0055) * sr;
      const bright = rand(0.25, 0.75);
      const pan = Math.random();
      const n = Math.floor(decay * 5);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const s = (Math.random() * 2 - 1) * amp * Math.exp(-i / decay);
        y += bright * (s - y);
        const v = s - y * 0.6;
        const j = start + i;
        if (j >= len) break;
        L[j] += v * (1 - pan * 0.7);
        R[j] += v * (0.3 + pan * 0.7);
      }
    }
    let peak = 0.0001;
    for (let i = 0; i < len; i++) {
      const tt = i / sr;
      const env = Math.min(1, tt / 0.12) * (tt > seconds - 1.6 ? Math.max(0, (seconds - tt) / 1.6) : 1);
      L[i] *= env; R[i] *= env;
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    }
    const g = 0.55 / peak;
    for (let i = 0; i < len; i++) { L[i] *= g; R[i] *= g; }
    return buf;
  }

  out(gain, pan) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.value = gain;
    if (c.createStereoPanner && pan) {
      const p = c.createStereoPanner();
      p.pan.value = clamp(pan, -0.85, 0.85);
      g.connect(p); p.connect(this.sfxBus);
    } else g.connect(this.sfxBus);
    return g;
  }

  env(param, t, peak, attack, decay) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  tone(type, f0, f1, t, dur, peak, dest, attack) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9);
    const g = c.createGain();
    this.env(g.gain, t, peak, attack || 0.004, dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  burst(t, dur, peak, type, freq, q, dest, attack) {
    const c = this.ctx;
    const n = c.createBufferSource();
    n.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    this.env(g.gain, t, peak, attack || 0.002, dur);
    n.connect(f); f.connect(g); g.connect(dest);
    n.start(t, Math.random() * Math.max(0, 2.35 - dur)); n.stop(t + dur + 0.05);
    return { n, f, g };
  }

  /* ---- game sounds -------------------------------------------------------- */
  hit(power, x, far, kind) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const p = clamp(power, 0, 1);
    const o = this.out((0.5 + p * 0.5) * (far ? 0.62 : 1), x / 9);
    const body = kind === 'volley' ? 300 : kind === 'smash' ? 230 : 260;
    this.tone('sine', body + p * 70, 105, t, 0.11, 0.95, o, 0.003);
    this.tone('triangle', 900 + Math.random() * 180 + p * 120, 640, t, 0.055, 0.22 + p * 0.1, o, 0.002);
    this.burst(t, 0.04 + p * 0.03, 0.85, 'bandpass', 2100 + p * 1500, 0.8, o);
    if (p > 0.72) this.burst(t + 0.01, 0.16, 0.18, 'bandpass', 900, 0.7, o, 0.03);
  }

  bounce(strength, x, far, surface) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const s = clamp(strength, 0.1, 1);
    const o = this.out(0.55 * s * (far ? 0.6 : 1), x / 9);
    if (surface === 'clay') {
      this.tone('sine', 150, 80, t, 0.07, 0.6, o);
      this.burst(t, 0.09, 0.45, 'lowpass', 1300, 0.6, o);
    } else if (surface === 'grass') {
      this.tone('sine', 140, 75, t, 0.06, 0.55, o);
      this.burst(t, 0.05, 0.25, 'lowpass', 700, 0.5, o);
    } else {
      this.tone('sine', 175, 95, t, 0.06, 0.75, o);
      this.burst(t, 0.035, 0.55, 'bandpass', 1500, 0.9, o);
    }
  }

  netHit(x) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const o = this.out(0.8, x / 9);
    this.burst(t, 0.28, 0.6, 'lowpass', 520, 0.8, o, 0.006);
    this.tone('triangle', 210, 150, t, 0.12, 0.25, o);
    for (let i = 1; i < 4; i++) this.burst(t + i * 0.045, 0.05, 0.22 / i, 'bandpass', 900, 1.2, o);
  }

  netCord(x) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const o = this.out(0.8, x / 9);
    this.tone('triangle', 520, 380, t, 0.08, 0.4, o);
    this.burst(t, 0.12, 0.35, 'bandpass', 1200, 1.4, o);
  }

  whoosh(power, x) {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    const o = this.out(0.32 + power * 0.25, x / 9);
    const { f } = this.burst(t, 0.22, 0.7, 'bandpass', 400, 1.6, o, 0.09);
    f.frequency.setValueAtTime(380, t);
    f.frequency.exponentialRampToValueAtTime(1600, t + 0.18);
  }

  toss() {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    this.burst(t, 0.06, 0.12, 'bandpass', 700, 0.8, this.out(0.5, 0));
  }

  ui(kind) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const o = this.out(0.35, 0);
    if (kind === 'move') this.tone('sine', 880, 880, t, 0.05, 0.25, o);
    else if (kind === 'back') { this.tone('sine', 660, 520, t, 0.08, 0.3, o); }
    else if (kind === 'toggle') { this.tone('triangle', 740, 740, t, 0.05, 0.3, o); this.tone('triangle', 988, 988, t + 0.05, 0.06, 0.3, o); }
    else { this.tone('sine', 784, 784, t, 0.07, 0.35, o); this.tone('sine', 1175, 1175, t + 0.06, 0.1, 0.3, o); }
  }

  chime(good) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const o = this.out(0.32, 0);
    const notes = good ? [784, 1047] : [622, 523];
    notes.forEach((f, i) => {
      this.tone('sine', f, f, t + i * 0.11, 0.42, 0.5, o, 0.006);
      this.tone('triangle', f * 2, f * 2, t + i * 0.11, 0.18, 0.08, o, 0.006);
    });
  }

  fanfare(win) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const o = this.out(0.38, 0);
    const seq = win
      ? [[523, 0, 0.14], [659, 0.13, 0.14], [784, 0.26, 0.14], [1047, 0.39, 0.5], [988, 0.62, 0.12], [1047, 0.74, 0.8]]
      : [[523, 0, 0.25], [494, 0.26, 0.25], [466, 0.52, 0.25], [440, 0.78, 0.8]];
    seq.forEach(([f, d, len]) => {
      this.tone('square', f, f, t + d, len, 0.12, o, 0.01);
      this.tone('sine', f, f, t + d, len + 0.1, 0.4, o, 0.01);
      if (win) this.tone('sine', f / 2, f / 2, t + d, len, 0.25, o, 0.01);
    });
  }

  applause(intensity) {
    if (!this.ok()) return;
    const buf = intensity > 0.6 ? this.applauseBig : this.applauseSoft;
    if (!buf) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = buf;
    s.playbackRate.value = rand(0.94, 1.06);
    const g = c.createGain();
    g.gain.value = 0.45 + intensity * 0.55;
    s.connect(g); g.connect(this.crowdOut());
    s.start(t);
    if (intensity > 0.8) this.cheer(t);
  }

  crowdOut() {
    if (!this.crowdFx) {
      this.crowdFx = this.ctx.createGain();
      this.crowdFx.gain.value = 0.75;
      this.crowdFx.connect(this.sfxBus);
    }
    return this.crowdFx;
  }

  cheer(t0) {
    const c = this.ctx, t = t0 || c.currentTime;
    const dest = c.createGain();
    dest.gain.value = 0.5;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
    dest.connect(f); f.connect(this.crowdOut());
    for (let i = 0; i < 10; i++) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const base = rand(170, 340);
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * rand(1.08, 1.25), t + 0.35);
      o.frequency.linearRampToValueAtTime(base * rand(0.9, 1.0), t + 1.5);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03, t + rand(0.08, 0.25));
      g.gain.exponentialRampToValueAtTime(0.0001, t + rand(1.1, 1.8));
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + 2);
    }
    this.burst(t, 1.4, 0.35, 'bandpass', 1100, 0.5, dest, 0.15);
  }

  ooh() {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    const dest = c.createGain(); dest.gain.value = 0.55;
    const f1 = c.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 900; f1.Q.value = 1.5;
    dest.connect(f1); f1.connect(this.crowdOut());
    for (let i = 0; i < 9; i++) {
      const o = c.createOscillator();
      o.type = 'triangle';
      const base = rand(190, 320);
      o.frequency.setValueAtTime(base * 1.12, t);
      o.frequency.exponentialRampToValueAtTime(base * 0.82, t + 0.9);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      o.connect(g); g.connect(dest);
      o.start(t + Math.random() * 0.06); o.stop(t + 1.2);
    }
  }

  startCrowdBed() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
    const bp = c.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 420; bp.gain.value = 6; bp.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = 0.22;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13;
    const lfoG = c.createGain(); lfoG.gain.value = 0.08;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(lp); lp.connect(bp); bp.connect(g); g.connect(this.crowdBus);
    src.start(); lfo.start();
  }

  setCrowd(level) {
    if (!this.ctx) return;
    this.crowdBus.gain.setTargetAtTime(settings.sfx ? level : 0, this.ctx.currentTime, 0.6);
  }

  /* ---- music: a breezy loop in F major ----------------------------------- */
  startMusic() {
    this.musicOn = true;
    clearTimeout(this.musicStopTimer);
    if (!this.ctx) return;
    this.applySettings();
    if (this.seqTimer) return;
    const bpm = 112, spb = 60 / bpm, step = spb / 2; // eighth notes
    const c = this.ctx;
    this.seqStep = 0;
    this.seqNext = c.currentTime + 0.1;
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
    // chords per bar (MIDI)
    const chords = [
      [53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [60, 64, 67, 70],
      [62, 65, 69, 72], [55, 58, 62, 65], [58, 62, 65, 69], [60, 64, 67, 70]
    ];
    const roots = [41, 45, 46, 48, 50, 43, 46, 48];
    // melody: [bar, eighth, midi, length in eighths]
    const mel = [
      [0, 0, 69, 2], [0, 2, 72, 2], [0, 4, 77, 2], [0, 6, 76, 1], [0, 7, 72, 1],
      [1, 0, 76, 3], [1, 3, 72, 1], [1, 4, 69, 2], [1, 6, 67, 2],
      [2, 0, 65, 2], [2, 2, 69, 2], [2, 4, 74, 2], [2, 6, 72, 1], [2, 7, 69, 1],
      [3, 0, 67, 4], [3, 4, 64, 2], [3, 6, 67, 2],
      [4, 0, 69, 2], [4, 2, 72, 2], [4, 4, 77, 2], [4, 6, 81, 1], [4, 7, 79, 1],
      [5, 0, 77, 2], [5, 2, 74, 2], [5, 4, 70, 2], [5, 6, 74, 2],
      [6, 0, 72, 2], [6, 2, 69, 2], [6, 4, 65, 2], [6, 6, 67, 1], [6, 7, 69, 1],
      [7, 0, 67, 6], [7, 6, 72, 2]
    ];
    const melMap = {};
    mel.forEach(([b, e, m, l]) => { melMap[b * 8 + e] = [m, l]; });

    const pluck = (f, t, len, vol) => {
      const o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = 'sine'; o2.type = 'sine';
      o1.frequency.value = f; o2.frequency.value = f * 4;
      const g = c.createGain(), g2 = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.9, len * 1.4));
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.003);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o1.connect(g); o2.connect(g2); g.connect(this.musicBus); g2.connect(this.musicBus);
      o1.start(t); o2.start(t); o1.stop(t + 1); o2.stop(t + 0.2);
    };
    const keys = (fs, t, vol) => {
      fs.forEach((f) => {
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.4);
      });
    };
    const bass = (f, t, len) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + len + 0.05);
    };
    const kick = (t) => {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      const g = c.createGain(); this.env(g.gain, t, 0.5, 0.004, 0.16);
      o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.2);
    };
    const shaker = (t, v) => {
      const n = c.createBufferSource(); n.buffer = this.noise;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
      const g = c.createGain(); this.env(g.gain, t, v, 0.004, 0.05);
      n.connect(f); f.connect(g); g.connect(this.musicBus); n.start(t, Math.random()); n.stop(t + 0.08);
    };
    const rim = (t) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 1700;
      const g = c.createGain(); this.env(g.gain, t, 0.07, 0.002, 0.04);
      o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.07);
    };

    const tick = () => {
      if (!this.ctx) return;
      while (this.seqNext < c.currentTime + 0.14) {
        const s = this.seqStep % 64;
        const bar = Math.floor(s / 8), e = s % 8, t = this.seqNext;
        if (e === 0) bass(midi(roots[bar]), t, step * 2.6);
        if (e === 3) bass(midi(roots[bar] + 7), t, step * 0.9);
        if (e === 4) bass(midi(roots[bar] + 12), t, step * 1.8);
        if (e === 2 || e === 5 || e === 7) keys(chords[bar].map(midi), t, 0.035);
        if (e === 0 || e === 4) kick(t);
        if (e === 2 || e === 6) rim(t);
        shaker(t, e % 2 ? 0.025 : 0.04);
        const m = melMap[s];
        if (m) pluck(midi(m[0]), t, m[1] * step, 0.13);
        this.seqNext += step;
        this.seqStep++;
      }
    };
    tick();
    this.seqTimer = setInterval(tick, 40);
  }

  stopMusic() {
    this.musicOn = false;
    if (!this.ctx) return;
    this.applySettings();
    clearTimeout(this.musicStopTimer);
    this.musicStopTimer = setTimeout(() => {
      if (!this.musicOn && this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; }
    }, 1400);
  }

  /* ---- umpire voice -------------------------------------------------------- */
  chooseVoice() {
    if (!window.speechSynthesis) return null;
    let voices = [];
    try { voices = speechSynthesis.getVoices() || []; } catch (e) { return null; }
    if (!voices.length) return null;
    const en = voices.filter((v) => /^en/i.test(v.lang));
    const prefs = [/Daniel/i, /Google UK English Male/i, /Arthur/i, /Oliver/i, /George/i, /Ryan/i, /UK English/i, /en-GB/i];
    for (const re of prefs) {
      const v = en.find((x) => re.test(x.name) || re.test(x.lang));
      if (v) return v;
    }
    return en.find((v) => /US/i.test(v.lang)) || en[0] || null;
  }

  say(text, delay) {
    if (!settings.voice || settings.mute || !window.speechSynthesis || !text) return;
    const speak = () => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (!this.voice) this.voice = this.chooseVoice();
        if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-GB';
        u.rate = 1.02; u.pitch = 0.92; u.volume = 0.95;
        speechSynthesis.speak(u);
      } catch (e) { /* speech unavailable */ }
    };
    if (delay) {
      clearTimeout(this.sayTimer);
      this.sayTimer = setTimeout(speak, delay * 1000);
    } else speak();
  }

  hush() {
    clearTimeout(this.sayTimer);
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  }
}

const audio = new AudioEngine();
