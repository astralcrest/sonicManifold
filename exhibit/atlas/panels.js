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
    dlg.addEventListener('close', () => { let f = lastFocus; if (f && f.closest && f.closest('#atlas-dock-more[hidden]')) f = document.querySelector('#atlas-dock [data-a="more"]'); if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (e) {} });
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

  /* -------------------------------------------------------------- shared words (copy.js settings.* first, these are the fallbacks) */
  const CP = (deps && deps.COPY && deps.COPY.settings) || {};
  const XFADE = Object.assign({ slow: 'long', quick: 'short', warp: 'cut' }, CP.travelSay);
  const XSEC = Object.assign({ slow: '1.1 s', quick: '0.7 s', warp: '0.35 s' }, CP.travelSec);
  const DETAIL_SAY = Object.assign({ ultra: 'finest', fine: 'fine', normal: 'plain', bold: 'big' }, CP.detailNames);
  const DWELL_SAY = Object.assign({ short: 'a breath', normal: 'a verse', long: 'the whole song' }, CP.dwellNames);
  const PINCH_SAY = Object.assign({ atlas: 'the atlas', page: 'the page' }, CP.pinchOptions);
  const SIZE_SAY = { small: 'small', normal: 'normal', large: 'large' };
  const DWELL_L = CP.holdName || 'hold';

  /* -------------------------------------------------------------- records: a crate of sleeves, flipped by spine (§4.1)
     W23: docked to the right over live art on desktop (panels.css .atlas-panel-dock), the settings/help
     dialogs keep the centred card treatment. the running time is the sum of each stop's authored hold plus the
     angle holds tour.js adds, times the hold knob; a long caption can stretch a stop, so it reads as about. */
  const toursDlg = panelShell('atlas-tours', 'records');
  toursDlg.classList.add('atlas-panel-dock');
  function nameOf(id) { const t = (ctx.tour.list() || []).find((x) => x.id === id); return t ? t.name : id; }
  function runSecs(id) {
    const def = ((deps && deps.TOURS) || []).find((x) => x.id === id); if (!def) return 0;
    const mul = ((deps && deps.DWELL) || {})[get('dwell')] || 1; let s = 0;
    (def.stops || []).forEach((st) => { s += ((st.hold || 9) + 6 * ((st.then || []).length)) * mul; });
    return Math.round(s);
  }
  const mss = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  function renderTours() {
    const body = $('[data-body]', toursDlg), tourApi = ctx.tour, act = tourApi.active;
    body.innerHTML = '<div class="a-pn-row" data-toggle></div><div class="k-crate" role="group" aria-label="the crate" data-list></div><p class="a-help-note k-hold">tracks hold for ' + esc(DWELL_SAY[get('dwell')] || '') + '. the hold knob changes that.</p>';
    const toggle = $('[data-toggle]', body);
    const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'a-btn'; b1.style.flex = '1';
    b1.textContent = act.id ? (act.playing ? 'lift the needle' : 'resume ' + nameOf(act.id)) : 'drop the needle';
    b1.addEventListener('click', () => { if (act.id && act.playing) tourApi.pause('manual'); else if (act.id) tourApi.resume(); else tourApi.play('grand', 0); renderTours(); });
    const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'a-btn'; b2.style.flex = '1'; b2.textContent = '° your hand'; b2.setAttribute('aria-label', 'your hand: stop the tour and steer yourself');
    b2.addEventListener('click', () => { if (act.id) tourApi.pause('manual'); closeDialog(toursDlg); });
    toggle.appendChild(b1); toggle.appendChild(b2);
    const list = $('[data-list]', body), tours = tourApi.list();
    if (!tours.length) { const p = document.createElement('p'); p.className = 'a-help-note'; p.textContent = 'the tour list is loading…'; list.appendChild(p); }
    tours.forEach((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'a-tour-item'; b.style.setProperty('--k-i', i);
      if (act.id === t.id) b.setAttribute('aria-current', 'true');
      const seen = tourApi.seen ? tourApi.seen(t.id) : 0, rs = runSecs(t.id), n = t.shown != null ? t.shown : t.stops;
      if (rs) b.setAttribute('aria-label', t.name + ', about ' + Math.floor(rs / 60) + ' minutes ' + (rs % 60) + ' seconds');
      b.innerHTML = '<span class="a-t-name">' + esc(t.name) + '</span>' + (rs ? '<span class="a-t-time" aria-hidden="true">~' + mss(rs) + '</span>' : '') +
        '<span class="a-t-blurb">' + esc(t.blurb || '') + ' &middot; ' + n + ' stops' + (seen ? ' &middot; seen ' + seen + ' of ' + t.stops : '') + '</span>';
      b.addEventListener('click', () => { tourApi.play(t.id, 0); closeDialog(toursDlg); });
      list.appendChild(b);
    });
    const ss = document.createElement('button'); ss.type = 'button'; ss.className = 'a-tour-item k-loop';
    ss.innerHTML = '<span class="a-t-name">leave it playing</span><span class="a-t-blurb">' + esc(nameOf('grand') + ' on repeat, hands off') + '</span>';
    ss.addEventListener('click', () => { try { const u = new URL(location.href); u.searchParams.set('kiosk', '1'); location.href = u.toString(); } catch (e) {} });
    list.appendChild(ss);
    list.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      const all = Array.prototype.slice.call(list.querySelectorAll('.a-tour-item')), i = all.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault();
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : Math.max(0, Math.min(all.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      all[j].focus();
    });
    syncMore(body);
  }
  function openTours() { renderTours(); openDialog(toursDlg); }

  /* -------------------------------------------------------------- knobs: three rotary dials, a few switches.
     the stored values and ctx.settings are unchanged; a dial is a slider over the same option lists the old rows used. */
  const setDlg = panelShell('atlas-settings', 'knobs');
  const DIALS = {
    detail: { opts: ['ultra', 'fine', 'normal', 'bold'], name: CP.detail || 'detail', say: (v) => DETAIL_SAY[v] },
    travel: { opts: ['slow', 'quick', 'warp'], name: CP.crossfade || 'crossfade', say: (v) => XFADE[v], sub: (v) => XSEC[v] },
    dwell: { opts: ['short', 'normal', 'long'], name: DWELL_L, say: (v) => DWELL_SAY[v] },
    textSize: { opts: ['small', 'normal', 'large'], name: CP.textSize || 'text size', say: (v) => SIZE_SAY[v] },
  };
  const SWITCHES = [['glow', CP.glow || 'glow'], ['sound', CP.sound || 'sound']];
  const SMALL = [['labels', CP.labels || 'names'], ['twinkle', CP.twinkle || 'shimmer'], ['fade', CP.fade || 'let the words go quiet']];
  /* a dial sweeps 270 degrees, dead zone at the bottom; i = 0 sits at -135 */
  const dAng = (i, n) => -135 + (270 * i) / (n - 1);
  const dPt = (a, r) => [(40 + r * Math.sin((a * Math.PI) / 180)).toFixed(1), (40 - r * Math.cos((a * Math.PI) / 180)).toFixed(1)];
  const dArc = (a0, a1) => { const p0 = dPt(a0, 29), p1 = dPt(a1, 29); return 'M' + p0[0] + ' ' + p0[1] + 'A29 29 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p1[0] + ' ' + p1[1]; };
  function dialHtml(key, small) {
    const D = DIALS[key], n = D.opts.length; let ticks = '';
    D.opts.forEach((o, i) => { const p = dPt(dAng(i, n), 36); ticks += '<circle class="k-tick" cx="' + p[0] + '" cy="' + p[1] + '" r="2.2"/><circle class="k-hit" cx="' + p[0] + '" cy="' + p[1] + '" r="8" data-k="' + key + '" data-v="' + o + '"/>'; });
    return '<div class="k-dialwrap' + (small ? ' k-small' : '') + '"><div class="k-dial" role="slider" tabindex="0" data-dial="' + key + '" aria-label="' + esc(D.name) + '" aria-valuemin="0" aria-valuemax="' + (n - 1) + '">' +
      '<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false"><path class="k-track" d="' + dArc(-135, 135) + '"/><path class="k-arc" d=""/>' + ticks +
      '<circle class="k-cap" cx="40" cy="40" r="21"/><g class="k-needle"><line x1="40" y1="40" x2="40" y2="23"/></g></svg></div>' +
      '<span class="k-name">' + esc(D.name) + '</span><span class="k-say" data-say="' + key + '"></span></div>';
  }
  function switchHtml(key, label, small) {
    return '<button type="button" role="switch" class="k-sw' + (small ? ' k-sw-s' : '') + '" data-k="' + key + '" data-bool="1" aria-checked="false"><span class="k-sw-name">' + esc(label) + '</span><span class="k-sw-rail" aria-hidden="true"><span class="k-sw-knob"></span></span><span class="k-sw-st" aria-hidden="true"></span></button>';
  }
  function pinchHtml() {
    return '<button type="button" role="switch" class="k-sw k-sw-s k-pair" data-k="pinch" data-pair="1" aria-checked="false" aria-label="pinch zooms the page"><span class="k-sw-name">' + esc(CP.pinch || 'pinch zooms') + '</span><span class="k-sw-rail" aria-hidden="true"><span class="k-sw-knob"></span></span><span class="k-sw-st" aria-hidden="true"><b data-side="atlas">' + esc(PINCH_SAY.atlas) + '</b> <b data-side="page">' + esc(PINCH_SAY.page) + '</b></span></button>';
  }
  const muteEl = () => document.getElementById('mute');
  function soundOn() {
    let st = null; try { st = ctx.audio && typeof ctx.audio.state === 'function' ? ctx.audio.state() : null; } catch (e) {}
    if (st) return st === 'on';
    const m = muteEl(); return !!m && m.getAttribute('aria-pressed') === 'false';
  }
  function setDial(key, i) {
    const o = DIALS[key].opts, j = Math.max(0, Math.min(o.length - 1, i));
    if (o[j] !== get(key)) { set(key, o[j]); refreshSettingsUI(); }
  }
  function buildSettingsBody() {
    const body = $('[data-body]', setDlg);
    body.innerHTML = '<div class="k-dials">' + dialHtml('detail') + dialHtml('travel') + dialHtml('dwell') + '</div>' +
      '<div class="k-switches">' + SWITCHES.map((s) => switchHtml(s[0], s[1])).join('') + '</div>' +
      '<div class="k-print"><div class="k-print-dial">' + dialHtml('textSize', true) + '</div><div class="k-print-sw">' + SMALL.map((s) => switchHtml(s[0], s[1], true)).join('') + (coarse ? pinchHtml() : '') + '</div></div>' +
      '<p class="a-help-note">v, y and g turn detail, crossfade and glow from the keyboard.</p>';
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      const k = b.dataset.k;
      if (b.dataset.v) set(k, b.dataset.v);
      else if (k === 'sound') { const m = muteEl(); if (m) m.click(); setTimeout(refreshSettingsUI, 60); }
      else if (b.dataset.pair) set(k, get(k) === 'page' ? 'atlas' : 'page');
      else set(k, get(k) !== true);
      refreshSettingsUI();
    });
    body.querySelectorAll('.k-dial').forEach((el) => {
      const key = el.dataset.dial, D = DIALS[key], n = D.opts.length;
      el.addEventListener('keydown', (e) => {
        const i = D.opts.indexOf(get(key)); let j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = i + 1; else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = i - 1;
        else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1; else if (e.key === 'PageUp') j = i + 1; else if (e.key === 'PageDown') j = i - 1;
        if (j == null) return; e.preventDefault(); setDial(key, j);
      });
      let drag = false;
      const turn = (e) => {
        const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        if (dx * dx + dy * dy < 36) return;
        let a = (Math.atan2(dx, -dy) * 180) / Math.PI; if (a > 135 && dx > 0) a = 135; else if (a < -135 || (a > 135 && dx <= 0)) a = -135;
        setDial(key, Math.round(((a + 135) / 270) * (n - 1)));
      };
      el.addEventListener('pointerdown', (e) => { drag = true; try { el.setPointerCapture(e.pointerId); } catch (x) {} turn(e); });
      el.addEventListener('pointermove', (e) => { if (drag) turn(e); });
      const up = () => { drag = false; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }
  function refreshSettingsUI() {
    Object.keys(DIALS).forEach((key) => {
      const el = setDlg.querySelector('.k-dial[data-dial="' + key + '"]'); if (!el) return;
      const D = DIALS[key], n = D.opts.length, v = get(key), i = Math.max(0, D.opts.indexOf(v)), a = dAng(i, n), say = D.say(v) + (D.sub ? ' ' + D.sub(v) : '');
      el.setAttribute('aria-valuenow', String(i)); el.setAttribute('aria-valuetext', say);
      el.querySelector('.k-needle').style.transform = 'rotate(' + a + 'deg)';
      el.querySelector('.k-arc').setAttribute('d', i ? dArc(-135, a) : '');
      el.querySelectorAll('.k-tick').forEach((t, j) => t.classList.toggle('on', j <= i));
      const s = setDlg.querySelector('[data-say="' + key + '"]'); if (s) s.textContent = say;
    });
    setDlg.querySelectorAll('button[data-k]').forEach((b) => {
      const k = b.dataset.k; let on;
      if (k === 'sound') on = soundOn(); else if (b.dataset.pair) on = get(k) === 'page'; else on = get(k) === true;
      b.setAttribute('aria-checked', String(on));
      if (b.dataset.pair) { b.setAttribute('aria-label', 'pinch zooms ' + (on ? PINCH_SAY.page : PINCH_SAY.atlas)); b.querySelectorAll('[data-side]').forEach((s) => s.classList.toggle('on', (s.dataset.side === 'page') === on)); }
      else { const st = b.querySelector('.k-sw-st'); if (st) st.textContent = on ? 'on' : 'off'; }
    });
    syncMore($('[data-body]', setDlg));
  }
  buildSettingsBody();
  refreshSettingsUI();
  document.addEventListener('atlas:sound', refreshSettingsUI);
  try { ctx.audio && typeof ctx.audio.onChange === 'function' && ctx.audio.onChange(refreshSettingsUI); } catch (e) {}
  onChange(() => { if (setDlg.open) refreshSettingsUI(); });
  function openSettings() { refreshSettingsUI(); openDialog(setDlg); }

  /* -------------------------------------------------------------- help: the back cover. a short paragraph on how to play, one line of keys,
     then the accuracy notes in small print (glyph shape carries provenance, phones draw one dot per four plays, the clock and the
     universe day view read on one fixed clock, universe positions carry no meaning as distance, shimmer is decoration) */
  const helpDlg = panelShell('atlas-help', 'help');
  (function buildHelp() {
    const body = $('[data-body]', helpDlg), H = (deps && deps.COPY && deps.COPY.help && deps.COPY.help.back) || {};
    let html = '<p class="a-back-h">' + esc(H.head || 'how to play this record') + '</p>' +
      '<p class="a-back-p">' + esc(H.how || 'drag turns it and the wheel or two fingers zoom. tap a name and you are there. the tour plays itself; press space and it is yours, press it again and it carries on.') + '</p>' +
      '<p class="a-back-k">' + esc(H.keys || '/ dig · space pause · arrows or [ ] step · , . angles · 1-9 tracks · r the whole record · g glow · v detail · y crossfade · l names · m sound · e how to read this stop · ? this') + '</p>';
    html += '<p class="a-help-note">the shape of a glyph says who pressed play in every categorical room, not just colour, and the colour code still means what it always meant.' +
      (lowPower ? ' on this screen one dot is four plays.' : '') +
      ' the clock and the universe day view read on one fixed clock all year, not a real local time. the marks after a name, ▮ to ▮▮▮▮▮, are its plays in five steps among the starred artists, in its genre colour; they say nothing about who pressed play. positions in the universe carry no meaning as distance or direction on their own. shimmer is decoration everywhere and carries no data.' +
      (coarse ? ' the pinch knob chooses whether two fingers zoom the field or the page.' : '') + '</p>';
    const sh = document.querySelector('link[rel=modulepreload][href*="shell.js?v="]') || document.querySelector('script[src*="shell.js?v="]');
    const bv = sh && /shell\.js\?v=([\w.-]+)/.exec(sh.getAttribute('href') || sh.getAttribute('src') || '');
    if (bv) html += '<p class="a-help-build" data-build>build ' + esc(bv[1]) + '</p>';
    body.innerHTML = html;
  })();
  function openHelp() { openDialog(helpDlg); }
  ctx.keys.on('?', () => { openHelp(); return true; });

  /* -------------------------------------------------------------- v / g / y setting cycles */
  function cycle(key, opts) { const i = opts.indexOf(get(key)); set(key, opts[(i + 1 + opts.length) % opts.length]); try { ctx.toast((key === 'detail' ? (CP.detail || 'detail') + ': ' + DETAIL_SAY[get(key)] : key + ': ' + get(key))); } catch (e) {} }
  ctx.keys.on('v', () => { cycle('detail', ['ultra', 'fine', 'normal', 'bold']); return true; });
  ctx.keys.on('y', () => { const o = ['slow', 'quick', 'warp'], i = o.indexOf(get('travel')); set('travel', o[(i + 1) % 3]); try { ctx.toast('crossfade: ' + XFADE[get('travel')]); } catch (e) {} return true; });
  ctx.keys.on('g', () => { set('glow', !get('glow')); try { ctx.toast('glow: ' + (get('glow') ? 'on' : 'off')); } catch (e) {} return true; });

  /* -------------------------------------------------------------- #top menu (desktop/landscape)
     Menu and dock idle-fade as "dim" (panels.css takes them to .35), not §1.12's "hide": wake is
     pointerdown/key/wheel only, so a hidden, pointer-events:none menu would drop the very click that reaches
     for it through to the stage. */
  const top = document.getElementById('top');
  let topbar = null;
  /* R8 DECK: on a desktop (fine pointer, >=900 wide, landscape) #top leaves the top edge and becomes the deck along the
     bottom (panels.css, html.atlas-deck): dig, records + the tracklist (chrome.js fills #ai-tracks), prev, the needle,
     next, the crossfade fader, sound, knobs, ?, and the tonearm dial at the end (chrome.js moves the play key and the
     dial in). the deck-only keys are display:none everywhere else, so phones and touch screens keep today's row. */
  const DECKQ = matchMedia('(pointer:fine) and (min-width:900px) and (min-aspect-ratio:115/100) and (min-height:481px)');
  /* the deck takes the bottom edge: the stage ends DECK_RES above it (deck + the band rooms put their controls in).
     post.js reserves its own player height through the same call, so the two add up instead of overwriting */
  const DECK_RES = 136, rb0 = ctx.reserveBottom;
  let rbPost = 0;
  const rbApply = () => { if (typeof rb0 === 'function') rb0.call(ctx, rbPost + (DECKQ.matches ? DECK_RES : 0)); };
  if (typeof rb0 === 'function') ctx.reserveBottom = (px) => { rbPost = Math.max(0, Math.round(px || 0)); rbApply(); };
  function deckMode() { document.documentElement.classList.toggle('atlas-deck', DECKQ.matches); rbApply(); }
  deckMode();
  if (DECKQ.addEventListener) DECKQ.addEventListener('change', deckMode); else if (DECKQ.addListener) DECKQ.addListener(deckMode);
  if (top) {
    topbar = document.createElement('nav'); topbar.className = 'atlas-topbar'; topbar.setAttribute('aria-label', 'record menu'); topbar.dataset.idle = 'dim';
    topbar.innerHTML = [
      '<button type="button" class="a-btn" data-a="home">from the top</button>',
      '<button type="button" class="a-btn" data-a="atlas">dig /</button>',
      '<button type="button" class="a-btn" data-a="tours">records ▾</button>',
      '<ol class="a-tracks" id="ai-tracks" aria-label="tracklist"></ol>',
      '<button type="button" class="a-btn a-dk" data-a="prev" aria-label="previous stop">⏮︎</button>',
      '<button type="button" class="a-btn a-dk" data-a="next" aria-label="next stop">⏭︎</button>',
      '<span class="a-xf a-dk" role="radiogroup" aria-label="crossfade"><span class="a-xf-l" aria-hidden="true">crossfade</span>' +
        ['slow', 'quick', 'warp'].map((v) => '<button type="button" role="radio" data-xf="' + v + '" aria-checked="false" aria-label="' + XFADE[v] + '"></button>').join('') +
        '<span class="a-xf-v" aria-hidden="true"></span></span>',
      '<span id="mute-top" style="display:contents"></span>',
      '<button type="button" class="a-btn" data-a="time">the day</button>',
      '<button type="button" class="a-btn" data-a="settings">knobs</button>',
      '<button type="button" class="a-btn" data-a="help">?</button>',
    ].join('');
    top.appendChild(topbar);
    const xfBtns = [...topbar.querySelectorAll('[data-xf]')], xfV = topbar.querySelector('.a-xf-v');
    const syncXF = () => { const v = get('travel'); xfBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.xf === v))); xfV.textContent = XFADE[v] || ''; };
    topbar.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-xf]'); if (b) set('travel', b.dataset.xf); });
    onChange((k) => { if (k === 'travel') syncXF(); });
    syncXF();
  }

  /* -------------------------------------------------------------- phone dock (W22: §0.2 "dock (44px, lowercase)"
     — the dock is one of the fixed chrome bands the phone budget is built from, so it fully hides at idle
     (data-idle="hide", not "dim": §0.4 lists it alongside the ladder/chip/onboarding) rather than just dimming. */
  const dock = document.createElement('div'); dock.id = 'atlas-dock'; dock.setAttribute('role', 'navigation'); dock.setAttribute('aria-label', 'transport'); dock.dataset.idle = 'hide';
  /* M11: a transport. prev/play/next drive ctx.tour (off a tour they step the walk), ♪ is #mute (CRIT6A's tab), "more" opens
     a shelf holding every earlier dock item; it floats (absolute), so --atlas-dockh never changes */
  const dbtn = (a, ic, word, extra) => '<button type="button" data-a="' + a + '"' + (extra || '') + '><span class="d-ic" aria-hidden="true">' + ic + '</span>' + word + '</button>';
  dock.innerHTML = '<div class="d-more" id="atlas-dock-more" role="group" aria-label="more" hidden>' + [
    ['home', '⌂', 'from the top'], ['atlas', '⌕', 'dig'], ['tours', '◎', 'records'], ['time', '◔', 'the day'], ['settings', '◐', 'knobs'],
    ['help', '?', 'help'], /* R2_VERIFY_1_a11y P1: help's only on-screen path on a phone */
  ].map((r) => dbtn(r[0], r[1], r[2])).join('') + dbtn('label', '▤', 'label', ' class="d-label"') + '</div>' +
    '<div class="d-row">' +
    dbtn('prev', '⏮︎', 'prev', ' aria-label="previous stop"') +
    '<button type="button" data-a="play" aria-label="play the tour"><span class="d-ic" aria-hidden="true">▶︎</span><span class="d-w">play</span></button>' +
    dbtn('next', '⏭︎', 'next', ' aria-label="next stop"') +
    '<span id="mute-slot" style="display:contents"></span>' +
    dbtn('more', '⋯', 'more', ' aria-expanded="false" aria-controls="atlas-dock-more"') +
    '</div>';
  document.body.appendChild(dock);
  const moreEl = $('#atlas-dock-more', dock), moreBtn = $('[data-a="more"]', dock), playBtn = $('[data-a="play"]', dock);
  function setMore(on) { moreEl.hidden = !on; moreBtn.setAttribute('aria-expanded', String(on)); moreBtn.classList.toggle('on', on); dock.classList.toggle('d-open', on); }
  document.addEventListener('pointerdown', (e) => { if (!moreEl.hidden && !dock.contains(e.target)) setMore(false); }, { capture: true, passive: true });
  dock.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !moreEl.hidden) { e.stopPropagation(); setMore(false); try { moreBtn.focus(); } catch (x) {} } });
  /* the play key says what a press will do: ▶ play, ‖ pause */
  function syncPlay() {
    let on = false; try { on = !!(ctx.tour && ctx.tour.isPlaying && ctx.tour.isPlaying()); } catch (e) {}
    const ic = playBtn.firstChild, w = playBtn.lastChild, t = on ? '‖' : '▶︎';
    if (ic.textContent !== t) { ic.textContent = t; w.textContent = on ? 'pause' : 'play'; playBtn.setAttribute('aria-label', on ? 'pause the tour' : 'play the tour'); }
  }
  /* panels mounts before tour.js replaces the ctx.tour facade: subscribe once the real engine is there */
  let tourHooked = null;
  function hookTour() { const t = ctx.tour; if (t && t !== tourHooked && typeof t.onChange === 'function' && typeof t.isPlaying === 'function') { tourHooked = t; try { t.onChange(syncPlay); } catch (e) {} } syncPlay(); }
  try { ctx.onStop(hookTour); } catch (e) {}
  [0, 400, 1500, 4000].forEach((ms) => setTimeout(hookTour, ms));

  /* one #mute element, reparented between the topbar and the dock so its id/handler stay singular (D5) */
  const mqPortrait = matchMedia('(max-aspect-ratio:115/100)');
  function placeMute() {
    const mute = document.getElementById('mute'); if (!mute) return;
    const target = mqPortrait.matches ? $('#mute-slot', dock) : (topbar && $('#mute-top', topbar)) || topbar;
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
    if (a === 'prev' || a === 'next') { try { ctx.tour[a](); } catch (e) {} return; }
    if (a === 'play') { try { ctx.tour.toggle(); } catch (e) {} syncPlay(); return; }
  }
  let homeHoldT = 0;
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.atlas-topbar [data-a], #atlas-dock [data-a]'); if (!b) return;
    if (b.dataset.a === 'more') { setMore(moreEl.hidden); return; }
    if (b.closest('#atlas-dock')) setMore(false);
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
