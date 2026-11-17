/* ==========================================================================
   Anatomy: the shared fighter rig drawn with real muscle and real kit.
   Loaded after the rig, this file takes over the arms, legs, feet and hands
   and adds muscle, attire and facial hair to the torso and head. Every game
   that uses the rig (Iron Alley, Dagger Raid, Dragon Pagoda) shares it.

   Palette options it reads (all optional):
     muscle     0 to 1.6, how built the body is (default 0.7)
     shirtless  bare torso with chest and abs
     singlet    wrestling singlet straps over a bare torso (colour)
     openVest   sleeveless vest worn open over a bare chest (colour)
     legwear    'pants' (default), 'tights' or 'trunks'
     stripe     side stripe on tights and trunks (colour)
     kneepad    kneepad colour
     tape       wrist tape colour
     lace       boot lace colour
     stubble, stache ('full' or 'goatee'), beard
   ========================================================================== */

const MUSCLE_DEF = 0.7;
const muscleOf = (d) => (d.muscle === undefined ? MUSCLE_DEF : d.muscle);

/** A limb with a muscle belly: bulgeA on the +p side at tA, bulgeB on the -p side at tB, round caps. */
function musclePath(g, ax, ay, bx, by, ra, rb, tA, bulgeA, tB, bulgeB) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 0.0001;
  const ux = dx / L, uy = dy / L, px = -uy, py = ux, th = Math.atan2(uy, ux);
  const side = (t, bulge, s) => {
    const r = ra + (rb - ra) * t + bulge;
    const mx = ax + dx * t + px * r * s, my = ay + dy * t + py * r * s;
    const sx = ax + px * ra * s, sy = ay + py * ra * s, ex = bx + px * rb * s, ey = by + py * rb * s;
    return [2 * mx - (sx + ex) / 2, 2 * my - (sy + ey) / 2, sx, sy, ex, ey];
  };
  const A = side(tA, bulgeA, 1), B = side(tB, bulgeB, -1);
  g.beginPath();
  g.moveTo(A[2], A[3]);
  g.quadraticCurveTo(A[0], A[1], A[4], A[5]);
  g.arc(bx, by, rb, th + Math.PI / 2, th - Math.PI / 2, true);
  g.quadraticCurveTo(B[0], B[1], B[2], B[3]);
  g.arc(ax, ay, ra, th - Math.PI / 2, th - Math.PI * 1.5, true);
  g.closePath();
}
/** Outline, shadow tone, then a lit strip pulled toward the light: the same cel look as the rest of the rig. */
function muscleFill(g, d, ax, ay, bx, by, ra, rb, tA, bA, tB, bB, cS, cL) {
  g.lineJoin = 'round';
  musclePath(g, ax, ay, bx, by, ra, rb, tA, bA, tB, bB);
  g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke();
  g.fillStyle = d.tint ? d.ink : cS; g.fill();
  if (d.tint) return;
  const ox = LX * (ra + rb) * 0.32, oy = LY * (ra + rb) * 0.32;
  musclePath(g, ax + ox, ay + oy, bx + ox, by + oy, ra * 0.64, rb * 0.62, tA, bA * 0.7, tB, bB * 0.7);
  g.fillStyle = cL; g.fill();
}
/** A short curved crease along a limb, used for muscle separations and cloth folds. */
function crease(g, ax, ay, bx, by, t0, t1, off, curve, w, col) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
  const x0 = ax + dx * t0 + px * off, y0 = ay + dy * t0 + py * off;
  const x1 = ax + dx * t1 + px * off, y1 = ay + dy * t1 + py * off;
  const cx = (x0 + x1) / 2 + px * curve, cy = (y0 + y1) / 2 + py * curve;
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1);
  g.lineCap = 'round'; g.lineWidth = w; g.strokeStyle = col; g.stroke();
}

/* ---- hands ---------------------------------------------------------------------------------- */
function drawHandV(g, d, hd, ux, uy, k, fist, skin, skinS) {
  const r = (fist ? 1.42 : 1.25) * k;
  g.save(); g.translate(hd[0], hd[1]); g.rotate(Math.atan2(uy, ux));
  g.lineJoin = 'round'; g.lineCap = 'round';
  const part = (path, fill) => { path(); g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = d.tint ? d.ink : fill; g.fill(); };
  const lit = skin, mid = d.tint ? d.ink : shade(skin, -0.1), cr = d.tint ? d.ink : rgba(shade(skin, -0.55), 0.85);
  if (fist) {
    part(() => roundRectPath(g, -r * 1.05, -r * 0.92, r * 1.5, r * 1.84, r * 0.55), skinS);
    if (!d.tint) { g.fillStyle = lit; roundRectPath(g, -r * 0.9, -r * 0.92, r * 1.25, r * 1.3, r * 0.45); g.fill(); }
    const fh = (r * 1.84) / 4;
    for (let i = 0; i < 4; i++) {
      const y0 = -r * 0.92 + i * fh;
      part(() => roundRectPath(g, r * 0.18, y0 + 0.05 * k, r * 0.84, fh - 0.1 * k, fh * 0.46), i === 0 ? lit : mid);
      if (!d.tint) {
        g.fillStyle = rgba('#ffffff', 0.2); roundRectPath(g, r * 0.32, y0 + 0.14 * k, r * 0.42, fh * 0.34, fh * 0.17); g.fill();
        line(g, r * 0.62, y0 + fh * 0.25, r * 0.62, y0 + fh * 0.75, 0.1 * k, cr);
      }
    }
    part(() => capsulePath(g, -r * 0.5, -r * 0.84, r * 0.66, -r * 0.44, r * 0.34, r * 0.28), lit);
    if (!d.tint) { line(g, r * 0.5, -r * 0.64, r * 0.62, -r * 0.3, 0.13 * k, cr); line(g, -r * 0.7, r * 0.1, -r * 0.2, r * 0.7, 0.12 * k, rgba(shade(skin, -0.35), 0.5)); }
  } else {
    const tips = [[-0.62, -0.18, 1.05], [-0.2, -0.04, 1.3], [0.22, 0.08, 1.25], [0.6, 0.22, 1.0]];
    tips.forEach(([fy, fan, len], i) => {
      part(() => capsulePath(g, r * 0.3, fy * r, r * (0.3 + len), (fy + fan) * r, r * 0.22, r * 0.18), i < 2 ? lit : mid);
      if (!d.tint) line(g, r * (0.3 + len * 0.55), (fy + fan * 0.55) * r - 0.18 * r, r * (0.3 + len * 0.55), (fy + fan * 0.55) * r + 0.18 * r, 0.09 * k, cr);
    });
    part(() => roundRectPath(g, -r * 0.95, -r * 0.85, r * 1.55, r * 1.7, r * 0.5), lit);
    if (!d.tint) line(g, -r * 0.2, -r * 0.2, r * 0.45, r * 0.15, 0.12 * k, cr);
    part(() => capsulePath(g, -r * 0.35, -r * 0.7, r * 0.5, -r * 1.3, r * 0.28, r * 0.21), lit);
  }
  g.restore();
}

/* ---- arms: deltoid, biceps and triceps, forearm, sleeves, tape -------------------------------- */
function drawArmV(g, d, sh, el, hd, k, back, fist) {
  const m = muscleOf(d);
  const glove = !!d.glove;
  const skin = glove ? (back ? d.gloveS : d.glove) : back ? d.skin2 : d.skin;
  const skinS = glove ? shade(d.glove, -0.4) : back ? d.skin2S : d.skinS;
  const fleshL = back ? d.skin2 : d.skin, fleshS = back ? d.skin2S : d.skinS;
  const sleeve = back ? d.top2 : d.top, sleeveS = back ? d.top2S : d.topS;
  const dx = hd[0] - el[0], dy = hd[1] - el[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const wx = hd[0] - ux * 1.05 * k, wy = hd[1] - uy * 1.05 * k;
  const bareArm = d.bare || d.shirtless || d.singlet || d.openVest;
  const sleeveLen = bareArm ? 0 : d.shortSleeve ? 0.6 : 1;
  const crCol = rgba(shade(fleshL, -0.5), 0.6);
  // forearm (skin, or sleeve over the top half)
  muscleFill(g, d, el[0], el[1], wx, wy, 1.12 * k, 0.78 * k, 0.28, (0.28 + 0.3 * m) * k, 0.4, 0.12 * m * k, fleshS, fleshL);
  if (!d.tint && sleeveLen === 0) crease(g, el[0], el[1], wx, wy, 0.15, 0.6, 0.25 * k, 0.35 * k, 0.16 * k, crCol);
  // upper arm: triceps on the +p side, biceps on the -p side
  muscleFill(g, d, sh[0], sh[1], el[0], el[1], 1.55 * k, 1.08 * k, 0.4, (0.15 + 0.3 * m) * k, 0.52, (0.2 + 0.45 * m) * k, fleshS, fleshL);
  if (!d.tint && sleeveLen === 0) {
    crease(g, sh[0], sh[1], el[0], el[1], 0.38, 0.86, -0.2 * k, -0.45 * k * m, 0.17 * k, crCol);       // biceps edge
    crease(g, sh[0], sh[1], el[0], el[1], 0.1, 0.35, 0.6 * k, 0.4 * k, 0.15 * k, crCol);               // deltoid line
    const hx = lerp(sh[0], el[0], 0.5) + LX * 1.1 * k, hy = lerp(sh[1], el[1], 0.5) + LY * 1.1 * k;
    disc(g, hx, hy, 0.38 * k * (0.6 + m * 0.4), rgba('#ffffff', 0.16));                                // shine on the muscle
  }
  // shoulder cap
  g.save();
  g.translate(sh[0], sh[1]); g.rotate(Math.atan2(el[1] - sh[1], el[0] - sh[0]));
  celFill(g, () => { g.beginPath(); g.ellipse(0.4 * k, 0, (1.8 + 0.25 * m) * k, (1.65 + 0.25 * m) * k, 0, 0, TAU); }, 0.4 * k, 0,
    sleeveLen ? sleeveS : fleshS, sleeveLen ? sleeve : fleshL, d, 0.9 * k);
  g.restore();
  // sleeves over the top
  if (sleeveLen) {
    const mx = lerp(el[0], wx, 0.5), my = lerp(el[1], wy, 0.5);
    if (sleeveLen >= 1) {
      muscleFill(g, d, el[0], el[1], mx, my, 1.42 * k, 1.36 * k, 0.4, 0.15 * k, 0.5, 0.1 * k, sleeveS, sleeve);
      if (d.cuff && !d.tint) { g.fillStyle = back ? shade(d.cuff, -0.25) : d.cuff; capsulePath(g, mx - ux * 0.35 * k, my - uy * 0.35 * k, mx, my, 1.38 * k, 1.4 * k); g.fill(); }
    }
    const ex = sleeveLen >= 1 ? el[0] : lerp(sh[0], el[0], 0.62), ey = sleeveLen >= 1 ? el[1] : lerp(sh[1], el[1], 0.62);
    muscleFill(g, d, sh[0], sh[1], ex, ey, 1.85 * k, 1.42 * k, 0.4, (0.1 + 0.15 * m) * k, 0.5, (0.12 + 0.2 * m) * k, sleeveS, sleeve);
    if (!d.tint) {
      crease(g, sh[0], sh[1], el[0], el[1], 0.5, 0.8, -0.3 * k, -0.4 * k, 0.16 * k, rgba(shade(sleeve, -0.45), 0.7));
      crease(g, el[0], el[1], wx, wy, 0.05, 0.35, 0.4 * k, 0.3 * k, 0.15 * k, rgba(shade(sleeve, -0.45), 0.6));
    }
  }
  if (d.bracers && !d.tint) {
    limbs(g, [[lerp(el[0], wx, 0.3), lerp(el[1], wy, 0.3), lerp(el[0], wx, 0.9), lerp(el[1], wy, 0.9), 1.2 * k, 1.05 * k, '#4e535c', back ? '#6b7079' : '#8a909a']], d);
  }
  // wrist tape or wristband
  if (d.tape) {
    const tc = back ? shade(d.tape, -0.2) : d.tape;
    limbs(g, [[lerp(el[0], wx, 0.78), lerp(el[1], wy, 0.78), wx, wy, 0.92 * k, 0.86 * k, shade(tc, -0.25), tc]], d);
    if (!d.tint) for (const t of [0.84, 0.92]) line(g, lerp(el[0], wx, t) - uy * 0.85 * k, lerp(el[1], wy, t) + ux * 0.85 * k, lerp(el[0], wx, t) + uy * 0.85 * k, lerp(el[1], wy, t) - ux * 0.85 * k, 0.1 * k, rgba(shade(tc, -0.4), 0.7));
  }
  drawHandV(g, d, hd, ux, uy, k, fist, skin, skinS);
}

/* ---- legs and feet ------------------------------------------------------------------------- */
function drawFootV(g, d, foot, fx, fy, lift, k, back, kind) {
  g.save();
  g.translate(foot[0], foot[1] - lift); g.rotate(Math.atan2(fy, fx));
  g.lineJoin = 'round'; g.lineCap = 'round';
  const part = (build, cS, cL) => { build(); g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = d.tint ? d.ink : cS; g.fill(); if (!d.tint && cL) { g.save(); g.translate(LX * 0.4 * k, LY * 0.5 * k); g.scale(0.92, 0.82); build(); g.fillStyle = cL; g.fill(); g.restore(); } };
  if (kind === 'bare') {
    const sk = back ? d.skin2 : d.skin, skS = back ? d.skin2S : d.skinS;
    part(() => { g.beginPath(); g.moveTo(-1.1 * k, -0.9 * k); g.quadraticCurveTo(-1.3 * k, 0.15 * k, -0.5 * k, 0.15 * k); g.lineTo(2.5 * k, 0.15 * k);
      g.quadraticCurveTo(3.2 * k, 0.1 * k, 3.0 * k, -0.45 * k); g.quadraticCurveTo(2.0 * k, -1.05 * k, 0.6 * k, -1.45 * k); g.quadraticCurveTo(-0.6 * k, -1.7 * k, -1.1 * k, -0.9 * k); g.closePath(); }, skS, sk);
    if (!d.tint) for (let i = 0; i < 3; i++) line(g, (2.1 + i * 0.32) * k, -0.05 * k, (2.25 + i * 0.32) * k, -0.42 * k, 0.1 * k, rgba(shade(sk, -0.5), 0.7));
    g.restore(); return;
  }
  const boot = kind === 'shoe' ? (back ? shade(d.shoe, -0.15) : d.shoe) : (back ? shade(d.boot, -0.1) : d.boot2);
  const bootS = kind === 'shoe' ? shade(d.shoe, -0.4) : d.boot;
  const high = kind === 'boot';
  // sole first, then the upper with a rounded toe cap and a raised heel
  part(() => roundRectPath(g, -1.45 * k, -0.4 * k, 4.75 * k, 0.75 * k, 0.32 * k), '#121014', null);
  part(() => {
    g.beginPath();
    g.moveTo(-1.4 * k, -0.35 * k);
    g.lineTo(-1.45 * k, high ? -2.6 * k : -1.6 * k);
    g.quadraticCurveTo(-0.2 * k, high ? -2.9 * k : -1.9 * k, 0.9 * k, high ? -2.5 * k : -1.65 * k);
    g.quadraticCurveTo(1.6 * k, -1.35 * k, 2.6 * k, -1.05 * k);
    g.quadraticCurveTo(3.4 * k, -0.85 * k, 3.25 * k, -0.35 * k);
    g.closePath();
  }, bootS, boot);
  if (!d.tint) {
    // toe cap and laces
    line(g, 2.2 * k, -1.15 * k, 2.55 * k, -0.4 * k, 0.12 * k, rgba(shade(boot, -0.45), 0.8));
    const lace = d.lace || shade(boot, 0.45);
    if (kind === 'shoe') line(g, 0.2 * k, -1.55 * k, 1.4 * k, -1.2 * k, 0.28 * k, rgba(shade(boot, -0.45), 0.9));
    else for (let i = 0; i < (high ? 4 : 2); i++) {
      const x = 0.55 * k + i * 0.42 * k, y = (high ? -2.25 : -1.45) * k + i * 0.3 * k;
      line(g, x - 0.35 * k, y - 0.15 * k, x + 0.35 * k, y + 0.15 * k, 0.16 * k, lace);
      line(g, x - 0.35 * k, y + 0.15 * k, x + 0.35 * k, y - 0.15 * k, 0.16 * k, lace);
    }
    line(g, -1.3 * k, -0.42 * k, 3.15 * k, -0.42 * k, 0.12 * k, rgba('#ffffff', 0.22));
  }
  g.restore();
}

function drawLegV(g, d, P, knee, foot, k, back) {
  const m = muscleOf(d);
  const wear = d.legwear || 'pants';
  const cL = back ? (d.pants2 || d.pants) : d.pants, cS = back ? (d.pants2S || d.pantsS) : d.pantsS;
  const fleshL = back ? d.skin2 : d.skin, fleshS = back ? d.skin2S : d.skinS;
  const T = torsoFrame(P);
  const hx = T.hx + T.px * (back ? -0.7 : 0.7) * k, hy = T.hy + T.py * (back ? -0.7 : 0.7) * k;
  const dx = foot[0] - knee[0], dy = foot[1] - knee[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const planted = uy > 0.55;
  let fx, fy;
  if (planted) { fx = 1; fy = 0; } else { fx = -uy; fy = ux; if (fx < 0) { fx = -fx; fy = -fy; } }
  const ax = foot[0] - ux * 1.5 * k, ay = foot[1] - uy * 1.5 * k;     // ankle
  const lift = planted ? 0.4 * k : 0;
  const kind = d.barefoot ? 'bare' : d.boot ? 'boot' : 'shoe';
  const cloth = wear === 'pants';
  // shin and calf: the calf bulges on the back (+p) side, the shin is straighter
  const calfB = (cloth ? 0.18 : 0.3 + 0.35 * m) * k;
  const shinL = wear === 'trunks' || wear === 'tights' ? (wear === 'tights' ? cL : fleshL) : cL;
  const shinS = wear === 'trunks' || wear === 'tights' ? (wear === 'tights' ? cS : fleshS) : cS;
  muscleFill(g, d, knee[0], knee[1], ax, ay, (cloth ? 1.7 : 1.45) * k, (cloth ? 1.35 : 0.95) * k, 0.3, calfB, 0.35, 0.08 * k, shinS, shinL);
  // thigh: quadriceps bulge on the front (-p side)
  const thighL = wear === 'trunks' ? fleshL : cL, thighS = wear === 'trunks' ? fleshS : cS;
  muscleFill(g, d, hx, hy, knee[0], knee[1], 2.25 * k, (cloth ? 1.75 : 1.5) * k, 0.45, (cloth ? 0.1 : 0.2 + 0.2 * m) * k, 0.4, (cloth ? 0.2 : 0.3 + 0.4 * m) * k, thighS, thighL);
  if (!d.tint) {
    if (!cloth) {
      crease(g, hx, hy, knee[0], knee[1], 0.35, 0.85, -0.6 * k, -0.4 * k * m, 0.17 * k, rgba(shade(thighL, -0.5), 0.55));
      crease(g, knee[0], knee[1], ax, ay, 0.12, 0.5, 0.55 * k, 0.35 * k * m, 0.15 * k, rgba(shade(shinL, -0.5), 0.55));
    } else {
      crease(g, hx, hy, knee[0], knee[1], 0.7, 0.95, -0.4 * k, -0.4 * k, 0.16 * k, rgba(shade(cL, -0.5), 0.6));
      crease(g, knee[0], knee[1], ax, ay, 0.0, 0.25, 0.5 * k, 0.4 * k, 0.15 * k, rgba(shade(cL, -0.5), 0.55));
      line(g, lerp(hx, knee[0], 0.55) - 0.6 * k, lerp(hy, knee[1], 0.55), lerp(hx, knee[0], 0.8) - 0.6 * k, lerp(hy, knee[1], 0.8), 1.2 * k, rgba(shade(cL, -0.22), 0.45));
    }
    if (wear === 'tights' && d.stripe) {
      crease(g, hx, hy, knee[0], knee[1], 0.02, 1.0, 1.4 * k, 0.2 * k, 0.42 * k, d.stripe);
      crease(g, knee[0], knee[1], ax, ay, 0.0, 0.6, 1.0 * k, 0.15 * k, 0.38 * k, d.stripe);
    }
  }
  // kneepad
  if (d.kneepad) {
    const kc = back ? shade(d.kneepad, -0.2) : d.kneepad;
    g.save(); g.translate(knee[0], knee[1]); g.rotate(Math.atan2(uy, ux) - Math.PI / 2);
    celFill(g, () => { g.beginPath(); g.ellipse(-0.2 * k, 0, 1.85 * k, 1.5 * k, 0, 0, TAU); }, -0.2 * k, 0, shade(kc, -0.3), kc, d, 0.7 * k);
    if (!d.tint) { line(g, -1.4 * k, -0.7 * k, 1.0 * k, -0.7 * k, 0.14 * k, rgba(shade(kc, -0.5), 0.7)); line(g, -1.4 * k, 0.7 * k, 1.0 * k, 0.7 * k, 0.14 * k, rgba(shade(kc, -0.5), 0.7)); }
    g.restore();
  }
  // boot shaft up the shin for high boots
  if (kind === 'boot') {
    const bx = lerp(knee[0], ax, d.legwear ? 0.35 : 0.5), by = lerp(knee[1], ay, d.legwear ? 0.35 : 0.5);
    const boot = back ? shade(d.boot, -0.1) : d.boot2;
    muscleFill(g, d, bx, by, ax, ay, 1.5 * k, 1.2 * k, 0.4, 0.12 * k, 0.5, 0.05 * k, d.boot, boot);
    if (!d.tint) {
      const lace = d.lace || shade(boot, 0.45);
      for (let t = 0.15; t < 0.95; t += 0.2) {
        const lx = lerp(bx, ax, t) - uy * 0.9 * k, ly = lerp(by, ay, t) + ux * 0.9 * k;
        line(g, lx - ux * 0.25 * k, ly - uy * 0.25 * k + 0, lx + uy * 0.5 * k, ly - ux * 0.5 * k, 0.15 * k, lace);
      }
      line(g, bx - uy * 1.45 * k, by + ux * 1.45 * k, bx + uy * 1.45 * k, by - ux * 1.45 * k, 0.3 * k, rgba(shade(boot, -0.4), 0.9));
    }
  }
  drawFootV(g, d, foot, fx, fy, lift, k, back, kind);
}

/* ---- torso: muscle under the clothes, bare chests, singlets and open vests --------------------- */
const __rigTorsoV = drawTorsoV;
drawTorsoV = function (g, d, P, k) {
  const m = muscleOf(d);
  const T = torsoFrame(P);
  const sx = T.nx - T.ax * 1.0 * k, sy = T.ny - T.ay * 1.0 * k;
  const pt = (f, w) => [lerp(T.hx, sx, f) + T.px * w, lerp(T.hy, sy, f) + T.py * w];
  const Ln = (a, b, w, c) => line(g, a[0], a[1], b[0], b[1], w, c);
  const bareChest = d.shirtless || d.singlet || d.openVest;
  if (!bareChest) {
    __rigTorsoV(g, d, P, k);
    if (d.tint) return;
    // a hint of the build under the cloth: chest line and a shoulder fold
    const fold = rgba(shade(d.top || '#808080', -0.45), 0.5);
    Ln(pt(0.78, -0.4 * k), pt(0.66, (1.6 + 0.6 * m) * k), 0.18 * k, fold);
    if (d.bare) {
      // tank top: show the trapezius and the chest above the neckline
      Ln(pt(0.98, 0.4 * k), pt(0.86, 2.4 * k), 0.16 * k, rgba(d.skinS, 0.9));
      Ln(pt(0.9, -0.8 * k), pt(0.99, -1.8 * k), 0.16 * k, rgba(d.skinS, 0.9));
    }
    return;
  }
  // a bare, V-shaped torso: broad shoulders, narrow waist
  const hw = (2.35 + 0.15 * m) * k, swd = (3.6 + 0.6 * m) * k;
  const mx = (T.hx + sx) / 2, my = (T.hy + sy) / 2;
  const build = () => {
    g.beginPath();
    g.moveTo(T.hx - T.px * hw, T.hy - T.py * hw);
    g.lineTo(T.hx + T.px * hw, T.hy + T.py * hw);
    g.quadraticCurveTo(mx + T.px * swd * 1.05, my + T.py * swd * 1.05, sx + T.px * swd, sy + T.py * swd);
    // round over the shoulder, then the trapezius climbs to the neck
    g.quadraticCurveTo(sx + T.px * swd * 1.02 + T.ax * 1.3 * k, sy + T.py * swd * 1.02 + T.ay * 1.3 * k, sx + T.px * swd * 0.6 + T.ax * 1.25 * k, sy + T.py * swd * 0.6 + T.ay * 1.25 * k);
    g.quadraticCurveTo(T.nx + T.px * 1.6 * k + T.ax * 0.2 * k, T.ny + T.py * 1.6 * k + T.ay * 0.2 * k, T.nx + T.px * 1.1 * k + T.ax * 0.9 * k, T.ny + T.py * 1.1 * k + T.ay * 0.9 * k);
    g.lineTo(T.nx - T.px * 1.1 * k + T.ax * 0.9 * k, T.ny - T.py * 1.1 * k + T.ay * 0.9 * k);
    g.quadraticCurveTo(T.nx - T.px * 1.6 * k + T.ax * 0.2 * k, T.ny - T.py * 1.6 * k + T.ay * 0.2 * k, sx - T.px * swd * 0.6 + T.ax * 1.25 * k, sy - T.py * swd * 0.6 + T.ay * 1.25 * k);
    g.quadraticCurveTo(sx - T.px * swd * 1.02 + T.ax * 1.3 * k, sy - T.py * swd * 1.02 + T.ay * 1.3 * k, sx - T.px * swd, sy - T.py * swd);
    g.quadraticCurveTo(mx - T.px * hw * 1.1, my - T.py * hw * 1.1, T.hx - T.px * hw, T.hy - T.py * hw);
    g.closePath();
  };
  celFill(g, build, mx, my, d.skinS, d.skin, d, 1.7 * k);
  if (d.tint) return;
  const mc = rgba(shade(d.skin, -0.5), 0.62), hl = rgba('#ffffff', 0.15);
  // chest: two pectoral curves with a shadow under them
  for (const s of [-1, 1]) {
    const a = pt(0.86, s * 0.25 * k), b = pt(0.6, s * (1.9 + 0.5 * m) * k), c = pt(0.6, s * 0.2 * k);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]);
    g.lineCap = 'round'; g.lineWidth = 0.22 * k; g.strokeStyle = mc; g.stroke();
  }
  Ln(pt(0.62, -1.4 * k), pt(0.62, 1.5 * k), 0.5 * k, rgba(shade(d.skin, -0.4), 0.22));
  // abdominals: a centre line and three pairs of blocks, obliques at the sides
  Ln(pt(0.55, 0.1 * k), pt(0.1, 0.1 * k), 0.15 * k, mc);
  for (const f of [0.46, 0.32, 0.18]) Ln(pt(f, -1.05 * k), pt(f, 1.25 * k), 0.13 * k, mc);
  for (const f of [0.5, 0.37, 0.24]) { const p = pt(f, 0.65 * k); disc(g, p[0], p[1], 0.32 * k, hl); }
  Ln(pt(0.5, (1.7 + 0.3 * m) * k), pt(0.1, 1.6 * k), 0.15 * k, mc);
  Ln(pt(0.5, -(1.6 + 0.3 * m) * k), pt(0.12, -1.5 * k), 0.15 * k, mc);
  // collarbones and the trapezius slope
  Ln(pt(0.95, -0.2 * k), pt(0.92, -2.2 * k), 0.15 * k, mc);
  Ln(pt(0.95, 0.4 * k), pt(0.92, 2.4 * k), 0.15 * k, mc);
  if (d.chestHair) for (let i = 0; i < 7; i++) { const p = pt(0.66 + (i % 3) * 0.05, (-0.6 + i * 0.22) * k); line(g, p[0], p[1], p[0] + 0.2 * k, p[1] + 0.3 * k, 0.1 * k, rgba(d.hair, 0.5)); }
  if (d.singlet) {
    // singlet: body from the waist to the lower chest, straps over the shoulders
    const c = d.singlet, cS2 = shade(c, -0.3);
    const b2 = () => polyPath(g, [...pt(0.0, -hw), ...pt(0.0, hw), ...pt(0.52, (1.6 + 0.4 * m) * k), ...pt(0.66, 1.0 * k), ...pt(0.66, -1.0 * k), ...pt(0.52, -(1.6 + 0.4 * m) * k)]);
    b2(); g.lineJoin = 'round'; g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = c; g.fill();
    for (const s of [-1, 1]) Ln(pt(0.6, s * 1.2 * k), pt(1.0, s * 1.7 * k), 0.7 * k, c);
    Ln(pt(0.3, -1.8 * k), pt(0.3, 1.8 * k), 0.2 * k, cS2);
  }
  if (d.openVest) {
    // an open, sleeveless vest framing the chest
    const v = d.openVest, vS = shade(v, -0.3);
    for (const s of [-1, 1]) {
      const pa = [...pt(0.02, s * hw), ...pt(1.0, s * swd), ...pt(1.0, s * (swd - 1.4 * k)), ...pt(0.55, s * 1.3 * k), ...pt(0.02, s * 1.0 * k)];
      polyPath(g, pa); g.lineJoin = 'round'; g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = s > 0 ? v : vS; g.fill();
      Ln(pt(0.55, s * 1.3 * k), pt(0.95, s * (swd / k - 1.3) * k), 0.16 * k, rgba(shade(v, 0.35), 0.7));
    }
  }
};

/* ---- heads: stubble, moustaches and beards on top of the rig's head -------------------------- */
const __rigHeadV = drawHeadV;
drawHeadV = function (g, d, hx, hy, nx, ny, tilt, k, expr, ph, seed) {
  if (d.shirtless || d.singlet || d.openVest) {
    // a thick neck for the big men, drawn before the head goes on
    limbs(g, [[nx, ny + 0.6 * k, hx - 0.2 * k, hy + 1.6 * k, (1.35 + 0.2 * muscleOf(d)) * k, 1.2 * k, d.skinS, d.skin]], d);
  }
  __rigHeadV(g, d, hx, hy, nx, ny, tilt, k, expr, ph, seed);
  if (d.tint || !(d.stubble || d.stache || d.beard2)) return;
  const u = k;
  g.save(); g.translate(hx, hy - 0.25 * k); g.rotate(tilt); g.scale(1.14, 1.14);
  const hair = d.facial || d.hair;
  if (d.stubble) { g.fillStyle = rgba(hair, 0.16); g.beginPath(); g.ellipse(1.0 * u, 1.75 * u, 1.45 * u, 0.85 * u, 0.15, 0, TAU); g.fill(); }
  if (d.stache === 'full') {
    g.lineCap = 'round';
    g.strokeStyle = d.ink; g.lineWidth = 0.75 * u + OLW * 2;
    g.beginPath(); g.moveTo(2.4 * u, 0.85 * u); g.quadraticCurveTo(1.7 * u, 0.55 * u, 1.1 * u, 1.05 * u); g.stroke();
    g.strokeStyle = hair; g.lineWidth = 0.75 * u; g.stroke();
  } else if (d.stache === 'goatee') {
    g.fillStyle = d.ink; g.beginPath(); g.ellipse(1.75 * u, 2.15 * u, 0.75 * u, 0.62 * u, 0, 0, TAU); g.fill();
    g.fillStyle = hair; g.beginPath(); g.ellipse(1.75 * u, 2.1 * u, 0.6 * u, 0.48 * u, 0, 0, TAU); g.fill();
    line(g, 2.35 * u, 0.85 * u, 1.3 * u, 1.05 * u, 0.4 * u, hair);
  }
  g.restore();
};

/* ---- waistband: wrestling gear gets a plain band, not a buckled belt ---------------------------- */
const __rigBeltV = drawBeltV;
drawBeltV = function (g, d, P, k) {
  if (!d.legwear || d.legwear === 'pants') { __rigBeltV(g, d, P, k); return; }
  const T = torsoFrame(P);
  const o = 0.35 * k, w = 2.45 * k + 0.15 * muscleOf(d) * k;
  const a = [T.hx - T.px * w + T.ax * o, T.hy - T.py * w + T.ay * o];
  const b = [T.hx + T.px * w + T.ax * o, T.hy + T.py * w + T.ay * o];
  const c = shade(d.pants, -0.25);
  if (d.legwear === 'trunks') {
    // fitted briefs: waist to crotch, with leg openings cut up toward the hips
    const dn = (p, f, s2) => [p[0] - T.ax * f * k + T.px * s2 * k, p[1] - T.ay * f * k + T.py * s2 * k];
    const pts = [...a, ...b, ...dn(b, 2.2, 0.15), ...dn([T.hx, T.hy], 3.0, 0.6), ...dn([T.hx, T.hy], 3.0, -0.6), ...dn(a, 2.2, -0.15)];
    polyPath(g, pts); g.lineJoin = 'round'; g.lineWidth = OLW * 2; g.strokeStyle = d.ink; g.stroke(); g.fillStyle = d.tint ? d.ink : d.pants; g.fill();
    if (!d.tint) {
      polyPath(g, [...a, ...b, ...dn(b, 1.0, 0), ...dn(a, 1.0, 0)]); g.fillStyle = rgba(shade(d.pants, 0.25), 0.35); g.fill();
      if (d.stripe) { const s1 = dn(b, 0.2, 0), s2 = dn(b, 2.0, 0.1); line(g, s1[0], s1[1], s2[0], s2[1], 0.4 * k, d.stripe); }
    }
  }
  limbs(g, [[a[0], a[1], b[0], b[1], 0.55 * k, 0.55 * k, shade(c, -0.2), c]], d);
  if (!d.tint && d.stripe) line(g, a[0], a[1], b[0], b[1], 0.18 * k, d.stripe);
};
