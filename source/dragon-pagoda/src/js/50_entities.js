/* ==========================================================================
   Entities: the hero, temple fighters, projectiles, hazards, pickups, effects
   ========================================================================== */

const MAX_HP = 24;
const MAX_CHI = 100;
const HERO_STATS = {
  tao: { name: 'TAO', speed: 88, jumpV: 314, punch: 1, kick: 2, chiGain: 1, airJumps: 0, quick: 1, blurb: ['POWER STYLE', 'KICKS HIT TWICE AS HARD'] },
  lian: { name: 'LIAN', speed: 102, jumpV: 318, punch: 1, kick: 1, chiGain: 1.35, airJumps: 1, quick: 0.82, blurb: ['SWIFT STYLE', 'DOUBLE JUMP, FAST CHI'] }
};

/** Attack table. box = [near, far, lo, hi] in pixels in front of the feet. */
const ATK = {
  jab: { anim: 'punch', dur: 0.22, a0: 0.05, a1: 0.12, box: [3, 24, 22, 38], dmg: 'punch', kb: 40, sfx: 'punch' },
  cross: { anim: 'punch2', dur: 0.24, a0: 0.06, a1: 0.13, box: [3, 25, 22, 38], dmg: 'punch', kb: 50, sfx: 'punch' },
  fist: { anim: 'punch2', dur: 0.34, a0: 0.07, a1: 0.16, box: [3, 28, 18, 40], dmg: 'fin', kb: 150, sfx: 'smash', fin: true },
  kick: { anim: 'kick', dur: 0.3, a0: 0.09, a1: 0.18, box: [5, 31, 9, 30], dmg: 'kick', kb: 70, sfx: 'kick' },
  kick2: { anim: 'kick', dur: 0.3, a0: 0.08, a1: 0.17, box: [5, 31, 9, 30], dmg: 'kick', kb: 70, sfx: 'kick' },
  round: { anim: 'highKick', dur: 0.38, a0: 0.1, a1: 0.2, box: [5, 32, 16, 46], dmg: 'fin', kb: 160, sfx: 'smash', fin: true },
  cpunch: { anim: 'crouchPunch', dur: 0.22, a0: 0.05, a1: 0.12, box: [3, 24, 3, 18], dmg: 'punch', kb: 40, sfx: 'punch', crouch: true },
  sweep: { anim: 'sweep', dur: 0.36, a0: 0.1, a1: 0.2, box: [3, 31, 0, 9], dmg: 'kick', kb: 50, sfx: 'sweep', crouch: true, trip: true },
  jkick: { anim: 'jumpKick', dur: 9, a0: 0.06, a1: 9, box: [5, 29, 3, 24], dmg: 'kick', kb: 90, sfx: 'kick', air: true },
  jpunch: { anim: 'jumpPunch', dur: 9, a0: 0.05, a1: 9, box: [3, 25, 12, 32], dmg: 'punch', kb: 50, sfx: 'punch', air: true }
};

const ETYPES = {
  thug: { hp: 1, speed: [50, 70], pts: 100, w: 7, h: 42, dmg: 0 },
  dagger: { hp: 2, speed: [44, 50], pts: 500, w: 7, h: 42, dmg: 4 },
  monkey: { hp: 1, speed: [118, 138], pts: 200, w: 7, h: 14, dmg: 3 },
  monk: { hp: 3, speed: [32, 38], pts: 800, w: 8, h: 44, dmg: 5 },
  ninja: { hp: 2, speed: [64, 72], pts: 700, w: 7, h: 38, dmg: 5 },
  snake: { hp: 1, speed: [40, 48], pts: 150, w: 8, h: 8, dmg: 2 }
};

let NEXT_ID = 1;

/* ==== the hero ============================================================== */
function makeHero(x, fighter) {
  const S = HERO_STATS[fighter] || HERO_STATS.tao;
  return {
    kind: fighter, S, x, y: GROUND_Y, vx: 0, vy: 0, face: game.F ? game.F.dir : 1, ground: true, crouch: false,
    act: null, hp: MAX_HP, inv: 0, hurtT: 0, dead: false, deadT: 0, grabbers: [], escape: 0, lastDir: 0,
    combo: 0, comboT: 0, jumps: 0, chi: 0, runT: 0, flash: 0, pose: null, bufK: null, bufT: 0, airAtk: false, flexT: 0, wig: 0
  };
}

function heroHurtBox(h) {
  if (h.crouch && h.ground) return box(h.x - 7, h.y - 25, h.x + 7, h.y);
  if (!h.ground) return box(h.x - 6, h.y - 38, h.x + 6, h.y - 2);
  return box(h.x - 6, h.y - 42, h.x + 6, h.y);
}

function heroAttackBox(h) {
  const a = h.act;
  if (!a || a.k === 'chi') return null;
  const D = ATK[a.k];
  if (a.t < D.a0 * h.S.quick || a.t > D.a1 * (D.air ? 1 : h.S.quick)) return null;
  return front(h, D.box[0], D.box[1], D.box[2], D.box[3]);
}

function startAttack(h, k) {
  const D = ATK[k];
  h.act = { k, t: 0, hits: [], bossHit: false, landed: false };
  if (!D.air) { h.vx = 0; }
  chip.sfx('swish', { kick: D.dmg !== 'punch' });
}

function updateHero(h, dt, I, P) {
  h.inv = Math.max(0, h.inv - dt);
  h.flash = Math.max(0, h.flash - dt);
  h.comboT -= dt;
  if (h.comboT <= 0) h.combo = 0;
  h.flexT = Math.max(0, h.flexT - dt);
  if (P.punch) { h.bufK = 'p'; h.bufT = 0.14; }
  if (P.kick) { h.bufK = 'k'; h.bufT = 0.14; }
  h.bufT -= dt;
  if (h.bufT <= 0) h.bufK = null;

  if (h.dead) {
    h.deadT += dt;
    heroPhys(h, dt);
    if (h.ground) h.vx *= 0.8;
    return;
  }
  if (h.pose) { heroPhys(h, dt); return; }

  // knocked back or staggered: no control until it wears off
  if (h.hurtT > 0) {
    h.hurtT -= dt;
    heroPhys(h, dt);
    if (h.ground) h.vx = approach(h.vx, 0, 500 * dt);
    h.act = null;
    return;
  }

  // held by thugs: wiggle and mash to break free
  if (h.grabbers.length) { updateGrabbed(h, dt, I, P); return; }

  // the Dragon Wave
  if (h.act && h.act.k === 'chi') {
    h.act.t += dt;
    if (!h.act.fired && h.act.t >= 0.32) { h.act.fired = true; releaseWave(h); }
    if (h.act.t >= 0.75) h.act = null;
    heroPhys(h, dt);
    return;
  }
  if (P.special && h.chi >= MAX_CHI && h.ground && !h.act) {
    h.act = { k: 'chi', t: 0, hits: [] };
    h.chi = 0; h.inv = Math.max(h.inv, 0.9); h.vx = 0;
    chip.sfx('charge');
    for (let i = 0; i < 16; i++) { const a = rand(0, TAU); fxAdd({ k: 'chiP', x: h.x + Math.cos(a) * 40, y: h.y - 24 + Math.sin(a) * 30, tx: h.x + h.face * 6, ty: h.y - 26, t: 0, life: 0.32 }); }
    return;
  } else if (P.special && h.chi < MAX_CHI && !game.demo) { chip.sfx('nochi'); }

  const dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
  // attacks (buffered presses, combos chain on hits)
  if (h.bufK && (!h.act || (h.act.landed && h.act.t > (ATK[h.act.k].a1 * h.S.quick) && !ATK[h.act.k].air))) {
    const isP = h.bufK === 'p';
    let k = null;
    if (!h.ground) { if (!h.airAtk) { k = isP ? 'jpunch' : 'jkick'; h.airAtk = true; } }
    else if (I.down) k = isP ? 'cpunch' : 'sweep';
    else if (h.combo >= 2 && h.comboT > 0) k = isP ? 'fist' : 'round';
    else if (h.combo === 1 && h.comboT > 0) k = isP ? 'cross' : 'kick2';
    else k = isP ? 'jab' : 'kick';
    if (k) {
      if (dir) h.face = dir;
      startAttack(h, k);
      h.bufK = null;
    }
  }
  // jumping (up or the jump button), with Lian's double jump
  const wantJump = P.jump || P.up;
  if (wantJump && !h.act) {
    if (h.ground) {
      h.vy = -h.S.jumpV; h.ground = false; h.jumps = 0; h.airAtk = false;
      h.vx = dir * h.S.speed; if (dir) h.face = dir;
      chip.sfx('jump'); dust(h.x, h.y, 4);
    } else if (h.jumps < h.S.airJumps && h.vy > -150) {
      h.jumps++; h.vy = -h.S.jumpV * 0.82; h.airAtk = false;
      if (dir) { h.vx = dir * h.S.speed; h.face = dir; }
      chip.sfx('jump2'); fxAdd({ k: 'ring', x: h.x, y: h.y, t: 0, life: 0.3, r0: 4, r1: 16, col: '#9fe8ff' });
    }
  }
  // movement
  const D = h.act ? ATK[h.act.k] : null;
  if (h.ground) {
    h.crouch = !!I.down && (!D || D.crouch);
    if (D && !D.air) h.vx = 0;
    else if (h.crouch) { h.vx = 0; if (dir) h.face = dir; }
    else {
      h.vx = dir * h.S.speed;
      if (dir) h.face = dir;
      if (dir) h.runT += dt * h.S.speed;
    }
  } else {
    h.crouch = false;
    if (dir && !h.act) h.face = dir;
    if (dir) h.vx = approach(h.vx, dir * h.S.speed, 260 * dt);
  }
  if (h.act) {
    h.act.t += dt;
    if (!D.air && h.act.t >= D.dur * h.S.quick) h.act = null;
  }
  const wasGround = h.ground;
  heroPhys(h, dt);
  if (h.ground && !wasGround) {
    if (h.act && ATK[h.act.k].air) h.act = null;
    h.airAtk = false; h.jumps = 0; h.vx = 0;
    chip.sfx('land'); dust(h.x, h.y, 3);
  }
}

function heroPhys(h, dt) {
  h.x += h.vx * dt;
  if (!h.ground) {
    h.vy += GRAV * dt;
    h.y += h.vy * dt;
    if (h.y >= GROUND_Y) { h.y = GROUND_Y; h.vy = 0; h.ground = true; }
  }
}

function updateGrabbed(h, dt, I, P) {
  h.act = null; h.vx = 0; h.crouch = false;
  const dir = P.left ? -1 : P.right ? 1 : 0;
  if (dir && dir !== h.lastDir) { h.escape += 1; h.lastDir = dir; h.wig = 0.12; }
  if (P.punch || P.kick || P.jump || P.up) { h.escape += 0.65; h.wig = 0.12; }
  h.wig = Math.max(0, h.wig - dt);
  h.escape = Math.max(0, h.escape - dt * 0.7);
  const need = (game.diff.id === 'master' ? 4.2 : 3.2) + h.grabbers.length * 1.6;
  h.escNeed = need;
  const drain = 2.6 * game.diff.drain * h.grabbers.length;
  h.hp -= drain * dt;
  h.drainT = (h.drainT || 0) + dt;
  if (h.drainT > 0.4) { h.drainT = 0; chip.sfx('squeeze'); h.flash = 0.06; }
  if (h.hp <= 0) { h.hp = 0; releaseGrabbers(h, false); killHero(h, -h.face); return; }
  if (h.escape >= need) {
    releaseGrabbers(h, true);
    h.escape = 0; h.inv = 0.5; h.flexT = 0.3;
    chip.sfx('shake');
    fxAdd({ k: 'ring', x: h.x, y: h.y - 22, t: 0, life: 0.3, r0: 8, r1: 30, col: '#ffffff' });
  }
}

function releaseGrabbers(h, flung) {
  for (const id of h.grabbers) {
    const e = game.foes.find((f) => f.id === id);
    if (!e || e.st !== 'grab') continue;
    if (flung) {
      const side = sgn(e.x - h.x) || 1;
      killFoe(e, side, 120, true);
      addScore(e.T.pts, e.x, e.y - 48, true);
      pop(e.x, e.y - 58, 'SHAKE OFF!', '#9fe8ff');
    } else setFoeSt(e, 'walk');
  }
  h.grabbers = [];
}

/** Damage the hero. dir is the direction the hit pushes them. */
function hurtHero(h, dmg, dir, opt) {
  if (h.dead || h.inv > 0 || game.cheat) return false;
  const d = dmg * game.diff.dmg;
  h.hp = Math.max(0, h.hp - d);
  h.flash = 0.12;
  game.stageStats.hits++;
  if (h.grabbers.length) releaseGrabbers(h, false);
  addShake(3);
  if (h.hp <= 0) { killHero(h, dir); return true; }
  chip.sfx('hurt');
  const knock = opt && opt.knock;
  h.act = null; h.crouch = false;
  h.hurtT = knock ? 0.5 : 0.24;
  h.vx = dir * (knock ? 110 : 70);
  if (knock) { h.vy = -170; h.ground = false; }
  h.inv = 1.0;
  return true;
}

function killHero(h, dir) {
  if (h.dead) return;
  h.dead = true; h.deadT = 0; h.hp = 0;
  h.act = null; h.crouch = false; h.grabbers = [];
  h.vx = dir * 90; h.vy = -200; h.ground = false;
  chip.sfx('ko');
  chip.stopMusic(true);
  game.slowT = 0.5;
  onHeroDown();
}

/* ---- the Dragon Wave ------------------------------------------------------------- */
function releaseWave(h) {
  chip.sfx('dragon');
  game.flashT = 0.14; addShake(6); game.hitStop = 0.08;
  game.stageStats.waves++;
  game.shots.push({ k: 'wave', x: h.x + h.face * 14, y: GROUND_Y, vx: h.face * 300, vy: 0, foe: false, t: 0, life: 1.7, hits: [], trail: [] });
}

function grantChi(h, n) {
  if (!h || h.dead) return;
  const before = h.chi;
  h.chi = Math.min(MAX_CHI, h.chi + n * h.S.chiGain);
  if (before < MAX_CHI && h.chi >= MAX_CHI) { chip.sfx('chifull'); pop(h.x, h.y - 70, 'CHI READY!', '#ffd84a'); }
}

/* ==== temple fighters =========================================================== */
function spawnFoe(kind, x, face, opt) {
  const T = ETYPES[kind];
  const e = {
    id: NEXT_ID++, kind, T, x, y: GROUND_Y, vx: 0, vy: 0, face, st: 'walk', t: 0, hp: T.hp, ground: true,
    speed: rand(T.speed[0], T.speed[1]) * game.diff.foeSpeed, flash: 0, walkT: rand(0, 8), cd: rand(0.5, 1.1),
    throws: 0, blocks: 0, alpha: 1, warps: 0, high: chance(0.5)
  };
  if (opt) Object.assign(e, opt);
  if (kind === 'ninja') { e.st = 'appear'; e.alpha = 0; smoke(e.x, e.y - 20, 8); chip.sfx('poof'); }
  game.foes.push(e);
  return e;
}

function setFoeSt(e, st) { e.st = st; e.t = 0; }

function foeAlive(e) { return e.st !== 'dead' && !e.gone; }
function foeHittable(e) { return foeAlive(e) && !(e.st === 'appear' && e.t < 0.15) && e.st !== 'vanish'; }

function foeBox(e) {
  const w = e.T.w;
  let h = e.T.h;
  if (e.kind === 'dagger' && e.st === 'aim' && !e.high) h = 28;
  if (e.kind === 'ninja' && (e.st === 'ready' || e.st === 'appear')) h = 34;
  return box(e.x - w, e.y - h, e.x + w, e.y);
}

function foeAttackBox(e) {
  switch (e.kind) {
    case 'monk': if (e.st === 'bash' && e.t > e.wind && e.t < e.wind + 0.18) return front(e, 2, 24, 6, 40); break;
    case 'ninja': if (e.st === 'slash' && e.t > 0.08 && e.t < 0.2) return front(e, 2, 27, 8, 38); break;
    case 'snake': if (e.st === 'strike' && e.t > 0.22 && e.t < 0.36) return front(e, 2, 17, 0, 10); break;
    case 'monkey': if (e.st === 'leap') return box(e.x - 6, e.y - 14, e.x + 6, e.y); break;
    default: break;
  }
  return null;
}

/** Knock a fighter out: flies back in an arc and lands. */
function killFoe(e, dir, power, quiet) {
  if (e.st === 'dead') return;
  if (e.st === 'grab') { const h = game.hero; h.grabbers = h.grabbers.filter((id) => id !== e.id); }
  e.hp = 0;
  setFoeSt(e, 'dead');
  e.vx = dir * (power || 80) * rand(0.9, 1.15); e.vy = -rand(130, 180); e.ground = false; e.face = -dir;
  if (!quiet) chip.sfx('down');
  game.stageStats.kills++;
  if (e.kind === 'monk' && chance(0.4)) dropItem(chance(0.5) ? 'bun' : 'scroll', e.x, e.y - 30);
}

function updateFoe(e, dt) {
  const h = game.hero;
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  const dx = h.x - e.x, adx = Math.abs(dx), toward = sgn(dx) || e.face;
  if (e.st === 'dead') {
    e.x += e.vx * dt;
    if (!e.ground) {
      e.vy += GRAV * dt; e.y += e.vy * dt;
      if (e.y >= GROUND_Y) { e.y = GROUND_Y; e.ground = true; e.vy = 0; dust(e.x, e.y, 3); chip.sfx('thud'); }
    } else e.vx = approach(e.vx, 0, 400 * dt);
    if (e.t > 1.3) e.gone = true;
    return;
  }
  if (e.st === 'hurt') {
    e.x += e.vx * dt; e.vx = approach(e.vx, 0, 360 * dt);
    if (e.t > (e.stun || 0.3)) { setFoeSt(e, 'walk'); e.stun = 0; e.cd = Math.max(e.cd, 0.4); }
    return;
  }
  if (e.st === 'trip') {
    // swept off their feet
    e.x += e.vx * dt; e.vx = approach(e.vx, 0, 300 * dt);
    if (e.t > 0.75) { setFoeSt(e, 'walk'); e.cd = 0.5; }
    return;
  }
  e.cd -= dt;
  switch (e.kind) {
    case 'thug': thugAI(e, dt, dx, adx, toward, h); break;
    case 'dagger': daggerAI(e, dt, dx, adx, toward, h); break;
    case 'monkey': monkeyAI(e, dt, dx, adx, toward, h); break;
    case 'monk': monkAI(e, dt, dx, adx, toward, h); break;
    case 'ninja': ninjaAI(e, dt, dx, adx, toward, h); break;
    case 'snake': snakeAI(e, dt, dx, adx, toward, h); break;
    default: break;
  }
  // leave the fight if far off screen
  if (e.x < game.camX - 120 || e.x > game.camX + W + 120) e.gone = true;
}

function blockedAhead(e, toward, gap) {
  for (const o of game.foes) {
    if (o === e || !foeAlive(o) || o.kind === 'snake') continue;
    const d = (o.x - e.x) * toward;
    if (d > 0 && d < gap && (o.st === 'grab' || Math.abs(o.vx) < 1 || o.kind !== e.kind)) return true;
  }
  return false;
}

function thugAI(e, dt, dx, adx, toward, h) {
  if (e.st === 'grab') {
    if (h.dead || !h.grabbers.includes(e.id)) { setFoeSt(e, 'walk'); return; }
    const side = e.side;
    e.x = h.x + side * 11; e.face = -side;
    return;
  }
  e.face = adx > 6 ? toward : e.face;
  const wait = blockedAhead(e, e.face, 15);
  e.vx = wait || h.dead ? 0 : e.face * e.speed;
  e.x += e.vx * dt;
  if (e.vx) e.walkT += dt * e.speed;
  const side = sgn(e.x - h.x) || -e.face;
  const busy = h.grabbers.some((id) => { const o = game.foes.find((f) => f.id === id); return o && o.side === side; });
  if (adx < 13 && !busy && h.ground && !h.dead && h.inv <= 0 && h.hurtT <= 0 && !(h.act && h.act.k === 'chi') && !h.pose && game.state === 'play') {
    setFoeSt(e, 'grab'); e.side = side;
    h.grabbers.push(e.id); h.escape = Math.max(0, h.escape - 1);
    chip.sfx('grab');
    if (!game.tutGrab) { game.tutGrab = true; }
  }
}

function daggerAI(e, dt, dx, adx, toward, h) {
  const tele = 0.55 * game.diff.tele;
  if (e.st === 'aim') {
    e.face = toward; e.vx = 0;
    if (e.t >= tele) {
      setFoeSt(e, 'throw');
      const y = e.high ? GROUND_Y - 31 : GROUND_Y - 8;
      game.shots.push({ k: 'knife', x: e.x + e.face * 10, y, vx: e.face * 170 * game.diff.foeSpeed, vy: 0, foe: true, dmg: ETYPES.dagger.dmg, deflect: true, t: 0, life: 3, high: e.high });
      chip.sfx('throw');
      e.throws++;
    }
    return;
  }
  if (e.st === 'throw') {
    if (e.t > 0.35) { setFoeSt(e, 'walk'); e.cd = rand(0.9, 1.6) * game.diff.tele; e.high = chance(e.throws % 3 === 2 ? 0.2 : 0.55); }
    return;
  }
  // keep a throwing distance
  e.face = toward;
  let want = 0;
  if (adx > 120) want = toward;
  else if (adx < 58) want = -toward;
  if (blockedAhead(e, toward, 16) && want === toward) want = 0;
  e.vx = want * e.speed;
  e.x += e.vx * dt;
  if (e.vx) e.walkT += dt * e.speed;
  // stay on screen while throwing
  e.x = clamp(e.x, game.camX - 10, game.camX + W + 10);
  if (e.cd <= 0 && adx < 170 && adx > 40 && e.x > game.camX + 8 && e.x < game.camX + W - 8 && !h.dead) setFoeSt(e, 'aim');
}

function monkeyAI(e, dt, dx, adx, toward, h) {
  if (e.st === 'leap') {
    e.x += e.vx * dt; e.vy += GRAV * dt; e.y += e.vy * dt;
    if (e.y >= GROUND_Y) { e.y = GROUND_Y; e.vy = 0; setFoeSt(e, 'walk'); e.cd = rand(0.7, 1.2); }
    return;
  }
  if (e.st === 'flee') {
    e.x += e.vx * dt;
    if (!e.ground) { e.vy += GRAV * dt; e.y += e.vy * dt; if (e.y >= GROUND_Y) { e.y = GROUND_Y; e.vy = 0; e.ground = true; } }
    if (e.t > 0.7) { setFoeSt(e, 'walk'); e.cd = 0.4; }
    return;
  }
  e.face = toward;
  e.vx = e.face * e.speed;
  e.x += e.vx * dt;
  e.walkT += dt * e.speed;
  if (adx < 46 && adx > 18 && e.cd <= 0 && !h.dead) {
    setFoeSt(e, 'leap');
    e.vy = -235; e.vx = e.face * 150; e.ground = false;
    chip.sfx('monkey');
  }
}

function monkAI(e, dt, dx, adx, toward, h) {
  e.wind = 0.5 * game.diff.tele;
  if (e.st === 'bash') {
    if (e.t > e.wind && e.t < e.wind + 0.16) { e.x += e.face * 150 * dt; }
    if (e.t > e.wind + 0.6) { setFoeSt(e, 'walk'); e.cd = rand(1.0, 1.8); }
    if (e.t >= e.wind && !e.whoosh) { e.whoosh = true; chip.sfx('bash'); }
    return;
  }
  if (e.st === 'block') { if (e.t > 0.25) setFoeSt(e, 'walk'); return; }
  e.face = toward;
  const want = adx > 30 ? toward : 0;
  e.vx = blockedAhead(e, toward, 18) ? 0 : want * e.speed;
  e.x += e.vx * dt;
  if (e.vx) e.walkT += dt * e.speed;
  if (adx < 40 && e.cd <= 0 && !h.dead) { setFoeSt(e, 'bash'); e.whoosh = false; }
}

function ninjaAI(e, dt, dx, adx, toward, h) {
  if (e.st === 'appear') {
    e.alpha = Math.min(1, e.t / 0.3); e.face = toward;
    if (e.t > 0.35) setFoeSt(e, 'ready');
    return;
  }
  if (e.st === 'ready') {
    e.face = toward;
    if (e.t > 0.5 * game.diff.tele) { setFoeSt(e, 'dash'); chip.sfx('dash'); }
    return;
  }
  if (e.st === 'dash') {
    e.face = toward;
    e.x += e.face * 210 * dt; e.walkT += dt * 210;
    if (adx < 18 || e.t > 0.45) { setFoeSt(e, 'slash'); chip.sfx('slash'); }
    return;
  }
  if (e.st === 'slash') {
    if (e.t > 0.42) {
      if (e.warps < 2) { setFoeSt(e, 'vanish'); smoke(e.x, e.y - 20, 8); chip.sfx('poof'); }
      else { setFoeSt(e, 'walk'); e.cd = 0.9; }
    }
    return;
  }
  if (e.st === 'vanish') {
    e.alpha = Math.max(0, 1 - e.t / 0.2);
    if (e.t > 0.7) {
      e.warps++;
      const side = chance(0.5) ? 1 : -1;
      let x = h.x + side * rand(56, 86);
      if (x < game.camX + 16 || x > game.camX + W - 16) x = h.x - side * rand(56, 86);
      e.x = clamp(x, game.camX + 16, game.camX + W - 16);
      setFoeSt(e, 'appear'); smoke(e.x, e.y - 20, 8); chip.sfx('poof');
    }
    return;
  }
  e.face = toward;
  e.vx = adx > 24 ? toward * e.speed : 0;
  e.x += e.vx * dt;
  if (e.vx) e.walkT += dt * e.speed;
  if (adx < 70 && e.cd <= 0 && !h.dead) setFoeSt(e, 'ready');
}

function snakeAI(e, dt, dx, adx, toward, h) {
  if (e.st === 'strike') { if (e.t > 0.7) { setFoeSt(e, 'walk'); e.cd = 0.8; } return; }
  e.face = toward;
  e.x += e.face * e.speed * dt;
  e.walkT += dt * 6;
  if (adx < 20 && e.cd <= 0 && !h.dead) { setFoeSt(e, 'strike'); chip.sfx('hiss'); }
}

/* ---- the hero lands a blow --------------------------------------------------------- */
function attackLow(ab) { return ab.y1 > GROUND_Y - 8; }

/** Returns 'hit', 'block' or null. */
function strikeFoe(e, h, D, ab) {
  const fromFront = sgn(h.x - e.x) === e.face;
  if (e.kind === 'monk' && fromFront && !attackLow(ab) && e.st !== 'hurt' && e.st !== 'trip') {
    setFoeSt(e, 'block'); e.blocks++;
    chip.sfx('clang');
    sparks((h.x + e.x) / 2 + e.face * 4, h.y - 26, 6, '#ffe27a');
    h.x -= h.face * 6;
    if (e.blocks >= 3) { e.blocks = 0; setFoeSt(e, 'hurt'); e.stun = 1.2; e.vx = h.face * 40; pop(e.x, e.y - 52, 'GUARD BREAK!', '#ffd27a'); chip.sfx('break'); }
    return 'block';
  }
  let dmg = D.dmg === 'punch' ? h.S.punch : D.dmg === 'kick' ? h.S.kick : 3;
  e.hp -= dmg;
  e.flash = 0.08;
  const hx = e.x - h.face * 4, hy = clamp((ab.y0 + ab.y1) / 2, e.y - e.T.h + 4, e.y - 3);
  hitSpark(hx, hy, D.fin);
  chip.sfx(D.fin ? 'smash' : D.dmg === 'punch' ? 'punch' : 'kick');
  if (e.hp <= 0) {
    killFoe(e, h.face, D.fin ? 200 : D.kb + 40, true);
    chip.sfx('down');
    addScore(e.T.pts + (D.fin ? 200 : 0), e.x, e.y - e.T.h - 6, true);
    if (D.fin) pop(e.x, e.y - e.T.h - 28, 'FINISH!', '#ff9a30');
    grantChi(h, D.fin ? 12 : 4);
  } else if (D.trip) {
    setFoeSt(e, 'trip'); e.vx = h.face * 40;
    addScore(50, e.x, e.y - e.T.h - 6, false, true);
  } else {
    setFoeSt(e, 'hurt'); e.vx = h.face * D.kb; e.stun = 0.3;
    if (e.kind === 'dagger' || e.kind === 'ninja') e.cd = Math.max(e.cd, 0.5);
  }
  grantChi(h, 7);
  return 'hit';
}

function onLanded(h, D, strong) {
  h.act.landed = true;
  if (D.fin) { h.combo = 0; h.comboT = 0; }
  else if (!D.air && !D.crouch) { h.combo = Math.min(2, h.combo + 1); h.comboT = D.dur * h.S.quick - h.act.t + 0.42; }
  game.hitStop = Math.max(game.hitStop || 0, D.fin || strong ? 0.1 : 0.045);
  if (D.fin) addShake(4);
}

function resolveHeroAttacks() {
  const h = game.hero;
  if (!h || h.dead) return;
  const ab = heroAttackBox(h);
  if (!ab) return;
  const a = h.act, D = ATK[a.k];
  let landed = false;
  for (const e of game.foes) {
    if (!foeHittable(e) || a.hits.includes(e.id)) continue;
    if (boxHit(ab, foeBox(e))) { a.hits.push(e.id); if (strikeFoe(e, h, D, ab) === 'hit') landed = true; }
  }
  for (const s of game.shots) {
    if (!s.foe || s.gone || !s.deflect) continue;
    if (boxHit(ab, shotBox(s))) { deflectShot(s, h); landed = true; }
  }
  for (const z of game.haz) {
    if (z.gone || a.hits.includes(z)) continue;
    const zb = hazHitBox(z);
    if (zb && boxHit(ab, zb)) { a.hits.push(z); if (hitHazard(z, h)) landed = true; }
  }
  const b = game.boss;
  if (b && !b.dead && !a.bossHit && b.hittable()) {
    const r = b.strike(ab, D, h);
    if (r) { a.bossHit = true; if (r === 'hit') landed = true; }
  }
  if (landed) onLanded(h, D);
}

function resolveFoeAttacks() {
  const h = game.hero;
  if (!h || h.dead || h.inv > 0 || (h.act && h.act.k === 'chi') || h.pose) return;
  const hb = heroHurtBox(h);
  for (const e of game.foes) {
    if (!foeAlive(e)) continue;
    const ab = foeAttackBox(e);
    if (ab && boxHit(ab, hb)) {
      const dir = sgn(h.x - e.x) || -h.face;
      hurtHero(h, e.T.dmg, dir, { knock: e.kind === 'monk' || e.kind === 'ninja' });
      if (e.kind === 'monkey') { setFoeSt(e, 'flee'); e.vx = -e.face * 100; e.vy = -120; e.ground = false; }
      return;
    }
  }
  for (const s of game.shots) {
    if (!s.foe || s.gone) continue;
    if (boxHit(shotBox(s), hb)) {
      hurtHero(h, s.dmg, sgn(s.vx) || -h.face, { knock: !!s.knock });
      if (!s.pierce) { s.gone = true; sparks(s.x, s.y, 4, '#ffffff'); }
      return;
    }
  }
  for (const z of game.haz) {
    const zb = hazHurtBox(z);
    if (zb && boxHit(zb, hb)) { hurtHero(h, z.dmg, sgn(h.x - z.x) || -h.face, { knock: z.knock }); if (z.k === 'wisp') popWisp(z); return; }
  }
  const b = game.boss;
  if (b && !b.dead) {
    const hit = b.touches(hb);
    if (hit) hurtHero(h, hit.dmg, hit.dir || sgn(h.x - b.x) || -1, { knock: hit.knock });
  }
}

/* ==== projectiles ================================================================= */
function shotBox(s) {
  switch (s.k) {
    case 'knife': return box(s.x - 5, s.y - 2, s.x + 5, s.y + 2);
    case 'fan': return box(s.x - 7, s.y - 7, s.x + 7, s.y + 7);
    case 'tal': return box(s.x - 4, s.y - 6, s.x + 4, s.y + 6);
    case 'orb': return box(s.x - 6, s.y - 6, s.x + 6, s.y + 6);
    case 'shock': return box(s.x - 7, GROUND_Y - 10, s.x + 7, GROUND_Y);
    case 'fire': return box(s.x - 9, GROUND_Y - 16, s.x + 9, GROUND_Y);
    case 'wave': return box(s.x - 20, GROUND_Y - 54, s.x + 20, GROUND_Y);
    default: return box(s.x - 3, s.y - 3, s.x + 3, s.y + 3);
  }
}

function deflectShot(s, h) {
  if (s.k === 'tal' || s.k === 'fan' && s.brittle) {
    s.gone = true; chip.sfx('tear'); sparks(s.x, s.y, 6, s.k === 'tal' ? '#f2d16b' : '#d6283d');
    addScore(100, s.x, s.y - 8, false); grantChi(h, 6);
    return;
  }
  s.foe = false; s.vx = h.face * Math.max(200, Math.abs(s.vx) * 1.45); s.vy = 0; s.t = 0; s.life = 2; s.deflected = true;
  chip.sfx('parry');
  sparks(s.x, s.y, 6, '#ffe27a');
  fxAdd({ k: 'star', x: s.x, y: s.y, t: 0, life: 0.14 });
  addScore(300, s.x, s.y - 10, false);
  pop(s.x, s.y - 20, 'DEFLECT!', '#9fe8ff');
  grantChi(h, 15);
  game.stageStats.deflects++;
  game.hitStop = Math.max(game.hitStop || 0, 0.06);
}

function updateShots(dt) {
  const h = game.hero;
  for (const s of game.shots) {
    s.t += dt;
    if (s.k === 'fan' && s.foe && s.boomer) {
      // out, then curving home to the thrower
      const b = game.boss;
      if (s.t > s.turnT && b && !b.dead) {
        const tx = b.x, ty = b.y - 30;
        s.vx = approach(s.vx, sgn(tx - s.x) * 210, 520 * dt);
        s.vy = approach(s.vy, clamp((ty - s.y) * 3, -80, 80), 300 * dt);
        if (Math.abs(tx - s.x) < 10 && s.t > s.turnT + 0.3) { s.gone = true; b.catchFan && b.catchFan(); }
      }
    } else if (s.k === 'tal' && s.foe) {
      s.vy = Math.sin(s.t * 5 + s.ph) * 40 + clamp((h.y - 28 - s.y) * 0.8, -30, 30);
    } else if (s.k === 'wave') {
      s.trail.unshift({ x: s.x, y: GROUND_Y - 26 + Math.sin(s.t * 14) * 9 });
      if (s.trail.length > 16) s.trail.length = 16;
      for (const e of game.foes) {
        if (!foeHittable(e) || s.hits.includes(e.id)) continue;
        if (boxHit(shotBox(s), foeBox(e))) { s.hits.push(e.id); hitSpark(e.x, e.y - 22, true); killFoe(e, sgn(s.vx), 220, true); chip.sfx('smash'); addScore(e.T.pts, e.x, e.y - e.T.h - 6, true); }
      }
      for (const o of game.shots) if (o.foe && !o.gone && Math.abs(o.x - s.x) < 22) { o.gone = true; sparks(o.x, o.y, 5, '#ffd84a'); }
      for (const z of game.haz) if ((z.k === 'wisp' || z.k === 'vase') && !z.gone && Math.abs(z.x - s.x) < 22) hitHazard(z, h);
      const b = game.boss;
      if (b && !b.dead && !s.bossHit && b.hittable() && Math.abs(b.x - s.x) < 26) { s.bossHit = true; b.waveHit(sgn(s.vx)); }
    } else if (s.k === 'shock') {
      // ground shockwave
    } else if (s.grav) s.vy += s.grav * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.t > s.life || s.x < game.camX - 60 || s.x > game.camX + W + 60) s.gone = true;
    // deflected knives and orbs fly back into enemies
    if (!s.foe && s.k !== 'wave') {
      for (const e of game.foes) {
        if (!foeHittable(e)) continue;
        if (boxHit(shotBox(s), foeBox(e))) {
          s.gone = true; hitSpark(e.x, s.y, true); killFoe(e, sgn(s.vx), 140, true); chip.sfx('smash');
          addScore(e.T.pts + 300, e.x, e.y - e.T.h - 6, true); pop(e.x, e.y - e.T.h - 18, 'RETURN!', '#9fe8ff');
          break;
        }
      }
      const b = game.boss;
      if (!s.gone && b && !b.dead && b.hittable() && b.shotHit && b.shotHit(s)) s.gone = true;
    }
  }
  game.shots = game.shots.filter((s) => !s.gone);
}

/* ==== hazards: falling vases, fire vents, spirit wisps, lightning ======================= */
function hazHitBox(z) {
  if (z.k === 'vase' && z.st === 'fall') return box(z.x - 6, z.y - 16, z.x + 6, z.y);
  if (z.k === 'wisp') return box(z.x - 6, z.y - 6, z.x + 6, z.y + 6);
  return null;
}
function hazHurtBox(z) {
  if (z.k === 'vase' && z.st === 'fall' && z.y > GROUND_Y - 60) return box(z.x - 5, z.y - 14, z.x + 5, z.y);
  if (z.k === 'vent' && z.st === 'burst') return box(z.x - 11, GROUND_Y - 50, z.x + 11, GROUND_Y);
  if (z.k === 'wisp') return box(z.x - 4, z.y - 4, z.x + 4, z.y + 4);
  if (z.k === 'bolt' && z.st === 'strike' && z.t < 0.18) return box(z.x - 10, HUD_H, z.x + 10, GROUND_Y);
  return null;
}

function hitHazard(z, h) {
  if (z.k === 'vase') {
    breakVase(z, true);
    addScore(300, z.x, z.y - 20, false);
    pop(z.x, z.y - 30, 'NICE CATCH!', '#ffd27a');
    grantChi(h, 8);
    return true;
  }
  if (z.k === 'wisp') {
    popWisp(z);
    addScore(300, z.x, z.y - 10, true);
    grantChi(h, 6);
    return true;
  }
  return false;
}

function popWisp(z) { z.gone = true; chip.sfx('wisp'); sparks(z.x, z.y, 8, '#9fe8ff'); fxAdd({ k: 'ring', x: z.x, y: z.y + 6, t: 0, life: 0.25, r0: 2, r1: 12, col: '#9fe8ff' }); }

function spawnVase(x) {
  game.haz.push({ k: 'vase', x, y: HUD_H + 22, vy: 0, st: 'wobble', t: 0, kind: chance(0.5) ? 1 : 0, dmg: 3 });
  chip.sfx('rattle');
}

function breakVase(z, midair) {
  z.gone = true;
  chip.sfx('shatter');
  const c = z.kind ? ['#e8eef4', '#2f5fae'] : ['#c0452a', '#f2c94c'];
  for (let i = 0; i < 10; i++) fxAdd({ k: 'shard', x: z.x, y: z.y - 8, vx: rand(-90, 90), vy: rand(-180, -60), t: 0, life: 0.9, col: c[i % 2] });
  if (midair) { dropItem(pickWeighted({ bun: 4, scroll: 3, coin: 3, peach: game.floorIdx >= 1 ? 0.6 : 0 }), z.x, z.y - 8); return; }
  const r = Math.random();
  if (r < 0.5) { const e = spawnFoe('snake', z.x, sgn(game.hero.x - z.x) || 1); e.cd = 0.5; chip.sfx('hiss'); }
  else if (r < 0.72) dropItem(pickWeighted({ bun: 5, scroll: 3, coin: 4 }), z.x, z.y - 8);
}

function pickWeighted(mix) {
  const keys = Object.keys(mix), total = keys.reduce((a, k) => a + mix[k], 0);
  let r = Math.random() * total;
  for (const k of keys) { r -= mix[k]; if (r <= 0) return k; }
  return keys[0];
}

function updateHazards(dt) {
  const F = game.F, h = game.hero;
  // scheduled hazard spawns while walking the hall
  if (game.state === 'play' && !game.bossSeq && !h.dead) {
    game.hazT -= dt * game.diff.spawn;
    if (game.hazT <= 0) {
      if (F.hazard === 'vases') { game.hazT = rand(2.2, 3.8); spawnVase(clamp(h.x + F.dir * rand(14, 80), game.camX + 20, game.camX + W - 20)); }
      else if (F.hazard === 'wisps') { game.hazT = rand(3.4, 5.6); const side = chance(0.72) ? F.dir : -F.dir; game.haz.push({ k: 'wisp', x: side > 0 ? game.camX + W + 10 : game.camX - 10, y: GROUND_Y - 31, by: GROUND_Y - 31, vx: -side * 36, t: 0, ph: rand(0, TAU), dmg: 3 }); }
      else if (F.hazard === 'bolts') { game.hazT = rand(3.0, 5.2); game.haz.push({ k: 'bolt', x: clamp(h.x + rand(-26, 50) * F.dir, game.camX + 16, game.camX + W - 16), st: 'warn', t: 0, dmg: 6, knock: true }); chip.sfx('crackle'); }
      else game.hazT = 99;
    }
  }
  for (const z of game.haz) {
    z.t += dt;
    if (z.k === 'vase') {
      if (z.st === 'wobble') { if (z.t > 0.55) { z.st = 'fall'; z.t = 0; } }
      else { z.vy += 420 * dt; z.y += z.vy * dt; if (z.y >= GROUND_Y) { z.y = GROUND_Y; breakVase(z, false); } }
    } else if (z.k === 'vent') {
      const cyc = (game.time + z.off) % 4.6;
      const st = cyc < 2.7 ? 'idle' : cyc < 3.55 ? 'warn' : 'burst';
      if (st !== z.st) {
        z.st = st;
        if (st === 'warn' && onScreen(z.x, 40)) chip.sfx('sizzle');
        if (st === 'burst' && onScreen(z.x, 40)) chip.sfx('fire');
      }
      if (z.st === 'burst') {
        if (Math.random() < 0.6) fxAdd({ k: 'flame', x: z.x + rand(-8, 8), y: GROUND_Y - 4, vx: rand(-10, 10), vy: rand(-140, -90), t: 0, life: rand(0.25, 0.45) });
        for (const e of game.foes) {
          if (foeAlive(e) && Math.abs(e.x - z.x) < 13 && e.y > GROUND_Y - 50) {
            killFoe(e, sgn(e.x - z.x) || 1, 90, true); chip.sfx('down');
            addScore(300, e.x, e.y - 48, true); pop(e.x, e.y - 58, 'SCORCHED!', '#ff9a30');
          }
        }
      } else if (z.st === 'warn' && Math.random() < 0.3) fxAdd({ k: 'steam', x: z.x + rand(-8, 8), y: GROUND_Y - 2, vx: rand(-6, 6), vy: rand(-40, -20), t: 0, life: 0.6 });
    } else if (z.k === 'wisp') {
      z.x += z.vx * dt;
      const toward = sgn(h.x - z.x);
      if (toward && Math.abs(h.x - z.x) > 30) z.vx = approach(z.vx, toward * 36, 30 * dt);
      z.y = z.by + Math.sin(z.t * 3 + z.ph) * 7;
      if (z.x < game.camX - 40 || z.x > game.camX + W + 40 || z.t > 14) z.gone = true;
    } else if (z.k === 'bolt') {
      if (z.st === 'warn' && z.t > 1.05 * game.diff.tele) {
        z.st = 'strike'; z.t = 0; chip.sfx('thunder'); game.flashT = 0.1; addShake(4);
        for (const e of game.foes) if (foeAlive(e) && Math.abs(e.x - z.x) < 12) { killFoe(e, sgn(e.x - z.x) || 1, 90, true); addScore(300, e.x, e.y - 48, true); pop(e.x, e.y - 58, 'ZAPPED!', '#9fe8ff'); }
      } else if (z.st === 'strike' && z.t > 0.5) z.gone = true;
    }
  }
  game.haz = game.haz.filter((z) => !z.gone);
}

/* ==== pickups ======================================================================= */
const ITEM_FX = {
  bun: (h) => { h.hp = Math.min(MAX_HP, h.hp + 8); return '+8 HEALTH'; },
  scroll: (h) => { grantChi(h, 35 / h.S.chiGain); return '+CHI'; },
  coin: () => { addScore(1000, game.hero.x, game.hero.y - 50, false, true); return '1000'; },
  peach: (h) => { h.hp = MAX_HP; if (!game.demo) game.lives = Math.min(9, game.lives + 1); return '1UP + FULL HEALTH'; }
};
function dropItem(type, x, y) { game.items.push({ type, x, y, vy: -120, t: 0, ground: false }); }
function updateItems(dt) {
  const h = game.hero;
  for (const it of game.items) {
    it.t += dt;
    if (!it.ground) { it.vy += GRAV * 0.7 * dt; it.y += it.vy * dt; if (it.y >= GROUND_Y - 2) { it.y = GROUND_Y - 2; if (it.vy > 80) it.vy = -it.vy * 0.35; else { it.ground = true; it.vy = 0; } } }
    if (h && !h.dead && Math.abs(h.x - it.x) < 11 && h.y > it.y - 40 && it.t > 0.25) {
      it.gone = true;
      const label = ITEM_FX[it.type](h);
      chip.sfx(it.type === 'peach' ? 'oneup' : 'pickup');
      pop(it.x, it.y - 18, label, PICKUPS[it.type].color);
      game.stageStats.items++;
    }
    if (it.t > 9) it.gone = true;
  }
  game.items = game.items.filter((i) => !i.gone);
}

/* ==== effects ======================================================================== */
function fxAdd(f) { if (game.fx.length < 260) game.fx.push(f); }
function sparks(x, y, n, col) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(60, 160); fxAdd({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(0.15, 0.3), col }); } }
function hitSpark(x, y, big) { fxAdd({ k: 'star', x, y, t: 0, life: big ? 0.16 : 0.1, big }); sparks(x, y, big ? 8 : 4, big ? '#ffd27a' : '#ffffff'); }
function dust(x, y, n) { for (let i = 0; i < n; i++) fxAdd({ k: 'dust', x: x + rand(-6, 6), y: y - 1, vx: rand(-20, 20), vy: rand(-14, -4), t: 0, life: rand(0.3, 0.5) }); }
function smoke(x, y, n) { for (let i = 0; i < n; i++) fxAdd({ k: 'smoke', x: x + rand(-8, 8), y: y + rand(-14, 14), vx: rand(-16, 16), vy: rand(-20, 4), t: 0, life: rand(0.4, 0.65), r: rand(4, 8) }); }
function addShake(n) { if (settings.shake) game.shake = Math.max(game.shake, n); }
function pop(x, y, s, col) { game.pops.push({ x, y, s, col, t: 0 }); }
function onScreen(x, m) { return x > game.camX - (m || 0) && x < game.camX + W + (m || 0); }

function updateFx(dt) {
  for (const f of game.fx) {
    f.t += dt;
    if (f.k === 'chiP') { const p = Math.min(1, f.t / f.life); f.cx = lerp(f.x, f.tx, p * p); f.cy = lerp(f.y, f.ty, p * p); }
    else if (f.k === 'shard') { f.vy += GRAV * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > GROUND_Y + 2) { f.y = GROUND_Y + 2; f.vy *= -0.3; f.vx *= 0.6; } }
    else if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.k === 'spark') { f.vx *= 0.9; f.vy *= 0.9; } }
  }
  game.fx = game.fx.filter((f) => f.t < f.life);
  for (const p of game.pops) p.t += dt;
  game.pops = game.pops.filter((p) => p.t < 1.1);
}

/* ==== drawing ========================================================================= */
function drawShadow(g, x, y, w, cx) {
  const lift = clamp((GROUND_Y - y) / 60, 0, 0.8);
  const ww = w * 2.5 * (1 - lift * 0.45);
  g.globalAlpha = 0.9 * (1 - lift * 0.6);
  g.drawImage(shadowSprite(), x - cx - ww / 2, GROUND_Y - 2.6, ww, 5.2);
  g.globalAlpha = 1;
}

/** Which animation and (fractional) frame the hero shows right now. */
function heroPose(h) {
  if (h.pose) return h.pose;
  if (h.dead) return ['dead', h.ground ? 2 : clamp(h.deadT / 0.25, 0, 1.6)];
  if (h.hurtT > 0) return h.ground ? ['hurt', 0] : ['dead', 0];
  if (h.grabbers.length) return ['grabbed', h.wig > 0 ? 1 : (game.t * 3) % 2];
  if (h.flexT > 0) return ['flex', 0];
  const a = h.act;
  if (a) {
    if (a.k === 'chi') return ['chi', a.t < 0.32 ? (a.t / 0.32) * 0.99 : 1];
    const D = ATK[a.k];
    if (D.air) return [D.anim, Math.min(1, a.t / D.a0)];
    const q = h.S.quick, a0 = D.a0 * q, a1 = (D.a1 + 0.05) * q, dur = D.dur * q;
    if (a.t < a0) return [D.anim, a.t / a0];
    if (a.t < a1) return [D.anim, 1];
    return [D.anim, 1 + Math.min(0.999, (a.t - a1) / Math.max(0.01, dur - a1))];
  }
  if (!h.ground) return [h.vy < 0 ? 'jumpUp' : 'jumpDown', 0];
  if (h.crouch) return ['crouch', 0];
  if (Math.abs(h.vx) > 1) return ['walk', (h.runT / 6) % 8];
  return ['idle', (game.t * 1.1) % 2];
}

const TRAIL_LIMB = { punch: 'handF', punch2: 'handB', crouchPunch: 'handF', jumpPunch: 'handF', kick: 'footF', highKick: 'footF', sweep: 'footF', jumpKick: 'footF' };

function drawHero(g, h, cx) {
  const [anim, fr] = heroPose(h);
  const blinkOff = h.inv > 0 && !h.dead && !h.pose && Math.floor(game.t * 20) % 2 === 0;
  if (h.chi >= MAX_CHI && !h.dead) {
    drawGlow(g, h.x - cx, h.y - 22, 30 + Math.sin(game.t * 8) * 3, '#ffd84a', 0.55);
    for (let i = 0; i < 3; i++) { const a = game.t * 3 + i * 2.1; disc(g, h.x - cx + Math.cos(a) * 11, h.y - 24 + Math.sin(a * 1.3) * 16, 0.8, '#fff2a0'); }
  }
  // motion trail behind the striking hand or foot
  h.trail = h.trail || [];
  const limb = TRAIL_LIMB[anim];
  if (limb && fr > 0.5 && fr < 1.6 && !h.dead) {
    const J = fighterJoints(h.kind, anim, fr, h.face, h.x, h.y);
    h.trail.push({ x: J[limb][0], y: J[limb][1], t: game.t });
  }
  h.trail = h.trail.filter((p) => game.t - p.t < 0.11);
  if (h.trail.length > 1) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 1; i < h.trail.length; i++) {
      const p0 = h.trail[i - 1], p1 = h.trail[i], a = i / h.trail.length;
      stampLine(g, p0.x - cx, p0.y, p1.x - cx, p1.y, 1 + a * 3.4, 'rgba(255,240,200,' + (0.18 + a * 0.35) + ')');
    }
    g.restore();
  }
  if (!blinkOff) drawSprite(g, h.kind, anim, fr, h.face, h.x - cx, h.y, h.flash > 0 ? '#ff5a4a' : false);
  if (h.grabbers.length && !h.dead) {
    const need = h.escNeed || 5, p = clamp(h.escape / need, 0, 1);
    const x = h.x - cx, y = h.y - 64;
    rrect(g, x - 17, y + 11, 34, 5, 2.5, 'rgba(10,6,10,0.85)');
    g.fillStyle = lgrad(g, x - 16, 0, x + 16, 0, [[0, '#5ef0c0'], [1, '#9fe8ff']]);
    roundRectPath(g, x - 16, y + 12, Math.max(3, 32 * p), 3, 1.5); g.fill();
    const pulse = 1 + Math.sin(game.t * 18) * 0.06;
    g.save(); g.translate(x, y + 4); g.scale(pulse, pulse);
    T(g, input.usingTouch ? 'TAP FAST!' : 'MASH ← →', 0, -4, '#ffffff', { align: 'center', stroke: '#1a0a10', strokeW: 2.2, weight: 700 });
    g.restore();
  }
}

function foePose(e) {
  switch (e.st) {
    case 'dead': return ['dead', e.ground ? 2 : clamp(e.t / 0.25, 0, 1.6)];
    case 'hurt': return ['hurt', 0];
    case 'trip': return ['dead', e.t < 0.12 ? e.t / 0.12 : e.t < 0.55 ? 2 : 1];
    default: break;
  }
  const walkF = (e.walkT / 6) % 8, idleF = (game.t + e.id * 0.37) % 2;
  switch (e.kind) {
    case 'thug':
      if (e.st === 'grab') return ['grab', (game.t * 5) % 2];
      return Math.abs(e.vx) > 1 ? ['walk', walkF] : ['idle', idleF];
    case 'dagger':
      if (e.st === 'aim') return [e.high ? 'throwHigh' : 'throwLow', 0];
      if (e.st === 'throw') return [e.high ? 'throwHigh' : 'throwLow', Math.min(1, e.t / 0.07)];
      return Math.abs(e.vx) > 1 ? ['walk', walkF] : ['idle', idleF];
    case 'monk':
      if (e.st === 'bash') return ['bash', e.t < e.wind ? 0 : Math.min(1, (e.t - e.wind) / 0.07)];
      if (e.st === 'block') return ['block', 0];
      return Math.abs(e.vx) > 1 ? ['walk', walkF] : ['idle', idleF];
    case 'ninja':
      if (e.st === 'slash') return ['slash', Math.min(2, e.t / 0.12)];
      if (e.st === 'dash') return ['walk', (e.walkT / 7) % 8];
      if (e.st === 'ready' || e.st === 'appear' || e.st === 'vanish') return ['idle', 0];
      return Math.abs(e.vx) > 1 ? ['walk', walkF] : ['idle', idleF];
    default: return ['idle', 0];
  }
}

function drawFoe(g, e, cx) {
  const x = e.x - cx;
  if (x < -50 || x > W + 50) return;
  const fade = e.st === 'dead' && e.t > 0.9 ? (Math.floor(e.t * 20) % 2 ? 0.25 : 0.9) : e.alpha;
  if (e.kind === 'monkey') {
    let fr = (e.walkT / 8) % 4;
    if (e.st === 'leap' || e.st === 'flee') fr = 4;
    if (e.st === 'dead' || e.st === 'trip') fr = 5;
    drawMonkey(g, x, e.y, e.face, fr, e.flash > 0, fade);
    return;
  }
  if (e.kind === 'snake') { drawSnake(g, x, e.y, e.face, e.st === 'strike' && e.t > 0.15 ? 2 : 0, fade); return; }
  const [anim, fr] = foePose(e);
  drawSprite(g, e.kind, anim, fr, e.face, x, e.y, e.flash > 0 ? true : false, fade);
  let gl = null;
  if (e.kind === 'dagger' && e.st === 'aim' && e.t > 0.55 * game.diff.tele - 0.28) gl = [x - e.face * 4, e.y - (e.high ? 52 : 20)];
  if (e.kind === 'monk' && e.st === 'bash' && e.t < e.wind && e.t > e.wind - 0.28) gl = [x + e.face * 12, e.y - 30];
  if (e.kind === 'ninja' && e.st === 'ready' && e.t > 0.2) gl = [x + e.face * 14, e.y - 30];
  if (gl) drawGlint(g, gl[0], gl[1]);
  if (e.kind === 'monk' && e.st === 'hurt' && e.stun > 1) drawDizzy(g, x, e.y - 52);
}

/** The white star that warns an attack is coming. */
function drawGlint(g, x, y) {
  const s = 4.5 + Math.sin(game.t * 30) * 1.2;
  drawGlow(g, x, y, 10, '#ffffff', 0.8);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(x, y - s * 1.5); g.lineTo(x + s * 0.28, y - s * 0.28); g.lineTo(x + s * 1.5, y); g.lineTo(x + s * 0.28, y + s * 0.28);
  g.lineTo(x, y + s * 1.5); g.lineTo(x - s * 0.28, y + s * 0.28); g.lineTo(x - s * 1.5, y); g.lineTo(x - s * 0.28, y - s * 0.28);
  g.closePath(); g.fill();
}
function drawDizzy(g, x, y) {
  for (let i = 0; i < 3; i++) {
    const a = game.t * 6 + i * TAU / 3, px = x + Math.cos(a) * 9, py = y + Math.sin(a) * 3;
    drawGlow(g, px, py, 4, '#ffd27a', 0.6);
    g.fillStyle = '#ffe08a'; g.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.9 : 2.2, t = (k / 10) * TAU - Math.PI / 2; g.lineTo(px + Math.cos(t) * r, py + Math.sin(t) * r); }
    g.closePath(); g.fill();
  }
}

function flameTongue(g, x, base, w, h, ph, a) {
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = lgrad(g, 0, base - h, 0, base, [[0, 'rgba(255,90,30,0)'], [0.35, 'rgba(255,120,40,' + 0.75 * a + ')'], [0.8, 'rgba(255,220,120,' + 0.9 * a + ')'], [1, 'rgba(255,255,220,' + a + ')']]);
  g.beginPath();
  g.moveTo(x - w / 2, base);
  g.quadraticCurveTo(x - w * 0.6, base - h * 0.5, x + Math.sin(ph) * w * 0.3, base - h);
  g.quadraticCurveTo(x + w * 0.6, base - h * 0.5, x + w / 2, base);
  g.closePath(); g.fill();
  g.restore();
}

function drawShot(g, s, cx) {
  const x = s.x - cx, y = s.y;
  switch (s.k) {
    case 'knife': drawKnifeShot(g, x, y, sgn(s.vx) || 1, s.deflected); break;
    case 'fan': drawFanShot(g, x, y, s.t); break;
    case 'tal': drawTalismanShot(g, x, y, s.t); break;
    case 'orb': {
      const foe = s.foe, c1 = foe ? '#c04aff' : '#4affd0';
      drawGlow(g, x, y, 18, c1, 0.9);
      g.fillStyle = rgrad(g, x - 1.5, y - 1.5, 0.3, 6.5, [[0, '#ffffff'], [0.35, foe ? '#e8b0ff' : '#b0ffe8'], [1, foe ? '#6a1ab0' : '#14a080']]);
      g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
      for (let i = 0; i < 3; i++) { const a = s.t * 14 + i * 2.1; disc(g, x + Math.cos(a) * 7, y + Math.sin(a) * 7, 0.9, foe ? '#f0d0ff' : '#d0fff0'); }
      break;
    }
    case 'shock': {
      const dir = sgn(s.vx) || 1;
      g.fillStyle = lgrad(g, 0, GROUND_Y - 14, 0, GROUND_Y, [[0, 'rgba(240,226,200,0)'], [1, 'rgba(240,226,200,0.85)']]);
      g.beginPath(); g.moveTo(x - 9 * dir, GROUND_Y); g.quadraticCurveTo(x - 2 * dir, GROUND_Y - 14 - Math.sin(s.t * 30) * 2, x + 6 * dir, GROUND_Y); g.closePath(); g.fill();
      for (let i = 0; i < 4; i++) disc(g, x - dir * (3 + i * 3), GROUND_Y - 2 - (i % 2) * 2, 1.6 - i * 0.25, 'rgba(216,200,176,0.7)');
      break;
    }
    case 'fire': {
      drawGlow(g, x, GROUND_Y - 10, 26, '#ff6a1a', 0.9);
      for (let i = 0; i < 5; i++) flameTongue(g, x - 8 + i * 4, GROUND_Y, 6, 12 + ((i * 7 + Math.floor(s.t * 30)) % 9), s.t * 20 + i, 1);
      break;
    }
    case 'wave': drawWave(g, s, cx); break;
    default: break;
  }
}

function drawWave(g, s, cx) {
  const dir = sgn(s.vx) || 1, tr = s.trail;
  for (let i = tr.length - 1; i >= 0; i -= 2) drawGlow(g, tr[i].x - cx, tr[i].y, 20 - i * 0.6, i % 4 ? '#2ab89a' : '#ffd84a', 0.55);
  for (let i = tr.length - 1; i >= 1; i--) {
    const p = tr[i], r = Math.max(2, 8.2 - i * 0.4), px = p.x - cx;
    disc(g, px, p.y, r + 0.7, '#5a3a08');
    g.fillStyle = rgrad(g, px - r * 0.3, p.y - r * 0.4, 0.2, r * 1.1, i % 3 === 0 ? [[0, '#c0fff0'], [1, '#1ea888']] : [[0, '#fff6c0'], [0.6, '#ffd84a'], [1, '#c08a10']]);
    g.beginPath(); g.arc(px, p.y, r, 0, TAU); g.fill();
    if (i % 2 === 0) poly(g, [px - 1.5, p.y - r, px + dir * 0.5, p.y - r - 3.5, px + 1.5 * dir, p.y - r], '#5ef0c0');
  }
  const hy = tr.length ? tr[0].y : GROUND_Y - 26;
  drawDragonHead(g, s.x - cx + dir * 6, hy, dir, 1.05);
}

function drawHaz(g, z, cx) {
  const x = z.x - cx;
  if (z.k === 'vase') {
    const wob = z.st === 'wobble' ? Math.sin(z.t * 40) * 0.8 : 0;
    const p = clamp((z.y - HUD_H) / (GROUND_Y - HUD_H), 0, 1);
    g.globalAlpha = 0.3 + p * 0.6; g.drawImage(shadowSprite(), x - 4 - p * 6, GROUND_Y - 2, 8 + p * 12, 4); g.globalAlpha = 1;
    g.save(); g.translate(x + wob, z.y); g.rotate(wob * 0.08); drawVase(g, 0, 0, z.kind, 0.95); g.restore();
  } else if (z.k === 'vent') {
    if (z.st === 'warn') {
      const a = 0.5 + 0.4 * Math.sin(game.t * 20);
      drawGlow(g, x, GROUND_Y - 2, 22, '#ff5a1a', a);
      rrect(g, x - 13, GROUND_Y - 2.2, 26, 3, 1, 'rgba(255,140,60,' + a * 0.8 + ')');
    } else if (z.st === 'burst') {
      drawGlow(g, x, GROUND_Y - 26, 56, '#ff6a1a', 0.95);
      for (let i = 0; i < 6; i++) flameTongue(g, x - 9 + i * 3.6, GROUND_Y, 8, 36 + ((i * 13 + Math.floor(game.t * 40)) % 18), game.t * 25 + i, 1);
      flameTongue(g, x, GROUND_Y, 7, 30, game.t * 30, 1);
    }
  } else if (z.k === 'wisp') {
    const y = z.y;
    drawGlow(g, x, y, 16, '#5ab0ff', 0.9);
    g.fillStyle = rgrad(g, x - 1, y - 1, 0.3, 6, [[0, '#ffffff'], [0.4, '#b8ecff'], [1, 'rgba(90,170,255,0.2)']]);
    g.beginPath(); g.moveTo(x - 4.5, y + 1.5);
    g.quadraticCurveTo(x - 4, y - 6, x + Math.sin(z.t * 10) * 1.5, y - 10);
    g.quadraticCurveTo(x + 4, y - 6, x + 4.5, y + 1.5);
    g.quadraticCurveTo(x, y + 6, x - 4.5, y + 1.5); g.fill();
    ellipse(g, x - 1.5, y - 0.5, 0.6, 1.1, 0, '#1a2a5a'); ellipse(g, x + 1.5, y - 0.5, 0.6, 1.1, 0, '#1a2a5a');
  } else if (z.k === 'bolt') {
    if (z.st === 'warn') {
      const p = (z.t * 2) % 1;
      g.strokeStyle = 'rgba(159,232,255,' + (0.9 - p * 0.7) + ')'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(x, GROUND_Y, 6 + p * 10, 2 + p * 2.5, 0, 0, TAU); g.stroke();
      drawGlow(g, x, GROUND_Y - 2, 12, '#9fe8ff', 0.5 + 0.3 * Math.sin(z.t * 25));
      if (Math.random() < 0.5) stampLine(g, x + rand(-6, 6), GROUND_Y - rand(3, 14), x + rand(-6, 6), GROUND_Y, 0.5, '#d8f6ff');
    } else if (z.t < 0.22) {
      let px0 = x, py = HUD_H;
      const pts = [[px0, py]];
      while (py < GROUND_Y) { px0 = x + rand(-7, 7); py = Math.min(GROUND_Y, py + rand(8, 16)); pts.push([px0, py]); }
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
      for (const [w, c] of [[6, 'rgba(120,190,255,0.35)'], [2.6, 'rgba(180,230,255,0.9)'], [1, '#ffffff']]) {
        g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts) g.lineTo(q[0], q[1]); g.stroke();
      }
      g.restore();
      drawGlow(g, x, GROUND_Y - 10, 40, '#9fe8ff', 1);
    } else { g.globalAlpha = 0.5; ellipse(g, x, GROUND_Y, 7, 1.6, 0, '#100c10'); g.globalAlpha = 1; }
  }
}

function drawItem(g, it, cx) {
  const x = it.x - cx, y = it.y;
  if (it.t > 7 && Math.floor(it.t * 10) % 2) return;
  const bob = it.ground ? Math.sin(it.t * 4) * 1.2 : 0;
  drawGlow(g, x, y - 7 + bob, 14, PICKUPS[it.type].color, 0.75);
  drawPickup(g, it.type, x, y - 7 + bob, 1.0);
  if (it.ground) { const a = it.t * 3; disc(g, x + Math.cos(a) * 7, y - 7 + Math.sin(a) * 3, 0.6, '#ffffff'); }
}

function drawFx(g, cx) {
  for (const f of game.fx) {
    const p = f.t / f.life;
    const x = (f.cx !== undefined ? f.cx : f.x) - cx, y = f.cy !== undefined ? f.cy : f.y;
    switch (f.k) {
      case 'spark': {
        const sp = Math.hypot(f.vx, f.vy) || 1, len = 2 + sp * 0.025;
        g.save(); g.globalCompositeOperation = 'lighter';
        stampLine(g, x, y, x - (f.vx / sp) * len, y - (f.vy / sp) * len, 1.1 * (1 - p) + 0.3, f.col || '#ffffff');
        g.restore();
        break;
      }
      case 'star': {
        const r = (f.big ? 11 : 7) * (0.6 + p * 0.6), a = 1 - p;
        drawGlow(g, x, y, r * 1.8, f.big ? '#ffd27a' : '#ffffff', a);
        g.globalAlpha = a; g.fillStyle = '#ffffff';
        g.beginPath();
        for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * 0.22 : r, t = (k / 8) * TAU + 0.4; g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
        g.closePath(); g.fill(); g.globalAlpha = 1;
        break;
      }
      case 'dust': g.globalAlpha = 0.45 * (1 - p); disc(g, x, y, 2 + p * 4, '#d8c8b0'); g.globalAlpha = 1; break;
      case 'smoke': g.globalAlpha = 0.7 * (1 - p); disc(g, x, y, f.r * (0.6 + p * 0.9), p < 0.4 ? '#cac6dc' : '#8a86a0'); g.globalAlpha = 1; break;
      case 'shard': {
        g.save(); g.translate(x, y); g.rotate(f.t * 14 + f.vx);
        poly(g, [-1.4, -0.8, 1.6, -0.2, -0.4, 1.2], f.col); g.restore();
        break;
      }
      case 'ring': { g.globalAlpha = 1 - p; ring(g, x, y, lerp(f.r0, f.r1, p), 1.2, f.col); g.globalAlpha = 1; break; }
      case 'chiP': drawGlow(g, x, y, 4, Math.floor(f.t * 30) % 2 ? '#ffd84a' : '#5ef0c0', 0.9); disc(g, x, y, 0.8, '#ffffff'); break;
      case 'flame': {
        const c = p < 0.3 ? '#fff2b0' : p < 0.6 ? '#ffb02a' : '#ff5a1a';
        drawGlow(g, x, y, 4, '#ff7a2a', 1 - p);
        disc(g, x, y, 1.6 * (1 - p) + 0.4, c);
        break;
      }
      case 'steam': g.globalAlpha = 0.45 * (1 - p); disc(g, x, y, 2 + p * 5, '#ece4e4'); g.globalAlpha = 1; break;
      default: break;
    }
  }
}

function drawPops(g, cx) {
  for (const p of game.pops) {
    const y = p.y - p.t * 22, x = p.x - cx;
    if (p.t > 0.8 && Math.floor(p.t * 20) % 2) continue;
    const w = textWidth(p.s);
    const sc = p.t < 0.08 ? 1 + (0.08 - p.t) * 5 : 1;
    g.save(); g.translate(clamp(x, w / 2 + 3, W - w / 2 - 3), Math.max(HUD_H + 3, y)); g.scale(sc, sc);
    T(g, p.s, 0, 0, p.col, { align: 'center', stroke: '#140a10', strokeW: 2, weight: 700 });
    g.restore();
  }
}
