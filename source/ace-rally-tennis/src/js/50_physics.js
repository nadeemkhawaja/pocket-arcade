/* ==========================================================================
   Ball physics, trajectory prediction and shot solving.
   Flight uses exact constant-acceleration steps, so prediction matches play.
   ========================================================================== */

function makeBall() {
  return {
    x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, spin: 0,
    cordOver: true, rolling: false,
    phys: false,     // physics running
    live: false,     // counts for the rules
    visible: false,
    held: null       // player holding the ball before a serve
  };
}

const EV = { x: 0, y: 0, z: 0, vy: 0, speed: 0 };

/** Advance the ball one step. Returns 'bounce' | 'net' | 'cord' | 'cordback' | 'cross' | null. */
function ballStep(b, dt, surf) {
  const px = b.x, py = b.y, pz = b.z;
  if (b.rolling) {
    const f = Math.max(0, 1 - surf.roll * dt);
    b.vx *= f; b.vz *= f; b.vy = 0;
    b.x += b.vx * dt; b.z += b.vz * dt; b.y = BALL_R;
    if (((pz > 0 && b.z <= 0) || (pz < 0 && b.z >= 0)) && Math.abs(b.x) < COURT.POST_X) { b.z = pz; b.vz = -b.vz * 0.2; }
    return null;
  }
  const a = GRAV + SPIN_K * b.spin;
  b.x += b.vx * dt;
  b.z += b.vz * dt;
  b.y += b.vy * dt - 0.5 * a * dt * dt;
  b.vy -= a * dt;

  if ((pz > 0 && b.z <= 0) || (pz < 0 && b.z >= 0)) {
    const t = pz / (pz - b.z);
    const cx = px + (b.x - px) * t;
    const cy = py + (b.y - py) * t;
    if (Math.abs(cx) <= COURT.POST_X + 0.06) {
      const top = netTop(cx);
      if (cy - BALL_R < top) {
        EV.x = cx; EV.y = cy; EV.z = 0;
        const back = pz > 0 ? 1 : -1;
        if (cy > top - 0.045) {
          if (b.cordOver) {
            b.vz *= 0.42; b.vx *= 0.6; b.vy = Math.abs(b.vy) * 0.25 + 1.3; b.spin = 0;
            b.y = top + BALL_R + 0.012;
            return 'cord';
          }
          b.x = cx; b.z = back * 0.07; b.y = Math.max(cy, top - 0.02);
          b.vz = -b.vz * 0.1; b.vx *= 0.4; b.vy = 0.9; b.spin = 0;
          return 'cordback';
        }
        b.x = cx; b.z = back * 0.06; b.y = Math.max(BALL_R, cy);
        b.vz = -b.vz * 0.1; b.vx *= 0.3; b.vy = Math.min(b.vy, 0) * 0.2; b.spin = 0;
        return 'net';
      }
    }
    if (b.y >= BALL_R) return 'cross';
  }

  if (b.y < BALL_R && b.vy < 0) {
    EV.x = b.x; EV.z = b.z; EV.vy = b.vy;
    EV.speed = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
    b.y = BALL_R;
    const e = surf.e * (1 + 0.04 * b.spin);
    b.vy = -b.vy * e;
    const fr = surf.f + surf.kick * b.spin;
    b.vx *= fr; b.vz *= fr;
    b.spin *= 0.35;
    if (b.vy < 0.6) { b.vy = 0; b.rolling = true; }
    return 'bounce';
  }
  return null;
}

/* ---- prediction ------------------------------------------------------------ */
const PRED_MAX = 1100;
const PRED = {
  n: 0,
  t: new Float64Array(PRED_MAX),
  x: new Float32Array(PRED_MAX), y: new Float32Array(PRED_MAX), z: new Float32Array(PRED_MAX),
  vy: new Float32Array(PRED_MAX),
  bc: new Uint8Array(PRED_MAX),
  b1: { ok: false, x: 0, z: 0, t: 0 },
  dead: false
};
const _pb = makeBall();

/** Simulate forward from the live ball. Sample i is the state after i+1 steps. */
function predictBall(b, surf, t0, maxT) {
  const s = _pb;
  s.x = b.x; s.y = b.y; s.z = b.z; s.vx = b.vx; s.vy = b.vy; s.vz = b.vz;
  s.spin = b.spin; s.cordOver = b.cordOver; s.rolling = b.rolling;
  let bounces = 0;
  PRED.n = 0; PRED.b1.ok = false; PRED.dead = false;
  const steps = Math.min(PRED_MAX, Math.floor((maxT || 4.4) / PH_DT));
  for (let i = 0; i < steps; i++) {
    const ev = ballStep(s, PH_DT, surf);
    if (ev === 'net' || ev === 'cordback') { PRED.dead = true; break; }
    if (ev === 'bounce') {
      bounces++;
      if (bounces === 1) { PRED.b1.ok = true; PRED.b1.x = EV.x; PRED.b1.z = EV.z; PRED.b1.t = t0 + (i + 1) * PH_DT; }
    }
    PRED.t[i] = t0 + (i + 1) * PH_DT;
    PRED.x[i] = s.x; PRED.y[i] = s.y; PRED.z[i] = s.z; PRED.vy[i] = s.vy;
    PRED.bc[i] = bounces;
    PRED.n = i + 1;
    if (bounces >= 2 || s.rolling) break;
  }
  return PRED;
}

/* ---- shot solving ---------------------------------------------------------- */
function solveVel(x0, y0, z0, tx, tz, T, spin, out) {
  const a = GRAV + SPIN_K * spin;
  out.vx = (tx - x0) / T;
  out.vz = (tz - z0) / T;
  out.vy = (BALL_R - y0 + 0.5 * a * T * T) / T;
  return out;
}

/** Height of the ball's underside above the tape where it crosses the net. */
function netClearance(x0, y0, z0, v, spin) {
  if (v.vz === 0 || (z0 > 0) === (v.vz > 0)) return 99;
  const t = -z0 / v.vz;
  if (t <= 0) return 99;
  const a = GRAV + SPIN_K * spin;
  const y = y0 + v.vy * t - 0.5 * a * t * t;
  const x = x0 + v.vx * t;
  return y - BALL_R - netTop(x);
}

/** Aim at (tx, tz) with a horizontal speed, raising the arc until it clears. */
function aimShot(from, tx, tz, speed, spin, minClear) {
  const d = hyp(tx - from.x, tz - from.z);
  let T = Math.max(0.25, d / Math.max(4, speed));
  const v = { vx: 0, vy: 0, vz: 0 };
  for (let k = 0; k < 60; k++) {
    solveVel(from.x, from.y, from.z, tx, tz, T, spin, v);
    if (netClearance(from.x, from.y, from.z, v, spin) >= minClear) break;
    T *= 1.04;
  }
  return { v, T };
}

/** A shot that clips into the net: aim normally, then flatten it below the tape. */
function netShot(from, tx, tz, speed, spin) {
  const d = hyp(tx - from.x, tz - from.z);
  const T = Math.max(0.3, d / Math.max(4, speed));
  const v = solveVel(from.x, from.y, from.z, tx, tz, T, spin, { vx: 0, vy: 0, vz: 0 });
  const tn = -from.z / v.vz;
  const a = GRAV + SPIN_K * spin;
  const xn = from.x + v.vx * tn;
  const target = netTop(xn) - rand(0.12, 0.32);
  v.vy = (target - from.y + 0.5 * a * tn * tn) / tn;
  return { v, T };
}

function inCourt(x, z, doubles) {
  const hw = doubles ? COURT.HWD : COURT.HWS;
  return Math.abs(x) <= hw + 0.02 && Math.abs(z) <= COURT.HL + 0.02;
}

function inBox(x, z, box) {
  return box.sz * z >= -0.01 && box.sz * z <= COURT.SVC + 0.02 &&
    box.sx * x >= -0.025 && box.sx * x <= COURT.HWS + 0.02;
}

/** How far outside the nearest boundary a bounce landed (negative means in). */
function outBy(x, z, doubles) {
  const hw = doubles ? COURT.HWD : COURT.HWS;
  return Math.max(Math.abs(x) - hw, Math.abs(z) - COURT.HL);
}
