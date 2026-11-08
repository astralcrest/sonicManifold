(function (root) {
'use strict';

/* ---------- the machine (shared with the build-time fit) ---------- */
var STEPS = 40, POP_DRAWS = 16, UNI_DRAWS = 16, COOL = 4;
var KNOBS = ['sound alike', 'familiar', 'popular', 'novel', 'repeat itself', 'explore'];

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
  if (j < 0 || (M.skip && M.skip[j])) return -1;
  if (M.mark[j] === st) return M.idx[j];
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
var NIGHT = [6, 1, 15], WARM = [26, 18, 6], INK = '#efe9ff', MUTE = '#9a90b8', MINT = '#21f6bc', AMBER = '#f5a623', VIOLET = '#8b6fd6', ICE = '#bcd3ff';
var FAMC = { 'ambient/lofi': '#5fb8ff', 'classical': '#e9dcae', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ffb3c6', 'hip-hop · r&b': '#ff5c7a', 'jazz': '#ffd36b', 'other': '#9a90b8', 'pop': '#ff8fd6', 'rock/metal': '#c9c2ff', 'soundtrack': '#8fd3b6', 'world/desi': '#f5a623', 'untagged': '#6f6790' };
var PCOL = { queue: VIOLET, hand: MINT, feed: INK, siren: '#ff5c7a' };
var PGLY = { queue: 'ring', hand: 'star', feed: 'dot', siren: 'dot' };
var PDESC = { queue: 'auto-play: dials set to match the app\'s own next picks in my log.', hand: 'my press: dials set to match the plays i chose by hand.', feed: 'a feed: a rule that leans on popular, familiar artists.', siren: 'the pull: a rule that drags every walk to one corner, to show what a feed can do.' };
var DIALN = ['sounds alike', 'come back', 'popular', 'new ground', 'follow my habit', 'random hop'];
// the three knobs that move time to loop most from the three rules (full 0 to 1 swing, 30 starts): the rest are set by the rule
var LIVE = [1, 2, 3], FIXED = [0, 4, 5];
var $ = function (id) { return document.getElementById(id); };
var KIOSK = /[?&]kiosk=1/.test(location.search), IDLE = 120000, SB = [0.55, 0, 0.1, 1, 0.5, 0];
var D, M, FIT, S = { siren: null, K: [0.5, 0.2, 0.3, 0.1, 0.5, 0.2], start: 0, seed: 1, preset: null, path: null, ghost: null, drag: false, anim: 41, play: -1 };
var cv = $('cv'), g = cv.getContext('2d'), W = 0, H = 0, DPR = 1, OX = 0, OY = 0, SCL = 1, base = null;
var Q = new URLSearchParams(location.search);
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function name(i) { return D.n[i] || 'an artist'; }
function fmt(x, d) { return x.toFixed(d); }
function pct(x) { return Math.round(100 * x) + '%'; }

$('now').textContent = 'loading my map';
Promise.all([fetch('data/loop.json').then(function (r) { return r.json(); }), fetch('data/fit.json').then(function (r) { return r.json(); })]).then(function (a) {
  if ($('now').textContent === 'loading my map') $('now').textContent = '';
  D = a[0]; FIT = a[1]; M = model(D);
  S.real = { queue: pairStats(M, D.q), hand: pairStats(M, D.r) };
  S.startsQ = fitStarts(D.q, LOOP.FIT_N, LOOP.FIT_SEED); S.startsH = fitStarts(D.r, LOOP.FIT_N, LOOP.FIT_SEED);
  buildUI();
  var H0 = new URLSearchParams(location.hash.slice(1));
  var get = function (k) { return H0.has(k) ? H0.get(k) : Q.get(k); };
  var st = parseInt(get('start'), 10), sd = parseInt(get('seed'), 10);
  S.seed = isFinite(sd) ? sd : (Math.random() * 1e9) | 0;
  S.start = isFinite(st) && st >= 0 && st < M.N ? st : pickStart(rng(S.seed));
  var p0 = get('p') || get('preset') || 'queue', kk = (get('k') || '').split(',').map(Number);
  if (p0 === 'siren') setPreset('siren', true, parseFloat(get('s')));
  else if (p0 === 'free' && kk.length === 6 && kk.every(isFinite)) { setPreset('queue', true); S.K = kk.map(function (x) { return Math.max(0, Math.min(1, x)); }); S.preset = null; LIVE.forEach(function (k) { $('k' + k).value = S.K[k]; }); syncChips(); }
  else setPreset(p0, true);
  if (innerWidth >= 700) $('tabd').open = true;
  resize(); newPath(true);
  window.addEventListener('resize', function () { resize(); draw(); });
  if (KIOSK) ['pointerdown', 'keydown', 'input'].forEach(function (ev) { window.addEventListener(ev, arm, true); });
});

function pickStart(r) {
  var u = r() * M.tot, lo = 0, hi = M.N - 1;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (M.cum[mid] < u) lo = mid + 1; else hi = mid; }
  return lo;
}

function buildUI() {
  var box = $('knobs');
  LIVE.forEach(function (k) {
    var nm = DIALN[k], d = document.createElement('div'); d.className = 'knob'; d.id = 'kn' + k;
    d.innerHTML = '<div class="kh"><label for="k' + k + '">' + nm + '</label><output id="o' + k + '"></output></div>' +
      '<input type="range" id="k' + k + '" min="0" max="1" step="0.05">' +
      '<div class="kg">' + GLOSS[k] + '</div><div class="kb"><i id="b' + k + '"></i></div>';
    box.appendChild(d);
    var inp = d.querySelector('input');
    inp.addEventListener('input', function () {
      if (!S.drag) { S.ghost = S.path ? S.path.slice() : null; S.drag = true; }
      S.K[k] = +inp.value;
      if (S.siren != null) S.K = sirenK(S.siren); else S.preset = null;
      syncChips(); newPath(false);
    });
    inp.addEventListener('change', function () { S.drag = false; });
  });
  var sd0 = document.createElement('div'); sd0.className = 'knob'; sd0.id = 'kns'; sd0.hidden = true;
  sd0.innerHTML = '<div class="kh"><label for="ks">the pull</label><output id="os"></output></div>' +
    '<input type="range" id="ks" min="0" max="1" step="0.05" value="0.5">' +
    '<div class="kg">higher: the walk sticks to the artists i play most and starts repeating within five steps.</div><div class="kb"><i id="bs"></i></div>' +
    '<div class="mh"><span>how tightly it repeats</span><output id="mv"></output></div><div class="m1"><i id="mf"></i></div>';
  box.appendChild(sd0);
  $('ks').addEventListener('input', function () {
    if (!S.drag) { S.ghost = S.path ? S.path.slice() : null; S.drag = true; }
    S.siren = +$('ks').value; S.K = sirenK(S.siren); syncChips(); newPath(false);
  });
  $('ks').addEventListener('change', function () { S.drag = false; });
  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    pushH(); S.ghost = S.path ? S.path.slice() : null; setPreset(b.getAttribute('data-p')); newPath(false);
  });
  $('reset').addEventListener('click', function () { pushH(); reset(); });
  var lg = $('legend');
  D.fam.forEach(function (nm, f) {
    if (!D.f.some(function (x) { return x === f; })) return;
    var s = document.createElement('span'); s.innerHTML = '<i></i>' + nm; s.firstChild.style.background = FAMC[nm] || MUTE; lg.appendChild(s);
  });
  $('fitnote').textContent = 'auto-play and my press: dials matched to ' + D.q.length.toLocaleString('en-US') + ' sampled pairs each of my log.\na feed is hand-set, not matched. the pull is a toy, hand-set, not matched.';
  $('fixed').innerHTML = 'fixed by this rule: ' + FIXED.map(function (k) { return DIALN[k] + ' <output id="o' + k + '"></output>'; }).join(' · ');
  $('nart').textContent = M.N.toLocaleString('en-US');
  cv.addEventListener('pointerdown', tap);
  cv.addEventListener('pointermove', hoverTip); cv.addEventListener('pointerleave', function () { $('tip').hidden = true; });
  $('hear').addEventListener('click', hear);
  $('skip').addEventListener('click', nextStop);
  $('path').addEventListener('click', function (e) { var sp = e.target.closest('span[data-k]'); if (sp) withPV(function () { playStop(+sp.getAttribute('data-k')); }); });
  $('path').addEventListener('keydown', function (e) { var sp = e.target.closest('span[data-k]'); if (sp && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); withPV(function () { playStop(+sp.getAttribute('data-k')); }); } });
}

var GLOSS = ['higher: it hops to artists that sound near the last one.', 'higher: it goes back to artists it already visited.',
  'higher: it picks the artists i play most.', 'higher: it heads for artists far from every stop so far.',
  'higher: it goes where my log usually went next.', 'higher: more random hops, like shuffle.'];

function sirenK(s) { var K = SB.slice(); K[1] = s; K[2] = s; K[3] = S.K[3]; return K; }
function nice(x) { return String(+x.toFixed(2)); }
function mix(s) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(NIGHT[i] + (WARM[i] - NIGHT[i]) * s); }).join(',') + ')'; }

var H1 = document.getElementById('h1').textContent;
function setPreset(p, quiet, sv) {
  var on = p === 'siren';
  if (on) {
    S.siren = isFinite(sv) ? Math.max(0, Math.min(1, Math.round(sv * 20) / 20)) : 0.5;
    S.K = SB.slice(); S.K = sirenK(S.siren); $('ks').value = S.siren;
  } else {
    var K = p === 'feed' ? [0.4, 0.8, 1, 0, 0.6, 0.15] : FIT[p] ? FIT[p].K.slice() : null;
    if (!K) return;
    S.siren = null; S.K = K;
    LIVE.forEach(function (k) { $('k' + k).value = K[k]; });
  }
  S.preset = p;
  $('kn1').hidden = $('kn2').hidden = $('kn3').hidden = on; $('kns').hidden = !on;
  $('kh2').textContent = on ? 'one dial: the pull' : 'three dials: the ones that change the walk most';
  document.documentElement.style.setProperty('--night', mix(on ? S.siren : 0));
  $('h1').textContent = on ? 'the pull: one dial drags every walk closed.' : H1;
  syncChips();
}

function syncChips() {
  var pc = PCOL[S.preset] || ICE; document.body.style.setProperty('--act', pc); document.body.style.setProperty('--acc', pc);
  [].forEach.call($('chips').children, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-p') === S.preset ? 'true' : 'false'); });
  if ($('pdesc')) $('pdesc').textContent = PDESC[S.preset] || 'your own dial settings.';
  for (var k = 0; k < 6; k++) $('o' + k).textContent = fmt(S.K[k], 2);
  if (S.siren != null) { $('os').textContent = nice(S.siren); document.documentElement.style.setProperty('--night', mix(S.siren)); }
}

function pushH() {
  if (KIOSK) return;
  try { history.pushState(null, '', location.pathname + location.search + location.hash); } catch (e) {}
}
window.addEventListener('popstate', function () {
  if (!D) return;
  var H = new URLSearchParams(location.hash.slice(1)), p = H.get('p') || 'queue', sd = parseInt(H.get('seed'), 10), st = parseInt(H.get('start'), 10);
  if (isFinite(sd)) S.seed = sd;
  if (isFinite(st) && st >= 0 && st < M.N) S.start = st;
  S.ghost = null; setPreset(p === 'free' ? 'queue' : p, true, parseFloat(H.get('s'))); newPath(false);
});
function saveHash() {
  if (KIOSK || !S.start && S.start !== 0) return;
  var h = '#p=' + (S.preset || 'free') + '&k=' + S.K.map(function (x) { return nice(x); }).join(',') + (S.siren != null ? '&s=' + nice(S.siren) : '') + '&start=' + S.start + '&seed=' + S.seed;
  try { history.replaceState(null, '', location.pathname + location.search + h); } catch (e) {}
}

function reset() {
  stopHear(); S.ghost = null;
  S.seed = 1; S.start = pickStart(rng(S.seed));
  setPreset('queue');
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  newPath(true);
}
var idleT = 0;
function arm() { clearTimeout(idleT); idleT = setTimeout(function () { reset(); }, IDLE); }

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
  saveHash();
}

function tick() {
  S.anim = Math.min(S.path.length, S.anim + 1); draw();
  if (S.anim < S.path.length) setTimeout(function () { requestAnimationFrame(tick); }, 36);
}

function metrics() {
  var s = S.stats;
  $('m-len').textContent = fmt(s.len, 1);
  $('m-fam').textContent = s.fams + ' of ' + D.fam.length;
  $('m-loop').textContent = s.loop > STEPS ? 'never' : 'step ' + s.loop;
  $('m-top').textContent = pct(s.top);
  if (S.siren != null) {
    var cl = s.loop > STEPS ? 0 : Math.max(0, Math.min(1, (STEPS - s.loop) / 35));
    $('mf').style.width = Math.round(100 * cl) + '%'; $('mv').textContent = nice(cl) + ' this path';
    $('say').textContent = 'one walk at ' + nice(S.siren) + ': ' + (s.loop > STEPS ? 'never repeats in 40 steps' : 'starts repeating at step ' + s.loop) + '. a toy rule.';
    return;
  }
  $('say').textContent = s.loop > STEPS ? 'this rule never repeats in 40 steps; ' + pct(s.top) + ' of its picks are artists i play most.' : 'this rule starts repeating at step ' + s.loop + '; ' + pct(s.top) + ' of its picks are artists i play most.';
}

function pathList() {
  var o = $('path'), h = '';
  S.path.forEach(function (i, k) { h += '<span data-k="' + k + '" tabindex="0" role="button"><i style="background:' + (FAMC[D.fam[D.f[i]]] || MUTE) + '"></i><b>' + k + '</b> ' + esc(name(i)) + '</span> '; });
  o.innerHTML = h;
  $('now').textContent = 'stop 0, ' + name(S.path[0]) + ', is where the walk starts. press hear it, or tap a shape on the map to start somewhere else.';
}
function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

// the slow part: the knob that moves the picture most, and the real-vs-rule table
function slow() {
  var m0 = sens(S.K), dl = {}, k, best = -1, bv = 0, VIS = S.siren != null ? ['s'] : LIVE;
  VIS.forEach(function (k) {
    var K2;
    if (k === 's') K2 = sirenK(S.siren <= 0.9 ? S.siren + 0.1 : S.siren - 0.1);
    else { K2 = S.K.slice(); K2[k] = S.K[k] <= 0.9 ? S.K[k] + 0.1 : S.K[k] - 0.1; }
    var m = sens(K2);
    var v = Math.abs(m[0] - m0[0]) + Math.abs(m[1] - m0[1]) + Math.abs(m[2] - m0[2]) + Math.abs(m[3] - m0[3]);
    dl[k] = v; if (v > bv) { bv = v; best = k; }
  });
  VIS.forEach(function (k) {
    var lab = document.querySelector('label[for="k' + k + '"]');
    lab.classList.toggle('hot', k === best && bv > 0.01);
    $('b' + k).style.width = (bv > 0 ? Math.round(100 * dl[k] / bv) : 0) + '%';
    $('b' + k).classList.toggle('hot', k === best && bv > 0.01);
  });
  var hl = $('hotline');
  if (best >= 0 && bv > 0.01) { $('k' + best).parentNode.insertBefore(hl, $('k' + best).parentNode.querySelector('.kb').nextSibling); hl.hidden = false; } else hl.hidden = true;
  if (S.siren != null) {
    var ls = [], i;
    for (i = 0; i < 30; i++) { var q = pathStats(M, walk(M, S.start, S.K, 1000 + i)); ls.push(q.loop > STEPS ? STEPS + 1 : q.loop); }
    ls.sort(function (a, b) { return a - b; }); var md = (ls[14] + ls[15]) / 2, nl = ls.filter(function (x) { return x > STEPS; }).length;
    $('say').textContent += ' across 30 walks: median repeat at step ' + Math.round(md) + (md > STEPS ? ' (none)' : '') + (nl ? ', ' + nl + ' never repeat' : '') + '.';
  }
  var rq = ruleStats(M, S.K, S.startsQ, LOOP.FIT_SEED), rh = ruleStats(M, S.K, S.startsH, LOOP.FIT_SEED);
  var rule = { hop: (rq.hop + rh.hop) / 2, same: (rq.same + rh.same) / 2, top: (rq.top + rh.top) / 2, inn: (rq.inn + rh.inn) / 2 };
  var rows = [['hop in sound', 'hop', 2], ['same family as last', 'same'], ['inside my top 50', 'top'], ['one of the six nearest', 'inn']];
  var h = '<tr><th></th><th class="q">auto-play</th><th class="h">my press</th><th>this rule</th></tr>';
  rows.forEach(function (r) {
    var f = r[2] ? function (x) { return fmt(x, 2); } : pct;
    h += '<tr><td>' + r[0] + '</td><td>' + f(S.real.queue[r[1]]) + '</td><td>' + f(S.real.hand[r[1]]) + '</td><td>' + f(rule[r[1]]) + '</td></tr>';
  });
  $('tab').innerHTML = h;
  $('gap').textContent = 'gap from this rule to auto-play ' + fmt(gap(rq, S.real.queue), 3) + ', to my press ' + fmt(gap(rh, S.real.hand), 3) + ' (root mean square).';
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
  DPR = Math.min(3, window.devicePixelRatio || 1); W = Math.max(200, box.clientWidth); H = Math.max(200, box.clientHeight);
  cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  var pad = W < 500 ? 14 : 28; SCL = Math.min(W - 2 * pad, H - 2 * pad) / 1000; OX = (W - 1000 * SCL) / 2; OY = (H - 1000 * SCL) / 2;
  base = null;
}
function X(i) { return OX + D.xy[i][0] * SCL; }
function Y(i) { return OY + D.xy[i][1] * SCL; }

var PK = root.WK && root.WK.P, PEND = { queue: INK, hand: INK, feed: INK, siren: INK };
function drawBase() {
  base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
  var b = base.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
  var small = W < 500;
  if (PK) PK.field(b, D.xy, X, Y, { pl: D.pl, lo: small ? 1.6 : 2.4, hi: small ? 5 : 8, col: function (i) { return FAMC[D.fam[D.f[i]]] || MUTE; } });
  else { b.globalAlpha = 0.6; for (var i = 0; i < M.N; i++) { b.fillStyle = FAMC[D.fam[D.f[i]]] || MUTE; b.fillRect(X(i) - 1.5, Y(i) - 1.5, small ? 2 : 3, small ? 2 : 3); } }
}

function line(p, n, col, alpha) {
  g.globalAlpha = alpha; g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
  for (var k = 0; k < n; k++) { if (k) g.lineTo(X(p[k]), Y(p[k])); else g.moveTo(X(p[k]), Y(p[k])); }
  g.stroke(); g.globalAlpha = 1;
}

function draw() {
  if (!M) return;
  if (!base) drawBase();
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = mix(S.siren != null ? S.siren : 0); g.fillRect(0, 0, cv.width, cv.height); g.drawImage(base, 0, 0); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  var col = PCOL[S.preset] || ICE, end = PEND[S.preset] || INK, p = S.path, n = Math.min(S.anim, p.length), k, pts = [];
  for (k = 0; k < n; k++) pts.push([X(p[k]), Y(p[k])]);
  if (S.ghost) line(S.ghost, S.ghost.length, MUTE, 0.45);
  var pl = S.play >= 0 && S.play < n ? S.play : -1, wts = p.slice(0, n).map(function (i) { return Math.log(1 + D.pl[i]) / 11; }), lw = W < 500 ? 2 : 2.5, ss = W < 500 ? 5 : 6;
  if (PK) {
    if (pl < 0) { PK.ribbon(g, pts, col, end, lw, 0.92, null, wts); PK.stops(g, pts, col, end, ss, PGLY[S.preset] || 'dot'); }
    else {
      PK.ribbon(g, pts, col, end, lw * 0.8, 0.26, null, wts);
      PK.ribbon(g, pts.slice(0, pl + 1), col, end, lw * 1.2, 0.98, null, wts.slice(0, pl + 1));
      PK.stops(g, pts.slice(0, pl + 1), col, end, ss, PGLY[S.preset] || 'dot');
      g.globalAlpha = 0.4; g.fillStyle = col;
      for (k = pl + 1; k < n; k++) { g.beginPath(); g.arc(pts[k][0], pts[k][1], 2.4, 0, 6.2832); g.fill(); }
      g.globalAlpha = 1;
    }
  } else line(p, n, col, 1);
  if (n && PK) PK.glyph(g, 'star', pts[0][0], pts[0][1], 8, INK);
  g.lineWidth = 1.5;
  for (k = 0; k < n; k++) {
    var fc = FAMC[D.fam[D.f[p[k]]]] || MUTE, chg = k > 0 && D.f[p[k]] !== D.f[p[k - 1]];
    g.globalAlpha = pl >= 0 && k > pl ? 0.3 : 1; g.strokeStyle = fc; g.lineWidth = chg ? 2.4 : 1.2;
    g.beginPath(); g.arc(pts[k][0], pts[k][1], chg ? 9 : 7.5, 0, 6.2832); g.stroke();
  }
  g.globalAlpha = 1;
  g.font = '500 11px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  var boxes = [];
  for (k = 0; k < n; k++) {
    var lx = X(p[k]), ly = Y(p[k]), lt = String(k), lw = g.measureText(lt).width, spots = [[7, -8], [7, 8], [-7 - lw, -8], [-7 - lw, 8]];
    for (var q = 0; q < 4; q++) {
      var bx = lx + spots[q][0], by = ly + spots[q][1];
      if (bx < 2 || bx + lw > W - 2 || by < 7 || by > H - 7) continue;
      var hit = false;
      for (var bb = 0; bb < boxes.length && !hit; bb++) hit = bx < boxes[bb][0] + boxes[bb][2] + 2 && boxes[bb][0] < bx + lw + 2 && Math.abs(by - boxes[bb][1]) < 12;
      if (hit) continue;
      boxes.push([bx, by, lw]); g.fillStyle = k === 0 ? INK : PK ? PK.mix(col, end, n > 1 ? k / (n - 1) : 0) : col; g.fillText(lt, bx, by); break;
    }
  }
  if (S.play >= 0 && S.play < n && root.WK) root.WK.pulse(g, X(p[S.play]), Y(p[S.play]), INK, 12);
}

function hoverTip(e) {
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 16 * 16, tip = $('tip');
  for (var i = 0; i < M.N; i++) { var dx = X(i) - x, dy = Y(i) - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  if (best < 0) { tip.hidden = true; return; }
  var k = S.path ? S.path.indexOf(best) : -1, fam = D.fam[D.f[best]] || '';
  tip.innerHTML = '<b>' + name(best) + '</b>' + (fam ? ' <i style="background:' + (FAMC[fam] || MUTE) + '"></i>' + fam : '') + (k >= 0 ? ' · stop ' + k + ', tap to hear it' : ' · tap to start a walk here');
  tip.style.left = Math.min(r.width - 220, x + 12) + 'px'; tip.style.top = Math.max(0, y - 34) + 'px'; tip.hidden = false;
}
function tap(e) {
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 22 * 22;
  for (var i = 0; i < M.N; i++) { var dx = X(i) - x, dy = Y(i) - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return;
  var on = S.path ? S.path.indexOf(best) : -1;
  if (on >= 0 && on < Math.min(S.anim, S.path.length)) { withPV(function () { playStop(on); }); return; }
  S.start = best; S.seed = (Math.random() * 1e9) | 0; newPath(true);
}

/* ---------- hear it: one preview at a time, each stop 10 s, the walk keeps going to its end ---------- */
var AU = null, PV = null, STOPMS = 10000;
function withPV(go) {
  if (PV) { go(); return; }
  fetch('data/pv.json').then(function (r) { return r.json(); }).then(function (j) { PV = j.a; go(); }).catch(function () { $('now').textContent = 'the clips did not load. reload to try again.'; });
}
function hear() {
  if (S.play >= 0) { stopHear(); return; }
  withPV(function () { playStop(0); });
}
function nextStop() {
  if (S.play >= 0) playStop(S.play + 1); else withPV(function () { playStop(0); });
}
function playStop(k) {
  var from = k, miss = [];
  while (k < S.path.length && (!D.n[S.path[k]] || !PV[S.path[k]])) { miss.push(k); k++; }
  if (k >= S.path.length) { stopHear(from > 0 ? 'that was the whole walk.' : 'none of these artists has a clip. start a walk somewhere else.'); return; }
  var ai = S.path[k], t = PV[ai], before = 0, k2, prev = k > 0 ? S.path[k - 1] : -1;
  for (k2 = 0; k2 < k; k2++) if (S.path[k2] === ai) before++;
  clearTimeout(S.stopT);
  if (!AU) { AU = new Audio(); AU.volume = 0.25; AU.addEventListener('ended', function () { if (S.play >= 0) playStop(S.play + 1); }); }
  AU.src = t[1]; S.play = k;
  if (before) { var off = (before * 6) % 20, seek = function () { AU.removeEventListener('loadedmetadata', seek); try { AU.currentTime = off; } catch (e) {} }; AU.addEventListener('loadedmetadata', seek); }
  var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {});
  S.stopT = setTimeout(function () { if (S.play === k) playStop(k + 1); }, STOPMS);
  var fam = D.fam[D.f[ai]] || '', pf = prev >= 0 ? D.fam[D.f[prev]] : '';
  var same = prev === ai ? ' same artist as the stop before, so a later part of its clip.' : before ? ' back at an artist the walk already visited, so a later part of its clip.' : '';
  var chg = prev >= 0 && pf !== fam ? ' the family changes from ' + pf + '.' : prev >= 0 ? ' same family as the stop before.' : '';
  $('hear').textContent = 'stop'; $('hear').setAttribute('aria-pressed', 'true');
  $('now').textContent = 'stop ' + k + ' of ' + (S.path.length - 1) + ': \u201c' + t[0] + '\u201d by ' + name(ai) + ', ' + fam + '.' + chg + same + (miss.length ? ' (stop' + (miss.length > 1 ? 's ' : ' ') + miss.join(', ') + ' had no clip.)' : '') + (k < S.path.length - 1 ? ' next stop in 10 s, or press next stop.' : '') + (root.WK && !root.WK.sound() ? ' sound is off: tap the sound chip at the top.' : '');
  [].forEach.call($('path').children, function (sp) { var on = +sp.getAttribute('data-k') === k; sp.classList.toggle('on', on); if (on && sp.scrollIntoView && !reduce) sp.scrollIntoView({ block: 'nearest' }); });
  if (root.WK) root.WK.live(draw); else draw();
}
function stopHear(msg) {
  clearTimeout(S.stopT);
  if (AU) AU.pause();
  if (root.WK) root.WK.still();
  if (S.play < 0) return;
  S.play = -1; $('hear').textContent = 'hear it'; $('hear').setAttribute('aria-pressed', 'false');
  [].forEach.call($('path').children, function (s) { s.classList.remove('on'); });
  if (msg) $('now').textContent = msg;
  draw();
}
})(typeof self !== 'undefined' ? self : this);
