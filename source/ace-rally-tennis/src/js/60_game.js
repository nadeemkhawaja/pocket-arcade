/* ==========================================================================
   Game: teams, serve flow, rally rules, AI, interception planning, camera
   ========================================================================== */

const INPUT_WINDOWS = {
  keys: { early: 0.42, late: 0.1, ideal: 0.15, lat: 0 },
  touch: { early: 0.44, late: 0.1, ideal: 0.16, lat: 0.02 },
  cam: { early: 0.95, late: 0.2, ideal: 0.36, lat: 0.1 }
};
const TOSS_VY = 5.2;
const _gv = new T3.Vector3();
const _gv2 = new T3.Vector3();

const game = {
  state: 'boot', mode: 'demo', t: 0, acc: 0, paused: false, timeScale: 1,
  cfg: null, score: null, teams: [], ball: makeBall(), serve: null, rally: null,
  hits: [], timers: [], stats: null, surf: SURFACES.hard, doubles: false,
  camMode: 'orbit', camT0: 0, shake: 0, planSeq: 0, humanTeam: null,
  practice: { best: 0 }, longestRally: 0, serveNumber: 1, lastTurnSig: '',
  umpire: null, introUntil: 0, celebrate: null
};

/* ---- clock helpers -------------------------------------------------------- */
function after(sec, fn) { game.timers.push({ at: game.t + sec, fn }); }
function runTimers() {
  if (!game.timers.length) return;
  const due = game.timers.filter((tm) => game.t >= tm.at);
  if (!due.length) return;
  game.timers = game.timers.filter((tm) => game.t < tm.at);
  due.sort((a, b) => a.at - b.at).forEach((tm) => tm.fn());
}
function scheduleHit(t, fn) { game.hits.push({ t, fn }); }
function runHits() {
  const due = game.hits.filter((h) => game.t >= h.t - 1e-7);
  if (!due.length) return;
  game.hits = game.hits.filter((h) => game.t < h.t - 1e-7);
  due.forEach((h) => h.fn());
}

function newStats() {
  return { points: 0, aces: 0, df: 0, winners: 0, errors: 0, firstIn: 0, firstTot: 0, fastest: 0 };
}
function guidesOn() {
  if (!game.cfg || game.mode === 'demo') return false;
  if (settings.guides === 'on') return true;
  if (settings.guides === 'off') return false;
  return game.cfg.level === 'rookie' || game.mode === 'practice' || game.cfg.controls === 'webcam';
}
function teamNames(speech) { return game.teams.map((t) => (speech ? t.callName : t.name)); }

/* ---- players ---------------------------------------------------------------- */
class Player {
  constructor(team, idx, look, opts) {
    this.team = team; this.idx = idx;
    this.name = opts.name;
    this.ath = new Athlete(look, { racketColor: opts.racket });
    world.scene.add(this.ath.root);
    this.x = 0; this.z = team.side * (COURT.HL + 0.8);
    this.vx = 0; this.vz = 0;
    this.yaw = team.side > 0 ? 0 : PI;
    this.tx = this.x; this.tz = this.z; this.moveAt = 0;
    this.plan = null; this.swing = null; this.input = null;
    this.role = 'back'; this.lane = 0;
    this.speed = opts.speed; this.react = opts.react;
    this.anim = 'ready'; this.animT = 0; this.animBig = false; this.relaxed = false;
  }
  get rightX() { return this.team.side; }
  dispose() {
    world.scene.remove(this.ath.root);
    this.ath.root.traverse((o) => {
      if (o.geometry && o.geometry !== LIMB_GEO && o.geometry !== SPH && o.geometry !== SPH_LO) o.geometry.dispose();
    });
  }
}

function makeTeam(index, controller, level, players) {
  const side = index === 0 ? 1 : -1;
  const team = { index, side, controller, level, players: [], turns: 0, name: '', callName: '', color: '#ffffff' };
  players.forEach((pd, i) => {
    const pl = new Player(team, i, pd.look, { name: pd.name, speed: pd.speed, react: pd.react, racket: pd.racket });
    team.players.push(pl);
  });
  const names = players.map((p) => p.name);
  team.name = names.join(' / ');
  team.callName = names.map((n) => n.charAt(0) + n.slice(1).toLowerCase()).join(' and ');
  team.color = players[0].look.shirt;
  return team;
}

function teardown() {
  for (const t of game.teams) for (const p of t.players) p.dispose();
  game.teams = [];
  game.hits.length = 0;
  game.timers.length = 0;
  game.serve = null; game.rally = null;
  const b = game.ball;
  b.phys = false; b.live = false; b.visible = false; b.held = null;
  hideGuides();
  stopConfetti();
  audio.hush();
}

/* ---- match setup ------------------------------------------------------------- */
function startMatch(cfg) {
  teardown();
  game.cfg = cfg;
  game.mode = cfg.mode === 'demo' ? 'demo' : cfg.mode === 'practice' ? 'practice' : 'match';
  game.doubles = cfg.mode === 'doubles';
  game.surf = SURFACES[cfg.surface] || SURFACES.hard;
  setSurface(game.surf.key);
  const L = LEVELS[cfg.level] || LEVELS.pro;
  const shirt = SHIRTS[cfg.shirt] || SHIRTS[0];
  const myLook = Object.assign({}, shirt, { skin: cfg.skin, hair: [2, 0, 1, 4, 4, 3][cfg.skin % 6], style: 'short', racket: '#1e97e0' });
  const human = game.mode !== 'demo';
  const nearSpeed = human ? 7.0 : 6.6, nearReact = human ? 0.05 : 0.14;
  const nearPlayers = [{ name: cfg.name, look: myLook, speed: nearSpeed, react: nearReact, racket: '#1e97e0' }];
  if (game.doubles) {
    nearPlayers.push({ name: 'JO', look: Object.assign({}, shirt, { skin: (cfg.skin + 3) % 6, hair: 3, style: 'pony', racket: '#ffffff' }), speed: nearSpeed, react: nearReact, racket: '#ffffff' });
  }
  let farLevel = L;
  if (game.mode === 'demo') farLevel = LEVELS.champ;
  const farPlayers = [];
  if (game.mode === 'practice') {
    farPlayers.push({ name: 'COACH', look: { shirt: '#ffffff', shirt2: '#1e97e0', shorts: '#1d2f4f', skin: 2, hair: 0, style: 'buzz', band: '#1e97e0' }, speed: 6.6, react: 0.12, racket: '#f2c94c' });
  } else {
    farPlayers.push({ name: farLevel.name, look: farLevel.look, speed: farLevel.speed, react: farLevel.react, racket: '#2a2a2a' });
    if (game.doubles) farPlayers.push({ name: farLevel.partner, look: farLevel.look2, speed: farLevel.speed, react: farLevel.react, racket: '#2a2a2a' });
  }
  const near = makeTeam(0, human ? 'human' : 'ai', human ? null : LEVELS.pro, nearPlayers);
  const far = makeTeam(1, 'ai', game.mode === 'practice' ? LEVELS.pro : farLevel, farPlayers);
  game.teams = [near, far];
  game.humanTeam = human ? near : null;
  game.stats = [newStats(), newStats()];
  game.longestRally = 0;
  game.lastTurnSig = '';
  game.serveNumber = 1;
  game.practice.count = 0;
  game.practice.best = store.get('bestRally', 0);
  const firstServer = game.mode === 'demo' ? (chance(0.5) ? 0 : 1) : 0;
  game.score = game.mode === 'practice' ? null : new Score(FORMATS[cfg.format] || FORMATS.g3, firstServer);
  game.paused = false;
  game.timeScale = 1;
  game.celebrate = null;
  ui.onMatchStart();
  drawBoardNow();
  setupPoint();
  if (game.mode === 'demo') {
    game.camMode = 'orbit';
    audio.setCrowd(0.05);
  } else {
    game.camMode = 'intro';
    game.camT0 = game.t;
    game.introUntil = game.t + 3.2;
    audio.setCrowd(0.12);
    crowdCheer(0.8);
    audio.applause(0.9);
    const names = teamNames(false);
    if (game.mode === 'practice') {
      ui.banner('RALLY PRACTICE', 'title', 2.6);
      audio.say('Rally practice. Keep the ball in play.', 0.5);
    } else {
      ui.banner(names[0] + '  vs  ' + names[1], 'title', 2.8);
      const fmt = FORMATS[cfg.format];
      const serverName = teamNames(true)[game.score.servingTeam()];
      audio.say('Ace Rally Open. ' + fmt.label + '. ' + serverName + ' to serve. Play.', 0.6);
    }
    after(3.2, () => { if (game.camMode === 'intro') game.camMode = 'play'; });
  }
}

function startDemo() {
  startMatch({
    mode: 'demo', controls: 'keys', level: 'pro', format: 'g3', surface: settings.surface,
    name: cleanName(settings.name), shirt: settings.shirt, skin: settings.skin || 0
  });
}

function drawBoardNow() {
  if (!game.teams.length) return;
  if (!game.score) {
    drawScoreboard({ label: 'PRACTICE', names: teamNames(false), colors: game.teams.map((t) => t.color), serving: -1, sets: [[], []], games: [0, 0], points: [String(game.practice.count || 0), String(game.practice.best || 0)] });
    return;
  }
  const s = game.score;
  const done = s.sets.slice(0, -1);
  drawScoreboard({
    label: s.tb ? 'TIEBREAK' : (FORMATS[game.cfg.format] || FORMATS.g3).label.toUpperCase(),
    names: teamNames(false).map((n) => n.length > 13 ? n.slice(0, 13) : n),
    colors: game.teams.map((t) => t.color),
    serving: s.over ? -1 : s.servingTeam(),
    sets: [done.map((g) => g[0]), done.map((g) => g[1])],
    games: s.games.slice(),
    points: [s.ptsDisplay(0), s.ptsDisplay(1)]
  });
}

/* ---- point setup ------------------------------------------------------------- */
function placePlayer(p, x, z, role) {
  p.x = p.tx = x; p.z = p.tz = z; p.vx = p.vz = 0; p.role = role;
  p.plan = null; p.swing = null; p.anim = 'ready'; p.relaxed = false;
  p.yaw = p.team.side > 0 ? 0 : PI;
  p.ath.root.position.set(x, 0, z);
  p.ath.root.rotation.y = p.yaw;
}

function setupPoint(keepServeNumber) {
  const g = game;
  if (!g.teams.length) return;
  g.hits.length = 0;
  hideGuides();
  if (!keepServeNumber) g.serveNumber = 1;
  let st, sideName;
  if (g.mode === 'practice') { st = 1; sideName = 'deuce'; }
  else { st = g.score.servingTeam(); sideName = g.score.side(); }
  const sTeam = g.teams[st], rTeam = g.teams[1 - st];
  // doubles rotation: a new service turn hands the ball to the other partner
  if (g.score) {
    const totalGames = g.score.sets.reduce((a, s) => a + s[0] + s[1], 0);
    const sig = st + '|' + g.score.sets.length + '|' + totalGames + '|' + (g.score.tb ? Math.floor((g.score.played + 1) / 2) : 'g');
    if (sig !== g.lastTurnSig) { g.lastTurnSig = sig; sTeam.turns++; }
  }
  const server = g.doubles ? sTeam.players[(Math.max(1, sTeam.turns) - 1) % 2] : sTeam.players[0];
  const receiver = g.doubles ? rTeam.players[sideName === 'deuce' ? 0 : 1] : rTeam.players[0];
  const sx = (sideName === 'deuce' ? 1 : -1) * sTeam.side;
  if (g.mode === 'practice') {
    placePlayer(server, rand(-0.6, 0.6), sTeam.side * (COURT.HL + 0.3), 'back');
    placePlayer(receiver, 0, rTeam.side * (COURT.HL + 0.8), 'back');
  } else {
    placePlayer(server, sx * 0.9, sTeam.side * (COURT.HL + 0.3), 'back');
    placePlayer(receiver, -sx * (g.doubles ? 3.5 : 2.85), rTeam.side * (COURT.HL + 0.85), 'back');
  }
  if (g.doubles) {
    const sp = sTeam.players.find((q) => q !== server);
    const rp = rTeam.players.find((q) => q !== receiver);
    placePlayer(sp, -sx * 2.6, sTeam.side * 3.1, 'front');
    placePlayer(rp, sx * 2.5, rTeam.side * (COURT.SVC - 0.3), 'front');
    sp.lane = -sx; server.lane = sx;
    rp.lane = sx; receiver.lane = -sx;
  }
  const b = g.ball;
  b.held = server; b.phys = false; b.live = false; b.visible = true; b.rolling = false;
  b.vx = b.vy = b.vz = 0; b.spin = 0;
  g.serve = {
    team: st, player: server, receiver, sx,
    box: { sx: -sx, sz: -sTeam.side },
    stage: 'ready', t0: g.t, number: g.serveNumber,
    aiTossAt: Math.max(g.t, g.introUntil) + rand(0.9, 1.5) + (g.mode === 'demo' ? 0.3 : 0),
    bounceUntil: g.t + (sTeam.controller === 'ai' ? 1.3 : 0.65),
    queued: false, tossAt: 0, src: null
  };
  g.rally = { hitter: st, isServe: g.mode !== 'practice', bounces: 0, shots: 0, let: false, ended: false, humanReturns: 0, lastEventT: g.t };
  g.state = 'serve';
  server.anim = 'bounce';
  ui.updateScore();
  if (g.humanTeam && st === g.humanTeam.index && g.mode !== 'practice') ui.servePrompt(g.serveNumber);
  else ui.prompt(null);
  if (g.mode !== 'demo' && g.score) ui.situation(g.score.situation());
  else ui.situation(null);
  if (g.camMode === 'play') snapCamera(false);
}

/* ---- serve ------------------------------------------------------------------- */
function updateServe(dt) {
  const g = game, s = g.serve, p = s.player, b = g.ball;
  const ai = p.team.controller === 'ai';
  if (s.stage === 'ready') {
    if (g.t < s.bounceUntil) {
      p.anim = 'bounce';
      const prev = p.animT;
      p.animT = ((g.t - s.t0) / 0.65) % 1;
      if (prev < 0.5 && p.animT >= 0.5) audio.bounce(0.35, p.x, p.z < -2, g.surf.key);
    } else { p.anim = 'ready'; p.animT = 0; }
    if (g.mode === 'practice' && g.t >= s.aiTossAt) { practiceFeed(p); return; }
    if (ai && g.t >= s.aiTossAt) doToss(p);
  } else if (s.stage === 'toss') {
    p.anim = 'toss';
    p.animT = clamp((g.t - s.tossAt) / 0.45, 0, 1);
    if (ai && !s.queued && g.t >= s.aiHitAt) queueServeHit(p, null);
    if (!s.queued && b.vy < 0 && b.y < 2.05) {
      if (s.src === 'cam' || ai) queueServeHit(p, { auto: true });
      else {
        // let the toss drop and catch it, then try again
        b.phys = false; b.held = p;
        s.stage = 'ready'; s.t0 = g.t; s.bounceUntil = g.t;
        p.anim = 'ready';
        ui.pop('SWING AT THE TOP', 'warn', p);
        ui.servePrompt(s.number);
      }
    }
  }
}

function doToss(p) {
  const g = game, s = g.serve, b = g.ball;
  if (s.stage !== 'ready') return;
  s.stage = 'toss'; s.tossAt = g.t; s.queued = false;
  b.held = null; b.phys = true; b.live = false; b.rolling = false; b.visible = true;
  b.x = p.x + p.rightX * 0.2; b.y = 1.62; b.z = p.z - p.team.side * 0.42;
  b.vx = 0; b.vz = 0; b.vy = TOSS_VY; b.spin = 0;
  s.apexT = g.t + TOSS_VY / GRAV;
  s.aiHitAt = s.apexT - 0.12 + rand(-0.06, 0.06);
  p.anim = 'toss'; p.animT = 0;
  audio.toss();
  ui.prompt(null);
}

function ballHeightAt(dt) {
  const b = game.ball;
  return b.y + b.vy * dt - 0.5 * GRAV * dt * dt;
}

function queueServeHit(p, inp) {
  const g = game, s = g.serve;
  if (s.queued || s.stage !== 'toss') return;
  s.queued = true;
  let lead = 0.12;
  // a swing started while the ball is still low waits for it to climb
  let y = ballHeightAt(lead);
  if (y < 2.3 && game.ball.vy > 0) {
    for (let k = 0; k < 40 && y < 2.3; k++) { lead += 0.02; y = ballHeightAt(lead); }
  }
  const tHit = g.t + lead;
  const contact = new T3.Vector3(game.ball.x, Math.max(1.6, y), game.ball.z);
  p.swing = { t0: g.t, tHit, stroke: 'serve', contact, whiff: false, crouch: 0 };
  s.stage = 'swing';
  scheduleHit(tHit, () => serveContact(p, inp));
}

function serveContact(p, inp) {
  const g = game, s = g.serve, b = g.ball;
  if (g.state !== 'serve' || !s || s.player !== p) return;
  if (b.y < 1.5) { // the toss dropped too far: treat as a missed swing and re-toss
    b.phys = false; b.held = p; s.stage = 'ready'; s.t0 = g.t; s.bounceUntil = g.t;
    if (p.team.controller === 'human') ui.servePrompt(s.number);
    return;
  }
  const q = inp && inp.auto ? 0.55 : 1 - clamp(Math.abs(g.t - s.apexT) / 0.34, 0, 1);
  launchServe(p, q, inp);
}

function launchServe(p, q, inp) {
  const g = game, s = g.serve, b = g.ball, team = p.team;
  const first = s.number === 1;
  const box = s.box;
  const human = team.controller === 'human';
  const L = team.level || LEVELS.pro;
  let lane;
  if (human && inp && inp.aim) {
    const towardWide = Math.sign(inp.aim * team.side) === box.sx;
    lane = towardWide ? 2 : 0;
  } else {
    const r = Math.random();
    lane = r < 0.4 ? 0 : r < 0.62 ? 1 : 2;
  }
  let tx = box.sx * [0.4, 1.95, 3.5][lane] + rand(-0.25, 0.25);
  let tz = box.sz * (COURT.SVC - rand(0.35, 1.05));
  let speed, spin, clear, pFault;
  if (human) {
    speed = first ? lerp(20, 32, q) : lerp(17, 22, q);
    spin = first ? 0.1 : 0.72;
    clear = first ? 0.05 : 0.32;
    pFault = first ? 0.07 + (1 - q) * 0.3 : 0.03 + (1 - q) * 0.07;
  } else {
    speed = first ? rand(L.serve[0], L.serve[1]) : rand(L.serve[0] * 0.72, L.serve[0] * 0.82);
    spin = first ? 0.12 : 0.7;
    clear = first ? 0.06 : 0.3;
    pFault = 1 - (first ? L.serveIn[0] : L.serveIn[1]);
    if (g.mode === 'demo') pFault *= 0.8;
  }
  const from = { x: b.x, y: b.y, z: b.z };
  let fault = chance(pFault) ? pick(['net', 'long', 'wide']) : null;
  if (fault === 'long') tz = box.sz * (COURT.SVC + rand(0.15, 0.8));
  if (fault === 'wide') tx = lane === 0 ? -box.sx * rand(0.08, 0.5) : box.sx * (COURT.HWS + rand(0.12, 0.7));
  const sol = fault === 'net' ? netShot(from, tx, tz, speed, spin) : aimShot(from, tx, tz, speed, spin, clear);
  b.vx = sol.v.vx; b.vy = sol.v.vy; b.vz = sol.v.vz; b.spin = spin;
  b.cordOver = chance(0.5); b.rolling = false; b.phys = true; b.live = true; b.held = null;
  const kmh = Math.round(Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz) * 3.6 * SPEED_DISPLAY);
  const st = g.stats[team.index];
  if (first) st.firstTot++;
  st.fastest = Math.max(st.fastest, kmh);
  const r = g.rally;
  r.hitter = team.index; r.isServe = true; r.bounces = 0; r.shots = 1; r.let = false; r.lastEventT = g.t;
  r.first = first;
  r.serveSpeed = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
  g.state = 'rally';
  audio.hit(0.55 + q * 0.45, b.x, b.z < -2, 'serve');
  if (human && q > 0.9) { sparkle(b.x, b.y, b.z, 1.2); ui.pop('PERFECT SERVE', 'good', p); vibrate(25); }
  if (g.mode !== 'demo') ui.speed(kmh, team.index);
  planTeam(g.teams[1 - team.index]);
  // the server recovers to the baseline centre (or follows to the net in doubles)
  for (const pl of team.players) {
    const h = homeFor(pl, 0);
    pl.tx = h.x; pl.tz = h.z; pl.moveAt = g.t + 0.35;
  }
}

/* ---- practice feed ------------------------------------------------------------ */
function practiceFeed(coach) {
  const g = game, b = g.ball, s = g.serve;
  s.stage = 'fed';
  const from = { x: coach.x + coach.rightX * 0.5, y: 1.0, z: coach.z - coach.team.side * 0.5 };
  b.held = null; b.phys = true; b.live = true; b.visible = true; b.rolling = false;
  b.x = from.x; b.y = from.y; b.z = from.z;
  const side = g.practice.flip = !g.practice.flip;
  const tx = (side ? 1 : -1) * rand(1.0, 2.6);
  const tz = rand(8.2, 9.8);
  const sol = aimShot(from, tx, tz, rand(13, 14.5), 0.5, 0.6);
  b.vx = sol.v.vx; b.vy = sol.v.vy; b.vz = sol.v.vz; b.spin = 0.5; b.cordOver = true;
  coach.swing = { t0: g.t - 0.2, tHit: g.t, stroke: 'fh', contact: null, whiff: false, crouch: 0 };
  audio.hit(0.5, b.x, true, 'drive');
  const r = g.rally;
  r.hitter = 1; r.isServe = false; r.bounces = 0; r.shots = 1; r.lastEventT = g.t;
  g.state = 'rally';
  planTeam(g.teams[0]);
}

/* ---- rally: planning ------------------------------------------------------------ */
function homeFor(p, bx) {
  const side = p.team.side;
  if (!game.doubles) {
    if (p.role === 'front') return { x: clamp(bx * 0.5, -3.0, 3.0), z: side * 3.4 };
    return { x: clamp(bx * 0.36, -2.4, 2.4), z: side * (COURT.HL + 0.9) };
  }
  if (p.role === 'front') return { x: clamp(p.lane * 1.7 + bx * 0.35, -4.2, 4.2), z: side * 3.2 };
  return { x: clamp(p.lane * 1.9 + bx * 0.3, -4.6, 4.6), z: side * (COURT.HL + 0.7) };
}

function findIntercept(p, pr, react) {
  const g = game, side = p.team.side;
  const isServe = g.rally.isServe;
  const t0 = g.t;
  let best = null;
  for (let i = 1; i < pr.n; i += 2) {
    const bc = pr.bc[i];
    if (bc >= 2) break;
    const z = pr.z[i];
    if (z * side < 0.9) continue;
    if (isServe && bc < 1) continue;
    const y = pr.y[i];
    if (y < 0.16 || y > 2.75) continue;
    const pre = bc === 0;
    const x = pr.x[i];
    let stroke, lat, fwd;
    if (y >= 1.9) {
      if (!pre && y > 2.2) continue;
      stroke = 'smash'; lat = 0.28; fwd = 0.4;
    } else if (pre) {
      if (p.role !== 'front' && Math.abs(z) > 7.5) continue;
      lat = 0.92; fwd = 0.5; stroke = null;
    } else { lat = 0.98; fwd = 0.42; stroke = null; }
    // choose forehand or backhand by the shorter run, with a forehand bias
    const sxF = x - p.rightX * lat, sxB = x + p.rightX * lat;
    let fh = Math.abs(sxF - p.x) <= Math.abs(sxB - p.x) + 0.35;
    if (stroke === 'smash') fh = true;
    const sx = stroke === 'smash' ? x - p.rightX * lat : (fh ? sxF : sxB);
    if (!stroke) stroke = pre ? (fh ? 'vfh' : 'vbh') : (fh ? 'fh' : 'bh');
    const sz = z + side * fwd;
    const t = pr.t[i] - t0;
    const travel = hyp(sx - p.x, sz - p.z);
    const avail = t - react - 0.12;
    const need = travel / p.speed;
    if (need > avail + 0.04) continue;
    let sc = 0;
    if (stroke === 'smash') sc += 1.3;
    else if (pre) sc += p.role === 'front' ? 2.2 : -0.5;
    else {
      sc += 1.0 - Math.abs(y - 0.95) * 1.7;
      if (pr.vy[i] > 0 && y < 0.5) sc -= 0.7;
    }
    sc -= Math.max(0, Math.abs(sz) - (COURT.HL + 2.2)) * 0.9;
    sc -= t * 0.14 + travel * 0.05;
    if (!best || sc > best.score) {
      best = { p, i, t: pr.t[i], x, y, z, stroke, sx, sz, score: sc, pre, margin: avail - need };
    }
  }
  return best;
}

function planTeam(team) {
  const g = game;
  const pr = predictBall(g.ball, g.surf, g.t, 4.4);
  const b1 = { ok: pr.b1.ok, x: pr.b1.x, z: pr.b1.z, t: pr.b1.t };
  for (const p of team.players) p.plan = null;
  if (pr.dead || !pr.n) {
    for (const p of team.players) { const h = homeFor(p, 0); p.tx = h.x; p.tz = h.z; }
    return;
  }
  let best = null;
  const human = team.controller === 'human';
  const isServe = g.rally.isServe;
  for (const p of team.players) {
    const extra = !human && isServe ? clamp(((g.rally.serveSpeed || 20) - 20) / 12, 0, 1) * 0.24 : 0;
    const c = findIntercept(p, pr, p.react + extra);
    if (c && (!best || c.score > best.score)) best = c;
  }
  if (!best) {
    // nobody can make it: the nearest player still gives chase
    let near = team.players[0], nd = 1e9;
    const cx = b1.ok ? b1.x : g.ball.x, cz = b1.ok ? b1.z : g.ball.z;
    for (const p of team.players) { const d = hyp(p.x - cx, p.z - cz); if (d < nd) { nd = d; near = p; } }
    near.plan = { id: ++g.planSeq, chase: true, t: g.t + 9, b1 };
    near.tx = cx; near.tz = cz + team.side * 0.6; near.moveAt = g.t + (human ? 0 : near.react);
    for (const p of team.players) if (p !== near) { const h = homeFor(p, cx); p.tx = h.x; p.tz = h.z; }
    return;
  }
  const p = best.p;
  const plan = {
    id: ++g.planSeq, t: best.t, contactP: new T3.Vector3(best.x, best.y, best.z),
    stroke: best.stroke, stand: { x: best.sx, z: best.sz }, pre: best.pre, margin: best.margin,
    willHit: true, b1, serve: isServe
  };
  if (team.controller === 'ai' && b1.ok && !plan.pre) {
    if (isServe) {
      if (!inBox(b1.x, b1.z, g.serve.box)) plan.willHit = false;
    } else {
      const ob = outBy(b1.x, b1.z, g.doubles);
      if (ob > 0.04 && chance(clamp(team.level.leaveOut + ob * 0.9, 0, 0.97))) plan.willHit = false;
    }
  }
  p.plan = plan;
  p.moveAt = g.t + p.react;
  if (plan.willHit) { p.tx = plan.stand.x; p.tz = plan.stand.z; }
  else { p.tx = lerp(p.x, plan.stand.x, 0.45); p.tz = lerp(p.z, plan.stand.z, 0.45); p.relaxed = true; }
  if (team.controller === 'ai' && plan.willHit) scheduleHit(plan.t, () => performHit(p, plan));
  for (const q of team.players) {
    if (q === p) continue;
    const h = homeFor(q, plan.contactP.x);
    q.tx = h.x; q.tz = h.z; q.moveAt = g.t + (human ? 0.05 : q.react);
  }
}

function recoverTeam(team, landX) {
  for (const p of team.players) {
    p.plan = null;
    p.relaxed = false;
    const h = homeFor(p, landX);
    p.tx = h.x; p.tz = h.z;
    p.moveAt = game.t + (team.controller === 'human' ? 0.12 : 0.1 + p.react * 0.5);
  }
}

/* ---- rally: swings and contact -------------------------------------------------- */
function startSwing(p, tHit, stroke, contact, whiff) {
  p.swing = {
    t0: game.t, tHit, stroke, whiff: !!whiff,
    contact: contact ? contact.clone() : null,
    crouch: contact ? clamp((0.9 - contact.y) * 0.55, 0, 0.32) : 0
  };
}

function swingParam(sw, t) {
  const total = Math.max(0.0001, sw.tHit - sw.t0);
  const fwd = Math.min(0.17, Math.max(0.06, total));
  const tf = sw.tHit - fwd;
  if (t < tf) {
    const back = Math.max(0.0001, Math.min(0.3, tf - sw.t0));
    return 0.28 * easeOutCubic(clamp((t - sw.t0) / back, 0, 1));
  }
  if (t < sw.tHit) return 0.28 + 0.22 * clamp((t - tf) / fwd, 0, 1);
  const fo = 0.24, rc = 0.3;
  if (t < sw.tHit + fo) return 0.5 + 0.24 * easeOutCubic((t - sw.tHit) / fo);
  if (t < sw.tHit + fo + rc) return 0.74 + 0.26 * ((t - sw.tHit - fo) / rc);
  return 1;
}

function whiff(p, label) {
  const b = game.ball;
  const fh = (b.x - p.x) * p.rightX >= 0;
  const c = new T3.Vector3(p.x + p.rightX * (fh ? 1 : -1) * 0.95, 0.95, p.z - p.team.side * 0.45);
  startSwing(p, game.t + 0.13, fh ? 'fh' : 'bh', c, true);
  if (label) ui.pop(label, 'warn', p);
}

function onSwingInput(inp) {
  const g = game;
  if (g.paused || !g.humanTeam) return;
  inp.t = g.t;
  if (g.state === 'serve') { humanServeInput(inp); return; }
  if (g.state !== 'rally') return;
  const team = g.humanTeam;
  let p = team.players.find((q) => q.plan && !q.plan.chase);
  if (!p) {
    const chaser = team.players.find((q) => q.plan && q.plan.chase);
    const pp = chaser || team.players[0];
    if (!pp.swing) whiff(pp, chaser ? 'OUT OF REACH' : null);
    return;
  }
  // a whiff that has already swung through can be cut short by a fresh swing
  if (p.swing && !(p.swing.whiff && g.t > p.swing.tHit + 0.04)) return;
  const W = INPUT_WINDOWS[inp.src] || INPUT_WINDOWS.keys;
  // heavier balls and stronger opponents leave less room for error
  const b = g.ball;
  const inSpeed = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
  const lvl = g.mode === 'practice' ? 'rookie' : (g.cfg && g.cfg.level) || 'pro';
  const ws = (lvl === 'rookie' ? 1.15 : lvl === 'champ' ? 0.86 : 1) * clamp(1.1 - (inSpeed - 15) / 40, 0.75, 1.1);
  const early = W.ideal + (W.early - W.ideal) * ws, late = W.late * ws;
  const now = g.t - W.lat;
  const dtc = p.plan.t - now;
  if (dtc > early) { whiff(p, 'TOO EARLY'); return; }
  if (dtc < -late || p.plan.t - g.t < -0.09) { whiff(p, 'TOO LATE'); return; }
  const off = dtc - W.ideal;
  const e = off >= 0 ? off / (early - W.ideal) : off / (W.ideal + late);
  p.input = { e: clamp(e, -1, 1), aim: inp.aim || 0, lob: !!inp.lob, slice: !!inp.slice, src: inp.src, inSpeed };
  const plan = p.plan;
  const tHit = Math.max(g.t + PH_DT, plan.t);
  startSwing(p, tHit, plan.stroke, plan.contactP, false);
  scheduleHit(tHit, () => performHit(p, plan));
}

function humanServeInput(inp) {
  const g = game, s = g.serve;
  if (!s || s.player.team !== g.humanTeam) return;
  if (g.t < g.introUntil) return;
  if (s.stage === 'ready') { s.src = inp.src; doToss(s.player); return; }
  if (s.stage === 'toss') queueServeHit(s.player, inp);
}

function shotFrom(b) { return { x: b.x, y: b.y, z: b.z }; }

function performHit(p, plan) {
  const g = game, b = g.ball;
  if (g.state !== 'rally' || !b.live) return;
  if (!plan || p.plan !== plan) return;
  const human = p.team.controller === 'human';
  const standOk = hyp(p.x - plan.stand.x, p.z - plan.stand.z) <= (human ? 1.25 : 0.65);
  const dBall = hyp(b.x - plan.contactP.x, b.z - plan.contactP.z) + Math.abs(b.y - plan.contactP.y) * 0.6;
  const sideOk = b.z * p.team.side > 0.3;
  if (!standOk || !sideOk || dBall > (human ? 2.4 : 0.6) || b.y > 2.9) {
    p.plan = null;
    if (human) ui.pop('MISSED', 'warn', p);
    return;
  }
  const shot = human ? humanShot(p, plan) : aiShot(p, plan);
  b.vx = shot.v.vx; b.vy = shot.v.vy; b.vz = shot.v.vz; b.spin = shot.spin;
  b.cordOver = chance(0.5); b.rolling = false;
  const r = g.rally;
  r.hitter = p.team.index; r.bounces = 0; r.shots++; r.isServe = false; r.lastEventT = g.t;
  if (human) r.humanReturns++;
  p.plan = null;
  audio.hit(shot.power, b.x, b.z < -2, shot.type);
  if (shot.type === 'smash') { game.shake = Math.max(game.shake, 0.25); sparkle(b.x, b.y, b.z, 1.3); }
  if (human) {
    if (shot.perfect) { sparkle(b.x, b.y, b.z, 1.1); ui.pop('PERFECT!', 'good', p); crowdCheer(0.25); vibrate(30); }
    else if (shot.e > 0.7) ui.pop('EARLY', 'warn', p);
    else if (shot.e < -0.7) ui.pop('LATE', 'warn', p);
    else if (Math.abs(shot.e) < 0.4) { ui.pop('NICE', 'ok', p); vibrate(15); }
    else vibrate(12);
    if (g.mode === 'practice') ui.rally(r.humanReturns, g.practice.best);
  }
  if (r.shots >= 8 && r.shots % 4 === 0) crowdCheer(0.12);
  // AI approaches the net after a short ball in singles
  if (!game.doubles && !human && Math.abs(plan.contactP.z) < 7.5 && chance((p.team.level || LEVELS.pro).approach * 3)) p.role = 'front';
  else if (!game.doubles && p.role === 'front' && Math.abs(plan.contactP.z) > 9) p.role = 'back';
  if (!game.doubles && human) p.role = 'back';
  const other = g.teams[1 - p.team.index];
  planTeam(other);
  recoverTeam(p.team, PRED.b1.ok ? PRED.b1.x : 0);
}

function aiShot(p, plan) {
  const g = game, b = g.ball, from = shotFrom(b);
  const L = p.team.level || LEVELS.pro;
  const dir = -p.team.side;
  const opp = g.teams[1 - p.team.index];
  const hw = g.doubles ? COURT.HWD : COURT.HWS;
  const practice = g.mode === 'practice';
  const inSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
  const pressure = clamp((inSpeed - 14) / 16, 0, 1) * 0.7 + clamp(0.3 - (plan.margin || 0), 0, 0.3) * 2.5 + (plan.contactP.y < 0.45 ? 0.3 : 0) + (plan.serve ? 0.25 : 0);
  let oppMain = opp.players[0];
  for (const q of opp.players) if (q.role === 'back') oppMain = q;
  const oppNet = opp.players.find((q) => Math.abs(q.z) < 6);
  let type = 'drive';
  if (plan.stroke === 'smash') type = 'smash';
  else if (plan.pre) type = 'volley';
  else if (!practice) {
    if (oppNet && !g.doubles && chance(L.lob + 0.14)) type = 'lob';
    else if (!oppNet && chance(L.drop) && Math.abs(from.z) < COURT.HL - 0.5 && Math.abs(oppMain.z) > COURT.HL) type = 'drop';
  }
  const openX = oppMain.x > 0.3 ? -1 : oppMain.x < -0.3 ? 1 : (chance(0.5) ? 1 : -1);
  let tx, tz, speed, spin, clear;
  if (type === 'smash') { tz = dir * rand(6.5, 10); tx = openX * rand(1.2, hw - 0.7); speed = rand(24, 30); spin = 0.15; clear = 0.08; }
  else if (type === 'volley') {
    const away = g.doubles && oppNet ? (oppNet.x > 0 ? -1 : 1) : openX;
    tz = dir * rand(6.0, 9.4); tx = away * rand(1.3, hw - 0.6); speed = rand(13.5, 18); spin = 0.12; clear = 0.12;
  } else if (type === 'lob') { tz = dir * rand(9.2, 10.5); tx = rand(-2.6, 2.6); spin = 0.25; clear = 2.2; speed = 10; }
  else if (type === 'drop') { tz = dir * rand(1.9, 3.5); tx = rand(-2.8, 2.8); speed = rand(8, 10); spin = -0.45; clear = 0.2; }
  else {
    tz = dir * rand(L.depth[0], L.depth[1]);
    if (practice) tx = clamp(oppMain.x + rand(-2.3, 2.3), -3.3, 3.3);
    else if (chance(L.aggr)) tx = openX * rand(L.width * 0.55, L.width);
    else tx = rand(-L.width * 0.55, L.width * 0.55);
    if (g.doubles && oppNet) tx = clamp(tx, -4.6, 4.6);
    speed = rand(L.pace[0], L.pace[1]) * (1 - pressure * 0.2);
    if (practice) speed = clamp(13.2 + g.rally.humanReturns * 0.35, 13.2, 20);
    spin = rand(0.45, 0.85); clear = rand(0.3, 0.75) - L.aggr * 0.15;
  }
  let err = (practice ? 0.012 : L.err) * (1 + pressure * 2.4);
  if (type === 'drop') err *= 1.8;
  if (type === 'lob') err *= 1.25;
  err += (Math.max(0, Math.abs(tx) - (hw - 1.0)) * 0.35 + Math.max(0, Math.abs(tz) - 9.8) * 0.4) * 0.1;
  const kind = chance(err) ? pick(['wide', 'long', 'net']) : 'ok';
  if (kind === 'wide') tx = (tx >= 0 ? 1 : -1) * (hw + rand(0.15, 0.9));
  if (kind === 'long') tz = dir * (COURT.HL + rand(0.2, 1.2));
  if (type === 'lob') speed = hyp(tx - from.x, tz - from.z) / rand(1.9, 2.3);
  const sol = kind === 'net' ? netShot(from, tx, tz, speed, spin) : aimShot(from, tx, tz, speed, spin, clear);
  return { v: sol.v, spin, type, power: clamp(speed / 26, 0.3, 1), perfect: false, e: 0 };
}

function humanShot(p, plan) {
  const g = game, b = g.ball, from = shotFrom(b);
  const inp = p.input || { e: 0, aim: 0 };
  const dir = -p.team.side;
  const hw = g.doubles ? COURT.HWD : COURT.HWS;
  const e = inp.e, ae = Math.abs(e), q = 1 - ae;
  const fhStroke = plan.stroke === 'fh' || plan.stroke === 'vfh' || plan.stroke === 'smash';
  const hand = fhStroke ? 1 : -1;
  let d = -e * hand;
  if (inp.aim) d = inp.aim * 0.85 + d * (inp.src === 'cam' ? 0.22 : 0.3);
  else if (ae < 0.2) d += rand(-0.4, 0.4);
  d = clamp(d, -1.25, 1.25);
  const xr = p.rightX;
  let type = inp.lob ? 'lob' : inp.slice ? 'drop' : plan.stroke === 'smash' ? 'smash' : plan.pre ? 'volley' : 'drive';
  if (plan.stroke === 'smash') type = 'smash';
  let tx = d * xr * (hw - 0.7), tz, speed, spin, clear;
  if (type === 'smash') { tz = dir * rand(6.5, 10); speed = lerp(23, 31, q); spin = 0.15; clear = 0.08; tx = d * xr * (hw - 0.5); }
  else if (type === 'volley') { tz = dir * lerp(6.0, 9.2, q); speed = lerp(12.5, 19, q); spin = 0.12; clear = 0.12; tx = d * xr * (hw - 0.45); }
  else if (type === 'lob') { tz = dir * rand(9.0, 10.5); spin = 0.25; clear = 2.0; tx = d * xr * 2.6; speed = 10; }
  else if (type === 'drop') { tz = dir * rand(2.0, 3.8); speed = rand(8.2, 10); spin = -0.45; clear = 0.22; tx = d * xr * 3.0; }
  else { tz = dir * (lerp(7.4, 10.1, q) + rand(-0.35, 0.35)); speed = lerp(14.5, 25.5, q * q); spin = 0.5 + q * 0.3; clear = lerp(0.7, 0.3, q); }
  let kind = 'ok';
  if (ae > 0.78) {
    const k = (ae - 0.78) / 0.22;
    if (chance(0.3 + 0.55 * k)) kind = chance(0.55) ? 'wide' : (e < 0 ? 'net' : 'long');
  } else if (ae >= 0.18) {
    // a heavy ball or a stretched reach can still beat an imperfect swing
    const heavy = clamp(((inp.inSpeed || 15) - 16) / 12, 0, 1);
    const stretch = clamp((0.22 - (plan.margin === undefined ? 0.5 : plan.margin)) / 0.22, 0, 1);
    const risk = (0.05 + heavy * 0.16 + stretch * 0.25) * clamp((ae - 0.15) / 0.45, 0.25, 1);
    if (chance(risk)) kind = pick(['wide', 'long', 'net']);
  }
  tx += rand(-0.3, 0.3) * (1 - q * 0.6);
  if (kind === 'wide') { const sgnx = tx === 0 ? (chance(0.5) ? 1 : -1) : Math.sign(tx); tx = sgnx * (hw + rand(0.15, 1.0)); }
  if (kind === 'long') tz = dir * (COURT.HL + rand(0.25, 1.4));
  if (type === 'lob') speed = hyp(tx - from.x, tz - from.z) / rand(2.0, 2.4);
  const sol = kind === 'net' ? netShot(from, tx, tz, speed, spin) : aimShot(from, tx, tz, speed, spin, clear);
  return { v: sol.v, spin, type, power: clamp(speed / 26, 0.3, 1) * (0.7 + q * 0.3), perfect: ae < 0.18, e };
}

/* ---- rally: rules ------------------------------------------------------------- */
function onBallEvent(ev) {
  const g = game, b = g.ball, r = g.rally;
  const ex = EV.x, ez = EV.z, evy = EV.vy;
  if (ev === 'bounce') {
    const strength = clamp(-evy / 9, 0.08, 1);
    audio.bounce(strength, ex, ez < -3, g.surf.key);
    if (strength > 0.15) {
      puffDust(ex, ez, g.surf.dustAmt * strength);
      addMark(ex, ez, b.vx, b.vz, g.surf.key === 'clay' ? 8 : 2.2);
    }
  } else if (ev === 'net' || ev === 'cordback') audio.netHit(ex);
  else if (ev === 'cord') audio.netCord(ex);
  if (!r || !b.live || g.state !== 'rally') return;
  r.lastEventT = g.t;
  if (ev === 'net' || ev === 'cordback') {
    if (r.isServe) { fault('net'); return; }
    endPoint(1 - r.hitter, 'net');
    return;
  }
  if (ev === 'cord') {
    if (r.isServe) r.let = true;
    else { audio.ooh(); planTeam(g.teams[1 - r.hitter]); }
    return;
  }
  if (ev !== 'bounce') return;
  const half = ez >= 0 ? 0 : 1;
  if (r.isServe) {
    if (half === r.hitter) { fault('net'); return; }
    if (inBox(ex, ez, g.serve.box)) {
      if (r.let) { callLet(); return; }
      r.isServe = false; r.bounces = 1;
      if (r.first) g.stats[r.hitter].firstIn++;
      return;
    }
    showCallRing(ex, ez, 0xff4a3d);
    fault('out');
    return;
  }
  if (r.bounces === 0) {
    if (half === r.hitter) { endPoint(1 - r.hitter, 'net'); return; }
    if (!inCourt(ex, ez, g.doubles)) {
      showCallRing(ex, ez, 0xff4a3d);
      endPoint(1 - r.hitter, 'out');
      return;
    }
    r.bounces = 1;
    return;
  }
  endPoint(r.hitter, r.shots === 1 && g.mode !== 'practice' ? 'ace' : 'winner');
}

function stopRally() {
  const g = game;
  g.ball.live = false;
  g.state = 'point';
  g.hits.length = 0;
  for (const t of g.teams) for (const p of t.players) { p.plan = null; p.relaxed = false; }
  hideGuides();
}

function fault(kind) {
  const g = game, r = g.rally;
  if (r.ended) return;
  stopRally();
  if (g.serve.number === 1) {
    r.ended = true;
    if (g.mode !== 'demo') {
      ui.banner('FAULT', 'bad', 1.2);
      audio.say('Fault');
    }
    after(1.45, () => { g.serveNumber = 2; setupPoint(true); });
  } else {
    g.state = 'rally';
    endPoint(1 - r.hitter, 'double');
  }
}

function callLet() {
  const g = game;
  stopRally();
  g.rally.ended = true;
  if (g.mode !== 'demo') { ui.banner('LET', 'neutral', 1.1); audio.say('Let'); }
  after(1.4, () => setupPoint(true));
}

function endPoint(winner, reason) {
  const g = game, r = g.rally;
  if (!r || r.ended) return;
  r.ended = true;
  stopRally();
  const loser = 1 - winner;
  const st = g.stats;
  if (g.mode === 'practice') { practicePointOver(winner, reason); return; }
  st[winner].points++;
  if (reason === 'ace') st[winner].aces++;
  else if (reason === 'winner') st[winner].winners++;
  else if (reason === 'out' || reason === 'net') st[loser].errors++;
  else if (reason === 'double') st[loser].df++;
  g.longestRally = Math.max(g.longestRally, r.shots);
  const demo = g.mode === 'demo';
  const big = reason === 'ace' || reason === 'winner' || r.shots >= 7;
  if (!demo) {
    const labels = { ace: ['ACE!', 'gold'], winner: ['WINNER!', 'gold'], out: ['OUT', 'bad'], net: ['NET', 'bad'], double: ['DOUBLE FAULT', 'bad'] };
    const [text, kind] = labels[reason] || ['POINT', 'neutral'];
    ui.banner(text, kind, 1.15);
    if (reason === 'out') audio.say('Out!');
    else if (reason === 'double') audio.say('Fault');
  }
  if (big) { audio.applause(0.9); crowdCheer(0.9); }
  else { audio.applause(0.4); crowdCheer(0.35); }
  for (const p of g.teams[winner].players) { p.anim = 'cheer'; p.animBig = false; }
  for (const p of g.teams[loser].players) p.anim = 'sad';
  after(demo ? 1.4 : 1.3, () => afterPoint(winner, reason));
}

function practicePointOver(winner, reason) {
  const g = game, r = g.rally;
  const n = r.humanReturns;
  const best = Math.max(g.practice.best, n);
  const newBest = n > g.practice.best && n > 0;
  g.practice.best = best;
  g.practice.count = n;
  store.set('bestRally', best);
  ui.rally(n, best);
  drawBoardNow();
  if (newBest) { ui.banner('NEW BEST  ' + n, 'gold', 1.5); audio.chime(true); audio.applause(0.9); crowdCheer(0.8); }
  else if (n >= 1) { ui.banner('RALLY  ' + n, 'neutral', 1.2); audio.applause(0.35); }
  else ui.banner(reason === 'out' ? 'OUT' : reason === 'net' ? 'NET' : 'MISSED', 'bad', 1.0);
  after(1.6, () => setupPoint());
}

function afterPoint(winner) {
  const g = game;
  for (const t of g.teams) for (const p of t.players) { p.anim = 'ready'; }
  const res = g.score.award(winner);
  ui.updateScore();
  drawBoardNow();
  if (g.mode === 'demo') {
    if (res.type === 'match') after(2.2, startDemo);
    else after(0.9, () => setupPoint());
    if (chance(0.12)) crowdWave();
    return;
  }
  const names = teamNames(false), callNames = teamNames(true);
  const humanWon = g.humanTeam && winner === g.humanTeam.index;
  if (res.type === 'point') {
    ui.banner(g.score.banner(names), 'score', 1.35);
    audio.say(g.score.call(callNames));
    after(1.55, () => setupPoint());
  } else if (res.type === 'game') {
    ui.banner('GAME  ' + names[winner], 'game', 2.0);
    if (res.tbStarted) ui.sub('TIEBREAK', 2.2);
    audio.say(g.score.gameCall(res, callNames));
    audio.chime(humanWon);
    audio.applause(0.7); crowdCheer(0.6);
    after(2.7, () => setupPoint());
  } else if (res.type === 'set') {
    ui.banner('SET  ' + names[winner], 'game', 2.6);
    audio.say(g.score.gameCall(res, callNames));
    audio.chime(humanWon);
    audio.applause(1); crowdCheer(1);
    after(3.4, () => setupPoint());
  } else if (res.type === 'match') {
    matchOver(winner, res);
  }
}

function matchOver(winner, res) {
  const g = game;
  g.state = 'over';
  const names = teamNames(false), callNames = teamNames(true);
  const humanWon = g.humanTeam && winner === g.humanTeam.index;
  ui.banner(humanWon ? 'YOU WIN!' : names[winner] + ' WINS', humanWon ? 'gold' : 'game', 3.4);
  audio.say(g.score.gameCall(res, callNames));
  audio.fanfare(!!humanWon);
  audio.applause(1); crowdCheer(1);
  for (const p of g.teams[winner].players) { p.anim = 'cheer'; p.animBig = true; }
  for (const p of g.teams[1 - winner].players) p.anim = 'sad';
  if (humanWon) { startConfetti(); crowdWave(); }
  g.celebrate = g.teams[winner].players[0];
  g.camMode = 'celebrate'; g.camT0 = g.t;
  ui.prompt(null);
  const rec = store.get('record', { w: 0, l: 0 });
  if (humanWon) rec.w++; else rec.l++;
  store.set('record', rec);
  after(4.6, () => ui.showResults(winner));
}

/* ---- per-frame update ------------------------------------------------------------ */
function updatePlayers(dt) {
  const g = game;
  for (const t of g.teams) for (const p of t.players) updatePlayer(p, dt);
}

function updatePlayer(p, dt) {
  const g = game, b = g.ball;
  // AI swings on its own schedule
  if (p.plan && p.plan.willHit && !p.plan.chase && !p.swing && p.team.controller === 'ai' && g.state === 'rally' && g.t >= p.plan.t - 0.32) {
    startSwing(p, p.plan.t, p.plan.stroke, p.plan.contactP, false);
  }
  // movement
  let tx = p.tx, tz = p.tz;
  const frozen = g.state === 'serve' || g.state === 'intro' || g.t < p.moveAt;
  if (frozen) { tx = p.x; tz = p.z; }
  const side = p.team.side;
  tz = side > 0 ? clamp(tz, 0.7, COURT.RUN_Z - 1.4) : clamp(tz, -(COURT.RUN_Z - 1.4), -0.7);
  tx = clamp(tx, -COURT.RUN_X + 0.9, COURT.RUN_X - 0.9);
  const dx = tx - p.x, dz = tz - p.z, dist = hyp(dx, dz);
  let want = 0;
  if (dist > 0.02) want = Math.min(p.speed, dist * 5.5 + 0.15);
  if (g.state === 'point' || g.state === 'over') want = Math.min(want, 1.6);
  const ux = dist > 1e-5 ? dx / dist : 0, uz = dist > 1e-5 ? dz / dist : 0;
  const dvx = ux * want - p.vx, dvz = uz * want - p.vz;
  const dv = hyp(dvx, dvz), maxDv = 36 * dt;
  const k = dv > maxDv ? maxDv / dv : 1;
  p.vx += dvx * k; p.vz += dvz * k;
  p.x += p.vx * dt; p.z += p.vz * dt;
  const root = p.ath.root;
  root.position.set(p.x, 0, p.z);
  // facing: square to the net, leaning into long sideways runs
  const base = side > 0 ? 0 : PI;
  const spd = hyp(p.vx, p.vz);
  let yaw = base;
  if (g.state === 'serve' && g.serve && g.serve.player === p) yaw = base - 0.35;
  else if (!p.swing && spd > 2.6 && g.state === 'rally') yaw = base - clamp((p.vx * p.rightX) / spd, -1, 1) * 0.38;
  p.yaw += wrapAngle(yaw - p.yaw) * (1 - Math.exp(-10 * dt));
  root.rotation.y = p.yaw;
  // animation command
  const c = p.ath.cmd;
  c.speed = spd;
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
  c.lx = p.vx * cy - p.vz * sy;
  c.lz = p.vx * sy + p.vz * cy;
  if (!p.lookV) p.lookV = new T3.Vector3();
  c.look = b.visible ? p.lookV.set(b.x, b.y, b.z) : null;
  if (p.swing) {
    const s = swingParam(p.swing, g.t);
    c.action = p.swing.stroke === 'serve' ? 'serve' : 'swing';
    c.stroke = p.swing.stroke; c.s = s;
    c.contactWorld = p.swing.contact; c.crouch = p.swing.crouch;
    if (!p.swing.whooshed && s > 0.3) { p.swing.whooshed = true; audio.whoosh(p.swing.whiff ? 0.4 : 0.7, p.x); }
    if (s >= 1) p.swing = null;
  } else {
    c.action = p.anim === 'bounce' ? 'bounce' : p.anim === 'toss' ? 'toss' : p.anim === 'cheer' ? 'cheer' : p.anim === 'sad' ? 'sad' : 'ready';
    c.s = p.animT; c.big = p.animBig; c.contactWorld = null;
    c.relaxed = p.relaxed || g.state === 'point' || g.state === 'over';
  }
  p.ath.animate(dt);
}

function updateHeldBall() {
  const b = game.ball, p = b.held;
  if (!p) return;
  p.ath.root.updateMatrixWorld(true);
  p.ath.handWorld('L', _gv2);
  let y = _gv2.y - 0.07;
  if (p.anim === 'bounce') {
    const k = Math.sin(p.animT * PI);
    y = lerp(y, BALL_R, k * k * 0.98);
  }
  b.x = _gv2.x; b.y = Math.max(BALL_R, y); b.z = _gv2.z;
  b.vx = b.vy = b.vz = 0;
}

/* ---- guides: landing spot and swing timing ------------------------------------ */
function hideGuides() {
  if (!world.landRing) return;
  world.landRing.visible = false;
  world.timeRing.visible = false;
  world.timeTarget.visible = false;
}

function updateGuides() {
  const g = game;
  if (!world.landRing) return;
  if (!guidesOn() || g.state !== 'rally' || !g.humanTeam) { hideGuides(); return; }
  const p = g.humanTeam.players.find((q) => q.plan);
  if (!p) { hideGuides(); return; }
  const plan = p.plan;
  const lr = world.landRing;
  if (plan.b1 && plan.b1.ok && g.t < plan.b1.t) {
    lr.visible = true;
    lr.position.set(plan.b1.x, 0.011, plan.b1.z);
    const isIn = plan.serve ? inBox(plan.b1.x, plan.b1.z, g.serve.box) : inCourt(plan.b1.x, plan.b1.z, g.doubles);
    lr.material.color.setHex(isIn ? 0xd9f23f : 0xff5a4a);
    const left = plan.b1.t - g.t;
    lr.scale.setScalar(1 + clamp(left, 0, 1.2) * 1.4);
    lr.material.opacity = 0.9;
  } else lr.visible = false;
  const tr = world.timeRing, tt = world.timeTarget;
  if (plan.chase || p.swing) { tr.visible = false; tt.visible = false; return; }
  const W = INPUT_WINDOWS[g.cfg.controls === 'webcam' ? 'cam' : g.cfg.controls === 'touch' ? 'touch' : 'keys'];
  const until = plan.t - W.ideal + W.lat - g.t;
  if (until > 1.4 || until < -0.25) { tr.visible = false; tt.visible = false; return; }
  tr.visible = true; tt.visible = true;
  tr.position.set(p.x, 0.012, p.z); tt.position.set(p.x, 0.013, p.z);
  const r = 0.65 + Math.max(0, until) * 1.25;
  tr.scale.setScalar(r / 0.96);
  tt.scale.setScalar(1);
  const close = Math.abs(until) < 0.07;
  tr.material.color.setHex(close ? 0x3ddc84 : 0xd9f23f);
  tt.material.color.setHex(close ? 0x3ddc84 : 0xffffff);
}

/* ---- watchdog ------------------------------------------------------------------- */
function watchdog() {
  const g = game;
  if (g.state === 'rally' && g.rally && g.t - g.rally.lastEventT > 9) {
    stopRally(); g.rally.ended = true;
    after(0.6, () => setupPoint(true));
  }
  if (g.state === 'serve' && g.serve && g.t - g.serve.t0 > 14 && g.serve.player.team.controller === 'ai') {
    if (g.serve.stage === 'ready') doToss(g.serve.player);
  }
  if ((g.state === 'point') && !g.timers.length) after(0.5, () => setupPoint());
}

/* ---- camera --------------------------------------------------------------------- */
const camRig = { pos: new T3.Vector3(24, 12, 26), look: new T3.Vector3(0, 0.5, 0), tp: new T3.Vector3(), tl: new T3.Vector3(), orbit: 0.7, fov: 45 };

function focusPlayer() {
  const g = game;
  const team = g.humanTeam || g.teams[0];
  if (!team) return null;
  let p = team.players.find((q) => q.plan) || team.players.find((q) => q.role === 'back') || team.players[0];
  if (g.state === 'serve' && g.serve) {
    p = g.serve.team === team.index ? g.serve.player : team.players.find((q) => q === g.serve.receiver) || p;
  }
  return p;
}

function camTargets(dt) {
  const g = game;
  const port = clamp((1.3 - world.aspect) / 0.8, 0, 1);
  let fov = lerp(44, 62, port);
  if (g.camMode === 'orbit') {
    camRig.orbit += dt * 0.045;
    const R = lerp(31, 40, port);
    camRig.tp.set(Math.sin(camRig.orbit) * R, lerp(12.5, 16, port), Math.cos(camRig.orbit) * R);
    camRig.tl.set(0, 0.4, 0);
    fov = lerp(40, 58, port);
  } else if (g.camMode === 'play' || g.camMode === 'intro') {
    const f = focusPlayer();
    const fx = f ? clamp(f.x, -5.5, 5.5) : 0;
    const fz = f ? clamp(f.z, COURT.HL - 1, COURT.HL + 5) : COURT.HL;
    const back = Math.max(0, fz - (COURT.HL + 0.8));
    camRig.tp.set(fx * lerp(0.55, 0.8, port), lerp(5.4, 8.8, port) + back * 0.25, lerp(20.6, 24.6, port) + back * 0.9);
    camRig.tl.set(fx * 0.3, 0.4, lerp(-0.6, -0.2, port));
    fov = lerp(48, 64, port);
    if (g.camMode === 'intro') {
      const k = easeInOutCubic(clamp((g.t - g.camT0) / 3.0, 0, 1));
      _gv.set(-17, 13, 24);
      camRig.tp.lerpVectors(_gv, camRig.tp, k);
      _gv.set(0, 1.2, -6);
      camRig.tl.lerpVectors(_gv, camRig.tl, k);
    }
  } else if (g.camMode === 'celebrate' && g.celebrate) {
    const w = g.celebrate;
    const a = (g.t - g.camT0) * 0.35 + (w.team.side > 0 ? 0.25 : PI + 0.25);
    const R = lerp(5.2, 7.5, port);
    camRig.tp.set(w.x + Math.sin(a) * R, lerp(2.2, 3.2, port), w.z + Math.cos(a) * R);
    camRig.tl.set(w.x, 1.2, w.z);
    fov = lerp(40, 56, port);
  }
  return fov;
}

function updateCamera(dt) {
  const c = world.camera;
  const fov = camTargets(dt);
  const mode = game.camMode;
  const rate = mode === 'play' ? 3.4 : mode === 'intro' ? 6 : 1.8;
  const k = 1 - Math.exp(-rate * dt);
  camRig.pos.lerp(camRig.tp, k);
  camRig.look.lerp(camRig.tl, k);
  c.position.copy(camRig.pos);
  if (game.shake > 0 && settings.shake && !reducedMotion) {
    const s = game.shake * 0.12;
    c.position.x += rand(-s, s); c.position.y += rand(-s, s);
  }
  game.shake = Math.max(0, game.shake - dt * 1.2);
  c.lookAt(camRig.look);
  if (Math.abs(c.fov - fov) > 0.01) { c.fov = damp(c.fov, fov, 3, dt); c.updateProjectionMatrix(); }
}

function snapCamera(fully) {
  camTargets(0);
  if (fully) { camRig.pos.copy(camRig.tp); camRig.look.copy(camRig.tl); }
}

/* ---- top level -------------------------------------------------------------------- */
function updateGame(dt) {
  const g = game;
  if (g.paused || !g.teams.length) return;
  const sdt = dt * g.timeScale;
  g.acc += sdt;
  let steps = 0;
  while (g.acc >= PH_DT && steps < 60) {
    g.acc -= PH_DT; steps++;
    if (g.hits.length) runHits();
    const b = g.ball;
    if (b.phys) {
      const ev = ballStep(b, PH_DT, g.surf);
      if (ev) onBallEvent(ev);
    }
    g.t += PH_DT;
  }
  if (steps >= 60) g.acc = 0;
  runTimers();
  if (g.state === 'serve' && g.serve) updateServe(sdt);
  updatePlayers(sdt);
  updateHeldBall();
  updateGuides();
  if (g.umpire) {
    const b = g.ball, u = g.umpire;
    if (!u.lookV) u.lookV = new T3.Vector3();
    u.cmd.look = b.visible ? u.lookV.set(b.x, b.y, b.z) : null;
    u.animate(sdt);
  }
  watchdog();
}

function vibrate(ms) {
  try { if (navigator.vibrate && game.cfg && game.cfg.controls !== 'keys') navigator.vibrate(ms); } catch (e) { /* not supported */ }
}

function buildUmpire() {
  const u = new Athlete({ shirt: '#1d2f4f', shirt2: '#ffffff', shorts: '#1d2f4f', skin: 2, hair: 5, style: 'buzz', band: '#1d2f4f' }, { noRacket: true });
  u.root.position.set(COURT.POST_X + 1.25, 1.96, 0);
  u.root.rotation.y = PI / 2;
  u.cmd.action = 'sit';
  world.scene.add(u.root);
  game.umpire = u;
}
