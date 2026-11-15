/* ==========================================================================
   Screens: title, fighter select, how to play, options, scores, medals,
   stage cards, pause, results, game over, ending and name entry.
   ========================================================================== */

/** A slanted slab, the house shape for panels and buttons. */
function slab(g, x, y, w, h, fill, k) {
  const s = k === undefined ? h * 0.35 : k;
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w - s, y + h); g.lineTo(x - s, y + h); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}

/** A slanted slab, the house shape for panels and buttons. */
function slab(g, x, y, w, h, fill, k) {
  const s = k === undefined ? h * 0.35 : k;
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w - s, y + h); g.lineTo(x - s, y + h); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
function panel(g, x, y, w, h, o) {
  g.fillStyle = (o && o.fill) || 'rgba(10,6,22,0.84)'; roundRectPath(g, x, y, w, h, 4); g.fill();
  g.strokeStyle = (o && o.border) || 'rgba(255,74,58,0.75)'; g.lineWidth = (o && o.lw) || 0.7; g.stroke();
  rect(g, x + 6, y, 26, 1.4, C.gold);
}

/** A slanted slab, the house shape for panels and buttons. */
function slab(g, x, y, w, h, fill, k) {
  const s = k === undefined ? h * 0.35 : k;
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w - s, y + h); g.lineTo(x - s, y + h); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
function panel(g, x, y, w, h, o) {
  g.fillStyle = (o && o.fill) || 'rgba(10,6,22,0.84)'; roundRectPath(g, x, y, w, h, 4); g.fill();
  g.strokeStyle = (o && o.border) || 'rgba(255,74,58,0.75)'; g.lineWidth = (o && o.lw) || 0.7; g.stroke();
  rect(g, x + 6, y, 26, 1.4, C.gold);
}
function menuBar(g, x, y, w, h, on) {
  if (on) { slab(g, x, y, w, h, lgrad(g, x, 0, x + w, 0, [[0, '#ff3d5a'], [0.7, '#c81e4a'], [1, 'rgba(200,30,74,0.2)']])); rect(g, x - 2, y + h - 1, w * 0.4, 1, '#ffd27a'); }
  else slab(g, x, y, w, h, 'rgba(10,6,22,0.5)');
}

/** A slanted slab, the house shape for panels and buttons. */
function slab(g, x, y, w, h, fill, k) {
  const s = k === undefined ? h * 0.35 : k;
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w - s, y + h); g.lineTo(x - s, y + h); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
function panel(g, x, y, w, h, o) {
  g.fillStyle = (o && o.fill) || 'rgba(10,6,22,0.84)'; roundRectPath(g, x, y, w, h, 4); g.fill();
  g.strokeStyle = (o && o.border) || 'rgba(255,74,58,0.75)'; g.lineWidth = (o && o.lw) || 0.7; g.stroke();
  rect(g, x + 6, y, 26, 1.4, C.gold);
}
function menuBar(g, x, y, w, h, on) {
  if (on) { slab(g, x, y, w, h, lgrad(g, x, 0, x + w, 0, [[0, '#ff3d5a'], [0.7, '#c81e4a'], [1, 'rgba(200,30,74,0.2)']])); rect(g, x - 2, y + h - 1, w * 0.4, 1, '#ffd27a'); }
  else slab(g, x, y, w, h, 'rgba(10,6,22,0.5)');
}
function dimAll(g, a) { rect(g, -W * 2, -H * 6, W * 5, H * 13, 'rgba(6,4,14,' + a + ')'); }

/** A slanted slab, the house shape for panels and buttons. */
function slab(g, x, y, w, h, fill, k) {
  const s = k === undefined ? h * 0.35 : k;
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + w + s, y); g.lineTo(x + w - s, y + h); g.lineTo(x - s, y + h); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
function panel(g, x, y, w, h, o) {
  g.fillStyle = (o && o.fill) || 'rgba(10,6,22,0.84)'; roundRectPath(g, x, y, w, h, 4); g.fill();
  g.strokeStyle = (o && o.border) || 'rgba(255,74,58,0.75)'; g.lineWidth = (o && o.lw) || 0.7; g.stroke();
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


function statBar(g, x, y, label, v, on) {
  T(g, label, x, y, on ? C.ink : C.dim, { scale: 0.74, weight: 700 });
  for (let k = 0; k < 8; k++) slab(g, x + 30 + k * 7.4, y + 1.2, 5.6, 4.6, k < v ? (on ? (k > 5 ? C.red : C.gold) : '#8a7a5a') : 'rgba(255,255,255,0.1)', 1.2);
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
    else if (it === 'FRIENDLY FIRE') val = settings.friendly ? 'ON' : 'OFF';
    else if (it === 'TOUCH PAD') val = (settings.touch || 'auto').toUpperCase();
    if (val) T(g, '<  ' + val + '  >', 254, y - 0.5, sel ? C.gold : C.ink, { align: 'center', weight: 700, scale: 1.1 });
    if (it !== 'BACK') { hitArea(200, y - 5, 238, y + 11, { i, dir: -1 }); hitArea(270, y - 5, 320, y + 11, { i, dir: 1 }); hitArea(64, y - 5, 199, y + 11, { i, dir: 1 }); }
    else hitArea(64, y - 5, W - 64, y + 11, { i });
  });
  wrapText('FRIENDLY FIRE: IN TWO PLAYER GAMES YOUR HITS CAN LAND ON YOUR PARTNER.', isTall() ? 250 : 380, 0.8).forEach((ln, i) => T(g, ln, W / 2, 186 + i * 8, '#b8b0c8', { align: 'center', scale: 0.8 }));
  T(g, input.usingTouch ? 'TAP < > TO CHANGE' : 'LEFT / RIGHT TO CHANGE    X TO GO BACK', W / 2, isTall() ? 206 : 198, '#b8b0c8', { align: 'center', scale: 0.85 });
}


function drawScores(g) {
  dimAll(g, 0.78);
  bigTitle(g, 'LEGENDS OF THE ALLEY', W / 2, 16, 2);
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
    T(g, got ? 'I' : '?', x + 13, y + 6.2, got ? '#a85a00' : '#7a7690', { align: 'center', scale: 1.05, display: true, shadow: 'rgba(0,0,0,0)' });
    T(g, m.name, x + 25, y + 2.6, got ? C.gold : '#b0acc4', { weight: 700, scale: 1.02 }); T(g, m.how, x + 25, y + 12.4, got ? '#f0e8d8' : '#8a86a0', { scale: 0.76 });
  });
  T(g, tall ? 'TAP TO GO BACK' : 'PRESS A BUTTON TO GO BACK', W / 2, tall ? 254 : 202, '#d4d8e8', { align: 'center' });
}


function drawMedalToast(g) {
  const m = game.medalQ[0];
  if (!m || ['medals', 'title', 'boot'].includes(game.state) && false) return;
  const t = game.medalT, a = t < 0.25 ? t / 0.25 : t > 2.6 ? Math.max(0, 1 - (t - 2.6) / 0.4) : 1, y = (game.state === 'play' ? SV.y + 50 - view.dy : 3) + (1 - a) * -10;
  g.globalAlpha = a;
  panel(g, W / 2 - 78, y, 156, 22, { border: 'rgba(255,210,122,0.95)', fill: 'rgba(40,24,20,0.94)' });
  drawGlow(g, W / 2 - 64, y + 11, 13, '#ffd27a', 0.7); disc(g, W / 2 - 64, y + 11, 6.4, '#e89a10'); disc(g, W / 2 - 64, y + 11, 4.8, '#ffd24a');
  T(g, 'MEDAL EARNED', W / 2 - 52, y + 2.4, '#f0e8d8', { scale: 0.76, weight: 700 }); T(g, m.name, W / 2 - 52, y + 10, C.gold, { weight: 700, scale: 1.15 });
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
  wrapText('QUITTING ENDS THE RUN. YOUR SCORE IS NOT SAVED.', isTall() ? 200 : 380, 0.82).forEach((ln, i) => T(g, ln, W / 2, 166 + i * 8, '#b8b0c8', { align: 'center', scale: 0.82 }));
}


function drawEntry(g) {
  const e = game.entry;
  dimAll(g, 0.76);
  bigTitle(g, 'NEW HIGH SCORE', W / 2, 18, 2.8, { fill: C.gold });
  T(g, e.hero.name + '  ' + String(Math.floor(e.hero.score)), W / 2, 50, '#ffffff', { align: 'center', scale: 1.8, weight: 700 });
  T(g, 'ENTER YOUR INITIALS', W / 2, 72, C.cyan, { align: 'center', weight: 700 });
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 54 + i * 54, on = e.i === i;
    panel(g, x - 20, 92, 40, 46, { border: on ? '#ffe08a' : 'rgba(120,110,150,0.6)', lw: on ? 1.2 : 0.6 });
    bigTitle(g, e.name[i] === ' ' ? '_' : e.name[i], x, 98, 4, { fill: on ? '#ffffff' : '#b0acc4' });
    poly(g, [x - 6, 88, x + 6, 88, x, 81], on ? C.gold : '#5a5670'); poly(g, [x - 6, 142, x + 6, 142, x, 149], on ? C.gold : '#5a5670');
    hitArea(x - 22, 74, x + 22, 114, { slot: i, dl: 1 }); hitArea(x - 22, 116, x + 22, 154, { slot: i, dl: -1 });
  }
  slab(g, W / 2 - 40, 162, 80, 17, '#2fc86a'); T(g, 'OK', W / 2, 165.6, '#04240f', { align: 'center', weight: 700, scale: 1.25, shadow: 'rgba(0,0,0,0)' }); hitArea(W / 2 - 48, 158, W / 2 + 48, 184, { ok: true });
  wrapText(input.usingTouch || isTall() ? 'TAP ABOVE OR BELOW A LETTER TO CHANGE IT' : 'UP/DOWN LETTER   LEFT/RIGHT MOVE   PUNCH TO CONFIRM', isTall() ? 200 : 380, 0.85).forEach((ln, i) => T(g, ln, W / 2, 198 + i * 8, '#b8b0c8', { align: 'center', scale: 0.85 }));
}


function drawLogo(g, cx, y, s) {
  g.save(); g.translate(cx, y); g.scale(s, s);
  g.font = fontSpec(6.2, { display: true }); g.textAlign = 'center'; g.textBaseline = 'top';
  // a steel plate behind the name, bolted on
  const w = g.measureText('IRON').width + 30;
  g.fillStyle = lgrad(g, 0, -4, 0, 52, [[0, '#4a4e5a'], [0.5, '#2a2c34'], [1, '#18181e']]); roundRectPath(g, -w / 2, -4, w, 52, 3); g.fill();
  g.strokeStyle = '#7a808e'; g.lineWidth = 1; g.stroke();
  for (const bx of [-w / 2 + 6, w / 2 - 6]) for (const by of [2, 42]) disc(g, bx, by, 1.6, '#9aa0ae');
  g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#0c0a10'; g.strokeText('IRON', 0, 0);
  g.fillStyle = lgrad(g, 0, 2, 0, 44, [[0, '#ffffff'], [0.45, '#d8dce6'], [0.55, '#8a90a0'], [1, '#e0e4ec']]); g.fillText('IRON', 0, 0);
  g.font = fontSpec(3.4, { display: true }); g.lineWidth = 3.4; g.strokeText('ALLEY', 0, 46);
  g.fillStyle = lgrad(g, 0, 46, 0, 70, [[0, '#ffd24a'], [1, '#ff4a2a']]); g.fillText('ALLEY', 0, 46);
  g.restore(); g.textAlign = 'left';
}

function controlHint() {
  if (input.usingTouch || (isTouch && coarse && !input.usingPad)) return 'PAD MOVES   P PUNCH   K KICK   J JUMP   S SPECIAL';
  if (input.usingPad) return 'STICK MOVES   X PUNCH   Y KICK   A JUMP   SHOULDER SPECIAL';
  return 'P1: ARROWS  Z PUNCH  X KICK  C JUMP  V SPECIAL     P2: WASD  F G H T';
}

function drawBoot(g) {
  const vh = viewH();
  g.fillStyle = lgrad(g, 0, 0, 0, vh, [[0, '#0a0614'], [0.6, '#2a0e2a'], [1, '#6a1a1a']]); g.fillRect(0, 0, W, vh);
  g.save(); g.translate(0, view.dy);
  drawLogo(g, W / 2, 28, 1);
  if (blink(1.6)) T(g, isTouch && coarse ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', W / 2, 130, C.gold, { align: 'center', scale: 1.6, weight: 700 });
  T(g, 'SOUND ON FOR THE FULL EXPERIENCE', W / 2, 152, '#f0d8e8', { align: 'center' });
  g.restore();
}

function drawTitle(g) {
  dimAll(g, isTall() ? 0.55 : 0.4);
  drawLogo(g, W / 2, 6, 0.8);
  const y0 = 74;
  TITLE_ITEMS.forEach((it, i) => {
    const sel = game.menu === i, y = y0 + i * 14.5;
    menuBar(g, W / 2 - 58, y - 2.6, 116, 12.5, sel);
    T(g, it, W / 2 + (sel ? 2 : 0), y - 0.6, sel ? '#ffffff' : '#d4d8e8', { align: 'center', scale: 1.15, weight: 700 });
    hitArea(W / 2 - 90, y - 5, W / 2 + 90, y + 10, { i });
  });
  T(g, 'TOP ' + String(Math.floor(game.scores[0].s)).padStart(7, '0') + '  ' + game.scores[0].n + '     MEDALS ' + medalCount() + ' / ' + MEDALS.length, W / 2, 166, C.gold, { align: 'center', weight: 700 });
  wrapText(controlHint(), isTall() ? 200 : 380, 0.85).forEach((ln, i) => T(g, ln, W / 2, (isTall() ? 180 : 200) + i * 9, '#e8e0f0', { align: 'center', scale: 0.85 }));
}

function drawSelect(g) {
  dimAll(g, 0.76);
  const two = game.players > 1;
  bigTitle(g, two ? 'CHOOSE YOUR FIGHTERS' : 'CHOOSE YOUR FIGHTER', W / 2, 4, 1.7);
  HERO_ORDER.forEach((id, i) => {
    const H0 = HEROES[id], x0 = W / 2 - 122 + i * 126, y0 = 28, w = 118, hgt = 110;
    const p1 = settings.p1 === id, p2 = two && settings.p2 === id, on = p1 || p2;
    panel(g, x0, y0, w, hgt, { border: p1 ? '#ff4a3a' : p2 ? '#5af0ff' : 'rgba(120,110,150,0.5)', lw: on ? 1.2 : 0.6, fill: on ? 'rgba(30,12,30,0.92)' : 'rgba(10,6,22,0.8)' });
    if (on) { g.save(); g.translate(x0 + 34, y0 + 84); g.scale(1, 0.3); drawGlow(g, 0, 0, 40, p1 ? '#ff4a3a' : '#5af0ff', 0.6); g.restore(); }
    g.save(); g.translate(x0 + 34, y0 + 84); g.scale(0.9, 0.9);
    drawSprite(g, H0.kind, 'idle', game.t * 3.5, 1, 0, 0, null, on ? 1 : 0.55);
    g.restore();
    T(g, H0.name, x0 + 8, y0 + 4, '#ffffff', { scale: 1.5, display: true });
    if (p1) T(g, 'P1', x0 + w - 8, y0 + 5, C.red, { align: 'right', weight: 700, scale: 1.2 });
    if (p2) T(g, 'P2', x0 + w - (p1 ? 24 : 8), y0 + 5, C.cyan, { align: 'right', weight: 700, scale: 1.2 });
    ['POWER', 'SPEED', 'JUMP'].forEach((lb, k) => statBar(g, x0 + 58, y0 + 30 + k * 9, lb, H0.stats[k] + 2, on));
    wrapText(H0.blurb, 56, 0.74).forEach((ln, k) => T(g, ln, x0 + 86, y0 + 62 + k * 7.5, C.cyan, { align: 'center', scale: 0.74, weight: 700 }));
    hitArea(x0, y0, x0 + w, y0 + hgt / 2, { p: 'p1', hero: id });
    if (two) hitArea(x0, y0 + hgt / 2, x0 + w, y0 + hgt, { p: 'p2', hero: id });
  });
  const y = 146;
  T(g, 'LEVEL', W / 2 - 150, y, game.menu === 1 ? C.ink : C.dim, { weight: 700 });
  LEVELS.forEach((lv, i) => {
    const sel = settings.level === lv, x = W / 2 - 112 + i * 66;
    slab(g, x, y - 3.4, 60, 13, sel ? lgrad(g, x, 0, x + 60, 0, [[0, '#ff4a3a'], [1, '#a81a14']]) : 'rgba(255,255,255,0.08)');
    if (sel && game.menu === 1 && blink(3)) { g.strokeStyle = C.gold; g.lineWidth = 0.8; g.stroke(); }
    T(g, DIFFS[lv].name, x + 30, y - 0.6, sel ? C.ink : C.dim, { align: 'center', weight: 700, scale: 1.05 });
    hitArea(x - 4, y - 6, x + 64, y + 12, { level: lv });
  });
  T(g, (DIFFS[settings.level] || DIFFS.normal).blurb, W / 2, y + 13, '#c8c0d8', { align: 'center', scale: 0.85 });
  const by = 172;
  slab(g, W / 2 - 50, by, 100, 17, lgrad(g, 0, by, 0, by + 17, [[0, blink(3) ? '#ffb03a' : '#ff8a1a'], [1, '#a84a08']]));
  T(g, 'FIGHT!', W / 2, by + 3, C.ink, { align: 'center', weight: 700, scale: 1.4 });
  hitArea(W / 2 - 56, by - 3, W / 2 + 56, by + 20, { go: true });
  T(g, '< BACK', 8, 204, '#d4d8e8'); hitArea(2, 198, 60, 216, { back: true });
  if (!input.usingTouch && !isTall()) T(g, two ? 'P1 ARROWS  P2 A/D TO CHOOSE   PUNCH TO START' : 'LEFT/RIGHT CHOOSE   UP/DOWN ROW   PUNCH TO START', W - 6, 204, '#b8b0c8', { align: 'right', scale: 0.8 });
}

function drawHowTo(g) {
  dimAll(g, 0.8);
  const pg = game.page, tall = isTall(), px = tall ? 70 : 30, rh = tall ? 30 : 24, py = tall ? 30 : 40;
  bigTitle(g, ['THE BASICS', 'FIGHT DIRTY', 'THE STREETS'][pg], W / 2, tall ? 6 : 12, tall ? 1.6 : 2);
  panel(g, px, py, W - px * 2, tall ? 160 : 138);
  const row = (i, head, body, col) => {
    const y = py + 10 + i * rh; slab(g, px + 14, y, 4, tall ? 22 : 15, col || C.red, 1.4); T(g, head, px + 26, y - 1, col || C.gold, { weight: 700, scale: 1.15 });
    wrapText(body, W - px * 2 - 36, 0.86).forEach((ln, k) => T(g, ln, px + 26, y + 9.4 + k * 8.4, '#e0dcec', { scale: 0.86 }));
  };
  if (pg === 0) {
    row(0, 'MOVE', 'ARROWS (P1) OR WASD (P2). UP AND DOWN WALK INTO THE STREET. TAP TWICE TO RUN.');
    row(1, 'PUNCH', 'Z (P1) OR F (P2). PRESS AGAIN FOR A FOUR HIT COMBO ENDING IN AN UPPERCUT.', C.red);
    row(2, 'KICK', 'X (P1) OR G (P2). AFTER TWO PUNCHES A KICK BECOMES A ROUNDHOUSE.', C.gold);
    row(3, 'JUMP', 'C OR SPACE (P1), H (P2). KICK IN THE AIR FOR A FLYING KICK.', C.cyan);
    row(4, 'SPECIAL', 'V (P1) OR T (P2). A SPINNING KICK THAT CLEARS SPACE. USES A METER BAR, OR HEALTH IF EMPTY.', C.green);
  } else if (pg === 1) {
    row(0, 'GRAB', 'WALK INTO A REELING ENEMY. PUNCH FOR KNEES, KICK TO THROW THEM INTO THEIR FRIENDS.', C.gold);
    row(1, 'BEHIND YOU', 'PUNCH WHILE PRESSING AWAY FROM WHERE YOU FACE FOR A BACK ELBOW.', C.red);
    row(2, 'RUNNING ATTACK', 'RUN, THEN PUNCH OR KICK TO CHARGE SHOULDER FIRST THROUGH A CROWD.', C.cyan);
    row(3, 'WEAPONS', 'PUNCH ON A BAT, PIPE OR KNIFE TO TAKE IT. SPECIAL THROWS IT.', '#ffffff');
    row(4, 'CRATES AND DRUMS', 'BREAK THEM OPEN FOR FOOD, CASH AND WEAPONS.', C.green);
  } else {
    row(0, 'FOUR DISTRICTS', 'NEON MARKET, FREIGHT YARD, STEEL FOUNDRY, VIPER TOWER.', C.gold);
    row(1, 'THE BOSSES', 'TANK, RATCHET, FORGE AND THE WARDEN. EACH FIGHTS DIFFERENTLY.', C.red);
    row(2, 'TWO PLAYERS', 'PLAYER TWO CAN JOIN AT ANY TIME: PRESS Q, OR START ON A SECOND PAD.', C.cyan);
    row(3, 'LIVES AND CONTINUES', 'THREE LIVES EACH. WHEN THEY RUN OUT, PRESS PUNCH TO CONTINUE.', '#ffffff');
    row(4, 'SCORE', 'COMBOS, THROWS AND KNOCKOUTS SCORE. LEFTOVER HEALTH IS A BONUS.', C.green);
  }
  const fy = tall ? 196 : 184, bx = tall ? px : 8;
  for (let i = 0; i < HOWTO_PAGES; i++) slab(g, W / 2 - 20 + i * 14, fy, 9, 3.4, i === pg ? C.gold : 'rgba(255,255,255,0.25)', 1);
  T(g, '< BACK', bx, fy + (tall ? -4 : 20), '#d4d8e8'); hitArea(bx - 6, fy + (tall ? -10 : 14), bx + 52, fy + (tall ? 12 : 32), { back: true });
  T(g, pg < HOWTO_PAGES - 1 ? 'NEXT >' : 'DONE >', W - bx, fy + (tall ? -4 : 20), C.gold, { align: 'right', weight: 700 }); hitArea(W - bx - 62, fy + (tall ? -10 : 12), W - bx + 6, fy + (tall ? 12 : 32), { next: true });
}

function drawIntro(g) {
  const gm = game, S = gm.stageDef, t = gm.stateT, a = Math.min(1, t / 0.3), out = t > 2.6 ? (t - 2.6) / 0.4 : 0;
  dimAll(g, 0.5 * (1 - out));
  g.globalAlpha = a * (1 - out);
  const sl = (1 - Math.min(1, t / 0.35)) * 120;
  slab(g, -20 - sl, 60, W + 40, 66, 'rgba(10,6,22,0.88)', 14); slab(g, -20 - sl, 60, W + 40, 2, C.red, 0.5); slab(g, -32 - sl, 124, W + 40, 2, C.gold, 0.5);
  T(g, 'DISTRICT ' + (gm.stage + 1) + ' OF ' + STAGES.length, W / 2 + sl, 65, C.gold, { align: 'center', weight: 700, scale: 1.1 });
  bigTitle(g, S.name, W / 2 - sl, 75, 3.2);
  T(g, S.sub, W / 2 + sl, 106, C.cyan, { align: 'center', weight: 700, scale: 1.05 });
  wrapText(S.intro, isTall() ? 220 : 360, 0.95).forEach((ln, i) => T(g, ln, W / 2, 134 + i * 10, '#ffffff', { align: 'center', weight: 700, scale: 0.95 }));
  g.globalAlpha = 1;
}

function drawClear(g) {
  const gm = game, a = Math.min(1, gm.stateT / 0.4);
  g.globalAlpha = a;
  bigTitle(g, 'DISTRICT CLEAR', W / 2, 40, 2.8, { fill: C.gold });
  panel(g, 92, 76, W - 184, 74);
  let y = 84;
  for (const h of gm.heroes) {
    if (!h.active) continue;
    T(g, h.name, 104, y, h.slot ? C.cyan : C.red, { weight: 700, scale: 1.2 });
    T(g, 'HEALTH BONUS +' + Math.round(h.hp * 50 * gm.diff.score), 104, y + 11, '#ffffff', { weight: 700 });
    T(g, String(Math.floor(h.score)), W - 104, y + 2, C.gold, { align: 'right', weight: 700, scale: 1.3 });
    y += 30;
  }
  if (gm.stateT > 1.5 && blink(2)) T(g, gm.stage + 1 < STAGES.length ? 'NEXT: ' + STAGES[gm.stage + 1].name + '   PRESS PUNCH' : 'PRESS PUNCH', W / 2, 160, '#ffffff', { align: 'center', weight: 700, scale: 1.1 });
  g.globalAlpha = 1;
}

function drawGameOver(g) {
  const gm = game;
  dimAll(g, 0.72);
  bigTitle(g, 'GAME OVER', W / 2, 30, 3.4, { fill: C.red });
  T(g, 'YOU REACHED ' + gm.stageDef.name, W / 2, 68, '#ffffff', { align: 'center', weight: 700 });
  panel(g, 92, 82, W - 184, 70);
  let y = 90;
  for (const h of gm.heroes) { if (h.score <= 0 && !h.active) continue; T(g, h.name, 104, y, h.slot ? C.cyan : C.red, { weight: 700, scale: 1.2 }); T(g, String(Math.floor(h.score)), W - 104, y, C.gold, { align: 'right', weight: 700, scale: 1.2 }); y += 16; }
  T(g, 'BEST COMBO ' + gm.stats.bestCombo + '    THROWS ' + gm.stats.throws + '    KNOCKOUTS ' + gm.stats.kos, W / 2, 138, C.dim, { align: 'center', weight: 700, scale: 0.85 });
  if (gm.stateT > 1.5 && blink(2)) T(g, 'PRESS PUNCH', W / 2, 166, '#ffffff', { align: 'center', weight: 700 });
}

function drawEnding(g) {
  const gm = game, t = gm.stateT;
  dimAll(g, Math.min(0.7, t * 0.5));
  bigTitle(g, 'THE CITY IS YOURS', W / 2, 16, 2.6, { fill: C.gold });
  const lines = ['THE WARDEN IS DOWN AND THE VIPERS ARE SCATTERED.', 'THE MARKET LIGHTS COME BACK ON, ONE STALL AT A TIME.', 'IRON ALLEY BELONGS TO ITS PEOPLE AGAIN.'];
  lines.forEach((ln, i) => { if (t > 0.8 + i * 1.2) wrapText(ln, isTall() ? 230 : 380, 0.95).forEach((l2, k) => T(g, l2, W / 2, 52 + i * 14 + k * 9, '#ffffff', { align: 'center', weight: 700, scale: 0.95 })); });
  if (t > 4) {
    panel(g, 92, 104, W - 184, 56);
    let y = 112;
    for (const h of gm.heroes) { if (!h.active && h.score <= 0) continue; T(g, h.name, 104, y, h.slot ? C.cyan : C.red, { weight: 700, scale: 1.2 }); T(g, String(Math.floor(h.score)), W - 104, y, C.gold, { align: 'right', weight: 700, scale: 1.2 }); y += 16; }
    T(g, 'LEVEL ' + gm.diff.name + '    CONTINUES ' + gm.stats.continues + '    BEST COMBO ' + gm.stats.bestCombo, W / 2, 146, C.cyan, { align: 'center', weight: 700, scale: 0.85 });
  }
  if (t > 4 && blink(2)) T(g, 'PRESS PUNCH', W / 2, 176, '#ffffff', { align: 'center', weight: 700, scale: 1.1 });
}
