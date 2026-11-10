/* ==========================================================================
   Ninja arts: shadow step and air dash, somersault double jumps, wall jumps,
   weapons (nunchaku, bo staff, shuriken) and the upgraded ninja foes
   ========================================================================== */

const WEAPONS = {
  nunchaku: { name: 'NUNCHAKU', uses: 28, reach: 7, dmg: 1, kb: 20, col: '#f2b23a' },
  staff: { name: 'BO STAFF', uses: 20, reach: 15, dmg: 1, kb: 60, col: '#d8a46a', guard: 2 }
};
const STAR_MAX = 15;

Object.assign(PICKUPS, {
  stars: { label: 'SHURIKEN', color: '#cfe0f0' },
  nunchaku: { label: 'NUNCHAKU', color: '#f2b23a' },
  staff: { label: 'BO STAFF', color: '#d8a46a' }
});
Object.assign(ITEM_FX, {
  stars: (h) => { h.stars = Math.min(STAR_MAX, (h.stars || 0) + 6); return '+6 SHURIKEN'; },
  nunchaku: (h) => { h.weapon = { k: 'nunchaku', n: WEAPONS.nunchaku.uses }; return 'NUNCHAKU!'; },
  staff: (h) => { h.weapon = { k: 'staff', n: WEAPONS.staff.uses }; return 'BO STAFF!'; }
});

/* ninjas now haunt every floor, not just the last two */
(function seedNinjas() {
  const add = [[0, 1140], [1, 860], [1, 1500], [2, 640], [2, 1520]];
  for (const [fi, at] of add) if (FLOORS[fi]) FLOORS[fi].events.push({ at, e: 'ninja' });
  for (const F of FLOORS) F.events.sort((a, b) => a.at - b.at);
  if (FLOORS[2]) FLOORS[2].mix.ninja = 1;
})();

/* ---- extra poses ------------------------------------------------------------- */
(function ninjaPoses() {
  const tuck = { hip: 9.5, lean: 3.4, tl: 9.2, ff: [5.5, -7.5], bf: [1.5, -8.5], kneeB: 'down', fh: [9, -13], bh: [7, -12], hd: [0.8, 0.8] };
  POSES.hero.flip = [tuck];
  POSES.hero.dash = [{ hip: 10.8, lean: 6, ff: [9.5, 0], bf: [-9.5, -1.5], fh: [-5, -12.5], bh: [-9, -11.5], hd: [1.2, 0.6] }];
  POSES.hero.wall = [{ hip: 13.2, lean: -1.6, ff: [5.5, -7], bf: [-1.5, -2.5], fh: [10, -22], bh: [-6, -20] }];
  POSES.hero.toss = [
    { hip: 13, lean: -1.4, ff: [5, 0], bf: [-5, 0], fh: [-3, -25], bh: [6, -17] },
    { hip: 12.8, lean: 3, ff: [7, 0], bf: [-5, 0], fh: [16, -20], bh: [-2, -16], frame: 1 }
  ];
  POSES.ninja.flip = [Object.assign({}, tuck, { item: 'blade', ia: 150 })];
  POSES.ninja.throw = [
    { hip: 13, lean: -1.2, ff: [5, 0], bf: [-5.5, 0], fh: [-4, -24.5], bh: [6, -16], item: 'star', ia: 0, itemB: 'blade', iaB: 160 },
    { hip: 12.4, lean: 3.4, ff: [7.5, 0], bf: [-5.5, 0], fh: [15.5, -20], bh: [-3, -15], itemB: 'blade', iaB: 160, frame: 1 }
  ];
  POSES.ninja.throwLow = [
    { hip: 7.5, lean: 2, tl: 9.5, ff: [6, 0], bf: [-6.5, 0], kneeB: 'down', fh: [-3, -12], bh: [4, -11], item: 'star', ia: 0 },
    { hip: 7, lean: 4.5, tl: 9.5, ff: [7, 0], bf: [-6.5, 0], kneeB: 'down', fh: [15, -7], bh: [2, -10], frame: 1 }
  ];
})();

/* ---- weapons ----------------------------------------------------------------- */
function weaponOf(h, D) { return h.weapon && D && /unch/.test(D.anim) ? WEAPONS[h.weapon.k] : null; }
function weaponReach(h, D) { const w = weaponOf(h, D); return w ? w.reach : 0; }
function weaponDmg(h, D) { const w = weaponOf(h, D); return w ? w.dmg : 0; }
function weaponWear(h, D) {
  const w = weaponOf(h, D);
  if (!w) return;
  h.weapon.n--;
  if (h.weapon.n <= 0) {
    pop(h.x, h.y - 66, w.name + ' BROKE', '#ff9a7a');
    chip.sfx('break');
    sparks(h.x + h.face * 12, h.y - 26, 10, w.col);
    h.weapon = null;
  }
}

/** First ninja and first knife thrower always pay out, so every run meets the weapons. */
function ninjaDrop(e) {
  if (game.demo) return;
  const g = game.gifts || (game.gifts = {});
  const r = Math.random();
  if (e.kind === 'ninja') { if (!g.stars || r < 0.5) { g.stars = true; dropItem('stars', e.x, e.y - 30); } }
  else if (e.kind === 'dagger') { if ((!g.chaku && game.floorIdx === 0) || r < 0.15) { g.chaku = true; dropItem('nunchaku', e.x, e.y - 30); } }
  else if (e.kind === 'monk') { if (!g.staff || r < 0.2) { g.staff = true; dropItem('staff', e.x, e.y - 34); } }
}

/* ---- shuriken ---------------------------------------------------------------- */
function throwStar(h) {
  if (!h.stars || h.starCD > 0 || h.act || h.grabbers.length || h.dashT > 0) return false;
  h.stars--; h.starCD = 0.2; h.throwT = 0.18;
  const low = h.crouch && h.ground;
  game.shots.push({ k: 'star', x: h.x + h.face * 10, y: low ? h.y - 13 : h.y - 30, vx: h.face * 340, vy: 0, foe: false, hero: true, t: 0, life: 1.3 });
  chip.sfx('star');
  game.stageStats.stars = (game.stageStats.stars || 0) + 1;
  return true;
}

function starHitFoe(s, e) {
  s.gone = true;
  if (e.kind === 'monk' && sgn(s.x - e.x) === e.face && e.st !== 'hurt' && e.st !== 'trip') {
    chip.sfx('clang'); sparks(s.x, s.y, 5, '#ffe27a'); setFoeSt(e, 'block');
    return;
  }
  hitSpark(e.x - sgn(s.vx) * 3, s.y, false);
  e.hp -= 1; e.flash = 0.08;
  if (e.hp <= 0) {
    killFoe(e, sgn(s.vx), 130, true); chip.sfx('down');
    addScore(e.T.pts, e.x, e.y - e.T.h - 6, true);
    grantChi(game.hero, 4);
  } else {
    setFoeSt(e, 'hurt'); e.vx = sgn(s.vx) * 40; e.stun = 0.25; chip.sfx('punch');
  }
}

/* ---- the hero's ninja movement ----------------------------------------------------- */
/** Runs every control frame before attacks and jumps. True means the frame is used up. */
function heroNinja(h, dt, I, P, dir) {
  h.dashCD = Math.max(0, (h.dashCD || 0) - dt);
  h.dashWin = Math.max(0, (h.dashWin || 0) - dt);
  h.starCD = Math.max(0, (h.starCD || 0) - dt);
  h.throwT = Math.max(0, (h.throwT || 0) - dt);
  h.wallLock = Math.max(0, (h.wallLock || 0) - dt);
  if (h.flipT >= 0) { h.flipT += dt; if (h.flipT > 0.44) h.flipT = -1; }

  // double tap a direction, or press the dash button
  let want = 0;
  if (P.left || P.right) {
    const d = P.left ? -1 : 1;
    if (h.tapDir === d && game.t - h.tapT < 0.24) want = d;
    h.tapDir = d; h.tapT = game.t;
  }
  if (P.dash) want = dir || h.face;

  if (h.dashT > 0) {
    h.dashT -= dt;
    h.vx = h.dashDir * (h.ground ? 340 : 300);
    h.x += h.vx * dt;
    if (!h.ground) h.vy = 0;
    if (Math.random() < 0.5) fxAdd({ k: 'dust', x: h.x - h.dashDir * 6, y: h.y - (h.ground ? 1 : 20), vx: -h.dashDir * 30, vy: rand(-10, 0), t: 0, life: 0.3 });
    if (h.dashT <= 0) {
      h.dashWin = 0.22;
      h.vx = h.dashDir * h.S.speed * (h.ground ? 0.7 : 0.9);
    }
    return true;
  }
  if (want && h.dashCD <= 0 && !h.act && !h.grabbers.length && (h.ground || !h.airDash)) {
    h.dashT = h.ground ? 0.17 : 0.15; h.dashDir = want; h.face = want; h.dashCD = 0.4;
    h.crouch = false;
    if (!h.ground) { h.airDash = true; h.vy = 0; h.flipT = -1; }
    chip.sfx('dash');
    smoke(h.x, h.y - 20, 5);
    game.stageStats.dashes = (game.stageStats.dashes || 0) + 1;
    return true;
  }

  // wall slide and wall jump
  h.sliding = !h.ground && !!h.wallSide && dir === h.wallSide && h.vy > 0 && !h.act;
  if (h.sliding) { h.vy = Math.min(h.vy, 72); h.face = -h.wallSide; if (Math.random() < 0.3) fxAdd({ k: 'dust', x: h.x + h.wallSide * 5, y: h.y - 30, vx: 0, vy: 20, t: 0, life: 0.25 }); }
  if (!h.ground && h.wallSide && (P.jump || P.up) && !h.act) {
    h.vy = -h.S.jumpV * 0.96; h.vx = -h.wallSide * h.S.speed * 1.4; h.face = -h.wallSide;
    h.jumps = 0; h.airDash = false; h.airAtk = false; h.flipT = 0; h.wallLock = 0.18; h.jumpCut = true;
    chip.sfx('jump2');
    fxAdd({ k: 'ring', x: h.x + h.wallSide * 6, y: h.y - 22, t: 0, life: 0.28, r0: 3, r1: 14, col: '#ffffff' });
    dust(h.x + h.wallSide * 5, h.y - 22, 4);
    h.wallSide = 0; h.sliding = false; h.skipJump = true;
    game.stageStats.walls = (game.stageStats.walls || 0) + 1;
  }
  return false;
}

/** Called after the bounds clamp: pushing into a boundary in the air counts as a wall. */
function heroWallContact(h, xBefore, dt) {
  if (h.ground || h.dead) { h.wallSide = 0; h.wallT = 0; return; }
  if (Math.abs(h.x - xBefore) > 0.01) { h.wallSide = sgn(xBefore - h.x); h.wallT = 0.14; }
  else { h.wallT = (h.wallT || 0) - dt; if (h.wallT <= 0) h.wallSide = 0; }
}

function heroNinjaPose(h) {
  if (h.dashT > 0) return ['dash', 0];
  if (h.throwT > 0) return ['toss', h.throwT > 0.1 ? 0.3 : 1];
  if (h.sliding) return ['wall', 0];
  if (!h.ground && h.flipT >= 0) return ['flip', 0];
  return null;
}

/* ---- drawing ------------------------------------------------------------------ */
let SPRITE_ITEM = null;

/** The hero with afterimages while dashing, a spin while flipping and any weapon in hand. */
function drawHeroBody(g, h, anim, fr, cx) {
  const x = h.x - cx, flash = h.flash > 0 ? '#ff5a4a' : false;
  h.ghosts = h.ghosts || [];
  if (h.dashT > 0 || (!h.ground && h.flipT >= 0)) h.ghosts.push({ x: h.x, y: h.y, anim, fr, face: h.face, t: game.t, rot: heroSpin(h) });
  h.ghosts = h.ghosts.filter((p) => game.t - p.t < 0.2);
  for (const p of h.ghosts) {
    const a = 0.5 * (1 - (game.t - p.t) / 0.2);
    spinDraw(g, p.x - cx, p.y, p.rot, () => drawSprite(g, h.kind, p.anim, p.fr, p.face, p.x - cx, p.y, '#6a5aff', a));
  }
  const w = h.weapon ? h.weapon.k : null;
  SPRITE_ITEM = w ? { item: w, ia: w === 'staff' ? -20 : 30 } : null;
  if (h.throwT > 0 && h.throwT > 0.1) SPRITE_ITEM = { item: 'star', ia: 0 };
  spinDraw(g, x, h.y, heroSpin(h), () => drawSprite(g, h.kind, anim, fr, h.face, x, h.y, flash));
  SPRITE_ITEM = null;
}

function heroSpin(h) { return !h.ground && h.flipT >= 0 && !h.act ? h.face * (h.flipT / 0.44) * TAU : 0; }
function spinDraw(g, x, y, rot, fn) {
  if (!rot) { fn(); return; }
  g.save(); g.translate(x, y - 20); g.rotate(rot); g.translate(-x, -(y - 20)); fn(); g.restore();
}

/** Extra held items drawn by the fighter rig. */
function drawHeldExtra(g, d, item, u) {
  const ink = d.ink;
  if (item === 'star') {
    g.rotate(game.t * 2);
    starShape(g, 0, 0, 2.6 * u);
    g.lineWidth = OLW * 1.4; g.strokeStyle = ink; g.stroke(); g.fillStyle = d.tint ? ink : '#c8d6e4'; g.fill();
    if (!d.tint) disc(g, 0, 0, 0.5 * u, '#3a4250');
    return;
  }
  if (item === 'staff') {
    limbs(g, [[-15 * u, 0, 19 * u, 0, 0.55 * u, 0.55 * u, '#6a3e1a', '#b07a40']], d);
    if (!d.tint) for (const p of [-14.2, 18.2]) rect(g, (p - 0.8) * u, -0.62 * u, 1.6 * u, 1.24 * u, '#c9a24a');
    return;
  }
  if (item === 'nunchaku') {
    limbs(g, [[-0.6 * u, 0, 4.6 * u, 0, 0.5 * u, 0.5 * u, '#2a160a', '#7a4a22']], d);
    const swing = Math.sin(game.t * 14) * 0.6 + 0.5;
    const ex = 4.6 * u + Math.cos(swing) * 1.8 * u, ey = Math.sin(swing) * 1.8 * u;
    if (!d.tint) for (let i = 0; i <= 3; i++) disc(g, lerp(4.6 * u, ex, i / 3), lerp(0, ey, i / 3), 0.22 * u, '#9aa4b0');
    const bx = ex + Math.cos(swing + 0.9) * 5 * u, by = ey + Math.sin(swing + 0.9) * 5 * u;
    limbs(g, [[ex, ey, bx, by, 0.5 * u, 0.5 * u, '#2a160a', '#7a4a22']], d);
    if (!d.tint) { disc(g, 4.4 * u, 0, 0.32 * u, '#f2b23a'); disc(g, ex, ey, 0.32 * u, '#f2b23a'); }
  }
}

function starShape(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, rr = i % 2 ? r * 0.32 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

function drawStarShot(g, x, y, t, s) {
  const dir = sgn(s.vx) || 1;
  g.save();
  g.globalAlpha *= 0.3; stampLine(g, x - dir * 12, y, x, y, 1.6, s.foe ? '#ff9a9a' : '#bfe6ff'); g.globalAlpha /= 0.3;
  if (s.deflected || s.hero) drawGlow(g, x, y, 7, '#9fe8ff', 0.55);
  g.translate(x, y); g.rotate(t * 26);
  starShape(g, 0, 0, 3.6);
  g.lineWidth = 0.7; g.strokeStyle = INK; g.stroke();
  g.fillStyle = lgrad(g, -3, -3, 3, 3, [[0, '#f4f8fc'], [0.5, '#9aaabb'], [1, '#5a6878']]); g.fill();
  disc(g, 0, 0, 0.8, '#2a2a34');
  g.restore();
}

/* pickup icons */
Object.assign(PICK_DRAW, {
  stars(g) {
    for (const [ox, oy, r] of [[-2.2, 1, 3.4], [2.4, -0.6, 3.8]]) {
      g.save(); g.translate(ox, oy); g.rotate(ox);
      starShape(g, 0, 0, r); g.lineWidth = 0.7; g.strokeStyle = INK; g.stroke();
      g.fillStyle = lgrad(g, -3, -3, 3, 3, [[0, '#ffffff'], [1, '#7a8a9a']]); g.fill(); disc(g, 0, 0, 0.7, '#2a2a34');
      g.restore();
    }
  },
  staff(g) {
    g.save(); g.rotate(-0.7);
    rrect(g, -7.5, -0.9, 15, 1.8, 0.9, INK); rrect(g, -7, -0.55, 14, 1.1, 0.55, '#b07a40');
    rect(g, -7, -0.6, 1.4, 1.2, '#e2b84a'); rect(g, 5.6, -0.6, 1.4, 1.2, '#e2b84a');
    g.restore();
  },
  nunchaku(g) {
    for (const [a, ox] of [[-0.5, -2.4], [0.5, 2.4]]) {
      g.save(); g.translate(ox, 0.5); g.rotate(a);
      rrect(g, -0.95, -4.2, 1.9, 6.6, 0.9, INK); rrect(g, -0.6, -3.9, 1.2, 6, 0.6, '#8a5428'); rect(g, -0.6, -3.9, 1.2, 0.8, '#f2b23a');
      g.restore();
    }
    for (let i = 0; i < 4; i++) disc(g, -1.6 + i * 1.07, -3.6 - Math.sin((i / 3) * Math.PI) * 1.2, 0.4, '#b8c2cc');
  }
});

/* ---- ninja foes: shuriken volleys and somersaults over your head ------------------------ */
function ninjaExtra(e, dt, dx, adx, toward, h) {
  if (e.st === 'throw') {
    e.face = toward;
    const wind = 0.34 * game.diff.tele;
    if (!e.fired && e.t > wind) {
      e.fired = true;
      game.shots.push({ k: 'star', x: e.x + e.face * 10, y: e.y - (e.low ? 13 : 30), vx: e.face * 235 * game.diff.foeSpeed, vy: 0, foe: true, deflect: true, dmg: 3, t: 0, life: 2.2 });
      chip.sfx('star');
    }
    if (e.t > wind + 0.28) { setFoeSt(e, 'walk'); e.cd = rand(0.9, 1.5) / game.diff.ninja; }
    return true;
  }
  if (e.st === 'flip') {
    e.x += e.vx * dt; e.vy += GRAV * dt; e.y += e.vy * dt;
    if (e.y >= GROUND_Y) {
      e.y = GROUND_Y; e.vy = 0; e.ground = true; dust(e.x, e.y, 4);
      e.face = sgn(h.x - e.x) || e.face;
      setFoeSt(e, 'ready'); e.t = 0.18;
    }
    return true;
  }
  e.flipCD = Math.max(0, (e.flipCD || 0) - dt);
  if (e.st === 'walk' && !h.dead && (e.alpha === undefined || e.alpha >= 1)) {
    const k = game.diff.ninja || 1;
    if (e.cd <= 0 && adx > 84 && adx < 200 && chance(dt * 1.5 * k)) { setFoeSt(e, 'throw'); e.low = chance(0.4); e.fired = false; return true; }
    if (e.flipCD <= 0 && adx > 16 && adx < 64 && h.ground && chance(dt * 2.2 * k)) {
      e.flipCD = rand(2.2, 3.4) / k;
      const land = clamp(h.x + toward * 42, game.camX + 16, game.camX + W - 16);
      const T = 0.62;
      setFoeSt(e, 'flip'); e.ground = false; e.vx = (land - e.x) / T; e.vy = -GRAV * T / 2;
      chip.sfx('jump2');
      return true;
    }
  }
  return false;
}

/** Ninjas hit out of the air keep falling instead of hanging there. */
function ninjaFall(e, dt) {
  e.vy = (e.vy || 0) + GRAV * dt; e.y += e.vy * dt;
  if (e.y >= GROUND_Y) { e.y = GROUND_Y; e.vy = 0; e.ground = true; }
}

function ninjaFoePose(e) {
  if (e.st === 'throw') return [e.low ? 'throwLow' : 'throw', Math.min(1, e.t / Math.max(0.05, 0.34 * game.diff.tele))];
  if (e.st === 'flip') return ['flip', 0];
  return null;
}
function ninjaSpin(e) { return e.st === 'flip' ? e.face * clamp(e.t / 0.62, 0, 1) * TAU : 0; }

/* ---- HUD readout for the weapon, shuriken and Invincible mode -------------------------- */
function drawArmsHud(g) {
  const h = game.hero;
  if (!h) return;
  let x = 8;
  const y = H - 12;
  if (h.weapon) {
    const w = WEAPONS[h.weapon.k];
    rrect(g, x - 2, y - 2, 46, 9, 4.5, 'rgba(0,0,0,0.45)');
    g.save(); g.translate(x + 5, y + 2.6); g.scale(0.55, 0.55); PICK_DRAW[h.weapon.k](g); g.restore();
    const p = h.weapon.n / w.uses;
    rrect(g, x + 12, y + 1.4, 28, 2.6, 1.3, 'rgba(255,255,255,0.12)');
    rrect(g, x + 12, y + 1.4, Math.max(2.6, 28 * p), 2.6, 1.3, p < 0.25 ? '#ff6a4a' : w.col);
    x += 50;
  }
  if (h.stars) {
    rrect(g, x - 2, y - 2, 30, 9, 4.5, 'rgba(0,0,0,0.45)');
    g.save(); g.translate(x + 4, y + 2.6); g.rotate(game.t * 2); starShape(g, 0, 0, 3); g.fillStyle = '#c8d6e4'; g.fill(); g.restore();
    T(g, 'x' + h.stars, x + 10, y - 1.2, '#e8eef6', { weight: 700, scale: 0.85 });
  }
  if (game.invincible) {
    const bx = 6, by = HUD_H + 4;
    rrect(g, bx, by, 50, 9, 4.5, 'rgba(70,40,170,0.6)');
    T(g, 'INVINCIBLE', bx + 25, by + 0.6, '#efe8ff', { align: 'center', weight: 700, scale: 0.78 });
  }
}
