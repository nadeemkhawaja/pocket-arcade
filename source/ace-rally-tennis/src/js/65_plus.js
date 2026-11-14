/* ==========================================================================
   Extras: invincible rules, the power shot, medals and the court they unlock
   ========================================================================== */

const MEDALS = [
  { id: 'first', name: 'First Win', desc: 'Win a match' },
  { id: 'ace', name: 'Untouchable Serve', desc: 'Serve an ace' },
  { id: 'power', name: 'Power Player', desc: 'Land a power shot' },
  { id: 'rally10', name: 'Marathon', desc: 'Win a rally of 10 shots or more' },
  { id: 'winners', name: 'Shot Maker', desc: 'Hit 5 winners in one match' },
  { id: 'clean', name: 'Clean Sheet', desc: 'Win a match without a double fault' },
  { id: 'doubles', name: 'Team Player', desc: 'Win a doubles match' },
  { id: 'rally15', name: 'Wall Of Steel', desc: 'Return 15 balls in one practice rally' },
  { id: 'pro', name: 'Pro Tour', desc: 'Beat Pro or better. Unlocks the Royal court' },
  { id: 'champ', name: 'Giant Killer', desc: 'Beat the Champion' },
  { id: 'legend', name: 'Living Legend', desc: 'Beat the Legend' },
  { id: 'grand', name: 'Grand Finale', desc: 'Win a best of 3 sets match' },
  { id: 'cup', name: 'Silverware', desc: 'Win a career cup final' },
  { id: 'career', name: 'World Number One', desc: 'Win the Grand Slam final in Career' }
];
const PROG = Object.assign({ ach: {} }, store.get('progress', {}));
const plus = { streak: 0, ready: false, toastT: 0, queue: [] };

function plusLive() { return game.mode !== 'demo' && !(game.cfg && game.cfg.invincible); }
function plusCourtOpen(key) { const s = SURFACES[key]; return !!s && (!s.locked || !!PROG.ach[s.locked]); }
function medalTotal() { return MEDALS.filter((m) => PROG.ach[m.id]).length; }

function toast(title, text) {
  plus.queue.push([title, text]);
  if (plus.queue.length === 1) showToast();
}
function showToast() {
  const el = $('toast'), q = plus.queue[0];
  if (!q) { el.hidden = true; return; }
  el.firstElementChild.textContent = q[0]; el.lastElementChild.textContent = q[1];
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  audio.chime(true);
  setTimeout(() => { plus.queue.shift(); showToast(); }, 2600);
}

function award(id) {
  if (!plusLive() || PROG.ach[id]) return;
  PROG.ach[id] = 1;
  store.set('progress', PROG);
  const m = MEDALS.find((k) => k.id === id);
  if (m) toast('Medal earned', m.name);
  if (id === 'pro') {
    toast('New court', SURFACES.royal.name);
    $('optShirt').innerHTML = ''; $('optSkin').innerHTML = '';
    ui.buildSetup();
  }
  plusMedalCount();
}
function plusMedalCount() { const el = $('medalCount'); if (el) el.textContent = medalTotal() + ' / ' + MEDALS.length; careerTag(); }

function plusShowMedals() {
  $('medalList').innerHTML = MEDALS.map((m) => {
    const got = !!PROG.ach[m.id];
    return '<div class="medal' + (got ? ' got' : '') + '"><i></i><div><b>' + m.name + '</b><small>' + m.desc + '</small></div></div>';
  }).join('');
  $('medalHint').textContent = medalTotal() + ' of ' + MEDALS.length + ' earned. Medals are not awarded in Invincible matches.';
}

/* ---- power shot: three perfect swings in a row charge the next one ---------------- */
function plusMeter() {
  const el = $('power');
  if (!el) return;
  el.hidden = game.mode === 'demo';
  el.classList.toggle('ready', plus.ready);
  const pips = el.querySelectorAll('i');
  pips.forEach((p, i) => p.classList.toggle('on', plus.ready || i < plus.streak));
}
function plusReset() {
  plus.streak = 0; plus.ready = false;
  plusMeter();
  const tag = $('shieldTag');
  if (tag) tag.hidden = !(game.cfg && game.cfg.invincible);
  plusMedalCount();
}
function plusPowerReady() { return plus.ready; }

function plusOnHit(p, shot, b) {
  const g = game;
  if (shot.pw) {
    plus.ready = false; plus.streak = 0;
    ui.pop('POWER SHOT!', 'good', p);
    g.shake = Math.max(g.shake, 0.32);
    sparkle(b.x, b.y, b.z, 1.9); sparkle(b.x, b.y + 0.2, b.z, 1.2);
    crowdCheer(0.5); vibrate(50);
    audio.powerShot();
    b.fire = 1.2;
    award('power');
  } else if (shot.perfect) {
    if (!plus.ready) {
      plus.streak = Math.min(3, plus.streak + 1);
      if (plus.streak >= 3) { plus.ready = true; ui.sub('POWER SHOT READY'); audio.chime(true); }
    }
  } else if (Math.abs(shot.e) >= 0.4 && !plus.ready) plus.streak = 0;
  plusMeter();
  if (g.mode === 'practice' && g.rally.humanReturns >= 15) award('rally15');
}

/** A ball struck with a power shot leaves sparks behind it for a moment. */
function plusUpdate(dt) {
  if (dt > 0) plusSqueaks(dt);
  const b = game.ball;
  if (!b || !b.fire) return;
  b.fire = Math.max(0, b.fire - dt);
  if (b.live && Math.random() < 0.7) sparkle(b.x, b.y, b.z, 0.55);
}

/* ---- invincible: a point the player would lose is replayed instead ---------------- */
function plusShield(winner) {
  const g = game;
  if (!(g.cfg && g.cfg.invincible) || g.mode !== 'match' || !g.humanTeam || winner === g.humanTeam.index) return false;
  ui.banner('SHIELD  POINT REPLAYED', 'neutral', 1.25);
  audio.shield();
  for (const t of g.teams) for (const p of t.players) p.anim = 'ready';
  after(1.5, () => setupPoint(true));
  return true;
}

function plusOnPoint(winner, reason) {
  const g = game;
  if (!g.humanTeam || winner !== g.humanTeam.index) return;
  if (reason === 'ace') award('ace');
  if (g.rally.shots >= 10) award('rally10');
  if (g.stats[winner].winners >= 5) award('winners');
}

function plusOnMatch(won) {
  const g = game;
  careerOnMatch(won);
  if (!won || !g.humanTeam) return;
  award('first');
  const lvl = g.cfg.level, me = g.humanTeam.index;
  if (lvl === 'pro' || lvl === 'champ' || lvl === 'legend') award('pro');
  if (lvl === 'champ' || lvl === 'legend') award('champ');
  if (lvl === 'legend') award('legend');
  if (g.doubles) award('doubles');
  if (g.stats[me].df === 0) award('clean');
  if (g.cfg.format === 's3') award('grand');
}

/* two small sounds of its own */
AudioEngine.prototype.powerShot = function () {
  if (!this.ctx || !settings.sfx) return;
  const c = this.ctx, t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.16);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g); g.connect(this.sfxBus || this.master || c.destination); o.start(t); o.stop(t + 0.32);
};
AudioEngine.prototype.shield = function () {
  if (!this.ctx || !settings.sfx) return;
  const c = this.ctx, t = c.currentTime;
  for (const [f, d] of [[660, 0], [990, 0.07], [1320, 0.14]]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(0.1, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.3);
    o.connect(g); g.connect(this.sfxBus || this.master || c.destination); o.start(t + d); o.stop(t + d + 0.32);
  }
};

/* ---- sound polish: stadium echo, string ping, effort grunts and shoe squeaks ---------- */
(function tennisSound() {
  const baseUnlock = AudioEngine.prototype.unlock;
  AudioEngine.prototype.unlock = function () {
    baseUnlock.call(this);
    if (this.room || !this.ctx || !this.sfxBus) return;
    this.room = true;
    try {
      const c = this.ctx, len = Math.floor(c.sampleRate * 1.6), buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
      const cv = c.createConvolver(), wet = c.createGain(), lp = c.createBiquadFilter();
      cv.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 3200; wet.gain.value = 0.2;
      this.sfxBus.connect(cv); cv.connect(lp); lp.connect(wet); wet.connect(this.master);
    } catch (e) { /* the dry sound still plays */ }
  };
  const baseHit = AudioEngine.prototype.hit;
  AudioEngine.prototype.hit = function (power, x, far, kind) {
    baseHit.call(this, power, x, far, kind);
    if (!this.ok()) return;
    const t = this.ctx.currentTime, p = clamp(power, 0, 1), o = this.out((far ? 0.5 : 0.8) * (0.4 + p * 0.6), x / 9);
    // the strings ring for a moment after the ball leaves
    this.tone('sine', 1650 + Math.random() * 200, 1500, t + 0.004, 0.16, 0.07 + p * 0.05, o, 0.002);
    this.tone('sine', 2480 + Math.random() * 200, 2300, t + 0.004, 0.1, 0.03, o, 0.002);
    if (p > 0.78) {
      // effort: a short voiced grunt on the big swings
      const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime((far ? 190 : 150) * (0.92 + Math.random() * 0.16), t); osc.frequency.exponentialRampToValueAtTime(95, t + 0.2);
      this.env(g.gain, t, 0.13, 0.02, 0.2);
      for (const f of [650, 1150]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 5; osc.connect(b); b.connect(g); }
      g.connect(o); osc.start(t); osc.stop(t + 0.3);
    }
  };
  AudioEngine.prototype.squeak = function (x, far) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime, o = this.out(far ? 0.1 : 0.2, x / 9), f = 2300 + Math.random() * 900;
    this.tone('triangle', f, f * 1.25, t, 0.07, 0.5, o, 0.01);
    this.burst(t, 0.05, 0.25, 'bandpass', f * 1.4, 6, o, 0.008);
  };
})();
const squeakState = new Map();
/** Shoes squeak when a player stops hard or changes direction on a hard court. */
function plusSqueaks(dt) {
  const g = game;
  if (!g.teams || !g.surf || g.surf.sound !== 'hard' || g.state === 'menu') return;
  for (const t of g.teams) for (const p of t.players) {
    let s = squeakState.get(p);
    if (!s) { s = { x: p.x, z: p.z, vx: 0, vz: 0, cd: 0 }; squeakState.set(p, s); }
    const vx = (p.x - s.x) / Math.max(dt, 1e-3), vz = (p.z - s.z) / Math.max(dt, 1e-3);
    const sp0 = Math.hypot(s.vx, s.vz), sp1 = Math.hypot(vx, vz);
    s.cd -= dt;
    if (s.cd <= 0 && sp0 > 3.2 && sp0 < 14 && (sp1 < sp0 * 0.35 || vx * s.vx + vz * s.vz < 0)) { audio.squeak(p.x, p.z < 0); s.cd = 0.45; }
    s.x = p.x; s.z = p.z; s.vx = vx; s.vz = vz;
  }
}

/* ---- career: three cups, nine matches, and skill points to spend ----------------------- */
const CUPS = ['Club Cup', 'City Open', 'Grand Slam'];
const ROUNDS = ['Quarter final', 'Semi final', 'Final'];
const LADDER = [
  ['rookie', 'hard', 'g1'], ['rookie', 'grass', 'g1'], ['pro', 'hard', 'g3'],
  ['pro', 'clay', 'g1'], ['pro', 'grass', 'g3'], ['champ', 'hard', 'g3'],
  ['champ', 'clay', 'g3'], ['champ', 'grass', 'g3'], ['legend', 'royal', 'g3']
];
const STATS = [['power', 'Power', 'Faster ground strokes'], ['speed', 'Speed', 'Quicker around the court'], ['control', 'Control', 'A wider timing window']];
const career = Object.assign({ round: 0, pts: 0, up: { power: 0, speed: 0, control: 0 } }, store.get('career', {}));
function careerSave() { store.set('career', career); }
function careerStat(k) { return game.cfg && game.cfg.career ? career.up[k] || 0 : 0; }
function careerTag() { const el = $('careerTag'); if (el) el.textContent = career.round >= LADDER.length ? 'Complete' : CUPS[Math.floor(career.round / 3)]; }

function careerRender() {
  const done = career.round >= LADDER.length;
  let html = '<div class="cups">';
  for (let c = 0; c < 3; c++) {
    html += '<div class="cup"><h3>' + CUPS[c] + '</h3>';
    for (let r = 0; r < 3; r++) {
      const i = c * 3 + r, L = LADDER[i], st = i < career.round ? 'won' : i === career.round ? 'next' : 'lock';
      html += '<div class="rnd ' + st + '"><b>' + ROUNDS[r] + '</b><span>' + LEVELS[L[0]].name + ' on ' + SURFACES[L[1]].label + '</span><i>' + (st === 'won' ? 'Won' : st === 'next' ? 'Next' : '') + '</i></div>';
    }
    html += '</div>';
  }
  html += '</div><div class="skills"><p class="pts">Skill points: <b>' + career.pts + '</b> <small>Win a match for 1, a cup final for 2.</small></p>';
  for (const [k, name, desc] of STATS) {
    const v = career.up[k] || 0;
    html += '<div class="skill"><div><b>' + name + '</b><small>' + desc + '</small></div><span class="pips">' + [0, 1, 2, 3, 4].map((n) => '<i class="' + (n < v ? 'on' : '') + '"></i>').join('') + '</span>' +
      '<button class="btn" type="button" data-stat="' + k + '"' + (career.pts > 0 && v < 5 ? '' : ' disabled') + '>+</button></div>';
  }
  html += '</div><div class="career-go">' +
    (done ? '<p class="pts"><b>Career complete.</b> You are world number one.</p><button class="btn" type="button" data-career="reset">Start a new career</button>'
      : '<button class="btn primary big" type="button" data-career="play">Play the ' + CUPS[Math.floor(career.round / 3)] + ' ' + ROUNDS[career.round % 3].toLowerCase() + '</button>') + '</div>';
  $('careerBody').innerHTML = html;
  careerTag();
}

function careerCfg() {
  const L = LADDER[career.round];
  const base = ui.currentCfg ? ui.currentCfg() : {};
  let controls = settings.controls;
  if (controls === 'webcam') controls = isTouchDevice ? 'touch' : 'keys';
  return Object.assign({}, base, { mode: 'singles', controls, level: L[0], surface: L[1], format: L[2], invincible: false, career: true, careerRound: career.round });
}

function careerOnMatch(won) {
  const g = game;
  if (!g.cfg || !g.cfg.career || g.cfg.careerRound !== career.round || !won) return;
  const final = career.round % 3 === 2;
  career.round++;
  career.pts += final ? 2 : 1;
  careerSave();
  toast(final ? CUPS[Math.floor((career.round - 1) / 3)] + ' won' : 'Round won', '+' + (final ? 2 : 1) + ' skill point' + (final ? 's' : ''));
  if (final) award('cup');
  if (career.round >= LADDER.length) award('career');
  careerTag();
}

document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest ? e.target.closest('[data-stat],[data-career]') : null;
  if (!t || !$('careerBody') || !$('careerBody').contains(t)) return;
  if (t.dataset.stat) {
    const k = t.dataset.stat;
    if (career.pts > 0 && (career.up[k] || 0) < 5) { career.up[k] = (career.up[k] || 0) + 1; career.pts--; careerSave(); audio.ui('go'); careerRender(); }
  } else if (t.dataset.career === 'play') { audio.ui('go'); ui.beginMatch(careerCfg()); }
  else if (t.dataset.career === 'reset') { career.round = 0; career.pts = 0; career.up = { power: 0, speed: 0, control: 0 }; careerSave(); careerRender(); }
});
setTimeout(() => { try { plusMedalCount(); } catch (e) { /* page not ready */ } }, 0);
