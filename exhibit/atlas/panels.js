/* package M4 — panels.js (BUILD_SPEC_V2 §2.6, §4.1, §9.6). Owns ctx.settings, the #top menu additions,
   the phone #atlas-dock, the tours sheet, the settings panel and the help overlay. Mounts FIRST among the
   atlas modules (SKELETON_NOTES MODS order), so ctx.settings is already the real implementation by the
   time every later module (including tour.js in this same package) reads it.

   Returned shape, for chrome.js and anyone else that needs to open these panels programmatically:
     { settings: {get,set,onChange}, tours:{open,close,isOpen}, settingsPanel:{open,close,isOpen}, help:{open,close,isOpen} }
*/
export function mount(ctx, deps) {
  if (!ctx.atlas || !ctx.atlas.on) return null;
  const { GF, coarse, lowPower, rooms, relayout } = deps || {};
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);

  /* -------------------------------------------------------------- ctx.settings (§9.6: type-guarded merge
     over hard defaults, every storage call try/catch'd, an in-memory fallback if storage throws) */
  const DEFAULTS = { detail: 'fine', travel: 'slow', dwell: 'normal', fade: true, glow: true, labels: true, twinkle: true, textSize: 'normal', pinch: 'atlas' };
  const SKEY = 'sm_atlas_settings_v1';
  function loadStore() {
    const store = Object.assign({}, DEFAULTS);
    try {
      const raw = localStorage.getItem(SKEY);
      if (raw) { const parsed = JSON.parse(raw); Object.keys(DEFAULTS).forEach((k) => { if (parsed && Object.prototype.hasOwnProperty.call(parsed, k) && typeof parsed[k] === typeof DEFAULTS[k]) store[k] = parsed[k]; }); }
    } catch (e) {}
    try { const qd = new URLSearchParams(location.search).get('detail'); if (qd && ['ultra', 'fine', 'normal', 'bold'].indexOf(qd) >= 0) store.detail = qd; } catch (e) {}
    if (!coarse) store.pinch = 'atlas';
    return store;
  }
  let store = loadStore();
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(store)); } catch (e) {} }
  const CHFNS = [];
  function get(k) { return store[k]; }
  function set(k, v) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, k) || typeof v !== typeof DEFAULTS[k]) return;
    if (store[k] === v) return;
    store[k] = v; persist();
    if (k === 'detail') { try { ctx.atlas.reconfigure(); } catch (e) {} }
    CHFNS.slice().forEach((f) => { try { f(k, v); } catch (e) {} });
  }
  function onChange(fn) { CHFNS.push(fn); return () => { const i = CHFNS.indexOf(fn); if (i >= 0) CHFNS.splice(i, 1); }; }
  const settingsApi = { get, set, onChange };

  /* -------------------------------------------------------------- small building blocks shared by the panels */
  let lastFocus = null;
  /* the body is the dialog's only scroll container; data-more drives the bottom fade (panels.css) so a
     line cut at the edge reads as "scroll for more", and the fade lifts once the end is reached */
  function syncMore(body) { if (body) body.toggleAttribute('data-more', body.scrollHeight - body.scrollTop - body.clientHeight > 2); }
  function openDialog(dlg) {
    lastFocus = document.activeElement;
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    const body = dlg.querySelector('[data-body]'); if (body) { body.scrollTop = 0; syncMore(body); }
    const f = dlg.querySelector('button,[href],input,select,[tabindex]'); if (f) try { f.focus(); } catch (e) {}
  }
  function closeDialog(dlg) { try { dlg.close(); } catch (e) { dlg.removeAttribute('open'); } }
  /* showModal() scopes focus to the dialog but does not wrap it: Tab past the last control leaves the document
     (chromium parks it on <body>, a real browser on its own toolbar) for one stop while the modal stays open
     (VERIFY r3 P0), so the two ends are joined here */
  function tabStops(dlg) {
    return Array.prototype.filter.call(dlg.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]'), (el) =>
      el.tabIndex >= 0 && !el.disabled && !el.closest('[inert]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  }
  function wireDialog(dlg) {
    dlg.addEventListener('keydown', (e) => {
      e.stopPropagation(); /* a modal owns its keys: arrows and space here must not step the tour or turn the camera behind it (the label's rule, shell.js) */
      if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || !dlg.open) return; /* option+tab is safari's tab-to-every-control key */
      const stops = tabStops(dlg); if (!stops.length) return;
      const a = document.activeElement, first = stops[0], last = stops[stops.length - 1];
      if (e.shiftKey ? (a === first || a === dlg) : a === last) { e.preventDefault(); try { (e.shiftKey ? last : first).focus(); } catch (x) {} }
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(dlg); });
    const x = dlg.querySelector('[data-close]'); if (x) x.addEventListener('click', () => closeDialog(dlg));
    dlg.addEventListener('close', () => { if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {} });
  }
  function panelShell(id, title) {
    const dlg = document.createElement('dialog');
    dlg.id = id; dlg.className = 'atlas-panel'; dlg.setAttribute('aria-label', title);
    dlg.innerHTML = '<div class="a-pn-head"><p class="a-pn-title">' + esc(title) + '</p><button type="button" class="a-pn-close" data-close>close</button></div><div class="a-pn-body" data-body tabindex="0"></div>';
    document.body.appendChild(dlg);
    wireDialog(dlg);
    const body = dlg.querySelector('[data-body]');
    body.addEventListener('scroll', () => syncMore(body), { passive: true });
    if (typeof ResizeObserver === 'function') { try { new ResizeObserver(() => { if (dlg.open) syncMore(body); }).observe(body); } catch (e) {} }
    return dlg;
  }

  /* -------------------------------------------------------------- tours panel (§4.1)
     W23: docked to the right over live art on desktop (panels.css .atlas-panel-dock), the settings/help
     dialogs keep the centred card treatment — only tours gets the gcdatlas-style flyout. */
  const toursDlg = panelShell('atlas-tours', 'tours');
  toursDlg.classList.add('atlas-panel-dock');
  function nameOf(id) { const t = (ctx.tour.list() || []).find((x) => x.id === id); return t ? t.name : id; }
  function renderTours() {
    const body = $('[data-body]', toursDlg), tourApi = ctx.tour, act = tourApi.active;
    let html = '<div class="a-pn-row" data-toggle></div><p class="a-lbl">time at each stop</p><div class="a-seg" data-dwell></div><div data-list style="margin-top:14px"></div>';
    body.innerHTML = html;
    const toggle = $('[data-toggle]', body);
    const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'a-btn'; b1.style.flex = '1';
    b1.textContent = act.id ? (act.playing ? 'pause tour' : 'resume ' + nameOf(act.id)) : 'play grand tour';
    b1.addEventListener('click', () => { if (act.id && act.playing) tourApi.pause('manual'); else if (act.id) tourApi.resume(); else tourApi.play('grand', 0); renderTours(); });
    const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'a-btn'; b2.style.flex = '1'; b2.textContent = 'free camera';
    b2.addEventListener('click', () => { if (act.id) tourApi.pause('manual'); closeDialog(toursDlg); });
    toggle.appendChild(b1); toggle.appendChild(b2);
    const dwellSeg = $('[data-dwell]', body);
    ['short', 'normal', 'long'].forEach((d) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = d; b.setAttribute('aria-pressed', String(get('dwell') === d));
      b.addEventListener('click', () => { set('dwell', d); renderTours(); });
      dwellSeg.appendChild(b);
    });
    const list = $('[data-list]', body), tours = tourApi.list();
    if (!tours.length) { const p = document.createElement('p'); p.className = 'a-help-note'; p.textContent = 'the tour list is loading…'; list.appendChild(p); }
    tours.forEach((t) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'a-tour-item';
      if (act.id === t.id) b.setAttribute('aria-current', 'true');
      const seen = tourApi.seen ? tourApi.seen(t.id) : 0;
      b.innerHTML = '<span class="a-t-name">' + esc(t.name) + '</span><span class="a-t-blurb">' + esc(t.blurb || '') + ' &middot; ' + (t.shown != null ? t.shown : t.stops) + ' stops' + (seen ? ' &middot; seen ' + seen + ' of ' + t.stops : '') + '</span>';
      b.addEventListener('click', () => { tourApi.play(t.id, 0); closeDialog(toursDlg); });
      list.appendChild(b);
    });
    const ss = document.createElement('button'); ss.type = 'button'; ss.className = 'a-tour-item'; ss.style.borderTop = '1px solid rgba(189,166,255,.1)'; ss.style.marginTop = '8px';
    ss.innerHTML = '<span class="a-t-name">screensaver</span><span class="a-t-blurb">loop the grand tour, hands off</span>';
    ss.addEventListener('click', () => { try { const u = new URL(location.href); u.searchParams.set('kiosk', '1'); location.href = u.toString(); } catch (e) {} });
    list.appendChild(ss);
    syncMore(body);
  }
  function openTours() { renderTours(); openDialog(toursDlg); }

  /* -------------------------------------------------------------- settings panel */
  const setDlg = panelShell('atlas-settings', 'settings');
  function segHtml(key, opts, label) {
    let h = '<p class="a-lbl">' + esc(label || key) + '</p><div class="a-seg" role="group" aria-label="' + esc(label || key) + '">';
    opts.forEach((o) => { h += '<button type="button" data-k="' + key + '" data-v="' + o + '">' + esc(o) + '</button>'; });
    return h + '</div>';
  }
  function toggleHtml(key, label) {
    return '<div class="a-toggle"><span>' + esc(label) + '</span><button type="button" data-k="' + key + '" data-bool="1">' + (get(key) ? 'on' : 'off') + '</button></div>';
  }
  function buildSettingsBody() {
    const body = $('[data-body]', setDlg);
    let html = segHtml('detail', ['ultra', 'fine', 'normal', 'bold']) + segHtml('travel', ['slow', 'quick', 'warp']) + segHtml('dwell', ['short', 'normal', 'long'], 'time at each stop') + segHtml('textSize', ['small', 'normal', 'large'], 'text size');
    html += toggleHtml('fade', 'interface fade') + toggleHtml('glow', 'glow') + toggleHtml('labels', 'labels') + toggleHtml('twinkle', 'twinkle');
    if (coarse) html += segHtml('pinch', ['atlas', 'page'], 'pinch zooms');
    html += '<p class="a-grid-read" data-grid></p><p class="a-help-note">v cycles detail &middot; y cycles travel speed &middot; g toggles glow &middot; ? opens help' + (lowPower ? ' &middot; one dot on this screen is four plays' : '') + '</p>';
    body.innerHTML = html;
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k, v = b.dataset.bool ? get(k) !== true : b.dataset.v;
      set(k, v);
      refreshSettingsUI();
    });
  }
  function refreshSettingsUI() {
    setDlg.querySelectorAll('[data-k]').forEach((b) => {
      const k = b.dataset.k;
      if (b.dataset.bool) { const on = get(k) === true; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'on' : 'off'; }
      else b.setAttribute('aria-pressed', String(get(k) === b.dataset.v));
    });
    const gr = $('[data-grid]', setDlg);
    if (gr) { let s = null; try { s = GF && GF.stats && GF.stats(); } catch (e) {} gr.textContent = s && s.cols ? s.cols + ' × ' + s.rows + ' characters' : ''; }
    syncMore($('[data-body]', setDlg));
  }
  buildSettingsBody();
  function openSettings() { refreshSettingsUI(); openDialog(setDlg); }

  /* -------------------------------------------------------------- help overlay (§2.6, every control + the
     accuracy notes: glyph shape carries provenance, phones draw one dot per four plays, the clock and the
     universe day view use one fixed utc-7 approximation, universe positions carry no meaning as distance,
     twinkle/glints are decoration everywhere) */
  const helpDlg = panelShell('atlas-help', 'help');
  (function buildHelp() {
    const body = $('[data-body]', helpDlg);
    const rows = [
      ['drag', 'turn or pan the camera'], ['wheel / pinch', 'zoom'], ['double-tap', 'zoom in, wraps to home'],
      ['tap a name', 'fly there'], ['→ ↓ ]', 'next stop'], ['← ↑ [', 'previous stop'], ['space p', 'play / pause the tour'],
      ['. ,', 'next / previous angle'], ['p', 'play / pause the tour'], ['1–9, 0', 'jump to stop n of the active tour'],
      ['/ or o', 'search'], ['+ = / -', 'zoom in / out'], ['r or esc', 'camera home'], ['h', 'first stop'],
      ['l', 'wall label'], ['m', 'mute'], ['v / g / y', 'detail / glow / travel speed'], ['?', 'this help'],
    ];
    let html = '<dl>' + rows.map((r) => '<div class="a-help-row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>';
    html += '<p class="a-help-note">the glyph SHAPE carries who pressed play in every categorical room, not just colour, and the colour code still means what it always meant.' +
      (lowPower ? ' on this screen one dot is four plays.' : '') +
      ' the clock and the universe day view read on one fixed utc−7 approximation, not a real local time. positions in the universe carry no meaning as distance or direction on their own. twinkle and the rare bright glints are decoration everywhere and carry no data.' +
      (coarse ? ' the pinch zooms setting in settings chooses whether two fingers zoom the field or the page.' : '') + '</p>';
    body.innerHTML = html;
  })();
  function openHelp() { openDialog(helpDlg); }
  ctx.keys.on('?', () => { openHelp(); return true; });

  /* -------------------------------------------------------------- v / g / y setting cycles */
  function cycle(key, opts) { const i = opts.indexOf(get(key)); set(key, opts[(i + 1 + opts.length) % opts.length]); try { ctx.toast(key + ': ' + get(key)); } catch (e) {} }
  ctx.keys.on('v', () => { cycle('detail', ['ultra', 'fine', 'normal', 'bold']); return true; });
  ctx.keys.on('y', () => { cycle('travel', ['slow', 'quick', 'warp']); return true; });
  ctx.keys.on('g', () => { set('glow', !get('glow')); try { ctx.toast('glow: ' + (get('glow') ? 'on' : 'off')); } catch (e) {} return true; });

  /* -------------------------------------------------------------- #top menu (desktop/landscape)
     Menu and dock idle-fade as "dim" (panels.css takes them to .35), not §1.12's "hide": wake is
     pointerdown/key/wheel only, so a hidden, pointer-events:none menu would drop the very click that reaches
     for it through to the stage. */
  const top = document.getElementById('top');
  let topbar = null;
  if (top) {
    topbar = document.createElement('nav'); topbar.className = 'atlas-topbar'; topbar.setAttribute('aria-label', 'atlas menu'); topbar.dataset.idle = 'dim';
    topbar.innerHTML = [
      '<button type="button" class="a-btn" data-a="home">home</button>',
      '<button type="button" class="a-btn" data-a="atlas">atlas</button>',
      '<button type="button" class="a-btn" data-a="tours">tours ▾</button>',
      '<button type="button" class="a-btn" data-a="time">time</button>',
      '<button type="button" class="a-btn" data-a="settings">settings</button>',
      '<button type="button" class="a-btn" data-a="help">?</button>',
    ].join('');
    top.appendChild(topbar);
  }

  /* -------------------------------------------------------------- phone dock (W22: §0.2 "dock (44px, lowercase)"
     — the dock is one of the fixed chrome bands the phone budget is built from, so it fully hides at idle
     (data-idle="hide", not "dim": §0.4 lists it alongside the ladder/chip/onboarding) rather than just dimming. */
  const dock = document.createElement('div'); dock.id = 'atlas-dock'; dock.setAttribute('role', 'navigation'); dock.setAttribute('aria-label', 'atlas dock'); dock.dataset.idle = 'hide';
  dock.innerHTML = '<div class="d-row">' + [
    ['home', '⌂', 'home'], ['atlas', '⌕', 'search'], ['tours', '▸', 'tours'], ['time', '◷', 'time'],
  ].map((r) => '<button type="button" data-a="' + r[0] + '"><span class="d-ic" aria-hidden="true">' + r[1] + '</span>' + r[2] + '</button>').join('') +
    '<span id="mute-slot" style="display:contents"></span>' +
    '<button type="button" data-a="settings"><span class="d-ic" aria-hidden="true">⋯</span>settings</button>' +
    /* R2_VERIFY_1_a11y P1: help had no on-screen path on phone at all — .atlas-topbar's own [data-a="help"]
       is display:none in portrait (panels.css:11) and the '?' key needs a physical keyboard. doAction()
       already handles a==='help' (below), so this is markup-only. */
    '<button type="button" data-a="help"><span class="d-ic" aria-hidden="true">?</span>help</button>' +
    '<button type="button" class="d-label" data-a="label"><span class="d-ic" aria-hidden="true">▤</span>label</button>' +
    '</div>';
  document.body.appendChild(dock);

  /* one #mute element, reparented between the topbar and the dock so its id/handler stay singular (D5) */
  const mqPortrait = matchMedia('(max-aspect-ratio:115/100)');
  function placeMute() {
    const mute = document.getElementById('mute'); if (!mute) return;
    const target = mqPortrait.matches ? $('#mute-slot', dock) : topbar;
    if (target && mute.parentElement !== target) target.appendChild(mute);
  }
  placeMute();
  if (mqPortrait.addEventListener) mqPortrait.addEventListener('change', placeMute); else if (mqPortrait.addListener) mqPortrait.addListener(placeMute);

  /* W22: the sound label reads K5 (ctx.audio.state()) once INTEGRATION lands it — 'off'/'arming' both read as
     the prompt, only 'on'/'muted' show the plain state. Feature-detected and additive: while ctx.audio.state
     does not exist yet, this never fires and shell.js's own click handler keeps owning #mute's text, exactly
     as today (R2_REQUESTS_M4.md #2 asks INTEGRATION for the event name to replace the 'atlas:sound' guess). */
  function syncMuteLabel() {
    const mute = document.getElementById('mute'); if (!mute) return;
    let state = null; try { state = ctx.audio && typeof ctx.audio.state === 'function' ? ctx.audio.state() : null; } catch (e) {}
    if (!state) return;
    mute.textContent = state === 'on' ? 'sound on' : state === 'muted' ? 'sound off' : '♪ tap for sound';
    mute.setAttribute('aria-pressed', String(state === 'muted'));
  }
  document.addEventListener('atlas:sound', syncMuteLabel);
  try { ctx.audio && typeof ctx.audio.onChange === 'function' && ctx.audio.onChange(syncMuteLabel); } catch (e) {}
  syncMuteLabel();

  /* --atlas-dockh (§2.3): exhibit.html's own portrait padding-bottom rule already reads this var; panels.js
     is the natural owner since it owns #atlas-dock. 0 when the dock is not shown (desktop/landscape). */
  let lastDockH = -1;
  function measureDock() {
    const h = mqPortrait.matches ? Math.round(dock.getBoundingClientRect().height) : 0;
    if (Math.abs(h - lastDockH) < 2) return;
    lastDockH = h;
    document.documentElement.style.setProperty('--atlas-dockh', h + 'px');
    try { relayout(); } catch (e) {}
  }
  measureDock();
  if (typeof ResizeObserver === 'function') { try { new ResizeObserver(measureDock).observe(dock); } catch (e) {} }
  if (mqPortrait.addEventListener) mqPortrait.addEventListener('change', measureDock); else if (mqPortrait.addListener) mqPortrait.addListener(measureDock);
  addEventListener('resize', measureDock, { passive: true });

  /* -------------------------------------------------------------- menu action wiring (shared by top + dock) */
  function walkFirstId() { const w = (ctx.stops || []).filter((s) => !s.side); return w.length ? w[0].id : 'threshold'; }
  function doAction(a) {
    if (a === 'home') { ctx.go(walkFirstId(), { via: 'key' }); return; }
    if (a === 'atlas') { try { ctx.search.open(); } catch (e) {} return; }
    if (a === 'tours') { openTours(); return; }
    if (a === 'time') { try { ctx.route({ stop: 'universe', angle: 'day', via: 'key' }); } catch (e) {} return; }
    if (a === 'settings') { openSettings(); return; }
    if (a === 'help') { openHelp(); return; }
    if (a === 'label') { try { ctx.label.open(); } catch (e) {} return; }
  }
  let homeHoldT = 0;
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.atlas-topbar [data-a], #atlas-dock [data-a]'); if (!b) return;
    doAction(b.dataset.a);
  });
  document.addEventListener('contextmenu', (e) => {
    const b = e.target.closest && e.target.closest('[data-a="home"]'); if (!b) return;
    e.preventDefault(); location.href = './';
  });
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('[data-a="home"]'); if (!b) return;
    homeHoldT = setTimeout(() => { location.href = './'; }, 650);
  }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => document.addEventListener(ev, () => clearTimeout(homeHoldT), { passive: true }));

  return {
    settings: settingsApi,
    tours: { open: openTours, close: () => closeDialog(toursDlg), get isOpen() { return toursDlg.open; } },
    settingsPanel: { open: openSettings, close: () => closeDialog(setDlg), get isOpen() { return setDlg.open; } },
    help: { open: openHelp, close: () => closeDialog(helpDlg), get isOpen() { return helpDlg.open; } },
  };
}
export default { mount };
