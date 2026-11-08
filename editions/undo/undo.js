(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, FIT, LOOP, F, MP, MAP, K, ROOMS = 11;
var S = { cut: 4, start: 0, seed: 1, A: null, B: null, diff: -1, pk: -1 };
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

var AUX = null, lastI = -1, rep = 0, L = [], MAXPL = 1;
(function () { var p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { AUX = this; return p.apply(this, arguments); }; })();
function seek(t) { if (!AUX) return; var go = function () { try { AUX.currentTime = Math.min(t, Math.max(0, (AUX.duration || 30) - 8)); } catch (e) {} }; if (AUX.readyState > 0) go(); else AUX.addEventListener('loadedmetadata', go, { once: true }); }
function fam(i) { return D.fam[D.f[i]] || 'untagged'; }
function famLine(p, k) { return fam(p[k]) + (k > 0 && D.f[p[k]] !== D.f[p[k - 1]] ? ' (a new family, after ' + fam(p[k - 1]) + ')' : ''); }

function render() {
  var yr = YEARS[S.cut], l = S.l;
  S.k = S.diff > 0 ? S.diff : 0;
  $('big').textContent = l.n + ' of ' + ROOMS;
  $('say').textContent = S.diff < 0
    ? 'with ' + yr + ' removed this start and seed grow the same path. the rule never reached for those artists here. try another start or year.'
    : 'with ' + yr + ' removed the path first goes elsewhere at step ' + S.diff + '. ' + (l.n ? 'it enters ' + l.rb + ' neighborhoods, not ' + l.ra + ', so it loses ' + l.n + '.' : 'it still enters every one of the ' + l.ra + ' neighborhoods the first path did, so it loses none.');
  $('more').textContent = S.skip.n + ' of ' + M.N.toLocaleString('en-US') + ' artists taken out. across 20 other starts: a median of ' + (Math.round(S.med * 2) / 2) + ' neighborhoods lost, at most ' + S.max + '. one path is luck; read the median.';
  [].forEach.call($('years').children, function (b) { b.setAttribute('aria-checked', +b.getAttribute('data-c') === S.cut ? 'true' : 'false'); });
  stopHear(); where();
  draw();
}

function where() {
  if (WK.playing()) return;
  var k = S.k, yr = YEARS[S.cut], n = S.A.length - 1;
  $('step').disabled = k >= n; $('prev').disabled = k <= 0;
  $('now').textContent = 'step ' + k + ' of ' + n + (k < S.diff || S.diff < 0 ? ': both walks are at ' + D.n[S.A[k]] + ' (' + fam(S.A[k]) + ').' : ': as it grew, ' + D.n[S.A[k]] + ' (' + famLine(S.A, k) + '); with ' + yr + ' removed, ' + D.n[S.B[k]] + ' (' + famLine(S.B, k) + ').') + (S.diff > 0 && k < S.diff ? ' the walks part at step ' + S.diff + '.' : '');
}

function wt(i) { return Math.log(1 + (D.pl ? D.pl[i] : 1)) / MAXPL; }
function walkDraw(g, p, a, b, kind, dash, k, cur) {
  var P = WK.P, n = p.length;
  P.ribbon(g, MAP.pts(p), a, b, 1.2, 0.22, dash);
  MAP.ribbon(p, k + 1, a, b, null, dash);
  for (var j = 0; j <= k; j++) {
    var x = MAP.X(p[j]), y = MAP.Y(p[j]), c = P.mix(a, b, j / (n - 1));
    if (j > 0 && D.f[p[j]] !== D.f[p[j - 1]]) { g.save(); g.strokeStyle = WK.FAMC[fam(p[j])] || C.mute; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.stroke(); g.restore(); }
    P.glyph(g, kind, x, y, 3 + 3.5 * wt(p[j]), c);
  }
}
function draw() {
  if (!MAP || !S.A) return;
  MAP.begin(); var g = MAP.g, i, P = WK.P.PAL, k = S.k;
  g.save(); g.strokeStyle = P.rose; g.lineWidth = 1.2; g.globalAlpha = 0.75;
  for (i = 0; i < M.N; i++) if (S.skip[i]) { g.beginPath(); g.arc(MAP.X(i), MAP.Y(i), 4, 0, 6.2832); g.stroke(); }
  g.restore();
  walkDraw(g, S.A, P.violet, P.ink, 'ring', null, k);
  walkDraw(g, S.B, P.rose, P.ink, 'dot', [7, 5], k);
  WK.P.glyph(g, 'star', MAP.X(S.A[0]), MAP.Y(S.A[0]), 8, C.ink);
  var pa = S.pk === 0, pb = S.pk === 1;
  if (S.A[k] === S.B[k]) { MAP.stop(S.A[k], P.ink, 14); MAP.tag(S.A[k], 'step ' + k + ', both', P.ink); }
  else {
    MAP.stop(S.A[k], P.violet, 14); MAP.stop(S.B[k], P.rose, 14);
    MAP.tag(S.A[k], (pa ? 'playing: ' : '') + 'as it grew, step ' + k, P.violet); MAP.tag(S.B[k], (pb ? 'playing: ' : '') + 'year removed, step ' + k, P.rose);
  }
  if (S.pk >= 0) { var q = S.pk ? S.B[k] : S.A[k]; WK.pulse(g, MAP.X(q), MAP.Y(q), S.pk ? P.rose : P.violet, 16); }
}

function stopHear() { WK.stop(); S.pk = -1; WK.still(); hearLabel(); }
function hearLabel() { var p = WK.playing(); $('hear').textContent = p ? 'stop the sound' : 'play from step ' + S.k + ', both ways'; $('hear').setAttribute('aria-pressed', p ? 'true' : 'false'); }
function playFrom(k) {
  var n = S.A.length, list = [], j;
  L = [];
  for (j = k; j < n; j++) {
    list.push({ i: S.A[j], tag: 'as it grew' }); L.push({ step: j, w: 0 });
    if (S.B[j] !== S.A[j]) { list.push({ i: S.B[j], tag: 'year removed' }); L.push({ step: j, w: 1 }); }
  }
  lastI = -1; rep = 0;
  $('now').textContent = 'loading previews. sound comes first: nothing is picked for you.';
  WK.play(list, function (q, info) {
    if (info) {
      var m = L[q], rp = false;
      if (info.i === lastI) { rep++; seek(6 * rep); rp = true; } else rep = 0;
      lastI = info.i; S.k = m.step; S.pk = m.w;
      var pth = m.w ? S.B : S.A, nx = L[q + 1];
      $('now').textContent = 'step ' + m.step + ' of ' + (n - 1) + ', playing ' + info.tag + ': ' + info.title + ', by ' + D.n[info.i] + ' (' + famLine(pth, m.step) + ').' + (rp ? ' same artist as the clip before, so it starts ' + 6 * rep + ' seconds in.' : '') + (nx ? ' next: ' + (nx.step !== m.step ? 'step ' + nx.step + ', ' : '') + (nx.w ? 'year removed' : 'as it grew') + '.' : ' last stop.');
      WK.live(draw);
    } else { S.pk = -1; WK.still(); where(); }
    hearLabel(); draw();
  }).then(function () { if (!WK.playing()) { $('now').textContent = 'no preview for these stops.'; hearLabel(); } });
}
$('hear').addEventListener('click', function () { if (WK.playing()) { stopHear(); where(); draw(); return; } playFrom(S.k); });
function go(d) {
  var was = WK.playing(), k = Math.max(0, Math.min(S.A.length - 1, S.k + d));
  if (was) stopHear(); S.k = k; where(); hearLabel(); draw(); if (was) playFrom(k);
}
$('step').addEventListener('click', function () { go(1); });
$('prev').addEventListener('click', function () { go(-1); });
document.addEventListener('keydown', function (e) {
  if (/INPUT|TEXTAREA/.test((e.target.tagName || ''))) return;
  if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
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
  $('how').textContent = 'method: the auto-play rule matched to my log on the first wall, rerun from the same start and seed with every artist first heard in that slice taken out of its choices. the log is cut into eight slices, labeled 2019 to 2026; a slice is near a calendar year, not exact. the shipped data has no per-year presses, so this drops artists by when i first heard them, not presses one by one. a toy about the rule, never a finding about me. rooms: the eleven neighborhoods of who follows whom.';
  MAXPL = Math.log(1 + Math.max.apply(null, D.pl));
  MAP = new WK.Map($('map'), $('cv'), D, M, { tap: function (i) {
    var k = S.A.indexOf(i), k2 = S.B.indexOf(i), t = k >= 0 && k2 >= 0 ? Math.min(k, k2) : k >= 0 ? k : k2;
    if (t < 0) return;
    var was = WK.playing(); if (was) stopHear(); S.k = t; where(); hearLabel(); draw(); if (was) playFrom(t);
  } }); MAP.resize();
  window.addEventListener('resize', function () { MAP.resize(); draw(); });
  S.start = weighted(LOOP.rng(1)()); S.seed = 1; compute(); render();
});
})();
