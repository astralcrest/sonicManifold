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
   resolved and the embed is ready; at most one load per 400 ms. API: R5/L1/API.md */

let tidByArtist = null, apiPromise = null, apiReady = null;
let consent = false;                 /* true the moment a visitor has clicked one listening post */
let declined = false;                /* the visitor said no to the pill's ask: dwells never ask again this visit */
let IDS = null, loads = 0, lastLoad = -1e9, loadTo = 0, stopSub = false;
const notes = new Set();             /* the privacy notes on screen, cleared the moment consent is given */
const noted = new WeakSet();         /* hosts that already carry one */

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
  playArtist(D.artist, D.ctx, null, D.quiet).catch(() => {});
}

/* ------------------------------------------------------------------ the dock */
const D = {
  el: null, slot: null, who: null, attr: null, x: null, msg: null,
  ctl: null, wantTid: '', artist: '', open: false, lastFocus: null, ctx: null, playT: 0, h: 0, armT: 0, started: false, armTo: 0,
  quiet: false, ready: false, byDwell: false, asking: '', askTo: 0, askAt: null, yes: null, no: null, tapTo: 0,
  build(ctx) {
    if (this.el) return this.el;
    this.ctx = ctx;
    const el = document.createElement('aside');
    el.className = 'exd is-off'; el.id = 'exdock'; el.setAttribute('aria-label', 'listening post');
    const bar = document.createElement('div'); bar.className = 'exd-bar';
    const who = document.createElement('p'); who.className = 'exd-who'; who.setAttribute('aria-live', 'polite');
    const attr = document.createElement('a'); attr.className = 'exd-attr'; attr.target = '_blank'; attr.rel = 'noopener';
    attr.innerHTML = '<span class="exd-attr-l"></span><span class="exd-attr-s"></span>';
    const x = document.createElement('button'); x.type = 'button'; x.className = 'exd-x'; x.textContent = 'stop'; x.setAttribute('aria-label', 'stop the clip and close the player');
    const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'exd-x exd-yes'; yes.textContent = 'yes'; yes.hidden = true;
    const no = document.createElement('button'); no.type = 'button'; no.className = 'exd-x exd-no'; no.textContent = 'no'; no.hidden = true;
    bar.appendChild(who); bar.appendChild(yes); bar.appendChild(no); bar.appendChild(attr); bar.appendChild(x);
    this.yes = yes; this.no = no;
    yes.addEventListener('click', () => {
      const a = this.asking, at = this.askAt, kb = document.activeElement === yes;
      this.hideAsk(); grantConsent(); if (a) playQuiet(a, this.ctx, Object.assign({}, at, { via: 'ask' }));
      if (kb) try { this.x.focus({ preventScroll: true }); } catch (e) {} /* the button that had focus is gone: stop is the next thing */
    });
    no.addEventListener('click', () => { declined = true; this.hideAsk(); });
    const slot = document.createElement('div'); slot.className = 'exd-slot';
    const msg = document.createElement('p'); msg.className = 'exd-msg'; msg.hidden = true;
    el.appendChild(bar); el.appendChild(slot); el.appendChild(msg);
    document.body.appendChild(el);
    x.addEventListener('click', () => this.close(true));
    this.el = el; this.slot = slot; this.who = who; this.attr = attr; this.x = x; this.msg = msg;
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && (this.open || this.asking)) { e.preventDefault(); if (this.asking) this.hideAsk(); else this.close(true); } });
    return el;
  },
  /* quiet: the dock becomes a pill fixed next to (x, y). it never reserves the bottom edge, so nothing relayouts */
  setQuiet(q, at) {
    this.quiet = !!q; this.el.classList.toggle('is-quiet', this.quiet); this.el.classList.remove('is-tap');
    if (!this.quiet) { this.el.style.transform = ''; return; }
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
  ask(artist, at) {
    this.asking = artist; this.askAt = at || null; clearTimeout(this.askTo);
    if (this.open) this.close(false);
    this.setQuiet(true, at); this.el.classList.add('is-ask');
    this.who.textContent = 'play ' + artist + ' from spotify?';
    this.yes.hidden = this.no.hidden = false; this.attr.hidden = true; this.x.hidden = true;
    this.msg.textContent = 'nothing reaches spotify until you say yes.'; this.msg.hidden = false;
    this.el.classList.remove('is-off');
    this.askTo = setTimeout(() => this.hideAsk(), 10000);
  },
  hideAsk() {
    if (!this.asking) return;
    this.asking = ''; clearTimeout(this.askTo);
    this.el.classList.remove('is-ask'); this.yes.hidden = this.no.hidden = true; this.x.hidden = false;
    this.msg.hidden = true; this.msg.textContent = '';
    if (!this.open) this.el.classList.add('is-off');
  },
  /* the browser refused to start it (ios wants a tap inside the player): show spotify's own player in the pill */
  tapToPlay(artist) {
    if (this.started || !this.open || !this.quiet) return;
    this.el.classList.add('is-tap'); this.who.textContent = 'tap ▶ to play ' + artist;
    if (this.ctx) this.ctx.audio.duck(false);
    requestAnimationFrame(() => { if (this.quiet) this.place(this.px || 8, this.py || 8); });
  },
  /* the shell keeps the wall text and every room's controls above whatever the dock is using */
  measure() {
    if (!this.el || !this.ctx) return;
    const h = this.open && !this.quiet ? Math.ceil(this.el.getBoundingClientRect().height) : 0;
    if (h === this.h) return;
    this.h = h;
    if (this.ctx.reserveBottom) this.ctx.reserveBottom(h ? h + 16 : 0);
  },
  /* the words in front go when the bar is narrow; the link and the word spotify never do */
  setAttr(lead, tail, href) {
    this.attr.href = href;
    this.attr.firstChild.textContent = lead;
    this.attr.lastChild.textContent = tail;
  },
  /* the bar says what is actually true at each step: loading, then hearing, and never hearing while nothing plays */
  say(line) {
    if (!this.msg) return;
    this.msg.textContent = line || '';
    this.msg.hidden = !line;
    requestAnimationFrame(() => this.measure());
  },
  show(artist, tid) {
    this.hideAsk();
    this.artist = artist; this.who.textContent = 'loading ' + artist;
    /* an empty 80px box is a lie about a player being there; collapse the slot until there is an iframe in it.
       once the player is docked there is nothing to ask spotify for, so the line only belongs on the first one */
    this.el.classList.toggle('is-msg', !this.ctl);
    this.say(this.ctl ? '' : 'asking spotify for the player…');
    this.setAttr('player and artwork: ', 'spotify ↗', 'https://open.spotify.com/track/' + tid); this.attr.hidden = false;
    this.el.classList.remove('is-off'); this.open = true;
    requestAnimationFrame(() => this.measure());
  },
  /* the player is in the slot: stop claiming to be fetching it, but do not claim it is playing either */
  slotted() {
    if (!this.el) return;
    this.el.classList.remove('is-msg');
    if (!this.started) this.say('');
    requestAnimationFrame(() => this.measure());
  },
  playing(artist) {
    clearTimeout(this.tapTo); this.el.classList.remove('is-tap');
    this.who.textContent = 'hearing ' + artist; this.say('');
  },
  /* the embed took the request and never started: a privacy browser that loads the frame and then blocks it */
  stalled(artist) {
    if (this.started || !this.open) return;
    this.who.textContent = 'could not play ' + artist;
    this.say('the player loaded but did not start. your browser may be blocking it. the link above opens the track on spotify.');
  },
  fail(artist, tid) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); this.started = false; this.making = false;
    this.slot.textContent = ''; this.ctl = null; this.el.classList.add('is-msg');
    this.who.textContent = 'could not play ' + artist;
    this.msg.hidden = false;
    this.msg.textContent = 'spotify did not load. it may be blocked on this network, or you may be offline.';
    if (tid) { this.setAttr('open ' + artist + ' on ', 'spotify ↗', 'https://open.spotify.com/track/' + tid); this.attr.hidden = false; }
    else this.attr.hidden = true;
    if (this.ctx) this.ctx.audio.duck(false);
    requestAnimationFrame(() => this.measure());
  },
  /* the bed goes down the moment a clip is asked for, so the clip never starts over it at full level. if the clip has
     not started six seconds later (a browser that wants a tap inside the player), the bed comes back */
  arm(t0) {
    const artist = this.artist;
    this.armT = t0 || Date.now(); this.started = false; clearTimeout(this.armTo); clearTimeout(this.tapTo);
    /* R5 watchdog fix: the bed goes down only once the id has resolved and the embed is ready; before that nothing ducks */
    if (this.ctx && this.ready) this.ctx.audio.duck(true);
    if (this.quiet && this.ready) this.tapTo = setTimeout(() => this.tapToPlay(artist), 3500);
    this.armTo = setTimeout(() => {
      if (this.started) return;
      if (this.ctx) this.ctx.audio.duck(false);
      if (this.quiet) this.tapToPlay(artist); else this.stalled(artist);
    }, 6000);
  },
  pending() { return this.open && !this.started && Date.now() - this.armT < 6000; },
  close(restoreFocus) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); this.started = false; this.byDwell = false;
    if (this.ctl) { try { this.ctl.pause(); } catch (e) {} }
    if (this.ctx) this.ctx.audio.duck(false);
    if (!this.el) return;
    this.open = false; this.el.classList.remove('is-tap'); if (!this.asking) this.el.classList.add('is-off'); this.msg.hidden = true; this.msg.textContent = '';
    this.measure();
    const back = this.lastFocus; this.lastFocus = null;
    if (restoreFocus && back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  },
};

/* resolve an artist to a controller playing them. `trigger` is the control that was clicked, for focus return. */
async function playArtist(artist, ctx, trigger, quiet) {
  /* R5: no duck yet. a miss never ducks; arm() ducks once the embed is ready (the ready listener re-arms) */
  const t0 = Date.now();
  const ids = await loadIds(), tid = ids[artist];
  if (!tid) return 'notid';
  grantConsent();
  D.build(ctx); D.ctx = ctx; watchStops(ctx);
  D.setQuiet(!!quiet, quiet || null);
  D.msg.hidden = true; D.msg.textContent = '';
  const wasOpen = D.open;
  D.lastFocus = trigger && trigger.isConnected ? trigger : D.lastFocus;
  D.show(artist, tid);
  D.arm(t0);
  /* a visitor who arrived by keyboard lands on the player, so escape and the stop button are one key away.
     a kiosk demo passes no trigger and never steals the focus. */
  if (trigger && !wasOpen) { try { D.x.focus({ preventScroll: true }); } catch (e) {} }
  D.wantTid = tid;
  let api;
  try { api = await loadApi(); } catch (e) { D.fail(artist, tid); return 'apifail'; }
  if (D.wantTid !== tid) return 'ok'; /* a later click already asked for someone else */
  if (D.ctl) {
    throttle(() => { if (D.wantTid !== tid || !D.ctl) return; try { D.ctl.loadUri('spotify:track:' + tid); nudge(tid); } catch (e) { D.fail(artist, tid); } });
    return 'ok';
  }
  if (D.making) return 'ok'; /* the controller is on its way; its ready listener plays D.wantTid */
  D.making = true;
  try {
    const host = document.createElement('div'); host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'spotify player');
    D.slot.textContent = ''; D.slot.appendChild(host);
    loads++; lastLoad = Date.now();
    api.createController(host, { uri: 'spotify:track:' + tid, height: 80, width: '100%' }, (ctl) => {
      D.ctl = ctl; D.making = false;
      ctl.addListener('ready', () => {
        D.ready = true; D.slotted();
        if (D.open && D.wantTid !== tid) { try { ctl.loadUri('spotify:track:' + D.wantTid); loads++; lastLoad = Date.now(); } catch (e) {} }
        nudge(D.wantTid); requestAnimationFrame(() => D.measure());
      });
      ctl.addListener('playback_update', (e) => {
        const dat = e && e.data; if (!dat) return;
        const playing = D.open && !dat.isPaused;
        if (playing && !D.started) { D.started = true; D.playing(D.artist); }
        /* the embed reports paused while it loads: that must not bring the bed back up before the clip has begun */
        if (playing || !D.pending()) ctx.audio.duck(playing);
        /* the embed loads paused; one nudge per uri, never a loop */
        if (D.open && dat.isPaused && D.playT && Date.now() - D.playT < 4000 && (dat.position || 0) === 0) { D.playT = 0; setTimeout(() => { if (D.open) try { ctl.play(); } catch (err) {} }, Math.max(0, D.armT + 320 - Date.now())); }
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
  ctx.onStop(() => { clearTimeout(DW.t); DW.t = 0; DW.artist = ''; D.hideAsk(); if (D.open && D.quiet) D.close(false); });
}
function nudge(tid) { if (!D.ctl || D.wantTid !== tid || !D.open) return; D.arm(); D.playT = Date.now(); setTimeout(() => { if (D.ctl && D.wantTid === tid && D.open) try { Promise.resolve(D.ctl.play()).catch(() => {}); } catch (e) {} }, 420); }

function grantConsent() {
  if (consent) return;
  consent = true;
  notes.forEach((n) => { if (n.isConnected) n.remove(); }); notes.clear();
}

/* rooms call this when they leave or reshuffle: the clip stops and the soundtrack comes back.
   the controller itself is kept, so the next artist starts without a second load. */
export function stopAll(ctx) {
  clearTimeout(DW.t); DW.t = 0; DW.artist = '';
  if (D.el) { D.hideAsk(); D.close(false); } else if (ctx) ctx.audio.duck(false);
}

/* ------------------------------------------------------------------ R5 L2: quiet play and dwell */
const DW = { t: 0, artist: '' };
/* playArtist(artist, {quiet: true, x, y}): the pill next to (x, y). before consent: the ask, and nothing else */
export async function playQuiet(artist, ctx, o = {}) {
  if (!artist) return 'notid';
  if (o.quiet === false) return consent ? playArtist(artist, ctx, null, false) : 'ask';
  const ids = await loadIds(); if (!ids[artist]) return 'notid';
  const at = isFinite(o.x) && isFinite(o.y) ? { x: +o.x, y: +o.y } : null;
  D.build(ctx); D.ctx = D.ctx || ctx; watchStops(ctx);
  if (!consent) { if (declined) return 'declined'; D.ask(artist, at); return 'ask'; }
  if (D.open && D.quiet && D.artist === artist) return 'same';
  D.byDwell = o.via === 'dwell';
  return playArtist(artist, ctx, null, at || { x: 16, y: 16 });
}
export function dwell(artist, ctx, o = {}) {
  if (!artist || (declined && !consent)) return;
  if (DW.t && DW.artist === artist) return;
  if (D.open && D.quiet && D.artist === artist) return;
  if (D.asking === artist) return;
  /* a dwell elsewhere leaves the clip a previous dwell started */
  if (D.open && D.quiet && D.byDwell) D.close(false);
  clearTimeout(DW.t); DW.artist = artist;
  const at = { x: o.x, y: o.y, via: 'dwell' };
  DW.t = setTimeout(() => { DW.t = 0; DW.artist = ''; playQuiet(artist, ctx, at).catch(() => {}); }, o.touch ? 500 : 600);
}
export function undwell(ctx, o = {}) {
  clearTimeout(DW.t); DW.t = 0; DW.artist = '';
  if (o && o.keep) return;
  if (D.open && D.quiet && D.byDwell) D.close(false);
}
export function postState() {
  return { consent, declined, quiet: D.quiet, open: D.open, asking: D.asking, artist: D.artist, started: D.started, loads, pending: !!DW.t, ready: D.ready };
}

/* play an artist with no control in the room: kiosk demos only, and only after a visitor has consented once. */
export function playClip(artist, ctx) {
  if (!consent) return Promise.resolve(false);
  return playArtist(artist, ctx, null, false).then((r) => r === 'ok').catch(() => false);
}

/* build a post control for `artist` inside `host`. returns the root element. */
export function post(host, artist, ctx, opts = {}) {
  const root = document.createElement('div'); root.className = 'post';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'post-btn';
  btn.innerHTML = '<span class="post-ico" aria-hidden="true">&#9654;</span><span class="post-t"></span>';
  const label = () => (opts.label || 'hear') + ' ' + artist;
  btn.querySelector('.post-t').textContent = label();
  btn.setAttribute('aria-label', 'hear a clip of ' + artist + ' in the player at the bottom of the screen');
  root.appendChild(btn);
  if (!consent) {
    const nh = opts.noteHost || root;
    if (!noted.has(nh)) {
      noted.add(nh);
      const n = document.createElement('p'); n.className = 'post-note';
      n.textContent = 'the first one of these loads a player from spotify. nothing reaches them until you click.';
      nh.appendChild(n); notes.add(n);
    }
  }
  host.appendChild(root);
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true; btn.querySelector('.post-t').textContent = 'loading ' + artist;
    let r = 'notid';
    try { r = await playArtist(artist, ctx, btn, false); } catch (e) { r = 'notid'; }
    btn.disabled = false;
    btn.querySelector('.post-t').textContent = label();
    /* a blocked player is the dock's story to tell; only an artist with no track in my log loses its control */
    if (r !== 'notid') return;
    root.textContent = '';
    const p = document.createElement('p'); p.className = 'post-note'; p.textContent = artist + ' (not available to play here)';
    root.appendChild(p); ctx.audio.duck(false);
  });
  return root;
}

export const postCSS = `
.post{margin:8px 0;max-width:420px}
.post-btn{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid rgba(189,166,255,.3);background:rgba(10,1,24,.6);color:#f0eaff;font:600 12px/1.2 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}
.post-btn:hover{border-color:#86cbfe}.post-btn:focus-visible{outline:2px solid #86cbfe;outline-offset:3px}
.post-btn[disabled]{opacity:.6;cursor:default}
.post-ico{color:#86cbfe;font-size:10px}
.post-note,.post-attr{display:block;margin:8px 2px 0;font:400 11.5px/1.5 "JetBrains Mono",ui-monospace,monospace;color:#a49bbd;text-decoration:none}
.post-attr:hover{color:#86cbfe}
.post iframe{border-radius:12px;display:block}
.exd{position:fixed;left:max(10px,env(safe-area-inset-left));right:calc(max(10px,env(safe-area-inset-right)) + 46px);bottom:calc(8px + env(safe-area-inset-bottom));z-index:6;max-width:540px;margin:0 auto;padding:7px 11px 10px;border-radius:14px;border:1px solid rgba(189,166,255,.3);background:rgba(10,1,24,.88);box-shadow:0 12px 40px rgba(0,0,0,.5);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:transform .34s ease,opacity .34s ease,visibility 0s linear .34s}
.exd.is-off{transform:translateY(135%);opacity:0;visibility:hidden;pointer-events:none}
.exd-bar{display:flex;align-items:center;gap:10px;margin:0 0 7px;font:600 10.5px/1.3 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.09em}
.exd-who{margin:0;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f0eaff;text-transform:lowercase}
.exd-attr{flex:0 0 auto;color:#a49bbd;text-decoration:none;font-weight:500;letter-spacing:.06em}
.exd-attr:hover{color:#86cbfe}
.exd-x{flex:0 0 auto;font:600 10.5px/1 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#f0eaff;background:none;border:1px solid rgba(189,166,255,.34);border-radius:999px;padding:9px 13px;min-height:34px;cursor:pointer}
.exd-x:hover{border-color:#86cbfe;color:#86cbfe}
.exd-x:focus-visible,.exd-attr:focus-visible{outline:2px solid #86cbfe;outline-offset:3px}
.exd-slot{min-height:80px}
.exd.is-msg .exd-slot{min-height:0}
.exd-attr-l,.exd-attr-s{pointer-events:none}
.exd iframe{border-radius:10px;display:block;border:0}
.exd-msg{margin:6px 2px 2px;font:400 11.5px/1.5 "JetBrains Mono",ui-monospace,monospace;color:#a49bbd}
@media (max-width:460px){.exd{padding:6px 8px 8px}.exd-attr-l{display:none}.exd-bar{gap:8px;margin-bottom:5px}}
/* a phone held sideways: the stage takes the right of the screen and a room's controls can run past its bottom edge,
   so the dock leaves that half alone entirely and sits under the wall text on the left */
@media (max-height:520px) and (min-aspect-ratio:115/100){.exd{right:auto;margin:0;width:min(400px,40vw);max-width:none;padding:5px 9px 7px}.exd-attr-l{display:none}}
@media (prefers-reduced-motion:reduce){.exd{transition:none}}
/* #exdock: beats chrome.css's html.atlas #exdock{bottom} so the pill is never stretched to the bottom edge */
#exdock.exd.is-quiet{left:0;top:0;right:auto;bottom:auto;margin:0;width:auto;max-width:min(340px,calc(100vw - 16px));padding:4px 5px 4px 12px;border-radius:999px;border-color:rgba(134,203,254,.45);transition:opacity .2s ease,visibility 0s linear .2s}
.exd.is-quiet .exd-bar{margin:0;gap:8px}
.exd.is-quiet .exd-who{flex:0 0 auto;width:150px} /* fixed: 'loading x' -> 'hearing x' never moves the buttons beside it (CLS 0) */
.exd.is-quiet.is-ask .exd-who{flex:1 1 auto;width:auto;max-width:210px;white-space:normal}
.exd.is-quiet .exd-attr-l{display:none}
.exd.is-quiet .exd-x{min-height:26px;padding:6px 10px}
.exd.is-quiet .exd-slot{position:absolute;left:0;top:0;width:300px;height:80px;min-height:0;overflow:hidden;opacity:.001;pointer-events:none}
.exd.is-quiet .exd-msg{display:none}
.exd.is-quiet.is-ask,.exd.is-quiet.is-tap{border-radius:14px;padding:6px 8px 7px 12px}
.exd.is-quiet.is-ask .exd-msg{display:block;margin:4px 0 0;font-size:10.5px}
.exd.is-quiet.is-tap{width:min(320px,calc(100vw - 16px))}
.exd.is-quiet.is-tap .exd-slot{position:static;width:auto;height:auto;min-height:80px;margin-top:6px;opacity:1;pointer-events:auto}
.exd-yes{border-color:#86cbfe;color:#86cbfe}
@media (forced-colors:active){.exd.is-quiet{border:1px solid CanvasText}}
`;
