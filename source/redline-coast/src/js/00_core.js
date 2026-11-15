/* ==========================================================================
   REDLINE COAST
   Core: screen constants, helpers, seeded random, settings, storage
   ========================================================================== */
'use strict';

const W = 384, H = 216;           // internal resolution (16:9); everything is drawn in these units
const STEP = 1 / 60;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const sgn = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
const $ = (id) => document.getElementById(id);

function seeded(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
const coarse = window.matchMedia ? matchMedia('(pointer: coarse)').matches : isTouch;
const reducedMotion = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;

const store = {
  get(k, d) {
    try { const v = localStorage.getItem('redlineCoast.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
  },
  set(k, v) { try { localStorage.setItem('redlineCoast.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};

const settings = Object.assign(
  { music: 0.7, sfx: 0.85, fx: true, shake: !reducedMotion, level: 'sport', car: 'gt', autoGas: 'auto', touch: 'auto', muted: false },
  store.get('settings', {})
);
function saveSettings() { store.set('settings', settings); }

const DEFAULT_SCORES = [
  { n: 'RED', s: 600000, st: 5 }, { n: 'LIN', s: 450000, st: 4 }, { n: 'CST', s: 300000, st: 3 },
  { n: 'ACE', s: 180000, st: 2 }, { n: 'ZIP', s: 90000, st: 1 }
];
function loadScores() {
  const s = store.get('scores', null);
  if (!Array.isArray(s) || s.length !== 5) return DEFAULT_SCORES.map((e) => Object.assign({}, e));
  return s;
}

const DBG = {};               // profiling switches used by the tests
const QUALITY = { level: 0, res: [1, 0.8, 0.64] };

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], t)));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
