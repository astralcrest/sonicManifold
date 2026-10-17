/* R19 RESET: the wall between strangers (exhibit.html?wall=1). wallmode.js calls the default export once with (ctx, window.__wall).
   idle and scheduled resets, the dark cover, the docent's corner, the recovery watchdog, Wake Lock, drift and dim, the calm control.
   the flash budget is in shell.js (flOnset). every option is read live from wall.opts; nothing runs at import. */

const TICK = 250;
const COVER_MS = 650; /* the dark cover's fade; the reload follows at the end of it */
const FAILSAFE_MS = 6000; /* the page is still here this long after the reload call: the reload did not happen */
const RELOAD_QUIET = 20e3; /* the scheduled reload waits for this long without a touch */
const CORNER_MS = 5000, CORNER_PX = 100;
const DRIFT_R = 3, DRIFT_SPEED = 3; /* a circle of 3 px radius walked at 3 px a minute */
const DIM_AFTER = 30e3, DIM_TO = 0.75; /* 0.75 keeps the muted ink (7.8:1 on the ground) at 4.5:1; 0.58 took it to 3.1:1 */
const SETTING_KEYS = ['detail', 'travel', 'dwell', 'fade', 'glow', 'labels', 'twinkle', 'textSize', 'pinch'];
const KEYS = {
  local: ['sm_atlas_settings_v1', 'sm_atlas_seen_v1', 'sm_atlas_menu_seen_v1', 'sm_atlas_onboard_seen_v1'],
  session: ['exhibit.wall.guess', 'exhibit.predict', 'exhibit.unfold', 'sm_atlas_served_v1', 'sm_hand_v1', 'sm_atlas_lens_v1', 'sm_atlas_coach_v1', 'sm-thr-cue'],
};
const CONTROLS = 'button,a[href],input,select,textarea,summary,[role="button"],[role="slider"],[role="switch"],[role="tab"],[role="menuitem"],[contenteditable="true"],.atlas-ladder,.atlas-ladder-chip';
const REST_LINES = ['the wall is resting.', 'it will start again by itself.'];

export default function mount(ctx, wall) {
  wall = wall || window.__wall;
  if (!wall || !wall.on || !ctx) return null;
  if (!ctx.wall || typeof ctx.wall !== 'object') ctx.wall = {};
  if (ctx.wall.reset && ctx.wall.reset.__live) return ctx.wall.reset;

  const D = document, html = D.documentElement, now = () => performance.now();
  const opts = () => (window.__wall && window.__wall.opts) || wall.opts || {};
  const secMs = (k, d) => { const v = +opts()[k]; return v > 0 ? v * 1000 : d; };
  const guard = (f, why) => { try { return f(); } catch (e) { if (why) console.warn('wall reset: ' + why, e); } };
  const flag = (v) => (typeof v === 'function' ? !!guard(v) : !!v);

  const X = { coverMs: COVER_MS, dimAfter: DIM_AFTER, dimTo: DIM_TO };
  const log = [];
  const note = (kind, why) => { log.push({ kind, why, t: Math.round(now()), at: Date.now() }); if (log.length > 50) log.shift(); };

  /* what the settings were when the wall booted (CORE has already put dwell where wall.opts says): a reset puts them back */
  const base = {};
  guard(() => SETTING_KEYS.forEach((k) => { const v = ctx.settings.get(k); if (v !== undefined) base[k] = v; }));
  const baseLens = guard(() => ctx.tour.lens()) || null;
  const baseLen = guard(() => ctx.tour.length()) || 'grand';

  /* ------------------------------------------------------------------ input and clips */
  let lastIn = 0, dirty = false, busy = false, failT = 0;
  let clipSt = 'off', clipAt = -1e9, lastClip = -1e9;
  const down = new Map();

  function touched(e) {
    if (!e.isTrusted) return;
    lastIn = now(); dirty = true;
    if (dimV < 1) { dimV = 1; dimApply(); }
    if (!wl && lastIn - wlTouchAt > 5000) { wlTouchAt = lastIn; wakeAsk(); } /* a browser that wants a gesture for the lock gets one here; the ask at boot does not use up the allowance */
  }
  addEventListener('pointerdown', (e) => { if (!e.isTrusted) return; down.set(e.pointerId, { m: now() }); touched(e); cornerDown(e); }, { capture: true });
  addEventListener('pointermove', (e) => { if (!e.isTrusted) return; const d = down.get(e.pointerId); if (d) { d.m = now(); touched(e); } cornerMove(e); }, { capture: true });
  const up = (e) => { if (!e.isTrusted) return; down.delete(e.pointerId); touched(e); cornerUp(e); };
  addEventListener('pointerup', up, { capture: true });
  addEventListener('pointercancel', up, { capture: true });
  ['wheel', 'keydown'].forEach((t) => addEventListener(t, touched, { capture: true, passive: true }));
  ['touchstart', 'touchmove'].forEach((t) => addEventListener(t, (e) => { touched(e); if (t === 'touchstart') cornerSwallow(e); }, { capture: true, passive: true }));
  ['touchend', 'touchcancel', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'].forEach((t) => addEventListener(t, cornerSwallow, { capture: true }));
  addEventListener('sm:clip', (e) => {
    const s = e && e.detail && e.detail.state; if (!s) return;
    clipSt = s; clipAt = now();
    if (s === 'playing' || s === 'cueing' || s === 'paused' || s === 'ended') dirty = true; /* somebody started a clip: that visit needs a reset even with no touch after it */
    if (s === 'playing' || s === 'cueing') lastClip = clipAt;
  });
  const clipPlaying = (t) => ((clipSt === 'playing' || clipSt === 'cueing') && t - clipAt < 3000) || guard(() => window.__exhibit.A.clipState === 'hot') === true;

  /* ------------------------------------------------------------------ the cover and the resting slate: top-layer dialogs, so they sit over an open label or sheet */
  function slate(id, kids) {
    let d = D.getElementById(id);
    if (!d) {
      d = D.createElement('dialog'); d.id = id; d.setAttribute('aria-hidden', 'true');
      d.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;box-sizing:border-box;background:var(--bg,#0a0118);color:var(--ink,#f0eaff);overflow:hidden';
      d.addEventListener('cancel', (e) => e.preventDefault());
      (kids || []).forEach((k) => d.appendChild(k));
      (D.body || html).appendChild(d);
    }
    return d;
  }
  function coverOn() {
    const d = slate('wall-cover');
    d.style.opacity = '0'; d.style.transition = 'opacity ' + (X.coverMs / 1000).toFixed(2) + 's ease';
    if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
    void d.offsetWidth; d.style.opacity = '1'; d.classList.add('is-up');
  }
  function coverOff() { const d = D.getElementById('wall-cover'); if (!d) return; d.classList.remove('is-up'); d.style.opacity = '0'; guard(() => d.close()); d.removeAttribute('open'); }

  /* the bed goes down with the cover: one gain node between the last stage and the speakers, only ever used here. the last stage is the wall's
     level trim (A.out) when the sound lane has put one after the limiter, else the limiter */
  let fadeG = null;
  function fadeBed(sec) {
    const A = guard(() => window.__exhibit.A), tail = A && (A.out || A.lim); if (!tail || !A.ac || A.ac.state === 'closed') return;
    guard(() => {
      const ac = A.ac, g = fadeG || ac.createGain();
      if (!fadeG) {
        try { tail.disconnect(ac.destination); } catch (e) { tail.disconnect(); } /* connect() wrapped by a test harness leaves no direct edge to the speakers: take every output of the stage */
        try { tail.connect(g); g.connect(ac.destination); } catch (e) { tail.connect(ac.destination); throw e; }
        fadeG = g;
      }
      g.gain.cancelScheduledValues(ac.currentTime); g.gain.setValueAtTime(g.gain.value, ac.currentTime); g.gain.linearRampToValueAtTime(0, ac.currentTime + sec);
    }, 'bed fade');
  }
  function unfadeBed() { guard(() => { if (fadeG) { fadeG.gain.cancelScheduledValues(0); fadeG.gain.value = 1; } }); }

  /* ------------------------------------------------------------------ the two resets */
  function hardReset(why) {
    if (busy) return false;
    busy = true; note('reload', why);
    fadeBed(X.coverMs / 1000); coverOn();
    const t0 = now();
    const go = () => {
      guard(() => (window.__wall && typeof window.__wall.reload === 'function' ? window.__wall.reload() : location.reload()), 'reload');
      failT = setTimeout(() => { note('failsafe', why); coverOff(); unfadeBed(); busy = false; softReset(why + ':failsafe'); }, FAILSAFE_MS);
    };
    /* the navigation waits for an opaque cover: the fade runs on the frame clock, which a busy machine can leave behind the timer; a stalled clock costs at most 1.5 s more */
    const poll = () => {
      const el = now() - t0, d = D.getElementById('wall-cover'), op = d ? +guard(() => getComputedStyle(d).opacity) : 1;
      if (el >= X.coverMs + 150 && (!(op < 0.99) || el >= X.coverMs + 1500)) go(); else setTimeout(poll, 50);
    };
    setTimeout(poll, X.coverMs + 150);
    return true;
  }
  function closeAll() {
    const P = ctx.atlas && ctx.atlas.panels;
    guard(() => ctx.label && ctx.label.isOpen && ctx.label.close());
    guard(() => ctx.search && ctx.search.close());
    if (P) ['tours', 'settingsPanel', 'help', 'notes'].forEach((k) => guard(() => { const p = P[k]; if (p && typeof p.close === 'function' && flag(p.isOpen)) p.close(); }));
    guard(() => { const x = D.querySelector('#eng:not([hidden]) .eng-x'); if (x) x.click(); });
    D.querySelectorAll('dialog[open]').forEach((d) => { if (d.id !== 'wall-cover' && d.id !== 'wall-rest') guard(() => d.close()); });
  }
  function clearStore() {
    ['localStorage', 'sessionStorage'].forEach((n) => guard(() => {
      const s = window[n]; if (!s) return;
      if (typeof Storage !== 'undefined' && s instanceof Storage) KEYS.local.concat(KEYS.session).forEach((k) => s.removeItem(k)); /* real storage is shared with the other pages of this origin: only the exhibit's own keys */
      else if (typeof s.clear === 'function') s.clear();
    }));
  }
  function tourHome() {
    const T = ctx.tour; if (!T) return;
    guard(() => T.setLens && T.setLens(baseLens));
    guard(() => T.setLength && T.setLength(baseLen));
    guard(() => ctx.gesture && ctx.gesture.cancel && ctx.gesture.cancel());
    guard(() => ctx.view && ctx.view.home && ctx.view.home({ instant: true }));
    guard(() => T.play(baseLen, 0), 'tour');
  }
  function softReset(why) {
    busy = true; note('soft', why);
    guard(closeAll, 'close');
    guard(() => SETTING_KEYS.forEach((k) => { if (k in base) ctx.settings.set(k, base[k]); }));
    guard(() => ((window.__wall && window.__wall.resets) || []).slice().forEach((f) => guard(f, 'onReset')));
    const O = ctx.wall.out, S = ctx.wall.sound;
    guard(() => O && O.revoke && O.revoke(), 'out.revoke');
    guard(() => O && O.closeDock && O.closeDock(), 'out.closeDock');
    guard(tourHome);
    guard(clearStore);
    guard(() => S && S.wake && S.wake(), 'sound.wake');
    dirty = false; busy = false;
    return true;
  }

  /* ------------------------------------------------------------------ the docent's corner: a 5 s press in a 100 px corner reloads */
  let press = null, swallowId = -1, swallowUntil = 0;
  const inCorner = (x, y) => {
    const c = opts().corner; if (!c || c === 'off') return false;
    const r = c === 'br' || c === 'tr', b = c === 'br' || c === 'bl';
    return (r ? x >= innerWidth - CORNER_PX : x <= CORNER_PX) && (b ? y >= innerHeight - CORNER_PX : y <= CORNER_PX);
  };
  const ring = () => {
    let r = D.getElementById('wall-corner');
    if (!r) { r = D.createElement('div'); r.id = 'wall-corner'; r.setAttribute('aria-hidden', 'true'); (D.body || html).appendChild(r); }
    return r;
  };
  function cornerDown(e) {
    if (press || busy || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || !inCorner(e.clientX, e.clientY)) return;
    /* bare stage: the room never sees the press. on a control (the ladder runs down the bottom-right corner) the control works as
       a tap as usual, and a five second hold on it reloads all the same */
    const el = e.target && e.target.closest ? e.target : null, sw = !(el && el.closest(CONTROLS));
    if (sw) { e.stopPropagation(); e.preventDefault(); swallowId = e.pointerId; }
    const r = ring(); r.dataset.c = opts().corner; r.style.setProperty('--wall-corner-ms', CORNER_MS + 'ms'); r.classList.remove('held'); void r.offsetWidth; r.classList.add('held');
    press = { id: e.pointerId, sw, t: setTimeout(() => { const p = press; cornerEnd(); if (p) { if (p.sw) swallowUntil = now() + 1500; hardReset('corner'); } }, CORNER_MS) };
  }
  function cornerMove(e) {
    if (!press || e.pointerId !== press.id) return;
    if (press.sw) e.stopPropagation();
    if (!inCorner(e.clientX, e.clientY)) cornerEnd();
  }
  function cornerUp(e) {
    if (press && e.pointerId === press.id) cornerEnd();
    if (e.pointerId !== swallowId) return;
    e.stopPropagation(); swallowUntil = now() + 700; swallowId = -1;
  }
  function cornerEnd() {
    if (!press) return;
    clearTimeout(press.t); press = null;
    const r = D.getElementById('wall-corner'); if (r) r.classList.remove('held');
  }
  function cornerSwallow(e) {
    if (!e.isTrusted) return;
    const pt = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
    if (((press && press.sw) || now() < swallowUntil) && typeof pt.clientX === 'number' && inCorner(pt.clientX, pt.clientY)) { e.stopPropagation(); if (e.cancelable && e.type.slice(0, 5) !== 'touch') e.preventDefault(); }
  }

  /* ------------------------------------------------------------------ the recovery watchdog */
  const WD = { base: 10e3, n: 5, hour: 3600e3, since: 0, slate: false, retryAt: 0 };
  const wdRead = () => { try { const m = /^sm\.wall:(.*)$/.exec(window.name); const s = m ? JSON.parse(m[1]) : null; return s && Array.isArray(s.r) ? s.r : []; } catch (e) { return []; } };
  const wdWrite = (r) => { try { window.name = 'sm.wall:' + JSON.stringify({ r }); } catch (e) {} };
  function rest(waitMs) {
    if (!WD.slate) {
      WD.slate = true; note('rest', Math.round(waitMs / 1000) + 's');
      const kids = REST_LINES.map((s) => { const p = D.createElement('p'); p.textContent = s; return p; });
      const d = slate('wall-rest', kids);
      d.style.display = 'flex'; d.style.flexDirection = 'column'; d.style.alignItems = 'center'; d.style.justifyContent = 'center'; d.removeAttribute('aria-hidden'); d.setAttribute('role', 'status');
      if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
    }
    WD.retryAt = Date.now() + Math.max(waitMs, 1000);
  }
  function restOff() {
    WD.slate = false;
    const d = D.getElementById('wall-rest'); if (!d) return;
    guard(() => d.close()); d.removeAttribute('open'); d.style.display = 'none';
  }
  function watchdog(t) {
    const el = D.querySelector('#atlas-bootfail, #atlas-fresh .af-go');
    if (!el) {
      WD.since = 0;
      if (WD.slate && flag(() => window.__exhibit && window.__exhibit.atlasReady)) restOff();
    }
    if (WD.slate && Date.now() >= WD.retryAt) { WD.retryAt = Date.now() + WD.hour; note('retry', 'after rest'); guard(() => window.__wall.reload()); return; }
    if (!el) return;
    if (!WD.since) WD.since = t;
    const nowMs = Date.now(), recent = wdRead().filter((x) => nowMs - x < WD.hour);
    if (t - WD.since < WD.base * Math.pow(2, recent.length)) return;
    if (recent.length >= WD.n) { rest(recent[0] + WD.hour - nowMs); return; }
    recent.push(nowMs); wdWrite(recent); WD.since = t;
    note('watchdog', el.id || el.className);
    guard(() => (window.__wall && typeof window.__wall.reload === 'function' ? window.__wall.reload() : location.reload()), 'watchdog reload');
  }

  /* ------------------------------------------------------------------ Wake Lock */
  let wl = null, wlState = 'wakeLock' in navigator ? 'idle' : 'unsupported', wlN = 0, wlBusy = false, wlTouchAt = -1e9;
  function wakeAsk() {
    if (!navigator.wakeLock || wlBusy || D.visibilityState !== 'visible' || (wl && !wl.released)) return;
    wlBusy = true; wlN++;
    let p; try { p = navigator.wakeLock.request('screen'); } catch (e) { wlBusy = false; wlState = 'refused'; return; }
    Promise.resolve(p).then((s) => {
      wl = s; wlBusy = false; wlState = 'held';
      guard(() => s.addEventListener('release', () => { if (wl === s) wl = null; wlState = 'released'; setTimeout(wakeAsk, 5000); }));
    }, (e) => { wlBusy = false; wl = null; wlState = 'refused: ' + ((e && e.name) || 'error'); });
  }
  D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible') wakeAsk(); });

  /* ------------------------------------------------------------------ drift and dim (burn-in) */
  let dimV = 1, dimGoal = 1, dx = 0, dy = 0;
  const driftOn = () => opts().drift === 'on';
  const dimApply = () => { html.style.setProperty('--wall-dim', dimV.toFixed(3)); html.classList.toggle('wall-dim', dimV < 0.999); };
  const phase = Math.random() * Math.PI * 2, t0 = now();
  const dpr = () => window.devicePixelRatio || 1;
  function driftStep(t) {
    const on = driftOn();
    if (html.getAttribute('data-wall-drift') !== (on ? 'on' : 'off')) html.setAttribute('data-wall-drift', on ? 'on' : 'off');
    if (!on) { if (dx || dy) { dx = dy = 0; html.style.setProperty('--wall-dx', '0px'); html.style.setProperty('--wall-dy', '0px'); } return; }
    const k = (X.rate || 1) * (t - t0) / 60e3 * DRIFT_SPEED / DRIFT_R, q = (v) => Math.round(v * dpr()) / dpr();
    const nx = q(DRIFT_R * Math.cos(phase + k)), ny = q(DRIFT_R * Math.sin(phase + k));
    if (nx !== dx || ny !== dy) { dx = nx; dy = ny; html.style.setProperty('--wall-dx', dx + 'px'); html.style.setProperty('--wall-dy', dy + 'px'); }
  }
  function dimStep(t, holding) {
    dimGoal = driftOn() && !holding && t - lastIn >= X.dimAfter ? X.dimTo : 1;
    if (dimV === dimGoal) return;
    dimV = dimGoal === 1 ? 1 : Math.max(dimGoal, dimV - (1 - X.dimTo) / 12); /* 12 ticks, about 3 s down; back up at once */
    dimApply();
  }

  /* ------------------------------------------------------------------ the calm control */
  let calmBtn = null;
  const calmIsOn = () => guard(() => ctx.settings.get('twinkle')) === false;
  function calmPaint() {
    if (!calmBtn) return;
    const on = calmIsOn();
    calmBtn.setAttribute('aria-pressed', String(on));
    calmBtn.lastElementChild.textContent = on ? 'on' : 'off';
    html.toggleAttribute('data-wall-calm', on);
  }
  function calmSet(on) {
    const S = ctx.settings; if (!S) return;
    on = !!on;
    guard(() => { S.set('twinkle', on ? false : base.twinkle !== false); S.set('dwell', on ? 'long' : base.dwell || 'normal'); S.set('travel', on ? 'slow' : base.travel || 'slow'); });
    calmPaint();
  }
  /* the sheet links itself when the loader did not (same ?v= as this module); the control waits for it so it never shows bare */
  function sheet(cb) {
    let fin = false; const done = () => { if (!fin) { fin = true; cb(); } };
    let l = D.querySelector('link[href*="wall.reset.css"]');
    if (l && l.sheet) return done();
    if (!l) {
      l = D.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-wall-reset', '');
      const u = new URL(import.meta.url); u.pathname = u.pathname.replace(/[^/]*$/, 'wall.reset.css'); l.href = u.href;
      (D.head || html).appendChild(l);
    }
    l.addEventListener('load', done); l.addEventListener('error', done); setTimeout(done, 2500);
  }
  function calmBuild() {
    if (opts().calm !== 'control' || D.getElementById('wall-calm')) return;
    const b = calmBtn = D.createElement('button');
    b.id = 'wall-calm'; b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'calm mode: fewer flashes, slower moves');
    const a = D.createElement('span'), s = D.createElement('span'); a.textContent = 'calm'; s.textContent = 'off'; b.append(a, s);
    b.addEventListener('click', () => calmSet(!calmIsOn()));
    b.style.visibility = 'hidden'; b.style.position = 'fixed'; b.style.zIndex = '7'; b.style.margin = '0'; b.style.boxSizing = 'border-box'; /* place and size are inline too: a sheet that never loads leaves a plain button where it belongs, not one in the page flow */
    sheet(() => { b.style.visibility = ''; calmPlace(true); });
    (D.body || html).appendChild(b);
    guard(() => ctx.settings.onChange((k) => { if (k === 'twinkle') calmPaint(); }));
    calmPlace(true);
  }
  /* the home spot is above the ladder on the right edge. a room's own controls come and go under it, so every half second it steps to the nearest
     free spot in the lower 57% of the screen, and goes home again once the home spot has been free for 1.5 s */
  const CALM_AVOID = 'button,[role="button"],input,select,a[href],#ai-liner,#ai-stop,#ai-go,#atlas-onboard,.atlas-ladder,.atlas-ladder-chip,#top nav,#atlas-toast,#hint';
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  function calmBlockers(W, H) {
    const out = [], pad = 8;
    D.querySelectorAll(CALM_AVOID).forEach((el) => {
      if (el === calmBtn || el.closest('[hidden],[inert],#atlas-labels,.lab,dialog:not([open])')) return;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return;
      out.push({ left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad });
    });
    const c = opts().corner, s = CORNER_PX;
    if (c === 'br' || c === 'bl' || c === 'tr' || c === 'tl') out.push({ left: c[1] === 'l' ? 0 : W - s, right: c[1] === 'l' ? s : W, top: c[0] === 't' ? 0 : H - s, bottom: c[0] === 't' ? s : H });
    return out;
  }
  let calmKey = '', calmCur = null, calmHome = null, calmFree = 0;
  function calmPlace(force) {
    if (!calmBtn) return;
    const W = innerWidth, H = innerHeight, panel = +opts().panel > 0 ? +opts().panel : 144;
    const d = Math.max(64, Math.round(7.5 * W / panel)); /* 75 mm at the stated panel width, never under 64 px */
    let right = Math.round(Math.max(10, W * 0.007)), bottom = Math.round(H * 0.32);
    const lad = D.querySelector('.atlas-ladder'), lb = lad ? lad.getBoundingClientRect() : null;
    const lr = lb && { left: lb.left - dx, right: lb.right - dx, top: lb.top - dy, bottom: lb.bottom - dy, width: lb.width, height: lb.height }; /* the ladder drifts too: measure it where it rests */
    if (lr && lr.width > 0 && lr.height > 0 && lr.width < W * 0.2 && lr.right > W * 0.8) {
      const gap = Math.max(10, Math.round(d * 0.18));
      right = Math.max(0, Math.round(W - lr.right));
      bottom = Math.round(H - lr.top + gap);
      if (H - bottom - d < H * 0.43) { right = Math.round(W - lr.left + gap); bottom = Math.round(H - lr.bottom + (lr.height - d) / 2); }
    }
    const maxB = Math.round(H * 0.57 - d), minB = CORNER_PX + 12; /* the top edge stays in the lower 57% of the screen, and out of the docent's corner */
    bottom = Math.max(minB, Math.min(bottom, maxB));
    const home = { d, right, bottom, key: [d, right, bottom].join() };
    const box = (p) => ({ left: W - p.right - p.d, right: W - p.right, top: H - p.bottom - p.d, bottom: H - p.bottom });
    const hit = (p, bl) => bl.reduce((a, b) => a + overlap(box(p), b), 0);
    if (force || !calmCur || calmCur.d !== d || !calmHome || calmHome.key !== home.key) { calmCur = home; calmFree = 0; calmHome = home; }
    const bl = calmBlockers(W, H);
    if (hit(home, bl) === 0) { if (calmCur.key !== home.key && ++calmFree >= 3) { calmCur = home; calmFree = 0; } } else calmFree = 0;
    if (hit(calmCur, bl) > 0) {
      const gap = Math.max(10, Math.round(d * 0.18)), step = Math.max(8, Math.round(d / 3)), edge = Math.round(Math.max(10, W * 0.007));
      let best = null;
      for (const r of [right, W - d - edge, right + d + gap, W - 2 * d - edge - gap]) {
        if (r < 0 || r + d > W) continue;
        for (let b = minB; b <= maxB; b += step) {
          const p = { d, right: r, bottom: b }, a = hit(p, bl), dist = Math.abs(r - right) + Math.abs(b - bottom);
          if (!best || a < best.a || (a === best.a && dist < best.dist)) best = { p, a, dist };
        }
      }
      if (best && best.a < hit(calmCur, bl)) { calmCur = { d, right: best.p.right, bottom: best.p.bottom, key: [d, best.p.right, best.p.bottom].join() }; calmFree = 0; }
    }
    if (!force && calmCur.key === calmKey) return;
    calmKey = calmCur.key;
    html.style.setProperty('--wall-calm-d', d + 'px'); html.style.setProperty('--wall-calm-r', calmCur.right + 'px'); html.style.setProperty('--wall-calm-b', calmCur.bottom + 'px');
    calmBtn.style.width = calmBtn.style.height = d + 'px'; calmBtn.style.right = calmCur.right + 'px'; calmBtn.style.bottom = calmCur.bottom + 'px';
  }

  /* ------------------------------------------------------------------ the clock */
  let n = 0;
  function tick() {
    const t = now(), o = opts(); n++;
    down.forEach((v, id) => { if (t - v.m > 30e3) down.delete(id); }); /* a contact that never moved or lifted stops counting after 30 s */
    const holding = down.size > 0, playing = clipPlaying(t);
    if (playing) lastClip = t;
    if (!busy) {
      const sinceIn = holding ? 0 : t - lastIn, quiet = holding ? 0 : Math.min(t - lastIn, t - lastClip);
      const idleMs = Math.max(secMs('idle', 120e3), secMs('handsoff', 45e3)), capMs = Math.max(secMs('idlecap', 300e3), idleMs);
      const due = (+o.reload || 0) * 60e3;
      if (dirty && (quiet >= idleMs || sinceIn >= capMs)) { if (o.reset === 'soft') softReset('idle'); else hardReset('idle'); }
      else if (due > 0 && t >= due && !holding && !playing && sinceIn >= RELOAD_QUIET) hardReset('scheduled');
    }
    dimStep(t, holding); driftStep(t);
    if (n % 4 === 0) watchdog(t);
    if (n % 2 === 0) calmPlace();
    if (n % 120 === 0) wakeAsk();
  }
  addEventListener('resize', () => calmPlace());

  const api = {
    __live: true,
    lastInput: () => lastIn,
    now,
    wake: () => wlState,
    log, watchdog: WD, tuning: X,
    resetNow: (kind, why) => (kind === 'soft' ? softReset(why || 'api') : hardReset(why || 'api')),
    calm: { on: calmIsOn, set: calmSet },
    state: () => ({ dirty, busy, down: down.size, clip: clipSt, playing: clipPlaying(now()), dim: dimV, drift: [dx, dy], calm: calmIsOn(), wake: wlState, wakeRequests: wlN, slate: WD.slate, press: !!press, bed: fadeG ? +fadeG.gain.value.toFixed(3) : null }),
  };
  ctx.wall.reset = api;
  calmBuild(); calmPlace(true); wakeAsk(); driftStep(now());
  setInterval(tick, TICK);
  return api;
}
