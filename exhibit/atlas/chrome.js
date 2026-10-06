/* exhibit/atlas/chrome.js — package M3 (BUILD_SPEC_V2 BRIEF M3).
   Info panel, stepper, captions, chips, idle-fade, toast, tape counter, zoom buttons, the bottom hint line (first-visit
   onboarding + "tap anywhere for sound"). Reads: §1.3, §1.12, §2.3, §2.4, §9 (1-4,7,9). SKELETON_NOTES.md's
   "exact API as implemented" wins over the prose spec where they differ (module load order, ctx.atlas fields,
   facade replay behaviour).

   Cross-module contract this file ASSUMES (documented in REQUESTS_M3.md / REQUESTS_fix_r1_M3.md):
     - ctx.atlas.panels.open('tours' | 'settings' | 'help')   — M4, optional (chip degrades to a toast if absent)
     - #atlas-dock (phone nav dock), if present, reports its own height via ResizeObserver here (read-only)
     - ctx.tour.resolveCaption(raw) — M4, optional; the local token resolver below is the fallback
*/
export function mount(ctx, deps) {
  if (!ctx.atlas || !ctx.atlas.on) return null;
  deps = deps || {};
  const reduced = !!deps.reduced;
  const KIOSK = !!deps.KIOSK;
  const P = deps.P || null;
  const TOURS = deps.TOURS || [];
  const CC = (deps.COPY && deps.COPY.chrome) || {};
  const doc = document, html = doc.documentElement, body = doc.body;
  const now = () => performance.now();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const two = (n) => String(n).padStart(2, '0');
  const coarse = !!deps.coarse || matchMedia('(pointer:coarse)').matches;

  const T = {
    nextStop: CC.nextStop || 'up next · {stop} ›',
    backToTour: CC.backToTour || 'back to the queue · {stop} ›',
    startAgain: CC.startAgain || 'play it again ›',
    cameraHome: CC.cameraHome || 'camera home ›',
    backTo: CC.backTo || 'back to {stop} ›',
    sideRoom: CC.sideRoom || 'side room',
    enRoute: CC.enRoute || 'en route',
    sound: CC.soundChip || '♪ tap for sound',
    onboard: CC.onboarding || 'hover to hear · hold to loop · drag to turn · / to dig the log',
    onboardTouch: CC.onboardingTouch || 'touch to hear · hold to loop · drag to turn',
    pauseTour: CC.pauseTour || '‖ pause',
    playTour: CC.playTour || '▶ play tour',
    /* round-2 (W-fix7): the phone merged-row pill carries only a short verb — the destination name is already
       in the caption/tours sheet, repeating it here is what made the row read as noise */
    mpillNext: CC.mpillNext || 'up next ›',
    mpillBack: CC.mpillBack || 'back ›',
    mpillAgain: CC.mpillAgain || 'again ›',
    mpillHome: CC.mpillHome || 'home ›',
    /* W10 tour end card (fallback copy; C2/copy.js may supply `CC.end*`) */
    endHead: CC.endHead || 'end of the record.',
    endFly: CC.endFly || 'take the wheel ›',
    endExport: CC.endExport || 'run it on your own export ›',
    endReport: CC.endReport || 'the report ›',
    endAgain: CC.endAgain || 'play it again ›',
    contact: CC.contact || 'questions or a dataset of your own · astralcrest',
    overflow: CC.overflow || 'more controls',
    share: CC.shareLabel || 'share',
    lockedOn: CC.lockedOn || '° held',
    freeCamera: CC.freeCamera || '° your hand',
    paused: (CC.toasts && CC.toasts.tourPaused) || 'you took the wheel · ▶ hands it back to the queue',
    bar: CC.angleBar || 'bar {k} / {n}',
    shuffle: CC.shuffle || '× shuffle',
    servedKey: CC.servedKey || 'how you reached each stop: ≡ the tour moved on, ° you picked it, × shuffle',
    servedEnd: CC.servedEnd || 'you started {n} of your {total} stops by hand. i started 19 of every 100 plays.',
    tapeWhole: (deps.COPY && deps.COPY.tplus && deps.COPY.tplus.whole) || 'the whole log',
    tapeAt: (deps.COPY && deps.COPY.tplus && deps.COPY.tplus.at) || 'play {n} of {total}',
  };
  const LP = (TOURS.find((t) => t.id === 'grand') || {}).name || 'the long play';
  const fillStop = (s, name) => s.replace('{stop}', name);

  /* ---------------------------------------------------------------- storage guard (§9.6): a stored value is honoured
     only if it round-trips through JSON; any throw (privacy browsers) falls back to memory, silently. */
  const MEM = {};
  function sGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in MEM ? MEM[k] : d; } }
  function sSet(k, v) { MEM[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* the compact card (`less`) is the default on every screen (VERIFY r3 P1: on desktop the full wall, five paragraphs and
     a chip legend, competed with the art): the dim lines, legends and go-deeper links wait under `more ▾` */
  let lessOn = true;
  const compactVP = () => isPortrait() || innerHeight <= 480;

  /* ---------------------------------------------------------------- DOM build (mount, no layout, §1.4)
     rows, top to bottom (gcdatlas order): stop row · typed caption · angle bar · the pill (its own row, so it is never
     clipped by a long angle bar and never jumps sideways between stops) · tape counter · tools (share · photo · label). */
  const info = doc.createElement('div');
  info.id = 'atlas-info'; info.className = 'atlas-info';
  info.innerHTML =
    '<div class="ai-row1" id="ai-row1" data-idle="dim">' +
      '<span class="ai-stop" id="ai-stop"></span>' +
      '<button type="button" class="ai-chip ai-tourchip" id="ai-tourchip" data-idle="hide" aria-haspopup="dialog"><span class="ai-tourchip-t" id="ai-tourchip-t"></span><span aria-hidden="true">&nbsp;▾</span></button>' +
      '<button type="button" class="ai-chip ai-shuf" id="ai-shuf" data-idle="hide"></button>' +
      '<span class="ai-chip ai-camchip" id="ai-camchip" data-idle="hide" hidden></span>' +
      '<span class="ai-row1-sp"></span>' +
      '<button type="button" class="ai-mini" id="ai-less" data-idle="hide"></button>' +
      '<button type="button" class="ai-mini" id="ai-hide" data-idle="hide">hide</button>' +
    '</div>' +
    /* round-2 item 4: gcd's own anchor ("Earth", 30px) — the stop's name, under the stop row, never a
       gradient. Phone never renders this (chrome.css): the merged row already carries the name there, and
       phone's strict coverage budget has no room for a second copy of it. */
    /* R7B: title + caption = the liner note (chrome.css: fixed lower left on desktop, display:contents elsewhere) */
    '<div class="ai-liner" id="ai-liner"><h1 class="ai-title" id="ai-title" data-idle="dim"></h1>' +
    '<p class="ai-caption" id="ai-caption" data-idle="dim" aria-hidden="true" hidden><span class="ai-cap-ghost" id="ai-cap-g"></span>' +
      '<span class="ai-cap-live" id="ai-cap-live"><span class="ai-cap-t" id="ai-cap-t"></span><span class="ai-cursor" id="ai-cursor" hidden></span><span class="ai-cap-x"></span></span></p></div>' +
    '<div class="ai-angle" id="ai-angle" data-idle="dim" hidden>' +
      '<button type="button" class="ai-angle-btn" id="ai-angle-prev" aria-label="previous angle" data-idle="hide">‹</button>' +
      '<span class="ai-angle-bar" id="ai-angle-bar"></span>' +
      '<button type="button" class="ai-angle-btn" id="ai-angle-next" aria-label="next angle" data-idle="hide">›</button>' +
    '</div>' +
    '<div class="ai-go" id="ai-go" data-idle="dim">' +
      '<div class="ai-zoom" id="ai-zoom" data-idle="hide">' +
        '<button type="button" class="ai-zbtn" id="ai-zout" aria-label="zoom out">−</button>' +
        '<button type="button" class="ai-zbtn" id="ai-zin" aria-label="zoom in">+</button>' +
      '</div>' +
      '<button type="button" class="ai-pill" id="ai-pill" data-idle="hide" hidden></button>' +
    '</div>' +
    '<p class="ai-tplus" id="ai-tplus" data-idle="hide" aria-hidden="true" hidden><span id="ai-tplus-a"></span><span class="ai-tplus-end" id="ai-tplus-b"></span></p>' +
    '<p class="ai-served" id="ai-served" data-idle="dim" role="img" hidden></p>' +
    '<div class="ai-hud" id="ai-hud" data-idle="dim" hidden></div>' +
    '<div class="ai-foot" id="ai-foot" data-idle="hide">' +
      /* the wall label (the l key, the phone dock's `label`); `more ▾` in the stop row is the card's own expander, so this
         one is named for what it opens (VERIFY r3: with the card compact on desktop too, two `more ▾` did two things) */
      '<button type="button" class="ai-more" id="ai-more" aria-haspopup="dialog">label</button>' +
    '</div>' +
    /* ---------------------------------------------------------- W06/W09/W18: the phone merged row (§0.2). desktop
       never renders this (chrome.css keeps it display:none there); it duplicates the stop/tour/pill controls above
       instead of reparenting them, so the desktop DOM and its measured metrics never change (W08/W30 gate). */
    '<div class="ai-mrow" id="ai-mrow" hidden>' +
      '<button type="button" class="ai-mplay" id="ai-mplay" aria-pressed="false" aria-label="pause tour"><span aria-hidden="true" id="ai-mplay-i">&#8214;</span></button>' +
      '<button type="button" class="ai-mrow-label" id="ai-mrow-label" aria-haspopup="dialog"><span id="ai-mrow-t"></span></button>' +
      '<button type="button" class="ai-mrow-ov" id="ai-mrow-ov" aria-haspopup="true" aria-expanded="false" aria-label="more controls">&hellip;</button>' +
      '<button type="button" class="ai-mpill" id="ai-mpill" hidden></button>' +
    '</div>' +
    '<div class="ai-overflow" id="ai-overflow" hidden>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-less"></button>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-label">label</button>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-shuf"></button>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-share" hidden>share</button>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-photo" hidden>picture</button>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-expose" hidden>expose</button>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-xray">x-ray</button>' +
      '<button type="button" class="ai-ov-btn" id="ai-ov-hide">hide</button>' +
    '</div>' +
    /* ---------------------------------------------------------- W10: tour end card, both viewports */
    '<div class="ai-end" id="ai-end" hidden>' +
      '<p class="ai-end-h" id="ai-end-h"></p>' +
      '<p class="ai-end-served" id="ai-end-served"></p>' +
      '<button type="button" class="ai-end-btn" id="ai-end-fly"></button>' +
      '<button type="button" class="ai-end-btn" id="ai-end-export"></button>' +
      '<button type="button" class="ai-end-btn" id="ai-end-report"></button>' +
      '<button type="button" class="ai-end-btn" id="ai-end-again"></button>' +
      '<a class="ai-end-btn" id="ai-end-colophon" href="colophon.html">colophon &rsaquo;</a>' +
      '<p class="ai-end-contact" id="ai-end-contact"></p>' +
    '</div>';
  body.appendChild(info);

  const show = doc.createElement('button');
  show.id = 'atlas-show'; show.type = 'button'; show.textContent = 'show';
  body.appendChild(show);

  /* ---------------------------------------------------------------- W09: desktop play/pause lives in #top,
     beside the M4 menu / sound. Grafted at runtime (the pattern chrome.js already uses for the M8 photo dock),
     never editing exhibit.html/panels.js; inserted before the M4 topbar nav if it has already mounted (module
     order note: panels.js mounts first), else appended so a later panels.js mount still lands after it. */
  const topPlay = doc.createElement('button');
  topPlay.type = 'button'; topPlay.id = 'ai-topplay'; topPlay.className = 'a-btn ai-topplay'; topPlay.setAttribute('aria-pressed', 'false');
  function graftTopPlay() {
    const top = doc.getElementById('top'); if (!top || top.contains(topPlay)) return;
    const bar = top.querySelector('.atlas-topbar');
    if (bar) top.insertBefore(topPlay, bar); else top.appendChild(topPlay);
  }
  graftTopPlay();
  new MutationObserver(graftTopPlay).observe(doc.getElementById('top') || body, { childList: true });

  /* the bottom hint line: the first-visit onboarding and the "tap anywhere for sound" prompt, in one line under the
     stage (landscape) or just above #atlas-info (portrait). its own fixed element, not a row in #atlas-info, so it
     never counts toward the card's measured height (which feeds ctx.atlas.insets → stage()). the id is kept:
     universe.js lifts its control dock over this element while it is not [hidden]. */
  const lineEl = doc.createElement('p');
  lineEl.id = 'atlas-onboard'; lineEl.setAttribute('data-idle', 'hide'); lineEl.hidden = true;
  const lineOnb = doc.createElement('span'); lineOnb.className = 'ai-line-onb'; lineOnb.hidden = true;
  const lineSnd = doc.createElement('span'); lineSnd.className = 'ai-line-snd'; lineSnd.hidden = true; lineSnd.textContent = T.sound;
  lineSnd.setAttribute('aria-hidden', 'true');
  lineEl.append(lineOnb, lineSnd);
  body.appendChild(lineEl);

  const toastEl = doc.createElement('p');
  toastEl.id = 'atlas-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-hidden', 'true');
  body.appendChild(toastEl);

  const $ = (id) => doc.getElementById(id);
  const row1 = $('ai-row1'), stopText = $('ai-stop'), tourChip = $('ai-tourchip'), tourChipT = $('ai-tourchip-t'), camChip = $('ai-camchip');
  const titleEl = $('ai-title');
  const lessBtn = $('ai-less'), hideBtn = $('ai-hide');
  const capEl = $('ai-caption'), capG = $('ai-cap-g'), capLive = $('ai-cap-live'), capT = $('ai-cap-t'), cursorEl = $('ai-cursor');
  const angleRow = $('ai-angle'), anglePrev = $('ai-angle-prev'), angleNext = $('ai-angle-next'), angleBar = $('ai-angle-bar'), pillBtn = $('ai-pill');
  const tplusEl = $('ai-tplus'), tplusA = $('ai-tplus-a'), tplusB = $('ai-tplus-b'), hudEl = $('ai-hud');
  const zoomOut = $('ai-zout'), zoomIn = $('ai-zin'), moreBtn = $('ai-more'), footEl = $('ai-foot');
  const mrow = $('ai-mrow'), mplay = $('ai-mplay'), mplayI = $('ai-mplay-i'), mrowLabel = $('ai-mrow-label'), mrowT = $('ai-mrow-t'), mrowOv = $('ai-mrow-ov'), mpillBtn = $('ai-mpill');
  const overflowEl = $('ai-overflow'), ovLess = $('ai-ov-less'), ovLabel = $('ai-ov-label'), ovShare = $('ai-ov-share'), ovPhoto = $('ai-ov-photo'), ovExpose = $('ai-ov-expose'), ovXray = $('ai-ov-xray'), ovHide = $('ai-ov-hide');
  mrowOv.setAttribute('aria-label', T.overflow);
  ovShare.textContent = T.share;
  const shufBtn = $('ai-shuf'), ovShuf = $('ai-ov-shuf'), servedEl = $('ai-served'), endServed = $('ai-end-served');
  shufBtn.textContent = ovShuf.textContent = T.shuffle; tourChipT.textContent = LP;
  const endEl = $('ai-end'), endH = $('ai-end-h'), endFly = $('ai-end-fly'), endExport = $('ai-end-export'), endReport = $('ai-end-report'), endAgain = $('ai-end-again'), endContact = $('ai-end-contact');

  /* photo.js (M8) appends its share/photo dock straight into #atlas-info; it belongs on the tools row, before
     `more`, as one row of small pills (gcdatlas: share · compare size · photo) */
  let realShareBtn = null;
  function adoptPhotoDock() {
    const d = info.querySelector(':scope > .atlas-photodock'); if (!d) return;
    footEl.insertBefore(d, moreBtn);
    /* W18: the phone overflow gets its own `share` entry that delegates to M8's real button, since the
       photodock itself sits in #ai-foot (hidden by the compact card except while `.is-open`, WIRE_BUGS 1) */
    realShareBtn = d.querySelector('[data-act="share"]');
    if (realShareBtn && ovShare.hidden) ovShare.hidden = false;
    ovPhoto.hidden = ovExpose.hidden = false;
    if (!d.dataset.postcard) { d.dataset.postcard = '1'; d.addEventListener('click', postcard, true); }
  }
  new MutationObserver(adoptPhotoDock).observe(info, { childList: true });
  ovShare.addEventListener('click', () => { if (realShareBtn) realShareBtn.click(); closeOverflow(); });
  /* the compact card hides the photo chip (0x0 at 390 px), so phones reach the photo bar from here. focus goes to the
     "…" first: photo.js hands focus back to whoever held it on open, and the entry itself is gone by then */
  const openPhoto = (then) => {
    const P = ctx.atlas && ctx.atlas.photo; closeOverflow(); if (!P) return;
    try { mrowOv.focus(); } catch (e) {}
    P.open(); if (then) then(P);
  };
  ovPhoto.addEventListener('click', () => openPhoto());
  ovExpose.addEventListener('click', () => openPhoto((P) => P.expose()));
  /* same URL string as exhibit.html's loader, so this is the same module instance as the x key's */
  ovXray.addEventListener('click', () => { closeOverflow(); import('./engine.js' + (ctx.V || '')).then((m) => m.toggle()).catch(() => {}); });
  /* R9 postcards: on a stop with a share line (tours.js SHARE), `share` sends its unfurl page s/<stop>.html, carrying this
     view's hash, with the line: the share sheet where there is one, else the clipboard. captured on the dock, ahead of
     photo.js's own link copy, which still runs on a stop without a line */
  const shareLine = (id) => { for (const t of TOURS) for (const s of t.stops) if (s.room === id && s.share) return s.share.line; return ''; };
  async function postcard(e) {
    if (!e.target.closest('[data-act="share"]')) return;
    const cur = curStop(), line = cur ? shareLine(cur.id) : ''; if (!line) return;
    e.stopPropagation();
    const h = location.hash, url = new URL('s/' + cur.id + '.html' + (h.slice(1).split(/[&=]/)[0] === cur.id ? h : ''), location.href).href, text = line + '\n' + url;
    if (navigator.share) { try { await navigator.share({ title: cur.name.toUpperCase(), text: line, url }); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
    let done = false;
    try { await navigator.clipboard.writeText(text); done = true; } catch (err) {}
    if (!done) try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;top:-99px;opacity:0'; document.body.appendChild(ta); ta.select(); done = document.execCommand('copy'); ta.remove(); } catch (err) {}
    const msg = done ? 'postcard link copied' : 'select and copy the link';
    try { ctx.toast(msg); } catch (err) {} try { ctx.say(msg); } catch (err) {}
  }

  /* ---------------------------------------------------------------- stops, tours: small lookups */
  const walkStops = () => (ctx.stops || []).filter((s) => !s.side);
  const curStop = () => (ctx.stops || []).find((s) => s.i === ctx.index) || null;
  const stopById = (id) => (ctx.stops || []).find((s) => s.id === id) || null;
  const nameOf = (id) => { const s = stopById(id); return s ? s.name : id; };
  const tourDef = (id) => TOURS.find((t) => t.id === id) || null;
  /* the tour owns the stepper while it plays or flies, and while the visitor is still standing in its current stop;
     once they have gone elsewhere (search, tap, ladder, a key) the stepper speaks for where they are */
  function tourState() {
    const a = ctx.tour && ctx.tour.active;
    if (!a || !a.id) return null;
    const def = tourDef(a.id), sd = def && def.stops ? def.stops[a.k] : null, cur = curStop();
    const here = !!(sd && (a.playing || a.enRoute || (cur && cur.id === sd.room)));
    return { a, def, sd, here, n: def && def.stops ? def.stops.length : (a.n || 1) };
  }
  /* R5 §4.2: a tour's gate (stop 0 marked gate:true, the threshold) is not counted, so the pocket tour reads 01/05,
     never 01/12; the gate itself reads 00 */
  function tourPos(ts) {
    const g = ts.def && ts.def.stops && ts.def.stops[0] && ts.def.stops[0].gate ? 1 : 0;
    return { k: Math.max(0, ts.a.k + 1 - g), n: Math.max(1, ts.n - g) };
  }
  const tourDriving = () => { const a = ctx.tour && ctx.tour.active; return !!(a && a.id && (a.playing || a.enRoute)); };
  /* M3-b root cause: tour.js's own gotoTourStop() resolves resolveCaption()/ctx.go()/ctx.view.flyTo() over
     several awaits before it calls ctx.caption.type() for a stop — pause() deliberately does not cancel
     that in-flight chain (only freezes the hold), and a caller-initiated ctx.go() issued while the tour is
     ALREADY paused never bumps tour.js's own epoch either (its onStop guard only pauses+epoch-bumps a tour
     that is still playing). So a tour's stale entrance caption can land, uncancelled, on whatever room the
     visitor has since moved to. tourDriving() alone (raw playing/enRoute) cannot tell — a pause that lands
     mid-flight leaves enRoute stuck true for a beat, and playing/enRoute say nothing about WHICH room the
     tour actually meant the call for. The caption may defer to the tour only while it is actively driving
     AND its own current stop is the room actually on screen; used by pickCaption/captionType's callers
     below. Other tourDriving() call sites (camera-chip suffix, idle-hint readiness) are unrelated to which
     room and are left on the plain check. */
  function tourOwnsCaption() {
    const a = ctx.tour && ctx.tour.active;
    if (!a || !a.id || !(a.playing || a.enRoute)) return false;
    const def = tourDef(a.id), sd = def && def.stops ? def.stops[a.k] : null, cur = curStop();
    return !!(sd && cur && sd.room === cur.id);
  }
  /* K3 (W20, M4): ctx.tour.toggle()/isPlaying()/on('end'). Feature-detected so this ships against the
     current tour.js (play/pause/resume/active.playing only) and upgrades for free once M4 lands K3. */
  function tourIsPlayingNow() { const t = ctx.tour; if (!t) return false; return typeof t.isPlaying === 'function' ? !!t.isPlaying() : !!(t.active && t.active.playing); }
  function tourToggle() {
    const t = ctx.tour; if (!t) return;
    if (typeof t.toggle === 'function') { t.toggle(); return; }
    if (!t.active || !t.active.id) { t.play('grand', (t.active && t.active.k) || 0); return; }
    if (t.active.playing) t.pause('manual'); else t.resume();
  }
  /* K5 (W45, INTEGRATION): ctx.audio.state() -> 'off'|'arming'|'on'|'muted'. Falls back to the current
     shell's two booleans (A.on / A.muted); 'arming' only appears once the shell reports it. */
  function audioState() {
    const A = ctx.audio || {};
    if (typeof A.state === 'function') { try { return A.state(); } catch (e) {} }
    return A.muted ? 'muted' : A.on ? 'on' : 'off';
  }
  function sideParent(cur) {
    const all = ctx.stops || [];
    for (let j = all.findIndex((s) => s.i === cur.i) - 1; j >= 0; j--) if (!all[j].side) return all[j];
    return walkStops()[0] || null;
  }

  /* ---------------------------------------------------------------- idle-fade (§1.12) */
  let lastInput = now(), idleHold = new Set(), capReadUntil = 0;
  /* W07 accept: "chrome wakes on any input within 1 frame" — idleTick() only polls every 220ms, which would
     leave the fade up to that stale; wake() also clears the class synchronously, in the same event, so the
     poll only ever needs to confirm it (or re-apply it once the read-time/hover guards say otherwise). */
  function wake() { lastInput = now(); if (html.classList.contains('atlas-idle')) { html.classList.remove('atlas-idle'); idleAPI.faded = false; } }
  ['pointerdown', 'keydown', 'wheel'].forEach((t) => addEventListener(t, wake, { passive: true, capture: true }));
  /* hover/focus are read live via :hover and document.activeElement rather than tracked through
     pointerenter/pointerleave/focusin/focusout: the hide<->show swap (two elements at the same screen spot,
     one appearing as the other disappears mid-click) does not reliably fire a matching leave event across
     browsers when the hovered element is hidden out from under a stationary pointer, which pinned this
     flag `true` forever the first time it was tried. */
  function infoHovered() {
    try { const bar = doc.querySelector('.atlas-topbar'); return info.matches(':hover') || show.matches(':hover') || !!(bar && bar.matches(':hover')); } catch (e) { return false; }
  }
  function infoFocused() { return info.contains(doc.activeElement) || doc.activeElement === show; }
  function panelOpen() {
    if (ctx.label && ctx.label.isOpen) return true;
    return !!doc.querySelector('dialog[open], [role="dialog"][aria-modal="true"]:not(#atlas-info)');
  }
  function idleTick() {
    const t = now(), tourOn = !!(ctx.tour && ctx.tour.active && ctx.tour.active.playing);
    const threshold = 3500 * (tourOn ? 0.7 : 1.4);
    const idle = !KIOSK && !idleHold.size && !infoHovered() && !infoFocused() && !panelOpen() && t > capReadUntil && (t - lastInput) > threshold;
    html.classList.toggle('atlas-idle', idle);
    idleAPI.faded = idle;
  }
  setInterval(idleTick, 220);
  const idleAPI = {
    wake() { wake(); },
    hold(key, on) { if (on) idleHold.add(key); else idleHold.delete(key); },
    faded: false,
  };
  ctx.idle = idleAPI;

  /* ---------------------------------------------------------------- caption (ctx.caption, §1.12)
     the text is laid out invisibly first (.ai-cap-ghost) and typed over it, so the card takes its final height once per
     caption instead of growing a line at a time (which walked the wall text down the page while typing).
     VERIFY r3 P1: the compact phone card used to cap the caption at two lines and scroll the typed layer after the
     cursor, so every stop opened mid-sentence. now it shows whole sentences, from the first, that fit three lines (a
     first sentence longer than that is cut at a clause, else a word, with " …"); the typed layer never scrolls. ▾ marks
     a cut, a tap on the caption opens the rest in place (▴ closes it), and `more ▾` shows it whole with the card.
     capText: what the caption says here (an off-tour caption minus the sentences the visible wall already says);
     capFull: what is announced and printed; capShown: what is on screen. */
  const readTime = (t) => 1500 + ((t || '').length + 40) * 28;
  const CAP_LINES = 2; /* W06 §0.2: the phone caption is capped at two lines now (was three) */
  const WALL_MIN_LAND = 112; /* round-2 item 2: guaranteed wall room in short landscape, see layoutInfo() */
  let capToken = 0, lastStopT = 0, capSaid = true, capTyping = false, capOpen = false, capDoneAt = 0;
  let capText = '', capFull = '', capShown = '';
  let capCycling = false; /* round-2 item 3: the hands-off multi-chunk carousel (typeChunks) is mid-run */
  const capCompact = () => lessOn && compactVP();
  function sayLater(text, myToken) {
    /* after the stop's own "stop k of n, name" announcement (§2.2, 800 ms after arrival), never before it; once per caption */
    const wait = Math.max(0, lastStopT + 1200 - now());
    const go = () => { if (myToken === capToken && !capSaid) { capSaid = true; try { ctx.say(text); } catch (e) {} } };
    if (wait > 0) setTimeout(go, wait); else go();
  }
  /* sentence ends: . ? ! before a space or the end (closing quotes/brackets ride along), never a decimal point and
     never inside ( ) or [ ], so "1.05 [1.03, 1.08]." stays one piece */
  function sentences(t) {
    const out = []; let s = 0, depth = 0;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (ch === '(' || ch === '[') depth++;
      else if ((ch === ')' || ch === ']') && depth > 0) depth--;
      else if (!depth && (ch === '.' || ch === '?' || ch === '!')) {
        let j = i + 1; while (j < t.length && /[)\]"'’”]/.test(t[j])) j++;
        if (j === t.length || /\s/.test(t[j])) { const p = t.slice(s, j).trim(); if (p) out.push(p); s = j; i = j - 1; }
      }
    }
    const rest = t.slice(s).trim(); if (rest) out.push(rest);
    return out;
  }
  /* where a sentence too long for the card may stop: after a clause (, ; : — –), else between words; never inside
     brackets. latest first. */
  function cutPoints(t, clause) {
    const out = []; let depth = 0;
    for (let i = 1; i < t.length; i++) {
      const ch = t[i];
      if (ch === '(' || ch === '[') depth++;
      else if ((ch === ')' || ch === ']') && depth > 0) depth--;
      else if (!depth && (clause ? /[,;:—–]/.test(ch) && /\s/.test(t[i + 1] || '') : /\s/.test(ch) && !/\s/.test(t[i - 1]))) out.push(i);
    }
    return out.reverse();
  }
  /* lines the ghost takes for `t` (with the ▾ it would carry): its line boxes, read from the inline span's fragments.
     #atlas-info hidden (`hide`) has no boxes, so the count falls back to the card's width in mono characters. */
  function capLinesOf(t, cut) {
    capG.textContent = t; capEl.classList.toggle('ai-cap-cut', !!cut);
    const rs = capG.getClientRects();
    if (!rs.length) { const cpl = Math.max(16, Math.floor((innerWidth - 45) / 7.2)); return Math.ceil((t.length + (cut ? 3 : 1)) / cpl); }
    const tops = [...rs].map((r) => r.top).sort((a, b) => a - b);
    let n = 1; for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > 4) n++;
    return n;
  }
  function fitCaption(t) {
    if (!t || capOpen || !capCompact()) return t;
    if (capLinesOf(t, false) <= CAP_LINES) return t;
    const S = sentences(t);
    let best = '';
    for (let i = 1; i < S.length; i++) { const c = S.slice(0, i).join(' '); if (capLinesOf(c, true) <= CAP_LINES) best = c; else break; }
    if (best) return best;
    const first = S[0] || t;
    for (const i of cutPoints(first, true)) { const c = first.slice(0, i).replace(/\s+$/, '') + ' …'; if (capLinesOf(c, true) <= CAP_LINES) return c; }
    for (const i of cutPoints(first, false)) { const c = first.slice(0, i).replace(/[,;:\s]+$/, '') + ' …'; if (capLinesOf(c, true) <= CAP_LINES) return c; }
    /* last resort (an implausibly long first word/clause): still end on a word boundary if the 24-char window
       has one, rather than a hard slice that can land mid-word */
    const hardCap = first.slice(0, 24), lastSp = hardCap.lastIndexOf(' ');
    return (lastSp > 8 ? hardCap.slice(0, lastSp) : hardCap).replace(/[,;:\s]+$/, '') + ' …';
  }
  /* round-2 item 3 (R2_VERIFY_2_beauty P1-1): fitCaption above cuts to the FIRST piece that fits and stops
     there — a hands-off phone visitor never saw anything past it (six of twelve grand-tour stops lost their
     payoff sentence). capChunksOf splits the WHOLE text into a sequence of such pieces instead of just the
     first, grouping whole sentences greedily (never breaking mid-sentence unless one sentence alone is
     longer than the card, in which case splitLong breaks it at word boundaries). typeChunks (below) then
     types each piece in turn, holding readTime(piece) between them, so a passive visitor sees all of it. */
  function capChunksOf(text) {
    const S = sentences(text);
    if (!S.length) return [text];
    const fits = (s) => capLinesOf(s, false) <= CAP_LINES;
    const chunks = []; let cur = '';
    for (const s of S) {
      const piece = cur ? cur + ' ' + s : s;
      if (fits(piece)) { cur = piece; continue; }
      if (cur) { chunks.push(cur); cur = ''; }
      if (fits(s)) { cur = s; continue; }
      for (const part of splitLong(s, fits)) chunks.push(part);
    }
    if (cur) chunks.push(cur);
    return chunks.length ? chunks : [text];
  }
  /* a single sentence too long for even one chunk: break forward at word boundaries (never mid-word); no
     "…" — nothing here is actually cut away, it is simply the next chunk */
  function splitLong(s, fits) {
    const out = []; let rest = s.trim(), guard = 0;
    while (rest && !fits(rest) && guard++ < 12) {
      const words = rest.split(' ');
      let acc = '', taken = 0;
      for (let i = 0; i < words.length; i++) {
        const test = acc ? acc + ' ' + words[i] : words[i];
        if (fits(test)) { acc = test; taken = i + 1; } else break;
      }
      if (!taken) { acc = words[0]; taken = 1; } /* one implausibly long word alone: take it anyway */
      out.push(acc);
      rest = words.slice(taken).join(' ');
    }
    if (rest) out.push(rest);
    return out;
  }
  function capShow(shown) {
    capShown = shown;
    capG.textContent = shown; capEl.hidden = !shown; capLive.scrollTop = 0;
    capEl.classList.toggle('ai-cap-cut', !!shown && !capOpen && shown !== capText);
    capEl.classList.toggle('ai-cap-open', !!shown && capOpen);
  }
  /* round-2 item 3: display one chunk mid-carousel. `▾` (the .ai-cap-cut class) shows only on the LAST chunk —
     the earlier ones are already auto-advancing, a mark on each would just be noise. A tap at any point still
     opens the full text in place (the click handler below checks capShown!==capText, true for every chunk). */
  function capShowChunk(text, isLast) {
    capShown = text;
    capG.textContent = text; capEl.hidden = !text; capLive.scrollTop = 0;
    capEl.classList.toggle('ai-cap-cut', !!isLast);
    capEl.classList.remove('ai-cap-open');
  }
  /* R5 §4.2: capWords reveals a whole word per step (a glance never lands mid-word), paced so the overall rate is unchanged */
  let capWords = false;
  const nextCut = (t, i) => { if (!capWords) return i + 1; let j = i + 1; while (j < t.length && t[j] !== ' ') j++; return j; };
  function typeCharsInto(text, myToken, showCursor, cps) {
    capT.textContent = ''; cursorEl.hidden = !showCursor; capTyping = true; capEl.classList.add('ai-cap-typing');
    const delay = 1000 / cps;
    return new Promise((resolve) => {
      let i = 0;
      (function step() {
        if (myToken !== capToken) { resolve(false); return; }
        const j = nextCut(text, i), n = j - i; i = j; capT.textContent = text.slice(0, i);
        if (i >= text.length) { capTyping = false; capEl.classList.remove('ai-cap-typing'); resolve(true); return; }
        setTimeout(step, delay * n);
      })();
    });
  }
  /* holds until `until`, bailing out the moment this caption is superseded, opened by a tap, or the card
     leaves compact mode (a rotation to landscape, or `more`) — in every one of those cases something else
     already owns showing the text correctly, so the carousel simply stops rather than fighting it */
  function waitReadPause(until, myToken) {
    return new Promise((resolve) => {
      (function tick() {
        if (myToken !== capToken || capOpen || !capCompact()) { resolve(false); return; }
        const left = until - now();
        if (left <= 0) { resolve(true); return; }
        setTimeout(tick, Math.min(left, 200));
      })();
    });
  }
  /* the hands-off carousel itself: type a chunk, hold it for its own readTime, move to the next, down to the
     last — no loop. The returned promise resolves only once every chunk has been shown (so tour.js's own
     post-caption hold, sized from the FULL raw text's length, is pure extra margin on top of a guaranteed-
     complete read, not the only thing standing between a visitor and a cut-off story). */
  async function typeChunks(chunks, myToken, cps, showCursor) {
    capCycling = true;
    try {
      for (let idx = 0; idx < chunks.length; idx++) {
        if (myToken !== capToken || capOpen || !capCompact()) return;
        const isLast = idx === chunks.length - 1, chunk = chunks[idx];
        capShowChunk(chunk, isLast);
        /* set BEFORE typing starts (matching the single-shot path): readTime already covers the typing
           animation itself plus a reading buffer after, so idle-fade stays suppressed for the whole chunk,
           not just its post-typing pause */
        capReadUntil = now() + readTime(chunk);
        const ok = await typeCharsInto(chunk, myToken, showCursor, cps);
        if (!ok) return;
        if (idx === 0) sayLater(capFull, myToken); /* announced once, in full, regardless of what is on screen */
        const proceed = await waitReadPause(capReadUntil, myToken);
        if (!proceed) return;
      }
      stopTyping();
    } finally { capCycling = false; }
  }
  /* lay the current capText out for this card (measured with the caption displayed); returns what goes on screen */
  function layoutCap() {
    capEl.hidden = !capText;
    const shown = fitCaption(capText);
    capShow(shown);
    return shown;
  }
  function stopTyping() { capTyping = false; capEl.classList.remove('ai-cap-typing'); capDoneAt = now(); }
  /* M3-b bullet 2: a pause mid-character (the single-shot desktop path, or a chunk of the phone carousel)
     used to leave the caption showing whatever partial string the last setTimeout tick had reached
     ("…seven years a_") until either the same caption finished on its own schedule or a new one started —
     which, off-tour, might not happen for a while. Pausing now completes the CURRENT shown chunk/sentence
     immediately: bumping capToken is what actually stops the in-flight step()/typeChunks loop (both check
     it every tick), the rest just paints the finished text and fires the one announcement that loop would
     otherwise have made itself. */
  function capFinishOnPause() {
    if (!capTyping) return;
    capToken++; capT.textContent = capShown; cursorEl.hidden = true; stopTyping();
    if (capFull) sayLater(capFull, capToken);
  }
  /* R7 voice: a first-person sentence with few numbers is the person and sets serif italic (chrome.css .ai-voice-p);
     number lines, keys and formulas stay the machine's mono */
  const VOICE_RE = /(^|[\s("'\u2018\u201c])(i|my|me|mine|i\u2019m|i'm|i\u2019ve|i've|i\u2019d|i'd|you|your)\b/i;
  /* a person's line written without a pronoun (the clock: tours.js says "my whole log folded..." elsewhere) */
  const VOICE_ALSO = /^the whole log folded onto one day/;
  const isVoice = (t) => !!t && (VOICE_RE.test(t) || VOICE_ALSO.test(t)) && !/[=\u00f7\u2192]/.test(t);
  const voiceCap = (t) => { capEl.classList.toggle('ai-voice-p', isVoice(t)); };
  function captionSet(text, full) {
    capToken++; stopTyping(); text = text || ''; capWords = false;
    capText = text; capFull = full != null ? full : text; capOpen = false; capSaid = true;
    voiceCap(capFull);
    const shown = layoutCap(); capT.textContent = shown; cursorEl.hidden = true; syncPrintCaption(capFull);
  }
  function captionClear() { captionSet(''); }
  function captionType(text, opts) {
    const o = opts || {}, showCursor = o.cursor !== false, cps = o.cps || 55; /* W14: default typing speed 55 cps (was 36) */
    capWords = !!o.words;
    capToken++; const myToken = capToken; text = text || '';
    stopTyping(); capText = text; capFull = o.full != null ? o.full : text; capOpen = false; capSaid = !capFull;
    voiceCap(capFull);
    syncPrintCaption(capFull);
    capEl.hidden = !capText;
    if (!capText) { capT.textContent = ''; cursorEl.hidden = true; return Promise.resolve(); }
    if (reduced) {
      const shown = fitCaption(capText); capShow(shown); capT.textContent = shown; cursorEl.hidden = true;
      capReadUntil = now() + readTime(shown); sayLater(capFull, myToken); return Promise.resolve();
    }
    /* round-2 item 3: on the compact phone card, a caption longer than one cut piece runs the hands-off
       carousel (typeChunks) instead of the old single-cut-and-stop behaviour. A caption that already fits in
       CAP_LINES (chunks.length<=1, or desktop where capCompact() is always false) is unaffected — identical
       to the pre-round-2 single-shot path below. */
    const chunks = capCompact() ? capChunksOf(capText) : [capText];
    if (chunks.length > 1) return typeChunks(chunks, myToken, cps, showCursor);
    const shown = layoutCap();
    if (!shown) { capT.textContent = ''; cursorEl.hidden = true; if (capFull) sayLater(capFull, myToken); return Promise.resolve(); }
    capT.textContent = ''; cursorEl.hidden = !showCursor; capTyping = true; capEl.classList.add('ai-cap-typing');
    const delay = 1000 / cps;
    capReadUntil = now() + readTime(shown); /* the read-time formula already paces reading at the typing rate (28 ms a character) */
    return new Promise((resolve) => {
      let i = 0;
      (function step() {
        if (myToken !== capToken) { resolve(); return; }
        const j = nextCut(shown, i), n = j - i; i = j; capT.textContent = shown.slice(0, i);
        if (i >= shown.length) { stopTyping(); sayLater(capFull, myToken); resolve(); return; }
        setTimeout(step, delay * n);
      })();
    });
  }
  /* the card's size or `less` changed: lay the caption out again in place (never retyped; a caption still typing keeps
     its target and the next one fits the new card) */
  function capRefit() {
    /* round-2 item 3: capCycling too — a resize/less-toggle mid-carousel must not flash the old single-cut
       layout over whatever chunk is currently mid-pause; the carousel's own loop already re-checks
       capCompact() at every step and will stop itself cleanly (or keep going) as appropriate */
    if (!capText || capTyping || capCycling) return;
    if (!capCompact()) capOpen = false;
    const shown = layoutCap();
    if (capT.textContent !== shown) capT.textContent = shown;
  }
  /* tap the caption: the rest opens in place, a second tap closes it (compact card only; `more ▾` is the keyboard path) */
  capEl.addEventListener('click', () => {
    if (!capCompact() || (!capOpen && capShown === capText)) return;
    capOpen = !capOpen;
    if (capTyping) { capToken++; stopTyping(); sayLater(capFull, capToken); }
    const shown = layoutCap(); capT.textContent = shown;
    if (capOpen) capReadUntil = now() + readTime(shown);
  });
  /* anything outside this file typing a caption (the tour engine) supersedes an off-tour caption still resolving
     — UNLESS the tour itself is stale (M3-b: tourOwnsCaption() false), in which case the call is redirected to
     this room's own off-tour caption instead of painting whatever the tour meant for a room the visitor has
     since left. */
  let capSeq = 0, capKey = null, capOffRaw = null;
  ctx.caption = {
    type(text, opts) {
      if (!tourOwnsCaption()) return refreshCaption(true);
      capSeq++; capKey = null; capOffRaw = null; markDup('');
      /* R5 §4.2 caption speed: the active tour's capSpeed multiplies the typing rate, capWords types whole words */
      const def = tourDef(ctx.tour.active.id), o = Object.assign({}, opts);
      if (def && def.capSpeed > 0 && !o.cps) o.cps = 55 * def.capSpeed;
      if (def && def.capWords) o.words = true;
      return captionType(text, o);
    },
    set(text) {
      if (!tourOwnsCaption()) { refreshCaption(true); return; }
      capSeq++; capKey = null; capOffRaw = null; markDup(''); captionSet(text);
    },
    clear() {
      if (!tourOwnsCaption()) { refreshCaption(true); return; }
      capSeq++; capKey = null; capOffRaw = null; markDup(''); captionClear();
    },
  };

  /* off-tour captions (VERIFY r1: every stop reached by ctx.go showed a bare cursor): the grand tour's caption for
     this room and angle, with the same tokens resolved; else the room's first wall line; else its stop name. */
  const GRAND = tourDef('grand');
  function stopDayMatches(sd) {
    const u = ctx.peek && ctx.peek('universe');
    if (!u || !u.time || !u.time.at) return false;
    const want = sd.day === '{median_day}' ? u.medianDay : sd.day;
    return !!want && u.time.at === want;
  }
  function pickCaption(cur, angleId) {
    let first = null;
    for (const sd of (GRAND && GRAND.stops) || []) {
      if (sd.room !== cur.id) continue;
      if (!first) first = sd;
      if (sd.angle === angleId) return sd.caption;
      for (const t of sd.then || []) {
        const id = typeof t === 'string' ? t : t.angle;
        if (id !== angleId) continue;
        /* an angle caption tied to the stop's own day (the universe's median day) is only true on that day */
        if (t && typeof t === 'object' && t.caption && (!sd.day || stopDayMatches(sd))) return t.caption;
        return sd.caption;
      }
    }
    /* TOURS3: an angle the grand tour no longer visits (map ghost, listeners fade) keeps its own true caption from
       whichever tour still does, instead of the grand stop's caption describing a different picture */
    for (const t of TOURS) for (const sd of (t && t.stops) || []) {
      if (sd.room !== cur.id) continue;
      if (sd.angle === angleId && sd.caption) return sd.caption;
      for (const th of sd.then || []) if (th && typeof th === 'object' && th.angle === angleId && th.caption && (!sd.day || stopDayMatches(sd))) return th.caption;
    }
    return first ? first.caption : null;
  }
  const perDot = () => (P && P.perDot) || 1;
  async function resolveLocal(raw) {
    let t = raw.replace(/\{per_dot\}/g, perDot() === 1 ? '' : ' (on this screen one dot is four plays)')
      .replace(/\{every_dot\}/g, perDot() === 1 ? 'every play is a dot' : 'every fourth play is a dot on this screen')
      .replace(/\{one_play\}/g, perDot() === 1 ? 'one play' : 'four plays');
    if (/\{named\}|\{play_share\}/.test(t)) {
      let nodes = null; try { nodes = await ctx.data('universe_nodes'); } catch (e) {}
      const named = nodes && nodes.nodes ? nodes.nodes.length : 0;
      if (!named) return null;
      t = t.replace(/\{named\}/g, String(named)).replace(/\{play_share\}/g, String(Math.round(100 * (nodes.named_play_share || 0))));
    }
    return /\{[a-z_]+\}/.test(t) ? null : t; /* never type a hole (§4.2) */
  }
  function resolveCaption(raw) {
    const r = ctx.tour && typeof ctx.tour.resolveCaption === 'function' ? ctx.tour.resolveCaption : resolveLocal;
    return Promise.resolve(r(raw)).catch(() => null);
  }
  function wallLine(cur) {
    const el = doc.querySelector('section[data-room="' + cur.id + '"] .wall .say:not(.dim)');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  /* VERIFY r3 P1: off-tour, the caption is the grand tour's line for this room, which mostly opens with the wall's own
     first sentence (threshold, make and yours say it word for word; calendar, game, clock, graveyard and the universe
     open with it), so the column said the same sentence twice. the wall is what is read here, so a caption whose first
     60 characters are on the visible wall is not shown at all, and any other caption sentence the visible wall already
     says (60% or more of its word pairs) is dropped; what is left is new (a count, a rate). only text the visitor can
     see counts: the compact phone card keeps its wall lines for screen readers only, so its caption stays whole. the
     whole caption is still announced once, and printed. */
  const normTxt = (s) => (s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const words = (s) => s.match(/[a-z0-9%]+(?:[.,'][a-z0-9%]+)*/g) || [];
  const pairs = (w) => { const o = []; for (let i = 1; i < w.length; i++) o.push(w[i - 1] + ' ' + w[i]); return o; };
  const REPEAT = 0.6;
  function wallShownText() {
    const wall = activeWall(); if (!wall) return '';
    const out = [], tw = doc.createTreeWalker(wall, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const p = n.parentElement; if (!p || !n.nodeValue.trim() || p.closest('.ai-print-cap') || inClosedDetails(p, wall)) continue;
      const r = p.getBoundingClientRect(); if (r.width < 3 || r.height < 3) continue; /* display:none, or the 1px screen-reader clip */
      if (getComputedStyle(p).visibility === 'hidden') continue;
      out.push(n.nodeValue);
    }
    return normTxt(out.join(' '));
  }
  /* a closed <details> keeps real boxes for its content in some engines (content-visibility), so it is checked by hand */
  function inClosedDetails(el, stop) {
    for (let e = el; e && e !== stop; e = e.parentElement) {
      if (e.tagName === 'SUMMARY') return false;
      const d = e.parentElement; if (d && d.tagName === 'DETAILS' && !d.open && e.tagName !== 'SUMMARY') return true;
    }
    return false;
  }
  function dedupe(text) {
    const W = wallShownText(); if (!W || !text) return text;
    if (W.includes(normTxt(text).slice(0, 60))) return '';
    const wp = new Set(pairs(words(W)));
    return sentences(text).filter((s) => { const p = pairs(words(normTxt(s))); return !p.length || p.filter((x) => wp.has(x)).length / p.length < REPEAT; }).join(' ');
  }
  function markDup(shown) {
    const d = capOffRaw == null ? '' : !shown ? 'all' : shown !== capOffRaw ? 'part' : '';
    if (d) capEl.dataset.dup = d; else delete capEl.dataset.dup;
  }
  /* the visible wall changed (`less`, a rotation, an angle that keeps its caption, or the room filling its wall after it
     mounted, e.g. the universe's chip line once its layout lands): the off-tour caption is measured again. set in
     place; one still typing starts again on its new text. */
  function recheckDup() {
    if (capOffRaw == null || tourOwnsCaption()) return;
    const t = dedupe(capOffRaw);
    if (t !== capText) { if (capTyping) captionType(t, { cursor: !reduced, full: capOffRaw }); else captionSet(t, capOffRaw); }
    markDup(t);
  }
  async function refreshCaption(force, recheck) {
    const cur = curStop(); if (!cur) return;
    const a = ctx.angle && ctx.angle.get ? ctx.angle.get() : { id: 'main' };
    const raw = pickCaption(cur, a.id), key = cur.id + '|' + (raw || '');
    if (!force && key === capKey) { if (recheck) recheckDup(); return; }
    capKey = key; const my = ++capSeq; capOffRaw = null;
    let text = raw ? await resolveCaption(raw) : null;
    if (my !== capSeq || tourOwnsCaption()) return;
    /* the wall is whole only once its room has mounted (the universe builds its chip line then), so a first visit waits
       for that, with the last room's caption taken down meanwhile */
    const room = deps.rooms && deps.rooms[cur.i];
    if (room && !room.mounted) {
      capOffRaw = null; markDup(''); captionSet('');
      const t0 = now();
      await new Promise((res) => { (function poll() { if (room.mounted || my !== capSeq || now() - t0 > 4000) res(); else setTimeout(poll, 60); })(); });
      if (my !== capSeq || tourOwnsCaption()) return;
    }
    if (text == null) text = wallLine(cur) || (ctx.roomSay ? ctx.roomSay(cur.i) : cur.name);
    capOffRaw = text;
    const shown = dedupe(text);
    captionType(shown, { cursor: !reduced, full: text });
    markDup(shown);
  }

  /* a print-only mirror of the caption lives inside the active .wall, since #atlas-info itself is display:none in print */
  let printCapEl = null;
  function syncPrintCaption(text) {
    const wall = activeWall(); if (!wall) return;
    if (!printCapEl || printCapEl.parentNode !== wall) { printCapEl = wall.querySelector('.ai-print-cap'); if (!printCapEl) { printCapEl = doc.createElement('p'); printCapEl.className = 'ai-print-cap'; wall.appendChild(printCapEl); } }
    printCapEl.textContent = text;
  }

  /* ---------------------------------------------------------------- hud / lock (fnService slots) */
  function hud(text) {
    if (text == null) { hudEl.hidden = true; hudEl.textContent = ''; }
    else { hudEl.hidden = false; hudEl.textContent = text; }
    updatePhoneSlot();
  }
  ctx.hud = hud;

  let lockLabel = null;
  function lock(label) { lockLabel = label || null; renderCamChip(); }
  ctx.lock = lock;

  /* ---------------------------------------------------------------- the bottom line and the toast: where they sit
     landscape: one unboxed line in the band under the stage, centred on the stage (never over the wall column, the
     stage or the room's controls). portrait: an opaque line just above #atlas-info. either one steps up over a room's
     bottom control panel (its keepout rects), never on top of it. */
  function isPortrait() { return matchMedia('(max-aspect-ratio:115/100)').matches; }
  function lineSpot() {
    if (isPortrait()) {
      const r = info.getBoundingClientRect();
      const topRef = html.classList.contains('atlas-hidden') ? innerHeight - (parseFloat(show.style.bottom) || 160) - 44 : r.top;
      return { cx: Math.round(innerWidth / 2), bottom: Math.round(innerHeight - topRef + 8), maxW: innerWidth - 32 };
    }
    let s = null; try { s = deps.stage ? deps.stage() : null; } catch (e) {}
    if (!s) return { cx: Math.round(innerWidth / 2), bottom: 22, maxW: innerWidth - 40 };
    return { cx: Math.round(s.x + s.w / 2), bottom: 22, maxW: Math.max(240, Math.round(s.w)), band: innerHeight - (s.y + s.h) };
  }
  function keepRects() {
    const out = [];
    const sec = doc.querySelector('section[data-room].is-active');
    if (sec) sec.querySelectorAll('[data-keepout]').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width && r.height) out.push(r); });
    try {
      const r = deps.rooms && deps.rooms[ctx.index], mod = r && r.mod;
      if (mod && typeof mod.keepout === 'function') (mod.keepout(ctx) || []).forEach((k) => out.push({ left: k.x, top: k.y, right: k.x + k.w, bottom: k.y + k.h }));
    } catch (e) {}
    return out;
  }
  function place(el) {
    const sp = lineSpot();
    if (el === toastEl && sp.band != null) sp.maxW = Math.min(sp.maxW, 620);
    el.style.left = sp.cx + 'px'; el.style.maxWidth = sp.maxW + 'px';
    /* R7B: upright, the hint sits in the card's band over the caption, never above the card on the room's labels */
    if (el === toastEl && isPortrait() && !html.classList.contains('atlas-hidden')) {
      const it = info.getBoundingClientRect().top, eh = el.offsetHeight, mt = mrow.getBoundingClientRect().top || innerHeight;
      const tp = Math.max(0, Math.min(Math.max(it, mt - eh), innerHeight - dockH - 4 - eh));
      el.style.bottom = Math.round(innerHeight - tp - eh) + 'px'; return;
    }
    let bottom = sp.bottom;
    /* upright, a keepout that runs down into the card itself is a room reserving room for the chrome to move into
       (universe: its card grows), not something drawn on the stage; only keepouts inside the stage push the line up */
    const portrait = isPortrait(), infoTop = portrait ? info.getBoundingClientRect().top : Infinity;
    const w = el.offsetWidth, h = el.offsetHeight, L = sp.cx - w / 2, R = sp.cx + w / 2;
    const keeps = keepRects().filter((k) => !(portrait && k.bottom >= infoTop - 1));
    /* a short landscape band (a phone held sideways: 56px) seats a two-line line lower, so it stays under the stage */
    if (sp.band != null) bottom = clamp(Math.round(sp.band - h - 4), 6, bottom);
    for (let guard = 0; guard < 4; guard++) {
      const Bt = innerHeight - bottom, Tp = Bt - h;
      const hit = keeps.filter((k) => k.left < R && k.right > L && k.top < Bt && k.bottom > Tp);
      if (!hit.length) break;
      bottom = Math.round(innerHeight - Math.min(...hit.map((k) => k.top)) + 8);
    }
    const topLimit = (topBar ? topBar.getBoundingClientRect().bottom : 64) + 4;
    el.style.bottom = Math.max(0, Math.min(bottom, Math.round(innerHeight - topLimit - h))) + 'px';
  }

  let toastT = 0;
  function hideToast() { clearTimeout(toastT); toastEl.classList.remove('on'); html.classList.remove('ai-toast-on'); }
  function toast(text, ms) {
    clearTimeout(toastT); toastEl.textContent = text || ''; toastEl.classList.toggle('ai-voice-p', isVoice(text));
    place(toastEl);
    toastEl.classList.add('on'); html.classList.add('ai-toast-on');
    toastT = setTimeout(hideToast, ms == null ? 2600 : ms);
  }
  ctx.toast = toast;

  /* ---------------------------------------------------------------- stepper: a tracklist row + the queue's name (R6 M1)
     on a tour `02 / 16  the log` beside `the long play ▾`, off one `08  the universe`; the merged phone row mirrors it */
  function stepLabel() {
    const ts = tourState(), cur = curStop(), nm = cur ? cur.name : '';
    if (ts && ts.here) return { stop: two(tourPos(ts).k) + ' / ' + two(tourPos(ts).n) + '  ' + nm, chip: ts.def ? ts.def.name : ts.a.id, onTour: true };
    if (cur && cur.side) return { stop: T.sideRoom + ' · ' + nm, chip: LP, onTour: false };
    const w = walkStops(), pos = cur ? w.findIndex((s) => s.i === cur.i) : -1;
    return { stop: two(pos < 0 ? 1 : pos + 1) + '  ' + nm, chip: LP, onTour: false };
  }
  /* the camera-state suffix ("FREE CAMERA"/"LOCKED ON · x") appended off-tour, never on one (W11) */
  function camSuffix() {
    if (tourDriving()) return '';
    const st = (ctx.view && ctx.view.state) || 'home';
    if (st === 'locked' && lockLabel) return ' · ' + T.lockedOn + ' · ' + lockLabel;
    if (st === 'free') return ' · ' + T.freeCamera;
    return '';
  }
  /* round-2 (W-fix7): the phone merged row used to mirror the desktop "STOP 03 / 07 · 90 SECONDS ▾" string
     verbatim — on a 390px row that is all number and tour-name, no room name, and the widest tour names (e.g.
     "90 SECONDS") forced an ellipsis. It now reads "03/07 ▾ · <room name>" on tour (the tour's own name moves
     into the ▾ sheet the label already opens) and "<n> · <room name>" off tour — always the one piece of
     information the row didn't have room for before: which room this is. Desktop's own stopText/tourChipT are
     untouched (W08's precision gate). */
  /* M3-c: at <=400px (every real phone in portrait; a wider portrait device, e.g. a tablet, keeps the glyphs
     since it has the room) the "▾ · " between the stop count and the room name was often the difference
     between fitting and an ellipsis mid-name ("THE RULER CHANG…") — the row is tappable as a whole regardless
     (aria-haspopup carries the affordance), so the glyph is decorative there, not load-bearing. */
  function phoneStopLabel(s, ts, cur) {
    const nm = cur ? cur.name : '';
    const roomy = innerWidth > 400;
    if (s.onTour && ts && ts.a) return two(tourPos(ts).k) + '/' + two(tourPos(ts).n) + (roomy ? ' ▾  ' : '  ') + nm;
    if (cur && cur.side) return nm;
    const w = walkStops(), pos = cur ? w.findIndex((x) => x.i === cur.i) : -1;
    return two(pos < 0 ? 1 : pos + 1) + '  ' + nm + camSuffix();
  }
  function renderStop() {
    const s = stepLabel(), ts = tourState(), cur = curStop();
    stopText.textContent = s.stop;
    tourChipT.textContent = s.chip;
    mrowT.textContent = phoneStopLabel(s, ts, cur);
    /* round-2 item 4: the desktop title — the same name the phone row carries, on or off a tour (K3's
       tour state changes the STOP prefix/chip, never this) */
    const tn = cur ? cur.name.toUpperCase() : '';
    if (titleEl.textContent !== tn) titleEl.textContent = tn;
  }
  function openToursPanel() {
    const p = ctx.atlas && ctx.atlas.panels;
    if (p && typeof p.open === 'function') { p.open('tours'); return; }
    if (p && p.tours && typeof p.tours.open === 'function') { p.tours.open(); return; }
    toast('tours menu is not ready yet');
  }
  tourChip.addEventListener('click', openToursPanel);
  mrowLabel.addEventListener('click', openToursPanel);

  function renderCamChip() {
    const st = (ctx.view && ctx.view.state) || 'home';
    /* W11: on a tour the chip must never say LOCKED ON in place of the tour name */
    if (tourDriving()) { camChip.hidden = true; camChip.textContent = ''; delete camChip.dataset.state; row1.classList.remove('ai-cam-on'); renderStop(); return; }
    if (st === 'locked' && lockLabel) { camChip.hidden = false; camChip.dataset.state = 'locked'; camChip.textContent = T.lockedOn + ' · ' + lockLabel; }
    else if (st === 'free') { camChip.hidden = false; camChip.dataset.state = 'free'; camChip.textContent = T.freeCamera; }
    else { camChip.hidden = true; camChip.textContent = ''; delete camChip.dataset.state; }
    row1.classList.toggle('ai-cam-on', !camChip.hidden);
    renderStop(); /* keeps the phone merged row's camera suffix in sync */
  }
  /* ---------------------------------------------------------------- W09: play/pause, desktop (#top) + phone (merged row) */
  function renderPlay() {
    const playing = tourIsPlayingNow();
    const label = playing ? T.pauseTour : T.playTour;
    if (topPlay.textContent !== label) topPlay.textContent = label;
    topPlay.setAttribute('aria-pressed', String(playing));
    mplayI.innerHTML = playing ? '&#8214;' : '&#9654;';
    mplay.setAttribute('aria-pressed', String(playing));
    mplay.setAttribute('aria-label', playing ? 'pause tour' : 'play tour');
  }
  topPlay.addEventListener('click', () => { tourToggle(); renderPlay(); });
  mplay.addEventListener('click', () => { tourToggle(); renderPlay(); });

  let lastViewState = null, pulseT = 0;
  function pollView() {
    const st = (ctx.view && ctx.view.state) || 'home';
    if (st !== lastViewState) {
      if (st === 'free' && !reduced) { camChip.classList.remove('ai-pulse'); void camChip.offsetWidth; camChip.classList.add('ai-pulse'); clearTimeout(pulseT); pulseT = setTimeout(() => camChip.classList.remove('ai-pulse'), 1300); }
      lastViewState = st; renderCamChip(); renderPill();
    }
  }

  /* ---------------------------------------------------------------- angle bar + en-route + pills
     R6 M2: the angles are bars of music, `bar 2 / 4  ▮▮▯▯`, one glyph an angle, played ones full. with the bed on, the
     current bar's glyph lands full on each downbeat and rests small between (ctx.audio.beat); sound off or reduced
     motion, it simply stays full. no beat is ever made up. */
  function beatGlyph() {
    if (reduced) return '▮';
    let b = null; try { b = ctx.audio && typeof ctx.audio.beat === 'function' ? ctx.audio.beat(0.25) : null; } catch (e) {}
    return !b || b.phase < 0.25 ? '▮' : '▪';
  }
  function angleBarText(n, k) {
    if (n <= 1) return '';
    let g = ''; for (let i = 0; i < n; i++) g += i < k ? '▮' : i === k ? beatGlyph() : '▯';
    return T.bar.replace('{k}', k + 1).replace('{n}', n) + '  ' + g;
  }
  const angleNow = () => (ctx.angle && ctx.angle.get ? ctx.angle.get() : { k: 0, n: 1 });
  /* W15: while a tour drives this stop, the bar is the TOUR's own angle count (K3 active.angleK/angleN — 1 +
     however many `then` angles this stop visits), never the room's full angle list, so a one-angle grand-tour
     stop (e.g. the threshold) reads "angle 1/1" instead of the room's own (possibly larger) angle count. */
  function angleDims(ts) {
    /* the tour's own angle count only while it drives; a paused tour re-anchored on this room (a jump) keeps angleN at 1 and hid the room's angle row (T2 kept-bug 1) */
    if (ts && ts.here && ts.a && (ts.a.playing || ts.a.enRoute)) { const a = ts.a; return { n: a.angleN || 1, k: a.angleK || 0, hold: typeof a.holding === 'number' ? a.holding : 0 }; }
    const a = angleNow(); return { n: a.n, k: a.k, hold: null };
  }
  let enRouteT = 0, enRouteDots = 1, freeEnRoute = false;
  function setEnRouteUI(on) {
    angleRow.hidden = !on && angleNow().n <= 1;
    anglePrev.hidden = angleNext.hidden = on || angleNow().n <= 1;
    if (on) {
      angleRow.hidden = false;
      angleBar.classList.add('ai-enroute');
      if (reduced) { if (enRouteT) { clearInterval(enRouteT); enRouteT = 0; } angleBar.textContent = T.enRoute; }
      else if (!enRouteT) { enRouteDots = 1; angleBar.textContent = T.enRoute + ' ' + '>'.repeat(enRouteDots); enRouteT = setInterval(() => { enRouteDots = (enRouteDots % 3) + 1; angleBar.textContent = T.enRoute + ' ' + '>'.repeat(enRouteDots); }, 250); }
    } else if (enRouteT) { clearInterval(enRouteT); enRouteT = 0; }
    angleBar.classList.toggle('ai-enroute', on);
  }
  function renderAngle() {
    const ta = ctx.tour && ctx.tour.active;
    const tourEnRoute = !!(ta && ta.id && ta.enRoute);
    if (tourEnRoute) { freeEnRoute = false; setEnRouteUI(true); }
    else if (!freeEnRoute) {
      const d = angleDims(tourState());
      setEnRouteUI(false);
      angleRow.hidden = d.n <= 1;
      angleBar.textContent = angleBarText(d.n, d.k);
      anglePrev.hidden = angleNext.hidden = d.n <= 1;
    }
    renderPill();
  }
  /* the hold advances every frame without a tour onChange; a text write only when a bar character changes (no layout
     read). W19: off a tour, any camera flight (K6, `ctx.view.flight`) that turns out to last >= 0.8s also earns
     "en route >>>" here — the same slot search/ladder/label-tap flights already share with the tour's own. */
  function barTick() {
    const ta = ctx.tour && ctx.tour.active;
    if (ta && ta.id && (ta.playing || ta.enRoute)) {
      if (freeEnRoute) freeEnRoute = false;
      if (ta.enRoute) return;
      const d = angleDims(tourState()); if (d.n <= 1) return;
      const txt = angleBarText(d.n, d.k);
      if (txt !== angleBar.textContent) angleBar.textContent = txt;
      return;
    }
    const f = ctx.view && ctx.view.flight;
    const show = !!(f && f.dur >= 0.8 && f.u < 1);
    if (show !== freeEnRoute) { freeEnRoute = show; if (show) setEnRouteUI(true); else { setEnRouteUI(false); renderAngle(); } }
    else if (!show && !angleRow.hidden) { const d = angleDims(tourState()), txt = angleBarText(d.n, d.k); if (txt && txt !== angleBar.textContent) angleBar.textContent = txt; }
  }
  anglePrev.addEventListener('click', () => { try { ctx.angle.prev(); } catch (e) {} });
  angleNext.addEventListener('click', () => { try { ctx.angle.next(); } catch (e) {} });

  function setPill(text, back, fn, shortText) {
    pillBtn.hidden = false; pillBtn.className = 'ai-pill' + (back ? ' ai-pill-back' : '');
    if (pillBtn.textContent !== text) pillBtn.textContent = text;
    pillBtn.onclick = () => { try { fn(); } catch (e) {} };
    /* W06: the phone merged row carries its own NEXT pill, kept byte-for-byte in sync rather than reparented,
       so desktop's DOM (and atlas_precision --mode=head) never changes shape. round-2 (W-fix7): its text is a
       short verb, not the full "next stop · <name> ›" desktop string — the destination is already the caption. */
    const mtext = shortText || (back ? T.mpillBack : T.mpillNext);
    mpillBtn.hidden = false; mpillBtn.className = 'ai-mpill' + (back ? ' ai-mpill-back' : '');
    if (mpillBtn.textContent !== mtext) mpillBtn.textContent = mtext;
    mpillBtn.onclick = () => { try { fn(); } catch (e) {} };
  }
  function renderPill() {
    const ts = tourState(), cur = curStop(), st = (ctx.view && ctx.view.state) || 'home';
    checkTourEnd(ts);
    if (ts && ts.def) {
      const { a, def, n } = ts;
      const ended = !a.playing && a.k >= n - 1 && (a.holding || 0) >= 1 && (a.angleK || 0) >= (a.angleN || 1) - 1;
      if (a.playing || a.enRoute || ended) {
        if (a.k >= n - 1) {
          /* round-2 (W-fix9): the end card already carries its own "start again" button — showing the pill's
             copy of it too was the literal duplicate the finding called out, so the pill steps aside while
             the card is up (it returns the moment the card is dismissed, `ended` still being true). */
          if (endShownFor) { pillBtn.hidden = true; mpillBtn.hidden = true; }
          else setPill(T.startAgain, false, () => ctx.tour.play(a.id, 0), T.mpillAgain);
        }
        else setPill(fillStop(T.nextStop, nameOf(def.stops[a.k + 1].room)), false, () => ctx.tour.next());
      } else setPill(fillStop(T.backToTour, nameOf(ts.sd ? ts.sd.room : cur && cur.id)), true, () => ctx.tour.resume());
      return;
    }
    if (st === 'locked' || st === 'free') { setPill(T.cameraHome, false, () => ctx.view.home(), T.mpillHome); return; }
    if (cur && cur.side) { const p = sideParent(cur); if (p) { setPill(fillStop(T.backTo, p.name), false, () => ctx.go(p.id, { via: 'key' }), T.mpillBack); return; } }
    const w = walkStops(), pos = cur ? w.findIndex((s) => s.i === cur.i) : -1;
    if (!w.length) { pillBtn.hidden = true; mpillBtn.hidden = true; return; }
    if (pos < 0 || pos >= w.length - 1) setPill(T.startAgain, false, () => ctx.go(w[0].id, { via: 'key' }), T.mpillAgain);
    else { const nx = w[pos + 1]; setPill(fillStop(T.nextStop, nx.name), false, () => ctx.go(nx.id, { via: 'key' })); }
  }

  /* ---------------------------------------------------------------- less / hide / show
     compact (lessOn, declared at the top) by default on every screen; on phones (upright, or held sideways, §2.3) the
     card itself also folds its rows and the caption (chrome.css) */
  function renderLessBtn() {
    const label = lessOn ? 'more' : 'less', mark = lessOn ? ' ▾' : ' ▴';
    lessBtn.innerHTML = label + '<span aria-hidden="true">' + mark + '</span>';
    lessBtn.setAttribute('aria-expanded', String(!lessOn));
    ovLess.innerHTML = label + '<span aria-hidden="true">' + mark + '</span>';
    ovLess.setAttribute('aria-expanded', String(!lessOn));
    html.classList.toggle('ai-less', lessOn);
  }
  /* the wall's visible text changes with `less`, so the off-tour caption's repeats are measured again */
  function toggleLess() { lessOn = !lessOn; renderLessBtn(); recheckDup(); capRefit(); }
  lessBtn.addEventListener('click', toggleLess);
  renderLessBtn();
  function doHide() { html.classList.add('atlas-hidden'); try { show.focus(); } catch (e) {} }
  hideBtn.addEventListener('click', doHide);
  show.addEventListener('click', () => { html.classList.remove('atlas-hidden'); capRefit(); try { hideBtn.focus(); } catch (e) {} });

  /* ---------------------------------------------------------------- more -> ctx.label.open() */
  function openLabel() { try { ctx.label.open(); } catch (e) {} }
  moreBtn.addEventListener('click', openLabel);

  /* ---------------------------------------------------------------- W06/W18: the phone "…" overflow (less/more,
     label, share, hide) — a lightweight non-modal popover anchored above the merged row, never a second copy
     of #atlas-info's own controls (which stay for desktop/landscape and are simply hidden on phone). */
  function openOverflow() {
    overflowEl.hidden = false; mrowOv.setAttribute('aria-expanded', 'true');
    wake();
    requestAnimationFrame(() => { try { ovLess.focus(); } catch (e) {} });
    addEventListener('pointerdown', onOverflowOutside, { capture: true });
    addEventListener('keydown', onOverflowKey, { capture: true });
  }
  function closeOverflow() {
    if (overflowEl.hidden) return;
    overflowEl.hidden = true; mrowOv.setAttribute('aria-expanded', 'false');
    removeEventListener('pointerdown', onOverflowOutside, { capture: true });
    removeEventListener('keydown', onOverflowKey, { capture: true });
  }
  function onOverflowOutside(e) { if (!overflowEl.contains(e.target) && e.target !== mrowOv) closeOverflow(); }
  function onOverflowKey(e) { if (e.key === 'Escape') { closeOverflow(); try { mrowOv.focus(); } catch (er) {} } }
  mrowOv.addEventListener('click', () => { if (overflowEl.hidden) openOverflow(); else closeOverflow(); });
  ovLess.addEventListener('click', () => { toggleLess(); closeOverflow(); });
  ovLabel.addEventListener('click', () => { closeOverflow(); openLabel(); });
  ovHide.addEventListener('click', () => { closeOverflow(); doHide(); });

  /* ---------------------------------------------------------------- +/- zoom (§1.6), on the pill row on touch screens */
  zoomIn.addEventListener('click', () => { try { ctx.view.zoomBy(1.25, innerWidth / 2, innerHeight / 2); } catch (e) {} });
  zoomOut.addEventListener('click', () => { try { ctx.view.zoomBy(0.8, innerWidth / 2, innerHeight / 2); } catch (e) {} });

  /* ---------------------------------------------------------------- the idle-hint slot: onboarding + sound (§0.2, §5)
     landscape/desktop: unchanged — one standalone line placed under the stage by place(). portrait/phone (W06): the
     SAME element is reparented (once, below) to sit inline in #atlas-info right after the caption, so it costs no
     extra row — it, the caption and the HUD (W17) trade the one slot, in priority HUD > hint > caption, and only
     the winner is ever unhidden (the losers collapse to 0 height, they are not layered on top of one another). */
  const ONB_KEY = 'sm_atlas_onboard_seen_v1', ONB_STOPS = 2;
  let onbSeenBefore = !!sGet(ONB_KEY, false);
  let onbStopCount = 0, onbOn = !KIOSK && !onbSeenBefore;
  lineOnb.textContent = coarse ? T.onboardTouch : T.onboard;
  function stopSeen() {
    if (!onbOn) return;
    onbStopCount++;
    if (onbStopCount > ONB_STOPS) dismissOnboard();
  }
  function dismissOnboard() { if (!onbOn) return; onbOn = false; if (!onbSeenBefore) { onbSeenBefore = true; sSet(ONB_KEY, true); } updatePhoneSlot(); renderLine(); }
  function soundWaiting() { return audioState() === 'off' || audioState() === 'arming'; }
  let sndForcedOff = false;
  /* landscape/desktop rendering: unchanged from round 1 */
  function renderLine() {
    if (isPortrait()) { updatePhoneSlot(); return; }
    const snd = !sndForcedOff && soundWaiting();
    lineOnb.hidden = !onbOn; lineSnd.hidden = !snd;
    const off = !onbOn && !snd;
    if (lineEl.hidden !== off) lineEl.hidden = off;
    if (!off) place(lineEl);
  }
  if (onbOn) {
    const dismiss = (e) => { if (!e.isTrusted) return; removeEventListener('pointerdown', dismiss, true); removeEventListener('keydown', dismiss, true); dismissOnboard(); };
    addEventListener('pointerdown', dismiss, { capture: true, passive: true });
    addEventListener('keydown', dismiss, { capture: true, passive: true });
  }
  document.addEventListener('atlas:sound', () => { sndForcedOff = true; renderLine(); });
  let sndLast = null;
  /* round-2 fix (P0): this tick used to skip renderLine() whenever the sound state hadn't changed, which meant
     nothing ever re-polled the phone slot's own 2.5s hint-eligibility window (below) — it only refreshed on a
     stop change or a sound-state flip. renderLine() itself is cheap (a few attribute/class writes) and already
     no-ops most of its work when nothing changed, so it now runs every tick; only the forced-off latch stays
     gated on an actual transition. */
  setInterval(() => { const w = soundWaiting(); if (w !== sndLast) { sndLast = w; if (!w) sndForcedOff = true; } renderLine(); }, 500);

  /* W06/W12/W17: the phone slot itself. lineEl is reparented into #atlas-info right after the caption once
     (position stays `fixed`, so this never changes how it paints — only where "static flow" would put it if it
     were ever un-fixed, which the portrait CSS below does). */
  let slotWired = false;
  function wireSlot() { if (slotWired || !capEl.parentNode) return; slotWired = true; capEl.insertAdjacentElement('afterend', lineEl); }
  /* round-2 fix (P0, src MS7/A-D2): a hands-off phone visitor never saw a caption, because the sound prompt
     ("♪ tap for sound") occupied this slot for as long as sound was off/arming — which, before a first tap, is
     every stop. The sound prompt no longer occupies this slot at all: it lives only in the dock's own ♪ item
     (M4) and in #top (desktop). The onboarding gesture hint still shares the slot with the caption, but the
     caption always wins while there is one — the hint is eligible only when no caption is present yet, or
     2.5s after a caption has finished typing, and never while a tour drives (nothing to gesture-teach while
     the camera drives itself), so it can never suppress the story during hands-off playback. */
  const HINT_DELAY = 2500;
  /* ctx.hud=hud (above) can be "landed" against a pending value the instant it is assigned (shell.js), which
     is well before this section's own `let`s (onbOn, sndForcedOff, slotWired) have run — a call that lands
     there is meaningless anyway (nothing is wired yet), so it is a deliberate no-op rather than a TDZ crash;
     every later, real call (renderAll, dismissOnboard, the sound poll, hud() itself) runs after mount()
     has finished this section and works normally. */
  function updatePhoneSlot() {
    try {
      if (!isPortrait()) return;
      wireSlot();
      const hudHas = !hudEl.hidden && !!hudEl.textContent.trim();
      const capHas = !capEl.hidden && !!capText;
      /* the hint line itself fades out at idle (data-idle="hide", like every other control) — if it were still
         the slot's chosen occupant at that point the caption would stay suppressed under it, and the slot
         would go blank instead of "the caption stays at 0.5" (§0.2). idle wins the slot back for the caption. */
      /* round-2 item 3: !capCycling — while the multi-chunk carousel is mid-run (typing a chunk OR paused
         between chunks reading one), the hint must never sneak into the shared slot and cut the story off;
         capDoneAt/stopTyping() are only ever reached once the whole carousel finishes, so the existing
         capTyping/capDoneAt check alone would let the hint in during an inter-chunk pause */
      const hintReady = onbOn && !hudHas && !capCycling && !tourDriving() && !html.classList.contains('atlas-idle') && (!capHas || (!capTyping && now() - capDoneAt >= HINT_DELAY));
      capEl.classList.toggle('ai-cap-suppressed', hudHas || hintReady);
      if (hudHas) { lineEl.hidden = true; }
      else if (hintReady) {
        lineOnb.hidden = false; lineSnd.hidden = true;
        lineEl.hidden = false; lineEl.style.left = lineEl.style.bottom = lineEl.style.maxWidth = '';
      } else lineEl.hidden = true;
    } catch (e) {}
  }

  /* ---------------------------------------------------------------- the tape counter (R6 M5, §9.9; it replaced a mission clock)
     `▶ 2019-09-05 ━━━━●── 2026-05-10 · play 61,204 of 97,427`: on a stop with a day of its own (the universe's day
     cursor) the ● and the count sit at that day's running total of plays; anywhere else the tape reads full, `the whole
     log`. it never runs on a clock and can never pass the log's last day. */
  let universeSub = null;
  function tryHookUniverse() {
    if (universeSub) return;
    const u = ctx.peek && ctx.peek('universe');
    if (u && typeof u.onTime === 'function') {
      universeSub = u.onTime(() => {
        renderTplus();
        /* a day-bound caption (the median day) must not stay up once the cursor leaves that day */
        const cur = curStop();
        if (cur && cur.id === 'universe' && !tourOwnsCaption()) refreshCaption(false);
      });
    }
  }
  let dayCum = null, dayCumP = null;
  function loadDayCum() {
    if (!dayCumP) dayCumP = ctx.data('universe_days').then((j) => { let c = 0; const D = (j && j.days) || []; dayCum = { d: D.map((x) => x.d), c: D.map((x) => (c += x.n || 0)), total: c }; renderTplus(); }).catch(() => { dayCumP = null; });
  }
  function playsThrough(day) {
    const d = dayCum.d; let lo = 0, hi = d.length - 1, k = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (d[m] <= day) { k = m; lo = m + 1; } else hi = m - 1; }
    return k < 0 ? 0 : dayCum.c[k];
  }
  function stopDay() {
    const cur = curStop(); if (!cur || cur.id !== 'universe') return null;
    const u = ctx.peek && ctx.peek('universe'), t = u && u.time;
    return t && t.at ? t.at : null;
  }
  const TAPE = 12, fmt = (n) => n.toLocaleString('en-US');
  function renderTplus() {
    tryHookUniverse();
    const st = ctx.stats || {}, first = st.firstDay || '2019-09-05', last = st.lastDay || '2026-05-10', day = stopDay();
    let bar = '━'.repeat(TAPE), tail = T.tapeWhole;
    if (day && day >= first && day <= last) {
      if (!dayCum) loadDayCum();
      else if (dayCum.total > 0) {
        const n = playsThrough(day), i = Math.round((n / dayCum.total) * (TAPE - 1));
        bar = '━'.repeat(i) + '●' + '─'.repeat(TAPE - 1 - i);
        tail = T.tapeAt.replace('{n}', fmt(n)).replace('{total}', fmt(dayCum.total));
      }
    }
    const a = '▶ ' + first + ' ' + bar + ' ' + last + ' · ';
    if (tplusA.textContent !== a) tplusA.textContent = a;
    if (tplusB.textContent !== tail) tplusB.textContent = tail;
    tplusEl.hidden = false;
  }
  setInterval(renderTplus, 1000);

  /* ---------------------------------------------------------------- W10: tour end card
     prefers K3's ctx.tour.on('end', fn); falls back to deriving "ended" from the same fields renderPill
     already reads (a.playing false, last stop, hold and angle both complete) when it is not available. */
  let endShownFor = null, endDismissed = null, tourEndEventOn = false;
  /* round-2 fix: this used to be a one-shot `ctx.tour && typeof ctx.tour.on === 'function'` check taken once
     at mount time. M4's tour.js does export `on`, but nothing here guarantees `ctx.tour` itself is already
     the real API object (rather than a still-mounting stub) at the exact moment this module's top-level code
     runs — a real repro: the fallback path stayed permanently active in a run where `ctx.tour.on` was in fact
     a function throughout, so the one-shot read itself, not the dependency, was the bug. Checked live instead,
     every time checkTourEnd() runs (every render), so it self-heals the first tick after tour.js is actually
     ready, whichever module happened to mount first. */
  function hasTourEndEvent() {
    if (tourEndEventOn) return true;
    if (!ctx.tour || typeof ctx.tour.on !== 'function') return false;
    tourEndEventOn = true;
    ctx.tour.on('end', () => { endShownFor = 'event'; endDismissed = null; showEndCard(); });
    return true;
  }
  function tourEndedNow(ts) {
    if (!ts || !ts.def) return false;
    const { a, n } = ts;
    return !a.playing && !a.enRoute && a.k >= n - 1 && (a.holding || 0) >= 1 && (a.angleK || 0) >= (a.angleN || 1) - 1;
  }
  /* round-2 (W-fix9): the card used to stay up through anything that wasn't a stop change — a click on the
     universe's own SKY/LINKS/THREADS toggle, starting another tour from the tours panel, going back to free
     camera — because nothing outside a room change ever called hideEndCard(). Any real interaction that
     lands outside the card now dismisses it (pointerdown covers mouse/touch; click also catches a
     keyboard-activated control elsewhere — deliberately NOT keydown, which would fire on a bare Tab press
     while the visitor is still trying to tab INTO the card). Its own buttons are unaffected: their pointerdown
     targets the card, and each already calls hideEndCard() itself on click. */
  function onEndDismiss(e) {
    if (!e.isTrusted || endEl.hidden || endEl.contains(e.target)) return;
    endDismissed = endShownFor; endShownFor = null; hideEndCard();
  }
  function armEndDismiss() { addEventListener('pointerdown', onEndDismiss, { capture: true, passive: true }); addEventListener('click', onEndDismiss, { capture: true }); }
  function disarmEndDismiss() { removeEventListener('pointerdown', onEndDismiss, { capture: true }); removeEventListener('click', onEndDismiss, { capture: true }); }
  function showEndCard() {
    endEl.hidden = false;
    /* round-2 item 5: on phone, the end card overlays the caption/hint slot's own screen position (its
       fixed 40vh zone starts well above the dock) — left showing underneath, the old caption's ghost text
       collided visually with the card's own heading at the same line. The shared slot goes quiet while the
       card is up; chrome.css scopes this to phone only (desktop's card sits in the normal column flow, no
       overlay, nothing to hide). */
    html.classList.add('ai-endcard-open');
    const sc = servedCounts();
    endServed.textContent = T.servedEnd.replace('{n}', sc.rooms.filter((r) => served[r] === '°').length).replace('{total}', sc.rooms.length);
    endH.textContent = T.endHead; endFly.textContent = T.endFly; endExport.textContent = T.endExport;
    endReport.textContent = T.endReport; endAgain.textContent = T.endAgain; endContact.textContent = T.contact;
    /* a genuine read-time grace (same formula the caption uses, over all five lines) before idle-fade can dim
       it, so a visitor actually reading the four choices doesn't have them fade mid-read */
    capReadUntil = Math.max(capReadUntil, now() + readTime([T.endHead, endServed.textContent, T.endFly, T.endExport, T.endReport, T.endAgain, T.contact].join(' ')));
    armEndDismiss();
    scheduleLayout();
    try { endFly.focus(); } catch (e) {}
  }
  function hideEndCard() { disarmEndDismiss(); html.classList.remove('ai-endcard-open'); if (endEl.hidden) return; endEl.hidden = true; scheduleLayout(); renderPill(); }
  function checkTourEnd(ts) {
    if (hasTourEndEvent()) return; /* the explicit event already drives showEndCard */
    const ended = tourEndedNow(ts);
    const key = ended ? ts.a.id + ':' + ts.a.k : null;
    if (!ended) { if (endShownFor) { endShownFor = null; hideEndCard(); } endDismissed = null; return; }
    /* a key the visitor already dismissed (via onEndDismiss) never re-shows on its own — only a genuinely new
       "ended" instance (a different key: the tour was replayed and finished again) may show the card again */
    if (key !== endDismissed && endShownFor !== key) { endShownFor = key; showEndCard(); }
  }
  hasTourEndEvent(); /* registers immediately when ctx.tour is already live; checkTourEnd() retries otherwise */
  endFly.addEventListener('click', () => {
    hideEndCard(); try { ctx.tour.pause('end'); } catch (e) {}
    try { ctx.go('universe', { via: 'key' }); } catch (e) {}
  });
  endExport.addEventListener('click', () => { location.href = 'bridge-index.html'; });
  endReport.addEventListener('click', () => { location.href = 'researcher.html'; });
  endAgain.addEventListener('click', () => {
    hideEndCard(); served = {}; saveServed(); const id = (ctx.tour && ctx.tour.active && ctx.tour.active.id) || 'grand';
    try { ctx.tour.play(id, 0); } catch (e) {}
  });

  /* ---------------------------------------------------------------- R6 move 3: you are being served too
     each stop the visitor reaches is marked the way it was started, in the arms' own glyphs: ≡ the tour moved on, ° their
     own pick (a key, a tap, search, the pill), × the shuffle button. first arrival wins; plain counts, this tab only
     (sessionStorage), nothing sent anywhere. */
  const SV_KEY = 'sm_atlas_served_v1';
  let served = {}; try { served = JSON.parse(sessionStorage.getItem(SV_KEY) || '{}') || {}; } catch (e) { served = {}; }
  const saveServed = () => { try { sessionStorage.setItem(SV_KEY, JSON.stringify(served)); } catch (e) {} };
  const SV_CLS = { '≡': 'q', '°': 't', '×': 's' };
  function markArrival(ev) {
    const cur = curStop(), via = ev && ev.via; if (!cur || !via || via === 'mount' || via === 'url') return;
    if (served[cur.id]) return;
    served[cur.id] = via === 'tour' ? (ctx.tour && ctx.tour.active && ctx.tour.active.hand ? '°' : '≡') : via === 'shuffle' ? '×' : '°';
    saveServed();
  }
  /* the stops of the tour in play (the long play when none), gate excluded */
  function servedStops() {
    const a = ctx.tour && ctx.tour.active, def = (a && a.id && tourDef(a.id)) || tourDef('grand');
    return def && def.stops ? def.stops.filter((x) => !x.gate).map((x) => x.room) : walkStops().map((x) => x.id);
  }
  function servedCounts() {
    const c = { '≡': 0, '°': 0, '×': 0 }, rooms = servedStops();
    for (const r of rooms) if (served[r]) c[served[r]]++;
    return { c, rooms };
  }
  function renderServed() {
    const { c, rooms } = servedCounts(), any = c['≡'] + c['°'] + c['×'] > 0;
    servedEl.hidden = !any; if (!any) return;
    let h = ''; for (const r of rooms) { const g = served[r]; h += '<span class="sv-' + (g ? SV_CLS[g] : 'n') + '">' + (g || '·') + '</span>'; }
    h += '<span class="sv-n">  ≡' + c['≡'] + ' °' + c['°'] + ' ×' + c['×'] + '</span>';
    if (servedEl.innerHTML !== h) servedEl.innerHTML = h;
    servedEl.title = T.servedKey;
    servedEl.setAttribute('aria-label', T.servedKey + '. ≡ ' + c['≡'] + ', ° ' + c['°'] + ', × ' + c['×'] + '.');
  }
  function shuffle() {
    const cur = curStop(), rooms = [...new Set(servedStops())].filter((r) => r !== (cur && cur.id) && stopById(r));
    const fresh = rooms.filter((r) => !served[r]), pool = fresh.length ? fresh : rooms;
    if (!pool.length) return;
    try { ctx.go(pool[Math.floor(Math.random() * pool.length)], { via: 'shuffle' }); } catch (e) {}
  }
  shufBtn.addEventListener('click', shuffle);
  ovShuf.addEventListener('click', () => { closeOverflow(); shuffle(); });
  /* another tour picked, or `play it again`, begins a fresh tally */
  let svTour = null;
  function servedTourEdge() {
    const a = ctx.tour && ctx.tour.active; if (!a || !a.id) return;
    if (svTour && svTour !== a.id) { served = {}; saveServed(); }
    svTour = a.id;
  }

  /* ---------------------------------------------------------------- insets: measure #top, #atlas-info, .wall, #atlas-dock */
  function activeWall() { const s = doc.querySelector('section[data-room].is-active'); return s && s.querySelector('.wall'); }
  function writeInsets(top, bottom) {
    const ins = ctx.atlas.insets || (ctx.atlas.insets = { top: 0, bottom: 0, left: 0 });
    const dt = Math.abs((ins.top || 0) - top), db = bottom == null ? 0 : Math.abs((ins.bottom || 0) - bottom);
    ins.top = top; if (bottom != null) ins.bottom = bottom;
    if (dt >= 2 || db >= 2) { try { ctx.relayout(); } catch (e) {} }
  }
  const topBar = doc.getElementById('top');
  let dockH = 0, wallObs = null, wallTarget = null;
  function measureDock() { const d = doc.getElementById('atlas-dock'); dockH = d ? Math.round(d.getBoundingClientRect().height) : 0; html.style.setProperty('--atlas-dockh', dockH + 'px'); }
  /* the wall's layout top, not its painted one: an arriving wall is still sliding up from translateY(10px) when a stop
     change lays the card out, which used to leave #atlas-info's bottom flush on the kicker instead of `gap` above it */
  function wallTopOf(wall) { const p = wall.offsetParent; return p ? p.getBoundingClientRect().top + wall.offsetTop : wall.getBoundingClientRect().top; }
  /* VERIFY r2: the upright compact card shows kicker + title only when both fit, the title on one line at 26px. the card
     sits 8px above the dock (chrome.css) and #atlas-info sits `gap` above the card, so the card may take what is left
     once the stage keeps half the screen: card max-height = dock top - 8 - (info bottom with that stage). otherwise
     only the kicker shows and `more ▾` brings the title back. measured with the title's own line box whichever state
     it is in, so hiding it never changes the answer. */
  const STAGE_MIN = 0.5, STAGE_GAP = 12;
  function fitTitle(wall, topBottom, gap) {
    let kick = false;
    const t = wall && lessOn && isPortrait() ? wall.querySelector('h1,h2') : null;
    if (t) {
      const shown = t.getBoundingClientRect().height > 2, cs = getComputedStyle(t), fs = parseFloat(cs.fontSize) || 26;
      const lh = parseFloat(cs.lineHeight) || Math.round(fs * 1.25);
      const full = wall.offsetHeight + (shown ? 0 : lh);
      const cardTop = wallTopOf(wall) + wall.offsetHeight - full;
      const stage = cardTop - gap - info.scrollHeight - STAGE_GAP - topBottom;
      const rg = doc.createRange(); rg.selectNodeContents(t);
      const ws = getComputedStyle(wall), room = wall.clientWidth - (parseFloat(ws.paddingLeft) || 0) - (parseFloat(ws.paddingRight) || 0);
      const oneLine = rg.getBoundingClientRect().width + 0.14 * fs <= room + 0.5;
      kick = !oneLine || stage < Math.round(innerHeight * STAGE_MIN);
    }
    html.classList.toggle('ai-kick', kick);
  }
  function layoutInfo() {
    measureDock();
    const portrait = isPortrait();
    if (portrait) {
      const wall = activeWall();
      const topBottom0 = topBar ? Math.round(topBar.getBoundingClientRect().bottom) : 64, gap = 10;
      fitTitle(wall, topBottom0, gap);
      const wallTop = wall ? wallTopOf(wall) : innerHeight - dockH - 140;
      const bottomPx = Math.max(dockH + 8, Math.round(innerHeight - wallTop + gap));
      info.style.bottom = bottomPx + 'px'; show.style.bottom = bottomPx + 'px';
      /* safety net for a short phone or an unusually long caption/room name: the compact CSS (.ai-less) is the
         normal fix, but the card must never be allowed to push its own top above #top regardless, so it also
         gets an explicit max-height + scroll once the available gap is known. */
      const maxH = Math.max(60, Math.round(wallTop - gap - topBottom0 - 8));
      html.style.setProperty('--atlas-infomaxh', maxH + 'px');
      const infoRect = info.getBoundingClientRect();
      writeInsets(topBottom0, Math.round(infoRect.top));
      html.style.setProperty('--atlas-wallh', wall ? wall.offsetHeight + 'px' : '0px');
      wallMore();
    } else {
      html.classList.remove('ai-kick');
      info.style.bottom = ''; show.style.bottom = '';
      /* the header's real height varies once search/menus land inside it (§SKELETON M4/M5), so the info
         column's top offset is measured, never hard-coded, to guarantee no overlap (a real bug this caught:
         #top measured 64px tall while the CSS fallback assumed ~50px, so #ai-hide sat partly under it). */
      const topBottom = topBar ? Math.round(topBar.getBoundingClientRect().bottom) : 64, gap = 12;
      info.style.top = (topBottom + gap) + 'px'; show.style.top = (topBottom + gap) + 'px';
      const infoRect = info.getBoundingClientRect();
      html.style.setProperty('--atlas-infoh', Math.max(60, Math.round(infoRect.bottom)) + 'px');
      /* round-2 fix: a real cap (not 'none') here too, mirroring the portrait branch, so a short landscape
         viewport (a phone held sideways) can never let the unfolded card push itself off-screen with nothing
         to scroll. a no-op everywhere roomy (desktop's own content is always well under this), since it only
         ever constrains #atlas-info when its content would exceed the space actually available.
         round-2 item 2 (R2_VERIFY_2_precision P1): in the short tier (<=480px tall — a phone on its side)
         the card alone could claim nearly the full viewport, leaving the wall's own max-height calc
         (chrome.css 117/126, driven by --atlas-infoh below) at 0 — the wall, and whatever reading it holds
         (the graveyard's rule line), became permanently unreachable. WALL_MIN_LAND is carved out of the
         card's own budget FIRST, so the wall is always left something real to open into; the card keeps
         scrolling internally for the rest (unchanged mechanism, chrome.css's overflow-y:auto). */
      const wallReserve = innerHeight <= 480 ? WALL_MIN_LAND : 0;
      const maxH = Math.max(60, Math.round(innerHeight - topBottom - gap - dockH - 8 - wallReserve));
      html.style.setProperty('--atlas-infomaxh', maxH + 'px');
      writeInsets(topBottom, null);
      const ln = $('ai-liner'); html.style.setProperty('--ai-top', (topBottom + gap) + 'px');
      html.style.setProperty('--ai-linerh', (ln && getComputedStyle(ln).position === 'fixed' ? Math.round(ln.getBoundingClientRect().height) : 0) + 'px');
      wallMore();
    }
    if (!lineEl.hidden) place(lineEl);
    if (toastEl.classList.contains('on')) place(toastEl);
  }
  /* size changes seen by a ResizeObserver are laid out on the next frame, not inside the observer: layoutInfo() moves
     and caps #atlas-info (--atlas-infomaxh) and relayouts the room, which resizes observed boxes again mid-delivery
     ("ResizeObserver loop completed with undelivered notifications", webkit, on expanding the phone card) */
  let layoutRaf = 0;
  const scheduleLayout = () => { if (!layoutRaf) layoutRaf = requestAnimationFrame(() => { layoutRaf = 0; layoutInfo(); }); };
  /* the bottom fade on a wall that scrolls, only while more text waits below (upright too: the universe card and the
     short-phone walls carry a fade that otherwise dimmed their last line against the dock even with nothing below) */
  function wallMore() {
    const wall = activeWall(); if (!wall) return;
    const scrolls = /auto|scroll/.test(getComputedStyle(wall).overflowY) && wall.scrollHeight > wall.clientHeight + 2;
    wall.classList.toggle('ai-wall-more', scrolls && wall.scrollTop + wall.clientHeight < wall.scrollHeight - 2);
    /* a scrolling wall with nothing focusable inside must still be reachable by keyboard (axe scrollable-region-focusable) */
    const needTab = scrolls && ![...wall.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].some((e) => e !== wall && e.getClientRects().length);
    if (needTab && !wall.hasAttribute('tabindex')) { wall.tabIndex = 0; wall.dataset.aiTab = '1'; }
    else if (!needTab && wall.dataset.aiTab) { wall.removeAttribute('tabindex'); delete wall.dataset.aiTab; }
  }
  let wallMO = null, dupT = 0;
  function watchWall() {
    const wall = activeWall(); if (!wall || wall === wallTarget) return;
    if (wallObs) wallObs.disconnect();
    if (wallMO) wallMO.disconnect();
    wallTarget = wall;
    if (!wall.__aiScroll) { wall.__aiScroll = true; wall.addEventListener('scroll', wallMore, { passive: true }); }
    if (typeof ResizeObserver !== 'undefined') { wallObs = new ResizeObserver(scheduleLayout); wallObs.observe(wall); }
    if (typeof MutationObserver !== 'undefined') { wallMO = new MutationObserver(onWallText); wallMO.observe(wall, { childList: true, subtree: true, characterData: true }); }
  }
  /* the wall's text changed after the caption was measured against it (at most one re-measure per 300 ms; the print
     mirror chrome writes into the wall does not count) */
  function onWallText(list) {
    if (capOffRaw == null || dupT) return;
    if (list.every((m) => { const n = m.target.nodeType === 1 ? m.target : m.target.parentElement; return !!(n && n.closest('.ai-print-cap')); })) return;
    dupT = setTimeout(() => { dupT = 0; recheckDup(); }, 300);
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(scheduleLayout).observe(info); new ResizeObserver(scheduleLayout).observe($('ai-liner'));
    if (topBar) new ResizeObserver(scheduleLayout).observe(topBar);
  }
  new MutationObserver(() => { const d = doc.getElementById('atlas-dock'); if (d && !d.__aiObs) { d.__aiObs = true; if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scheduleLayout).observe(d); else layoutInfo(); } }).observe(body, { childList: true, subtree: true });
  addEventListener('resize', () => { capRefit(); layoutInfo(); });
  /* `less` is the default everywhere, so a rotation keeps the visitor's own choice; what the card folds does change */
  const onVPChange = () => { renderLessBtn(); recheckDup(); capRefit(); layoutInfo(); updatePhoneSlot(); closeOverflow(); };
  ['(max-aspect-ratio:115/100)', '(max-height:480px)'].forEach((q) => { const m = matchMedia(q); if (m.addEventListener) m.addEventListener('change', onVPChange); });

  /* ---------------------------------------------------------------- horizontal swipe on the wall card (D4, phone only) */
  let swX = 0, swY = 0, swActive = false;
  function onWallDown(e) { if (!isPortrait()) return; const p = e.touches ? e.touches[0] : e; swX = p.clientX; swY = p.clientY; swActive = true; }
  function onWallUp(e) { if (!swActive) return; swActive = false; if (!isPortrait()) return; const p = e.changedTouches ? e.changedTouches[0] : e; const dx = p.clientX - swX, dy = p.clientY - swY; if (Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx) * 0.58) return; const w = walkStops(), pos = w.findIndex((s) => s.i === ctx.index); if (pos < 0) return; if (dx < 0 && pos < w.length - 1) ctx.go(w[pos + 1].id, { via: 'key' }); else if (dx > 0 && pos > 0) ctx.go(w[pos - 1].id, { via: 'key' }); }
  function bindWallSwipe() {
    const wall = activeWall(); if (!wall || wall.__aiSwipe) return; wall.__aiSwipe = true;
    wall.addEventListener('pointerdown', onWallDown, { passive: true });
    wall.addEventListener('pointerup', onWallUp, { passive: true });
  }

  /* ---------------------------------------------------------------- render-all + subscriptions */
  function renderAll() { renderStop(); renderCamChip(); renderAngle(); renderPlay(); renderServed(); layoutInfo(); watchWall(); bindWallSwipe(); updatePhoneSlot(); }
  const api = { render() { renderAll(); } };

  ctx.onStop((ev) => {
    lastStopT = now();
    capOffRaw = null; markDup(''); /* the last room's caption is never measured against this room's wall */
    hideToast(); /* the last room's hint or toast must never sit over the next one */
    closeOverflow();
    /* round-2 (W-fix9): a room change always takes the end card down, regardless of whether K3's `end` event
       is available — this used to be wired only inside the event-path branch below */
    if (endShownFor) { endShownFor = null; hideEndCard(); }
    stopSeen();
    markArrival(ev);
    renderAll();
    const via = ev && ev.via;
    if (via === 'tour') return; /* the tour engine types its own caption on arrival */
    if (via === 'mount' && ctx.tour && ctx.tour.active && ctx.tour.active.id) return; /* a deep-linked tour owns the first caption */
    refreshCaption(true);
  });
  if (ctx.angle && ctx.angle.onChange) ctx.angle.onChange(() => { renderAngle(); if (!tourOwnsCaption()) refreshCaption(false, true); });
  let tourWasPlaying = null;
  if (ctx.tour && ctx.tour.onChange) ctx.tour.onChange(() => {
    /* round-2 (W-fix9): starting another tour (the tours panel, a deep link, or our own `start again`) must
       also take the card down, not just a room change — the driving signal is the tour actually playing again */
    if (endShownFor && ctx.tour.active && ctx.tour.active.playing) { endShownFor = null; hideEndCard(); }
    const playingNow = !!(ctx.tour.active && ctx.tour.active.playing);
    if (tourWasPlaying && !playingNow) {
      capFinishOnPause(); /* M3-b: a playing->paused edge, never a bare re-render */
      /* R6 M1: the visitor's own move paused it (never the pause button or the tour's end); after this stop's own hideToast */
      if (ctx.tour.active.why === 'user') setTimeout(() => { const a = ctx.tour.active; if (a && !a.playing && a.why === 'user') toast(T.paused, 3600); }, 80);
    }
    tourWasPlaying = playingNow;
    servedTourEdge();
    renderStop(); renderAngle(); renderPlay(); renderServed(); checkTourEnd(tourState());
  });
  if (ctx.onFrame) ctx.onFrame(() => { pollView(); barTick(); });

  renderAll(); renderTplus(); renderLine(); idleTick();
  /* the initial synchronous layoutInfo() can run before webfonts/late content have settled .wall's real height
     (a real race this caught: a zero-wait read straight after mount saw a stale, too-short wall rect), so the
     first couple of frames and the webfonts promise get a follow-up pass */
  requestAnimationFrame(() => layoutInfo());
  requestAnimationFrame(() => requestAnimationFrame(() => layoutInfo()));
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => layoutInfo()).catch(() => {});

  return api;
}
export default { mount };
export const mountChrome = mount;
