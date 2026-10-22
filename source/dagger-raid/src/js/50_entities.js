/* ==========================================================================
   Entities: world queries, hero, enemies, projectiles, props, pickups, effects
   ========================================================================== */

const RUN_V = 74, CLIMB_V = 52, JUMP_V = 236, MAX_FALL = 330, MAX_HP = 3;

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
function decksAtX(x) { return game.st.decks.filter((d) => x >= d.x0 + 6 && x <= d.x1 - 6); }
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
function makeHero(x) {
  return {
    x, y: GROUND_Y, vx: 0, vy: 0, face: 1, ground: true, climb: null, dropY: null, crouch: false, act: null,
    inv: 0, hp: MAX_HP, dead: false, deadT: 0, coyote: 0, jbuf: 0, kbuf: 0, sbuf: 0, runT: 0, climbT: 0, hurtT: 0,
    wpn: null, ammo: 0, flash: 0, pose: null
  };
}

function heroHurt(h) {
  if (h.crouch) return box(h.x - 5, h.y - 14, h.x + 5, h.y);
  if (h.climb) return box(h.x - 4, h.y - 26, h.x + 4, h.y);
  if (!h.ground) return box(h.x - 4, h.y - 25, h.x + 4, h.y - 3);
  return box(h.x - 4, h.y - 26, h.x + 4, h.y - 1);
}

function heroKnifeBox(h) {
  const a = h.act;
  if (!a || h.dead || (a.type !== 'stab' && a.type !== 'cstab' && a.type !== 'jstab')) return null;
  if (a.t < 0.03 || a.t > 0.15) return null;
  let y0, y1, r1 = 19;
  if (a.type === 'cstab') { y0 = h.y - 14; y1 = h.y - 3; r1 = 21; }
  else if (a.type === 'jstab') { y0 = h.y - 27; y1 = h.y - 7; r1 = 20; }
  else { y0 = h.y - 25; y1 = h.y - 11; }
  return h.face > 0 ? box(h.x + 1, y0, h.x + r1, y1) : box(h.x - r1, y0, h.x - 1, y1);
}

function updateHero(h, dt, I, P) {
  h.flash = Math.max(0, h.flash - dt);
  if (h.dead) {
    h.deadT += dt;
    h.vx = approach(h.vx, 0, (h.ground ? 200 : 30) * dt);
    actorPhys(h, dt);
    return;
  }
  h.inv = Math.max(0, h.inv - dt);
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.jbuf = P.jump ? 0.12 : Math.max(0, h.jbuf - dt);
  h.kbuf = P.knife ? 0.14 : Math.max(0, h.kbuf - dt);
  h.sbuf = P.special ? 0.12 : Math.max(0, h.sbuf - dt);
  h.coyote = Math.max(0, h.coyote - dt);
  let dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
  if (h.hurtT > 0) dir = 0;

  if (h.act) {
    const a = h.act;
    a.t += dt;
    if ((a.type === 'throw' || a.type === 'rocket') && !a.fired && a.t >= (a.type === 'rocket' ? 0.05 : 0.09)) { a.fired = true; fireSpecial(h); }
    if (a.t >= a.dur) h.act = null;
  }

  if (h.climb) {
    const L = h.climb;
    const v = (I.down ? 1 : 0) - (I.up ? 1 : 0);
    if (!h.act && v) { h.y += v * CLIMB_V * dt; h.climbT += dt; }
    if (dir) h.face = dir;
    if (h.y <= L.hi) { h.y = L.hi; h.climb = null; h.ground = true; }
    else if (h.y >= L.lo) { h.y = L.lo; h.climb = null; h.ground = true; }
    else if (h.jbuf > 0) { h.jbuf = 0; h.climb = null; h.ground = false; h.vy = dir ? -170 : 0; h.vx = dir * RUN_V; }
  } else if (!h.act || h.act.type === 'jstab') {
    if (I.up && h.hurtT <= 0) {
      const L = ladderFor(h.x, h.y, -1);
      if (L && (h.ground || h.vy > -90)) {
        h.climb = L; h.x = L.x; h.ground = false; h.vx = 0; h.vy = 0; h.crouch = false; h.act = null;
        if (Math.abs(h.y - L.lo) < 1) h.y = L.lo - 1;
      }
    } else if (I.down && h.ground && h.jbuf <= 0) {
      const L = ladderFor(h.x, h.y, 1);
      if (L) { h.climb = L; h.x = L.x; h.ground = false; h.y += 2; h.crouch = false; h.vx = 0; }
    }
  }

  if (!h.climb) {
    const lockAct = h.act && h.ground && h.act.type !== 'jstab';
    h.crouch = lockAct ? h.act.type === 'cstab' : h.ground && I.down;
    if (h.ground) {
      if (h.hurtT > 0) h.vx = approach(h.vx, 0, 200 * dt);
      else h.vx = h.crouch || lockAct ? 0 : dir * RUN_V;
      if (dir && !lockAct && h.hurtT <= 0) h.face = dir;
    } else {
      h.vx = approach(h.vx, dir * RUN_V, 620 * dt);
      if (dir && !h.act && h.hurtT <= 0) h.face = dir;
    }
    if (h.jbuf > 0 && (h.ground || h.coyote > 0) && !lockAct && h.hurtT <= 0) {
      h.jbuf = 0;
      if (I.down && h.ground && h.y < GROUND_Y - 1) { h.dropY = h.y; h.ground = false; h.vy = 30; h.crouch = false; }
      else { h.vy = -JUMP_V; h.ground = false; h.coyote = 0; h.crouch = false; chip.sfx('jump'); }
    }
  }

  if (h.kbuf > 0 && !h.act && h.hurtT <= 0) {
    h.kbuf = 0;
    const type = h.climb ? 'stab' : !h.ground ? 'jstab' : h.crouch ? 'cstab' : 'stab';
    h.act = { type, t: 0, dur: type === 'jstab' ? 0.24 : 0.2, hits: [] };
    if (h.ground && type !== 'jstab') h.vx = 0;
    chip.sfx('knife');
  }
  if (h.sbuf > 0 && !h.act && !h.climb && h.hurtT <= 0) {
    h.sbuf = 0;
    if (h.wpn && h.ammo > 0) {
      h.act = { type: h.wpn === 'rocket' ? 'rocket' : 'throw', t: 0, dur: h.wpn === 'rocket' ? 0.32 : 0.26, fired: false };
      h.crouch = false; if (h.ground) h.vx = 0;
    } else chip.sfx('tick');
  }

  const wasAir = !h.ground;
  if (actorPhys(h, dt) && wasAir) { chip.sfx('land'); dust(h.x, h.y, 3); }
  if (h.ground && h.vx) h.runT += Math.abs(h.vx) * dt;
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
  }
  h.ammo--;
  game.stageStats.specials++;
  if (h.ammo <= 0) { h.wpn = null; h.ammo = 0; }
}

function hurtHero(h, dirX, src) {
  if (h.dead || h.inv > 0 || game.state !== 'play' || game.cheat) return;
  game.lastCause = src || '?';
  if (settings.mode === 'modern' && h.hp > 1) {
    h.hp--;
    h.inv = 1.5; h.hurtT = 0.32; h.flash = 0.15; h.act = null;
    if (!h.climb) { h.vx = (dirX || -h.face) * 70; h.vy = -120; h.ground = false; }
    chip.sfx('hurt'); addShake(4);
    game.stageStats.hits++;
    return;
  }
  h.hp = 0;
  killHero(h, dirX);
}

function killHero(h, dirX) {
  h.dead = true; h.deadT = 0; h.act = null; h.climb = null; h.crouch = false;
  h.vy = -150; h.vx = (dirX || -h.face) * 50; h.ground = false; h.flash = 0.2;
  chip.sfx('die'); chip.stopMusic(true); addShake(6);
  onHeroDown();
}

function heroAnim(h) {
  if (h.pose) return h.pose;
  if (h.dead) return ['dead', Math.min(2, Math.floor(h.deadT / 0.13))];
  if (h.hurtT > 0) return ['hurt', 0];
  const a = h.act;
  if (a) {
    const f3 = a.t < 0.03 ? 0 : a.t < 0.15 ? 1 : 2;
    if (a.type === 'stab') return ['stab', f3];
    if (a.type === 'cstab') return ['crouchStab', f3];
    if (a.type === 'jstab') return ['jumpStab', a.t < 0.03 ? 0 : 1];
    if (a.type === 'throw') return ['throw', a.t < 0.09 ? 0 : 1];
    if (a.type === 'rocket') return ['rocket', 0];
  }
  if (h.climb) return ['climb', Math.floor(h.climbT / 0.12) % 4];
  if (!h.ground) return [h.vy < 0 ? 'jumpUp' : 'jumpDown', 0];
  if (h.crouch) return ['crouch', 0];
  if (h.vx) return ['run', Math.floor(h.runT / 6) % 8];
  return ['idle', Math.floor(game.t * 2) % 2];
}

function drawHero(g, h, cx) {
  if (game.hideHero) return;
  if (!h.dead && h.inv > 0 && Math.floor(h.inv * 20) % 2 === 0) return;
  const [anim, fr] = heroAnim(h);
  drawSprite(g, 'hero', anim, fr, h.face, h.x - cx, h.y, h.flash > 0);
}

/* ---- enemies ----------------------------------------------------------------- */
const ETYPES = {
  grunt: { hp: 1, spd: [50, 62], pts: 100, melee: 'jab', gun: true, gunP: 0.35 },
  striker: { hp: 1, spd: [86, 98], pts: 150, melee: 'kick' },
  officer: { hp: 1, spd: [36, 44], pts: 300, gun: true, gunP: 0.9, pistol: true },
  grenadier: { hp: 1, spd: [42, 50], pts: 200, melee: 'jab', lob: true },
  sniper: { hp: 1, spd: [0, 0], pts: 300, fixed: true },
  gunner: { hp: 1, spd: [44, 52], pts: 300, melee: 'jab', mg: true },
  guard: { hp: 2, spd: [46, 54], pts: 300, melee: 'jab', gun: true, gunP: 0.5 },
  para: { hp: 1, spd: [50, 58], pts: 250, melee: 'jab', gun: true, gunP: 0.25 },
  dog: { hp: 1, spd: [118, 134], pts: 200, dog: true }
};

let foeSeq = 0;
function spawnFoe(kind, x, y, face, opt) {
  const T = ETYPES[kind];
  const e = {
    id: ++foeSeq, kind, T, x, y, vx: 0, vy: 0, face: face || -1, ground: true, climb: null, dropY: null,
    st: T.fixed ? 'snipe' : 'run', t: 0, hp: T.hp + (game.loop > 1 && kind === 'guard' ? 1 : 0), flash: 0,
    sp: rand(T.spd[0], T.spd[1]) * game.diff.speed, cd: rand(0.35, 1.0), runner: !!(opt && opt.runner),
    drop: opt && opt.drop, gone: false, deadT: 0, dist: Math.random() * 40, fired: false, shotN: 0, aiming: false, aimT: 0
  };
  if (opt && opt.para) { e.st = 'para'; e.ground = false; }
  else if (!supportAt(x, y)) { e.ground = false; e.st = 'fall'; }
  game.foes.push(e);
  return e;
}

function setSt(e, st) { e.st = st; e.t = 0; e.fired = false; e.shotN = 0; }

function foeBox(e) {
  if (e.kind === 'dog') return box(e.x - 9, e.y - 11, e.x + 9, e.y - 1);
  if (e.st === 'kneel' || e.st === 'snipe') return box(e.x - 6, e.y - 18, e.x + 6, e.y);
  return box(e.x - 5, e.y - 27, e.x + 5, e.y - 1);
}

function foeAttackBox(e) {
  if (e.st === 'dead' || e.st === 'para') return null;
  const f = e.face;
  if (e.st === 'jab' && e.t >= 0.22 && e.t < 0.34) return f > 0 ? box(e.x + 6, e.y - 19, e.x + 20, e.y - 11) : box(e.x - 20, e.y - 19, e.x - 6, e.y - 11);
  if (e.st === 'kick' && !e.ground && e.t > 0.08) return f > 0 ? box(e.x + 1, e.y - 16, e.x + 12, e.y - 5) : box(e.x - 12, e.y - 16, e.x - 1, e.y - 5);
  if (e.kind === 'dog') return box(e.x - 7, e.y - 10, e.x + 7, e.y - 2);
  return null;
}

function ladderUp(e, tx) {
  const d = e.y >= GROUND_Y - 0.5 ? null : deckAt(e.x, e.y);
  let best = null, bs = 1e9;
  for (const L of game.st.ladders) {
    if (Math.abs(L.lo - e.y) > 1) continue;
    if (d && (L.x < d.x0 || L.x > d.x1)) continue;
    if (Math.abs(L.x - e.x) > 280) continue;
    const s = Math.abs(L.x - e.x) + 0.6 * Math.abs(L.x - tx);
    if (s < bs) { bs = s; best = L; }
  }
  return best;
}

function dropDown(e) {
  e.dropY = e.y; e.ground = false; e.vy = -70; setSt(e, 'fall');
}

function updateFoe(e, dt) {
  const h = game.hero, T = e.T;
  e.t += dt; e.flash = Math.max(0, e.flash - dt); e.cd -= dt;
  if (e.st === 'dead') {
    e.deadT += dt;
    e.vx = approach(e.vx, 0, (e.ground ? 260 : 30) * dt);
    actorPhys(e, dt);
    if (e.deadT > 1.35) e.gone = true;
    return;
  }
  if (e.st === 'para') {
    const y0 = e.y;
    e.y += 34 * dt; e.x += Math.sin(e.t * 2.2 + e.id) * 14 * dt;
    const ly = landY(e.x, y0, e.y, null);
    if (ly !== null) { e.y = ly; e.ground = true; setSt(e, 'run'); e.cd = 0.4; dust(e.x, e.y, 3); }
    if (e.x < game.camX - 70 || e.x > game.camX + W + 110) e.gone = true;
    return;
  }
  const alive = !h.dead && game.state === 'play';
  const dx = h.x - e.x, adx = Math.abs(dx), toward = dx >= 0 ? 1 : -1;
  const same = alive && !h.climb && Math.abs(h.y - e.y) < 14;
  const vis = e.x > game.camX + 8 && e.x < game.camX + W - 8;

  switch (e.st) {
    case 'run': {
      if (T.dog) {
        if (!e.runner && alive && e.ground) e.face = toward;
        e.vx = e.ground ? e.face * e.sp : e.vx;
        if (e.ground && same && e.face === toward && adx < 46 && e.cd <= 0) {
          e.vy = -130; e.ground = false; e.vx = e.face * 150; e.cd = 1.3; chip.sfx('bark');
        }
        break;
      }
      let move = e.face, stop = false;
      if (!e.runner && alive) {
        let tx = h.x;
        if (!same) {
          if (h.y > e.y + 14 && e.y < GROUND_Y - 1) {
            if (adx < 30 + (e.id % 4) * 14 && e.ground) { dropDown(e); break; }
          } else if (h.y < e.y - 14 && e.ground && !h.climb) {
            const L = ladderUp(e, h.x);
            if (L) {
              tx = L.x;
              if (Math.abs(e.x - L.x) < 2.5) { e.climb = L; e.x = L.x; e.ground = false; e.vx = 0; setSt(e, 'climb'); break; }
            } else if (adx < 26) stop = true;
          }
        }
        const d = tx - e.x;
        if (Math.abs(d) > 2) move = d > 0 ? 1 : -1; else stop = true;
        if (same && adx < 13) stop = true;
      } else if (alive && same && e.face === toward && adx < 13) stop = true;
      e.face = move;
      e.vx = stop ? 0 : move * e.sp;
      if (alive && same && e.face === toward && e.cd <= 0 && vis && e.ground) {
        if (T.melee === 'jab' && adx < 25) { setSt(e, 'jab'); chip.sfx('throw'); }
        else if (T.melee === 'kick' && adx > 34 && adx < 72) { setSt(e, 'kick'); e.vy = -160; e.vx = e.face * 135; e.ground = false; }
        else if (T.mg && adx > 50 && adx < 230) setSt(e, 'kneel');
        else if (T.lob && adx > 48 && adx < 170) setSt(e, 'throw');
        else if (T.gun && adx > 56 && adx < 210) { if (Math.random() < T.gunP) setSt(e, 'aim'); else e.cd = rand(0.7, 1.4); }
      }
      break;
    }
    case 'jab':
      e.vx = 0;
      if (e.t >= 0.56) { setSt(e, 'run'); e.cd = rand(0.45, 0.9); }
      break;
    case 'aim':
      e.vx = 0;
      if (!e.fired && e.t >= 0.45) {
        e.fired = true;
        const mx = e.x + e.face * (T.pistol ? 12 : 15), my = e.y - 21;
        game.shots.push({ k: 'bullet', x: mx, y: my, vx: e.face * 150, vy: 0, t: 0, foe: true });
        muzzle(mx, my); chip.sfx('shot');
      }
      if (e.t >= 0.8) { setSt(e, 'run'); e.cd = rand(1.4, 2.6); }
      break;
    case 'throw':
      e.vx = 0;
      if (!e.fired && e.t >= 0.38) {
        e.fired = true;
        const tx = h.x + rand(-10, 10) + h.vx * 0.4;
        const ty = h.ground || h.climb ? h.y : (landY(h.x, h.y, GROUND_Y, null) || GROUND_Y);
        lob('egren', e.x + e.face * 4, e.y - 26, tx, ty, 0.95, true);
        chip.sfx('throw');
      }
      if (e.t >= 0.75) { setSt(e, 'run'); e.cd = rand(2.2, 3.2); }
      break;
    case 'kneel':
      e.vx = 0;
      if (alive) e.face = toward;
      if (e.shotN < 3 && e.t >= 0.5 + e.shotN * 0.14) {
        e.shotN++;
        const mx = e.x + e.face * 15, my = e.y - 11;
        game.shots.push({ k: 'bullet', x: mx, y: my, vx: e.face * 170, vy: 0, t: 0, foe: true });
        muzzle(mx, my); chip.sfx('shot');
      }
      if (e.t >= 1.5) { setSt(e, 'run'); e.cd = rand(2.4, 3.4); }
      break;
    case 'snipe': {
      e.vx = 0;
      if (alive && !e.aiming) e.face = toward;
      if (!e.aiming && e.cd <= 0 && vis && alive && adx < 270) { e.aiming = true; e.aimT = 0; }
      if (e.aiming) {
        e.aimT += dt;
        if (e.aimT < 0.55) { e.ax = h.x; e.ay = h.y - (h.crouch ? 7 : 15); }
        if (e.aimT >= 0.82) {
          e.aiming = false; e.cd = rand(2.0, 2.9);
          const mx = e.x + e.face * 15, my = e.y - 12;
          const a = Math.atan2(e.ay - my, e.ax - mx);
          game.shots.push({ k: 'bullet', x: mx, y: my, vx: Math.cos(a) * 205, vy: Math.sin(a) * 205, t: 0, foe: true, aimed: true });
          muzzle(mx, my); chip.sfx('snipe');
        }
      }
      break;
    }
    case 'kick':
      if (e.ground && e.t > 0.1) { setSt(e, 'recover'); e.vx = 0; }
      break;
    case 'recover':
      e.vx = 0;
      if (e.t > 0.4) { setSt(e, 'run'); e.cd = rand(0.8, 1.4); }
      break;
    case 'climb':
      e.vx = 0;
      e.y -= 40 * dt;
      if (e.y <= e.climb.hi) { e.y = e.climb.hi; e.climb = null; e.ground = true; setSt(e, 'run'); e.cd = Math.max(e.cd, 0.25); }
      break;
    case 'hurt':
      e.vx = approach(e.vx, 0, 220 * dt);
      if (e.t > 0.32) { setSt(e, 'run'); e.cd = rand(0.3, 0.6); }
      break;
    default: break;
  }
  if (e.st !== 'climb' && !T.fixed) {
    const landed = actorPhys(e, dt);
    if (landed && e.st === 'fall') { setSt(e, 'run'); e.cd = Math.max(e.cd, 0.3); dust(e.x, e.y, 2); }
  }
  if (e.ground && e.vx) e.dist += Math.abs(e.vx) * dt;
  if (e.x < game.camX - 70 || e.x > game.camX + W + 110) e.gone = true;
}

/** Returns true when the foe was killed (false when armour soaked the hit). */
function killFoe(e, how, dirX, dmg) {
  if (e.st === 'dead' || e.gone) return false;
  e.hp -= dmg || 1;
  if (e.hp > 0) {
    e.flash = 0.14; setSt(e, 'hurt'); e.vx = (dirX || 1) * 80; e.climb = null; chip.sfx('clang');
    sparks(e.x, e.y - 18, 4, '#ffffff');
    return false;
  }
  setSt(e, 'dead'); e.deadT = 0; e.climb = null; e.aiming = false;
  e.ground = false; e.vy = e.kind === 'dog' ? -90 : -110; e.vx = (dirX || 1) * 70; e.flash = 0.1;
  chip.sfx('down');
  sparks(e.x, e.y - (e.kind === 'dog' ? 6 : 18), 5, '#fff2c0');
  addScore(e.T.pts, e.x, e.y - 30, true);
  if (e.drop) { spawnItem(e.drop, e.x, e.y - 14); e.drop = null; }
  game.stageStats.kills++;
  return true;
}

function foeAnim(e) {
  const t = e.t;
  switch (e.st) {
    case 'dead': return ['dead', Math.min(2, Math.floor(e.deadT / 0.12))];
    case 'para': return ['hang', 0];
    case 'jab': return ['jab', t < 0.22 ? 0 : t < 0.34 ? 1 : 2];
    case 'aim': return [e.T.pistol ? 'pistol' : 'aim', 0];
    case 'throw': return ['throw', t < 0.38 ? 0 : 1];
    case 'kneel': return ['mg', 0];
    case 'snipe': return ['snipe', 0];
    case 'kick': return ['kick', t < 0.08 ? 0 : 1];
    case 'recover': return ['idle', 0];
    case 'climb': return ['climb', Math.floor(t / 0.13) % 4];
    case 'fall': return ['fall', 0];
    case 'hurt': return ['fall', 0];
    default: return e.vx ? ['run', Math.floor(e.dist / 6) % 8] : ['idle', Math.floor(game.t * 2 + e.id) % 2];
  }
}

function drawFoe(g, e, cx) {
  const sx = Math.round(e.x - cx), sy = Math.round(e.y);
  const fl = e.flash > 0;
  let alpha = 1;
  if (e.st === 'dead' && e.deadT > 0.85) alpha = Math.floor(e.deadT * 20) % 2 ? 0.2 : 1;
  if (e.kind === 'dog') {
    const fr = e.st === 'dead' ? 3 : !e.ground ? 2 : Math.floor(e.dist / 7) % 4;
    const d = dogSprite(fr, fl);
    g.globalAlpha = alpha;
    if (e.st === 'dead') { g.save(); g.translate(sx, sy - 4); g.scale(1, -1); g.drawImage(e.face > 0 ? d.cv : d.flip, -12, -8); g.restore(); }
    else g.drawImage(e.face > 0 ? d.cv : d.flip, sx - 12, sy - 15);
    g.globalAlpha = 1;
    return;
  }
  if (e.st === 'para') drawChute(g, sx, sy, e.t);
  const [anim, fr] = foeAnim(e);
  drawSprite(g, e.kind, anim, fr, e.face, sx, sy, fl, alpha);
  if (e.drop && e.st !== 'dead' && Math.floor(game.t * 3) % 2 === 0) {
    const gx = sx - e.face * 2, gy = sy - 37;
    rect(g, gx, gy - 2, 1, 5, '#fff7c0'); rect(g, gx - 2, gy, 5, 1, '#fff7c0');
  }
  if (e.st === 'snipe' && e.aiming) {
    const mx = sx + e.face * 15, my = sy - 12;
    const tx = e.ax - cx, ty = e.ay;
    const n = Math.max(1, Math.floor(Math.hypot(tx - mx, ty - my) / 4));
    const locked = e.aimT >= 0.55;
    g.fillStyle = locked ? '#ff3a3a' : '#ff8a6a';
    if (!locked || Math.floor(game.t * 30) % 2) {
      for (let i = 0; i < n; i += 2) g.fillRect(Math.round(lerp(mx, tx, i / n)), Math.round(lerp(my, ty, i / n)), 1, 1);
      g.fillRect(Math.round(tx) - 1, Math.round(ty) - 1, 3, 3);
    }
  }
}

function drawChute(g, sx, sy, t) {
  const cx = sx + Math.round(Math.sin(t * 2.2) * 1), top = sy - 58;
  for (let dy = 0; dy < 12; dy++) {
    const w = Math.round(Math.sqrt(1 - Math.pow((12 - dy) / 12, 2)) * 15);
    g.fillStyle = OUTLINE; g.fillRect(cx - w - 1, top + dy, w * 2 + 3, 1);
  }
  for (let dy = 1; dy < 12; dy++) {
    const w = Math.round(Math.sqrt(1 - Math.pow((12 - dy) / 12, 2)) * 14);
    for (let x = -w; x <= w; x++) {
      g.fillStyle = Math.floor((x + 15) / 6) % 2 ? '#d9d2b4' : '#a8392a';
      g.fillRect(cx + x, top + dy, 1, 1);
    }
  }
  g.fillStyle = '#8a8470';
  stampLine(g, cx - 13, top + 11, sx - 2, sy - 27, 1, '#2a2a2a');
  stampLine(g, cx + 13, top + 11, sx + 3, sy - 27, 1, '#2a2a2a');
}

/* ---- projectiles --------------------------------------------------------------- */
function lob(k, x, y, tx, ty, T, mark) {
  const vx = (tx - x) / T;
  const vy = (ty - y - 0.5 * GRAV * T * T) / T;
  game.shots.push({ k, x, y, vx, vy, t: 0, foe: true, mx: tx, my: ty, mark, spin: 0 });
}

function updateShots(dt) {
  const h = game.hero;
  const hb = heroHurt(h);
  for (const s of game.shots) {
    if (s.gone) continue;
    s.t += dt;
    const x0 = s.x, y0 = s.y;
    if (s.k === 'rocket') {
      s.vx = approach(s.vx, s.f * 390, 760 * dt);
      s.smoke -= dt;
      if (s.smoke <= 0) { s.smoke = 0.03; puff(s.x - s.f * 6, s.y + rand(-1, 1), 1, '#bdbdbd'); }
    }
    const ballistic = s.k === 'hgren' || s.k === 'egren' || s.k === 'shell' || s.k === 'rock' || s.k === 'bomb';
    if (ballistic) s.vy += GRAV * (s.g || 1) * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.k === 'wave') { s.dist += Math.abs(s.vx * dt); if (s.dist > s.max) s.gone = true; }
    if (ballistic && s.vy > 0) {
      const ly = landY(s.x, y0, s.y, null);
      if (ly !== null && (!s.mark || ly >= GROUND_Y - 0.5 || Math.abs(ly - s.my) < 3)) { s.y = ly; detonate(s); continue; }
    }
    if (s.x < game.camX - 40 || s.x > game.camX + W + 40 || s.y > H + 20 || s.y < -80 || s.t > 5) { s.gone = true; continue; }

    if (s.foe) {
      if (h.dead) continue;
      const sb = shotBox(s);
      if (boxHit(sb, hb)) {
        if (ballistic) { s.hitHero = true; detonate(s); }
        else if (s.k === 'wave') hurtHero(h, sgn(s.vx), 'wave');
        else { s.gone = true; hurtHero(h, sgn(s.vx), s.aimed ? 'bullet-aimed' : s.y < h.y - 16 ? 'bullet-high' : 'bullet-low'); sparks(s.x, s.y, 3, '#fff2a0'); }
      }
      continue;
    }
    // hero projectiles
    const sb = shotBox(s);
    let hit = false;
    for (const e of game.foes) {
      if (e.st === 'dead' || e.gone) continue;
      if (!boxHit(sb, foeBox(e))) continue;
      if (s.k === 'tknife') { killFoe(e, 'knife', sgn(s.vx), 2); s.gone = true; hit = true; break; }
      detonate(s); hit = true; break;
    }
    if (hit) continue;
    if (game.boss && !game.boss.dead) {
      const r = game.boss.shotHit(s, sb);
      if (r) { if (s.k === 'tknife') { s.gone = true; } else detonate(s); continue; }
    }
    for (const p of game.props) {
      if (p.gone || !propSolid(p)) continue;
      if (!boxHit(sb, propBox(p))) continue;
      if (s.k === 'tknife') { hitProp(p, 'knife'); s.gone = true; } else detonate(s);
      break;
    }
  }
  game.shots = game.shots.filter((s) => !s.gone);
}

function shotBox(s) {
  switch (s.k) {
    case 'bullet': return s.aimed ? box(s.x - 1.5, s.y - 1.5, s.x + 1.5, s.y + 1.5) : box(s.x - 2, s.y - 1, s.x + 2, s.y + 1);
    case 'tknife': return box(s.x - 3, s.y - 2, s.x + 3, s.y + 2);
    case 'rocket': return box(s.x - 4, s.y - 2, s.x + 4, s.y + 2);
    case 'wave': return box(s.x - 5, s.y - 9, s.x + 5, s.y);
    case 'rock': return box(s.x - 4, s.y - 4, s.x + 4, s.y + 4);
    case 'shell': return box(s.x - 3, s.y - 3, s.x + 3, s.y + 3);
    default: return box(s.x - 2, s.y - 2, s.x + 2, s.y + 2);
  }
}

function detonate(s) {
  if (s.gone) return;
  s.gone = true;
  switch (s.k) {
    case 'hgren': explode(s.x, s.y - 3, 30, { foes: true, boss: 5, props: true }); break;
    case 'rocket': explode(s.x, s.y, 24, { foes: true, boss: 7, props: true }); break;
    case 'egren': explode(s.x, s.y - 3, 18, { hero: true, src: 'grenade' }); break;
    case 'shell': explode(s.x, s.y - 4, 24, { hero: true, src: 'shell' }); break;
    case 'bomb': explode(s.x, s.y - 4, 22, { hero: true, src: 'bomb' }); break;
    case 'rock':
      explode(s.x, s.y - 3, 15, { hero: true, small: true, src: 'rock' });
      for (let i = 0; i < 6; i++) game.fx.push({ k: 'p', x: s.x, y: s.y - 3, vx: rand(-90, 90), vy: rand(-160, -60), t: 0, life: 0.6, col: '#7a5a3a', sz: 2, g: 1 });
      break;
    default: break;
  }
}

function explode(x, y, r, o) {
  game.fx.push({ k: 'boom', x, y, r, t: 0 });
  for (let i = 0; i < Math.round(r / 3); i++) {
    const a = rand(0, TAU), v = rand(30, 140);
    game.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: rand(0.3, 0.7), col: pick(['#ffd34a', '#ff8a2a', '#ffffff', '#c8c8c8']), sz: pick([1, 2]), g: 0.6 });
  }
  chip.sfx('boom', { big: r > 28 });
  addShake(r > 28 ? 5 : o.small ? 2 : 3);
  if (o.foes) for (const e of game.foes) if (e.st !== 'dead' && distBox(foeBox(e), x, y) < r) killFoe(e, 'boom', sgn(e.x - x) || 1, 3);
  if (o.boss && game.boss && !game.boss.dead) game.boss.blast(x, y, r, o.boss);
  if (o.props !== false) for (const p of game.props) if (!p.gone && propSolid(p) && distBox(propBox(p), x, y) < r) hitProp(p, 'boom');
  if (o.hero) { const h = game.hero; if (!h.dead && distBox(heroHurt(h), x, y) < r * 0.72) hurtHero(h, sgn(h.x - x) || 1, 'boom-' + (o.src || 'prop')); }
}

function drawShot(g, s, cx) {
  const x = Math.round(s.x - cx), y = Math.round(s.y);
  switch (s.k) {
    case 'bullet':
      if (s.aimed) { rect(g, x - 1, y - 1, 3, 3, '#ffb040'); rect(g, x, y, 1, 1, '#ffffff'); }
      else { rect(g, x - (s.vx > 0 ? 4 : -1), y, 4, 1, '#ff9a30'); rect(g, x - 1, y - 1, 3, 3, '#ffe27a'); rect(g, x, y, 1, 1, '#ffffff'); }
      break;
    case 'tknife': {
      const a = s.t * 28;
      const c = Math.cos(a), sn = Math.sin(a);
      stampLine(g, x - c * 4, y - sn * 4, x + c * 4, y + sn * 4, 1, '#e3e9ef');
      rect(g, x - Math.round(c * 4) - 1, y - Math.round(sn * 4) - 1, 2, 2, '#4a3424');
      break;
    }
    case 'hgren': case 'egren':
      rect(g, x - 2, y - 2, 4, 4, OUTLINE); rect(g, x - 1, y - 1, 3, 3, s.k === 'hgren' ? '#5a7a32' : '#4a4a3a');
      if (s.k === 'egren' && Math.floor(s.t * 12) % 2) rect(g, x, y - 2, 1, 1, '#ff3a2a');
      break;
    case 'rocket': {
      const f = sgn(s.vx) || 1;
      rect(g, x - 5, y - 2, 10, 4, OUTLINE); rect(g, x - 4, y - 1, 8, 2, '#5a6a3a'); rect(g, x + f * 3, y - 1, 2, 2, '#d8402f');
      const fl = 2 + Math.floor(Math.random() * 4);
      rect(g, f > 0 ? x - 5 - fl : x + 5, y - 1, fl, 2, '#ffd34a');
      break;
    }
    case 'shell': disc(g, x, y, 3, OUTLINE); disc(g, x, y, 2, '#3a3a40'); rect(g, x - 1, y - 1, 1, 1, '#8a8a90'); break;
    case 'bomb': rect(g, x - 2, y - 4, 5, 8, OUTLINE); rect(g, x - 1, y - 3, 3, 6, '#3a3f2a'); rect(g, x - 2, y - 5, 5, 1, '#5a5a5a'); break;
    case 'rock': disc(g, x, y, 4, OUTLINE); disc(g, x, y, 3, '#7a5a3a'); rect(g, x - 1, y - 2, 2, 1, '#a07a50'); break;
    case 'wave': {
      const h = 6 + Math.floor(Math.sin(s.t * 40) * 2);
      for (let i = 0; i < 3; i++) rect(g, x - 4 + i * 3, y - h + i * 2, 2, h - i * 2, i % 2 ? '#f0e0b0' : '#c8a060');
      rect(g, x - 6, y - 2, 12, 2, '#e8d8a8');
      break;
    }
    default: break;
  }
  if (s.mark && Math.floor(s.t * 10) % 2 === 0) {
    const mx = Math.round(s.mx - cx), my = Math.round(s.my);
    rect(g, mx - 3, my - 3, 2, 1, '#ff4a3a'); rect(g, mx + 2, my - 3, 2, 1, '#ff4a3a');
    rect(g, mx - 1, my - 2, 3, 1, '#ff4a3a');
  }
}

/* ---- props: crates, barrels, cages, mines --------------------------------------- */
function makeProp(p) {
  const o = Object.assign({}, p);
  o.y = p.t === 'mine' ? GROUND_Y : LV_Y[p.lv || 0];
  o.gone = false; o.fuse = -1; o.open = false; o.tm = 0;
  return o;
}
function propSolid(p) { return !p.gone && !(p.t === 'cage' && p.open) && !(p.t === 'crate' && p.broken); }
function propBox(p) {
  switch (p.t) {
    case 'crate': return box(p.x - 8, p.y - 14, p.x + 8, p.y);
    case 'barrel': return box(p.x - 6, p.y - 16, p.x + 6, p.y);
    case 'cage': return box(p.x - 12, p.y - 34, p.x + 12, p.y);
    case 'mine': return box(p.x - 4, p.y - 3, p.x + 4, p.y);
    default: return box(p.x, p.y, p.x, p.y);
  }
}
function hitProp(p, how) {
  if (!propSolid(p)) return;
  if (p.t === 'crate') {
    p.broken = true; p.t2 = 0;
    chip.sfx('crate');
    for (let i = 0; i < 8; i++) game.fx.push({ k: 'p', x: p.x + rand(-6, 6), y: p.y - 7, vx: rand(-80, 80), vy: rand(-170, -60), t: 0, life: 0.7, col: pick(['#9b6a36', '#c38c4f', '#7a5027']), sz: 2, g: 1 });
    addScore(100, p.x, p.y - 20, false);
    if (p.item) spawnItem(p.item, p.x, p.y - 8);
  } else if (p.t === 'barrel') {
    if (how === 'boom') { p.fuse = Math.min(p.fuse < 0 ? 0.12 : p.fuse, 0.12); }
    else if (p.fuse < 0) { p.fuse = 0.6; chip.sfx('clang'); }
  } else if (p.t === 'cage') {
    if (how === 'boom') return;
    p.open = true; p.tm = 0;
    chip.sfx('free'); chip.sfx('clang');
    sparks(p.x + 9, p.y - 17, 6, '#ffe27a');
    game.caps.push({ x: p.x, y: p.y, st: 'salute', t: 0, face: game.hero.x < p.x ? -1 : 1, item: p.item, dist: 0 });
    game.stageStats.captives++;
    addScore(1000, p.x, p.y - 40, false);
  } else if (p.t === 'mine') {
    if (p.fuse < 0) p.fuse = how === 'boom' ? 0.08 : 0.16;
  }
}

function updateProps(dt) {
  const h = game.hero;
  for (const p of game.props) {
    if (p.gone) continue;
    p.tm += dt;
    if (p.t2 !== undefined) p.t2 += dt;
    if (p.fuse >= 0) {
      p.fuse -= dt;
      if (p.fuse <= 0) {
        p.gone = true;
        if (p.t === 'barrel') explode(p.x, p.y - 8, 34, { foes: true, hero: true, boss: 6, props: true });
        else explode(p.x, p.y - 2, 22, { foes: true, hero: true, props: true });
      }
    }
    if (p.t === 'mine' && p.fuse < 0 && !h.dead && h.ground && Math.abs(h.y - p.y) < 1 && Math.abs(h.x - p.x) < 7) { p.fuse = 0.18; chip.sfx('tick'); }
  }
  for (const c of game.caps) {
    c.t += dt;
    if (c.st === 'salute' && c.t > 0.9) {
      c.st = 'run'; c.t = 0;
      if (c.item) { spawnItem(c.item, c.x + c.face * 6, c.y - 16); c.item = null; }
      pop(c.x, c.y - 44, 'THANKS!', '#9fe8ff');
      c.face = c.x - game.camX > W / 2 ? 1 : -1;
    } else if (c.st === 'run') {
      c.x += c.face * 84 * dt; c.dist += 84 * dt;
      if (!onScreen(c.x, 30)) c.gone = true;
    }
  }
  game.caps = game.caps.filter((c) => !c.gone);
}

function drawProp(g, p, cx) {
  const x = Math.round(p.x - cx), y = Math.round(p.y);
  if (p.gone) return;
  switch (p.t) {
    case 'crate': {
      if (p.broken) { if (p.t2 < 0.4) g.drawImage(crateSprite(true).cv, x - 8, y - 14); break; }
      g.drawImage(crateSprite(false).cv, x - 8, y - 14);
      break;
    }
    case 'barrel': {
      const b = barrelSprite();
      if (p.fuse >= 0 && Math.floor(p.fuse * 24) % 2 === 0) g.drawImage(silhouette(b.cv, '#ffffff'), x - 6, y - 16);
      else g.drawImage(b.cv, x - 6, y - 16);
      break;
    }
    case 'cage': {
      if (!p.open) drawSprite(g, 'captive', 'tied', Math.floor(game.t * 1.5 + p.x) % 2, -1, x, y - 2);
      g.drawImage(cageSprite(p.open).cv, x - 12, y - 34);
      break;
    }
    case 'mine': {
      rect(g, x - 4, y - 3, 8, 3, OUTLINE); rect(g, x - 3, y - 2, 6, 2, '#4a4a42');
      const blink = p.fuse >= 0 ? Math.floor(game.t * 20) % 2 : Math.floor(game.t * 2 + p.x) % 2;
      rect(g, x, y - 4, 1, 1, blink ? '#ff3a2a' : '#5a1a14');
      break;
    }
    default: break;
  }
}

function drawCaptive(g, c, cx) {
  if (c.st === 'salute') drawSprite(g, 'captive', 'salute', 0, c.face, c.x - cx, c.y);
  else drawSprite(g, 'captive', 'run', Math.floor(c.dist / 6) % 8, c.face, c.x - cx, c.y);
}

/* ---- pickups ------------------------------------------------------------------- */
function spawnItem(type, x, y) {
  game.items.push({ type, x, y, vx: rand(-25, 25), vy: -140, ground: false, t: 0, dropY: null, climb: null });
}
function updateItems(dt) {
  const h = game.hero;
  const hb = heroHurt(h);
  for (const it of game.items) {
    it.t += dt;
    if (!it.ground) { actorPhys(it, dt); if (it.ground) it.vx = 0; }
    if (it.t > 9) it.gone = true;
    if (!h.dead && it.t > 0.25 && boxHit(box(it.x - 7, it.y - 13, it.x + 7, it.y), box(hb.x0 - 3, hb.y0 - 3, hb.x1 + 3, hb.y1 + 3))) {
      it.gone = true;
      collect(it);
    }
  }
  game.items = game.items.filter((i) => !i.gone);
}
function collect(it) {
  const h = game.hero, P = PICKUPS[it.type];
  if (it.type === 'tri' || it.type === 'gren' || it.type === 'rocket') {
    if (h.wpn === it.type) h.ammo = Math.min(9, h.ammo + P.ammo);
    else { h.wpn = it.type; h.ammo = P.ammo; }
    chip.sfx('weapon');
    pop(h.x, h.y - 40, P.label, P.color);
    addScore(200, h.x, h.y - 30, false, true);
  } else if (it.type === 'medal') {
    chip.sfx('pickup'); addScore(2000, h.x, h.y - 36, false);
  } else if (it.type === 'ration') {
    chip.sfx('pickup');
    if (settings.mode === 'modern' && h.hp < MAX_HP) { h.hp++; pop(h.x, h.y - 40, 'HEALTH +1', '#ff8a7a'); }
    else addScore(500, h.x, h.y - 36, false);
  } else if (it.type === 'life') {
    game.lives = Math.min(9, game.lives + 1);
    chip.sfx('oneup'); pop(h.x, h.y - 40, '1UP', '#4ad16a');
  }
  game.stageStats.items++;
}
function drawItem(g, it, cx) {
  if (it.t > 6 && Math.floor(it.t * 10) % 2) return;
  const bob = it.ground ? Math.round(Math.sin(it.t * 5) * 1) : 0;
  const ic = pickupIcon(it.type);
  const x = Math.round(it.x - cx) - 6, y = Math.round(it.y) - 13 + bob;
  if (Math.floor(it.t * 4) % 4 === 0) { g.globalAlpha = 0.6; rect(g, x - 1, y - 1, 14, 14, '#ffffff'); g.globalAlpha = 1; }
  g.drawImage(ic.cv, x, y);
}

/* ---- effects --------------------------------------------------------------------- */
function puff(x, y, n, col) {
  for (let i = 0; i < n; i++) game.fx.push({ k: 'smoke', x: x + rand(-2, 2), y: y + rand(-2, 2), vx: rand(-14, 14), vy: rand(-26, -6), t: 0, life: rand(0.35, 0.6), col: col || '#cfcfcf', r: rand(1.5, 3) });
}
function dust(x, y, n) {
  for (let i = 0; i < n; i++) game.fx.push({ k: 'smoke', x: x + rand(-4, 4), y: y - 1, vx: rand(-22, 22), vy: rand(-12, -2), t: 0, life: 0.35, col: game.dustCol || '#d8c8a8', r: rand(1, 2) });
}
function sparks(x, y, n, col) {
  game.fx.push({ k: 'star', x, y, t: 0, life: 0.12 });
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(50, 130);
    game.fx.push({ k: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.12, 0.28), col: col || '#ffffff', sz: 1, g: 0.2 });
  }
}
function muzzle(x, y) { game.fx.push({ k: 'flash', x, y, t: 0, life: 0.06 }); }
function pop(x, y, str, col) {
  for (const q of game.pops) if (q.t < 0.5 && Math.abs(q.x - x) < 40 && Math.abs(q.y - y) < 8) y = Math.min(y, q.y - 9);
  game.pops.push({ x, y, str, col: col || '#ffffff', t: 0 });
}
function addShake(a) { if (settings.shake) game.shake = Math.max(game.shake, a); }

function updateFx(dt) {
  for (const f of game.fx) {
    f.t += dt;
    if (f.k === 'p') { f.vy += GRAV * (f.g || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t > f.life) f.gone = true; }
    else if (f.k === 'smoke') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.96; if (f.t > f.life) f.gone = true; }
    else if (f.k === 'boom') { if (f.t > 0.5) f.gone = true; }
    else if (f.t > (f.life || 0.5)) f.gone = true;
  }
  game.fx = game.fx.filter((f) => !f.gone);
  if (game.fx.length > 500) game.fx.splice(0, game.fx.length - 500);
  for (const p of game.pops) { p.t += dt; p.y -= (p.t < 0.5 ? 28 : 4) * dt; }
  game.pops = game.pops.filter((p) => p.t < 1.1);
}

function drawFx(g, cx) {
  for (const f of game.fx) {
    const x = Math.round(f.x - cx), y = Math.round(f.y);
    switch (f.k) {
      case 'p': rect(g, x, y, f.sz, f.sz, f.col); break;
      case 'smoke': {
        const r = Math.max(1, Math.round(f.r * (1 + f.t / f.life)));
        g.globalAlpha = 1 - f.t / f.life; disc(g, x, y, r, f.col); g.globalAlpha = 1;
        break;
      }
      case 'star': {
        const s = f.t < 0.06 ? 4 : 2;
        rect(g, x - s, y, s * 2 + 1, 1, '#ffffff'); rect(g, x, y - s, 1, s * 2 + 1, '#ffffff');
        rect(g, x - 1, y - 1, 3, 3, '#fff2a0');
        break;
      }
      case 'flash': disc(g, x, y, 3, '#fff2a0'); rect(g, x - 1, y - 1, 3, 3, '#ffffff'); break;
      case 'boom': drawBoom(g, x, y, f.r, f.t); break;
      default: break;
    }
  }
}

function drawBoom(g, x, y, r, t) {
  const k = t / 0.5;
  if (t < 0.05) { disc(g, x, y, Math.round(r * 0.75), '#ffffff'); return; }
  const rr = Math.round(r * (0.55 + k * 0.5));
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r;
    const d = rr * 0.45 * (0.6 + 0.4 * Math.sin(i * 3.1 + r));
    const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.8 - k * 6;
    const br = Math.max(1, Math.round(rr * 0.5 * (1 - k * 0.6)));
    const col = k < 0.25 ? '#ffe27a' : k < 0.5 ? '#ff9a30' : k < 0.75 ? '#c8502a' : '#6a6a6a';
    disc(g, bx, by, br, col);
  }
  if (k < 0.45) disc(g, x, y - k * 6, Math.max(1, Math.round(rr * 0.35)), '#fff6d0');
}

function drawPops(g, cx) {
  for (const p of game.pops) {
    if (p.t > 0.85 && Math.floor(p.t * 20) % 2) continue;
    drawText(g, p.str, p.x - cx, p.y, p.col, { align: 'center', shadow: '#000000' });
  }
}
