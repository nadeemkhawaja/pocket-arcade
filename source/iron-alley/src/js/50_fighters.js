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
  // classic belt-scroll moves: few of them, each with weight
  jab: { anim: 'jab', t: [0.09, 0.08, 0.17], r: [6, 32], dmg: 6, push: 6, step: 4, stun: 0.42, sfx: 'punch', stop: 0.05 },
  hook: { anim: 'cross', t: [0.11, 0.09, 0.22], r: [6, 34], dmg: 9, push: 10, step: 6, stun: 0.6, sfx: 'heavy', stop: 0.07, daze: true },
  kick: { anim: 'kick', t: [0.13, 0.1, 0.22], r: [12, 44], dmg: 8, push: 18, step: 4, stun: 0.45, sfx: 'kick', stop: 0.06 },
  round: { anim: 'round', t: [0.13, 0.11, 0.28], r: [10, 46], dmg: 12, kd: true, launch: 190, push: 120, sfx: 'heavy', stop: 0.1 },
  elbow: { anim: 'elbow', t: [0.08, 0.09, 0.2], r: [-38, -4], dmg: 12, push: 26, stun: 0.6, sfx: 'heavy', stop: 0.08, daze: true },
  jkick: { anim: 'jkick', t: [0.03, 0.45, 0.05], r: [6, 46], dmg: 12, kd: true, launch: 170, push: 110, sfx: 'kick', stop: 0.08, air: true },
  cyclone: { anim: 'spin', t: [0.04, 0.5, 0.05], r: [-46, 46], dmg: 14, kd: true, launch: 220, push: 130, sfx: 'heavy', stop: 0.09, air: true },
  knee: { anim: 'knee', t: [0.08, 0.07, 0.18], r: [4, 30], dmg: 8, push: 0, stun: 0.7, sfx: 'kick', stop: 0.07, grab: true },
  swing: { anim: 'swing', t: [0.14, 0.09, 0.24], r: [8, 54], dmg: 15, kd: true, launch: 170, push: 110, sfx: 'wood', stop: 0.1, weapon: true },
  stab: { anim: 'stab', t: [0.09, 0.07, 0.17], r: [6, 42], dmg: 10, push: 20, stun: 0.5, sfx: 'slash', stop: 0.07, weapon: true },
  pin: { anim: 'pinning', t: [0.3, 0.14, 0.3], r: [-6, 30], dmg: 0, push: 0, sfx: 'grab', stop: 0, move: 70 },
  // gang only
  ejab: { anim: 'jab', t: [0.24, 0.08, 0.34], r: [6, 32], dmg: 6, push: 14, stun: 0.42, sfx: 'punch', stop: 0.05 },
  ekick: { anim: 'kick', t: [0.26, 0.09, 0.36], r: [10, 40], dmg: 8, push: 40, stun: 0.36, sfx: 'kick', stop: 0.05 },
  estab: { anim: 'stab', t: [0.28, 0.08, 0.4], r: [6, 40], dmg: 9, push: 30, stun: 0.4, sfx: 'slash', stop: 0.05 },
  epipe: { anim: 'swing', t: [0.36, 0.09, 0.42], r: [8, 52], dmg: 12, kd: true, launch: 150, push: 90, sfx: 'metal', stop: 0.07 },
  ejkick: { anim: 'jkick', t: [0.05, 0.4, 0.2], r: [6, 42], dmg: 10, kd: true, launch: 150, push: 90, sfx: 'kick', stop: 0.06, air: true },
  slam: { anim: 'slam', t: [0.5, 0.1, 0.5], r: [4, 48], dmg: 16, kd: true, launch: 200, push: 130, sfx: 'heavy', stop: 0.1, shake: 6 },
  ehook: { anim: 'cross', t: [0.34, 0.08, 0.4], r: [6, 40], dmg: 12, kd: true, launch: 160, push: 120, sfx: 'heavy', stop: 0.09 },
  charge: { anim: 'charge', t: [0.4, 0.7, 0.5], r: [0, 40], dmg: 14, kd: true, launch: 190, push: 160, sfx: 'heavy', stop: 0.1, move: 300 },
  wrench: { anim: 'swing', t: [0.22, 0.09, 0.3], r: [8, 50], dmg: 10, push: 60, stun: 0.45, sfx: 'metal', stop: 0.07 },
  hammer: { anim: 'slam', t: [0.62, 0.12, 0.6], r: [6, 60], dmg: 20, kd: true, launch: 220, push: 150, sfx: 'metal', stop: 0.12, shake: 9, wave: true },
  wspin: { anim: 'spin', t: [0.3, 0.5, 0.4], r: [-46, 46], dmg: 12, kd: true, launch: 200, push: 130, sfx: 'heavy', stop: 0.08 }
};

/* The heroes. */
const HEROES = {
  kade: { name: 'KADE', kind: 'kade', hp: 120, speed: 60, power: 1.12, jump: 300, blurb: 'HEAVY HANDS. SLOWER, HITS HARDER.', stats: [5, 3, 4] },
  suki: { name: 'SUKI', kind: 'suki', hp: 105, speed: 70, power: 0.96, jump: 330, blurb: 'FAST FEET. QUICK KICKS, BIG AIR.', stats: [3, 5, 5] }
};

/* The gang. */
const FOES = {
  punk: { name: 'RAZOR', kind: 'punk', hp: 30, speed: 50, atk: ['ejab', 'ejab', 'ekick'], score: 300, aggro: 0.6, pins: true },
  punk2: { name: 'SPIKE', kind: 'punk2', hp: 34, speed: 52, atk: ['ejab', 'ekick', 'ekick'], score: 300, aggro: 0.7, pins: true },
  blade: { name: 'SHIV', kind: 'blade', hp: 34, speed: 50, atk: ['estab', 'estab'], score: 450, aggro: 0.55, throws: true, weapon: 'knife' },
  biker: { name: 'CHROME', kind: 'biker', hp: 42, speed: 46, atk: ['epipe', 'ejab'], score: 500, aggro: 0.5, weapon: 'pipe' },
  bruiser: { name: 'BULK', kind: 'bruiser', hp: 95, speed: 38, atk: ['ehook', 'slam', 'charge'], score: 1200, aggro: 0.5, heavy: true },
  tank: { name: 'TANK', kind: 'tank', hp: 300, speed: 50, atk: ['ehook', 'slam', 'charge', 'charge'], score: 10000, aggro: 0.8, heavy: true, boss: true },
  ratchet: { name: 'RATCHET', kind: 'ratchet', hp: 280, speed: 82, atk: ['wrench', 'wrench', 'ejkick', 'ekick'], score: 12000, aggro: 0.85, boss: true, weapon: 'wrench' },
  forge: { name: 'FORGE', kind: 'forge', hp: 380, speed: 46, atk: ['hammer', 'ehook', 'hammer'], score: 15000, aggro: 0.75, heavy: true, boss: true, weapon: 'hammer' },
  warden: { name: 'THE WARDEN', kind: 'warden', hp: 420, speed: 96, atk: ['ejab', 'ehook', 'ejkick', 'wspin', 'ekick'], score: 25000, aggro: 0.95, boss: true, summons: true }
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
    lives: 3, score: 0, meter: 0, spinCool: 0, punches: 0, kicks: 0, chainT: 0, power: H.power, speed: H.speed, inv: 2, active: true });
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
function canAct(f) { return ['idle', 'walk'].includes(f.state); }
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
  if (b.inv > 0 || b.state === 'down' || b.state === 'dead' || b.state === 'getup' || b.state === 'tossed' || b.dead) return false;
  if (b.foe && a.foe) return false;
  if (b.hero && a.hero && !settings.friendly) return false;
  const dir = b.state === 'held' ? a.face : Math.sign(b.x - a.x) || a.face;
  let dmg = A.dmg * (a.hero ? a.power * (a.weapon && A.weapon ? 1 : 1) : game.diff.dmg);
  if (a.hero && b.hold) b.hold = null;
  if (b.heldBy && !(A.grab && b.heldBy === a)) { const h = b.heldBy; h.hold = null; b.heldBy = null; if (h.state === 'grab') setSt(h, 'idle'); }
  b.hp -= dmg; b.flash = 0.12; b.lastHitBy = a;
  if (b.foe) { game.focus = b; game.focusT = 3; }
  if (a.hero) { a.score += Math.round(dmg * 10); a.combo++; a.comboT = 0.9; game.hitCount++; if (a.combo > game.stats.bestCombo) game.stats.bestCombo = a.combo; }
  if (b.pinnedBy && b.pinnedBy !== a) { /* a pinned hero takes the hit; the holder keeps hold */ }
  if (b.pinning) freePin(b.pinning, false);
  game.hitstop = Math.max(game.hitstop, A.stop || 0.05);
  game.shake = Math.max(game.shake, A.shake || (A.kd ? 4 : 2));
  sparks(b.x - dir * 6, b.z, b.h + 30 * (CHARS[b.kind].k / 1.9), A.kd ? 1 : 0.6, A.weapon && a.weapon === 'knife' ? '#ff6a6a' : '#fff2c0');
  chip.sfx(A.sfx, { p: b.heavy ? 0.85 : 1 });
  if (b.hp <= 0) { b.hp = 0; if (a.hero && key === 'elbow') { game.stats.elbowKO = (game.stats.elbowKO || 0) + 1; if (game.stats.elbowKO >= 10) award('ten'); } knockDown(b, dir, Math.max(A.launch || 0, 200), A.push + 60, true); return true; }
  const heavyGuard = b.heavy && !A.kd && b.state === 'attack' && Math.random() < 0.5;
  if (A.kd && !(b.boss && Math.random() < 0.35 && A.dmg < 12)) knockDown(b, dir, A.launch || 160, A.push, false);
  else if (!heavyGuard) {
    b.kdCount = (b.kdCount || 0) + 1; b.lastHurtT = game.t;
    const daze = b.foe && !b.boss && !b.heavy && b.state !== 'held' && (A.daze || b.kdCount >= 2);
    if (daze) { setSt(b, 'dizzy', 'dizzy'); b.kdCount = 0; b.stun = 1.4; }
    else if (b.state !== 'held' && b.state !== 'pinned') { setSt(b, 'hurt', A.anim === 'kick' || A.anim === 'round' ? 'hurtLow' : 'hurt'); b.stun = A.stun || 0.3; }
    b.vx = dir * (A.push || 20) * (b.heavy ? 0.4 : 1); b.atk = null;
    if (b.hero) chip.sfx('hurt', { v: 0.6 });
  }
  return true;
}

function knockDown(b, dir, launch, push, ko) {
  if (b.hold) { b.hold.heldBy = null; b.hold = null; }
  if (b.pinning) freePin(b.pinning, false);
  if (b.pinnedBy) freePin(b, false);
  if (b.foe && b.weapon && ITEM_DEF[b.weapon] && !b.boss) { addItem(b.weapon, b.x, b.z, { vh: 140, h: 24, vx: -dir * 30 }); b.weapon = null; }
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
  if (f.h <= 0 && f.state !== 'pitfall' && !f.dead && inPit(f.x, f.z)) { if (f.hold) release(f); if (f.heldBy) { f.heldBy.hold = null; f.heldBy = null; } setSt(f, 'pitfall', 'flung'); f.pitDone = false; f.vx *= 0.2; f.vz = 0; f.vh = 0; chip.sfx('throw'); }
  if (grounded(f) && f.state !== 'run' && f.state !== 'walk' && !(f.state === 'attack' && ATK[f.atk] && ATK[f.atk].move)) f.vx = approach(f.vx, 0, 600 * dt);
  // thrown bodies knock others over
  if ((f.state === 'flung' || f.state === 'fall') && f.thrownBy) for (const o of fighters()) if (o !== f && o !== f.thrownBy && o.foe === f.foe && Math.abs(o.x - f.x) < 30 && Math.abs(o.z - f.z) < DZ_HIT && o.state !== 'down' && o.state !== 'fall') { landHit(f.thrownBy, o, { dmg: 10, kd: true, launch: 160, push: 90, sfx: 'heavy', stop: 0.07 }, 'body'); }
  switch (f.state) {
    case 'hurt': if (f.st >= f.stun) setSt(f, 'idle'); if (game.t - (f.lastHurtT || 0) > 1.2) f.kdCount = 0; break;
    case 'dizzy': if (f.st > (f.stun || 1.4)) { setSt(f, 'idle'); f.kdCount = 0; } break;
    case 'pinned': if (!f.pinnedBy) setSt(f, 'idle'); break;
    case 'tossed': if (f.tossBy) updateTossed(f, dt); else setSt(f, 'fall', 'fall'); return;
    case 'pitfall': f.h -= 220 * dt; f.alpha = Math.max(0, 1 - f.st * 1.4); if (f.st > 0.8 && !f.pitDone) { f.pitDone = true; pitOut(f); } break;
    case 'idle': case 'walk': if (game.t - (f.lastHurtT || 0) > 1.2) f.kdCount = 0; break;
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
  if (['idle', 'walk', 'dizzy', 'victory', 'taunt', 'pinned'].includes(f.anim)) f.frame += dt * (f.anim === 'run' || f.anim === 'charge' ? 14 : f.anim === 'walk' ? 10 : 3.5);
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
  if (ph === 1 && f.atk !== 'pin') {
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
        if (A.grab) f.knees++;
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
  const L = fighters().filter((f) => grounded(f) && !['down', 'fall', 'held', 'flung', 'dead', 'tossed', 'pinned', 'pinning'].includes(f.state) && !f.heldBy && !f.hold);
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

/* ---- pits ----------------------------------------------------------------------------------------
   A pit is a hole in the front part of the floor: x0..x1 along the street, from depth zTop to the front.
   The back strip stays solid so there is always a way round. */
function inPit(x, z) {
  const S = game.stageDef;
  if (!S || !S.pits) return false;
  for (const p of S.pits) if (x > p[0] + 6 && x < p[1] - 6 && z > p[2] + 4) return true;
  return false;
}
function pitAhead(x, z) {
  const S = game.stageDef;
  if (!S || !S.pits) return null;
  for (const p of S.pits) if (x > p[0] - 26 && x < p[1] + 26 && z > p[2] - 2) return p;
  return null;
}
function pitOut(f) {
  if (f.foe) { f.hp = 0; f.dead = true; const by = f.lastHitBy && f.lastHitBy.hero ? f.lastHitBy : null; if (by) { by.score += 500; game.stats.pitKO = (game.stats.pitKO || 0) + 1; } return; }
  f.hp = 0; f.alpha = 1;
  // find solid ground for the next life
  const p = game.stageDef.pits.find((q) => f.x > q[0] - 30 && f.x < q[1] + 30);
  if (p) f.x = p[0] - 34;
  f.z = Z0 + 6; f.h = 0; setSt(f, 'down', 'down'); f.st = 2; f.koDone = false;
}

/* ---- the players ---------------------------------------------------------------------------------
   Punch and kick are separate buttons. Pressing attack toward your back throws the elbow.
   Two quick hits double an enemy over; walk into them to grab. In a grab, punch knees,
   kick throws them over your shoulder. Jump, then kick in the air for a flying kick.
   The special is a jumping spin kick that clears both sides. */
function updateHero(h, I, P, dt) {
  if (!h.active) return;
  const BUF = ['punch', 'kick', 'jump', 'special'];
  for (const k of BUF) if (P[k]) h.buf = { k, t: 0.34 };
  if (h.buf) { h.buf.t -= dt; if (h.buf.t <= 0) h.buf = null; }
  const free = ['idle', 'walk', 'grab'].includes(h.state) || (h.state === 'air' && h.buf && h.buf.k !== 'jump');
  if (free && h.buf && !BUF.some((k) => P[k])) P = Object.assign({}, P, { [h.buf.k]: true });
  if (free && h.buf && BUF.some((k) => P[k])) h.buf = null;
  if (h.comboT > 0) { h.comboT -= dt; if (h.comboT <= 0) h.combo = 0; }
  if (h.chainT > 0) { h.chainT -= dt; if (h.chainT <= 0) { h.punches = 0; h.kicks = 0; } }
  if (h.spinCool > 0) h.spinCool -= dt;
  if (h.state === 'dead') return;
  const dirX = (I.right || P.right ? 1 : 0) - (I.left || P.left ? 1 : 0), dirZ = (I.down || P.down ? 1 : 0) - (I.up || P.up ? 1 : 0);
  switch (h.state) {
    case 'idle': case 'walk': {
      if (P.jump) { setSt(h, 'air', 'air'); h.vh = h.def.jump; h.vx = dirX * h.speed * 1.25; h.vz = dirZ * h.speed * 0.45; chip.sfx('swing', { v: 0.5, p: 0.7 }); break; }
      if (P.special) { doSpecial(h, dirX); break; }
      const back = dirX && dirX !== h.face;
      if (P.punch || P.kick) {
        const it = P.punch ? nearItem(h) : null;
        if (it && !h.weapon) { pickUp(h, it); break; }
        if (h.weapon === 'drum') { throwWeapon(h); break; }
        if (h.weapon && h.weapon !== 'knife' && P.punch && !back) { startAttack(h, 'swing'); break; }
        if (h.weapon === 'knife' && P.punch && !back) { startAttack(h, 'stab'); break; }
        // the back elbow: attack toward your back without turning round
        if (back) { startAttack(h, 'elbow'); h.punches = 0; h.kicks = 0; break; }
        // punch a doubled-over enemy in front of you and you grab him by the head
        if (P.punch && !h.weapon) {
          const t = game.foes.find((o) => !o.dead && o.state === 'dizzy' && Math.abs(o.z - h.z) < 11 && (o.x - h.x) * h.face > 0 && Math.abs(o.x - h.x) < 46 && grounded(o));
          if (t) { grab(h, t); break; }
        }
        if (P.punch) { h.punches = h.chainT > 0 ? h.punches + 1 : 1; h.kicks = 0; h.chainT = 0.55; startAttack(h, h.punches >= 3 ? 'hook' : 'jab'); if (h.punches >= 3) h.punches = 0; }
        else { h.kicks = h.chainT > 0 ? h.kicks + 1 : 1; h.punches = 0; h.chainT = 0.6; startAttack(h, h.kicks >= 2 ? 'round' : 'kick'); if (h.kicks >= 2) h.kicks = 0; }
        break;
      }
      // grab: walk into an enemy who is doubled over
      if (dirX) {
        const t = game.foes.find((o) => !o.dead && o.state === 'dizzy' && Math.abs(o.z - h.z) < 10 && (o.x - h.x) * dirX > 0 && Math.abs(o.x - h.x) < 34 && grounded(o));
        if (t) { grab(h, t); break; }
      }
      h.vx = dirX * h.speed; h.vz = dirZ * h.speed * 0.66;
      if (dirX) h.face = dirX;
      if (dirX || dirZ) { if (h.state !== 'walk') { h.state = 'walk'; h.anim = 'walk'; } }
      else { if (h.state !== 'idle') { h.state = 'idle'; h.anim = 'idle'; } h.vz = 0; }
      if ((dirX || dirZ) && Math.floor(h.frame) % 4 === 0 && h.lastStep !== Math.floor(h.frame)) { h.lastStep = Math.floor(h.frame); chip.sfx('step', { v: 0.5 }); }
      break;
    }
    case 'air':
      if (P.kick || P.punch) startAttack(h, 'jkick');
      else if (P.special && h.spinCool <= 0) { startAttack(h, 'cyclone'); h.baseFace = h.face; h.spinCool = 2.2; chip.sfx('special'); game.stats.specials++; }
      break;
    case 'grab': {
      const t = h.hold;
      h.holdT += dt;
      if (!t || t.dead || t.heldBy !== h || h.holdT > 2.2) { release(h); break; }
      t.x = h.x + h.face * (9.2 * CHARS[h.kind].k + 6.4 * CHARS[t.kind].k); t.z = h.z - 0.5; t.face = -h.face;
      if (P.kick || ((P.punch) && dirX === -h.face)) { toss(h); break; }
      if (P.punch) { if (h.knees >= 2) { toss(h); break; } startAttack(h, 'knee'); break; }
      if (dirX === -h.face && h.holdT > 0.5) release(h);
      break;
    }
    case 'pinned': {
      // shake free: every button or direction press loosens the grip
      if (BUF.some((k) => P[k]) || P.left || P.right || P.up || P.down) { h.pinHP -= 1; h.x += rand(-1.5, 1.5); }
      if (h.pinHP <= 0) freePin(h, true);
      break;
    }
    default: break;
  }
  h.x = clamp(h.x, game.camX + 14, game.camX + W - 14);
  h.z = clamp(h.z, Z0, Z1);
}

/** The special: a jumping spin kick. On a short cool-down, no other cost. */
function doSpecial(h, dirX) {
  if (h.weapon) { throwWeapon(h); return; }
  if (h.spinCool > 0) { chip.sfx('back'); return; }
  setSt(h, 'air', 'air'); h.vh = h.def.jump * 0.85; h.vx = dirX * h.speed;
  h.baseFace = h.face; startAttack(h, 'cyclone'); h.spinCool = 2.2;
  chip.sfx('special'); game.stats.specials++;
}
function grab(h, t) {
  h.hold = t; t.heldBy = h; h.holdT = 0; h.knees = 0; setSt(h, 'grab', 'hold'); setSt(t, 'held', 'held'); t.atk = null; chip.sfx('grab'); h.grabT = 0;
}
function release(h) {
  const t = h.hold;
  if (t && t.heldBy === h) { t.heldBy = null; if (t.state === 'held') setSt(t, 'idle'); t.vx = h.face * 60; }
  h.hold = null; setSt(h, 'idle');
}
/** The shoulder throw: the enemy goes up and over, landing behind you, flattening anyone there. */
function toss(h) {
  const t = h.hold;
  h.hold = null; t.heldBy = null;
  ATK.tossMove = ATK.tossMove || { anim: 'toss', t: [0.16, 0.2, 0.3], r: [0, 0], dmg: 0, push: 0 };
  setSt(h, 'attack', 'toss'); h.atk = 'tossMove'; h.atkHit = new Set(); h.vx = 0;
  setSt(t, 'tossed', 'flung'); t.tossBy = h; t.tossFace = h.face; t.tossX = h.x; t.vx = 0; t.vh = 0; t.atk = null;
  t.lastHitBy = h; t.thrownBy = null;
  chip.sfx('grab', { p: 0.8 });
}
/** Where a body is during the throw: lifted, carried over the thrower's head, slammed down behind. */
function updateTossed(t, dt) {
  const h = t.tossBy, D = 0.46;
  const u = Math.min(1, t.st / D), f = t.tossFace, k = CHARS[h.kind].k / 1.9;
  t.x = t.tossX + f * 18 * k * Math.cos(Math.PI * u);
  t.h = Math.sin(Math.PI * u) * 19 * k + Math.sin(Math.PI * Math.min(1, u * 1.6)) * 4 * k;
  t.z = h.z; t.face = f;
  t.spinA = -f * Math.PI * 1.1 * u;
  if (u >= 1) {
    t.spinA = 0; t.tossBy = null; t.h = 0;
    t.hp -= 16 * h.power; t.flash = 0.12; if (t.hp < 0) t.hp = 0;
    t.ko = t.hp <= 0; t.thrownBy = h;
    setSt(t, 'fall', 'fall'); t.vh = 90; t.vx = -f * 120; t.bounce = true; t.face = f;
    game.shake = Math.max(game.shake, 6); game.hitstop = Math.max(game.hitstop, 0.08);
    chip.sfx('heavy', { p: 0.8 }); chip.sfx('fall'); dust(t.x, t.z, 1.2);
    h.score += 500; game.stats.throws++; if (game.stats.throws >= 15) award('suplex');
  }
}

/* ---- arm pins: one of the gang grabs you from behind and holds you for a partner ------------------ */
function pinHero(f, h) {
  if (h.pinnedBy || h.state === 'dead' || h.inv > 0) return false;
  h.pinnedBy = f; f.pinning = h; h.pinHP = 7 + Math.round(game.diff.pace * 3); h.pinT = 0;
  if (h.hold) release(h);
  setSt(h, 'pinned', 'pinned'); h.vx = 0; h.vz = 0; h.atk = null;
  setSt(f, 'pinning', 'pinning'); f.face = h.face; f.x = h.x - h.face * 15 * (CHARS[f.kind].k / 1.9); f.z = h.z;
  chip.sfx('grab'); popAt(h.x, h.z, 'BREAK FREE!', '#ff8a8a');
  // the partners rush in
  for (const o of game.foes) if (o !== f && !o.boss) { o.cool = Math.min(o.cool, 0.25); o.plan = 'attack'; o.target = h; }
  return true;
}
function freePin(h, struggled) {
  const f = h.pinnedBy;
  h.pinnedBy = null;
  if (f) { f.pinning = null; if (f.state === 'pinning') { setSt(f, 'hurt', 'hurt'); f.stun = 0.6; f.vx = -h.face * 90; } f.cool = 2.5; }
  if (h.state === 'pinned') { setSt(h, 'idle'); h.inv = Math.max(h.inv, struggled ? 0.4 : 0.2); }
}
function updatePins(dt) {
  for (const h of game.heroes) {
    const f = h.pinnedBy;
    if (!f) continue;
    h.pinT += dt;
    if (f.dead || f.state !== 'pinning' || h.pinT > 2.8) { freePin(h, false); continue; }
    f.x = h.x - h.face * 15 * (CHARS[f.kind].k / 1.9); f.z = h.z; f.face = h.face;
  }
}

/* ---- the gang's brains --------------------------------------------------------------------------- */
function updateFoe(f, dt) {
  if (f.dead || f.dummy) return;
  if (f.spawnT > 0) { f.spawnT -= dt; f.vx = f.face * f.def.speed; f.state = 'walk'; f.anim = 'walk'; return; }
  if (f.state === 'pinning') { f.vx = 0; f.vz = 0; return; }
  if (!canAct(f)) return;
  const D = f.def, heroes = liveHeroes();
  if (!heroes.length) { setSt(f, 'idle', 'taunt'); f.vx = 0; f.vz = 0; return; }
  if (!f.target || f.target.dead || f.target.state === 'dead' || !f.target.active || Math.random() < dt * 0.15) f.target = heroes.reduce((a, b) => (Math.abs(b.x - f.x) + Math.abs(b.z - f.z) < Math.abs(a.x - f.x) + Math.abs(a.z - f.z) ? b : a));
  const t = f.target, dx = t.x - f.x, dz = t.z - f.z, adx = Math.abs(dx);
  f.cool -= dt * game.diff.pace; f.think -= dt;
  // knife men keep their distance and throw
  if (D.throws && f.weapon === 'knife' && f.cool <= 0 && adx > 70 && adx < 200 && Math.abs(dz) < 6 && Math.random() < 0.5) {
    f.face = Math.sign(dx) || f.face; startAttack(f, 'estab'); f.anim = 'flick'; f.flick = true; f.cool = 2.4; return;
  }
  // street punks try to pin a hero from behind
  const behind = (f.x - t.x) * t.face < 0;
  if (D.pins && behind && f.cool <= 0 && adx < 44 && Math.abs(dz) < 7 && canAct(t) && grounded(t) && !game.heroes.some((h) => h.pinnedBy) && Math.random() < 0.3 + 0.15 * game.diff.pace) {
    f.face = Math.sign(dx) || f.face; startAttack(f, 'pin'); f.pinTry = t; f.cool = 3; return;
  }
  if (D.pins && behind && f.cool <= 0 && adx < 44) f.cool = 0.2 + Math.random() * 0.3;   // wait for the chance rather than swinging from behind
  if (f.think <= 0) {
    f.think = 0.35 + Math.random() * 0.5;
    const busy = game.foes.filter((o) => o !== f && o.target === t && (o.plan === 'attack' || o.state === 'attack')).length;
    f.plan = t.pinnedBy ? 'attack' : busy >= game.diff.mob && !f.boss ? 'circle' : 'attack';
    if (Math.random() < 0.15 && !f.boss && !t.pinnedBy) f.plan = 'circle';
  }
  // where to stand: beside the target on our side (or behind them, for a pin)
  let side = f.plan === 'circle' ? f.side : (dx > 0 ? -1 : 1);
  if (D.pins && f.plan === 'attack' && f.id % 2 && !t.pinnedBy) side = -t.face;
  const want = f.plan === 'circle' ? 92 + (f.id % 3) * 16 : (f.heavy ? 34 : 27) * BODY;
  let tx = t.x + side * want, tz = f.plan === 'circle' ? clamp(t.z + ((f.id % 2) ? 18 : -18), Z0, Z1) : t.z;
  // stay out of pits: go round by the back strip
  const p = pitAhead(f.x + Math.sign(tx - f.x) * 20, tz) || pitAhead(tx, tz);
  if (p) tz = p[2] - 6;
  const ex = tx - f.x, ez = tz - f.z;
  const sp = D.speed * (f.boss && f.hp < f.maxHp * 0.4 ? 1.25 : 1);
  if (Math.abs(ex) > 4 || Math.abs(ez) > 3) {
    f.vx = Math.sign(ex) * Math.min(sp, Math.abs(ex) * 5); f.vz = Math.sign(ez) * Math.min(sp * 0.6, Math.abs(ez) * 5);
    if (pitAhead(f.x + f.vx * 0.3, f.z) && !pitAhead(f.x, f.z)) { f.vx = 0; f.vz = -sp * 0.6; }
    if (f.state !== 'walk') { f.state = 'walk'; f.anim = 'walk'; }
  } else { f.vx = 0; f.vz = 0; if (f.state !== 'idle') { f.state = 'idle'; f.anim = 'idle'; } }
  f.face = Math.sign(dx) || f.face;
  // attack when lined up, with a clear wind-up so you can read it
  if (f.plan === 'attack' && f.cool <= 0 && Math.abs(dz) < 8 && t.state !== 'down' && t.state !== 'getup') {
    const opts = D.atk;
    let key = opts[Math.floor(Math.random() * opts.length)];
    if (key === 'charge' && adx < 60) key = opts[0];
    if (key === 'ejkick' && adx < 40) key = opts[0];
    const A = ATK[key], k = (f.boss ? 1.2 : f.heavy ? 1.15 : 1) * BODY;
    if (key === 'charge' ? adx < 190 : key === 'ejkick' ? adx < 110 : adx < A.r[1] * k + 4) {
      if (key === 'ejkick') { setSt(f, 'air', 'air'); f.vh = 300; f.vx = Math.sign(dx) * 140; f.atkPending = 'ejkick'; }
      else { startAttack(f, key); if (key === 'charge') chip.sfx('roar', { v: 0.5 }); }
      f.cool = (f.boss ? 0.8 : 1.3) + Math.random() * (f.boss ? 0.8 : 1.4) / game.diff.pace;
      if (t.pinnedBy) f.cool *= 0.5;
      if (D.summons && f.hp < f.maxHp * 0.5 && !f.called) { f.called = true; spawnWave([['punk', 'L'], ['punk2', 'R'], ['blade', 'R']]); game.banner = { s: 'BACKUP!', sub: 'THE WARDEN CALLS THE GANG', t: 0 }; }
    }
  }
}
function updateFoeAir(f) {
  if (f.state === 'air' && f.atkPending && f.vh < 120) { const k = f.atkPending; f.atkPending = null; startAttack(f, k); }
  // a pin attempt lands if the hero is still in front of the holder at the moment it closes
  if (f.atk === 'pin' && f.state === 'attack' && atkPhase(f) === 1 && f.pinTry) {
    const h = f.pinTry, A = ATK.pin;
    if (Math.abs(h.z - f.z) < 9 && (h.x - f.x) * f.face > -6 && (h.x - f.x) * f.face < A.r[1] * BODY && canAct(h) && grounded(h)) pinHero(f, h);
    f.pinTry = null;
  }
}
