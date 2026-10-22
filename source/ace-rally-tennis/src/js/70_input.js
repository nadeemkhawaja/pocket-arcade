/* ==========================================================================
   Input: keyboard, mouse, touch buttons and the webcam raise-a-hand detector
   ========================================================================== */

const input = {
  left: false, right: false, up: false, down: false, tLeft: false, tRight: false,

  aim() {
    return ((this.right || this.tRight) ? 1 : 0) - ((this.left || this.tLeft) ? 1 : 0);
  },

  fire(src, extra) {
    audio.unlock();
    const inp = Object.assign({ src, aim: this.aim(), lob: this.up, slice: this.down }, extra || {});
    onSwingInput(inp);
  },

  reset() { this.left = this.right = this.up = this.down = this.tLeft = this.tRight = false; },

  init() {
    window.addEventListener('keydown', (e) => {
      if (ui.typing()) return;
      const code = e.code;
      if (code === 'Escape' || code === 'KeyP') {
        if (ui.playing() || game.paused) { e.preventDefault(); ui.togglePause(); }
        else if (code === 'Escape') ui.back();
        return;
      }
      if (code === 'KeyM') { ui.toggleMute(); return; }
      if (!ui.playing()) return;
      switch (code) {
        case 'ArrowLeft': case 'KeyA': this.left = true; e.preventDefault(); break;
        case 'ArrowRight': case 'KeyD': this.right = true; e.preventDefault(); break;
        case 'ArrowUp': case 'KeyW': this.up = true; e.preventDefault(); break;
        case 'ArrowDown': case 'KeyS': this.down = true; e.preventDefault(); break;
        case 'Space': case 'Enter': case 'NumpadEnter': case 'KeyJ':
          e.preventDefault();
          if (!e.repeat) this.fire('keys');
          break;
        case 'KeyK': if (!e.repeat) this.fire('keys', { lob: true }); break;
        case 'KeyL': if (!e.repeat) this.fire('keys', { slice: true }); break;
        default: break;
      }
    });
    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': this.left = false; break;
        case 'ArrowRight': case 'KeyD': this.right = false; break;
        case 'ArrowUp': case 'KeyW': this.up = false; break;
        case 'ArrowDown': case 'KeyS': this.down = false; break;
        default: break;
      }
    });
    window.addEventListener('blur', () => this.reset());

    // clicking or tapping the court swings; the outer thirds aim
    $('gl').addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (!ui.playing()) return;
      const fx = e.clientX / Math.max(1, window.innerWidth);
      const aim = fx < 0.27 ? -1 : fx > 0.73 ? 1 : this.aim();
      this.fire(e.pointerType === 'mouse' ? 'keys' : 'touch', { aim });
    });
    $('app').addEventListener('contextmenu', (e) => e.preventDefault());

    const hold = (el, on, off) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault(); e.stopPropagation();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
        el.classList.add('on');
        on();
      });
      const up = () => { el.classList.remove('on'); if (off) off(); };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    };
    hold($('tAimL'), () => { this.tLeft = true; }, () => { this.tLeft = false; });
    hold($('tAimR'), () => { this.tRight = true; }, () => { this.tRight = false; });
    hold($('tSwing'), () => { if (ui.playing()) this.fire('touch'); });
    hold($('tLob'), () => { if (ui.playing()) this.fire('touch', { lob: true }); });
    hold($('tDrop'), () => { if (ui.playing()) this.fire('touch', { slice: true }); });

    cam.onSwing = (inp) => {
      if (ui.camSetupOpen()) { ui.camDetected(inp); return; }
      if (ui.playing()) onSwingInput(inp);
    };
  }
};

/* ---- webcam: motion in the side boxes above the shoulders means a raised hand ---- */
const CALIB_FRAMES = 16;

class CamSwing {
  constructor() {
    this.W = 96; this.H = 72;
    this.cv = document.createElement('canvas'); this.cv.width = this.W; this.cv.height = this.H;
    this.ctx = this.cv.getContext('2d', { willReadFrequently: true });
    this.mask = document.createElement('canvas'); this.mask.width = this.W; this.mask.height = this.H;
    this.mctx = this.mask.getContext('2d');
    this.maskImg = this.mctx.createImageData(this.W, this.H);
    this.zones = [
      { name: 'L', x0: 0.02, x1: 0.31, y0: 0.04, y1: 0.5, smooth: 0, raised: false, since: 0, flash: 0 },
      { name: 'R', x0: 0.69, x1: 0.98, y0: 0.04, y1: 0.5, smooth: 0, raised: false, since: 0, flash: 0 }
    ];
    this.status = 'off';
    this.count = 0;
    this.onSwing = null;
    this.lastProc = 0; this.lastEmit = 0; this.pending = null;
    this.calib = 0;
    this.stream = null;
    this.video = null;
  }

  policyBlocked() {
    try {
      const fp = document.permissionsPolicy || document.featurePolicy;
      if (fp && typeof fp.allowsFeature === 'function') return !fp.allowsFeature('camera');
    } catch (e) { /* ignore */ }
    return false;
  }

  supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

  async start() {
    this.video = $('camVideo');
    if (this.stream) { if (this.status === 'off') this.status = 'ready'; return true; }
    if (!this.supported() || this.policyBlocked() || window.isSecureContext === false) {
      this.status = 'blocked';
      return false;
    }
    this.status = 'starting';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false
      });
    } catch (e) {
      this.stream = null;
      const name = e && e.name;
      this.status = name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'nocam' : 'error';
      return false;
    }
    const v = this.video;
    v.srcObject = this.stream;
    v.muted = true; v.playsInline = true;
    try { await v.play(); } catch (e) { /* autoplay will start on the next gesture */ }
    this.recalibrate();
    return true;
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.status = 'off';
  }

  recalibrate() {
    this.calib = CALIB_FRAMES;
    this.status = 'calibrating';
    this.pending = null;
    this.lastEmit = -1e9;
    for (const z of this.zones) { z.smooth = 0; z.raised = false; }
  }

  update(now) {
    if (!this.stream || !this.video) return;
    if (this.video.paused) { this.video.play().catch(() => {}); }
    if (this.video.readyState < 2 || now - this.lastProc < 30) return;
    this.lastProc = now;
    this.process(now);
  }

  process(now) {
    const W = this.W, H = this.H, ctx = this.ctx;
    ctx.setTransform(-1, 0, 0, 1, W, 0);
    ctx.drawImage(this.video, 0, 0, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let px;
    try { px = ctx.getImageData(0, 0, W, H).data; } catch (e) { return; }
    const n = W * H;
    if (!this.cur) { this.cur = new Float32Array(n * 3); this.ref = new Float32Array(n * 3); }
    const cur = this.cur, ref = this.ref;
    let sum = 0;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const r = px[j], g = px[j + 1], b = px[j + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const k = i * 3;
      cur[k] = y; cur[k + 1] = (b - y) * 0.56; cur[k + 2] = (r - y) * 0.71;
      sum += y;
    }
    const mean = sum / n;
    if (this.calib > 0) {
      if (this.calib === CALIB_FRAMES) { ref.set(cur); this.refMean = mean; }
      else {
        for (let i = 0; i < n * 3; i++) ref[i] += (cur[i] - ref[i]) * 0.25;
        this.refMean += (mean - this.refMean) * 0.25;
      }
      this.calib--;
      if (this.calib === 0) this.status = 'ready';
      this.maskImg.data.fill(0);
      this.mctx.putImageData(this.maskImg, 0, 0);
      return;
    }
    const gain = clamp(this.refMean / Math.max(1, mean), 0.75, 1.35);
    const s = clamp(settings.camSens / 100, 0, 1);
    const thr = lerp(54, 20, s);
    const hi = lerp(0.22, 0.07, s), lo = hi * 0.45;
    const md = this.maskImg.data;
    md.fill(0);
    for (const z of this.zones) {
      const x0 = Math.floor(z.x0 * W), x1 = Math.ceil(z.x1 * W), y0 = Math.floor(z.y0 * H), y1 = Math.ceil(z.y1 * H);
      let hit = 0, tot = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * W + x, k = i * 3;
          const cy = cur[k] * gain;
          const dy = Math.abs(cy - ref[k]);
          const dc = Math.abs(cur[k + 1] - ref[k + 1]) + Math.abs(cur[k + 2] - ref[k + 2]);
          tot++;
          if (dy + dc * 1.3 > thr) {
            hit++;
            const m = i * 4; md[m] = 217; md[m + 1] = 242; md[m + 2] = 63; md[m + 3] = 210;
          } else if (!z.raised) {
            ref[k] += (cy - ref[k]) * 0.03;
            ref[k + 1] += (cur[k + 1] - ref[k + 1]) * 0.03;
            ref[k + 2] += (cur[k + 2] - ref[k + 2]) * 0.03;
          }
        }
      }
      const frac = hit / Math.max(1, tot);
      z.smooth = z.smooth * 0.4 + frac * 0.6;
      if (!z.raised && z.smooth > hi) { z.raised = true; z.since = now; this.rise(z, now); }
      else if (z.raised && z.smooth < lo) z.raised = false;
      if (z.raised && now - z.since > 3200) {
        // something parked in the box: fold it into the background
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
          const k = (y * W + x) * 3;
          ref[k] = cur[k] * gain; ref[k + 1] = cur[k + 1]; ref[k + 2] = cur[k + 2];
        }
        z.raised = false; z.smooth = 0;
      }
      z.flash = Math.max(0, z.flash - 0.08);
    }
    if (this.pending && now - this.pending.at >= 28) this.flush(now);
    this.refMean += (mean - this.refMean) * 0.02;
    this.mctx.putImageData(this.maskImg, 0, 0);
  }

  rise(z, now) {
    if (this.pending) { if (this.pending.zone !== z.name) this.pending.both = true; return; }
    if (now - this.lastEmit < 300) return;
    this.pending = { zone: z.name, at: now, both: false };
  }

  flush(now) {
    const p = this.pending;
    this.pending = null;
    const both = p.both || this.zones.every((q) => q.raised);
    this.lastEmit = now;
    this.count++;
    for (const z of this.zones) if (both || z.name === p.zone) z.flash = 1;
    const aim = settings.camAim && !both ? (p.zone === 'R' ? 1 : -1) * 0.75 : 0;
    if (this.onSwing) this.onSwing({ src: 'cam', aim, lob: both, zone: p.zone });
  }

  drawPreview(canvas, compact) {
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    g.fillStyle = '#0d1b2e'; g.fillRect(0, 0, w, h);
    if (this.video && this.video.readyState >= 2) {
      g.save(); g.setTransform(-1, 0, 0, 1, w, 0);
      g.drawImage(this.video, 0, 0, w, h);
      g.restore();
    }
    g.fillStyle = 'rgba(8, 20, 40, 0.2)'; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 0.55; g.drawImage(this.mask, 0, 0, w, h); g.globalAlpha = 1;
    g.imageSmoothingEnabled = true;
    const u = w / 480;
    for (const z of this.zones) {
      const x = z.x0 * w, y = z.y0 * h, zw = (z.x1 - z.x0) * w, zh = (z.y1 - z.y0) * h;
      const act = z.raised || z.flash > 0.3;
      g.lineWidth = Math.max(2, 4 * u);
      g.strokeStyle = act ? '#d9f23f' : 'rgba(255,255,255,0.88)';
      g.fillStyle = act ? 'rgba(217,242,63,' + (0.18 + z.flash * 0.25) + ')' : 'rgba(255,255,255,0.07)';
      roundRectPath(g, x, y, zw, zh, 14 * u);
      g.fill(); g.stroke();
      // live level meter along the bottom of the box
      const lvl = clamp(z.smooth / Math.max(0.05, lerp(0.22, 0.07, settings.camSens / 100)), 0, 1);
      g.fillStyle = act ? '#d9f23f' : 'rgba(255,255,255,0.75)';
      g.fillRect(x + 8 * u, y + zh - 10 * u, (zw - 16 * u) * lvl, 4 * u);
      if (!compact) {
        g.fillStyle = '#ffffff';
        g.font = '700 ' + Math.round(17 * u) + 'px Fredoka, "Arial Rounded MT Bold", Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(z.name === 'L' ? 'LEFT HAND' : 'RIGHT HAND', x + zw / 2, y + zh / 2);
      }
    }
    g.setLineDash([9 * u, 8 * u]);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1.5, 3 * u);
    g.beginPath(); g.ellipse(w / 2, h * 0.33, w * 0.11, h * 0.19, 0, 0, TAU); g.stroke();
    g.setLineDash([]);
    if (this.status === 'calibrating' && !compact) {
      g.fillStyle = 'rgba(12, 27, 49, 0.7)'; g.fillRect(0, h - 44 * u, w, 44 * u);
      g.fillStyle = '#fff'; g.font = '700 ' + Math.round(18 * u) + 'px Fredoka, Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Hold still, reading the room', w / 2, h - 22 * u);
    }
  }
}

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

const cam = new CamSwing();
