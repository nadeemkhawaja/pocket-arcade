/* ==========================================================================
   Boot and main loop
   ========================================================================== */

const perf = { acc: 0, frames: 0, slow: 0 };

function perfWatch(dt) {
  if (settings.quality !== 'auto') return;
  perf.acc += dt; perf.frames++;
  if (perf.acc < 2.5) return;
  const fps = perf.frames / perf.acc;
  perf.acc = 0; perf.frames = 0;
  if (fps < 42 && world.dpr > 1.0) {
    perf.slow++;
    if (perf.slow >= 2) {
      world.dpr = Math.max(1.0, world.dpr - 0.25);
      world.renderer.setPixelRatio(world.dpr);
      resizeRenderer();
      perf.slow = 0;
    }
  } else perf.slow = 0;
}

let lastFrame = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastFrame) lastFrame = now;
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (dt > 0.1) dt = 0.1;
  if (dt <= 0) dt = 0.0001;
  world.t += dt;
  try {
    if (!game.manual) updateGame(dt);
    const live = game.paused ? 0 : dt;
    updateCrowd(live);
    updateFx(live);
    updateBallVisual(game.ball, live);
    updateCamera(live);
    cam.update(now);
    ui.tick(now);
  } catch (err) {
    if (!frame.errored) { frame.errored = true; console.error(err); }
  }
  perfWatch(dt);
  if (!world.noRender) world.renderer.render(world.scene, world.camera);
}

function showFatal(text) {
  const f = $('fatal');
  if (text) $('fatalText').textContent = text;
  f.hidden = false;
  $('loading').hidden = true;
}

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
    const t = e.target, form = t && t.closest && t.closest('input,textarea,select,a,button,label,.chip,[role=button]');
    if (now - lastEnd < 350 && !form) stop(e);
    lastEnd = now;
  }, { passive: false });
  const relayout = () => { unzoom(); laidOut = window.innerWidth + 'x' + window.innerHeight + '@' + (window.devicePixelRatio || 1); resizeRenderer(); };
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

function boot() {
  if (!window.THREE) { showFatal(); return; }
  try {
    initRenderer();
    buildWorld();
    setSurface(settings.surface);
    buildUmpire();
  } catch (e) {
    console.error(e);
    showFatal('This browser could not start 3D graphics (WebGL). Try a recent Chrome, Edge, Safari or Firefox.');
    return;
  }
  ui.init();
  input.init();
  startDemo();
  camTargets(0);
  camRig.pos.copy(camRig.tp); camRig.look.copy(camRig.tl);
  ui.showTitle();
  requestAnimationFrame(frame);
  setTimeout(() => { $('loading').hidden = true; }, 120);
  window.addEventListener('resize', () => { resizeRenderer(); ui.syncSetup(); });
  guardViewport();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (ui.playing()) ui.pause();
      audio.hush();
      if (audio.ctx && audio.ctx.state === 'running') audio.ctx.suspend().catch(() => {});
    } else if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
  });
  try {
    if (document.fonts && document.fonts.load) {
      document.fonts.load('700 64px "Fredoka"').then(() => {
        repaintTextTextures();
        if (world.board) drawScoreboard(world.board.last);
      }).catch(() => {});
    }
  } catch (e) { /* font loading api unavailable */ }
  window.__ace = { game, world, settings, startMatch, startDemo, updateGame, onSwingInput, cam, ui, audio, LEVELS, INPUT_WINDOWS, snapCamera, plus, PROG, MEDALS, SURFACES, endPoint, plusCourtOpen, plusOnHit, plusOnMatch };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
