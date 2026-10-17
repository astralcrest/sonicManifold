/* R19 OUTSIDE: a QR Code encoder (ISO/IEC 18004, byte mode) that returns an SVG element. no network, no library, stateless, so
   post.js and wallout.js can import it by different paths. the wall's dock shows one of these where it would have loaded a
   spotify player: the scan happens on the visitor's own phone and this page never talks to spotify. */
const LEVELS = ['L', 'M', 'Q', 'H'];
const FMT_BITS = { L: 1, M: 0, Q: 3, H: 2 };
/* per version (index 0 unused): ecc codewords per block and number of blocks */
const ECC_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
};
const BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
};
/* the page's two inks: the ground (dark modules) and ice (the light tile); no new colors */
export const INK = '#0a0118';
export const ICE = '#86cbfe';

function rawModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const na = Math.floor(ver / 7) + 2;
    r -= (25 * na - 10) * na - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
export function dataCodewords(ver, level) { return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[level][ver] * BLOCKS[level][ver]; }
export function byteCapacity(ver, level) { return Math.floor((dataCodewords(ver, level) * 8 - 4 - (ver <= 9 ? 8 : 16)) / 8); }

/* GF(256), x^8 + x^4 + x^3 + x^2 + 1 */
function gmul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
  return z;
}
export function rsDivisor(degree) {
  const out = new Array(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      out[j] = gmul(out[j], root);
      if (j + 1 < degree) out[j] ^= out[j + 1];
    }
    root = gmul(root, 2);
  }
  return out;
}
export function rsRemainder(data, div) {
  const out = div.map(() => 0);
  for (const b of data) {
    const f = b ^ out.shift();
    out.push(0);
    div.forEach((c, i) => { out[i] ^= gmul(c, f); });
  }
  return out;
}

function alignPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const r = [6];
  for (let p = ver * 4 + 10; r.length < n; p -= step) r.splice(1, 0, p);
  return r;
}

function dataStream(bytes, ver, level) {
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4);
  put(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => put(b, 8));
  const cap = dataCodewords(ver, level) * 8;
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
  const out = new Array(bits.length / 8).fill(0);
  bits.forEach((b, i) => { out[i >>> 3] |= b << (7 - (i & 7)); });
  return out;
}

function withEcc(data, ver, level) {
  const nb = BLOCKS[level][ver], eccLen = ECC_PER_BLOCK[level][ver];
  const raw = Math.floor(rawModules(ver) / 8);
  const shortBlocks = nb - raw % nb, shortLen = Math.floor(raw / nb);
  const div = rsDivisor(eccLen), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < shortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((blk, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) out.push(blk[i]); });
  }
  return out;
}

function grid(n, v) { return Array.from({ length: n }, () => new Array(n).fill(v)); }

function baseMatrix(ver, words) {
  const n = ver * 4 + 17, m = grid(n, false), fn = grid(n, false);
  const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
  const ap = alignPositions(ver), na = ap.length;
  for (let i = 0; i < na; i++) for (let j = 0; j < na; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ap[i] + dx, ap[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  for (let i = 0; i < 9; i++) { fn[8][i] = true; fn[i][8] = true; }
  for (let i = 0; i < 8; i++) { fn[8][n - 1 - i] = true; fn[n - 1 - i][8] = true; }
  set(8, n - 8, true);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
    const bits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const d = ((bits >>> i) & 1) !== 0, a = n - 11 + i % 3, b = Math.floor(i / 3);
      set(a, b, d); set(b, a, d);
    }
  }
  let i = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert;
      if (!fn[y][x] && i < words.length * 8) { m[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
    }
  }
  return { n, m, fn };
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x, y) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => x * y % 2 + x * y % 3 === 0,
  (x, y) => (x * y % 2 + x * y % 3) % 2 === 0,
  (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0
];

function maskedCopy(base, mask, level) {
  const { n, m, fn } = base, out = m.map((r) => r.slice());
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fn[y][x] && MASKS[mask](x, y)) out[y][x] = !out[y][x];
  const data = (FMT_BITS[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412, bit = (i) => ((bits >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) out[i][8] = bit(i);
  out[7][8] = bit(6); out[8][8] = bit(7); out[8][7] = bit(8);
  for (let i = 9; i < 15; i++) out[8][14 - i] = bit(i);
  for (let i = 0; i < 8; i++) out[8][n - 1 - i] = bit(i);
  for (let i = 8; i < 15; i++) out[n - 15 + i][8] = bit(i);
  out[n - 8][8] = true;
  return out;
}

/* the four penalty rules of the standard; the finder-like rule counts 1:1:3:1:1 with four light modules on either side */
function penalty(m) {
  const n = m.length;
  let score = 0;
  const line = (get) => {
    for (let a = 0; a < n; a++) {
      let color = false, run = 0;
      const hist = [0, 0, 0, 0, 0, 0, 0];
      const add = (len) => { if (hist[0] === 0) len += n; hist.pop(); hist.unshift(len); };
      const count = () => {
        const k = hist[1];
        const core = k > 0 && hist[2] === k && hist[3] === k * 3 && hist[4] === k && hist[5] === k;
        return (core && hist[0] >= k * 4 && hist[6] >= k ? 1 : 0) + (core && hist[6] >= k * 4 && hist[0] >= k ? 1 : 0);
      };
      for (let b = 0; b < n; b++) {
        if (get(a, b) === color) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else {
          add(run);
          if (!color) score += count() * 40;
          color = get(a, b); run = 1;
        }
      }
      if (color) { add(run); run = 0; }
      run += n;
      add(run);
      score += count() * 40;
    }
  };
  line((a, b) => m[a][b]);
  line((a, b) => m[b][a]);
  let dark = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (m[y][x]) dark++;
    if (y < n - 1 && x < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
  }
  const total = n * n;
  return score + (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
}

/* text (utf-8) or a byte array -> { version, level, mask, size, modules[y][x] }; ecl is the least level wanted, raised while the
   same version still holds the data (boost:false keeps it exact) */
export function encode(text, opts) {
  const o = opts || {};
  const bytes = typeof text === 'string' ? Array.from(new TextEncoder().encode(text)) : Array.from(text);
  let level = LEVELS.indexOf(o.ecl) >= 0 ? o.ecl : 'M';
  let ver = Math.max(1, o.minVersion | 0 || 1);
  const maxV = Math.min(40, o.maxVersion | 0 || 40);
  while (ver <= maxV && bytes.length > byteCapacity(ver, level)) ver++;
  if (ver > maxV) throw new RangeError('qr: ' + bytes.length + ' bytes do not fit version ' + maxV + ' at level ' + level);
  if (o.boost !== false) {
    for (let k = LEVELS.indexOf(level) + 1; k < 4 && bytes.length <= byteCapacity(ver, LEVELS[k]); k++) level = LEVELS[k];
  }
  const base = baseMatrix(ver, withEcc(dataStream(bytes, ver, level), ver, level));
  let mask = o.mask >= 0 && o.mask <= 7 ? o.mask | 0 : -1, mods;
  if (mask >= 0) mods = maskedCopy(base, mask, level);
  else {
    let best = Infinity;
    for (let k = 0; k < 8; k++) {
      const cand = maskedCopy(base, k, level), p = penalty(cand);
      if (p < best) { best = p; mask = k; mods = cand; }
    }
  }
  return { version: ver, level, mask, size: base.n, bytes: bytes.length, modules: mods };
}

const NS = 'http://www.w3.org/2000/svg';
/* o.module = whole css pixels per module (or o.size = the most pixels the tile may take; the scale is floored to whole pixels so
   every module lands on the pixel grid); o.quiet modules of light margin (the standard asks for 4); o.dark / o.light override
   the two inks; o.label is the accessible name */
export function toSvg(qr, opts) {
  const o = opts || {};
  const quiet = o.quiet == null ? 4 : Math.max(0, o.quiet | 0);
  const n = qr.size, W = n + quiet * 2;
  const scale = o.module ? Math.max(1, Math.floor(o.module)) : Math.max(1, Math.floor((o.size || W * 4) / W));
  const px = W * scale;
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n;) {
      if (!qr.modules[y][x]) { x++; continue; }
      let e = x;
      while (e < n && qr.modules[y][e]) e++;
      d += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h' + (e - x) + 'v1h-' + (e - x) + 'z';
      x = e;
    }
  }
  const svg = document.createElementNS(NS, 'svg');
  const at = (k, v) => svg.setAttribute(k, v);
  at('class', 'qr');
  at('viewBox', '0 0 ' + W + ' ' + W);
  at('width', px); at('height', px);
  at('shape-rendering', 'crispEdges');
  at('role', 'img');
  at('aria-label', o.label || 'qr code');
  at('data-qr-version', qr.version); at('data-qr-level', qr.level); at('data-qr-modules', n); at('data-qr-scale', scale);
  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', W); bg.setAttribute('height', W); bg.setAttribute('fill', o.light || ICE);
  const fg = document.createElementNS(NS, 'path');
  fg.setAttribute('d', d); fg.setAttribute('fill', o.dark || INK);
  svg.appendChild(bg); svg.appendChild(fg);
  return svg;
}

export function qrSvg(url, opts) {
  const o = opts || {};
  const q = encode(String(url), o);
  const svg = toSvg(q, o);
  svg.setAttribute('data-qr-url', String(url));
  return svg;
}
export default qrSvg;
