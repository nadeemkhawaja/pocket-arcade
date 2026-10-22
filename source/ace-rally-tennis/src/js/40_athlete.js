/* ==========================================================================
   Athletes: toy-like players with procedural animation.
   Local frame: forward is -z, right is +x, up is +y. Feet at the origin.
   ========================================================================== */

const UPV = new T3.Vector3(0, 1, 0);
const _a = new T3.Vector3(), _b = new T3.Vector3(), _c = new T3.Vector3(), _d = new T3.Vector3();
const _q1 = new T3.Quaternion(), _m1 = new T3.Matrix4();
const LIMB_GEO = new T3.CylinderGeometry(1, 0.85, 1, 10);
const SPH = new T3.SphereGeometry(1, 20, 14);
const SPH_LO = new T3.SphereGeometry(1, 12, 9);

function v3(x, y, z) { return new T3.Vector3(x, y, z); }
function nrm(x, y, z) { return new T3.Vector3(x, y, z).normalize(); }

let STRING_TEX = null;
function stringTexture() {
  if (STRING_TEX) return STRING_TEX;
  STRING_TEX = canvasTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(245,245,235,0.85)';
    g.lineWidth = 1.4;
    for (let i = 4; i < w; i += 7) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  });
  return STRING_TEX;
}

function buildRacket(frameColor, gripColor) {
  const r = new T3.Group();
  const grip = new T3.Mesh(new T3.CylinderGeometry(0.019, 0.017, 0.21, 10), stdMat(gripColor, 0.7));
  grip.position.y = 0.065;
  r.add(grip);
  const butt = new T3.Mesh(new T3.CylinderGeometry(0.022, 0.022, 0.02, 10), stdMat(frameColor, 0.4));
  butt.position.y = -0.04;
  r.add(butt);
  const throat = new T3.Mesh(new T3.CylinderGeometry(0.012, 0.014, 0.15, 8), stdMat(frameColor, 0.35, { metalness: 0.2 }));
  throat.position.y = 0.245;
  r.add(throat);
  const head = new T3.Mesh(new T3.TorusGeometry(0.125, 0.013, 8, 36), stdMat(frameColor, 0.35, { metalness: 0.2 }));
  head.scale.set(1, 1.28, 1);
  head.position.y = 0.46;
  head.castShadow = true;
  r.add(head);
  const strings = new T3.Mesh(new T3.CircleGeometry(0.122, 28), new T3.MeshBasicMaterial({ map: stringTexture(), transparent: true, side: T3.DoubleSide, depthWrite: false }));
  strings.scale.set(1, 1.28, 1);
  strings.position.y = 0.46;
  r.add(strings);
  return r;
}

class Athlete {
  constructor(look, opt) {
    opt = opt || {};
    const skin = typeof look.skin === 'number' ? SKIN_TONES[look.skin % SKIN_TONES.length] : (look.skin || SKIN_TONES[0]);
    const hair = typeof look.hair === 'number' ? HAIR_TONES[look.hair % HAIR_TONES.length] : (look.hair || HAIR_TONES[0]);
    this.look = look;
    const mSkin = stdMat(skin, 0.62);
    const mShirt = stdMat(look.shirt, 0.7);
    const mShirt2 = stdMat(look.shirt2 || '#ffffff', 0.7);
    const mShorts = stdMat(look.shorts || '#ffffff', 0.75);
    const mHair = stdMat(hair, 0.8);
    const mDark = stdMat('#1a1410', 0.4);
    const mShoe = stdMat('#f7f8fa', 0.6);
    const mSole = stdMat(look.shirt, 0.6);
    const mBand = stdMat(look.band || '#ffffff', 0.7);

    const shadowy = (m) => { m.castShadow = true; return m; };
    const ball = (mat, r, sx, sy, sz, geo) => { const m = new T3.Mesh(geo || SPH, mat); m.scale.set(r * (sx || 1), r * (sy || 1), r * (sz || 1)); return m; };

    this.root = new T3.Group();
    this.hips = new T3.Group();
    this.root.add(this.hips);
    const shorts = shadowy(ball(mShorts, 1, 0.2, 0.15, 0.155));
    shorts.position.y = 0.02;
    this.hips.add(shorts);

    // legs
    this.legs = [];
    for (const s of [-1, 1]) {
      const thigh = new T3.Group();
      thigh.position.set(s * 0.095, -0.02, 0);
      const tm = shadowy(new T3.Mesh(LIMB_GEO, mSkin));
      tm.scale.set(0.078, 0.4, 0.078); tm.position.y = -0.2;
      thigh.add(tm);
      const legShort = shadowy(new T3.Mesh(LIMB_GEO, mShorts));
      legShort.scale.set(0.094, 0.19, 0.094); legShort.position.y = -0.075;
      thigh.add(legShort);
      const knee = new T3.Group(); knee.position.y = -0.4;
      thigh.add(knee);
      const sm = shadowy(new T3.Mesh(LIMB_GEO, mSkin));
      sm.scale.set(0.064, 0.38, 0.064); sm.position.y = -0.19;
      knee.add(sm);
      const sock = new T3.Mesh(LIMB_GEO, mShoe);
      sock.scale.set(0.058, 0.1, 0.058); sock.position.y = -0.31;
      knee.add(sock);
      const ankle = new T3.Group(); ankle.position.y = -0.38;
      knee.add(ankle);
      const shoe = shadowy(ball(mShoe, 1, 0.078, 0.058, 0.14));
      shoe.position.set(0, -0.012, -0.05);
      ankle.add(shoe);
      const sole = ball(mSole, 1, 0.08, 0.02, 0.142);
      sole.position.set(0, -0.05, -0.05);
      ankle.add(sole);
      this.hips.add(thigh);
      this.legs.push({ thigh, knee, ankle, s });
    }

    // spine, torso, head
    this.spine = new T3.Group();
    this.spine.position.y = 0.06;
    this.hips.add(this.spine);
    const torso = shadowy(ball(mShirt, 1, 0.25, 0.3, 0.185));
    torso.position.y = 0.27;
    this.spine.add(torso);
    const stripe = ball(mShirt2, 1, 0.252, 0.05, 0.188);
    stripe.position.y = 0.2;
    this.spine.add(stripe);
    const collar = new T3.Mesh(new T3.TorusGeometry(0.075, 0.018, 8, 18), mShirt2);
    collar.rotation.x = PI / 2; collar.position.y = 0.52;
    this.spine.add(collar);
    const neck = new T3.Mesh(LIMB_GEO, mSkin);
    neck.scale.set(0.05, 0.12, 0.05); neck.position.y = 0.56;
    this.spine.add(neck);

    this.head = new T3.Group();
    this.head.position.y = 0.73;
    this.spine.add(this.head);
    const skull = shadowy(ball(mSkin, 0.205, 1, 1.04, 0.98));
    this.head.add(skull);
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = ball(mDark, 0.027, 1, 1.4, 0.6, SPH_LO);
      eye.position.set(s * 0.07, 0.03, -0.183);
      this.head.add(eye);
      this.eyes.push(eye);
      const shine = ball(stdMat('#ffffff', 0.3), 0.009, 1, 1, 1, SPH_LO);
      shine.position.set(s * 0.07 + 0.01, 0.047, -0.2);
      this.head.add(shine);
      const brow = new T3.Mesh(new T3.BoxGeometry(0.062, 0.013, 0.014), mHair);
      brow.position.set(s * 0.074, 0.1, -0.18);
      brow.rotation.z = s * -0.12;
      this.head.add(brow);
      const ear = ball(mSkin, 0.046, 0.55, 1, 0.8, SPH_LO);
      ear.position.set(s * 0.2, 0.0, 0.01);
      this.head.add(ear);
      const cheek = ball(stdMat('#ff9b8a', 0.8, { transparent: true, opacity: 0.35 }), 0.03, 1, 0.6, 0.3, SPH_LO);
      cheek.position.set(s * 0.115, -0.045, -0.165);
      this.head.add(cheek);
    }
    const nose = ball(mSkin, 0.026, 1, 1, 1, SPH_LO);
    nose.position.set(0, -0.02, -0.2);
    this.head.add(nose);
    const mouth = new T3.Mesh(new T3.TorusGeometry(0.034, 0.008, 6, 14, PI), stdMat('#7a2a24', 0.6));
    mouth.position.set(0, -0.083, -0.18);
    mouth.rotation.z = PI;
    this.head.add(mouth);
    this.mouth = mouth;
    this.addHair(look.style || 'short', mHair, mBand);

    // shoulders, arms, hands
    this.shoulders = [v3(0.235, 0.44, 0), v3(-0.235, 0.44, 0)];
    for (const s of this.shoulders) {
      const sl = shadowy(ball(mShirt, 0.088));
      sl.position.copy(s);
      this.spine.add(sl);
    }
    this.armR = shadowy(new T3.Mesh(LIMB_GEO, mSkin));
    this.armL = shadowy(new T3.Mesh(LIMB_GEO, mSkin));
    this.spine.add(this.armR); this.spine.add(this.armL);
    this.handR = shadowy(ball(mSkin, 0.056));
    this.handL = shadowy(ball(mSkin, 0.054));
    this.spine.add(this.handR); this.spine.add(this.handL);
    const band = new T3.Mesh(LIMB_GEO, mBand);
    band.scale.set(0.05, 0.05, 0.05);
    this.wrist = band;
    this.spine.add(band);

    this.racket = opt.noRacket ? null : buildRacket(opt.racketColor || look.racket || '#e8443a', '#24303d');
    if (this.racket) this.spine.add(this.racket);

    // pose state
    this.hR = v3(0.12, 0.1, -0.34); this.hL = v3(-0.05, 0.25, -0.36);
    this.rDir = nrm(-0.3, 0.75, -0.55); this.rNorm = nrm(0.6, 0.15, 0.2);
    this.twist = 0; this.lean = 0; this.roll = 0; this.crouch = 0; this.jump = 0;
    this.hipBase = 0.8;
    this.headYaw = 0; this.headPitch = 0;
    this.phase = Math.random() * TAU;
    this.legPose = { fwd: [0, 0], knee: [0.3, 0.3], side: [0.08, 0.08] };
    this.time = Math.random() * 10;
    this.cmd = { action: 'ready', s: 0, stroke: 'fh', contact: null, speed: 0, lx: 0, lz: 0, look: null };
    this.blink = 0;
  }

  addHair(style, mHair, mBand) {
    const H = this.head;
    const cap = (r, theta, tilt) => {
      const m = new T3.Mesh(new T3.SphereGeometry(r, 26, 14, 0, TAU, 0, theta), mHair);
      m.rotation.x = tilt; m.castShadow = true; H.add(m); return m;
    };
    if (style === 'buzz') cap(0.209, PI * 0.36, 0.3);
    else if (style === 'spiky') {
      cap(0.214, PI * 0.42, 0.28);
      for (let i = 0; i < 7; i++) {
        const c = new T3.Mesh(new T3.ConeGeometry(0.05, 0.13, 6), mHair);
        const a = (i / 7) * TAU;
        c.position.set(Math.cos(a) * 0.1, 0.19, Math.sin(a) * 0.1 + 0.03);
        c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        H.add(c);
      }
    } else if (style === 'pony') {
      cap(0.215, PI * 0.47, 0.32);
      const tail = new T3.Mesh(SPH, mHair);
      tail.scale.set(0.065, 0.15, 0.065);
      tail.position.set(0, -0.02, 0.25); tail.rotation.x = 0.5;
      H.add(tail);
      this.pony = tail;
      const tie = new T3.Mesh(new T3.TorusGeometry(0.03, 0.012, 6, 12), mBand);
      tie.position.set(0, 0.09, 0.2); tie.rotation.x = 0.9;
      H.add(tie);
    } else if (style === 'bob') {
      cap(0.216, PI * 0.45, 0.25);
      const side = new T3.Mesh(new T3.SphereGeometry(0.226, 26, 14, 3 * PI / 2 + 0.95, TAU - 1.9, PI * 0.18, PI * 0.5), mHair);
      side.castShadow = true;
      H.add(side);
    } else {
      cap(0.213, PI * 0.43, 0.3);
      const back = new T3.Mesh(new T3.SphereGeometry(0.212, 22, 12, PI * 0.15, PI * 0.7, PI * 0.3, PI * 0.3), mHair);
      back.rotation.y = PI / 2;
      H.add(back);
    }
    if (style !== 'buzz') {
      const band = new T3.Mesh(new T3.TorusGeometry(0.208, 0.02, 8, 30), mBand);
      band.rotation.x = PI / 2 - 0.25; band.position.y = 0.075; band.position.z = 0.012;
      H.add(band);
    }
  }

  /* ---- swing keyframes ----------------------------------------------------- */
  static strokeFrames(stroke) {
    if (stroke === 'bh') {
      return {
        h: [null, v3(-0.5, 0.3, 0.2), v3(-0.46, 0.05, -0.42), v3(0.3, 0.55, -0.22), null],
        d: [null, nrm(-0.25, 0.65, 0.72), nrm(-0.86, 0.12, -0.42), nrm(0.55, 0.5, 0.65), null],
        tw: [0, -0.95, 0.1, 0.8, 0], lean: [0.08, 0.12, 0.18, 0.05, 0.08], two: true
      };
    }
    if (stroke === 'vfh') {
      return {
        h: [null, v3(0.42, 0.28, -0.12), v3(0.46, 0.15, -0.55), v3(0.3, 0.02, -0.62), null],
        d: [null, nrm(0.3, 0.9, 0.12), nrm(0.62, 0.55, -0.42), nrm(0.5, 0.3, -0.72), null],
        tw: [0, 0.4, 0.05, -0.15, 0], lean: [0.1, 0.12, 0.22, 0.2, 0.1]
      };
    }
    if (stroke === 'vbh') {
      return {
        h: [null, v3(-0.4, 0.3, -0.1), v3(-0.46, 0.15, -0.55), v3(-0.25, 0.05, -0.62), null],
        d: [null, nrm(-0.3, 0.9, 0.1), nrm(-0.62, 0.55, -0.42), nrm(-0.45, 0.35, -0.75), null],
        tw: [0, -0.45, -0.05, 0.15, 0], lean: [0.1, 0.12, 0.22, 0.2, 0.1], two: true
      };
    }
    if (stroke === 'smash' || stroke === 'serve') {
      return {
        h: [null, v3(0.3, 0.78, 0.26), v3(0.2, 1.45, -0.3), v3(-0.3, -0.1, -0.35), null],
        d: [null, nrm(0.12, -0.8, 0.55), nrm(0.08, 0.96, -0.25), nrm(-0.4, -0.72, -0.4), null],
        tw: [0, 0.65, 0.05, -0.55, 0], lean: [0.05, -0.18, 0.1, 0.38, 0.05], overhead: true
      };
    }
    return {
      h: [null, v3(0.5, 0.32, 0.25), v3(0.48, 0.05, -0.42), v3(-0.32, 0.5, -0.25), null],
      d: [null, nrm(0.2, 0.6, 0.75), nrm(0.86, 0.1, -0.38), nrm(-0.6, 0.45, 0.6), null],
      tw: [0, 0.9, 0.0, -0.8, 0], lean: [0.08, 0.1, 0.18, 0.06, 0.08]
    };
  }

  /** Spine-local hand target that puts the sweet spot on a world contact point. */
  contactFor(stroke, world, out) {
    const f = Athlete.strokeFrames(stroke);
    this.root.updateMatrixWorld();
    const local = this.root.worldToLocal(_a.copy(world));
    local.y -= this.hips.position.y + 0.06;
    out.copy(local).addScaledVector(f.d[2], -0.46);
    const sh = stroke === 'bh' || stroke === 'vbh' ? this.shoulders[1] : this.shoulders[0];
    const off = _b.copy(out).sub(sh);
    const max = 0.82;
    if (off.length() > max) out.copy(sh).addScaledVector(off.normalize(), max);
    return out;
  }

  readyPose(out) {
    out.hR.set(0.13, 0.1, -0.36); out.hL.set(-0.04, 0.24, -0.38);
    out.d.copy(nrm(-0.32, 0.78, -0.5)); out.tw = 0; out.lean = 0.12;
  }

  computeSwing(stroke, s, contact, out) {
    const f = Athlete.strokeFrames(stroke);
    const times = [0, 0.28, 0.5, 0.74, 1];
    const H = [this.readyH || v3(0.13, 0.1, -0.36), f.h[1], contact || f.h[2], f.h[3], v3(0.13, 0.1, -0.36)];
    const D = [nrm(-0.32, 0.78, -0.5), f.d[1], f.d[2], f.d[3], nrm(-0.32, 0.78, -0.5)];
    let i = 0;
    while (i < 3 && s > times[i + 1]) i++;
    const u = clamp((s - times[i]) / (times[i + 1] - times[i]), 0, 1);
    const e = i === 1 ? u : smoothstep(0, 1, u);
    // Catmull-Rom through the hand keys
    const p0 = H[Math.max(0, i - 1)], p1 = H[i], p2 = H[i + 1], p3 = H[Math.min(4, i + 2)];
    const t = e, t2 = t * t, t3 = t2 * t;
    out.hR.set(
      0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
    );
    out.d.copy(D[i]).lerp(D[i + 1], e).normalize();
    out.tw = lerp(f.tw[i], f.tw[i + 1], e);
    out.lean = lerp(f.lean[i], f.lean[i + 1], e);
    if (f.two) {
      out.hL.copy(out.hR).addScaledVector(out.d, 0.1);
      if (stroke === 'vbh' && s > 0.45) out.hL.set(-0.05, 0.22, -0.3).lerp(out.hR, 0.2);
    } else if (f.overhead) {
      out.hL.set(-0.18, lerp(0.3, 1.25, smoothstep(0, 0.3, s)) - smoothstep(0.5, 0.8, s) * 1.05, -0.36);
    } else {
      out.hL.set(lerp(-0.18, -0.32, smoothstep(0.1, 0.4, s)), lerp(0.2, 0.32, smoothstep(0.1, 0.4, s)) - smoothstep(0.5, 0.8, s) * 0.15, lerp(-0.38, -0.45, smoothstep(0, 0.3, s)) + smoothstep(0.5, 0.85, s) * 0.3);
    }
  }

  /* ---- per-frame animation --------------------------------------------- */
  animate(dt) {
    this.time += dt;
    const c = this.cmd;
    const out = this._out || (this._out = { hR: v3(0, 0, 0), hL: v3(0, 0, 0), d: v3(0, 1, 0), tw: 0, lean: 0 });
    let crouch = 0, jump = 0, headPitch = 0, roll = 0;
    let legsMode = 'stand';
    const sp = c.speed || 0;
    const moving = sp > 0.35;

    if (c.action === 'swing' || c.action === 'serve') {
      let contact = null;
      if (c.contactWorld) contact = this.contactFor(c.stroke, c.contactWorld, this._ct || (this._ct = v3(0, 0, 0)));
      this.computeSwing(c.stroke, c.s, contact, out);
      crouch = c.crouch || 0;
      if (c.stroke === 'serve' || c.stroke === 'smash') { jump = Math.max(0, Math.sin(clamp((c.s - 0.32) / 0.4, 0, 1) * PI)) * (c.stroke === 'serve' ? 0.1 : 0.16); }
      legsMode = moving ? 'run' : 'ready';
    } else if (c.action === 'toss') {
      // server lifts the tossing arm and coils into the trophy pose
      const s = c.s;
      const f = Athlete.strokeFrames('serve');
      const k = smoothstep(0, 1, s);
      out.hR.copy(v3(0.24, 0.15, -0.2)).lerp(f.h[1], k);
      out.d.copy(nrm(0.2, -0.2, -0.9)).lerp(f.d[1], k).normalize();
      out.hL.set(lerp(-0.12, -0.1, k), lerp(0.18, 1.25, smoothstep(0, 0.55, s)), -0.34);
      out.tw = lerp(0.2, 0.65, k); out.lean = lerp(0.05, -0.18, k);
      crouch = Math.sin(k * PI) * 0.08;
      legsMode = 'ready';
    } else if (c.action === 'bounce') {
      // pre-serve routine: bounce the ball with the left hand
      out.hR.set(0.26, 0.12, -0.18); out.d.copy(nrm(0.25, -0.15, -0.95));
      const ph = c.s;
      out.hL.set(-0.12, 0.05 - Math.max(0, Math.sin(ph * TAU)) * 0.12, -0.35);
      out.tw = 0.2; out.lean = 0.22; crouch = 0.04 + Math.max(0, Math.sin(ph * TAU)) * 0.04;
      legsMode = 'stand';
    } else if (c.action === 'cheer') {
      const t = this.time;
      const big = c.big;
      out.hR.set(0.28, big ? 1.25 : 0.95, -0.12 + Math.sin(t * 12) * 0.05);
      out.hL.set(big ? -0.28 : -0.18, big ? 1.2 : 0.3, big ? -0.12 : -0.3);
      out.d.copy(nrm(0.2, 0.95, 0.1)); out.tw = 0; out.lean = -0.08;
      jump = big ? Math.abs(Math.sin(t * 7)) * 0.32 : Math.abs(Math.sin(t * 9)) * 0.06;
      headPitch = -0.25;
      legsMode = 'stand';
    } else if (c.action === 'sad') {
      out.hR.set(0.2, -0.28, -0.1); out.hL.set(-0.2, -0.3, -0.05);
      out.d.copy(nrm(0.1, -0.95, -0.2)); out.tw = 0; out.lean = 0.3; headPitch = 0.45; crouch = 0.03;
      legsMode = moving ? 'run' : 'stand';
    } else if (c.action === 'sit') {
      out.hR.set(0.16, -0.06, -0.3); out.hL.set(-0.16, -0.06, -0.3);
      out.d.copy(nrm(0, 0.2, -1)); out.tw = 0; out.lean = 0.02;
      legsMode = 'sit';
    } else if (c.action === 'wave') {
      out.hR.set(0.32, 1.1 + Math.sin(this.time * 9) * 0.05, -0.05 + Math.sin(this.time * 9) * 0.15);
      out.hL.set(-0.16, 0.0, -0.25); out.d.copy(nrm(0.3, 0.9, 0.2)); out.tw = 0; out.lean = 0;
      legsMode = 'stand';
    } else {
      // ready or running
      if (moving) {
        const pump = Math.sin(this.phase);
        out.hR.set(0.32, 0.02 + pump * 0.04, -0.18 - pump * 0.1);
        out.d.copy(nrm(0.3, 0.75, -0.6));
        out.hL.set(-0.3, 0.06 - pump * 0.06, -0.08 + pump * 0.16);
        out.tw = -pump * 0.12; out.lean = 0.18 + Math.min(sp, 7) * 0.025;
        legsMode = 'run';
      } else {
        this.readyPose(out);
        out.hR.y += Math.sin(this.time * 4.2) * 0.012;
        out.hL.y += Math.sin(this.time * 4.2) * 0.012;
        crouch = 0.05 + Math.sin(this.time * 4.2) * 0.012;
        legsMode = c.relaxed ? 'stand' : 'ready';
        if (c.relaxed) { out.lean = 0.04; crouch = 0; }
      }
    }

    // blend toward the target pose; swings snap tightly so contact stays honest
    const sharp = c.action === 'swing' || c.action === 'serve' || c.action === 'toss' ? 60 : 14;
    const k = 1 - Math.exp(-sharp * dt);
    this.hR.lerp(out.hR, k); this.hL.lerp(out.hL, k);
    this.rDir.lerp(out.d, k).normalize();
    this.twist = lerp(this.twist, out.tw, k);
    this.lean = lerp(this.lean, out.lean, k);
    this.crouch = lerp(this.crouch, crouch, 1 - Math.exp(-12 * dt));
    this.jump = lerp(this.jump, jump, 1 - Math.exp(-20 * dt));
    this.headPitch = lerp(this.headPitch, headPitch, 1 - Math.exp(-8 * dt));

    // legs
    if (moving) this.phase += dt * (5.5 + sp * 1.35);
    this.applyLegs(legsMode, sp, c.lx || 0, c.lz || 0, dt);

    // spine and head
    this.spine.rotation.set(this.lean, this.twist, roll);
    if (c.look) {
      const l = this.root.worldToLocal(_c.copy(c.look));
      const yaw = clamp(Math.atan2(-l.x, -l.z), -1.1, 1.1) - this.twist;
      this.headYaw = lerp(this.headYaw, yaw * 0.85, 1 - Math.exp(-6 * dt));
    } else this.headYaw = lerp(this.headYaw, 0, 1 - Math.exp(-6 * dt));
    this.head.rotation.set(this.headPitch - this.lean * 0.4, this.headYaw, 0);
    if (this.pony) this.pony.rotation.x = 0.5 + Math.sin(this.time * 6) * 0.08 + (moving ? 0.25 : 0);

    // blink by squashing eyes briefly
    this.blink -= dt;
    if (this.blink < -this.nextBlink) { this.blink = 0.12; this.nextBlink = rand(2.2, 4.8); }
    const eyeY = this.blink > 0 ? 0.006 : 0.027 * 1.4;
    for (const e of this.eyes) e.scale.y = eyeY;

    this.placeArm(this.armR, this.shoulders[0], this.hR, 0.052);
    this.placeArm(this.armL, this.shoulders[1], this.hL, 0.05);
    this.handR.position.copy(this.hR);
    this.handL.position.copy(this.hL);
    // wristband sits a little up the forearm
    this.wrist.position.copy(this.hR).lerp(this.shoulders[0], 0.16);
    _d.copy(this.shoulders[0]).sub(this.hR).normalize();
    this.wrist.quaternion.setFromUnitVectors(UPV, _d);
    this.wrist.scale.set(0.06, 0.05, 0.06);
    if (this.racket) {
      // racket face normal: perpendicular to the shaft, facing forward-ish
      const dirv = this.rDir;
      const n = _a.set(0, 0, -1).addScaledVector(dirv, dirv.z).normalize();
      if (n.lengthSq() < 0.01) n.set(1, 0, 0);
      const xA = _b.crossVectors(dirv, n).normalize();
      const zA = _c.crossVectors(xA, dirv).normalize();
      _m1.makeBasis(xA, dirv, zA);
      this.racket.quaternion.setFromRotationMatrix(_m1);
      this.racket.position.copy(this.hR);
    }
  }

  placeArm(mesh, sh, hand, r) {
    _a.copy(hand).sub(sh);
    const len = Math.max(0.05, _a.length());
    mesh.position.copy(sh).addScaledVector(_a, 0.5);
    mesh.quaternion.setFromUnitVectors(UPV, _a.multiplyScalar(1 / len));
    mesh.scale.set(r, len, r);
  }

  applyLegs(mode, sp, lx, lz, dt) {
    const L = this.legs;
    const P = this.legPose;
    let tf = [0, 0], tk = [0.25, 0.25], ts = [0.07, 0.07];
    if (mode === 'run') {
      const amp = clamp(0.35 + sp * 0.09, 0.35, 0.95);
      const total = Math.abs(lx) + Math.abs(lz) + 1e-4;
      const wF = Math.abs(lz) / total, wS = Math.abs(lx) / total;
      const dirF = lz <= 0 ? 1 : -1; // moving forward (-z) swings legs forward first
      for (let i = 0; i < 2; i++) {
        const ph = this.phase + (i ? PI : 0);
        const sw = Math.sin(ph);
        tf[i] = sw * amp * wF * dirF + 0.12 * wS;
        tk[i] = 0.2 + Math.max(0, Math.cos(ph)) * amp * 1.1 * wF + Math.max(0, sw) * 0.35 * wS;
        ts[i] = 0.1 + (0.12 + Math.max(0, sw) * 0.22) * wS;
      }
    } else if (mode === 'ready') {
      tf = [0.32, 0.32]; tk = [0.68, 0.68]; ts = [0.14, 0.14];
    } else if (mode === 'sit') {
      tf = [1.45, 1.45]; tk = [1.5, 1.5]; ts = [0.1, 0.1];
    }
    if (mode !== 'sit' && this.crouch > 0.001) {
      for (let i = 0; i < 2; i++) { tf[i] += this.crouch * 0.9; tk[i] += this.crouch * 1.9; }
    }
    const k = mode === 'run' ? 1 : 1 - Math.exp(-12 * dt);
    for (let i = 0; i < 2; i++) {
      P.fwd[i] = lerp(P.fwd[i], tf[i], k);
      P.knee[i] = lerp(P.knee[i], tk[i], k);
      P.side[i] = lerp(P.side[i], ts[i], k);
      const leg = L[i];
      leg.thigh.rotation.set(P.fwd[i], 0, leg.s * P.side[i]);
      leg.knee.rotation.set(-P.knee[i], 0, 0);
      leg.ankle.rotation.set(P.knee[i] - P.fwd[i], 0, -leg.s * P.side[i] * 0.8);
    }
    // keep the planted foot on the ground
    let reach = 0;
    for (let i = 0; i < 2; i++) {
      const a = P.fwd[i], b = P.knee[i], s = P.side[i];
      const v = (0.4 * Math.cos(a) + 0.38 * Math.cos(a - b)) * Math.cos(s);
      reach = Math.max(reach, v);
    }
    if (mode === 'sit') reach = 0.03;
    this.hipBase = reach + 0.072;
    this.hips.position.y = this.hipBase + this.jump;
  }

  handWorld(which, out) {
    const h = which === 'L' ? this.handL : this.handR;
    return h.getWorldPosition(out);
  }

  racketWorld(out) {
    if (!this.racket) return this.handWorld('R', out);
    return this.racket.localToWorld(out.set(0, 0.46, 0));
  }
}
