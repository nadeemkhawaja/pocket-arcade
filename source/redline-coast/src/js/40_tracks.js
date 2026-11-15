/* ==========================================================================
   The road. A stage is a long strip of short segments, each with a curve and a
   height; scenery, hazards, pickups and traffic are placed on top of it.
   ========================================================================== */

const SEG = 200;                  // length of one road segment, world units
const ROAD_W = 2000;              // half the road width
const CAM_H = 1500;               // camera height above the road
const CAM_D = 0.84;               // camera depth (about a 100 degree field of view)
const PLAYER_Z = CAM_H * CAM_D;   // how far in front of the camera the car sits
const DRAW_N = 220;               // segments drawn ahead
const MAX_SPEED = SEG * 60;       // one segment per frame at top speed
const LANE_X = [-0.66, 0, 0.66];

const THEMES = {
  coast: {
    id: 'coast', seed: 11, sky: ['#2b1b6b', '#b23a8a', '#ff8a4a', '#ffd27a'], sun: [0.62, 0.74, 26, '#fff2c0', '#ff9a4a'],
    far: ['#6a3a8a', '#8a3a6a', '#b85a7a', '#a8486a'], cloud: ['#ffb0a0', '#e86a8a'], fog: '#ffb07a', fogK: 0.75,
    road: ['#5a5560', '#54505a'], rumble: ['#f4f0e6', '#e8392a'], lane: '#f8f0d8',
    left: 'sea', gl: ['#2a7ac8', '#2470ba'], gr: ['#3aa04a', '#349444'], sand: '#f0d090'
  },
  mesa: {
    id: 'mesa', seed: 23, sky: ['#1a6ad0', '#5aa8e8', '#ffd9a0', '#ffe9c0'], sun: [0.3, 0.3, 16, '#ffffff', '#ffe9a0'], jag: true,
    far: ['#c8623a', '#e08a52', '#a8482a', '#c86a3a'], cloud: ['#ffffff', '#ffe0c0'], fog: '#ffd9a8', fogK: 0.6,
    road: ['#6a5e58', '#645852'], rumble: ['#f4e8d0', '#d8762a'], lane: '#fff4d8',
    gl: ['#e0a860', '#d89c54'], gr: ['#e0a860', '#d89c54']
  },
  pine: {
    id: 'pine', seed: 37, sky: ['#3a7ad8', '#8ac0f0', '#d8f0ff', '#f0faff'], sun: [0.7, 0.26, 14, '#ffffff', '#fff8d0'], jag: true, snow: true,
    far: ['#5a7a9a', '#3a6a5a', '#8aa8c0', '#2a5a48'], cloud: ['#ffffff', '#d8e8f8'], fog: '#d8ecf8', fogK: 0.7,
    road: ['#565a62', '#50545c'], rumble: ['#ffffff', '#2a6ad0'], lane: '#ffffff',
    gl: ['#3a8a4a', '#34804a'], gr: ['#3a8a4a', '#34804a'], gl2: ['#eef6ff', '#e0ecf8']
  },
  neon: {
    id: 'neon', seed: 53, night: true, sky: ['#05030f', '#1a0a3a', '#4a1260', '#a02a7a'], moon: [0.24, 0.24, 13], stars: true,
    far: ['#140a2e', '#0c061e', '#140a2e', '#0c061e'], lit: ['#ffd27a', '#7fe9ff'], cloud: ['#3a1a5a', '#2a1048'], fog: '#3a1050', fogK: 0.8,
    road: ['#22202e', '#1e1c2a'], rumble: ['#ff3d8a', '#2a2040'], lane: '#5af0ff',
    gl: ['#120e22', '#100c1e'], gr: ['#120e22', '#100c1e'], wet: true
  },
  aurora: {
    id: 'aurora', seed: 71, night: true, sky: ['#030818', '#0a1a3a', '#12405a', '#2a7a7a'], moon: [0.78, 0.2, 10], stars: true, aurora: true, jag: true, snow: true,
    far: ['#1a2a4a', '#10203a', '#2a4a6a', '#0c182c'], cloud: ['#1a3a5a', '#12284a'], fog: '#1a4a5a', fogK: 0.7,
    road: ['#2a2e3a', '#262a36'], rumble: ['#5af0c0', '#1a2a3a'], lane: '#e8fff8',
    gl: ['#dfeaf6', '#cfdcec'], gr: ['#dfeaf6', '#cfdcec']
  }
};

const DIFFS = {
  cruise: { id: 'cruise', name: 'CRUISE', blurb: 'RELAXED CLOCK, LIGHT TRAFFIC, GENTLE RIVALS.', time: 1.3, traffic: 0.7, rival: 0.93, score: 0.6 },
  sport: { id: 'sport', name: 'SPORT', blurb: 'THE ARCADE STANDARD. EVERY SECOND COUNTS.', time: 1.08, traffic: 1, rival: 0.975, score: 1 },
  pro: { id: 'pro', name: 'PRO', blurb: 'TIGHT CLOCK, BUSY ROADS, RIVALS WHO FIGHT BACK.', time: 0.95, traffic: 1.25, rival: 1.01, score: 1.5 },
  legend: { id: 'legend', name: 'LEGEND', blurb: 'NO MARGIN AT ALL. FOR THE FEARLESS.', time: 0.9, traffic: 1.5, rival: 1.04, score: 2.2 }
};
const LEVELS = ['cruise', 'sport', 'pro', 'legend'];

const CARS = {
  gt: { id: 'gt', style: 'gt', col: '#e8283c', stripe: null, top: 1, acc: 1, grip: 1, blurb: 'BALANCED. FAST EVERYWHERE.' },
  muscle: { id: 'muscle', style: 'muscle', col: '#f2b020', stripe: '#14161c', top: 1.07, acc: 0.88, grip: 0.86, blurb: 'HUGE TOP SPEED. SLIDES WIDE.' },
  rally: { id: 'rally', style: 'rally', col: '#2a7af0', stripe: '#ffffff', top: 0.95, acc: 1.18, grip: 1.2, blurb: 'GRIP AND PUNCH OUT OF CORNERS.' }
};
const CAR_ORDER = ['gt', 'muscle', 'rally'];

/*
 * Stage scripts. Each row: [segments, curve, hill]. Curve: negative is left, 2 easy to 6 hairpin.
 * Hill: height change over the piece, in road-heights. 'check' marks the checkpoint.
 */
const STAGES = [
  {
    id: 'coast', name: 'SUNSET BAY', sub: 'THE COAST ROAD', theme: 'coast', song: 'coast', traffic: 34, t0: 36, t1: 31,
    rival: { name: 'MARLO', car: 'coupe', col: '#f0f0f4', pace: 0.86 },
    road: [[90, 0, 0], [140, 2, 0], [80, 0, 20], [160, -3, -20], [120, 0, 0], [150, 3, 30], [100, -2, -30], [140, 0, 0], [180, -4, 20], [120, 2, 0], [130, 0, -20], [160, 4, 0], [110, 0, 0],
      'check', [150, -3, 40], [120, 3, -40], [140, 0, 0], [170, 4, 20], [110, -4, 0], [130, 0, -20], [160, -2, 0], [150, 3, 30], [120, -3, -30], [170, 5, 0], [120, 0, 0], [140, -4, 20], [120, 0, -20]]
  },
  {
    id: 'mesa', name: 'MESA RUN', sub: 'RED ROCK CANYON', theme: 'mesa', song: 'mesa', traffic: 42, t0: 35, t1: 33,
    rival: { name: 'DUSTY', car: 'sedan', col: '#d86a2a', pace: 0.89 },
    road: [[80, 0, 0], [170, 4, 30], [110, 0, -50], [160, -4, 40], [90, 0, 0], [140, 5, -30], [130, -3, 60], [120, 0, -60], [180, -5, 0], [100, 0, 30], [150, 4, -30], [130, -4, 0], [120, 0, 0],
      'check', [170, 5, 50], [100, 0, -50], [150, -5, 0], [140, 3, 40], [120, -3, -40], [180, 5, 0], [100, 0, 0], [150, -6, 30], [120, 0, -30], [160, 4, 50], [130, -4, -50], [150, 5, 0], [120, 0, 0]]
  },
  {
    id: 'pine', name: 'PINE PASS', sub: 'UP INTO THE SNOW', theme: 'pine', song: 'pine', traffic: 44, t0: 35, t1: 32,
    rival: { name: 'FROST', car: 'coupe', col: '#8ad8ff', pace: 0.91 },
    road: [[80, 0, 0], [130, 3, 60], [110, -4, 40], [120, 4, 60], [110, -5, -40], [130, 5, 80], [90, 0, -60], [150, -5, 60], [120, 4, 40], [110, -4, -80], [140, 5, 80], [120, 0, 40], [110, -3, 0],
      'check', [150, 5, 80], [110, -5, -60], [130, 5, 60], [120, -6, 40], [100, 0, -80], [150, 5, 60], [120, -5, 60], [130, 4, -60], [140, -5, 80], [110, 6, 0], [130, -4, 60], [120, 0, -40], [120, 0, 0]]
  },
  {
    id: 'neon', name: 'NEON HARBOR', sub: 'MIDNIGHT RUSH HOUR', theme: 'neon', song: 'neon', traffic: 70, t0: 39, t1: 37,
    rival: { name: 'NOVA', car: 'gt', col: '#b03aff', pace: 0.93 },
    road: [[100, 0, 0], [220, 0, 0], [130, 5, 0], [180, 0, 20], [130, -5, -20], [240, 0, 0], [140, 6, 0], [120, -4, 30], [200, 0, -30], [150, -5, 0], [110, 4, 0], [180, 0, 0],
      'check', [140, 5, 0], [220, 0, 30], [140, -6, -30], [130, 4, 0], [240, 0, 0], [150, -5, 20], [120, 5, -20], [200, 0, 0], [140, 6, 0], [130, -5, 0], [220, 0, 0], [130, 4, 0], [120, 0, 0]]
  },
  {
    id: 'aurora', name: 'AURORA RIDGE', sub: 'THE LAST CLIMB', theme: 'aurora', song: 'aurora', traffic: 56, t0: 37, t1: 35,
    rival: { name: 'ZENITH', car: 'gt', col: '#18181e', pace: 0.95 },
    road: [[80, 0, 0], [150, 5, 60], [120, -5, 40], [130, 6, -60], [100, 0, 80], [160, -6, 40], [120, 5, -80], [140, -4, 60], [110, 6, 60], [150, -5, -60], [120, 4, 80], [130, -6, 0], [110, 0, 40],
      'check', [150, 6, 80], [120, -6, -80], [140, 5, 60], [110, -5, 60], [160, 6, -60], [100, 0, 80], [150, -6, 40], [120, 5, 60], [140, -5, -80], [130, 6, 80], [120, -6, 40], [140, 4, 60], [140, 0, 0]]
  }
];

const ease = (a, b, t) => a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5);

/** Build the segment list for one stage. */
function buildTrack(si, diff) {
  const st = STAGES[si], th = THEMES[st.theme], segs = [], rnd = seeded(1000 + si * 77);
  let y = 0, check = 0;
  const push = (curve, yy) => {
    const n = segs.length;
    segs.push({ i: n, curve, y1: y, y2: yy, sprites: [], cars: [], c: Math.floor(n / 3) % 2, clip: 0 });
    y = yy;
  };
  const piece = (n, curve, hill) => {
    const a = Math.round(n * 0.3), h = n - a * 2, y0 = y, dy = hill * SEG, tot = n;
    for (let i = 0; i < a; i++) push(ease(0, curve, i / a), ease(y0, y0 + dy, (segs.length - startN + 1) / tot));
    for (let i = 0; i < h; i++) push(curve, ease(y0, y0 + dy, (segs.length - startN + 1) / tot));
    for (let i = 0; i < a; i++) push(ease(curve, 0, i / a), ease(y0, y0 + dy, (segs.length - startN + 1) / tot));
  };
  let startN = 0;
  for (const row of st.road) {
    if (row === 'check') { check = segs.length; continue; }
    startN = segs.length; piece(row[0], row[1], row[2]);
  }
  const goal = segs.length - 70;
  startN = segs.length; piece(260, 0, 0);            // run-out after the line
  const T = { si, st, th, segs, n: segs.length, len: segs.length * SEG, check, goal, start: 14, cars: [], snowFrom: st.id === 'pine' ? check - 200 : 1e9 };
  decorate(T, rnd);
  layHazards(T, rnd, diff);
  layTraffic(T, rnd, diff);
  return T;
}

function addSprite(T, i, name, off, ww, extra) {
  if (i < 0 || i >= T.n) return null;
  const s = Object.assign({ name, off, ww }, extra || {});
  T.segs[i].sprites.push(s);
  return s;
}

/** Scenery along the verges. Anything close to the road is solid if you leave the tarmac. */
function decorate(T, rnd) {
  const id = T.st.id, n = T.n;
  const side = () => (rnd() < 0.5 ? -1 : 1);
  addSprite(T, T.start, 'gantry:start', 0, 5200, { over: true });
  addSprite(T, T.check, 'gantry:check', 0, 5200, { over: true });
  addSprite(T, T.goal, 'gantry:goal', 0, 5200, { over: true });
  // warning chevrons on the outside of every hard bend, starting just before it tightens
  for (let i = 30; i < T.goal; i++) {
    const c = T.segs[i].curve, c0 = T.segs[i - 1].curve;
    if (Math.abs(c) >= 2.2 && Math.abs(c0) < 2.2 && Math.abs(T.segs[Math.min(n - 1, i + 40)].curve) >= 4.5) {
      const right = c > 0;
      for (let k = 0; k < 5; k++) addSprite(T, i - 6 + k * 13, 'chevR', right ? -1.5 : 1.5, 760, { solid: 0.12, flip: !right, sign: true });
    }
  }
  for (let i = 20; i < n; i++) {
    const r = rnd(), s = side(), snow = i > T.snowFrom;
    if (id === 'coast') {
      if (i % 9 === 0) addSprite(T, i, 'palm', 1.35 + rnd() * 0.2, 1500, { solid: 0.12 });
      if (i % 9 === 4 && rnd() < 0.8) addSprite(T, i, 'palm', -1.3 - rnd() * 0.15, 1500, { solid: 0.12 });
      if (r < 0.05) addSprite(T, i, 'bush', 1.7 + rnd() * 2.5, 900);
      else if (r < 0.075) addSprite(T, i, 'umbrella', -1.9 - rnd() * 0.9, 1100);
      else if (r < 0.085) addSprite(T, i, 'boat', -5 - rnd() * 7, 2200);
      else if (r < 0.1) addSprite(T, i, 'rock', 2.2 + rnd() * 3, 1200);
      if (i % 160 === 80) addSprite(T, i, 'board:' + Math.floor(rnd() * 8), 1.9, 2300, { solid: 0.3 });
    } else if (id === 'mesa') {
      if (r < 0.06) addSprite(T, i, 'cactus', s * (1.4 + rnd() * 2.2), 800, { solid: 0.1 });
      else if (r < 0.11) addSprite(T, i, 'drybush', s * (1.3 + rnd() * 3), 700);
      else if (r < 0.15) addSprite(T, i, 'rock', s * (1.6 + rnd() * 3), 1300, { solid: 0.28 });
      else if (r < 0.165) addSprite(T, i, 'mesa', s * (4 + rnd() * 6), 3600);
      if (i % 420 === 300) addSprite(T, i, 'arch:rock', 0, 5600, { over: true });
      if (i % 190 === 100) addSprite(T, i, 'board:' + Math.floor(rnd() * 8), s * 1.9, 2300, { solid: 0.3 });
    } else if (id === 'pine') {
      const tree = snow ? 'snowpine' : 'pine';
      if (i % 4 === 0) addSprite(T, i, tree, 1.35 + rnd() * 0.5, 1300, { solid: 0.1 });
      if (i % 4 === 2) addSprite(T, i, tree, -1.35 - rnd() * 0.5, 1300, { solid: 0.1 });
      if (r < 0.12) addSprite(T, i, tree, s * (2.4 + rnd() * 4), 1500);
      else if (r < 0.135) addSprite(T, i, 'cabin', s * (3 + rnd() * 2), 2600);
      else if (r < 0.16 && snow) addSprite(T, i, 'snowrock', s * (1.7 + rnd() * 2), 1300, { solid: 0.25 });
    } else if (id === 'neon') {
      if (i % 12 === 0) { addSprite(T, i, 'lamp', 1.22, 1100, { solid: 0.05 }); addSprite(T, i, 'lamp', -1.22, 1100, { solid: 0.05, flip: true }); }
      if (i % 22 === 10) addSprite(T, i, rnd() < 0.5 ? 'tower' : 'block', s * (2.6 + rnd() * 1.2), 2700);
      if (i % 22 === 21) addSprite(T, i, rnd() < 0.5 ? 'tower' : 'block', -s * (2.6 + rnd() * 1.6), 2700);
      if (r < 0.03) addSprite(T, i, 'neon', s * (1.5 + rnd() * 0.3), 800, { solid: 0.08 });
      if (i % 300 === 150) addSprite(T, i, 'arch:neon', 0, 5300, { over: true });
      if (i % 170 === 60) addSprite(T, i, 'board:' + Math.floor(rnd() * 8) + ':n', s * 1.9, 2300, { solid: 0.3 });
    } else {
      if (r < 0.1) addSprite(T, i, 'snowpine', s * (1.4 + rnd() * 3), 1300, { solid: 0.1 });
      else if (r < 0.15) addSprite(T, i, 'snowrock', s * (1.5 + rnd() * 3), 1400, { solid: 0.26 });
      else if (r < 0.16) addSprite(T, i, 'antenna', s * (2.4 + rnd() * 2), 1100);
      if (i % 260 === 130) addSprite(T, i, 'arch:ridge', 0, 5300, { over: true });
    }
  }
}

/** Hazards and pickups in the lanes. Never two solid things side by side, so there is always a way through. */
function layHazards(T, rnd, diff) {
  const id = T.st.id, n = T.goal - 40;
  const lane = () => Math.floor(rnd() * 3);
  let i = 110;
  while (i < n) {
    const r = rnd(), l = lane();
    if (Math.abs(i - T.check) < 30) { i += 30; continue; }
    if (r < 0.2) { for (let k = 0; k < 5; k++) addSprite(T, i + k * 5, 'coin', LANE_X[l], 300, { pick: 'coin' }); }
    else if (r < 0.3) addSprite(T, i, 'nitro', LANE_X[l], 420, { pick: 'nitro' });
    else if (r < 0.37) addSprite(T, i, 'clock', LANE_X[l], 420, { pick: 'clock' });
    else if (r < 0.58) {
      if (id === 'coast') { const l2 = l === 1 ? 0 : l; for (let k = 0; k < 6; k++) addSprite(T, i + k * 4, 'cone', LANE_X[l2] + (l2 === 0 ? 0.3 : -0.3) * (k / 5), 330, { hit: 'cone' }); }
      else if (id === 'mesa') addSprite(T, i, 'boulder', LANE_X[l] * 1.1, 900, { hit: 'solid', hw: 0.15 });
      else if (id === 'pine') addSprite(T, i, 'ice', LANE_X[l], 1700, { hit: 'ice', hw: 0.36, flat: true });
      else if (id === 'neon') addSprite(T, i, rnd() < 0.5 ? 'puddle' : 'oil', LANE_X[l], 1500, { hit: rnd() < 0.5 ? 'puddle' : 'oil', hw: 0.3, flat: true });
      else addSprite(T, i, rnd() < 0.5 ? 'ice' : 'oil', LANE_X[l], 1600, { hit: rnd() < 0.5 ? 'ice' : 'oil', hw: 0.32, flat: true });
    } else if (r < 0.66 && id !== 'coast') {
      // roadworks: one lane closed by a barrier with cones leading in
      const l2 = l === 1 ? 2 : l;
      for (let k = 0; k < 4; k++) addSprite(T, i + k * 5, 'cone', LANE_X[l2], 300, { hit: 'cone' });
      addSprite(T, i + 22, 'barrier', LANE_X[l2], 1250, { hit: 'solid', hw: 0.27 });
    }
    i += Math.round((46 + rnd() * 50) / (0.8 + 0.2 * diff.traffic));
  }
  // fix up hazard kinds that were picked with a second roll
  for (const s of T.segs) for (const sp of s.sprites) if (sp.hit && sp.flat) sp.hit = sp.name;
}

const TRAFFIC_COLS = ['#e8e4d8', '#3a8ad8', '#d8a020', '#3aa860', '#c84a4a', '#8a8e9a', '#e87a2a', '#6a4ac8'];
function layTraffic(T, rnd, diff) {
  const count = Math.round(T.st.traffic * diff.traffic), span = T.goal - 160;
  for (let k = 0; k < count; k++) {
    const r = rnd(), style = r < 0.4 ? 'sedan' : r < 0.62 ? 'coupe' : r < 0.86 ? 'van' : 'truck';
    const lane = Math.floor(rnd() * 3);
    T.cars.push({
      z: (130 + (k + rnd() * 0.8) * (span / count)) * SEG, off: LANE_X[lane], lane, style, col: TRAFFIC_COLS[Math.floor(rnd() * TRAFFIC_COLS.length)],
      speed: MAX_SPEED * (style === 'truck' ? 0.34 + rnd() * 0.08 : 0.4 + rnd() * 0.2), hw: style === 'truck' ? 0.155 : style === 'van' ? 0.135 : 0.13,
      passed: false, bump: 0, wob: rnd() * TAU
    });
  }
  T.cars.sort((a, b) => a.z - b.z);
}

function segAt(T, z) { return T.segs[clamp(Math.floor(z / SEG), 0, T.n - 1)]; }
function roadY(T, z) { const s = segAt(T, z), t = (z % SEG) / SEG; return s.y1 + (s.y2 - s.y1) * clamp(t, 0, 1); }
