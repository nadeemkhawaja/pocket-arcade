/* ==========================================================================
   Stage art. Each district is painted in code: a far layer that drifts
   slowly, and the street itself (walls, shop fronts, floor). Both are cut
   into tiles that are painted once at the screen's resolution and reused.
   Signs and shop names are invented.
   ========================================================================== */

const TILE = 192;
const TILES = new Map();
function stageTile(si, layer, i, px) {
  const key = si + '|' + layer + '|' + i + '|' + px;
  let c = TILES.get(key);
  if (c) return c;
  if (TILES.size > 90) TILES.clear();
  c = makeCanvas(Math.ceil((TILE + 2) * px), Math.ceil(H * px));
  const g = c.getContext('2d');
  g.scale(px, px); g.translate(-i * TILE, 0);
  g.beginPath(); g.rect(i * TILE, 0, TILE + 2, H); g.clip();
  (layer === 0 ? FAR_ART : NEAR_ART)[STAGES[si].id](g, i * TILE, (i + 1) * TILE + 2);
  TILES.set(key, c);
  return c;
}

/** Pixel grit: each pixel nudged lighter or darker by a fixed hash, so flat paint reads as worn surface. */
function grit(c, seed, layer) {
  const g = c.getContext('2d'), w = c.width, h = c.height;
  let im;
  try { im = g.getImageData(0, 0, w, h); } catch (e) { return; }
  const d = im.data, amp = layer ? 9 : 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    if (d[o + 3] < 8) continue;
    let n = ((x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0);
    n = ((n ^ (n >>> 13)) * 1274126177) >>> 0;
    const v = ((n & 255) / 255 - 0.5) * amp * 2;
    d[o] = clamp(d[o] + v, 0, 255); d[o + 1] = clamp(d[o + 1] + v, 0, 255); d[o + 2] = clamp(d[o + 2] + v, 0, 255);
  }
  g.putImageData(im, 0, 0);
}

/** Brick: 1 pixel mortar, staggered courses, every brick its own tone, a few chipped or missing. */
function brick(g, x0, y0, w, h, base, mortar, bw, bh, seed) {
  bw = bw || 8; bh = bh || 4;
  rect(g, x0, y0, w, h, mortar || shade(base, -0.45));
  const r = seeded(seed || 1);
  for (let y = y0, row = 0; y < y0 + h; y += bh, row++) {
    const off = (row % 2) * (bw / 2);
    for (let x = x0 - off; x < x0 + w; x += bw) {
      const xa = Math.max(x0, x), xb = Math.min(x0 + w, x + bw - 1), hh = Math.min(bh - 1, y0 + h - y);
      if (xb <= xa || hh <= 0) continue;
      const t = r(), col = t < 0.06 ? shade(base, -0.28) : t < 0.2 ? shade(base, 0.1) : t < 0.32 ? shade(base, -0.12) : base;
      rect(g, xa, y, xb - xa, hh, col);
      rect(g, xa, y, xb - xa, 1, shade(col, 0.12));
    }
  }
}
/** Dark grime that climbs the foot of a wall and runs down from ledges. */
function grime(g, x0, y0, w, h, seed) {
  g.fillStyle = lgrad(g, 0, y0 + h * 0.55, 0, y0 + h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.42)']]); g.fillRect(x0, y0, w, h);
  const r = seeded(seed || 3);
  for (let i = 0; i < w / 14; i++) { const x = Math.round(x0 + r() * w), l = 6 + r() * 24, y = Math.round(y0 + r() * h * 0.6); rect(g, x, y, 1, l, 'rgba(0,0,0,0.22)'); rect(g, x + 1, y + 2, 1, l * 0.6, 'rgba(0,0,0,0.12)'); }
}
/** A framed window: frame, glass, sill, sometimes a lit room with a figure or blinds. */
function pixWindow(g, x, y, w, h, lit, glass, r) {
  rect(g, x - 1, y - 1, w + 2, h + 3, '#0a0610');
  rect(g, x, y, w, h, lit ? glass : '#141020');
  if (lit) { rect(g, x, y, w, 1, shade(glass, 0.25)); if (r() < 0.4) for (let k = y + 2; k < y + h; k += 2) rect(g, x, k, w, 1, shade(glass, -0.18)); else if (r() < 0.3) rect(g, x + w * 0.3, y + h * 0.35, 3, h * 0.65, shade(glass, -0.55)); }
  else rect(g, x + 1, y + 1, 2, h - 2, 'rgba(120,140,200,0.18)');
  rect(g, x + Math.floor(w / 2), y, 1, h, '#0a0610');
  rect(g, x - 2, y + h + 1, w + 4, 2, '#5a5060'); rect(g, x - 2, y + h + 3, w + 4, 1, '#1a1220');
}
function pipe(g, x, y0, y1) { rect(g, x, y0, 3, y1 - y0, '#3a3a44'); rect(g, x, y0, 1, y1 - y0, '#6a6a78'); for (let y = y0 + 10; y < y1; y += 22) rect(g, x - 1, y, 5, 2, '#2a2a32'); }
function graffiti(g, x, y, r) {
  const cols = ['#ff3a8a', '#3ae0ff', '#ffe03a', '#7aff5a', '#ffffff'], c = cols[Math.floor(r() * cols.length)];
  g.save(); g.globalAlpha = 0.55;
  for (let k = 0; k < 5; k++) { const sx = x + k * 5 + r() * 2, sy = y + r() * 4; rect(g, sx, sy, 4, 1, c); rect(g, sx + (r() < 0.5 ? 0 : 3), sy, 1, 6, c); rect(g, sx, sy + 5, 4, 1, c); }
  g.restore();
}
/** Paving and plate floors, drawn straight on like the old cabinets: rows grow toward you, joints stagger. */
function slabFloor(g, x0, x1, top, base, joint, rows) {
  rows = rows || [6, 8, 10, 12, 14, 16, 18];
  let y = top, i = 0;
  const r = seeded(Math.floor(x0) + top);
  while (y < H) {
    const h = rows[Math.min(i, rows.length - 1)], sw = h * 3, off = (i % 2) * sw / 2;
    for (let x = Math.floor((x0 - off) / sw) * sw + off - sw; x < x1 + sw; x += sw) {
      const t = r(), col = t < 0.15 ? shade(base, -0.08) : t < 0.3 ? shade(base, 0.06) : base;
      rect(g, x, y, sw - 1, h - 1, col);
      rect(g, x, y, sw - 1, 1, shade(col, 0.1));
      if (t > 0.92) { const cx = x + 4 + r() * (sw - 10); for (let k = 0; k < 6; k++) rect(g, cx + k, y + 2 + ((k * 7) % 4), 1, 1, joint); }
    }
    rect(g, x0, y + h - 1, x1 - x0, 1, joint);
    y += h; i++;
  }
}

const SIGNS = ['MOON TEA', 'LUCKY 88', 'NOODLE BAR', 'GOLD COIN', 'KARAOKE', 'JADE CAFE', 'PAWN', 'ARCADE', 'HOT POT', 'TATTOO'];
const NEON = ['#ff4a8a', '#5af0ff', '#ffd24a', '#7dff8a', '#c08aff', '#ff7a3a'];

/** The street floor shared by every stage: bands that recede, seams that lean with depth. */
function streetFloor(g, x0, x1, top, cols, seam, lines) {
  for (let i = 0; i < 6; i++) {
    const y = top + i * (H - top) / 6;
    g.fillStyle = cols[i % cols.length]; g.fillRect(x0, y, x1 - x0, (H - top) / 6 + 0.5);
  }
  g.strokeStyle = seam; g.lineWidth = 0.6;
  for (let x = Math.floor(x0 / 40) * 40 - 40; x < x1 + 40; x += 40) { g.beginPath(); g.moveTo(x, top); g.lineTo(x - 30, H); g.stroke(); }
  if (lines) for (const y of lines) { g.fillStyle = y[1]; g.fillRect(x0, y[0], x1 - x0, y[2] || 1); }
}

const FAR_ART = {
  market(g, x0, x1) {
    g.fillStyle = lgrad(g, 0, 0, 0, 120, [[0, '#0a0618'], [0.6, '#2a0e3a'], [1, '#5a1a50']]); g.fillRect(x0, 0, x1 - x0, H);
    const r = seeded(7 + Math.floor(x0 / TILE));
    for (let x = x0; x < x1;) {
      const w = 14 + r() * 26, h = 40 + r() * 70; g.fillStyle = '#140a24'; g.fillRect(x, 120 - h, w, h + 20);
      for (let y = 120 - h + 4; y < 130; y += 6) for (let xx = x + 2; xx < x + w - 3; xx += 5) if (r() < 0.35) rect(g, xx, y, 2, 3, r() < 0.5 ? '#ffd27a' : '#ff8ac0');
      x += w + 1;
    }
  },
  yard(g, x0, x1) {
    g.fillStyle = lgrad(g, 0, 0, 0, 120, [[0, '#0c1428'], [0.7, '#2a3a5a'], [1, '#c86a4a']]); g.fillRect(x0, 0, x1 - x0, H);
    const r = seeded(11 + Math.floor(x0 / TILE));
    for (let x = x0; x < x1; x += 60 + r() * 50) {
      // a gantry crane
      g.strokeStyle = '#1a2236'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, 120); g.lineTo(x, 40); g.lineTo(x + 46, 40); g.moveTo(x + 30, 120); g.lineTo(x + 30, 40); g.stroke();
      g.lineWidth = 0.8; for (let y = 50; y < 120; y += 10) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y + 10); g.stroke(); }
      disc(g, x + 46, 40, 1.4, '#ff4a4a');
    }
    for (let x = x0; x < x1; x += 22) { const h = 10 + (Math.floor(x / 22) * 7 % 3) * 10; rect(g, x, 120 - h, 21, h, ['#2a3a56', '#3a2a40', '#203648'][Math.floor(x / 22) % 3]); }
  },
  foundry(g, x0, x1) {
    g.fillStyle = lgrad(g, 0, 0, 0, 130, [[0, '#120c0a'], [1, '#3a1a10']]); g.fillRect(x0, 0, x1 - x0, H);
    for (let x = Math.floor(x0 / 64) * 64; x < x1; x += 64) { rect(g, x, 0, 10, 130, '#1e1410'); for (let y = 10; y < 130; y += 18) { g.strokeStyle = '#2a1c14'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 10, y); g.lineTo(x + 64, y + 18); g.stroke(); } }
  },
  tower(g, x0, x1) {
    g.fillStyle = lgrad(g, 0, 0, 0, 130, [[0, '#04060e'], [0.7, '#0e1a30'], [1, '#2a3a5a']]); g.fillRect(x0, 0, x1 - x0, H);
    const r = seeded(19 + Math.floor(x0 / TILE));
    for (let x = x0; x < x1;) {
      const w = 12 + r() * 22, h = 30 + r() * 90; g.fillStyle = r() < 0.5 ? '#0a1222' : '#101a2e'; g.fillRect(x, 132 - h, w, h);
      for (let y = 132 - h + 3; y < 132; y += 5) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (r() < 0.3) rect(g, xx, y, 1.6, 2.4, r() < 0.6 ? '#ffe9a0' : '#9ad8ff');
      if (r() < 0.25) disc(g, x + w / 2, 132 - h - 3, 1.2, '#ff3a3a');
      x += w + 2;
    }
  }
};

const NEAR_ART = {
  market(g, x0, x1) {
    // shop fronts
    for (let b = Math.floor(x0 / 120) - 1; b * 120 < x1 + 120; b++) {
      const x = b * 120, r = seeded(b * 31 + 5), col = ['#3a1e2a', '#22283a', '#2e2236', '#3a2a1e'][(b + 4) % 4];
      const bc = ['#6a3a32', '#4c4a5a', '#5e3e48', '#6e5240'][(b + 4) % 4];
      brick(g, x, 10, 120, 124, bc, shade(bc, -0.55), 8, 4, b * 13 + 1);
      rect(g, x, 10, 120, 3, shade(col, -0.2)); rect(g, x, 13, 120, 1, shade(col, 0.3));
      rect(g, x + 119, 10, 1, 124, '#0a0610');
      for (let y = 18; y < 70; y += 18) for (let xx = x + 10; xx < x + 110; xx += 26) pixWindow(g, xx, y, 16, 11, r() < 0.55, r() < 0.5 ? '#ffd27a' : '#ff9ac0', r);
      pipe(g, x + 4, 14, 132);
      if (r() < 0.6) { const ax = x + 38 + Math.floor(r() * 40); rect(g, ax, 58, 14, 9, '#8a8e98'); rect(g, ax, 58, 14, 1, '#b8bcc6'); for (let k = 1; k < 8; k += 2) rect(g, ax + 1, 59 + k, 12, 1, '#5a5e68'); rect(g, ax + 6, 67, 1, 6, 'rgba(0,0,0,0.4)'); }
      grime(g, x, 10, 120, 124, b * 7 + 2);
      if (r() < 0.7) graffiti(g, x + 76 + Math.floor(r() * 10), 104 + Math.floor(r() * 10), r);
      // awning and sign
      const nc = NEON[b % NEON.length & 7 % NEON.length] || NEON[0], sign = SIGNS[((b % SIGNS.length) + SIGNS.length) % SIGNS.length];
      g.fillStyle = shade(nc, -0.55); g.beginPath(); g.moveTo(x + 6, 84); g.lineTo(x + 114, 84); g.lineTo(x + 118, 96); g.lineTo(x + 2, 96); g.fill();
      for (let k = 0; k < 9; k++) rect(g, x + 4 + k * 12.6, 96, 6.3, 3, nc);
      rrect(g, x + 18, 72, 84, 11, 2, '#0c0610'); g.font = '400 8px ' + FONT_DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = nc; g.fillText(sign, x + 60, 78); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(glowSprite(nc), x + 10, 62, 100, 32); g.restore();
      // the shop window and door
      rect(g, x + 10, 100, 64, 30, '#0e0a14'); g.fillStyle = lgrad(g, 0, 100, 0, 130, [[0, rgba(nc, 0.4)], [1, rgba(nc, 0.08)]]); g.fillRect(x + 11, 101, 62, 28);
      for (let k = 0; k < 4; k++) rect(g, x + 14 + k * 15, 106 + (k % 2) * 4, 9, 14 - (k % 2) * 4, rgba(shade(nc, -0.3), 0.55));
      rect(g, x + 11, 101, 62, 1, rgba('#ffffff', 0.25)); rect(g, x + 41, 101, 1, 28, '#0e0a14');
      rect(g, x + 82, 100, 26, 34, '#0a070e'); rect(g, x + 84, 102, 22, 30, shade(col, -0.3));
      for (let k = 0; k < 7; k++) rect(g, x + 84, 104 + k * 4, 22, 1, shade(col, -0.45));
      rect(g, x + 84, 102, 22, 1, shade(col, 0.05));
      rect(g, x, 130, 120, 4, '#1a1018');
    }
    // lanterns strung across
    g.strokeStyle = '#2a1a1a'; g.lineWidth = 0.6;
    for (let x = Math.floor(x0 / 60) * 60; x < x1 + 60; x += 60) { g.beginPath(); g.moveTo(x, 6); g.quadraticCurveTo(x + 30, 16, x + 60, 6); g.stroke(); for (const k of [0.25, 0.5, 0.75]) { const lx = x + 60 * k, ly = 6 + 10 * 4 * k * (1 - k); disc(g, lx, ly + 3, 3, '#e8302a'); rect(g, lx - 2, ly + 5.4, 4, 1, '#ffd24a'); } }
    // floor: pavement, kerb, road
    slabFloor(g, x0, x1, 134, '#3a3440', '#1a161e', [5, 6, 7]);
    rect(g, x0, 150, x1 - x0, 1, '#8a8494'); rect(g, x0, 151, x1 - x0, 2, '#5a5464'); rect(g, x0, 153, x1 - x0, 2, '#14121a');
    rect(g, x0, 155, x1 - x0, H - 155, '#24202a');
    { const r2 = seeded(Math.floor(x0) + 9); for (let i = 0; i < (x1 - x0) * 1.4; i++) rect(g, Math.floor(x0 + r2() * (x1 - x0)), Math.floor(156 + r2() * 60), 1, 1, r2() < 0.5 ? '#2e2a36' : '#1a1820'); }
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { rect(g, x, 182, 26, 2, 'rgba(255,240,200,0.4)'); }
    for (let x = Math.floor(x0 / 150) * 150; x < x1; x += 150) { g.fillStyle = 'rgba(10,8,20,0.55)'; g.beginPath(); g.ellipse(x + 40, 200, 22, 4, 0, 0, TAU); g.fill(); rect(g, x + 26, 199, 10, 1, 'rgba(255,160,220,0.35)'); }
    // neon reflections in the wet road
    for (let b = Math.floor(x0 / 120) - 1; b * 120 < x1 + 120; b++) { const nc = NEON[b % NEON.length & 7 % NEON.length] || NEON[0]; g.fillStyle = lgrad(g, 0, 156, 0, 210, [[0, rgba(nc, 0.16)], [1, rgba(nc, 0)]]); g.fillRect(b * 120 + 24, 156, 72, 54); }
  },
  yard(g, x0, x1) {
    // containers behind a chain fence
    for (let b = Math.floor(x0 / 96) - 1; b * 96 < x1 + 96; b++) {
      const x = b * 96, col = ['#a8402a', '#2a6a8a', '#c88a2a', '#3a7a4a', '#6a3a7a'][((b % 5) + 5) % 5];
      for (let row = 0; row < 2; row++) {
        const y = 52 + row * 40, cx = x + (row ? 18 : 0);
        rect(g, cx, y, 90, 38, col); for (let k = 4; k < 90; k += 4) { rect(g, cx + k, y + 2, 1, 34, shade(col, -0.22)); rect(g, cx + k + 1, y + 2, 1, 34, shade(col, 0.08)); }
        { const r2 = seeded(b * 5 + row); for (let i = 0; i < 18; i++) rect(g, Math.floor(cx + r2() * 88), Math.floor(y + 4 + r2() * 30), 1 + Math.floor(r2() * 2), 1 + Math.floor(r2() * 3), 'rgba(110,50,20,0.55)'); }
        rect(g, cx + 70, y + 6, 1, 28, '#1a1a1a'); rect(g, cx + 76, y + 6, 1, 28, '#1a1a1a');
        rect(g, cx, y, 90, 2.4, shade(col, 0.25)); rect(g, cx + 2, y + 34, 86, 4, shade(col, -0.4));
        g.font = '700 6px ' + FONT_UI; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText(['VPRX', 'KITE', 'ORCA', 'NOVA', 'ATLAS'][((b + row) % 5 + 5) % 5] + ' 40' + ((b * 7 + row) % 9), cx + 6, y + 9);
      }
    }
    g.strokeStyle = 'rgba(160,170,190,0.5)'; g.lineWidth = 0.4;
    for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) { g.beginPath(); g.moveTo(x, 96); g.lineTo(x + 18, 132); g.moveTo(x + 18, 96); g.lineTo(x, 132); g.stroke(); }
    for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) rect(g, x, 92, 2, 42, '#5a6070');
    rect(g, x0, 92, x1 - x0, 1.4, '#7a8090');
    // gravel bed and two rail lines across the back of the floor
    rect(g, x0, 134, x1 - x0, H - 134, '#4a4238');
    { const r2 = seeded(Math.floor(x0) + 4); for (let i = 0; i < (x1 - x0) * 3; i++) rect(g, Math.floor(x0 + r2() * (x1 - x0)), Math.floor(134 + r2() * 82), 1 + (r2() < 0.2 ? 1 : 0), 1, ['#5a5246', '#3a342c', '#625a4c', '#2e2a24'][Math.floor(r2() * 4)]); }
    for (const ry of [140, 156]) { for (let x = Math.floor(x0 / 10) * 10; x < x1; x += 10) rect(g, x, ry - 1, 6, 8, '#3a2a1e'); rect(g, x0, ry, x1 - x0, 1.6, '#9aa0aa'); rect(g, x0, ry + 5, x1 - x0, 1.6, '#9aa0aa'); }
    const r = seeded(Math.floor(x0 / TILE) + 3); for (let i = 0; i < 90; i++) rect(g, x0 + r() * (x1 - x0), 168 + r() * 46, 1.2, 1, 'rgba(0,0,0,0.25)');
  },
  foundry(g, x0, x1) {
    // brick wall with furnace mouths
    brick(g, x0, 0, x1 - x0, 134, '#5a3228', '#1e100c', 12, 5, Math.floor(x0) + 2);
    grime(g, x0, 0, x1 - x0, 134, Math.floor(x0) + 6);
    { const r2 = seeded(Math.floor(x0) + 11); for (let i = 0; i < 3; i++) pipe(g, Math.floor(x0 + r2() * (x1 - x0)), 26, 134); }
    for (let b = Math.floor(x0 / 160) - 1; b * 160 < x1 + 160; b++) {
      const x = b * 160 + 40;
      rect(g, x - 4, 50, 72, 80, '#1a100c');
      g.beginPath(); g.moveTo(x, 130); g.lineTo(x, 70); g.quadraticCurveTo(x + 32, 44, x + 64, 70); g.lineTo(x + 64, 130); g.closePath();
      g.fillStyle = lgrad(g, 0, 60, 0, 130, [[0, '#ffd27a'], [0.4, '#ff7a1a'], [1, '#7a1a08']]); g.fill();
      for (let k = 0; k < 6; k++) rect(g, x + 4 + k * 10, 64, 3, 66, 'rgba(40,10,4,0.45)');
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(glowSprite('#ff7a1a'), x - 40, 30, 144, 120); g.restore();
    }
    // a gantry rail along the top
    rect(g, x0, 20, x1 - x0, 6, '#2a2a30'); for (let x = Math.floor(x0 / 24) * 24; x < x1; x += 24) { g.strokeStyle = '#2a2a30'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, 26); g.lineTo(x + 12, 34); g.lineTo(x + 24, 26); g.stroke(); }
    // steel plate floor with a hazard edge
    slabFloor(g, x0, x1, 134, '#3c3c44', '#1c1c22', [10, 12, 14, 16, 18, 20]);
    { const r2 = seeded(Math.floor(x0) + 5); for (let i = 0; i < (x1 - x0) / 3; i++) { const x = Math.floor(x0 + r2() * (x1 - x0)), y = Math.floor(142 + r2() * 72); rect(g, x, y, 2, 1, '#4a4a54'); rect(g, x + 1, y + 1, 1, 1, '#2a2a30'); } }
    for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) { g.fillStyle = Math.floor(x / 12) % 2 ? '#ffc81e' : '#14141a'; g.beginPath(); g.moveTo(x, 134); g.lineTo(x + 12, 134); g.lineTo(x + 8, 140); g.lineTo(x - 4, 140); g.fill(); }
    for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) for (const y of [160, 190]) { disc(g, x + 6, y, 0.9, '#5a5a62'); disc(g, x + 30, y + 8, 0.9, '#5a5a62'); }
    g.fillStyle = lgrad(g, 0, 140, 0, 216, [[0, 'rgba(255,120,40,0.2)'], [1, 'rgba(255,120,40,0)']]); g.fillRect(x0, 140, x1 - x0, 76);
  },
  tower(g, x0, x1) {
    // the parapet, vents and a water tank
    for (let b = Math.floor(x0 / 220) - 1; b * 220 < x1 + 220; b++) {
      const x = b * 220;
      rect(g, x + 30, 70, 56, 44, '#3a4250'); for (let k = 0; k < 7; k++) rect(g, x + 34, 74 + k * 5.6, 48, 2.4, '#262c38'); rect(g, x + 30, 70, 56, 2, '#5a6478');
      if (((b % 2) + 2) % 2 === 0) { rect(g, x + 120, 20, 70, 60, '#4a3a30'); for (let k = 0; k < 6; k++) rect(g, x + 120, 24 + k * 10, 70, 1.4, '#3a2c24'); poly(g, [x + 116, 20, x + 155, 4, x + 194, 20], '#3a2c24'); for (const lx of [126, 150, 178]) rect(g, x + lx, 80, 3, 36, '#2a2e38'); }
      else { rect(g, x + 150, 10, 3, 104, '#5a6478'); disc(g, x + 151.5, 9, 2, '#ff3a3a'); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(glowSprite('#ff3a3a'), x + 140, -2, 23, 23); g.restore(); }
    }
    brick(g, x0, 112, x1 - x0, 22, '#323a4a', '#1a2030', 16, 6, Math.floor(x0) + 8); rect(g, x0, 112, x1 - x0, 2, '#5a6478'); rect(g, x0, 114, x1 - x0, 1, '#1a2030');
    grime(g, x0, 112, x1 - x0, 22, Math.floor(x0) + 1);
    // wet concrete roof, helipad marks
    slabFloor(g, x0, x1, 134, '#3c4452', '#1e2430', [8, 10, 12, 14, 16, 18]);
    for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) { g.fillStyle = 'rgba(160,190,230,0.12)'; g.beginPath(); g.ellipse(x + 30, 190, 26, 5, 0, 0, TAU); g.fill(); }
    for (let b = Math.floor(x0 / 600) - 1; b * 600 < x1 + 600; b++) {
      const x = b * 600 + 300;
      g.strokeStyle = 'rgba(255,210,74,0.7)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, 176, 70, 26, 0, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(x - 22, 164, 6, 24); g.fillRect(x + 16, 164, 6, 24); g.fillRect(x - 16, 173, 32, 6);
    }
  }
};

/* ---- live layers: things that move, drawn every frame ------------------------------------------- */
function drawStageLive(g, si, camX, back) {
  const id = STAGES[si].id, t = game.t;
  if (back) {
    if (id === 'yard' && game.train) {
      // a freight train crosses behind the fence
      const tr = game.train, x = tr.x - camX;
      for (let k = 0; k < 9; k++) { const cx = x + k * 74; if (cx < -80 || cx > W + 10) continue; rect(g, cx, 98, 70, 30, k === 0 ? '#c8a020' : ['#5a3a2a', '#2a4a5a', '#4a4a52'][k % 3]); rect(g, cx, 98, 70, 2, 'rgba(255,255,255,0.2)'); for (const wx of [10, 58]) disc(g, cx + wx, 129, 4, '#141418'); if (k === 0) { rect(g, cx + 46, 104, 16, 10, '#9ad8ff'); drawGlow(g, cx + 70, 118, 30, '#fff2c0', 0.8); } }
    }
    if (id === 'foundry') {
      // flicker the furnace glow
      const k = 0.5 + 0.5 * Math.sin(t * 9) * Math.sin(t * 5.3);
      for (let b = Math.floor((camX - 60) / 160); b * 160 < camX + W + 60; b++) drawGlow(g, b * 160 + 72 - camX, 100, 70, '#ff6a10', 0.25 + 0.25 * k);
    }
    return;
  }
  if (id === 'tower') {
    // rain and the odd flash of lightning
    g.strokeStyle = 'rgba(180,200,240,0.35)'; g.lineWidth = 0.5; g.beginPath();
    for (let i = 0; i < 80; i++) { const x = (i * 53.3 + t * 40) % (W + 20) - 10, y = (i * 37.1 + t * 420) % (viewH() + 20) - 10; g.moveTo(x, y); g.lineTo(x - 3, y + 9); }
    g.stroke();
    const fl = (t % 9) < 0.12 || ((t + 0.25) % 9) < 0.06;
    if (fl && settings.fx) rect(g, 0, 0, W, viewH(), 'rgba(200,220,255,0.22)');
  }
  if (id === 'market') {
    // steam from a grate
    for (let i = 0; i < 6; i++) { const ph = (t * 0.4 + i / 6) % 1, x = 760 - camX + Math.sin(t + i) * 6; if (x < -40 || x > W + 40) continue; g.globalAlpha = 0.18 * (1 - ph); disc(g, x, 200 - ph * 80, 8 + ph * 20, '#d8d0e0'); }
    g.globalAlpha = 1;
  }
  if (id === 'foundry') {
    // embers
    for (let i = 0; i < 24; i++) { const ph = (t * (0.2 + (i % 5) * 0.05) + i * 0.13) % 1, x = ((i * 97) % W) + Math.sin(t * 2 + i) * 8; g.globalAlpha = 1 - ph; rect(g, x, 216 - ph * 200, 1.2, 1.2, '#ffb040'); }
    g.globalAlpha = 1;
  }
}
