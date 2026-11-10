/* ==========================================================================
   Fighter data: palettes, inverse kinematics and the pose library.
   Local frame: origin at the feet, +x is forward (facing right), y down.
   Rendering lives in 31_fighters.js.
   ========================================================================== */

const OUTLINE = '#120a10';

const PAL = {
  tao: {
    skin: '#efbb92', skin2: '#c98d66', hair: '#1d1418', top: '#f3f1ea', top2: '#c9c4b6', trim: '#d6312a', inner: '#2a2030',
    pants: '#ebe8df', pants2: '#bdb7a8', shoe: '#1c1820', sash: '#d6312a', band: '#d6312a', head: 'band', style: 'gi', cuff: '#d6312a'
  },
  lian: {
    skin: '#f0c19e', skin2: '#c99573', hair: '#17111a', top: '#1f9a8a', top2: '#167267', trim: '#f2d16b', inner: '#f2d16b',
    pants: '#22222c', pants2: '#18181f', shoe: '#120f16', sash: '#f2d16b', band: '#e0403a', head: 'pony', style: 'tang', cuff: '#f2d16b'
  },
  thug: {
    skin: '#d39d76', skin2: '#a9724f', hair: '#2a2024', top: '#5b6172', top2: '#444958', trim: '#3a3e4a', inner: '#3a3e4a',
    pants: '#3e4250', pants2: '#30333f', shoe: '#1a1a20', sash: '#262830', band: '#8b2c2c', head: 'baldBand', style: 'vest', bare: true
  },
  dagger: {
    skin: '#d8a07a', skin2: '#ad7451', hair: '#141016', top: '#24232b', top2: '#1a1a20', trim: '#a3282a', inner: '#a3282a',
    pants: '#2c2b34', pants2: '#212028', shoe: '#121116', sash: '#a3282a', mask: '#121116', head: 'mask', style: 'gi'
  },
  monk: {
    skin: '#d6a27c', skin2: '#ad7653', hair: '#2a2024', top: '#c97b25', top2: '#a1611b', trim: '#8a3a1c', inner: '#8a3a1c',
    pants: '#c97b25', pants2: '#a1611b', shoe: '#5c3b22', sash: '#7d2f18', head: 'bald', style: 'robe', robe: true, barefoot: false
  },
  ninja: {
    skin: '#d9a27c', skin2: '#b0785a', hair: '#0e0d12', top: '#1d2030', top2: '#141623', trim: '#3c4466', inner: '#3c4466',
    pants: '#1d2030', pants2: '#141623', shoe: '#0e0d12', sash: '#5a2d78', hood: '#1d2030', head: 'hood', style: 'plain'
  },
  fan: {
    skin: '#f2c6a4', skin2: '#c99674', hair: '#140f16', top: '#c2283d', top2: '#931c2d', trim: '#f2c94c', inner: '#f2c94c',
    pants: '#2b1a2e', pants2: '#1f1322', shoe: '#140f16', sash: '#f2c94c', head: 'bun', style: 'tang', robe: true
  },
  spear: {
    skin: '#d39a74', skin2: '#a86f4f', hair: '#191317', top: '#2f5a8a', top2: '#22436a', trim: '#c9b26a', inner: '#c9b26a',
    pants: '#24344c', pants2: '#1a273a', shoe: '#14161c', sash: '#c9b26a', helm: '#5a6474', plume: '#d6312a', head: 'helm', style: 'armor'
  },
  ox: {
    skin: '#c98e6a', skin2: '#9e664a', hair: '#2b1d1a', top: '#5a3424', top2: '#43261a', trim: '#7a7f8a', inner: '#7a7f8a',
    pants: '#3a2a24', pants2: '#2c1f1a', shoe: '#1c1614', sash: '#7a7f8a', helm: '#6b7079', head: 'ox', style: 'vest', bare: true, bracers: true
  },
  mirror: {
    skin: '#c9b2d8', skin2: '#9e86b0', hair: '#e8e2f2', top: '#3b2a6e', top2: '#2b1e52', trim: '#c4a7ff', inner: '#c4a7ff',
    pants: '#2b1e52', pants2: '#20163e', shoe: '#170f2c', sash: '#c4a7ff', hood: '#2b1e52', head: 'cowl', style: 'robe', robe: true
  },
  abbot: {
    skin: '#d6a07c', skin2: '#ab7456', hair: '#e9e4dc', top: '#18151d', top2: '#100e14', trim: '#d9b04a', inner: '#8a1f2a',
    pants: '#18151d', pants2: '#100e14', shoe: '#0c0a10', sash: '#8a1f2a', head: 'demon', style: 'robe', robe: true
  },
  master: {
    skin: '#e7b996', skin2: '#bf8f70', hair: '#f4f1ea', top: '#8f7f62', top2: '#71644c', trim: '#c9b26a', inner: '#c9b26a',
    pants: '#6b5d47', pants2: '#55493a', shoe: '#2a221c', sash: '#c9b26a', head: 'sage', style: 'robe', robe: true
  }
};

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

function rotPt(p, r) {
  if (!r) return p;
  const c = Math.cos(r), s = Math.sin(r);
  return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
}

function solvePose(pose, k) {
  const hipY = -(pose.hip == null ? 13 : pose.hip) * k;
  const tl = (pose.tl || 10) * k;
  const lean = (pose.lean || 0) * k;
  const hip = [0, hipY];
  const neck = [lean, hipY - Math.sqrt(Math.max(1, tl * tl - lean * lean))];
  const hd = pose.hd || [0, 0];
  const head = [neck[0] + 0.5 * k + hd[0] * k, neck[1] - 3.5 * k + hd[1] * k];
  const shF = [neck[0] + 0.6 * k, neck[1] + 1.6 * k];
  const shB = [neck[0] - 0.6 * k, neck[1] + 1.6 * k];
  const S = (p) => [p[0] * k, p[1] * k];
  const legF = ik2(hip[0] + 1 * k, hip[1], ...S(pose.ff || [4, 0]), 7 * k, 7 * k, pose.kneeF || 'fwd');
  const legB = ik2(hip[0] - 1 * k, hip[1], ...S(pose.bf || [-4, 0]), 7 * k, 7 * k, pose.kneeB || 'fwd');
  const armF = ik2(shF[0], shF[1], ...S(pose.fh || [6, -16]), 5 * k, 5 * k, pose.elbowF || 'down');
  const armB = ik2(shB[0], shB[1], ...S(pose.bh || [3, -15]), 5 * k, 5 * k, pose.elbowB || 'down');
  const r = ((pose.rot || 0) * Math.PI) / 180;
  const R = (p) => rotPt(p, r);
  return {
    hip: R(hip), neck: R(neck), head: R(head), shF: R(shF), shB: R(shB),
    kneeF: R(legF.j), footF: R(legF.e), kneeB: R(legB.j), footB: R(legB.e),
    elbF: R(armF.j), handF: R(armF.e), elbB: R(armB.j), handB: R(armB.e), rot: r
  };
}

/* ---- pose library ------------------------------------------------------- */
const POSES = {};
(function buildPoses() {
  const cycle = (n, fn) => Array.from({ length: n }, (_, i) => fn((i / n) * TAU, i));
  const walk = (opt) => cycle(8, (t, i) => {
    const o = opt || {};
    const st = o.stride || 5.5, lf = o.lift || 2.6;
    const lift = (c) => (c > 0 ? lf * c : 0);
    const p = {
      hip: (o.hip || 12.8) - Math.abs(Math.sin(t)) * 0.5, lean: o.lean == null ? 1 : o.lean, frame: i,
      ff: [st * Math.sin(t) + 1, -lift(Math.cos(t))], bf: [st * Math.sin(t + Math.PI) - 1, -lift(Math.cos(t + Math.PI))],
      fh: o.fh ? [o.fh[0] - Math.sin(t) * (o.swing || 0), o.fh[1] + Math.abs(Math.sin(t)) * 0.6] : [8, -18],
      bh: o.bh ? [o.bh[0] + Math.sin(t) * (o.swing || 0), o.bh[1]] : [4.5, -16.5]
    };
    if (o.item) { p.item = o.item; p.ia = o.ia; }
    if (o.itemB) { p.itemB = o.itemB; p.iaB = o.iaB; }
    if (o.kneeF) p.kneeF = o.kneeF;
    return p;
  });
  const fall = (extra) => [
    Object.assign({ hip: 12.5, lean: -4, rot: 18, ff: [4, 0], bf: [-2, 0], fh: [-3, -25], bh: [-7, -22], hd: [-1, 0] }, extra || {}),
    Object.assign({ hip: 12, lean: -2, rot: 55, ff: [5, 0], bf: [1, -1], fh: [-5, -23], bh: [-8, -20] }, extra || {}),
    Object.assign({ hip: 12, lean: 0, rot: 88, dy: -3.5, ff: [5, 0], bf: [-1, 0], fh: [-1, -25], bh: [-6, -21] }, extra || {})
  ];
  const guard = { hip: 12.6, lean: 0.8, ff: [5.5, 0], bf: [-5.5, 0], fh: [8, -18], bh: [4.5, -16.5] };
  const G = (o) => Object.assign({}, guard, o);

  POSES.hero = {
    idle: [G({ frame: 0 }), G({ hip: 12.9, fh: [8, -18.5], bh: [4.5, -17], frame: 1 })],
    walk: walk({ fh: [8, -18], bh: [4.5, -16.5] }),
    crouch: [{ hip: 7, lean: 3.6, tl: 9.5, ff: [6.5, 0], bf: [-6.5, 0], kneeB: 'down', fh: [9, -13.5], bh: [5.5, -12.5] }],
    jumpUp: [{ hip: 15, lean: 1, ff: [5, -7], bf: [-2, -4.5], fh: [8, -21], bh: [4, -19], frame: 1 }],
    jumpDown: [{ hip: 15, lean: 0.5, ff: [4.5, -3], bf: [-3, -1.5], fh: [8, -20], bh: [3.5, -18] }],
    punch: [
      G({ lean: 0.2, fh: [3.5, -16.5], bh: [7, -18.5] }),
      G({ hip: 12.8, lean: 2.8, ff: [7, 0], bf: [-5, 0], fh: [16, -21.5], bh: [1.5, -16], fistF: true, frame: 1 }),
      G({ lean: 1.6, ff: [6.5, 0], fh: [11, -19.5], bh: [3, -16.5] })
    ],
    punch2: [
      G({ lean: 0.4, fh: [7, -18], bh: [1, -16] }),
      G({ hip: 12.6, lean: 3.2, ff: [7.5, 0], bf: [-5, 0], fh: [4.5, -17.5], bh: [15.5, -21], fistB: true, frame: 1 }),
      G({ lean: 1.8, fh: [7, -18], bh: [9, -19] })
    ],
    kick: [
      { hip: 13.4, lean: -1.2, ff: [5.5, -9.5], bf: [-3, 0], fh: [7, -19.5], bh: [1, -17] },
      { hip: 13.8, lean: -3.4, ff: [17, -12.5], bf: [-4, 0], fh: [4.5, -21], bh: [-3.5, -18], kneeF: 'down', frame: 1 },
      { hip: 13.4, lean: -1.6, ff: [9, -6], bf: [-4, 0], fh: [6.5, -20], bh: [0, -17] }
    ],
    highKick: [
      { hip: 13.6, lean: -1.6, ff: [6, -11], bf: [-3, 0], fh: [7, -20], bh: [1, -17] },
      { hip: 14, lean: -4.4, ff: [15, -20.5], bf: [-3, 0], fh: [3, -22], bh: [-5, -17.5], kneeF: 'down', frame: 1 },
      { hip: 13.5, lean: -2.2, ff: [10, -10], bf: [-4, 0], fh: [6, -20], bh: [0, -17] }
    ],
    crouchPunch: [
      { hip: 7, lean: 3.6, tl: 9.5, ff: [6.5, 0], bf: [-6.5, 0], kneeB: 'down', fh: [5, -12], bh: [7, -13] },
      { hip: 7, lean: 5, tl: 9.5, ff: [7.5, 0], bf: [-6.5, 0], kneeB: 'down', fh: [15.5, -11.5], bh: [4, -11], fistF: true, frame: 1 },
      { hip: 7, lean: 4.2, tl: 9.5, ff: [7, 0], bf: [-6.5, 0], kneeB: 'down', fh: [11, -12], bh: [5, -12] }
    ],
    sweep: [
      { hip: 6.5, lean: 3.4, tl: 9.2, ff: [6, 0], bf: [-6, 0], kneeB: 'down', fh: [8, -11], bh: [2, -6] },
      { hip: 5.5, lean: 3.8, tl: 9, ff: [17.5, -1.2], bf: [-4.5, 0], kneeB: 'down', kneeF: 'down', fh: [7, -10], bh: [-1, -1.5], frame: 1 },
      { hip: 6.5, lean: 3.4, tl: 9.2, ff: [10, -0.5], bf: [-5, 0], kneeB: 'down', fh: [8, -11], bh: [2, -5] }
    ],
    jumpKick: [
      { hip: 15, lean: -1, ff: [6, -9], bf: [-3, -5], fh: [7, -21], bh: [1, -19] },
      { hip: 15, lean: -2.4, ff: [16, -10], bf: [-4.5, -6], fh: [4, -21.5], bh: [-4, -18], kneeF: 'down', frame: 1 }
    ],
    jumpPunch: [
      { hip: 15, lean: 1, ff: [4, -6], bf: [-3, -3], fh: [4, -19], bh: [6, -20] },
      { hip: 15, lean: 3.4, ff: [3, -5], bf: [-4.5, -3], fh: [16, -18], bh: [-1, -17], fistF: true, frame: 1 }
    ],
    grabbed: [
      { hip: 12.8, lean: -0.6, ff: [4.5, 0], bf: [-4.5, 0], fh: [4, -17], bh: [2, -18.5], hd: [-0.4, 0] },
      { hip: 13, lean: 0.6, ff: [4, 0], bf: [-5, 0], fh: [5.5, -18.5], bh: [1, -17], hd: [0.4, 0], frame: 1 }
    ],
    hurt: [{ hip: 12.6, lean: -3.2, ff: [4.5, 0], bf: [-4, 0], fh: [-1, -23], bh: [-5, -20.5], hd: [-1, 0] }],
    dead: fall(),
    victory: [{ hip: 13.8, lean: 1.4, ff: [2.5, 0], bf: [-2.5, 0], fh: [6, -19.5], bh: [5.5, -20], hd: [0.5, 0.6] }],
    chi: [
      { hip: 11.8, lean: -0.6, ff: [6, 0], bf: [-6, 0], fh: [1.5, -13], bh: [1, -13.5] },
      { hip: 12.4, lean: 3.2, ff: [8.5, 0], bf: [-6, 0], fh: [16, -18], bh: [15, -16], frame: 1 }
    ],
    getUp: [{ hip: 8, lean: 3, tl: 9.5, ff: [6, 0], bf: [-5, 0], kneeB: 'down', fh: [8, -10], bh: [-2, -2] }],
    flex: [{ hip: 12.2, lean: 0, ff: [6.5, 0], bf: [-6.5, 0], fh: [13, -21], bh: [-9, -21], fistF: true, fistB: true, elbowF: 'up', elbowB: 'up' }],
    climb: cycle(4, (t, i) => ({ hip: 13, lean: 2, frame: i, ff: [4 + 3 * Math.sin(t), -3 - 3 * Math.max(0, Math.cos(t))], bf: [-2 + 3 * Math.sin(t + Math.PI), -3 * Math.max(0, Math.cos(t + Math.PI))], fh: [8 - Math.sin(t) * 2, -18], bh: [4 + Math.sin(t) * 2, -16.5] }))
  };

  POSES.thug = {
    idle: [
      { hip: 13, lean: 1.4, ff: [4.5, 0], bf: [-4.5, 0], fh: [10, -18.5], bh: [7, -18] },
      { hip: 13.2, lean: 1.4, ff: [4.5, 0], bf: [-4.5, 0], fh: [10, -19], bh: [7, -18.5], frame: 1 }
    ],
    walk: walk({ hip: 13, lean: 2, stride: 6, fh: [11, -19.5], bh: [8.5, -18.5], swing: 1.5 }),
    grab: [
      { hip: 12.8, lean: 2.4, ff: [6, 0], bf: [-5, 0], fh: [8, -18], bh: [7, -17] },
      { hip: 12.8, lean: 2.8, ff: [6, 0], bf: [-5, 0], fh: [8.5, -17.5], bh: [7.5, -16.5], frame: 1 }
    ],
    hurt: [{ hip: 12.6, lean: -3.2, ff: [4.5, 0], bf: [-4, 0], fh: [-1, -22], bh: [-5, -20], hd: [-1, 0] }],
    dead: fall()
  };

  POSES.dagger = {
    idle: [
      { hip: 13, lean: 0.4, ff: [5, 0], bf: [-5, 0], fh: [6, -17], bh: [-1, -21], itemB: 'dagger', iaB: -60 },
      { hip: 13.2, lean: 0.4, ff: [5, 0], bf: [-5, 0], fh: [6, -17.5], bh: [-1, -21.5], itemB: 'dagger', iaB: -60, frame: 1 }
    ],
    walk: walk({ hip: 13, fh: [6, -17], bh: [-1, -20], itemB: 'dagger', iaB: -60 }),
    throwHigh: [
      { hip: 13.4, lean: -1.4, ff: [5, 0], bf: [-5, 0], fh: [-4, -25], bh: [5, -18], item: 'dagger', ia: -120 },
      { hip: 13, lean: 2.6, ff: [7, 0], bf: [-5, 0], fh: [15, -21], bh: [-2, -17], frame: 1 }
    ],
    throwLow: [
      { hip: 7.5, lean: 2, tl: 9.5, ff: [6, 0], bf: [-6.5, 0], kneeB: 'down', fh: [-3, -12], bh: [4, -11], item: 'dagger', ia: 160 },
      { hip: 7, lean: 4.5, tl: 9.5, ff: [7, 0], bf: [-6.5, 0], kneeB: 'down', fh: [15, -6], bh: [2, -10], frame: 1 }
    ],
    hurt: POSES.thug.hurt,
    dead: fall()
  };

  POSES.monk = {
    idle: [
      { hip: 13, lean: 1, ff: [5.5, 0], bf: [-5, 0], fh: [9, -17.5], bh: [2, -15], item: 'shield' },
      { hip: 13.2, lean: 1, ff: [5.5, 0], bf: [-5, 0], fh: [9, -18], bh: [2, -15.5], item: 'shield', frame: 1 }
    ],
    walk: walk({ hip: 13, stride: 4.5, fh: [9, -17.5], bh: [2, -15], item: 'shield' }),
    bash: [
      { hip: 13, lean: -0.6, ff: [5, 0], bf: [-5.5, 0], fh: [5.5, -18], bh: [1, -15], item: 'shield' },
      { hip: 12.6, lean: 3.6, ff: [8, 0], bf: [-5, 0], fh: [15, -18], bh: [3, -15], item: 'shield', frame: 1 }
    ],
    block: [{ hip: 12.4, lean: 2, ff: [6, 0], bf: [-5.5, 0], fh: [9.5, -20], bh: [3, -16], item: 'shield' }],
    hurt: [{ hip: 12.6, lean: -3, ff: [4.5, 0], bf: [-4, 0], fh: [3, -20], bh: [-4, -19], hd: [-1, 0], item: 'shield' }],
    dead: fall()
  };

  POSES.ninja = {
    idle: [
      { hip: 12, lean: 2, ff: [6, 0], bf: [-6, 0], fh: [8, -16], bh: [2, -14], item: 'blade', ia: -40 },
      { hip: 12.3, lean: 2, ff: [6, 0], bf: [-6, 0], fh: [8, -16.5], bh: [2, -14.5], item: 'blade', ia: -40, frame: 1 }
    ],
    walk: walk({ hip: 12.4, lean: 3, stride: 7, lift: 3.6, fh: [8, -15], bh: [-2, -13], item: 'blade', ia: 160, swing: 2 }),
    slash: [
      { hip: 13, lean: -1, ff: [5, 0], bf: [-6, 0], fh: [1, -25], bh: [-3, -16], item: 'blade', ia: -100 },
      { hip: 12, lean: 4, ff: [8.5, 0], bf: [-6, 0], fh: [14, -15], bh: [-4, -14], item: 'blade', ia: 20, frame: 1 },
      { hip: 12, lean: 3, ff: [8, 0], bf: [-6, 0], fh: [10, -10], bh: [-3, -14], item: 'blade', ia: 70 }
    ],
    hurt: POSES.thug.hurt,
    dead: fall()
  };

  /* bosses */
  POSES.fan = {
    idle: [
      { hip: 13.2, lean: 0.6, ff: [4.5, 0], bf: [-4.5, 0], fh: [8, -20], bh: [-4, -21], item: 'fan', ia: -60, itemB: 'fan', iaB: -120 },
      { hip: 13.4, lean: 0.6, ff: [4.5, 0], bf: [-4.5, 0], fh: [8, -20.5], bh: [-4, -21.5], item: 'fan', ia: -55, itemB: 'fan', iaB: -125, frame: 1 }
    ],
    walk: walk({ hip: 13.2, stride: 4.8, fh: [8, -20], bh: [-4, -21], item: 'fan', ia: -60, itemB: 'fan', iaB: -120 }),
    throw: [
      { hip: 13.4, lean: -1.6, ff: [5, 0], bf: [-5, 0], fh: [-5, -22], bh: [-4, -21], item: 'fanClosed', ia: -150, itemB: 'fan', iaB: -120 },
      { hip: 13, lean: 3, ff: [7.5, 0], bf: [-5, 0], fh: [16, -19], bh: [-4, -20], itemB: 'fan', iaB: -120, frame: 1 }
    ],
    spin: cycle(4, (t, i) => ({
      hip: 12.5, lean: 0, ff: [4 * Math.cos(t), 0], bf: [-4 * Math.cos(t), -1], frame: i,
      fh: [12 * Math.cos(t), -19 + 2 * Math.sin(t)], bh: [-12 * Math.cos(t), -19 - 2 * Math.sin(t)], item: 'fan', ia: i * 90, itemB: 'fan', iaB: 180 + i * 90
    })),
    throwLow: [
      { hip: 8, lean: 1.4, tl: 9.6, ff: [6, 0], bf: [-6.5, 0], kneeB: 'down', fh: [-5, -9], bh: [-3, -16], item: 'fanClosed', ia: 170, itemB: 'fan', iaB: -120 },
      { hip: 7.6, lean: 4.4, tl: 9.6, ff: [7.5, 0], bf: [-6.5, 0], kneeB: 'down', fh: [15, -6], bh: [-3, -16], itemB: 'fan', iaB: -120, frame: 1 }
    ],
    slash: [
      { hip: 13.2, lean: -1, ff: [5, 0], bf: [-5, 0], fh: [2, -27], bh: [-4, -18], item: 'fan', ia: -90 },
      { hip: 12.6, lean: 3.4, ff: [8, 0], bf: [-5.5, 0], fh: [15, -16], bh: [-4, -17], item: 'fan', ia: 20, frame: 1 }
    ],
    hurt: [{ hip: 12.8, lean: -3, ff: [4.5, 0], bf: [-4, 0], fh: [-1, -24], bh: [-5, -21], hd: [-1, 0], item: 'fanClosed', ia: -120 }],
    dead: fall()
  };

  POSES.spear = {
    idle: [
      { hip: 12.6, lean: 1.4, ff: [6, 0], bf: [-6, 0], fh: [6.5, -16], bh: [-2, -16.5], item: 'spear', ia: -6 },
      { hip: 12.9, lean: 1.4, ff: [6, 0], bf: [-6, 0], fh: [6.5, -16.5], bh: [-2, -17], item: 'spear', ia: -6, frame: 1 }
    ],
    walk: walk({ hip: 12.8, stride: 5, fh: [6.5, -16], bh: [-2, -16.5], item: 'spear', ia: -6 }),
    thrustHigh: [
      { hip: 12.8, lean: -1, ff: [5.5, 0], bf: [-6, 0], fh: [1, -20], bh: [-5, -20], item: 'spear', ia: -4 },
      { hip: 12.4, lean: 3.6, ff: [9, 0], bf: [-6, 0], fh: [14, -21], bh: [7, -20], item: 'spear', ia: 0, frame: 1 }
    ],
    thrustLow: [
      { hip: 8, lean: 1.5, tl: 9.6, ff: [6.5, 0], bf: [-7, 0], kneeB: 'down', fh: [1, -9], bh: [-5, -9], item: 'spear', ia: 8 },
      { hip: 7.5, lean: 4.6, tl: 9.6, ff: [8.5, 0], bf: [-7, 0], kneeB: 'down', fh: [14, -6], bh: [7, -7], item: 'spear', ia: 10, frame: 1 }
    ],
    vault: [{ hip: 15, lean: 2, ff: [4, -6], bf: [-3, -4], fh: [6, -16], bh: [2, -15], item: 'spear', ia: 70 }],
    spin: cycle(4, (t, i) => ({ hip: 12.4, lean: 0.5, ff: [6, 0], bf: [-6, 0], fh: [4, -17], bh: [1, -16], item: 'spear', ia: i * 45 - 20, frame: i })),
    hurt: [{ hip: 12.6, lean: -3, ff: [4.5, 0], bf: [-4, 0], fh: [-1, -22], bh: [-5, -20], hd: [-1, 0], item: 'spear', ia: -40 }],
    dead: fall()
  };

  POSES.ox = {
    idle: [
      { hip: 12.5, lean: 1.4, ff: [5.5, 0], bf: [-5.5, 0], fh: [9, -15], bh: [4, -14], fistF: true, fistB: true },
      { hip: 12.8, lean: 1.4, ff: [5.5, 0], bf: [-5.5, 0], fh: [9, -15.5], bh: [4, -14.5], fistF: true, fistB: true, frame: 1 }
    ],
    walk: walk({ hip: 12.6, lean: 1.8, stride: 4.5, lift: 2, fh: [9, -15], bh: [4, -14], swing: 1 }),
    raise: [{ hip: 13.2, lean: -1.6, ff: [5.5, 0], bf: [-6, 0], fh: [3, -27], bh: [-1, -27], fistF: true, fistB: true, elbowF: 'back', elbowB: 'back' }],
    slam: [
      { hip: 11, lean: 4.4, ff: [7.5, 0], bf: [-6, 0], fh: [13, -6], bh: [11, -5], fistF: true, fistB: true },
      { hip: 10, lean: 5.2, ff: [7.5, 0], bf: [-6, 0], fh: [13, -1.5], bh: [11, -1.5], fistF: true, fistB: true, frame: 1 }
    ],
    charge: [
      { hip: 8.6, lean: 7.6, tl: 10, ff: [8, 0], bf: [-8, 0], kneeB: 'down', fh: [14, -9], bh: [11, -8], fistF: true, fistB: true, hd: [1.5, 1] },
      { hip: 9, lean: 7.4, tl: 10, ff: [3, -1], bf: [-4, 0], kneeB: 'down', fh: [14, -10], bh: [11, -9], fistF: true, fistB: true, hd: [1.5, 1], frame: 1 }
    ],
    paw: [
      { hip: 10.5, lean: 4.5, ff: [7, 0], bf: [-7, 0], fh: [12, -12], bh: [9, -11], fistF: true, fistB: true, hd: [1, 0.5] },
      { hip: 10.5, lean: 4.5, ff: [7, 0], bf: [-9, -3], fh: [12, -12], bh: [9, -11], fistF: true, fistB: true, hd: [1, 0.5], frame: 1 }
    ],
    grab: [{ hip: 12.4, lean: 2.4, ff: [6, 0], bf: [-6, 0], fh: [15, -20], bh: [13, -14], elbowF: 'up' }],
    stun: [
      { hip: 12.5, lean: -2, ff: [4.5, 0], bf: [-4.5, 0], fh: [4, -10], bh: [-3, -10], hd: [-1, 1] },
      { hip: 12.5, lean: -1, ff: [4.5, 0], bf: [-4.5, 0], fh: [4, -10], bh: [-3, -10], hd: [1, 1], frame: 1 }
    ],
    hurt: [{ hip: 12.4, lean: -2.6, ff: [4.5, 0], bf: [-4, 0], fh: [-1, -20], bh: [-5, -19], hd: [-1, 0] }],
    dead: fall()
  };

  POSES.mirror = {
    idle: [
      { hip: 13.6, lean: 0, ff: [3, 0], bf: [-3, 0], fh: [6, -19], bh: [5, -18.5], dy: -2 },
      { hip: 13.6, lean: 0, ff: [3, 0], bf: [-3, 0], fh: [6, -19.5], bh: [5, -19], dy: -3, frame: 1 }
    ],
    walk: [{ hip: 13.6, lean: 1.5, ff: [2, 0], bf: [-3, 0], fh: [6, -19], bh: [4, -18], dy: -3 }],
    cast: [
      { hip: 13.6, lean: -1, ff: [3, 0], bf: [-3, 0], fh: [2, -27], bh: [-2, -26], dy: -2, item: 'talisman', ia: -90 },
      { hip: 13.4, lean: 2.6, ff: [5, 0], bf: [-3, 0], fh: [15.5, -20], bh: [14, -18], dy: -2, frame: 1 }
    ],
    hurt: [{ hip: 13, lean: -3, ff: [3, 0], bf: [-3, 0], fh: [-1, -23], bh: [-5, -21], hd: [-1, 0] }],
    dead: fall()
  };

  POSES.abbot = {
    idle: [
      { hip: 12.8, lean: 0.6, ff: [6, 0], bf: [-6, 0], fh: [10, -18], bh: [-3, -14] },
      { hip: 13, lean: 0.6, ff: [6, 0], bf: [-6, 0], fh: [10, -18.5], bh: [-3, -14.5], frame: 1 }
    ],
    walk: walk({ hip: 12.8, stride: 5.5, fh: [10, -18], bh: [-3, -14] }),
    palm: [
      { hip: 12.8, lean: -0.6, ff: [6, 0], bf: [-6, 0], fh: [3, -16], bh: [-2, -14] },
      { hip: 12.4, lean: 3.6, ff: [9, 0], bf: [-6, 0], fh: [17, -19], bh: [-3, -14], frame: 1 },
      { hip: 12.4, lean: 3, ff: [9, 0], bf: [-6, 0], fh: [8, -17], bh: [16, -16], frame: 0 }
    ],
    counter: [{ hip: 12, lean: -1, ff: [6.5, 0], bf: [-6.5, 0], fh: [7, -22], bh: [7, -14] }],
    breath: [{ hip: 12.6, lean: 2.6, ff: [8, 0], bf: [-6, 0], fh: [16, -20], bh: [15, -18] }],
    leap: [{ hip: 15, lean: 1, ff: [5, -7], bf: [-3, -4], fh: [9, -22], bh: [-4, -19] }],
    kick: POSES.hero.highKick,
    hurt: [{ hip: 12.6, lean: -3, ff: [4.5, 0], bf: [-4, 0], fh: [-1, -23], bh: [-5, -21], hd: [-1, 0] }],
    kneel: [{ hip: 7, lean: 3, tl: 9.5, ff: [6, 0], bf: [-6, 0], kneeB: 'down', fh: [8, -6], bh: [1, -6], hd: [0.5, 1] }],
    dead: fall()
  };

  POSES.master = {
    tied: [
      { hip: 7, lean: 1, tl: 9.6, ff: [5, 0], bf: [-6, 0], kneeB: 'down', fh: [-4, -9], bh: [-5, -10], tied: true, hd: [0, 0.5] },
      { hip: 7, lean: 1.5, tl: 9.6, ff: [5, 0], bf: [-6, 0], kneeB: 'down', fh: [-4, -9], bh: [-5, -10], tied: true, hd: [0.4, 0.2], frame: 1 }
    ],
    bow: [{ hip: 13.6, lean: 2.2, ff: [2.5, 0], bf: [-2.5, 0], fh: [6, -18.5], bh: [5.5, -19], hd: [0.6, 1] }],
    idle: [{ hip: 13.6, lean: 0.4, ff: [3, 0], bf: [-3, 0], fh: [5, -13], bh: [-2, -13] }]
  };
})();

/* ---- character table and sprite cache --------------------------------------- */
const CHARS = {
  tao: { pal: PAL.tao, poses: 'hero', k: 1.5 },
  lian: { pal: PAL.lian, poses: 'hero', k: 1.46 },
  thug: { pal: PAL.thug, poses: 'thug', k: 1.48 },
  dagger: { pal: PAL.dagger, poses: 'dagger', k: 1.45 },
  monk: { pal: PAL.monk, poses: 'monk', k: 1.52 },
  ninja: { pal: PAL.ninja, poses: 'ninja', k: 1.45 },
  fan: { pal: PAL.fan, poses: 'fan', k: 1.5 },
  spear: { pal: PAL.spear, poses: 'spear', k: 1.6 },
  ox: { pal: PAL.ox, poses: 'ox', k: 2.15 },
  mirror: { pal: PAL.mirror, poses: 'mirror', k: 1.55 },
  abbot: { pal: PAL.abbot, poses: 'abbot', k: 1.62 },
  master: { pal: PAL.master, poses: 'master', k: 1.45 }
};

const PICKUPS = {
  bun: { label: 'STEAMED BUN', color: '#f4efe2' },
  scroll: { label: 'CHI SCROLL', color: '#f2d16b' },
  coin: { label: 'JADE COIN', color: '#4ad19a' },
  peach: { label: 'GOLDEN PEACH', color: '#ff9a7a' }
};

