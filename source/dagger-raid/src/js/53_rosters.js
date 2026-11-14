/* ==========================================================================
   Every stage fields its own army: a roster of troop types found nowhere
   else, and its own uniform colours.
   ========================================================================== */

/* For each stage: the troop types it may field, and what replaces the ones it may not. */
const ROSTER = {
  jungle: { own: ['grunt', 'striker', 'dog', 'officer'], swap: { grenadier: 'striker', gunner: 'grunt', guard: 'grunt', ninja: 'dog', sniper: 'officer', flamer: 'striker' }, runner: 'striker' },
  rail: { own: ['grunt', 'sniper', 'gunner', 'officer', 'para'], swap: { striker: 'grunt', grenadier: 'gunner', guard: 'grunt', ninja: 'gunner', dog: 'grunt', flamer: 'gunner' }, runner: 'grunt', para: true },
  refinery: { own: ['grunt', 'flamer', 'grenadier', 'officer'], swap: { striker: 'flamer', gunner: 'grenadier', guard: 'grunt', ninja: 'flamer', dog: 'grunt', sniper: 'grenadier' }, runner: 'grunt' },
  citadel: { own: ['guard', 'ninja', 'officer'], swap: { grunt: 'guard', striker: 'guard', gunner: 'guard', grenadier: 'guard', dog: 'guard', sniper: 'officer', flamer: 'guard' }, runner: 'guard' }
};
/* Uniform colours by stage: rust guerrillas, winter whites, desert tan, black and crimson. */
const UNIFORM = {
  jungle: { top: '#9a5f3c', top2: '#74452a', pants: '#6e4a34', pants2: '#523626', helmet: '#5c3d2a', helmet2: '#432c1e', accent: '#e8c24a' },
  rail: { top: '#e3e9f0', top2: '#b9c4d0', pants: '#cdd6df', pants2: '#a3aebb', helmet: '#f2f5f8', helmet2: '#c3ccd6', accent: '#3a6ad0' },
  refinery: { top: '#cfae6e', top2: '#a68850', pants: '#b79558', pants2: '#8f7340', helmet: '#a08048', helmet2: '#7a6034', accent: '#c8382c' },
  citadel: { top: '#2c2e38', top2: '#1d1f27', pants: '#24262e', pants2: '#17181e', helmet: '#15161b', helmet2: '#0c0d10', accent: '#e02a2a' }
};
const TROOPS = ['grunt', 'striker', 'officer', 'grenadier', 'sniper', 'gunner', 'guard', 'para', 'flamer'];
const BASE_PAL = {};

function stageKind(st, kind) { const R = ROSTER[st.id]; return R && R.swap[kind] ? R.swap[kind] : kind; }

/** Dress the troops for this stage. */
function applyUniform(st) {
  const U = UNIFORM[st.id];
  for (const k of TROOPS) {
    if (!CHARS[k]) continue;
    if (!BASE_PAL[k]) BASE_PAL[k] = CHARS[k].pal;
    const p = Object.assign({}, BASE_PAL[k]);
    if (U) for (const key in U) if (key in p || key === 'accent') p[key] = U[key];
    CHARS[k].pal = p;
  }
}

(function buildRosters() {
  // the flame trooper: armoured, slow, and deadly inside six paces. Shoot the tank and it goes up.
  ETYPES.flamer = { hp: 2, spd: [38, 46], pts: 400, flamer: true };
  PAL.flamer = Object.assign({}, PAL.gunner, { helmet: '#7a2a20', helmet2: '#561c16', gear: '#c8382c', mask: '#3a3f45', head: 'mask' });
  CHARS.flamer = { pal: PAL.flamer, poses: 'soldier', k: 1 };
  for (const st of STAGES) {
    const R = ROSTER[st.id];
    for (const ev of st.events) {
      if (ev.e) ev.e = stageKind(st, ev.e);
      if (ev.wave) for (const w of ev.wave) w[0] = stageKind(st, w[0]);
      if (ev.dogs && !R.own.includes('dog')) { ev.wave = (ev.wave || []).concat(Array.from({ length: ev.dogs }, (_, i) => [R.runner, 'R', 0, 0.4 + i * 0.5])); delete ev.dogs; }
      if (ev.para && !R.para) { ev.wave = (ev.wave || []).concat(Array.from({ length: ev.para }, (_, i) => [R.runner, i % 2 ? 'L' : 'R', 0, i * 0.6])); delete ev.para; }
    }
    const mix = {};
    for (const k in st.ambient.mix) { const to = stageKind(st, k); mix[to] = (mix[to] || 0) + st.ambient.mix[k]; }
    st.ambient.mix = mix;
  }
  // signature troops get a guaranteed presence
  STAGES.find((s) => s.id === 'jungle').ambient.mix.dog = 2;
  STAGES.find((s) => s.id === 'rail').ambient.mix.gunner = 3;
  STAGES.find((s) => s.id === 'rail').events.push({ at: 1500, para: 3 }, { at: 2600, para: 4 });
  STAGES.find((s) => s.id === 'refinery').ambient.mix.flamer = 3;
  STAGES.find((s) => s.id === 'citadel').ambient.mix.ninja = 2;
  for (const st of STAGES) st.events.sort((a, b) => a.at - b.at);
})();
