/* ==========================================================================
   Entities, part one: difficulty, world queries and the hero
   ========================================================================== */

const RUN_V = 78, CLIMB_V = 56, JUMP_V = 236, MAX_FALL = 330;

/* ---- difficulty ---------------------------------------------------------------- */
const DIFFS = {
  recruit: { id: 'recruit', name: 'RECRUIT', hp: 5, lives: 3, speed: 0.86, spawn: 0.72, bullet: 0.84, tele: 1.3, bossHp: 0.8, blurb: 'FIVE HITS PER LIFE. SLOWER ENEMIES, LONGER WARNINGS.' },
  soldier: { id: 'soldier', name: 'SOLDIER', hp: 3, lives: 2, speed: 1, spawn: 1, bullet: 1, tele: 1, bossHp: 1, blurb: 'THREE HITS PER LIFE. THE MISSION AS BRIEFED.' },
  veteran: { id: 'veteran', name: 'VETERAN', hp: 2, lives: 2, speed: 1.1, spawn: 1.22, bullet: 1.12, tele: 0.86, bossHp: 1.2, blurb: 'TWO HITS PER LIFE. FASTER SHOTS, BIGGER PATROLS.' },
  elite: { id: 'elite', name: 'ELITE', hp: 1, lives: 2, speed: 1.18, spawn: 1.4, bullet: 1.22, tele: 0.74, bossHp: 1.4, blurb: 'ONE HIT AND YOU ARE DOWN. CLASSIC ARCADE RULES.' }
};
const DIFF_ORDER = ['recruit', 'soldier', 'veteran', 'elite'];
/** Scale a wind-up by the difficulty: easier levels give longer warnings. */
function tw(sec) { return sec * game.diff.tele; }

/* ---- world queries --------------------------------------------------------- */
function landY(x, y0, y1, skipY) {
  let best = null;
  if (y1 >= GROUND_Y && y0 <= GROUND_Y + 0.01) best = GROUND_Y;
  for (const d of game.st.decks) {
    if (skipY != null && Math.abs(d.y - skipY) < 0.5) continue;
    if (x < d.x0 || x > d.x1) continue;
    if (d.y >= y0 - 0.01 && d.y <= y1 && (best === null || d.y < best)) best = d.y;
  }
  return best;
}
function deckAt(x, y) {
  for (const d of game.st.decks) if (Math.abs(d.y - y) < 0.6 && x >= d.x0 - 1 && x <= d.x1 + 1) return d;
  return null;
}
function supportAt(x, y) { return y >= GROUND_Y - 0.5 || !!deckAt(x, y); }
function ladderFor(x, y, dir) {
  for (const L of game.st.ladders) {
    if (Math.abs(L.x - x) > 7) continue;
    if (dir < 0 && (Math.abs(y - L.lo) < 1 || (y < L.lo - 1 && y > L.hi + 3))) return L;
    if (dir > 0 && Math.abs(y - L.hi) < 1) return L;
  }
  return null;
}
function distBox(b, x, y) {
  const dx = Math.max(b.x0 - x, 0, x - b.x1), dy = Math.max(b.y0 - y, 0, y - b.y1);
  return Math.hypot(dx, dy);
}
function onScreen(x, m) { return x > game.camX - m && x < game.camX + W + m; }

/** Shared platformer integration for anything with feet. Returns true on landing. */
function actorPhys(a, dt) {
  if (a.climb) return false;
  a.x += a.vx * dt;
  if (a.ground) {
    if (supportAt(a.x, a.y)) return false;
    a.ground = false; a.vy = 0; a.coyote = 0.08;
  }
  const y0 = a.y;
  a.vy = Math.min(MAX_FALL, a.vy + GRAV * dt);
  a.y += a.vy * dt;
  if (a.vy > 0) {
    const ly = landY(a.x, y0, a.y, a.dropY);
    if (ly !== null) { a.y = ly; a.vy = 0; a.ground = true; a.dropY = null; return true; }
  }
  if (a.dropY != null && a.y > a.dropY + 6) a.dropY = null;
  if (a.y > H + 40) { a.y = GROUND_Y; a.vy = 0; a.ground = true; }
  return false;
}

/* ---- hero ------------------------------------------------------------------ */
/* Blade moves: active window, reach and damage. The ground combo runs stab, slash, thrust. */
const MELEE = {
  stab: { dur: 0.2, a0: 0.03, a1: 0.15, reach: 19, y0: -25, y1: -11, dmg: 1, anim: 'stab' },
  slash: { dur: 0.24, a0: 0.05, a1: 0.17, reach: 21, y0: -32, y1: -5, dmg: 1, anim: 'slash' },
  thrust: { dur: 0.3, a0: 0.06, a1: 0.2, reach: 27, y0: -24, y1: -10, dmg: 2, anim: 'thrust' },
  cstab: { dur: 0.2, a0: 0.03, a1: 0.15, reach: 21, y0: -14, y1: -3, dmg: 1, anim: 'crouchStab' },
  jstab: { dur: 0.24, a0: 0.03, a1: 0.2, reach: 20, y0: -27, y1: -7, dmg: 1, anim: 'jumpStab' },
  dive: { dur: 9, a0: 0.04, a1: 9, reach: 9, y0: -13, y1: 6, dmg: 2, anim: 'dive' }
};
const COMBO = ['stab', 'slash', 'thrust'];
const AMMO_CAP = { tri: 9, gren: 9, rocket: 9, star: 24, flame: 99 };

function makeHero(x) {
  return {
    x, y: GROUND_Y, vx: 0, vy: 0, face: 1, ground: true, climb: null, dropY: null, crouch: false, act: null,
    inv: 0, hp: heroMaxHp(), dead: false, deadT: 0, coyote: 0, jbuf: 0, kbuf: 0, sbuf: 0, runT: 0, climbT: 0, hurtT: 0,
    wpn: null, ammo: 0, blade: 'knife', bladeN: 0, flash: 0, pose: null,
    airJumps: maxAir(), airDash: false, flipT: -1, roll: null, dashCD: 0, counterT: 0, combo: 0, comboT: 0,
    wallSide: 0, wallT: 0, wallLock: 0, sliding: false, tapDir: 0, tapT: -9, jumpCut: true, jumpT: 0, pogo: 0,
    ghosts: [], stepD: 0, shieldT: 0, flameT: 0, flameSnd: 0
  };
}

function heroHurt(h) {
  if (h.roll && h.roll.tuck) return box(h.x - 5, h.y - 13, h.x + 5, h.y);
  if (h.crouch) return box(h.x - 5, h.y - 14, h.x + 5, h.y);
  if (h.climb) return box(h.x - 4, h.y - 26, h.x + 4, h.y);
  if (!h.ground) return box(h.x - 4, h.y - 25, h.x + 4, h.y - 3);
  return box(h.x - 4, h.y - 26, h.x + 4, h.y - 1);
}
/** True during the untouchable part of a roll or air dash. */
function heroDodging(h) { const r = h.roll; return !!(r && r.t >= r.i0 && r.t <= r.i1); }
/** An attack passed through a dodge: open the counter window (once per dodge). */
function dodgeCredit(h) {
  const r = h.roll;
  if (!r || r.dodged) return;
  r.dodged = true;
  h.counterT = 1.1;
  game.slowT = Math.max(game.slowT, 0.14);
  pop(h.x, h.y - 40, 'DODGE!', '#9fe8ff');
  chip.sfx('dodge');
  game.stageStats.dodges++;
  styleAdd(12);
}

function heroKnifeBox(h) {
  const a = h.act;
  if (!a || h.dead) return null;
  const M = MELEE[a.type];
  if (!M || a.t < M.a0 || a.t > M.a1) return null;
  if (a.type === 'dive') return box(h.x - 8 + h.face * 3, h.y - 13, h.x + 8 + h.face * 3, h.y + 6);
  const r1 = M.reach + (a.kat ? 9 : 0) + perk('reach') * 5, e = a.kat ? 3 : 0;
  const y0 = h.y + M.y0 - e, y1 = h.y + M.y1 + e;
  return h.face > 0 ? box(h.x + 1, y0, h.x + r1, y1) : box(h.x - r1, y0, h.x - 1, y1);
}

function startRoll(h, d) {
  const air = !h.ground;
  h.roll = { t: 0, dir: d, tuck: !air, dur: air ? 0.2 : 0.34, i0: 0.02, i1: air ? 0.18 : 0.28, dodged: false };
  h.face = d; h.act = null; h.crouch = false; h.climb = null; h.combo = 0;
  h.dashCD = h.roll.dur + (perk('swift') ? 0.06 : 0.34);
  if (air) { h.airDash = true; h.vy = 0; h.flipT = -1; h.ground = false; }
  chip.sfx('dash');
  dust(h.x, h.y - (air ? 14 : 0), 3);
  game.stageStats.dashes++;
}

function updateRoll(h, dt, dir) {
  const r = h.roll;
  r.t += dt;
  const k = clamp(r.t / r.dur, 0, 1);
  if (r.tuck) h.vx = r.dir * lerp(218, 112, k);
  else { h.vx = r.dir * 258; h.vy = 0; }
  if (r.tuck && h.ground && chance(0.45)) dust(h.x - r.dir * 5, h.y, 1);
  const wasAir = !h.ground;
  if (actorPhys(h, dt) && wasAir) { chip.sfx('land'); dust(h.x, h.y, 2); h.airJumps = 1; h.airDash = false; }
  if (h.ground) h.runT += Math.abs(h.vx) * dt;
  // once the tumble is underway it can be cancelled into a jump
  if (r.tuck && h.jbuf > 0 && r.t > 0.1 && (h.ground || h.coyote > 0)) {
    h.jbuf = 0; h.roll = null;
    h.vy = -JUMP_V; h.ground = false; h.coyote = 0; h.jumpCut = false; h.jumpT = 0;
    chip.sfx('jump');
    return;
  }
  if (r.t >= r.dur) {
    h.roll = null;
    h.vx = r.dir * RUN_V * (dir === r.dir ? 1 : 0.45);
  }
}

function startMelee(h, type, dir) {
  const M = MELEE[type], kat = h.blade === 'katana';
  h.act = { type, t: 0, dur: M.dur, hits: [], kat, lunge: type === 'thrust' && dir === h.face, arc: false };
  if (COMBO.includes(type)) { h.combo = (COMBO.indexOf(type) + 1) % 3; h.comboT = M.dur + 0.36; }
  else h.combo = 0;
  if (type === 'dive') { h.vy = Math.max(h.vy, 250); h.vx = h.face * 50; h.flipT = -1; }
  if (kat) h.bladeN--;
  chip.sfx(kat ? 'katana' : type === 'thrust' || type === 'dive' ? 'thrust' : 'knife');
  if (type === 'thrust' || type === 'dive' || (kat && type === 'slash')) chip.voice('kiai');
}

/** Light trail left by the blade as its active frames begin. */
function meleeArc(h) {
  const a = h.act, M = MELEE[a.type];
  if (!M || a.arc || a.t < M.a0) return;
  a.arc = true;
  const col = a.kat ? '#bfe9ff' : '#f4f8ff', f = h.face, r = M.reach + (a.kat ? 9 : 0);
  if (a.type === 'slash') game.fx.push({ k: 'slash', x: h.x + f * 3, y: h.y - 17, face: f, r: r - 1, a0: -1.95, a1: 1.05, col, t: 0, life: 0.17 });
  else if (a.type === 'cstab') game.fx.push({ k: 'slash', x: h.x + f * 3, y: h.y - 9, face: f, r: r - 2, a0: -0.42, a1: 0.36, col, t: 0, life: 0.12 });
  else if (a.type === 'dive') game.fx.push({ k: 'slash', x: h.x, y: h.y - 16, face: f, r: 15, a0: 0.5, a1: 2.3, col, t: 0, life: 0.2 });
  else game.fx.push({ k: 'slash', x: h.x + f * 3, y: h.y - (a.type === 'jstab' ? 17 : 18), face: f, r: r - 1, a0: a.kat ? -1.2 : -0.46, a1: a.kat ? 0.8 : 0.4, col, t: 0, life: 0.12 });
}

function updateHero(h, dt, I, P) {
  h.flash = Math.max(0, h.flash - dt);
  h.shieldT = Math.max(0, h.shieldT - dt);
  if (h.dead) {
    h.deadT += dt;
    h.vx = approach(h.vx, 0, (h.ground ? 200 : 30) * dt);
    actorPhys(h, dt);
    return;
  }
  h.inv = Math.max(0, h.inv - dt);
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.jbuf = P.jump ? 0.12 : Math.max(0, h.jbuf - dt);
  h.kbuf = P.knife ? 0.16 : Math.max(0, h.kbuf - dt);
  h.sbuf = P.special ? 0.12 : Math.max(0, h.sbuf - dt);
  h.coyote = Math.max(0, h.coyote - dt);
  h.dashCD = Math.max(0, h.dashCD - dt);
  h.counterT = Math.max(0, h.counterT - dt);
  h.comboT = Math.max(0, h.comboT - dt);
  h.wallLock = Math.max(0, h.wallLock - dt);
  h.flameT = Math.max(0, h.flameT - dt);
  if (h.comboT <= 0 && !h.act) h.combo = 0;
  if (h.flipT >= 0) { h.flipT += dt; if (h.flipT > 0.42) h.flipT = -1; }
  let dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
  if (h.hurtT > 0) dir = 0;

  // dash: the dash button, or a quick double tap of a direction
  let dashDir = 0;
  if (P.left || P.right) {
    const d = P.left ? -1 : 1;
    if (h.tapDir === d && game.t - h.tapT < 0.24) dashDir = d;
    h.tapDir = d; h.tapT = game.t;
  }
  if (P.dash) dashDir = dir || h.face;
  if (h.roll) { updateRoll(h, dt, dir); return; }
  if (dashDir && h.dashCD <= 0 && h.hurtT <= 0 && (h.ground || h.climb || !h.airDash)) {
    if (h.climb) { h.climb = null; h.ground = false; }
    startRoll(h, dashDir);
    updateRoll(h, dt, dir);
    return;
  }

  if (h.act) {
    const a = h.act;
    a.t += dt;
    if (a.fireAt !== undefined && !a.fired && a.t >= a.fireAt) { a.fired = true; fireSpecial(h); }
    meleeArc(h);
    if (a.type === 'dive') { if (h.ground) diveLand(h); }
    else if (a.t >= a.dur) {
      h.act = null;
      if (a.kat && h.bladeN <= 0 && h.blade === 'katana') { h.blade = 'knife'; pop(h.x, h.y - 42, 'KATANA SPENT', '#c9d6e6'); chip.sfx('tick'); }
    }
  }

  if (h.climb) {
    const L = h.climb;
    const v = (I.down ? 1 : 0) - (I.up ? 1 : 0);
    if (!h.act && v) { h.y += v * CLIMB_V * dt; h.climbT += dt; }
    if (dir) h.face = dir;
    if (h.y <= L.hi) { h.y = L.hi; h.climb = null; h.ground = true; }
    else if (h.y >= L.lo) { h.y = L.lo; h.climb = null; h.ground = true; }
    else if (h.jbuf > 0) { h.jbuf = 0; h.climb = null; h.ground = false; h.vy = dir ? -170 : 0; h.vx = dir * RUN_V; h.jumpCut = true; }
  } else if (!h.act || h.act.type === 'jstab') {
    if (I.up && h.hurtT <= 0) {
      const L = ladderFor(h.x, h.y, -1);
      if (L && (h.ground || h.vy > -90)) {
        h.climb = L; h.x = L.x; h.ground = false; h.vx = 0; h.vy = 0; h.crouch = false; h.act = null; h.flipT = -1;
        h.airJumps = 1; h.airDash = false;
        if (Math.abs(h.y - L.lo) < 1) h.y = L.lo - 1;
      }
    } else if (I.down && h.ground && h.jbuf <= 0) {
      const L = ladderFor(h.x, h.y, 1);
      if (L) { h.climb = L; h.x = L.x; h.ground = false; h.y += 2; h.crouch = false; h.vx = 0; }
    }
  }

  if (!h.climb) {
    const a = h.act, M = a && MELEE[a.type];
    const flaming = !!(a && a.type === 'flame');
    const lockAct = !!(a && h.ground && a.type !== 'jstab' && a.type !== 'toss' && !flaming);
    h.crouch = lockAct ? a.type === 'cstab' || a.type === 'recover' : h.ground && I.down && !flaming;
    if (h.ground) {
      h.airJumps = maxAir(); h.airDash = false; h.sliding = false; h.pogo = 0;
      if (h.hurtT > 0) h.vx = approach(h.vx, 0, 200 * dt);
      else if (a && a.type === 'thrust' && a.lunge && a.t < 0.15) h.vx = h.face * 150;
      else if (h.crouch || lockAct) h.vx = approach(h.vx, 0, 1500 * dt);
      else h.vx = approach(h.vx, dir * RUN_V * (flaming ? 0.5 : 1), (dir ? 1150 : 1400) * dt);
      if (dir && !lockAct && !flaming && h.hurtT <= 0) h.face = dir;
    } else {
      // pressing into a wall on the way down grips it
      h.sliding = !!h.wallSide && dir === h.wallSide && h.vy > 0 && !a;
      if (h.sliding) {
        h.vy = Math.min(h.vy, 64); h.face = -h.wallSide; h.flipT = -1;
        if (chance(0.3)) dust(h.x + h.wallSide * 5, h.y - 22, 1);
      }
      if (h.wallLock <= 0 && !(a && a.type === 'dive')) h.vx = approach(h.vx, dir * RUN_V, 620 * dt);
      if (dir && !a && h.hurtT <= 0 && !h.sliding) h.face = dir;
    }

    const busy = lockAct && (M ? a.t < M.a1 : true);
    if (h.jbuf > 0 && !busy && h.hurtT <= 0) {
      if (h.ground || h.coyote > 0) {
        h.jbuf = 0;
        if (I.down && h.ground && h.y < GROUND_Y - 1) { h.dropY = h.y; h.ground = false; h.vy = 30; h.crouch = false; h.jumpCut = true; }
        else {
          h.vy = -JUMP_V; h.ground = false; h.coyote = 0; h.crouch = false; h.jumpCut = false; h.jumpT = 0;
          if (lockAct) h.act = null;
          chip.sfx('jump'); dust(h.x, h.y, 2);
        }
      } else if (h.wallSide && !(a && a.type === 'dive')) {
        // kick off the wall
        h.jbuf = 0;
        h.vy = -JUMP_V * 0.94; h.vx = -h.wallSide * RUN_V * 1.5; h.face = -h.wallSide;
        h.airJumps = 1; h.airDash = false; h.flipT = 0; h.wallLock = 0.2; h.jumpCut = true; h.act = null;
        chip.sfx('jump2');
        game.fx.push({ k: 'ring', x: h.x + h.wallSide * 5, y: h.y - 16, t: 0, life: 0.26, r0: 2, r1: 13, col: '#ffffff' });
        dust(h.x + h.wallSide * 5, h.y - 14, 4);
        h.wallSide = 0; h.sliding = false;
        game.stageStats.walls++;
      } else if (h.airJumps > 0 && !(a && a.type === 'dive')) {
        // second jump: a somersault
        h.jbuf = 0; h.airJumps--;
        h.vy = -JUMP_V * 0.86; h.flipT = 0; h.jumpCut = true;
        if (dir) { h.vx = dir * RUN_V; h.face = dir; }
        chip.sfx('jump2');
        game.fx.push({ k: 'ring', x: h.x, y: h.y - 2, t: 0, life: 0.28, r0: 3, r1: 15, col: '#ffffff', flat: true, a: 0.7 });
        game.stageStats.flips++;
      }
    }
    // letting go of jump early makes a short hop
    if (!h.ground) {
      h.jumpT += dt;
      if (!h.jumpCut && h.jumpT > 0.05 && h.vy < -80 && !I.jump) { h.vy *= 0.55; h.jumpCut = true; }
    }
  }

  const canChain = h.act && MELEE[h.act.type] && h.act.type !== 'dive' && h.ground && h.act.t >= MELEE[h.act.type].a1 + 0.02;
  if (h.kbuf > 0 && h.hurtT <= 0 && (!h.act || canChain)) {
    h.kbuf = 0;
    let type;
    if (h.climb) type = 'stab';
    else if (!h.ground) type = I.down && h.vy > -140 ? 'dive' : 'jstab';
    else if (h.crouch) type = 'cstab';
    else type = COMBO[h.combo % 3];
    startMelee(h, type, dir);
  }

  updateSpecial(h, dt, I);

  const wasAir = !h.ground;
  if (actorPhys(h, dt) && wasAir) { chip.sfx('land'); dust(h.x, h.y, 3); h.flipT = -1; }
  if (h.ground && h.vx) {
    const d = Math.abs(h.vx) * dt;
    h.runT += d; h.stepD += d;
    if (h.stepD > 15 && !h.act) { h.stepD = 0; chip.sfx('step', { surf: game.st.id }); if (game.st.id !== 'citadel') dust(h.x - h.face * 3, h.y, 1); }
  }
}

/** A plunging stab lands: a shock ring that knocks down anyone standing right there. */
function diveLand(h) {
  h.act = { type: 'recover', t: 0, dur: 0.14, hits: [] };
  h.vx = 0;
  chip.sfx('thud'); addShake(2.5); dust(h.x, h.y, 7);
  game.fx.push({ k: 'ring', x: h.x, y: h.y - 1, t: 0, life: 0.3, r0: 4, r1: 22, col: '#fff2c8', flat: true, w: 1.6 });
  for (const e of game.foes) {
    if (e.st === 'dead' || e.gone || foeGhost(e)) continue;
    if (Math.abs(e.y - h.y) < 6 && Math.abs(e.x - h.x) < 17) killFoe(e, 'dive', sgn(e.x - h.x) || h.face, 1);
  }
}

/* ---- special weapons ----------------------------------------------------------- */
function updateSpecial(h, dt, I) {
  // the flamethrower sprays for as long as the button is held
  if (h.wpn === 'flame') {
    const can = I.special && h.ammo > 0 && h.ground && !h.climb && h.hurtT <= 0 && (!h.act || h.act.type === 'flame');
    if (can) {
      if (!h.act) { h.act = { type: 'flame', t: 0, dur: 99, emit: 0 }; h.crouch = false; }
      const a = h.act;
      a.emit -= dt;
      while (a.emit <= 0 && h.ammo > 0) {
        a.emit += 0.05; h.ammo--;
        const f = h.face;
        game.shots.push({ k: 'flame', x: h.x + f * 17, y: h.y - 15.5 + rand(-1, 1), vx: f * rand(150, 200) + h.vx * 0.5, vy: rand(-16, 12), t: 0, life: rand(0.3, 0.4), mine: true, hits: [] });
      }
      h.flameSnd -= dt;
      if (h.flameSnd <= 0) { h.flameSnd = 0.16; chip.sfx('flameJet'); }
      h.flameT = 0.1;
      game.stageStats.specials += dt;
      if (h.ammo <= 0) { h.wpn = null; h.ammo = 0; h.act = null; pop(h.x, h.y - 42, 'TANK EMPTY', '#ffb060'); }
    } else if (h.act && h.act.type === 'flame') h.act = null;
    if (h.sbuf > 0 && !can) { h.sbuf = 0; if (!h.ground) chip.sfx('tick'); }
    return;
  }
  if (h.sbuf <= 0 || h.hurtT > 0) return;
  if (!h.wpn || h.ammo <= 0) { if (!h.act) { h.sbuf = 0; chip.sfx('tick'); } return; }
  if (h.wpn === 'star') {
    // shuriken are quick: thrown on the move, in the air or from a crouch
    if (h.act && h.act.type !== 'toss') return;
    if (h.act && h.act.t < 0.13) return;
    h.sbuf = 0;
    h.act = { type: 'toss', t: 0, dur: 0.2, fired: false, fireAt: 0.05, low: h.crouch };
    return;
  }
  if (h.act || h.climb) return;
  h.sbuf = 0;
  const rocket = h.wpn === 'rocket';
  h.act = { type: rocket ? 'rocket' : 'throw', t: 0, dur: rocket ? 0.32 : 0.26, fired: false, fireAt: rocket ? 0.05 : 0.09 };
  h.crouch = false;
}

function fireSpecial(h) {
  const f = h.face;
  if (h.wpn === 'tri') {
    for (const a of [-14, -4, 6]) {
      const r = (a * Math.PI) / 180;
      game.shots.push({ k: 'tknife', x: h.x + f * 8, y: h.y - 18, vx: Math.cos(r) * 290 * f, vy: Math.sin(r) * 290, t: 0, mine: true });
    }
    chip.sfx('throw');
  } else if (h.wpn === 'gren') {
    game.shots.push({ k: 'hgren', x: h.x + f * 6, y: h.y - 24, vx: f * 150 + h.vx * 0.3, vy: -200, t: 0, mine: true });
    chip.sfx('throw');
  } else if (h.wpn === 'rocket') {
    game.shots.push({ k: 'rocket', x: h.x + f * 14, y: h.y - 19, vx: f * 120, vy: 0, t: 0, mine: true, f, smoke: 0 });
    chip.sfx('rocket');
    puff(h.x - f * 10, h.y - 19, 5, '#d8d8d8');
  } else if (h.wpn === 'star') {
    const low = h.act && h.act.low;
    game.shots.push({ k: 'star', x: h.x + f * 9, y: h.y - (low ? 9 : 19), vx: f * 340, vy: 0, t: 0, mine: true, pierce: 1, hits: [] });
    chip.sfx('star');
  } else return;
  h.ammo--;
  game.stageStats.specials++;
  if (h.ammo <= 0) { h.wpn = null; h.ammo = 0; }
}

/* ---- taking damage ---------------------------------------------------------------- */
function hurtHero(h, dirX, src) {
  if (h.dead || h.inv > 0 || game.state !== 'play' || game.cheat) return false;
  if (heroDodging(h)) { dodgeCredit(h); return false; }
  if (game.invincible) {
    // the shield soaks everything: a spark, a ring and no harm done
    h.shieldT = 0.34; h.inv = 0.3;
    chip.sfx('shield');
    game.fx.push({ k: 'ring', x: h.x, y: h.y - 15, t: 0, life: 0.3, r0: 9, r1: 20, col: '#7fe6ff', w: 1.4 });
    game.stageStats.blocked++;
    return false;
  }
  game.lastCause = src || '?';
  game.stageStats.hits++;
  styleHit();
  if (h.hp > 1) {
    h.hp--;
    h.inv = 1.5; h.hurtT = 0.32; h.flash = 0.15; h.act = null; h.roll = null; h.flipT = -1; h.combo = 0;
    if (!h.climb) { h.vx = (dirX || -h.face) * 70; h.vy = -120; h.ground = false; h.jumpCut = true; }
    chip.sfx('hurt'); chip.voice('pain'); addShake(4);
    sparks(h.x, h.y - 16, 4, '#ff8a7a');
    return true;
  }
  h.hp = 0;
  killHero(h, dirX);
  return true;
}

function killHero(h, dirX) {
  h.dead = true; h.deadT = 0; h.act = null; h.climb = null; h.crouch = false; h.roll = null; h.flipT = -1;
  h.vy = -150; h.vx = (dirX || -h.face) * 50; h.ground = false; h.flash = 0.2;
  chip.sfx('die'); chip.voice('down'); chip.stopMusic(true); addShake(6);
  onHeroDown();
}

/** Called after the screen clamp: pushing into a boundary in mid air counts as a wall. */
function heroWallContact(h, xBefore, dt) {
  if (h.ground || h.dead || h.climb) { h.wallSide = 0; h.wallT = 0; return; }
  if (Math.abs(h.x - xBefore) > 0.01) { h.wallSide = sgn(xBefore - h.x); h.wallT = 0.14; }
  else { h.wallT -= dt; if (h.wallT <= 0) h.wallSide = 0; }
}

/* ---- drawing the hero -------------------------------------------------------------- */
function heroAnim(h) {
  if (h.pose) return h.pose;
  if (h.dead) return ['dead', Math.min(2, h.deadT / 0.13)];
  if (h.hurtT > 0) return ['hurt', 0];
  if (h.roll) return [h.roll.tuck ? 'roll' : 'airDash', 0];
  const a = h.act;
  if (a) {
    const M = MELEE[a.type];
    if (M) {
      if (a.type === 'dive') return ['dive', 0];
      const f = a.t < M.a0 ? a.t / M.a0 : a.t < M.a1 ? 1 : 1 + (a.t - M.a1) / Math.max(0.01, M.dur - M.a1);
      if (a.type === 'jstab') return ['jumpStab', Math.min(1, a.t / M.a0)];
      return [M.anim, f];
    }
    if (a.type === 'throw') return ['throw', a.t < 0.09 ? 0 : 1];
    if (a.type === 'toss') return [h.ground && !a.low ? 'toss' : a.low ? 'crouchStab' : 'jumpStab', a.t < 0.05 ? 0 : 1];
    if (a.type === 'rocket') return ['rocket', 0];
    if (a.type === 'flame') return ['flame', 0];
    if (a.type === 'recover') return ['crouch', 0];
  }
  if (h.climb) return ['climb', h.climbT / 0.12];
  if (!h.ground) {
    if (h.sliding) return ['wall', 0];
    if (h.flipT >= 0) return ['flip', 0];
    return [h.vy < 0 ? 'jumpUp' : 'jumpDown', 0];
  }
  if (h.crouch) return ['crouch', 0];
  if (Math.abs(h.vx) > 8) return ['run', h.runT / 6];
  return ['idle', game.t * 1.7];
}

/** Whole-body rotation for somersaults and rolls. */
function heroSpin(h) {
  if (h.dead) return 0;
  if (h.roll && h.roll.tuck) return h.roll.dir * (h.roll.t / h.roll.dur) * TAU;
  if (!h.ground && h.flipT >= 0 && !h.act) return h.face * (h.flipT / 0.42) * TAU;
  return 0;
}
function spinDraw(g, x, y, rot, fn) {
  if (!rot) { fn(); return; }
  g.save(); g.translate(x, y - 10); g.rotate(rot); g.translate(-x, -(y - 10)); fn(); g.restore();
}

function drawHero(g, h, cx) {
  if (game.hideHero) return;
  const [anim, fr] = heroAnim(h);
  const x = h.x - cx, rot = heroSpin(h);
  SPRITE_SWAP = h.blade === 'katana' ? { knife: 'katana' } : null;
  // afterimages while dashing, flipping or lunging
  const fast = !!h.roll || (!h.ground && h.flipT >= 0) || (h.act && (h.act.type === 'dive' || (h.act.type === 'thrust' && h.act.lunge)));
  if (fast && !h.dead && (!h.ghosts.length || game.t - h.ghosts[h.ghosts.length - 1].t > 0.03)) h.ghosts.push({ x: h.x, y: h.y, anim, fr, face: h.face, rot, t: game.t });
  h.ghosts = h.ghosts.filter((p) => game.t - p.t < 0.17);
  if (QUALITY.level < 2) for (const p of h.ghosts) {
    const a = 0.42 * (1 - (game.t - p.t) / 0.17);
    spinDraw(g, p.x - cx, p.y, p.rot, () => drawSprite(g, 'hero', p.anim, p.fr, p.face, p.x - cx, p.y, '#6ad0ff', a));
  }
  const blinkOut = !h.dead && h.inv > 0 && !game.invincible && Math.floor(h.inv * 20) % 2 === 0;
  if (!blinkOut) spinDraw(g, x, h.y, rot, () => drawSprite(g, 'hero', anim, fr, h.face, x, h.y, h.flash > 0 ? '#ff5a4a' : false));
  SPRITE_SWAP = null;
  if (h.counterT > 0 && !h.dead) {
    // the counter window: a pale edge on the blade hand
    const a = Math.min(1, h.counterT * 2) * (0.6 + 0.4 * Math.sin(game.t * 30));
    drawGlow(g, x + h.face * 6, h.y - 15, 9, '#9fe8ff', a);
  }
  if (game.invincible && !h.dead) {
    const p = h.shieldT > 0 ? 1 : 0.32 + 0.1 * Math.sin(game.t * 5);
    g.save(); g.globalAlpha = p;
    g.strokeStyle = '#8fe9ff'; g.lineWidth = h.shieldT > 0 ? 1.3 : 0.6;
    g.beginPath(); g.ellipse(x, h.y - 14, 11, 16.5, 0, 0, TAU); g.stroke();
    g.restore();
    if (h.shieldT > 0) drawGlow(g, x, h.y - 14, 22, '#7fe6ff', h.shieldT * 2);
  }
  if (h.flameT > 0) drawGlow(g, x + h.face * 20, h.y - 15, 13, '#ffb040', 0.8);
}
