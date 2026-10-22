/* ==========================================================================
   Stages: layout data, collision geometry and procedural parallax art
   ========================================================================== */

const LV_Y = [GROUND_Y, L1_Y, L2_Y];
const LAYER_W = 768;

function D(x0, x1, lv, style) { return { x0, x1, lv, y: LV_Y[lv], style }; }
function LAD(x, a, b) { return { x, lo: LV_Y[a], hi: LV_Y[b], a, b }; }

/* ---- art helpers -------------------------------------------------------- */
function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy));
    g.fillRect(Math.round(cx - w), Math.round(cy + dy), 2 * w + 1, 1);
  }
}
function tri(g, cx, top, w, h, c) {
  g.fillStyle = c;
  for (let y = 0; y < h; y++) {
    const hw = Math.round(((y + 1) / h) * w / 2);
    g.fillRect(Math.round(cx - hw), Math.round(top + y), hw * 2 + 1, 1);
  }
}
/** Banded vertical gradient with a dithered seam between bands, for that retro sky look. */
function bandSky(g, w, y0, h, stops, bands) {
  const col = (t) => {
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ca] = stops[i], [b, cb] = stops[i + 1];
      if (t <= b) return mixHex(ca, cb, (t - a) / Math.max(1e-6, b - a));
    }
    return stops[stops.length - 1][1];
  };
  const bh = h / bands;
  for (let i = 0; i < bands; i++) {
    const yA = Math.round(y0 + i * bh), yB = Math.round(y0 + (i + 1) * bh);
    rect(g, 0, yA, w, yB - yA, col((i + 0.5) / bands));
    if (i < bands - 1) {
      g.fillStyle = col((i + 1.5) / bands);
      for (let x = (yB % 2); x < w; x += 2) g.fillRect(x, yB - 1, 1, 1);
    }
  }
}
/** Tileable ridge line built from integer harmonics. Returns the per-column heights. */
function ridge(g, LW, base, harm, sharp, color, rnd, fillTo) {
  const ph = harm.map(() => rnd() * TAU);
  const ys = new Array(LW);
  for (let x = 0; x < LW; x++) {
    let y = base;
    for (let i = 0; i < harm.length; i++) {
      const s = Math.sin((x / LW) * TAU * harm[i][0] + ph[i]);
      y -= harm[i][1] * (sharp ? 1 - Math.abs(s) : (s + 1) / 2);
    }
    ys[x] = Math.round(y);
    rect(g, x, ys[x], 1, (fillTo || H) - ys[x], color);
  }
  return ys;
}
function wrapX(LW, x, w, fn) { fn(x); if (x - w < 0) fn(x + LW); if (x + w > LW) fn(x - LW); }

/* ---- deck, ladder and ground painters ----------------------------------- */
function paintLadder(g, L, s) {
  const x = Math.round(L.x);
  const top = L.hi - 12, bot = L.lo;
  rect(g, x - 6, top, 2, bot - top, s.lRail);
  rect(g, x + 4, top, 2, bot - top, s.lRail);
  rect(g, x - 6, top, 1, bot - top, s.lHi);
  rect(g, x + 4, top, 1, bot - top, s.lHi);
  for (let y = bot - 4; y > top + 1; y -= 6) { rect(g, x - 4, y, 8, 2, s.lRung); rect(g, x - 4, y + 1, 8, 1, s.lRail); }
}

function postsUnder(g, d, floorY, s, every) {
  const n = Math.max(2, Math.round((d.x1 - d.x0) / every));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(lerp(d.x0 + 4, d.x1 - 8, i / n));
    rect(g, x, d.y + 4, 5, floorY - d.y - 4, s.post);
    rect(g, x, d.y + 4, 1, floorY - d.y - 4, s.postHi);
    rect(g, x + 4, d.y + 4, 1, floorY - d.y - 4, s.postLo);
    if (i < n && s.brace) {
      const x2 = Math.round(lerp(d.x0 + 4, d.x1 - 8, (i + 1) / n));
      stampLine(g, x + 4, d.y + 6, x2, Math.min(floorY - 4, d.y + 26), 2, s.brace);
      stampLine(g, x + 4, Math.min(floorY - 4, d.y + 26), x2, d.y + 6, 2, s.brace);
    }
  }
}

function floorBelow(st, d) {
  let y = GROUND_Y;
  for (const o of st.decks) if (o.y > d.y && o.x0 <= d.x0 + 8 && o.x1 >= d.x1 - 8 && o.y < y) y = o.y;
  return y;
}

function paintDeck(g, st, d) {
  const s = st.look;
  const fy = floorBelow(st, d);
  const w = d.x1 - d.x0;
  const style = d.style || (s.deck === 'car' && d.lv === 2 ? 'steel' : s.deck);
  if (style === 'wood') {
    postsUnder(g, d, fy, s, 44);
    rect(g, d.x0, d.y, w, 6, s.dk);
    rect(g, d.x0, d.y, w, 1, s.dkHi);
    rect(g, d.x0, d.y + 5, w, 1, s.dkLo);
    for (let x = d.x0 + 9; x < d.x1; x += 11) rect(g, x, d.y + 1, 1, 4, s.dkLo);
    // rope rail
    for (let x = d.x0; x <= d.x1; x += 30) rect(g, x, d.y - 9, 2, 9, s.post);
    for (let x = d.x0; x < d.x1; x++) {
      const t = ((x - d.x0) % 30) / 30;
      rect(g, x, d.y - 8 + Math.round(Math.sin(t * Math.PI) * 2), 1, 1, s.rope);
    }
  } else if (style === 'car') {
    // box car standing on the rear track; the walkway passes in front of it
    const body = s.cars[(Math.abs(Math.round(d.x0 / 7)) % s.cars.length)];
    const bot = GROUND_Y - 12;
    rect(g, d.x0 + 2, d.y + 3, w - 4, bot - d.y - 3, body);
    rect(g, d.x0 + 2, d.y + 3, w - 4, 2, mixHex(body, '#ffffff', 0.2));
    for (let x = d.x0 + 10; x < d.x1 - 8; x += 12) rect(g, x, d.y + 7, 1, bot - d.y - 9, mixHex(body, '#000000', 0.25));
    const door = d.x0 + Math.round(w / 2) - 14;
    rect(g, door, d.y + 10, 28, bot - d.y - 12, mixHex(body, '#000000', 0.18));
    rect(g, door + 13, d.y + 10, 2, bot - d.y - 12, mixHex(body, '#000000', 0.35));
    rect(g, door - 2, d.y + 9, 32, 1, '#2a2a30');
    rect(g, d.x0 + 8, d.y + 12, 18, 7, mixHex(body, '#ffffff', 0.12));
    drawTextSmall(g, s.carTag, d.x0 + 9, d.y + 13, mixHex(body, '#000000', 0.45));
    // underframe and wheels
    rect(g, d.x0 + 4, bot, w - 8, 3, '#25262b');
    for (const wx of [d.x0 + 16, d.x0 + 30, d.x1 - 30, d.x1 - 16]) { disc(g, wx, bot + 6, 5, '#1d1e22'); disc(g, wx, bot + 6, 2, '#6b6f78'); }
    // couplers
    rect(g, d.x0 - 3, bot - 6, 5, 3, '#25262b'); rect(g, d.x1 - 2, bot - 6, 5, 3, '#25262b');
    // roof with snow
    rect(g, d.x0, d.y, w, 4, s.dk);
    rect(g, d.x0, d.y, w, 1, s.dkHi);
    rect(g, d.x0 + 1, d.y - 2, w - 2, 2, '#eef3f7');
    for (let x = d.x0 + 3; x < d.x1 - 3; x += 9) rect(g, x, d.y - 3, 4, 1, '#ffffff');
  } else if (style === 'steel' || style === 'girder') {
    const girder = style === 'girder';
    // truss columns
    const n = Math.max(1, Math.round(w / 70));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(lerp(d.x0 + 6, d.x1 - 12, i / n));
      rect(g, x, d.y + 5, 2, fy - d.y - 5, s.post); rect(g, x + 6, d.y + 5, 2, fy - d.y - 5, s.post);
      for (let y = d.y + 8; y < fy - 6; y += 10) { stampLine(g, x + 1, y, x + 7, y + 10, 1, s.brace); stampLine(g, x + 7, y, x + 1, y + 10, 1, s.brace); }
      rect(g, x, d.y + 5, 1, fy - d.y - 5, s.postHi);
    }
    rect(g, d.x0, d.y, w, girder ? 7 : 4, s.dk);
    rect(g, d.x0, d.y, w, 1, s.dkHi);
    rect(g, d.x0, d.y + (girder ? 6 : 3), w, 1, s.dkLo);
    if (girder) for (let x = d.x0 + 4; x < d.x1 - 2; x += 8) { rect(g, x, d.y + 2, 1, 1, s.rivet); rect(g, x, d.y + 4, 1, 1, s.rivet); }
    else for (let x = d.x0; x < d.x1; x += 8) rect(g, x, d.y + 4, 4, 2, x % 16 === 0 ? s.hazA : s.hazB);
    // railing
    rect(g, d.x0, d.y - 11, w, 1, s.rail);
    rect(g, d.x0, d.y - 6, w, 1, s.railLo);
    for (let x = d.x0; x <= d.x1; x += 16) rect(g, x, d.y - 11, 1, 11, s.rail);
    if (girder) { disc(g, d.x0 + 2, d.y - 13, 1, '#ff4a3a'); disc(g, d.x1 - 2, d.y - 13, 1, '#ff4a3a'); }
  }
}

function drawTextSmall(g, str, x, y, col) { drawText(g, str, x, y, col); }

/* ---- stage definitions --------------------------------------------------- */
const STAGES = [
  {
    id: 'jungle', name: 'JUNGLE OUTPOST', song: 'stageA', len: 3520,
    brief: ['A RIVER CAMP GUARDS THE ONLY ROAD', 'INTO THE MOUNTAINS. CUT THROUGH IT.'],
    decks: [D(260, 560, 1), D(760, 1240, 1), D(900, 1120, 2), D(1440, 1760, 1), D(1960, 2480, 1), D(2100, 2360, 2), D(2680, 2960, 1)],
    ladders: [LAD(278, 0, 1), LAD(542, 0, 1), LAD(780, 0, 1), LAD(1222, 0, 1), LAD(920, 1, 2), LAD(1100, 1, 2), LAD(1460, 0, 1), LAD(1742, 0, 1),
      LAD(1980, 0, 1), LAD(2462, 0, 1), LAD(2120, 1, 2), LAD(2340, 1, 2), LAD(2700, 0, 1), LAD(2942, 0, 1)],
    props: [
      { t: 'crate', x: 196, lv: 0, item: 'medal' }, { t: 'cage', x: 470, lv: 1, item: 'gren' }, { t: 'barrel', x: 660, lv: 0 },
      { t: 'crate', x: 1010, lv: 2, item: 'tri' }, { t: 'cage', x: 1330, lv: 0, item: 'medal' }, { t: 'barrel', x: 1590, lv: 0 },
      { t: 'crate', x: 1680, lv: 1, item: 'ration' }, { t: 'cage', x: 2250, lv: 2, item: 'life' }, { t: 'barrel', x: 2560, lv: 0 },
      { t: 'barrel', x: 2574, lv: 0 }, { t: 'crate', x: 2620, lv: 0, item: 'medal' }, { t: 'crate', x: 2880, lv: 1, item: 'gren' }
    ],
    events: [
      { at: 120, wave: [['grunt', 'R', 0, 0.3], ['grunt', 'R', 0, 1.6]] },
      { at: 380, e: 'officer', side: 'R', lv: 0, drop: 'tri' },
      { at: 640, wave: [['grunt', 'R', 1, 0], ['striker', 'R', 0, 0.8], ['grunt', 'L', 0, 1.6]] },
      { at: 900, e: 'sniper', x: 1090, lv: 2 },
      { at: 1260, wave: [['grunt', 'R', 0, 0], ['grunt', 'R', 0, 0.5], ['grunt', 'R', 1, 1], ['striker', 'L', 0, 1.8]] },
      { at: 1480, e: 'officer', side: 'R', lv: 1, drop: 'gren' },
      { at: 1860, dogs: 2 },
      { at: 2120, e: 'sniper', x: 2330, lv: 2 },
      { at: 2480, wave: [['striker', 'R', 0, 0], ['striker', 'R', 0, 0.7], ['grunt', 'R', 1, 1.2]] },
      { at: 2760, e: 'officer', side: 'R', lv: 0, drop: 'tri' },
      { at: 2980, wave: [['grunt', 'R', 0, 0], ['grunt', 'L', 0, 0.4], ['grunt', 'R', 1, 0.9], ['striker', 'R', 0, 1.5]] }
    ],
    ambient: { gap: [1.15, 2.2], max: 6, mix: { grunt: 7, striker: 2 }, left: 0.16, deck: 0.35, runner: 0.4 },
    boss: 'mauler', weather: 'pollen',
    look: {
      deck: 'wood', dk: '#8a5a32', dkHi: '#c58f55', dkLo: '#5a3a22', post: '#5d3d24', postHi: '#86593a', postLo: '#3f2816',
      brace: '#4f331d', rope: '#c9a463', lRail: '#7a5230', lHi: '#a8774a', lRung: '#c08a4f'
    }
  },
  {
    id: 'rail', name: 'FROZEN RAIL LINE', song: 'stageB', len: 3840,
    brief: ['THE ENEMY SUPPLY TRAIN RUNS THROUGH', 'THE PASS. STOP IT BEFORE THE TUNNEL.'],
    decks: [D(300, 420, 1), D(436, 556, 1), D(572, 692, 1), D(470, 640, 2),
      D(900, 1020, 1), D(1036, 1156, 1), D(1172, 1292, 1), D(1308, 1428, 1), D(1100, 1350, 2),
      D(1650, 1830, 1, 'steel'),
      D(2050, 2170, 1), D(2186, 2306, 1), D(2322, 2442, 1), D(2458, 2578, 1), D(2594, 2714, 1), D(2250, 2520, 2),
      D(2950, 3200, 1, 'steel')],
    ladders: [LAD(312, 0, 1), LAD(680, 0, 1), LAD(486, 1, 2), LAD(626, 1, 2),
      LAD(912, 0, 1), LAD(1416, 0, 1), LAD(1118, 1, 2), LAD(1334, 1, 2),
      LAD(1668, 0, 1), LAD(1812, 0, 1),
      LAD(2062, 0, 1), LAD(2702, 0, 1), LAD(2268, 1, 2), LAD(2504, 1, 2),
      LAD(2968, 0, 1), LAD(3182, 0, 1)],
    props: [
      { t: 'crate', x: 220, lv: 0, item: 'medal' }, { t: 'cage', x: 540, lv: 2, item: 'rocket' }, { t: 'barrel', x: 800, lv: 0 },
      { t: 'crate', x: 1200, lv: 1, item: 'gren' }, { t: 'cage', x: 1560, lv: 0, item: 'medal' }, { t: 'crate', x: 1740, lv: 1, item: 'ration' },
      { t: 'barrel', x: 1930, lv: 0 }, { t: 'barrel', x: 1944, lv: 0 }, { t: 'cage', x: 2400, lv: 2, item: 'life' },
      { t: 'crate', x: 2620, lv: 1, item: 'tri' }, { t: 'crate', x: 3060, lv: 1, item: 'medal' }, { t: 'cage', x: 3300, lv: 0, item: 'gren' }
    ],
    events: [
      { at: 100, wave: [['grunt', 'R', 0, 0.2], ['grenadier', 'R', 0, 1.4]] },
      { at: 420, e: 'officer', side: 'R', lv: 1, drop: 'gren' },
      { at: 560, e: 'sniper', x: 620, lv: 2 },
      { at: 820, para: 3 },
      { at: 1120, wave: [['grunt', 'R', 1, 0], ['grunt', 'R', 1, 0.5], ['grenadier', 'R', 0, 1], ['striker', 'L', 0, 1.5]] },
      { at: 1240, e: 'sniper', x: 1320, lv: 2 },
      { at: 1500, dogs: 2 },
      { at: 1760, e: 'officer', side: 'R', lv: 0, drop: 'rocket' },
      { at: 2080, para: 4 },
      { at: 2300, e: 'sniper', x: 2480, lv: 2 },
      { at: 2560, wave: [['grenadier', 'R', 0, 0], ['grunt', 'R', 1, 0.4], ['striker', 'R', 0, 1], ['grunt', 'L', 0, 1.4]] },
      { at: 2900, e: 'officer', side: 'R', lv: 1, drop: 'tri' },
      { at: 3150, dogs: 3 },
      { at: 3300, wave: [['grunt', 'R', 0, 0], ['grenadier', 'R', 0, 0.6], ['grunt', 'R', 1, 1.1]] }
    ],
    ambient: { gap: [1.05, 2.0], max: 7, mix: { grunt: 6, striker: 2, grenadier: 2 }, left: 0.18, deck: 0.4, runner: 0.35 },
    boss: 'ironclad', weather: 'snow',
    look: {
      deck: 'car', cars: ['#7a2f2a', '#3d5a7a', '#5a5f3d', '#6a3f5a'], carTag: 'KR-7', dk: '#5a5f66', dkHi: '#8a9098', dkLo: '#3a3d42',
      post: '#4a5058', postHi: '#6a727c', postLo: '#30343a', brace: '#3a3f46', rail: '#8a929c', railLo: '#5a6068',
      lRail: '#5a6470', lHi: '#8a96a4', lRung: '#a4b0bc', hazA: '#e3bd4b', hazB: '#2a2a2a', rivet: '#9aa2ac'
    }
  },
  {
    id: 'refinery', name: 'DESERT REFINERY', song: 'stageC', len: 3840,
    brief: ['THE FUEL DEPOT FEEDS THEIR GUNSHIPS.', 'WATCH FOR MINES IN THE SAND.'],
    decks: [D(240, 600, 1), D(380, 520, 2), D(820, 1160, 1), D(1360, 1900, 1), D(1500, 1760, 2), D(2120, 2420, 1),
      D(2640, 3100, 1), D(2760, 2980, 2), D(3480, 3580, 1), D(3716, 3816, 1)],
    ladders: [LAD(258, 0, 1), LAD(582, 0, 1), LAD(398, 1, 2), LAD(838, 0, 1), LAD(1142, 0, 1), LAD(1378, 0, 1), LAD(1882, 0, 1),
      LAD(1520, 1, 2), LAD(1740, 1, 2), LAD(2138, 0, 1), LAD(2402, 0, 1), LAD(2658, 0, 1), LAD(3082, 0, 1), LAD(2780, 1, 2),
      LAD(2960, 1, 2), LAD(3562, 0, 1), LAD(3734, 0, 1)],
    props: [
      { t: 'crate', x: 180, lv: 0, item: 'rocket' }, { t: 'barrel', x: 330, lv: 0 }, { t: 'barrel', x: 344, lv: 0 },
      { t: 'cage', x: 450, lv: 2, item: 'life' }, { t: 'mine', x: 700 }, { t: 'mine', x: 766 }, { t: 'crate', x: 1000, lv: 1, item: 'gren' },
      { t: 'mine', x: 1236 }, { t: 'mine', x: 1302 }, { t: 'barrel', x: 1420, lv: 1 }, { t: 'cage', x: 1640, lv: 2, item: 'rocket' },
      { t: 'crate', x: 1980, lv: 0, item: 'ration' }, { t: 'mine', x: 2030 }, { t: 'mine', x: 2096 }, { t: 'barrel', x: 2300, lv: 1 },
      { t: 'cage', x: 2520, lv: 0, item: 'medal' }, { t: 'mine', x: 2580 }, { t: 'crate', x: 2870, lv: 2, item: 'tri' },
      { t: 'barrel', x: 3150, lv: 0 }, { t: 'barrel', x: 3164, lv: 0 }, { t: 'mine', x: 3236 }, { t: 'mine', x: 3302 }
    ],
    events: [
      { at: 100, wave: [['grunt', 'R', 0, 0.2], ['gunner', 'R', 0, 1.2]] },
      { at: 380, e: 'officer', side: 'R', lv: 1, drop: 'rocket' },
      { at: 520, e: 'sniper', x: 500, lv: 2 },
      { at: 900, wave: [['striker', 'R', 0, 0], ['grunt', 'R', 1, 0.5], ['gunner', 'R', 0, 1.1], ['dog', 'L', 0, 1.6]] },
      { at: 1300, para: 3 },
      { at: 1560, e: 'sniper', x: 1700, lv: 2 },
      { at: 1700, e: 'officer', side: 'R', lv: 0, drop: 'gren' },
      { at: 2100, dogs: 3 },
      { at: 2380, wave: [['gunner', 'R', 1, 0], ['grenadier', 'R', 0, 0.6], ['striker', 'L', 0, 1.2]] },
      { at: 2700, e: 'sniper', x: 2940, lv: 2 },
      { at: 2900, e: 'officer', side: 'R', lv: 1, drop: 'rocket' },
      { at: 3200, wave: [['grunt', 'R', 0, 0], ['gunner', 'R', 0, 0.5], ['striker', 'R', 0, 1], ['grunt', 'L', 0, 1.3]] }
    ],
    ambient: { gap: [1.0, 1.9], max: 7, mix: { grunt: 4, striker: 2, gunner: 2, grenadier: 2, dog: 1 }, left: 0.2, deck: 0.4, runner: 0.3 },
    boss: 'gunship', weather: 'dust',
    look: {
      deck: 'steel', dk: '#4a4f5a', dkHi: '#7a808c', dkLo: '#2e3138', post: '#3c4048', postHi: '#5a606a', postLo: '#2a2d33',
      brace: '#33363d', rail: '#8a8f98', railLo: '#5a5f68', hazA: '#e3bd4b', hazB: '#2a2a2a',
      lRail: '#c49018', lHi: '#f0c040', lRung: '#e3b02a', rivet: '#9aa2ac'
    }
  },
  {
    id: 'citadel', name: 'IRON CITADEL', song: 'stageD', len: 4096,
    brief: ['GENERAL KROME HOLDS THE LAST CAPTIVES', 'INSIDE THE CITADEL. END THIS TONIGHT.'],
    decks: [D(220, 520, 1), D(340, 500, 2), D(700, 1080, 1), D(820, 1000, 2), D(1260, 1640, 1), D(1720, 2120, 1), D(1800, 2040, 2),
      D(2300, 2700, 1), D(2440, 2620, 2), D(2900, 3300, 1), D(3020, 3220, 2), D(3800, 4000, 1)],
    ladders: [LAD(238, 0, 1), LAD(502, 0, 1), LAD(358, 1, 2), LAD(718, 0, 1), LAD(1062, 0, 1), LAD(838, 1, 2), LAD(982, 1, 2),
      LAD(1278, 0, 1), LAD(1622, 0, 1), LAD(1738, 0, 1), LAD(2102, 0, 1), LAD(1818, 1, 2), LAD(2022, 1, 2),
      LAD(2318, 0, 1), LAD(2682, 0, 1), LAD(2458, 1, 2), LAD(2602, 1, 2), LAD(2918, 0, 1), LAD(3282, 0, 1),
      LAD(3038, 1, 2), LAD(3202, 1, 2), LAD(3818, 0, 1), LAD(3982, 0, 1)],
    props: [
      { t: 'crate', x: 160, lv: 0, item: 'tri' }, { t: 'cage', x: 440, lv: 2, item: 'rocket' }, { t: 'barrel', x: 620, lv: 0 },
      { t: 'crate', x: 930, lv: 2, item: 'medal' }, { t: 'cage', x: 1180, lv: 0, item: 'life' }, { t: 'barrel', x: 1500, lv: 1 },
      { t: 'crate', x: 1900, lv: 2, item: 'gren' }, { t: 'cage', x: 2200, lv: 0, item: 'medal' }, { t: 'barrel', x: 2560, lv: 1 },
      { t: 'crate', x: 2800, lv: 0, item: 'ration' }, { t: 'cage', x: 3120, lv: 2, item: 'rocket' }, { t: 'barrel', x: 3420, lv: 0 },
      { t: 'barrel', x: 3434, lv: 0 }, { t: 'crate', x: 3560, lv: 0, item: 'ration' }
    ],
    events: [
      { at: 100, wave: [['guard', 'R', 0, 0.3], ['grunt', 'R', 0, 1.2]] },
      { at: 380, e: 'officer', side: 'R', lv: 1, drop: 'tri' },
      { at: 480, e: 'sniper', x: 480, lv: 2 },
      { at: 820, wave: [['guard', 'R', 0, 0], ['striker', 'R', 1, 0.5], ['gunner', 'R', 0, 1.1], ['grunt', 'L', 0, 1.5]] },
      { at: 940, e: 'sniper', x: 990, lv: 2 },
      { at: 1300, dogs: 3 },
      { at: 1600, e: 'officer', side: 'R', lv: 0, drop: 'rocket' },
      { at: 1900, para: 4 },
      { at: 2200, wave: [['guard', 'R', 0, 0], ['guard', 'R', 1, 0.6], ['grenadier', 'R', 0, 1.2], ['striker', 'L', 0, 1.6]] },
      { at: 2480, e: 'sniper', x: 2610, lv: 2 },
      { at: 2700, e: 'officer', side: 'R', lv: 1, drop: 'gren' },
      { at: 3000, dogs: 2 },
      { at: 3100, e: 'sniper', x: 3200, lv: 2 },
      { at: 3360, wave: [['guard', 'R', 0, 0], ['gunner', 'R', 0, 0.5], ['striker', 'R', 0, 1], ['guard', 'L', 0, 1.4], ['grunt', 'R', 0, 1.9]] }
    ],
    ambient: { gap: [0.95, 1.8], max: 8, mix: { guard: 4, grunt: 3, striker: 2, gunner: 1, grenadier: 1, dog: 1 }, left: 0.22, deck: 0.42, runner: 0.3 },
    boss: 'krome', weather: 'rain',
    look: {
      deck: 'girder', dk: '#3a3f4c', dkHi: '#6a7080', dkLo: '#22252e', post: '#2c3039', postHi: '#4a505c', postLo: '#1c1e24',
      brace: '#262931', rail: '#5a606c', railLo: '#3a3f48', rivet: '#8a909c',
      lRail: '#6a707c', lHi: '#9aa0ac', lRung: '#b0b6c0'
    }
  }
];

/* ---- per-stage art --------------------------------------------------------- */
const ART = {
  jungle: {
    sky(g) {
      bandSky(g, W, 0, H, [[0, '#3f8fb5'], [0.45, '#8fd0c9'], [0.75, '#d9ebc0'], [1, '#f2e7b8']], 14);
      for (let r = 30; r > 16; r -= 4) { g.globalAlpha = 0.12; disc(g, 300, 58, r, '#fff6d8'); }
      g.globalAlpha = 1; disc(g, 300, 58, 14, '#fff3c9');
      const R = seeded(11);
      g.globalAlpha = 0.55;
      for (let i = 0; i < 6; i++) {
        const x = R() * W, y = 30 + R() * 50, w = 30 + R() * 50;
        rect(g, x, y, w, 3, '#eef9f2'); rect(g, x + 8, y - 2, w - 16, 2, '#eef9f2');
      }
      g.globalAlpha = 1;
    },
    far(g) {
      const R = seeded(3);
      ridge(g, LAYER_W, 132, [[2, 22], [5, 12], [11, 5]], true, '#86b8ac', R);
      ridge(g, LAYER_W, 150, [[3, 18], [7, 9], [13, 4]], true, '#6aa194', R);
      g.globalAlpha = 0.45; rect(g, 0, 140, LAYER_W, 20, '#d8efe2'); g.globalAlpha = 0.25; rect(g, 0, 128, LAYER_W, 12, '#d8efe2'); g.globalAlpha = 1;
      // a far waterfall
      rect(g, 520, 116, 6, 30, '#e8f6f4'); rect(g, 522, 116, 2, 30, '#ffffff');
    },
    mid(g) {
      const R = seeded(5);
      rect(g, 0, 168, LAYER_W, H - 168, '#24533a');
      for (let i = 0; i < 70; i++) {
        const x = R() * LAYER_W, y = 128 + R() * 34, r = 9 + Math.floor(R() * 14);
        wrapX(LAYER_W, x, r, (xx) => { disc(g, xx, y, r, '#2f6a4a'); disc(g, xx - 3, y - 3, Math.max(3, r - 5), '#3f8459'); });
      }
      for (let i = 0; i < 9; i++) {
        const x = R() * LAYER_W, h = 46 + R() * 26;
        wrapX(LAYER_W, x, 26, (xx) => {
          for (let y = 0; y < h; y += 2) rect(g, xx + Math.sin(y / 18) * 4, 172 - y, 3, 3, '#4a3f2c');
          const tx = xx + Math.sin(h / 18) * 4, ty = 172 - h;
          for (let a = 0; a < 7; a++) {
            const ang = -Math.PI + (a / 6) * Math.PI;
            const ex = tx + Math.cos(ang) * 22, ey = ty + Math.sin(ang) * 8 + 10;
            stampLine(g, tx, ty, (tx + ex) / 2, ty - 4 + Math.sin(ang) * 6, 2, '#2c6b40');
            stampLine(g, (tx + ex) / 2, ty - 4 + Math.sin(ang) * 6, ex, ey, 2, '#2c6b40');
          }
        });
      }
      for (let i = 0; i < 40; i++) {
        const x = R() * LAYER_W, y = 160 + R() * 14, r = 6 + Math.floor(R() * 8);
        wrapX(LAYER_W, x, r, (xx) => disc(g, xx, y, r, '#2a5c40'));
      }
    },
    near(g) {
      const R = seeded(8);
      for (let i = 0; i < 26; i++) {
        const x = R() * LAYER_W, r = 8 + Math.floor(R() * 10);
        wrapX(LAYER_W, x, r, (xx) => { disc(g, xx, 196, r, '#1f4a33'); disc(g, xx - 2, 193, Math.max(2, r - 5), '#2a6142'); });
      }
    },
    ground(g, len) {
      rect(g, 0, GROUND_Y, len, H - GROUND_Y, '#6b4a2f');
      rect(g, 0, GROUND_Y + 9, len, H - GROUND_Y - 9, '#5a3d26');
      rect(g, 0, GROUND_Y, len, 3, '#5c9a3e'); rect(g, 0, GROUND_Y, len, 1, '#8ccc5a');
      const R = seeded(21);
      for (let x = 0; x < len; x += 3) if (R() < 0.6) rect(g, x, GROUND_Y - 1 - Math.floor(R() * 2), 1, 2, '#6fae4a');
      for (let i = 0; i < len / 9; i++) rect(g, R() * len, GROUND_Y + 5 + R() * 15, 2 + R() * 2, 1, R() < 0.5 ? '#7d5a3a' : '#4a3220');
    },
    decor(g, st) {
      // huts under some decks, sandbags, signs, the boss palisade
      const R = seeded(31);
      for (const d of st.decks) {
        if (d.lv === 2) {
          // thatched watchtower roof
          const cx = (d.x0 + d.x1) / 2, w = d.x1 - d.x0 + 24;
          rect(g, d.x0 + 6, d.y - 40, 3, 40, '#5d3d24'); rect(g, d.x1 - 9, d.y - 40, 3, 40, '#5d3d24');
          for (let y = 0; y < 14; y++) rect(g, cx - w / 2 + (14 - y) * 1.2, d.y - 54 + y, w - (14 - y) * 2.4, 1, y % 3 === 0 ? '#9c7a3a' : '#c49a4a');
        }
      }
      for (let x = 120; x < st.len - 500; x += 260 + R() * 200) {
        // sandbag wall
        for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
          const bx = x + i * 9 + row * 4, by = GROUND_Y - 6 - row * 5;
          rect(g, bx, by, 9, 6, '#b49a62'); rect(g, bx, by, 9, 1, '#d4bc82'); rect(g, bx + 8, by, 1, 6, '#8a7444');
        }
      }
      const px0 = st.len - 18;
      for (let x = px0; x < st.len; x += 6) {
        rect(g, x, GROUND_Y - 96, 6, 96, '#6a4a2a'); rect(g, x, GROUND_Y - 96, 1, 96, '#8a6a3a');
        tri(g, x + 3, GROUND_Y - 103, 6, 7, '#6a4a2a');
      }
      rect(g, px0 - 2, GROUND_Y - 70, 22, 4, '#4a321c'); rect(g, px0 - 2, GROUND_Y - 30, 22, 4, '#4a321c');
    },
    front: ['fern', 'grass', 'grass', 'stump'],
    frontCol: '#143221'
  },

  rail: {
    sky(g) {
      bandSky(g, W, 0, H, [[0, '#7b8fa6'], [0.5, '#b4c3d1'], [1, '#e4eaef']], 12);
      const R = seeded(12);
      g.globalAlpha = 0.5;
      for (let i = 0; i < 8; i++) { const x = R() * W, y = 20 + R() * 60, w = 50 + R() * 70; rect(g, x, y, w, 5, '#d7e0e8'); rect(g, x + 10, y - 3, w - 20, 3, '#d7e0e8'); }
      g.globalAlpha = 1;
    },
    far(g) {
      const R = seeded(4);
      const ys = ridge(g, LAYER_W, 140, [[2, 46], [5, 16], [9, 6]], true, '#7d8ea3', R);
      for (let x = 0; x < LAYER_W; x++) { const cap = 108 - ys[x]; if (cap > 0) rect(g, x, ys[x], 1, Math.min(cap, 10 + (x % 3)), '#eef3f7'); }
      ridge(g, LAYER_W, 158, [[3, 20], [7, 8]], true, '#93a4b6', R);
      g.globalAlpha = 0.35; rect(g, 0, 146, LAYER_W, 30, '#eef3f7'); g.globalAlpha = 1;
    },
    mid(g) {
      const R = seeded(6);
      rect(g, 0, 176, LAYER_W, H - 176, '#d9e2ea');
      for (let i = 0; i < 60; i++) {
        const x = R() * LAYER_W, h = 26 + R() * 30, base = 178 + R() * 6;
        wrapX(LAYER_W, x, 12, (xx) => {
          tri(g, xx, base - h, 18, h, '#3d5a5a');
          for (let k = 0; k < 3; k++) tri(g, xx, base - h + k * (h / 3), 10 + k * 3, 3, '#eef3f7');
          rect(g, xx - 1, base, 3, 4, '#3a2c24');
        });
      }
      // telegraph poles with wires
      for (let x = 20; x < LAYER_W; x += 96) { rect(g, x, 120, 2, 58, '#4a3c32'); rect(g, x - 6, 124, 14, 2, '#4a3c32'); }
      for (let x = 0; x < LAYER_W; x++) { const t = ((x - 20 + LAYER_W) % 96) / 96; rect(g, x, 125 + Math.round(Math.sin(t * Math.PI) * 5), 1, 1, '#4a4a52'); }
    },
    near(g) {
      const R = seeded(9);
      for (let i = 0; i < 22; i++) { const x = R() * LAYER_W, r = 9 + Math.floor(R() * 9); wrapX(LAYER_W, x, r, (xx) => { disc(g, xx, 198, r, '#c7d2dc'); disc(g, xx - 2, 196, Math.max(3, r - 4), '#eef3f7'); }); }
    },
    ground(g, len) {
      rect(g, 0, GROUND_Y, len, H - GROUND_Y, '#c4ced8');
      rect(g, 0, GROUND_Y, len, 4, '#eef3f7'); rect(g, 0, GROUND_Y, len, 1, '#ffffff');
      // rear track the trains stand on
      for (let x = 0; x < len; x += 8) rect(g, x, GROUND_Y - 4, 5, 3, '#4a3a32');
      rect(g, 0, GROUND_Y - 6, len, 2, '#7a828c'); rect(g, 0, GROUND_Y - 6, len, 1, '#b4bcc6');
      const R = seeded(22);
      for (let i = 0; i < len / 7; i++) rect(g, R() * len, GROUND_Y + 6 + R() * 14, 3, 1, R() < 0.5 ? '#aab6c2' : '#dde5ec');
    },
    decor(g, st) {
      const R = seeded(32);
      for (let x = 180; x < st.len - 520; x += 300 + R() * 160) {
        // signal post
        rect(g, x, GROUND_Y - 60, 3, 60, '#3a3f46'); rect(g, x - 4, GROUND_Y - 66, 11, 9, '#22252a');
        disc(g, x + 1, GROUND_Y - 63, 2, R() < 0.5 ? '#ff4a3a' : '#4ad16a');
      }
      // tunnel mouth at the end
      const tx = st.len - 60;
      rect(g, tx, GROUND_Y - 120, 60, 120, '#5a5f66');
      for (let y = GROUND_Y - 120; y < GROUND_Y; y += 8) for (let x = tx + ((y / 8) % 2) * 6; x < st.len; x += 12) rect(g, x, y, 11, 7, '#6a7078');
      rect(g, tx + 14, GROUND_Y - 84, 46, 84, '#0f1014');
      disc(g, tx + 37, GROUND_Y - 84, 23, '#0f1014');
      rect(g, tx, GROUND_Y - 126, 60, 8, '#eef3f7');
    },
    front: ['drift', 'drift', 'post'],
    frontCol: '#a9b6c3'
  },

  refinery: {
    sky(g) {
      bandSky(g, W, 0, H, [[0, '#2a1c4a'], [0.35, '#7a2f5a'], [0.6, '#d2564a'], [0.8, '#f08a3a'], [1, '#f7c766']], 16);
      disc(g, 120, 150, 30, '#ffd27a');
      for (let y = 136; y < 180; y += 6) rect(g, 86, y, 70, 2, '#f0a24a');
      g.globalAlpha = 0.7;
      const R = seeded(13);
      for (let i = 0; i < 5; i++) { const x = R() * W, y = 40 + R() * 50; rect(g, x, y, 60 + R() * 60, 2, '#f0906a'); }
      g.globalAlpha = 1;
    },
    far(g) {
      const R = seeded(7);
      // mesas
      for (let i = 0; i < 6; i++) {
        const x = R() * LAYER_W, w = 60 + R() * 90, h = 24 + R() * 30;
        wrapX(LAYER_W, x, w, (xx) => { rect(g, xx, 170 - h, w, h + 50, '#6a2f48'); rect(g, xx - 6, 170 - h + 8, w + 12, h + 50, '#6a2f48'); rect(g, xx, 170 - h, w, 2, '#8a4a58'); });
      }
      ridge(g, LAYER_W, 176, [[3, 10], [8, 4]], false, '#4f2440', R);
    },
    mid(g) {
      const R = seeded(14);
      rect(g, 0, 178, LAYER_W, H - 178, '#2a1a2e');
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * 110 + R() * 30, r = 18 + Math.floor(R() * 10), top = 150 - Math.floor(R() * 16);
        rect(g, x - r, top, r * 2, 180 - top, '#3a2638'); rect(g, x - r, top, r * 2, 3, '#5a3a4a');
        rect(g, x - r + 3, top + 6, 2, 170 - top, '#4a3046');
        for (let y = top + 10; y < 176; y += 9) rect(g, x - r, y, r * 2, 1, '#2a1a2a');
      }
      for (let i = 0; i < 4; i++) {
        const x = 80 + i * 192 + R() * 40;
        rect(g, x, 92, 6, 90, '#2e1e2e'); rect(g, x - 2, 92, 10, 4, '#2e1e2e');
        for (let y = 100; y < 176; y += 12) { stampLine(g, x - 6, y, x + 12, y + 12, 1, '#3a2638'); }
      }
      for (let x = 0; x < LAYER_W; x += 1) if ((x % 140) < 100) rect(g, x, 168, 1, 3, '#4a3040');
    },
    near(g) {
      const R = seeded(10);
      for (let i = 0; i < 9; i++) {
        const x = R() * LAYER_W;
        wrapX(LAYER_W, x, 40, (xx) => { rect(g, xx, 186, 60, 6, '#5a3a3a'); rect(g, xx, 186, 60, 1, '#8a5a4a'); rect(g, xx + 10, 182, 4, 12, '#4a2e2e'); });
      }
    },
    ground(g, len) {
      rect(g, 0, GROUND_Y, len, H - GROUND_Y, '#c88a4a');
      rect(g, 0, GROUND_Y, len, 3, '#f0c27a'); rect(g, 0, GROUND_Y, len, 1, '#ffe0a0');
      const R = seeded(23);
      for (let i = 0; i < len / 6; i++) { const x = R() * len, y = GROUND_Y + 5 + R() * 15; rect(g, x, y, 4 + R() * 6, 1, R() < 0.5 ? '#b0763c' : '#dca262'); }
      // half buried pipe line
      rect(g, 0, GROUND_Y + 12, len, 5, '#6a5a52'); rect(g, 0, GROUND_Y + 12, len, 1, '#9a8a7a');
      for (let x = 30; x < len; x += 90) rect(g, x, GROUND_Y + 11, 6, 7, '#4a3e38');
    },
    decor(g, st) {
      const R = seeded(33);
      for (let x = 140; x < st.len - 520; x += 280 + R() * 200) {
        // valve stand and warning sign
        rect(g, x, GROUND_Y - 22, 4, 22, '#5a4e48'); disc(g, x + 2, GROUND_Y - 24, 5, '#b0302a'); disc(g, x + 2, GROUND_Y - 24, 2, '#e05a40');
        rect(g, x + 20, GROUND_Y - 30, 3, 30, '#4a4038'); rect(g, x + 13, GROUND_Y - 42, 17, 13, '#e3bd4b'); tri(g, x + 21, GROUND_Y - 40, 8, 8, '#2a2a2a');
      }
      // helipad markings in the arena
      const hx = st.len - W / 2;
      rect(g, hx - 70, GROUND_Y - 2, 140, 3, '#e3e3e3');
      drawText(g, 'H', hx - 3, GROUND_Y + 4, '#f0f0f0', { scale: 2 });
    },
    flares: [[86, 92], [278, 92], [470, 92], [662, 92]],
    front: ['pipe', 'rock', 'grass'],
    frontCol: '#3a1e1e'
  },

  citadel: {
    sky(g) {
      bandSky(g, W, 0, H, [[0, '#05070f'], [0.5, '#121935'], [1, '#2a2f52']], 12);
      const R = seeded(15);
      for (let i = 0; i < 70; i++) rect(g, R() * W, R() * 110, 1, 1, R() < 0.2 ? '#ffffff' : '#8a90b0');
      disc(g, 70, 48, 12, '#dfe4f2'); disc(g, 75, 45, 11, mixHex('#05070f', '#121935', 0.3));
      g.globalAlpha = 0.6; for (let i = 0; i < 6; i++) { const x = R() * W, y = 30 + R() * 60; rect(g, x, y, 80, 4, '#2a3050'); } g.globalAlpha = 1;
    },
    far(g) {
      const R = seeded(16);
      ridge(g, LAYER_W, 150, [[2, 40], [6, 12]], true, '#10142a', R);
      for (let i = 0; i < 5; i++) {
        const x = R() * LAYER_W, h = 40 + R() * 40, w = 14 + R() * 10;
        wrapX(LAYER_W, x, w, (xx) => {
          rect(g, xx, 150 - h, w, h + 70, '#0c0f20');
          for (let k = 0; k < w; k += 4) rect(g, xx + k, 147 - h, 2, 3, '#0c0f20');
          for (let y = 154 - h; y < 170; y += 8) if (R() < 0.5) rect(g, xx + 4, y, 2, 3, '#ffd27a');
        });
      }
    },
    mid(g) {
      const R = seeded(17);
      rect(g, 0, 120, LAYER_W, H - 120, '#1e2440');
      for (let x = 0; x < LAYER_W; x += 12) rect(g, x, 114, 7, 6, '#1e2440');
      for (let y = 124; y < H; y += 8) for (let x = ((y / 8) % 2) * 8; x < LAYER_W; x += 16) rect(g, x, y, 15, 1, '#171c33');
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 128 + R() * 20;
        rect(g, x, 96, 34, 130, '#1a2038'); for (let k = 0; k < 34; k += 8) rect(g, x + k, 90, 5, 6, '#1a2038');
        rect(g, x + 13, 112, 8, 12, '#3a2c18'); rect(g, x + 15, 114, 4, 8, '#ffcc66');
      }
      // banners
      for (let i = 0; i < 4; i++) { const x = 90 + i * 192; rect(g, x, 128, 16, 34, '#7a1e26'); disc(g, x + 8, 140, 4, '#d8b04a'); disc(g, x + 8, 140, 2, '#7a1e26'); tri(g, x + 8, 162, 16, 6, '#7a1e26'); }
    },
    near(g) {
      for (let x = 0; x < LAYER_W; x += 96) { rect(g, x, 150, 10, 46, '#14182a'); rect(g, x - 3, 148, 16, 4, '#1c2136'); }
    },
    ground(g, len) {
      rect(g, 0, GROUND_Y, len, H - GROUND_Y, '#4a4e5a');
      rect(g, 0, GROUND_Y, len, 3, '#7a7f8c'); rect(g, 0, GROUND_Y, len, 1, '#a0a6b2');
      for (let x = 0; x < len; x += 32) rect(g, x, GROUND_Y + 3, 1, H - GROUND_Y, '#3a3d46');
      for (let x = 0; x < len; x += 160) for (let k = 0; k < 24; k += 8) { rect(g, x + k, GROUND_Y + 14, 4, 3, '#e3bd4b'); rect(g, x + k + 4, GROUND_Y + 14, 4, 3, '#2a2a2a'); }
      const R = seeded(24);
      for (let i = 0; i < len / 10; i++) rect(g, R() * len, GROUND_Y + 5 + R() * 15, 2, 1, '#3a3d46');
    },
    decor(g, st) {
      const R = seeded(34);
      for (let x = 160; x < st.len - 520; x += 240 + R() * 160) {
        // wall lamp
        rect(g, x, GROUND_Y - 70, 2, 70, '#262931'); rect(g, x - 3, GROUND_Y - 74, 8, 4, '#3a3f4c'); rect(g, x - 2, GROUND_Y - 70, 6, 2, '#ffd27a');
        g.globalAlpha = 0.12; tri(g, x + 1, GROUND_Y - 68, 30, 68, '#ffd27a'); g.globalAlpha = 1;
      }
      // throne hall back wall and banners
      const ax = st.len - W;
      rect(g, ax + 20, 40, W - 40, GROUND_Y - 40, '#262a3c');
      for (let y = 44; y < GROUND_Y; y += 10) for (let x = ax + 20 + ((y / 10) % 2) * 10; x < st.len - 20; x += 20) rect(g, x, y, 19, 1, '#1e2232');
      for (const bx of [ax + 70, ax + W - 86]) {
        rect(g, bx, 54, 18, 70, '#8a1e26'); rect(g, bx, 54, 18, 3, '#d8b04a'); disc(g, bx + 9, 82, 6, '#d8b04a'); disc(g, bx + 9, 82, 3, '#8a1e26');
        tri(g, bx + 9, 124, 18, 8, '#8a1e26');
      }
    },
    front: ['rubble', 'chain', 'rubble', 'rubble'],
    frontCol: '#090b14'
  }
};

/* ---- building the layers --------------------------------------------------- */
function buildStageArt(st) {
  const art = ART[st.id];
  const L = {};
  L.sky = makeCanvas(W, H); art.sky(L.sky.getContext('2d'));
  for (const k of ['far', 'mid', 'near']) {
    L[k] = makeCanvas(LAYER_W, H);
    art[k](L[k].getContext('2d'));
  }
  L.level = makeCanvas(st.len, H);
  const g = L.level.getContext('2d');
  art.decor(g, st);
  // decks back to front: upper decks first so posts of lower decks overlap them
  const ds = st.decks.slice().sort((a, b) => a.y - b.y);
  for (const d of ds) paintDeck(g, st, d);
  for (const l of st.ladders) paintLadder(g, l, st.look);
  art.ground(g, st.len);
  // foreground scatter
  const R = seeded(st.len);
  L.front = [];
  for (let x = 40; x < st.len * 1.3; x += 90 + R() * 160) L.front.push({ x, kind: art.front[Math.floor(R() * art.front.length)], s: R() });
  return L;
}

function drawFrontPiece(g, f, sx, col, t) {
  const x = Math.round(sx);
  switch (f.kind) {
    case 'fern':
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.38 + Math.sin(t * 1.3 + f.s * 6) * 0.04;
        stampLine(g, x, H, x + Math.cos(a) * 26, H - 6 + Math.sin(a) * 18, 3, col);
      }
      break;
    case 'grass':
      for (let i = 0; i < 9; i++) stampLine(g, x + i * 3, H, x + i * 3 + Math.sin(t * 2 + i) * 2, H - 8 - ((i * 7) % 9), 2, col);
      break;
    case 'stump': disc(g, x, H + 2, 9, col); disc(g, x + 14, H + 4, 7, col); rect(g, x - 4, H - 4, 22, 4, col); break;
    case 'drift': disc(g, x, H + 4, 14, col); disc(g, x + 12, H + 6, 10, col); break;
    case 'post': rect(g, x, H - 30, 5, 30, '#3a3f46'); rect(g, x - 3, H - 32, 11, 3, '#eef3f7'); break;
    case 'pipe': rect(g, x - 30, H - 10, 90, 7, col); rect(g, x - 30, H - 10, 90, 1, '#6a3a32'); rect(g, x + 10, H - 13, 6, 13, col); break;
    case 'rock': disc(g, x, H + 2, 10, col); disc(g, x + 8, H + 4, 8, col); break;
    case 'pillar': rect(g, x, 0, 16, H, col); rect(g, x + 2, 0, 2, H, '#141a2c'); break;
    case 'chain': for (let y = HUD_H; y < 120; y += 6) rect(g, x + (y % 12 ? 0 : 1), y, 3, 5, col); break;
    case 'rubble': disc(g, x, H + 3, 8, col); rect(g, x + 6, H - 6, 9, 6, col); break;
    default: break;
  }
}
