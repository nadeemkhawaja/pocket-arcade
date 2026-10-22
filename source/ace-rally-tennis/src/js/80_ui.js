/* ==========================================================================
   UI: title, setup, webcam setup, HUD, banners, pause, results, settings
   ========================================================================== */

const SCREENS = ['scrTitle', 'scrSetup', 'scrCam', 'scrHow', 'scrSettings', 'scrPause', 'scrResults'];

const ICONS = {
  webcam: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.6" fill="currentColor"/><path d="M7.5 20.5h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  keys: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.5 10h.5M10 10h.5M13.5 10h.5M17 10h.5M8 14h8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  touch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="15.5" r="2.3" fill="currentColor"/></svg>',
  singles: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3.2" fill="currentColor"/><path d="M6.5 20c.6-4.2 2.6-6.5 5.5-6.5s4.9 2.3 5.5 6.5" fill="currentColor"/></svg>',
  doubles: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7.5" r="2.8" fill="currentColor"/><circle cx="16.5" cy="7.5" r="2.8" fill="currentColor"/><path d="M3 20c.5-3.7 2.2-5.8 5-5.8s4.5 2.1 5 5.8zM11.5 20c.5-3.7 2.2-5.8 5-5.8s4.5 2.1 5 5.8z" fill="currentColor"/></svg>',
  practice: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>'
};

const ui = {
  screen: null, prev: {}, hudOn: false, bTimer: 0, speedTimer: 0, keysTimer: 0,
  pendingCfg: null, setupMode: 'singles', dl: null, wake: null, camShown: false,

  init() {
    this.buildSetup();
    this.bindButtons();
    this.bindSettings();
    this.initDownloads();
    this.updateMuteIcon();
  },

  /* ---- navigation ---- */
  open(id, from) {
    for (const s of SCREENS) $(s).hidden = s !== id;
    if (from !== undefined && from !== id) this.prev[id] = from;
    this.screen = id;
    const first = $(id).querySelector('.btn.primary') || $(id).querySelector('.btn');
    if (first && !isTouchDevice) { try { first.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }
  },
  closeAll() { for (const s of SCREENS) $(s).hidden = true; this.screen = null; },
  back() {
    const cur = this.screen;
    if (!cur) return;
    audio.ui('back');
    if (cur === 'scrPause') { this.resume(); return; }
    if (cur === 'scrTitle') return;
    if (cur === 'scrCam') cam.stop();
    const prev = this.prev[cur] || 'scrTitle';
    if (prev === 'scrTitle') this.showTitle(); else this.open(prev);
  },
  typing() { const a = document.activeElement; return !!(a && a.tagName === 'INPUT' && a.type === 'text'); },
  playing() { return game.mode !== 'demo' && !game.paused && !this.screen && game.teams.length > 0 && game.state !== 'over'; },
  camSetupOpen() { return this.screen === 'scrCam'; },

  showTitle() {
    game.paused = false;
    cam.stop();
    this.releaseWake();
    if (game.mode !== 'demo') startDemo();
    $('hud').hidden = true; this.hudOn = false;
    $('touch').hidden = true; $('camMini').hidden = true;
    this.hideBanner();
    const rec = store.get('record', { w: 0, l: 0 });
    const best = store.get('bestRally', 0);
    const bits = [];
    if (rec.w + rec.l > 0) bits.push('Record  ' + rec.w + ' won, ' + rec.l + ' lost');
    if (best > 0) bits.push('Best rally  ' + best);
    $('record').textContent = bits.join('    ');
    this.open('scrTitle');
    audio.startMusic();
  },

  /* ---- setup ---- */
  chips(boxId, items, current, onPick) {
    const box = $(boxId);
    box.innerHTML = '';
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.value = it.value;
      b.setAttribute('aria-pressed', String(String(it.value) === String(current)));
      b.innerHTML = (it.icon || '') + '<span>' + it.label + '</span>' + (it.sub ? '<small>' + it.sub + '</small>' : '');
      b.addEventListener('click', () => {
        audio.unlock(); audio.ui('toggle');
        for (const c of box.children) c.setAttribute('aria-pressed', String(c === b));
        onPick(it.value);
      });
      box.appendChild(b);
    }
  },

  buildSetup() {
    this.chips('optMode', [
      { value: 'singles', label: 'Singles', sub: '1 vs 1', icon: ICONS.singles },
      { value: 'doubles', label: 'Doubles', sub: '2 vs 2', icon: ICONS.doubles },
      { value: 'practice', label: 'Practice', sub: 'Rally drill', icon: ICONS.practice }
    ], settings.mode, (v) => { this.setupMode = v; settings.mode = v; this.syncSetup(); });
    this.chips('optControls', [
      { value: 'webcam', label: 'Webcam', sub: 'Raise a hand', icon: ICONS.webcam },
      { value: 'keys', label: 'Keyboard', sub: 'Space to swing', icon: ICONS.keys },
      { value: 'touch', label: 'Touch', sub: 'On-screen buttons', icon: ICONS.touch }
    ], settings.controls, (v) => { settings.controls = v; this.syncSetup(); });
    this.chips('optLevel', Object.values(LEVELS).map((l) => ({ value: l.key, label: l.label, sub: 'vs ' + l.name })), settings.level, (v) => { settings.level = v; });
    this.chips('optFormat', [
      { value: 'g1', label: '1 Game', sub: 'Quick' },
      { value: 'g3', label: 'Best of 3', sub: 'Games' },
      { value: 's1', label: '1 Set', sub: 'First to 6' },
      { value: 's3', label: 'Best of 3', sub: 'Sets' }
    ], settings.format, (v) => { settings.format = v; });
    this.chips('optSurface', Object.values(SURFACES).map((s) => ({
      value: s.key, label: s.label,
      icon: '<i class="court-swatch" style="background:linear-gradient(90deg,' + s.outer + ' 0 22%,' + s.inner + ' 22% 78%,' + s.outer + ' 78%)"></i>',
      sub: s.key === 'clay' ? 'High bounce' : s.key === 'grass' ? 'Low and quick' : 'True bounce'
    })), settings.surface, (v) => { settings.surface = v; setSurface(v); });

    const shirts = $('optShirt');
    SHIRTS.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.style.background = s.shirt;
      b.setAttribute('aria-label', 'Shirt colour ' + (i + 1));
      b.setAttribute('aria-pressed', String(i === settings.shirt));
      b.addEventListener('click', () => {
        audio.unlock(); audio.ui('toggle');
        settings.shirt = i;
        for (const c of shirts.children) c.setAttribute('aria-pressed', String(c === b));
      });
      shirts.appendChild(b);
    });
    const skins = $('optSkin');
    SKIN_TONES.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch'; b.style.background = c;
      b.setAttribute('aria-label', 'Skin tone ' + (i + 1));
      b.setAttribute('aria-pressed', String(i === settings.skin));
      b.addEventListener('click', () => {
        audio.unlock(); audio.ui('toggle');
        settings.skin = i;
        for (const x of skins.children) x.setAttribute('aria-pressed', String(x === b));
      });
      skins.appendChild(b);
    });
    const name = $('inName');
    name.value = settings.name;
    name.addEventListener('input', () => { settings.name = cleanName(name.value); });
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') name.blur(); });
  },

  syncSetup() {
    const practice = this.setupMode === 'practice';
    $('fieldLevel').hidden = practice;
    $('fieldFormat').hidden = practice;
    $('setupTitle').textContent = practice ? 'Rally practice' : 'Match setup';
    $('bStart').textContent = practice ? 'Start practice' : 'Start match';
    const c = settings.controls;
    let hint;
    if (c === 'webcam') {
      hint = 'Raise a hand above your shoulder to swing. Camera setup comes next.';
      if (cam.policyBlocked()) hint = 'This viewer blocks cameras, so the next step offers the game file to open in your browser.';
    } else if (c === 'touch') {
      hint = 'Tap SWING, hold an arrow to aim. LOB and DROP play those shots.';
      if (world.aspect < 0.9) hint += ' Turn your phone sideways for a wider view.';
    } else hint = 'Space or Enter swings. Arrow keys aim, up for a lob, down for a drop shot.';
    $('ctrlHint').textContent = hint;
  },

  openSetup(mode, from) {
    this.setupMode = mode;
    settings.mode = mode;
    for (const c of $('optMode').children) c.setAttribute('aria-pressed', String(c.dataset.value === mode));
    this.syncSetup();
    this.open('scrSetup', from || 'scrTitle');
  },

  currentCfg() {
    return {
      mode: this.setupMode, controls: settings.controls, level: settings.level, format: settings.format,
      surface: settings.surface, name: cleanName(settings.name), shirt: settings.shirt, skin: settings.skin || 0
    };
  },

  startFromSetup() {
    audio.unlock(); audio.ui('go');
    settings.name = cleanName($('inName').value);
    $('inName').value = settings.name;
    saveSettings();
    const cfg = this.currentCfg();
    if (cfg.controls === 'webcam') this.openCamSetup(cfg);
    else this.beginMatch(cfg);
  },

  beginMatch(cfg) {
    this.closeAll();
    audio.unlock();
    audio.stopMusic();
    if (cfg.controls !== 'webcam') cam.stop();
    input.reset();
    startMatch(cfg);
    const a = document.activeElement;
    if (a && a.blur) a.blur();
    this.requestWake();
  },

  /* ---- webcam setup ---- */
  async openCamSetup(cfg) {
    this.pendingCfg = cfg;
    this.open('scrCam', 'scrSetup');
    cam.count = 0;
    $('camCount').textContent = '0';
    $('camBlocked').hidden = true;
    $('bCamGo').disabled = false;
    $('bCamRecal').textContent = 'Recalibrate';
    $('camSens').value = settings.camSens;
    this.setBadge('Starting camera', '');
    const ok = await cam.start();
    if (this.screen !== 'scrCam') { if (ok && !(game.cfg && game.cfg.controls === 'webcam' && this.playing())) cam.stop(); return; }
    if (!ok) this.camFailed();
  },

  camFailed() {
    const st = cam.status;
    const framed = window.self !== window.top;
    let text, how;
    if (st === 'nocam') { text = 'No camera was found on this device.'; how = 'Connect a webcam and press Try again, or play with the keyboard or touch.'; }
    else if (st === 'error') { text = 'The camera could not start. Another app may be using it.'; how = 'Close other apps that use the camera, then press Try again.'; }
    else if (framed || cam.policyBlocked()) {
      text = 'This viewer does not allow camera access, so webcam swings cannot run here.';
      how = this.dl ? 'Save the game file, then open it in Chrome, Edge or Safari on your computer and pick Webcam. Everything else works right here.'
        : 'Open the game file in Chrome, Edge or Safari on your computer to use your webcam. Everything else works right here.';
    } else { text = 'Camera access was turned down.'; how = 'Allow the camera from the icon in your browser address bar, then press Try again.'; }
    $('camBlockedText').textContent = text;
    $('camBlockedHow').textContent = how;
    $('bSaveFile').hidden = !this.dl;
    $('camBlocked').hidden = false;
    $('bCamGo').disabled = true;
    $('bCamRecal').textContent = 'Try again';
    this.setBadge('Camera unavailable', 'bad');
  },

  setBadge(text, cls) {
    const b = $('camBadge');
    if ($('camBadgeText').textContent !== text) $('camBadgeText').textContent = text;
    b.className = 'cam-badge' + (cls ? ' ' + cls : '');
  },

  camDetected(inp) {
    $('camCount').textContent = String(cam.count);
    audio.hit(0.7, inp.aim * 4, false, 'drive');
    this.setBadge(inp.lob ? 'Both hands: lob' : inp.zone === 'R' ? 'Right hand swing' : 'Left hand swing', 'ok');
    this.badgeHold = performance.now() + 900;
  },

  /* ---- HUD ---- */
  onMatchStart() {
    const g = game;
    const demo = g.mode === 'demo';
    this.hudOn = !demo;
    $('hud').hidden = demo;
    $('touch').hidden = demo || g.cfg.controls !== 'touch';
    this.camShown = !demo && g.cfg.controls === 'webcam' && settings.camPreview;
    $('camMini').hidden = !this.camShown;
    $('prompt').classList.toggle('touch-on', !demo && g.cfg.controls === 'touch');
    $('sb').hidden = g.mode === 'practice';
    $('rallyBox').hidden = g.mode !== 'practice';
    $('speed').hidden = true;
    $('sbTag').hidden = true;
    $('prompt').hidden = true;
    $('pops').innerHTML = '';
    clearTimeout(this.keysTimer);
    const showKeys = !demo && g.cfg.controls === 'keys';
    $('keysHint').hidden = !showKeys;
    if (showKeys) this.keysTimer = setTimeout(() => { $('keysHint').hidden = true; }, 16000);
    if (g.mode === 'practice') this.rally(0, g.practice.best);
    this.hideBanner();
    this.updateScore();
  },

  updateScore() {
    const g = game;
    if (!this.hudOn || !g.teams.length || !g.score) return;
    const s = g.score;
    const serving = s.over ? -1 : s.servingTeam();
    const done = s.over ? s.sets.slice(0, -1) : s.sets.slice(0, -1);
    for (let t = 0; t < 2; t++) {
      $('sbName' + t).textContent = g.teams[t].name;
      $('sbStripe' + t).style.background = g.teams[t].color;
      $('sbRow' + t).classList.toggle('serving', serving === t);
      $('sbSets' + t).innerHTML = done.map((x) => '<span>' + x[t] + '</span>').join('');
      $('sbGames' + t).textContent = String(s.games[t]);
      const pts = s.ptsDisplay(t);
      const el = $('sbPts' + t);
      if (el.textContent !== pts) {
        el.textContent = pts;
        el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
      }
    }
  },

  situation(sit) {
    const tag = $('sbTag');
    if (!sit || !this.hudOn || game.mode !== 'match') { tag.hidden = true; return; }
    const label = sit.kind === 'match' ? 'MATCH POINT' : sit.kind === 'set' ? 'SET POINT' : 'BREAK POINT';
    tag.textContent = label + '  ' + game.teams[sit.team].players[0].name;
    tag.className = 'sb-tag' + (sit.kind === 'match' ? ' match' : '');
    tag.hidden = false;
  },

  banner(text, kind, dur) {
    if (!this.hudOn) return;
    const el = $('banner');
    el.textContent = text;
    el.className = 'banner ' + (kind || 'score');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this.bTimer);
    this.bTimer = setTimeout(() => { el.classList.remove('show'); el.classList.add('hide'); }, (dur || 1.3) * 1000);
  },
  hideBanner() {
    clearTimeout(this.bTimer);
    $('banner').className = 'banner';
    $('sub').className = 'sub';
  },
  sub(text) {
    if (!this.hudOn) return;
    const el = $('sub');
    el.textContent = text;
    el.className = 'sub';
    void el.offsetWidth;
    el.classList.add('show');
  },

  pop(text, kind, p) {
    if (!this.hudOn || !world.camera) return;
    const box = $('pops');
    if (box.children.length > 3) box.removeChild(box.firstChild);
    const v = new T3.Vector3(p ? p.x : 0, 2.3, p ? p.z : 0).project(world.camera);
    const x = (v.x * 0.5 + 0.5) * world.w, y = (-v.y * 0.5 + 0.5) * world.h;
    const el = document.createElement('div');
    el.className = 'pop ' + (kind || '');
    el.textContent = text;
    el.style.left = clamp(x, 70, world.w - 70) + 'px';
    el.style.top = clamp(y, 90, world.h - 60) + 'px';
    box.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
  },

  prompt(text) {
    const el = $('prompt');
    if (!text || !this.hudOn) { el.hidden = true; return; }
    el.textContent = text;
    el.hidden = false;
  },

  servePrompt(n) {
    const c = game.cfg ? game.cfg.controls : 'keys';
    const how = c === 'webcam' ? 'Raise a hand to toss and serve' : c === 'touch' ? 'Tap SWING to toss, then again to hit' : 'Press SPACE to toss, then again to hit';
    this.prompt((n === 2 ? 'Second serve.  ' : '') + how);
  },

  speed(kmh) {
    if (!this.hudOn) return;
    $('speedVal').textContent = String(kmh);
    const el = $('speed');
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    clearTimeout(this.speedTimer);
    this.speedTimer = setTimeout(() => { el.hidden = true; }, 2600);
  },

  rally(n, best) {
    $('rallyNow').textContent = String(n);
    $('rallyBest').textContent = String(best);
  },

  /* ---- pause and results ---- */
  togglePause() { if (game.paused) this.resume(); else this.pause(); },
  pause() {
    if (game.mode === 'demo' || game.state === 'over' || !game.teams.length) return;
    game.paused = true;
    input.reset();
    audio.hush();
    audio.setCrowd(0.03);
    let txt = '';
    if (game.score) {
      const s = game.score, n = teamNames(false);
      txt = n[0] + '  ' + s.games[0] + ' - ' + s.games[1] + '  ' + n[1];
      if (s.setsWon[0] + s.setsWon[1] > 0) txt = 'Sets ' + s.setsWon[0] + ' - ' + s.setsWon[1] + '    ' + txt;
    } else txt = 'Best rally  ' + game.practice.best;
    $('pauseScore').textContent = txt;
    this.open('scrPause');
  },
  resume() {
    this.closeAll();
    game.paused = false;
    audio.setCrowd(0.12);
    const a = document.activeElement;
    if (a && a.blur) a.blur();
  },

  showResults(winner) {
    const g = game;
    const won = g.humanTeam && winner === g.humanTeam.index;
    const names = teamNames(false);
    const fmt = FORMATS[g.cfg.format] || FORMATS.g3;
    $('resEyebrow').textContent = fmt.label + '  ' + (SURFACES[g.cfg.surface] || SURFACES.hard).name;
    $('resTitle').textContent = won ? 'You win!' : names[winner] + ' wins';
    const sets = g.score.sets;
    $('resSets').innerHTML = sets.map((x) => {
      const w = x[0] > x[1] ? 0 : 1;
      return '<span class="' + (w === 0 ? 'won' : '') + '">' + x[0] + ' - ' + x[1] + '</span>';
    }).join('');
    const st = g.stats;
    const pct = (s) => (s.firstTot ? Math.round((s.firstIn / s.firstTot) * 100) + '%' : '0%');
    const rows = [
      ['Points won', st[0].points, st[1].points],
      ['Aces', st[0].aces, st[1].aces],
      ['Double faults', st[0].df, st[1].df, true],
      ['Winners', st[0].winners, st[1].winners],
      ['Errors', st[0].errors, st[1].errors, true],
      ['1st serve in', pct(st[0]), pct(st[1])],
      ['Fastest serve', st[0].fastest ? st[0].fastest + ' km/h' : '0', st[1].fastest ? st[1].fastest + ' km/h' : '0']
    ];
    let html = '<thead><tr><th scope="col">Stat</th><th scope="col">' + names[0] + '</th><th scope="col">' + names[1] + '</th></tr></thead><tbody>';
    for (const [label, a, b, lowGood] of rows) {
      const na = parseFloat(a) || 0, nb = parseFloat(b) || 0;
      const la = lowGood ? na < nb : na > nb, lb = lowGood ? nb < na : nb > na;
      html += '<tr><td>' + label + '</td><td class="' + (la ? 'lead' : '') + '">' + a + '</td><td class="' + (lb ? 'lead' : '') + '">' + b + '</td></tr>';
    }
    html += '<tr><td>Longest rally</td><td colspan="2">' + g.longestRally + ' shots</td></tr></tbody>';
    $('resStats').innerHTML = html;
    $('hud').hidden = true; this.hudOn = false;
    $('touch').hidden = true; $('camMini').hidden = true;
    this.hideBanner();
    this.open('scrResults');
    audio.startMusic();
  },

  /* ---- settings ---- */
  bindSettings() {
    const sw = (id, key, after) => {
      const el = $(id);
      el.checked = !!settings[key];
      el.addEventListener('change', () => {
        settings[key] = el.checked;
        saveSettings();
        audio.unlock();
        audio.applySettings();
        audio.ui('toggle');
        if (after) after();
      });
    };
    sw('setSfx', 'sfx', () => audio.setCrowd(game.mode === 'demo' ? 0.05 : 0.12));
    sw('setMusic', 'music');
    sw('setVoice', 'voice');
    sw('setShake', 'shake');
    sw('setPreview', 'camPreview', () => {
      this.camShown = !!(game.cfg && game.cfg.controls === 'webcam' && game.mode !== 'demo' && settings.camPreview);
      $('camMini').hidden = !this.camShown || !this.hudOn;
    });
    sw('setCamAim', 'camAim');
    const mini = (boxId, items, key, after) => {
      const box = $(boxId);
      items.forEach(([v, label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.textContent = label; b.dataset.value = v;
        b.setAttribute('aria-pressed', String(settings[key] === v));
        b.addEventListener('click', () => {
          audio.unlock(); audio.ui('toggle');
          settings[key] = v; saveSettings();
          for (const c of box.children) c.setAttribute('aria-pressed', String(c === b));
          if (after) after(v);
        });
        box.appendChild(b);
      });
    };
    mini('optGuides', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']], 'guides');
    mini('optQuality', [['auto', 'Auto'], ['high', 'High'], ['low', 'Low']], 'quality', (v) => applyQuality(v));
    $('camSens').addEventListener('input', () => { settings.camSens = +$('camSens').value; saveSettings(); });
  },

  toggleMute() {
    settings.mute = !settings.mute;
    saveSettings();
    audio.unlock();
    audio.applySettings();
    this.updateMuteIcon();
  },
  updateMuteIcon() {
    $('icoWaves').style.display = settings.mute ? 'none' : '';
    $('icoMute').removeAttribute('hidden');
    $('icoMute').style.display = settings.mute ? '' : 'none';
    $('btnSound').setAttribute('aria-label', settings.mute ? 'Turn sound on' : 'Mute sound');
  },

  /* ---- buttons ---- */
  bindButtons() {
    const on = (id, fn) => $(id).addEventListener('click', (e) => { audio.unlock(); fn(e); });
    on('bPlay', () => { audio.ui('go'); this.openSetup(settings.mode === 'practice' ? 'singles' : settings.mode, 'scrTitle'); });
    on('bPractice', () => { audio.ui('go'); this.openSetup('practice', 'scrTitle'); });
    on('bHow', () => { audio.ui('move'); this.open('scrHow', this.screen); });
    on('bSettings', () => { audio.ui('move'); this.open('scrSettings', this.screen); });
    on('bStart', () => this.startFromSetup());
    document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => this.back()));
    on('bCamBack', () => this.back());
    on('bCamRecal', () => {
      audio.ui('move');
      if (cam.stream) { cam.recalibrate(); this.setBadge('Reading the room', ''); }
      else if (this.pendingCfg) this.openCamSetup(this.pendingCfg);
    });
    on('bCamGo', () => { if (this.pendingCfg && cam.stream) { audio.ui('go'); this.beginMatch(this.pendingCfg); } });
    on('bCamKeys', () => { settings.controls = 'keys'; saveSettings(); const c = Object.assign({}, this.pendingCfg, { controls: 'keys' }); this.refreshControlChips(); this.beginMatch(c); });
    on('bCamTouch', () => { settings.controls = 'touch'; saveSettings(); const c = Object.assign({}, this.pendingCfg, { controls: 'touch' }); this.refreshControlChips(); this.beginMatch(c); });
    on('bSaveFile', () => saveGameFile($('saveStatus')));
    on('bSaveFile2', () => saveGameFile($('saveStatus2')));
    on('btnPause', () => this.togglePause());
    on('btnSound', () => this.toggleMute());
    on('bResume', () => this.resume());
    on('bRestart', () => { this.closeAll(); game.paused = false; startMatch(game.cfg); });
    on('bPauseSettings', () => this.open('scrSettings', 'scrPause'));
    on('bPauseHow', () => this.open('scrHow', 'scrPause'));
    on('bQuit', () => this.showTitle());
    on('bRematch', () => { audio.ui('go'); this.beginMatch(game.cfg); });
    on('bResSetup', () => { audio.ui('move'); cam.stop(); this.openSetup(game.cfg.mode === 'practice' ? 'practice' : game.cfg.mode, 'scrTitle'); });
    on('bResTitle', () => this.showTitle());
    // any first gesture unlocks audio
    const unlock = () => { audio.unlock(); };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  },

  refreshControlChips() {
    for (const c of $('optControls').children) c.setAttribute('aria-pressed', String(c.dataset.value === settings.controls));
    this.syncSetup();
  },

  /* ---- downloads capability (artifact viewer only) ---- */
  initDownloads() {
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        window.claude.use('downloads').then((d) => {
          this.dl = d || null;
          $('bSaveFile').hidden = !this.dl;
          $('rowSave').hidden = !this.dl;
          if (this.screen === 'scrCam' && !cam.stream) this.camFailed();
        }).catch(() => { this.dl = null; });
      }
    } catch (e) { this.dl = null; }
  },

  /* ---- wake lock ---- */
  async requestWake() {
    try { if ('wakeLock' in navigator) this.wake = await navigator.wakeLock.request('screen'); } catch (e) { this.wake = null; }
  },
  releaseWake() {
    try { if (this.wake) this.wake.release(); } catch (e) { /* ignore */ }
    this.wake = null;
  },

  /* ---- per frame ---- */
  tick(now) {
    if (this.screen === 'scrCam') {
      cam.drawPreview($('camView'), false);
      if (cam.stream && (!this.badgeHold || now > this.badgeHold)) {
        if (cam.status === 'calibrating') this.setBadge('Reading the room', '');
        else if (cam.status === 'ready') this.setBadge('Ready. Raise a hand', 'ok');
      }
    } else if (this.camShown && this.hudOn && !$('camMini').hidden) {
      if (!this.miniT || now - this.miniT > 50) { this.miniT = now; cam.drawPreview($('camMiniView'), true); }
    }
  }
};

async function saveGameFile(statusEl) {
  if (!ui.dl) { statusEl.textContent = 'Saving files is not available in this view.'; return; }
  statusEl.textContent = 'Preparing the file';
  try {
    const res = await fetch('ace-rally-tennis.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('missing');
    const blob = await res.blob();
    await ui.dl.save({ filename: 'ace-rally-tennis.html', data: blob });
    statusEl.textContent = 'Saved. Open ace-rally-tennis.html in Chrome, Edge or Safari, then choose Webcam.';
  } catch (e) {
    const code = e && e.code;
    if (code === 'declined') statusEl.textContent = 'Save cancelled.';
    else if (code === 'rate_limited') statusEl.textContent = 'A save prompt is already open.';
    else statusEl.textContent = 'The file could not be saved from this view.';
  }
}

function applyQuality(v) {
  const q = v === 'auto' ? pickQuality() : v;
  world.quality = q;
  world.baseDpr = q === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : Math.min(window.devicePixelRatio || 1, 1.35);
  world.dpr = world.baseDpr;
  world.renderer.setPixelRatio(world.dpr);
  const sm = q === 'high' ? 2048 : 1024;
  if (world.sun.shadow.mapSize.x !== sm) {
    world.sun.shadow.mapSize.set(sm, sm);
    if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; }
  }
  resizeRenderer();
}
