/* R19 CORE: the wall profile, exhibit.html?wall=1. a classic script that the head's one-line stub writes in right after the
   viewport meta, so it runs before every other script and every module; without wall=1 it is never requested.
   it builds window.__wall (the frozen shape: on, opts, env, resets, onReset, reload, guard; the lanes read it, nothing else
   writes it), puts the page in kiosk (replaceState, so every module's own kiosk test agrees), and hardens the page for a
   room full of strangers: no page zoom, memory-only storage, no way off the page but a reload.
   html gets kiosk and wallmode, never "wall": the legacy .wall rules would blank the page (R19 DIGEST section 0 item 1). */
(function () {
  'use strict';
  if (!/[?&]wall=1\b/.test(location.search)) return;
  if (window.__wall && window.__wall.guard && window.__wall.guard.core) return;
  var de = document.documentElement, q = new URLSearchParams(location.search);
  var cs = document.currentScript, src = (cs && cs.src) || '', V = src.indexOf('?') >= 0 ? src.slice(src.indexOf('?')) : '';
  var BASE = 'exhibit/atlas/';

  /* ---------------------------------------------------------------- options: clamped, never throwing (DIGEST 2.1, 2.2) */
  var num = function (k, d, lo, hi) { var v = parseFloat(q.get(k)); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  var pick = function (k, d, list) { var v = q.get(k); return list.indexOf(v) >= 0 ? v : d; };
  /* the literal of DIGEST A-1: idle is clamped on its own (idle=-5 gives 10); idlecap never sits under idle */
  var idle = num('idle', 120, 10, 3600);
  var opts = {
    sound: pick('sound', 'touch', ['touch', 'on', 'off']),
    vol: num('vol', 0, -30, 0),
    posts: pick('posts', 'qr', ['qr', 'spotify', 'off']),
    plays: pick('plays', 'all', ['all', 'half', 'third', 'quarter']),
    handsoff: num('handsoff', 45, 5, 600),
    dwell: pick('dwell', 'normal', ['normal', 'long', 'short']),
    idle: idle,
    idlecap: Math.max(idle, num('idlecap', 300, 10, 3600)),
    reset: pick('reset', 'reload', ['reload', 'soft']),
    reload: num('reload', 60, 0, 1440),
    corner: pick('corner', 'br', ['br', 'bl', 'tr', 'tl', 'off']),
    reach: num('reach', 25, 10, 60),
    panel: num('panel', 144, 40, 400),
    attract: pick('attract', 'line', ['line', 'slate', 'off']),
    flash: num('flash', 333, 0, 1000),
    calm: pick('calm', 'control', ['control', 'off']),
    drift: pick('drift', 'on', ['on', 'off']),
    input: pick('input', 'auto', ['auto', 'touch']),
    diag: Math.round(num('diag', 0, 0, 1))
  };
  /* aliases: enter=sound means sound=on (an explicit sound= wins); enter=quiet and atlas=0 are ignored (removed below) */
  if (q.get('enter') === 'sound' && !q.has('sound')) opts.sound = 'on';

  /* ---------------------------------------------------------------- env: what the browser reports, read before any shim */
  var mm = function (s) { try { return matchMedia(s).matches; } catch (e) { return null; } };
  var glInfo = null;
  var env = {
    dpr: window.devicePixelRatio || 1, w: window.innerWidth, h: window.innerHeight,
    screenW: (window.screen && screen.width) || 0, screenH: (window.screen && screen.height) || 0,
    pointer: mm('(pointer: coarse)') ? 'coarse' : mm('(pointer: fine)') ? 'fine' : 'none',
    anyPointer: mm('(any-pointer: coarse)') ? 'coarse' : mm('(any-pointer: fine)') ? 'fine' : 'none',
    hover: mm('(hover: hover)') ? 'hover' : 'none', anyHover: mm('(any-hover: hover)') ? 'hover' : 'none',
    coarse: !!mm('(pointer: coarse)'), touchPoints: navigator.maxTouchPoints || 0,
    cores: navigator.hardwareConcurrency || 0, memory: navigator.deviceMemory || 0,
    secure: !!window.isSecureContext, wakeLock: 'wakeLock' in navigator, navigationApi: !!window.navigation
  };
  /* the GL renderer is read on first ask only (diag, tests): a probe context at boot would cost the field its time */
  Object.defineProperty(env, 'gl', { enumerable: true, get: function () {
    if (glInfo) return glInfo;
    glInfo = { webgl2: typeof WebGL2RenderingContext !== 'undefined', renderer: '', vendor: '', software: false };
    try {
      var c = document.createElement('canvas'), g = c.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) || c.getContext('webgl');
      if (g) {
        var x = g.getExtension('WEBGL_debug_renderer_info');
        glInfo.renderer = String(x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER));
        glInfo.vendor = String(x ? g.getParameter(x.UNMASKED_VENDOR_WEBGL) : g.getParameter(g.VENDOR));
        var lc = g.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext();
      } else glInfo.renderer = 'no webgl';
    } catch (e) { glInfo.renderer = 'error: ' + e; }
    glInfo.software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(glInfo.renderer);
    return glInfo;
  } });

  /* ---------------------------------------------------------------- the object every lane codes against (DIGEST A-1, 3.3) */
  var seen = [];
  var W = {
    on: true,
    opts: opts,
    env: env,
    resets: [],
    onReset: function (fn) { if (typeof fn === 'function') W.resets.push(fn); },
    reload: function () { try { location.reload(); } catch (e) {} },
    guard: { core: true, seen: seen, n: 0 }
  };
  var log = function (kind, url) { W.guard.n++; if (seen.length < 50) seen.push({ kind: kind, url: String(url || ''), t: Date.now() }); };
  window.__wall = W;

  /* ---------------------------------------------------------------- kiosk by replaceState; atlas=0 and enter= dropped. the
     shell and four rooms test kiosk=1 in the url themselves, so it is written there. enter=sound becomes sound=on in the url,
     so a reload (the reset, the watchdog) keeps it */
  try {
    var u = new URL(location.href), sp = u.searchParams, dirty = false;
    if (sp.get('kiosk') !== '1') { sp.set('kiosk', '1'); dirty = true; }
    if (sp.get('atlas') === '0') { sp.delete('atlas'); dirty = true; }
    if (sp.has('enter')) { if (sp.get('enter') === 'sound' && !sp.has('sound')) sp.set('sound', 'on'); sp.delete('enter'); dirty = true; }
    if (dirty) history.replaceState(history.state, '', u.href);
  } catch (e) {}
  de.classList.add('kiosk', 'wallmode');
  de.setAttribute('data-wall', '1');
  /* D18 option B (dig with an on-screen keyboard) is this one flag away; the owner has not chosen it, so it is off */
  if (q.get('dig') === '1') de.setAttribute('data-wall-dig', '1');

  /* ---------------------------------------------------------------- touch hardening: no page zoom (P0-1). html.wallmode
     {touch-action:pan-x pan-y} is in exhibit.html's own style; this is the mobile-class half */
  var vm = document.querySelector('meta[name="viewport"]');
  if (!vm) { vm = document.createElement('meta'); vm.name = 'viewport'; (document.head || de).appendChild(vm); }
  vm.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

  /* ---------------------------------------------------------------- memory-only storage (P0-4, DIGEST A-2): one stranger's
     knobs, seen-flags and guesses never reach the next one; a reload clears it. every caller in the exhibit uses the method API */
  var mem = function () {
    var m = Object.create(null);
    return {
      get length() { return Object.keys(m).length; },
      key: function (i) { return Object.keys(m)[i] || null; },
      getItem: function (k) { k = String(k); return k in m ? m[k] : null; },
      setItem: function (k, v) { m[String(k)] = String(v); },
      removeItem: function (k) { delete m[String(k)]; },
      clear: function () { m = Object.create(null); }
    };
  };
  ['localStorage', 'sessionStorage'].forEach(function (n) {
    var s = mem();
    try { Object.defineProperty(window, n, { configurable: true, get: function () { return s; } }); } catch (e) {}
  });

  /* ---------------------------------------------------------------- the exit guard (P0-2, DIGEST A-3) */
  var bare = function (h) { return String(h).split('#')[0]; };
  /* a navigation is allowed when it stays in this document (a hash, replaceState), is a reload (the shell's own recovery
     buttons: shell.js "try again" and "reload", chrome.js "a newer build"), or lands on this exact url again, which is a
     reload too (the inline boot fallback's reload link is href=""); never a download */
  if (window.navigation && navigation.addEventListener) {
    navigation.addEventListener('navigate', function (e) {
      var d = e.destination, url = d && d.url;
      if (e.downloadRequest == null) { /* a download names its file, and a bare download attribute names it "" */
        if (e.navigationType === 'reload' || (d && d.sameDocument)) return;
        if (url && bare(url) === bare(location.href)) return;
      }
      if (e.cancelable) { e.preventDefault(); log('navigate', url); } else log('navigate (not cancelable)', url);
    });
  }
  var offPage = function (a) {
    var h = a.getAttribute('href'); if (h == null) return false;
    if (a.hasAttribute('download')) return true;
    var t = (a.getAttribute('target') || '').toLowerCase();
    if (t && t !== '_self' && t !== '_top' && t !== '_parent') return true;
    var dest; try { dest = new URL(h, location.href); } catch (e) { return true; }
    return bare(dest.href) !== bare(location.href);
  };
  /* a modifier on a link (ctrl, cmd, shift) or a middle press opens a new window even for a hash link: stopped too */
  var onLink = function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest('a[href],area[href]');
    if (!a) return;
    if (!offPage(a) && !(ev.ctrlKey || ev.metaKey || ev.shiftKey) && ev.type !== 'auxclick') return;
    ev.preventDefault(); ev.stopImmediatePropagation(); log(ev.type, a.href);
  };
  document.addEventListener('click', onLink, true);
  document.addEventListener('auxclick', onLink, true);
  /* a link that was never put in the page (a save-image anchor clicked from code) is not seen by a document listener */
  var AP = window.HTMLAnchorElement && HTMLAnchorElement.prototype, aClick = window.HTMLElement && HTMLElement.prototype.click;
  if (AP && aClick) {
    try {
      Object.defineProperty(AP, 'click', { configurable: true, writable: true, value: function () {
        if (offPage(this)) { log('click()', this.href); return; }
        return aClick.apply(this, arguments);
      } });
    } catch (e) {}
  }
  window.open = function (url) { log('open', url); return null; };
  ['contextmenu', 'dragstart', 'gesturestart'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); }, { capture: true, passive: false });
  });
  /* a file or a link dropped on the glass would be opened in place of the exhibit */
  ['dragover', 'drop'].forEach(function (t) {
    window.addEventListener(t, function (e) { e.preventDefault(); }, { capture: true, passive: false });
  });
  /* ctrl + wheel (a trackpad pinch on a maintenance pad) would zoom the page the way a stray pinch did. stopped last, on the
     way out at window: the stage's own handler (gesture.js) skips an event that is already defaultPrevented, so the camera
     still zooms and only the browser's page zoom is stopped */
  window.addEventListener('wheel', function (e) { if (e.ctrlKey && !e.defaultPrevented) e.preventDefault(); }, { passive: false });
  /* a wall must not move with its panel (P2-12): orientation and motion never reach a listener */
  ['deviceorientation', 'devicemotion', 'deviceorientationabsolute'].forEach(function (t) {
    window.addEventListener(t, function (e) { e.stopImmediatePropagation(); }, true);
  });

  /* ---------------------------------------------------------------- input=touch (optional, P1-11): the pointer and hover
     media queries answer as a touch panel in JS. CSS @media still follows the browser: the launch flag
     --blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=1,availableHoverTypes=1 is the supported path */
  if (opts.input === 'touch' && window.matchMedia) {
    var realMM = window.matchMedia.bind(window), YES = '(min-width: 0px)', NO = '(max-width: 0px)';
    var ANS = { 'pointer': { coarse: 1, fine: 0, none: 0, '': 1 }, 'any-pointer': { coarse: 1, fine: 0, none: 0, '': 1 },
      'hover': { hover: 0, none: 1, '': 0 }, 'any-hover': { hover: 0, none: 1, '': 0 } };
    var FEAT = /\(\s*(any-pointer|any-hover|pointer|hover)\s*(?::\s*([a-z]+)\s*)?\)/gi;
    window.matchMedia = function (query) {
      var s = String(query);
      if (!/pointer|hover/i.test(s)) return realMM(s);
      return realMM(s.replace(FEAT, function (m, f, v) {
        var a = ANS[f.toLowerCase()], k = (v || '').toLowerCase();
        return a && k in a ? (a[k] ? YES : NO) : m;
      }));
    };
  }

  /* ---------------------------------------------------------------- the seven wall sheets, last in the head's cascade
     (exhibit.html's end-of-head stub calls this; a missing sheet is a harmless 404). not one of the frozen keys */
  var SHEETS = ['wall', 'wall.touch', 'wall.type', 'wall.sound', 'wall.links', 'wall.reset', 'wallcard'], linked = false;
  var links = function (late) {
    if (linked) return; linked = true;
    SHEETS.forEach(function (n) {
      var href = BASE + n + '.css' + V;
      if (!late && document.readyState === 'loading') document.write('<link rel="stylesheet" href="' + href + '" data-wall-sheet="' + n + '">');
      else { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-wall-sheet', n); document.head.appendChild(l); }
    });
  };
  Object.defineProperty(W, 'links', { value: function () { links(false); } });
  document.addEventListener('DOMContentLoaded', function () { links(true); }, { once: true });

  /* ---------------------------------------------------------------- diag=1: the installer overlay (walldiag.js) */
  if (opts.diag) {
    var s = document.createElement('script'); s.type = 'module'; s.src = BASE + 'walldiag.js' + V;
    (document.head || de).appendChild(s);
  }
})();
