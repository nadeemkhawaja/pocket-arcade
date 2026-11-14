/* ==========================================================================
   Screens: title, mission setup, medals, options, briefings, tallies, ending
   ========================================================================== */

function drawTitleBackdrop(g, dim) {
  const st = game.st, L = stageArt(st);
  const cam = (game.t * 14) % (st.len - W - 240) + 100;
  drawBackdrop(g, L, st, cam, 1);
  drawLevel(g, L, st, cam);
  drawLights(g, L, cam);
  drawGrade(g, st);
  g.fillStyle = lgrad(g, 0, 0, 0, H, [[0, 'rgba(6,8,18,' + (dim || 0.8) + ')'], [0.5, 'rgba(6,8,18,' + (dim || 0.8) * 0.66 + ')'], [1, 'rgba(6,8,18,' + Math.min(0.96, (dim || 0.8) * 1.12) + ')']]);
  g.fillRect(0, 0, W, H);
}

function drawLogo(g, y) {
  // a blade under the name, drawn in one stroke every few seconds
  const sw = Math.min(1, (game.t % 6) / 0.35), x0 = W / 2 - 134, x1 = x0 + 268 * sw;
  bigTitle(g, 'DAGGER RAID', W / 2, y, 4.5, { stroke: '#7a1014' });
  g.fillStyle = lgrad(g, 0, y + 40, 0, y + 43.4, [[0, '#ffffff'], [0.5, '#c9d6e6'], [1, '#6a7c96']]);
  g.beginPath(); g.moveTo(x0, y + 40); g.lineTo(x1 - 8, y + 40); g.lineTo(x1, y + 41.8); g.lineTo(x1 - 8, y + 43.4); g.lineTo(x0, y + 43.4); g.closePath(); g.fill();
  rrect(g, x0 - 17, y + 39.4, 14, 4.6, 1.4, '#3a2416'); rect(g, x0 - 16, y + 40, 12, 1, '#7a5230');
  rrect(g, x0 - 3.6, y + 37.4, 3.4, 8.6, 1, '#c9a463');
  if (sw < 1) drawGlint(g, x1, y + 41.8, 5, '#ffffff');
}

function controlHint() {
  if (input.usingTouch || (isTouch && !input.usingPad)) return 'PAD MOVE   A JUMP   B KNIFE   C SPECIAL   D DASH';
  if (input.usingPad) return 'STICK MOVE   A JUMP   X KNIFE   B SPECIAL   RB DASH';
  return 'ARROWS MOVE   Z KNIFE   X JUMP   C SPECIAL   V DASH';
}

function drawBoot(g) {
  drawTitleBackdrop(g);
  drawLogo(g, 50);
  T(g, 'ONE KNIFE. ONE MISSION.', W / 2, 106, C.cyan, { align: 'center', weight: 700 });
  if (blink(1.6)) T(g, isTouch && coarse ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', W / 2, 138, C.gold, { align: 'center', scale: 1.7, weight: 700 });
  T(g, 'SOUND ON FOR THE FULL EXPERIENCE', W / 2, 178, C.dim, { align: 'center' });
}

function drawTitle(g) {
  drawTitleBackdrop(g);
  drawLogo(g, 20);
  T(g, 'ONE KNIFE. ONE MISSION.', W / 2, 73, C.cyan, { align: 'center', weight: 700 });
  const y0 = 91;
  TITLE_ITEMS.forEach((it, i) => {
    const sel = game.menu === i, y = y0 + i * 16;
    menuBar(g, W / 2 - 84, y - 3.4, 168, 14.4, sel);
    T(g, it, W / 2, y, sel ? C.ink : C.dim, { align: 'center', scale: 1.1, weight: sel ? 700 : 600 });
    hitArea(W / 2 - 90, y - 4, W / 2 + 90, y + 11, { i });
  });
  T(g, 'MEDALS ' + medalCount() + ' / ' + MEDALS.length, 8, 196, C.gold, { scale: 0.86, weight: 700 });
  T(g, 'TOP ' + pad7(game.scores[0].s) + '  ' + game.scores[0].n, W - 8, 196, C.gold, { align: 'right', scale: 0.86, weight: 700 });
  T(g, controlHint(), W / 2, 206, '#6a7a94', { align: 'center', scale: 0.8 });
}

function drawSetup(g) {
  drawTitleBackdrop(g, 0.86);
  bigTitle(g, 'MISSION SETUP', W / 2, 10, 2.2);
  // the operative on the left
  panel(g, 14, 36, 96, 136);
  const of = HERO_OUTFITS[settings.outfit] || HERO_OUTFITS.commando, open = outfitOpen(settings.outfit);
  const keep = CHARS.hero.pal; CHARS.hero.pal = of.pal;
  g.save(); g.translate(62, 150); g.scale(2.7, 2.7);
  ellipse(g, 0, 0.4, 11, 2, 0, 'rgba(0,0,0,0.5)');
  if (open) drawSprite(g, 'hero', 'idle', game.t * 1.7, 1, 0, 0);
  else { g.globalAlpha = 0.9; renderFighter(g, 'hero', poseAt('hero', 'idle', 0), 0, 0, 1, 'idle', 0, '#0a0e18'); g.globalAlpha = 1; }
  g.restore();
  CHARS.hero.pal = keep;
  T(g, of.name, 62, 42, open ? C.gold : C.dim, { align: 'center', weight: 700 });
  T(g, open ? of.note : 'LOCKED', 62, 158, open ? C.dim : C.red, { align: 'center', scale: 0.72, weight: 700 });
  if (!open) T(g, of.note, 62, 165, C.dim, { align: 'center', scale: 0.6 });
  // the rows
  panel(g, 118, 36, 252, 136);
  const D = DIFFS[settings.level] || DIFFS.soldier;
  const nStage = Math.min(PROG.reached, STAGES.length - 1) + 1, si = clamp(settings.stage | 0, 0, nStage - 1);
  const vals = [D.name, (si + 1) + '  ' + STAGES[si].name, of.name + (open ? '' : '  (LOCKED)'), settings.invincible ? 'ON' : 'OFF'];
  const tips = [D.blurb, nStage > 1 ? 'START FROM ANY STAGE YOU HAVE REACHED.' : 'REACH A STAGE TO START FROM IT NEXT TIME.', open ? 'A CHANGE OF COLOURS. SAME KNIFE.' : 'THIS OUTFIT IS STILL LOCKED: COMMANDO WILL DEPLOY.',
    settings.invincible ? 'NOTHING CAN HURT YOU. SCORES AND MEDALS ARE OFF.' : 'TURN ON TO PLAY THROUGH WITHOUT TAKING DAMAGE.', 'BEGIN THE MISSION.'];
  SETUP_ITEMS.forEach((it, i) => {
    const sel = game.menu === i, y = 46 + i * 20;
    if (it === 'DEPLOY') {
      const by = y + 6;
      g.fillStyle = sel ? lgrad(g, 0, by, 0, by + 18, [[0, '#ff6a4a'], [0.5, '#c8281e'], [1, '#7a1210']]) : 'rgba(40,48,70,0.9)';
      roundRectPath(g, 176, by, 136, 18, 3); g.fill();
      g.strokeStyle = sel ? '#ffd27a' : '#4a5a7a'; g.lineWidth = 0.7; g.stroke();
      T(g, 'DEPLOY', 244, by + 3.4, sel ? '#ffffff' : C.dim, { align: 'center', scale: 1.4, display: true });
      hitArea(170, by - 2, 318, by + 20, { i });
      return;
    }
    menuBar(g, 122, y - 3.4, 244, 14.4, sel);
    T(g, it, 132, y, sel ? C.ink : C.dim, { weight: 700 });
    const col = it === 'INVINCIBLE' && settings.invincible ? C.cyan : sel ? C.gold : C.ink;
    T(g, '<', 216, y, sel ? C.gold : '#4a5a7a', { weight: 700 }); T(g, '>', 356, y, sel ? C.gold : '#4a5a7a', { weight: 700 });
    T(g, vals[i], 288, y + 0.4, col, { align: 'center', scale: 0.94, weight: 700 });
    hitArea(206, y - 5, 240, y + 12, { i, dir: -1 }); hitArea(334, y - 5, 368, y + 12, { i, dir: 1 }); hitArea(122, y - 5, 205, y + 12, { i, dir: 1 }); hitArea(241, y - 5, 333, y + 12, { i, dir: 1 });
  });
  T(g, tips[game.menu], W / 2, 180, C.cyan, { align: 'center', scale: 0.86 });
  T(g, '< BACK', 16, 198, C.dim, { weight: 700 }); hitArea(6, 192, 70, 212, { back: true });
  T(g, input.usingTouch ? 'TAP A ROW TO CHANGE IT' : 'UP / DOWN CHOOSE   LEFT / RIGHT CHANGE   KNIFE CONFIRM', W - 14, 199, '#6a7a94', { align: 'right', scale: 0.78 });
}

function drawScores(g) {
  drawTitleBackdrop(g);
  bigTitle(g, 'TOP COMMANDOS', W / 2, 18, 2.2);
  panel(g, 54, 46, W - 108, 128);
  T(g, 'RANK', 72, 54, C.dim, { scale: 0.86 }); T(g, 'SCORE', 132, 54, C.dim, { scale: 0.86 }); T(g, 'NAME', 214, 54, C.dim, { scale: 0.86 }); T(g, 'STAGE', 276, 54, C.dim, { scale: 0.86 });
  const ranks = ['1ST', '2ND', '3RD', '4TH', '5TH'];
  const cols = ['#ffd27a', '#e8edf2', '#e0a070', C.cyan, C.cyan];
  game.scores.forEach((e, i) => {
    const y = 72 + i * 19;
    const hl = game.entry && game.entry.done && game.entry.rank === i && blink(4);
    const c = hl ? '#ffffff' : cols[i];
    if (i === 0) drawMedalIcon(g, 62, y + 4, 0.7, true);
    T(g, ranks[i], 72, y, c, { weight: 700, scale: 1.1 }); T(g, pad7(e.s), 132, y, c, { weight: 700, scale: 1.1 }); T(g, e.n, 214, y, c, { weight: 700, scale: 1.1 }); T(g, String(e.st === 4 ? 'ALL' : e.st), 276, y, c, { weight: 700, scale: 1.1 });
  });
  if (!game.attract && blink(1.4)) T(g, input.usingTouch ? 'TAP TO RETURN' : 'PRESS KNIFE TO RETURN', W / 2, 186, C.ink, { align: 'center', weight: 700 });
  if (game.attract) T(g, 'INSERT COURAGE. PRESS START.', W / 2, 186, blink(1.4) ? C.gold : C.dim, { align: 'center', weight: 700 });
}

function drawHowTo(g) {
  drawTitleBackdrop(g, 0.86);
  const p = game.page || 0;
  T(g, 'HOW TO PLAY  ' + (p + 1) + ' / ' + HOWTO_PAGES, W / 2, 12, C.gold, { align: 'center', weight: 700, scale: 1.1 });
  panel(g, 14, 28, W - 28, 158);
  const L = (s, x, y, c, o) => T(g, s, x, y, c || C.ink, o);
  const icon = (k, x, y) => { g.save(); g.translate(x, y); g.scale(0.8, 0.8); PICK_DRAW[k](g); g.restore(); };
  if (p === 0) {
    L('CONTROLS', 24, 35, C.cyan, { weight: 700 });
    L('KEYBOARD', 108, 50, C.gold); L('GAMEPAD', 222, 50, C.gold); L('TOUCH', 310, 50, C.gold);
    const rows = [
      ['MOVE', 'ARROWS / WASD', 'STICK', 'PAD'], ['KNIFE', 'Z  J  F', 'X', 'B'], ['JUMP', 'X  K  SPACE', 'A', 'A'],
      ['SPECIAL', 'C  L', 'B  Y', 'C'], ['DASH', 'V  Q  SHIFT', 'LB  RB', 'D'], ['PAUSE', 'P  ESC', 'START', 'II']
    ];
    rows.forEach((r, i) => { const y = 63 + i * 11.4; L(r[0], 24, y, C.dim); L(r[1], 108, y); L(r[2], 222, y); L(r[3], 310, y); });
    L('UP OR DOWN AT A LADDER CLIMBS IT. DOWN CROUCHES.', 24, 138);
    L('DOWN + JUMP DROPS THROUGH A WALKWAY.', 24, 150);
    L('TAP JUMP FOR A HOP, HOLD IT FOR A FULL LEAP.', 24, 162);
  } else if (p === 1) {
    L('BLADE WORK', 24, 35, C.cyan, { weight: 700 });
    L('TAP KNIFE THREE TIMES: STAB, SLASH, THRUST.', 24, 51);
    L('THE THRUST HITS TWICE AS HARD. HOLD FORWARD TO LUNGE.', 24, 63);
    L('CROUCH + KNIFE HITS LOW: DOGS AND KNEELING GUNNERS.', 24, 75);
    L('CUT A BULLET OR SHURIKEN OUT OF THE AIR: PARRY!', 24, 87);
    L('STRIKE FROM BEHIND FOR A BACKSTAB: A SURE CRITICAL.', 24, 103, C.gold);
    L('ANY HIT MAY LAND AS A CRITICAL FOR DOUBLE DAMAGE.', 24, 115, C.gold);
    icon('katana', 32, 137); L('KATANA', 46, 132, C.ink, { weight: 700 }); L('LONGER, STRONGER, AND IT REFLECTS SHOTS. 30 SWINGS.', 96, 132, C.dim);
    L('STAB CRATES FOR LOOT. BARRELS BLOW UP!', 24, 152);
    L('FREE CAPTIVES FROM CAGES FOR BONUSES AND GEAR.', 24, 164);
  } else if (p === 2) {
    L('NINJA ARTS', 24, 35, C.cyan, { weight: 700 });
    L('DASH', 24, 51, C.gold, { weight: 700 }); L('ROLL THROUGH BULLETS, BLADES AND ENEMIES UNHARMED.', 86, 51);
    L('COUNTER', 24, 63, C.gold, { weight: 700 }); L('DODGE AN ATTACK, THEN STRIKE: A SURE CRITICAL.', 86, 63);
    L('DOUBLE JUMP', 24, 75, C.gold, { weight: 700 }); L('JUMP AGAIN IN MID AIR TO SOMERSAULT HIGHER.', 86, 75);
    L('AIR DASH', 24, 87, C.gold, { weight: 700 }); L('DASH IN MID AIR TO CROSS A GAP OR DODGE.', 86, 87);
    L('DIVE STAB', 24, 99, C.gold, { weight: 700 }); L('DOWN + KNIFE IN THE AIR. YOU BOUNCE OFF THE TARGET.', 86, 99);
    L('WALL KICK', 24, 111, C.gold, { weight: 700 }); L('JUMP WHILE PRESSED AGAINST THE EDGE OF THE FIELD.', 86, 111);
    L('DOUBLE TAP LEFT OR RIGHT ALSO DASHES.', 24, 129, C.dim);
    L('ENEMY NINJAS VANISH IN SMOKE AND STRIKE FROM BEHIND.', 24, 145);
    L('WATCH FOR THE RED GLINT, THEN DASH OR CUT FIRST.', 24, 157);
  } else {
    L('WEAPONS AND SURVIVAL', 24, 35, C.cyan, { weight: 700 });
    const rows = [['tri', 'TRI-KNIFE', 'A FAN OF THREE BLADES'], ['star', 'SHURIKEN', 'FAST, THROWN ON THE MOVE, PIERCES'], ['gren', 'GRENADE', 'ARCING BLAST'], ['rocket', 'ROCKET', 'HEAVY HITTER FOR BOSSES'], ['flame', 'FLAMETHROWER', 'HOLD SPECIAL TO SPRAY']];
    rows.forEach((r, i) => { const y = 50 + i * 13; icon(r[0], 32, y + 4.6); L(r[1], 46, y, C.ink, { weight: 700 }); L(r[2], 132, y, C.dim); });
    L('A WHITE GLINT WARNS OF A BLADE, A RED ONE OF A SHOT.', 24, 119);
    L('A RED LASER MEANS A SNIPER. RED MARKS SHOW WHERE SHELLS LAND.', 24, 131, null, { scale: 0.92 });
    L('MINES BLINK IN THE SAND. JUMP OR ROLL OVER THEM.', 24, 143);
    L('RATIONS HEAL. EXTRA LIFE AT 30000, THEN EVERY 70000.', 24, 155, C.gold);
    L('FOUR STAGES. FOUR BOSSES. GOOD LUCK.', 24, 169, C.green, { weight: 700 });
  }
  T(g, '< BACK', 22, 196, C.dim, { weight: 700 }); hitArea(10, 190, 80, 212, { back: true });
  T(g, p < HOWTO_PAGES - 1 ? 'NEXT >' : 'DONE >', W - 22, 196, blink(1.5) ? C.gold : C.ink, { align: 'right', weight: 700 }); hitArea(W - 90, 190, W - 6, 212, { next: true });
}

function drawMedals(g) {
  drawTitleBackdrop(g, 0.88);
  bigTitle(g, 'MEDALS', W / 2, 8, 2);
  T(g, medalCount() + ' / ' + MEDALS.length, W - 20, 14, C.gold, { align: 'right', weight: 700 });
  panel(g, 10, 30, W - 20, 150);
  MEDALS.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 18 + col * 180, y = 35 + row * 17.6, got = !!PROG.ach[m.id];
    if (got) drawGlow(g, x + 6, y + 6.6, 9, '#ffd27a', 0.5);
    drawMedalIcon(g, x + 6, y + 6.6, 0.82, got);
    T(g, m.name, x + 16, y, got ? C.gold : '#7a869c', { scale: 0.9, weight: 700 });
    T(g, m.desc, x + 16, y + 7.6, got ? C.steel : '#56627a', { scale: 0.68 });
  });
  const un = ['STAGE SELECT: ' + (Math.min(PROG.reached, STAGES.length - 1) + 1) + ' / ' + STAGES.length, 'RAVEN OUTFIT: ' + (outfitOpen('raven') ? 'OPEN' : 'REACH STAGE 3'), 'CRIMSON OUTFIT: ' + (outfitOpen('crimson') ? 'OPEN' : 'FINISH THE MISSION')];
  un.forEach((s, i) => T(g, s, 20 + i * 122, 185, C.cyan, { scale: 0.74, weight: 700 }));
  if (blink(1.4)) T(g, input.usingTouch ? 'TAP TO RETURN' : 'PRESS KNIFE TO RETURN', W / 2, 199, C.ink, { align: 'center', weight: 700 });
}

function drawOptions(g) {
  if (game.optFrom === 'pause') { drawWorld(g); drawHUD(g); rect(g, 0, -H, W, H * 3, 'rgba(4,6,14,0.72)'); }
  else drawTitleBackdrop(g, 0.86);
  bigTitle(g, 'OPTIONS', W / 2, 18, 2.2);
  panel(g, 52, 48, W - 104, 132);
  OPTION_ITEMS.forEach((it, i) => {
    const y = 58 + i * 20, sel = game.menu === i;
    menuBar(g, 56, y - 3.4, W - 112, 14.4, sel);
    T(g, it, 76, y, sel ? C.ink : C.dim, { weight: 700 });
    let val = '';
    if (it === 'MUSIC' || it === 'EFFECTS') {
      const v = Math.round((it === 'MUSIC' ? settings.music : settings.sfx) * 10);
      for (let k = 0; k < 10; k++) rrect(g, 214 + k * 8, y + 0.6, 6, 7, 1, k < v ? (sel ? C.gold : '#c9a463') : '#2a3048');
    } else if (it === 'GLOW FX') val = settings.fx ? 'ON' : 'OFF';
    else if (it === 'SCREEN SHAKE') val = settings.shake ? 'ON' : 'OFF';
    else if (it === 'TOUCH PAD') val = (settings.touch || 'auto').toUpperCase();
    if (val) T(g, '<  ' + val + '  >', 254, y, sel ? C.gold : C.ink, { align: 'center', weight: 700 });
    if (it !== 'BACK') { hitArea(200, y - 5, 238, y + 12, { i, dir: -1 }); hitArea(270, y - 5, 314, y + 12, { i, dir: 1 }); hitArea(56, y - 5, 199, y + 12, { i, dir: 1 }); }
    else hitArea(56, y - 5, W - 56, y + 12, { i });
  });
  T(g, input.usingTouch ? 'TAP < > TO CHANGE' : 'LEFT / RIGHT TO CHANGE   SPECIAL TO GO BACK', W / 2, 190, '#6a7a94', { align: 'center', scale: 0.86 });
}

function drawIntro(g) {
  drawWorld(g);
  rect(g, 0, -H, W, H * 3, 'rgba(4,6,14,0.74)');
  const t = game.stateT, st = game.st;
  const slide = Math.min(1, t / 0.35), e = 1 - (1 - slide) * (1 - slide);
  rect(g, 0, 44, W * e, 0.6, C.red); rect(g, W - W * e, 96, W * e, 0.6, C.red);
  T(g, 'STAGE ' + (game.stageIdx + 1), W / 2 - (1 - e) * 200, 50, C.red, { align: 'center', scale: 1.5, weight: 700 });
  if (t > 0.3) { const k = Math.min(1, (t - 0.3) / 0.35); g.globalAlpha = k; bigTitle(g, st.name, W / 2 + (1 - k) * 60, 66, 2.6); g.globalAlpha = 1; }
  if (t > 0.8) { T(g, st.brief[0], W / 2, 106, C.cyan, { align: 'center' }); T(g, st.brief[1], W / 2, 117, C.cyan, { align: 'center' }); }
  if (t > 1.4) T(g, 'TARGET: ' + BOSS_NAMES[st.boss], W / 2, 136, C.gold, { align: 'center', weight: 700 });
  if (t > 1.4) T(g, game.diff.name + (game.invincible ? '   INVINCIBLE' : ''), W / 2, 148, game.invincible ? C.cyan : C.dim, { align: 'center', scale: 0.86, weight: 700 });
  if (t > 1.8 && blink(3)) T(g, 'GET READY', W / 2, 164, C.ink, { align: 'center', scale: 1.7, weight: 700 });
  T(g, controlHint(), W / 2, 198, '#6a7a94', { align: 'center', scale: 0.8 });
}

function drawClear(g) {
  drawWorld(g);
  const t = game.stateT;
  if (t < 3.6) {
    if (t > 0.2) {
      const k = Math.min(1, (t - 0.2) / 0.25);
      g.fillStyle = 'rgba(6,8,18,0.62)'; g.fillRect(0, 66, W, 36);
      rect(g, 0, 66, W, 0.6, C.gold); rect(g, 0, 101.4, W, 0.6, C.gold);
      bigTitle(g, 'STAGE CLEAR', W / 2, 72 + (1 - k) * 8, 3 * (0.8 + 0.2 * k), { fill: blink(6) ? '#ffd27a' : '#ffffff' });
    }
    return;
  }
  rect(g, 0, -H, W, H * 3, 'rgba(4,6,14,' + Math.min(0.82, (t - 3.6) * 2) + ')');
  bigTitle(g, 'STAGE ' + (game.stageIdx + 1) + ' CLEAR', W / 2, 26, 2.2, { fill: '#ffd27a' });
  T(g, game.st.name, W / 2, 48, C.cyan, { align: 'center', weight: 700 });
  panel(g, 50, 62, W - 100, 100);
  game.tally.forEach((row, i) => {
    if (i > game.tallyIdx) return;
    const y = 70 + i * 16;
    T(g, row.label, 62, y, C.dim, { weight: 700 });
    T(g, row.val, 232, y, C.ink, { align: 'right', weight: 700 });
    if (row.pts) T(g, '+' + row.pts, W - 62, y, C.green, { align: 'right', weight: 700 });
    else if (row.note) T(g, row.note, W - 62, y, C.gold, { align: 'right', weight: 700 });
  });
  T(g, 'SCORE ' + pad7(game.score), W / 2, 148, C.ink, { align: 'center', weight: 700, scale: 1.1 });
  if (game.tallyDone && blink(2)) T(g, game.stageIdx + 1 < STAGES.length ? 'NEXT: ' + STAGES[game.stageIdx + 1].name : 'FINAL REPORT', W / 2, 176, C.gold, { align: 'center', weight: 700 });
}

function drawContinue(g) {
  drawWorld(g);
  rect(g, 0, -H, W, H * 3, 'rgba(4,6,14,0.74)');
  bigTitle(g, 'CONTINUE?', W / 2, 46, 2.6);
  const n = Math.max(0, Math.ceil(game.contT) - 1);
  bigTitle(g, String(n), W / 2, 78, 6, { fill: n <= 3 ? '#ff5a4a' : '#ffd27a', stroke: '#2a0808' });
  if (blink(2)) T(g, input.usingTouch ? 'TAP KNIFE TO CONTINUE' : 'PRESS KNIFE OR START', W / 2, 144, C.ink, { align: 'center', weight: 700 });
  T(g, 'YOUR SCORE STAYS. CONTINUES: ' + game.continues, W / 2, 160, C.dim, { align: 'center' });
  hitArea(0, 0, W, H, { cont: true });
}

function drawGameOver(g) {
  drawWorld(g);
  rect(g, 0, -H, W, H * 3, 'rgba(4,6,14,' + Math.min(0.82, game.stateT) + ')');
  bigTitle(g, 'GAME OVER', W / 2, 78, 4, { fill: '#ff5a4a', stroke: '#2a0808' });
  T(g, 'SCORE ' + pad7(game.score), W / 2, 124, C.ink, { align: 'center', weight: 700 });
}

function drawPause(g) {
  drawWorld(g); drawHUD(g);
  rect(g, 0, -H, W, H * 3, 'rgba(4,6,14,0.66)');
  bigTitle(g, 'PAUSED', W / 2, 40, 2.6);
  panel(g, W / 2 - 86, 70, 172, 82);
  PAUSE_ITEMS.forEach((it, i) => {
    const y = 80 + i * 17, sel = game.menu === i;
    menuBar(g, W / 2 - 82, y - 3.4, 164, 14.4, sel);
    T(g, it, W / 2, y, sel ? C.ink : C.dim, { align: 'center', weight: 700, scale: 1.05 });
    hitArea(W / 2 - 86, y - 5, W / 2 + 86, y + 12, { i });
  });
  T(g, 'STAGE ' + (game.stageIdx + 1) + '  ' + game.st.name + '   ' + game.diff.name, W / 2, 162, C.cyan, { align: 'center', weight: 700, scale: 0.9 });
  T(g, 'RESTART STAGE RETURNS YOUR SCORE TO WHERE THE STAGE BEGAN.', W / 2, 174, C.dim, { align: 'center', scale: 0.72 });
  T(g, controlHint(), W / 2, 198, '#6a7a94', { align: 'center', scale: 0.8 });
}

function drawEntry(g) {
  drawTitleBackdrop(g, 0.86);
  const E = game.entry;
  if (E.done) { drawScores(g); return; }
  bigTitle(g, 'NEW HIGH SCORE!', W / 2, 16, 2.2, { fill: blink(4) ? '#ffd27a' : '#ffffff' });
  T(g, ['1ST', '2ND', '3RD', '4TH', '5TH'][E.rank] + ' PLACE   ' + pad7(game.score), W / 2, 44, C.ink, { align: 'center', weight: 700 });
  T(g, 'ENTER YOUR INITIALS', W / 2, 60, C.cyan, { align: 'center', weight: 700 });
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 45 + i * 34, y = 96, sel = E.pos === i;
    panel(g, x - 2, y - 4, 26, 30, sel ? { border: '#ffd27a', top: 'rgba(120,26,24,0.9)', bot: 'rgba(50,10,12,0.9)' } : {});
    T(g, ENTRY_CHARS[E.chars[i]] === ' ' ? '_' : ENTRY_CHARS[E.chars[i]], x + 11, y - 0.5, sel && blink(4) ? C.gold : C.ink, { align: 'center', scale: 3, weight: 700 });
    tri(g, x + 11, y - 13, 9, 6, sel ? C.gold : '#4a5a7a');
    g.save(); g.translate(x + 11, y + 35); g.scale(1, -1); tri(g, 0, -3, 9, 6, sel ? C.gold : '#4a5a7a'); g.restore();
    hitArea(x - 4, y - 20, x + 26, y - 4, { up: i });
    hitArea(x - 4, y + 26, x + 26, y + 42, { down: i });
    hitArea(x - 2, y - 4, x + 24, y + 26, { slot: i });
  }
  panel(g, W / 2 + 68, 96, 38, 22, { border: '#4ad16a' });
  T(g, 'OK', W / 2 + 87, 100, C.green, { scale: 1.6, weight: 700, align: 'center' }); hitArea(W / 2 + 66, 94, W / 2 + 108, 120, { ok: true });
  T(g, 'TIME ' + Math.max(0, Math.ceil(E.t)), W / 2, 152, C.dim, { align: 'center' });
  T(g, input.usingTouch ? 'TAP ARROWS, THEN OK' : 'TYPE, OR UP/DOWN THEN KNIFE', W / 2, 168, '#6a7a94', { align: 'center' });
}

function drawEnding(g) {
  // dawn over the mountains
  skyFill(g, [[0, '#1a2050'], [0.45, '#7a4a8a'], [0.75, '#f08a5a'], [1, '#ffd27a']]);
  const sunY = 152 - Math.min(42, game.stateT * 3);
  drawGlow(g, 290, sunY, 70, '#ffd9a0', 0.9); disc(g, 290, sunY, 17, '#fff2c8');
  ridgeV(g, W, 160, [[2, 26], [5, 10]], true, 77, '#4a3460', '#3a2a4a', H);
  ridgeV(g, W, 180, [[3, 16], [7, 5]], true, 78, '#30223e', '#2a1e36', H);
  g.fillStyle = lgrad(g, 0, 188, 0, H, [[0, '#2a1c36'], [1, '#150e1e']]); g.fillRect(0, 188, W, H - 188);
  rect(g, 0, 188, W, 0.6, 'rgba(255,200,140,0.5)');
  for (const x of [96, 130, 146, 162]) ellipse(g, x, 188.6, 9, 1.6, 0, 'rgba(0,0,0,0.4)');
  drawSprite(g, 'hero', 'victory', 0, 1, 96, 188);
  for (let i = 0; i < 3; i++) drawSprite(g, 'captive', i === 1 ? 'salute' : 'run', i === 1 ? 0 : 2, -1, 130 + i * 16, 188);
  const y0 = H + 10 - game.endScroll;
  const vis = (y) => y > 8 && y < 150;
  ENDING_LINES.forEach(([str, c], i) => { const y = y0 + i * 12; if (vis(y)) T(g, str, W / 2, y, c, { align: 'center', weight: 700 }); });
  const yS = Math.max(70, y0 + ENDING_LINES.length * 12 + 18);
  if (vis(yS)) T(g, 'FINAL SCORE ' + pad7(game.score), W / 2, yS, C.gold, { align: 'center', weight: 700, scale: 1.2 });
  if (yS <= 70 && blink(2)) T(g, input.usingTouch ? 'TAP TO CONTINUE' : 'PRESS KNIFE', W / 2, 92, C.ink, { align: 'center', weight: 700 });
}
