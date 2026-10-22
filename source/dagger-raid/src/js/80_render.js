/* ==========================================================================
   Rendering: world, HUD, screens and the final CRT blit
   ========================================================================== */

const buf = makeCanvas(W, H);
const bg = buf.getContext('2d');
bg.imageSmoothingEnabled = false;
const view = { scale: 2, ox: 0, oy: 0, cw: 0, ch: 0, gx: 0, gy: 0, gw: 0, gh: 0 };

const C = {
  ink: '#ffffff', dim: '#9aa6b8', red: '#e8392a', gold: '#ffd27a', cyan: '#9fe8ff', green: '#4ad16a', shadow: '#000000', panel: 'rgba(8,10,20,0.86)'
};

function hitArea(x0, y0, x1, y1, data) { game.hits.push(Object.assign({ x0, y0, x1, y1 }, data)); }

function panel(g, x, y, w, h, border) {
  g.fillStyle = C.panel; g.fillRect(x, y, w, h);
  rect(g, x, y, w, 1, border || '#3a4a6a'); rect(g, x, y + h - 1, w, 1, border || '#3a4a6a');
  rect(g, x, y, 1, h, border || '#3a4a6a'); rect(g, x + w - 1, y, 1, h, border || '#3a4a6a');
}

function T(g, s, x, y, col, o) { return drawText(g, s, x, y, col || C.ink, Object.assign({ shadow: C.shadow }, o || {})); }
function blink(rate) { return Math.floor(game.t * (rate || 2)) % 2 === 0; }
function pad7(n) { return String(Math.max(0, Math.floor(n))).padStart(7, '0'); }

/* ---- world ---------------------------------------------------------------------- */
function drawWorld(g) {
  const L = game.L, st = game.st;
  const cx = Math.round(game.camX);
  let sx = 0, sy = 0;
  if (game.shake > 0.3 && game.state !== 'pause') { sx = Math.round(rand(-1, 1) * game.shake); sy = Math.round(rand(-1, 1) * game.shake * 0.6); }
  g.save();
  g.translate(sx, sy);
  g.drawImage(L.sky, 0, 0);
  if (game.bolt && st.weather === 'rain') {
    game.bolt.t += 1 / 60;
    if (game.bolt.t < 0.22) drawBolt(g, game.bolt.x);
  }
  const lay = [['far', 0.12], ['mid', 0.35], ['near', 0.6]];
  for (const [k, p] of lay) {
    const ox = Math.floor(cx * p) % LAYER_W;
    g.drawImage(L[k], -ox, 0); g.drawImage(L[k], LAYER_W - ox, 0);
    if (k === 'mid') drawMidAnim(g, ox, st);
  }
  g.drawImage(L.level, cx, 0, W, H, 0, 0, W, H);
  if (st.id === 'citadel') drawSearchlights(g, cx);
  for (const p of game.props) drawProp(g, p, cx);
  for (const c of game.caps) drawCaptive(g, c, cx);
  const b = game.boss;
  if (b && (b.kind === 'ironclad')) b.draw(g, cx);
  for (const e of game.foes) if (e.st === 'dead') drawFoe(g, e, cx);
  for (const e of game.foes) if (e.st !== 'dead') drawFoe(g, e, cx);
  if (b && b.kind !== 'ironclad') b.draw(g, cx);
  for (const it of game.items) drawItem(g, it, cx);
  if (game.hero) drawHero(g, game.hero, cx);
  for (const s of game.shots) drawShot(g, s, cx);
  drawFx(g, cx);
  const art = ART[st.id];
  for (const f of L.front) {
    const fx = f.x - cx * 1.3;
    if (fx > -70 && fx < W + 70) drawFrontPiece(g, f, fx, art.frontCol, game.t);
  }
  drawWeather(g);
  drawPops(g, cx);
  g.restore();
  if (game.flashT > 0) { g.globalAlpha = Math.min(0.75, game.flashT * 5); rect(g, 0, 0, W, H, '#ffffff'); g.globalAlpha = 1; }
}

function drawBolt(g, x) {
  let px = x, py = HUD_H;
  g.fillStyle = '#e8f0ff';
  while (py < 120) { const nx = px + rand(-8, 8), ny = py + rand(6, 12); stampLine(g, px, py, nx, ny, 1, '#e8f0ff'); px = nx; py = ny; }
}

function drawMidAnim(g, ox, st) {
  const art = ART[st.id];
  if (art.flares) {
    for (const [fx0, fy] of art.flares) {
      for (const base of [fx0 - ox, fx0 - ox + LAYER_W]) {
        if (base < -20 || base > W + 20) continue;
        const h = 6 + Math.floor(Math.random() * 6);
        g.fillStyle = '#ff9a30'; g.fillRect(base + 1, fy - h, 4, h);
        g.fillStyle = '#ffe27a'; g.fillRect(base + 2, fy - h + 3, 2, h - 3);
        g.globalAlpha = 0.18; disc(g, base + 3, fy - 4, 9, '#ffb060'); g.globalAlpha = 1;
      }
    }
  }
}

function drawSearchlights(g, cx) {
  const off = cx * 0.35;
  g.globalAlpha = 0.09;
  for (let i = 0; i < 3; i++) {
    const bx = ((i * 260 + 90 - off) % 780 + 780) % 780 - 100;
    const a = Math.sin(game.t * 0.5 + i * 2) * 0.5 - Math.PI / 2;
    const ex = bx + Math.cos(a) * 260, ey = 140 + Math.sin(a) * 260;
    g.fillStyle = '#e8f0ff';
    g.beginPath(); g.moveTo(bx, 140); g.lineTo(ex - 22, ey); g.lineTo(ex + 22, ey); g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
}

function drawWeather(g) {
  const kind = game.st.weather;
  for (const p of game.wx) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (kind === 'snow') rect(g, x, y, p.s > 0.6 ? 2 : 1, p.s > 0.6 ? 2 : 1, '#ffffff');
    else if (kind === 'rain') { g.globalAlpha = 0.5; stampLine(g, x, y, x - 2, y + 7, 1, '#9ab0d8'); g.globalAlpha = 1; }
    else if (kind === 'dust') { g.globalAlpha = 0.6; rect(g, x, y, 1, 1, '#ffd8a0'); g.globalAlpha = 1; }
    else { g.globalAlpha = 0.5 + 0.5 * Math.sin(game.t * 3 + p.ph); rect(g, x, y, 1, 1, '#fff6b0'); g.globalAlpha = 1; }
  }
}

/* ---- HUD --------------------------------------------------------------------------- */
function drawHUD(g) {
  rect(g, 0, 0, W, HUD_H, '#07070c');
  rect(g, 0, HUD_H - 1, W, 1, '#2a3048');
  T(g, '1P', 4, 2, C.red);
  T(g, pad7(game.score), 18, 2, C.ink);
  T(g, 'HI', 128, 2, C.red);
  T(g, pad7(game.hi), 142, 2, C.gold);
  const li = lifeIcon();
  const n = game.lives;
  if (n <= 4) for (let i = 0; i < n; i++) g.drawImage(li.cv, 4 + i * 9, 10);
  else { g.drawImage(li.cv, 4, 10); T(g, 'X' + n, 14, 10, C.ink); }
  T(g, 'STAGE ' + (game.stageIdx + 1), 128, 10, C.cyan);
  const h = game.hero;
  // weapon box
  rect(g, W - 52, 2, 49, 14, '#141826'); rect(g, W - 52, 2, 49, 1, '#2a3048');
  if (h && h.wpn) {
    g.drawImage(pickupIcon(h.wpn).cv, W - 50, 3);
    T(g, 'X' + h.ammo, W - 34, 5, h.ammo <= 1 && blink(4) ? C.red : C.ink);
  } else {
    stampLine(g, W - 48, 12, W - 41, 5, 1, '#c9d6e6'); rect(g, W - 49, 12, 2, 2, '#6a4a2a');
    T(g, 'KNIFE', W - 37, 5, C.dim);
  }
  if (settings.mode === 'modern' && h) {
    for (let i = 0; i < MAX_HP; i++) drawHeart(g, W - 88 + i * 11, 5, i < h.hp);
  }
  if (game.chainN >= 2 && game.time - game.chainT < 1.6) {
    T(g, 'CHAIN X' + game.chainN, 220, 10, Math.floor(game.t * 8) % 2 ? C.gold : '#ff9a30');
  }
  const b = game.boss;
  if (b && game.bossSeq && game.bossSeq.st !== 'warn' && !(b.dead && b.deathT > 1.2) && game.state !== 'clear') {
    const bw = 150, bx = Math.round(W / 2 - bw / 2), by = HUD_H + 4;
    T(g, b.name, bx, by, C.gold);
    rect(g, bx, by + 9, bw, 5, '#000000');
    rect(g, bx + 1, by + 10, Math.round((bw - 2) * (b.hp / b.max)), 3, b.hp / b.max < 0.3 ? '#ff4a3a' : '#e8392a');
    rect(g, bx + 1, by + 10, Math.round((bw - 2) * (b.hp / b.max)), 1, '#ff9a8a');
  }
}

function drawHeart(g, x, y, full) {
  const c = full ? '#ff4a5a' : '#3a2a34', o = OUTLINE;
  const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  rows.forEach((r, yy) => { for (let xx = 0; xx < 7; xx++) if (r[xx] === '#') rect(g, x + xx, y + yy, 1, 1, c); });
  if (full) rect(g, x + 1, y + 1, 1, 1, '#ffb0b8');
  void o;
}

/* ---- banners --------------------------------------------------------------------- */
function drawBanners(g) {
  const S = game.bossSeq;
  if (game.state === 'play' && S && S.st === 'warn' && S.t > 0.2) {
    if (Math.floor(S.t * 4) % 2 === 0) {
      rect(g, 0, 78, W, 34, 'rgba(120,0,0,0.55)');
      rect(g, 0, 78, W, 2, '#ff4a3a'); rect(g, 0, 110, W, 2, '#ff4a3a');
      T(g, 'WARNING', W / 2, 84, '#ffffff', { align: 'center', scale: 2 });
      T(g, BOSS_NAMES[game.st.boss] + ' APPROACHING', W / 2, 100, C.gold, { align: 'center' });
    }
  }
  if (game.state === 'play' && game.time < 2.2 && !game.demo && game.camX < 5) {
    if (blink(4)) T(g, 'GO!', W / 2, 70, C.gold, { align: 'center', scale: 3 });
  }
  if (game.state === 'play' && game.readyT > 0 && !game.demo) {
    if (blink(5)) T(g, 'READY', W / 2, 80, C.ink, { align: 'center', scale: 2 });
  }
  if (game.demo) {
    if (blink(1.5)) T(g, 'DEMO PLAY', W / 2, 40, C.gold, { align: 'center', scale: 2 });
    T(g, input.usingTouch ? 'TAP TO PLAY' : 'PRESS ANY KEY', W / 2, 60, C.ink, { align: 'center' });
  }
}

/* ---- screens -------------------------------------------------------------------------- */
function drawTitleBackdrop(g) {
  const L = stageArt(STAGES[0]);
  const cam = (game.t * 14) % (LAYER_W * 10);
  g.drawImage(L.sky, 0, 0);
  for (const [k, p] of [['far', 0.25], ['mid', 0.6], ['near', 1]]) {
    const ox = Math.floor(cam * p) % LAYER_W;
    g.drawImage(L[k], -ox, 0); g.drawImage(L[k], LAYER_W - ox, 0);
  }
  const lx = Math.floor(cam * 1.4) % (STAGES[0].len - W - 200);
  g.drawImage(L.level, lx + 100, 0, W, H, 0, 0, W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(6,8,18,0.82)'); gr.addColorStop(0.55, 'rgba(6,8,18,0.55)'); gr.addColorStop(1, 'rgba(6,8,18,0.9)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}

function drawLogo(g, y) {
  drawLogoText(g, 'DAGGER RAID', W / 2, y, 4, { top: '#ffffff', mid: '#d7e2ef', low: '#8fa4bf', hi: '#ffffff', edge: '#3a4a66', depth: '#8a1418' });
  // blade slash under the logo
  const sw = Math.min(1, (game.t % 6) / 0.4);
  const x0 = W / 2 - 132, x1 = x0 + 264 * sw;
  rect(g, x0, y + 34, x1 - x0, 2, '#e8edf2'); rect(g, x0, y + 36, x1 - x0, 1, '#8fa4bf');
  if (sw < 1) { rect(g, x1 - 2, y + 31, 3, 8, '#ffffff'); }
  rect(g, x0 - 14, y + 33, 12, 4, '#5a3a22'); rect(g, x0 - 3, y + 31, 3, 8, '#c9a463');
}

function controlHint() {
  if (input.usingTouch || (isTouch && !input.usingPad)) return 'PAD MOVE   A JUMP   B KNIFE   C SPECIAL';
  if (input.usingPad) return 'STICK MOVE   A JUMP   X KNIFE   B SPECIAL';
  return 'ARROWS MOVE   Z KNIFE   X JUMP   C SPECIAL';
}

function drawBoot(g) {
  drawTitleBackdrop(g);
  drawLogo(g, 56);
  T(g, 'ONE KNIFE. ONE MISSION.', W / 2, 104, C.cyan, { align: 'center' });
  if (blink(1.6)) T(g, isTouch && coarse ? 'TAP TO START' : 'CLICK OR PRESS ANY KEY', W / 2, 140, C.gold, { align: 'center', scale: 2 });
  T(g, 'SOUND ON FOR THE FULL EXPERIENCE', W / 2, 176, C.dim, { align: 'center' });
}

function drawTitle(g) {
  drawTitleBackdrop(g);
  drawLogo(g, 26);
  T(g, 'ONE KNIFE. ONE MISSION.', W / 2, 72, C.cyan, { align: 'center' });
  const y0 = 92;
  TITLE_ITEMS.forEach((it, i) => {
    let label = it;
    if (it === 'MODE') label = 'MODE  ' + (settings.mode === 'arcade' ? '< ARCADE >' : '< MODERN >');
    const sel = game.menu === i;
    const y = y0 + i * 15;
    const wpx = textWidth(label, 1);
    if (sel) { rect(g, W / 2 - wpx / 2 - 14, y - 3, wpx + 28, 13, 'rgba(232,57,42,0.28)'); T(g, '>', W / 2 - wpx / 2 - 11, y, C.gold); }
    T(g, label, W / 2, y, sel ? C.ink : C.dim, { align: 'center' });
    hitArea(W / 2 - 90, y - 4, W / 2 + 90, y + 10, { i, dir: it === 'MODE' && sel ? 1 : 0 });
  });
  const modeTip = settings.mode === 'arcade' ? 'ONE HIT AND YOU ARE DOWN. CLASSIC RULES.' : 'THREE HITS PER LIFE. RATIONS HEAL.';
  T(g, modeTip, W / 2, y0 + 5 * 15 + 2, C.dim, { align: 'center' });
  T(g, 'TOP ' + pad7(game.scores[0].s) + '  ' + game.scores[0].n, W / 2, 194, C.gold, { align: 'center' });
  T(g, controlHint(), W / 2, 205, '#6a7a94', { align: 'center' });
}

function drawScores(g) {
  drawTitleBackdrop(g);
  T(g, 'TOP COMMANDOS', W / 2, 26, C.gold, { align: 'center', scale: 2 });
  T(g, 'RANK     SCORE     NAME   STAGE', W / 2, 54, C.dim, { align: 'center' });
  const ranks = ['1ST', '2ND', '3RD', '4TH', '5TH'];
  const cols = ['#ffd27a', '#e8edf2', '#e0a070', C.cyan, C.cyan];
  game.scores.forEach((e, i) => {
    const y = 72 + i * 18;
    const hl = game.entry && game.entry.done && game.entry.rank === i && blink(4);
    const c = hl ? '#ffffff' : cols[i];
    T(g, ranks[i], 70, y, c); T(g, pad7(e.s), 118, y, c); T(g, e.n, 196, y, c); T(g, String(e.st === 4 ? 'ALL' : e.st), 268, y, c);
  });
  if (!game.attract && blink(1.4)) T(g, input.usingTouch ? 'TAP TO RETURN' : 'PRESS KNIFE TO RETURN', W / 2, 186, C.ink, { align: 'center' });
  if (game.attract) T(g, 'INSERT COURAGE. PRESS START.', W / 2, 186, blink(1.4) ? C.gold : C.dim, { align: 'center' });
}

function drawHowTo(g) {
  drawTitleBackdrop(g);
  const p = game.page || 0;
  T(g, 'HOW TO PLAY  ' + (p + 1) + '/' + HOWTO_PAGES, W / 2, 16, C.gold, { align: 'center' });
  panel(g, 14, 30, W - 28, 154);
  const L = (s, x, y, c) => T(g, s, x, y, c || C.ink);
  if (p === 0) {
    L('CONTROLS', 24, 38, C.cyan);
    L('KEYBOARD', 112, 54, C.gold); L('GAMEPAD', 222, 54, C.gold); L('TOUCH', 306, 54, C.gold);
    const rows = [
      ['MOVE', 'ARROWS/WASD', 'STICK', 'PAD'],
      ['KNIFE', 'Z  J  F', 'X  RB', 'B'],
      ['JUMP', 'X  K  SPACE', 'A', 'A'],
      ['SPECIAL', 'C  L  SHIFT', 'B  Y  LB', 'C'],
      ['PAUSE', 'P  ESC', 'START', 'II']
    ];
    rows.forEach((r, i) => {
      const y = 68 + i * 12;
      L(r[0], 24, y, C.dim); L(r[1], 112, y); L(r[2], 222, y); L(r[3], 306, y);
    });
    L('UP OR DOWN AT A LADDER CLIMBS IT.', 24, 136);
    L('DOWN CROUCHES. DOWN + JUMP DROPS', 24, 150);
    L('THROUGH A WALKWAY TO THE LEVEL BELOW.', 24, 162);
  } else if (p === 1) {
    L('COMBAT', 24, 38, C.cyan);
    L('STAB ENEMIES BEFORE THEY REACH YOU.', 24, 54);
    L('CROUCH + KNIFE HITS LOW: DOGS, KNEELERS.', 24, 66);
    L('SLASH A BULLET OUT OF THE AIR: PARRY!', 24, 78);
    L('OFFICERS WITH A GLINT DROP WEAPONS:', 24, 94, C.gold);
    g.drawImage(pickupIcon('tri').cv, 26, 105); L('TRI-KNIFE', 44, 108, C.ink); L('A FAN OF THREE BLADES', 116, 108, C.dim);
    g.drawImage(pickupIcon('gren').cv, 26, 121); L('GRENADE', 44, 124, C.ink); L('ARCING BLAST', 116, 124, C.dim);
    g.drawImage(pickupIcon('rocket').cv, 26, 137); L('ROCKET', 44, 140, C.ink); L('HEAVY HITTER FOR BOSSES', 116, 140, C.dim);
    L('STAB CRATES FOR LOOT. BARRELS BLOW UP!', 24, 162);
  } else {
    L('SURVIVAL', 24, 38, C.cyan);
    L('HIGH SHOTS: CROUCH.  LOW SHOTS: JUMP.', 24, 54);
    L('A RED LASER MEANS A SNIPER: MOVE!', 24, 66);
    L('RED MARKS SHOW WHERE SHELLS LAND.', 24, 78);
    L('MINES BLINK IN THE SAND. JUMP THEM.', 24, 90);
    L('FREE CAPTIVES FROM CAGES FOR BONUSES.', 24, 106, C.gold);
    L('QUICK KILLS BUILD A CHAIN MULTIPLIER.', 24, 118, C.gold);
    L('EXTRA LIFE AT 30000, THEN EVERY 70000.', 24, 130, C.gold);
    L('ARCADE: ONE HIT KILLS. MODERN: 3 HP.', 24, 146);
    L('FOUR STAGES. FOUR BOSSES. GOOD LUCK.', 24, 162, C.green);
  }
  T(g, '< BACK', 22, 196, C.dim); hitArea(10, 190, 80, 210, { back: true });
  T(g, p < HOWTO_PAGES - 1 ? 'NEXT >' : 'DONE >', W - 22, 196, blink(1.5) ? C.gold : C.ink, { align: 'right' }); hitArea(W - 90, 190, W - 6, 210, { next: true });
}

function drawOptions(g) {
  if (game.optFrom === 'pause') { drawWorld(g); drawHUD(g); rect(g, 0, 0, W, H, 'rgba(0,0,0,0.6)'); }
  else drawTitleBackdrop(g);
  T(g, 'OPTIONS', W / 2, 26, C.gold, { align: 'center', scale: 2 });
  OPTION_ITEMS.forEach((it, i) => {
    const y = 60 + i * 20, sel = game.menu === i;
    if (sel) rect(g, 60, y - 4, W - 120, 15, 'rgba(232,57,42,0.28)');
    T(g, it, 76, y, sel ? C.ink : C.dim);
    let val = '';
    if (it === 'MUSIC' || it === 'EFFECTS') {
      const v = Math.round((it === 'MUSIC' ? settings.music : settings.sfx) * 10);
      for (let k = 0; k < 10; k++) rect(g, 214 + k * 8, y, 6, 7, k < v ? (sel ? C.gold : '#c9a463') : '#2a3048');
    } else if (it === 'CRT FILTER') val = settings.crt ? 'ON' : 'OFF';
    else if (it === 'SCREEN SHAKE') val = settings.shake ? 'ON' : 'OFF';
    else if (it === 'TOUCH PAD') val = (settings.touch || 'auto').toUpperCase();
    if (val) T(g, '< ' + val + ' >', 254, y, sel ? C.gold : C.ink, { align: 'center' });
    if (it !== 'BACK') { hitArea(200, y - 5, 238, y + 11, { i, dir: -1 }); hitArea(270, y - 5, 310, y + 11, { i, dir: 1 }); hitArea(60, y - 5, 199, y + 11, { i, dir: 1 }); }
    else hitArea(60, y - 5, W - 60, y + 11, { i });
  });
  T(g, input.usingTouch ? 'TAP < > TO CHANGE' : 'LEFT / RIGHT TO CHANGE   SPECIAL TO GO BACK', W / 2, 190, '#6a7a94', { align: 'center' });
}

function drawIntro(g) {
  drawWorld(g);
  rect(g, 0, 0, W, H, 'rgba(4,6,14,0.72)');
  const t = game.stateT;
  const st = game.st;
  const slide = Math.min(1, t / 0.35);
  T(g, 'STAGE ' + (game.stageIdx + 1), W / 2 - (1 - slide) * 200, 50, C.red, { align: 'center', scale: 2 });
  if (t > 0.3) T(g, st.name, W / 2 + (1 - Math.min(1, (t - 0.3) / 0.35)) * 200, 72, C.ink, { align: 'center', scale: 2 });
  if (t > 0.8) { T(g, st.brief[0], W / 2, 102, C.cyan, { align: 'center' }); T(g, st.brief[1], W / 2, 114, C.cyan, { align: 'center' }); }
  if (t > 1.4) T(g, 'BOSS: ' + BOSS_NAMES[st.boss], W / 2, 136, C.gold, { align: 'center' });
  if (t > 1.8 && blink(3)) T(g, 'GET READY', W / 2, 158, C.ink, { align: 'center', scale: 2 });
  T(g, controlHint(), W / 2, 196, '#6a7a94', { align: 'center' });
}

function drawClear(g) {
  drawWorld(g);
  const t = game.stateT;
  if (t < 3.6) {
    if (t > 0.2) {
      rect(g, 0, 70, W, 28, 'rgba(6,8,18,0.6)');
      T(g, 'STAGE CLEAR', W / 2, 76, blink(6) ? C.gold : '#ffffff', { align: 'center', scale: 2 });
    }
    return;
  }
  rect(g, 0, 0, W, H, 'rgba(4,6,14,' + Math.min(0.8, (t - 3.6) * 2) + ')');
  T(g, 'STAGE ' + (game.stageIdx + 1) + ' CLEAR', W / 2, 36, C.gold, { align: 'center', scale: 2 });
  T(g, game.st.name, W / 2, 56, C.cyan, { align: 'center' });
  game.tally.forEach((row, i) => {
    if (i > game.tallyIdx) return;
    const y = 80 + i * 18;
    T(g, row.label, 60, y, C.dim);
    T(g, row.val, 230, y, C.ink, { align: 'right' });
    if (row.pts) T(g, '+' + row.pts, W - 60, y, C.green, { align: 'right' });
    else if (row.note) T(g, row.note, W - 60, y, C.gold, { align: 'right' });
  });
  T(g, 'SCORE ' + pad7(game.score), W / 2, 162, C.ink, { align: 'center' });
  if (game.tallyDone && blink(2)) T(g, game.stageIdx + 1 < STAGES.length ? 'NEXT: ' + STAGES[game.stageIdx + 1].name : 'FINAL REPORT', W / 2, 184, C.gold, { align: 'center' });
}

function drawContinue(g) {
  drawWorld(g);
  rect(g, 0, 0, W, H, 'rgba(4,6,14,0.7)');
  T(g, 'CONTINUE?', W / 2, 56, C.ink, { align: 'center', scale: 2 });
  const n = Math.max(0, Math.ceil(game.contT) - 1);
  T(g, String(n), W / 2, 84, n <= 3 ? C.red : C.gold, { align: 'center', scale: 5 });
  if (blink(2)) T(g, input.usingTouch ? 'TAP KNIFE TO CONTINUE' : 'PRESS KNIFE OR START', W / 2, 140, C.ink, { align: 'center' });
  T(g, 'YOUR SCORE STAYS. CONTINUES: ' + game.continues, W / 2, 158, C.dim, { align: 'center' });
  hitArea(0, 0, W, H, { cont: true });
}

function drawGameOver(g) {
  drawWorld(g);
  rect(g, 0, 0, W, H, 'rgba(4,6,14,' + Math.min(0.8, game.stateT) + ')');
  T(g, 'GAME OVER', W / 2, 86, C.red, { align: 'center', scale: 3 });
  T(g, 'SCORE ' + pad7(game.score), W / 2, 122, C.ink, { align: 'center' });
}

function drawPause(g) {
  drawWorld(g); drawHUD(g);
  rect(g, 0, 0, W, H, 'rgba(4,6,14,0.62)');
  T(g, 'PAUSED', W / 2, 56, C.gold, { align: 'center', scale: 2 });
  PAUSE_ITEMS.forEach((it, i) => {
    const y = 90 + i * 18, sel = game.menu === i;
    if (sel) rect(g, W / 2 - 70, y - 4, 140, 15, 'rgba(232,57,42,0.3)');
    T(g, it, W / 2, y, sel ? C.ink : C.dim, { align: 'center' });
    hitArea(W / 2 - 80, y - 5, W / 2 + 80, y + 11, { i });
  });
  T(g, 'STAGE ' + (game.stageIdx + 1) + '  ' + game.st.name, W / 2, 164, C.cyan, { align: 'center' });
  T(g, controlHint(), W / 2, 196, '#6a7a94', { align: 'center' });
}

function drawEntry(g) {
  drawTitleBackdrop(g);
  const E = game.entry;
  if (E.done) { drawScores(g); return; }
  T(g, 'NEW HIGH SCORE!', W / 2, 24, blink(4) ? C.gold : C.ink, { align: 'center', scale: 2 });
  T(g, ['1ST', '2ND', '3RD', '4TH', '5TH'][E.rank] + ' PLACE   ' + pad7(game.score), W / 2, 48, C.ink, { align: 'center' });
  T(g, 'ENTER YOUR INITIALS', W / 2, 66, C.cyan, { align: 'center' });
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 45 + i * 34, y = 96;
    const sel = E.pos === i;
    rect(g, x - 2, y - 4, 26, 30, sel ? 'rgba(232,57,42,0.35)' : 'rgba(255,255,255,0.06)');
    T(g, ENTRY_CHARS[E.chars[i]] === ' ' ? '_' : ENTRY_CHARS[E.chars[i]], x + 11, y + 4, sel && blink(4) ? C.gold : C.ink, { align: 'center', scale: 3 });
    T(g, '^', x + 11, y - 14, sel ? C.gold : C.dim, { align: 'center' });
    T(g, 'V', x + 11, y + 30, sel ? C.gold : C.dim, { align: 'center' });
    hitArea(x - 4, y - 20, x + 26, y - 4, { up: i });
    hitArea(x - 4, y + 26, x + 26, y + 42, { down: i });
    hitArea(x - 2, y - 4, x + 24, y + 26, { slot: i });
  }
  T(g, 'OK', W / 2 + 76, 104, C.green, { scale: 2 }); hitArea(W / 2 + 70, 96, W / 2 + 104, 124, { ok: true });
  T(g, 'TIME ' + Math.max(0, Math.ceil(E.t)), W / 2, 150, C.dim, { align: 'center' });
  T(g, input.usingTouch ? 'TAP ARROWS, THEN OK' : 'TYPE, OR UP/DOWN THEN KNIFE', W / 2, 168, '#6a7a94', { align: 'center' });
}

function drawEnding(g) {
  // dawn over the mountains
  bandSky(g, W, 0, H, [[0, '#1a2050'], [0.45, '#7a4a8a'], [0.75, '#f08a5a'], [1, '#ffd27a']], 14);
  const R = seeded(77);
  ridge(g, W, 160, [[2, 26], [5, 10]], true, '#3a2a4a', R, H);
  ridge(g, W, 180, [[3, 16], [7, 5]], true, '#2a1e36', R, H);
  const sunY = 150 - Math.min(40, game.stateT * 3);
  for (let r = 34; r > 18; r -= 5) { g.globalAlpha = 0.12; disc(g, 290, sunY, r, '#fff0c0'); }
  g.globalAlpha = 1; disc(g, 290, sunY, 16, '#fff2c8');
  rect(g, 0, 188, W, H - 188, '#1e1428');
  drawSprite(g, 'hero', 'victory', 0, 1, 96, 188);
  for (let i = 0; i < 3; i++) drawSprite(g, 'captive', i === 1 ? 'salute' : 'tied', 0, -1, 130 + i * 16, 188);
  const y0 = H + 10 - game.endScroll;
  const vis = (y) => y > 8 && y < 150;
  ENDING_LINES.forEach(([str, c], i) => { const y = y0 + i * 12; if (vis(y)) T(g, str, W / 2, y, c, { align: 'center' }); });
  const yS = Math.max(70, y0 + ENDING_LINES.length * 12 + 18);
  if (vis(yS)) T(g, 'FINAL SCORE ' + pad7(game.score), W / 2, yS, C.gold, { align: 'center' });
  if (yS <= 70 && blink(2)) T(g, input.usingTouch ? 'TAP TO CONTINUE' : 'PRESS KNIFE', W / 2, 92, C.ink, { align: 'center' });
}

/* ---- frame ------------------------------------------------------------------------------ */
function renderFrame() {
  const g = bg;
  game.hits = [];
  switch (game.state) {
    case 'boot': drawBoot(g); break;
    case 'title': drawTitle(g); break;
    case 'scores': drawScores(g); break;
    case 'howto': drawHowTo(g); break;
    case 'options': drawOptions(g); break;
    case 'intro': drawIntro(g); break;
    case 'play': drawWorld(g); drawHUD(g); drawBanners(g); break;
    case 'pause': drawPause(g); break;
    case 'clear': drawClear(g); drawHUD(g); break;
    case 'continue': drawContinue(g); drawHUD(g); break;
    case 'gameover': drawGameOver(g); drawHUD(g); break;
    case 'entry': drawEntry(g); break;
    case 'ending': drawEnding(g); break;
    default: break;
  }
  if (game.fadeT > 0) { g.globalAlpha = Math.min(1, game.fadeT / 0.22); rect(g, 0, 0, W, H, '#000000'); g.globalAlpha = 1; }
  blit();
}

let crtCache = null;
function blit() {
  const cv = $('screen'), g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, cv.width, cv.height);
  const s = view.scale, w = Math.round(W * s), h = Math.round(H * s);
  g.drawImage(buf, 0, 0, W, H, view.ox, view.oy, w, h);
  if (settings.crt && s >= 2) {
    const key = w + 'x' + h + 's' + s;
    if (!crtCache || crtCache.key !== key) crtCache = { key, cv: buildCrt(w, h, s) };
    g.drawImage(crtCache.cv, view.ox, view.oy);
  }
}

function buildCrt(w, h, s) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  const step = s;
  g.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < h; y += step) g.fillRect(0, Math.floor(y + step * 0.62), w, Math.max(1, Math.round(step * 0.3)));
  const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  return c;
}
