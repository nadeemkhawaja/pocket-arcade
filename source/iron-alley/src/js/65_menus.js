/* ==========================================================================
   Menus: title, fighter select, options, how to play, scores, medals,
   pause, game over, ending and name entry.
   ========================================================================== */

const TITLE_ITEMS = ['1 PLAYER', '2 PLAYERS', 'HOW TO PLAY', 'HIGH SCORES', 'MEDALS', 'OPTIONS'];
const PAUSE_ITEMS = ['RESUME', 'OPTIONS', 'QUIT TO TITLE'];
const OPTION_ITEMS = ['MUSIC', 'EFFECTS', 'GLOW FX', 'SCREEN SHAKE', 'FRIENDLY FIRE', 'TOUCH PAD', 'BACK'];
const HOWTO_PAGES = 3;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. ';
const HERO_ORDER = ['kade', 'suki'];

function menuMove(n, P) {
  let m = game.menu;
  if (P.up) m = (m + n - 1) % n;
  if (P.down) m = (m + 1) % n;
  if (m !== game.menu) { game.menu = m; chip.sfx('move'); }
}
function tapHit() {
  const t = input.tap;
  if (!t) return null;
  for (let i = game.hits.length - 1; i >= 0; i--) { const h = game.hits[i]; if (t.x >= h.x0 && t.x <= h.x1 && t.y >= h.y0 && t.y <= h.y1) return h; }
  return null;
}
function toTitle(menu) { chip.play('title'); newGame(2, true); game.menu = menu || 0; game.idleT = 0; }

function updateMenus(dt, I, P) {
  const g = game;
  const confirm = P.punch || P.start || P.jump;
  const back = P.kick || P.back;
  const hit = tapHit();
  const d = P.left ? -1 : P.right ? 1 : 0;
  if (g.demo && ['title', 'select', 'options', 'howto', 'scores', 'medals'].includes(g.state)) { if (g.hitstop > 0) g.hitstop -= dt; else updatePlay(dt); }
  switch (g.state) {
    case 'boot':
      if (P.any || input.tap) { chip.unlock(); toTitle(0); }
      break;
    case 'title': {
      g.idleT += dt;
      if (P.any || input.tap) g.idleT = 0;
      menuMove(TITLE_ITEMS.length, P);
      let act = confirm ? g.menu : -1;
      if (hit) { g.menu = hit.i; act = hit.i; }
      if (act === 0 || act === 1) { chip.sfx('select'); g.players = act + 1; setState('select'); g.menu = 0; g.ready = [false, false]; }
      else if (act === 2) { chip.sfx('select'); setState('howto'); g.page = 0; }
      else if (act === 3) { chip.sfx('select'); setState('scores'); g.attract = false; }
      else if (act === 4) { chip.sfx('select'); setState('medals'); }
      else if (act === 5) { chip.sfx('select'); g.optFrom = 'title'; setState('options'); g.menu = 0; }
      if (g.idleT > 25) { g.idleT = 0; g.attract = true; setState('scores'); }
      break;
    }
    case 'select': {
      // each player picks with their own keys; the level row belongs to player one
      const two = g.players > 1;
      const P1 = input.pl[0].pressed, P2 = input.pl[1].pressed;
      const flip = (key) => { settings[key] = HERO_ORDER[(HERO_ORDER.indexOf(settings[key]) + 1) % 2]; chip.sfx('select'); saveSettings(); };
      if (g.menu === 0 && (P1.left || P1.right)) flip('p1');
      if (two && (P2.left || P2.right)) flip('p2');
      if (P1.up || P1.down) { g.menu = g.menu ? 0 : 1; chip.sfx('move'); }
      if (g.menu === 1 && (P1.left || P1.right)) { const n = LEVELS.length; settings.level = LEVELS[(LEVELS.indexOf(settings.level) + (P1.right ? 1 : -1) + n) % n]; chip.sfx('move'); saveSettings(); }
      let go = P1.punch || P1.start || P1.jump || (two && (P2.punch || P2.start));
      if (hit) {
        if (hit.p !== undefined) { settings[hit.p] = hit.hero; chip.sfx('select'); saveSettings(); }
        else if (hit.level) { settings.level = hit.level; chip.sfx('move'); saveSettings(); }
        else if (hit.go) go = true;
        else if (hit.back) { chip.sfx('back'); setState('title'); g.menu = 0; break; }
      }
      if (go) { chip.sfx('go'); const n = g.players; newGame(n, false); }
      else if (P1.kick || P1.back) { chip.sfx('back'); setState('title'); g.menu = 0; }
      break;
    }
    case 'medals':
      if (confirm || back || (input.tap && g.stateT > 0.3)) { chip.sfx('back'); setState('title'); g.menu = 4; }
      break;
    case 'scores':
      if (g.attract) { if (P.any || input.tap || g.stateT > 9) { setState('title'); g.idleT = 0; } }
      else if (confirm || back || (input.tap && g.stateT > 0.3)) { chip.sfx('back'); if (g.demo) { setState('title'); g.menu = 3; } else toTitle(0); }
      break;
    case 'howto':
      if (confirm || d > 0 || (hit && hit.next) || (input.tap && !hit)) { g.page++; chip.sfx('move'); if (g.page >= HOWTO_PAGES) { setState('title'); g.menu = 2; } }
      else if (d < 0 && g.page > 0) { g.page--; chip.sfx('move'); }
      else if (back || (hit && hit.back)) { setState('title'); g.menu = 2; chip.sfx('back'); }
      break;
    case 'options': {
      menuMove(OPTION_ITEMS.length, P);
      let dd = d, act = P.punch || P.start || P.jump;
      if (hit) { g.menu = hit.i; if (hit.dir) dd = hit.dir; else act = true; }
      if (dd || act) adjustOption(g.menu, dd || 0, act && !dd);
      else if (back) leaveOptions();
      break;
    }
    case 'pause': {
      menuMove(PAUSE_ITEMS.length, P);
      let act = confirm ? g.menu : -1;
      if (hit) { g.menu = hit.i; act = hit.i; }
      if (P.pause || P.back) act = 0;
      if (act === 0) { chip.sfx('select'); closePause(); }
      else if (act === 1) { chip.sfx('select'); g.optFrom = 'pause'; setState('options'); g.menu = 0; }
      else if (act === 2) { chip.sfx('back'); chip.applyVolumes(); chip.stopMusic(); toTitle(0); }
      break;
    }
    case 'gameover':
      if ((g.stateT > 1.5 && (confirm || input.tap)) || g.stateT > 9) { chip.stopMusic(); endRun(); }
      break;
    case 'ending':
      g.cleared = true;
      if ((g.stateT > 3 && (confirm || input.tap)) || g.stateT > 40) { chip.stopMusic(); endRun(); }
      break;
    case 'entry': {
      const e = g.entry;
      let dl = P.up ? 1 : P.down ? -1 : 0, mv = d, ok = P.punch || P.start || P.jump;
      if (hit) { if (hit.slot !== undefined) { e.i = hit.slot; dl = hit.dl; } else if (hit.ok) { ok = true; e.i = 2; } }
      if (dl) { const k = (LETTERS.indexOf(e.name[e.i]) + dl + LETTERS.length) % LETTERS.length; e.name[e.i] = LETTERS[k]; chip.sfx('tick'); }
      if (mv) { e.i = clamp(e.i + mv, 0, 2); chip.sfx('move'); }
      if (ok) { if (e.i < 2) { e.i++; chip.sfx('move'); } else { chip.sfx('select'); submitEntry(); } }
      else if (P.kick && e.i > 0) { e.i--; chip.sfx('back'); }
      break;
    }
    default: break;
  }
}

function adjustOption(i, d, activate) {
  switch (OPTION_ITEMS[i]) {
    case 'MUSIC': settings.music = clamp(Math.round(settings.music * 10 + (d || 1)) / 10, 0, 1); chip.applyVolumes(); chip.sfx('move'); break;
    case 'EFFECTS': settings.sfx = clamp(Math.round(settings.sfx * 10 + (d || 1)) / 10, 0, 1); chip.applyVolumes(); chip.sfx('punch'); break;
    case 'GLOW FX': settings.fx = !settings.fx; chip.sfx('move'); break;
    case 'SCREEN SHAKE': settings.shake = !settings.shake; chip.sfx('move'); break;
    case 'FRIENDLY FIRE': settings.friendly = !settings.friendly; chip.sfx('move'); break;
    case 'TOUCH PAD': { const o = ['auto', 'on', 'off']; settings.touch = o[(o.indexOf(settings.touch || 'auto') + (d < 0 ? 2 : 1)) % 3]; chip.sfx('move'); layoutTouch(); break; }
    case 'BACK': if (activate || d) leaveOptions(); return;
    default: break;
  }
  saveSettings();
}
function leaveOptions() {
  saveSettings(); chip.sfx('back');
  if (game.optFrom === 'pause') { setState('pause'); game.menu = 1; if (chip.ctx) chip.musicBus.gain.setTargetAtTime(0.0001, chip.ctx.currentTime, 0.05); }
  else { setState('title'); game.menu = 5; }
}
