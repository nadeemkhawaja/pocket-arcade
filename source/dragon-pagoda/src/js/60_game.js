/* ==========================================================================
   Game state: flow, floor runtime, spawning, boss arena, scoring
   ========================================================================== */

const DIFFS = {
  novice: { id: 'novice', name: 'NOVICE', dmg: 0.45, foeSpeed: 0.84, spawn: 0.72, tele: 1.5, drain: 0.45, bossHp: 0.7, time: 60, ninja: 0.6,
    blurb: 'GENTLE HITS, SLOW FOES, LONG WARNINGS. LEARN THE ARTS.' },
  disciple: { id: 'disciple', name: 'DISCIPLE', dmg: 0.7, foeSpeed: 0.92, spawn: 0.85, tele: 1.25, drain: 0.65, bossHp: 0.85, time: 30, ninja: 0.85,
    blurb: 'BALANCED. CLEAR WARNINGS AND EXTRA TIME.' },
  master: { id: 'master', name: 'MASTER', dmg: 1, foeSpeed: 1.04, spawn: 1.08, tele: 1, drain: 1, bossHp: 1.15, time: 0, ninja: 1,
    blurb: 'FASTER FOES, TOUGHER GUARDIANS, LESS TIME.' },
  grandmaster: { id: 'grandmaster', name: 'GRANDMASTER', dmg: 1.35, foeSpeed: 1.13, spawn: 1.22, tele: 0.82, drain: 1.3, bossHp: 1.4, time: -15, ninja: 1.35,
    blurb: 'BRUTAL. HEAVY HITS, SHORT WARNINGS, NINJA SWARMS.' }
};

const game = {
  state: 'boot', t: 0, stateT: 0,
  F: FLOORS[0], L: null, floorIdx: 0, camX: 0, arena: null, doorOpen: 0,
  hero: null, foes: [], shots: [], fx: [], items: [], haz: [], pops: [], wx: [], sched: [],
  boss: null, bossSeq: null, time: 0, timeLeft: 150, evIdx: 0, spawnT: 0, hazT: 0,
  score: 0, hi: 0, lives: 2, nextExtend: 50000, continues: 0,
  chainN: 0, chainT: -9, shake: 0, flashT: 0, slowT: 0, hitStop: 0,
  diff: DIFFS.disciple, fighter: 'tao', stats: null, stageStats: null,
  demo: false, menu: 0, hits: [], scores: loadScores(), entry: null, idleT: 0
};
game.hi = game.scores[0].s;

const ART_CACHE = {};
function floorArt(F) {
  if (!ART_CACHE[F.id]) {
    for (const k in ART_CACHE) if (k !== F.id) delete ART_CACHE[k];
    ART_CACHE[F.id] = buildFloorArt(F);
  }
  return ART_CACHE[F.id];
}

function freshStats() { return { kills: 0, deaths: 0, hits: 0, items: 0, time: 0, deflects: 0, waves: 0 }; }

function setState(s) {
  if (s !== game.state && s !== 'pause' && game.state !== 'pause') game.fadeT = 0.22;
  game.state = s; game.stateT = 0; game.menu = 0; game.hits = [];
}

/* ---- starting a run ---------------------------------------------------------- */
function newGame(demo) {
  game.demo = !!demo;
  chip.mute = game.demo;
  game.fighter = demo ? pick(['tao', 'lian']) : settings.fighter;
  game.diff = DIFFS[demo ? 'master' : settings.level] || DIFFS.disciple;
  game.invincible = !demo && !!settings.invincible;
  game.gifts = {};
  game.score = 0; game.lives = 2; game.nextExtend = 50000; game.continues = 0; game.cleared = false;
  game.stats = freshStats();
  game.carry = null;
  game.perks = {}; game.style = 0;
  offerPerks(demo ? 0 : startFloorPick());
}

function startFloor(i) {
  game.floorIdx = i;
  game.floorScore0 = game.score; game.floorCarry0 = game.carry;
  const F = game.F = FLOORS[i];
  game.L = floorArt(F);
  const h = game.hero = makeHero(floorX(F, 44), game.fighter);
  h.face = F.dir;
  if (game.carry) { h.hp = Math.max(game.carry.hp, MAX_HP * 0.5); h.chi = game.carry.chi; }
  game.camX = clamp(h.x - W / 2 + F.dir * 60, 0, F.len - W);
  game.foes = []; game.shots = []; game.fx = []; game.items = []; game.haz = []; game.pops = []; game.sched = [];
  game.boss = null; game.bossSeq = null; game.arena = null; game.doorOpen = 0; game.autoWalk = false; game.hideHero = false; game.freed = 0;
  game.time = 0; game.evIdx = 0; game.spawnT = 2.4; game.hazT = 3;
  game.timeLeft = F.time + game.diff.time + perk('time') * 40;
  if (perk('stars') && game.hero) game.hero.stars = Math.max(game.hero.stars || 0, 8);
  game.chainN = 0; game.chainT = -9; game.shake = 0; game.flashT = 0; game.slowT = 0; game.hitStop = 0;
  game.stageStats = freshStats();
  game.wx = [];
  game.downT = 0; game.timeWarn = 0;
  if (F.vents) F.vents.forEach((p, k) => game.haz.push({ k: 'vent', x: floorX(F, p), st: 'idle', t: 0, off: k * 1.37, dmg: 5, knock: true }));
  setState(game.demo ? 'play' : 'intro');
  if (!game.demo) chip.play('start');
  else chip.play(F.song);
}

function beginPlay() {
  setState('play');
  chip.play(game.F.song);
  game.readyT = 1.2;
}

/* ---- per frame update by state --------------------------------------------- */
function updateGame(dt, I, P) {
  game.t += dt;
  game.stateT += dt;
  game.shake = Math.max(0, game.shake - dt * 18);
  game.flashT = Math.max(0, game.flashT - dt);
  game.fadeT = Math.max(0, (game.fadeT || 0) - dt);
  game.readyT = Math.max(0, (game.readyT || 0) - dt);
  updateStyle(game.state === 'play' && !(game.hitStop > 0) ? dt : 0);
  switch (game.state) {
    case 'perk': updatePerk(dt, I, P); break;
    case 'intro':
      tickWorld(dt);
      if (game.stateT > 3.6 || (game.stateT > 0.8 && (P.punch || P.kick || P.jump || P.start))) beginPlay();
      break;
    case 'play': {
      if (game.demo && P.any) { exitDemo(); return; }
      if (game.hitStop > 0) {
        game.hitStop -= dt;
        const h = game.hero;
        if (P.punch) { h.bufK = 'p'; h.bufT = 0.16; }
        if (P.kick) { h.bufK = 'k'; h.bufT = 0.16; }
        if (P.pause && !game.demo) openPause();
        break;
      }
      let sdt = dt;
      if (game.slowT > 0) { game.slowT -= dt; sdt = dt * 0.35; }
      if (game.demo) { const BI = botInput(sdt); updatePlay(sdt, BI, botPressed()); }
      else updatePlay(sdt, I, P);
      if (game.demo && (game.stateT > 40 || (game.hero.dead && game.downT > 1.5))) exitDemo();
      break;
    }
    case 'clear': updateClear(dt, I, P); break;
    case 'continue': updateContinue(dt, I, P); break;
    case 'gameover':
      tickWorld(dt);
      if (game.stateT > 4 || (game.stateT > 1.2 && (P.punch || P.kick || P.start))) finishRun();
      break;
    case 'ending': updateEnding(dt, I, P); break;
    default: updateMenus(dt, I, P); break;
  }
}

/** Keep effects and weather alive on screens drawn over the world. */
function tickWorld(dt) { if (dt > 0) { updateFx(dt); updateWeather(dt); } }

function updatePlay(dt, I, P) {
  game.time += dt;
  game.stageStats.time += dt;
  const h = game.hero, F = game.F;
  if (P.pause && !game.demo && !h.dead) { openPause(); return; }
  const S = game.bossSeq;
  const cut = S && (S.st === 'down' || S.st === 'exit' || S.st === 'climb' || S.st === 'free');
  if (cut) updateCutscene(dt);
  else updateHero(h, dt, I, P);
  updateCamera(dt);
  // the hero stays on screen, out of the stairwell until the guardian falls, and inside the arena
  if (!cut) {
    const xBefore = h.x;
    h.x = clamp(h.x, game.camX + 8, game.camX + W - 8);
    h.x = clamp(h.x, 10, F.len - 10);
    const sx = stairX(F);
    if (F.dir > 0) h.x = Math.min(h.x, sx - 36); else h.x = Math.max(h.x, sx + 36);
    if (game.arena) h.x = clamp(h.x, game.arena.x0, game.arena.x1);
    heroWallContact(h, xBefore, dt);
  }
  if (!game.bossSeq) { runEvents(); ambientSpawn(dt); checkArena(); }
  else runSched();
  for (const e of game.foes) updateFoe(e, dt);
  updateBossSeq(dt);
  updateShots(dt);
  updateHazards(dt);
  resolveHeroAttacks();
  resolveFoeAttacks();
  updateItems(dt);
  updateFx(dt);
  updateWeather(dt);
  game.foes = game.foes.filter((e) => !e.gone);
  // the floor timer
  if (!h.dead && !cut && !game.demo) {
    const before = Math.ceil(game.timeLeft);
    if (!game.invincible) game.timeLeft = Math.max(0, game.timeLeft - dt);
    if (game.timeLeft < 20 && Math.ceil(game.timeLeft) !== before) chip.sfx('tick');
    if (game.timeLeft <= 0) { pop(h.x, h.y - 60, 'TIME UP!', '#ff5a4a'); releaseGrabbers(h, false); killHero(h, -h.face); }
  }
  if (h.dead) {
    game.downT += dt;
    if (game.downT > 2.6 && !game.demo) heroLost();
  }
}

function heroProgress(h) { const F = game.F; return F.dir > 0 ? h.x : F.len - h.x; }

function updateCamera(dt) {
  const h = game.hero, F = game.F, maxCam = F.len - W;
  let target;
  if (game.arena) target = arenaX0(F);
  else target = clamp(h.x - W / 2 + F.dir * 40, 0, maxCam);
  const d = target - game.camX;
  game.camX += clamp(d * Math.min(1, dt * 5), -260 * dt, 260 * dt);
  if (Math.abs(d) < 0.5) game.camX = target;
  game.camX = clamp(game.camX, 0, maxCam);
}

/* ---- the guardian's arena ---------------------------------------------------------------- */
function checkArena() {
  const h = game.hero, F = game.F;
  if (game.arena || h.dead || heroProgress(h) < F.len - W + 70) return;
  const x0 = arenaX0(F), sx = stairX(F);
  game.arena = F.dir > 0 ? { x0: x0 + 10, x1: sx - 36 } : { x0: sx + 36, x1: x0 + W - 10 };
  game.bossSeq = { st: 'gong', t: 0 };
  game.sched = [];
  chip.stopMusic();
  chip.sfx('gong');
  // the hall's fighters scatter when the guardian arrives
  for (const e of game.foes) if (foeAlive(e) && e.st !== 'grab') { killFoe(e, sgn(e.x - h.x) || 1, 60, true); }
  for (const z of game.haz) if (z.k === 'wisp' || z.k === 'vase' || z.k === 'bolt') z.gone = true;
}

function updateBossSeq(dt) {
  const S = game.bossSeq;
  if (!S) return;
  S.t += dt;
  if (S.st === 'gong') {
    if (S.t > 0.9 && !game.boss) { game.boss = makeBoss(game.F.boss); }
    if (game.boss) game.boss.update(dt);
    if (S.t > 2.6) { S.st = 'fight'; S.t = 0; if (!game.hero.dead) chip.play(game.F.boss === 'abbot' ? 'final' : 'boss'); }
  } else if (S.st === 'fight') {
    const b = game.boss;
    if (b) b.update(dt);
  } else if (game.boss) game.boss.update(dt);
}

function onBossDown(b) {
  game.bossSeq.st = 'down'; game.bossSeq.t = 0;
  game.slowT = 0.9; game.flashT = 0.16;
  addShake(8);
  chip.stopMusic(true);
  chip.sfx('bossko');
  addScore(b.D.pts, b.x, b.y - 70, false);
  pop(b.x, b.y - 82, 'K.O.!', '#ffd27a');
  game.shots = game.shots.filter((s) => !s.foe);
  const h = game.hero;
  if (h.grabbers.length) releaseGrabbers(h, true);
  for (const e of game.foes) if (foeAlive(e)) killFoe(e, sgn(e.x - h.x) || 1, 80, true);
}

/** After the guardian falls: the stair door opens and the hero climbs (or frees the Grandmaster). */
function updateCutscene(dt) {
  const S = game.bossSeq, h = game.hero, F = game.F, sx = stairX(F);
  h.act = null; h.crouch = false; h.inv = 1;
  heroPhys(h, dt);
  if (S.st === 'down') {
    h.vx = 0;
    if (h.ground) h.pose = S.t > 0.8 ? ['victory', 0] : null;
    if (S.t > 2.6) { S.st = 'exit'; S.t = 0; h.pose = null; if (!F.outdoor) chip.sfx('door'); }
  } else if (S.st === 'exit') {
    game.doorOpen = Math.min(1, game.doorOpen + dt * 1.2);
    if (S.t < 0.6 && !F.outdoor) return;
    const goal = F.outdoor ? sx - F.dir * 16 : sx - F.dir * 26;
    const d = goal - h.x;
    h.face = sgn(d) || F.dir;
    if (Math.abs(d) > 2) { h.x += sgn(d) * Math.min(Math.abs(d), 80 * dt); h.runT += 80 * dt; h.vx = sgn(d) * 80; }
    else {
      h.vx = 0; h.x = goal; h.face = F.dir;
      S.st = F.outdoor ? 'free' : 'climb'; S.t = 0;
      if (F.outdoor) { chip.sfx('free'); sparks(sx, GROUND_Y - 28, 12, '#ffd27a'); }
    }
    h.vx = 0;
    if (Math.abs(d) > 2) h.pose = ['walk', (h.runT / 6) % 8];
  } else if (S.st === 'climb') {
    h.pose = ['climb', (S.t * 8) % 4];
    h.x += F.dir * 28 * dt; h.y -= 52 * dt;
    if (Math.floor(S.t * 4) !== Math.floor((S.t - dt) * 4)) chip.sfx('step');
    if (S.t > 1.7) { game.hideHero = true; startClear(); }
  } else if (S.st === 'free') {
    h.pose = S.t < 1.6 ? ['idle', 0] : ['victory', 0];
    game.freed = Math.min(1, S.t / 1.2);
    if (S.t > 4.2) startEnding();
  }
}

/* ---- spawning -------------------------------------------------------------- */
function runEvents() {
  const F = game.F, prog = heroProgress(game.hero) + W * 0.25;
  while (game.evIdx < F.events.length && prog >= F.events[game.evIdx].at) {
    const ev = F.events[game.evIdx++];
    if (ev.wave) for (const [kind, side, delay] of ev.wave) game.sched.push({ t: game.time + delay, kind, side });
    if (ev.e) game.sched.push({ t: game.time, kind: ev.e, side: ev.side || 'F' });
  }
  runSched();
}

function runSched() {
  for (const s of game.sched) {
    if (s.done || game.time < s.t) continue;
    s.done = true;
    doSpawn(s.kind, s.side);
  }
  game.sched = game.sched.filter((s) => !s.done);
}

function doSpawn(kind, side) {
  const h = game.hero, F = game.F;
  if (h.dead || game.arena) return;
  if (kind === 'ninja') {
    const s = chance(0.65) ? F.dir : -F.dir;
    let x = h.x + s * rand(60, 90);
    if (x < game.camX + 16 || x > game.camX + W - 16) x = h.x - s * rand(60, 90);
    spawnFoe('ninja', clamp(x, game.camX + 16, game.camX + W - 16), -s);
    return;
  }
  let dir = side === 'B' ? -F.dir : F.dir;
  const x = dir > 0 ? game.camX + W + 14 : game.camX - 14;
  if (x < 4 || x > F.len - 4) { dir = -dir; }
  const sx = dir > 0 ? game.camX + W + 14 : game.camX - 14;
  spawnFoe(kind, sx, -dir);
}

function ambientSpawn(dt) {
  const F = game.F;
  game.spawnT -= dt * game.diff.spawn;
  if (game.spawnT > 0) return;
  game.spawnT = rand(F.gap[0], F.gap[1]);
  if (game.hero.dead || heroProgress(game.hero) > F.len - W - 40) return;
  const alive = game.foes.filter((e) => foeAlive(e)).length;
  if (alive >= F.max) return;
  const kind = pickWeighted(F.mix);
  doSpawn(kind, chance(F.behind) ? 'B' : 'F');
}

/* ---- scoring --------------------------------------------------------------------- */
function addScore(pts, x, y, chain, quiet) {
  let total = pts;
  if (chain) {
    if (game.time - game.chainT < 1.5) game.chainN = Math.min(10, game.chainN + 1); else game.chainN = 1;
    game.chainT = game.time;
    if (game.chainN > 1) total += (game.chainN - 1) * 50;
    if (game.chainN >= 3 && !quiet) pop(x, y - 9, 'CHAIN X' + game.chainN, '#ffd27a');
    total = Math.round((total * RANK_MULT[styleRank()]) / 10) * 10;
  }
  game.score += total;
  if (!quiet) pop(x, y, String(total), '#ffffff');
  if (!game.demo && game.score > game.hi) game.hi = game.score;
  while (!game.demo && game.score >= game.nextExtend) {
    game.lives = Math.min(9, game.lives + 1);
    game.nextExtend += 100000;
    chip.sfx('oneup');
    if (game.hero) pop(game.hero.x, game.hero.y - 60, 'EXTRA LIFE!', '#4ad16a');
  }
}

/* ---- death, respawn, continue -------------------------------------------------------- */
function onHeroDown() { game.downT = 0; game.stageStats.deaths++; }

function heroLost() {
  if (game.lives > 0) { game.lives--; respawn(); }
  else { setState('continue'); game.contT = 9.99; chip.play('gameover'); }
}

function respawn() {
  const F = game.F, old = game.hero;
  const b = game.boss && !game.boss.dead ? game.boss : null;
  let x = clamp(old.x, game.camX + 30, game.camX + W - 30);
  if (b) x = F.dir > 0 ? game.arena.x0 + 16 : game.arena.x1 - 16;
  const h = makeHero(x, game.fighter);
  h.chi = old.chi;
  h.inv = 2.6; h.face = F.dir;
  if (b) { h.face = sgn(b.x - x) || F.dir; b.x = F.dir > 0 ? game.arena.x1 - 10 : game.arena.x0 + 10; bossSt(b, 'taunt'); b.clones = []; b.cd = 1.2; }
  game.hero = h;
  for (const e of game.foes) if (foeAlive(e) && onScreen(e.x, 10)) { e.gone = true; smoke(e.x, e.y - 20, 4); }
  game.shots = []; game.sched = [];
  game.haz = game.haz.filter((z) => z.k === 'vent');
  game.spawnT = 2.4; game.downT = 0; game.chainN = 0; game.readyT = 1.6;
  if (game.timeLeft < 60) game.timeLeft = 60;
  if (b) chip.play(F.boss === 'abbot' ? 'final' : 'boss');
  else chip.play(F.song);
}

function updateContinue(dt, I, P) {
  tickWorld(dt);
  const before = Math.ceil(game.contT);
  game.contT -= dt * (P.special ? 6 : 1);
  if (Math.ceil(game.contT) !== before && game.contT > 0) chip.sfx('tick');
  if (game.stateT > 0.6 && (P.punch || P.kick || P.jump || P.start || input.tap)) {
    chip.sfx('coin');
    game.continues++; game.lives = 2;
    setState('play');
    respawn();
    return;
  }
  if (game.contT <= 0) { setState('gameover'); chip.stopMusic(); }
}

function finishRun() {
  chip.stopMusic();
  const rank = qualifies(game.score);
  if (rank >= 0) startEntry(rank);
  else { setState('title'); chip.play('title'); }
}

/* ---- floor clear and tally ------------------------------------------------------------ */
function startClear() {
  setState('clear');
  if (game.stageStats.hits === 0 && game.stageStats.deaths === 0) award('flawless');
  if (game.floorIdx === 0) award('floor1');
  if (game.floorIdx === 2) award('floor3');
  if (game.floorIdx + 1 < FLOORS.length) reachFloor(game.floorIdx + 1);
  chip.play('clear');
  const S = game.stageStats, h = game.hero;
  const t = Math.floor(game.timeLeft);
  game.tally = [
    { label: 'TIME LEFT', val: String(t), pts: t * 50 },
    { label: 'VITALITY', val: Math.ceil(h.hp) + ' / ' + MAX_HP, pts: Math.ceil(h.hp) * 200 },
    { label: 'UNTOUCHED', val: S.hits ? 'HIT ' + S.hits + 'X' : 'PERFECT', pts: S.hits ? 0 : 10000 },
    { label: 'DEFLECTS', val: String(S.deflects), pts: S.deflects * 500 },
    { label: 'FIGHTERS DOWN', val: String(S.kills), pts: 0 }
  ];
  game.tallyIdx = -1; game.tallyT = 0; game.tallyDone = false;
}

function updateClear(dt, I, P) {
  tickWorld(dt);
  game.tallyT += dt;
  if (game.stateT < 0.6) return;
  if (!game.tallyDone) {
    if (game.tallyIdx < 0 || game.tallyT > 0.6) {
      game.tallyIdx++; game.tallyT = 0;
      if (game.tallyIdx < game.tally.length) {
        const row = game.tally[game.tallyIdx];
        if (row.pts) { addScore(row.pts, 0, 0, false, true); chip.sfx('pickup'); } else chip.sfx('move');
      } else { game.tallyDone = true; game.tallyT = 0; }
    }
  } else if (game.tallyT > 2.8 || (game.tallyT > 0.5 && (P.punch || P.kick || P.jump || P.start || input.tap))) {
    nextFloor();
  }
}

function nextFloor() {
  const h = game.hero;
  game.carry = { hp: h.hp, chi: h.chi };
  for (const k in game.stageStats) game.stats[k] += game.stageStats[k];
  game.hideHero = false;
  if (game.floorIdx + 1 < FLOORS.length) offerPerks(game.floorIdx + 1);
  else { award('master'); if (game.diff.id === 'grandmaster') award('grand'); startEnding(); }
}

/* ---- ending ------------------------------------------------------------------------------- */
const ENDING_LINES = [
  ['THE PAGODA IS FREE', '#ffd27a'], ['', ''],
  ['THE SHADOW ABBOT KNEELS', '#ffffff'], ['AND FADES WITH THE STORM.', '#ffffff'], ['', ''],
  ['GRANDMASTER HU BOWS TO', '#ffffff'], ['HIS STUDENT, THEN SMILES:', '#ffffff'], ['"NOW YOU TEACH ME."', '#9fe8ff'], ['', ''], ['', ''],
  ['DRAGON PAGODA', '#e8392a'], ['AN ORIGINAL ARCADE ADVENTURE', '#9fe8ff'], ['', ''],
  ['THANK YOU FOR PLAYING!', '#4ad16a']
];
function startEnding() {
  game.cleared = true;
  for (const k in game.stageStats) game.stats[k] += game.stageStats[k];
  game.stageStats = freshStats();
  setState('ending');
  chip.play('ending');
  game.endScroll = 0;
}
function updateEnding(dt, I, P) {
  game.endScroll += dt * 14;
  updateFx(dt); updateWeather(dt);
  const span = ENDING_LINES.length * 12;
  if (game.stateT > 4 && (P.punch || P.kick || P.start || input.tap)) { if (game.endScroll > span + 150) { finishRun(); return; } game.endScroll += 40; }
  if (game.endScroll > span + 520) finishRun();
}

/* ---- high scores ---------------------------------------------------------------------------- */
function qualifies(score) {
  if (game.demo || game.invincible || score <= 0) return -1;
  for (let i = 0; i < game.scores.length; i++) if (score > game.scores[i].s) return i;
  return -1;
}
const ENTRY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.- ';
function startEntry(rank) {
  setState('entry');
  const last = store.get('initials', 'AAA');
  game.entry = { rank, chars: last.split('').map((c) => Math.max(0, ENTRY_CHARS.indexOf(c))), pos: 0, done: false, t: 30 };
  chip.play('entry');
}
function commitEntry() {
  const E = game.entry;
  const name = E.chars.map((i) => ENTRY_CHARS[i]).join('');
  store.set('initials', name);
  const reached = game.cleared ? 6 : game.floorIdx + 1;
  game.scores.splice(E.rank, 0, { n: name, s: game.score, st: reached });
  game.scores.length = 5;
  store.set('scores', game.scores);
  game.hi = Math.max(game.hi, game.scores[0].s);
  E.done = true; E.doneT = 0;
  chip.sfx('select');
}

/* ---- demo bot: plays the attract demo (and the automated tests) ------------------------- */
const BOT = { pressed: {}, atkCD: 0, jumpCD: 0, mash: 0, hold: 0, holdDown: false };
function botInput(dt) {
  const h = game.hero, F = game.F;
  const I = { left: false, right: false, up: false, down: false };
  const P = { punch: false, kick: false, jump: false, up: false, special: false, left: false, right: false };
  BOT.atkCD -= dt; BOT.jumpCD -= dt; BOT.hold -= dt;
  BOT.pressed = P;
  if (h.dead || h.pose) return I;
  if (h.grabbers.length) {
    BOT.mash = (BOT.mash + 1) % 4;
    if (BOT.mash === 0) P.left = true; else if (BOT.mash === 2) P.right = true;
    I.left = P.left; I.right = P.right;
    return I;
  }
  let dir = F.dir;
  // incoming projectiles and hazards
  let duck = false, hop = false;
  for (const s of game.shots) {
    if (!s.foe || s.gone) continue;
    const toward = (s.x - h.x) * -sgn(s.vx || 1);
    const near = Math.abs(s.x - h.x);
    if (s.k === 'shock' || s.k === 'fire') { if (toward > 0 && near < 56) hop = true; continue; }
    if (toward > 0 && near < 60) { if (s.y < GROUND_Y - 18) duck = true; else hop = true; }
    if (s.k === 'fan' && near < 34 && s.y < GROUND_Y - 18) duck = true;
  }
  for (const z of game.haz) {
    if (z.k === 'vent' && z.st !== 'idle' && Math.abs(z.x - (h.x + dir * 18)) < 26) dir = 0;
    if (z.k === 'bolt' && z.st === 'warn' && Math.abs(z.x - h.x) < 18) dir = -sgn(z.x - h.x) || -F.dir;
  }
  // nearest foe in reach
  let near = null, nd = 1e9;
  for (const e of game.foes) {
    if (!foeHittable(e)) continue;
    const d = Math.abs(e.x - h.x);
    if (d < nd) { nd = d; near = e; }
  }
  const b = game.boss;
  if (b && !b.dead && b.hittable() && (!near || Math.abs(b.x - h.x) < nd)) { near = { boss: true, x: b.x, kind: b.kind, b }; nd = Math.abs(b.x - h.x); }
  if (b && !b.dead && b.kind === 'ox' && b.st === 'charge' && Math.abs(b.x - h.x) < 70 && sgn(h.x - b.x) === b.face) hop = true;
  if (b && !b.dead && b.kind === 'fan' && b.st === 'dash' && Math.abs(b.x - h.x) < 60) hop = true;
  if (b && !b.dead && b.kind === 'spear' && b.st === 'spin' && Math.abs(b.x - h.x) < 50 && b.t > b.wind - 0.15) hop = true;
  if (b && !b.dead && b.kind === 'spear' && b.st === 'thrustH' && b.t > b.wind - 0.15) duck = true;
  if (b && !b.dead && b.kind === 'spear' && b.st === 'thrustL' && b.t > b.wind - 0.2 && Math.abs(b.x - h.x) < 60) hop = true;
  if (b && !b.dead && b.kind === 'abbot' && b.st === 'counter') { dir = 0; near = null; }
  if (h.chi >= MAX_CHI && h.ground && (game.foes.filter((e) => foeAlive(e) && Math.abs(e.x - h.x) < 120).length >= 2 || (b && !b.dead && b.hittable()))) P.special = true;
  if (near) {
    const side = sgn(near.x - h.x) || h.face;
    const reach = near.boss ? 26 : near.kind === 'monkey' || near.kind === 'snake' ? 26 : 24;
    if (nd < reach + 6) {
      dir = side === h.face ? 0 : side;
      if (BOT.atkCD <= 0 && h.ground) {
        const low = near.kind === 'snake' || near.kind === 'monk' || (near.kind === 'monkey' && near.y === GROUND_Y);
        if (low) { I.down = true; P.kick = near.kind !== 'snake'; P.punch = near.kind === 'snake'; }
        else if (nd < 20) P.punch = true; else P.kick = true;
        if (side !== h.face) { I.left = side < 0; I.right = side > 0; }
        BOT.atkCD = 0.2;
      }
    } else if (near.boss && b.kind === 'mirror' && b.clones.length) {
      dir = side;
    } else dir = (side === F.dir || nd < 90) ? side : F.dir;
  }
  if (hop && h.ground && BOT.jumpCD <= 0) { P.jump = true; BOT.jumpCD = 0.6; }
  else if (duck && h.ground) { I.down = true; dir = 0; }
  if (!h.ground && near && nd < 34 && BOT.atkCD <= 0) { P.kick = true; BOT.atkCD = 0.3; }
  if (dir > 0) I.right = true; else if (dir < 0) I.left = true;
  return I;
}
function botPressed() { return BOT.pressed; }

function startDemo() {
  newGame(true);
  game.cheat = true;
  setState('play');
  game.stateT = 0;
}
function exitDemo() {
  game.demo = false; chip.mute = false; game.cheat = false;
  chip.stopMusic();
  setState('title');
  game.idleT = 0;
}

/* ---- ambience ------------------------------------------------------------------------------------ */
function updateWeather(dt) {
  const kind = game.F.weather;
  const want = { motes: 28, embers: 44, fireflies: 22, storm: 120 }[kind] || 0;
  if (game.wx.length > want) game.wx.length = want;
  while (game.wx.length < want) game.wx.push({ x: rand(0, W), y: rand(HUD_H, H), s: Math.random(), ph: rand(0, TAU) });
  for (const p of game.wx) {
    if (kind === 'embers') { p.y -= (16 + p.s * 30) * dt; p.x += Math.sin(game.t * 2 + p.ph) * 10 * dt; }
    else if (kind === 'storm') { p.y += (280 + p.s * 120) * dt; p.x -= (70 + p.s * 30) * dt; }
    else if (kind === 'fireflies') { p.x += Math.cos(game.t * 0.6 + p.ph) * 12 * dt; p.y += Math.sin(game.t * 0.9 + p.ph * 2) * 10 * dt; }
    else { p.y += (Math.sin(game.t * 0.8 + p.ph) * 4 + 3) * dt; p.x += Math.cos(game.t * 0.5 + p.ph) * 6 * dt; }
    if (p.y > H) { p.y = HUD_H; p.x = rand(0, W + 60); }
    if (p.y < HUD_H - 2) { p.y = H; p.x = rand(0, W); }
    if (p.x < -4) p.x += W + 8;
    if (p.x > W + 4) p.x -= W + 8;
  }
  if (kind === 'storm' && game.state === 'play') {
    game.nextFlash = (game.nextFlash || 6) - dt;
    if (game.nextFlash <= 0) { game.nextFlash = rand(6, 11); game.skyFlash = 0.3; setTimeout(() => chip.sfx('rumble'), 300); }
  }
  game.skyFlash = Math.max(0, (game.skyFlash || 0) - dt);
}
