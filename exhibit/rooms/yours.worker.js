/* room 09's reader, off the main thread. it holds no rules of its own: the qualifying rule and the two tap
   sets live in yours.js (which names the bridge-index.html lines they were copied from) and this file imports
   them, so there is exactly one ruler and the worker and the main-thread fallback cannot drift apart.

   the module is imported with the shell's own ?v= so a deployed worker never reads a stale copy of the rules. */
let scan = null;

self.onmessage = async (e) => {
  const d = e.data || {};
  try {
    if (!scan) scan = (await import(new URL('./yours.js' + (d.v || ''), import.meta.url).href)).scanFiles;
    if (!d.files) { self.postMessage({ type: 'warm' }); return; } /* the room warms the import while it is idle */
    const acc = await scan(d.files, (p) => self.postMessage({ type: 'progress', p }));
    self.postMessage({ type: 'done', acc });
  } catch (err) {
    self.postMessage({ type: 'error', code: (err && err.code) || 'bad', info: (err && err.info) !== undefined ? err.info : String((err && err.message) || err) });
  }
};
