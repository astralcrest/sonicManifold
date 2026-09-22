/* room 09 — your turn. the side door: read a visitor's own spotify extended streaming history in this tab,
   sort it on the same field i sorted mine on, and stand their three shares next to mine.

   nothing leaves the browser. the only fetch this room makes is exhibit/data/wall.json (my own numbers) and,
   once, its own worker module. the visitor's file is never read by anything but this file. */

/* ------------------------------------------------------------------ the rulers, copied not reinvented.

   SOURCE 1 — bridge-index.html, the in-browser probe (BITool). the strict deliberate set and the qualifying
   rule are copied verbatim from these lines of that file:
     line 334   TAP: ["playbtn", "clickrow", "remote"],   // listener-initiated
     line 336   MS_PLAYED_MIN: 30000,                     // qualified play threshold
     lines 405-409 in qualify():
                if ((r.ms_played || 0) < cfg.MS_PLAYED_MIN) continue;
                var uri = r.spotify_track_uri;
                var art = r.master_metadata_album_artist_name;
                if (!uri || !art) continue;
     line 447   else if (rs === "trackdone" && !shuf) intent = "algo";
     line 719   if (q.n_raw && q.n_with_reason / q.n_raw < 0.5)  -> "lacks reason_start"

   SOURCE 2 — exhibit/data/wall.json, "defs". the wall in room 01 (19 / 17 / 64) is drawn on the BUNDLED
   reading, which the file states in its own words:
     tapped   "a play I started by hand: track row, play button, remote, skip forward or back"
     shuffled "the queue advanced with shuffle on"
     served   "the queue advanced on its own, plus a small remainder of app-open and error restarts"
   researcher.html line 380 names the two sets outright: bundled clickrow/playbtn/backbtn/fwdbtn/remote = 19.1%,
   strict clickrow/playbtn/remote = 11.5%.

   so this room computes BOTH and says which is which. the bars use the bundled ruler, because that is the ruler
   my wall is drawn on and a comparison on two different rulers would be a lie. the strict share is printed
   underneath, because that is the ruler the bridge index runs on. */

export const TAP_STRICT = ['playbtn', 'clickrow', 'remote'];
export const TAP_BUNDLED = ['playbtn', 'clickrow', 'remote', 'backbtn', 'fwdbtn'];
export const MS_PLAYED_MIN = 30000;
export const REASON_FLOOR = 0.5;   /* bridge-index.html line 719 */
export const MIN_QUALIFIED = 200;  /* this room's own floor: under this the three shares are mostly noise */

const STRICT = Object.create(null); TAP_STRICT.forEach((k) => { STRICT[k] = 1; });
const BUNDLED = Object.create(null); TAP_BUNDLED.forEach((k) => { BUNDLED[k] = 1; });
const CHUNK = 25000;

function err(code, info) { const e = new Error(code); e.code = code; e.info = info; return e; }
const tick = () => new Promise((r) => setTimeout(r, 0));

export function newAcc() { return { nRaw: 0, nWithReason: 0, nQual: 0, tap: 0, shuffle: 0, served: 0, tapStrict: 0, first: null, last: null }; }

/* one pass over a slice of raw export rows. the four lines that decide anything are the four copied above. */
export function scanRows(data, from, to, acc) {
  for (let i = from; i < to; i++) {
    const r = data[i];
    if (!r || typeof r !== 'object') continue;
    acc.nRaw++;
    if (r.reason_start) acc.nWithReason++;
    if ((r.ms_played || 0) < MS_PLAYED_MIN) continue;
    if (!r.spotify_track_uri || !r.master_metadata_album_artist_name) continue;
    acc.nQual++;
    const rs = r.reason_start || '';
    if (BUNDLED[rs]) acc.tap++;
    else if (r.shuffle) acc.shuffle++;
    else acc.served++;
    if (STRICT[rs]) acc.tapStrict++;
    const ts = r.ts;
    if (typeof ts === 'string' && ts) { if (acc.first === null || ts < acc.first) acc.first = ts; if (acc.last === null || ts > acc.last) acc.last = ts; }
  }
}

/* reads a list of File objects. runs in the worker when there is one and on the main thread when there is not,
   which is why it yields between chunks: on the main thread that is what keeps the page from freezing. */
export async function scanFiles(files, onProgress) {
  const list = Array.from(files || []);
  if (!list.length) throw err('empty', '');
  const acc = newAcc();
  const say = (f, name) => { if (onProgress) onProgress({ file: f, total: list.length, name: name, rows: acc.nRaw, qual: acc.nQual }); };
  for (let f = 0; f < list.length; f++) {
    const file = list[f], name = (file && file.name) || 'that file';
    say(f, name);
    let text;
    try { text = await file.text(); } catch (e) { throw err('notjson', name); }
    let data;
    try { data = JSON.parse(text); } catch (e) { throw err('notjson', name); }
    text = null;
    if (!Array.isArray(data)) throw err('notarray', name);
    for (let i = 0; i < data.length; i += CHUNK) {
      scanRows(data, i, Math.min(data.length, i + CHUNK), acc);
      say(f, name);
      await tick();
    }
    data = null;
  }
  if (!acc.nRaw) throw err('empty', '');
  if (acc.nWithReason / acc.nRaw < REASON_FLOOR) throw err('noreason', Math.round((100 * acc.nWithReason) / acc.nRaw));
  if (acc.nQual < MIN_QUALIFIED) throw err('few', acc.nQual);
  return acc;
}

/* ------------------------------------------------------------------ demo data.
   invented rows, generated here, run through the same scanRows as a real file so the demo exercises the
   real ruler rather than a made-up number. seeded off the clock so two presses are not the same listener. */
function demoRows(seed) {
  let a = seed >>> 0;
  const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tapRate = 0.14 + rnd() * 0.3, shufRate = 0.08 + rnd() * 0.22;
  const n = 3200 + Math.floor(rnd() * 2600);
  const rows = new Array(n);
  let t = Date.parse('2021-03-04T09:12:00Z');
  for (let i = 0; i < n; i++) {
    const isTap = rnd() < tapRate, shuffle = !isTap && rnd() < shufRate;
    t += 150000 + Math.floor(rnd() * 400000);
    rows[i] = {
      ts: new Date(t).toISOString().slice(0, 19) + 'Z',
      ms_played: rnd() < 0.18 ? Math.floor(rnd() * 29000) : 45000 + Math.floor(rnd() * 180000),
      spotify_track_uri: 'spotify:track:demo' + (i % 900),
      master_metadata_album_artist_name: 'demo artist ' + (i % 130),
      reason_start: isTap ? (rnd() < 0.55 ? 'clickrow' : rnd() < 0.5 ? 'playbtn' : 'fwdbtn') : (rnd() < 0.96 ? 'trackdone' : 'appload'),
      shuffle: shuffle,
    };
  }
  return rows;
}

/* ------------------------------------------------------------------ numbers */

/* three whole percentages that still add to 100 */
function shares3(a, b, c) {
  const tot = a + b + c; if (!tot) return [0, 0, 0];
  const raw = [(a / tot) * 100, (b / tot) * 100, (c / tot) * 100];
  const fl = raw.map(Math.floor); let rem = 100 - fl[0] - fl[1] - fl[2];
  const ord = raw.map((v, i) => [v - fl[i], i]).sort((x, y) => y[0] - x[0]);
  for (let k = 0; k < rem; k++) fl[ord[k % 3][1]]++;
  return fl;
}
const int = (n) => Number(n || 0).toLocaleString('en-US');

/* ------------------------------------------------------------------ copy. every visible string lives here. */

const PRIVACY = 'your file is read here in this tab. nothing is uploaded, nothing is stored, and closing the tab forgets it.';
const ASK = 'drop your extended streaming history json here, or';
const WAIT = 'spotify takes a few days to send an export: account, then privacy, then tick extended streaming history. the short account-data file will not do, it has no reason_start in it.';
const DEMOTAG = 'demo data. i invented these plays in this tab just now, so they are nobody.';
const DEMOTAG_S = 'demo data. i invented these plays just now.';
const NOTBI = 'this is not a bridge index. that one needs the jumps between artists and a map to score them against, and it lives in the full probe.';
const PROBE = 'the full probe: your own bridge index';
const SAVE = 'save this as a picture';
const CARD_TITLE = 'who pressed play, in two logs';
const CARD_URL = 'astralcrest.github.io/sonicManifold/exhibit.html';
const CARD_FILE = 'who-pressed-play.png';

const ERRS = {
  notjson: (n) => 'i could not read ' + n + ' as json. the files you want are the ones named streaming_history_audio_*.json.',
  notarray: (n) => n + ' is json, but it is not a list of plays. try one of the streaming_history_audio_*.json files.',
  noreason: (p) => 'only ' + p + '% of those rows carry reason_start, so i cannot tell your taps from your queue. that is the short account-data export. the one that works is extended streaming history.',
  few: (n) => 'only ' + int(n) + ' of those plays ran past thirty seconds. under ' + MIN_QUALIFIED + ' the three shares are mostly noise, so i am not going to draw them.',
  empty: () => 'i found no plays in those files.',
  bad: () => 'something went wrong reading that. the files you want are named streaming_history_audio_*.json.',
};

const TPL = `<div class="y-pn">
<div class="y-intro">
<p class="y-ask"></p>
<div class="y-row"><button type="button" class="btn ghost y-pick"></button><button type="button" class="btn ghost y-demo"></button></div>
<p class="y-wait"></p>
</div>
<p class="y-live" role="status" aria-live="polite"></p>
<p class="y-err" role="alert"></p>
<div class="y-res" hidden>
<p class="y-tag"></p>
<p class="y-line y-them"></p>
<p class="y-line y-mine"></p>
<p class="y-say"></p>
<div class="y-row"><button type="button" class="btn ghost y-again">read another file</button><a class="y-probe" href="bridge-index.html#sec-howto"></a></div>
<button type="button" class="y-save"></button>
<button type="button" class="y-more" aria-expanded="true"></button>
<div class="y-fine"><p class="y-rule"></p><p class="y-not"></p></div>
</div>
<p class="y-priv"></p>
<input class="y-file" type="file" accept=".json,application/json" multiple hidden>
</div>`;

const CSS = `section[data-room=yours] .y-pn{position:absolute;display:flex;flex-direction:column;gap:10px;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:12px;transition:box-shadow .18s,background .18s}
section[data-room=yours] .y-pn.drag{background:rgba(33,246,188,.06);box-shadow:inset 0 0 0 1px var(--mint)}
section[data-room=yours] .y-intro{display:flex;flex-direction:column;gap:8px}
section[data-room=yours] .y-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0}
section[data-room=yours] .y-ask{margin:0;font:500 13px/1.45 var(--mono);color:var(--ink)}
section[data-room=yours] .y-wait,section[data-room=yours] .y-priv,section[data-room=yours] .y-rule,section[data-room=yours] .y-not,section[data-room=yours] .y-tag{margin:0;font:400 11px/1.5 var(--mono);color:var(--mute)}
/* the privacy line is pinned to the bottom of the panel: whatever else scrolls, that sentence does not leave */
section[data-room=yours] .y-priv{position:sticky;bottom:0;z-index:2;border-top:1px dotted rgba(189,166,255,.22);padding:8px 0 2px;background:#0a0118}
section[data-room=yours] .y-more,section[data-room=yours] .y-save{align-self:flex-start;margin:0;padding:6px 0;border:0;background:none;color:var(--ice);font:500 11px/1.4 var(--mono);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
section[data-room=yours] .y-save:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
section[data-room=yours] .y-fine{display:flex;flex-direction:column;gap:6px}
section[data-room=yours] .y-fine[hidden]{display:none}
section[data-room=yours] .y-tag{color:var(--amber)}
section[data-room=yours] .y-live{margin:0;min-height:1.2em;font:600 12px/1.4 var(--mono);color:var(--mint2)}
section[data-room=yours] .y-err{margin:0;font:500 12px/1.5 var(--mono);color:var(--rose)}
section[data-room=yours] .y-err:empty{display:none}
section[data-room=yours] .y-line{margin:0;font:600 13px/1.5 var(--mono);color:var(--ink)}
section[data-room=yours] .y-line b{font-weight:600;letter-spacing:.1em;text-transform:uppercase;font-size:10.5px;color:var(--mute);margin-right:8px}
section[data-room=yours] .y-line .t{color:var(--mint)}
section[data-room=yours] .y-line .s{color:var(--amber)}
section[data-room=yours] .y-line .v{color:var(--violet)}
section[data-room=yours] .y-line .n{color:var(--mute);font-weight:400}
section[data-room=yours] .y-say{margin:0;font:500 12.5px/1.5 var(--mono);color:var(--ink)}
section[data-room=yours] .y-res{display:flex;flex-direction:column;gap:7px}
section[data-room=yours] .y-probe{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ice);text-decoration:none;border-bottom:1px dotted rgba(134,203,254,.5);padding:10px 0}
section[data-room=yours] .y-pick:focus-visible,section[data-room=yours] .y-demo:focus-visible,section[data-room=yours] .y-again:focus-visible,section[data-room=yours] .y-probe:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
section[data-room=yours] .y-pn.busy .y-intro{opacity:.4;pointer-events:none}
/* once the result is on screen as text, the live region has said it already: keep it for a screen reader,
   take it off the wall so the same sentence is not printed twice. */
section[data-room=yours] .y-pn.has .y-live{position:absolute;width:1px;height:1px;min-height:0;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
/* a short stage: the two number lines are already drawn on the wall, in those colours, above those bars.
   they stay in the accessibility tree and come off the glass, so the sentence and the controls fit. */
section[data-room=yours] .y-pn.squeeze.has .y-them,section[data-room=yours] .y-pn.squeeze.has .y-mine{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
section[data-room=yours] .y-pn.scrolls .y-priv{box-shadow:0 -12px 16px 4px rgba(10,1,24,.92)}
section[data-room=yours] .y-pn.squeeze .y-row{gap:8px;margin-top:0}
section[data-room=yours] .y-pn.squeeze .y-again{padding:10px 12px;min-height:40px;font-size:10px;letter-spacing:.06em}
section[data-room=yours] .y-pn.squeeze .y-probe{padding:7px 0;font-size:10px;letter-spacing:.06em}
section[data-room=yours] .y-pn.squeeze .y-more,section[data-room=yours] .y-pn.squeeze .y-save{padding:3px 0;font-size:10px}
section[data-room=yours] .y-pn.squeeze .y-priv{padding-top:6px}
/* once there is a result, the invitation has done its job and gets out of the way of the numbers */
section[data-room=yours] .y-pn.has .y-intro{display:none}
@media (hover:hover){section[data-room=yours] .y-probe:hover{color:#b6e0ff}}
@media (max-height:720px) and (max-aspect-ratio:115/100){
section[data-room=yours] .y-pn{gap:6px}
section[data-room=yours] .y-ask{font-size:11.5px}
section[data-room=yours] .y-wait,section[data-room=yours] .y-priv,section[data-room=yours] .y-rule,section[data-room=yours] .y-not,section[data-room=yours] .y-tag{font-size:10.2px;line-height:1.4}
section[data-room=yours] .y-line{font-size:11.5px}
section[data-room=yours] .y-say{font-size:11.5px}
section[data-room=yours] .y-res{gap:5px}
section[data-room=yours] .btn{padding:11px 14px;min-height:42px}
}
@media (max-height:480px) and (min-aspect-ratio:115/100){
section[data-room=yours] .y-pn{gap:5px}
section[data-room=yours] .y-wait{display:none}
}`;

/* ------------------------------------------------------------------ the room */

export default {
  id: 'yours', track: 'choose-me-whole',
  ready: false, state: 'idle', theirs: null, demo: false,
  mineN: 97427, mineP: [19, 17, 64], mineStrict: 11.5, /* fallback if wall.json fails; real values read in mount() */

  async mount(root, ctx) {
    this.root = root; this.ctx = ctx;
    if (!document.getElementById('y-css')) { const st = document.createElement('style'); st.id = 'y-css'; st.textContent = CSS; document.head.appendChild(st); }
    root.innerHTML = TPL;
    const Q = { pn: '.y-pn', intro: '.y-intro', ask: '.y-ask', pick: '.y-pick', dem: '.y-demo', wait: '.y-wait', live: '.y-live', errEl: '.y-err', res: '.y-res', tag: '.y-tag', them: '.y-them', mineEl: '.y-mine', say: '.y-say', more: '.y-more', fine: '.y-fine', ruleEl: '.y-rule', notEl: '.y-not', again: '.y-again', probe: '.y-probe', save: '.y-save', priv: '.y-priv', file: '.y-file' };
    for (const k in Q) this[k] = root.querySelector(Q[k]);

    this.ask.textContent = ASK; this.pick.textContent = 'choose files'; this.dem.textContent = 'use demo data';
    this.wait.textContent = WAIT; this.priv.textContent = PRIVACY; this.notEl.textContent = NOTBI;
    this.probe.textContent = PROBE + ' →';
    this.save.textContent = SAVE;

    this.save.addEventListener('click', () => this.saveCard());
    this.pick.addEventListener('click', () => { this.file.value = ''; this.file.click(); });
    this.file.addEventListener('change', () => { if (this.file.files && this.file.files.length) this.read(this.file.files); });
    this.dem.addEventListener('click', () => this.runDemo());
    this.again.addEventListener('click', () => { this.reset(); this.pick.focus(); });
    this.more.addEventListener('click', () => this.fineOpen(this.fine.hidden, true));

    /* the whole room is the drop target, not just the panel */
    const sec = root.closest('section') || root;
    let over = 0;
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    sec.addEventListener('dragenter', (e) => { stop(e); over++; this.pn.classList.add('drag'); });
    sec.addEventListener('dragover', (e) => { stop(e); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; });
    sec.addEventListener('dragleave', (e) => { stop(e); if (--over <= 0) { over = 0; this.pn.classList.remove('drag'); } });
    sec.addEventListener('drop', (e) => {
      stop(e); over = 0; this.pn.classList.remove('drag');
      const f = e.dataTransfer && e.dataTransfer.files;
      if (f && f.length) this.read(f);
    });

    await ctx.identity();
    const w = await ctx.data('wall').catch(() => null);
    if (w) {
      if (typeof w.total === 'number') this.mineN = w.total;
      const p = w.pct_rounded;
      if (p) this.mineP = [Math.round(p.tap), Math.round(p.shuffle), Math.round(p.served)];
      else if (w.pct) this.mineP = shares3(w.pct.tap, w.pct.shuffle, w.pct.served);
    }
    this.mineEl.innerHTML = this.lineHTML('mine', this.mineN + '', this.mineP, int(this.mineN) + ' plays');

    const slot = root.parentElement && root.parentElement.querySelector('.legend-slot');
    if (slot) ctx.legend(slot, 'prov');

    this.assign(ctx, false);
    this.ready = true;
    this.checkScroll();
    setTimeout(() => this.warm(), 1500);
  },

  lineHTML(who, _n, p, tail) {
    const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return '<b>' + e(who) + '</b><span class="t">' + p[0] + '% tapped</span><span class="n"> · </span>'
      + '<span class="s">' + p[1] + '% shuffled</span><span class="n"> · </span>'
      + '<span class="v">' + p[2] + '% served</span><span class="n"> · ' + e(tail) + '</span>';
  },

  /* ---------------- reading ---------------- */

  /* the reader is built and its module fetched while the room is still idle, so that from the moment a
     visitor's file exists in the tab there is nothing left to go and get. it is why the network log during a
     parse is empty, which is the promise this room makes. */
  warm() {
    if (this.worker || this.noWorker) return;
    try { this.worker = new Worker(new URL('./yours.worker.js', import.meta.url), { type: 'module' }); }
    catch (e) { this.noWorker = true; this.worker = null; return; }
    this.worker.onmessage = (e) => {
      const d = e.data || {}, p = this.pending;
      if (!p) return;
      if (d.type === 'warm') return;
      if (d.type === 'progress') { p.progress(d.p || {}); return; }
      this.pending = null;
      if (d.type === 'done') p.finish(d.acc); else p.fail(d.code || 'bad', d.info);
    };
    /* a first, empty message makes the worker resolve its import now rather than on the visitor's file:
       that is what leaves the network log empty for the whole of the parse. */
    try { this.worker.postMessage({ v: (this.ctx && this.ctx.V) || '' }); } catch (e) {}
    this.worker.onerror = () => {
      const p = this.pending; this.pending = null;
      try { this.worker.terminate(); } catch (e) {}
      this.worker = null; this.noWorker = true;
      if (p) p.main();
    };
  },

  read(files) {
    if (this.state === 'busy') return;
    this.demo = false;
    this.busy(true);
    this.errEl.textContent = '';
    this.live.textContent = files.length === 1 ? 'reading one file in this tab' : 'reading ' + files.length + ' files in this tab';
    let done = false;
    const finish = (acc) => { if (done) return; done = true; this.busy(false); this.show(acc, false); };
    const fail = (code, info) => { if (done) return; done = true; this.busy(false); this.fail(code, info); };
    const progress = (p) => this.progress(p);
    const main = () => { this.pending = null; scanFiles(files, progress).then(finish, (e) => fail((e && e.code) || 'bad', e && e.info)); };
    this.warm();
    if (!this.worker) { main(); return; }
    this.pending = { finish, fail, progress, main };
    this.worker.postMessage({ files: Array.from(files), v: (this.ctx && this.ctx.V) || '' });
    /* an engine that accepts new Worker but cannot run a module worker never answers. read on this thread
       instead rather than leaving a visitor watching nothing. */
    setTimeout(() => { if (!done && this.pending) { this.noWorker = true; try { this.worker.terminate(); } catch (e) {} this.worker = null; main(); } }, 6000);
  },

  runDemo() {
    if (this.state === 'busy') return;
    this.demo = true;
    this.busy(true);
    this.errEl.textContent = '';
    this.live.textContent = 'inventing a listener';
    const acc = newAcc(), rows = demoRows((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    scanRows(rows, 0, rows.length, acc);
    setTimeout(() => { this.busy(false); this.show(acc, true); }, 380);
  },

  progress(p) {
    if (!p || !p.rows) return;
    const of = p.total > 1 ? ' of ' + p.total : '';
    this.live.textContent = 'read ' + int(p.rows) + ' rows from file ' + ((p.file || 0) + 1) + of;
  },

  busy(b) {
    this.state = b ? 'busy' : 'idle';
    this.pn.classList.toggle('busy', b);
    this.pick.disabled = b; this.dem.disabled = b;
  },

  fail(code, info) {
    this.theirs = null; this.res.hidden = true; this.pn.classList.remove('has');
    this.live.textContent = '';
    this.errEl.textContent = (ERRS[code] || ERRS.bad)(info);
    this.assign(this.ctx, false); this.repaint();
    this.checkScroll();
  },

  reset() {
    this.theirs = null; this.demo = false;
    this.res.hidden = true; this.pn.classList.remove('has');
    this.errEl.textContent = ''; this.live.textContent = ''; this.file.value = '';
    this.assign(this.ctx, false); this.repaint();
    this.checkScroll();
  },

  show(acc, isDemo) {
    if (!acc || !acc.nQual) { this.fail('empty', ''); return; }
    const p = shares3(acc.tap, acc.shuffle, acc.served);
    const strict = Math.round((1000 * acc.tapStrict) / acc.nQual) / 10;
    this.theirs = { p: p, n: acc.nQual, strict: strict };

    this.live.textContent = int(acc.nQual) + ' of your plays ran past thirty seconds. ' + p[0] + '% tapped, ' + p[1] + '% shuffled, ' + p[2] + '% served.';
    this.tag.hidden = !isDemo;
    this.them.innerHTML = this.lineHTML(isDemo ? 'demo' : 'yours', acc.nQual + '', p, int(acc.nQual) + ' plays past thirty seconds');

    const d = p[0] - this.mineP[0];
    this.say.textContent = d >= 2
      ? 'you pressed play by hand more often than i did: ' + p[0] + '% of your plays against ' + this.mineP[0] + '% of mine.'
      : d <= -2
        ? 'i pressed play by hand more often than you did: ' + this.mineP[0] + '% of my plays against ' + p[0] + '% of yours.'
        : 'we pressed play by hand about as often as each other: ' + p[0] + '% of yours against ' + this.mineP[0] + '% of mine.';
    this.ruleEl.textContent = 'both of those count a skip button as a tap, which is how my ' + this.mineP[0]
      + '% is counted. on the stricter reading the bridge index runs on (track row, play button, remote only) yours is '
      + strict + '% and mine is ' + this.mineStrict + '%. i counted your plays the way the probe does: past thirty seconds, with a track id and an artist on them.';

    this.res.hidden = false;
    this.pn.classList.add('has');
    this.fineByHand = false; this.fineOpen(true, false);
    this.assign(this.ctx, true);
    this.repaint();
    this.checkScroll();
    this.repaint(); /* the fold, if it happened, gives the walls their height back */
    try { this.ctx.audio.note(5, { vol: 0.04, dur: 0.9 }); } catch (e) {}
  },

  /* ---------------- the dots ---------------- */

  /* who stands on which wall, and where in their column. counting sort, six buckets: (wall, provenance). */
  assign(ctx, split) {
    const P = ctx.particles, n = P.n, hash = ctx.hash;
    const side = this.sideA || (this.sideA = new Uint8Array(n));
    const pv = this.pvA || (this.pvA = new Uint8Array(n));
    const rank = this.rankA || (this.rankA = new Int32Array(n));
    const t = this.theirs ? this.theirs.p[0] / 100 : 0, s = this.theirs ? (this.theirs.p[0] + this.theirs.p[1]) / 100 : 0;
    const cnt = new Int32Array(6);
    for (let i = 0; i < n; i++) {
      const sd = split ? (i & 1) : 0;
      side[i] = sd;
      let c;
      if (sd === 0) c = P.prov[i];
      else { const u = hash(i * 31 + 17); c = u < t ? 0 : u < s ? 1 : 2; }
      pv[i] = c; cnt[sd * 3 + c]++;
    }
    const run = new Int32Array(6);
    for (let i = 0; i < n; i++) { const b = side[i] * 3 + pv[i]; rank[i] = run[b]++; }
    this.cnt = cnt; this.split = split;
    this.maxc = Math.max(cnt[0], cnt[1], cnt[2], cnt[3], cnt[4], cnt[5]);
  },

  portraitStack(s) { return innerWidth <= innerHeight * 1.15 && s.w < 560; },

  /* two strings get shorter when the stage is short, so the result and its controls stay on one screen */
  retext() {
    const sq = this.pn.classList.contains('squeeze');
    this.probe.textContent = (sq ? 'the full probe' : PROBE) + ' →';
    this.tag.textContent = this.demo ? (sq ? DEMOTAG_S : DEMOTAG) : '';
  },

  /* the panel sits at the top of the stage and the walls stand under it */
  layout(ctx) {
    const s = ctx.stage(); this.s = s;
    this.pn.classList.toggle('squeeze', s.h < 380);
    this.pn.style.left = s.x + 'px'; this.pn.style.top = s.y + 'px'; this.pn.style.width = s.w + 'px';
    this.pn.style.maxHeight = Math.round(s.h * (this.theirs ? 0.66 : 0.56)) + 'px';
    const pnH = Math.min(this.pn.offsetHeight || 0, s.h * 0.68);
    const top = s.y + pnH + 14;
    const band = Math.max(56, s.y + s.h - top);
    const stacked = this.portraitStack(s) && band >= 170;
    this.boxes = stacked
      ? [{ x: s.x, y: top, w: s.w, h: (band - 14) / 2 }, { x: s.x, y: top + (band - 14) / 2 + 14, w: s.w, h: (band - 14) / 2 }]
      : (() => { const gap = Math.max(18, s.w * 0.055), ww = (s.w - gap) / 2; return [{ x: s.x, y: top, w: ww, h: band }, { x: s.x + ww + gap, y: top, w: ww, h: band }]; })();
    this.tiny = this.boxes[0].h < 64; /* under this a caption and a row of percentages would eat the bars */
    this.retext();
    this.checkScroll();
  },

  /* the dots into their columns. one dot size for both walls, so the two are read against each other. */
  place(ctx) {
    const P = ctx.particles, boxes = this.boxes; if (!boxes) return;
    const CAP = this.tiny ? 12 : 23; /* the strip at the top of a box that the caption and the % labels own */
    const colW = boxes[0].w / 3, usable = colW * 0.78;
    const barH = Math.max(20, boxes[0].h - CAP);
    /* the biggest dot at which the tallest column still fits. fine steps, because the grid quantises twice
       (dot size and dots per row) and a coarse sweep leaves the tallest bar a long way short of the ceiling. */
    let d = 0.5;
    for (let step = 2; step <= 28; step++) { const k = step / 4; const per = Math.max(1, Math.floor(usable / k)); if (Math.ceil(this.maxc / per) * k <= barH) d = k; }
    const per = Math.max(1, Math.floor(usable / d));
    this.d = d; this.per = per; this.cap = CAP;
    /* the grid quantises twice, so the tallest column rarely reaches the ceiling. rather than leave a band of
       empty box above it, the caption comes down to sit on top of the tallest bar. */
    this.barTop = boxes[0].h - Math.ceil(this.maxc / per) * d;
    const side = this.sideA, pv = this.pvA, rank = this.rankA, split = this.split;
    const pad = colW * 0.11;
    P.targetPx((i) => {
      const sd = side[i]; if (sd === 1 && !split) return null;
      const b = boxes[sd], c = pv[i], r = rank[i];
      return [b.x + c * colW + pad + (r % per) * d, b.y + b.h - Math.floor(r / per) * d];
    });
    const C = ctx.PROV; P.color((i) => C[pv[i]]);
  },

  enter(ctx) {
    this.active = true;
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.45; P.big = false; P.swirl = 0.3;
    if (!this.ready) { P.scatter(); P.color(() => ctx.PAL.fog); return; }
    this.layout(ctx); this.place(ctx);
  },

  leave() { this.active = false; },

  /* a file can finish reading after the visitor has walked on. the panel may still re-flow; the dots
     belong to whichever room is on screen now, so only the active room moves them. */
  repaint() {
    this.layout(this.ctx);
    if (this.active) this.place(this.ctx);
  },

  /* the two long caveats. they are never deleted, only folded, and a screen this size folds them by itself. */
  fineOpen(open, byHand) {
    this.fine.hidden = !open;
    this.more.setAttribute('aria-expanded', String(open));
    this.more.textContent = open ? 'hide how the two numbers are counted' : 'how the two numbers are counted';
    if (byHand) { this.fineByHand = true; this.repaint(); }
  },

  /* ---------------- the share card ----------------
     one 1200x630 png, drawn on a canvas that never joins the page. it carries the two sets of three shares,
     the two names, the visitor's play count rounded to the nearest hundred, and the url. no file name, no
     dates, no artists: nothing a stranger could use to pick the visitor out of a crowd. and nothing is sent:
     the bytes go from the canvas to a blob to the visitor's own downloads folder. */
  drawCard() {
    const W = 1200, H = 630, PADX = 64;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); if (!g) return null;
    const mono = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace';
    const HEX = ['#21f6bc', '#f5a623', '#8b6fd6'], ICE = '#86cbfe', MUTE = '#a49bbd', INK = '#f0eaff';
    g.fillStyle = '#0a0118'; g.fillRect(0, 0, W, H);

    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = INK; g.font = '600 34px ' + mono; g.fillText(CARD_TITLE, PADX, 92);
    g.fillStyle = ICE; g.font = '500 17px ' + mono; g.fillText(CARD_URL, PADX, 586);

    const theirN = Math.max(100, Math.round(this.theirs.n / 100) * 100);
    const panels = [
      { who: this.demo ? 'demo' : 'you', tail: 'about ' + int(theirN) + ' plays', p: this.theirs.p },
      { who: 'astralcrest', tail: int(this.mineN) + ' plays', p: this.mineP },
    ];
    /* 280 not 300: a 100% bar plus its label must still clear the name line at 156 */
    const GAP = 64, PW = (W - PADX * 2 - GAP) / 2, BASE = 500, MAXH = 280, PITCH = 7, R = 2.6;
    const NAMES = ['tapped', 'shuffled', 'served'];
    for (let k = 0; k < 2; k++) {
      const x0 = PADX + k * (PW + GAP), pn = panels[k];
      g.textAlign = 'left'; g.font = '600 20px ' + mono; g.fillStyle = ICE; g.fillText(pn.who, x0, 156);
      const tailX = x0 + g.measureText(pn.who).width + 18;
      g.fillStyle = MUTE; g.font = '400 16px ' + mono; g.fillText(pn.tail, tailX, 156);
      g.strokeStyle = 'rgba(134,203,254,.3)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, BASE + 0.5); g.lineTo(x0 + PW, BASE + 0.5); g.stroke();
      const colW = PW / 3, per = 16, barW = (per - 1) * PITCH, pad = (colW - barW) / 2;
      for (let c = 0; c < 3; c++) {
        const cx = x0 + c * colW, rows = Math.round((pn.p[c] / 100) * MAXH / PITCH);
        g.fillStyle = HEX[c];
        for (let r = 0; r < rows; r++) for (let i = 0; i < per; i++) {
          g.beginPath(); g.arc(cx + pad + i * PITCH, BASE - 4 - r * PITCH, R, 0, Math.PI * 2); g.fill();
        }
        g.textAlign = 'center';
        g.font = '600 30px ' + mono; g.fillStyle = HEX[c];
        g.fillText(pn.p[c] + '%', cx + colW / 2, BASE - 4 - rows * PITCH - 12);
        g.font = '400 15px ' + mono; g.fillStyle = MUTE;
        g.fillText(NAMES[c], cx + colW / 2, BASE + 30);
      }
    }
    return cv;
  },

  /* a.download is the normal road. ios safari treats a blob download as a page to show rather than a file
     to keep, so there the picture opens in a tab of its own and the visitor holds it to save. the tab has to
     be opened inside the click, before toBlob returns, or safari's popup rule closes the door. */
  saveCard() {
    if (!this.theirs) return;
    const cv = this.drawCard(); if (!cv) return;
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let tab = null;
    if (ios) { try { tab = window.open('', '_blank'); } catch (e) { tab = null; } }
    const hand = (blob) => {
      if (!blob) { if (tab) { try { tab.close(); } catch (e) {} } return; }
      const url = URL.createObjectURL(blob);
      if (tab) { try { tab.location.href = url; } catch (e) { tab = null; } }
      if (!tab) {
        const a = document.createElement('a'); a.href = url; a.download = CARD_FILE; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
    if (cv.toBlob) { cv.toBlob(hand, 'image/png'); return; }
    try {
      const b64 = cv.toDataURL('image/png').split(',')[1], bin = atob(b64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      hand(new Blob([u8], { type: 'image/png' }));
    } catch (e) { hand(null); }
  },

  /* the panel may scroll as a last resort, but the result and its controls should fit without it:
     if they do not, fold the fine print first and only then let it scroll. */
  checkScroll() {
    if (!this.pn) return;
    if (this.theirs && !this.fineByHand && !this.fine.hidden && this.pn.scrollHeight > this.pn.clientHeight + 1) this.fineOpen(false, false);
    this.pn.classList.toggle('scrolls', this.pn.scrollHeight > this.pn.clientHeight + 1);
  },

  /* captions and the three percentages, drawn in the same three colours the dots are in */
  frame(g, t, bands, w, h, ctx) {
    const boxes = this.boxes; if (!boxes || !this.ready) return;
    const mono = '"JetBrains Mono", ui-monospace, monospace';
    const colW = boxes[0].w / 3, per = this.per || 1, d = this.d || 1, pad = colW * 0.11;
    const caps = [
      ['mine', int(this.mineN) + ' plays'],
      [this.theirs ? (this.demo ? 'demo' : 'yours') : 'yours', this.theirs ? int(this.theirs.n) + ' plays' : ''],
    ];
    const HEX = ['#21f6bc', '#f5a623', '#8b6fd6'];
    for (let sd = 0; sd < 2; sd++) {
      const b = boxes[sd];
      if (sd === 1 && !this.theirs) {
        g.strokeStyle = 'rgba(134,203,254,.34)'; g.lineWidth = 1; g.setLineDash([4, 5]);
        g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); g.setLineDash([]);
        g.font = '600 11px ' + mono; g.fillStyle = 'rgba(134,203,254,.75)';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('yours', b.x + b.w / 2, b.y + b.h / 2);
        continue;
      }
      g.strokeStyle = 'rgba(134,203,254,.22)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(b.x, b.y + b.h + 0.5); g.lineTo(b.x + b.w, b.y + b.h + 0.5); g.stroke();
      const capY = Math.max(b.y, b.y + (this.barTop || 0) - this.cap);
      g.font = '600 ' + (this.tiny ? 9 : 10) + 'px ' + mono; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = 'rgba(134,203,254,.85)'; g.fillText(caps[sd][0], b.x, capY);
      if (caps[sd][1]) { g.fillStyle = 'rgba(164,155,189,.85)'; g.fillText(caps[sd][1], b.x + g.measureText(caps[sd][0] + '  ').width, capY); }
      if (this.tiny) continue;
      const p = sd === 0 ? this.mineP : this.theirs.p;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = '600 ' + (colW < 70 ? 9 : 10) + 'px ' + mono;
      for (let c = 0; c < 3; c++) {
        const n = this.cnt[sd * 3 + c]; if (!n) continue;
        const topY = b.y + b.h - Math.ceil(n / per) * d;
        g.fillStyle = HEX[c];
        g.fillText(p[c] + '%', b.x + c * colW + pad + (per * d) / 2, Math.max(capY + this.cap - 2, topY - 5));
      }
    }
  },
};
