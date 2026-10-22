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

const SONGS = {
  title: {
    bpm: 132, loop: true,
    lead: 'D4 - - - A4 - - - D5 - - - C5 - A4 - | Bb4 - - - A4 - G4 - A4 - - - - - - - | D4 - - - A4 - - - D5 - - - E5 - F5 - | E5 - - - C5 - - - A4 - - - - - - - | ' +
      'F5 - - - E5 - D5 - C5 - - - A4 - - - | Bb4 - - - A4 - G4 - F4 - - - G4 - A4 - | D4 - F4 - A4 - D5 - C5 - Bb4 - A4 - G4 - | A4 - - - - - - - D4 - - - . . . .',
    harm: 'F4 - - - - - - - F4 - - - E4 - - - | D4 - - - - - - - E4 - - - - - - - | F4 - - - - - - - F4 - - - A4 - - - | G4 - - - - - - - E4 - - - - - - - | ' +
      'A4 - - - - - - - G4 - - - - - - - | D4 - - - - - - - D4 - - - E4 - - - | F4 - - - - - - - G4 - - - E4 - - - | C#4 - - - - - - - D4 - - - . . . .',
    bass: octBass(['D2', 'D2', 'Bb1', 'C2', 'D2', 'D2', 'A1', 'A1', 'F1', 'C2', 'G1', 'A1', 'Bb1', 'C2', 'A1', 'D2']),
    drum: rep('k . h . s . h . k . k . s . h h', 7) + ' k . h . s . h . k . s s s s s s'
  },
  stageA: {
    bpm: 144, loop: true,
    lead: 'E4 - E4 G4 - E4 A4 - E4 B4 - A4 G4 - F#4 - | E4 - - - B3 - - - E4 - G4 - F#4 - D4 - | E4 - E4 G4 - E4 A4 - E4 B4 - D5 C5 - B4 - | A4 - - - G4 - F#4 - G4 - - - - - - - | ' +
      'C5 - - - B4 - A4 - B4 - - - G4 - E4 - | A4 - - - G4 - F#4 - G4 - - - E4 - - - | D5 - C5 - B4 - A4 - G4 - A4 - B4 - D5 - | E5 - - - - - B4 - E4 - - - - - - -',
    harm: 'B3 - - - - - - - C4 - - - B3 - - - | G3 - - - - - - - A3 - - - F#3 - - - | B3 - - - - - - - C4 - - - D4 - - - | E4 - - - - - - - D4 - - - - - - - | ' +
      'E4 - - - - - - - D4 - - - - - - - | C4 - - - - - - - B3 - - - - - - - | B3 - - - - - - - D4 - - - F#4 - - - | G4 - - - - - - - B3 - - - - - - -',
    bass: octBass(['E2', 'E2', 'E2', 'D2', 'E2', 'E2', 'C2', 'D2', 'C2', 'G1', 'A1', 'B1', 'G1', 'D2', 'E2', 'B1']),
    drum: rep('k . h . s . h . k k h . s . h .', 7) + ' k . h . s . h . k . s . s s s s'
  },
  stageB: {
    bpm: 128, loop: true,
    lead: 'A3 - - - - - C4 - D4 - - - Eb4 - D4 - | C4 - - - A3 - - - - - - - - - - - | A3 - - - - - C4 - D4 - - - F4 - E4 - | D4 - - - - - - - - - - - - - - - | ' +
      'F4 - - - E4 - D4 - E4 - - - C4 - A3 - | Bb3 - - - A3 - G3 - A3 - - - - - - - | D4 - F4 - A4 - Bb4 - A4 - G4 - F4 - E4 - | D4 - - - - - - - A3 - - - - - - -',
    harm: 'D3 - - - - - - - D3 - - - - - - - | Eb3 - - - - - - - D3 - - - - - - - | D3 - - - - - - - D3 - - - - - - - | F3 - - - - - - - E3 - - - - - - - | ' +
      'A3 - - - - - - - G3 - - - - - - - | F3 - - - - - - - E3 - - - - - - - | F3 - - - - - - - E3 - - - C#3 - - - | D3 - - - - - - - E3 - - - - - - -',
    bass: 'D2 . . D2 D3 . D2 . D2 . . D2 D3 . D2 . | Eb2 . . Eb2 Eb3 . Eb2 . D2 . . D2 D3 . D2 . | D2 . . D2 D3 . D2 . D2 . . D2 D3 . D2 . | Bb1 . . Bb1 Bb2 . Bb1 . A1 . . A1 A2 . A1 . | ' +
      'F1 . . F1 F2 . F1 . C2 . . C2 C3 . C2 . | G1 . . G1 G2 . G1 . A1 . . A1 A2 . A1 . | Bb1 . . Bb1 Bb2 . Bb1 . A1 . . A1 A2 . A1 . | D2 . . D2 D3 . D2 . A1 . . A1 A2 . A1 .',
    drum: rep('k . . k s . h . k . . k s . k h', 7) + ' k . k . s . k . s . s s s s s s'
  },
  stageC: {
    bpm: 136, loop: true,
    lead: 'E4 - F4 G#4 - - A4 - G#4 - F4 - E4 - - - | B4 - - - C5 - B4 - A4 - G#4 - A4 - - - | E4 - F4 G#4 - - A4 - B4 - C5 - D5 - C5 - | B4 - - - - - - - G#4 - - - - - - - | ' +
      'E5 - - - D5 - C5 - B4 - - - A4 - G#4 - | A4 - - - G#4 - F4 - G#4 - - - - - - - | E4 - G#4 - B4 - E5 - D5 - C5 - B4 - A4 - | G#4 - - - F4 - - - E4 - - - - - - -',
    harm: 'G#3 - - - - - - - G#3 - - - - - - - | A3 - - - - - - - G#3 - - - - - - - | G#3 - - - - - - - A3 - - - - - - - | G#3 - - - - - - - B3 - - - - - - - | ' +
      'C4 - - - - - - - B3 - - - - - - - | C4 - - - - - - - B3 - - - - - - - | G#3 - - - - - - - A3 - - - - - - - | A3 - - - - - - - G#3 - - - - - - -',
    bass: octBass(['E2', 'E2', 'F2', 'E2', 'E2', 'D2', 'E2', 'E2', 'A1', 'E2', 'F2', 'E2', 'E2', 'D2', 'F2', 'E2']),
    drum: rep('k . h k s . h . k . h k s . h h', 7) + ' k . k . s . s . s s s s s s s s'
  },
  stageD: {
    bpm: 150, loop: true,
    lead: 'C4 - - C4 Eb4 - - - G4 - F4 - Eb4 - D4 - | C4 - - - - - - - G3 - - - - - - - | C4 - - C4 Eb4 - - - G4 - Ab4 - G4 - F4 - | G4 - - - - - - - - - - - . . . . | ' +
      'Ab4 - - - G4 - F4 - Eb4 - - - F4 - G4 - | Ab4 - - - G4 - F4 - G4 - - - - - - - | C5 - - - Bb4 - Ab4 - G4 - F4 - Eb4 - D4 - | C4 - - - - - - - G3 - - - C4 - - -',
    harm: 'Eb3 - - - - - - - Eb3 - - - - - - - | Eb3 - - - - - - - D3 - - - - - - - | Eb3 - - - - - - - C3 - - - - - - - | D3 - - - - - - - B2 - - - - - - - | ' +
      'C3 - - - - - - - Bb2 - - - - - - - | C3 - - - - - - - B2 - - - - - - - | Eb3 - - - - - - - C3 - - - - - - - | Eb3 - - - - - - - D3 - - - Eb3 - - -',
    bass: halfBass(['C2', 'C2', 'C2', 'G1', 'C2', 'Ab1', 'G1', 'G1', 'Ab1', 'Eb2', 'F1', 'G1', 'C2', 'Ab1', 'G1', 'C2']),
    drum: rep('k . h . s . h k k . h . s . h .', 7) + ' k . s . k . s . s s s s c . . .'
  },
  boss: {
    bpm: 160, loop: true,
    lead: 'A4 - A4 - C5 - A4 - D5 - C5 - A4 - G4 - | A4 - - - E4 - - - G4 - F4 - E4 - D4 - | A4 - A4 - C5 - A4 - E5 - D5 - C5 - B4 - | C5 - - - B4 - G#4 - A4 - - - - - - - | ' +
      'F5 - E5 - D5 - C5 - D5 - C5 - B4 - A4 - | G#4 - - - B4 - - - E5 - - - D5 - C5 - | A4 - C5 - E5 - A5 - G5 - F5 - E5 - D5 - | E5 - - - G#4 - - - A4 - - - - - - -',
    harm: 'E4 - - - E4 - - - F4 - - - E4 - - - | C4 - - - - - - - B3 - - - - - - - | E4 - - - E4 - - - G4 - - - E4 - - - | E4 - - - D4 - - - C4 - - - - - - - | ' +
      'A4 - - - - - - - F4 - - - - - - - | E4 - - - - - - - G#4 - - - - - - - | E4 - - - - - - - C5 - - - A4 - - - | B4 - - - - - - - C5 - - - - - - -',
    bass: halfBass(['A1', 'A1', 'F1', 'F1', 'A1', 'A1', 'E1', 'A1', 'D1', 'D1', 'E1', 'E1', 'A1', 'F1', 'E1', 'A1']),
    drum: rep('k h s h k k s h k h s h k k s s', 8)
  },
  clear: {
    bpm: 150, loop: false,
    lead: 'D5 - F#5 - A5 - D6 - - - A5 - D6 - - - - - - - - - - - . . . .',
    harm: 'A4 - D5 - F#5 - A5 - - - F#5 - A5 - - - - - - - - - - - . . . .',
    bass: 'D2 - - - - - - - A1 - - - D2 - - - - - - - - - - - . . . .',
    drum: 'k . . . k . . . s . . . k . s s c . . . . . . . . . . .'
  },
  gameover: {
    bpm: 96, loop: false,
    lead: 'A4 - - - G4 - - - F4 - - - E4 - - - D4 - - - - - - - - - - - . . . .',
    harm: 'F4 - - - E4 - - - D4 - - - C#4 - - - A3 - - - - - - - - - - - . . . .',
    bass: 'D2 - - - C2 - - - Bb1 - - - A1 - - - D1 - - - - - - - - - - - . . . .',
    drum: 'k . . . . . . . k . . . . . . . k . . . . . . . . . . . . . . .'
  },
  start: {
    bpm: 168, loop: false,
    lead: 'A4 - A4 - A4 - D5 - - - - - - - . .',
    harm: 'E4 - E4 - E4 - A4 - - - - - - - . .',
    bass: 'A2 - A2 - A2 - D2 - - - - - - - . .',
    drum: 's . s . s . c . . . . . . . . .'
  },
  entry: {
    bpm: 120, loop: true,
    lead: 'C5 . E5 . G5 . E5 . F5 . A5 . G5 - - - | E5 . G5 . C6 . G5 . A5 . F5 . G5 - - - | C5 . E5 . G5 . E5 . F5 . D5 . E5 . C5 . | D5 . B4 . G4 . B4 . C5 - - - - - - -',
    harm: 'E4 - - - - - - - F4 - - - E4 - - - | G4 - - - - - - - F4 - - - E4 - - - | E4 - - - - - - - D4 - - - C4 - - - | B3 - - - - - - - C4 - - - - - - -',
    bass: octBass(['C2', 'F2', 'C2', 'F2', 'C2', 'G1', 'G1', 'C2']),
    drum: rep('k . h . s . h . k . h . s . h .', 4)
  },
  ending: {
    bpm: 120, loop: true,
    lead: 'F4 - - - C5 - - - F5 - - - E5 - C5 - | D5 - - - C5 - Bb4 - C5 - - - - - - - | F4 - - - C5 - - - F5 - - - G5 - A5 - | G5 - - - E5 - - - C5 - - - - - - - | ' +
      'A5 - - - G5 - F5 - E5 - - - C5 - - - | D5 - - - C5 - Bb4 - A4 - - - Bb4 - C5 - | F5 - E5 - D5 - C5 - Bb4 - A4 - G4 - E4 - | F4 - - - - - - - F4 - - - - - - -',
    harm: 'A4 - - - - - - - A4 - - - G4 - - - | F4 - - - - - - - G4 - - - - - - - | A4 - - - - - - - A4 - - - C5 - - - | Bb4 - - - - - - - G4 - - - - - - - | ' +
      'C5 - - - - - - - Bb4 - - - - - - - | F4 - - - - - - - F4 - - - G4 - - - | A4 - - - - - - - Bb4 - - - G4 - - - | A4 - - - - - - - A4 - - - - - - -',
    bass: octBass(['F2', 'F2', 'Bb1', 'C2', 'F2', 'F2', 'C2', 'C2', 'A1', 'C2', 'Bb1', 'C2', 'Bb1', 'C2', 'F2', 'F2']),
    drum: rep('k . h . s . h . k . k . s . h h', 8)
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
    this.musicBus.gain.setTargetAtTime(settings.music * 0.78, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(settings.sfx * 2.1, t, 0.05);
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

  /* ---- music ---------------------------------------------------------- */
  play(name, onEnd) {
    if (!this.ctx) { this.pending = name; return; }
    this.stopMusic(true);
    const s = SONGS[name];
    if (!s) return;
    if (!s.parsed) {
      s.parsed = {
        lead: parseTrack(s.lead), harm: parseTrack(s.harm), bass: parseTrack(s.bass), drum: parseTrack(s.drum)
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
    const D = P.drum[i];
    if (D && D !== '.') {
      if (D === 'k') { this.tone(t, 150, 0.12, 'sin', 0.42, bus, { slide: 42, r: 0.06 }); this.noise(t, 0.03, 0.08, 'lowpass', 1200, 0.7, bus); }
      else if (D === 's') { this.noise(t, 0.13, 0.22, 'bandpass', 1900, 0.9, bus); this.tone(t, 190, 0.06, 'tri', 0.12, bus, { slide: 120 }); }
      else if (D === 'h') this.noise(t, 0.03, 0.06, 'highpass', 7000, 0.7, bus, { metal: true });
      else if (D === 'o') this.noise(t, 0.12, 0.06, 'highpass', 6000, 0.7, bus, { metal: true });
      else if (D === 'c') this.noise(t, 0.6, 0.12, 'highpass', 4500, 0.5, bus, { metal: true });
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
    this.musicBus.gain.setTargetAtTime((on ? 0.25 : 1) * settings.music * 0.78, this.ctx.currentTime, 0.08);
  }

  /* ---- sound effects -------------------------------------------------- */
  sfx(name, opt) {
    if (!this.ok() || this.mute) return;
    const t = this.ctx.currentTime;
    const p = (opt && opt.pan) || 0;
    switch (name) {
      case 'knife':
        this.noise(t, 0.09, 0.55, 'highpass', 2600, 0.7, null, { sweep: 7000 });
        this.tone(t, 2200, 0.05, 'p12', 0.05, null, { slide: 3400 });
        break;
      case 'hit':
        this.tone(t, 760, 0.07, 'p50', 0.18, null, { slide: 180 });
        this.noise(t, 0.08, 0.42, 'bandpass', 1500, 0.8);
        break;
      case 'down':
        this.tone(t, 520, 0.18, 'p25', 0.12, null, { slide: 110 });
        this.noise(t + 0.02, 0.12, 0.12, 'lowpass', 900);
        break;
      case 'shot':
        this.noise(t, 0.08, 0.26, 'highpass', 1300, 0.6);
        this.tone(t, 180, 0.06, 'sin', 0.25, null, { slide: 60 });
        break;
      case 'snipe':
        this.noise(t, 0.12, 0.32, 'highpass', 2200, 0.6);
        this.tone(t, 1400, 0.12, 'p12', 0.08, null, { slide: 300 });
        break;
      case 'boom': {
        const big = opt && opt.big;
        this.noise(t, big ? 1.1 : 0.6, big ? 0.42 : 0.36, 'lowpass', 3200, 0.8, null, { sweep: 160 });
        this.tone(t, 90, big ? 0.7 : 0.4, 'sin', 0.36, null, { slide: 28 });
        this.noise(t, 0.12, 0.2, 'highpass', 3000, 0.7, null, { metal: true });
        break;
      }
      case 'rocket':
        this.noise(t, 0.35, 0.22, 'bandpass', 900, 0.8, null, { sweep: 3200 });
        this.tone(t, 110, 0.3, 'saw', 0.06, null, { slide: 220 });
        break;
      case 'throw':
        this.noise(t, 0.13, 0.5, 'highpass', 900, 0.7, null, { sweep: 3200 });
        this.tone(t, 260, 0.08, 'tri', 0.1, null, { slide: 520 });
        break;
      case 'tink':
        this.tone(t, 1900, 0.06, 'p50', 0.09); this.tone(t + 0.03, 2850, 0.05, 'p25', 0.05);
        break;
      case 'jump':
        this.tone(t, 230, 0.09, 'p25', 0.09, null, { slide: 470 });
        break;
      case 'land':
        this.noise(t, 0.05, 0.08, 'lowpass', 700);
        break;
      case 'pickup':
        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.045, f, 0.06, 'p25', 0.1));
        break;
      case 'weapon':
        [523, 784, 1047].forEach((f, i) => this.tone(t + i * 0.06, f, 0.08, 'p50', 0.11));
        this.noise(t, 0.15, 0.08, 'highpass', 4000, 0.7, null, { metal: true });
        break;
      case 'free':
        [784, 988, 1175, 1568, 1319, 1568].forEach((f, i) => this.tone(t + i * 0.06, f, 0.08, 'p25', 0.1));
        break;
      case 'crate':
        this.noise(t, 0.12, 0.3, 'bandpass', 900, 0.9);
        this.tone(t, 210, 0.1, 'tri', 0.25, null, { slide: 90 });
        break;
      case 'die':
        [880, 784, 659, 523, 440, 330, 262].forEach((f, i) => this.tone(t + i * 0.07, f, 0.09, 'p50', 0.12, null, { vib: [12, 18, 0] }));
        break;
      case 'hurt':
        this.tone(t, 360, 0.16, 'p50', 0.14, null, { slide: 110 });
        this.noise(t, 0.1, 0.18, 'lowpass', 1200);
        break;
      case 'oneup':
        [784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.07, f, 0.1, 'p25', 0.11));
        break;
      case 'move':
        this.tone(t, 1250, 0.035, 'p25', 0.08);
        break;
      case 'select':
        this.tone(t, 880, 0.06, 'p25', 0.1); this.tone(t + 0.06, 1320, 0.1, 'p25', 0.1);
        break;
      case 'coin':
        this.tone(t, 988, 0.08, 'p50', 0.12); this.tone(t + 0.08, 1319, 0.32, 'p50', 0.12, null, { decay: 0.12, sus: 0.4 });
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) this.tone(t + i * 0.36, 620, 0.34, 'p50', 0.09, null, { slide: 980 });
        break;
      case 'roar':
        this.tone(t, 160, 0.7, 'saw', 0.16, null, { slide: 60, vib: [18, 30, 0] });
        this.noise(t, 0.6, 0.15, 'lowpass', 700, 0.8);
        break;
      case 'thunder':
        this.noise(t, 1.6, 0.4, 'lowpass', 500, 0.6, null, { sweep: 120 });
        break;
      case 'bark':
        this.tone(t, 560, 0.07, 'p50', 0.1, null, { slide: 300 }); this.tone(t + 0.11, 520, 0.07, 'p50', 0.1, null, { slide: 280 });
        break;
      case 'horn':
        this.tone(t, 233, 0.9, 'saw', 0.07); this.tone(t, 277, 0.9, 'saw', 0.07);
        break;
      case 'tick':
        this.tone(t, 660, 0.05, 'p50', 0.08);
        break;
      case 'type':
        this.tone(t, 1600 + Math.random() * 300, 0.02, 'p12', 0.05);
        break;
      case 'flame':
        this.noise(t, 0.6, 0.45, 'lowpass', 1600, 0.6, null, { sweep: 400 });
        break;
      case 'clang':
        this.tone(t, 1240, 0.12, 'p50', 0.08, null, { slide: 900 }); this.noise(t, 0.08, 0.16, 'highpass', 3000, 0.8, null, { metal: true });
        break;
      case 'chop':
        this.noise(t, 0.05, 0.12, 'lowpass', 400, 1.2);
        break;
      default: break;
    }
    return p;
  }
}

const chip = new Chip();
