/* ==========================================================================
   Fighters: cel-shaded vector martial artists posed by inverse kinematics.
   Poses blend smoothly between keyframes; cloth, hair and ribbons flutter.
   Everything is drawn in local space: feet at the origin, facing right.
   ========================================================================== */

const INK = '#1b0f16';
const OLW = 0.5;
const LOOP_ANIMS = new Set(['walk', 'idle', 'spin', 'climb', 'grab', 'grabbed', 'stun', 'paw', 'charge', 'tied']);
const KIAI_ANIMS = new Set(['punch', 'punch2', 'kick', 'highKick', 'crouchPunch', 'sweep', 'jumpKick', 'jumpPunch', 'chi', 'throwHigh', 'throwLow', 'bash', 'slash', 'throw', 'thrustHigh', 'thrustLow', 'slam', 'palm', 'breath', 'cast', 'flex', 'raise', 'charge']);
const PAIN_ANIMS = new Set(['hurt', 'dead', 'grabbed', 'stun']);
const POSE_DEF = { hip: 13, tl: 10, lean: 0, rot: 0, dy: 0, hd: [0, 0], ff: [4, 0], bf: [-4, 0], fh: [6, -16], bh: [3, -15], ia: 0, iaB: 0 };
let LX = -0.24, LY = -0.26;

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
  const shoe = d.barefoot ? (back ? d.skin2 : d.skin) : (back ? shade(d.shoe, -0.12) : d.shoe);
  const shoeS = d.barefoot ? (back ? d.skin2S : d.skinS) : shade(d.shoe, -0.4);
  const hX = foot[0] - fx * 0.8 * k, hY = foot[1] - fy * 0.8 * k - lift;
  const tX = foot[0] + fx * 2.7 * k, tY = foot[1] + fy * 2.7 * k - lift * 0.8;
  limbs(g, [
    [hx, hy, knee[0], knee[1], 2.0 * k, 1.65 * k, cS, cL],
    [knee[0], knee[1], ax, ay, 1.65 * k, 1.22 * k, cS, cL],
    [hX, hY, tX, tY, 0.98 * k, 0.74 * k, shoeS, shoe]
  ], d);
  if (d.tint) return;
  // gathered cuff at the ankle and the white sole of a cloth shoe
  const cx0 = lerp(knee[0], ax, 0.86), cy0 = lerp(knee[1], ay, 0.86);
  line(g, cx0 - uy * 1.3 * k, cy0 + ux * 1.3 * k, cx0 + uy * 1.3 * k, cy0 - ux * 1.3 * k, 0.32 * k, rgba(shade(cL, -0.45), 0.7));
  if (!d.barefoot && planted) line(g, hX - 0.2 * k, -0.22 * k, tX - 0.4 * k, -0.22 * k, 0.32 * k, '#e9e2d2');
}

function drawArmV(g, d, sh, el, hd, k, back, fist) {
  const sleeve = back ? d.top2 : d.top, sleeveS = back ? d.top2S : d.topS;
  const skin = back ? d.skin2 : d.skin, skinS = back ? d.skin2S : d.skinS;
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

function drawHeldV(g, d, hand, item, angDeg, k, rot) {
  const a = ((angDeg || 0) * Math.PI) / 180 - (rot || 0);
  g.save(); g.translate(hand[0], hand[1]); g.rotate(a);
  const u = k;
  const steel = d.tint ? d.ink : '#d8e2ec', steelS = d.tint ? d.ink : '#8a98a8';
  g.lineJoin = 'round';
  switch (item) {
    case 'dagger': {
      limbs(g, [[-1.8 * u, 0, -0.2 * u, 0, 0.42 * u, 0.42 * u, '#3a2418', '#6a4a30']], d);
      rect(g, -0.1 * u, -0.95 * u, 0.6 * u, 1.9 * u, d.tint ? d.ink : '#a3282a');
      polyPath(g, [0.5 * u, -0.5 * u, 5.0 * u, -0.34 * u, 6.4 * u, 0, 5.0 * u, 0.34 * u, 0.5 * u, 0.5 * u]);
      g.lineWidth = OLW * 1.6; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = steelS; g.fill();
      if (!d.tint) { poly(g, [0.5 * u, -0.5 * u, 5.0 * u, -0.34 * u, 6.4 * u, 0, 0.5 * u, 0], steel); }
      break;
    }
    case 'blade': {
      limbs(g, [[-2.4 * u, 0, -0.2 * u, 0, 0.45 * u, 0.45 * u, '#1e1a24', '#3a3444']], d);
      rect(g, -0.2 * u, -1.0 * u, 0.6 * u, 2.0 * u, d.tint ? d.ink : '#6a5a8a');
      polyPath(g, [0.4 * u, -0.5 * u, 10.2 * u, -0.7 * u, 11.6 * u, 0.1 * u, 10.0 * u, 0.4 * u, 0.4 * u, 0.5 * u]);
      g.lineWidth = OLW * 1.6; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = steelS; g.fill();
      if (!d.tint) poly(g, [0.4 * u, -0.5 * u, 10.2 * u, -0.7 * u, 11.6 * u, 0.1 * u, 0.4 * u, 0], steel);
      break;
    }
    case 'spear': {
      limbs(g, [[-16 * u, 0, 19.5 * u, 0, 0.5 * u, 0.5 * u, '#5a3a1e', '#9a6a3a']], d);
      polyPath(g, [19.4 * u, -0.9 * u, 23.5 * u, -0.85 * u, 27.2 * u, 0, 23.5 * u, 0.85 * u, 19.4 * u, 0.9 * u]);
      g.lineWidth = OLW * 1.6; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = steelS; g.fill();
      if (!d.tint) {
        poly(g, [19.4 * u, -0.9 * u, 23.5 * u, -0.85 * u, 27.2 * u, 0, 19.4 * u, 0], steel);
        for (let i = 0; i < 4; i++) { const sw = Math.sin(game.t * 9 + i) * 0.6; line(g, 19 * u, 0.4 * u, (18.2 - i * 0.4) * u + sw, (3.2 + i * 0.25) * u, 0.55 * u, i % 2 ? '#e8392a' : '#b81e1e'); }
      }
      break;
    }
    case 'talisman': {
      g.rotate(0.2);
      rrect(g, -0.2 * u, -1.1 * u, 5.4 * u, 2.2 * u, 0.3 * u, d.tint ? d.ink : '#f2d16b');
      if (!d.tint) { line(g, 0.8 * u, 0, 4.4 * u, 0, 0.35 * u, '#c0282c'); line(g, 2.6 * u, -0.7 * u, 2.6 * u, 0.7 * u, 0.35 * u, '#c0282c'); }
      break;
    }
    case 'fan': {
      const R = 7.6 * u;
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, -0.95, 0.95); g.closePath();
      g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke();
      g.fillStyle = d.tint ? d.ink : lgrad(g, 0, 0, R, 0, [[0, '#7a1622'], [0.35, '#c2283d'], [1, '#e8495a']]); g.fill();
      if (!d.tint) {
        for (let t = -0.9; t <= 0.91; t += 0.18) line(g, Math.cos(t) * 1.2 * u, Math.sin(t) * 1.2 * u, Math.cos(t) * R * 0.97, Math.sin(t) * R * 0.97, 0.18 * u, 'rgba(70,10,20,0.6)');
        g.strokeStyle = '#f2c94c'; g.lineWidth = 0.55 * u; g.beginPath(); g.arc(0, 0, R - 0.3 * u, -0.92, 0.92); g.stroke();
        disc(g, R * 0.62, 0, 1.15 * u, '#f2c94c'); disc(g, R * 0.62, 0, 0.6 * u, '#c2283d');
      }
      break;
    }
    case 'fanClosed':
      limbs(g, [[0, 0, 7 * u, 0, 0.62 * u, 0.5 * u, '#8a1a26', '#c2283d']], d);
      if (!d.tint) disc(g, 7 * u, 0, 0.5 * u, '#f2c94c');
      break;
    case 'shield': {
      g.rotate(-a);
      const R = 6.4 * u, cx = 1.6 * u;
      g.beginPath(); g.arc(cx, 0, R, 0, TAU);
      g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke();
      g.fillStyle = d.tint ? d.ink : rgrad(g, cx - R * 0.35, -R * 0.4, R * 0.1, R * 1.2, [[0, '#ffe7a0'], [0.4, '#d9a440'], [1, '#7a5418']]); g.fill();
      if (!d.tint) {
        ring(g, cx, 0, R * 0.78, 0.35 * u, 'rgba(90,60,16,0.7)');
        ring(g, cx, 0, R * 0.45, 0.3 * u, 'rgba(90,60,16,0.6)');
        disc(g, cx, 0, R * 0.22, '#f0c860'); disc(g, cx - R * 0.07, -R * 0.07, R * 0.09, '#fff4c8');
        for (let i = 0; i < 8; i++) { const t = (i / 8) * TAU; disc(g, cx + Math.cos(t) * R * 0.88, Math.sin(t) * R * 0.88, 0.32 * u, '#fff0b0'); }
      }
      break;
    }
    default: break;
  }
  g.restore();
}

function drawTorsoV(g, d, P, k) {
  const T = torsoFrame(P);
  const wide = d.style === 'vest' ? 3.55 : d.style === 'armor' ? 3.4 : 3.05;
  const hw = 2.45 * k, sw = wide * k * (d.bracers ? 1.12 : 1);
  const sx = T.nx - T.ax * 1.0 * k, sy = T.ny - T.ay * 1.0 * k;
  const mx = (T.hx + sx) / 2, my = (T.hy + sy) / 2;
  const pt = (f, w) => [lerp(T.hx, sx, f) + T.px * w, lerp(T.hy, sy, f) + T.py * w];
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
  const L = (a, b, w, c) => line(g, a[0], a[1], b[0], b[1], w, c);
  switch (d.style) {
    case 'gi':
      poly(g, [...pt(1.0, -0.2 * k), ...pt(1.0, 1.5 * k), ...pt(0.55, 0.85 * k)], d.inner);
      L(pt(1.02, -0.25 * k), pt(0.16, 2.2 * k), 0.75 * k, d.trim);
      L(pt(1.0, 1.65 * k), pt(0.62, 1.0 * k), 0.55 * k, shade(d.trim, -0.2));
      L(pt(0.95, -1.6 * k), pt(0.3, -1.8 * k), 0.25 * k, rgba(d.topS, 0.8));
      break;
    case 'tang':
      L(pt(1.0, -0.7 * k), pt(1.0, 1.95 * k), 0.85 * k, d.trim);
      L(pt(0.98, 1.5 * k), pt(0.08, 2.0 * k), 0.3 * k, d.trim);
      for (const f of [0.78, 0.55, 0.32]) { L(pt(f, 1.15 * k), pt(f, 2.35 * k), 0.42 * k, d.trim); disc(g, ...pt(f, 2.4 * k), 0.32 * k, d.trim); }
      break;
    case 'vest':
      if (d.bare) {
        poly(g, [...pt(1.0, -0.1 * k), ...pt(1.0, 2.7 * k), ...pt(0.2, 2.0 * k), ...pt(0.28, 0.95 * k)], d.skin);
        poly(g, [...pt(1.0, 1.2 * k), ...pt(1.0, 2.7 * k), ...pt(0.6, 2.5 * k)], d.skinL);
        L(pt(0.68, 0.7 * k), pt(0.74, 2.5 * k), 0.32 * k, rgba(d.skinS, 0.9));
        L(pt(0.42, 1.2 * k), pt(0.45, 2.0 * k), 0.22 * k, rgba(d.skinS, 0.6));
        L(pt(1.0, -0.1 * k), pt(0.28, 0.95 * k), 0.45 * k, d.trim);
        L(pt(0.28, 0.95 * k), pt(0.2, 2.0 * k), 0.45 * k, d.trim);
      }
      break;
    case 'robe':
      L(pt(1.04, -0.45 * k), pt(0.12, 2.25 * k), 1.15 * k, d.trim);
      L(pt(1.02, -0.15 * k), pt(0.3, 1.9 * k), 0.35 * k, shade(d.trim, 0.25));
      break;
    case 'armor': {
      for (const f of [0.14, 0.32, 0.5, 0.68]) {
        L(pt(f, -hw * 0.95), pt(f, sw * 0.95), 0.3 * k, d.trim);
        for (let w = -2; w <= 2; w++) L(pt(f, w * 1.1 * k), pt(f + 0.16, w * 1.1 * k), 0.16 * k, rgba(d.topS, 0.9));
      }
      const pa = pt(0.97, 0.3 * k);
      g.beginPath(); g.arc(pa[0], pa[1], 2.1 * k, Math.PI * 0.9, Math.PI * 2.1); g.closePath();
      g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = d.helm; g.fill();
      L([pa[0] - 2 * k, pa[1] + 0.3 * k], [pa[0] + 2 * k, pa[1] + 0.3 * k], 0.35 * k, d.trim);
      break;
    }
    default:
      L(pt(0.98, 1.9 * k), pt(0.1, -1.8 * k), 0.7 * k, d.trim);
      break;
  }
}

function drawBeltV(g, d, P, k) {
  const T = torsoFrame(P);
  const c = d.sash || d.top2;
  const o = 0.3 * k, w = 2.6 * k;
  const a = [T.hx - T.px * w + T.ax * o, T.hy - T.py * w + T.ay * o];
  const b = [T.hx + T.px * w + T.ax * o, T.hy + T.py * w + T.ay * o];
  limbs(g, [[a[0], a[1], b[0], b[1], 0.78 * k, 0.78 * k, shade(c, -0.3), c]], d);
  if (!d.tint && d.style !== 'armor') {
    const kx = lerp(a[0], b[0], 0.78), ky = lerp(a[1], b[1], 0.78);
    disc(g, kx, ky, 0.95 * k + OLW, d.ink); disc(g, kx, ky, 0.95 * k, shade(c, -0.15)); disc(g, kx - 0.2 * k, ky - 0.25 * k, 0.5 * k, c);
  }
}

function drawSashTails(g, d, P, k, ph) {
  if (!d.sash || d.style === 'armor') return;
  const T = torsoFrame(P);
  const x0 = T.hx - T.px * 2.2 * k + T.ax * 0.3 * k, y0 = T.hy - T.py * 2.2 * k + T.ay * 0.3 * k;
  ribbon(g, d, x0, y0, Math.PI * 0.66, 5.6 * k, 1.15 * k, 0.5 * k, 0.4, ph, shade(d.sash, -0.28));
  ribbon(g, d, x0, y0, Math.PI * 0.6, 6.4 * k, 1.2 * k, 0.55 * k, 0.4, ph + 1.4, d.sash);
}

function drawSkirtV(g, d, P, k) {
  const T = torsoFrame(P);
  const wl = [T.hx - T.px * 2.65 * k, T.hy - T.py * 2.65 * k], wr = [T.hx + T.px * 2.65 * k, T.hy + T.py * 2.65 * k];
  for (const [knee, cL] of [[P.kneeB, d.top2], [P.kneeF, d.top]]) {
    const kx = knee[0], ky = knee[1] + 1.3 * k;
    const build = () => {
      g.beginPath(); g.moveTo(wl[0], wl[1]); g.lineTo(wr[0], wr[1]);
      g.lineTo(kx + 3.1 * k, ky); g.quadraticCurveTo(kx, ky + 1.3 * k, kx - 3.1 * k, ky); g.closePath();
    };
    celFill(g, build, (T.hx + kx) / 2, (T.hy + ky) / 2, shade(cL, -0.3), cL, d, 1.2 * k);
    if (!d.tint) line(g, kx - 2.9 * k, ky + 0.2 * k, kx + 2.9 * k, ky + 0.2 * k, 0.4 * k, rgba(d.trim, 0.8));
  }
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

function drawHeadV(g, d, hx, hy, nx, ny, tilt, k, expr, ph, seed) {
  const u = k;
  // neck
  limbs(g, [[nx, ny + 0.4 * k, hx - 0.2 * k, hy + 1.8 * k, 1.05 * k, 1.0 * k, d.skinS, d.skin]], d);
  g.save(); g.translate(hx, hy - 0.25 * k); g.rotate(tilt); g.scale(1.12, 1.12);
  const blink = ((game.t + seed * 0.37) % 3.6) < 0.11;
  const st = d.head;
  // pieces that hang behind the head
  if (st === 'band' || st === 'baldBand') {
    const c = st === 'band' ? d.band : d.band;
    ribbon(g, d, -2.4 * u, -0.95 * u, Math.PI + 0.25, (st === 'band' ? 6.2 : 3.4) * u, 0.95 * u, 0.4 * u, 0.55, ph, shade(c, -0.25));
    ribbon(g, d, -2.4 * u, -0.95 * u, Math.PI + 0.05, (st === 'band' ? 7.2 : 4) * u, 1.0 * u, 0.45 * u, 0.55, ph + 1.2, c);
  } else if (st === 'pony') {
    ribbon(g, d, -1.3 * u, -2.5 * u, Math.PI - 0.55, 7.6 * u, 2.0 * u, 0.5 * u, 0.45, ph * 0.8, d.hair);
  } else if (st === 'mask' || st === 'hood') {
    ribbon(g, d, -2.2 * u, 0.4 * u, Math.PI + 0.2, 4.6 * u, 0.9 * u, 0.35 * u, 0.6, ph, st === 'mask' ? d.trim : d.sash);
  } else if (st === 'demon') {
    ribbon(g, d, -1.2 * u, -2.6 * u, Math.PI - 0.25, 10 * u, 4.6 * u, 1.0 * u, 0.35, ph * 0.6, shade(d.hair, -0.12));
    ribbon(g, d, -1.6 * u, -1.2 * u, Math.PI - 0.55, 8 * u, 3.4 * u, 0.8 * u, 0.4, ph * 0.6 + 1, d.hair);
  } else if (st === 'helm') {
    ribbon(g, d, 0, -3.5 * u, Math.PI + 0.35, 6 * u, 1.6 * u, 0.4 * u, 0.5, ph, shade(d.plume, -0.2));
    ribbon(g, d, 0, -3.6 * u, Math.PI + 0.15, 7 * u, 1.7 * u, 0.4 * u, 0.5, ph + 1, d.plume);
  } else if (st === 'cowl') {
    ribbon(g, d, -2.0 * u, 0.4 * u, Math.PI * 0.62, 4 * u, 3 * u, 1.6 * u, 0.2, ph * 0.5, d.hoodS || shade(d.hood, -0.3));
  }
  // the head itself
  const faceCol = st === 'hood' ? d.hood : st === 'demon' ? '#b02a30' : d.skin;
  const faceS = st === 'hood' ? shade(d.hood, -0.3) : st === 'demon' ? '#7a1820' : d.skinS;
  celFill(g, () => headShape(g, u), 0.2 * u, 0, faceS, faceCol, d, 1.5 * u, 0.78, 0.8);
  if (d.tint) { g.restore(); return; }
  if (st !== 'hood' && st !== 'demon' && st !== 'helm' && st !== 'cowl') earV(g, d, u);
  // face features and hair per style
  switch (st) {
    case 'band': {
      hairBand(g, d, u);
      browV(g, u, expr, d.hair); eyeV(g, d, 1.15 * u, -0.22 * u, u, expr, blink); noseV(g, d, u); mouthV(g, d, u, expr);
      g.strokeStyle = d.ink; g.lineWidth = 1.0 * u + OLW * 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(2.32 * u, -1.0 * u); g.quadraticCurveTo(0.2 * u, -2.05 * u, -2.45 * u, -0.95 * u); g.stroke();
      g.strokeStyle = d.band; g.lineWidth = 1.0 * u; g.stroke();
      g.strokeStyle = shade(d.band, 0.25); g.lineWidth = 0.3 * u; g.beginPath(); g.moveTo(2.1 * u, -1.25 * u); g.quadraticCurveTo(0.2 * u, -2.2 * u, -2.2 * u, -1.25 * u); g.stroke();
      disc(g, -2.5 * u, -0.95 * u, 0.7 * u, d.ink); disc(g, -2.5 * u, -0.95 * u, 0.55 * u, d.band);
      break;
    }
    case 'pony': {
      celFill(g, () => {
        g.beginPath(); g.moveTo(2.25 * u, -0.95 * u);
        g.quadraticCurveTo(1.9 * u, -3.1 * u, 0.1 * u, -3.25 * u);
        g.quadraticCurveTo(-2.4 * u, -3.2 * u, -2.7 * u, -0.9 * u);
        g.quadraticCurveTo(-2.8 * u, 0.6 * u, -2.0 * u, 1.3 * u);
        g.quadraticCurveTo(-1.2 * u, 0.2 * u, -0.9 * u, -0.6 * u);
        g.quadraticCurveTo(0.2 * u, -1.5 * u, 0.9 * u, -1.35 * u);
        g.lineTo(1.25 * u, -0.45 * u); g.lineTo(1.55 * u, -1.3 * u); g.lineTo(1.95 * u, -0.5 * u);
        g.closePath();
      }, -0.3 * u, -1.8 * u, d.hair, d.hairL, d, 1.0 * u);
      disc(g, -1.3 * u, -2.55 * u, 0.75 * u, d.ink); disc(g, -1.3 * u, -2.55 * u, 0.6 * u, d.band);
      browV(g, u, expr, d.hair, 0.36); eyeV(g, d, 1.15 * u, -0.22 * u, u, expr, blink); noseV(g, d, u); mouthV(g, d, u, expr, '#a33a3a');
      break;
    }
    case 'bald':
      ellipse(g, 0.5 * u, -2.1 * u, 0.9 * u, 0.32 * u, -0.25, 'rgba(255,255,255,0.35)');
      browV(g, u, expr, '#3a2420'); eyeV(g, d, 1.15 * u, -0.22 * u, u, expr, blink); noseV(g, d, u); mouthV(g, d, u, expr);
      break;
    case 'baldBand':
      ellipse(g, 1.0 * u, 1.55 * u, 1.5 * u, 1.0 * u, 0, 'rgba(40,20,20,0.14)');
      ellipse(g, 0.4 * u, -2.2 * u, 0.9 * u, 0.3 * u, -0.25, 'rgba(255,255,255,0.3)');
      browV(g, u, expr, d.hair, 0.5); eyeV(g, d, 1.15 * u, -0.22 * u, u, expr, blink); noseV(g, d, u); mouthV(g, d, u, expr);
      g.strokeStyle = d.ink; g.lineWidth = 0.9 * u + OLW * 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(2.32 * u, -1.1 * u); g.quadraticCurveTo(0.2 * u, -2.1 * u, -2.45 * u, -0.95 * u); g.stroke();
      g.strokeStyle = d.band; g.lineWidth = 0.9 * u; g.stroke();
      break;
    case 'mask':
      celFill(g, () => { g.beginPath(); g.moveTo(2.2 * u, -1.15 * u); g.quadraticCurveTo(1.6 * u, -3.1 * u, -0.2 * u, -3.0 * u); g.quadraticCurveTo(-2.5 * u, -2.8 * u, -2.5 * u, -0.6 * u); g.quadraticCurveTo(-1.5 * u, -1.2 * u, 0.2 * u, -1.5 * u); g.closePath(); }, 0, -2, d.hair, d.hairL, d, u);
      disc(g, -0.6 * u, -3.1 * u, 0.95 * u, d.ink); disc(g, -0.6 * u, -3.1 * u, 0.8 * u, d.hair);
      eyeV(g, d, 1.15 * u, -0.45 * u, u, expr, blink); browV(g, u, expr, d.hair);
      celFill(g, () => { g.beginPath(); g.moveTo(2.62 * u, -0.05 * u); g.lineTo(2.62 * u, 1.4 * u); g.quadraticCurveTo(2.2 * u, 2.6 * u, 0.6 * u, 2.7 * u); g.lineTo(-1.2 * u, 2.1 * u); g.lineTo(-1.4 * u, 0.7 * u); g.quadraticCurveTo(0.5 * u, 0.4 * u, 2.62 * u, -0.05 * u); g.closePath(); }, 0.8 * u, 1.2 * u, shade(d.mask, -0.2), shade(d.mask, 0.12), d, 0.6 * u);
      break;
    case 'hood':
      roundRectPath(g, 0.15 * u, -1.05 * u, 2.45 * u, 1.35 * u, 0.6 * u); g.fillStyle = d.skin; g.fill();
      eyeV(g, d, 1.25 * u, -0.38 * u, u, expr, blink); browV(g, u, expr, '#0e0d12', 0.3);
      line(g, -1.6 * u, -2.2 * u, 1.6 * u, -2.6 * u, 0.3 * u, rgba(shade(d.hood, 0.3), 0.8));
      break;
    case 'bun':
      celFill(g, () => { g.beginPath(); g.moveTo(2.2 * u, -1.0 * u); g.quadraticCurveTo(1.8 * u, -3.1 * u, 0 * u, -3.2 * u); g.quadraticCurveTo(-2.5 * u, -3.1 * u, -2.7 * u, -0.6 * u); g.quadraticCurveTo(-2.6 * u, 1.2 * u, -1.8 * u, 1.4 * u); g.quadraticCurveTo(-1.0 * u, 0.0 * u, -0.6 * u, -0.8 * u); g.quadraticCurveTo(0.6 * u, -1.7 * u, 2.2 * u, -1.0 * u); g.closePath(); }, -0.4 * u, -1.6 * u, d.hair, d.hairL, d, u);
      celFill(g, () => { g.beginPath(); g.arc(-2.0 * u, -2.7 * u, 1.55 * u, 0, TAU); }, -2.0 * u, -2.7 * u, d.hair, d.hairL, d, 0.8 * u);
      line(g, -3.6 * u, -3.7 * u, -0.5 * u, -1.8 * u, 0.36 * u, '#f2c94c');
      disc(g, -0.9 * u, -3.7 * u, 0.62 * u, '#d6312a'); disc(g, -0.9 * u, -3.7 * u, 0.25 * u, '#f2c94c');
      browV(g, u, expr, d.hair, 0.3); eyeV(g, d, 1.15 * u, -0.22 * u, u, expr, blink); noseV(g, d, u); mouthV(g, d, u, expr, '#c2283d');
      break;
    case 'helm':
      eyeV(g, d, 1.15 * u, -0.1 * u, u, expr, blink); browV(g, u, expr, '#191317'); noseV(g, d, u); mouthV(g, d, u, expr);
      ellipse(g, 1.4 * u, 2.0 * u, 1.0 * u, 0.55 * u, 0, rgba(d.hair, 0.85));
      celFill(g, () => { g.beginPath(); g.ellipse(0, -0.75 * u, 2.8 * u, 2.65 * u, 0, Math.PI, TAU); g.closePath(); }, 0, -1.6 * u, d.helmS, d.helmL, d, u);
      limbs(g, [[-3.0 * u, -0.7 * u, 3.0 * u, -0.7 * u, 0.42 * u, 0.42 * u, d.helmS, d.helm]], d);
      celFill(g, () => { g.beginPath(); g.moveTo(-2.7 * u, -0.7 * u); g.lineTo(-3.1 * u, 1.8 * u); g.lineTo(-1.3 * u, 1.6 * u); g.lineTo(-1.1 * u, -0.6 * u); g.closePath(); }, -2 * u, 0.5 * u, d.helmS, d.helm, d, 0.5 * u);
      tri(g, 0, -4.4 * u, 1.0 * u, 1.2 * u, '#d9b04a');
      line(g, -1.6 * u, -2.2 * u, 0.6 * u, -3.2 * u, 0.3 * u, 'rgba(255,255,255,0.35)');
      break;
    case 'ox': {
      celFill(g, () => { g.beginPath(); g.ellipse(0, -0.7 * u, 2.65 * u, 2.5 * u, 0, Math.PI, TAU); g.closePath(); }, 0, -1.5 * u, d.helmS, d.helmL, d, u);
      limbs(g, [[-2.8 * u, -0.7 * u, 2.8 * u, -0.7 * u, 0.4 * u, 0.4 * u, d.helmS, d.helm]], d);
      ribbon(g, d, 1.2 * u, -2.5 * u, -1.25, 3.4 * u, 1.1 * u, 0.15 * u, 0.6, 2.2, '#efe6cf');
      ribbon(g, d, -1.4 * u, -2.5 * u, -1.95, 3.4 * u, 1.1 * u, 0.15 * u, 0.6, -0.9, '#ddd2b6');
      eyeV(g, d, 1.15 * u, -0.05 * u, u, expr, blink); browV(g, u, 'kiai', d.hair, 0.6); noseV(g, d, u);
      celFill(g, () => { g.beginPath(); g.moveTo(2.2 * u, 0.4 * u); g.quadraticCurveTo(2.9 * u, 1.6 * u, 1.7 * u, 3.3 * u); g.quadraticCurveTo(0.4 * u, 3.9 * u, -1.2 * u, 2.3 * u); g.lineTo(-1.0 * u, 0.6 * u); g.quadraticCurveTo(0.6 * u, 1.1 * u, 2.2 * u, 0.4 * u); g.closePath(); }, 0.6 * u, 2 * u, d.hair, d.hairL, d, 0.8 * u);
      if (expr === 'kiai') ellipse(g, 1.75 * u, 1.45 * u, 0.6 * u, 0.4 * u, 0, '#2a0a0c');
      break;
    }
    case 'cowl':
      celFill(g, () => { g.beginPath(); g.moveTo(2.15 * u, -1.6 * u); g.quadraticCurveTo(0.4 * u, -4.1 * u, -2.7 * u, -1.4 * u); g.lineTo(-3.0 * u, 2.9 * u); g.lineTo(-0.8 * u, 2.7 * u); g.quadraticCurveTo(-0.6 * u, 0.1 * u, 0.5 * u, -1.3 * u); g.closePath(); }, -1 * u, -0.5 * u, d.hoodS || shade(d.hood, -0.3), d.hood, d, u);
      eyeV(g, d, 1.2 * u, -0.25 * u, u, expr, false, '#e8dcff');
      drawGlow(g, 1.25 * u, -0.25 * u, 2.4 * u, '#b48aff', 0.8);
      mouthV(g, d, u, expr, '#6a4a8a');
      break;
    case 'demon':
      line(g, 0.3 * u, -1.5 * u, 2.2 * u, -0.75 * u, 0.6 * u, '#ffd96b');
      ellipse(g, 1.3 * u, -0.2 * u, 0.7 * u, 0.42 * u, 0.2, '#ffd23a'); line(g, 1.45 * u, -0.55 * u, 1.45 * u, 0.15 * u, 0.22 * u, '#1a0a0a');
      poly(g, [1.0 * u, 1.0 * u, 2.4 * u, 0.9 * u, 2.2 * u, 1.9 * u, 1.2 * u, 1.9 * u], '#3a0a0e');
      poly(g, [1.25 * u, 1.0 * u, 1.55 * u, 1.0 * u, 1.4 * u, 1.65 * u], '#fffbe8'); poly(g, [1.95 * u, 0.95 * u, 2.25 * u, 0.95 * u, 2.1 * u, 1.6 * u], '#fffbe8');
      line(g, 2.4 * u, -0.2 * u, 2.7 * u, 0.6 * u, 0.3 * u, '#7a1820');
      ribbon(g, d, 0.9 * u, -2.5 * u, -1.35, 2.2 * u, 0.9 * u, 0.1 * u, 0.4, 2.0, '#e8c050');
      ribbon(g, d, -1.0 * u, -2.6 * u, -1.9, 2.0 * u, 0.85 * u, 0.1 * u, 0.4, -1.0, '#c9a040');
      break;
    case 'sage':
      celFill(g, () => { g.beginPath(); g.moveTo(2.0 * u, -1.4 * u); g.quadraticCurveTo(1.2 * u, -3.0 * u, -0.4 * u, -3.0 * u); g.quadraticCurveTo(-2.5 * u, -2.7 * u, -2.6 * u, -0.6 * u); g.quadraticCurveTo(-1.8 * u, -1.6 * u, 2.0 * u, -1.4 * u); g.closePath(); }, -0.3 * u, -2 * u, d.hairS, d.hair, d, u);
      celFill(g, () => { g.beginPath(); g.arc(-0.4 * u, -3.4 * u, 1.05 * u, 0, TAU); }, -0.4 * u, -3.4 * u, d.hairS, d.hair, d, 0.5 * u);
      eyeV(g, d, 1.2 * u, -0.15 * u, u, expr, true); noseV(g, d, u);
      ribbon(g, d, 0.6 * u, -1.0 * u, 0.5, 2.6 * u, 0.5 * u, 0.15 * u, 0.2, ph * 0.3, d.hair);
      ribbon(g, d, 1.1 * u, 1.6 * u, Math.PI / 2 - 0.15, 5.5 * u, 2.6 * u, 0.5 * u, 0.15, ph * 0.3, d.hair);
      ribbon(g, d, 2.2 * u, 0.85 * u, Math.PI / 2 + 0.6, 2.4 * u, 0.6 * u, 0.2 * u, 0.2, ph * 0.3, d.hair);
      break;
    default: break;
  }
  g.restore();
}

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

/* ---- the whole fighter ------------------------------------------------------------------ */
function renderFighter(g, kind, pose, x, y, face, anim, frame, tint) {
  const def = CHARS[kind], k = def.k;
  let d = dpal(def.pal);
  if (tint) d = tintPal(d, tint);
  const P = solvePose(pose, k);
  LX = -0.24 * face; LY = -0.26;
  const expr = PAIN_ANIMS.has(anim) ? 'hurt' : (KIAI_ANIMS.has(anim) && frame >= 0.55 && frame < 2.2 ? 'kiai' : 'calm');
  const seed = (x * 0.731) % 7;
  const ph = game.t * 6.5 + seed;
  g.save();
  g.translate(x, y + (pose.dy || 0) * k);
  if (face < 0) g.scale(-1, 1);
  if (!pose.noBackArm) drawArmV(g, d, P.shB, P.elbB, P.handB, k, true, pose.fistB);
  if (pose.itemB) drawHeldV(g, d, P.handB, pose.itemB, pose.iaB, k, P.rot);
  drawSashTails(g, d, P, k, ph);
  drawLegV(g, d, P, P.kneeB, P.footB, k, true);
  drawTorsoV(g, d, P, k);
  drawLegV(g, d, P, P.kneeF, P.footF, k, false);
  if (d.robe) drawSkirtV(g, d, P, k);
  drawBeltV(g, d, P, k);
  const T = torsoFrame(P);
  drawHeadV(g, d, P.head[0], P.head[1], P.neck[0], P.neck[1], Math.atan2(T.ax, -T.ay) * 0.55, k, expr, ph, seed);
  if (!pose.noFrontArm) {
    drawArmV(g, d, P.shF, P.elbF, P.handF, k, false, pose.fistF);
    if (pose.item) drawHeldV(g, d, P.handF, pose.item, pose.ia, k, P.rot);
  }
  if (pose.tied && !d.tint) {
    for (let i = 0; i < 3; i++) line(g, T.hx - 3 * k, T.hy - (1.5 + i * 1.6) * k, T.hx + 3 * k, T.hy - (2.2 + i * 1.6) * k, 0.45 * k, '#c9a463');
  }
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
  const pose = poseAt(kind, anim, frame);
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
    q.globalAlpha = flash === true ? 0.42 : 0.4;
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

/* ==== creatures, props, pickups and projectiles ==================================================== */
const MONKEY_PAL = dpal({ fur: '#8a5a34', face: '#efcfa8', vest: '#c0392b', cap: '#d6312a' });

function drawMonkey(g, x, y, face, fr, flash, alpha) {
  let d = MONKEY_PAL;
  if (flash) d = tintPal(d, '#ffffff');
  const ga = g.globalAlpha;
  g.globalAlpha = ga * (alpha === undefined ? 1 : alpha);
  g.save(); g.translate(x, y); if (face < 0) g.scale(-1, 1);
  LX = -0.24 * face; LY = -0.26;
  const leap = fr >= 4 && fr < 5, tumble = fr >= 5;
  if (tumble) { g.translate(0, -7); g.rotate(-2.4 - (game.t * 9) % TAU); g.translate(0, 7); }
  const ph = ((fr % 4) / 4) * TAU;
  const by = leap ? -10.5 : -8.6 - Math.abs(Math.sin(ph)) * 0.8;
  ribbon(g, d, -5.2, by - 1, -2.3, 9, 1.7, 0.7, 0.7, game.t * 6, d.furS);
  const leg = (hx, hy, o, back) => {
    const a = ph + o;
    const fx = leap ? hx + (back ? -3.5 : 3.5) : hx + Math.sin(a) * 3.6, fy = leap ? hy + 3 : -0.9 - Math.max(0, Math.cos(a)) * 2.4;
    const kx = (hx + fx) / 2 + 1.2, ky = (hy + fy) / 2 - 0.6;
    limbs(g, [[hx, hy, kx, ky, 1.25, 1.0, back ? d.furS : shade(d.fur, -0.2), back ? shade(d.fur, -0.15) : d.fur], [kx, ky, fx, fy, 1.0, 0.85, back ? d.furS : shade(d.fur, -0.2), back ? shade(d.fur, -0.15) : d.fur]], d);
  };
  leg(-3.2, by + 2.6, Math.PI, true);
  leg(3.0, by + 2.4, Math.PI * 0.5, true);
  celFill(g, () => { g.beginPath(); g.ellipse(0, by, 6.2, 4.2, -0.12, 0, TAU); }, 0, by, d.furS, d.fur, d, 2.2);
  if (!d.tint) { g.fillStyle = d.vest; g.beginPath(); g.ellipse(0.6, by - 0.6, 4.6, 3.4, -0.12, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(0.6, by + 1.2); g.closePath(); g.fill(); }
  leg(-2.4, by + 2.6, 0, false);
  leg(3.6, by + 2.4, Math.PI * 1.5, false);
  // head
  const hx = 6.2, hy = by - 4.4;
  disc(g, hx - 2.4, hy - 1.9, 1.5 + OLW, d.ink); disc(g, hx - 2.4, hy - 1.9, 1.5, d.tint ? d.ink : d.faceS);
  celFill(g, () => { g.beginPath(); g.arc(hx, hy, 3.7, 0, TAU); }, hx, hy, d.furS, d.fur, d, 1.4);
  if (!d.tint) {
    g.fillStyle = d.face; g.beginPath(); g.ellipse(hx + 1.3, hy + 0.5, 2.5, 2.3, 0, 0, TAU); g.fill();
    disc(g, hx + 1.4, hy - 0.5, 0.55, INK); disc(g, hx + 2.6, hy - 0.4, 0.5, INK); disc(g, hx + 1.55, hy - 0.65, 0.18, '#ffffff');
    line(g, hx + 1.6, hy + 1.6, hx + 2.9, hy + 1.4, 0.3, '#5a2a1a');
    g.fillStyle = d.cap; g.beginPath(); g.ellipse(hx - 0.4, hy - 3.1, 2.4, 1.2, -0.2, Math.PI, TAU); g.fill();
    disc(g, hx - 0.6, hy - 4.1, 0.55, '#f2c94c');
  }
  // reaching arm
  const ax = leap ? hx + 4.5 : 4 + Math.sin(ph + 1) * 2, ay = leap ? hy - 2 : -1.5;
  limbs(g, [[3.2, by - 0.5, ax, ay, 1.05, 0.85, shade(d.fur, -0.2), d.fur]], d);
  g.restore();
  g.globalAlpha = ga;
}

function drawSnake(g, x, y, face, fr, alpha) {
  const ga = g.globalAlpha;
  g.globalAlpha = ga * (alpha === undefined ? 1 : alpha);
  g.save(); g.translate(x, y); if (face < 0) g.scale(-1, 1);
  const strike = fr === 2, phs = game.t * 9 + x * 0.1;
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, px0 = -10 + t * 18;
    let py = -1.6 + Math.sin(phs + t * 6) * 1.3 * (1 - t * 0.4);
    if (strike && t > 0.55) py -= (t - 0.55) * 18;
    pts.push(px0, py);
  }
  const path = () => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  path(); g.strokeStyle = INK; g.lineWidth = 3.8; g.stroke();
  path(); g.strokeStyle = '#3e8a3a'; g.lineWidth = 2.8; g.stroke();
  path(); g.strokeStyle = '#7ccf5a'; g.lineWidth = 1.2; g.stroke();
  for (let i = 4; i < pts.length - 4; i += 6) disc(g, pts[i], pts[i + 1], 0.6, '#2a5a2a');
  const hx = pts[pts.length - 2], hy = pts[pts.length - 1];
  ellipse(g, hx + 1.2, hy, 2.7 + OLW, 1.9 + OLW, 0, INK); ellipse(g, hx + 1.2, hy, 2.7, 1.9, 0, '#4fa04a');
  disc(g, hx + 1.9, hy - 0.6, 0.45, '#ffd04a'); disc(g, hx + 2.0, hy - 0.6, 0.2, INK);
  if (Math.sin(game.t * 12) > 0) { line(g, hx + 3.7, hy + 0.3, hx + 5.4, hy + 0.1, 0.3, '#e8392a'); }
  g.restore();
  g.globalAlpha = ga;
}

/** Porcelain vase with its base at (x, y). kind 1 is blue-and-white, 0 is red lacquer. */
function drawVase(g, x, y, kind, s) {
  s = s || 1;
  g.save(); g.translate(x, y); g.scale(s, s);
  const blue = kind === 1;
  const path = () => {
    g.beginPath();
    g.moveTo(-1.6, -17.5); g.lineTo(1.6, -17.5);
    g.quadraticCurveTo(1.4, -15, 2.4, -14);
    g.bezierCurveTo(7.2, -12, 6.8, -4, 3.0, -1.2);
    g.lineTo(3.0, 0); g.lineTo(-3.0, 0); g.lineTo(-3.0, -1.2);
    g.bezierCurveTo(-6.8, -4, -7.2, -12, -2.4, -14);
    g.quadraticCurveTo(-1.4, -15, -1.6, -17.5);
    g.closePath();
  };
  path(); g.lineWidth = 1.0; g.strokeStyle = INK; g.stroke();
  g.fillStyle = blue ? lgrad(g, -6, 0, 6, 0, [[0, '#b8c4d4'], [0.35, '#f4f8fc'], [0.7, '#e2e8f0'], [1, '#98a6b8']]) : lgrad(g, -6, 0, 6, 0, [[0, '#7a2014'], [0.35, '#d0502e'], [0.7, '#b23a22'], [1, '#5a160e']]);
  g.fill();
  g.save(); path(); g.clip();
  if (blue) {
    rect(g, -7, -11, 14, 1.0, '#2f5fae'); rect(g, -7, -4.5, 14, 0.8, '#2f5fae');
    for (let i = -2; i <= 2; i++) { ring(g, i * 2.8, -7.8, 1.2, 0.45, '#3a6ab8'); }
  } else {
    rect(g, -7, -11.5, 14, 1.4, '#f2c94c'); rect(g, -7, -4.2, 14, 1.0, '#f2c94c');
    for (let i = -2; i <= 2; i++) disc(g, i * 2.8, -7.8, 0.7, '#f2c94c');
  }
  rect(g, -3.6, -13, 1.1, 10, 'rgba(255,255,255,0.4)');
  g.restore();
  rect(g, -2.1, -18.2, 4.2, 1.2, blue ? '#e8eef4' : '#c0452a');
  g.restore();
}

/** Hanging paper lantern; (x, y) is where its cord meets the cap. */
function drawLantern(g, x, y, lit, s) {
  s = s || 1;
  g.save(); g.translate(x, y); g.scale(s, s);
  rrect(g, -3.2, 0, 6.4, 2, 0.6, '#d9a43a');
  g.beginPath(); g.ellipse(0, 9, 5.6, 6.8, 0, 0, TAU);
  g.lineWidth = 0.9; g.strokeStyle = INK; g.stroke();
  g.fillStyle = lit ? rgrad(g, -0.8, 8, 0.5, 7.5, [[0, '#fff0b0'], [0.35, '#ff8a3a'], [0.8, '#d4321e'], [1, '#8a1810']]) : lgrad(g, -5, 0, 5, 0, [[0, '#5a1a12'], [0.5, '#9a2a1a'], [1, '#4a140e']]);
  g.fill();
  g.strokeStyle = 'rgba(90,20,10,0.55)'; g.lineWidth = 0.4;
  for (const r of [0.3, 0.62]) { g.beginPath(); g.ellipse(0, 9, 5.6 * r, 6.8, 0, -Math.PI / 2, Math.PI / 2); g.stroke(); g.beginPath(); g.ellipse(0, 9, 5.6 * r, 6.8, 0, Math.PI / 2, Math.PI * 1.5); g.stroke(); }
  rrect(g, -3.2, 15.6, 6.4, 1.8, 0.6, '#d9a43a');
  for (let i = -1; i <= 1; i++) line(g, i * 0.9, 17.4, i * 1.2, 22.5, 0.5, '#c0282c');
  g.restore();
}

const PICK_DRAW = {
  bun(g) {
    g.beginPath(); g.ellipse(0, 1.5, 5.4, 3.6, 0, Math.PI, TAU); g.lineTo(5.4, 2.6); g.quadraticCurveTo(0, 4.2, -5.4, 2.6); g.closePath();
    g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
    g.fillStyle = rgrad(g, -1.5, -1, 0.5, 6, [[0, '#ffffff'], [1, '#d8cfb8']]); g.fill();
    for (let i = -2; i <= 2; i++) line(g, i * 0.8, -1.6, i * 2.0, 0.6, 0.35, 'rgba(160,140,110,0.7)');
    disc(g, 0, -1.9, 0.7, '#e0402a');
  },
  scroll(g) {
    rrect(g, -4.4, -3.2, 8.8, 6.4, 0.6, INK);
    rect(g, -3.9, -2.7, 7.8, 5.4, '#f2dc94');
    limbs(g, [[-4.6, -3.6, -4.6, 3.6, 0.95, 0.95, '#6a2e14', '#a04a22'], [4.6, -3.6, 4.6, 3.6, 0.95, 0.95, '#6a2e14', '#a04a22']], dpal({}));
    rect(g, -1.5, -1.5, 3, 3, '#c0282c'); line(g, -0.8, 0, 0.8, 0, 0.35, '#ffd8a0'); line(g, 0, -0.8, 0, 0.8, 0.35, '#ffd8a0');
  },
  coin(g) {
    disc(g, 0, 0, 5.2, INK);
    g.fillStyle = rgrad(g, -1.5, -1.5, 0.5, 6, [[0, '#9ff0c8'], [0.5, '#2fae7a'], [1, '#14603e']]);
    g.beginPath(); g.arc(0, 0, 4.6, 0, TAU); g.fill();
    rect(g, -1.4, -1.4, 2.8, 2.8, '#0f3a2a');
    ring(g, 0, 0, 3.8, 0.35, 'rgba(255,255,255,0.4)');
  },
  peach(g) {
    disc(g, 0, 0.8, 5.0, INK);
    g.fillStyle = rgrad(g, -1.6, -0.8, 0.5, 6, [[0, '#fff0c0'], [0.4, '#ffb08a'], [1, '#e05a4a']]);
    g.beginPath(); g.arc(0, 0.8, 4.5, 0, TAU); g.fill();
    line(g, 0.4, -3.2, 1.2, 3.2, 0.35, 'rgba(180,60,60,0.5)');
    g.fillStyle = '#4a9a3a'; g.beginPath(); g.ellipse(-1.6, -3.6, 2.4, 1.1, -0.5, 0, TAU); g.fill();
  }
};
function drawPickup(g, type, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s || 1, s || 1);
  (PICK_DRAW[type] || PICK_DRAW.bun)(g);
  g.restore();
}

function drawKnifeShot(g, x, y, dir, deflected) {
  g.save(); g.translate(x, y); if (dir < 0) g.scale(-1, 1);
  g.globalAlpha *= 0.35; rect(g, -12, -0.4, 9, 0.8, deflected ? '#9fe8ff' : '#ffffff'); g.globalAlpha /= 0.35;
  rrect(g, -6, -0.8, 3.2, 1.6, 0.5, '#4a2e1c');
  rect(g, -2.9, -1.6, 0.8, 3.2, '#a3282a');
  poly(g, [-2.1, -0.9, 4.5, -0.6, 6.4, 0, 4.5, 0.6, -2.1, 0.9], '#9aa8b8');
  poly(g, [-2.1, -0.9, 4.5, -0.6, 6.4, 0, -2.1, 0], '#eef4fa');
  if (deflected) drawGlow(g, 0, 0, 7, '#9fe8ff', 0.7);
  g.restore();
}
function drawFanShot(g, x, y, t) {
  g.save(); g.translate(x, y); g.rotate(t * 16);
  const R = 8;
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, -1.15, 1.15); g.closePath();
  g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
  g.fillStyle = lgrad(g, 0, 0, R, 0, [[0, '#7a1622'], [0.4, '#d6283d'], [1, '#ff6070']]); g.fill();
  for (let a = -1.1; a <= 1.11; a += 0.22) line(g, 0, 0, Math.cos(a) * R * 0.96, Math.sin(a) * R * 0.96, 0.22, 'rgba(70,10,20,0.6)');
  g.strokeStyle = '#f2c94c'; g.lineWidth = 0.6; g.beginPath(); g.arc(0, 0, R - 0.4, -1.12, 1.12); g.stroke();
  disc(g, 0, 0, 1.0, '#f2c94c');
  g.restore();
  g.globalAlpha *= 0.25; g.strokeStyle = '#ff8090'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 8.5, 0, TAU); g.stroke(); g.globalAlpha /= 0.25;
}
function drawTalismanShot(g, x, y, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 6) * 0.4); g.scale(0.65 + 0.35 * Math.abs(Math.cos(t * 8)), 1);
  drawGlow(g, 0, 0, 9, '#ffd84a', 0.5);
  rrect(g, -3, -6.5, 6, 13, 0.5, INK);
  rect(g, -2.5, -6, 5, 12, '#f2d16b');
  line(g, -1.5, -3.5, 1.5, -3.5, 0.6, '#c0282c'); line(g, 0, -4.5, 0, 3.5, 0.6, '#c0282c'); line(g, -1.5, 0, 1.5, 0.5, 0.6, '#c0282c'); line(g, -1.2, 3.5, 1.2, 2.8, 0.6, '#c0282c');
  g.restore();
}

/** Stylised golden dragon head for the Dragon Wave, facing dir. */
function drawDragonHead(g, x, y, dir, s) {
  s = s || 1;
  g.save(); g.translate(x, y); g.scale(dir * s, s);
  const gold = '#ffd84a', goldS = '#d09a20', jade = '#5ef0c0', jadeS = '#1ea888';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i - 2) * 0.3 + Math.sin(game.t * 9 + i) * 0.12;
    ribbonPath(g, -6, -1 + i * 1.6, a, 9 - Math.abs(i - 2), 2.2, 0.3, 0.5, game.t * 8 + i, 6);
    g.fillStyle = i % 2 ? jade : jadeS; g.fill();
  }
  g.lineJoin = 'round';
  const head = () => {
    g.beginPath();
    g.moveTo(-7, -3); g.quadraticCurveTo(-2, -8, 5, -5.5); g.lineTo(12, -4.6); g.quadraticCurveTo(15, -3.5, 14, -1);
    g.lineTo(7, 0.2); g.lineTo(13, 2.2); g.quadraticCurveTo(12, 5.2, 6, 4.6); g.quadraticCurveTo(-2, 6.5, -7, 3); g.closePath();
  };
  head(); g.lineWidth = 1; g.strokeStyle = '#5a3a08'; g.stroke();
  g.fillStyle = lgrad(g, 0, -7, 0, 6, [[0, '#fff2a0'], [0.45, gold], [1, goldS]]); g.fill();
  poly(g, [7.2, 0.4, 12.6, 2.0, 11.5, 3.2, 7.4, 1.6], '#b02020');
  for (let i = 0; i < 4; i++) poly(g, [8 + i * 1.3, 0.1, 8.6 + i * 1.3, 0.1, 8.3 + i * 1.3, 1.3], '#fffbe0');
  ellipse(g, 3, -3.2, 1.7, 1.1, -0.2, '#fffbe0'); disc(g, 3.5, -3.2, 0.7, '#d6312a');
  line(g, -1, -5.6, 5.5, -6.2, 0.7, goldS);
  ribbonPath(g, -2, -6, -2.4, 6, 1.6, 0.2, 0.3, 1.0, 5); g.fillStyle = jade; g.fill();
  ribbonPath(g, 1, -6.4, -2.0, 6.5, 1.6, 0.2, 0.3, 2.0, 5); g.fillStyle = jadeS; g.fill();
  g.strokeStyle = '#fffbe0'; g.lineWidth = 0.45;
  g.beginPath(); g.moveTo(13, -2); g.quadraticCurveTo(18, -4 + Math.sin(game.t * 7) * 2, 21, -1); g.stroke();
  g.beginPath(); g.moveTo(12, 2.5); g.quadraticCurveTo(17, 5 + Math.sin(game.t * 7 + 1) * 2, 20, 2); g.stroke();
  g.restore();
}
