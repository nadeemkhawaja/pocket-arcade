/* ==========================================================================
   Floors: layout data, hazards and painted HD temple art.
   Painters work in world units; artCanvas() renders them at screen resolution.
   ========================================================================== */

const LAYER_W = 768;
const BAY = 128;
const WALL_TOP = 48;          // under the ceiling beams
const WAIN_Y = 156;           // top of the wooden wainscot
const BASE_Y = 184;           // where the back wall meets the floor
const WIN_Y0 = 64, WIN_Y1 = 138;

/* ---- helpers ------------------------------------------------------------------- */
function stars(g, w, h, n, R, col) {
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, s = R();
    g.globalAlpha = 0.3 + s * 0.7;
    disc(g, x, y, 0.25 + s * 0.45, col || '#ffffff');
    if (s > 0.92) { g.globalAlpha = 0.25; disc(g, x, y, 1.6, col || '#ffffff'); }
  }
  g.globalAlpha = 1;
}
/** Tileable mountain ridge (integer harmonics) filled with a vertical gradient. */
function ridgeHD(g, LW, base, harm, sharp, top, bottom, rnd, fillTo) {
  const ph = harm.map(() => rnd() * TAU);
  const end = fillTo || H;
  g.beginPath(); g.moveTo(0, end);
  for (let x = 0; x <= LW; x += 2) {
    let y = base;
    for (let i = 0; i < harm.length; i++) {
      const s = Math.sin((x / LW) * TAU * harm[i][0] + ph[i]);
      y -= harm[i][1] * (sharp ? 1 - Math.abs(s) : (s + 1) / 2);
    }
    g.lineTo(x, y);
  }
  g.lineTo(LW, end); g.closePath();
  const minY = base - harm.reduce((a, h) => a + h[1], 0);
  g.fillStyle = lgrad(g, 0, minY, 0, end, [[0, top], [1, bottom]]);
  g.fill();
}
function mist(g, w, y, h, col, a) { g.fillStyle = lgrad(g, 0, y - h, 0, y + h, [[0, rgba(col, 0)], [0.5, rgba(col, a)], [1, rgba(col, 0)]]); g.fillRect(0, y - h, w, h * 2); }

/** A pagoda with curved, upturned eaves. */
function pagodaHD(g, cx, baseY, tiers, w0, tierH, body, roof, win, glow) {
  let y = baseY, w = w0;
  for (let i = 0; i < tiers; i++) {
    const bw = w * 0.6;
    g.fillStyle = body; g.fillRect(cx - bw / 2, y - tierH, bw, tierH);
    if (win) for (let kx = -1; kx <= 1; kx++) {
      const wx = cx + kx * bw * 0.28;
      rect(g, wx - 1.1, y - tierH * 0.7, 2.2, tierH * 0.42, win);
      if (glow) drawGlow(g, wx, y - tierH * 0.5, tierH * 0.9, '#ff9a40', 0.5);
    }
    const ey = y - tierH;
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(cx - w / 2 - 3, ey - 4.5);
    g.quadraticCurveTo(cx - w / 2 + 2, ey - 0.5, cx - w * 0.2, ey - 1.2);
    g.lineTo(cx + w * 0.2, ey - 1.2);
    g.quadraticCurveTo(cx + w / 2 - 2, ey - 0.5, cx + w / 2 + 3, ey - 4.5);
    g.lineTo(cx + w * 0.28, ey - 4.2); g.lineTo(cx - w * 0.28, ey - 4.2); g.closePath(); g.fill();
    y = ey - 4; w *= 0.84;
  }
  rect(g, cx - 0.8, y - 12, 1.6, 12, roof); disc(g, cx, y - 13, 1.8, roof);
}

/* ---- floor data ------------------------------------------------------------------- */
const LOOKS = {
  lantern: {
    wallTop: '#4e1212', wallBot: '#7c2219', panel: '#621614', panelHi: '#8e2c22', pillar: '#b02c22', pillarHi: '#f07a5a', pillarLo: '#4a0e0c',
    trim: '#d9a43a', trimHi: '#fff0b0', trimLo: '#7a4c10', beam: '#3a1a14', beamHi: '#6a3420', band: ['#1f6a5a', '#2a6aa0', '#1f6a5a', '#b8322a'], bandHi: '#8fe0c4',
    plinth: '#6e6058', plinthHi: '#b0a090', wain: '#341810', wainHi: '#5a2c1c', floor: '#5e3420', floorHi: '#8e5634', floorLo: '#22100a', seam: '#1e0e08',
    frame: '#2a120a', lattice: '#c58a3a', latticeHi: '#ffd890', shaft: '#ffd9a0', banner: '#b8281e', mural: '#3a0c10', reflect: 0.2, grade: '#ff8a3a'
  },
  drum: {
    wallTop: '#163430', wallBot: '#2c544c', panel: '#1c3c36', panelHi: '#3a6a5e', pillar: '#2f7a62', pillarHi: '#7ad0a8', pillarLo: '#0e3428',
    trim: '#d9a43a', trimHi: '#fff0b0', trimLo: '#7a4c10', beam: '#2a1a24', beamHi: '#4a2c3a', band: ['#b8322a', '#d9a43a', '#2a5aa0', '#d9a43a'], bandHi: '#ffe0a0',
    plinth: '#6a6460', plinthHi: '#aaa49e', wain: '#2a1818', wainHi: '#4a2c2a', floor: '#6a4428', floorHi: '#a06a3e', floorLo: '#2a170c', seam: '#22120a',
    frame: '#24140e', lattice: '#a8783a', latticeHi: '#ffd08a', shaft: '#ffc890', banner: '#d9a43a', mural: '#14302c', reflect: 0.2, grade: '#ffb060'
  },
  forge: {
    wallTop: '#1e1a1c', wallBot: '#3c3438', panel: '#2a2427', panelHi: '#4a4044', pillar: '#4a4448', pillarHi: '#8a8288', pillarLo: '#1a1618',
    trim: '#9a6a3a', trimHi: '#e0a060', trimLo: '#4a2a14', beam: '#1a1618', beamHi: '#3a3034', band: ['#3a3236', '#5a3a26', '#3a3236', '#6a2a1a'], bandHi: '#c08050',
    plinth: '#2a2426', plinthHi: '#5a5054', wain: '#201a1c', wainHi: '#3a3034', floor: '#3e383a', floorHi: '#6a5e5c', floorLo: '#141012', seam: '#121012',
    frame: '#1a1416', lattice: '#5a4a40', latticeHi: '#a08060', shaft: '#ff9a50', banner: '#7a2a1a', mural: '#1e1a1c', reflect: 0.08, grade: '#ff5a20'
  },
  mirror: {
    wallTop: '#1a1838', wallBot: '#2e2c58', panel: '#22204a', panelHi: '#3e3a78', pillar: '#5a4a8a', pillarHi: '#b8a8f0', pillarLo: '#241c44',
    trim: '#b8a0e8', trimHi: '#f4eeff', trimLo: '#5a4a8a', beam: '#16122c', beamHi: '#2e2652', band: ['#3a2a6a', '#4a7ac0', '#3a2a6a', '#b090e0'], bandHi: '#e0d8ff',
    plinth: '#5a5a7a', plinthHi: '#9a9ac0', wain: '#1a1832', wainHi: '#34305a', floor: '#1a3646', floorHi: '#3e7a90', floorLo: '#08141c', seam: '#0a1a24',
    frame: '#14122a', lattice: '#8a80c0', latticeHi: '#e0d8ff', shaft: '#b0d8ff', banner: '#5a3a9a', mural: '#16142a', reflect: 0.34, grade: '#6a8aff'
  }
};

const FLOORS = [
  {
    id: 'lantern', name: 'LANTERN HALL', dir: 1, len: 2240, song: 'floorA', boss: 'fan', time: 150,
    brief: ['THE CRIMSON FAN GUARDS THE', 'STAIRS. CLEAR THE HALL FIRST.'],
    mix: { thug: 10 }, gap: [0.9, 1.7], max: 5, behind: 0.3,
    events: [
      { at: 180, wave: [['thug', 'F', 0], ['thug', 'F', 0.7]] },
      { at: 420, e: 'dagger', side: 'F' },
      { at: 700, wave: [['thug', 'F', 0], ['thug', 'B', 0.4], ['thug', 'F', 0.9], ['thug', 'B', 1.4]] },
      { at: 960, e: 'dagger', side: 'F' },
      { at: 1240, e: 'dagger', side: 'B' },
      { at: 1480, wave: [['thug', 'F', 0], ['thug', 'F', 0.5], ['thug', 'F', 1.0], ['thug', 'B', 1.2]] },
      { at: 1600, e: 'dagger', side: 'F' }
    ],
    weather: 'motes', front: ['pillarF', 'lanternF'], hazard: null
  },
  {
    id: 'drum', name: 'DRUM GALLERY', dir: -1, len: 2400, song: 'floorB', boss: 'spear', time: 160,
    brief: ['WATCH THE SHELVES: VASES FALL.', 'TEMPLE MONKEYS STRIKE LOW.'],
    mix: { thug: 9, monkey: 2 }, gap: [0.8, 1.6], max: 6, behind: 0.32,
    events: [
      { at: 200, wave: [['monkey', 'F', 0], ['monkey', 'F', 0.6]] },
      { at: 420, e: 'dagger', side: 'F' },
      { at: 720, wave: [['thug', 'F', 0], ['thug', 'B', 0.3], ['monkey', 'F', 0.8], ['thug', 'F', 1.3]] },
      { at: 980, e: 'dagger', side: 'F' },
      { at: 1100, e: 'dagger', side: 'B' },
      { at: 1380, wave: [['monkey', 'B', 0], ['monkey', 'F', 0.4], ['monkey', 'F', 0.8]] },
      { at: 1620, e: 'dagger', side: 'F' },
      { at: 1760, wave: [['thug', 'F', 0], ['thug', 'F', 0.4], ['thug', 'B', 0.8], ['thug', 'B', 1.2]] }
    ],
    weather: 'motes', front: ['pillarF', 'tasselF'], hazard: 'vases'
  },
  {
    id: 'forge', name: 'IRON FORGE', dir: 1, len: 2400, song: 'floorA', boss: 'ox', time: 160,
    brief: ['FIRE VENTS GLOW BEFORE THEY BURST.', "SWEEP UNDER THE MONKS' SHIELDS."],
    mix: { thug: 9, monkey: 1 }, gap: [0.8, 1.5], max: 6, behind: 0.34,
    vents: [520, 860, 1160, 1480, 1780],
    events: [
      { at: 260, e: 'monk', side: 'F' },
      { at: 560, e: 'dagger', side: 'F' },
      { at: 760, wave: [['thug', 'F', 0], ['thug', 'B', 0.3], ['thug', 'F', 0.7], ['monkey', 'B', 1.1]] },
      { at: 1000, e: 'monk', side: 'F' },
      { at: 1300, e: 'dagger', side: 'B' },
      { at: 1400, e: 'dagger', side: 'F' },
      { at: 1640, e: 'monk', side: 'B' },
      { at: 1700, wave: [['thug', 'F', 0], ['thug', 'F', 0.4], ['thug', 'F', 0.8]] }
    ],
    weather: 'embers', front: ['chainF', 'pillarF'], hazard: 'vents'
  },
  {
    id: 'mirror', name: 'MIRROR SHRINE', dir: -1, len: 2400, song: 'floorB', boss: 'mirror', time: 160,
    brief: ['SHADOW NINJAS STEP OUT OF SMOKE.', 'PUNCH THE SPIRIT WISPS AWAY.'],
    mix: { thug: 8, monkey: 1, ninja: 1 }, gap: [0.85, 1.6], max: 6, behind: 0.36,
    events: [
      { at: 220, e: 'ninja' },
      { at: 520, e: 'dagger', side: 'F' },
      { at: 760, e: 'ninja' },
      { at: 900, wave: [['thug', 'F', 0], ['thug', 'B', 0.3], ['thug', 'F', 0.6], ['thug', 'B', 0.9]] },
      { at: 1150, e: 'monk', side: 'F' },
      { at: 1300, e: 'ninja' },
      { at: 1520, e: 'dagger', side: 'B' },
      { at: 1700, e: 'ninja' },
      { at: 1760, e: 'dagger', side: 'F' }
    ],
    weather: 'fireflies', front: ['pillarF', 'silkF'], hazard: 'wisps', reflect: true
  },
  {
    id: 'summit', name: 'DRAGON SUMMIT', dir: 1, len: 2080, song: 'summit', boss: 'abbot', time: 170,
    brief: ['GRANDMASTER HU WAITS ON THE ROOF.', 'LIGHTNING MARKS WHERE IT STRIKES.'],
    mix: { thug: 7, monkey: 1, ninja: 1, dagger: 1 }, gap: [0.8, 1.5], max: 6, behind: 0.38,
    events: [
      { at: 200, e: 'ninja' },
      { at: 420, e: 'monk', side: 'F' },
      { at: 640, wave: [['monkey', 'F', 0], ['monkey', 'B', 0.4], ['thug', 'F', 0.8], ['thug', 'B', 1.1]] },
      { at: 900, e: 'dagger', side: 'F' },
      { at: 1000, e: 'ninja' },
      { at: 1200, e: 'monk', side: 'B' },
      { at: 1380, wave: [['thug', 'F', 0], ['thug', 'F', 0.3], ['thug', 'B', 0.6], ['thug', 'B', 0.9], ['thug', 'F', 1.2]] },
      { at: 1500, e: 'dagger', side: 'F' }
    ],
    weather: 'storm', front: ['flagF'], hazard: 'bolts', outdoor: true
  }
];


/** Converts "distance walked" on a floor into a world x. */
function floorX(F, progress) { return F.dir > 0 ? progress : F.len - progress; }
function stairX(F) { return F.dir > 0 ? F.len - 52 : 52; }
function arenaX0(F) { return F.dir > 0 ? F.len - W : 0; }

/* ---- temple painters --------------------------------------------------------------- */
function paintWallBase(g, len, A, R) {
  g.fillStyle = lgrad(g, 0, HUD_H, 0, BASE_Y, [[0, A.wallTop], [0.55, A.wallBot], [1, shade(A.wallBot, -0.15)]]);
  g.fillRect(0, HUD_H, len, BASE_Y - HUD_H);
  // faint grain and wear in the lacquer
  for (let i = 0; i < len / 3; i++) {
    const x = R() * len, y = WALL_TOP + R() * (WAIN_Y - WALL_TOP);
    g.globalAlpha = 0.03 + R() * 0.04;
    rect(g, x, y, 0.4 + R() * 0.6, 4 + R() * 26, R() < 0.5 ? '#000000' : '#ffffff');
  }
  g.globalAlpha = 1;
  for (let x = 0; x < len; x += BAY) {
    const x0 = x + 15, w = BAY - 30, y0 = WALL_TOP + 7, h = WAIN_Y - WALL_TOP - 14;
    rect(g, x0, y0, w, h, A.panel);
    g.fillStyle = lgrad(g, 0, y0, 0, y0 + h, [[0, rgba(A.panelHi, 0.35)], [0.5, rgba(A.panelHi, 0.08)], [1, rgba('#000000', 0.18)]]);
    g.fillRect(x0 + 2, y0 + 2, w - 4, h - 4);
    rect(g, x0, y0, w, 0.8, rgba('#000000', 0.45)); rect(g, x0, y0, 0.8, h, rgba('#000000', 0.35));
    rect(g, x0, y0 + h - 0.8, w, 0.8, rgba(A.panelHi, 0.5)); rect(g, x0 + w - 0.8, y0, 0.8, h, rgba(A.panelHi, 0.35));
  }
  // shadow under the beams
  g.fillStyle = lgrad(g, 0, WALL_TOP, 0, WALL_TOP + 22, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, WALL_TOP, len, 22);
}

function paintPillar(g, x, A) {
  const w = 15, y0 = WALL_TOP - 2, y1 = BASE_Y + 3;
  // ambient shadow on the wall either side
  g.fillStyle = lgrad(g, x - w / 2 - 12, 0, x - w / 2, 0, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]); g.fillRect(x - w / 2 - 12, y0, 12, y1 - y0);
  g.fillStyle = lgrad(g, x + w / 2, 0, x + w / 2 + 12, 0, [[0, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x + w / 2, y0, 12, y1 - y0);
  g.fillStyle = lgrad(g, x - w / 2, 0, x + w / 2, 0, [[0, A.pillarLo], [0.2, A.pillar], [0.34, A.pillarHi], [0.48, A.pillar], [0.82, shade(A.pillar, -0.25)], [1, A.pillarLo]]);
  g.fillRect(x - w / 2, y0, w, y1 - y0);
  const band = (yy, hh) => {
    g.fillStyle = lgrad(g, 0, yy, 0, yy + hh, [[0, A.trimHi], [0.35, A.trim], [1, A.trimLo]]);
    g.fillRect(x - w / 2 - 1, yy, w + 2, hh);
    g.fillStyle = lgrad(g, x - w / 2, 0, x + w / 2, 0, [[0, 'rgba(0,0,0,0.35)'], [0.3, 'rgba(255,255,255,0.15)'], [1, 'rgba(0,0,0,0.4)']]);
    g.fillRect(x - w / 2 - 1, yy, w + 2, hh);
  };
  band(y0 + 3, 4.5); band(WAIN_Y - 9, 4.5);
  // stone plinth
  g.fillStyle = lgrad(g, 0, BASE_Y - 8, 0, BASE_Y + 3, [[0, A.plinthHi], [0.25, A.plinth], [1, shade(A.plinth, -0.35)]]);
  roundRectPath(g, x - w / 2 - 3.5, BASE_Y - 8, w + 7, 11, 1.2); g.fill();
  // bracket set (dougong) holding the beam
  const by = WALL_TOP - 5;
  for (const [bw, bh, yy] of [[30, 3.2, by], [20, 3, by + 3.2], [11, 3, by + 6]]) {
    g.fillStyle = lgrad(g, 0, yy, 0, yy + bh, [[0, A.beamHi], [1, A.beam]]);
    roundRectPath(g, x - bw / 2, yy, bw, bh, 0.8); g.fill();
    rect(g, x - bw / 2, yy, bw, 0.5, rgba(A.trim, 0.8));
  }
}

function paintCeiling(g, len, A) {
  g.fillStyle = lgrad(g, 0, HUD_H, 0, WALL_TOP, [[0, shade(A.beam, -0.4)], [0.3, A.beamHi], [1, A.beam]]);
  g.fillRect(0, HUD_H, len, WALL_TOP - HUD_H);
  const y = HUD_H + 4.5, h = 8.5;
  for (let x = 0, i = 0; x < len; x += 26, i++) {
    const c = A.band[i % A.band.length];
    g.fillStyle = lgrad(g, 0, y, 0, y + h, [[0, shade(c, 0.25)], [0.5, c], [1, shade(c, -0.35)]]);
    g.fillRect(x, y, 26, h);
    g.strokeStyle = rgba('#ffffff', 0.55); g.lineWidth = 0.35;
    g.beginPath(); g.ellipse(x + 13, y + h / 2, 9, 3, 0, 0, TAU); g.stroke();
    disc(g, x + 13, y + h / 2, 1.9, A.trim); disc(g, x + 12.6, y + h / 2 - 0.5, 0.8, A.trimHi);
    rect(g, x, y, 0.6, h, rgba('#000000', 0.5));
  }
  for (const yy of [y - 0.8, y + h]) { g.fillStyle = lgrad(g, 0, yy, 0, yy + 0.9, [[0, A.trimHi], [1, A.trimLo]]); g.fillRect(0, yy, len, 0.9); }
  rect(g, 0, WALL_TOP - 2.5, len, 2.5, rgba('#000000', 0.5));
}

function paintWainscot(g, len, A) {
  g.fillStyle = lgrad(g, 0, WAIN_Y, 0, BASE_Y, [[0, A.wainHi], [0.15, A.wain], [1, shade(A.wain, -0.3)]]);
  g.fillRect(0, WAIN_Y, len, BASE_Y - WAIN_Y);
  g.fillStyle = lgrad(g, 0, WAIN_Y - 1, 0, WAIN_Y + 2, [[0, A.trimHi], [0.5, A.trim], [1, A.trimLo]]); g.fillRect(0, WAIN_Y - 0.5, len, 2.4);
  for (let x = 6; x < len; x += 32) {
    rect(g, x, WAIN_Y + 7, 24, 16, rgba('#000000', 0.25));
    rect(g, x + 0.6, WAIN_Y + 7.6, 23.4, 15.4, rgba(A.wainHi, 0.35));
    g.fillStyle = lgrad(g, 0, WAIN_Y + 8, 0, WAIN_Y + 22, [[0, A.wain], [1, shade(A.wain, -0.2)]]);
    g.fillRect(x + 1.2, WAIN_Y + 8.2, 22.2, 14.2);
  }
}

function paintFloorHD(g, cv, len, A, tiles) {
  g.fillStyle = lgrad(g, 0, BASE_Y, 0, H, [[0, A.floorHi], [0.3, A.floor], [1, A.floorLo]]);
  g.fillRect(0, BASE_Y, len, H - BASE_Y);
  // the polished floor mirrors the bottom of the wall
  g.save();
  g.beginPath(); g.rect(0, BASE_Y, len, H - BASE_Y); g.clip();
  g.globalAlpha = A.reflect;
  g.translate(0, BASE_Y * 2); g.scale(1, -1);
  g.drawImage(cv, 0, (BASE_Y - 40) * cv.rs, cv.width, 40 * cv.rs, 0, BASE_Y - 40, len, 40);
  g.restore();
  g.fillStyle = lgrad(g, 0, BASE_Y, 0, H, [[0, rgba(A.floor, 0)], [0.6, rgba(A.floorLo, 0.4)], [1, rgba(A.floorLo, 0.8)]]);
  g.fillRect(0, BASE_Y, len, H - BASE_Y);
  // boards or tiles in perspective
  const rows = [BASE_Y, BASE_Y + 3.2, BASE_Y + 7.2, BASE_Y + 12.2, BASE_Y + 18.4, BASE_Y + 25.8, H];
  const R = seeded(len + 99);
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r], y1 = rows[r + 1];
    const step = tiles ? 20 + r * 7 : 48 + r * 16;
    for (let x = -(r * 37) % step; x < len; x += step) {
      g.globalAlpha = 0.05 + R() * 0.06;
      rect(g, x, y0, step, y1 - y0, R() < 0.5 ? '#000000' : '#ffffff');
      g.globalAlpha = 1;
      rect(g, x, y0, 0.45, y1 - y0, rgba(A.seam, 0.8));
    }
    rect(g, 0, y0, len, 0.45, rgba(A.seam, 0.85));
    rect(g, 0, y0 + 0.45, len, 0.35, rgba('#ffffff', 0.06));
  }
  g.fillStyle = lgrad(g, 0, BASE_Y, 0, BASE_Y + 3, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, BASE_Y, len, 3);
}

function lightShaft(g, cx, y, w, col) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = lgrad(g, 0, y, 0, BASE_Y + 24, [[0, rgba(col, 0.14)], [1, rgba(col, 0)]]);
  g.beginPath(); g.moveTo(cx - w / 2, y); g.lineTo(cx + w / 2, y); g.lineTo(cx + w / 2 + 36, BASE_Y + 24); g.lineTo(cx - w / 2 + 30, BASE_Y + 24); g.closePath(); g.fill();
  g.restore();
}

function paintWindow(g, cx, A, round) {
  const y0 = WIN_Y0, y1 = WIN_Y1, cy = (y0 + y1) / 2;
  if (round) {
    const r = 34;
    disc(g, cx, cy, r + 6, A.frame);
    g.strokeStyle = lgrad(g, cx - r, cy - r, cx + r, cy + r, [[0, A.trimHi], [0.5, A.trim], [1, A.trimLo]]);
    g.lineWidth = 2.2; g.beginPath(); g.arc(cx, cy, r + 4.6, 0, TAU); g.stroke();
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
    g.clearRect(cx - r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2);
    for (let k2 = -r + 6; k2 < r; k2 += 11) {
      rect(g, cx - r, cy + k2, r * 2, 1.8, A.lattice); rect(g, cx - r, cy + k2, r * 2, 0.5, A.latticeHi);
      rect(g, cx + k2, cy - r, 1.8, r * 2, A.lattice); rect(g, cx + k2, cy - r, 0.5, r * 2, A.latticeHi);
    }
    g.fillStyle = rgrad(g, cx - r * 0.3, cy - r * 0.4, 2, r * 1.3, [[0, rgba(A.shaft, 0.16)], [1, rgba(A.shaft, 0)]]);
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
    g.restore();
    ring(g, cx, cy, r + 1.2, 1.4, rgba('#000000', 0.6));
  } else {
    const w = 70, x0 = cx - w / 2;
    g.fillStyle = lgrad(g, 0, y0 - 6, 0, y1 + 6, [[0, shade(A.frame, 0.2)], [1, shade(A.frame, -0.3)]]);
    g.fillRect(x0 - 6, y0 - 6, w + 12, y1 - y0 + 12);
    g.clearRect(x0, y0, w, y1 - y0);
    for (let x = x0 + 8; x < x0 + w - 2; x += 12) { rect(g, x, y0, 1.9, y1 - y0, A.lattice); rect(g, x, y0, 0.55, y1 - y0, A.latticeHi); }
    for (let y = y0 + 9; y < y1 - 2; y += 13) { rect(g, x0, y, w, 1.9, A.lattice); rect(g, x0, y, w, 0.55, A.latticeHi); }
    for (const [ax, ay] of [[x0, y0], [x0 + w - 12, y0], [x0, y1 - 12], [x0 + w - 12, y1 - 12]]) { rect(g, ax, ay + 5, 12, 1.9, A.lattice); rect(g, ax + 5, ay, 1.9, 12, A.lattice); }
    g.fillStyle = rgrad(g, cx - 10, y0 + 18, 2, w, [[0, rgba(A.shaft, 0.14)], [1, rgba(A.shaft, 0)]]);
    g.fillRect(x0, y0, w, y1 - y0);
    for (const yy of [y0 - 6, y1 + 3.6]) { g.fillStyle = lgrad(g, 0, yy, 0, yy + 2.4, [[0, A.trimHi], [1, A.trimLo]]); g.fillRect(x0 - 6, yy, w + 12, 2.4); }
    g.fillStyle = lgrad(g, 0, y1 + 6, 0, y1 + 10, [[0, A.wainHi], [1, shade(A.wainHi, -0.4)]]);
    g.fillRect(x0 - 8, y1 + 6, w + 16, 3.4);
    rect(g, x0, y0, w, 1.2, 'rgba(0,0,0,0.5)'); rect(g, x0, y0, 1.2, y1 - y0, 'rgba(0,0,0,0.4)');
  }
  lightShaft(g, cx, y1, round ? 46 : 62, A.shaft);
}

function paintMural(g, cx, A, R) {
  const w = 98, h = 64, x0 = cx - w / 2, y0 = 69;
  g.fillStyle = lgrad(g, x0, y0, x0 + w, y0 + h, [[0, A.trimHi], [0.5, A.trim], [1, A.trimLo]]);
  g.fillRect(x0 - 5, y0 - 5, w + 10, h + 10);
  rect(g, x0 - 2, y0 - 2, w + 4, h + 4, A.frame);
  g.fillStyle = lgrad(g, 0, y0, 0, y0 + h, [[0, shade(A.mural, 0.12)], [1, shade(A.mural, -0.2)]]);
  g.fillRect(x0, y0, w, h);
  // clouds
  g.strokeStyle = rgba(A.trim, 0.35); g.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) { const cx2 = x0 + 12 + R() * (w - 24), cy2 = y0 + 8 + R() * (h - 16); g.beginPath(); g.arc(cx2, cy2, 3, 0, Math.PI * 1.5); g.arc(cx2 + 4.5, cy2 - 1, 2.2, Math.PI, Math.PI * 2.4); g.stroke(); }
  // the dragon, chasing the flaming pearl, in gold leaf
  const ph = R() * TAU, mid = y0 + h / 2 + 2;
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;   // from the tail on the right to the neck on the left
    pts.push([x0 + w - 8 - t * (w - 34), mid + Math.sin(t * 6.4 + ph) * 12 * (0.55 + 0.45 * t), 0.5 + 3.1 * smooth01(t / 0.55)]);
  }
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  const FR = tubeFrames(pts);
  for (const i of [22, 46]) { const [x, y, r] = pts[i], [tx, ty, nx, ny] = FR[i]; const sg = ny > 0 ? 1 : -1; dragonLeg(g, x, y, r, nx * sg, ny * sg, tx, ty, true, 0.6); }
  dragonBody(g, pts, true);
  const [hx, hy] = pts[64];
  g.save(); g.translate(hx + 1, hy + 0.5); g.scale(-0.55, 0.55); dragonHead(g, null); g.restore();
  dragonPearl(g, hx + 1 - 15.7, hy + 1.5, 0.6);
  g.restore();
}

function paintBanner(g, cx, A, R) {
  const y0 = WALL_TOP, y1 = 116 + R() * 12;
  stampLine(g, cx, y0 - 3, cx, y0 + 3, 0.8, A.trim);
  g.fillStyle = lgrad(g, cx - 9, 0, cx + 9, 0, [[0, shade(A.banner, -0.3)], [0.3, shade(A.banner, 0.18)], [0.55, A.banner], [1, shade(A.banner, -0.4)]]);
  g.beginPath(); g.moveTo(cx - 9, y0 + 2); g.lineTo(cx + 9, y0 + 2); g.lineTo(cx + 9, y1); g.lineTo(cx, y1 - 6); g.lineTo(cx - 9, y1); g.closePath(); g.fill();
  g.fillStyle = lgrad(g, 0, y0 + 1, 0, y0 + 4, [[0, A.trimHi], [1, A.trimLo]]); g.fillRect(cx - 11, y0 + 1, 22, 2.6);
  const ey = y0 + 28;
  g.fillStyle = rgrad(g, cx - 2, ey - 2, 0.5, 7, [[0, A.trimHi], [0.6, A.trim], [1, A.trimLo]]);
  g.beginPath(); g.arc(cx, ey, 6.4, 0, TAU); g.fill();
  rect(g, cx - 2, ey - 2, 4, 4, A.banner);
  ring(g, cx, ey, 5.2, 0.4, rgba(A.trimLo, 0.8));
  for (let i = 0; i < 3; i++) rrect(g, cx - 4.5 + i * 3.4, ey + 13 + i * 7, 2, 4.5, 0.8, rgba(A.trim, 0.85));
  stampLine(g, cx, y1 - 6, cx, y1 + 2, 0.8, A.trim);
  g.fillStyle = lgrad(g, 0, y1 + 2, 0, y1 + 12, [[0, '#e8392a'], [1, '#7a1410']]);
  g.beginPath(); g.moveTo(cx - 1.4, y1 + 2); g.lineTo(cx + 1.4, y1 + 2); g.lineTo(cx + 2.4, y1 + 12); g.lineTo(cx - 2.4, y1 + 12); g.closePath(); g.fill();
}

function paintDrum(g, cx) {
  const cy = 116, r = 23;
  stampLine(g, cx - 17, BASE_Y, cx + 9, cy + 9, 3, '#3a2214'); stampLine(g, cx + 17, BASE_Y, cx - 9, cy + 9, 3, '#2a180e');
  stampLine(g, cx - 17, BASE_Y, cx + 9, cy + 9, 0.8, '#6a4228');
  rect(g, cx - 19, BASE_Y - 3, 38, 3, '#2a180e');
  g.fillStyle = rgrad(g, cx - 6, cy - 8, 2, r + 5, [[0, '#d8402e'], [0.75, '#8a1f1a'], [1, '#4a0e0c']]);
  g.beginPath(); g.arc(cx, cy, r + 4.5, 0, TAU); g.fill();
  g.fillStyle = rgrad(g, cx - 7, cy - 8, 2, r, [[0, '#fff8e8'], [0.6, '#ecdcbc'], [1, '#bca47c']]);
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(178,40,32,0.85)'; g.lineWidth = 2.2; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a0 = (i * TAU) / 3;
    g.beginPath();
    for (let t = 0; t <= 1.001; t += 0.05) { const a = a0 + t * 2.3, rr = 2.5 + t * 12; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; if (t === 0) g.moveTo(px, py); else g.lineTo(px, py); }
    g.stroke();
  }
  ring(g, cx, cy, r - 1.5, 0.6, 'rgba(120,80,40,0.4)');
  for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; disc(g, cx + Math.cos(a) * (r + 2.2), cy + Math.sin(a) * (r + 2.2), 0.95, '#e0b040'); disc(g, cx + Math.cos(a) * (r + 2.2) - 0.3, cy + Math.sin(a) * (r + 2.2) - 0.3, 0.35, '#fff4c0'); }
}

function paintShelf(g, cx, A, R) {
  const x0 = cx - 35;
  for (const y of [100, 134]) {
    g.fillStyle = lgrad(g, 0, y, 0, y + 4, [[0, '#8a5a32'], [1, '#3a2010']]); g.fillRect(x0, y, 70, 4);
    rect(g, x0 + 3, y + 4, 3, 7, '#2a1a10'); rect(g, x0 + 64, y + 4, 3, 7, '#2a1a10');
    rect(g, x0, y + 4, 70, 2, 'rgba(0,0,0,0.3)');
    for (let i = 0; i < 3; i++) drawVase(g, x0 + 13 + i * 22, y, R() < 0.5 ? 0 : 1, 0.95);
  }
}

function paintFurnace(g, cx) {
  const x0 = cx - 35, y0 = 80;
  for (let y = y0; y < BASE_Y; y += 8) for (let x = x0 + ((y / 8) % 2) * 6; x < x0 + 70; x += 12) {
    g.fillStyle = lgrad(g, 0, y, 0, y + 7.4, [[0, '#4e4648'], [1, '#2a2426']]);
    roundRectPath(g, x, y, Math.min(11.4, x0 + 70 - x), 7.4, 1); g.fill();
  }
  const mx = cx, my = 150;
  g.save();
  g.beginPath(); g.moveTo(mx - 24, BASE_Y - 3); g.lineTo(mx - 24, my); g.arc(mx, my, 24, Math.PI, 0); g.lineTo(mx + 24, BASE_Y - 3); g.closePath(); g.clip();
  g.fillStyle = lgrad(g, 0, my - 24, 0, BASE_Y, [[0, '#1a0806'], [0.5, '#7a1e0a'], [0.85, '#ff7a2a'], [1, '#ffd060']]);
  g.fillRect(mx - 25, my - 25, 50, 60);
  for (let i = 0; i < 30; i++) { const px = mx - 21 + (i * 7.3) % 42, py = BASE_Y - 6 - (i % 4) * 2; ellipse(g, px, py, 2.4, 1.3, 0, i % 3 ? '#ff8a2a' : '#ffe070'); }
  g.restore();
  g.strokeStyle = '#5a4a40'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(mx - 25, BASE_Y - 3); g.lineTo(mx - 25, my); g.arc(mx, my, 25, Math.PI, 0); g.lineTo(mx + 25, BASE_Y - 3); g.stroke();
  g.fillStyle = lgrad(g, 0, y0 - 7, 0, y0 + 2, [[0, '#5a4e48'], [1, '#1e1a1c']]); g.fillRect(x0 - 5, y0 - 7, 80, 9);
  g.fillStyle = lgrad(g, cx - 12, 0, cx + 12, 0, [[0, '#141012'], [0.4, '#2e2a2c'], [1, '#141012']]); g.fillRect(cx - 12, WALL_TOP, 24, y0 - 7 - WALL_TOP);
}

function paintRack(g, cx) {
  for (const y of [84, 150]) { g.fillStyle = lgrad(g, 0, y, 0, y + 4, [[0, '#7a5232'], [1, '#2a1a10']]); g.fillRect(cx - 27, y, 54, 4); }
  for (let i = 0; i < 5; i++) {
    const x = cx - 20 + i * 10;
    stampLine(g, x, 74, x, 162, 1.8, '#5a3a20'); stampLine(g, x - 0.4, 74, x - 0.4, 162, 0.5, '#9a6a3a');
    if (i % 2) { poly(g, [x - 1.4, 74, x, 62, x + 1.4, 74], '#c9d6e6'); poly(g, [x - 0.2, 73, x, 63, x + 1.2, 73.4], '#ffffff'); rect(g, x - 1.6, 76, 3.2, 2, '#a3282a'); }
    else { stampLine(g, x - 3.5, 71, x + 3.5, 71, 1.2, '#8a6a3a'); poly(g, [x - 1.2, 70, x, 56, x + 1.2, 70], '#c9d6e6'); stampLine(g, x, 70, x, 58, 0.4, '#ffffff'); }
  }
}

function paintChains(g, cx) {
  for (const dx of [-18, 0, 18]) for (let y = WALL_TOP; y < 104 + dx * 0.5; y += 5) {
    const v = ((y / 5) | 0) % 2;
    g.strokeStyle = v ? '#3e3638' : '#2a2426'; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(cx + dx, y + 2.5, v ? 1.1 : 1.9, 2.8, 0, 0, TAU); g.stroke();
  }
  g.fillStyle = rgrad(g, cx - 2, 106, 1, 8, [[0, '#6a6268'], [1, '#1e1a1c']]);
  g.beginPath(); g.arc(cx, 109, 7.5, 0, TAU); g.fill();
}

function paintMirror(g, cx) {
  const cy = 94, r = 17;
  g.fillStyle = lgrad(g, cx - r, cy - r, cx + r, cy + r, [[0, '#ffe8a0'], [0.5, '#c9a24a'], [1, '#6a4a14']]);
  g.beginPath(); g.arc(cx, cy, r + 4.5, 0, TAU); g.fill();
  g.fillStyle = rgrad(g, cx - 5, cy - 6, 1, r * 1.2, [[0, '#f4fbff'], [0.35, '#b8d0ec'], [1, '#4a6a90']]);
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
  g.globalAlpha = 0.6; stampLine(g, cx - 14, cy + 4, cx + 2, cy - 16, 3, '#ffffff'); stampLine(g, cx - 8, cy + 10, cx + 8, cy - 10, 1.2, '#ffffff');
  g.restore();
  stampLine(g, cx, cy - r - 12, cx, cy - r - 4, 1, '#c9a24a');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; disc(g, cx + Math.cos(a) * (r + 2.3), cy + Math.sin(a) * (r + 2.3), 0.6, '#fff0b0'); }
}

function paintAltar(g, cx) {
  g.fillStyle = lgrad(g, 0, 138, 0, 146, [[0, '#8a7ab8'], [1, '#3a2a5a']]); roundRectPath(g, cx - 31, 138, 62, 7, 1.2); g.fill();
  g.fillStyle = lgrad(g, 0, 145, 0, BASE_Y, [[0, '#4a3a7a'], [1, '#1e1638']]);
  g.beginPath(); g.moveTo(cx - 28, 145); g.lineTo(cx + 28, 145); g.lineTo(cx + 30, BASE_Y); g.lineTo(cx - 30, BASE_Y); g.closePath(); g.fill();
  stampLine(g, cx - 28, 150, cx + 28, 150, 0.8, '#b8a0e8');
  g.fillStyle = rgrad(g, cx - 3, 128, 1, 12, [[0, '#d0b070'], [1, '#5a4420']]); roundRectPath(g, cx - 10, 127, 20, 11, 2); g.fill();
  for (let i = 0; i < 3; i++) stampLine(g, cx - 4 + i * 4, 127, cx - 4 + i * 4, 113, 0.6, '#c9a463');
  for (const dx of [-22, 18]) {
    g.fillStyle = lgrad(g, cx + dx, 0, cx + dx + 4, 0, [[0, '#d8d0c0'], [0.4, '#fffaf0'], [1, '#bcb4a4']]); g.fillRect(cx + dx, 124, 4, 14);
    g.fillStyle = rgrad(g, cx + dx + 2, 121, 0.2, 3, [[0, '#ffffff'], [0.4, '#ffd27a'], [1, 'rgba(255,140,40,0)']]);
    g.beginPath(); g.ellipse(cx + dx + 2, 121, 1.4, 3, 0, 0, TAU); g.fill();
  }
}

function paintStairs(g, F, A) {
  const sx = stairX(F), d = F.dir;
  const x0 = sx - 30, w = 60, top = 58;
  g.fillStyle = lgrad(g, x0 - 7, 0, x0 + w + 7, 0, [[0, A.trimLo], [0.2, A.trimHi], [0.5, A.trim], [1, A.trimLo]]);
  g.fillRect(x0 - 7, top - 7, w + 14, BASE_Y - top + 7);
  rect(g, x0 - 4, top - 4, w + 8, BASE_Y - top + 4, A.frame);
  g.fillStyle = lgrad(g, 0, top, 0, BASE_Y, [[0, '#2a1810'], [0.4, '#0c0608'], [1, '#050304']]);
  g.fillRect(x0, top, w, BASE_Y - top);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const yy = BASE_Y - (i + 1) * 13;
    const xa = d > 0 ? x0 + i * 6 : x0 + w - (i + 1) * 6 - 18;
    g.fillStyle = lgrad(g, 0, yy, 0, yy + 13, [[0, shade(A.floorHi, -0.1 - i * 0.04)], [0.18, shade(A.floor, -0.25 - i * 0.05)], [1, shade(A.floor, -0.55 - i * 0.03)]]);
    g.fillRect(xa, yy, 24, 13);
  }
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = lgrad(g, 0, top, 0, top + 40, [[0, rgba(A.shaft, 0.35)], [1, rgba(A.shaft, 0)]]); g.fillRect(x0, top, w, 40);
  g.restore();
  g.fillStyle = lgrad(g, 0, top - 19, 0, top - 7, [[0, A.trimHi], [1, A.trimLo]]); roundRectPath(g, sx - 23, top - 19, 46, 12, 1.5); g.fill();
  rect(g, sx - 21, top - 17, 42, 8, '#2a1410');
  const ax = d > 0 ? 1 : -1;
  stampLine(g, sx - 7 * ax, top - 13, sx + 7 * ax, top - 13, 1.1, A.trimHi);
  stampLine(g, sx + 7 * ax, top - 13, sx + 3.5 * ax, top - 15.8, 1.1, A.trimHi);
  stampLine(g, sx + 7 * ax, top - 13, sx + 3.5 * ax, top - 10.2, 1.1, A.trimHi);
}

function paintHall(F) {
  const A = LOOKS[F.id], len = F.len;
  const [cv, g] = artCanvas(len, H);
  const R = seeded(len * 7 + F.dir * 3 + F.id.length);
  const lights = [], lanterns = [];
  paintWallBase(g, len, A, R);
  paintWainscot(g, len, A);
  const sx = stairX(F);
  const plan = {
    lantern: ['window', 'mural', 'window', 'banner', 'round', 'window', 'banner'],
    drum: ['drum', 'shelf', 'window', 'drum', 'banner', 'shelf', 'round'],
    forge: ['furnace', 'rack', 'chains', 'furnace', 'banner', 'rack'],
    mirror: ['round', 'mirror', 'altar', 'round', 'mirror', 'banner']
  }[F.id];
  let k = Math.floor(R() * plan.length);
  for (let x = BAY / 2; x < len; x += BAY) {
    if (Math.abs(x - sx) < 70) continue;
    const kind = plan[k++ % plan.length];
    if (kind === 'window') paintWindow(g, x, A, false);
    else if (kind === 'round') paintWindow(g, x, A, true);
    else if (kind === 'mural') paintMural(g, x, A, R);
    else if (kind === 'banner') { paintBanner(g, x - 24, A, R); paintBanner(g, x + 24, A, R); }
    else if (kind === 'drum') paintDrum(g, x);
    else if (kind === 'shelf') paintShelf(g, x, A, R);
    else if (kind === 'furnace') { paintFurnace(g, x); lights.push({ x, y: 160, r: 58, col: '#ff6a1a', f: 0.35, ph: R() * TAU }); }
    else if (kind === 'rack') paintRack(g, x);
    else if (kind === 'chains') paintChains(g, x);
    else if (kind === 'mirror') { paintMirror(g, x); lights.push({ x, y: 94, r: 34, col: '#8ab8ff', f: 0.1, ph: R() * TAU }); }
    else if (kind === 'altar') { paintAltar(g, x); lights.push({ x: x - 20, y: 121, r: 18, col: '#ffb060', f: 0.3, ph: R() * TAU }, { x: x + 20, y: 121, r: 18, col: '#ffb060', f: 0.3, ph: R() * TAU }); }
    if ((F.id === 'lantern' || F.id === 'drum') && kind !== 'banner') {
      const lx = x + BAY / 2;
      if (Math.abs(lx - sx) > 60) lanterns.push({ x: lx, y: WALL_TOP + 4, ph: R() * TAU, len: 10 + Math.floor(R() * 14) });
    }
  }
  for (let x = 0; x <= len; x += BAY) if (Math.abs(x - sx) > 44) paintPillar(g, x, A);
  paintCeiling(g, len, A);
  paintStairs(g, F, A);
  paintFloorHD(g, cv, len, A, F.id === 'mirror' || F.id === 'forge');
  if (F.id === 'forge') for (const p of F.vents) {
    const vx = floorX(F, p);
    g.fillStyle = lgrad(g, 0, GROUND_Y - 3, 0, GROUND_Y + 3, [[0, '#3a2a26'], [1, '#0e0a0a']]);
    roundRectPath(g, vx - 15, GROUND_Y - 3, 30, 6.5, 1.5); g.fill();
    for (let i = 0; i < 7; i++) rect(g, vx - 12.5 + i * 3.8, GROUND_Y - 2, 1.6, 4.5, '#1a0e0c');
  }
  for (const l of lights) { drawGlow(g, l.x, l.y, l.r, l.col, 0.85); l.r *= 0.55; l.live = true; }
  for (const l of lanterns) lights.push({ x: l.x, y: l.y + l.len + 9, r: 36, col: '#ff8a3a', f: 0.12, ph: l.ph, lantern: l });
  return { level: cv, lights, lanterns };
}

/* ---- skies seen through the windows (tileable) ------------------------------------------ */
function paintOutside(F) {
  const [cv, g] = artCanvas(LAYER_W, H);
  const R = seeded(F.len + 11);
  if (F.id === 'lantern' || F.id === 'forge') {
    g.fillStyle = lgrad(g, 0, 0, 0, H, [[0, '#080a24'], [0.45, '#1a1c4a'], [0.75, '#3c2a60'], [1, '#6e3a6a']]); g.fillRect(0, 0, LAYER_W, H);
    stars(g, LAYER_W, 130, 170, R);
    for (const mx of [150, 530]) {
      drawGlow(g, mx, 96, 60, '#fff0c8', 0.5);
      g.fillStyle = rgrad(g, mx - 5, 91, 2, 18, [[0, '#fffaf0'], [1, '#ecdcb8']]); g.beginPath(); g.arc(mx, 96, 17, 0, TAU); g.fill();
      disc(g, mx + 5, 92, 3.5, 'rgba(200,180,140,0.45)'); disc(g, mx - 6, 100, 2.6, 'rgba(200,180,140,0.4)');
    }
    ridgeHD(g, LAYER_W, 150, [[2, 24], [5, 9], [11, 3]], true, '#4a3a78', '#1e1a40', R);
    for (let i = 0; i < 4; i++) pagodaHD(g, 90 + i * 190 + R() * 40, 150 - R() * 6, 3 + Math.floor(R() * 2), 26, 8, '#1a163a', '#141032', '#ffb060', true);
    ridgeHD(g, LAYER_W, 172, [[3, 14], [7, 5]], true, '#2a2450', '#120e2a', R);
    mist(g, LAYER_W, 160, 10, '#c8b8f0', 0.25);
  } else if (F.id === 'drum') {
    g.fillStyle = lgrad(g, 0, 0, 0, H, [[0, '#2a1a4a'], [0.4, '#8a3a6a'], [0.72, '#f07a4a'], [1, '#ffd27a']]); g.fillRect(0, 0, LAYER_W, H);
    for (const sx2 of [220, 600]) { drawGlow(g, sx2, 138, 70, '#ffd890', 0.7); disc(g, sx2, 138, 18, '#fff4c8'); }
    for (let i = 0; i < 7; i++) { const cx2 = R() * LAYER_W, cy2 = 60 + R() * 50; g.globalAlpha = 0.35; ellipse(g, cx2, cy2, 30 + R() * 30, 4 + R() * 3, 0, '#ffb0a0'); } g.globalAlpha = 1;
    ridgeHD(g, LAYER_W, 150, [[2, 30], [4, 10]], false, '#9a4a7a', '#5a2a5a', R);
    ridgeHD(g, LAYER_W, 166, [[3, 16], [8, 4]], false, '#6a3060', '#3a1a40', R);
    for (let y = 172; y < H; y += 7) { g.globalAlpha = 0.18; rect(g, 0, y, LAYER_W, 1.2, '#ffb070'); } g.globalAlpha = 1;
    for (let i = 0; i < 9; i++) { const bx = R() * LAYER_W, by = 60 + R() * 50; g.strokeStyle = '#3a1a3a'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(bx - 3, by - 2); g.quadraticCurveTo(bx - 1, by - 2, bx, by); g.quadraticCurveTo(bx + 1, by - 2, bx + 3, by - 2); g.stroke(); }
  } else {
    g.fillStyle = lgrad(g, 0, 0, 0, H, [[0, '#040a22'], [0.5, '#0e2448'], [0.85, '#1e4a6a'], [1, '#2a6a7a']]); g.fillRect(0, 0, LAYER_W, H);
    stars(g, LAYER_W, 150, 240, R, '#d8f0ff');
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      g.fillStyle = lgrad(g, 0, 40 + i * 16, 0, 70 + i * 16, [[0, 'rgba(0,0,0,0)'], [0.5, i % 2 ? 'rgba(90,255,190,0.12)' : 'rgba(140,120,255,0.12)'], [1, 'rgba(0,0,0,0)']]);
      g.beginPath(); g.moveTo(0, 50 + i * 16);
      for (let x = 0; x <= LAYER_W; x += 16) g.lineTo(x, 46 + i * 16 + Math.sin((x / LAYER_W) * TAU * 3 + i) * 10);
      for (let x = LAYER_W; x >= 0; x -= 16) g.lineTo(x, 66 + i * 16 + Math.sin((x / LAYER_W) * TAU * 3 + i + 0.6) * 10);
      g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    drawGlow(g, 420, 70, 30, '#cfe8ff', 0.6);
    disc(g, 420, 70, 12, '#eef8ff'); disc(g, 425, 66, 11, '#0e2448');
    for (let x = 4; x < LAYER_W; x += 9 + Math.floor(R() * 8)) {
      const top = 80 + R() * 60, c = R() < 0.5 ? '#0a1e22' : '#0e262a';
      rect(g, x, top, 2.6, H - top, c);
      for (let y = top + 10; y < H; y += 16) rect(g, x - 0.8, y, 4.2, 0.9, '#16343a');
      for (let j = 0; j < 3; j++) { g.fillStyle = c; g.beginPath(); g.ellipse(x + (j % 2 ? 5 : -4), top + j * 12 - 3, 5, 1.4, j % 2 ? -0.5 : 0.5, 0, TAU); g.fill(); }
    }
  }
  return cv;
}

/* ---- the summit: an open roof terrace under a storm ------------------------------------------ */
function paintSummit(F) {
  const len = F.len;
  const L = {};
  let g;
  [L.sky, g] = artCanvas(W, H);
  g.fillStyle = lgrad(g, 0, 0, 0, H, [[0, '#07081a'], [0.4, '#1a1636'], [0.7, '#3a2448'], [1, '#6e3450']]); g.fillRect(0, 0, W, H);
  stars(g, W, 90, 80, seeded(5));
  drawGlow(g, 300, 64, 70, '#ffe8d0', 0.55);
  g.fillStyle = rgrad(g, 295, 59, 2, 17, [[0, '#fffaf0'], [1, '#f0dcc0']]); g.beginPath(); g.arc(300, 64, 16, 0, TAU); g.fill();
  disc(g, 296, 60, 3.6, 'rgba(200,170,140,0.4)'); disc(g, 305, 70, 2.4, 'rgba(200,170,140,0.35)');
  const R = seeded(91);
  [L.far, g] = artCanvas(LAYER_W, H);
  ridgeHD(g, LAYER_W, 140, [[2, 34], [5, 12], [13, 3]], true, '#4a3a6e', '#1e1636', R);
  ridgeHD(g, LAYER_W, 160, [[3, 18], [9, 5]], true, '#2e2450', '#140e26', R);
  mist(g, LAYER_W, 156, 12, '#a07ab8', 0.3);
  [L.mid, g] = artCanvas(LAYER_W, H);
  for (let x = 0; x < LAYER_W; x += 14 + Math.floor(R() * 12)) {
    const h = 8 + R() * 20, w = 12 + R() * 14;
    rect(g, x, 178 - h, w, h + 40, '#120e20');
    g.fillStyle = '#1a1430'; g.beginPath(); g.moveTo(x - 3, 178 - h); g.quadraticCurveTo(x + w / 2, 178 - h - 4, x + w + 3, 178 - h); g.lineTo(x + w, 178 - h + 2); g.lineTo(x, 178 - h + 2); g.closePath(); g.fill();
    for (let i = 0; i < 3; i++) if (R() < 0.55) { const lx = x + 2 + R() * (w - 4), ly = 181 - h + R() * h; rect(g, lx, ly, 1.2, 1.4, R() < 0.5 ? '#ffb060' : '#ffd890'); drawGlow(g, lx, ly, 4, '#ff9a40', 0.6); }
  }
  for (let i = 0; i < 3; i++) pagodaHD(g, 120 + i * 260 + R() * 30, 176, 4, 34, 10, '#0e0a1a', '#0a0814', '#ff9a50', true);
  // the terrace
  [L.level, g] = artCanvas(len, H);
  g.fillStyle = lgrad(g, 0, 150, 0, 154, [[0, '#c0b4c8'], [1, '#5a5264']]); g.fillRect(0, 150, len, 4);
  g.fillStyle = lgrad(g, 0, 174, 0, BASE_Y, [[0, '#5a5264'], [1, '#2a2434']]); g.fillRect(0, 174, len, BASE_Y - 174);
  for (let x = 0; x < len; x += 18) {
    g.fillStyle = lgrad(g, x + 4, 0, x + 10, 0, [[0, '#8a8094'], [0.4, '#6a6274'], [1, '#3a3444']]);
    roundRectPath(g, x + 4, 154, 6, 20, 2.6); g.fill();
  }
  for (let x = 0; x < len; x += 144) {
    g.fillStyle = lgrad(g, x, 0, x + 12, 0, [[0, '#9a90a4'], [0.4, '#7a7084'], [1, '#3a3444']]); g.fillRect(x, 140, 12, 44);
    g.fillStyle = rgrad(g, x + 4, 133, 1, 7, [[0, '#d0c8d8'], [1, '#6a6274']]); g.beginPath(); g.arc(x + 6, 136, 6, 0, TAU); g.fill();
  }
  const A = { floor: '#4e4658', floorHi: '#6a6274', floorLo: '#1a1622', seam: '#1e1a26', reflect: 0.28 };
  paintFloorHD(g, L.level, len, A, true);
  // rain sheen on the stones
  for (let i = 0; i < len / 40; i++) { const x = (i * 53.3) % len, y = BASE_Y + 4 + (i * 7) % 26; g.globalAlpha = 0.12; ellipse(g, x, y, 10 + (i % 5) * 4, 1, 0, '#c8c0ff'); }
  g.globalAlpha = 1;
  // the great dragon statue coiled around a column before the arena
  const pearl = paintDragonColumn(g, floorX(F, len - W - 70), -F.dir);
  // the shrine pavilion at the end, where the Grandmaster is held
  const sx = stairX(F);
  for (const px of [sx - 36, sx + 30]) { g.fillStyle = lgrad(g, px, 0, px + 6, 0, [[0, '#5a1410'], [0.35, '#d0604a'], [1, '#4a0e0c']]); g.fillRect(px, 76, 6, BASE_Y - 76); }
  g.fillStyle = lgrad(g, sx - 3, 0, sx + 3, 0, [[0, '#3a2414'], [0.4, '#7a5434'], [1, '#2a180c']]); g.fillRect(sx - 3, 118, 6, BASE_Y - 118);
  g.fillStyle = lgrad(g, 0, 40, 0, 74, [[0, '#4a2a34'], [1, '#1e0e14']]);
  g.beginPath(); g.moveTo(sx - 62, 66); g.quadraticCurveTo(sx - 40, 66, sx - 22, 48); g.lineTo(sx, 40); g.lineTo(sx + 22, 48); g.quadraticCurveTo(sx + 40, 66, sx + 62, 66); g.lineTo(sx + 50, 74); g.lineTo(sx - 50, 74); g.closePath(); g.fill();
  for (let i = -5; i <= 5; i++) stampLine(g, sx + i * 8, 46 + Math.abs(i) * 2, sx + i * 10, 72, 0.4, 'rgba(255,255,255,0.08)');
  g.fillStyle = lgrad(g, 0, 70, 0, 75, [[0, '#ffe08a'], [1, '#8a5a14']]); g.fillRect(sx - 52, 70.5, 104, 3.5);
  rect(g, sx - 32, 76, 64, 4, '#b8281e');
  L.lights = [{ x: sx - 33, y: 92, r: 30, col: '#ff8a3a', f: 0.2, ph: 1 }, { x: sx + 33, y: 92, r: 30, col: '#ff8a3a', f: 0.2, ph: 2 }];
  L.lanterns = [{ x: sx - 33, y: 76, ph: 1, len: 2 }, { x: sx + 33, y: 76, ph: 2, len: 2 }];
  L.lights.push({ x: pearl.x, y: pearl.y, r: 22, col: '#ffb04a', f: 0.25, ph: 0.5 });
  return L;
}

/* ---- building and caching a floor's layers --------------------------------------------------- */
function buildFloorArt(F) {
  let L;
  if (F.outdoor) L = paintSummit(F);
  else { const hall = paintHall(F); L = { level: hall.level, lights: hall.lights, lanterns: hall.lanterns, outside: paintOutside(F) }; }
  const R = seeded(F.len * 3 + 1);
  L.front = [];
  for (let x = 60; x < F.len * 1.3; x += 280 + R() * 260) L.front.push({ x, kind: F.front[Math.floor(R() * F.front.length)], s: R() });
  L.rs = RS;
  return L;
}

/** Foreground silhouettes that pass in front of the action (drawn translucent). */
function drawFrontPiece(g, f, sx, t) {
  const x = sx;
  switch (f.kind) {
    case 'pillarF': {
      // a lacquered column right by the lens: soft edges, a dim sheen and gilded bands
      const w = 22, a0 = g.globalAlpha, top = HUD_H, hh = H - HUD_H;
      g.globalAlpha = a0 * 0.3; rect(g, x - 3, top, 1.6, hh, '#0a0406'); rect(g, x + w + 1.4, top, 1.6, hh, '#0a0406');
      g.globalAlpha = a0 * 0.6; rect(g, x - 1.4, top, 1.4, hh, '#0a0406'); rect(g, x + w, top, 1.4, hh, '#0a0406');
      g.globalAlpha = a0;
      g.fillStyle = lgrad(g, x, 0, x + w, 0, [[0, '#0a0406'], [0.22, '#2e1012'], [0.4, '#48191a'], [0.62, '#22100f'], [1, '#080304']]);
      g.fillRect(x, top, w, hh);
      for (const by of [top + 16, 150]) {
        g.fillStyle = lgrad(g, x - 1, 0, x + w + 1, 0, [[0, '#120a04'], [0.36, '#5e4422'], [0.62, '#2e200c'], [1, '#0a0602']]);
        g.fillRect(x - 1, by, w + 2, 3.5);
      }
      break;
    }
    case 'lanternF': {
      const sw = Math.sin(t * 1.4 + f.s * 6) * 2.2;
      stampLine(g, x + 10, HUD_H, x + 10 + sw, HUD_H + 18, 0.8, '#0c0608');
      drawGlow(g, x + 10 + sw, HUD_H + 30, 34, '#ff7a2a', 0.9);
      g.fillStyle = '#1a0a0c'; g.beginPath(); g.ellipse(x + 10 + sw, HUD_H + 30, 11, 13, 0, 0, TAU); g.fill();
      rrect(g, x + 3 + sw, HUD_H + 16, 14, 3, 1, '#2a1410'); rrect(g, x + 3 + sw, HUD_H + 42, 14, 3, 1, '#2a1410');
      g.fillStyle = rgrad(g, x + 10 + sw, HUD_H + 30, 1, 10, [[0, 'rgba(255,170,90,0.55)'], [1, 'rgba(255,90,40,0)']]); g.beginPath(); g.ellipse(x + 10 + sw, HUD_H + 30, 8, 10, 0, 0, TAU); g.fill();
      break;
    }
    case 'tasselF': {
      const sw = Math.sin(t * 1.1 + f.s * 6) * 1.6;
      rect(g, x, HUD_H, 4, 30, '#10080a');
      g.fillStyle = '#16090c'; g.beginPath(); g.moveTo(x - 7, HUD_H + 30); g.lineTo(x + 11, HUD_H + 30); g.lineTo(x + 9 + sw, HUD_H + 72); g.lineTo(x - 5 + sw, HUD_H + 72); g.closePath(); g.fill();
      for (let i = 0; i < 6; i++) stampLine(g, x - 4 + i * 2.8 + sw, HUD_H + 72, x - 4 + i * 2.8 + sw * 1.6, HUD_H + 86, 0.8, '#16090c');
      break;
    }
    case 'chainF':
      g.strokeStyle = '#0e0a0c'; g.lineWidth = 1.8;
      for (let y = HUD_H; y < 130; y += 7) { g.beginPath(); g.ellipse(x + 2, y + 3, ((y / 7) | 0) % 2 ? 1.4 : 2.6, 3.6, 0, 0, TAU); g.stroke(); }
      disc(g, x + 2, 136, 9, '#0e0a0c');
      break;
    case 'silkF': {
      const sw = Math.sin(t * 0.8 + f.s * 6) * 3;
      g.fillStyle = 'rgba(12,10,30,0.85)';
      g.beginPath(); g.moveTo(x, HUD_H);
      for (let i = 0; i <= 18; i++) g.lineTo(x + Math.sin(i * 0.4 + t + f.s) * 2 + sw * (i / 18), HUD_H + i * 6);
      for (let i = 18; i >= 0; i--) g.lineTo(x + 24 + Math.sin(i * 0.4 + t + f.s + 0.5) * 2 + sw * (i / 18), HUD_H + i * 6);
      g.closePath(); g.fill();
      break;
    }
    case 'flagF': {
      // a banner pole close to the camera: tapered shaft, spear finial, swallowtail pennant
      const top = HUD_H + 6;
      g.fillStyle = lgrad(g, x - 2, 0, x + 2, 0, [[0, '#060408'], [0.45, '#2a2232'], [1, '#060408']]);
      g.beginPath(); g.moveTo(x - 1.3, top + 6); g.lineTo(x + 1.3, top + 6); g.lineTo(x + 2.1, H); g.lineTo(x - 2.1, H); g.closePath(); g.fill();
      poly(g, [x, top - 3, x + 1.6, top + 3, x, top + 6, x - 1.6, top + 3], '#6a4c22');
      rect(g, x - 19, top + 8, 21, 1.6, '#120c14');
      const sway = Math.sin(t * 1.6 + f.s * 5);
      g.fillStyle = lgrad(g, 0, top + 9, 0, top + 80, [[0, '#4a0c14'], [0.6, '#2a060c'], [1, '#14040a']]);
      g.beginPath(); g.moveTo(x - 17, top + 9.6); g.lineTo(x - 1, top + 9.6);
      for (let i = 0; i <= 12; i++) { const yy = top + 9.6 + i * 6; g.lineTo(x - 1 + Math.sin(t * 2.4 - i * 0.5) * i * 0.18 + sway * i * 0.3, yy); }
      g.lineTo(x - 9 + sway * 4, top + 72); g.lineTo(x - 17 + sway * 3.6, top + 81.6);
      for (let i = 12; i >= 0; i--) { const yy = top + 9.6 + i * 6; g.lineTo(x - 17 + Math.sin(t * 2.4 - i * 0.5) * i * 0.18 + sway * i * 0.3, yy); }
      g.closePath(); g.fill();
      g.globalAlpha *= 0.6; disc(g, x - 9 + sway * 1.2, top + 30, 4.2, '#6a4c22'); disc(g, x - 9 + sway * 1.2, top + 30, 3.2, '#2a060c'); g.globalAlpha /= 0.6;
      break;
    }
    default: break;
  }
}

/* ---- title backdrop: the pagoda at night ---------------------------------------------------------- */
let TITLE_ART = null;
function titleArt() {
  if (TITLE_ART && TITLE_ART.rs === RS) return TITLE_ART;
  const R = seeded(2024);
  const Tt = { rs: RS };
  let g;
  [Tt.sky, g] = artCanvas(W, H);
  g.fillStyle = lgrad(g, 0, 0, 0, H, [[0, '#05061a'], [0.45, '#18163a'], [0.75, '#3c2252'], [1, '#7e3a5a']]); g.fillRect(0, 0, W, H);
  stars(g, W, 130, 110, R);
  drawGlow(g, 72, 62, 90, '#ffe0c0', 0.55);
  g.fillStyle = rgrad(g, 66, 55, 3, 26, [[0, '#fffbf2'], [0.7, '#f6e6cc'], [1, '#e2ccaa']]); g.beginPath(); g.arc(72, 62, 24, 0, TAU); g.fill();
  for (const [cx, cy, r] of [[64, 56, 5], [80, 70, 4], [76, 52, 2.2], [62, 70, 2.8]]) disc(g, cx, cy, r, 'rgba(190,160,120,0.35)');
  [Tt.far, g] = artCanvas(LAYER_W, H);
  ridgeHD(g, LAYER_W, 150, [[2, 40], [5, 14], [12, 4]], true, '#4a3470', '#1a1230', R);
  mist(g, LAYER_W, 156, 12, '#b890c8', 0.35);
  [Tt.near, g] = artCanvas(LAYER_W, H);
  ridgeHD(g, LAYER_W, 176, [[3, 20], [7, 8]], false, '#1a1030', '#08040e', R);
  for (let x = 10; x < LAYER_W; x += 22 + R() * 30) {
    const h = 20 + R() * 34, by = 176;
    rect(g, x, by - h, 1.8, h, '#0a0614');
    for (let j = 0; j < 4; j++) { g.fillStyle = '#0a0614'; g.beginPath(); g.ellipse(x + 1 + (j % 2 ? 4 : -4), by - h + j * 8, 6 - j * 0.6, 2, j % 2 ? -0.3 : 0.3, 0, TAU); g.fill(); }
  }
  [Tt.tower, g] = artCanvas(W, H);
  const cx = W - 70;
  g.fillStyle = lgrad(g, 0, 190, 0, H, [[0, '#24142a'], [1, '#0a0610']]); g.fillRect(cx - 40, 190, 80, 26);
  let y = 190, w = 96;
  for (let i = 0; i < 5; i++) {
    const th = 22 - i, bw = w * 0.6;
    g.fillStyle = lgrad(g, cx - bw / 2, 0, cx + bw / 2, 0, [[0, '#120a16'], [0.4, '#2e1c34'], [1, '#120a16']]); g.fillRect(cx - bw / 2, y - th, bw, th);
    for (let kx = -1; kx <= 1; kx++) {
      const wx = cx + kx * bw * 0.28;
      g.fillStyle = lgrad(g, 0, y - th + 6, 0, y - th + 14, [[0, '#fff2b0'], [1, '#ff8a3a']]); roundRectPath(g, wx - 2.2, y - th + 6, 4.4, 8, 1.5); g.fill();
    }
    const ey = y - th;
    g.fillStyle = lgrad(g, 0, ey - 7, 0, ey, [[0, '#4a2e44'], [1, '#1e1022']]);
    g.beginPath(); g.moveTo(cx - w / 2 - 6, ey - 7);
    g.quadraticCurveTo(cx - w / 2 + 3, ey - 0.5, cx - w * 0.22, ey - 1.5); g.lineTo(cx + w * 0.22, ey - 1.5);
    g.quadraticCurveTo(cx + w / 2 - 3, ey - 0.5, cx + w / 2 + 6, ey - 7);
    g.lineTo(cx + w * 0.3, ey - 6); g.lineTo(cx - w * 0.3, ey - 6); g.closePath(); g.fill();
    stampLine(g, cx - w * 0.3, ey - 6, cx + w * 0.3, ey - 6, 0.6, '#8a5a6a');
    disc(g, cx - w / 2 - 6, ey - 7, 1, '#d9a43a'); disc(g, cx + w / 2 + 6, ey - 7, 1, '#d9a43a');
    y = ey - 6; w *= 0.84;
  }
  rect(g, cx - 1, y - 20, 2.2, 20, '#2a1a2e');
  for (let i = 0; i < 4; i++) disc(g, cx, y - 6 - i * 4, 2.4 - i * 0.3, '#d9a43a');
  Tt.towerTop = y - 22;
  TITLE_ART = Tt;
  return Tt;
}
