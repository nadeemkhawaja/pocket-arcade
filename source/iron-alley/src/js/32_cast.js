/* ==========================================================================
   The cast of Iron Alley, all original: two heroes, the Viper gang and its
   four bosses. Palettes feed the shared vector rig; poses are hand-placed
   key frames (facing right, feet on the ground at y = 0, up is negative).
   ========================================================================== */

Object.assign(PAL, {
  kade: { skin: '#e9b48c', skin2: '#c4875f', hair: '#1c1418', hairL: '#3a2a30', top: '#eeeae2', top2: '#c8c2b8', vest: '#d8283a', vest2: '#9a1426',
    pants: '#3a404c', pants2: '#2a2e38', boot: '#f2f2f2', boot2: '#b8bcc6', gear: '#20232c', head: 'spiky' },
  suki: { skin: '#f0c49c', skin2: '#c99670', hair: '#22161c', top: '#1aa6a0', top2: '#0e746e', vest: '#1aa6a0', vest2: '#0e746e',
    pants: '#1e2230', pants2: '#141722', boot: '#e84a7a', boot2: '#a82a54', band: '#ff4a8a', gear: '#ffffff', head: 'pony' },
  punk: { skin: '#dba27c', skin2: '#b47c5b', hair: '#3ad0ff', top: '#2a2a34', top2: '#1c1c24', vest: '#4a3a2a', vest2: '#342818',
    pants: '#5a3a6a', pants2: '#402a4c', boot: '#18161a', boot2: '#3a363c', gear: '#c0c4cc', head: 'mohawk' },
  punk2: { skin: '#c8906a', skin2: '#a06a4c', hair: '#ff5a3a', top: '#3a2a20', top2: '#2a1e16', vest: '#262a34', vest2: '#181c24',
    pants: '#2e4a3a', pants2: '#20362a', boot: '#18161a', boot2: '#3a363c', gear: '#c0c4cc', head: 'mohawk' },
  blade: { skin: '#d9a27c', skin2: '#b47c5b', hair: '#1a1a20', top: '#6a1e2a', top2: '#4a121c', pants: '#22262e', pants2: '#181a20',
    boot: '#121214', boot2: '#2e2e34', beanie: '#16181e', accent: '#cf3a2c', gear: '#26231f', head: 'beanie' },
  biker: { skin: '#e0aa82', skin2: '#b8805e', hair: '#2a2420', top: '#1a1c22', top2: '#101216', vest: '#3a3e48', vest2: '#262a32',
    pants: '#2c3444', pants2: '#1e2430', boot: '#121214', boot2: '#2e2e34', cap: '#c8323a', gear: '#a8aeb8', head: 'capb' },
  bruiser: { skin: '#c88e6c', skin2: '#9e6a4e', hair: '#2a1e18', top: '#1e2026', top2: '#141518', pants: '#3a3a44', pants2: '#28282f',
    boot: '#16141a', boot2: '#36323a', gear: '#8a8e98', head: 'bald', shades: true, bare: true },
  // bosses
  tank: { skin: '#b98262', skin2: '#8e5e44', hair: '#3a2a20', top: '#4a5a3a', top2: '#34402a', pants: '#2c2c34', pants2: '#1e1e24',
    boot: '#16141a', boot2: '#36323a', gear: '#d8a030', head: 'bald', beard: true, bare: true },
  ratchet: { skin: '#e2ae86', skin2: '#bb835f', hair: '#ff9a2a', top: '#3a5a8a', top2: '#284066', vest: '#e8a020', vest2: '#a87010',
    pants: '#2a3a5a', pants2: '#1c2840', boot: '#18161a', boot2: '#3a363c', gear: '#c0c4cc', head: 'spiky' },
  forge: { skin: '#c48a64', skin2: '#9a6446', hair: '#1a1410', top: '#3a2a22', top2: '#281c16', vest: '#6a4a30', vest2: '#4a321e',
    pants: '#2a2422', pants2: '#1c1816', boot: '#16141a', boot2: '#36323a', gear: '#ff8a30', head: 'bald', beard: true, bare: true },
  warden: { skin: '#e6b48e', skin2: '#c08862', hair: '#d8d8e0', top: '#14161e', top2: '#0c0d12', pants: '#14161e', pants2: '#0c0d12',
    boot: '#0a0a0e', boot2: '#2a2a34', accent: '#5af0c0', sash: '#5af0c0', gear: '#5af0c0', head: 'spiky', coat: true }
});

/* ---- poses ----------------------------------------------------------------------------------- */
(function brawlPoses() {
  const G = (o) => Object.assign({ hip: 12.9, lean: 1.6, ff: [5.6, 0], bf: [-4.6, 0], fh: [8.6, -19.4], bh: [5.6, -20.6], fistF: true, fistB: true }, o);
  const walk = (n, stride, pump) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU, sn = Math.sin(t), cs = Math.cos(t);
      // the swinging foot lifts only while it travels forward
      const lift = (c) => (c > 0 ? 2.7 * c : 0);
      const bob = Math.abs(cs);          // 1 when the legs pass, 0 at full stride
      out.push(G({
        hip: 12.4 + bob * 0.9, lean: pump ? 3 : 2.1 + sn * 0.25,
        ff: [0.6 + stride * sn, -lift(cs)], bf: [-0.6 + stride * Math.sin(t + Math.PI), -lift(-cs)],
        kneeF: cs > 0.3 ? 'up' : undefined, kneeB: -cs > 0.3 ? 'up' : undefined,
        fh: pump ? [3 - 5 * sn, -16] : [8.6 - sn * 1.3, -19.2 + bob * 0.5], bh: pump ? [-1 + 5 * sn, -15] : [5.6 + sn * 1.3, -20.4 + bob * 0.5],
        hd: [0.15 * sn, 0]
      }));
    }
    return out;
  };
  const fall = [
    G({ hip: 13, lean: -4, rot: 18, ff: [5, 0], bf: [-2, -1], fh: [-3, -25], bh: [-7, -21], hd: [-1, 0], fistF: false, fistB: false }),
    G({ hip: 12.5, lean: -2, rot: 50, dy: -3, ff: [7, -2], bf: [3, -1], fh: [-5, -22], bh: [-8, -18], fistF: false, fistB: false }),
    G({ hip: 12, lean: 0, rot: 80, dy: -4, ff: [6, -1], bf: [1, 0], fh: [-1, -24], bh: [-5, -20], fistF: false, fistB: false })
  ];
  const down = [G({ hip: 12, lean: 0, rot: 90, dy: -3, ff: [5, 0], bf: [-1, 0], fh: [-1, -24], bh: [-5, -20], fistF: false, fistB: false })];
  const getup = [
    G({ hip: 7, lean: 5, tl: 9, ff: [6, 0], bf: [-6, 0], kneeB: 'down', fh: [9, -4], bh: [2, -3], fistF: false, fistB: false }),
    G({ hip: 9.5, lean: 3.5, ff: [5, 0], bf: [-5, 0], fh: [7, -12], bh: [3, -11] }),
    G({})
  ];
  const set = {
    idle: [G({}), G({ hip: 12.7, lean: 1.8, fh: [8.8, -19], bh: [5.7, -20.2] }), G({ hip: 12.5, lean: 2, fh: [9, -18.6], bh: [5.8, -19.8] }), G({ hip: 12.7, lean: 1.8, fh: [8.8, -19], bh: [5.7, -20.2] })],
    walk: walk(12, 5.4, false),
    run: walk(8, 7, true),
    jab: [G({ fh: [4, -20] }), G({ lean: 2.4, ff: [6, 0], fh: [14, -21], bh: [3, -19] }), G({ lean: 1.6, fh: [9, -20.5] })],
    cross: [G({ lean: 0.5, bh: [1, -19] }), G({ lean: 3.6, ff: [7, 0], bf: [-6, 0], fh: [4, -18.5], bh: [14.5, -21], hip: 12.8 }), G({ lean: 2.5, ff: [6, 0], bf: [-5, 0], bh: [10, -20] })],
    upper: [G({ hip: 11.5, lean: 3, ff: [6, 0], bf: [-6, 0], fh: [6, -11] }), G({ hip: 14.6, lean: 1.4, ff: [6, -1], bf: [-6, 0], fh: [8.5, -30], bh: [2, -18] }), G({ hip: 14, lean: 0.6, fh: [7, -28] })],
    kick: [G({ hip: 13.6, lean: -1.4, ff: [5, -9], bf: [-3, 0], kneeF: 'up' }), G({ hip: 14, lean: -4.2, ff: [17, -14], bf: [-4, 0], fh: [2, -20], bh: [-3, -18] }), G({ hip: 13.8, lean: -2.6, ff: [8, -9], bf: [-3, 0] })],
    round: [G({ hip: 13.4, lean: -1.4, ff: [3, -9], bf: [-3, 0], kneeF: 'up' }), G({ hip: 14.4, lean: -4, ff: [15.5, -21], bf: [-3, 0], fh: [1, -20], bh: [-4, -18] }), G({ hip: 14, lean: -3, ff: [12, -16] }), G({ hip: 13.6, lean: -1, ff: [6, -4] })],
    air: [G({ hip: 15, lean: 1.2, ff: [5, -7], bf: [-3, -5], fh: [6, -21], bh: [2, -19] })],
    jkick: [G({ hip: 15, lean: -3.6, ff: [18, -12], bf: [-1, -8], kneeB: 'down', fh: [1, -22], bh: [-5, -19] })],
    jpunch: [G({ hip: 15, lean: 2.6, ff: [3, -7], bf: [-3, -4], fh: [13, -15], bh: [1, -19] })],
    elbow: [G({ lean: 0.6, bh: [2, -19] }), G({ lean: -2.4, ff: [3, 0], bf: [-7, 0], bh: [-10, -20], fh: [4, -19] }), G({ lean: -1, bh: [-6, -19.5] })],
    hold: [G({ lean: 2.8, ff: [5, 0], bf: [-5, 0], fh: [9.5, -15.5], bh: [8, -13.5], fistF: false, fistB: false })],
    knee: [G({ lean: 3.4, ff: [5, 0], fh: [9.5, -15], bh: [8, -13], fistF: false, fistB: false }), G({ hip: 14.2, lean: 4.6, ff: [7, -13], kneeF: 'up', bf: [-4, 0], fh: [9.5, -12], bh: [8, -11], fistF: false, fistB: false }), G({ lean: 3.4, ff: [5, -3], fh: [9.5, -15], bh: [8, -13], fistF: false, fistB: false })],
    toss: [G({ lean: 2.6, fh: [9, -18], bh: [8, -16], fistF: false, fistB: false }), G({ hip: 13, lean: -2.6, ff: [6, 0], bf: [-6, 0], fh: [-4, -28], bh: [-6, -26], fistF: false, fistB: false }), G({ hip: 12.4, lean: -4, ff: [7, 0], bf: [-7, 0], fh: [-9, -22], bh: [-10, -20], fistF: false, fistB: false })],
    spin: [G({ hip: 14.6, lean: -2, ff: [15, -15], bf: [-2, 0], fh: [-7, -22], bh: [7, -22], fistF: false, fistB: false }), G({ hip: 14.6, lean: -2, ff: [14, -13], bf: [-2, 0], fh: [-7, -20], bh: [7, -20], fistF: false, fistB: false })],
    hurt: [G({ hip: 13, lean: -3.4, ff: [4, 0], bf: [-4, 0], fh: [1, -17], bh: [-3, -15], hd: [-1, 0.4], fistF: false, fistB: false }), G({ hip: 12.4, lean: -2.2, ff: [4, 0], bf: [-4, 0], fh: [3, -15], bh: [-2, -14] })],
    hurtLow: [G({ hip: 11.6, lean: 4.6, ff: [4, 0], bf: [-4, 0], fh: [6, -9], bh: [4, -9], hd: [0.6, 0.6], fistF: false, fistB: false })],
    fall, down, getup,
    dizzy: [G({ hip: 12, lean: 7.4, tl: 9.4, ff: [3, 0], bf: [-4, 0], fh: [6, -8], bh: [3, -8], hd: [0.6, 0.8], fistF: false, fistB: false }), G({ hip: 12.1, lean: 7, tl: 9.4, ff: [3, 0], bf: [-4, 0], fh: [6.2, -8.4], bh: [3.2, -8.2], hd: [0.4, 0.7], fistF: false, fistB: false })],
    held: [G({ hip: 12.2, lean: 6.6, tl: 9.4, ff: [3, 0], bf: [-4, 0], fh: [5, -9], bh: [2, -9], hd: [0.4, 0.8], fistF: false, fistB: false })],
    pinned: [G({ hip: 13, lean: -1.2, ff: [4, 0], bf: [-4, 0], fh: [-3, -17], bh: [-5, -16], hd: [-0.3, 0.2], fistF: false, fistB: false }), G({ hip: 12.8, lean: 0.6, ff: [5, 0], bf: [-4, 0], fh: [-2, -16], bh: [-4, -15], fistF: false, fistB: false })],
    pinning: [G({ lean: 1.4, ff: [4, 0], bf: [-5, 0], fh: [10, -19], bh: [9, -18], fistF: false, fistB: false })],
    carry: [G({ hip: 13.2, lean: -0.8, fh: [2, -31], bh: [0, -30], fistF: false, fistB: false })],
    flung: [G({ hip: 13, lean: 0, rot: -60, ff: [4, -3], bf: [-3, -1], fh: [-4, -24], bh: [-7, -21], fistF: false, fistB: false })],
    pickup: [G({ hip: 7.5, lean: 5, tl: 9, ff: [6, 0], bf: [-6, 0], kneeB: 'down', fh: [10, -2], bh: [3, -8] })],
    swing: [G({ fh: [-3, -26], item: 'bat', ia: -120 }), G({ lean: 3, ff: [7, 0], bf: [-6, 0], fh: [12, -18], item: 'bat', ia: 10 }), G({ lean: 2.6, ff: [6, 0], bf: [-5, 0], fh: [10, -12], item: 'bat', ia: 50 })],
    hold1: [G({ fh: [7, -17], item: 'bat', ia: -60 })],
    stab: [G({ fh: [3, -18], item: 'knife', ia: 0 }), G({ lean: 3, ff: [7, 0], fh: [14, -19], item: 'knife', ia: 0 }), G({ lean: 2, fh: [10, -18.5], item: 'knife', ia: 10 })],
    flick: [G({ fh: [-3, -24], item: 'knife', ia: -90 }), G({ lean: 2.6, ff: [6, 0], fh: [13, -21], item: null }), G({ lean: 1.4, fh: [9, -19] })],
    lob: [G({ hip: 13, lean: -2.6, fh: [-2, -29], bh: [1, -28], fistF: false, fistB: false }), G({ hip: 13.4, lean: 3.4, ff: [7, 0], bf: [-6, 0], fh: [12, -22], bh: [10, -21], fistF: false, fistB: false })],
    charge: walk(8, 7.4, true).map((p) => Object.assign({}, p, { lean: 5, fh: [10, -16], bh: [6, -15] })),
    slam: [G({ hip: 14.4, lean: -2, fh: [1, -31], bh: [-1, -30], ff: [5, 0], bf: [-5, 0] }), G({ hip: 11, lean: 6, ff: [8, 0], bf: [-7, 0], fh: [13, -6], bh: [11, -6] })],
    taunt: [G({ lean: -1, fh: [8, -24], bh: [2, -14] }), G({ lean: -1, fh: [9, -26], bh: [2, -14] })],
    victory: [G({ hip: 14, lean: -0.6, fh: [3, -32], bh: [-3, -15] }), G({ hip: 14.2, lean: -0.6, fh: [3.4, -33], bh: [-3, -15] })],
    dead: [down[0]]
  };
  POSES.street = set;
})();
for (const a of ['walk', 'run', 'charge', 'dizzy', 'victory', 'taunt', 'pinned']) LOOP_ANIMS.add(a);
for (const a of ['jab', 'cross', 'upper', 'kick', 'round', 'jkick', 'jpunch', 'elbow', 'knee', 'toss', 'spin', 'swing', 'stab', 'flick', 'lob', 'slam']) KIAI_ANIMS.add(a);
for (const a of ['hurt', 'hurtLow', 'fall', 'down', 'dizzy', 'held', 'flung', 'pinned']) PAIN_ANIMS.add(a);

Object.assign(CHARS, {
  kade: { pal: PAL.kade, poses: 'street', k: 2.55 },
  suki: { pal: PAL.suki, poses: 'street', k: 2.44 },
  punk: { pal: PAL.punk, poses: 'street', k: 2.47 },
  punk2: { pal: PAL.punk2, poses: 'street', k: 2.47 },
  blade: { pal: PAL.blade, poses: 'street', k: 2.49 },
  biker: { pal: PAL.biker, poses: 'street', k: 2.55 },
  bruiser: { pal: PAL.bruiser, poses: 'street', k: 3.28 },
  tank: { pal: PAL.tank, poses: 'street', k: 3.69 },
  ratchet: { pal: PAL.ratchet, poses: 'street', k: 2.75 },
  forge: { pal: PAL.forge, poses: 'street', k: 3.42 },
  warden: { pal: PAL.warden, poses: 'street', k: 2.88 }
});

/* Wrestler-style kit for the cast, read by 33_anatomy.js. All original designs. */
Object.assign(PAL.kade, { muscle: 1.3, shirtless: true, openVest: '#c8283a', legwear: 'tights', pants: '#1f2a4a', pants2: '#161e36', stripe: '#f2f2f2',
  kneepad: '#1a1a20', boot: '#9a1426', boot2: '#d8283a', lace: '#ffffff', tape: '#f4f2ec', stubble: true });
Object.assign(PAL.suki, { muscle: 0.85, legwear: 'tights', pants: '#1a1c26', pants2: '#12131a', stripe: '#ff4a8a', kneepad: '#ff4a8a', lace: '#ffffff', tape: '#f4f2ec' });
Object.assign(PAL.punk, { muscle: 0.8, tape: '#3a3a44' });
Object.assign(PAL.punk2, { muscle: 0.8 });
Object.assign(PAL.blade, { muscle: 0.75 });
Object.assign(PAL.biker, { muscle: 0.95 });
Object.assign(PAL.bruiser, { muscle: 1.5, singlet: '#1e2026', legwear: 'tights', pants: '#2a2a32', pants2: '#1c1c22', stripe: '#c0392b', kneepad: '#2a2a32', tape: '#f4f2ec', stubble: true });
Object.assign(PAL.tank, { muscle: 1.6, shirtless: true, legwear: 'trunks', pants: '#4a5a3a', pants2: '#34402a', stripe: '#d8a030', kneepad: '#1a1a20', tape: '#f4f2ec', chestHair: true });
Object.assign(PAL.ratchet, { muscle: 1.0 });
Object.assign(PAL.forge, { muscle: 1.45, shirtless: true, openVest: '#5a3a24', stache: 'goatee', tape: '#3a2a20' });
Object.assign(PAL.warden, { muscle: 1.0 });
