/* ==========================================================================
   Rendering: world, lighting and HUD, drawn straight to the screen in world
   units under one transform, so everything stays crisp at any resolution.
   ========================================================================== */

const view = { scale: 2, ox: 0, oy: 0, zoom: 1, dy: 0, pan: 0 };

const C = {
  ink: '#ffffff', dim: '#9aa6b8', red: '#e8392a', gold: '#ffd27a', cyan: '#9fe8ff', green: '#4ad16a', shadow: 'rgba(0,0,0,0.75)',
  steel: '#c9d6e6', line: '#3a4a6a'
};

function hitArea(x0, y0, x1, y1, data) { game.hits.push(Object.assign({ x0, y0, x1, y1 }, data)); }
function T(g, s, x, y, col, o) { return drawText(g, s, x, y, col || C.ink, Object.assign({ shadow: C.shadow }, o || {})); }
function blink(rate) { return Math.floor(game.t * (rate || 2)) % 2 === 0; }
function pad7(n) { return String(Math.max(0, Math.floor(n))).padStart(7, '0'); }

/** Gunmetal panel with a thin lit rim. */
function panel(g, x, y, w, h, o) {
  o = o || {};
  g.fillStyle = lgrad(g, 0, y, 0, y + h, [[0, o.top || 'rgba(22,28,44,0.93)'], [1, o.bot || 'rgba(8,10,20,0.93)']]);
  roundRectPath(g, x, y, w, h, o.r === undefined ? 2.5 : o.r); g.fill();
  g.strokeStyle = o.border || lgrad(g, x, y, x + w, y + h, [[0, '#8fa4c8'], [0.5, '#3a4a6a'], [1, '#1c2438']]);
  g.lineWidth = o.lw || 0.6; g.stroke();
}
/** Highlight behind the selected menu row. */
function menuBar(g, x, y, w, h, on) {
  if (!on) return;
  g.fillStyle = lgrad(g, x, 0, x + w, 0, [[0, 'rgba(232,57,42,0)'], [0.12, 'rgba(232,57,42,0.85)'], [0.5, 'rgba(160,26,24,0.9)'], [0.88, 'rgba(232,57,42,0.85)'], [1, 'rgba(232,57,42,0)']]);
  g.fillRect(x, y, w, h);
  rect(g, x + w * 0.12, y, w * 0.76, 0.5, 'rgba(255,210,122,0.9)'); rect(g, x + w * 0.12, y + h - 0.5, w * 0.76, 0.5, 'rgba(255,210,122,0.5)');
}
/** Stencil headline with a steel gradient. */
function bigTitle(g, s, x, y, scale, o) {
  o = o || {};
  g.font = '400 ' + 8.4 * scale + 'px ' + FONT_DISPLAY;
  g.textBaseline = 'top'; g.textAlign = o.align || 'center'; g.lineJoin = 'round';
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(s, x + 0.5 * scale, y + 0.7 * scale);
  g.strokeStyle = o.stroke || '#5a0e10'; g.lineWidth = 1.1 * scale; g.strokeText(s, x, y);
  g.fillStyle = o.fill || lgrad(g, 0, y, 0, y + 8.4 * scale, [[0, '#ffffff'], [0.45, '#dbe5f0'], [0.55, '#8fa4bf'], [1, '#c9d6e6']]);
  g.fillText(s, x, y);
  g.textAlign = 'left';
}

/* ---- world ---------------------------------------------------------------------- */
function drawBackdrop(g, L, st, cx, k) {
  const art = ART[st.id];
  blitArt(g, L.sky, 0, 0, W, H, 0, 0);
  drawLayer(g, L.clouds, cx * 0.05 * k + game.t * 3.2);
  drawLayer(g, L.far, cx * 0.12 * k);
  const mx = (((cx * 0.35 * k) % LAYER_W) + LAYER_W) % LAYER_W;
  drawLayer(g, L.mid, mx);
  if (art.live && settings.fx) art.live(g, mx, game.t);
  drawLayer(g, L.near, cx * 0.6 * k);
}

function drawLights(g, L, cx) {
  if (!settings.fx || QUALITY.level > 1) return;
  for (const l of L.lights) {
    const x = l.x - cx;
    if (x < -l.r || x > W + l.r) continue;
    let a = 0.8;
    if (l.blink) { if (((game.t / l.blink + l.ph) % 1) > 0.5) continue; }
    else if (l.f) a = 0.8 * (1 - l.f * (0.5 + 0.5 * Math.sin(game.t * 9 + l.ph) * Math.sin(game.t * 23 + l.ph * 3)));
    drawGlow(g, x, l.y, l.r, l.col, a);
    if (l.flame) {
      const fl = 0.8 + 0.2 * Math.sin(game.t * 14 + l.ph);
      for (const [w, h, c] of [[3.4, 8, '#ff7a2a'], [2.2, 5.6, '#ffc24a'], [1, 3, '#fff4c0']]) {
        g.fillStyle = c; g.beginPath(); g.moveTo(x - w / 2, l.y + 2);
        g.quadraticCurveTo(x - w * 0.7, l.y + 2 - h * 0.5 * fl, x + Math.sin(game.t * 9 + l.ph) * 0.9, l.y + 2 - h * fl);
        g.quadraticCurveTo(x + w * 0.7, l.y + 2 - h * 0.5 * fl, x + w / 2, l.y + 2); g.closePath(); g.fill();
      }
    }
  }
}

const GRADE_CACHE = {};
/** Colour grade and vignette that tie each stage together. */
function drawGrade(g, st) {
  const A = ART[st.id].grade, key = st.id + (settings.fx ? 1 : 0);
  let c = GRADE_CACHE[key];
  if (!c) {
    c = makeCanvas(192, 108);
    const q = c.getContext('2d');
    if (settings.fx) { q.fillStyle = A[0]; q.fillRect(0, 0, 192, 108); }
    q.fillStyle = rgrad(q, 96, 58, 44, 124, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,' + A[1] + ')']]);
    q.fillRect(0, 0, 192, 108);
    GRADE_CACHE[key] = c;
  }
  g.drawImage(c, 0, 0, W, H);
}

function drawWeather(g) {
  const kind = game.st.weather;
  for (const p of game.wx) {
    const x = p.x, y = p.y;
    if (kind === 'snow') { g.globalAlpha = 0.55 + p.s * 0.45; disc(g, x, y, 0.5 + p.s * 0.7, '#ffffff'); }
    else if (kind === 'rain') { g.globalAlpha = 0.34; stampLine(g, x, y, x - 1.6, y + 7.5, 0.4, '#b4c6f0'); }
    else if (kind === 'dust') { g.globalAlpha = 0.25 + p.s * 0.4; stampLine(g, x, y, x + 2 + p.s * 3, y, 0.4, '#ffd8a0'); }
    else {
      const a = 0.35 + 0.5 * Math.abs(Math.sin(game.t * 1.6 + p.ph));
      if (p.s > 0.7 && QUALITY.level < 2) drawGlow(g, x, y, 3.2, '#fff2a0', a * 0.7);
      g.globalAlpha = a; disc(g, x, y, 0.45 + p.s * 0.3, '#fff6b0');
    }
  }
  g.globalAlpha = 1;
}

function drawWorldInner(g) {
  const st = game.st, L = stageArt(st);
  game.L = L;
  const cx = game.camX, art = ART[st.id];
  let sx = 0, sy = 0;
  if (game.shake > 0.3 && game.state !== 'pause') { sx = rand(-1, 1) * game.shake; sy = rand(-1, 1) * game.shake * 0.6; }
  g.save();
  g.translate(sx, sy);
  if (!DBG.noBack) drawBackdrop(g, L, st, cx, 1);
  drawLevel(g, L, st, cx);
  const h = game.hero, b = game.boss;
  for (const p of game.props) { drawProp(g, p, cx, false); drawProp(g, p, cx, true); }
  for (const e of game.foes) if (e.st !== 'dead' && e.st !== 'para' && e.kind !== 'dog' && !(e.T.ninja && foeGhost(e)) && onScreen(e.x, 20)) drawShadowV(g, cx, e.x, e.y, 9);
  for (const c of game.caps) drawCaptive(g, c, cx);
  if (h && !game.hideHero) drawShadowV(g, cx, h.x, h.y, 9);
  if (b && b.kind === 'ironclad') b.draw(g, cx);
  if (L.overlay) blitArt(g, L.overlay, 0, 0, L.overlay.uw, H, L.overlayX - cx, 0);
  if (!DBG.noFoes) for (const e of game.foes) if (e.st === 'dead') drawFoe(g, e, cx);
  if (!DBG.noFoes) for (const e of game.foes) if (e.st !== 'dead') drawFoe(g, e, cx);
  if (b && b.kind !== 'ironclad') b.draw(g, cx);
  for (const it of game.items) drawItem(g, it, cx);
  if (h) drawHero(g, h, cx);
  for (const s of game.shots) drawShotV(g, s, cx);
  drawFxV(g, cx);
  drawLights(g, L, cx);
  if (!DBG.noFront) {
    for (const f of L.front) {
      const fx = f.x - cx * 1.3;
      if (fx > -70 && fx < W + 70) drawFrontPiece(g, f, fx, art.frontCol, game.t);
    }
  }
  if (!DBG.noWeather) drawWeather(g);
  if (game.boomLight > 0 && settings.fx) { g.globalAlpha = Math.min(0.2, game.boomLight * 0.9); rect(g, 0, 0, W, H, '#ffb060'); g.globalAlpha = 1; }
  if (!DBG.noGrade) drawGrade(g, st);
  drawPops(g, cx);
  g.restore();
  // flashes stay gentle, and nearly off when the player prefers reduced motion
  if (game.flashT > 0) { g.globalAlpha = Math.min(reducedMotion ? 0.1 : 0.34, game.flashT * 3); rect(g, 0, 0, W, H, '#eef2ff'); g.globalAlpha = 1; }
}

/* ---- HUD --------------------------------------------------------------------------- */
function drawBladeIcon(g, x, y, kat) {
  g.save(); g.translate(x, y); g.rotate(-0.6);
  if (kat) { rect(g, -6.5, -0.6, 3.6, 1.2, '#2a2438'); rect(g, -3, -1.3, 0.8, 2.6, '#c9a24a'); inked(g, () => polyPath(g, [-2.2, -0.6, 6, -0.9, 7.6, -0.2, 6, 0.4, -2.2, 0.6]), '#e6edf5', 0.5); }
  else { rect(g, -5, -0.7, 3, 1.4, '#4a3424'); rect(g, -2.1, -1.3, 0.7, 2.6, '#8a8f98'); inked(g, () => polyPath(g, [-1.4, -0.8, 3.6, -0.6, 5.4, 0.1, 3.6, 0.7, -1.4, 0.8]), '#e6edf5', 0.5); }
  g.restore();
}

function drawHUDInner(g) {
  const h = game.hero;
  g.fillStyle = lgrad(g, 0, 0, 0, HUD_H + 5, [[0, 'rgba(6,8,16,0.92)'], [0.75, 'rgba(6,8,16,0.72)'], [1, 'rgba(6,8,16,0)']]);
  g.fillRect(0, 0, W, HUD_H + 5);
  rect(g, 0, HUD_H - 0.4, W, 0.4, 'rgba(143,164,200,0.35)');
  // portrait and health
  disc(g, 10, 9, 7.4, '#0c1020'); ring(g, 10, 9, 7.4, 0.7, game.invincible ? '#7fe6ff' : '#8fa4c8');
  g.save(); g.beginPath(); g.arc(10, 9, 6.8, 0, TAU); g.clip(); drawPortrait(g, 'hero', 9.4, 9.6, 9.5, 1); g.restore();
  T(g, pad7(game.score), 21, 1.2, C.ink, { weight: 700 });
  T(g, 'x' + game.lives, 21, 9.6, C.steel, { scale: 0.82, weight: 700, raw: true });
  if (h) {
    const max = game.diff.hp;
    for (let i = 0; i < max; i++) drawHeartV(g, 38 + i * 7.6, 13.2, 0.72, i < h.hp);
  }
  T(g, 'HI', 112, 1.2, C.red, { weight: 700 });
  T(g, pad7(game.hi), 124, 1.2, C.gold, { weight: 700 });
  if (game.chainN >= 2 && game.time - game.chainT < 1.6) T(g, 'CHAIN X' + game.chainN, 112, 9.6, Math.floor(game.t * 8) % 2 ? C.gold : '#ff9a30', { scale: 0.86, weight: 700 });
  else T(g, game.diff.name, 112, 9.8, C.dim, { scale: 0.78 });
  T(g, 'STAGE ' + (game.stageIdx + 1), 214, 1.2, C.cyan, { weight: 700 });
  T(g, game.st.name, 214, 9.8, C.dim, { scale: 0.78 });
  if (game.invincible) {
    const w = textWidth('INVINCIBLE', 0.8, { weight: 700 }) + 8;
    rrect(g, 6, HUD_H + 3, w, 8.6, 4.3, 'rgba(10,30,44,0.85)'); g.strokeStyle = '#7fe6ff'; g.lineWidth = 0.5; roundRectPath(g, 6, HUD_H + 3, w, 8.6, 4.3); g.stroke();
    T(g, 'INVINCIBLE', 10, HUD_H + 4.2, '#9fe8ff', { scale: 0.8, weight: 700 });
  }
  // blade and special weapon
  const bx = W - 78;
  panel(g, bx, 2, 31, 14, { r: 2 }); panel(g, bx + 33, 2, 42, 14, { r: 2 });
  if (h) {
    const kat = h.blade === 'katana';
    drawBladeIcon(g, bx + 8.5, 9, kat);
    T(g, kat ? String(h.bladeN) : 'INF', bx + 28, 5.6, kat ? (h.bladeN <= 5 && blink(4) ? C.red : C.cyan) : C.dim, { align: 'right', scale: 0.82, weight: 700 });
    if (h.wpn) {
      g.save(); g.translate(bx + 42, 9.4); g.scale(0.78, 0.78); PICK_DRAW[h.wpn](g); g.restore();
      T(g, 'x' + Math.ceil(h.ammo), bx + 72, 5.2, h.ammo <= (h.wpn === 'flame' ? 12 : 1) && blink(4) ? C.red : C.ink, { align: 'right', scale: 0.9, weight: 700, raw: true });
    } else T(g, 'NO SPECIAL', bx + 54, 6.2, '#5a6884', { align: 'center', scale: 0.68 });
  }
  const b = game.boss;
  if (b && game.bossSeq && game.bossSeq.st !== 'warn' && !(b.dead && b.deathT > 1.2) && game.state !== 'clear') {
    const bw = 160, x0 = W / 2 - bw / 2, y0 = HUD_H + 5, f = clamp(b.hp / b.max, 0, 1);
    T(g, b.name, W / 2, y0, C.gold, { align: 'center', scale: 0.9, display: true });
    rrect(g, x0 - 0.8, y0 + 9.2, bw + 1.6, 5.6, 1.4, 'rgba(0,0,0,0.85)');
    b.lag = b.lag === undefined ? f : Math.max(f, b.lag - 0.006);
    if (b.lag > f) rrect(g, x0, y0 + 10, bw * b.lag, 4, 1, '#ffe9c0');
    if (f > 0) { g.fillStyle = lgrad(g, 0, y0 + 10, 0, y0 + 14, [[0, '#ff8a6a'], [0.5, f < 0.3 ? '#ff3a2a' : '#e8392a'], [1, '#8a1414']]); roundRectPath(g, x0, y0 + 10, Math.max(1.5, bw * f), 4, 1); g.fill(); }
    rect(g, W / 2 - 0.3, y0 + 9.6, 0.6, 4.8, 'rgba(0,0,0,0.6)');
    g.strokeStyle = 'rgba(201,214,230,0.7)'; g.lineWidth = 0.5; roundRectPath(g, x0 - 0.8, y0 + 9.2, bw + 1.6, 5.6, 1.4); g.stroke();
  }
}

/** Medal and unlock notices slide in under the HUD. */
function drawToasts(g) {
  const q = game.toasts[0];
  if (!q) return;
  const k = q.t < 0.25 ? q.t / 0.25 : q.t > 2.3 ? Math.max(0, (2.6 - q.t) / 0.3) : 1;
  const w = Math.max(96, textWidth(q.name, 0.92, { weight: 700 }) + 34), x = W - 5 - w, y = HUD_H + 5 - (1 - k) * 26;
  g.globalAlpha = k;
  panel(g, x, y, w, 19, { border: '#ffd27a', r: 3 });
  drawGlow(g, x + 11, y + 9.5, 12, '#ffd27a', 0.7);
  drawMedalIcon(g, x + 11, y + 9.5, 1, true);
  T(g, q.title, x + 22, y + 2.6, C.gold, { scale: 0.7, weight: 700 });
  T(g, q.name, x + 22, y + 9, C.ink, { scale: 0.92, weight: 700 });
  g.globalAlpha = 1;
}

function drawMedalIcon(g, x, y, s, got) {
  g.save(); g.translate(x, y); g.scale(s, s);
  poly(g, [-3, -7, -0.4, -7, 1.2, -2, -1.6, -2], got ? '#c8322a' : '#3a4050'); poly(g, [0.4, -7, 3, -7, 1.6, -2, -1.2, -2], got ? '#2a5ab4' : '#2e3442');
  disc(g, 0, 1.6, 4.9, '#10141e'); disc(g, 0, 1.6, 4.2, got ? '#f2c94c' : '#4a5264'); disc(g, -0.8, 0.8, 2.6, got ? '#ffe9a0' : '#5c667a');
  g.fillStyle = got ? '#b8862a' : '#3a4252'; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 1.1 : 2.7; g.lineTo(Math.cos(a) * r, 1.6 + Math.sin(a) * r); }
  g.closePath(); g.fill();
  g.restore();
}

/* ---- banners --------------------------------------------------------------------- */
function drawBanners(g) {
  const S = game.bossSeq;
  if (game.state === 'play' && S && S.st === 'warn' && S.t > 0.2) {
    const a = 0.55 + 0.45 * Math.sin(S.t * 14);
    g.fillStyle = 'rgba(120,0,0,' + (0.3 + 0.3 * a) + ')'; g.fillRect(0, 74, W, 42);
    for (const y of [74, 113]) {
      g.save(); g.beginPath(); g.rect(0, y, W, 3); g.clip();
      for (let x = -8 + ((game.t * 30) % 12); x < W + 8; x += 12) poly(g, [x, y + 3, x + 6, y + 3, x + 9, y, x + 3, y], '#ffcc33');
      g.restore();
    }
    bigTitle(g, 'WARNING', W / 2, 80, 2.6, { fill: '#ffffff', stroke: '#7a0a0a' });
    T(g, BOSS_NAMES[game.st.boss] + ' APPROACHING', W / 2, 103, C.gold, { align: 'center', weight: 700 });
  }
  if (game.state === 'play' && game.time < 2.2 && !game.demo && game.camX < 5) {
    const k = Math.min(1, game.time / 0.25);
    g.globalAlpha = game.time > 1.8 ? (2.2 - game.time) / 0.4 : 1;
    bigTitle(g, 'GO!', W / 2, 62 - (1 - k) * 12, 4 * (0.7 + 0.3 * k), { fill: '#ffd27a' });
    g.globalAlpha = 1;
  }
  if (game.state === 'play' && game.readyT > 0 && !game.demo) {
    if (blink(5)) bigTitle(g, 'READY', W / 2, 78, 2.4);
  }
  if (game.demo) {
    if (blink(1.5)) bigTitle(g, 'DEMO PLAY', W / 2, 40, 2.2, { fill: '#ffd27a' });
    T(g, input.usingTouch ? 'TAP TO PLAY' : 'PRESS ANY KEY', W / 2, 62, C.ink, { align: 'center', weight: 700 });
  }
}

/* ---- frame ------------------------------------------------------------------------------ */
/** Repaint cached art when the screen scale changes enough to matter. */
function ensureArtScale() {
  const want = clamp(view.scale * view.zoom, 1, 3);
  if (Math.abs(want - RS) <= RS * 0.12) return;
  RS = Math.round(want * 100) / 100;
}

function renderFrame() {
  const cv = $('screen'), g = cv.getContext('2d');
  game.hits = [];
  ensureArtScale();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#05060a'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  g.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'low';
  g.save();
  g.beginPath(); g.rect(0, 0, W, H * view.zoom); g.clip();
  // menus sit centred in a zoomed (upright phone) picture; the world and HUD undo this shift themselves
  g.translate(0, view.dy);
  switch (game.state) {
    case 'boot': drawBoot(g); break;
    case 'title': drawTitle(g); break;
    case 'setup': drawSetup(g); break;
    case 'scores': drawScores(g); break;
    case 'howto': drawHowTo(g); break;
    case 'medals': drawMedals(g); break;
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
  drawToasts(g);
  if (game.fadeT > 0) { g.globalAlpha = Math.min(1, game.fadeT / 0.22); rect(g, 0, -H, W, H * 3, '#000000'); g.globalAlpha = 1; }
  g.restore();
}

/** The world, zoomed in and panned to follow the hero when the picture is taller than 16:9. */
function drawWorld(g) {
  const z = view.zoom;
  if (z <= 1.001) { view.pan = 0; drawWorldInner(g); return; }
  const h = game.hero, wv = W / z;
  let want = (W - wv) / 2;
  if (h) { const hx = h.x - game.camX; want = hx - wv * (h.face >= 0 ? 0.34 : 1 - 0.34); }
  want = clamp(want, 0, W - wv);
  view.pan = Math.abs(want - view.pan) > wv ? want : view.pan + (want - view.pan) * 0.07;
  g.save();
  g.translate(0, -view.dy); g.scale(z, z); g.translate(-view.pan, 0);
  g.beginPath(); g.rect(view.pan, 0, wv, H); g.clip();
  drawWorldInner(g);
  g.restore();
}
function drawHUD(g) {
  g.save(); g.translate(0, -view.dy);
  drawHUDInner(g);
  g.restore();
}
