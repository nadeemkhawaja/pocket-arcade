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
  c = makeCanvas(Math.ceil(TILE * px), Math.ceil(H * px));
  const g = c.getContext('2d');
  g.scale(px, px); g.translate(-i * TILE, 0);
  g.beginPath(); g.rect(i * TILE, 0, TILE, H); g.clip();
  (layer === 0 ? FAR_ART : NEAR_ART)[STAGES[si].id](g, i * TILE, (i + 1) * TILE);
  TILES.set(key, c);
  return c;
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
      g.fillStyle = col; g.fillRect(x, 10, 120, 124);
      for (let y = 18; y < 70; y += 18) for (let xx = x + 10; xx < x + 110; xx += 26) { rect(g, xx, y, 16, 11, '#120a14'); if (r() < 0.55) rect(g, xx + 1, y + 1, 14, 9, r() < 0.5 ? '#ffd27a' : '#ff9ac0'); rect(g, xx + 7.5, y, 1, 11, col); }
      // awning and sign
      const nc = NEON[b % NEON.length & 7 % NEON.length] || NEON[0], sign = SIGNS[((b % SIGNS.length) + SIGNS.length) % SIGNS.length];
      g.fillStyle = shade(nc, -0.55); g.beginPath(); g.moveTo(x + 6, 84); g.lineTo(x + 114, 84); g.lineTo(x + 118, 96); g.lineTo(x + 2, 96); g.fill();
      for (let k = 0; k < 9; k++) rect(g, x + 4 + k * 12.6, 96, 6.3, 3, nc);
      rrect(g, x + 18, 72, 84, 11, 2, '#0c0610'); g.font = '400 8px ' + FONT_DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = nc; g.fillText(sign, x + 60, 78); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(glowSprite(nc), x + 10, 62, 100, 32); g.restore();
      // the shop window and door
      rect(g, x + 10, 100, 64, 30, '#0e0a14'); g.fillStyle = lgrad(g, 0, 100, 0, 130, [[0, rgba(nc, 0.4)], [1, rgba(nc, 0.08)]]); g.fillRect(x + 11, 101, 62, 28);
      rect(g, x + 82, 100, 26, 34, '#0a070e'); rect(g, x + 84, 102, 22, 30, shade(col, -0.3));
      rect(g, x, 130, 120, 4, '#1a1018');
    }
    // lanterns strung across
    g.strokeStyle = '#2a1a1a'; g.lineWidth = 0.6;
    for (let x = Math.floor(x0 / 60) * 60; x < x1 + 60; x += 60) { g.beginPath(); g.moveTo(x, 6); g.quadraticCurveTo(x + 30, 16, x + 60, 6); g.stroke(); for (const k of [0.25, 0.5, 0.75]) { const lx = x + 60 * k, ly = 6 + 10 * 4 * k * (1 - k); disc(g, lx, ly + 3, 3, '#e8302a'); rect(g, lx - 2, ly + 5.4, 4, 1, '#ffd24a'); } }
    // floor: pavement, kerb, road
    streetFloor(g, x0, x1, 134, ['#2a2430', '#2e2834', '#24202c', '#282230', '#22202a', '#26222e'], 'rgba(0,0,0,0.3)', [[134, '#3a3240', 1.2], [150, '#5a5464', 2.4], [152, '#14121a', 1]]);
    for (let x = Math.floor(x0 / 70) * 70; x < x1; x += 70) { rect(g, x, 182, 26, 2, 'rgba(255,240,200,0.35)'); }
    // neon reflections in the wet road
    for (let b = Math.floor(x0 / 120) - 1; b * 120 < x1 + 120; b++) { const nc = NEON[b % NEON.length & 7 % NEON.length] || NEON[0]; g.fillStyle = lgrad(g, 0, 156, 0, 210, [[0, rgba(nc, 0.16)], [1, rgba(nc, 0)]]); g.fillRect(b * 120 + 24, 156, 72, 54); }
  },
  yard(g, x0, x1) {
    // containers behind a chain fence
    for (let b = Math.floor(x0 / 96) - 1; b * 96 < x1 + 96; b++) {
      const x = b * 96, col = ['#a8402a', '#2a6a8a', '#c88a2a', '#3a7a4a', '#6a3a7a'][((b % 5) + 5) % 5];
      for (let row = 0; row < 2; row++) {
        const y = 52 + row * 40, cx = x + (row ? 18 : 0);
        rect(g, cx, y, 90, 38, col); for (let k = 4; k < 90; k += 6) rect(g, cx + k, y + 2, 2, 34, shade(col, -0.2));
        rect(g, cx, y, 90, 2.4, shade(col, 0.25)); rect(g, cx + 2, y + 34, 86, 4, shade(col, -0.4));
        g.font = '700 6px ' + FONT_UI; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText(['VPRX', 'KITE', 'ORCA', 'NOVA', 'ATLAS'][((b + row) % 5 + 5) % 5] + ' 40' + ((b * 7 + row) % 9), cx + 6, y + 9);
      }
    }
    g.strokeStyle = 'rgba(160,170,190,0.5)'; g.lineWidth = 0.4;
    for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) { g.beginPath(); g.moveTo(x, 96); g.lineTo(x + 18, 132); g.moveTo(x + 18, 96); g.lineTo(x, 132); g.stroke(); }
    for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) rect(g, x, 92, 2, 42, '#5a6070');
    rect(g, x0, 92, x1 - x0, 1.4, '#7a8090');
    // gravel bed and two rail lines across the back of the floor
    streetFloor(g, x0, x1, 134, ['#4a4238', '#4e463c', '#463e34', '#4a4238', '#443c32', '#48403a'], 'rgba(0,0,0,0.18)', []);
    for (const ry of [140, 156]) { for (let x = Math.floor(x0 / 10) * 10; x < x1; x += 10) rect(g, x, ry - 1, 6, 8, '#3a2a1e'); rect(g, x0, ry, x1 - x0, 1.6, '#9aa0aa'); rect(g, x0, ry + 5, x1 - x0, 1.6, '#9aa0aa'); }
    const r = seeded(Math.floor(x0 / TILE) + 3); for (let i = 0; i < 90; i++) rect(g, x0 + r() * (x1 - x0), 168 + r() * 46, 1.2, 1, 'rgba(0,0,0,0.25)');
  },
  foundry(g, x0, x1) {
    // brick wall with furnace mouths
    g.fillStyle = '#3a2420'; g.fillRect(x0, 0, x1 - x0, 134);
    for (let y = 0; y < 134; y += 6) for (let x = Math.floor(x0 / 14) * 14 - ((y / 6) % 2) * 7; x < x1; x += 14) { rect(g, x + 0.5, y + 0.5, 13, 5, (Math.floor(x / 14) + y / 6) % 3 ? '#4a2a22' : '#52302a'); }
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
    streetFloor(g, x0, x1, 134, ['#3a3a40', '#36363c', '#3e3e44', '#34343a', '#3a3a40', '#38383e'], 'rgba(0,0,0,0.35)', []);
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
    rect(g, x0, 112, x1 - x0, 22, '#2a3240'); rect(g, x0, 112, x1 - x0, 2, '#4a5468');
    for (let x = Math.floor(x0 / 30) * 30; x < x1; x += 30) rect(g, x, 114, 1, 20, '#202834');
    // wet concrete roof, helipad marks
    streetFloor(g, x0, x1, 134, ['#3a4250', '#363e4c', '#3c4452', '#343c4a', '#38404e', '#363e4c'], 'rgba(0,0,0,0.3)', []);
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
