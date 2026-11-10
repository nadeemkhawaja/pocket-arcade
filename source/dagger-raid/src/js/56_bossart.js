/* ==========================================================================
   Boss art: the brute, the armoured rail car, the gunship and the general
   ========================================================================== */

function drawMauler(b, g, cx) {
  let anim = 'idle', fr = game.t * 1.6;
  switch (b.st) {
    case 'enter': case 'walk': if (b.vx) { anim = 'run'; fr = (b.dist || 0) / 9; } break;
    case 'roar': case 'raise': case 'prep': anim = 'raise'; fr = 0; break;
    case 'smash': anim = 'smash'; fr = Math.min(1, b.t / 0.08); break;
    case 'throw': anim = 'throw'; fr = b.t < 0.5 ? 0 : 1; break;
    case 'charge': anim = 'charge'; fr = 0; break;
    case 'stun': anim = 'stun'; fr = b.t * 4; break;
    case 'dying': anim = 'dead'; fr = Math.min(2, b.deathT / 0.2); break;
    default: break;
  }
  const sx = b.x - cx;
  drawShadowV(g, cx, b.x, b.y, 16);
  if (b.st === 'charge') for (let i = 1; i <= 2; i++) drawSprite(g, 'brute', anim, fr, b.face, sx - b.face * 9 * i, b.y, '#ff6a4a', 0.3 / i);
  if (b.st === 'prep' || (b.st === 'raise' && b.phase === 2)) drawGlow(g, sx, b.y - 34, 36, '#ff4a2a', 0.35 + 0.25 * Math.sin(game.t * 24));
  drawSprite(g, 'brute', anim, fr, b.face, sx, b.y, b.flash > 0);
  if (b.st === 'throw' && b.t < 0.5) {
    g.save(); g.translate(sx - b.face * 2, b.y - 63); g.rotate(b.t * 3);
    inked(g, () => polyPath(g, [-6.4, -2, -2.4, -6.6, 4, -5.4, 6.8, 0.4, 3.4, 6, -3.6, 5.4]), '#7a5a3a', 0.9);
    poly(g, [-4.2, -2, -1.6, -4.8, 3, -4, 0.4, -1], '#a8825a');
    g.restore();
  }
  if (b.st === 'raise' && b.t > 0.2) drawGlint(g, sx + b.face * 3, b.y - 76, 4, '#ffffff');
  if (b.st === 'stun') for (let i = 0; i < 3; i++) {
    const a = game.t * 6 + (i * TAU) / 3;
    drawGlint(g, sx + Math.cos(a) * 11, b.y - 62 + Math.sin(a) * 3.4, 2.4, '#ffe27a');
  }
}

function drawIronclad(b, g, cx) {
  const x0 = b.x - cx, by = b.y, dark = b.dead;
  const body = dark ? '#2e302a' : '#59634a', bodyS = dark ? '#1c1e1a' : '#3a4232', bodyL = dark ? '#3a3d35' : '#7c8866', plate = dark ? '#22241f' : '#434b38', rivet = dark ? '#3a3d35' : '#9aa57e';
  const shake = b.st === 'dying' ? rand(-0.6, 0.6) : 0;
  g.save(); g.translate(x0 + shake, 0);
  // shadow under the car
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-4, by - 2, 200, 3.4);
  // exhaust stack and roof gear
  inked(g, () => roundRectPath(g, 170, by - 77, 8.4, 19, 1.2), '#2a2c30', 0.9); rect(g, 171, by - 76.4, 1.6, 17.6, '#4a4e56'); rect(g, 169.4, by - 78, 9.6, 2.2, '#16171a');
  // turret: ring, dome, barrel with recoil
  const tx = 96, ty = by - 66, rc = b.recoil * 4, ta = b.turretA;
  const ex = tx + Math.cos(ta) * (30 - rc), ey = ty + Math.sin(ta) * (30 - rc);
  g.lineCap = 'butt';
  stampLine(g, tx, ty, ex, ey, 7, INK); stampLine(g, tx, ty, ex, ey, 5.6, dark ? '#2a2a2a' : '#3c4236');
  stampLine(g, tx + Math.cos(ta) * 4 - Math.sin(ta) * -1.6, ty + Math.sin(ta) * 4 + Math.cos(ta) * -1.6, ex - Math.sin(ta) * -1.6, ey + Math.cos(ta) * -1.6, 1.2, dark ? '#3a3a3a' : '#6c7660');
  g.save(); g.translate(ex, ey); g.rotate(ta); rrect(g, -3.6, -4.8, 6.4, 9.6, 1, INK); rrect(g, -3, -4.2, 5.2, 8.4, 0.8, '#23261f'); g.restore();
  inked(g, () => { g.beginPath(); g.arc(tx, ty + 3, 13, Math.PI, 0); g.lineTo(tx + 14.5, ty + 9); g.lineTo(tx - 14.5, ty + 9); g.closePath(); }, body, 1);
  g.fillStyle = bodyL; g.beginPath(); g.arc(tx - 2, ty + 2, 9.4, Math.PI * 1.05, Math.PI * 1.75); g.lineTo(tx - 2, ty + 2); g.closePath(); g.fill();
  rect(g, tx - 14, ty + 7, 28, 1.2, bodyS); for (let i = -10; i <= 10; i += 5) disc(g, tx + i, ty + 4.6, 0.6, rivet);
  // roof hatch lid for the troops
  if (b.lid > 0) { const la = b.lid * 1.5; stampLine(g, 54, by - 60, 54 - Math.cos(la) * 17, by - 60 - Math.sin(la) * 17, 3.4, INK); stampLine(g, 54, by - 60, 54 - Math.cos(la) * 17, by - 60 - Math.sin(la) * 17, 2.2, plate); }
  else { rrect(g, 35.4, by - 62.6, 19.2, 3.6, 1, INK); rrect(g, 36, by - 62, 18, 2.4, 0.8, plate); }
  // hull: sloped glacis at the front, slab sides
  const hull = () => { g.beginPath(); g.moveTo(8, by - 14); g.lineTo(8, by - 38); g.lineTo(16, by - 60); g.lineTo(192, by - 60); g.lineTo(192, by - 14); g.closePath(); };
  inked(g, hull, bodyS, 1.2);
  g.save(); hull(); g.clip();
  g.fillStyle = lgrad(g, 0, by - 60, 0, by - 14, [[0, bodyL], [0.12, body], [0.62, body], [1, bodyS]]); g.fillRect(8, by - 60, 184, 46);
  g.fillStyle = dark ? 'rgba(0,0,0,0.25)' : 'rgba(20,26,14,0.3)';
  for (let x = 34; x < 190; x += 26) g.fillRect(x, by - 58, 0.8, 44);
  g.fillRect(8, by - 31, 184, 1.4);
  if (!dark) { g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(8, by - 59.4, 184, 1.2); g.fillRect(8, by - 29.4, 184, 0.6); }
  // camouflage sweeps
  if (!dark) { g.fillStyle = 'rgba(40,48,30,0.4)'; for (const [cx0, cy0, rw] of [[60, 48, 16], [112, 24, 20], [158, 50, 14]]) { g.beginPath(); g.ellipse(cx0, by - cy0, rw, 6, -0.3, 0, TAU); g.fill(); } }
  g.restore();
  for (let x = 30; x < 190; x += 13) { disc(g, x, by - 55.4, 0.55, rivet); disc(g, x, by - 17, 0.55, rivet); }
  // identification plate
  rrect(g, 112.6, by - 50.6, 35.8, 12.2, 1, INK); rrect(g, 113.2, by - 50, 34.6, 11, 0.8, dark ? '#6a6440' : '#e0cf6a');
  drawText(g, 'KR-01', 130.5, by - 49.2, '#2a2a20', { align: 'center', scale: 1.02, display: true });
  // view slits
  for (const sx of [70, 86, 156, 172]) { rrect(g, sx, by - 44, 9, 2.6, 1, '#0c0d0f'); rect(g, sx + 0.6, by - 43.6, 7.8, 0.6, 'rgba(160,220,255,0.35)'); }
  // plough and the machine gun port
  inked(g, () => polyPath(g, [-8, by - 0.5, 9, by - 15, 9, by - 2, 4, by - 0.5]), '#5a5f52', 1);
  for (let i = 0; i < 4; i++) stampLine(g, -5 + i * 3.4, by - 2, 6.4, by - 12.4 + i * 3, 0.6, '#2e3129');
  rrect(g, 1.4, by - 15.6, 9.6, 6.6, 1.4, INK); rrect(g, 2, by - 15, 8.4, 5.4, 1, '#16171a');
  rect(g, -7.6, by - 12.4, 10, 2.6, INK); rect(g, -7, by - 11.9, 9, 1.6, '#3a3d42');
  if (b.st === 'mg' && b.t < 0.55) drawGlint(g, -7, by - 11, 3 + b.t * 3, '#ff6a4a');
  // the reactor hatch: armour shutters part to show the core
  const hx = 4, hy = by - 36, hw = 22, hh = 20;
  rrect(g, hx - 1.2, hy - 1.2, hw + 2.4, hh + 2.4, 1.6, INK);
  g.fillStyle = dark ? '#1c0c0c' : rgrad(g, hx + 11, hy + 10, 1, 13, [[0, '#7a1a10'], [1, '#2a0808']]); g.fillRect(hx, hy, hw, hh);
  if (!dark) {
    const pulse = 0.5 + 0.5 * Math.sin(game.t * 12);
    if (b.open > 0.2) drawGlow(g, hx + 11, hy + 10, 20 + pulse * 6, '#ff5a2a', b.open * 0.9);
    disc(g, hx + 11, hy + 10, 6.6, '#ff5a2a'); disc(g, hx + 11, hy + 10, 4.2 + pulse, '#ffb040'); disc(g, hx + 11, hy + 10, 2.2, '#fff4c0');
    g.strokeStyle = '#3a0c08'; g.lineWidth = 0.7; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(hx + 11, hy + 10, 7.6, i * 2.09 + game.t * 2, i * 2.09 + game.t * 2 + 1.2); g.stroke(); }
  }
  const cover = (hh / 2) * (1 - b.open);
  if (cover > 0.3) {
    g.fillStyle = lgrad(g, 0, hy, 0, hy + hh, [[0, bodyL], [0.5, plate], [1, bodyS]]);
    g.fillRect(hx, hy, hw, cover); g.fillRect(hx, hy + hh - cover, hw, cover);
    rect(g, hx, hy + cover - 0.7, hw, 0.7, INK); rect(g, hx, hy + hh - cover, hw, 0.7, INK);
    for (let i = 0; i < 4; i++) { rect(g, hx + 2 + i * 5.4, hy + 1, 2.4, Math.max(0, cover - 2.4), i % 2 ? '#e3bd4b' : '#22241f'); }
  }
  if (b.open < 0.7 && !dark && b.st === 'idle') { /* sealed: nothing to warn about */ }
  if (b.st === 'vent' && b.open > 0.7 && Math.floor(game.t * 5) % 2 === 0) { drawText(g, 'WEAK POINT', hx + 11, hy - 11, '#ffd27a', { align: 'center', scale: 0.8, weight: 700, stroke: 'rgba(8,8,14,0.85)' }); }
  if (b.flash > 0) { g.globalAlpha = 0.55; rect(g, hx, hy, hw, hh, '#ffffff'); g.globalAlpha = 1; }
  // chassis, wheels and coupling rods
  rrect(g, 3.4, by - 15.6, 191.2, 6.2, 1, INK); rect(g, 4, by - 15, 190, 5, '#26282e'); rect(g, 4, by - 15, 190, 0.8, '#4a4e58');
  const wa = (b.wheel || 0) / 6.4;
  for (const wx of [16, 34, 52, 122, 140, 158, 176]) {
    const wy = by - 7;
    disc(g, wx, wy, 7.4, INK); disc(g, wx, wy, 6.6, '#2a2c32'); ring(g, wx, wy, 6.6, 1.1, '#555a64'); disc(g, wx, wy, 2.2, '#8a909a');
    for (let i = 0; i < 4; i++) { const a = wa + (i * Math.PI) / 2; stampLine(g, wx, wy, wx + Math.cos(a) * 5.2, wy + Math.sin(a) * 5.2, 0.7, '#555a64'); }
  }
  for (const [a, c] of [[16, 52], [122, 176]]) stampLine(g, a + Math.cos(wa) * 3.6, by - 7 + Math.sin(wa) * 3.6, c + Math.cos(wa) * 3.6, by - 7 + Math.sin(wa) * 3.6, 1.3, '#8a909a');
  // headlamp
  if (!dark) { disc(g, 10, by - 44, 2.4, INK); disc(g, 10, by - 44, 1.8, '#fff2c0'); drawGlow(g, 8, by - 44, 16, '#ffe9a0', 0.55); }
  g.restore();
  if (dark) { for (let i = 0; i < 3; i++) if (Math.random() < 0.2) puff(b.x + rand(20, 180), by - rand(30, 60), 1, '#2a2a2a'); }
}

function drawGunship(b, g, cx) {
  const sx = b.x - cx, sy = b.y, dark = b.crashed;
  const body = dark ? '#3a3a2e' : '#8a7c4c', bodyS = dark ? '#262620' : '#5a5232', bodyL = dark ? '#4a4a3a' : '#b4a670', steel = '#2a2c30';
  if (!b.dead && b.y < GROUND_Y - 30) {
    // rotor wash on the ground
    const k = clamp(1 - (GROUND_Y - b.y) / 150, 0, 1);
    g.save(); g.translate(sx, GROUND_Y - 1); g.scale(1, 0.22);
    g.globalAlpha = 0.14 + k * 0.3; g.strokeStyle = '#f0d8a0'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const r = 16 + ((game.t * 60 + i * 14) % 42); g.globalAlpha = (0.2 + k * 0.4) * (1 - (r - 16) / 42); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
    g.restore(); g.globalAlpha = 1;
    drawShadowV(g, cx, b.x, GROUND_Y, 30);
  }
  g.save();
  g.translate(sx, sy);
  g.rotate(b.dead ? b.rot : b.face * -b.tilt);
  g.scale(-b.face, 1);
  if (b.flash > 0) { g.shadowColor = '#ffffff'; g.shadowBlur = 0; }
  // tail boom, fin and tail rotor
  inked(g, () => polyPath(g, [22, -7, 70, -5.4, 70, -1.6, 22, 3]), bodyS, 1);
  poly(g, [22, -6.4, 70, -5, 70, -3.8, 22, -3], body);
  inked(g, () => polyPath(g, [62, -5, 66, -20, 73, -20, 72, -2]), body, 1); poly(g, [66.4, -19, 72, -19, 71.6, -15, 65.6, -15], '#c8382c');
  const tr = game.t * 50;
  g.save(); g.translate(69, -12); g.globalAlpha = 0.5; disc(g, 0, 0, 8, 'rgba(30,30,34,0.35)'); g.globalAlpha = 1;
  if (!dark) { g.rotate(tr); rect(g, -8, -0.7, 16, 1.4, steel); rect(g, -0.7, -8, 1.4, 16, steel); }
  disc(g, 0, 0, 1.4, '#8a909a'); g.restore();
  // skids
  for (const lx of [-13, 11]) stampLine(g, lx, 10, lx - 1.5, 17.4, 1.5, steel);
  stampLine(g, -23, 18, 19, 18, 2.2, INK); stampLine(g, -23, 18, 19, 18, 1.2, '#5a606a'); stampLine(g, -23, 18, -26, 15.6, 1.2, '#5a606a');
  // fuselage
  const hull = () => { g.beginPath(); g.moveTo(-33, 3); g.bezierCurveTo(-34, -7, -24, -13, -10, -13); g.lineTo(18, -13); g.bezierCurveTo(28, -12, 33, -6, 30, 3); g.bezierCurveTo(26, 10, 12, 12.6, -6, 12.6); g.bezierCurveTo(-22, 12.6, -31, 10, -33, 3); g.closePath(); };
  inked(g, hull, bodyS, 1.2);
  g.save(); hull(); g.clip();
  g.fillStyle = lgrad(g, 0, -13, 0, 13, [[0, bodyL], [0.3, body], [0.7, body], [1, bodyS]]); g.fillRect(-36, -14, 70, 28);
  if (!dark) { g.fillStyle = 'rgba(70,64,36,0.45)'; g.beginPath(); g.ellipse(4, 0, 12, 5, -0.2, 0, TAU); g.fill(); g.beginPath(); g.ellipse(22, -6, 8, 4, 0.3, 0, TAU); g.fill(); }
  g.restore();
  // canopy glass
  const glass = () => { g.beginPath(); g.moveTo(-31, 1); g.bezierCurveTo(-31, -7, -24, -11.6, -14, -11.6); g.lineTo(-11, -11.6); g.lineTo(-11, 2); g.closePath(); };
  inked(g, glass, dark ? '#20262a' : '#3a8ab4', 0.9);
  if (!dark) { g.save(); glass(); g.clip(); g.fillStyle = lgrad(g, -31, -12, -11, 2, [[0, '#d8f6ff'], [0.45, '#6ac0e6'], [1, '#2a6a94']]); g.fillRect(-32, -12, 22, 15); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(-27, -8); g.lineTo(-22, -10.6); g.lineTo(-24, -1); g.lineTo(-29, -1); g.closePath(); g.fill(); g.restore(); }
  stampLine(g, -20, -11.4, -20, 1.6, 0.7, bodyS);
  // door, markings, stub wing and rocket pod
  g.strokeStyle = 'rgba(30,26,12,0.55)'; g.lineWidth = 0.5; g.strokeRect(-6, -8, 13, 14);
  poly(g, [10, -7, 18, -7, 14, -1], '#e3bd4b'); drawText(g, 'SH-9', 20, 1.4, 'rgba(24,20,10,0.7)', { scale: 0.62, weight: 700 });
  inked(g, () => polyPath(g, [-8, 3.4, 15, 3.4, 13, 6.6, -6, 6.6]), bodyS, 0.9);
  inked(g, () => roundRectPath(g, -6, 6.4, 18, 5.4, 2.4), '#3c3e34', 0.9);
  for (let i = 0; i < 3; i++) disc(g, -4.4, 7.6 + i * 1.5, 0.7, i === 1 ? '#d8402f' : '#16171a');
  // nose gun
  stampLine(g, -27, 6, -37, 7.4, 2.6, INK); stampLine(g, -27, 6, -37, 7.4, 1.5, '#3a3d42');
  inked(g, () => roundRectPath(g, -30, 3.6, 6.6, 5.4, 1.6), steel, 0.8);
  // mast and main rotor blur
  rect(g, -2.2, -18.4, 4.4, 6, INK); rect(g, -1.5, -18, 3, 5.4, '#4a4e56');
  if (dark) { stampLine(g, -1, -18, -34, -12, 1.6, steel); stampLine(g, 1, -18, 26, -24, 1.6, steel); }
  else {
    const ph = Math.sin(game.t * 70);
    g.fillStyle = 'rgba(30,30,34,0.2)'; g.beginPath(); g.ellipse(0, -18.6, 58, 2.6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(20,20,24,0.75)'; g.beginPath(); g.ellipse(0, -18.6, 58 * Math.abs(ph) + 6, 1.1, 0, 0, TAU); g.fill();
    disc(g, 0, -18.8, 2, '#8a909a');
  }
  if (b.flash > 0) { g.globalAlpha = 0.5; hull(); g.fillStyle = '#ffffff'; g.fill(); g.globalAlpha = 1; }
  g.restore();
  if (!b.dead && b.hp < b.max / 2 && Math.floor(game.t * 12) % 2) drawGlow(g, sx + b.face * -16, sy - 6, 9, '#ff7a2a', 0.8);
}

function drawKrome(b, g, cx) {
  let anim = 'idle', fr = game.t * 1.6;
  switch (b.st) {
    case 'enter': case 'stalk': if (b.vx) { anim = 'run'; fr = (b.dist || 0) / 7; } break;
    case 'slash': anim = 'slash'; fr = b.t < 0.3 ? b.t / 0.3 : b.t < 0.44 ? 1 : 1 + Math.min(1, (b.t - 0.44) / 0.28); break;
    case 'dashPrep': anim = 'idle'; fr = 0; break;
    case 'dash': anim = 'dash'; fr = 0; break;
    case 'shoot': anim = 'shoot'; fr = 0; break;
    case 'grenade': anim = 'throw'; fr = (b.t % 0.45) < 0.3 ? 0 : 1; break;
    case 'leap': case 'evade': anim = 'dash'; fr = 0; break;
    case 'dying': anim = b.deathT < 1.0 ? 'hurt' : 'dead'; fr = b.deathT < 1.0 ? 0 : Math.min(2, (b.deathT - 1) / 0.15); break;
    default: break;
  }
  const sx = b.x - cx;
  drawShadowV(g, cx, b.x, b.y, 10);
  if (b.st === 'dash' || b.st === 'evade' || b.st === 'leap') for (let i = 1; i <= 3; i++) drawSprite(g, 'general', anim, fr, b.face, sx - sgn(b.vx || b.face) * 8 * i, b.y, '#ff5a5a', 0.3 / i);
  drawSprite(g, 'general', anim, fr, b.face, sx, b.y, b.flash > 0);
  if (b.st === 'slash' && b.t >= 0.3 && b.t < 0.33 && !b.arcT) {
    game.fx.push({ k: 'slash', x: b.x + b.face * 4, y: b.y - 22, face: b.face, r: 30, a0: -1.9, a1: 1.0, col: '#ffd0a0', t: 0, life: 0.18 });
    b.arcT = 1;
  }
  if (b.st !== 'slash') b.arcT = 0;
  if (b.st === 'dashPrep') drawGlint(g, sx + b.face * 9, b.y - 30, 3 + b.t * 6, '#ffffff');
  if (b.st === 'slash' && b.t < 0.3 && b.t > 0.12) drawGlint(g, sx + b.face * 2, b.y - 40, 3.4, '#ffffff');
  if (b.st === 'shoot' && b.n === 0 && b.t > 0.15) drawGlint(g, sx + b.face * 14, b.y - 24, 3, '#ff6a4a');
}
