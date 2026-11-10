/* ==========================================================================
   Floor guardians: five bosses with telegraphed, two-phase patterns
   ========================================================================== */

const BOSS_DEFS = {
  fan: { name: 'CRIMSON FAN', title: 'MISTRESS OF THE LANTERN HALL', hp: 22, pts: 10000, w: 7, h: 44 },
  spear: { name: 'JADE SPEAR', title: 'GENERAL OF THE DRUM GALLERY', hp: 24, pts: 15000, w: 8, h: 48 },
  ox: { name: 'IRON OX', title: 'MASTER OF THE FORGE', hp: 32, pts: 20000, w: 14, h: 66 },
  mirror: { name: 'MIRROR MONK', title: 'KEEPER OF THE SHRINE', hp: 24, pts: 25000, w: 8, h: 46 },
  abbot: { name: 'SHADOW ABBOT', title: 'LORD OF THE DRAGON PAGODA', hp: 38, pts: 50000, w: 8, h: 50 }
};

/** How often each guardian blocks a frontal strike while not attacking. */
const BOSS_GUARD = { fan: 0.3, spear: 0.42, ox: 0, mirror: 0, abbot: 0.34 };

function bossSt(b, st) { b.st = st; b.t = 0; b.did = {}; }
function bossOnce(b, key) { if (b.did[key]) return false; b.did[key] = true; return true; }
function bossFace(b) { const d = sgn(game.hero.x - b.x); if (d) b.face = d; }
function bossClamp(b) { b.x = clamp(b.x, game.arena.x0, game.arena.x1); }
function teleT(b, base) { return base * game.diff.tele * (b.phase2 ? 0.82 : 1); }

function makeBoss(kind) {
  const D = BOSS_DEFS[kind], F = game.F;
  const sx = stairX(F);
  const b = {
    kind, D, name: D.name, title: D.title, x: sx + F.dir * 4, y: GROUND_Y - 96, vx: 0, vy: 0, face: -F.dir,
    hp: Math.round(D.hp * game.diff.bossHp), max: Math.round(D.hp * game.diff.bossHp), st: 'enter', t: 0, did: {},
    dead: false, deathT: 0, flash: 0, cd: 1.0, streak: 0, streakT: 0, phase2: false, walkT: 0, fanOut: false, clones: [], aura: 0
  };
  b.max = b.hp;
  b.hittable = () => !b.dead && !['enter', 'vanish', 'gone', 'flip', 'vault', 'vaultWind'].includes(b.st) && !(b.st === 'blink' && b.t < 0.35);
  b.hurtBox = () => {
    if (kind === 'ox' && b.st === 'charge') return box(b.x - 16, b.y - 40, b.x + 16, b.y);
    if (kind === 'fan' && b.st === 'dash') return box(b.x - 8, b.y - 30, b.x + 8, b.y);
    return box(b.x - D.w, b.y - D.h, b.x + D.w, b.y);
  };
  b.strike = (ab, A, h) => bossStrike(b, ab, A, h);
  b.waveHit = (dir) => bossDamage(b, 7, dir, true);
  b.shotHit = (s) => {
    if (!boxHit(shotBox(s), b.hurtBox())) return false;
    hitSpark(b.x, s.y, true);
    bossDamage(b, s.k === 'orb' ? 3 : s.hero ? 1 : 2, sgn(s.vx), true);
    if (!s.hero) pop(b.x, b.y - D.h - 16, 'RETURNED!', '#9fe8ff');
    return true;
  };
  b.touches = (hb) => bossTouches(b, hb);
  b.update = (dt) => bossUpdate(b, dt);
  b.draw = (g, cx, refl) => bossDraw(b, g, cx, refl);
  b.catchFan = () => { b.fanOut = false; };
  if (kind === 'abbot') { b.y = GROUND_Y - 120; }
  return b;
}

/* ---- taking hits -------------------------------------------------------------------- */
function bossStrike(b, ab, A, h) {
  if (b.kind === 'mirror' && b.clones.length) {
    for (const c of b.clones) {
      if (!c.alive) continue;
      if (boxHit(ab, box(c.x - 8, b.y - 46, c.x + 8, b.y))) {
        c.alive = false; chip.sfx('shatter'); sparks(c.x, b.y - 26, 10, '#c4a7ff');
        for (let i = 0; i < 8; i++) fxAdd({ k: 'shard', x: c.x, y: b.y - 26, vx: rand(-80, 80), vy: rand(-160, -40), t: 0, life: 0.8, col: i % 2 ? '#c4a7ff' : '#eef6ff' });
        addScore(100, c.x, b.y - 56, false);
        return 'block';
      }
    }
  }
  if (!boxHit(ab, b.hurtBox())) return null;
  const guard = BOSS_GUARD[b.kind] * (b.phase2 ? 1.25 : 1);
  if (guard && ['idle', 'land', 'taunt', 'guard'].includes(b.st) && sgn(h.x - b.x) === b.face && b.y >= GROUND_Y && chance(guard)) {
    bossSt(b, 'guard'); b.cd = 0;
    chip.sfx('clang');
    sparks(b.x + b.face * 8, clamp((ab.y0 + ab.y1) / 2, b.y - b.D.h, b.y - 6), 6, '#ffe27a');
    h.x -= h.face * 8;
    if (!game.tutGuard) { game.tutGuard = true; pop(b.x, b.y - b.D.h - 14, 'BLOCKED: STRIKE AFTER THEIR ATTACKS', '#ffd27a'); }
    return 'block';
  }
  if (b.kind === 'abbot' && b.st === 'counter') {
    // walked into the counter stance
    bossSt(b, 'riposte'); bossFace(b);
    chip.sfx('counter');
    pop(b.x, b.y - 66, 'COUNTERED!', '#ffd27a');
    game.hitStop = 0.12;
    return 'block';
  }
  let dmg = A.dmg === 'punch' ? h.S.punch : A.dmg === 'kick' ? h.S.kick : 3;
  const hy = clamp((ab.y0 + ab.y1) / 2, b.y - b.D.h + 4, b.y - 4);
  if (b.kind === 'ox') {
    // iron skin: blows glance off unless he is dazed from hitting the wall
    if (b.st === 'stun') dmg *= 1.5;
    else { dmg *= 0.5; sparks(b.x - h.face * 6, hy, 4, '#c9d6e6'); chip.sfx('tink'); if (!game.tutOx) { game.tutOx = true; pop(b.x, b.y - b.D.h - 14, 'IRON SKIN: MAKE HIM CHARGE THE WALL', '#ffd27a'); } }
  }
  hitSpark(b.x - h.face * 5, hy, A.fin);
  chip.sfx(A.fin ? 'smash' : A.dmg === 'punch' ? 'punch' : 'kick');
  bossDamage(b, dmg, h.face, A.fin);
  grantChi(h, 6);
  return 'hit';
}

function bossDamage(b, dmg, dir, heavy) {
  if (b.dead) return;
  b.hp -= dmg; b.flash = 0.07;
  addScore(Math.round(100 * dmg), b.x, b.y - b.D.h - 6, false, true);
  b.streak = b.streakT > 0 ? b.streak + 1 : 1; b.streakT = 1.4;
  if (b.hp <= 0) { bossDie(b, dir); return; }
  if (!b.phase2 && b.hp <= b.max / 2) {
    b.phase2 = true; b.aura = 1.2; chip.sfx('roar'); addShake(5);
    pop(b.x, b.y - b.D.h - 20, 'ENRAGED!', '#ff5a4a');
    if (b.kind === 'mirror' && !b.clones.length) { bossSt(b, 'blink'); return; }
  }
  const armored = b.kind === 'ox' ? b.st !== 'stun' : ['charge', 'dash', 'riposte', 'slam', 'vault', 'leap'].includes(b.st);
  if (!armored && (heavy || ['idle', 'walk', 'cast', 'hurt'].includes(b.st))) {
    bossSt(b, 'hurt'); b.vx = dir * (heavy ? 120 : 60); b.cd = Math.max(b.cd, 0.35);
  }
  if (b.streak >= 3 && b.st !== 'stun' && b.kind !== 'ox') { b.streak = 0; bossEscape(b); }
}

function bossEscape(b) {
  const h = game.hero;
  switch (b.kind) {
    case 'fan': bossSt(b, 'flip'); b.face = sgn(h.x - b.x) || b.face; b.vx = -b.face * 140; b.vy = -260; break;
    case 'spear': bossSt(b, 'vaultWind'); break;
    case 'mirror': bossSt(b, 'blink'); break;
    case 'abbot': bossSt(b, 'counter'); break;
    default: break;
  }
}

function bossDie(b, dir) {
  b.dead = true; b.hp = 0; b.deathT = 0;
  bossSt(b, 'dead');
  b.vx = dir * 70; b.vy = -180; b.y = Math.min(b.y, GROUND_Y);
  b.clones = []; b.fanOut = false;
  for (const s of game.shots) if (s.foe) s.gone = true;
  onBossDown(b);
}

/* ---- dealing hits ------------------------------------------------------------------------ */
function bossTouches(b, hb) {
  const k = b.kind, st = b.st, t = b.t;
  const F = (n, f, lo, hi) => front(b, n, f, lo, hi);
  let hit = null;
  if (k === 'fan') {
    if (st === 'dash') hit = { b: box(b.x - 9, b.y - 30, b.x + 9, b.y), dmg: 5, knock: true };
    if (st === 'slash' && t > b.wind && t < b.wind + 0.12) hit = { b: F(2, 30, 8, 42), dmg: 5 };
  } else if (k === 'spear') {
    if ((st === 'thrustH' || st === 'thrustL') && t > b.wind && t < b.wind + 0.13) hit = { b: F(8, 56, st === 'thrustH' ? 25 : 0, st === 'thrustH' ? 41 : 12), dmg: 5 };
    if (st === 'spin' && t > b.wind && t < b.wind + 0.16) hit = { b: box(b.x - 44, b.y - 12, b.x + 44, b.y), dmg: 5, knock: true };
    if (st === 'vault' && b.vy > 0) hit = { b: box(b.x - 9, b.y - 30, b.x + 9, b.y), dmg: 4 };
  } else if (k === 'ox') {
    if (st === 'charge') hit = { b: box(b.x - 15, b.y - 36, b.x + 15, b.y), dmg: 6, knock: true };
    if (st === 'grab' && t > b.wind && t < b.wind + 0.14) hit = { b: F(2, 28, 10, 52), dmg: 6, knock: true };
    if (st === 'slam' && t < 0.1) hit = { b: F(0, 30, 0, 26), dmg: 5, knock: true };
  } else if (k === 'mirror') {
    if (st === 'palm' && t > b.wind && t < b.wind + 0.12) hit = { b: F(2, 28, 10, 42), dmg: 5, knock: true };
  } else if (k === 'abbot') {
    if (st === 'riposte' && t > 0.08 && t < 0.24) hit = { b: F(0, 34, 6, 46), dmg: 7, knock: true };
    if (st === 'palm' && t > b.wind && Math.floor((t - b.wind) / 0.2) < 3 && (t - b.wind) % 0.2 < 0.08) hit = { b: F(2, 28, 12, 42), dmg: 4 };
    if (st === 'leap' && b.vy > -40) hit = { b: F(-4, 26, 8, 40), dmg: 6, knock: true };
  }
  if (hit && boxHit(hit.b, hb)) return { dmg: hit.dmg, knock: hit.knock, dir: sgn(game.hero.x - b.x) || b.face };
  return null;
}

/* ---- per-frame brains --------------------------------------------------------------------- */
function bossPhys(b, dt, grav) {
  b.x += b.vx * dt;
  if (b.y < GROUND_Y || b.vy < 0) {
    b.vy += (grav || GRAV) * dt; b.y += b.vy * dt;
    if (b.y >= GROUND_Y) { b.y = GROUND_Y; b.vy = 0; return true; }
  }
  return false;
}

function bossUpdate(b, dt) {
  b.t += dt;
  b.flash = Math.max(0, b.flash - dt);
  b.streakT -= dt;
  b.aura = Math.max(0, b.aura - dt);
  b.cd -= dt;
  const h = game.hero;
  if (b.st === 'dead') {
    b.deathT += dt;
    if (bossPhys(b, dt)) { b.vx = 0; dust(b.x, b.y, 6); chip.sfx('thud'); addShake(4); }
    if (b.y >= GROUND_Y) b.vx = approach(b.vx, 0, 300 * dt);
    return;
  }
  if (b.st === 'enter') { bossEnter(b, dt); return; }
  if (b.st === 'hurt') {
    b.x += b.vx * dt; b.vx = approach(b.vx, 0, 500 * dt); bossClamp(b);
    if (b.y < GROUND_Y) bossPhys(b, dt);
    if (b.t > 0.22) bossSt(b, 'idle');
    return;
  }
  if (b.st === 'guard') { b.vx = 0; bossFace(b); if (b.t > 0.3) { bossSt(b, 'idle'); b.cd = 0; } return; }
  if (h.dead) { if (b.y < GROUND_Y) bossPhys(b, dt); b.vx = 0; if (!['idle', 'taunt'].includes(b.st)) bossSt(b, 'taunt'); return; }
  switch (b.kind) {
    case 'fan': fanAI(b, dt, h); break;
    case 'spear': spearAI(b, dt, h); break;
    case 'ox': oxAI(b, dt, h); break;
    case 'mirror': mirrorAI(b, dt, h); break;
    case 'abbot': abbotAI(b, dt, h); break;
    default: break;
  }
  bossClamp(b);
}

function bossEnter(b, dt) {
  const F = game.F, sx = stairX(F);
  if (b.kind === 'abbot') {
    // leaps down from the pavilion roof
    if (b.t < 0.6) return;
    if (bossOnce(b, 'jump')) { b.vx = -F.dir * 120; b.vy = -160; chip.sfx('whoosh'); }
    if (bossPhys(b, dt)) { b.vx = 0; dust(b.x, b.y, 8); chip.sfx('thud'); addShake(5); bossSt(b, 'taunt'); b.cd = 0.8; }
    return;
  }
  // walk down the stairs out of the doorway
  const p = clamp(b.t / 1.5, 0, 1);
  b.x = sx + F.dir * 4 - F.dir * 66 * p;
  b.y = GROUND_Y - 96 * (1 - p);
  b.walkT += dt * 60;
  if (b.kind === 'ox' && Math.floor(b.t * 3) !== Math.floor((b.t - dt) * 3)) { chip.sfx('stomp'); addShake(3); }
  if (p >= 1) { bossSt(b, 'taunt'); b.cd = 0.8; dust(b.x, b.y, 4); }
}

function bossWalk(b, dt, dir, speed) {
  b.vx = dir * speed;
  b.x += b.vx * dt;
  if (dir) b.walkT += dt * speed;
}

/* CRIMSON FAN: boomerang fans, a whirling dash, quick slashes */
function fanAI(b, dt, h) {
  const adx = Math.abs(h.x - b.x);
  b.wind = teleT(b, b.st === 'slash' ? 0.3 : 0.5);
  switch (b.st) {
    case 'taunt': if (b.t > 0.6) bossSt(b, 'idle'); break;
    case 'idle': {
      bossFace(b);
      let want = 0;
      if (adx > 120) want = b.face; else if (adx < 60 && b.fanOut) want = -b.face;
      bossWalk(b, dt, want, 58);
      if (b.cd > 0) break;
      if (adx < 38) { bossSt(b, chance(0.6) ? 'slash' : 'flip'); if (b.st === 'flip') { b.vx = -b.face * 140; b.vy = -260; } }
      else if (!b.fanOut && chance(b.phase2 ? 0.5 : 0.62)) { bossSt(b, chance(0.5) ? 'throwH' : 'throwL'); }
      else if (!b.fanOut || chance(0.5)) { bossSt(b, 'spinWind'); chip.sfx('whirl'); }
      else b.cd = 0.4;
      break;
    }
    case 'throwH': case 'throwL': {
      b.vx = 0;
      if (b.t >= b.wind && bossOnce(b, 'throw')) {
        const high = b.st === 'throwH';
        game.shots.push({ k: 'fan', x: b.x + b.face * 12, y: GROUND_Y - (high ? 32 : 9), vx: b.face * (b.phase2 ? 220 : 190), vy: 0, boomer: true, turnT: 0.8, foe: true, dmg: 4, deflect: true, brittle: true, t: 0, life: 4.5 });
        b.fanOut = true; chip.sfx('fanthrow');
        if (b.phase2 && !b.second) { b.second = true; b.cd = 0; }
      }
      if (b.t > b.wind + 0.4) {
        if (b.phase2 && b.second && !b.secondDone) { b.secondDone = true; bossSt(b, b.st === 'throwH' ? 'throwL' : 'throwH'); b.fanOut = false; break; }
        b.second = false; b.secondDone = false;
        bossSt(b, 'idle'); b.cd = rand(0.6, 1.1);
      }
      break;
    }
    case 'spinWind':
      b.vx = 0; bossFace(b);
      if (b.t > teleT(b, 0.55)) { bossSt(b, 'dash'); b.dashFrom = b.x; chip.sfx('dash'); }
      break;
    case 'dash': {
      bossWalk(b, dt, b.face, b.phase2 ? 300 : 250);
      if (Math.floor(b.t * 30) % 3 === 0) fxAdd({ k: 'dust', x: b.x - b.face * 6, y: b.y - 1, vx: -b.face * 20, vy: -6, t: 0, life: 0.3 });
      const atWall = b.x <= game.arena.x0 + 1 || b.x >= game.arena.x1 - 1;
      if (atWall || Math.abs(b.x - b.dashFrom) > 230) { bossSt(b, 'idle'); b.vx = 0; b.cd = rand(0.5, 0.9); bossFace(b); }
      break;
    }
    case 'slash':
      b.vx = 0;
      if (b.t >= b.wind && bossOnce(b, 'sfx')) chip.sfx('slash');
      if (b.t > b.wind + 0.35) { bossSt(b, 'idle'); b.cd = rand(0.4, 0.8); }
      break;
    case 'flip':
      if (bossPhys(b, dt)) { b.vx = 0; bossSt(b, 'idle'); b.cd = 0.3; bossFace(b); }
      break;
    default: bossSt(b, 'idle'); break;
  }
}

/* JADE SPEAR: high and low thrusts, a pole vault over you, a spinning low sweep */
function spearAI(b, dt, h) {
  const adx = Math.abs(h.x - b.x);
  b.wind = teleT(b, b.st === 'spin' ? 0.5 : 0.48);
  switch (b.st) {
    case 'taunt': if (b.t > 0.6) bossSt(b, 'idle'); break;
    case 'idle': {
      bossFace(b);
      const want = adx > 58 ? b.face : adx < 36 ? -b.face : 0;
      bossWalk(b, dt, want, 50);
      if (b.cd > 0) break;
      if (adx < 32) bossSt(b, chance(0.55) ? 'spin' : 'vaultWind');
      else if (adx < 66) { bossSt(b, chance(0.5) ? 'thrustH' : 'thrustL'); b.chain = b.phase2 ? 2 : 0; }
      else if (chance(0.3)) bossSt(b, 'vaultWind');
      break;
    }
    case 'thrustH': case 'thrustL':
      b.vx = 0;
      if (b.t >= b.wind && bossOnce(b, 'go')) { chip.sfx('thrust'); b.x += b.face * 6; }
      if (b.t > b.wind + (b.chain ? 0.22 : 0.45)) {
        if (b.chain > 0) { b.chain--; const next = b.st === 'thrustH' ? 'thrustL' : 'thrustH'; bossSt(b, next); b.t = b.wind * 0.35; }
        else { bossSt(b, 'idle'); b.cd = rand(0.5, 1.0); }
      }
      break;
    case 'spin':
      b.vx = 0;
      if (b.t < b.wind && Math.floor(b.t * 8) !== Math.floor((b.t - dt) * 8)) chip.sfx('whirl');
      if (b.t >= b.wind && bossOnce(b, 'go')) { chip.sfx('sweepbig'); dust(b.x - 30, b.y, 3); dust(b.x + 30, b.y, 3); }
      if (b.t > b.wind + 0.4) { bossSt(b, 'idle'); b.cd = rand(0.5, 0.9); }
      break;
    case 'vaultWind':
      b.vx = 0; bossFace(b);
      if (b.t > teleT(b, 0.32)) {
        bossSt(b, 'vault');
        const tx = clamp(h.x + b.face * 54, game.arena.x0 + 10, game.arena.x1 - 10);
        b.vy = -340; b.vx = (tx - b.x) / 0.76;
        chip.sfx('whoosh');
      }
      break;
    case 'vault':
      if (bossPhys(b, dt)) {
        b.vx = 0; bossFace(b); dust(b.x, b.y, 6); chip.sfx('thud'); addShake(3);
        game.shots.push({ k: 'shock', x: b.x - 12, y: GROUND_Y, vx: -150, vy: 0, foe: true, dmg: 3, t: 0, life: 0.8, pierce: true });
        game.shots.push({ k: 'shock', x: b.x + 12, y: GROUND_Y, vx: 150, vy: 0, foe: true, dmg: 3, t: 0, life: 0.8, pierce: true });
        bossSt(b, 'land');
      }
      break;
    case 'land': if (b.t > 0.4) { bossSt(b, 'idle'); b.cd = rand(0.3, 0.7); } break;
    default: bossSt(b, 'idle'); break;
  }
}

/* IRON OX: a charge you must jump, ground slams that send shockwaves, a crushing grab */
function oxAI(b, dt, h) {
  const adx = Math.abs(h.x - b.x);
  b.wind = teleT(b, b.st === 'grab' ? 0.42 : 0.6);
  switch (b.st) {
    case 'taunt': if (b.t > 0.7) bossSt(b, 'idle'); if (bossOnce(b, 'roar')) chip.sfx('roar'); break;
    case 'idle': {
      bossFace(b);
      bossWalk(b, dt, adx > 34 ? b.face : 0, 32);
      if (b.walkT && Math.floor(b.walkT / 30) !== b.lastStep) { b.lastStep = Math.floor(b.walkT / 30); chip.sfx('stomp'); }
      if (b.cd > 0) break;
      if (adx < 30) bossSt(b, 'grab');
      else if (adx > 90 || chance(0.45)) { bossSt(b, 'paw'); chip.sfx('snort'); }
      else bossSt(b, 'raise');
      break;
    }
    case 'paw':
      b.vx = 0; bossFace(b);
      if (Math.random() < 0.25) fxAdd({ k: 'steam', x: b.x + b.face * 22, y: b.y - 40, vx: b.face * 20, vy: -10, t: 0, life: 0.5 });
      if (Math.floor(b.t * 4) !== Math.floor((b.t - dt) * 4)) { dust(b.x - b.face * 8, b.y, 2); chip.sfx('scrape'); }
      if (b.t > teleT(b, 0.75)) { bossSt(b, 'charge'); chip.sfx('charge2'); }
      break;
    case 'charge': {
      bossWalk(b, dt, b.face, b.phase2 ? 270 : 230);
      if (Math.floor(b.t * 20) % 2 === 0) dust(b.x - b.face * 10, b.y, 1);
      const wall = b.face > 0 ? b.x >= game.arena.x1 - 1 : b.x <= game.arena.x0 + 1;
      if (wall) { bossSt(b, 'stun'); b.vx = 0; chip.sfx('crash'); addShake(8); sparks(b.x + b.face * 14, b.y - 30, 10, '#ffd27a'); }
      break;
    }
    case 'stun': if (b.t > 1.7) { bossSt(b, 'idle'); b.cd = 0.4; } break;
    case 'raise':
      b.vx = 0; bossFace(b);
      if (b.t > b.wind) { bossSt(b, 'slam'); }
      break;
    case 'slam':
      if (bossOnce(b, 'hit')) {
        chip.sfx('slam'); addShake(7); dust(b.x + b.face * 20, b.y, 8);
        game.shots.push({ k: 'shock', x: b.x + 20, y: GROUND_Y, vx: 175, vy: 0, foe: true, dmg: 5, t: 0, life: 2, pierce: true });
        game.shots.push({ k: 'shock', x: b.x - 20, y: GROUND_Y, vx: -175, vy: 0, foe: true, dmg: 5, t: 0, life: 2, pierce: true });
      }
      if (b.t > 0.7) {
        if (b.phase2 && !b.double) { b.double = true; bossSt(b, 'raise'); b.t = b.wind * 0.5; }
        else { b.double = false; bossSt(b, 'idle'); b.cd = rand(0.6, 1.1); }
      }
      break;
    case 'grab':
      b.vx = 0;
      if (b.t >= b.wind && bossOnce(b, 'go')) chip.sfx('bash');
      if (b.t > b.wind + 0.5) { bossSt(b, 'idle'); b.cd = rand(0.5, 1.0); }
      break;
    default: bossSt(b, 'idle'); break;
  }
}

/* MIRROR MONK: talisman volleys, mirror images (only the real one casts a reflection), a blink palm */
function mirrorAI(b, dt, h) {
  const adx = Math.abs(h.x - b.x);
  b.wind = teleT(b, b.st === 'palm' ? 0.4 : 0.45);
  for (const c of b.clones) { c.face = sgn(h.x - c.x) || c.face; }
  if (b.clones.length) {
    b.splitT -= dt;
    if (b.splitT <= 0 || !b.clones.some((c) => c.alive)) { mergeClones(b); }
  }
  switch (b.st) {
    case 'taunt': if (b.t > 0.6) bossSt(b, 'idle'); break;
    case 'idle': {
      bossFace(b);
      const want = adx > 110 ? b.face : adx < 66 ? -b.face : 0;
      bossWalk(b, dt, want, 46);
      if (b.cd > 0) break;
      if (!b.clones.length && (chance(b.phase2 ? 0.45 : 0.3))) splitMonk(b);
      else if (adx < 40 || chance(0.25)) bossSt(b, 'blink');
      else bossSt(b, 'cast');
      break;
    }
    case 'cast': {
      b.vx = 0; bossFace(b);
      const n = b.phase2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        if (b.t >= b.wind + i * 0.24 && bossOnce(b, 'c' + i)) {
          game.shots.push({ k: 'tal', x: b.x + b.face * 12, y: b.y - 36, vx: b.face * 95, vy: 0, foe: true, dmg: 3, deflect: true, t: 0, life: 4, ph: i });
          chip.sfx('paper');
        }
      }
      if (b.t > b.wind + n * 0.24 + 0.3) { bossSt(b, 'idle'); b.cd = rand(0.7, 1.2); }
      break;
    }
    case 'blink':
      if (b.t < 0.3) { if (bossOnce(b, 'out')) { smoke(b.x, b.y - 24, 8); chip.sfx('poof'); } }
      else if (bossOnce(b, 'in')) {
        const side = -(h.face || 1);
        b.x = clamp(h.x + side * 34, game.arena.x0 + 6, game.arena.x1 - 6);
        bossFace(b); smoke(b.x, b.y - 24, 8); chip.sfx('poof');
      }
      if (b.t > 0.35) bossSt(b, 'palm');
      break;
    case 'palm':
      b.vx = 0;
      if (b.t >= b.wind && bossOnce(b, 'go')) chip.sfx('palm');
      if (b.t > b.wind + 0.4) { bossSt(b, 'idle'); b.cd = rand(0.5, 1.0); }
      break;
    default: bossSt(b, 'idle'); break;
  }
}

function splitMonk(b) {
  const n = b.phase2 ? 4 : 2;
  const slots = [];
  const x0 = game.arena.x0 + 20, x1 = game.arena.x1 - 20;
  for (let i = 0; i <= n; i++) slots.push(lerp(x0, x1, i / n));
  const order = slots.sort(() => Math.random() - 0.5);
  b.x = order[0];
  b.clones = order.slice(1).map((x) => ({ x, face: b.face, alive: true }));
  b.splitT = 7;
  game.flashT = 0.12;
  chip.sfx('mirror');
  for (const x of order) smoke(x, b.y - 24, 5);
  bossSt(b, 'cast');
  pop(game.hero.x, game.hero.y - 60, 'FIND THE REAL ONE!', '#c4a7ff');
}
function mergeClones(b) {
  for (const c of b.clones) if (c.alive) smoke(c.x, b.y - 24, 4);
  b.clones = [];
}

/* SHADOW ABBOT: a counter stance, chi orbs you can send back, a leaping kick, dragon fire */
function abbotAI(b, dt, h) {
  const adx = Math.abs(h.x - b.x);
  b.wind = teleT(b, b.st === 'palm' ? 0.36 : b.st === 'breath' ? 0.6 : 0.45);
  switch (b.st) {
    case 'taunt': if (b.t > 0.8) bossSt(b, 'idle'); if (bossOnce(b, 'laugh')) chip.sfx('roar'); break;
    case 'idle': {
      bossFace(b);
      const want = adx > 100 ? b.face : adx < 50 ? -b.face : 0;
      bossWalk(b, dt, want, 54);
      if (b.cd > 0) break;
      const r = Math.random();
      if (adx < 36) { if (r < 0.45) bossSt(b, 'palm'); else if (r < 0.75) bossSt(b, 'counter'); else { bossSt(b, 'leap'); b.vy = -300; b.vx = -b.face * 110; } }
      else if (b.phase2 && r < 0.28) { bossSt(b, 'breath'); chip.sfx('inhale'); }
      else if (r < 0.62) { bossSt(b, 'orb'); b.high = chance(0.5); }
      else if (r < 0.86) { bossSt(b, 'leap'); b.vy = -330; b.vx = clamp((h.x - b.x) / 0.72, -180, 180); chip.sfx('whoosh'); }
      else bossSt(b, 'counter');
      break;
    }
    case 'counter':
      b.vx = 0; bossFace(b);
      if (bossOnce(b, 'chime')) chip.sfx('chime');
      if (b.t > 1.25) { bossSt(b, 'idle'); b.cd = 0.3; }
      break;
    case 'riposte':
      if (b.t < 0.1) b.x += b.face * 90 * dt;
      if (b.t > 0.55) { bossSt(b, 'idle'); b.cd = 0.4; }
      break;
    case 'orb': {
      b.vx = 0;
      const shots = b.phase2 ? 2 : 1;
      for (let i = 0; i < shots; i++) {
        if (b.t >= b.wind + i * 0.42 && bossOnce(b, 'o' + i)) {
          const high = i === 0 ? b.high : !b.high;
          game.shots.push({ k: 'orb', x: b.x + b.face * 14, y: GROUND_Y - (high ? 30 : 9), vx: b.face * 175, vy: 0, foe: true, dmg: 5, deflect: true, t: 0, life: 3 });
          chip.sfx('orb');
        }
      }
      if (b.t > b.wind + shots * 0.42 + 0.25) { bossSt(b, 'idle'); b.cd = rand(0.5, 0.9); }
      break;
    }
    case 'leap':
      if (bossPhys(b, dt)) { b.vx = 0; dust(b.x, b.y, 5); chip.sfx('thud'); bossSt(b, 'land'); }
      break;
    case 'land': bossFace(b); if (b.t > 0.35) { bossSt(b, 'idle'); b.cd = rand(0.3, 0.6); } break;
    case 'palm':
      b.vx = 0;
      for (let i = 0; i < 3; i++) if (b.t >= b.wind + i * 0.2 && bossOnce(b, 'p' + i)) { chip.sfx('palm'); b.x += b.face * 4; }
      if (b.t > b.wind + 0.75) { bossSt(b, 'idle'); b.cd = rand(0.4, 0.8); }
      break;
    case 'breath':
      b.vx = 0;
      if (b.t < b.wind && Math.random() < 0.4) fxAdd({ k: 'smoke', x: b.x + b.face * 8, y: b.y - 44, vx: 0, vy: -30, t: 0, life: 0.4, r: 3 });
      if (b.t >= b.wind && bossOnce(b, 'fire')) {
        chip.sfx('fire');
        game.shots.push({ k: 'fire', x: b.x + b.face * 18, y: GROUND_Y, vx: b.face * 150, vy: 0, foe: true, dmg: 6, knock: true, pierce: true, t: 0, life: 2.6 });
      }
      if (b.t > b.wind + 0.6) { bossSt(b, 'idle'); b.cd = rand(0.6, 1.0); }
      break;
    default: bossSt(b, 'idle'); break;
  }
}

/* ---- drawing ------------------------------------------------------------------------------------- */
function bossPose(b) {
  const st = b.st, t = b.t, w = b.wind || 0.4;
  const walkF = (b.walkT / 6) % 8;
  const idleF = (game.t * 1.1) % 2;
  const moving = Math.abs(b.vx) > 1;
  const strike = (t0) => (t < t0 ? Math.min(0.95, (t / t0) * 0.35) : Math.min(1, 0.35 + (t - t0) / 0.06));
  if (st === 'dead') return ['dead', b.y < GROUND_Y ? 1 : Math.min(2, 1 + b.deathT * 3)];
  if (st === 'hurt') return ['hurt', 0];
  if (st === 'enter') return b.kind === 'abbot' ? ['leap', 0] : ['walk', walkF];
  if (st === 'guard') return b.kind === 'fan' ? ['slash', 0] : b.kind === 'spear' ? ['spin', 1] : ['counter', 0];
  switch (b.kind) {
    case 'fan':
      if (st === 'throwH') return ['throw', strike(w)];
      if (st === 'throwL') return ['throwLow', strike(w)];
      if (st === 'spinWind' || st === 'dash') return ['spin', game.t * 16];
      if (st === 'slash') return ['slash', strike(w)];
      if (st === 'flip') return ['spin', game.t * 12];
      return [moving ? 'walk' : 'idle', moving ? walkF : idleF];
    case 'spear':
      if (st === 'thrustH') return ['thrustHigh', strike(w)];
      if (st === 'thrustL') return ['thrustLow', strike(w)];
      if (st === 'spin') return ['spin', t * (t < w ? 12 : 20)];
      if (st === 'vaultWind' || st === 'vault') return ['vault', 0];
      if (st === 'land') return ['thrustLow', 0];
      return [moving ? 'walk' : 'idle', moving ? walkF : idleF];
    case 'ox':
      if (st === 'paw') return ['paw', t * 6];
      if (st === 'charge') return ['charge', t * 10];
      if (st === 'stun') return ['stun', t * 4];
      if (st === 'raise') return ['raise', 0];
      if (st === 'slam') return ['slam', Math.min(1, t / 0.12)];
      if (st === 'grab') return t < w ? ['grab', 0] : ['slam', 0];
      return [moving ? 'walk' : 'idle', moving ? walkF : idleF];
    case 'mirror':
      if (st === 'cast') return ['cast', strike(w)];
      if (st === 'palm') return ['cast', strike(w)];
      return [moving ? 'walk' : 'idle', moving ? 0 : idleF];
    case 'abbot':
      if (st === 'counter') return ['counter', 0];
      if (st === 'riposte') return ['palm', Math.min(1, t / 0.08)];
      if (st === 'orb') { const kk = Math.floor(Math.max(0, t - w) / 0.42); return ['palm', t < w + kk * 0.42 ? 0 : kk % 2 ? 2 : 1]; }
      if (st === 'leap') return b.vy < 40 ? ['leap', 0] : ['kick', 1];
      if (st === 'land') return ['kneel', 0];
      if (st === 'palm') { const kk = Math.floor(Math.max(0, t - w) / 0.2); return ['palm', t < w ? 0 : (kk % 2) + 1]; }
      if (st === 'breath') return t < w ? ['counter', 0] : ['breath', 0];
      return [moving ? 'walk' : 'idle', moving ? walkF : idleF];
    default: return ['idle', 0];
  }
}

function bossDraw(b, g, cx, refl) {
  const [anim, fr] = bossPose(b);
  const x = b.x - cx;
  const kind = b.kind;
  if (refl) { drawSprite(g, kind, anim, fr, b.face, x, b.y); return; }
  if (b.st === 'blink' && b.t < 0.3) return;
  if (b.aura > 0 || (kind === 'abbot' && (b.st === 'counter' || b.phase2))) {
    const counter = b.st === 'counter';
    const col = counter ? '#ffd84a' : kind === 'abbot' ? '#a020ff' : '#ff3a2a';
    const a = counter ? 0.8 + 0.2 * Math.sin(game.t * 20) : b.aura > 0 ? Math.min(1, b.aura) : 0.45;
    drawGlow(g, x, b.y - b.D.h / 2, 42, col, a);
    if (counter) { g.globalAlpha = 0.5 + 0.3 * Math.sin(game.t * 16); ring(g, x, b.y - b.D.h / 2, 26 + Math.sin(game.t * 8) * 2, 1, '#ffe8a0'); g.globalAlpha = 1; }
  }
  for (const c of b.clones) {
    if (!c.alive) continue;
    drawSprite(g, kind, anim, fr, c.face, c.x - cx, b.y, false, 0.9);
  }
  const fade = b.dead && b.deathT > 2 ? Math.max(0, 1 - (b.deathT - 2) / 1.2) : 1;
  drawSprite(g, kind, anim, fr, b.face, x, b.y, b.flash > 0 ? true : false, fade);
  const w = b.wind || 0.4, t = b.t;
  const glint = (gx, gy) => drawGlint(g, gx, gy);
  if (kind === 'fan' && (b.st === 'throwH' || b.st === 'throwL') && t < w && t > w - 0.3) glint(x - b.face * 6, b.y - (b.st === 'throwH' ? 40 : 14));
  if (kind === 'fan' && b.st === 'slash' && t < w) glint(x + b.face * 4, b.y - 46);
  if (kind === 'spear' && (b.st === 'thrustH' || b.st === 'thrustL') && t < w && t > w - 0.3) glint(x + b.face * 38, b.y - (b.st === 'thrustH' ? 33 : 9));
  if (kind === 'ox' && b.st === 'raise') glint(x, b.y - 68);
  if (kind === 'mirror' && b.st === 'palm' && t < w) glint(x + b.face * 18, b.y - 32);
  if (kind === 'abbot' && b.st === 'orb' && t < w) glint(x + b.face * 18, b.y - (b.high ? 34 : 12));
  if (kind === 'ox' && b.st === 'stun') drawDizzy(g, x, b.y - 72);
  if (kind === 'ox' && b.st === 'paw') for (let i = 0; i < 2; i++) { g.globalAlpha = 0.5; disc(g, x + b.face * (24 + i * 4 + (t * 20) % 6), b.y - 40 - i * 2, 1.6 + i, '#e8e0e0'); g.globalAlpha = 1; }
  if (kind === 'spear' && b.st === 'spin' && t < w) { g.globalAlpha = 0.35; g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, b.y - 4, 42, 6, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; }
}
