/* listening post: one dock, no ask.
   A room calls ctx.post(host, artist) and gets a small control with the artist's name on it. a click or tap on it, or on an
   artist's name in the atlas (anchors.js), plays that artist in ONE player docked at the edge of the screen, at once; another
   name switches it at once. the soundtrack ducks under it. the player is spotify's own iframe api controller, unaltered,
   linking back to spotify; the next artist is loadUri() on the same controller; no audio or artwork is stored here. track ids
   come from audio/sonic-tid-to-artist.json, which this site already publishes.
   R20 (no gates): once the page has had a press (or carries one over from the landing: chromium does, for a same-origin
   hop), the first post a stop shows on screen (half visible) is cued out of sight: ids, api and controller load and nothing
   plays; with the sound on it then starts by itself. before any press nothing is asked of spotify, not even a handshake. chromium and android let spotify's
   frame play on the page's own press; webkit (iphone, ipad, safari) wants a tap inside the frame, so there the dock shows with
   a ring on spotify's ▶, the one tap left. a cue that fails closes quietly: the failure card is only for a post the visitor
   used, and only once spotify has failed (its error, a blocked script, or STALL_MS with no player). the dock floats (it never
   reserves the bottom edge, so the stage never relayouts under it) and is a data-keepout while it shows.
   the wall (?wall=1) keeps its own rules: a code by default; posts=spotify asks once per visitor and revoke() takes it back.
   R10 (one voice): the post tells the shell's arbiter (ctx.audio.clip) what the embed is doing: 'armed' (asked, player ready:
   the bed waits at -24 dB), 'hot' (playing or starting: the bed is silent), 'off'. only a paused report, a failure or closing
   the dock ends 'hot'; a timer or a room change never brings the bed back over a clip.
   sm:clip, the one clip event. this module sends it; a listener must change nothing if it never arrives:
     window.dispatchEvent(new CustomEvent('sm:clip', { detail: { state, artist, position, duration, via, visitor } }))
     state      'cued' (loaded out of sight, not started) | 'armed' (asked, player loading) | 'cueing' (loaded, waiting for the
                in-embed tap on webkit or the first report) | 'playing' | 'paused' | 'ended' | 'fail' | 'off'
     position, duration   ms; while playing, estimated between spotify's reports and sent at most every 250 ms
     via        'tap' | 'stop' (a stop's cue) | 'tour' | 'auto'
     visitor    true when the visitor's own act started this clip: a name or a post's button ('tap'; on the wall its control
                and its yes), the dock's record, or a tap inside spotify's frame. false for a stop's cue (started on arrival or by the first
                press anywhere), the tour's hand-over and 'auto', so those never hold the tour. false again once the dock closes
   postState() returns the same fields (plus playing, cue, ended, failed, cued, used) next to the older ones.
   radio: ctx.post.playArtist(artist, { via: 'tour' }) (or 'auto') plays only for a visitor who is listening (a clip playing
   now, one that played in the last 3 s, or a preview that ran out in the open player); otherwise it returns 'idle'. a stop
   change the tour makes under a listening visitor keeps the dock until 4 s after the tour arrives (12 s at most), so the
   next stop's post can take over, then closes it. */

let tidByArtist = null, apiPromise = null, apiReady = null;
/* the wall only (posts=spotify): one visitor's yes, which revoke() takes back. off the wall nothing is asked */
let consent = false, declined = false;
let IDS = null, loads = 0, lastLoad = -1e9, loadTo = 0, stopSub = false, wired = false;
const notes = new Set();             /* wall only: the printed notes */
let noted = new WeakSet();
const noteHosts = new Set();
let gen = 0;                         /* wall only: bumped by revoke(); a load that began before it must not finish after it */
/* a frame that has said nothing for this long is the one timed failure (a privacy browser that lets the script through and stops the frame) */
const STALL_MS = 20000;

/* R19 the wall (?wall=1, window.__wall from wallboot.js). posts=qr (the wall default): the dock shows a code and nothing is
   asked of spotify; posts=spotify: the one player, with consent that revoke() takes back for each visitor; posts=off: no
   posts. without the flag wmode() is '' */
function wmode() {
  const W = window.__wall;
  if (!W || !W.on) return '';
  const p = W.opts && W.opts.posts;
  return p === 'spotify' || p === 'off' ? p : 'qr';
}
const TRACK_URL = 'https://open.spotify.com/track/';
const WALL_QR_NOTE = 'nothing reaches spotify from this screen. scan to hear it on your own phone.';
const WALL_OPEN = 'the code opens it on your phone.';
let QRM = null;                      /* atlas/qr.js, fetched only on the wall (its own module, same ?v= as the shell's) */
const qrMod = (ctx) => (QRM ? Promise.resolve(QRM) : import('./atlas/qr.js' + ((ctx && ctx.V) || '')).then((m) => (QRM = m)));
/* every post control, so each one can say what the player is doing with its artist */
const BTNS = new Set();

const UA = (() => { try { return navigator.userAgent || ''; } catch (e) { return ''; } })();
/* webkit starts no cross-origin frame from the page's own press: iphone, ipad (ipados says MacIntel) and desktop safari */
const IOS = /iPhone|iPad|iPod/.test(UA) || (() => { try { return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; } catch (e) { return false; } })();
const WK_DESK = /Safari/.test(UA) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox|FxiOS/.test(UA);
const needTap = () => IOS || WK_DESK;
/* only desktop chromium sends spotify its login cookie from inside the frame, so only there does signing in give full songs */
const signIn = () => /Chrome|Chromium|Edg/.test(UA) && !/Android|Mobile/.test(UA) && !coarse();
/* the frame needs a tap inside it: webkit off the wall; on the wall, as before, any coarse pointer */
const wk = () => (wmode() ? coarse() : needTap());
const allowed = () => !wmode() || consent;
const kioskOn = () => !!window.__wall || /[?&]kiosk=1\b/.test(location.search);
const audio = () => D.ctx && D.ctx.audio;
const muted = () => { const A = audio(); return !!(A && A.muted); };
const soundOn = () => { const A = audio(); return !!(A && A.on && !A.muted); };
const txt = (l) => (Array.isArray(l) ? l.map((p) => (typeof p === 'string' ? p : (p && p.a) || '')).join('') : l || '');

export function clipsAllowed() { return allowed(); }
/* kept for the tests and the wall: off the wall there is nothing to grant */
export function grant() { if (wmode()) grantConsent(); }
export function hasTrack(artist) { if (wmode() === 'off') return Promise.resolve(false); return loadIds().then((m) => !!m[artist]); }
export function hasTrackNow(artist) { if (wmode() === 'off') return false; if (IDS) return !!IDS[artist]; loadIds(); return null; }

function loadIds() {
  if (!tidByArtist) tidByArtist = fetch('audio/sonic-tid-to-artist.json').then((r) => r.json()).then((m) => { const o = {}; for (const tid in m) { const a = m[tid]; if (!(a in o)) o[a] = tid; } return (IDS = o); }).catch(() => ({}));
  return tidByArtist;
}
/* one slow moment must not disable every post for the rest of the visit: a failed attempt is forgotten, so the next
   click starts a fresh one, and an api that turns up after its own timeout is kept and answers that click at once.
   off the wall the wait is STALL_MS: a slow phone is not a blocked one */
function loadApi() {
  if (wmode() === 'qr' || wmode() === 'off') return Promise.reject(new Error('wall'));
  if (apiReady) return Promise.resolve(apiReady);
  if (!apiPromise) apiPromise = new Promise((res, rej) => {
    const prev = window.onSpotifyIframeApiReady; let to = 0;
    window.onSpotifyIframeApiReady = (api) => { clearTimeout(to); apiReady = api; if (prev) try { prev(api); } catch (e) {} res(api); lateRetry(); };
    const s = document.createElement('script'); s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true;
    s.onerror = () => { clearTimeout(to); rej(new Error('script')); };
    document.head.appendChild(s);
    to = setTimeout(() => rej(new Error('timeout')), wmode() ? 5000 : STALL_MS);
  }).catch((e) => { apiPromise = null; throw e; });
  return apiPromise;
}
/* an api that turns up after its own timeout while the dock still shows that failure answers the click that was made.
   apiPromise === null is the precise signal that the wait already gave up */
let lateRetried = false;
function lateRetry() {
  if (lateRetried || apiPromise || !D.open || D.ctl || !D.artist || !D.ctx) return;
  lateRetried = true;
  playArtist(D.artist, D.ctx, null, { via: D.via, fam: D.famName || undefined, quiet: D.quiet ? { x: D.px || 16, y: D.py || 16 } : false, cue: D.cueOnly, mine: D.mine }).catch(() => {});
}
/* each artist's genre family, for a clip whose room passed none */
let famMap = null, famP = null;
function loadFam(ctx) {
  if (famP) return famP;
  const C = ctx || D.ctx;
  if (!C || typeof C.data !== 'function') return Promise.resolve(null);
  famP = C.data('twolisteners').then((d) => {
    const fam = {};
    (d.nodes || []).forEach((n) => { fam[n.name] = n.community; });
    famMap = fam;
    if (D.open && D.el && !D.famName && !D.fam) { const h = famOf(D.artist); if (h) { D.fam = h; D.el.style.setProperty('--fam', h); } }
    return fam;
  }).catch(() => { famP = null; return null; });
  return famP;
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
/* spotify's controller methods return nothing and can throw inside its own frame; a stand-in may lack one */
function ctlDo(m) {
  const c = D.ctl; if (!c) return;
  try { const f = typeof c[m] === 'function' ? c[m] : c.play; Promise.resolve(f.call(c)).catch(() => {}); } catch (e) {}
}
/* THE COLOUR CODE: a genre family is a pastel and never reads as a provenance; grey means no public tag */
function famHex(fam) {
  const C = D.ctx; if (!fam || !C || typeof C.famColor !== 'function') return '';
  try { return '#' + (C.famColor(fam) >>> 0).toString(16).padStart(6, '0'); } catch (e) { return ''; }
}
function famOf(artist) { const f = famMap && famMap[artist]; return f ? famHex(f) : ''; }
/* the wall's yes is the one moment the room answers: two quiet notes in the bed's key (silent when muted or under a clip) */
function chord(C) {
  const X = C || D.ctx, A = X && X.audio; if (!A || typeof A.note !== 'function') return;
  try { A.note(0, { dur: 0.45, vol: 0.03 }); A.note(3, { at: 0.09, dur: 0.6, vol: 0.026 }); } catch (e) {}
}
const D = {
  el: null, slot: null, who: null, attr: null, x: null, msg: null, act: null,
  ctl: null, wantTid: '', artist: '', open: false, lastFocus: null, ctx: null, playT: 0, h: 0, armT: 0, started: false, armTo: 0, failTo: 0,
  quiet: false, ready: false, loaded: '', playFor: '', evAt: 0, nudT: 0, tapAt: 0, inTo: 0, hotTo: 0, hotFor: 0, mutTo: 0, heard: false, later: null, asking: '', askTo: 0, askAt: null, yes: null, no: null, tapTo: 0, playAt: 0, dur: 0, making: false,
  disc: null, rp: null, wind: null, cueEl: null,
  /* the wall only: a quiet play is a pill at (px, py); co is a touch wall, where it is the bottom dock instead */
  co: false, px: 0, py: 0,
  /* R19 wall: the code in the dock (qrOn), the element that holds it, and which artist it was drawn for */
  qrBox: null, qrOn: false, qrArtist: '', qrSeq: 0,
  pos: 0, posAt: 0, lastRep: 0, lastRun: false, lastRunAt: 0, playingNow: false, ended: false, atEnd: false, prog: false, failed: false, failKind: '', cue: false, popAt: 0,
  via: 'tap', fam: '', famName: '', note: '', line: '', holdTo: 0, startTo: 0, tickAt: 0, askFam: '', askOpener: null, popTo: 0, endTo: 0, tick: 0, ek: '', windA: 0, radioTo: 0, mine: false,
  /* R20: cueOnly = loaded out of sight for the stop (never started); used = the visitor played something with it */
  cueOnly: false, cueGo: false, used: false, noticed: '', mode: '', kout: false, revT: 0,
  build(ctx) {
    if (this.el) return this.el;
    this.ctx = ctx;
    const wm = wmode();
    const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
    const el = mk('aside', wm ? 'exd is-off' : 'exd is-off is-one'); el.id = 'exdock'; el.setAttribute('aria-label', 'listening post');
    /* a phone's handle: the dock goes away with a swipe down, the way a sheet does */
    const grab = mk('span', 'exd-grab'); grab.setAttribute('aria-hidden', 'true');
    const bar = mk('div', 'exd-bar');
    /* R18 the record: it spins while spotify reports playback, its ring is the clip's progress, and it is the pause / play */
    const disc = mk('button', 'exd-disc'); disc.type = 'button'; disc.hidden = true; disc.setAttribute('aria-label', 'play');
    disc.innerHTML = '<svg class="exd-ring" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle class="exd-ring-t" cx="20" cy="20" r="18.6"/><circle class="exd-ring-p" cx="20" cy="20" r="18.6" pathLength="100"/></svg><span class="exd-wind" aria-hidden="true"><span class="exd-rec"></span></span><span class="exd-gl" aria-hidden="true"></span><span class="exd-arm" aria-hidden="true"></span>';
    const who = mk('p', 'exd-who'); who.setAttribute('aria-live', 'polite');
    /* the wall has no link out: the attribution is text, and a failure shows a code instead of a card that opens a tab */
    const attr = mk(wm ? 'span' : 'a', 'exd-attr'); if (!wm) { attr.target = '_blank'; attr.rel = 'noopener'; }
    attr.innerHTML = '<span class="exd-attr-l"></span><span class="exd-attr-s"></span>';
    const x = mk('button', 'exd-x'); x.type = 'button'; x.textContent = 'stop'; x.setAttribute('aria-label', 'stop the clip and close the player');
    let act = null;
    if (wm) {
      const yes = mk('button', 'exd-x exd-yes'); yes.type = 'button'; yes.textContent = 'yes'; yes.hidden = true;
      const no = mk('button', 'exd-x exd-no'); no.type = 'button'; no.textContent = 'no'; no.hidden = true;
      bar.append(disc, who, yes, no, attr, x);
      this.yes = yes; this.no = no;
      yes.addEventListener('click', () => {
        let kb = false; try { kb = yes.matches(':focus-visible'); } catch (e) {}
        const a = this.asking, at = this.askAt, fam = this.askFam, opener = this.askOpener;
        this.hideAsk(true);
        const first = !consent; grantConsent(); if (first) chord();
        /* a keyboard yes lands on the player's stop, and escape from there goes back to where the ask came from */
        if (a) playQuiet(a, this.ctx, Object.assign({}, at, { via: 'ask', fam: fam || undefined, trigger: kb ? opener : null, kb }));
      });
      no.addEventListener('click', () => { declined = true; this.hideAsk(); });
    } else { act = mk('div', 'exd-act'); act.append(attr, x); bar.append(disc, who, act); }
    this.disc = disc; this.act = act;
    this.rp = disc.querySelector('.exd-ring-p'); this.wind = disc.querySelector('.exd-wind');
    disc.addEventListener('click', () => this.press());
    const slot = mk('div', 'exd-slot');
    /* R18: the ring that sits on spotify's own ▶ until spotify reports real playback (webkit will not start without it) */
    const cue = mk('span', 'exd-cue'); cue.setAttribute('aria-hidden', 'true'); this.cueEl = cue; slot.appendChild(cue);
    const msg = mk('p', 'exd-msg'); msg.hidden = true;
    el.append(grab, bar, slot, msg);
    if (wm) { const qb = mk('div', 'exd-qr'); el.appendChild(qb); this.qrBox = qb; }
    document.body.appendChild(el);
    x.addEventListener('click', () => this.close(true));
    this.el = el; this.slot = slot; this.who = who; this.attr = attr; this.x = x; this.msg = msg;
    if (typeof ResizeObserver === 'function') try { new ResizeObserver(() => this.measure()).observe(el); } catch (e) {}
    addEventListener('resize', () => { if (!wmode() && this.shows()) { this.fit(); this.measure(); } }, { passive: true });
    /* escape puts the wall's ask away (only "no" is a no) or closes the player; a cue out of sight is not there to close */
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && (this.shows() || this.asking || this.qrOn)) { e.preventDefault(); if (this.asking) this.hideAsk(); else this.close(true); } });
    this.swipe(grab); this.swipe(bar);
    return el;
  },
  shows() { return !!this.el && this.open && !this.cueOnly; },
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
      if (e.pointerType === 'mouse' || id !== -1 || !coarse() || (!this.shows() && !this.asking && !this.qrOn)) return;
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
  /* the wall only. quiet: the dock becomes a pill fixed next to (x, y). it never reserves the bottom edge, so nothing relayouts */
  setQuiet(q, at) {
    this.quiet = !!q; this.el.classList.toggle('is-quiet', this.quiet); this.el.classList.remove('is-tap', 'is-fail', 'is-card', 'is-void', 'is-cue'); this.cue = false;
    /* R9: a touch wall never gets the floating pill. it sat on the card or the stars it came from */
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
  /* R20: where the floating dock goes. upright (a phone): on the tab bar. a desk with the deck: the top right of the stage,
     where rooms keep the least. anything else (a phone or tablet held sideways, a small window): under the stage column */
  fit() {
    const el = this.el; if (!el || wmode()) return;
    const W = innerWidth, st = el.style;
    let s = null; try { s = this.ctx && typeof this.ctx.stage === 'function' ? this.ctx.stage() : null; } catch (e) {}
    let port = false; try { port = matchMedia('(max-aspect-ratio: 115/100)').matches; } catch (e) { port = innerHeight > W; }
    const mode = port ? 'port' : document.documentElement.classList.contains('atlas-deck') ? 'top' : 'under';
    const sx = s && isFinite(s.x) ? s.x : 0, sw = s && isFinite(s.w) && s.w > 0 ? s.w : W;
    this.mode = mode;
    el.classList.toggle('is-port', mode === 'port'); el.classList.toggle('is-top', mode === 'top');
    if (mode === 'port') Object.assign(st, { left: '8px', right: '8px', top: 'auto', bottom: 'calc(var(--atlas-dockh, env(safe-area-inset-bottom, 0px)) + 4px)', width: 'auto', maxWidth: '560px', margin: '0 auto' });
    else if (mode === 'top') {
      const w = Math.round(Math.max(280, Math.min(520, sw - 16, W - 16)));
      Object.assign(st, { left: 'auto', right: Math.max(8, Math.round(W - (sx + sw)) + 8) + 'px', top: '6px', bottom: 'auto', width: w + 'px', maxWidth: 'none', margin: '0' });
    } else {
      const w = Math.round(Math.max(260, Math.min(560, sw - 16, W - 16)));
      Object.assign(st, { right: 'auto', top: 'auto', bottom: 'calc(6px + env(safe-area-inset-bottom, 0px))', width: w + 'px', maxWidth: 'none', margin: '0' });
      st.left = this.spot(w, Math.max(8, Math.round(sx + (sw - w) / 2))) + 'px';
      this.spotH = el.offsetHeight;
    }
  },
  /* sideways nothing is reserved, so the stage keeps its size and the dock takes the bottom spot that covers the least of
     the room's controls, panels and words, and the caption's: under the stage first, then the left edge, then the right */
  spot(w, x0) {
    const el = this.el, h = el.offsetHeight || 96, bot = innerHeight - (parseFloat(getComputedStyle(el).bottom) || 6), top = bot - h;
    const xs = [x0, 8, Math.max(8, innerWidth - w - 8)], hit = [0, 0, 0];
    const look = (root) => {
      if (!root) return;
      root.querySelectorAll('*').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.bottom <= top || r.top >= bot) return;
        const ctl = /^(BUTTON|A|INPUT|SELECT|SUMMARY|LABEL)$/.test(e.tagName) || e.hasAttribute('data-keepout') || /hud|card|panel/.test(typeof e.className === 'string' ? e.className : '');
        if (!ctl && ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < 0.06) return;
        xs.forEach((x, k) => { const ox = Math.min(x + w, r.right) - Math.max(x, r.left); if (ox > 0) hit[k] += ox * (Math.min(bot, r.bottom) - Math.max(top, r.top)); });
      });
    };
    look(document.querySelector('section.is-active')); look(document.getElementById('atlas-info'));
    let k = 0; for (let i = 1; i < xs.length; i++) if (hit[i] < hit[k]) k = i;
    return xs[k];
  },
  reveal() {
    if (!this.el || wmode()) return;
    this.fit();
    this.el.classList.remove('is-off');
    this.measure();
    /* the names read the dock's box once it has slid in */
    clearTimeout(this.revT);
    this.revT = setTimeout(() => { try { const L = this.ctx && this.ctx.labels; if (L && typeof L.refresh === 'function') L.refresh(); } catch (e) {} }, 400);
  },
  /* R19 the wall's ask (posts=spotify, before a visitor's yes): the pill where the tap was, or the bottom dock on a touch wall.
     off the wall nothing is ever asked (asking stays '') */
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
    this.yes.hidden = this.no.hidden = false; this.attr.hidden = true; this.x.hidden = true; this.disc.hidden = true;
    /* on a touch wall the yes is not the last tap: ios still wants one on spotify's own ▶, so the ask says so up front */
    this.msg.textContent = 'nothing reaches spotify until you say yes.' + (this.co ? ' then tap ▶ in its player.' : ''); this.msg.hidden = false;
    this.el.classList.remove('is-off');
    /* a keyboard visitor still on the ask keeps it: it never goes away under the focus */
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
  /* the browser refused to start it (webkit wants a tap inside the player): point at spotify's own ▶ */
  tapToPlay(artist) {
    if (this.started || !this.open || this.failed) return;
    if (this.quiet && !this.ready) return;
    this.el.classList.add('is-tap'); this.setLine('tap ▶ to ' + (coarse() ? 'hear ' : 'play '), artist);
    this.say(''); this.setCue(this.ready && !!this.ctl);
    if (!this.tapAt) hush('off');
    requestAnimationFrame(() => { if (this.quiet && !coarse()) this.place(this.px || 8, this.py || 8); this.measure(); });
    this.track();
  },
  /* chromium refused a start that had no press behind it: the player is there, and the record plays it */
  cuedUp() {
    if (this.started || !this.open || this.failed) return;
    this.el.classList.remove('is-tap'); this.setCue(false);
    this.setLine('cued up ', this.artist);
    if (!this.tapAt) hush('off');
    this.track();
  },
  /* off the wall the dock floats: nothing is reserved and the stage never moves for it. it is a keepout while it shows,
     and html.exd-open hides what would draw over it (the hint toast). the wall still reserves its height */
  measure() {
    if (!this.el) return;
    const H = document.documentElement;
    if (!wmode()) {
      const v = this.shows();
      H.classList.toggle('exd-open', v);
      H.classList.toggle('exd-cover', v && this.mode === 'port');
      const lift = this.lift(v && this.mode === 'port');
      if (lift !== this.liftPx) { this.liftPx = lift; if (lift) H.style.setProperty('--exd-lift', lift + 'px'); else H.style.removeProperty('--exd-lift'); }
      if (v && this.mode === 'under' && this.el.offsetHeight !== this.spotH) this.fit();
      if (v !== this.kout) {
        this.kout = v;
        if (v) this.el.setAttribute('data-keepout', ''); else this.el.removeAttribute('data-keepout');
        try { const L = this.ctx && this.ctx.labels; if (L && typeof L.refresh === 'function') L.refresh(); } catch (e) {}
      }
      return;
    }
    H.classList.toggle('exd-open', !!(this.open || this.asking || this.qrOn));
    if (!this.ctx) return;
    if (this.qrOn) this.qrFit();
    const on = this.open || (this.co && !!this.asking) || this.qrOn;
    let h = on && (!this.quiet || this.co || (this.el.classList.contains('is-tap') || this.el.classList.contains('is-fail')) && coarse()) ? Math.ceil(this.el.getBoundingClientRect().height) : 0;
    /* R9: on a touch wall the dock stands on the tab bar, so what it covers is its height plus its own bottom offset. read
       from the computed bottom, not the rect, which is still sliding in */
    if (h && coarse()) h += Math.max(0, Math.round(parseFloat(getComputedStyle(this.el).bottom) || 0));
    if (h === this.h) return;
    this.h = h;
    if (this.ctx.reserveBottom) this.ctx.reserveBottom(h ? h + 16 : 0);
    try { dispatchEvent(new Event('exhibit:dockh')); } catch (e) {}
  },
  /* upright the dock floats over the foot of the stage, where the open room's card ends (the universe's dated card and its
     coverage caveat, a wall opened with more): the card is painted above the dock by a translate, which moves no layout, so
     the stage never relayouts for it, and never up under the top bar. a folded card (no height) is left where it is; one
     that opens or grows under the open dock (a star picked, more) is measured again */
  lift(on) {
    const w = on ? document.querySelector('section[data-room].is-active .wall') : null;
    if (w !== this.liftW) {
      if (this.liftRO) this.liftRO.disconnect();
      this.liftW = w;
      if (w && typeof ResizeObserver === 'function') try { (this.liftRO = this.liftRO || new ResizeObserver(() => requestAnimationFrame(() => this.measure()))).observe(w); } catch (e) {}
    }
    if (!w || !w.offsetHeight || !this.el) return 0;
    const p = w.offsetParent, top = (p ? p.getBoundingClientRect().top : 0) + w.offsetTop, tb = document.getElementById('top');
    return Math.max(0, Math.min(this.el.offsetHeight + 4, Math.round(top - (tb ? tb.getBoundingClientRect().bottom : 0) - 8)));
  },
  /* the words in front go when the bar is narrow; the link and the word spotify never do */
  setAttr(lead, tail, href) {
    if (this.attr.tagName === 'A') this.attr.href = href;
    this.attr.firstChild.textContent = lead;
    this.attr.lastChild.textContent = this.attr.tagName === 'A' ? tail : tail.replace(/\s*↗/, '');
  },
  /* the line under the bar: plain words, or parts where {a: text} is a link to the track on spotify */
  say(line, hold) {
    if (!this.msg) return;
    this.holdTo = hold ? Date.now() + hold : 0;
    const t = txt(line);
    if (Array.isArray(line)) {
      this.msg.replaceChildren(...line.map((p) => {
        if (typeof p === 'string') return document.createTextNode(p);
        const a = document.createElement('a'); a.className = 'exd-app'; a.href = TRACK_URL + this.wantTid; a.target = '_blank'; a.rel = 'noopener'; a.textContent = (p && p.a) || ''; return a;
      }));
    } else this.msg.textContent = t;
    this.msg.hidden = !t;
    this.el.classList.toggle('has-msg', !!t);
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
  /* R20: the link is the way to the app, so it stands out where it matters most: a preview, a phone, a preview that ended */
  paintLink() {
    if (!this.el || wmode()) return;
    const d = this.dur;
    this.el.classList.toggle('is-link', !this.failed && (coarse() || (d > 0 && d <= 31000) || this.ended));
  },
  show(artist, tid, keep) {
    const wm = wmode();
    this.hideAsk(true); this.qrOff();
    clearTimeout(this.failTo); clearTimeout(this.endTo); this.starting(false);
    if (!keep || this.artist !== artist) { this.dur = 0; this.pos = 0; this.posAt = 0; this.prog = false; this.lastRep = 0; this.ringTo(0, 0); this.note = ''; this.noticed = ''; }
    this.artist = artist; this.ended = false; this.failed = false; this.failKind = ''; this.playingNow = false; this.lastRun = false;
    this.open = true;
    this.el.classList.remove('is-tap', 'is-fail', 'is-card', 'is-void');
    this.el.style.setProperty('--fam', this.fam || '#86cbfe');
    this.disc.hidden = false;
    /* an empty 80px box is a lie about a player being there: until there is an iframe the slot only holds the line */
    this.el.classList.toggle('is-msg', !this.ctl);
    if (wm) {
      /* the wall, as before: a touch wall says "tap ▶" from the first frame once the player is there */
      if (!this.co) this.setLine('cueing up ', artist); else if (this.ctl && this.ready) this.tapLine(); else { this.setCue(false); this.setLine('', artist); }
      this.say(this.ctl ? this.note : this.quiet && !this.co ? '' : 'asking spotify for the player…');
      this.setAttr('player and artwork: ', 'spotify ↗', TRACK_URL + tid); this.attr.hidden = false;
      this.el.classList.remove('is-off');
      requestAnimationFrame(() => this.measure());
    } else {
      /* R20: the dock says loading until spotify's first report; webkit's line points at spotify's ▶ once its player is there */
      if (needTap() && this.ctl && this.ready && this.loaded === tid) this.tapLine(); else { this.setCue(false); this.setLine('loading Spotify… ', artist); }
      this.say(this.ctl ? this.note : '');
      this.setAttr('play on ', 'spotify ↗', TRACK_URL + tid); this.attr.hidden = false;
      this.attr.setAttribute('aria-label', 'play ' + artist + ' on spotify (opens a new tab or the app)');
      this.paintLink();
      if (!this.cueOnly) this.reveal();
    }
    this.track();
  },
  /* the player is in the slot: stop claiming to be fetching it, but do not claim it is playing either */
  slotted() {
    if (!this.el) return;
    this.el.classList.remove('is-msg');
    if (!this.started && !this.failed && !this.cueOnly) { this.say(this.note); if (wk() && this.open) this.tapLine(); }
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
    if ((fresh || this.msg.textContent !== txt(this.note)) && Date.now() > this.holdTo) this.say(this.note);
  },
  pauseLine() { this.el.classList.remove('is-tap'); this.setCue(false); this.setLine('paused on ', this.artist); },
  /* R18: the preview ran out. the record winds down, the bed comes back on that report, and the line says what happened */
  endLine() {
    if (this.ended) return;
    this.ended = true; clearTimeout(this.tapTo);
    const pre = !(this.dur > 31000);
    if (wk()) { this.el.classList.add('is-tap'); this.setLine('tap ▶ to hear ', this.artist, ' again'); this.setCue(true); }
    else { this.el.classList.remove('is-tap'); this.setCue(false); this.setLine('that was ' + (pre ? 'a preview of ' : ''), this.artist); }
    this.say(pre ? 'that was the preview. the whole song is on spotify.' : '');
    this.ringTo(1, 250);
    this.paintLink();
  },
  /* the embed took the request and never started. a player that is there gets a pointer at its own ▶ (webkit) or the
     record (chromium); one that never arrived becomes the card, but only for a post the visitor used */
  stalled(artist) {
    if (this.started || !this.open || this.failed) return;
    const wm = wmode();
    if (this.ready && this.ctl) { if (wm || needTap()) this.tapToPlay(artist); else this.cuedUp(); return; }
    if (!wm && !this.used) { this.close(false); return; }
    this.failed = true; this.failKind = 'stall'; this.setCue(false);
    this.setLine('could not play ', artist);
    this.say(wm ? 'the player never arrived. something may be blocking it. ' + WALL_OPEN : 'the player never arrived: blocked, or slow.');
    this.cardOn(artist, this.wantTid, true);
    if (!wm) this.reveal();
    this.track();
  },
  fail(artist, tid) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); clearTimeout(this.mutTo); this.started = false; this.making = false;
    const wm = wmode();
    /* a stop change or a close took the dock away while the player was still on its way: nothing to show */
    if (!this.open) { this.ctl = null; this.ready = false; this.loaded = ''; return; }
    this.clearSlot(); this.ctl = null; this.ready = false; this.loaded = ''; this.el.classList.add('is-msg');
    if (!wm && !this.used) { this.close(false); return; }
    this.failed = true; this.failKind = 'api'; this.playingNow = false; this.lastRun = false; this.setCue(false);
    this.setLine('could not play ', artist);
    this.say(wm ? 'spotify did not load. it may be blocked on this network, or you may be offline.' + (tid ? ' ' + WALL_OPEN : '') : 'spotify did not load: blocked, or offline.');
    if (tid) this.cardOn(artist, tid, true); else this.attr.hidden = true;
    hush('off', 'fail');
    /* the wall: a pill dropped where the finger was sits on top of the card it came from, so on touch it moves to the bottom dock */
    if (wm) this.el.classList.toggle('is-fail', this.quiet && coarse());
    clearTimeout(this.failTo);
    if (!wm) this.reveal();
    requestAnimationFrame(() => this.measure());
    this.track();
  },
  /* R18: spotify's own 'error' for this track (it cannot find or play it here): the card, and the bed back */
  dead(artist, tid) {
    if (!this.open || this.started || this.failed) return;
    clearTimeout(this.armTo); clearTimeout(this.tapTo); clearTimeout(this.mutTo);
    const wm = wmode();
    if (!wm && !this.used) { this.close(false); return; }
    this.failed = true; this.failKind = 'dead'; this.setCue(false);
    this.setLine('could not play ', artist);
    this.say('spotify cannot play this one here.' + (wm ? ' ' + WALL_OPEN : ''));
    this.cardOn(artist, tid, true);
    hush('off', 'fail');
    if (!wm) this.reveal();
    this.track();
  },
  /* the link becomes a card of its own: one target with the artist's name and spotify's on it */
  cardOn(artist, tid, gone) {
    /* the wall opens no tab: the card shows a code for the song, to scan with a phone */
    if (wmode()) { this.attr.hidden = true; this.qrOn = !!tid; if (tid) { if (this.quiet) this.setQuiet(false); this.qrPaint(artist, tid); } }
    else { if (tid) this.setAttr('play ' + artist + ' on ', 'spotify ↗', TRACK_URL + tid); this.attr.hidden = !tid; this.el.classList.remove('is-link'); }
    this.disc.hidden = true;
    this.el.classList.add('is-card'); this.el.classList.toggle('is-void', !!gone);
    if (this.quiet && !this.co) requestAnimationFrame(() => this.place(this.px || 8, this.py || 8));
    requestAnimationFrame(() => this.measure());
  },
  /* R19 the wall's code, in the dock. posts=qr: a press puts the artist and a code for the song here, with no player, no
     request and no link, and consent stays false. posts=spotify: a failure shows the same code in place of the card that
     would have opened a tab. the tile is whole css pixels per module (qr.js), a third of the screen's short side */
  qrShow(artist, tid, trigger) {
    const was = this.qrOn;
    this.hideAsk(true);
    this.qrOn = true; this.qrArtist = artist;
    this.lastFocus = trigger && trigger.isConnected ? trigger : this.lastFocus;
    this.setQuiet(false);
    this.el.classList.remove('is-off', 'is-tap', 'is-fail', 'is-card', 'is-cue');
    this.el.classList.add('is-qr', 'is-void');
    this.disc.hidden = true; this.attr.hidden = true; this.yes.hidden = this.no.hidden = true; this.x.hidden = false;
    this.x.textContent = 'close'; this.x.setAttribute('aria-label', 'put the code away');
    this.setLine('scan to hear on your phone', artist);
    this.say('nothing reaches spotify from this screen.');
    this.qrPaint(artist, tid);
    syncBtns();
    requestAnimationFrame(() => this.measure());
    /* chrome.js keeps the tour on the code from its next 220 ms poll; this covers a stop that was about to end as the code went up */
    try { const U = this.ctx && this.ctx.tour; if (U && typeof U.holdAtLeast === 'function') U.holdAtLeast(3000); } catch (e) {}
    if (trigger && !was) { try { this.x.focus({ preventScroll: true }); } catch (e) {} }
  },
  qrPaint(artist, tid) {
    const box = this.qrBox; if (!box || !tid) return;
    const seq = ++this.qrSeq, url = TRACK_URL + tid;
    const put = (M) => {
      if (seq !== this.qrSeq || !this.qrOn) return;
      const q = M.encode(url), n = q.size + 8;
      const m = Math.max(3, Math.min(16, Math.round(Math.min(innerHeight * 0.3, innerWidth * 0.34) / n)));
      const svg = M.toSvg(q, { module: m, label: 'scan with your phone to hear ' + artist });
      svg.setAttribute('data-qr-url', url);
      box.replaceChildren(svg);
      this.el.style.setProperty('--qrw', n * m + 'px');
      this.el.classList.add('is-qr');
      requestAnimationFrame(() => this.measure());
    };
    if (QRM) put(QRM); else qrMod(this.ctx).then(put).catch(() => { if (seq === this.qrSeq) this.qrOff(); });
  },
  /* the code stands under the stage column, not across the whole screen: the wall's liner (title and caption) stays readable beside it */
  qrFit() {
    const s = this.ctx && typeof this.ctx.stage === 'function' ? this.ctx.stage() : null, st = this.el.style;
    if (!s || !isFinite(s.x) || !isFinite(s.w) || s.w < 360) { st.removeProperty('--qrl'); st.removeProperty('--qrr'); return; }
    st.setProperty('--qrl', Math.max(10, Math.round(s.x)) + 'px'); st.setProperty('--qrr', Math.max(10, Math.round(innerWidth - s.x - s.w)) + 'px');
  },
  /* later: the dock is sliding out, so the code stays drawn until it has gone (a newer code or a close in between wins) */
  qrWipe() {
    if (this.qrBox) this.qrBox.textContent = '';
    this.el.classList.remove('is-qr');
    this.x.textContent = 'stop'; this.x.setAttribute('aria-label', 'stop the clip and close the player');
  },
  qrOff(later) {
    if (!this.qrOn) { if (!later && this.qrBox && this.el.classList.contains('is-qr')) this.qrWipe(); return; }
    this.qrOn = false; const seq = ++this.qrSeq; this.qrArtist = '';
    if (later) setTimeout(() => { if (seq === this.qrSeq && !this.qrOn) this.qrWipe(); }, 400); else this.qrWipe();
  },
  /* revoke(): forget the player altogether, so the next visitor starts from nothing */
  teardown() {
    const c = this.ctl; this.ctl = null;
    if (c && typeof c.destroy === 'function') { try { c.destroy(); } catch (e) {} }
    if (this.slot) this.clearSlot();
    if (this.who) this.who.textContent = '';
    this.ready = false; this.loaded = ''; this.wantTid = ''; this.making = false; this.heard = false; this.playFor = ''; this.playT = 0; this.nudT = 0; this.evAt = 0;
    this.artist = ''; this.line = ''; this.fam = ''; this.famName = ''; this.note = ''; this.via = 'tap'; this.mine = false; this.cueOnly = false; this.cueGo = false; this.used = false; this.noticed = '';
    this.dur = 0; this.pos = 0; this.posAt = 0; this.prog = false; this.lastRep = 0; this.atEnd = false; this.popAt = 0;
    this.ringTo(0, 0);
    this.qrOn = false; this.qrSeq++; this.qrArtist = '';
    if (this.el) { this.qrWipe(); this.el.classList.remove('is-card', 'is-void', 'is-fail', 'is-msg', 'is-playing', 'is-link'); }
  },
  /* a player declared missing or silent that turns up after all: take the card back and carry on */
  unfail() {
    this.qrOff();
    this.failed = false; this.failKind = '';
    this.el.classList.remove('is-card', 'is-void', 'is-fail');
    this.disc.hidden = false; this.say(this.note);
    if (wmode()) { this.setAttr('player and artwork: ', 'spotify ↗', this.attr.href); if (coarse()) this.tapLine(); else this.setLine('cueing up ', this.artist); return; }
    this.setAttr('play on ', 'spotify ↗', TRACK_URL + this.wantTid);
    if (wk()) this.tapLine(); else this.setLine('loading Spotify… ', this.artist);
    this.paintLink();
  },
  /* the bed goes down the moment a clip is asked for, so the clip never starts over it at full level. if the clip has
     not started six seconds later, the bed comes back */
  arm(t0) {
    const artist = this.artist, wm = wmode();
    this.armT = t0 || Date.now(); this.started = false; clearTimeout(this.armTo); clearTimeout(this.tapTo);
    /* R10: focus still sits in the player from the last tap there (a tap on the field moves no focus), so the next tap
       in it would raise no blur and the bed would not hear it. a new ask always comes from outside the player: take
       focus back to the page, quietly (webkit ignores blur() on a frame, so a throwaway focus target does it) */
    const pf = this.slot && this.slot.querySelector('iframe');
    if (pf && document.activeElement === pf) { try { pf.blur(); if (document.activeElement === pf) { const d = document.createElement('div'); d.tabIndex = -1; document.body.appendChild(d); d.focus({ preventScroll: true }); d.remove(); } } catch (e) {} }
    /* a frame that wants a tap inside it: the tap line is already up and the bed stays until the embed really plays. the
       only thing left to watch for is a player that never arrives */
    if (wk()) { this.armTo = setTimeout(() => { if (this.open && !this.ready && !this.started) this.stalled(artist); }, wm ? 6000 : STALL_MS); return; }
    /* R5 watchdog fix: the bed goes down only once the id has resolved and the embed is ready; before that nothing ducks */
    if (this.ready) hush('armed');
    /* R10: a ready player answers a play within a second or so. silence past that means a blocker is eating its reports
       while it may be sounding, so the bed goes out now and waits one preview's length */
    clearTimeout(this.mutTo);
    if (this.ready) this.mutTo = setTimeout(() => { if (this.open && !this.started && this.evAt < this.armT) { hush('hot'); this.waitOut(artist); } }, 1500);
    if (wm && this.quiet && this.ready) this.tapTo = setTimeout(() => this.tapToPlay(artist), 3500);
    this.armTo = setTimeout(() => {
      if (this.started) return;
      /* R10: spotify said nothing at all since the ask while the player is there: it may be playing behind a blocker, so the
         bed stays out for one preview's length rather than coming back over it */
      if (this.ready && this.evAt < this.armT) { hush('hot'); if (this.heard) this.mute(artist); this.waitOut(artist); return; }
      if (!this.tapAt) hush('off');
      if (wm) { this.stalled(artist); return; }
      if (this.ready) { this.cuedUp(); return; }
      /* R20: a frame still on its way is not a failure yet */
      this.armTo = setTimeout(() => { if (this.open && !this.started && !this.ready) this.stalled(artist); }, STALL_MS - 6000);
    }, 6000);
  },
  /* R11: spotify has said nothing since the ask and the bed is out. a player that has NEVER said a word (a blocker that lets
     the frame load and eats every message) is the one case the dock gives up on, after one preview's length from the
     first moment the bed went out for this ask */
  waitOut(artist) {
    if (this.hotFor === this.armT) return;
    this.hotFor = this.armT; clearTimeout(this.hotTo);
    this.hotTo = setTimeout(() => { if (this.evAt < this.armT) this.mute(artist); }, 32000);
  },
  mute(artist) {
    if (!this.open || this.started && this.heard) return;
    if (this.heard) { this.say('spotify stopped answering, so the room stays quiet until you press stop.'); return; }
    const wm = wmode();
    if (!wm && !this.used) { this.close(false); return; }
    this.setLine('', 'no word from spotify');
    this.say("something may be blocking its player. the room's music is back. " + (wm ? WALL_OPEN : 'the card opens spotify.'));
    /* the frame stays: if it is playing behind a blocker, its own pause is still there */
    this.failed = true; this.failKind = 'mute'; this.setCue(false);
    if (this.wantTid) this.cardOn(artist, this.wantTid, false);
    hush('off', 'fail');
    if (!wm) this.reveal();
    this.track();
  },
  /* R18 (webkit): spotify says it is starting but there is no sound yet (ios's blink, or buffering). after 600 ms of that
     it is not a blink: the ring leaves spotify's button and the line says cueing up; 8 s more of nothing and it goes back */
  starting(on) {
    if (!on) { clearTimeout(this.startTo); this.startTo = 0; return; }
    if (this.startTo) return;
    this.startTo = setTimeout(() => {
      this.startTo = 0;
      if (!this.open || !this.lastRun || this.playingNow || this.failed) return;
      this.el.classList.remove('is-tap'); this.setCue(false); this.setLine(wmode() ? 'cueing up ' : 'loading Spotify… ', this.artist); this.track();
      this.startTo = setTimeout(() => { this.startTo = 0; if (this.open && !this.playingNow && !this.failed && !this.ended) { this.tapLine(); this.track(); } }, 8000);
    }, 600);
  },
  /* R18 (webkit): a tap went into the player and spotify has said nothing for 4 s, though it has talked before. most often
     the tap missed the ▶. the room stays quiet (R11: never on silence), the ring goes back on the ▶, and the line says so */
  quietTap() {
    if (!this.open || this.started || this.failed) return;
    this.tapLine();
    this.say('no word from spotify since that tap. if it is silent, tap ▶ again, or stop.');
    this.track();
  },
  pending() { return this.open && !this.cueOnly && !this.started && Date.now() - this.armT < (wk() ? 2500 : 6000); },
  /* R18: the record. playing: pause. otherwise play, inside this click, so the browser counts it as the visitor's own
     (a paused clip resumes, a finished preview starts over) */
  press() {
    if (!this.ctl || !this.open || this.failed) return;
    this.used = true;
    if (!this.playingNow) this.mine = true;
    if (this.cueOnly) { startCued(); return; }
    if (this.playingNow) { ctlDo('pause'); return; }
    nudge(this.wantTid, this.ended || this.atEnd ? 'restart' : this.started && this.prog ? 'resume' : 'play');
    /* a frame that will not take a start from outside: point at spotify's own ▶ */
    if (wk()) { clearTimeout(this.tapTo); this.tapTo = setTimeout(() => { if (this.open && !this.playingNow && !this.failed) this.tapLine(); }, 1500); }
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
    if (this.cueOnly) return 'cued';
    if (this.failed) return 'fail';
    if (this.playingNow) return 'playing';
    if (this.ended) return 'ended';
    if (this.prog) return 'paused';
    if (!this.ctl || !this.ready) return 'armed';
    return 'cueing';
  },
  viaOut() { const v = this.via; return v === 'dwell' || v === 'tour' || v === 'auto' || v === 'stop' ? v : 'tap'; },
  /* sm:clip: on every change of state, artist or via, and every 250 ms while playing (the position estimate) */
  emit(tick) {
    const state = this.clipState(), artist = this.artist || '', via = this.viaOut(), visitor = this.open && !!this.mine;
    const key = state + '\u0001' + artist + '\u0001' + via + '\u0001' + visitor, changed = key !== this.ek;
    if (!changed && (!tick || Date.now() - this.tickAt < 250)) return;
    this.ek = key; this.tickAt = Date.now();
    try { dispatchEvent(new CustomEvent('sm:clip', { detail: { state, artist, position: Math.round(this.estPos()), duration: Math.round(this.dur || 0), via, visitor } })); } catch (e) {}
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
      /* where the frame wants a tap inside it, the record only pauses: spotify's ▶ is the only play */
      const off = pl ? false : wk();
      if (this.disc.disabled !== off) { this.disc.disabled = off; if (off) this.disc.setAttribute('aria-hidden', 'true'); else this.disc.removeAttribute('aria-hidden'); }
      const lab = (pl ? 'pause ' : 'play ') + (this.artist || 'the clip') + (!pl && this.ended ? ' again' : '');
      if (this.disc.getAttribute('aria-label') !== lab) this.disc.setAttribute('aria-label', lab);
    }
    this.emit(false);
  },
  close(restoreFocus) {
    clearTimeout(this.armTo); clearTimeout(this.tapTo); clearTimeout(this.failTo); clearTimeout(this.inTo); clearTimeout(this.hotTo); clearTimeout(this.mutTo); clearTimeout(this.endTo); clearTimeout(this.radioTo); this.radioTo = 0; this.starting(false);
    const now = Date.now(), qrOnly = this.qrOn && !this.open, idle = this.cueOnly && !this.lastRun, wm = wmode();
    this.qrOff(true);
    /* R18: pause only a player that may be sounding: one that last reported playback, one asked to play and never heard
       from, a player asked to play since its last report, or one tapped since then. pausing a player that holds nothing
       throws in spotify's frame ("no list was loaded"); a cue that never ran holds nothing to pause. R20: off the wall a
       closed dock closing again (a room's leave after the stop change) has nothing new to pause: a clip still running
       reports, and the report pauses it */
    const again = !wm && !this.open && !this.qrOn;
    if (this.ctl && !idle && !again && (this.lastRun || (!this.heard && (wm || this.nudT > 0)) || (!wk() && this.nudT > this.evAt && now - this.nudT < 3000) || this.tapAt > this.evAt)) ctlDo('pause');
    this.started = false; this.tapAt = 0; this.mine = false; this.playingNow = false; this.lastRun = false; this.ended = false; this.failed = false; this.failKind = '';
    this.cueOnly = false; this.cueGo = false; this.used = false;
    if (!qrOnly) hush('off', 'close');
    if (!this.el) return;
    this.open = false; this.el.classList.remove('is-tap', 'is-fail', 'is-card', 'is-void', 'is-cue', 'has-msg', 'is-link'); this.cue = false; this.h = -1; if (!this.asking) this.el.classList.add('is-off'); this.msg.hidden = true; this.msg.textContent = '';
    this.measure();
    this.track();
    const back = this.lastFocus; this.lastFocus = null;
    if (restoreFocus && back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  },
};

/* R10: a tap on spotify's own player moves focus into its frame, and this window hears blur before spotify reports
   anything (or ever does, behind a blocker). that is the moment the clip starts: the bed goes out now.
   R11: it stays out until spotify says paused or the dock closes. only a player that has never said a word is given up on */
addEventListener('blur', () => setTimeout(() => {
  const f = D.slot && D.slot.querySelector('iframe');
  if (!f || !D.open || D.cueOnly || document.activeElement !== f) return;
  D.tapAt = Date.now(); D.used = true; D.mine = true; hush('hot'); clearTimeout(D.inTo);
  D.setCue(false);
  const at = D.tapAt;
  D.inTo = setTimeout(() => { if (D.tapAt === at && D.evAt < at && !D.started) { if (wk() && D.heard) D.quietTap(); else D.mute(D.artist); } }, D.heard ? 4000 : 31000);
}, 0));
/* R11: silence is what a blocker or a throttled frame sounds like while spotify plays on, so nothing brings the bed back on
   it. a pause said while the page was hidden lands when it is seen */
document.addEventListener('visibilitychange', () => {
  const A = D.ctx && D.ctx.audio, s = D.later;
  if (document.hidden || !s || !A || !A.clip) return;
  D.later = null; if (A.clipState === 'hot') A.clip(s);
});

/* R20: preview or full track, said from spotify's first report for each track, before the end. a preview's line leads with
   the app where the frame can never sign in (safari); a phone has the link standing out instead of a line */
function notice() {
  if (wmode() || !D.open || !(D.dur > 0) || D.noticed === D.wantTid) return;
  D.noticed = D.wantTid;
  const vis = D.shows();
  if (D.dur > 31000) { D.note = ''; if (vis) D.say('full track.', 5000); }
  else if (coarse()) D.note = '';
  else if (signIn()) D.note = ['30-second preview. sign in to Spotify in this browser for full songs, or ', { a: 'open in the app ↗' }];
  else D.note = [{ a: 'open in the app ↗' }, ' for the whole song. this is the 30-second preview.'];
  D.paintLink();
  if (vis && D.note && Date.now() > D.holdTo) D.say(D.note);
}

/* one report from the embed: {isPaused, position, duration} */
function report(e) {
  const dat = e && e.data; if (!dat) return;
  const now = Date.now(), pos = +dat.position || 0;
  D.evAt = now; D.heard = true;
  if (dat.duration > 0) D.dur = +dat.duration;
  const dur = D.dur, end = dur > 0 && pos >= dur - 40, run = !dat.isPaused && !end, co = wk();
  if (end && D.prog) D.atEnd = true; else if (run) D.atEnd = false;
  /* the dock is closed but the embed still plays (a pause that did not take): ask again, and keep the bed out until it
     stops. R18: a report at the very end, or ios's blink at 0, is not playing, and pausing it throws in spotify's frame */
  if (!D.open) { if (run && (pos > 0 || !co)) { ctlDo('pause'); hush('hot'); } else hush('off', 'pause'); return; }
  /* a cue out of sight only listens: it learns the track's length, and one that starts by itself is stopped */
  if (D.cueOnly) { if (run) ctlDo('pause'); notice(); return; }
  /* a player declared silent or missing that talks after all, or one spotify refused that plays anyway: carry on */
  if (D.failed && (D.failKind === 'mute' || D.failKind === 'stall' || (run && pos > 0))) D.unfail();
  const was = D.playingNow, wasRun = D.lastRun, prev = D.pos;
  const gap = D.lastRep ? Math.max(250, Math.min(1500, now - D.lastRep)) : 1000;
  D.lastRep = now; D.pos = pos; D.posAt = now; D.lastRun = run;
  /* webkit's "playing" needs the position past 0 (ios's blink); elsewhere it needs spotify saying so, not still buffering */
  D.playingNow = run && (pos > 0 || (!co && !dat.isBuffering));
  if (run) D.lastRunAt = now;
  if (D.playingNow) { if (pos > 0) D.prog = true; D.ended = false; if (D.popAt < D.armT) { D.popAt = D.armT; D.pop(); } }
  const ran = dur > 0 && pos === 0 && prev >= dur - 1500; /* a stand-in that reports the end as paused at 0 */
  notice();
  if (co) {
    /* R9: "hearing" only while the embed reports real playback. ios plays for a blink and pauses at 0 when the tap came
       from outside the frame; that undoes the claim, and any pause puts the tap line back */
    if (D.playingNow) { D.starting(false); if (!D.started) { D.started = true; D.playAt = now; } D.playing(D.artist, !was); }
    else if (run) D.starting(true);
    else {
      D.starting(false);
      if (D.started && pos === 0 && now - D.playAt < 4000 && !end) D.started = false;
      /* resuming is only from spotify's own ▶, so a pause says where that is */
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
       back (a refused start) is not a clip that played; one that reached its end, or paused, says so */
    if (wasRun && D.started && !D.tapAt && now - D.nudT < 4000 && pos === 0 && prev === 0 && !end) { D.started = false; if (wmode()) D.setLine('cueing up ', D.artist); else D.cuedUp(); }
    else if (wasRun && D.started && D.prog && (end || ran)) D.endLine();
    /* a refused play() can jump the clip to its end with no sound in between: that is a no, not a preview */
    else if (end && !D.prog) { D.started = false; D.playingNow = false; if (wmode()) D.tapToPlay(D.artist); else D.cuedUp(); }
    else if (wasRun && D.started && pos > 0) D.pauseLine();
    D.tapAt = 0; clearTimeout(D.inTo);
    hush(D.pending() && D.ready && !D.el.classList.contains('is-tap') ? 'armed' : 'off', 'pause');
  }
  if (D.playingNow && dur > 0) D.ringTo((pos + gap) / dur, gap); else D.ringTo(D.ended ? 1 : D.prog && dur > 0 ? pos / dur : 0, 200);
  D.track();
  /* the embed loads paused; one nudge per uri, never a loop */
  if (dat.isPaused && D.playT && now - D.playT < 4000 && pos === 0) { D.playT = 0; setTimeout(() => { if (D.open && !D.cueOnly && !D.started && !D.tapAt) { D.nudT = Date.now(); ctlDo('play'); } }, Math.max(0, D.armT + 320 - now)); }
}

/* resolve an artist to a controller playing them. `trigger` is the control that was clicked, for focus return.
   o: { via, fam, quiet (the wall), kb, cue (R20: load out of sight for the stop, start nothing) } */
async function playArtist(artist, ctx, trigger, o = {}) {
  /* R5: no duck yet. a miss never ducks; arm() ducks once the embed is ready (the ready listener re-arms) */
  if (wmode() === 'qr' || wmode() === 'off') return 'notid';
  const cue = !!o.cue && !wmode();
  if (cue && D.open && !D.cueOnly) return 'busy';
  const t0 = Date.now(), g = gen;
  const ids = await loadIds(), tid = ids[artist];
  if (!tid) return 'notid';
  if (g !== gen) return 'ok'; /* revoke() ran while the ids were on their way: this request belongs to a visitor who has gone */
  if (cue && D.open && !D.cueOnly) return 'busy'; /* the visitor played something while the ids were on their way */
  clearTimeout(D.radioTo); D.radioTo = 0;
  if (wmode()) grantConsent();
  D.build(ctx); D.ctx = ctx; wire(ctx); loadFam(ctx);
  const via = o.via === 'dwell' || o.via === 'tour' || o.via === 'auto' || o.via === 'stop' ? o.via : 'tap';
  /* the stop's cue, asked for again: it is loaded already, so it shows and starts, with no second load */
  const cued = !cue && D.open && D.cueOnly && D.artist === artist && D.wantTid === tid;
  /* R18: the same artist, paused or finished in the open player: carry on (or start over) without a new load */
  const cont = !cue && !cued && D.open && D.artist === artist && D.loaded === tid && !!D.ctl && D.ready && !D.failed && (D.ended || (D.started && D.prog && !D.playingNow));
  const how = cont ? (D.ended || D.atEnd ? 'restart' : 'resume') : '';
  const was = D.shows();
  D.via = via; D.mine = !cue && (via === 'tap' || via === 'dwell' || !!o.mine); D.famName = o.fam || ''; D.fam = famHex(o.fam) || famOf(artist);
  /* the wall: a quiet play is the pill at o.quiet ({x, y}) */
  if (wmode()) D.setQuiet(!!o.quiet, o.quiet && typeof o.quiet === 'object' ? o.quiet : null); else D.quiet = false;
  if (!cued) { D.msg.hidden = true; D.msg.textContent = ''; }
  D.cueOnly = cue; D.cueGo = false;
  if (!cue) D.used = true;
  D.lastFocus = trigger && trigger.isConnected ? trigger : D.lastFocus;
  D.wantTid = tid;
  D.show(artist, tid, cont || cued);
  if (!cue && !cont) D.arm(t0);
  /* a visitor who arrived by keyboard lands on the player, so escape and the stop button are one key away.
     a kiosk demo or a stop's cue passes no trigger and never steals the focus. */
  if ((trigger || o.kb) && !was && !cue) { try { D.x.focus({ preventScroll: true }); } catch (e) {} }
  if (cont) { nudge(tid, how); return 'ok'; }
  if (cued) { if (D.ctl && D.ready && D.loaded === tid) nudge(tid); return 'ok'; }
  let api;
  try { api = await loadApi(); } catch (e) { if (g !== gen) return 'ok'; if (D.wantTid === tid) D.fail(artist, tid); return 'apifail'; }
  if (g !== gen) return 'ok';
  if (D.wantTid !== tid) return 'ok'; /* a later click already asked for someone else */
  if (D.ctl) {
    throttle(() => {
      if (D.wantTid !== tid || !D.ctl) return;
      try { if (D.loaded !== tid) { D.ctl.loadUri('spotify:track:' + tid); D.loaded = tid; D.playFor = ''; D.atEnd = false; } if (D.cueOnly) { if (D.ready) cueReady(); } else nudge(tid); } catch (e) { D.fail(artist, tid); }
    });
    return 'ok';
  }
  if (D.making) return 'ok'; /* the controller is on its way; its ready listener plays D.wantTid */
  D.making = true;
  try {
    const host = document.createElement('div'); host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'spotify player');
    D.clearSlot(); D.slot.appendChild(host);
    loads++; lastLoad = Date.now();
    api.createController(host, { uri: 'spotify:track:' + tid, height: 80, width: '100%', theme: 'dark' }, (ctl) => {
      if (g !== gen) { try { ctl.destroy(); } catch (e) {} return; } /* made for a visitor revoke() has since sent away */
      D.ctl = ctl; D.making = false; D.loaded = tid; D.playFor = ''; D.heard = false; D.atEnd = false;
      { const fr = D.slot.querySelector('iframe'); if (fr && !fr.title) fr.title = 'spotify player'; }
      /* the wall retires a controller by destroying it; a report it had already queued must not touch the next visitor's dock */
      const stale = () => wmode() && D.ctl !== ctl;
      ctl.addListener('ready', () => {
        if (stale()) return;
        D.ready = true; if (D.failKind === 'stall') D.unfail(); D.slotted();
        /* R10: spotify's loadUri reloads the frame, and every reload says ready again: only a track not yet loaded loads now */
        if (D.open && D.wantTid && D.wantTid !== D.loaded) { try { ctl.loadUri('spotify:track:' + D.wantTid); D.loaded = D.wantTid; D.playFor = ''; D.atEnd = false; loads++; lastLoad = Date.now(); } catch (e) {} }
        if (D.cueOnly) cueReady(); else if (D.playFor !== D.loaded) nudge(D.wantTid);
        requestAnimationFrame(() => D.measure());
      });
      ctl.addListener('playback_started', () => {
        if (stale()) return;
        D.evAt = Date.now(); D.heard = true;
        if (!D.open || D.cueOnly) return;
        /* ios's blink after our own play() is not a start: the first report with the position past 0 is */
        if (wk() && !D.tapAt && Date.now() - D.nudT < 1500) return;
        hush('hot');
      });
      ctl.addListener('playback_update', wmode() ? (e) => { if (!stale()) report(e); } : report);
      /* R18: spotify says it cannot find or play this track here: the card, never a dead grey box */
      ctl.addListener('error', (e) => {
        if (stale()) return;
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
/* R20: the stops, the sound, the first press. a stop change closes a clip (or the tour hands it over), and the new stop's
   post is cued; the sound coming on starts a cue; muting pauses the clip, since this page's mute cannot reach spotify's frame */
function wire(ctx) {
  if (!ctx) return;
  if (!D.ctx) D.ctx = ctx;
  watchStops(ctx);
  if (wired || !ctx.audio || typeof ctx.audio.onChange !== 'function') return;
  wired = true;
  try {
    ctx.audio.onChange((s) => {
      if (wmode()) return;
      if (s === 'muted') { if (D.open && !D.cueOnly && (D.playingNow || D.lastRun)) ctlDo('pause'); return; }
      if (s === 'on') { cueReady(); cueSoon(); }
    });
  } catch (e) {}
}
function watchStops(ctx) {
  if (stopSub || !ctx || typeof ctx.onStop !== 'function') return;
  stopSub = true;
  ctx.onStop((ev) => {
    /* the shell repeats the current stop once at boot ('mount'): that is not a change */
    const same = !!ev && ev.via === 'mount' && (LASTSTOP === -1 || LASTSTOP === ev.i);
    if (ev && isFinite(ev.i)) LASTSTOP = ev.i;
    if (same) { cueSoon(); return; }
    STOPN++;
    D.hideAsk();
    if (D.qrOn && !D.open) { D.close(false); return; }
    if (wmode()) {
      if (!D.open || !D.quiet) return;
      if (ev && ev.via === 'tour' && radioOn()) { holdForTour(ctx); return; }
      D.close(false);
      return;
    }
    /* R18 radio: the tour turning the page under a listening visitor keeps the player 4 s, so the next stop's post can take
       over; with no hand-over it closes, as every other stop change does at once */
    if (D.open && !D.radioTo) { if (!D.cueOnly && ev && ev.via === 'tour' && radioOn()) holdForTour(ctx); else D.close(false); }
    cueSoon();
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
/* R10: play at once. spotify's api holds a command while its frame (re)loads and sends it on ready. R18: a clip at its
   end starts over */
function nudge(tid, how) {
  if (!D.ctl || D.wantTid !== tid || !D.open || D.cueOnly) return;
  D.arm(); D.ended = false; D.playT = D.nudT = Date.now(); D.playFor = D.loaded;
  ctlDo(how || (D.atEnd ? 'restart' : 'play'));
  D.track();
}

/* ------------------------------------------------------------------ R20: the post on screen */
/* one IntersectionObserver over every post off the wall. a stop's first post that is at least half visible (in its active
   room, not hidden or faded out) is cued once per stop: after a stop change the page settles (a room fades in, a card
   slides) before anything is read, so the scan runs three times */
const ROOTS = new WeakMap(), ROOTSET = new Set(), SEEN = new WeakSet();
let IO = null, STOPN = 0, LASTSTOP = -1, scanT = [], cueKey = '', kickT = 0, preTried = false, GEST = false;
/* the privacy stance (R20 item 18): a stop's post is loaded only after a press on this page or one carried over to it */
const gestured = () => { if (GEST) return true; try { return !!(navigator.userActivation && navigator.userActivation.hasBeenActive); } catch (e) { return false; } };
function observe(root) {
  if (!IO && typeof IntersectionObserver === 'function') {
    try { IO = new IntersectionObserver((es) => { es.forEach((e) => { if (e.intersectionRatio >= 0.5) SEEN.add(e.target); else SEEN.delete(e.target); }); cueSoon(); }, { threshold: 0.5 }); } catch (e) { IO = null; }
  }
  if (IO) try { IO.observe(root); } catch (e) {}
}
function onScreen(root) {
  if (!root.isConnected || root.closest('[hidden],[inert]')) return false;
  const sec = root.closest('section');
  if (sec && sec.hasAttribute('data-room') && !sec.classList.contains('is-active')) return false;
  if (IO && !SEEN.has(root)) return false;
  const r = root.getBoundingClientRect();
  if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
  for (let e = root; e && e.nodeType === 1; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return false;
  }
  return true;
}
function cueSoon() {
  if (wmode()) return;
  scanT.forEach(clearTimeout);
  scanT = [400, 1200, 2500].map((ms) => setTimeout(cueScan, ms));
}
function cueScan() {
  if (wmode() || kioskOn() || muted() || !gestured()) return;
  const key = String(STOPN);
  if (cueKey === key) return;
  ROOTSET.forEach((r) => { if (!r.isConnected) ROOTSET.delete(r); });
  const list = [...ROOTSET].filter(onScreen);
  if (!list.length) return;
  list.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const m = ROOTS.get(list[0]); if (!m) return;
  cueKey = key;
  const vis = D.shows();
  /* the tour's hand-over: a listening visitor hears the next stop's post */
  if (D.radioTo && vis) { playQuiet(m.artist, m.ctx, { via: 'tour', fam: m.fam }).catch(() => {}); return; }
  if (vis) return;
  if (D.open && D.cueOnly && D.artist === m.artist) { cueReady(); return; }
  playArtist(m.artist, m.ctx, null, { cue: true, via: 'stop', fam: m.fam }).catch(() => {});
}
/* the cue is loaded and the visitor has pressed something with the sound on: start it. webkit shows the dock with the ring
   on spotify's ▶ instead, since only a tap inside the frame starts it there */
function cueReady() {
  if (wmode() || !D.cueOnly || !D.open || !D.ctl || !D.ready || D.loaded !== D.wantTid) return;
  if (muted() || kioskOn() || !(D.cueGo || soundOn())) return;
  if (needTap()) { D.cueOnly = false; D.cueGo = false; D.reveal(); D.tapLine(); D.say(D.note); D.track(); return; }
  startCued();
}
function startCued() {
  if (!D.cueOnly) return;
  D.cueOnly = false; D.cueGo = false;
  D.reveal(); D.say(D.note);
  nudge(D.wantTid);
}
/* the shell's gesture hook (W45 arm), called once it has woken the audio: a press anywhere starts the stop's cue, and the page's first
   press cues the stop's post if nothing is cued yet. a touch's pointerdown carries no activation yet, and a name or a post
   the press lands on goes first */
export function kick(e) {
  if (wmode() || kioskOn()) return;
  if (e && e.type === 'pointerdown' && e.pointerType !== 'mouse') return;
  const first = !GEST; GEST = true;
  if (first) preconnect();
  if (!D.cueOnly && !first) return;
  clearTimeout(kickT);
  kickT = setTimeout(() => { if (muted()) return; if (D.cueOnly) { D.cueGo = true; cueReady(); } else if (first && !D.open) cueSoon(); }, 120);
}
/* the handshake costs a moment on the first play; it is opened at idle, once, never while muted and never before a press */
function preconnect() {
  if (preTried || wmode() || kioskOn() || !gestured()) return;
  preTried = true;
  const go = () => {
    if (muted()) { preTried = false; return; }
    try { const l = document.createElement('link'); l.rel = 'preconnect'; l.href = 'https://open.spotify.com'; document.head.appendChild(l); } catch (e) {}
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 1200);
}

function grantConsent() {
  if (consent || !wmode()) return;
  if (wmode() === 'qr' || wmode() === 'off') return;
  consent = true;
  notes.forEach((n) => { if (n.isConnected) n.remove(); }); notes.clear();
}

/* rooms call this when they leave or reshuffle: the clip stops and the soundtrack comes back.
   the controller itself is kept, so the next artist starts without a second load. */
export function stopAll(ctx) {
  /* R18 radio: the room the tour is leaving stops its posts too; a listening visitor's player waits for the hand-over */
  if (D.el && D.shows() && (!wmode() || D.quiet) && enRoute(ctx) && radioOn()) { D.hideAsk(); holdForTour(ctx); return; }
  if (D.el) { D.hideAsk(); D.close(false); } else if (ctx && ctx.audio && !ctx.audio.clip) ctx.audio.duck(false);
}

/* R19 the wall. one visitor's yes must not carry to the next: the idle reset and the return to the loop call revoke(), through
   atlas/wallout.js and sm:wall-post (that file never imports this one, whatever ?v= this one is loaded with). consent and
   declined go back to false, the controller and its frame are destroyed, a fail card or a code is put away, and the printed
   notes come back. closeDock() is the dock's own close, so the bed returns by the rule that already returns it */
export function revoke() {
  if (!wmode()) return;
  gen++; lateRetried = false;
  clearTimeout(loadTo); loadTo = 0;
  consent = false; declined = false;
  if (D.el) { D.hideAsk(true); D.close(false); D.teardown(); }
  if (wmode() === 'spotify') {
    notes.forEach((n) => n.remove()); notes.clear(); noted = new WeakSet();
    noteHosts.forEach((nh) => {
      if (!nh.isConnected) { noteHosts.delete(nh); return; }
      noted.add(nh);
      const n = document.createElement('p'); n.className = 'post-note';
      n.textContent = 'the first one of these loads a player from spotify. nothing reaches them until you tap.';
      nh.appendChild(n); notes.add(n);
    });
  }
  syncBtns();
}
export function closeDock() { if (D.el) { D.hideAsk(); D.close(false); } }
addEventListener('sm:wall-post', (e) => {
  const op = e && e.detail && e.detail.op;
  if (op === 'revoke') revoke(); else if (op === 'close') closeDock();
});

/* ctx.post.playArtist(artist, o): a name or a control asks for an artist. off the wall it plays at once in the one dock.
   the wall: posts=qr shows a code, posts=spotify asks once per visitor */
export async function playQuiet(artist, ctx, o = {}) {
  if (!artist) return 'notid';
  const wm = wmode();
  if (wm === 'off') return 'off';
  if (wm === 'qr') return o.via === 'tour' || o.via === 'auto' || o.via === 'dwell' ? 'idle' : qrArtist(artist, ctx, o.trigger || null);
  if (o.via === 'dwell') return 'idle';
  /* R18 radio: the tour and autoplay only ever change what a listening visitor hears: never after a stop or a pause */
  if (o.via === 'tour' || o.via === 'auto') {
    if (!radioOn()) return 'idle';
    if (D.artist === artist && D.playingNow) { clearTimeout(D.radioTo); D.radioTo = 0; return 'same'; }
    if (!wm || !(isFinite(o.x) && isFinite(o.y))) return playArtist(artist, ctx, null, Object.assign({}, o, { quiet: wm && D.quiet ? { x: D.px || 16, y: D.py || 16 } : false }));
  }
  if (wm) {
    if (o.quiet === false) return consent ? playArtist(artist, ctx, o.trigger || null, o) : 'ask';
    const ids = await loadIds(); if (!ids[artist]) return 'notid';
    const at = isFinite(o.x) && isFinite(o.y) ? { x: +o.x, y: +o.y } : null;
    D.build(ctx); D.ctx = D.ctx || ctx; wire(ctx);
    if (!consent) { if (declined) return 'declined'; D.ask(artist, at, o); return 'ask'; }
    if (D.open && D.quiet && D.artist === artist && !D.failed && (D.playingNow || (!D.started && !D.ended))) return 'same';
    return playArtist(artist, ctx, o.trigger || null, Object.assign({}, o, { quiet: at || { x: 16, y: 16 } }));
  }
  /* the name that is already playing, or starting, keeps playing */
  if (D.shows() && D.artist === artist && !D.failed && (D.playingNow || D.pending())) return 'same';
  return playArtist(artist, ctx, o.trigger || null, Object.assign({}, o, { via: o.via === 'tour' || o.via === 'auto' ? o.via : 'tap' }));
}
/* R19 posts=qr: a press resolves the artist's track id (this site's own audio/sonic-tid-to-artist.json) and shows its code */
async function qrArtist(artist, ctx, trigger) {
  const ids = await loadIds(), tid = ids[artist];
  if (!tid) return 'notid';
  D.build(ctx); D.ctx = ctx; wire(ctx);
  D.qrShow(artist, tid, trigger);
  return 'ok';
}
/* listening: a clip is playing, or the preview just ran out and the visitor has not put the player away */
function radioOn() { return allowed() && D.open && !D.cueOnly && !D.failed && (D.playingNow || D.ended || Date.now() - D.lastRunAt < 3000); }
/* R20: a rest or a hold no longer plays anything (names are the buttons); kept so the rooms that still call them do nothing */
export function dwell() {}
export function undwell() {}
export function postState() {
  const st = { consent: allowed(), declined, quiet: D.quiet, open: D.open && !D.cueOnly, asking: D.asking, artist: D.artist, started: D.started, loads, pending: false, ready: D.ready,
    state: D.clipState(), position: Math.round(D.estPos()), duration: Math.round(D.dur || 0), via: D.viaOut(), visitor: D.open && !!D.mine, playing: D.open && D.playingNow, cue: D.cue, ended: D.ended, auto: false, failed: D.failed,
    cued: D.open && D.cueOnly, used: D.used };
  /* wall only. a code on show reports 'cueing' so the tour holds the stop while a phone is raised (chrome.js holds on it, 30 s at most) */
  const wm = wmode();
  if (wm) { st.mode = wm; st.qr = D.qrOn; st.qrArtist = D.qrArtist; if (D.qrOn && !D.open) st.state = 'cueing'; }
  return st;
}

/* play an artist with no control in the room (kiosk demos); the wall waits for a visitor's yes */
export function playClip(artist, ctx) {
  if (!allowed()) return Promise.resolve(false);
  return playArtist(artist, ctx, null, { via: 'auto' }).then((r) => r === 'ok').catch(() => false);
}

/* each post control says what the player is doing with its artist. off the wall the control is the name itself */
function paintBtn(rec) {
  const { btn, artist } = rec;
  if (btn.isConnected) rec.seen = true;
  if (rec.busy) return;
  const t = btn.querySelector('.post-t'), ico = btn.querySelector('.post-ico'); if (!t || !ico) return;
  const st = D.open && D.artist === artist ? D.clipState() : 'off';
  let text = rec.label(), icon = '▶', aria = ariaOf(artist), on = false;
  if (!wmode()) {
    const pl = st === 'playing';
    text = artist; icon = pl ? '❚❚' : '♪';
    aria = pl ? 'pause ' + artist : st === 'ended' ? 'play ' + artist + ' again' : aria;
    on = pl || st === 'armed' || st === 'cueing';
  } else if (st === 'playing') { text = 'hearing ' + artist; icon = '❚❚'; aria = 'pause ' + artist; on = true; }
  else if (st === 'armed' || st === 'cueing') { text = D.cue ? 'tap ▶ in the player' : 'cueing up ' + artist; on = true; }
  else if (st === 'paused') { text = 'paused on ' + artist; aria = 'play ' + artist; }
  else if (st === 'ended') { text = 'hear ' + artist + ' again'; aria = text; }
  else if (st === 'fail') text = 'could not play ' + artist;
  if (D.qrOn && !D.open && D.qrArtist === artist) on = true;
  if (t.textContent !== text) t.textContent = text;
  if (ico.textContent !== icon) ico.textContent = icon;
  if (btn.getAttribute('aria-label') !== aria) btn.setAttribute('aria-label', aria);
  btn.classList.toggle('is-on', on);
}
const ariaOf = (artist) => (wmode() === 'qr' ? 'show a code to hear ' + artist + ' on your phone' : wmode() ? 'hear a clip of ' + artist + ' in the player at the bottom of the screen' : 'play ' + artist + ' from Spotify');
function syncBtns() { BTNS.forEach((r) => { if (!r.btn.isConnected && r.seen) { BTNS.delete(r); return; } paintBtn(r); }); }

/* build a post control for `artist` inside `host`. returns the root element. */
export function post(host, artist, ctx, opts = {}) {
  const root = document.createElement('div'); root.className = 'post';
  const wm = wmode();
  /* posts=off: no control at all (an empty hidden root, so a room that keeps the node still has one) */
  if (wm === 'off') { root.hidden = true; host.appendChild(root); return root; }
  if (wm === 'qr') qrMod(ctx).catch(() => {});
  wire(ctx);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'post-btn';
  btn.innerHTML = '<span class="post-ico" aria-hidden="true">' + (wm ? '&#9654;' : '&#9834;') + '</span><span class="post-t"></span>';
  const label = () => (wm ? (opts.label || 'hear') + ' ' + artist : artist);
  const rec = { btn, artist, label, busy: false, seen: false };
  btn.querySelector('.post-t').textContent = label();
  btn.setAttribute('aria-label', ariaOf(artist));
  if (!wm) btn.title = 'plays from Spotify';
  root.appendChild(btn);
  BTNS.add(rec);
  if (wm && !consent) {
    const nh = opts.noteHost || root;
    if (!noted.has(nh)) {
      noted.add(nh);
      const n = document.createElement('p'); n.className = 'post-note';
      n.textContent = wm === 'qr' ? WALL_QR_NOTE : 'the first one of these loads a player from spotify. nothing reaches them until you tap.';
      nh.appendChild(n); notes.add(n); noteHosts.add(nh);
    }
  }
  host.appendChild(root);
  if (!wm) { ROOTSET.add(root); ROOTS.set(root, { artist, ctx, fam: opts.fam }); observe(root); preconnect(); cueSoon(); }
  const gone = (code) => {
    BTNS.delete(rec); ROOTSET.delete(root);
    root.textContent = '';
    const p = document.createElement('p'); p.className = 'post-note'; p.textContent = artist + ' (not available to play here)';
    root.appendChild(p); if (!code && !D.open) hush('off');
  };
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    if (wmode() === 'qr') {
      /* the code, not a player: nothing is asked of spotify and consent stays false */
      if (D.qrOn && D.qrArtist === artist) return;
      let r = 'notid';
      try { r = await qrArtist(artist, ctx, btn); } catch (e) { r = 'notid'; }
      if (r === 'notid') gone(true);
      return;
    }
    if (!wmode()) {
      /* the player already shows this artist: the control is its pause and play, inside this click */
      if (D.shows() && D.artist === artist && D.ctl && D.ready && !D.failed) { D.press(); return; }
      let r = 'notid';
      try { r = await playArtist(artist, ctx, btn, { via: 'tap', fam: opts.fam }); } catch (e) { r = 'notid'; }
      paintBtn(rec);
      if (r === 'notid') gone();
      return;
    }
    if (D.open && D.artist === artist && D.ctl && D.ready && !D.failed) { D.press(); return; }
    if (!consent) chord(ctx);
    btn.disabled = true; rec.busy = true; btn.querySelector('.post-t').textContent = 'cueing up ' + artist;
    let r = 'notid';
    try { r = await playArtist(artist, ctx, btn, { via: 'post', fam: opts.fam }); } catch (e) { r = 'notid'; }
    btn.disabled = false; rec.busy = false;
    paintBtn(rec);
    /* a blocked player is the dock's story to tell; only an artist with no track in my log loses its control */
    if (r === 'notid') gone();
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
.exd-act{display:contents}
.exd-who{margin:0;flex:1 1 auto;min-width:0;overflow:hidden;color:#f0eaff}
.exd-st,.exd-nm{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.exd-st{margin:0 0 1px;font:600 8.5px/1.3 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:#a49bbd}
.exd-st:empty{display:none}
.exd-nm{font:italic 400 14px/1.2 ${SERIF};letter-spacing:0;color:#f0eaff}
.exd-tl{font:600 10.5px/1.3 ${MONO};font-style:normal;letter-spacing:.09em}
.exd-tri{color:#86cbfe}
.exd.is-playing .exd-st{color:#86cbfe}
.exd.is-ask .exd-who{white-space:normal}
.exd.is-ask .exd-st,.exd.is-ask .exd-nm{display:inline;white-space:normal}
.exd.is-ask .exd-st{font:inherit;letter-spacing:inherit;text-transform:none;color:#f0eaff}
.exd.is-ask .exd-bar::before{content:'';flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:${REC};box-shadow:0 0 0 1px rgba(134,203,254,.35)}
.exd-attr{flex:0 0 auto;color:#a49bbd;text-decoration:none;font-weight:500;letter-spacing:.06em}
.exd-attr:hover{color:#86cbfe}
#exdock .exd-attr[hidden]{display:none}
.exd-x{flex:0 0 auto;font:600 10.5px/1 ${MONO};letter-spacing:.14em;text-transform:uppercase;color:#f0eaff;background:none;border:1px solid rgba(189,166,255,.34);border-radius:999px;padding:9px 13px;min-height:34px;cursor:pointer}
.exd-x:hover{border-color:#86cbfe;color:#86cbfe}
.exd-x:focus-visible,.exd-attr:focus-visible,.exd-app:focus-visible{outline:2px solid #86cbfe;outline-offset:3px}
.exd-x.exd-yes{background:#86cbfe;border-color:#86cbfe;color:#0a0118}
.exd-x.exd-yes:hover{background:#b5ddff;border-color:#b5ddff;color:#0a0118}
.exd-slot{position:relative;min-height:80px}
.exd.is-msg .exd-slot{min-height:0}
.exd.is-void .exd-slot{display:none}
.exd-attr-l,.exd-attr-s{pointer-events:none}
.exd iframe{border-radius:10px;display:block;border:0}
.exd-msg{margin:6px 2px 2px;font:400 11.5px/1.5 ${MONO};color:#a49bbd}
.exd-app{color:#86cbfe;text-decoration:underline;text-underline-offset:2px}
/* R18 the record: ring = progress, grooves turn only while spotify reports playback, the label is the family colour */
.exd-disc{position:relative;flex:0 0 auto;width:34px;height:34px;margin:0;padding:0;border:0;border-radius:50%;background:none;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.exd-disc[hidden]{display:none}
.exd-disc:focus-visible{outline:2px solid #86cbfe;outline-offset:2px}
.exd-disc:disabled{cursor:default}
.exd-disc:disabled .exd-gl{opacity:0}
.exd-ring{position:absolute;left:0;top:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible;pointer-events:none}
.exd-ring circle{fill:none;stroke-width:1.7}
.exd-ring-t{stroke:rgba(134,203,254,.16)}
.exd-ring-p{stroke:#86cbfe;stroke-dasharray:100;stroke-dashoffset:100;stroke-linecap:round}
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
   so the wall's dock leaves that half alone entirely and sits under the wall text on the left */
@media (max-height:520px) and (min-aspect-ratio:115/100){.exd{right:auto;margin:0;width:min(400px,40vw);max-width:none;padding:5px 9px 7px}.exd-attr-l{display:none}}
@media (prefers-reduced-motion:reduce){.exd{transition:none}}
/* the wall's pill (a quiet play or the ask, posts=spotify). #exdock: beats chrome.css's html.atlas #exdock{bottom} so the
   pill is never stretched to the bottom edge. it shows at once (focus can land on it) and fades out */
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
#exdock .exd-attr{padding:15px 4px;margin:-15px 0}
#exdock.exd.is-card .exd-attr{padding:6px 12px;margin:0}
.exd:not(.is-ask):not(.is-card) .exd-nm{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
}
/* R9 the touch wall's dock (is-co: a quiet play on a coarse pointer). one place for the ask, the player and a failure: the
   bottom edge, above the tab bar, never over a card. it slides in like the docked player and reserves its height (measure()) */
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
/* a touch wall held sideways: the left column is the card, which does not move for the dock; the stage on the right does
   (stage() takes the reserve off its bottom), so the dock sits under the stage, right-aligned */
@media (pointer:coarse) and (max-height:520px) and (min-aspect-ratio:115/100){html.atlas #exdock.exd.is-co,html.atlas #exdock.exd:not(.is-quiet):not(.is-one){left:auto;right:max(10px,env(safe-area-inset-right));width:min(420px,calc(100vw - 330px));max-width:none;margin:0;padding:5px 8px 7px 10px}}
/* sideways the screen has 390px of height: the words and stop sit beside the player, not above it, so the dock is
   one player tall and the stage keeps the difference */
@media (pointer:coarse) and (max-height:520px) and (min-aspect-ratio:115/100){#exdock .exd-grab{display:none}.exd-disc{width:36px;height:36px;margin:0}.exd-wind,.exd-disc::after{inset:4px}#exdock.exd.is-co{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,60%);column-gap:10px;align-items:center}#exdock.exd.is-co .exd-bar{grid-column:1;grid-row:1;flex-wrap:wrap;row-gap:4px;margin:0}#exdock.exd.is-co .exd-who{flex:1 1 calc(100% - 52px)}#exdock.exd.is-co .exd-slot,#exdock.exd.is-co .exd-msg:not([hidden]){grid-column:2;grid-row:1;margin:0}#exdock.exd.is-co.is-msg:not(.is-ask) .exd-msg:not([hidden]){left:auto;right:8px;top:5px;bottom:7px;width:calc(60% - 12px);min-height:0;overflow:auto}}
/* R20 the one dock (off the wall): one row, the words and the controls beside spotify's player, so it is one player tall.
   where it stands is fit()'s inline left/right/top/bottom/width */
#exdock.exd.is-one{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,56%);grid-template-areas:"bar slot" "msg msg";align-items:center;column-gap:10px;max-width:none;margin:0;padding:6px 6px 6px 10px;z-index:7}
#exdock.exd.is-one.is-top.is-off{transform:translateY(-135%)}
#exdock.exd.is-one .exd-grab{position:absolute;left:50%;top:1px;margin:0;transform:translateX(-50%)}
#exdock.exd.is-one .exd-bar{grid-area:bar;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"disc who" "act act";align-items:center;gap:6px 8px;margin:0;min-width:0}
#exdock.exd.is-one .exd-disc{grid-area:disc;margin:0}
#exdock.exd.is-one .exd-who{grid-area:who}
#exdock.exd.is-one .exd-st{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
#exdock.exd.is-one .exd-st:empty{display:none}
#exdock.exd.is-one .exd-nm{display:block;white-space:nowrap;-webkit-line-clamp:unset}
#exdock.exd.is-one .exd-act{grid-area:act;display:flex;align-items:center;gap:8px;min-width:0}
#exdock.exd.is-one .exd-attr{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#exdock.exd.is-one .exd-x{margin-left:auto}
#exdock.exd.is-one .exd-slot{grid-area:slot;min-height:80px}
#exdock.exd.is-one .exd-msg{grid-area:msg;margin:5px 2px 0}
#exdock.exd.is-one.is-msg .exd-slot{min-height:80px;outline:1px dashed rgba(189,166,255,.22);outline-offset:-1px;border-radius:10px}
#exdock.exd.is-one.is-void{grid-template-columns:minmax(0,1fr);grid-template-areas:"bar" "msg"}
#exdock.exd.is-one.is-card .exd-act{flex-wrap:wrap;row-gap:6px}
#exdock.exd.is-one.is-card .exd-bar{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"who x" "attr attr"}
#exdock.exd.is-one.is-card .exd-act{display:contents}
#exdock.exd.is-one.is-card .exd-disc{display:none}
#exdock.exd.is-one.is-card .exd-x{grid-area:x;margin:0}
#exdock.exd.is-one.is-card .exd-attr{grid-area:attr}
#exdock.exd.is-one.is-tap{border-color:rgba(134,203,254,.6);box-shadow:0 0 0 1px rgba(134,203,254,.18),0 0 28px rgba(134,203,254,.16),0 12px 40px rgba(0,0,0,.5)}
#exdock.exd.is-one.is-link:not(.is-card) .exd-attr{display:inline-flex;align-items:center;justify-content:center;min-height:34px;margin:0;padding:4px 12px;box-sizing:border-box;border:1px solid rgba(134,203,254,.5);border-radius:999px;background:rgba(134,203,254,.08);color:#f0eaff;line-height:1.25}
#exdock.exd.is-one.is-link:not(.is-card) .exd-attr:hover{border-color:#86cbfe;color:#86cbfe}
html.exd-cover #atlas-info{visibility:hidden}
html.atlas.exd-cover body section[data-room].is-active .wall{translate:0 calc(-1 * var(--exd-lift, 0px))}
@media (pointer:coarse){#exdock.exd.is-one.is-link:not(.is-card) .exd-attr{min-height:44px}#exdock.exd.is-one .exd-x{padding:9px 10px}}
/* upright on a phone the dock is one player tall (80 px and its border) and sits 4 px over the tab bar, so the two together
   keep under a fifth of a 664 px screen; the words and the two controls fit the player's height */
#exdock.exd.is-one.is-port{padding:0 6px 0 10px}
#exdock.exd.is-one.is-port .exd-bar{padding:2px 0;row-gap:3px}
@media (max-width:480px){#exdock.exd.is-one{grid-template-columns:minmax(0,1fr) minmax(180px,50%)}#exdock.exd.is-one .exd-disc{display:none}#exdock.exd.is-one .exd-bar{grid-template-columns:minmax(0,1fr);grid-template-areas:"who" "act"}}
@media (prefers-reduced-motion:reduce){#exdock.exd.is-co{transition:none}.exd-rec{animation:none}.exd.is-playing .exd-rec{box-shadow:inset 0 0 0 1px rgba(240,234,255,.08),0 0 0 2px rgba(134,203,254,.5),0 0 10px rgba(134,203,254,.45)}.exd-wind,.exd-arm,.exd-gl{transition:none}.exd.is-pop .exd-disc,.exd.is-pop .exd-nm,.exd.is-cue .exd-tri{animation:none}.exd-cue::before{animation:none;opacity:.9;transform:none}.exd-cue::after{display:none}}
/* R19 the wall's code: the artist, a tile to scan, one line saying nothing reaches spotify. posts=qr, and a failed player in
   posts=spotify. sizes follow the screen's height, so the 1440 px wall and a 4K fallback keep the same proportions. only .is-qr
   matches, so the desk and the phone never see any of it. the tile's colors are qr.js's own (ink on ice) and never invert */
.exd-qr{display:none}
.exd-qr svg{display:block;max-width:100%;height:auto}
#exdock.exd.is-qr{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"qr bar" "qr msg";align-items:center;align-content:center;column-gap:max(14px,2.6vh);row-gap:max(4px,.8vh);left:var(--qrl,max(10px,env(safe-area-inset-left)));right:var(--qrr,calc(max(10px,env(safe-area-inset-right)) + 46px));width:fit-content;min-width:min(620px,calc(100vw - var(--qrl,10px) - var(--qrr,56px)));max-width:min(900px,calc(100vw - var(--qrl,10px) - var(--qrr,56px)));padding:max(12px,2vh);border-radius:max(14px,2vh);border-color:rgba(134,203,254,.42);box-shadow:0 0 0 1px rgba(134,203,254,.16),0 0 40px rgba(134,203,254,.12),0 12px 40px rgba(0,0,0,.5)}
.exd.is-qr .exd-grab{position:absolute;left:50%;top:4px;margin:0;transform:translateX(-50%)}
.exd.is-qr .exd-slot{display:none}
.exd.is-qr .exd-qr{display:block;grid-area:qr;line-height:0;border-radius:max(6px,.9vh);overflow:hidden;forced-color-adjust:none}
.exd.is-qr .exd-bar{grid-area:bar;align-self:end;align-items:flex-start;margin:0;gap:max(10px,1.6vh)}
.exd.is-qr .exd-who{white-space:normal}
.exd.is-qr .exd-st{white-space:normal;margin:0 0 max(3px,.6vh);font-size:max(9.5px,1.4vh);letter-spacing:.12em;color:#86cbfe}
.exd.is-qr .exd-nm{white-space:normal;overflow-wrap:anywhere;font-size:max(18px,3.9vh);line-height:1.12;display:block}
.exd.is-qr .exd-x{min-height:max(34px,5vh);padding:0 max(14px,2vh);font-size:max(10.5px,1.5vh)}
.exd.is-qr .exd-msg{grid-area:msg;align-self:start;margin:0;font-size:max(11px,1.65vh);line-height:1.45}
@media (max-width:640px){#exdock.exd.is-qr{grid-template-columns:minmax(0,1fr);grid-template-areas:"bar" "qr" "msg";justify-items:center;min-width:0}.exd.is-qr .exd-bar{justify-self:stretch}.exd.is-qr .exd-msg{text-align:center}}
@media (forced-colors:active){.exd.is-quiet{border:1px solid CanvasText}.exd-disc{border:1px solid ButtonText}.exd-cue::before{border-color:Highlight}}
`;
