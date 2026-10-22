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
  window.addEventListener('orientationchange', () => setTimeout(resizeRenderer, 250));
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
  window.__ace = { game, world, settings, startMatch, startDemo, updateGame, onSwingInput, cam, ui, audio, LEVELS, INPUT_WINDOWS, snapCamera };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
