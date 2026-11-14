/* ==========================================================================
   Run upgrades (pick one of three before every floor), the style rank meter
   and the camera punch that sells big hits.
   ========================================================================== */

const PERKS = [
  { id: 'iron', name: 'IRON SKIN', desc: ['EVERY BLOW HURTS', 'A THIRD LESS'], col: '#c9d6e6' },
  { id: 'chi', name: 'INNER FIRE', desc: ['CHI FILLS MUCH', 'FASTER'], col: '#ffd84a' },
  { id: 'crit', name: 'PRESSURE POINTS', desc: ['CRITICAL HITS LAND', '1 TIME IN 4'], col: '#ffd27a' },
  { id: 'swift', name: 'SHADOW STEP', desc: ['DASH AGAIN ALMOST', 'AT ONCE'], col: '#b9a8ff' },
  { id: 'drain', name: 'LIFE DRAIN', desc: ['EVERY KNOCKOUT', 'RESTORES VITALITY'], col: '#7fe6a0' },
  { id: 'power', name: 'TIGER FIST', desc: ['EVERY STRIKE HITS', 'HARDER'], col: '#ff8a5a' },
  { id: 'stars', name: 'STAR POUCH', desc: ['START EVERY FLOOR', 'WITH 8 SHURIKEN'], col: '#9fe8ff' },
  { id: 'time', name: 'PATIENCE', desc: ['40 MORE SECONDS', 'ON EVERY FLOOR'], col: '#ffb060' }
];
function perk(id) { return game.perks && game.perks[id] ? 1 : 0; }
function critChance() { return perk('crit') ? 0.25 : 0.1; }

/** Show three upgrades the player does not have yet, then start the stage. */
function offerPerks(stageIdx) {
  const pool = PERKS.filter((p) => !game.perks[p.id]);
  if (game.demo || game.skipPerks || pool.length < 3) { startFloor(stageIdx); return; }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  game.perkOffer = { cards: pool.slice(0, 3), stage: stageIdx };
  setState('perk');
  game.menu = 1;
  chip.play('title');
}
function takePerk(i) {
  const O = game.perkOffer, p = O.cards[i];
  game.perks[p.id] = 1;
  chip.sfx('chifull');
  game.perkOffer = null;
  chip.stopMusic();
  startFloor(O.stage);
}
function updatePerk(dt, I, P) {
  if (P.left) { game.menu = (game.menu + 2) % 3; chip.sfx('move'); }
  if (P.right) { game.menu = (game.menu + 1) % 3; chip.sfx('move'); }
  const hit = input.tap && game.hits.find((h) => input.tap.x >= h.x0 && input.tap.x <= h.x1 && input.tap.y >= h.y0 && input.tap.y <= h.y1);
  if (hit) { takePerk(hit.i); return; }
  if (game.stateT > 0.35 && (P.punch || P.kick || P.jump || P.start)) takePerk(game.menu);
}

function drawPerkIcon(g, id, x, y, col) {
  g.save(); g.translate(x, y);
  drawGlow(g, 0, 0, 20, col, 0.55);
  disc(g, 0, 0, 12.5, '#0c1020'); ring(g, 0, 0, 12.5, 1, col);
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
  const L = (...p) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.stroke(); };
  switch (id) {
    case 'swift': L(-7, -3, 1, -3); L(-5, 1, 3, 1); L(-7, 5, 1, 5); poly(g, [2, -6, 8, 1, 2, 8], col); break;
    case 'crit': g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU - Math.PI / 2, r = i % 2 ? 2.6 : 8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); break;
    case 'reach': L(-8, 5, 5, -5); poly(g, [5, -8, 9, -8, 9, -4], col); L(-8, 1, -4, 5); break;
    case 'stars': for (const dx of [-5, 0, 5]) { rrect(g, dx - 1.6, -3, 3.2, 9, 1, col); disc(g, dx, -4, 1.6, col); } break;
    case 'chi': ring(g, 0, 0, 4, 1.4, col); ring(g, 0, 0, 8.4, 1.2, col); break;
    case 'iron': g.beginPath(); g.moveTo(0, -8); g.lineTo(7, -5); g.lineTo(6, 3); g.lineTo(0, 8); g.lineTo(-6, 3); g.lineTo(-7, -5); g.closePath(); g.stroke(); L(0, -3, 0, 3); L(-3, 0, 3, 0); break;
    case 'power': L(-7, 7, 7, -7); L(-6, 2, -2, 6); break;
    case 'air': L(-6, 6, 0, 0, 6, 6); L(-6, 0, 0, -6, 6, 0); break;
    case 'magnet': g.beginPath(); g.arc(0, -1, 6, Math.PI, 0); g.stroke(); L(-6, -1, -6, 6); L(6, -1, 6, 6); break;
    case 'mirror': L(-7, -6, -7, 6); L(-3, 0, 7, 0); poly(g, [-4, 0, 1, -4, 1, 4], col); break;
    case 'time': ring(g, 0, 0, 7, 1.4, col); L(0, -4, 0, 0, 3, 2); break;
    default: L(0, -7, 0, 7); L(-7, 0, 7, 0); break;
  }
  g.restore();
}

function drawPerk(g) {
  drawTitleBackdrop(g, 0.88);
  const O = game.perkOffer;
  if (!O) return;
  bigTitle(g, 'CHOOSE AN UPGRADE', W / 2, 12, 2.1);
  T(g, 'FLOOR ' + (O.stage + 1) + '  ' + FLOORS[O.stage].name + '   IT LASTS THE WHOLE CLIMB', W / 2, 36, C.cyan, { align: 'center', scale: 0.86, weight: 700 });
  O.cards.forEach((p, i) => {
    const sel = game.menu === i, x = 26 + i * 114, y = 54 - (sel ? 4 : 0), w = 104, h = 118;
    if (sel) drawGlow(g, x + w / 2, y + h / 2, 86, p.col, 0.32);
    rrect(g, x, y, w, h, 5, sel ? 'rgba(44,22,34,0.96)' : 'rgba(22,10,18,0.94)'); g.strokeStyle = sel ? p.col : 'rgba(216,176,74,0.45)'; g.lineWidth = sel ? 1.2 : 0.6; roundRectPath(g, x, y, w, h, 5); g.stroke();
    drawPerkIcon(g, p.id, x + w / 2, y + 30, p.col);
    T(g, p.name, x + w / 2, y + 54, sel ? '#ffffff' : '#d8c8c0', { align: 'center', weight: 700, scale: 1.05 });
    rect(g, x + 22, y + 67, w - 44, 0.6, p.col);
    T(g, p.desc[0], x + w / 2, y + 76, C.dim, { align: 'center', scale: 0.8 });
    T(g, p.desc[1], x + w / 2, y + 86, C.dim, { align: 'center', scale: 0.8 });
    if (sel && blink(3)) T(g, 'SELECT', x + w / 2, y + 103, p.col, { align: 'center', weight: 700, scale: 0.9 });
    hitArea(x, y, x + w, y + h, { i });
  });
  const own = PERKS.filter((p) => game.perks[p.id]);
  if (own.length) T(g, 'ACTIVE: ' + own.map((p) => p.name).join('  /  '), W / 2, 184, C.gold, { align: 'center', scale: 0.74, weight: 700 });
  T(g, input.usingTouch ? 'TAP A CARD' : 'LEFT / RIGHT CHOOSE   PUNCH CONFIRM', W / 2, 198, '#8a7a80', { align: 'center', scale: 0.8 });
}

/* ---- style rank ------------------------------------------------------------------ */
const RANKS = ['D', 'C', 'B', 'A', 'S'];
const RANK_MULT = [1, 1.2, 1.5, 2, 3];
const RANK_COL = ['#8a94a6', '#7fd8ff', '#7fe6a0', '#ffd27a', '#ff6a4a'];
function styleRank() { const s = game.style || 0; return s >= 80 ? 4 : s >= 60 ? 3 : s >= 40 ? 2 : s >= 20 ? 1 : 0; }
function styleAdd(n) {
  if (game.demo) return;
  const r0 = styleRank();
  game.style = Math.min(100, (game.style || 0) + n);
  game.styleT = 2.2;
  const r1 = styleRank();
  if (r1 > r0) { game.rankPop = 0.5; chip.sfx(r1 >= 4 ? 'chifull' : 'pickup'); if (r1 >= 4) game.punch = Math.max(game.punch || 0, 0.08); }
}
function styleHit() { game.style = Math.max(0, (game.style || 0) - 45); }
function updateStyle(dt) {
  game.punch = (game.punch || 0) * Math.exp(-dt * 6);
  if (game.punch < 0.002) game.punch = 0;
  game.rankPop = Math.max(0, (game.rankPop || 0) - dt);
  game.styleT = Math.max(0, (game.styleT || 0) - dt);
  if (game.styleT <= 0) game.style = Math.max(0, (game.style || 0) - dt * 9);
}
function drawStyle(g) {
  const s = game.style || 0;
  if (s < 1 || game.state !== 'play') return;
  const r = styleRank(), col = RANK_COL[r], x = W - 76, y = HUD_H + 4, k = 1 + (game.rankPop || 0) * 1.2;
  rrect(g, x, y, 73, 15, 3, 'rgba(6,8,16,0.6)');
  g.save(); g.translate(x + 9, y + 7.5); g.scale(k, k);
  if (r >= 3) drawGlow(g, 0, 0, 10, col, 0.6);
  T(g, RANKS[r], 0, -7.4, col, { align: 'center', scale: 1.7, weight: 700 });
  g.restore();
  T(g, 'STYLE', x + 20, y + 1.4, C.dim, { scale: 0.62, weight: 700 });
  T(g, 'x' + RANK_MULT[r], x + 70, y + 1, col, { scale: 0.74, weight: 700, align: 'right', raw: true });
  const lo = r * 20, f = clamp((s - lo) / 20, 0, 1);
  rrect(g, x + 20, y + 9.4, 50, 3, 1.5, 'rgba(255,255,255,0.14)');
  if (f > 0.03) rrect(g, x + 20, y + 9.4, 50 * (r >= 4 ? 1 : f), 3, 1.5, col);
}

