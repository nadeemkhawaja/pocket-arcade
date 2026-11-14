/* ==========================================================================
   Progress: medals, lifetime counters and the things they unlock
   ========================================================================== */

const MEDALS = [
  { id: 'first', name: 'FIRST BLOOD', desc: 'TAKE DOWN AN ENEMY' },
  { id: 'chain', name: 'CHAIN REACTION', desc: 'BUILD A CHAIN OF 5' },
  { id: 'parry', name: 'BULLET CUTTER', desc: 'CUT 10 SHOTS OUT OF THE AIR' },
  { id: 'backstab', name: 'SHADOW STRIKE', desc: 'LAND 10 BACKSTABS' },
  { id: 'counter', name: 'PERFECT COUNTER', desc: 'DODGE AN ATTACK, THEN STRIKE' },
  { id: 'dive', name: 'DEATH FROM ABOVE', desc: '3 DIVE STABS WITHOUT LANDING' },
  { id: 'ninja', name: 'NINJA HUNTER', desc: 'DEFEAT 5 NINJAS' },
  { id: 'sword', name: 'SWORD SAINT', desc: '20 TAKEDOWNS WITH THE KATANA' },
  { id: 'demo', name: 'DEMOLITION', desc: '3 ENEMIES IN ONE BLAST' },
  { id: 'free', name: 'LIBERATOR', desc: 'FREE EVERY CAPTIVE IN A STAGE' },
  { id: 'clean', name: 'UNTOUCHABLE', desc: 'CLEAR A STAGE WITHOUT A SCRATCH' },
  { id: 'mauler', name: 'GIANT SLAYER', desc: 'BRING DOWN MAULER' },
  { id: 'ironclad', name: 'DERAILED', desc: 'WRECK THE IRONCLAD' },
  { id: 'gunship', name: 'GROUNDED', desc: 'SHOOT DOWN SKY HAMMER' },
  { id: 'krome', name: 'END OF THE LINE', desc: 'DEFEAT GENERAL KROME' },
  { id: 'elite', name: 'ELITE OPERATIVE', desc: 'FINISH THE MISSION ON ELITE' },
  { id: 'srank', name: 'S FOR STYLE', desc: 'REACH STYLE RANK S' },
  { id: 'build', name: 'FULLY LOADED', desc: 'CARRY 4 UPGRADES AT ONCE' }
];

const PROG = Object.assign({ ach: {}, reached: 0, cleared: false, n: {} }, store.get('progress', {}));
function saveProg() { store.set('progress', PROG); }
/** Medals and counters only move in a real run: no demo, no invincible mode. */
function progLive() { return !game.demo && !game.invincible && !game.cheat; }

function award(id) {
  if (!progLive() || PROG.ach[id]) return;
  PROG.ach[id] = 1;
  saveProg();
  const m = MEDALS.find((k) => k.id === id);
  if (m) game.toasts.push({ title: 'MEDAL EARNED', name: m.name, t: 0 });
}
function countUp(key, goal, id) {
  if (!progLive() || PROG.ach[id]) return;
  PROG.n[key] = (PROG.n[key] || 0) + 1;
  if (PROG.n[key] >= goal) award(id);
  else if (PROG.n[key] % 3 === 0) saveProg();
}
function medalCount() { return MEDALS.filter((m) => PROG.ach[m.id]).length; }

function outfitOpen(k) {
  const need = HERO_OUTFITS[k].need;
  return !need || (need === 'stage3' && PROG.reached >= 2) || (need === 'clear' && PROG.cleared);
}
/** Record how far a real run has got; later stages can then be picked at deployment. */
function reachStage(i) {
  if (game.demo) return;
  if (i > PROG.reached) {
    const before = outfitOpen('raven');
    PROG.reached = Math.min(STAGES.length - 1, i);
    saveProg();
    game.toasts.push({ title: 'STAGE SELECT', name: 'STAGE ' + (i + 1) + ' UNLOCKED', t: 0 });
    if (!before && outfitOpen('raven')) game.toasts.push({ title: 'NEW OUTFIT', name: 'RAVEN', t: 0 });
  }
}
function missionCleared() {
  if (game.demo) return;
  if (!PROG.cleared) { PROG.cleared = true; saveProg(); game.toasts.push({ title: 'NEW OUTFIT', name: 'CRIMSON', t: 0 }); }
  if (game.diff.id === 'elite' && game.startStage === 0) award('elite');
}
