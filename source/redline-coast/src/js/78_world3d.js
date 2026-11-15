/* ==========================================================================
   The 3D world. The race itself is simulated along the road (distance and
   lane position); this module turns that into a real scene: a road ribbon
   with true bends and hills, lit low-poly cars, scenery, tunnels, a sky dome,
   fog and a chase camera. If WebGL is not available the game falls back to
   the flat renderer in 80_render.js.
   ========================================================================== */

const W3 = { slow: 0, fast: 0, cap: 2, last: 0, off: false, ok: false, tried: false, r: null, scene: null, cam: null, T: null, cars: new Map(), items: [], rival: { x: 0, y: 0, on: false }, car: { x: W / 2, y: 180 }, pr: 1 };
const TURN_K = 0.5;                // how sharply a curve value bends the 3D road
const HILL_K = 0.32;               // how tall a hill value stands in 3D

function w3Init() {
  if (W3.tried) return W3.ok;
  W3.tried = true;
  try {
    if (typeof THREE === 'undefined') return false;
    const r = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
    r.outputEncoding = THREE.sRGBEncoding;
    W3.r = r;
    W3.cam = new THREE.PerspectiveCamera(60, 16 / 9, 60, 90000);
    W3.ok = true;
  } catch (e) { W3.ok = false; }
  return W3.ok;
}

/** Keep the WebGL canvas exactly under the picture area of the 2D canvas. */
function w3Layout(dpr) {
  if (!W3.ok) return;
  const cssW = (W * view.scale) / dpr, cssH = (H * view.zoom * view.scale) / dpr;
  const cv = $('gl');
  cv.style.left = view.ox / dpr + 'px'; cv.style.top = view.oy / dpr + 'px';
  W3.pr = Math.min(dpr, 2) * QUALITY.res[QUALITY.level] / Math.max(0.5, QUALITY.res[QUALITY.level]);
  W3.r.setPixelRatio(Math.min(dpr, W3.cap));
  W3.r.setSize(Math.max(2, Math.round(cssW)), Math.max(2, Math.round(cssH)), true);
  W3.cam.aspect = cssW / cssH; W3.cam.updateProjectionMatrix();
}

/* ---- the road as a path through space ------------------------------------------------ */
function buildPath(T) {
  const n = T.n, px = new Float32Array(n + 1), py = new Float32Array(n + 1), pz = new Float32Array(n + 1), ph = new Float32Array(n + 1);
  let x = 0, z = 0, h = 0;
  for (let i = 0; i <= n; i++) {
    const s = T.segs[Math.min(i, n - 1)];
    px[i] = x; pz[i] = z; ph[i] = h; py[i] = (i < n ? s.y1 : s.y2) * HILL_K;
    x += Math.sin(h) * SEG; z += Math.cos(h) * SEG;
    h -= (s.curve * TURN_K) / SEG * (SEG / 200) * 1;
  }
  T.path = { px, py, pz, ph };
}
/** World position of a point z along the road and off (in half road widths) to the side. Returns the heading there. */
function pathAt(T, z, off, out, lift) {
  const P = T.path, f = clamp(z / SEG, 0, T.n - 0.001), i = Math.floor(f), t = f - i;
  const h = P.ph[i] + (P.ph[i + 1] - P.ph[i]) * t, d = off * ROAD_W;
  out.set(P.px[i] + (P.px[i + 1] - P.px[i]) * t - Math.cos(h) * d, P.py[i] + (P.py[i + 1] - P.py[i]) * t + (lift || 0), P.pz[i] + (P.pz[i + 1] - P.pz[i]) * t + Math.sin(h) * d);
  return h;
}

/* ---- small mesh builders ----------------------------------------------------------------- */
function Soup() { this.p = []; this.c = []; this.u = []; }
Soup.prototype.tri = function (a, b, c, col, ua, ub, uc) {
  this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  if (col) for (let i = 0; i < 3; i++) this.c.push(col[0], col[1], col[2]);
  if (ua) this.u.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
};
Soup.prototype.quad = function (a, b, c, d, col, uv) {
  this.tri(a, b, c, col, uv && uv[0], uv && uv[1], uv && uv[2]); this.tri(a, c, d, col, uv && uv[0], uv && uv[2], uv && uv[3]);
};
/** A box that can taper toward the top (tx, tz scale the top face). Centre of the base at (x, y, z). */
Soup.prototype.box = function (x, y, z, w, h, l, col, tx, tz, zs) {
  const a = w / 2, b = l / 2, ta = a * (tx === undefined ? 1 : tx), tb = b * (tz === undefined ? 1 : tz), s = zs || 0;
  const v = [[x - a, y, z - b], [x + a, y, z - b], [x + a, y, z + b], [x - a, y, z + b], [x - ta, y + h, z - tb + s], [x + ta, y + h, z - tb + s], [x + ta, y + h, z + tb + s], [x - ta, y + h, z + tb + s]];
  const c = hexRgb(col).map((n) => n / 255), dk = c.map((n) => n * 0.78);
  this.quad(v[4], v[7], v[6], v[5], c); this.quad(v[1], v[0], v[4], v[5], c); this.quad(v[3], v[2], v[6], v[7], c);
  this.quad(v[0], v[3], v[7], v[4], dk); this.quad(v[2], v[1], v[5], v[6], dk); this.quad(v[0], v[1], v[2], v[3], dk);
};
Soup.prototype.geom = function () {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
  if (this.c.length) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
  if (this.u.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
  g.computeVertexNormals();
  return g;
};
const lin = (hex) => { const c = new THREE.Color(hex); c.convertSRGBToLinear(); return [c.r, c.g, c.b]; };

const TEX = {};
function texOf(canvas, key) {
  let t = TEX[key];
  if (t && t.image === canvas) return t;
  t = new THREE.CanvasTexture(canvas); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  TEX[key] = t;
  return t;
}

/* ---- cars ------------------------------------------------------------------------------------ */
const CAR_GEO = {};
function carGeom(style, col, stripe) {
  const key = style + col + (stripe || '');
  if (CAR_GEO[key]) return CAR_GEO[key];
  const s = new Soup(), dark = shade(col, -0.5), glass = '#16263c', tyre = '#15161c', red = '#ff2a22';
  const Wd = style === 'truck' ? 600 : 520, L = style === 'truck' ? 1700 : style === 'van' ? 1200 : 1150;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { s.box(sx * (Wd / 2 - 40), 0, sz * L * 0.31, 110, 170, 250, tyre); s.box(sx * (Wd / 2 - 20), 45, sz * L * 0.31, 30, 80, 120, '#8a909c'); }
  if (style === 'truck') {
    s.box(0, 60, 80, Wd, 120, L, '#2a2c36'); s.box(0, 180, -120, Wd, 620, L * 0.72, col); s.box(0, 180, L * 0.38, Wd * 0.94, 420, L * 0.2, shade(col, -0.25)); s.box(0, 420, L * 0.38 + 10, Wd * 0.8, 150, L * 0.2, glass);
    for (const sx of [-1, 1]) s.box(sx * 200, 200, -L * 0.36 - 125, 110, 50, 16, red);
  } else if (style === 'van') {
    s.box(0, 70, 0, Wd, 150, L, col); s.box(0, 220, -40, Wd * 0.96, 300, L * 0.86, col, 0.92, 0.94); s.box(0, 300, -L * 0.43 + 2, Wd * 0.8, 170, 14, glass); s.box(0, 300, L * 0.36, Wd * 0.82, 170, 60, glass);
    for (const sx of [-1, 1]) { s.box(sx * 215, 190, -L / 2 - 4, 70, 110, 14, red); s.box(sx * (Wd / 2 - 4), 300, 40, 12, 150, L * 0.5, glass); }
  } else {
    const low = style === 'gt' || style === 'coupe', bh = low ? 135 : 160, ch = low ? 120 : 140, cl = low ? 500 : 560, cz = low ? -70 : -30;
    s.box(0, 65, 0, Wd, bh, L, col, 0.96, 0.97);                                   // body
    s.box(0, 65 + bh, cz, Wd * 0.82, ch, cl, col, 0.78, 0.62);                     // cabin
    s.box(0, 65 + bh + 8, cz - cl * 0.19, Wd * 0.7, ch - 22, cl * 0.5, glass, 0.82, 0.5, -30);   // rear glass
    s.box(0, 65 + bh + 8, cz + cl * 0.2, Wd * 0.7, ch - 22, cl * 0.5, glass, 0.82, 0.5, 30);     // windscreen
    for (const sx of [-1, 1]) s.box(sx * Wd * 0.345, 65 + bh + 14, cz, 16, ch - 40, cl * 0.6, glass, 1, 0.7);
    s.box(0, 40, -L / 2 + 8, Wd * 0.98, 70, 40, dark); s.box(0, 40, L / 2 - 8, Wd * 0.98, 70, 40, dark);   // bumpers
    for (const sx of [-1, 1]) { s.box(sx * Wd * 0.33, 130, -L / 2 - 6, 130, 50, 16, red); s.box(sx * Wd * 0.34, 120, L / 2 + 4, 110, 40, 12, '#fff6d0'); }
    s.box(0, 96, -L / 2 - 6, 150, 44, 10, '#f2efe0');                              // plate
    if (stripe) for (const sx of [-1, 1]) { s.box(sx * 46, 65 + bh + 1, L * 0.3, 50, 6, L * 0.38, stripe); s.box(sx * 46, 65 + bh + ch + 1, cz, 40, 6, cl * 0.56, stripe); s.box(sx * 46, 65 + bh + 1, -L * 0.36, 50, 6, L * 0.24, stripe); }
    if (style === 'gt' || style === 'coupe' || style === 'rally') { const wy = style === 'rally' ? 65 + bh + ch - 6 : 65 + bh + 44; for (const sx of [-1, 1]) s.box(sx * 180, 65 + bh, -L / 2 + 70, 22, wy - 65 - bh, 30, dark); s.box(0, wy, -L / 2 + 60, Wd * 0.96, 16, 110, dark); }
    if (style === 'muscle') s.box(0, 65 + bh, L * 0.22, 150, 36, 260, dark, 0.8, 0.8);
  }
  // colours were given as sRGB; the renderer works in linear light
  const g = s.geom(), c = g.getAttribute('color');
  for (let i = 0; i < c.count; i++) { c.setXYZ(i, Math.pow(c.getX(i), 2.2), Math.pow(c.getY(i), 2.2), Math.pow(c.getZ(i), 2.2)); }
  CAR_GEO[key] = g;
  return g;
}
let CAR_MAT = null, SHADOW_MAT = null, SHADOW_GEO = null;
function carMesh(style, col, stripe) {
  if (!CAR_MAT) {
    CAR_MAT = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 60, specular: 0x444444, side: THREE.DoubleSide });
    SHADOW_MAT = new THREE.MeshBasicMaterial({ map: texOf(shadowSprite(), 'shadow'), transparent: true, depthWrite: false, opacity: 0.55, fog: false });
    SHADOW_GEO = new THREE.PlaneGeometry(1, 1); SHADOW_GEO.rotateX(-Math.PI / 2);
  }
  const grp = new THREE.Group(), body = new THREE.Mesh(carGeom(style, col, stripe), CAR_MAT), sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  sh.scale.set(style === 'truck' ? 900 : 760, 1, style === 'truck' ? 2100 : 1500); sh.position.y = 8; sh.renderOrder = 1;
  grp.add(body); grp.add(sh); grp.body = body; grp.shadow = sh; grp.rotation.order = 'YXZ';
  return grp;
}

/* ---- building a stage ------------------------------------------------------------------------- */
function w3Build(T) {
  if (!W3.ok) return;
  if (W3.scene) w3Dispose();
  buildPath(T);
  const th = T.th, P = T.path, sc = new THREE.Scene(), n = T.n;
  W3.scene = sc; W3.T = T; W3.cars = new Map(); W3.items = [];
  sc.fog = new THREE.Fog(new THREE.Color(th.fog).convertSRGBToLinear(), th.night ? 9000 : 14000, th.night ? 36000 : 46000);
  sc.add(new THREE.AmbientLight(th.night ? 0x8a8ac8 : 0xffffff, th.night ? 0.75 : 0.72));
  const sun = new THREE.DirectionalLight(th.night ? 0xbfd0ff : th.id === 'coast' ? 0xffc890 : 0xfff4e0, th.night ? 0.55 : 0.95);
  sun.position.set(-0.5, 0.8, 0.4); sc.add(sun);

  const edge = (i, off, lift) => { const h = P.ph[i], d = off * ROAD_W; return [P.px[i] - Math.cos(h) * d, P.py[i] + (lift || 0), P.pz[i] + Math.sin(h) * d]; };
  // road surface, textured with lane paint
  const road = new Soup();
  for (let i = 0; i < n; i++) {
    const v0 = (i % 6) / 6, v1 = v0 + 1 / 6, tu = T.segs[i].tun ? 0.5 : 0;
    road.quad(edge(i, -1), edge(i, 1), edge(i + 1, 1), edge(i + 1, -1), null, [[tu, v0], [tu + 0.5, v0], [tu + 0.5, v1], [tu, v1]]);
  }
  const rt = texOf(roadTexture(th), 'road' + th.id); rt.wrapT = THREE.RepeatWrapping; rt.anisotropy = W3.r.capabilities.getMaxAnisotropy();
  sc.add(new THREE.Mesh(road.geom(), new THREE.MeshBasicMaterial({ map: rt, side: THREE.DoubleSide })));
  // start, checkpoint and goal lines
  const paint = new Soup();
  for (const [i, a, b] of [[T.start, '#ffffff', '#16161c'], [T.goal, '#ffffff', '#16161c'], [T.check, '#ffb020', '#ffb020']])
    for (let k = 0; k < 12; k++) for (let r = 0; r < 2; r++) paint.quad(edge(i + r, -1 + k / 6, 6), edge(i + r, -1 + (k + 1) / 6, 6), edge(i + r + 1, -1 + (k + 1) / 6, 6), edge(i + r + 1, -1 + k / 6, 6), lin((k + r) % 2 ? a : b));
  // kerbs and the land either side, striped so speed reads on the ground too
  const land = new Soup();
  for (let i = 0; i < n; i++) {
    const s = T.segs[i], c = s.c;
    if (s.tun) { land.quad(edge(i, -1.3), edge(i, -1), edge(i + 1, -1), edge(i + 1, -1.3), lin('#1a1822')); land.quad(edge(i, 1), edge(i, 1.3), edge(i + 1, 1.3), edge(i + 1, 1), lin('#1a1822')); continue; }
    const snow = i > T.snowFrom && th.gl2, gl = snow ? th.gl2 : th.gl, gr = snow ? th.gl2 : th.gr;
    land.quad(edge(i, -1.11, 5), edge(i, -1, 5), edge(i + 1, -1, 5), edge(i + 1, -1.11, 5), lin(th.rumble[c]));
    land.quad(edge(i, 1, 5), edge(i, 1.11, 5), edge(i + 1, 1.11, 5), edge(i + 1, 1, 5), lin(th.rumble[c]));
    land.quad(edge(i, 1.11), edge(i, 30, -400), edge(i + 1, 30, -400), edge(i + 1, 1.11), lin(gr[c]));
    if (th.left === 'sea') {
      land.quad(edge(i, -1.7, -30), edge(i, -1.11), edge(i + 1, -1.11), edge(i + 1, -1.7, -30), lin(c ? th.sand : th.sand2));
      land.quad(edge(i, -30, -160), edge(i, -1.7, -60), edge(i + 1, -1.7, -60), edge(i + 1, -30, -160), lin(gl[c]));
    } else land.quad(edge(i, -30, -400), edge(i, -1.11), edge(i + 1, -1.11), edge(i + 1, -30, -400), lin(gl[c]));
  }
  const vcMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  sc.add(new THREE.Mesh(land.geom(), vcMat)); sc.add(new THREE.Mesh(paint.geom(), vcMat));

  // tunnels: walls, roof, light strips and a coloured band, plus the hillside at each mouth
  const tun = new Soup(), HT = 1750, band = th.id === 'neon' ? '#ff3d8a' : th.id === 'aurora' ? '#5af0c0' : '#ffb020';
  const rock = th.id === 'mesa' ? '#a84a2c' : th.id === 'pine' ? '#3a5a48' : th.id === 'aurora' ? '#c8d8ea' : '#221c3a';
  for (let i = 0; i < n; i++) {
    const s = T.segs[i]; if (!s.tun) continue;
    const wall = lin(s.c ? '#3a3644' : '#444050'), roof = lin(s.c ? '#1c1a26' : '#22202c');
    for (const sx of [-1.3, 1.3]) {
      tun.quad(edge(i, sx), edge(i + 1, sx), edge(i + 1, sx, HT), edge(i, sx, HT), wall);
      if (s.c) tun.quad(edge(i, sx * 0.995, HT * 0.36), edge(i + 1, sx * 0.995, HT * 0.36), edge(i + 1, sx * 0.995, HT * 0.46), edge(i, sx * 0.995, HT * 0.46), lin(band));
    }
    tun.quad(edge(i, -1.3, HT), edge(i + 1, -1.3, HT), edge(i + 1, 1.3, HT), edge(i, 1.3, HT), roof);
    if (i % 8 < 2) tun.quad(edge(i, -0.3, HT - 8), edge(i + 1, -0.3, HT - 8), edge(i + 1, 0.3, HT - 8), edge(i, 0.3, HT - 8), [1, 0.93, 0.7]);
    const first = !T.segs[i - 1].tun, last = !T.segs[i + 1] || !T.segs[i + 1].tun;
    if (first || last) {
      const j = first ? i : i + 1, c = lin(rock), c2 = lin(shade(rock, -0.25));
      for (const sx of [-1, 1]) tun.quad(edge(j, sx * 1.3), edge(j, sx * 6, -300), edge(j, sx * 4.4, HT * 1.5), edge(j, sx * 1.3, HT), c);
      tun.quad(edge(j, -1.3, HT), edge(j, 1.3, HT), edge(j, 4.4, HT * 1.5), edge(j, -4.4, HT * 1.5), c);
      tun.quad(edge(j, -4.4, HT * 1.5), edge(j, 4.4, HT * 1.5), edge(j, 2, HT * 2.3), edge(j, -2, HT * 2.3), c2);
      for (const sx of [-1, 1]) tun.quad(edge(j, sx * 1.3, HT), edge(j, sx * 1.42, HT), edge(j, sx * 1.42), edge(j, sx * 1.3), lin('#d8d2c8'));
    }
  }
  if (tun.p.length) sc.add(new THREE.Mesh(tun.geom(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  // scenery: upright cards facing down the road, batched by picture; things that can vanish get their own mesh
  const batches = {}, v = new THREE.Vector3();
  const card = (soup, i, off, w, hgt, flip, lift) => {
    const a = edge(i, off - w / 2 / ROAD_W, lift || 0), b = edge(i, off + w / 2 / ROAD_W, lift || 0);
    const u0 = flip ? 1 : 0, u1 = flip ? 0 : 1;
    soup.quad(a, b, [b[0], b[1] + hgt, b[2]], [a[0], a[1] + hgt, a[2]], null, [[u0, 0], [u1, 0], [u1, 1], [u0, 1]]);
  };
  for (let i = 0; i < n; i++) {
    for (const s of T.segs[i].sprites) {
      const c = spriteCanvas(s.name), hgt = s.ww * (c.uh / c.uw);
      if (s.pick || s.hit === 'cone' || s.name === 'barrier') {
        const m = new THREE.Mesh(CARD_GEO || (CARD_GEO = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0)), cardMat(c, s.name));
        const h = pathAt(T, i * SEG, s.off, v, s.high ? s.ww * 1.3 : s.pick ? s.ww * 0.25 : 0);
        m.position.copy(v); m.scale.set(s.ww, hgt, 1); m.rotation.y = h + Math.PI; m.visible = false; m.userData = { s, i, h, y: v.y };
        sc.add(m); W3.items.push(m);
        continue;
      }
      if (s.flat) {
        const b = batches['flat|' + s.name] || (batches['flat|' + s.name] = { soup: new Soup(), c });
        const w = s.ww / ROAD_W / 2, a = edge(i, s.off - w, 10), bb = edge(i, s.off + w, 10), cc = edge(Math.min(n, i + 4), s.off + w, 10), d = edge(Math.min(n, i + 4), s.off - w, 10);
        b.soup.quad(a, bb, cc, d, null, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        continue;
      }
      const b = batches[s.name] || (batches[s.name] = { soup: new Soup(), c });
      card(b.soup, i, s.off, s.ww, hgt, s.flip, 0);
    }
  }
  for (const k in batches) {
    const b = batches[k], flat = k.startsWith('flat|');
    const mat = new THREE.MeshBasicMaterial({ map: texOf(b.c, 'art|' + k), alphaTest: flat ? 0.08 : 0.5, transparent: flat, side: THREE.DoubleSide, depthWrite: !flat });
    const m = new THREE.Mesh(b.soup.geom(), mat); if (flat) m.renderOrder = 1;
    sc.add(m);
  }

  // sky: a dome that travels with the camera, the sun or moon, and two rings of far scenery
  const dome = new THREE.Mesh(new THREE.SphereGeometry(80000, 32, 16), new THREE.MeshBasicMaterial({ map: texOf(skyTexture(th), 'sky' + th.id), side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10; sc.add(dome); W3.dome = dome;
  W3.rings = [];
  for (const [layer, rad, hgt, y0] of [[0, 70000, 9800, -700], [1, 62000, 7200, -700]]) {
    const hc = horizonArt(th, layer), tx = texOf(hc, 'hz' + th.id + layer); tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(5, 1);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, hgt, 48, 1, true), new THREE.MeshBasicMaterial({ map: tx, side: THREE.BackSide, transparent: true, alphaTest: 0.3, fog: false, depthWrite: false }));
    cyl.renderOrder = -9 + layer; cyl.userData.y0 = y0 + hgt / 2; sc.add(cyl); W3.rings.push(cyl);
  }
  const lamp = th.sun || th.moon;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(sunTexture(th), 'sun' + th.id), fog: false, depthWrite: false, depthTest: false }));
  sp.scale.set(th.sun ? 30000 : 13000, th.sun ? 30000 : 13000, 1); sp.renderOrder = -9.5; sc.add(sp); W3.sun = sp;
  W3.sunDir = new THREE.Vector3(Math.sin((lamp[0] - 0.5) * 1.6), th.sun ? (th.id === 'coast' ? 0.06 : 0.42) : 0.36, Math.cos((lamp[0] - 0.5) * 1.6)).normalize();
  // the ground far below, so the world never ends in a hole
  const base = new THREE.Mesh(new THREE.PlaneGeometry(400000, 400000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(th.left === 'sea' ? th.gl[0] : th.gr[0]).convertSRGBToLinear() }));
  sc.add(base); W3.base = base;

  // the player's car, flames and brake lights
  const p = game.p, me = carMesh(p.car.style, p.car.col, p.car.stripe);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x2a9cff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  me.flames = [-1, 1].map((sx) => { const f = new THREE.Mesh(new THREE.ConeGeometry(34, 300, 8).rotateX(-Math.PI / 2).translate(sx * 110, 85, -730), flameMat); f.visible = false; me.add(f); return f; });
  me.brake = new THREE.Mesh(new THREE.BoxGeometry(470, 46, 12).translate(0, 155, -590), new THREE.MeshBasicMaterial({ color: 0xff3020, fog: false }));
  me.brake.visible = false; me.add(me.brake);
  if (th.night) {
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), beamMat);
    const sh = new THREE.Shape(); sh.moveTo(-260, 0); sh.lineTo(260, 0); sh.lineTo(1500, 5200); sh.lineTo(-1500, 5200); sh.closePath();
    beam.geometry = new THREE.ShapeGeometry(sh).rotateX(Math.PI / 2).translate(0, 22, 600); me.add(beam);
  }
  sc.add(me); W3.me = me;
}
let CARD_GEO = null;
const CARD_MATS = {};
function cardMat(c, name) { return CARD_MATS[name] || (CARD_MATS[name] = new THREE.MeshBasicMaterial({ map: texOf(c, 'art|' + name), alphaTest: 0.5, side: THREE.DoubleSide })); }

function w3Dispose() {
  const sc = W3.scene;
  if (!sc) return;
  sc.traverse((o) => { if (o.geometry && o.geometry !== SHADOW_GEO && o.geometry !== CARD_GEO && !Object.values(CAR_GEO).includes(o.geometry)) o.geometry.dispose(); });
  W3.scene = null; W3.T = null; W3.me = null;
}

/* ---- textures drawn in code -------------------------------------------------------------------- */
function roadTexture(th) {
  const c = makeCanvas(1024, 512), g = c.getContext('2d'), rnd = seeded(th.seed);
  for (let half = 0; half < 2; half++) {
    const x0 = half * 512, cols = half ? TUN.road : th.road;
    g.fillStyle = cols[0]; g.fillRect(x0, 0, 512, 256); g.fillStyle = cols[1]; g.fillRect(x0, 256, 512, 256);
    for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; g.fillRect(x0 + rnd() * 512, rnd() * 512, 2 + rnd() * 3, 1 + rnd() * 2); }
    // worn tyre lines down each lane
    g.fillStyle = 'rgba(0,0,0,0.1)'; for (const u of [0.11, 0.24, 0.44, 0.57, 0.76, 0.89]) g.fillRect(x0 + u * 512 - 9, 0, 18, 512);
    g.fillStyle = th.lane; g.fillRect(x0 + 10, 0, 10, 512); g.fillRect(x0 + 492, 0, 10, 512);
    for (const u of [1 / 3, 2 / 3]) g.fillRect(x0 + u * 512 - 5, 0, 10, 256);
    if (half) { g.fillStyle = 'rgba(255,240,200,0.16)'; g.fillRect(x0, 0, 512, 170); }
    else if (th.id === 'neon') { g.fillStyle = 'rgba(160,140,255,0.13)'; g.fillRect(x0, 300, 512, 120); }
  }
  return c;
}
function skyTexture(th) {
  const c = makeCanvas(1024, 512), g = c.getContext('2d'), s = th.sky, rnd = seeded(th.seed + 3);
  // the dome's texture runs from the zenith (top) down past the horizon (middle)
  const gr = g.createLinearGradient(0, 0, 0, 280);
  gr.addColorStop(0, s[0]); gr.addColorStop(0.5, s[0]); gr.addColorStop(0.74, s[1]); gr.addColorStop(0.92, s[2]); gr.addColorStop(1, s[3]);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512); g.fillStyle = s[3]; g.fillRect(0, 280, 1024, 232);
  if (th.stars) for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.7) + ')'; const r = rnd() < 0.1 ? 1.6 : 1; g.fillRect(rnd() * 1024, rnd() * 230, r, r); }
  if (th.aurora) for (let k = 0; k < 4; k++) {
    const y0 = 120 + k * 28; g.beginPath(); g.moveTo(0, y0);
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.0123 * (k + 1) + k) * 18 + Math.sin(x * 0.049) * 6);
    for (let x = 1024; x >= 0; x -= 16) g.lineTo(x, y0 + 46 + Math.sin(x * 0.0184 + k) * 14);
    g.closePath(); const ag = g.createLinearGradient(0, y0 - 20, 0, y0 + 60);
    ag.addColorStop(0, 'rgba(90,240,192,0)'); ag.addColorStop(0.45, k % 2 ? 'rgba(130,160,255,0.42)' : 'rgba(90,240,192,0.5)'); ag.addColorStop(1, 'rgba(90,240,192,0)'); g.fillStyle = ag; g.fill();
  }
  // clouds in bands, larger and softer toward the horizon
  for (let i = 0; i < 46; i++) {
    const y = 150 + rnd() * 110, x = rnd() * 1024, sc = 0.5 + (y - 150) / 110 * 1.1;
    for (const dx of [-1024, 0, 1024]) for (let k = 0; k < 6; k++) {
      g.fillStyle = k < 3 ? th.cloud[1] : th.cloud[0]; g.globalAlpha = th.night ? 0.5 : 0.85;
      g.beginPath(); g.ellipse(x + dx + (k - 2.5) * 13 * sc, y + (k % 2) * 3 * sc + (k < 3 ? 3 : 0), 17 * sc, (3.4 + (k % 3)) * sc, 0, 0, TAU); g.fill();
    }
  }
  g.globalAlpha = 1;
  return c;
}
function sunTexture(th) {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  const glow = g.createRadialGradient(128, 128, 10, 128, 128, 128), col = th.sun ? th.sun[4] : '#bfd8ff';
  glow.addColorStop(0, rgba(col, 0.9)); glow.addColorStop(0.35, rgba(col, 0.35)); glow.addColorStop(1, rgba(col, 0)); g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
  g.save(); g.beginPath(); g.arc(128, 128, th.sun ? 46 : 40, 0, TAU); g.clip();
  const d = g.createLinearGradient(0, 82, 0, 174); d.addColorStop(0, th.sun ? th.sun[3] : '#ffffff'); d.addColorStop(1, th.sun ? th.sun[4] : '#d8e2f8'); g.fillStyle = d; g.fillRect(60, 60, 140, 140);
  if (th.id === 'coast') { g.fillStyle = th.sky[2]; for (let i = 0; i < 5; i++) g.fillRect(60, 134 + i * 9, 140, 2 + i * 1.2); }
  if (th.moon) { g.fillStyle = 'rgba(160,176,214,0.6)'; g.beginPath(); g.arc(116, 120, 8, 0, TAU); g.arc(140, 140, 6, 0, TAU); g.arc(132, 110, 4, 0, TAU); g.fill(); }
  g.restore();
  return c;
}

/* ---- every frame ------------------------------------------------------------------------------- */
const _v = typeof THREE !== 'undefined' ? [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] : [];
function w3Car(obj, style, col, stripe) {
  let m = W3.cars.get(obj);
  if (!m) { m = carMesh(style, col, stripe); if (obj.cop) { m.bar = [0xff2020, 0x2060ff].map((cc, k) => { const b = new THREE.Mesh(new THREE.BoxGeometry(150, 50, 70).translate((k ? 1 : -1) * 90, 450, -40), new THREE.MeshBasicMaterial({ color: cc, fog: false })); m.add(b); return b; }); } W3.scene.add(m); W3.cars.set(obj, m); }
  return m;
}
function w3Watch() {
  const now = performance.now(), dt = W3.last ? now - W3.last : 16;
  W3.last = now;
  if (game.state !== 'play' || dt > 250) return;
  if (dt > 40) W3.slow++; else if (dt < 22) W3.slow = Math.max(0, W3.slow - 1);
  if (W3.slow > 90) {
    W3.slow = 0;
    if (W3.cap > 1) { W3.cap = 1; layout(); }
    else { W3.off = true; game.toast = { s: 'SIMPLE GRAPHICS FOR SPEED', t: 0 }; }
  }
}
function w3Render() {
  const gm = game, T = gm.T, p = gm.p;
  if (!W3.ok || W3.off || !T || !p) return false;
  w3Watch();
  if (W3.T !== T) w3Build(T);
  const cam = W3.cam, tall = view.zoom > 1.15, pz = gm.pos + PLAYER_Z, sp = p.speed / MAX_SPEED;
  const [a, b, c, d] = _v;
  // the player's car
  const air = p.air > 0 ? Math.sin(Math.PI * (1 - p.air / p.airT)) : 0;
  const h = pathAt(T, pz, p.x, a, air * 520);
  const me = W3.me;
  const slope = (roadY(T, pz + 300) - roadY(T, pz - 300)) * HILL_K / 600;
  const spin = p.spin > 0 ? Math.sin(p.spin * 14) * 0.6 : 0;
  me.position.copy(a);
  me.rotation.set(-Math.atan(slope) - air * 0.12, h - p.steer * 0.16 * Math.min(1, sp * 2) - (p.drift ? p.driftDir * 0.38 : 0) + spin, p.steer * 0.05 * Math.min(1, sp * 2) + (p.off ? Math.sin(gm.t * 50) * 0.02 * Math.min(1, sp * 3) : 0));
  me.body.position.y = Math.sin(gm.t * 34) * 4 * sp;
  me.shadow.position.y = 8 - air * 520; me.shadow.material.opacity = 0.55;
  me.visible = !(p.safe > 0 && p.crashT <= 0 && Math.floor(gm.t * 20) % 2);
  const fl = p.nitroOn || p.boostT > 0;
  for (const f of me.flames) { f.visible = fl; if (fl) f.scale.set(1, 1, (p.nitroOn ? 1 : 0.6) * (0.8 + Math.random() * 0.5)); }
  me.brake.visible = p.brake && sp > 0.02;
  // everyone else on the road
  const seen = new Set();
  const place = (o, style, col, stripe) => {
    const dz = o.z - pz;
    if (dz < -3500 || dz > 44000) return;
    const m = w3Car(o, style, col, stripe), hh = pathAt(T, o.z, o.off, b, 0);
    m.position.copy(b); m.rotation.set(0, hh - (o.lean || 0) * 0.06, 0); m.visible = true; seen.add(o);
    if (m.bar) { const k = Math.floor(gm.t * 8) % 2; m.bar[0].visible = !!k; m.bar[1].visible = !k; }
  };
  for (const o of T.cars) place(o, o.style, o.col, null);
  for (const o of gm.racers) place(o, o.style, o.col, o.lead ? '#ffffff' : '#14161c');
  if (gm.cop) place(gm.cop, 'sedan', '#f2f4f8', '#16181e');
  for (const [o, m] of W3.cars) if (!seen.has(o)) m.visible = false;
  // pick-ups and loose things near us; coins and cans turn on the spot
  const iNow = Math.floor(pz / SEG);
  for (const m of W3.items) {
    const u = m.userData, di = u.i - iNow;
    m.visible = !u.s.gone && di > -12 && di < 210;
    if (m.visible && u.s.pick) { m.rotation.y = u.h + Math.PI + (u.s.pick === 'coin' ? gm.t * 4 + u.i : Math.sin(gm.t * 2 + u.i) * 0.5); m.position.y = u.y + Math.sin(gm.t * 5 + u.i) * 30; }
  }
  // chase camera: behind and above, looking down the road; it leans into bends and widens on nitro
  gm.fov = approach(gm.fov || 0, p.nitroOn ? 1 : p.boostT > 0 ? 0.5 : 0, 0.05);
  const back = (tall ? 2300 : 2700) - gm.fov * 300 + sp * 250, up = tall ? 1250 : 1050;
  pathAt(T, pz - back, p.x * 0.8, c, up);
  pathAt(T, pz + (tall ? 3400 : 4200), p.x * 0.62, d, tall ? 100 : 260);
  if (settings.shake && gm.state !== 'pause') { const k = Math.max(gm.shake > 0.3 ? gm.shake * 9 : 0, sp > 0.97 ? (sp - 0.97) * 90 : 0); c.x += rand(-1, 1) * k; c.y += rand(-1, 1) * k * 0.7; }
  cam.position.copy(c); cam.up.set(0, 1, 0); cam.lookAt(d);
  if (settings.shake) cam.rotateZ(p.steer * 0.035 * Math.min(1, sp * 1.4) + (p.drift ? p.driftDir * 0.03 : 0));
  const fov = (tall ? 70 : 58) + gm.fov * 9 + (settings.shake ? gm.punch * 60 : 0);
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  // sky follows the camera
  W3.dome.position.copy(c); W3.base.position.set(c.x, a.y - 900, c.z);
  for (const r of W3.rings) r.position.set(c.x, c.y + r.userData.y0 - up * 0.4, c.z);
  W3.sun.position.copy(c).addScaledVector(W3.sunDir, 60000);
  W3.r.render(W3.scene, cam);
  // where the car and the rival landed on screen, for the 2D layer drawn over the top
  const vh = viewH();
  b.copy(a).project(cam); W3.car.x = (b.x + 1) / 2 * W; W3.car.y = (1 - b.y) / 2 * vh;
  W3.rival.on = false;
  const rv = gm.rival;
  if (rv && rv.z > pz + 800 && rv.z < pz + 30000) { pathAt(T, rv.z, rv.off, b, 620); b.project(cam); if (b.z < 1) { W3.rival.on = true; W3.rival.x = (b.x + 1) / 2 * W; W3.rival.y = (1 - b.y) / 2 * vh; } }
  pathAt(T, pz + 40000, 0, b, 0); b.project(cam); RV.hyS = (1 - b.y) / 2 * vh;
  RV.zf = tall ? 1.9 : 1; RV.carY = W3.car.y; RV.ih = vh / RV.zf;
  return true;
}
