(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, cv = $('cv');
var S = { pts: [], drawing: false, t0: 0, curve: [], stops: [], at: -1, base: 0, speed: 0, fast: false, user: false, info: null, touch: false };
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
  if (S.stops.length) {
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

function sw(i) { return '<i style="background:' + fcol(i) + '"></i>' + WK.esc(fam(i)); }
function key() { WK.famKey($('fams'), D, S.stops.length ? S.stops.map(function (s) { return s.i; }) : D.fam.map(function (_, f) { return D.f.indexOf(f); })); }
function sayFor(k) {
  var s = S.stops, a = D.n[s[k].i], nx = s[k + 1] ? D.n[s[k + 1].i] : null, ch = '';
  if (k > 0 && D.f[s[k].i] !== D.f[s[k - 1].i]) ch = ' family change: ' + sw(s[k - 1].i) + ' to ' + sw(s[k].i) + '.';
  $('say').innerHTML = 'stop ' + (k + 1) + ' of ' + s.length + ': ' + WK.esc(a) + (nx ? ', then ' + WK.esc(nx) + '.' : ', the last stop.') + ch;
}
function modeLine() { return S.fast ? 'fast stroke: the big names near the curve.' : 'slow stroke: the exact nearest.'; }
function setNow() {
  var t = '';
  if (S.at >= 0 && S.info) t = 'playing “' + S.info.title + '”, ' + D.n[S.stops[S.at].i] + '. ' + modeLine() + (WK.sound() ? '' : ' sound is off: tap the sound chip at the top.');
  else if (S.stops.length) t = modeLine();
  $('now').textContent = t;
}
function blank() { $('num').innerHTML = '<span class="c">no radio yet</span>'; }

function onst(k, info) {
  if (k < 0) {
    if (S.user) return;
    S.at = -1; WK.still(); draw(); setNow();
    if (S.stops.length) { $('say').textContent = 'the radio ended. tap a number to hear a stop again, or draw a new curve.'; $('nx').disabled = true; $('st').disabled = true; }
    return;
  }
  if (!S.stops[S.base + k]) return;
  S.at = S.base + k; S.info = info; sayFor(S.at); setNow();
  $('nx').disabled = S.at >= S.stops.length - 1; $('st').disabled = false;
  draw(); WK.live(draw);
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
  blank(); $('say').textContent = 'a longer curve makes more stops, up to 9.'; setNow();
  $('nx').disabled = true; $('st').disabled = true; key(); draw();
}

function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
// the number chip sits beside its star (the same box wallkit's MAP.tag draws), so a tap on the chip counts too; top chip first
function badgeAt(p) {
  var g = MAP.g, k, i, w, x, y, hit = -1;
  g.save(); g.font = '600 12px "IBM Plex Mono", monospace';
  for (k = S.stops.length - 1; k >= 0 && hit < 0; k--) {
    i = S.stops[k].i; w = g.measureText(String(k + 1)).width + 12; x = MAP.X(i) + 12; y = MAP.Y(i) - 14;
    if (x + w > MAP.W - 2) x = MAP.X(i) - 12 - w; if (y < 11) y = MAP.Y(i) + 16; if (x < 2) x = 2;
    if (p[0] >= x - 4 && p[0] <= x + w + 4 && p[1] >= y - 15 && p[1] <= y + 15) hit = k;
  }
  g.restore();
  for (k = 0; k < S.stops.length && hit < 0; k++) if (Math.hypot(MAP.X(S.stops[k].i) - p[0], MAP.Y(S.stops[k].i) - p[1]) < 18) hit = k;
  return hit;
}
// on a phone the map takes half the screen and does not scroll, so a nearly straight up-and-down swipe is a scroll attempt: it never replaces a radio
function scrolly(p) {
  if (!S.touch || !S.stops.length) return false;
  var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  p.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  return x1 - x0 <= Math.max(24, 0.25 * (y1 - y0));
}
cv.addEventListener('pointerdown', function (e) {
  var p = pos(e), b = badgeAt(p);
  if (b >= 0 && !S.drawing) { go(b); return; }
  S.drawing = true; S.cut = false; S.touch = e.pointerType === 'touch'; S.pts = [p]; S.t0 = performance.now();
  try { cv.setPointerCapture(e.pointerId); } catch (x) {}
});
cv.addEventListener('pointermove', function (e) {
  if (!S.drawing) return;
  var p = pos(e), l = S.pts[S.pts.length - 1];
  if (Math.hypot(p[0] - l[0], p[1] - l[1]) >= 3) {
    S.pts.push(p);
    // the old radio keeps playing until the new stroke is long enough to count
    if (!S.cut && len(S.pts) >= 60 && !scrolly(S.pts)) {
      S.cut = true; S.user = true; WK.stop(); S.user = false; WK.still();
      S.stops = []; S.at = -1; S.curve = []; $('nx').disabled = true; $('st').disabled = true; blank();
    }
    draw();
  }
});
function up() {
  if (!S.drawing) return;
  S.drawing = false;
  if (len(S.pts) < 60 || scrolly(S.pts)) { S.pts = []; draw(); if (!S.stops.length) $('say').textContent = 'that was too short. drag a longer curve.'; return; }
  build();
  if (S.stops.length < 2) {
    S.stops = []; key(); draw(); blank(); setNow();
    $('say').textContent = 'not enough artists with a clip near that curve. draw it across more of the map.'; return;
  }
  key();
  $('num').textContent = S.stops.length;
  setNow();
  go(0);
}
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
$('nx').addEventListener('click', function () { go(S.at + 1); });
$('st').addEventListener('click', function () {
  S.user = true; WK.stop(); S.user = false; WK.still(); S.at = -1; draw(); setNow(); $('st').disabled = true;
  $('say').textContent = 'stopped. tap a number to play from there.'; $('nx').disabled = true;
});
$('clr').addEventListener('click', clear);
// the sound chip lives in wallkit and says nothing when it flips, so the status line is rewritten after any press on it
// (capture: the chip rewrites its own label on click, which detaches the span that was tapped before the event bubbles)
document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#wk-snd, #wk-go')) setTimeout(setNow, 0); }, true);
addEventListener('message', function (e) { if (e.data && e.data.sm === 'front') setTimeout(setNow, 0); });
addEventListener('keydown', function (e) { if (e.key === 'n' && S.stops.length && !e.metaKey && !e.ctrlKey) go(S.at + 1); });
// stops hold artist indices, so they follow the map; only the drawn curve is in pixels and is carried into the new frame
var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () {
  var bx = $('map'), ox = MAP && MAP.ox, oy = MAP && MAP.oy, sc = MAP && MAP.scl, c = S.curve, f;
  if (!MAP || (Math.max(200, bx.clientWidth) === MAP.W && Math.max(200, bx.clientHeight) === MAP.H)) return;
  MAP.resize();
  f = function (q) { return [MAP.ox + (q[0] - ox) * MAP.scl / sc, MAP.oy + (q[1] - oy) * MAP.scl / sc]; };
  S.curve = c.map(f); S.pts = S.pts === c ? S.curve : S.pts.map(f); draw();
}, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M;
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5 }); MAP.resize(); key();
  return WK.pv().then(draw, draw);
});
})();
