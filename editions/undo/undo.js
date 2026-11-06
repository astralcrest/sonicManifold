(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, FIT, LOOP, F, MP, MAP, K, ROOMS = 11;
var S = { cut: 4, start: 0, seed: 1, A: null, B: null, diff: -1 };
var YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

function weighted(u0) {
  var u = u0 * M.tot, lo = 0, hi = M.N - 1;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (M.cum[mid] < u) lo = mid + 1; else hi = mid; }
  return lo;
}
function rooms(p) { var o = {}, n = 0; p.forEach(function (i) { var c = MP.c[i]; if (c >= 0 && c < ROOMS && !o[c]) { o[c] = 1; n++; } }); return { set: o, n: n }; }
function skipFor(cut, start) {
  var s = new Uint8Array(M.N), n = 0;
  for (var i = 0; i < M.N; i++) if (F.y0[i] === cut && i !== start) { s[i] = 1; n++; }
  s.n = n; return s;
}
function pair(start, seed, skip) {
  M.skip = null; var a = LOOP.walk(M, start, K, seed).path;
  M.skip = skip; var b = LOOP.walk(M, start, K, seed).path; M.skip = null;
  return [a, b];
}
function lost(a, b) { var ra = rooms(a), rb = rooms(b), n = 0; for (var c in ra.set) if (!rb.set[c]) n++; return { n: n, ra: ra.n, rb: rb.n }; }

function compute() {
  var skip = skipFor(S.cut, S.start), p = pair(S.start, S.seed, skip);
  S.A = p[0]; S.B = p[1]; S.skip = skip;
  S.diff = -1; for (var k = 0; k < S.A.length; k++) if (S.A[k] !== S.B[k]) { S.diff = k; break; }
  S.l = lost(S.A, S.B);
  // 20 more weighted starts, same cut, for the median: one path can be luck
  var g = LOOP.rng(777 + S.cut), ls = [];
  for (var t = 0; t < 20; t++) { var st = weighted(g()), sk = skipFor(S.cut, st), q = pair(st, 1000 + t, sk); ls.push(lost(q[0], q[1]).n); }
  ls.sort(function (a, b) { return a - b; }); S.med = (ls[9] + ls[10]) / 2; S.max = ls[19];
}

function render() {
  var yr = YEARS[S.cut], l = S.l;
  $('big').textContent = l.n + ' of ' + ROOMS;
  $('say').textContent = S.diff < 0
    ? 'with ' + yr + ' removed this start and seed grow the same path. the rule never reached for those artists here.'
    : 'with ' + yr + ' removed the path first goes elsewhere at step ' + S.diff + '. ' + (l.n ? 'it enters ' + l.rb + ' neighborhoods, not ' + l.ra + ', so it loses ' + l.n + '.' : 'it still enters every one of the ' + l.ra + ' neighborhoods the first path did, so it loses none.');
  $('more').textContent = S.skip.n + ' of ' + M.N.toLocaleString('en-US') + ' artists taken out. across 20 other starts: a median of ' + (Math.round(S.med * 2) / 2) + ' neighborhoods lost, at most ' + S.max + '. one path is luck; read the median.';
  [].forEach.call($('years').children, function (b) { b.setAttribute('aria-checked', +b.getAttribute('data-c') === S.cut ? 'true' : 'false'); });
  $('hear').disabled = S.diff < 0; stopHear(); draw();
}

function draw() {
  if (!MAP) return;
  MAP.begin(); var g = MAP.g, i, P = WK.P.PAL;
  g.save(); g.strokeStyle = P.rose; g.lineWidth = 1.2; g.globalAlpha = 0.75;
  for (i = 0; i < M.N; i++) if (S.skip[i]) { g.beginPath(); g.arc(MAP.X(i), MAP.Y(i), 4, 0, 6.2832); g.stroke(); }
  g.restore();
  MAP.ribbon(S.A, S.A.length, P.violet, P.ink); MAP.ribbon(S.B, S.B.length, P.rose, P.ink, null, [7, 5]);
  MAP.stops(S.A, S.A.length, P.violet, P.ink, 0, 'ring'); MAP.stops(S.B, S.B.length, P.rose, P.ink, 0, 'dot');
  WK.P.glyph(g, 'star', MAP.X(S.A[0]), MAP.Y(S.A[0]), 8, C.ink);
  if (S.diff > 0) { MAP.stop(S.A[S.diff], P.violet, 14); MAP.stop(S.B[S.diff], P.rose, 14); MAP.tag(S.B[S.diff], 'step ' + S.diff, C.ink); }
}

function stopHear() { WK.stop(); hearLabel(); }
function hearLabel() { var p = WK.playing(); $('hear').textContent = p ? 'stop' : 'hear the first difference'; $('hear').setAttribute('aria-pressed', p ? 'true' : 'false'); }
$('hear').addEventListener('click', function () {
  if (WK.playing()) { stopHear(); return; }
  if (S.diff < 0) return;
  $('now').textContent = 'loading previews';
  WK.play([{ i: S.A[S.diff], tag: 'as it grew' }, { i: S.B[S.diff], tag: 'year removed' }], function (k, info) {
    $('now').textContent = info ? 'playing ' + info.tag + ', step ' + S.diff + ': ' + info.title + ', by ' + D.n[info.i] + '.' : '';
    hearLabel();
  }).then(function () { if (!WK.playing()) $('now').textContent = 'no preview for these two stops.'; });
});
$('again').addEventListener('click', function () {
  var g = LOOP.rng((Math.random() * 1e9) | 0); S.start = weighted(g()); S.seed = (Math.random() * 1e9) | 0; compute(); render();
});
$('years').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  S.cut = +b.getAttribute('data-c'); compute(); render();
});
$('back').addEventListener('click', function (e) { if (history.length > 1 && document.referrer && !/kiosk=1/.test(location.search)) { e.preventDefault(); history.back(); } });

WK.boot([WK.j('../../front/data/field.json'), WK.j('../../front/data/maps.json')]).then(function (b) {
  D = b.D; M = b.M; FIT = b.FIT; LOOP = b.LOOP; F = b.extra[0]; MP = b.extra[1]; K = FIT.queue.K;
  YEARS.forEach(function (y, c) {
    var el = document.createElement('button'); el.type = 'button'; el.setAttribute('role', 'radio'); el.setAttribute('data-c', c); el.textContent = y; $('years').appendChild(el);
  });
  $('how').textContent = 'method: the loop wall’s fitted auto-play rule, rerun from the same start and seed with every artist first heard in that slice taken out of its choices. the log is cut into eight slices, labeled 2019 to 2026; a slice is near a calendar year, not exact. the shipped data has no per-year presses, so this drops artists by when i first heard them, not presses one by one. a toy about the rule, never a finding about me. rooms: the eleven neighborhoods of the transition graph.';
  MAP = new WK.Map($('map'), $('cv'), D, M); MAP.resize();
  window.addEventListener('resize', function () { MAP.resize(); draw(); });
  S.start = weighted(LOOP.rng(1)()); S.seed = 1; compute(); render();
});
})();
