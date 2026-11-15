/* ==========================================================================
   Art. Every car, tree, sign and building is drawn here as vector shapes into
   an offscreen canvas once, at high resolution, and then scaled onto the road.
   Sizes are in art units; origin is bottom centre unless noted.
   ========================================================================== */

const ART_CACHE = {};
/** A cached art canvas: w x h art units at px pixels per unit, drawn with (0,0) at bottom centre. */
function art(key, w, h, px, draw) {
  let c = ART_CACHE[key];
  if (c) return c;
  c = makeCanvas(w * px, h * px);
  const g = c.getContext('2d');
  g.scale(px, px); g.translate(w / 2, h);
  draw(g);
  c.uw = w; c.uh = h;
  ART_CACHE[key] = c;
  return c;
}
/** Darken and tint finished art for night stages. */
function nightTint(g, w, h, col, a) {
  g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(-w, -h * 2, w * 2, h * 3); g.restore();
}

/* ---- cars ---------------------------------------------------------------------- */
const CAR_STYLES = {
  //        body w, body top, cabin w, roof y, tyre w, wing
  gt:     { bw: 74, bt: 21, cw: 52, ry: 36, tw: 13, wing: 1, name: 'KESTREL GT' },
  muscle: { bw: 78, bt: 24, cw: 58, ry: 40, tw: 14, wing: 0, name: 'THUNDER 440' },
  rally:  { bw: 70, bt: 25, cw: 56, ry: 45, tw: 12, wing: 2, name: 'DUNE RS' },
  sedan:  { bw: 70, bt: 24, cw: 56, ry: 42, tw: 11, wing: 0 },
  coupe:  { bw: 72, bt: 22, cw: 50, ry: 37, tw: 12, wing: 1 },
  van:    { bw: 72, bt: 30, cw: 68, ry: 56, tw: 11, wing: 0 },
  truck:  { bw: 84, bt: 30, cw: 82, ry: 84, tw: 14, wing: 0 }
};

/**
 * Rear view of a car. lean -2..2 turns it into a corner: the cabin shifts over
 * the body and the outside front wheel shows. o: { brake, lights, flame, stripe }
 */
function drawCar(g, style, col, lean, o) {
  const S = CAR_STYLES[style], l = lean || 0, hw = S.bw / 2;
  o = o || {};
  const dark = shade(col, -0.45), lite = shade(col, 0.35), cs = l * 2.6;
  // outside front wheel peeking past the body in a turn
  if (l) { const sx = sgn(l); rrect(g, sx * (hw - 2) + (sx > 0 ? 0 : -Math.abs(l) * 3.2), -11, Math.abs(l) * 3.2 + 2, 10, 2, '#15161c'); }
  // rear tyres
  for (const sx of [-1, 1]) {
    rrect(g, sx * (hw - S.tw / 2 - 1) - S.tw / 2, -12, S.tw, 12, 2.6, '#121318');
    for (let k = 0; k < 4; k++) rect(g, sx * (hw - S.tw / 2 - 1) - S.tw / 2 + 1.2 + k * ((S.tw - 2.4) / 3.4), -11.4, 1.1, 10.6, '#22242c');
  }
  // underbody and exhausts
  rect(g, -hw + 6, -8, S.bw - 12, 5, '#0b0c10');
  if (style !== 'truck' && style !== 'van') for (const sx of [-1, 1]) { disc(g, sx * (hw * 0.42), -4.4, 2.1, '#8b93a3'); disc(g, sx * (hw * 0.42), -4.4, 1.3, '#17181e'); }
  if (o.flame) for (const sx of [-1, 1]) {
    g.fillStyle = lgrad(g, 0, -4, 0, 12, [[0, '#ffffff'], [0.3, '#7fe9ff'], [0.7, 'rgba(60,140,255,0.6)'], [1, 'rgba(60,140,255,0)']]);
    g.beginPath(); g.moveTo(sx * hw * 0.42 - 3, -5); g.quadraticCurveTo(sx * hw * 0.42, 14 * o.flame, sx * hw * 0.42 + 3, -5); g.fill();
  }
  if (style === 'truck') {
    // box trailer
    g.fillStyle = lgrad(g, 0, -S.ry, 0, -10, [[0, shade(col, 0.2)], [1, shade(col, -0.25)]]);
    roundRectPath(g, -hw + 1 + cs * 0.3, -S.ry, S.bw - 2, S.ry - 10, 2.5); g.fill();
    rect(g, -0.5 + cs * 0.3, -S.ry + 3, 1, S.ry - 16, rgba('#000000', 0.35));
    for (const sx of [-1, 1]) { rect(g, sx * (hw - 9) - 1 + cs * 0.3, -S.ry + 4, 2, S.ry - 18, rgba('#ffffff', 0.12)); rrect(g, sx * 8 - 2 + cs * 0.3, -40, 4, 9, 1, '#30333c'); }
    rect(g, -hw + 1 + cs * 0.3, -S.ry, S.bw - 2, 2.4, rgba('#ffffff', 0.22));
    rect(g, -hw + 2, -12, S.bw - 4, 4, '#22242c');
    for (const sx of [-1, 1]) { rrect(g, sx * (hw - 9) - 5, -17, 10, 4, 1, o.brake ? '#ff5a4a' : '#b3261e'); rrect(g, sx * (hw - 20) - 3, -17, 6, 4, 1, '#e0a030'); }
    rrect(g, -8, -11.6, 16, 3.6, 0.8, '#e8e4d0');
    return;
  }
  // lower body
  g.fillStyle = lgrad(g, 0, -S.bt, 0, -5, [[0, lite], [0.3, col], [1, dark]]);
  g.beginPath();
  g.moveTo(-hw, -8); g.lineTo(-hw + 1, -S.bt + 4); g.quadraticCurveTo(-hw + 2, -S.bt, -hw + 8, -S.bt);
  g.lineTo(hw - 8, -S.bt); g.quadraticCurveTo(hw - 2, -S.bt, hw - 1, -S.bt + 4); g.lineTo(hw, -8);
  g.quadraticCurveTo(hw, -5, hw - 4, -5); g.lineTo(-hw + 4, -5); g.quadraticCurveTo(-hw, -5, -hw, -8); g.closePath(); g.fill();
  // cabin
  const cw = S.cw / 2, rw = cw - (style === 'van' ? 2 : 7);
  g.fillStyle = lgrad(g, 0, -S.ry, 0, -S.bt, [[0, lite], [1, col]]);
  g.beginPath(); g.moveTo(-cw + cs * 0.4, -S.bt + 0.5); g.lineTo(-rw + cs, -S.ry + 2); g.quadraticCurveTo(-rw + cs + 1, -S.ry, -rw + cs + 4, -S.ry);
  g.lineTo(rw + cs - 4, -S.ry); g.quadraticCurveTo(rw + cs - 1, -S.ry, rw + cs, -S.ry + 2); g.lineTo(cw + cs * 0.4, -S.bt + 0.5); g.closePath(); g.fill();
  // rear window
  const wi = style === 'van' ? 5 : 3.2, wy0 = -S.ry + (style === 'van' ? 6 : 2.6), wy1 = style === 'van' ? -S.bt - 8 : -S.bt - 1;
  g.fillStyle = lgrad(g, 0, wy0, 0, wy1, [[0, '#14243c'], [0.55, '#2c4c78'], [1, '#5a86b4']]);
  g.beginPath(); g.moveTo(-cw + wi + cs * 0.45 + 1.5, wy1); g.lineTo(-rw + wi + cs, wy0); g.lineTo(rw - wi + cs, wy0); g.lineTo(cw - wi + cs * 0.45 - 1.5, wy1); g.closePath(); g.fill();
  g.save(); g.clip();
  g.fillStyle = rgba('#ffffff', 0.16); g.beginPath(); g.moveTo(-cw * 0.5 + cs, wy0); g.lineTo(-cw * 0.2 + cs, wy0); g.lineTo(-cw * 0.55 + cs, wy1); g.lineTo(-cw * 0.85 + cs, wy1); g.fill();
  // heads of the two people in the car
  if (style !== 'van') for (const sx of [-1, 1]) { disc(g, sx * cw * 0.42 + cs * 0.8, wy1 - 2.5, 3.6, '#0a0f18'); rect(g, sx * cw * 0.42 + cs * 0.8 - 4, wy1 - 1, 8, 4, '#0a0f18'); }
  g.restore();
  // side mirrors, wheel-arch flares and a diffuser under the bumper
  for (const sx of [-1, 1]) {
    rrect(g, sx * (cw + 1.5) + cs * 0.5 - 2.6, -S.bt - 5.2, 5.2, 3.4, 1.2, dark);
    g.fillStyle = rgba('#000000', 0.22); g.beginPath(); g.ellipse(sx * (hw - S.tw / 2 - 1), -11.5, S.tw / 2 + 2.4, 4.2, 0, Math.PI, TAU); g.fill();
  }
  if (style !== 'van') for (let i = -2; i <= 2; i++) rect(g, i * 6.2 - 0.6, -7.6, 1.2, 3.4, '#2a2c36');
  // a band of reflected sky across the tail
  g.fillStyle = lgrad(g, 0, -S.bt + 1, 0, -S.bt + 9, [[0, rgba('#ffffff', 0.26)], [1, rgba('#ffffff', 0)]]);
  g.fillRect(-hw + 4, -S.bt + 1, S.bw - 8, 8);
  // crease of light along the shoulder
  rect(g, -hw + 6, -S.bt + 0.6, S.bw - 12, 0.9, rgba('#ffffff', 0.35));
  if (o.stripe) { for (const sx of [-1, 1]) rect(g, sx * 5 - 2 + cs * 0.2, -S.bt + 0.6, 4, S.bt - 9, rgba(o.stripe, 0.85)); }
  // wing
  if (S.wing === 1) { rrect(g, -hw + 3, -S.bt - 3.4, S.bw - 6, 2.6, 1.2, dark); for (const sx of [-1, 1]) rect(g, sx * (hw - 12) - 1, -S.bt - 1.2, 2, 2.4, dark); rect(g, -hw + 4, -S.bt - 3.4, S.bw - 8, 0.7, rgba('#ffffff', 0.3)); }
  if (S.wing === 2) { rrect(g, -hw + 5 + cs, -S.ry - 5.5, S.bw - 10, 3, 1.2, '#14151b'); for (const sx of [-1, 1]) rect(g, sx * (cw - 9) - 1 + cs, -S.ry - 3, 2, 4, '#14151b'); rrect(g, -4 + cs, -S.ry - 1.8, 8, 2.4, 1, '#14151b'); }
  // tail lights
  const ly = -S.bt + 3.2, lh = style === 'muscle' ? 4 : 4.6;
  const red = o.brake ? '#ff4a3a' : '#c2231c';
  if (style === 'muscle') { rrect(g, -hw + 5, ly, S.bw - 10, lh, 1.4, '#3a0c0c'); for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) rrect(g, sx * (hw - 10 - i * 7) - 3, ly + 0.6, 6, lh - 1.2, 1, red); }
  else if (style === 'gt' || style === 'coupe') { for (const sx of [-1, 1]) { disc(g, sx * (hw - 10), ly + 2.4, 3.3, red); disc(g, sx * (hw - 18.5), ly + 2.4, 3.3, red); disc(g, sx * (hw - 10), ly + 2.4, 1.3, rgba('#ffffff', o.brake ? 0.8 : 0.3)); } rect(g, -hw + 24, ly + 1.6, S.bw - 48, 1.6, '#3a0c0c'); }
  else for (const sx of [-1, 1]) { rrect(g, sx * (hw - 9) - 6, ly, 12, lh, 1.4, red); rrect(g, sx * (hw - 9) - (sx > 0 ? 6 : -2), ly, 4, lh, 1, '#f0b040'); }
  if (o.brake || o.lights) for (const sx of [-1, 1]) drawGlowRaw(g, sx * (hw - 11), ly + 2.4, o.brake ? 13 : 8, '#ff3020', o.brake ? 0.9 : 0.5);
  // bumper and plate
  rrect(g, -hw + 2, -10.4, S.bw - 4, 4.4, 1.6, shade(col, -0.62));
  rrect(g, -8.5, -14.8, 17, 5, 0.9, '#f2efe0'); rect(g, -7.2, -13.2, 14.4, 1.8, '#30343e');
  if (style === 'rally') for (const sx of [-1, 1]) rect(g, sx * (hw - 7) - 5, -6, 10, 6, '#1a1b22');
}
/** A glow that does not depend on the fx setting, for use inside cached art. */
function drawGlowRaw(g, x, y, r, col, a) {
  const op = g.globalCompositeOperation, ga = g.globalAlpha;
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * a;
  g.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  g.globalCompositeOperation = op; g.globalAlpha = ga;
}
function carArt(style, col, lean, flags, stripe) {
  const S = CAR_STYLES[style], h = S.ry + 14, w = S.bw + 30;
  return art('car|' + style + col + lean + (flags || '') + (stripe || ''), w, h + 16, style === 'truck' ? 3 : 4, (g) => {
    g.translate(0, -14);
    drawCar(g, style, col, lean, { brake: flags === 'b', lights: flags === 'n', stripe });
  });
}

/* ---- roadside ------------------------------------------------------------------- */
function leafFan(g, x, y, ang, len, w, col, col2) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -w, len, len * 0.34); g.quadraticCurveTo(len * 0.5, w * 0.2, 0, 0); g.fill();
  g.strokeStyle = col2; g.lineWidth = 0.7; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -w * 0.4, len, len * 0.34); g.stroke();
  g.restore();
}
const SCENERY = {
  palm: [70, 120, 3, (g) => {
    g.strokeStyle = lgrad(g, -4, 0, 6, 0, [[0, '#5a3a22'], [0.5, '#9a6a3a'], [1, '#4a2e1a']]); g.lineWidth = 5.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-8, -50, 4, -92); g.stroke();
    g.strokeStyle = rgba('#000000', 0.25); g.lineWidth = 0.8;
    for (let i = 1; i < 12; i++) { const t = i / 12, x = -8 * 2 * t * (1 - t) + 4 * t * t, y = -92 * t - 0; g.beginPath(); g.moveTo(x - 3, y * 1.0 + 2); g.lineTo(x + 3, y); g.stroke(); }
    for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI; leafFan(g, 4, -92, a + 0.15, 32 + (i % 3) * 4, 13, i % 2 ? '#1f7a3e' : '#2a9a4c', '#0e4a26'); }
    for (let i = 0; i < 5; i++) leafFan(g, 4, -92, -Math.PI * 0.85 + i * 0.42, 22, 10, '#3fbf62', '#1f7a3e');
    disc(g, 2, -90, 2.6, '#6a4a22'); disc(g, 6.4, -89, 2.4, '#5a3a1a');
  }],
  bush: [44, 26, 3, (g) => { for (const [x, y, r, c] of [[-12, -8, 10, '#1f6a34'], [10, -9, 11, '#237a3a'], [0, -14, 12, '#2c8c44'], [-4, -7, 8, '#3aa854']]) disc(g, x, y, r, c); for (const [x, y] of [[-8, -14], [6, -17], [12, -8]]) disc(g, x, y, 1.6, '#ff7a9c'); }],
  rock: [56, 38, 3, (g) => {
    poly(g, [-26, 0, -20, -20, -6, -34, 12, -30, 24, -14, 27, 0], '#8a6a52');
    poly(g, [-6, -34, 12, -30, 6, -12, -10, -14], '#b08a6a'); poly(g, [12, -30, 24, -14, 27, 0, 8, 0, 6, -12], '#6a4c3a');
  }],
  umbrella: [50, 46, 3, (g) => {
    rect(g, -0.8, -34, 1.6, 34, '#e8e4d8');
    g.beginPath(); g.moveTo(-22, -30); g.quadraticCurveTo(0, -52, 22, -30); g.closePath(); g.fillStyle = '#ff5a6a'; g.fill();
    g.save(); g.clip(); for (let i = -2; i <= 2; i += 2) { g.fillStyle = '#fff4e0'; g.beginPath(); g.moveTo(i * 9 - 4, -28); g.lineTo(i * 4, -52); g.lineTo(i * 9 + 5, -28); g.fill(); } g.restore();
    rrect(g, 6, -7, 18, 3, 1, '#3aa6d8'); rect(g, 8, -4, 1.4, 4, '#c8c8c8'); rect(g, 21, -4, 1.4, 4, '#c8c8c8');
  }],
  boat: [70, 60, 2, (g) => {
    poly(g, [-26, -8, 26, -8, 20, 0, -20, 0], '#f4f0e6'); rect(g, -24, -8, 48, 1.8, '#d83a4a');
    rect(g, -0.7, -52, 1.4, 44, '#6a5a4a'); poly(g, [1.5, -50, 1.5, -11, 24, -11], '#ffffff'); poly(g, [-1.5, -44, -1.5, -11, -18, -11], '#ffd9a0');
  }],
  cactus: [40, 76, 3, (g) => {
    const arm = (x, y, w, h) => { g.fillStyle = lgrad(g, x - w / 2, 0, x + w / 2, 0, [[0, '#2f7a48'], [0.5, '#4aa864'], [1, '#235a36']]); roundRectPath(g, x - w / 2, y - h, w, h, w / 2); g.fill(); };
    arm(0, 0, 11, 70); arm(-13, -26, 7, 24); rect(g, -13, -30, 10, 6, '#3a8a54'); arm(13, -36, 7, 22); rect(g, 3, -42, 12, 6, '#3a8a54');
    g.strokeStyle = rgba('#0c2a18', 0.35); g.lineWidth = 0.6; for (const x of [-2.5, 0, 2.5]) { g.beginPath(); g.moveTo(x, -66); g.lineTo(x, -2); g.stroke(); }
    disc(g, 0, -70, 2.4, '#ff6a8a');
  }],
  mesa: [130, 130, 2, (g) => {
    g.fillStyle = lgrad(g, 0, -126, 0, 0, [[0, '#d8724a'], [0.5, '#b8502e'], [1, '#7a2e1e']]);
    polyPath(g, [-60, 0, -52, -40, -44, -44, -40, -96, -30, -104, -26, -124, 18, -126, 24, -108, 36, -100, 40, -52, 54, -46, 62, 0]); g.fill();
    g.fillStyle = rgba('#3a0e08', 0.35); polyPath(g, [18, -126, 24, -108, 36, -100, 40, -52, 54, -46, 62, 0, 20, 0, 12, -60]); g.fill();
    g.strokeStyle = rgba('#ffd0a0', 0.25); g.lineWidth = 1; for (const y of [-112, -88, -70, -30]) { g.beginPath(); g.moveTo(-50, y); g.lineTo(50, y + 3); g.stroke(); }
  }],
  drybush: [30, 18, 3, (g) => { g.strokeStyle = '#b89a5a'; g.lineWidth = 0.9; for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 15); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a) * 8, Math.sin(a) * 12, Math.cos(a) * 13, Math.sin(a) * 15); g.stroke(); } }],
  pine: [56, 110, 3, (g) => {
    rect(g, -3, -16, 6, 16, '#5a3a22');
    for (let i = 0; i < 5; i++) { const y = -14 - i * 18, w = 50 - i * 8; poly(g, [-w / 2, y, 0, y - 34, w / 2, y], i % 2 ? '#1f5a3a' : '#17482e'); poly(g, [0, y - 34, w / 2, y, w * 0.12, y], rgba('#000000', 0.16)); }
  }],
  snowpine: [56, 110, 3, (g) => {
    rect(g, -3, -16, 6, 16, '#4a3222');
    for (let i = 0; i < 5; i++) { const y = -14 - i * 18, w = 50 - i * 8; poly(g, [-w / 2, y, 0, y - 34, w / 2, y], '#1c4a3a'); poly(g, [-w * 0.3, y - 12, 0, y - 34, w * 0.3, y - 12, w * 0.12, y - 8, 0, y - 13, -w * 0.14, y - 7], '#f2f8ff'); }
  }],
  cabin: [100, 64, 3, (g) => {
    rect(g, -40, -34, 80, 34, '#7a4a2a'); for (let y = -30; y < 0; y += 6) rect(g, -40, y, 80, 1, rgba('#000000', 0.22));
    poly(g, [-48, -32, 0, -62, 48, -32], '#4a2a22'); poly(g, [-48, -32, 0, -62, 0, -56, -40, -32], '#f2f8ff');
    rect(g, -8, -22, 16, 22, '#3a2218'); rect(g, 18, -24, 14, 12, '#ffd27a'); rect(g, -32, -24, 14, 12, '#ffd27a'); rect(g, 24.5, -24, 1, 12, '#3a2218'); rect(g, -25.5, -24, 1, 12, '#3a2218');
    rect(g, 22, -62, 8, 16, '#5a3a32');
  }],
  snowrock: [60, 40, 3, (g) => { poly(g, [-28, 0, -18, -24, 0, -36, 18, -26, 28, 0], '#5a6478'); poly(g, [-18, -24, 0, -36, 18, -26, 8, -20, -2, -26, -10, -18], '#f4f9ff'); }],
  lamp: [50, 110, 3, (g) => {
    rect(g, -1.4, -104, 2.8, 104, '#3a4052'); rect(g, -3, -6, 6, 6, '#2a2e3c');
    g.strokeStyle = '#3a4052'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, -102); g.quadraticCurveTo(4, -110, 20, -108); g.stroke();
    rrect(g, 14, -109.5, 10, 3, 1.2, '#fff2c0'); drawGlowRaw(g, 19, -106, 22, '#ffd27a', 0.9);
  }],
  tower: [90, 220, 2, (g) => {
    g.fillStyle = lgrad(g, -40, 0, 40, 0, [[0, '#1a2038'], [0.6, '#262e52'], [1, '#12162a']]); g.fillRect(-38, -210, 76, 210);
    const rnd = seeded(91);
    for (let y = -202; y < -8; y += 9) for (let x = -32; x < 30; x += 8) { const r = rnd(); if (r < 0.62) rect(g, x, y, 5, 5, r < 0.2 ? '#7fe9ff' : r < 0.4 ? '#ffd27a' : '#ff9ad0'); }
    rect(g, -38, -214, 76, 4, '#ff3d8a'); drawGlowRaw(g, 0, -212, 60, '#ff3d8a', 0.7); rect(g, -1, -226, 2, 14, '#8a94b4'); disc(g, 0, -227, 2, '#ff4a4a');
  }],
  block: [110, 140, 2, (g) => {
    g.fillStyle = lgrad(g, -50, 0, 50, 0, [[0, '#231a3a'], [0.5, '#30244e'], [1, '#161028']]); g.fillRect(-50, -128, 100, 128);
    const rnd = seeded(47);
    for (let y = -120; y < -30; y += 11) for (let x = -44; x < 40; x += 11) if (rnd() < 0.55) rect(g, x, y, 7, 7, rnd() < 0.5 ? '#ffd27a' : '#9ad8ff');
    rect(g, -50, -30, 100, 30, '#0e0a1a'); rrect(g, -40, -27, 80, 14, 2, '#12081e');
    g.font = '400 11px ' + FONT_DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5af0ff'; g.fillText('NOVA ARCADE', 0, -19.5);
    drawGlowRaw(g, 0, -20, 60, '#39d8ff', 0.7); rect(g, -50, -132, 100, 4, '#3a2e5a');
  }],
  neon: [44, 100, 3, (g) => {
    rect(g, -1.2, -60, 2.4, 60, '#3a3550'); rrect(g, -18, -98, 36, 40, 4, '#140a22');
    g.strokeStyle = '#ff4aa8'; g.lineWidth = 1.6; roundRectPath(g, -15, -95, 30, 34, 3); g.stroke();
    g.strokeStyle = '#5af0ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -68); g.lineTo(-8, -88); g.lineTo(8, -68); g.lineTo(8, -88); g.stroke();
    drawGlowRaw(g, 0, -78, 42, '#ff4aa8', 0.8);
  }],
  antenna: [40, 130, 3, (g) => {
    g.strokeStyle = '#8a94b4'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-12, 0); g.lineTo(0, -120); g.lineTo(12, 0); g.stroke();
    for (let i = 1; i < 8; i++) { const y = -i * 14, w = 12 * (1 - i * 14 / 120); g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y - 7); g.moveTo(w, y); g.lineTo(-w, y - 7); g.stroke(); }
    disc(g, 0, -122, 2.4, '#ff4a4a'); drawGlowRaw(g, 0, -122, 16, '#ff3020', 0.9);
  }],
  chevR: [64, 46, 3, (g) => {
    for (const x of [-24, 24]) rect(g, x - 1.2, -20, 2.4, 20, '#5a5e6a');
    rrect(g, -31, -45, 62, 27, 2.5, '#14161c'); rrect(g, -29.5, -43.5, 59, 24, 1.8, '#ffc81e');
    for (let i = 0; i < 3; i++) { const x = -22 + i * 18; poly(g, [x, -41, x + 7, -41, x + 15, -31.5, x + 7, -22, x, -22, x + 8, -31.5], '#14161c'); }
  }],
  post: [10, 26, 5, (g) => { rrect(g, -1.6, -22, 3.2, 22, 1, '#eef0f4'); rect(g, -1.6, -19, 3.2, 4.4, '#e8392a'); rect(g, -1.6, -8, 3.2, 1.4, '#30343e'); drawGlowRaw(g, 0, -17, 5, '#ff5a3a', 0.7); }],
  /* ---- things on the road ---- */
  cone: [16, 20, 5, (g) => { rrect(g, -7, -2.4, 14, 2.4, 0.8, '#d84a1a'); poly(g, [-4.6, -2.4, -1.4, -18, 1.4, -18, 4.6, -2.4], '#ff6a2a'); poly(g, [-3.4, -8, -2.4, -12.5, 2.4, -12.5, 3.4, -8], '#ffffff'); }],
  barrier: [70, 28, 3, (g) => {
    rrect(g, -32, -24, 64, 14, 2, '#f2f0e6'); g.save(); roundRectPath(g, -32, -24, 64, 14, 2); g.clip();
    for (let i = -4; i < 5; i++) poly(g, [i * 16, -24, i * 16 + 8, -24, i * 16 - 2, -10, i * 16 - 10, -10], '#e8392a'); g.restore();
    rect(g, -27, -10, 3, 10, '#8a8e9a'); rect(g, 24, -10, 3, 10, '#8a8e9a'); for (const x of [-24, 24]) { disc(g, x, -27, 2.6, '#ffb020'); drawGlowRaw(g, x, -27, 9, '#ffb020', 0.8); }
  }],
  boulder: [44, 34, 3, (g) => { poly(g, [-20, 0, -18, -16, -6, -30, 10, -28, 20, -12, 21, 0], '#9a6248'); poly(g, [-6, -30, 10, -28, 4, -12, -8, -14], '#c08a66'); poly(g, [10, -28, 20, -12, 21, 0, 6, 0, 4, -12], '#6a3a2a'); }],
  oil: [70, 14, 3, (g) => {
    g.save(); g.translate(0, -6); g.scale(1, 0.18);
    g.fillStyle = rgrad(g, 0, 0, 2, 32, [[0, '#0a0a12'], [0.7, '#14101e'], [1, 'rgba(10,10,18,0)']]); g.beginPath(); g.arc(0, 0, 32, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(160,90,255,0.6)'; g.lineWidth = 3; g.beginPath(); g.arc(-4, 0, 18, 0.4, 2.6); g.stroke();
    g.strokeStyle = 'rgba(80,230,255,0.5)'; g.beginPath(); g.arc(6, 2, 12, 3.4, 5.6); g.stroke(); g.restore();
  }],
  ice: [90, 14, 3, (g) => {
    g.save(); g.translate(0, -6); g.scale(1, 0.16);
    g.fillStyle = rgrad(g, 0, 0, 2, 42, [[0, 'rgba(220,244,255,0.9)'], [0.8, 'rgba(170,220,250,0.7)'], [1, 'rgba(170,220,250,0)']]); g.beginPath(); g.arc(0, 0, 42, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-24, -6); g.lineTo(-4, 4); g.moveTo(6, -10); g.lineTo(24, 2); g.stroke(); g.restore();
  }],
  puddle: [90, 14, 3, (g) => {
    g.save(); g.translate(0, -6); g.scale(1, 0.16);
    g.fillStyle = rgrad(g, 0, 0, 2, 42, [[0, 'rgba(90,60,160,0.85)'], [0.8, 'rgba(40,30,90,0.8)'], [1, 'rgba(40,30,90,0)']]); g.beginPath(); g.arc(0, 0, 42, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,120,220,0.7)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 22, 0.2, 2.2); g.stroke(); g.restore();
  }],
  ramp: [70, 30, 3, (g) => {
    poly(g, [-30, 0, 30, 0, 26, -24, -26, -24], '#ffc81e'); poly(g, [-30, 0, 30, 0, 29, -5, -29, -5], '#b88a00');
    for (let i = -2; i <= 2; i++) poly(g, [i * 11 - 4, -8, i * 11, -19, i * 11 + 4, -8, i * 11, -11], '#14161c');
    rect(g, -26, -25.5, 52, 2, '#fff6c8');
  }],
  boost: [80, 16, 3, (g) => {
    g.save(); g.translate(0, -7); g.scale(1, 0.2);
    g.fillStyle = 'rgba(20,60,90,0.75)'; roundRectPath(g, -34, -34, 68, 68, 8); g.fill();
    for (let i = 0; i < 3; i++) { g.strokeStyle = i === 1 ? '#ffffff' : '#5af0ff'; g.lineWidth = 7; g.beginPath(); g.moveTo(-20, 22 - i * 20); g.lineTo(0, 6 - i * 20); g.lineTo(20, 22 - i * 20); g.stroke(); }
    g.restore(); drawGlowRaw(g, 0, -7, 26, '#39d8ff', 0.5);
  }],
  /* ---- pickups ---- */
  nitro: [30, 40, 5, (g) => {
    drawGlowRaw(g, 0, -18, 20, '#39d8ff', 0.9);
    g.fillStyle = lgrad(g, -8, 0, 8, 0, [[0, '#1a6ad8'], [0.45, '#7fe9ff'], [1, '#124a9a']]); roundRectPath(g, -8, -28, 16, 24, 4); g.fill();
    rrect(g, -3.5, -33, 7, 6, 1.5, '#c8d4e4'); rect(g, -8, -19, 16, 7, '#0a2a5a');
    g.font = '700 7px ' + FONT_UI; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('N2O', 0, -15.2);
  }],
  clock: [30, 40, 5, (g) => {
    drawGlowRaw(g, 0, -18, 20, '#ffd27a', 0.9);
    disc(g, 0, -18, 11.5, '#ffb020'); disc(g, 0, -18, 9.2, '#fff8e6'); rect(g, -0.7, -25, 1.4, 7.5, '#30343e');
    g.save(); g.translate(0, -18); g.rotate(1.1); rect(g, -0.7, -5.5, 1.4, 5.5, '#e8392a'); g.restore(); rrect(g, -2.5, -32.5, 5, 3.4, 1, '#ffb020');
  }],
  coin: [22, 30, 5, (g) => {
    drawGlowRaw(g, 0, -13, 14, '#ffd27a', 0.7);
    disc(g, 0, -13, 8, '#e89a10'); disc(g, 0, -13, 6.4, '#ffd24a'); g.font = '400 9px ' + FONT_DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b86a00'; g.fillText('R', 0.2, -12.4);
    g.fillStyle = rgba('#ffffff', 0.6); g.beginPath(); g.arc(0, -13, 6.4, 3.5, 4.6); g.lineTo(0, -13); g.fill();
  }]
};
function sprite(name) { const d = SCENERY[name]; return art('s|' + name, d[0], d[1], d[2], d[3]); }

/** Roadside hoardings for invented brands. */
const BOARDS = [
  ['TURBO', 'COLA', '#e8392a', '#fff4e0'], ['RADIO', '98.6 WAVE', '#2a1a5a', '#ff7ad0'], ['MOTEL', 'PALMA', '#0e6a6a', '#ffe9a0'], ['APEX', 'TYRES', '#141820', '#ffd24a'],
  ['SUNSET', 'BAY 5 KM', '#1a6a3a', '#ffffff'], ['NOVA', 'SYNTH', '#3a0e5a', '#5af0ff'], ['KESTREL', 'MOTOR OIL', '#f2c020', '#1a1a22'], ['DRIFT', 'CLUB', '#101018', '#ff4aa8']
];
function boardArt(i, night) {
  const b = BOARDS[i % BOARDS.length];
  return art('board|' + i + (night ? 'n' : ''), 110, 84, 3, (g) => {
    for (const x of [-34, 34]) rect(g, x - 1.6, -42, 3.2, 42, '#4a4e5a');
    rrect(g, -52, -82, 104, 46, 3, '#1a1c24'); rrect(g, -50, -80, 100, 42, 2, b[2]);
    g.fillStyle = rgba('#ffffff', 0.08); g.beginPath(); g.moveTo(-50, -80); g.lineTo(0, -80); g.lineTo(-24, -38); g.lineTo(-50, -38); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = b[3];
    g.font = '400 20px ' + FONT_DISPLAY; g.fillText(b[0], 0, -66);
    g.font = '700 10px ' + FONT_UI; g.fillText(b[1], 0, -49);
    if (night) { nightTint(g, 110, 84, '#0a0620', 0.25); for (const x of [-30, 0, 30]) drawGlowRaw(g, x, -84, 16, '#fff2c0', 0.8); }
  });
}

/** A gantry across the whole road: START, CHECKPOINT and GOAL. Origin is the road centre line. */
function gantryArt(kind) {
  const col = { start: '#2fc86a', check: '#ffb020', goal: '#ff3d5a' }[kind], label = { start: 'START', check: 'CHECKPOINT', goal: 'GOAL' }[kind];
  return art('gantry|' + kind, 520, 190, 2, (g) => {
    for (const sx of [-1, 1]) { g.fillStyle = lgrad(g, sx * 236 - 8, 0, sx * 236 + 8, 0, [[0, '#5a6274'], [0.5, '#aab4c8'], [1, '#3a4252']]); g.fillRect(sx * 236 - 7, -170, 14, 170); rect(g, sx * 236 - 12, -8, 24, 8, '#2a2e3a'); }
    rrect(g, -250, -186, 500, 44, 5, '#14161e'); rrect(g, -244, -181, 488, 34, 3, col);
    g.fillStyle = rgba('#000000', 0.18); for (let x = -244; x < 244; x += 28) { g.beginPath(); g.moveTo(x, -181); g.lineTo(x + 14, -181); g.lineTo(x, -147); g.lineTo(x - 14, -147); g.fill(); }
    g.font = '400 30px ' + FONT_DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = rgba('#000000', 0.4); g.fillText(label, 1.5, -162.5); g.fillStyle = '#ffffff'; g.fillText(label, 0, -164);
    if (kind !== 'check') for (let i = 0; i < 2; i++) for (let x = -244; x < 244; x += 12) rect(g, x + (i ? 6 : 0), -145 + i * 5, 6, 5, '#ffffff');
    for (const x of [-200, -100, 0, 100, 200]) { disc(g, x, -188, 4, '#fff8d0'); drawGlowRaw(g, x, -188, 16, '#fff2a0', 0.8); }
  });
}
/** A rock arch across the road (desert) and a neon ring (city, ridge). */
function archArt(kind) {
  return art('arch|' + kind, 560, 230, 2, (g) => {
    if (kind === 'rock') {
      g.fillStyle = lgrad(g, 0, -226, 0, 0, [[0, '#d87a50'], [0.6, '#a84a2c'], [1, '#70281a']]);
      g.beginPath(); g.moveTo(-276, 0); g.lineTo(-262, -150); g.quadraticCurveTo(-240, -226, -120, -222); g.lineTo(140, -226); g.quadraticCurveTo(250, -220, 264, -140); g.lineTo(276, 0);
      g.lineTo(206, 0); g.lineTo(198, -110); g.quadraticCurveTo(180, -170, 0, -172); g.quadraticCurveTo(-180, -170, -196, -110); g.lineTo(-208, 0); g.closePath(); g.fill();
      g.fillStyle = rgba('#3a0e08', 0.3); g.beginPath(); g.moveTo(198, -110); g.quadraticCurveTo(180, -170, 0, -172); g.quadraticCurveTo(-180, -170, -196, -110); g.lineTo(-190, -96); g.quadraticCurveTo(-170, -150, 0, -154); g.quadraticCurveTo(170, -150, 192, -96); g.fill();
    } else {
      const col = kind === 'neon' ? '#ff3d8a' : '#5af0c0';
      for (let i = 0; i < 2; i++) { g.strokeStyle = i ? '#ffffff' : col; g.lineWidth = i ? 2.4 : 9; g.beginPath(); g.moveTo(-244, 0); g.lineTo(-244, -120); g.quadraticCurveTo(-244, -210, -150, -210); g.lineTo(150, -210); g.quadraticCurveTo(244, -210, 244, -120); g.lineTo(244, 0); g.stroke(); }
      for (const [x, y] of [[-244, -60], [244, -60], [-150, -210], [150, -210], [0, -210]]) drawGlowRaw(g, x, y, 50, col, 0.7);
    }
  });
}

/* ---- far scenery: wide strips that slide sideways as the road turns ----------------- */
function horizonArt(theme, layer) {
  const key = 'hz|' + theme.id + layer;
  let c = ART_CACHE[key];
  if (c) return c;
  const w = 512, h = 96, px = 2;
  c = makeCanvas(w * px, h * px);
  const g = c.getContext('2d'); g.scale(px, px);
  const rnd = seeded(theme.seed + layer * 97), col = theme.far[layer];
  const ridge = (base, amp, n, jag) => {
    g.beginPath(); g.moveTo(0, h);
    const pts = []; for (let i = 0; i <= n; i++) pts.push(base - amp * (0.3 + 0.7 * rnd()) * (jag ? 1 : 0.8));
    pts[n] = pts[0];
    for (let i = 0; i <= n; i++) { const x = (i / n) * w; if (jag) g.lineTo(x, pts[i]); else { const px0 = ((i - 0.5) / n) * w; g.quadraticCurveTo(px0, pts[i] - amp * 0.2, x, pts[i]); } }
    g.lineTo(w, h); g.closePath();
  };
  if (theme.id === 'neon' || (theme.id === 'coast' && layer === 0 && false)) {
    // skyline
    g.fillStyle = col; let x = 0;
    const lit = [];
    while (x < w) { const bw = 8 + Math.floor(rnd() * 16), bh = (layer ? 16 : 28) + rnd() * (layer ? 30 : 56); g.fillRect(x, h - bh, bw - 1, bh); if (rnd() < 0.3) g.fillRect(x + bw / 2 - 0.5, h - bh - 8, 1, 8); lit.push([x, bw, bh]); x += bw; }
    for (const [bx, bw, bh] of lit) for (let yy = h - bh + 3; yy < h - 3; yy += 4) for (let xx = bx + 1.5; xx < bx + bw - 2.5; xx += 3) if (rnd() < (layer ? 0.3 : 0.42)) rect(g, xx, yy, 1.4, 1.8, rnd() < 0.5 ? theme.lit[0] : theme.lit[1]);
  } else {
    g.fillStyle = lgrad(g, 0, h - 70, 0, h, [[0, col], [1, theme.far[layer + 2] || col]]);
    ridge(h - (layer ? 14 : 30), layer ? 26 : 44, layer ? 18 : 11, theme.jag); g.fill();
    if (theme.snow && !layer) { g.save(); g.clip(); g.fillStyle = rgba('#ffffff', 0.75); for (let i = 0; i < 40; i++) { const x0 = rnd() * w, y0 = h - 78 + rnd() * 26; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 8, y0 + 9); g.lineTo(x0 - 3, y0 + 14); g.fill(); } g.fillRect(0, 0, w, h - 62); g.restore(); }
    if (theme.id === 'mesa' && !layer) { g.fillStyle = col; for (let i = 0; i < 5; i++) { const x0 = rnd() * (w - 60) + 10, bw = 26 + rnd() * 30, bh = 30 + rnd() * 26; g.fillRect(x0, h - 26 - bh, bw, bh + 26); g.fillRect(x0 - 5, h - 30, bw + 10, 30); } }
  }
  ART_CACHE[key] = c; c.uw = w; c.uh = h;
  return c;
}

function cloudArt(theme) {
  return art('cloud|' + theme.id, 512, 70, 2, (g) => {
    g.translate(-256, -70);
    const rnd = seeded(theme.seed + 5);
    for (let i = 0; i < 9; i++) {
      const x = rnd() * 512, y = 8 + rnd() * 44, s = 0.6 + rnd() * 1.1;
      for (const dx of [-512, 0, 512]) for (let k = 0; k < 6; k++) {
        g.fillStyle = k < 3 ? theme.cloud[1] : theme.cloud[0];
        g.beginPath(); g.ellipse(x + dx + (k - 2.5) * 11 * s, y + (k % 2) * 3 * s + (k < 3 ? 3 : 0), 15 * s, (4.5 + (k % 3)) * s, 0, 0, TAU); g.fill();
      }
    }
  });
}
