/* ==========================================================================
   Rendering: the street in layers, every body sorted by depth, effects,
   the HUD, and the frame. On an upright phone the street is drawn larger
   in the top part of the screen and the camera pans to follow the fight.
   ========================================================================== */

const view = { scale: 2, ox: 0, oy: 0, zoom: 1, dy: 0 };
const C = { ink: '#ffffff', dim: '#9aa3bd', red: '#ff3d5a', gold: '#ffd27a', cyan: '#7fe9ff', green: '#7dffa0', pink: '#ff7ad0', shadow: 'rgba(0,0,0,0.7)' };
let YS = 100;                      // how far below the horizon the car's wheels sit (larger on an upright phone)
const RV = { zf: 1, hy: 98, ih: H, carY: 200, hyS: 98 };   // this frame's race view: zoom, horizon, inner height, and where the car and horizon land on screen

/* On an upright phone the menus are drawn larger, about the centre of the page. MT holds that scale. */
const MT = { s: 1 };
const MENU_TALL = { title: 1.5, select: 1.55, options: 1.45, howto: 1.45, scores: 1.38, medals: 1.85, intro: 1.4, pause: 1.7, clear: 1.45, gameover: 1.5, ending: 1.3, entry: 1.6 };
function isTall() { return view.zoom > 1.6; }
function hitArea(x0, y0, x1, y1, data) {
  const s = MT.s, cx = W / 2, cy = H / 2;
  game.hits.push(Object.assign({ x0: cx + (x0 - cx) * s, y0: cy + (y0 - cy) * s, x1: cx + (x1 - cx) * s, y1: cy + (y1 - cy) * s }, data));
}
/** Break a line of text so each part fits a width. */
function wrapText(str, maxW, scale) {
  const out = []; let line = '';
  for (const w of str.split(' ')) { const t = line ? line + ' ' + w : w; if (line && textWidth(t, scale) > maxW) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}
function T(g, s, x, y, col, o) { return drawText(g, s, x, y, col || C.ink, Object.assign({ shadow: C.shadow }, o || {})); }
function blink(rate) { return Math.floor(game.t * (rate || 2)) % 2 === 0; }
function viewH() { return H * view.zoom; }

/* The street window for this frame: where it sits on the page, how large, and which part of the world it shows. */
const SV = { zf: 1, y: 0, x0: 0, w: W };
function streetView() {
  const tall = view.zoom > 1.15, vh = viewH();
  SV.zf = tall ? Math.min(2.0, (vh - 70) / H, view.zoom) : 1;
  SV.w = W / SV.zf;
  SV.y = tall ? Math.max(30, vh - H * SV.zf) : 0;
  let mid = game.camX + W / 2;
  const live = liveHeroes();
  if (live.length) mid = live.reduce((a, h) => a + h.x, 0) / live.length;
  const want = clamp(mid - SV.w / 2, game.camX, game.camX + W - SV.w);
  const gap = game.t - (SV.t || 0); SV.t = game.t;
  SV.x0 = SV.x0 && gap < 0.2 && Math.abs(SV.x0 - want) < 400 ? approach(SV.x0, want, Math.max(2, Math.abs(want - SV.x0) * 0.12)) : want;
  if (!tall) SV.x0 = game.camX;
  return SV;
}

function depthScale(z) { return 0.92 + (z - Z0) / (Z1 - Z0) * 0.12; }

function drawStreet(g) {
  const gm = game, S = gm.stageDef, si = gm.stage, v = streetView();
  if (!S) return;
  g.save();
  g.translate(0, v.y); g.scale(v.zf, v.zf);
  g.beginPath(); g.rect(0, 0, v.w, H); g.clip();
  let sx = 0, sy = 0;
  if (settings.shake && gm.shake > 0.3 && gm.state !== 'pause') { sx = rand(-1, 1) * gm.shake * 0.5; sy = rand(-1, 1) * gm.shake * 0.4; }
  g.translate(sx, sy);
  const px = view.scale * v.zf, cam = v.x0;
  // far layer drifts at a third of the speed
  const far = cam * 0.32;
  for (let i = Math.floor(far / TILE); i * TILE < far + v.w; i++) g.drawImage(stageTile(si, 0, i, px), i * TILE - far, 0, TILE + 2, H);
  drawStageLive(g, si, cam, true);
  for (let i = Math.floor(cam / TILE); i * TILE < cam + v.w; i++) if (i >= 0) g.drawImage(stageTile(si, 1, i, px), i * TILE - cam, 0, TILE + 2, H);
  g.translate(-cam, 0);
  drawPits(g, cam, v.w);
  // shadows first, then every body back to front
  const bodies = [];
  for (const h of gm.heroes) if (h.active && !(h.state === 'dead')) bodies.push(h);
  for (const f of gm.foes) bodies.push(f);
  for (const it of gm.items) bodies.push(it);
  for (const s of gm.shots) bodies.push(s);
  for (const b of bodies) { const k = b.kind ? CHARS[b.kind].k / 1.9 : 0.8; g.globalAlpha = 0.35 * (b.alpha === undefined ? 1 : b.alpha) / (1 + (b.h || 0) / 60); g.drawImage(shadowSprite(), b.x - 18 * k, b.z - 4, 36 * k, 8); }
  g.globalAlpha = 1;
  bodies.sort((a, b) => a.z - b.z);
  for (const b of bodies) {
    if (b.type && !b.kind && b.vx === undefined) drawItem(g, b);
    else if (b.owner) drawShot(g, b);
    else if (b.kind) drawBody(g, b);
    else drawItem(g, b);
  }
  drawFxWorld(g);
  // floating score
  for (const q of gm.pops) { g.globalAlpha = Math.min(1, (1 - q.t) * 2); T(g, q.s, q.x, q.z - 70 - q.t * 18, q.col, { align: 'center', weight: 700, scale: 1.1 }); }
  g.globalAlpha = 1;
  g.translate(cam, 0);
  drawStageLive(g, si, cam, false);
  // the GO arrow
  if (gm.goT > 0 && gm.state === 'play' && blink(3)) { T(g, 'GO', v.w - 44, 60, C.gold, { align: 'center', scale: 2.4, display: true, stroke: 'rgba(0,0,0,0.7)', strokeW: 2 }); poly(g, [v.w - 28, 64, v.w - 16, 72, v.w - 28, 80], C.gold); }
  g.restore();
  // markers for anyone off the side of an upright view
  if (v.zf > 1 && gm.state === 'play') for (const f of gm.foes) { const x = (f.x - v.x0) * v.zf; if (x < 0 || x > W) { const y = v.y + (f.z - 30) * v.zf, L = x < 0; poly(g, L ? [3, y, 11, y - 5, 11, y + 5] : [W - 3, y, W - 11, y - 5, W - 11, y + 5], f.boss ? C.red : 'rgba(255,255,255,0.7)'); } }
  if (settings.fx) { g.fillStyle = rgrad(g, W / 2, v.y + H * v.zf * 0.5, H * 0.4 * v.zf, W * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,10,0.45)']]); g.fillRect(0, v.y, W, H * v.zf); }
  if (gm.flash > 0) rect(g, 0, v.y, W, H * v.zf, 'rgba(255,255,255,' + Math.min(0.5, gm.flash * 2).toFixed(3) + ')');
}

/** A hole in the front part of the floor: a lit lip at the back, dark walls, and what lies below. */
function drawPits(g, cam, vw) {
  const S = game.stageDef;
  if (!S || !S.pits) return;
  for (const p of S.pits) {
    const [x0, x1, zt] = p;
    if (x1 < cam - 20 || x0 > cam + vw + 20) continue;
    const lean = (y) => (y - zt) * 0.35;           // edges lean with depth, like the floor seams
    const bottom = H + 2;
    g.beginPath(); g.moveTo(x0, zt); g.lineTo(x1, zt); g.lineTo(x1 - lean(bottom), bottom); g.lineTo(x0 - lean(bottom), bottom); g.closePath();
    const under = S.id === 'foundry' ? [[0, '#1a0804'], [0.7, '#6a1a04'], [1, '#ff7a1a']] : S.id === 'tower' ? [[0, '#02040a'], [1, '#0e1a30']] : [[0, '#050608'], [1, '#14161c']];
    g.fillStyle = lgrad(g, 0, zt, 0, bottom, under); g.fill();
    // the far wall of the hole, in shadow
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x0, zt, x1 - x0, 10);
    if (S.id === 'tower') for (let i = 0; i < 26; i++) { const lx = x0 + 8 + ((i * 37) % Math.max(10, x1 - x0 - 16)), ly = zt + 16 + ((i * 23) % 40); rect(g, lx - lean(ly), ly, 1.6, 1.6, i % 3 ? '#ffe9a0' : '#9ad8ff'); }
    if (S.id === 'foundry') { const k = 0.5 + 0.5 * Math.sin(game.t * 4); if (settings.fx) drawGlow(g, (x0 + x1) / 2, bottom - 10, (x1 - x0) * 0.8, '#ff6a10', 0.35 + 0.2 * k); for (let i = 0; i < 8; i++) { const ph = (game.t * 0.5 + i / 8) % 1; rect(g, x0 + 10 + ((i * 29) % (x1 - x0 - 20)) - lean(bottom - ph * 50), bottom - ph * 50, 1.4, 1.4, '#ffb040'); } }
    // the lit front lip and the side edges
    rect(g, x0, zt - 1.5, x1 - x0, 2, 'rgba(255,255,255,0.28)');
    g.strokeStyle = 'rgba(255,210,74,0.75)'; g.lineWidth = 1.4; g.setLineDash([6, 4]);
    g.beginPath(); g.moveTo(x0 - 2, zt - 2); g.lineTo(x1 + 2, zt - 2); g.stroke(); g.setLineDash([]);
  }
}

function drawBody(g, f) {
  const k = depthScale(f.z);
  g.save(); g.translate(f.x, f.z - f.h); g.scale(k, k);
  if (f.spinA) { const c = -CHARS[f.kind].k * 13; g.translate(0, c); g.rotate(f.spinA); g.translate(0, -c); }
  if (f.spawnT > 0 && f.boss) g.globalAlpha = 1;
  const flash = f.flash > 0.05 ? '#ffffff' : f.inv > 0 && f.hero && f.state !== 'getup' && Math.floor(game.t * 16) % 2 ? false : null;
  // arcade blink while invincible: the figure flickers on and off
  if (f.inv > 0 && f.hero && f.state !== 'getup' && f.state !== 'down' && Math.floor(game.t * 14) % 2) { g.restore(); return; }
  const a = f.alpha === undefined ? 1 : f.alpha;
  if (f.weapon && f.weapon !== 'drum') SPRITE_SWAP = { bat: f.weapon === 'knife' ? 'knife' : f.weapon, knife: 'knife' };
  let anim = f.anim, frame = f.frame;
  if (f.weapon === 'drum' && (anim === 'idle' || anim === 'walk')) { anim = 'carry'; frame = 0; }
  else if (f.weapon && f.weapon !== 'knife' && f.weapon !== 'drum' && (anim === 'idle' || anim === 'walk')) { anim = 'hold1'; frame = 0; }
  SPRITE_HOLD = f.weapon && f.weapon !== 'drum' && f.state !== 'down' && f.state !== 'fall' ? (f.weapon === 'knife' ? 'knife' : f.weapon) : null;
  drawSprite(g, f.kind, anim, frame, f.face, 0, 0, flash, a);
  SPRITE_SWAP = null; SPRITE_HOLD = null;
  if (f.weapon === 'drum') { const k2 = CHARS[f.kind].k; g.save(); g.translate(f.face * 1, -k2 * 29); drawItem(g, { type: 'drum', x: 0, z: 0, h: 0, id: 0 }); g.restore(); }
  // a ring under each player so you can tell who is who
  if (f.hero && game.players > 1) { T(g, 'P' + (f.slot + 1), 0, -CHARS[f.kind].k * 33, f.slot ? C.cyan : C.red, { align: 'center', weight: 700, scale: 0.9 }); }
  if (f.state === 'dizzy') for (let i = 0; i < 3; i++) { const a2 = game.t * 5 + i * 2.1; disc(g, Math.cos(a2) * 8, -CHARS[f.kind].k * 31 + Math.sin(a2) * 2.4, 1.6, C.gold); }
  g.restore();
}

function drawItem(g, it) {
  const y = it.z - it.h, D = ITEM_DEF[it.type];
  g.save(); g.translate(it.x, y);
  const glow = !D.solid && Math.sin(game.t * 5 + it.id) > 0.4;
  switch (it.type) {
    case 'crate':
      rrect(g, -13, -24, 26, 24, 1.5, '#7a5230'); for (const yy of [-24, -13]) rect(g, -13, yy, 26, 2, '#5a3a20'); rect(g, -13, -24, 2, 24, '#5a3a20'); rect(g, 11, -24, 2, 24, '#5a3a20');
      g.strokeStyle = '#5a3a20'; g.lineWidth = 2; g.beginPath(); g.moveTo(-11, -22); g.lineTo(11, -2); g.stroke(); rect(g, -13, -24, 26, 1, 'rgba(255,255,255,0.25)');
      break;
    case 'drum':
      rrect(g, -10, -28, 20, 28, 2, '#8a2a20'); for (const yy of [-22, -9]) rect(g, -10, yy, 20, 2, '#5a1a12'); rect(g, -6, -26, 3, 24, 'rgba(255,255,255,0.18)');
      ellipse(g, 0, -28, 10, 3, 0, '#6a2018'); g.font = '700 5px ' + FONT_UI; g.textAlign = 'center'; g.fillStyle = '#ffd24a'; g.fillText('OIL', 0, -14);
      break;
    case 'food': disc(g, 0, -5, 7, '#f2efe6'); disc(g, -2, -7, 3.4, '#e8a03a'); disc(g, 2.6, -6, 2.6, '#7ac04a'); disc(g, 0.5, -3.4, 2.4, '#d8402a'); break;
    case 'soda': rrect(g, -3, -12, 6, 12, 1.4, '#e8302a'); rect(g, -3, -9, 6, 3, '#ffffff'); break;
    case 'cash': rrect(g, -7, -5, 14, 5, 1, '#3a9a4a'); rect(g, -2, -5, 4, 5, '#ffd24a'); break;
    case 'oneup': disc(g, 0, -7, 6, '#7dff8a'); T(g, '1UP', 0, -10, '#0a2a10', { align: 'center', weight: 700, scale: 0.7, shadow: 'rgba(0,0,0,0)' }); break;
    default:
      g.rotate(-0.1);
      drawHeldItem(g, it.type);
  }
  if (glow && settings.fx) drawGlow(g, 0, -6, 14, '#fff2c0', 0.35);
  g.restore();
}
function drawHeldItem(g, type) {
  const d = dpal(PAL.kade);
  drawHeldV(g, d, [-8, -3], type === 'bat' ? 'bat' : type, 0, 1.9, 0);
}
function drawShot(g, s) {
  if (s.type === 'drum') { g.save(); g.translate(s.x, s.z - s.h + 14); g.rotate(s.spin * 0.3); drawItem(g, { type: 'drum', x: 0, z: 0, h: 0, id: 0 }); g.restore(); return; }
  g.save(); g.translate(s.x, s.z - s.h); g.rotate(s.type === 'knife' ? 0 : s.spin); if (s.vx < 0) g.scale(-1, 1);
  drawHeldItem(g, s.type === 'knife' ? 'knife' : s.type);
  g.restore();
}
function drawFxWorld(g) {
  for (const f of game.fx) {
    const t = f.t / f.life, x = f.x, y = f.z + f.y;
    if (f.k === 'star') { g.save(); g.translate(x, y); g.rotate(f.t * 6); g.globalAlpha = 1 - t; const s = f.s * (0.6 + t * 0.8); poly(g, [0, -s, s * 0.22, -s * 0.22, s, 0, s * 0.22, s * 0.22, 0, s, -s * 0.22, s * 0.22, -s, 0, -s * 0.22, -s * 0.22], f.col); disc(g, 0, 0, s * 0.3, '#ffffff'); g.restore(); if (settings.fx) drawGlow(g, x, y, f.s * 1.6, f.col, 0.6 * (1 - t)); }
    else if (f.k === 'spark') { g.globalAlpha = 1 - t; stampLine(g, x, y, x - f.vx * 0.03, y - f.vy * 0.03, 1.1, f.col); }
    else if (f.k === 'puff') { const r = f.r * (1 + t * 1.6); g.globalAlpha = 0.35 * (1 - t); disc(g, x, y, r, f.col); }
    else if (f.k === 'ring') { g.globalAlpha = 1 - t; g.strokeStyle = f.col; g.lineWidth = 3 * (1 - t) + 0.5; g.beginPath(); g.ellipse(x, f.z, 10 + t * 80, 3 + t * 20, 0, 0, TAU); g.stroke(); }
    else if (f.k === 'bit') { g.globalAlpha = 1 - t * t; g.save(); g.translate(x, y); g.rotate(f.t * 10); rect(g, -f.r, -f.r * 0.6, f.r * 2, f.r * 1.2, f.col); g.restore(); }
  }
  g.globalAlpha = 1;
}

/* ---- HUD --------------------------------------------------------------------------------------- */
function heroPanel(g, h, x, right) {
  const al = right ? 'right' : 'left', sx = right ? -1 : 1, col = h.slot ? C.cyan : C.red;
  if (!h.active) {
    T(g, h.slot ? 'PLAYER 2' : 'PLAYER 1', x, 6, C.dim, { align: al, weight: 700, scale: 0.9 });
    if (blink(1.5)) T(g, input.usingTouch ? '' : 'PRESS ' + (h.slot ? 'Q' : 'ENTER') + ' TO JOIN', x, 16, C.gold, { align: al, weight: 700, scale: 0.85 });
    return;
  }
  // portrait
  const px = right ? x - 14 : x + 14;
  disc(g, px, 18, 13, 'rgba(10,8,18,0.85)'); g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.arc(px, 18, 13, 0, TAU); g.stroke();
  g.save(); g.beginPath(); g.arc(px, 18, 12.4, 0, TAU); g.clip(); drawPortrait(g, h.kind, px, 15, 26, right ? -1 : 1); g.restore();
  const bx = right ? x - 32 - 110 : x + 32;
  T(g, h.name, right ? x - 32 : bx, 3, '#ffffff', { align: al, weight: 700, scale: 1.1 });
  T(g, String(Math.floor(h.score)).padStart(7, '0'), right ? bx : bx + 110, 3, C.gold, { align: right ? 'left' : 'right', weight: 700, scale: 1.0 });
  // health in blocks, arcade style; the white shows recent damage draining away
  h.hpShow = h.hpShow === undefined ? h.hp : approach(h.hpShow, h.hp, 30 / 60);
  const N = 12, per = h.maxHp / N, bw = 110 / N;
  for (let i = 0; i < N; i++) {
    const k = right ? N - 1 - i : i, xx = bx + i * bw;
    const full = clamp((h.hp - k * per) / per, 0, 1), ghost = clamp((h.hpShow - k * per) / per, 0, 1);
    slab(g, xx, 14, bw - 1.2, 7, 'rgba(0,0,0,0.6)', 1.2);
    if (ghost > full) slab(g, xx, 14, (bw - 1.2), 7, 'rgba(255,255,255,0.75)', 1.2);
    if (full > 0) slab(g, xx, 14, (bw - 1.2) * (full >= 1 ? 1 : full), 7, h.hp / h.maxHp < 0.3 ? (blink(4) ? '#ff3a3a' : '#c81e1e') : col, 1.2);
  }
  // spin kick lamp
  const ready = h.spinCool <= 0;
  slab(g, right ? bx + 110 - 40 : bx, 24, 40, 4, ready ? (blink(2) ? '#fff2a0' : C.gold) : 'rgba(0,0,0,0.55)', 1.2);
  if (!ready) slab(g, right ? bx + 110 - 40 : bx, 24, 40 * (1 - h.spinCool / 2.2), 4, '#7a6a3a', 1.2);
  T(g, 'SPIN', right ? bx + 110 - 44 : bx + 44, 22.6, ready ? C.gold : C.dim, { align: right ? 'right' : 'left', weight: 700, scale: 0.7 });
  T(g, 'x' + Math.max(0, h.lives), right ? bx - 4 : bx + 114, 22.5, '#ffffff', { align: right ? 'right' : 'left', weight: 700, scale: 0.9 });
  if (h.weapon) T(g, ITEM_DEF[h.weapon].label + (h.weapon === 'drum' ? '' : ' ' + h.wUses), right ? bx + 110 : bx, 30, C.cyan, { align: al, weight: 700, scale: 0.8 });
  if (false) T(g, h.combo + ' HITS', right ? x - 6 : x + 6, 40, C.gold, { align: al, display: true, scale: 1.4 + Math.min(0.6, h.combo * 0.03), stroke: 'rgba(0,0,0,0.7)', strokeW: 1.6 });
  if (h.state === 'pinned' && blink(6)) T(g, 'BREAK FREE! PRESS ANY BUTTON', right ? bx + 110 : bx, 32, C.red, { align: al, weight: 700, scale: 0.85 });
  if (h.state === 'dead') { T(g, 'CONTINUE? ' + Math.max(0, Math.ceil(h.contT)), right ? bx + 110 : bx, 32, C.red, { align: al, weight: 700, scale: 1.1 }); T(g, 'PRESS PUNCH', right ? bx + 110 : bx, 42, '#ffffff', { align: al, weight: 700, scale: 0.85 }); }
}
function drawHUD(g) {
  const gm = game, v = SV, tall = v.zf > 1;
  const top = tall ? Math.max(0, v.y - 52) : 0;
  g.save(); g.translate(0, top);
  if (!tall) { g.fillStyle = lgrad(g, 0, 0, 0, 44, [[0, 'rgba(6,4,14,0.8)'], [1, 'rgba(6,4,14,0)']]); g.fillRect(0, 0, W, 44); }
  heroPanel(g, gm.heroes[0], 4, false);
  heroPanel(g, gm.heroes[1], W - 4, true);
  // the enemy you are hitting
  const f = gm.boss && !gm.boss.dead ? gm.boss : gm.focusT > 0 && gm.focus && !gm.focus.dead ? gm.focus : null;
  if (f) {
    const bw = f.boss ? 150 : 90, bx = W / 2 - bw / 2, y = tall ? 46 : 196;
    T(g, f.name, W / 2, y - 9, f.boss ? C.red : '#ffffff', { align: 'center', weight: 700, scale: f.boss ? 1.1 : 0.9 });
    slab(g, bx, y, bw, 5, 'rgba(0,0,0,0.6)', 1.6); slab(g, bx, y, bw * clamp(f.hp / f.maxHp, 0, 1), 5, f.boss ? lgrad(g, bx, 0, bx + bw, 0, [[0, '#ff3a3a'], [1, '#ffb03a']]) : '#ffd27a', 1.6);
  }
  g.restore();
  // stage banner
  if (gm.banner) {
    const b = gm.banner, a = b.t < 0.2 ? b.t / 0.2 : b.t > 1.8 ? Math.max(0, 1 - (b.t - 1.8) / 0.5) : 1, y = v.y + 70 * v.zf;
    g.globalAlpha = a;
    rect(g, 0, y - 4, W, 30, 'rgba(6,4,14,0.6)'); rect(g, 0, y - 4, W, 1, b.boss ? C.red : C.gold); rect(g, 0, y + 25, W, 1, b.boss ? C.red : C.gold);
    T(g, b.s, W / 2 + (1 - a) * 40, y - 1, b.boss ? C.red : C.gold, { align: 'center', scale: 2.2, display: true, stroke: 'rgba(0,0,0,0.7)', strokeW: 2 });
    T(g, b.sub, W / 2, y + 16, '#ffffff', { align: 'center', scale: 0.85, weight: 700 });
    g.globalAlpha = 1;
  }
}

/* ---- frame ----------------------------------------------------------------------------------------- */
function ensureArtScale() { TILES.clear(); }

function renderFrame() {
  const cv = $('screen'), g = cv.getContext('2d'), gm = game;
  gm.hits = [];
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#07050c'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  g.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in g) g.imageSmoothingQuality = 'high';
  g.save();
  g.beginPath(); g.rect(0, 0, W, viewH()); g.clip();
  if (gm.state === 'boot') drawBoot(g);
  else {
    drawStreet(g);
    if (['play', 'pause', 'clear', 'intro'].includes(gm.state) || (gm.state === 'options' && gm.optFrom === 'pause')) drawHUD(g);
    g.translate(0, view.dy);
    MT.s = isTall() ? Math.min(MENU_TALL[gm.state] || 1, (W - 8) / ({ select: 264, howto: 250 }[gm.state] || 1)) : 1;
    g.save(); g.translate(W / 2, H / 2); g.scale(MT.s, MT.s); g.translate(-W / 2, -H / 2);
    switch (gm.state) {
      case 'title': drawTitle(g); break;
      case 'select': drawSelect(g); break;
      case 'scores': drawScores(g); break;
      case 'medals': drawMedals(g); break;
      case 'howto': drawHowTo(g); break;
      case 'options': drawOptions(g); break;
      case 'intro': drawIntro(g); break;
      case 'pause': drawPause(g); break;
      case 'clear': drawClear(g); break;
      case 'gameover': drawGameOver(g); break;
      case 'ending': drawEnding(g); break;
      case 'entry': drawEntry(g); break;
      default: break;
    }
    g.restore(); MT.s = 1;
    drawMedalToast(g);
  }
  if (gm.toast) {
    gm.toast.t += 1 / 60;
    if (gm.toast.t > 1.6) gm.toast = null;
    else { const w = textWidth(gm.toast.s) + 14; rrect(g, W / 2 - w / 2, viewH() - 22, w, 13, 6.5, 'rgba(10,6,20,0.88)'); T(g, gm.toast.s, W / 2, viewH() - 19.4, C.gold, { align: 'center' }); }
  }
  g.restore();
}
