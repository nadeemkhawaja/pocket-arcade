/* ==========================================================================
   Run upgrades (pick one of three before every stage), the style rank meter
   and the camera punch that sells big hits.
   ========================================================================== */

const PERKS = [
  { id: 'swift', name: 'QUICK ROLL', desc: ['DASH AGAIN ALMOST', 'AT ONCE'], col: '#7fd8ff' },
  { id: 'crit', name: 'KEEN EDGE', desc: ['CRITICAL HITS LAND', '1 TIME IN 4'], col: '#ffd27a' },
  { id: 'reach', name: 'LONG ARM', desc: ['EVERY BLADE MOVE', 'REACHES FARTHER'], col: '#c9d6e6' },
  { id: 'ammo', name: 'QUARTERMASTER', desc: ['WEAPON PICKUPS HOLD', 'TWICE THE AMMO'], col: '#ffb060' },
  { id: 'shock', name: 'SHOCKWAVE', desc: ['CRITICAL KILLS BLAST', 'NEARBY ENEMIES'], col: '#ff8a5a' },
  { id: 'armor', name: 'PLATING', desc: ['ONE EXTRA HIT', 'PER LIFE'], col: '#ff7a7a' },
  { id: 'katana', name: 'SWORD BEARER', desc: ['START EVERY STAGE', 'WITH A KATANA'], col: '#bfe9ff' },
  { id: 'air', name: 'FEATHER STEP', desc: ['A THIRD JUMP', 'IN MID AIR'], col: '#b8ffd0' },
  { id: 'magnet', name: 'MAGNET', desc: ['PICKUPS FLY TO YOU', 'AND LAST LONGER'], col: '#d8b8ff' },
  { id: 'mirror', name: 'MIRROR EDGE', desc: ['EVERY PARRY SENDS', 'THE SHOT BACK'], col: '#9fe8ff' },
  { id: 'fury', name: 'LAST STAND', desc: ['DOUBLE DAMAGE ON', 'YOUR FINAL HEART'], col: '#ff5a4a' },
  { id: 'medic', name: 'FIELD MEDIC', desc: ['EVERY 8TH TAKEDOWN', 'RESTORES A HEART'], col: '#7fe6a0' }
];
function perk(id) { return game.perks && game.perks[id] ? 1 : 0; }
function heroMaxHp() { return game.diff.hp + perk('armor'); }
function maxAir() { return 1 + perk('air'); }
function critChance() { return perk('crit') ? 0.25 : 0.1; }

/** Show three upgrades the player does not have yet, then start the stage. */
function offerPerks(stageIdx) {
  const pool = PERKS.filter((p) => !game.perks[p.id]);
  if (game.demo || game.skipPerks || pool.length < 3) { startStage(stageIdx); return; }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  game.perkOffer = { cards: pool.slice(0, 3), stage: stageIdx };
  setState('perk');
  game.menu = 1;
  chip.play('title');
}
function takePerk(i) {
  const O = game.perkOffer, p = O.cards[i];
  game.perks[p.id] = 1;
  chip.sfx('weapon'); chip.sfx('medal');
  game.perkOffer = null;
  chip.stopMusic();
  startStage(O.stage);
}
function updatePerk(dt, I, P) {
  if (P.left) { game.menu = (game.menu + 2) % 3; chip.sfx('move'); }
  if (P.right) { game.menu = (game.menu + 1) % 3; chip.sfx('move'); }
  const hit = input.tap && game.hits.find((h) => input.tap.x >= h.x0 && input.tap.x <= h.x1 && input.tap.y >= h.y0 && input.tap.y <= h.y1);
  if (hit) { takePerk(hit.i); return; }
  if (game.stateT > 0.35 && (P.knife || P.jump || P.start)) takePerk(game.menu);
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
    case 'ammo': for (const dx of [-5, 0, 5]) { rrect(g, dx - 1.6, -3, 3.2, 9, 1, col); disc(g, dx, -4, 1.6, col); } break;
    case 'shock': ring(g, 0, 0, 4, 1.4, col); ring(g, 0, 0, 8.4, 1.2, col); break;
    case 'armor': g.beginPath(); g.moveTo(0, -8); g.lineTo(7, -5); g.lineTo(6, 3); g.lineTo(0, 8); g.lineTo(-6, 3); g.lineTo(-7, -5); g.closePath(); g.stroke(); L(0, -3, 0, 3); L(-3, 0, 3, 0); break;
    case 'katana': L(-7, 7, 7, -7); L(-6, 2, -2, 6); break;
    case 'air': L(-6, 6, 0, 0, 6, 6); L(-6, 0, 0, -6, 6, 0); break;
    case 'magnet': g.beginPath(); g.arc(0, -1, 6, Math.PI, 0); g.stroke(); L(-6, -1, -6, 6); L(6, -1, 6, 6); break;
    case 'mirror': L(-7, -6, -7, 6); L(-3, 0, 7, 0); poly(g, [-4, 0, 1, -4, 1, 4], col); break;
    case 'fury': drawHeartV(g, 0, 1, 1.5, true); break;
    default: L(0, -7, 0, 7); L(-7, 0, 7, 0); break;
  }
  g.restore();
}

function drawPerk(g) {
  drawTitleBackdrop(g, 0.88);
  const O = game.perkOffer;
  if (!O) return;
  bigTitle(g, 'CHOOSE AN UPGRADE', W / 2, 12, 2.1);
  T(g, 'STAGE ' + (O.stage + 1) + '  ' + STAGES[O.stage].name + '   IT LASTS THE WHOLE MISSION', W / 2, 36, C.cyan, { align: 'center', scale: 0.86, weight: 700 });
  O.cards.forEach((p, i) => {
    const sel = game.menu === i, x = 26 + i * 114, y = 54 - (sel ? 4 : 0), w = 104, h = 118;
    if (sel) drawGlow(g, x + w / 2, y + h / 2, 86, p.col, 0.32);
    panel(g, x, y, w, h, sel ? { border: p.col, lw: 1.2, top: 'rgba(34,40,62,0.96)', bot: 'rgba(12,14,26,0.96)', r: 5 } : { r: 5 });
    drawPerkIcon(g, p.id, x + w / 2, y + 30, p.col);
    T(g, p.name, x + w / 2, y + 54, sel ? '#ffffff' : C.steel, { align: 'center', weight: 700, scale: 1.05 });
    rect(g, x + 22, y + 67, w - 44, 0.6, p.col);
    T(g, p.desc[0], x + w / 2, y + 76, C.dim, { align: 'center', scale: 0.8 });
    T(g, p.desc[1], x + w / 2, y + 86, C.dim, { align: 'center', scale: 0.8 });
    if (sel && blink(3)) T(g, 'SELECT', x + w / 2, y + 103, p.col, { align: 'center', weight: 700, scale: 0.9 });
    hitArea(x, y, x + w, y + h, { i });
  });
  const own = PERKS.filter((p) => game.perks[p.id]);
  if (own.length) T(g, 'ACTIVE: ' + own.map((p) => p.name).join('  /  '), W / 2, 184, C.gold, { align: 'center', scale: 0.74, weight: 700 });
  T(g, input.usingTouch ? 'TAP A CARD' : 'LEFT / RIGHT CHOOSE   KNIFE CONFIRM', W / 2, 198, '#6a7a94', { align: 'center', scale: 0.8 });
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
  if (r1 > r0) { game.rankPop = 0.5; chip.sfx(r1 >= 4 ? 'medal' : 'pickup'); if (r1 >= 4) { game.punch = Math.max(game.punch || 0, 0.08); award('srank'); } }
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
  bigTitle(g, RANKS[r], 0, -6.2, 1.5, { fill: col, stroke: '#0a0c14' });
  g.restore();
  T(g, 'STYLE', x + 20, y + 1.4, C.dim, { scale: 0.62, weight: 700 });
  T(g, 'x' + RANK_MULT[r], x + 70, y + 1, col, { scale: 0.74, weight: 700, align: 'right', raw: true });
  const lo = r * 20, f = clamp((s - lo) / 20, 0, 1);
  rrect(g, x + 20, y + 9.4, 50, 3, 1.5, 'rgba(255,255,255,0.14)');
  if (f > 0.03) rrect(g, x + 20, y + 9.4, 50 * (r >= 4 ? 1 : f), 3, 1.5, col);
}

/** KEEN crits with the Shockwave upgrade: a ring that drops everyone close by. */
function shockRing(x, y) {
  game.fx.push({ k: 'ring', x, y: y - 12, t: 0, life: 0.32, r0: 6, r1: 40, col: '#ff8a5a', w: 2 });
  chip.sfx('boom');
  addShake(3);
  for (const e of game.foes) if (e.st !== 'dead' && !foeGhost(e) && Math.abs(e.x - x) < 40 && Math.abs(e.y - y) < 20) killFoe(e, 'boom', sgn(e.x - x) || 1, 2);
}
