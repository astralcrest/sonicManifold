(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP;
var cv = $('cv'), V = 150, R_REACH = 150, TABOO = 12;
var S = { x: 0, y: 0, cur: 0, ta: -1, tb: -1, la: 0, lb: 0, trail: [], seen: [], start: 0, last: 0, active: false, dirty: true, lastPlay: 0, kept: 0 };
var H = { a: { id: null, dx: 0, dy: 0, s: 0, key: 0 }, b: { id: null, dx: 0, dy: 0, s: 0, key: 0 } };

function px(i) { return D.xy[i][0]; }
function py(i) { return D.xy[i][1]; }
function taboo(i) { return S.seen.indexOf(i) >= 0; }
function remember(i) { S.seen.push(i); if (S.seen.length > TABOO) S.seen.shift(); }

function pickA(c) {
  var nn = D.nn[c].slice().sort(function (p, q) { return LOOP.dist(M, c, p) - LOOP.dist(M, c, q); }), k;
  for (k = 0; k < nn.length; k++) if (!taboo(nn[k])) return nn[k];
  return nn[0];
}
function pickB(c) {
  var best = -1, bp = -1, i, d;
  for (i = 0; i < M.N; i++) {
    if (i === c || taboo(i)) continue;
    d = Math.hypot(px(i) - px(c), py(i) - py(c));
    if (d < R_REACH && D.pl[i] > bp) { bp = D.pl[i]; best = i; }
  }
  if (best >= 0) return best;
  bp = 1e9;
  for (i = 0; i < M.N; i++) { if (i === c || taboo(i)) continue; d = Math.hypot(px(i) - px(c), py(i) - py(c)); if (d < bp) { bp = d; best = i; } }
  return best;
}
function retarget() { S.ta = pickA(S.cur); S.tb = pickB(S.cur); }

function reset() {
  S.start = M.order[11]; S.cur = S.start; S.x = px(S.start); S.y = py(S.start); S.la = 0; S.lb = 0; S.trail = [[S.x, S.y, 0]]; S.seen = [S.start]; S.lastPlay = 0;
  retarget(); S.dirty = true; out();
}

function geo() {
  var W = MAP.W, Hh = MAP.H, r = Math.min(W, Hh) * 0.3;
  return { r: r, ax: 44, bx: W - 44, y: Hh / 2 };
}
function setHandle(h, x, y) {
  var G = geo(), ax = h === H.a ? G.ax : G.bx, dx = x - ax, dy = y - G.y, L = Math.hypot(dx, dy);
  if (L > G.r) { dx *= G.r / L; dy *= G.r / L; L = G.r; }
  h.dx = dx; h.dy = dy; h.s = L / G.r < 0.12 ? 0 : L / G.r;
}
function local(e) { var b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top, b.width]; }
function which(e) { var l = local(e); return l[0] < l[2] / 2 ? H.a : H.b; }
cv.addEventListener('pointerdown', function (e) {
  var h = which(e); if (h.id !== null) return;
  h.id = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  var l = local(e); setHandle(h, l[0], l[1]); S.dirty = true; e.preventDefault();
});
cv.addEventListener('pointermove', function (e) {
  var h = H.a.id === e.pointerId ? H.a : H.b.id === e.pointerId ? H.b : null; if (!h) return;
  var l = local(e); setHandle(h, l[0], l[1]); S.dirty = true;
});
function up(e) {
  [H.a, H.b].forEach(function (h) { if (h.id === e.pointerId) { h.id = null; h.s = 0; h.dx = 0; h.dy = 0; S.dirty = true; } });
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
addEventListener('keydown', function (e) {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') { H.a.key = 1; e.preventDefault(); } else if (e.key === 'ArrowRight') { H.b.key = 1; e.preventDefault(); }
});
addEventListener('keyup', function (e) { if (e.key === 'ArrowLeft') H.a.key = 0; else if (e.key === 'ArrowRight') H.b.key = 0; });

function strength(h) { return h.key ? 1 : h.s; }
function unit(tx, ty) { var dx = tx - S.x, dy = ty - S.y, L = Math.hypot(dx, dy); return L < 1 ? [0, 0] : [dx / L, dy / L]; }

function step(dt) {
  var sa = strength(H.a), sb = strength(H.b);
  if (sa + sb < 0.02) { S.active = false; return false; }
  S.active = true;
  var ua = unit(px(S.ta), py(S.ta)), ub = unit(px(S.tb), py(S.tb)), mv = V * dt;
  S.x = Math.max(0, Math.min(1000, S.x + (sa * ua[0] + sb * ub[0]) * mv));
  S.y = Math.max(0, Math.min(1000, S.y + (sa * ua[1] + sb * ub[1]) * mv));
  S.la += sa * mv; S.lb += sb * mv;
  var win = sa > sb * 1.1 ? 1 : sb > sa * 1.1 ? 2 : 0, lt = S.trail[S.trail.length - 1];
  if (Math.hypot(S.x - lt[0], S.y - lt[1]) > 8) { S.trail.push([S.x, S.y, win]); if (S.trail.length > 900) S.trail.shift(); }
  var da = Math.hypot(S.x - px(S.ta), S.y - py(S.ta)), db = Math.hypot(S.x - px(S.tb), S.y - py(S.tb));
  if (da < 14 || db < 14) { arrive(da < db ? S.ta : S.tb); }
  return true;
}
function arrive(i) {
  S.cur = i; remember(i); retarget();
  var now = Date.now();
  if (now - S.lastPlay > 7000) { S.lastPlay = now; WK.play([{ i: i, tag: 'a' }], function (k, info) { $('now').textContent = info ? 'hearing ' + info.title + ' (' + D.n[i] + ')' : 'sound: a short preview plays when the point reaches a new artist.'; }); }
}

function out() {
  var t = S.la + S.lb, a = t ? Math.round(100 * S.la / t) : 0;
  $('num').innerHTML = t ? '<span class="a">' + a + '</span><span class="c">:</span><span class="b">' + (100 - a) + '</span>' : '<span class="c">-</span>';
  $('numlab').textContent = S.active ? 'the pull so far' : 'the pull ended';
  $('say').textContent = t ? 'auto-play\'s lean made ' + a + ' of the walk, my press made ' + (100 - a) + '. ' + (Math.abs(a - 50) < 8 ? 'close to even: they cancel and the point barely goes anywhere.' : a > 50 ? 'the lean toward sound won.' : 'the lean toward plays won.') : 'pull a handle to start. two fingers or two people.';
}

function runs() {
  var T = S.trail, r = [], cur = null, i;
  for (i = 1; i < T.length; i++) {
    var w = T[i][2];
    if (!cur || cur.w !== w) { cur = { w: w, p: [[MAP.ox + T[i - 1][0] * MAP.scl, MAP.oy + T[i - 1][1] * MAP.scl]] }; r.push(cur); }
    cur.p.push([MAP.ox + T[i][0] * MAP.scl, MAP.oy + T[i][1] * MAP.scl]);
  }
  return r;
}
function draw() {
  MAP.begin();
  var g = MAP.g, G = geo(), cols = [PAL.ink, PAL.violet, PAL.mint];
  runs().forEach(function (r) { if (r.p.length > 1) P.ribbon(g, r.p, cols[r.w], cols[r.w], MAP.W < 500 ? 2.6 : 3.4, 0.95); });
  var tx = function (i) { return MAP.ox + px(i) * MAP.scl; }, ty = function (i) { return MAP.oy + py(i) * MAP.scl; };
  var X = MAP.ox + S.x * MAP.scl, Y = MAP.oy + S.y * MAP.scl;
  P.ribbon(g, [[X, Y], [tx(S.ta), ty(S.ta)]], PAL.violet, PAL.violet, 1, 0.5, [3, 5]);
  P.ribbon(g, [[X, Y], [tx(S.tb), ty(S.tb)]], PAL.mint, PAL.mint, 1, 0.5, [3, 5]);
  P.glyph(g, 'ring', tx(S.ta), ty(S.ta), 11, PAL.violet);
  P.glyph(g, 'star', tx(S.tb), ty(S.tb), 11, PAL.mint);
  if (strength(H.a) > 0) MAP.tag(S.ta, D.n[S.ta], PAL.violet, PAL.night);
  if (strength(H.b) > 0) MAP.tag(S.tb, D.n[S.tb], PAL.mint, PAL.night);
  P.peb(g, S.cur, X, Y, 8, PAL.ink);
  P.rings(g, X, Y, PAL.ink, 18);
  // handles
  [[H.a, G.ax, PAL.violet, 'ring', "auto-play's lean"], [H.b, G.bx, PAL.mint, 'star', 'my press']].forEach(function (d) {
    var h = d[0], hx = d[1] + h.dx, hy = G.y + h.dy;
    if (h.s || h.key) P.ribbon(g, [[d[1], G.y], [hx, hy]], d[2], d[2], 2, 0.5);
    g.save(); g.fillStyle = PAL.night; g.beginPath(); g.arc(hx, hy, 28, 0, 6.2832); g.fill(); g.lineWidth = 1.5; g.strokeStyle = d[2]; g.globalAlpha = h.s || h.key ? 1 : 0.6; g.stroke(); g.restore();
    P.glyph(g, d[3], hx, hy, 17, d[2]);
    g.save(); g.font = '500 12px "IBM Plex Mono", monospace'; g.fillStyle = d[2]; g.textAlign = d[1] < G.bx ? 'left' : 'right'; g.fillText(d[4], d[1] < G.bx ? 12 : MAP.W - 12, G.y + 52); g.restore();
  });
  if (S.trail.length < 2) { g.save(); g.font = '500 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.fillText('two fingers or two people. drag each handle inward.', MAP.W / 2, MAP.H - 16); g.restore(); }
}

var lastT = 0;
function frame(t) {
  var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
  var moved = step(dt);
  if (moved || S.dirty) { draw(); out(); S.dirty = false; }
  requestAnimationFrame(frame);
}
$('reset').addEventListener('click', function () { reset(); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); S.dirty = true; }, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M; LOOP = b.LOOP;
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.55 }); MAP.resize();
  reset();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map. the ring\'s target is the nearest artist in sound that the point has not just visited; the star\'s target is the most played artist within reach of the last one it reached.';
  requestAnimationFrame(frame);
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
