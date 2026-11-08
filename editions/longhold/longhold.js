(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv'), N, NN, X0, Y0, X, Y;
var SECS = 60, SPRING = 2000, HZ = 6, TW = null;
var S = { held: false, t: 0, fx: 0, fy: 0, fam: -1, spring: -1, springFrom: null, done: false, lastIt: 0, tick: 0, list: [], k: -1, k0: 0, px: 0, py: 0, kb: false };
var NK = 6;

function prep() {
  N = D.xy.length; X0 = new Float32Array(N); Y0 = new Float32Array(N); X = new Float32Array(N); Y = new Float32Array(N);
  for (var i = 0; i < N; i++) { X0[i] = D.xy[i][0]; Y0[i] = D.xy[i][1]; X[i] = X0[i]; Y[i] = Y0[i]; }
}
function settle() {
  var nx = new Float32Array(N), ny = new Float32Array(N), i, k, c, sx, sy, j, a = 0.25;
  for (i = 0; i < N; i++) {
    sx = 0; sy = 0; c = 0;
    for (k = 0; k < NN[i].length; k++) { j = NN[i][k]; if (j < 0) continue; sx += X[j]; sy += Y[j]; c++; }
    if (c) { nx[i] = X[i] + (sx / c - X[i]) * a; ny[i] = Y[i] + (sy / c - Y[i]) * a; } else { nx[i] = X[i]; ny[i] = Y[i]; }
  }
  X = nx; Y = ny;
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
      P.ribbon(g, pts.slice(0, S.k + 2), PAL.violet, PAL.mint, small ? 2 : 2.6, 0.9);
    }
    S.list.forEach(function (q, n) { P.peb(g, q, ax(q), ay(q), (small ? 4 : 6) + (small ? 3 : 5) * TW[q], WK.FAMC[fam(q)] || '#9a90b8'); P.glyph(g, 'dot', ax(q), ay(q), 3, n <= S.k ? PAL.night : PAL.ink); });
    if (S.k >= 0 && WK.playing()) { WK.pulse(g, ax(S.list[S.k]), ay(S.list[S.k]), PAL.mint, 14); }
  }
  if (S.kb && !S.held && S.t === 0) { g.save(); g.strokeStyle = PAL.mint; g.lineWidth = 1.5; g.globalAlpha = 0.8; g.beginPath(); g.arc(S.px, S.py, 12, 0, 6.2832); g.moveTo(S.px - 18, S.py); g.lineTo(S.px + 18, S.py); g.moveTo(S.px, S.py - 18); g.lineTo(S.px, S.py + 18); g.stroke(); g.restore(); }
  if (S.held || S.t > 0) {
    var p = Math.min(1, S.t / SECS), R = (small ? 10 : 12) + p * (small ? 38 : 56);
    g.save(); g.lineWidth = 3; g.strokeStyle = PAL.mint; g.globalAlpha = 0.25; g.beginPath(); g.arc(S.fx, S.fy, R + 14, 0, 6.2832); g.stroke();
    g.globalAlpha = 1; g.beginPath(); g.arc(S.fx, S.fy, R + 14, -1.5708, -1.5708 + p * 6.2832); g.stroke(); g.restore();
    P.glyph(g, 'star', S.fx, S.fy, R * 0.8, PAL.mint);
    if (S.held && !S.done) WK.pulse(g, S.fx, S.fy, PAL.mint, R + 24);
    g.save(); g.font = '600 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center';
    g.fillText(Math.floor(S.t) + ' s', S.fx, S.fy + R + 40); g.restore();
  }
}
function out() {
  var s = Math.floor(S.t);
  $('num').innerHTML = S.t > 0 || S.held ? '<span class="m">' + s + '</span> <span class="c">/ 60</span>' : '<span class="c">not held yet</span>';
  var t, f = S.k >= 0 ? S.list[S.k] : -1;
  if (S.done) t = 'second 60 of 60, settled. the map is bunched around ' + D.n[S.list.length ? S.list[0] : nearestTo(S.fx, S.fy)] + '.' + (WK.playing() ? ' still playing the artists nearest your finger.' : '');
  else if (S.held) t = 'second ' + s + ' of 60. artists near ' + D.n[nearestTo(S.fx, S.fy)] + ' are creeping toward your finger' + (f >= 0 ? '; stop ' + (S.k + 1) + ' of ' + S.list.length + ' plays, ' + D.n[f] + ' (' + fam(f) + ')' : '') + '.';
  else if (S.spring >= 0) t = 'springing back to where they were.';
  else t = 'press and hold anywhere on the map and the nearest artists play in order; keep holding and the map bunches up around your finger. no finger: press the hold button, or focus the map, use arrow keys to aim and space to hold.';
  if ($('say').textContent !== t) $('say').textContent = t;
  var hb = $('hold'); hb.textContent = S.held ? 'let go and spring back' : 'hold at the marked spot'; hb.setAttribute('aria-pressed', S.held ? 'true' : 'false');
}
function begin(x, y) {
  if (S.held) return;
  WK.stop(); S.held = true; S.t = 0; S.fx = x; S.fy = y; S.done = false; S.spring = -1; S.t0 = performance.now(); S.lastIt = S.t0; S.acc = 0;
  S.fam = D.f[nearestTo(x, y)]; S.list = nearestK(x, y, NK); S.k = -1; S.px = x; S.py = y;
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
      $('now').textContent = 'stop ' + (S.k + 1) + ' of ' + S.list.length + ' nearest your finger: ' + D.n[info.i] + ' (' + f + (prev && prev !== f ? ', a new family' : '') + '). hearing ' + info.title + WK.again(info) + '.' + (S.k + 1 < S.list.length ? ' next: ' + D.n[S.list[S.k + 1]] + '.' : '');
      WK.live(function () { draw(); });
    } else { S.k = -1; WK.still(); draw(); if (S.held) $('now').textContent = 'the six nearest have played. keep holding to watch the pull.'; }
    out();
  }).then(function () { if (!WK.playing()) $('now').textContent = 'no clips among the nearest artists here.'; });
}
function end() {
  if (!S.held) return;
  WK.stop(); WK.still(); S.k = -1; S.list = [];
  S.held = false;
  if (S.t > 0 || X[0] !== X0[0]) { S.spring = performance.now(); S.springFrom = [Float32Array.from(X), Float32Array.from(Y)]; }
  if (!S.done) S.t = 0;
  $('now').textContent = 'sound: hold anywhere and the nearest artists play, only when sound is on.';
  out();
}
function skip() {
  if (!S.held) { $('now').textContent = 'press and hold first, then skip ahead.'; return; }
  var left = Math.ceil((SECS - S.t) * HZ), q;
  for (q = 0; q < left; q++) settle();
  S.t0 -= (SECS - S.t) * 1000; S.t = SECS; S.lastIt = performance.now();
  S.done = true; out(); draw();
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
    if (now - S.lastIt > 1000 / HZ && !S.done) { settle(); S.lastIt = now; }
    if (S.t >= SECS && !S.done) S.done = true;
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
  D = b.D; NN = D.nn; MAP = new WK.Map($('map'), cv, D, b.M, { dim: 1 }); MAP.resize(); S.px = MAP.W / 2; S.py = MAP.H / 2; prep(); WK.pv();
  out(); draw(); requestAnimationFrame(frame);
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
