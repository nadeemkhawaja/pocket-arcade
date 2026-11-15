/* ==========================================================================
   Game flow: states, the clock, scoring, medals and the results screens.
   ========================================================================== */

const MEDALS = [
  { id: 'breeze', name: 'SEA BREEZE', how: 'REACH THE GOAL AT SUNSET BAY' },
  { id: 'giant', name: 'GIANT KILLER', how: 'BEAT A RIVAL TO THE LINE' },
  { id: 'unrivaled', name: 'UNRIVALED', how: 'BEAT ALL FIVE RIVALS IN ONE RUN' },
  { id: 'needle', name: 'THREAD THE NEEDLE', how: 'CHAIN 10 NEAR MISSES' },
  { id: 'sideways', name: 'SIDEWAYS', how: 'HOLD ONE DRIFT FOR 3 SECONDS' },
  { id: 'redline', name: 'REDLINE', how: 'REACH 350 KM/H ON NITRO' },
  { id: 'clean', name: 'CLEAN RUN', how: 'FINISH A STAGE WITHOUT A CRASH' },
  { id: 'gold', name: 'GOLD RUSH', how: 'COLLECT 150 COINS IN ONE RUN' },
  { id: 'shark', name: 'ROAD SHARK', how: 'OVERTAKE 120 CARS IN ONE RUN' },
  { id: 'coast', name: 'COAST TO COAST', how: 'FINISH ALL FIVE STAGES' },
  { id: 'credit', name: 'ONE CREDIT', how: 'FINISH THE GAME WITHOUT CONTINUING' },
  { id: 'legend', name: 'LEGEND', how: 'FINISH THE GAME ON LEGEND' }
];
const PROG = Object.assign({ ach: {}, reached: 0, runs: 0 }, store.get('prog', {}));
function saveProg() { store.set('prog', PROG); }
function medalCount() { return MEDALS.filter((m) => PROG.ach[m.id]).length; }
function award(id) {
  if (PROG.ach[id] || game.demo) return;
  PROG.ach[id] = 1; saveProg();
  const m = MEDALS.find((x) => x.id === id);
  if (m) { game.medalQ.push(m); chip.sfx('medal'); }
}

const game = {
  state: 'boot', t: 0, stateT: 0, menu: 0, hits: [], toast: null, medalQ: [], medalT: 0, pops: [], fx: [], carSegs: [],
  scores: loadScores(), hi: 0, demo: false, auto: false, T: null, p: null, rival: null, diff: DIFFS.sport,
  stage: 0, score: 0, time: 0, pos: 0, dist: 0, count: 0, chain: 0, chainT: 0, coins: 0, passes: 0, shake: 0, flash: 0, punch: 0, fxT: 0,
  credits: 3, stats: {}, tally: null, entry: null, sky: 0, skyFar: 0, timeFlash: 0, idleT: 0, page: 0, optFrom: 'title'
};
game.hi = game.scores[0].s;

function setState(s) { game.state = s; game.stateT = 0; }
function addScore(n) { if (game.demo) return; game.score += n * game.diff.score; if (game.score > game.hi) game.hi = game.score; }
function blankStats() { return { top: 0, near: 0, bestChain: 0, passes: 0, coins: 0, crashes: 0, hits: 0, drifts: 0, driftT: 0, nitroT: 0, rivals: 0, time: 0, continues: 0 }; }

function newGame(demo) {
  const g = game;
  g.demo = !!demo; g.auto = !!demo;
  g.diff = DIFFS[settings.level] || DIFFS.sport;
  g.score = 0; g.credits = 3; g.stats = blankStats(); g.coins = 0; g.passes = 0; g.medalQ = [];
  if (!demo) { PROG.runs++; saveProg(); }
  startStage(demo ? Math.floor(Math.random() * STAGES.length) : 0, 0);
}

/** Load a stage and put the car on the grid. carry is the time left over from the stage before. */
function startStage(si, carry) {
  const g = game;
  g.stage = si; g.stageScore = g.score;
  g.T = buildTrack(si, g.diff);
  g.p = newPlayer(settings.car);
  if (g.demo) g.p.car = CARS[CAR_ORDER[Math.floor(Math.random() * 3)]];
  g.rival = newRival(g.T, g.diff);
  g.pos = (g.T.start - 9) * SEG - PLAYER_Z; g.dist = 0;
  g.time = Math.min(99, (carry || 0) + g.T.st.t0 * g.diff.time);
  g.count = g.demo ? 0 : 3.6; g.lastBeep = 4;
  g.checked = false; g.finished = false; g.timeUp = false; g.rivalWon = false; g.rivalBeat = false;
  g.chain = 0; g.chainT = 0; g.stageCrash = 0; g.playT = 0; g.stageT = 0;
  g.fx = []; g.pops = []; g.carSegs = []; g.shake = 0; g.flash = 0; g.punch = 0; g.sky = 0; g.skyFar = 0; g.tally = null; g.warnT = 0;
  if (g.demo) { g.p.speed = MAX_SPEED * 0.8; g.pos = (40 + Math.random() * 300) * SEG; g.rival.z = g.pos + 20 * SEG; g.rival.speed = MAX_SPEED * 0.8; g.time = 99; setState('title'); return; }
  setState('intro');
  chip.stopMusic();
}

function beginPlay() { setState('play'); chip.play(game.T.st.song); }

function passCheckpoint() {
  const g = game;
  g.checked = true;
  const add = g.T.st.t1 * g.diff.time;
  g.time = Math.min(99, g.time + add); g.timeFlash = 1.2;
  if (!g.demo) { chip.sfx('check'); popText('CHECKPOINT  +' + Math.round(add) + ' SEC', '#ffd27a'); addScore(5000); g.banner = { s: 'CHECKPOINT', sub: 'TIME EXTENDED', t: 0 }; }
}

function finishStage() {
  const g = game;
  g.finished = true;
  if (g.demo) return;
  g.rivalBeat = !g.rivalWon;
  chip.stopMusic(); chip.sfx('check'); chip.play('clear');
  const timeBonus = Math.round(g.time * 10) * 200, rivalBonus = g.rivalBeat ? 25000 : 0, cleanBonus = g.stageCrash === 0 ? 10000 : 0;
  g.tally = { time: g.time, timeBonus, rivalBonus, cleanBonus, coins: g.coins, t: 0, shown: 0, stageT: g.stageT };
  addScore(timeBonus + rivalBonus + cleanBonus);
  if (g.rivalBeat) { g.stats.rivals++; award('giant'); if (g.stats.rivals >= 5) award('unrivaled'); }
  if (g.stageCrash === 0) award('clean');
  if (g.stage === 0) award('breeze');
  PROG.reached = Math.max(PROG.reached, Math.min(STAGES.length - 1, g.stage + 1)); saveProg();
  g.stats.time += g.stageT;
  setState('clear');
}

function nextStage() {
  const g = game;
  if (g.stage + 1 >= STAGES.length) {
    award('coast'); if (g.stats.continues === 0) award('credit'); if (g.diff.id === 'legend') award('legend');
    chip.play('ending'); setState('ending'); return;
  }
  const carry = Math.min(20, g.time * 0.5);
  startStage(g.stage + 1, carry);
}

function qualifies(score) { return score > game.scores[4].s; }
function endRun() {
  const g = game;
  if (qualifies(g.score) && !g.demo) { g.entry = { name: ['A', 'A', 'A'], i: 0, done: false, rank: -1 }; setState('entry'); chip.play('ending'); }
  else { setState('scores'); g.attract = false; chip.play('title'); }
}
function submitEntry() {
  const g = game, e = g.entry;
  const row = { n: e.name.join(''), s: Math.floor(g.score), st: g.stage + (g.state === 'entry' && g.cleared ? 1 : 0) + 1 };
  row.st = Math.min(5, g.cleared ? 5 : g.stage + 1);
  g.scores.push(row); g.scores.sort((a, b) => b.s - a.s); g.scores.length = 5;
  e.rank = g.scores.indexOf(row); e.done = true;
  store.set('scores', g.scores); g.hi = g.scores[0].s;
  setState('scores'); g.attract = false; chip.play('title');
}

function openPause() { if (game.state === 'play' && !game.demo) { setState('pause'); game.menu = 0; chip.engine(null); if (chip.ctx) chip.musicBus.gain.setTargetAtTime(0.0001, chip.ctx.currentTime, 0.05); } }
function closePause() { setState('play'); chip.applyVolumes(); }

/** Advance the race by one step. */
function updateRace(dt, I) {
  const g = game, p = g.p;
  if (g.count > 0) {
    g.count -= dt;
    const n = Math.ceil(g.count - 0.6);
    if (n < g.lastBeep && n >= 0) { g.lastBeep = n; chip.sfx(n === 0 ? 'go' : 'count'); }
  } else if (!g.finished) {
    g.playT += dt; g.stageT += dt;
    if (!g.timeUp && !g.demo) {
      g.time -= dt;
      if (g.time <= 10 && g.time > 0) { g.warnT -= dt; if (g.warnT <= 0) { g.warnT = g.time < 5 ? 0.5 : 1; chip.sfx('warn'); } }
      if (g.time <= 0) { g.time = 0; g.timeUp = true; p.nitroOn = false; p.drift = 0; popText('TIME UP', '#ff5a5a'); chip.stopMusic(); }
    }
  }
  if (g.chainT > 0) { g.chainT -= dt; if (g.chainT <= 0) g.chain = 0; }
  updatePlayer(dt, g.auto ? botInput() : I);
  updateTraffic(dt);
  updateRival(dt);
  updateFx(dt);
  const seg = segAt(g.T, g.pos + PLAYER_Z), sp = p.speed / MAX_SPEED;
  g.sky += seg.curve * sp * dt * 0.012; g.skyFar += seg.curve * sp * dt * 0.006;
  g.shake = Math.max(0, g.shake - dt * 22); g.flash = Math.max(0, g.flash - dt); g.punch = Math.max(0, g.punch - dt * 0.12);
  g.timeFlash = Math.max(0, g.timeFlash - dt);
  if (g.banner) { g.banner.t += dt; if (g.banner.t > 2) g.banner = null; }
  if (g.timeUp && p.speed < MAX_SPEED * 0.03 && g.state === 'play') {
    chip.engine(null);
    if (g.credits > 0) { setState('continue'); g.contT = 9.99; chip.play('over'); }
    else { setState('gameover'); chip.play('over'); }
  }
  if (g.pos > (g.T.n - 30) * SEG) g.pos = (g.T.n - 30) * SEG;
  if (!g.demo || g.state === 'title') chip.engine(g.demo ? null : { on: true, speed: sp, gas: p.gas, nitro: p.nitroOn, skid: p.skid, dirt: p.off ? 1 : 0 });
  if (g.demo && (g.pos > (g.T.goal - 60) * SEG)) startStage((g.stage + 1) % STAGES.length, 0);
}

function useContinue() {
  const g = game;
  g.credits--; g.stats.continues++;
  g.time = 30 * g.diff.time; g.timeUp = false; g.count = 2.6; g.lastBeep = 3; g.p.nitro = Math.max(g.p.nitro, 0.5);
  setState('play'); chip.play(g.T.st.song);
}

function updateGame(dt, I, P) {
  const g = game;
  g.t += dt; g.stateT += dt;
  chip.tick();
  if (g.medalQ.length) { g.medalT += dt; if (g.medalT > 3) { g.medalQ.shift(); g.medalT = 0; } }
  switch (g.state) {
    case 'play':
      if (P.pause || P.back) { openPause(); break; }
      updateRace(dt, I);
      break;
    case 'intro':
      updateFx(dt); updateTraffic(0); updateRival(0);
      if (g.stateT > 2.6 || (g.stateT > 0.5 && (P.any || input.tap))) beginPlay();
      break;
    case 'clear': {
      updateRace(dt, I);
      const t = g.tally; t.t += dt;
      if (g.stateT > 1.2 && (P.gas || P.nitro || P.start || input.tap)) { if (t.t < 3.4) t.t = 3.4; else { chip.sfx('select'); nextStage(); } }
      else if (g.stateT > 9) nextStage();
      break;
    }
    default: updateMenus(dt, I, P); break;
  }
}
