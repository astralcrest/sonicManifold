/* glyph field renderer (BUILD_SPEC_V2 §6, module M1). the shell's drawField bins every glyph-mode dot into a cell grid
   (§6.3 accumulate, pasted into the shell's hot loop); this module owns the grid, the buffers and the pass that turns
   each occupied cell into one character: density picks the glyph, one real member dot picks the colour, and the mask is
   blitted into the same Uint32 buffer the field already writes, before putImageData. CPU only, no DOM, no fillText per
   cell, no allocation per frame (every array is sized on configure and grows only when a room asks for finer cells).
   round 2: trails (K1, render({lines})) are walked into the same lattice and drawn as glyph runs under the dots' tone
   curve; edges: 'large' (K2) keeps the Sobel rim for bodies of 40+ cells; a room's own cell stays within base +-25% (W03) */

const V = typeof import.meta !== 'undefined' && import.meta.url ? new URL(import.meta.url).search || '' : '';
const AT = await import('./glyph-atlas.js' + V);
const { buildAtlas, offsetsFor, atlasCache, probeReadback, CHARS, FAMILY_IDS, RAMP_CHARS, DIR_CHARS, FAMILIES } = AT;

const DEBUG = typeof location !== 'undefined' && /[?&]atlasdebug=1\b/.test(location.search);
/* §6.1 detail ladders (css px per cell); T1/T2 of the governor step one or two rungs coarser */
const LADDER = { desk: [5, 6, 8, 10, 12], phone: [6, 7, 9, 11, 13] };
const TH = 0.03, HAZE = 0.14, LUTN = 4096;
const FAMOF_DEFAULT = [0, 1, 2, 3, 4, 5, 0, 0]; /* cat 0 neutral, 1 tap, 2 shuffle, 3 served, 4 null, 5 ink */
/* categorical texture (D2). a cell holding at least CAT_Q of the frame's occupied cells' counts (the shell's strat pass
   uses the same 75th percentile) is full; full cells weave the family's top two levels by a hash of the cell's world
   position, partial cells step down the family by n / q. outline glyphs replace a family mark only on a coherent
   silhouette: at most TUNE.rimMax of a category's cells when it is alone on the field, and when categories mix, few
   enough that no category's share of the shape-coded cells can move more than TUNE.rimDev (1 point) from its share of
   the lit cells, in the whole frame or in any part of it: D2 read from shape stays D2. rimMax 0 turns them off */
const CAT_Q = 0.75, RIM_ORDER = [0, 1, 3, 2]; /* DIR_CHARS - / | \ : fill - first, then / and \, then | */
/* the binary Sobel only yields integers in -4..4: the edge glyph for each (gx, gy), as the continuous pass names it
   (screen rows grow downward, so gy is flipped to the usual y-up angle; the glyph names the edge, not the gradient) */
const RIMDIR = new Uint8Array(81);
for (let gx = -4; gx <= 4; gx++) for (let gy = -4; gy <= 4; gy++) { let di = Math.round((Math.atan2(-gy, gx) + 1.5707963) * 1.2732395) % 4; if (di < 0) di += 4; RIMDIR[(gx + 4) * 9 + gy + 4] = di; }

/* tone curve. v = (accW / ref) with ref = EMA of the frame's max weight; the count is compressed by GAMMA before the
   §6.4 exposure curve, because play counts are long-tailed (a map cluster holds 300 plays next to single plays) and a
   linear v would push every ordinary cell into the haze band. GAMMA 1 is the spec's literal curve. */
const TUNE = { gamma: 0.7, gain: 2.2, edgeG: 0.9, edgeN: 3, q: 0.995, floor: 1, rimMax: 0.25, rimDev: 0.01 };
const TL = new Float32Array(LUTN + 1);       /* v -> t */
const Q = new Float32Array(LUTN + 1);        /* t -> ((t - th) / (1 - th))^1.2, 0 below th */
const BR = new Float32Array(LUTN + 1);       /* t -> 0.34 + 0.66 sqrt(t) */
const HZ = new Float32Array(LUTN + 1);       /* t -> haze keep probability x 1.05 */
const BL = new Float32Array(LUTN + 1);       /* t -> bleach amount (mean colour, or a sample room that asks: room({bleach})) */
const SIN = new Float32Array(4096), SK = 4096 / (2 * Math.PI);
for (let i = 0; i < 4096; i++) SIN[i] = Math.sin(i / SK);
function luts() {
  const G = TUNE.gain, den = 1 - Math.exp(-G);
  for (let i = 0; i <= LUTN; i++) {
    const x = i / LUTN;
    TL[i] = (1 - Math.exp(-G * Math.pow(x, TUNE.gamma))) / den;
    Q[i] = x > TH ? Math.pow((x - TH) / (1 - TH), 1.2) : 0;
    BR[i] = 0.34 + 0.66 * Math.sqrt(x);
    HZ[i] = x > TH && x < HAZE ? Math.pow((x - TH) / (HAZE - TH), 0.7) * 1.05 : 2;
    const s = Math.min(1, Math.max(0, (x - 0.8) / 0.2)); BL[i] = s * s * (3 - 2 * s) * 0.35;
  }
}
luts();

/* K1 trails. a segment is walked cell by cell (every cell a half-cell sampling would land in, each once; a polyline's shared
   joint too) and each cell takes its weight, screen-blended with any other trail there (1 - (1 - a)(1 - w)), so crossings
   glow and nothing clips. the strongest segment in a cell owns its hue, its direction and where it crosses the cell.
   tone t = t0 + t1 w, through the field's own 0.34 floor brightness curve; a trail is never dithered (a dotted trail is
   its marks, not missing cells). strong: the weight from which the bright marks are used; pulseT: a pulse head's tone
   against the dots; tail: the two tail cells' pulse; bleach: how far a head goes toward white */
const LINE = { strong: 0.6, t0: 0.05, t1: 0.85, pulseT: 0.95, tail: [0.62, 0.3], bleach: 0.4 };
/* 'large' edges (K2): the Sobel rim lands only on connected lit components of at least this many cells */
const LARGE_MIN = 40;
/* W03: a room's own cell stays within base x (1 +- CELL_BAND) in device px, so the field keeps one pitch stop to stop */
const CELL_BAND = 0.25;

const cache = atlasCache(16);
const S = {
  configured: false, W: 0, H: 0, PW: 0, PH: 0, DPR: 1, lowPower: false, cellCss: 6, tier: 0, off: false,
  room: { mode: 'cont', cats: null, colour: 'sample', grid: null, cell: null, edges: true, bleach: false },
  ca: 1, ce: 0, cf: 0, lineN: 0, lineDrawn: 0, lineSegs: 0, lineMs: 0, ccGen: 0, ccBig: 0, ccN: 0,
  famOf: new Uint8Array(FAMOF_DEFAULT), capOf: new Uint8Array(8), kx0: 0, ky0: 0, catQ: 0,
  catN: new Uint32Array(8), catR: new Uint32Array(32), catTH: new Uint8Array(32), catRM: new Uint32Array(32), catHB: new Uint32Array(32 * 64), catRim: new Float64Array(8),
  cap: 0, occN: 0, lastMean: false, lastCols: 0, lastRows: 0, lastAtlas: null,
  cellW: 0, cellH: 0, gx0: 0, gy0: 0, cols: 0, rows: 0, colX0: new Int32Array(2), rowY0: new Int32Array(2),
  atlas: null, offs: null, dirty: true, a: 1, e: 0, f: 0,
  ema: 0, seeded: false, t: 0,
  readbackOK: null, fontGen: 0, fontWatch: false, builds: 0, fontRebuilds: 0, renders: 0, drawn: 0,
  dbg: DEBUG, catCells: new Float64Array(8), catDots: new Float64Array(8), catDotsW: new Float64Array(8), refDots: null,
};
/* the buffers the shell reads once per frame (one stable object, fields swapped only on growth) */
/* cwk: per-cell reservoir key for the shell's sample test, u = frac(seed * 9301 + cwk[ci]). each cell re-keys once per
   2 s window at its own phase, so a mixed cell slowly cycles through its real members and nothing re-shuffles in step */
const B = { accW: null, accR: null, accG: null, accB: null, pickC: null, pickK: null, nIn: null, occ: null, cwk: null, cols: 0, rows: 0, gx0: 0, gy0: 0, invCw: 1, invCh: 1, meanCol: false };
let tG = null, gIdx = null, hsh = null, scratch = null, rimD = null, rimB = null, drk = null;
/* trail cells, data-oriented: lK[ci] = the cell's place k in this frame's trail list + 1 (0: no trail), and everything
   else by k, so a new trail cell writes only the next slot of each list and the glyph pass reads them in order. by k:
   lOcc (the cell), lXY (row << 16 | col), sW (combined weight), sM (strongest weight), sP (pulse), sFr (where the strongest
   segment crosses the column's centre, 0 top .. 1 bottom), sHue (its hue), lCol (its packed colour), lG (its mark | SLOW |
   direction class and corner flag << 20), lDn (the frame stamp when a dot glyph took the cell). components ('large'):
   visit and big stamps, a flood stack, a cell list */
let lK = null, lOcc = null, lXY = null, sW = null, sM = null, sP = null, sFr = null, sHue = null, lG = null, lCol = null, lDn = null, ccV = null, ccB = null, ccS = null, ccL = null;
const HIST = new Uint32Array(1024), NHIST = new Uint32Array(256);

function ensure(cells) {
  if (cells <= S.cap) return;
  const cap = Math.ceil(cells * 1.25) + 64;
  B.accW = new Uint32Array(cap); B.accR = new Float64Array(cap); B.accG = new Float64Array(cap); B.accB = new Float64Array(cap);
  B.pickC = new Uint32Array(cap); B.pickK = new Uint8Array(cap); B.nIn = new Uint32Array(cap); B.occ = new Int32Array(cap); B.cwk = new Float64Array(cap);
  S.keyT = -1e9;
  tG = new Float32Array(cap); gIdx = new Uint8Array(cap); scratch = new Float64Array(cap); drk = new Int32Array(cap);
  hsh = new Float32Array(cap); rimD = new Uint8Array(cap); rimB = new Uint8Array(cap);
  lK = new Int32Array(cap); sW = new Float32Array(cap); sM = new Float32Array(cap); sP = new Float32Array(cap); sFr = new Float32Array(cap); sHue = new Uint32Array(cap);
  lOcc = new Int32Array(cap); lXY = new Int32Array(cap); lG = new Uint32Array(cap); lCol = new Uint32Array(cap); lDn = new Uint32Array(cap); ccV = new Uint32Array(cap); ccB = new Uint32Array(cap); ccS = new Int32Array(cap); ccL = new Int32Array(cap);
  for (let i = 0; i < cap; i++) { let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; hsh[i] = (h >>> 0) / 4294967296; }
  S.cap = cap; S.occN = 0; S.lineN = 0; S.keyCells = -1; S.ccGen = 0;
}

/* a pitch-locked grid keeps the room's cell as asked: declared (`lock`), or a divide grid whose cell is at least its pitch,
   which is a room asking for one cell per pitch (the calendar's months on a phone) */
function pitchLocked() {
  const R = S.room, g = R.grid;
  return !!g && (g.lock || (g.fit === 'divide' && R.cell != null && R.cell >= g.pw - 1e-6));
}
/* the room's cell, held to base +- CELL_BAND in whole device px (what the lattice is built from), so every stop draws at
   about one pitch. a value inside the band is returned untouched, so a room that asked for one keeps it exactly */
function roomCell() {
  const R = S.room, base = S.cellCss;
  if (R.cell == null) return base;
  if (pitchLocked()) return R.cell;
  const D = S.DPR, d = Math.max(3, Math.round(R.cell * D)), lo = Math.ceil(base * (1 - CELL_BAND) * D - 1e-6), hi = Math.floor(base * (1 + CELL_BAND) * D + 1e-6);
  if (lo > hi) return R.cell;
  const dc = d < lo ? lo : d > hi ? hi : d;
  return dc === d ? R.cell : dc / D;
}

function cellCssEff() {
  const L = S.lowPower ? LADDER.phone : LADDER.desk;
  let c = roomCell();
  for (let k = 0; k < S.tier; k++) { let nx = -1; for (let i = 0; i < L.length; i++) if (L[i] > c + 1e-6) { nx = L[i]; break; } c = nx < 0 ? c + 2 : nx; }
  return c;
}

/* the cell (device px) a room grid gets at pan zoom a, for target cell cwT x chT: the one formula layout() uses, exported
   as GF.cellFor so a room never has to copy it */
function gridCell(g, a, cwT, chT) {
  const sc = a * S.DPR, pw = Math.max(1e-3, (+g.pw || 1) * sc), ph = Math.max(1e-3, (+(g.ph || g.pw) || 1) * sc);
  let cw, ch;
  if (g.fit === 'divide') {
    cw = pw / Math.max(1, Math.round(pw / cwT));
    ch = g.ph ? ph / Math.max(1, Math.round(ph / chT)) : cw * 1.8;
  } else {
    cw = pw * Math.max(1, Math.round(cwT / pw));
    ch = ph * Math.max(1, Math.round(chT / ph));
  }
  while (cw < 3) cw *= 2;
  while (ch < 4) ch *= 2;
  return [cw, ch];
}

function atlasFor(aw, ah) {
  if (S.readbackOK === null) S.readbackOK = probeReadback();
  const fb = !S.readbackOK;
  return cache.get(aw + 'x' + ah + (fb ? 'b' : 'f') + S.fontGen, () => { S.builds++; return buildAtlas(aw, ah, { fallback: fb }); });
}

/* the cell lattice for this frame: the screen grid, or a room's grid aligned to its natural pitch (§6.3) under the
   pan camera (a, e, f). recomputed only when something it depends on changed. */
function layout(a, e, f) {
  const g = S.room.grid;
  if (!S.dirty && (!g || (a === S.a && e === S.e && f === S.f))) return;
  S.dirty = false; S.a = a; S.e = e; S.f = f;
  const DPR = S.DPR, cwT = Math.max(3, Math.round(cellCssEff() * DPR)), chT = Math.round(cwT * 1.8);
  let cw = cwT, ch = chT, gx0 = 0, gy0 = 0;
  if (g) {
    [cw, ch] = gridCell(g, a, cwT, chT);
    const ox = ((+g.ox || 0) * a + e) * DPR, oy = ((+g.oy || 0) * a + f) * DPR;
    gx0 = ox - Math.ceil(ox / cw) * cw; gy0 = oy - Math.ceil(oy / ch) * ch;
    if (gx0 > 0) gx0 -= cw; if (gy0 > 0) gy0 -= ch;
    /* screen column c is the room grid's column c + kx0: the categorical weave hashes that, so it rides a pan */
    S.kx0 = Math.round((gx0 - ox) / cw); S.ky0 = Math.round((gy0 - oy) / ch);
  } else { S.kx0 = 0; S.ky0 = 0; }
  const cols = Math.max(1, Math.ceil((S.PW - gx0) / cw)), rows = Math.max(1, Math.ceil((S.PH - gy0) / ch));
  ensure(cols * rows);
  if (S.colX0.length < cols + 1) S.colX0 = new Int32Array(cols + 16);
  if (S.rowY0.length < rows + 1) S.rowY0 = new Int32Array(rows + 16);
  for (let c = 0; c <= cols; c++) S.colX0[c] = Math.round(gx0 + c * cw);
  for (let r = 0; r <= rows; r++) S.rowY0[r] = Math.round(gy0 + r * ch);
  S.cellW = cw; S.cellH = ch; S.gx0 = gx0; S.gy0 = gy0; S.cols = cols; S.rows = rows;
  S.atlas = atlasFor(Math.max(2, Math.floor(cw)), Math.max(3, Math.floor(ch)));
  S.offs = offsetsFor(S.atlas, S.PW);
  B.cols = cols; B.rows = rows; B.gx0 = gx0; B.gy0 = gy0; B.invCw = 1 / cw; B.invCh = 1 / ch;
}

function watchFonts() {
  if (S.fontWatch || typeof document === 'undefined' || !document.fonts) return;
  S.fontWatch = true;
  let p;
  try { p = document.fonts.load('500 16px "JetBrains Mono"', CHARS.join('')); } catch (e) { p = null; }
  Promise.resolve(p).catch(() => {}).then(() => document.fonts.ready).catch(() => {}).then(() => {
    /* exactly one rebuild once the webfont is in: new font generation, fresh readback probe, lazy re-layout */
    S.fontGen++; S.fontRebuilds++; cache.clear(); S.readbackOK = probeReadback(); S.dirty = true;
  });
}

/* '#rrggbb' / '#rgb' / 0xRRGGBB -> the field's ABGR word, cached (a room passes the same few hues every frame) */
const HEXC = new Map();
/* the last four inputs and their words: a room's few hues (an arm's, the fog's) alternate segment to segment */
const HK = [null, null, null, null], HV = [0, 0, 0, 0]; let HI0 = 0;
function abgrOf(c) {
  if (c === HK[0]) return HV[0]; if (c === HK[1]) return HV[1]; if (c === HK[2]) return HV[2]; if (c === HK[3]) return HV[3];
  if (typeof c === 'number') { const n = c >>> 0; return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >>> 16) & 255)) >>> 0; }
  let v = HEXC.get(c);
  if (v === undefined) {
    let n = 0xa49bbd;
    const m = typeof c === 'string' ? /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(c.trim()) : null;
    if (m) { let h = m[1]; if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; n = parseInt(h, 16); }
    v = (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >>> 16) & 255)) >>> 0;
    if (HEXC.size > 255) HEXC.clear();
    HEXC.set(c, v);
  }
  HK[HI0] = c; HV[HI0] = v; HI0 = (HI0 + 1) & 3;
  return v;
}

/* the lattice cell holding device point (x, y) inside the clip rectangle, or -1 */
function cellAtDev(x, y, X0, Y0, X1, Y1) {
  if (!(x >= X0 && y >= Y0 && x <= X1 && y <= Y1)) return -1;
  let cx = ((x - S.gx0) / S.cellW) | 0, cy = ((y - S.gy0) / S.cellH) | 0;
  if (cx >= S.cols) cx = S.cols - 1; if (cy >= S.rows) cy = S.rows - 1;
  return cy * S.cols + cx;
}
/* a trail cell's mark (continuous rooms: ' · . faint, ¯ - _ bright, : | steep, / \ bright diagonals, a bright line's
   corner cell faint; categorical rooms: the family-free · ¦ and the outline set). fr = where the line crosses the column's
   centre, 0 top .. 1 bottom */
function lineGlyph(LG, dir, cat, cls, corner, strong, fr) {
  const body = strong && !corner;
  if (cls === 2) return body ? LG[8] : cat ? LG[6] : LG[7];
  if (cls !== 0 && body) return cls === 1 ? LG[9] : LG[10];
  if (cat) return strong && cls === 0 ? dir[0] : LG[1];
  const pos = fr < 0.3333 ? 0 : fr > 0.6667 ? 2 : 1;
  return strong && cls === 0 ? LG[3 + pos] : LG[pos];
}
/* a trail segment's own colour at its weight, packed: the glyph pass reuses it wherever one segment owns a cell alone */
function linePacked(col, w) {
  let tl = LINE.t0 + LINE.t1 * w; if (tl > 1) tl = 1;
  const B0 = BR[(tl * LUTN) | 0];
  let r = col & 255, g = (col >>> 8) & 255, b = (col >>> 16) & 255, m = r > g ? r : g; if (b > m) m = b;
  if (m < 1) { r = g = b = m = 1; }
  const k = B0 * 255 / m, R = r * k, G = g * k, Bc = b * k;
  return (0xff000000 | ((Bc > 255 ? 255 : Bc) << 16) | ((G > 255 ? 255 : G) << 8) | (R > 255 ? 255 : R)) >>> 0;
}
/* the cell's mark packed with the recompute flag: set when a second trail crosses the cell or a pulse lights it, so the
   glyph pass recomputes mark and colour from the record; clear, it draws what the owning segment's walk chose */
const SLOW = 0x10000, PULSE = 0x20000; /* PULSE: sP[k] is this frame's (a new cell never clears it) */
/* one trail cell from the pulse path (a head can land in a cell the walk crossed only at a vertex). the corner test is
   the walk's: the chord of the whole line through the cell against half of one cell's step (adv) */
function lineCell(ci, w, col, pk, cls, uS, vS, du, dv, adv) {
  const cy = (ci / S.cols) | 0, cx = ci - cy * S.cols, at = S.atlas;
  let own = true, k = lK[ci] - 1;
  if (k < 0) { if (S.lineN >= S.cap) return -1; k = S.lineN++; lK[ci] = k + 1; lOcc[k] = ci; lXY[k] = (cy << 16) | cx; sW[k] = w; lG[k] = 0; }
  else { const o = sW[k]; sW[k] = o + w - o * w; own = w > sM[k]; lG[k] |= SLOW; }
  if (own) {
    const fr = cls === 2 ? 0 : vS + (cx + 0.5 - uS) * (dv / du) - cy;
    let t0 = -1e30, t1 = 1e30;
    if (du !== 0) { let p = (cx - uS) / du, q = (cx + 1 - uS) / du; if (p > q) { const x = p; p = q; q = x; } if (p > t0) t0 = p; if (q < t1) t1 = q; }
    if (dv !== 0) { let p = (cy - vS) / dv, q = (cy + 1 - vS) / dv; if (p > q) { const x = p; p = q; q = x; } if (p > t0) t0 = p; if (q < t1) t1 = q; }
    const cn = t1 - t0 < 0.5 * adv ? 4 : 0;
    sM[k] = w; sFr[k] = fr; sHue[k] = col; lCol[k] = pk;
    lG[k] = (lG[k] & (SLOW | PULSE)) | ((cls | cn) << 20) | lineGlyph(at.line, at.dir, S.room.mode === 'cat', cls, cn, w >= LINE.strong, fr);
  }
  return k;
}

/* K1: every segment into the trail buffers, before the glyph pass. segs = [{x0, y0, x1, y1, w, c, pulse}] or a packed
   Float32Array/Float64Array of 7 per segment (x0 y0 x1 y1 w 0xRRGGBB pulse, NaN = no pulse), in the particles' space (css
   px before the pan camera, as P.x/P.y), so a trail stays on its dots under pan and zoom. a segment joined to the one
   before it (same start as that one's end) does not take the joint cell twice. an end at or beyond -1e4 (the rooms'
   behind-the-camera mark) or not finite drops the segment. pulse p (0..1 along the segment, any number allowed so a
   polyline can pass one position to every piece) lights the head at p and a two-cell tail behind it.
   storage: see lK above */
function depositLines(L, reduced) {
  const packed = ArrayBuffer.isView(L), n = packed ? (L.length / 7) | 0 : L.length | 0;
  if (!n || !lK) return 0;
  const DPR = S.DPR, a = S.ca * DPR, e = S.ce * DPR, f = S.cf * DPR;
  const cw = S.cellW, ch = S.cellH, gx0 = S.gx0, gy0 = S.gy0, cols = S.cols, rows = S.rows, iw = 1 / cw, ih = 1 / ch;
  const X0 = Math.max(gx0, 0), Y0 = Math.max(gy0, 0), X1 = Math.min(gx0 + cols * cw, S.PW) - 1e-3, Y1 = Math.min(gy0 + rows * ch, S.PH) - 1e-3;
  if (X1 <= X0 || Y1 <= Y0) return 0;
  const KK = lK, O = lOcc, XY = lXY, SW = sW, SM = sM, SP = sP, SF = sFr, SH = sHue, GQ = lG, CQ = lCol, cap = S.cap, cm = cols - 1, rm = rows - 1;
  const LG = S.atlas.line, DG = S.atlas.dir, catm = S.room.mode === 'cat', strongW = LINE.strong;
  let ln = S.lineN, last = -1, pxE = NaN, pyE = NaN, segs = 0, lastCol = -1, lastW = -1, pk = 0;
  for (let s = 0; s < n; s++) {
    let x0, y0, x1, y1, w, col, pulse;
    if (packed) { const o = s * 7; x0 = L[o]; y0 = L[o + 1]; x1 = L[o + 2]; y1 = L[o + 3]; w = L[o + 4]; col = abgrOf(L[o + 5]); pulse = L[o + 6]; }
    else { const g = L[s]; if (!g) { last = -1; continue; } x0 = +g.x0; y0 = +g.y0; x1 = +g.x1; y1 = +g.y1; w = +g.w; col = abgrOf(g.c); pulse = g.pulse == null ? NaN : +g.pulse; }
    const joined = x0 === pxE && y0 === pyE; pxE = x1; pyE = y1;
    if (!(w > 0) || !(x0 > -1e4 && y0 > -1e4 && x1 > -1e4 && y1 > -1e4 && x0 < 1e7 && y0 < 1e7 && x1 < 1e7 && y1 < 1e7)) { last = -1; continue; }
    if (!joined) last = -1;
    if (w > 1) w = 1;
    x0 = x0 * a + e; y0 = y0 * a + f; x1 = x1 * a + e; y1 = y1 * a + f;
    const dx = x1 - x0, dy = y1 - y0;
    /* Liang-Barsky against the lattice's on-canvas rectangle (skipped for a segment wholly inside, the common case) */
    let u0 = 0, u1 = 1;
    if (!(x0 >= X0 && x0 <= X1 && x1 >= X0 && x1 <= X1 && y0 >= Y0 && y0 <= Y1 && y1 >= Y0 && y1 <= Y1)) {
      let r;
      if (dx === 0) { if (x0 < X0 || x0 > X1) { last = -1; continue; } }
      else if (dx > 0) { r = (X0 - x0) / dx; if (r > u0) u0 = r; r = (X1 - x0) / dx; if (r < u1) u1 = r; }
      else { r = (X1 - x0) / dx; if (r > u0) u0 = r; r = (X0 - x0) / dx; if (r < u1) u1 = r; }
      if (dy === 0) { if (y0 < Y0 || y0 > Y1) { last = -1; continue; } }
      else if (dy > 0) { r = (Y0 - y0) / dy; if (r > u0) u0 = r; r = (Y1 - y0) / dy; if (r < u1) u1 = r; }
      else { r = (Y1 - y0) / dy; if (r > u0) u0 = r; r = (Y0 - y0) / dy; if (r < u1) u1 = r; }
      if (u0 > u1) { last = -1; continue; }
    }
    segs++;
    if (col !== lastCol || w !== lastW) { pk = linePacked(col, w); lastCol = col; lastW = w; }
    const strong = w >= strongW;
    /* direction class by the slope in cell units (a cell is 1.8 times as tall as wide), matched to what each mark draws:
       0 under 0.6 (a run of ¯ - _), 1 rising / and 3 falling \ up to 2.4, 2 steeper (| and :) */
    const du = dx * iw, dv = dy * ih, adx = du < 0 ? -du : du, ady = dv < 0 ? -dv : dv;
    const cls = ady < adx * 0.6 ? 0 : ady > adx * 2.41421356 ? 2 : du * dv < 0 ? 1 : 3, sl = cls === 2 ? 0 : dv / du;
    const adv = 1 / (adx > ady ? adx : ady), idu = du !== 0 ? 1 / du : 0, idv = dv !== 0 ? 1 / dv : 0, hadv = 0.5 * adv;
    const uS = (x0 - gx0) * iw, vS = (y0 - gy0) * ih;
    /* marks that do not depend on where the line crosses: a steep line's (: or | or ¦) and a bright diagonal's body and
       corner (a faint shallow line never needs them) */
    const fixed = cls === 2 || (cls !== 0 && strong), gSteep = fixed ? lineGlyph(LG, DG, catm, cls, 0, strong, 0.5) : 0, gSteepC = fixed ? lineGlyph(LG, DG, catm, cls, 4, strong, 0.5) : 0;
    /* the cells the segment crosses, each once and in order (Amanatides-Woo in cell units; t is the segment parameter).
       this visits every cell a half-cell walk would land in and never lands twice. a cell's chord is that of the whole
       line through it, (entry, exit) of both slabs, so the end cells of a polyline's pieces are judged like the middle
       ones; a touch of 1e-4 of a step (the line through a lattice vertex, where float error picks a side) is not a crossing */
    let cx = (uS + du * u0) | 0, cy = (vS + dv * u0) | 0;
    if (cx > cm) cx = cm; if (cy > rm) cy = rm;
    const sx = du > 0 ? 1 : -1, sy = dv > 0 ? 1 : -1, tdx = du > 0 ? idu : -idu, tdy = dv > 0 ? idv : -idv, graze = 1e-4 * adv;
    let tx = du > 0 ? (cx + 1 - uS) * idu : du < 0 ? (cx - uS) * idu : 1e30, ty = dv > 0 ? (cy + 1 - vS) * idv : dv < 0 ? (cy - vS) * idv : 1e30;
    let px = du !== 0 ? tx - tdx : -1e30, py = dv !== 0 ? ty - tdy : -1e30, t = u0, first = true, guard = cols + rows + 4;
    for (;;) {
      const ex = tx < ty ? tx : ty, tn = ex < u1 ? ex : u1;
      if (first || tn >= u1 || tn - t >= graze) {
        const ci = cy * cols + cx;
        if (ci !== last) {
          last = ci;
          let k = KK[ci] - 1, slow = 0;
          if (k < 0) { if (ln < cap) { k = ln++; KK[ci] = k + 1; O[k] = ci; XY[k] = (cy << 16) | cx; SW[k] = w; } }
          else { const o = SW[k]; SW[k] = o + w - o * w; slow = GQ[k] & PULSE | SLOW; if (w <= SM[k]) { GQ[k] |= SLOW; k = -1; } }
          if (k >= 0) {
            const cn = ex - (px > py ? px : py) < hadv ? 4 : 0;
            let g;
            if (cls === 2 || (cls !== 0 && strong && !cn)) g = cn ? gSteepC : gSteep;
            else {
              const fr = vS + (cx + 0.5 - uS) * sl - cy; SF[k] = fr;
              g = catm ? (strong && cls === 0 ? DG[0] : LG[1]) : LG[(strong && cls === 0 ? 3 : 0) + (fr < 0.3333 ? 0 : fr > 0.6667 ? 2 : 1)];
            }
            SM[k] = w; SH[k] = col; CQ[k] = pk; GQ[k] = slow | ((cls | cn) << 20) | g;
          }
        }
      }
      if (tn >= u1 || --guard < 0) break;
      first = false;
      if (tx < ty) { cx += sx; t = tx; px = tx; tx += tdx; if (cx < 0 || cx > cm) break; }
      else { cy += sy; t = ty; py = ty; ty += tdy; if (cy < 0 || cy > rm) break; }
    }
    if (!reduced && pulse === pulse) {
      /* the tail steps back one cell along the major axis (adv, as a fraction of the segment) */
      S.lineN = ln;
      for (let q = 0; q < 3; q++) {
        const p = pulse - q * adv; if (p < 0 || p > 1) continue;
        const ci = cellAtDev(x0 + dx * p, y0 + dy * p, X0, Y0, X1, Y1); if (ci < 0) continue;
        const k = lineCell(ci, w, col, pk, cls, uS, vS, du, dv, adv); if (k < 0) continue;
        const pv = q ? LINE.tail[q - 1] : 1;
        if (!(GQ[k] & PULSE) || pv > SP[k]) SP[k] = pv;
        GQ[k] |= SLOW | PULSE;
      }
      ln = S.lineN;
    }
  }
  S.lineN = ln;
  return segs;
}

function median(src, idxs, n, scale) {
  /* quickselect over a scratch copy; mean of the two middles for an even count */
  const a = scratch; for (let k = 0; k < n; k++) a[k] = src[idxs[k]] * scale;
  const sel = (k) => {
    let lo = 0, hi = n - 1;
    while (hi > lo) {
      const pv = a[(lo + hi) >> 1]; let i = lo, j = hi;
      while (i <= j) { while (a[i] < pv) i++; while (a[j] > pv) j--; if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
      if (k <= j) hi = j; else if (k >= i) lo = i; else break;
    }
    return a[k];
  };
  if (!n) return 0;
  const hiV = sel(n >> 1);
  if (n & 1) return hiV;
  let loV = -Infinity; for (let k = 0; k < (n >> 1); k++) if (a[k] > loV) loV = a[k];
  return (loV + hiV) / 2;
}

export const GF = {
  /* (re)allocate on resize or a detail change */
  configure({ W, H, PW, PH, DPR, lowPower, cellCss } = {}) {
    S.W = W; S.H = H; S.PW = PW | 0; S.PH = PH | 0; S.DPR = DPR || 1; S.lowPower = !!lowPower;
    if (cellCss) S.cellCss = cellCss;
    S.configured = S.PW > 0 && S.PH > 0; S.dirty = true; S.occN = 0; S.lineN = 0;
    if (tG) { tG.fill(0); gIdx.fill(0); B.accW.fill(0); B.nIn.fill(0); B.accR.fill(0); B.accG.fill(0); B.accB.fill(0); lK.fill(0); }
    watchFonts();
    if (S.configured) layout(S.a, S.e, S.f);
  },
  /* per activation and on every P.glyph* call: cheap and idempotent. resets the exposure seed */
  /* edges (K2): true (default) = the Sobel rim wherever the tone allows it, false = none, 'large' = only on lit
     components of at least LARGE_MIN cells (a body gets a limb, a small star stays a soft core). the per-frame
     `render({edges})` is the governor's switch: false turns it off, 'large' narrows it, anything else defers to this */
  /* bleach (W38): a continuous 'sample' room may ask for the mean mode's bleach, so its brightest tones (t over 0.8, up to
     35% toward white) read as a lit body. off by default: a sampled cell otherwise shows one member's exact hue */
  room({ mode, cats, colour, grid, cell, edges, bleach } = {}) {
    const R = S.room;
    R.bleach = !!bleach;
    R.mode = mode === 'cat' ? 'cat' : 'cont';
    R.colour = colour === 'mean' ? 'mean' : 'sample';
    R.cats = cats || null;
    R.edges = edges === false ? false : edges === 'large' ? 'large' : true;
    const g = grid && +grid.pw > 0 ? { ox: +grid.ox || 0, oy: +grid.oy || 0, pw: +grid.pw, ph: +grid.ph || 0, fit: grid.fit === 'divide' ? 'divide' : 'multiple', lock: !!grid.lock } : null;
    const gk = JSON.stringify(g), ck = cell == null ? null : Math.min(12, Math.max(4, +cell || 0));
    if (gk !== JSON.stringify(R.grid) || ck !== R.cell) S.dirty = true;
    R.grid = g; R.cell = ck;
    for (let k = 0; k < 8; k++) {
      const c = cats && cats[k], name = c && (typeof c === 'string' ? c : c.family);
      const fi = name ? FAMILY_IDS.indexOf(name) : -1;
      S.famOf[k] = fi >= 0 ? fi : cats ? 0 : FAMOF_DEFAULT[k];
      /* {family, max}: the category draws only the lightest `max` marks of its family (glints may step one past) */
      const mx = c && typeof c === 'object' ? Math.floor(+c.max || 0) : 0; S.capOf[k] = mx > 0 && mx < 256 ? mx : 0;
    }
    S.seeded = false;
  },
  buffers() { return S.off || !S.configured || !B.cols ? null : B; },
  /* clear only last frame's occupied cells, then lay out this frame's lattice. (a, e, f) = the pan camera, when given */
  begin(t, a = 1, e = 0, f = 0, frozen = false) {
    const n = S.occN;
    if (n && tG) {
      const occ = B.occ, W = B.accW, N = B.nIn, T = tG, G = gIdx;
      for (let k = 0; k < n; k++) { const ci = occ[k]; W[ci] = 0; N[ci] = 0; T[ci] = 0; G[ci] = 0; }
      if (S.lastMean) { const R = B.accR, Gg = B.accG, Bb = B.accB; for (let k = 0; k < n; k++) { const ci = occ[k]; R[ci] = 0; Gg[ci] = 0; Bb[ci] = 0; } }
    }
    const ln = S.lineN;
    if (ln && lK) { const G = gIdx, KK = lK, O = lOcc; for (let k = 0; k < ln; k++) { const ci = O[k]; KK[ci] = 0; G[ci] = 0; } }
    S.occN = 0; S.lineN = 0; S.t = t; S.ca = a || 1; S.ce = e || 0; S.cf = f || 0;
    if (!S.configured || S.off) return;
    const dirty = S.dirty;
    layout(a || 1, e || 0, f || 0);
    B.meanCol = S.room.mode === 'cont' && S.room.colour === 'mean';
    S.lastMean = B.meanCol;
    /* reservoir keys: refreshed every 40 ms (the stagger's resolution), on a new lattice, or when frozen changes */
    const fz = !!frozen;
    if (dirty || fz !== S.keyFrozen || (!fz && (t - S.keyT >= 40 || t < S.keyT)) || S.keyCells !== S.cols * S.rows) {
      const K = B.cwk, Hh = hsh, n = S.cols * S.rows, base = fz ? 0 : t / 2000;
      for (let ci = 0; ci < n; ci++) { const w = Math.floor(base + Hh[ci]) * 0.6180339887498949 + Hh[ci] * 0.7548776662466927; K[ci] = w - Math.floor(w); }
      S.keyT = t; S.keyFrozen = fz; S.keyCells = n;
    }
  },
  render(buf, PW, PH, t, o = {}) {
    const occN = Math.min(o.occN | 0, S.cap); S.occN = occN; S.renders++;
    S.lastCols = S.cols; S.lastRows = S.rows; S.lastAtlas = S.atlas;
    const dbg = S.dbg; if (dbg) { S.catCells.fill(0); S.catDotsW.fill(0); }
    S.lineDrawn = 0; S.lineSegs = 0; S.ccBig = 0; S.ccN = 0;
    if (!S.atlas) { S.drawn = 0; return; }
    const reduced = !!o.reduced, gn = o.gain > 0 ? +o.gain : 1; /* R5 L5: the field's breath, one uniform gain on every glyph */
    if (o.lines && S.cols) { const t0 = dbg ? performance.now() : 0; S.lineSegs = depositLines(o.lines, reduced); if (dbg) S.lineMs = S.lineMs * 0.9 + (performance.now() - t0) * 0.1; }
    const lineN = S.lineN;
    if (!occN && !lineN) { S.drawn = 0; return; }
    const occ = B.occ, accW = B.accW, nIn = B.nIn, pickC = B.pickC, pickK = B.pickK, aR = B.accR, aG = B.accG, aB = B.accB;
    const T = tG, GI = gIdx, HS = hsh, cols = S.cols, rows = S.rows, colX0 = S.colX0, rowY0 = S.rowY0;
    const at = S.atlas, ramp = at.ramp, dir = at.dir, fams = at.fam, famOf = S.famOf, pxStart = at.pxStart, pxX = at.pxX, pxY = at.pxY;
    const off = PW === S.PW ? S.offs : offsetsFor(at, PW), aw = at.cw, ah = at.ch;
    const cat = S.room.mode === 'cat', mean = B.meanCol, capOf = S.capOf, kx0 = S.kx0, ky0 = S.ky0, bleachS = !cat && !mean && S.room.bleach;
    /* edges: the room's mode (K2), narrowed or switched off by the frame's flag (the governor) */
    const oe = o.edges, re = S.room.edges;
    let em = re === false ? 0 : re === 'large' ? 2 : 1;
    if (oe === 'large') { if (em) em = 2; } else if (oe != null && !oe) em = 0;
    const tw = !reduced && o.twinkle !== false && !!o.twinkle, edges = em > 0 && cols > 2 && rows > 2, large = edges && em === 2;
    const ts = t / 1000, eG = TUNE.edgeG * TUNE.edgeG, eN = TUNE.edgeN;
    /* exposure: an EMA (0.9 / 0.1, seeded fresh on every room change, at least one full dot) of a high quantile of the
       frame's cell weights (TUNE.q; 1 = the literal max), so one pile-up of a few cells cannot dim the whole room.
       histogram in whole-dot buckets; the true max when the quantile tops out. a frame with trails and no dots leaves it */
    if (occN) {
      const HI = HIST; HI.fill(0); let mx = 0;
      for (let k = 0; k < occN; k++) { const v = accW[occ[k]]; if (v > mx) mx = v; const bk = v >>> 8; HI[bk < 1023 ? bk : 1023]++; }
      let ref = mx;
      if (TUNE.q < 1) { const lim = occN * (1 - TUNE.q); let acc = 0, bk = 1023; for (; bk > 0; bk--) { acc += HI[bk]; if (acc > lim) break; } if (bk < 1023) ref = Math.min(mx, (bk + 1) * 256); }
      S.ema = S.seeded ? S.ema * 0.9 + ref * 0.1 : ref; S.seeded = true;
      if (Math.abs(S.ema - ref) < 1e-6 * ref) S.ema = ref; /* settled: exact, so a still field renders bit-identically */
    }
    const inv = LUTN / Math.max(255, S.ema), fl = TUNE.floor ? HAZE + 1e-4 : 0;
    /* a cell holding at least one full-weight play is never dithered away: the haze band is for weight-dimmed dots only */
    for (let k = 0; k < occN; k++) { const ci = occ[k], w = accW[ci]; let q = (w * inv) | 0; if (q > LUTN) q = LUTN; const tv = TL[q]; T[ci] = w >= 255 && tv < fl ? fl : tv; }
    /* 'large' (K2): 8-connected components of lit cells (continuous: at or over the haze band, so a dust haze never joins
       the stars into one body; categorical: every cell holding plays, the silhouette the outline pass reads). cells of a
       component of LARGE_MIN or more carry this frame's stamp in ccB; only they may take an edge glyph */
    let gen = 0;
    if (large && occN) {
      if (S.ccGen >= 0xfffffff0) { ccV.fill(0); ccB.fill(0); S.ccGen = 0; }
      gen = ++S.ccGen;
      const V = ccV, BG = ccB, ST = ccS, LS = ccL;
      let big = 0, comps = 0;
      for (let k = 0; k < occN; k++) {
        const c0 = occ[k];
        if (V[c0] === gen || !(cat ? nIn[c0] > 0 : T[c0] >= HAZE)) continue;
        let sp = 0, cnt = 0; ST[sp++] = c0; V[c0] = gen;
        while (sp) {
          const c = ST[--sp]; LS[cnt++] = c;
          const cy = (c / cols) | 0, cx = c - cy * cols;
          const xa = cx > 0 ? -1 : 0, xb = cx < cols - 1 ? 1 : 0, ya = cy > 0 ? -cols : 0, yb = cy < rows - 1 ? cols : 0;
          for (let dy = ya; dy <= yb; dy += cols) for (let dx = xa; dx <= xb; dx++) {
            const nb = c + dy + dx;
            if (V[nb] === gen || !(cat ? nIn[nb] > 0 : T[nb] >= HAZE)) continue;
            V[nb] = gen; ST[sp++] = nb;
          }
        }
        comps++;
        if (cnt >= LARGE_MIN) { for (let q = 0; q < cnt; q++) BG[LS[q]] = gen; big += cnt; }
      }
      S.ccBig = big; S.ccN = comps;
    }
    const lineT0 = LINE.t0, lineT1 = LINE.t1, pulseT = LINE.pulseT, stamp = S.renders >>> 0;
    let qn = 1, invQn = 1;
    const RD = rimD, RB = rimB, NC = S.catN, RC = S.catR, RTH = S.catTH, RRM = S.catRM, RHB = S.catHB;
    if (cat) {
      /* the full-cell count: the CAT_Q quantile of n over every occupied cell, as the shell's strat pass takes it */
      const NH = NHIST; NH.fill(0);
      for (let k = 0; k < occN; k++) { const n = nIn[occ[k]]; NH[n < 255 ? n : 255]++; }
      for (let b = 1, acc = 0, lim = occN * CAT_Q; b < 256; b++) { acc += NH[b]; if (acc >= lim) { qn = b; break; } }
      invQn = 1 / qn; S.catQ = qn;
      /* outline candidates: a lit cell on the data's silhouette (3 to 7 neighbours holding dots, a binary Sobel of at least
         3) whose inward neighbour is itself interior, so a feature one or two cells thick keeps its family marks. the
         silhouette is read from nIn, not from what is drawn: a cell the shell's D2 pass left blank still holds plays, and
         is a hole in the thinning, not an edge of the data. counted per category */
      NC.fill(0); RC.fill(0); if (edges) RHB.fill(0);
      for (let k = 0; k < occN; k++) {
        const ci = occ[k]; RD[k] = 0;
        if (T[ci] <= TH) continue;
        const kc = pickK[ci] & 7; NC[kc]++;
        if (!edges || (large && ccB[ci] !== gen)) continue;
        const cy = (ci / cols) | 0, cx = ci - cy * cols;
        if (cx < 1 || cy < 1 || cx > cols - 2 || cy > rows - 2) continue;
        const u = ci - cols, d = ci + cols;
        const tl = nIn[u - 1] ? 1 : 0, tc = nIn[u] ? 1 : 0, tr = nIn[u + 1] ? 1 : 0, ml = nIn[ci - 1] ? 1 : 0, mr = nIn[ci + 1] ? 1 : 0, bl = nIn[d - 1] ? 1 : 0, bc = nIn[d] ? 1 : 0, br = nIn[d + 1] ? 1 : 0;
        const nb = tl + tc + tr + ml + mr + bl + bc + br; if (nb < 3 || nb > 7) continue;
        const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl), gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
        if (gx * gx + gy * gy < 9) continue;
        const ax = gx < 0 ? -gx : gx, ay = gy < 0 ? -gy : gy, sx = 2 * ax > ay ? (gx > 0 ? 1 : -1) : 0, sy = 2 * ay > ax ? (gy > 0 ? 1 : -1) : 0;
        const ix = cx + sx, iy = cy + sy; if (ix < 1 || iy < 1 || ix > cols - 2 || iy > rows - 2) continue;
        const ii = ci + sy * cols + sx;
        if (!nIn[ii] || !nIn[ii - 1] || !nIn[ii + 1] || !nIn[ii - cols] || !nIn[ii + cols]) continue;
        const di = RIMDIR[(gx + 4) * 9 + gy + 4], o4 = (kc << 2) + di;
        /* its rank for the quota: the same world-cell hash the draw pass uses, in 64 buckets */
        let wh = Math.imul(cx + kx0, 0x27d4eb2d) ^ Math.imul(cy + ky0 + 0x3c6e, 0x165667b1);
        wh = Math.imul(wh ^ (wh >>> 15), 0x2c1b3c6d); wh ^= wh >>> 12;
        const bk = (wh >>> 8) & 63;
        RD[k] = di + 1; RB[k] = bk; RC[o4]++; RHB[(o4 << 6) + bk]++;
      }
      /* the outline rate rs every category may spend. outlines follow geometry, so in some region a category may draw
         none while the others spend rs (a band in the middle of a stack, the flood before it reaches the wall's edge, one
         side of yours); its shape share there rises by s (1 - s) rs / (1 - rs). rs is held to rimDev (1 - rimMax) /
         (s (1 - s)) for every category j with share s of the lit cells: one category alone is unconstrained, a minority
         of a few percent barely constrains it, and the provenance split (19/17/64) allows about 3.3%, which bounds the
         shift in ANY region at 0.25 rs / (1 - rs) < 0.9 points. as a flood grows the outline thins smoothly, never pops.
         each category fills its quota, exactly round(rs x its lit cells), by edge class: horizontal first, then the two
         diagonals, then vertical, so what is kept is whole runs (a pile's top line, a slope). only the class that
         overflows is thinned, by hash rank: its candidates below bucket RTH are kept, plus the first RRM in its bucket.
         exact counts, so the outline itself moves no category's share of the frame by more than rounding */
      let Nt = 0; for (let j = 0; j < 8; j++) Nt += NC[j];
      const RIM_MAX = TUNE.rimMax, RIM_DEV = TUNE.rimDev;
      let rs = RIM_MAX;
      for (let j = 0; j < 8; j++) {
        if (!NC[j] || NC[j] === Nt) continue;
        const sh = NC[j] / Nt, lim = (RIM_DEV * (1 - RIM_MAX)) / (sh * (1 - sh));
        if (lim < rs) rs = lim;
      }
      for (let j = 0; j < 8; j++) {
        const o = j << 2; let left = Math.round(rs * NC[j]);
        for (const d of RIM_ORDER) {
          const q = o + d, c = RC[q]; RTH[q] = 0; RRM[q] = 0;
          if (!c || left <= 0) continue;
          if (c <= left) { RTH[q] = 64; left -= c; continue; }
          let b = 0, cum = 0; const h0 = q << 6; for (; b < 64; b++) { if (cum + RHB[h0 + b] >= left) break; cum += RHB[h0 + b]; }
          RTH[q] = b; RRM[q] = left - cum; left = 0;
        }
      }
      if (dbg) S.catRim.fill(0);
    }
    let drawn = 0; const DK = drk;
    for (let k = 0; k < occN; k++) {
      const ci = occ[k], tv = T[ci], ti = (tv * LUTN) | 0;
      if (tv <= TH) continue;
      /* a trail brighter than the dots in its cell takes the cell (the trail pass below draws it); a categorical cell is
         data and always keeps its mark */
      const lk = lineN ? lK[ci] - 1 : -1;
      if (lk >= 0 && !cat) { let tl = lineT0 + lineT1 * sW[lk]; const pv = reduced || !(lG[lk] & PULSE) ? 0 : sP[lk] * pulseT; if (pv > tl) tl = pv; if (tl >= tv) continue; }
      const cy = (ci / cols) | 0, cx = ci - cy * cols;
      if (tv < HAZE) { const d = cx * 0.06711056 + cy * 0.00583715, ign = 52.9829189 * (d - Math.floor(d)); if (ign - Math.floor(ign) > HZ[ti]) continue; }
      const q = Q[ti], h = HS[ci];
      let glint = false, B0 = BR[ti];
      if (tw) {
        /* categorical cells breathe +-6% around 0.94, so a full cell never clips; the continuous faint band keeps its own */
        if (cat) B0 *= 0.94 + 0.06 * SIN[((ts * (0.5 + 1.3 * h) + 6.28 * h) * SK | 0) & 4095];
        else if (tv < 0.35) B0 *= 1 + 0.05 * (SIN[((ts * (0.5 + 1.3 * h)) * SK | 0) & 4095] + 0.5 * SIN[((ts * (1.7 + 2.3 * h)) * SK | 0) & 4095] + 0.5 * SIN[((ts * (0.11 + 0.23 * h)) * SK | 0) & 4095]);
        glint = SIN[((ts * (0.031 + 0.05 * h) + 6.28 * h) * SK | 0) & 4095] > 0.98851; /* max(sin, 0)^60 > 0.5 */
      }
      let g;
      if (cat) {
        const kc = pickK[ci] & 7, F = fams[famOf[kc]], L = F.length, cp = capOf[kc], Lc = cp && cp < L ? cp : L;
        /* the cell's position in the room grid (or the screen grid), hashed: stable under a pan, a resize and time */
        let wh = Math.imul(cx + kx0, 0x27d4eb2d) ^ Math.imul(cy + ky0 + 0x3c6e, 0x165667b1);
        wh = Math.imul(wh ^ (wh >>> 15), 0x2c1b3c6d); wh ^= wh >>> 12;
        const rd = RD[k];
        let rim = false;
        if (rd) { const q = (kc << 2) + rd - 1, bk = RB[k], th = RTH[q]; if (bk < th) rim = true; else if (bk === th && RRM[q] > 0) { RRM[q]--; rim = true; } }
        if (rim) { g = dir[rd - 1]; if (dbg) S.catRim[kc]++; }
        else {
          const n = nIn[ci]; let fi;
          if (Lc < 2) fi = 0;
          else if (n >= qn) fi = Lc - 2 + ((wh >>> 20) & 1);
          else { fi = (n * invQn * (Lc - 1)) | 0; if (fi > Lc - 2) fi = Lc - 2; }
          if (glint && fi + 1 < L) fi++;
          g = F[fi];
        }
      } else {
        let lv = 1 + ((q * 14) | 0); if (lv > 14) lv = 14;
        g = 0;
        if (edges && (!large || ccB[ci] === gen) && tv > 0.09 && tv < 0.9 && cx > 0 && cy > 0 && cx < cols - 1 && cy < rows - 1) {
          const u = ci - cols, d = ci + cols;
          const tl = T[u - 1], tc = T[u], tr = T[u + 1], ml = T[ci - 1], mr = T[ci + 1], bl = T[d - 1], bc = T[d], br = T[d + 1];
          const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl), gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
          if (gx * gx + gy * gy > eG) {
            let hi = 0, lo = 0;
            if (tl > tv) hi++; else if (tl < tv) lo++; if (tc > tv) hi++; else if (tc < tv) lo++;
            if (tr > tv) hi++; else if (tr < tv) lo++; if (ml > tv) hi++; else if (ml < tv) lo++;
            if (mr > tv) hi++; else if (mr < tv) lo++; if (bl > tv) hi++; else if (bl < tv) lo++;
            if (bc > tv) hi++; else if (bc < tv) lo++; if (br > tv) hi++; else if (br < tv) lo++;
            if (hi >= eN && lo >= eN) {
              /* screen rows grow downward: flip gy so the angle is the usual y-up one, then name the edge (not the gradient) */
              let di = Math.round((Math.atan2(-gy, gx) + 1.5707963) * 1.2732395) % 4; if (di < 0) di += 4;
              g = dir[di];
            }
          }
        }
        if (!g) { if (glint && lv < 14) lv++; g = ramp[lv]; }
      }
      /* colour: one real member dot's colour (sample / categorical), or the weighted mean (make beat 3, game) */
      let r, gg, b;
      if (mean) { const w = accW[ci]; r = aR[ci] / w; gg = aG[ci] / w; b = aB[ci] / w; }
      else { const c = pickC[ci]; r = c & 255; gg = (c >>> 8) & 255; b = (c >>> 16) & 255; }
      let m = r > gg ? r : gg; if (b > m) m = b;
      if (m < 1) { r = gg = b = m = 1; }
      if (glint && !mean) B0 = B0 * 1.3 + 0.12;
      if (B0 > 1) B0 = 1;
      const kk = B0 * 255 / m * gn;
      let R = r * kk, Gc = gg * kk, Bc = b * kk;
      if (mean) {
        let s = BL[ti]; if (glint) s = s + (1 - s) * 0.5;
        if (s > 0) { R += (255 - R) * s; Gc += (255 - Gc) * s; Bc += (255 - Bc) * s; }
      } else if (bleachS) { const s = BL[ti]; if (s > 0) { R += (255 - R) * s; Gc += (255 - Gc) * s; Bc += (255 - Bc) * s; } }
      const col = 0xff000000 | ((Bc > 255 ? 255 : Bc) << 16) | ((Gc > 255 ? 255 : Gc) << 8) | (R > 255 ? 255 : R);
      GI[ci] = g; DK[drawn++] = ci;
      if (lk >= 0) lDn[lk] = stamp;
      if (dbg) { const kc = pickK[ci] & 7; S.catCells[kc]++; S.catDotsW[kc] += nIn[ci]; }
      const x0 = colX0[cx], y0 = rowY0[cy], s0 = pxStart[g], s1 = pxStart[g + 1];
      if (x0 >= 0 && y0 >= 0 && x0 + aw <= PW && y0 + ah <= PH) {
        const base = y0 * PW + x0;
        for (let p = s0; p < s1; p++) buf[base + off[p]] = col;
      } else {
        for (let p = s0; p < s1; p++) { const x = x0 + pxX[p], y = y0 + pxY[p]; if (x >= 0 && y >= 0 && x < PW && y < PH) buf[y * PW + x] = col; }
      }
    }
    S.drawn = drawn;
    /* K1 trails: every trail cell no dot glyph took, in list order. a cell one segment owns alone draws the mark and colour
       its walk chose (lineGlyph, linePacked); a crossing or a pulse recomputes them from the combined weight. tone
       t = t0 + t1 w through the dots' brightness curve. a pulse is the trail's own bright mark at full brightness, the head
       taken toward white by LINE.bleach (never a *, which is star vocabulary), then a two-cell tail fading back to the
       trail. no haze dither: a trail is continuous at any weight */
    if (lineN) {
      const LG = at.line, strongW = LINE.strong, O = lOcc, XY = lXY, GQ = lG, CQ = lCol, DN = lDn;
      let ld = 0;
      for (let k = 0; k < lineN; k++) {
        if (DN[k] === stamp) continue;
        const gq = GQ[k], ci = O[k];
        let g, col;
        if (!(gq & SLOW)) { g = gq & 0xffff; col = CQ[k]; } /* one segment alone in its cell: the mark and colour its walk chose */
        else {
          const w = sW[k], pv = reduced || !(gq & PULSE) ? 0 : sP[k], dc = gq >>> 20, cls = dc & 3;
          if (pv === 0 && w === sM[k]) { g = gq & 0xffff; col = CQ[k]; }
          else {
            g = lineGlyph(LG, dir, cat, cls, pv >= 1 ? 0 : dc & 4, w >= strongW || pv >= 0.5, sFr[k]);
            let tl = lineT0 + lineT1 * w; if (tl > 1) tl = 1;
            let B0 = BR[(tl * LUTN) | 0], s = 0;
            if (pv > 0) { B0 += (1 - B0) * pv; s = LINE.bleach * pv * pv; }
            const c = sHue[k]; let r = c & 255, gg = (c >>> 8) & 255, b = (c >>> 16) & 255;
            let m = r > gg ? r : gg; if (b > m) m = b;
            if (m < 1) { r = gg = b = m = 1; }
            const kk = B0 * 255 / m * gn;
            let R = r * kk, Gc = gg * kk, Bc = b * kk;
            if (s > 0) { R += (255 - R) * s; Gc += (255 - Gc) * s; Bc += (255 - Bc) * s; }
            col = 0xff000000 | ((Bc > 255 ? 255 : Bc) << 16) | ((Gc > 255 ? 255 : Gc) << 8) | (R > 255 ? 255 : R);
          }
        }
        GI[ci] = g; ld++;
        const xy = XY[k], x0 = colX0[xy & 0xffff], y0 = rowY0[xy >>> 16], s0 = pxStart[g], s1 = pxStart[g + 1];
        if (x0 >= 0 && y0 >= 0 && x0 + aw <= PW && y0 + ah <= PH) {
          const base = y0 * PW + x0;
          for (let p = s0; p < s1; p++) buf[base + off[p]] = col;
        } else {
          for (let p = s0; p < s1; p++) { const x = x0 + pxX[p], y = y0 + pxY[p]; if (x >= 0 && y >= 0 && x < PW && y < PH) buf[y * PW + x] = col; }
        }
      }
      S.lineDrawn = ld;
    }
  },
  /* medianN is what the ladder prints as "1 glyph ≈ N plays", so it is taken over the cells the last frame drew a dot glyph
     in: a cell the strat pass hid (accW 0), the haze dither left blank, or a brighter trail took shows no glyph for its
     plays, and counting it understated plays per visible glyph by up to 40%. medianW and meanW stay over every occupied cell */
  stats() {
    const n = S.occN;
    const base = { cols: S.cols, rows: S.rows, occ: n, drawn: S.drawn, medianN: 0, medianW: 0, meanW: 0, cellCss: cellCssEff(), cellDev: [S.cellW, S.cellH], tier: S.tier };
    if (!n || !scratch) return base;
    let sum = 0; for (let k = 0; k < n; k++) sum += B.accW[B.occ[k]];
    base.meanW = sum / 255 / n;
    base.medianN = median(B.nIn, drk, S.drawn, 1);
    base.medianW = median(B.accW, B.occ, n, 1 / 255);
    return base;
  },
  /* D2 proportion check: cells showing each category (non-blank), dots per category, and the count-weighted cell share.
     catDots needs the dots: pass the particle object (P) or run accumulateRef; otherwise it stays as last computed */
  debug(P) {
    if (P && P.cat && P.glyph) {
      const d = S.catDots; d.fill(0);
      const n = P.n || P.cat.length, a = S.a, e = S.e, f = S.f, DPR = S.DPR, gx0 = S.gx0, gy0 = S.gy0, W = S.cols * S.cellW + gx0, H = S.rows * S.cellH + gy0;
      for (let i = 0; i < n; i++) {
        if (!P.glyph[i] || (P.w && P.w[i] === 0)) continue;
        const px = (P.x[i] * a + e) * DPR, py = (P.y[i] * a + f) * DPR;
        if (px >= gx0 && py >= gy0 && px < W && py < H) d[P.cat[i] & 7]++;
      }
    }
    return { catCells: Array.from(S.catCells), catDots: Array.from(S.catDots), catDotsW: Array.from(S.catDotsW), catRim: Array.from(S.catRim) };
  },
  debugOn(on = true) { S.dbg = !!on; },
  /* the last frame as literal text: one line per row, trailing spaces trimmed */
  toText() {
    const at = S.lastAtlas; if (!at || !gIdx) return '';
    const cols = S.lastCols, rows = S.lastRows, tx = at.text, out = new Array(rows);
    for (let r = 0; r < rows; r++) { let s = ''; const o = r * cols; for (let c = 0; c < cols; c++) s += tx[gIdx[o + c]]; out[r] = s.replace(/ +$/, ''); }
    return out.join('\n');
  },
  tier(k) { const v = Math.max(0, Math.min(2, k | 0)); if (v !== S.tier) { S.tier = v; S.dirty = true; } },
  off() { S.off = true; },
  on() { S.off = false; S.dirty = true; },
  /* the §6.3 accumulate as a plain function (harness and tests; the shell pastes the same lines into its loop).
     D = { n, x, y, c, seed, glyph, cat, w }, o = { t, a, e, f, jitter }; call GF.begin(t, a, e, f, frozen) first */
  accumulateRef(D, o = {}) {
    const b = GF.buffers(); if (!b) return 0;
    const n = D.n, X = D.x, Y = D.y, C = D.c, SD = D.seed, GM = D.glyph, CAT = D.cat, WT = D.w, dpr = S.DPR;
    const accW = b.accW, accR = b.accR, accG = b.accG, accB = b.accB, pickC = b.pickC, pickK = b.pickK, nIn = b.nIn, occ = b.occ, cwk = b.cwk, occLen = occ.length;
    const gx0 = b.gx0, gy0 = b.gy0, invCw = b.invCw, invCh = b.invCh, cols = b.cols, rows = b.rows, meanCol = b.meanCol;
    const a = o.a || 1, e = o.e || 0, f = o.f || 0, j = o.jitter || 0;
    const cd = S.catDots; if (S.dbg) cd.fill(0);
    let on = 0;
    for (let i = 0; i < n; i++) {
      if (!GM[i]) continue;
      const w = WT[i]; if (w === 0) continue;
      const s = SD[i];
      const fx = (X[i] + (j ? Math.sin((o.t || 0) * 0.0011 + s) * j : 0)) * a + e, fy = (Y[i] + (j ? Math.cos((o.t || 0) * 0.0013 + s * 1.7) * j : 0)) * a + f;
      const pxf = fx * dpr, pyf = fy * dpr;
      if (pxf >= gx0 && pyf >= gy0) {
        const cx = ((pxf - gx0) * invCw) | 0, cy = ((pyf - gy0) * invCh) | 0;
        if (cx < cols && cy < rows) {
          const ci = cy * cols + cx, nn = ++nIn[ci];
          if (nn === 1 && on < occLen) occ[on++] = ci;
          accW[ci] += w;
          const c = C[i];
          if (meanCol) { accR[ci] += (c & 255) * w; accG[ci] += ((c >> 8) & 255) * w; accB[ci] += ((c >> 16) & 255) * w; }
          else { const u = s * 9301 + cwk[ci]; if ((u - Math.floor(u)) * nn < 1) { pickC[ci] = c; pickK[ci] = CAT[i]; } } /* u - floor(u) = u % 1, 4x cheaper than fmod */
          if (S.dbg) cd[CAT[i] & 7]++;
        }
      }
    }
    return on;
  },
  /* test and tuning hooks */
  info() {
    const at = S.atlas;
    const nm = (list) => (at ? Array.from(list, (k) => at.text[k]).join('') : '');
    return {
      builds: S.builds, fontRebuilds: S.fontRebuilds, fontGen: S.fontGen, cacheSize: cache.size, readbackOK: S.readbackOK,
      fallback: at ? at.fallback : null, eqBold: at ? at.eqBold : null, atlas: at ? [at.cw, at.ch] : null,
      ramp: at ? nm(at.ramp.subarray(1)) : '', dir: at ? nm(at.dir) : '', families: at ? Object.fromEntries(FAMILY_IDS.map((f, i) => [f, nm(at.fam[i])])) : {},
      cell: [S.cellW, S.cellH], grid: { gx0: S.gx0, gy0: S.gy0, cols: S.cols, rows: S.rows, kx0: S.kx0, ky0: S.ky0 }, catQ: S.catQ, colX0: Array.from(S.colX0.subarray(0, S.cols + 1)), rowY0: Array.from(S.rowY0.subarray(0, S.rows + 1)),
      cellCss: cellCssEff(), tier: S.tier, ema: S.ema, drawn: S.drawn, occN: S.occN, renders: S.renders, room: JSON.parse(JSON.stringify(S.room)), tune: { ...TUNE }, line: { ...LINE, tail: LINE.tail.slice() },
      lines: { cells: S.lineN, drawn: S.lineDrawn, segs: S.lineSegs, ms: S.lineMs }, components: { n: S.ccN, bigCells: S.ccBig }, cellBand: CELL_BAND, pitchLocked: pitchLocked(),
    };
  },
  /* the cell (device px) the lattice gets for a room grid at pan zoom a (default 1), with this room's cell and the
     governor's tier: the same function layout() runs, so a room placing things on cell edges never copies the maths */
  cellFor(grid, a = 1) {
    const g = grid && +grid.pw > 0 ? { pw: +grid.pw, ph: +grid.ph || 0, fit: grid.fit === 'divide' ? 'divide' : 'multiple' } : null;
    const cwT = Math.max(3, Math.round(cellCssEff() * S.DPR)), chT = Math.round(cwT * 1.8);
    return g ? gridCell(g, a || 1, cwT, chT) : [cwT, chT];
  },
  atlas() { return S.atlas; },
  tFor(ci) { return tG ? tG[ci] : 0; },
  glyphAt(ci) { return gIdx ? gIdx[ci] : 0; },
  /* TUNE keys, plus the trail constants as line* (lineStrong: the weight from which a trail draws ¯ - _ / | \ instead of
     ' · . :, lineT0/lineT1: its tone t0 + t1 w, lineBleach: how far a pulse head goes toward white) */
  tune(o = {}) {
    for (const k of Object.keys(o)) {
      if (k in TUNE) TUNE[k] = +o[k];
      else { const m = /^line([A-Z]\w*)$/.exec(k), lk = m && m[1][0].toLowerCase() + m[1].slice(1); if (lk && lk in LINE && typeof LINE[lk] === 'number') LINE[lk] = +o[k]; }
    }
    luts();
  },
  /* forget atlases and re-probe readback (tests: a mocked getImageData) */
  rebuild() { cache.clear(); S.fontGen++; S.readbackOK = probeReadback(); S.dirty = true; if (S.configured) layout(S.a, S.e, S.f); },
  CHARS, FAMILY_IDS, FAMILIES, RAMP_CHARS, DIR_CHARS,
  gainHook: true, /* R5 L5: render({gain}) is honoured */
};
export { buildAtlas };
export default GF;
