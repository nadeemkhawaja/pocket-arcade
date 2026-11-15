/* ==========================================================================
   Input: keyboard, gamepad and touch pad merged into one action state
   ========================================================================== */

const ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'jump', 'special', 'start', 'pause', 'back'];
/* player one on the arrows, player two on the left hand side of the keyboard */
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyZ: 'punch', KeyJ: 'punch', KeyX: 'kick', KeyK: 'kick', KeyC: 'jump', Space: 'jump', KeyL: 'jump', KeyV: 'special', KeyI: 'special',
  Enter: 'start', NumpadEnter: 'start', KeyP: 'pause', Escape: 'back'
};
const KEYMAP2 = { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyF: 'punch', KeyG: 'kick', KeyH: 'jump', KeyT: 'special', KeyQ: 'start' };

function newPlayerInput() {
  const o = { kb: {}, pad: {}, touch: {}, latch: {}, prev: {}, pend: {}, held: {}, pressed: {}, any: false };
  for (const a of ACTIONS) { o.held[a] = false; o.pressed[a] = false; o.prev[a] = false; }
  return o;
}
const input = {
  pl: [newPlayerInput(), newPlayerInput()],
  tap: null, tapQueue: [], anyLatch: false, usingTouch: false, usingPad: false, pads: 0
};
const NO_PRESS = Object.freeze({ left: false, right: false, up: false, down: false, punch: false, kick: false, jump: false, special: false, start: false, pause: false, back: false, any: false });

function initInput() {
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    input.usingTouch = false;
    if (ev.code === 'KeyM' && !ev.repeat) {
      settings.muted = !settings.muted; saveSettings(); chip.unlock(); chip.applyVolumes();
      game.toast = { s: settings.muted ? 'SOUND OFF  (M)' : 'SOUND ON  (M)', t: 0 };
      ev.preventDefault(); return;
    }
    const a1 = KEYMAP[ev.code], a2 = KEYMAP2[ev.code], a = a1 || a2, pi = a1 ? input.pl[0] : input.pl[1];
    input.anyLatch = true;
    if (!a) return;
    ev.preventDefault();
    if (!pi.kb[a]) pi.latch[a] = true;
    pi.kb[a] = true; pi.any = true;
    if (a === 'back') pi.latch.pause = true;
    chip.unlock();
  }, { passive: false });
  window.addEventListener('keyup', (ev) => {
    const a1 = KEYMAP[ev.code], a2 = KEYMAP2[ev.code];
    if (a1) input.pl[0].kb[a1] = false;
    if (a2) input.pl[1].kb[a2] = false;
  });
  window.addEventListener('blur', () => { for (const pi of input.pl) for (const a of ACTIONS) { pi.kb[a] = false; pi.touch[a] = false; } touchPointers.clear(); });
  window.addEventListener('gamepadconnected', () => { input.usingPad = true; });
  initTouch();
  const cv = $('screen');
  cv.addEventListener('pointerdown', (ev) => {
    chip.unlock();
    try { cv.focus({ preventScroll: true }); } catch (e) { /* focus is best effort */ }
    if (ev.pointerType === 'touch') input.usingTouch = true;
    const r = cv.getBoundingClientRect();
    const v = view;
    const x = ((ev.clientX - r.left) * (cv.width / r.width) - v.ox) / v.scale;
    const y = ((ev.clientY - r.top) * (cv.height / r.height) - v.oy) / v.scale - (v.dy || 0);
    input.tapQueue.push({ x, y });
    input.anyLatch = true;
  });
}

/* ---- touch pad ----------------------------------------------------------------- */
const touchPointers = new Map();
function initTouch() {
  const root = $('touch');
  if (!root) return;
  const onDown = (ev) => {
    ev.preventDefault();
    chip.unlock();
    input.usingTouch = true;
    try { ev.target.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
    touchPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    recomputeTouch(true);
  };
  const onMove = (ev) => {
    if (!touchPointers.has(ev.pointerId)) return;
    ev.preventDefault();
    touchPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    recomputeTouch(false);
  };
  const onUp = (ev) => {
    if (!touchPointers.has(ev.pointerId)) return;
    touchPointers.delete(ev.pointerId);
    recomputeTouch(false);
  };
  for (const el of root.querySelectorAll('.tctl')) {
    el.addEventListener('pointerdown', onDown, { passive: false });
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('lostpointercapture', onUp);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  const pb = $('tPause');
  if (pb) pb.addEventListener('pointerdown', (ev) => { ev.preventDefault(); input.pl[0].latch.pause = true; input.pl[0].latch.back = true; input.anyLatch = true; });
}

function recomputeTouch(isDown) {
  const next = { left: false, right: false, up: false, down: false, punch: false, kick: false, jump: false, special: false };
  const dp = $('dpad').getBoundingClientRect();
  const dcx = dp.left + dp.width / 2, dcy = dp.top + dp.height / 2, rad = dp.width / 2;
  let knob = null;
  for (const p of touchPointers.values()) {
    const dx = p.x - dcx, dy = p.y - dcy, d = Math.hypot(dx, dy);
    if (d < rad * 1.35 && p.x < window.innerWidth * 0.6) {
      knob = [clamp(dx, -rad * 0.55, rad * 0.55), clamp(dy, -rad * 0.55, rad * 0.55)];
      if (d > rad * 0.2) {
        const a = Math.atan2(dy, dx);
        const s8 = Math.round(a / (Math.PI / 4));
        if (s8 === 0 || s8 === 1 || s8 === -1) next.right = true;
        if (s8 === 4 || s8 === -4 || s8 === 3 || s8 === -3) next.left = true;
        if (s8 === 2 || s8 === 1 || s8 === 3) next.down = true;
        if (s8 === -2 || s8 === -1 || s8 === -3) next.up = true;
      }
      continue;
    }
    for (const b of document.querySelectorAll('#touch .tbtn')) {
      const r = b.getBoundingClientRect();
      const m = 10;
      if (p.x >= r.left - m && p.x <= r.right + m && p.y >= r.top - m && p.y <= r.bottom + m) next[b.dataset.k] = true;
    }
  }
  const T0 = input.pl[0];
  for (const k in next) {
    if (next[k] && !T0.touch[k]) { T0.latch[k] = true; input.anyLatch = true; T0.any = true; }
    T0.touch[k] = next[k];
  }
  for (const b of document.querySelectorAll('#touch .tbtn')) b.classList.toggle('on', !!next[b.dataset.k]);
  const kn = $('dpadKnob');
  if (kn) kn.style.transform = knob ? 'translate(' + knob[0] + 'px,' + knob[1] + 'px)' : '';
  const dpEl = $('dpad');
  for (const dir of ['left', 'right', 'up', 'down']) dpEl.classList.toggle(dir, next[dir]);
  if (isDown && navigator.vibrate && settings.shake) { try { navigator.vibrate(6); } catch (e) { /* ignore */ } }
}

/* ---- gamepads: the first pad is player one, the second player two ----------------- */
function pollPads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const live = [];
  if (pads) for (const p of pads) if (p && p.connected) live.push(p);
  input.pads = live.length;
  for (let k = 0; k < 2; k++) {
    const P = input.pl[k].pad, gp = live[k];
    for (const a of ACTIONS) P[a] = false;
    if (!gp) continue;
    const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    P.left = b(14) || ax < -0.4; P.right = b(15) || ax > 0.4; P.up = b(12) || ay < -0.45; P.down = b(13) || ay > 0.45;
    P.punch = b(2); P.kick = b(3) || b(1); P.jump = b(0); P.special = b(4) || b(5) || b(6) || b(7);
    P.start = b(9); P.back = b(8);
    if (gp.buttons.some((x) => x && x.pressed)) { input.usingPad = true; input.usingTouch = false; input.pl[k].any = true; }
  }
}

/* ---- per frame merge ----------------------------------------------------------------- */
/** Sample every device once per animation frame; edges accumulate until a game step consumes them. */
function pollInput() {
  pollPads();
  for (const pi of input.pl) {
    for (const a of ACTIONS) {
      const now = !!(pi.kb[a] || pi.pad[a] || pi.touch[a]);
      if ((now && !pi.prev[a]) || pi.latch[a]) pi.pend[a] = true;
      pi.held[a] = now; pi.prev[a] = now; pi.latch[a] = false;
    }
    if (pi.any) pi.pend.any = true;
    pi.any = false;
  }
  if (input.anyLatch) input.pl[0].pend.any = true;
  input.anyLatch = false;
}

/** Hand the accumulated presses to one game step: one set per player, plus a merged set for menus. */
function takeInput() {
  const both = {};
  for (const pi of input.pl) {
    const P = pi.pressed;
    let any = !!pi.pend.any;
    for (const a of ACTIONS) { P[a] = !!pi.pend[a]; if (P[a]) any = true; pi.pend[a] = false; }
    P.any = any; pi.pend.any = false;
  }
  for (const a of ACTIONS) both[a] = input.pl[0].pressed[a] || input.pl[1].pressed[a];
  both.any = input.pl[0].pressed.any || input.pl[1].pressed.any;
  if (game.state === 'play' && (input.pl[0].pressed.start || (input.pl[1].pressed.start && game.heroes[1] && game.heroes[1].active))) both.pause = true;
  if (game.state === 'play' && !(game.heroes[1] && game.heroes[1].active)) both.start = input.pl[0].pressed.start;
  input.tap = input.tapQueue.length ? input.tapQueue.shift() : null;
  return both;
}
function clearStepInput() { input.tap = null; }
