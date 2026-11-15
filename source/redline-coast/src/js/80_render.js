/* ==========================================================================
   Rendering the race: sky, far scenery, the road in perspective, everything
   standing on it, the player's car, effects and the HUD.
   ========================================================================== */

const view = { scale: 2, ox: 0, oy: 0, zoom: 1, dy: 0 };
const C = { ink: '#ffffff', dim: '#9aa3bd', red: '#ff3d5a', gold: '#ffd27a', cyan: '#7fe9ff', green: '#7dffa0', pink: '#ff7ad0', shadow: 'rgba(0,0,0,0.7)' };
const YS = 100;                    // how far below the horizon the car's wheels sit

function hitArea(x0, y0, x1, y1, data) { game.hits.push(Object.assign({ x0, y0, x1, y1 }, data)); }
function T(g, s, x, y, col, o) { return drawText(g, s, x, y, col || C.ink, Object.assign({ shadow: C.shadow }, o || {})); }
function blink(rate) { return Math.floor(game.t * (rate || 2)) % 2 === 0; }
function viewH() { return H * view.zoom; }
function kmh(v) { return Math.round((v / MAX_SPEED) * 280); }

function spriteCanvas(name) {
  const c = ART_CACHE['n|' + name];
  if (c) return c;
  const p = name.split(':');
  let out;
  if (p[0] === 'gantry') out = gantryArt(p[1]);
  else if (p[0] === 'arch') out = archArt(p[1]);
  else if (p[0] === 'board') out = boardArt(+p[1], p[2] === 'n');
  else out = sprite(name);
  ART_CACHE['n|' + name] = out;
  return out;
}

/* ---- sky ------------------------------------------------------------------------ */
const STARS = (() => { const r = seeded(5), a = []; for (let i = 0; i < 90; i++) a.push([r() * W, r(), 0.3 + r() * 0.7, r() * 6]); return a; })();
function drawSky(g, th, hy, vh) {
  const s = th.sky;
  g.fillStyle = lgrad(g, 0, 0, 0, hy + 4, [[0, s[0]], [0.45, s[1]], [0.82, s[2]], [1, s[3]]]);
  g.fillRect(0, 0, W, hy + 6);
  const sx = ((game.skyFar * 30) % W + W) % W;
  if (th.stars) for (const st of STARS) { const x = ((st[0] - game.skyFar * 20) % W + W) % W; g.globalAlpha = st[2] * (0.6 + 0.4 * Math.sin(game.t * 2 + st[3])); rect(g, x, st[1] * (hy - 30), 0.9, 0.9, '#ffffff'); }
  g.globalAlpha = 1;
  if (th.aurora) {
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      const y0 = hy * (0.22 + k * 0.12);
      g.moveTo(0, y0);
      for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.02 + game.t * 0.35 + k * 2 + game.skyFar) * 9 + Math.sin(x * 0.05 - game.t * 0.2) * 4);
      for (let x = W; x >= 0; x -= 16) g.lineTo(x, y0 + 26 + Math.sin(x * 0.03 + game.t * 0.3 + k) * 8);
      g.closePath();
      g.fillStyle = lgrad(g, 0, y0 - 10, 0, y0 + 36, [[0, 'rgba(90,240,192,0)'], [0.4, k === 1 ? 'rgba(120,160,255,0.32)' : 'rgba(90,240,192,0.34)'], [1, 'rgba(90,240,192,0)']]);
      g.fill();
    }
  }
  if (th.sun) {
    const x = ((th.sun[0] * W - sx + W * 1.5) % (W * 1.6)) - W * 0.3, y = hy * th.sun[1], r = th.sun[2];
    drawGlow(g, x, y, r * 4.2, th.sun[4], 0.9);
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    g.fillStyle = lgrad(g, 0, y - r, 0, y + r, [[0, th.sun[3]], [1, th.sun[4]]]); g.fillRect(x - r, y - r, r * 2, r * 2);
    if (th.id === 'coast') for (let i = 0; i < 5; i++) rect(g, x - r, y + r * 0.15 + i * r * 0.19, r * 2, 0.9 + i * 0.5, s[2]);
    g.restore();
  }
  if (th.moon) {
    const x = ((th.moon[0] * W - sx + W * 1.5) % (W * 1.6)) - W * 0.3, y = hy * th.moon[1], r = th.moon[2];
    drawGlow(g, x, y, r * 3.4, '#bfd8ff', 0.6); disc(g, x, y, r, '#f2f6ff'); disc(g, x - r * 0.3, y - r * 0.2, r * 0.2, '#d4dcf0'); disc(g, x + r * 0.25, y + r * 0.3, r * 0.14, '#d4dcf0');
  }
  // clouds, then two ridges of far scenery; each slides at its own rate as the road turns
  const strip = (c, off, y, h, a) => {
    const w = 512 * (h / c.uh), x0 = -(((off % w) + w) % w);
    g.globalAlpha = a;
    for (let x = x0; x < W; x += w) g.drawImage(c, x, y, w + 0.5, h);
    g.globalAlpha = 1;
  };
  strip(cloudArt(th), game.skyFar * 50 + game.t * 1.2, hy * 0.18, 70, th.night ? 0.7 : 0.85);
  strip(horizonArt(th, 0), game.skyFar * 90, hy - 62, 66, 1);
  strip(horizonArt(th, 1), game.sky * 150, hy - 46, 52, 1);
}

/* ---- the road --------------------------------------------------------------------- */
const PJ = [];
for (let i = 0; i <= DRAW_N; i++) PJ.push({ X1: 0, Y1: 0, W1: 0, s1: 0, X2: 0, Y2: 0, W2: 0, s2: 0, clip: 0, seg: null, vis: false });

function quad(g, x1, y1, x2, y2, x3, y3, x4, y4, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4); g.closePath(); g.fill(); }

function drawRoad(g, hy, vh) {
  const gm = game, T2 = gm.T, th = T2.th, p = gm.p;
  const pos = gm.pos, base = segAt(T2, pos), bp = (pos % SEG) / SEG;
  const camY = roadY(T2, pos + PLAYER_Z) + CAM_H, camX = p.x * ROAD_W;
  const depth = CAM_D * (1 - 0.1 * gm.fov);
  let x = 0, dx = -(base.curve * bp), maxy = vh, count = 0;
  // ground under everything, in the fog colour, so no gap can show at the horizon
  rect(g, 0, hy, W, vh - hy, th.fog);
  for (let n = 0; n < DRAW_N; n++) {
    const seg = T2.segs[base.i + n], P = PJ[n];
    P.vis = false; P.seg = seg || null;
    if (!seg) { count = n; break; }
    count = n + 1;
    const z1 = seg.i * SEG - pos, z2 = z1 + SEG;
    const s1 = depth / Math.max(1, z1), s2 = depth / z2;
    P.s1 = s1; P.s2 = s2;
    P.X1 = W / 2 + s1 * (-camX - x) * (W / 2); P.Y1 = hy - s1 * (seg.y1 - camY) * YS / 1; P.W1 = s1 * ROAD_W * (W / 2);
    P.X2 = W / 2 + s2 * (-camX - x - dx) * (W / 2); P.Y2 = hy - s2 * (seg.y2 - camY) * YS; P.W2 = s2 * ROAD_W * (W / 2);
    x += dx; dx += seg.curve;
    P.clip = maxy;
    if (z1 <= depth || P.Y2 >= P.Y1 || P.Y2 >= maxy) continue;
    P.vis = true;
    const yb = Math.min(P.Y1, vh), y1 = yb + 0.6, y2 = P.Y2, c = seg.c;
    const snow = seg.i > T2.snowFrom && th.gl2;
    const gl = snow ? th.gl2 : th.gl, gr = snow ? th.gl2 : th.gr;
    // verges
    g.fillStyle = gr[c]; g.fillRect(0, y2 - 0.3, W, yb - y2 + 0.3);
    if (th.left === 'sea') {
      quad(g, 0, yb, P.X1 - P.W1 * 1.5, yb, P.X2 - P.W2 * 1.5, y2 - 0.3, 0, y2 - 0.3, gl[c]);
      quad(g, P.X1 - P.W1 * 1.5, yb, P.X1 - P.W1, yb, P.X2 - P.W2, y2 - 0.3, P.X2 - P.W2 * 1.5, y2 - 0.3, c ? th.sand : shade(th.sand, -0.05));
      if (c && n < 150 && (seg.i * 7) % 5 < 2) { const fx = P.X1 - P.W1 * (1.7 + ((seg.i * 13) % 9) * 0.35); rect(g, fx - P.W1 * 0.12, y2, P.W1 * 0.24, Math.max(0.4, (y1 - y2) * 0.35), 'rgba(255,255,255,0.5)'); }
    } else if (gl !== gr) quad(g, 0, yb, P.X1, yb, P.X2, y2 - 0.3, 0, y2 - 0.3, gl[c]);
    // rumble strips, tarmac, lines
    const r1 = P.W1 / 9, r2 = P.W2 / 9, l1 = P.W1 / 70, l2 = P.W2 / 70;
    quad(g, P.X1 - P.W1 - r1, y1, P.X1 + P.W1 + r1, y1, P.X2 + P.W2 + r2, y2, P.X2 - P.W2 - r2, y2, th.rumble[c]);
    quad(g, P.X1 - P.W1, y1, P.X1 + P.W1, y1, P.X2 + P.W2, y2, P.X2 - P.W2, y2, th.road[c]);
    quad(g, P.X1 - P.W1 + l1, y1, P.X1 - P.W1 + l1 * 3, y1, P.X2 - P.W2 + l2 * 3, y2, P.X2 - P.W2 + l2, y2, th.lane);
    quad(g, P.X1 + P.W1 - l1 * 3, y1, P.X1 + P.W1 - l1, y1, P.X2 + P.W2 - l2, y2, P.X2 + P.W2 - l2 * 3, y2, th.lane);
    if (c) for (const lx of [-1 / 3, 1 / 3]) quad(g, P.X1 + P.W1 * lx - l1, y1, P.X1 + P.W1 * lx + l1, y1, P.X2 + P.W2 * lx + l2, y2, P.X2 + P.W2 * lx - l2, y2, th.lane);
    if (seg.i === T2.goal || seg.i === T2.start || seg.i === T2.check) {
      // painted line across the road
      const cols = seg.i === T2.check ? ['#ffb020', '#ffb020'] : ['#ffffff', '#16161c'];
      for (let k = 0; k < 12; k++) quad(g, P.X1 - P.W1 + (P.W1 / 6) * k, y1, P.X1 - P.W1 + (P.W1 / 6) * (k + 1), y1, P.X2 - P.W2 + (P.W2 / 6) * (k + 1), y2, P.X2 - P.W2 + (P.W2 / 6) * k, y2, cols[k % 2]);
    }
    // distance haze
    const f = th.fogK * Math.pow(n / DRAW_N, 2.2);
    if (f > 0.02) { g.globalAlpha = Math.min(1, f); g.fillStyle = th.fog; g.fillRect(0, y2, W, yb - y2); g.globalAlpha = 1; }
    maxy = y2;
  }
  return count;
}

/** One upright thing standing on the road: scaled, placed, and cut off where a hill hides it. */
function drawBillboard(g, c, X, Y, w, clip, flip, alpha) {
  const h = w * (c.uh / c.uw), top = Y - h;
  if (top >= clip || X + w / 2 < -20 || X - w / 2 > W + 20 || w < 0.6) return;
  const vis = Math.min(h, clip - top);
  if (vis <= 0) return;
  if (alpha !== undefined) g.globalAlpha = alpha;
  if (flip) { g.save(); g.translate(X, 0); g.scale(-1, 1); g.drawImage(c, 0, 0, c.width, c.height * (vis / h), -w / 2, top, w, vis); g.restore(); }
  else g.drawImage(c, 0, 0, c.width, c.height * (vis / h), X - w / 2, top, w, vis);
  if (alpha !== undefined) g.globalAlpha = 1;
}

function drawRoadThings(g, count, hy, vh) {
  const gm = game, T2 = gm.T, th = T2.th, p = gm.p, half = W / 2;
  for (let n = count - 1; n > 0; n--) {
    const P = PJ[n], seg = P.seg;
    if (!seg) continue;
    const fade = n > DRAW_N - 30 ? (DRAW_N - n) / 30 : 1;
    for (const s of seg.sprites) {
      if (s.gone) continue;
      const c = spriteCanvas(s.name), w = s.ww * P.s1 * half, X = P.X1 + P.s1 * s.off * ROAD_W * half;
      if (s.flat) { if (P.vis) { const h = w * (c.uh / c.uw); g.globalAlpha = fade; g.drawImage(c, X - w / 2, P.Y1 - h * 0.75, w, h); g.globalAlpha = 1; } continue; }
      if (s.pick) { const bob = Math.sin(gm.t * 5 + seg.i) * w * 0.06; drawBillboard(g, c, X, P.Y1 - w * 0.25 + bob, w, P.clip, false, fade); continue; }
      drawBillboard(g, c, X, P.Y1, w, s.over ? vh : P.clip, s.flip, fade < 1 ? fade : undefined);
    }
    for (const car of seg.cars) {
      const t = (car.z % SEG) / SEG, sc = P.s1 + (P.s2 - P.s1) * t;
      const X = P.X1 + (P.X2 - P.X1) * t + sc * car.off * ROAD_W * half, Y = P.Y1 + (P.Y2 - P.Y1) * t;
      const isRival = car === gm.rival;
      const rel = (X - half) / half;
      const lean = isRival ? clamp(Math.round(car.lean + rel * 1.2), -2, 2) : clamp(Math.round(rel * 1.6 + seg.curve * 0.12), -1, 1);
      const c = carArt(car.style, car.col, lean, th.night ? 'n' : '', isRival ? '#ffffff' : null);
      const w = (CAR_STYLES[car.style].bw + 30) * 7.0 * sc * half;
      if (Y < P.clip + 2) { g.globalAlpha = 0.4 * fade; g.drawImage(shadowSprite(), X - w * 0.42, Y - w * 0.07, w * 0.84, w * 0.16); g.globalAlpha = 1; }
      drawBillboard(g, c, X, Y + w * 0.02, w, P.clip, false, fade < 1 ? fade : undefined);
      if (isRival && n > 6 && Y < P.clip) {
        const ty = Y - w * 0.62 - 8;
        g.globalAlpha = fade; T(g, car.name, X, ty, '#ff8a8a', { align: 'center', weight: 700, scale: 0.8 }); poly(g, [X - 2.4, ty + 8, X + 2.4, ty + 8, X, ty + 11], '#ff5a5a'); g.globalAlpha = 1;
      }
    }
  }
}

/* ---- the player's car --------------------------------------------------------------- */
function drawPlayer(g, hy) {
  const gm = game, p = gm.p, sp = p.speed / MAX_SPEED;
  const x = W / 2, y = hy + YS + 1;
  const bounce = (p.off ? Math.sin(gm.t * 50) * 1.4 * Math.min(1, sp * 3) : Math.sin(gm.t * 34) * 0.35 * sp) + (p.bumpT > 0 ? -2 * p.bumpT : 0);
  const th = gm.T.th;
  let lean = clamp(Math.round(p.lean * 2) / 2, -2, 2);
  if (p.spin > 0) lean = clamp(Math.round(Math.sin(p.spin * 14) * 2), -2, 2);
  const c = carArt(p.car.style, p.car.col, lean, p.brake && sp > 0.02 ? 'b' : th.night ? 'n' : '', p.car.stripe);
  const w = c.uw * 0.9, h = c.uh * 0.9;
  g.globalAlpha = 0.5; g.drawImage(shadowSprite(), x - 38, y - 7, 76, 13); g.globalAlpha = 1;
  if (th.night && settings.fx) { g.save(); g.translate(x, y - 34); g.scale(1, 0.34); drawGlow(g, 0, 0, 86, '#fff2c0', 0.3); g.restore(); }
  g.save();
  g.translate(x, y + bounce);
  if (p.drift) g.rotate(p.driftDir * 0.07); else if (p.spin > 0) g.rotate(Math.sin(p.spin * 14) * 0.2);
  if (p.safe > 0 && p.crashT <= 0 && Math.floor(gm.t * 20) % 2) g.globalAlpha = 0.55;
  g.drawImage(c, -w / 2, -h + 14 * 0.9 + 2, w, h);
  g.globalAlpha = 1;
  // exhaust flames
  if (p.nitroOn || p.boostT > 0) {
    const S = CAR_STYLES[p.car.style], k = p.nitroOn ? 1 : 0.6;
    for (const sx of [-1, 1]) {
      const fx = sx * S.bw * 0.21 * 0.9, len = (10 + Math.random() * 8) * k;
      g.fillStyle = lgrad(g, 0, -3, 0, len, [[0, '#ffffff'], [0.3, '#9ff0ff'], [0.75, 'rgba(60,150,255,0.7)'], [1, 'rgba(60,150,255,0)']]);
      g.beginPath(); g.moveTo(fx - 3, -4); g.quadraticCurveTo(fx, len * 1.6, fx + 3, -4); g.fill();
      drawGlow(g, fx, 0, 16 * k, '#39b8ff', 0.8);
    }
  }
  g.restore();
}

function drawFx(g, hy) {
  const gm = game, x0 = W / 2, y0 = hy + YS + 1;
  for (const f of gm.fx) {
    const t = f.t / f.life;
    if (f.k === 'puff') { const r = f.r * (1.4 + t * 3); g.globalAlpha = f.a * (1 - t); g.drawImage(puffSprite(f.col), x0 + f.x - r, y0 + f.y - r, r * 2, r * 2); }
    else if (f.k === 'spark') { g.globalAlpha = 1 - t; stampLine(g, x0 + f.x, y0 + f.y, x0 + f.x - f.vx * 0.03, y0 + f.y - f.vy * 0.03, 1.1, f.col); }
    else { g.globalAlpha = 1 - t * t; g.save(); g.translate(x0 + f.x, y0 + f.y); g.rotate(f.rot + f.t * 9); rect(g, -f.r, -f.r * 0.6, f.r * 2, f.r * 1.2, f.col); g.restore(); }
  }
  g.globalAlpha = 1;
}

const PUFFS = {};
function puffSprite(col) {
  let c = PUFFS[col];
  if (c) return c;
  c = makeCanvas(48, 48);
  const g = c.getContext('2d');
  g.fillStyle = rgrad(g, 24, 24, 0, 24, [[0, rgba(col, 0.9)], [0.5, rgba(col, 0.5)], [1, rgba(col, 0)]]); g.fillRect(0, 0, 48, 48);
  PUFFS[col] = c;
  return c;
}

/** Streaks that sell the speed: nitro, drift boost and slipstream. */
function drawSpeedLines(g, hy, vh) {
  const gm = game, p = gm.p, sp = p.speed / MAX_SPEED;
  const k = p.nitroOn ? 1 : p.boostT > 0 ? 0.7 : p.slipOn ? 0.5 : sp > 1.02 ? 0.3 : 0;
  if (k <= 0 || !settings.fx) return;
  const cx = W / 2, cy = hy + 6, col = p.nitroOn ? '#9ff0ff' : p.slipOn ? '#ffffff' : '#ffe9a0';
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = ((i * 137.5 + Math.floor(gm.t * 30) * 53) % 360) * (Math.PI / 180), ph = (gm.t * 3.2 + i * 0.37) % 1;
    const r0 = 60 + ph * 200, r1 = r0 + 30 + ph * 70;
    const ax = Math.cos(a), ay = Math.sin(a) * 0.62;
    g.globalAlpha = k * 0.3 * ph; g.strokeStyle = col; g.lineWidth = 0.5 + ph * 1.2;
    g.beginPath(); g.moveTo(cx + ax * r0, cy + ay * r0); g.lineTo(cx + ax * r1, cy + ay * r1); g.stroke();
  }
  g.restore();
}

/** Rain over the harbour, snow on the pass and the ridge. Drawn over the scene, under the HUD. */
function drawWeather(g, vh) {
  const gm = game, th = gm.T.th, sp = gm.p.speed / MAX_SPEED;
  if (!settings.fx) return;
  if (th.id === 'neon') {
    g.strokeStyle = 'rgba(190,210,255,0.3)'; g.lineWidth = 0.5; g.beginPath();
    for (let i = 0; i < 70; i++) {
      const x = (i * 97.3 + gm.t * 60) % (W + 40) - 20, y = (i * 53.7 + gm.t * (520 + (i % 5) * 60)) % (vh + 30) - 15, dx = (x - W / 2) * 0.04 * sp - 2;
      g.moveTo(x, y); g.lineTo(x + dx, y + 9 + sp * 6);
    }
    g.stroke();
  } else if (th.snow && (th.id === 'aurora' || gm.pos / SEG > gm.T.snowFrom)) {
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 60; i++) {
      const ph = (gm.t * (0.25 + (i % 7) * 0.05) * (1 + sp * 2.2) + i * 0.137) % 1;
      const a = i * 2.399, r = 14 + ph * ph * 260;
      const x = W / 2 + Math.cos(a) * r * 1.2 + Math.sin(gm.t * 2 + i) * 3, y = vh * 0.5 + Math.sin(a) * r * 0.75 + ph * 30;
      if (x < 0 || x > W || y < 0 || y > vh) continue;
      const s2 = 0.5 + ph * 1.5; g.fillRect(x, y, s2, s2);
    }
  }
}

/** The whole race picture, drawn to the full height of the screen area (taller on an upright phone). */
function drawRace(g) {
  const gm = game, vh = viewH(), hy = Math.round(vh - YS - 18), p = gm.p, th = gm.T.th;
  const sp = p.speed / MAX_SPEED;
  gm.fov = approach(gm.fov || 0, p.nitroOn ? 1 : p.boostT > 0 ? 0.5 : 0, 0.05);
  g.save();
  g.beginPath(); g.rect(0, 0, W, vh); g.clip();
  // camera: shake, a slight roll into corners, and a punch on big moments
  let sx = 0, sy = 0;
  if (settings.shake && gm.shake > 0.3 && gm.state !== 'pause') { sx = rand(-1, 1) * gm.shake * 0.5; sy = rand(-1, 1) * gm.shake * 0.4; }
  const roll = settings.shake ? -p.steer * 0.014 * Math.min(1, sp * 1.4) - (p.drift ? p.driftDir * 0.012 : 0) : 0;
  const z = 1 + (settings.shake ? gm.punch : 0) + Math.abs(roll) * 2.2;
  g.translate(W / 2 + sx, hy + YS + sy); g.rotate(roll); g.scale(z, z); g.translate(-W / 2, -(hy + YS));
  drawSky(g, th, hy, vh);
  const n = drawRoad(g, hy, vh);
  drawRoadThings(g, n, hy, vh);
  drawPlayer(g, hy);
  drawFx(g, hy);
  drawSpeedLines(g, hy, vh);
  g.restore();
  drawWeather(g, vh);
  // lens: darker corners at night, a warm wash at sunset
  if (settings.fx) {
    g.fillStyle = rgrad(g, W / 2, vh * 0.55, vh * 0.35, Math.max(W, vh) * 0.75, [[0, 'rgba(0,0,0,0)'], [1, th.night ? 'rgba(0,0,10,0.6)' : 'rgba(20,0,30,0.32)']]);
    g.fillRect(0, 0, W, vh);
  }
  if (gm.flash > 0) rect(g, 0, 0, W, vh, 'rgba(255,255,255,' + Math.min(0.6, gm.flash * 2).toFixed(3) + ')');
}

/* ---- HUD ---------------------------------------------------------------------------- */
function drawHUD(g) {
  const gm = game, p = gm.p, vh = viewH(), T2 = gm.T;
  g.fillStyle = lgrad(g, 0, 0, 0, 56, [[0, 'rgba(6,4,14,0.78)'], [1, 'rgba(6,4,14,0)']]); g.fillRect(0, 0, W, 56);
  // on an upright phone the picture is narrow, so the read-outs are drawn larger
  const tall = view.zoom > 1.15, k = tall ? 1.32 : 1;
  const grp = (ax, dy) => { g.save(); g.translate(ax, dy || 0); g.scale(k, k); g.translate(-ax, 0); };
  // score and stage
  grp(0);
  T(g, 'SCORE', 8, 4, C.dim, { scale: 0.8, weight: 700 });
  T(g, String(Math.floor(gm.score)).padStart(7, '0'), 8, 10.5, C.ink, { scale: 1.5, weight: 700 });
  T(g, 'STAGE ' + (gm.stage + 1) + '  ' + T2.st.name, 8, 24, C.gold, { scale: 0.82, weight: 700 });
  g.restore();
  // the clock
  grp(W / 2);
  const low = gm.time <= 10 && !gm.finished, tc = gm.timeFlash > 0 ? C.green : low ? (blink(4) ? C.red : '#ffffff') : C.gold;
  T(g, 'TIME', W / 2, 3, C.dim, { align: 'center', scale: 0.8, weight: 700 });
  const ts = 2.6 + (gm.timeFlash > 0 ? 0.5 * gm.timeFlash : 0) + (low ? 0.25 * Math.abs(Math.sin(gm.t * 6)) : 0);
  T(g, String(Math.ceil(gm.time)).padStart(2, '0'), W / 2, 8, tc, { align: 'center', scale: ts, display: true, stroke: 'rgba(0,0,0,0.6)', strokeW: 2 });
  g.restore();
  // progress along the stage: checkpoint, rival and you
  grp(W / 2, tall ? 14 : 0);
  const bx = W / 2 - 62, bw = 124, by = 35.5, span = (T2.goal - T2.start) * SEG;
  const at = (z) => bx + clamp((z - T2.start * SEG) / span, 0, 1) * bw;
  rrect(g, bx - 2, by - 1.6, bw + 4, 3.2, 1.6, 'rgba(0,0,0,0.6)'); rrect(g, bx, by - 0.8, Math.max(1, at(gm.pos + PLAYER_Z) - bx), 1.6, 0.8, C.cyan);
  rect(g, at(T2.check * SEG) - 0.5, by - 3, 1, 6, gm.checked ? C.green : C.gold); rect(g, bx + bw - 0.5, by - 3.4, 1, 6.8, '#ffffff');
  if (gm.rival) poly(g, [at(gm.rival.z) - 2.4, by - 5.4, at(gm.rival.z) + 2.4, by - 5.4, at(gm.rival.z), by - 1.6], '#ff5a5a');
  disc(g, at(gm.pos + PLAYER_Z), by, 2.1, '#ffffff');
  g.restore();
  // speed and nitro
  grp(W);
  const v = kmh(p.speed);
  T(g, String(v), W - 30, 3, p.nitroOn ? C.cyan : C.ink, { align: 'right', scale: 2.5, display: true, stroke: 'rgba(0,0,0,0.6)', strokeW: 2 });
  T(g, 'KM/H', W - 8, 14.5, C.dim, { align: 'right', scale: 0.8, weight: 700 });
  const nx = W - 86, ny = 28, nw = 78;
  rrect(g, nx - 1, ny - 1, nw + 2, 6, 3, 'rgba(0,0,0,0.6)');
  if (p.nitro > 0.01) { g.fillStyle = lgrad(g, nx, 0, nx + nw, 0, [[0, '#2a7af0'], [1, '#9ff0ff']]); roundRectPath(g, nx, ny, Math.max(3, nw * p.nitro), 4, 2); g.fill(); }
  for (const k of [1 / 3, 2 / 3]) rect(g, nx + nw * k - 0.4, ny, 0.8, 4, 'rgba(0,0,0,0.6)');
  T(g, 'NITRO', nx - 4, ny - 1.6, p.nitro > 0.1 ? (p.nitroOn || blink(3) || p.nitro < 0.5 ? C.cyan : '#ffffff') : C.dim, { align: 'right', scale: 0.78, weight: 700 });
  // rival gap
  if (gm.rival && !gm.finished && gm.count <= 0) {
    const m = Math.round((gm.rival.z - gm.pos - PLAYER_Z) / 40), ahead = m > 0;
    T(g, gm.rival.name + (ahead ? '  +' + m + ' M' : '  ' + m + ' M'), W - 8, 37, ahead ? '#ff8a8a' : C.green, { align: 'right', scale: 0.8, weight: 700 });
  }
  g.restore();
  // near-miss chain
  if (gm.chain > 0) {
    const cx = 8, cy = tall ? 50 : 36;
    T(g, 'CHAIN X' + mult(), cx, cy, C.gold, { scale: 1.1 + Math.min(0.5, gm.chain * 0.05), weight: 700 });
    rrect(g, cx, cy + 11, 40, 1.6, 0.8, 'rgba(0,0,0,0.5)'); rrect(g, cx, cy + 11, 40 * clamp(gm.chainT / 5, 0, 1), 1.6, 0.8, C.gold);
  }
  // drift meter over the car
  const hy = Math.round(vh - YS - 18);
  if (p.drift && p.driftT > 0.25) T(g, 'DRIFT ' + p.driftT.toFixed(1), W / 2, hy + YS - 58, p.driftT > 0.7 ? C.cyan : '#ffffff', { align: 'center', scale: 1.1, weight: 700 });
  if (p.slipOn) T(g, 'SLIPSTREAM', W / 2, hy + YS - 58, '#ffffff', { align: 'center', scale: 0.9, weight: 700 });
  // floating call-outs
  gm.pops.forEach((q, i) => {
    const a = q.t < 0.12 ? q.t / 0.12 : q.t > 1.1 ? Math.max(0, 1 - (q.t - 1.1) / 0.4) : 1;
    g.globalAlpha = a;
    T(g, q.s, W / 2, (gm.medalQ.length ? 72 : 50) + (tall ? 22 : 0) + (gm.pops.length - 1 - i) * 13 - Math.min(1, q.t * 4) * 4, q.col, { align: 'center', scale: 1.5 + (q.t < 0.12 ? (0.12 - q.t) * 4 : 0), display: true, stroke: 'rgba(0,0,0,0.7)', strokeW: 2.2 });
    g.globalAlpha = 1;
  });
  // countdown
  if (gm.count > 0 && gm.state === 'play') {
    const n = Math.ceil(gm.count - 0.6), fr = (gm.count - 0.6) % 1;
    const s = n > 0 ? String(n) : 'GO!';
    T(g, s, W / 2, hy - 44, n > 0 ? '#ffffff' : C.green, { align: 'center', scale: 5 + (n > 0 ? fr : 0) * 2, display: true, stroke: 'rgba(0,0,0,0.75)', strokeW: 3 });
    for (let i = 0; i < 3; i++) { disc(g, W / 2 - 16 + i * 16, hy - 56, 5, '#14161c'); disc(g, W / 2 - 16 + i * 16, hy - 56, 3.6, n <= 0 ? '#3aff7a' : 3 - n > i ? '#ff3d5a' : '#3a2028'); }
  }
  if (gm.banner) {
    const b = gm.banner, a = b.t < 0.2 ? b.t / 0.2 : b.t > 1.5 ? Math.max(0, 1 - (b.t - 1.5) / 0.5) : 1;
    g.globalAlpha = a;
    rect(g, 0, hy - 70, W, 26, 'rgba(6,4,14,0.6)'); rect(g, 0, hy - 70, W, 1, C.gold); rect(g, 0, hy - 45, W, 1, C.gold);
    T(g, b.s, W / 2 + (1 - a) * 40, hy - 68, C.gold, { align: 'center', scale: 2, display: true }); T(g, b.sub, W / 2, hy - 52, '#ffffff', { align: 'center', scale: 0.85, weight: 700 });
    g.globalAlpha = 1;
  }
  if (gm.timeUp && gm.state === 'play') T(g, 'TIME UP', W / 2, hy - 50, C.red, { align: 'center', scale: 4, display: true, stroke: 'rgba(0,0,0,0.75)', strokeW: 3 });
  if (low && !gm.timeUp && gm.count <= 0 && blink(3)) T(g, 'HURRY!', W / 2, 44, C.red, { align: 'center', scale: 1.2, weight: 700 });
}

/* ---- frame --------------------------------------------------------------------------- */
function ensureArtScale() { /* art is drawn at fixed high resolution; nothing to rebuild on resize */ }

function renderFrame() {
  const cv = $('screen'), g = cv.getContext('2d'), gm = game;
  gm.hits = [];
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#06040c'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  g.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
  g.save();
  g.beginPath(); g.rect(0, 0, W, viewH()); g.clip();
  const race = gm.T && gm.p;
  if (gm.state === 'boot') drawBoot(g);
  else {
    if (race) drawRace(g); else rect(g, 0, 0, W, viewH(), '#0a0618');
    if (race && (gm.state === 'play' || gm.state === 'pause' || gm.state === 'clear' || gm.state === 'continue' || (gm.state === 'options' && gm.optFrom === 'pause'))) drawHUD(g);
    // menus are laid out for a 16:9 page and sit centred when the picture is taller
    g.translate(0, view.dy);
    switch (gm.state) {
      case 'title': drawTitle(g); break;
      case 'garage': drawGarage(g); break;
      case 'scores': drawScores(g); break;
      case 'medals': drawMedals(g); break;
      case 'howto': drawHowTo(g); break;
      case 'options': drawOptions(g); break;
      case 'intro': drawIntro(g); break;
      case 'pause': drawPause(g); break;
      case 'clear': drawClear(g); break;
      case 'continue': drawContinue(g); break;
      case 'gameover': drawGameOver(g); break;
      case 'ending': drawEnding(g); break;
      case 'entry': drawEntry(g); break;
      default: break;
    }
    drawMedalToast(g);
  }
  if (gm.toast) {
    gm.toast.t += 1 / 60;
    if (gm.toast.t > 1.6) gm.toast = null;
    else { const w = textWidth(gm.toast.s) + 14; rrect(g, W / 2 - w / 2, H - 22, w, 13, 6.5, 'rgba(10,6,20,0.88)'); T(g, gm.toast.s, W / 2, H - 19.4, C.gold, { align: 'center' }); }
  }
  g.restore();
}
