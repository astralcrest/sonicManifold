/* R19 OUTSIDE: the wall's listening posts and links. exhibit.html?wall=1 only: CORE's wallmode.js calls default(ctx, window.__wall)
   once the atlas modules have mounted. it attaches ctx.wall.out = { mode, qr(url, opts), revoke(), closeDock() } and nothing global.
   - qr(url, opts): an svg element from atlas/qr.js (no network), for LABEL's card and any lane that wants a code
   - revoke() and closeDock() reach exhibit/post.js through the sm:wall-post window event. this file never imports post.js: the shell
     imports it under its own ?v=, and a second import here would be a second copy with a second set of consent flags
   - the words the wall would get wrong are patched on the TOURS object the shell already loaded (tours.js is not edited): the
     yours stops say what is true here, and the universe stops stop promising a hold when a hold does nothing */
const V0 = new URL(import.meta.url).search || '';
export const YOURS_LINE = 'run yours on your own phone: scan this.';
const HOLD = /\s*(?:hold|tap) one to hear it\./;
const HEAR = { qr: 'tap one twice for a code.', spotify: 'tap one twice to hear it.', off: '' };
const postsOf = (w) => { const p = w && w.opts && w.opts.posts; return p === 'spotify' || p === 'off' ? p : 'qr'; };
const fire = (op) => { try { window.dispatchEvent(new CustomEvent('sm:wall-post', { detail: { op } })); } catch (e) {} };

async function words(mode, V) {
  let T = null;
  try { T = await import('./tours.js' + V); } catch (e) { return 0; }
  let n = 0;
  for (const t of (T && T.TOURS) || []) {
    for (const s of (t && t.stops) || []) {
      if (!s) continue;
      if (s.room === 'yours') {
        s.caption = YOURS_LINE; n++;
        if (s.share && typeof s.share === 'object') s.share = Object.assign({}, s.share, { line: YOURS_LINE });
      } else if (typeof s.caption === 'string' && HOLD.test(s.caption)) {
        s.caption = s.caption.replace(HOLD, HEAR[mode] ? ' ' + HEAR[mode] : ''); n++;
      }
    }
  }
  return n;
}

let mounted = null;
export default async function mount(ctx, wall) {
  wall = wall || window.__wall;
  if (!wall || !wall.on || !ctx) return null;
  if (mounted) return mounted;
  const mode = postsOf(wall);
  /* the shell's own ?v= (ctx.V): a retried load of this file carries an extra query, and tours.js under that one would be a second copy */
  const V = typeof ctx.V === 'string' ? ctx.V : V0;
  if (!ctx.wall || typeof ctx.wall !== 'object') ctx.wall = {};
  let Q = null;
  try { Q = await import('./qr.js' + V); } catch (e) { console.warn('wallout: qr.js did not load', e); }
  const out = {
    get mode() { return mode; },
    qr(url, opts) {
      if (!Q) return null;
      try { return Q.default(String(url), opts || {}); } catch (e) { return null; }
    },
    revoke() { fire('revoke'); return true; },
    closeDock() { fire('close'); return true; },
  };
  ctx.wall.out = out; mounted = out;
  document.documentElement.setAttribute('data-posts', mode);
  /* every reset path, whoever calls it, ends one visitor's consent and puts any code or player away */
  try { wall.onReset(() => { fire('revoke'); }); } catch (e) {}
  /* the OS share sheet is a way off the page: nothing on the wall may reach it (card.js, chrome.js and chain.js all test for it) */
  try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch (e) {}
  await words(mode, V);
  return out;
}
