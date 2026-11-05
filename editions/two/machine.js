(function (root) {
'use strict';
/* the loop machine, copied unchanged from ../loop/loop.js (scoring only) */

/* ---------- the machine (shared with the build-time fit) ---------- */
var STEPS = 40, POP_DRAWS = 16, UNI_DRAWS = 16, COOL = 4;
var KNOBS = ['sound alike', 'familiar', 'popular', 'novel', 'repeat the run', 'explore'];

function rng(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function model(D) {
  var N = D.n.length, P = new Float64Array(N * 3), i, k, mx = 0, tot = 0;
  for (i = 0; i < N; i++) { P[3 * i] = D.p[i][0]; P[3 * i + 1] = D.p[i][1]; P[3 * i + 2] = D.p[i][2]; if (D.pl[i] > mx) mx = D.pl[i]; }
  var LP = new Float64Array(N), cum = new Float64Array(N);
  for (i = 0; i < N; i++) { LP[i] = Math.log(1 + D.pl[i]) / Math.log(1 + mx); tot += D.pl[i]; cum[i] = tot; }
  var order = []; for (i = 0; i < N; i++) order.push(i);
  order.sort(function (a, b) { return D.pl[b] - D.pl[a] || a - b; });
  var TOP = new Uint8Array(N); for (i = 0; i < 50; i++) TOP[order[i]] = 1;
  var OUT = []; for (i = 0; i < N; i++) OUT.push([]);
  // the pairs carry no direction: each one counts from both ends, heaviest first, eight per artist
  var eo = D.e.slice().sort(function (a, b) { return b[2] - a[2] || a[0] - b[0] || a[1] - b[1]; });
  for (k = 0; k < eo.length; k++) {
    var r = eo[k];
    if (OUT[r[0]].length < 16) OUT[r[0]].push(r[1], r[2] / 1000);
    if (OUT[r[1]].length < 16) OUT[r[1]].push(r[0], r[2] / 1000);
  }
  var M = { N: N, P: P, LP: LP, cum: cum, tot: tot, TOP: TOP, order: order, NN: D.nn, NB: D.nb, OUT: OUT, F: D.f,
    mark: new Int32Array(N), idx: new Int32Array(N), seen: new Int32Array(N), stamp: 0, gen: 0, RH: 1 };
  // one random hop: median 3D sound distance between 4,000 seeded random pairs
  var g = rng(20261105), ds = [];
  for (k = 0; k < 4000; k++) ds.push(dist(M, (g() * N) | 0, (g() * N) | 0));
  ds.sort(function (a, b) { return a - b; });
  M.RH = ds[2000];
  return M;
}

function dist(M, a, b) {
  var P = M.P, x = P[3 * a] - P[3 * b], y = P[3 * a + 1] - P[3 * b + 1], z = P[3 * a + 2] - P[3 * b + 2];
  return Math.sqrt(x * x + y * y + z * z);
}

var C = [], SIM = [], RUN = [], SC = [];
function add(M, j, st) {
  if (j < 0 || M.mark[j] === st) return j < 0 ? -1 : M.idx[j];
  M.mark[j] = st; M.idx[j] = C.length; C.push(j); SIM.push(-1); RUN.push(0);
  return C.length - 1;
}

// K = [sound alike, familiar, popular, novel, repeat the run, explore], each 0..1
function walk(M, start, K, seed, steps) {
  steps = steps || STEPS;
  var r = rng(seed), path = [start], cur = start, gen = ++M.gen, loopAt = 0, nc = 0, s, k, j, ix, u;
  var T = 0.01 + 0.6 * K[5] * K[5];
  M.seen[start] = gen;
  for (s = 1; s <= steps; s++) {
    var st = ++M.stamp;
    C.length = 0; SIM.length = 0; RUN.length = 0;
    // cooldown: the current stop and the three before it cannot come straight back
    for (k = Math.max(0, path.length - COOL); k < path.length; k++) { M.mark[path[k]] = st; M.idx[path[k]] = -1; }
    var nn = M.NN[cur], nb = M.NB[cur], out = M.OUT[cur];
    for (k = 0; k < nn.length; k++) { add(M, nn[k], st); var n2 = nn[k] >= 0 ? M.NN[nn[k]] : []; for (var k2 = 0; k2 < n2.length; k2++) add(M, n2[k2], st); }
    for (k = 0; k < nb.length; k++) { ix = add(M, nb[k], st); if (ix >= 0) RUN[ix] = Math.max(RUN[ix], 1 - 0.15 * k); }
    for (k = 0; k < out.length; k += 2) { ix = add(M, out[k], st); if (ix >= 0) RUN[ix] = Math.max(RUN[ix], out[k + 1]); }
    for (k = 0; k < path.length; k++) add(M, path[k], st);
    for (k = 0; k < POP_DRAWS; k++) {
      u = r() * M.tot; var lo = 0, hi = M.N - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (M.cum[mid] < u) lo = mid + 1; else hi = mid; }
      add(M, lo, st);
    }
    // explore also widens the pool: at 1 most candidates are drawn from the whole map at random
    var ud = UNI_DRAWS + Math.round(64 * K[5]);
    for (k = 0; k < ud; k++) add(M, (r() * M.N) | 0, st);
    var best = -1e9;
    SC.length = C.length; nc += C.length;
    for (k = 0; k < C.length; k++) {
      j = C[k];
      var sim = SIM[k];
      if (sim < 0) sim = Math.exp(-dist(M, cur, j) / M.RH / 0.3);
      var fam = M.seen[j] === gen ? 1 : 0;
      var md = 1e9;
      for (var q = 0; q < path.length; q++) { var d = dist(M, path[q], j); if (d < md) md = d; }
      var nov = Math.min(1, md / M.RH / 0.5);
      var sc = K[0] * sim + K[1] * fam + K[2] * M.LP[j] + K[3] * nov + K[4] * RUN[k];
      SC[k] = sc; if (sc > best) best = sc;
    }
    var sum = 0;
    for (k = 0; k < C.length; k++) { SC[k] = Math.exp((SC[k] - best) / T); sum += SC[k]; }
    u = r() * sum; var pick = C[C.length - 1];
    for (k = 0; k < C.length; k++) { u -= SC[k]; if (u <= 0) { pick = C[k]; break; } }
    if (M.seen[pick] === gen && !loopAt) loopAt = s;
    M.seen[pick] = gen; path.push(pick); cur = pick;
  }
  return { path: path, loopAt: loopAt, nc: nc / steps };
}

// per path: the four wall metrics + the four per-step stats the fit compares
function pathStats(M, w) {
  var p = w.path, n = p.length - 1, len = 0, same = 0, top = 0, inn = 0, fams = {}, nf = 0, k;
  fams[M.F[p[0]]] = 1; nf = 1;
  for (k = 1; k <= n; k++) {
    var a = p[k - 1], b = p[k];
    len += dist(M, a, b) / M.RH;
    if (M.F[a] === M.F[b]) same++;
    if (M.TOP[b]) top++;
    if (M.NN[a].indexOf(b) >= 0) inn++;
    if (!fams[M.F[b]]) { fams[M.F[b]] = 1; nf++; }
  }
  return { len: len, fams: nf, loop: w.loopAt || n + 1, top: top / n, hop: len / n, same: same / n, inn: inn / n };
}

// the pairs carry no direction, so the two direction-dependent stats average both ends
function pairStats(M, pairs) {
  var h = 0, s = 0, t = 0, q = 0, k;
  for (k = 0; k < pairs.length; k++) {
    var a = pairs[k][0], b = pairs[k][1];
    h += dist(M, a, b) / M.RH; if (M.F[a] === M.F[b]) s++;
    t += (M.TOP[a] + M.TOP[b]) / 2;
    q += ((M.NN[a].indexOf(b) >= 0 ? 1 : 0) + (M.NN[b].indexOf(a) >= 0 ? 1 : 0)) / 2;
  }
  var n = pairs.length;
  return { hop: h / n, same: s / n, top: t / n, inn: q / n, n: n };
}

// starts for a fit: sources of real pairs, drawn with a fixed seed
function fitStarts(pairs, n, seed) {
  var g = rng(seed), out = [];
  for (var k = 0; k < n; k++) { var pr = pairs[(g() * pairs.length) | 0]; out.push(pr[g() < 0.5 ? 0 : 1]); }
  return out;
}

function ruleStats(M, K, starts, seed) {
  var a = { hop: 0, same: 0, top: 0, inn: 0 }, k;
  for (k = 0; k < starts.length; k++) {
    var s = pathStats(M, walk(M, starts[k], K, seed + k));
    a.hop += s.hop; a.same += s.same; a.top += s.top; a.inn += s.inn;
  }
  for (k in a) a[k] /= starts.length;
  return a;
}

function gap(a, b) {
  var d1 = a.hop - b.hop, d2 = a.same - b.same, d3 = a.top - b.top, d4 = a.inn - b.inn;
  return Math.sqrt((d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4) / 4);
}

var LOOP = { KNOBS: KNOBS, STEPS: STEPS, rng: rng, model: model, walk: walk, pathStats: pathStats, pairStats: pairStats,
  fitStarts: fitStarts, ruleStats: ruleStats, gap: gap, dist: dist, COOL: COOL, FIT_N: 40, FIT_SEED: 20261105 };
root.LOOP = LOOP;
})(window);
