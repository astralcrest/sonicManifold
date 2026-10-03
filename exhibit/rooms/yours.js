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
   underneath, because that is the ruler the bridge index runs on.

   ATLAS MODE (BUILD_SPEC_V2 §3 yours row, brief R1). the two walls of bars are a categorical glyph field (o O @ tapped,
   x X % shuffled, - = ≡ served; colour sampled from one member dot, never averaged), each bar a block of whole glyph
   cells on a lattice that is a whole multiple of the dot pitch (cells(), below). the camera pans and zooms (z 1-3, no
   drift). the walls stand side by side; on a landscape screen MINE and YOURS are region labels. the drop target, the
   worker and the reading are untouched: drag and drop are not pointer events, and nothing here calls preventDefault on
   them. still a side room: no stop number, no tours. */

export const TAP_STRICT = ['playbtn', 'clickrow', 'remote'];
export const TAP_BUNDLED = ['playbtn', 'clickrow', 'remote', 'backbtn', 'fwdbtn'];
export const MS_PLAYED_MIN = 30000;
export const REASON_FLOOR = 0.5;   /* bridge-index.html line 719 */
export const MIN_QUALIFIED = 200;  /* this room's own floor: under this the three shares are mostly noise */

const STRICT = Object.create(null); TAP_STRICT.forEach((k) => { STRICT[k] = 1; });
const BUNDLED = Object.create(null); TAP_BUNDLED.forEach((k) => { BUNDLED[k] = 1; });
const CHUNK = 25000;
const LIFT = 20, LAB_GAP = 5, PLATE = 'rgba(10,1,24,.82)', BG = '#0a0118';
/* one category per wall and provenance (1-3 mine, 4-6 yours), each drawn in its provenance's family: the field's
   categorical passes (the shell's thinning, the glyph field's outline quota) share out per category, so per wall */
const CATS = [{ family: 'neutral' }, { family: 'tap' }, { family: 'shuffle' }, { family: 'served' }, { family: 'tap' }, { family: 'shuffle' }, { family: 'served' }];
const dbg = { on: false };

function err(code, info) { const e = new Error(code); e.code = code; e.info = info; return e; }
const tick = () => new Promise((r) => setTimeout(r, 0));

export function newAcc() { return { nRaw: 0, nWithReason: 0, nQual: 0, tap: 0, shuffle: 0, served: 0, tapStrict: 0, first: null, last: null, art: Object.create(null) }; }
/* the visitor's three most-played artists, kept for the card's opt-in line; the per-artist tally itself is dropped */
export function topOf(acc) { const a = acc.art || {}; acc.top = Object.keys(a).sort((x, y) => a[y] - a[x]).slice(0, 3); delete acc.art; return acc; }

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
    const an = r.master_metadata_album_artist_name; acc.art[an] = (acc.art[an] || 0) + 1;
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
  return topOf(acc);
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
const SHORT = 'nothing is uploaded.';
const NOTBI = 'this is not a bridge index. that one needs the jumps between artists and a map to score them against, and it lives in the full probe.';
const PROBE = 'the full probe: your own bridge index';
const CARD_TITLE = 'who pressed play, in two logs';
const CARD_FILE = 'who-pressed-play.png';
const NEUTRAL = 'a split is neither good nor bad: it is only who pressed play.';
const TOP3 = 'add my top 3 artists to the card';

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
<div class="y-card"><label class="y-top"><input type="checkbox" class="y-topc"> <span></span></label></div>
<button type="button" class="y-more" aria-expanded="true"></button>
<div class="y-fine"><p class="y-rule"></p><p class="y-not"></p></div>
</div>
<p class="y-priv"></p>
<div class="y-row y-fold"><span class="y-short"></span><button type="button" class="y-open" aria-expanded="false"></button></div>
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
section[data-room=yours] .y-more{align-self:flex-start;margin:0;padding:6px 0;border:0;background:none;color:var(--ice);font:500 11px/1.4 var(--mono);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
section[data-room=yours] .y-card{display:flex;flex-wrap:wrap;align-items:center;gap:2px 18px}
section[data-room=yours] .y-top{display:flex;gap:8px;align-items:center;font:400 11px/1.4 var(--mono);color:var(--mute);cursor:pointer}
section[data-room=yours] .y-top input{margin:0;accent-color:#86cbfe}
section[data-room=yours] .y-top input:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
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
section[data-room=yours] .y-pn.squeeze .y-priv,section[data-room=yours] .y-pn.scrolls .y-priv{position:static;box-shadow:none} /* sticky over a scrolling panel hid the line above it on phones */
section[data-room=yours] .y-pn.squeeze .y-row{gap:8px;margin-top:0}
section[data-room=yours] .y-pn.squeeze .y-again{padding:10px 12px;min-height:40px;font-size:10px;letter-spacing:.06em}
section[data-room=yours] .y-pn.squeeze .y-probe{padding:7px 0;font-size:10px;letter-spacing:.06em}
section[data-room=yours] .y-pn.squeeze .y-more,section[data-room=yours] .y-pn.squeeze .cd-b{padding:3px 0;font-size:10px}
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
}
section[data-room=yours] .y-fold{display:none}
/* atlas, an upright phone (fix r3): the walls are the room. the ask keeps its two buttons on one row; how to get an
   export and the privacy sentence fold under more, and the short line that stays is the promise itself.
   with a result: the picture and the counting rules fold there too; the sentence and read another file stay */
section[data-room=yours] .y-pn.compact .y-fold{display:flex;flex-wrap:nowrap;justify-content:space-between;align-items:center;gap:10px}
section[data-room=yours] .y-pn.compact .y-open{padding:4px 0}
section[data-room=yours] .y-pn.compact:not(.open) .y-wait,section[data-room=yours] .y-pn.compact:not(.open) .y-priv{display:none}
section[data-room=yours] .y-pn.compact:not(.open) .y-card,section[data-room=yours] .y-pn.compact:not(.open) .y-more,section[data-room=yours] .y-pn.compact:not(.open) .y-fine{display:none}
section[data-room=yours] .y-pn.compact .y-live:empty{min-height:0}
section[data-room=yours] .y-pn.compact .y-priv{position:static;box-shadow:none;border-top:0;padding:0}
section[data-room=yours] .y-pn.compact .y-intro .y-row{flex-wrap:nowrap;gap:8px}
section[data-room=yours] .y-pn.compact .y-intro .btn{flex:1 1 0;min-width:0;white-space:nowrap;padding:12px 8px;letter-spacing:.06em}
section[data-room=yours] .y-pn.compact.has .y-them,section[data-room=yours] .y-pn.compact.has .y-mine{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
section[data-room=yours] .y-short{font:400 11px/1.4 var(--mono);color:var(--mute)}
section[data-room=yours] .y-open{margin:0;padding:6px 0;border:0;background:none;color:var(--ice);font:500 11px/1.4 var(--mono);text-decoration:underline;text-underline-offset:3px;cursor:pointer;white-space:nowrap}
section[data-room=yours] .y-open:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
/* R1-e: the folded button sat 40x23 on touch. min-height on the flex item (its row centres it, nothing else moves) */
@media (pointer:coarse){section[data-room=yours] .y-open{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}}`;

/* ------------------------------------------------------------------ the room */

export default {
  id: 'yours', track: 'choose-me-whole',
  ready: false, state: 'idle', theirs: null, demo: false,
  mineN: 97427, mineP: [19, 17, 64], mineStrict: 11.5, /* fallback if wall.json fails; real values read in mount() */

  async mount(root, ctx) {
    this.root = root; this.ctx = ctx; this.A = !!(ctx.atlas && ctx.atlas.on); this.prec = [];
    if (!document.getElementById('y-css')) { const st = document.createElement('style'); st.id = 'y-css'; st.textContent = CSS; document.head.appendChild(st); }
    root.innerHTML = TPL;
    const Q = { pn: '.y-pn', intro: '.y-intro', ask: '.y-ask', pick: '.y-pick', dem: '.y-demo', wait: '.y-wait', live: '.y-live', errEl: '.y-err', res: '.y-res', tag: '.y-tag', them: '.y-them', mineEl: '.y-mine', say: '.y-say', more: '.y-more', fine: '.y-fine', ruleEl: '.y-rule', notEl: '.y-not', again: '.y-again', probe: '.y-probe', cardEl: '.y-card', topc: '.y-topc', priv: '.y-priv', file: '.y-file', shortEl: '.y-short', opn: '.y-open' };
    for (const k in Q) this[k] = root.querySelector(Q[k]);

    this.ask.textContent = ASK; this.pick.textContent = 'choose files'; this.dem.textContent = 'use demo data';
    this.wait.textContent = WAIT; this.priv.textContent = PRIVACY; this.notEl.textContent = NOTBI;
    this.probe.textContent = PROBE + ' →';
    this.topc.nextElementSibling.textContent = TOP3;
    this.shortEl.textContent = SHORT; this.foldOpen(false);
    this.opn.addEventListener('click', () => { this.foldOpen(!this.pn.classList.contains('open')); this.repaint(); });

    this.topc.addEventListener('change', () => this.setCard());
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
    /* atlas: the section itself is pointer-events:none and the bars are canvas, so a file let go over the field lands on
       #atlas-stage, outside the section, and the browser would open it. while this room is on screen, the document
       catches what the section cannot and hands it to the same reader (the section's own handlers stop propagation, so
       nothing is read twice) */
    if (this.A) {
      const on = () => sec.classList.contains('is-active');
      const files = (e) => !!(e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0);
      document.addEventListener('dragover', (e) => { if (!on() || !files(e)) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; this.pn.classList.add('drag'); });
      document.addEventListener('dragleave', (e) => { if (on() && !e.relatedTarget) this.pn.classList.remove('drag'); });
      document.addEventListener('drop', (e) => {
        if (!on() || !files(e)) return;
        e.preventDefault(); this.pn.classList.remove('drag');
        const f = e.dataTransfer.files; if (f && f.length) this.read(f);
      });
    }

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
    if (!this.cardP) this.cardP = import('../atlas/card.js' + ((this.ctx && this.ctx.V) || '')).catch(() => null);
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
    scanRows(rows, 0, rows.length, acc); topOf(acc);
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
    if (this.bar) this.bar.clear();
    this.theirs = null; this.res.hidden = true; this.pn.classList.remove('has');
    this.live.textContent = '';
    this.errEl.textContent = (ERRS[code] || ERRS.bad)(info);
    this.assign(this.ctx, false); this.repaint();
    this.checkScroll();
  },

  reset() {
    if (this.bar) this.bar.clear();
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
    this.theirs = { p: p, n: acc.nQual, strict: strict, top: acc.top || [], f: [acc.tap / acc.nQual, acc.shuffle / acc.nQual, acc.served / acc.nQual] };

    this.live.textContent = int(acc.nQual) + ' of your plays ran past thirty seconds. ' + p[0] + '% tapped, ' + p[1] + '% shuffled, ' + p[2] + '% served.';
    this.tag.hidden = !isDemo;
    this.them.innerHTML = this.lineHTML(isDemo ? 'demo' : 'yours', acc.nQual + '', p, int(acc.nQual) + ' plays past thirty seconds');

    const d = p[0] - this.mineP[0];
    this.say.textContent = d >= 2
      ? 'you pressed play by hand more often than i did: ' + p[0] + '% of your plays against ' + this.mineP[0] + '% of mine.'
      : d <= -2
        ? 'i pressed play by hand more often than you did: ' + this.mineP[0] + '% of my plays against ' + p[0] + '% of yours.'
        : 'we pressed play by hand about as often as each other: ' + p[0] + '% of yours against ' + this.mineP[0] + '% of mine.';
    this.say.textContent += ' ' + NEUTRAL;
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
    this.topc.checked = false; this.setCard();
    this.arp(p);
  },

  /* the visitor's three shares as 100 rising notes, one per point, voiced by arm (taps first), about 2.5 s */
  arp(p) {
    const A = this.ctx && this.ctx.audio, V = [['triangle', 0.03, 0.16], ['sine', 0.035, 0.2], ['square', 0.008, 0.09]];
    let k = 0, left = p[0];
    try { for (let i = 0; i < 100; i++) { while (left <= 0 && k < 2) left = p[++k]; left--; const v = V[k]; A.note(Math.floor(i / 10), { type: v[0], vol: v[1], dur: v[2], at: i * 0.025 }); } } catch (e) {}
  },

  /* the share card (exhibit/atlas/card.js, fetched while the room idles): the two triples, the stricter reading in small
     type, the pseudonym and the url. no file name, no dates, no artists unless the visitor ticks the box; nothing sent */
  setCard() {
    const t = this.theirs; if (!t) return;
    if (!this.cardP) this.warm();
    this.cardP.then((C) => {
      if (!C || this.theirs !== t) return;
      if (!this.bar) { this.bar = C.bar(null, { ctx: this.ctx, label: 'share your card' }); this.cardEl.insertBefore(this.bar.el, this.cardEl.firstChild); }
      const M = this.mineP, who = this.demo ? 'demo' : 'you', top = this.topc.checked && t.top.length ? t.top.join(' · ') : '';
      const seg = (w, q) => [[w, 'ice'], ['  '], [q[0], 'tap'], [' · ', 'mute'], [q[1], 'shuffle'], [' · ', 'mute'], [q[2], 'served']];
      const st = (q) => ({ counts: q, colors: ['tap', 'shuffle', 'served'], glyphs: ['o', 'x', '='] });
      const text = CARD_TITLE + '. ' + (this.demo ? 'an invented demo listener: ' : 'me: ') + t.p[0] + '% tapped · ' + t.p[1] + '% shuffled · ' + t.p[2] + '% served'
        + (top ? ' (top 3: ' + top + ')' : '') + '. astralcrest: ' + M.join(' · ') + '. ' + NEUTRAL
        + ' find yours, the file never leaves your tab: https://astralcrest.github.io/sonicManifold/exhibit.html#yours';
      this.bar.set({
        kicker: 'tapped · shuffled · served, % of plays', title: CARD_TITLE, demo: this.demo,
        hero: [{ segs: seg(who.toUpperCase(), t.p), strip: st(t.p) }, { segs: seg('ASTRALCREST', M), strip: st(M) }],
        note: top ? (this.demo ? 'demo top 3: ' : 'my top 3: ') + top : '',
        fine: 'a skip button counts as a tap on both sides. stricter reading (track row, play button, remote only): ' + who + ' '
          + t.strict + '% · astralcrest ' + this.mineStrict + '%. ' + NEUTRAL,
        path: 'exhibit.html#yours',
      }, text, CARD_FILE);
    });
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
    const sq = this.pn.classList.contains('squeeze') || this.pn.classList.contains('compact');
    this.probe.textContent = (sq ? 'the full probe' : PROBE) + ' →';
    this.tag.textContent = this.demo ? (sq ? DEMOTAG_S : DEMOTAG) : '';
  },

  /* the panel sits at the top of the stage and the walls stand under it */
  layout(ctx) {
    const s = ctx.stage(); this.s = s;
    this.pn.classList.toggle('squeeze', s.h < 380);
    /* atlas, an upright phone: the panel folds to the ask, its two buttons and one line (css .compact), and the walls
       stand side by side on one baseline under it: the yours box beside mine, never stacked under it */
    this.compact = this.A && this.portraitStack(s); this.pn.classList.toggle('compact', this.compact);
    this.pn.style.left = s.x + 'px'; this.pn.style.top = s.y + 'px'; this.pn.style.width = s.w + 'px';
    this.pn.style.maxHeight = Math.round(s.h * (this.theirs ? 0.66 : 0.56)) + 'px';
    const pnH = Math.min(this.pn.offsetHeight || 0, s.h * 0.68);
    const top = s.y + pnH + (this.compact ? 8 : 14);
    const band = Math.max(56, s.y + s.h - top);
    const stacked = !this.A && this.portraitStack(s) && band >= 170;
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
    const fits = (k, h) => Math.ceil(this.maxc / Math.max(1, Math.floor(usable / k))) * k <= h;
    /* the biggest dot at which the tallest column still fits. fine steps, because the grid quantises twice
       (dot size and dots per row) and a coarse sweep leaves the tallest bar a long way short of the ceiling. */
    let d = 0.5;
    for (let step = 2; step <= 28; step++) { const k = step / 4; if (fits(k, barH)) d = k; }
    /* atlas: the dots are binned into glyph cells, so a pitch under half a pixel still draws. on the smallest phones
       (320 wide) the tallest bar did not fit at 0.5 and ran up over the caption and into the panel */
    if (this.A && !fits(d, barH)) { for (let k = 45; k >= 25; k -= 5) { d = k / 100; if (fits(d, barH)) break; } }
    const per = Math.max(1, Math.floor(usable / d));
    this.d = d; this.per = per; this.cap = CAP;
    /* atlas: a bar's rendered top is the top of its glyph cell, and its % stands LAB_GAP px over that on a plate; the
       caption keeps its place and steps up only as far as a label under it needs (frame). LIFT is that room. fix r3: the
       pitch above is ?atlas=0's, picked from the same bar height (round 2 took LIFT off first, which dropped desk's pitch
       from 1 to 0.75 and moved every number on the wall). LIFT is reserved only where that pitch still fits under it;
       elsewhere the caption stays put and the % plates stay inside the CAP strip, as at ?atlas=0 */
    this.lift = this.A && !this.tiny && fits(d, barH - LIFT) ? LIFT : 0;
    /* the grid quantises twice, so the tallest column rarely reaches the ceiling. rather than leave a band of
       empty box above it, the caption comes down to sit on top of the tallest bar. */
    this.barTop = boxes[0].h - Math.ceil(this.maxc / per) * d;
    this.plan = null;
    if (this.A && this.glyphs(ctx)) {
      /* an upright phone fills the box and has no bar height to spare for LIFT: its caption stays put, and a % under it
         stands in the CAP strip, as at ?atlas=0 */
      if (this.compact) this.lift = 0;
      this.cells(ctx);
    } else {
      const side = this.sideA, pv = this.pvA, rank = this.rankA, split = this.split;
      const pad = colW * 0.11;
      P.targetPx((i) => {
        const sd = side[i]; if (sd === 1 && !split) return null;
        const b = boxes[sd], c = pv[i], r = rank[i];
        return [b.x + c * colW + pad + (r % per) * d, b.y + b.h - Math.floor(r / per) * d];
      });
    }
    const C = ctx.PROV, pv = this.pvA; P.color((i) => C[pv[i]]);
    if (this.A && this.active) { this.flight = true; this.atlasGlyph(ctx); this.floorMask(ctx); } /* weighed now: the next field frame bins before the next overlay frame */
  },

  enter(ctx) {
    this.active = true;
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.45; P.big = false; P.swirl = 0.3;
    if (!this.ready) { P.scatter(); P.color(() => ctx.PAL.fog); return; }
    /* atlas: the bars are a grid and their heights are the numbers: no jitter across cell edges, no pointer parting, and
       no swirl: a swirled flight arcs half the dots out past their target (the bottom rows' dots dipped under the baseline
       on the way in), and floorMask() predicts each dot's next position on a straight flight */
    if (this.A) { P.jitter = 0; P.touch = false; P.swirl = 0; }
    this.layout(ctx); this.place(ctx);
    if (this.A) ctx.view.configure({ mode: 'pan', zMin: 1, zMax: 3, drift: false });
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
    /* atlas: k = 1 / zoom, so captions and percentages keep their screen size while staying in world px (1 at home) */
    const k = this.A ? 1 / (ctx.view.z || 1) : 1;
    if (this.A) { dbg.on = !!ctx.atlas.debug; this.prec.length = 0; if (this.flight) this.floorMask(ctx); else this.watchLattice(ctx); }
    const colW = boxes[0].w / 3, per = this.per || 1, d = this.d || 1, pad = colW * 0.11;
    const caps = [this.capText(0), this.capText(1)];
    const HEX = ['#21f6bc', '#f5a623', '#8b6fd6'];
    for (let sd = 0; sd < 2; sd++) {
      const b = boxes[sd];
      if (sd === 1 && !this.theirs) {
        g.strokeStyle = 'rgba(134,203,254,.34)'; g.lineWidth = k; g.setLineDash([4 * k, 5 * k]);
        g.strokeRect(b.x + 0.5 * k, b.y + 0.5 * k, b.w - k, b.h - k); g.setLineDash([]);
        g.font = '600 ' + (11 * k) + 'px ' + mono; g.fillStyle = 'rgba(134,203,254,.75)';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('yours', b.x + b.w / 2, b.y + b.h / 2);
        continue;
      }
      g.strokeStyle = 'rgba(134,203,254,.22)'; g.lineWidth = k;
      g.beginPath(); g.moveTo(b.x, b.y + b.h + 0.5 * k); g.lineTo(b.x + b.w, b.y + b.h + 0.5 * k); g.stroke();
      const capY0 = Math.max(b.y, b.y + (this.barTop || 0) - this.cap), fc = (this.tiny ? 9 : 10) * k, fl = (colW < 70 ? 9 : 10) * k;
      const p = this.tiny ? null : sd === 0 ? this.mineP : this.theirs.p;
      let capY = capY0, labs = null;
      if (this.A) {
        /* atlas (round 2, W(D3 offset)): the label stays at the SAME y HEAD prints it at — LAB_GAP px over the bar's true
           top dot row, not the top of whatever glyph cell that row happens to round into. a glyph cell rounds UP to its
           own lattice, which at a larger governor tier can sit most of a cell above the true top (measured up to 10.7 px
           at 1280, growing with the tier — the label chasing that meant the on-screen offset from ?atlas=0 grew with it
           too, past the 1.5-6 px this room was built to). instead, any sliver of that cell above the true top is painted
           back out in the field's own background (the overlay canvas already sits over the field, the same technique
           wall.js's drawMargin uses to keep a block's rendered edge where its data actually ends) — the bar's VISIBLE top
           now tracks the data, not the lattice, so the label needs no more than its original, fixed, tier-independent gap. */
        g.font = '600 ' + fc + 'px ' + mono;
        const cL = b.x, cR = b.x + g.measureText(caps[sd][0] + '  ' + caps[sd][1]).width, pl = this.plan;
        let lim = Infinity; labs = [];
        g.font = '600 ' + fl + 'px ' + mono;
        for (let c = 0; c < 3; c++) {
          let x0, x1, top;
          if (pl) {
            /* fix r3 (R1-d): the glyph plan's own row top (pl.rows*pl.ch, the packed-sample geometry) is not HEAD's
               topY (the real per/d dot pitch) — they quantise on different lattices, so the label chased a top that
               could sit up to ~10px off ?atlas=0's. HEAD's own formula is exact regardless of the glyph packing, so
               the label (and the masked-back visible bar top) now stand on THAT line, not the plan's. */
            const j = sd * 3 + c; if (!pl.cs[sd] || !pl.cs[sd][c]) continue;
            const n = this.cnt[sd * 3 + c]; if (!n) continue;
            const topY = b.y + b.h - Math.ceil(n / per) * d, gt = this.cellTop(ctx, topY + d);
            x0 = pl.L[j]; x1 = x0 + pl.k * pl.cw; top = topY;
            if (gt != null && gt < top - 0.05) { g.fillStyle = BG; g.fillRect(x0, gt, x1 - x0, top - gt); }
          } else {
            const n = this.cnt[sd * 3 + c]; if (!n) continue;
            const topY = b.y + b.h - Math.ceil(n / per) * d, gt = this.cellTop(ctx, topY + d);
            x0 = b.x + c * colW + pad; x1 = x0 + per * d; top = topY;
            if (gt != null && gt < top - 0.05) { g.fillStyle = BG; g.fillRect(x0, gt, x1 - x0, top - gt); }
          }
          if (x0 < cR && x1 > cL) lim = Math.min(lim, top);
          if (!p) continue;
          const tx = p[c] + '%', m = g.measureText(tx), tw = m.width, asc = m.actualBoundingBoxAscent || 0.74 * fl, px = b.x + c * colW + pad + (per * d) / 2;
          const l = px - tw / 2 - 4 * k, under = l < cR && l + tw + 8 * k > cL;
          /* R1-d: HEAD's own (non-plan) py is ALWAYS this same clamp, with no lift/under bypass — its tallest
             column (the least room above the caption) needs it even off to the side, clear of any caption text
             (a 3px miss on the served pile otherwise, g_precision --mode=head). */
          const py = Math.max(capY0 + this.cap - 2, top - LAB_GAP * k);
          const L = { c, tx, px, py, l, t: py - asc - 3 * k, w: tw + 8 * k, h: asc + 5 * k };
          if (under) lim = Math.min(lim, L.t);
          labs.push(L);
        }
        if (lim < Infinity) capY = Math.min(capY0, Math.max(capY0 - this.lift, lim - 3 * k - fc));
      }
      g.font = '600 ' + fc + 'px ' + mono; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillStyle = 'rgba(134,203,254,.85)'; g.fillText(caps[sd][0], b.x, capY);
      if (caps[sd][1]) { const cx1 = b.x + g.measureText(caps[sd][0] + '  ').width; g.fillStyle = 'rgba(164,155,189,.85)'; g.fillText(caps[sd][1], cx1, capY); if (dbg.on) this.prec.push({ id: 'n' + sd, text: caps[sd][1], wx: cx1, wy: capY }); }
      if (this.tiny) continue;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = '600 ' + fl + 'px ' + mono;
      if (labs) {
        for (const L of labs) {
          g.fillStyle = PLATE; g.fillRect(L.l, L.t, L.w, L.h);
          g.fillStyle = HEX[L.c]; g.fillText(L.tx, L.px, L.py);
          if (dbg.on) this.prec.push({ id: 'p' + sd + L.c, text: L.tx, wx: L.px, wy: L.py });
        }
        continue;
      }
      for (let c = 0; c < 3; c++) {
        const n = this.cnt[sd * 3 + c]; if (!n) continue;
        const topY = b.y + b.h - Math.ceil(n / per) * d;
        g.fillStyle = HEX[c];
        const px = b.x + c * colW + pad + (per * d) / 2, py = Math.max(capY + this.cap - 2, topY - 5 * k);
        g.fillText(p[c] + '%', px, py);
        if (dbg.on) this.prec.push({ id: 'p' + sd + c, text: p[c] + '%', wx: px, wy: py });
      }
    }
  },
  /* atlas: nothing is drawn under a wall's baseline. at rest nothing is there, but the dots fly in from wherever the last
     stop left them, and on a phone the make room's field runs well below these walls: a dot coming up from under a
     baseline weighs nothing (is not drawn) until it crosses into its wall's bottom glyph row, so the bars rise out of the
     baseline. the test is on the position the next frame will bin (swirl 0 and no jitter here, so y + (ty - y) * ease is
     exact), in world px against the grid line half a pitch under each baseline. a dot parked off stage (no wall: the
     second wall before a file is read) weighs nothing on its way out. runs only while a dot is still under a baseline;
     place() starts it again. the shell resets P.w on every stop change */
  floorMask(ctx) {
    const P = ctx.particles, W = P.w, Y = P.y, TY = P.ty, SD = P.seed, n = P.n, side = this.sideA, B = this.boxes, h = (this.d || 1) / 2;
    if (!W || !side || !B) { this.flight = false; return; }
    const e = ctx.reduced ? 1 : P.ease, red = !!ctx.reduced, f0 = B[0].y + B[0].h + h, f1 = B[1].y + B[1].h + h;
    let below = 0;
    for (let i = 0; i < n; i++) {
      const ty = TY[i];
      if (ty < -40) { W[i] = 0; continue; }
      const y = red ? ty : Y[i] + (ty - Y[i]) * e * (0.5 + SD[i] * 0.16);
      if (y >= (side[i] ? f1 : f0)) { W[i] = 0; below++; } else W[i] = 255;
    }
    if (!below) this.flight = false;
  },
  /* the top of the glyph cell that holds world y, i.e. where a bar drawn in glyphs visibly ends, off this frame's lattice
     (the field is binned before the overlay is drawn, in the same frame). null without a glyph field */
  cellTop(ctx, wy) {
    let B = null; try { B = ctx.atlas.GF.buffers(); } catch (e) {}
    if (!B || !(B.invCh > 0)) return null;
    const v = ctx.view, dpr = ctx.particles.dpr || 1, py = v.apply(0, wy)[1] * dpr;
    const top = Math.round(B.gy0 + Math.floor((py - B.gy0) * B.invCh) / B.invCh);
    return v.unapply(0, top / dpr)[1];
  },
  /* ================================================================ atlas (BUILD_SPEC_V2 §1.4, §3 yours row) */
  angles: [{ id: 'bars', name: 'the bars' }],

  glyphs(ctx) { const A = ctx.atlas; return !!(A && A.GF && !A.noglyph && !A.GF.stub); },
  cellCss(ctx) { try { const c = ctx.atlas.GF.info().cellCss; return c > 0 ? c : 6; } catch (e) { return 6; } },

  /* ---- the walls in whole glyph cells (fix r3) ----
     D2 is counted per wall, in cells, and a wall is 33 to 400 cells. laid out in rows of dots, a bar ended in a part-filled
     row of cells and its sides fell across cells wherever its column missed the lattice, so each bar's cell count rounded
     its own way and a wall missed its three shares by up to 7.6 points (360x640). here:
     - the lattice is the field's own at z 1 (glyphfield layout(), fit 'multiple'): cells of m x mh dot pitches;
     - each bar is k cells wide (as wide as ?atlas=0's column, to the nearest cell), centred where ?atlas=0 centres it
       and moved onto the lattice (under half a cell);
     - each wall has C cells, handed to its three bars by largest remainder of the shares (mine: the field's own
       provenance, all of it; yours: the counts read from the file, unrounded). a share that is there keeps a cell;
     - every cell holds exactly K dots, spread evenly over its m x mh places, so every cell is full: the shell's partial-
       cell thinning never runs, all cells draw the same glyph, and the cells show the rounded shares, off by at most
       2/3 of a cell each (2 points at 33 cells);
     - C sits near the count that keeps ?atlas=0's bar heights (C0); within 4% of it, a count whose rounding misses by
       more than a point gives way to a nearby one that misses less. the tallest bar must end under the CAP strip;
     - the dots come from the whole field: mine by their own provenance (the even dots first, as at ?atlas=0), yours by
       quota over the rest (the odd dots first). the few no cell needs are parked off stage and weigh nothing.
     a new cell size (the governor's tier, the detail setting) re-plans it: frame() watches the lattice at z 1 */
  cells(ctx) {
    const P = ctx.particles, n = P.n, B = this.boxes, d = this.d, per = this.per, dpr = P.dpr || 1, split = this.split;
    const css = this.cellCss(ctx), cwT = Math.max(3, Math.round(css * dpr)), chT = Math.round(cwT * 1.8), pw = d * dpr;
    let m = Math.max(1, Math.round(cwT / pw)), mh = Math.max(1, Math.round(chT / pw));
    while (pw * m < 3) m *= 2;
    while (pw * mh < 4) mh *= 2;
    const cw = m * d, ch = mh * d, slots = m * mh, colW = B[0].w / 3, pad = colW * 0.11;
    const k = Math.max(1, Math.min(Math.round((per * d) / cw), Math.floor((colW * 0.94) / cw)));
    const prov = P.prov, pc = [0, 0, 0]; for (let i = 0; i < n; i++) pc[prov[i]]++;
    const fm = pc.map((v) => v / n), ft = split && this.theirs ? this.theirs.f || this.theirs.p.map((v) => v / 100) : null;
    const F = ft ? [fm, ft] : [fm], N = ft ? Math.floor(n / 2) : n;
    const lr = (f, C) => {
      const q = f.map((v) => v * C), c = q.map(Math.floor), o = [0, 1, 2].sort((a, b) => q[b] - c[b] - (q[a] - c[a]));
      for (let j = 0, r = C - c[0] - c[1] - c[2]; j < r; j++) c[o[j]]++;
      for (let j = 0; j < 3; j++) if (f[j] > 0 && !c[j]) { c[c.indexOf(Math.max(c[0], c[1], c[2]))]--; c[j]++; }
      return c;
    };
    const miss = (C) => { let e = 0; for (const f of F) { const c = lr(f, C); for (let j = 0; j < 3; j++) e = Math.max(e, Math.abs(c[j] / C - f[j]) * 100); } return e; };
    const tall = (C) => { let r = 0; for (const f of F) r = Math.max(r, Math.ceil(Math.max(...lr(f, C)) / k)); return r * ch; };
    const room = B[0].h - this.cap - this.lift + d, C0 = (N * k) / (per * mh);
    /* an upright phone has no ?atlas=0 heights to keep (its layout there is another shape): the tallest bar fills the box
       instead of stopping where the pitch's quarter steps left it (41% of the stage on a 390x844 phone at d 0.75) */
    let cT = Math.max(3, Math.round(C0));
    if (this.compact) { for (let c = cT, top = 4 * cT; c <= top; c++) if (tall(c) <= room) cT = c; }
    const w = Math.max(1, Math.round(cT * 0.04)), hi = this.compact ? cT : cT + w;
    let C = 0, best = Infinity;
    for (let c = Math.max(3, cT - w); c <= hi; c++) {
      if (tall(c) > room) continue;
      const s = Math.max(1, Math.round(miss(c) * 10) / 10);
      if (s < best - 1e-9 || (Math.abs(s - best) < 1e-9 && Math.abs(c - cT) < Math.abs(C - cT))) { best = s; C = c; }
    }
    if (!C) { C = Math.max(3, cT - w - 1); while (C > 3 && tall(C) > room) C--; }
    const cs = F.map((f) => lr(f, C));
    let K = Math.max(1, Math.floor(N / C));
    for (let j = 0; j < 3; j++) if (cs[0][j]) K = Math.min(K, Math.floor(pc[j] / cs[0][j]));
    K = Math.max(1, K);

    const side = this.sideA, pv = this.pvA, rank = this.rankA, need = cs.map((c) => c.map((v) => v * K)), used = [[0, 0, 0], [0, 0, 0]];
    side.fill(2);
    const st = ft ? 2 : 1;
    for (const par of ft ? [0, 1] : [0]) for (let i = par; i < n; i += st) { const c = prov[i]; if (used[0][c] < need[0][c]) { side[i] = 0; pv[i] = c; rank[i] = used[0][c]++; } }
    if (ft) {
      const t = ft[0], s = ft[0] + ft[1], hash = ctx.hash, nd = need[1], u1 = used[1];
      let left = K * C;
      for (const par of [1, 0]) for (let i = par; i < n && left > 0; i += 2) {
        if (side[i] !== 2) continue;
        const u = hash(i * 31 + 17); let c = u < t ? 0 : u < s ? 1 : 2;
        if (u1[c] >= nd[c]) c = u1[0] < nd[0] ? 0 : u1[1] < nd[1] ? 1 : 2;
        side[i] = 1; pv[i] = c; rank[i] = u1[c]++; left--;
      }
    }
    const base = [B[0].y + B[0].h + d / 2, B[1].y + B[1].h + d / 2], L = new Float64Array(6), rows = new Int32Array(6);
    const ox = B[0].x + pad + (per * d) / 2 - (k * cw) / 2;
    for (let sd = 0; sd < 2; sd++) for (let c = 0; c < 3; c++) {
      const x = B[sd].x + c * colW + pad + (per * d) / 2 - (k * cw) / 2;
      L[sd * 3 + c] = ox + Math.round((x - ox) / cw) * cw;
      rows[sd * 3 + c] = cs[sd] ? Math.ceil(cs[sd][c] / k) : 0;
    }
    P.targetPx((i) => {
      const sd = side[i]; if (sd > 1) return null;
      const r = rank[i], q = (r / K) | 0, j = r - q * K, row = (q / k) | 0, sl = Math.floor((j * slots) / K);
      return [L[sd * 3 + pv[i]] + (q - row * k) * cw + ((sl % m) + 0.5) * d, base[sd] - row * ch - (((sl / m) | 0) + 0.5) * d];
    });
    /* the caption sits over the tallest bar: ?atlas=0's place for it, except on an upright phone, where it is the filled bar's */
    if (this.compact) this.barTop = base[0] - Math.max(rows[0], rows[1], rows[2], rows[3], rows[4], rows[5]) * ch - B[0].y;
    this.plan = { t: performance.now(), css, dpr, m, mh, cw, ch, k, K, C, C0, cT, cs, L, rows, base, ox, cwDev: cw * dpr, chDev: ch * dpr, skip: false, miss: miss(C) };
  },
  /* a wall's caption: its name and its count */
  capText(sd) { return sd === 0 ? ['mine', int(this.mineN) + ' plays'] : [this.theirs ? (this.demo ? 'demo' : 'yours') : 'yours', this.theirs ? int(this.theirs.n) + ' plays' : '']; },
  /* the lattice changed under the plan (a governor tier, the detail setting): re-plan. read at z 1 only, where the plan's
     cells are the field's; once the fly-in has settled; and never twice for the same cell size */
  watchLattice(ctx) {
    const pl = this.plan; if (!pl || pl.skip || this.flight || !this.active) return;
    if (Math.abs((ctx.view.z || 1) - 1) > 1e-6 || performance.now() - pl.t < 400) return;
    let B = null; try { B = ctx.atlas.GF.buffers(); } catch (e) {}
    if (!B || !(B.invCw > 0)) return;
    if (Math.abs(1 / B.invCw - pl.cwDev) < 1e-3 && Math.abs(1 / B.invCh - pl.chDev) < 1e-3) return;
    if (this.cellCss(ctx) === pl.css && (ctx.particles.dpr || 1) === pl.dpr) { pl.skip = true; return; }
    this.place(ctx);
  },
  /* an upright phone's panel: how to get an export and the privacy sentence, folded under more */
  foldOpen(o) {
    this.pn.classList.toggle('open', o);
    this.opn.setAttribute('aria-expanded', String(o));
    this.opn.textContent = o ? 'less ▴' : 'more ▾';
  },

  atlasGlyph(ctx) {
    const P = ctx.particles, pv = this.pvA, b = this.boxes && this.boxes[0], d = this.d, pl = this.plan; if (!b || !d) return;
    const colW = b.w / 3, pad = colW * 0.11;
    P.glyphAll(true);
    P.glyphMode('cat', { cats: CATS });
    const side = this.sideA; P.catBy((i) => pv[i] + (side[i] === 1 ? 4 : 1));
    /* cells are whole multiples of the dot pitch, their lines halfway between dots: the plan's lattice, or (no glyph
       field) anchored at my first bar's corner */
    P.glyphGrid({ ox: pl ? pl.ox : b.x + pad - d / 2, oy: b.y + b.h + d / 2, pw: d, ph: d, fit: 'multiple' });
    this.atlasLabels(ctx);
  },

  /* MINE and YOURS, each under its own baseline, left-aligned with its wall (anchors.js: a region box starts 5 px right
     of its anchor and ends 5 px over it, 18 px tall, so the box runs 4 to 22 px under the baseline). an upright phone
     has no free line for them: there the overlay captions ("mine 97,427 plays") are the names */
  atlasLabels(ctx) {
    if (!this.A || !this.active || !this.boxes) return;
    const B = this.boxes, items = [];
    if (innerWidth <= innerHeight * 1.15) { ctx.labels.set('yours', []); return; }
    const put = (id, text, b) => { items.push({ id, text, kind: 'region', x: b.x - 5, y: b.y + b.h + 27, r: 0, pri: 5 }); };
    put('mine', 'mine', B[0]);
    if (this.theirs) put('yours', this.demo ? 'demo' : 'yours', B[1]);
    ctx.labels.set('yours', items);
  },

  precision() { return this.prec ? this.prec.slice() : []; },
  keepout() { const r = this.pn && this.pn.getBoundingClientRect(); return r && r.width ? [{ x: r.left, y: r.top, w: r.width, h: r.height }] : []; },
};
