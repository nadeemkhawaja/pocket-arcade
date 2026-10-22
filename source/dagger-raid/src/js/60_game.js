/* ==========================================================================
   Game state: flow, stage runtime, spawning, collisions, scoring
   ========================================================================== */

const game = {
  state: 'boot', t: 0, stateT: 0,
  st: STAGES[0], L: null, stageIdx: 0, camX: 0, lockCam: false,
  hero: null, foes: [], shots: [], fx: [], props: [], items: [], caps: [], pops: [], wx: [], sched: [],
  boss: null, bossSeq: null, time: 0, evIdx: 0, spawnT: 0,
  score: 0, hi: 0, lives: 2, nextExtend: 30000, continues: 0, loop: 1,
  chainN: 0, chainT: -9, shake: 0, flashT: 0, slowT: 0,
  diff: { speed: 1, spawn: 1 }, stats: null, stageStats: null,
  demo: false, menu: 0, hits: [], scores: loadScores(), entry: null, idleT: 0
};
game.hi = game.scores[0].s;

const ART_CACHE = {};
function stageArt(st) { if (!ART_CACHE[st.id]) ART_CACHE[st.id] = buildStageArt(st); return ART_CACHE[st.id]; }

function freshStats() { return { kills: 0, captives: 0, specials: 0, deaths: 0, hits: 0, items: 0, time: 0 }; }

function setState(s) {
  if (s !== game.state && s !== 'pause' && game.state !== 'pause') game.fadeT = 0.22;
  game.state = s; game.stateT = 0; game.menu = 0; game.hits = [];
}

/* ---- starting a run ---------------------------------------------------------- */
function newGame(demo) {
  game.demo = !!demo;
  chip.mute = game.demo;
  game.score = 0; game.lives = 2; game.nextExtend = 30000; game.continues = 0; game.loop = 1;
  game.stats = freshStats();
  game.carry = null;
  startStage(0);
}

function startStage(i) {
  game.stageIdx = i;
  game.st = STAGES[i];
  game.L = stageArt(game.st);
  game.camX = 0; game.lockCam = false;
  const keep = game.carry;
  game.hero = makeHero(48);
  if (keep) { game.hero.wpn = keep.wpn; game.hero.ammo = keep.ammo; game.hero.hp = keep.hp; }
  game.foes = []; game.shots = []; game.fx = []; game.items = []; game.caps = []; game.pops = []; game.sched = [];
  game.props = game.st.props.map(makeProp);
  game.boss = null; game.bossSeq = null; game.time = 0; game.evIdx = 0; game.spawnT = 2.2;
  game.chainN = 0; game.chainT = -9; game.shake = 0; game.flashT = 0; game.slowT = 0;
  game.stageStats = freshStats();
  game.dustCol = { jungle: '#c8b088', rail: '#ffffff', refinery: '#f0c27a', citadel: '#9aa0ac' }[game.st.id];
  game.wx = [];
  game.nextBolt = rand(5, 9);
  game.hideHero = false;
  game.downT = 0;
  setState(game.demo ? 'play' : 'intro');
  if (!game.demo) chip.play('start');
}

function beginPlay() {
  setState('play');
  chip.play(game.st.song);
}

/* ---- per frame update by state --------------------------------------------- */
function updateGame(dt, I, P) {
  game.t += dt;
  game.stateT += dt;
  game.shake = Math.max(0, game.shake - dt * 18);
  game.flashT = Math.max(0, game.flashT - dt);
  game.fadeT = Math.max(0, (game.fadeT || 0) - dt);
  game.readyT = Math.max(0, (game.readyT || 0) - dt);
  switch (game.state) {
    case 'intro':
      tickWorld(dt);
      if (game.stateT > 3.4 || (game.stateT > 0.8 && (P.knife || P.jump || P.start))) beginPlay();
      break;
    case 'play': {
      if (game.demo && (P.any)) { exitDemo(); return; }
      let sdt = dt;
      if (game.hitStop > 0) {
        game.hitStop -= dt;
        const h = game.hero;
        if (P.knife) h.kbuf = 0.14; if (P.jump) h.jbuf = 0.12; if (P.special) h.sbuf = 0.12;
        if (P.pause && !game.demo) openPause();
        break;
      }
      if (game.slowT > 0) { game.slowT -= dt; sdt = dt * 0.35; }
      if (game.demo) { const BI = botInput(sdt); updatePlay(sdt, BI, botPressed()); }
      else updatePlay(sdt, I, P);
      if (game.demo && (game.stateT > 34 || (game.hero.dead && game.downT > 1.5))) exitDemo();
      break;
    }
    case 'clear': updateClear(dt, I, P); break;
    case 'continue': updateContinue(dt, I, P); break;
    case 'gameover':
      tickWorld(dt);
      if (game.stateT > 4 || (game.stateT > 1.2 && (P.knife || P.start))) finishRun();
      break;
    case 'ending': updateEnding(dt, I, P); break;
    default: updateMenus(dt, I, P); break;
  }
}

/** Keep effects and weather alive on non-play screens drawn over the world. */
function tickWorld(dt) { if (dt > 0) { updateFx(dt); updateWeather(dt); } }

function updatePlay(dt, I, P) {
  game.time += dt;
  game.stageStats.time += dt;
  const h = game.hero;
  if (P.pause && !game.demo && !h.dead) { openPause(); return; }
  updateHero(h, dt, I, P);
  updateCamera(dt);
  if (!game.autoWalk) h.x = clamp(h.x, game.camX + 8, game.camX + W - 8);
  if (game.boss && game.boss.kind === 'ironclad' && !game.boss.dead) h.x = Math.min(h.x, game.boss.x - 6);
  if (!game.bossSeq) { runEvents(); ambientSpawn(dt); }
  else runSched();
  for (const e of game.foes) updateFoe(e, dt);
  updateBossSeq(dt);
  updateShots(dt);
  resolveHeroAttacks();
  resolveFoeAttacks();
  updateProps(dt);
  updateItems(dt);
  updateFx(dt);
  updateWeather(dt);
  game.foes = game.foes.filter((e) => !e.gone);
  if (h.dead) {
    game.downT += dt;
    if (game.downT > 2.6 && !game.demo) heroLost();
  }
}

function updateCamera(dt) {
  const h = game.hero, maxCam = game.st.len - W;
  if (game.lockCam) return;
  const target = clamp(h.x - 150, 0, maxCam);
  if (target > game.camX) game.camX = Math.min(target, game.camX + 240 * dt);
  if (game.camX >= maxCam - 0.5) {
    game.camX = maxCam; game.lockCam = true;
    if (!game.bossSeq) game.bossSeq = { st: 'warn', t: 0 };
    chip.stopMusic();
  }
}

/* ---- boss sequence: warning, fight, defeat ------------------------------------- */
function updateBossSeq(dt) {
  const S = game.bossSeq;
  if (!S) return;
  S.t += dt;
  if (S.st === 'warn') {
    if (S.t < dt * 1.5) { chip.sfx('alarm'); }
    if (S.t > 2.4) {
      S.st = 'fight'; S.t = 0;
      game.boss = makeBoss(game.st.boss);
      if (!game.hero.dead) chip.play('boss');
    }
  } else if (S.st === 'fight') {
    const b = game.boss;
    if (b) { b.update(dt); if (b.dead) b.deathT += dt; }
  } else if (S.st === 'down') {
    const b = game.boss;
    b.update(dt); b.deathT += dt;
    if (S.t > 3.2 && !game.hero.dead) startClear();
  }
}

function onBossDown(b) {
  game.bossSeq.st = 'down'; game.bossSeq.t = 0;
  game.slowT = 0.8; game.flashT = 0.12;
  addShake(8);
  chip.stopMusic(true);
  chip.sfx('boom', { big: true });
  addScore(BOSS_POINTS[b.kind], b.x, b.y - 60, false);
  game.shots = game.shots.filter((s) => !s.foe);
  for (const e of game.foes) if (e.st !== 'dead') { setSt(e, 'dead'); e.vy = -100; e.vx = rand(-60, 60); e.ground = false; e.deadT = 0; }
}

/* ---- spawning -------------------------------------------------------------- */
function runEvents() {
  const st = game.st, center = game.camX + W / 2;
  while (game.evIdx < st.events.length && center >= st.events[game.evIdx].at) {
    const ev = st.events[game.evIdx++];
    if (ev.wave) for (const [kind, side, lv, delay] of ev.wave) game.sched.push({ t: game.time + delay, kind, side, lv });
    if (ev.e) game.sched.push({ t: game.time, kind: ev.e, side: ev.side, lv: ev.lv, x: ev.x, drop: ev.drop });
    if (ev.dogs) for (let i = 0; i < ev.dogs; i++) game.sched.push({ t: game.time + 0.4 + i * 0.5, kind: 'dog', side: 'R', lv: 0 });
    if (ev.para) for (let i = 0; i < ev.para; i++) game.sched.push({ t: game.time + i * 0.7, kind: 'para', para: true });
  }
  runSched();
}

function runSched() {
  for (const s of game.sched) {
    if (s.done || game.time < s.t) continue;
    if (s.x != null && s.x > game.camX + W + 24) continue;
    s.done = true;
    if (s.x != null && s.x < game.camX - 20) continue;
    doSpawn(s);
  }
  game.sched = game.sched.filter((s) => !s.done);
}

function doSpawn(s) {
  if (game.hero.dead) return;
  if (s.para) {
    const x = game.camX + rand(70, W - 50);
    spawnFoe('para', x, HUD_H + 2, x > game.hero.x ? -1 : 1, { para: true });
    return;
  }
  const y0 = LV_Y[s.lv || 0];
  if (s.x != null) { spawnFoe(s.kind, s.x, y0, -1, { drop: s.drop }); return; }
  let side = s.side === 'L' ? -1 : 1;
  if (side < 0 && game.camX < 24) side = 1;
  const x = side > 0 ? game.camX + W + 12 : game.camX - 12;
  let y = y0;
  if (s.lv && !deckAt(x, y)) y = GROUND_Y;
  spawnFoe(s.kind, x, y, -side, { drop: s.drop });
}

function ambientSpawn(dt) {
  const A = game.st.ambient;
  game.spawnT -= dt * game.diff.spawn;
  if (game.spawnT > 0) return;
  game.spawnT = rand(A.gap[0], A.gap[1]);
  if (game.hero.dead || game.camX + W > game.st.len - 30) return;
  const alive = game.foes.filter((e) => e.st !== 'dead').length;
  if (alive >= A.max) return;
  const kinds = Object.keys(A.mix), total = kinds.reduce((a, k) => a + A.mix[k], 0);
  let r = Math.random() * total, kind = kinds[0];
  for (const k of kinds) { r -= A.mix[k]; if (r <= 0) { kind = k; break; } }
  let side = chance(A.left) && game.camX > 40 ? -1 : 1;
  const x = side > 0 ? game.camX + W + 12 : game.camX - 12;
  let y = GROUND_Y;
  if (kind !== 'dog' && chance(A.deck)) { const ds = game.st.decks.filter((d) => x >= d.x0 && x <= d.x1); if (ds.length) y = pick(ds).y; }
  spawnFoe(kind, x, y, -side, { runner: kind !== 'officer' && chance(A.runner) });
}

/* ---- collisions ---------------------------------------------------------------- */
function resolveHeroAttacks() {
  const h = game.hero;
  const kb = heroKnifeBox(h);
  if (!kb) return;
  const a = h.act;
  for (const e of game.foes) {
    if (e.st === 'dead' || a.hits.includes(e.id)) continue;
    if (boxHit(kb, foeBox(e))) { a.hits.push(e.id); if (killFoe(e, 'knife', h.face, 1)) game.hitStop = Math.max(game.hitStop || 0, 0.035); }
  }
  for (const p of game.props) {
    if (!propSolid(p) || p.t === 'mine' || a.hits.includes(p)) continue;
    if (boxHit(kb, propBox(p))) { a.hits.push(p); hitProp(p, 'knife'); }
  }
  for (const s of game.shots) {
    if (!s.foe || s.k !== 'bullet' || s.gone) continue;
    if (boxHit(kb, box(s.x - 3, s.y - 3, s.x + 3, s.y + 3))) {
      s.gone = true; chip.sfx('tink'); sparks(s.x, s.y, 4, '#ffe27a');
      addScore(50, s.x, s.y - 10, false, true); pop(s.x, s.y - 12, 'PARRY 50', '#9fe8ff');
    }
  }
  if (game.boss && !game.boss.dead && !a.bossHit && game.boss.st !== 'enter') { if (game.boss.knife(kb)) a.bossHit = true; }
}

function resolveFoeAttacks() {
  const h = game.hero;
  if (h.dead || h.inv > 0) return;
  const hb = heroHurt(h);
  for (const e of game.foes) {
    const ab = foeAttackBox(e);
    if (ab && boxHit(ab, hb)) { hurtHero(h, e.face, e.st + ':' + e.kind); return; }
  }
  const b = game.boss;
  if (b && !b.dead && b.touches(hb)) hurtHero(h, sgn(h.x - b.x) || -1, 'boss-' + b.kind + ':' + b.st);
}

/* ---- scoring --------------------------------------------------------------------- */
function addScore(pts, x, y, chain, quiet) {
  let total = pts;
  if (chain) {
    if (game.time - game.chainT < 1.6) game.chainN = Math.min(10, game.chainN + 1); else game.chainN = 1;
    game.chainT = game.time;
    if (game.chainN > 1) total += (game.chainN - 1) * 50;
    if (game.chainN >= 2 && !quiet) pop(x, y - 9, 'CHAIN X' + game.chainN, '#ffd27a');
  }
  game.score += total;
  if (!quiet) pop(x, y, String(total), '#ffffff');
  if (!game.demo && game.score > game.hi) game.hi = game.score;
  while (!game.demo && game.score >= game.nextExtend) {
    game.lives = Math.min(9, game.lives + 1);
    game.nextExtend += 70000;
    chip.sfx('oneup');
    if (game.hero) pop(game.hero.x, game.hero.y - 48, 'EXTEND!', '#4ad16a');
  }
}

/* ---- death, respawn, continue -------------------------------------------------------- */
function onHeroDown() { game.downT = 0; game.stageStats.deaths++; }

function heroLost() {
  if (game.lives > 0) { game.lives--; respawn(); }
  else { setState('continue'); game.contT = 9.99; chip.play('gameover'); }
}

function respawn() {
  const b = game.boss && !game.boss.dead ? game.boss : null;
  let x = game.camX + 40;
  if (b && b.kind !== 'ironclad' && Math.abs(b.x - x) < 90) x = game.camX + W - 40;
  const h = makeHero(x);
  h.inv = 2.6; h.face = x > game.camX + W / 2 ? -1 : 1;
  game.hero = h;
  game.foes = game.foes.filter((e) => e.T.fixed || !onScreen(e.x, 60));
  for (const e of game.foes) e.cd = Math.max(e.cd, 2.2);
  game.shots = []; game.sched = game.sched.filter((s) => s.x != null);
  game.spawnT = 2.4; game.downT = 0; game.chainN = 0; game.readyT = 1.6;
  if (b) chip.play('boss');
  else if (!game.bossSeq) chip.play(game.st.song);
}

function updateContinue(dt, I, P) {
  tickWorld(dt);
  const before = Math.ceil(game.contT);
  game.contT -= dt * (P.special ? 6 : 1);
  if (Math.ceil(game.contT) !== before && game.contT > 0) chip.sfx('tick');
  if (game.stateT > 0.6 && (P.knife || P.jump || P.start || input.tap)) {
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

/* ---- stage clear and tally ------------------------------------------------------------ */
function startClear() {
  setState('clear');
  const h = game.hero;
  h.act = null; h.vx = 0; h.inv = 0;
  chip.play('clear');
  const cages = game.props.filter((p) => p.t === 'cage');
  const freed = cages.filter((p) => p.open).length;
  const S = game.stageStats;
  game.tally = [
    { label: 'CAPTIVES FREED', val: freed + ' / ' + cages.length, pts: freed === cages.length && cages.length ? 5000 : 0, note: freed === cages.length ? 'ALL FREED' : '' },
    { label: 'NO MISS BONUS', val: S.deaths ? 'MISSED ' + S.deaths : 'PERFECT', pts: S.deaths ? 0 : 10000 },
    { label: 'TIME', val: fmtTime(S.time), pts: Math.max(0, Math.round((240 - S.time) / 10)) * 100 },
    { label: 'ENEMIES DOWN', val: String(S.kills), pts: 0 }
  ];
  game.tallyIdx = -1; game.tallyT = 0; game.tallyDone = false;
}

function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + "'" + String(r).padStart(2, '0') + '"'; }

function updateClear(dt, I, P) {
  const h = game.hero, t = game.stateT;
  updateFx(dt); updateWeather(dt); updateProps(dt); updateItems(dt);
  if (game.boss) { game.boss.update(dt); game.boss.deathT += dt; }
  if (t < 1.4) { h.pose = ['victory', 0]; h.vx = 0; }
  else if (t < 3.6) {
    h.pose = null; game.autoWalk = true;
    h.face = 1; h.act = null; h.crouch = false;
    if (h.climb) h.climb = null;
    h.vx = RUN_V * 1.1; actorPhys(h, dt); h.runT += h.vx * dt;
    if (h.x > game.camX + W + 20) game.hideHero = true;
  } else {
    game.autoWalk = false; game.hideHero = true;
    game.tallyT += dt;
    if (!game.tallyDone) {
      if (game.tallyIdx < 0 || game.tallyT > 0.7) {
        game.tallyIdx++; game.tallyT = 0;
        if (game.tallyIdx < game.tally.length) {
          const row = game.tally[game.tallyIdx];
          if (row.pts) { addScore(row.pts, 0, 0, false, true); chip.sfx('pickup'); } else chip.sfx('move');
        } else { game.tallyDone = true; game.tallyT = 0; }
      }
    } else if (game.tallyT > 2.6 || (game.tallyT > 0.5 && (P.knife || P.jump || P.start))) {
      nextStage();
    }
  }
}

function nextStage() {
  const h = game.hero;
  game.carry = { wpn: h.wpn, ammo: h.ammo, hp: h.hp };
  for (const k in game.stageStats) game.stats[k] += game.stageStats[k];
  if (game.stageIdx + 1 < STAGES.length) startStage(game.stageIdx + 1);
  else startEnding();
}

/* ---- ending ------------------------------------------------------------------------------- */
const ENDING_LINES = [
  ['MISSION COMPLETE', '#ffd27a'], ['', ''],
  ['GENERAL KROME HAS FALLEN.', '#ffffff'], ['EVERY CAPTIVE IS ON THE', '#ffffff'], ['ROAD HOME TONIGHT.', '#ffffff'], ['', ''],
  ['THE KNIFE GOES BACK IN ITS', '#c9d6e6'], ['SHEATH. FOR NOW.', '#c9d6e6'], ['', ''], ['', ''],
  ['DAGGER RAID', '#e8392a'], ['AN ORIGINAL ARCADE ADVENTURE', '#9fe8ff'], ['', ''],
  ['THANK YOU FOR PLAYING!', '#4ad16a']
];
function startEnding() {
  setState('ending');
  chip.play('ending');
  game.endScroll = 0;
}
function updateEnding(dt, I, P) {
  game.endScroll += dt * 14;
  updateFx(dt);
  if (game.stateT > 4 && (P.knife || P.start || input.tap)) { if (game.endScroll > ENDING_LINES.length * 12 + 150) { finishRun(); return; } game.endScroll += 40; }
  if (game.endScroll > ENDING_LINES.length * 12 + 520) finishRun();
}

/* ---- high scores ---------------------------------------------------------------------------- */
function qualifies(score) {
  if (game.demo || score <= 0) return -1;
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
  game.scores.splice(E.rank, 0, { n: name, s: game.score, st: Math.min(4, game.stageIdx + 1) });
  game.scores.length = 5;
  store.set('scores', game.scores);
  game.hi = Math.max(game.hi, game.scores[0].s);
  E.done = true; E.doneT = 0;
  chip.sfx('select');
}

/* ---- demo bot: plays the attract demo ------------------------------------------------ */
const BOT = { pressed: {}, jumpCD: 0, stabCD: 0, specCD: 0 };
function botInput(dt) {
  const h = game.hero, I = { left: false, right: false, up: false, down: false, jump: false, knife: false, special: false };
  const P = { jump: false, knife: false, special: false };
  BOT.jumpCD -= dt; BOT.stabCD -= dt; BOT.specCD -= dt;
  BOT.pressed = P;
  if (h.dead) return I;
  if (h.climb) { I.up = true; return I; }
  let near = null, nd = 1e9;
  for (const e of game.foes) {
    if (e.st === 'dead' || (Math.abs(e.y - h.y) > 16 && e.st !== 'kick')) continue;
    const d = Math.abs(e.x - h.x);
    if (d < nd) { nd = d; near = e; }
  }
  let dir = 1;
  if (near && nd < 30) {
    const side = Math.sign(near.x - h.x) || 1;
    if (h.face !== side) dir = side;
    else if (BOT.stabCD <= 0) { P.knife = true; BOT.stabCD = 0.2; }
    if (near.kind === 'dog' || near.st === 'kneel' || near.st === 'snipe') I.down = true;
    if (nd < 18 && h.face === side) dir = 0;
  }
  for (const s of game.shots) {
    if (!s.foe || s.k !== 'bullet' || s.aimed) continue;
    const toward = (s.x - h.x) * -Math.sign(s.vx || 0);
    if (toward > 0 && toward < 50) {
      if (s.y > h.y - 15 && BOT.jumpCD <= 0 && h.ground) { P.jump = true; BOT.jumpCD = 0.7; }
      else if (s.y <= h.y - 15 && h.ground) { I.down = true; dir = 0; }
    }
  }
  if (h.wpn && near && nd < 150 && BOT.specCD <= 0 && Math.sign(near.x - h.x) === h.face) { P.special = true; BOT.specCD = 1.2; }
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

/* ---- weather ------------------------------------------------------------------------------------ */
function updateWeather(dt) {
  const kind = game.st.weather;
  const want = { pollen: 26, snow: 110, dust: 40, rain: 140 }[kind] || 0;
  while (game.wx.length < want) {
    game.wx.push({ x: rand(0, W), y: rand(HUD_H - 20, H), s: Math.random(), ph: rand(0, TAU) });
  }
  for (const p of game.wx) {
    if (kind === 'snow') { p.y += (18 + p.s * 26) * dt; p.x += (-10 + Math.sin(game.t + p.ph) * 8) * dt; }
    else if (kind === 'rain') { p.y += (300 + p.s * 120) * dt; p.x -= 60 * dt; }
    else if (kind === 'dust') { p.x -= (30 + p.s * 40) * dt; p.y += Math.sin(game.t * 2 + p.ph) * 6 * dt; }
    else { p.y += Math.sin(game.t + p.ph) * 6 * dt - 2 * dt; p.x += Math.cos(game.t * 0.7 + p.ph) * 8 * dt; }
    if (p.y > H) { p.y = HUD_H - 4; p.x = rand(0, W + 40); }
    if (p.x < -4) p.x += W + 8;
    if (p.x > W + 4) p.x -= W + 8;
    if (p.y < HUD_H - 30) p.y = H;
  }
  if (kind === 'rain' && game.state === 'play') {
    game.nextBolt -= dt;
    if (game.nextBolt <= 0) { game.nextBolt = rand(7, 13); game.flashT = 0.16; game.bolt = { x: rand(40, W - 40), t: 0 }; setTimeout(() => chip.sfx('thunder'), 380); }
  }
}
