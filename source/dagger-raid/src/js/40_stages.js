/* ==========================================================================
   Stages: layout data and collision geometry. The art lives in 41_stageart.js.
   ========================================================================== */

const LV_Y = [GROUND_Y, L1_Y, L2_Y];
const LAYER_W = 768;

function D(x0, x1, lv, style) { return { x0, x1, lv, y: LV_Y[lv], style }; }
function LAD(x, a, b) { return { x, lo: LV_Y[a], hi: LV_Y[b], a, b }; }
function wrapX(LW, x, w, fn) { fn(x); if (x - w < 0) fn(x + LW); if (x + w > LW) fn(x - LW); }

/** The surface a deck's supports stand on. */
function floorBelow(st, d) {
  let y = GROUND_Y;
  for (const o of st.decks) if (o.y > d.y && o.x0 <= d.x0 + 8 && o.x1 >= d.x1 - 8 && o.y < y) y = o.y;
  return y;
}

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

/* ---- ninjas on every stage, and the new weapons in the crates ------------------------ */
(function upgradeStages() {
  const ninjas = {
    jungle: [{ at: 1700, e: 'ninja', side: 'R', lv: 0 }, { at: 2640, e: 'ninja', side: 'L', lv: 0, drop: 'star' }],
    rail: [{ at: 700, e: 'ninja', side: 'R', lv: 1 }, { at: 1900, e: 'ninja', side: 'L', lv: 0, drop: 'star' }, { at: 3050, e: 'ninja', side: 'R', lv: 1 }],
    refinery: [{ at: 600, e: 'ninja', side: 'R', lv: 0 }, { at: 1450, e: 'ninja', side: 'R', lv: 1, drop: 'katana' }, { at: 2500, e: 'ninja', side: 'L', lv: 0 }, { at: 3050, e: 'ninja', side: 'R', lv: 0, drop: 'star' }],
    citadel: [{ at: 300, e: 'ninja', side: 'R', lv: 0 }, { at: 1100, e: 'ninja', side: 'L', lv: 0, drop: 'star' }, { at: 1750, e: 'ninja', side: 'R', lv: 1 },
      { at: 2600, e: 'ninja', side: 'R', lv: 0, drop: 'katana' }, { at: 3250, e: 'ninja', side: 'L', lv: 0 }]
  };
  const crates = {
    jungle: { 196: 'star', 2620: 'katana' }, rail: { 1200: 'flame', 3060: 'star' },
    refinery: { 1000: 'star', 2870: 'katana' }, citadel: { 930: 'flame', 1900: 'star' }
  };
  const mix = { jungle: 0, rail: 1, refinery: 1, citadel: 2 };
  for (const st of STAGES) {
    st.events.push(...ninjas[st.id]);
    st.events.sort((a, b) => a.at - b.at);
    for (const p of st.props) if (p.t === 'crate' && crates[st.id][p.x]) p.item = crates[st.id][p.x];
    if (mix[st.id]) st.ambient.mix.ninja = mix[st.id];
  }
})();
