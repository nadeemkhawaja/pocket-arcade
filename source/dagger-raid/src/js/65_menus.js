/* ==========================================================================
   Menus: boot, title, attract loop, how to play, options, pause, name entry
   ========================================================================== */

const TITLE_ITEMS = ['START GAME', 'MODE', 'HOW TO PLAY', 'HIGH SCORES', 'OPTIONS'];
const OPTION_ITEMS = ['MUSIC', 'EFFECTS', 'CRT FILTER', 'SCREEN SHAKE', 'TOUCH PAD', 'BACK'];
const PAUSE_ITEMS = ['RESUME', 'OPTIONS', 'QUIT GAME'];
const HOWTO_PAGES = 3;

function menuMove(n, P) {
  let m = game.menu;
  if (P.up) m = (m + n - 1) % n;
  if (P.down) m = (m + 1) % n;
  if (m !== game.menu) { game.menu = m; chip.sfx('move'); }
}

/** Taps on registered hit areas: returns the hit or null. */
function tapHit() {
  const tp = input.tap;
  if (!tp) return null;
  for (const h of game.hits) if (tp.x >= h.x0 && tp.x <= h.x1 && tp.y >= h.y0 && tp.y <= h.y1) return h;
  return null;
}

function updateMenus(dt, I, P) {
  if (game.state !== 'pause') tickWorld(dt);
  const confirm = P.knife || P.jump || P.start;
  const back = P.special || P.back;
  const hit = tapHit();
  switch (game.state) {
    case 'boot':
      if (P.any || input.tap) { chip.unlock(); chip.play('title'); setState('title'); }
      break;
    case 'title': {
      game.idleT += dt;
      if (P.any || input.tap) game.idleT = 0;
      menuMove(TITLE_ITEMS.length, P);
      let act = confirm ? game.menu : -1;
      if (hit) { game.menu = hit.i; act = hit.i; if (hit.dir) { toggleMode(); act = -1; } }
      if (game.menu === 1 && (P.left || P.right)) { toggleMode(); }
      if (act === 0) { chip.sfx('coin'); chip.stopMusic(); newGame(false); }
      else if (act === 1) toggleMode();
      else if (act === 2) { chip.sfx('select'); setState('howto'); game.page = 0; }
      else if (act === 3) { chip.sfx('select'); setState('scores'); game.attract = false; }
      else if (act === 4) { chip.sfx('select'); game.optFrom = 'title'; setState('options'); }
      if (game.idleT > 22) { game.idleT = 0; game.attract = true; setState('scores'); }
      break;
    }
    case 'scores':
      if (game.attract) {
        if (P.any || input.tap) { game.attract = false; setState('title'); game.idleT = 0; break; }
        if (game.stateT > 7) startDemo();
      } else if (confirm || back || hit || (input.tap && game.stateT > 0.3)) { chip.sfx('move'); setState('title'); game.menu = 3; }
      break;
    case 'howto':
      if (P.right || confirm || (hit && hit.next) || (input.tap && !hit && game.stateT > 0.2)) {
        game.page++; chip.sfx('move');
        if (game.page >= HOWTO_PAGES) { setState('title'); game.menu = 2; }
      } else if (P.left && game.page > 0) { game.page--; chip.sfx('move'); }
      else if (back || (hit && hit.back)) { setState('title'); game.menu = 2; chip.sfx('move'); }
      break;
    case 'options': {
      menuMove(OPTION_ITEMS.length, P);
      let d = P.left ? -1 : P.right ? 1 : 0;
      let act = confirm;
      if (hit) { game.menu = hit.i; if (hit.dir) d = hit.dir; else act = true; }
      if (d || act) adjustOption(game.menu, d || 1, act && !d);
      if (back) leaveOptions();
      break;
    }
    case 'pause': {
      menuMove(PAUSE_ITEMS.length, P);
      let act = confirm ? game.menu : -1;
      if (hit) { game.menu = hit.i; act = hit.i; }
      if (P.pause || back) act = 0;
      if (act === 0) { game.state = 'play'; chip.duck(false); chip.sfx('select'); }
      else if (act === 1) { chip.sfx('select'); game.optFrom = 'pause'; setState('options'); }
      else if (act === 2) { chip.duck(false); chip.stopMusic(); game.demo = false; finishRun(); }
      break;
    }
    case 'entry': updateEntry(dt, P, hit); break;
    default: break;
  }
}

function toggleMode() {
  settings.mode = settings.mode === 'arcade' ? 'modern' : 'arcade';
  saveSettings(); chip.sfx('move');
}

function adjustOption(i, d, activate) {
  switch (OPTION_ITEMS[i]) {
    case 'MUSIC': settings.music = clamp(Math.round(settings.music * 10 + d) / 10, 0, 1); chip.applyVolumes(); chip.sfx('move'); break;
    case 'EFFECTS': settings.sfx = clamp(Math.round(settings.sfx * 10 + d) / 10, 0, 1); chip.applyVolumes(); chip.sfx('pickup'); break;
    case 'CRT FILTER': settings.crt = !settings.crt; chip.sfx('move'); break;
    case 'SCREEN SHAKE': settings.shake = !settings.shake; chip.sfx('move'); if (settings.shake) game.shake = 4; break;
    case 'TOUCH PAD': {
      const order = ['auto', 'on', 'off'];
      settings.touch = order[(order.indexOf(settings.touch || 'auto') + (d > 0 ? 1 : 2)) % 3];
      chip.sfx('move'); layoutTouch();
      break;
    }
    case 'BACK': if (activate || d) leaveOptions(); return;
    default: break;
  }
  saveSettings();
}

function leaveOptions() {
  chip.sfx('move');
  if (game.optFrom === 'pause') { setState('pause'); game.menu = 1; }
  else { setState('title'); game.menu = 4; }
}

function openPause() {
  setState('pause');
  chip.duck(true);
  chip.sfx('select');
}

function updateEntry(dt, P, hit) {
  const E = game.entry;
  if (E.done) {
    E.doneT += dt;
    if (E.doneT > 3.2 || (E.doneT > 0.8 && (P.knife || P.start || input.tap))) { setState('title'); chip.play('title'); game.idleT = 0; }
    return;
  }
  E.t -= dt;
  const n = ENTRY_CHARS.length;
  if (P.up) { E.chars[E.pos] = (E.chars[E.pos] + 1) % n; chip.sfx('move'); }
  if (P.down) { E.chars[E.pos] = (E.chars[E.pos] + n - 1) % n; chip.sfx('move'); }
  if (P.left && E.pos > 0) { E.pos--; chip.sfx('move'); }
  if (P.right && E.pos < 2) { E.pos++; chip.sfx('move'); }
  for (const ch of input.typed) {
    const idx = ENTRY_CHARS.indexOf(ch.toUpperCase());
    if (idx >= 0 && E.pos < 3) { E.chars[E.pos] = idx; chip.sfx('type'); if (E.pos < 2) E.pos++; else { commitEntry(); return; } }
  }
  if (input.backspace && E.pos > 0) { E.pos--; chip.sfx('move'); }
  if (hit) {
    if (hit.up !== undefined) { E.pos = hit.up; E.chars[E.pos] = (E.chars[E.pos] + 1) % n; chip.sfx('move'); }
    else if (hit.down !== undefined) { E.pos = hit.down; E.chars[E.pos] = (E.chars[E.pos] + n - 1) % n; chip.sfx('move'); }
    else if (hit.slot !== undefined) { E.pos = hit.slot; chip.sfx('move'); }
    else if (hit.ok) { commitEntry(); return; }
  }
  if (P.knife || P.jump || P.start) {
    chip.sfx('select');
    if (E.pos < 2) E.pos++; else { commitEntry(); return; }
  }
  if (P.special && E.pos > 0) { E.pos--; chip.sfx('move'); }
  if (E.t <= 0) commitEntry();
}
