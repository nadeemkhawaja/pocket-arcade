/* ==========================================================================
   Chip audio: pulse/triangle/noise synth, step sequencer, original music, SFX
   ========================================================================== */

const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(tok) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return 0;
  let n = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const oct = +m[3];
  const midi = 12 * (oct + 1) + n;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* Bass helper: roots per half bar -> eighth-note octave pattern */
function octBass(roots) {
  const out = [];
  for (const r of roots) {
    const m = /^([A-G][#b]?)(\d)$/.exec(r);
    const lo = r, hi = m[1] + (+m[2] + 1);
    out.push(lo, '.', hi, '.', lo, '.', hi, '.');
  }
  return out.join(' ');
}
function rep(s, n) { return Array(n).fill(s).join(' '); }
/* Driving sixteenth-note octave bass, one root per half bar */
function halfBass(roots) {
  return roots.map((r) => {
    const m = /^([A-G][#b]?)(\d)$/.exec(r);
    const hi = m[1] + (+m[2] + 1);
    return rep(r + ' ' + hi, 4);
  }).join(' ');
}

/* Sustained pad: one note per half bar */
function pad(notes) { return notes.map((n) => n + ' - - - - - - -').join(' '); }

/* All melodies are original, built on Chinese pentatonic modes. */
const SONGS = {
  title: {
    bpm: 112, loop: true,
    lead: 'A4 - - - C5 - D5 - E5 - - - G5 - E5 - | D5 - - - C5 - A4 - C5 - - - - - - - | A4 - - - C5 - D5 - E5 - - - A5 - G5 - | E5 - - - - - D5 - E5 - - - - - - - | ' +
      'G5 - - - A5 - G5 - E5 - D5 - C5 - D5 - | E5 - - - D5 - C5 - A4 - - - G4 - A4 - | C5 - D5 - E5 - G5 - A5 - G5 - E5 - D5 - | E5 - - - - - - - A4 - - - . . . .',
    harm: pad(['E4', 'E4', 'F4', 'G4', 'E4', 'E4', 'G4', 'G4', 'C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'C5']),
    arp: 'A3 . E4 . A4 . E4 . A3 . E4 . A4 . C5 . | F3 . C4 . F4 . C4 . G3 . D4 . G4 . D4 . | A3 . E4 . A4 . E4 . A3 . E4 . A4 . C5 . | E3 . B3 . E4 . B3 . E3 . B3 . E4 . G4 . | ' +
      'C4 . G4 . C5 . G4 . G3 . D4 . G4 . D4 . | A3 . E4 . A4 . E4 . E3 . B3 . E4 . B3 . | F3 . C4 . F4 . C4 . G3 . D4 . G4 . D4 . | A3 . E4 . A4 . E4 . A3 . . . . . . .',
    bass: octBass(['A1', 'A1', 'F1', 'G1', 'A1', 'A1', 'E1', 'E1', 'C2', 'G1', 'A1', 'E1', 'F1', 'G1', 'A1', 'A1']),
    drum: 'g . . . . . . . t . . . . . w . | t . . . w . . . t . . . w . w . | t . . . . . . . t . . . . . w . | t . . . w . . . t . t . w w w w | ' +
      't . . . w . . . t . . . w . . . | t . . . w . . . t . . . w . w . | t . w . t . w . t . w . t t w w | g . . . . . . . t . . . t t t t'
  },
  floorA: {
    bpm: 140, loop: true,
    lead: 'D5 - D5 F5 - D5 G5 - A5 - G5 F5 - D5 C5 - | D5 - - - A4 - - - C5 - D5 - - - - - | D5 - D5 F5 - D5 G5 - A5 - C6 A5 - G5 F5 - | G5 - - - F5 - D5 - F5 - - - - - - - | ' +
      'A5 - - - G5 - F5 - G5 - - - D5 - C5 - | D5 - - - C5 - A4 - C5 - - - - - - - | D5 - F5 - G5 - A5 - C6 - A5 - G5 - F5 - | D5 - - - - - - - D4 - - - . . . .',
    harm: pad(['A4', 'A4', 'G4', 'G4', 'F4', 'F4', 'G4', 'G4', 'A4', 'C5', 'D5', 'C5', 'F4', 'G4', 'A4', 'A4']),
    arp: rep('D4 . A4 . D5 . A4 .', 2) + ' ' + rep('C4 . G4 . C5 . G4 .', 2) + ' ' + rep('Bb3 . F4 . Bb4 . F4 .', 2) + ' ' + rep('C4 . G4 . C5 . G4 .', 2) + ' ' +
      rep('D4 . A4 . D5 . A4 .', 2) + ' ' + 'F4 . C5 . F5 . C5 . G3 . D4 . G4 . D4 .' + ' ' + rep('Bb3 . F4 . Bb4 . F4 .', 2) + ' ' + rep('D4 . A4 . D5 . A4 .', 2),
    bass: octBass(['D2', 'D2', 'C2', 'C2', 'Bb1', 'Bb1', 'C2', 'C2', 'D2', 'F2', 'G1', 'A1', 'Bb1', 'C2', 'D2', 'D2']),
    drum: rep('k . h . s . h k t . h . s . h w', 7) + ' t . t . s . t . s s t t s s s s'
  },
  floorB: {
    bpm: 128, loop: true,
    lead: 'E5 - - G5 - - A5 - B5 - A5 - G5 - E5 - | D5 - - - E5 - - - - - - - . . . . | E5 - - G5 - - A5 - D6 - B5 - A5 - G5 - | A5 - - - B5 - - - - - - - . . . . | ' +
      'D6 - - - B5 - A5 - G5 - - - A5 - B5 - | E5 - - - D5 - B4 - D5 - - - E5 - - - | G5 - A5 - B5 - D6 - E6 - D6 - B5 - A5 - | B5 - - - - - - - E5 - - - . . . .',
    harm: pad(['B4', 'B4', 'A4', 'G4', 'B4', 'B4', 'A4', 'F#4', 'G4', 'G4', 'D4', 'E4', 'G4', 'A4', 'B4', 'B4']),
    arp: rep('E4 . B4 . E5 . B4 .', 2) + ' ' + rep('D4 . A4 . D5 . A4 .', 2) + ' ' + rep('E4 . B4 . E5 . B4 .', 2) + ' ' + 'D4 . A4 . D5 . A4 . B3 . F#4 . B4 . F#4 .' + ' ' +
      rep('C4 . G4 . C5 . G4 .', 2) + ' ' + 'G3 . D4 . G4 . D4 . A3 . E4 . A4 . E4 .' + ' ' + 'C4 . G4 . C5 . G4 . D4 . A4 . D5 . A4 .' + ' ' + rep('E4 . B4 . E5 . B4 .', 2),
    bass: octBass(['E2', 'E2', 'D2', 'D2', 'E2', 'E2', 'D2', 'B1', 'C2', 'C2', 'G1', 'A1', 'C2', 'D2', 'E2', 'E2']),
    drum: rep('k . . w s . w . k . k w s . w w', 7) + ' t . . t s . t . s s s s t t t t'
  },
  summit: {
    bpm: 150, loop: true,
    lead: 'G4 - B4 - D5 - E5 - D5 - - B4 D5 - - - | E5 - G5 - A5 - G5 - E5 - D5 - - - - - | G4 - B4 - D5 - E5 - G5 - - E5 A5 - - - | B5 - - - A5 - G5 - A5 - - - - - - - | ' +
      'B5 - - - A5 - G5 - E5 - - - G5 - A5 - | D5 - - - E5 - G5 - E5 - - - - - - - | G5 - A5 - B5 - D6 - B5 - A5 - G5 - E5 - | G5 - - - - - - - G4 - - - . . . .',
    harm: pad(['D4', 'D4', 'E4', 'E4', 'D4', 'D4', 'F#4', 'F#4', 'G4', 'G4', 'E4', 'F#4', 'E4', 'F#4', 'D4', 'D4']),
    arp: rep('G3 . D4 . G4 . B4 .', 2) + ' ' + rep('C4 . G4 . C5 . E5 .', 2) + ' ' + rep('G3 . D4 . G4 . B4 .', 2) + ' ' + rep('D4 . A4 . D5 . F#5 .', 2) + ' ' +
      rep('E4 . B4 . E5 . G5 .', 2) + ' ' + 'C4 . G4 . C5 . E5 . D4 . A4 . D5 . F#5 .' + ' ' + 'C4 . G4 . C5 . E5 . D4 . A4 . D5 . F#5 .' + ' ' + rep('G3 . D4 . G4 . B4 .', 2),
    bass: halfBass(['G1', 'G1', 'C2', 'C2', 'G1', 'G1', 'D2', 'D2', 'E2', 'E2', 'C2', 'D2', 'C2', 'D2', 'G1', 'G1']),
    drum: rep('k . h . s . h k k . h t s . h h', 7) + ' t . t . s . t . t t s s t t s s'
  },
  boss: {
    bpm: 160, loop: true,
    lead: 'A4 - A4 - C5 - A4 - D5 - C5 - A4 - G4 - | A4 - - - E4 - - - G4 - A4 - - - - - | A4 - A4 - C5 - A4 - E5 - D5 - C5 - D5 - | E5 - - - G5 - E5 - D5 - - - - - - - | ' +
      'A5 - G5 - E5 - D5 - E5 - D5 - C5 - A4 - | G4 - - - A4 - - - C5 - D5 - E5 - - - | A5 - - - G5 - - - E5 - - - D5 - C5 - | D5 - - - E5 - - - A4 - - - - - - -',
    harm: pad(['E4', 'E4', 'D4', 'E4', 'E4', 'E4', 'G4', 'G4', 'C5', 'C5', 'G4', 'G4', 'E5', 'D5', 'B4', 'C5']),
    bass: halfBass(['A1', 'A1', 'G1', 'G1', 'A1', 'A1', 'C2', 'E1', 'F1', 'F1', 'G1', 'G1', 'A1', 'G1', 'E1', 'A1']),
    drum: rep('k h s h k k s h t h s h k t s s', 8)
  },
  final: {
    bpm: 168, loop: true,
    lead: 'D5 - - - F5 - - - G5 - A5 - - - F5 - | G5 - - - D5 - - - C5 - D5 - - - - - | D5 - - - F5 - - - A5 - C6 - - - A5 - | G5 - - - F5 - - - G5 - - - - - - - | ' +
      'A5 - C6 - D6 - C6 - A5 - G5 - F5 - G5 - | A5 - - - G5 - F5 - D5 - - - - - - - | F5 - G5 - A5 - C6 - D6 - - - C6 - A5 - | D6 - - - - - - - D5 - - - . . . .',
    harm: pad(['A4', 'A4', 'Bb4', 'A4', 'A4', 'C5', 'Bb4', 'Bb4', 'F5', 'E5', 'D5', 'C5', 'A4', 'C5', 'A4', 'A4']),
    bass: halfBass(['D2', 'D2', 'Bb1', 'Bb1', 'C2', 'C2', 'D2', 'D2', 'F1', 'F1', 'G1', 'A1', 'Bb1', 'C2', 'D2', 'D2']),
    drum: 'g . s k k . s . k . s k t t s s ' + rep('k . s k k . s . k . s k t t s s', 6) + ' t t s s t t s s t t t t s s s s'
  },
  clear: {
    bpm: 140, loop: false,
    lead: 'G4 - B4 - D5 - G5 - - - E5 - G5 - A5 - B5 - - - - - - - - - - - . . . .',
    harm: 'D4 - G4 - B4 - D5 - - - C5 - E5 - F#5 - G5 - - - - - - - - - - - . . . .',
    bass: 'G2 - - - - - - - C2 - - - D2 - - - G1 - - - - - - - - - - - . . . .',
    drum: 't . . . t . . . s . . . t . t t g . . . . . . . . . . . . . . .'
  },
  gameover: {
    bpm: 90, loop: false,
    lead: 'E5 - - - D5 - - - B4 - - - A4 - - - G4 - - - E4 - - - - - - - . . . .',
    harm: 'B4 - - - A4 - - - G4 - - - E4 - - - D4 - - - B3 - - - - - - - . . . .',
    bass: 'E2 - - - D2 - - - C2 - - - A1 - - - E1 - - - - - - - - - - - . . . .',
    drum: 't . . . . . . . t . . . . . . . g . . . . . . . . . . . . . . .'
  },
  start: {
    bpm: 150, loop: false,
    lead: 'A4 - C5 - D5 - E5 - - - A5 - - - - - . .',
    harm: 'E4 - G4 - A4 - C5 - - - E5 - - - - - . .',
    bass: 'A2 - - - - - - - - - A1 - - - - - . .',
    drum: 't . w . t . w . t t g . . . . . . .'
  },
  entry: {
    bpm: 120, loop: true,
    lead: 'C5 . E5 . G5 . E5 . A5 . G5 . E5 - - - | D5 . E5 . G5 . A5 . C6 . A5 . G5 - - - | C5 . E5 . G5 . E5 . D5 . C5 . A4 . C5 . | D5 . E5 . D5 . C5 . C5 - - - - - - -',
    harm: pad(['E4', 'F4', 'E4', 'E4', 'G4', 'F4', 'G4', 'G4']),
    bass: octBass(['C2', 'F2', 'C2', 'A1', 'C2', 'G1', 'G1', 'C2']),
    drum: rep('k . w . s . w . k . w . s . w w', 4)
  },
  ending: {
    bpm: 100, loop: true,
    lead: 'G4 - - - A4 - B4 - D5 - - - E5 - D5 - | B4 - - - A4 - G4 - A4 - - - - - - - | G4 - - - A4 - B4 - D5 - - - G5 - E5 - | D5 - - - - - B4 - D5 - - - - - - - | ' +
      'E5 - - - G5 - E5 - D5 - - - B4 - D5 - | E5 - - - D5 - B4 - A4 - - - - - - - | G4 - A4 - B4 - D5 - E5 - D5 - B4 - A4 - | G4 - - - - - - - G4 - - - - - - -',
    harm: pad(['D4', 'D4', 'E4', 'D4', 'D4', 'D4', 'G4', 'F#4', 'C5', 'B4', 'C5', 'D4', 'E4', 'D4', 'D4', 'D4']),
    arp: rep('G3 . D4 . G4 . B4 .', 4) + ' ' + rep('G3 . D4 . G4 . B4 .', 2) + ' ' + rep('D3 . A3 . D4 . F#4 .', 2) + ' ' +
      rep('C4 . G4 . C5 . E5 .', 2) + ' ' + rep('C4 . G4 . C5 . E5 .', 1) + ' ' + rep('D4 . A4 . D5 . F#5 .', 1) + ' ' + rep('C4 . G4 . C5 . E5 .', 1) + ' ' + rep('D4 . A4 . D5 . F#5 .', 1) + ' ' + rep('G3 . D4 . G4 . B4 .', 2),
    bass: octBass(['G1', 'G1', 'C2', 'D2', 'G1', 'G1', 'D2', 'D2', 'C2', 'G1', 'C2', 'D2', 'C2', 'D2', 'G1', 'G1']),
    drum: rep('t . . . w . . . t . . . w . w .', 7) + ' t . . . w . . . g . . . . . . .'
  }
};

function parseTrack(str) {
  return str.split(/\s+/).filter((t) => t && t !== '|');
}

class Chip {
  constructor() {
    this.ctx = null;
    this.song = null;
    this.timer = null;
    this.loops = {};
  }

  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      let c;
      try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { c = new AC(); }
      this.initCtx(c);
      if (this.pending) { const p = this.pending; this.pending = null; this.play(p); }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  /** Build the bus graph and wave tables on a context (also used for offline renders in tests). */
  initCtx(c) {
    {
      this.ctx = c;
      this.master = c.createGain(); this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 3; comp.attack.value = 0.002; comp.release.value = 0.15;
      this.master.connect(comp); comp.connect(c.destination);
      this.musicBus = c.createGain(); this.musicBus.connect(this.master);
      this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
      this.waves = {
        p12: this.pulseWave(0.125), p25: this.pulseWave(0.25), p50: this.pulseWave(0.5)
      };
      const len = c.sampleRate * 1.5;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // short-period "metallic" noise like old sound chips
      this.metalBuf = c.createBuffer(1, len, c.sampleRate);
      const m = this.metalBuf.getChannelData(0);
      let lfsr = 1;
      for (let i = 0; i < len; i++) {
        if (i % 12 === 0) { const bit = ((lfsr >> 0) ^ (lfsr >> 6)) & 1; lfsr = (lfsr >> 1) | (bit << 14); }
        m[i] = lfsr & 1 ? 1 : -1;
      }
      this.applyVolumes();
    }
  }

  ok() { return !!(this.ctx && this.ctx.state === 'running'); }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const on = settings.muted ? 0 : 1;
    this.musicBus.gain.setTargetAtTime(on * settings.music * 0.78, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(on * settings.sfx * 2.1, t, 0.05);
  }

  pulseWave(duty) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
      im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI);
    }
    return this.ctx.createPeriodicWave(re, im);
  }

  osc(wave, freq, t) {
    const o = this.ctx.createOscillator();
    if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]);
    else o.type = wave === 'tri' ? 'triangle' : wave === 'saw' ? 'sawtooth' : wave === 'sin' ? 'sine' : 'square';
    o.frequency.setValueAtTime(freq, t);
    return o;
  }

  tone(t, freq, dur, wave, vol, bus, opt) {
    const c = this.ctx;
    const o = this.osc(wave, freq, t);
    const g = c.createGain();
    const a = (opt && opt.a) || 0.004, rel = (opt && opt.r) || 0.04;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (opt && opt.decay) g.gain.setTargetAtTime(vol * (opt.sus || 0.5), t + a, opt.decay);
    g.gain.setValueAtTime(opt && opt.decay ? vol * (opt.sus || 0.5) : vol, Math.max(t + a, t + dur - rel));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    if (opt && opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + dur);
    if (opt && opt.vib) {
      const l = c.createOscillator(); l.frequency.value = opt.vib[0];
      const lg = c.createGain(); lg.gain.value = opt.vib[1];
      l.connect(lg); lg.connect(o.frequency); l.start(t + (opt.vib[2] || 0.1)); l.stop(t + dur + 0.05);
    }
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(t, dur, vol, type, freq, q, bus, opt) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = opt && opt.metal ? this.metalBuf : this.noiseBuf;
    if (opt && opt.rate) s.playbackRate.value = opt.rate;
    const f = c.createBiquadFilter();
    f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq || 4000, t); f.Q.value = q || 0.7;
    if (opt && opt.sweep) f.frequency.exponentialRampToValueAtTime(opt.sweep, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  /** Big temple drum: a pitched thump with a skin slap. */
  taiko(t, vol, bus) {
    this.tone(t, 96, 0.32, 'sin', vol, bus, { slide: 48, r: 0.12 });
    this.noise(t, 0.08, vol * 0.35, 'lowpass', 600, 0.8, bus);
  }

  /** Bronze gong: inharmonic partials with a long shimmer. */
  gong(t, vol, bus) {
    const base = 98;
    [[1, 1], [1.48, 0.55], [2.07, 0.45], [2.63, 0.3], [3.41, 0.22], [4.2, 0.12]].forEach(([r, a], i) => {
      this.tone(t, base * r, 2.6 - i * 0.25, 'sin', vol * a, bus, { a: 0.008, decay: 0.5 + i * 0.05, sus: 0.25, r: 1.4, vib: [4 + i, 1.5, 0.05], slide: base * r * 0.985 });
    });
    this.noise(t, 0.5, vol * 0.4, 'bandpass', 900, 0.6, bus, { sweep: 300 });
  }

  /* ---- music ---------------------------------------------------------- */
  play(name, onEnd) {
    if (!this.ctx) { this.pending = name; return; }
    this.stopMusic(true);
    const s = SONGS[name];
    if (!s) return;
    if (!s.parsed) {
      s.parsed = {
        lead: parseTrack(s.lead), harm: parseTrack(s.harm), bass: parseTrack(s.bass), drum: parseTrack(s.drum), arp: s.arp ? parseTrack(s.arp) : []
      };
      s.len = Math.max(s.parsed.lead.length, s.parsed.bass.length, s.parsed.drum.length);
    }
    const c = this.ctx;
    const song = { name, s, step: 0, next: c.currentTime + 0.06, stepDur: 60 / s.bpm / 4, onEnd, ended: false };
    song.gain = c.createGain(); song.gain.gain.value = 1; song.gain.connect(this.musicBus);
    this.song = song;
    const tick = () => {
      if (this.song !== song) return;
      while (song.next < c.currentTime + 0.14) {
        if (song.step >= s.len) {
          if (s.loop) song.step = 0;
          else {
            if (!song.ended) { song.ended = true; const endAt = (song.next - c.currentTime) * 1000; if (onEnd) setTimeout(() => { if (this.song === song) onEnd(); }, Math.max(0, endAt)); }
            return;
          }
        }
        this.scheduleStep(song, song.step, song.next);
        song.step++;
        song.next += song.stepDur;
      }
    };
    tick();
    song.timer = setInterval(tick, 25);
  }

  scheduleStep(song, i, t) {
    const s = song.s, P = s.parsed, sd = song.stepDur, bus = song.gain;
    const dur = (arr) => {
      let n = 1;
      while (i + n < arr.length && arr[i + n] === '-') n++;
      return n * sd;
    };
    const L = P.lead[i];
    if (L && L !== '-' && L !== '.') this.tone(t, noteFreq(L), dur(P.lead) * 0.92, 'p25', 0.13, bus, { vib: [5.5, 4, 0.18], decay: 0.25, sus: 0.75 });
    const Hh = P.harm[i];
    if (Hh && Hh !== '-' && Hh !== '.') this.tone(t, noteFreq(Hh), dur(P.harm) * 0.9, 'p12', 0.06, bus, { decay: 0.3, sus: 0.6 });
    const B = P.bass[i];
    if (B && B !== '-' && B !== '.') this.tone(t, noteFreq(B), Math.min(dur(P.bass) * 0.9, sd * 3.5), 'tri', 0.24, bus, { r: 0.02 });
    const A = P.arp[i];
    if (A && A !== '-' && A !== '.') this.tone(t, noteFreq(A), sd * 1.6, 'p12', 0.05, bus, { decay: 0.06, sus: 0.15, r: 0.03 });
    const D = P.drum[i];
    if (D && D !== '.') {
      if (D === 'k') { this.tone(t, 150, 0.12, 'sin', 0.42, bus, { slide: 42, r: 0.06 }); this.noise(t, 0.03, 0.08, 'lowpass', 1200, 0.7, bus); }
      else if (D === 's') { this.noise(t, 0.13, 0.22, 'bandpass', 1900, 0.9, bus); this.tone(t, 190, 0.06, 'tri', 0.12, bus, { slide: 120 }); }
      else if (D === 'h') this.noise(t, 0.03, 0.06, 'highpass', 7000, 0.7, bus, { metal: true });
      else if (D === 'o') this.noise(t, 0.12, 0.06, 'highpass', 6000, 0.7, bus, { metal: true });
      else if (D === 'c') this.noise(t, 0.6, 0.12, 'highpass', 4500, 0.5, bus, { metal: true });
      else if (D === 't') this.taiko(t, 0.5, bus);
      else if (D === 'w') { this.tone(t, 1180, 0.05, 'sin', 0.2, bus, { r: 0.03 }); this.tone(t, 2360, 0.02, 'p50', 0.04, bus); }
      else if (D === 'g') this.gong(t, 0.3, bus);
    }
  }

  stopMusic(quick) {
    const s = this.song;
    if (!s) return;
    clearInterval(s.timer);
    if (this.ctx) {
      const t = this.ctx.currentTime;
      s.gain.gain.setTargetAtTime(0.0001, t, quick ? 0.02 : 0.15);
      const g = s.gain;
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* gone */ } }, 900);
    }
    this.song = null;
  }

  duck(on) {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime((on ? 0.25 : 1) * (settings.muted ? 0 : 1) * settings.music * 0.78, this.ctx.currentTime, 0.08);
  }

  /* ---- sound effects -------------------------------------------------- */
  sfx(name, opt) {
    if (!this.ok() || this.mute) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'swish': {
        const k = opt && opt.kick;
        this.noise(t, k ? 0.11 : 0.08, 1.3, 'bandpass', k ? 700 : 1100, 1.2, null, { sweep: k ? 2400 : 3600 });
        break;
      }
      case 'punch':
        this.noise(t, 0.06, 0.5, 'lowpass', 1900, 0.8);
        this.tone(t, 190, 0.07, 'sin', 0.38, null, { slide: 60 });
        this.tone(t, 900, 0.03, 'p50', 0.08, null, { slide: 260 });
        break;
      case 'kick':
        this.noise(t, 0.09, 0.55, 'lowpass', 1300, 0.9);
        this.tone(t, 150, 0.11, 'sin', 0.45, null, { slide: 45 });
        break;
      case 'smash':
        this.tone(t, 130, 0.22, 'sin', 0.45, null, { slide: 34 });
        this.noise(t, 0.2, 0.5, 'lowpass', 2600, 0.8, null, { sweep: 300 });
        this.noise(t, 0.06, 0.2, 'highpass', 3000, 0.7, null, { metal: true });
        break;
      case 'sweep':
        this.noise(t, 0.14, 1.1, 'bandpass', 500, 1, null, { sweep: 1600 });
        break;
      case 'jump': this.tone(t, 230, 0.09, 'p25', 0.08, null, { slide: 470 }); break;
      case 'jump2': this.tone(t, 420, 0.08, 'p25', 0.08, null, { slide: 900 }); this.tone(t + 0.04, 1600, 0.05, 'p12', 0.05); break;
      case 'land': this.noise(t, 0.05, 0.3, 'lowpass', 700); break;
      case 'hurt':
        this.tone(t, 360, 0.16, 'p50', 0.14, null, { slide: 110 });
        this.noise(t, 0.1, 0.22, 'lowpass', 1200);
        break;
      case 'ko':
        [784, 659, 523, 440, 330, 262, 196].forEach((f, i) => this.tone(t + i * 0.08, f, 0.1, 'p50', 0.12, null, { vib: [12, 18, 0] }));
        this.tone(t, 110, 0.4, 'sin', 0.4, null, { slide: 40 });
        break;
      case 'charge':
        this.tone(t, 220, 0.34, 'tri', 0.2, null, { slide: 880 });
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.06, f, 0.12, 'p25', 0.06));
        break;
      case 'dragon':
        this.tone(t, 150, 0.9, 'saw', 0.1, null, { slide: 70, vib: [14, 20, 0] });
        this.tone(t, 300, 0.7, 'p25', 0.08, null, { slide: 120, vib: [9, 12, 0] });
        this.noise(t, 0.9, 0.5, 'bandpass', 600, 0.7, null, { sweep: 3000 });
        this.gong(t + 0.05, 0.07);
        break;
      case 'nochi': this.tone(t, 140, 0.08, 'p50', 0.1); break;
      case 'chifull': [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(t + i * 0.05, f, 0.09, 'p25', 0.08)); break;
      case 'squeeze': this.tone(t, 520 + Math.random() * 80, 0.08, 'p12', 0.1, null, { slide: 380, r: 0.02 }); break;
      case 'shake':
        this.noise(t, 0.2, 0.4, 'bandpass', 600, 0.8, null, { sweep: 2600 });
        [392, 523, 659].forEach((f, i) => this.tone(t + i * 0.04, f, 0.08, 'p25', 0.08));
        break;
      case 'grab': this.tone(t, 300, 0.08, 'p50', 0.1, null, { slide: 180 }); this.noise(t, 0.08, 0.2, 'bandpass', 1400, 0.9); break;
      case 'down':
        this.tone(t, 520, 0.18, 'p25', 0.1, null, { slide: 110 });
        this.noise(t + 0.02, 0.12, 0.14, 'lowpass', 900);
        break;
      case 'thud': this.tone(t, 90, 0.12, 'sin', 0.3, null, { slide: 40 }); this.noise(t, 0.08, 0.16, 'lowpass', 420); break;
      case 'clang':
        this.tone(t, 1240, 0.14, 'p50', 0.08, null, { slide: 900 }); this.tone(t, 2480, 0.3, 'sin', 0.08, null, { decay: 0.08, sus: 0.2 });
        this.noise(t, 0.08, 0.2, 'highpass', 3000, 0.8, null, { metal: true });
        break;
      case 'break':
        this.noise(t, 0.25, 0.4, 'bandpass', 1400, 0.7, null, { metal: true, sweep: 500 });
        this.tone(t, 300, 0.2, 'p50', 0.1, null, { slide: 80 });
        break;
      case 'throw':
        this.noise(t, 0.13, 0.4, 'highpass', 900, 0.7, null, { sweep: 3200 });
        this.tone(t, 260, 0.08, 'tri', 0.1, null, { slide: 520 });
        break;
      case 'monkey': [1300, 1550, 1250, 1600].forEach((f, i) => this.tone(t + i * 0.05, f, 0.04, 'p50', 0.06, null, { slide: f * 1.2 })); break;
      case 'bash': this.noise(t, 0.18, 0.4, 'bandpass', 400, 0.8, null, { sweep: 1400 }); this.tone(t + 0.05, 120, 0.12, 'sin', 0.3, null, { slide: 50 }); break;
      case 'poof': this.noise(t, 0.28, 0.8, 'lowpass', 1400, 0.7, null, { sweep: 260 }); break;
      case 'dash': this.noise(t, 0.2, 0.9, 'bandpass', 800, 0.9, null, { sweep: 4000 }); break;
      case 'slash':
        this.noise(t, 0.09, 0.5, 'highpass', 2600, 0.7, null, { sweep: 7000 });
        this.tone(t, 2200, 0.05, 'p12', 0.05, null, { slide: 3400 });
        break;
      case 'hiss': this.noise(t, 0.35, 0.3, 'highpass', 4200, 0.7); break;
      case 'parry':
        this.tone(t, 1800, 0.08, 'p50', 0.12); this.tone(t + 0.03, 2700, 0.18, 'sin', 0.1, null, { decay: 0.06, sus: 0.3 });
        this.noise(t, 0.05, 0.25, 'highpass', 4000, 0.8, null, { metal: true });
        break;
      case 'tear': this.noise(t, 0.12, 0.8, 'bandpass', 2600, 1.4, null, { sweep: 1200 }); break;
      case 'rattle': for (let i = 0; i < 3; i++) this.tone(t + i * 0.07, 1500 + i * 120, 0.03, 'p50', 0.05); break;
      case 'shatter':
        this.noise(t, 0.3, 0.4, 'highpass', 2800, 0.7, null, { sweep: 6000 });
        for (let i = 0; i < 5; i++) this.tone(t + i * 0.03 + Math.random() * 0.02, 2200 + Math.random() * 1600, 0.05, 'p50', 0.05);
        break;
      case 'sizzle': this.noise(t, 0.7, 0.1, 'highpass', 5000, 0.6); break;
      case 'fire':
        this.noise(t, 0.7, 0.45, 'lowpass', 1700, 0.6, null, { sweep: 400 });
        this.tone(t, 70, 0.6, 'saw', 0.06, null, { slide: 50 });
        break;
      case 'wisp': this.tone(t, 1200, 0.15, 'sin', 0.12, null, { slide: 2400 }); this.tone(t + 0.05, 3136, 0.1, 'p12', 0.05); break;
      case 'crackle': for (let i = 0; i < 4; i++) this.noise(t + i * 0.09, 0.04, 0.16, 'highpass', 3500, 0.7, null, { metal: true }); break;
      case 'thunder':
        this.noise(t, 0.12, 0.5, 'highpass', 2000, 0.6);
        this.noise(t + 0.05, 1.6, 0.45, 'lowpass', 600, 0.6, null, { sweep: 110 });
        break;
      case 'rumble': this.noise(t, 1.4, 0.45, 'lowpass', 300, 0.6, null, { sweep: 90 }); break;
      case 'oneup': [784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.07, f, 0.1, 'p25', 0.11)); break;
      case 'pickup': [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.045, f, 0.06, 'p25', 0.1)); break;
      case 'tick': this.tone(t, 660, 0.06, 'p50', 0.12, null, { r: 0.02 }); break;
      case 'tink': this.tone(t, 1900, 0.06, 'p50', 0.07); this.tone(t + 0.03, 2850, 0.05, 'p25', 0.04); break;
      case 'gong': this.gong(t, 0.15); this.taiko(t, 0.35); break;
      case 'bossko':
        this.tone(t, 120, 0.4, 'sin', 0.3, null, { slide: 30 });
        this.noise(t, 0.5, 0.3, 'lowpass', 3000, 0.7, null, { sweep: 200 });
        this.gong(t + 0.1, 0.1);
        break;
      case 'door':
        this.tone(t, 70, 0.7, 'saw', 0.05, null, { slide: 130, vib: [8, 10, 0] });
        this.taiko(t + 0.7, 0.3);
        break;
      case 'step': this.noise(t, 0.05, 0.4, 'lowpass', 500); break;
      case 'free':
        [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.07, f, 0.12, 'p25', 0.09));
        this.tone(t, 2093, 1.2, 'sin', 0.06, null, { decay: 0.3, sus: 0.3 });
        break;
      case 'move': this.tone(t, 1250, 0.04, 'p25', 0.1, null, { r: 0.015 }); break;
      case 'select': this.tone(t, 880, 0.06, 'p25', 0.1); this.tone(t + 0.06, 1320, 0.1, 'p25', 0.1); break;
      case 'coin':
        this.tone(t, 988, 0.08, 'p50', 0.12); this.tone(t + 0.08, 1319, 0.32, 'p50', 0.12, null, { decay: 0.12, sus: 0.4 });
        this.gong(t + 0.05, 0.12);
        break;
      case 'type': this.tone(t, 1600 + Math.random() * 300, 0.02, 'p12', 0.05); break;
      case 'whirl': this.noise(t, 0.5, 0.6, 'bandpass', 900, 3, null, { sweep: 2200 }); break;
      case 'fanthrow': this.noise(t, 0.16, 0.9, 'bandpass', 1200, 1, null, { sweep: 3000 }); for (let i = 0; i < 3; i++) this.tone(t + i * 0.05, 1800, 0.02, 'p12', 0.04); break;
      case 'thrust': this.noise(t, 0.1, 0.4, 'highpass', 1800, 0.8, null, { sweep: 5000 }); this.tone(t + 0.06, 2300, 0.06, 'p50', 0.06); break;
      case 'sweepbig': this.noise(t, 0.3, 0.9, 'bandpass', 500, 0.9, null, { sweep: 2600 }); break;
      case 'whoosh': this.noise(t, 0.26, 0.9, 'bandpass', 400, 0.9, null, { sweep: 2000 }); break;
      case 'stomp': this.tone(t, 72, 0.22, 'sin', 0.5, null, { slide: 34 }); this.noise(t, 0.12, 0.25, 'lowpass', 320); break;
      case 'roar':
        this.tone(t, 160, 0.7, 'saw', 0.15, null, { slide: 60, vib: [18, 30, 0] });
        this.noise(t, 0.6, 0.18, 'lowpass', 700, 0.8);
        break;
      case 'snort': this.noise(t, 0.12, 0.25, 'lowpass', 900, 1); this.noise(t + 0.16, 0.12, 0.25, 'lowpass', 900, 1); break;
      case 'scrape': this.noise(t, 0.12, 0.5, 'bandpass', 600, 1.2); break;
      case 'charge2': this.tone(t, 120, 0.5, 'saw', 0.12, null, { slide: 220, vib: [20, 20, 0] }); this.noise(t, 0.4, 0.2, 'lowpass', 500); break;
      case 'crash':
        this.noise(t, 0.6, 0.55, 'lowpass', 2200, 0.7, null, { sweep: 160 });
        this.tone(t, 60, 0.5, 'sin', 0.5, null, { slide: 30 });
        this.noise(t, 0.2, 0.25, 'highpass', 3000, 0.7, null, { metal: true });
        break;
      case 'slam':
        this.tone(t, 70, 0.4, 'sin', 0.5, null, { slide: 28 });
        this.noise(t, 0.4, 0.5, 'lowpass', 1600, 0.8, null, { sweep: 120 });
        break;
      case 'paper': this.noise(t, 0.06, 0.2, 'bandpass', 3000, 1.2); this.noise(t + 0.07, 0.05, 0.14, 'bandpass', 2600, 1.2); break;
      case 'palm': this.noise(t, 0.1, 0.4, 'bandpass', 900, 0.9, null, { sweep: 2400 }); this.tone(t + 0.04, 160, 0.1, 'sin', 0.3, null, { slide: 60 }); break;
      case 'mirror':
        [1568, 1976, 2349, 2794].forEach((f, i) => this.tone(t + i * 0.05, f, 0.2, 'sin', 0.07, null, { decay: 0.1, sus: 0.3 }));
        this.noise(t, 0.4, 0.1, 'highpass', 6000, 0.6);
        break;
      case 'counter':
        this.tone(t, 1240, 0.14, 'p50', 0.1, null, { slide: 900 }); this.tone(t, 2093, 0.5, 'sin', 0.1, null, { decay: 0.12, sus: 0.3 });
        this.noise(t, 0.08, 0.3, 'highpass', 3000, 0.8, null, { metal: true });
        break;
      case 'chime': this.tone(t, 2093, 0.7, 'sin', 0.1, null, { decay: 0.2, sus: 0.3 }); this.tone(t + 0.02, 3136, 0.5, 'sin', 0.05, null, { decay: 0.12, sus: 0.3 }); break;
      case 'orb': this.tone(t, 300, 0.3, 'sin', 0.18, null, { slide: 620, vib: [16, 30, 0] }); this.noise(t, 0.25, 0.12, 'bandpass', 1400, 1); break;
      case 'inhale': this.noise(t, 0.6, 0.6, 'bandpass', 300, 1.2, null, { sweep: 1600 }); break;
      default: break;
    }
  }
}

const chip = new Chip();
