/* ==========================================================================
   Entities, part two: the enemy roster, including the ninjas
   ========================================================================== */

const ETYPES = {
  grunt: { hp: 1, spd: [50, 62], pts: 100, melee: 'jab', gun: true, gunP: 0.35 },
  striker: { hp: 1, spd: [86, 98], pts: 150, melee: 'kick' },
  officer: { hp: 1, spd: [36, 44], pts: 300, gun: true, gunP: 0.9, pistol: true },
  grenadier: { hp: 1, spd: [42, 50], pts: 200, melee: 'jab', lob: true },
  sniper: { hp: 1, spd: [0, 0], pts: 300, fixed: true },
  gunner: { hp: 1, spd: [44, 52], pts: 300, melee: 'jab', mg: true },
  guard: { hp: 2, spd: [46, 54], pts: 300, melee: 'jab', gun: true, gunP: 0.5 },
  para: { hp: 1, spd: [50, 58], pts: 250, melee: 'jab', gun: true, gunP: 0.25 },
  dog: { hp: 1, spd: [118, 134], pts: 200, dog: true },
  ninja: { hp: 2, spd: [92, 106], pts: 500, ninja: true }
};

let foeSeq = 0;
function spawnFoe(kind, x, y, face, opt) {
  const T = ETYPES[kind];
  const e = {
    id: ++foeSeq, kind, T, x, y, vx: 0, vy: 0, face: face || -1, ground: true, climb: null, dropY: null,
    st: T.fixed ? 'snipe' : 'run', t: 0, hp: T.hp + (game.loop > 1 && kind === 'guard' ? 1 : 0), flash: 0,
    sp: rand(T.spd[0], T.spd[1]) * game.diff.speed, cd: rand(0.35, 1.0), runner: !!(opt && opt.runner),
    drop: opt && opt.drop, gone: false, deadT: 0, dist: Math.random() * 40, fired: false, shotN: 0, aiming: false, aimT: 0,
    evade: 0, flipCD: 0, burn: 0
  };
  if (T.ninja) { e.runner = false; e.cd = rand(0.5, 0.9); if (!e.drop && chance(0.25)) e.drop = 'star'; }
  if (opt && opt.para) { e.st = 'para'; e.ground = false; }
  else if (!supportAt(x, y)) { e.ground = false; e.st = 'fall'; }
  game.foes.push(e);
  return e;
}

function setSt(e, st) { e.st = st; e.t = 0; e.fired = false; e.shotN = 0; }

/** Ninjas cannot be touched while vanished or in the first beat of a back flip. */
function foeGhost(e) {
  if (!e.T.ninja) return false;
  return e.evade > 0 || (e.st === 'vanish' && e.t > 0.1) || (e.st === 'appear' && e.t < 0.12);
}

function foeBox(e) {
  if (e.kind === 'dog') return box(e.x - 9, e.y - 11, e.x + 9, e.y - 1);
  if (e.st === 'kneel' || e.st === 'snipe') return box(e.x - 6, e.y - 18, e.x + 6, e.y);
  return box(e.x - 5, e.y - 27, e.x + 5, e.y - 1);
}

function foeAttackBox(e) {
  if (e.st === 'dead' || e.st === 'para') return null;
  const f = e.face, w = tw(0.22);
  if (e.st === 'jab' && e.t >= w && e.t < w + 0.12) return f > 0 ? box(e.x + 6, e.y - 19, e.x + 20, e.y - 11) : box(e.x - 20, e.y - 19, e.x - 6, e.y - 11);
  if (e.st === 'kick' && !e.ground && e.t > 0.08) return f > 0 ? box(e.x + 1, e.y - 16, e.x + 12, e.y - 5) : box(e.x - 12, e.y - 16, e.x - 1, e.y - 5);
  if (e.st === 'slash' && e.t >= w && e.t < w + 0.13) return f > 0 ? box(e.x + 3, e.y - 30, e.x + 29, e.y - 6) : box(e.x - 29, e.y - 30, e.x - 3, e.y - 6);
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

function dropDown(e) { e.dropY = e.y; e.ground = false; e.vy = -70; setSt(e, 'fall'); }
function foeBullet(x, y, vx, vy, extra) {
  const k = game.diff.bullet;
  game.shots.push(Object.assign({ k: 'bullet', x, y, vx: vx * k, vy: vy * k, t: 0, foe: true }, extra || {}));
  muzzle(x, y);
}

/* ---- ninja brain -------------------------------------------------------------------- */
function ninjaLeap(e, h) {
  const ty = h.ground ? h.y : GROUND_Y;
  let tx = clamp(h.x + rand(-26, 26), game.camX + 14, game.camX + W - 14);
  if (ty < e.y) {
    const d = game.st.decks.find((k) => Math.abs(k.y - ty) < 1 && tx > k.x0 - 30 && tx < k.x1 + 30);
    if (!d) { e.cd = 0.5; return false; }
    tx = clamp(tx, d.x0 + 8, d.x1 - 8);
    const height = e.y - ty + 16;
    e.vy = -Math.sqrt(2 * GRAV * height);
    e.vx = (tx - e.x) / (-e.vy / GRAV + Math.sqrt((2 * 16) / GRAV));
  } else {
    e.dropY = e.y; e.vy = -150; e.vx = (tx - e.x) / 0.85;
  }
  e.vx = clamp(e.vx, -230, 230);
  e.ground = false; e.face = sgn(e.vx) || e.face;
  setSt(e, 'leap');
  chip.sfx('whoosh');
  return true;
}

function ninjaRun(e, h, alive, same, adx, toward, vis) {
  if (!alive) { e.vx = e.face * e.sp; return; }
  e.face = toward;
  if (!same) {
    if (e.ground && !h.climb && e.cd <= 0 && vis && (h.ground || h.y > e.y) && ninjaLeap(e, h)) return;
    e.vx = adx > 26 ? toward * e.sp : 0;
    return;
  }
  // back flip away from the blade as it starts
  const a = h.act;
  if (e.ground && a && MELEE[a.type] && a.t < 0.07 && adx < 42 && h.face === -toward && e.flipCD <= 0) {
    e.flipCD = 1.5;
    if (chance(0.6)) {
      setSt(e, 'flip'); e.vy = -190; e.vx = -toward * 125; e.ground = false; e.evade = 0.2;
      chip.sfx('whoosh');
      return;
    }
  }
  if (e.ground && e.cd <= 0 && vis) {
    if (adx < 31) { setSt(e, 'slash'); e.vx = 0; return; }
    if (adx > 62 && adx < 200) {
      if (chance(0.5)) setSt(e, 'nthrow');
      else { setSt(e, 'vanish'); smokeBomb(e.x, e.y - 14); chip.sfx('poof'); }
      e.vx = 0;
      return;
    }
  }
  e.vx = adx > 24 ? toward * e.sp : 0;
}

function smokeBomb(x, y) {
  for (let i = 0; i < 9; i++) game.fx.push({ k: 'smoke', x: x + rand(-6, 6), y: y + rand(-12, 10), vx: rand(-22, 22), vy: rand(-26, -4), t: 0, life: rand(0.4, 0.75), col: '#3a4258', r: rand(3, 5.5) });
}

/** Ninja states. Returns true when it handled the state. */
function ninjaState(e, dt, h, alive, toward) {
  const w = tw(0.22);
  switch (e.st) {
    case 'slash':
      e.vx = e.t >= w && e.t < w + 0.13 ? e.face * 115 : 0;
      if (e.t >= w && !e.fired) { e.fired = true; chip.sfx('katana'); game.fx.push({ k: 'slash', x: e.x + e.face * 3, y: e.y - 17, face: e.face, r: 27, a0: -1.9, a1: 1.0, col: '#ff9a9a', t: 0, life: 0.16 }); }
      if (e.t >= w + 0.42) {
        if (e.ground && chance(0.65)) {
          // spring back out of reach, then come again with a star or from the smoke
          const away = -e.face;
          setSt(e, 'flip'); e.vy = -185; e.vx = away * 135; e.ground = false; e.evade = 0.12; e.cd = 0.3;
          chip.sfx('whoosh');
        } else { setSt(e, 'run'); e.cd = rand(0.7, 1.2); }
      }
      return true;
    case 'nthrow': {
      e.vx = 0; if (alive) e.face = toward;
      const at = tw(0.3);
      if (!e.fired && e.t >= at) {
        e.fired = true;
        game.shots.push({ k: 'star', x: e.x + e.face * 9, y: e.y - 19, vx: e.face * 205 * game.diff.bullet, vy: 0, t: 0, foe: true });
        chip.sfx('star');
      }
      if (e.t >= at + 0.3) { setSt(e, 'run'); e.cd = rand(1.3, 2.1); }
      return true;
    }
    case 'vanish':
      e.vx = 0;
      if (e.t >= 0.3) {
        // step out of the smoke behind the hero
        const y = alive && h.ground ? h.y : e.y;
        let side = alive ? -h.face : 1;
        let tx = h.x + side * 42;
        if (tx < game.camX + 14 || tx > game.camX + W - 14 || !supportAt(tx, y)) { side = -side; tx = h.x + side * 42; }
        tx = clamp(tx, game.camX + 14, game.camX + W - 14);
        if (supportAt(tx, y)) { e.x = tx; e.y = y; e.ground = true; e.vy = 0; }
        e.face = sgn(h.x - e.x) || e.face;
        setSt(e, 'appear');
        smokeBomb(e.x, e.y - 14); chip.sfx('poof');
      }
      return true;
    case 'appear':
      e.vx = 0; if (alive) e.face = toward;
      if (e.t >= tw(0.34)) { setSt(e, 'slash'); }
      return true;
    case 'flip': case 'leap':
      e.evade = Math.max(0, e.evade - dt);
      if (e.ground && e.t > 0.1) { setSt(e, 'run'); e.cd = Math.max(e.cd, 0.25); dust(e.x, e.y, 3); }
      return true;
    default: return false;
  }
}

/* ---- update -------------------------------------------------------------------------- */
function updateFoe(e, dt) {
  const h = game.hero, T = e.T;
  e.t += dt; e.flash = Math.max(0, e.flash - dt); e.cd -= dt;
  e.flipCD = Math.max(0, e.flipCD - dt);
  if (e.st === 'dead') {
    e.deadT += dt;
    e.vx = approach(e.vx, 0, (e.ground ? 260 : 30) * dt);
    actorPhys(e, dt);
    if (e.burn > 0 && e.deadT < 0.7 && chance(0.5)) game.fx.push({ k: 'smoke', x: e.x + rand(-4, 4), y: e.y - rand(2, 16), vx: rand(-8, 8), vy: rand(-30, -12), t: 0, life: 0.4, col: chance(0.5) ? '#ff9a30' : '#4a4444', r: rand(1.5, 3) });
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

  if (!(T.ninja && ninjaState(e, dt, h, alive, toward))) switch (e.st) {
    case 'run': {
      if (T.ninja) { ninjaRun(e, h, alive, same, adx, toward, vis); break; }
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
      if (e.t >= tw(0.22) + 0.34) { setSt(e, 'run'); e.cd = rand(0.45, 0.9); }
      break;
    case 'aim':
      e.vx = 0;
      if (!e.fired && e.t >= tw(0.45)) {
        e.fired = true;
        foeBullet(e.x + e.face * (T.pistol ? 12 : 15), e.y - 21, e.face * 150, 0);
        chip.sfx('shot');
      }
      if (e.t >= tw(0.45) + 0.35) { setSt(e, 'run'); e.cd = rand(1.4, 2.6); }
      break;
    case 'throw':
      e.vx = 0;
      if (!e.fired && e.t >= tw(0.38)) {
        e.fired = true;
        const tx = h.x + rand(-10, 10) + h.vx * 0.4;
        const ty = h.ground || h.climb ? h.y : (landY(h.x, h.y, GROUND_Y, null) || GROUND_Y);
        lob('egren', e.x + e.face * 4, e.y - 26, tx, ty, 0.95 * Math.sqrt(game.diff.tele), true);
        chip.sfx('throw');
      }
      if (e.t >= tw(0.38) + 0.37) { setSt(e, 'run'); e.cd = rand(2.2, 3.2); }
      break;
    case 'kneel':
      e.vx = 0;
      if (alive) e.face = toward;
      if (e.shotN < 3 && e.t >= tw(0.5) + e.shotN * 0.14) {
        e.shotN++;
        foeBullet(e.x + e.face * 15, e.y - 11, e.face * 170, 0);
        chip.sfx('shot');
      }
      if (e.t >= tw(0.5) + 1.0) { setSt(e, 'run'); e.cd = rand(2.4, 3.4); }
      break;
    case 'snipe': {
      e.vx = 0;
      if (alive && !e.aiming) e.face = toward;
      if (!e.aiming && e.cd <= 0 && vis && alive && adx < 270) { e.aiming = true; e.aimT = 0; }
      if (e.aiming) {
        e.aimT += dt;
        if (e.aimT < tw(0.55)) { e.ax = h.x; e.ay = h.y - (h.crouch || (h.roll && h.roll.tuck) ? 7 : 15); }
        if (e.aimT >= tw(0.82)) {
          e.aiming = false; e.cd = rand(2.0, 2.9);
          const mx = e.x + e.face * 15, my = e.y - 12;
          const a = Math.atan2(e.ay - my, e.ax - mx);
          foeBullet(mx, my, Math.cos(a) * 205, Math.sin(a) * 205, { aimed: true });
          chip.sfx('snipe');
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
      if (e.t > 0.32) {
        if (T.ninja && e.ground) { setSt(e, 'vanish'); smokeBomb(e.x, e.y - 14); chip.sfx('poof'); }
        else { setSt(e, 'run'); e.cd = rand(0.3, 0.6); }
      }
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

/** Returns true when the foe was killed (false when armour soaked the hit). label marks a critical. */
function killFoe(e, how, dirX, dmg, label) {
  if (e.st === 'dead' || e.gone) return false;
  e.hp -= dmg || 1;
  const hy = e.y - (e.kind === 'dog' ? 6 : 18);
  if (label) {
    pop(e.x, e.y - 44, label, label === 'COUNTER!' ? '#9fe8ff' : '#ffd27a');
    game.fx.push({ k: 'star', x: e.x, y: hy, t: 0, life: 0.2, big: true, col: '#ffd27a' });
    chip.sfx('crit');
    game.stageStats.crits++;
    if (label === 'BACKSTAB!') countUp('backstab', 10, 'backstab');
    if (label === 'COUNTER!') award('counter');
  }
  if (how === 'flame') e.burn = 1;
  if (e.hp > 0) {
    e.flash = 0.14; setSt(e, 'hurt'); e.vx = (dirX || 1) * 80; e.climb = null; e.aiming = false; chip.sfx('clang');
    sparks(e.x, hy, 4, '#ffffff');
    return false;
  }
  setSt(e, 'dead'); e.deadT = 0; e.climb = null; e.aiming = false; e.evade = 0;
  e.ground = false; e.vy = e.kind === 'dog' ? -90 : -110; e.vx = (dirX || 1) * (how === 'thrust' ? 110 : 70); e.flash = 0.1;
  chip.sfx('down');
  if (e.kind !== 'dog' && chance(0.5)) chip.voice('grunt');
  sparks(e.x, hy, 5, '#fff2c0');
  if (how === 'knife' || how === 'katana' || how === 'dive') {
    // a quick spray along the cut
    for (let i = 0; i < 4; i++) game.fx.push({ k: 'p', x: e.x, y: hy, vx: (dirX || 1) * rand(40, 130), vy: rand(-90, -10), t: 0, life: rand(0.2, 0.4), col: '#ffe9c0', sz: 1, g: 0.5 });
  }
  addScore(e.T.pts * (label ? 2 : 1), e.x, e.y - 30, true);
  if (e.drop) { spawnItem(e.drop, e.x, e.y - 14); e.drop = null; }
  game.stageStats.kills++;
  award('first');
  if (e.T.ninja) countUp('ninja', 5, 'ninja');
  if (how === 'katana') countUp('katana', 20, 'sword');
  return true;
}

/* ---- drawing --------------------------------------------------------------------------- */
function foeAnim(e) {
  const t = e.t, w = tw(0.22);
  const three = (t0, t1, end) => (t < t0 ? t / t0 : t < t1 ? 1 : 1 + Math.min(1, (t - t1) / Math.max(0.01, end - t1)));
  switch (e.st) {
    case 'dead': return ['dead', Math.min(2, e.deadT / 0.12)];
    case 'para': return ['hang', 0];
    case 'jab': return ['jab', three(w, w + 0.12, w + 0.34)];
    case 'slash': return ['slash', three(w, w + 0.13, w + 0.42)];
    case 'nthrow': return ['throw', t < tw(0.3) ? 0 : 1];
    case 'vanish': case 'appear': return ['idle', 0];
    case 'flip': return ['flip', 0];
    case 'leap': return ['fall', 0];
    case 'aim': return [e.T.pistol ? 'pistol' : 'aim', 0];
    case 'throw': return ['throw', t < tw(0.38) ? 0 : 1];
    case 'kneel': return ['mg', 0];
    case 'snipe': return ['snipe', 0];
    case 'kick': return ['kick', Math.min(1, t / 0.08)];
    case 'recover': return ['idle', 0];
    case 'climb': return ['climb', t / 0.13];
    case 'fall': return ['fall', 0];
    case 'hurt': return ['fall', 0];
    default: return Math.abs(e.vx) > 4 ? ['run', e.dist / 6] : ['idle', game.t * 1.6 + e.id];
  }
}

/** A four point glint: the warning that an attack is about to land. */
function drawGlint(g, x, y, s, col) {
  drawGlow(g, x, y, s * 2.4, col, 0.8);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(x - s, y); g.lineTo(x - s * 0.16, y - s * 0.16); g.lineTo(x, y - s); g.lineTo(x + s * 0.16, y - s * 0.16);
  g.lineTo(x + s, y); g.lineTo(x + s * 0.16, y + s * 0.16); g.lineTo(x, y + s); g.lineTo(x - s * 0.16, y + s * 0.16);
  g.closePath(); g.fill();
}

function drawFoe(g, e, cx) {
  const sx = e.x - cx, sy = e.y;
  if (sx < -50 || sx > W + 50) return;
  const fl = e.flash > 0;
  let alpha = 1;
  if (e.st === 'dead' && e.deadT > 0.85) alpha = clamp(1 - (e.deadT - 0.85) / 0.5, 0, 1);
  if (e.kind === 'dog') {
    drawDogV(g, sx, sy, e.face, e.dist / 5, !e.ground && e.st !== 'dead', e.st === 'dead', fl, alpha);
    return;
  }
  if (e.T.ninja) {
    if (e.st === 'vanish') alpha = clamp(1 - e.t / 0.16, 0, 1);
    else if (e.st === 'appear') alpha = clamp(e.t / 0.2, 0, 1);
    if (alpha <= 0.02) return;
  }
  if (e.st === 'para') drawChuteV(g, sx, sy, e.t);
  const [anim, fr] = foeAnim(e);
  const spin = e.st === 'flip' ? -e.face * Math.min(1, e.t / 0.5) * TAU : 0;
  const tint = e.burn > 0 && e.st === 'dead' ? '#3a2a22' : fl;
  spinDraw(g, sx, sy, spin, () => drawSprite(g, e.kind, anim, fr, e.face, sx, sy, tint, alpha));
  if (e.st === 'dead') return;
  if (e.drop && Math.floor(game.t * 3) % 2 === 0) drawGlint(g, sx - e.face * 2, sy - 38, 3, '#ffe27a');
  // warnings
  const w = tw(0.22);
  if (e.st === 'aim' && !e.fired && e.t > tw(0.45) - 0.2) drawGlint(g, sx + e.face * 15, sy - 21, 3.2, '#ff6a4a');
  else if (e.st === 'kneel' && e.shotN === 0 && e.t > tw(0.5) - 0.2) drawGlint(g, sx + e.face * 15, sy - 11, 3.2, '#ff6a4a');
  else if ((e.st === 'jab' || e.st === 'slash') && e.t < w && e.t > w - 0.16) drawGlint(g, sx + e.face * 8, sy - (e.st === 'slash' ? 27 : 17), 3, '#ffffff');
  else if (e.st === 'appear') drawGlint(g, sx + e.face * 2, sy - 23, 2.4, '#ff3a3a');
  else if (e.st === 'throw' && !e.fired) drawGlint(g, sx - e.face * 5, sy - 31, 2.2, '#ff6a4a');
  if (e.st === 'snipe' && e.aiming) {
    const mx = sx + e.face * 15, my = sy - 12, tx = e.ax - cx, ty = e.ay;
    const locked = e.aimT >= tw(0.55);
    if (!locked || Math.floor(game.t * 30) % 2) {
      g.strokeStyle = lgrad(g, mx, my, tx, ty, [[0, 'rgba(255,60,50,0.1)'], [1, locked ? 'rgba(255,60,50,0.95)' : 'rgba(255,130,100,0.7)']]);
      g.lineWidth = locked ? 0.9 : 0.5; g.beginPath(); g.moveTo(mx, my); g.lineTo(tx, ty); g.stroke();
      drawGlow(g, tx, ty, locked ? 6 : 4, '#ff3a2a', 0.9); disc(g, tx, ty, locked ? 1.3 : 0.9, '#ffffff');
    }
  }
}
