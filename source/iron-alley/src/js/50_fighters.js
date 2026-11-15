/* ==========================================================================
   Fighters: heroes and the gang share one body model. A fighter walks on the
   street plane (x along the street, z into depth), can leave it vertically (h),
   and is always in exactly one state. Attacks come from one table so players
   and enemies hit by the same rules.
   ========================================================================== */

const Z0 = 134, Z1 = 206;          // the walkable band of the street, back to front
const DZ_HIT = 13;
const BODY = 1.34;                 // the cast is drawn this much larger than the rig's base size; reach scales with it                 // how far apart in depth two fighters can be and still connect
const GRAV = 900;

/* Every attack: animation, timing (wind-up, active, recovery in seconds), reach in front
   (x0..x1, negative reaches behind), damage, knockdown, push, hit-stun and sound. */
const ATK = {
  jab: { anim: 'jab', t: [0.05, 0.07, 0.1], r: [6, 30], dmg: 4, push: 8, step: 6, stun: 0.3, sfx: 'punch', stop: 0.04 },
  jab2: { anim: 'jab', t: [0.05, 0.07, 0.1], r: [6, 30], dmg: 4, push: 8, step: 6, stun: 0.3, sfx: 'punch', stop: 0.04 },
  cross: { anim: 'cross', t: [0.06, 0.08, 0.12], r: [6, 33], dmg: 6, push: 12, step: 8, stun: 0.34, sfx: 'punch', stop: 0.05 },
  upper: { anim: 'upper', t: [0.08, 0.1, 0.26], r: [4, 30], dmg: 10, kd: true, launch: 260, push: 70, sfx: 'heavy', stop: 0.09 },
  kick: { anim: 'kick', t: [0.09, 0.09, 0.16], r: [10, 40], dmg: 7, push: 24, step: 4, stun: 0.36, sfx: 'kick', stop: 0.06 },
  round: { anim: 'round', t: [0.1, 0.1, 0.24], r: [8, 42], dmg: 11, kd: true, launch: 180, push: 110, sfx: 'heavy', stop: 0.09 },
  elbow: { anim: 'elbow', t: [0.06, 0.08, 0.16], r: [-34, -4], dmg: 8, push: 40, stun: 0.4, sfx: 'punch', stop: 0.06 },
  jkick: { anim: 'jkick', t: [0.02, 0.4, 0.05], r: [6, 42], dmg: 10, kd: true, launch: 160, push: 100, sfx: 'kick', stop: 0.07, air: true },
  jpunch: { anim: 'jpunch', t: [0.02, 0.3, 0.05], r: [6, 32], dmg: 7, push: 40, stun: 0.36, sfx: 'punch', stop: 0.05, air: true },
  dash: { anim: 'charge', t: [0.02, 0.32, 0.22], r: [0, 36], dmg: 10, kd: true, launch: 150, push: 140, sfx: 'heavy', stop: 0.08, move: 260 },
  knee: { anim: 'knee', t: [0.06, 0.06, 0.14], r: [4, 28], dmg: 6, push: 0, stun: 0.5, sfx: 'kick', stop: 0.06, grab: true },
  spin: { anim: 'spin', t: [0.05, 0.42, 0.18], r: [-44, 44], dmg: 12, kd: true, launch: 220, push: 130, sfx: 'heavy', stop: 0.08, inv: true },
  swing: { anim: 'swing', t: [0.12, 0.09, 0.2], r: [8, 52], dmg: 14, kd: true, launch: 170, push: 110, sfx: 'wood', stop: 0.09, weapon: true },
  stab: { anim: 'stab', t: [0.07, 0.07, 0.14], r: [6, 40], dmg: 9, push: 30, stun: 0.42, sfx: 'slash', stop: 0.06, weapon: true },
  // gang only
  ejab: { anim: 'jab', t: [0.2, 0.07, 0.3], r: [6, 30], dmg: 5, push: 20, stun: 0.3, sfx: 'punch', stop: 0.04 },
  ekick: { anim: 'kick', t: [0.26, 0.09, 0.36], r: [10, 40], dmg: 8, push: 40, stun: 0.36, sfx: 'kick', stop: 0.05 },
  estab: { anim: 'stab', t: [0.28, 0.08, 0.4], r: [6, 40], dmg: 9, push: 30, stun: 0.4, sfx: 'slash', stop: 0.05 },
  epipe: { anim: 'swing', t: [0.36, 0.09, 0.42], r: [8, 52], dmg: 12, kd: true, launch: 150, push: 90, sfx: 'metal', stop: 0.07 },
  ejkick: { anim: 'jkick', t: [0.05, 0.4, 0.2], r: [6, 42], dmg: 10, kd: true, launch: 150, push: 90, sfx: 'kick', stop: 0.06, air: true },
  slam: { anim: 'slam', t: [0.5, 0.1, 0.5], r: [4, 48], dmg: 16, kd: true, launch: 200, push: 130, sfx: 'heavy', stop: 0.1, shake: 6 },
  hook: { anim: 'cross', t: [0.34, 0.08, 0.4], r: [6, 40], dmg: 12, kd: true, launch: 160, push: 120, sfx: 'heavy', stop: 0.09 },
  charge: { anim: 'charge', t: [0.4, 0.7, 0.5], r: [0, 40], dmg: 14, kd: true, launch: 190, push: 160, sfx: 'heavy', stop: 0.1, move: 300 },
  wrench: { anim: 'swing', t: [0.22, 0.09, 0.3], r: [8, 50], dmg: 10, push: 60, stun: 0.45, sfx: 'metal', stop: 0.07 },
  hammer: { anim: 'slam', t: [0.62, 0.12, 0.6], r: [6, 60], dmg: 20, kd: true, launch: 220, push: 150, sfx: 'metal', stop: 0.12, shake: 9, wave: true },
  wspin: { anim: 'spin', t: [0.3, 0.5, 0.4], r: [-46, 46], dmg: 12, kd: true, launch: 200, push: 130, sfx: 'heavy', stop: 0.08 }
};

/* The heroes. */
const HEROES = {
  kade: { name: 'KADE', kind: 'kade', hp: 120, speed: 78, power: 1.1, jump: 300, blurb: 'HEAVY HANDS. SLOWER, HITS HARDER.', stats: [5, 3, 4] },
  suki: { name: 'SUKI', kind: 'suki', hp: 105, speed: 92, power: 0.95, jump: 330, blurb: 'FAST FEET. QUICK COMBOS, BIG AIR.', stats: [3, 5, 5] }
};

/* The gang. */
const FOES = {
  punk: { name: 'RAZOR', kind: 'punk', hp: 30, speed: 62, atk: ['ejab', 'ejab', 'ekick'], score: 300, aggro: 0.6 },
  punk2: { name: 'SPIKE', kind: 'punk2', hp: 34, speed: 66, atk: ['ejab', 'ekick', 'ekick'], score: 300, aggro: 0.7 },
  blade: { name: 'SHIV', kind: 'blade', hp: 34, speed: 60, atk: ['estab', 'estab'], score: 450, aggro: 0.55, throws: true, weapon: 'knife' },
  biker: { name: 'CHROME', kind: 'biker', hp: 42, speed: 56, atk: ['epipe', 'ejab'], score: 500, aggro: 0.5, weapon: 'pipe' },
  bruiser: { name: 'BULK', kind: 'bruiser', hp: 95, speed: 44, atk: ['hook', 'slam', 'charge'], score: 1200, aggro: 0.5, heavy: true },
  tank: { name: 'TANK', kind: 'tank', hp: 300, speed: 50, atk: ['hook', 'slam', 'charge', 'charge'], score: 10000, aggro: 0.8, heavy: true, boss: true },
  ratchet: { name: 'RATCHET', kind: 'ratchet', hp: 280, speed: 82, atk: ['wrench', 'wrench', 'ejkick', 'ekick'], score: 12000, aggro: 0.85, boss: true, weapon: 'wrench' },
  forge: { name: 'FORGE', kind: 'forge', hp: 380, speed: 46, atk: ['hammer', 'hook', 'hammer'], score: 15000, aggro: 0.75, heavy: true, boss: true, weapon: 'hammer' },
  warden: { name: 'THE WARDEN', kind: 'warden', hp: 420, speed: 96, atk: ['ejab', 'hook', 'ejkick', 'wspin', 'ekick'], score: 25000, aggro: 0.95, boss: true, summons: true }
};

let FID = 0;
function makeFighter(o) {
  return Object.assign({
    id: ++FID, x: 0, z: 170, h: 0, vx: 0, vz: 0, vh: 0, face: 1, state: 'idle', st: 0, anim: 'idle', frame: 0,
    hp: 100, maxHp: 100, inv: 0, stun: 0, atk: null, atkHit: null, combo: 0, comboT: 0, flash: 0, weapon: null, wUses: 0,
    hold: null, heldBy: null, holdT: 0, knees: 0, dead: false, alpha: 1, kdCount: 0, lastHitBy: null, spawnT: 0
  }, o);
}

function newHero(slot, id) {
  const H = HEROES[id] || HEROES.kade;
  return makeFighter({ hero: true, slot, def: H, kind: H.kind, name: H.name, hp: H.hp, maxHp: H.hp, x: game.camX + 60 + slot * 26, z: 170 + slot * 16, face: 1,
    lives: 3, score: 0, meter: 0, runT: 0, tapDir: 0, tapT: 0, power: H.power, speed: H.speed, inv: 2, active: true });
}
function newFoe(type, x, z, extra) {
  const D = FOES[type];
  const hp = Math.round(D.hp * game.diff.hp * (D.boss && game.heroes.filter((h) => h.active).length > 1 ? 1.35 : 1));
  return makeFighter(Object.assign({ foe: true, type, def: D, kind: D.kind, name: D.name, hp, maxHp: hp, x, z, face: x < game.camX + W / 2 ? 1 : -1,
    weapon: D.weapon || null, cool: 0.6 + Math.random() * 0.8, think: 0, plan: 'approach', side: Math.random() < 0.5 ? -1 : 1, boss: !!D.boss, heavy: !!D.heavy }, extra || {}));
}

/* ---- shared helpers ------------------------------------------------------------------------- */
function setSt(f, s, anim) { f.state = s; f.st = 0; f.anim = anim || s; f.frame = 0; }
function grounded(f) { return f.h <= 0.01 && f.vh <= 0; }
function canAct(f) { return ['idle', 'walk', 'run'].includes(f.state); }
function fighters() { return game.heroes.filter((h) => h.active && !h.dead).concat(game.foes); }
function liveHeroes() { return game.heroes.filter((h) => h.active && !h.dead && h.state !== 'dead'); }

/** Begin an attack. */
function startAttack(f, key) {
  const A = ATK[key];
  f.atk = key; f.atkHit = new Set(); setSt(f, 'attack', A.anim);
  if (A.air) f.state = 'jattack';
  if (A.weapon && f.weapon === 'knife') f.anim = 'stab';
  chip.sfx(A.t[0] > 0.3 ? 'swingH' : 'swing', { v: 0.8 });
}
function atkPhase(f) {
  const A = ATK[f.atk], t = f.st;
  return t < A.t[0] ? 0 : t < A.t[0] + A.t[1] ? 1 : t < A.t[0] + A.t[1] + A.t[2] ? 2 : 3;
}

/** Does attacker a reach target b with attack A right now? */
function inReach(a, b, A) {
  if (Math.abs(a.z - b.z) > DZ_HIT * (A.wave ? 1.8 : 1)) return false;
  const dx = (b.x - a.x) * a.face, k = (a.def.boss ? 1.2 : a.heavy ? 1.15 : 1) * BODY;
  if (dx < A.r[0] * k - 10 || dx > A.r[1] * k + 6) return false;
  if (Math.abs(a.h - b.h) > 42) return false;
  return true;
}

/** Apply a hit from attacker a to target b. */
function landHit(a, b, A, key) {
  if (b.inv > 0 || b.state === 'down' || b.state === 'dead' || b.state === 'getup' || b.dead) return false;
  if (b.foe && a.foe) return false;
  if (b.hero && a.hero && !settings.friendly) return false;
  const dir = b.state === 'held' ? a.face : Math.sign(b.x - a.x) || a.face;
  let dmg = A.dmg * (a.hero ? a.power * (a.weapon && A.weapon ? 1 : 1) : game.diff.dmg);
  if (a.hero && b.hold) b.hold = null;
  if (b.heldBy && !(A.grab && b.heldBy === a)) { const h = b.heldBy; h.hold = null; b.heldBy = null; if (h.state === 'grab') setSt(h, 'idle'); }
  b.hp -= dmg; b.flash = 0.12; b.lastHitBy = a;
  if (b.foe) { game.focus = b; game.focusT = 3; }
  if (a.hero) { a.score += Math.round(dmg * 10); a.meter = Math.min(3, a.meter + dmg / 70); a.combo++; a.comboT = 0.7; game.hitCount++; if (a.combo > game.stats.bestCombo) game.stats.bestCombo = a.combo; if (a.combo >= 10) award('ten'); }
  game.hitstop = Math.max(game.hitstop, A.stop || 0.05);
  game.shake = Math.max(game.shake, A.shake || (A.kd ? 4 : 2));
  sparks(b.x - dir * 6, b.z, b.h + 30 * (CHARS[b.kind].k / 1.9), A.kd ? 1 : 0.6, A.weapon && a.weapon === 'knife' ? '#ff6a6a' : '#fff2c0');
  chip.sfx(A.sfx, { p: b.heavy ? 0.85 : 1 });
  if (b.hp <= 0) { b.hp = 0; knockDown(b, dir, Math.max(A.launch || 0, 200), A.push + 60, true); return true; }
  const heavyGuard = b.heavy && !A.kd && b.state === 'attack' && Math.random() < 0.5;
  if (A.kd && !(b.boss && Math.random() < 0.35 && A.dmg < 12)) knockDown(b, dir, A.launch || 160, A.push, false);
  else if (!heavyGuard) {
    if (b.state !== 'held') { setSt(b, 'hurt', Math.random() < 0.5 ? 'hurt' : 'hurtLow'); b.stun = A.stun || 0.3; }
    b.vx = dir * (A.push || 20) * (b.heavy ? 0.4 : 1); b.atk = null;
    b.kdCount = (b.kdCount || 0) + 1;
    if (b.hero) chip.sfx('hurt', { v: 0.6 });
  }
  return true;
}

function knockDown(b, dir, launch, push, ko) {
  if (b.hold) { b.hold.heldBy = null; b.hold = null; }
  setSt(b, 'fall', 'fall'); b.vh = launch * (b.heavy ? 0.7 : 1); b.vx = dir * push * (b.heavy ? 0.6 : 1); b.face = -dir; b.atk = null; b.ko = ko; b.kdCount = 0;
  if (ko && b.boss) { game.slowmo = 1.2; chip.sfx('ko'); }
}

/* ---- per-step update for every fighter -------------------------------------------------------- */
function updateFighter(f, dt) {
  f.st += dt;
  if (f.inv > 0) f.inv -= dt;
  if (f.flash > 0) f.flash -= dt;
  const k = CHARS[f.kind].k / 1.9;
  // vertical motion
  if (f.h > 0 || f.vh > 0) {
    f.vh -= GRAV * dt; f.h += f.vh * dt;
    if (f.h <= 0) {
      f.h = 0; f.vh = 0;
      if (f.state === 'fall' || f.state === 'flung') {
        if (f.bounce !== true && !f.ko) { f.bounce = true; f.vh = 90; chip.sfx('fall', { v: 0.8, p: 1 / k }); game.shake = Math.max(game.shake, 3); dust(f.x, f.z, 1); }
        else { f.bounce = false; setSt(f, 'down', 'down'); f.vx = 0; chip.sfx('land', { v: 0.6 }); dust(f.x, f.z, 0.7); if (f.thrownBy) f.thrownBy = null; }
      } else if (f.state === 'air' || f.state === 'jattack') { setSt(f, 'idle'); chip.sfx('land', { v: 0.5 }); dust(f.x, f.z, 0.4); f.atk = null; }
    }
  }
  // horizontal drift and friction
  f.x += f.vx * dt; f.z = clamp(f.z + f.vz * dt, Z0, Z1);
  if (grounded(f) && f.state !== 'run' && f.state !== 'walk' && !(f.state === 'attack' && ATK[f.atk] && ATK[f.atk].move)) f.vx = approach(f.vx, 0, 600 * dt);
  // thrown bodies knock others over
  if (f.state === 'flung' && f.thrownBy) for (const o of fighters()) if (o !== f && o !== f.thrownBy && o.foe === f.foe && Math.abs(o.x - f.x) < 30 && Math.abs(o.z - f.z) < DZ_HIT && o.state !== 'down' && o.state !== 'fall') { landHit(f.thrownBy, o, { dmg: 10, kd: true, launch: 160, push: 90, sfx: 'heavy', stop: 0.07 }, 'body'); }
  switch (f.state) {
    case 'hurt': if (f.st >= f.stun) setSt(f, f.kdCount >= 3 && f.foe && !f.boss ? 'dizzy' : 'idle', f.kdCount >= 3 && f.foe && !f.boss ? 'dizzy' : 'idle'); if (f.state === 'dizzy') f.kdCount = 0; break;
    case 'dizzy': if (f.st > 1.4) setSt(f, 'idle'); break;
    case 'down':
      if (f.hp <= 0) { if (f.st > 0.5) { f.alpha = 1 - (f.st - 0.5) / 0.9; if (f.st > 1.4) f.dead = true; } }
      else if (f.st > (f.hero ? 0.7 : 0.9)) { setSt(f, 'getup', 'getup'); }
      break;
    case 'getup': f.frame = Math.min(2, f.st / 0.16); if (f.st > 0.48) { setSt(f, 'idle'); f.inv = Math.max(f.inv, f.hero ? 1.2 : 0.5); } break;
    case 'attack': case 'jattack': updateAttack(f, dt); break;
    case 'held': if (!f.heldBy) setSt(f, 'idle'); break;
    case 'pickup': if (f.st > 0.22) setSt(f, 'idle'); break;
    case 'victory': f.frame += dt * 2; break;
    default: break;
  }
  // animation clock
  if (['idle', 'walk', 'run', 'dizzy', 'victory', 'taunt'].includes(f.anim)) f.frame += dt * (f.anim === 'run' || f.anim === 'charge' ? 14 : f.anim === 'walk' ? 10 : 3.5);
  else if (f.state === 'fall') f.frame = Math.min(2, f.st * 9);
  else if (f.state === 'hurt') f.frame = Math.min(1, f.st * 8);
  if (f.anim === 'charge') f.frame += dt * 14;
}

function updateAttack(f, dt) {
  const A = ATK[f.atk];
  if (!A) { setSt(f, 'idle'); return; }
  const ph = atkPhase(f), T0 = A.t[0], T1 = A.t[1];
  // the pose runs through its key frames as the move plays out
  const n = animLen(f.kind, A.anim);
  if (A.anim === 'spin' || A.anim === 'charge') f.frame = f.st * 14;
  else f.frame = ph === 0 ? (f.st / T0) * 0.9 : ph === 1 ? 1 : Math.min(n - 1, 1 + (f.st - T0 - T1) / Math.max(0.01, A.t[2]) * (n - 2));
  if (A.move && ph <= 1) f.vx = f.face * A.move * (ph === 1 ? 1 : 0.3);
  if (A.inv) f.inv = Math.max(f.inv, 0.05);
  if (A.anim === 'spin' && ph === 1) { const flip = Math.floor(f.st * 12) % 2; f.face = flip ? -f.baseFace : f.baseFace; }
  if (ph === 1) {
    for (const o of fighters()) {
      if (o === f || f.atkHit.has(o)) continue;
      if (o.foe === f.foe && !(settings.friendly && o.hero && f.hero)) continue;
      const B = A.r[0] < 0 && A.r[1] > 0 ? Object.assign({}, A, { r: [0, A.r[1]] }) : A;
      let hit = inReach(f, o, B);
      if (!hit && A.r[0] < 0 && A.r[1] > 0) { f.face = -f.face; hit = inReach(f, o, B); f.face = -f.face; }
      if (A.grab) hit = o === f.hold;
      if (hit && landHit(f, o, A, f.atk)) {
        f.atkHit.add(o);
        if (A.step && f.hero) f.x += f.face * A.step;
        if (A.grab) { f.knees++; if (f.knees >= 3) { knockDown(o, f.face, 170, 90, o.hp <= 0); f.hold = null; o.heldBy = null; } }
        if (f.weapon && A.weapon) { f.wUses--; if (f.wUses <= 0) { dropWeapon(f, true); } }
      }
    }
    if (A.wave && f.st - T0 < dt * 1.5) { shock(f.x + f.face * 40, f.z); game.shake = Math.max(game.shake, 7); }
  }
  if (A.air) { if (grounded(f) && f.st > 0.1) { setSt(f, 'idle'); f.atk = null; } return; }
  if (ph === 3) { f.atk = null; if (f.hold && f.hold.heldBy === f) setSt(f, 'grab', 'hold'); else setSt(f, 'idle'); }
}

/** Fighters standing on top of each other drift apart, so the gang walks round you, not through you. */
function separate(dt) {
  const L = fighters().filter((f) => grounded(f) && !['down', 'fall', 'held', 'flung', 'dead'].includes(f.state) && !f.heldBy && !f.hold);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dx = b.x - a.x, dz = b.z - a.z;
    if (Math.abs(dz) > 9 || Math.abs(dx) > 18) continue;
    const push = (18 - Math.abs(dx)) * 4 * dt, s = Math.sign(dx) || (a.id < b.id ? 1 : -1);
    const ma = a.hero ? 0.3 : 1, mb = b.hero ? 0.3 : 1;
    a.x -= s * push * ma; b.x += s * push * mb;
    // step aside in depth too, so someone circling goes round
    if (Math.abs(dx) < 10) { a.z = clamp(a.z - Math.sign(dz || 1) * push * 0.6 * ma, Z0, Z1); b.z = clamp(b.z + Math.sign(dz || 1) * push * 0.6 * mb, Z0, Z1); }
  }
}

/* ---- the players ----------------------------------------------------------------------------- */
function updateHero(h, I, P, dt) {
  if (!h.active) return;
  // a press made while busy is kept for a moment and used as soon as the fighter is free
  const BUF = ['punch', 'kick', 'jump', 'special'];
  for (const k of BUF) if (P[k]) h.buf = { k, t: 0.24, dirX: (I.right || P.right ? 1 : 0) - (I.left || P.left ? 1 : 0) };
  if (h.buf) { h.buf.t -= dt; if (h.buf.t <= 0) h.buf = null; }
  const free = ['idle', 'walk', 'run'].includes(h.state) || (h.state === 'air' && h.buf && h.buf.k !== 'jump') || h.state === 'grab';
  if (free && h.buf && !BUF.some((k) => P[k])) { P = Object.assign({}, P, { [h.buf.k]: true }); }
  if (free && h.buf && BUF.some((k) => P[k])) h.buf = null;
  if (h.comboT > 0) { h.comboT -= dt; if (h.comboT <= 0) h.combo = 0; }
  if (h.state === 'dead') return;
  const dirX = (I.right || P.right ? 1 : 0) - (I.left || P.left ? 1 : 0), dirZ = (I.down || P.down ? 1 : 0) - (I.up || P.up ? 1 : 0);
  // double tap to run
  if (P.left || P.right) { const d = P.right ? 1 : -1; if (h.tapDir === d && h.tapT > 0) h.running = true; h.tapDir = d; h.tapT = 0.26; }
  if (h.tapT > 0) h.tapT -= dt;
  if (!dirX) h.running = false;
  switch (h.state) {
    case 'idle': case 'walk': case 'run': {
      if (P.jump) { setSt(h, 'air', 'air'); h.vh = h.def.jump; h.vx = dirX * h.speed * (h.running ? 1.7 : 1.05); h.vz = dirZ * h.speed * 0.5; chip.sfx('swing', { v: 0.5, p: 0.7 }); break; }
      if (P.special) { doSpecial(h); break; }
      if (P.punch) {
        const it = nearItem(h);
        if (it && !h.weapon) { pickUp(h, it); break; }
        if (h.weapon && h.weapon !== 'knife') { startAttack(h, 'swing'); break; }
        if (h.weapon === 'knife') { startAttack(h, 'stab'); break; }
        if (dirX && dirX !== h.face) { startAttack(h, 'elbow'); break; }
        if (h.state === 'run') { startAttack(h, 'dash'); break; }
        const chain = ['jab', 'jab2', 'cross', 'upper'];
        const idx = h.comboT > 0 ? Math.min(3, h.chainIdx + 1) : 0;
        h.chainIdx = idx; startAttack(h, chain[idx]); h.comboT = Math.max(h.comboT, 0.5);
        break;
      }
      if (P.kick) {
        if (h.state === 'run') { startAttack(h, 'dash'); break; }
        startAttack(h, h.comboT > 0 && h.chainIdx >= 1 ? 'round' : 'kick'); h.chainIdx = 0; h.comboT = Math.max(h.comboT, 0.4);
        break;
      }
      // grab: walk into a reeling or idle enemy at close range
      if (dirX) {
        const t = game.foes.find((o) => !o.dead && !o.boss && (o.state === 'hurt' || o.state === 'dizzy' || (o.state === 'idle' && !o.heavy)) && Math.abs(o.z - h.z) < 9 && (o.x - h.x) * dirX > 0 && Math.abs(o.x - h.x) < 32 && grounded(o));
        if (t) { h.grabT = (h.grabT || 0) + dt; if (h.grabT > 0.12) { grab(h, t); break; } } else h.grabT = 0;
      }
      const sp = h.speed * (h.running ? 1.75 : 1);
      h.vx = dirX * sp; h.vz = dirZ * sp * 0.62;
      if (dirX) h.face = dirX;
      const moving = dirX || dirZ;
      if (moving) { if (h.state === 'idle' || (h.running ? h.state !== 'run' : h.state !== 'walk')) { h.state = h.running ? 'run' : 'walk'; h.anim = h.state; } }
      else if (h.state !== 'idle') { h.state = 'idle'; h.anim = 'idle'; h.vz = 0; }
      if (!moving) h.vz = 0;
      if (moving && Math.floor(h.frame) % 4 === 0 && h.lastStep !== Math.floor(h.frame)) { h.lastStep = Math.floor(h.frame); chip.sfx('step', { v: 0.5 }); }
      break;
    }
    case 'air':
      if (P.kick) startAttack(h, 'jkick'); else if (P.punch) startAttack(h, 'jpunch');
      break;
    case 'grab': {
      const t = h.hold;
      h.holdT += dt;
      if (!t || t.dead || t.heldBy !== h || h.holdT > 1.8) { release(h); break; }
      t.x = h.x + h.face * 20 * (CHARS[h.kind].k / 1.9) * 0.8; t.z = h.z; t.face = -h.face;
      if (P.kick || (P.punch && dirX === -h.face)) { toss(h, P.kick ? h.face : -h.face); break; }
      if (P.punch) { startAttack(h, 'knee'); break; }
      if (dirX === -h.face && h.holdT > 0.4) release(h);
      break;
    }
    default: break;
  }
  // stay on screen and on the street
  h.x = clamp(h.x, game.camX + 14, game.camX + W - 14);
  h.z = clamp(h.z, Z0, Z1);
}

function doSpecial(h) {
  if (h.weapon) { throwWeapon(h); return; }
  if (h.meter >= 1) h.meter -= 1;
  else if (h.hp > 12) { h.hp -= 6; }
  else { chip.sfx('back'); return; }
  h.baseFace = h.face; startAttack(h, 'spin'); chip.sfx('special'); game.stats.specials++;
}
function grab(h, t) {
  h.hold = t; t.heldBy = h; h.holdT = 0; h.knees = 0; setSt(h, 'grab', 'hold'); setSt(t, 'held', 'held'); t.atk = null; chip.sfx('grab'); h.grabT = 0;
}
function release(h) {
  const t = h.hold;
  if (t && t.heldBy === h) { t.heldBy = null; if (t.state === 'held') setSt(t, 'idle'); t.vx = h.face * 60; }
  h.hold = null; setSt(h, 'idle');
}
function toss(h, dir) {
  const t = h.hold;
  h.hold = null; t.heldBy = null;
  h.face = dir; setSt(h, 'attack', 'toss'); h.atk = 'tossMove'; h.atkHit = new Set();
  ATK.tossMove = ATK.tossMove || { anim: 'toss', t: [0.08, 0.1, 0.2], r: [0, 0], dmg: 0, push: 0 };
  t.x = h.x + dir * 6; t.hp -= 12 * h.power; t.flash = 0.12; t.lastHitBy = h;
  setSt(t, 'flung', 'flung'); t.vh = 230; t.vx = dir * 210; t.face = -dir; t.thrownBy = h; t.ko = t.hp <= 0; if (t.hp < 0) t.hp = 0;
  h.score += 400; game.stats.throws++; chip.sfx('throw'); game.shake = Math.max(game.shake, 3);
  if (game.stats.throws >= 15) award('suplex');
}

/* ---- the gang's brains ------------------------------------------------------------------------- */
function updateFoe(f, dt) {
  if (f.dead || f.dummy) return;
  if (f.spawnT > 0) { f.spawnT -= dt; f.vx = f.face * f.def.speed; f.state = 'walk'; f.anim = 'walk'; return; }
  if (!canAct(f)) return;
  const D = f.def, heroes = liveHeroes();
  if (!heroes.length) { setSt(f, 'idle', 'taunt'); f.vx = 0; f.vz = 0; return; }
  // pick the nearest hero, keep it a while
  if (!f.target || f.target.dead || f.target.state === 'dead' || !f.target.active || Math.random() < dt * 0.15) f.target = heroes.reduce((a, b) => (Math.abs(b.x - f.x) + Math.abs(b.z - f.z) < Math.abs(a.x - f.x) + Math.abs(a.z - f.z) ? b : a));
  const t = f.target, dx = t.x - f.x, dz = t.z - f.z, adx = Math.abs(dx);
  f.cool -= dt * game.diff.pace; f.think -= dt;
  // throwers keep their distance and send knives
  if (D.throws && f.weapon === 'knife' && f.cool <= 0 && adx > 70 && adx < 200 && Math.abs(dz) < 6 && Math.random() < 0.5) {
    f.face = Math.sign(dx) || f.face; startAttack(f, 'estab'); f.anim = 'flick'; f.flick = true; f.cool = 2.2; return;
  }
  if (f.think <= 0) {
    f.think = 0.3 + Math.random() * 0.4;
    const busy = game.foes.filter((o) => o !== f && o.target === t && (o.plan === 'attack' || o.state === 'attack')).length;
    f.plan = busy >= game.diff.mob && !f.boss ? 'circle' : 'attack';
    if (Math.random() < 0.12 && !f.boss) f.plan = 'circle';
  }
  // where to stand: beside the target on our side
  const side = f.plan === 'circle' ? f.side : (dx > 0 ? -1 : 1);
  const want = f.plan === 'circle' ? 90 + (f.id % 3) * 16 : (f.heavy ? 34 : 26) * BODY;
  const tx = t.x + side * want, tz = f.plan === 'circle' ? clamp(t.z + ((f.id % 2) ? 18 : -18), Z0, Z1) : t.z;
  const ex = tx - f.x, ez = tz - f.z;
  const sp = D.speed * (f.boss && f.hp < f.maxHp * 0.4 ? 1.25 : 1);
  if (Math.abs(ex) > 4 || Math.abs(ez) > 3) {
    f.vx = Math.sign(ex) * Math.min(sp, Math.abs(ex) * 5); f.vz = Math.sign(ez) * Math.min(sp * 0.6, Math.abs(ez) * 5);
    if (f.state !== 'walk') { f.state = 'walk'; f.anim = 'walk'; }
  } else { f.vx = 0; f.vz = 0; if (f.state !== 'idle') { f.state = 'idle'; f.anim = 'idle'; } }
  f.face = Math.sign(dx) || f.face;
  // attack when lined up
  if (f.plan === 'attack' && f.cool <= 0 && Math.abs(dz) < 8 && t.state !== 'down' && t.state !== 'getup') {
    const opts = D.atk;
    let key = opts[Math.floor(Math.random() * opts.length)];
    if (key === 'charge' && adx < 60) key = opts[0];
    if (key === 'ejkick' && adx < 40) key = opts[0];
    const A = ATK[key], k = (f.boss ? 1.2 : f.heavy ? 1.15 : 1) * BODY;
    if (key === 'charge' ? adx < 190 : key === 'ejkick' ? adx < 110 : adx < A.r[1] * k + 4) {
      if (key === 'ejkick') { setSt(f, 'air', 'air'); f.vh = 300; f.vx = Math.sign(dx) * 140; f.atkPending = 'ejkick'; }
      else { startAttack(f, key); if (key === 'charge') { chip.sfx('roar', { v: 0.5 }); } }
      f.cool = (f.boss ? 0.7 : 1.1) + Math.random() * (f.boss ? 0.7 : 1.3) / game.diff.pace;
      // the Warden calls for help when hurt
      if (D.summons && f.hp < f.maxHp * 0.5 && !f.called) { f.called = true; spawnWave([['punk', 'L'], ['punk2', 'R'], ['blade', 'R']]); game.banner = { s: 'BACKUP!', sub: 'THE WARDEN CALLS THE GANG', t: 0 }; }
    }
  }
}
function updateFoeAir(f) {
  if (f.state === 'air' && f.atkPending && f.vh < 120) { const k = f.atkPending; f.atkPending = null; startAttack(f, k); }
}
