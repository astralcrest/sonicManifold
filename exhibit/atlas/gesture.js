/* sonic manifold atlas: gesture arbitration (BUILD_SPEC_V2 §1.6, package M2).
   one full-viewport input layer, #atlas-stage, sits above the canvases and below the rooms' own dom. a press goes to
   (1) a room control natively (it is above the stage, so this module never sees it), (2) a room hit-target bound with
   bind(el, spec), or (3) the bare field, bound by the shell with the active room's gestures(ctx) spec.
   classification, the same everywhere: < 6 css px and < 450 ms is a tap; still for `hold.delay` ms is a hold (press
   feedback at 0 ms); 6 px or more first is a drag (the camera by default); a second finger is a pinch at the exact
   spread ratio; a third is ignored; lifting one of two ends the whole gesture. wheel, ctrl/cmd+wheel (trackpad pinch)
   and safari's gesture events zoom the camera. no inertia: the view stops when the hand stops. */

const num = (v, d) => { const n = +v; return v == null || v === '' || !isFinite(n) ? d : n; };
const safe = (fn, ...a) => { if (typeof fn !== 'function') return undefined; try { return fn(...a); } catch (e) { console.warn('gesture', e); return undefined; } };
const DEF = { drag: 'camera', wheel: 'camera', dbl: 'zoom' };
const KEYS = { pan: 'arrows pan · + − zoom · 0 home', orbit: 'arrows turn · + − zoom · 0 home', orbit3d: 'arrows turn · + − zoom · 0 home', none: 'arrows step through the stops' };
const LABELS_SEL = '#atlas-labels,.atlas-lab';
/* a waking touch (the first after the idle fade) is a drag only past this: a sloppy tap to bring the chrome back never
   turns the field or pauses a playing tour, while a real swipe still turns it at once, as on gcdatlas */
const WAKE_SLOP = 24;

export function createGesture(ctx, view) {
  const IN = view && view._in;
  if (!IN || typeof document === 'undefined' || !document.body) return { stub: true, stage: null, dragging: false, bind() { return () => {}; }, swallow() {} };
  const doc = document, root = doc.documentElement, now = () => performance.now();

  /* ------------------------------------------------------------------ the field's input layer */
  const stage = doc.createElement('div');
  stage.id = 'atlas-stage'; stage.tabIndex = 0;
  stage.setAttribute('role', 'application');
  stage.setAttribute('aria-roledescription', 'atlas');
  stage.setAttribute('aria-label', 'the field. drag to turn or pan, pinch or wheel to zoom, tap a name to go there. with focus here: arrow keys pan, plus and minus zoom, escape goes home.');
  const main = doc.querySelector('body > main');
  doc.body.insertBefore(stage, main || null);

  const B = new Map();          /* bound element -> { spec, m (spec merged over the defaults), token } */
  const SEEN = new WeakSet();   /* an event handled once, even when it bubbles through two bound elements */
  let G = null, DRAG = false, dragOffT = 0, lastTap = null, W = null, PAGE = false;

  function pt(sx, sy, e) {
    const w = view.unapply(sx, sy);
    return { sx, sy, wx: w[0], wy: w[1], e: e || null, type: (e && e.pointerType) || (G && G.type) || 'mouse', t0: G ? G.t0 : now() };
  }
  /* one waking press per fade, with no clock: the waking press ends the fade itself (the chrome's flag and the class, in
     the same event), and the chrome cannot fade again before fresh input has gone quiet for 2.4 s or more */
  const idleFaded = () => root.classList.contains('atlas-idle') || !!(ctx.idle && ctx.idle.faded === true);
  function capture(g, id) { try { g.el.setPointerCapture(id); } catch (e) {} }
  function release(g, id) { try { if (g.el.hasPointerCapture && g.el.hasPointerCapture(id)) g.el.releasePointerCapture(id); } catch (e) {} }
  function setDrag(on, g) {
    clearTimeout(dragOffT);
    if (on) { DRAG = true; if (g) g.el.classList.add('atlas-grabbing'); return; }
    if (g) g.el.classList.remove('atlas-grabbing');
    /* the shell's own pointerup (window, bubble) still has to see dragging = true, or a drag that ends near its start
       would leave a ripple: clear it after this event has finished dispatching */
    dragOffT = setTimeout(() => { DRAG = false; }, 0);
  }
  /* the camera is in the hand from the moment a drag or a pinch takes it until that gesture ends (lift, cancel, blur,
     hidden page, or the next press after a mouse let go outside the window): camera.js refuses every flight meanwhile */
  const hand = (on) => { if (typeof IN.setHand === 'function') IN.setHand(on); };
  function stageLook() {
    const b = B.get(stage), m = (b && b.m) || DEF, cam = IN.mode !== 'none' && m.drag !== false;
    stage.classList.toggle('atlas-grab', cam);
    stage.setAttribute('data-keys', KEYS[IN.mode] || KEYS.none);
    stage.style.cursor = typeof m.cursor === 'string' && m.cursor !== 'grab' ? m.cursor : '';
  }

  /* ------------------------------------------------------------------ press, move, release */
  function onDown(e) {
    if (SEEN.has(e)) return; SEEN.add(e);
    const el = e.currentTarget, b = B.get(el); if (!b) return;
    const type = e.pointerType || 'mouse';
    if (type === 'mouse' && e.button !== 0 && e.button !== 2) return;
    if (el === stage) { const a = doc.activeElement; if (a && a !== doc.body && a !== stage && typeof a.blur === 'function') a.blur(); } /* the field is not a focus trap: after a tap, → steps the stops again */
    if (G && G.ptrs.has(e.pointerId)) return;
    if (G && (G.type === 'mouse' || type === 'mouse')) cancel(); /* a mouse released outside the window never blocks the next press */
    if (!G) start(e, el, b.m || DEF, type); else addPtr(e);
  }
  function start(e, el, m, type) {
    G = { el, m, ptrs: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]), order: [e.pointerId], pid: e.pointerId, mode: 'pending', t0: now(),
      x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, type, alt: type === 'mouse' && (e.button === 2 || e.shiftKey), wake: !!W && W.full && W.ev === e,
      pressed: false, holdT: 0, cam: false, T: null, le: e };
    IN.setGest(true);
    const h = m.hold;
    if (h && typeof h === 'object' && !G.wake && !G.alt) {
      if (typeof h.press === 'function') { safe(h.press, pt(e.clientX, e.clientY, e)); G.pressed = true; }
      const g = G;
      g.holdT = setTimeout(() => {
        if (G !== g || g.mode !== 'pending' || g.ptrs.size !== 1) return;
        g.mode = 'hold'; g.pressed = false; capture(g, g.pid);
        safe(h.start, pt(g.px, g.py, g.le));
      }, Math.max(0, num(h.delay, 160)));
    }
  }
  function addPtr(e) {
    const g = G; g.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); g.order.push(e.pointerId);
    if (g.order.length !== 2 || g.mode === 'dead') return; /* a third finger is ignored */
    clearTimeout(g.holdT);
    const p = pt(g.px, g.py, e);
    if (g.pressed) { safe(g.m.hold && g.m.hold.end, p, true); g.pressed = false; }
    if (g.mode === 'hold') safe(g.m.hold && g.m.hold.end, p, true);
    if (g.mode === 'drag' && !g.cam && g.m.drag && typeof g.m.drag === 'object') safe(g.m.drag.end, p);
    if (PAGE && g.type !== 'mouse') { g.mode = 'dead'; if (g.cam) { hand(false); setDrag(false, g); } g.cam = false; return; } /* "pinch zooms the page": the browser owns two fingers */
    g.mode = 'pinch'; capture(g, g.order[0]); capture(g, g.order[1]);
    const A = g.ptrs.get(g.order[0]), Bp = g.ptrs.get(g.order[1]);
    g.T = { mx: (A.x + Bp.x) / 2, my: (A.y + Bp.y) / 2, sp: Math.hypot(A.x - Bp.x, A.y - Bp.y), slide: false };
    if (IN.mode !== 'none') { if (!g.cam) setDrag(true, g); g.cam = true; hand(true); IN.input('pinch', IN.keepOrbit()); }
  }
  function camMove(g, dx, dy) {
    if (IN.mode === 'pan') IN.panRaw(dx, dy);
    else if (IN.mode === 'orbit3d' && g.alt) IN.slideRaw(dx, dy);
    else IN.orbitRaw(dx, dy);
  }
  function beginDrag(g, e) {
    clearTimeout(g.holdT);
    if (g.pressed) { safe(g.m.hold && g.m.hold.end, pt(e.clientX, e.clientY, e), true); g.pressed = false; }
    g.mode = 'drag'; capture(g, g.pid);
    const d = g.m.drag, dx = e.clientX - g.x0, dy = e.clientY - g.y0; /* catch up with the whole way since the press: the field stays under the hand */
    if (d && typeof d === 'object') { safe(d.start, pt(g.x0, g.y0, e)); safe(d.move, pt(e.clientX, e.clientY, e), dx, dy); }
    else if (d === 'camera' && IN.mode !== 'none') {
      g.cam = true; setDrag(true, g); hand(true);
      const kind = IN.mode === 'pan' ? 'pan' : g.alt && IN.mode === 'orbit3d' ? 'slide' : 'orbit';
      IN.input(kind, kind === 'orbit');
      camMove(g, dx, dy);
    }
    g.px = e.clientX; g.py = e.clientY;
  }
  const DBG = !!(ctx.atlas && ctx.atlas.debug), COST = { n: 0, sum: 0 };
  function onMove(e) {
    if (!DBG) { move(e); return; }
    const t = performance.now(); move(e); COST.n++; COST.sum += performance.now() - t;
  }
  function move(e) {
    const g = G; if (!g || !g.ptrs.has(e.pointerId)) return;
    const P = g.ptrs.get(e.pointerId);
    if (g.mode === 'pinch') {
      const ia = g.order[0], ib = g.order[1];
      if (e.pointerId !== ia && e.pointerId !== ib) { P.x = e.clientX; P.y = e.clientY; return; }
      const A = g.ptrs.get(ia), Bp = g.ptrs.get(ib);
      const before = Math.hypot(A.x - Bp.x, A.y - Bp.y), mx0 = (A.x + Bp.x) / 2, my0 = (A.y + Bp.y) / 2;
      P.x = e.clientX; P.y = e.clientY;
      const after = Math.hypot(A.x - Bp.x, A.y - Bp.y), mx1 = (A.x + Bp.x) / 2, my1 = (A.y + Bp.y) / 2;
      if (IN.mode === 'none') return;
      const ratio = before > 10 && after > 10 ? after / before : 1; /* no easing: the view follows the fingers */
      if (IN.mode === 'pan') { IN.pinchRaw(ratio, mx0, my0, mx1, my1); return; }
      if (ratio !== 1) IN.zoomRaw(ratio);
      if (IN.mode === 'orbit3d') { /* both fingers travelling together slide the target, once clearly more than a pinch's own drift */
        const T = g.T; let dx = mx1 - mx0, dy = my1 - my0;
        if (!T.slide) { const m = Math.hypot(mx1 - T.mx, my1 - T.my); if (m < 16 || m < 0.8 * Math.abs(after - T.sp)) return; T.slide = true; dx = mx1 - T.mx; dy = my1 - T.my; IN.input('slide', false); }
        IN.slideRaw(dx, dy);
      }
      return;
    }
    P.x = e.clientX; P.y = e.clientY;
    if (e.pointerId !== g.pid || g.mode === 'dead') return;
    g.le = e;
    if (g.mode === 'pending') { if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) >= (g.wake ? WAKE_SLOP : 6)) beginDrag(g, e); else { g.px = e.clientX; g.py = e.clientY; } return; }
    const dx = e.clientX - g.px, dy = e.clientY - g.py; g.px = e.clientX; g.py = e.clientY;
    if (g.mode === 'drag') {
      if (g.cam) camMove(g, dx, dy);
      else if (g.m.drag && typeof g.m.drag === 'object') safe(g.m.drag.move, pt(e.clientX, e.clientY, e), dx, dy);
    } else if (g.mode === 'hold') safe(g.m.hold && g.m.hold.move, pt(e.clientX, e.clientY, e));
  }
  function onUp(e) { end(e, false); }
  function onCancelEv(e) { end(e, true); }
  function end(e, cancelled) {
    const g = G; if (!g || !g.ptrs.has(e.pointerId)) return;
    release(g, e.pointerId); g.ptrs.delete(e.pointerId);
    if (g.mode === 'pinch' || g.mode === 'dead') {
      if (g.ptrs.size > 0) { if (g.mode === 'pinch') { g.mode = 'dead'; } return; } /* one of two lifted: the other does nothing until it lifts too */
      finish(g); return;
    }
    if (g.ptrs.size > 0 && e.pointerId !== g.pid) return;
    const p = pt(e.clientX, e.clientY, e), dt = now() - g.t0, moved = Math.hypot(e.clientX - g.x0, e.clientY - g.y0);
    finish(g);
    if (g.mode === 'pending') {
      if (g.pressed) safe(g.m.hold && g.m.hold.end, p, true); /* the press became a tap: take the press feedback back */
      if (!cancelled && !g.wake && !g.alt && dt < 450 && moved < 6) tapOrDbl(g, p);
    } else if (g.mode === 'hold') safe(g.m.hold && g.m.hold.end, p, !!cancelled);
    else if (g.mode === 'drag' && !g.cam && g.m.drag && typeof g.m.drag === 'object') safe(g.m.drag.end, p);
  }
  function finish(g) {
    clearTimeout(g.holdT);
    g.ptrs.forEach((v, id) => release(g, id));
    if (G === g) G = null;
    IN.setGest(false);
    if (g.cam) { hand(false); setDrag(false, g); }
  }
  function cancel() {
    const g = G; if (!g) return;
    const p = pt(g.px, g.py, g.le);
    finish(g);
    if (g.pressed || g.mode === 'hold') safe(g.m.hold && g.m.hold.end, p, true);
    if (g.mode === 'drag' && !g.cam && g.m.drag && typeof g.m.drag === 'object') safe(g.m.drag.end, p);
  }
  function tapOrDbl(g, p) {
    const t = now(), L = lastTap, dbl = g.m.dbl;
    if (dbl !== false && L && L.el === g.el && t - L.t < 450 && Math.hypot(p.sx - L.x, p.sy - L.y) < 45) {
      lastTap = null;
      if (typeof dbl === 'function') safe(dbl, p);
      else if (IN.dblMode !== false) IN.dbl(p.sx, p.sy);
      return;
    }
    const r = safe(g.m.tap, p);
    /* a tap that did something (it returned truthy, or a flight started) never becomes the first half of a double */
    lastTap = r || IN.flyingSince(t - 1) ? null : { el: g.el, t, x: p.sx, y: p.sy };
  }
  function onHover(e) {
    if (G || (e.pointerType || 'mouse') !== 'mouse' || e.buttons) return;
    if (SEEN.has(e)) return; SEEN.add(e);
    const el = e.currentTarget, b = B.get(el), m = b && b.m; if (!m) return;
    if (!m.hover && typeof m.cursor !== 'function') return;
    const p = pt(e.clientX, e.clientY, e);
    if (m.hover) safe(m.hover, p);
    if (typeof m.cursor === 'function') { const c = safe(m.cursor, p); el.style.cursor = c || ''; }
  }
  function onLeave(e) { const b = B.get(e.currentTarget), m = b && b.m; if (m && typeof m.leave === 'function' && !G) safe(m.leave); }

  /* ------------------------------------------------------------------ wheel (D4: plain wheel zooms, as gcdatlas does) */
  function scrolls(t, stop, e) {
    for (let n = t; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1 && e.deltaY) return true;
      if (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1 && e.deltaX && !e.deltaY) return true;
      if (n === stop) break;
    }
    return false;
  }
  function onWheel(e) {
    if (e.defaultPrevented || SEEN.has(e)) return;
    const el = e.currentTarget, b = B.get(el), m = b && b.m; if (!m || m.wheel === false || !IN.wheelOn) return;
    if (el !== stage && scrolls(e.target, el, e)) return; /* a list or panel with its own scroll keeps its wheel */
    SEEN.add(e);
    if (IN.wheel(e)) e.preventDefault();
  }
  /* labels, the ladder and anything marked [data-atlas-wheel] forward the wheel to the camera, so zoom never dies over them */
  function onForeignWheel(e) {
    if (e.defaultPrevented || SEEN.has(e)) return;
    const t = e.target, host = t && t.closest ? t.closest(LABELS_SEL + ',.atlas-ladder,[data-atlas-wheel]') : null;
    if (!host || scrolls(t, host, e)) return;
    SEEN.add(e);
    if (IN.wheelOn && IN.wheel(e)) e.preventDefault();
  }
  addEventListener('wheel', onForeignWheel, { capture: true, passive: false });

  /* ------------------------------------------------------------------ safari: trackpad and ios pinch arrive as gesture events */
  let gScale = 1, gOn = false;
  const touches = () => (G && G.type !== 'mouse' ? G.ptrs.size : 0);
  stage.addEventListener('gesturestart', (e) => { if (PAGE) return; e.preventDefault(); gOn = touches() === 0 && IN.mode !== 'none'; gScale = e.scale || 1; if (gOn) IN.input('pinch', IN.keepOrbit()); }, { passive: false });
  stage.addEventListener('gesturechange', (e) => { if (PAGE) return; e.preventDefault(); if (!gOn || touches() > 0) return; const s = e.scale || 1, f = s / gScale; gScale = s; IN.zoomRaw(f, e.clientX, e.clientY); }, { passive: false });
  stage.addEventListener('gestureend', (e) => { if (PAGE) return; e.preventDefault(); gOn = false; }, { passive: false });

  /* ------------------------------------------------------------------ keyboard on the focused field
     .atlas-kbd = a keyboard is really driving the field: focus arrived by Tab, or a key that moves the camera was pressed
     here. focus handed over by code (search closing, a dialog returning it) does not count, nor does a reflex Escape.
     camera.css shows the frame and the key line on touch-first screens only with it */
  let tabAt = -1e9;
  const DRIVE = /^(Arrow(Left|Right|Up|Down)|[-+=_0])$/;
  addEventListener('keydown', (e) => { if (e.key === 'Tab') tabAt = now(); }, { capture: true, passive: true });
  stage.addEventListener('focus', () => { if (now() - tabAt < 1000) stage.classList.add('atlas-kbd'); });
  stage.addEventListener('blur', () => { stage.classList.remove('atlas-kbd'); });
  stage.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (IN.key(e.key, e.shiftKey)) { e.preventDefault(); e.stopPropagation(); if (DRIVE.test(e.key)) stage.classList.add('atlas-kbd'); }
  });
  stage.addEventListener('mousedown', (e) => { e.preventDefault(); }); /* no focus ring and no text selection from a mouse press */

  /* ------------------------------------------------------------------ wake guard (gcdatlas's eatClick): while the chrome is
     idle-faded, the first touch on the field or a name only brings it back. the fade drops at once (not on the chrome's
     next idle tick); the press picks nothing, flies nowhere, holds nothing and clicks nothing, and it only turns the field
     once it is clearly a swipe (WAKE_SLOP). a touch on a faded control that still takes the pointer works at once.
     the waking press is known by identity, never by a clock or by where its click lands. W holds its pointerdown: the tap
     arbitration compares that event object (G.wake), so the flag is fixed for the whole press. its compatibility click is
     the one pointer-made click (detail >= 1) that can arrive with no press of its own in between, so "no new press since"
     names it however late the browser delivers it and wherever the browser re-hit-tests it: the name it began on, a name
     that moved under the finger, the bare field, or a control that faded back in under the finger (the phone dock does,
     the moment the fade drops). keyboard and scripted clicks (detail 0) are never a press's. W ends when that click has
     come or a new press begins; a press that became a swipe has no click, and the next press ends it.
     a waking touch elsewhere (a chrome row) keeps its own meaning, but it never presses a control it did not land on: a
     hidden control takes no pointer while faded, so the finger lands on the row behind it, and the browser re-hit-tests
     the click onto the control once the fade drops (the phone row's ▶ would start the tour) */
  const CONTROL = 'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="tab"],[role="radio"],[role="checkbox"],[role="switch"],[role="option"],[role="menuitem"]';
  const control = (t) => (t && t.nodeType === 1 && t.closest ? t.closest(CONTROL) : null);
  const arm = (e, full) => { W = { ev: e, id: e.pointerId, up: false, full, ctl: full ? null : control(e.target) }; };
  addEventListener('pointerdown', (e) => {
    if (W && W.ev !== e && (e.isPrimary || W.up)) W = null; /* a new press: a new first finger, or any pointer once the waking one is up */
    if ((e.pointerType || 'mouse') === 'mouse' || !idleFaded()) return;
    const t = e.target; if (!t || !t.closest) return;
    if (t !== stage && !t.closest(LABELS_SEL) && !t.closest('[data-atlas-bound]')) { if (!W) arm(e, false); return; }
    arm(e, true);
    /* the chrome first, while the class is still on: its wake() clears ctx.idle.faded only when it sees the class */
    try { ctx.idle && ctx.idle.wake && ctx.idle.wake(); } catch (x) {}
    root.classList.remove('atlas-idle');
  }, { capture: true, passive: true });
  const lifted = (e) => { if (W && e.pointerId === W.id) W.up = true; };
  addEventListener('pointerup', lifted, { capture: true, passive: true });
  addEventListener('pointercancel', lifted, { capture: true, passive: true });
  /* the same treatment for a press another module has already spent (the tap that closes the phone's ladder sheet must
     not also fly somewhere, nor click what the sheet uncovers): called from a capture-phase pointerdown listener, before
     the press reaches the field */
  function swallow(e) { if (e && e.type === 'pointerdown') arm(e, true); }
  const foreign = (w, e) => w.full || control(e.target) !== w.ctl;
  /* the compatibility mousedown comes after the lift and before the click, with no press of its own: it would focus the
     control the click is re-hit-tested onto (a focused control holds the chrome awake) */
  addEventListener('mousedown', (e) => { const w = W; if (w && w.up && foreign(w, e)) e.preventDefault(); }, { capture: true });
  addEventListener('click', (e) => {
    const w = W; if (!w || !(e.detail > 0)) return;
    W = null;
    if (foreign(w, e)) { e.stopPropagation(); e.preventDefault(); }
  }, { capture: true });

  addEventListener('pointermove', onMove, { capture: true, passive: true });
  addEventListener('pointerup', onUp, { capture: true, passive: true });
  addEventListener('pointercancel', onCancelEv, { capture: true, passive: true });
  addEventListener('blur', () => cancel());
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancel(); });

  function attach(el) {
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onHover, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', noMenu);
  }
  function detach(el) {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onHover, { passive: true });
    el.removeEventListener('pointerleave', onLeave, { passive: true });
    el.removeEventListener('wheel', onWheel, { passive: false });
    el.removeEventListener('contextmenu', noMenu);
  }
  function noMenu(e) { e.preventDefault(); } /* long press never opens a callout or menu on a bound layer */

  /* ------------------------------------------------------------------ "pinch zooms: the atlas · the page" (§1.6) */
  function applyPinch(v) {
    if (v === undefined) { try { v = ctx.settings.get('pinch'); } catch (e) {} }
    PAGE = v === 'page' || v === 'the page';
    root.classList.toggle('atlas-pinch-page', PAGE);
  }
  applyPinch();
  try { ctx.settings.onChange(() => applyPinch()); } catch (e) {}
  try { if (ctx.atlas && ctx.atlas.ready && ctx.atlas.ready.then) ctx.atlas.ready.then(() => applyPinch()); } catch (e) {}

  function bind(el, spec) {
    if (!el || el.nodeType !== 1) return () => {};
    let b = B.get(el);
    if (!b) { b = { spec: null, m: null, token: null }; B.set(el, b); attach(el); if (el !== stage) el.setAttribute('data-atlas-bound', ''); }
    const token = {}; b.token = token; b.spec = spec || {}; b.m = Object.assign({}, DEF, b.spec);
    if (el === stage) stageLook();
    else if (typeof b.m.cursor === 'string' && b.m.cursor !== 'grab') el.style.cursor = b.m.cursor;
    return () => {
      const c = B.get(el); if (!c || c.token !== token) return;
      if (G && G.el === el && el !== stage) cancel();
      if (el === stage) { c.spec = null; c.m = DEF; stageLook(); return; }
      detach(el); el.removeAttribute('data-atlas-bound'); B.delete(el);
    };
  }
  bind(stage, null);
  B.get(stage).token = null;
  view.onChange((v, why) => { if (why === 'config' || why === 'resize') stageLook(); });

  const api = {
    stage, bind,
    get dragging() { return DRAG; },
    get active() { return !!G; },
    /* R5 L3: the press now: null · pending · hold · drag (a room's own) · cam (the camera's drag) · pinch · dead */
    get mode() { return G ? (G.mode === 'drag' && G.cam ? 'cam' : G.mode) : null; },
    /* R5 L3: the field's own tap (the room's gestures().tap, else its pick()), asked at a screen point as a touch */
    tapAt(sx, sy) { const b = B.get(stage), m = b && b.m; if (!m || typeof m.tap !== 'function') return undefined; const p = pt(sx, sy, null); p.type = 'touch'; return safe(m.tap, p); },
    get pinch() { return PAGE ? 'page' : 'atlas'; },
    setPinch(v) { applyPinch(v); },
    /* for a module that wants the camera's wheel on an element of its own (labels, ladder) */
    wheel(e) { if (!e || e.defaultPrevented || SEEN.has(e)) return; SEEN.add(e); if (IN.wheelOn && IN.wheel(e)) e.preventDefault(); },
    forward(el) { if (!el) return () => {}; const f = (e) => { if (e.defaultPrevented || SEEN.has(e) || scrolls(e.target, el, e)) return; SEEN.add(e); if (IN.wheelOn && IN.wheel(e)) e.preventDefault(); }; el.addEventListener('wheel', f, { passive: false }); return () => el.removeEventListener('wheel', f, { passive: false }); },
    cancel, swallow,
    cost() { const r = { moves: COST.n, meanMs: COST.n ? COST.sum / COST.n : 0 }; COST.n = COST.sum = 0; return r; },
  };
  /* R5 L3: a touch-first screen has no hover, so it gets the reticle (atlas/reticle.js, lazy, once the atlas is up and the
     page is idle). hover itself stays mouse-only (onHover above) */
  if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) {
    const load = () => import('./reticle.js' + new URL(import.meta.url).search).then((m) => { api.reticle = m.install(ctx, view, api); }).catch((e) => console.warn('reticle', e));
    const idle = () => (typeof requestIdleCallback === 'function' ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 800));
    const r = ctx.atlas && ctx.atlas.ready; if (r && typeof r.then === 'function') r.then(idle, () => {}); else idle();
  }
  return api;
}
export default { createGesture };
