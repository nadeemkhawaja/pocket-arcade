/* ==========================================================================
   Props, projectiles, pickups and effects, all drawn as vector art in world units
   ========================================================================== */

const h01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function capsule(g, ax, ay, bx, by, ra, rb, col) { g.fillStyle = col; capsulePath(g, ax, ay, bx, by, ra, rb); g.fill(); }
/** Ink outline then a fill, for simple closed shapes built by a path function. */
function inked(g, build, col, w) { build(); g.lineJoin = 'round'; g.lineWidth = w || OLW * 2; g.strokeStyle = INK; g.stroke(); g.fillStyle = col; g.fill(); }

const PUFF_CACHE = {};
/** Soft round sprite in one colour: smoke, dust and fire blobs. */
function puffSprite(col) {
  let c = PUFF_CACHE[col];
  if (c) return c;
  c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  g.fillStyle = rgrad(g, 32, 32, 0, 32, [[0, rgba(col, 0.95)], [0.55, rgba(col, 0.6)], [1, rgba(col, 0)]]);
  g.fillRect(0, 0, 64, 64);
  PUFF_CACHE[col] = c;
  return c;
}
function drawPuff(g, x, y, r, col, a) {
  const ga = g.globalAlpha;
  g.globalAlpha = ga * (a === undefined ? 1 : a);
  g.drawImage(puffSprite(col), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = ga;
}

/** Contact shadow on the surface under an actor; fades as they leave the ground. */
function drawShadowV(g, cx, x, y, w) {
  const fy = landY(x, y - 0.6, H, null);
  if (fy === null) return;
  const lift = clamp((fy - y) / 70, 0, 1);
  const ww = w * 2.4 * (1 - lift * 0.5);
  g.globalAlpha = 0.85 * (1 - lift * 0.7);
  g.drawImage(shadowSprite(), x - cx - ww / 2, fy - 2.2, ww, 4.4);
  g.globalAlpha = 1;
}

/* ---- the attack dog ------------------------------------------------------------- */
function drawDogV(g, x, y, face, phase, air, dead, flash, alpha) {
  const tan = '#9a7444', tanS = '#6e5030', saddle = '#2c241e', belly = '#c4a470';
  g.save();
  g.translate(x, y);
  if (face < 0) g.scale(-1, 1);
  if (dead) { g.translate(0, -5); g.scale(1, -1); g.translate(0, 5); }
  g.globalAlpha *= alpha === undefined ? 1 : alpha;
  const leg = (hx, hy, a, back) => {
    const kx = hx + Math.sin(a) * 3.2, ky = hy + Math.cos(a) * 3.2;
    const fx = kx + Math.sin(a * 0.55 - 0.25) * 3.4, fy = Math.min(-0.2, ky + Math.cos(a * 0.55 - 0.25) * 3.4);
    const c = back ? tanS : tan;
    capsule(g, hx, hy, kx, ky, 1.55, 1.2, INK); capsule(g, kx, ky, fx, fy, 1.2, 1.0, INK); capsule(g, fx, fy, fx + 1.2, fy, 0.95, 0.9, INK);
    capsule(g, hx, hy, kx, ky, 1.15, 0.85, c); capsule(g, kx, ky, fx, fy, 0.8, 0.6, c); capsule(g, fx, fy, fx + 1.2, fy, 0.55, 0.5, back ? '#4a3a26' : belly);
  };
  let f1, f2, h1, h2;
  if (dead) { f1 = 0.5; f2 = 0.9; h1 = -0.6; h2 = -0.2; }
  else if (air) { f1 = 1.15; f2 = 0.95; h1 = -1.1; h2 = -0.9; }
  else { f1 = Math.sin(phase) * 0.95; f2 = Math.sin(phase + 0.7) * 0.95; h1 = Math.sin(phase + 2.6) * 0.95; h2 = Math.sin(phase + 3.3) * 0.95; }
  const bob = air || dead ? 0 : Math.abs(Math.sin(phase)) * 0.7;
  g.translate(0, -bob);
  // far legs, tail, body, near legs, head
  leg(5.2, -6.2, f2, true); leg(-5.6, -6.4, h2, true);
  const tw = dead ? 0.2 : Math.sin(game.t * 9 + x) * 0.25;
  capsule(g, -8, -8.6, -12.4, -11.6 + tw * 3, 1.25, 0.6, INK); capsule(g, -8, -8.6, -12.4, -11.6 + tw * 3, 0.85, 0.3, saddle);
  capsule(g, -6.2, -7.8, 5.4, -8.4, 3.75, 3.5, INK);
  capsule(g, -6.2, -7.8, 5.4, -8.4, 3.3, 3.05, tan);
  capsule(g, -5.8, -9.2, 4.6, -9.9, 2.1, 1.7, saddle);
  capsule(g, -4.6, -5.6, 4.4, -5.9, 1.3, 1.2, belly);
  leg(5.8, -6.0, f1, false); leg(-5.2, -6.2, h1, false);
  // neck and head
  capsule(g, 5.6, -9.4, 9.4, -11.6, 2.6, 2.3, INK); capsule(g, 5.6, -9.4, 9.4, -11.6, 2.15, 1.85, tan);
  rect(g, 6.6, -11.9, 1.5, 3.6, '#c0392b');
  inked(g, () => polyPath(g, [8.2, -13.4, 9.3, -17.2, 10.6, -13.6]), saddle, 0.7);
  inked(g, () => polyPath(g, [9.8, -13.6, 11.4, -16.8, 12.2, -13.2]), tanS, 0.7);
  capsule(g, 10, -11.8, 14.6, -10.6, 2.5, 1.5, INK); capsule(g, 10, -11.8, 14.6, -10.6, 2.05, 1.05, tan);
  capsule(g, 12.6, -10.4, 15.2, -10.2, 0.95, 0.85, saddle);
  disc(g, 15.6, -10.9, 0.7, '#120c0a');
  if (!dead) {
    capsule(g, 11.4, -9.2, 14.6, -8.6, 0.9, 0.6, INK); capsule(g, 11.6, -9.3, 14.4, -8.8, 0.55, 0.3, '#b03a3a');
    poly(g, [13.2, -9.9, 13.9, -9.9, 13.5, -8.7], '#fff8ec');
    disc(g, 11.1, -12.5, 0.75, '#fff3d0'); disc(g, 11.3, -12.5, 0.42, '#1a0c08');
  } else line(g, 10.6, -12.8, 11.6, -12.2, 0.35, '#1a0c08');
  if (flash) { g.globalCompositeOperation = 'lighter'; g.globalAlpha *= 0.55; capsule(g, -6.2, -7.8, 5.4, -8.4, 3.75, 3.5, '#ffffff'); capsule(g, 10, -11.8, 14.6, -10.6, 2.5, 1.5, '#ffffff'); }
  g.restore();
}

/* ---- props ------------------------------------------------------------------------- */
function drawCrateV(g, x, y) {
  const w = 16, h = 14, x0 = x - 8, y0 = y - h;
  rrect(g, x0 - 0.5, y0 - 0.5, w + 1, h + 1, 1, INK);
  g.fillStyle = lgrad(g, x0, y0, x0 + w, y0 + h, [[0, '#c7924f'], [1, '#8a5a2c']]); g.fillRect(x0, y0, w, h);
  for (let i = 1; i < 4; i++) rect(g, x0 + i * 4 - 0.2, y0 + 2, 0.4, h - 4, 'rgba(60,34,12,0.5)');
  stampLine(g, x0 + 2.4, y0 + 2.4, x0 + w - 2.4, y0 + h - 2.4, 2, '#7a4e24');
  stampLine(g, x0 + 2.6, y0 + 2.2, x0 + w - 2.6, y0 + h - 2.8, 0.9, '#b98444');
  g.strokeStyle = '#6e4520'; g.lineWidth = 2.1; g.strokeRect(x0 + 1.05, y0 + 1.05, w - 2.1, h - 2.1);
  g.strokeStyle = '#d6a765'; g.lineWidth = 0.5; g.strokeRect(x0 + 0.4, y0 + 0.4, w - 0.8, h - 0.8);
  for (const [dx, dy] of [[1.2, 1.2], [w - 1.2, 1.2], [1.2, h - 1.2], [w - 1.2, h - 1.2]]) disc(g, x0 + dx, y0 + dy, 0.5, '#3a2410');
  rect(g, x0, y0 + h - 1.2, w, 1.2, 'rgba(0,0,0,0.22)');
}

function drawBarrelV(g, x, y, lit) {
  const w = 12, h = 16, x0 = x - 6, y0 = y - h;
  rrect(g, x0 - 0.5, y0 - 0.2, w + 1, h + 0.7, 2, INK);
  g.fillStyle = lgrad(g, x0, 0, x0 + w, 0, [[0, '#7a1c18'], [0.3, '#e0463a'], [0.48, '#f0705c'], [0.75, '#b02a22'], [1, '#5e1412']]);
  roundRectPath(g, x0, y0 + 0.4, w, h - 0.4, 1.6); g.fill();
  for (const by of [y0 + 4.4, y0 + 10.6]) { rect(g, x0, by, w, 1.3, 'rgba(40,8,8,0.55)'); rect(g, x0 + 1, by - 0.5, w - 2, 0.5, 'rgba(255,190,170,0.35)'); }
  ellipse(g, x, y0 + 1.1, w / 2 - 0.2, 1.5, 0, '#4a1210'); ellipse(g, x, y0 + 0.9, w / 2 - 1, 1.0, 0, '#8a2a24');
  disc(g, x + 2.4, y0 + 0.9, 0.55, '#1c1a1c');
  // hazard diamond
  g.save(); g.translate(x - 0.4, y0 + 7.9); g.rotate(Math.PI / 4);
  rect(g, -2.1, -2.1, 4.2, 4.2, '#1a1410'); rect(g, -1.7, -1.7, 3.4, 3.4, '#f2c230');
  g.restore();
  poly(g, [x - 0.4, y0 + 6.2, x + 0.8, y0 + 8.6, x - 0.4, y0 + 9.6, x - 1.6, y0 + 8.6], '#c8281e');
  if (lit) { g.globalAlpha = 0.6; rrect(g, x0, y0 + 0.4, w, h - 0.4, 1.6, '#fff6e0'); g.globalAlpha = 1; drawGlow(g, x, y - 8, 16, '#ffb040', 0.8); }
}

function cageBars(g, x, y, front) {
  const col = front ? '#9aa4b2' : '#4a5260', hi = front ? '#d8e0ea' : '#6a7380';
  const xs = front ? [-9, -3, 3, 9] : [-6, 0, 6];
  for (const bx of xs) {
    rect(g, x + bx - 0.9, y - 31.5, 1.8, 29.5, INK);
    rect(g, x + bx - 0.55, y - 31.5, 1.1, 29.5, col); rect(g, x + bx - 0.55, y - 31.5, 0.35, 29.5, hi);
  }
}
function drawCageBackV(g, x, y) {
  cageBars(g, x, y, false);
}
function drawCageFrontV(g, x, y, open) {
  const plate = (py, h) => {
    rrect(g, x - 12.6, py - 0.4, 25.2, h + 0.8, 1, INK);
    g.fillStyle = lgrad(g, 0, py, 0, py + h, [[0, '#8a94a4'], [1, '#4a5260']]); roundRectPath(g, x - 12.2, py, 24.4, h, 0.8); g.fill();
    for (const dx of [-10, -5, 0, 5, 10]) disc(g, x + dx, py + h / 2, 0.45, '#2a2f38');
  };
  if (!open) {
    cageBars(g, x, y, true);
    rrect(g, x - 2.6, y - 19.6, 5.2, 5.6, 1, INK); rrect(g, x - 2.1, y - 19.1, 4.2, 4.6, 0.8, '#d0a030'); disc(g, x, y - 17.2, 0.8, '#3a2a10');
    rect(g, x - 0.3, y - 17.2, 0.6, 1.8, '#3a2a10');
  } else {
    // door swung wide: bars seen edge on at the right side
    for (const bx of [10.4, 12, 13.6]) { rect(g, x + bx - 0.7, y - 31.5, 1.4, 29.5, INK); rect(g, x + bx - 0.4, y - 31.5, 0.8, 29.5, '#8792a0'); }
    rect(g, x + 9.4, y - 22, 5.2, 1.4, '#5a6270'); rect(g, x + 9.4, y - 12, 5.2, 1.4, '#5a6270');
  }
  plate(y - 34, 3); plate(y - 2.4, 2.4);
}

function drawMineV(g, x, y, armed) {
  ellipse(g, x, y - 1.1, 5, 2.3, 0, INK);
  ellipse(g, x, y - 1.3, 4.5, 1.9, 0, '#4a5040'); ellipse(g, x - 0.6, y - 1.8, 3, 1.0, 0, '#6c745c');
  for (const dx of [-3.2, 0, 3.2]) { rect(g, x + dx - 0.35, y - 3.6, 0.7, 1.6, '#22261e'); }
  const on = armed ? Math.floor(game.t * 20) % 2 : Math.floor(game.t * 2 + x) % 2;
  disc(g, x, y - 3.9, 0.85, on ? '#ff3a2a' : '#5a1a14');
  if (on) drawGlow(g, x, y - 3.9, armed ? 9 : 5, '#ff3a2a', 0.9);
}

function drawChuteV(g, x, y, t) {
  const sway = Math.sin(t * 2.2) * 1.4, cx = x + sway, top = y - 60;
  // lines first
  g.strokeStyle = 'rgba(40,36,34,0.85)'; g.lineWidth = 0.35;
  for (const dx of [-15, -8, 0, 8, 15]) { g.beginPath(); g.moveTo(cx + dx, top + 13); g.lineTo(x + (dx < 0 ? -2.4 : dx > 0 ? 2.8 : 0.2), y - 26); g.stroke(); }
  const dome = () => {
    g.beginPath(); g.moveTo(cx - 16.5, top + 13);
    g.bezierCurveTo(cx - 17, top - 2, cx - 7, top - 5, cx, top - 5);
    g.bezierCurveTo(cx + 7, top - 5, cx + 17, top - 2, cx + 16.5, top + 13);
    for (let i = 3; i >= 0; i--) { const xa = cx - 16.5 + i * 8.25; g.quadraticCurveTo(xa + 4.1, top + 9.4, xa, top + 13); }
    g.closePath();
  };
  dome(); g.lineJoin = 'round'; g.lineWidth = 1; g.strokeStyle = INK; g.stroke();
  g.save(); dome(); g.clip();
  for (let i = 0; i < 4; i++) rect(g, cx - 16.5 + i * 8.25, top - 6, 8.25, 20, i % 2 ? '#e6dfc4' : '#b8382c');
  g.fillStyle = lgrad(g, cx - 17, top, cx + 17, top, [[0, 'rgba(0,0,0,0.32)'], [0.35, 'rgba(255,255,255,0.16)'], [1, 'rgba(0,0,0,0.38)']]); g.fillRect(cx - 18, top - 6, 36, 20);
  g.fillStyle = lgrad(g, 0, top - 5, 0, top + 13, [[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(0,0,0,0.25)']]); g.fillRect(cx - 18, top - 6, 36, 20);
  g.restore();
}

/* ---- pickups ----------------------------------------------------------------------- */
const PICK_DRAW = {
  tri(g) {
    for (const a of [-0.5, 0, 0.5]) {
      g.save(); g.rotate(a - Math.PI / 2); g.translate(-1.5, 0);
      inked(g, () => polyPath(g, [0, -0.8, 5.2, -0.6, 7, 0, 5.2, 0.6, 0, 0.8]), '#dfe7ee', 0.6);
      rect(g, -2.6, -0.65, 2.6, 1.3, '#3a2a1c'); rect(g, -0.4, -1.2, 0.7, 2.4, '#9aa2ac');
      g.restore();
    }
  },
  gren(g) {
    disc(g, 0, 1, 4.4, INK); disc(g, 0, 1, 3.9, '#3f5228'); disc(g, -1.2, -0.2, 2, '#6f8a48');
    for (const a of [-1, 0, 1]) rect(g, -3.4, 0.4 + a * 1.9, 6.8, 0.35, 'rgba(20,30,10,0.55)');
    rect(g, -1.5, -4.6, 3, 2.2, INK); rect(g, -1.1, -4.3, 2.2, 1.6, '#a8aeb6');
    g.strokeStyle = '#d8dce2'; g.lineWidth = 0.55; g.beginPath(); g.arc(2.6, -3.6, 1.5, 0, TAU); g.stroke();
  },
  rocket(g) {
    g.save(); g.rotate(-0.6);
    inked(g, () => polyPath(g, [-5.5, -2.6, -3.2, -1.2, -3.2, 1.2, -5.5, 2.6]), '#8a2a22', 0.6);
    inked(g, () => roundRectPath(g, -3.6, -1.5, 7.2, 3, 1.2), '#5c6a3c', 0.6);
    inked(g, () => polyPath(g, [3.4, -1.5, 6.6, 0, 3.4, 1.5]), '#d8402f', 0.6);
    rect(g, -3.2, -1.2, 6.4, 0.7, '#8a9a5c'); rect(g, 0.6, -1.5, 0.7, 3, '#e3bd4b');
    g.restore();
  },
  katana(g) {
    g.save(); g.rotate(-0.78);
    inked(g, () => polyPath(g, [-1.4, -0.55, 6.6, -0.95, 7.9, -0.3, 6.5, 0.3, -1.4, 0.55]), '#e6edf5', 0.6);
    rect(g, -6.4, -0.6, 4.6, 1.2, INK); rect(g, -6.1, -0.38, 4.2, 0.76, '#3a3050');
    for (let i = 0; i < 3; i++) rect(g, -5.6 + i * 1.3, -0.38, 0.5, 0.76, '#c9a24a');
    rrect(g, -2, -1.4, 0.9, 2.8, 0.3, '#c9a24a');
    g.restore();
  },
  star(g) {
    for (const [ox, oy, r, a] of [[-1.8, 1.2, 3.3, 0.3], [2, -1, 3.8, 0.9]]) {
      g.save(); g.translate(ox, oy); g.rotate(a);
      starShape(g, 0, 0, r); g.lineJoin = 'round'; g.lineWidth = 0.7; g.strokeStyle = INK; g.stroke();
      g.fillStyle = lgrad(g, -3, -3, 3, 3, [[0, '#ffffff'], [1, '#7a8a9a']]); g.fill(); disc(g, 0, 0, 0.7, '#2a2a34');
      g.restore();
    }
  },
  flame(g) {
    inked(g, () => roundRectPath(g, -3.4, -3.4, 6.8, 8.2, 1.4), '#c0392b', 0.7);
    rect(g, -2.9, -3, 1.5, 7.4, '#e8685a'); rect(g, -1.4, -5.4, 2.8, 2.2, INK); rect(g, -1, -5, 2, 1.6, '#8a9098');
    g.fillStyle = '#ffd34a'; g.beginPath(); g.moveTo(0, -1.8); g.quadraticCurveTo(2.6, 0.6, 0.9, 3); g.quadraticCurveTo(0.2, 3.6, -0.8, 3); g.quadraticCurveTo(-2.4, 1, 0, -1.8); g.fill();
    disc(g, 0.1, 2, 0.9, '#ff7a2a');
  },
  medal(g) {
    poly(g, [-2.8, -5.6, -0.6, -5.6, 0.6, -1.4, -1.2, -1.2], '#c0392b'); poly(g, [0.6, -5.6, 2.8, -5.6, 1.2, -1.2, -0.6, -1.4], '#3a6ad0');
    disc(g, 0, 1.6, 4.1, INK); disc(g, 0, 1.6, 3.6, '#f2c94c'); disc(g, 0, 1.6, 2.7, '#d9a52c');
    g.save(); g.translate(0, 1.6); g.rotate(-Math.PI / 2);
    g.fillStyle = '#fff2b0'; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 0.95 : 2.2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.restore();
    line(g, -2.2, -0.6, -0.8, -1.4, 0.4, 'rgba(255,255,255,0.7)');
  },
  ration(g) {
    inked(g, () => roundRectPath(g, -4.6, -3.4, 9.2, 7.2, 1.3), '#f1f4f6', 0.7);
    rect(g, -4.2, 2.2, 8.4, 1.2, '#c8ced4'); rect(g, -1.1, -2.4, 2.2, 5, '#e0392e'); rect(g, -2.5, -1, 5, 2.2, '#e0392e');
    rect(g, -1.6, -4.6, 3.2, 1.4, INK); rect(g, -1.2, -4.3, 2.4, 0.9, '#8a9098');
  },
  life(g) {
    disc(g, 0, 0, 5.2, INK); disc(g, 0, 0, 4.7, '#2aa55a'); disc(g, -0.8, -0.9, 3.2, '#4ad17a');
    g.save(); g.translate(-0.4, 0.5); drawPortrait(g, 'hero', 0, 0, 5.4, 1); g.restore();
  }
};

function drawPickupV(g, type, x, y, t, alpha) {
  const P = PICKUPS[type] || {};
  const bob = Math.sin(t * 4.2) * 1.2;
  g.save();
  g.globalAlpha *= alpha === undefined ? 1 : alpha;
  drawGlow(g, x, y - 7 + bob, 13 + Math.sin(t * 6) * 1.5, P.color || '#ffffff', 0.55);
  g.translate(x, y - 7 + bob);
  g.rotate(Math.sin(t * 2.1) * 0.12);
  if (PICK_DRAW[type]) PICK_DRAW[type](g);
  g.restore();
  if (Math.floor(t * 3) % 3 === 0) {
    const sx = x + 5 * Math.cos(t * 3), sy = y - 11 + bob + 3 * Math.sin(t * 5);
    stampLine(g, sx - 1.6, sy, sx + 1.6, sy, 0.4, '#ffffff'); stampLine(g, sx, sy - 1.6, sx, sy + 1.6, 0.4, '#ffffff');
  }
}

function drawHeartV(g, x, y, s, full) {
  const p = () => {
    g.beginPath(); g.moveTo(x, y + 2.9 * s);
    g.bezierCurveTo(x - 5.4 * s, y - 0.6 * s, x - 2.8 * s, y - 4.2 * s, x, y - 1.5 * s);
    g.bezierCurveTo(x + 2.8 * s, y - 4.2 * s, x + 5.4 * s, y - 0.6 * s, x, y + 2.9 * s);
    g.closePath();
  };
  p(); g.lineJoin = 'round'; g.lineWidth = 0.9 * s; g.strokeStyle = '#1a0a10'; g.stroke();
  g.fillStyle = full ? lgrad(g, 0, y - 3 * s, 0, y + 3 * s, [[0, '#ff7a6a'], [1, '#c8221c']]) : '#3a2a32'; g.fill();
  if (full) ellipse(g, x - 1.3 * s, y - 1.3 * s, 0.9 * s, 0.55 * s, -0.5, 'rgba(255,255,255,0.75)');
}

/* ---- projectiles ---------------------------------------------------------------------- */
function drawShotV(g, s, cx) {
  const x = s.x - cx, y = s.y;
  switch (s.k) {
    case 'bullet': {
      const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
      const col = s.mine ? '#9fe8ff' : s.aimed ? '#ff8a3a' : '#ffd24a';
      drawGlow(g, x, y, s.aimed ? 8 : 6, col, 0.85);
      g.strokeStyle = lgrad(g, x - ux * 12, y - uy * 12, x, y, [[0, rgba(col, 0)], [1, rgba(col, 0.9)]]);
      g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - ux * 12, y - uy * 12); g.lineTo(x, y); g.stroke();
      capsule(g, x - ux * 2.4, y - uy * 2.4, x + ux * 1.2, y + uy * 1.2, 1.25, 1.25, '#ffffff');
      break;
    }
    case 'tknife': {
      g.save(); g.translate(x, y); g.rotate(s.t * 28 * (sgn(s.vx) || 1));
      g.globalAlpha *= 0.35; g.strokeStyle = '#dff2ff'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 4.2, -2.4, 0.2); g.stroke(); g.globalAlpha /= 0.35;
      inked(g, () => polyPath(g, [-0.4, -0.75, 3.6, -0.6, 5.2, 0, 3.6, 0.6, -0.4, 0.75]), '#e6edf5', 0.6);
      rect(g, -4.4, -0.7, 4, 1.4, INK); rect(g, -4.1, -0.45, 3.5, 0.9, '#4a3424');
      g.restore();
      break;
    }
    case 'star': {
      const dir = sgn(s.vx) || 1, col = s.foe ? '#ff8a8a' : '#bfe6ff';
      g.globalAlpha *= 0.4; stampLine(g, x - dir * 13, y, x, y, 1.6, col); g.globalAlpha /= 0.4;
      drawGlow(g, x, y, 6.5, s.foe ? '#ff5a4a' : '#9fe8ff', 0.6);
      g.save(); g.translate(x, y); g.rotate(s.t * 30 * dir);
      starShape(g, 0, 0, 3.5); g.lineJoin = 'round'; g.lineWidth = 0.7; g.strokeStyle = INK; g.stroke();
      g.fillStyle = lgrad(g, -3, -3, 3, 3, [[0, '#f6fafe'], [0.5, '#9aaabb'], [1, '#5a6878']]); g.fill(); disc(g, 0, 0, 0.8, '#2a2a34');
      g.restore();
      break;
    }
    case 'hgren': case 'egren': {
      const mine = s.k === 'hgren';
      g.save(); g.translate(x, y); g.rotate(s.t * 9 * (sgn(s.vx) || 1));
      disc(g, 0, 0, 2.9, INK); disc(g, 0, 0, 2.45, mine ? '#4a6a2c' : '#4a4a3c'); disc(g, -0.7, -0.7, 1.2, mine ? '#7a9a4a' : '#74745e');
      rect(g, -0.8, -3.7, 1.6, 1.3, '#9aa0a8');
      g.restore();
      if (!mine && Math.floor(s.t * 12) % 2) { disc(g, x, y, 1, '#ff3a2a'); drawGlow(g, x, y, 7, '#ff3a2a', 0.9); }
      break;
    }
    case 'rocket': {
      const f = sgn(s.vx) || 1;
      const fl = 5 + Math.random() * 5;
      drawGlow(g, x - f * 8, y, 12, '#ffb040', 0.9);
      g.fillStyle = lgrad(g, x - f * (5 + fl), 0, x - f * 4, 0, [[0, 'rgba(255,120,30,0)'], [0.5, '#ff9a30'], [1, '#fff2b0']]);
      g.beginPath(); g.moveTo(x - f * 4.5, y - 1.6); g.quadraticCurveTo(x - f * (5 + fl * 0.6), y - 1.2, x - f * (5 + fl), y); g.quadraticCurveTo(x - f * (5 + fl * 0.6), y + 1.2, x - f * 4.5, y + 1.6); g.closePath(); g.fill();
      g.save(); g.translate(x, y); g.scale(f, 1);
      inked(g, () => polyPath(g, [-5.6, -2.8, -3.4, -1.3, -3.4, 1.3, -5.6, 2.8]), '#7a2a22', 0.6);
      inked(g, () => roundRectPath(g, -4, -1.6, 7.6, 3.2, 1.2), '#5c6a3c', 0.6);
      inked(g, () => polyPath(g, [3.2, -1.6, 6.4, 0, 3.2, 1.6]), '#d8402f', 0.6);
      rect(g, -3.4, -1.3, 6.4, 0.7, '#8a9a5c');
      g.restore();
      break;
    }
    case 'shell':
      g.globalAlpha *= 0.3; stampLine(g, x - s.vx * 0.04, y - s.vy * 0.04, x, y, 3, '#c8c8d0'); g.globalAlpha /= 0.3;
      disc(g, x, y, 3.3, INK); disc(g, x, y, 2.8, '#3a3a44'); disc(g, x - 0.9, y - 0.9, 1.1, '#8a8a98');
      break;
    case 'bomb': {
      g.save(); g.translate(x, y); g.rotate(Math.atan2(s.vy, s.vx || 0.01) - Math.PI / 2);
      inked(g, () => polyPath(g, [-2.6, -5.6, 2.6, -5.6, 1.2, -3.4, -1.2, -3.4]), '#5a5f52', 0.6);
      inked(g, () => { g.beginPath(); g.ellipse(0, 0, 2.3, 4.2, 0, 0, TAU); }, '#3a4030', 0.6);
      ellipse(g, -0.7, -0.6, 0.8, 2.6, 0, '#6a7458'); rect(g, -2.2, 1, 4.4, 0.8, '#e3bd4b');
      g.restore();
      break;
    }
    case 'rock': {
      g.save(); g.translate(x, y); g.rotate(s.t * 6);
      inked(g, () => polyPath(g, [-4.2, -1.4, -1.6, -4.3, 2.6, -3.6, 4.4, 0.2, 2.2, 4, -2.4, 3.6]), '#7a5a3a', 0.8);
      poly(g, [-2.8, -1.4, -1, -3.2, 2, -2.6, 0.2, -0.6], '#a8825a'); poly(g, [1, 1, 3.2, 0.4, 1.8, 3, -1, 2.6], '#5a4028');
      g.restore();
      break;
    }
    case 'wave': {
      const dir = sgn(s.vx) || 1, k = 1 - clamp(s.dist / s.max, 0, 1);
      g.globalAlpha *= 0.35 + k * 0.65;
      for (let i = 0; i < 4; i++) {
        const hx = x - dir * i * 4.5, hh = (9 - i * 1.8) * (0.8 + 0.2 * Math.sin(s.t * 40 + i));
        g.fillStyle = i % 2 ? '#f2e2b4' : '#c9a468';
        g.beginPath(); g.moveTo(hx - dir * 4, y); g.quadraticCurveTo(hx - dir * 1, y - hh * 1.25, hx + dir * 3.2, y - hh * 0.5); g.quadraticCurveTo(hx + dir * 1.6, y - hh * 0.2, hx + dir * 2.6, y); g.closePath(); g.fill();
      }
      drawPuff(g, x - dir * 8, y - 2, 7, '#d8c8a0', 0.5);
      g.globalAlpha = 1;
      break;
    }
    case 'flame': {
      const k = clamp(s.t / s.life, 0, 1), r = 3 + k * 7.5;
      const col = k < 0.3 ? '#fff0a8' : k < 0.6 ? '#ffb030' : k < 0.85 ? '#e8501c' : '#5a4a48';
      if (k < 0.85) drawGlow(g, x, y, r * 2.4, '#ff8a2a', 0.5 * (1 - k));
      drawPuff(g, x, y - k * 3, r, col, 1 - k * 0.8);
      break;
    }
    default: break;
  }
  if (s.mark) {
    const mx = s.mx - cx, my = s.my, p = 0.6 + 0.4 * Math.sin(s.t * 18);
    g.globalAlpha = 0.5 + 0.5 * p;
    g.save(); g.translate(mx, my - 0.8); g.scale(1, 0.34);
    g.strokeStyle = '#ff4a3a'; g.lineWidth = 1.1; g.beginPath(); g.arc(0, 0, 7 + (1 - p) * 3, 0, TAU); g.stroke();
    g.restore();
    stampLine(g, mx - 3, my - 1, mx + 3, my - 1, 0.6, '#ff4a3a'); stampLine(g, mx, my - 3.4, mx, my - 0.2, 0.6, '#ff4a3a');
    g.globalAlpha = 1;
  }
}

/* ---- explosions and other effects ------------------------------------------------------- */
function drawBoomV(g, x, y, r, t) {
  const k = clamp(t / 0.5, 0, 1);
  if (t < 0.06) {
    drawGlow(g, x, y, r * 2.6, '#fff2c0', 1);
    disc(g, x, y, r * (0.5 + t * 6), '#fffdf0');
    return;
  }
  drawGlow(g, x, y - k * 5, r * (2.3 - k * 0.6), '#ff9a30', 0.95 * (1 - k));
  const rr = r * (0.6 + k * 0.5), n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r, w = 0.6 + 0.4 * Math.sin(i * 3.1 + r);
    const d = rr * 0.5 * w * (0.5 + k * 0.7);
    const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.8 - k * 8;
    const br = Math.max(0.6, rr * 0.56 * (1 - k * 0.45) * (0.8 + 0.3 * w));
    const col = k < 0.22 ? '#ffe68a' : k < 0.45 ? '#ff9a30' : k < 0.7 ? '#c8502a' : '#55504e';
    drawPuff(g, bx, by, br, col, 1 - k * k * 0.9);
  }
  if (k < 0.5) drawPuff(g, x, y - k * 8, rr * 0.5 * (1 - k), '#fff8d8', 1 - k * 2);
  // shock ring hugging the ground plane
  g.save(); g.translate(x, y); g.scale(1, 0.55);
  g.globalAlpha = (1 - k) * 0.8; g.strokeStyle = '#fff0c8'; g.lineWidth = 1.4 * (1 - k) + 0.3;
  g.beginPath(); g.arc(0, 0, r * (0.5 + k * 1.5), 0, TAU); g.stroke();
  g.restore(); g.globalAlpha = 1;
}

function drawFxV(g, cx) {
  for (const f of game.fx) {
    const x = f.x - cx, y = f.y;
    switch (f.k) {
      case 'p': {
        const a = clamp(1 - f.t / f.life, 0, 1);
        g.globalAlpha = Math.min(1, a * 1.6);
        if (f.glow) drawGlow(g, x, y, 4 + f.sz * 2, f.col, 0.7 * a);
        const sp = Math.hypot(f.vx, f.vy);
        if (sp > 40 && !f.chunk) stampLine(g, x - (f.vx / sp) * (1.2 + f.sz), y - (f.vy / sp) * (1.2 + f.sz), x, y, 0.5 + f.sz * 0.35, f.col);
        else { g.save(); g.translate(x, y); g.rotate(f.t * 9 + f.life * 40); rect(g, -f.sz * 0.6, -f.sz * 0.6, f.sz * 1.2, f.sz * 1.2, f.col); g.restore(); }
        g.globalAlpha = 1;
        break;
      }
      case 'smoke': {
        const k = f.t / f.life;
        drawPuff(g, x, y, f.r * (1.4 + k * 1.8), f.col, (1 - k) * 0.75);
        break;
      }
      case 'star': {
        const k = f.t / f.life, s = (f.big ? 8 : 5) * (1 - k * 0.5);
        drawGlow(g, x, y, s * 2.2, f.col || '#fff2a0', 1 - k);
        g.save(); g.translate(x, y); g.rotate((f.x * 7) % 1.5);
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(-0.8, 0); g.lineTo(0, -s); g.lineTo(0.8, 0); g.closePath(); g.fill(); }
        g.restore(); disc(g, x, y, s * 0.3, f.col || '#fff2a0');
        break;
      }
      case 'flash': {
        const k = f.t / f.life;
        drawGlow(g, x, y, 11, '#ffd880', 1 - k * 0.5);
        g.save(); g.translate(x, y); g.fillStyle = '#fff8dc';
        for (let i = 0; i < 6; i++) { g.rotate(TAU / 6); g.beginPath(); g.moveTo(-0.7, 0); g.lineTo(0, -(i % 2 ? 3.2 : 5.4)); g.lineTo(0.7, 0); g.closePath(); g.fill(); }
        g.restore(); disc(g, x, y, 1.7, '#ffffff');
        break;
      }
      case 'boom': drawBoomV(g, x, y, f.r, f.t); break;
      case 'ring': {
        const k = f.t / f.life, r = lerp(f.r0, f.r1, 1 - (1 - k) * (1 - k));
        g.save(); g.translate(x, y); if (f.flat) g.scale(1, 0.4);
        g.globalAlpha = (1 - k) * (f.a || 0.9); g.strokeStyle = f.col || '#ffffff'; g.lineWidth = (f.w || 1.2) * (1 - k * 0.6);
        g.beginPath(); g.arc(0, 0, Math.max(0.1, r), 0, TAU); g.stroke();
        g.restore(); g.globalAlpha = 1;
        break;
      }
      case 'slash': {
        // crescent left hanging in the air by a blade
        const k = f.t / f.life, a0 = f.a0, a1 = f.a1, R = f.r;
        g.save(); g.translate(x, y); g.scale(f.face, 1);
        g.globalAlpha = (1 - k) * 0.85;
        g.fillStyle = lgrad(g, 0, -R, 0, R, [[0, 'rgba(255,255,255,0)'], [0.5, f.col || '#eaf6ff'], [1, 'rgba(255,255,255,0)']]);
        g.beginPath(); g.arc(0, 0, R, a0, a1); g.arc(-R * 0.18, 0, R * 0.82, a1, a0, true); g.closePath(); g.fill();
        g.restore(); g.globalAlpha = 1;
        break;
      }
      case 'bolt': {
        // jagged electric line used by the citadel storm
        g.globalAlpha = 1 - f.t / f.life; g.strokeStyle = '#eaf2ff'; g.lineWidth = 1.2; g.lineJoin = 'bevel';
        g.beginPath(); g.moveTo(x, HUD_H);
        for (let i = 1; i <= 8; i++) g.lineTo(x + (h01(f.seed + i) - 0.5) * 26 * (1 - i / 9), HUD_H + (y - HUD_H) * (i / 8));
        g.stroke(); g.globalAlpha = 1;
        break;
      }
      default: break;
    }
  }
}
