/* ==========================================================================
   Sprites: outlined pixel "puppets" posed with inverse kinematics.
   Local frame: origin at the feet, +x is forward (facing right), y down.
   ========================================================================== */

const OUTLINE = '#0f0a14';

const PAL = {
  hero: {
    skin: '#ecb68c', skin2: '#c88a62', hair: '#2b1a12', top: '#2f4774', top2: '#223459',
    vest: '#bb9b63', vest2: '#8a6d42', pants: '#38446a', pants2: '#28304c', boot: '#2a201b', boot2: '#53433a',
    band: '#e8392a', gear: '#5a4630', head: 'band'
  },
  grunt: {
    skin: '#d9a27c', skin2: '#b47c5b', hair: '#2a2420', top: '#7e8896', top2: '#5d6672', pants: '#5c6470', pants2: '#454c56',
    boot: '#29241f', boot2: '#47403a', helmet: '#56634f', helmet2: '#3c4638', accent: '#cf3a2c', gear: '#3d3830', head: 'helmet'
  },
  officer: {
    skin: '#d39a74', skin2: '#ae7655', hair: '#1e1a18', top: '#7d2533', top2: '#5c1a26', pants: '#34343e', pants2: '#26262e',
    boot: '#1c1a1a', boot2: '#3a3634', cap: '#2a2a33', accent: '#e3bd4b', gear: '#2a2522', head: 'cap'
  },
  grenadier: {
    skin: '#d9a27c', skin2: '#b47c5b', hair: '#2a2420', top: '#6c7a50', top2: '#525d3c', pants: '#565f48', pants2: '#424a37',
    boot: '#29241f', boot2: '#47403a', helmet: '#4b5543', helmet2: '#363e30', mask: '#9097a0', accent: '#cf3a2c', gear: '#3d3830', head: 'mask'
  },
  striker: {
    skin: '#d39a74', skin2: '#ad7553', hair: '#1e1a18', top: '#3c4250', top2: '#2b3039', pants: '#30343e', pants2: '#24272f',
    boot: '#1c1a1a', boot2: '#3a3634', beanie: '#20242c', accent: '#cf3a2c', gear: '#26231f', head: 'beanie'
  },
  sniper: {
    skin: '#d9a27c', skin2: '#b47c5b', hair: '#2a2420', top: '#5e6a42', top2: '#475031', pants: '#4f5838', pants2: '#3c432b',
    boot: '#29241f', boot2: '#47403a', hat: '#4a5434', hat2: '#363d26', accent: '#cf3a2c', gear: '#3d3830', head: 'boonie'
  },
  gunner: {
    skin: '#d9a27c', skin2: '#b47c5b', hair: '#2a2420', top: '#7e8896', top2: '#5d6672', pants: '#5c6470', pants2: '#454c56',
    boot: '#29241f', boot2: '#47403a', helmet: '#56634f', helmet2: '#3c4638', lens: '#7fd6ff', accent: '#cf3a2c', gear: '#3d3830', head: 'goggles'
  },
  captive: {
    skin: '#e3ad86', skin2: '#bf8862', hair: '#3b2a1e', top: '#e7e1d3', top2: '#c4bca8', pants: '#77684f', pants2: '#5c503c',
    boot: '#4a3b2c', boot2: '#6a5640', gear: '#a58a5e', head: 'hair'
  },
  general: {
    skin: '#d6a07a', skin2: '#b07a58', hair: '#cfcfcf', top: '#3c414e', top2: '#2b2f39', pants: '#2b2f39', pants2: '#20232b',
    boot: '#131214', boot2: '#2e2b2c', cap: '#30343f', accent: '#dcb84a', sash: '#a82733', gear: '#191717', head: 'genCap', coat: true
  },
  brute: {
    skin: '#cf9776', skin2: '#a87154', hair: '#3a2a20', top: '#59633f', top2: '#434b2f', pants: '#4b503b', pants2: '#393d2d',
    boot: '#231d19', boot2: '#41362e', accent: '#cf3a2c', gear: '#4a3a2a', head: 'brute', bare: true
  },
  guard: {
    skin: '#d9a27c', skin2: '#b47c5b', hair: '#2a2420', top: '#3a4655', top2: '#2a3340', pants: '#2e3846', pants2: '#222a35',
    boot: '#16171a', boot2: '#33343a', helmet: '#262c35', helmet2: '#191d24', accent: '#e3bd4b', gear: '#1d1d22', head: 'helmet'
  }
};

/* ---- pixel primitives ------------------------------------------------- */
function stampLine(g, x0, y0, x1, y1, w, col) {
  g.fillStyle = col;
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const o = (w - 1) / 2;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + (dx * i) / n - o), y = Math.round(y0 + (dy * i) / n - o);
    g.fillRect(x, y, w, w);
  }
}
function px(g, x, y, col, w, h) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }

function outlineCanvas(cv, color) {
  const g = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 0) continue;
    const n = (x > 0 && d[(y * w + x - 1) * 4 + 3] > 0) || (x < w - 1 && d[(y * w + x + 1) * 4 + 3] > 0) ||
      (y > 0 && d[((y - 1) * w + x) * 4 + 3] > 0) || (y < h - 1 && d[((y + 1) * w + x) * 4 + 3] > 0);
    if (n) out[y * w + x] = 1;
  }
  const [r, gg, b] = hexRgb(color);
  for (let i = 0; i < w * h; i++) if (out[i]) { d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}

function flipCanvas(cv) {
  const c = makeCanvas(cv.width, cv.height);
  const g = c.getContext('2d');
  g.translate(cv.width, 0); g.scale(-1, 1);
  g.drawImage(cv, 0, 0);
  return c;
}

function silhouette(cv, color) {
  const c = makeCanvas(cv.width, cv.height);
  const g = c.getContext('2d');
  g.drawImage(cv, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}

/* ---- inverse kinematics --------------------------------------------- */
function ik2(ax, ay, bx, by, l1, l2, prefer) {
  let dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy);
  const maxD = l1 + l2 - 0.02;
  if (d > maxD) { bx = ax + (dx / d) * maxD; by = ay + (dy / d) * maxD; dx = bx - ax; dy = by - ay; d = maxD; }
  if (d < 0.01) d = 0.01;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + (dx * a) / d, my = ay + (dy * a) / d;
  const pxv = -dy / d, pyv = dx / d;
  const j1 = [mx + pxv * h, my + pyv * h], j2 = [mx - pxv * h, my - pyv * h];
  let j;
  if (prefer === 'fwd') j = j1[0] >= j2[0] ? j1 : j2;
  else if (prefer === 'back') j = j1[0] <= j2[0] ? j1 : j2;
  else if (prefer === 'down') j = j1[1] >= j2[1] ? j1 : j2;
  else j = j1[1] <= j2[1] ? j1 : j2;
  return { j, e: [bx, by] };
}

/* ---- puppet ------------------------------------------------------------ */
function rotPt(p, r) {
  if (!r) return p;
  const c = Math.cos(r), s = Math.sin(r);
  return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
}

function solvePose(pose, k) {
  const hipY = -(pose.hip == null ? 14 : pose.hip) * k;
  const tl = (pose.tl || 10) * k;
  const lean = (pose.lean || 0) * k;
  const hip = [0, hipY];
  const neck = [lean, hipY - Math.sqrt(Math.max(1, tl * tl - lean * lean))];
  const hd = pose.hd || [0, 0];
  const head = [neck[0] + 0.5 * k + hd[0] * k, neck[1] - 3.5 * k + hd[1] * k];
  const shF = [neck[0] + 0.5 * k, neck[1] + 1.5 * k];
  const shB = [neck[0] - 0.5 * k, neck[1] + 1.5 * k];
  const S = (p) => [p[0] * k, p[1] * k];
  const legF = ik2(hip[0] + 1 * k, hip[1], ...S(pose.ff || [3, 0]), 7 * k, 7 * k, pose.kneeF || 'fwd');
  const legB = ik2(hip[0] - 1 * k, hip[1], ...S(pose.bf || [-3, 0]), 7 * k, 7 * k, pose.kneeB || 'fwd');
  const armF = ik2(shF[0], shF[1], ...S(pose.fh || [5, -13]), 5 * k, 5 * k, pose.elbowF || 'back');
  const armB = ik2(shB[0], shB[1], ...S(pose.bh || [-2, -12]), 5 * k, 5 * k, pose.elbowB || 'back');
  const r = ((pose.rot || 0) * Math.PI) / 180;
  const R = (p) => rotPt(p, r);
  return {
    hip: R(hip), neck: R(neck), head: R(head), shF: R(shF), shB: R(shB),
    kneeF: R(legF.j), footF: R(legF.e), kneeB: R(legB.j), footB: R(legB.e),
    elbF: R(armF.j), handF: R(armF.e), elbB: R(armB.j), handB: R(armB.e),
    rot: r
  };
}

function drawLeg(g, ox, oy, hip, knee, foot, pal, back, k, rot) {
  const c = back ? pal.pants2 : pal.pants;
  const w = Math.max(3, Math.round(3 * k));
  stampLine(g, ox + hip[0], oy + hip[1], ox + knee[0], oy + knee[1], w, c);
  stampLine(g, ox + knee[0], oy + knee[1], ox + foot[0], oy + foot[1], w, c);
  // boot: a short block pointing forward
  const bw = Math.round(5 * k), bh = Math.max(2, Math.round(2.4 * k));
  const fx = Math.round(ox + foot[0]), fy = Math.round(oy + foot[1]);
  g.fillStyle = back ? pal.boot : pal.boot;
  if (rot && Math.abs(rot) > 0.6) { g.fillRect(fx - Math.round(bh / 2), fy - Math.round(bw / 2), bh + 1, bw); return; }
  g.fillRect(fx - Math.round(1.6 * k), fy - bh + 1, bw, bh);
  g.fillStyle = pal.boot2; g.fillRect(fx - Math.round(1.6 * k), fy - bh + 1, bw, 1);
}

function drawArm(g, ox, oy, sh, elb, hand, pal, back, k, bare) {
  const sleeve = back ? pal.top2 : pal.top;
  const w = Math.max(2, Math.round(2.2 * k));
  stampLine(g, ox + sh[0], oy + sh[1], ox + elb[0], oy + elb[1], w, bare ? (back ? pal.skin2 : pal.skin) : sleeve);
  stampLine(g, ox + elb[0], oy + elb[1], ox + hand[0], oy + hand[1], w, back ? pal.skin2 : pal.skin);
  const hs = Math.max(2, Math.round(2.5 * k));
  g.fillStyle = back ? pal.skin2 : pal.skin;
  g.fillRect(Math.round(ox + hand[0] - hs / 2), Math.round(oy + hand[1] - hs / 2), hs, hs);
}

function drawItem(g, ox, oy, hand, item, ang, k, rot) {
  if (!item) return;
  const a = ((ang || 0) * Math.PI) / 180 - (rot || 0);
  const dx = Math.cos(a), dy = Math.sin(a);
  const hx = ox + hand[0], hy = oy + hand[1];
  const L = (s, e, w, col) => stampLine(g, hx + dx * s * k, hy + dy * s * k, hx + dx * e * k, hy + dy * e * k, Math.max(1, Math.round(w * k)), col);
  switch (item) {
    case 'knife':
      L(-2, -1, 1.6, '#3a2a1e'); L(1, 5, 1, '#d9e2ea'); L(5, 6, 1, '#ffffff');
      break;
    case 'rifle':
      L(-6, -3, 2.6, '#5b3b24'); L(-3, 5, 2, '#2c2d33'); L(5, 10, 1, '#1d1e22'); L(1, 2, 1, '#55565f');
      break;
    case 'pistol':
      L(0, 3, 1.8, '#26272c'); L(3, 4, 1, '#1a1a1e');
      break;
    case 'launcher':
      L(-7, 6, 3.2, '#56613a'); L(6, 7, 3.2, '#2b3020'); L(-7, -6, 3.2, '#2b3020');
      break;
    case 'grenade':
      g.fillStyle = '#3c4a2a'; g.fillRect(Math.round(hx - 1), Math.round(hy - 2), 3, 3);
      g.fillStyle = '#9aa76a'; g.fillRect(Math.round(hx), Math.round(hy - 3), 1, 1);
      break;
    case 'mg':
      L(-5, -2, 3, '#4a3a2a'); L(-2, 9, 2.6, '#232428'); L(9, 13, 1.2, '#161619');
      break;
    case 'sniper':
      L(-6, -3, 2.4, '#4f3a26'); L(-3, 11, 1.4, '#26272c'); L(1, 4, 1.4, '#13141a');
      break;
    case 'saber':
      L(-1, 0, 2, '#e3bd4b'); L(0, 11, 1, '#e8edf2'); L(11, 12, 1, '#ffffff');
      break;
    case 'club':
      L(-2, 13, 3.2, '#6b4426'); L(9, 13, 4, '#7d5230');
      break;
    case 'radio':
      g.fillStyle = '#2b2f2a'; g.fillRect(Math.round(hx - 1), Math.round(hy - 3), 3, 4);
      break;
    default: break;
  }
}

function drawHead(g, hx, hy, pal, k, frame) {
  hx = Math.round(hx); hy = Math.round(hy);
  const s = (v) => Math.round(v * k);
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(hx + s(x), hy + s(y), Math.max(1, s(w)), Math.max(1, s(h))); };
  R(-2.5, -3, 5, 6, pal.skin);
  R(-2.5, 1, 2, 2, pal.skin2);
  R(2.5, -1, 1, 2, pal.skin);
  R(1, -1, 1, 1, '#1a1014');
  switch (pal.head) {
    case 'band': {
      R(-2.5, -4, 5, 2, pal.hair); R(-3.5, -3, 1, 3, pal.hair);
      R(-2.5, -2, 5, 1, pal.band);
      const f = frame % 2;
      R(-4.5, -2, 1, 1, pal.band); R(-5.5, -2 + f, 1, 1, pal.band); R(-6.5, -1 + f, 1, 1, pal.band);
      break;
    }
    case 'helmet':
      R(-3.5, -5, 7, 3, pal.helmet); R(-4.5, -3, 9, 1, pal.helmet2); R(-1.5, -5, 2, 1, mixHex(pal.helmet, '#ffffff', 0.25));
      R(0, 1, 1, 1, pal.gear);
      break;
    case 'goggles':
      R(-3.5, -5, 7, 3, pal.helmet); R(-4.5, -3, 9, 1, pal.helmet2);
      R(-2.5, -2, 5, 1, '#222222'); R(1, -2, 2, 1, pal.lens || '#7fd6ff');
      break;
    case 'mask':
      R(-3.5, -5, 7, 3, pal.helmet); R(-4.5, -3, 9, 1, pal.helmet2);
      R(-0.5, -1, 4, 4, pal.mask); R(1, -1, 2, 1, '#bfe8ff'); R(3.5, 1, 1, 2, '#3a3f45');
      break;
    case 'cap':
      R(-2.5, -5, 5, 2, pal.cap); R(-3.5, -4, 1, 1, pal.cap); R(1.5, -3, 3, 1, '#121216'); R(0, -5, 1, 1, pal.accent);
      R(-3.5, -2, 1, 2, pal.hair);
      break;
    case 'beanie':
      R(-3, -5, 6, 3, pal.beanie); R(-3, -3, 6, 1, mixHex(pal.beanie, '#ffffff', 0.18));
      break;
    case 'boonie':
      R(-2.5, -5, 5, 2, pal.hat); R(-4.5, -3, 9, 1, pal.hat2);
      break;
    case 'hair':
      R(-2.5, -4, 5, 2, pal.hair); R(-3.5, -3, 1, 4, pal.hair);
      break;
    case 'genCap':
      R(-3.5, -6, 7, 3, pal.cap); R(-3.5, -4, 7, 1, pal.sash); R(1.5, -3, 4, 1, '#0c0c10'); R(-0.5, -6, 2, 1, pal.accent);
      R(-3.5, -2, 1, 2, pal.hair); R(-1.5, 1, 4, 1, pal.hair);
      break;
    case 'brute':
      R(-2.5, -3, 5, 1, mixHex(pal.skin, '#ffffff', 0.2)); R(-1.5, 1, 5, 2, pal.hair); R(-3.5, -2, 1, 3, pal.hair);
      break;
    default: break;
  }
}

/** Render one posed character into a fresh canvas. */
function renderPuppet(pose, pal, k) {
  const size = Math.ceil(52 * k), ox = Math.floor(size / 2), oy = size - Math.ceil(5 * k);
  const cv = makeCanvas(size, size);
  const g = cv.getContext('2d');
  const P = solvePose(pose, k);
  const yo = (pose.dy || 0) * k;
  const Y = oy + yo;
  // back limbs first
  if (!pose.noBackArm) drawArm(g, ox, Y, P.shB, P.elbB, P.handB, pal, true, k, pal.bare);
  if (pose.itemB) drawItem(g, ox, Y, P.handB, pose.itemB, pose.iaB, k, P.rot);
  drawLeg(g, ox, Y, P.hip, P.kneeB, P.footB, pal, true, k, P.rot);
  // coat tails for the general
  if (pal.coat) {
    const hx = ox + P.hip[0], hy = Y + P.hip[1];
    stampLine(g, hx - 2 * k, hy - 1 * k, hx - 3 * k + (pose.coatSwing || 0) * k, hy + 7 * k, Math.round(4 * k), pal.top2);
    stampLine(g, hx + 1 * k, hy - 1 * k, hx + 2 * k, hy + 6 * k, Math.round(3 * k), pal.top);
  }
  // torso
  const tw = Math.round((pal.bare ? 7 : 6) * k);
  stampLine(g, ox + P.hip[0], Y + P.hip[1] - 1 * k, ox + P.neck[0], Y + P.neck[1] + 1 * k, tw, pal.bare ? pal.top : pal.top);
  if (pal.bare) {
    // tank top with bare shoulders
    stampLine(g, ox + P.neck[0], Y + P.neck[1] + 1 * k, ox + P.neck[0], Y + P.neck[1] + 1 * k, Math.round(3 * k), pal.skin);
  }
  // pelvis and belt
  stampLine(g, ox + P.hip[0] - 1 * k, Y + P.hip[1] + 0.5 * k, ox + P.hip[0] + 1 * k, Y + P.hip[1] + 0.5 * k, Math.round(4 * k), pal.pants);
  const bx0 = ox + P.hip[0], by0 = Y + P.hip[1] - 1.5 * k;
  stampLine(g, bx0 - 2.5 * k, by0, bx0 + 2.5 * k, by0, Math.max(1, Math.round(1 * k)), pal.gear);
  if (pal.vest) {
    stampLine(g, ox + P.hip[0] + 0.6 * k, Y + P.hip[1] - 2.5 * k, ox + P.neck[0] + 0.6 * k, Y + P.neck[1] + 2.5 * k, Math.round(4 * k), pal.vest);
    const mx = (P.hip[0] + P.neck[0]) / 2, my = (P.hip[1] + P.neck[1]) / 2;
    px(g, ox + mx + 1.5 * k, Y + my, pal.vest2, Math.max(1, Math.round(2 * k)), Math.max(1, Math.round(2 * k)));
    px(g, ox + mx + 1.5 * k, Y + my - 3 * k, pal.vest2, Math.max(1, Math.round(2 * k)), 1);
  }
  if (pal.sash) {
    stampLine(g, ox + P.neck[0] + 2 * k, Y + P.neck[1] + 2 * k, ox + P.hip[0] - 2 * k, Y + P.hip[1] - 2 * k, Math.max(1, Math.round(1.4 * k)), pal.sash);
    px(g, ox + P.neck[0] - 3 * k, Y + P.neck[1] + 1 * k, pal.accent, Math.round(3 * k), Math.max(1, Math.round(1.2 * k)));
  }
  if (pal.accent && (pal.head === 'helmet' || pal.head === 'goggles' || pal.head === 'mask' || pal.head === 'beanie' || pal.head === 'boonie')) {
    // armband on the far shoulder area
    px(g, ox + P.shF[0] + 0.5 * k, Y + P.shF[1] + 1.5 * k, pal.accent, Math.max(1, Math.round(2 * k)), Math.max(1, Math.round(1.5 * k)));
  }
  drawLeg(g, ox, Y, P.hip, P.kneeF, P.footF, pal, false, k, P.rot);
  drawHead(g, ox + P.head[0], Y + P.head[1], pal, k, pose.frame || 0);
  if (!pose.noFrontArm) {
    drawArm(g, ox, Y, P.shF, P.elbF, P.handF, pal, false, k, pal.bare);
    drawItem(g, ox, Y, P.handF, pose.item, pose.ia, k, P.rot);
  }
  if (pose.tied) {
    // rope around the wrists behind the back
    px(g, ox + P.handB[0] - 1, Y + P.handB[1] - 1, '#c9a463', 3, 2);
  }
  outlineCanvas(cv, OUTLINE);
  return { cv, ox, oy };
}

/* ---- pose library ------------------------------------------------------- */
const POSES = {};
(function buildPoses() {
  const run = (hold) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * TAU;
      const lift = (c) => (c > 0 ? 4.2 * c : 0);
      const p = {
        hip: 14 - Math.abs(Math.sin(t)) * 0.9, lean: 1.6, frame: i,
        ff: [7 * Math.sin(t), -lift(Math.cos(t))], bf: [7 * Math.sin(t + Math.PI), -lift(Math.cos(t + Math.PI))]
      };
      if (hold === 'rifle') { p.fh = [7, -15 + Math.abs(Math.sin(t))]; p.bh = [2, -14 + Math.abs(Math.sin(t))]; p.item = 'rifle'; p.ia = 12; }
      else if (hold === 'none') { p.fh = [2 - 4 * Math.sin(t), -12]; p.bh = [-1 + 4 * Math.sin(t), -12]; }
      else if (hold === 'saber') { p.fh = [5 - 2 * Math.sin(t), -14]; p.bh = [-1 + 4 * Math.sin(t), -12]; p.item = 'saber'; p.ia = 65; p.coatSwing = Math.sin(t); }
      else if (hold === 'club') { p.fh = [4 - 2 * Math.sin(t), -16]; p.bh = [-1 + 3 * Math.sin(t), -12]; p.item = 'club'; p.ia = -50; }
      else { p.fh = [3 - 4 * Math.sin(t), -13 + Math.abs(Math.sin(t))]; p.bh = [-1 + 4 * Math.sin(t), -12]; p.item = 'knife'; p.ia = 40; }
      out.push(p);
    }
    return out;
  };
  const dead = (item) => [
    { hip: 13, lean: -4, rot: 22, ff: [4, 0], bf: [-2, 0], fh: [-2, -24], bh: [-6, -21], hd: [-1, 0] },
    { hip: 12, lean: -2, rot: 58, ff: [5, 0], bf: [1, -1], fh: [-4, -22], bh: [-7, -19] },
    { hip: 12, lean: 0, rot: 90, dy: -3, ff: [5, 0], bf: [-1, 0], fh: [-1, -24], bh: [-5, -20] }
  ];
  const climb = () => [0, 1, 2, 3].map((i) => {
    const a = i % 2 === 0;
    return { hip: 14, lean: 1, frame: i, ff: [2, a ? -5 : 0], bf: [1, a ? 0 : -5], fh: [4, a ? -27 : -22], bh: [3, a ? -22 : -27], elbowF: 'back', elbowB: 'back' };
  });

  POSES.hero = {
    idle: [
      { hip: 14, lean: 0.5, ff: [3, 0], bf: [-3, 0], fh: [5, -13], bh: [-2, -12], item: 'knife', ia: 55 },
      { hip: 14, lean: 0.5, ff: [3, 0], bf: [-3, 0], fh: [5, -12], bh: [-2, -11], item: 'knife', ia: 55, frame: 1 }
    ],
    run: run('knife'),
    jumpUp: [{ hip: 15, lean: 1, ff: [5, -6], bf: [-3, -2], fh: [6, -19], bh: [-4, -16], item: 'knife', ia: 30 }],
    jumpDown: [{ hip: 15, lean: 1, ff: [3, -2], bf: [-3, -1], fh: [5, -17], bh: [-5, -18], item: 'knife', ia: 40 }],
    crouch: [{ hip: 7, lean: 4.5, tl: 9, ff: [6, 0], bf: [-7, 0], kneeB: 'down', fh: [8, -9], bh: [1, -8], item: 'knife', ia: 25 }],
    stab: [
      { hip: 14, lean: -0.5, ff: [3, 0], bf: [-3, 0], fh: [1, -18], bh: [-3, -13], item: 'knife', ia: -25 },
      { hip: 13.5, lean: 2.6, ff: [6, 0], bf: [-4, 0], fh: [11, -19], bh: [-4, -15], item: 'knife', ia: 0 },
      { hip: 14, lean: 1.4, ff: [4, 0], bf: [-3, 0], fh: [8, -16], bh: [-3, -13], item: 'knife', ia: 25 }
    ],
    crouchStab: [
      { hip: 7, lean: 4, tl: 9, ff: [6, 0], bf: [-7, 0], kneeB: 'down', fh: [4, -12], bh: [0, -8], item: 'knife', ia: -15 },
      { hip: 7, lean: 5.5, tl: 9, ff: [7, 0], bf: [-7, 0], kneeB: 'down', fh: [14, -10], bh: [0, -9], item: 'knife', ia: 0 },
      { hip: 7, lean: 5, tl: 9, ff: [6, 0], bf: [-7, 0], kneeB: 'down', fh: [10, -9], bh: [1, -8], item: 'knife', ia: 20 }
    ],
    jumpStab: [
      { hip: 15, lean: 1, ff: [5, -6], bf: [-3, -2], fh: [2, -21], bh: [-4, -16], item: 'knife', ia: -30 },
      { hip: 15, lean: 2.5, ff: [5, -5], bf: [-3, -1], fh: [11, -18], bh: [-5, -17], item: 'knife', ia: 10 }
    ],
    climb: climb(),
    throw: [
      { hip: 14, lean: -1, ff: [4, 0], bf: [-4, 0], fh: [-5, -22], bh: [4, -15], item: 'grenade', elbowF: 'down' },
      { hip: 13.5, lean: 2, ff: [5, 0], bf: [-4, 0], fh: [10, -20], bh: [-4, -12] }
    ],
    rocket: [{ hip: 14, lean: 0.5, ff: [4, 0], bf: [-4, 0], fh: [6, -20], bh: [2, -19], item: 'launcher', ia: 0 }],
    hurt: [{ hip: 13, lean: -3, ff: [4, 0], bf: [-3, 0], fh: [-3, -24], bh: [-6, -20], hd: [-1, 0] }],
    dead: dead(),
    victory: [{ hip: 14, lean: 0.5, ff: [4, 0], bf: [-4, 0], fh: [3, -31], bh: [-2, -12], item: 'knife', ia: -90, elbowF: 'fwd' }]
  };

  const soldier = {
    idle: [
      { hip: 14, lean: 0.5, ff: [3, 0], bf: [-3, 0], fh: [7, -15], bh: [2, -14], item: 'rifle', ia: 12 },
      { hip: 14, lean: 0.5, ff: [3, 0], bf: [-3, 0], fh: [7, -14], bh: [2, -13], item: 'rifle', ia: 12 }
    ],
    run: run('rifle'),
    jab: [
      { hip: 14, lean: -1, ff: [3, 0], bf: [-4, 0], fh: [2, -16], bh: [-3, -15], item: 'rifle', ia: 0 },
      { hip: 13.5, lean: 3, ff: [6, 0], bf: [-4, 0], fh: [11, -16], bh: [6, -15], item: 'rifle', ia: 0 },
      { hip: 14, lean: 1, ff: [4, 0], bf: [-3, 0], fh: [8, -15], bh: [3, -14], item: 'rifle', ia: 8 }
    ],
    aim: [{ hip: 14, lean: 0, ff: [4, 0], bf: [-4, 0], fh: [8, -21], bh: [3, -20], item: 'rifle', ia: 0 }],
    kneel: [{ hip: 7, lean: 2.5, tl: 9.5, ff: [6, 0], bf: [-7, 0], kneeB: 'down', fh: [9, -12], bh: [4, -11], item: 'rifle', ia: 0 }],
    climb: climb(),
    fall: [{ hip: 15, lean: 0, ff: [4, -3], bf: [-3, -1], fh: [6, -22], bh: [-5, -21], item: 'rifle', ia: -20 }],
    throw: [
      { hip: 14, lean: -1, ff: [4, 0], bf: [-4, 0], fh: [-5, -22], bh: [4, -15], item: 'grenade', elbowF: 'down' },
      { hip: 13.5, lean: 2, ff: [5, 0], bf: [-4, 0], fh: [10, -20], bh: [-4, -12] }
    ],
    kick: [
      { hip: 15, lean: -1, ff: [5, -9], bf: [-3, -1], fh: [4, -20], bh: [-4, -19] },
      { hip: 15, lean: -2.5, ff: [12, -9], bf: [-5, -5], fh: [3, -21], bh: [-5, -21], kneeF: 'down' }
    ],
    hang: [{ hip: 14, lean: 0, ff: [2, 1], bf: [-2, 2], fh: [3, -29], bh: [-3, -29], elbowF: 'fwd', elbowB: 'back' }],
    pistol: [{ hip: 14, lean: 0, ff: [4, 0], bf: [-4, 0], fh: [10, -20], bh: [-2, -13], item: 'pistol', ia: 0 }],
    mg: [{ hip: 7, lean: 2, tl: 9.5, ff: [6, 0], bf: [-7, 0], kneeB: 'down', fh: [8, -11], bh: [3, -10], item: 'mg', ia: 0 }],
    snipe: [{ hip: 7, lean: 2.5, tl: 9.5, ff: [6, 0], bf: [-7, 0], kneeB: 'down', fh: [9, -12], bh: [4, -11], item: 'sniper', ia: 0 }],
    dead: dead()
  };
  POSES.soldier = soldier;
  POSES.knifer = {
    idle: soldier.kick.slice(0, 0).concat([{ hip: 14, lean: 1, ff: [4, 0], bf: [-4, 0], fh: [6, -16], bh: [-2, -17] }]),
    run: run('none'),
    kick: soldier.kick,
    fall: soldier.fall,
    climb: climb(),
    dead: dead()
  };
  POSES.captive = {
    tied: [
      { hip: 14, lean: -0.5, ff: [3, 0], bf: [-3, 0], fh: [-3, -12], bh: [-4, -13], tied: true, hd: [0, 1] },
      { hip: 14, lean: 0.5, ff: [3, 0], bf: [-3, 0], fh: [-3, -12], bh: [-4, -13], tied: true, hd: [1, 0] }
    ],
    salute: [{ hip: 14, lean: 0, ff: [3, 0], bf: [-3, 0], fh: [4, -27], bh: [-2, -12], elbowF: 'fwd' }],
    run: run('none')
  };
  POSES.general = {
    idle: [
      { hip: 14, lean: 0, ff: [3, 0], bf: [-3, 0], fh: [6, -14], bh: [-3, -13], item: 'saber', ia: 70 },
      { hip: 14, lean: 0, ff: [3, 0], bf: [-3, 0], fh: [6, -13], bh: [-3, -12], item: 'saber', ia: 70 }
    ],
    run: run('saber'),
    slash: [
      { hip: 14, lean: -1, ff: [4, 0], bf: [-4, 0], fh: [1, -28], bh: [-4, -14], item: 'saber', ia: -70, elbowF: 'back' },
      { hip: 13, lean: 3, ff: [7, 0], bf: [-5, 0], fh: [11, -16], bh: [-5, -14], item: 'saber', ia: 25 },
      { hip: 13, lean: 2, ff: [6, 0], bf: [-4, 0], fh: [7, -9], bh: [-4, -13], item: 'saber', ia: 80 }
    ],
    shoot: [{ hip: 14, lean: 0, ff: [4, 0], bf: [-4, 0], fh: [10, -20], bh: [-3, -13], item: 'pistol', ia: 0, itemB: 'saber', iaB: 80 }],
    throw: soldier.throw,
    dash: [{ hip: 12, lean: 4, ff: [8, 0], bf: [-7, 0], fh: [12, -15], bh: [-6, -13], item: 'saber', ia: 0 }],
    hurt: [{ hip: 13, lean: -3, ff: [4, 0], bf: [-3, 0], fh: [-3, -22], bh: [-6, -20], hd: [-1, 0], item: 'saber', ia: 120 }],
    dead: dead()
  };
  POSES.brute = {
    idle: [
      { hip: 14, lean: 0.5, ff: [4, 0], bf: [-4, 0], fh: [5, -16], bh: [-3, -12], item: 'club', ia: -50 },
      { hip: 14, lean: 0.5, ff: [4, 0], bf: [-4, 0], fh: [5, -15], bh: [-3, -11], item: 'club', ia: -50 }
    ],
    run: run('club'),
    raise: [{ hip: 14, lean: -2, ff: [4, 0], bf: [-5, 0], fh: [-1, -30], bh: [-5, -16], item: 'club', ia: -110, elbowF: 'back' }],
    smash: [
      { hip: 12, lean: 4, ff: [7, 0], bf: [-6, 0], fh: [12, -10], bh: [-5, -13], item: 'club', ia: 70 },
      { hip: 11, lean: 5, ff: [7, 0], bf: [-6, 0], fh: [12, -5], bh: [-4, -11], item: 'club', ia: 90 }
    ],
    charge: [{ hip: 12, lean: 5, ff: [7, 0], bf: [-7, 0], fh: [10, -18], bh: [-5, -12], item: 'club', ia: -10 }],
    stun: [
      { hip: 13, lean: -2, ff: [4, 0], bf: [-4, 0], fh: [3, -9], bh: [-4, -10], item: 'club', ia: 80, hd: [-1, 1] },
      { hip: 13, lean: -1, ff: [4, 0], bf: [-4, 0], fh: [3, -9], bh: [-4, -10], item: 'club', ia: 80, hd: [1, 1] }
    ],
    throw: [
      { hip: 14, lean: -2, ff: [5, 0], bf: [-5, 0], fh: [-4, -30], bh: [4, -26], elbowF: 'back' },
      { hip: 13, lean: 3, ff: [6, 0], bf: [-5, 0], fh: [10, -24], bh: [6, -22] }
    ],
    dead: dead()
  };
})();

/* ---- sprite cache --------------------------------------------------------- */
const CHARS = {
  hero: { pal: PAL.hero, poses: 'hero', k: 1 },
  grunt: { pal: PAL.grunt, poses: 'soldier', k: 1 },
  officer: { pal: PAL.officer, poses: 'soldier', k: 1 },
  grenadier: { pal: PAL.grenadier, poses: 'soldier', k: 1 },
  striker: { pal: PAL.striker, poses: 'knifer', k: 1 },
  sniper: { pal: PAL.sniper, poses: 'soldier', k: 1 },
  gunner: { pal: PAL.gunner, poses: 'soldier', k: 1 },
  para: { pal: PAL.gunner, poses: 'soldier', k: 1 },
  guard: { pal: PAL.guard, poses: 'soldier', k: 1.08 },
  captive: { pal: PAL.captive, poses: 'captive', k: 1 },
  general: { pal: PAL.general, poses: 'general', k: 1.18 },
  brute: { pal: PAL.brute, poses: 'brute', k: 1.75 }
};

const SPR_CACHE = {};
function getSprite(kind, anim, frame, facing, flash) {
  const key = kind + '|' + anim + '|' + frame + '|' + (facing < 0 ? 'L' : 'R') + (flash ? '|w' : '');
  let s = SPR_CACHE[key];
  if (s) return s;
  if (flash) {
    const base = getSprite(kind, anim, frame, facing, false);
    s = { cv: silhouette(base.cv, '#ffffff'), ox: base.ox, oy: base.oy };
  } else if (facing < 0) {
    const base = getSprite(kind, anim, frame, 1, false);
    s = { cv: flipCanvas(base.cv), ox: base.cv.width - base.ox, oy: base.oy };
  } else {
    const def = CHARS[kind];
    const set = POSES[def.poses];
    const list = set[anim] || set.idle || set.run;
    const pose = list[frame % list.length];
    s = renderPuppet(pose, def.pal, def.k);
  }
  SPR_CACHE[key] = s;
  return s;
}
function animLen(kind, anim) {
  const set = POSES[CHARS[kind].poses];
  return (set[anim] || set.idle || set.run).length;
}
function drawSprite(g, kind, anim, frame, facing, x, y, flash, alpha) {
  const s = getSprite(kind, anim, frame, facing, flash);
  if (alpha !== undefined && alpha < 1) { g.globalAlpha = alpha; g.drawImage(s.cv, Math.round(x - s.ox), Math.round(y - s.oy)); g.globalAlpha = 1; }
  else g.drawImage(s.cv, Math.round(x - s.ox), Math.round(y - s.oy));
}

/* ---- non-human sprites: drawn once into canvases ------------------------ */
const MISC = {};
function miscSprite(key, w, h, draw, noOutline) {
  if (MISC[key]) return MISC[key];
  const cv = makeCanvas(w, h);
  draw(cv.getContext('2d'), w, h);
  if (!noOutline) outlineCanvas(cv, OUTLINE);
  MISC[key] = { cv, flip: flipCanvas(cv), w, h };
  return MISC[key];
}

function dogSprite(frame, flash) {
  const key = 'dog' + frame + (flash ? 'w' : '');
  if (MISC[key]) return MISC[key];
  const base = miscSprite('dogb' + frame, 24, 16, (g) => {
    const body = '#2b2422', tan = '#a8653a', dark = '#181312';
    const legs = [
      [[8, 11, 6, 15], [16, 11, 18, 15], [7, 11, 9, 15], [15, 11, 13, 15]],
      [[8, 11, 10, 15], [16, 11, 14, 15], [7, 11, 5, 15], [15, 11, 17, 15]],
      [[8, 11, 4, 13], [16, 11, 20, 13], [7, 11, 3, 14], [15, 11, 21, 14]],
      [[8, 11, 8, 15], [16, 11, 16, 15], [7, 11, 7, 15], [15, 11, 15, 15]]
    ][frame % 4];
    legs.forEach(([x0, y0, x1, y1], i) => stampLine(g, x0, y0, x1, y1, 2, i < 2 ? body : dark));
    g.fillStyle = body; g.fillRect(5, 7, 13, 5);
    g.fillStyle = tan; g.fillRect(6, 11, 10, 1); g.fillRect(17, 9, 2, 3);
    g.fillStyle = body; g.fillRect(16, 4, 5, 5); g.fillRect(20, 6, 3, 3);
    g.fillStyle = tan; g.fillRect(21, 8, 2, 1);
    g.fillStyle = dark; g.fillRect(17, 2, 2, 3);
    g.fillStyle = '#ffd34a'; g.fillRect(19, 5, 1, 1);
    stampLine(g, 5, 8, 2, frame % 2 ? 5 : 6, 1, body);
  });
  const res = flash ? { cv: silhouette(base.cv, '#ffffff'), flip: silhouette(base.flip, '#ffffff'), w: 24, h: 16 } : base;
  MISC[key] = res;
  return res;
}

function crateSprite(broken) {
  return miscSprite('crate' + (broken ? 'b' : ''), 16, 14, (g) => {
    g.fillStyle = '#9b6a36'; g.fillRect(0, 0, 16, 14);
    g.fillStyle = '#7a5027'; g.fillRect(0, 0, 16, 2); g.fillRect(0, 12, 16, 2); g.fillRect(0, 0, 2, 14); g.fillRect(14, 0, 2, 14);
    stampLine(g, 2, 2, 13, 11, 2, '#7a5027');
    g.fillStyle = '#c38c4f'; g.fillRect(3, 3, 3, 1);
    if (broken) { g.clearRect(5, 0, 4, 6); g.clearRect(9, 8, 5, 6); }
  });
}

function barrelSprite() {
  return miscSprite('barrel', 12, 16, (g) => {
    g.fillStyle = '#b8352a'; g.fillRect(0, 1, 12, 14);
    g.fillStyle = '#d9584a'; g.fillRect(2, 1, 2, 14);
    g.fillStyle = '#7d2019'; g.fillRect(0, 4, 12, 1); g.fillRect(0, 11, 12, 1); g.fillRect(9, 1, 3, 14);
    g.fillStyle = '#f2d24a'; g.fillRect(4, 6, 4, 4); g.fillStyle = '#2b1d14'; g.fillRect(5, 7, 2, 2);
  });
}

function cageSprite(open) {
  return miscSprite('cage' + (open ? 'o' : ''), 24, 34, (g) => {
    g.fillStyle = '#3a3a42'; g.fillRect(0, 0, 24, 3); g.fillRect(0, 31, 24, 3);
    for (let x = 1; x < 24; x += 5) {
      if (open && x > 4 && x < 20) continue;
      g.fillStyle = '#5c5c68'; g.fillRect(x, 3, 2, 28);
      g.fillStyle = '#7a7a88'; g.fillRect(x, 3, 1, 28);
    }
    if (!open) { g.fillStyle = '#e3bd4b'; g.fillRect(19, 14, 4, 5); g.fillStyle = '#9b7a22'; g.fillRect(20, 16, 2, 2); }
  });
}

const PICKUPS = {
  tri: { label: 'TRI-KNIFE', color: '#d9e2ea', ammo: 6 },
  gren: { label: 'GRENADE', color: '#8fbf4a', ammo: 4 },
  rocket: { label: 'ROCKET', color: '#f0a43a', ammo: 3 },
  medal: { label: 'MEDAL', color: '#f2c94c' },
  ration: { label: 'RATION', color: '#e2584a' },
  life: { label: '1UP', color: '#4ad16a' }
};

function pickupIcon(type) {
  return miscSprite('pk' + type, 12, 12, (g) => {
    if (type === 'tri') {
      for (const [y, d] of [[3, -1], [6, 0], [9, 1]]) { stampLine(g, 1, y, 3, y, 1, '#4a3424'); stampLine(g, 4, y, 10, y + d, 1, '#e3e9ef'); }
    } else if (type === 'gren') {
      g.fillStyle = '#3f5a2a'; g.fillRect(3, 4, 7, 7); g.fillStyle = '#6f8f45'; g.fillRect(4, 5, 2, 2);
      g.fillStyle = '#9a9a9a'; g.fillRect(5, 1, 3, 3); g.fillRect(8, 2, 2, 1);
    } else if (type === 'rocket') {
      g.fillStyle = '#58623c'; g.fillRect(0, 5, 9, 3); g.fillStyle = '#d8402f'; g.fillRect(9, 4, 3, 5); g.fillStyle = '#e8e8e8'; g.fillRect(2, 5, 1, 3);
    } else if (type === 'medal') {
      g.fillStyle = '#c62e2e'; g.fillRect(4, 0, 4, 4); g.fillStyle = '#f2c94c'; g.fillRect(2, 4, 8, 7); g.fillStyle = '#fff2a8'; g.fillRect(4, 6, 2, 2);
    } else if (type === 'ration') {
      g.fillStyle = '#e2e2e2'; g.fillRect(1, 2, 10, 9); g.fillStyle = '#d9372b'; g.fillRect(5, 3, 2, 7); g.fillRect(2, 6, 8, 2);
    } else if (type === 'life') {
      g.fillStyle = '#2f4774'; g.fillRect(2, 5, 8, 7); g.fillStyle = '#ecb68c'; g.fillRect(3, 0, 6, 6); g.fillStyle = '#e8392a'; g.fillRect(3, 1, 6, 1);
      g.fillStyle = '#2b1a12'; g.fillRect(3, 0, 6, 1);
    }
  });
}

/** Small head icon used for lives in the HUD. */
function lifeIcon() {
  return miscSprite('lifeicon', 8, 8, (g) => {
    g.fillStyle = '#ecb68c'; g.fillRect(1, 1, 6, 6);
    g.fillStyle = '#2b1a12'; g.fillRect(1, 0, 6, 2);
    g.fillStyle = '#e8392a'; g.fillRect(1, 2, 6, 1); g.fillRect(0, 2, 1, 2);
    g.fillStyle = '#1a1014'; g.fillRect(4, 4, 1, 1);
  });
}
