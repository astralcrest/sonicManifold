(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv'), N, X0, Y0, X, Y;
var SECS = 60, SPRING = 2000, TW = null, REACH = 90, PULL = 0.7;
var S = { held: false, t: 0, fx: 0, fy: 0, fam: -1, spring: -1, springFrom: null, done: false, tick: 0, list: [], k: -1, k0: 0, px: 0, py: 0, kb: false, from: null, reach: REACH };
var NK = 6;

function prep() {
  N = D.xy.length; X0 = new Float32Array(N); Y0 = new Float32Array(N); X = new Float32Array(N); Y = new Float32Array(N);
  for (var i = 0; i < N; i++) { X0[i] = D.xy[i][0]; Y0[i] = D.xy[i][1]; X[i] = X0[i]; Y[i] = Y0[i]; }
}
// a local lens at the finger, eased over the minute: PULL < 1 keeps every dot's order by distance, so nothing folds or collapses
function settle() {
  var fx = (S.fx - MAP.ox) / MAP.scl, fy = (S.fy - MAP.oy) / MAP.scl, p = Math.min(1, S.t / SECS), k = PULL * (1 - (1 - p) * (1 - p)), s2 = 2 * S.reach * S.reach, i, dx, dy, q;
  for (i = 0; i < N; i++) { dx = S.from[0][i] - fx; dy = S.from[1][i] - fy; q = 1 - k * Math.exp(-(dx * dx + dy * dy) / s2); X[i] = fx + dx * q; Y[i] = fy + dy * q; }
}
function nearestTo(px, py) {
  var best = 0, bd = 1e18, i, dx, dy, d;
  for (i = 0; i < N; i++) { dx = MAP.ox + X[i] * MAP.scl - px; dy = MAP.oy + Y[i] * MAP.scl - py; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best;
}
function nearestK(px, py, K) {
  var d = [], i, dx, dy;
  for (i = 0; i < N; i++) { dx = MAP.ox + X[i] * MAP.scl - px; dy = MAP.oy + Y[i] * MAP.scl - py; d.push([dx * dx + dy * dy, i]); }
  d.sort(function (a, b) { return a[0] - b[0]; });
  return d.slice(0, K).map(function (x) { return x[1]; });
}
function fam(i) { return D.fam[D.f[i]]; }
function draw() {
  var g = MAP.g, small = MAP.W < 500, i, r, lo = small ? 1.6 : 2.4, hi = small ? 5 : 8, k;
  if (!TW) { TW = new Float32Array(N); var mx = D.pl ? Math.log(1 + Math.max.apply(null, D.pl)) : 1; for (i = 0; i < N; i++) TW[i] = D.pl ? Math.log(1 + D.pl[i]) / mx : 1 - Math.sqrt(i / N); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = PAL.night; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(MAP.dpr, 0, 0, MAP.dpr, 0, 0);
  var p = Math.min(1, S.t / SECS), R = (small ? 10 : 12) + p * (small ? 38 : 56);
  for (i = N - 1; i >= 0; i--) {
    var col = WK.FAMC[D.fam[D.f[i]]] || '#9a90b8';
    g.globalAlpha = S.fam >= 0 && D.f[i] !== S.fam ? 0.55 : 0.95;
    r = lo + (hi - lo) * TW[i] * TW[i];
    P.peb(g, i, MAP.ox + X[i] * MAP.scl, MAP.oy + Y[i] * MAP.scl, r, col);
  }
  g.globalAlpha = 1;
  if (S.list.length && (S.held || S.done)) {
    var ax = function (q) { return MAP.ox + X[q] * MAP.scl; }, ay = function (q) { return MAP.oy + Y[q] * MAP.scl; };
    var pts = [[S.fx, S.fy]].concat(S.list.map(function (q) { return [ax(q), ay(q)]; }));
    if (S.k >= 0) {
      P.ribbon(g, pts.slice(S.k + 1), PAL.ice, PAL.ice, 1.2, 0.4, [4, 5]);
      P.ribbon(g, pts.slice(0, S.k + 2), PAL.ink, PAL.ink, small ? 2 : 2.6, 0.9);
    }
    S.list.forEach(function (q, n) { P.peb(g, q, ax(q), ay(q), (small ? 4 : 6) + (small ? 3 : 5) * TW[q], WK.FAMC[fam(q)] || '#9a90b8'); P.glyph(g, 'dot', ax(q), ay(q), 3, n <= S.k ? PAL.night : PAL.ink); });
    if (S.k >= 0 && WK.playing()) { WK.pulse(g, ax(S.list[S.k]), ay(S.list[S.k]), PAL.ink, 14); }
  }
  // the crosshair is the marked spot the hold button holds at: the map center, the last press, or where the arrow keys put it
  if (!S.held) { g.save(); g.strokeStyle = PAL.ink; g.lineWidth = S.kb ? 2 : 1.5; g.globalAlpha = 0.95; g.beginPath(); g.arc(S.px, S.py, 9, 0, 6.2832); g.moveTo(S.px - 21, S.py); g.lineTo(S.px - 13, S.py); g.moveTo(S.px + 13, S.py); g.lineTo(S.px + 21, S.py); g.moveTo(S.px, S.py - 21); g.lineTo(S.px, S.py - 13); g.moveTo(S.px, S.py + 13); g.lineTo(S.px, S.py + 21); g.stroke(); g.restore(); }
  if (S.held) {
    g.save(); g.lineWidth = 3; g.strokeStyle = PAL.ink; g.globalAlpha = 0.25; g.beginPath(); g.arc(S.fx, S.fy, R + 14, 0, 6.2832); g.stroke();
    g.globalAlpha = 1; g.beginPath(); g.arc(S.fx, S.fy, R + 14, -1.5708, -1.5708 + p * 6.2832); g.stroke(); g.restore();
    if (!S.done) WK.pulse(g, S.fx, S.fy, PAL.ink, R + 24);
    g.save(); g.font = '600 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center';
    g.fillText(Math.floor(S.t) + ' s', S.fx, S.fy + R + 40); g.restore();
  }
}
var lastNum = '';
function out() {
  var s = Math.floor(S.t);
  var h = S.t > 0 || S.held ? '<span class="m">' + s + '</span> <span class="c">/ 60</span>' : '<span class="c">not held yet</span>';
  if (h !== lastNum) { $('num').innerHTML = h; lastNum = h; }
  var t;
  if (S.done) t = 'settled at 60 seconds. the map is bunched around ' + D.n[S.list.length ? S.list[0] : nearestTo(S.fx, S.fy)] + '.';
  else if (S.held) t = 'artists near ' + D.n[nearestTo(S.fx, S.fy)] + ' are creeping toward your finger.';
  else if (S.spring >= 0) t = 'springing back to where they were.';
  else t = 'hold anywhere.';
  if ($('say').textContent !== t) $('say').textContent = t;
  var hb = $('hold'), bt = S.held ? 'let go and spring back' : 'hold at the marked spot';
  if (hb.textContent !== bt) { hb.textContent = bt; hb.setAttribute('aria-pressed', S.held ? 'true' : 'false'); }
}
// the one live region: stop changes, the 60 s point and the release, never the ticking count
function tell(m) { var e = $('sr'); if (e.textContent !== m) e.textContent = m; }
function settled() { S.done = true; tell('settled at 60 seconds, around ' + D.n[S.list.length ? S.list[0] : nearestTo(S.fx, S.fy)] + '.'); }
function begin(x, y) {
  if (S.held) return;
  WK.stop(); S.held = true; S.t = 0; S.fx = x; S.fy = y; S.done = false; S.spring = -1; S.t0 = performance.now(); S.acc = 0;
  S.fam = D.f[nearestTo(x, y)]; S.list = nearestK(x, y, NK); S.k = -1; S.px = x; S.py = y;
  // the pull reaches at least the six nearest, so it shows even where the map is sparse
  var l = S.list[S.list.length - 1];
  S.from = [Float32Array.from(X), Float32Array.from(Y)];
  S.reach = Math.max(REACH, Math.hypot(X[l] - (x - MAP.ox) / MAP.scl, Y[l] - (y - MAP.oy) / MAP.scl));
  walkFrom(0);
  out();
}
function walkFrom(k0) {
  if (!S.list.length) { $('now').textContent = 'press and hold first, then skip to the next artist.'; return; }
  S.k0 = k0;
  WK.play(S.list.slice(k0).map(function (i) { return { i: i, tag: 'a' }; }), function (k, info) {
    if (info) {
      S.k = S.k0 + k;
      var prev = S.k > 0 ? fam(S.list[S.k - 1]) : null, f = fam(info.i);
      $('now').textContent = 'stop ' + (S.k + 1) + ' of ' + S.list.length + ' nearest your finger: ' + D.n[info.i] + ' (' + f + (prev && prev !== f ? ', a new family' : '') + '). ' + (WK.sound() ? 'hearing ' + info.title + WK.again(info) : 'sound is off') + '.' + (S.k + 1 < S.list.length ? ' next: ' + D.n[S.list[S.k + 1]] + '.' : '');
      tell('stop ' + (S.k + 1) + ' of ' + S.list.length + ': ' + D.n[info.i] + ', ' + f + '.');
      WK.live(function () { draw(); });
    } else { S.k = -1; WK.still(); draw(); if (S.held) { $('now').textContent = 'the six nearest have played. keep holding to watch the pull.'; tell('the six nearest have played.'); } }
    out();
  }).then(function () { if (!WK.playing()) $('now').textContent = 'no clips among the nearest artists here.'; });
}
function end() {
  if (!S.held) return;
  WK.stop(); WK.still(); S.k = -1; S.list = [];
  S.held = false;
  if (S.t > 0 || X[0] !== X0[0]) { S.spring = performance.now(); S.springFrom = [Float32Array.from(X), Float32Array.from(Y)]; }
  S.t = 0; S.done = false;
  $('now').textContent = 'the artists play only when sound is on.';
  tell('let go. the map springs back.');
  out();
}
function skip() {
  if (!S.held) { $('now').textContent = 'press and hold first, then skip ahead.'; return; }
  S.t0 -= (SECS - S.t) * 1000; S.t = SECS; settle();
  if (!S.done) settled(); out(); draw();
}
function nextStop() {
  if (!S.held) { $('now').textContent = 'press and hold first, then skip to the next artist.'; return; }
  walkFrom(S.k + 1 < S.list.length ? S.k + 1 : 0);
}
function reset() { WK.stop(); WK.still(); S.list = []; S.k = -1; S.held = false; S.t = 0; S.done = false; S.fam = -1; S.spring = -1; for (var i = 0; i < N; i++) { X[i] = X0[i]; Y[i] = Y0[i]; } out(); draw(); }

function frame(now) {
  var i;
  if (S.held) {
    S.t = Math.min(SECS, (now - S.t0) / 1000);
    if (!S.done) settle();
    if (S.t >= SECS && !S.done) settled();
    out(); draw();
  } else if (S.spring >= 0) {
    var u = Math.min(1, (now - S.spring) / SPRING), e = 1 - Math.pow(1 - u, 3);
    for (i = 0; i < N; i++) { X[i] = S.springFrom[0][i] + (X0[i] - S.springFrom[0][i]) * e; Y[i] = S.springFrom[1][i] + (Y0[i] - S.springFrom[1][i]) * e; }
    if (u >= 1) { S.spring = -1; if (!S.done) S.t = 0; out(); }
    draw();
  }
  requestAnimationFrame(frame);
}
function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
cv.addEventListener('pointerdown', function (e) { var p = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (x) {} if (S.done && !S.held) { S.done = false; S.t = 0; } begin(p[0], p[1]); e.preventDefault(); });
cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
cv.addEventListener('keydown', function (e) {
  var v = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (e.repeat) return; if (S.held) end(); else begin(S.px, S.py); }
  else if (v && !S.held) { e.preventDefault(); S.kb = true; S.px = Math.max(10, Math.min(MAP.W - 10, S.px + v[0] * 24)); S.py = Math.max(10, Math.min(MAP.H - 10, S.py + v[1] * 24)); draw(); out(); }
});
cv.addEventListener('focus', function () { S.kb = true; if (!S.held) draw(); });
cv.addEventListener('blur', function () { S.kb = false; if (!S.held) draw(); });
$('hold').addEventListener('click', function () { if (S.held) end(); else { if (S.done) { S.done = false; S.t = 0; } begin(S.px, S.py); } });
$('next').addEventListener('click', nextStop);
$('skip').addEventListener('click', skip);
$('reset').addEventListener('click', reset);

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); if (!S.held) { S.px = MAP.W / 2; S.py = MAP.H / 2; } draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; MAP =new WK.Map($('map'), cv, D, b.M, { dim: 1 }); MAP.resize(); S.px = MAP.W / 2; S.py = MAP.H / 2; prep(); WK.pv();
  out(); draw(); requestAnimationFrame(frame);
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
  // the key lists every family on the map, the biggest first
  var cnt = {}, ids = [], i;
  for (i = 0; i < N; i++) cnt[D.f[i]] = (cnt[D.f[i]] || 0) + 1;
  Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).forEach(function (k) { for (i = 0; i < N; i++) if (String(D.f[i]) === k) { ids.push(i); break; } });
  WK.famKey($('fams'), D, ids);
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
