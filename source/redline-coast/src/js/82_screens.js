/* ==========================================================================
   Screens: title, garage, how to play, options, scores, medals, stage cards,
   pause, continue, results, ending and name entry.
   ========================================================================== */

/** A slanted slab, the house shape for panels and buttons. */
function slab(g, x, y, w, h, fill, k) {
  const s = k === undefined ? h * 0.35 : k;
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w - s, y + h); g.lineTo(x - s, y + h); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
function panel(g, x, y, w, h, o) {
  g.fillStyle = (o && o.fill) || 'rgba(10,6,22,0.84)'; roundRectPath(g, x, y, w, h, 4); g.fill();
  g.strokeStyle = (o && o.border) || 'rgba(255,61,90,0.75)'; g.lineWidth = (o && o.lw) || 0.7; g.stroke();
  rect(g, x + 6, y, 26, 1.4, C.gold);
}
function menuBar(g, x, y, w, h, on) {
  if (on) { slab(g, x, y, w, h, lgrad(g, x, 0, x + w, 0, [[0, '#ff3d5a'], [0.7, '#c81e4a'], [1, 'rgba(200,30,74,0.2)']])); rect(g, x - 2, y + h - 1, w * 0.4, 1, '#ffd27a'); }
  else slab(g, x, y, w, h, 'rgba(10,6,22,0.5)');
}
function dimAll(g, a) { rect(g, -W * 2, -H * 6, W * 5, H * 13, 'rgba(6,4,14,' + a + ')'); }
function bigTitle(g, s, x, y, scale, o) {
  return T(g, s, x, y, (o && o.fill) || '#ffffff', Object.assign({ scale, display: true, stroke: (o && o.stroke) || 'rgba(0,0,0,0.7)', strokeW: scale * 0.9, align: 'center' }, o || {}));
}

function drawLogo(g, cx, y, s) {
  g.save(); g.translate(cx, y); g.scale(s, s);
  g.font = fontSpec(5.8, { display: true }); g.textAlign = 'center'; g.textBaseline = 'top';
  // speed stripes trail off the left edge of the name, wherever the loaded font puts it
  const lx = 2 - g.measureText('REDLINE').width / 2;
  for (let i = 0; i < 4; i++) slab(g, lx - 34 + i * 3, 9 + i * 7.4, 30 - i * 5, 4.4, ['#ff3d5a', '#ff7a3a', '#ffd27a', '#7fe9ff'][i], 2);
  g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#12061e'; g.strokeText('REDLINE', 2, 0);
  g.fillStyle = '#12061e'; g.fillText('REDLINE', 3.4, 2.2);
  g.fillStyle = lgrad(g, 0, 2, 0, 44, [[0, '#ffffff'], [0.42, '#ffe08a'], [0.5, '#ff8a3a'], [1, '#ff2a5a']]); g.fillText('REDLINE', 2, 0);
  rect(g, -92, 50, 196, 1.6, '#ff3d5a');
  g.font = fontSpec(2.3, { display: true }); g.lineWidth = 2.6; g.strokeText('C  O  A  S  T', 30, 54); g.fillStyle = '#7fe9ff'; g.fillText('C  O  A  S  T', 30, 54);
  g.restore(); g.textAlign = 'left';
}

function controlHint() {
  if (input.usingTouch || (isTouch && coarse && !input.usingPad)) return 'ARROWS STEER   B BRAKE AND DRIFT   N NITRO   GAS IS AUTOMATIC';
  if (input.usingPad) return 'STICK STEER   A GAS   X BRAKE   B NITRO';
  return 'ARROWS STEER AND GAS   Z BRAKE   SPACE NITRO   M MUTE';
}

function drawBoot(g) {
  const vh = viewH();
  g.fillStyle = lgrad(g, 0, 0, 0, vh, [[0, '#12062a'], [0.55, '#5a1456'], [1, '#ff6a3a']]); g.fillRect(0, 0, W, vh);
  g.save(); g.translate(0, view.dy);
  for (let i = 0; i < 9; i++) rect(g, 0, 150 + i * i * 1.1, W, 0.6 + i * 0.25, 'rgba(255,210,122,0.35)');
  drawLogo(g, W / 2, 34, 1);
  if (blink(1.6)) T(g, isTouch && coarse ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', W / 2, 126, C.gold, { align: 'center', scale: 1.6, weight: 700 });
  T(g, 'SOUND ON FOR THE FULL EXPERIENCE', W / 2, 150, '#f0d8e8', { align: 'center' });
  g.restore();
}

function drawTitle(g) {
  dimAll(g, isTall() ? 0.5 : 0.34);
  drawLogo(g, W / 2, 8, 0.84);
  const y0 = 84;
  TITLE_ITEMS.forEach((it, i) => {
    const sel = game.menu === i, y = y0 + i * 15.5;
    menuBar(g, W / 2 - 58, y - 2.6, 116, 13, sel);
    T(g, it, W / 2 + (sel ? 2 : 0), y - 0.4, sel ? '#ffffff' : '#d4d8e8', { align: 'center', scale: 1.2, weight: 700 });
    hitArea(W / 2 - 90, y - 5, W / 2 + 90, y + 11, { i });
  });
  T(g, 'TOP ' + String(Math.floor(game.scores[0].s)).padStart(7, '0') + '  ' + game.scores[0].n + '     MEDALS ' + medalCount() + ' / ' + MEDALS.length, W / 2, 166, C.gold, { align: 'center', weight: 700 });
  wrapText(controlHint(), isTall() ? 190 : 380, 0.85).forEach((ln, i) => T(g, ln, W / 2, (isTall() ? 180 : 202) + i * 9, '#e8e0f0', { align: 'center', scale: 0.85 }));
}

function statBar(g, x, y, label, v, on) {
  T(g, label, x, y, on ? C.ink : C.dim, { scale: 0.74, weight: 700 });
  for (let k = 0; k < 8; k++) slab(g, x + 30 + k * 7.4, y + 1.2, 5.6, 4.6, k < v ? (on ? (k > 5 ? C.red : C.gold) : '#8a7a5a') : 'rgba(255,255,255,0.1)', 1.2);
}
function drawGarage(g) {
  if (isTall()) return drawGarageTall(g);
  dimAll(g, 0.74);
  bigTitle(g, 'CHOOSE YOUR CAR', W / 2, 5, 1.9);
  CAR_ORDER.forEach((id, i) => {
    const car = CARS[id], sel = settings.car === id, x0 = 14 + i * 120, y0 = 28, w = 116, hgt = 96;
    panel(g, x0, y0, w, hgt, { border: sel ? (game.menu === 0 && blink(3) ? '#ffe08a' : '#ff3d5a') : 'rgba(120,110,150,0.5)', lw: sel ? 1.1 : 0.6, fill: sel ? 'rgba(26,10,38,0.92)' : 'rgba(10,6,22,0.8)' });
    const c = carArt(car.style, car.col, sel ? Math.round(Math.sin(game.t * 1.6) * 2) : 0, '', car.stripe);
    if (sel) { g.save(); g.translate(x0 + w / 2, y0 + 50); g.scale(1, 0.3); drawGlow(g, 0, 0, 56, '#ff3d8a', 0.5); g.restore(); }
    g.globalAlpha = sel ? 1 : 0.5;
    g.drawImage(shadowSprite(), x0 + w / 2 - 44, y0 + 44, 88, 13);
    const cw = c.uw * 0.98, ch = c.uh * 0.98; g.drawImage(c, x0 + w / 2 - cw / 2, y0 + 53 - ch + 14, cw, ch);
    g.globalAlpha = 1;
    T(g, CAR_STYLES[car.style].name, x0 + w / 2, y0 + 4, sel ? '#ffffff' : C.dim, { align: 'center', scale: 1.25, display: true });
    statBar(g, x0 + 10, y0 + 60, 'SPEED', Math.round(car.top * 6.2 - 0.3), sel); statBar(g, x0 + 10, y0 + 68, 'ACCEL', Math.round(car.acc * 5.6), sel); statBar(g, x0 + 10, y0 + 76, 'GRIP', Math.round(car.grip * 5.6), sel);
    T(g, car.blurb, x0 + w / 2, y0 + 85.5, sel ? C.cyan : '#6a6a80', { align: 'center', scale: 0.74, weight: 700 });
    hitArea(x0, y0, x0 + w, y0 + hgt, { car: id });
  });
  if (game.menu === 0 && !input.usingTouch) { const nx = Math.sin(game.t * 6) * 1.5; T(g, '<', 7 - nx, 66, C.gold, { align: 'center', weight: 700, scale: 1.6 }); T(g, '>', W - 7 + nx, 66, C.gold, { align: 'center', weight: 700, scale: 1.6 }); }
  const y = 134;
  T(g, 'LEVEL', 16, y, game.menu === 1 ? C.ink : C.dim, { weight: 700 });
  LEVELS.forEach((lv, i) => {
    const sel = settings.level === lv, x = 62 + i * 78;
    slab(g, x, y - 3.4, 70, 14, sel ? lgrad(g, x, 0, x + 70, 0, [[0, '#ff3d5a'], [1, '#a8143a']]) : 'rgba(255,255,255,0.08)');
    if (sel && game.menu === 1 && blink(3)) { g.strokeStyle = C.gold; g.lineWidth = 0.8; g.stroke(); }
    T(g, DIFFS[lv].name, x + 35, y - 0.4, sel ? C.ink : C.dim, { align: 'center', weight: 700, scale: 1.1 });
    hitArea(x - 4, y - 6, x + 74, y + 13, { level: lv });
  });
  T(g, (DIFFS[settings.level] || DIFFS.sport).blurb, W / 2, y + 14, '#c8c0d8', { align: 'center', scale: 0.86 });
  const many = PROG.reached > 0, goRow = many ? 3 : 2;
  if (many) {
    const sy = 162, n = Math.min(PROG.reached, STAGES.length - 1) + 1, sf = startFrom();
    T(g, 'START AT', 16, sy, game.menu === 2 ? C.ink : C.dim, { weight: 700 });
    for (let i = 0; i < n; i++) {
      const x = 62 + i * 62, sel = sf === i;
      slab(g, x, sy - 3, 56, 13, sel ? 'rgba(127,233,255,0.9)' : 'rgba(255,255,255,0.08)');
      if (sel && game.menu === 2 && blink(3)) { g.strokeStyle = C.gold; g.lineWidth = 0.8; g.stroke(); }
      T(g, STAGES[i].name, x + 28, sy, sel ? '#0a1a2a' : C.dim, { align: 'center', weight: 700, scale: 0.78, shadow: sel ? 'rgba(0,0,0,0)' : C.shadow });
      hitArea(x - 3, sy - 5, x + 59, sy + 12, { stage: i });
    }
  }
  const by = many ? 182 : 174, sel = game.menu === goRow;
  slab(g, W / 2 - 50, by - 4, 100, 17, lgrad(g, 0, by - 4, 0, by + 13, sel ? [[0, blink(3) ? '#4aff8a' : '#2fc86a'], [1, '#12703a']] : [[0, '#1e5a36'], [1, '#0e3a22']]));
  g.strokeStyle = '#d8ffe4'; g.lineWidth = sel ? 0.9 : 0.4; g.stroke();
  T(g, 'START ENGINE', W / 2, by - 0.6, C.ink, { align: 'center', weight: 700, scale: 1.25 });
  hitArea(W / 2 - 56, by - 7, W / 2 + 56, by + 15, { go: true });
  T(g, '< BACK', 8, 204, '#d4d8e8'); hitArea(2, 198, 60, 216, { back: true });
  T(g, input.usingTouch ? 'TAP TO CHOOSE' : 'LEFT/RIGHT CHANGE   UP/DOWN ROW   ENTER START', W - 6, 204, '#b8b0c8', { align: 'right', scale: 0.85 });
}

/** Upright phone: one car at a time, large, with arrows to change it. */
function drawGarageTall(g) {
  dimAll(g, 0.74);
  bigTitle(g, 'CHOOSE YOUR CAR', W / 2, 2, 1.5);
  const id = settings.car, car = CARS[id], x0 = W / 2 - 58, y0 = 20, w = 116, hgt = 96, idx = CAR_ORDER.indexOf(id);
  panel(g, x0, y0, w, hgt, { border: game.menu === 0 && blink(3) ? '#ffe08a' : '#ff3d5a', lw: 1.1, fill: 'rgba(26,10,38,0.92)' });
  const c = carArt(car.style, car.col, Math.round(Math.sin(game.t * 1.6) * 2), '', car.stripe);
  g.save(); g.translate(W / 2, y0 + 50); g.scale(1, 0.3); drawGlow(g, 0, 0, 56, '#ff3d8a', 0.5); g.restore();
  g.drawImage(shadowSprite(), W / 2 - 44, y0 + 44, 88, 13);
  const cw = c.uw * 0.98, ch = c.uh * 0.98; g.drawImage(c, W / 2 - cw / 2, y0 + 53 - ch + 14, cw, ch);
  T(g, CAR_STYLES[car.style].name, W / 2, y0 + 4, '#ffffff', { align: 'center', scale: 1.25, display: true });
  statBar(g, x0 + 10, y0 + 60, 'SPEED', Math.round(car.top * 6.2 - 0.3), true); statBar(g, x0 + 10, y0 + 68, 'ACCEL', Math.round(car.acc * 5.6), true); statBar(g, x0 + 10, y0 + 76, 'GRIP', Math.round(car.grip * 5.6), true);
  T(g, car.blurb, W / 2, y0 + 85.5, C.cyan, { align: 'center', scale: 0.74, weight: 700 });
  const nx = Math.sin(game.t * 6) * 1.5;
  for (const dir of [-1, 1]) {
    const ax = W / 2 + dir * 72;
    disc(g, ax, y0 + 48, 9, 'rgba(255,61,90,0.9)'); T(g, dir < 0 ? '<' : '>', ax + dir * nx * 0.5, y0 + 42, '#ffffff', { align: 'center', weight: 700, scale: 1.6 });
    hitArea(ax - 13, y0 + 30, ax + 13, y0 + 66, { car: CAR_ORDER[(idx + dir + 3) % 3] });
  }
  for (let k = 0; k < 3; k++) disc(g, W / 2 - 8 + k * 8, y0 + hgt + 5, 1.7, k === idx ? C.gold : 'rgba(255,255,255,0.3)');
  const y = y0 + hgt + 14;
  LEVELS.forEach((lv, i) => {
    const sel = settings.level === lv, x = W / 2 - 76 + (i % 2) * 80, yy = y + Math.floor(i / 2) * 17;
    slab(g, x, yy, 72, 14, sel ? lgrad(g, x, 0, x + 72, 0, [[0, '#ff3d5a'], [1, '#a8143a']]) : 'rgba(255,255,255,0.1)');
    T(g, DIFFS[lv].name, x + 36, yy + 3, sel ? C.ink : C.dim, { align: 'center', weight: 700, scale: 1.1 });
    hitArea(x - 3, yy - 1, x + 75, yy + 15, { level: lv });
  });
  wrapText((DIFFS[settings.level] || DIFFS.sport).blurb, 170, 0.8).forEach((ln, i) => T(g, ln, W / 2, y + 37 + i * 8, '#c8c0d8', { align: 'center', scale: 0.8 }));
  let by = y + 58;
  if (PROG.reached > 0) {
    const n = Math.min(PROG.reached, STAGES.length - 1) + 1, sf = startFrom();
    T(g, 'START AT', W / 2, by - 3, C.dim, { align: 'center', weight: 700, scale: 0.8 });
    for (let i = 0; i < n; i++) {
      const x = W / 2 - n * 16 + i * 32, sel = sf === i;
      slab(g, x + 2, by + 6, 26, 13, sel ? 'rgba(127,233,255,0.9)' : 'rgba(255,255,255,0.1)');
      T(g, String(i + 1), x + 15, by + 8.6, sel ? '#0a1a2a' : C.dim, { align: 'center', weight: 700, scale: 1.1, shadow: sel ? 'rgba(0,0,0,0)' : C.shadow });
      hitArea(x, by + 4, x + 30, by + 21, { stage: i });
    }
    by += 26;
  }
  slab(g, W / 2 - 56, by, 112, 20, lgrad(g, 0, by, 0, by + 20, [[0, blink(3) ? '#4aff8a' : '#2fc86a'], [1, '#12703a']]));
  g.strokeStyle = '#d8ffe4'; g.lineWidth = 0.9; g.stroke();
  T(g, 'START ENGINE', W / 2, by + 4.6, C.ink, { align: 'center', weight: 700, scale: 1.4 });
  hitArea(W / 2 - 62, by - 3, W / 2 + 62, by + 24, { go: true });
  T(g, '< BACK', W / 2, by + 30, '#d4d8e8', { align: 'center' }); hitArea(W / 2 - 40, by + 26, W / 2 + 40, by + 42, { back: true });
}

function drawOptions(g) {
  dimAll(g, game.optFrom === 'pause' ? 0.7 : 0.78);
  bigTitle(g, 'OPTIONS', W / 2, 16, 2.1);
  OPTION_ITEMS.forEach((it, i) => {
    const y = 50 + i * 19, sel = game.menu === i;
    menuBar(g, 64, y - 4, W - 128, 15, sel);
    T(g, it, 80, y - 0.5, sel ? C.ink : '#c8c4d8', { weight: 700, scale: 1.1 });
    let val = '';
    if (it === 'MUSIC' || it === 'EFFECTS') { const v = Math.round((it === 'MUSIC' ? settings.music : settings.sfx) * 10); for (let k = 0; k < 10; k++) slab(g, 214 + k * 8, y, 6, 7, k < v ? (sel ? C.gold : '#c9a463') : 'rgba(0,0,0,0.5)', 1.4); }
    else if (it === 'GLOW FX') val = settings.fx ? 'ON' : 'OFF';
    else if (it === 'SCREEN SHAKE') val = settings.shake ? 'ON' : 'OFF';
    else if (it === 'AUTO GAS') val = (settings.autoGas || 'auto').toUpperCase();
    else if (it === 'TOUCH PAD') val = (settings.touch || 'auto').toUpperCase();
    if (val) T(g, '<  ' + val + '  >', 254, y - 0.5, sel ? C.gold : C.ink, { align: 'center', weight: 700, scale: 1.1 });
    if (it !== 'BACK') { hitArea(200, y - 5, 238, y + 11, { i, dir: -1 }); hitArea(270, y - 5, 320, y + 11, { i, dir: 1 }); hitArea(64, y - 5, 199, y + 11, { i, dir: 1 }); }
    else hitArea(64, y - 5, W - 64, y + 11, { i });
  });
  wrapText('AUTO GAS: THE CAR ACCELERATES BY ITSELF. IT IS ALWAYS ON FOR TOUCH SCREENS.', isTall() ? 250 : 380, 0.8).forEach((ln, i) => T(g, ln, W / 2, 186 + i * 8, '#b8b0c8', { align: 'center', scale: 0.8 }));
  T(g, input.usingTouch ? 'TAP < > TO CHANGE' : 'LEFT / RIGHT TO CHANGE    Z TO GO BACK', W / 2, isTall() ? 206 : 198, '#b8b0c8', { align: 'center', scale: 0.85 });
}

function drawHowTo(g) {
  dimAll(g, 0.8);
  const pg = game.page;
  bigTitle(g, ['THE CONTROLS', 'DRIVE LIKE A PRO', 'THE RULES OF THE ROAD'][pg], W / 2, isTall() ? 6 : 12, isTall() ? 1.6 : 2);
  const tall = isTall(), px = tall ? 70 : 30, rh = tall ? 30 : 24, py = tall ? 30 : 40;
  panel(g, px, py, W - px * 2, tall ? 160 : 138);
  const row = (i, head, body, col) => {
    const y = py + 10 + i * rh; slab(g, px + 14, y, 4, tall ? 22 : 15, col || C.red, 1.4); T(g, head, px + 26, y - 1, col || C.gold, { weight: 700, scale: 1.15 });
    wrapText(body, W - px * 2 - 36, 0.86).forEach((ln, k) => T(g, ln, px + 26, y + 9.4 + k * 8.4, '#e0dcec', { scale: 0.86 }));
  };
  if (pg === 0) {
    row(0, 'STEER', 'LEFT AND RIGHT ARROWS, A AND D, THE STICK, OR THE TOUCH PAD.');
    row(1, 'GAS', 'UP ARROW OR X. ON TOUCH SCREENS THE CAR ACCELERATES BY ITSELF.', C.green);
    row(2, 'BRAKE', 'DOWN ARROW OR Z. ALSO STARTS A DRIFT WHEN YOU ARE TURNING.', C.red);
    row(3, 'NITRO', 'SPACE OR C. HOLD TO BURN THE BLUE TANK FOR A HUGE BURST OF SPEED.', C.cyan);
    row(4, 'PAUSE', 'P OR ESC. M MUTES THE SOUND AT ANY TIME.', '#c8c0d8');
  } else if (pg === 1) {
    row(0, 'DRIFT', 'TAP BRAKE WHILE TURNING, THEN HOLD THE TURN. RELEASE FOR A BOOST.', C.cyan);
    row(1, 'NEAR MISS', 'SHAVE PAST TRAFFIC. EACH ONE GROWS YOUR CHAIN AND FILLS NITRO.', C.gold);
    row(2, 'SLIPSTREAM', 'TUCK IN BEHIND A CAR TO GAIN SPEED, THEN PULL OUT AND PASS.', '#ffffff');
    row(3, 'LIFT FOR HAIRPINS', 'SHARP BENDS PUSH YOU WIDE. EASE OFF OR DRIFT THROUGH THEM.', C.red);
    row(4, 'STAY ON THE TARMAC', 'SAND, GRASS AND SNOW KILL YOUR SPEED AND YOUR CHAIN.', C.green);
  } else {
    row(0, 'BEAT THE CLOCK', 'REACH EACH CHECKPOINT BEFORE TIME RUNS OUT. SPARE TIME IS SCORE.', C.gold);
    row(1, 'WIN THE RACE', 'YOU START 8TH. PASS THE PACK AND THE NAMED RIVAL TO FINISH 1ST.', C.red);
    row(2, 'PICK UPS', 'BLUE CANS REFILL NITRO, CLOCKS ADD 3 SECONDS, COINS ARE SCORE.', C.cyan);
    row(3, 'HAZARDS', 'CONES, BARRIERS, BOULDERS, OIL, ICE AND PUDDLES. READ THE ROAD.', '#c08aff');
    row(4, 'FIVE STAGES', 'SUNSET BAY, MESA RUN, PINE PASS, NEON HARBOR, AURORA RIDGE.', C.green);
  }
  const fy = tall ? 196 : 184, bx = tall ? px : 8;
  for (let i = 0; i < HOWTO_PAGES; i++) slab(g, W / 2 - 20 + i * 14, fy, 9, 3.4, i === pg ? C.gold : 'rgba(255,255,255,0.25)', 1);
  T(g, '< BACK', bx, fy + (tall ? -4 : 20), '#d4d8e8'); hitArea(bx - 6, fy + (tall ? -10 : 14), bx + 52, fy + (tall ? 12 : 32), { back: true });
  T(g, pg < HOWTO_PAGES - 1 ? 'NEXT >' : 'DONE >', W - bx, fy + (tall ? -4 : 20), C.gold, { align: 'right', weight: 700 }); hitArea(W - bx - 62, fy + (tall ? -10 : 12), W - bx + 6, fy + (tall ? 12 : 32), { next: true });
}

function drawScores(g) {
  dimAll(g, 0.78);
  bigTitle(g, 'KINGS OF THE COAST', W / 2, 16, 2);
  panel(g, 56, 44, W - 112, 118);
  T(g, 'RANK', 74, 51, C.dim, { scale: 0.85 }); T(g, 'SCORE', 168, 51, C.dim, { align: 'center', scale: 0.85 }); T(g, 'NAME', 236, 51, C.dim, { align: 'center', scale: 0.85 }); T(g, 'STAGE', 298, 51, C.dim, { align: 'center', scale: 0.85 });
  const ranks = ['1ST', '2ND', '3RD', '4TH', '5TH'], cols = ['#ffd27a', '#eef2f6', '#ffb080', C.cyan, C.cyan];
  game.scores.forEach((e, i) => {
    const y = 67 + i * 18, hl = game.entry && game.entry.done && game.entry.rank === i && blink(4), c = hl ? '#ffffff' : cols[i];
    if (hl) slab(g, 66, y - 3, W - 132, 14, 'rgba(255,61,90,0.5)');
    T(g, ranks[i], 74, y, c, { weight: 700, scale: 1.15 }); T(g, String(Math.floor(e.s)).padStart(7, '0'), 168, y, c, { align: 'center', weight: 700, scale: 1.15 });
    T(g, e.n, 236, y, c, { align: 'center', weight: 700, scale: 1.15 }); T(g, e.st >= 5 ? 'ALL' : String(e.st), 298, y, c, { align: 'center', weight: 700, scale: 1.15 });
  });
  T(g, game.attract ? 'PRESS ANY KEY' : 'PRESS A BUTTON TO GO BACK', W / 2, 176, '#d4d8e8', { align: 'center' });
}

function drawMedals(g) {
  dimAll(g, 0.8);
  const tall = isTall();
  bigTitle(g, 'MEDALS  ' + medalCount() + ' / ' + MEDALS.length, W / 2, tall ? -62 : 10, tall ? 1.5 : 1.9);
  MEDALS.forEach((m, i) => {
    const col = tall ? 0 : i % 2, rowI = tall ? i : Math.floor(i / 2), x = tall ? W / 2 - 87 : 16 + col * 178, y = tall ? -44 + rowI * 24.6 : 36 + rowI * 25.5, got = !!PROG.ach[m.id];
    panel(g, x, y, 174, 22, { border: got ? 'rgba(255,210,122,0.9)' : 'rgba(110,104,140,0.5)', fill: got ? 'rgba(40,24,20,0.9)' : 'rgba(10,6,22,0.8)' });
    if (got) drawGlow(g, x + 13, y + 11, 13, '#ffd27a', 0.6);
    disc(g, x + 13, y + 11, 6.6, got ? '#e89a10' : '#3a3648'); disc(g, x + 13, y + 11, 5, got ? '#ffd24a' : '#4a4660');
    T(g, got ? 'R' : '?', x + 13, y + 6.2, got ? '#a85a00' : '#7a7690', { align: 'center', scale: 1.05, display: true, shadow: 'rgba(0,0,0,0)' });
    T(g, m.name, x + 25, y + 2.6, got ? C.gold : '#b0acc4', { weight: 700, scale: 1.02 }); T(g, m.how, x + 25, y + 12.4, got ? '#f0e8d8' : '#8a86a0', { scale: 0.76 });
  });
  T(g, tall ? 'TAP TO GO BACK' : 'PRESS A BUTTON TO GO BACK', W / 2, tall ? 254 : 202, '#d4d8e8', { align: 'center' });
}

function drawMedalToast(g) {
  const m = game.medalQ[0];
  if (!m || ['medals', 'title', 'boot'].includes(game.state) && false) return;
  const t = game.medalT, a = t < 0.25 ? t / 0.25 : t > 2.6 ? Math.max(0, 1 - (t - 2.6) / 0.4) : 1, y = (game.state === 'play' ? 46 - view.dy : 3) + (1 - a) * -10;
  g.globalAlpha = a;
  panel(g, W / 2 - 78, y, 156, 22, { border: 'rgba(255,210,122,0.95)', fill: 'rgba(40,24,20,0.94)' });
  drawGlow(g, W / 2 - 64, y + 11, 13, '#ffd27a', 0.7); disc(g, W / 2 - 64, y + 11, 6.4, '#e89a10'); disc(g, W / 2 - 64, y + 11, 4.8, '#ffd24a');
  T(g, 'MEDAL EARNED', W / 2 - 52, y + 2.4, '#f0e8d8', { scale: 0.76, weight: 700 }); T(g, m.name, W / 2 - 52, y + 10, C.gold, { weight: 700, scale: 1.15 });
  g.globalAlpha = 1;
}

function drawIntro(g) {
  const gm = game, st = gm.T.st, t = gm.stateT, a = Math.min(1, t / 0.3), out = t > 2.2 ? (t - 2.2) / 0.4 : 0;
  dimAll(g, 0.45 * (1 - out));
  g.globalAlpha = a * (1 - out);
  const sl = (1 - Math.min(1, t / 0.35)) * 120;
  slab(g, -20 - sl, 62, W + 40, 62, 'rgba(10,6,22,0.86)', 14); slab(g, -20 - sl, 62, W + 40, 2, C.red, 0.5); slab(g, -32 - sl, 122, W + 40, 2, C.gold, 0.5);
  T(g, 'STAGE ' + (gm.stage + 1) + ' OF ' + STAGES.length, W / 2 + sl, 67, C.gold, { align: 'center', weight: 700, scale: 1.1 });
  bigTitle(g, st.name, W / 2 - sl, 77, 3.4);
  T(g, st.sub, W / 2 + sl, 109, C.cyan, { align: 'center', weight: 700, scale: 1.05 });
  T(g, 'RIVAL: ' + st.rival.name + '      LEVEL: ' + gm.diff.name, W / 2, 132, '#ffffff', { align: 'center', weight: 700 });
  g.globalAlpha = 1;
}

function drawPause(g) {
  dimAll(g, 0.62);
  bigTitle(g, 'PAUSED', W / 2, 40, 2.6);
  PAUSE_ITEMS.forEach((it, i) => {
    const sel = game.menu === i, y = 84 + i * 18;
    menuBar(g, W / 2 - 66, y - 3, 132, 14, sel);
    T(g, it, W / 2, y - 0.4, sel ? '#ffffff' : '#d4d8e8', { align: 'center', scale: 1.2, weight: 700 });
    hitArea(W / 2 - 90, y - 5, W / 2 + 90, y + 12, { i });
  });
  wrapText('RESTARTING A STAGE PUTS YOUR SCORE BACK TO WHERE THE STAGE BEGAN', isTall() ? 200 : 380, 0.82).forEach((ln, i) => T(g, ln, W / 2, 166 + i * 8, '#b8b0c8', { align: 'center', scale: 0.82 }));
}

function drawClear(g) {
  const gm = game, t = gm.tally, st = gm.T.st;
  if (!t) return;
  const a = Math.min(1, gm.stateT / 0.4);
  // ticker tape
  const cols = ['#ff3d5a', '#ffd27a', '#7fe9ff', '#7dffa0', '#ffffff'];
  for (let i = 0; i < 70; i++) {
    const ph = (gm.stateT * (0.22 + (i % 9) * 0.03) + i * 0.173) % 1.3;
    if (gm.stateT < ph * 2.2) continue;
    const x = ((i * 67.7) % W) + Math.sin(gm.stateT * 3 + i) * 8, y = -view.dy - 6 + ph * (viewH() + 12);
    g.save(); g.translate(x, y); g.rotate(gm.stateT * (3 + (i % 5)) + i); rect(g, -2, -1, 4, 2, cols[i % 5]); g.restore();
  }
  g.globalAlpha = a;
  bigTitle(g, 'STAGE CLEAR', W / 2, 30, 3, { fill: C.gold });
  panel(g, 82, 66, W - 164, 96);
  const rows = [
    ['TIME LEFT  ' + t.time.toFixed(1) + ' SEC', t.timeBonus, C.ink],
    ['FINISHED ' + PLACE[gm.place - 1] + ' OF 8' + (gm.rivalBeat ? ', BEAT ' + st.rival.name : ''), t.rivalBonus, gm.place <= 3 ? C.green : '#ffffff'],
    [gm.stageCrash === 0 ? 'CLEAN RUN, NO CRASHES' : gm.stageCrash + (gm.stageCrash === 1 ? ' CRASH' : ' CRASHES'), t.cleanBonus, gm.stageCrash === 0 ? C.green : C.dim],
    ['STAGE TIME  ' + t.stageT.toFixed(1) + ' SEC', null, C.dim]
  ];
  rows.forEach((r, i) => {
    if (t.t < 0.5 + i * 0.5) return;
    const y = 74 + i * 15;
    T(g, r[0], 94, y, r[2], { weight: 700 });
    if (r[1] !== null) T(g, '+' + Math.round(r[1] * gm.diff.score), W - 94, y, r[1] ? C.gold : C.dim, { align: 'right', weight: 700 });
  });
  if (t.t > 2.6) { rect(g, 94, 134, W - 188, 0.7, 'rgba(255,255,255,0.3)'); T(g, 'SCORE', 94, 140, C.ink, { weight: 700, scale: 1.3 }); T(g, String(Math.floor(gm.score)), W - 94, 140, C.gold, { align: 'right', weight: 700, scale: 1.3 }); }
  if (t.t > 3.4 && blink(2)) T(g, gm.stage + 1 < STAGES.length ? 'NEXT: ' + STAGES[gm.stage + 1].name + '   PRESS GAS' : 'PRESS GAS', W / 2, 170, '#ffffff', { align: 'center', weight: 700, scale: 1.1 });
  g.globalAlpha = 1;
}

function drawContinue(g) {
  const gm = game;
  dimAll(g, 0.66);
  bigTitle(g, 'OUT OF TIME', W / 2, 34, 2.8, { fill: C.red });
  T(g, 'CONTINUE?', W / 2, 72, '#ffffff', { align: 'center', scale: 1.6, weight: 700 });
  bigTitle(g, String(Math.max(0, Math.ceil(gm.contT))), W / 2, 86, 5.4, { fill: C.gold });
  T(g, 'CREDITS  ' + gm.credits, W / 2, 142, C.cyan, { align: 'center', weight: 700, scale: 1.1 });
  slab(g, W / 2 - 98, 158, 90, 17, '#2fc86a'); T(g, 'YES: GAS', W / 2 - 53, 162, '#04240f', { align: 'center', weight: 700, scale: 1.15, shadow: 'rgba(0,0,0,0)' }); hitArea(W / 2 - 104, 154, W / 2 - 4, 180, { go: true });
  slab(g, W / 2 + 8, 158, 90, 17, 'rgba(255,255,255,0.14)'); T(g, 'NO: BRAKE', W / 2 + 53, 162, '#ffffff', { align: 'center', weight: 700, scale: 1.15 }); hitArea(W / 2 + 4, 154, W / 2 + 104, 180, { no: true });
}

function statLines(g, y0) {
  const s = game.stats;
  const rows = [['TOP SPEED', kmh(s.top) + ' KM/H'], ['OVERTAKES', s.passes], ['NEAR MISSES', s.near + '   BEST CHAIN X' + s.bestChain], ['STAGE WINS', s.rivals + ' / ' + STAGES.length], ['COINS', s.coins], ['CRASHES', s.crashes + s.hits]];
  rows.forEach((r, i) => { const x = 96 + (i % 2) * 100, y = y0 + Math.floor(i / 2) * 17; T(g, r[0], x, y, C.dim, { scale: 0.78, weight: 700 }); T(g, String(r[1]), x, y + 6.6, '#ffffff', { weight: 700, scale: 1.05 }); });
}
function drawGameOver(g) {
  const gm = game;
  dimAll(g, 0.72);
  bigTitle(g, 'GAME OVER', W / 2, 26, 3.4, { fill: C.red });
  T(g, 'YOU REACHED STAGE ' + (gm.stage + 1) + ', ' + gm.T.st.name, W / 2, 62, '#ffffff', { align: 'center', weight: 700 });
  panel(g, 82, 76, W - 164, 86);
  T(g, 'SCORE', 96, 82, C.ink, { weight: 700, scale: 1.3 }); T(g, String(Math.floor(gm.score)), W - 96, 82, C.gold, { align: 'right', weight: 700, scale: 1.3 });
  statLines(g, 100);
  if (gm.stateT > 1.2 && blink(2)) T(g, 'PRESS A BUTTON', W / 2, 172, '#ffffff', { align: 'center', weight: 700 });
}

function gradeOf() {
  const s = game.stats, pts = s.rivals * 2 + (s.continues === 0 ? 3 : s.continues === 1 ? 1 : 0) + (s.crashes + s.hits < 10 ? 2 : s.crashes + s.hits < 25 ? 1 : 0) + (s.bestChain >= 8 ? 2 : s.bestChain >= 4 ? 1 : 0);
  return pts >= 15 ? 'S' : pts >= 11 ? 'A' : pts >= 7 ? 'B' : pts >= 4 ? 'C' : 'D';
}
function drawEnding(g) {
  const gm = game, t = gm.stateT;
  dimAll(g, Math.min(0.66, t * 0.5));
  bigTitle(g, 'COAST TO COAST', W / 2, 12, 3, { fill: C.gold });
  T(g, 'FIVE STAGES, FIVE RIVALS, ONE ROAD.', W / 2, 44, '#ffffff', { align: 'center', scale: 0.9, weight: 700 });
  panel(g, 60, 58, W - 120, 112);
  T(g, 'FINAL SCORE', 74, 64, C.ink, { weight: 700, scale: 1.3 }); T(g, String(Math.floor(gm.score)), 262, 64, C.gold, { align: 'right', weight: 700, scale: 1.3 });
  const gr = gradeOf();
  T(g, 'GRADE', 296, 62, C.dim, { align: 'center', scale: 0.8, weight: 700 });
  if (t > 1.2) bigTitle(g, gr, 296, 68, 5 + Math.max(0, 1.6 - t) * 6, { fill: gr === 'S' ? C.gold : gr === 'A' ? C.green : '#ffffff' });
  g.save(); g.translate(-22, 0); statLines(g, 84); g.restore();
  T(g, 'TOTAL TIME  ' + gm.stats.time.toFixed(1) + ' SEC      LEVEL  ' + gm.diff.name + '      CONTINUES  ' + gm.stats.continues, W / 2, 152, C.cyan, { align: 'center', weight: 700, scale: 0.9 });
  if (t > 2 && blink(2)) T(g, 'PRESS GAS', W / 2, 180, '#ffffff', { align: 'center', weight: 700, scale: 1.1 });
}

function drawEntry(g) {
  const e = game.entry;
  dimAll(g, 0.76);
  bigTitle(g, 'NEW HIGH SCORE', W / 2, 18, 2.8, { fill: C.gold });
  T(g, String(Math.floor(game.score)), W / 2, 50, '#ffffff', { align: 'center', scale: 1.8, weight: 700 });
  T(g, 'ENTER YOUR INITIALS', W / 2, 72, C.cyan, { align: 'center', weight: 700 });
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 54 + i * 54, on = e.i === i;
    panel(g, x - 20, 92, 40, 46, { border: on ? '#ffe08a' : 'rgba(120,110,150,0.6)', lw: on ? 1.2 : 0.6 });
    bigTitle(g, e.name[i] === ' ' ? '_' : e.name[i], x, 98, 4, { fill: on ? '#ffffff' : '#b0acc4' });
    poly(g, [x - 6, 88, x + 6, 88, x, 81], on ? C.gold : '#5a5670'); poly(g, [x - 6, 142, x + 6, 142, x, 149], on ? C.gold : '#5a5670');
    hitArea(x - 22, 74, x + 22, 114, { slot: i, dl: 1 }); hitArea(x - 22, 116, x + 22, 154, { slot: i, dl: -1 });
  }
  slab(g, W / 2 - 40, 162, 80, 17, '#2fc86a'); T(g, 'OK', W / 2, 165.6, '#04240f', { align: 'center', weight: 700, scale: 1.25, shadow: 'rgba(0,0,0,0)' }); hitArea(W / 2 - 48, 158, W / 2 + 48, 184, { ok: true });
  wrapText(input.usingTouch || isTall() ? 'TAP ABOVE OR BELOW A LETTER TO CHANGE IT' : 'UP/DOWN LETTER   LEFT/RIGHT MOVE   GAS OR ENTER TO CONFIRM', isTall() ? 200 : 380, 0.85).forEach((ln, i) => T(g, ln, W / 2, 198 + i * 8, '#b8b0c8', { align: 'center', scale: 0.85 }));
}
