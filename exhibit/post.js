/* listening post — ask once, then one dock.
   A room calls ctx.post(host, artist) and gets a small "hear <artist>" control. Before the first click the
   control carries the privacy note and nothing has been requested from spotify. The first click is the consent:
   from then on every control in every room plays into ONE player docked at the bottom of the viewport, the
   soundtrack ducks under it, and the note is gone.
   - nothing is requested from spotify until that first click (click-to-load facade; no preconnect either)
   - the player is spotify's own iframe api controller, unaltered, linking back to spotify
   - the next artist is loadUri() on the same controller, so there is no second load
   - no audio or artwork is stored in this repo
   track ids come from audio/sonic-tid-to-artist.json, which this site already publishes. */

let tidByArtist = null, apiPromise = null, apiReady = null;
let consent = false;                 /* true the moment a visitor has clicked one listening post */
const notes = new Set();             /* the privacy notes on screen, cleared the moment consent is given */
const noted = new WeakSet();         /* hosts that already carry one */

export function clipsAllowed() { return consent; }

function loadIds() {
  if (!tidByArtist) tidByArtist = fetch('audio/sonic-tid-to-artist.json').then((r) => r.json()).then((m) => { const o = {}; for (const tid in m) { const a = m[tid]; if (!(a in o)) o[a] = tid; } return o; }).catch(() => ({}));
  return tidByArtist;
}
/* one slow moment must not disable every post for the rest of the visit: a failed attempt is forgotten, so the next
   click starts a fresh one, and an api that turns up after its own timeout is kept and answers that click at once. */
function loadApi() {
  if (apiReady) return Promise.resolve(apiReady);
  if (!apiPromise) apiPromise = new Promise((res, rej) => {
    const prev = window.onSpotifyIframeApiReady; let to = 0;
    window.onSpotifyIframeApiReady = (api) => { clearTimeout(to); apiReady = api; if (prev) try { prev(api); } catch (e) {} res(api); };
    const s = document.createElement('script'); s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true;
    s.onerror = () => { clearTimeout(to); rej(new Error('script')); };
    document.head.appendChild(s);
    to = setTimeout(() => rej(new Error('timeout')), 9000);
  }).catch((e) => { apiPromise = null; throw e; });
  return apiPromise;
}

/* ------------------------------------------------------------------ the dock */
const D = {
  el: null, slot: null, who: null, attr: null, x: null, msg: null,
  ctl: null, wantTid: '', artist: '', open: false, lastFocus: null, ctx: null, playT: 0, h: 0,
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
    bar.appendChild(who); bar.appendChild(attr); bar.appendChild(x);
    const slot = document.createElement('div'); slot.className = 'exd-slot';
    const msg = document.createElement('p'); msg.className = 'exd-msg'; msg.hidden = true;
    el.appendChild(bar); el.appendChild(slot); el.appendChild(msg);
    document.body.appendChild(el);
    x.addEventListener('click', () => this.close(true));
    this.el = el; this.slot = slot; this.who = who; this.attr = attr; this.x = x; this.msg = msg;
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open) { e.preventDefault(); this.close(true); } });
    return el;
  },
  /* the shell keeps the wall text and every room's controls above whatever the dock is using */
  measure() {
    if (!this.el || !this.ctx) return;
    const h = this.open ? Math.ceil(this.el.getBoundingClientRect().height) : 0;
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
  show(artist, tid) {
    this.artist = artist; this.who.textContent = 'hearing ' + artist;
    this.el.classList.remove('is-msg');
    this.setAttr('player and artwork: ', 'spotify ↗', 'https://open.spotify.com/track/' + tid); this.attr.hidden = false;
    this.el.classList.remove('is-off'); this.open = true;
    requestAnimationFrame(() => this.measure());
  },
  fail(artist, tid) {
    this.slot.textContent = ''; this.ctl = null; this.el.classList.add('is-msg');
    this.msg.hidden = false;
    this.msg.textContent = 'spotify did not load. it may be blocked on this network, or you may be offline.';
    if (tid) { this.setAttr('open ' + artist + ' on ', 'spotify ↗', 'https://open.spotify.com/track/' + tid); this.attr.hidden = false; }
    else this.attr.hidden = true;
    if (this.ctx) this.ctx.audio.duck(false);
    requestAnimationFrame(() => this.measure());
  },
  close(restoreFocus) {
    if (this.ctl) { try { this.ctl.pause(); } catch (e) {} }
    if (this.ctx) this.ctx.audio.duck(false);
    if (!this.el) return;
    this.open = false; this.el.classList.add('is-off'); this.msg.hidden = true; this.msg.textContent = '';
    this.measure();
    const back = this.lastFocus; this.lastFocus = null;
    if (restoreFocus && back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  },
};

/* resolve an artist to a controller playing them. `trigger` is the control that was clicked, for focus return. */
async function playArtist(artist, ctx, trigger) {
  const ids = await loadIds(), tid = ids[artist];
  if (!tid) return 'notid';
  grantConsent();
  D.build(ctx); D.ctx = ctx;
  D.msg.hidden = true; D.msg.textContent = '';
  const wasOpen = D.open;
  D.lastFocus = trigger && trigger.isConnected ? trigger : D.lastFocus;
  D.show(artist, tid);
  /* a visitor who arrived by keyboard lands on the player, so escape and the stop button are one key away.
     a kiosk demo passes no trigger and never steals the focus. */
  if (trigger && !wasOpen) { try { D.x.focus({ preventScroll: true }); } catch (e) {} }
  D.wantTid = tid;
  let api;
  try { api = await loadApi(); } catch (e) { D.fail(artist, tid); return 'apifail'; }
  if (D.wantTid !== tid) return 'ok'; /* a later click already asked for someone else */
  if (D.ctl) {
    try { D.ctl.loadUri('spotify:track:' + tid); nudge(tid); } catch (e) { D.fail(artist, tid); return 'apifail'; }
    return 'ok';
  }
  try {
    const host = document.createElement('div'); host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'spotify player');
    D.slot.textContent = ''; D.slot.appendChild(host);
    api.createController(host, { uri: 'spotify:track:' + tid, height: 80, width: '100%' }, (ctl) => {
      D.ctl = ctl;
      ctl.addListener('ready', () => { nudge(D.wantTid); requestAnimationFrame(() => D.measure()); });
      ctl.addListener('playback_update', (e) => {
        const dat = e && e.data; if (!dat) return;
        const playing = D.open && !dat.isPaused;
        ctx.audio.duck(playing);
        /* the embed loads paused; one nudge per uri, never a loop */
        if (D.open && dat.isPaused && D.playT && Date.now() - D.playT < 4000 && (dat.position || 0) === 0) { D.playT = 0; try { ctl.play(); } catch (err) {} }
      });
    });
  } catch (e) { D.fail(artist, tid); return 'apifail'; }
  return 'ok';
}
function nudge(tid) { if (!D.ctl || D.wantTid !== tid) return; D.playT = Date.now(); setTimeout(() => { if (D.ctl && D.wantTid === tid && D.open) try { D.ctl.play(); } catch (e) {} }, 420); }

function grantConsent() {
  if (consent) return;
  consent = true;
  notes.forEach((n) => { if (n.isConnected) n.remove(); }); notes.clear();
}

/* rooms call this when they leave or reshuffle: the clip stops and the soundtrack comes back.
   the controller itself is kept, so the next artist starts without a second load. */
export function stopAll(ctx) {
  if (D.el) D.close(false); else if (ctx) ctx.audio.duck(false);
}

/* play an artist with no control in the room: kiosk demos only, and only after a visitor has consented once. */
export function playClip(artist, ctx) {
  if (!consent) return Promise.resolve(false);
  return playArtist(artist, ctx, null).then((r) => r === 'ok').catch(() => false);
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
    try { r = await playArtist(artist, ctx, btn); } catch (e) { r = 'notid'; }
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
`;
