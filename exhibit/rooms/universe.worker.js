/* the universe's parser (BUILD_SPEC_V2 §8.4, package R4). builds the sky's dots and parses the Tier-B files and the THREADS
   weft off the main thread, and hands back typed arrays (transferred, not copied). it is an ES module so it can run two
   ways: as a module worker (the normal path), or imported by the room on the main thread when a browser has no module
   workers.

   what it builds, and nothing else:
   - roster (Tier B, universe_artists_all.json): every listed artist (columns as shipped), plus the dots. every play is one
     dot (lowPower: one dot per four plays, largest-remainder rounding so the dot count is exact), grouped in artist blocks
     in file order; the withheld plays (`unlisted`) are a last block with no artist.
   - rosterA (Tier A only, universe_nodes.json + universe_edges.json, the shipping state while Tier B is held back): the
     same struct for the 388 stars in node order (which is plays order). the file carries no play counts, so each star's
     dots are its share of `named_play_share x N` split by 2^plays_bucket, stepped down by rank inside a bucket (a size,
     never a count: `plays` is null); every
     other play (`small_systems.plays`) is one dust block with no artist, its families from the per-family dust totals
     the door already carries (DUST_FAM below). a star is laid out (placed 0) when it sits in the main web of edges.
   in both, a star's dots sit around its star (Tier-A xy on the ground plane + a seeded height slab) as a seeded 3D gaussian
   whose radius grows with the cube root of its plays; within a block the dots run from the centre outwards (each radius
   jittered by JIT), so "the first k dots of a star" are its k innermost. every other play is dust on a spherical shell (radius 0.55 to 0.80, hashed per
   dot), pushed out of the giant box where a shell point would land inside it. a second set of positions pulls every dot
   into its genre family's cluster (THREADS): 14 clusters on a ring in the fixed family order, which is a drawing order and
   nothing more. the layout lies flat (x, z) so the idle orbit turns it like a record and never shows it edge-on.
   - days: the day records as flat arrays (no hours: the public files carry none, GATE_tierb_privacy_B A2), and the median day (§4.2: median n over days on or after 2022-02-01,
     then the first such day in file order whose n equals it), and each star's five most frequent back-to-back partners
     over every day (partners(): the lock-on threads).
   - bridges: the weft summed over every month, per directed family pair and arm (uncensored, GS K5), and each arm's
     total over the same window.
   positions carry no meaning: the layout is a seeded drawing (GS K4, TIER_B W-B6). */

export const K = 2.0;              /* Tier-A xy (0..1) -> the ground plane: x = (xy[0] - 0.5) * K, z = (xy[1] - 0.5) * K, so seen from
                                      straight above (yaw 0) the sky reads like the door's picture: x to the right, xy[1] down */
export const SLAB = 0.18;          /* y = SLAB * (hash(id) - 0.5) for every star (BUILD_SPEC_V2 §8.2, until a 3D layout file ships) */
export const SIG = 0.0014;         /* a star's gaussian sigma per cube root of its plays: tight enough that at home each star is its
                                      own glyph core a few cells from the next, not one fog with its neighbours (VERIFY_1 P1-1) */
export const JIT = 0.15;           /* each star dot's radius jitter, either way (VERIFY_1 P1-2) */
export const SHELL0 = 0.55, SHELL1 = 0.80;
export const BOX = [0.28 * K + 0.03, SLAB / 2 + 0.03, 0.28 * K + 0.03]; /* the giant box (every force-layout star centre) plus a margin */
/* the dust's family mix in Tier-A mode: the 14 per-family totals of every play by an artist under 50 plays, in fam_order,
   copied from the door (index.html DUSTF, the same aggregate; they sum to small_systems.plays). OWNER FLAG (ROUND2_PLAN
   §0.7): a colour aggregate only, never printed */
export const DUST_FAM = [1971, 203, 3629, 33, 293, 183, 4251, 421, 899, 1494, 1057, 263, 1780, 14970];
export const RING = 0.78;          /* THREADS: cluster ring radius */
export const NFAM = 14;

export function hash(i) { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; }

/* inverse cdf of the chi distribution with 3 degrees of freedom (the radius of a 3D standard gaussian), tabulated once */
const CHI = (() => {
  const n = 2048, t = new Float32Array(n + 1), erf = (x) => { const s = Math.sign(x); x = Math.abs(x); const a = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * a - 1.453152027) * a) + 1.421413741) * a - 0.284496736) * a + 0.254829592) * a * Math.exp(-x * x)); };
  const cdf = (r) => erf(r / Math.SQRT2) - Math.sqrt(2 / Math.PI) * r * Math.exp(-r * r / 2);
  let r = 0;
  for (let i = 0; i <= n; i++) { const u = Math.min(0.9995, i / n); while (cdf(r) < u && r < 6) r += 0.0015; t[i] = r; }
  return t;
})();
export const chi3 = (u) => CHI[Math.max(0, Math.min(2048, (u * 2048) | 0))];

/* fam_order index -> THREADS cluster centre (x, y, z) and sigma (grows with the cube root of the family's plays) */
export function clusterOf(f, famPlays, sigK = 1) {
  const th = -Math.PI / 2 + (2 * Math.PI * f) / NFAM;
  return [RING * Math.cos(th), 0, RING * Math.sin(th), (0.02 + 0.0028 * Math.cbrt(Math.max(0, famPlays || 0))) * Math.sqrt(sigK)];
}

/* ------------------------------------------------------------------ roster + dots */
/* integer shares of N by weight: largest remainder, ties by index, so the counts sum to exactly N */
function apportion(wts, N) {
  const n = wts.length, q = new Int32Array(n), rem = new Float64Array(n); let tot = 0, sum = 0;
  for (let i = 0; i < n; i++) tot += wts[i];
  for (let i = 0; i < n; i++) { const ex = tot > 0 ? (wts[i] * N) / tot : 0, b = Math.floor(ex + 1e-9); q[i] = b; rem[i] = ex - b; sum += b; }
  if (sum < N) { const ord = Array.from({ length: n }, (_, i) => i).sort((a, b) => rem[b] - rem[a] || a - b); for (let k = 0; k < N - sum; k++) q[ord[k % n]]++; }
  else if (sum > N) { for (let i = n - 1; i >= 0 && sum > N; i--) { const d = Math.min(q[i], sum - N); q[i] -= d; sum -= d; } }
  return q;
}
/* the dots of both rosters. blocks 0..nA-1 are the artists (q[i] dots each), block nA the rest (no artist). a star's
   dots (placed != 1) sit in its gaussian, innermost first; every other dot is dust on the shell. famOfRest(j) gives the
   family of the last block's j-th dot. famPlays sizes the THREADS clusters */
function buildDots(nA, q, fam, placed, cx, cy, cz, sig, famOfRest, famPlays, N, sigK = 1) {
  const bs = new Int32Array(nA + 2); for (let i = 0; i <= nA; i++) bs[i + 1] = bs[i] + q[i];
  const dA = new Int32Array(N), dFam = new Uint8Array(N), sky = new Float32Array(N * 3), thr = new Float32Array(N * 3);
  const clusters = new Float32Array(NFAM * 4); for (let f = 0; f < NFAM; f++) clusters.set(clusterOf(f, famPlays[f], sigK), f * 4);
  let dustIn = 0;
  for (let i = 0; i <= nA; i++) {
    const a0 = bs[i], a1 = bs[i + 1], m = a1 - a0, isStar = i < nA && placed[i] !== 1;
    for (let j = 0; j < m; j++) {
      const d = a0 + j, o = d * 3, f = i < nA ? fam[i] : famOfRest(j);
      dA[d] = i < nA ? i : -1; dFam[d] = f;
      const h1 = hash(d * 3 + 1), h2 = hash(d * 3 + 2), h3 = hash(d * 5 + 3);
      const uz = 2 * h1 - 1, ph = 6.283185307 * h2, rr = Math.sqrt(Math.max(0, 1 - uz * uz)), dx = rr * Math.cos(ph), dy = uz, dz = rr * Math.sin(ph);
      if (isStar) {
        /* innermost first, each radius jittered by up to JIT either way (a seeded per-dot draw), so up close a star is a
           scattered gaussian of glyphs and not a stamped disc of even shells (VERIFY_1 P1-2); the falloff classes
           (the room's ringOf: the first 19.9% / 73.8% of a block) still hold to within that jitter */
        const r = sig[i] * chi3((j + 0.5) / m) * (1 + JIT * (2 * hash(d * 7 + 5) - 1));
        sky[o] = cx[i] + dx * r; sky[o + 1] = cy[i] + dy * r; sky[o + 2] = cz[i] + dz * r;
      } else {
        let r = Math.cbrt(SHELL0 * SHELL0 * SHELL0 + h3 * (SHELL1 * SHELL1 * SHELL1 - SHELL0 * SHELL0 * SHELL0));
        if (Math.abs(dx * r) < BOX[0] && Math.abs(dy * r) < BOX[1] && Math.abs(dz * r) < BOX[2]) {
          const ex = Math.min(Math.abs(dx) > 1e-6 ? BOX[0] / Math.abs(dx) : 1e9, Math.abs(dy) > 1e-6 ? BOX[1] / Math.abs(dy) : 1e9, Math.abs(dz) > 1e-6 ? BOX[2] / Math.abs(dz) : 1e9);
          r = ex * (1.03 + 0.05 * hash(d * 11 + 5)); dustIn++;
        }
        sky[o] = dx * r; sky[o + 1] = dy * r; sky[o + 2] = dz * r;
      }
      const c = f * 4, s = clusters[c + 3] * chi3(hash(d * 13 + 7) * 0.998);
      const g1 = 2 * hash(d * 17 + 1) - 1, g2 = 6.283185307 * hash(d * 19 + 2), g3 = Math.sqrt(Math.max(0, 1 - g1 * g1));
      thr[o] = clusters[c] + g3 * Math.cos(g2) * s; thr[o + 1] = clusters[c + 1] + g1 * s * 0.8; thr[o + 2] = clusters[c + 2] + g3 * Math.sin(g2) * s;
    }
  }
  return { bs, dA, dFam, sky, thr, clusters, pushedOut: dustIn };
}
export function buildRoster(A, N, sigK = 1) {
  const t0 = now();
  const nA = A.name.length, fam = new Uint8Array(nA), plays = new Int32Array(nA), placed = new Uint8Array(nA), node = new Int16Array(nA);
  const tap = new Int32Array(nA), shuffle = new Int32Array(nA), served = new Int32Array(nA), other = new Int32Array(nA);
  const cx = new Float32Array(nA), cy = new Float32Array(nA), cz = new Float32Array(nA), sig = new Float32Array(nA);
  let total = 0;
  for (let i = 0; i < nA; i++) {
    fam[i] = Math.min(13, A.fam[i] | 0); plays[i] = A.plays[i] | 0; placed[i] = A.placed[i] | 0; node[i] = A.node[i] == null ? -1 : A.node[i];
    tap[i] = A.tap[i] | 0; shuffle[i] = A.shuffle[i] | 0; served[i] = A.served[i] | 0; other[i] = A.other[i] | 0;
    const xy = A.xy[i] || [0.5, 0.5];
    cx[i] = (xy[0] - 0.5) * K; cz[i] = (xy[1] - 0.5) * K;
    cy[i] = placed[i] === 1 ? 0 : SLAB * (hash(i * 7 + 11) - 0.5);
    sig[i] = SIG * sigK * Math.cbrt(Math.max(1, plays[i]));
    total += plays[i];
  }
  const withheld = (A.unlisted && A.unlisted.plays) | 0; total += withheld;
  /* dots per artist: exact at one dot per play, else largest remainder (ties by file order) so the count is exactly N */
  const wts = new Float64Array(nA + 1); for (let i = 0; i < nA; i++) wts[i] = plays[i]; wts[nA] = withheld;
  const q = apportion(wts, N);
  const famPlays = new Int32Array(NFAM); for (let i = 0; i < nA; i++) famPlays[fam[i]] += plays[i]; famPlays[13] += withheld;
  const D = buildDots(nA, q, fam, placed, cx, cy, cz, sig, () => 13, famPlays, N, sigK);
  return {
    kind: 'B', sigK, nA, N, total, withheld, names: A.name.slice(), first: A.first.map((v) => v || null), last: A.last.map((v) => v || null), famOrder: (A.fam_order || []).slice(),
    unlisted: A.unlisted || { artists: 0, plays: 0 },
    fam, plays, size: Float32Array.from(plays), placed, node, tap, shuffle, served, other, cx, cy, cz, sig, famPlays, ...D,
    ms: now() - t0,
  };
}
/* Tier A: the 388 stars of universe_nodes.json and the dust as one block, from the two Tier-A files alone (no counts) */
export function buildRosterA(Nf, Ef, N, sigK = 1) {
  const t0 = now();
  const nodes = (Nf && Nf.nodes) || [], nA = nodes.length, share = +Nf.named_play_share || 0, small = Nf.small_systems || { count: 0, plays: 0 };
  const fam = new Uint8Array(nA), placed = new Uint8Array(nA), node = new Int16Array(nA), size = new Float32Array(nA);
  const cx = new Float32Array(nA), cy = new Float32Array(nA), cz = new Float32Array(nA), sig = new Float32Array(nA);
  /* laid out = in the main web: the largest connected set of stars joined by edges (the rest ring the edge) */
  const par = Int32Array.from({ length: nA }, (_, i) => i), root = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  ((Ef && Ef.edges) || []).forEach((e) => { const a = e.a | 0, b = e.b | 0; if (a >= 0 && b >= 0 && a < nA && b < nA) par[root(a)] = root(b); });
  const cnt = new Int32Array(nA); for (let i = 0; i < nA; i++) cnt[root(i)]++;
  let big = 0; for (let i = 1; i < nA; i++) if (cnt[i] > cnt[big]) big = i;
  /* star dots: the named share of N split by 2^plays_bucket (a size), stepped down by node order (which is plays order)
     inside a bucket: its first star weighs 2^(bucket + 1), its last 2^bucket, so sizes fall off by rank as they do by
     plays instead of in five flat plateaus. the rest of N is the dust block */
  const named = Math.round(share * N), wts = new Float64Array(nA + 1), bn = new Map(), bk = new Map();
  for (let i = 0; i < nA; i++) { const b = Math.max(0, nodes[i].plays_bucket | 0); bn.set(b, (bn.get(b) || 0) + 1); }
  for (let i = 0; i < nA; i++) { const b = Math.max(0, nodes[i].plays_bucket | 0), r = bk.get(b) || 0; bk.set(b, r + 1); wts[i] = Math.pow(2, b + 1 - (r + 0.5) / bn.get(b)); }
  const qs = apportion(wts.subarray(0, nA), named), q = new Int32Array(nA + 1); q.set(qs); q[nA] = N - named;
  /* plays-equivalent per dot, for the stars' spread and the THREADS cluster sizes (the file's own total: dust / (1 - share)) */
  const total = share < 1 ? (small.plays || 0) / (1 - share) : N, per = N > 0 ? total / N : 1;
  const famPlays = new Int32Array(NFAM);
  for (let i = 0; i < nA; i++) {
    const n = nodes[i]; fam[i] = Math.min(13, n.family | 0); node[i] = i;
    placed[i] = cnt[root(i)] >= 2 && root(i) === root(big) ? 0 : 2;
    const xy = n.xy || [0.5, 0.5];
    cx[i] = (xy[0] - 0.5) * K; cz[i] = (xy[1] - 0.5) * K; cy[i] = SLAB * (hash(i * 7 + 11) - 0.5);
    size[i] = q[i] * per; sig[i] = SIG * sigK * Math.cbrt(Math.max(1, size[i]));
    famPlays[fam[i]] += Math.round(size[i]);
  }
  for (let f = 0; f < NFAM; f++) famPlays[f] += DUST_FAM[f];
  /* the dust block's families in DUST_FAM proportion, runs in family order (positions are hashed per dot) */
  const fq = apportion(DUST_FAM, q[nA]), fend = new Int32Array(NFAM); let acc = 0; for (let f = 0; f < NFAM; f++) { acc += fq[f]; fend[f] = acc; }
  let ff = 0; const famOfRest = (j) => { if (j === 0) ff = 0; while (ff < NFAM - 1 && j >= fend[ff]) ff++; return ff; };
  const D = buildDots(nA, q, fam, placed, cx, cy, cz, sig, famOfRest, famPlays, N, sigK);
  return {
    kind: 'A', sigK, nA, N, total: Math.round(total), withheld: 0, names: nodes.map((n) => String(n.name)), first: null, last: null, famOrder: [],
    unlisted: { artists: small.count | 0, plays: small.plays | 0 }, dustArtists: small.count | 0,
    fam, plays: null, size, placed, node, tap: null, shuffle: null, served: null, other: null, cx, cy, cz, sig, famPlays, ...D,
    months: Int16Array.from(nodes, (n) => n.months_active | 0), tapShare: Float32Array.from(nodes, (n) => +n.tap_share || 0), comet: Uint8Array.from(nodes, (n) => (n.comet ? 1 : 0)),
    ms: now() - t0,
  };
}

/* ------------------------------------------------------------------ days */
export function buildDays(D, I) {
  const t0 = now();
  const days = (D && D.days) || [], n = days.length;
  const date = new Int32Array(n), dn = new Int32Array(n), dna = new Int32Array(n), arm = new Int32Array(n * 4), ta = new Int32Array(n * 3);
  const topOff = new Int32Array(n + 1), trOff = new Int32Array(n + 1);
  let nt = 0, nr = 0;
  for (let k = 0; k < n; k++) { nt += (days[k].top || []).length; nr += (days[k].tr || []).length; }
  const top = new Int32Array(nt), tr = new Int32Array(nr);
  nt = 0; nr = 0;
  for (let k = 0; k < n; k++) {
    const r = days[k];
    date[k] = +String(r.d).replace(/-/g, '');
    dn[k] = r.n | 0; dna[k] = r.na | 0;
    for (let j = 0; j < 4; j++) arm[k * 4 + j] = (r.arm && r.arm[j]) | 0;
    for (let j = 0; j < 3; j++) ta[k * 3 + j] = (r.ta && r.ta[j]) | 0;
    topOff[k] = nt; const T = r.top || []; for (let j = 0; j < T.length; j++) top[nt++] = T[j] | 0;
    trOff[k] = nr; const R = r.tr || []; for (let j = 0; j < R.length; j++) tr[nr++] = R[j] | 0;
  }
  topOff[n] = nt; trOff[n] = nr;
  /* the median day (§4.2), the same rule tour.js resolves {median_day} with */
  let median = -1;
  const cut = 20220201, ns = [];
  for (let k = 0; k < n; k++) if (date[k] >= cut) ns.push(dn[k]);
  if (ns.length) {
    ns.sort((a, b) => a - b); const m = ns.length, med = m % 2 ? ns[(m - 1) / 2] : (ns[m / 2 - 1] + ns[m / 2]) / 2;
    for (let k = 0; k < n; k++) if (date[k] >= cut && dn[k] === med) { median = k; break; }
    /* an even count can put the median between two values no day has: then the first day on or after the cut (neutral) */
    if (median < 0) for (let k = 0; k < n; k++) if (date[k] >= cut) { median = k; break; }
  }
  const { nbJ, nbN, nbS } = partners(tr);
  const idx = I || {};
  return {
    n, date, dn, dna, arm, ta, topOff, top, trOff, tr, median, nbJ, nbN, nbS, nbK: NBK,
    /* no time_basis: the index file's own sentence still names hours the records no longer carry; the room pins its own */
    meta: { first_date: idx.first_date || null, last_date: idx.last_date || null, caveat: idx.caveat || '', fam_order: (idx.fam_order || []).slice(), arm_order: (idx.arm_order || []).slice() },
    ms: now() - t0,
  };
}

/* every star's NBK partners played right before or after it most often over the whole log, for the room's lock-on threads:
   the day records' star-to-star artist changes summed over every day, both orders and the three arms the records carry
   (tap, shuffle, served: skip-button starts are not in them) together (pooled like the day lines, GATE_tierb K-B3; no
   rate, no arm). a tie goes to the partner with more plays (roster order is plays order).
   nbJ[i * NBK + q] is the q-th partner (-1: none), nbN the count */
export const NBK = 5;
export function partners(tr) {
  let nS = 0;
  for (let j = 0; j + 3 < tr.length; j += 4) { const a = tr[j], b = tr[j + 1]; if (a >= nS) nS = a + 1; if (b >= nS) nS = b + 1; }
  const pm = new Map();
  for (let j = 0; j + 3 < tr.length; j += 4) {
    const a = tr[j], b = tr[j + 1], c = tr[j + 3]; if (a === b || a < 0 || b < 0 || !(c > 0)) continue;
    const k = a < b ? a * nS + b : b * nS + a; pm.set(k, (pm.get(k) || 0) + c);
  }
  const L = Array.from({ length: nS }, () => []);
  pm.forEach((c, k) => { const a = Math.floor(k / nS), b = k - a * nS; L[a].push([b, c]); L[b].push([a, c]); });
  const nbJ = new Int32Array(nS * NBK).fill(-1), nbN = new Int32Array(nS * NBK);
  for (let i = 0; i < nS; i++) {
    const o = L[i].sort((p, q) => q[1] - p[1] || p[0] - q[0]);
    for (let q = 0; q < Math.min(NBK, o.length); q++) { nbJ[i * NBK + q] = o[q][0]; nbN[i * NBK + q] = o[q][1]; }
  }
  return { nbJ, nbN, nbS: nS };
}

/* ------------------------------------------------------------------ bridges (THREADS) */
export function buildBridges(B) {
  const t0 = now();
  const pairs = new Int32Array(NFAM * NFAM * 3), armTot = new Int32Array(3), months = (B && B.months) || [], at = (B && B.arm_totals) || [];
  (B && B.weft || []).forEach((w) => { const a = w.a | 0, b = w.b | 0, r = w.arm | 0; if (a < NFAM && b < NFAM && r < 3) pairs[(a * NFAM + b) * 3 + r] += w.n | 0; });
  let m0 = -1, m1 = -1;
  at.forEach((x, k) => { const s = (x.tap | 0) + (x.shuffle | 0) + (x.served | 0); armTot[0] += x.tap | 0; armTot[1] += x.shuffle | 0; armTot[2] += x.served | 0; if (s > 0) { if (m0 < 0) m0 = k; m1 = k; } });
  return { pairs, armTot, from: m0 >= 0 ? months[m0] : null, to: m1 >= 0 ? months[m1] : null, ms: now() - t0 };
}

function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error('fetch ' + r.status); return r.json(); });

/* one entry point for both paths. urls: {artists, sigK} | {nodes, edges, sigK} (the parsed Tier-A files) | {days, index}
   (index: a url or the parsed file) | {bridges}. sigK scales every star's spread (a phone draws one dot per four plays on a
   stage a third as wide, so its stars spread a little wider to cover about as many cells) */
export async function run(kind, urls, N) {
  const t0 = now();
  let out;
  if (kind === 'roster') out = buildRoster(await getJSON(urls.artists), N, urls.sigK || 1);
  else if (kind === 'rosterA') out = buildRosterA(urls.nodes, urls.edges, N, urls.sigK || 1);
  else if (kind === 'days') { const [D, I] = await Promise.all([getJSON(urls.days), typeof urls.index === 'string' ? getJSON(urls.index) : urls.index]); out = buildDays(D, I); }
  else if (kind === 'bridges') out = buildBridges(await getJSON(urls.bridges));
  else throw new Error('kind ' + kind);
  out.total_ms = now() - t0;
  return out;
}
export function transferables(out) {
  const t = [];
  for (const k in out) { const v = out[k]; if (v && v.buffer instanceof ArrayBuffer && ArrayBuffer.isView(v) && !t.includes(v.buffer)) t.push(v.buffer); }
  return t;
}

/* module-worker mode */
if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = async (e) => {
    const { id, kind, urls, N } = e.data || {};
    try { const out = await run(kind, urls, N); self.postMessage({ id, ok: true, out }, transferables(out)); }
    catch (err) { self.postMessage({ id, ok: false, err: String(err && err.message || err) }); }
  };
}
