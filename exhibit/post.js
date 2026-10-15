/* listening post — ask once, then one dock.
   A room calls ctx.post(host, artist) and gets a small "hear <artist>" control. Before the first click the
   control carries the privacy note and nothing has been requested from spotify. The first click is the consent:
   from then on every control in every room plays into ONE player docked at the bottom of the viewport, the
   soundtrack ducks under it, and the note is gone.
   - nothing is requested from spotify until that first click (click-to-load facade; no preconnect either)
   - the player is spotify's own iframe api controller, unaltered, linking back to spotify
   - the next artist is loadUri() on the same controller, so there is no second load
   - no audio or artwork is stored in this repo
   track ids come from audio/sonic-tid-to-artist.json, which this site already publishes.
   R5 L2 (dwell-to-play): playQuiet() plays into the same player shown as a small pill next to what was hovered, never
   reserving the bottom edge; before consent the pill asks first ("play <artist> from spotify?") and nothing reaches
   spotify until yes. dwell()/undwell() hold the 600 ms (mouse) / 500 ms (touch) timers. the bed ducks only once the id
   resolved and the embed is ready; at most one load per 400 ms. API: R5/L1/API.md
   R9 (phones): on a coarse pointer there is no pill. the ask, the player and any failure all live in the bottom dock,
   which reserves its height so the room's controls move up out of its way. ios never starts the embed without a tap
   inside it, so the line says "tap ▶ to hear <artist>" from the start and only says "hearing" while the embed reports
   real playback (not paused, position past 0).
   R10 (one voice): the post tells the shell's arbiter (ctx.audio.clip) what the embed is doing: 'armed' (asked, player
   ready: the bed waits at -24 dB), 'hot' (playing or starting: the bed is silent and its decks pause), 'off'. only a
   paused report, a failure or closing the dock ends 'hot'; nothing else (a timer, a room change) brings the bed back over
   a clip. a tap inside the player (the window loses focus to its frame) is 'hot' at once, before spotify says anything.
   R18 (the little player): after the one yes, every later post starts by itself (a click, or a 600 ms rest of a mouse
   that has stopped moving). the pill and the phone dock carry a small record: it spins only while spotify reports
   playback, its thin ring is the clip's progress (estimated between reports, never seekable), its label wears the
   artist's genre family when the room passes one (ice otherwise; violet only on a clip autoplay chose). the record is
   the pause and play button. a preview that runs out winds the record down and the bed comes back on that report.
   ios still wants spotify's own ▶: a pulsing ring sits on it until spotify reports real playback. a blocked or silent
   player becomes a card that opens the track on spotify, and it stays, reason and all, until it is put away (stop,
   escape, a swipe down on a phone, the next post or a room change). names are shown as spelled.
   sm:clip, the one clip event. this module sends it; a listener must change nothing if it never arrives:
     window.dispatchEvent(new CustomEvent('sm:clip', { detail: { state, artist, position, duration, via } }))
     state      'armed' (asked, player loading) | 'cueing' (loaded, waiting for the in-embed tap on ios or the first
                report) | 'playing' | 'paused' | 'ended' | 'fail' | 'off'
     position, duration   ms; while playing, estimated between spotify's reports and sent at most every 250 ms
     via        'tap' | 'dwell' | 'tour' | 'auto'
   it is sent on every change of state, artist or via, and on each position estimate while playing. postState() returns
   the same fields (plus playing, cue, ended, auto, failed) next to the older ones.
   radio: ctx.post.playArtist(artist, { via: 'tour' }) (or 'auto') plays only for a visitor who is listening (a clip
   playing now, one that played in the last 3 s, or a preview that ran out in the still-open player); otherwise it
   returns 'idle' and nothing happens. it never asks, and 'tour' yields to the autoplay switch while that is on. a stop
   change the tour makes (via 'tour') under a listening visitor keeps the pill until 4 s after the tour arrives (12 s at
   most, including a leaving room's stopPosts) for that hand-over, then closes it. */

let tidByArtist = null, apiPromise = null, apiReady = null;
let consent = false;                 /* true the moment a visitor has clicked one listening post */
let declined = false;                /* the visitor said no to the pill's ask: dwells never ask again this visit */
let IDS = null, loads = 0, lastLoad = -1e9, loadTo = 0, stopSub = false;
const notes = new Set();             /* the privacy notes on screen, cleared the moment consent is given */
const noted = new WeakSet();         /* hosts that already carry one */
/* R18: every "hear <artist>" control, so each one can say what the player is doing with its artist */
const BTNS = new Set();
/* R18 autoplay: the violet switch, off until pressed. on, a preview that runs out hands the player to the artist that
   autoplay most often served next in my log (twolisteners.json auto_edges), never one already heard, at most six */
let AUTO = false, autoSteps = 0, autoMap = null, autoP = null;
/* R18: where a mouse last moved (more than 10 px), so a dwell waits for a rest and not a pass across a star. a press held
   still on a name is a rest too: the label layer captures the pointer at 500 ms (anchors.js:785, gesture.js:86) and the
   name reports a leave; undwell holds that back (PT.held) until the press moves 6 px or is let go somewhere else */
const PT = { at: 0, x: -1e4, y: -1e4, down: false, dx: 0, dy: 0, held: null, relT: 0 };
const pressFar = (e) => Math.hypot(e.clientX - PT.dx, e.clientY - PT.dy) >= 6;
function letGo() { clearTimeout(PT.relT); PT.relT = 0; const h = PT.held; PT.held = null; if (h) undwell(h.ctx, h.o); }
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  if (Math.abs(e.clientX - PT.x) + Math.abs(e.clientY - PT.y) > 10) { PT.x = e.clientX; PT.y = e.clientY; PT.at = Date.now(); }
  if (PT.down && pressFar(e)) { PT.down = false; letGo(); }
}, { capture: true, passive: true });
addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { letGo(); PT.down = true; PT.dx = e.clientX; PT.dy = e.clientY; } }, { capture: true, passive: true });
/* let go where it began: the name is still under the pointer and its layer enters it again at once (dwell() takes that as
   the same rest and drops the held leave); with no such word in 80 ms the held leave stands */
const pressEnd = (e) => {
  if (e.pointerType !== 'mouse') return;
  const still = PT.down; PT.down = false;
  if (!PT.held) return;
  if (still) { clearTimeout(PT.relT); PT.relT = setTimeout(letGo, 80); } else letGo();
};
addEventListener('pointerup', pressEnd, { capture: true, passive: true });
addEventListener('pointercancel', pressEnd, { capture: true, passive: true });

export function clipsAllowed() { return consent; }
export function grant() { grantConsent(); }
export function hasTrack(artist) { return loadIds().then((m) => !!m[artist]); }
export function hasTrackNow(artist) { if (IDS) return !!IDS[artist]; loadIds(); return null; }

function loadIds() {
  if (!tidByArtist) tidByArtist = fetch('audio/sonic-tid-to-artist.json').then((r) => r.json()).then((m) => { const o = {}; for (const tid in m) { const a = m[tid]; if (!(a in o)) o[a] = tid; } return (IDS = o); }).catch(() => ({}));
  return tidByArtist;
}
/* one slow moment must not disable every post for the rest of the visit: a failed attempt is forgotten, so the next
   click starts a fresh one, and an api that turns up after its own timeout is kept and answers that click at once. */
function loadApi() {
  if (apiReady) return Promise.resolve(apiReady);
  if (!apiPromise) apiPromise = new Promise((res, rej) => {
    const prev = window.onSpotifyIframeApiReady; let to = 0;
    window.onSpotifyIframeApiReady = (api) => { clearTimeout(to); apiReady = api; if (prev) try { prev(api); } catch (e) {} res(api); lateRetry(); };
    const s = document.createElement('script'); s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true;
    s.onerror = () => { clearTimeout(to); rej(new Error('script')); };
    document.head.appendChild(s);
    to = setTimeout(() => rej(new Error('timeout')), 5000);
  }).catch((e) => { apiPromise = null; throw e; });
  return apiPromise;
}
/* five seconds is short enough to be honest and long enough to be wrong on a slow phone. if the api turns up
   after its own timeout while the dock is still showing that failure, answer the click that was made rather
   than asking for a second one. apiPromise === null is the precise signal that the wait already gave up. */
let lateRetried = false;
function lateRetry() {
  if (lateRetried || apiPromise || !D.open || D.ctl || !D.artist || !D.ctx) return;
  lateRetried = true;
  playArtist(D.artist, D.ctx, null, D.quiet ? { x: D.px || 16, y: D.py || 16 } : false, { via: D.via, fam: D.famName }).catch(() => {});
}
/* the autoplay log: who autoplay served after whom, strongest first, and each artist's genre family */
function loadAuto(ctx) {
  if (autoP) return autoP;
  const C = ctx || D.ctx;
  if (!C || typeof C.data !== 'function') return Promise.resolve(null);
  autoP = C.data('twolisteners').then((d) => {
    const nm = {}, fam = {}, next = {};
    (d.nodes || []).forEach((n) => { nm[n.id] = n.name; fam[n.name] = n.community; });
    (d.auto_edges || []).forEach((e) => { const a = nm[e[0]], b = nm[e[1]]; if (!a || !b || a === b) return; (next[a] = next[a] || []).push({ b, w: +e[2] || 0 }); });
    for (const k in next) next[k].sort((x, y) => y.w - x.w);
    autoMap = { next, fam };
    /* a clip that opened before the log arrived wears its family now, if the room did not pass one */
    if (D.open && D.el && !D.famName && !D.fam) { const h = famOf(D.artist); if (h) { D.fam = h; D.el.style.setProperty('--fam', h); } }
    return autoMap;
  }).catch(() => { autoP = null; return null; });
  return autoP;
}

/* ------------------------------------------------------------------ the dock */
const coarse = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
const still = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
/* the arbiter's three states; duck() is the older two-state call, kept for a shell that has no clip() */
/* R11: once a clip is hot the bed comes back only for a reason: a paused or ended report ('pause'), the dock closing
   ('close'), or the dock giving up on a player that never said a word ('fail'). never on a timer, never on silence: a
   blocker or a throttled frame stops the reports while spotify keeps playing. a hidden page keeps it out until seen */
function hush(s, why) {
  const A = D.ctx && D.ctx.audio; if (!A) return;
  if (!A.clip) { A.duck(s !== 'off'); return; }
  if (s === 'hot') D.later = null;
  else if (A.clipState === 'hot') { if (!why) return; if (document.hidden) { D.later = s; return; } }
  A.clip(s);
}
/* R18: spotify's controller methods return nothing and can throw inside its own frame; a stand-in may lack one */
function ctlDo(m) {
  const c = D.ctl; if (!c) return;
  try { const f = typeof c[m] === 'function' ? c[m] : c.play; Promise.resolve(f.call(c)).catch(() => {}); } catch (e) {}
}
/* THE COLOUR CODE: a genre family is a pastel and never reads as a provenance; grey means no public tag */
function famHex(fam) {
  const C = D.ctx; if (!fam || !C || typeof C.famColor !== 'function') return '';
  try { return '#' + (C.famColor(fam) >>> 0).toString(16).padStart(6, '0'); } catch (e) { return ''; }
}
function famOf(artist) { const f = autoMap && autoMap.fam[artist]; return f ? famHex(f) : ''; }
/* the yes is the one moment the room answers: two quiet notes in the bed's key (silent when muted or under a clip) */
function chord(C) {
  const X = C || D.ctx, A = X && X.audio; if (!A || typeof A.note !== 'function') return;
  try { A.note(0, { dur: 0.45, vol: 0.03 }); A.note(3, { at: 0.09, dur: 0.6, vol: 0.026 }); } catch (e) {}
}
const D = {
  el: null, slot: null, who: null, attr: null, x: null, msg: null,
  ctl: null, wantTid: '', artist: '', open: false, lastFocus: null, ctx: null, playT: 0, h: 0, armT: 0, started: false, armTo: 0, failTo: 0,
  quiet: false, ready: false, loaded: '', playFor: '', evAt: 0, nudT: 0, tapAt: 0, inTo: 0, hotTo: 0, hotFor: 0, mutTo: 0, heard: false, later: null, byDwell: false, asking: '', askTo: 0, askAt: null, yes: null, no: null, tapTo: 0, co: false, playAt: 0, dur: 0, making: false,
  /* R18 */
  disc: null, rp: null, wind: null, cueEl: null, autoB: null, px: 0, py: 0,
  pos: 0, posAt: 0, lastRep: 0, lastRun: false, lastRunAt: 0, playingNow: false, ended: false, atEnd: false, prog: false, failed: false, failKind: '', cue: false, popAt: 0,
  via: 'tap', served: false, fam: '', famName: '', note: '', line: '', holdTo: 0, startTo: 0, tickAt: 0, askFam: '', askOpener: null, hov: false, popTo: 0, endTo: 0, tick: 0, ek: '', windA: 0, autoSeen: null, radioTo: 0,
  build(ctx) {
    if (this.el) return this.el;
    this.ctx = ctx;
    const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
    const el = mk('aside', 'exd is-off'); el.id = 'exdock'; el.setAttribute('aria-label', 'listening post');
    /* a phone's handle: the dock goes away with a swipe down, the way a sheet does */
    const grab = mk('span', 'exd-grab'); grab.setAttribute('aria-hidden', 'true');
    const bar = mk('div', 'exd-bar');
    /* R18 the record: it spins while spotify reports playback, its ring is the clip's progress, and it is the pause / play */
    const disc = mk('button', 'exd-disc'); disc.type = 'button'; disc.hidden = true; disc.setAttribute('aria-label', 'play');
    disc.innerHTML = '<svg class="exd-ring" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle class="exd-ring-t" cx="20" cy="20" r="18.6"/><circle class="exd-ring-p" cx="20" cy="20" r="18.6" pathLength="100"/></svg><span class="exd-wind" aria-hidden="true"><span class="exd-rec"></span></span><span class="exd-gl" aria-hidden="true"></span><span class="exd-arm" aria-hidden="true"></span>';
    const who = mk('p', 'exd-who'); who.setAttribute('aria-live', 'polite');
    const attr = mk('a', 'exd-attr'); attr.target = '_blank'; attr.rel = 'noopener';
    attr.innerHTML = '<span class="exd-attr-l"></span><span class="exd-attr-s"></span>';
    const x = mk('button', 'exd-x'); x.type = 'button'; x.textContent = 'stop'; x.setAttribute('aria-label', 'stop the clip and close the player');
    const yes = mk('button', 'exd-x exd-yes'); yes.type = 'button'; yes.textContent = 'yes'; yes.hidden = true;
    const no = mk('button', 'exd-x exd-no'); no.type = 'button'; no.textContent = 'no'; no.hidden = true;
    const au = mk('button', 'exd-auto'); au.type = 'button'; au.hidden = true; au.setAttribute('role', 'switch'); au.setAttribute('aria-checked', 'false');
    au.setAttribute('aria-label', 'autoplay'); au.title = 'when a preview ends, autoplay picks who comes next, the way it did in my log';
    au.innerHTML = '<span class="exd-auto-k" aria-hidden="true"></span><span class="exd-auto-t">auto</span>';
    bar.append(disc, who, yes, no, au, attr, x);
    this.yes = yes; this.no = no; this.disc = disc; this.autoB = au;
    this.rp = disc.querySelector('.exd-ring-p'); this.wind = disc.querySelector('.exd-wind');
    yes.addEventListener('click', () => {
      let kb = false; try { kb = yes.matches(':focus-visible'); } catch (e) {}
      const a = this.asking, at = this.askAt, fam = this.askFam, opener = this.askOpener;
      this.hideAsk(true);
      const first = !consent; grantConsent(); if (first) chord();
      /* a keyboard yes lands on the player's stop, and escape from there goes back to where the ask came from */
      if (a) playQuiet(a, this.ctx, Object.assign({}, at, { via: 'ask', fam: fam || undefined, trigger: kb ? opener : null, kb }));
    });
    no.addEventListener('click', () => { declined = true; this.hideAsk(); });
    disc.addEventListener('click', () => this.press());
    au.addEventListener('click', () => {
      AUTO = !AUTO; autoSteps = 0; this.autoSeen = null; this.byDwell = false; paintAuto();
      if (AUTO) loadAuto(this.ctx);
      this.say(AUTO ? 'autoplay on. when a preview ends, the machine picks who comes next, from my log.' : '', AUTO ? 4000 : 0);
      if (AUTO && this.ended) autoNext(this.artist);
    });
    const slot = mk('div', 'exd-slot');
    /* R18: the ring that sits on spotify's own ▶ until spotify reports real playback (ios will not start without it) */
    const cue = mk('span', 'exd-cue'); cue.setAttribute('aria-hidden', 'true'); this.cueEl = cue; slot.appendChild(cue);
    const msg = mk('p', 'exd-msg'); msg.hidden = true;
    el.append(grab, bar, slot, msg);
    document.body.appendChild(el);
    x.addEventListener('click', () => this.close(true));
    this.el = el; this.slot = slot; this.who = who; this.attr = attr; this.x = x; this.msg = msg;
    /* the iframe arriving, a message line coming or going: the reserved bottom follows the dock's real height */
    if (typeof ResizeObserver === 'function') try { new ResizeObserver(() => this.measure()).observe(el); } catch (e) {}
    /* escape puts the ask away (a later rest may ask again: only "no" is a no) or closes the player */
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && (this.open || this.asking)) { e.preventDefault(); if (this.asking) this.hideAsk(); else this.close(true); } });
    /* R18: a clip a rest started keeps playing while the mouse is on its pill, so the record and the link can be reached */
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; this.hov = true; clearTimeout(DW.g); DW.g = 0; });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; this.hov = false; if (this.open && this.quiet && this.byDwell && !DW.t) graceClose(); });
    this.swipe(grab); this.swipe(bar);
    return el;
  },
  /* R18 phones: a swipe down on the handle or the bar puts the dock away (stop stays the plain way out) */
  swipe(t) {
    let id = -1, y0 = 0, t0 = 0, dy = 0;
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = -1;
      const el = this.el, v = dy / Math.max(1, performance.now() - t0), go = dy > 56 || (dy > 20 && v > 0.5);
      el.style.transition = '';
      if (go) { if (this.asking && !this.open) this.hideAsk(); else this.close(true); }
      el.style.transform = '';
      dy = 0;
    };
    t.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || id !== -1 || !coarse() || (!this.open && !this.asking)) return;
      if (e.target && e.target.closest && e.target.closest('button,a')) return;
      id = e.pointerId; y0 = e.clientY; t0 = performance.now(); dy = 0;
      try { t.setPointerCapture(id); } catch (err) {}
    });
    t.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      dy = Math.max(0, e.clientY - y0);
      if (dy > 3) { this.el.style.transition = 'none'; this.el.style.transform = 'translateY(' + Math.round(dy) + 'px)'; }
    });
    t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
  },
  /* quiet: the dock becomes a pill fixed next to (x, y). it never reserves the bottom edge, so nothing relayouts */
  setQuiet(q, at) {
    this.quiet = !!q; this.el.classList.toggle('is-quiet', this.quiet); this.el.classList.remove('is-tap', 'is-fail', 'is-card', 'is-void', 'is-cue'); this.cue = false;
    /* R9: a phone or a tablet never gets the floating pill. it sat on the card or the stars it came from */
    this.co = coarse(); this.el.classList.toggle('is-co', this.co && this.quiet);
    if (!this.quiet || this.co) { this.el.style.transform = ''; return; }
    if (at && isFinite(at.x) && isFinite(at.y)) this.place(at.x, at.y);
  },
  /* placed by transform from the top-left corner, so moving it is never a layout shift */
  place(x, y) {
    const el = this.el, to = (a, b) => { el.style.transform = 'translate3d(' + Math.round(a) + 'px,' + Math.round(b) + 'px,0)'; this.px = a; this.py = b; };
    to(x, y);
    /* one read after it is drawn, to keep the whole pill inside the window */
    requestAnimationFrame(() => {
      if (!this.quiet) return;
      const r = el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      const nx = Math.max(8, Math.min(W - r.width - 8, x)), ny = Math.max(8, Math.min(H - r.height - 8, y));
      if (nx !== x || ny !== y) to(nx, ny);
    });
  },
  ask(artist, at, o = {}) {
    /* R18: a keyboard visitor who opened the ask is put on its yes (and taken back if it goes away) */
    let kb = false;
    const ae = document.activeElement;
    if (ae && ae !== document.body && !(this.el && this.el.contains(ae))) { try { kb = ae.matches(':focus-visible'); } catch (e) {} }
    this.askOpener = kb ? ae : null; this.askFam = o.fam || '';
    this.asking = artist; this.askAt = at || null; clearTimeout(this.askTo);
    if (this.open) this.close(false);
    this.setQuiet(true, at); this.el.classList.add('is-ask');
    this.el.style.setProperty('--fam', famHex(o.fam) || famOf(artist) || '#86cbfe');
    this.setLine('play ', artist, ' from spotify?');
    this.yes.hidden = this.no.hidden = false; this.attr.hidden = true; this.x.hidden = true; this.disc.hidden = true; this.autoB.hidden = true;
    /* on a phone the yes is not the last tap: ios still wants one on spotify's own ▶, so the ask says so up front */
    this.msg.textContent = 'nothing reaches spotify until you say yes.' + (this.co ? ' then tap ▶ in its player.' : ''); this.msg.hidden = false;
    this.el.classList.remove('is-off');
    /* a keyboard visitor still on the ask keeps it: it never goes away under the focus */
    /* a phone's ask came from a deliberate hold: it waits longer than a hover's */
    this.askTo = setTimeout(() => { if (!this.el.contains(document.activeElement)) this.hideAsk(); }, this.co ? 20000 : 10000);
    this.measure();
    if (kb) try { this.yes.focus({ preventScroll: true }); } catch (e) {}
  },
  hideAsk(moving) {
    if (!this.asking) return;
    const back = this.askOpener, inside = this.el.contains(document.activeElement);
    this.asking = ''; this.askOpener = null; clearTimeout(this.askTo);
    this.el.classList.remove('is-ask', 'has-msg'); this.yes.hidden = this.no.hidden = true; this.x.hidden = false;
    this.msg.hidden = true; this.msg.textContent = '';
    if (!this.open) this.el.classList.add('is-off');
    this.measure();
    if (!moving && inside && back && back.isConnected) try { back.focus({ preventScroll: true }); } catch (e) {}
  },
  /* the browser refused to start it (ios wants a tap inside the player): show spotify's own player in the pill */
  tapToPlay(artist) {
    if (this.started || !this.open || this.failed) return;
    if (this.quiet && !this.ready) return;
    this.el.classList.add('is-tap'); this.setLine('tap ▶ to ' + (coarse() ? 'hear ' : 'play '), artist);
    this.say(''); this.setCue(this.ready && !!this.ctl);
    if (!this.tapAt) hush('off');
    requestAnimationFrame(() => { if (this.quiet && !coarse()) this.place(this.px || 8, this.py || 8); this.measure(); });
    this.track();
  },
  /* the shell keeps the wall text and every room's controls above whatever the dock is using */
  measure() {
    if (!this.el) return;
    /* the chrome hides what would draw over the player (the hint toast) while this is on */
    document.documentElement.classList.toggle('exd-open', !!(this.open || this.asking));
    if (!this.ctx) return;
    const on = this.open || (this.co && !!this.asking);
    let h = on && (!this.quiet || this.co || (this.el.classList.contains('is-tap') || this.el.classList.contains('is-fail')) && coarse()) ? Math.ceil(this.el.getBoundingClientRect().height) : 0;
    /* R9: on a phone the dock stands on the tab bar, so what it covers is its height plus its own bottom offset. read
       from the computed bottom, not the rect, which is still sliding in. (a fine pointer's deck adds its own reserve) */
    if (h && coarse()) h += Math.max(0, Math.round(parseFloat(getComputedStyle(this.el).bottom) || 0));
    if (h === this.h) return;
    this.h = h;
    if (this.ctx.reserveBottom) this.ctx.reserveBottom(h ? h + 16 : 0);
    /* the atlas card follows the wall it sits on; tell the chrome to measure again now, not on its next resize */
    try { dispatchEvent(new Event('exhibit:dockh')); } catch (e) {}
  },
  /* the words in front go when the bar is narrow; the link and the word spotify never do */
  setAttr(lead, tail, href) {
    this.attr.href = href;
    this.attr.firstChild.textContent = lead;
    this.attr.lastChild.textContent = tail;
  },
  /* the bar says what is actually true at each step: cueing, then hearing, and never hearing while nothing plays */
  say(line, hold) {
    if (!this.msg) return;
    this.holdTo = hold ? Date.now() + hold : 0;
    this.msg.textContent = line || '';
    this.msg.hidden = !line;
    this.el.classList.toggle('has-msg', !!line);
    requestAnimationFrame(() => this.measure());
  },
  /* R18: the line is a small status over the artist's name, as spelled. what a test or a screen reader reads is one
     sentence: status + name + tail */
  setLine(st, nm, tail) {
    const key = (st || '') + '\u0001' + (nm || '') + '\u0001' + (tail || '');
    if (key === this.line && this.who.firstChild) return;
    this.line = key;
    const s = document.createElement('span'); s.className = 'exd-st';
    const k = (st || '').indexOf('▶');
    if (k < 0) s.textContent = st || '';
    else { const tri = document.createElement('span'); tri.className = 'exd-tri'; tri.textContent = '▶'; s.append(st.slice(0, k), tri, st.slice(k + 1)); }
    const n = document.createElement('span'); n.className = 'exd-nm'; n.textContent = nm || ''; if (nm && nm.length > 18) n.title = nm;
    if (tail) { const t = document.createElement('span'); t.className = 'exd-tl'; t.textContent = tail; n.appendChild(t); }
    this.who.replaceChildren(s, n);
  },
  clearSlot() { this.slot.textContent = ''; this.slot.appendChild(this.cueEl); },
  show(artist, tid, keep) {
    this.hideAsk(true);
    clearTimeout(this.failTo); clearTimeout(this.endTo); this.starting(false);
    if (!keep || this.artist !== artist) { this.dur = 0; this.pos = 0; this.posAt = 0; this.prog = false; this.lastRep = 0; this.ringTo(0, 0); }
    this.artist = artist; this.ended = false; this.failed = false; this.failKind = ''; this.playingNow = false; this.lastRun = false;
    this.open = true;
    this.el.classList.remove('is-tap', 'is-fail', 'is-card', 'is-void');
    this.el.classList.toggle('is-served', this.served);
    this.el.style.setProperty('--fam', this.fam || '#86cbfe');
    /* phones: no autoplay switch. the bar is narrow, and ios wants a tap in spotify's player for every next track */
    this.disc.hidden = false; this.autoB.hidden = coarse(); paintAuto();
    /* R9: on a phone nothing starts without a tap inside the player, so the line says so from the first frame
       (just the name while the very first player is still on its way) */
    if (!this.co) this.setLine('cueing up ', artist); else if (this.ctl && this.ready) this.tapLine(); else { this.setCue(false); this.setLine('', artist); }
    /* an empty 80px box is a lie about a player being there; collapse the slot until there is an iframe in it.
       once the player is docked there is nothing to ask spotify for, so the line only belongs on the first one */
    this.el.classList.toggle('is-msg', !this.ctl);
    this.say(this.ctl ? this.note : this.quiet && !this.co ? '' : 'asking spotify for the player…');
    this.setAttr('player and artwork: ', 'spotify ↗', 'https://open.spotify.com/track/' + tid); this.attr.hidden = false;
    this.el.classList.remove('is-off');
    requestAnimationFrame(() => this.measure());
    this.track();
  },
  /* the player is in the slot: stop claiming to be fetching it, but do not claim it is playing either */
  slotted() {
    if (!this.el) return;
    this.el.classList.remove('is-msg');
    if (!this.started && !this.failed) { this.say(this.note); if (this.co && this.open) this.tapLine(); }
    requestAnimationFrame(() => this.measure());
    this.track();
  },
  tapLine() { if (this.failed) return; this.el.classList.add('is-tap'); this.setLine('tap ▶ to hear ', this.artist); this.setCue(this.ready && !!this.ctl); },
  /* logged out (always, in safari, whose iframes get no cookies) the embed plays spotify's 30 s preview, not the song:
     say so unless the embed reports a full-length track */
  hearSt() { return 'hearing ' + (this.dur > 31000 ? '' : 'a preview of '); },
  hearLine(artist) { return this.hearSt() + artist; },
  playing(artist, fresh) {
    clearTimeout(this.tapTo); this.el.classList.remove('is-tap'); this.setCue(false);
    this.setLine(this.hearSt(), artist);
    if ((fresh || this.msg.textContent !== this.note) && Date.now() > this.holdTo) this.say(this.note);
  },
  pauseLine() { this.el.classList.remove('is-tap'); this.setCue(false); this.setLine('paused on ', this.artist); },
  /* R18: the preview ran out. the record winds down, the bed comes back on that report, and the line says what happened */
  endLine() {
    if (this.ended) return;
    this.ended = true; clearTimeout(this.tapTo);
    const pre = !(this.dur > 31000);
    if (this.co) { this.el.classList.add('is-tap'); this.setLine('tap ▶ to hear ', this.artist, ' again'); this.setCue(true); }
    else { this.el.classList.remove('is-tap'); this.setCue(false); this.setLine('that was ' + (pre ? 'a preview of ' : ''), this.artist); }
    this.say(pre ? 'that was the preview. the whole song is on spotify.' : '');
    this.ringTo(1, 250);
    if (AUTO) autoNext(this.artist);
  },
  /* the embed took the request and never started. a player that is there gets a pointer at its own ▶; one that never
     arrived (a privacy browser that lets the script through and stops the frame) becomes the card */
  stalled(artist) {
    if (this.started || !this.open || this.failed) return;
    if (this.ready && this.ctl) { this.tapToPlay(artist); return; }
    this.failed = true; this.failKind = 'stall'; this.byDwell = false; this.setCue(false);
    this.setLine('could not play ', artist);
    this.say('the player never arrived. something may be blocking it. the card opens it on spotify.');
    this.cardOn(artist, this.wantTid, true);
    this.track();
  },
  fail(artist, tid) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); clearTimeout(this.mutTo); this.started = false; this.making = false;
    this.clearSlot(); this.ctl = null; this.ready = false; this.loaded = ''; this.el.classList.add('is-msg');
    this.failed = true; this.failKind = 'api'; this.byDwell = false; this.playingNow = false; this.lastRun = false; this.setCue(false);
    this.setLine('could not play ', artist);
    this.say('spotify did not load. it may be blocked on this network, or you may be offline.');
    if (tid) this.cardOn(artist, tid, true); else this.attr.hidden = true;
    hush('off', 'fail');
    /* a pill dropped where the finger was sits on top of the card it came from: on a phone it moves to the bottom dock.
       R18: a failure no longer leaves by itself after 8 s. it stays, with its reason and the link, until it is put away */
    this.el.classList.toggle('is-fail', this.quiet && coarse());
    clearTimeout(this.failTo);
    requestAnimationFrame(() => this.measure());
    this.track();
  },
  /* R18: spotify's own 'error' for this track (it cannot find or play it here): the card, and the bed back */
  dead(artist, tid) {
    if (!this.open || this.started || this.failed) return;
    clearTimeout(this.armTo); clearTimeout(this.tapTo); clearTimeout(this.mutTo);
    this.failed = true; this.failKind = 'dead'; this.byDwell = false; this.setCue(false);
    this.setLine('could not play ', artist);
    this.say('spotify cannot play this one here. the card opens it on spotify.');
    this.cardOn(artist, tid, true);
    hush('off', 'fail');
    this.track();
  },
  /* the link becomes a card of its own: one target with the artist's name and spotify's on it */
  cardOn(artist, tid, gone) {
    if (tid) this.setAttr('open ' + artist + ' on ', 'spotify ↗', 'https://open.spotify.com/track/' + tid);
    this.attr.hidden = !tid; this.disc.hidden = true; this.autoB.hidden = true;
    this.el.classList.add('is-card'); this.el.classList.toggle('is-void', !!gone);
    if (this.quiet && !this.co) requestAnimationFrame(() => this.place(this.px || 8, this.py || 8));
    requestAnimationFrame(() => this.measure());
  },
  /* a player declared missing or silent that turns up after all: take the card back and carry on */
  unfail() {
    this.failed = false; this.failKind = '';
    this.el.classList.remove('is-card', 'is-void', 'is-fail');
    this.disc.hidden = false; this.autoB.hidden = coarse(); this.say(this.note);
    this.setAttr('player and artwork: ', 'spotify ↗', this.attr.href);
    if (this.co) this.tapLine(); else this.setLine('cueing up ', this.artist);
  },
  /* the bed goes down the moment a clip is asked for, so the clip never starts over it at full level. if the clip has
     not started six seconds later (a browser that wants a tap inside the player), the bed comes back */
  arm(t0) {
    const artist = this.artist;
    this.armT = t0 || Date.now(); this.started = false; clearTimeout(this.armTo); clearTimeout(this.tapTo);
    /* R10: focus still sits in the player from the last tap there (a tap on the field moves no focus), so the next tap
       in it would raise no blur and the bed would not hear it. a new ask always comes from outside the player: take
       focus back to the page, quietly (webkit ignores blur() on a frame, so a throwaway focus target does it) */
    const pf = this.slot && this.slot.querySelector('iframe');
    if (pf && document.activeElement === pf) { try { pf.blur(); if (document.activeElement === pf) { const d = document.createElement('div'); d.tabIndex = -1; document.body.appendChild(d); d.focus({ preventScroll: true }); d.remove(); } } catch (e) {} }
    /* R9 phone dock: the tap line is already up and the bed stays until the embed really plays. the only thing left
       to watch for is a player that never arrives (a blocker that lets the script through and stops the frame) */
    if (this.co) { this.armTo = setTimeout(() => { if (this.open && !this.ready && !this.started) this.stalled(artist); }, 6000); return; }
    /* R5 watchdog fix: the bed goes down only once the id has resolved and the embed is ready; before that nothing ducks */
    if (this.ready) hush('armed');
    /* R10: a ready player answers a play within a second or so. silence past that means a blocker is eating its reports
       while it may be sounding, so the bed goes out now and waits one preview's length, rather than sitting at -24 dB
       under the clip for six seconds */
    clearTimeout(this.mutTo);
    if (this.ready) this.mutTo = setTimeout(() => { if (this.open && !this.started && this.evAt < this.armT) { hush('hot'); this.waitOut(artist); } }, 1500);
    const co = coarse();
    if (co && this.ready) this.tapTo = setTimeout(() => this.tapToPlay(artist), 1300);
    else if (this.quiet && this.ready) this.tapTo = setTimeout(() => this.tapToPlay(artist), 3500);
    this.armTo = setTimeout(() => {
      if (this.started) return;
      /* R10: spotify said nothing at all since the ask (a blocker eating its messages) while the player is there: it may be
         playing, so the bed stays out for one preview's length rather than coming back over it */
      if (this.ready && this.evAt < this.armT && !this.co) { hush('hot'); if (this.heard) this.mute(artist); this.waitOut(artist); return; }
      if (!this.tapAt) hush('off');
      if (co && this.ready) this.tapToPlay(artist);
      else this.stalled(artist);
    }, co ? 2500 : 6000);
  },
  /* R11: spotify has said nothing since the ask and the bed is out. a player that has NEVER said a word (a blocker that lets
     the frame load and eats every message) is the one case the dock gives up on: it says so and the bed comes back, the
     only way out of a dead frame. one that has talked keeps the bed out until a pause, stop, or a room change */
  /* one preview's length from the first moment the bed went out for this ask (not restarted by the 6 s check) */
  waitOut(artist) {
    if (this.hotFor === this.armT) return;
    this.hotFor = this.armT; clearTimeout(this.hotTo);
    this.hotTo = setTimeout(() => { if (this.evAt < this.armT) this.mute(artist); }, 32000);
  },
  mute(artist) {
    if (!this.open || this.started && this.heard) return;
    if (this.heard) { this.say('spotify stopped answering, so the room stays quiet until you press stop.'); return; }
    this.setLine('', 'no word from spotify');
    this.say("something may be blocking its player. the room's music is back. the card opens spotify.");
    /* the frame stays: if it is playing behind a blocker, its own pause is still there */
    this.failed = true; this.failKind = 'mute'; this.byDwell = false; this.setCue(false);
    if (this.wantTid) this.cardOn(artist, this.wantTid, false);
    hush('off', 'fail');
    this.track();
  },
  /* R18 (phones): spotify says it is starting but there is no sound yet (android buffering, or ios's blink). after 600 ms of
     that it is not a blink: the ring leaves spotify's button and the line says cueing up; 8 s more of nothing and it goes back */
  starting(on) {
    if (!on) { clearTimeout(this.startTo); this.startTo = 0; return; }
    if (this.startTo) return;
    this.startTo = setTimeout(() => {
      this.startTo = 0;
      if (!this.open || !this.lastRun || this.playingNow || this.failed) return;
      this.el.classList.remove('is-tap'); this.setCue(false); this.setLine('cueing up ', this.artist); this.track();
      this.startTo = setTimeout(() => { this.startTo = 0; if (this.open && !this.playingNow && !this.failed && !this.ended) { this.tapLine(); this.track(); } }, 8000);
    }, 600);
  },
  /* R18 (phones): a tap went into the player and spotify has said nothing for 4 s, though it has talked before. most often
     the tap missed the ▶. the room stays quiet (R11: never on silence), the ring goes back on the ▶, and the line says so */
  quietTap() {
    if (!this.open || this.started || this.failed) return;
    this.tapLine();
    this.say('no word from spotify since that tap. if it is silent, tap ▶ again, or stop.');
    this.track();
  },
  pending() { return this.open && !this.started && Date.now() - this.armT < (coarse() ? 2500 : 6000); },
  /* R18: the record. playing: pause. otherwise play, inside this click, so the browser counts it as the visitor's own
     (a paused clip resumes, a finished preview starts over) */
  press() {
    if (!this.ctl || !this.open || this.failed) return;
    this.byDwell = false; clearTimeout(DW.g); DW.g = 0;
    if (this.playingNow) { ctlDo('pause'); return; }
    nudge(this.wantTid, this.ended || this.atEnd ? 'restart' : this.started && this.prog ? 'resume' : 'play');
    /* a phone that will not take a start from outside its frame: point at spotify's own ▶ */
    if (this.co) { clearTimeout(this.tapTo); this.tapTo = setTimeout(() => { if (this.open && !this.playingNow && !this.failed) this.tapLine(); }, 1500); }
  },
  setCue(on) {
    on = !!on && this.open && !this.failed;
    if (on === this.cue) return;
    this.cue = on; this.el.classList.toggle('is-cue', on); syncBtns();
  },
  /* the ring moves on spotify's reports: each one sets where the clip will be by the next, so it glides between them */
  ringTo(frac, ms) {
    const c = this.rp; if (!c) return;
    const v = Math.max(0, Math.min(1, frac || 0));
    c.style.transition = ms > 0 && !still() ? 'stroke-dashoffset ' + Math.round(ms) + 'ms linear' : 'none';
    c.style.strokeDashoffset = String(Math.round((100 - v * 100) * 100) / 100);
  },
  /* a stopping record coasts: its wrapper turns on a little and eases out, from the angle the spin stopped at */
  windDown() { if (still() || !this.wind) return; this.windA += 120; this.wind.style.transform = 'rotate(' + this.windA + 'deg)'; },
  pop() {
    if (still() || !this.el) return;
    const el = this.el; el.classList.remove('is-pop'); clearTimeout(this.popTo);
    requestAnimationFrame(() => { el.classList.add('is-pop'); this.popTo = setTimeout(() => el.classList.remove('is-pop'), 700); });
  },
  estPos() {
    if (!this.playingNow || !this.posAt) return this.pos;
    const p = this.pos + (Date.now() - this.posAt);
    return this.dur > 0 ? Math.min(this.dur, p) : p;
  },
  clipState() {
    if (!this.open) return 'off';
    if (this.failed) return 'fail';
    if (this.playingNow) return 'playing';
    if (this.ended) return 'ended';
    if (this.prog) return 'paused';
    if (!this.ctl || !this.ready) return 'armed';
    return 'cueing';
  },
  viaOut() { const v = this.via; return v === 'dwell' || v === 'tour' || v === 'auto' ? v : 'tap'; },
  /* sm:clip: on every change of state, artist or via, and every 250 ms while playing (the position estimate) */
  emit(tick) {
    const state = this.clipState(), artist = this.artist || '', via = this.viaOut();
    const key = state + '\u0001' + artist + '\u0001' + via, changed = key !== this.ek;
    if (!changed && (!tick || Date.now() - this.tickAt < 250)) return;
    this.ek = key; this.tickAt = Date.now();
    try { dispatchEvent(new CustomEvent('sm:clip', { detail: { state, artist, position: Math.round(this.estPos()), duration: Math.round(this.dur || 0), via } })); } catch (e) {}
    if (changed) syncBtns();
    if (state === 'playing') { if (!this.tick) this.tick = setInterval(() => this.emit(true), 125); }
    else if (this.tick) { clearInterval(this.tick); this.tick = 0; }
  },
  /* the record's look follows what spotify last said; this is the one place that turns it */
  track() {
    if (!this.el) return;
    const pl = this.open && this.playingNow;
    if (pl !== this.el.classList.contains('is-playing')) { this.el.classList.toggle('is-playing', pl); if (!pl) this.windDown(); }
    if (this.disc) {
      /* on a phone the record only pauses: ios starts nothing from outside spotify's frame, so its ▶ is the only play */
      const off = pl ? false : coarse();
      if (this.disc.disabled !== off) { this.disc.disabled = off; if (off) this.disc.setAttribute('aria-hidden', 'true'); else this.disc.removeAttribute('aria-hidden'); }
      const lab = (pl ? 'pause ' : 'play ') + (this.artist || 'the clip') + (!pl && this.ended ? ' again' : '');
      if (this.disc.getAttribute('aria-label') !== lab) this.disc.setAttribute('aria-label', lab);
    }
    this.emit(false);
  },
  close(restoreFocus) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); clearTimeout(this.failTo); clearTimeout(this.inTo); clearTimeout(this.hotTo); clearTimeout(this.mutTo); clearTimeout(this.endTo); clearTimeout(this.radioTo); this.radioTo = 0; clearTimeout(DW.g); DW.g = 0; this.starting(false);
    const now = Date.now();
    /* R18: pause only a player that may be sounding: one that last reported playback, one never heard from, a desk player
       asked to play since its last report, or one tapped since then. pausing a player that holds nothing throws in
       spotify's frame (webkit: "no list was loaded") */
    if (this.ctl && (this.lastRun || !this.heard || (!coarse() && this.nudT > this.evAt && now - this.nudT < 3000) || this.tapAt > this.evAt)) ctlDo('pause');
    this.started = false; this.byDwell = false; this.hov = false; this.tapAt = 0; this.playingNow = false; this.lastRun = false; this.ended = false; this.failed = false; this.failKind = '';
    hush('off', 'close');
    if (!this.el) return;
    this.open = false; this.el.classList.remove('is-tap', 'is-fail', 'is-card', 'is-void', 'is-cue', 'has-msg'); this.cue = false; this.h = -1; if (!this.asking) this.el.classList.add('is-off'); this.msg.hidden = true; this.msg.textContent = '';
    this.measure();
    this.track();
    const back = this.lastFocus; this.lastFocus = null;
    if (restoreFocus && back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  },
};
/* a clip a rest started ends a moment after the pointer leaves, unless the pointer went to its pill */
function graceClose() {
  clearTimeout(DW.g);
  DW.g = setTimeout(() => { DW.g = 0; if (D.open && D.quiet && D.byDwell && !D.hov) D.close(false); }, 240);
}
function paintAuto() {
  const b = D.autoB; if (!b) return;
  b.setAttribute('aria-checked', AUTO ? 'true' : 'false'); b.classList.toggle('is-on', AUTO);
}
/* R18 autoplay: after this preview, the artist autoplay served next most often in my log, one not heard in this run */
function autoNext(from) {
  if (!AUTO) return;
  const A = D.ctx && D.ctx.audio;
  if (A && A.muted) return;
  if (autoSteps >= 6) { AUTO = false; paintAuto(); D.say('autoplay rests here after six. press auto to keep going.'); return; }
  loadAuto(D.ctx).then((m) => {
    if (!AUTO || !D.open || D.artist !== from || !D.ended) return;
    const seen = D.autoSeen || (D.autoSeen = new Set());
    seen.add(from);
    const pick = ((m && m.next[from]) || []).map((x) => x.b).find((b) => !seen.has(b) && hasTrackNow(b));
    if (!pick) { D.say('autoplay rests here: my log has no next artist for this one.'); return; }
    clearTimeout(D.endTo);
    D.endTo = setTimeout(() => {
      if (!AUTO || !D.open || D.artist !== from || !D.ended) return;
      autoSteps++; seen.add(pick); D.byDwell = false;
      playArtist(pick, D.ctx, null, D.quiet ? { x: D.px || 16, y: D.py || 16 } : false,
        { via: 'auto', served: true, fam: m.fam[pick], note: 'in my log, autoplay went from ' + from + ' to ' + pick + '. so does this.' }).catch(() => {});
    }, still() ? 300 : 1400);
  });
}

/* R10: a tap on spotify's own player moves focus into its frame, and this window hears blur before spotify reports
   anything (or ever does, behind a blocker). that is the moment the clip starts: the bed goes out now.
   R11: it stays out until spotify says paused or the dock closes (a tap on the artwork keeps the room quiet too: the
   dock is open and its stop is one tap away; after 4 s of nothing it says why). only a player that has never said a
   word is given up on, after a preview */
addEventListener('blur', () => setTimeout(() => {
  const f = D.slot && D.slot.querySelector('iframe');
  if (!f || !D.open || document.activeElement !== f) return;
  D.tapAt = Date.now(); hush('hot'); clearTimeout(D.inTo);
  D.byDwell = false; D.setCue(false);
  const at = D.tapAt;
  D.inTo = setTimeout(() => { if (D.tapAt === at && D.evAt < at && !D.started) { if (D.co && D.heard) D.quietTap(); else D.mute(D.artist); } }, D.heard ? 4000 : 31000);
}, 0));
/* R11: the old hot watchdog (four seconds of silence brought the bed back) is gone: silence is what a blocker or a
   throttled frame sounds like while spotify plays on. a pause said while the page was hidden lands when it is seen */
document.addEventListener('visibilitychange', () => {
  const A = D.ctx && D.ctx.audio, s = D.later;
  if (document.hidden || !s || !A || !A.clip) return;
  D.later = null; if (A.clipState === 'hot') A.clip(s);
});

/* one report from the embed: {isPaused, position, duration} */
function report(e) {
  const dat = e && e.data; if (!dat) return;
  const now = Date.now(), pos = +dat.position || 0;
  D.evAt = now; D.heard = true;
  if (dat.duration > 0) D.dur = +dat.duration;
  const dur = D.dur, end = dur > 0 && pos >= dur - 40, run = !dat.isPaused && !end, co = coarse();
  if (end && D.prog) D.atEnd = true; else if (run) D.atEnd = false;
  /* the dock is closed but the embed still plays (a pause that did not take): ask again, and keep the bed out until it
     stops. R18: a report at the very end, or ios's blink at 0, is not playing, and pausing it throws in spotify's frame */
  if (!D.open) { if (run && (pos > 0 || !co)) { ctlDo('pause'); hush('hot'); } else hush('off', 'pause'); return; }
  /* a player declared silent or missing that talks after all, or one spotify refused that plays anyway: carry on */
  if (D.failed && (D.failKind === 'mute' || D.failKind === 'stall' || (run && pos > 0))) D.unfail();
  const was = D.playingNow, wasRun = D.lastRun, prev = D.pos;
  const gap = D.lastRep ? Math.max(250, Math.min(1500, now - D.lastRep)) : 1000;
  D.lastRep = now; D.pos = pos; D.posAt = now; D.lastRun = run;
  /* a phone's "playing" needs the position past 0 (ios's blink); a desk's needs spotify saying so, not still buffering */
  D.playingNow = run && (pos > 0 || (!co && !dat.isBuffering));
  if (run) D.lastRunAt = now;
  if (D.playingNow) { if (pos > 0) D.prog = true; D.ended = false; if (D.popAt < D.armT) { D.popAt = D.armT; D.pop(); } }
  const ran = dur > 0 && pos === 0 && prev >= dur - 1500; /* a stand-in that reports the end as paused at 0 */
  if (co) {
    /* R9: "hearing" only while the embed reports real playback. ios plays for a blink and pauses at 0 when the tap
       came from outside the frame; that undoes the claim, and any pause puts the tap line back */
    if (D.playingNow) { D.starting(false); if (!D.started) { D.started = true; D.playAt = now; } D.playing(D.artist, !was); }
    else if (run) D.starting(true);
    else {
      D.starting(false);
      if (D.started && pos === 0 && now - D.playAt < 4000 && !end) D.started = false;
      /* a phone resumes only from spotify's own ▶, so a pause says where that is */
      if (was && D.prog && (end || ran)) D.endLine();
      else if (!D.ended) D.tapLine();
    }
    /* R10: playing or starting is 'hot', position 0 included (a tap in the frame starts there). the one exception is
       ios's blink: our own play() from outside the frame reports playing at 0 and pauses again, with no sound */
    const blip = run && pos === 0 && !D.tapAt && now - D.nudT < 1500;
    if (run) { if (!blip) hush('hot'); } else { D.tapAt = 0; clearTimeout(D.inTo); hush('off', 'pause'); }
  } else if (run) {
    if (!D.started) D.started = true;
    if (D.playingNow) D.playing(D.artist, !was);
    hush('hot');
  } else {
    /* the embed reports paused while it loads: that must not bring the bed back up before the clip has begun.
       R10: paused while the next one loads waits at 'armed'. R18: our own play() that flickered to playing at 0 and
       back (webkit refusing it) is not a clip that played; one that reached its end, or paused, says so */
    if (wasRun && D.started && !D.tapAt && now - D.nudT < 4000 && pos === 0 && prev === 0 && !end) { D.started = false; D.setLine('cueing up ', D.artist); }
    else if (wasRun && D.started && D.prog && (end || ran)) D.endLine();
    /* webkit refusing our play() jumps the clip to its end with no sound in between: that is a no, not a preview */
    else if (end && !D.prog) { D.started = false; D.playingNow = false; D.tapToPlay(D.artist); }
    else if (wasRun && D.started && pos > 0) D.pauseLine();
    D.tapAt = 0; clearTimeout(D.inTo);
    hush(D.pending() && D.ready && !D.el.classList.contains('is-tap') ? 'armed' : 'off', 'pause');
  }
  if (D.playingNow && dur > 0) D.ringTo((pos + gap) / dur, gap); else D.ringTo(D.ended ? 1 : D.prog && dur > 0 ? pos / dur : 0, 200);
  D.track();
  /* the embed loads paused; one nudge per uri, never a loop */
  if (dat.isPaused && D.playT && now - D.playT < 4000 && pos === 0) { D.playT = 0; setTimeout(() => { if (D.open && !D.started && !D.tapAt) { D.nudT = Date.now(); ctlDo('play'); } }, Math.max(0, D.armT + 320 - now)); }
}

/* resolve an artist to a controller playing them. `trigger` is the control that was clicked, for focus return. */
async function playArtist(artist, ctx, trigger, quiet, o = {}) {
  /* R5: no duck yet. a miss never ducks; arm() ducks once the embed is ready (the ready listener re-arms) */
  clearTimeout(DW.g); DW.g = 0;
  const t0 = Date.now();
  const ids = await loadIds(), tid = ids[artist];
  if (!tid) return 'notid';
  clearTimeout(D.radioTo); D.radioTo = 0;
  grantConsent();
  D.build(ctx); D.ctx = ctx; watchStops(ctx); loadAuto(ctx);
  const via = o.via === 'dwell' || o.via === 'tour' || o.via === 'auto' ? o.via : 'tap';
  if (via !== 'auto') { autoSteps = 0; D.autoSeen = null; }
  /* R18: the same artist, paused or finished in the open player: carry on (or start over) without a new load */
  const cont = D.open && D.artist === artist && D.loaded === tid && !!D.ctl && D.ready && !D.failed && (D.ended || (D.started && D.prog && !D.playingNow));
  const how = cont ? (D.ended || D.atEnd ? 'restart' : 'resume') : '';
  D.via = via; D.served = via === 'auto' && !!o.served; D.famName = o.fam || ''; D.fam = famHex(o.fam) || famOf(artist); D.note = o.note || '';
  D.setQuiet(!!quiet, quiet || null);
  D.msg.hidden = true; D.msg.textContent = '';
  const wasOpen = D.open;
  D.lastFocus = trigger && trigger.isConnected ? trigger : D.lastFocus;
  D.show(artist, tid, cont);
  if (!cont) D.arm(t0);
  /* a visitor who arrived by keyboard lands on the player, so escape and the stop button are one key away.
     a kiosk demo passes no trigger and never steals the focus. */
  if ((trigger || o.kb) && !wasOpen) { try { D.x.focus({ preventScroll: true }); } catch (e) {} }
  D.wantTid = tid;
  if (cont) { nudge(tid, how); return 'ok'; }
  let api;
  try { api = await loadApi(); } catch (e) { D.fail(artist, tid); return 'apifail'; }
  if (D.wantTid !== tid) return 'ok'; /* a later click already asked for someone else */
  if (D.ctl) {
    throttle(() => { if (D.wantTid !== tid || !D.ctl) return; try { if (D.loaded !== tid) { D.ctl.loadUri('spotify:track:' + tid); D.loaded = tid; D.playFor = ''; D.atEnd = false; } nudge(tid); } catch (e) { D.fail(artist, tid); } });
    return 'ok';
  }
  if (D.making) return 'ok'; /* the controller is on its way; its ready listener plays D.wantTid */
  D.making = true;
  try {
    const host = document.createElement('div'); host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'spotify player');
    D.clearSlot(); D.slot.appendChild(host);
    loads++; lastLoad = Date.now();
    api.createController(host, { uri: 'spotify:track:' + tid, height: 80, width: '100%', theme: 'dark' }, (ctl) => {
      D.ctl = ctl; D.making = false; D.loaded = tid; D.playFor = ''; D.heard = false; D.atEnd = false;
      { const fr = D.slot.querySelector('iframe'); if (fr && !fr.title) fr.title = 'spotify player'; }
      ctl.addListener('ready', () => {
        D.ready = true; if (D.failKind === 'stall') D.unfail(); D.slotted();
        /* R10: spotify's loadUri reloads the frame, and every reload says ready again. the old test here compared the
           wanted track with the first one this controller was made for, so from the second artist on each ready loaded
           again: a reload every quarter second, and the clip never started. only a track not yet loaded loads now */
        if (D.open && D.wantTid && D.wantTid !== D.loaded) { try { ctl.loadUri('spotify:track:' + D.wantTid); D.loaded = D.wantTid; D.playFor = ''; D.atEnd = false; loads++; lastLoad = Date.now(); } catch (e) {} }
        if (D.playFor !== D.loaded) nudge(D.wantTid);
        requestAnimationFrame(() => D.measure());
      });
      ctl.addListener('playback_started', () => {
        D.evAt = Date.now(); D.heard = true;
        if (!D.open) return;
        /* ios's blink after our own play() is not a start: the first report with the position past 0 is */
        if (coarse() && !D.tapAt && Date.now() - D.nudT < 1500) return;
        hush('hot');
      });
      ctl.addListener('playback_update', report);
      /* R18: spotify says it cannot find or play this track here: the card, never a dead grey box */
      ctl.addListener('error', (e) => {
        const d = (e && e.data) || {}, m = String(d.message || d.code || d.type || '');
        if (d.recoverable === false || /resolve|invalid|unavailable|not available|not found|restricted|region/i.test(m)) D.dead(D.artist, D.wantTid);
      });
    });
  } catch (e) { D.making = false; D.fail(artist, tid); return 'apifail'; }
  return 'ok';
}
/* at most one embed load per 400 ms; a burst loads only the newest request */
function throttle(fn) {
  clearTimeout(loadTo);
  const go = () => { loadTo = 0; loads++; lastLoad = Date.now(); fn(); };
  const w = lastLoad + 400 - Date.now();
  if (w <= 0) go(); else loadTo = setTimeout(go, w);
}
/* a stop change ends the quiet pill, its ask and any pending dwell (rooms also call stopPosts on leave) */
function watchStops(ctx) {
  if (stopSub || !ctx || typeof ctx.onStop !== 'function') return;
  stopSub = true;
  ctx.onStop((ev) => {
    clearTimeout(DW.t); DW.t = 0; DW.artist = ''; clearTimeout(DW.g); DW.g = 0; D.hideAsk();
    if (!D.open || !D.quiet) return;
    /* R18 radio: the tour turning the page under a listening visitor keeps the player 4 s, so the tour's artist for the new
       stop can take over (playArtist via 'tour'); with no hand-over it closes, as every other stop change does at once */
    if (ev && ev.via === 'tour' && radioOn()) { holdForTour(ctx); return; }
    D.close(false);
  });
}
/* tour.js raises active.enRoute around its own room change, so a room that stops its posts on leave can tell */
function enRoute(ctx) { try { const a = (ctx || D.ctx).tour.active; return !!(a && a.enRoute); } catch (e) { return false; } }
/* R18 radio: the player waits for the tour's hand-over until 4 s after the tour has arrived, 12 s at most */
function holdForTour(ctx) {
  clearTimeout(D.radioTo);
  const t0 = Date.now(); let last = t0;
  const end = () => {
    D.radioTo = 0; if (!D.open) return;
    const now = Date.now(); if (enRoute(ctx)) last = now;
    if (now - last < 4000 && now - t0 < 12000) { D.radioTo = setTimeout(end, 500); return; }
    D.close(false);
  };
  D.radioTo = setTimeout(end, 500);
}
/* R10: play at once. spotify's api holds a command while its frame (re)loads and sends it on ready, so the old 420 ms
   wait only made every clip later (measured: it was most of the warm start). R18: a clip at its end starts over */
function nudge(tid, how) {
  if (!D.ctl || D.wantTid !== tid || !D.open) return;
  D.arm(); D.ended = false; D.playT = D.nudT = Date.now(); D.playFor = D.loaded;
  ctlDo(how || (D.atEnd ? 'restart' : 'play'));
  D.track();
}

function grantConsent() {
  if (consent) return;
  consent = true;
  notes.forEach((n) => { if (n.isConnected) n.remove(); }); notes.clear();
}

/* rooms call this when they leave or reshuffle: the clip stops and the soundtrack comes back.
   the controller itself is kept, so the next artist starts without a second load. */
export function stopAll(ctx) {
  clearTimeout(DW.t); DW.t = 0; DW.artist = ''; clearTimeout(DW.g); DW.g = 0;
  /* R18 radio: the room the tour is leaving stops its posts too; a listening visitor's pill waits for the hand-over */
  if (D.el && D.open && D.quiet && enRoute(ctx) && radioOn()) { D.hideAsk(); holdForTour(ctx); return; }
  if (D.el) { D.hideAsk(); D.close(false); } else if (ctx && !ctx.audio.clip) ctx.audio.duck(false);
}

/* ------------------------------------------------------------------ R5 L2: quiet play and dwell */
const DW = { t: 0, artist: '', g: 0 };
/* playArtist(artist, {quiet: true, x, y}): the pill next to (x, y). before consent: the ask, and nothing else */
export async function playQuiet(artist, ctx, o = {}) {
  if (!artist) return 'notid';
  /* R18 radio: the tour and autoplay only ever change what a listening visitor hears: never an ask, never after a stop
     or a pause, and the autoplay switch, once on, wins over the tour */
  if (o.via === 'tour' || o.via === 'auto') {
    if (!radioOn() || (o.via === 'tour' && AUTO)) return 'idle';
    if (D.artist === artist && D.playingNow) { clearTimeout(D.radioTo); D.radioTo = 0; return 'same'; }
    D.byDwell = false;
    if (!(isFinite(o.x) && isFinite(o.y))) return playArtist(artist, ctx, null, D.quiet ? { x: D.px || 16, y: D.py || 16 } : false, o);
  }
  if (o.quiet === false) return consent ? playArtist(artist, ctx, o.trigger || null, false, o) : 'ask';
  const ids = await loadIds(); if (!ids[artist]) return 'notid';
  const at = isFinite(o.x) && isFinite(o.y) ? { x: +o.x, y: +o.y } : null;
  D.build(ctx); D.ctx = D.ctx || ctx; watchStops(ctx);
  if (!consent) { if (declined) return 'declined'; D.ask(artist, at, o); return 'ask'; }
  if (D.open && D.quiet && D.artist === artist && !D.failed && (D.playingNow || (!D.started && !D.ended))) return 'same';
  D.byDwell = o.via === 'dwell';
  return playArtist(artist, ctx, o.trigger || null, at || { x: 16, y: 16 }, o);
}
/* listening: a clip is playing, or the preview just ran out and the visitor has not put the player away */
function radioOn() { return consent && D.open && !D.failed && (D.playingNow || D.ended || Date.now() - D.lastRunAt < 3000); }
export function dwell(artist, ctx, o = {}) {
  if (!artist || (declined && !consent)) return;
  if (PT.held) { clearTimeout(PT.relT); PT.relT = 0; PT.held = null; }
  if (DW.t && DW.artist === artist) return;
  if (D.open && D.quiet && D.artist === artist) { clearTimeout(DW.g); DW.g = 0; return; }
  if (D.asking === artist) return;
  /* a dwell elsewhere leaves the clip a previous dwell started */
  if (D.open && D.quiet && D.byDwell) D.close(false);
  clearTimeout(DW.t); clearTimeout(DW.g); DW.g = 0; DW.artist = artist;
  const at = { x: o.x, y: o.y, via: 'dwell', fam: o.fam };
  const fire = () => {
    /* R18: a mouse on its way somewhere crosses stars; only a rest of 220 ms counts, so a passing path loads nothing */
    const calm = Date.now() - PT.at;
    if (!o.touch && calm < 220) { DW.t = setTimeout(fire, 230 - calm); return; }
    DW.t = 0; DW.artist = ''; playQuiet(artist, ctx, at).catch(() => {});
  };
  DW.t = setTimeout(fire, o.touch ? 500 : 600);
}
export function undwell(ctx, o = {}) {
  if (PT.down) { if (!PT.held || !(o && o.keep)) PT.held = { ctx, o }; return; }
  clearTimeout(DW.t); DW.t = 0; DW.artist = '';
  if (o && o.keep) return;
  if (D.open && D.quiet && D.byDwell) { if (coarse()) D.close(false); else graceClose(); }
}
export function postState() {
  return { consent, declined, quiet: D.quiet, open: D.open, asking: D.asking, artist: D.artist, started: D.started, loads, pending: !!DW.t, ready: D.ready,
    state: D.clipState(), position: Math.round(D.estPos()), duration: Math.round(D.dur || 0), via: D.viaOut(), playing: D.open && D.playingNow, cue: D.cue, ended: D.ended, auto: AUTO, failed: D.failed };
}

/* play an artist with no control in the room: kiosk demos only, and only after a visitor has consented once. */
export function playClip(artist, ctx) {
  if (!consent) return Promise.resolve(false);
  return playArtist(artist, ctx, null, false, { via: 'auto' }).then((r) => r === 'ok').catch(() => false);
}

/* R18: each "hear <artist>" control says what the player is doing with its artist */
function paintBtn(rec) {
  const { btn, artist } = rec;
  if (btn.isConnected) rec.seen = true;
  if (rec.busy) return;
  const t = btn.querySelector('.post-t'), ico = btn.querySelector('.post-ico'); if (!t || !ico) return;
  const st = D.open && D.artist === artist ? D.clipState() : 'off';
  let text = rec.label(), icon = '▶', aria = 'hear a clip of ' + artist + ' in the player at the bottom of the screen', on = false;
  if (st === 'playing') { text = 'hearing ' + artist; icon = '❚❚'; aria = 'pause ' + artist; on = true; }
  else if (st === 'armed' || st === 'cueing') { text = D.cue ? 'tap ▶ in the player' : 'cueing up ' + artist; on = true; }
  else if (st === 'paused') { text = 'paused on ' + artist; aria = 'play ' + artist; }
  else if (st === 'ended') { text = 'hear ' + artist + ' again'; aria = text; }
  else if (st === 'fail') text = 'could not play ' + artist;
  if (t.textContent !== text) t.textContent = text;
  if (ico.textContent !== icon) ico.textContent = icon;
  if (btn.getAttribute('aria-label') !== aria) btn.setAttribute('aria-label', aria);
  btn.classList.toggle('is-on', on);
}
function syncBtns() { BTNS.forEach((r) => { if (!r.btn.isConnected && r.seen) { BTNS.delete(r); return; } paintBtn(r); }); }

/* build a post control for `artist` inside `host`. returns the root element. */
export function post(host, artist, ctx, opts = {}) {
  const root = document.createElement('div'); root.className = 'post';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'post-btn';
  btn.innerHTML = '<span class="post-ico" aria-hidden="true">&#9654;</span><span class="post-t"></span>';
  const label = () => (opts.label || 'hear') + ' ' + artist;
  const rec = { btn, artist, label, busy: false, seen: false };
  btn.querySelector('.post-t').textContent = label();
  btn.setAttribute('aria-label', 'hear a clip of ' + artist + ' in the player at the bottom of the screen');
  root.appendChild(btn);
  BTNS.add(rec);
  if (!consent) {
    const nh = opts.noteHost || root;
    if (!noted.has(nh)) {
      noted.add(nh);
      const n = document.createElement('p'); n.className = 'post-note';
      n.textContent = 'the first one of these loads a player from spotify. nothing reaches them until you ' + (coarse() ? 'tap.' : 'click.');
      nh.appendChild(n); notes.add(n);
    }
  }
  host.appendChild(root);
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    /* R18: the player already holds this artist: the control is its pause and play, inside this click */
    if (D.open && D.artist === artist && D.ctl && D.ready && !D.failed) { D.press(); return; }
    if (!consent) chord(ctx);
    btn.disabled = true; rec.busy = true; btn.querySelector('.post-t').textContent = 'cueing up ' + artist;
    let r = 'notid';
    try { r = await playArtist(artist, ctx, btn, false, { via: 'post', fam: opts.fam }); } catch (e) { r = 'notid'; }
    btn.disabled = false; rec.busy = false;
    paintBtn(rec);
    /* a blocked player is the dock's story to tell; only an artist with no track in my log loses its control */
    if (r !== 'notid') return;
    BTNS.delete(rec);
    root.textContent = '';
    const p = document.createElement('p'); p.className = 'post-note'; p.textContent = artist + ' (not available to play here)';
    root.appendChild(p); if (!D.open) hush('off');
  });
  return root;
}

const MONO = '"JetBrains Mono",ui-monospace,monospace';
const SERIF = 'var(--serif-voice,ui-serif,"Iowan Old Style",Palatino,Charter,Georgia,serif)';
/* the little record, drawn once: grooves and the family label */
const REC = 'radial-gradient(circle,var(--fam,#86cbfe) 0 22%,#0a0118 23% 27%,transparent 28%),repeating-radial-gradient(circle,#0d0a1a 0 1px,#221c3a 1px 2px)';
export const postCSS = `
.post{margin:8px 0;max-width:420px}
.post-btn{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid rgba(189,166,255,.3);background:rgba(10,1,24,.6);color:#f0eaff;font:600 12px/1.2 ${MONO};letter-spacing:.06em;cursor:pointer}
.post-btn:hover{border-color:#86cbfe}.post-btn:focus-visible{outline:2px solid #86cbfe;outline-offset:3px}
.post-btn[disabled]{opacity:.6;cursor:default}
.post-btn.is-on{border-color:#86cbfe;box-shadow:0 0 0 1px rgba(134,203,254,.22),0 0 18px rgba(134,203,254,.16)}
.post-ico{color:#86cbfe;font-size:10px}
.post-note,.post-attr{display:block;margin:8px 2px 0;font:400 11.5px/1.5 ${MONO};color:#a49bbd;text-decoration:none}
.post-attr:hover{color:#86cbfe}
.post iframe{border-radius:12px;display:block}
.exd{position:fixed;left:max(10px,env(safe-area-inset-left));right:calc(max(10px,env(safe-area-inset-right)) + 46px);bottom:calc(8px + env(safe-area-inset-bottom));z-index:6;max-width:540px;margin:0 auto;padding:7px 11px 10px;border-radius:14px;border:1px solid rgba(189,166,255,.3);background:rgba(10,1,24,.88);box-shadow:0 12px 40px rgba(0,0,0,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .34s ease,opacity .34s ease,visibility 0s}
.exd.is-off{transform:translateY(135%);opacity:0;visibility:hidden;pointer-events:none;transition:transform .34s ease,opacity .34s ease,visibility 0s linear .34s}
.exd-grab{display:none}
.exd-bar{display:flex;align-items:center;gap:10px;margin:0 0 7px;font:600 10.5px/1.3 ${MONO};letter-spacing:.09em}
.exd-who{margin:0;flex:1 1 auto;min-width:0;overflow:hidden;color:#f0eaff}
.exd-st,.exd-nm{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.exd-st{margin:0 0 1px;font:600 8.5px/1.3 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:#a49bbd}
.exd-st:empty{display:none}
.exd-nm{font:italic 400 14px/1.2 ${SERIF};letter-spacing:0;color:#f0eaff}
.exd-tl{font:600 10.5px/1.3 ${MONO};font-style:normal;letter-spacing:.09em}
.exd-tri{color:#86cbfe}
.exd.is-playing .exd-st{color:#86cbfe}
.exd.is-served .exd-st{color:#b9a6f0}
.exd.is-ask .exd-who{white-space:normal}
.exd.is-ask .exd-st,.exd.is-ask .exd-nm{display:inline;white-space:normal}
.exd.is-ask .exd-st{font:inherit;letter-spacing:inherit;text-transform:none;color:#f0eaff}
.exd.is-ask .exd-bar::before{content:'';flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:${REC};box-shadow:0 0 0 1px rgba(134,203,254,.35)}
.exd-attr{flex:0 0 auto;color:#a49bbd;text-decoration:none;font-weight:500;letter-spacing:.06em}
.exd-attr:hover{color:#86cbfe}
#exdock .exd-attr[hidden]{display:none}
.exd-x{flex:0 0 auto;font:600 10.5px/1 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:#f0eaff;background:none;border:1px solid rgba(189,166,255,.34);border-radius:999px;padding:9px 13px;min-height:34px;cursor:pointer}
.exd-x:hover{border-color:#86cbfe;color:#86cbfe}
.exd-x:focus-visible,.exd-attr:focus-visible{outline:2px solid #86cbfe;outline-offset:3px}
.exd-x.exd-yes{background:#86cbfe;border-color:#86cbfe;color:#0a0118}
.exd-x.exd-yes:hover{background:#b5ddff;border-color:#b5ddff;color:#0a0118}
.exd-slot{position:relative;min-height:80px}
.exd.is-msg .exd-slot{min-height:0}
.exd.is-void .exd-slot{display:none}
.exd-attr-l,.exd-attr-s{pointer-events:none}
.exd iframe{border-radius:10px;display:block;border:0}
.exd-msg{margin:6px 2px 2px;font:400 11.5px/1.5 ${MONO};color:#a49bbd}
/* R18 the record: ring = progress, grooves turn only while spotify reports playback, the label is the family colour */
.exd-disc{position:relative;flex:0 0 auto;width:34px;height:34px;margin:0;padding:0;border:0;border-radius:50%;background:none;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.exd-disc[hidden],.exd-auto[hidden]{display:none}
.exd-disc:focus-visible{outline:2px solid #86cbfe;outline-offset:2px}
.exd-disc:disabled{cursor:default}
.exd-disc:disabled .exd-gl{opacity:0}
.exd-ring{position:absolute;left:0;top:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible;pointer-events:none}
.exd-ring circle{fill:none;stroke-width:1.7}
.exd-ring-t{stroke:rgba(134,203,254,.16)}
.exd-ring-p{stroke:#86cbfe;stroke-dasharray:100;stroke-dashoffset:100;stroke-linecap:round}
.exd.is-served .exd-ring-p{stroke:#8b6fd6}
.exd-wind{position:absolute;inset:4px;border-radius:50%;transition:transform 1.4s cubic-bezier(.3,.7,.4,1)}
.exd-rec{position:absolute;inset:0;border-radius:50%;background:repeating-radial-gradient(circle,#0d0a1a 0 1px,#1d1834 1px 2px);box-shadow:inset 0 0 0 1px rgba(240,234,255,.08);animation:exd-spin 1.8s linear infinite;animation-play-state:paused}
.exd.is-playing .exd-rec{animation-play-state:running}
.exd-rec::before{content:'';position:absolute;inset:27%;border-radius:50%;background:conic-gradient(var(--fam,#86cbfe) 0 300deg,rgba(10,1,24,.5) 300deg 360deg)}
.exd-disc::after{content:'';position:absolute;inset:4px;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,0) 42%,rgba(255,255,255,0) 58%,rgba(255,255,255,.07));pointer-events:none}
.exd-gl{position:absolute;left:50%;top:50%;width:0;height:0;margin:-4px 0 0 -2px;border-style:solid;border-width:4px 0 4px 6.5px;border-color:transparent transparent transparent #0a0118;pointer-events:none;transition:opacity .15s}
.exd.is-playing .exd-gl{width:6px;height:8px;margin:-4px 0 0 -3px;border:0;background:linear-gradient(90deg,#0a0118 0 2px,transparent 2px 4px,#0a0118 4px 6px);opacity:0}
.exd.is-playing .exd-disc:hover .exd-gl,.exd.is-playing .exd-disc:focus-visible .exd-gl{opacity:1}
.exd-arm{position:absolute;right:1px;top:1px;width:2px;height:16px;border-radius:1px;background:linear-gradient(#e6ecf5,#8f98ab);transform-origin:50% 1px;transform:rotate(-10deg);transition:transform .5s cubic-bezier(.3,.7,.4,1);pointer-events:none;box-shadow:0 0 2px rgba(0,0,0,.6)}
.exd-arm::before{content:'';position:absolute;left:-1.5px;top:-1.5px;width:5px;height:5px;border-radius:50%;background:#b8c0d0}
.exd-arm::after{content:'';position:absolute;left:-1px;bottom:-2px;width:4px;height:4px;border-radius:1px;background:#e6ecf5}
.exd.is-playing .exd-arm{transform:rotate(24deg)}
@keyframes exd-spin{to{transform:rotate(360deg)}}
@keyframes exd-pop{0%{transform:scale(1)}35%{transform:scale(1.13)}65%{transform:scale(.97)}100%{transform:scale(1)}}
@keyframes exd-wob{0%,100%{transform:none}30%{transform:rotate(-2deg) translateY(-1px)}60%{transform:rotate(1.2deg)}}
.exd.is-pop .exd-disc{animation:exd-pop .6s cubic-bezier(.3,1.5,.5,1)}
.exd.is-pop .exd-nm{animation:exd-wob .6s ease-out;transform-origin:0 70%}
/* R18 the cue: a ring on spotify's own ▶ (the compact dark player draws its play 26 px in from the right, 56 px down) */
.exd-cue{display:none;position:absolute;right:4px;top:34px;width:44px;height:44px;z-index:1;border-radius:50%;pointer-events:none}
.exd.is-cue .exd-cue{display:block}
.exd-cue::before,.exd-cue::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid #86cbfe;box-sizing:border-box;opacity:0;animation:exd-cue 1.6s ease-out .45s infinite}
.exd-cue::after{animation-delay:1.25s}
@keyframes exd-cue{0%{transform:scale(.6);opacity:.95}100%{transform:scale(1.3);opacity:0}}
@keyframes exd-tri{0%,100%{opacity:1}50%{opacity:.45}}
.exd.is-cue .exd-tri{animation:exd-tri 1.6s ease-in-out .45s infinite}
/* R18 autoplay: violet, because violet is the machine serving */
.exd-auto{flex:0 0 auto;display:inline-flex;flex-direction:column;align-items:center;gap:3px;min-width:30px;margin:0;padding:3px 2px;background:none;border:0;border-radius:6px;color:#a49bbd;font:600 8px/1 ${MONO};letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
.exd-auto-k{position:relative;display:block;width:22px;height:12px;box-sizing:border-box;border-radius:6px;border:1px solid rgba(189,166,255,.45)}
.exd-auto-k::after{content:'';position:absolute;top:2px;left:2px;width:6px;height:6px;border-radius:50%;background:#a49bbd;transition:transform .2s ease}
.exd-auto.is-on{color:#c7b8ff}
.exd-auto.is-on .exd-auto-k{border-color:#8b6fd6;background:rgba(139,111,214,.35)}
.exd-auto.is-on .exd-auto-k::after{transform:translateX(10px);background:#c7b8ff}
.exd-auto:hover{color:#c7b8ff}
.exd-auto:focus-visible{outline:2px solid #86cbfe;outline-offset:2px}
/* R18 the card: a player that is blocked or silent becomes one link with the artist's name, and stays until put away */
.exd.is-card .exd-bar{flex-wrap:wrap;row-gap:6px}
#exdock.exd.is-card .exd-who{flex:1 1 0;width:auto;max-width:none;white-space:normal}
#exdock.exd.is-card .exd-st,#exdock.exd.is-card .exd-nm{white-space:normal}
#exdock.exd.is-card .exd-attr{order:5;flex:1 1 100%;display:flex;align-items:center;gap:10px;min-height:44px;box-sizing:border-box;margin:0;padding:6px 12px;border:1px solid rgba(134,203,254,.42);border-radius:10px;background:rgba(134,203,254,.06);color:#f0eaff;font:600 10.5px/1.3 ${MONO};letter-spacing:.06em}
#exdock.exd.is-card .exd-attr::before{content:'';flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:${REC};box-shadow:0 0 0 1px rgba(134,203,254,.35)}
#exdock.exd.is-card .exd-attr:hover{border-color:#86cbfe;color:#86cbfe}
#exdock.exd.is-card .exd-attr-l{display:inline}
#exdock.exd.is-card .exd-attr[hidden]{display:none}
@media (max-width:460px){.exd{padding:6px 8px 8px}.exd-attr-l{display:none}.exd-bar{gap:8px;margin-bottom:5px}}
/* a phone held sideways: the stage takes the right of the screen and a room's controls can run past its bottom edge,
   so the dock leaves that half alone entirely and sits under the wall text on the left */
@media (max-height:520px) and (min-aspect-ratio:115/100){.exd{right:auto;margin:0;width:min(400px,40vw);max-width:none;padding:5px 9px 7px}.exd-attr-l{display:none}}
@media (prefers-reduced-motion:reduce){.exd{transition:none}}
/* #exdock: beats chrome.css's html.atlas #exdock{bottom} so the pill is never stretched to the bottom edge. it shows at
   once (focus can land on it) and fades out */
#exdock.exd.is-quiet{left:0;top:0;right:auto;bottom:auto;margin:0;width:auto;max-width:min(404px,calc(100vw - 16px));padding:4px 5px 4px 6px;border-radius:999px;border-color:rgba(134,203,254,.45);transition:opacity .2s ease,visibility 0s}
#exdock.exd.is-quiet.is-off{transition:opacity .2s ease,visibility 0s linear .2s}
#exdock.exd.is-quiet.is-playing{box-shadow:0 0 0 1px rgba(134,203,254,.2),0 0 24px rgba(134,203,254,.12),0 12px 40px rgba(0,0,0,.5)}
.exd.is-quiet .exd-bar{margin:0;gap:8px}
.exd.is-quiet .exd-who{flex:0 1 auto;width:176px} /* fixed: 'cueing up x' -> 'hearing a preview of x' never moves the buttons beside it (CLS 0) */
.exd.is-quiet.is-ask .exd-who{flex:1 1 auto;width:auto;max-width:210px;white-space:normal}
.exd.is-quiet .exd-attr-l{display:none}
.exd.is-quiet .exd-x{min-height:26px;padding:6px 10px}
.exd.is-quiet .exd-slot{position:absolute;left:0;top:0;width:300px;height:80px;min-height:0;overflow:hidden;opacity:.001;pointer-events:none}
.exd.is-quiet .exd-msg{display:none}
#exdock.exd.is-quiet.is-ask,#exdock.exd.is-quiet.is-tap,#exdock.exd.is-quiet.is-fail,#exdock.exd.is-quiet.is-card,#exdock.exd.is-quiet.has-msg{border-radius:14px}
#exdock.exd.is-quiet.is-ask,#exdock.exd.is-quiet.is-tap,#exdock.exd.is-quiet.is-fail,#exdock.exd.is-quiet.is-card{padding:6px 8px 7px 12px}
.exd.is-quiet.is-ask .exd-msg{display:block;margin:4px 0 0;font-size:10.5px}
#exdock.exd.is-quiet.has-msg:not(.is-ask) .exd-msg:not([hidden]){display:block;max-width:384px;margin:5px 2px 1px;font-size:10.5px}
#exdock.exd.is-quiet:not(.is-co).is-tap,#exdock.exd.is-quiet:not(.is-co).is-card{width:min(340px,calc(100vw - 16px))}
.exd.is-quiet.is-tap .exd-slot{position:relative;left:auto;top:auto;width:auto;height:auto;min-height:80px;margin-top:6px;opacity:1;pointer-events:auto}
@media (pointer:coarse){
.exd.is-quiet.is-tap .exd-attr-l{display:none}
.exd-x{min-height:44px;min-width:44px}
.exd.is-quiet .exd-x{min-height:44px;padding:6px 10px}
.exd-bar{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}
#exdock .exd-grab{display:block;width:36px;height:4px;margin:-5px auto 1px;padding:5px 24px;box-sizing:content-box;border-radius:999px;background:rgba(189,166,255,.38);background-clip:content-box;touch-action:none}
.exd-disc{width:44px;height:44px;margin:-4px 0}
.exd-wind,.exd-disc::after{inset:5px}
.exd-arm{height:21px}
.exd-gl{transform:scale(1.3)}
.exd.is-playing .exd-gl{opacity:.85}
.exd-auto{min-height:44px;min-width:40px;justify-content:center}
#exdock .exd-attr{padding:15px 4px;margin:-15px 0}
#exdock.exd.is-card .exd-attr{padding:6px 12px;margin:0}
.exd:not(.is-ask):not(.is-card) .exd-nm{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
}
/* R9 phone dock (is-co: a quiet play on a coarse pointer). one place for the ask, the player and a failure: the bottom
   edge, above the tab bar, never over a card. it slides in like the docked player and reserves its height (measure()) */
#exdock.exd.is-co{left:max(10px,env(safe-area-inset-left));right:calc(max(10px,env(safe-area-inset-right)) + 46px);top:auto;bottom:var(--atlas-dockh,calc(8px + env(safe-area-inset-bottom)));width:auto;max-width:540px;margin:0 auto;padding:7px 8px 9px 10px;border-radius:14px;transform:none;transition:transform .3s ease,opacity .3s ease,visibility 0s}
html.atlas #exdock.exd.is-co{right:max(10px,env(safe-area-inset-right));bottom:calc(var(--atlas-dockh,0px) + 6px)}
#exdock.exd.is-co.is-off{transform:translateY(135%);transition:transform .3s ease,opacity .3s ease,visibility 0s linear .3s}
#exdock.exd.is-co .exd-who,#exdock.exd.is-co.is-ask .exd-who{flex:1 1 auto;width:auto;max-width:none}
#exdock.exd.is-co .exd-slot{position:relative;left:auto;top:auto;width:auto;height:auto;min-height:80px;margin-top:6px;opacity:1;pointer-events:auto}
#exdock.exd.is-co.is-ask .exd-slot{position:absolute;left:0;top:0;width:300px;height:80px;min-height:0;margin:0;overflow:hidden;opacity:.001;pointer-events:none}
#exdock.exd.is-co .exd-msg:not([hidden]){display:block;margin:5px 0 0;font-size:11px}
/* while the first player is on its way (or after a failure) the box keeps the player's height and the line sits in it,
   so the dock never grows under the room it just moved */
#exdock.exd.is-co.is-msg:not(.is-ask) .exd-slot{opacity:.001;pointer-events:none}
#exdock.exd.is-co.is-msg:not(.is-ask) .exd-msg:not([hidden]){position:absolute;left:12px;right:12px;bottom:9px;min-height:80px;margin:0;padding:10px 12px;box-sizing:border-box;border:1px dashed rgba(189,166,255,.22);border-radius:10px}
#exdock.exd.is-co.is-msg.is-card:not(.is-ask) .exd-msg:not([hidden]){position:static;min-height:0;margin:6px 2px 0;padding:0;border:0}
#exdock.exd.is-co.is-tap{border-color:rgba(134,203,254,.6);box-shadow:0 0 0 1px rgba(134,203,254,.18),0 0 28px rgba(134,203,254,.16),0 12px 40px rgba(0,0,0,.5)}
@media (max-height:520px) and (min-aspect-ratio:115/100){#exdock.exd.is-co{right:auto;margin:0;width:min(400px,40vw);max-width:none;padding:5px 8px 7px 10px}#exdock.exd.is-co .exd-slot{margin-top:4px}}
/* a phone held sideways in the atlas: the left column is the card, which does not move for the dock; the stage on the
   right does (stage() takes the reserve off its bottom), so the dock sits under the stage, right-aligned */
@media (pointer:coarse) and (max-height:520px) and (min-aspect-ratio:115/100){html.atlas #exdock.exd.is-co,html.atlas #exdock.exd:not(.is-quiet){left:auto;right:max(10px,env(safe-area-inset-right));width:min(420px,calc(100vw - 330px));max-width:none;margin:0;padding:5px 8px 7px 10px}}
/* sideways the screen has 390px of height: the words and stop sit beside the player, not above it, so the dock is
   one player tall and the stage keeps the difference */
@media (pointer:coarse) and (max-height:520px) and (min-aspect-ratio:115/100){#exdock .exd-grab{display:none}.exd-disc{width:36px;height:36px;margin:0}.exd-wind,.exd-disc::after{inset:4px}#exdock.exd.is-co{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,60%);column-gap:10px;align-items:center}#exdock.exd.is-co .exd-bar{grid-column:1;grid-row:1;flex-wrap:wrap;row-gap:4px;margin:0}#exdock.exd.is-co .exd-who{flex:1 1 calc(100% - 52px)}#exdock.exd.is-co .exd-slot,#exdock.exd.is-co .exd-msg:not([hidden]){grid-column:2;grid-row:1;margin:0}#exdock.exd.is-co.is-msg:not(.is-ask) .exd-msg:not([hidden]){left:auto;right:8px;top:5px;bottom:7px;width:calc(60% - 12px);min-height:0;overflow:auto}}
@media (prefers-reduced-motion:reduce){#exdock.exd.is-co{transition:none}.exd-rec{animation:none}.exd.is-playing .exd-rec{box-shadow:inset 0 0 0 1px rgba(240,234,255,.08),0 0 0 2px rgba(134,203,254,.5),0 0 10px rgba(134,203,254,.45)}.exd-wind,.exd-arm,.exd-auto-k::after,.exd-gl{transition:none}.exd.is-pop .exd-disc,.exd.is-pop .exd-nm,.exd.is-cue .exd-tri{animation:none}.exd-cue::before{animation:none;opacity:.9;transform:none}.exd-cue::after{display:none}}
@media (forced-colors:active){.exd.is-quiet{border:1px solid CanvasText}.exd-disc{border:1px solid ButtonText}.exd-cue::before{border-color:Highlight}.exd-auto-k{border-color:ButtonText}.exd-auto.is-on .exd-auto-k::after{background:Highlight}}
`;
