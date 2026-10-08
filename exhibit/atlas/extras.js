/* R7 extras: the layers that make the log ours, loaded once on idle after the first stop and only on the atlas page.
   each layer is its own module with `export default mount(ctx)`; a layer that fails to load is simply absent.
   aurora: the paper breathes · ink: the hand's stroke under each title · visit: your side of the record on the end card ·
   tilt: hold the phone up to turn (coarse pointers only) · bridge: draw a bridge between two stars (first universe visit) */
/* the extras ride the page's own version query (exhibit.html imports this file with it), so a bump never leaves them on a stale cache key */
const V = new URL(import.meta.url).search || '?v=20261007r11';
const live = {};
export default function start(ctx) {
  const load = (name) => (live[name] ||= import('./' + name + '.js' + V).then((m) => m.default(ctx)).catch(() => null));
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 600));
  idle(() => {
    load('aurora'); load('ink'); load('visit');
    if (matchMedia('(pointer: coarse)').matches) load('tilt');
  });
  const onUniverse = (id) => { if (id === 'universe') load('bridge'); };
  try { const x = window.__exhibit, r = x && x.rooms && x.rooms[ctx.index]; if (r) onUniverse(r.id); } catch (e) {}
  ctx.onStop((ev) => onUniverse(ev && ev.id));
  return { live: () => Object.keys(live) };
}
