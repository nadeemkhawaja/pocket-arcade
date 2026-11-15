/* ==========================================================================
   The four districts. Each stage is a stretch of street with locks: the
   camera stops, a wave of the gang arrives, and when it is cleared the GO
   arrow shows and the street opens up again. Props are placed along the way.
   ========================================================================== */

const STAGES = [
  {
    id: 'market', name: 'NEON MARKET', sub: 'CHINATOWN AFTER DARK', song: 'market', len: 1700, dust: '#8a8090',
    intro: 'THE VIPERS RUN THE NIGHT MARKET NOW. TIME TO TAKE IT BACK.',
    props: [['crate', 260, 150, 'food'], ['drum', 420, 186], ['bat', 520, 196], ['crate', 760, 146, 'soda'], ['crate', 1040, 190, 'pipe'], ['drum', 1230, 150], ['crate', 1420, 196, 'cash']],
    waves: [
      { at: 0, foes: [['punk', 'R'], ['punk', 'R']] },
      { at: 300, foes: [['punk', 'R'], ['punk2', 'L'], ['punk', 'R']] },
      { at: 640, foes: [['punk2', 'R'], ['blade', 'R'], ['punk', 'L'], ['punk', 'R']] },
      { at: 980, foes: [['bruiser', 'R'], ['punk', 'L']] },
      { at: 1316, boss: 'tank', foes: [['punk', 'L'], ['punk2', 'R']] }
    ]
  },
  {
    id: 'yard', name: 'FREIGHT YARD', sub: 'THE RAIL LINES AT MIDNIGHT', song: 'yard', len: 1800, dust: '#a89878', pits: [[880, 1000, 168]],
    intro: 'THEIR SHIPMENTS COME IN BY RAIL. SHUT THE YARD DOWN.',
    props: [['drum', 220, 160], ['crate', 380, 192, 'knife'], ['pipe', 600, 150], ['drum', 820, 194], ['crate', 1000, 150, 'food'], ['crate', 1260, 192, 'bat'], ['drum', 1500, 160]],
    waves: [
      { at: 0, foes: [['punk2', 'R'], ['biker', 'R']] },
      { at: 320, foes: [['blade', 'R'], ['blade', 'L'], ['punk', 'R']] },
      { at: 680, foes: [['biker', 'R'], ['punk2', 'L'], ['bruiser', 'R']], train: true },
      { at: 1060, foes: [['blade', 'R'], ['biker', 'L'], ['punk', 'R'], ['punk2', 'L']] },
      { at: 1416, boss: 'ratchet', foes: [['biker', 'L']] }
    ]
  },
  {
    id: 'foundry', name: 'STEEL FOUNDRY', sub: 'WHERE THE GANG MAKES ITS MONEY', song: 'foundry', len: 1800, dust: '#6a5a50', pits: [[720, 830, 160], [1190, 1280, 170]],
    intro: 'THE FURNACES NEVER SLEEP. NEITHER DO THE GUARDS.',
    props: [['crate', 240, 192, 'soda'], ['pipe', 420, 150], ['drum', 640, 188], ['crate', 860, 150, 'food'], ['drum', 1100, 192], ['crate', 1300, 150, 'oneup'], ['bat', 1500, 190]],
    waves: [
      { at: 0, foes: [['bruiser', 'R'], ['punk', 'L']] },
      { at: 340, foes: [['biker', 'R'], ['blade', 'R'], ['punk2', 'L']] },
      { at: 700, foes: [['bruiser', 'R'], ['bruiser', 'L'], ['blade', 'R']] },
      { at: 1060, foes: [['biker', 'L'], ['biker', 'R'], ['punk', 'R'], ['blade', 'L']] },
      { at: 1416, boss: 'forge', foes: [['punk2', 'R'], ['punk', 'L']] }
    ]
  },
  {
    id: 'tower', name: 'VIPER TOWER', sub: 'THE ROOF, IN THE RAIN', song: 'tower', len: 1500, dust: '#5a6a80', pits: [[430, 560, 160], [880, 990, 166]],
    intro: 'THE WARDEN WAITS AT THE TOP. FINISH THIS.',
    props: [['crate', 260, 190, 'food'], ['pipe', 440, 152], ['drum', 700, 190], ['crate', 920, 152, 'knife'], ['crate', 1100, 194, 'food']],
    waves: [
      { at: 0, foes: [['blade', 'R'], ['biker', 'L'], ['punk2', 'R']] },
      { at: 330, foes: [['bruiser', 'R'], ['blade', 'L'], ['punk', 'R'], ['punk2', 'L']] },
      { at: 700, foes: [['biker', 'R'], ['bruiser', 'L'], ['blade', 'R'], ['biker', 'L']] },
      { at: 1116, boss: 'warden', foes: [] }
    ]
  }
];

const DIFFS = {
  easy: { id: 'easy', name: 'EASY', hp: 0.75, dmg: 0.6, pace: 0.75, mob: 1, score: 0.6, blurb: 'GENTLER GANG. MORE ROOM TO LEARN.' },
  normal: { id: 'normal', name: 'NORMAL', hp: 1, dmg: 1, pace: 1, mob: 2, score: 1, blurb: 'THE ARCADE STANDARD.' },
  hard: { id: 'hard', name: 'HARD', hp: 1.25, dmg: 1.3, pace: 1.25, mob: 2, score: 1.5, blurb: 'TOUGHER, FASTER, MEANER.' },
  brutal: { id: 'brutal', name: 'BRUTAL', hp: 1.5, dmg: 1.6, pace: 1.45, mob: 3, score: 2.2, blurb: 'THE WHOLE GANG AT ONCE. NO MERCY.' }
};
const LEVELS = ['easy', 'normal', 'hard', 'brutal'];

/** Bring a wave on from the edges of the screen. side: L, R, or a number for an exact x. */
function spawnWave(list) {
  let k = 0;
  for (const [type, side] of list) {
    const fromL = side === 'L', x = typeof side === 'number' ? side : fromL ? game.camX - 30 - k * 22 : game.camX + W + 30 + k * 22;
    const z = Z0 + 10 + ((k * 23 + game.waveIdx * 11) % (Z1 - Z0 - 16));
    const p = pitAhead(x, z);
    const f = newFoe(type, x, p ? p[2] - 8 : z, { spawnT: 0.45 + k * 0.12 });
    f.face = fromL ? 1 : -1;
    game.foes.push(f);
    k++;
  }
}
