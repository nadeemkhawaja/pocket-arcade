/* ==========================================================================
   Rendering: world, lighting, HUD and screens, drawn straight to the screen
   in world units under one transform (crisp at any resolution).
   ========================================================================== */

const view = { scale: 2, ox: 0, oy: 0 };

const C = {
  ink: '#ffffff', dim: '#a89aa8', red: '#e8392a', gold: '#ffd27a', cyan: '#9fe8ff', green: '#5ee08a', jade: '#5ef0c0', shadow: 'rgba(0,0,0,0.7)',
  lacquer: '#1a0a10', gold2: '#d9a43a', goldLo: '#7a4c10'
};

function hitArea(x0, y0, x1, y1, data) { game.hits.push(Object.assign({ x0, y0, x1, y1 }, data)); }
function T(g, s, x, y, col, o) { return drawText(g, s, x, y, col || C.ink, Object.assign({ shadow: C.shadow }, o || {})); }
function blink(rate) { return Math.floor(game.t * (rate || 2)) % 2 === 0; }
function pad7(n) { return String(Math.max(0, Math.floor(n))).padStart(7, '0'); }

/** Lacquered panel with a thin gold rim. */
function panel(g, x, y, w, h, opts) {
  const o = opts || {};
  g.fillStyle = lgrad(g, 0, y, 0, y + h, [[0, o.top || 'rgba(34,14,22,0.94)'], [1, o.bot || 'rgba(12,5,10,0.94)']]);
  roundRectPath(g, x, y, w, h, o.r === undefined ? 3 : o.r); g.fill();
  g.strokeStyle = o.border || lgrad(g, x, y, x + w, y + h, [[0, '#ffe8a0'], [0.5, '#b8862a'], [1, '#6a4410']]);
  g.lineWidth = o.lw || 0.7; g.stroke();
}
/** A selectable menu bar. */
function menuBar(g, x, y, w, h, on) {
  if (!on) return;
  g.fillStyle = lgrad(g, 0, y, 0, y + h, [[0, '#c0322a'], [0.55, '#8a1a18'], [1, '#5a0e10']]);
  roundRectPath(g, x, y, w, h, h / 2); g.fill();
  g.strokeStyle = '#ffd27a'; g.lineWidth = 0.6; g.stroke();
  drawGlow(g, x + 7, y + h / 2, 7, '#ffd27a', 0.8); disc(g, x + 7, y + h / 2, 1.8, '#fff2c0');
}
function bigTitle(g, s, x, y, scale, opts) {
  const o = opts || {};
  g.font = (o.weight || 900) + ' ' + 8.4 * scale + 'px ' + FONT_DISPLAY;
  g.textBaseline = 'top'; g.textAlign = o.align || 'center';
  g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(s, x + 0.9 * scale * 0.5, y + 1.2 * scale * 0.5);
  g.strokeStyle = o.stroke || '#5a0e10'; g.lineWidth = 1.2 * scale; g.strokeText(s, x, y);
  g.fillStyle = o.fill || lgrad(g, 0, y, 0, y + 8.4 * scale, [[0, '#fff6d0'], [0.45, '#ffd27a'], [1, '#d8862a']]);
  g.fillText(s, x, y);
  g.textAlign = 'left';
}

/* ---- world ---------------------------------------------------------------------- */
function drawBackdrop(g, L, F, cx) {
  if (F.outdoor) {
    blitArt(g, L.sky, 0, 0, W, H, 0, 0);
    if (game.skyFlash > 0) { g.globalAlpha = game.skyFlash * 0.8; rect(g, 0, 0, W, 150, '#c8c0ff'); g.globalAlpha = 1; }
    for (const [k, p] of [['far', 0.12], ['mid', 0.35]]) {
      const ox = (cx * p) % LAYER_W;
      blitArt(g, L[k], 0, 0, LAYER_W, H, -ox, 0); blitArt(g, L[k], 0, 0, LAYER_W, H, LAYER_W - ox, 0);
    }
    for (let i = 0; i < 5; i++) {
      const x = ((i * 137 + game.t * (5 + i * 2) - cx * 0.05) % (W + 200)) - 100, y = 34 + i * 12;
      g.globalAlpha = 0.55; ellipse(g, x, y, 34, 6, 0, '#2a2240'); ellipse(g, x + 18, y - 3, 18, 5, 0, '#2e2646'); g.globalAlpha = 1;
    }
  } else {
    const ox = (cx * 0.25) % LAYER_W;
    blitArt(g, L.outside, 0, 0, LAYER_W, H, -ox, 0); blitArt(g, L.outside, 0, 0, LAYER_W, H, LAYER_W - ox, 0);
  }
  blitArt(g, L.level, cx, 0, W, H, 0, 0);
}

function lanternPos(l) { const sw = Math.sin(game.t * 1.3 + l.ph) * 1.8; return [l.x + sw, l.y + l.len]; }

function drawLanterns(g, L, cx) {
  for (const l of L.lanterns) {
    const [lx, ly] = lanternPos(l);
    const x = lx - cx;
    if (x < -20 || x > W + 20) continue;
    stampLine(g, l.x - cx, l.y, x, ly, 0.6, '#2a1410');
    drawLantern(g, x, ly, true, 1);
  }
}

function drawLights(g, L, cx) {
  for (const l of L.lights) {
    let x = l.x, y = l.y;
    if (l.lantern) { const p = lanternPos(l.lantern); x = p[0]; y = p[1] + 9; }
    const sx = x - cx;
    if (sx < -l.r || sx > W + l.r) continue;
    const fl = 1 - l.f * (0.5 + 0.5 * Math.sin(game.t * 9 + l.ph) * Math.sin(game.t * 5.3 + l.ph * 2));
    if (l.live && QUALITY.level >= 2) continue;
    drawGlow(g, sx, y, l.r, l.col, clamp(fl, 0, 1) * (l.live ? 0.55 : 1));
  }
}

function drawDoor(g, F, cx) {
  if (F.outdoor) return;
  const sx = stairX(F) - cx;
  if (sx < -40 || sx > W + 40) return;
  const top = 58, bot = BASE_Y;
  const lift = game.doorOpen * (bot - top + 4);
  g.save(); g.beginPath(); g.rect(sx - 30, top, 60, bot - top); g.clip();
  for (let x = -27; x <= 25; x += 9) {
    g.fillStyle = lgrad(g, sx + x, 0, sx + x + 4, 0, [[0, '#2a1408'], [0.4, '#7a4a28'], [1, '#2a1408']]);
    g.fillRect(sx + x, top - lift, 4, bot - top);
  }
  for (const y of [top + 18, top + 64, top + 106]) {
    g.fillStyle = lgrad(g, 0, y - lift, 0, y + 5 - lift, [[0, '#8a5a32'], [1, '#3a2010']]); g.fillRect(sx - 30, y - lift, 60, 5);
    g.fillStyle = rgrad(g, sx - 1, y + 1.5 - lift, 0.3, 3.5, [[0, '#fff0b0'], [1, '#a8782a']]); g.beginPath(); g.arc(sx, y + 2.5 - lift, 3, 0, TAU); g.fill();
  }
  g.restore();
}

function drawMaster(g, F, cx) {
  if (!F.outdoor) return;
  const sx = stairX(F), x = sx - F.dir * 3 - cx;
  if (x < -30 || x > W + 30) return;
  const S = game.bossSeq;
  if (!game.freed) drawSprite(g, 'master', 'tied', game.t * 1.2, -F.dir, x, GROUND_Y);
  else drawSprite(g, 'master', S && S.st === 'free' && S.t > 2.2 ? 'bow' : 'idle', 0, -F.dir, x, GROUND_Y);
  if (!game.freed && game.arena && blink(1.2)) T(g, 'HELP!', x, GROUND_Y - 58, C.gold, { align: 'center', weight: 700 });
}

/** Everyone standing on the polished floor, mirrored underneath. */
function drawReflections(g, cx) {
  g.save();
  g.beginPath(); g.rect(0, GROUND_Y, W, H - GROUND_Y); g.clip();
  g.translate(0, GROUND_Y * 2); g.scale(1, -1);
  SPRITE_DIRECT = true;
  g.globalAlpha = 1;
  for (const e of game.foes) if (foeAlive(e) && e.kind !== 'snake' && e.kind !== 'monkey') { const [a, f] = foePose(e); drawSprite(g, e.kind, a, f, e.face, e.x - cx, e.y, false, 0.22); }
  if (game.boss && !game.boss.dead) { g.globalAlpha = 0.22; game.boss.draw(g, cx, true); g.globalAlpha = 1; }
  const h = game.hero;
  if (h && !game.hideHero) { const [a, f] = heroPose(h); drawSprite(g, h.kind, a, f, h.face, h.x - cx, h.y, false, 0.22); }
  SPRITE_DIRECT = false;
  g.restore();
  g.globalAlpha = 1;
}

function drawWorld(g) {
  const L = game.L, F = game.F;
  const cx = game.camX;
  let sx = 0, sy = 0;
  if (game.shake > 0.3 && game.state !== 'pause') { sx = rand(-1, 1) * game.shake; sy = rand(-1, 1) * game.shake * 0.6; }
  g.save();
  g.translate(sx, sy);
  if (!DBG.noBack) drawBackdrop(g, L, F, cx);
  if (!DBG.noLights) { drawLanterns(g, L, cx); drawLights(g, L, cx); }
  drawDoor(g, F, cx);
  if (F.reflect) drawReflections(g, cx);
  for (const z of game.haz) if (z.k === 'vent') drawHaz(g, z, cx);
  drawMaster(g, F, cx);
  const h = game.hero, b = game.boss;
  for (const e of game.foes) if (foeAlive(e) && e.kind !== 'snake') drawShadow(g, e.x, e.y, e.kind === 'monkey' ? 6 : 9, cx);
  if (b && b.st !== 'enter' && !(b.st === 'blink' && b.t < 0.3)) drawShadow(g, b.x, b.y, b.kind === 'ox' ? 16 : 10, cx);
  if (h && !game.hideHero) drawShadow(g, h.x, h.y, 9, cx);
  for (const it of game.items) drawItem(g, it, cx);
  if (!DBG.noFoes) for (const e of game.foes) if (e.st === 'dead') drawFoe(g, e, cx);
  if (!DBG.noFoes) for (const e of game.foes) if (e.st !== 'dead') drawFoe(g, e, cx);
  if (b) b.draw(g, cx);
  if (h && !game.hideHero) drawHero(g, h, cx);
  for (const z of game.haz) if (z.k !== 'vent') drawHaz(g, z, cx);
  for (const s of game.shots) drawShot(g, s, cx);
  drawFx(g, cx);
  if (!game.arena) {
    for (const f of L.front) {
      const fx = f.x - cx * 1.3;
      if (fx > -70 && fx < W + 70) { g.globalAlpha = 0.62; drawFrontPiece(g, f, fx, game.t); }
    }
    g.globalAlpha = 1;
  }
  if (!DBG.noWeather) drawWeather(g);
  if (!DBG.noGrade) drawGrade(g, F);
  drawPops(g, cx);
  g.restore();
  // flashes stay gentle (and nearly off when the player prefers reduced motion)
  if (game.flashT > 0) { g.globalAlpha = Math.min(reducedMotion ? 0.1 : 0.28, game.flashT * 3); rect(g, 0, HUD_H, W, H - HUD_H, game.F && game.F.outdoor ? '#e8f0ff' : '#fff4e2'); g.globalAlpha = 1; }
}

/** Colour grade and vignette that tie each hall together. */
const GRADE_CACHE = {};
function drawGrade(g, F) {
  const A = LOOKS[F.id];
  const col = A ? A.grade : '#8a6aff';
  const key = col + (settings.fx ? 1 : 0);
  let c = GRADE_CACHE[key];
  if (!c) {
    c = makeCanvas(192, 108);
    const q = c.getContext('2d');
    if (settings.fx) { q.fillStyle = rgba(col, 0.07); q.fillRect(0, 0, 192, 108); }
    q.fillStyle = rgrad(q, 96, 59, 40, 120, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.58)']]);
    q.fillRect(0, 0, 192, 108);
    GRADE_CACHE[key] = c;
  }
  g.drawImage(c, 0, 0, W, H);
}

function drawWeather(g) {
  const kind = game.F.weather;
  for (const p of game.wx) {
    const x = p.x, y = p.y;
    if (kind === 'embers') { if (p.s > 0.75 && QUALITY.level < 2) drawGlow(g, x, y, 3, '#ff7a2a', 0.8); disc(g, x, y, 0.5 + p.s * 0.3, p.s > 0.5 ? '#ffd080' : '#ff8a3a'); }
    else if (kind === 'storm') { g.globalAlpha = 0.32; stampLine(g, x, y, x - 2.4, y + 7, 0.45, '#b8c8f0'); g.globalAlpha = 1; }
    else if (kind === 'fireflies') {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(game.t * 2 + p.ph));
      if (QUALITY.level < 2) drawGlow(g, x, y, 4, '#5ab0ff', a); g.globalAlpha = a; disc(g, x, y, 0.6, '#e8f8ff'); g.globalAlpha = 1;
    } else { g.globalAlpha = 0.2 + 0.3 * Math.sin(game.t * 2 + p.ph); disc(g, x, y, 0.45 + p.s * 0.4, '#ffe8b0'); g.globalAlpha = 1; }
  }
}

/* ---- HUD --------------------------------------------------------------------------- */
function hpColor(f) { return f > 0.5 ? ['#7af0a0', '#2aa860'] : f > 0.25 ? ['#ffe08a', '#d89a20'] : ['#ff8a7a', '#c02a20']; }

function drawHUD(g) {
  g.fillStyle = lgrad(g, 0, 0, 0, HUD_H + 2, [[0, '#14070d'], [0.8, 'rgba(20,7,13,0.95)'], [1, 'rgba(20,7,13,0.5)']]);
  g.fillRect(0, 0, W, HUD_H + 2);
  g.fillStyle = lgrad(g, 0, 0, W, 0, [[0, '#6a4410'], [0.5, '#ffe08a'], [1, '#6a4410']]); g.fillRect(0, HUD_H - 0.6, W, 0.8);
  const h = game.hero;
  // portrait medallion
  g.fillStyle = rgrad(g, 13, 13, 1, 12, [[0, '#6a1a1a'], [1, '#24080c']]); g.beginPath(); g.arc(14, 15, 11, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(14, 15, 10.3, 0, TAU); g.clip();
  drawPortrait(g, game.fighter, 14.5, 15.5, 17, 1);
  g.restore();
  g.strokeStyle = lgrad(g, 3, 4, 25, 26, [[0, '#ffe8a0'], [0.5, '#c9902a'], [1, '#6a4410']]); g.lineWidth = 1.1; g.beginPath(); g.arc(14, 15, 11, 0, TAU); g.stroke();
  // vitality
  T(g, h ? h.S.name : 'TAO', 28, 2.2, C.gold, { weight: 700, scale: 0.95 });
  const hp = h ? Math.max(0, h.hp) : 0, f = hp / MAX_HP;
  game.hpGhost = game.hpGhost === undefined ? hp : Math.max(hp, approach(game.hpGhost, hp, 10 / 60));
  rrect(g, 27.5, 11.5, 85, 7, 2.5, '#08040a');
  if (game.hpGhost > hp) { roundRectPath(g, 28.5, 12.5, 83 * (game.hpGhost / MAX_HP), 5, 2); g.fillStyle = '#ffffff'; g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1; }
  const [c1, c2] = hpColor(f);
  if (hp > 0) { roundRectPath(g, 28.5, 12.5, Math.max(4, 83 * f), 5, 2); g.fillStyle = lgrad(g, 0, 12.5, 0, 17.5, [[0, c1], [1, c2]]); g.fill(); }
  if (f <= 0.25 && blink(5)) { roundRectPath(g, 28.5, 12.5, 83, 5, 2); g.strokeStyle = '#ff6a5a'; g.lineWidth = 0.6; g.stroke(); }
  for (let i = 1; i < 6; i++) rect(g, 28.5 + (83 * i) / 6, 12.5, 0.4, 5, 'rgba(0,0,0,0.45)');
  rect(g, 30, 13, Math.max(0, 83 * f - 3), 0.8, 'rgba(255,255,255,0.35)');
  // chi
  const chi = h ? h.chi : 0, full = chi >= MAX_CHI;
  T(g, 'CHI', 28, 20.5, full ? C.jade : C.gold, { scale: 0.85, weight: 700 });
  rrect(g, 41.5, 21.5, 52, 5, 2, '#08040a');
  if (chi > 0) {
    roundRectPath(g, 42.3, 22.2, 50.4 * (chi / MAX_CHI), 3.6, 1.6);
    g.fillStyle = full ? lgrad(g, 42, 0, 93, 0, [[0, '#5ef0c0'], [((game.t * 0.8) % 1), '#ffffff'], [1, '#ffd84a']]) : lgrad(g, 42, 0, 93, 0, [[0, '#a87420'], [1, '#ffd84a']]);
    g.fill();
  }
  if (full) { drawGlow(g, 68, 24, 18, '#ffd84a', 0.5 + 0.3 * Math.sin(game.t * 8)); T(g, 'READY', 96, 20.5, blink(4) ? C.jade : C.gold, { scale: 0.85, weight: 700 }); }
  // lives
  const n = game.lives;
  const lx0 = 120;
  if (n <= 4) for (let i = 0; i < n; i++) drawPortrait(g, game.fighter, lx0 + i * 9, 14.5, 9, 1);
  else { drawPortrait(g, game.fighter, lx0, 14.5, 9, 1); T(g, 'X' + n, lx0 + 6, 10, C.ink, { scale: 0.9 }); }
  // score
  T(g, 'SCORE', 192, 1.6, C.dim, { align: 'center', scale: 0.72 });
  T(g, pad7(game.score), 192, 7.5, '#ffffff', { align: 'center', scale: 1.5, weight: 700 });
  T(g, 'HI ' + pad7(game.hi), 192, 21.3, C.gold, { align: 'center', scale: 0.78 });
  // time seal
  const tl = Math.ceil(game.timeLeft || 0), hurry = tl < 20;
  g.fillStyle = lgrad(g, 0, 3, 0, 27, [[0, hurry && blink(4) ? '#e8392a' : '#a82420'], [1, '#5a0e10']]);
  roundRectPath(g, 236, 3.5, 26, 23, 2.5); g.fill();
  g.strokeStyle = '#ffd27a'; g.lineWidth = 0.5; g.stroke();
  T(g, 'TIME', 249, 5, '#ffd8c0', { align: 'center', scale: 0.62, shadow: null });
  T(g, String(tl), 249, 11, '#ffffff', { align: 'center', scale: 1.3, weight: 700 });
  // pagoda floors
  for (let i = 0; i < FLOORS.length; i++) {
    const x = 296 + i * 17, cur = i === game.floorIdx, done = i < game.floorIdx;
    const col = done ? '#a8782a' : cur ? '#ffd27a' : '#3a2630';
    if (cur) drawGlow(g, x + 7, 7, 12, '#ffd27a', 0.4 + 0.3 * Math.sin(game.t * 5));
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - 1, 4.5); g.quadraticCurveTo(x + 2, 6, x + 4, 5.6); g.lineTo(x + 10, 5.6); g.quadraticCurveTo(x + 12, 6, x + 15, 4.5); g.lineTo(x + 13, 7); g.lineTo(x + 1, 7); g.closePath(); g.fill();
    rect(g, x + 3, 7, 8, 4.5, col);
    T(g, String(i + 1), x + 7, 6.8, cur ? '#3a1404' : done ? '#2a1404' : '#7a6470', { align: 'center', scale: 0.55, shadow: null, weight: 700 });
  }
  // the guardian
  const b = game.boss;
  if (b && game.bossSeq && !(b.dead && b.deathT > 1.6)) {
    T(g, b.name, W - 3, 13.5, C.gold, { align: 'right', scale: 0.8, weight: 700 });
    const bx = 272, bw = W - bx - 3, p = clamp(b.hp / b.max, 0, 1);
    rrect(g, bx, 21.5, bw, 5.5, 2, '#08040a');
    if (p > 0) { roundRectPath(g, bx + 0.8, 22.2, (bw - 1.6) * p, 4, 1.6); g.fillStyle = lgrad(g, 0, 22, 0, 26, [[0, '#ff8a6a'], [1, p < 0.3 ? '#a01010' : '#c02a20']]); g.fill(); }
    rect(g, bx + bw / 2, 21.5, 0.5, 5.5, 'rgba(255,220,160,0.6)');
  } else if (game.state === 'play' || game.state === 'pause') {
    T(g, 'GUARDIAN', W - 3, 13.5, '#6a5460', { align: 'right', scale: 0.7 });
    T(g, BOSS_DEFS[game.F.boss].name, W - 3, 20.5, '#8a7480', { align: 'right', scale: 0.8, weight: 700 });
  }
  if (game.chainN >= 2 && game.time - game.chainT < 1.5 && game.state === 'play') {
    const s = 'CHAIN X' + game.chainN;
    T(g, s, 192, HUD_H + 3, Math.floor(game.t * 8) % 2 ? C.gold : '#ff9a30', { align: 'center', stroke: '#140a10', strokeW: 2, weight: 700 });
  }  drawArmsHud(g);
}

/* ---- banners --------------------------------------------------------------------- */
function drawGong(g, x, y, r, t) {
  stampLine(g, x - r - 3, y - r - 4, x + r + 3, y - r - 4, 1.4, '#3a2010');
  stampLine(g, x - r * 0.5, y - r - 4, x - r * 0.3, y - r * 0.8, 0.5, '#c9a463'); stampLine(g, x + r * 0.5, y - r - 4, x + r * 0.3, y - r * 0.8, 0.5, '#c9a463');
  g.fillStyle = rgrad(g, x - r * 0.35, y - r * 0.35, r * 0.1, r * 1.1, [[0, '#ffe8a0'], [0.45, '#c9902a'], [1, '#5a3a0a']]);
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  ring(g, x, y, r * 0.72, 0.5, 'rgba(90,58,10,0.6)'); ring(g, x, y, r * 0.38, 0.5, 'rgba(90,58,10,0.6)');
  disc(g, x, y, r * 0.2, '#ffe8a0');
  if (t < 1.3) { g.globalAlpha = 0.6 * (1 - t / 1.3); ring(g, x, y, r + 2 + t * 30, 0.8, '#ffe8a0'); ring(g, x, y, r + t * 16, 0.6, '#ffe8a0'); g.globalAlpha = 1; }
}

function drawBanners(g) {
  const S = game.bossSeq;
  if (game.state === 'play' && S && S.st === 'gong' && S.t > 0.15) {
    const p = Math.min(1, (S.t - 0.15) / 0.3), y = 74;
    g.fillStyle = lgrad(g, 0, y, 0, y + 46, [[0, 'rgba(70,6,8,0.9)'], [0.5, 'rgba(30,4,6,0.92)'], [1, 'rgba(70,6,8,0.9)']]);
    g.fillRect(0, y, W, 46);
    g.fillStyle = lgrad(g, 0, 0, W, 0, [[0, 'rgba(255,224,138,0)'], [0.5, '#ffe08a'], [1, 'rgba(255,224,138,0)']]);
    g.fillRect(W / 2 - (W / 2) * p, y, W * p, 1); g.fillRect(W / 2 - (W / 2) * p, y + 45, W * p, 1);
    drawGong(g, 44, y + 24, 14, S.t);
    const D = BOSS_DEFS[game.F.boss];
    g.save(); g.globalAlpha = p;
    bigTitle(g, D.name, W / 2 + 18 - (1 - p) * 60, y + 7, 2.1);
    if (S.t > 0.6) T(g, D.title, W / 2 + 18, y + 31, C.gold, { align: 'center', weight: 600, scale: 1.05 });
    g.restore();
  }
  if (game.state === 'play' && S && S.st === 'exit' && S.t < 2.5 && !game.F.outdoor && blink(3)) T(g, 'THE WAY UP IS OPEN', W / 2, 62, C.gold, { align: 'center', stroke: '#140a10', strokeW: 2.2, weight: 700, scale: 1.2 });
  if (game.state === 'play' && S && S.st === 'free' && S.t > 1) bigTitle(g, 'GRANDMASTER HU IS FREE', W / 2, 58, 1.3);
  if (game.state === 'play' && game.time < 2.2 && !game.demo && game.evIdx === 0 && !game.bossSeq) {
    const p = Math.min(1, game.time / 0.25), sc = 3.4 + (1 - p) * 2;
    g.save(); g.globalAlpha = game.time > 1.8 ? (2.2 - game.time) / 0.4 : 1;
    bigTitle(g, 'FIGHT!', W / 2, 74 - (sc - 3.4) * 4, sc);
    g.restore();
  }
  if (game.state === 'play' && game.readyT > 0 && game.time > 2.2 && !game.demo && blink(5)) bigTitle(g, 'READY', W / 2, 84, 2);
  if (game.state === 'play' && !game.demo && game.timeLeft < 20 && game.timeLeft > 0 && !game.hero.dead && blink(2)) T(g, 'HURRY!', W / 2, HUD_H + 13, '#ff6a5a', { align: 'center', stroke: '#140a10', strokeW: 2, weight: 700, scale: 1.1 });
  if (game.demo) {
    if (blink(1.5)) bigTitle(g, 'DEMO PLAY', W / 2, 44, 1.8);
    T(g, input.usingTouch ? 'TAP TO PLAY' : 'PRESS ANY KEY', W / 2, 64, C.ink, { align: 'center', stroke: '#140a10', strokeW: 2 });
  }
}

/* ---- screens -------------------------------------------------------------------------- */
function drawTitleBackdrop(g, dim) {
  const T0 = titleArt();
  blitArt(g, T0.sky, 0, 0, W, H, 0, 0);
  // a dragon gliding across the sky
  const dt = (game.t % 22) / 22;
  if (dt < 0.6) { const p = dt / 0.6; drawSkyDragon(g, lerp(W + 40, -180, p), 66 + Math.sin(p * 5) * 10, game.t); }
  const cam = game.t * 8;
  const ox = (cam * 0.3) % LAYER_W;
  blitArt(g, T0.far, 0, 0, LAYER_W, H, -ox, 0); blitArt(g, T0.far, 0, 0, LAYER_W, H, LAYER_W - ox, 0);
  blitArt(g, T0.tower, 0, 0, W, H, 0, 0);
  drawGlow(g, W - 70, T0.towerTop + 60, 60, '#ff8a3a', 0.45 + 0.15 * Math.sin(game.t * 2));
  const nx = cam % LAYER_W;
  blitArt(g, T0.near, 0, 0, LAYER_W, H, -nx, 0); blitArt(g, T0.near, 0, 0, LAYER_W, H, LAYER_W - nx, 0);
  for (let i = 0; i < 22; i++) {
    const x = ((i * 53 - game.t * (14 + (i % 4) * 5)) % (W + 20) + W + 20) % (W + 20) - 10;
    const y = ((i * 37 + game.t * (10 + (i % 3) * 4)) % (H + 10)) - 5;
    g.save(); g.translate(x, y); g.rotate(game.t * 2 + i);
    ellipse(g, 0, 0, 1.4, 0.7, 0, i % 2 ? '#ffc0d0' : '#ff8aa8'); g.restore();
  }
  const d = dim || 0.55;
  g.fillStyle = lgrad(g, 0, 0, W, 0, [[0, 'rgba(6,4,14,' + d + ')'], [0.62, 'rgba(6,4,14,' + d * 0.7 + ')'], [1, 'rgba(6,4,14,0.08)']]);
  g.fillRect(0, 0, W, H);
  g.fillStyle = rgrad(g, W / 2, H / 2, H * 0.4, W * 0.65, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); g.fillRect(0, 0, W, H);
}

function drawSeal(g, x, y, s) {
  g.save(); g.translate(x, y); g.rotate(-0.06);
  g.fillStyle = lgrad(g, 0, 0, 0, s, [[0, '#d6312a'], [1, '#8a1414']]);
  roundRectPath(g, 0, 0, s, s, s * 0.12); g.fill();
  g.strokeStyle = 'rgba(255,230,200,0.75)'; g.lineWidth = s * 0.04; roundRectPath(g, s * 0.08, s * 0.08, s * 0.84, s * 0.84, s * 0.08); g.stroke();
  g.font = (s * 0.42) + 'px ' + FONT_BRUSH; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff2e0';
  g.fillText('龍', s / 2, s * 0.3); g.fillText('塔', s / 2, s * 0.72);
  g.textAlign = 'left';
  g.restore();
}

function drawLogo(g, y) {
  const s = 3.2;
  bigTitle(g, 'DRAGON PAGODA', W / 2 - 6, y, s);
  const w = Math.min(1, (game.t % 7) / 0.6) * 250;
  g.fillStyle = lgrad(g, W / 2 - 125, 0, W / 2 + 125, 0, [[0, 'rgba(217,164,58,0)'], [0.5, '#ffe08a'], [1, 'rgba(217,164,58,0)']]);
  g.fillRect(W / 2 - 125, y + 29, w, 0.9);
  drawSeal(g, W / 2 + 134, y - 1, 20);
}

function controlHint() {
  if (input.usingTouch || (isTouch && !input.usingPad)) return 'PAD MOVE    P PUNCH    K KICK    J JUMP    C CHI WAVE';
  if (input.usingPad) return 'STICK MOVE    X PUNCH    B KICK    A JUMP    Y CHI WAVE';
  return 'ARROWS MOVE    Z PUNCH    X KICK    SPACE JUMP    C CHI WAVE    M MUTE';
}

function drawBoot(g) {
  drawTitleBackdrop(g);
  drawLogo(g, 50);
  T(g, 'FIVE FLOORS.  FIVE GUARDIANS.  ONE MASTER.', W / 2, 90, C.cyan, { align: 'center', weight: 600 });
  if (blink(1.6)) T(g, isTouch && coarse ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', W / 2, 128, C.gold, { align: 'center', scale: 1.6, weight: 700 });
  T(g, 'SOUND ON FOR THE FULL EXPERIENCE', W / 2, 178, C.dim, { align: 'center' });
}

function drawTitle(g) {
  drawTitleBackdrop(g);
  drawLogo(g, 20);
  T(g, 'FIVE FLOORS.  FIVE GUARDIANS.  ONE MASTER.', W / 2, 58, C.cyan, { align: 'center', weight: 600 });
  const y0 = 78;
  TITLE_ITEMS.forEach((it, i) => {
    const sel = game.menu === i, y = y0 + i * 16.5;
    menuBar(g, W / 2 - 62, y - 3, 124, 14, sel);
    T(g, it, W / 2 + (sel ? 3 : 0), y - 0.6, sel ? '#ffffff' : C.dim, { align: 'center', scale: 1.2, weight: 700 });
    hitArea(W / 2 - 90, y - 5, W / 2 + 90, y + 12, { i });
  });
  T(g, 'TOP ' + pad7(game.scores[0].s) + '   ' + game.scores[0].n, W / 2, 166, C.gold, { align: 'center', weight: 700 });
  T(g, 'MEDALS ' + medalCount() + ' / ' + MEDALS.length, W / 2, 178, '#c8b8ff', { align: 'center', scale: 0.86, weight: 700 });
  T(g, controlHint(), W / 2, 200, '#9a8aa0', { align: 'center', scale: 0.85 });
}

function drawSelect(g) {
  drawTitleBackdrop(g, 0.78);
  bigTitle(g, 'CHOOSE YOUR FIGHTER', W / 2, 6, 1.7);
  FIGHTERS.forEach((f, i) => {
    const sel = settings.fighter === f, x0 = 46 + i * 152, y0 = 24, w = 140, hgt = 80;
    panel(g, x0, y0, w, hgt, sel ? { border: game.menu === 0 && blink(3) ? '#ffe08a' : undefined, lw: 1.1 } : { border: '#4a3040' });
    if (sel) { drawGlow(g, x0 + 50, y0 + 64, 50, '#ff6a3a', 0.35); }
    const S = HERO_STATS[f];
    const ph = (game.t * 1.1) % 2;
    const anim = sel ? (ph < 1 ? 'punch' : 'kick') : 'idle';
    const fr = sel ? Math.min(2, (ph % 1) * 5) : (game.t * 1.1) % 2;
    g.save(); g.beginPath(); g.rect(x0 + 1, y0 + 1, w - 2, hgt - 2); g.clip();
    rect(g, x0 + 1, y0 + 68, w - 2, 11, 'rgba(0,0,0,0.25)');
    g.globalAlpha = sel ? 1 : 0.55;
    g.translate(x0 + 50, y0 + 75); g.scale(1.62, 1.62);
    g.globalAlpha = 0.5; g.drawImage(shadowSprite(), -14, -2.4, 28, 5); g.globalAlpha = sel ? 1 : 0.55;
    drawSprite(g, f, anim, fr, 1, 0, 0);
    g.restore(); g.globalAlpha = 1;
    bigTitle(g, S.name, x0 + w - 6, y0 + 5, 1.6, { align: 'right', fill: sel ? undefined : '#8a7a80', stroke: sel ? undefined : '#2a1a20' });
    T(g, S.blurb[0], x0 + w / 2, y0 + hgt + 3, sel ? C.gold : '#7a6a70', { align: 'center', weight: 700 });
    T(g, S.blurb[1], x0 + w / 2, y0 + hgt + 12, sel ? C.cyan : '#6a6a7a', { align: 'center' });
    hitArea(x0, y0, x0 + w, y0 + hgt + 20, { fighter: f });
  });
  const y = 141;
  T(g, 'LEVEL', 22, y, game.menu === 1 ? C.ink : C.dim, { weight: 700 });
  LEVELS.forEach((lv, i) => {
    const sel = settings.level === lv, x = 74 + i * 76;
    g.fillStyle = sel ? lgrad(g, 0, y - 4, 0, y + 11, [[0, '#c0322a'], [1, '#6a1010']]) : 'rgba(255,255,255,0.06)';
    roundRectPath(g, x - 4, y - 4, 70, 15, 7.5); g.fill();
    if (sel && game.menu === 1 && blink(3)) { g.strokeStyle = C.gold; g.lineWidth = 0.7; g.stroke(); }
    T(g, DIFFS[lv].name, x + 31, y - 0.5, sel ? C.ink : C.dim, { align: 'center', weight: 700, scale: lv === 'grandmaster' ? 0.9 : 1.05 });
    hitArea(x - 6, y - 6, x + 68, y + 12, { level: lv });
  });
  T(g, (DIFFS[settings.level] || DIFFS.disciple).blurb, W / 2, y + 14, '#a898a8', { align: 'center' });
  const iy = 169, on = !!settings.invincible;
  T(g, 'INVINCIBLE', 22, iy, game.menu === 2 ? C.ink : C.dim, { weight: 700 });
  g.fillStyle = on ? lgrad(g, 0, iy - 4, 0, iy + 11, [[0, '#7a5aff'], [1, '#3a1e9a']]) : 'rgba(255,255,255,0.06)';
  roundRectPath(g, 92, iy - 4, 52, 15, 7.5); g.fill();
  if (game.menu === 2 && blink(3)) { g.strokeStyle = C.gold; g.lineWidth = 0.7; g.stroke(); }
  disc(g, on ? 136 : 100, iy + 3.5, 5, on ? '#ffffff' : '#7a6a78');
  T(g, on ? 'ON' : 'OFF', on ? 110 : 128, iy - 0.5, on ? C.ink : C.dim, { align: 'center', weight: 700 });
  T(g, on ? 'NO DAMAGE, NO TIME LIMIT. SCORES ARE NOT RANKED.' : 'TAKE NO DAMAGE AT ALL. GREAT FOR PRACTICE.', 152, iy, on ? '#c8b8ff' : '#8a7a90');
  hitArea(88, iy - 6, 148, iy + 12, { inv: true });
  const by = 192, sel = game.menu === 3;
  g.fillStyle = lgrad(g, 0, by - 5, 0, by + 12, sel ? [[0, blink(3) ? '#e8402e' : '#c0322a'], [1, '#6a1010']] : [[0, '#4a1a1a'], [1, '#2a0e10']]);
  roundRectPath(g, W / 2 - 52, by - 5, 104, 17, 8.5); g.fill();
  g.strokeStyle = '#ffd27a'; g.lineWidth = sel ? 0.9 : 0.4; g.stroke();
  const sf = startFloorPick(), many = PROG.reached > 0;
  T(g, many ? 'BEGIN: FLOOR ' + (sf + 1) : 'BEGIN', W / 2, by - 1.6, C.ink, { align: 'center', weight: 700, scale: many ? 1.05 : 1.25 });
  if (many && sel) { T(g, '<', W / 2 - 62, by - 1.6, C.gold, { align: 'center', weight: 700 }); T(g, '>', W / 2 + 62, by - 1.6, C.gold, { align: 'center', weight: 700 }); }
  hitArea(W / 2 - 54, by - 7, W / 2 + 54, by + 14, { go: true });
  T(g, '< BACK', 8, 205, C.dim); hitArea(2, 199, 60, 216, { back: true });
  T(g, input.usingTouch ? 'TAP TO CHOOSE' : 'UP/DOWN ROW   LEFT/RIGHT CHANGE', W - 6, 205, '#8a7a90', { align: 'right' });
}

function drawScores(g) {
  drawTitleBackdrop(g, 0.75);
  bigTitle(g, 'MASTERS OF THE PAGODA', W / 2, 20, 2);
  panel(g, 56, 46, W - 112, 116);
  T(g, 'RANK', 72, 52, C.dim, { scale: 0.85 }); T(g, 'SCORE', 168, 52, C.dim, { align: 'center', scale: 0.85 }); T(g, 'NAME', 236, 52, C.dim, { align: 'center', scale: 0.85 }); T(g, 'FLOOR', 300, 52, C.dim, { align: 'center', scale: 0.85 });
  const ranks = ['1ST', '2ND', '3RD', '4TH', '5TH'];
  const cols = ['#ffd27a', '#eef2f6', '#e8a878', C.cyan, C.cyan];
  game.scores.forEach((e, i) => {
    const y = 68 + i * 18;
    const hl = game.entry && game.entry.done && game.entry.rank === i && blink(4);
    const c = hl ? '#ffffff' : cols[i];
    if (i === 0) drawGlow(g, 76, y + 5, 10, '#ffd27a', 0.4);
    T(g, ranks[i], 72, y, c, { weight: 700, scale: 1.15 }); T(g, pad7(e.s), 168, y, c, { align: 'center', weight: 700, scale: 1.15 });
    T(g, e.n, 236, y, c, { align: 'center', weight: 700, scale: 1.15 }); T(g, e.st >= 6 ? 'TOP' : e.st + 'F', 300, y, c, { align: 'center', weight: 700, scale: 1.15 });
  });
  if (!game.attract && blink(1.4)) T(g, input.usingTouch ? 'TAP TO RETURN' : 'PRESS PUNCH TO RETURN', W / 2, 178, C.ink, { align: 'center', weight: 700 });
  if (game.attract) T(g, 'THE PAGODA AWAITS. PRESS START.', W / 2, 178, blink(1.4) ? C.gold : C.dim, { align: 'center', weight: 700 });
}

function drawHowTo(g) {
  drawTitleBackdrop(g, 0.85);
  const p = game.page || 0;
  T(g, 'HOW TO PLAY  ' + (p + 1) + ' / ' + HOWTO_PAGES, W / 2, 9, C.gold, { align: 'center', weight: 700, scale: 1.15 });
  panel(g, 12, 26, W - 24, 160);
  const L = (s, x, y, c, o) => T(g, s, x, y, c || C.ink, o);
  if (p === 0) {
    L('CONTROLS', 24, 33, C.cyan, { weight: 700, scale: 1.1 });
    L('KEYBOARD', 112, 49, C.gold, { weight: 700 }); L('GAMEPAD', 222, 49, C.gold, { weight: 700 }); L('TOUCH', 306, 49, C.gold, { weight: 700 });
    const rows = [
      ['MOVE', 'ARROWS / WASD', 'STICK', 'PAD'],
      ['PUNCH', 'Z  J', 'X', 'P'],
      ['KICK', 'X  K', 'B', 'K'],
      ['JUMP', 'SPACE  UP', 'A  UP', 'J'],
      ['CHI / STAR', 'C  L  SHIFT', 'Y  LB  RB', 'CHI'],
      ['DASH', 'V  Q  OR TAP TWICE', 'LT  RT', 'TAP TWICE'],
      ['PAUSE', 'P  ESC', 'START', 'II']
    ];
    rows.forEach((r, i) => { const y = 62 + i * 12; rect(g, 22, y - 1.5, W - 44, 0.4, 'rgba(255,220,160,0.12)'); L(r[0], 24, y, C.dim); L(r[1], 112, y); L(r[2], 222, y); L(r[3], 306, y); });
    L('M MUTES THE SOUND.  HOLD DOWN TO CROUCH AND HIT LOW.', 24, 150, C.dim);
  } else if (p === 1) {
    L('NINJA ARTS', 24, 33, C.cyan, { weight: 700, scale: 1.1 });
    L('DOUBLE TAP LEFT OR RIGHT, OR PRESS V, TO SHADOW STEP.', 24, 48);
    L('A SHADOW STEP DODGES EVERY HIT, AND WORKS IN THE AIR.', 24, 59);
    L('ATTACK RIGHT AFTER A DASH FOR A SHADOW STRIKE FINISHER.', 24, 70, C.gold);
    L('JUMP AGAIN IN MID AIR TO SOMERSAULT. LIAN FLIPS TWICE.', 24, 84);
    L('HOLD TOWARD A WALL TO SLIDE, THEN JUMP TO KICK OFF IT.', 24, 95);
    L('TAP JUMP FOR A SHORT HOP, HOLD IT TO JUMP HIGH.', 24, 106);
    L('WEAPONS', 24, 122, C.cyan, { weight: 700, scale: 1.1 });
    L('NUNCHAKU AND BO STAFF POWER UP PUNCHES UNTIL THEY BREAK.', 24, 137);
    L('SHURIKEN: PRESS CHI WHILE THE METER IS NOT FULL TO THROW.', 24, 148, C.gold);
    L('NINJAS THROW STARS TOO. PUNCH THEM TO SEND THEM BACK!', 24, 159);
  } else if (p === 2) {
    L('COMBAT', 24, 33, C.cyan, { weight: 700, scale: 1.1 });
    L('LAND TWO HITS, THEN A THIRD FOR A FINISHER THAT LAUNCHES FOES.', 24, 50);
    L('DOWN + KICK SWEEPS.  DOWN + PUNCH HITS LOW.', 24, 64);
    L('JUMP + KICK OR PUNCH STRIKES FROM ABOVE.', 24, 76);
    L('HIT A THROWN DAGGER TO DEFLECT IT BACK AT THE THROWER!', 24, 92, C.gold);
    L('HITS FILL YOUR CHI. WHEN IT IS FULL, PRESS CHI FOR THE', 24, 108, C.gold);
    L('DRAGON WAVE: IT CLEARS THE HALL AND WOUNDS GUARDIANS.', 24, 120, C.gold);
    L('QUICK KNOCKOUTS BUILD A CHAIN BONUS.', 24, 136);
    L('GUARDIANS BLOCK WHILE THEY WAIT: STRIKE AFTER THEIR ATTACKS.', 24, 150);
  } else {
    L('SURVIVAL', 24, 33, C.cyan, { weight: 700, scale: 1.1 });
    L('THUGS GRAB AND SQUEEZE: MASH LEFT AND RIGHT TO BREAK FREE.', 24, 50);
    L('HIGH DAGGER: CROUCH.   LOW DAGGER: JUMP.', 24, 64);
    L('SHIELD MONKS BLOCK HIGH: SWEEP THEM.', 24, 76);
    L('BREAK FALLING VASES IN THE AIR FOR TREASURE.', 24, 88);
    L('A WHITE GLINT MEANS AN ATTACK IS COMING.', 24, 104, C.gold);
    L("EACH FLOOR HAS A TIMER. DON'T DAWDLE.", 24, 116, C.gold);
    L('EXTRA LIFE AT 50,000, THEN EVERY 100,000.', 24, 132);
    L('FIVE FLOORS. FREE GRANDMASTER HU!', 24, 150, C.green, { weight: 700 });
  }
  T(g, '< BACK', 18, 196, C.dim, { weight: 700 }); hitArea(8, 190, 80, 210, { back: true });
  T(g, p < HOWTO_PAGES - 1 ? 'NEXT >' : 'DONE >', W - 18, 196, blink(1.5) ? C.gold : C.ink, { align: 'right', weight: 700 }); hitArea(W - 90, 190, W - 6, 210, { next: true });
}

function drawOptions(g) {
  if (game.optFrom === 'pause') { drawWorld(g); drawHUD(g); rect(g, 0, 0, W, H, 'rgba(0,0,0,0.6)'); }
  else drawTitleBackdrop(g, 0.8);
  bigTitle(g, 'OPTIONS', W / 2, 20, 2);
  OPTION_ITEMS.forEach((it, i) => {
    const y = 58 + i * 20, sel = game.menu === i;
    menuBar(g, 60, y - 4, W - 120, 15, sel);
    T(g, it, 76, y - 0.5, sel ? C.ink : C.dim, { weight: 700, scale: 1.1 });
    let val = '';
    if (it === 'MUSIC' || it === 'EFFECTS') {
      const v = Math.round((it === 'MUSIC' ? settings.music : settings.sfx) * 10);
      for (let k = 0; k < 10; k++) rrect(g, 214 + k * 8, y, 6, 7, 1.5, k < v ? (sel ? C.gold : '#c9a463') : '#2a1e24');
    } else if (it === 'GLOW FX') val = settings.fx ? 'ON' : 'OFF';
    else if (it === 'SCREEN SHAKE') val = settings.shake ? 'ON' : 'OFF';
    else if (it === 'TOUCH PAD') val = (settings.touch || 'auto').toUpperCase();
    if (val) T(g, '<  ' + val + '  >', 254, y - 0.5, sel ? C.gold : C.ink, { align: 'center', weight: 700, scale: 1.1 });
    if (it !== 'BACK') { hitArea(200, y - 5, 238, y + 11, { i, dir: -1 }); hitArea(270, y - 5, 310, y + 11, { i, dir: 1 }); hitArea(60, y - 5, 199, y + 11, { i, dir: 1 }); }
    else hitArea(60, y - 5, W - 60, y + 11, { i });
  });
  T(g, input.usingTouch ? 'TAP < > TO CHANGE' : 'LEFT / RIGHT TO CHANGE    CHI TO GO BACK', W / 2, 190, '#9a8aa0', { align: 'center' });
}

/** The pagoda in cross-section, with the current floor lit. */
function drawPagodaMap(g, x0, y0, cur) {
  const tiers = FLOORS.length;
  drawGlow(g, x0, y0 + 60, 70, '#ff7a3a', 0.25);
  for (let i = 0; i < tiers; i++) {
    const fi = tiers - 1 - i;
    const w = 70 + fi * 12, y = y0 + i * 26, x = x0 - w / 2;
    const done = fi < cur, now = fi === cur;
    g.fillStyle = lgrad(g, x, y + 1, x + w, y + 21, now ? [[0, '#6a1e16'], [1, '#2a0a08']] : done ? [[0, '#3a2016'], [1, '#1a0c08']] : [[0, '#1e1218'], [1, '#0e080c']]);
    g.fillRect(x, y + 1, w, 20);
    for (let k = 0; k < 4; k++) {
      const wx = x + 6 + (k * (w - 12)) / 3 - 2.2;
      g.fillStyle = now ? lgrad(g, 0, y + 6, 0, y + 15, [[0, '#fff2b0'], [1, '#ff8a3a']]) : done ? '#7a5a2a' : '#2a1e24';
      roundRectPath(g, wx, y + 6, 4.4, 9, 1.4); g.fill();
      if (now) drawGlow(g, wx + 2.2, y + 10, 7, '#ff9a40', 0.6);
    }
    g.fillStyle = lgrad(g, 0, y - 7, 0, y + 1, [[0, now ? '#6a3a2a' : '#3a2230'], [1, '#140a10']]);
    g.beginPath(); g.moveTo(x - 12, y - 6); g.quadraticCurveTo(x - 2, y + 1, x + w * 0.2, y); g.lineTo(x + w * 0.8, y); g.quadraticCurveTo(x + w + 2, y + 1, x + w + 12, y - 6); g.lineTo(x + w * 0.75, y - 5); g.lineTo(x + w * 0.25, y - 5); g.closePath(); g.fill();
    if (now) { stampLine(g, x + w * 0.25, y - 5, x + w * 0.75, y - 5, 0.6, '#ffd27a'); }
    T(g, (fi + 1) + 'F', x - 22, y + 6, now ? C.gold : done ? '#a8823a' : '#5a4a50', { weight: 700 });
    if (now) { g.save(); g.translate(x + w / 2, y + 20.5); g.scale(0.42, 0.42); drawSprite(g, game.fighter, 'walk', game.t * 8, 1, 0, 0); g.restore(); }
  }
  rect(g, x0 - 1, y0 - 26, 2.4, 20, '#2a1620'); for (let i = 0; i < 3; i++) disc(g, x0 + 0.2, y0 - 10 - i * 5, 2.4 - i * 0.4, '#d9a43a');
}

function drawIntro(g) {
  drawWorld(g);
  g.fillStyle = lgrad(g, 0, 0, W, 0, [[0, 'rgba(10,4,10,0.9)'], [0.6, 'rgba(10,4,10,0.82)'], [1, 'rgba(10,4,10,0.7)']]); g.fillRect(0, 0, W, H);
  const t = game.stateT, F = game.F;
  drawPagodaMap(g, 82, 46, game.floorIdx);
  const slide = Math.min(1, t / 0.35), x = 250;
  T(g, 'FLOOR ' + (game.floorIdx + 1), x + (1 - slide) * 200, 32, C.red, { align: 'center', weight: 700, scale: 1.5 });
  if (t > 0.3) bigTitle(g, F.name, x + (1 - Math.min(1, (t - 0.3) / 0.35)) * 200, 48, 2.2);
  if (t > 0.8) { T(g, F.brief[0], x, 82, C.cyan, { align: 'center' }); T(g, F.brief[1], x, 94, C.cyan, { align: 'center' }); }
  if (t > 1.3) { T(g, 'GUARDIAN', x, 116, C.dim, { align: 'center', scale: 0.85 }); T(g, BOSS_DEFS[F.boss].name, x, 126, C.gold, { align: 'center', weight: 700, scale: 1.3 }); }
  if (t > 1.8) T(g, F.dir > 0 ? 'WALK EAST  →' : '←  WALK WEST', x, 150, '#a898a8', { align: 'center', weight: 600 });
  if (t > 2.0 && blink(3)) bigTitle(g, 'GET READY', x, 172, 1.7);
}

function drawClear(g) {
  drawWorld(g);
  const t = game.stateT;
  rect(g, 0, 0, W, H, 'rgba(10,4,10,' + Math.min(0.84, t * 2) + ')');
  bigTitle(g, 'FLOOR ' + (game.floorIdx + 1) + ' CLEAR', W / 2, 22, 2.2);
  T(g, game.F.name, W / 2, 48, C.cyan, { align: 'center', weight: 700 });
  panel(g, 48, 62, W - 96, 92);
  game.tally.forEach((row, i) => {
    if (i > game.tallyIdx) return;
    const y = 70 + i * 16;
    T(g, row.label, 62, y, C.dim, { weight: 600 });
    T(g, row.val, 236, y, C.ink, { align: 'right', weight: 700 });
    if (row.pts) T(g, '+' + row.pts, W - 62, y, C.green, { align: 'right', weight: 700 });
  });
  T(g, 'SCORE  ' + pad7(game.score), W / 2, 162, C.ink, { align: 'center', weight: 700, scale: 1.3 });
  if (game.tallyDone && blink(2)) T(g, game.floorIdx + 1 < FLOORS.length ? 'UP TO FLOOR ' + (game.floorIdx + 2) + ':  ' + FLOORS[game.floorIdx + 1].name : 'TO THE SUMMIT', W / 2, 184, C.gold, { align: 'center', weight: 700 });
}

function drawContinue(g) {
  drawWorld(g);
  rect(g, 0, 0, W, H, 'rgba(10,4,10,0.74)');
  bigTitle(g, 'CONTINUE?', W / 2, 46, 2.4);
  const n = Math.max(0, Math.ceil(game.contT) - 1);
  bigTitle(g, String(n), W / 2, 74, 5, { fill: n <= 3 ? '#ff6a5a' : undefined });
  if (blink(2)) T(g, input.usingTouch ? 'TAP TO CONTINUE' : 'PRESS PUNCH OR START', W / 2, 140, C.ink, { align: 'center', weight: 700 });
  T(g, 'YOUR SCORE STAYS.  CONTINUES: ' + game.continues, W / 2, 156, C.dim, { align: 'center' });
  hitArea(0, 0, W, H, { cont: true });
}

function drawGameOver(g) {
  drawWorld(g);
  rect(g, 0, 0, W, H, 'rgba(10,4,10,' + Math.min(0.8, game.stateT) + ')');
  bigTitle(g, 'GAME OVER', W / 2, 78, 3.4, { fill: lgrad(g, 0, 78, 0, 106, [[0, '#ffb0a0'], [1, '#c02a20']]) });
  T(g, 'SCORE  ' + pad7(game.score), W / 2, 122, C.ink, { align: 'center', weight: 700, scale: 1.2 });
}

function drawPause(g) {
  drawWorld(g); drawHUD(g);
  rect(g, 0, 0, W, H, 'rgba(10,4,10,0.66)');
  bigTitle(g, 'PAUSED', W / 2, 48, 2.4);
  PAUSE_ITEMS.forEach((it, i) => {
    const y = 84 + i * 17, sel = game.menu === i;
    menuBar(g, W / 2 - 62, y - 4, 124, 14, sel);
    T(g, it, W / 2 + (sel ? 3 : 0), y - 1, sel ? C.ink : C.dim, { align: 'center', weight: 700, scale: 1.15 });
    hitArea(W / 2 - 80, y - 5, W / 2 + 80, y + 11, { i });
  });
  T(g, 'FLOOR ' + (game.floorIdx + 1) + '   ' + game.F.name, W / 2, 158, C.cyan, { align: 'center', weight: 700 });
  T(g, controlHint(), W / 2, 196, '#9a8aa0', { align: 'center', scale: 0.85 });
}

function drawEntry(g) {
  drawTitleBackdrop(g, 0.8);
  const E = game.entry;
  if (E.done) { drawScores(g); return; }
  bigTitle(g, 'NEW HIGH SCORE!', W / 2, 16, 2.2);
  T(g, ['1ST', '2ND', '3RD', '4TH', '5TH'][E.rank] + ' PLACE    ' + pad7(game.score), W / 2, 44, C.ink, { align: 'center', weight: 700, scale: 1.1 });
  T(g, 'ENTER YOUR INITIALS', W / 2, 62, C.cyan, { align: 'center' });
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 45 + i * 34, y = 96;
    const sel = E.pos === i;
    panel(g, x - 2, y - 6, 26, 32, sel ? { lw: 1 } : { border: '#4a3040' });
    T(g, ENTRY_CHARS[E.chars[i]] === ' ' ? '_' : ENTRY_CHARS[E.chars[i]], x + 11, y - 1, sel && blink(4) ? C.gold : C.ink, { align: 'center', scale: 2.8, weight: 700 });
    T(g, '▲', x + 11, y - 16, sel ? C.gold : C.dim, { align: 'center' });
    T(g, '▼', x + 11, y + 30, sel ? C.gold : C.dim, { align: 'center' });
    hitArea(x - 4, y - 20, x + 26, y - 4, { up: i });
    hitArea(x - 4, y + 26, x + 26, y + 42, { down: i });
    hitArea(x - 2, y - 4, x + 24, y + 26, { slot: i });
  }
  T(g, 'OK', W / 2 + 80, 100, C.green, { scale: 1.8, weight: 700 }); hitArea(W / 2 + 70, 94, W / 2 + 104, 124, { ok: true });
  T(g, 'TIME ' + Math.max(0, Math.ceil(E.t)), W / 2, 146, C.dim, { align: 'center' });
  T(g, input.usingTouch ? 'TAP THE ARROWS, THEN OK' : 'TYPE, OR UP/DOWN THEN PUNCH', W / 2, 164, '#9a8aa0', { align: 'center' });
}

function drawEnding(g) {
  g.fillStyle = lgrad(g, 0, 0, 0, H, [[0, '#2a2a6a'], [0.4, '#8a4a8a'], [0.7, '#f08a6a'], [1, '#ffe0a0']]); g.fillRect(0, 0, W, H);
  const sunY = 150 - Math.min(44, game.stateT * 3);
  drawGlow(g, 300, sunY, 80, '#fff0c0', 0.8);
  disc(g, 300, sunY, 18, '#fff6d8');
  const R = seeded(77);
  ridgeHD(g, W, 160, [[2, 30], [5, 10]], true, '#7a4a8a', '#3a2448', R);
  ridgeHD(g, W, 176, [[3, 16], [7, 5]], true, '#4a2c5a', '#24142e', R);
  g.fillStyle = lgrad(g, 0, 150, 0, 178, [[0, '#9a90a4'], [1, '#4a4254']]); g.fillRect(0, 172, W, 6);
  for (let x = 0; x < W; x += 18) { g.fillStyle = lgrad(g, x + 4, 0, x + 10, 0, [[0, '#a89cb0'], [1, '#4a4254']]); roundRectPath(g, x + 4, 156, 6, 16, 2.4); g.fill(); }
  g.fillStyle = lgrad(g, 0, 178, 0, H, [[0, '#7a7084'], [1, '#2a2434']]); g.fillRect(0, 178, W, H - 178);
  drawShadow(g, 150, 196, 9, 0); drawShadow(g, 196, 196, 9, 0);
  drawSprite(g, game.fighter, 'victory', 0, 1, 150, 196);
  drawSprite(g, 'master', game.stateT % 6 < 3 ? 'bow' : 'idle', 0, -1, 196, 196);
  for (let i = 0; i < 18; i++) {
    const x = ((i * 61 - game.t * (16 + (i % 4) * 5)) % (W + 20) + W + 20) % (W + 20) - 10;
    const y = ((i * 41 + game.t * (9 + (i % 3) * 4)) % (H + 10)) - 5;
    g.save(); g.translate(x, y); g.rotate(game.t * 2 + i); ellipse(g, 0, 0, 1.5, 0.7, 0, i % 2 ? '#ffd0dc' : '#ff9ab8'); g.restore();
  }
  g.fillStyle = 'rgba(20,8,24,0.35)'; g.fillRect(0, 0, W, 140);
  const y0 = H + 10 - game.endScroll;
  const vis = (y) => y > 8 && y < 136;
  ENDING_LINES.forEach(([str, c], i) => {
    const y = y0 + i * 12;
    if (!vis(y)) return;
    if (i === 0 || str === 'DRAGON PAGODA') bigTitle(g, str, W / 2, y - 2, 1.4);
    else T(g, str, W / 2, y, c, { align: 'center', weight: 600, raw: str.startsWith('"') });
  });
  const yS = Math.max(64, y0 + ENDING_LINES.length * 12 + 18);
  if (vis(yS)) T(g, 'FINAL SCORE  ' + pad7(game.score), W / 2, yS, C.gold, { align: 'center', weight: 700, scale: 1.3 });
  if (yS <= 64 && blink(2)) T(g, input.usingTouch ? 'TAP TO CONTINUE' : 'PRESS PUNCH', W / 2, 88, C.ink, { align: 'center', weight: 700 });
}

/* ---- frame ------------------------------------------------------------------------------ */
/** Rebuild cached paintings when the screen scale changes enough to matter. */
function ensureArtScale() {
  const want = clamp(view.scale, 1, 4);
  if (Math.abs(want - RS) <= RS * 0.12) return;
  RS = Math.round(want * 100) / 100;
  for (const k in ART_CACHE) delete ART_CACHE[k];
  if (game.L) game.L = floorArt(game.F);
}

function renderFrame() {
  const cv = $('screen'), g = cv.getContext('2d');
  game.hits = [];
  ensureArtScale();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#07040a'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  g.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'low';
  g.save();
  g.beginPath(); g.rect(0, 0, W, H); g.clip();
  switch (game.state) {
    case 'boot': drawBoot(g); break;
    case 'title': drawTitle(g); break;
    case 'select': drawSelect(g); break;
    case 'scores': drawScores(g); break;
    case 'medals': drawMedals(g); break;
    case 'howto': drawHowTo(g); break;
    case 'options': drawOptions(g); break;
    case 'intro': drawIntro(g); break;
    case 'play': drawWorld(g); if (!DBG.noHud) drawHUD(g); drawBanners(g); break;
    case 'pause': drawPause(g); break;
    case 'clear': drawClear(g); drawHUD(g); break;
    case 'continue': drawContinue(g); drawHUD(g); break;
    case 'gameover': drawGameOver(g); drawHUD(g); break;
    case 'entry': drawEntry(g); break;
    case 'ending': drawEnding(g); break;
    default: break;
  }
  if (game.fadeT > 0) { g.globalAlpha = Math.min(1, game.fadeT / 0.22); rect(g, 0, 0, W, H, '#000000'); g.globalAlpha = 1; }
  drawMedalToast(g);
  if (game.toast) {
    game.toast.t += 1 / 60;
    if (game.toast.t > 1.6) game.toast = null;
    else { const w = textWidth(game.toast.s) + 14; rrect(g, W / 2 - w / 2, H - 22, w, 13, 6.5, 'rgba(14,6,12,0.88)'); T(g, game.toast.s, W / 2, H - 19.6, C.gold, { align: 'center', weight: 700 }); }
  }
  g.restore();
}
