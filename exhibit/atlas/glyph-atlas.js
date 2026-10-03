/* glyph atlas (BUILD_SPEC_V2 §6.2). every glyph the field can show, drawn once per cell size into binary masks and
   stored as sparse pixel lists, so the renderer's blit touches only inked pixels. the ramp order is measured at runtime
   (JetBrains Mono's ink order is not IBM Plex's), each categorical family is ink-sorted the same way, and when canvas
   readback cannot be trusted (Brave farbling, Firefox resistFingerprinting, a throwing getImageData) the whole atlas
   comes from the 5x9 bitmap font below instead, in a fixed order. no DOM is touched except a detached canvas. */

export const RAMP_CHARS = ".':;+*o%#&8@$W";           /* 14 continuous candidates */
export const DIR_CHARS = '-/|\\';                     /* directional edge glyphs, by edge angle 0, 45, 90, 135 deg */
/* categorical families (§6.4, D2). four ink levels each, every shape owned by one family: a character names one family
   and nothing else, and none of them is an outline glyph (- / | \ trace an edge in cat mode too, so the queue's single
   line is the low `_`, never a mid-height dash). full cells weave the top two levels, partial cells step down the rest */
export const FAMILY_IDS = ['neutral', 'tap', 'shuffle', 'served', 'null', 'ink'];
export const FAMILIES = { neutral: ".'+*", tap: '°oO@', shuffle: '×xX%', served: '_=≡≣', null: ',:;8', ink: '"^#H' };
export const FONT_STACK = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
/* trail marks (K1 lines). a faint trail steps between ' · . by where the line crosses the cell (top, middle, bottom), so a
   shallow slope reads at three times the row pitch; a bright one does the same with ¯ - _. · and ¦ belong to no family, so
   a trail in a categorical room is never read as a category. the mask order is fixed: the renderer indexes it */
export const LINE_CHARS = '·¦¯';
/* atlas slot order: 0 is the blank cell, then every distinct character once */
export const CHARS = (() => { const s = [' ']; for (const c of RAMP_CHARS + DIR_CHARS + FAMILY_IDS.map((f) => FAMILIES[f]).join('') + LINE_CHARS) if (s.indexOf(c) < 0) s.push(c); return s; })();
/* the non-ASCII marks: each is checked for tofu once the font draws. '≡' falls back to a bold '=' (§6.4), the rest to their
   bitmap shape below */
const TOFU = CHARS.filter((c) => c.charCodeAt(0) > 126);

/* the fallback font: 5 columns x 9 rows per glyph, one base-32 digit per row, leftmost pixel = 16 */
const BITMAP = {
  '.': '000000040', "'": '044000000', ':': '000400040', ';': '000400048', '+': '00044v440', '*': '004lel400',
  o: '000ehhhe0', O: '0ehhhhhe0', '%': '0op248j30', '#': '0aavavaa0', '&': '0cik8lid0', 8: '0ehhehhe0',
  '@': '0ehnlnge0', $: '4fkke55u4', W: '0hhhllrh0', '-': '0000v0000', '/': '011248gg0', '|': '444444444',
  '\\': '0gg842110', x: '000ha4ah0', X: '0hha4ahh0', '=': '000v0v000', '≡': '00v0v0v00', '^': '04ah00000', H: '0hhhvhhh0',
  '°': '0eae00000', '×': '000a4a000', _: '00000000v', '≣': '0v0v0v0v0', ',': '000000448', '"': '0aa000000',
  '·': '000040000', '¦': '044400444', '¯': '0v0000000',
};

let docCanvas = null;
function canvas(w, h) {
  if (!docCanvas) docCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!docCanvas) return null;
  if (docCanvas.width !== w) docCanvas.width = w;
  if (docCanvas.height !== h) docCanvas.height = h;
  return docCanvas.getContext('2d', { willReadFrequently: true });
}

/* can this browser's canvas be read back faithfully? draw four known pixels and compare them exactly. any throw, blank
   or perturbed value (farbling adds +-1 noise, resistFingerprinting returns white or random data) means no. */
export function probeReadback() {
  try {
    const g = canvas(4, 4); if (!g) return false;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, 4, 4);
    const P = [[0, 0, 255, 0, 0], [1, 0, 0, 255, 0], [0, 1, 0, 0, 255], [1, 1, 255, 255, 255], [2, 0, 17, 130, 201], [3, 3, 250, 3, 96]];
    for (const [x, y, r, gg, b] of P) { g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(x, y, 1, 1); }
    const d = g.getImageData(0, 0, 4, 4).data;
    if (!d || d.length < 64) return false;
    for (const [x, y, r, gg, b] of P) { const o = (y * 4 + x) * 4; if (d[o] !== r || d[o + 1] !== gg || d[o + 2] !== b || d[o + 3] !== 255) return false; }
    /* an untouched pixel must read back as transparent black */
    const o = (2 * 4 + 2) * 4; if (d[o] || d[o + 1] || d[o + 2] || d[o + 3]) return false;
    return true;
  } catch (e) { return false; }
}

/* draw every slot with the real font; returns alpha per pixel (Uint8Array cw*ch per slot) or null if readback fails */
function drawFont(cw, ch, weight, eqBold) {
  const n = CHARS.length, W = cw * (n + 2), g = canvas(W, ch);
  if (!g) return null;
  const px = Math.max(4, Math.min(cw / 0.6, ch / 1.08));
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, ch);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  const draw = (c, k, w) => {
    g.save(); g.beginPath(); g.rect(k * cw, 0, cw, ch); g.clip();
    g.font = `${w} ${px.toFixed(2)}px ${FONT_STACK}`;
    g.fillText(c, k * cw + cw / 2, ch / 2 + px * 0.03);
    g.restore();
  };
  for (let k = 1; k < n; k++) draw(CHARS[k] === '≡' && eqBold ? '=' : CHARS[k], k, CHARS[k] === '≡' && eqBold ? 800 : weight);
  /* two extra slots for the tofu test: a private-use codepoint (no font has it) and a bold '=' for the fallback */
  draw('', n, weight); draw('=', n + 1, 800);
  let d;
  try { d = g.getImageData(0, 0, W, ch).data; } catch (e) { return null; }
  const out = [];
  for (let k = 0; k < n + 2; k++) {
    const a = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) a[y * cw + x] = d[(y * W + k * cw + x) * 4 + 3];
    out.push(a);
  }
  return out;
}

function drawBitmap(cw, ch) {
  const out = [];
  for (let k = 0; k < CHARS.length; k++) {
    const a = new Uint8Array(cw * ch), rows = BITMAP[CHARS[k]];
    if (rows) {
      /* nearest-neighbour scale of the 5x9 cell, inset so neighbouring glyphs keep a gap. each output pixel ORs the
         source pixels it covers, so shrinking below 5x9 never drops a one-pixel stroke ('-' at 4x7) */
      const gx = Math.max(0, Math.floor(cw * 0.1)), gw = Math.max(3, Math.min(cw, cw - gx * 2)), gh = ch, R = [];
      for (let r = 0; r < 9; r++) R.push(parseInt(rows[r], 32));
      for (let y = 0; y < gh; y++) {
        const y0 = Math.min(8, Math.floor((y * 9) / gh)), y1 = Math.max(y0 + 1, Math.min(9, Math.floor(((y + 1) * 9) / gh)));
        let bits = 0; for (let r = y0; r < y1; r++) bits |= R[r];
        for (let x = 0; x < gw; x++) {
          const x0 = Math.min(4, Math.floor((x * 5) / gw)), x1 = Math.max(x0 + 1, Math.min(5, Math.floor(((x + 1) * 5) / gw)));
          let on = 0; for (let c = x0; c < x1; c++) if (bits & (16 >> c)) on = 1;
          if (on && x + gx < cw) a[y * cw + x + gx] = 255;
        }
      }
    }
    out.push(a);
  }
  return out;
}

const eqMask = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if ((a[i] > 127) !== (b[i] > 127)) return false; return true; };

/* build one atlas for a cw x ch device-px cell.
   opts.fallback forces the bitmap font; opts.weight is the font weight (500). returns
   { cw, ch, n, chars, text[], mask, ink, alpha, ramp[15], dir[4], fam[6][], line[11], famNames, fallback, eqBold,
     pxStart, pxX, pxY, off, offPW }  */
export function buildAtlas(cwDev, chDev, opts = {}) {
  const cw = Math.max(2, cwDev | 0), ch = Math.max(3, chDev | 0), n = CHARS.length, weight = opts.weight || 500;
  let fallback = !!opts.fallback, eqBold = false, alpha = null;
  if (!fallback) {
    alpha = drawFont(cw, ch, weight, false);
    if (!alpha) fallback = true;
    else {
      /* does each non-ASCII mark really render? tofu looks like the private-use slot; nothing at all is also a failure */
      let bm = null;
      for (const c of TOFU) {
        const k = CHARS.indexOf(c), m = alpha[k];
        let inkC = 0; for (let i = 0; i < m.length; i++) if (m[i] > 127) inkC++;
        if (inkC && !eqMask(m, alpha[n])) continue;
        if (c === '≡') { eqBold = true; alpha[k] = alpha[n + 1]; } else { bm = bm || drawBitmap(cw, ch); alpha[k] = bm[k]; }
      }
    }
  }
  if (fallback) alpha = drawBitmap(cw, ch);
  const cells = cw * ch, mask = new Uint8Array(n * cells), ink = new Float32Array(n), asum = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    const a = alpha[k]; let c = 0, s = 0, mx = 0;
    for (let i = 0; i < cells; i++) { s += a[i]; if (a[i] > mx) mx = a[i]; }
    /* alpha > 127, except a thin stroke that anti-aliases below it at tiny cells ('-' at 4 px): then half its peak */
    let th = 127; for (let i = 0; i < cells; i++) if (a[i] > th) { th = -1; break; }
    th = th < 0 ? 127 : Math.max(8, mx >> 1) - 1;
    for (let i = 0; i < cells; i++) if (a[i] > th) { mask[k * cells + i] = 1; c++; }
    ink[k] = c; asum[k] = s;
  }
  const idx = (c) => CHARS.indexOf(c);
  /* shown ink first (the binary mask is what reaches the screen), then the anti-aliased alpha sum, then candidate order */
  const byInk = (list) => list.map((c, o) => ({ k: idx(c), o })).sort((p, q) => (ink[p.k] - ink[q.k]) || (asum[p.k] - asum[q.k]) || (p.o - q.o)).map((p) => p.k);
  const ramp = new Uint8Array(15); byInk([...RAMP_CHARS]).forEach((k, i) => { ramp[i + 1] = k; });
  const dir = new Uint8Array([...DIR_CHARS].map(idx));
  const fam = FAMILY_IDS.map((f) => new Uint8Array(byInk([...FAMILIES[f]])));
  /* sparse pixel lists: the blit writes only these */
  const pxStart = new Int32Array(n + 1); let tot = 0;
  for (let k = 0; k < n; k++) { pxStart[k] = tot; tot += ink[k]; }
  pxStart[n] = tot;
  const pxX = new Uint8Array(tot), pxY = new Uint8Array(tot);
  for (let k = 0, p = 0; k < n; k++) for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (mask[k * cells + y * cw + x]) { pxX[p] = x; pxY[p] = y; p++; }
  const text = CHARS.map((c) => (c === '≡' && eqBold ? '=' : c));
  /* trail slots: [' · . ¯ - _ ¦ : | / \] = faint top/mid/bottom, bright top/mid/bottom, faint steep (categorical: ¦,
     continuous: :), bright steep, the two bright diagonals */
  const line = new Uint8Array(["'", '·', '.', '¯', '-', '_', '¦', ':', '|', '/', '\\'].map(idx));
  return { cw, ch, n, chars: CHARS, text, mask, ink, alpha: asum, ramp, dir, fam, line, famNames: FAMILY_IDS, fallback, eqBold, pxStart, pxX, pxY, off: null, offPW: -1 };
}

/* row offsets for one frame width (fast path: base + off[k]) */
export function offsetsFor(at, PW) {
  if (at.offPW === PW && at.off) return at.off;
  const n = at.pxX.length, off = at.off && at.off.length === n ? at.off : new Int32Array(n);
  for (let p = 0; p < n; p++) off[p] = at.pxY[p] * PW + at.pxX[p];
  at.off = off; at.offPW = PW;
  return off;
}

/* a small LRU of atlases keyed by cell size and font state (§6.2: 16 entries) */
export function atlasCache(limit = 16) {
  const m = new Map();
  return {
    get(key, make) {
      let v = m.get(key);
      if (v) { m.delete(key); m.set(key, v); return v; }
      v = make(); m.set(key, v);
      while (m.size > limit) m.delete(m.keys().next().value);
      return v;
    },
    clear() { m.clear(); },
    get size() { return m.size; },
  };
}
