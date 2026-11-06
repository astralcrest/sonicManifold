(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, FIT, LOOP, MAP, K, R;
var S = { a: -1, b: -1, seed: 1, pa: null, pb: null, hit: null, ran: '' };

function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function bigrams(s) { var o = {}, n = 0; s = ' ' + s + ' '; for (var i = 0; i < s.length - 1; i++) { o[s.substr(i, 2)] = (o[s.substr(i, 2)] || 0) + 1; n++; } return { o: o, n: n }; }
function dice(a, b) { var x = 0; for (var k in a.o) if (b.o[k]) x += Math.min(a.o[k], b.o[k]); return a.n + b.n ? 2 * x / (a.n + b.n) : 0; }

var NN, NT = null;
function names() { if (!NN) NN = D.n.map(function (n) { return norm(n || ''); }); return NN; }
function titles() {
  if (NT || !WK.title) return NT;
  var any = false, t = [];
  for (var i = 0; i < M.N; i++) { var s = WK.title(i); t.push(s ? norm(s) : ''); if (s) any = true; }
  if (any) NT = t; return NT;
}

// artist name first, then a song title (once the previews' titles have loaded), then a prefix, then a part of a name; the most played wins a tie
function resolve(q) {
  var n = norm(q), N = names(), i, best = -1, via = null;
  if (!n) return { none: true, empty: true };
  var T = titles();
  function pick(test, label) { var b = -1; for (i = 0; i < M.N; i++) if (N[i] && test(i) && (b < 0 || D.pl[i] > D.pl[b])) b = i; return b >= 0 ? b : -1; }
  best = pick(function (i) { return N[i] === n; });
  if (best >= 0) return { i: best };
  if (T) { for (i = 0; i < M.N; i++) if (T[i] && T[i] === n && (best < 0 || D.pl[i] > D.pl[best])) best = i; if (best >= 0) return { i: best, song: WK.title(best) }; }
  best = pick(function (i) { return N[i].indexOf(n) === 0; });
  if (best >= 0) return { i: best };
  if (n.length >= 3) {
    best = pick(function (i) { return N[i].indexOf(n) >= 0; });
    if (best >= 0) return { i: best };
    if (T) { for (i = 0; i < M.N; i++) if (T[i] && T[i].indexOf(n) >= 0 && (best < 0 || D.pl[i] > D.pl[best])) best = i; if (best >= 0) return { i: best, song: WK.title(best) }; }
  }
  var bq = bigrams(n), sc = [];
  for (i = 0; i < M.N; i++) if (N[i]) sc.push([dice(bq, bigrams(N[i])), i]);
  sc.sort(function (x, y) { return y[0] - x[0] || D.pl[y[1]] - D.pl[x[1]]; });
  return { none: true, near: sc.slice(0, 3).map(function (x) { return x[1]; }) };
}

function setMsg(id, r, input) {
  var el = $(id), esc = WK.esc;
  if (r.empty) { el.textContent = 'type an artist or a song.'; return; }
  if (!r.none) { el.innerHTML = r.song ? 'song "' + esc(r.song) + '", by ' + esc(D.n[r.i]) : esc(D.n[r.i]); return; }
  el.innerHTML = 'not in my field. nearest names: ' + r.near.map(function (i) { return '<button type="button" data-i="' + i + '" data-t="' + input + '">' + esc(D.n[i]) + '</button>'; }).join('');
}
['ma', 'mb'].forEach(function (id) {
  $(id).addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $(b.getAttribute('data-t')).value = D.n[+b.getAttribute('data-i')]; run(false);
  });
});

function touchOf(a, b) {
  var n = a.length, i, k;
  for (k = 0; k < n; k++) {
    for (i = 0; i <= k; i++) if (LOOP.dist(M, a[k], b[i]) <= R) return { step: k, a: k, b: i };
    for (i = 0; i < k; i++) if (LOOP.dist(M, b[k], a[i]) <= R) return { step: k, a: i, b: k };
  }
  var best = 1e9, bp = null;
  for (k = 0; k < n; k++) for (i = 0; i < n; i++) { var d = LOOP.dist(M, a[k], b[i]); if (d < best) { best = d; bp = { a: k, b: i }; } }
  return { never: true, gap: best / M.RH, a: bp.a, b: bp.b };
}

function run(again) {
  var ra = resolve($('sa').value), rb = resolve($('sb').value);
  setMsg('ma', ra, 'sa'); setMsg('mb', rb, 'sb');
  if (ra.none || rb.none) { $('say').textContent = 'one of the seeds is not in my field, so there is nothing to run yet.'; return; }
  var key = ra.i + '|' + rb.i;
  if (again) S.seed = (Math.random() * 1e9) | 0;
  S.ran = key; S.a = ra.i; S.b = rb.i;
  S.pa = LOOP.walk(M, S.a, K, S.seed).path; S.pb = LOOP.walk(M, S.b, K, S.seed + 7).path;
  S.hit = touchOf(S.pa, S.pb);
  var h = S.hit, big = $('big');
  if (h.never) { big.textContent = 'never'; big.className = 'big ink'; $('say').textContent = 'in 40 steps the two paths never share a neighborhood. the closest they get is ' + h.gap.toFixed(2) + ' of one random hop in sound, mint step ' + h.a + ' to amber step ' + h.b + '.'; $('sn').value = Math.max(h.a, h.b); }
  else {
    big.textContent = h.step === 0 && h.a === 0 && h.b === 0 ? 'step 0' : 'step ' + h.step; big.className = 'big mint';
    $('say').textContent = h.step === 0 ? 'the two seeds already sit in one neighborhood.' : 'the paths first share a neighborhood at step ' + h.step + ': mint step ' + h.a + ' and amber step ' + h.b + ' are close in sound.';
    $('sn').value = h.step;
  }
  $('run').textContent = 'run again'; WK.stop(); hearLabel(); draw();
}

function draw() {
  if (!MAP || S.a < 0) return;
  MAP.begin(); var g = MAP.g, h = S.hit, n = S.pa.length;
  MAP.line(S.pa, n, C.mint); MAP.line(S.pb, n, C.amber);
  MAP.squares(S.pa, n, C.mint, 4); MAP.squares(S.pb, n, C.amber, 4);
  MAP.ring(S.pa[0], C.ink, 10); MAP.ring(S.pb[0], C.ink, 10);
  var s = +$('sn').value;
  g.strokeStyle = C.ink; g.lineWidth = 1; g.strokeRect(MAP.X(S.pa[s]) - 6, MAP.Y(S.pa[s]) - 6, 12, 12); g.strokeRect(MAP.X(S.pb[s]) - 6, MAP.Y(S.pb[s]) - 6, 12, 12);
  if (h) {
    var xa = MAP.X(S.pa[h.a]), ya = MAP.Y(S.pa[h.a]), xb = MAP.X(S.pb[h.b]), yb = MAP.Y(S.pb[h.b]);
    g.strokeStyle = '#fff'; g.lineWidth = 1; g.setLineDash(h.never ? [3, 3] : []); g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#fff';
    if (h.never) { g.fillRect(xa - 4, ya - 4, 8, 8); g.fillRect(xb - 4, yb - 4, 8, 8); MAP.tag(S.pa[h.a], 'closest', '#fff'); }
    else { var q = h.step === h.a ? S.pa[h.a] : S.pb[h.b]; g.fillRect(xa - 7, ya - 7, 14, 14); g.fillRect(xb - 7, yb - 7, 14, 14); MAP.tag(q, 'step ' + h.step, '#fff'); }
  }
  MAP.tag(S.pa[0], 'one', C.mint); MAP.tag(S.pb[0], 'two', C.amber);
}

function hearLabel() { var p = WK.playing(); $('hear').textContent = p ? 'stop' : 'hear step ' + $('sn').value; $('hear').setAttribute('aria-pressed', p ? 'true' : 'false'); }
$('sn').addEventListener('input', function () { if (WK.playing()) WK.stop(); hearLabel(); draw(); });
$('hear').addEventListener('click', function () {
  if (WK.playing()) { WK.stop(); return; }
  if (S.a < 0) return;
  var s = +$('sn').value, now = $('now'); now.textContent = 'loading previews';
  WK.play([{ i: S.pa[s], tag: 'mint' }, { i: S.pb[s], tag: 'amber' }], function (k, info) {
    $('now').textContent = info ? 'playing ' + info.tag + ' step ' + s + ': ' + info.title + ', by ' + D.n[info.i] + '. the other plays next.' : '';
    hearLabel();
  }).then(function () { if (!WK.playing()) $('now').textContent = 'no preview for these two stops.'; });
});
$('run').addEventListener('click', function () { run(true); });
$('swap').addEventListener('click', function () { var t = $('sa').value; $('sa').value = $('sb').value; $('sb').value = t; run(false); });
['sa', 'sb'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(true); }); $(id).addEventListener('input', function () { $('run').textContent = 'run'; }); });
$('back').addEventListener('click', function (e) { if (history.length > 1 && document.referrer && !/kiosk=1/.test(location.search)) { e.preventDefault(); history.back(); } });

function sizeUp() { MAP.resize(); draw(); }
WK.boot([]).then(function (b) {
  D = b.D; M = b.M; FIT = b.FIT; LOOP = b.LOOP; K = FIT.queue.K;
  // same neighborhood = within the median distance from an artist to its own sixth-nearest neighbor
  var ds = [], i; for (i = 0; i < M.N; i++) { var j = D.nn[i][5]; if (j >= 0) ds.push(LOOP.dist(M, i, j)); }
  ds.sort(function (x, y) { return x - y; }); R = ds[ds.length >> 1];
  $('def').textContent = 'same neighborhood: two stops within ' + (R / M.RH).toFixed(2) + ' of one random hop in sound, the median distance from an artist to its sixth-nearest. rule: the loop wall’s fitted queue rule, ' + M.N.toLocaleString('en-US') + ' artists, 40 steps. a toy, not a prediction.';
  MAP = new WK.Map($('map'), $('cv'), D, M); MAP.resize();
  window.addEventListener('resize', sizeUp);
  WK.pv().catch(function () {});
  var top = []; for (i = 0; i < 150; i++) if (D.n[M.order ? M.order[i] : i]) top.push(M.order[i]);
  var g = LOOP.rng((Math.random() * 1e9) | 0), x = top[(g() * top.length) | 0], y = top[(g() * top.length) | 0];
  if (y === x) y = top[(top.indexOf(x) + 37) % top.length];
  $('sa').value = D.n[x]; $('sb').value = D.n[y]; run(false);
});
})();
