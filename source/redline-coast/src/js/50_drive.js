/* ==========================================================================
   Driving: the car, drifting, nitro, traffic, the rival, hazards and pickups.
   ========================================================================== */

const CAR_HW = 0.13;              // half the car's width, in road half-widths

function newPlayer(carId) {
  const c = CARS[carId] || CARS.gt;
  return {
    car: c, x: 0, speed: 0, steer: 0, lean: 0, nitro: 0.34, nitroOn: false, nitroT: 0,
    drift: 0, driftDir: 0, driftT: 0, boostT: 0, spin: 0, spinDir: 0, slick: 0, safe: 0, bumpT: 0,
    slip: 0, slipOn: false, brake: false, gas: false, off: false, skid: 0, crashT: 0, air: 0
  };
}

function topSpeed(p) { return MAX_SPEED * p.car.top * (p.nitroOn ? 1.27 : p.boostT > 0 ? 1.12 : p.slipOn ? 1.08 : 1); }

/** One step of the player's car. I: held buttons. */
function updatePlayer(dt, I) {
  const g = game, p = g.p, T = g.T, car = p.car;
  const pz = g.pos + PLAYER_Z, seg = segAt(T, pz), sp = p.speed / MAX_SPEED;
  const locked = g.count > 0 || g.finished || g.timeUp;
  const auto = autoGasOn();
  let steerIn = 0;
  if (!locked || g.finished) steerIn = input.axis && !g.auto ? input.axis : (I.left ? -1 : 0) + (I.right ? 1 : 0);
  if (g.finished) steerIn = clamp(-p.x * 2 - seg.curve * 0.1, -1, 1);
  let gas = !locked && (I.gas || I.up || (auto && !I.brake && !I.down));
  let brake = !locked && (I.brake || I.down);
  if (g.finished) { gas = false; brake = p.speed > MAX_SPEED * 0.25; }
  p.gas = gas; p.brake = brake || g.finished;

  // spin-out on oil: no steering until it ends
  if (p.spin > 0) { p.spin -= dt; steerIn = 0; p.x += p.spinDir * dt * 0.55 * sp; gas = false; }
  p.steer = approach(p.steer, steerIn, dt * (steerIn ? 5.5 : 8));
  p.lean = approach(p.lean, p.steer * (p.drift ? 2 : 1.25), dt * 9);

  // nitro
  const wantN = !locked && I.nitro && p.nitro > 0.02 && p.spin <= 0;
  if (wantN && !p.nitroOn && p.nitro > 0.1) { p.nitroOn = true; chip.sfx('nitro'); g.punch = 0.05; }
  if (p.nitroOn) {
    p.nitro -= dt / 3.4; p.nitroT += dt; g.stats.nitroT += dt;
    if (!wantN || p.nitro <= 0) { p.nitroOn = false; p.nitro = Math.max(0, p.nitro); }
  }

  // drift: tap the brake while turning at speed, then hold the turn
  if (!p.drift && brake && Math.abs(p.steer) > 0.5 && sp > 0.55 && p.spin <= 0 && !p.off) { p.drift = 1; p.driftDir = sgn(p.steer); p.driftT = 0; p.driftEase = 0; chip.sfx('pass'); }
  if (p.drift) {
    p.driftT += dt;
    // easing the wheel for a moment keeps the slide alive; turning the other way ends it
    p.driftEase = sgn(steerIn) === p.driftDir ? 0 : (p.driftEase || 0) + dt;
    const holding = sgn(steerIn) !== -p.driftDir && p.driftEase < 0.35 && sp > 0.4 && !p.off && p.spin <= 0;
    if (!holding) {
      if (p.driftT > 0.7) { p.boostT = Math.min(1.6, 0.5 + p.driftT * 0.45); chip.sfx('drift'); popText('DRIFT BOOST', '#7fe9ff'); addScore(Math.round(p.driftT * 400) * mult()); g.stats.drifts++; if (p.driftT >= 3) award('sideways'); }
      p.drift = 0;
    } else { p.nitro = Math.min(1, p.nitro + dt * 0.11); g.stats.driftT += dt; if (g.t % 0.2 < dt) addScore(20 * mult()); }
  }
  if (p.boostT > 0) p.boostT -= dt;

  // speed
  const top = topSpeed(p);
  const grip = car.grip * (p.slick > 0 ? 0.4 : 1);
  if (p.slick > 0) p.slick -= dt;
  let acc = 0;
  if (gas) acc = (MAX_SPEED / 4.4) * car.acc * (p.nitroOn ? 2.4 : p.boostT > 0 ? 1.8 : 1) * (1 - 0.55 * Math.min(1, p.speed / top) ** 2);
  if (brake && !p.drift) acc = -MAX_SPEED / 1.5;
  else if (brake) acc = -MAX_SPEED / 14;
  else if (!gas) acc = -MAX_SPEED / 6.5;
  if (p.drift) acc -= MAX_SPEED / 30;
  p.speed += acc * dt;
  if (p.speed > top) p.speed = approach(p.speed, top, (MAX_SPEED / 2.2) * dt);
  // off the road: sand, grass and snow drag the car down
  p.off = Math.abs(p.x) > 1.02;
  if (p.off) { const lim = MAX_SPEED * 0.38; if (p.speed > lim) p.speed = approach(p.speed, lim, (MAX_SPEED / 0.9) * dt); if (g.chain) breakChain(); }
  p.speed = clamp(p.speed, 0, MAX_SPEED * 1.4);

  // steering and the pull of the corner
  const k = Math.min(1, sp * 1.6);
  const turn = 2.35 * grip * (p.drift ? 1.35 : 1) * (0.4 + 0.6 * k);
  p.x += p.steer * turn * dt * (sp > 0.02 ? 1 : 0);
  const pull = seg.curve * sp * sp * 0.6 * (p.drift ? 0.8 : 1) * (p.slick > 0 ? 1.35 : 1) / Math.sqrt(car.grip);
  p.x -= pull * dt;
  p.x = clamp(p.x, -2.6, 2.6);
  // tyres complain when the corner asks for more than the steering gives
  const load = Math.abs(seg.curve) * sp * sp * 0.6 / (2.35 * grip);
  p.skid = approach(p.skid, p.drift ? 1 : p.spin > 0 ? 1 : clamp((load - 0.72) * 3, 0, 1) * (Math.abs(p.steer) > 0.3 ? 1 : 0.3), dt * 6);

  if (p.safe > 0) p.safe -= dt;
  if (p.bumpT > 0) p.bumpT -= dt;
  if (p.crashT > 0) p.crashT -= dt;

  // move along the road, testing everything we pass
  const z0 = pz, z1 = pz + p.speed * dt;
  g.pos += p.speed * dt;
  g.dist += p.speed * dt;
  if (!locked) addScore((p.speed * dt) / 240 * (p.nitroOn ? 2 : 1));
  roadsideHits(z0, z1);
  if (p.speed / MAX_SPEED >= 1.25 && p.nitroOn) award('redline');
  g.stats.top = Math.max(g.stats.top, p.speed);
  // dust, smoke and sparks
  if (p.off && sp > 0.15 && g.fxT <= 0) { spawnDust(p.x, T.th); g.fxT = 0.03; }
  if ((p.drift || p.skid > 0.6) && g.fxT <= 0) { spawnSmoke(); g.fxT = 0.03; }
  g.fxT -= dt;
}

function autoGasOn() {
  const m = settings.autoGas || 'auto';
  if (m === 'on') return true;
  if (m === 'off') return false;
  return input.usingTouch || (isTouch && coarse && !input.usingPad);
}

/** Things on and beside the road between z0 and z1. */
function roadsideHits(z0, z1) {
  const g = game, p = g.p, T = g.T;
  const a = Math.floor(z0 / SEG), b = Math.floor(z1 / SEG);
  for (let i = a + 1; i <= b && i < T.n; i++) {
    const seg = T.segs[i];
    if (i === T.check && !g.checked) passCheckpoint();
    if (i === T.goal && !g.finished) finishStage();
    for (const s of seg.sprites) {
      if (s.gone || s.over) continue;
      const dx = Math.abs(p.x - s.off);
      if (s.pick) { if (dx < CAR_HW + 0.14) { s.gone = true; collect(s.pick); } continue; }
      if (s.hit) {
        if (dx > CAR_HW + (s.hw || 0.07)) continue;
        if (s.hit === 'cone') { s.gone = true; p.speed *= 0.9; chip.sfx('cone'); spawnDebris(s.off, '#ff6a2a', 5); breakChain(); g.shake = Math.max(g.shake, 2); g.stats.hits++; }
        else if (s.hit === 'oil') { if (p.spin <= 0 && p.safe <= 0) { p.spin = 0.9; p.spinDir = p.steer ? sgn(p.steer) : (Math.random() < 0.5 ? -1 : 1); p.drift = 0; chip.sfx('oil'); popText('OIL!', '#c08aff'); breakChain(); g.stats.hits++; } }
        else if (s.hit === 'ice') { p.slick = 1.3; if (!s.said) { s.said = true; chip.sfx('slip'); popText('ICE!', '#bfeaff'); } }
        else if (s.hit === 'puddle') { p.slick = 0.6; p.speed *= 0.93; if (!s.said) { s.said = true; chip.sfx('splash'); spawnSplash(); } }
        else if (s.hit === 'solid') { if (p.safe <= 0) { s.gone = s.name === 'barrier'; if (s.gone) spawnDebris(s.off, '#f2f0e6', 8); crash(0.3, p.x < s.off ? -1 : 1); } }
        continue;
      }
      if (s.solid && p.off && dx < s.solid + CAR_HW * 0.8 && p.safe <= 0) crash(0.12, s.off > 0 ? -1 : 1);
    }
  }
}

/** A hard hit: lose most of the speed and get shoved aside. keep is the share of speed kept. */
function crash(keep, dir) {
  const g = game, p = g.p;
  p.speed = Math.min(p.speed, MAX_SPEED * keep + p.speed * 0.1);
  p.x += dir * 0.12; p.safe = 1; p.crashT = 0.5; p.drift = 0; p.nitroOn = false;
  g.shake = 9; g.flash = 0.25; chip.sfx('crash'); spawnSparks(12); breakChain(); g.stats.crashes++; g.stageCrash++;
  popText('CRASH', '#ff5a5a');
  if (navigator.vibrate && settings.shake) { try { navigator.vibrate(60); } catch (e) { /* ignore */ } }
}

function collect(kind) {
  const g = game, p = g.p;
  if (kind === 'coin') { g.coins++; g.stats.coins++; addScore(300 * mult()); chip.sfx('coin'); if (g.stats.coins >= 150) award('gold'); }
  else if (kind === 'nitro') { p.nitro = Math.min(1, p.nitro + 0.5); chip.sfx('pickup'); popText('NITRO', '#7fe9ff'); addScore(500); }
  else if (kind === 'clock') { g.time += 3; g.timeFlash = 1; chip.sfx('time'); popText('+3 SECONDS', '#ffd27a'); addScore(500); }
  spawnSparkle();
}

/* ---- traffic --------------------------------------------------------------------- */
function updateTraffic(dt) {
  const g = game, p = g.p, T = g.T, pz = g.pos + PLAYER_Z;
  let slip = false;
  for (const seg of g.carSegs) seg.cars.length = 0;
  g.carSegs.length = 0;
  for (const c of T.cars) {
    const dz = c.z - pz;
    c.z += c.speed * dt;
    if (dz < -3000 || dz > DRAW_N * SEG + 2000) continue;
    c.wob += dt;
    if (c.bump > 0) { c.bump -= dt; c.off += c.bumpDir * dt * 0.6; c.off = clamp(c.off, -0.85, 0.85); }
    const seg = segAt(T, c.z);
    seg.cars.push(c); g.carSegs.push(seg);
    if (g.finished) continue;
    const dx = p.x - c.off, adx = Math.abs(dx), w = CAR_HW + c.hw;
    // contact
    if (dz > -260 && dz < 300 && adx < w && p.safe <= 0) {
      if (p.speed > c.speed) {
        const hard = p.speed - c.speed > MAX_SPEED * 0.3;
        p.speed = c.speed * (hard ? 0.72 : 0.92); c.speed *= 1.06; c.bump = 0.4; c.bumpDir = -sgn(dx) || 1;
        p.x += sgn(dx || 1) * 0.07; p.safe = 0.55; p.bumpT = 0.3; p.drift = 0; p.nitroOn = false;
        g.shake = hard ? 7 : 4; if (hard) g.flash = 0.18;
        chip.sfx(hard ? 'crash' : 'bump'); spawnSparks(hard ? 10 : 5); breakChain(); g.stats.hits++; g.stageCrash++;
        if (hard) popText('CRASH', '#ff5a5a');
        if (navigator.vibrate && settings.shake) { try { navigator.vibrate(30); } catch (e) { /* ignore */ } }
      } else { p.x += sgn(dx || 1) * 0.05; }
    }
    // overtakes and near misses
    if (!c.passed && dz < -120) {
      c.passed = true;
      if (p.speed > c.speed) {
        g.stats.passes++; g.passes++; if (g.stats.passes >= 120) award('shark');
        if (adx < w + 0.13 && p.bumpT <= 0) { nearMiss(); }
        else { addScore(150 * mult()); chip.sfx('pass'); }
      }
    } else if (c.passed && dz > 200) c.passed = false;
    // slipstream: tucked in close behind
    if (dz > 300 && dz < 1900 && adx < 0.15 && p.speed > MAX_SPEED * 0.5) slip = true;
  }
  p.slip = approach(p.slip, slip ? 1 : 0, dt * (slip ? 1.4 : 3));
  const was = p.slipOn;
  p.slipOn = p.slip > 0.6;
  if (p.slipOn) { p.nitro = Math.min(1, p.nitro + dt * 0.1); if (!was) { chip.sfx('slip'); popText('SLIPSTREAM', '#bfeaff'); } }
}

function nearMiss() {
  const g = game, p = g.p;
  g.chain = Math.min(99, g.chain + 1); g.chainT = 5; g.stats.near++; g.stats.bestChain = Math.max(g.stats.bestChain, g.chain);
  p.nitro = Math.min(1, p.nitro + 0.1);
  addScore(500 * mult());
  chip.sfx('near'); popText(g.chain > 1 ? 'NEAR MISS  X' + g.chain : 'NEAR MISS', '#ffd27a');
  g.punch = Math.max(g.punch, 0.025);
  if (g.chain >= 10) award('needle');
}
function mult() { return 1 + Math.min(8, game.chain); }
function breakChain() { if (game.chain > 2) popText('CHAIN LOST', '#9aa6b8'); game.chain = 0; game.chainT = 0; }

/* ---- the rival --------------------------------------------------------------------- */
function newRival(T, diff) {
  const r = T.st.rival;
  return { name: r.name, style: r.car, col: r.col, z: (T.start - 4) * SEG, off: 0.5, speed: 0, pace: r.pace * diff.rival, hw: 0.13, lean: 0, ahead: true, done: false, tgt: 0.5, think: 0 };
}
function updateRival(dt) {
  const g = game, r = g.rival, T = g.T, p = g.p;
  if (!r) return;
  const pz = g.pos + PLAYER_Z, seg = segAt(T, r.z), gap = (r.z - pz) / SEG;
  if (g.count > 0) { seg.cars.push(r); g.carSegs.push(seg); return; }
  // pace: a touch slower through hard corners, and a rubber band so the duel stays close
  let want = MAX_SPEED * r.pace * (1 - Math.min(0.14, Math.abs(seg.curve) * 0.02));
  if (gap > 110) want *= 0.9; else if (gap > 50) want *= 0.96; else if (gap < -160) want *= 1.07; else if (gap < -50) want *= 1.035;
  if (r.done) want = MAX_SPEED * 0.3;
  r.speed = approach(r.speed, want, (MAX_SPEED / 4) * dt);
  r.z += r.speed * dt;
  // pick a clear lane
  r.think -= dt;
  if (r.think <= 0) {
    r.think = 0.25;
    let best = r.tgt, bestScore = -1e9;
    for (const lx of LANE_X) {
      let sc = -Math.abs(lx - r.off) * 0.6 - Math.abs(lx + seg.curve * 0.08) * 0.3;
      for (const c of T.cars) { const dz = c.z - r.z; if (dz > -200 && dz < 2600 && Math.abs(c.off - lx) < 0.4) sc -= 3 - dz / 1300; }
      for (let i = 1; i < 12; i++) { const s2 = T.segs[Math.min(T.n - 1, seg.i + i)]; for (const sp of s2.sprites) if (sp.hit && sp.hit !== 'cone' && Math.abs(sp.off - lx) < 0.4) sc -= 2; }
      if (sc > bestScore) { bestScore = sc; best = lx; }
    }
    r.tgt = best;
  }
  const d = clamp(r.tgt - r.off, -1, 1);
  r.off += d * dt * 1.4; r.lean = approach(r.lean, clamp(d * 3 + seg.curve * 0.25, -2, 2), dt * 6);
  if (!r.done && r.z >= T.goal * SEG) { r.done = true; if (!g.finished) { g.rivalWon = true; popText(r.name + ' TAKES THE LINE', '#ff8a8a'); } }
  // contact with the player: a shove, never a wreck
  const dz = r.z - pz, dx = p.x - r.off;
  if (!g.finished && dz > -260 && dz < 300 && Math.abs(dx) < CAR_HW + r.hw && p.safe <= 0) {
    if (p.speed > r.speed) p.speed = r.speed * 0.95; p.x += sgn(dx || 1) * 0.08; p.safe = 0.4; p.bumpT = 0.3;
    g.shake = 4; chip.sfx('bump'); spawnSparks(5);
  }
  const ahead = r.z > pz;
  if (ahead !== r.ahead && !g.finished && g.playT > 2) {
    r.ahead = ahead;
    if (!ahead) { popText('PASSED ' + r.name + '!', '#7dffa0'); chip.sfx('win'); addScore(2000); }
    else { popText(r.name + ' IS BACK IN FRONT', '#ff8a8a'); chip.sfx('rival'); }
  } else r.ahead = ahead;
  seg.cars.push(r); g.carSegs.push(seg);
}

/* ---- small effects: screen-space particles around the car ---------------------------- */
function fxAdd(o) { if (game.fx.length < 140) game.fx.push(o); }
function spawnDust(x, th) {
  const col = th.id === 'coast' ? (x < 0 ? '#f0d090' : '#5ab85a') : th.id === 'mesa' ? '#e8b878' : th.id === 'neon' ? '#4a4460' : '#f4f9ff';
  for (const sx of [-1, 1]) fxAdd({ k: 'puff', x: sx * 22 + rand(-4, 4), y: -2, vx: sx * rand(10, 40), vy: rand(-30, -8), t: 0, life: rand(0.35, 0.6), r: rand(4, 8), col, a: 0.6 });
}
function spawnSmoke() { for (const sx of [-1, 1]) fxAdd({ k: 'puff', x: sx * 23, y: -2, vx: sx * rand(4, 20) - game.p.steer * 30, vy: rand(-22, -6), t: 0, life: rand(0.35, 0.6), r: rand(3, 6), col: '#e8ecf4', a: 0.3 }); }
function spawnSparks(n) { for (let i = 0; i < n; i++) fxAdd({ k: 'spark', x: rand(-26, 26), y: rand(-20, -4), vx: rand(-120, 120), vy: rand(-160, -30), t: 0, life: rand(0.25, 0.55), col: i % 2 ? '#ffd27a' : '#ffffff' }); }
function spawnDebris(off, col, n) { for (let i = 0; i < n; i++) fxAdd({ k: 'bit', x: (off - game.p.x) * 180 + rand(-8, 8), y: rand(-14, -2), vx: rand(-90, 90), vy: rand(-170, -60), t: 0, life: rand(0.5, 0.9), col, r: rand(1.5, 3.2), rot: rand(0, 6) }); }
function spawnSparkle() { for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; fxAdd({ k: 'spark', x: 0, y: -16, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 20, t: 0, life: 0.4, col: '#fff2c0', g: 0 }); } }
function spawnSplash() { for (let i = 0; i < 12; i++) fxAdd({ k: 'spark', x: rand(-28, 28), y: -2, vx: rand(-60, 60), vy: rand(-150, -50), t: 0, life: rand(0.3, 0.6), col: '#c8a0ff' }); }
function updateFx(dt) {
  const fx = game.fx;
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt;
    if (f.t >= f.life) { fx.splice(i, 1); continue; }
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.k !== 'puff' && f.g !== 0) f.vy += 420 * dt;
  }
  for (let i = game.pops.length - 1; i >= 0; i--) { const q = game.pops[i]; q.t += dt; if (q.t > 1.5) game.pops.splice(i, 1); }
}
function popText(s, col) {
  const pops = game.pops;
  if (pops.length && pops[pops.length - 1].s === s && pops[pops.length - 1].t < 0.3) return;
  pops.push({ s, col, t: 0 });
  if (pops.length > 3) pops.shift();
}

/* ---- the bot: drives the attract mode and the automated tests ------------------------ */
function botInput() {
  const g = game, p = g.p, T = g.T, pz = g.pos + PLAYER_Z, seg = segAt(T, pz);
  const I = { left: false, right: false, up: false, down: false, gas: true, brake: false, nitro: false };
  // look ahead for the sharpest corner coming and for the clearest lane
  let curve = 0;
  for (let i = 0; i < 26; i++) { const s = T.segs[Math.min(T.n - 1, seg.i + i)]; if (Math.abs(s.curve) > Math.abs(curve)) curve = s.curve; }
  let best = 0, bestScore = -1e9;
  for (const lx of [-0.66, -0.33, 0, 0.33, 0.66]) {
    let sc = -Math.abs(lx - p.x) * 0.5 - Math.abs(lx + clamp(curve, -4, 4) * 0.1) * 0.5;
    for (const c of T.cars) { const dz = c.z - pz; if (dz > -100 && dz < 3400 && p.speed > c.speed && Math.abs(c.off - lx) < 0.36) sc -= 4 - dz / 1200; }
    if (g.rival) { const dz = g.rival.z - pz; if (dz > -100 && dz < 2000 && Math.abs(g.rival.off - lx) < 0.4) sc -= 3; }
    for (let i = 0; i < 16; i++) {
      const s2 = T.segs[Math.min(T.n - 1, seg.i + i)];
      for (const sp of s2.sprites) { if (sp.gone) continue; const d = Math.abs(sp.off - lx); if (sp.hit && d < 0.4) sc -= sp.hit === 'cone' ? 1 : 3; if (sp.pick && d < 0.2) sc += 0.6; }
    }
    if (sc > bestScore) { bestScore = sc; best = lx; }
  }
  const sp = p.speed / MAX_SPEED;
  const err = best - p.x + seg.curve * sp * sp * 0.045;
  if (err < -0.05) I.left = true; else if (err > 0.05) I.right = true;
  if (Math.abs(seg.curve) >= 5.5 && sp > 0.9) I.gas = false;
  if (Math.abs(p.x) > 0.95 && sp > 0.6) I.gas = false;
  if (p.nitro > 0.5 && Math.abs(curve) < 3 && sp > 0.7) I.nitro = true;
  if (p.nitroOn && Math.abs(curve) < 4) I.nitro = true;
  return I;
}
