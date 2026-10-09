/* package M4 — panels.js (BUILD_SPEC_V2 §2.6, §4.1, §9.6). Owns ctx.settings, the #top menu additions,
   the phone #atlas-dock, the tours sheet, the settings panel and the help overlay. Mounts FIRST among the
   atlas modules (SKELETON_NOTES MODS order), so ctx.settings is already the real implementation by the
   time every later module (including tour.js in this same package) reads it.

   Returned shape, for chrome.js and anyone else that needs to open these panels programmatically:
     { settings: {get,set,onChange}, tours:{open,close,isOpen}, settingsPanel:{open,close,isOpen}, help:{open,close,isOpen}, notes:{open(reader?, room?),close,isOpen}, open(name) }
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

  /* -------------------------------------------------------------- records: the one tour (R13 ONE TOUR)
     W23: docked to the right over live art on desktop (panels.css .atlas-panel-dock), the settings/help dialogs keep the
     centred card treatment. the owner, on her phone: "so many tours everywhere ... make it easier". this sheet is the ONE
     place that says what the tour is: a paragraph, the needle and your hand, the lengths (the single and the radio edit
     are short cuts of the long play now, not records of their own), the tracklist chrome.js seats here, and the way into
     the liner notes. the running time is the sum of each stop's authored hold plus the angle holds tour.js adds, times
     the hold knob; a long caption can stretch a stop, so it reads as about. */
  const TC = Object.assign({
    what: 'one tour: the long play, {n} stops, from one play to the whole log. it plays itself; touch anything and your hand has it, ▶ hands it back. short cuts inside.',
    hurry: 'in a hurry?', all: 'all {n}', cut: '{label} · {n}', notesLink: 'liner notes for scientists · musicians · artists ›',
    notesHead: 'liner notes', notesWhat: 'notes on the same {n} stops, written for three kinds of reader. pick one and a note › waits under the caption wherever that reader has a line.',
    notesPlay: '▶ play the long play with these notes', notesOff: 'notes off', noteChip: 'note ›', seeIt: 'see it ›',
    loop: 'leave it playing', loopSub: '{name} on repeat, hands off',
  }, (deps && deps.COPY && deps.COPY.tour) || {});
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  const TOURS = (deps && deps.TOURS) || [];
  const tourById = (id) => TOURS.find((x) => x.id === id) || null;
  const toursDlg = panelShell('atlas-tours', 'the tour');
  toursDlg.classList.add('atlas-panel-dock');
  function nameOf(id) { const t = (ctx.tour.list() || []).find((x) => x.id === id); return t ? t.name : id; }
  function runSecs(id) {
    const def = tourById(id); if (!def) return 0;
    const mul = ((deps && deps.DWELL) || {})[get('dwell')] || 1; let s = 0;
    (def.stops || []).forEach((st) => { s += ((st.hold || 9) + 6 * ((st.then || []).length)) * mul; });
    return Math.round(s);
  }
  const mss = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const recCount = () => { const t = (ctx.tour.list() || []).find((x) => x.id === 'grand'); return t ? t.shown : 0; };
  /* chrome.js seats the tracklist as the body's first child while the sheet is open; the paragraph, the needle and the
     lengths go back above it, so the sheet reads what the tour is before it lists the stops */
  function leadFirst() { const body = $('[data-body]', toursDlg), lead = body && $('[data-lead]', body); if (lead && body.firstChild !== lead) body.insertBefore(lead, body.firstChild); }
  if (typeof MutationObserver !== 'undefined') new MutationObserver(leadFirst).observe($('[data-body]', toursDlg), { childList: true });
  function renderTours() {
    const body = $('[data-body]', toursDlg), tourApi = ctx.tour, act = tourApi.active;
    const lens = typeof tourApi.lengths === 'function' ? tourApi.lengths() : [], cur = typeof tourApi.length === 'function' ? tourApi.length() : 'grand';
    body.innerHTML = '<div class="k-lead" data-lead><p class="k-what">' + esc(fill(TC.what, { n: recCount() })) + '</p><div class="a-pn-row" data-toggle></div>' +
      (lens.length > 1 ? '<p class="a-lbl k-hurry" id="k-hurry-l">' + esc(TC.hurry) + '</p><div class="k-lens" role="radiogroup" aria-labelledby="k-hurry-l" data-lens></div>' : '') + '</div>' +
      '<div class="k-crate" data-list></div><p class="a-help-note k-hold">tracks hold for ' + esc(DWELL_SAY[get('dwell')] || '') + '. the hold knob changes that.</p>';
    const toggle = $('[data-toggle]', body);
    const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'a-btn'; b1.style.flex = '1';
    b1.textContent = act.id ? (act.playing ? 'lift the needle' : 'resume ' + nameOf(act.id)) : 'drop the needle';
    b1.addEventListener('click', () => { if (act.id && act.playing) tourApi.pause('manual'); else if (act.id) tourApi.resume(); else tourApi.play('grand', 0); renderTours(); });
    const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'a-btn'; b2.style.flex = '1'; b2.textContent = '° your hand'; b2.setAttribute('aria-label', 'your hand: stop the tour and steer yourself');
    b2.addEventListener('click', () => { if (act.id) tourApi.pause('manual'); closeDialog(toursDlg); });
    toggle.appendChild(b1); toggle.appendChild(b2);
    const lg = $('[data-lens]', body);
    if (lg) {
      lens.forEach((L) => {
        const b = document.createElement('button'), on = L.id === cur, rs = runSecs(L.id);
        b.type = 'button'; b.className = 'k-len'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; b.dataset.len = L.id;
        b.innerHTML = '<span class="k-len-n">' + esc(L.label ? fill(TC.cut, { label: L.label, n: L.n }) : fill(TC.all, { n: L.n })) + '</span>' + (rs ? '<span class="k-len-t">~' + mss(rs) + '</span>' : '');
        if (rs) b.setAttribute('aria-label', (L.label ? L.label + ', ' + L.n : 'all ' + L.n) + ' stops, about ' + Math.floor(rs / 60) + ' minutes ' + (rs % 60) + ' seconds');
        b.addEventListener('click', () => { try { tourApi.setLength(L.id); } catch (e) {} renderTours(); const f = $('.k-len[aria-checked="true"]', toursDlg); if (f) f.focus(); });
        lg.appendChild(b);
      });
      lg.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        e.preventDefault();
        const all = [...lg.querySelectorAll('.k-len')], i = all.indexOf(document.activeElement), j = (i + d + all.length) % all.length;
        all[j].click();
      });
    }
    const list = $('[data-list]', body);
    const nl = document.createElement('button'); nl.type = 'button'; nl.className = 'a-tour-item k-notes-link'; nl.dataset.notes = '';
    nl.innerHTML = '<span class="a-t-name">' + esc(TC.notesLink) + '</span>';
    nl.addEventListener('click', () => { closeDialog(toursDlg); openNotes(); });
    $('[data-lead]', body).appendChild(nl);
    const ss = document.createElement('button'); ss.type = 'button'; ss.className = 'a-tour-item k-loop';
    ss.innerHTML = '<span class="a-t-name">' + esc(TC.loop) + '</span><span class="a-t-blurb">' + esc(fill(TC.loopSub, { name: nameOf('grand') })) + '</span>';
    ss.addEventListener('click', () => { try { const u = new URL(location.href); u.searchParams.set('kiosk', '1'); location.href = u.toString(); } catch (e) {} });
    list.appendChild(ss);
    leadFirst();
    syncMore(body);
  }
  function openTours() { renderTours(); openDialog(toursDlg); }

  /* -------------------------------------------------------------- liner notes (R13): the three readers' notes on the long
     play's stops, one tab each. the lines are tours.js's own, moved there verbatim from the three liner-note tours; a tab
     picked here (or a #tour=scientists|musicians|artists link) is the lens: on a stop where that reader has a line, a small
     "note ›" waits under the caption and opens this sheet at that room. `see it ›` takes the visitor to the very view a
     note was written over (the fade, the ghost and the survivor are angles the long play itself does not visit). */
  const NOTES = TOURS.filter((t) => t.note);
  const notesDlg = panelShell('atlas-notes', TC.notesHead);
  notesDlg.classList.add('atlas-panel-dock');
  const readerOf = (t) => String(t.name || t.id).replace(/^liner notes for /, '');
  const roomName = (id) => { const s = (ctx.stops || []).find((x) => x.id === id); return s ? s.name : id; };
  const ANG = (deps && deps.COPY && deps.COPY.chrome && deps.COPY.chrome.trackAngle) || {};
  const tourLens = () => { try { return ctx.tour && typeof ctx.tour.lens === 'function' ? ctx.tour.lens() : null; } catch (e) { return null; } };
  let notesTab = null, notesSeq = 0;
  function resolveLine(raw) {
    const r = ctx.tour && typeof ctx.tour.resolveCaption === 'function' ? ctx.tour.resolveCaption(raw, {}) : Promise.resolve(raw);
    return Promise.resolve(r).then((t) => (t == null ? raw : t)).catch(() => raw);
  }
  function noteLines(st) { return [st.caption].concat((st.then || []).map((th) => (th && typeof th === 'object' && th.caption) || '')).filter(Boolean); }
  async function renderNotes(id, room) {
    const body = $('[data-body]', notesDlg), def = tourById(id) && tourById(id).note ? tourById(id) : tourById(tourLens()) || NOTES[0];
    if (!def) return;
    notesTab = def.id;
    const my = ++notesSeq, lensNow = tourLens();
    const twice = (r) => def.stops.filter((x) => x.room === r).length > 1;
    const lines = await Promise.all(def.stops.map((st) => Promise.all(noteLines(st).map(resolveLine))));
    if (my !== notesSeq) return;
    body.innerHTML = '<p class="k-what">' + esc(fill(TC.notesWhat, { n: recCount() })) + '</p>' +
      '<div class="n-tabs" role="tablist" aria-label="readers">' + NOTES.map((t) => '<button type="button" role="tab" class="n-tab' + (t.id === lensNow ? ' n-lens' : '') + '" id="n-tab-' + t.id + '" data-tab="' + t.id + '" aria-controls="n-panel" aria-selected="' + (t.id === def.id) + '" tabindex="' + (t.id === def.id ? 0 : -1) + '">' + esc(readerOf(t)) + '</button>').join('') + '</div>' +
      '<div class="n-panel" id="n-panel" role="tabpanel" aria-labelledby="n-tab-' + def.id + '" data-n-ready><p class="n-blurb">' + esc(def.blurb || '') + '</p>' +
      def.stops.map((st, k) => '<div class="n-note" data-room="' + esc(st.room) + '" data-angle="' + esc(st.angle) + '"><p class="n-at"><b>' + esc(roomName(st.room)) + '</b>' + (twice(st.room) ? ' · ' + esc(ANG[st.room + '.' + st.angle] || st.angle) : '') + '</p>' +
        lines[k].map((t) => '<p class="n-l">' + esc(t) + '</p>').join('') + '<button type="button" class="n-see" data-see="' + k + '">' + esc(TC.seeIt) + '</button></div>').join('') + '</div>' +
      '<div class="a-pn-row n-act"><button type="button" class="a-btn" data-nplay style="flex:1">' + esc(TC.notesPlay) + '</button>' + (lensNow ? '<button type="button" class="a-btn" data-noff>' + esc(TC.notesOff) + '</button>' : '') + '</div>';
    const tabs = [...body.querySelectorAll('.n-tab')];
    tabs.forEach((b) => b.addEventListener('click', () => { try { ctx.tour.setLens(b.dataset.tab); } catch (e) {} renderNotes(b.dataset.tab).then(() => { const f = $('#n-tab-' + b.dataset.tab, notesDlg); if (f) f.focus(); }); }));
    $('.n-tabs', body).addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const i = tabs.indexOf(document.activeElement); tabs[(i + d + tabs.length) % tabs.length].click();
    });
    body.querySelectorAll('[data-see]').forEach((b) => b.addEventListener('click', () => {
      const st = def.stops[+b.dataset.see]; closeDialog(notesDlg);
      try { if (ctx.tour.isPlaying()) ctx.tour.pause('manual'); } catch (e) {}
      try { ctx.go(st.room, { angle: st.angle, via: 'key' }); } catch (e) {}
    }));
    $('[data-nplay]', body).addEventListener('click', () => {
      try { ctx.tour.setLens(def.id); const a = ctx.tour.active; if (a.id) ctx.tour.resume(); else ctx.tour.play('grand', 0); } catch (e) {}
      closeDialog(notesDlg);
    });
    const off = $('[data-noff]', body); if (off) off.addEventListener('click', () => { try { ctx.tour.setLens(null); } catch (e) {} renderNotes(def.id); });
    if (room) {
      const sec = body.querySelector('.n-note[data-room="' + room + '"]');
      if (sec) { body.querySelectorAll('.n-note[data-room="' + room + '"]').forEach((x) => x.classList.add('n-here')); body.scrollTop = Math.max(0, sec.offsetTop - body.offsetTop - 12); }
    }
    syncMore(body);
  }
  function openNotes(id, room) {
    const p = renderNotes(id || notesTab, room);
    if (!notesDlg.open) openDialog(notesDlg);
    return p.then(() => { if (room) return; const body = $('[data-body]', notesDlg); body.scrollTop = 0; syncMore(body); });
  }
  /* the note chip: rides just under/after the caption (chrome.js's #ai-caption, read, never written), only while the lens has
     a line for the room on screen. it reads geometry on a slow tick (only while a lens is on), so it follows the caption
     whatever chrome.js does with it */
  const noteBtn = document.createElement('button'); noteBtn.type = 'button'; noteBtn.id = 'atlas-note'; noteBtn.className = 'atlas-note'; noteBtn.dataset.idle = 'dim'; noteBtn.hidden = true;
  noteBtn.textContent = TC.noteChip; document.body.appendChild(noteBtn);
  const curRoom = () => { const s = (ctx.stops || []).find((x) => x.i === ctx.index); return s ? s.id : null; };
  noteBtn.addEventListener('click', () => { const L = tourLens(); if (L) openNotes(L, curRoom()); });
  let noteT = 0;
  function placeNote() {
    const L = tourLens(), def = L && tourById(L), room = curRoom(), cap = document.getElementById('ai-caption');
    const has = !!(def && room && def.stops.some((x) => x.room === room));
    const r = cap && !cap.hidden ? cap.getBoundingClientRect() : null;
    const show = has && r && r.height > 4 && r.width > 4 && !document.querySelector('dialog[open]') && !document.documentElement.classList.contains('ai-endcard-open');
    if (!show) { if (!noteBtn.hidden) noteBtn.hidden = true; return; }
    noteBtn.setAttribute('aria-label', TC.noteChip.replace(/\s*›\s*$/, '') + ': ' + readerOf(def) + ' on ' + roomName(room));
    if (noteBtn.hidden) noteBtn.hidden = false;
    const w = noteBtn.offsetWidth, h = noteBtn.offsetHeight;
    let x, y;
    if (innerWidth - r.right >= w + 24) { x = r.right + 10; y = r.bottom - h; } else { x = r.right - w; y = r.top - h - 6; }
    noteBtn.style.left = Math.round(Math.max(8, Math.min(innerWidth - w - 8, x))) + 'px';
    noteBtn.style.top = Math.round(Math.max(8, Math.min(innerHeight - h - 8, y))) + 'px';
  }
  function noteTick() { clearInterval(noteT); noteT = 0; placeNote(); if (tourLens()) noteT = setInterval(placeNote, 400); }
  try { ctx.onStop(() => setTimeout(placeNote, 0)); } catch (e) {}
  addEventListener('resize', placeNote, { passive: true });
  [toursDlg, notesDlg].forEach((d) => d.addEventListener('close', placeNote));
  /* the landing's `exhibit.html#notes` (and #notes=musicians): the sheet, over the record parked on its lead-in */
  let wantNotes = null;
  { const m = /^#notes(?:=([a-z]+))?(?:&|$)/.exec((ctx.atlas && ctx.atlas.hash0) || location.hash || ''); if (m) wantNotes = { tab: m[1] && tourById(m[1]) && tourById(m[1]).note ? m[1] : null }; }
  addEventListener('hashchange', () => { const m = /^#notes(?:=([a-z]+))?/.exec(location.hash); if (m) openNotes(m[1] && tourById(m[1]) && tourById(m[1]).note ? m[1] : null); });

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
    html += '<button type="button" class="a-tour-item k-notes-link" data-notes><span class="a-t-name">' + esc(TC.notesLink) + '</span></button>';
    if (bv) html += '<p class="a-help-build" data-build>build ' + esc(bv[1]) + '</p>';
    body.innerHTML = html;
    $('[data-notes]', body).addEventListener('click', () => { closeDialog(helpDlg); openNotes(); });
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
      '<button type="button" class="a-btn" data-a="tours">the tour ▾</button>',
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
    ['home', '⌂', 'from the top'], ['atlas', '⌕', 'dig'], ['tours', '◎', 'the tour'], ['time', '◔', 'the day'], ['settings', '◐', 'knobs'],
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
  function hookTour() {
    const t = ctx.tour; if (t && t !== tourHooked && typeof t.onChange === 'function' && typeof t.isPlaying === 'function') { tourHooked = t; try { t.onChange(syncPlay); if (typeof t.on === 'function') t.on('lens', noteTick); } catch (e) {} noteTick(); }
    syncPlay();
    if (wantNotes && t && typeof t.lengths === 'function') { const w = wantNotes; wantNotes = null; try { if (!t.active.id) t.play('grand', 0, { autoplay: false }); } catch (e) {} openNotes(w.tab); }
  }
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
    notes: { open: openNotes, close: () => closeDialog(notesDlg), get isOpen() { return notesDlg.open; } },
    open(n) { const d = { tours: { open: openTours }, settings: { open: openSettings }, help: { open: openHelp }, notes: { open: openNotes } }[n]; if (d) d.open(); },
  };
}
export default { mount };
