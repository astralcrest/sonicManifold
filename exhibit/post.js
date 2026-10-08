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
   a clip. a tap inside the player (the window loses focus to its frame) is 'hot' at once, before spotify says anything. */

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
const coarse = () => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
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
const D = {
  el: null, slot: null, who: null, attr: null, x: null, msg: null,
  ctl: null, wantTid: '', artist: '', open: false, lastFocus: null, ctx: null, playT: 0, h: 0, armT: 0, started: false, armTo: 0, failTo: 0,
  quiet: false, ready: false, loaded: '', playFor: '', evAt: 0, nudT: 0, tapAt: 0, inTo: 0, hotTo: 0, hotFor: 0, mutTo: 0, heard: false, later: null, byDwell: false, asking: '', askTo: 0, askAt: null, yes: null, no: null, tapTo: 0, co: false, playAt: 0, dur: 0,
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
    /* the iframe arriving, a message line coming or going: the reserved bottom follows the dock's real height */
    if (typeof ResizeObserver === 'function') try { new ResizeObserver(() => this.measure()).observe(el); } catch (e) {}
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && (this.open || this.asking)) { e.preventDefault(); if (this.asking) this.hideAsk(); else this.close(true); } });
    return el;
  },
  /* quiet: the dock becomes a pill fixed next to (x, y). it never reserves the bottom edge, so nothing relayouts */
  setQuiet(q, at) {
    this.quiet = !!q; this.el.classList.toggle('is-quiet', this.quiet); this.el.classList.remove('is-tap', 'is-fail');
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
  ask(artist, at) {
    this.asking = artist; this.askAt = at || null; clearTimeout(this.askTo);
    if (this.open) this.close(false);
    this.setQuiet(true, at); this.el.classList.add('is-ask');
    this.who.textContent = 'play ' + artist + ' from spotify?';
    this.yes.hidden = this.no.hidden = false; this.attr.hidden = true; this.x.hidden = true;
    /* on a phone the yes is not the last tap: ios still wants one on spotify's own ▶, so the ask says so up front */
    this.msg.textContent = 'nothing reaches spotify until you say yes.' + (this.co ? ' then tap ▶ in its player.' : ''); this.msg.hidden = false;
    this.el.classList.remove('is-off');
    this.askTo = setTimeout(() => this.hideAsk(), 10000);
    this.measure();
  },
  hideAsk() {
    if (!this.asking) return;
    this.asking = ''; clearTimeout(this.askTo);
    this.el.classList.remove('is-ask'); this.yes.hidden = this.no.hidden = true; this.x.hidden = false;
    this.msg.hidden = true; this.msg.textContent = '';
    if (!this.open) this.el.classList.add('is-off');
    this.measure();
  },
  /* the browser refused to start it (ios wants a tap inside the player): show spotify's own player in the pill */
  tapToPlay(artist) {
    if (this.started || !this.open) return;
    if (this.quiet && !this.ready) return;
    this.el.classList.add('is-tap'); this.who.textContent = 'tap ▶ to ' + (coarse() ? 'hear ' : 'play ') + artist;
    this.say('');
    if (!this.tapAt) hush('off');
    requestAnimationFrame(() => { if (this.quiet && !coarse()) this.place(this.px || 8, this.py || 8); this.measure(); });
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
  /* the bar says what is actually true at each step: loading, then hearing, and never hearing while nothing plays */
  say(line) {
    if (!this.msg) return;
    this.msg.textContent = line || '';
    this.msg.hidden = !line;
    requestAnimationFrame(() => this.measure());
  },
  show(artist, tid) {
    this.hideAsk();
    clearTimeout(this.failTo); this.artist = artist; this.dur = 0; this.el.classList.remove('is-tap', 'is-fail');
    /* R9: on a phone nothing starts without a tap inside the player, so the line says so from the first frame
       (just the name while the very first player is still on its way) */
    if (!this.co) this.who.textContent = 'loading ' + artist; else if (this.ctl && this.ready) this.tapLine(); else this.who.textContent = artist;
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
    if (!this.started) { this.say(''); if (this.co && this.open) this.tapLine(); }
    requestAnimationFrame(() => this.measure());
  },
  tapLine() { this.el.classList.add('is-tap'); this.who.textContent = 'tap ▶ to hear ' + this.artist; },
  /* logged out (always, in safari, whose iframes get no cookies) the embed plays spotify's 30 s preview, not the song:
     say so unless the embed reports a full-length track */
  hearLine(artist) { return 'hearing ' + (this.dur > 31000 ? '' : 'a preview of ') + artist; },
  playing(artist) {
    clearTimeout(this.tapTo); this.el.classList.remove('is-tap');
    this.who.textContent = this.hearLine(artist); this.say('');
  },
  /* the embed took the request and never started: a privacy browser that loads the frame and then blocks it */
  stalled(artist) {
    if (this.started || !this.open) return;
    this.who.textContent = 'could not play ' + artist;
    this.say(this.co && !this.ready ? 'the player never arrived. something may be blocking it. the spotify link opens the track.' : coarse() ? 'safari wants a tap on the player. the link above opens the track on spotify.' : 'the player loaded but did not start. your browser may be blocking it. use the spotify link above.');
  },
  fail(artist, tid) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); this.started = false; this.making = false;
    this.slot.textContent = ''; this.ctl = null; this.el.classList.add('is-msg');
    this.who.textContent = 'could not play ' + artist;
    this.msg.hidden = false;
    this.msg.textContent = 'spotify did not load. it may be blocked on this network, or you may be offline.';
    if (tid) { this.setAttr('open ' + artist + ' on ', 'spotify ↗', 'https://open.spotify.com/track/' + tid); this.attr.hidden = false; }
    else this.attr.hidden = true;
    hush('off', 'fail');
    /* a pill dropped where the finger was sits on top of the card it came from: on a phone it moves to the bottom dock, and every failure leaves by itself after 8 s (the link stays until then) */
    this.el.classList.toggle('is-fail', this.quiet && coarse());
    clearTimeout(this.failTo); this.failTo = setTimeout(() => { if (this.open && !this.started) this.close(false); }, 8000);
    requestAnimationFrame(() => this.measure());
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
      else if (this.quiet) this.tapToPlay(artist); else this.stalled(artist);
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
    this.who.textContent = 'no word from spotify';
    this.say("something may be blocking its player. the room's music is back. stop closes it.");
    hush('off', 'fail');
  },
  pending() { return this.open && !this.started && Date.now() - this.armT < (coarse() ? 2500 : 6000); },
  close(restoreFocus) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); clearTimeout(this.failTo); clearTimeout(this.inTo); clearTimeout(this.hotTo); clearTimeout(this.mutTo); this.started = false; this.byDwell = false; this.tapAt = 0;
    if (this.ctl) { try { this.ctl.pause(); } catch (e) {} }
    hush('off', 'close');
    if (!this.el) return;
    this.open = false; this.el.classList.remove('is-tap', 'is-fail'); this.h = -1; if (!this.asking) this.el.classList.add('is-off'); this.msg.hidden = true; this.msg.textContent = '';
    this.measure();
    const back = this.lastFocus; this.lastFocus = null;
    if (restoreFocus && back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  },
};

/* R10: a tap on spotify's own player moves focus into its frame, and this window hears blur before spotify reports
   anything (or ever does, behind a blocker). that is the moment the clip starts: the bed goes out now.
   R11: it stays out until spotify says paused or the dock closes (a tap on the artwork keeps the room quiet too: the
   dock is open and its stop is one tap away; after 4 s of nothing it says why). only a player that has never said a
   word is given up on, after a preview */
addEventListener('blur', () => setTimeout(() => {
  const f = D.slot && D.slot.querySelector('iframe');
  if (!f || !D.open || document.activeElement !== f) return;
  D.tapAt = Date.now(); hush('hot'); clearTimeout(D.inTo);
  const at = D.tapAt;
  D.inTo = setTimeout(() => { if (D.tapAt === at && D.evAt < at && !D.started) D.mute(D.artist); }, D.heard ? 4000 : 31000);
}, 0));
/* R11: the old hot watchdog (four seconds of silence brought the bed back) is gone: silence is what a blocker or a
   throttled frame sounds like while spotify plays on. a pause said while the page was hidden lands when it is seen */
document.addEventListener('visibilitychange', () => {
  const A = D.ctx && D.ctx.audio, s = D.later;
  if (document.hidden || !s || !A || !A.clip) return;
  D.later = null; if (A.clipState === 'hot') A.clip(s);
});

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
    throttle(() => { if (D.wantTid !== tid || !D.ctl) return; try { if (D.loaded !== tid) { D.ctl.loadUri('spotify:track:' + tid); D.loaded = tid; D.playFor = ''; } nudge(tid); } catch (e) { D.fail(artist, tid); } });
    return 'ok';
  }
  if (D.making) return 'ok'; /* the controller is on its way; its ready listener plays D.wantTid */
  D.making = true;
  try {
    const host = document.createElement('div'); host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'spotify player');
    D.slot.textContent = ''; D.slot.appendChild(host);
    loads++; lastLoad = Date.now();
    api.createController(host, { uri: 'spotify:track:' + tid, height: 80, width: '100%' }, (ctl) => {
      D.ctl = ctl; D.making = false; D.loaded = tid; D.playFor = ''; D.heard = false;
      { const fr = D.slot.querySelector('iframe'); if (fr && !fr.title) fr.title = 'spotify player'; }
      ctl.addListener('ready', () => {
        D.ready = true; D.slotted();
        /* R10: spotify's loadUri reloads the frame, and every reload says ready again. the old test here compared the
           wanted track with the first one this controller was made for, so from the second artist on each ready loaded
           again: a reload every quarter second, and the clip never started. only a track not yet loaded loads now */
        if (D.open && D.wantTid && D.wantTid !== D.loaded) { try { ctl.loadUri('spotify:track:' + D.wantTid); D.loaded = D.wantTid; D.playFor = ''; loads++; lastLoad = Date.now(); } catch (e) {} }
        if (D.playFor !== D.loaded) nudge(D.wantTid);
        requestAnimationFrame(() => D.measure());
      });
      ctl.addListener('playback_started', () => { D.evAt = Date.now(); D.heard = true; if (D.open) hush('hot'); });
      ctl.addListener('playback_update', (e) => {
        const dat = e && e.data; if (!dat) return;
        const pos = dat.position || 0; D.evAt = Date.now(); D.heard = true;
        /* the dock is closed but the embed still plays (a pause that did not take): ask again, and keep the bed out until it stops */
        if (!D.open) { if (!dat.isPaused) { try { ctl.pause(); } catch (err) {} hush('hot'); } else hush('off', 'pause'); return; }
        if (dat.duration > 0) D.dur = dat.duration;
        if (D.co) {
          /* R9: "hearing" only while the embed reports real playback. ios plays for a blink and pauses at 0 when the tap
             came from outside the frame; that undoes the claim, and any pause puts the tap line back */
          const real = D.open && !dat.isPaused && pos > 0;
          if (real) { if (!D.started) { D.started = true; D.playAt = Date.now(); } if (D.who.textContent !== D.hearLine(D.artist)) D.playing(D.artist); }
          else if (D.open && dat.isPaused) { if (D.started && pos === 0 && Date.now() - D.playAt < 4000) D.started = false; D.tapLine(); }
          /* R10: playing or starting is 'hot', position 0 included (a tap in the frame starts there). the one exception is
             ios's blink: our own play() from outside the frame reports playing at 0 and pauses again, with no sound */
          const blip = !dat.isPaused && pos === 0 && !D.tapAt && Date.now() - D.nudT < 1500;
          if (!dat.isPaused) { if (!blip) hush('hot'); } else { D.tapAt = 0; clearTimeout(D.inTo); hush('off', 'pause'); }
        } else {
        const playing = D.open && !dat.isPaused;
        if (playing && !D.started) { D.started = true; D.playing(D.artist); }
        /* the embed reports paused while it loads: that must not bring the bed back up before the clip has begun.
           R10: playing (buffering included) is 'hot'; paused while the next one loads waits at 'armed' */
        if (playing) hush('hot'); else { D.tapAt = 0; clearTimeout(D.inTo); hush(D.pending() && D.ready ? 'armed' : 'off', 'pause'); }
        }
        /* the embed loads paused; one nudge per uri, never a loop */
        if (D.open && dat.isPaused && D.playT && Date.now() - D.playT < 4000 && (dat.position || 0) === 0) { D.playT = 0; setTimeout(() => { if (D.open && !D.started && !D.tapAt) try { D.nudT = Date.now(); ctl.play(); } catch (err) {} }, Math.max(0, D.armT + 320 - Date.now())); }
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
/* R10: play at once. spotify's api holds a command while its frame (re)loads and sends it on ready, so the old 420 ms
   wait only made every clip later (measured: it was most of the warm start) */
function nudge(tid) { if (!D.ctl || D.wantTid !== tid || !D.open) return; D.arm(); D.playT = D.nudT = Date.now(); D.playFor = D.loaded; try { Promise.resolve(D.ctl.play()).catch(() => {}); } catch (e) {} }

function grantConsent() {
  if (consent) return;
  consent = true;
  notes.forEach((n) => { if (n.isConnected) n.remove(); }); notes.clear();
}

/* rooms call this when they leave or reshuffle: the clip stops and the soundtrack comes back.
   the controller itself is kept, so the next artist starts without a second load. */
export function stopAll(ctx) {
  clearTimeout(DW.t); DW.t = 0; DW.artist = '';
  if (D.el) { D.hideAsk(); D.close(false); } else if (ctx && !ctx.audio.clip) ctx.audio.duck(false);
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
    root.appendChild(p); if (!D.open) hush('off');
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
#exdock.exd.is-quiet{left:0;top:0;right:auto;bottom:auto;margin:0;width:auto;max-width:min(404px,calc(100vw - 16px));padding:4px 5px 4px 12px;border-radius:999px;border-color:rgba(134,203,254,.45);transition:opacity .2s ease,visibility 0s linear .2s}
.exd.is-quiet .exd-bar{margin:0;gap:8px}
.exd.is-quiet .exd-who{flex:0 1 auto;width:250px} /* fixed: 'loading x' -> 'hearing a preview of x' never moves the buttons beside it (CLS 0) */
.exd.is-quiet.is-ask .exd-who{flex:1 1 auto;width:auto;max-width:210px;white-space:normal}
.exd.is-quiet .exd-attr-l{display:none}
.exd.is-quiet .exd-x{min-height:26px;padding:6px 10px}
.exd.is-quiet .exd-slot{position:absolute;left:0;top:0;width:300px;height:80px;min-height:0;overflow:hidden;opacity:.001;pointer-events:none}
.exd.is-quiet .exd-msg{display:none}
.exd.is-quiet.is-ask,.exd.is-quiet.is-tap,.exd.is-quiet.is-fail{border-radius:14px;padding:6px 8px 7px 12px}
.exd.is-quiet.is-ask .exd-msg{display:block;margin:4px 0 0;font-size:10.5px}
.exd.is-quiet.is-tap{width:min(320px,calc(100vw - 16px))}
.exd.is-quiet.is-tap .exd-slot{position:static;width:auto;height:auto;min-height:80px;margin-top:6px;opacity:1;pointer-events:auto}
.exd-yes{border-color:#86cbfe;color:#86cbfe}
@media (pointer:coarse){
.exd.is-quiet.is-tap .exd-attr-l{display:none}
.exd-x{min-height:44px;min-width:44px}
.exd.is-quiet .exd-x{min-height:44px;padding:6px 10px}
.exd-bar{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
}
/* R9 phone dock (is-co: a quiet play on a coarse pointer). one place for the ask, the player and a failure: the bottom
   edge, above the tab bar, never over a card. it slides in like the docked player and reserves its height (measure()) */
#exdock.exd.is-co{left:max(10px,env(safe-area-inset-left));right:calc(max(10px,env(safe-area-inset-right)) + 46px);top:auto;bottom:var(--atlas-dockh,calc(8px + env(safe-area-inset-bottom)));width:auto;max-width:540px;margin:0 auto;padding:7px 8px 9px 12px;border-radius:14px;transform:none;transition:transform .3s ease,opacity .3s ease,visibility 0s linear .3s}
html.atlas #exdock.exd.is-co{right:max(10px,env(safe-area-inset-right));bottom:calc(var(--atlas-dockh,0px) + 6px)}
#exdock.exd.is-co.is-off{transform:translateY(135%)}
#exdock.exd.is-co .exd-who,#exdock.exd.is-co.is-ask .exd-who{flex:1 1 auto;width:auto;max-width:none}
#exdock.exd.is-co .exd-slot{position:static;width:auto;height:auto;min-height:80px;margin-top:6px;opacity:1;pointer-events:auto}
#exdock.exd.is-co.is-ask .exd-slot{position:absolute;left:0;top:0;width:300px;height:80px;min-height:0;margin:0;overflow:hidden;opacity:.001;pointer-events:none}
#exdock.exd.is-co .exd-msg:not([hidden]){display:block;margin:5px 0 0;font-size:11px}
/* while the first player is on its way (or after a failure) the box keeps the player's height and the line sits in it,
   so the dock never grows under the room it just moved */
#exdock.exd.is-co.is-msg:not(.is-ask) .exd-slot{opacity:.001;pointer-events:none}
#exdock.exd.is-co.is-msg:not(.is-ask) .exd-msg:not([hidden]){position:absolute;left:12px;right:12px;bottom:9px;min-height:80px;margin:0;padding:10px 12px;box-sizing:border-box;border:1px dashed rgba(189,166,255,.22);border-radius:10px}
#exdock.exd.is-co.is-tap{border-color:rgba(134,203,254,.6);box-shadow:0 0 0 1px rgba(134,203,254,.18),0 0 28px rgba(134,203,254,.16),0 12px 40px rgba(0,0,0,.5)}
@media (max-height:520px) and (min-aspect-ratio:115/100){#exdock.exd.is-co{right:auto;margin:0;width:min(400px,40vw);max-width:none;padding:5px 8px 7px 10px}#exdock.exd.is-co .exd-slot{margin-top:4px}}
/* a phone held sideways in the atlas: the left column is the card, which does not move for the dock; the stage on the
   right does (stage() takes the reserve off its bottom), so the dock sits under the stage, right-aligned */
@media (pointer:coarse) and (max-height:520px) and (min-aspect-ratio:115/100){html.atlas #exdock.exd.is-co,html.atlas #exdock.exd:not(.is-quiet){left:auto;right:max(10px,env(safe-area-inset-right));width:min(420px,calc(100vw - 330px));max-width:none;margin:0;padding:5px 8px 7px 10px}}
/* sideways the screen has 390px of height: the words and stop sit beside the player, not above it, so the dock is
   one player tall and the stage keeps the difference */
@media (pointer:coarse) and (max-height:520px) and (min-aspect-ratio:115/100){#exdock.exd.is-co{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,60%);column-gap:10px;align-items:center}#exdock.exd.is-co .exd-bar{grid-column:1;grid-row:1;flex-wrap:wrap;row-gap:4px;margin:0}#exdock.exd.is-co .exd-who{flex:1 1 100%;white-space:normal}#exdock.exd.is-co .exd-slot,#exdock.exd.is-co .exd-msg:not([hidden]){grid-column:2;grid-row:1;margin:0}#exdock.exd.is-co.is-msg:not(.is-ask) .exd-msg:not([hidden]){left:auto;right:8px;top:5px;bottom:7px;width:calc(60% - 12px);min-height:0;overflow:auto}}
@media (prefers-reduced-motion:reduce){#exdock.exd.is-co{transition:none}}
@media (forced-colors:active){.exd.is-quiet{border:1px solid CanvasText}}
`;
