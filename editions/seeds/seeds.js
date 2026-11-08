(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, FIT, LOOP, MAP, K, R;
var S = { a: -1, b: -1, seed: 1, pa: null, pb: null, hit: null, ran: '', cur: null };

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
  if (ra.none || rb.none) { $('say').textContent = 'one of the seeds is not in my field, so there is nothing to walk yet.'; return; }
  var key = ra.i + '|' + rb.i;
  if (again) S.seed = (Math.random() * 1e9) | 0;
  S.ran = key; S.a = ra.i; S.b = rb.i;
  S.pa = LOOP.walk(M, S.a, K, S.seed).path; S.pb = LOOP.walk(M, S.b, K, S.seed + 7).path;
  S.hit = touchOf(S.pa, S.pb);
  var h = S.hit, big = $('big');
  if (h.never) { big.textContent = 'never'; big.className = 'big ink'; $('say').textContent = 'in 40 steps the two paths never share a neighborhood. the closest they get is ' + h.gap.toFixed(2) + ' of one random hop in sound, seed one step ' + h.a + ' to seed two step ' + h.b + '.'; $('sn').value = Math.max(h.a, h.b); }
  else {
    big.textContent = h.step === 0 && h.a === 0 && h.b === 0 ? 'step 0' : 'step ' + h.step; big.className = 'big mint';
    $('say').textContent = h.step === 0 ? 'the two seeds already sit in one neighborhood.' : 'the paths first share a neighborhood at step ' + h.step + ': seed one step ' + h.a + ' and seed two step ' + h.b + ' are close in sound.';
    $('sn').value = h.step;
  }
  $('run').textContent = 'walk again, new seed'; WK.stop(); $('step').disabled = false; hearLabel(); where(); draw();
}

var AUX = null, lastI = -1, rep = 0, L = [], MAXPL = 1;
(function () { var p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { AUX = this; return p.apply(this, arguments); }; })();
function seek(t) { if (!AUX) return; var go = function () { try { AUX.currentTime = Math.min(t, Math.max(0, (AUX.duration || 30) - 8)); } catch (e) {} }; if (AUX.readyState > 0) go(); else AUX.addEventListener('loadedmetadata', go, { once: true }); }
function fam(i) { return D.fam[D.f[i]] || 'untagged'; }
function famLine(p, k) { return fam(p[k]) + (k > 0 && D.f[p[k]] !== D.f[p[k - 1]] ? ', a new family after ' + fam(p[k - 1]) : ''); }
function wt(i) { return Math.log(1 + (D.pl ? D.pl[i] : 1)) / MAXPL; }

function where() {
  if (S.a < 0 || WK.playing()) return;
  var s = +$('sn').value, last = S.pa.length - 1;
  $('step').disabled = s >= last;
  $('now').textContent = 'step ' + s + ' of ' + last + ': seed one is at ' + D.n[S.pa[s]] + ' (' + famLine(S.pa, s) + ')' + (s < last ? ', then ' + D.n[S.pa[s + 1]] : '') + '. seed two is at ' + D.n[S.pb[s]] + ' (' + famLine(S.pb, s) + ')' + (s < last ? ', then ' + D.n[S.pb[s + 1]] : '') + '.';
}
function onst(k, info) {
  var s = +$('sn').value, last = S.pa ? S.pa.length - 1 : 40;
  if (info) {
    var tap = info.tag === 'tap';
    S.cur = { i: info.i, col: tap ? WK.C.mint : info.tag === 'seed one' ? WK.C.violet : WK.C.rose };
    if (tap) $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[info.i] + ' (' + fam(info.i) + ').';
    else {
      var m = L[k], rp = false, p = m.w ? S.pb : S.pa, nx = L[k + 1];
      if (info.i === lastI) { rep++; seek(6 * rep); rp = true; } else rep = 0;
      lastI = info.i; $('sn').value = m.step; s = m.step;
      $('now').textContent = 'step ' + s + ' of ' + last + ', playing ' + info.tag + ': ' + info.title + ', by ' + D.n[info.i] + ' (' + famLine(p, s) + ').' + (rp ? ' same artist as the clip before, so it starts ' + 6 * rep + ' seconds in.' : '') + (nx ? ' next: ' + (nx.step !== s ? 'step ' + nx.step + ', ' : '') + (nx.w ? 'seed two' : 'seed one') + '.' : ' last stop.');
    }
    WK.live(draw);
  } else { S.cur = null; WK.still(); where(); draw(); }
  hearLabel();
}

function draw() {
  if (!MAP) return;
  MAP.begin(); var g = MAP.g;
  if (S.a >= 0) drawWalks();
  if (S.cur) { WK.pulse(g, MAP.X(S.cur.i), MAP.Y(S.cur.i), S.cur.col, 14); MAP.tag(S.cur.i, D.n[S.cur.i], S.cur.col); }
}
function walkDraw(g, p, a, b, kind, k) {
  var P = WK.P, n = p.length;
  P.ribbon(g, MAP.pts(p), a, b, 1.2, 0.22);
  MAP.ribbon(p, k + 1, a, b);
  for (var j = 0; j <= k; j++) {
    var x = MAP.X(p[j]), y = MAP.Y(p[j]);
    if (j > 0 && D.f[p[j]] !== D.f[p[j - 1]]) { g.save(); g.strokeStyle = WK.FAMC[fam(p[j])] || C.mute; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, 6.2832); g.stroke(); g.restore(); }
    P.glyph(g, kind, x, y, 3 + 3.5 * wt(p[j]), P.mix(a, b, j / (n - 1)));
  }
}
function drawWalks() {
  var g = MAP.g, h = S.hit, P = WK.P.PAL, s = +$('sn').value;
  walkDraw(g, S.pa, P.violet, P.ink, 'ring', s); walkDraw(g, S.pb, P.rose, P.ink, 'dot', s);
  if (h) {
    var xa = MAP.X(S.pa[h.a]), ya = MAP.Y(S.pa[h.a]), xb = MAP.X(S.pb[h.b]), yb = MAP.Y(S.pb[h.b]);
    g.save(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.setLineDash(h.never ? [4, 4] : []); g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke(); g.restore();
    var gr = h.never ? 6 : 9; WK.P.glyph(g, 'star', xa, ya, gr, '#fff'); WK.P.glyph(g, 'star', xb, yb, gr, '#fff');
  }
  MAP.stop(S.pa[s], P.violet, 14); MAP.stop(S.pb[s], P.rose, 14);
  if (h) { if (h.never) MAP.tag(S.pa[h.a], 'closest', '#fff'); else MAP.tag(h.step === h.a ? S.pa[h.a] : S.pb[h.b], 'step ' + h.step, '#fff'); }
  MAP.tag(S.pa[0], 'one', P.violet); MAP.tag(S.pb[0], 'two', P.rose);
}

function hearLabel() { var p = WK.playing(); $('hear').textContent = p ? 'stop the sound' : S.a < 0 ? 'play the walks' : 'play from step ' + $('sn').value + ', both walks'; $('hear').setAttribute('aria-pressed', p ? 'true' : 'false'); }
function playFrom(s) {
  if (S.a < 0) return;
  var list = [], j, n = S.pa.length; L = []; lastI = -1; rep = 0;
  for (j = s; j < n; j++) {
    list.push({ i: S.pa[j], tag: 'seed one' }); L.push({ step: j, w: 0 });
    if (S.pb[j] !== S.pa[j]) { list.push({ i: S.pb[j], tag: 'seed two' }); L.push({ step: j, w: 1 }); }
  }
  $('now').textContent = 'loading previews';
  WK.play(list, onst).then(function () { if (!WK.playing()) { $('now').textContent = 'no preview for these stops.'; hearLabel(); } });
}
function jump(s) {
  var was = WK.playing(); if (was) WK.stop();
  $('sn').value = Math.max(0, Math.min(S.pa.length - 1, s)); where(); hearLabel(); draw(); if (was) playFrom(+$('sn').value);
}
$('sn').addEventListener('input', function () { jump(+$('sn').value); });
$('hear').addEventListener('click', function () { if (WK.playing()) { WK.stop(); return; } playFrom(+$('sn').value); });
$('step').addEventListener('click', function () { jump(+$('sn').value + 1); });
document.addEventListener('keydown', function (e) {
  if (/INPUT|TEXTAREA/.test((e.target.tagName || '')) && e.target.type !== 'range') return;
  if (e.key === 'ArrowRight') { jump(+$('sn').value + 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { jump(+$('sn').value - 1); e.preventDefault(); }
});
$('run').addEventListener('click', function () { run(true); });
['sa', 'sb'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(true); }); $(id).addEventListener('input', function () { $('run').textContent = 'walk both seeds'; }); });
$('back').addEventListener('click', function (e) { if (history.length > 1 && document.referrer && !/kiosk=1/.test(location.search)) { e.preventDefault(); history.back(); } });

function sizeUp() { MAP.resize(); draw(); }
WK.boot([]).then(function (b) {
  D = b.D; M = b.M; FIT = b.FIT; LOOP = b.LOOP; K = FIT.queue.K;
  // same neighborhood = within the median distance from an artist to its own sixth-nearest neighbor
  var ds = [], i; for (i = 0; i < M.N; i++) { var j = D.nn[i][5]; if (j >= 0) ds.push(LOOP.dist(M, i, j)); }
  ds.sort(function (x, y) { return x - y; }); R = ds[ds.length >> 1];
  $('def').textContent = 'same neighborhood: two stops within ' + (R / M.RH).toFixed(2) + ' of one random hop in sound, the median distance from an artist to its sixth-nearest. rule: the auto-play rule matched to my log, ' + M.N.toLocaleString('en-US') + ' artists, 40 steps. a toy, not a prediction.';
  MAXPL = Math.log(1 + Math.max.apply(null, D.pl));
  MAP = new WK.Map($('map'), $('cv'), D, M, { tap: function (i) {
    if (S.a >= 0) { var ka = S.pa.indexOf(i), kb = S.pb.indexOf(i), t = ka >= 0 && kb >= 0 ? Math.min(ka, kb) : ka >= 0 ? ka : kb; if (t >= 0) { jump(t); playFrom(t); return; } }
    WK.play([{ i: i, tag: 'tap' }], onst);
  } }); MAP.resize();
  window.addEventListener('resize', sizeUp);
  WK.pv().catch(function () {});
  var top = []; for (i = 0; i < 150; i++) if (D.n[M.order ? M.order[i] : i]) top.push(M.order[i]);
  var g = LOOP.rng((Math.random() * 1e9) | 0), x = top[(g() * top.length) | 0], y = top[(g() * top.length) | 0];
  if (y === x) y = top[(top.indexOf(x) + 37) % top.length];
  $('sa').value = D.n[x]; $('sb').value = D.n[y]; run(false);
});
})();
