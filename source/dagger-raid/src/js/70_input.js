/* ==========================================================================
   Input: keyboard, gamepad and touch pad merged into one action state
   ========================================================================== */

const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'knife', 'special', 'start', 'pause', 'back'];
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyX: 'jump', KeyK: 'jump',
  KeyZ: 'knife', KeyJ: 'knife', KeyF: 'knife',
  KeyC: 'special', KeyL: 'special', ShiftLeft: 'special', ShiftRight: 'special',
  Enter: 'start', NumpadEnter: 'start', KeyP: 'pause', Escape: 'back'
};

const input = {
  held: {}, pressed: {}, prev: {}, kb: {}, latch: {}, touch: {}, pad: {},
  tap: null, tapQueue: [], typed: [], typedQueue: [], backspace: false, bsLatch: false, anyLatch: false,
  usingTouch: false, usingPad: false, padIdx: -1, pend: {}
};
for (const a of ACTIONS) { input.held[a] = false; input.pressed[a] = false; input.prev[a] = false; }
const NO_PRESS = Object.freeze({ left: false, right: false, up: false, down: false, jump: false, knife: false, special: false, start: false, pause: false, back: false, any: false });

function initInput() {
  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    input.usingTouch = false;
    if (game.state === 'entry' && !game.entry.done) {
      if (/^Key[A-Z]$/.test(ev.code) || /^Digit[0-9]$/.test(ev.code) || ev.code === 'Period' || ev.code === 'Minus') {
        input.typedQueue.push(ev.key.length === 1 ? ev.key : ev.code.slice(-1));
        ev.preventDefault(); return;
      }
      if (ev.code === 'Backspace') { input.bsLatch = true; ev.preventDefault(); return; }
    }
    const a = KEYMAP[ev.code];
    input.anyLatch = true;
    if (!a) return;
    ev.preventDefault();
    if (!input.kb[a]) input.latch[a] = true;
    input.kb[a] = true;
    if (a === 'back') input.latch.pause = true;
    chip.unlock();
  }, { passive: false });
  window.addEventListener('keyup', (ev) => {
    const a = KEYMAP[ev.code];
    if (a) input.kb[a] = false;
  });
  window.addEventListener('blur', () => { for (const a of ACTIONS) { input.kb[a] = false; input.touch[a] = false; } touchPointers.clear(); });
  window.addEventListener('gamepadconnected', (e) => { input.padIdx = e.gamepad.index; input.usingPad = true; });
  window.addEventListener('gamepaddisconnected', () => { input.padIdx = -1; });
  initTouch();
  const cv = $('screen');
  cv.addEventListener('pointerdown', (ev) => {
    chip.unlock();
    try { cv.focus({ preventScroll: true }); } catch (e) { /* focus is best effort */ }
    if (ev.pointerType === 'touch') input.usingTouch = true;
    const r = cv.getBoundingClientRect();
    const v = view;
    const x = ((ev.clientX - r.left) * (cv.width / r.width) - v.ox) / v.scale;
    const y = ((ev.clientY - r.top) * (cv.height / r.height) - v.oy) / v.scale;
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
  if (pb) pb.addEventListener('pointerdown', (ev) => { ev.preventDefault(); input.latch.pause = true; input.latch.back = true; input.anyLatch = true; });
}

function recomputeTouch(isDown) {
  const next = { left: false, right: false, up: false, down: false, jump: false, knife: false, special: false };
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
  for (const k in next) {
    if (next[k] && !input.touch[k]) { input.latch[k] = true; input.anyLatch = true; }
    input.touch[k] = next[k];
  }
  for (const b of document.querySelectorAll('#touch .tbtn')) b.classList.toggle('on', !!next[b.dataset.k]);
  const kn = $('dpadKnob');
  if (kn) kn.style.transform = knob ? 'translate(' + knob[0] + 'px,' + knob[1] + 'px)' : '';
  const dpEl = $('dpad');
  for (const dir of ['left', 'right', 'up', 'down']) dpEl.classList.toggle(dir, next[dir]);
  if (isDown && navigator.vibrate && settings.shake) { try { navigator.vibrate(6); } catch (e) { /* ignore */ } }
}

/* ---- gamepad --------------------------------------------------------------------- */
function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  if (pads) for (const p of pads) if (p && p.connected) { gp = p; break; }
  const P = input.pad;
  for (const a of ACTIONS) P[a] = false;
  if (!gp) return;
  const b = (i) => gp.buttons[i] && gp.buttons[i].pressed;
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  P.left = b(14) || ax < -0.45;
  P.right = b(15) || ax > 0.45;
  P.up = b(12) || ay < -0.55;
  P.down = b(13) || ay > 0.55;
  P.jump = b(0);
  P.knife = b(2) || b(5) || b(7);
  P.special = b(1) || b(3) || b(4) || b(6);
  P.start = b(9);
  P.back = b(8);
  if (gp.buttons.some((x) => x && x.pressed)) { input.usingPad = true; input.usingTouch = false; }
}

/* ---- per frame merge ----------------------------------------------------------------- */
/** Sample every device once per animation frame; edges accumulate until a game step consumes them. */
function pollInput() {
  pollPad();
  for (const a of ACTIONS) {
    const now = !!(input.kb[a] || input.pad[a] || input.touch[a]);
    if ((now && !input.prev[a]) || input.latch[a]) input.pend[a] = true;
    input.held[a] = now;
    input.prev[a] = now;
    input.latch[a] = false;
  }
  if (input.anyLatch) input.pend.any = true;
  input.anyLatch = false;
  if (input.pad.start || input.pad.back) chip.unlock();
}

/** Hand the accumulated presses to one game step and clear them. */
function takeInput() {
  const P = input.pressed;
  let any = !!input.pend.any;
  for (const a of ACTIONS) { P[a] = !!input.pend[a]; if (P[a]) any = true; input.pend[a] = false; }
  if (P.start && game.state === 'play') P.pause = true;
  P.any = any; input.pend.any = false;
  input.tap = input.tapQueue.length ? input.tapQueue.shift() : null;
  input.typed = input.typedQueue.splice(0);
  input.backspace = input.bsLatch; input.bsLatch = false;
  return P;
}
function clearStepInput() { input.tap = null; input.typed = []; input.backspace = false; }
