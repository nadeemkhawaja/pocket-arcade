/* ==========================================================================
   Bosses: MAULER, IRONCLAD, SKY HAMMER, GENERAL KROME
   Each boss exposes update, draw, knife, shotHit, blast, touches.
   ========================================================================== */

const BOSS_NAMES = { mauler: 'MAULER', ironclad: 'IRONCLAD', gunship: 'SKY HAMMER', krome: 'GENERAL KROME' };
const BOSS_POINTS = { mauler: 10000, ironclad: 20000, gunship: 30000, krome: 50000 };

function makeBoss(kind) {
  const ax = game.camX;
  const b = { kind, name: BOSS_NAMES[kind], st: 'enter', t: 0, flash: 0, dead: false, deathT: 0, face: -1, ax, hitCD: 0, phase: 1 };
  const mul = game.loop > 1 ? 1.3 : 1;
  if (kind === 'mauler') Object.assign(b, { x: ax + W + 40, y: GROUND_Y, vx: 0, vy: 0, hp: Math.round(30 * mul) }, MAULER);
  if (kind === 'ironclad') Object.assign(b, { x: ax + W + 10, y: GROUND_Y, hp: Math.round(30 * mul), open: 0, turretA: -2.3, recoil: 0, wheel: 0, lid: 0, seq: 0 }, IRONCLAD);
  if (kind === 'gunship') Object.assign(b, { x: ax + W + 90, y: 62, vx: 0, vy: 0, hp: Math.round(34 * mul), rot: 0, seq: 0, tilt: 0 }, GUNSHIP);
  if (kind === 'krome') Object.assign(b, { x: ax + W + 24, y: GROUND_Y, vx: 0, vy: 0, ground: true, climb: null, dropY: null, hp: Math.round(36 * mul), combo: 0, calls: 0, recentHits: [] }, KROME);
  b.max = b.hp;
  return b;
}

function bossDamage(b, dmg, x, y, quiet) {
  if (b.dead || b.st === 'enter') return false;
  b.hp -= dmg; b.flash = 0.09;
  if (!quiet) { sparks(x, y, 4, '#ffffff'); chip.sfx('hit'); }
  addScore(10 * dmg, 0, 0, false, true);
  if (b.hp <= 0) { b.hp = 0; b.dead = true; b.deathT = 0; b.st = 'dying'; b.t = 0; onBossDown(b); }
  else if (b.phase === 1 && b.hp <= b.max / 2) { b.phase = 2; if (b.onPhase) b.onPhase(); }
  return true;
}

/* generic helpers for the hit tests every boss shares */
function bossKnifeOn(b, kb, boxes) {
  for (const z of boxes) {
    if (!boxHit(kb, z.b)) continue;
    if (z.armor) { chip.sfx('clang'); sparks((Math.max(kb.x0, z.b.x0) + Math.min(kb.x1, z.b.x1)) / 2, (kb.y0 + kb.y1) / 2, 3, '#ffe27a'); return true; }
    bossDamage(b, z.mul || 1, (Math.max(kb.x0, z.b.x0) + Math.min(kb.x1, z.b.x1)) / 2, (kb.y0 + kb.y1) / 2);
    return true;
  }
  return false;
}
function bossShotOn(b, s, sb, boxes) {
  for (const z of boxes) {
    if (!boxHit(sb, z.b)) continue;
    if (s.k === 'tknife') {
      if (z.armor) { chip.sfx('tink'); sparks(s.x, s.y, 2, '#ffe27a'); }
      else bossDamage(b, 2 * (z.mul || 1), s.x, s.y);
    }
    return true;
  }
  return false;
}
function bossBlastOn(b, x, y, r, dmg, boxes) {
  let best = null;
  for (const z of boxes) { const d = distBox(z.b, x, y); if (d < r && (!best || d < best.d)) best = { d, z }; }
  if (!best) return;
  bossDamage(b, best.z.armor ? 1 : dmg * (best.z.mul || 1), x, y, true);
}

/* ---- MAULER: a giant with a club ------------------------------------------------ */
const MAULER = {
  boxes() {
    if (this.dead) return [];
    if (this.st === 'charge') return [{ b: box(this.x - 11, this.y - 34, this.x + 11, this.y) }];
    return [{ b: box(this.x - 12, this.y - 50, this.x + 12, this.y - 1) }];
  },
  knife(kb) { return bossKnifeOn(this, kb, this.boxes()); },
  shotHit(s, sb) { return bossShotOn(this, s, sb, this.boxes()); },
  blast(x, y, r, d) { bossBlastOn(this, x, y, r, d, this.boxes()); },
  touches(hb) {
    if (this.dead || this.st === 'stun' || this.st === 'enter') return false;
    if (this.st === 'smash' && this.t < 0.12) {
      const f = this.face, z = f > 0 ? box(this.x + 6, this.y - 36, this.x + 44, this.y) : box(this.x - 44, this.y - 36, this.x - 6, this.y);
      if (boxHit(z, hb)) return true;
    }
    const body = this.st === 'charge' ? box(this.x - 10, this.y - 30, this.x + 10, this.y) : box(this.x - 9, this.y - 46, this.x + 9, this.y);
    return boxHit(body, hb);
  },
  onPhase() { chip.sfx('roar'); pop(this.x, this.y - 64, 'RAAAGH!', '#ff8a6a'); },
  update(dt) {
    const h = game.hero;
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const left = this.ax + 22, right = this.ax + W - 22;
    const dx = h.x - this.x, adx = Math.abs(dx), toward = dx >= 0 ? 1 : -1;
    const p2 = this.phase === 2;
    switch (this.st) {
      case 'enter':
        this.face = -1; this.vx = -40;
        if (this.x <= this.ax + W - 80) { this.vx = 0; this.st = 'roar'; this.t = 0; chip.sfx('roar'); addShake(5); }
        break;
      case 'roar':
        this.vx = 0;
        if (this.t > 1.0) { this.st = 'walk'; this.t = 0; }
        break;
      case 'walk':
        this.face = toward;
        this.vx = adx > 30 ? toward * (p2 ? 50 : 36) : 0;
        if (this.t > 0.5 && adx < 46) { this.st = 'raise'; this.t = 0; }
        else if (this.t > (p2 ? 1.2 : 1.8)) {
          const r = Math.random();
          if (p2 && r < 0.4 && adx > 70) { this.st = 'prep'; this.t = 0; chip.sfx('roar'); }
          else if (r < 0.75 && adx > 60) { this.st = 'throw'; this.t = 0; this.rocks = p2 ? 2 : 1; }
          else { this.st = 'raise'; this.t = 0; }
        }
        break;
      case 'raise':
        this.vx = 0;
        if (this.t > (p2 ? 0.42 : 0.55)) {
          this.st = 'smash'; this.t = 0;
          addShake(5); chip.sfx('boom'); dust(this.x + this.face * 26, GROUND_Y, 8);
          const ix = this.x + this.face * 26;
          for (const d of [-1, 1]) game.shots.push({ k: 'wave', x: ix + d * 8, y: GROUND_Y, vx: d * (p2 ? 175 : 150), vy: 0, t: 0, foe: true, dist: 0, max: 330 });
        }
        break;
      case 'smash':
        this.vx = 0;
        if (this.t > 0.65) { this.st = 'walk'; this.t = 0; }
        break;
      case 'throw':
        this.vx = 0; this.face = toward;
        if (this.t > 0.55 && this.rocks > 0) {
          this.rocks--; this.t = 0.3;
          lob('rock', this.x + this.face * 4, this.y - 58, h.x + (this.rocks ? rand(-50, 50) : 0), GROUND_Y, 0.85, true);
          chip.sfx('throw');
        } else if (this.t > 0.55 && this.rocks <= 0) { this.st = 'walk'; this.t = 0; }
        break;
      case 'prep':
        this.vx = 0; this.face = toward;
        if (Math.floor(this.t * 10) % 3 === 0) dust(this.x - this.face * 8, GROUND_Y, 1);
        if (this.t > 0.75) { this.st = 'charge'; this.t = 0; }
        break;
      case 'charge':
        this.vx = this.face * 168;
        if (Math.floor(this.t * 20) % 2 === 0) dust(this.x - this.face * 10, GROUND_Y, 1);
        if ((this.face > 0 && this.x >= right) || (this.face < 0 && this.x <= left)) {
          this.x = clamp(this.x, left, right); this.vx = 0; this.st = 'stun'; this.t = 0;
          addShake(7); chip.sfx('boom', { big: true }); dust(this.x + this.face * 12, GROUND_Y, 10);
        }
        break;
      case 'stun':
        this.vx = 0;
        if (this.t > 1.7) { this.st = 'walk'; this.t = 0; }
        break;
      case 'dying':
        this.vx = 0;
        break;
      default: break;
    }
    this.x += this.vx * dt;
    if (this.st !== 'charge' && this.st !== 'enter') this.x = clamp(this.x, left, right);
    if (this.vx) this.dist = (this.dist || 0) + Math.abs(this.vx) * dt;
  },
  draw(g, cx) {
    let anim = 'idle', fr = Math.floor(game.t * 2) % 2;
    switch (this.st) {
      case 'enter': case 'walk': if (this.vx) { anim = 'run'; fr = Math.floor((this.dist || 0) / 9) % 8; } break;
      case 'roar': case 'raise': case 'prep': anim = 'raise'; fr = 0; break;
      case 'smash': anim = 'smash'; fr = this.t < 0.08 ? 0 : 1; break;
      case 'throw': anim = 'throw'; fr = this.t < 0.5 ? 0 : 1; break;
      case 'charge': anim = 'charge'; fr = 0; break;
      case 'stun': anim = 'stun'; fr = Math.floor(this.t * 4) % 2; break;
      case 'dying': anim = 'dead'; fr = Math.min(2, Math.floor(this.deathT / 0.2)); break;
      default: break;
    }
    const sx = this.x - cx;
    if (this.st === 'prep' || this.st === 'charge') { g.globalAlpha = 0.35; drawSprite(g, 'brute', anim, fr, this.face, sx - this.face * 6, this.y); g.globalAlpha = 1; }
    drawSprite(g, 'brute', anim, fr, this.face, sx, this.y, this.flash > 0);
    if (this.st === 'throw' && this.t < 0.5) { disc(g, sx - this.face * 2, this.y - 62, 6, OUTLINE); disc(g, sx - this.face * 2, this.y - 62, 5, '#7a5a3a'); }
    if (this.st === 'stun') for (let i = 0; i < 3; i++) {
      const a = game.t * 6 + (i * TAU) / 3;
      const px = sx + Math.cos(a) * 10, py = this.y - 58 + Math.sin(a) * 3;
      rect(g, px - 1, py, 3, 1, '#ffe27a'); rect(g, px, py - 1, 1, 3, '#ffe27a');
    }
  }
};

/* ---- IRONCLAD: armoured cannon car that rolls out of the tunnel ---------------- */
const IRONCLAD = {
  front() { return this.x; },
  hatchBox() { return box(this.x + 4, this.y - 36, this.x + 26, this.y - 16); },
  boxes() {
    if (this.dead) return [];
    const z = [];
    z.push({ b: this.hatchBox(), armor: this.open < 0.7, mul: 1 });
    z.push({ b: box(this.x, this.y - 60, this.x + 190, this.y - 6), armor: true });
    return z;
  },
  knife(kb) { return bossKnifeOn(this, kb, this.boxes()); },
  shotHit(s, sb) { return bossShotOn(this, s, sb, this.boxes()); },
  blast(x, y, r, d) { bossBlastOn(this, x, y, r, d, this.boxes()); },
  touches() { return false; },
  onPhase() { chip.sfx('horn'); },
  update(dt) {
    const h = game.hero;
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    this.recoil = Math.max(0, this.recoil - dt * 4);
    const p2 = this.phase === 2;
    const stopX = this.ax + 196;
    const ta = Math.atan2(-60, Math.min(-30, h.x - (this.x + 96)));
    this.turretA = approach(this.turretA, clamp(ta, -2.9, -1.75), dt * 1.6);
    if (Math.floor(game.t * 8) % 4 === 0 && Math.random() < 0.3) puff(this.x + 176, this.y - 76, 1, this.hp < this.max / 2 ? '#4a4a4a' : '#9a9a9a');
    if (this.hp < this.max / 2 && Math.random() < 0.08) puff(this.x + rand(30, 170), this.y - rand(20, 56), 1, '#3a3a3a');
    switch (this.st) {
      case 'enter':
        if (this.t < 0.05) chip.sfx('horn');
        this.x = Math.max(stopX, this.x - 70 * dt);
        this.wheel += 70 * dt;
        if (this.x <= stopX) { this.st = 'idle'; this.t = 0; addShake(3); chip.sfx('clang'); }
        break;
      case 'idle':
        if (this.t > (p2 ? 0.5 : 0.9)) {
          const order = ['cannon', 'vent', 'mg', 'deploy', 'vent', 'cannon', 'mg', 'vent'];
          this.st = order[this.seq % order.length]; this.seq++; this.t = 0; this.n = 0;
          if (this.st === 'deploy' && game.foes.filter((e) => e.st !== 'dead').length > 3) this.st = 'mg';
        }
        break;
      case 'cannon': {
        const shots = p2 ? 3 : 2;
        if (this.n < shots && this.t > 0.5 + this.n * 0.8) {
          this.n++; this.recoil = 1;
          const bx = this.x + 96 + Math.cos(this.turretA) * 26, by = this.y - 66 + Math.sin(this.turretA) * 26;
          lob('shell', bx, by, h.x + (this.n === 2 ? rand(-36, 36) : 0) + h.vx * 0.5, GROUND_Y, 1.15, true);
          chip.sfx('boom'); puff(bx, by, 4, '#bdbdbd'); addShake(2);
        }
        if (this.t > 0.6 + shots * 0.8) { this.st = 'idle'; this.t = 0; }
        break;
      }
      case 'vent':
        this.open = this.t < 0.25 ? this.t / 0.25 : this.t > 2.3 ? Math.max(0, 1 - (this.t - 2.3) / 0.25) : 1;
        if (Math.random() < 0.3) puff(this.x + 15, this.y - 38, 1, '#e8eef2');
        if (this.t < 0.02) chip.sfx('flame');
        if (this.t > 2.55) { this.open = 0; this.st = 'idle'; this.t = 0; }
        break;
      case 'mg': {
        const n = p2 ? 4 : 3;
        if (this.t < 0.5 && Math.random() < 0.5) sparks(this.x - 4, this.y - 11, 1, '#ffd34a');
        if (this.t < 0.02) chip.sfx('clang');
        if (this.n < n && this.t > 0.55 + this.n * 0.12) {
          this.n++;
          game.shots.push({ k: 'bullet', x: this.x - 6, y: this.y - 11, vx: -175, vy: 0, t: 0, foe: true });
          muzzle(this.x - 6, this.y - 11); chip.sfx('shot');
        }
        if (this.t > 0.9 + n * 0.12) { this.st = 'idle'; this.t = 0; }
        break;
      }
      case 'deploy':
        this.lid = Math.min(1, this.t / 0.3);
        if (this.n < 2 && this.t > 0.45 + this.n * 0.5) {
          this.n++;
          const e = spawnFoe('grunt', this.x + 44, this.y - 64, -1, { drop: this.n === 2 && chance(0.5) ? pick(['gren', 'tri']) : null });
          e.vx = -105; e.vy = -170; e.ground = false; e.st = 'fall'; e.dropY = null;
        }
        if (this.t > 1.7) { this.lid = 0; this.st = 'idle'; this.t = 0; }
        break;
      case 'dying':
        this.open = 1;
        if (this.t < 2.4 && Math.random() < 0.18) explode(this.x + rand(10, 180), this.y - rand(10, 60), rand(14, 26), {});
        break;
      default: break;
    }
  },
  draw(g, cx) {
    const x0 = Math.round(this.x - cx), by = this.y;
    // track under the car
    for (let x = Math.max(0, x0 - 40); x < W; x += 8) rect(g, x, by - 1, 5, 3, '#4a3a32');
    rect(g, Math.max(0, x0 - 40), by - 3, W, 2, '#8a929c');
    const dark = this.dead;
    const body = dark ? '#2e302a' : '#4a5240', plate = dark ? '#22241f' : '#3a4032', hi = dark ? '#3a3d35' : '#6a7458', rivet = dark ? '#3a3d35' : '#7a8466';
    // turret and barrel
    const tx = x0 + 96, ty = by - 66;
    const rc = this.recoil * 4;
    const ex = tx + Math.cos(this.turretA) * (28 - rc), ey = ty + Math.sin(this.turretA) * (28 - rc);
    stampLine(g, tx, ty, ex, ey, 6, OUTLINE); stampLine(g, tx, ty, ex, ey, 4, dark ? '#2a2a2a' : '#3a3f34');
    disc(g, tx, ty + 2, 12, OUTLINE); disc(g, tx, ty + 2, 11, body); rect(g, tx - 11, ty + 2, 23, 6, body); rect(g, tx - 8, ty - 7, 10, 2, hi);
    // exhaust stack
    rect(g, x0 + 170, by - 76, 8, 18, OUTLINE); rect(g, x0 + 171, by - 75, 6, 17, '#2a2a2a');
    // roof hatch lid
    rect(g, x0 + 36, by - 61, 18, 3, OUTLINE);
    if (this.lid > 0) { stampLine(g, x0 + 54, by - 60, x0 + 54 - Math.cos(this.lid * 1.5) * 16, by - 60 - Math.sin(this.lid * 1.5) * 16, 3, plate); }
    else rect(g, x0 + 36, by - 61, 18, 2, plate);
    // hull
    rect(g, x0 + 8, by - 60, 184, 46, OUTLINE);
    for (let y = by - 59; y < by - 14; y++) {
      const slope = Math.max(0, Math.round((by - 40 - y) * 0.35));
      rect(g, x0 + 9 + slope, y, 182 - slope, 1, y < by - 56 ? hi : body);
    }
    for (let x = x0 + 34; x < x0 + 190; x += 26) rect(g, x, by - 56, 1, 41, plate);
    for (let x = x0 + 30; x < x0 + 190; x += 13) { rect(g, x, by - 54, 1, 1, rivet); rect(g, x, by - 18, 1, 1, rivet); }
    rect(g, x0 + 9, by - 30, 182, 2, plate);
    // identification plate
    rect(g, x0 + 112, by - 50, 34, 11, '#d8c86a'); drawText(g, 'KR-01', x0 + 114, by - 48, '#2a2a20');
    // front armour, plough and MG port
    for (let i = 0; i < 12; i++) rect(g, x0 - 6 + i, by - 12 + i, 16 - i, 1, i % 3 ? '#5a5f52' : '#3a3d35');
    rect(g, x0 + 2, by - 14, 8, 5, '#16171a'); rect(g, x0 - 7, by - 12, 9, 2, '#2a2a2e');
    // hatch with the reactor core
    const hb = { x: x0 + 4, y: by - 36, w: 22, h: 20 };
    rect(g, hb.x - 1, hb.y - 1, hb.w + 2, hb.h + 2, OUTLINE);
    const pulse = 0.5 + 0.5 * Math.sin(game.t * 12);
    rect(g, hb.x, hb.y, hb.w, hb.h, dark ? '#2a1010' : '#5a1010');
    if (!dark) { disc(g, hb.x + 11, hb.y + 10, 7, pulse > 0.5 ? '#ff5a2a' : '#e8402a'); disc(g, hb.x + 11, hb.y + 10, 3, '#ffe27a'); }
    const cover = Math.round((hb.h / 2) * (1 - this.open));
    rect(g, hb.x, hb.y, hb.w, cover, plate); rect(g, hb.x, hb.y + hb.h - cover, hb.w, cover, plate);
    if (cover > 1) { rect(g, hb.x, hb.y + cover - 1, hb.w, 1, hi); rect(g, hb.x + 2, hb.y + 2, 1, 1, rivet); }
    // chassis and wheels
    rect(g, x0 + 4, by - 15, 190, 5, '#22242a');
    for (const wx of [16, 34, 52, 122, 140, 158, 176]) {
      const cxw = x0 + wx, cyw = by - 7;
      disc(g, cxw, cyw, 7, OUTLINE); disc(g, cxw, cyw, 6, '#2a2c32'); disc(g, cxw, cyw, 2, '#7a808a');
      const a = (this.wheel || 0) / 6;
      rect(g, cxw + Math.round(Math.cos(a) * 4), cyw + Math.round(Math.sin(a) * 4), 1, 1, '#9aa0aa');
    }
    if (this.flash > 0) { g.globalAlpha = 0.5; rect(g, hb.x, hb.y, hb.w, hb.h, '#ffffff'); g.globalAlpha = 1; }
    if (dark) { for (let i = 0; i < 3; i++) if (Math.random() < 0.2) puff(this.x + rand(20, 180), by - rand(30, 60), 1, '#2a2a2a'); }
  }
};

/* ---- SKY HAMMER: a gunship over the refinery helipad ------------------------------- */
function gunshipCanvas(face, rotorFrame, flash, dark) {
  const key = 'gs' + face + rotorFrame + (flash ? 'w' : '') + (dark ? 'd' : '');
  if (MISC[key]) return MISC[key];
  const base = miscSprite('gsb' + rotorFrame + (dark ? 'd' : ''), 150, 52, (g) => {
    const cx = 62, cy = 28;
    const body = dark ? '#3a3a2e' : '#7a6e44', shade = dark ? '#2a2a22' : '#565030', hi = dark ? '#4a4a3a' : '#a09468';
    // tail boom and fin
    for (let x = 0; x < 44; x++) { const th = Math.round(6 - x * 0.08); rect(g, cx + 24 + x, cy - 6 + Math.round(x * 0.06), 1, th, x % 9 === 0 ? shade : body); }
    rect(g, cx + 64, cy - 18, 6, 16, body); rect(g, cx + 64, cy - 18, 6, 2, hi);
    // tail rotor
    if (rotorFrame % 2) rect(g, cx + 66, cy - 20, 2, 14, '#2a2a2a'); else rect(g, cx + 60, cy - 13, 14, 2, '#2a2a2a');
    // body capsule
    for (let y = -11; y <= 11; y++) {
      const w = Math.round(Math.sqrt(1 - Math.pow(y / 12, 2)) * 30);
      rect(g, cx - w, cy + y, w * 2 + 4, 1, y < -6 ? hi : y > 6 ? shade : body);
    }
    // cockpit glass
    for (let y = -9; y <= 1; y++) { const w = Math.round(Math.sqrt(1 - Math.pow((y + 4) / 7, 2)) * 9); rect(g, cx - 30 + (9 - w), cy + y, w + 6, 1, y < -6 ? '#bff0ff' : '#5fb6dc'); }
    rect(g, cx - 18, cy - 9, 1, 10, shade);
    // stub wing and rocket pod
    rect(g, cx - 6, cy + 3, 22, 3, shade); rect(g, cx - 4, cy + 6, 16, 5, '#3a3a2a'); rect(g, cx - 5, cy + 7, 2, 3, '#d8402f');
    // nose gun
    rect(g, cx - 34, cy + 6, 8, 2, '#1a1a1a'); rect(g, cx - 28, cy + 4, 5, 5, '#2a2a2a');
    // skids
    rect(g, cx - 14, cy + 11, 2, 6, '#2a2a2a'); rect(g, cx + 10, cy + 11, 2, 6, '#2a2a2a'); rect(g, cx - 22, cy + 17, 40, 2, '#2a2a2a');
    // markings
    tri(g, cx + 12, cy - 4, 8, 6, '#e3bd4b');
    // mast and main rotor
    rect(g, cx - 1, cy - 16, 4, 6, '#2a2a2a');
    const span = rotorFrame % 2 ? 60 : 36;
    rect(g, cx + 1 - span, cy - 17, span * 2, 2, rotorFrame % 2 ? '#3a3a3a' : '#1a1a1a');
  });
  let cv = face > 0 ? base.flip : base.cv;
  if (flash) cv = silhouette(cv, '#ffffff');
  MISC[key] = { cv, w: 150, h: 52 };
  return MISC[key];
}

const GUNSHIP = {
  boxes() {
    if (this.dead) return [];
    return [{ b: box(this.x - 30, this.y - 12, this.x + 30, this.y + 14) }];
  },
  knife(kb) { return bossKnifeOn(this, kb, this.boxes()); },
  shotHit(s, sb) { return bossShotOn(this, s, sb, this.boxes()); },
  blast(x, y, r, d) { bossBlastOn(this, x, y, r, d, this.boxes()); },
  touches() { return false; },
  onPhase() { chip.sfx('alarm'); },
  update(dt) {
    const h = game.hero;
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const p2 = this.phase === 2;
    const L = this.ax + 46, R = this.ax + W - 46;
    if (!this.dead && Math.random() < (this.hp < this.max / 2 ? 0.25 : 0.04)) puff(this.x + this.face * -20, this.y - 6, 1, '#4a4a4a');
    const fly = (tx, ty, sp) => {
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      if (d < 2) { this.vx = 0; this.vy = 0; return true; }
      this.vx = (dx / d) * Math.min(sp, d * 4); this.vy = (dy / d) * Math.min(sp, d * 4);
      return false;
    };
    switch (this.st) {
      case 'enter':
        this.face = -1;
        if (fly(this.ax + W - 90, 62, 110)) { this.st = 'pick'; this.t = 0; }
        break;
      case 'pick': {
        this.vx = 0; this.vy = 0;
        if (this.t > (p2 ? 0.3 : 0.6)) {
          const order = ['strafe', 'hover', 'bomb', 'strafe', 'hover'];
          this.st = order[this.seq % order.length]; this.seq++; this.t = 0; this.n = 0;
          this.tx = this.x > this.ax + W / 2 ? L : R;
          this.side = this.x > this.ax + W / 2 ? 1 : -1;
        }
        break;
      }
      case 'strafe': {
        this.face = sgn(this.tx - this.x) || this.face;
        const done = fly(this.tx, 64, p2 ? 96 : 74);
        if (this.t > 0.6 && (this.t % (p2 ? 0.6 : 0.85)) < dt && !h.dead) {
          const mx = this.x + this.face * 30, my = this.y + 7;
          const a = Math.atan2(h.y - 14 - my, h.x - mx);
          game.shots.push({ k: 'bullet', x: mx, y: my, vx: Math.cos(a) * 165, vy: Math.sin(a) * 165, t: 0, foe: true, aimed: true });
          muzzle(mx, my); chip.sfx('shot');
        }
        if (done) { this.st = 'pick'; this.t = 0; }
        break;
      }
      case 'bomb': {
        this.face = sgn(this.tx - this.x) || this.face;
        const done = fly(this.tx, 50, p2 ? 100 : 82);
        if (this.t > 0.4 && (this.t % (p2 ? 0.34 : 0.46)) < dt) { game.shots.push({ k: 'bomb', x: this.x, y: this.y + 14, vx: this.vx * 0.3, vy: 20, t: 0, foe: true }); chip.sfx('throw'); }
        if (done) { this.st = 'pick'; this.t = 0; }
        break;
      }
      case 'hover': {
        const hx = this.side > 0 ? this.ax + W - 70 : this.ax + 70;
        if (this.n === 0) { this.face = -this.side; if (fly(hx, 124, 90)) { this.n = 1; this.t = 0; } }
        else {
          this.vx = 0; this.vy = Math.sin(this.t * 3) * 6;
          this.face = sgn(h.x - this.x) || this.face;
          if (this.n < 3 && this.t > 0.5 + (this.n - 1) * 0.7 && game.foes.filter((e) => e.st !== 'dead').length < 4) {
            this.n++;
            const e = spawnFoe(p2 && this.n === 3 ? 'striker' : 'grunt', this.x + rand(-6, 6), this.y + 16, this.face, { drop: this.n === 2 ? pick(['rocket', 'gren', 'rocket']) : null });
            e.st = 'fall'; e.ground = false; e.vy = 0; e.vx = 0;
          } else if (this.n < 3 && this.t > 0.5 + (this.n - 1) * 0.7) this.n++;
          if (this.t > 1.2 && (this.t % 1.1) < dt && !h.dead) {
            const mx = this.x + this.face * 30, my = this.y + 7;
            const a = Math.atan2(h.y - 14 - my, h.x - mx);
            game.shots.push({ k: 'bullet', x: mx, y: my, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, t: 0, foe: true, aimed: true });
            muzzle(mx, my); chip.sfx('shot');
          }
          if (this.t > (p2 ? 2.8 : 3.4)) { this.st = 'climb'; this.t = 0; }
        }
        break;
      }
      case 'climb':
        if (fly(this.x, 60, 80)) { this.st = 'pick'; this.t = 0; }
        break;
      case 'dying':
        if (!this.crashed) this.rot += dt * 7;
        this.vx = Math.cos(this.t * 2) * 40; this.vy = Math.min(140, (this.vy || 0) + 120 * dt);
        if (Math.random() < 0.3) puff(this.x, this.y, 2, '#3a3a3a');
        if (this.y > GROUND_Y - 14 && !this.crashed) {
          this.crashed = true; this.vy = 0; this.vx = 0;
          explode(this.x, this.y, 44, {}); explode(this.x - 20, this.y + 4, 30, {}); addShake(9); this.rot = 0.22;
        }
        if (this.crashed) { this.vx = 0; this.vy = 0; this.y = GROUND_Y - 14; }
        break;
      default: break;
    }
    this.tilt = approach(this.tilt, clamp(this.vx / 300, -0.25, 0.25), dt);
    this.x += (this.vx || 0) * dt; this.y += (this.vy || 0) * dt;
    if (!this.dead) this.x = clamp(this.x, this.ax - 120, this.ax + W + 120);
  },
  draw(g, cx) {
    const frame = Math.floor(game.t * 30) % 2;
    const c = gunshipCanvas(this.face, frame, this.flash > 0, this.crashed);
    const sx = Math.round(this.x - cx), sy = Math.round(this.y);
    g.save();
    g.translate(sx, sy);
    g.rotate(this.dead ? this.rot : this.face * -this.tilt);
    g.drawImage(c.cv, this.face > 0 ? -88 : -62, -28);
    g.restore();
    if (!this.dead && this.st === 'hover' && this.n > 0) {
      g.globalAlpha = 0.25 + 0.1 * Math.sin(game.t * 30);
      for (let i = 0; i < 6; i++) rect(g, sx - 30 + i * 12 + Math.floor(Math.random() * 4), GROUND_Y - 3, 6, 2, '#f0d8a0');
      g.globalAlpha = 1;
    }
  }
};

/* ---- GENERAL KROME: the final duel -------------------------------------------------- */
const KROME = {
  boxes() {
    if (this.dead) return [];
    if (this.st === 'dash') return [{ b: box(this.x - 7, this.y - 26, this.x + 7, this.y - 1) }];
    return [{ b: box(this.x - 6, this.y - 34, this.x + 6, this.y - 1) }];
  },
  knife(kb) {
    const r = bossKnifeOn(this, kb, this.boxes());
    if (r && !this.dead) {
      this.recentHits = this.recentHits.filter((t) => game.t - t < 1.2);
      this.recentHits.push(game.t);
      if (this.recentHits.length >= 3 && this.ground && this.st !== 'evade') {
        this.recentHits = [];
        this.st = 'evade'; this.t = 0; this.vy = -230; this.vx = -sgn(game.hero.x - this.x) * 120; this.ground = false;
      }
    }
    return r;
  },
  shotHit(s, sb) { return bossShotOn(this, s, sb, this.boxes()); },
  blast(x, y, r, d) { bossBlastOn(this, x, y, r, d, this.boxes()); },
  touches(hb) {
    if (this.dead || this.st === 'enter') return false;
    const f = this.face;
    if (this.st === 'slash' && this.t >= 0.3 && this.t < 0.44) {
      const z = f > 0 ? box(this.x + 4, this.y - 38, this.x + 30, this.y - 6) : box(this.x - 30, this.y - 38, this.x - 4, this.y - 6);
      if (boxHit(z, hb)) return true;
    }
    if (this.st === 'dash' && this.t > 0.45) {
      const z = f > 0 ? box(this.x - 4, this.y - 24, this.x + 18, this.y - 4) : box(this.x - 18, this.y - 24, this.x + 4, this.y - 4);
      if (boxHit(z, hb)) return true;
    }
    return false;
  },
  onPhase() {
    pop(this.x, this.y - 48, 'GUARDS!', '#ff8a6a'); chip.sfx('alarm');
    spawnFoe('guard', this.ax + W + 10, GROUND_Y, -1, {});
    spawnFoe('guard', this.ax - 10, GROUND_Y, 1, {});
  },
  update(dt) {
    const h = game.hero;
    this.t += dt; this.flash = Math.max(0, this.flash - dt);
    const p2 = this.phase === 2;
    const dx = h.x - this.x, adx = Math.abs(dx), toward = dx >= 0 ? 1 : -1;
    const same = !h.climb && Math.abs(h.y - this.y) < 14;
    const sp = p2 ? 66 : 52;
    switch (this.st) {
      case 'enter':
        this.face = -1; this.vx = -60;
        if (this.x < this.ax + W - 70) { this.vx = 0; this.st = 'taunt'; this.t = 0; pop(this.x, this.y - 46, 'YOU END HERE.', '#ffd27a'); }
        break;
      case 'taunt':
        this.vx = 0;
        if (this.t > 1.2) { this.st = 'stalk'; this.t = 0; }
        break;
      case 'stalk': {
        this.face = toward;
        if (!same && this.ground && !h.climb && (h.ground || h.y > this.y)) {
          if (this.t > 0.5) { this.st = 'leap'; this.t = 0; this.leapTo(h); }
          else this.vx = 0;
          break;
        }
        this.vx = adx > 26 ? toward * sp : 0;
        if (!same) break;
        if (adx < 30 && this.t > 0.25) { this.st = 'slash'; this.t = 0; break; }
        if (this.t > (p2 ? 0.8 : 1.3)) {
          const r = Math.random();
          if (adx > 70 && r < 0.4) { this.st = 'dashPrep'; this.t = 0; }
          else if (r < 0.7) { this.st = 'shoot'; this.t = 0; this.n = 0; }
          else if (adx > 50) { this.st = 'grenade'; this.t = 0; this.n = 0; }
          else { this.st = 'slash'; this.t = 0; }
        }
        break;
      }
      case 'slash':
        this.vx = this.t > 0.28 && this.t < 0.42 ? this.face * 80 : 0;
        if (this.t > 0.3 && this.t < 0.32) chip.sfx('knife');
        if (this.t > 0.72) { this.st = 'stalk'; this.t = 0; }
        break;
      case 'dashPrep':
        this.vx = 0; this.face = toward;
        if (this.t > 0.45) { this.st = 'dash'; this.t = 0.45; this.dashFrom = this.x; chip.sfx('throw'); }
        break;
      case 'dash':
        this.vx = this.face * (p2 ? 240 : 205);
        if (Math.floor(this.t * 30) % 2) dust(this.x - this.face * 6, this.y, 1);
        if (Math.abs(this.x - this.dashFrom) > 190 || this.x < this.ax + 16 || this.x > this.ax + W - 16 || !supportAt(this.x + this.face * 6, this.y)) {
          this.vx = 0; this.st = p2 ? 'slash' : 'stalk'; this.t = 0; this.face = toward;
        }
        break;
      case 'shoot':
        this.vx = 0; this.face = toward;
        if (this.n < (p2 ? 4 : 3) && this.t > 0.35 + this.n * 0.32) {
          this.n++;
          const mx = this.x + this.face * 14, my = this.y - 24;
          game.shots.push({ k: 'bullet', x: mx, y: my, vx: this.face * 165, vy: 0, t: 0, foe: true });
          muzzle(mx, my); chip.sfx('shot');
        }
        if (this.t > 0.6 + (p2 ? 4 : 3) * 0.32) { this.st = 'stalk'; this.t = 0; }
        break;
      case 'grenade':
        this.vx = 0; this.face = toward;
        if (this.n < 2 && this.t > 0.35 + this.n * 0.45) {
          this.n++;
          const ty = h.ground || h.climb ? h.y : (landY(h.x, h.y, GROUND_Y, null) || GROUND_Y);
          lob('egren', this.x, this.y - 30, h.x + (this.n === 2 ? rand(-30, 30) : 0), ty, 0.9, true);
          chip.sfx('throw');
        }
        if (this.t > 1.3) { this.st = 'stalk'; this.t = 0; }
        break;
      case 'leap': case 'evade':
        if (this.ground && this.t > 0.1) { this.st = 'stalk'; this.t = 0; dust(this.x, this.y, 4); }
        break;
      case 'dying':
        this.vx = approach(this.vx || 0, 0, 200 * dt);
        break;
      default: break;
    }
    const wasAir = !this.ground;
    actorPhys(this, dt);
    if (wasAir && this.ground) addShake(2);
    this.x = clamp(this.x, this.ax + 10, this.ax + W - 10);
    if (this.vx && this.ground) this.dist = (this.dist || 0) + Math.abs(this.vx) * dt;
  },
  leapTo(h) {
    // jump onto the hero's level: up onto a deck, or down off one
    const ty = h.ground ? h.y : GROUND_Y;
    let tx = clamp(h.x + rand(-30, 30), this.ax + 20, this.ax + W - 20);
    if (ty < this.y) {
      const d = game.st.decks.find((k) => Math.abs(k.y - ty) < 1 && k.x1 > this.ax && k.x0 < this.ax + W);
      if (d) tx = clamp(tx, d.x0 + 10, d.x1 - 10);
      const height = this.y - ty + 18;
      this.vy = -Math.sqrt(2 * GRAV * height);
      const tUp = -this.vy / GRAV, tDown = Math.sqrt(2 * 18 / GRAV);
      this.vx = (tx - this.x) / (tUp + tDown);
    } else {
      this.dropY = this.y; this.vy = -160;
      const T = 0.9;
      this.vx = (tx - this.x) / T;
    }
    this.ground = false;
    this.face = sgn(this.vx) || this.face;
    chip.sfx('jump');
  },
  draw(g, cx) {
    let anim = 'idle', fr = Math.floor(game.t * 2) % 2;
    switch (this.st) {
      case 'enter': case 'stalk': if (this.vx) { anim = 'run'; fr = Math.floor((this.dist || 0) / 7) % 8; } break;
      case 'slash': anim = 'slash'; fr = this.t < 0.3 ? 0 : this.t < 0.44 ? 1 : 2; break;
      case 'dashPrep': anim = 'idle'; fr = 0; break;
      case 'dash': anim = 'dash'; fr = 0; break;
      case 'shoot': anim = 'shoot'; fr = 0; break;
      case 'grenade': anim = 'throw'; fr = (this.t % 0.45) < 0.3 ? 0 : 1; break;
      case 'leap': case 'evade': anim = 'dash'; fr = 0; break;
      case 'dying': anim = this.deathT < 1.0 ? 'hurt' : 'dead'; fr = this.deathT < 1.0 ? 0 : Math.min(2, Math.floor((this.deathT - 1) / 0.15)); break;
      default: break;
    }
    const sx = this.x - cx;
    if (this.st === 'dash') { g.globalAlpha = 0.3; drawSprite(g, 'general', anim, fr, this.face, sx - this.face * 8, this.y); g.globalAlpha = 1; }
    drawSprite(g, 'general', anim, fr, this.face, sx, this.y, this.flash > 0);
    if (this.st === 'dashPrep' && Math.floor(this.t * 16) % 2 === 0) {
      const gx = sx + this.face * 9, gy = this.y - 30;
      rect(g, gx - 3, gy, 7, 1, '#ffffff'); rect(g, gx, gy - 3, 1, 7, '#ffffff');
    }
  }
};
