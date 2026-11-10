/* ==========================================================================
   Soldiers: cel-shaded vector characters posed by inverse kinematics.
   Poses blend smoothly between keyframes; bandanas and straps flutter.
   Everything is drawn in local space: feet at the origin, facing right.
   ========================================================================== */

const INK = '#12101a';
const OLW = 0.42;
const LOOP_ANIMS = new Set(['run', 'idle', 'climb', 'tied', 'charge', 'stun', 'hang', 'salute', 'roll']);
const KIAI_ANIMS = new Set(['stab', 'crouchStab', 'jumpStab', 'throw', 'slash', 'smash', 'kick', 'jab', 'raise', 'charge', 'dash', 'slice', 'airSlice', 'rocket']);
const PAIN_ANIMS = new Set(['hurt', 'dead', 'fall', 'stun']);
const POSE_DEF = { hip: 14, tl: 10, lean: 0, rot: 0, dy: 0, hd: [0, 0], ff: [3, 0], bf: [-3, 0], fh: [5, -13], bh: [-2, -12], ia: 0, iaB: 0 };
let LX = -0.24, LY = -0.26;
let SPRITE_SWAP = null;   // swaps a held item while drawing, e.g. { knife: 'katana' }

/* ---- pose blending ------------------------------------------------------------ */
function normPose(p) {
  if (p._n) return p._n;
  const o = Object.assign({}, POSE_DEF, p);
  Object.defineProperty(p, '_n', { value: o, enumerable: false });
  return o;
}
function lerpPose(a, b, t) {
  const o = {};
  for (const key in a) {
    const va = a[key], vb = b[key];
    if (typeof va === 'number' && typeof vb === 'number') o[key] = va + (vb - va) * t;
    else if (Array.isArray(va) && Array.isArray(vb)) o[key] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t];
    else o[key] = t < 0.5 ? va : vb;
  }
  for (const key in b) if (!(key in a)) o[key] = t < 0.5 ? undefined : b[key];
  return o;
}
/** Pose for a (possibly fractional) frame: loops wrap, one-shot moves ease out. */
function poseAt(kind, anim, f) {
  const set = POSES[CHARS[kind].poses];
  const list = set[anim] || set.idle || set.walk;
  const n = list.length;
  if (n === 1 || !isFinite(f)) return normPose(list[0]);
  if (LOOP_ANIMS.has(anim)) {
    const ff = ((f % n) + n) % n, i = Math.floor(ff), t = ff - i;
    return t < 0.02 ? normPose(list[i]) : lerpPose(normPose(list[i]), normPose(list[(i + 1) % n]), t);
  }
  if (f <= 0) return normPose(list[0]);
  if (f >= n - 1) return normPose(list[n - 1]);
  const i = Math.floor(f), t = f - i;
  return t < 0.02 ? normPose(list[i]) : lerpPose(normPose(list[i]), normPose(list[i + 1]), 1 - (1 - t) * (1 - t));
}
function animLen(kind, anim) {
  const set = POSES[CHARS[kind].poses];
  return (set[anim] || set.idle || set.walk).length;
}

/* ---- palettes ------------------------------------------------------------------ */
function dpal(pal) {
  if (pal._d) return pal._d;
  const d = { ink: INK };
  for (const key in pal) {
    const c = pal[key];
    d[key] = c;
    if (typeof c === 'string' && c[0] === '#' && c.length === 7) { d[key + 'S'] = shade(c, -0.3); d[key + 'L'] = shade(c, 0.17); }
  }
  Object.defineProperty(pal, '_d', { value: d, enumerable: false });
  return d;
}
const TINTS = new Map();
/** Same palette with every colour replaced: used for hit flashes (silhouette only). */
function tintPal(d, col) {
  let m = TINTS.get(d);
  if (!m) { m = {}; TINTS.set(d, m); }
  if (m[col]) return m[col];
  const t = {};
  for (const key in d) t[key] = typeof d[key] === 'string' && d[key][0] === '#' ? col : d[key];
  t.ink = col; t.tint = true;
  m[col] = t;
  return t;
}

/* ---- cel-shaded primitives ----------------------------------------------------------- */
/** segs: [ax, ay, bx, by, ra, rb, shadowColour, litColour]. All outlines first so joints merge. */
function limbs(g, segs, d) {
  g.fillStyle = d.ink;
  for (const s of segs) { capsulePath(g, s[0], s[1], s[2], s[3], s[4] + OLW, s[5] + OLW); g.fill(); }
  if (d.tint) return;
  for (const s of segs) { g.fillStyle = s[6]; capsulePath(g, s[0], s[1], s[2], s[3], s[4], s[5]); g.fill(); }
  for (const s of segs) { g.fillStyle = s[7]; capsulePath(g, s[0] + LX * s[4], s[1] + LY * s[4], s[2] + LX * s[5], s[3] + LY * s[5], s[4] * 0.66, s[5] * 0.66); g.fill(); }
}
/** Outline, shadow tone, then a lit copy pulled toward the light. */
function celFill(g, build, cx, cy, cS, cL, d, off, sx, sy) {
  g.lineJoin = 'round';
  build();
  g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke();
  g.fillStyle = d.tint ? d.ink : cS; g.fill();
  if (d.tint || !cL) return;
  g.save();
  g.translate(cx + LX * off, cy + LY * off); g.scale(sx || 0.8, sy || 0.84); g.translate(-cx, -cy);
  build(); g.fillStyle = cL; g.fill();
  g.restore();
}
function ribbon(g, d, x, y, ang, len, w0, w1, wave, phase, col) {
  ribbonPath(g, x, y, ang, len, w0, w1, wave, phase, 8);
  g.lineJoin = 'round'; g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke();
  g.fillStyle = d.tint ? d.ink : col; g.fill();
}
function line(g, x0, y0, x1, y1, w, col) { stampLine(g, x0, y0, x1, y1, w, col); }

/* ---- body parts --------------------------------------------------------------------- */
function torsoFrame(P) {
  const hx = P.hip[0], hy = P.hip[1], nx = P.neck[0], ny = P.neck[1];
  let ax = nx - hx, ay = ny - hy;
  const L = Math.hypot(ax, ay) || 1;
  ax /= L; ay /= L;
  return { hx, hy, nx, ny, ax, ay, px: -ay, py: ax };
}

function drawArmV(g, d, sh, el, hd, k, back, fist) {
  const sleeve = back ? d.top2 : d.top, sleeveS = back ? d.top2S : d.topS;
  const skin = d.glove ? (back ? d.gloveS : d.glove) : back ? d.skin2 : d.skin, skinS = d.glove ? shade(d.glove, -0.4) : back ? d.skin2S : d.skinS;
  const dx = hd[0] - el[0], dy = hd[1] - el[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const wx = hd[0] - ux * 0.95 * k, wy = hd[1] - uy * 0.95 * k;
  if (d.bare) {
    limbs(g, [
      [el[0], el[1], wx, wy, 1.12 * k, 0.82 * k, skinS, skin],
      [sh[0], sh[1], el[0], el[1], 1.45 * k, 1.12 * k, skinS, skin]
    ], d);
  } else {
    const mx = lerp(el[0], wx, 0.52), my = lerp(el[1], wy, 0.52);
    limbs(g, [
      [mx, my, wx, wy, 0.86 * k, 0.74 * k, skinS, skin],
      [sh[0], sh[1], el[0], el[1], 1.5 * k, 1.32 * k, sleeveS, sleeve],
      [el[0], el[1], mx, my, 1.32 * k, 1.42 * k, sleeveS, sleeve]
    ], d);
    if (d.cuff && !d.tint) {
      g.fillStyle = back ? shade(d.cuff, -0.25) : d.cuff;
      capsulePath(g, mx - ux * 0.3 * k, my - uy * 0.3 * k, mx, my, 1.34 * k, 1.38 * k); g.fill();
    }
  }
  if (d.bracers && !d.tint) {
    limbs(g, [[lerp(el[0], wx, 0.3), lerp(el[1], wy, 0.3), lerp(el[0], wx, 0.9), lerp(el[1], wy, 0.9), 1.2 * k, 1.05 * k, '#4e535c', back ? '#6b7079' : '#8a909a']], d);
  }
  // the fist: a rounded block turned along the forearm
  const r = (fist ? 1.38 : 1.2) * k;
  g.save(); g.translate(hd[0], hd[1]); g.rotate(Math.atan2(uy, ux));
  g.lineJoin = 'round';
  const build = () => roundRectPath(g, -r, -r * 0.92, r * 2, r * 1.84, r * 0.7);
  build(); g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = d.tint ? d.ink : skinS; g.fill();
  if (!d.tint) {
    g.fillStyle = skin; roundRectPath(g, -r * 0.85, -r * 0.92, r * 1.6, r * 1.3, r * 0.55); g.fill();
    line(g, r * 0.55, -r * 0.45, r * 0.55, r * 0.6, 0.22 * k, rgba(shade(skin, -0.45), 0.8));
  }
  g.restore();
}

/* ---- heads: all drawn facing right around the head centre ---------------------------------- */
function eyeV(g, d, x, y, u, expr, blink, glow) {
  if (blink || expr === 'hurt') {
    line(g, x - 0.45 * u, y + 0.05 * u, x + 0.45 * u, y - 0.08 * u, 0.3 * u, d.ink);
    return;
  }
  ellipse(g, x, y + 0.04 * u, 0.6 * u, 0.42 * u, 0, glow || '#fffaf2');
  if (!glow) { disc(g, x + 0.2 * u, y + 0.06 * u, 0.3 * u, d.eye || '#2a1810'); disc(g, x + 0.3 * u, y - 0.05 * u, 0.1 * u, '#ffffff'); }
  g.strokeStyle = d.ink; g.lineWidth = 0.34 * u; g.lineCap = 'round';
  g.beginPath(); g.ellipse(x, y + 0.06 * u, 0.64 * u, 0.46 * u, 0, Math.PI * 1.06, Math.PI * 1.98); g.stroke();
}
function mouthV(g, d, u, expr, col) {
  if (expr === 'kiai') { ellipse(g, 1.75 * u, 1.3 * u, 0.58 * u, 0.46 * u, 0, '#3a0f12'); ellipse(g, 1.8 * u, 1.55 * u, 0.32 * u, 0.16 * u, 0, '#c2484a'); }
  else if (expr === 'hurt') { g.strokeStyle = '#4a1a1a'; g.lineWidth = 0.26 * u; g.beginPath(); g.moveTo(1.2 * u, 1.35 * u); g.lineTo(1.5 * u, 1.15 * u); g.lineTo(1.8 * u, 1.4 * u); g.lineTo(2.1 * u, 1.2 * u); g.stroke(); }
  else line(g, 1.3 * u, 1.32 * u, 2.05 * u, 1.24 * u, 0.26 * u, col || '#5a2a24');
}
function browV(g, u, expr, col, w) { line(g, 0.4 * u, -1.15 * u, 1.95 * u, expr === 'kiai' ? -0.62 * u : -0.85 * u, (w || 0.44) * u, col); }
function noseV(g, d, u) { line(g, 2.28 * u, -0.25 * u, 2.6 * u, 0.42 * u, 0.28 * u, d.skinS); line(g, 2.6 * u, 0.42 * u, 2.22 * u, 0.55 * u, 0.24 * u, d.skinS); }
function earV(g, d, u) { ellipse(g, -0.35 * u, 0.2 * u, 0.62 * u, 0.85 * u, 0, d.ink); ellipse(g, -0.35 * u, 0.2 * u, 0.5 * u, 0.72 * u, 0, d.skinS); ellipse(g, -0.25 * u, 0.15 * u, 0.25 * u, 0.42 * u, 0, d.skin); }
function headShape(g, u) { g.beginPath(); g.ellipse(0, 0, 2.4 * u, 2.8 * u, 0, 0, TAU); g.moveTo(2.3 * u, 1.2 * u); g.ellipse(0.9 * u, 1.25 * u, 1.55 * u, 1.45 * u, 0, 0, TAU); }

function hairBand(g, d, u) {
  celFill(g, () => {
    g.beginPath(); g.moveTo(2.15 * u, -1.25 * u);
    g.quadraticCurveTo(1.9 * u, -2.6 * u, 1.0 * u, -3.0 * u);
    g.lineTo(1.35 * u, -3.85 * u); g.lineTo(0.3 * u, -3.2 * u);
    g.lineTo(-0.2 * u, -4.05 * u); g.lineTo(-0.95 * u, -3.1 * u);
    g.lineTo(-1.95 * u, -3.7 * u); g.lineTo(-2.05 * u, -2.6 * u);
    g.lineTo(-3.0 * u, -2.45 * u); g.lineTo(-2.55 * u, -1.25 * u);
    g.quadraticCurveTo(-2.85 * u, 0.3 * u, -1.95 * u, 1.25 * u);
    g.quadraticCurveTo(-1.2 * u, 0.4 * u, -0.9 * u, -0.6 * u);
    g.quadraticCurveTo(0.3 * u, -1.6 * u, 2.15 * u, -1.25 * u);
    g.closePath();
  }, -0.3 * u, -2 * u, d.hair, d.hairL, d, u);
}

/* ---- legs: fatigues tucked into combat boots ------------------------------------------- */
function drawLegV(g, d, P, knee, foot, k, back) {
  const cL = back ? d.pants2 : d.pants, cS = back ? d.pants2S : d.pantsS;
  const T = torsoFrame(P);
  const hx = T.hx + T.px * (back ? -0.7 : 0.7) * k, hy = T.hy + T.py * (back ? -0.7 : 0.7) * k;
  const dx = foot[0] - knee[0], dy = foot[1] - knee[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const planted = uy > 0.55;
  let fx, fy;
  if (planted) { fx = 1; fy = 0; } else { fx = -uy; fy = ux; if (fx < 0) { fx = -fx; fy = -fy; } }
  const ax = foot[0] - ux * 0.95 * k, ay = foot[1] - uy * 0.95 * k;
  const lift = planted ? 0.95 * k : 0;
  const boot = back ? shade(d.boot, -0.1) : d.boot2, bootS = d.boot;
  const hX = foot[0] - fx * 0.9 * k, hY = foot[1] - fy * 0.9 * k - lift;
  const tX = foot[0] + fx * 2.8 * k, tY = foot[1] + fy * 2.8 * k - lift * 0.8;
  const bx = lerp(knee[0], ax, 0.5), by = lerp(knee[1], ay, 0.5);
  limbs(g, [
    [hx, hy, knee[0], knee[1], 2.0 * k, 1.7 * k, cS, cL],
    [knee[0], knee[1], bx, by, 1.7 * k, 1.5 * k, cS, cL],
    [bx, by, ax, ay, 1.45 * k, 1.3 * k, bootS, boot],
    [hX, hY, tX, tY, 1.08 * k, 0.86 * k, bootS, boot]
  ], d);
  if (d.tint) return;
  line(g, bx - uy * 1.5 * k, by + ux * 1.5 * k, bx + uy * 1.5 * k, by - ux * 1.5 * k, 0.4 * k, rgba(shade(cL, -0.5), 0.8));
  if (planted) line(g, hX - 0.2 * k, -0.2 * k, tX - 0.2 * k, -0.2 * k, 0.4 * k, '#0c0a0c');
  // knee pad or cargo pocket
  line(g, lerp(hx, knee[0], 0.55) - 0.6 * k, lerp(hy, knee[1], 0.55), lerp(hx, knee[0], 0.8) - 0.6 * k, lerp(hy, knee[1], 0.8), 1.3 * k, rgba(shade(cL, -0.22), 0.55));
}

/* ---- weapons and gear in the hand: +x runs along the barrel or blade ------------------------ */
function drawHeldV(g, d, hand, item, angDeg, k, rot) {
  const a = ((angDeg || 0) * Math.PI) / 180 - (rot || 0);
  g.save(); g.translate(hand[0], hand[1]); g.rotate(a);
  const u = k, T = d.tint;
  const steel = T ? d.ink : '#dfe7ee', steelS = T ? d.ink : '#8794a2', gun = T ? d.ink : '#2a2c33', gunL = T ? d.ink : '#4a4e58', wood = '#5b3b24', woodL = '#8a5c36';
  const blade = (pts, hi) => { polyPath(g, pts); g.lineJoin = 'round'; g.lineWidth = OLW * 1.6; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = steelS; g.fill(); if (!T && hi) poly(g, hi, steel); };
  const box = (x, y, w, h, c, r) => { rrect(g, x * u - OLW, y * u - OLW, w * u + OLW * 2, h * u + OLW * 2, (r || 0.3) * u, d.ink); if (!T) rrect(g, x * u, y * u, w * u, h * u, (r || 0.3) * u, c); };
  switch (item) {
    case 'knife':
      limbs(g, [[-1.9 * u, 0, -0.2 * u, 0, 0.5 * u, 0.5 * u, '#241810', '#4a3424']], d);
      box(-0.2, -1.0, 0.6, 2.0, '#8a8f98');
      blade([0.4 * u, -0.62 * u, 4.6 * u, -0.5 * u, 6.2 * u, 0.1 * u, 4.4 * u, 0.55 * u, 0.4 * u, 0.6 * u], [0.4 * u, -0.62 * u, 4.6 * u, -0.5 * u, 6.2 * u, 0.1 * u, 0.4 * u, 0]);
      break;
    case 'katana':
      limbs(g, [[-3.0 * u, 0, -0.2 * u, 0, 0.5 * u, 0.5 * u, '#14121a', '#3a3448']], d);
      box(-0.3, -1.1, 0.6, 2.2, '#c9a24a');
      blade([0.3 * u, -0.5 * u, 11.5 * u, -0.9 * u, 13.2 * u, -0.2 * u, 11.4 * u, 0.25 * u, 0.3 * u, 0.5 * u], [0.3 * u, -0.5 * u, 11.5 * u, -0.9 * u, 13.2 * u, -0.2 * u, 0.3 * u, 0]);
      break;
    case 'saber':
      box(-1.4, -0.5, 1.5, 1.0, '#2a2420');
      if (!T) { g.strokeStyle = '#e3bd4b'; g.lineWidth = 0.4 * u; g.beginPath(); g.arc(-0.4 * u, 0.5 * u, 1.3 * u, -0.4, Math.PI * 0.9); g.stroke(); }
      blade([0.1 * u, -0.45 * u, 10.5 * u, -1.1 * u, 12.4 * u, -1.5 * u, 10.8 * u, -0.1 * u, 0.1 * u, 0.45 * u], [0.1 * u, -0.45 * u, 10.5 * u, -1.1 * u, 12.4 * u, -1.5 * u, 0.1 * u, 0]);
      break;
    case 'club':
      limbs(g, [[-2 * u, 0, 8 * u, 0, 0.7 * u, 1.0 * u, '#4a2e18', '#7d5230'], [8 * u, 0, 12.6 * u, 0, 1.5 * u, 1.9 * u, '#4a2e18', '#8a5c36']], d);
      if (!T) for (const x of [9, 10.6, 12]) disc(g, x * u, (x % 2 ? -0.9 : 0.8) * u, 0.42 * u, '#b9c0c8');
      break;
    case 'rifle':
      polyPath(g, [-6.4 * u, -0.5 * u, -2.6 * u, -1.0 * u, -2.6 * u, 0.9 * u, -5.8 * u, 2.1 * u, -6.6 * u, 1.9 * u]);
      g.lineWidth = OLW * 1.6; g.strokeStyle = d.ink; g.lineJoin = 'round'; g.stroke(); g.fillStyle = T ? d.ink : wood; g.fill();
      if (!T) poly(g, [-6.2 * u, -0.4 * u, -2.6 * u, -0.9 * u, -2.6 * u, 0, -6.2 * u, 0.6 * u], woodL);
      box(-2.8, -1.15, 7.4, 2.0, gun); box(4.4, -0.75, 5.8, 0.95, gun, 0.2);
      box(0.2, 0.7, 1.3, 2.7, gunL); box(2.6, 0.7, 2.6, 0.7, wood);
      if (!T) { rect(g, -2.6 * u, -1.05 * u, 7 * u, 0.5 * u, gunL); rect(g, 9.4 * u, -1.5 * u, 0.5 * u, 0.9 * u, '#16171b'); }
      break;
    case 'sniper':
      polyPath(g, [-6.6 * u, -0.4 * u, -2.8 * u, -0.9 * u, -2.8 * u, 0.9 * u, -6.2 * u, 2.2 * u, -7 * u, 2.0 * u]);
      g.lineWidth = OLW * 1.6; g.strokeStyle = d.ink; g.lineJoin = 'round'; g.stroke(); g.fillStyle = T ? d.ink : '#4f3a26'; g.fill();
      box(-3, -1.0, 6.4, 1.8, gun); box(3.2, -0.6, 9.6, 0.8, gun, 0.2); box(-1.4, -2.4, 4.6, 1.1, '#15161b', 0.5);
      if (!T) { disc(g, 3.3 * u, -1.85 * u, 0.5 * u, '#7fd6ff'); rect(g, 12.2 * u, -0.9 * u, 1.2 * u, 1.3 * u, '#15161b'); }
      break;
    case 'mg':
      box(-5.4, -0.9, 3.4, 2.6, '#4a3a2a'); box(-2.2, -1.5, 8.6, 2.9, gun); box(6.2, -0.8, 6.6, 1.2, gun, 0.2);
      box(0.4, 1.2, 2.6, 2.6, '#5a6038'); box(7.6, 0.3, 0.6, 3.2, gunL, 0.2);
      if (!T) { for (let i = 0; i < 4; i++) rect(g, (6.8 + i * 1.3) * u, -0.6 * u, 0.5 * u, 0.8 * u, '#111216'); rect(g, -2 * u, -1.4 * u, 8.2 * u, 0.6 * u, gunL); }
      break;
    case 'pistol':
      box(-0.6, -1.3, 4.6, 1.5, gun); box(-0.5, -0.2, 1.4, 2.3, gunL);
      if (!T) rect(g, -0.4 * u, -1.2 * u, 4.2 * u, 0.45 * u, gunL);
      break;
    case 'launcher':
      box(-8, -1.7, 15, 3.2, '#56613a', 0.6); box(6.4, -2.1, 1.8, 4.0, '#2f3524', 0.4); box(-8.6, -2.0, 1.6, 3.8, '#2f3524', 0.4);
      box(-1.4, 1.3, 1.2, 2.4, gun); box(1.4, -2.9, 2.4, 1.2, gun);
      if (!T) { rect(g, -6.8 * u, -1.5 * u, 13 * u, 0.7 * u, '#7c8a56'); rect(g, -3 * u, -1.6 * u, 0.6 * u, 3 * u, '#c9a24a'); }
      break;
    case 'grenade':
      disc(g, 0, -0.6 * u, 1.6 * u + OLW, d.ink);
      if (!T) { disc(g, 0, -0.6 * u, 1.6 * u, '#3c4a2a'); disc(g, -0.4 * u, -1.1 * u, 0.8 * u, '#6c7c48'); rect(g, -0.5 * u, -2.9 * u, 1.0 * u, 0.9 * u, '#9aa0a8'); }
      break;
    case 'flamer':
      box(-6.6, 0.6, 4.2, 3.0, '#a8352a', 1.2); box(-2.6, -1.3, 7.4, 2.3, gun); box(4.6, -0.9, 6.2, 1.3, gunL, 0.3);
      box(0.6, 0.9, 1.3, 2.4, gunL); box(10.4, -1.3, 1.7, 2.1, '#3a3d44', 0.4);
      if (!T) { rect(g, -6.2 * u, 0.9 * u, 3.4 * u, 0.6 * u, '#d8584a'); line(g, -4.4 * u, 0.6 * u, -1.6 * u, -0.6 * u, 0.4 * u, '#15161b'); disc(g, 12.5 * u, -0.25 * u, 0.6 * u, '#7fd6ff'); }
      break;
    case 'radio':
      box(-1.2, -3.4, 2.6, 4.2, '#2b2f2a'); if (!T) { line(g, 0.9 * u, -3.4 * u, 1.6 * u, -6.4 * u, 0.3 * u, '#15161b'); disc(g, -0.2 * u, -2.2 * u, 0.4 * u, '#7fe08a'); }
      break;
    case 'star':
      g.rotate(game.t * 2);
      starShape(g, 0, 0, 2.5 * u); g.lineWidth = OLW * 1.4; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = T ? d.ink : '#c8d6e4'; g.fill();
      if (!T) disc(g, 0, 0, 0.5 * u, '#3a4250');
      break;
    default: break;
  }
  g.restore();
}

function starShape(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.32 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}

/* ---- torso: shirt, webbing, vest, tank top or the general's coat -------------------------------- */
function drawTorsoV(g, d, P, k) {
  const T = torsoFrame(P);
  const hw = 2.5 * k, sw = (d.bare ? 3.7 : 3.2) * k;
  const sx = T.nx - T.ax * 1.0 * k, sy = T.ny - T.ay * 1.0 * k;
  const mx = (T.hx + sx) / 2, my = (T.hy + sy) / 2;
  const pt = (f, w) => [lerp(T.hx, sx, f) + T.px * w, lerp(T.hy, sy, f) + T.py * w];
  const L = (a, b, w, c) => line(g, a[0], a[1], b[0], b[1], w, c);
  if (d.coat) {
    // coat tails hang behind the legs
    for (const [o, c] of [[-1.6, d.top2], [1.2, d.top]]) {
      const a0 = pt(0, o * k - 1.6 * k), a1 = pt(0, o * k + 1.6 * k), sw2 = (P.coatSwing || 0) * k;
      const build = () => { g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.lineTo(a1[0] - 1.2 * k + sw2, a1[1] + 7.6 * k); g.lineTo(a0[0] - 2.2 * k + sw2, a0[1] + 7.2 * k); g.closePath(); };
      celFill(g, build, a0[0], a0[1] + 3 * k, shade(c, -0.3), c, d, 0.8 * k);
    }
  }
  const build = () => {
    g.beginPath();
    g.moveTo(T.hx - T.px * hw, T.hy - T.py * hw);
    g.lineTo(T.hx + T.px * hw, T.hy + T.py * hw);
    g.quadraticCurveTo(mx + T.px * sw * 1.12, my + T.py * sw * 1.12, sx + T.px * sw, sy + T.py * sw);
    g.quadraticCurveTo(T.nx + T.ax * 0.9 * k, T.ny + T.ay * 0.9 * k, sx - T.px * sw, sy - T.py * sw);
    g.quadraticCurveTo(mx - T.px * hw * 1.05, my - T.py * hw * 1.05, T.hx - T.px * hw, T.hy - T.py * hw);
    g.closePath();
  };
  celFill(g, build, mx, my, d.topS, d.top, d, 1.7 * k);
  if (d.tint) return;
  if (d.bare) {
    // tank top: bare shoulders and chest line
    poly(g, [...pt(1.02, -0.6 * k), ...pt(1.02, 2.9 * k), ...pt(0.72, 2.6 * k), ...pt(0.8, 0.2 * k)], d.skin);
    L(pt(0.8, 0.2 * k), pt(0.72, 2.6 * k), 0.3 * k, rgba(d.skinS, 0.9));
    L(pt(0.45, -1.6 * k), pt(0.45, 2.2 * k), 0.25 * k, rgba(d.topS, 0.8));
  } else if (d.vest) {
    const build2 = () => polyPath(g, [...pt(0.98, -0.4 * k), ...pt(0.98, 2.5 * k), ...pt(0.12, 2.5 * k), ...pt(0.12, -0.9 * k)]);
    build2(); g.lineJoin = 'round'; g.lineWidth = OLW * 1.4; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = d.vest; g.fill();
    poly(g, [...pt(0.98, -0.4 * k), ...pt(0.98, 0.6 * k), ...pt(0.12, 0.2 * k), ...pt(0.12, -0.9 * k)], d.vest2);
    for (const f of [0.2, 0.5]) { const p = pt(f, 0.9 * k); rrect(g, p[0] - 0.2 * k, p[1] - 1.9 * k, 1.9 * k, 1.9 * k, 0.3 * k, d.vest2); rect(g, p[0] - 0.2 * k, p[1] - 1.9 * k, 1.9 * k, 0.5 * k, shade(d.vest2, -0.25)); }
    L(pt(1.0, 1.6 * k), pt(0.1, -1.6 * k), 0.5 * k, d.gear);
  } else if (d.coat) {
    L(pt(1.02, 0.6 * k), pt(0.0, 1.4 * k), 0.35 * k, rgba(d.topS, 0.9));
    for (const f of [0.82, 0.6, 0.38, 0.16]) disc(g, ...pt(f, 1.9 * k), 0.36 * k, d.accent);
    L(pt(1.0, 2.4 * k), pt(0.08, -2.0 * k), 0.8 * k, d.sash);
    const e = pt(1.0, -1.4 * k); rrect(g, e[0] - 1.6 * k, e[1] - 0.5 * k, 3.2 * k, 1.0 * k, 0.4 * k, d.accent);
    for (let i = 0; i < 3; i++) rect(g, pt(0.74, 0.2 * k)[0] + i * 0.7 * k, pt(0.74, 0.2 * k)[1], 0.5 * k, 0.9 * k, ['#d6312a', '#e3bd4b', '#3a7bd0'][i]);
  } else {
    // field shirt: collar, chest pocket, cross strap
    poly(g, [...pt(1.02, 0.2 * k), ...pt(1.02, 2.0 * k), ...pt(0.84, 1.4 * k)], d.topL || d.top);
    const p = pt(0.6, 0.7 * k); rrect(g, p[0], p[1] - 1.6 * k, 1.8 * k, 1.7 * k, 0.25 * k, rgba(d.topS, 0.75));
    L(pt(1.0, 2.0 * k), pt(0.08, -1.7 * k), 0.55 * k, d.gear);
    if (d.accent && d.head !== 'cap') { const s = pt(0.86, -1.9 * k); rrect(g, s[0] - 0.9 * k, s[1] - 0.6 * k, 1.8 * k, 1.2 * k, 0.3 * k, d.accent); }
  }
}

function drawBeltV(g, d, P, k) {
  const T = torsoFrame(P);
  const c = d.gear || d.top2;
  const o = 0.3 * k, w = 2.6 * k;
  const a = [T.hx - T.px * w + T.ax * o, T.hy - T.py * w + T.ay * o];
  const b = [T.hx + T.px * w + T.ax * o, T.hy + T.py * w + T.ay * o];
  limbs(g, [[a[0], a[1], b[0], b[1], 0.72 * k, 0.72 * k, shade(c, -0.3), c]], d);
  if (d.tint) return;
  const kx = lerp(a[0], b[0], 0.8), ky = lerp(a[1], b[1], 0.8);
  rrect(g, kx - 0.8 * k, ky - 0.75 * k, 1.5 * k, 1.5 * k, 0.25 * k, d.accent || '#b9a05a');
  const hx = lerp(a[0], b[0], 0.3), hy = lerp(a[1], b[1], 0.3);
  rrect(g, hx - 0.9 * k, hy - 0.3 * k, 1.8 * k, 2.3 * k, 0.4 * k, shade(c, -0.15));
}

/* ---- heads ------------------------------------------------------------------------------- */
function helmetV(g, d, u, c, cS, cL) {
  celFill(g, () => { g.beginPath(); g.ellipse(-0.1 * u, -0.7 * u, 2.95 * u, 2.75 * u, 0, Math.PI * 0.98, TAU * 1.005); g.lineTo(3.3 * u, -0.2 * u); g.lineTo(-3.2 * u, -0.1 * u); g.closePath(); }, 0, -1.7 * u, cS, cL || c, d, u);
  limbs(g, [[-3.15 * u, -0.45 * u, 3.4 * u, -0.5 * u, 0.4 * u, 0.4 * u, cS, c]], d);
  if (d.tint) return;
  line(g, -1.4 * u, -2.5 * u, 0.5 * u, -3.1 * u, 0.3 * u, 'rgba(255,255,255,0.3)');
  line(g, -1.6 * u, -0.2 * u, 0.9 * u, 2.3 * u, 0.3 * u, rgba(d.gear || '#2a2420', 0.9));
}
function drawHeadV(g, d, hx, hy, nx, ny, tilt, k, expr, ph, seed) {
  const u = k;
  limbs(g, [[nx, ny + 0.4 * k, hx - 0.2 * k, hy + 1.8 * k, 1.05 * k, 1.0 * k, d.skinS, d.skin]], d);
  g.save(); g.translate(hx, hy - 0.25 * k); g.rotate(tilt); g.scale(1.14, 1.14);
  const blink = ((game.t + seed * 0.37) % 3.6) < 0.11;
  const st = d.head;
  if (st === 'band') {
    ribbon(g, d, -2.4 * u, -0.95 * u, Math.PI + 0.25, 6.4 * u, 0.95 * u, 0.4 * u, 0.55, ph, shade(d.band, -0.25));
    ribbon(g, d, -2.4 * u, -0.95 * u, Math.PI + 0.05, 7.4 * u, 1.0 * u, 0.45 * u, 0.55, ph + 1.2, d.band);
  } else if (st === 'ninja') {
    ribbon(g, d, -2.2 * u, 0.2 * u, Math.PI + 0.2, 5.2 * u, 0.9 * u, 0.35 * u, 0.6, ph, d.accent);
  }
  const hooded = st === 'ninja';
  celFill(g, () => headShape(g, u), 0.2 * u, 0, hooded ? shade(d.hood, -0.3) : d.skinS, hooded ? d.hood : d.skin, d, 1.5 * u, 0.78, 0.8);
  if (d.tint) { if (st === 'helmet' || st === 'goggles' || st === 'mask') helmetV(g, d, u, d.helmet, d.helmet2 || d.helmet); g.restore(); return; }
  if (!hooded) earV(g, d, u);
  const face = (browCol, bw) => { browV(g, u, expr, browCol || d.hair, bw); eyeV(g, d, 1.15 * u, -0.22 * u, u, expr, blink); noseV(g, d, u); mouthV(g, d, u, expr); };
  switch (st) {
    case 'band':
      hairBand(g, d, u); face();
      g.strokeStyle = d.ink; g.lineWidth = 1.0 * u + OLW * 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(2.32 * u, -1.0 * u); g.quadraticCurveTo(0.2 * u, -2.05 * u, -2.45 * u, -0.95 * u); g.stroke();
      g.strokeStyle = d.band; g.lineWidth = 1.0 * u; g.stroke();
      disc(g, -2.5 * u, -0.95 * u, 0.7 * u, d.ink); disc(g, -2.5 * u, -0.95 * u, 0.55 * u, d.band);
      ellipse(g, 1.2 * u, 1.75 * u, 1.3 * u, 0.7 * u, 0, 'rgba(60,40,30,0.16)');
      break;
    case 'helmet':
      face('#2a2420'); helmetV(g, d, u, d.helmet, d.helmet2, shade(d.helmet, 0.14));
      break;
    case 'goggles':
      browV(g, u, expr, '#2a2420'); noseV(g, d, u); mouthV(g, d, u, expr);
      helmetV(g, d, u, d.helmet, d.helmet2, shade(d.helmet, 0.14));
      limbs(g, [[-2.6 * u, -0.25 * u, 2.3 * u, -0.25 * u, 0.5 * u, 0.5 * u, '#14151a', '#2a2c34']], d);
      rrect(g, 0.4 * u, -0.95 * u, 2.2 * u, 1.45 * u, 0.6 * u, d.ink); rrect(g, 0.6 * u, -0.8 * u, 1.85 * u, 1.15 * u, 0.5 * u, d.lens || '#7fd6ff');
      line(g, 0.9 * u, -0.5 * u, 1.6 * u, -0.55 * u, 0.25 * u, '#ffffff');
      break;
    case 'mask':
      helmetV(g, d, u, d.helmet, d.helmet2, shade(d.helmet, 0.14));
      celFill(g, () => { g.beginPath(); g.moveTo(2.7 * u, -0.6 * u); g.lineTo(2.8 * u, 1.5 * u); g.quadraticCurveTo(2.2 * u, 2.8 * u, 0.6 * u, 2.8 * u); g.lineTo(-0.9 * u, 2.0 * u); g.lineTo(-0.7 * u, -0.5 * u); g.closePath(); }, 1 * u, 1 * u, shade(d.mask, -0.3), d.mask, d, 0.6 * u);
      disc(g, 1.3 * u, -0.05 * u, 0.85 * u, d.ink); disc(g, 1.3 * u, -0.05 * u, 0.65 * u, '#bfe8ff'); disc(g, 1.1 * u, -0.25 * u, 0.22 * u, '#ffffff');
      disc(g, 2.3 * u, 1.9 * u, 1.05 * u, d.ink); disc(g, 2.3 * u, 1.9 * u, 0.85 * u, '#3a3f45'); disc(g, 2.3 * u, 1.9 * u, 0.4 * u, '#22252a');
      break;
    case 'cap': case 'genCap': {
      const gen = st === 'genCap';
      celFill(g, () => { g.beginPath(); g.moveTo(-2.6 * u, -0.5 * u); g.quadraticCurveTo(-3.0 * u, 0.9 * u, -2.0 * u, 1.3 * u); g.quadraticCurveTo(-1.2 * u, 0.4 * u, -1.0 * u, -0.6 * u); g.closePath(); }, -2 * u, 0.2 * u, d.hair, d.hairL, d, 0.4 * u);
      face(gen ? '#8a8a8a' : d.hair, gen ? 0.55 : 0.44);
      if (gen) { limbs(g, [[1.1 * u, 0.95 * u, 2.5 * u, 1.05 * u, 0.42 * u, 0.3 * u, '#9a9a9a', d.hair]], d); }
      const top = gen ? -4.5 : -3.9;
      celFill(g, () => { g.beginPath(); g.moveTo(-2.8 * u, -1.3 * u); g.quadraticCurveTo(-3.6 * u, top * u, -0.2 * u, (top - 0.3) * u); g.quadraticCurveTo(3.2 * u, top * u, 2.5 * u, -1.5 * u); g.closePath(); }, 0, -2.8 * u, shade(d.cap, -0.3), d.cap, d, u);
      limbs(g, [[-2.75 * u, -1.35 * u, 2.5 * u, -1.5 * u, 0.5 * u, 0.5 * u, shade(gen ? d.sash : d.cap, -0.35), gen ? d.sash : shade(d.cap, 0.18)]], d);
      celFill(g, () => { g.beginPath(); g.moveTo(1.6 * u, -1.5 * u); g.quadraticCurveTo(3.6 * u, -1.5 * u, 4.5 * u, -0.5 * u); g.quadraticCurveTo(3.2 * u, -0.9 * u, 1.6 * u, -0.9 * u); g.closePath(); }, 3 * u, -1.1 * u, '#0c0c10', '#2a2a33', d, 0.3 * u);
      disc(g, 0.9 * u, -2.7 * u, 0.75 * u, d.ink); disc(g, 0.9 * u, -2.7 * u, 0.58 * u, d.accent);
      break;
    }
    case 'beanie':
      face(d.hair);
      celFill(g, () => { g.beginPath(); g.moveTo(-2.7 * u, -0.9 * u); g.quadraticCurveTo(-2.8 * u, -3.6 * u, 0 * u, -3.5 * u); g.quadraticCurveTo(2.7 * u, -3.5 * u, 2.45 * u, -1.1 * u); g.closePath(); }, 0, -2.2 * u, shade(d.beanie, -0.3), shade(d.beanie, 0.1), d, u);
      limbs(g, [[-2.7 * u, -1.0 * u, 2.45 * u, -1.15 * u, 0.52 * u, 0.52 * u, d.beanie, shade(d.beanie, 0.25)]], d);
      ellipse(g, 1.2 * u, 1.7 * u, 1.3 * u, 0.7 * u, 0, 'rgba(30,20,20,0.2)');
      break;
    case 'boonie':
      face('#2a2420');
      celFill(g, () => { g.beginPath(); g.moveTo(-2.4 * u, -1.3 * u); g.quadraticCurveTo(-2.4 * u, -3.7 * u, 0, -3.6 * u); g.quadraticCurveTo(2.4 * u, -3.6 * u, 2.3 * u, -1.4 * u); g.closePath(); }, 0, -2.4 * u, d.hat2, d.hat, d, u);
      limbs(g, [[-4.3 * u, -0.9 * u, 4.4 * u, -1.3 * u, 0.48 * u, 0.4 * u, d.hat2, d.hat]], d);
      line(g, -2.3 * u, -1.75 * u, 2.25 * u, -1.9 * u, 0.4 * u, rgba(d.hat2, 0.9));
      break;
    case 'hair':
      hairBand(g, d, u); face();
      ellipse(g, 1.2 * u, 1.75 * u, 1.35 * u, 0.75 * u, 0, 'rgba(60,40,30,0.28)');
      break;
    case 'brute':
      ellipse(g, 0.4 * u, -2.2 * u, 0.9 * u, 0.3 * u, -0.25, 'rgba(255,255,255,0.3)');
      browV(g, u, 'kiai', d.hair, 0.62); eyeV(g, d, 1.15 * u, -0.1 * u, u, expr, blink); noseV(g, d, u);
      celFill(g, () => { g.beginPath(); g.moveTo(2.3 * u, 0.5 * u); g.quadraticCurveTo(2.9 * u, 1.7 * u, 1.7 * u, 3.2 * u); g.quadraticCurveTo(0.3 * u, 3.7 * u, -1.3 * u, 2.2 * u); g.lineTo(-1.1 * u, 0.5 * u); g.quadraticCurveTo(0.6 * u, 1.2 * u, 2.3 * u, 0.5 * u); g.closePath(); }, 0.6 * u, 2 * u, d.hair, d.hairL, d, 0.8 * u);
      if (expr === 'kiai') ellipse(g, 1.75 * u, 1.5 * u, 0.6 * u, 0.4 * u, 0, '#2a0a0c');
      line(g, -1.0 * u, -2.3 * u, 0.4 * u, -1.5 * u, 0.25 * u, rgba('#7a2a2a', 0.7));
      break;
    case 'ninja':
      roundRectPath(g, 0.15 * u, -1.05 * u, 2.5 * u, 1.35 * u, 0.6 * u); g.fillStyle = d.skin; g.fill();
      eyeV(g, d, 1.25 * u, -0.38 * u, u, expr, blink); browV(g, u, 'kiai', '#0e0d12', 0.34);
      line(g, -1.6 * u, -2.2 * u, 1.6 * u, -2.6 * u, 0.3 * u, rgba(shade(d.hood, 0.35), 0.8));
      limbs(g, [[-2.4 * u, -1.5 * u, 2.4 * u, -1.6 * u, 0.36 * u, 0.36 * u, shade(d.accent, -0.3), d.accent]], d);
      break;
    default: face(); break;
  }
  g.restore();
}

/* ---- the whole soldier -------------------------------------------------------------------- */
function renderFighter(g, kind, pose, x, y, face, anim, frame, tint) {
  const def = CHARS[kind], k = def.k;
  let d = dpal(def.pal);
  if (tint) d = tintPal(d, tint);
  const P = solvePose(pose, k);
  P.coatSwing = pose.coatSwing || 0;
  LX = -0.24 * face; LY = -0.26;
  const expr = PAIN_ANIMS.has(anim) ? 'hurt' : (KIAI_ANIMS.has(anim) && frame >= 0.55 && frame < 2.2 ? 'kiai' : 'calm');
  const seed = (x * 0.731) % 7;
  const ph = game.t * 6.5 + seed;
  g.save();
  g.translate(x, y + (pose.dy || 0) * k);
  if (face < 0) g.scale(-1, 1);
  if (!pose.noBackArm) drawArmV(g, d, P.shB, P.elbB, P.handB, k, true, pose.fistB);
  if (pose.itemB) drawHeldV(g, d, P.handB, pose.itemB, pose.iaB, k, P.rot);
  drawLegV(g, d, P, P.kneeB, P.footB, k, true);
  drawTorsoV(g, d, P, k);
  drawLegV(g, d, P, P.kneeF, P.footF, k, false);
  drawBeltV(g, d, P, k);
  const T = torsoFrame(P);
  drawHeadV(g, d, P.head[0], P.head[1], P.neck[0], P.neck[1], Math.atan2(T.ax, -T.ay) * 0.55, k, expr, ph, seed);
  if (!pose.noFrontArm) {
    drawArmV(g, d, P.shF, P.elbF, P.handF, k, false, pose.fistF);
    if (pose.item) drawHeldV(g, d, P.handF, pose.item, pose.ia, k, P.rot);
  }
  if (pose.tied && !d.tint) for (let i = 0; i < 2; i++) line(g, P.handB[0] - 1.6 * k, P.handB[1] - 0.6 * k + i * k, P.handB[0] + 1.6 * k, P.handB[1] - 0.2 * k + i * k, 0.5 * k, '#c9a463');
  g.restore();
}

/* Translucent or flashing fighters are painted once into a scratch layer and composited in
   a single pass, so overlapping limbs never stack up into a washed out, see-through figure. */
let SPRITE_DIRECT = false;   // reflections set this: they are faint enough to draw straight through
let SPRITE_LAYER = null;
function spriteLayer(cv) {
  if (!SPRITE_LAYER || SPRITE_LAYER.width !== cv.width || SPRITE_LAYER.height !== cv.height) SPRITE_LAYER = makeCanvas(cv.width, cv.height);
  return SPRITE_LAYER;
}
function spriteRect(m, cv, x, y, k) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const px of [x - 36 * k, x + 36 * k]) for (const py of [y - 46 * k, y + 8 * k]) {
    const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  x1 = Math.min(cv.width, Math.ceil(x1)); y1 = Math.min(cv.height, Math.ceil(y1));
  return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
}

/** Same call shape as the old sprite blitter; frame may be fractional for smooth motion. */
function drawSprite(g, kind, anim, frame, facing, x, y, flash, alpha) {
  const a = alpha === undefined ? 1 : clamp(alpha, 0, 1);
  if (a <= 0.01) return;
  let pose = poseAt(kind, anim, frame);
  if (SPRITE_SWAP && pose.item && SPRITE_SWAP[pose.item]) pose = Object.assign({}, pose, { item: SPRITE_SWAP[pose.item] });
  const ga = g.globalAlpha, net = ga * a;
  const cv = g.canvas;
  const layered = (flash || net < 0.97) && !SPRITE_DIRECT && QUALITY.level < 2 && cv && cv.id === 'screen' && g.getTransform;
  if (!layered) {
    g.globalAlpha = net;
    renderFighter(g, kind, pose, x, y, facing, anim, frame, null);
    if (flash) { g.globalAlpha = net * 0.22; renderFighter(g, kind, pose, x, y, facing, anim, frame, flash === true ? '#ffffff' : flash); }
    g.globalAlpha = ga;
    return;
  }
  const m = g.getTransform();
  const r = spriteRect(m, cv, x, y, CHARS[kind].k);
  if (!r) return;
  const L = spriteLayer(cv), q = L.getContext('2d');
  q.setTransform(1, 0, 0, 1, 0, 0); q.globalAlpha = 1; q.globalCompositeOperation = 'source-over';
  q.clearRect(r[0], r[1], r[2], r[3]);
  q.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
  renderFighter(q, kind, pose, x, y, facing, anim, frame, null);
  if (flash) {
    // lighten only the painted figure, keeping its line art readable under the flash
    q.setTransform(1, 0, 0, 1, 0, 0);
    q.globalCompositeOperation = 'source-atop';
    q.globalAlpha = flash === true ? 0.3 : 0.4;
    q.fillStyle = flash === true ? '#fff8ee' : flash;
    q.fillRect(r[0], r[1], r[2], r[3]);
    q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1;
  }
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = net;
  g.drawImage(L, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]);
  g.restore();
}

/** Joint positions in world space, used for motion trails. */
function fighterJoints(kind, anim, frame, facing, x, y) {
  const def = CHARS[kind], pose = poseAt(kind, anim, frame);
  const P = solvePose(pose, def.k);
  const oy = y + (pose.dy || 0) * def.k;
  const w = (p) => [x + p[0] * facing, oy + p[1]];
  return { handF: w(P.handF), handB: w(P.handB), footF: w(P.footF), footB: w(P.footB), head: w(P.head) };
}

/** A fighter's head alone, for portraits and life icons. */
function drawPortrait(g, kind, x, y, size, face) {
  const def = CHARS[kind], d = dpal(def.pal), k = def.k;
  const s = size / (8 * k);
  g.save(); g.translate(x, y); g.scale(s * (face || 1), s);
  LX = -0.24; LY = -0.26;
  drawHeadV(g, d, 0, 0, 0, 3.6 * k, 0, k, 'calm', game.t * 5, 1);
  g.restore();
}

