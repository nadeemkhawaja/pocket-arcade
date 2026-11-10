/* ==========================================================================
   Type: Barlow Condensed for the interface, Cinzel for titles, Ma Shan Zheng
   for calligraphy seals. Sizes are in world units, so text stays sharp.
   ========================================================================== */

const FONT_UI = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", "Helvetica Neue", sans-serif';
const FONT_DISPLAY = 'Cinzel, "Trajan Pro", "Times New Roman", Georgia, serif';
const FONT_BRUSH = '"Ma Shan Zheng", "STKaiti", "KaiTi", "Kaiti SC", serif';
const MEASURE = makeCanvas(4, 4).getContext('2d');

function fontSpec(scale, opts) {
  const s = 8.4 * (scale || 1);
  if (opts && opts.display) return (opts.weight || 700) + ' ' + s + 'px ' + FONT_DISPLAY;
  if (opts && opts.brush) return s + 'px ' + FONT_BRUSH;
  return (opts && opts.weight || 600) + ' ' + s + 'px ' + FONT_UI;
}

function textWidth(str, scale, opts) {
  MEASURE.font = fontSpec(scale, opts);
  return MEASURE.measureText(opts && opts.raw ? String(str) : String(str).toUpperCase()).width;
}

/** Draw text with its top at y. opts: { scale, align, shadow, display, brush, weight, raw, stroke } */
function drawText(g, str, x, y, color, opts) {
  str = String(str);
  if (!(opts && opts.raw)) str = str.toUpperCase();
  const s = (opts && opts.scale) || 1;
  g.font = fontSpec(s, opts);
  g.textBaseline = 'top';
  g.textAlign = (opts && opts.align) || 'left';
  if (opts && opts.stroke) { g.lineJoin = 'round'; g.lineWidth = opts.strokeW || 1.6 * s; g.strokeStyle = opts.stroke; g.strokeText(str, x, y); }
  const shadow = opts && opts.shadow;
  if (shadow) { g.fillStyle = shadow; g.fillText(str, x + 0.5 * s, y + 0.6 * s); }
  g.fillStyle = color;
  g.fillText(str, x, y);
  const w = g.measureText(str).width;
  g.textAlign = 'left';
  return w;
}

/** Ask the browser for the web fonts early; text uses fallbacks until they arrive. */
function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const want = ['600 12px "Barlow Condensed"', '700 12px "Barlow Condensed"', '700 12px Cinzel', '900 12px Cinzel'];
  for (const f of want) document.fonts.load(f).catch(() => {});
  document.fonts.load('12px "Ma Shan Zheng"', '龍塔').catch(() => {});
}
