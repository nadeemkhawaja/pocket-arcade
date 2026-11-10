/* ==========================================================================
   Dragons: the gilded statue coiled around the summit column, and the dragon
   that glides across the moon on the title screen
   ========================================================================== */

const DRAGON_INK = '#2a1606';
const smooth01 = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };

/** Line through points with quadratic smoothing at the midpoints. */
function smoothRun(g, P, move) {
  if (move) g.moveTo(P[0][0], P[0][1]); else g.lineTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
  if (P.length > 1) g.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
}

/** Unit tangent and left hand normal for each point of [[x, y, r], ...]. */
function tubeFrames(pts) {
  const n = pts.length, F = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
    F.push([tx, ty, ty, -tx]);
  }
  return F;
}

/** One closed, smooth outline for a tapered tube with rounded ends. */
function tubePath(g, pts) {
  const n = pts.length, F = tubeFrames(pts), Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], nx = F[i][2], ny = F[i][3];
    Lf.push([p[0] + nx * p[2], p[1] + ny * p[2]]); Rt.push([p[0] - nx * p[2], p[1] - ny * p[2]]);
  }
  const ang = (i) => Math.atan2(F[i][3], F[i][2]);
  g.beginPath();
  smoothRun(g, Lf, true);
  const e = pts[n - 1]; g.arc(e[0], e[1], Math.max(0.01, e[2]), ang(n - 1), ang(n - 1) + Math.PI, false);
  smoothRun(g, Rt.reverse(), false);
  const s = pts[0]; g.arc(s[0], s[1], Math.max(0.01, s[2]), ang(0) + Math.PI, ang(0) + TAU, false);
  g.closePath();
}

/** A narrower tube shifted to one side (side +1 is left of travel). */
function tubeBand(pts, side, off, rk) {
  const F = tubeFrames(pts);
  return pts.map((p, i) => [p[0] + F[i][2] * side * off * p[2], p[1] + F[i][3] * side * off * p[2], p[2] * rk]);
}

/** Which side of a tube faces a direction, judged once at its middle so bands never flip. */
function tubeSide(pts, dx, dy) {
  const m = tubeFrames(pts)[Math.floor(pts.length / 2)];
  return m[2] * dx + m[3] * dy >= 0 ? 1 : -1;
}

/** Teardrop flame tuft from a root to a tip: manes, beards, elbow tufts, tail fins. */
function flameTuft(g, x0, y0, x1, y1, w, col, ink) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const mx = x0 + dx * 0.45 + nx * w * 0.5, my = y0 + dy * 0.45 + ny * w * 0.5;
  g.beginPath(); g.moveTo(x0 + nx * w, y0 + ny * w);
  g.quadraticCurveTo(mx + nx * w * 0.8, my + ny * w * 0.8, x1, y1);
  g.quadraticCurveTo(mx - nx * w * 0.6, my - ny * w * 0.6, x0 - nx * w, y0 - ny * w);
  g.closePath();
  if (ink !== col) { g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 0.9; g.stroke(); }
  g.fillStyle = col; g.fill();
}

/** Scaled body: fins, ink outline, gold, pale belly plates, a moonlit sheen and scales. */
function dragonBody(g, pts, lit) {
  const up = tubeSide(pts, -0.35, -0.94);
  const F = tubeFrames(pts);
  g.lineJoin = 'round'; g.lineCap = 'round';
  // dorsal fins first so the body covers their roots
  let acc = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc < 3.4 || pts[i][2] < 1.6) continue;
    acc = 0;
    const [x, y, r] = pts[i], [tx, ty, nx, ny] = F[i];
    const ux = nx * up, uy = ny * up, bx = x + ux * r * 0.72, by = y + uy * r * 0.72, h = 2 + r * 0.42;
    const tri3 = [bx + tx * 1.6, by + ty * 1.6, bx - tx * 1.6, by - ty * 1.6, bx + ux * h - tx * 2.4, by + uy * h - ty * 2.4];
    polyPath(g, tri3); g.strokeStyle = DRAGON_INK; g.lineWidth = 0.9; g.stroke();
    g.fillStyle = lit ? '#c8322a' : '#5a1612'; g.fill();
  }
  tubePath(g, pts); g.strokeStyle = DRAGON_INK; g.lineWidth = 1.1; g.stroke();
  g.fillStyle = lit ? '#c4902e' : '#5e3e12'; g.fill();
  // belly plates on the lower side, with seams across them
  const belly = tubeBand(pts, -up, 0.5, 0.48);
  tubePath(g, belly); g.fillStyle = lit ? '#f0d79a' : '#7a5c2c'; g.fill();
  const FB = tubeFrames(belly);
  g.strokeStyle = lit ? 'rgba(150,100,30,0.8)' : 'rgba(40,24,6,0.6)'; g.lineWidth = 0.35;
  acc = 0;
  for (let i = 1; i < belly.length - 1; i++) {
    acc += Math.hypot(belly[i][0] - belly[i - 1][0], belly[i][1] - belly[i - 1][1]);
    if (acc < 1.8 || belly[i][2] < 0.8) continue;
    acc = 0;
    const [x, y, r] = belly[i], nx = FB[i][2], ny = FB[i][3];
    g.beginPath(); g.moveTo(x + nx * r * 0.95, y + ny * r * 0.95); g.lineTo(x - nx * r * 0.95, y - ny * r * 0.95); g.stroke();
  }
  // sheen along the top
  const hi = tubeBand(pts, up, 0.4, 0.34);
  tubePath(g, hi); g.fillStyle = lit ? 'rgba(255,236,160,0.72)' : 'rgba(190,150,80,0.22)'; g.fill();
  if (!lit) return;
  // overlapping scales
  g.strokeStyle = 'rgba(110,70,14,0.75)'; g.lineWidth = 0.35;
  acc = 0; let alt = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc < 1.7 || pts[i][2] < 1.8) continue;
    acc = 0; alt = 1 - alt;
    const [x, y, r] = pts[i], [tx, ty, nx, ny] = F[i];
    const o = (alt ? 0.18 : -0.12) * up, cx = x + nx * o * r, cy = y + ny * o * r, a = Math.atan2(ty, tx);
    g.beginPath(); g.arc(cx, cy, r * 0.3, a + Math.PI * 0.5, a + Math.PI * 1.5); g.stroke();
  }
}

/** A clawed leg reaching from the body: d is the outward (downward) normal, t points to the head. */
function dragonLeg(g, x, y, r, dx, dy, tx, ty, lit, sc) {
  const k = sc || 1;
  const kx = x + dx * (r + 3 * k) - tx * 1.6 * k, ky = y + dy * (r + 3 * k) - ty * 1.6 * k;
  const fx = kx + tx * 3.4 * k + dx * 1.4 * k, fy = ky + ty * 3.4 * k + dy * 1.4 * k;
  const body = lit ? '#c4902e' : '#5e3e12', claw = lit ? '#f6ead0' : '#8a7a5a';
  flameTuft(g, kx, ky, kx - tx * 4.2 * k + dx * 1.2 * k, ky - ty * 4.2 * k + dy * 1.2 * k, 1.3 * k, lit ? '#c8322a' : '#5a1612', DRAGON_INK);
  stampLine(g, x, y, kx, ky, 4.2 * k, DRAGON_INK); stampLine(g, kx, ky, fx, fy, 3.4 * k, DRAGON_INK);
  stampLine(g, x, y, kx, ky, 2.9 * k, body); stampLine(g, kx, ky, fx, fy, 2.2 * k, body);
  for (const s of [-1, 0, 1]) {
    const cx = fx + (tx * 2.1 + dx * (0.5 + s * 0.9)) * k, cy = fy + (ty * 2.1 + dy * (0.5 + s * 0.9)) * k;
    stampLine(g, fx, fy, cx, cy, 1.3 * k, DRAGON_INK); stampLine(g, fx, fy, cx, cy, 0.6 * k, claw);
  }
}

/** Antler horn rooted at (x, y), sweeping back. */
function dragonHorn(g, x, y, col, ink) {
  const main = [[x, y], [x - 5.5, y - 4.6], [x - 11.5, y - 5.4]];
  for (const [w, c] of [[2.4, ink], [1.3, col]]) {
    g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(main[0][0], main[0][1]); g.quadraticCurveTo(main[1][0], main[1][1], main[2][0], main[2][1]); g.stroke();
    g.beginPath(); g.moveTo(x - 4.6, y - 3.6); g.quadraticCurveTo(x - 5, y - 6.6, x - 6.6, y - 8.6); g.stroke();
  }
}

/** Dragon head in profile facing +x, origin at the back of the skull. sil paints it as one flat shape. */
function dragonHead(g, sil) {
  const ink = sil || DRAGON_INK;
  const col = (c) => sil || c;
  g.lineJoin = 'round'; g.lineCap = 'round';
  // mane streaming back
  const tufts = [[3, -6.5, -8, -6], [1, -4.5, -11, -2], [0, -2, -11, 3], [1, 0.5, -9, 7.5], [3.5, 2.5, -4, 9.5]];
  tufts.forEach(([bx, by, ex, ey], i) => flameTuft(g, bx, by, bx + ex, by + ey, 2.5, col(i % 2 ? '#ff7a3a' : '#c8322a'), ink));
  dragonHorn(g, 4.4, -6.2, col('#bfa77a'), ink);
  // open mouth: dark interior, then the lower jaw, then the tongue
  if (!sil) {
    g.beginPath(); g.moveTo(6.6, 0.8); g.lineTo(20.6, -1.6); g.lineTo(19, 4.2); g.quadraticCurveTo(12, 3.6, 6.6, 0.8); g.closePath();
    g.fillStyle = '#3a080a'; g.fill();
  }
  g.beginPath(); g.moveTo(6.6, 0.9); g.quadraticCurveTo(12, 3.4, 18.8, 3.9); g.quadraticCurveTo(19.8, 4.9, 18.2, 5.8);
  g.quadraticCurveTo(12, 7.2, 6, 6); g.quadraticCurveTo(1.5, 5, -0.6, 2.4); g.closePath();
  g.strokeStyle = ink; g.lineWidth = 1.1; g.stroke(); g.fillStyle = col('#a8741e'); g.fill();
  if (!sil) {
    for (const [x, y] of [[11, 2.4], [14, 3.1], [16.8, 3.5]]) poly(g, [x - 0.7, y + 0.3, x + 0.7, y + 0.4, x + 0.1, y - 1.3], '#fff6e0');
    g.beginPath(); g.moveTo(9, 2); g.quadraticCurveTo(15, 1.6, 19.5, 2.6); g.quadraticCurveTo(22.6, 3.2, 23.4, 1.2);
    g.quadraticCurveTo(22.4, 2.2, 20, 1.6); g.quadraticCurveTo(15, 0.8, 9, 2); g.closePath();
    g.fillStyle = '#d0484a'; g.fill();
  }
  // skull and snout
  g.beginPath(); g.moveTo(-0.6, 2.2); g.quadraticCurveTo(-1.6, -3.6, 2.6, -6.2); g.quadraticCurveTo(6, -8.2, 9.6, -6.9);
  g.quadraticCurveTo(12.6, -5.3, 15.6, -4.7); g.quadraticCurveTo(18.4, -6.8, 20.6, -4.9); g.quadraticCurveTo(21.8, -3.2, 20.6, -1.5);
  g.quadraticCurveTo(14, -0.6, 6.6, 0.8); g.quadraticCurveTo(3, 1.8, -0.6, 2.2); g.closePath();
  g.strokeStyle = ink; g.lineWidth = 1.1; g.stroke();
  g.fillStyle = sil || lgrad(g, 0, -8, 0, 2, [[0, '#ffeaa8'], [0.45, '#dcaa40'], [1, '#93631a']]); g.fill();
  if (!sil) {
    for (const [x, y] of [[10, 0.3], [12.8, -0.1], [15.6, -0.6]]) poly(g, [x - 0.7, y - 0.3, x + 0.7, y - 0.5, x + 0.1, y + 1.3], '#fff6e0');
    poly(g, [17.8, -1.1, 19.2, -1.4, 18.7, 2.1], '#fff6e0');
    // snout ridges and a nostril curl
    g.strokeStyle = 'rgba(120,80,20,0.85)'; g.lineWidth = 0.4;
    for (const x of [13, 14.6, 16.2]) { g.beginPath(); g.moveTo(x, -4.6); g.quadraticCurveTo(x + 0.6, -3.6, x + 0.4, -2.6); g.stroke(); }
    g.strokeStyle = DRAGON_INK; g.lineWidth = 0.6;
    g.beginPath(); g.arc(19.3, -3.6, 0.8, Math.PI * 0.2, Math.PI * 1.6); g.stroke();
    // cheek curl
    g.strokeStyle = 'rgba(120,80,20,0.9)'; g.lineWidth = 0.45;
    g.beginPath(); g.arc(4.4, -1.4, 1.6, -Math.PI * 0.6, Math.PI * 0.9); g.stroke();
    // eye under a heavy brow
    g.save(); g.translate(9.8, -4.5); g.rotate(-0.22);
    ellipse(g, 0, 0, 2.3, 1.25, 0, DRAGON_INK); ellipse(g, 0, 0, 1.85, 0.9, 0, '#ffd23a');
    ellipse(g, 0.3, 0, 0.4, 0.88, 0, '#120806'); disc(g, -0.6, -0.35, 0.32, '#ffffff');
    g.restore();
    stampLine(g, 6.6, -6.8, 12.6, -5.9, 1.1, DRAGON_INK);
  }
  dragonHorn(g, 6, -6, col('#f2e4c0'), ink);
  // whiskers trailing back from the lip
  for (const [w, c] of [[1.05, ink], [0.55, col('#ffe08a')]]) {
    g.strokeStyle = c; g.lineWidth = w;
    g.beginPath(); g.moveTo(19.8, -2.4); g.bezierCurveTo(16.5, 3, 10, 1.4, 4.5, 7); g.quadraticCurveTo(1, 10.5, -4, 11); g.stroke();
    g.beginPath(); g.moveTo(19.2, -4.8); g.bezierCurveTo(17, -11, 9.5, -12.5, 3.4, -10.6); g.quadraticCurveTo(-0.6, -9.4, -3.6, -11.6); g.stroke();
  }
  // beard
  flameTuft(g, 11.4, 6.2, 8.4, 11.6, 1.6, col('#c8322a'), ink);
  flameTuft(g, 14.4, 5.8, 12.8, 10.4, 1.3, col('#ff7a3a'), ink);
}

/** The flaming pearl the dragon chases. */
function dragonPearl(g, x, y, s) {
  drawGlow(g, x, y, 15 * s, '#ffb04a', 0.85);
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.7;
    flameTuft(g, x + Math.cos(a) * 2 * s, y + Math.sin(a) * 2 * s, x + Math.cos(a) * 6.2 * s, y + Math.sin(a) * 6.2 * s - 1.5 * s, 1.1 * s, i % 2 ? '#ffb43a' : '#ff6a2a', 'rgba(0,0,0,0)');
  }
  g.fillStyle = rgrad(g, x - 1 * s, y - 1 * s, 0.2, 3.6 * s, [[0, '#fffdf0'], [0.45, '#ffe3a0'], [1, '#d07a20']]);
  g.beginPath(); g.arc(x, y, 3.2 * s, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(90,40,6,0.8)'; g.lineWidth = 0.5; g.stroke();
}

/**
 * The summit's ceremonial column with a gilded dragon coiled around it, painted into the level
 * layer. Returns the pearl position so the floor can give it a live glow.
 */
function paintDragonColumn(g, dx, face) {
  g.save(); g.translate(dx, 0); g.scale(face, 1);
  const y0 = 168, y1 = 82, R = 15, turns = 2.25, th0 = -Math.PI / 6, N = 210;
  const P = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, th = th0 + t * turns * TAU;
    P.push([Math.sin(th) * R, lerp(y0, y1, t) + Math.cos(th) * 3, 0.8 + 4.9 * smooth01(t / 0.36) - 0.5 * t, Math.cos(th)]);
  }
  // the neck rises from the last coil and turns the head toward the stairs
  const E = P[N], C = [E[0] + 9, E[1] - 5], H = [E[0] + 8.5, E[1] - 22];
  for (let i = 1; i <= 14; i++) {
    const u = i / 14, v = 1 - u;
    P.push([v * v * E[0] + 2 * v * u * C[0] + u * u * H[0], v * v * E[1] + 2 * v * u * C[1] + u * u * H[1], lerp(E[2], 4.1, u), 1]);
  }
  const runs = [];
  let cur = [P[0]], front = P[0][3] >= 0;
  for (let i = 1; i < P.length; i++) {
    const f = P[i][3] >= 0;
    cur.push(P[i]);
    if (f !== front) { runs.push({ front, pts: cur }); cur = [P[i]]; front = f; }
  }
  runs.push({ front, pts: cur });
  // coils passing behind the column
  for (const run of runs) if (!run.front) dragonBody(g, run.pts, false);
  // stone plinth, lacquered shaft, gilded bands and the capital
  g.fillStyle = lgrad(g, -15, 0, 15, 0, [[0, '#2e2836'], [0.32, '#8e869a'], [0.55, '#6c6478'], [1, '#221c2a']]);
  roundRectPath(g, -15, 174, 30, 10.5, 1.4); g.fill();
  rect(g, -16, 172.5, 32, 2.5, '#a49cb2'); rect(g, -15, 175, 30, 0.8, 'rgba(0,0,0,0.35)');
  g.fillStyle = lgrad(g, -9, 0, 9, 0, [[0, '#2e0806'], [0.26, '#b8402e'], [0.42, '#e2684e'], [0.7, '#86261e'], [1, '#240606']]);
  g.fillRect(-9, 48, 18, 125);
  const gold = lgrad(g, -10, 0, 10, 0, [[0, '#4a2e0c'], [0.32, '#ffe28e'], [0.6, '#c3902e'], [1, '#3a240a']]);
  for (const by of [50, 165]) { g.fillStyle = gold; g.fillRect(-9.8, by, 19.6, 3.2); rect(g, -9.8, by + 3.2, 19.6, 0.6, 'rgba(0,0,0,0.4)'); }
  g.fillStyle = gold; g.fillRect(-10.8, 42, 21.6, 7);
  ellipse(g, 0, 42, 13.8, 2.9, 0, '#b8862a'); ellipse(g, 0, 41.4, 12.8, 2.1, 0, '#ffe08a');
  dragonPearl(g, 0, 35, 0.9);
  // coils in front, with the legs gripping the column
  const FP = tubeFrames(P);
  for (const tt of [0.44, 0.885]) {
    const i = Math.round(tt * N), [x, y, r] = P[i], [tx, ty, nx, ny] = FP[i];
    const s = ny > 0 ? 1 : -1;
    dragonLeg(g, x, y, r, nx * s, ny * s, tx, ty, true);
  }
  for (const run of runs) if (run.front) dragonBody(g, run.pts, true);
  // head and the pearl it chases
  g.save(); g.translate(H[0] - 0.5, H[1] + 0.5); g.rotate(0.12); g.scale(1.06, 1.06);
  dragonHead(g, null);
  dragonPearl(g, 28.5, 1.8, 1);
  g.restore();
  g.restore();
  const c = Math.cos(0.12) * 1.06, sn = Math.sin(0.12) * 1.06;
  return { x: dx + face * (H[0] - 0.5 + 28.5 * c - 1.8 * sn), y: H[1] + 0.5 + 28.5 * sn + 1.8 * c };
}

/** A dark dragon silhouette gliding across the title sky, flying toward -x. */
function drawSkyDragon(g, hx, hy, t) {
  const col = '#120a20', pts = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    pts.push([hx + 4 + i * 3.3, hy + 2 + Math.sin(t * 2.6 - i * 0.26) * 7 * Math.min(1, 0.25 + u * 2),
      i < 6 ? 2.6 + i * 0.32 : 4.5 * Math.pow(1 - u, 0.9) + 0.35]);
  }
  const F = tubeFrames(pts);
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const i of [8, 26]) {
    const [x, y, r] = pts[i], [tx, ty, nx, ny] = F[i];
    const s = ny > 0 ? 1 : -1, ax = nx * s, ay = ny * s;
    const kx = x + ax * (r + 2.6) + tx * 1.5, ky = y + ay * (r + 2.6) + ty * 1.5;
    const fx = kx - tx * 2.8 + ax * 1.6, fy = ky - ty * 2.8 + ay * 1.6;
    stampLine(g, x, y, kx, ky, 2.6, col); stampLine(g, kx, ky, fx, fy, 1.8, col);
    for (const k of [-1, 0, 1]) stampLine(g, fx, fy, fx - tx * 1.9 + ax * (0.5 + k * 0.8), fy - ty * 1.9 + ay * (0.5 + k * 0.8), 0.6, col);
  }
  for (let i = 3; i < 38; i += 2) {
    const [x, y, r] = pts[i], [tx, ty, nx, ny] = F[i];
    const s = ny < 0 ? 1 : -1, ux = nx * s, uy = ny * s, bx = x + ux * r * 0.7, by = y + uy * r * 0.7, h = 1.6 + r * 0.45;
    poly(g, [bx - tx * 1.4, by - ty * 1.4, bx + tx * 1.4, by + ty * 1.4, bx + ux * h + tx * 2.2, by + uy * h + ty * 2.2], col);
  }
  tubePath(g, pts); g.fillStyle = col; g.fill();
  g.strokeStyle = 'rgba(140,120,200,0.22)'; g.lineWidth = 0.7; g.stroke();
  const e = pts[40], fe = F[40];
  flameTuft(g, e[0], e[1], e[0] + fe[0] * 9, e[1] + fe[1] * 9 - 3, 2.2, col, col);
  g.save(); g.translate(hx + 5, pts[0][1] - 1); g.scale(-0.82, 0.82); g.rotate(0.05);
  dragonHead(g, col);
  g.restore();
}
