/* ==========================================================================
   Stage art: painted parallax backdrops and the playfield, all vector.
   Backdrops are pre-rendered once per stage at the screen's resolution. The
   long playfield is painted in 512 unit chunks on demand, so memory stays low.
   ========================================================================== */

const CHUNK = 512;

function skyFill(g, stops) { g.fillStyle = lgrad(g, 0, 0, 0, H, stops); g.fillRect(0, 0, W, H); }

/** Tileable ridge filled downward with a vertical gradient. Returns the height lookup. */
function ridgeV(g, LW, base, harm, sharp, seed, cTop, cBot, bottom) {
  const R = seeded(seed), ph = harm.map(() => R() * TAU);
  const yAt = (x) => {
    let y = base;
    for (let i = 0; i < harm.length; i++) {
      const s = Math.sin((x / LW) * TAU * harm[i][0] + ph[i]);
      y -= harm[i][1] * (sharp ? 1 - Math.abs(s) : (s + 1) / 2);
    }
    return y;
  };
  let top = 1e9;
  for (let x = 0; x <= LW; x += 3) top = Math.min(top, yAt(x));
  const bot = bottom || H;
  g.fillStyle = lgrad(g, 0, top, 0, bot, [[0, cTop], [1, cBot]]);
  g.beginPath(); g.moveTo(-2, bot);
  for (let x = -2; x <= LW + 2; x += sharp ? 1 : 2) g.lineTo(x, yAt(x));
  g.lineTo(LW + 2, bot); g.closePath(); g.fill();
  return yAt;
}

function cloudV(g, x, y, w, h, lit, shadow) {
  const lobes = [[-0.36, 0.16, 0.2, 0.34], [-0.14, -0.06, 0.24, 0.5], [0.12, 0.02, 0.26, 0.44], [0.36, 0.18, 0.18, 0.3]];
  for (const [ox, oy, rx, ry] of lobes) ellipse(g, x + ox * w, y + oy * h + h * 0.1, rx * w, ry * h, 0, shadow);
  rrect(g, x - w * 0.5, y + h * 0.2, w, h * 0.3, h * 0.15, shadow);
  for (const [ox, oy, rx, ry] of lobes) ellipse(g, x + ox * w - w * 0.02, y + oy * h, rx * w * 0.92, ry * h * 0.82, 0, lit);
}

function hazeBand(g, LW, y0, y1, col, a) {
  g.fillStyle = lgrad(g, 0, y0, 0, y1, [[0, rgba(col, 0)], [0.5, rgba(col, a)], [1, rgba(col, 0)]]);
  g.fillRect(0, y0, LW, y1 - y0);
}

/* ---- trees ------------------------------------------------------------------- */
function palmV(g, x, base, h, lean, trunk, leafD, leafL) {
  const tx = x + lean, ty = base - h;
  g.lineCap = 'round';
  g.strokeStyle = trunk; g.lineWidth = 3.4;
  g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + lean * 0.15, base - h * 0.55, tx, ty); g.stroke();
  g.strokeStyle = shade(trunk, 0.2); g.lineWidth = 0.9;
  g.beginPath(); g.moveTo(x - 0.9, base); g.quadraticCurveTo(x + lean * 0.15 - 0.9, base - h * 0.55, tx - 0.8, ty); g.stroke();
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI, len = 22 + 7 * Math.sin(i * 2.1 + x);
    const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.36 + 9 + Math.abs(Math.cos(a)) * 5;
    const cx = tx + Math.cos(a) * len * 0.55, cy = ty - 7 + Math.sin(a) * 5;
    g.fillStyle = i % 2 ? leafD : leafL;
    g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(cx, cy - 3.4, ex, ey); g.quadraticCurveTo(cx, cy + 3.2, tx, ty + 1.6); g.closePath(); g.fill();
  }
  disc(g, tx, ty + 0.6, 2.2, leafD);
}

function canopyV(g, x, y, r, dark, mid, lit) {
  for (const [ox, oy, k] of [[-0.6, 0.2, 0.72], [0.55, 0.25, 0.7], [0, 0, 1], [-0.25, -0.45, 0.66], [0.32, -0.38, 0.6]]) disc(g, x + ox * r, y + oy * r, r * k, dark);
  for (const [ox, oy, k] of [[-0.5, 0.05, 0.56], [0.42, 0.1, 0.52], [-0.05, -0.2, 0.74], [0.2, -0.55, 0.42]]) disc(g, x + ox * r - r * 0.08, y + oy * r - r * 0.1, r * k, mid);
  for (const [ox, oy, k] of [[-0.42, -0.2, 0.3], [0.05, -0.5, 0.34], [0.4, -0.3, 0.22]]) disc(g, x + ox * r - r * 0.12, y + oy * r - r * 0.12, r * k, lit);
}

function pineV(g, x, base, h, dark, mid, snow) {
  rect(g, x - 1, base - 3, 2, 5, '#3a2c24');
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, ty = base - 2 - t * h * 0.8, tw = (1 - t * 0.72) * h * 0.4, th = h * 0.36;
    poly(g, [x, ty - th, x + tw, ty, x - tw, ty], dark);
    poly(g, [x, ty - th, x + tw * 0.2, ty - th * 0.3, x - tw * 0.86, ty, x - tw, ty], mid);
    if (snow) { poly(g, [x, ty - th, x + tw * 0.5, ty - th * 0.45, x + tw * 0.12, ty - th * 0.5, x - tw * 0.2, ty - th * 0.35, x - tw * 0.45, ty - th * 0.5], snow); }
  }
}

/* ---- ladders and the four kinds of deck ------------------------------------------- */
function paintLadderV(g, L, s) {
  const x = L.x, top = L.hi - 12, bot = L.lo;
  for (const dx of [-5.6, 4.2]) {
    rect(g, x + dx - 0.35, top - 0.3, 2.1, bot - top + 0.3, INK);
    g.fillStyle = lgrad(g, x + dx, 0, x + dx + 1.4, 0, [[0, s.lHi], [1, s.lRail]]); g.fillRect(x + dx, top, 1.4, bot - top);
  }
  for (let y = bot - 4; y > top + 1; y -= 6) {
    rrect(g, x - 4.6, y - 0.3, 9.6, 2.2, 0.8, INK);
    rrect(g, x - 4.2, y, 8.8, 1.5, 0.6, s.lRung); rect(g, x - 4, y + 1, 8.4, 0.5, s.lRail);
  }
}

function deckShadow(g, d, fy) {
  g.fillStyle = lgrad(g, 0, d.y + 5, 0, Math.min(fy, d.y + 26), [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(d.x0 + 2, d.y + 5, d.x1 - d.x0 - 4, Math.min(fy, d.y + 26) - d.y - 5);
}

function paintDeckWood(g, st, d) {
  const s = st.look, fy = floorBelow(st, d), w = d.x1 - d.x0;
  const n = Math.max(2, Math.round(w / 44));
  const px = (i) => lerp(d.x0 + 5, d.x1 - 9, i / n);
  for (let i = 0; i < n; i++) {
    const a = px(i) + 4, b = px(i + 1), y0 = d.y + 7, y1 = Math.min(fy - 4, d.y + 28);
    stampLine(g, a, y0, b, y1, 2.6, INK); stampLine(g, a, y1, b, y0, 2.6, INK);
    stampLine(g, a, y0, b, y1, 1.8, s.brace); stampLine(g, a, y1, b, y0, 1.8, shade(s.brace, 0.12));
  }
  for (let i = 0; i <= n; i++) {
    const x = px(i);
    rect(g, x - 0.4, d.y + 4, 5.8, fy - d.y - 4, INK);
    g.fillStyle = lgrad(g, x, 0, x + 5, 0, [[0, s.postHi], [0.45, s.post], [1, s.postLo]]); g.fillRect(x, d.y + 4, 5, fy - d.y - 4);
    for (let y = d.y + 12; y < fy - 3; y += 9 + h01(x + y) * 6) rect(g, x + 0.6, y, 3.6, 0.5, 'rgba(30,16,6,0.45)');
    rect(g, x - 1, fy - 2.4, 7, 2.4, INK); rect(g, x - 0.6, fy - 2, 6.2, 2, s.postLo);
  }
  deckShadow(g, d, fy);
  // rope rail behind the walkway
  for (let x = d.x0 + 1; x <= d.x1; x += 30) { rect(g, x - 0.4, d.y - 9.6, 2.8, 10, INK); rect(g, x, d.y - 9.2, 2, 9.4, s.post); rect(g, x, d.y - 9.2, 0.6, 9.4, s.postHi); }
  g.lineCap = 'round';
  for (const [oy, col, lw] of [[0.5, INK, 1.5], [0, s.rope, 0.8]]) {
    g.strokeStyle = col; g.lineWidth = lw;
    for (let x = d.x0 + 2; x + 30 <= d.x1 + 1; x += 30) { g.beginPath(); g.moveTo(x, d.y - 7.6 + oy); g.quadraticCurveTo(x + 15, d.y - 3.2 + oy, x + 30, d.y - 7.6 + oy); g.stroke(); }
  }
  // planks
  rrect(g, d.x0 - 1.4, d.y - 0.4, w + 2.8, 7, 1, INK);
  g.fillStyle = lgrad(g, 0, d.y, 0, d.y + 6, [[0, s.dkHi], [0.35, s.dk], [1, s.dkLo]]); g.fillRect(d.x0 - 1, d.y, w + 2, 6.2);
  rect(g, d.x0 - 1, d.y, w + 2, 0.7, shade(s.dkHi, 0.25));
  for (let x = d.x0 + 9; x < d.x1; x += 11) { rect(g, x, d.y + 0.8, 0.5, 3.6, 'rgba(40,20,8,0.55)'); disc(g, x - 1.6, d.y + 2.2, 0.35, 'rgba(30,14,4,0.6)'); }
  rect(g, d.x0 - 1, d.y + 4.4, w + 2, 0.6, 'rgba(30,14,4,0.5)');
}

function paintDeckCar(g, st, d) {
  const s = st.look, w = d.x1 - d.x0;
  const body = s.cars[(Math.abs(Math.round(d.x0 / 7)) % s.cars.length)];
  const bot = GROUND_Y - 12, top = d.y + 3;
  // underframe, bogies and couplers
  rect(g, d.x0 + 3, bot - 0.5, w - 6, 4.2, INK); rect(g, d.x0 + 3.6, bot, w - 7.2, 3.2, '#23252c'); rect(g, d.x0 + 3.6, bot, w - 7.2, 0.8, '#3c404a');
  for (const wx of [d.x0 + 16, d.x0 + 30, d.x1 - 30, d.x1 - 16]) {
    disc(g, wx, bot + 6.4, 5.6, INK); disc(g, wx, bot + 6.4, 5, '#2a2c33'); ring(g, wx, bot + 6.4, 4.2, 0.9, '#5d626e'); disc(g, wx, bot + 6.4, 1.7, '#8a909c');
  }
  for (const bx of [d.x0 + 23, d.x1 - 23]) { rrect(g, bx - 11, bot + 3, 22, 3, 1, INK); rrect(g, bx - 10.4, bot + 3.5, 20.8, 2, 0.8, '#3a3e48'); }
  rect(g, d.x0 - 3.4, bot - 6.4, 6, 3.6, INK); rect(g, d.x1 - 2.6, bot - 6.4, 6, 3.6, INK);
  rect(g, d.x0 - 3, bot - 6, 5.2, 2.8, '#30333b'); rect(g, d.x1 - 2.2, bot - 6, 5.2, 2.8, '#30333b');
  // body
  rect(g, d.x0 + 1.4, top - 0.4, w - 2.8, bot - top + 0.8, INK);
  g.fillStyle = lgrad(g, 0, top, 0, bot, [[0, shade(body, 0.2)], [0.25, body], [1, shade(body, -0.3)]]); g.fillRect(d.x0 + 2, top, w - 4, bot - top);
  for (let x = d.x0 + 10; x < d.x1 - 8; x += 12) { rect(g, x, top + 4, 1, bot - top - 6, shade(body, -0.32)); rect(g, x + 1, top + 4, 0.5, bot - top - 6, shade(body, 0.14)); }
  const door = d.x0 + w / 2 - 14;
  rect(g, door - 0.5, top + 6.5, 29, bot - top - 8, INK);
  g.fillStyle = lgrad(g, 0, top + 7, 0, bot, [[0, shade(body, -0.05)], [1, shade(body, -0.42)]]); g.fillRect(door, top + 7, 28, bot - top - 9);
  for (const dx of [7, 14, 21]) rect(g, door + dx, top + 7, 0.6, bot - top - 9, shade(body, -0.5));
  stampLine(g, door + 1.5, top + 9, door + 26.5, bot - 4, 0.9, shade(body, -0.5));
  rect(g, door - 3, top + 5.2, 34, 1.5, '#262830'); rect(g, door - 3, bot - 2.4, 34, 1.3, '#262830');
  rrect(g, door + 22.5, top + 16, 2.4, 6, 0.8, '#c8ccd4');
  // stencil plate
  rrect(g, d.x0 + 7, top + 8, 20, 9, 1, shade(body, 0.22));
  drawText(g, s.carTag, d.x0 + 17, top + 8.8, shade(body, -0.55), { align: 'center', scale: 0.82, weight: 700 });
  for (let i = 0; i < 4; i++) { const rx = d.x0 + 6 + h01(d.x0 + i) * (w - 12); rect(g, rx, top + 3, 0.8, 4 + h01(rx) * 9, 'rgba(60,30,10,0.25)'); }
  // roof walkway and its snow
  rrect(g, d.x0 - 1.4, d.y - 0.4, w + 2.8, 5, 1.6, INK);
  g.fillStyle = lgrad(g, 0, d.y, 0, d.y + 4, [[0, s.dkHi], [1, s.dkLo]]); roundRectPath(g, d.x0 - 1, d.y, w + 2, 4.2, 1.4); g.fill();
  g.fillStyle = '#f4f8fb'; g.beginPath(); g.moveTo(d.x0 - 0.6, d.y + 0.6);
  for (let x = d.x0; x <= d.x1; x += 6) g.quadraticCurveTo(x + 3, d.y - 2.6 - h01(x) * 1.6, x + 6, d.y - 0.2 - h01(x + 3) * 0.8);
  g.lineTo(d.x1 + 0.6, d.y + 0.9); g.closePath(); g.fill();
  rect(g, d.x0, d.y + 0.2, w, 0.7, '#c9d6e2');
  for (let x = d.x0 + 4; x < d.x1 - 2; x += 7 + h01(x) * 9) poly(g, [x, d.y + 4, x + 1.5, d.y + 4, x + 0.75, d.y + 6.5 + h01(x * 3) * 3], '#e8f1f8');
}

function paintDeckSteel(g, st, d, girder) {
  const s = st.look, fy = floorBelow(st, d), w = d.x1 - d.x0;
  const n = Math.max(1, Math.round(w / 70));
  for (let i = 0; i <= n; i++) {
    const x = lerp(d.x0 + 6, d.x1 - 14, i / n);
    g.lineCap = 'butt';
    for (let y = d.y + 8; y < fy - 6; y += 10) { stampLine(g, x + 1, y, x + 7, y + 10, 0.9, s.brace); stampLine(g, x + 7, y, x + 1, y + 10, 0.9, shade(s.brace, 0.15)); }
    for (const dx of [0, 6]) { rect(g, x + dx - 0.4, d.y + 5, 2.8, fy - d.y - 5, INK); rect(g, x + dx, d.y + 5, 2, fy - d.y - 5, s.post); rect(g, x + dx, d.y + 5, 0.6, fy - d.y - 5, s.postHi); }
    rect(g, x - 2, fy - 2.2, 12, 2.2, INK); rect(g, x - 1.6, fy - 1.8, 11.2, 1.8, s.postLo);
  }
  deckShadow(g, d, fy);
  // railing
  for (let x = d.x0; x <= d.x1 + 0.1; x += 16) { rect(g, x - 0.7, d.y - 11.4, 1.5, 11.6, INK); rect(g, x - 0.4, d.y - 11.2, 0.9, 11.2, s.rail); }
  rect(g, d.x0 - 0.6, d.y - 11.8, w + 1.2, 1.5, INK); rect(g, d.x0 - 0.3, d.y - 11.5, w + 0.6, 0.9, s.rail);
  rect(g, d.x0, d.y - 6.3, w, 0.7, s.railLo);
  // slab
  const th = girder ? 7 : 5;
  rrect(g, d.x0 - 1.4, d.y - 0.4, w + 2.8, th + 0.8, 0.8, INK);
  g.fillStyle = lgrad(g, 0, d.y, 0, d.y + th, [[0, s.dkHi], [0.3, s.dk], [1, s.dkLo]]); g.fillRect(d.x0 - 1, d.y, w + 2, th);
  rect(g, d.x0 - 1, d.y, w + 2, 0.7, shade(s.dkHi, 0.3));
  if (girder) {
    rect(g, d.x0 - 1, d.y + 1.6, w + 2, 0.5, s.dkLo); rect(g, d.x0 - 1, d.y + 5.2, w + 2, 0.5, s.dkLo);
    for (let x = d.x0 + 4; x < d.x1 - 2; x += 8) { disc(g, x, d.y + 3.4, 0.55, s.rivet); disc(g, x - 0.15, d.y + 3.25, 0.25, '#ffffff'); }
    for (const ex of [d.x0 + 2, d.x1 - 2]) { rect(g, ex - 0.8, d.y - 14.4, 1.6, 3, INK); disc(g, ex, d.y - 14.6, 1.5, INK); disc(g, ex, d.y - 14.6, 1.1, '#a02a22'); }
  } else {
    g.save(); g.beginPath(); g.rect(d.x0 - 1, d.y + 2.6, w + 2, 2.4); g.clip();
    g.fillStyle = s.hazB; g.fillRect(d.x0 - 1, d.y + 2.6, w + 2, 2.4);
    g.fillStyle = s.hazA;
    for (let x = d.x0 - 6; x < d.x1 + 4; x += 6) { g.beginPath(); g.moveTo(x, d.y + 5.2); g.lineTo(x + 3, d.y + 5.2); g.lineTo(x + 6, d.y + 2.4); g.lineTo(x + 3, d.y + 2.4); g.closePath(); g.fill(); }
    g.restore();
  }
}

function paintDeckV(g, st, d) {
  const style = d.style || (st.look.deck === 'car' && d.lv === 2 ? 'steel' : st.look.deck);
  if (style === 'wood') paintDeckWood(g, st, d);
  else if (style === 'car') paintDeckCar(g, st, d);
  else paintDeckSteel(g, st, d, style === 'girder');
}

/** Scatter positions that the old sequential generator produced, computed once per stage. */
function scatter(st, key, from, to, step, jitter, seed) {
  st._sc = st._sc || {};
  if (st._sc[key]) return st._sc[key];
  const R = seeded(seed), out = [];
  for (let x = from; x < to; x += step + R() * jitter) out.push({ x, r: R() });
  st._sc[key] = out;
  return out;
}

/* ====================== stage painters ====================== */
const ART = {
  /* ------------------------------ JUNGLE OUTPOST ------------------------------ */
  jungle: {
    grade: ['rgba(255,214,140,0.07)', 0.3],
    dust: '#d8c8a8',
    sky(g) {
      skyFill(g, [[0, '#2a7fb6'], [0.42, '#79c4d0'], [0.74, '#cfe9c4'], [1, '#f8eec2']]);
      drawGlow(g, 300, 58, 90, '#fff2c0', 0.9); drawGlow(g, 300, 58, 40, '#ffffff', 0.9);
      disc(g, 300, 58, 13, '#fffbe6');
      g.save(); g.translate(300, 58); g.globalAlpha = 0.07; g.fillStyle = '#fffbe0';
      for (let i = 0; i < 9; i++) { g.rotate(0.7); g.beginPath(); g.moveTo(0, 0); g.lineTo(220, -16); g.lineTo(220, 16); g.closePath(); g.fill(); }
      g.restore();
    },
    clouds(g) {
      const R = seeded(11);
      for (let i = 0; i < 7; i++) {
        const x = R() * LAYER_W, y = 26 + R() * 62, w = 46 + R() * 60;
        wrapX(LAYER_W, x, w, (xx) => cloudV(g, xx, y, w, w * 0.34, 'rgba(255,255,255,0.92)', 'rgba(196,226,226,0.85)'));
      }
    },
    far(g) {
      const y1 = ridgeV(g, LAYER_W, 134, [[2, 26], [5, 13], [11, 5]], true, 3, '#8fc0b8', '#b9dccc', 172);
      // a thread of waterfall down the far wall
      const wx = 520, wy = y1(wx) + 4;
      g.fillStyle = lgrad(g, 0, wy, 0, 152, [[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0.55)']]); g.fillRect(wx - 2.5, wy, 5, 152 - wy);
      rect(g, wx - 0.8, wy, 1.6, 152 - wy, '#ffffff');
      for (const [dx, r] of [[-5, 6], [4, 7], [0, 9]]) drawPuff(g, wx + dx, 152, r, '#ffffff', 0.6);
      hazeBand(g, LAYER_W, 122, 150, '#e6f6ea', 0.5);
      ridgeV(g, LAYER_W, 152, [[3, 20], [7, 9], [13, 4]], true, 4, '#5a9a88', '#8fc2a8', 180);
      hazeBand(g, LAYER_W, 142, 176, '#def2e2', 0.55);
    },
    mid(g) {
      const R = seeded(5);
      g.fillStyle = lgrad(g, 0, 150, 0, H, [[0, '#2a6a4a'], [1, '#17402c']]); g.fillRect(0, 166, LAYER_W, H - 166);
      for (let i = 0; i < 46; i++) {
        const x = R() * LAYER_W, y = 132 + R() * 30, r = 11 + R() * 14;
        wrapX(LAYER_W, x, r * 1.4, (xx) => canopyV(g, xx, y, r, '#1f553c', '#2c7250', '#48a068'));
      }
      for (let i = 0; i < 9; i++) {
        const x = R() * LAYER_W, h = 50 + R() * 28, lean = (R() - 0.5) * 16;
        wrapX(LAYER_W, x, 34, (xx) => palmV(g, xx, 176, h, lean, '#4a3d2a', '#1f6a3e', '#3f9a58'));
      }
      for (let i = 0; i < 30; i++) {
        const x = R() * LAYER_W, y = 162 + R() * 14, r = 8 + R() * 9;
        wrapX(LAYER_W, x, r * 1.4, (xx) => canopyV(g, xx, y, r, '#17472f', '#22603f', '#368552'));
      }
      // hanging vines
      g.strokeStyle = 'rgba(20,60,36,0.8)'; g.lineWidth = 0.7;
      for (let i = 0; i < 26; i++) { const x = R() * LAYER_W, y = 118 + R() * 22, l = 14 + R() * 22; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 3, y + l * 0.6, x - 1, y + l); g.stroke(); }
    },
    near(g) {
      const R = seeded(8);
      for (let i = 0; i < 30; i++) {
        const x = R() * LAYER_W, r = 9 + R() * 10;
        wrapX(LAYER_W, x, r * 1.5, (xx) => canopyV(g, xx, 197, r, '#123a27', '#1c5237', '#2a7048'));
      }
      for (let i = 0; i < 18; i++) {
        const x = R() * LAYER_W;
        wrapX(LAYER_W, x, 14, (xx) => { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.42; g.fillStyle = k % 2 ? '#1c5a3a' : '#144530'; g.beginPath(); g.moveTo(xx, 200); g.quadraticCurveTo(xx + Math.cos(a) * 8, 200 + Math.sin(a) * 12 - 3, xx + Math.cos(a) * 15, 200 + Math.sin(a) * 15); g.quadraticCurveTo(xx + Math.cos(a) * 7, 200 + Math.sin(a) * 6, xx + 1.4, 200); g.closePath(); g.fill(); } });
      }
    },
    ground(g, x0, x1) {
      g.fillStyle = lgrad(g, 0, GROUND_Y, 0, H, [[0, '#7a5434'], [0.4, '#5f3f26'], [1, '#402a18']]); g.fillRect(x0 - 2, GROUND_Y, x1 - x0 + 4, H - GROUND_Y);
      for (let x = Math.floor(x0 / 9) * 9; x < x1; x += 9) {
        const r = h01(x * 1.7), y = GROUND_Y + 6 + r * 13;
        ellipse(g, x + r * 7, y, 1.6 + r * 2, 0.8 + r * 0.6, 0, r < 0.5 ? '#8a6444' : '#3a2616');
        if (r > 0.86) { g.strokeStyle = 'rgba(40,24,12,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, GROUND_Y + 4); g.quadraticCurveTo(x + 6, GROUND_Y + 12, x + 3, GROUND_Y + 20); g.stroke(); }
      }
      rect(g, x0 - 2, GROUND_Y, x1 - x0 + 4, 3.4, '#3f8a34');
      rect(g, x0 - 2, GROUND_Y, x1 - x0 + 4, 1.1, '#8fd45c');
      for (let x = Math.floor(x0 / 3) * 3; x < x1; x += 3) {
        const r = h01(x * 3.3);
        if (r < 0.62) { g.fillStyle = r < 0.3 ? '#6fc04a' : '#4f9e3a'; g.beginPath(); g.moveTo(x - 0.8, GROUND_Y + 0.6); g.quadraticCurveTo(x + (r - 0.3) * 3, GROUND_Y - 2 - r * 3, x + (r - 0.3) * 5, GROUND_Y - 3.2 - r * 3); g.quadraticCurveTo(x + 0.8, GROUND_Y - 1, x + 0.9, GROUND_Y + 0.6); g.closePath(); g.fill(); }
        if (r > 0.975) { disc(g, x, GROUND_Y - 2.4, 0.9, r > 0.99 ? '#ffd84a' : '#ff8a9a'); disc(g, x, GROUND_Y - 2.4, 0.35, '#fff6d0'); }
      }
      for (let x = Math.floor(x0 / 5) * 5; x < x1; x += 5) rect(g, x + h01(x) * 3, GROUND_Y + 3.4, 2 + h01(x * 2) * 2, 0.6, 'rgba(20,40,10,0.35)');
    },
    decor(g, st, x0, x1) {
      // thatched roofs over the watchtowers
      for (const d of st.decks) {
        if (d.lv !== 2 || d.x1 < x0 - 30 || d.x0 > x1 + 30) continue;
        const cx = (d.x0 + d.x1) / 2, w = d.x1 - d.x0 + 26;
        for (const px of [d.x0 + 6, d.x1 - 9]) { rect(g, px - 0.4, d.y - 41, 3.8, 41, INK); rect(g, px, d.y - 41, 3, 41, '#5d3d24'); rect(g, px, d.y - 41, 0.8, 41, '#86593a'); }
        inked(g, () => polyPath(g, [cx - w / 2, d.y - 39, cx - w / 2 + 18, d.y - 55, cx + w / 2 - 18, d.y - 55, cx + w / 2, d.y - 39]), '#c9a04e', 0.9);
        poly(g, [cx - w / 2 + 6, d.y - 44, cx - w / 2 + 18, d.y - 55, cx + w / 2 - 18, d.y - 55, cx + w / 2 - 30, d.y - 51, cx - w / 2 + 24, d.y - 51], '#e6c070');
        for (let x = cx - w / 2 + 3; x < cx + w / 2 - 2; x += 3) stampLine(g, x, d.y - 39.4, x - 0.6 + h01(x) * 1.2, d.y - 36 + h01(x * 2) * 1.6, 0.7, '#a07c34');
        for (let i = 1; i < 4; i++) rect(g, cx - w / 2 + 6 + i * 3.5, d.y - 39 - i * 4, w - 12 - i * 7, 0.5, 'rgba(110,80,30,0.55)');
      }
      // sandbag walls, tents and torches around the camp
      for (const p of scatter(st, 'bags', 120, st.len - 500, 260, 200, 31)) {
        if (p.x < x0 - 60 || p.x > x1 + 20) continue;
        if (p.r > 0.55) {
          const tx = p.x + 54;
          inked(g, () => polyPath(g, [tx - 22, GROUND_Y, tx, GROUND_Y - 24, tx + 22, GROUND_Y]), '#5f6b3a', 0.9);
          poly(g, [tx - 22, GROUND_Y, tx, GROUND_Y - 24, tx - 3, GROUND_Y], '#7f8e52');
          poly(g, [tx - 4, GROUND_Y, tx, GROUND_Y - 13, tx + 5, GROUND_Y], '#2a301c');
          stampLine(g, tx, GROUND_Y - 24, tx, GROUND_Y - 28, 0.8, '#3a2a1a');
        }
        for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
          const bx = p.x + i * 9 + row * 4.5, by = GROUND_Y - 5.6 - row * 5;
          rrect(g, bx - 0.4, by - 0.4, 9.8, 6.4, 2.6, INK);
          g.fillStyle = lgrad(g, 0, by, 0, by + 5.6, [[0, '#d8c088'], [1, '#927a48']]); roundRectPath(g, bx, by, 9, 5.6, 2.4); g.fill();
          rect(g, bx + 2, by + 2.6, 5, 0.4, 'rgba(70,52,24,0.5)');
        }
      }
      for (const p of scatter(st, 'torch', 330, st.len - 420, 380, 160, 37)) {
        if (p.x < x0 - 12 || p.x > x1 + 12) continue;
        rect(g, p.x - 1, GROUND_Y - 30, 2.4, 30, INK); rect(g, p.x - 0.7, GROUND_Y - 30, 1.8, 30, '#4a321c');
        inked(g, () => polyPath(g, [p.x - 2.6, GROUND_Y - 33, p.x + 3, GROUND_Y - 33, p.x + 1.6, GROUND_Y - 29, p.x - 1.2, GROUND_Y - 29]), '#2a2420', 0.7);
      }
      // the palisade that seals the arena
      const px0 = st.len - 20;
      if (x1 > px0 - 8) {
        for (let x = px0; x < st.len + 4; x += 6.5) {
          inked(g, () => polyPath(g, [x, GROUND_Y, x, GROUND_Y - 97, x + 3.2, GROUND_Y - 105, x + 6.4, GROUND_Y - 97, x + 6.4, GROUND_Y]), '#6e4c2a', 0.9);
          rect(g, x + 0.8, GROUND_Y - 96, 1.4, 96, '#93683a'); rect(g, x + 4.6, GROUND_Y - 96, 1, 96, '#4a321a');
        }
        for (const ry of [GROUND_Y - 72, GROUND_Y - 30]) { rect(g, px0 - 2, ry - 0.4, 26, 5, INK); rect(g, px0 - 2, ry, 26, 4, '#4a321c'); rect(g, px0 - 2, ry, 26, 1, '#7a5632'); }
      }
    },
    lights(st) {
      return scatter(st, 'torch', 330, st.len - 420, 380, 160, 37).map((p) => ({ x: p.x + 0.2, y: GROUND_Y - 36, r: 26, col: '#ffb24a', f: 0.25, ph: p.r * 9, flame: true }));
    },
    front: ['fern', 'grass', 'leaf', 'stump'],
    frontCol: '#0e2a1c'
  },

  /* ------------------------------ FROZEN RAIL LINE ------------------------------ */
  rail: {
    grade: ['rgba(170,205,255,0.08)', 0.26],
    dust: '#eef3f7',
    sky(g) {
      skyFill(g, [[0, '#5f7896'], [0.5, '#a7bacd'], [1, '#e8eef3']]);
      drawGlow(g, 96, 62, 70, '#ffffff', 0.55); disc(g, 96, 62, 8, 'rgba(255,255,255,0.75)');
    },
    clouds(g) {
      const R = seeded(12);
      for (let i = 0; i < 9; i++) {
        const x = R() * LAYER_W, y = 18 + R() * 64, w = 70 + R() * 90;
        wrapX(LAYER_W, x, w, (xx) => cloudV(g, xx, y, w, w * 0.2, 'rgba(236,242,247,0.85)', 'rgba(170,188,206,0.7)'));
      }
    },
    far(g) {
      const y1 = ridgeV(g, LAYER_W, 142, [[2, 52], [5, 18], [9, 7]], true, 4, '#6e84a0', '#a9bbcd', 180);
      // snow caps and the shaded faces of the peaks
      g.fillStyle = '#f2f6fa';
      g.beginPath(); g.moveTo(0, 200);
      for (let x = 0; x <= LAYER_W; x += 1) { const y = y1(x); g.lineTo(x, y); }
      for (let x = LAYER_W; x >= 0; x -= 2) { const y = y1(x); g.lineTo(x, Math.min(y + Math.max(0, (112 - y)) * 0.55 + 2 * Math.sin(x * 0.9), 112)); }
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(70,92,124,0.32)';
      for (let x = 0; x < LAYER_W; x += 2) { const y = y1(x), dy = y1(x + 3) - y; if (dy > 0.6) g.fillRect(x, y, 2.2, Math.min(34, 150 - y) * 0.7); }
      ridgeV(g, LAYER_W, 160, [[3, 22], [7, 9]], true, 5, '#8fa3b8', '#c5d2de', 186);
      hazeBand(g, LAYER_W, 140, 182, '#f2f6fa', 0.55);
    },
    mid(g) {
      const R = seeded(6);
      g.fillStyle = lgrad(g, 0, 170, 0, H, [[0, '#e9eff4'], [1, '#c2cedb']]); g.fillRect(0, 174, LAYER_W, H - 174);
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 22; i++) {
          const x = R() * LAYER_W, h = 26 + R() * 26 + row * 6, base = 172 + row * 5 + R() * 3;
          const tone = ['#4a6a70', '#3a5a5e', '#2c4a4c'][row];
          wrapX(LAYER_W, x, 14, (xx) => pineV(g, xx, base, h, tone, shade(tone, 0.14), '#f2f6fa'));
        }
      }
      // telegraph line
      for (let x = 20; x < LAYER_W; x += 96) {
        rect(g, x - 0.4, 119, 2.8, 62, 'rgba(30,24,20,0.9)'); rect(g, x, 119.4, 1.6, 61, '#5a4a3e');
        rect(g, x - 7, 124, 16, 1.8, '#4a3c32'); rect(g, x - 5, 129.5, 12, 1.5, '#4a3c32');
        for (const dx of [-6, 0, 7]) rect(g, x + dx, 122.4, 1.2, 1.8, '#cfe0e8');
        rect(g, x - 2, 118, 5.6, 1.8, '#f2f6fa');
      }
      g.strokeStyle = 'rgba(60,62,72,0.8)'; g.lineWidth = 0.4;
      for (const oy of [0, 5.4]) for (let x = 20 - 96; x < LAYER_W; x += 96) { g.beginPath(); g.moveTo(x, 124.5 + oy); g.quadraticCurveTo(x + 48, 133 + oy, x + 96, 124.5 + oy); g.stroke(); }
    },
    near(g) {
      const R = seeded(9);
      for (let i = 0; i < 22; i++) {
        const x = R() * LAYER_W, r = 12 + R() * 12;
        wrapX(LAYER_W, x, r * 1.4, (xx) => { ellipse(g, xx, 200, r * 1.3, r * 0.62, 0, '#b9c8d6'); ellipse(g, xx - 2, 198, r * 1.15, r * 0.5, 0, '#f4f8fb'); });
      }
    },
    ground(g, x0, x1) {
      g.fillStyle = lgrad(g, 0, GROUND_Y, 0, H, [[0, '#e6edf3'], [0.5, '#c6d2de'], [1, '#a9b8c8']]); g.fillRect(x0 - 2, GROUND_Y, x1 - x0 + 4, H - GROUND_Y);
      // the rear track the wagons stand on
      for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) { rect(g, x - 0.3, GROUND_Y - 4.6, 5.6, 3.6, INK); rect(g, x, GROUND_Y - 4.2, 5, 2.8, '#5a463a'); rect(g, x, GROUND_Y - 4.2, 5, 0.7, '#7a6252'); }
      rect(g, x0 - 2, GROUND_Y - 6.6, x1 - x0 + 4, 2.4, INK); rect(g, x0 - 2, GROUND_Y - 6.2, x1 - x0 + 4, 1.6, '#8a929c'); rect(g, x0 - 2, GROUND_Y - 6.2, x1 - x0 + 4, 0.5, '#d4dce6');
      // snow lip in front of the track
      g.fillStyle = '#f7fafc'; g.beginPath(); g.moveTo(x0 - 2, GROUND_Y + 4);
      for (let x = Math.floor(x0 / 12) * 12 - 12; x <= x1 + 12; x += 12) g.quadraticCurveTo(x + 6, GROUND_Y - 2.6 - h01(x) * 1.8, x + 12, GROUND_Y - 0.4);
      g.lineTo(x1 + 14, GROUND_Y + 4); g.closePath(); g.fill();
      rect(g, x0 - 2, GROUND_Y + 0.4, x1 - x0 + 4, 3.2, '#f7fafc');
      for (let x = Math.floor(x0 / 7) * 7; x < x1; x += 7) {
        const r = h01(x * 2.1);
        ellipse(g, x + r * 5, GROUND_Y + 7 + r * 12, 3 + r * 4, 0.7, 0, r < 0.5 ? 'rgba(150,170,196,0.55)' : 'rgba(255,255,255,0.8)');
        if (r > 0.93) { disc(g, x, GROUND_Y + 2 + r * 3, 0.45, '#ffffff'); }
      }
    },
    decor(g, st, x0, x1) {
      for (const p of scatter(st, 'signal', 180, st.len - 520, 300, 160, 32)) {
        if (p.x < x0 - 14 || p.x > x1 + 14) continue;
        rect(g, p.x - 0.4, GROUND_Y - 61, 3.8, 57, INK); rect(g, p.x, GROUND_Y - 61, 3, 57, '#444a54'); rect(g, p.x, GROUND_Y - 61, 0.8, 57, '#727a86');
        rrect(g, p.x - 5.4, GROUND_Y - 73.4, 13.8, 13.8, 2, INK); rrect(g, p.x - 5, GROUND_Y - 73, 13, 13, 1.8, '#23262c');
        rect(g, p.x - 6.5, GROUND_Y - 74.6, 16, 2, '#f2f6fa');
        disc(g, p.x + 1.5, GROUND_Y - 66.5, 3.2, '#0c0d10'); disc(g, p.x + 1.5, GROUND_Y - 66.5, 2.4, p.r < 0.5 ? '#ff4a3a' : '#4ad16a'); disc(g, p.x + 0.8, GROUND_Y - 67.2, 0.8, 'rgba(255,255,255,0.8)');
        for (let i = 0; i < 4; i++) rect(g, p.x + 3, GROUND_Y - 52 + i * 11, 3, 0.8, '#727a86');
      }
      // tunnel mouth at the far end
      const tx = st.len - 62;
      if (x1 > tx - 4) paintTunnel(g, tx, false);
    },
    // the portal's front face, redrawn over the train as it rolls out of the bore
    overlay: {
      w: 72, x: (st) => st.len - 63,
      paint(g) {
        const gy = GROUND_Y;
        g.save(); g.beginPath(); g.moveTo(15, gy + 22); g.lineTo(15, gy - 84); g.arc(39, gy - 84, 24, Math.PI, 0); g.lineTo(73, gy - 84); g.lineTo(73, gy + 22); g.closePath(); g.clip();
        g.fillStyle = lgrad(g, 15, 0, 44, 0, [[0, 'rgba(7,8,11,0.25)'], [1, 'rgba(7,8,11,0.96)']]); g.fillRect(15, gy - 110, 60, 134);
        g.restore();
        paintTunnel(g, 1, true);
      }
    },
    lights(st) {
      return scatter(st, 'signal', 180, st.len - 520, 300, 160, 32).map((p) => ({ x: p.x + 1.5, y: GROUND_Y - 66.5, r: 13, col: p.r < 0.5 ? '#ff4a3a' : '#4ad16a', f: 0.05, ph: p.r * 7 }));
    },
    front: ['drift', 'drift', 'post'],
    frontCol: '#93a4b6'
  }
};

/** Stone portal of the rail tunnel. The front face is redrawn over the train as it rolls out. */
function paintTunnel(g, tx, frontOnly) {
  const gy = GROUND_Y;
  const stone = (x, y, w, h, i) => { rrect(g, x, y, w, h, 0.8, ['#7b828c', '#6b727c', '#868d98'][i % 3]); rect(g, x + 0.4, y + 0.3, w - 0.8, 0.6, 'rgba(255,255,255,0.22)'); };
  if (!frontOnly) {
    rect(g, tx - 0.6, gy - 124.6, 70, 125, INK);
    g.fillStyle = lgrad(g, 0, gy - 124, 0, gy, [[0, '#6c737d'], [1, '#4a5058']]); g.fillRect(tx, gy - 124, 70, 124);
    for (let y = gy - 122, r = 0; y < gy; y += 8, r++) for (let x = tx + (r % 2) * 6 - 6; x < tx + 70; x += 12) stone(x + 0.5, y + 0.5, 11, 7, Math.floor(h01(x * 3 + y) * 3));
    // the dark bore
    g.fillStyle = '#07080b'; g.beginPath(); g.moveTo(tx + 14, gy); g.lineTo(tx + 14, gy - 84); g.arc(tx + 38, gy - 84, 24, Math.PI, 0); g.lineTo(tx + 70, gy); g.closePath(); g.fill();
    g.fillStyle = lgrad(g, tx + 14, 0, tx + 44, 0, [[0, 'rgba(60,70,86,0.5)'], [1, 'rgba(60,70,86,0)']]); g.fillRect(tx + 14, gy - 108, 30, 108);
  }
  // voussoirs round the arch and the left jamb, in front of anything leaving the tunnel
  for (let i = 0; i <= 18; i++) {
    const a = Math.PI + (i / 18) * Math.PI, ax = tx + 38 + Math.cos(a) * 27.5, ay = gy - 84 + Math.sin(a) * 27.5;
    g.save(); g.translate(ax, ay); g.rotate(a + Math.PI / 2);
    rrect(g, -3.6, -4.4, 7.2, 8.8, 1, INK); rrect(g, -3.1, -3.9, 6.2, 7.8, 0.8, i === 9 ? '#a8aeb8' : i % 2 ? '#8a919c' : '#7a818c');
    g.restore();
  }
  for (let y = gy - 84; y < gy; y += 9) { rrect(g, tx + 5.6, y, 9.4, 9.4, 1, INK); rrect(g, tx + 6.1, y + 0.5, 8.4, 8.4, 0.8, Math.floor(y / 9) % 2 ? '#8a919c' : '#7a818c'); }
  if (!frontOnly) {
    // snow on the parapet
    g.fillStyle = '#f4f8fb'; g.beginPath(); g.moveTo(tx - 2, gy - 122);
    for (let x = tx - 2; x < tx + 70; x += 8) g.quadraticCurveTo(x + 4, gy - 130 - h01(x) * 3, x + 8, gy - 124.5);
    g.lineTo(tx + 72, gy - 121); g.lineTo(tx - 2, gy - 121); g.closePath(); g.fill();
    for (let x = tx + 3; x < tx + 68; x += 6 + h01(x) * 6) poly(g, [x, gy - 121, x + 1.6, gy - 121, x + 0.8, gy - 116 - h01(x * 2) * 4], '#e8f1f8');
  }
}
