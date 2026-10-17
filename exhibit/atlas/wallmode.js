/* R19 CORE: the wall's mount (exhibit.html?wall=1 only). shell.js lists it last in MODS, so it mounts after every atlas module.
   it sets the wall's own defaults on ctx.settings (dwell), then imports the four wall lanes and calls each one's default
   (ctx, window.__wall) in this order: sound, out (posts and links), reset, card (the invite and the label). a lane file that is
   missing, fails to load or throws is skipped with one warning: the exhibit never goes down with it, and never waits on it
   for more than a few seconds. every lane's file is fetched at once; only the calls are in order. */
const V = new URL(import.meta.url).search || '';
const LANES = ['wallsound', 'wallout', 'wallreset', 'wallcard'];
const CALL_MS = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* a dropped fetch is asked for once more under a changed url (a failed module url fails again at once); a file that is not
   there (a lane not merged yet) costs one more 404 and 0.3 s, never the boot */
function load(url, k = 0) {
  return import(k ? url + (url.indexOf('?') >= 0 ? '&' : '?') + 'retry=' + k : url)
    .catch((e) => { if (k >= 1) throw e; return sleep(300).then(() => load(url, k + 1)); });
}

export async function mount(ctx, deps) {
  const wall = window.__wall;
  if (!wall || !ctx) return null;
  if (!ctx.wall || typeof ctx.wall !== 'object') ctx.wall = {};
  /* dwell=long|short scales every tour beat through the existing table (tour.js reads ctx.settings dwell at each beat); the
     storage under a wall is memory-only, so this is the wall's default for this load, and a soft reset puts it back */
  const defaults = () => { try { if (ctx.settings && typeof ctx.settings.set === 'function') ctx.settings.set('dwell', wall.opts.dwell); } catch (e) {} };
  defaults();
  wall.onReset(defaults);
  const lanes = {};
  const mods = LANES.map((n) => load('./' + n + '.js' + V).catch((e) => { console.warn('wall lane ' + n + ' did not load', e); return null; }));
  for (let i = 0; i < LANES.length; i++) {
    const n = LANES[i], m = await mods[i];
    const fn = m && (typeof m.default === 'function' ? m.default : m.default && typeof m.default.mount === 'function' ? m.default.mount : typeof m.mount === 'function' ? m.mount : null);
    if (!fn) { lanes[n] = m ? 'no default' : 'not loaded'; continue; }
    try {
      const r = await Promise.race([Promise.resolve().then(() => fn(ctx, wall)), sleep(CALL_MS).then(() => 'timeout')]);
      lanes[n] = r === 'timeout' ? 'slow' : 'on';
      if (r === 'timeout') console.warn('wall lane ' + n + ' still mounting after ' + CALL_MS + ' ms; the next lane goes on');
    } catch (e) { lanes[n] = 'failed'; console.warn('wall lane ' + n + ' failed', e); }
  }
  return { lanes, opts: wall.opts };
}
export default { mount };
