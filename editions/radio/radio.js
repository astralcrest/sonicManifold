(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, cv = $('cv');
var S = { pts: [], drawing: false, t0: 0, curve: [], stops: [], at: -1, base: 0, speed: 0, fast: false, user: false };
var R = 48, FASTV = 0.6;

function fam(i) { return D.fam[D.f[i]] || ''; }
function fcol(i) { return WK.FAMC[fam(i)] || PAL.ink; }
function len(p) { var L = 0, k; for (k = 1; k < p.length; k++) L += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); return L; }

function resample(p, n) {
  var L = len(p), out = [], k, d, acc, seg, t, j = 1;
  acc = 0;
  for (k = 0; k < n; k++) {
    t = L * k / (n - 1);
    while (j < p.length - 1 && acc + Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]) < t) { acc += Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]); j++; }
    seg = Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]) || 1; d = Math.max(0, Math.min(1, (t - acc) / seg));
    out.push({ x: p[j - 1][0] + (p[j][0] - p[j - 1][0]) * d, y: p[j - 1][1] + (p[j][1] - p[j - 1][1]) * d, j: j });
  }
  return out;
}

function pick(pt, used, fast) {
  var best = -1, bs = fast ? -1 : 1e18, i, d, s, N = D.n.length;
  for (i = 0; i < N; i++) {
    if (used[i] || !WK.title(i)) continue;
    d = Math.hypot(MAP.X(i) - pt.x, MAP.Y(i) - pt.y); if (d > R) continue;
    if (fast) { s = D.pl[i] - d * 0.001; if (s > bs) { bs = s; best = i; } }
    else if (d < bs) { bs = d; best = i; }
  }
  return best;
}

function build() {
  var L = len(S.pts), n = Math.max(3, Math.min(9, Math.round(L / 90))), rs = resample(S.pts, n), used = {}, k, i;
  var dur = Math.max(1, performance.now() - S.t0);
  S.speed = L / dur; S.fast = S.speed > FASTV; S.curve = S.pts; S.stops = [];
  for (k = 0; k < rs.length; k++) {
    i = pick(rs[k], used, S.fast); if (i < 0) continue;
    used[i] = 1; S.stops.push({ i: i, j: rs[k].j });
  }
}

function draw() {
  MAP.begin();
  var g = MAP.g, k, cur = S.at, c = S.curve;
  if (S.drawing && S.pts.length > 1) P.ribbon(g, S.pts.filter(function (_, q) { return q % 3 === 0 || q === S.pts.length - 1; }), PAL.ice, PAL.ice, 2.5, 0.8);
  if (!S.drawing && S.stops.length) {
    var sub = function (a, b) { return c.slice(a, b).filter(function (_, q, A) { return q % 3 === 0 || q === A.length - 1; }); };
    P.ribbon(g, sub(0, c.length), PAL.ice, PAL.ice, 2, 0.35);
    var upto = cur >= 0 ? S.stops[cur].j + 1 : 0;
    if (upto > 1) P.ribbon(g, sub(0, upto), PAL.ice, PAL.mint, 3.5, 0.95);
    for (k = 0; k < S.stops.length; k++) {
      var s = S.stops[k], x = MAP.X(s.i), y = MAP.Y(s.i), on = k === cur;
      g.save(); g.globalAlpha = k <= cur || cur < 0 ? 1 : 0.55; g.strokeStyle = fcol(s.i); g.lineWidth = 2; g.beginPath(); g.arc(x, y, on ? 11 : 8, 0, 6.2832); g.stroke(); g.restore();
      P.glyph(g, 'star', x, y, on ? 7 : 5, on ? PAL.mint : PAL.ink);
      if (on) WK.pulse(g, x, y, PAL.mint, 15);
    }
    for (k = 0; k < S.stops.length; k++) MAP.tag(S.stops[k].i, String(k + 1), k === cur ? PAL.night : PAL.mint, k === cur ? PAL.mint : PAL.night);
  }
}

function sayFor(k) {
  var s = S.stops, a = D.n[s[k].i], nx = s[k + 1] ? D.n[s[k + 1].i] : null, ch = '';
  if (k > 0 && D.f[s[k].i] !== D.f[s[k - 1].i]) ch = ' family change: ' + fam(s[k - 1].i) + ' to ' + fam(s[k].i) + '.';
  $('say').textContent = 'stop ' + (k + 1) + ' of ' + s.length + ': ' + a + (nx ? ', then ' + nx + '.' : ', the last stop.') + ch;
}
function modeLine() { return S.fast ? 'fast stroke: the big names near the curve.' : 'slow stroke: the exact nearest.'; }

function onst(k, info) {
  if (k < 0) {
    if (S.user) return;
    S.at = -1; WK.still(); draw();
    if (S.stops.length) { $('say').textContent = 'the radio ended. tap a number to hear a stop again, or draw a new curve.'; $('nx').disabled = true; $('st').disabled = true; }
    return;
  }
  S.at = S.base + k; sayFor(S.at);
  $('now').textContent = 'playing “' + info.title + '”, ' + D.n[S.stops[S.at].i] + '. ' + modeLine() + (WK.sound() ? '' : ' sound is off: tap the button at the top.');
  $('nx').disabled = S.at >= S.stops.length - 1; $('st').disabled = false;
  WK.live(draw);
}
function go(k) {
  if (!S.stops.length) return;
  k = Math.max(0, Math.min(S.stops.length - 1, k));
  S.user = true; WK.stop(); S.user = false;
  S.base = k;
  WK.play(S.stops.slice(k).map(function (s) { return { i: s.i, tag: 'a' }; }), onst);
}
function clear() {
  S.user = true; WK.stop(); S.user = false; WK.still();
  S.pts = []; S.curve = []; S.stops = []; S.at = -1;
  $('num').innerHTML = '<span class="c">draw a curve to start</span>';
  $('say').textContent = 'drag across the map. a longer curve makes more stops, up to 9.';
  $('now').textContent = 'turn sound on with the button at the top, then draw. on a laptop, drag with the mouse; press n for the next stop.';
  $('nx').disabled = true; $('st').disabled = true; draw();
}

function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function badgeAt(p) {
  for (var k = 0; k < S.stops.length; k++) if (Math.hypot(MAP.X(S.stops[k].i) - p[0], MAP.Y(S.stops[k].i) - p[1]) < 18) return k;
  return -1;
}
cv.addEventListener('pointerdown', function (e) {
  var p = pos(e), b = badgeAt(p);
  if (b >= 0 && !S.drawing) { go(b); return; }
  S.user = true; WK.stop(); S.user = false; WK.still();
  S.drawing = true; S.pts = [p]; S.t0 = performance.now(); S.stops = []; S.at = -1; S.curve = [];
  $('nx').disabled = true; $('st').disabled = true;
  try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  draw();
});
cv.addEventListener('pointermove', function (e) {
  if (!S.drawing) return;
  var p = pos(e), l = S.pts[S.pts.length - 1];
  if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 3) { S.pts.push(p); draw(); }
});
function up() {
  if (!S.drawing) return;
  S.drawing = false;
  if (len(S.pts) < 60) { S.pts = []; draw(); $('say').textContent = 'that was too short. drag a longer curve.'; return; }
  build();
  if (S.stops.length < 2) {
    S.stops = []; draw();
    $('say').textContent = 'not enough artists with a clip near that curve. draw it across more of the map.'; return;
  }
  $('num').textContent = S.stops.length;
  $('now').textContent = modeLine() + ' tap a number to jump, or use next stop.';
  go(0);
}
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
$('nx').addEventListener('click', function () { go(S.at + 1); });
$('st').addEventListener('click', function () {
  S.user = true; WK.stop(); S.user = false; WK.still(); S.at = -1; draw(); $('st').disabled = true;
  $('say').textContent = 'stopped. tap a number to play from there.'; $('nx').disabled = true;
});
$('clr').addEventListener('click', clear);
addEventListener('keydown', function (e) { if (e.key === 'n' && S.stops.length && !e.metaKey && !e.ctrlKey) go(S.at + 1); });
var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); S.pts = []; S.curve = []; S.stops = []; S.at = -1; draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M;
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5 }); MAP.resize();
  return WK.pv().then(draw, draw);
});
})();
