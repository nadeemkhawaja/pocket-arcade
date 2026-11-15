/* ==========================================================================
   Game flow: states, waves and the camera lock, lives and continues,
   scoring, medals, and the run from the first district to the roof.
   ========================================================================== */

const MEDALS = [
  { id: 'first', name: 'FIRST BLOOD', how: 'CLEAR THE NEON MARKET' },
  { id: 'tank', name: 'TANK BUSTER', how: 'DEFEAT TANK' },
  { id: 'ratchet', name: 'SPANNER IN THE WORKS', how: 'DEFEAT RATCHET' },
  { id: 'forge', name: 'COOLED DOWN', how: 'DEFEAT FORGE' },
  { id: 'warden', name: 'ROOFTOP JUSTICE', how: 'DEFEAT THE WARDEN' },
  { id: 'ten', name: 'BACK BREAKER', how: 'KNOCK OUT 10 WITH THE BACK ELBOW' },
  { id: 'suplex', name: 'BAGGAGE HANDLER', how: 'THROW 15 OF THE GANG IN ONE RUN' },
  { id: 'untouched', name: 'UNTOUCHABLE', how: 'CLEAR A DISTRICT WITHOUT LOSING A LIFE' },
  { id: 'duo', name: 'PARTNERS', how: 'CLEAR A DISTRICT WITH TWO PLAYERS' },
  { id: 'credit', name: 'ONE CREDIT', how: 'FINISH THE GAME WITHOUT CONTINUING' },
  { id: 'brutal', name: 'BRUTAL', how: 'FINISH THE GAME ON BRUTAL' },
  { id: 'armory', name: 'ARMORY', how: 'USE A BAT, A PIPE AND A KNIFE IN ONE RUN' }
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
  state: 'boot', t: 0, stateT: 0, menu: 0, hits: [], toast: null, medalQ: [], medalT: 0, pops: [], fx: [], items: [], shots: [],
  scores: loadScores(), hi: 0, demo: false, auto: false, heroes: [], foes: [], stage: 0, stageDef: null, camX: 0, lockX: 0, waveIdx: 0,
  waveLive: false, goT: 0, shake: 0, hitstop: 0, slowmo: 0, flash: 0, focus: null, focusT: 0, diff: DIFFS.normal, players: 1,
  stats: {}, page: 0, optFrom: 'title', pick: 0, entryQ: [], train: null, hitCount: 0, idleT: 0, banner: null, later: [], boss: null
};
game.hi = game.scores[0].s;

function setState(s) { game.state = s; game.stateT = 0; }
function blankStats() { return { bestCombo: 0, throws: 0, specials: 0, food: 0, weapons: 0, kos: 0, continues: 0, lost: 0, used: {} }; }

function newGame(players, demo) {
  const g = game;
  g.demo = !!demo; g.auto = !!demo; g.players = players;
  g.diff = DIFFS[settings.level] || DIFFS.normal;
  g.stats = blankStats(); g.medalQ = [];
  g.heroes = [newHero(0, settings.p1), newHero(1, settings.p2)];
  g.heroes[1].active = players > 1;
  if (!demo) { PROG.runs++; saveProg(); }
  startStage(demo ? Math.floor(Math.random() * STAGES.length) : 0);
}

function startStage(si) {
  const g = game, S = STAGES[si];
  g.stage = si; g.stageDef = S; g.camX = 0; g.lockX = 0; g.waveIdx = 0; g.waveLive = false; g.goT = 0;
  g.foes = []; g.items = []; g.shots = []; g.fx = []; g.pops = []; g.train = null; g.banner = null; g.focus = null; g.later = []; g.boss = null; g.cleared = false;
  g.livesAtStart = g.heroes.reduce((a, h) => a + (h.active ? h.lives : 0), 0);
  g.heroes.forEach((h, k) => { if (!h.active) return; Object.assign(h, { x: 50 + k * 30, z: 168 + k * 18, h: 0, vx: 0, vz: 0, vh: 0, face: 1, inv: 1.5, weapon: null, hold: null, heldBy: null, dead: false, alpha: 1 }); if (h.state === 'dead') h.hp = h.maxHp; setSt(h, 'idle'); h.scoreAtStage = h.score; });
  for (const p of S.props) addItem(p[0], p[1], p[2], p[3] ? { drop: p[3] } : null);
  if (g.demo) { g.auto = true; setState('title'); nextWave(); return; }
  setState('intro'); chip.stopMusic(); chip.play(S.song);
}

/** Lock the camera at the next stop and bring on its wave. */
function nextWave() {
  const g = game, S = g.stageDef, w = S.waves[g.waveIdx];
  if (!w) return;
  g.lockX = w.at; g.waveLive = true;
  spawnWave(w.foes);
  if (w.boss) {
    const f = newFoe(w.boss, g.lockX + W + 40, (Z0 + Z1) / 2, { spawnT: 1.1 });
    f.face = -1; g.foes.push(f); g.boss = f;
    g.banner = { s: f.name, sub: 'BOSS', t: 0, boss: true };
    chip.stopMusic(); chip.play('boss'); chip.sfx('roar');
  }
  if (w.train) { g.train = { x: g.lockX + W + 40 }; chip.sfx('train'); }
}

function stageCleared() {
  const g = game;
  if (g.demo) { startStage((g.stage + 1) % STAGES.length); return; }
  chip.stopMusic(); chip.play('clear');
  const lost = g.livesAtStart - g.heroes.reduce((a, h) => a + (h.active ? h.lives : 0), 0);
  if (lost <= 0) award('untouched');
  if (g.heroes.filter((h) => h.active).length > 1) award('duo');
  if (g.stage === 0) award('first');
  const u = g.stats.used; if (u.bat && u.pipe && u.knife) award('armory');
  for (const h of g.heroes) if (h.active && h.state !== 'dead') { h.score += Math.round(h.hp * 50 * g.diff.score); setSt(h, 'victory', 'victory'); h.weapon = null; }
  PROG.reached = Math.max(PROG.reached, Math.min(STAGES.length - 1, g.stage + 1)); saveProg();
  g.clearInfo = { lost };
  setState('clear');
}
function nextStage() {
  const g = game;
  if (g.stage + 1 >= STAGES.length) {
    if (g.stats.continues === 0) award('credit');
    if (g.diff.id === 'brutal') award('brutal');
    chip.play('ending'); setState('ending'); return;
  }
  startStage(g.stage + 1);
}

/* ---- lives, continues, game over --------------------------------------------------------------- */
function heroKO(h) {
  h.lives--; game.stats.lost++;
  h.weapon = null;
  if (h.lives > 0) { setTimeout0(() => respawn(h)); return; }
  h.state = 'dead'; h.anim = 'down'; h.contT = 9.99;
}
function setTimeout0(fn) { game.later.push({ t: 1.2, fn }); }
function respawn(h) {
  Object.assign(h, { hp: h.maxHp, h: 60, vh: 0, vx: 0, inv: 3, dead: false, alpha: 1, x: clamp(h.x, game.camX + 40, game.camX + W - 40), spinCool: 0 });
  if (inPit(h.x, h.z)) h.z = Z0 + 6;
  setSt(h, 'air', 'air');
}
function continueHero(h) {
  game.stats.continues++;
  h.lives = 3; h.score = 0;
  respawn(h);
}

/* ---- one step of play -------------------------------------------------------------------------- */
function updatePlay(dt) {
  const g = game;
  for (const it of g.later.slice()) { it.t -= dt; if (it.t <= 0) { g.later.splice(g.later.indexOf(it), 1); it.fn(); } }
  // players
  g.heroes.forEach((h, k) => {
    const pi = input.pl[k];
    if (!h.active) { if (!g.demo && (pi.pressed.start || pi.pressed.punch && k === 1)) joinIn(h); return; }
    if (h.state === 'dead') { h.contT -= dt; if (pi.pressed.start || pi.pressed.punch) { continueHero(h); chip.sfx('join'); } else if (h.contT <= 0) { h.active = false; h.gone = true; } return; }
    const I = g.auto ? botHeld(h) : pi.held, P = g.auto ? botPressed(h) : pi.pressed;
    updateHero(h, I, P, dt);
  });
  for (const h of g.heroes) if (h.active && h.state !== 'dead') { updateFighter(h, dt); if (h.hp <= 0 && h.state === 'down' && h.st > 1 && !h.koDone) { h.koDone = true; heroKO(h); } if (h.hp > 0) h.koDone = false; }
  for (const f of g.foes) { updateFoe(f, dt); updateFighter(f, dt); updateFoeAir(f); if (f.flick && f.state === 'attack' && atkPhase(f) === 1 && !f.flung0) { f.flung0 = true; f.weapon = null; g.shots.push({ type: 'knife', x: f.x + f.face * 14, z: f.z, h: 34, vx: f.face * 260, owner: f, spin: 0, t: 0 }); chip.sfx('knife'); } }
  for (const f of g.foes) if (f.dead && !f.counted) { f.counted = true; g.stats.kos++; const by = f.lastHitBy && f.lastHitBy.hero ? f.lastHitBy : g.heroes[0]; by.score += Math.round(f.def.score * g.diff.score); popAt(f.x, f.z, '+' + Math.round(f.def.score * g.diff.score), '#ffd27a'); if (f.weapon && ITEM_DEF[f.weapon] && !f.boss) addItem(f.weapon, f.x, f.z, { vh: 100, h: 20 }); if (f.boss) { award(f.type); g.boss = null; } if (Math.random() < 0.12 && !f.boss) addItem(Math.random() < 0.6 ? 'soda' : 'cash', f.x, f.z, { vh: 120, h: 10 }); }
  g.foes = g.foes.filter((f) => !f.dead);
  updatePins(dt);
  separate(dt);
  updateItems(dt);
  // weapons used this run
  for (const h of g.heroes) if (h.weapon) g.stats.used[h.weapon] = 1;
  // waves and the camera
  if (g.waveLive && g.foes.length === 0 && g.foes.every((f) => f.dead)) {
    g.waveLive = false; g.waveIdx++;
    if (g.waveIdx >= g.stageDef.waves.length) { stageCleared(); return; }
    g.goT = 4; chip.sfx('go');
  }
  const live = liveHeroes();
  if (live.length) {
    const mid = live.reduce((a, h) => a + h.x, 0) / live.length;
    const next = g.stageDef.waves[g.waveIdx];
    const maxCam = g.waveLive ? g.lockX : next ? next.at : g.stageDef.len;
    const want = clamp(mid - W * 0.42, 0, Math.min(maxCam, g.stageDef.len));
    if (want > g.camX) g.camX = approach(g.camX, want, 160 * dt);
    if (!g.waveLive && next && g.camX >= next.at - 0.5) nextWave();
  }
  if (g.goT > 0) g.goT -= dt;
  if (g.train) { g.train.x -= 220 * dt; if (g.train.x < g.camX - 760) g.train = null; }
  if (g.banner) { g.banner.t += dt; if (g.banner.t > 2.4) g.banner = null; }
  if (g.focusT > 0) g.focusT -= dt;
  for (const q of g.pops.slice()) { q.t += dt; if (q.t > 1) g.pops.splice(g.pops.indexOf(q), 1); }
  // game over when nobody is left
  if (!g.demo && g.heroes.every((h) => !h.active || h.gone || (h.state === 'dead' && h.contT <= 0))) { chip.stopMusic(); chip.play('over'); setState('gameover'); }
}

function joinIn(h) {
  h.active = true; h.lives = 3; h.hp = h.maxHp; h.score = 0; h.gone = false; h.x = game.camX + 30; h.z = 180;
  respawn(h); chip.sfx('join'); game.banner = { s: h.name + ' JOINS', sub: 'PLAYER ' + (h.slot + 1), t: 0 };
}

function qualifies(score) { return score > game.scores[4].s; }
function endRun() {
  const g = game;
  g.entryQ = g.heroes.filter((h) => h.score > 0 && qualifies(h.score) && !g.demo);
  if (g.entryQ.length) beginEntry(); else { setState('scores'); g.attract = false; chip.play('title'); }
}
function beginEntry() {
  const h = game.entryQ[0];
  game.entry = { name: h.name.slice(0, 3).split(''), i: 0, done: false, rank: -1, hero: h };
  setState('entry'); chip.play('ending');
}
function submitEntry() {
  const g = game, e = g.entry, h = e.hero;
  const row = { n: e.name.join(''), s: Math.floor(h.score), st: g.cleared ? 5 : g.stage + 1 };
  g.scores.push(row); g.scores.sort((a, b) => b.s - a.s); g.scores.length = 5;
  e.rank = g.scores.indexOf(row); e.done = true;
  store.set('scores', g.scores); g.hi = g.scores[0].s;
  g.entryQ.shift();
  if (g.entryQ.length && qualifies(g.entryQ[0].score)) { beginEntry(); return; }
  setState('scores'); g.attract = false; chip.play('title');
}

function openPause() { if (game.state === 'play' && !game.demo) { setState('pause'); game.menu = 0; if (chip.ctx) chip.musicBus.gain.setTargetAtTime(0.0001, chip.ctx.currentTime, 0.05); } }
function closePause() { setState('play'); chip.applyVolumes(); }

function updateGame(dt, I, P) {
  const g = game;
  g.t += dt; g.stateT += dt;
  chip.tick();
  if (g.medalQ.length) { g.medalT += dt; if (g.medalT > 3) { g.medalQ.shift(); g.medalT = 0; } }
  g.shake = Math.max(0, g.shake - dt * 24); g.flash = Math.max(0, g.flash - dt);
  switch (g.state) {
    case 'play':
      if (P.pause || P.back) { openPause(); break; }
      if (g.hitstop > 0) { g.hitstop -= dt; break; }
      if (g.slowmo > 0) { g.slowmo -= dt; dt *= 0.3; }
      updatePlay(dt);
      break;
    case 'intro':
      if (g.stateT > 3 || (g.stateT > 0.6 && (P.any || input.tap))) { setState('play'); g.banner = { s: 'FIGHT!', sub: g.stageDef.name, t: 0 }; nextWave(); chip.sfx('go'); }
      break;
    case 'clear':
      updateItems(dt);
      for (const h of g.heroes) if (h.active) updateFighter(h, dt);
      if (g.stateT > 1.5 && (P.punch || P.kick || P.start || input.tap)) { chip.sfx('select'); nextStage(); }
      else if (g.stateT > 8) nextStage();
      break;
    default: updateMenus(dt, I, P); break;
  }
}

/* ---- the bot: plays the attract mode and the automated tests ----------------------------------- */
const BOT = new Map();
function botThink(h) {
  let b = BOT.get(h);
  if (!b) { b = { held: {}, pressed: {}, t: 0 }; BOT.set(h, b); }
  const P = {}, I = {};
  const foes = game.foes.filter((f) => !f.dead && f.spawnT <= 0 && f.state !== 'down');
  const it = nearItem(h);
  if (!foes.length) {
    // walk on toward the next stop
    const tx = game.camX + W * 0.7;
    if (h.x < tx) I.right = true;
    if (it && !h.weapon && Math.random() < 0.1) P.punch = true;
  } else {
    const t = foes.reduce((a, f) => (Math.abs(f.x - h.x) + Math.abs(f.z - h.z) < Math.abs(a.x - h.x) + Math.abs(a.z - h.z) ? f : a));
    const dx = t.x - h.x, dz = t.z - h.z, k = CHARS[t.kind].k / 1.9;
    const want = 22 * Math.max(1, k * 0.9);
    if (Math.abs(dz) > 4) { if (dz > 0) I.down = true; else I.up = true; }
    if (Math.abs(dx) > want + 4) { if (dx > 0) I.right = true; else I.left = true; }
    else if (Math.abs(dx) < want - 10) { if (dx > 0) I.left = true; else I.right = true; }
    if (Math.abs(dz) < 7 && Math.abs(dx) < want + 14 && canAct(h)) {
      if ((dx > 0 ? 1 : -1) !== h.face) { if (dx > 0) I.right = true; else I.left = true; }
      else {
        const r = Math.random();
        if (h.spinCool <= 0 && foes.filter((f) => Math.abs(f.x - h.x) < 50 && Math.abs(f.z - h.z) < 12).length >= 2) P.special = true;
        else if (t.state === 'dizzy') { if (dx > 0) I.right = true; else I.left = true; }
        else if (r < 0.6) P.punch = true; else P.kick = true;
      }
    }
    if (h.state === 'grab') { if (h.knees < 2) P.punch = true; else P.kick = true; }
    if (h.state === 'pinned') { P.punch = Math.random() < 0.5; P.kick = !P.punch; }
    // the bot uses the back elbow when someone is behind
    const back = foes.find((f) => (f.x - h.x) * h.face < 0 && Math.abs(f.x - h.x) < 40 && Math.abs(f.z - h.z) < 8);
    if (back && canAct(h) && Math.random() < 0.3) { P.punch = true; P.kick = false; I.left = h.face > 0; I.right = h.face < 0; }
    // keep out of pits
    const pit = pitAhead(h.x + (I.right ? 24 : I.left ? -24 : 0), h.z);
    if (pit) { I.down = false; I.up = true; if (h.z < pit[2] - 4) I.up = false; }
    if (Math.abs(dx) > 120 && Math.abs(dz) < 6 && Math.random() < 0.02) P.jump = true;
  }
  b.held = I; b.pressed = P;
}
function botHeld(h) { botThink(h); return Object.assign({}, NO_PRESS, BOT.get(h).held); }
function botPressed(h) { return Object.assign({}, NO_PRESS, BOT.get(h).pressed); }
