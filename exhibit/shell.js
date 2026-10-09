/* sonic manifold — exhibit shell.
   One persistent particle field (one dot per play) that every room re-targets, a small audio
   engine for the soundtrack with an analyser, and the room lifecycle. No libraries.

   ROOM CONTRACT (exhibit/rooms/<id>.js):
     export default {
       id: 'wall',                 // matches <section data-room="wall">
       track: 'autotropic',        // basename of audio/bed/<track>.mp3, or null to keep the current one
       async mount(root, ctx) {},  // once, first time the room comes near; build DOM inside `root`
       enter(ctx) {},              // every time the room becomes the active one
       leave(ctx) {},              // when another room becomes active
       frame(g, t, bands, w, h, ctx) {} // optional: draw on the overlay canvas while active (g = 2d context, CSS px)
     }
   ctx = { reduced, coarse, particles, audio, data(name), go(i), stage() }
   ATLAS MODE adds the optional angles/setAngle/focus/pick/gestures/state/restore/precision members and the ctx.atlas,
   ctx.view, ctx.gesture, ctx.labels, ctx.tour … fields of BUILD_SPEC_V2 §1; SKELETON_NOTES.md
   lists them exactly as implemented here.
*/

/* the listening posts and the label text are optional: a blocked or flaky file leaves them off instead of leaving the exhibit unbooted. one retry, then a no-op stand-in */
const soft = (u, d) => import(u).catch(() => import(u + '&retry=1')).catch(() => d);
const [PM, LM] = await Promise.all([
  soft('./post.js?v=12', { postCSS: '', post() {}, stopAll() {}, playClip() {}, clipsAllowed: () => false, grant() {}, hasTrack: () => Promise.resolve(false), hasTrackNow: () => false, playQuiet() {}, dwell() {}, undwell() {}, postState: () => ({}) }),
  soft('./labels.js?v=22', { LABELS: {}, HINTS: {}, HINTS_ATLAS: {}, HINTS_TOUCH: {} }),
]);
const { postCSS, post, stopAll, playClip, clipsAllowed, grant, hasTrack, hasTrackNow, playQuiet, dwell, undwell, postState } = PM;
const { LABELS, HINTS, HINTS_ATLAS, HINTS_TOUCH } = LM;
/* every module and data url carries the shell's own ?v= so a service-worker cache can never mix versions */
const V = new URL(import.meta.url).search || '';
/* the head's boot-veil fallback stands down once this is set: from here on the shell lifts the veil itself (bootLift) */
window.__exhibitShell = true;
const $ = (s, r = document) => r.querySelector(s);
{ const st = document.createElement('style'); st.textContent = postCSS; document.head.appendChild(st); }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = matchMedia('(pointer: coarse)').matches;

/* ATLAS MODE (BUILD_SPEC_V2 §1.1). on by default; ?atlas=0 is today's scrolling exhibit, and every atlas branch below is
   guarded so that path runs the old code. the renderer, camera and gesture modules are needed by the loop before its
   first frame, so they load here (only in atlas mode) with the shell's own ?v=; everything else mounts after frame one. */
export const ATLAS = !/[?&]atlas=0\b/.test(location.search);
const DEBUG = /[?&]atlasdebug=1\b/.test(location.search);
const NOGLYPH = /[?&]glyph=0\b/.test(location.search);
const NODRIFT = /[?&]drift=0\b/.test(location.search);
/* R10: the field's skin. 'glyph' = the print alone; 'ink' screens the dye bath (atlas/field.ink.js) under the print; 'slime'
   grows the physarum veins (atlas/field.slime.js) on the links; 'both' = ink and slime. ?field= picks; FIELD_DEFAULT is the
   one line that flips the default */
const FIELD_DEFAULT = 'both';
const FIELD = ATLAS && !NOGLYPH ? ((/[?&]field=(ink|slime|both|glyph|dots)\b/.exec(location.search) || [])[1] || FIELD_DEFAULT).replace('dots', 'glyph') : 'glyph';
const INK_ON = FIELD === 'ink' || FIELD === 'both', SLIME_ON = FIELD === 'slime' || FIELD === 'both';
const HASH0 = location.hash; /* read before anything rewrites it: url.js parses the deep link once, after it mounts */
/* a module whose fetch fails (a dropped connection, a lossy phone link, a burst of parallel requests reset) is asked for
   twice more, 0.3 s and 0.6 s later, under a changed url: the page remembers a failed module by its url, so the same url
   would fail again at once. no module imports another, so a retried url never makes a second copy of one. what still
   fails after that is named in LOADFAIL and the visitor is told (loadFailed), never left on a silent, inert page */
const LOADFAIL = [];
function importRetry(url, k = 0) {
  return import(k ? url + (url.indexOf('?') >= 0 ? '&' : '?') + 'retry=' + k : url)
    .catch((e) => { if (k >= 2) throw e; return new Promise((r) => setTimeout(r, 300 * (k + 1))).then(() => importRetry(url, k + 1)); });
}
const atlasImport = (n) => importRetry('./atlas/' + n + '.js' + V).catch((e) => { console.warn('atlas module', n, e); LOADFAIL.push(n); loadFailed(); return {}; });
/* the camera, the gesture layer and the renderer: without one of them the atlas cannot be driven, so the page does not call
   itself ready (atlasReady) and says so, with a way to try again */
const CORE = ['glyphfield', 'camera', 'gesture', 'glyph-atlas'];
/* the four modules the first frame needs; a tour link (#tour=id&stop=n) also reads the tours now, so the page opens on the
   room that stop stands in instead of on the threshold for a moment (a globe, then a cut: R2_REQUESTS_R4 V2) */
const TOURHASH = ATLAS ? /^#tour=([^&]+)/.exec(HASH0) : null;
const [GFM, CAMM, GESM, GAM, TOURSM] = ATLAS ? await Promise.all([atlasImport('glyphfield'), atlasImport('camera'), atlasImport('gesture'), atlasImport('glyph-atlas'), TOURHASH ? atlasImport('tours') : {}]) : [{}, {}, {}, {}, {}];
/* every failure notice offers the way out that needs none of the atlas: the same page, read as text */
function plainLink(p) {
  if (p.querySelector('a')) return;
  const a = document.createElement('a'); a.href = location.pathname + '?atlas=0'; a.textContent = 'read it as a plain page \u203a';
  a.style.cssText = 'color:var(--ice);min-height:44px;display:inline-flex;align-items:center'; p.style.flexWrap = 'wrap'; p.appendChild(a);
}
function loadFailed() {
  if (!ATLAS) return;
  const go = () => {
    if (!document.body) return;
    let p = document.getElementById('atlas-bootfail');
    if (!p) { p = document.createElement('p'); p.id = 'atlas-bootfail'; p.setAttribute('role', 'alert'); document.body.appendChild(p); }
    p.textContent = LOADFAIL.some((n) => CORE.includes(n)) ? 'the atlas did not finish loading: the connection dropped part of it.' : 'part of the atlas did not load: the connection dropped it.';
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'try again'; b.addEventListener('click', () => location.reload());
    p.appendChild(b); plainLink(p);
    p.dataset.failed = LOADFAIL.join(' ');
  };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go, { once: true });
}
/* the boot veil (R2_VERIFY_2_beauty P0-1). the head sets html.atlas-boot on every atlas load: every wall, and the pre-atlas
   header controls, stay hidden until the linked room is active and the chrome has mounted, because until the chrome sets
   its compact card (ai-less) a wall shows its pre-atlas words at full size (the serif title, both paragraphs, the legend
   chips). lifted once, a frame after the chrome is up; also on every path where the chrome never comes (it failed to load
   or mount, a core module failed, the boot watchdog fired), so a broken page still shows its words. atlas-walls releases
   the head's title rule with it */
function bootLift() {
  if (!ATLAS) return;
  const de = document.documentElement;
  if (de.classList.contains('atlas-walls')) return;
  requestAnimationFrame(() => { de.classList.add('atlas-walls'); de.classList.remove('atlas-boot'); });
}
const noop = () => {}, off0 = () => noop;
/* inert stand-ins: at ?atlas=0 these are what ctx.view / ctx.gesture / GF are, so a room that calls one unguarded cannot throw */
const VIEW0 = { stub: true, mode: 'none', cx: 0, cy: 0, z: 1, yaw: 0, pitch: 0, dist: 1, target: [0, 0, 0], state: 'home', manual: false,
  configure: noop, set: noop, flyTo: () => Promise.resolve(), home: noop, pan: noop, zoomBy: noop, orbitBy: noop,
  apply: (x, y) => [x, y], unapply: (x, y) => [x, y], matrix: () => [1, 0, 0, 1, 0, 0], project: (x, y) => [x, y, 1, 1], layer: (root) => root, onChange: off0, pose: () => '' };
const GEST0 = { stub: true, stage: null, dragging: false, bind: off0 };
const GF0 = { stub: true, configure: noop, room: noop, buffers: () => null, begin: noop, render: noop, stats: () => ({ cols: 0, rows: 0, occ: 0, medianN: 0, medianW: 0, meanW: 0, cellCss: 0 }), debug: () => ({ catCells: [0, 0, 0, 0, 0, 0, 0, 0], catDots: [0, 0, 0, 0, 0, 0, 0, 0], catDotsW: [0, 0, 0, 0, 0, 0, 0, 0] }), toText: () => '', tier: noop, off: noop };
const GF = (GFM.GF && typeof GFM.GF.buffers === 'function') ? GFM.GF : (GFM.default && typeof GFM.default.buffers === 'function') ? GFM.default : GF0;
let VIEW = VIEW0, GEST = GEST0; /* created once ctx exists (below) */
let readyRes = noop, atlasReady = false;
/* ctx.atlas (§1.3). insets are written by the chrome (M3); gov is the governor's tier, read by modules (T4: no twinkle,
   edges or drift; T5: labels capped at 12, flights warp); reenter is true while the shell re-runs enter() for a resize */
const ATL = { on: ATLAS, debug: DEBUG, noglyph: NOGLYPH, nodrift: NODRIFT, hash0: HASH0, kiosk: /[?&]kiosk=1\b/.test(location.search),
  enter: (/[?&]enter=(sound|quiet)\b/.exec(location.search) || [])[1] || null,
  insets: { top: 0, bottom: 0, left: 0, right: 0 }, gov: { tier: 0, told: false, lowered: false }, reenter: false, GF, stage0: () => stageAtlas(true),
  ready: new Promise((r) => { readyRes = r; }),
  /* K1: segs = [{x0, y0, x1, y1, w, c, pulse}] or a packed Float32Array (7 per segment), in the particles' space (css px
     before the pan camera); drawn by the glyph pass from the next frame, cleared when the room is left */
  setLines(segs) { LINES = segs && (segs.length || segs.byteLength) ? segs : null; } };
/* THE COLOUR CODE. two questions, and a colour on screen answers one of them or it does not appear.
   1. PROVENANCE — who pressed play. mint = i tapped it. amber = chance, a shuffle. violet = the machine served it.
      rose = killed or withdrawn. ice = neutral interface: links, axes, focus rings. these five are reserved:
      nothing decorative may use them. `violet` is the hue; `served` is the same hue dimmed, which is what 62,000
      dots want on a near-black wall — the chip in a legend uses the bright one so a 9px square still reads.
   2. GENRE FAMILY — what kind of music. one fixed hue per family in FAM below. */
export const PAL = { bg: 0x0a0118, white: 0xd8d2ea, tap: 0x21f6bc, shuffle: 0xf5a623, served: 0x6b5a86, violet: 0x8b6fd6, mint2: 0x7df0c8, orchid: 0xbda6ff, ice: 0x86cbfe, rose: 0xff6e9c, amber: 0xf5a623, fog: 0x57507a };
export const PROV = [PAL.tap, PAL.shuffle, PAL.served];
/* the three provenance chips, in the order the log splits: tapped, shuffled, served */
export const PROV_CHIP = [PAL.tap, PAL.shuffle, PAL.violet];
/* the 13 families of the hand-curated taxonomy this study labels artists into (audio/sonic-maps.json carries the
   same 13 keys; exhibit/data/twolisteners.json uses the 10 of them that its 120 artists touch, plus "untagged").
   chosen so that every pair is at least ΔE 20 apart in CIELAB and every one of them is at least ΔE 23 from the five
   reserved hues above — pastel, lower chroma, so a family never reads as a provenance. */
export const FAM = {
  'ambient/lofi': 0xadced7, classical: 0xdfd086, electronic: 0x8698df, experimental: 0xc3add7,
  'folk/country': 0xb8d86e, 'funk/disco': 0xd86ed5, 'hip-hop · r&b': 0xdf868f, jazz: 0xd7b4ad,
  other: 0xb8d7ad, pop: 0xdf86c4, 'rock/metal': 0x7fd489, soundtrack: 0x41dfec, /* moved off the tap mint (was 0x6fd6c0, dE 13 from it): a genre must never read as provenance */ 'world/desi': 0xd89c6e,
  untagged: 0x9a9aa2, unknown: 0x9a9aa2, /* no public tag: grey, and grey means nothing is known */
};
export function famColor(name) { const k = String(name == null ? '' : name).toLowerCase(); return Object.prototype.hasOwnProperty.call(FAM, k) ? FAM[k] : FAM.untagged; }
const hex = (v) => '#' + (v >>> 0).toString(16).padStart(6, '0');
const PROV_ROWS = [[PAL.tap, 'i tapped'], [PAL.shuffle, 'i shuffled'], [PAL.violet, 'it was served']];
/* the one legend every room uses. kind = 'prov' (who pressed play) or 'fam' (genre families, opts.items names them).
   it is aria-hidden and holds nothing focusable: a screen reader gets the same information in the room's wall
   label, which is a full sentence rather than a row of coloured squares. */
export function legend(host, kind, opts = {}) {
  if (!host) return null;
  const old = host.querySelector(':scope > .legend[data-legend="' + kind + '"]'); if (old) old.remove(); /* re-mounting a room replaces its legend, it does not stack another one */
  const el = document.createElement('p');
  el.className = 'legend'; el.dataset.legend = kind; el.setAttribute('aria-hidden', 'true');
  const rows = kind === 'fam'
    ? (opts.items && opts.items.length ? opts.items : Object.keys(FAM).filter((k) => k !== 'unknown')).map((n) => [famColor(n), n])
    : PROV_ROWS.map(([c, t], i) => [c, opts.labels && opts.labels[i] ? opts.labels[i] : t]);
  rows.forEach(([c, t]) => {
    const s = document.createElement('span'), i = document.createElement('i');
    i.style.background = hex(c); s.appendChild(i); s.appendChild(document.createTextNode(t)); el.appendChild(s);
  });
  host.appendChild(el);
  return el;
}
export function hash(i) { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; }

/* ------------------------------------------------------------------ particles */
const TOTAL_PLAYS = 97427;
export const lowPower = coarse || (navigator.hardwareConcurrency || 4) <= 4 || Math.min(innerWidth, innerHeight) < 700;
const N = lowPower ? Math.round(TOTAL_PLAYS / 4) : TOTAL_PLAYS; /* phones draw one dot per four plays; the caption says so */

const field = $('#field');
const over = $('#overlay');
const fg = field.getContext('2d', { alpha: false });
/* bloom: every device starts with it; the governor in loop() takes it away from any that cannot hold the frame rate */
const glow = $('#glow'); let gg = glow && !reduced ? glow.getContext('2d') : null; if (glow && !gg) glow.remove();
const GDIV = lowPower ? 6 : 4, canvasBlur = !!gg && 'filter' in gg; 
/* R9: no canvas filter (safari): the halo comes from a second, much smaller copy drawn back over the first, so a phone blooms too */
if (gg && !canvasBlur && !ATLAS) { if (lowPower) { gg = null; glow.remove(); } else glow.style.filter = 'blur(7px)'; }
const GT = gg && ATLAS ? document.createElement('canvas') : null, gt = GT ? GT.getContext('2d') : null; if (gt) { gt.imageSmoothingEnabled = true; gg.imageSmoothingEnabled = true; }
/* R9: a static nebula between the field and the overlay: depth for the print to sit on. css only; the field's pixels are untouched */
if (ATLAS && !NOGLYPH) {
  const st = document.createElement('style'); st.textContent = '#neb{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:0;pointer-events:none;opacity:.9;background:radial-gradient(38vmax 30vmax at 28% 34%,rgba(120,92,255,.12),transparent 70%),radial-gradient(34vmax 26vmax at 74% 62%,rgba(40,190,214,.09),transparent 70%),radial-gradient(26vmax 22vmax at 60% 22%,rgba(255,92,170,.08),transparent 70%),radial-gradient(30vmax 24vmax at 20% 80%,rgba(255,176,86,.045),transparent 70%)}@media (forced-colors:active){#neb{display:none}}';
  document.head.appendChild(st); const nb = document.createElement('div'); nb.id = 'neb'; nb.setAttribute('aria-hidden', 'true'); (glow || field).after(nb);
}
/* pointer: dots part around it, a press leaves a ripple */
const PT = { x: -999, y: -999, on: false, ripples: [] };
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || PT.down) { PT.x = e.clientX; PT.y = e.clientY; PT.on = true; PT.last = performance.now(); } }, { passive: true });
addEventListener('pointerdown', (e) => { PT.down = true; PT.x = e.clientX; PT.y = e.clientY; PT.on = true; PT.last = performance.now(); if (ATLAS) { PT.dx = e.clientX; PT.dy = e.clientY; PT.dt = PT.last; } else if (!reduced && PT.ripples.length < 6) PT.ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); }, { passive: true });
/* atlas: a ripple marks a tap or a hold (the pointer stayed within 6 px), never a drag */
const ptOff = (e) => { if (ATLAS && PT.down && e && e.type === 'pointerup' && !reduced && PT.ripples.length < 6 && !(GEST && GEST.dragging) && Math.abs(e.clientX - PT.dx) < 6 && Math.abs(e.clientY - PT.dy) < 6) PT.ripples.push({ x: PT.dx, y: PT.dy, t: performance.now() }); PT.down = false; if (!e || e.pointerType !== 'mouse') PT.on = false; };
addEventListener('pointerup', ptOff, { passive: true }); addEventListener('pointercancel', ptOff, { passive: true }); document.addEventListener('mouseleave', () => { PT.on = false; });
const og = over.getContext('2d');
let W = 0, H = 0, PW = 0, PH = 0, DPR = 1, ODPR = 1, img = null, buf32 = null;
const BG = 0xff18010a; /* #0a0118 as little-endian ABGR */

const P = {
  n: N, perDot: TOTAL_PLAYS / N,
  x: new Float32Array(N), y: new Float32Array(N),
  tx: new Float32Array(N), ty: new Float32Array(N),
  c: new Uint32Array(N), tc: new Uint32Array(N),
  seed: new Float32Array(N),
  prov: new Uint8Array(N),   /* 0 tapped · 1 shuffled · 2 served: assigned once, kept for the whole visit */
  artist: new Uint16Array(N), /* index into mapmorph.artists: where this play lives in rooms 05 and 06 */
  ease: 0.07, jitter: 0.6, big: false,
  swirl: 0.4,  /* how much a dot arcs on its way to a new target (0 = straight). reset on every room change */
  touch: true, /* dots part around the pointer */
  /* fn(i, n) -> [x, y] in stage-normalised 0..1 (or null to park the dot off-screen) */
  target(fn) {
    const s = stage();
    for (let i = 0; i < N; i++) {
      const p = fn(i, N);
      if (!p) { this.tx[i] = -50; this.ty[i] = -50; continue; }
      this.tx[i] = s.x + p[0] * s.w; this.ty[i] = s.y + p[1] * s.h;
    }
    if (reduced) { this.x.set(this.tx); this.y.set(this.ty); }
  },
  /* fn(i, n) -> [x, y] in CSS px (for pixel-exact grids) */
  targetPx(fn) {
    for (let i = 0; i < N; i++) { const p = fn(i, N); if (!p) { this.tx[i] = -50; this.ty[i] = -50; } else { this.tx[i] = p[0]; this.ty[i] = p[1]; } }
    if (reduced) { this.x.set(this.tx); this.y.set(this.ty); }
  },
  get dpr() { return DPR; },
  /* fn(i, n) -> 0xRRGGBB */
  color(fn) {
    for (let i = 0; i < N; i++) {
      const v = fn(i, N) >>> 0;
      this.tc[i] = 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff);
    }
    if (reduced) this.c.set(this.tc);
  },
  scatter() { this.target(() => [Math.random(), Math.random()]); },
  /* atlas glyph field (§1.2). allocated always so an unguarded call cannot throw; only read by drawField in atlas mode,
     and reset on every stop activation */
  glyph: new Uint8Array(N), cat: new Uint8Array(N), w: new Uint8Array(N).fill(255), rg: new Uint16Array(N),
  glyphAll(on) { this.glyph.fill(on ? 1 : 0); },
  glyphMask(fn) { const G = this.glyph; for (let i = 0; i < N; i++) G[i] = fn(i, N) ? 1 : 0; },
  catBy(fn) { const C = this.cat; for (let i = 0; i < N; i++) C[i] = fn(i, N) & 7; },
  /* categorical rooms: the bin each play belongs to (an hour, a month; 0..4095). the D2 pass never hides the last drawn
     cell of a bin, so no bin that holds plays goes blank. a room on a `divide` grid gets its pitch columns as bins without
     asking; regionBy(null) goes back to that */
  regionBy(fn) { if (typeof fn !== 'function') { GCFG.region = false; return; } const R = this.rg; for (let i = 0; i < N; i++) R[i] = fn(i, N) & 4095; GCFG.region = true; },
  /* eras of bins that must each hold D2 on their own (the calendar: [breakAt], its months before and after october 2023):
     up to three ascending bounds, each the first bin of a new zone, in the room's own bins (P.regionBy's values, or the
     columns of a divide grid counted from its origin). null goes back to one zone. reset on every activation */
  glyphZones(b) { const z = Array.isArray(b) ? b.map(Number).filter((v) => isFinite(v)).sort((x, y) => x - y).slice(0, 3) : []; GCFG.zones = z.length ? z : null; },
  /* opts.edges (K2: true | false | 'large') and opts.bleach fall back to what the room declares on its module (`glyph`),
     so a room that only names its colour mode keeps its declared rim and bleach */
  glyphMode(mode, opts = {}) {
    const g = roomGlyph();
    GCFG.mode = mode === 'cat' ? 'cat' : 'cont'; GCFG.cats = opts.cats || null; GCFG.colour = opts.colour === 'mean' ? 'mean' : 'sample';
    GCFG.edges = opts.edges !== undefined ? opts.edges : g.edges; GCFG.bleach = opts.bleach !== undefined ? !!opts.bleach : !!g.bleach;
    gfRoom();
  },
  glyphGrid(g) { GCFG.grid = g || null; if (g && Array.isArray(g.zones)) this.glyphZones(g.zones); gfRoom(); },
  glyphCell(css) { GCFG.cell = css == null ? null : clamp(+css || 0, 4, 12); gfRoom(); },
  /* the stage-edge feather for a haze (see drawField), px; 0 is off. the room's `glyph.feather` sets it on every activation */
  glyphFeather(px) { GCFG.feather = Math.max(0, +px || 0); },
};
/* the active stop's glyph configuration, handed to GF.room() whenever a room changes it (and reset on activation) */
const GCFG = { mode: 'cont', cats: null, colour: 'sample', grid: null, cell: null, region: false, edges: undefined, bleach: false, zones: null, feather: 0 };
/* what the active room declares about its glyphs (`glyph: { edges, bleach }` on the module): read on every activation and
   every glyphMode() call. bleach never outlives its room: a sampled cell elsewhere shows one member's exact hue */
function roomGlyph() { const r = rooms[active], g = r && r.mod && r.mod.glyph; return g && typeof g === 'object' ? g : {}; }
function gfReset() { const g = roomGlyph(); GCFG.mode = 'cont'; GCFG.cats = null; GCFG.colour = 'sample'; GCFG.grid = null; GCFG.cell = null; GCFG.region = false; GCFG.edges = g.edges; GCFG.bleach = !!g.bleach; GCFG.zones = null; GCFG.feather = Math.max(0, +g.feather || 0); }
function gfRoom() { if (ATLAS) try { GF.room({ mode: GCFG.mode, cats: GCFG.cats, colour: GCFG.colour, grid: GCFG.grid, cell: GCFG.cell, edges: GCFG.edges, bleach: GCFG.bleach }); } catch (e) { console.warn('GF.room', e); } }
/* K1: the active room's glyph trails, handed to the renderer every frame and dropped when the room is left */
let LINES = null;
for (let i = 0; i < N; i++) { P.seed[i] = Math.random() * 6.283; P.x[i] = Math.random() * innerWidth; P.y[i] = Math.random() * innerHeight; P.c[i] = P.tc[i] = 0xff8c8ca0; }
/* the reservoir test's per-dot half, frac(seed * 9301), computed once (seeds never change): the hot loop then adds the
   cell key and wraps once instead of a multiply and a floor per glyph dot */
const SFR = new Float32Array(N); for (let i = 0; i < N; i++) { const u = P.seed[i] * 9301; SFR[i] = u - Math.floor(u); }
/* categorical cells (D2) pick their shown category by stratified sampling: the hot loop counts each cell's members per
   category (keeping the index of the last member), then every occupied cell draws one key from the R2 quasi-random
   sequence over the lattice, frac(u0 + cx·a1 + cy·a2), and shows the category whose cumulative count holds key × n.
   neighbouring keys are evenly spread, so the share of cells showing each category tracks the dot shares frame by frame
   (a phone's 880 cells drawn independently were off by up to 5 points). u0 drifts one full turn per 24 s, so a mixed cell
   still moves through its real members, at scattered moments, never in step; reduced motion holds it still */
/* qf: the count quantile that makes a cell full (never hidden); ff: the share of it a cell needs to count as full; tol: how
   far over its dot share a category's share of drawn cells may stand before its sparsest cells are hidden (0.25 points).
   tests sweep them through __exhibit.atlas.strat; qf = 0 makes every cell full, which turns the thinning off */
const STR = { nK: null, li: null, bm: null, hq: null, qf: 0.75, ff: 1, tol: 0.0025, ms: 0, hidden: 0, r: null, ord: null, crg: null, cz: null, RC: new Int32Array(4096),
  D: new Float64Array(8), CC: new Int32Array(8), HB: new Uint32Array(4 * 8 * 64), SO: new Int32Array(4 * 8 * 64 + 1), PT: new Int32Array(32), PE: new Int32Array(32),
  Dz: new Float64Array(32), CCz: new Int32Array(32), Ndz: new Int32Array(4), Dtz: new Float64Array(4), zb: null, zkey: '', nz: 1 };
/* the zone of every bin (4096 of them) for the zone bounds a room set (P.glyphZones), rebuilt only when they change. a pitch
   grid's bin is its column + 2048, so a bound there counts in columns from the grid's origin (the calendar's months) */
function zoneTable(pitch) {
  const Z = GCFG.zones; if (!Z) return null;
  const key = Z.join(',') + (pitch ? 'p' : 'r'); if (STR.zkey === key) return STR.zb;
  const zb = STR.zb || (STR.zb = new Uint8Array(4096));
  for (let g = 0; g < 4096; g++) { const idx = pitch ? g - 2048 : g; let z = 0; for (let q = 0; q < Z.length; q++) if (idx >= Z[q]) z++; zb[g] = z; }
  STR.zkey = key; STR.nz = Z.length + 1; return zb;
}

/* how much of the bottom of the viewport the listening-post dock is using, 0 when it is closed.
   the wall text is lifted by the same amount in css, so in portrait the stage (which ends where the wall text
   begins) gets out of the way by itself; in landscape the wall text is bottom-left and the stage has to be told. */
let dockPx = 0;
/* atlas `hide` (html.atlas-hidden, toggled by the chrome): on, and upright, the top of the show chip the stage runs down to */
const HID = { on: false, bottom: 0 };

/* the part of the viewport rooms may draw into: leaves room for wall text at the bottom on phones */
export function stage() {
  if (ATLAS) return stageAtlas();
  const top = Math.max(64, H * 0.1);
  if (W > H * 1.15) { /* landscape: wall text lives bottom-left, the stage takes the right-hand side */
    const x = Math.max(W * 0.4, 430), w = W - x - Math.max(64, W * 0.06);
    return { x, y: top, w, h: H - top - Math.max(56, H * 0.09, dockPx) };
  }
  const padX = Math.max(16, W * 0.05); /* portrait: stage on top, text underneath. the stage ends where the active room's text begins */
  let h = H * 0.46; const sec = sections[Math.max(0, active)], wl = sec && sec.querySelector('.wall');
  /* the clearance is a ceiling, never a floor: a 568px phone gave the old H*0.26 floor priority and the stage
     bottom landed inside the wall text. 96 is only there so a room never gets a degenerate band to lay out in;
     the css cap on .wall under 600px of height keeps it from ever being the binding constraint. */
  if (wl && wl.offsetTop > 0) h = Math.min(h, wl.offsetTop - top - 16);
  return { x: padX, y: top, w: W - padX * 2, h: Math.max(96, h) };
}
/* atlas (§2.3): the chrome (M3) measures itself and writes ATL.insets; no layout is read here except the portrait
   fallback that runs until the chrome has written a bottom inset */
function stageAtlas(home) {
  const ins = ATL.insets || {};
  if (W > H * 1.15) {
    const top = Math.max(64, H * 0.1, ins.top || 0), right = Math.max(64, W * 0.06), h = H - top - Math.max(56, H * 0.09, dockPx);
    /* `hide` puts the info card and the wall text away: the field takes the width they held (the photo view).
       the camera keeps its pose across the relayout, so the object glides over to the new centre */
    if (HID.on) { const x = 48; return { x, y: top, w: W - x - (ins.right > 0 ? ins.right : right), h }; }
    /* R13: a phone on its side (659 wide) kept a 165 px stage behind the 430 floor and every room panel piled into it; under 720 the
       stage starts 30 px past the card column (chrome.css: left 6vw, width 40vw - 70) instead */
    const x = W < 720 ? Math.max(W * 0.4, W * 0.46 - 40) : Math.max(W * 0.4, 430);
    let w = W - x - right;
    /* the ladder's column (ladder.js publishes insets.right in the landscape strip, 0 elsewhere): the stage ends where it
       begins, never narrower than 320px. D3 holds only while that column fits in the margin this stage already leaves
       (W - x - w, 86 px at 1440): a wider strip moves every number on the stage (VERIFY r3 precision). ATL.stage0() is
       this rect without the ladder, the budget the strip has to fit */
    if (ins.right > 0 && !home) w = Math.max(Math.min(w, W - ins.right - x), Math.min(w, 320));
    return { x, y: top, w, h };
  }
  const padX = Math.max(16, W * 0.05);
  /* upright and hidden: the card and the wall are away, so the stage runs down to the show chip (measured once per toggle) */
  if (HID.on && HID.bottom > (ins.top || 0) + 96) { const top = Math.max(64, ins.top || 0); return { x: padX, y: top, w: W - padX * 2, h: HID.bottom - top - 12 }; }
  /* bottom > 0 means the chrome has measured its card; a genuinely compact card on a 320x568 phone is still the truth */
  if (ins.bottom > (ins.top || 0)) return { x: padX, y: ins.top || 0, w: W - padX * 2, h: Math.max(40, steadyBottom(ins.bottom) - (ins.top || 0) - 12) };
  const top = Math.max(64, H * 0.1, ins.top || 0);
  let h = H * 0.46; const sec = sections[Math.max(0, active)], wl = sec && sec.querySelector('.wall');
  if (wl && wl.offsetTop > 0) h = Math.min(h, wl.offsetTop - top - 16);
  return { x: padX, y: top, w: W - padX * 2, h: Math.max(96, h) };
}

/* upright, the card's top moves with every caption line, the caption emptying and the idle hint (2 to 48 px). the stage
   holds still through all of it: the card may grow into the 12 px the stage keeps clear under itself before the stage
   gives way (and then it follows at once), and the stage grows back only for a real change (the card folding away: 60 px
   or more), a new stop, or while a new stop's card is still settling (its first 1.2 s). so a room is not re-laid out, and
   its picture not shifted, for a line of text coming and going (R2_REQUESTS_R2 G and §5, R2_REQUESTS_R4 V8) */
const STEADY = { b: 0, room: -2, w: 0, h: 0, t: 0 };
function steadyBottom(b) {
  const now = performance.now();
  if (active !== STEADY.room || W !== STEADY.w || H !== STEADY.h) { STEADY.room = active; STEADY.w = W; STEADY.h = H; STEADY.t = now; STEADY.b = b; return b; }
  if (b < STEADY.b - 12 || b - STEADY.b >= 60 || now - STEADY.t < 1200) STEADY.b = b;
  return STEADY.b;
}
function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5);
  PW = Math.round(W * DPR); PH = Math.round(H * DPR);
  field.width = PW; field.height = PH; over.width = Math.round(W * (devicePixelRatio || 1)); over.height = Math.round(H * (devicePixelRatio || 1));
  ODPR = devicePixelRatio || 1; og.setTransform(ODPR, 0, 0, ODPR, 0, 0);
  img = fg.createImageData(PW, PH); buf32 = new Uint32Array(img.data.buffer);
  if (ATLAS) { const q = ODPR / DPR; field.style.imageRendering = q >= 2 && Math.abs(q - Math.round(q)) < 1e-6 ? 'pixelated' : ''; } /* binary glyph masks stay crisp on a 3x phone */
  if (gg) { glow.width = Math.max(2, (PW / GDIV) | 0); glow.height = Math.max(2, (PH / GDIV) | 0); if (GT) { GT.width = Math.max(2, (glow.width / 4) | 0); GT.height = Math.max(2, (glow.height / 4) | 0); } }
  if (ATLAS) { gfConfigure(); skyAtlas(); SKY.room = -1; }
  /* atlas: this re-enter must not re-home the camera; ATL.reenter tells the camera to re-apply its stored pose (§1.5) */
  if (ATLAS) ATL.reenter = true;
  if (active >= 0 && rooms[active] && rooms[active].mod && rooms[active].mod.enter) { if (ATLAS) { try { rooms[active].mod.enter(ctx); } catch (e) { console.warn(e); } } else rooms[active].mod.enter(ctx); }
  if (ATLAS) ATL.reenter = false;
  layMark();
  sigPlace();
  if (hintEl && hintEl.classList.contains('on')) { hintEl.classList.remove('on'); armHint(); } /* its spot was measured on the old layout */
}

/* the layout changed without the viewport changing (the dock opened or closed): let the room re-place itself */
let relayT = 0;
/* the stage the active room last laid itself out in, and the chrome's insets then. the chrome relayouts on every inset it
   writes; one whose only news is an inset the stage absorbed (steadyBottom holds the upright stage through a caption line)
   re-enters nothing. a relayout with the insets unchanged is someone else's (a setting, a room's own hud) and always runs */
const LAY = { s: '', i: '' };
const layKey = () => { const s = stageAtlas(); return Math.round(s.x) + ',' + Math.round(s.y) + ',' + Math.round(s.w) + ',' + Math.round(s.h); };
const insKey = () => { const i = ATL.insets || {}; return (i.top || 0) + ',' + (i.bottom || 0) + ',' + (i.left || 0) + ',' + (i.right || 0); };
function layMark() { if (ATLAS) { LAY.s = layKey(); LAY.i = insKey(); } }
function relayout() {
  if (ATLAS && tripOut()) { if (!relayT) relayT = setTimeout(() => { relayT = 0; relayout(); }, Math.max(0, ATL.trip.t + ATL.trip.dur * 500 - performance.now()) + 20); return; }
  if (ATLAS) { const sk = layKey(), ik = insKey(); if (sk === LAY.s && ik !== LAY.i) { LAY.i = ik; labelsRefresh(); sigPlace(); return; } LAY.s = sk; LAY.i = ik; }
  if (ATLAS) { ATL.reenter = true; SKY.room = -1; ATL.relayouts = (ATL.relayouts || 0) + 1; }
  if (active >= 0 && rooms[active] && rooms[active].mod && rooms[active].mod.enter) { try { rooms[active].mod.enter(ctx); } catch (e) {} }
  if (ATLAS) { ATL.reenter = false; labelsRefresh(); } /* the chrome moved: label keepouts follow it */
  sigPlace();
}
/* every re-place of the labels the shell asks for (a relayout, the field gathering) is followed, two frames on (the layer
   places on its next frame), by the active room's optional labelsPlaced(ctx): a room that fits its own labels onto today's
   text after the layer has placed them (make's key names, keyFix; the calendar's [ october 2023 ], fitBreak) reads them back
   there, so a name the re-place newly shows is fitted too, not left on the layer's first guess (R3_REQUESTS_INTEGRATION 1) */
function labelsRefresh() {
  try { FAC.labels.refresh(); } catch (e) { return; }
  const r = rooms[active];
  if (r && r.mod && typeof r.mod.labelsPlaced === 'function') requestAnimationFrame(() => requestAnimationFrame(() => { if (rooms[active] === r && r.mounted) { try { r.mod.labelsPlaced(ctx); } catch (e) { console.warn('labelsPlaced', e); } } }));
}
/* `hide` / `show`: the chrome toggles html.atlas-hidden and the stage changes size with it (stageAtlas), so the room
   re-lays itself out once per toggle. reads the class only; a class this relayout writes (atlas-cam-away) is not a toggle */
if (ATLAS) new MutationObserver(() => {
  const on = document.documentElement.classList.contains('atlas-hidden'); if (on === HID.on) return;
  HID.on = on; HID.bottom = 0; STEADY.room = -2;
  if (on) { const sh = document.getElementById('atlas-show'), r = sh ? sh.getBoundingClientRect() : null; HID.bottom = r && r.height ? r.top : 0; }
  relayout();
}).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
/* the renderer's cell size follows the detail setting (§6.1): css width per tier, desktop and phone ladders */
const CELLS = { desk: { ultra: 5, fine: 6, normal: 8, bold: 10 }, phone: { ultra: 6, fine: 7, normal: 9, bold: 11 } };
function gfConfigure() {
  let d = 'fine'; try { d = ctx.settings.get('detail') || 'fine'; } catch (e) {}
  const L = CELLS[lowPower ? 'phone' : 'desk'], cellCss = L[d] || L.fine;
  try { GF.configure({ W, H, PW, PH, DPR, lowPower, cellCss }); } catch (e) { console.warn('GF.configure', e); }
}

/* the sky (atlas): the void behind every stop is the face of a record. its marks sit on grooves, concentric arcs about a
   spindle off the stage's top-right corner, 2.2 cells apart. a groove holds lit runs of 12 to 28 marks (a hash per groove and run,
   so a run always or never holds marks), fewer toward the outer grooves, and every ninth groove is blank, the gap between two tracks.
   the marks are ∙ and ◦ and a rare mint ° (the ◦ raised), at 0.14 to 0.3 of full: under the field's 0.34 floor, so the dimmest play still
   outshines the brightest groove. it is decoration and must never read as data: never within two cells of a cell that holds
   plays, on a lit pixel or under text, and the threshold's wall label says what it is. the record turns slowly (a lap in about
   21 minutes) and a pan or an orbit turns it a little further; it holds still when motion is reduced, twinkle is off or the
   governor is at tier 4 */
const SKY = { on: ATLAS && !NOGLYPH, off: false, keep: [], at: null, key: '', gen: 0, fb: false, g: null, css: lowPower ? 7 : 6, x: 0, y: 0, mode: '', room: -1, ax: 0, ay: 0, ms: 0, n: 0, rot: 0, lt: 0 };
if (SKY.on) {
  try { SKY.fb = typeof GAM.probeReadback === 'function' ? !GAM.probeReadback() : true; } catch (e) { SKY.fb = true; }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { SKY.gen++; skyAtlas(); }).catch(() => {});
}
function skyAtlas() {
  if (!SKY.on || typeof GAM.buildAtlas !== 'function' || !DPR) return;
  const cw = Math.max(3, Math.round(SKY.css * DPR)), ch = Math.round(cw * 1.8), key = cw + 'x' + ch + ':' + SKY.gen;
  if (key === SKY.key) return;
  try { const at = GAM.buildAtlas(cw, ch, { fallback: SKY.fb }), g = ['∙', '◦'].map((c) => at.chars.indexOf(c)); if (g.some((k) => k < 1)) return; SKY.at = at; SKY.g = g; SKY.key = key; } catch (e) { SKY.at = null; }
}
/* where the sky stays dark: under every line of text (the active wall and room text, the info card, the hints), in device
   px, re-measured with the signature's corner (sigPlace: each stop change, relayout and every 900 ms). a stop whose own
   field is a sky of real data (the universe: its dust is artists) sets data-sky="0" and gets none */
function skyKeep() {
  const K = [], sec = rooms[active] && rooms[active].el;
  SKY.off = !sec || sec.dataset.sky === '0'; SKY.keep = K;
  if (SKY.off) return;
  const add = (el) => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H) K.push((r.left - 4) * DPR, (r.top - 4) * DPR, (r.right + 4) * DPR, (r.bottom + 4) * DPR); };
  const texts = (root) => { if (root) root.querySelectorAll('*').forEach((el) => { for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) { add(el); break; } }); };
  texts(sec.querySelector('.wall')); texts(sec.querySelector('.room-body')); texts(document.getElementById('atlas-info'));
  for (const id of ['atlas-onboard', 'hint']) { const el = document.getElementById(id); if (el) add(el); }
}
/* the sky's offset: 0.15 of how far the field moved since the last frame (pan: the stage centre's screen position; orbit:
   the sphere's rim speed times the yaw and pitch change). a new stop, a new camera mode or a relayout re-anchors it
   without a jump */
function skyStep() {
  const mode = VIEW.mode, st = stage(), R = 0.42 * Math.min(st.w, st.h);
  let ax = 0, ay = 0;
  if (mode === 'pan') { const m = VIEW.matrix(); ax = m[0] * (st.x + st.w / 2) + m[4]; ay = m[0] * (st.y + st.h / 2) + m[5]; }
  else if (mode === 'orbit' || mode === 'orbit3d') { ax = VIEW.yaw; ay = VIEW.pitch; }
  if (mode === SKY.mode && active === SKY.room) {
    if (mode === 'pan') { SKY.x += 0.15 * (ax - SKY.ax); SKY.y += 0.15 * (ay - SKY.ay); }
    else if (mode === 'orbit' || mode === 'orbit3d') { let dy = ax - SKY.ax; dy -= 6.283185307 * Math.round(dy / 6.283185307); SKY.x += 0.15 * R * dy; SKY.y -= 0.15 * R * (ay - SKY.ay); }
  }
  SKY.mode = mode; SKY.room = active; SKY.ax = ax; SKY.ay = ay;
}
function drawSky(buf, t, nIn, gx0, gy0, invCw, invCh, cols, rows) {
  const at = SKY.at, G = SKY.g; if (!at || SKY.off) { SKY.n = 0; return; }
  const t0 = DEBUG ? performance.now() : 0;
  skyStep();
  const cw = at.cw, ch = at.ch, pw = PW, ph = PH, ps = at.pxStart, pX = at.pxX, pY = at.pxY, hcw = cw >> 1, hch = ch >> 1;
  if (!reduced && ATL.gov.tier < 4 && settingOn('twinkle')) SKY.rot += 5e-6 * Math.min(100, Math.max(0, t - SKY.lt));
  SKY.lt = t;
  const KP = SKY.keep, nk = KP.length, gn = 255 * FLS.gain, cx = pw * 1.1, cy = -ph * 0.25, gap = 2.2 * ch, step = 1.6 * cw;
  const r0 = Math.hypot(pw * 0.1, ph * 0.25), r1 = Math.hypot(cx, ph - cy), off = SKY.rot + (SKY.x - SKY.y) * DPR / Math.hypot(cx - pw / 2, ph / 2 - cy);
  let n = 0;
  for (let j = Math.ceil(r0 / gap); j * gap <= r1; j++) {
    if (j % 9 === 0) continue;
    const r = j * gap, nb = Math.round(6.2832 * r / step), da = 6.2832 / nb, thr = ((0.46 - 0.3 * (r - r0) / (r1 - r0)) * 4294967296) >>> 0, dc = Math.cos(da), ds = Math.sin(da), rl = 12 + 8 * (Math.imul(j, 0x2c1b3c6d) >>> 30 & 3) % 24;
    /* the spindle is up and right of the stage, so a groove's visible arc lies in the second quadrant, where cos and sin both
       fall: each stage edge bounds its angle on one side (plus a cell either way) */
    const e = cw / r, ph1 = (ph - cy) / r, lo = Math.max(Math.acos(Math.max(-1, (pw - cx) / r)), ph1 < 1 ? 3.1416 - Math.asin(ph1) : 1.5708) - e - off, hi = Math.min(Math.acos(Math.max(-1, -cx / r)), 3.1416 - Math.asin(Math.min(1, -cy / r))) + e - off;
    let k = Math.floor(lo / da), k1 = Math.ceil(hi / da), c = Math.cos(k * da + off), sn = Math.sin(k * da + off), q = 0;
    for (; k <= k1; k++, q = c, c = c * dc - sn * ds, sn = sn * dc + q * ds) {
      const m = ((k % nb) + nb) % nb, run = (m / rl) | 0, pos = m - run * rl;
      let h = Math.imul(j * 0x9e3779b1 + run, 0x27d4eb2d); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 12;
      if ((h >>> 0) >= thr) continue;
      let h2 = Math.imul(h ^ (m + 0x3c6e), 0x165667b1); h2 ^= h2 >>> 15; h2 = Math.imul(h2, 0x846ca68b); h2 ^= h2 >>> 16;
      if ((h2 & 1023) < 150) continue;
      const x0 = Math.round(cx + r * c) - hcw, y0 = Math.round(cy + r * sn) - hch;
      if (x0 < 0 || y0 < 0 || x0 + cw > pw || y0 + ch > ph) continue;
      let hit = false; for (let p = 0; p < nk; p += 4) if (x0 + cw > KP[p] && x0 < KP[p + 2] && y0 + ch > KP[p + 1] && y0 < KP[p + 3]) { hit = true; break; }
      if (hit) continue;
      if (nIn) {
        const gx = ((x0 + hcw - gx0) * invCw) | 0, gy = ((y0 + hch - gy0) * invCh) | 0; let near2 = false;
        for (let rr = gy - 2; rr <= gy + 2 && !near2; rr++) { if (rr < 0 || rr >= rows) continue; const o = rr * cols; for (let cc = gx - 2; cc <= gx + 2; cc++) if (cc >= 0 && cc < cols && nIn[o + cc]) { near2 = true; break; } }
        if (near2) continue;
      }
      /* never on a lit pixel: the cell's corners, its middle and the top and foot of its middle column */
      const base = y0 * pw + x0, mc = base + hch * pw + hcw;
      if (buf[mc] !== BG || buf[base] !== BG || buf[base + (ch - 1) * pw + cw - 1] !== BG || buf[base + hcw] !== BG || buf[base + (ch - 1) * pw + hcw] !== BG) continue;
      /* a run is brightest in its middle, the way a groove catches the light: 0.14 at its ends to 0.3 */
      const v = (h2 >>> 10) & 1023, g = v < 4 ? 2 : v < 210 ? 1 : 0, b = 0.14 + 0.14 * Math.sin(3.1416 * (pos + 0.5) / rl) + 0.02 * ((h2 >>> 20) & 15) / 15;
      const z = b * gn / (g === 2 ? 0xf6 : 0xea), col = g === 2 ? 0xff000000 | (((0xbc * z) | 0) << 16) | (((0xf6 * z) | 0) << 8) | ((0x21 * z) | 0) : 0xff000000 | (((0xea * z) | 0) << 16) | (((0xd2 * z) | 0) << 8) | ((0xd8 * z) | 0), gi = G[g & 1], up = g === 2 ? base - ((ch * 0.3) | 0) * pw : base; /* the mint ° is the ◦ raised to the top of its cell */
      for (let p = ps[gi], e = ps[gi + 1]; p < e; p++) buf[up + pY[p] * pw + pX[p]] = col;
      n++;
    }
  }
  SKY.n = n;
  if (DEBUG) { const d = performance.now() - t0; SKY.ms = SKY.ms * 0.95 + d * 0.05; (SKY.hist || (SKY.hist = [])).push(d); if (SKY.hist.length > 600) SKY.hist.shift(); } /* ?atlasdebug=1: the sky's own cost per frame */
}

/* the field's bloom stands down where it is not wanted: the visitor's glow setting (`g`, settings), or a stop that draws its
   own bloom (data-glow="0": the universe's family-hued star bloom). a second screen-blended full-viewport layer there added
   nothing you can see (side by side, INTr2/glow_cmp_desk.jpg) and cost a desktop compositor a frame in three (p95 25 ms
   against 16.7 with it hidden). hidden, not removed, and cleared, so a photo composite never picks up a stale bloom */
let glowOff = false;
function glowState() {
  if (!gg) return;
  const sec = sections[active], off = (ATLAS && !!sec && sec.dataset.glow === '0') || !settingOn('glow');
  if (off === glowOff) return;
  glowOff = off; glow.style.visibility = off ? 'hidden' : '';
  if (off) { gg.globalCompositeOperation = 'source-over'; gg.clearRect(0, 0, glow.width, glow.height); }
}

function blend(a, b, k) { /* per-channel lerp of two ABGR ints */
  const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255, br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255;
  return 0xff000000 | ((ab + (bb - ab) * k) << 16) | ((ag + (bg - ag) * k) << 8) | (ar + (br - ar) * k);
}

/* the D2 pass for a categorical stop (below), in its own function: inside drawField it made the field loop's compiled code
   fragile in webkit, where the loop ran 3 to 4 times slower (4 -> 15 ms a frame) on any stop entered after a categorical one */
function stratPass(t, on, b, nK, lastI, BM, ma, me, dpr) {
  const nIn = b.nIn, occ = b.occ, pickK = b.pickK, pickC = b.pickC, accW = b.accW, cols = b.cols, gx0 = b.gx0, invCw = b.invCw, occLen = occ.length;
  const u0 = reduced ? 0 : (t / 24000) % 1, t0s = DEBUG ? performance.now() : 0;
  /* D2 counts cells, not dots. a sparse category (the clock's tapped rim, a bar's top row) sits in cells holding one or
     two dots, so drawing every occupied cell over-shows it (the clock read 27% of cells tapped for 19% of plays). this
     pass hides only what that costs: cells of a category whose share of the drawn cells stands more than tol over its
     share of the dots, sparsest first, until it is back within tol. every other category keeps every cell. never hidden:
     a cell holding at least the frame's 75th-percentile count (q), and the last drawn cell of a bin (an hour, a month:
     P.regionBy, or the pitch columns of a divide grid), so no bin that holds plays goes blank. (r2 thinned every
     category towards n / q: whole quiet hours and months vanished, and busy hours lost a fifth of their cells.)
     order: g / p, g the fixed interleaved-gradient dither the haze band uses and p = n / q, so a cell holding one dot
     goes long before one holding q - 1, and the choice holds still while the counts do. a flooded or sorted wall is all
     full cells, and one category alone on the field (the graveyard's pile) is not touched. a hidden cell keeps its count
     (nIn, which the ladder reads) and gives up only its weight, which the renderer draws as blank */
  const HQ = STR.hq || (STR.hq = new Uint32Array(256)); HQ.fill(0);
  for (let k = 0; k < on; k++) { const n = nIn[occ[k]]; HQ[n < 255 ? n : 255]++; }
  let q = 1; for (let b = 1, acc = 0, lim = on * STR.qf; b < 256; b++) { acc += HQ[b]; if (acc >= lim) { q = b; break; } }
  const NB = 64, rb = NB / q, qf = q * STR.ff;
  if (!STR.r || STR.r.length < occLen) { STR.r = new Float32Array(occLen); STR.ord = new Int32Array(occLen); STR.crg = new Uint16Array(occLen); STR.cz = new Uint8Array(occLen); }
  const RR = STR.r, ORD = STR.ord, CRG = STR.crg, CZ = STR.cz, RC = STR.RC, D = STR.D, CC = STR.CC, HB = STR.HB, SO = STR.SO, PT = STR.PT, PE = STR.PE, CI = P.c;
  const Dz = STR.Dz, CCz = STR.CCz, Ndz = STR.Ndz, Dtz = STR.Dtz;
  D.fill(0); CC.fill(0);
  /* a cell's bin: the room's (P.regionBy: the bin most of the cell's members share, voted in drawField's dot loop), else the
     pitch column of a divide grid, which glyphfield lays out so that pitch edges are cell edges (calendar months) */
  const gd = GCFG.grid, RG = GCFG.region ? P.rg : null, pitch = !RG && !!gd && gd.fit === 'divide' && !gd.ph && gd.pw > 0;
  const pwD = pitch ? gd.pw * ma * dpr : 1, oxD = pitch ? ((+gd.ox || 0) * ma + me) * dpr : 0, cwD = 1 / invCw, bins = !!RG || pitch;
  /* zones (P.glyphZones: the calendar's months before and after october 2023) each hold D2 on their own as well as the
     field as a whole: a sparse era's cells hold one or two dots, so its minority categories stood two or three points over
     their dots there while the whole field was within tolerance (VERIFY r2 precision: before the break, shuffle 25.0% of
     cells for 22.3% of dots) */
  const ZB = bins ? zoneTable(pitch) : null, NZ = ZB ? STR.nz : 1;
  Dz.fill(0); CCz.fill(0); Ndz.fill(0); Dtz.fill(0); HB.fill(0, 0, NZ * 512);
  if (bins) RC.fill(0);
  let Dt = 0;
  for (let k = 0; k < on; k++) {
    const ci = occ[k], o = ci << 3, cy = (ci / cols) | 0, cx = ci - cy * cols, w = u0 + cx * 0.7548776662466927 + cy * 0.5698402909980532;
    const n = nIn[ci], tgt = (w - Math.floor(w)) * n; let acc = 0, kc = 0;
    for (; kc < 7; kc++) { acc += nK[o + kc]; if (tgt < acc) break; }
    const li = lastI[o + kc];
    pickK[ci] = kc; pickC[ci] = CI[li];
    let z = 0;
    if (bins) { const g = RG ? BM[ci] >>> 16 : (Math.floor((gx0 + (cx + 0.5) * cwD - oxD) / pwD) + 2048) & 4095; CRG[k] = g; RC[g]++; if (ZB) z = ZB[g]; }
    CZ[k] = z; const zo = z << 3;
    for (let j = 0; j < 8; j++) { const v = nK[o + j]; D[j] += v; Dz[zo + j] += v; }
    Dt += n; Dtz[z] += n; CC[kc]++; CCz[zo + kc]++; Ndz[z]++;
    if (n >= qf) { RR[k] = -1; continue; }
    const d = cx * 0.06711056 + cy * 0.00583715, g0 = 52.9829189 * (d - Math.floor(d)), r = (g0 - Math.floor(g0)) * q / n;
    RR[k] = r; const bn = (r * rb) | 0; HB[((zo + kc) << 6) + (bn < NB ? bn : NB - 1)]++;
  }
  let nCat = 0, hidden = 0; for (let j = 0; j < 8; j++) if (D[j] > 0) nCat++;
  if (nCat > 1) {
    /* each (zone, category)'s candidates in one run, sparsest bucket first: a counting sort on (zone, category, bucket) */
    let s = 0; for (let zj = 0; zj < NZ * 8; zj++) { PT[zj] = s; for (let b = NB - 1; b >= 0; b--) { const key = (zj << 6) + b; SO[key] = s; s += HB[key]; } PE[zj] = s; }
    for (let k = 0; k < on; k++) { const r = RR[k]; if (r < 0) continue; const bn = (r * rb) | 0; ORD[SO[(((CZ[k] << 3) + (pickK[occ[k]] & 7)) << 6) + (bn < NB ? bn : NB - 1)]++] = k; }
    /* one cell at a time from whichever category stands furthest over its share; a candidate that is the last drawn cell
       of its bin is passed over for good (its bin only loses cells). zones first, each against its own dots; then the
       whole field, taking each cell from the zone where that category stands furthest over */
    let Nd = on; const tol = STR.tol;
    if (NZ > 1) for (let z = 0; z < NZ; z++) {
      const zo = z << 3; if (!Dtz[z]) continue;
      for (;;) {
        let worst = -1, wd = tol;
        for (let j = 0; j < 8; j++) { if (PT[zo + j] >= PE[zo + j]) continue; const dv = CCz[zo + j] / Ndz[z] - Dz[zo + j] / Dtz[z]; if (dv > wd) { wd = dv; worst = j; } }
        if (worst < 0) break;
        const k = ORD[PT[zo + worst]++], g = CRG[k];
        if (RC[g] <= 1) continue; RC[g]--;
        accW[occ[k]] = 0; CCz[zo + worst]--; Ndz[z]--; CC[worst]--; Nd--; hidden++;
      }
    }
    for (;;) {
      let worst = -1, wz = 0, wd = tol;
      for (let j = 0; j < 8; j++) {
        const dv = CC[j] / Nd - D[j] / Dt; if (dv <= wd) continue;
        let bz = -1, bd = -Infinity;
        for (let z = 0; z < NZ; z++) { const zj = (z << 3) + j; if (PT[zj] >= PE[zj]) continue; const e = NZ > 1 && Ndz[z] > 0 && Dtz[z] > 0 ? CCz[zj] / Ndz[z] - Dz[zj] / Dtz[z] : 0; if (e > bd) { bd = e; bz = z; } }
        if (bz < 0) continue;
        wd = dv; worst = j; wz = bz;
      }
      if (worst < 0) break;
      const zj = (wz << 3) + worst, k = ORD[PT[zj]++];
      if (bins) { const g = CRG[k]; if (RC[g] <= 1) continue; RC[g]--; }
      accW[occ[k]] = 0; CCz[zj]--; Ndz[wz]--; CC[worst]--; Nd--; hidden++;
    }
    /* what hiding cannot reach: a small field (a sideways phone's ribbon, 136 cells before the break) runs out of cells it
       may hide (the busy ones and each month's last), and a category stays under its share while another stays over.
       there a cell that holds members of both shows one of its own members of the one standing under instead: every cell
       still shows a real play it holds, none is lost, and the shares meet. zones first, then the field (taking only cells
       from zones where the swap does not push that zone further out) */
    let swaps = 0; const stride = on % 7919 ? 7919 : 7907;
    for (let pz = NZ > 1 ? 0 : NZ; pz <= NZ; pz++) {
      const inZ = pz < NZ, zo0 = pz << 3;
      if (inZ && !(Ndz[pz] > 0 && Dtz[pz] > 0)) continue;
      let pair = -1, from = 0; /* a run of swaps between the same two categories resumes its scan where the last one stopped */
      for (let guard = 0; guard < 96; guard++) {
        let io = -1, iv = tol, ju = -1, jv = -tol;
        for (let c = 0; c < 8; c++) {
          const dv = inZ ? CCz[zo0 + c] / Ndz[pz] - Dz[zo0 + c] / Dtz[pz] : CC[c] / Nd - D[c] / Dt;
          if (dv > iv) { iv = dv; io = c; } if (dv < jv) { jv = dv; ju = c; }
        }
        if (io < 0 || ju < 0) break;
        if ((io << 3) + ju !== pair) { pair = (io << 3) + ju; from = 0; }
        /* cells are visited in a scattered order (a prime stride through the occupied list), not the list's own order: that
           follows the dots' order, which on the calendar is time, and put every swap in the earliest months */
        let hit = -1;
        for (let t = from; t < on; t++) {
          const k = (t * stride) % on;
          const ci = occ[k]; if (pickK[ci] !== io || accW[ci] === 0 || nK[(ci << 3) + ju] === 0) continue;
          const z = CZ[k]; if (inZ ? z !== pz : NZ > 1 && (CCz[(z << 3) + io] / Ndz[z] < Dz[(z << 3) + io] / Dtz[z] || CCz[(z << 3) + ju] / Ndz[z] > Dz[(z << 3) + ju] / Dtz[z])) continue;
          hit = k; from = t + 1; break;
        }
        if (hit < 0) break;
        const ci = occ[hit], z = CZ[hit];
        pickK[ci] = ju; pickC[ci] = CI[lastI[(ci << 3) + ju]];
        CC[io]--; CC[ju]++; CCz[(z << 3) + io]--; CCz[(z << 3) + ju]++; swaps++;
      }
    }
    STR.swaps = swaps;
  }
  for (let k = 0; k < on; k++) { const o = occ[k] << 3; for (let j = 0; j < 8; j++) nK[o + j] = 0; } /* the counts start at 0 next frame */
  STR.hidden = hidden;
  if (DEBUG) STR.ms = STR.ms * 0.95 + (performance.now() - t0s) * 0.05; /* ?atlasdebug=1: this pass's cost, for the perf notes */
}
/* the field loop's inputs for one frame: one object, reused, filled by drawField and read into locals once per call */
const FL = { e: 0, j: 0, two: false, sw: 0, mor: false, FM: null, push: false, mx: 0, my: 0, R2: 0, pk: 0, pan: false, ma: 1, me: 0, mf: 0,
  ta: 0, tb: 0, spark: false, tick: 0, glyphOn: false, GM: P.glyph, WT: P.w, CAT: P.cat, accW: null, accR: null, accG: null, accB: null,
  pickC: null, pickK: null, nIn: null, occ: null, cwk: null, gx0: 0, gy0: 0, invCw: 0, invCh: 0, cols: 0, rows: 0, meanCol: false, strat: false,
  nK: null, lastI: null, RGa: null, BM: null, fe: 0, fx0: 0, fx1: 0, fy0: 0, fy1: 0, pw: 0, ph: 0, dpr: 1, cb: 0.12, snap: true };
/* every dot, once a frame: its move, its colour, and either its cell (the glyph field) or its pixel. dots i0..i1; `on` is how many
   cells are occupied so far, returned updated */
function fieldLoop(i0, i1, F, on) {
  const X = P.x, Y = P.y, TX = P.tx, TY = P.ty, C = P.c, TC = P.tc, SD = P.seed, FR = SFR, buf = buf32;
  const e = F.e, j = F.j, two = F.two, sw = F.sw, mor = F.mor, FM = F.FM, push = F.push, mx = F.mx, my = F.my, R2 = F.R2, pk = F.pk;
  const pan = F.pan, ma = F.ma, me = F.me, mf = F.mf, ta = F.ta, tb = F.tb, spark = F.spark, tick = F.tick, pw = F.pw, ph = F.ph, dpr = F.dpr;
  const glyphOn = F.glyphOn, GM = F.GM, WT = F.WT, CAT = F.CAT, accW = F.accW, accR = F.accR, accG = F.accG, accB = F.accB, pickC = F.pickC, pickK = F.pickK;
  const nIn = F.nIn, occ = F.occ, cwk = F.cwk, gx0 = F.gx0, gy0 = F.gy0, invCw = F.invCw, invCh = F.invCh, cols = F.cols, rows = F.rows;
  const meanCol = F.meanCol, strat = F.strat, nK = F.nK, lastI = F.lastI, RGa = F.RGa, BM = F.BM, fe = F.fe, fx0 = F.fx0, fx1 = F.fx1, fy0 = F.fy0, fy1 = F.fy1;
  const occLen = occ ? occ.length : 0, cb = F.cb, snap = F.snap;
  for (let i = i0; i < i1; i++) {
    const s = SD[i]; let x = X[i], y = Y[i];
    const dx = TX[i] - x, dy = TY[i] - y;
    /* every dot has its own pace and arcs in from one side, so a room change flows instead of sliding. during a stop
       change the trip's envelope caps the pace (morphStep): the dots cross over the length of the camera's trip */
    let ei = reduced ? e : e * (0.5 + s * 0.16); const si = s > 3.1416 ? sw : -sw;
    if (mor) { const f = FM[7 - ((s * 1.2732) | 0)]; if (f < ei) ei = f; }
    x += (dx - dy * si) * ei; y += (dy + dx * si) * ei;
    if (push) { const qx = x - mx, qy = y - my, d2 = qx * qx + qy * qy; if (d2 < R2 && d2 > 0.5) { const f = (1 - d2 / R2) * pk / Math.sqrt(d2); x += (qx - qy * 0.5) * f; y += (qy + qx * 0.5) * f; } }
    X[i] = x; Y[i] = y;
    let c = C[i];
    if (c !== TC[i]) c = C[i] = (snap && dx < 0.5 && dx > -0.5 && dy < 0.5 && dy > -0.5) ? TC[i] : blend(c, TC[i], cb);
    let fx = x + Math.sin(ta + s) * j, fy = y + Math.cos(tb + s * 1.7) * j;
    if (pan) { fx = fx * ma + me; fy = fy * ma + mf; }
    if (glyphOn && GM[i]) { /* §6.3: the dot joins its cell instead of lighting a pixel */
      const w = WT[i];
      if (w === 0) continue;
      /* feather (a room's `glyph.feather`, px): a haze the room keeps inside the stage (a weighted-down share, never a
         full-weight dot) thins out over the stage's last `fe` px, a fixed pick per dot (its seed), so it meets the sky
         around the stage in a soft band instead of a hard edge (VERIFY r2 beauty P2: the game's fog stopped on a line).
         it thins to a fifth at the edge, not to nothing: about the sky's own density (the sky keeps two cells clear of any
         cell holding plays, so a haze thinned to nothing left a dark moat between the two) */
      if (fe > 0 && w < 255) { const dd = Math.min(fx - fx0, fx1 - fx, fy - fy0, fy1 - fy); if (dd < fe) { const q = dd > 0 ? dd / fe : 0; if (s * 0.15915494 >= 0.2 + 0.8 * q * q * (3 - 2 * q)) continue; } }
      const pxf = fx * dpr, pyf = fy * dpr;
      if (pxf >= gx0 && pyf >= gy0) {
        const cx = ((pxf - gx0) * invCw) | 0, cy = ((pyf - gy0) * invCh) | 0;
        if (cx < cols && cy < rows) {
          const ci = cy * cols + cx, n = ++nIn[ci];
          if (n === 1 && on < occLen) occ[on++] = ci;
          accW[ci] += w;
          if (meanCol) { accR[ci] += (c & 255) * w; accG[ci] += ((c >> 8) & 255) * w; accB[ci] += ((c >> 16) & 255) * w; }
          else if (strat) {
            const o = (ci << 3) | (CAT[i] & 7); nK[o]++; lastI[o] = i;
            /* the cell's bin is the one most of its members share (a running majority vote over them), so it holds still from
               frame to frame; the bin of whichever member the cell shows drifted with the dither and let a quiet hour's only
               cell pass as its neighbour's on the frame it needed guarding (R2_REQUESTS_R1 #1) */
            if (RGa) { const g = RGa[i], v = BM[ci]; BM[ci] = n === 1 || (v & 0xffff) === 0 ? (g << 16) | 1 : (v >>> 16) === g ? v + 1 : v - 1; } /* bin << 16 | votes */
          }
          else { const u = FR[i] + cwk[ci]; if ((u < 1 ? u : u - 1) * n < 1) { pickC[ci] = c; pickK[ci] = CAT[i]; } }
        }
      }
      continue;
    }
    const px = (fx * dpr) | 0, py = (fy * dpr) | 0;
    if (px < 0 || py < 0 || px >= pw - 1 || py >= ph - 1) continue;
    const o = py * pw + px; if (spark && ((i + tick) & 255) === 0) c = 0xffffffff; /* hi-hats make a few dots glint */
    buf[o] = c;
    if (two) { buf[o + 1] = c; buf[o + pw] = c; buf[o + pw + 1] = c; }
  }
  return on;
}
/* webkit's JIT compiles fieldLoop from the first frames it sees, and a branch no stop so far had taken (the game's zero-weight
   fog, the clock's bins, a pan, a trip) then left the compiled loop on every frame of the next stop. each such exit recompiles
   it later than the last, so a tour's fourth or fifth stop ran the loop at its slow tier for about 50 s: the game 4 -> 17 ms a
   frame, the map and listeners 7 -> 28 ms on a desktop Safari (INTr2b/probe_wklong.mjs). so before the first real frame every
   branch is taken once, on 24 dots per case, and what that wrote is wiped. only on Apple's engine (every iOS browser, and
   Safari): V8 compiles the warmed loop more generally and the game's frame went 2.6 -> 4.8 ms in chromium for nothing */
let warmed = !ATLAS || !/Apple/.test(navigator.vendor || '');
function warmField(b) {
  warmed = true;
  const n = Math.min(N, 24), need = b.pickK.length * 8;
  if (!STR.nK || STR.nK.length < need) { STR.nK = new Uint32Array(need); STR.li = new Int32Array(need); STR.bm = new Int32Array(b.pickK.length); }
  const GMw = new Uint8Array(N), WTw = new Uint8Array(N), RGw = new Uint16Array(N);
  for (let i = 0; i < n * 6; i++) { GMw[i] = i % 5 === 4 ? 0 : 1; WTw[i] = [0, 40, 255, 120][i % 4]; RGw[i] = i % 3; }
  const F = Object.assign({}, FL, { e: 0.05, j: 0.3, two: true, sw: 0.4, FM: MORPH.FM, mx: 0, my: 0, R2: 1e12, pk: 9, ma: 1, me: 0, mf: 0, ta: 1, tb: 1, tick: 7,
    glyphOn: true, GM: GMw, WT: WTw, CAT: P.cat, accW: b.accW, accR: b.accR, accG: b.accG, accB: b.accB, pickC: b.pickC, pickK: b.pickK, nIn: b.nIn, occ: b.occ, cwk: b.cwk,
    gx0: b.gx0, gy0: b.gy0, invCw: b.invCw, invCh: b.invCh, cols: b.cols, rows: b.rows, nK: STR.nK, lastI: STR.li, BM: STR.bm, fx0: -1e6, fx1: 1e6, fy0: -1e6, fy1: 1e6, pw: PW, ph: PH, dpr: DPR });
  const cases = [
    { meanCol: true, strat: false, mor: true, push: true, pan: true, fe: 2e6, spark: true },
    { meanCol: false, strat: true, RGa: RGw, mor: false, push: false, pan: false, fe: 0 },
    { meanCol: false, strat: true, RGa: null, mor: true, push: false, pan: true, fe: 0 },
    { meanCol: false, strat: false, mor: false, push: true, pan: false, fe: 2e6 },
    { glyphOn: false, mor: true, push: true, pan: true, spark: true, two: true },
    { glyphOn: false, mor: false, push: false, pan: false, spark: false, two: false },
  ];
  /* the warm-up runs the real loop over dots 0..n*6, which moves and recolours them (a late warm under reduced motion left them ~10 px off for seconds, L4b); put them back */
  const m6 = n * 6, sx = P.x.slice(0, m6), sy = P.y.slice(0, m6), sc = P.c.slice(0, m6);
  let on = 0;
  cases.forEach((cs, k) => { on = fieldLoop(k * n, (k + 1) * n, Object.assign(F, cs), on); });
  P.x.set(sx); P.y.set(sy); P.c.set(sc);
  const occ = b.occ, nK = STR.nK;
  for (let k = 0; k < on; k++) { const ci = occ[k]; b.nIn[ci] = 0; b.accW[ci] = 0; b.accR[ci] = 0; b.accG[ci] = 0; b.accB[ci] = 0; b.pickC[ci] = 0; b.pickK[ci] = 0; STR.bm[ci] = 0; for (let q = 0; q < 8; q++) nK[(ci << 3) + q] = 0; }
  buf32.fill(BG);
}
/* R5 L5 · THE FIELD LISTENS. the bands the loop already reads for the field (the analyser on the mix, ctx.audio.bands) also
   light it: the low band breathes the field's luminance within +-6% of its running level, and onsets of the high band
   twinkle the [ ] halo of one shown name at a time. the breath is one uniform gain on every glyph's colour, taken inside the
   glyph pass (GF.render({gain}), a multiply per drawn cell, and the sky's stars): no share or glyph changes, only how bright
   they all are. a css filter or opacity on #field cost 8 to 16 ms a frame in the headless compositor, so it is not used.
   atlas only; off under reduced motion, forced colours, the twinkle setting off, a struggling governor (tier 4+), a
   categorical stop, and whenever sound is off or muted (no bands, no breath). it times itself over its first 120 live
   frames and stands down for the session if that p95 passes 0.3 ms. nothing is allocated a frame. test seams: .bands =
   {low, mid, high} stands in for the audio; .burn = ms of busy work inside the timed block */
const FL_MS = new Float32Array(120);
const FLS = { on: ATLAS && !NOGLYPH && !reduced, reason: !ATLAS ? 'atlas=0' : NOGLYPH ? 'glyph=0' : reduced ? 'reduced motion' : '',
  live: false, gain: 1, hook: false, bands: null, burn: 0, n: 0, p95: 0, mean: 0, twinkles: 0, seeded: false, nl: 0, lm: 0, ld: 0, hm: 0, hd: 0, twT: -1e9, twEl: null, labs: null, k: 0 };
let flFC = false;
if (FLS.on) {
  try { const mq = matchMedia('(forced-colors: active)'); flFC = mq.matches; mq.addEventListener('change', (e) => { flFC = e.matches; }); } catch (e) {}
  const st = document.createElement('style');
  st.textContent = '@keyframes fl-tw{0%{color:#86cbfe;text-shadow:0 0 7px rgba(134,203,254,.95),0 0 2px #86cbfe}100%{}}html.atlas .lab.obj.on.flt::before,html.atlas .lab.obj.on.flt::after{animation:fl-tw .5s ease-out}';
  document.head.appendChild(st);
}
function flOff(reason) { const S = FLS; S.on = false; S.live = false; S.reason = reason; S.gain = 1; if (S.twEl) { S.twEl.classList.remove('flt'); S.twEl = null; } }
function flTwinkle(t) {
  const S = FLS;
  if (!S.labs) { const L = document.getElementById('atlas-labels'); if (!L) return; S.labs = L.getElementsByClassName('obj'); }
  const L = S.labs, n = L.length; if (!n) return;
  for (let q = 0, k = (S.k + 5) % n; q < n; q++, k = k + 1 < n ? k + 1 : 0) {
    const el = L[k]; if (el === S.twEl || !el.classList.contains('on') || el.classList.contains('lock')) continue;
    if (S.twEl) S.twEl.classList.remove('flt');
    el.classList.add('flt'); S.twEl = el; S.twT = t; S.k = k; S.twinkles++; return;
  }
}
/* once a frame, before the glyph pass: sets FLS.gain (1 whenever the layer is not live) */
function fieldListen(t, bands) {
  const S = FLS, sb = S.bands;
  if (GCFG.mode === 'cat' || flFC || ATL.gov.tier >= 4 || !(sb || (A.on && !A.muted && A.an)) || !settingOn('twinkle')) {
    S.live = false;
    if (S.twEl) { S.twEl.classList.remove('flt'); S.twEl = null; }
    if (S.gain !== 1) { S.gain = GCFG.mode === 'cat' || flFC ? 1 : S.gain + (1 - S.gain) * 0.3; if (Math.abs(S.gain - 1) < 0.002) S.gain = 1; }
    return;
  }
  const t0 = performance.now(), b = sb || bands, lo = +b.low || 0, hi = +b.high || 0;
  S.live = true; S.hook = GF.gainHook === true;
  if (!S.seeded) { S.seeded = true; S.lm = lo; S.hm = hi; }
  S.lm += (lo - S.lm) * (S.nl < 100 ? 1 / ++S.nl : 0.01); S.ld += (Math.abs(lo - S.lm) - S.ld) * 0.02; /* a plain mean at first, so a bed fading in is not one long swell */
  let x = (lo - S.lm) / (2 * S.ld + 0.02); x = x < -1 ? -1 : x > 1 ? 1 : x;
  if (S.hook) S.gain += (1 + 0.06 * x - S.gain) * 0.3; /* no gain hook in the glyph pass yet: no breath (the sky alone breathing would not be uniform) */
  const dh = hi - S.hm; S.hm += dh * 0.02; S.hd += (Math.abs(dh) - S.hd) * 0.02;
  if (S.twEl && t - S.twT > 500) { S.twEl.classList.remove('flt'); S.twEl = null; }
  if (dh > 1.6 * S.hd + 0.015 && t - S.twT > 220) flTwinkle(t);
  if (S.burn > 0) { const e = t0 + S.burn; while (performance.now() < e); }
  if (S.n < 120) { FL_MS[S.n++] = performance.now() - t0; if (S.n === 120) { let sm = 0; for (let k = 0; k < 120; k++) sm += FL_MS[k]; S.mean = sm / 120; FL_MS.sort(); S.p95 = FL_MS[114]; if (S.p95 > 0.3) flOff('self-check: p95 ' + S.p95.toFixed(3) + ' ms > 0.3 ms'); } }
}
function drawField(t, bands) {
  buf32.fill(BG);
  const F = FL;
  F.e = P.ease; F.j = reduced ? 0 : P.jitter * (0.5 + bands.low * 2.2); F.two = DPR > 1 || P.big; F.pw = PW; F.ph = PH; F.dpr = DPR;
  /* a moving pointer parts the dots; a resting one lets them close again (a held press keeps them open) */
  const idle = PT.down ? 0 : performance.now() - (PT.last || 0), pk = idle < 500 ? 9 : idle > 1700 ? 0 : 9 * (1 - (idle - 500) / 1200);
  /* atlas: the pan camera and the glyph accumulator, every input handed to fieldLoop (which reads no other property).
     at ?atlas=0 pan and glyphOn stay false and the loop is today's */
  let pan = false, ma = 1, me = 0, mf = 0, mx = PT.x, my = PT.y, R = PT.down ? 130 : 84, dragging = false;
  let glyphOn = false, nIn = null, gx0 = 0, gy0 = 0, invCw = 0, invCh = 0, cols = 0, rows = 0, strat = false, gb = null;
  F.glyphOn = false; F.meanCol = false; F.strat = false; F.RGa = null; F.fe = 0;
  if (ATLAS) {
    dragging = !!GEST.dragging;
    if (VIEW.mode === 'pan') { const m = VIEW.matrix(); ma = m[0]; me = m[4]; mf = m[5]; pan = ma !== 1 || me !== 0 || mf !== 0; if (pan) { mx = (PT.x - me) / ma; my = (PT.y - mf) / ma; R = R / ma; } }
    if (!NOGLYPH && !GF.stub) {
      GF.begin(t, ma, me, mf, reduced || P.ease === 0); const b = GF.buffers();
      if (b && b.cols) {
        if (!warmed) warmField(b);
        gb = b; glyphOn = true; nIn = b.nIn;
        gx0 = b.gx0; gy0 = b.gy0; invCw = b.invCw; invCh = b.invCh; cols = b.cols; rows = b.rows;
        F.glyphOn = true; F.GM = P.glyph; F.WT = P.w; F.CAT = P.cat;
        F.accW = b.accW; F.accR = b.accR; F.accG = b.accG; F.accB = b.accB; F.pickC = b.pickC; F.pickK = b.pickK; F.nIn = nIn; F.occ = b.occ; F.cwk = b.cwk;
        F.gx0 = gx0; F.gy0 = gy0; F.invCw = invCw; F.invCh = invCh; F.cols = cols; F.rows = rows; F.meanCol = !!b.meanCol;
        strat = F.strat = !F.meanCol && GCFG.mode === 'cat';
        if (strat) {
          const need = b.pickK.length * 8; if (!STR.nK || STR.nK.length < need) { STR.nK = new Uint32Array(need); STR.li = new Int32Array(need); STR.bm = new Int32Array(b.pickK.length); }
          F.nK = STR.nK; F.lastI = STR.li;
          if (GCFG.region) { F.RGa = P.rg; F.BM = STR.bm; }
        }
        if (GCFG.feather > 0) { const st = stageAtlas(); F.fe = Math.min(GCFG.feather, 0.15 * Math.min(st.w, st.h)); F.fx0 = st.x; F.fx1 = st.x + st.w; F.fy0 = st.y; F.fy1 = st.y + st.h; } /* a phone's stage keeps most of its haze: the band is at most 15% of its short side */
      }
    }
  }
  F.sw = reduced ? 0 : P.swirl; F.push = PT.on && P.touch && !reduced && pk > 0 && !dragging; F.R2 = R * R; F.pk = pk; F.mx = mx; F.my = my;
  F.pan = pan; F.ma = ma; F.me = me; F.mf = mf;
  F.spark = !reduced && bands.high > 0.16; F.tick = (((t * 0.06) | 0) * 7919) | 0; F.ta = t * 0.0011; F.tb = t * 0.0013;
  const FM = morphStep(t); F.mor = FM !== null; if (FM) F.FM = FM;
  /* R6: a stop that hands its colours on (threshold.hueTrip) fades them on the trip's envelope (group 0, done at 72%), not in
     the first 20 frames, and a dot its next room places outright (the sky) does not snap to its new colour */
  const hk = ATLAS && FM && MORPH.hk; F.cb = hk ? FM[0] : 0.12; F.snap = !hk;
  const on = fieldLoop(0, N, F, 0);
  if (FLS.on) fieldListen(t, bands);
  if (strat && on) stratPass(t, on, gb, F.nK, F.lastI, F.BM, ma, me, DPR);
  else STR.hidden = 0;
  if (SKY.at) drawSky(buf32, t, glyphOn ? nIn : null, gx0, gy0, invCw, invCh, cols, rows); /* after the dots, so it knows where they are; the glyphs land over it */
  if (glyphOn) { try { GF.render(buf32, PW, PH, t, { reduced, twinkle: !reduced && ATL.gov.tier < 4 && settingOn('twinkle') && roomGlyph().twinkle !== false, edges: ATL.gov.tier < 4, occN: on, lines: LINES, gain: FLS.gain }); } catch (e) { if (!drawField.warned) { drawField.warned = 1; console.warn('GF.render', e); } } }
  fg.putImageData(img, 0, 0);
  if (gg && !glowOff) { glow.style.opacity = (0.72 + Math.min(0.28, bands.mid * 0.9)).toFixed(3); gg.globalCompositeOperation = 'copy'; if (canvasBlur) gg.filter = 'blur(2px)'; gg.drawImage(field, 0, 0, glow.width, glow.height); if (canvasBlur) gg.filter = 'none'; gg.globalCompositeOperation = 'difference'; gg.fillStyle = '#0a0118'; gg.fillRect(0, 0, glow.width, glow.height); if (GT) { gt.globalCompositeOperation = 'copy'; gt.drawImage(glow, 0, 0, GT.width, GT.height); gg.globalCompositeOperation = 'lighter'; gg.globalAlpha = cols > 0 ? 0.2 + 0.55 * Math.max(0, 1 - 2.2 * on / (cols * rows)) : 0.7; gg.drawImage(GT, 0, 0, glow.width, glow.height); gg.globalAlpha = 1; } /* take the background back out, so only the dots bloom */ }
}

/* ------------------------------------------------------------------ audio */
/* sound is ON only while the AudioContext is actually running (K5). unlock() may be called from any gesture, any number of
   times: it builds the graph once, asks the context to resume, and starts each deck's <audio> once inside a gesture (ios
   lets an element play outside a tap only after it has played inside one). a gesture without user activation (a touch
   pointerdown: activation comes with the touch's pointerup/touchend) leaves the context suspended, and the next gesture
   tries again; the beds start the moment the context reports running (settle) */
const A = {
  ac: null, gain: null, an: null, els: [], srcs: [], g: [], cur: -1, want: null, on: false, muted: false, fft: null, primed: [false, false], away: false,
  /* R10 the arbiter: one owner of the speakers. 'off' = the bed; 'armed' = a clip was asked for and its player is ready
     (the bed waits at -24 dB); 'hot' = the clip is playing or starting (the bed is silent, its decks pause, no interface
     tone sounds). post.js sets it; only post.js ends 'hot' (a paused report, a failure, the dock closing) */
  clipState: 'off', hotT: 0, keyHold: 0, keyT: 0,
  get ducked() { return this.clipState !== 'off'; },
  unlock() {
    if (this.ac) { this.resume(); this.prime(); this.settle(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC(); this.resume(); this.gain = this.ac.createGain(); this.an = this.ac.createAnalyser();
    this.an.fftSize = 512; this.an.smoothingTimeConstant = 0.82; this.fft = new Uint8Array(this.an.frequencyBinCount);
    this.lp = this.ac.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.4;
    /* everything leaves through one limiter. interface tones have their own bus, which ducks under a listening post too */
    this.lim = this.ac.createDynamicsCompressor(); this.lim.threshold.value = -6; this.lim.knee.value = 4; this.lim.ratio.value = 12; this.lim.attack.value = 0.003; this.lim.release.value = 0.2;
    this.sfx = this.ac.createGain(); this.sfx.gain.value = 1;
    /* R10: unpitched sound (the flight's whoosh) has its own bus: it is held under a clip but not through a change of key */
    this.nfx = this.ac.createGain(); this.nfx.gain.value = 1;
    this.gain.connect(this.lp); this.lp.connect(this.an); this.sfx.connect(this.an); this.nfx.connect(this.an); this.an.connect(this.lim); this.lim.connect(this.ac.destination);
    this.ac.addEventListener('statechange', () => this.settle());
    for (let k = 0; k < 2; k++) {
      const el = new Audio(); el.preload = 'auto'; el.loop = true;
      const src = this.ac.createMediaElementSource(el), g = this.ac.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(this.gain); this.els.push(el); this.srcs.push(src); this.g.push(g);
    }
    this.prime(); this.settle();
  },
  resume() { const ac = this.ac; if (!ac || ac.state === 'running' || ac.state === 'closed') return; try { const p = ac.resume(); if (p && p.then) p.then(() => this.settle(), () => {}); } catch (e) {} },
  /* each deck is started (silent: its gain is 0) and paused inside a gesture, once that works; a deck already carrying a bed is left alone */
  prime() {
    for (let k = 0; k < 2; k++) {
      if (this.primed[k]) continue;
      const el = this.els[k]; if (!el || this.cur === k) continue;
      try {
        if (!el.src) el.src = 'audio/bed/' + (this.want || 'hitting-the-infinite-derivative') + '.mp3';
        const g = this.gen[k], pr = el.play();
        if (pr && pr.then) pr.then(() => { this.primed[k] = true; if (this.cur !== k && this.gen[k] === g) el.pause(); }).catch(() => {}); else this.primed[k] = true;
      } catch (e) {}
    }
  },
  /* the context's state decides: running = on (the beds start); stopped while the tab is visible = off again until the
     next gesture (an ios interruption); stopped while hidden is the shell's own suspend and changes nothing */
  settle() {
    const run = !!this.ac && this.ac.state === 'running';
    if (run && !this.on) { this.on = true; this.level(); if (this.wantDistant) this.distant(this.wantDistant); if (this.want) this.play(this.want, this.wantXf); loadMeta(); }
    else if (!run && this.on && !this.away) this.on = false;
    if (run) this.rearm();
    audioChanged();
  },
  /* K5: 'off' (nothing tried yet) | 'arming' (a gesture asked, the context is not running yet) | 'on' | 'muted' */
  state() { const s = this.muted ? 'muted' : this.on ? 'on' : this.ac ? 'arming' : 'off'; return audHold && audLast ? audLast : s; },
  onChange(fn) { return sub(AUDFNS, fn); },
  /* master level. a listening post ducks the bed to -24 dB over 0.3 s (in the next room, not gone) and lets it back
     over 1.5 s; both ramps are linear in dB, so neither end is heard as a step */
  level() {
    if (!this.gain) return;
    const hot = this.clipState === 'hot', t = this.ac.currentTime, gp = this.gain.gain, want = this.muted || hot ? 0 : this.clipState === 'armed' ? BED * DUCK : BED, v = gp.value;
    gp.cancelScheduledValues(t); gp.setValueAtTime(v, t);
    /* R10: a clip owns the speakers outright: the bed goes to a true zero in 250 ms (-24 dB was still audible under a quiet
       clip), and back from zero it rises on the equal-power curve over 1.5 s */
    if (hot) gp.linearRampToValueAtTime(0, t + 0.25);
    else if (!this.muted && v <= 1e-4 && this.wasHot) curve(gp, t + 0.01, 1.5, true, want);
    else if (!this.muted && v > 1e-4 && Math.abs(v - want) > 1e-4) gp.exponentialRampToValueAtTime(want, t + (want < v ? 0.3 : 1.5));
    else gp.setTargetAtTime(want, t, 0.25);
    this.wasHot = false;
    this.buses();
  },
  /* the tone bus: silent when muted, under a playing clip, and while two beds in different keys overlap (a tone snapped to
     the incoming key would rub against the outgoing one); quiet under an armed clip. the noise bus only minds the clip */
  buses() {
    if (!this.sfx) return;
    const t = this.ac.currentTime, hot = this.clipState === 'hot', hold = t < this.keyHold - 0.02;
    this.sfx.gain.setTargetAtTime(this.muted || hot || hold ? 0 : this.clipState === 'armed' ? 0.2 : 1, t, hot || hold ? 0.03 : 0.1);
    this.nfx.gain.setTargetAtTime(this.muted || hot ? 0 : 1, t, 0.05);
  },
  holdKeys(sec) {
    if (!this.ac) return;
    this.keyHold = Math.max(this.keyHold, this.ac.currentTime + sec); this.buses();
    clearTimeout(this.keyT); this.keyT = setTimeout(() => this.buses(), (this.keyHold - this.ac.currentTime) * 1000 + 40);
  },
  /* R10: 'off' | 'armed' | 'hot'. hot pauses both decks once the bed has reached zero; leaving it starts the current deck
     again where it stopped and lets the bed rise */
  clip(st) {
    st = st === 'hot' || st === 'armed' ? st : 'off';
    if (st === this.clipState) return;
    const was = this.clipState; this.clipState = st; clearTimeout(this.hotT);
    if (st === 'hot') this.hotT = setTimeout(() => { if (this.clipState === 'hot') this.els.forEach((e, k) => { if (!e.paused) { this.keep(k); e.pause(); } }); }, 320);
    else if (was === 'hot') { this.wasHot = true; this.rearm(); }
    this.level(); audioChanged();
  },
  /* a phone pauses <audio> when the tab goes to the background and does not start it again by itself. never under a clip */
  rearm() { if (this.cur >= 0 && !this.muted && this.clipState !== 'hot' && this.els[this.cur].paused) this.els[this.cur].play().catch(() => {}); },
  /* where each bed was when its deck let go of it, so a return picks it up there (R10) */
  keep(k) { const e = this.els[k]; if (e && e.dataset.t && e.currentTime > 0) LAST[e.dataset.t] = { pos: e.currentTime, at: performance.now() }; },
  /* gen[k] goes up every time deck k is handed a new track, so a timer or event from an older request can tell it lost */
  gen: [0, 0], reqT: -1e9, coT: 0,
  /* xf (make.js passes it: 0.6 same key, 0.9 near, 1.8 far) sets the kind of change; a room change passes none and the
     kind comes from the keys of the bed sounding now and the one asked for (bedRel) */
  play(track, xf) {
    this.want = track; this.wantXf = xf; if (!this.on || !track) return;
    if (this.cur >= 0 && this.els[this.cur].dataset.t === track) return;
    const now = performance.now(), busy = now - this.reqT < 350 || this.coT; this.reqT = now;
    /* a burst of room changes (held keys, a dot, a kiosk handover) starts only the bed it ends on */
    if (busy) { clearTimeout(this.coT); this.coT = setTimeout(() => { this.coT = 0; this.commit(this.want, this.wantXf); }, 350); return; }
    return this.commit(track, xf) || fadeLen(xf || 0.9);
  },
  commit(track, xf) {
    if (!track || (this.cur >= 0 && this.els[this.cur].dataset.t === track)) return;
    const from = this.cur >= 0 ? this.els[this.cur].dataset.t : '', rel = !from ? 'first' : xf > 0 ? (xf <= 0.6 ? 'same' : xf <= 0.9 ? 'near' : 'far') : bedRel(from, track);
    const T = shape(rel, from, track);
    /* R10: a deck that still holds this bed (a quick way back) turns round where it is: no reload, no restart from 0 */
    let nx = this.els.findIndex((e) => e.dataset.t === track), old = -1;
    const kept = nx >= 0;
    if (!kept) { nx = 0; if (this.cur >= 0) { const a = this.cur, b = 1 - a; nx = this.g[a].gain.value < this.g[b].gain.value ? a : b; } }
    if (this.cur >= 0) old = 1 - nx;
    const el = this.els[nx], g = this.g[nx].gain, gen = ++this.gen[nx], t = this.ac.currentTime;
    if (!kept) this.keep(nx); /* the bed this deck is giving up, before it is renamed */
    let loaded = false;
    if (old >= 0) hold(this.g[old].gain, t);
    /* the two beds' keys differ: interface tones wait until the outgoing one is gone */
    if (T.hold > 0) this.holdKeys(T.hold);
    /* under a playing clip nothing is heard, so the change is made at once and silently: the new bed waits, paused, at
       full deck level for the clip to end */
    if (this.clipState === 'hot') {
      if (old >= 0) { this.keep(old); const og = this.g[old].gain; og.cancelScheduledValues(t); og.setValueAtTime(0, t); this.els[old].pause(); }
      if (!kept) this.load(el, track); else el.pause();
      g.cancelScheduledValues(t); g.setValueAtTime(1, t); el.dataset.t = track; this.cur = nx;
      return T.total;
    }
    /* the deck being reused may still be sounding: swapping its src while audible is a click, so take it to silence
       first, no steeper than 0.0125 of full level per 10 ms */
    const hv = g.value, loud = !kept && hv > 0.001, out = loud ? Math.max(0.04, hv * 0.8) : 0;
    if (!kept) { g.cancelScheduledValues(t); g.setValueAtTime(loud ? hv : 0, t); if (loud) g.linearRampToValueAtTime(0, t + out); }
    el.dataset.t = track; this.cur = nx;
    /* far keys: the outgoing bed leaves now, over about a bar, and the new one waits through a beat of silence */
    if (rel === 'far' && old >= 0) { curve(this.g[old].gain, t + 0.01, T.out, false); this.park(old, this.gen[old], T.out * 1000 + 250); }
    const start = () => {
      if (this.gen[nx] !== gen) return;
      let fb = 0, done = false;
      /* the fade waits for sound: a bed can take 200-650 ms to arrive, and a ramp started at play() would have it enter half-loud */
      const fade = () => {
        if (done) return; done = true; clearTimeout(fb); el.removeEventListener('playing', fade);
        if (this.gen[nx] !== gen || this.cur !== nx) return;
        /* equal power: in = sin, out = cos over the same span, so the two beds sum to constant loudness with no dip in
           the middle, and the outgoing one ends at exactly zero before it is paused. a two-step change staggers them */
        const t2 = this.ac.currentTime + 0.01;
        curve(g, t2 + T.delay, T.inL, true);
        if (old >= 0 && rel !== 'far') { curve(this.g[old].gain, t2, T.out, false); this.park(old, this.gen[old], T.out * 1000 + 250); }
      };
      if (!kept && !loaded) this.load(el, track);
      /* a kept deck that is still running has nothing to wait for */
      if (kept && !el.paused) { fade(); return; }
      el.addEventListener('playing', fade); fb = setTimeout(fade, 1500);
      if (this.clipState === 'hot') { done = true; clearTimeout(fb); el.removeEventListener('playing', fade); g.cancelScheduledValues(this.ac.currentTime); g.setValueAtTime(1, this.ac.currentTime); return; }
      el.play().catch(() => { const again = () => { removeEventListener('pointerdown', again); if (this.cur === nx && this.gen[nx] === gen && this.clipState !== 'hot') el.play().catch(() => {}); }; addEventListener('pointerdown', again, { once: true }); });
    };
    /* far: the new bed is loaded now (so it is ready) and started after the outgoing bar and the beat of silence */
    if (rel === 'far' && old >= 0) { if (!kept && !loud) { this.load(el, track); loaded = true; } setTimeout(() => { if (this.gen[nx] === gen) start(); }, (T.out + T.gap) * 1000); }
    else if (loud) setTimeout(start, out * 1000 + 30); else start();
    return T.total;
  },
  /* hand a deck a bed, at the place it last left off (within ten minutes) or at its mix-in point, on its own beat grid */
  load(el, track) {
    const want = 'audio/bed/' + track + '.mp3';
    const fresh = !el.src || el.src.indexOf(want) < 0;
    if (fresh) el.src = want;
    const pos = resumeAt(track), seek = () => { try { if (Math.abs(el.currentTime - pos) > 0.05) el.currentTime = pos; } catch (e) {} };
    /* a new src still reports the old file's readyState until its own metadata arrives, so a seek now would land on the
       old file and be lost: a fresh load seeks on its metadata */
    if (fresh || el.readyState < 1) el.addEventListener('loadedmetadata', seek, { once: true }); else seek();
  },
  /* pause a deck once it is silent, and only if nobody has handed it a new track since */
  park(k, gen, ms) {
    setTimeout(() => {
      if (this.gen[k] !== gen || this.cur === k) return;
      if (this.g[k].gain.value > 0.001) { this.park(k, gen, 300); return; }
      this.keep(k); this.els[k].pause();
    }, ms);
  },
  mute(m) { this.muted = m; this.level(); audioChanged(); },
  /* interface tones: D minor pentatonic, quiet, skipped when muted. step 0 = D4, five steps an octave.
     each tone is moved to the nearest one that is also in the key of the bed that is playing (see inKey below) */
  note(step, o = {}) {
    if (!this.ac || this.muted || !this.on || this.clipState === 'hot') return;
    const SC = [0, 3, 5, 7, 10], oct = Math.floor(step / 5), semi = snap(SC[((step % 5) + 5) % 5] + 12 * oct, this.bedKey());
    const t = this.ac.currentTime + (o.at || 0), osc = this.ac.createOscillator(), g = this.ac.createGain(), dur = o.dur || 0.5;
    osc.type = o.type || 'sine'; osc.frequency.value = 293.66 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol || 0.05, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.sfx); osc.start(t); osc.stop(t + dur + 0.05);
  },
  /* the pitch classes interface tones may use over the bed that is playing now (0 = C) */
  pitches() { return inKey(this.bedKey()); },
  bedKey() { return this.cur >= 0 && KEYS ? KEYS[this.els[this.cur].dataset.t] || null : null; },
  /* the embed repeats its state several times a second: only a change restarts the ramp, so a return is never stretched */
  duck(d) { if (d) { if (this.clipState === 'off') this.clip('armed'); } else if (this.clipState === 'armed') this.clip('off'); },
  /* 0 = open, 1 = distant (the graveyard plays its track from the next room over) */
  distant(k) { if (!this.lp) { this.wantDistant = k; return; } this.lp.frequency.setTargetAtTime(k > 0 ? 20000 * Math.pow(0.03, k) : 20000, this.ac.currentTime, 0.5); },
  bands() {
    if (!this.an || this.muted || reduced) return ZERO;
    this.an.getByteFrequencyData(this.fft); const f = this.fft; let lo = 0, mi = 0, hi = 0;
    for (let i = 1; i < 8; i++) lo += f[i]; for (let i = 8; i < 48; i++) mi += f[i]; for (let i = 48; i < 160; i++) hi += f[i];
    B.low += ((lo / (7 * 255)) - B.low) * 0.35; B.mid += ((mi / (40 * 255)) - B.mid) * 0.35; B.high += ((hi / (112 * 255)) - B.high) * 0.35; return B;
  },
};
/* atlas: a flight's sound. filtered noise swelling and falling over the flight's length on the interface bus, so it has no
   pitch at all (the D minor pentatonic rule is about pitched tones). silent when muted, before audio is armed, and under
   reduced motion (a flight is a jump there) */
let NOISE = null;
A.whoosh = function (sec) {
  if (!this.ac || this.muted || !this.on || reduced || REC.on || !(sec > 0) || this.clipState === 'hot') return;
  const ac = this.ac, d = clamp(sec, 0.3, 6), t = ac.currentTime + 0.01;
  if (!NOISE) { const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1; NOISE = b; }
  const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = NOISE; src.loop = true; bp.type = 'bandpass'; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(320, t); bp.frequency.exponentialRampToValueAtTime(1400, t + d * 0.45); bp.frequency.exponentialRampToValueAtTime(420, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + d * 0.45); g.gain.linearRampToValueAtTime(0, t + d);
  src.connect(bp); bp.connect(g); g.connect(this.nfx || this.sfx); src.start(t); src.stop(t + d + 0.05);
};
/* R5 L1: the one hover voice (atlas/voice.js, about 6 KB) arrives on the first pointer move, key or touch. a tick asked
   for before it lands plays when it lands (only the newest one). API: R5/L1/API.md */
let VOICE = null, voiceP = null, voiceQ = null;
function loadVoice() {
  if (!voiceP) voiceP = importRetry('./atlas/voice.js' + V).then((m) => {
    VOICE = m.install(A, { ctx, reduced, room: () => (active >= 0 && rooms[active] ? rooms[active].mod : null) });
    if (voiceQ) { const q = voiceQ; voiceQ = null; VOICE.tick(q[0], q[1]); }
    return VOICE;
  }).catch((e) => { voiceP = null; console.warn('voice', e); });
  return voiceP;
}
A.tick = function (target, o) {
  if (target != null && this.clipState === 'hot') return undefined;
  if (VOICE) return VOICE.tick(target, o);
  voiceQ = target == null ? null : [target, o]; loadVoice(); return undefined;
};
/* R7D M7: a stop's own note (atlas/voice.js cue); loads the voice if a visitor reaches a stop before touching anything */
A.cue = function (k, n, end) {
  if (!this.ac || this.muted || !this.on || this.clipState === 'hot') return;
  if (VOICE) { try { VOICE.cue(k, n, end); } catch (e) {} return; }
  loadVoice(); const q = [k, n, end]; voiceP && voiceP.then((v) => { if (v && v.cue) { try { v.cue(q[0], q[1], q[2]); } catch (e) {} } });
};
['pointermove', 'keydown', 'touchstart'].forEach((t) => { const f = () => { removeEventListener(t, f, true); loadVoice(); }; addEventListener(t, f, { capture: true, passive: true }); });
/* the bed's grid: bpm and first downbeat from audio/bed_meta.json (fetched on the first sound-on), phase from the deck */
let META = null, metaP = null;
function loadMeta() { if (!metaP) metaP = fetch('audio/bed_meta.json').then((r) => r.json()).then((m) => { META = m; }).catch(() => { metaP = null; }); return metaP; }
A.beat = function (div = 1) {
  if (!this.ac || !this.on || this.cur < 0) return null;
  if (!META) { loadMeta(); return null; }
  const el = this.els[this.cur], m = META[el.dataset.t + '.mp3']; if (!m || !(m.bpm > 0)) return null;
  const len = 60 / m.bpm / (div > 0 ? div : 1), u = (el.currentTime - m.b0) / len, ph = u - Math.floor(u), now = this.ac.currentTime;
  return { bpm: m.bpm, b0: m.b0, len, now, next: now + (1 - ph) * len, phase: ph, bar: 4 };
};
/* a short buzz on android only (ios has no vibrate); never while muted */
const CAN_BUZZ = typeof navigator.vibrate === 'function' && /Android/i.test(navigator.userAgent || '');
function buzz(ms) { if (!CAN_BUZZ || A.muted) return false; try { return navigator.vibrate(clamp(Math.round(+ms || 0), 1, 80)); } catch (e) { return false; } }
/* K5's signal: ctx.audio.onChange(fn) and the document event `atlas:audio` ({detail: {state}}) on every change of
   A.state(); `atlas:sound` once, the first time sound is really on (the round-1 contract the chrome still keys on) */
const AUDFNS = []; let audLast = 'off', audSaid = false, audHold = false, audPend = false, audHoldT = 0; /* 'off': what a page starts as, so a held press reads it too */
function audioChanged() {
  if (audHold) { audPend = true; return; }
  const s = A.state(); if (s === audLast) return; audLast = s;
  AUDFNS.slice().forEach((f) => { try { f(s); } catch (e) {} });
  try { document.dispatchEvent(new CustomEvent('atlas:audio', { detail: { state: s } })); } catch (e) {}
  if (s === 'on' && !audSaid) { audSaid = true; try { document.dispatchEvent(new CustomEvent('atlas:sound')); } catch (e) {} }
}
const ZERO = { low: 0, mid: 0, high: 0 }, B = { low: 0, mid: 0, high: 0 };
const BED = 0.85, DUCK = 0.063; /* -24 dB */
/* a crossfade's length follows the room change: same key 1.3 s, a neighbour 2 s, a long way round 4 s. make.js draws its
   blend line for xf * 2200 ms, so the two stay in step */
function fadeLen(xf) { return Math.max(0.5, (xf || 0.9) * 2.2); }
/* R10: how two beds relate, by the tones their keys share. a camelot number names one set of seven tones (nA and nB are
   relatives, the same set); one step round the wheel changes one tone. so: 'same' key; 'near' = the same set or one tone
   apart (relative, neighbour, or the diagonal n B to n-1 A); 'boost' = two steps; 'far' = three or more */
function bedRel(a, b) {
  const ka = KEYS && KEYS[a], kb = KEYS && KEYS[b];
  if (!ka || !kb) return 'near';
  if (ka === kb) return 'same';
  const d = Math.abs(parseInt(ka, 10) - parseInt(kb, 10)) % 12, n = Math.min(d, 12 - d);
  return n <= 1 ? 'near' : n === 2 ? 'boost' : 'far';
}
/* the shape of each change, in seconds. same key: an equal-power blend over 1.3 s. near: the same blend over 2 s. boost:
   the outgoing bed starts down at once and the new one comes in 0.7 s later, so two keys two steps apart overlap only
   low. far: the outgoing bed leaves over about a bar of its own tempo, a beat of silence (0.3 to 0.6 s), then the new bed
   rises from its mix-in point over 0.9 s. hold = how long interface tones wait (until the outgoing bed is gone) */
function shape(rel, from, to) {
  const m = META && META[from + '.mp3'], bpm = m && m.bpm > 0 ? m.bpm : 110, beat = 60 / bpm;
  if (rel === 'same') return { inL: 1.3, out: 1.3, delay: 0, gap: 0, hold: 0, total: 1.3 };
  if (rel === 'near' || rel === 'first') { const sameSet = rel === 'first' || (KEYS && KEYS[from] && KEYS[to] && parseInt(KEYS[from], 10) === parseInt(KEYS[to], 10)); return { inL: 2, out: 2, delay: 0, gap: 0, hold: sameSet ? 0 : 2, total: 2 }; }
  if (rel === 'boost') return { inL: 1.6, out: 2.2, delay: 0.7, gap: 0, hold: 2.2, total: 2.3 };
  const out = clamp(4 * beat, 1.4, 2.4), gap = clamp(beat, 0.3, 0.6);
  return { inL: 0.9, out, delay: 0, gap, hold: out + gap, total: out + gap + 0.9 };
}
/* where a bed starts: where it was left within the last ten minutes (not in its last 8 s), else its mix-in point; both
   moved onto its own beat grid (bed_meta b0 + whole beats) so it enters on a beat */
const LAST = {};
function resumeAt(track) {
  const m = META && META[track + '.mp3'], L = LAST[track];
  let pos = L && performance.now() - L.at < 600000 && (!m || L.pos < m.dur - 8) ? L.pos : m && m.mixin > 0 && m.mixin < 12 ? m.mixin : 0;
  if (m && m.bpm > 0 && pos > 0) { const b = 60 / m.bpm, k = Math.round((pos - m.b0) / b); pos = Math.max(0, m.b0 + k * b); }
  return pos;
}
function hold(p, t) { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); }
/* a quarter sine from the param's current value, up to 1 or down to 0. 100 points a second: never more than 0.012 of
   full level between neighbours, and the last point is an exact zero */
function curve(p, t, L, up, top = 1) {
  const v = p.value, n = Math.max(64, Math.ceil(L * 100)), c = new Float32Array(n);
  const a0 = up ? Math.asin(clamp(v / top, 0, 1)) : 0;
  for (let i = 0; i < n; i++) { const u = i / (n - 1); c[i] = up ? top * Math.sin(a0 + (Math.PI / 2 - a0) * u) : v * Math.cos((Math.PI / 2) * u); }
  c[n - 1] = up ? top : 0;
  p.cancelScheduledValues(t - 0.01); p.setValueAtTime(v, t - 0.01);
  /* firefox cannot cancel a value curve once it has begun (the next room change would throw), so there the same curve
     goes in as short straight ramps, which it can cancel */
  if (CURVE_OK) { try { p.setValueCurveAtTime(c, t, L); return; } catch (e) {} }
  for (let i = 0; i < n; i += 2) p.linearRampToValueAtTime(c[i], t + (L * i) / (n - 1));
  p.linearRampToValueAtTime(c[n - 1], t + L);
}
const CURVE_OK = typeof AudioParam !== 'undefined' && 'cancelAndHoldAtTime' in AudioParam.prototype;
/* the owner's palette is D minor pentatonic (D F G A C), D dorian when a bed shares too little of it. a camelot key
   names a major scale (nB) or its relative minor (nA), which hold the same seven tones */
const DMP = [2, 5, 7, 9, 0], DOR = [2, 4, 5, 7, 9, 11, 0], KEYCACHE = {};
function inKey(k) {
  if (!k) return DMP;
  if (KEYCACHE[k]) return KEYCACHE[k];
  const n = parseInt(k, 10), root = (((n - 8) * 7) % 12 + 12) % 12, maj = [0, 2, 4, 5, 7, 9, 11].map((d) => (root + d) % 12);
  const a = DMP.filter((p) => maj.includes(p)), b = DOR.filter((p) => maj.includes(p));
  return (KEYCACHE[k] = keyFloor(a.length >= 2 ? a : b.length >= 2 ? b : DMP));
}
/* R5 key floor: a set under 3 tones, or one holding a tritone, keeps its first perfect fourth/fifth pair, else its first
   tone in octaves (2A's F+B becomes F; 11A keeps D+A). note(), tick() and pitches() all read it */
function keyFloor(s) {
  if (s.length >= 3 && !s.some((p) => s.includes((p + 6) % 12))) return s;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) { const d = (s[j] - s[i] + 12) % 12; if (d === 5 || d === 7) return [s[i], s[j]]; }
  return [s[0]];
}
/* semitones above D4, moved to the nearest allowed tone (a tie goes down, which is the darker choice) */
function snap(semi, k) {
  const ok = inKey(k);
  for (let d = 0; d < 7; d++) { if (ok.includes((((semi - d + 2) % 12) + 12) % 12)) return semi - d; if (ok.includes((((semi + d + 2) % 12) + 12) % 12)) return semi + d; }
  return semi;
}

/* ------------------------------------------------------------------ rooms */
/* atlas-only stops (the universe) do not exist at ?atlas=0: taking them out of the DOM before anything counts rooms keeps
   the walk, the numbering, the dots, the kiosk and the arrow keys exactly today's. in atlas mode they join the walk. */
if (!ATLAS) document.querySelectorAll('section[data-atlas]').forEach((s) => s.remove());
else {
  document.querySelectorAll('section[data-atlas]').forEach((s) => { s.hidden = false; });
  document.querySelectorAll('[data-atlas-text]').forEach((el) => { el.textContent = el.dataset.atlasText; });
  /* the kicker's " · " moves into a span the atlas css hides with the room number; ?atlas=0 keeps HEAD's single text node */
  document.querySelectorAll('.wall .no > b').forEach((b) => {
    const t = b.nextSibling, m = t && t.nodeType === 3 ? /^\s*·\s*/.exec(t.data) : null; if (!m) return;
    const sp = document.createElement('span'); sp.className = 'no-sep'; sp.textContent = m[0]; t.data = t.data.slice(m[0].length); b.after(sp);
  });
  document.body.classList.add('entered'); /* no threshold doors to pass: the chrome and the sound control are there from the start */
}
const sections = [...document.querySelectorAll('section[data-room]')];
const rooms = sections.map((el) => ({ el, id: el.dataset.room, mod: null, loading: null, mounted: false }));
let active = -1;
const cache = {};
/* a data file whose request never got an answer (a dropped connection) is asked for twice more; any answer is final, a 404
   included (the Tier-B files are not shipped, and their absence is a state the rooms read, not an error to retry) */
function fetchData(name, k) {
  return fetch('exhibit/data/' + name + '.json' + V).then((r) => { if (!r.ok) { const e = new Error(name); e.status = r.status; throw e; } return r.json(); },
    (e) => { if (k >= 2) throw e; return new Promise((res) => setTimeout(res, 300 * (k + 1))).then(() => fetchData(name, k + 1)); });
}
let identityP = null, mapP = null;
let NA = 300; /* exhibit/data/mapmorph.json artists.length */
function assignArtists(na) { for (let i = 0; i < N; i++) P.artist[i] = Math.floor(hash(i * 7 + 3) * na); }
let goK = -1, goT = 0;
/* a jump of more than one room (a dot, home, end, walk it again): the scroll passes every room in between, and none of them
   should wake, fetch its track and go back to sleep in the same half second. only the destination is let in. */
let jumpTo = -1, jumpT = 0, jumpTimer = 0, lastScroll = 0;
/* camelot keys of my tracks (exhibit/data/tracks.json): bedRel() reads them to choose how two beds change over */
let KEYS = null;
const ctx = {
  /* a room that demonstrates itself has shown the visitor what to do: no idle hint after that */
  acted(id) { acted.add(id); clearTimeout(hintT); if (hintEl) hintEl.classList.remove('on'); },
  reduced, coarse, particles: P, audio: A, stage, PAL, PROV, PROV_CHIP, FAM, famColor, hash, V,
  legend: (host, kind, opts) => legend(host, kind, opts),
  post: Object.assign((host, artist, opts) => post(host, artist, ctx, opts), {
    grant: () => grant(), hasTrack: (a) => hasTrack(a), hasTrackNow: (a) => hasTrackNow(a), playArtist: (a, o) => playQuiet(a, ctx, o),
    dwell: (a, o) => dwell(a, ctx, o), undwell: (o) => undwell(ctx, o), state: () => postState(),
  }),
  stopPosts: () => stopAll(ctx), buzz: (ms) => buzz(ms),
  /* true only once a visitor has clicked one listening post. kiosk demos check it before starting a clip. */
  get clipsAllowed() { return clipsAllowed(); },
  playClip: (artist) => playClip(artist, ctx),
  /* the dock tells the shell how much of the bottom edge it is using; the rooms are re-laid-out around it */
  reserveBottom(px) {
    px = Math.max(0, Math.round(px || 0)); if (px === dockPx) return;
    dockPx = px; document.documentElement.style.setProperty('--dockh', px + 'px');
    relayout();
  },
  /* resolves once every dot knows who pressed play on it and which artist it belongs to */
  identity() {
    if (!identityP) identityP = this.data('wall').catch(() => null).then((w) => {
      if (w && w.tap) { const edges = []; let acc = 0; for (let k = 0; k < w.tap.length; k++) { const t = w.tap[k], sh = w.shuffle[k], v = w.served[k], tot = t + sh + v; edges.push([acc + tot, t / (tot || 1), (t + sh) / (tot || 1)]); acc += tot; } let k = 0; for (let i = 0; i < N; i++) { const play = (i + 0.5) * (acc / N); while (k < edges.length - 1 && play >= edges[k][0]) k++; const u = hash(i); P.prov[i] = u < edges[k][1] ? 0 : u < edges[k][2] ? 1 : 2; } }
      else for (let i = 0; i < N; i++) { const u = hash(i); P.prov[i] = u < 0.19 ? 0 : u < 0.36 ? 1 : 2; }
      assignArtists(NA);
      return { wall: w };
    });
    return identityP;
  },
  /* mapmorph.json is 38 KB and only the map room reads it, so it is fetched when the map room mounts (the shell warms the
     next room, so that is the moment the visitor reaches room 04, or a jump or #map link lands on 05). P.artist does not
     wait for it: NA already matches its artist count, and a file with a different count re-deals the dots when it lands. */
  artistMap() {
    if (!mapP) mapP = this.data('mapmorph').catch(() => null).then((m) => { if (m && m.artists && m.artists.length !== NA) { NA = m.artists.length; assignArtists(NA); } return m; });
    return mapP;
  },
  /* a failed fetch leaves the cache, so one dropped connection does not take the file away for the rest of the visit */
  data(name) { return cache[name] || (cache[name] = fetchData(name, 0).catch((e) => { delete cache[name]; throw e; })); },
  /* centre a room's single affordance on the stage */
  placeCue(el, fy = 0.5) { const st = stage(); el.style.left = (st.x + st.w / 2) + 'px'; el.style.top = (st.y + st.h * fy) + 'px'; },
  go(i, opts) {
    if (typeof i === 'string') { i = rooms.findIndex((r) => r.id === i); if (i < 0) return Promise.resolve(false); }
    if (typeof i !== 'number' || i !== i) return Promise.resolve(false);
    if (ATLAS) return goAtlas(i, opts || {});
    const k = clamp(i, 0, rooms.length - 1), now = performance.now(); if (rooms[k].el.hidden) return; /* the side room is not part of the walk until someone opens it */ if (k === goK && now - goT < 700) return; goK = k; goT = now; const r = rooms[k];
    if (Math.abs(k - active) > 1) { jumpTo = k; jumpT = now; clearTimeout(jumpTimer); jumpTimer = setTimeout(jumpSettle, 1500); load(k); }
    r.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); },
  /* kiosk only: true the moment a real hand arrives. a room whose demo runs on timers polls this and stops */
  demoStopped: true,
  get index() { return active; },
  /* ---------------------------------------------------------------- atlas contract (§1.3). every field exists at
     ?atlas=0 as an inert stub; rooms still branch on ctx.atlas.on for any behaviour change */
  atlas: ATL, ATLAS, lowPower, relayout: () => relayout(),
  get stops() { return STOPS; }, get WALK() { return WALK; },
  roomNo: (i) => roomNo(i), roomName: (i) => roomName(i), roomSay: (i) => roomSay(i),
  route(d) {
    if (!d) return Promise.resolve('arrived');
    let k = d.stop;
    if (typeof k === 'string') { k = rooms.findIndex((r) => r.id === k); if (k < 0) return Promise.resolve('arrived'); }
    if (typeof k !== 'number' || k !== k) return Promise.resolve('arrived');
    if (!ATLAS) { ctx.go(k); return Promise.resolve('arrived'); }
    return goAtlas(k, { angle: d.angle, pose: d.pose, focus: d.focus, instant: d.instant, via: d.via || 'route' }).then((ok) => (ok === true ? 'flew' : 'arrived'));
  },
  onStop(fn) { return sub(STOPFNS, fn); },
  onFrame(fn) { return sub(FRAMEFNS, fn); },
  say(text) { say(text); },
  provide(name, api) { SVC[name] = api; if (WAITS[name]) { WAITS[name].res(api); } },
  need(name) {
    if (SVC[name]) return Promise.resolve(SVC[name]);
    if (!WAITS[name]) { let res; const p = new Promise((r) => { res = r; }); WAITS[name] = { p, res }; const k = rooms.findIndex((r) => r.id === name); if (ATLAS && k >= 0) load(k); }
    return WAITS[name].p;
  },
  peek(name) { return SVC[name] || null; },
  stats: { plays: 97427, span: 'september 2019 to may 2026', firstDay: '2019-09-05', lastDay: '2026-05-10' }, /* §1.3 constants; copy.js (C2) overrides when it lands */
  keys: { on(key, fn) { if (!ATLAS) return noop; (KEYMAP[key] || (KEYMAP[key] = [])).push(fn); return () => { const a = KEYMAP[key]; const k = a ? a.indexOf(fn) : -1; if (k >= 0) a.splice(k, 1); }; } },
};
ctx.fieldListens = FLS; FLS.off = flOff; /* R5 L5: {on, reason, live, gain, hook, p95, mean, twinkles, off(reason)}; .bands / .burn are test seams */
/* ---------------------------------------------------------------- atlas services: stable facades over late modules.
   a room or module may capture ctx.labels (etc.) at mount, before the real module has loaded: the facade forwards to
   the stub until the module lands, then to the module. calls that set state (labels.set, search.register, hud, lock,
   ladder.readout) made meanwhile are replayed into the module when it arrives; on*() subscriptions are re-attached. */
const SVC = {}, WAITS = {}, STOPFNS = [], FRAMEFNS = [], KEYMAP = {};
function sub(list, fn) { list.push(fn); return () => { const k = list.indexOf(fn); if (k >= 0) list.splice(k, 1); }; }
function service(name, stub, rec) {
  let impl = null; const q = [], pend = [];
  const api = new Proxy(stub, {
    get(tgt, k) {
      if (k === '__impl') return impl;
      if (impl && k in impl) { const v = impl[k]; return typeof v === 'function' ? v.bind(impl) : v; }
      if (typeof k === 'string' && /^on[A-Z]/.test(k)) return (...a) => { const p = { k, a, dead: false, off: null }; pend.push(p); return () => { p.dead = true; if (typeof p.off === 'function') p.off(); }; };
      const v = tgt[k];
      if (rec && rec.includes(k) && typeof v === 'function') return (...a) => { if (q.length > 400) q.shift(); q.push([k, a]); return v.apply(tgt, a); };
      return v;
    },
    set(tgt, k, v) { if (impl) impl[k] = v; else tgt[k] = v; return true; },
  });
  api.__land = (x) => {
    if (!x || typeof x !== 'object' || x === impl) return;
    impl = x;
    q.splice(0).forEach(([k, a]) => { if (typeof impl[k] === 'function') try { impl[k](...a); } catch (e) { console.warn(name, k, e); } });
    pend.forEach((p) => { if (!p.dead && typeof impl[p.k] === 'function') try { p.off = impl[p.k](...p.a); } catch (e) { console.warn(name, p.k, e); } });
  };
  return api;
}
function fnService(name, keepLast) {
  let impl = null, last = null;
  const f = (...a) => { if (impl) return impl(...a); if (keepLast) last = a; return undefined; };
  f.__land = (x) => { if (typeof x !== 'function' || x === impl) return; impl = x; if (last) { const a = last; last = null; try { impl(...a); } catch (e) { console.warn(name, e); } } };
  return f;
}
const SETTINGS0 = { detail: 'fine', travel: 'slow', dwell: 'normal', fade: true, glow: true, labels: true, twinkle: true, textSize: 'normal', pinch: 'atlas' };
const TOUR0 = { id: null, k: 0, n: 0, playing: false, angleK: 0, angleN: 1, holding: 0, enRoute: false };
const FAC = {
  caption: service('caption', { type: () => Promise.resolve(), set: noop, clear: noop }),
  idle: service('idle', { wake: noop, hold: noop, faded: false }),
  labels: service('labels', { set: noop, update: noop, clear: noop, refresh: noop }, ['set', 'update', 'clear']),
  search: service('search', { open: noop, close: noop, register: noop }, ['register']),
  ladder: service('ladder', { readout: noop, level: noop, onPick: off0 }, ['readout', 'level']),
  tour: service('tour', { list: () => [], active: TOUR0, play: noop, pause: noop, resume: noop, next: () => stepWalk(1, 'key'), prev: () => stepWalk(-1, 'key'), onChange: off0 }),
  url: service('url', { write: noop, read: () => ({}) }),
  settings: service('settings', { get: (k) => SETTINGS0[k], set: noop, onChange: off0 }),
  label: { open: () => { if (labelDlg && !labelDlg.open) toggleLabel(); }, close: () => { if (labelDlg && labelDlg.open) labelDlg.close(); }, get isOpen() { return !!(labelDlg && labelDlg.open); } },
  hud: fnService('hud', true), lock: fnService('lock', true), toast: fnService('toast', false),
};
['caption', 'idle', 'labels', 'search', 'ladder', 'tour', 'url', 'settings'].forEach((k) => Object.defineProperty(ctx, k, { enumerable: true, get: () => FAC[k], set: (v) => FAC[k].__land(v) }));
['hud', 'lock', 'toast'].forEach((k) => Object.defineProperty(ctx, k, { enumerable: true, get: () => FAC[k], set: (v) => FAC[k].__land(v) }));
Object.defineProperty(ctx, 'label', { enumerable: true, get: () => FAC.label });
Object.defineProperty(ctx, 'view', { enumerable: true, get: () => VIEW });
Object.defineProperty(ctx, 'camera', { enumerable: true, get: () => VIEW }); /* K6's name for the same camera: ctx.camera.travel(pose, {dur, pullback}) */
Object.defineProperty(ctx, 'gesture', { enumerable: true, get: () => GEST });
function settingOn(k) { let v; try { v = FAC.settings.get(k); } catch (e) { v = undefined; } return !(v === false || v === 'off'); }
/* ctx.angle (§1.3): the active room's angles; a room without `angles` has one implicit angle, main */
let angK = 0; const ANGFNS = [];
const angleList = () => { const m = rooms[active] && rooms[active].mod; return m && Array.isArray(m.angles) && m.angles.length ? m.angles : [{ id: 'main', name: 'view' }]; };
ctx.angle = {
  get() { const L = angleList(), k = clamp(angK, 0, L.length - 1); return { k, n: L.length, id: L[k].id, name: L[k].name }; },
  set(k, o = {}) {
    const L = angleList(); if (typeof k === 'string') k = L.findIndex((a) => a.id === k);
    if (typeof k !== 'number' || k < 0 || k >= L.length) return Promise.resolve(false);
    if (ATLAS) syncNeeds();
    angK = k; const m = rooms[active] && rooms[active].mod; let ms = 0;
    if (ATLAS && m && m.setAngle) { try { ms = +m.setAngle(k, ctx, { instant: !!o.instant, via: o.via || null }) || 0; } catch (e) { console.warn('setAngle', e); } }
    const a = ctx.angle.get(); ANGFNS.slice().forEach((f) => { try { f(a); } catch (e) {} });
    return ms > 0 ? new Promise((r) => setTimeout(() => r(true), ms)) : Promise.resolve(true);
  },
  next() { const n = angleList().length; return ctx.angle.set((angK + 1) % n, { via: 'key' }); },
  prev() { const n = angleList().length; return ctx.angle.set((angK - 1 + n) % n, { via: 'key' }); },
  onChange(fn) { return sub(ANGFNS, fn); },
};
/* the camera and the gesture layer: created once, synchronously, before the first frame */
if (ATLAS) {
  try { if (typeof CAMM.createView === 'function') VIEW = CAMM.createView(ctx) || VIEW0; } catch (e) { console.warn('createView', e); VIEW = VIEW0; }
  try { if (typeof GESM.createGesture === 'function') GEST = GESM.createGesture(ctx, VIEW) || GEST0; } catch (e) { console.warn('createGesture', e); GEST = GEST0; }
} else readyRes();

/* the jump did not arrive (the visitor grabbed the scroll, or it is still travelling): once it has stopped, the room in the middle of the screen wins */
function jumpSettle() {
  if (jumpTo < 0) return;
  if (performance.now() - lastScroll < 150 && performance.now() - jumpT < 4000) { jumpTimer = setTimeout(jumpSettle, 200); return; }
  jumpTo = -1; const mid = innerHeight / 2;
  const k = sections.findIndex((s) => { if (s.hidden) return false; const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
  if (k >= 0) activate(k);
}
addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });

async function load(i) {
  const r = rooms[i]; if (!r || r.mounted) return r;
  if (!r.loading) r.loading = importRetry('./rooms/' + r.id + '.js' + V).then(async (m) => { r.mod = m.default; const root = $('.room-body', r.el) || r.el; try { await r.mod.mount(root, ctx); } catch (e) { console.warn('room', r.id, e); } r.mounted = true; return r; }).catch((e) => { console.warn('room failed', r.id, e); LOADFAIL.push('room ' + r.id); loadFailed(); r.mounted = true; return r; });
  return r.loading;
}

let curAct = Promise.resolve();
function activate(i, via, instant) {
  if (i === active) return curAct;
  curAct = activateRoom(i, via || null, !!instant);
  return curAct;
}
/* ---------------------------------------------------------------- the stop-to-stop trip (W47, G2). a next stop that is only a
   journey: the view pulls back, crosses and lands, and the world changes shape on the way. here: at the change every dot
   keeps its place on screen (keepOnScreen), so the old picture is where the trip starts, never a cut; the new room's
   camera breathes out to PULL of its home and back in over TRIP s (K6: travel from home to home); and the dots cross over
   the same span (morphStep caps every dot's pace with an ease-in-out envelope in eight staggered groups, never faster
   than the room itself asks). so the old picture shrinks away, the crowd crosses at the widest view, and the new picture
   grows in as the camera lands. a room that flies on its own at once (the universe's approach) keeps its own flight; one
   whose camera arrives after enter() takes the landing half through ctx.atlas.arrive (camera.js takeArrival). never
   under reduced motion or an `instant` go (deep links, tests) */
const TRIP = { slow: 2.4, quick: 1.8, warp: 0.6 }, PULL = 0.6;
const MORPH = { on: false, t0: 0, dur: 1, u: 0, FM: new Float32Array(8) };
/* a room that predicts where its dots land next frame (threshold weigh(), yours) caps its pace the same way the loop does:
   while P.morph.on, ei = min(ei, P.morph.FM[7 - ((seed * 1.2732) | 0)]) (FM is this frame's, set before the room's frame runs) */
P.morph = MORPH;
const sstep = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function morphStart(t, sec) { MORPH.on = true; MORPH.t0 = t; MORPH.dur = sec * 1000; MORPH.u = 0; }
/* this frame's share of the remaining distance each group may cover: group k lands at (0.72 + 0.04 k) of the trip on an
   ease-in-out curve, so a dot left alone by its room arrives exactly then; null once every group has landed */
function morphStep(t) {
  if (!MORPH.on) return null;
  const u = Math.max(MORPH.u, (t - MORPH.t0) / MORPH.dur), u0 = MORPH.u; MORPH.u = u;
  if (u >= 1) { MORPH.on = false; return null; }
  const F = MORPH.FM;
  for (let k = 0; k < 8; k++) { const d = 0.72 + 0.04 * k, a = sstep(u0 / d), b = sstep(u / d); F[k] = a >= 1 ? 1 : (b - a) / (1 - a); }
  return F;
}
/* the field's screen transform: the pan camera's matrix, or null (identity) for orbit rooms and rooms without a camera */
function fieldMatrix() { try { return VIEW.mode === 'pan' ? VIEW.matrix() : null; } catch (e) { return null; } }
/* re-express every dot in the new room's world so it sits where it was drawn a frame ago */
function keepOnScreen(m0, m1) {
  const a0 = m0 ? m0[0] : 1, e0 = m0 ? m0[4] : 0, f0 = m0 ? m0[5] : 0, a1 = m1 ? m1[0] : 1, e1 = m1 ? m1[4] : 0, f1 = m1 ? m1[5] : 0;
  if (!(a1 > 0) || (Math.abs(a0 - a1) < 1e-6 && Math.abs(e0 - e1) < 0.01 && Math.abs(f0 - f1) < 0.01)) return;
  const k = a0 / a1, bx = (e0 - e1) / a1, by = (f0 - f1) / a1, X = P.x, Y = P.y;
  for (let i = 0; i < N; i++) { X[i] = X[i] * k + bx; Y[i] = Y[i] * k + by; }
}
/* the camera is exactly where the room's configure put it (its home), with no pose sent and no flight of its own */
function atHome() {
  const h = VIEW.home0, m = VIEW.mode; if (!h || VIEW.flying) return false;
  const near = (a, b, r) => Math.abs(a - b) <= r;
  if (m === 'pan') return near(VIEW.z, h.z, 1e-3 * h.z) && near(VIEW.cx, h.cx, 1) && near(VIEW.cy, h.cy, 1);
  if (m === 'orbit') return near(VIEW.yaw, h.yaw, 1e-3) && near(VIEW.pitch, h.pitch, 1e-3) && near(VIEW.z, h.z, 1e-3 * h.z);
  if (m === 'orbit3d') { const g = VIEW.target, ht = h.t || [0, 0, 0]; return near(VIEW.dist, h.dist, 1e-3 * h.dist) && near(VIEW.yaw, h.yaw, 1e-3) && near(VIEW.pitch, h.pitch, 1e-3) && Math.hypot(g[0] - ht[0], g[1] - ht[1], g[2] - ht[2]) < 1e-3; }
  return false;
}
/* the breath's outward half: a relayout then (the chrome re-measuring its card for the new stop, a phone's usual first
   frames) would re-fly the camera straight to the target it is already at, which flattens the breath to nothing
   (camera.js carries a flight's target and time, not its pull-back). so a relayout asked for in that half waits for
   the widest view, where carrying the flight on is exactly the landing half */
function tripOut() { const tr = ATL.trip; return !!tr && tr.flew && !!VIEW.flying && performance.now() - tr.t < tr.dur * 500; }
function stopTrip(m0, via, t, D) {
  morphStart(t, D);
  keepOnScreen(m0, fieldMatrix());
  const tr = ATL.trip = { t, dur: D, mode: VIEW.mode, home: false, flew: false }; /* read by tests and by tripOut */
  if (VIEW.mode === 'none') { ATL.arrive = { t, via: via || null, dur: D, pullback: PULL }; return; }
  tr.home = atHome();
  if (typeof VIEW.travel === 'function' && tr.home) { try { tr.flew = true; VIEW.travel(null, { dur: D, pullback: PULL }).catch(noop); } catch (e) {} }
}
/* R7D M6, the record change: a stop reached by the tour or the transport (via tour or key) is a record changing on a deck, not a
   flight. the stop's field turns away about the groove spindle (the sky's, up and right of the stage) by 14 degrees, shrinking
   to .96 and fading, and the next stop turns in from the other side to rest at identity; one transform, nothing on the dom
   moves but the canvases. the crossfade setting sets the time (long 1.1 s, short .7, cut .35). the bed brakes: its playback rate
   goes 1 to .94 and back with the pitch following (a platter slowing), in place of the sized whoosh. a straight cut under
   reduced motion and at governor tier 4. a tap, a search or the ladder keep the van Wijk flight */
const REC_SEC = { slow: 1.1, quick: 0.7, warp: 0.35 };
const REC = { on: false, anims: [], clone: null, els: [], brake: null };
const recVia = (via) => via === 'tour' || via === 'key';
function recCancel() {
  if (!REC.on) return;
  REC.on = false;
  REC.anims.forEach((a) => { try { a.cancel(); } catch (e) {} }); REC.anims = [];
  REC.els.forEach((e) => { e.style.opacity = ''; e.style.transformOrigin = ''; }); REC.els = [];
  if (REC.clone) { try { REC.clone.remove(); } catch (e) {} REC.clone = null; }
  if (REC.brake) { try { REC.brake(); } catch (e) {} REC.brake = null; }
}
function recBrake(ms) {
  if (A.muted || !A.on || A.cur < 0) return null;
  let el = null, rate0 = 1, pp0 = true;
  try { el = A.els[A.cur]; if (!el || el.paused) return null; rate0 = el.playbackRate || 1; pp0 = el.preservesPitch; } catch (e) { return null; }
  const track = el.dataset.t, t0 = performance.now();
  const set = (r) => { try { el.playbackRate = r; } catch (e) {} };
  try { el.preservesPitch = false; el.mozPreservesPitch = false; el.webkitPreservesPitch = false; } catch (e) {}
  const done = () => { clearInterval(iv); set(rate0); try { el.preservesPitch = pp0; el.mozPreservesPitch = pp0; el.webkitPreservesPitch = pp0; } catch (e) {} };
  const iv = setInterval(() => {
    const u = (performance.now() - t0) / ms;
    if (u >= 1 || el.dataset.t !== track) { done(); return; }
    set(rate0 * (1 - 0.06 * Math.sin(Math.PI * u)));
  }, 40);
  return done;
}
function recOut(sec) {
  const ms = sec * 1000, els = [field, glow, over].filter(Boolean), ox = Math.round(field.clientWidth * 1.1) + 'px ' + Math.round(-field.clientHeight * 0.25) + 'px';
  REC.on = true; REC.els = els; REC.anims = []; REC.t0 = performance.now();
  try {
    const cl = document.createElement('canvas'); cl.width = field.width; cl.height = field.height; cl.className = 'layer'; cl.setAttribute('aria-hidden', 'true'); cl.style.zIndex = '1';
    const c = cl.getContext('2d'); c.drawImage(field, 0, 0); if (glow && glow.width) { c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.85; c.drawImage(glow, 0, 0, cl.width, cl.height); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; } c.drawImage(over, 0, 0, cl.width, cl.height);
    cl.style.transformOrigin = ox; over.parentNode.insertBefore(cl, over.nextSibling); REC.clone = cl;
    REC.anims.push(cl.animate([{ transform: 'rotate(0deg) scale(1)', opacity: 1 }, { transform: 'rotate(-14deg) scale(.96)', opacity: 0 }], { duration: ms * 0.42, easing: 'ease-in', fill: 'forwards' }));
  } catch (e) {}
  els.forEach((e) => { e.style.transformOrigin = ox; e.style.opacity = '0'; });
  REC.brake = recBrake(ms);
}
function recIn(sec) {
  const ms = sec * 1000, d = ms * 0.42, inMs = ms - d;
  ATL.trip = { t: performance.now(), dur: sec, mode: VIEW.mode, home: false, flew: false, rec: true };
  const fin = () => { REC.els.forEach((e) => { e.style.opacity = ''; e.style.transformOrigin = ''; }); REC.els = []; REC.anims = []; REC.on = false; REC.brake = null; };
  let left = REC.els.length;
  REC.els.forEach((e) => {
    e.style.opacity = ''; let base = 1; try { base = parseFloat(getComputedStyle(e).opacity); } catch (x) {}
    try {
      const a = e.animate([{ transform: 'rotate(14deg) scale(.96)', opacity: 0 }, { transform: 'rotate(0deg) scale(1)', opacity: base }], { duration: inMs, delay: Math.max(0, REC.t0 + d - performance.now()), easing: 'ease-out', fill: 'backwards' });
      REC.anims.push(a); a.onfinish = a.oncancel = () => { if (--left <= 0 && REC.on) { if (REC.clone) { REC.clone.remove(); REC.clone = null; } fin(); } };
    } catch (x) { left--; }
  });
  if (left <= 0) { if (REC.clone) { REC.clone.remove(); REC.clone = null; } fin(); }
}
function tripSec() { let sp = 'slow'; try { sp = VIEW.speed || 'slow'; } catch (e) {} return TRIP[sp] || TRIP.slow; }
async function activateRoom(i, via, instant) {
  ctx.demoStopped = true; /* whatever was demonstrating itself is not the active room any more */
  const prev = rooms[active]; active = i;
  recCancel();
  const rec = ATLAS && !!prev && !instant && recVia(via), recGo = rec && !reduced && ATL.gov.tier < 4;
  if (recGo) { try { recOut(REC_SEC[VIEW.speed] || REC_SEC.slow); } catch (e) { recCancel(); } }
  if (prev && prev.mod && prev.mod.leave) try { prev.mod.leave(ctx); } catch (e) {}
  if (ATLAS) atlasLeave(prev);
  const fa = document.activeElement, strand = !!fa && fa !== document.body && ((prev && prev.el.contains(fa)) || fa === enter || fa === enterQuiet);
  /* a room off screen keeps nothing in the tab order: its text is transparent and its controls are not there to press */
  sections.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.inert = k !== i; });
  if (strand) { const h = sections[i].querySelector('h1,h2'); if (h) try { h.focus({ preventScroll: true }); } catch (e) {} }
  document.title = ATLAS ? roomName(i) + ' · mostly the machine' : i === 0 ? BASE_TITLE : (rooms[i].el.dataset.side ? '' : roomNo(i) + ' · ') + roomName(i) + ' · mostly the machine';
  announce(i, !!prev);
  clearTimeout(hintT); if (hintEl) hintEl.classList.remove('on'); /* the last room's hint must not sit over this one while it loads */
  dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  og.clearRect(0, 0, W, H);
  const r = await load(i); if (active !== i) return;
  P.swirl = 0.4; P.touch = true;
  /* a stop change is a trip (stopTrip): the old field's screen transform is read before the new room's camera replaces it */
  const trip = ATLAS && !!prev && !reduced && !instant && !rec, m0 = trip ? fieldMatrix() : null;
  if (ATLAS) { ATL.arrive = null; ATL.trip = null; }
  if (ATLAS) atlasPreEnter();
  if (r.mod) { if (r.mod.track) A.play(r.mod.track); if (r.mod.enter) try { r.mod.enter(ctx); } catch (e) { console.warn(e); } }
  layMark();
  if (ATLAS) MORPH.hk = trip && !!(prev.mod && prev.mod.hueTrip);
  if (trip) stopTrip(m0, via, performance.now(), tripSec());
  else if (recGo && REC.on) { try { recIn(REC_SEC[VIEW.speed] || REC_SEC.slow); } catch (e) { recCancel(); } }
  const nx = rooms[i + 1]; if (nx && !nx.el.hidden && !nx.el.dataset.side) load(i + 1); /* never warm the side room: it only opens from its own door */
  sigPlace();
  if (labelDlg && labelDlg.open) renderLabel(); armHint();
  if (!ATLAS) kioskStep(); /* in atlas mode tour.js is the only autoplay driver (§1.10) */
  if (!ATLAS) { try { history.replaceState(null, '', '#' + r.id); } catch (e) {} }
  else atlasPostEnter(r, prev, via);
}
/* ---------------------------------------------------------------- atlas activation (§2.1, SKELETON 1 and 6) */
let stageOff = null;
function atlasLeave(prev) {
  LINES = null; /* K1: a room's trails never outlive it */
  if (prev) { try { FAC.labels.clear(prev.id); } catch (e) {} }
  try { FAC.hud(null); } catch (e) {}
  try { FAC.lock(null); } catch (e) {}
}
function atlasPreEnter() {
  P.glyph.fill(0); P.cat.fill(0); P.w.fill(255); gfReset(); gfRoom();
  try { VIEW.configure({ mode: 'none' }); } catch (e) { console.warn('view.configure', e); }
  angK = 0;
}
function atlasPostEnter(r, prev, via) {
  bindStage(r); syncNeeds();
  const ev = { i: active, id: r.id, prev: prev ? prev.id : null, via: via || null };
  STOPFNS.slice().forEach((f) => { try { f(ev); } catch (e) { console.warn('onStop', e); } });
  if (atlasReady) { if (FAC.url.__impl) { try { FAC.url.write({ stop: r.id }); } catch (e) {} } else { try { history.replaceState(null, '', '#' + r.id); } catch (e) {} } }
}
/* the bare field: the active room's gestures(ctx) spec (default: drag moves the camera, a tap asks the room's pick()) */
function bindStage(r) {
  if (stageOff) { try { stageOff(); } catch (e) {} stageOff = null; }
  if (!GEST.stage || typeof GEST.bind !== 'function') return;
  const mod = r.mod || {}; let spec = { drag: 'camera', tap: defaultTap };
  if (mod.gestures) { try { const s = mod.gestures(ctx); if (s) spec = Object.assign(spec, s); } catch (e) { console.warn('gestures', e); } }
  try { stageOff = GEST.bind(GEST.stage, spec) || null; } catch (e) { console.warn('gesture.bind', e); }
}
function defaultTap(p) {
  const mod = rooms[active] && rooms[active].mod; if (!mod || !mod.pick || !p) return;
  let hit = null; try { hit = mod.pick(p.wx, p.wy, ctx); } catch (e) { console.warn('pick', e); }
  if (!hit) return;
  const to = hit.pose || { wx: hit.wx != null ? hit.wx : p.wx, wy: hit.wy != null ? hit.wy : p.wy, z: hit.z || Math.max(VIEW.z || 1, 1.6) };
  try { VIEW.flyTo(to, { speed: 'quick', lock: hit.label }); } catch (e) {}
  if (hit.label) FAC.lock(hit.label);
  if (hit.focus && mod.focus) { try { mod.focus(hit.focus, ctx); } catch (e) {} }
}
/* ctx.go in atlas mode: activate directly (no scroll), then angle, pose and focus once the room has entered.
   resolves true only when the room's focus() confirmed it could show the target */
function goAtlas(i, o) {
  const k = clamp(i, 0, rooms.length - 1), r = rooms[k];
  if (r.el.hidden) { if (r.el.dataset.side) r.el.hidden = false; else return Promise.resolve(false); }
  return activate(k, o.via || 'go', o.instant).then(async () => {
    if (active !== k) return false;
    if (o.angle != null) await ctx.angle.set(o.angle, { instant: o.instant, via: o.via });
    if (active !== k) return false;
    if (o.pose != null) { try { VIEW.set(o.pose, { instant: !!o.instant }); } catch (e) { console.warn('view.set', e); } }
    if (o.focus != null) { const m = r.mod; let ok = false; if (m && m.focus) { try { ok = !!m.focus(o.focus, ctx); } catch (e) { console.warn('focus', e); } } return ok; }
    return false;
  });
}
/* the walk: every stop that is not a side room, in section order */
function walkList() { return rooms.map((r, i) => i).filter((i) => !rooms[i].el.dataset.side && !rooms[i].el.hidden); }
function stepWalk(d, via) {
  const w = walkList(), p = w.indexOf(active);
  if (p < 0) return d < 0 ? ctx.go(w[w.length - 1], { via }) : Promise.resolve(false); /* the side room sits past the end of the walk */
  const q = clamp(p + d, 0, w.length - 1); if (q === p) return Promise.resolve(false);
  return ctx.go(w[q], { via });
}

ctx.data('tracks').then((d) => { KEYS = {}; (d.tracks || []).forEach((t) => { KEYS[t.f] = t.k; }); }).catch(() => {});

/* a room is called what its placard calls it, numbered the way the page numbers it: the threshold is not a room */
const BASE_TITLE = document.title;
const WALK = rooms.filter((r) => !r.el.dataset.side).length - 1;
const two = (n) => String(n).padStart(2, '0');
/* ctx.stops (§1.3): the rooms as stops, in section order (built after roomName/roomSay exist, below) */
let STOPS = [];
function roomName(i) { const r = rooms[i]; return r.el.dataset.title || r.id; }
function roomNo(i) { return two(rooms.slice(0, i + 1).filter((r) => !r.el.dataset.side).length - 1); }
function roomSay(i) { if (ATLAS) { const w = walkList(), p = w.indexOf(i); return p < 0 ? 'side room, ' + roomName(i) : 'stop ' + (p + 1) + ' of ' + w.length + ', ' + roomName(i); } return i === 0 ? 'threshold' : rooms[i].el.dataset.side ? 'side room, ' + roomName(i) : 'room ' + roomNo(i) + ' of ' + two(WALK) + ', ' + roomName(i); }
/* one polite line per arrival, said once the scroll has settled on a room: a flick through five rooms says one thing, not five */
const sayEl = $('#roomsay'); let sayT = 0;
function announce(i, arrived) {
  clearTimeout(sayT); if (!sayEl || !arrived || KIOSK) return;
  if (ATLAS) { sayT = setTimeout(() => { if (active === i) say(roomSay(i)); }, 800); return; }
  sayT = setTimeout(() => { if (active !== i) return; sayEl.textContent = ''; sayT = setTimeout(() => { if (active === i) sayEl.textContent = roomSay(i); }, 60); }, 800);
}

STOPS = rooms.map((r, i) => ({ i, id: r.id, name: roomName(i), say: roomSay(i), side: !!r.el.dataset.side, atlasOnly: !!r.el.dataset.atlas }));

/* one voice for the whole page (§2.2): every announcement goes through here, debounced, and the kiosk says nothing */
let sayT2 = 0;
function say(text) {
  if (!sayEl || KIOSK || text == null) return;
  clearTimeout(sayT2); sayEl.textContent = ''; sayT2 = setTimeout(() => { sayEl.textContent = String(text); }, 60);
}
/* nav dots */
const nav = $('#dots'); const dots = rooms.map((r, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dot'; b.setAttribute('aria-label', roomSay(i)); b.dataset.t = i === 0 ? 'threshold' : roomNo(i) + ' · ' + roomName(i); b.addEventListener('click', () => ctx.go(i)); if (!r.el.dataset.side) nav.appendChild(b); return b; /* side rooms get no dot */ });

const io = new IntersectionObserver((es) => {
  es.forEach((e) => {
    if (!e.isIntersecting) return; const k = sections.indexOf(e.target);
    if (jumpTo >= 0) { if (performance.now() - jumpT < 1500 && k !== jumpTo) return; jumpTo = -1; clearTimeout(jumpTimer); }
    activate(k);
  });
}, { rootMargin: '-49% 0px -49% 0px', threshold: 0 });
if (!ATLAS) sections.forEach((s) => io.observe(s)); /* atlas mode has no scroll: ctx.go activates directly */

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return; /* cmd+l, cmd+m, cmd+arrowdown belong to the browser */
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (labelDlg && labelDlg.open && e.key !== 'l') return; /* the label is a modal: arrows and space belong to it while it is open */
  if (ATLAS) { atlasKey(e); return; }
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button,a,[role=button]'))) { e.preventDefault(); ctx.go(active + 1); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); ctx.go(active - 1); }
  else if (e.key === 'm') { $('#mute').click(); }
  else if (e.key === 'l') { toggleLabel(); }
  else if (e.key === 'Home') { e.preventDefault(); ctx.go(0); }
  else if (e.key === 'End') { e.preventDefault(); let k = rooms.length - 1; while (k > 0 && (rooms[k].el.hidden || rooms[k].el.dataset.side)) k--; ctx.go(k); } /* the end of the walk, not the side room */
});

/* atlas keyboard (§2.5). a module may own a key through ctx.keys.on(key, fn); fn returning false hands it back to the
   default below. arrow keys, + - 0 and escape on the focused field (#atlas-stage) belong to the camera (M2) */
function atlasKey(e) {
  const k = e.key, t = e.target;
  if (GEST.stage && t === GEST.stage && /^(Arrow|\+|=|-|0$|Escape)/.test(k)) return;
  if (e.defaultPrevented) return;
  const hs = KEYMAP[k];
  if (hs && hs.length) { for (let q = hs.length - 1; q >= 0; q--) { let r; try { r = hs[q](e); } catch (x) { console.warn('key', k, x); } if (r !== false) { e.preventDefault(); return; } } }
  const onBtn = t && t.closest && t.closest('button,a,[role=button]');
  const tourStep = (d) => { e.preventDefault(); if (d > 0) FAC.tour.next(); else FAC.tour.prev(); };
  if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ']' || k === 'j' || (k === ' ' && !onBtn)) tourStep(1);
  else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === '[' || k === 'k') tourStep(-1);
  else if (k === '.') { e.preventDefault(); ctx.angle.next(); }
  else if (k === ',') { e.preventDefault(); ctx.angle.prev(); }
  else if (k === 'Home' || k === 'h') { e.preventDefault(); ctx.go(walkList()[0], { via: 'key' }); }
  else if (k === 'End') { e.preventDefault(); const w = walkList(); ctx.go(w[w.length - 1], { via: 'key' }); }
  else if (/^[0-9]$/.test(k)) { const n = k === '0' ? 10 : +k, w = walkList(); if (n <= w.length) { e.preventDefault(); ctx.go(w[n - 1], { via: 'key' }); } }
  else if (k === '+' || k === '=') { e.preventDefault(); try { VIEW.zoomBy(1.25); } catch (x) {} }
  else if (k === '-') { e.preventDefault(); try { VIEW.zoomBy(0.8); } catch (x) {} }
  else if (k === 'r' || k === 'Escape') { try { VIEW.home({}); } catch (x) {} }
  else if (k === 'm') { $('#mute').click(); }
  else if (k === 'l') { toggleLabel(); }
}

/* threshold */
const enter = $('#enter'), enterQuiet = $('#enter-quiet'), muteBtn = $('#mute');
function begin(sound) { if (ATLAS) return; /* the doors are hidden in atlas mode; the tour engine owns arrival (§2.1) */ document.body.classList.add('entered'); if (sound) { A.unlock(); } else { A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; } ctx.go(1); }
enter.addEventListener('click', () => begin(true));
enterQuiet.addEventListener('click', () => begin(false));
muteBtn.addEventListener('click', () => { const m = !A.muted; A.mute(m); if (!m) A.unlock(); muteBtn.setAttribute('aria-pressed', String(m)); muteBtn.textContent = m ? 'sound off' : ATLAS && A.state() !== 'on' ? '♪ tap for sound' : 'sound on'; });
/* atlas: the button says the state (K5), so it catches up when the context starts running a moment after the click */
if (ATLAS) A.onChange((s) => { if (s === 'on') muteBtn.textContent = 'sound on'; });
/* a hidden tab is suspended by the shell (A.away keeps that from reading as sound off); back in view it resumes, and if the
   browser will not resume without a gesture (ios), sound reads off again and the next tap arms it */
document.addEventListener('visibilitychange', () => {
  if (!A.ac) return;
  if (document.hidden) { A.away = true; try { const p = A.ac.suspend(); if (p && p.catch) p.catch(noop); } catch (e) {} return; }
  A.away = false;
  if (!A.muted) { A.resume(); A.rearm(); setTimeout(() => A.settle(), 500); } else A.settle();
});

/* exit: hand the link on. the native share sheet where there is one, the clipboard otherwise */
const shareBtn = $('#share');
if (shareBtn) shareBtn.addEventListener('click', async () => {
  const url = location.origin + location.pathname, say = (m) => { const was = 'send this to someone'; shareBtn.textContent = m; setTimeout(() => { shareBtn.textContent = was; }, 2200); };
  try { if (navigator.share) { await navigator.share({ title: BASE_TITLE, url }); return; } await navigator.clipboard.writeText(url); say('link copied'); } catch (e) { if (e && e.name !== 'AbortError') say(url.replace(/^https?:\/\//, '')); }
});

/* ------------------------------------------------------------------ wall labels */
const labelBtn = $('#labelbtn'), labelDlg = $('#label');
function renderLabel() {
  const L = LABELS[rooms[Math.max(0, active)].id]; if (!L || !labelDlg) return;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const box = $('.lb-body', labelDlg); box.textContent = '';
  box.appendChild(el('p', 'lb-k', L.kicker)); box.appendChild(el('h3', 'lb-t', L.title)); if (L.by) box.appendChild(el('p', 'lb-by', L.by));
  const dl = el('dl', 'lb-rows'); L.rows.forEach(([k, v, o]) => { if (o && o.atlasOnly && !ATLAS) return; if (o && o.rollbackOnly && ATLAS) return; if (o && o.need && !tierHas(o.need)) return; dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', '', ATLAS && o && o.atlas ? o.atlas : v)); }); /* a third element carries the atlas-mode wording; ?atlas=0 reads the second */ box.appendChild(dl);
  if (L.more) { const a = el('a', 'lb-more', L.more[1] + ' →'); a.href = L.more[0]; box.appendChild(a); }
}
/* a label row that describes a tier-B view (the day cursor, search over the whole roster) is shown only once that file has
   loaded (W54): the universe reports what it has (K4) */
function tierHas(need) {
  const u = SVC.universe, h = u && u.has; if (!h) return false;
  return need === 'days' ? h.days === true : need === 'roster' ? h.roster === 'B' : !!h[need];
}
/* wall text that is true only with a tier-B file (the day view's coverage caveat) ships as a <template data-need>: its words
   are nowhere in the page until the room reports that file loaded (K4), then it takes the template's place. checked on every
   stop and before every angle change, so it is there before the view it belongs to is (VERIFY r2 honesty #7) */
function syncNeeds() {
  const sec = rooms[active] && rooms[active].el; if (!sec) return;
  sec.querySelectorAll('template[data-need]').forEach((tp) => { if (tierHas(tp.dataset.need)) tp.replaceWith(tp.content.cloneNode(true)); });
}
/* the label opens from #labelbtn, the chrome's `more` or the l key, so on close focus goes back to whatever held it at open.
   #labelbtn is display:none in atlas mode; there, if nothing held focus (a programmatic open), focus is left where the
   browser puts it rather than parked on the chrome, which would keep the chrome from ever idling */
let labelFrom = null, pressEl = null, pressT = 0;
const shown = (el) => !!el && el.isConnected && el.getClientRects().length > 0 && !el.closest('[inert]');
/* safari does not focus a clicked button, so the control whose click is opening the label stands in for the focused one */
addEventListener('click', (e) => { pressEl = e.target && e.target.closest ? e.target.closest('button,a[href],[tabindex]') : null; pressT = performance.now(); }, true);
function toggleLabel() {
  if (!labelDlg || !labelDlg.showModal) return;
  if (labelDlg.open) { labelDlg.close(); return; }
  let a = document.activeElement; if ((!a || a === document.body) && pressEl && performance.now() - pressT < 250) a = pressEl;
  labelFrom = a && a !== document.body && !labelDlg.contains(a) ? a : null;
  renderLabel(); labelDlg.showModal();
}
if (labelBtn && labelDlg) {
  if (!labelDlg.showModal) labelBtn.remove();
  labelBtn.addEventListener('click', toggleLabel);
  $('.lb-x', labelDlg).addEventListener('click', () => labelDlg.close());
  labelDlg.addEventListener('click', (e) => { if (e.target === labelDlg) labelDlg.close(); });
  /* showModal() scopes focus to the dialog but does not wrap it: chromium parks focus on <body> for one stop past the last
     control (VERIFY r3 a11y P0). the same wrap as panels.js wireDialog; option+tab is safari's tab-to-every-control key */
  labelDlg.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || !labelDlg.open) return;
    const stops = Array.prototype.filter.call(labelDlg.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]'), (el) => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0);
    if (!stops.length) return;
    const a = document.activeElement, first = stops[0], last = stops[stops.length - 1];
    if (e.shiftKey ? (a === first || a === labelDlg) : a === last) { e.preventDefault(); try { (e.shiftKey ? last : first).focus(); } catch (x) {} }
  });
  labelDlg.addEventListener('close', () => {
    const to = [labelFrom, ATLAS ? null : labelBtn].find(shown); labelFrom = null;
    if (to) try { to.focus({ preventScroll: true }); } catch (e) {}
  });
}

/* ------------------------------------------------------------------ idle hints: one line, only after a visitor has done nothing in a room for a while */
const hintEl = $('#hint'); let hintT = 0, acted = new Set();
/* R5: the atlas line says how to listen (and how to touch, on a coarse pointer); the rollback keeps HINTS */
const hintOf = (id) => (ATLAS && ((coarse && HINTS_TOUCH[id]) || HINTS_ATLAS[id])) || HINTS[id];
function armHint() {
  clearTimeout(hintT); if (hintEl) hintEl.classList.remove('on');
  const id = rooms[Math.max(0, active)].id; if (!hintEl || !hintOf(id) || acted.has(id) || KIOSK) return;
  hintT = setTimeout(() => {
    if (rooms[active].id !== id || acted.has(id)) return;
    /* atlas: the stage belongs to the field, labels and chips; the hint is one toast line at the bottom, never during a tour */
    if (ATLAS) { const ta = FAC.tour.active; if (!(ta && ta.playing) && toastBandClear()) FAC.toast(hintOf(id), 5200, { wait: true }); return; }
    const s = stage();
    hintEl.textContent = hintOf(id);
    hintEl.style.maxWidth = Math.min(480, s.w, W - 32) + 'px';
    hintEl.style.width = ''; hintEl.style.left = '0px'; hintEl.style.top = '-9999px';
    requestAnimationFrame(() => placeHint(id, s));
  }, 9000);
}
/* atlas: the chrome puts its toast in one band, just above the info card upright and under the stage sideways. the hint is
   a courtesy, so it is only said when that band holds none of what the room drew (glyph cells or overlay marks): the
   yours bars and a graveyard pile stand exactly there on a phone */
function toastBandClear() {
  const ins = ATL.insets || {}, s = stage(), portrait = W <= H * 1.15;
  const cx = portrait ? W / 2 : s.x + s.w / 2, hw = Math.min(portrait ? W - 32 : s.w, 520) / 2;
  const Bt = portrait ? (ins.bottom > 0 ? ins.bottom - 8 : s.y + s.h) : H - 22, T = Bt - (portrait ? 48 : 36), L = cx - hw, R = cx + hw;
  let lit = 0;
  try {
    const b = GF.buffers();
    if (b && b.cols) {
      const d = DPR, c0 = clamp(Math.floor((L * d - b.gx0) * b.invCw), 0, b.cols - 1), c1 = clamp(Math.floor((R * d - b.gx0) * b.invCw), 0, b.cols - 1);
      const r0 = clamp(Math.floor((T * d - b.gy0) * b.invCh), 0, b.rows - 1), r1 = clamp(Math.floor((Bt * d - b.gy0) * b.invCh), 0, b.rows - 1);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (GF.glyphAt(r * b.cols + c)) lit++;
    }
  } catch (e) {}
  if (lit > 2) return false;
  try {
    const x0 = Math.max(0, Math.floor(L)), y0 = Math.max(0, Math.floor(T)), w = Math.min(W, Math.ceil(R)) - x0, h = Math.min(H, Math.ceil(Bt)) - y0;
    if (w > 0 && h > 0) { const a = og.getImageData(x0 * ODPR, y0 * ODPR, w * ODPR, h * ODPR).data; let ink = 0; for (let k = 3; k < a.length; k += 4) if (a[k] > 110) ink++; if (ink > 30 * ODPR * ODPR) return false; }
  } catch (e) {}
  return true;
}
/* the hint goes where nothing else is: not on the room's text or controls, not on the title bar, the dots, the placard
   button or the dock, not on any box a room marks [data-keepout] or returns from keepout(ctx), and not on what the room
   has drawn on the overlay canvas (the calendar's 11.8% and 22.7% are drawn there, not in the DOM). top of the stage
   first, since the controls live at the bottom; if no spot is clear the hint stays away. */
function placeHint(id, s) {
  if (rooms[active].id !== id || acted.has(id)) return;
  const hw = Math.ceil(hintEl.getBoundingClientRect().width) + 1; if (hw < 2) return; /* measured off screen at its natural width; it is pinned to a width below so it never re-wraps against the right edge */
  const sec = rooms[active].el, boxes = [], pad = 8;
  const add = (r) => { if (r && r.width > 0 && r.height > 0) boxes.push(r); };
  sec.querySelectorAll('.room-body *, .wall *').forEach((el) => {
    const ctl = /^(BUTTON|A|INPUT|SELECT|SUMMARY|LABEL)$/i.test(el.tagName);
    if (!ctl && ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.06) return;
    add(el.getBoundingClientRect());
  });
  document.querySelectorAll('[data-keepout], #top > *, #dots, #exdock').forEach((el) => { if (el.offsetParent !== null || getComputedStyle(el).position === 'fixed') add(el.getBoundingClientRect()); });
  const mod = rooms[active].mod; if (mod && mod.keepout) { try { (mod.keepout(ctx) || []).forEach((r) => add({ left: r.x, top: r.y, right: r.x + r.w, bottom: r.y + r.h, width: r.w, height: r.h })); } catch (e) {} }
  if (sigOn) add({ left: sigX, top: sigY - 12, right: sigX + sigW, bottom: sigY + 4, width: sigW, height: 16 });
  /* what the room drew on the overlay: one read of the stage into a summed table of solid pixels, so each candidate costs four lookups */
  let sat = null, ix = 0, iy = 0, sw = 0, sh = 0;
  try {
    ix = Math.max(0, Math.floor(s.x - 40)); iy = Math.max(0, Math.floor(s.y));
    const iw = Math.min(W, Math.ceil(s.x + s.w + 40)) - ix, ih = Math.min(H, Math.ceil(s.y + s.h)) - iy;
    if (iw > 0 && ih > 0) {
      const d = og.getImageData(ix * ODPR, iy * ODPR, iw * ODPR, ih * ODPR), a = d.data; sw = d.width; sh = d.height;
      sat = new Uint32Array((sw + 1) * (sh + 1));
      for (let y = 0; y < sh; y++) { let row = 0; for (let x = 0; x < sw; x++) { if (a[(y * sw + x) * 4 + 3] > 110) row++; sat[(y + 1) * (sw + 1) + x + 1] = sat[y * (sw + 1) + x + 1] + row; } }
    }
  } catch (e) { sat = null; }
  const inkAt = (L, T, R, Bt) => {
    if (!sat) return 0;
    const x0 = clamp(Math.floor((L - ix) * ODPR), 0, sw), x1 = clamp(Math.ceil((R - ix) * ODPR), 0, sw), y0 = clamp(Math.floor((T - iy) * ODPR), 0, sh), y1 = clamp(Math.ceil((Bt - iy) * ODPR), 0, sh), S = sw + 1;
    return sat[y1 * S + x1] - sat[y0 * S + x1] - sat[y1 * S + x0] + sat[y0 * S + x0];
  };
  /* try it at its natural width first, then narrower (more lines), which fits between things more often */
  const nat = hw; let best = null;
  for (const wid of [nat, Math.max(200, Math.round(nat * 0.62))]) {
    if (wid > nat || (best && best.n === 0)) break;
    hintEl.style.width = wid + 'px'; const ht = hintEl.offsetHeight;
    const cxs = [0.5, 0, 1, 0.25, 0.75].map((f) => clamp(s.x + wid / 2 + (s.w - wid) * f, wid / 2 + 12, W - wid / 2 - 12));
    for (let y = s.y + 4; y + ht <= s.y + s.h - 4; y += 4) {
      for (const cx of cxs) {
        const L = cx - wid / 2 - pad, R = cx + wid / 2 + pad, T = y - pad, Bt = y + ht + pad;
        if (boxes.some((r) => r.left < R && r.right > L && r.top < Bt && r.bottom > T)) continue;
        const n = inkAt(L, T, R, Bt);
        if (!best || n < best.n) best = { x: cx, y, n, w: wid, lim: (Bt - T) * ODPR };
        if (n === 0) break;
      }
      if (best && best.n === 0) break;
    }
  }
  if (best) hintEl.style.width = best.w + 'px';
  /* a clear spot, or one that only crosses a hairline (the calendar's dotted line on a short screen). anything more is
     a label or a number, and saying nothing beats covering the thing the room is showing */
  if (!best || best.n > best.lim) return;
  hintEl.style.left = best.x + 'px'; hintEl.style.top = best.y + 'px';
  hintEl.classList.add('on');
}
const didAct = (e) => { if (active < 0 || !e.target.closest || !e.target.closest('section[data-room]') || e.target.closest('.wall a')) return; acted.add(rooms[active].id); clearTimeout(hintT); if (hintEl) hintEl.classList.remove('on'); };
addEventListener('pointerdown', didAct, { passive: true }); addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || /^[tqn]$/i.test(e.key) || /^Arrow(Left|Right)$/.test(e.key)) didAct(e); });

/* ------------------------------------------------------------------ kiosk: exhibit.html?kiosk=1 runs unattended. it walks the rooms, lets each one demonstrate itself, and starts over */
const KIOSK = /[?&]kiosk=1\b/.test(location.search); let kioskT = 0, demoT = 0, lastTouch = 0;
const HANDSOFF = 45000; /* nothing demonstrates itself until the screen has been left alone this long */
/* a demo is a sequence of timers. the moment a real hand arrives, stop the one that is running and do not start another */
function stopDemo() {
  clearTimeout(demoT); demoT = 0; ctx.demoStopped = true;
  const r = rooms[active]; if (r && r.mod && r.mod.stopDemo) { try { r.mod.stopDemo(ctx); } catch (e) {} }
}
function kioskStep() {
  clearTimeout(kioskT); clearTimeout(demoT); if (!KIOSK) return;
  const dwell = active === 0 ? 14000 : rooms[active].id === 'make' ? 44000 : 32000;
  kioskT = setTimeout(() => {
    if (performance.now() - lastTouch < HANDSOFF) return kioskStep(); /* someone is using it: wait */
    goK = -1; const nx = active + 1; ctx.go(nx >= rooms.length || rooms[nx].el.hidden || rooms[nx].el.dataset.side ? 0 : nx);
  }, dwell);
  const r = rooms[active];
  if (r && r.mod && r.mod.demo && performance.now() - lastTouch > HANDSOFF) demoT = setTimeout(() => {
    demoT = 0;
    if (rooms[active] !== r || performance.now() - lastTouch <= HANDSOFF) return;
    ctx.demoStopped = false; try { r.mod.demo(ctx); } catch (e) {}
  }, 3500);
}
if (KIOSK) {
  document.documentElement.classList.add('kiosk'); lastTouch = -1e9;
  try { history.scrollRestoration = 'manual'; } catch (e) {} scrollTo(0, 0); /* a reload on a gallery screen starts at the threshold, not wherever the last loop was */
  document.body.classList.add('entered'); /* no threshold to click through on a gallery screen. sound needs one touch: browsers do not let a page start audio by itself */
  addEventListener('pointerdown', (e) => { if (e.isTrusted && !A.on) A.unlock(); }, { passive: true });
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, (e) => { if (!e.isTrusted) return; lastTouch = performance.now(); stopDemo(); }, { passive: true }));
}

const againBtn = $('#again'); if (againBtn) againBtn.addEventListener('click', () => { goK = -1; ctx.go(0); });

/* ------------------------------------------------------------------ signature: the title and the byline, quietly, in the corner of the stage,
   so the frames a visitor photographs carry them. drawn on the overlay canvas, which is aria-hidden, so no screen reader has to hear it twice. */
const SIG = 'mostly the machine · astralcrest', SIGFONT = '500 10px "JetBrains Mono", ui-monospace, Menlo, monospace';
const forcedColors = matchMedia('(forced-colors: active)'); /* the field keeps its own palette there, so the signature has to carry its own contrast */
let sigOn = false, sigX = 0, sigY = 0, sigW = 0, sigT = -1e9;
/* --atlas-foot (the band from the stage's foot to the viewport's) and --atlas-stage-top: exhibit.html grounds the bands
   outside the stage while the camera is away, and must stop exactly at its edges (a ground over the stage dims a room's
   own numbers: the calendar's readout sits on the stage's top edge on a phone) */
let footPx = -1, topPx = -1;
function sigPlace() {
  sigOn = false;
  if (ATLAS) {
    const s = stage(), f = Math.max(0, Math.round(H - s.y - s.h)), tp = Math.max(0, Math.round(s.y)), de = document.documentElement;
    if (f !== footPx) { footPx = f; de.style.setProperty('--atlas-foot', f + 'px'); }
    if (tp !== topPx) { topPx = tp; de.style.setProperty('--atlas-stage-top', tp + 'px'); }
  }
  if (SKY.on) skyKeep();
  if (active < 0 || !rooms[active] || H < 480) return; /* a phone held sideways has no height to spare */
  if (ATLAS && W <= H * 1.15) return; /* upright atlas: the stage has no spare band, and the brand bar carries the name */
  const s = stage();
  og.font = SIGFONT; sigW = og.measureText(SIG).width;
  /* never over a room's controls or the wall text: just under the stage first, on the stage's own bottom edge if that band is taken */
  const sec = rooms[active].el, els = [...sec.querySelectorAll('.room-body button,.room-body a,.room-body input,.room-body select,.room-body img,.room-body svg')];
  sec.querySelectorAll('.room-body *,.wall *').forEach((el) => { if (!el.firstElementChild && el.textContent && el.textContent.trim()) els.push(el); });
  const boxes = els.map((el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.06) return null;
    const r = el.getBoundingClientRect(); return r.width && r.height ? r : null;
  }).filter(Boolean);
  const nr = nav && nav.getBoundingClientRect(); /* the room dots own the right margin where they stand */
  for (const y of [s.y + s.h + 11, s.y + s.h - 3]) {
    let edge = s.x + s.w;
    if (nr && nr.width && y > nr.top - 8 && y - 12 < nr.bottom + 8) edge = Math.min(edge, nr.left - 10);
    const x = edge - sigW; if (x < s.x + 8) continue;
    const L = x - 8, R = x + sigW + 8, T = y - 13, Bt = y + 5;
    if (boxes.some((r) => r.left < R && r.right > L && r.top < Bt && r.bottom > T)) continue;
    sigX = x; sigY = y; sigOn = true; if (SKY.on) SKY.keep.push((x - 6) * DPR, (y - 14) * DPR, (x + sigW + 6) * DPR, (y + 6) * DPR); return;
  }
}
function drawSig() {
  if (!sigOn) return;
  og.setTransform(ODPR, 0, 0, ODPR, 0, 0);
  og.globalAlpha = 1; og.globalCompositeOperation = 'source-over'; og.shadowBlur = 0; og.shadowColor = 'transparent';
  if ('filter' in og) og.filter = 'none';
  og.textAlign = 'left'; og.textBaseline = 'alphabetic'; og.font = SIGFONT; og.fillStyle = forcedColors.matches ? '#ffffff' : 'rgba(240,234,255,.26)';
  og.fillText(SIG, sigX, sigY);
}

/* loop */
let last = 0, slow = 0, seen = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (document.hidden) { last = t; return; } if (reduced && t - last < 250) return;
  const dt = last ? t - last : 0;
  /* governor: after a settling second, 45 frames slower than ~38 fps cost the device its bloom */
  if (ATLAS) govern(t, dt);
  else if (gg && last) { const dt = t - last; if (++seen > 60 && dt < 200) { slow = dt > 26 ? slow + 1 : Math.max(0, slow - 0.5); if (slow > 45) { gg = null; glow.remove(); } } }
  last = t;
  const lt0 = DEBUG ? performance.now() : 0;
  glowState();
  const bands = A.bands(); drawField(t, bands);
  og.clearRect(0, 0, W, H);
  const r = rooms[active]; if (r && r.mod && r.mod.frame) {
    /* atlas: the room draws its overlay in world px; the camera's matrix is applied here, so every precision mark stays exact under any pose (§1.5) */
    if (ATLAS && VIEW.mode === 'pan') { const m = VIEW.matrix(); og.setTransform(ODPR * m[0], ODPR * m[1], ODPR * m[2], ODPR * m[3], ODPR * m[4], ODPR * m[5]); }
    try { r.mod.frame(og, t, bands, W, H, ctx); } catch (e) {}
    if (ATLAS) og.setTransform(ODPR, 0, 0, ODPR, 0, 0);
  }
  if (ATLAS && FRAMEFNS.length) { for (let k = 0; k < FRAMEFNS.length; k++) { try { FRAMEFNS[k](t, dt); } catch (e) {} } og.setTransform(ODPR, 0, 0, ODPR, 0, 0); }
  for (let k = PT.ripples.length - 1; k >= 0; k--) { const rp = PT.ripples[k], a = (t - rp.t) / 900; if (a >= 1 || a < 0) { PT.ripples.splice(k, 1); continue; } og.strokeStyle = 'rgba(125,240,200,' + (0.5 * (1 - a) * (1 - a)) + ')'; og.lineWidth = 1.2; og.beginPath(); og.arc(rp.x, rp.y, 8 + a * 120, 0, 6.283); og.stroke(); }
  if (t - sigT > 900) { sigT = t; sigPlace(); } /* rooms build their controls over a second or two: re-check the corner now and then */
  if (ATLAS && t - GATHER.t > 120) gatherWatch(t);
  drawSig();
  if (DEBUG) { LOOPH.push(performance.now() - lt0); if (LOOPH.length > 900) LOOPH.shift(); } /* ?atlasdebug=1: the whole frame's shell work (field, sky, glyphs, room, overlay), for the perf notes */
}
const LOOPH = [];
/* the dots gathering. the label layer judges a name's corner by how crowded the field is under it when it places the name,
   and a stop's names are placed while its dots are still flying in: a corner that read crowded mid-flight sent the name out
   to the second ring, ~100 px off its blob, and nothing placed it again once the field had settled (R3_REQUESTS_R2 2; the
   game's pair on a phone, 6 of 6 runs). so the shell watches a fixed sample of 1 in N/1024 dots, every 120 ms: when a field
   that was moving (mean distance to target over 3 screen px) has gathered (under 1 px), the labels are placed once more,
   against the field as it now stands. at most once every 1.5 s; a field that never stops (a turning sky) never asks */
const GATHER = { t: 0, moving: false, last: -1e9, k: 0 };
function gatherWatch(t) {
  GATHER.t = t;
  const X = P.x, Y = P.y, TX = P.tx, TY = P.ty, st = Math.max(1, (N / 1024) | 0);
  let sum = 0, m = 0;
  for (let i = GATHER.k++ % st; i < N; i += st) { const tx = TX[i]; if (tx < -40) continue; sum += Math.abs(tx - X[i]) + Math.abs(TY[i] - Y[i]); m++; } /* a parked dot (-50, -50) is not the field */
  const mean = m ? (sum / m) * (VIEW.mode === 'pan' ? VIEW.matrix()[0] : 1) : 0;
  if (mean > 3) GATHER.moving = true;
  else if (GATHER.moving && mean < 1 && t - GATHER.last > 1500) { GATHER.moving = false; GATHER.last = t; labelsRefresh(); }
}
/* atlas governor ladder (§6.6): one shared slow counter, today's arithmetic and threshold; tiers apply strictly in order,
   each followed by a settle window (120 frames and at least 3 s) before counting starts again. T1/T2 coarser cells,
   T3 bloom (irreversible, as today), T4 twinkle/glints/edges/drift, T5 labels capped at 12 and flights warp.
   recovery: 20 s at slow 0 with mean dt under 18 ms undoes the last cell step only. */
const GOV = { settle: 0, until: 0, calm0: 0, sum: 0, n: 0 };
const GOVMSG = ['', 'marks made bigger so the music keeps up', 'marks made bigger so the music keeps up'];
function govern(t, dt) {
  if (!dt || dt >= 200) return;
  if (++seen <= 60) return;
  if (GOV.settle > 0 || t < GOV.until) { if (GOV.settle > 0) GOV.settle--; GOV.calm0 = t; GOV.sum = GOV.n = 0; return; }
  slow = dt > 26 ? slow + 1 : Math.max(0, slow - 0.5);
  const tier = ATL.gov.tier;
  if (slow > 45 && tier < 5) { govTier(tier + 1); slow = 0; GOV.settle = 120; GOV.until = t + 3000; return; }
  if (slow === 0) { GOV.sum += dt; GOV.n++; if (t - GOV.calm0 > 20000 && GOV.sum / GOV.n < 18 && (tier === 1 || tier === 2)) { govTier(tier - 1); GOV.settle = 120; GOV.until = t + 3000; } }
  else { GOV.calm0 = t; GOV.sum = GOV.n = 0; }
}
function govTier(k) {
  const was = ATL.gov.tier; ATL.gov.tier = k;
  /* said once a visit: a device near the line steps down, recovers and steps down again, and the same toast every few
     minutes (mid-tour, over the caption) told the visitor nothing new. afterwards ATL.gov.lowered carries it for settings */
  if (k <= 2) { try { GF.tier(k); } catch (e) {} if (k > was && GOVMSG[k] && !ATL.gov.told) { ATL.gov.told = true; govSay(GOVMSG[k]); } }
  ATL.gov.lowered = k > 0;
  if (k >= 3 && gg) { gg = null; glow.remove(); }
  GOVFNS.slice().forEach((f) => { try { f(k); } catch (e) {} });
}
/* while a tour is playing, the stop's reveal and its caption own the screen: the governor's line waits (it landed over the
   wall's flood on a phone, VERIFY r2 beauty P2) and is said 0.4 s after the tour is paused. the tour's end drops it: the end
   card is the last thing on screen, and the line under it read as the tour's closing words (R2_VERIFY_2_beauty P1-3). tour.js
   fires its change (playing false) and then 'end' in the same turn, so the end always lands inside that wait. nothing is lost
   either way: the settings panel reads ATL.gov.lowered */
let govPend = null, govT = 0;
const tourOn = () => { const ta = FAC.tour.active; return !!(ta && ta.playing); };
function govSay(msg) {
  if (tourOn()) { govPend = msg; return; }
  govPend = null;
  if (!document.documentElement.classList.contains('ai-endcard-open')) FAC.toast(msg, undefined, { wait: true }); /* a step down under the end card: not said there either */
}
const govEnd = () => { clearTimeout(govT); govT = 0; govPend = null; };
if (ATLAS) FAC.tour.onChange(() => {
  if (!govPend || tourOn() || govT) return;
  govT = setTimeout(() => { govT = 0; if (govPend && !tourOn()) govSay(govPend); }, 400);
});
const GOVFNS = []; ATL.onGov = (fn) => sub(GOVFNS, fn);
ATL.reconfigure = () => gfConfigure(); /* M4 calls this after the detail setting changes */
/* turning a phone sideways shortens every 100vh section, so the scroll offset the visitor was standing at can land
   inside a later section and the observer hands the exhibit a room they never asked for (webkit does this every time).
   remember the room on the first raw resize event and put them back once the layout has settled.
   (atlas mode has no scroll offset to lose: the camera keeps its own pose across a resize instead, §1.5) */
let rotFrom = -1, rotT = 0;
addEventListener('resize', () => {
  if (ATLAS) { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); return; }
  if (rotFrom < 0) rotFrom = active;
  clearTimeout(resize.t); resize.t = setTimeout(resize, 150);
  clearTimeout(rotT); rotT = setTimeout(() => {
    const want = rotFrom; rotFrom = -1;
    if (want < 0 || want === active || !rooms[want]) return;
    goK = -1; rooms[want].el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, 420);
});
resize(); P.scatter();
/* the side room (your own export) stays out of the walk: one quiet link in the finale opens it, or a direct #yours link */
function openSide(id) { const k = rooms.findIndex((r) => r.id === id && r.el.dataset.side); if (k < 0) return false; rooms[k].el.hidden = false; goK = -1; requestAnimationFrame(() => ctx.go(k)); return true; }
document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href').slice(1); if (openSide(id)) { e.preventDefault(); return; } const k = rooms.findIndex((r) => r.id === id); if (k >= 0) { e.preventDefault(); goK = -1; ctx.go(k); } });
/* R11 AUDIO2: "drop the needle" lands on a new page, and a new page may not start sound by itself (ios least of all: its
   context waits for a gesture made here). so ?enter=sound puts up one veil, and its tap is that gesture: it unlocks the
   audio and starts the tour in the same press. until then the tour waits parked (url.js reads ATL.veil), so the deck never
   shows pause over silence. the tour starts once the context runs (1.5 s at most: a browser that refuses still gets its
   tour). enter or space does the same, escape and the second button come in quietly */
const VEILCSS = '#needle-veil{position:fixed;inset:0;z-index:95;background:radial-gradient(110% 80% at 50% 42%,rgba(10,1,24,.74),rgba(10,1,24,.95) 70%);transition:opacity .42s ease;-webkit-tap-highlight-color:transparent}' +
  '#needle-veil.is-off{opacity:0;pointer-events:none}' +
  '#needle-veil .nv-go{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0 16px 12vh;box-sizing:border-box;border:0;background:none;color:#f0eaff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(22px,4.5vh,40px);font:italic 400 clamp(25px,6.2vw,42px)/1.15 ui-serif,"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.005em;text-shadow:0 2px 18px rgba(10,1,24,.9)}' +
  '#needle-veil .nv-go:focus{outline:none}#needle-veil .nv-go:focus-visible .nv-t{outline:1px solid rgba(240,234,255,.7);outline-offset:10px;border-radius:2px}' +
  '#needle-veil .nv-rec{position:relative;width:min(46vw,30vh,210px);aspect-ratio:1/1}' +
  '#needle-veil .nv-rec::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 50%,#0a0118 0 2.2%,#d8d2ea 2.6% 15%,#9b93b5 15.4% 16.2%,transparent 16.6%),radial-gradient(circle at 57% 40%,rgba(10,1,24,.55) 0 1.6%,transparent 2%),conic-gradient(from 200deg,rgba(255,255,255,0) 0 8%,rgba(255,255,255,.08) 12%,rgba(255,255,255,0) 18% 58%,rgba(255,255,255,.06) 62%,rgba(255,255,255,0) 68%),repeating-radial-gradient(circle at 50% 50%,#0c0716 0 1.5px,#1a1229 1.5px 3px);box-shadow:0 0 0 1px rgba(216,210,234,.16),0 26px 70px rgba(0,0,0,.65);animation:nv-spin 1.8s linear infinite}' +
  '#needle-veil .nv-arm{position:absolute;right:-16%;top:-4%;width:2px;height:74%;margin-right:-1px;background:linear-gradient(#e9e3f7,#a59dbf);transform-origin:50% 7px;transform:rotate(4deg);transition:transform .42s cubic-bezier(.3,.7,.3,1)}' +
  '#needle-veil .nv-arm::before{content:"";position:absolute;left:50%;top:0;width:14px;height:14px;margin-left:-7px;box-sizing:border-box;border-radius:50%;background:#1a1229;border:2px solid #d8d2ea}' +
  '#needle-veil .nv-arm::after{content:"";position:absolute;left:50%;bottom:-3px;width:8px;height:15px;margin-left:-5px;border-radius:2px;background:#d8d2ea;transform:rotate(-14deg)}' +
  '#needle-veil.is-off .nv-arm{transform:rotate(24deg)}' +
  '#needle-veil .nv-q{position:absolute;left:50%;bottom:calc(max(20px,env(safe-area-inset-bottom)) + 7vh);transform:translateX(-50%);min-height:44px;padding:0 16px;border:1px solid rgba(216,210,234,.3);border-radius:3px;background:#0d0420;color:rgba(240,234,255,.84);font:500 13px/1 "JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace;letter-spacing:.05em;white-space:nowrap;cursor:pointer}' +
  '#needle-veil .nv-q:focus-visible{outline:1px solid rgba(240,234,255,.8);outline-offset:3px}' +
  '@keyframes nv-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){#needle-veil .nv-rec::before{animation:none}#needle-veil,#needle-veil .nv-arm{transition:none}}';
function needleVeil() {
  ATL.veil = true;
  const css = document.createElement('style'); css.textContent = VEILCSS; document.head.appendChild(css);
  const v = document.createElement('div'); v.id = 'needle-veil'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'sound');
  v.innerHTML = '<button type="button" class="nv-go"><span class="nv-rec" aria-hidden="true"><span class="nv-arm"></span></span><span class="nv-t">tap to drop the needle</span></button><button type="button" class="nv-q">or drop it quietly</button>';
  document.body.appendChild(v);
  const goB = v.querySelector('.nv-go'), qB = v.querySelector('.nv-q');
  let done = false;
  const roll = (t0) => {
    const T = FAC.tour, dt = performance.now() - t0;
    if ((A.ac && !A.on && !A.muted && dt < 1500) || (!atlasReady && dt < 20000)) { setTimeout(() => roll(t0), 40); return; }
    if (T.active && T.active.id && !T.isPlaying()) T.resume();
  };
  const go = (quiet) => {
    if (done) return; done = true;
    if (quiet) { A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; audioChanged(); } else A.unlock();
    ATL.veil = false; v.classList.add('is-off'); removeEventListener('keydown', key, true);
    setTimeout(() => { v.remove(); css.remove(); }, reduced ? 0 : 460);
    roll(performance.now());
  };
  const key = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.stopImmediatePropagation();
    if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === goB ? qB : goB).focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); go(true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(document.activeElement === qB); }
  };
  goB.addEventListener('click', () => go(false)); qB.addEventListener('click', () => go(true));
  addEventListener('keydown', key, true);
  try { goB.focus({ preventScroll: true }); } catch (e) {}
}
let start;
if (!ATLAS) {
  if (location.hash && rooms.some((r) => '#' + r.id === location.hash && r.el.dataset.side)) rooms.find((r) => '#' + r.id === location.hash).el.hidden = false;
  start = Math.max(0, rooms.findIndex((r) => '#' + r.id === location.hash));
  if (start > 0) { document.body.classList.add('entered'); A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; rooms[start].el.scrollIntoView(); }
} else {
  /* atlas: `#<room>` (and `#<room>&a=…&c=…`) lands on that stop; `#tour=…` starts at the threshold and url.js routes it
     once it mounts. muting follows ?enter=quiet or the visitor only (§5): a deep link never lands muted */
  let hid = ''; try { hid = decodeURIComponent(HASH0.slice(1).split('&')[0]).split('=')[0]; } catch (e) {}
  const k = rooms.findIndex((r) => r.id === hid);
  if (k >= 0 && rooms[k].el.dataset.side) rooms[k].el.hidden = false;
  start = Math.max(0, k);
  /* a tour link opens on the room its stop stands in (read the way url.js reads it; a stop held `pending` is passed over as
     tour.js passes it over), so the threshold's globe and title never show for a moment before the cut to the tour's
     first room (R2_REQUESTS_R4 V2). url.js then plays the tour from there: its first go is to the room already open */
  if (k < 0 && TOURHASH) {
    let id = TOURHASH[1], n = 1; try { id = decodeURIComponent(id); } catch (e) {}
    const m = /[#&]stop=([^&]*)/.exec(HASH0); if (m) n = Math.max(1, parseInt(m[1], 10) || 1);
    const S = ((TOURSM.TOURS || []).find((t) => t.id === id) || {}).stops;
    if (S && n <= S.length) { let j = n - 1; while (j < S.length - 1 && S[j] && S[j].pending) j++; const q = S[j] ? rooms.findIndex((r) => r.id === S[j].room && !r.el.dataset.side && !r.el.hidden) : -1; if (q >= 0) start = q; }
  }
  if (ATL.enter === 'quiet') { A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; audioChanged(); }
  /* W45: every kind of gesture arms, not only a press: a touch is given user activation on its pointerup / touchend, not its
     pointerdown, and a screen reader's activation arrives as a click. it keeps asking on every gesture until the context
     is running and the bed is playing (a first press that was refused is not the end of it); muted, it waits for the
     visitor's own unmute (the mute button unlocks inside its click) */
  /* a press that arms sound must still land on what it pressed: the sound label changes width when sound comes on, which
     moved the top bar's buttons between a mouse's pointerdown and its pointerup and lost the click (webkit, 1 run in 3).
     so while a pointer is down the state is held where it was, and published once the press has finished (its click
     included). registered before `arm`, so the hold is in place when arming runs */
  const holdAud = () => { audHold = true; clearTimeout(audHoldT); audHoldT = setTimeout(freeAud, 1500); };
  const freeAud = () => { clearTimeout(audHoldT); audHold = false; if (audPend) { audPend = false; audioChanged(); } };
  addEventListener('pointerdown', (e) => { if (e.isTrusted) holdAud(); }, { capture: true, passive: true });
  ['pointerup', 'pointercancel'].forEach((t) => addEventListener(t, () => { if (audHold) setTimeout(freeAud, 0); }, { capture: true, passive: true }));
  const arm = (e) => {
    if (!e.isTrusted || A.muted) return;
    if (e.type === 'keydown' && (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Escape')) return;
    if (A.on && A.ac && A.ac.state === 'running' && (A.cur < 0 || !A.els[A.cur].paused)) return;
    A.unlock();
  };
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((t) => addEventListener(t, arm, { capture: true, passive: true }));
  if (ATL.enter === 'sound' && !ATL.kiosk && !A.on) needleVeil();
}
activate(start, ATLAS ? 'url' : undefined);
requestAnimationFrame(loop);
/* the linked room is active and draws from this frame; its wall stays veiled (html.atlas-boot) until the chrome mounts */
/* a tap on the way in that landed before this script had loaded (a slow phone): honour it once */
if (!ATLAS && window.__pendingEnter && start === 0) {
  const s = window.__pendingEnter === 'sound'; window.__pendingEnter = null; begin(s);
  /* that tap is gone, and some browsers (ios) only start audio inside a gesture: the next real touch finishes the unlock */
  if (s) { const re = (e) => { if (!e.isTrusted) return; removeEventListener('pointerdown', re); if (!A.muted) { A.unlock(); A.rearm(); } }; addEventListener('pointerdown', re, { passive: true }); }
}
window.__pendingEnter = null;
window.__exhibit = { ctx, rooms, P, A, PAL, PROV, FAM, legend, sig: () => ({ on: sigOn, x: Math.round(sigX), y: Math.round(sigY), w: Math.round(sigW), text: SIG }) };

/* ---------------------------------------------------------------- atlas: everything that is not needed for frame one
   mounts after it (§SKELETON 2), in dependency order: content modules, then settings/menus, chrome, labels, the tour
   engine, the url (which applies the deep link once), search, ladder, photo. a module that fails to load or mount is
   skipped with a warning and the shell's inert default stays in its place. */
const MODS = [
  ['panels', (api) => {
    if (api.settings) ctx.settings = api.settings;
    /* chrome's tour chip calls panels.open(name); panels.js exposes one object per dialog */
    if (typeof api.open !== 'function') api.open = (n) => { const d = { tours: api.tours, settings: api.settingsPanel, help: api.help }[n]; if (d && typeof d.open === 'function') d.open(); };
    ATL.panels = api;
  }],
  ['chrome', (api) => { ATL.chrome = api; bootLift(); }],
  ['anchors', (api) => { ctx.labels = api; }],
  ['tour', (api) => { ctx.tour = api; if (typeof api.on === 'function') api.on('end', govEnd); }],
  ['url', (api) => { ctx.url = api; }],
  ['search', (api) => { ctx.search = api; }],
  ['ladder', (api) => { ctx.ladder = api; }],
  ['photo', (api) => { ATL.photo = api; }],
];
async function mountAtlas() {
  const [copyM, toursM, staticM] = await Promise.all([atlasImport('copy'), atlasImport('tours'), atlasImport('search-static')]);
  const COPY = copyM.COPY || copyM.default || {};
  if (COPY.stats && typeof COPY.stats === 'object') Object.assign(ctx.stats, COPY.stats);
  const deps = { COPY, TOURS: toursM.TOURS || [], LADDER: toursM.LADDER || { levels: [] }, DWELL: toursM.DWELL || { short: 0.45, normal: 1, long: 1.7 },
    SEARCH_STATIC: staticM.SEARCH_STATIC || staticM.default || {}, GF, P, A, KIOSK, DEBUG, NODRIFT, NOGLYPH, lowPower, reduced, coarse, rooms, stage, relayout };
  ATL.deps = deps;
  const loadedP = Promise.all(MODS.map(([n]) => atlasImport(n)));
  /* R5 perf: the atlas sheets load media-swapped (exhibit.html <head>); the chrome waits for them, 3 s at most, so it never
     mounts unstyled. a sheet that failed resolves too (its retry keeps its place in the cascade) */
  const sheets = [...document.querySelectorAll('link[rel=stylesheet][href*="exhibit/atlas/"]')].filter((l) => l.media === 'print');
  if (sheets.length) await Promise.race([Promise.all(sheets.map((l) => new Promise((r) => { l.addEventListener('load', r, { once: true }); l.addEventListener('error', r, { once: true }); }))), new Promise((r) => setTimeout(r, 3000))]);
  const loaded = await loadedP;
  for (let q = 0; q < MODS.length; q++) {
    const [n, put] = MODS[q], m = loaded[q] || {};
    const fn = typeof m.mount === 'function' ? m.mount : m.default && typeof m.default.mount === 'function' ? m.default.mount : null;
    if (!fn) continue;
    try { const api = await fn(ctx, deps); if (api && typeof api === 'object') put(api); } catch (e) { console.warn('atlas mount', n, e); }
  }
  bootLift(); /* a no-op once the chrome lifted it; otherwise the chrome never came and the walls are all there is */
  /* a page without its camera, gestures or renderer is not ready, whatever else mounted: it says so (loadFailed) and waits
     for the visitor's `try again`, and tests that wait on atlasReady see the failure instead of an inert stub */
  if (LOADFAIL.some((n) => CORE.includes(n))) return;
  /* chrome.js or panels.js blocked: the page draws but has no caption, ladder or dock. it says so, with the plain page as the way out */
  if (!document.getElementById('atlas-info') || !document.getElementById('atlas-dock')) {
    let p = document.getElementById('atlas-bootfail');
    if (!p) { p = document.createElement('p'); p.id = 'atlas-bootfail'; p.setAttribute('role', 'alert'); p.textContent = 'part of the atlas did not load: the connection dropped it.'; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'try again'; b.addEventListener('click', () => location.reload()); p.appendChild(b); plainLink(p); document.body.appendChild(p); }
    p.dataset.failed = 'chrome';
  }
  atlasReady = true; window.__exhibit.atlasReady = true; readyRes();
  ATL.fieldMode = FIELD;
  if (SLIME_ON) setTimeout(() => importRetry('./atlas/field.slime.js' + V).then((m) => { ATL.field = m.mount(ctx, deps); }).catch((e) => console.warn('field.slime', e)), 120);
  { const bf = document.getElementById('atlas-bootfail'); if (bf && !LOADFAIL.length && bf.dataset.failed !== 'chrome') bf.remove(); }
  /* every module learns where the visitor is standing (a stop may have been entered before they mounted) */
  const r = rooms[active]; if (r) { const ev = { i: active, id: r.id, prev: null, via: 'mount' }; STOPFNS.slice().forEach((f) => { try { f(ev); } catch (e) { console.warn('onStop', e); } }); }
  /* the ink layer loads after the atlas is up (its own module, its own canvas); without WebGL2 or a half-float target it stays off */
  if (INK_ON) setTimeout(() => importRetry('./atlas/field.ink.js' + V).then((m) => { ATL.ink = (m.mount || m.default.mount)(ctx, { P, rooms, reduced, lowPower, matrix: fieldMatrix, onGov: ATL.onGov }) || null; }).catch((e) => console.warn('field ink', e)), 300);
  if (KIOSK) { try { FAC.tour.play('grand', 0); } catch (e) { console.warn('kiosk', e); } } /* tour.js is the only autoplay driver in atlas mode (§1.10) */
}
/* R7 perf: the first stop is interactive before the atlas modules start loading (they would share a slow link and a busy main
   thread with it). waits for any stop to mount (a deep link may open on another), 2.5 s at most, then mounts as before */
if (ATLAS) requestAnimationFrame(() => { const t0 = performance.now(), go = () => { if (rooms.some((r) => r.mounted) || performance.now() - t0 > 2500) { mountAtlas().catch((e) => { console.warn('atlas', e); bootLift(); }); } else setTimeout(go, 25); }; setTimeout(go, 0); });
/* boot watchdog: a module or file that never answers leaves the atlas unmounted and the page silent. after 10 s of
   visible time (a background tab does not count: it draws no frames, so it cannot mount) the visitor gets a way out */
if (ATLAS) {
  let seen = 0, last = performance.now();
  const bootTick = () => {
    if (atlasReady || LOADFAIL.length) return; /* a failed load has already said so, with its own `try again` */
    const now = performance.now(); if (!document.hidden) seen += now - last; last = now;
    if (seen < 10000) { setTimeout(bootTick, 1000); return; }
    const p = document.createElement('p'), b = document.createElement('button');
    p.id = 'atlas-bootfail'; p.setAttribute('role', 'alert'); p.textContent = 'the atlas has not finished loading.';
    b.type = 'button'; b.textContent = 'reload'; b.addEventListener('click', () => location.reload());
    p.appendChild(b); plainLink(p); document.body.appendChild(p);
    bootLift();
  };
  setTimeout(bootTick, 1000);
}
/* debug and test handles (§11), cheap, always present */
window.__exhibit.ATLAS = ATLAS;
window.__exhibit.atlasReady = !ATLAS;
window.__exhibit.atlasFailed = LOADFAIL; /* the modules still missing after their retries (empty on a whole page) */
window.__exhibit.atlas = {
  GF, get view() { return VIEW; }, get gesture() { return GEST; }, get labels() { return FAC.labels; }, get search() { return FAC.search; }, get ladder() { return FAC.ladder; },
  get tour() { return FAC.tour; }, get chrome() { return ATL.chrome || null; }, get settings() { return FAC.settings; }, get photo() { return ATL.photo || null; },
  gov: ATL.gov, stage, walk: () => walkList(), strat: STR, govTier: (k) => govTier(clamp(k | 0, 0, 5)), sky: () => SKY, loopCost: () => LOOPH,
  glyphCfg: () => ({ mode: GCFG.mode, region: GCFG.region, zones: GCFG.zones ? GCFG.zones.slice() : null, feather: GCFG.feather, edges: GCFG.edges, bleach: GCFG.bleach }),
};
