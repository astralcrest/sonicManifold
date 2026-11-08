(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv'), N, NN, X0, Y0, X, Y;
var SECS = 60, SPRING = 2000, HZ = 6, TW = null;
var S = { held: false, t: 0, fx: 0, fy: 0, fam: -1, spring: -1, springFrom: null, done: false, lastIt: 0, tick: 0 };

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
  if (S.done && WK.playing()) WK.pulse(g, MAP.ox + X[S.near] * MAP.scl, MAP.oy + Y[S.near] * MAP.scl, PAL.mint, 14);
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
  $('num').innerHTML = '<span class="' + (S.t > 0 ? 'm' : 'c') + '">' + s + '</span> <span class="c">/ 60</span>';
  var t;
  if (S.done) t = 'second 60 of 60, settled. ' + D.n[S.near] + ' is the nearest artist to where you held' + (WK.playing() ? ', and it is playing.' : '.');
  else if (S.held) t = 'second ' + s + ' of 60. the artists near ' + D.n[nearestTo(S.fx, S.fy)] + ' are creeping toward your finger. the nearest one plays.';
  else if (S.spring >= 0) t = 'springing back to where they were.';
  else t = 'press and hold anywhere on the map. the nearest artist plays at once; keep holding and the map slowly bunches up around your finger. keyboard: focus it, press space.';
  if ($('say').textContent !== t) $('say').textContent = t;
}
function begin(x, y) {
  if (S.held) return;
  WK.stop(); S.held = true; S.t = 0; S.fx = x; S.fy = y; S.done = false; S.spring = -1; S.t0 = performance.now(); S.lastIt = S.t0; S.acc = 0;
  S.fam = D.f[nearestTo(x, y)]; hear(nearestTo(x, y));
  out();
}
function hear(i) {
  if (S.hearing === i) return; S.hearing = i;
  WK.play([{ i: i, tag: 'a' }], function (k, info) {
    if (info) { $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[info.i] + ', the nearest to your finger.'; WK.live(function () { draw(); }); }
    else { S.hearing = -1; WK.still(); draw(); }
    out();
  });
}
function end() {
  if (!S.held) return;
  WK.stop(); WK.still(); S.hearing = -1;
  S.held = false;
  if (S.t > 0 || X[0] !== X0[0]) { S.spring = performance.now(); S.springFrom = [Float32Array.from(X), Float32Array.from(Y)]; }
  S.t = S.done ? S.t : 0; S.fam = -1;
  if (!S.done) S.t = 0;
  out();
}
function reset() { WK.stop(); WK.still(); S.held = false; S.t = 0; S.done = false; S.fam = -1; S.spring = -1; for (var i = 0; i < N; i++) { X[i] = X0[i]; Y[i] = Y0[i]; } out(); draw(); }

function frame(now) {
  var i;
  if (S.held) {
    S.t = Math.min(SECS, (now - S.t0) / 1000);
    if (now - S.lastIt > 1000 / HZ) { settle(); S.lastIt = now; var nn = nearestTo(S.fx, S.fy); if (nn !== S.hearing && Math.floor(S.t) % 8 === 7) hear(nn); }
    if (S.t >= SECS && !S.done) {
      S.done = true; S.near = nearestTo(S.fx, S.fy); hear(S.near);
    }
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
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (e.repeat) return; if (S.held) end(); else begin(MAP.W / 2, MAP.H / 2); }
});
$('rel').addEventListener('click', end);
$('reset').addEventListener('click', reset);

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; NN = D.nn; MAP = new WK.Map($('map'), cv, D, b.M, { dim: 1 }); MAP.resize(); prep(); WK.pv();
  out(); draw(); requestAnimationFrame(frame);
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
