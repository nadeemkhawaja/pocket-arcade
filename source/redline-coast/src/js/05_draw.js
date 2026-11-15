/* ==========================================================================
   Vector drawing helpers. Everything is drawn in world units (384 x 216);
   the screen transform scales it to the device, so shapes stay crisp at any size.
   ========================================================================== */

function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function disc(g, cx, cy, r, c) { if (r <= 0) return; g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); }
function ring(g, cx, cy, r, t, c) { g.strokeStyle = c; g.lineWidth = t; g.beginPath(); g.arc(cx, cy, Math.max(0.05, r - t / 2), 0, TAU); g.stroke(); }
function tri(g, cx, top, w, h, c) { g.fillStyle = c; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + w / 2, top + h); g.lineTo(cx - w / 2, top + h); g.closePath(); g.fill(); }
function stampLine(g, x0, y0, x1, y1, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function ellipse(g, cx, cy, rx, ry, rot, c) { g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
function polyPath(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
function poly(g, pts, c) { g.fillStyle = c; polyPath(g, pts); g.fill(); }
function roundRectPath(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function rrect(g, x, y, w, h, r, c) { g.fillStyle = c; roundRectPath(g, x, y, w, h, r); g.fill(); }
function lgrad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [t, c] of stops) gr.addColorStop(t, c); return gr; }
function rgrad(g, x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const [t, c] of stops) gr.addColorStop(t, c); return gr; }
function rgba(hex, a) { const [r, gg, b] = hexRgb(hex); return 'rgba(' + r + ',' + gg + ',' + b + ',' + a + ')'; }
function shade(hex, t) { return t < 0 ? mixHex(hex, '#000000', -t) : mixHex(hex, '#ffffff', t); }

/** A tapered capsule from A to B (radii ra at A, rb at B). */
function capsulePath(g, ax, ay, bx, by, ra, rb) {
  const ang = Math.atan2(by - ay, bx - ax);
  g.beginPath();
  g.arc(ax, ay, Math.max(0.01, ra), ang + Math.PI / 2, ang + Math.PI * 1.5);
  g.arc(bx, by, Math.max(0.01, rb), ang - Math.PI / 2, ang + Math.PI / 2);
  g.closePath();
}

/** A waving, tapered ribbon (sashes, hair, plumes, banners). Returns the tip. */
function ribbonPath(g, x0, y0, ang, len, w0, w1, wave, phase, segs) {
  const n = segs || 8, L = [], R = [];
  let x = x0, y = y0, a = ang;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = lerp(w0, w1, t) / 2;
    const nx = -Math.sin(a), ny = Math.cos(a);
    L.push(x + nx * w, y + ny * w); R.push(x - nx * w, y - ny * w);
    a = ang + Math.sin(phase + t * 3.2) * wave * (0.25 + t);
    x += Math.cos(a) * len / n; y += Math.sin(a) * len / n;
  }
  g.beginPath();
  g.moveTo(L[0], L[1]);
  for (let i = 2; i < L.length; i += 2) g.lineTo(L[i], L[i + 1]);
  for (let i = R.length - 2; i >= 0; i -= 2) g.lineTo(R[i], R[i + 1]);
  g.closePath();
  return [x, y];
}

/* ---- cached soft sprites: glows and ground shadows ------------------------------ */
const GLOW_CACHE = {};
function glowSprite(col) {
  let c = GLOW_CACHE[col];
  if (c) return c;
  c = makeCanvas(128, 128);
  const g = c.getContext('2d');
  g.fillStyle = rgrad(g, 64, 64, 0, 64, [[0, rgba(col, 0.6)], [0.35, rgba(col, 0.22)], [0.7, rgba(col, 0.06)], [1, rgba(col, 0)]]);
  g.fillRect(0, 0, 128, 128);
  GLOW_CACHE[col] = c;
  return c;
}
/** Additive soft light centred on x, y with radius r. */
function drawGlow(g, x, y, r, col, a) {
  if (!settings.fx && r > 12) a = (a === undefined ? 1 : a) * 0.6;
  const op = g.globalCompositeOperation, ga = g.globalAlpha;
  g.globalCompositeOperation = 'lighter';
  if (a !== undefined) g.globalAlpha = ga * a;
  g.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  g.globalCompositeOperation = op; g.globalAlpha = ga;
}
let SOFT_DOT = null;
function softDot() {
  if (SOFT_DOT) return SOFT_DOT;
  const c = makeCanvas(64, 64), g = c.getContext('2d');
  g.fillStyle = rgrad(g, 32, 32, 0, 32, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, 64, 64);
  SOFT_DOT = c;
  return c;
}
let SHADOW_SPR = null;
function shadowSprite() {
  if (SHADOW_SPR) return SHADOW_SPR;
  const c = makeCanvas(96, 32), g = c.getContext('2d');
  g.save(); g.scale(1, 1 / 3);
  g.fillStyle = rgrad(g, 48, 48, 0, 48, [[0, 'rgba(0,0,0,0.55)'], [0.55, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, 96, 96);
  g.restore();
  SHADOW_SPR = c;
  return c;
}

/** Offscreen canvas for pre-rendered art at the current render scale (world units in, crisp pixels out). */
let RS = 2;
function artCanvas(w, h) {
  const c = makeCanvas(Math.ceil(w * RS), Math.ceil(h * RS));
  const g = c.getContext('2d');
  g.scale(RS, RS);
  c.rs = RS; c.uw = w; c.uh = h;
  return [c, g];
}
/** Draw part of a pre-rendered art canvas; source and destination in world units. */
function blitArt(g, c, sx, sy, sw, sh, dx, dy, dw, dh) {
  const r = c.rs;
  g.drawImage(c, sx * r, sy * r, sw * r, sh * r, dx, dy, dw === undefined ? sw : dw, dh === undefined ? sh : dh);
}
