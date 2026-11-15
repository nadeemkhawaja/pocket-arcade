/* ==========================================================================
   Menus: title, garage, options, pause, continue, results and name entry.
   ========================================================================== */

const TITLE_ITEMS = ['START', 'HOW TO PLAY', 'HIGH SCORES', 'MEDALS', 'OPTIONS'];
const PAUSE_ITEMS = ['RESUME', 'RESTART STAGE', 'OPTIONS', 'QUIT TO TITLE'];
const OPTION_ITEMS = ['MUSIC', 'EFFECTS', 'GLOW FX', 'SCREEN SHAKE', 'AUTO GAS', 'TOUCH PAD', 'BACK'];
const HOWTO_PAGES = 3;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. ';

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
function toTitle(menu) { chip.play('title'); if (!game.demo) newGame(true); else setState('title'); game.menu = menu || 0; game.idleT = 0; }
function startFrom() { return clamp(settings.stage | 0, 0, Math.min(PROG.reached, STAGES.length - 1)); }

function updateMenus(dt, I, P) {
  const g = game;
  const confirm = P.gas || P.nitro || P.start;
  const back = P.brake || P.back;
  const hit = tapHit();
  const d = P.left ? -1 : P.right ? 1 : 0;
  if (g.state === 'title' || ((g.state === 'garage' || g.state === 'options' || g.state === 'howto' || g.state === 'scores' || g.state === 'medals') && g.demo)) updateRace(dt, I);
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
      if (act === 0) { chip.sfx('select'); setState('garage'); g.menu = 0; }
      else if (act === 1) { chip.sfx('select'); setState('howto'); g.page = 0; }
      else if (act === 2) { chip.sfx('select'); setState('scores'); g.attract = false; }
      else if (act === 3) { chip.sfx('select'); setState('medals'); }
      else if (act === 4) { chip.sfx('select'); g.optFrom = 'title'; setState('options'); g.menu = 0; }
      if (g.idleT > 24) { g.idleT = 0; g.attract = true; setState('scores'); }
      break;
    }
    case 'garage': {
      const rows = PROG.reached > 0 ? 4 : 3, goRow = rows - 1;
      menuMove(rows, P);
      if (d && g.menu === 0) { settings.car = CAR_ORDER[(CAR_ORDER.indexOf(settings.car) + d + 3) % 3]; chip.sfx('select'); saveSettings(); }
      if (d && g.menu === 1) { const n = LEVELS.length; settings.level = LEVELS[(Math.max(0, LEVELS.indexOf(settings.level)) + d + n) % n]; chip.sfx('move'); saveSettings(); }
      if (d && g.menu === 2 && rows === 4) { const n = Math.min(PROG.reached, STAGES.length - 1) + 1; settings.stage = (startFrom() + d + n) % n; chip.sfx('move'); saveSettings(); }
      let go = (confirm && g.menu === goRow) || P.start;
      if (!go && confirm && g.menu < goRow) { g.menu++; chip.sfx('move'); }
      if (hit) {
        if (hit.car) { settings.car = hit.car; g.menu = 0; chip.sfx('select'); saveSettings(); }
        else if (hit.level) { settings.level = hit.level; g.menu = 1; chip.sfx('move'); saveSettings(); }
        else if (hit.stage !== undefined) { settings.stage = hit.stage; g.menu = 2; chip.sfx('move'); saveSettings(); }
        else if (hit.go) go = true;
        else if (hit.back) { chip.sfx('back'); setState('title'); g.menu = 0; break; }
      }
      if (go) { chip.sfx('go'); const s0 = rows === 4 ? startFrom() : 0; newGame(false); if (s0) startStage(s0, 0); }
      else if (back) { chip.sfx('back'); setState('title'); g.menu = 0; }
      break;
    }
    case 'medals':
      if (confirm || back || (input.tap && g.stateT > 0.3)) { chip.sfx('back'); setState('title'); g.menu = 3; }
      break;
    case 'scores':
      if (g.attract) { if (P.any || input.tap || g.stateT > 9) { setState('title'); g.idleT = 0; } }
      else if (confirm || back || (input.tap && g.stateT > 0.3)) { chip.sfx('back'); if (g.demo) { setState('title'); g.menu = 2; } else toTitle(0); }
      break;
    case 'howto':
      if (confirm || d > 0 || (hit && hit.next) || (input.tap && !hit)) { g.page++; chip.sfx('move'); if (g.page >= HOWTO_PAGES) { setState('title'); g.menu = 1; } }
      else if (d < 0 && g.page > 0) { g.page--; chip.sfx('move'); }
      else if (back || (hit && hit.back)) { setState('title'); g.menu = 1; chip.sfx('back'); }
      break;
    case 'options': {
      menuMove(OPTION_ITEMS.length, P);
      let dd = d, act = confirm;
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
      else if (act === 1) { chip.sfx('select'); chip.applyVolumes(); g.score = g.stageScore || 0; startStage(g.stage, 0); }
      else if (act === 2) { chip.sfx('select'); g.optFrom = 'pause'; setState('options'); g.menu = 0; }
      else if (act === 3) { chip.sfx('back'); chip.applyVolumes(); chip.stopMusic(); toTitle(0); }
      break;
    }
    case 'continue':
      updateFx(dt);
      g.contT -= dt;
      if (g.stateT > 0.5 && (confirm || (hit && hit.go))) { chip.sfx('go'); useContinue(); }
      else if (g.contT <= 0 || (g.stateT > 0.5 && (back || (hit && hit.no)))) { setState('gameover'); }
      break;
    case 'gameover':
      if ((g.stateT > 1.2 && (confirm || back || input.tap)) || g.stateT > 9) { chip.stopMusic(); endRun(); }
      break;
    case 'ending':
      g.cleared = true;
      if ((g.stateT > 2 && (confirm || input.tap)) || g.stateT > 40) { chip.stopMusic(); endRun(); }
      break;
    case 'entry': {
      const e = g.entry;
      let dl = P.up ? 1 : P.down ? -1 : 0, mv = d, ok = confirm;
      if (hit) { if (hit.slot !== undefined) { e.i = hit.slot; dl = hit.dl; } else if (hit.ok) { ok = true; e.i = 2; } }
      if (dl) { const k = (LETTERS.indexOf(e.name[e.i]) + dl + LETTERS.length) % LETTERS.length; e.name[e.i] = LETTERS[k]; chip.sfx('tick'); }
      if (mv) { e.i = clamp(e.i + mv, 0, 2); chip.sfx('move'); }
      if (ok) { if (e.i < 2) { e.i++; chip.sfx('move'); } else { chip.sfx('select'); submitEntry(); } }
      else if (back && e.i > 0) { e.i--; chip.sfx('back'); }
      break;
    }
    default: break;
  }
}

function adjustOption(i, d, activate) {
  const cyc = (key, order) => { settings[key] = order[(order.indexOf(settings[key] || 'auto') + (d < 0 ? order.length - 1 : 1)) % order.length]; };
  switch (OPTION_ITEMS[i]) {
    case 'MUSIC': settings.music = clamp(Math.round(settings.music * 10 + (d || 1)) / 10, 0, 1); chip.applyVolumes(); chip.sfx('move'); break;
    case 'EFFECTS': settings.sfx = clamp(Math.round(settings.sfx * 10 + (d || 1)) / 10, 0, 1); chip.applyVolumes(); chip.sfx('coin'); break;
    case 'GLOW FX': settings.fx = !settings.fx; chip.sfx('move'); break;
    case 'SCREEN SHAKE': settings.shake = !settings.shake; chip.sfx('move'); break;
    case 'AUTO GAS': cyc('autoGas', ['auto', 'on', 'off']); chip.sfx('move'); break;
    case 'TOUCH PAD': cyc('touch', ['auto', 'on', 'off']); chip.sfx('move'); layoutTouch(); break;
    case 'BACK': if (activate || d) leaveOptions(); return;
    default: break;
  }
  saveSettings();
}
function leaveOptions() {
  saveSettings(); chip.sfx('back');
  if (game.optFrom === 'pause') { setState('pause'); game.menu = 2; if (chip.ctx) chip.musicBus.gain.setTargetAtTime(0.0001, chip.ctx.currentTime, 0.05); }
  else { setState('title'); game.menu = 4; }
}
