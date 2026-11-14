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
  const bk = Math.round(dp * 0.44), bj = Math.round(dp * 0.37), bs = Math.round(dp * 0.32);
  root.style.setProperty('--dp', dp + 'px'); root.style.setProperty('--bk', bk + 'px');
  root.style.setProperty('--bj', bj + 'px'); root.style.setProperty('--bs', bs + 'px');
  return { left: Math.max(16, safe.l) + dp + 14, right: Math.max(16, safe.r) + bk * 2 + 12 + 14 };
}

function layout() {
  readSafe();
  const cv = $('screen');
  const vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth), vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight);
  laidOut = window.innerWidth + 'x' + window.innerHeight + '@' + (window.devicePixelRatio || 1);
  // full resolution, capped so huge screens stay smooth
  const dpr = Math.min(3, window.devicePixelRatio || 1, 2600 / Math.max(1, vw), 1600 / Math.max(1, vh)) * QUALITY.res[QUALITY.level];
  const tw = Math.max(1, Math.round(vw * dpr)), th = Math.max(1, Math.round(vh * dpr));
  if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }
  const touchOn = touchVisible();
  const portrait = vh > vw * 1.05;
  const B = document.body.classList;
  B.toggle('touch-on', touchOn);
  B.toggle('portrait', portrait);
  let gx = 0, gy = 0, gw = vw, gh = vh, zoom = 1;
  if (touchOn && portrait) {
    // upright phone: zoom in on the action so the picture is taller, as far as the pad below allows
    gy = safe.t + 6;
    const baseH = (vw * H) / W;
    const dp = $('dpad'), padTop = dp ? dp.getBoundingClientRect().top : 0;
    const room = (padTop > vh * 0.4 ? padTop : vh * 0.7) - gy - 14;
    zoom = clamp(room / baseH, 1, 1.85);
    gh = baseH * zoom;
    // whatever height is still spare is shared above and below the picture
    gy += Math.max(0, room - gh) * 0.5;
  } else if (touchOn) {
    // handheld landscape: the pad lives in side panels, the screen sits between them
    const pad = sizePad(vw, vh, false);
    const side = Math.max(pad.left, pad.right);
    const full = Math.min(vw, (vh * 16) / 9);
    // the picture takes the full height; the pad may overlap its outer edges rather than shrink it
    gw = Math.min(vw, Math.max(vw - 2 * side, full));
    gx = (vw - gw) / 2;
    gy = Math.max(0, safe.t);
    gh = vh - gy - Math.max(0, safe.b * 0.5);
  }
  if (!touchOn || portrait) sizePad(vw, vh, true);
  const s = Math.min(gw / W, gh / (H * zoom)) * dpr;
  view.scale = s;
  view.zoom = zoom;
  view.dy = (H * (zoom - 1)) / 2;
  view.ox = Math.round(gx * dpr + (gw * dpr - W * s) / 2);
  view.oy = Math.round(gy * dpr + (gh * dpr - H * zoom * s) / 2);
  document.documentElement.style.setProperty('--game-bottom', Math.round((view.oy + H * zoom * s) / dpr) + 'px');
}
function layoutTouch() { layout(); }

/* ---- keep the page from zooming or scrolling out from under the game --------------- */
const VIEWPORT_LOCK = 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
let laidOut = '';
function viewportMeta() {
  let m = document.querySelector('meta[name="viewport"]');
  if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
  return m;
}
/** If the browser zoomed in anyway (double tap, pinch, rotation), snap back to 1:1. */
function unzoom() {
  const vv = window.visualViewport;
  if (vv && Math.abs(vv.scale - 1) > 0.02) {
    const m = viewportMeta();
    m.setAttribute('content', VIEWPORT_LOCK + ',_r=' + Date.now() % 97);
    setTimeout(() => m.setAttribute('content', VIEWPORT_LOCK), 60);
  }
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
}
function guardViewport() {
  viewportMeta().setAttribute('content', VIEWPORT_LOCK);
  const stop = (e) => { if (e.cancelable) e.preventDefault(); };
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, stop, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) stop(e); }, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) stop(e); }, { passive: false });
  // a fast second tap anywhere on the game is play, never a zoom request
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = performance.now();
    const t = e.target, form = t && t.closest && t.closest('input,textarea,select,a');
    if (now - lastEnd < 350 && !form) stop(e);
    lastEnd = now;
  }, { passive: false });
  const relayout = () => { unzoom(); layout(); };
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', relayout); window.visualViewport.addEventListener('scroll', unzoom); }
  window.addEventListener('pageshow', relayout);
  window.addEventListener('orientationchange', () => { for (const d of [60, 300, 700, 1200]) setTimeout(relayout, d); });
  if (window.screen && screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => { for (const d of [60, 400, 900]) setTimeout(relayout, d); });
  // belt and braces: some browsers report the new size late and send no event for it
  setInterval(() => {
    const key = window.innerWidth + 'x' + window.innerHeight + '@' + (window.devicePixelRatio || 1);
    if (key !== laidOut) relayout(); else unzoom();
  }, 500);
}

let lastT = 0, acc = 0, manual = false, lastTouchState = null;
function frame(now) {
  requestAnimationFrame(frame);
  if (manual) return;
  if (!lastT) lastT = now;
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.25) dt = 0.25;
  watchSpeed(dt);
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

/** If the device can't hold a smooth frame rate, render at a lower resolution. */
const speed = { t: 0, n: 0, slow: 0 };
function watchSpeed(dt) {
  if (document.hidden || dt <= 0 || dt > 0.2) return;
  speed.t += dt; speed.n++;
  if (dt > 1 / 42) speed.slow++;
  if (speed.t < 2.5) return;
  const slowShare = speed.slow / speed.n;
  speed.t = 0; speed.n = 0; speed.slow = 0;
  if (slowShare > 0.45 && QUALITY.level < QUALITY.res.length - 1 && (game.state === 'play' || game.state === 'title')) {
    QUALITY.level++;
    layout();
  }
}

function boot() {
  initInput();
  layout();
  window.addEventListener('resize', layout);
  guardViewport();
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
  loadFonts();
  ensureArtScale();
  stageArt(STAGES[0]);
  try { $('screen').focus({ preventScroll: true }); } catch (e) { /* focus is best effort */ }
  setState('boot');
  requestAnimationFrame(frame);
  if (window.claude && window.claude.hot && typeof window.claude.hot.snapshot === 'function') {
    try { window.claude.hot.snapshot(hotSnapshot); } catch (e) { /* viewer without hot updates */ }
  }

  // hooks for automated testing
  const blank = () => ({ left: false, right: false, up: false, down: false, jump: false, knife: false, special: false, dash: false, start: false, pause: false, back: false, any: false });
  window.__dagger = {
    game, input, chip, settings, STAGES, ETYPES, Chip, SONGS, parseTrack, DIFFS, MEDALS, PROG, MELEE, HERO_OUTFITS, ART, DBG, QUALITY,
    setManual(v) { manual = v; game.skipPerks = !!v; },
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
    render: renderFrame, newGame, startStage, startDemo, setState, spawnFoe, makeBoss, layout, view, beginPlay, hurtHero, killFoe, qualifies, botInput, botPressed,
    updateGame, spawnItem, collect, award, heroKnifeBox, foeBox, drawSprite, stageArt, restartStage, outfitOpen, PERKS, perk, takePerk, offerPerks, styleAdd, styleRank, heroMaxHp
  };
}

/** State worth keeping if the page is updated while someone is mid-run. */
function hotSnapshot() {
  const live = ['intro', 'play', 'pause', 'clear', 'continue'].includes(game.state) && !game.demo;
  if (!live) return {};
  const h = game.hero;
  return { run: { stage: game.stageIdx, score: game.score, lives: game.lives, continues: game.continues, level: game.diff.id, carry: h ? { wpn: h.wpn, ammo: h.ammo, hp: h.hp, blade: h.blade, bladeN: h.bladeN } : null } };
}

function resumeRun(r) {
  if (r.level && DIFFS[r.level]) settings.level = r.level;
  newGame(false);
  game.score = r.score || 0; game.lives = r.lives == null ? game.diff.lives : r.lives; game.continues = r.continues || 0;
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
