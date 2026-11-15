/* ==========================================================================
   Things in the street: weapons to pick up, crates and drums to break,
   food, thrown knives, and the small effects (sparks, dust, shock waves).
   ========================================================================== */

const ITEM_DEF = {
  bat: { label: 'BAT', uses: 8, sfx: 'wood' },
  pipe: { label: 'PIPE', uses: 10, sfx: 'metal' },
  knife: { label: 'KNIFE', uses: 12, sfx: 'slash' },
  food: { label: 'FOOD', heal: 40 },
  soda: { label: 'SODA', heal: 15 },
  cash: { label: 'CASH', score: 2000 },
  oneup: { label: '1UP' },
  crate: { solid: true, hp: 14 },
  drum: { solid: true, hp: 22, label: 'OIL DRUM' }
};

function addItem(type, x, z, extra) {
  const it = Object.assign({ id: ++FID, type, x, z, h: 0, vh: 0, vx: 0, t: 0 }, extra || {});
  if (ITEM_DEF[type].solid) it.hp = ITEM_DEF[type].hp;
  game.items.push(it);
  return it;
}
function nearItem(h) {
  let best = null, bd = 1e9;
  for (const it of game.items) {
    if ((ITEM_DEF[it.type].solid && it.type !== 'drum') || it.h > 2) continue;
    const d = Math.abs(it.x - h.x) + Math.abs(it.z - h.z) * 1.4;
    if (d < 30 && d < bd) { bd = d; best = it; }
  }
  return best;
}
function pickUp(h, it) {
  const D = ITEM_DEF[it.type];
  game.items.splice(game.items.indexOf(it), 1);
  setSt(h, 'pickup', 'pickup');
  if (D.heal) { h.hp = Math.min(h.maxHp, h.hp + D.heal); chip.sfx('food'); popAt(it.x, it.z, '+' + D.heal + ' HP', '#7dffa0'); game.stats.food++; return; }
  if (D.score) { h.score += D.score; chip.sfx('pickup'); popAt(it.x, it.z, '+' + D.score, '#ffd27a'); return; }
  if (it.type === 'oneup') { h.lives++; chip.sfx('oneup'); popAt(it.x, it.z, '1UP', '#7dffa0'); return; }
  if (it.type === 'drum') { h.weapon = 'drum'; h.wUses = 1; chip.sfx('grab'); return; }
  h.weapon = it.type; h.wUses = D.uses; chip.sfx('pickup'); game.stats.weapons++;
}
function dropWeapon(f, broke) {
  if (!f.weapon) return;
  if (broke) { popAt(f.x, f.z, 'BROKE', '#c8c8d8'); chip.sfx('wood', { p: 0.7 }); }
  else if (ITEM_DEF[f.weapon]) addItem(f.weapon, f.x, f.z, { vh: 120, h: 30, vx: -f.face * 40 });
  f.weapon = null; f.wUses = 0;
}
function throwWeapon(h) {
  const w = h.weapon;
  h.weapon = null; h.wUses = 0;
  setSt(h, 'attack', 'flick'); h.atk = 'tossMove'; h.atkHit = new Set();
  if (w === 'drum') { setSt(h, 'attack', 'lob'); game.shots.push({ type: 'drum', x: h.x + h.face * 10, z: h.z, h: 52 * (CHARS[h.kind].k / 1.9), vx: h.face * 240, owner: h, spin: 0, t: 0 }); chip.sfx('throw'); return; }
  game.shots.push({ type: w, x: h.x + h.face * 14, z: h.z, h: 34 * (CHARS[h.kind].k / 1.9), vx: h.face * 330, owner: h, spin: 0, t: 0 });
  chip.sfx('knife');
}

/* ---- update items, projectiles and effects ---------------------------------------------------- */
function updateItems(dt) {
  for (const it of game.items) {
    it.t += dt;
    if (it.h > 0 || it.vh > 0) { it.vh -= GRAV * dt; it.h += it.vh * dt; it.x += it.vx * dt; if (it.h <= 0) { it.h = 0; it.vh = 0; it.vx = 0; } }
  }
  // breakables: any active attack that reaches them breaks them a little
  for (const f of fighters()) {
    if ((f.state !== 'attack' && f.state !== 'jattack') || atkPhase(f) !== 1 || !f.hero) continue;
    const A = ATK[f.atk];
    for (const it of game.items.slice()) {
      if (!ITEM_DEF[it.type].solid || (f.atkHit && f.atkHit.has(it))) continue;
      const dx = (it.x - f.x) * f.face;
      if (Math.abs(it.z - f.z) < DZ_HIT && dx > A.r[0] - 8 && dx < A.r[1] + 10) {
        f.atkHit.add(it); it.hp -= A.dmg; it.flash = 0.1; chip.sfx('crate', { v: 0.6 });
        sparks(it.x, it.z, 18, 0.5, '#e8c890');
        if (it.hp <= 0) breakProp(it, f);
      }
    }
  }
  // thrown knives and weapons
  for (const s of game.shots.slice()) {
    s.t += dt; s.x += s.vx * dt; s.spin += dt * 20;
    let done = s.x < game.camX - 40 || s.x > game.camX + W + 40 || s.t > 2;
    for (const o of fighters()) {
      if (done || o === s.owner || o.foe === s.owner.foe || o.dead) continue;
      if (Math.abs(o.x - s.x) < 14 && Math.abs(o.z - s.z) < DZ_HIT && o.state !== 'down') {
        const ok = landHit(s.owner, o, { dmg: s.type === 'knife' ? 12 : s.type === 'drum' ? 22 : 16, kd: s.type !== 'knife', launch: 170, push: 100, stun: 0.5, sfx: s.type === 'knife' ? 'slash' : 'metal', stop: 0.07 }, 'shot');
        if (ok && s.type === 'drum') { o.hit2 = true; }
        if (ok) done = true;
      }
    }
    if (s.type === 'drum') { s.vh = (s.vh || 60) - GRAV * dt; s.h = Math.max(0, s.h + s.vh * dt); if (s.h <= 0 && s.t > 0.1) done = true; }
    if (done) { game.shots.splice(game.shots.indexOf(s), 1); if (s.type === 'drum') { breakProp({ type: 'drum', x: s.x, z: s.z }, null, true); } }
  }
  for (const fx of game.fx.slice()) {
    fx.t += dt;
    if (fx.vx !== undefined) { fx.x += fx.vx * dt; fx.y += fx.vy * dt; fx.vy += (fx.g || 0) * dt; }
    if (fx.t >= fx.life) game.fx.splice(game.fx.indexOf(fx), 1);
  }
}
function breakProp(it, by, loose) {
  if (!loose) game.items.splice(game.items.indexOf(it), 1);
  chip.sfx(it.type === 'drum' ? 'metal' : 'crate'); game.shake = Math.max(game.shake, 3);
  for (let i = 0; i < 10; i++) game.fx.push({ k: 'bit', x: it.x + rand(-8, 8), z: it.z, y: -rand(6, 20), vx: rand(-120, 120), vy: -rand(80, 220), g: 600, t: 0, life: rand(0.5, 0.9), col: it.type === 'drum' ? '#8a3a2a' : '#b88a50', r: rand(2, 4) });
  if (by && by.hero) by.score += 200;
  if (it.drop) addItem(it.drop, it.x, it.z, { vh: 160, h: 4 });
  if (it.type === 'drum' && !loose) shock(it.x, it.z, true);
}

function sparks(x, z, y, k, col) {
  game.fx.push({ k: 'star', x, z, y: -y, t: 0, life: 0.16 + k * 0.08, s: 10 + k * 14, col });
  for (let i = 0; i < 4 + k * 6; i++) { const a = rand(0, TAU), v = rand(80, 220) * (0.6 + k); game.fx.push({ k: 'spark', x, z, y: -y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 300, t: 0, life: rand(0.15, 0.3), col }); }
}
function dust(x, z, k) { for (let i = 0; i < 6 * k + 2; i++) game.fx.push({ k: 'puff', x: x + rand(-12, 12), z, y: -2, vx: rand(-60, 60), vy: -rand(5, 30), t: 0, life: rand(0.35, 0.6), r: rand(4, 8) * k + 3, col: game.stageDef ? game.stageDef.dust : '#c8c0b8' }); }
function shock(x, z, fire) {
  game.fx.push({ k: 'ring', x, z, y: 0, t: 0, life: 0.45, col: fire ? '#ff8a30' : '#fff2c0' });
  for (const o of fighters()) if (o.hero && Math.abs(o.x - x) < 70 && Math.abs(o.z - z) < 26 && grounded(o) && o.state !== 'down' && o.inv <= 0) landHit({ face: Math.sign(o.x - x) || 1, foe: true, hero: false, def: {}, power: 1, x }, o, { dmg: 8, kd: true, launch: 140, push: 80, sfx: 'heavy', stop: 0.05 }, 'wave');
}
function popAt(x, z, s, col) { game.pops.push({ x, z, s, col, t: 0 }); }
