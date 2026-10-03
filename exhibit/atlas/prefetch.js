/* idle prefetch (R5 P0). once the atlas is up, while the visitor reads the first stop, warm the stops a visit most often
   goes to next: the sky first (grand tour stop 1, and the heaviest), then the game. room code goes in as modulepreload
   (fetched and compiled, not run), stop data through ctx.data (the shell's own cache, so the room's later ctx.data call
   resolves at once), the sky's worker and the game's file as a plain fetch into the http cache. one request at a
   time, each in its own idle slot, so nothing here competes with a gesture or a frame. never with save-data on or on a
   2g link; never at ?atlas=0 (exhibit.html does not load this file there). universe_artists_all is never warmed here: it
   is fetched only when search or a tap asks for it. */
const V = new URL(import.meta.url).search || '';
const PLAN = [
  ['mod', '../rooms/universe.js'],
  ['data', 'universe_nodes'],
  ['data', 'universe_edges'],
  ['file', '../rooms/universe.worker.js'],
  /* R5 INT: universe_days_index is Tier B (not published: a 404 and a console error on every landing), so it is not warmed */
  ['mod', '../rooms/game.js'],
  /* R5 INT2: the atlas duel reads whopressed2 through ctx.data; the rollback deck (whopressed.json) is never read in the atlas */
  ['data', 'whopressed2'],
  /* R5 PERF2: the stops whose mount is code-fetch bound on a phone (clock 556, graveyard 653, listeners 583 ms cold) */
  ['mod', '../rooms/listeners.js'], ['mod', '../rooms/hundred.js'], ['mod', '../rooms/fade.js'], ['data', 'twolisteners'],
  /* R5 PERF2 pass 2: then the data those mounts wait on, in grand-tour order (~24 KB gz: arrivals 17, twolisteners 5, killit 1.4, clock 0.8) */
  ['data', 'arrivals'],
  ['mod', '../rooms/clock.js'], ['data', 'clock'], ['mod', '../rooms/graveyard.js'], ['mod', '../rooms/gates.js'], ['data', 'killit'],
];
const conn = navigator.connection || {};
const skip = () => conn.saveData === true || /(^|-)2g$/.test(conn.effectiveType || '');
const idle = (ms) => new Promise((r) => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: ms }) : setTimeout(r, 50)));
/* code: a modulepreload link (the shell's later import of the same url takes it from the module map). files: a plain
   fetch, the same request the room makes, so the room's own fetch is answered by the http cache */
const get = (kind, href) => new Promise((r) => {
  if (kind === 'file') { fetch(href).then((x) => x.blob()).then(r, r); return; }
  const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = href;
  l.onload = l.onerror = () => r(); document.head.appendChild(l);
  setTimeout(r, 15000);
});
const done = new Set();
async function run() {
  for (let k = 0; k < 100 && !(window.__exhibit && window.__exhibit.atlasReady); k++) await new Promise((r) => setTimeout(r, 200));
  const ex = window.__exhibit; if (!ex || !ex.atlasReady) return;
  /* the field animates every frame, so a true idle slot is rare on a slow phone: wait for one (or 1.5 s) to start, then
     run the list back to back, one request at a time; data parses each wait for a short idle slot of their own */
  await idle(1500);
  for (const [kind, what] of PLAN) {
    if (skip() || done.has(what)) continue;
    done.add(what);
    try {
      if (kind === 'data') { await idle(300); await ex.ctx.data(what).catch(() => {}); }
      else await get(kind, new URL(what + V, import.meta.url).href);
    } catch (e) { /* a warm-up that fails costs nothing: the stop fetches its own files when it opens */ }
  }
  window.__exhibitPrefetched = [...done];
}
if (!skip()) run();
