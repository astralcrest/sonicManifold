/* R7 extras: the layers that make the log ours, loaded once on idle after the first stop and only on the atlas page.
   each layer is its own module with `export default mount(ctx)`; a layer that fails to load is simply absent.
   aurora: the paper breathes · ink: the hand's stroke under each title · visit: your side of the record on the end card ·
   tilt: hold the phone up to turn (coarse pointers, where the dock has its more shelf: ?kiosk=1, never the plain record or the wall) · bridge: draw a bridge between two stars (first universe visit) */
/* the extras ride the page's own version query (exhibit.html imports this file with it), so a bump never leaves them on a stale cache key */
const V = new URL(import.meta.url).search || '?v=20261017r23';
const live = {};
export default function start(ctx) {
  const load = (name) => (live[name] ||= import('./' + name + '.js' + V).then((m) => m.default(ctx)).catch(() => null));
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 600));
  idle(() => {
    load('aurora'); load('ink'); load('visit');
    if (matchMedia('(pointer: coarse)').matches && !window.__wall && document.getElementById('atlas-dock-more')) load('tilt'); /* a wall panel is never held up to turn; R20: the plain record has no shelf to hold the tilt chip */
  });
  /* wall: kiosk hides the angle buttons; wall.touch.css shows them while a hand holds the tour (paused by a hand, why 'user' or 'manual', with a stop on it) */
  if (window.__wall && ctx.tour && typeof ctx.tour.onChange === 'function') {
    const de = document.documentElement; let held = null;
    const sync = () => { const a = ctx.tour.active, h = !!(a && a.id && !a.playing && (a.why === 'user' || a.why === 'manual')); if (h !== held) { held = h; de.classList.toggle('wm-hand', h); } };
    try { ctx.tour.onChange(sync); sync(); } catch (e) {}
  }
  const onUniverse = (id) => { if (id === 'universe') load('bridge'); };
  try { const x = window.__exhibit, r = x && x.rooms && x.rooms[ctx.index]; if (r) onUniverse(r.id); } catch (e) {}
  ctx.onStop((ev) => onUniverse(ev && ev.id));
  return { live: () => Object.keys(live) };
}
