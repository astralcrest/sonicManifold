/* listening post: lets a visitor hear (and see the cover of) a real artist from my log, legally.
   - nothing is requested from spotify until the visitor clicks (click-to-load facade)
   - the player is spotify's own embed, unaltered, linking back to spotify
   - no audio or artwork is stored in this repo
   - my own soundtrack ducks while the embed plays and returns when it pauses
   track ids come from audio/sonic-tid-to-artist.json, which this site already publishes. */

let tidByArtist = null, apiPromise = null, apiReady = null; const notedHosts = new WeakSet();

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

const live = new Set();
export function stopAll(ctx) { live.forEach((c) => { try { c.destroy(); } catch (e) {} }); live.clear(); if (ctx) ctx.audio.duck(false); }

/* build a post for `artist` inside `host`. returns the root element. */
export function post(host, artist, ctx, opts = {}) {
  const root = document.createElement('div'); root.className = 'post';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'post-btn';
  btn.innerHTML = '<span class="post-ico" aria-hidden="true">&#9654;</span><span class="post-t"></span>';
  btn.querySelector('.post-t').textContent = (opts.label || 'hear') + ' ' + artist;
  btn.setAttribute('aria-label', 'load a spotify player for ' + artist);
  root.appendChild(btn);
  const nh = opts.noteHost || host; if (!notedHosts.has(nh)) { notedHosts.add(nh); const n = document.createElement('p'); n.className = 'post-note'; n.textContent = 'clicking this loads a small player from spotify. nothing plays or loads from them until you click.'; (opts.noteHost || root).appendChild(n); }
  host.appendChild(root);
  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.querySelector('.post-t').textContent = 'loading ' + artist + '…';
    const ids = await loadIds(), tid = ids[artist];
    const fail = () => { root.innerHTML = ''; const p = document.createElement('p'); p.className = 'post-note'; p.textContent = artist + ' (not available to play here)'; root.appendChild(p); ctx.audio.duck(false); };
    if (!tid) return fail();
    try {
      const api = await loadApi(); const slot = document.createElement('div'); slot.setAttribute('role', 'group'); slot.setAttribute('aria-label', 'spotify player: ' + artist); root.innerHTML = ''; root.appendChild(slot);
      api.createController(slot, { uri: 'spotify:track:' + tid, height: 80, width: '100%' }, (ctl) => {
        live.add(ctl);
        ctl.addListener('playback_update', (e) => { ctx.audio.duck(!(e && e.data && e.data.isPaused)); });
        ctl.addListener('ready', () => { try { ctl.play(); } catch (e) {} });
      });
      const a = document.createElement('a'); a.className = 'post-attr'; a.href = 'https://open.spotify.com/track/' + tid; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'player and artwork: spotify ↗'; root.appendChild(a);
    } catch (e) { fail(); }
  }, { once: true });
  return root;
}

export const postCSS = `
.post{margin:8px 0;max-width:420px}
.post-btn{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid rgba(189,166,255,.3);background:rgba(10,1,24,.6);color:#f0eaff;font:600 12px/1.2 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.06em;cursor:pointer}
.post-btn:hover{border-color:#21f6bc}.post-btn:focus-visible{outline:2px solid #21f6bc;outline-offset:3px}
.post-ico{color:#21f6bc;font-size:10px}
.post-note,.post-attr{display:block;margin:8px 2px 0;font:400 11.5px/1.5 "JetBrains Mono",ui-monospace,monospace;color:#a49bbd;text-decoration:none}
.post-attr:hover{color:#21f6bc}
.post iframe{border-radius:12px;display:block}
`;
