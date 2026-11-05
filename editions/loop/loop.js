(function (root) {
'use strict';

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
if (typeof module === 'object' && module.exports) { module.exports = LOOP; return; }
root.LOOP = LOOP;
if (typeof document === 'undefined') return;

/* ---------- the wall ---------- */
var BG = '#06010f', INK = '#efe9ff', MUTE = '#9a90b8', MINT = '#21f6bc', AMBER = '#f5a623', VIOLET = '#8b6fd6', ICE = '#bcd3ff';
var FAMC = { 'ambient/lofi': '#5fb8ff', 'classical': '#e9dcae', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ffb3c6', 'hip-hop · r&b': '#ff5c7a', 'jazz': '#ffd36b', 'other': '#9a90b8', 'pop': '#ff8fd6', 'rock/metal': '#c9c2ff', 'soundtrack': '#8fd3b6', 'world/desi': '#f5a623', 'untagged': '#6f6790' };
var PCOL = { queue: VIOLET, hand: MINT, feed: ICE };
// the three knobs that move time to loop most from the three rules (full 0 to 1 swing, 30 starts): the rest are set by the rule
var LIVE = [1, 2, 3], FIXED = [0, 4, 5];
var $ = function (id) { return document.getElementById(id); };
var D, M, FIT, S = { K: [0.5, 0.2, 0.3, 0.1, 0.5, 0.2], start: 0, seed: 1, preset: null, path: null, ghost: null, drag: false, anim: 41, play: -1 };
var cv = $('cv'), g = cv.getContext('2d'), W = 0, H = 0, DPR = 1, OX = 0, OY = 0, SCL = 1, base = null;
var Q = new URLSearchParams(location.search);
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function name(i) { return D.n[i] || 'an artist'; }
function fmt(x, d) { return x.toFixed(d); }
function pct(x) { return Math.round(100 * x) + '%'; }

Promise.all([fetch('data/loop.json').then(function (r) { return r.json(); }), fetch('data/fit.json').then(function (r) { return r.json(); })]).then(function (a) {
  D = a[0]; FIT = a[1]; M = model(D);
  S.real = { queue: pairStats(M, D.q), hand: pairStats(M, D.r) };
  S.startsQ = fitStarts(D.q, LOOP.FIT_N, LOOP.FIT_SEED); S.startsH = fitStarts(D.r, LOOP.FIT_N, LOOP.FIT_SEED);
  buildUI();
  var st = parseInt(Q.get('start'), 10), sd = parseInt(Q.get('seed'), 10);
  S.seed = isFinite(sd) ? sd : (Math.random() * 1e9) | 0;
  S.start = isFinite(st) && st >= 0 && st < M.N ? st : pickStart(rng(S.seed));
  setPreset(Q.get('preset') || 'queue', true);
  resize(); newPath(true);
  window.addEventListener('resize', function () { resize(); draw(); });
});

function pickStart(r) {
  var u = r() * M.tot, lo = 0, hi = M.N - 1;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (M.cum[mid] < u) lo = mid + 1; else hi = mid; }
  return lo;
}

function buildUI() {
  var box = $('knobs');
  LIVE.forEach(function (k) {
    var nm = KNOBS[k], d = document.createElement('div'); d.className = 'knob';
    d.innerHTML = '<div class="kh"><label for="k' + k + '">' + nm + '</label><output id="o' + k + '"></output></div>' +
      '<input type="range" id="k' + k + '" min="0" max="1" step="0.05">' +
      '<div class="kg">' + GLOSS[k] + '</div><div class="kb"><i id="b' + k + '"></i></div>';
    box.appendChild(d);
    var inp = d.querySelector('input');
    inp.addEventListener('input', function () {
      if (!S.drag) { S.ghost = S.path ? S.path.slice() : null; S.drag = true; }
      S.K[k] = +inp.value; S.preset = null; syncChips(); newPath(false);
    });
    inp.addEventListener('change', function () { S.drag = false; });
  });
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    S.ghost = S.path ? S.path.slice() : null; setPreset(b.getAttribute('data-p')); newPath(false);
  });
  var lg = $('legend');
  D.fam.forEach(function (nm, f) {
    if (!D.f.some(function (x) { return x === f; })) return;
    var s = document.createElement('span'); s.innerHTML = '<i></i>' + nm; s.firstChild.style.background = FAMC[nm] || MUTE; lg.appendChild(s);
  });
  $('fitnote').textContent = 'the queue and my hand: knobs fitted to ' + D.q.length.toLocaleString('en-US') + ' sampled pairs each of my log. descriptive.\na feed is hand-set, not fitted.';
  $('fixed').innerHTML = 'set by the rule: ' + FIXED.map(function (k) { return KNOBS[k] + ' <output id="o' + k + '"></output>'; }).join(' · ');
  $('nart').textContent = M.N.toLocaleString('en-US');
  cv.addEventListener('pointerdown', tap);
  $('hear').addEventListener('click', hear);
}

var GLOSS = ['artists near this one in sound score higher', 'artists played earlier in this run score higher',
  'artists i play most score higher', 'artists far from every stop so far score higher',
  'where my log usually went next from here scores higher', '0 takes the top score; 1 lands near shuffle'];

function setPreset(p, quiet) {
  var K = p === 'feed' ? [0.4, 0.8, 1, 0, 0.6, 0.15] : FIT[p] ? FIT[p].K.slice() : null;
  if (!K) return;
  S.K = K; S.preset = p; syncChips();
  LIVE.forEach(function (k) { $('k' + k).value = K[k]; });
}

function syncChips() {
  [].forEach.call($('chips').children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-p') === S.preset ? 'true' : 'false'); });
  for (var k = 0; k < 6; k++) $('o' + k).textContent = fmt(S.K[k], 2);
}

function newPath(animate) {
  stopHear();
  var w = walk(M, S.start, S.K, S.seed);
  S.path = w.path; S.stats = pathStats(M, w);
  $('nc').textContent = 'about ' + Math.round(w.nc);
  S.anim = animate && !reduce ? 0 : S.path.length;
  if (animate) S.ghost = null;
  metrics(); pathList();
  if (S.anim < S.path.length) tick(); else draw();
  clearTimeout(S.t); S.t = setTimeout(slow, 140);
}

function tick() {
  S.anim = Math.min(S.path.length, S.anim + 1); draw();
  if (S.anim < S.path.length) setTimeout(function () { requestAnimationFrame(tick); }, 36);
}

function metrics() {
  var s = S.stats;
  $('m-len').textContent = fmt(s.len, 1);
  $('m-fam').textContent = s.fams + ' of ' + D.fam.length;
  $('m-loop').textContent = s.loop > STEPS ? 'none' : 'step ' + s.loop;
  $('m-top').textContent = pct(s.top);
  $('say').textContent = s.loop > STEPS ? 'this rule never loops in 40 steps; ' + pct(s.top) + ' of picks sit in my top 50.' : 'this rule loops back at step ' + s.loop + '; ' + pct(s.top) + ' of picks sit in my top 50.';
}

function pathList() {
  var o = $('path'), h = '';
  S.path.forEach(function (i, k) { h += '<span data-k="' + k + '"><b>' + k + '</b> ' + esc(name(i)) + '</span> '; });
  o.innerHTML = h;
  $('now').textContent = 'stop 0, ' + name(S.path[0]) + ', is where the listener starts. tap any dot to start there.';
}
function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

// the slow part: the knob that moves the picture most, and the real-vs-rule table
function slow() {
  var m0 = sens(S.K), dl = {}, k, best = -1, bv = 0;
  LIVE.forEach(function (k) {
    var K2 = S.K.slice(); K2[k] = S.K[k] <= 0.9 ? S.K[k] + 0.1 : S.K[k] - 0.1;
    var m = sens(K2);
    var v = Math.abs(m[0] - m0[0]) + Math.abs(m[1] - m0[1]) + Math.abs(m[2] - m0[2]) + Math.abs(m[3] - m0[3]);
    dl[k] = v; if (v > bv) { bv = v; best = k; }
  });
  LIVE.forEach(function (k) {
    var lab = document.querySelector('label[for="k' + k + '"]');
    lab.classList.toggle('hot', k === best && bv > 0.01);
    $('b' + k).style.width = (bv > 0 ? Math.round(100 * dl[k] / bv) : 0) + '%';
    $('b' + k).classList.toggle('hot', k === best && bv > 0.01);
  });
  var hl = $('hotline');
  if (best >= 0 && bv > 0.01) { $('k' + best).parentNode.appendChild(hl); hl.hidden = false; } else hl.hidden = true;
  var rq = ruleStats(M, S.K, S.startsQ, LOOP.FIT_SEED), rh = ruleStats(M, S.K, S.startsH, LOOP.FIT_SEED);
  var rule = { hop: (rq.hop + rh.hop) / 2, same: (rq.same + rh.same) / 2, top: (rq.top + rh.top) / 2, inn: (rq.inn + rh.inn) / 2 };
  var rows = [['hop in sound', 'hop', 2], ['same family as last', 'same'], ['inside my top 50', 'top'], ['one of the six nearest', 'inn']];
  var h = '<tr><th></th><th class="q">the queue</th><th class="h">my hand</th><th>this rule</th></tr>';
  rows.forEach(function (r) {
    var f = r[2] ? function (x) { return fmt(x, 2); } : pct;
    h += '<tr><td>' + r[0] + '</td><td>' + f(S.real.queue[r[1]]) + '</td><td>' + f(S.real.hand[r[1]]) + '</td><td>' + f(rule[r[1]]) + '</td></tr>';
  });
  $('tab').innerHTML = h;
  $('gap').textContent = 'gap from this rule to the queue ' + fmt(gap(rq, S.real.queue), 3) + ', to my hand ' + fmt(gap(rh, S.real.hand), 3) + ' (root mean square).';
}

function sens(K) {
  var a = [0, 0, 0, 0];
  for (var k = 0; k < 20; k++) {
    var s = pathStats(M, walk(M, S.start, K, 1000 + k));
    a[0] += Math.min(1, s.len / STEPS); a[1] += s.fams / D.fam.length; a[2] += s.loop / (STEPS + 1); a[3] += s.top;
  }
  return a.map(function (x) { return x / 20; });
}

/* ---------- canvas ---------- */
function resize() {
  var box = $('map');
  DPR = Math.min(2, window.devicePixelRatio || 1); W = Math.max(200, box.clientWidth); H = Math.max(200, box.clientHeight);
  cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  var pad = W < 500 ? 14 : 28; SCL = Math.min(W - 2 * pad, H - 2 * pad) / 1000; OX = (W - 1000 * SCL) / 2; OY = (H - 1000 * SCL) / 2;
  base = null;
}
function X(i) { return Math.round(OX + D.xy[i][0] * SCL) + 0.5; }
function Y(i) { return Math.round(OY + D.xy[i][1] * SCL) + 0.5; }

function drawBase() {
  base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
  var b = base.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
  b.fillStyle = BG; b.fillRect(0, 0, W, H);
  b.globalAlpha = 0.6;
  for (var i = 0; i < M.N; i++) { b.fillStyle = FAMC[D.fam[D.f[i]]] || MUTE; b.fillRect(X(i) - 1.5, Y(i) - 1.5, W < 500 ? 2 : 3, W < 500 ? 2 : 3); }
  b.globalAlpha = 1;
}

function line(p, n, col, alpha) {
  g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
  for (var k = 0; k < n; k++) { if (k) g.lineTo(X(p[k]), Y(p[k])); else g.moveTo(X(p[k]), Y(p[k])); }
  g.stroke(); g.globalAlpha = 1;
}

function draw() {
  if (!M) return;
  if (!base) drawBase();
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(base, 0, 0); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  var col = PCOL[S.preset] || ICE, p = S.path, n = Math.min(S.anim, p.length), k;
  if (S.ghost) line(S.ghost, S.ghost.length, MUTE, 0.55);
  line(p, n, col, 1);
  g.font = '11px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  var boxes = [];
  for (k = 0; k < n; k++) {
    var x = X(p[k]), y = Y(p[k]);
    g.fillStyle = col;
    if (k === 0) { g.strokeStyle = INK; g.strokeRect(x - 4, y - 4, 8, 8); }
    else g.fillRect(x - 2.5, y - 2.5, 4, 4);
  }
  // a number goes in the first of four spots that clears every number already placed; a stop with no clear spot keeps its square only
  for (k = 0; k < n; k++) {
    var lx = X(p[k]), ly = Y(p[k]), lt = String(k), lw = g.measureText(lt).width, spots = [[6, -7], [6, 7], [-6 - lw, -7], [-6 - lw, 7]];
    for (var q = 0; q < 4; q++) {
      var bx = lx + spots[q][0], by = ly + spots[q][1];
      if (bx < 2 || bx + lw > W - 2 || by < 7 || by > H - 7) continue;
      var hit = false;
      for (var b = 0; b < boxes.length && !hit; b++) hit = bx < boxes[b][0] + boxes[b][2] + 2 && boxes[b][0] < bx + lw + 2 && Math.abs(by - boxes[b][1]) < 12;
      if (hit) continue;
      boxes.push([bx, by, lw]); g.fillStyle = k === 0 ? INK : col; g.fillText(lt, bx, by); break;
    }
  }
  if (S.play >= 0 && S.play < n) { g.strokeStyle = INK; g.lineWidth = 1; var px = X(p[S.play]), py = Y(p[S.play]); g.strokeRect(px - 6, py - 6, 12, 12); }
}

function tap(e) {
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 22 * 22;
  for (var i = 0; i < M.N; i++) { var dx = X(i) - x, dy = Y(i) - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return;
  S.start = best; S.seed = (Math.random() * 1e9) | 0; newPath(true);
}

/* ---------- hear it: one preview at a time, low volume, walks the path ---------- */
var AU = null, PV = null;
function hear() {
  if (S.play >= 0) { stopHear(); return; }
  var go = function () { playStop(0); };
  if (PV) go(); else fetch('data/pv.json').then(function (r) { return r.json(); }).then(function (j) { PV = j.a; go(); }).catch(function () {});
}
function playStop(k) {
  while (k < S.path.length && (!D.n[S.path[k]] || !PV[S.path[k]])) k++;
  if (k >= S.path.length) { stopHear(); return; }
  var t = PV[S.path[k]];
  if (!AU) { AU = new Audio(); AU.volume = 0.25; AU.addEventListener('ended', function () { if (S.play >= 0) playStop(S.play + 1); }); }
  AU.src = t[1]; S.play = k;
  var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {});
  $('hear').textContent = 'stop'; $('hear').setAttribute('aria-pressed', 'true');
  $('now').textContent = 'playing stop ' + k + ': ' + t[0] + ', by ' + name(S.path[k]) + '. next stop plays when it ends.';
  [].forEach.call($('path').children, function (s) { s.classList.toggle('on', +s.getAttribute('data-k') === k); });
  draw();
}
function stopHear() {
  if (AU) AU.pause();
  if (S.play < 0) return;
  S.play = -1; $('hear').textContent = 'hear it'; $('hear').setAttribute('aria-pressed', 'false');
  [].forEach.call($('path').children, function (s) { s.classList.remove('on'); });
  draw();
}
})(typeof self !== 'undefined' ? self : this);
