/* ==========================================================================
   Extras: critical hits, medals, floor select, restart and voices
   ========================================================================== */

const MEDALS = [
  { id: 'first', name: 'FIRST KNOCKOUT', desc: 'DEFEAT AN ENEMY' },
  { id: 'crit', name: 'PRESSURE POINT', desc: 'LAND 25 CRITICAL HITS' },
  { id: 'shadow', name: 'SHADOW STRIKE', desc: 'STRIKE STRAIGHT OUT OF A DASH' },
  { id: 'finish', name: 'FINISHER', desc: 'LAND 10 FINISHING BLOWS' },
  { id: 'ko100', name: 'HUNDRED FISTS', desc: 'DEFEAT 100 ENEMIES' },
  { id: 'flawless', name: 'UNTOUCHED', desc: 'CLEAR A FLOOR WITHOUT A SCRATCH' },
  { id: 'floor1', name: 'FIRST GUARDIAN', desc: 'CLEAR THE FIRST FLOOR' },
  { id: 'floor3', name: 'HALFWAY UP', desc: 'CLEAR THE THIRD FLOOR' },
  { id: 'master', name: 'PAGODA MASTER', desc: 'REACH THE SUMMIT AND WIN' },
  { id: 'grand', name: 'GRANDMASTER', desc: 'WIN ON GRANDMASTER' }
];
const PROG = Object.assign({ ach: {}, n: {}, reached: 0 }, store.get('progress', {}));
function progLive() { return !game.demo && !game.invincible && !game.cheat; }
function award(id) {
  if (!progLive() || PROG.ach[id]) return;
  PROG.ach[id] = 1; store.set('progress', PROG);
  const m = MEDALS.find((k) => k.id === id);
  if (m) { game.medalQ = game.medalQ || []; game.medalQ.push({ title: 'MEDAL EARNED', name: m.name, t: 0 }); }
}
function countUp(key, goal, id) {
  if (!progLive() || PROG.ach[id]) return;
  PROG.n[key] = (PROG.n[key] || 0) + 1;
  if (PROG.n[key] >= goal) award(id); else if (PROG.n[key] % 5 === 0) store.set('progress', PROG);
}
function medalCount() { return MEDALS.filter((m) => PROG.ach[m.id]).length; }
function reachFloor(i) {
  if (game.demo || i <= PROG.reached) return;
  PROG.reached = Math.min(FLOORS.length - 1, i); store.set('progress', PROG);
  game.medalQ = game.medalQ || []; game.medalQ.push({ title: 'FLOOR SELECT', name: 'FLOOR ' + (i + 1) + ' UNLOCKED', t: 0 });
}
function startFloorPick() { return clamp(settings.floor | 0, 0, Math.min(PROG.reached, FLOORS.length - 1)); }

/** Roll for a critical: sure out of a dash, otherwise one hit in ten. Returns the damage to deal. */
function critRoll(h, dmg, x, y) {
  const sure = h && h.dashWin > 0;
  if (!sure && !chance(0.1)) return dmg;
  pop(x, y, 'CRITICAL!', '#ffd27a');
  chip.sfx('crit');
  game.hitStop = Math.max(game.hitStop || 0, 0.06);
  countUp('crit', 25, 'crit');
  if (sure) award('shadow');
  return dmg * 2;
}

function restartFloor() {
  game.score = game.floorScore0 || 0;
  game.carry = game.floorCarry0 || null;
  chip.duck(false);
  startFloor(game.floorIdx);
}

function drawMedalIcon(g, x, y, s, got) {
  g.save(); g.translate(x, y); g.scale(s, s);
  poly(g, [-3, -7, -0.4, -7, 1.2, -2, -1.6, -2], got ? '#c8322a' : '#3a3040'); poly(g, [0.4, -7, 3, -7, 1.6, -2, -1.2, -2], got ? '#8a1a18' : '#2e2634');
  disc(g, 0, 1.6, 4.9, '#14080e'); disc(g, 0, 1.6, 4.2, got ? '#f2c94c' : '#4a4252'); disc(g, -0.8, 0.8, 2.6, got ? '#ffe9a0' : '#5c5466');
  g.restore();
}

function drawMedals(g) {
  drawTitleBackdrop(g, 0.86);
  bigTitle(g, 'MEDALS', W / 2, 10, 2);
  T(g, medalCount() + ' / ' + MEDALS.length, W - 22, 16, C.gold, { align: 'right', weight: 700 });
  panel(g, 12, 34, W - 24, 142);
  MEDALS.forEach((m, i) => {
    const x = 22 + (i % 2) * 176, y = 42 + Math.floor(i / 2) * 26, got = !!PROG.ach[m.id];
    if (got) drawGlow(g, x + 7, y + 8, 10, '#ffd27a', 0.5);
    drawMedalIcon(g, x + 7, y + 8, 1, got);
    T(g, m.name, x + 20, y, got ? C.gold : '#8a7a90', { weight: 700 });
    T(g, m.desc, x + 20, y + 9.6, got ? '#e8dce0' : '#6a5c70', { scale: 0.74 });
  });
  T(g, 'FLOORS OPEN FOR A QUICK START: ' + (Math.min(PROG.reached, FLOORS.length - 1) + 1) + ' / ' + FLOORS.length, W / 2, 182, C.cyan, { align: 'center', scale: 0.86, weight: 700 });
  if (blink(1.4)) T(g, input.usingTouch ? 'TAP TO RETURN' : 'PRESS PUNCH TO RETURN', W / 2, 197, C.ink, { align: 'center', weight: 700 });
}

function drawMedalToast(g) {
  const Q = game.medalQ;
  if (!Q || !Q.length) return;
  const q = Q[0];
  if (q.t === 0) chip.sfx('chime');
  q.t += 1 / 60;
  if (q.t > 2.6) { Q.shift(); return; }
  const k = q.t < 0.25 ? q.t / 0.25 : q.t > 2.3 ? Math.max(0, (2.6 - q.t) / 0.3) : 1;
  const w = Math.max(96, textWidth(q.name, 0.92, { weight: 700 }) + 34), x = W - 5 - w, y = HUD_H + 5 - (1 - k) * 26;
  g.globalAlpha = k;
  panel(g, x, y, w, 19);
  drawMedalIcon(g, x + 11, y + 9.5, 1, true);
  T(g, q.title, x + 22, y + 2.6, C.gold, { scale: 0.7, weight: 700 });
  T(g, q.name, x + 22, y + 9, C.ink, { scale: 0.92, weight: 700 });
  g.globalAlpha = 1;
}

/* Voices: a buzzing source through two vowel formants with a falling pitch. */
(function voices() {
  const VOX = { kiai: [270, 150, 0.16, 820, 1250, 0.2], pain: [220, 120, 0.22, 600, 1050, 0.2], down: [190, 70, 0.5, 560, 900, 0.2], grunt: [150, 85, 0.17, 480, 980, 0.12] };
  Chip.prototype.voice = function (kind, high) {
    if (!this.ok() || this.mute) return;
    const v = VOX[kind];
    if (!v) return;
    const c = this.ctx, t = c.currentTime, j = (0.94 + Math.random() * 0.12) * (high ? 1.5 : 1);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(v[0] * j, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, v[1] * j), t + v[2]);
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(v[5], t + 0.015); out.gain.setTargetAtTime(0.0001, t + v[2] * 0.55, v[2] * 0.2);
    for (const f of [v[3], v[4]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f * (high ? 1.15 : 1); b.Q.value = 5; o.connect(b); b.connect(out); }
    out.connect(this.sfxBus); o.start(t); o.stop(t + v[2] + 0.25);
  };
  const base = Chip.prototype.sfx;
  Chip.prototype.sfx = function (name, opt) {
    if (name === 'crit') {
      if (!this.ok() || this.mute) return;
      const t = this.ctx.currentTime;
      this.tone(t, 1568, 0.05, 'p50', 0.1); this.tone(t + 0.04, 2349, 0.14, 'p25', 0.1, null, { decay: 0.05, sus: 0.35 });
      return;
    }
    return base.call(this, name, opt);
  };
})();
