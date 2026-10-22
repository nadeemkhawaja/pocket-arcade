/* ==========================================================================
   ACE RALLY TENNIS
   Core: helpers, court geometry, surfaces, opponents, match formats, settings
   ========================================================================== */
'use strict';

const T3 = window.THREE;
const PI = Math.PI;
const TAU = PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smoothstep = (a, b, v) => { const t = invLerp(a, b, v); return t * t * (3 - 2 * t); };
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const sgn = (v) => (v < 0 ? -1 : 1);
const hyp = (x, z) => Math.sqrt(x * x + z * z);
const wrapAngle = (a) => { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; };
const $ = (id) => document.getElementById(id);

const isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0) &&
  (window.matchMedia ? matchMedia('(pointer: coarse)').matches : true);
const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');
const reducedMotion = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;

const store = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem('aceRally.' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { window.localStorage.setItem('aceRally.' + key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }
};

/* ---- Court geometry (metres, ITF dimensions) -------------------------------
   Near player lives on +z and faces -z. +x is the near player's right.       */
const COURT = {
  HL: 11.885,      // half length (baseline to net)
  HWS: 4.115,      // half width, singles
  HWD: 5.485,      // half width, doubles
  SVC: 6.40,       // service line distance from the net
  NET_H: 0.914,    // net height at the centre strap
  POST_H: 1.07,    // net height at the posts
  POST_X: 6.40,    // posts sit 0.914 m outside the doubles sideline
  LINE: 0.05,
  BASE: 0.10,
  RUN_X: 10.4,     // edge of the playing surround
  RUN_Z: 19.0
};

function netTop(x) {
  const u = Math.min(Math.abs(x), COURT.POST_X) / COURT.POST_X;
  return COURT.NET_H + (COURT.POST_H - COURT.NET_H) * u * u;
}

const BALL_R = 0.034;     // physical radius used for contact and line calls
const BALL_VIS = 0.08;    // drawn radius, enlarged so the ball reads on a phone
const GRAV = 9.81;
const SPIN_K = 4.6;       // extra downward pull per unit of topspin
const PH_DT = 1 / 240;    // physics step
const SPEED_DISPLAY = 1.55; // broadcast-style speed readout scale

/* ---- Court surfaces -------------------------------------------------------- */
const SURFACES = {
  hard: {
    key: 'hard', label: 'Hard', name: 'Hard court',
    e: 0.74, f: 0.74, kick: 0.07, roll: 1.4,
    inner: '#2f64a6', outer: '#3a8a5c', outer2: '#33805a', line: '#ffffff',
    dust: 0xdfe8f2, dustAmt: 0.25, mark: 0x1d3f6b, sound: 'hard',
    grassColor: '#4f9a4a'
  },
  grass: {
    key: 'grass', label: 'Grass', name: 'Grass court',
    e: 0.64, f: 0.82, kick: 0.05, roll: 1.8,
    inner: '#5ea53f', outer: '#4f9636', outer2: '#58a03b', line: '#ffffff',
    dust: 0x8fc66b, dustAmt: 0.45, mark: 0x3f7a2a, sound: 'grass',
    grassColor: '#4c9136'
  },
  clay: {
    key: 'clay', label: 'Clay', name: 'Clay court',
    e: 0.80, f: 0.66, kick: 0.09, roll: 2.2,
    inner: '#c9693f', outer: '#bb5f37', outer2: '#c4653b', line: '#f7f1ea',
    dust: 0xd98a5f, dustAmt: 1.0, mark: 0x9c4a26, sound: 'clay',
    grassColor: '#3f8a45'
  }
};

/* ---- Opponents ------------------------------------------------------------- */
const LEVELS = {
  rookie: {
    key: 'rookie', label: 'Rookie', name: 'SAM', partner: 'LEO',
    speed: 5.3, react: 0.28, pace: [13.5, 16.5], err: 0.14, width: 2.3, depth: [6.8, 9.0],
    aggr: 0.15, serve: [19, 23], serveIn: [0.62, 0.9], leaveOut: 0.15, lob: 0.06, drop: 0.0,
    approach: 0.04, netReach: 0.85,
    look: { shirt: '#ff8a3d', shirt2: '#ffd2a8', shorts: '#2c3e57', skin: 1, hair: 2, style: 'short', band: '#ffffff' },
    look2: { shirt: '#ff8a3d', shirt2: '#ffd2a8', shorts: '#2c3e57', skin: 4, hair: 0, style: 'buzz', band: '#ffd24a' }
  },
  pro: {
    key: 'pro', label: 'Pro', name: 'MAYA', partner: 'IVY',
    speed: 6.0, react: 0.18, pace: [16.5, 20.5], err: 0.085, width: 3.1, depth: [7.8, 10.0],
    aggr: 0.45, serve: [24, 29], serveIn: [0.64, 0.93], leaveOut: 0.6, lob: 0.08, drop: 0.04,
    approach: 0.16, netReach: 1.0,
    look: { shirt: '#b44be1', shirt2: '#f0c9ff', shorts: '#ffffff', skin: 2, hair: 0, style: 'pony', band: '#ff6fb1' },
    look2: { shirt: '#b44be1', shirt2: '#f0c9ff', shorts: '#ffffff', skin: 5, hair: 3, style: 'bob', band: '#ffffff' }
  },
  champ: {
    key: 'champ', label: 'Champion', name: 'KAI', partner: 'REX',
    speed: 6.8, react: 0.11, pace: [20, 25.5], err: 0.055, width: 3.8, depth: [8.4, 10.6],
    aggr: 0.85, serve: [29, 35], serveIn: [0.66, 0.95], leaveOut: 0.9, lob: 0.1, drop: 0.06,
    approach: 0.28, netReach: 1.12,
    look: { shirt: '#1d2230', shirt2: '#f2c94c', shorts: '#1d2230', skin: 3, hair: 4, style: 'spiky', band: '#f2c94c' },
    look2: { shirt: '#1d2230', shirt2: '#f2c94c', shorts: '#1d2230', skin: 0, hair: 1, style: 'short', band: '#f2c94c' }
  }
};

/* ---- Match formats --------------------------------------------------------- */
const FORMATS = {
  g1: { key: 'g1', label: '1 Game', sets: 1, games: 1, tb: 0, winBy2: false },
  g3: { key: 'g3', label: 'Best of 3 Games', sets: 1, games: 2, tb: 0, winBy2: false },
  s1: { key: 's1', label: '1 Set', sets: 1, games: 6, tb: 6, winBy2: true },
  s3: { key: 's3', label: 'Best of 3 Sets', sets: 2, games: 6, tb: 6, winBy2: true }
};

const SHIRTS = [
  { shirt: '#1e97e0', shirt2: '#bfe6ff', shorts: '#ffffff', band: '#ffffff' },
  { shirt: '#e8443a', shirt2: '#ffd0cc', shorts: '#ffffff', band: '#ffffff' },
  { shirt: '#18a565', shirt2: '#c9f5dd', shorts: '#13314f', band: '#ffffff' },
  { shirt: '#ffb21e', shirt2: '#fff0c4', shorts: '#13314f', band: '#13314f' },
  { shirt: '#ffffff', shirt2: '#dfe7ef', shorts: '#13314f', band: '#1e97e0' },
  { shirt: '#26324a', shirt2: '#d9f23f', shorts: '#26324a', band: '#d9f23f' }
];

const SKIN_TONES = ['#f3cfb3', '#e7b48f', '#c98c62', '#a8683f', '#7b4a2c', '#f7dcc6'];
const HAIR_TONES = ['#2a1b12', '#5b3920', '#a35f2b', '#d8b26a', '#141414', '#7c2e1d'];

/* ---- Settings (remembered per browser) ------------------------------------ */
const DEFAULTS = {
  sfx: true, music: true, voice: true, guides: 'auto', shake: true, quality: 'auto', mute: false,
  camSens: 55, camAim: true, camPreview: true,
  name: 'PLAYER', shirt: 0, skin: 0,
  mode: 'singles', controls: isTouchDevice ? 'touch' : 'keys', level: 'pro', format: 'g3', surface: 'hard'
};
const settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
if (!LEVELS[settings.level]) settings.level = 'pro';
if (!FORMATS[settings.format]) settings.format = 'g3';
if (!SURFACES[settings.surface]) settings.surface = 'hard';
if (['singles', 'doubles', 'practice'].indexOf(settings.mode) < 0) settings.mode = 'singles';
if (['keys', 'touch', 'webcam'].indexOf(settings.controls) < 0) settings.controls = DEFAULTS.controls;
function saveSettings() { store.set('settings', settings); }

function cleanName(s) {
  const v = String(s || '').toUpperCase().replace(/[^A-Z0-9 .'-]/g, '').trim().slice(0, 10);
  return v || 'PLAYER';
}
