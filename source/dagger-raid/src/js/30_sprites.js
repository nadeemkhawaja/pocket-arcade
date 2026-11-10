/* ==========================================================================
   Character data: palettes, inverse kinematics and the pose library.
   Local frame: origin at the feet, +x is forward (facing right), y down.
   Rendering lives in 31_soldiers.js.
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

/* ---- the cast ------------------------------------------------------------- */
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

const PICKUPS = {
  tri: { label: 'TRI-KNIFE', color: '#d9e2ea', ammo: 6 },
  gren: { label: 'GRENADE', color: '#8fbf4a', ammo: 4 },
  rocket: { label: 'ROCKET', color: '#f0a43a', ammo: 3 },
  medal: { label: 'MEDAL', color: '#f2c94c' },
  ration: { label: 'RATION', color: '#e2584a' },
  life: { label: '1UP', color: '#4ad16a' }
};

/* ---- ninjas and alternate outfits ------------------------------------------- */
PAL.ninja = {
  skin: '#d9a27c', skin2: '#b0785a', hair: '#0e0d12', top: '#252c40', top2: '#181d2c', pants: '#20263a', pants2: '#151a28',
  boot: '#0c0e14', boot2: '#2a3044', hood: '#252c40', glove: '#1a1f2e', accent: '#d6312a', gear: '#7a1e26', head: 'ninja'
};
PAL.heroRaven = {
  skin: '#ecb68c', skin2: '#c88a62', hair: '#15121a', top: '#262a36', top2: '#191c25', vest: '#3d4456', vest2: '#292e3b',
  pants: '#1e212b', pants2: '#14161d', boot: '#0c0d10', boot2: '#2c303a', band: '#8a6aff', gear: '#3a3f4c', head: 'band'
};
PAL.heroCrimson = {
  skin: '#ecb68c', skin2: '#c88a62', hair: '#2b1a12', top: '#9a222b', top2: '#6e161e', vest: '#2e2824', vest2: '#1c1816',
  pants: '#322d34', pants2: '#231f25', boot: '#161316', boot2: '#3e383c', band: '#f2c94c', gear: '#c9a24a', head: 'band'
};
const HERO_OUTFITS = {
  commando: { name: 'COMMANDO', pal: PAL.hero, note: 'STANDARD ISSUE' },
  raven: { name: 'RAVEN', pal: PAL.heroRaven, need: 'stage3', note: 'REACH STAGE 3 TO UNLOCK' },
  crimson: { name: 'CRIMSON', pal: PAL.heroCrimson, need: 'clear', note: 'FINISH THE MISSION TO UNLOCK' }
};

(function morePoses() {
  const H = POSES.hero;
  // second and third hits of the knife combo
  H.slash = [
    { hip: 14, lean: -1, ff: [3, 0], bf: [-4, 0], fh: [-2, -25], bh: [-4, -13], item: 'knife', ia: -110, elbowF: 'back' },
    { hip: 13.2, lean: 3, ff: [6.5, 0], bf: [-4.5, 0], fh: [11, -17], bh: [-5, -14], item: 'knife', ia: 15 },
    { hip: 13.5, lean: 2, ff: [5.5, 0], bf: [-4, 0], fh: [8, -9], bh: [-4, -13], item: 'knife', ia: 75 }
  ];
  H.thrust = [
    { hip: 13, lean: -1.5, ff: [2, 0], bf: [-5, 0], fh: [-1, -15], bh: [-5, -14], item: 'knife', ia: 0 },
    { hip: 11.5, lean: 5, ff: [9, 0], bf: [-8, 0], fh: [13.5, -17.5], bh: [-6, -13], item: 'knife', ia: 0 },
    { hip: 12.5, lean: 3, ff: [7, 0], bf: [-6, 0], fh: [10, -15], bh: [-5, -13], item: 'knife', ia: 15 }
  ];
  const tuck = { hip: 9.5, lean: 3.4, tl: 9, ff: [5, -7.5], bf: [1.5, -8.5], kneeB: 'down', fh: [8, -12], bh: [6, -11], item: 'knife', ia: 120, hd: [0.6, 0.8] };
  H.flip = [tuck];
  H.roll = [tuck];
  H.dive = [{ hip: 14, lean: 3, rot: -32, ff: [-2, -3], bf: [-6, -6], fh: [9, -9], bh: [-4, -20], item: 'knife', ia: 70 }];
  H.wall = [{ hip: 13.5, lean: -1.5, ff: [5, -7], bf: [-1, -2], fh: [9, -24], bh: [-5, -20], item: 'knife', ia: -60 }];
  H.airDash = [{ hip: 13, lean: 5, ff: [-3, -3], bf: [-8, -5], fh: [10, -15], bh: [-6, -13], item: 'knife', ia: 0 }];
  H.toss = [
    { hip: 14, lean: -1, ff: [4, 0], bf: [-4, 0], fh: [-5, -22], bh: [4, -15], item: 'star', elbowF: 'down' },
    { hip: 13.5, lean: 2, ff: [5, 0], bf: [-4, 0], fh: [10, -20], bh: [-4, -12] }
  ];
  H.flame = [{ hip: 13.6, lean: 1, ff: [5, 0], bf: [-4, 0], fh: [7, -15], bh: [1, -13], item: 'flamer', ia: 0 }];

  const S = POSES.soldier;
  const nrun = POSES.knifer.run.map((p, i) => {
    const t = (i / 8) * TAU;
    return Object.assign({}, p, { lean: 4.4, hip: p.hip - 0.7, fh: [-4 - Math.sin(t), -11.5], bh: [-7 + Math.sin(t), -10.5], item: 'katana', ia: 165 });
  });
  POSES.ninja = {
    idle: [
      { hip: 12.6, lean: 2, ff: [5, 0], bf: [-5, 0], fh: [7, -14], bh: [-2, -12], item: 'katana', ia: -35 },
      { hip: 12.9, lean: 2, ff: [5, 0], bf: [-5, 0], fh: [7, -14.6], bh: [-2, -12.5], item: 'katana', ia: -35, frame: 1 }
    ],
    run: nrun,
    slash: [
      { hip: 13.5, lean: -1, ff: [4, 0], bf: [-5, 0], fh: [0, -27], bh: [-4, -14], item: 'katana', ia: -100, elbowF: 'back' },
      { hip: 12, lean: 4, ff: [8, 0], bf: [-6, 0], fh: [12, -15], bh: [-5, -13], item: 'katana', ia: 20 },
      { hip: 12.5, lean: 3, ff: [7, 0], bf: [-5, 0], fh: [8, -8], bh: [-4, -12], item: 'katana', ia: 80 }
    ],
    throw: [
      { hip: 13.5, lean: -1, ff: [4, 0], bf: [-4, 0], fh: [-5, -22], bh: [5, -14], item: 'star', elbowF: 'down', itemB: 'katana', iaB: 150 },
      { hip: 13, lean: 3, ff: [6, 0], bf: [-5, 0], fh: [11, -19], bh: [-4, -12], itemB: 'katana', iaB: 150 }
    ],
    flip: [Object.assign({}, tuck, { item: 'katana', ia: 150 })],
    fall: [{ hip: 15, lean: 0, ff: [4, -3], bf: [-3, -1], fh: [6, -21], bh: [-5, -20], item: 'katana', ia: -30 }],
    kick: S.kick, climb: S.climb, dead: S.dead
  };
})();
CHARS.ninja = { pal: PAL.ninja, poses: 'ninja', k: 1 };

Object.assign(PICKUPS, {
  katana: { label: 'KATANA', color: '#dfe7f2', swings: 30 },
  star: { label: 'SHURIKEN', color: '#a8c4e8', ammo: 12 },
  flame: { label: 'FLAMETHROWER', color: '#ff8a3a', ammo: 60 }
});
