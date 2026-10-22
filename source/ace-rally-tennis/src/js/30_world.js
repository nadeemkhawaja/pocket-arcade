/* ==========================================================================
   World: renderer, sky, stadium, court, net, crowd, ball and effects
   ========================================================================== */

const world = {
  quality: 'high',
  surfaceKey: null,
  t: 0
};

function pickQuality() {
  if (settings.quality === 'high' || settings.quality === 'low') return settings.quality;
  const cores = navigator.hardwareConcurrency || 4;
  if (isMobileUA || cores <= 4) return 'low';
  return 'high';
}

function canvasTex(w, h, draw, opts) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const tex = new T3.CanvasTexture(cv);
  tex.userData.redraw = () => { g.clearRect(0, 0, w, h); draw(g, w, h); tex.needsUpdate = true; };
  tex.encoding = T3.sRGBEncoding;
  if (opts && opts.repeat) { tex.wrapS = tex.wrapT = T3.RepeatWrapping; }
  if (world.renderer) tex.anisotropy = Math.min(8, world.renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  tex.userData.canvas = cv;
  return tex;
}

const matCache = {};
function stdMat(color, rough, extra) {
  const key = color + '|' + (rough || 0.6) + '|' + (extra ? JSON.stringify(extra) : '');
  if (matCache[key]) return matCache[key];
  const m = new T3.MeshStandardMaterial(Object.assign({ color: new T3.Color(color), roughness: rough || 0.6, metalness: 0 }, extra || {}));
  matCache[key] = m;
  return m;
}

/* Many static boxes merged into one vertex-coloured mesh. */
class BoxBatch {
  constructor() { this.p = []; this.n = []; this.c = []; }
  add(cx, cy, cz, sx, sy, sz, color, shadeTop) {
    const col = new T3.Color(color);
    const top = shadeTop ? new T3.Color(shadeTop) : col;
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    const faces = [
      [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0], col],
      [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0], col],
      [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], top],
      [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0], col],
      [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col],
      [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col]
    ];
    for (const [a, b, c, d, nrm, cc] of faces) {
      for (const v of [a, b, c, a, c, d]) {
        this.p.push(v[0], v[1], v[2]);
        this.n.push(nrm[0], nrm[1], nrm[2]);
        this.c.push(cc.r, cc.g, cc.b);
      }
    }
  }
  mesh(mat) {
    const g = new T3.BufferGeometry();
    g.setAttribute('position', new T3.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T3.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new T3.Float32BufferAttribute(this.c, 3));
    return new T3.Mesh(g, mat || new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  }
}

function initRenderer() {
  T3.ColorManagement.legacyMode = false;
  world.quality = pickQuality();
  const canvas = $('gl');
  const r = new T3.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.outputEncoding = T3.sRGBEncoding;
  r.toneMapping = T3.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.08;
  r.shadowMap.enabled = true;
  r.shadowMap.type = T3.PCFSoftShadowMap;
  world.renderer = r;
  world.baseDpr = world.quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : Math.min(window.devicePixelRatio || 1, 1.35);
  world.dpr = world.baseDpr;
  r.setPixelRatio(world.dpr);
  world.scene = new T3.Scene();
  world.scene.fog = new T3.Fog(0xcfe9f8, 140, 520);
  world.camera = new T3.PerspectiveCamera(45, 1, 0.1, 1200);
  world.camera.position.set(0, 6, 20);
  world.camLook = new T3.Vector3(0, 0.5, -3);
  resizeRenderer();
}

function resizeRenderer() {
  const w = window.innerWidth || document.documentElement.clientWidth || 800;
  const h = window.innerHeight || document.documentElement.clientHeight || 600;
  world.w = w; world.h = h;
  world.aspect = w / Math.max(1, h);
  world.renderer.setSize(w, h, false);
  world.camera.aspect = world.aspect;
  world.camera.updateProjectionMatrix();
}

function buildWorld() {
  const S = world.scene;
  /* ---- light ---- */
  const hemi = new T3.HemisphereLight(0xd8ecff, 0x5f7d4f, 0.72);
  S.add(hemi);
  const sun = new T3.DirectionalLight(0xfff1dc, 1.25);
  sun.position.set(-14, 30, 12);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  const sm = world.quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera;
  sc.left = -15; sc.right = 15; sc.top = 24; sc.bottom = -24; sc.near = 5; sc.far = 80;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.025;
  S.add(sun); S.add(sun.target);
  const fill = new T3.DirectionalLight(0xbcd8ff, 0.32);
  fill.position.set(10, 8, 22);
  S.add(fill);
  world.sun = sun;

  buildSky();
  buildGround();
  buildCourtShell();
  buildNet();
  buildStadium();
  buildBall();
  buildFx();
}

function buildSky() {
  const tex = canvasTex(4, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2b84d9');
    gr.addColorStop(0.32, '#58aeea');
    gr.addColorStop(0.47, '#a6d8f6');
    gr.addColorStop(0.5, '#e4f3fb');
    gr.addColorStop(1, '#e4f3fb');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sky = new T3.Mesh(new T3.SphereGeometry(700, 32, 16),
    new T3.MeshBasicMaterial({ map: tex, side: T3.BackSide, depthWrite: false, fog: false, toneMapped: false }));
  sky.renderOrder = -10;
  world.scene.add(sky);
  world.sky = sky;

  const sunTex = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,240,1)');
    gr.addColorStop(0.18, 'rgba(255,250,215,0.95)');
    gr.addColorStop(0.4, 'rgba(255,240,190,0.25)');
    gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const sunSprite = new T3.Sprite(new T3.SpriteMaterial({ map: sunTex, depthWrite: false, fog: false, toneMapped: false, transparent: true }));
  sunSprite.position.set(-260, 380, 220);
  sunSprite.scale.set(160, 160, 1);
  world.scene.add(sunSprite);

  const cloudTex = canvasTex(256, 128, (g, w, h) => {
    const blobs = [[70, 78, 46], [118, 60, 56], [168, 74, 44], [198, 86, 30], [42, 90, 28], [128, 88, 48]];
    for (const [x, y, r] of blobs) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.75)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  });
  const clouds = new T3.Group();
  for (let i = 0; i < 14; i++) {
    const s = new T3.Sprite(new T3.SpriteMaterial({ map: cloudTex, depthWrite: false, fog: false, transparent: true, opacity: rand(0.75, 0.95), toneMapped: false }));
    const a = rand(0, TAU), r = rand(240, 420);
    s.position.set(Math.cos(a) * r, rand(70, 160), Math.sin(a) * r);
    const sz = rand(70, 140);
    s.scale.set(sz, sz * 0.5, 1);
    clouds.add(s);
  }
  world.scene.add(clouds);
  world.clouds = clouds;
}

function buildGround() {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4f9a4a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(30,70,25,0.18)' : 'rgba(150,200,110,0.14)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, { repeat: true });
  tex.repeat.set(60, 60);
  const ground = new T3.Mesh(new T3.PlaneGeometry(1000, 1000), new T3.MeshStandardMaterial({ map: tex, roughness: 1 }));
  ground.rotation.x = -PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = false;
  world.scene.add(ground);
  world.groundTex = tex;
}

/* ---- court ---------------------------------------------------------------- */
function paintCourt(surf) {
  const W = 512, H = 936;
  const mx = W / (COURT.RUN_X * 2), mz = H / (COURT.RUN_Z * 2);
  return canvasTex(W, H, (g) => {
    g.fillStyle = surf.outer; g.fillRect(0, 0, W, H);
    const ix = (COURT.RUN_X - COURT.HWD) * mx, iz = (COURT.RUN_Z - COURT.HL) * mz;
    const iw = COURT.HWD * 2 * mx, ih = COURT.HL * 2 * mz;
    if (surf.key === 'grass') {
      const stripe = 1.55 * mz;
      for (let y = 0, k = 0; y < H; y += stripe, k++) {
        g.fillStyle = k % 2 ? '#56a03a' : '#62ab43';
        g.fillRect(0, y, W, stripe + 1);
      }
      // worn baselines and serve spots
      const wear = (cx, cy, rx, ry, a) => {
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        gr.addColorStop(0, 'rgba(176,150,92,' + a + ')');
        gr.addColorStop(0.55, 'rgba(160,150,90,' + (a * 0.55) + ')');
        gr.addColorStop(1, 'rgba(150,150,90,0)');
        g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy);
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rx, 0, TAU); g.fill(); g.restore();
      };
      const cx = W / 2;
      for (const s of [-1, 1]) {
        const by = H / 2 + s * COURT.HL * mz;
        wear(cx, by + s * 0.6 * mz, 4.2 * mx, 1.6 * mz, 0.55);
        wear(cx - 1.2 * mx, by, 1.3 * mx, 0.9 * mz, 0.5);
        wear(cx + 1.2 * mx, by, 1.3 * mx, 0.9 * mz, 0.5);
        wear(cx, H / 2 + s * 2.6 * mz, 2.4 * mx, 0.9 * mz, 0.12);
      }
    } else if (surf.key === 'clay') {
      g.fillStyle = surf.inner; g.fillRect(ix, iz, iw, ih);
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        g.strokeStyle = Math.random() < 0.5 ? 'rgba(120,45,20,0.12)' : 'rgba(240,170,120,0.12)';
        g.lineWidth = rand(0.6, 1.6);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(8, 26), y + rand(-1.2, 1.2)); g.stroke();
      }
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * W, y = Math.random() * H, r = rand(10, 40);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(150,60,30,0.16)'); gr.addColorStop(1, 'rgba(150,60,30,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
    } else {
      g.fillStyle = surf.inner; g.fillRect(ix, iz, iw, ih);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        g.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2);
      }
      for (const s of [-1, 1]) {
        const by = H / 2 + s * COURT.HL * mz;
        const gr = g.createRadialGradient(W / 2, by, 0, W / 2, by, 3.2 * mx);
        gr.addColorStop(0, 'rgba(255,255,255,0.09)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, by - 3.2 * mz, W, 6.4 * mz);
      }
    }
  });
}

function buildCourtShell() {
  const geo = new T3.PlaneGeometry(COURT.RUN_X * 2, COURT.RUN_Z * 2);
  const mat = new T3.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  const court = new T3.Mesh(geo, mat);
  court.rotation.x = -PI / 2;
  court.receiveShadow = true;
  world.scene.add(court);
  world.court = court;

  // painted lines as real geometry so they stay crisp at any distance
  const rects = [];
  const L = COURT.LINE, B = COURT.BASE, HL = COURT.HL, HWD = COURT.HWD, HWS = COURT.HWS, SV = COURT.SVC;
  rects.push([-HWD, -HL, HWD, -HL + B], [-HWD, HL - B, HWD, HL]);
  rects.push([-HWD, -HL, -HWD + L, HL], [HWD - L, -HL, HWD, HL]);
  rects.push([-HWS, -HL, -HWS + L, HL], [HWS - L, -HL, HWS, HL]);
  rects.push([-HWS, -SV, HWS, -SV + L], [-HWS, SV - L, HWS, SV]);
  rects.push([-L / 2, -SV, L / 2, SV]);
  rects.push([-L / 2, -HL + B, L / 2, -HL + B + 0.12], [-L / 2, HL - B - 0.12, L / 2, HL - B]);
  const pos = [];
  const y = 0.004;
  for (const [x0, z0, x1, z1] of rects) {
    pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
  }
  const lg = new T3.BufferGeometry();
  lg.setAttribute('position', new T3.Float32BufferAttribute(pos, 3));
  lg.computeVertexNormals();
  const lm = new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const lines = new T3.Mesh(lg, lm);
  lines.receiveShadow = true;
  world.scene.add(lines);
  world.lines = lines;
}

function setSurface(key) {
  if (world.surfaceKey === key) return;
  const surf = SURFACES[key];
  world.surfaceKey = key;
  if (world.court.material.map) world.court.material.map.dispose();
  world.court.material.map = paintCourt(surf);
  world.court.material.needsUpdate = true;
  world.lines.material.color.set(surf.line);
  world.markMat.color.setHex(surf.mark);
  world.dustMat.color.setHex(surf.dust);
}

/* ---- net -------------------------------------------------------------------- */
function buildNet() {
  const grp = new T3.Group();
  const meshTex = canvasTex(32, 32, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(20,30,36,0.95)';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
  }, { repeat: true });
  meshTex.encoding = T3.sRGBEncoding;
  const segs = 64, cell = 0.045;
  const p = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const x = -COURT.POST_X + (2 * COURT.POST_X) * (i / segs);
    const top = netTop(x) - 0.05;
    p.push(x, top, 0, x, 0.03, 0);
    uv.push((x + COURT.POST_X) / cell, top / cell, (x + COURT.POST_X) / cell, 0.03 / cell);
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const ng = new T3.BufferGeometry();
  ng.setAttribute('position', new T3.Float32BufferAttribute(p, 3));
  ng.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2));
  ng.setIndex(idx);
  ng.computeVertexNormals();
  const net = new T3.Mesh(ng, new T3.MeshStandardMaterial({ map: meshTex, transparent: true, side: T3.DoubleSide, depthWrite: false, roughness: 0.9, color: 0x26343c }));
  net.renderOrder = 2;
  grp.add(net);

  // tape along the top
  const tp = [], ti = [];
  for (let i = 0; i <= segs; i++) {
    const x = -COURT.POST_X + (2 * COURT.POST_X) * (i / segs);
    const top = netTop(x);
    tp.push(x, top + 0.004, 0, x, top - 0.055, 0);
    if (i < segs) { const a = i * 2; ti.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const tg = new T3.BufferGeometry();
  tg.setAttribute('position', new T3.Float32BufferAttribute(tp, 3));
  tg.setIndex(ti);
  tg.computeVertexNormals();
  const tape = new T3.Mesh(tg, new T3.MeshStandardMaterial({ color: 0xffffff, side: T3.DoubleSide, roughness: 0.6 }));
  tape.castShadow = true;
  grp.add(tape);

  const strap = new T3.Mesh(new T3.PlaneGeometry(0.05, COURT.NET_H), new T3.MeshStandardMaterial({ color: 0xffffff, side: T3.DoubleSide }));
  strap.position.set(0, COURT.NET_H / 2, 0.002);
  grp.add(strap);

  const postMat = stdMat('#1f4a3b', 0.5, { metalness: 0.2 });
  for (const s of [-1, 1]) {
    const post = new T3.Mesh(new T3.CylinderGeometry(0.045, 0.05, COURT.POST_H + 0.08, 14), postMat);
    post.position.set(s * (COURT.POST_X + 0.04), (COURT.POST_H + 0.08) / 2, 0);
    post.castShadow = true;
    grp.add(post);
    const capm = new T3.Mesh(new T3.SphereGeometry(0.055, 12, 8), postMat);
    capm.position.set(s * (COURT.POST_X + 0.04), COURT.POST_H + 0.08, 0);
    grp.add(capm);
  }
  // soft shadow band the net throws on the court
  const shadowNet = new T3.Mesh(new T3.PlaneGeometry(COURT.POST_X * 2, 0.9),
    new T3.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08, depthWrite: false }));
  shadowNet.rotation.x = -PI / 2;
  shadowNet.position.set(0.6, 0.006, -0.55);
  grp.add(shadowNet);
  world.scene.add(grp);
  world.net = grp;
  world.netMesh = net;
}

/* ---- stadium ----------------------------------------------------------------- */
function adBoardTexture(words, bg, fg, accent) {
  return canvasTex(2048, 112, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(0, h - 12, w, 12);
    g.textBaseline = 'middle'; g.textAlign = 'center';
    const n = words.length, seg = w / n;
    words.forEach((wd, i) => {
      let size = 64;
      g.font = '700 ' + size + 'px "Fredoka", "Arial Rounded MT Bold", Arial, sans-serif';
      const m = g.measureText(wd).width;
      if (m > seg * 0.82) { size = Math.floor(size * (seg * 0.82) / m); g.font = '700 ' + size + 'px "Fredoka", "Arial Rounded MT Bold", Arial, sans-serif'; }
      g.fillStyle = i % 2 ? accent : fg;
      g.fillText(wd, seg * (i + 0.5), h / 2 - 4);
      if (i > 0) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(seg * i - 2, 18, 4, h - 48); }
    });
  });
}

function buildStadium() {
  const S = world.scene;
  const q = world.quality;
  const batch = new BoxBatch();
  const wallH = 1.35;
  const X = COURT.RUN_X, Z = COURT.RUN_Z;
  // perimeter walls
  batch.add(0, wallH / 2, -Z - 0.15, X * 2 + 0.6, wallH, 0.3, '#17483a');
  batch.add(0, wallH / 2, Z + 0.15, X * 2 + 0.6, wallH, 0.3, '#17483a');
  batch.add(-X - 0.15, wallH / 2, 0, 0.3, wallH, Z * 2, '#17483a');
  batch.add(X + 0.15, wallH / 2, 0, 0.3, wallH, Z * 2, '#17483a');

  // tiered stands on all four sides
  const rows = 9, depth = 0.9, rise = 0.46, base = wallH + 0.15;
  const seatA = '#1f5a96', seatB = '#2a6db0', tread = '#d9e3ec';
  const crowdSpots = [];
  const ext = 7.5;
  for (let i = 0; i < rows; i++) {
    const top = base + (i + 1) * rise;
    const zIn = Z + 0.3 + i * depth;
    const xIn = X + 0.3 + i * depth;
    const col = i % 2 ? seatA : seatB;
    // ends (behind baselines)
    for (const s of [-1, 1]) {
      batch.add(0, top / 2, s * (zIn + depth / 2), (X + ext + i * depth) * 2, top, depth, col, tread);
      batch.add(s * (xIn + depth / 2), top / 2, 0, depth, top, Z * 2 + 0.6, col, tread);
    }
    // crowd seats (the end behind the camera stays sparse on lighter devices)
    const yS = top;
    const step = 0.64;
    for (const s of [-1, 1]) {
      if (!(q === 'low' && s > 0)) {
        for (let x = -(X + ext + i * depth) + 0.4; x < (X + ext + i * depth) - 0.4; x += step) {
          crowdSpots.push([x + rand(-0.08, 0.08), yS, s * (zIn + depth * 0.55)]);
        }
      }
      for (let z = -Z + 0.4; z < Z - 0.4; z += step) {
        crowdSpots.push([s * (xIn + depth * 0.55), yS, z + rand(-0.08, 0.08)]);
      }
    }
  }
  // roof rim behind the top rows
  const topH = base + rows * rise;
  for (const s of [-1, 1]) {
    batch.add(0, topH + 1.1, s * (Z + 0.3 + rows * depth + 0.3), (X + ext + rows * depth) * 2 + 2, 2.2, 0.5, '#e8eef4');
    batch.add(s * (X + 0.3 + rows * depth + 0.3), topH + 1.1, 0, 0.5, 2.2, Z * 2 + 2 * rows * depth, '#e8eef4');
  }
  // umpire chair
  const cx = COURT.POST_X + 1.25;
  for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) batch.add(cx + dx, 0.95, dz, 0.07, 1.9, 0.07, '#2c3a46');
  batch.add(cx, 1.92, 0, 0.8, 0.08, 0.8, '#ffffff');
  batch.add(cx + 0.25, 2.3, 0, 0.08, 0.7, 0.7, '#ffffff');
  for (let k = 0; k < 4; k++) batch.add(cx - 0.42, 0.35 + k * 0.42, 0, 0.05, 0.05, 0.62, '#2c3a46');
  // player benches
  for (const s of [-1, 1]) {
    batch.add(COURT.POST_X + 2.1, 0.45, s * 1.6, 0.6, 0.9, 1.9, '#2e6e9c', '#f2f6f9');
  }

  const standMat = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
  const stands = batch.mesh(standMat);
  stands.receiveShadow = true;
  S.add(stands);

  // advertising boards on the inner face of the walls
  const boards = world.adTex = [
    adBoardTexture(['ACE RALLY OPEN', 'SWEET SPOT', 'ACE RALLY OPEN'], '#0f3d6e', '#ffffff', '#d9f23f'),
    adBoardTexture(['LOVE ALL CLUB', 'BASELINE JUICE', 'STRINGWORKS'], '#164a3c', '#ffffff', '#ffd25a'),
    adBoardTexture(['MATCH POINT FM', 'ACE RALLY', 'SUNNY COURTS'], '#123557', '#ffffff', '#7fd3ff')
  ];
  const addBoard = (tex, w, x, z, ry) => {
    const m = new T3.Mesh(new T3.PlaneGeometry(w, 0.95), new T3.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.18 }));
    m.position.set(x, 0.62, z); m.rotation.y = ry; S.add(m);
  };
  addBoard(boards[0], X * 2 - 0.4, 0, -Z + 0.005, 0);
  addBoard(boards[1], X * 2 - 0.4, 0, Z - 0.005, PI);
  addBoard(boards[2], Z * 2 - 0.6, -X + 0.005, 0, PI / 2);
  addBoard(boards[2], Z * 2 - 0.6, X - 0.005, 0, -PI / 2);

  // crowd
  buildCrowd(crowdSpots, q === 'high' ? 0.93 : 0.62);

  // floodlight towers
  const towerMat = stdMat('#c9d4de', 0.5, { metalness: 0.4 });
  const lampMat = new T3.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6d8, emissiveIntensity: 0.9 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tx = sx * (X + rows * depth + 4), tz = sz * (Z + rows * depth + 3);
      const tower = new T3.Mesh(new T3.CylinderGeometry(0.22, 0.4, 24, 8), towerMat);
      tower.position.set(tx, 12, tz); S.add(tower);
      const head = new T3.Mesh(new T3.BoxGeometry(3.4, 1.8, 0.4), towerMat);
      head.position.set(tx, 24.4, tz);
      head.lookAt(0, 6, 0);
      S.add(head);
      const lamp = new T3.Mesh(new T3.PlaneGeometry(3.1, 1.5), lampMat);
      lamp.position.copy(head.position);
      lamp.lookAt(0, 6, 0);
      lamp.translateZ(0.21);
      S.add(lamp);
    }
  }

  // trees peeking over the stands, drawn as two instanced batches
  const treeN = 34;
  const trunks = new T3.InstancedMesh(new T3.CylinderGeometry(0.25, 0.35, 1, 6), stdMat('#6b4a2e', 0.9), treeN);
  const crowns = new T3.InstancedMesh(new T3.IcosahedronGeometry(1, 1), new T3.MeshStandardMaterial({ roughness: 0.9 }), treeN);
  const tm = new T3.Matrix4(), tq = new T3.Quaternion(), tp = new T3.Vector3(), ts = new T3.Vector3(), tc = new T3.Color();
  const leafCols = ['#3f8f3f', '#4fa046', '#357d3a'];
  for (let i = 0; i < treeN; i++) {
    const a = (i / treeN) * TAU + rand(-0.05, 0.05);
    const r = rand(42, 60);
    const x = Math.cos(a) * r * 0.75, z = Math.sin(a) * r;
    const h = rand(7, 12);
    tm.compose(tp.set(x, h * 0.22, z), tq, ts.set(1, h * 0.45, 1));
    trunks.setMatrixAt(i, tm);
    const cs = rand(2.6, 4.2);
    tm.compose(tp.set(x, h * 0.45 + cs * 0.8, z), tq, ts.set(cs, cs * rand(1.0, 1.3), cs));
    crowns.setMatrixAt(i, tm);
    crowns.setColorAt(i, tc.set(pick(leafCols)));
  }
  S.add(trunks); S.add(crowns);

  buildScoreboard(rows, depth, topH);
}

function buildCrowd(spots, fill) {
  const people = spots.filter(() => Math.random() < fill);
  const n = people.length;
  const lite = world.quality !== 'high';
  const bodyGeo = new T3.CapsuleGeometry(0.19, 0.3, lite ? 2 : 3, lite ? 6 : 8);
  const headGeo = new T3.SphereGeometry(0.135, lite ? 8 : 10, lite ? 6 : 8);
  const bodyMat = new T3.MeshStandardMaterial({ roughness: 0.85 });
  const headMat = new T3.MeshStandardMaterial({ roughness: 0.8 });
  const bodies = new T3.InstancedMesh(bodyGeo, bodyMat, n);
  const heads = new T3.InstancedMesh(headGeo, headMat, n);
  const shirts = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#ecf0f1', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#ff7aa2', '#ffffff', '#ffd35c', '#5dade2'];
  const m = new T3.Matrix4();
  const col = new T3.Color();
  const data = new Float32Array(n * 5);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = people[i];
    data[i * 5] = x; data[i * 5 + 1] = y; data[i * 5 + 2] = z;
    data[i * 5 + 3] = Math.random() * TAU;
    data[i * 5 + 4] = rand(0.5, 1.25);
    m.makeTranslation(x, y + 0.36, z); bodies.setMatrixAt(i, m);
    m.makeTranslation(x, y + 0.78, z); heads.setMatrixAt(i, m);
    col.set(pick(shirts)); bodies.setColorAt(i, col);
    col.set(pick(SKIN_TONES)); heads.setColorAt(i, col);
  }
  bodies.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  heads.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  world.scene.add(bodies); world.scene.add(heads);
  world.crowd = { bodies, heads, data, n, excite: 0, wave: -1, frame: 0 };
}

function updateCrowd(dt) {
  const c = world.crowd;
  if (!c) return;
  c.excite = Math.max(0, c.excite - dt * 0.45);
  c.frame++;
  const active = c.excite > 0.02 || c.wave >= 0;
  if (!active && c.frame % 6 !== 0) return;
  const t = world.t;
  const m = new T3.Matrix4();
  const d = c.data;
  if (c.wave >= 0) { c.wave += dt * 1.6; if (c.wave > TAU + 1) c.wave = -1; }
  for (let i = 0; i < c.n; i++) {
    const x = d[i * 5], y = d[i * 5 + 1], z = d[i * 5 + 2], ph = d[i * 5 + 3], ex = d[i * 5 + 4];
    let dy = Math.sin(t * 0.9 + ph) * 0.012;
    if (c.excite > 0.02) dy += Math.abs(Math.sin(t * 7.5 * ex + ph)) * 0.24 * c.excite * ex;
    if (c.wave >= 0) {
      const a = Math.atan2(z, x) + PI;
      const k = Math.cos(a - c.wave);
      if (k > 0.75) dy += (k - 0.75) * 4 * 0.42;
    }
    m.makeTranslation(x, y + 0.36 + dy, z); c.bodies.setMatrixAt(i, m);
    m.makeTranslation(x, y + 0.78 + dy * 1.1, z); c.heads.setMatrixAt(i, m);
  }
  c.bodies.instanceMatrix.needsUpdate = true;
  c.heads.instanceMatrix.needsUpdate = true;
}

function crowdCheer(level) {
  if (world.crowd) world.crowd.excite = Math.max(world.crowd.excite, level);
}
function crowdWave() { if (world.crowd && world.crowd.wave < 0) world.crowd.wave = 0; }

/* ---- big screen scoreboard ------------------------------------------------- */
function buildScoreboard(rows, depth, topH) {
  const W = 1024, H = 420;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const tex = new T3.CanvasTexture(cv);
  tex.encoding = T3.sRGBEncoding;
  const frame = new T3.Mesh(new T3.BoxGeometry(10.6, 4.6, 0.5), stdMat('#1b2633', 0.6));
  const z = -(COURT.RUN_Z + 0.3 + rows * depth + 1.2);
  frame.position.set(0, topH + 4.2, z);
  world.scene.add(frame);
  const screen = new T3.Mesh(new T3.PlaneGeometry(10, 4.1), new T3.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, topH + 4.2, z + 0.26);
  world.scene.add(screen);
  for (const s of [-1, 1]) {
    const leg = new T3.Mesh(new T3.BoxGeometry(0.35, topH + 2, 0.35), stdMat('#1b2633', 0.6));
    leg.position.set(s * 4.2, (topH + 2) / 2, z - 0.1);
    world.scene.add(leg);
  }
  world.board = { cv, tex, last: null };
  drawScoreboard(null);
}

function fitFont(g, text, maxW, size) {
  let sz = size;
  g.font = '700 ' + sz + 'px "Fredoka", "Arial Rounded MT Bold", Arial, sans-serif';
  const m = g.measureText(text).width;
  if (m > maxW) sz = Math.max(18, Math.floor(sz * maxW / m));
  return '700 ' + sz + 'px "Fredoka", "Arial Rounded MT Bold", Arial, sans-serif';
}

function repaintTextTextures() {
  if (world.adTex) world.adTex.forEach((t) => t.userData.redraw && t.userData.redraw());
}

function drawScoreboard(info) {
  const b = world.board;
  if (!b) return;
  b.last = info;
  const g = b.cv.getContext('2d');
  const W = b.cv.width, H = b.cv.height;
  g.fillStyle = '#0b1420'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#123a63'; g.fillRect(0, 0, W, 86);
  g.textBaseline = 'middle';
  const label = info && info.label ? info.label : 'CENTRE COURT';
  g.font = fitFont(g, 'ACE RALLY OPEN', W * 0.5 - 50, 52);
  g.fillStyle = '#d9f23f'; g.textAlign = 'left';
  g.fillText('ACE RALLY OPEN', 32, 45);
  g.font = fitFont(g, label, W * 0.5 - 50, 44);
  g.textAlign = 'right'; g.fillStyle = '#9fd3ff';
  g.fillText(label, W - 32, 45);
  if (!info) {
    g.textAlign = 'center'; g.fillStyle = '#ffffff';
    g.font = '700 92px "Fredoka", "Arial Rounded MT Bold", Arial, sans-serif';
    g.fillText('WELCOME', W / 2, 250);
    b.tex.needsUpdate = true;
    return;
  }
  const rowY = [175, 315];
  g.font = '700 74px "Fredoka", "Arial Rounded MT Bold", Arial, sans-serif';
  for (let t = 0; t < 2; t++) {
    const y = rowY[t];
    g.fillStyle = info.colors[t]; g.fillRect(28, y - 52, 16, 104);
    g.textAlign = 'left'; g.fillStyle = '#ffffff';
    g.font = fitFont(g, info.names[t], 470, 74);
    g.fillText(info.names[t], 66, y);
    g.font = '700 74px "Fredoka", "Arial Rounded MT Bold", Arial, sans-serif';
    if (info.serving === t) { g.fillStyle = '#d9f23f'; g.beginPath(); g.arc(560, y, 16, 0, TAU); g.fill(); }
    g.textAlign = 'center';
    let x = 650;
    for (const v of info.sets[t]) { g.fillStyle = '#9fb2c8'; g.fillText(String(v), x, y); x += 86; }
    g.fillStyle = '#ffffff'; g.fillText(String(info.games[t]), x, y); x += 120;
    g.fillStyle = '#d9f23f'; g.fillRect(x - 64, y - 50, 128, 100);
    g.fillStyle = '#0b1420'; g.fillText(info.points[t], x, y);
  }
  b.tex.needsUpdate = true;
}

/* ---- ball, shadow, trail ---------------------------------------------------- */
function buildBall() {
  const tex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#d6f03a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,210,0.18)' : 'rgba(120,150,0,0.12)';
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    g.strokeStyle = '#fbfff0'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i <= 128; i++) {
      const u = i / 128, x = u * w;
      const y = h / 2 + Math.sin(u * TAU * 2) * h * 0.27;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  });
  const ball = new T3.Mesh(new T3.SphereGeometry(BALL_VIS, 24, 16),
    new T3.MeshStandardMaterial({ map: tex, roughness: 0.82, emissive: 0x4a5a00, emissiveIntensity: 0.28 }));
  ball.castShadow = false;
  world.scene.add(ball);
  world.ballMesh = ball;

  const shTex = canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const sh = new T3.Mesh(new T3.PlaneGeometry(1, 1), new T3.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
  sh.rotation.x = -PI / 2;
  sh.renderOrder = 1;
  world.scene.add(sh);
  world.ballShadow = sh;

  // ribbon trail that always faces the camera
  const N = 18;
  const tgeo = new T3.BufferGeometry();
  tgeo.setAttribute('position', new T3.BufferAttribute(new Float32Array(N * 2 * 3), 3).setUsage(T3.DynamicDrawUsage));
  tgeo.setAttribute('color', new T3.BufferAttribute(new Float32Array(N * 2 * 4), 4).setUsage(T3.DynamicDrawUsage));
  const idx = [];
  for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  tgeo.setIndex(idx);
  const trail = new T3.Mesh(tgeo, new T3.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide, toneMapped: false }));
  trail.frustumCulled = false;
  trail.visible = false;
  trail.renderOrder = 5;
  world.scene.add(trail);
  world.trail = trail;
  world.trailN = N;
  world.trailPts = [];
}

const _tA = new T3.Vector3(), _tB = new T3.Vector3(), _tC = new T3.Vector3(), _tT = new T3.Vector3();
function updateTrail(b, show, fast) {
  const pts = world.trailPts, N = world.trailN, mesh = world.trail;
  if (!show) { pts.length = 0; mesh.visible = false; return; }
  pts.unshift(b.x, b.y, b.z);
  if (pts.length > N * 3) pts.length = N * 3;
  const n = pts.length / 3;
  if (n < 3) { mesh.visible = false; return; }
  mesh.visible = true;
  const pos = mesh.geometry.attributes.position.array, col = mesh.geometry.attributes.color.array;
  const cam = world.camera.position;
  const glow = 0.28 + fast * 0.45;
  const r = 1, g = fast > 0.6 ? 0.9 : 1, bl = fast > 0.6 ? 0.55 : 0.75;
  for (let i = 0; i < N; i++) {
    const k = Math.min(i, n - 1);
    _tA.set(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2]);
    const k2 = Math.min(k + 1, n - 1), k0 = Math.max(k - 1, 0);
    _tT.set(pts[k0 * 3] - pts[k2 * 3], pts[k0 * 3 + 1] - pts[k2 * 3 + 1], pts[k0 * 3 + 2] - pts[k2 * 3 + 2]);
    if (_tT.lengthSq() < 1e-8) _tT.set(0, 1, 0);
    _tB.copy(cam).sub(_tA);
    _tC.crossVectors(_tT, _tB).normalize();
    const u = i / (N - 1);
    const wdt = BALL_VIS * 0.95 * (1 - u * 0.85);
    const a = i < n ? Math.pow(1 - u, 1.6) * glow : 0;
    const o = i * 6;
    pos[o] = _tA.x + _tC.x * wdt; pos[o + 1] = _tA.y + _tC.y * wdt; pos[o + 2] = _tA.z + _tC.z * wdt;
    pos[o + 3] = _tA.x - _tC.x * wdt; pos[o + 4] = _tA.y - _tC.y * wdt; pos[o + 5] = _tA.z - _tC.z * wdt;
    const c = i * 8;
    col[c] = r; col[c + 1] = g; col[c + 2] = bl; col[c + 3] = a;
    col[c + 4] = r; col[c + 5] = g; col[c + 6] = bl; col[c + 7] = a;
  }
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.attributes.color.needsUpdate = true;
}

function updateBallVisual(b, dt) {
  const mesh = world.ballMesh;
  const visible = b.visible;
  mesh.visible = visible;
  world.ballShadow.visible = visible;
  if (!visible) { updateTrail(b, false, 0); return; }
  mesh.position.set(b.x, Math.max(b.y, BALL_VIS * 0.6), b.z);
  const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
  mesh.rotation.x -= (b.vz / BALL_VIS) * dt * 0.4;
  mesh.rotation.z += (b.vx / BALL_VIS) * dt * 0.4;
  const h = Math.max(0, b.y);
  const s = BALL_VIS * 2.8 * (1 + h * 0.22);
  world.ballShadow.position.set(b.x, 0.007, b.z);
  world.ballShadow.scale.set(s, s, 1);
  world.ballShadow.material.opacity = clamp(0.6 / (1 + h * 0.5), 0.12, 0.6);
  updateTrail(b, sp > 6 && b.live && dt > 0, clamp((sp - 7) / 20, 0, 1));
}

/* ---- effects: guides, marks, dust, sparkle, confetti ------------------------ */
function softDotTex() {
  return canvasTex(64, 64, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
}

function buildFx() {
  const S = world.scene;
  // landing guide
  const ring = new T3.Mesh(new T3.RingGeometry(0.2, 0.28, 40), new T3.MeshBasicMaterial({ color: 0xd9f23f, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -PI / 2; ring.renderOrder = 3; ring.visible = false;
  const dot = new T3.Mesh(new T3.CircleGeometry(0.07, 20), ring.material);
  dot.position.z = 0.001;
  ring.add(dot);
  S.add(ring);
  world.landRing = ring;

  // timing ring around the hitter
  const tRing = new T3.Mesh(new T3.RingGeometry(0.92, 1.0, 56), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
  tRing.rotation.x = -PI / 2; tRing.renderOrder = 3; tRing.visible = false;
  const tTarget = new T3.Mesh(new T3.RingGeometry(0.62, 0.68, 56), new T3.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }));
  tTarget.rotation.x = -PI / 2; tTarget.renderOrder = 3; tTarget.visible = false;
  S.add(tRing); S.add(tTarget);
  world.timeRing = tRing; world.timeTarget = tTarget;

  // bounce marks
  world.markMat = new T3.MeshBasicMaterial({ color: 0x1d3f6b, transparent: true, opacity: 0.5, depthWrite: false });
  world.marks = [];
  for (let i = 0; i < 8; i++) {
    const m = new T3.Mesh(new T3.CircleGeometry(0.055, 18), world.markMat.clone());
    m.rotation.x = -PI / 2; m.visible = false; m.renderOrder = 1;
    S.add(m);
    world.marks.push({ m, life: 0, max: 1 });
  }
  world.markIdx = 0;
  // call-out ring for line calls
  const callRing = new T3.Mesh(new T3.RingGeometry(0.16, 0.22, 36), new T3.MeshBasicMaterial({ color: 0xff4a3d, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  callRing.rotation.x = -PI / 2; callRing.renderOrder = 4; callRing.visible = false;
  S.add(callRing);
  world.callRing = callRing;

  // dust
  const dotTex = softDotTex();
  world.dustMat = new T3.SpriteMaterial({ map: dotTex, color: 0xdfe8f2, transparent: true, depthWrite: false, opacity: 0.6 });
  world.dust = [];
  for (let i = 0; i < 28; i++) {
    const s = new T3.Sprite(world.dustMat.clone());
    s.visible = false; S.add(s);
    world.dust.push({ s, life: 0, vx: 0, vy: 0, vz: 0, size: 0.2 });
  }
  // sparkle burst
  const starTex = canvasTex(128, 128, (g, w) => {
    g.translate(w / 2, w / 2);
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12);
      const len = i % 2 ? w * 0.3 : w * 0.48;
      const gr = g.createLinearGradient(0, 0, len, 0);
      gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(1, 'rgba(255,240,160,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -4); g.lineTo(len, 0); g.lineTo(0, 4); g.fill();
    }
    const c = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.18);
    c.addColorStop(0, 'rgba(255,255,255,1)'); c.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = c; g.beginPath(); g.arc(0, 0, w * 0.18, 0, TAU); g.fill();
  });
  world.sparks = [];
  for (let i = 0; i < 5; i++) {
    const s = new T3.Sprite(new T3.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: T3.AdditiveBlending, toneMapped: false }));
    s.visible = false; S.add(s);
    world.sparks.push({ s, life: 0, size: 1 });
  }
  // confetti
  const cn = world.quality === 'high' ? 320 : 180;
  const conf = new T3.InstancedMesh(new T3.PlaneGeometry(0.09, 0.055), new T3.MeshBasicMaterial({ side: T3.DoubleSide, toneMapped: false }), cn);
  const cc = new T3.Color();
  const pal = ['#d9f23f', '#1e97e0', '#ff5a7a', '#ffffff', '#ffb21e', '#18a565'];
  for (let i = 0; i < cn; i++) { cc.set(pick(pal)); conf.setColorAt(i, cc); }
  conf.visible = false;
  conf.frustumCulled = false;
  S.add(conf);
  world.confetti = { mesh: conf, n: cn, p: new Float32Array(cn * 8), on: false, t: 0 };
}

function addMark(x, z, vx, vz, life) {
  const k = world.marks[world.markIdx++ % world.marks.length];
  k.m.visible = true;
  k.m.position.set(x, 0.006, z);
  k.m.rotation.z = Math.atan2(vx, vz);
  k.m.scale.set(1, 1.9, 1);
  k.m.material.color.copy(world.markMat.color);
  k.life = life; k.max = life;
  k.m.material.opacity = 0.55;
}

function showCallRing(x, z, color) {
  const r = world.callRing;
  r.visible = true;
  r.position.set(x, 0.012, z);
  r.material.color.setHex(color);
  r.material.opacity = 1;
  r.userData.life = 2.2;
}

function puffDust(x, z, amount) {
  const n = Math.round(3 + amount * 6);
  for (let i = 0; i < n; i++) {
    const d = world.dust.find((p) => p.life <= 0);
    if (!d) return;
    d.life = rand(0.35, 0.7) * (0.6 + amount * 0.5);
    d.max = d.life;
    d.s.visible = true;
    d.s.position.set(x + rand(-0.05, 0.05), 0.05, z + rand(-0.05, 0.05));
    const a = rand(0, TAU), sp = rand(0.3, 1.1) * (0.5 + amount);
    d.vx = Math.cos(a) * sp; d.vz = Math.sin(a) * sp; d.vy = rand(0.2, 0.8) * (0.4 + amount);
    d.size = rand(0.12, 0.26) * (0.6 + amount * 0.7);
    d.s.material.color.copy(world.dustMat.color);
  }
}

function sparkle(x, y, z, size) {
  const s = world.sparks.find((p) => p.life <= 0) || world.sparks[0];
  s.life = 0.32; s.size = size;
  s.s.visible = true;
  s.s.position.set(x, y, z);
}

function startConfetti() {
  const c = world.confetti;
  c.on = true; c.t = 0; c.mesh.visible = true;
  for (let i = 0; i < c.n; i++) {
    const o = i * 8;
    c.p[o] = rand(-9, 9); c.p[o + 1] = rand(6, 16); c.p[o + 2] = rand(-14, 14);
    c.p[o + 3] = rand(-0.4, 0.4); c.p[o + 4] = rand(-1.6, -0.8); c.p[o + 5] = rand(-0.4, 0.4);
    c.p[o + 6] = rand(0, TAU); c.p[o + 7] = rand(2, 7);
  }
}
function stopConfetti() { world.confetti.on = false; world.confetti.mesh.visible = false; }

function updateFx(dt) {
  for (const k of world.marks) {
    if (k.life <= 0) continue;
    k.life -= dt;
    k.m.material.opacity = 0.55 * clamp(k.life / Math.min(1.2, k.max), 0, 1);
    if (k.life <= 0) k.m.visible = false;
  }
  const cr = world.callRing;
  if (cr.visible) {
    cr.userData.life -= dt;
    const l = cr.userData.life;
    cr.material.opacity = clamp(l / 0.6, 0, 1);
    const pulse = 1 + 0.25 * Math.sin(world.t * 10);
    cr.scale.setScalar(pulse);
    if (l <= 0) cr.visible = false;
  }
  for (const d of world.dust) {
    if (d.life <= 0) continue;
    d.life -= dt;
    d.s.position.x += d.vx * dt; d.s.position.y += d.vy * dt; d.s.position.z += d.vz * dt;
    d.vx *= 0.94; d.vz *= 0.94; d.vy -= 0.6 * dt;
    const k = 1 - d.life / d.max;
    const sz = d.size * (1 + k * 1.8);
    d.s.scale.set(sz, sz, 1);
    d.s.material.opacity = (1 - k) * 0.55;
    if (d.life <= 0) d.s.visible = false;
  }
  for (const s of world.sparks) {
    if (s.life <= 0) continue;
    s.life -= dt;
    const k = 1 - s.life / 0.32;
    const sz = s.size * (0.5 + easeOutCubic(k) * 1.2);
    s.s.scale.set(sz, sz, 1);
    s.s.material.opacity = 1 - k;
    s.s.material.rotation = k * 0.8;
    if (s.life <= 0) s.s.visible = false;
  }
  const c = world.confetti;
  if (c.on) {
    c.t += dt;
    const m = new T3.Matrix4(), q = new T3.Quaternion(), e = new T3.Euler(), v = new T3.Vector3(), sc = new T3.Vector3(1, 1, 1);
    for (let i = 0; i < c.n; i++) {
      const o = i * 8;
      c.p[o + 3] += Math.sin(world.t * 2 + i) * dt * 0.8;
      c.p[o] += c.p[o + 3] * dt; c.p[o + 1] += c.p[o + 4] * dt; c.p[o + 2] += c.p[o + 5] * dt;
      c.p[o + 6] += c.p[o + 7] * dt;
      if (c.p[o + 1] < 0.02) { c.p[o + 1] = 0.02; c.p[o + 4] = 0; c.p[o + 3] = 0; c.p[o + 5] = 0; c.p[o + 7] = 0; }
      e.set(c.p[o + 6], c.p[o + 6] * 0.7, 0);
      q.setFromEuler(e);
      v.set(c.p[o], c.p[o + 1], c.p[o + 2]);
      m.compose(v, q, sc);
      c.mesh.setMatrixAt(i, m);
    }
    c.mesh.instanceMatrix.needsUpdate = true;
    if (c.t > 14) stopConfetti();
  }
  if (world.clouds) world.clouds.rotation.y += dt * 0.004;
}
