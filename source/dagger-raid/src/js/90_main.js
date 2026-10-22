/* ==========================================================================
   Boot, layout and the main loop
   ========================================================================== */

function touchVisible() {
  const m = settings.touch || 'auto';
  if (m === 'on') return true;
  if (m === 'off') return false;
  return (isTouch && coarse && !input.usingPad) || input.usingTouch;
}

let safe = { t: 0, b: 0, l: 0, r: 0 };
function readSafe() {
  const pr = $('safeProbe');
  if (!pr) return;
  const cs = getComputedStyle(pr);
  safe = { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
}

/** Size the touch pad for landscape and report how much side room it needs. */
function sizePad(vw, vh, portrait) {
  const root = $('touch');
  if (!root) return { left: 0, right: 0 };
  if (portrait) { for (const k of ['--dp', '--bk', '--bj', '--bs']) root.style.removeProperty(k); return { left: 0, right: 0 }; }
  const dp = Math.round(clamp(Math.min(vh, 520) * 0.33, 100, 160));
  const bk = Math.round(dp * 0.47), bj = Math.round(dp * 0.41), bs = Math.round(dp * 0.33);
  root.style.setProperty('--dp', dp + 'px'); root.style.setProperty('--bk', bk + 'px');
  root.style.setProperty('--bj', bj + 'px'); root.style.setProperty('--bs', bs + 'px');
  return { left: Math.max(16, safe.l) + dp + 14, right: Math.max(16, safe.r) + bk + bj + 18 + 14 };
}

function layout() {
  readSafe();
  const cv = $('screen');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const vw = window.innerWidth, vh = window.innerHeight;
  const tw = Math.max(1, Math.round(vw * dpr)), th = Math.max(1, Math.round(vh * dpr));
  if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
  const touchOn = touchVisible();
  const portrait = vh > vw * 1.05;
  const B = document.body.classList;
  B.toggle('touch-on', touchOn);
  B.toggle('portrait', portrait);
  let gx = 0, gy = 0, gw = vw, gh = vh;
  if (touchOn && portrait) {
    gy = safe.t + 8;
    gh = Math.min((vw * 9) / 16, vh * 0.52);
  } else if (touchOn) {
    // handheld landscape: the pad lives in side panels, the screen sits between them
    const pad = sizePad(vw, vh, false);
    const side = Math.max(pad.left, pad.right);
    const full = Math.min(vw, (vh * 16) / 9);
    gw = Math.min(vw, Math.max(vw - 2 * side, full * 0.72));
    gx = (vw - gw) / 2;
    gy = Math.max(0, safe.t);
    gh = vh - gy - Math.max(0, safe.b * 0.5);
  }
  if (!touchOn || portrait) sizePad(vw, vh, true);
  const fit = Math.min(gw / W, gh / H) * dpr;
  let s = fit;
  if (fit >= 2) { const f = Math.floor(fit); if (f / fit > 0.9) s = f; }
  view.scale = s;
  view.ox = Math.round(gx * dpr + (gw * dpr - W * s) / 2);
  view.oy = Math.round(gy * dpr + (gh * dpr - H * s) / 2);
  document.documentElement.style.setProperty('--game-bottom', Math.round((view.oy + H * s) / dpr) + 'px');
  crtCache = null;
}
function layoutTouch() { layout(); }

let lastT = 0, acc = 0, manual = false, lastTouchState = null;
function frame(now) {
  requestAnimationFrame(frame);
  if (manual) return;
  if (!lastT) lastT = now;
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  pollInput();
  const tv = touchVisible();
  if (tv !== lastTouchState) { lastTouchState = tv; layout(); }
  let steps = 0;
  while (acc >= STEP && steps < 8) {
    if (steps === 0) updateGame(STEP, input.held, takeInput());
    else { clearStepInput(); updateGame(STEP, input.held, NO_PRESS); }
    acc -= STEP; steps++;
  }
  if (steps >= 8) acc = 0;
  renderFrame();
}

function boot() {
  initInput();
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 150));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (game.state === 'play' && !game.demo) openPause();
      if (chip.ctx) chip.ctx.suspend().catch(() => {});
    } else {
      lastT = 0;
      if (chip.ctx) chip.ctx.resume().catch(() => {});
    }
  });
  window.addEventListener('blur', () => { if (game.state === 'play' && !game.demo) openPause(); });
  stageArt(STAGES[0]);
  try { $('screen').focus({ preventScroll: true }); } catch (e) { /* focus is best effort */ }
  setState('boot');
  requestAnimationFrame(frame);
  if (window.claude && window.claude.hot && typeof window.claude.hot.snapshot === 'function') {
    try { window.claude.hot.snapshot(hotSnapshot); } catch (e) { /* viewer without hot updates */ }
  }

  // hooks for automated testing
  const blank = () => ({ left: false, right: false, up: false, down: false, jump: false, knife: false, special: false, start: false, pause: false, back: false, any: false });
  window.__dagger = {
    game, input, chip, settings, STAGES, ETYPES, Chip, SONGS, parseTrack,
    setManual(v) { manual = v; },
    step(n, held, pressed, quiet) {
      const H0 = Object.assign(blank(), held || {});
      for (let i = 0; i < n; i++) {
        const P = i === 0 ? Object.assign(blank(), pressed || {}) : NO_PRESS;
        if (i === 0 && pressed && pressed.tap) input.tap = pressed.tap; else input.tap = null;
        input.typed = (i === 0 && pressed && pressed.typed) || [];
        updateGame(STEP, H0, P);
      }
      if (!quiet) renderFrame();
    },
    render: renderFrame, newGame, startStage, startDemo, setState, spawnFoe, makeBoss, layout, view
  };
}

/** State worth keeping if the page is updated while someone is mid-run. */
function hotSnapshot() {
  const live = ['intro', 'play', 'pause', 'clear', 'continue'].includes(game.state) && !game.demo;
  if (!live) return {};
  const h = game.hero;
  return { run: { stage: game.stageIdx, score: game.score, lives: game.lives, continues: game.continues, carry: h ? { wpn: h.wpn, ammo: h.ammo, hp: h.hp } : null } };
}

function resumeRun(r) {
  newGame(false);
  game.score = r.score || 0; game.lives = r.lives == null ? 2 : r.lives; game.continues = r.continues || 0;
  game.nextExtend = 30000;
  while (game.nextExtend <= game.score) game.nextExtend += 70000;
  game.hi = Math.max(game.hi, game.score);
  game.carry = r.carry || null;
  startStage(clamp(r.stage | 0, 0, STAGES.length - 1));
}

function start(data) {
  boot();
  if (data && data.run) { try { resumeRun(data.run); } catch (e) { setState('boot'); } }
}

const hot = window.claude && window.claude.hot;
if (hot && typeof hot.ready === 'function') hot.ready(start);
else start((hot && hot.data) || {});
