/* ==========================================================================
   Stage art, part two: the refinery and the citadel, then the machinery that
   builds layers, paints playfield chunks and draws the close foreground.
   ========================================================================== */

const FLARES = [86, 278, 470, 662];

/* ------------------------------ DESERT REFINERY ------------------------------ */
ART.refinery = {
  grade: ['rgba(255,140,70,0.09)', 0.32],
  dust: '#e8c890',
  sky(g) {
    skyFill(g, [[0, '#191238'], [0.3, '#56225a'], [0.55, '#c0484e'], [0.78, '#f08a3a'], [1, '#fcd884']]);
    const R = seeded(13);
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.25 + R() * 0.5; disc(g, R() * W, R() * 60, 0.3 + R() * 0.3, '#fff0e0'); }
    g.globalAlpha = 1;
    drawGlow(g, 120, 152, 120, '#ffb060', 0.9); drawGlow(g, 120, 152, 60, '#fff0b0', 0.9);
    g.fillStyle = lgrad(g, 0, 122, 0, 182, [[0, '#fff6c8'], [0.5, '#ffd27a'], [1, '#ff9a4a']]);
    g.beginPath(); g.arc(120, 152, 30, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(120, 152, 30, 0, TAU); g.clip();
    for (let y = 150, h = 1.2; y < 184; y += 5.4, h += 0.5) rect(g, 86, y, 70, h, 'rgba(226,96,60,0.75)');
    g.restore();
  },
  clouds(g) {
    const R = seeded(18);
    for (let i = 0; i < 12; i++) {
      const x = R() * LAYER_W, y = 34 + R() * 78, w = 60 + R() * 110, h = 2.5 + R() * 3.5;
      wrapX(LAYER_W, x, w, (xx) => {
        ellipse(g, xx, y, w * 0.5, h, 0, 'rgba(96,44,96,0.5)');
        ellipse(g, xx + 4, y + h * 0.6, w * 0.46, h * 0.6, 0, 'rgba(255,160,110,0.6)');
      });
    }
  },
  far(g) {
    const R = seeded(7);
    for (let i = 0; i < 7; i++) {
      const x = R() * LAYER_W, w = 60 + R() * 90, h = 26 + R() * 34, top = 172 - h;
      wrapX(LAYER_W, x, w, (xx) => {
        g.fillStyle = lgrad(g, 0, top, 0, 190, [[0, '#7a3656'], [1, '#562646']]);
        g.beginPath(); g.moveTo(xx - 12, 190); g.lineTo(xx - 7, top + h * 0.5); g.lineTo(xx - 3, top + h * 0.46); g.lineTo(xx, top + 2); g.lineTo(xx + 3, top);
        g.lineTo(xx + w - 4, top); g.lineTo(xx + w, top + 3); g.lineTo(xx + w + 3, top + h * 0.5); g.lineTo(xx + w + 9, top + h * 0.56); g.lineTo(xx + w + 14, 190); g.closePath(); g.fill();
        rect(g, xx + 3, top, w - 7, 1.1, '#f0906a');
        poly(g, [xx - 7, top + h * 0.5, xx - 3, top + h * 0.46, xx, top + 2, xx + 3, top, xx + 4, top + h * 0.5, xx - 2, 190, xx - 12, 190], 'rgba(240,144,106,0.22)');
        for (let k = 1; k < 4; k++) rect(g, xx - 2, top + k * h * 0.2, w + 4, 0.5, 'rgba(60,20,50,0.4)');
      });
    }
    ridgeV(g, LAYER_W, 178, [[3, 10], [8, 4]], false, 9, '#4f2442', '#3c1a36', 200);
    hazeBand(g, LAYER_W, 150, 186, '#ffb070', 0.3);
  },
  mid(g) {
    const R = seeded(14), dark = '#2a1830', edge = '#5a3250', hot = '#ff9a5a';
    g.fillStyle = lgrad(g, 0, 176, 0, H, [[0, '#2e1c34'], [1, '#1c1022']]); g.fillRect(0, 178, LAYER_W, H - 178);
    // pipe rack along the horizon
    rect(g, 0, 166, LAYER_W, 2.4, dark); rect(g, 0, 166, LAYER_W, 0.6, edge); rect(g, 0, 171, LAYER_W, 1.8, dark);
    for (let x = 6; x < LAYER_W; x += 24) rect(g, x, 166, 1.6, 14, dark);
    // storage tanks
    for (let i = 0; i < 7; i++) {
      const x = 40 + i * 110 + R() * 30, r = 18 + R() * 10, top = 150 - R() * 16;
      g.fillStyle = lgrad(g, x - r, 0, x + r, 0, [[0, '#5a3250'], [0.25, '#3a2240'], [1, '#22142a']]); g.fillRect(x - r, top, r * 2, 182 - top);
      ellipse(g, x, top, r, 3, 0, '#4a2a48'); ellipse(g, x - 1, top - 0.6, r * 0.9, 2.1, 0, edge);
      for (let y = top + 9; y < 178; y += 9) rect(g, x - r, y, r * 2, 0.6, 'rgba(20,10,24,0.7)');
      rect(g, x - r + 4, top + 2, 0.8, 178 - top, edge); rect(g, x - r + 7, top + 2, 0.8, 178 - top, edge);
      for (let y = top + 5; y < 178; y += 4) rect(g, x - r + 4, y, 3.8, 0.5, edge);
      rect(g, x + r * 0.3, top + 14, 3, 2, hot);
    }
    // a pressure sphere on legs
    for (const sx of [214, 598]) {
      for (const dx of [-9, 0, 9]) rect(g, sx + dx - 0.8, 158, 1.6, 24, dark);
      g.fillStyle = rgrad(g, sx - 5, 148, 1, 17, [[0, '#6a3a5a'], [1, '#2a1830']]); g.beginPath(); g.arc(sx, 153, 14, 0, TAU); g.fill();
      rect(g, sx - 14, 152.6, 28, 0.7, 'rgba(20,10,24,0.6)');
    }
    // columns and the flare stacks
    for (let i = 0; i < 4; i++) {
      const x = FLARES[i] - 3;
      g.fillStyle = lgrad(g, x, 0, x + 6, 0, [[0, edge], [0.4, dark], [1, '#1c1022']]); g.fillRect(x, 94, 6, 90);
      rect(g, x - 2, 92, 10, 3, dark);
      for (let y = 104; y < 178; y += 18) { rect(g, x - 5, y, 16, 1.4, dark); rect(g, x - 5, y - 4, 0.7, 4, edge); rect(g, x + 10.3, y - 4, 0.7, 4, edge); rect(g, x - 5, y - 4, 16, 0.5, edge); }
      for (let y = 100; y < 178; y += 12) stampLine(g, x - 6, y, x + 12, y + 12, 0.5, '#3a2240');
      const tx = x + 52 + R() * 20;
      g.fillStyle = lgrad(g, tx, 0, tx + 9, 0, [[0, edge], [0.4, dark], [1, '#1c1022']]); g.fillRect(tx, 118, 9, 66);
      ellipse(g, tx + 4.5, 118, 4.5, 1.6, 0, edge);
      for (let y = 126; y < 180; y += 10) rect(g, tx, y, 9, 0.6, 'rgba(20,10,24,0.7)');
      for (const [wx, wy] of [[2, 132], [5.6, 150], [2, 168]]) rect(g, tx + wx, wy, 1.6, 2.2, R() < 0.7 ? '#ffd27a' : hot);
    }
  },
  near(g) {
    const R = seeded(10);
    g.fillStyle = lgrad(g, 0, 185, 0, 193, [[0, '#9a6052'], [0.3, '#5e3a3a'], [1, '#2e1c22']]); g.fillRect(0, 186, LAYER_W, 6.4);
    rect(g, 0, 186, LAYER_W, 0.8, '#d08a68');
    for (let x = 14; x < LAYER_W; x += 64) { rect(g, x - 0.6, 184.6, 4.2, 9.4, '#1c1016'); rect(g, x, 185, 3, 8.4, '#4a2e30'); rect(g, x - 3, 192.4, 9, 12, '#2e1c22'); }
    for (let i = 0; i < 6; i++) { const x = R() * LAYER_W; wrapX(LAYER_W, x, 8, (xx) => { rect(g, xx, 180.6, 1.4, 6, '#2e1c22'); disc(g, xx + 0.7, 180, 2.6, '#1c1016'); disc(g, xx + 0.7, 180, 2, '#b0302a'); disc(g, xx + 0.7, 180, 0.7, '#3a1418'); }); }
  },
  ground(g, x0, x1) {
    g.fillStyle = lgrad(g, 0, GROUND_Y, 0, H, [[0, '#e6ae64'], [0.45, '#c08446'], [1, '#8a5630']]); g.fillRect(x0 - 2, GROUND_Y, x1 - x0 + 4, H - GROUND_Y);
    rect(g, x0 - 2, GROUND_Y, x1 - x0 + 4, 1.1, '#ffe2a6');
    g.lineWidth = 0.5;
    for (let x = Math.floor(x0 / 14) * 14 - 14; x < x1; x += 14) {
      const r = h01(x * 1.3), y = GROUND_Y + 3 + r * 5;
      g.strokeStyle = r < 0.5 ? 'rgba(255,224,160,0.6)' : 'rgba(140,88,44,0.5)';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 1.6, x + 18 + r * 8, y + 0.4); g.stroke();
      if (r > 0.8) { ellipse(g, x + 6, GROUND_Y + 1.6, 2.2 + r, 1.2, 0, '#8a5c38'); ellipse(g, x + 5.4, GROUND_Y + 1.2, 1.4, 0.6, 0, '#c89462'); }
    }
    // half buried pipeline
    const py = GROUND_Y + 11;
    rect(g, x0 - 2, py - 0.5, x1 - x0 + 4, 6.6, INK);
    g.fillStyle = lgrad(g, 0, py, 0, py + 5.6, [[0, '#b8a898'], [0.3, '#7c6c62'], [1, '#3c302c']]); g.fillRect(x0 - 2, py, x1 - x0 + 4, 5.6);
    for (let x = Math.floor(x0 / 90) * 90 + 30; x < x1 + 8; x += 90) { rrect(g, x - 0.5, py - 1.6, 7, 8.8, 1, INK); rrect(g, x, py - 1.1, 6, 7.8, 0.8, '#5a4a42'); rect(g, x + 0.6, py - 0.8, 1.2, 7.2, '#8a7a6e'); }
    g.fillStyle = lgrad(g, 0, py + 4, 0, py + 9, [[0, 'rgba(60,34,16,0.5)'], [1, 'rgba(60,34,16,0)']]); g.fillRect(x0 - 2, py + 5.6, x1 - x0 + 4, 4);
  },
  decor(g, st, x0, x1) {
    for (const p of scatter(st, 'valve', 140, st.len - 520, 280, 200, 33)) {
      if (p.x < x0 - 40 || p.x > x1 + 10) continue;
      rect(g, p.x - 0.4, GROUND_Y - 22, 4.8, 22, INK); rect(g, p.x, GROUND_Y - 22, 4, 22, '#6a5c54'); rect(g, p.x, GROUND_Y - 22, 1, 22, '#9a8a7e');
      disc(g, p.x + 2, GROUND_Y - 24.5, 6, INK); ring(g, p.x + 2, GROUND_Y - 24.5, 5.5, 1.5, '#c8322a'); disc(g, p.x + 2, GROUND_Y - 24.5, 1.5, '#8a1e1a');
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; stampLine(g, p.x + 2, GROUND_Y - 24.5, p.x + 2 + Math.cos(a) * 4.4, GROUND_Y - 24.5 + Math.sin(a) * 4.4, 0.9, '#c8322a'); }
      const sx = p.x + 22;
      rect(g, sx - 0.4, GROUND_Y - 30, 3.4, 30, INK); rect(g, sx, GROUND_Y - 30, 2.6, 30, '#544840');
      g.save(); g.translate(sx + 1.3, GROUND_Y - 37); g.rotate(Math.PI / 4);
      rrect(g, -7.6, -7.6, 15.2, 15.2, 1.4, INK); rrect(g, -7, -7, 14, 14, 1.2, '#f2c230'); g.strokeStyle = '#1c1810'; g.lineWidth = 0.8; g.strokeRect(-5.6, -5.6, 11.2, 11.2);
      g.restore();
      g.fillStyle = '#1c1810'; g.beginPath(); g.moveTo(sx + 1.3, GROUND_Y - 42.4); g.quadraticCurveTo(sx + 5.2, GROUND_Y - 37, sx + 2.6, GROUND_Y - 33.2); g.quadraticCurveTo(sx + 1.2, GROUND_Y - 32.4, sx - 0.2, GROUND_Y - 33.2); g.quadraticCurveTo(sx - 2.6, GROUND_Y - 36.4, sx + 1.3, GROUND_Y - 42.4); g.fill();
    }
    // helipad painted on the sand of the arena
    const hx = st.len - W / 2;
    if (x1 > hx - 90 && x0 < hx + 90) {
      g.save(); g.translate(hx, GROUND_Y + 3.4); g.scale(1, 0.14);
      g.strokeStyle = 'rgba(248,244,232,0.92)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 74, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(248,244,232,0.92)'; g.fillRect(-22, -30, 9, 60); g.fillRect(13, -30, 9, 60); g.fillRect(-22, -5, 44, 10);
      g.restore();
      for (const dx of [-74, -37, 37, 74]) { rrect(g, hx + dx - 1.8, GROUND_Y - 2.6, 3.6, 3, 0.8, INK); rect(g, hx + dx - 1.2, GROUND_Y - 2.2, 2.4, 1.6, '#ffd27a'); }
    }
  },
  lights(st) {
    const hx = st.len - W / 2;
    return [-74, -37, 37, 74].map((dx, i) => ({ x: hx + dx, y: GROUND_Y - 2, r: 9, col: '#ffc24a', blink: 1.4, ph: i * 0.35 }));
  },
  /** Burning flare stacks on the mid layer. */
  live(g, mx, t) {
    for (let i = 0; i < FLARES.length; i++) {
      for (const base of [FLARES[i] - mx, FLARES[i] - mx + LAYER_W]) {
        if (base < -40 || base > W + 40) continue;
        const fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 2) + 0.12 * Math.sin(t * 31 + i);
        drawGlow(g, base, 84, 34 * fl, '#ff8a2a', 0.85);
        for (const [w, h, c] of [[5.2, 15, '#ff7a2a'], [3.4, 11, '#ffc24a'], [1.6, 6.4, '#fff4c0']]) {
          g.fillStyle = c; g.beginPath(); g.moveTo(base - w / 2, 92);
          g.quadraticCurveTo(base - w * 0.7, 92 - h * 0.5 * fl, base + Math.sin(t * 9 + i) * 1.6, 92 - h * fl);
          g.quadraticCurveTo(base + w * 0.7, 92 - h * 0.5 * fl, base + w / 2, 92); g.closePath(); g.fill();
        }
        drawPuff(g, base + 6 + Math.sin(t + i) * 3, 68 - ((t * 9 + i * 7) % 16), 9, '#3a2236', 0.35);
      }
    }
  },
  front: ['pipe', 'rock', 'grass'],
  frontCol: '#2a1418'
};

/* ------------------------------ IRON CITADEL ------------------------------ */
ART.citadel = {
  grade: ['rgba(80,110,210,0.11)', 0.46],
  dust: '#9aa0b0',
  sky(g) {
    skyFill(g, [[0, '#03050c'], [0.5, '#0e1530'], [1, '#262b52']]);
    const R = seeded(15);
    for (let i = 0; i < 110; i++) { const b = R(); g.globalAlpha = 0.3 + b * 0.7; disc(g, R() * W, R() * 120, b > 0.9 ? 0.6 : 0.32, b > 0.8 ? '#ffffff' : '#a8b0d8'); }
    g.globalAlpha = 1;
    drawGlow(g, 70, 48, 60, '#b8c8ff', 0.7);
    disc(g, 70, 48, 12.5, '#e6ebf8');
    for (const [dx, dy, r] of [[-4, -3, 2.6], [3, 2, 3.4], [-2, 5, 1.8], [5, -5, 1.4]]) disc(g, 70 + dx, 48 + dy, r, 'rgba(160,172,206,0.55)');
    g.fillStyle = rgrad(g, 76, 44, 4, 18, [[0, 'rgba(8,12,28,0)'], [1, 'rgba(8,12,28,0.5)']]); g.beginPath(); g.arc(70, 48, 12.6, 0, TAU); g.fill();
  },
  clouds(g) {
    const R = seeded(19);
    for (let i = 0; i < 11; i++) {
      const x = R() * LAYER_W, y = 22 + R() * 76, w = 80 + R() * 110;
      wrapX(LAYER_W, x, w, (xx) => cloudV(g, xx, y, w, w * 0.16, 'rgba(34,42,78,0.86)', 'rgba(16,20,44,0.82)'));
    }
  },
  far(g) {
    const R = seeded(16);
    ridgeV(g, LAYER_W, 152, [[2, 44], [6, 13]], true, 16, '#0d1126', '#171c3a', 190);
    for (let i = 0; i < 6; i++) {
      const x = R() * LAYER_W, h = 42 + R() * 44, w = 14 + R() * 12;
      wrapX(LAYER_W, x, w + 4, (xx) => {
        g.fillStyle = lgrad(g, xx, 0, xx + w, 0, [[0, '#161b38'], [1, '#090c1c']]); g.fillRect(xx, 152 - h, w, h + 40);
        for (let k = 0; k < w; k += 4) rect(g, xx + k, 148.6 - h, 2.4, 3.6, '#0f1328');
        poly(g, [xx - 2, 152 - h, xx + w / 2, 140 - h - w * 0.5, xx + w + 2, 152 - h], '#0a0d1e');
        for (let y = 160 - h; y < 172; y += 9) if (R() < 0.55) { rect(g, xx + w * 0.4, y, 1.8, 3, '#ffd27a'); drawGlow(g, xx + w * 0.4 + 0.9, y + 1.5, 5, '#ffb24a', 0.6); }
      });
    }
    hazeBand(g, LAYER_W, 150, 190, '#3a4270', 0.4);
  },
  mid(g) {
    const R = seeded(17);
    g.fillStyle = lgrad(g, 0, 114, 0, H, [[0, '#283052'], [0.4, '#1c2240'], [1, '#12162a']]); g.fillRect(0, 120, LAYER_W, H - 120);
    for (let x = 0; x < LAYER_W; x += 12) { rect(g, x, 113.6, 7, 6.6, '#283052'); rect(g, x, 113.6, 7, 0.8, '#3c4670'); }
    rect(g, 0, 120, LAYER_W, 0.8, '#3c4670');
    for (let y = 126, r = 0; y < H; y += 8, r++) {
      rect(g, 0, y, LAYER_W, 0.5, 'rgba(8,10,22,0.55)');
      for (let x = (r % 2) * 8; x < LAYER_W; x += 16) rect(g, x, y, 0.5, 8, 'rgba(8,10,22,0.4)');
    }
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 128 + R() * 20;
      g.fillStyle = lgrad(g, x, 0, x + 34, 0, [[0, '#343e68'], [0.3, '#222a4a'], [1, '#12162c']]); g.fillRect(x, 96, 34, 130);
      for (let k = 0; k < 34; k += 8.5) { rect(g, x + k, 89.6, 5.4, 6.8, '#2a3256'); rect(g, x + k, 89.6, 5.4, 0.8, '#46507c'); }
      rect(g, x, 96, 34, 0.8, '#46507c');
      rrect(g, x + 12, 110, 10, 15, 5, '#0a0c18');
      g.fillStyle = lgrad(g, 0, 112, 0, 124, [[0, '#ffe29a'], [1, '#e89238']]); roundRectPath(g, x + 13.4, 111.6, 7.2, 12.4, 3.6); g.fill();
      rect(g, x + 16.6, 111.6, 0.8, 12.4, '#3a2a14'); rect(g, x + 13.4, 117.4, 7.2, 0.8, '#3a2a14');
      drawGlow(g, x + 17, 118, 20, '#ffb24a', 0.55);
    }
    for (let i = 0; i < 4; i++) {
      const x = 90 + i * 192;
      rect(g, x - 2, 126.4, 20, 1.8, '#0a0c18');
      g.fillStyle = lgrad(g, x, 0, x + 16, 0, [[0, '#a02630'], [0.5, '#7a1c26'], [1, '#4e1018']]);
      g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 16, 128); g.lineTo(x + 16, 168); g.lineTo(x + 8, 161); g.lineTo(x, 168); g.closePath(); g.fill();
      rect(g, x, 128, 16, 1.6, '#d8b04a'); ring(g, x + 8, 142, 4.6, 1.5, '#d8b04a'); poly(g, [x + 8, 138.6, x + 10.4, 144, x + 5.6, 144], '#d8b04a');
    }
    // coils of wire along the parapet
    g.strokeStyle = 'rgba(120,130,170,0.5)'; g.lineWidth = 0.35;
    for (let x = 0; x < LAYER_W; x += 4) { g.beginPath(); g.arc(x, 111.4, 2.2, 0, TAU); g.stroke(); }
  },
  near(g) {
    for (let x = 0; x < LAYER_W; x += 96) {
      g.fillStyle = lgrad(g, x, 0, x + 10, 0, [[0, '#2a3152'], [0.4, '#181c32'], [1, '#0c0e1c']]); g.fillRect(x, 150, 10, 50);
      rect(g, x - 3, 147.6, 16, 4, '#0c0e1c'); rect(g, x - 2.6, 148, 15.2, 3.2, '#232a48'); rect(g, x - 2.6, 148, 15.2, 0.7, '#3c4670');
      rect(g, x - 2, 192, 14, 8, '#151930');
    }
  },
  ground(g, x0, x1) {
    g.fillStyle = lgrad(g, 0, GROUND_Y, 0, H, [[0, '#5a6070'], [0.35, '#454a58'], [1, '#2a2e3a']]); g.fillRect(x0 - 2, GROUND_Y, x1 - x0 + 4, H - GROUND_Y);
    rect(g, x0 - 2, GROUND_Y, x1 - x0 + 4, 1.1, '#a8b0c2');
    for (let x = Math.floor(x0 / 32) * 32; x < x1; x += 32) { rect(g, x, GROUND_Y + 1.2, 0.7, H - GROUND_Y, 'rgba(18,20,28,0.7)'); rect(g, x + 0.7, GROUND_Y + 1.2, 0.4, H - GROUND_Y, 'rgba(160,170,190,0.18)'); }
    for (let x = Math.floor(x0 / 160) * 160; x < x1; x += 160) {
      g.save(); g.beginPath(); g.rect(x, GROUND_Y + 13, 26, 3.4); g.clip();
      rect(g, x, GROUND_Y + 13, 26, 3.4, '#22242c'); g.fillStyle = '#e3bd4b';
      for (let k = -4; k < 28; k += 6) { g.beginPath(); g.moveTo(x + k, GROUND_Y + 16.6); g.lineTo(x + k + 3, GROUND_Y + 16.6); g.lineTo(x + k + 6, GROUND_Y + 12.8); g.lineTo(x + k + 3, GROUND_Y + 12.8); g.closePath(); g.fill(); }
      g.restore();
    }
    // rain puddles catching the lamps
    for (let x = Math.floor(x0 / 23) * 23 - 23; x < x1 + 20; x += 23) {
      const r = h01(x * 0.77);
      if (r < 0.45) continue;
      const px = x + r * 12, py = GROUND_Y + 4 + h01(x * 1.9) * 14, w = 6 + r * 9;
      ellipse(g, px, py, w, 1.2, 0, 'rgba(10,12,22,0.55)'); ellipse(g, px - w * 0.2, py - 0.2, w * 0.5, 0.35, 0, 'rgba(170,190,240,0.4)');
    }
  },
  decor(g, st, x0, x1) {
    // the throne hall that closes the stage
    const ax = st.len - W;
    if (x1 > ax + 10) {
      g.fillStyle = lgrad(g, 0, 36, 0, GROUND_Y, [[0, '#343a56'], [0.5, '#272c44'], [1, '#1a1d30']]); g.fillRect(ax + 20, 38, W - 40, GROUND_Y - 38);
      rect(g, ax + 18, 36, W - 36, 3, '#4a5274'); rect(g, ax + 18, 36, W - 36, 0.8, '#6a7498');
      for (let y = 46, r = 0; y < GROUND_Y; y += 10, r++) { rect(g, ax + 20, y, W - 40, 0.5, 'rgba(10,12,24,0.55)'); for (let x = ax + 20 + (r % 2) * 10; x < st.len - 20; x += 20) rect(g, x, y, 0.5, 10, 'rgba(10,12,24,0.4)'); }
      for (const px of [ax + 44, ax + 120, ax + W - 132, ax + W - 56]) {
        g.fillStyle = lgrad(g, px, 0, px + 12, 0, [[0, '#4a5274'], [0.35, '#2c3250'], [1, '#161a2c']]); g.fillRect(px, 40, 12, GROUND_Y - 40);
        rect(g, px - 2, 40, 16, 4, '#3c4466'); rect(g, px - 2, GROUND_Y - 5, 16, 5, '#22263c'); rect(g, px - 2, 40, 16, 0.8, '#6a7498');
      }
      for (const bx of [ax + 72, ax + W - 96]) {
        rect(g, bx - 3, 52, 30, 2.4, '#0c0e1a');
        g.fillStyle = lgrad(g, bx, 0, bx + 24, 0, [[0, '#b02a34'], [0.5, '#8a1e28'], [1, '#56121a']]);
        g.beginPath(); g.moveTo(bx, 54); g.lineTo(bx + 24, 54); g.lineTo(bx + 24, 132); g.lineTo(bx + 12, 122); g.lineTo(bx, 132); g.closePath(); g.fill();
        rect(g, bx, 54, 24, 2.4, '#d8b04a'); rect(g, bx + 1.6, 58, 0.7, 68, 'rgba(216,176,74,0.6)'); rect(g, bx + 21.7, 58, 0.7, 68, 'rgba(216,176,74,0.6)');
        ring(g, bx + 12, 84, 7.4, 2, '#d8b04a'); poly(g, [bx + 12, 78.6, bx + 15.8, 87, bx + 8.2, 87], '#d8b04a');
      }
      // the great seal above the dais
      const cx = ax + W / 2;
      disc(g, cx, 78, 23, '#12152a'); ring(g, cx, 78, 22, 2.4, '#8a909c'); ring(g, cx, 78, 16.5, 1, '#5a606c');
      poly(g, [cx, 60, cx + 13, 90, cx + 4.6, 86, cx, 96, cx - 4.6, 86, cx - 13, 90], '#a02630');
      poly(g, [cx, 64, cx + 7.6, 84.6, cx, 80, cx - 7.6, 84.6], '#d8b04a');
      rect(g, ax + 130, GROUND_Y - 6, W - 260, 6, '#3a405c'); rect(g, ax + 130, GROUND_Y - 6, W - 260, 1, '#6a7498'); rect(g, ax + 142, GROUND_Y - 10, W - 284, 4, '#2e3450');
    }
    for (const p of scatter(st, 'lamp', 160, st.len - 520, 240, 160, 34)) {
      if (p.x < x0 - 36 || p.x > x1 + 36) continue;
      g.fillStyle = lgrad(g, 0, GROUND_Y - 68, 0, GROUND_Y, [[0, 'rgba(255,212,130,0.22)'], [1, 'rgba(255,212,130,0)']]);
      g.beginPath(); g.moveTo(p.x - 1, GROUND_Y - 68); g.lineTo(p.x + 3, GROUND_Y - 68); g.lineTo(p.x + 25, GROUND_Y); g.lineTo(p.x - 23, GROUND_Y); g.closePath(); g.fill();
      rect(g, p.x - 0.4, GROUND_Y - 71, 2.8, 71, INK); rect(g, p.x, GROUND_Y - 71, 2, 71, '#30343e'); rect(g, p.x, GROUND_Y - 71, 0.6, 71, '#596070');
      inked(g, () => polyPath(g, [p.x - 4.4, GROUND_Y - 69.5, p.x + 6.4, GROUND_Y - 69.5, p.x + 4.4, GROUND_Y - 75, p.x - 2.4, GROUND_Y - 75]), '#3c4250', 0.7);
      rrect(g, p.x - 2.6, GROUND_Y - 69.6, 7.2, 2.2, 1, '#ffe6a8');
    }
  },
  lights(st) {
    const out = scatter(st, 'lamp', 160, st.len - 520, 240, 160, 34).map((p) => ({ x: p.x + 1, y: GROUND_Y - 67, r: 22, col: '#ffca7a', f: 0.06, ph: p.r * 9 }));
    for (const d of st.decks) for (const ex of [d.x0 + 2, d.x1 - 2]) out.push({ x: ex, y: d.y - 14.6, r: 8, col: '#ff3a2a', blink: 1.1, ph: (ex % 7) / 7 });
    return out;
  },
  /** Searchlights sweeping from the wall towers. */
  live(g, mx, t) {
    const op = g.globalCompositeOperation;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i += 2) {
      for (const base of [47 + i * 128 - mx, 47 + i * 128 - mx + LAYER_W]) {
        if (base < -160 || base > W + 160) continue;
        const a = -Math.PI / 2 + Math.sin(t * 0.5 + i * 1.7) * 0.85, len = 190;
        const ex = base + Math.cos(a) * len, ey = 92 + Math.sin(a) * len, nx = -Math.sin(a), ny = Math.cos(a);
        g.fillStyle = lgrad(g, base, 92, ex, ey, [[0, 'rgba(190,210,255,0.3)'], [1, 'rgba(190,210,255,0)']]);
        g.beginPath(); g.moveTo(base - nx * 1.5, 92 - ny * 1.5); g.lineTo(ex - nx * 22, ey - ny * 22); g.lineTo(ex + nx * 22, ey + ny * 22); g.lineTo(base + nx * 1.5, 92 + ny * 1.5); g.closePath(); g.fill();
      }
    }
    g.globalCompositeOperation = op;
  },
  front: ['rubble', 'chain', 'rubble', 'rubble'],
  frontCol: '#070912'
};

/* ====================== building and drawing ====================== */
let STAGE_ART = null;

function artCanvasK(w, h, k) {
  const keep = RS;
  RS = Math.max(1, RS * k);
  const out = artCanvas(w, h);
  RS = keep;
  return out;
}
function freeArt(L) {
  if (!L) return;
  for (const k of ['sky', 'clouds', 'far', 'mid', 'near', 'overlay']) if (L[k]) { L[k].width = 1; L[k].height = 1; }
  for (const c of L.chunks.values()) { c.width = 1; c.height = 1; }
  L.chunks.clear();
}

/** The painted layers for a stage at the current render scale. Only one stage is held at a time. */
function stageArt(st) {
  if (STAGE_ART && STAGE_ART.id === st.id && STAGE_ART.rs === RS) return STAGE_ART;
  freeArt(STAGE_ART);
  const art = ART[st.id];
  const L = { id: st.id, rs: RS, chunks: new Map() };
  let c, g;
  [c, g] = artCanvasK(W, H, 0.75); art.sky(g); L.sky = c;
  [c, g] = artCanvasK(LAYER_W, H, 0.6); art.clouds(g); L.clouds = c;
  [c, g] = artCanvasK(LAYER_W, H, 0.8); art.far(g); L.far = c;
  [c, g] = artCanvas(LAYER_W, H); art.mid(g); L.mid = c;
  [c, g] = artCanvas(LAYER_W, H); art.near(g); L.near = c;
  if (art.overlay) { [c, g] = artCanvas(art.overlay.w, H); art.overlay.paint(g); L.overlay = c; L.overlayX = art.overlay.x(st); }
  L.lights = art.lights ? art.lights(st) : [];
  const R = seeded(st.len);
  L.front = [];
  for (let x = 40; x < st.len * 1.3; x += 90 + R() * 160) L.front.push({ x, kind: art.front[Math.floor(R() * art.front.length)], s: R() });
  STAGE_ART = L;
  return L;
}

function paintLevelRange(g, st, x0, x1) {
  const art = ART[st.id];
  art.decor(g, st, x0, x1);
  const ds = st.decks.filter((d) => d.x1 > x0 - 40 && d.x0 < x1 + 40).sort((a, b) => a.y - b.y);
  for (const d of ds) paintDeckV(g, st, d);
  for (const l of st.ladders) if (l.x > x0 - 10 && l.x < x1 + 10) paintLadderV(g, l, st.look);
  art.ground(g, x0, x1);
}

function levelChunk(L, st, i) {
  let c = L.chunks.get(i);
  if (c) return c;
  const x0 = i * CHUNK;
  let g;
  [c, g] = artCanvas(CHUNK + 1, H);
  g.translate(-x0, 0);
  paintLevelRange(g, st, x0, x0 + CHUNK + 1);
  L.chunks.set(i, c);
  if (L.chunks.size > 4) {
    let far = null, fd = -1;
    for (const k of L.chunks.keys()) { const d = Math.abs(k - i); if (d > fd) { fd = d; far = k; } }
    const old = L.chunks.get(far); old.width = 1; old.height = 1; L.chunks.delete(far);
  }
  return c;
}

/** Draw the playfield under the camera, painting chunks just before they scroll in. */
function drawLevel(g, L, st, cx) {
  const i0 = Math.max(0, Math.floor(cx / CHUNK)), i1 = Math.floor((cx + W) / CHUNK);
  for (let i = i0; i <= i1 && i * CHUNK < st.len; i++) blitArt(g, levelChunk(L, st, i), 0, 0, CHUNK + 1, H, i * CHUNK - cx, 0);
  const nxt = i1 + 1;
  if (nxt * CHUNK - (cx + W) < 96 && nxt * CHUNK < st.len && !L.chunks.has(nxt)) levelChunk(L, st, nxt);
}

/** One wrapped parallax layer. */
function drawLayer(g, c, ox) {
  ox = ((ox % LAYER_W) + LAYER_W) % LAYER_W;
  blitArt(g, c, 0, 0, LAYER_W, H, -ox, 0);
  if (LAYER_W - ox < W) blitArt(g, c, 0, 0, LAYER_W, H, LAYER_W - ox - 0.25, 0);
}

/* ---- the close foreground: dark shapes that slide past faster than the playfield ---- */
function drawFrontPiece(g, f, x, col, t) {
  const sway = Math.sin(t * 1.3 + f.s * 6);
  switch (f.kind) {
    case 'fern':
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.34 + sway * 0.04, len = 30 + (i % 3) * 6;
        const ex = x + Math.cos(a) * len, ey = H - 4 + Math.sin(a) * len * 0.8;
        g.fillStyle = i % 2 ? col : shade(col, 0.1);
        g.beginPath(); g.moveTo(x - 2, H + 2); g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - 5, H + Math.sin(a) * len * 0.55, ex, ey);
        g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 5, H + Math.sin(a) * len * 0.45, x + 2, H + 2); g.closePath(); g.fill();
      }
      break;
    case 'leaf':
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7 + sway * 0.05, len = 34 - i * 4;
        const ex = x + Math.cos(a) * len, ey = H + Math.sin(a) * len;
        const nx = -Math.sin(a) * 9, ny = Math.cos(a) * 9;
        g.fillStyle = i === 1 ? shade(col, 0.1) : col;
        g.beginPath(); g.moveTo(x, H + 2); g.quadraticCurveTo((x + ex) / 2 + nx, (H + ey) / 2 + ny, ex, ey); g.quadraticCurveTo((x + ex) / 2 - nx, (H + ey) / 2 - ny, x, H + 2); g.closePath(); g.fill();
        stampLine(g, x, H + 2, ex, ey, 0.6, shade(col, 0.22));
      }
      break;
    case 'grass':
      for (let i = 0; i < 11; i++) {
        const bx = x + i * 2.6, h = 9 + ((i * 7) % 9);
        g.fillStyle = col; g.beginPath(); g.moveTo(bx - 1.1, H + 1); g.quadraticCurveTo(bx + sway * 1.5, H - h * 0.6, bx + sway * 3 + (i % 2 ? 2 : -2), H - h); g.quadraticCurveTo(bx + 0.8, H - h * 0.4, bx + 1.2, H + 1); g.closePath(); g.fill();
      }
      break;
    case 'stump':
      rrect(g, x - 6, H - 9, 24, 12, 3, col); ellipse(g, x + 6, H - 9, 12, 2.6, 0, shade(col, 0.16));
      ellipse(g, x + 6, H - 9, 7, 1.4, 0, col); disc(g, x + 22, H + 3, 7, col);
      break;
    case 'drift':
      ellipse(g, x, H + 5, 22, 13, 0, col); ellipse(g, x + 17, H + 7, 15, 10, 0, shade(col, -0.08));
      ellipse(g, x - 4, H - 5, 12, 2.4, 0, shade(col, 0.3));
      break;
    case 'post':
      rect(g, x, H - 34, 5.4, 36, '#2e3238'); rect(g, x, H - 34, 1.4, 36, '#555c66');
      rrect(g, x - 3.4, H - 37.4, 12.2, 4.4, 2, '#f2f6fa'); rect(g, x, H - 22, 5.4, 3, '#c8322a');
      break;
    case 'pipe':
      rrect(g, x - 34, H - 12, 100, 9, 4, col); rect(g, x - 32, H - 11.4, 96, 1.2, shade(col, 0.32));
      rrect(g, x + 8, H - 15, 8, 15, 1.6, shade(col, -0.2)); rrect(g, x + 44, H - 15, 8, 15, 1.6, shade(col, -0.2));
      break;
    case 'rock':
      poly(g, [x - 12, H + 2, x - 8, H - 7, x, H - 11, x + 9, H - 8, x + 15, H + 2], col);
      poly(g, [x - 8, H - 7, x, H - 11, x + 3, H - 6, x - 3, H - 3], shade(col, 0.2));
      poly(g, [x + 10, H + 2, x + 14, H - 4, x + 21, H - 3, x + 25, H + 2], shade(col, -0.12));
      break;
    case 'chain':
      for (let y = HUD_H + 2, i = 0; y < 122; y += 5.2, i++) {
        const lx = x + Math.sin(t * 1.1 + f.s * 6) * (y - HUD_H) * 0.03;
        g.strokeStyle = shade(col, 0.4); g.lineWidth = 1.2;
        g.beginPath(); if (i % 2) g.ellipse(lx, y, 1.3, 3.2, 0, 0, TAU); else g.ellipse(lx, y, 2.4, 3.2, 0, 0, TAU); g.stroke();
      }
      break;
    case 'rubble':
      poly(g, [x - 10, H + 2, x - 6, H - 6, x + 2, H - 8, x + 8, H - 3, x + 12, H + 2], col);
      rrect(g, x + 8, H - 7, 11, 9, 1, shade(col, 0.14)); rect(g, x + 8, H - 7, 11, 1, shade(col, 0.4));
      break;
    default: break;
  }
}
