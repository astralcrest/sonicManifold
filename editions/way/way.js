(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, cv = $('cv'), ADJ = [];
var S = { line: [], drag: false, id: null, fx: 0, fy: 0, short: null, goal: null, seed: 20261106 };

function buildAdj() {
  var N = D.n.length, i, k, j;
  for (i = 0; i < N; i++) ADJ.push([]);
  for (i = 0; i < N; i++) for (k = 0; k < D.nn[i].length; k++) {
    j = D.nn[i][k]; if (j < 0 || j === i) continue;
    if (ADJ[i].indexOf(j) < 0) ADJ[i].push(j);
    if (ADJ[j].indexOf(i) < 0) ADJ[j].push(i);
  }
}
function bfs(a, b) {
  var prev = new Int32Array(ADJ.length).fill(-2), q = [a], h = 0, i, k, j;
  prev[a] = -1;
  while (h < q.length) {
    i = q[h++]; if (i === b) break;
    for (k = 0; k < ADJ[i].length; k++) { j = ADJ[i][k]; if (prev[j] === -2) { prev[j] = i; q.push(j); } }
  }
  if (prev[b] === -2) return null;
  var p = []; for (i = b; i !== -1; i = prev[i]) p.push(i);
  return p.reverse();
}
function levels(a, maxd) {
  var d = new Int16Array(ADJ.length).fill(-1), q = [a], h = 0, i, k, j; d[a] = 0;
  while (h < q.length) { i = q[h++]; if (d[i] >= maxd) continue; for (k = 0; k < ADJ[i].length; k++) { j = ADJ[i][k]; if (d[j] < 0) { d[j] = d[i] + 1; q.push(j); } } }
  return d;
}
function nearest(x, y, rad) {
  var best = -1, bd = rad * rad, i, dx, dy, d;
  for (i = 0; i < D.n.length; i++) { dx = MAP.X(i) - x; dy = MAP.Y(i) - y; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best;
}
function local(e) { var b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }

cv.addEventListener('pointerdown', function (e) {
  if (S.drag) return;
  var l = local(e), i = nearest(l[0], l[1], e.pointerType === 'touch' ? 34 : 22);
  if (i < 0) { $('say').textContent = 'start on a star: press close to one.'; return; }
  S.drag = true; S.id = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  S.line = [i]; S.short = null; S.fx = l[0]; S.fy = l[1]; WK.stop(); out(); draw(); e.preventDefault();
});
cv.addEventListener('pointermove', function (e) {
  if (!S.drag || e.pointerId !== S.id) return;
  var l = local(e), i = nearest(l[0], l[1], 16);
  S.fx = l[0]; S.fy = l[1];
  if (i >= 0 && i !== S.line[S.line.length - 1]) S.line.push(i);
  draw();
});
function up(e) {
  if (!S.drag || e.pointerId !== S.id) return;
  S.drag = false;
  if (S.line.length >= 2) S.short = bfs(S.line[0], S.line[S.line.length - 1]);
  out(); draw();
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

function out() {
  var n = S.line.length - 1;
  if (S.drag || n < 1) {
    $('num').innerHTML = '<span class="c">-</span>';
    $('say').textContent = S.drag ? 'crossing stars: ' + Math.max(0, n) + ' so far.' : S.goal ? 'drag from the first star to the second.' : 'drag from one star to another.';
    return;
  }
  if (!S.short) { $('num').innerHTML = '<span class="m">' + n + '</span>'; $('say').textContent = 'your line crossed ' + n + ' stars. these two have no path through the links.'; return; }
  var s = S.short.length - 1;
  $('num').innerHTML = '<span class="m">' + n + '</span><span class="c"> / </span><span class="i">' + s + '</span>';
  $('say').textContent = 'yours took ' + n + ' steps, the shortest took ' + s + '. ' + (n === s ? 'you found it.' : n < s ? 'your line crossed ' + n + ' stars because the hops are not always links.' : 'that is ' + Math.round(100 * (n - s) / s) + ' percent longer.');
}

function pt(i) { return [MAP.X(i), MAP.Y(i)]; }
function draw() {
  MAP.begin();
  var g = MAP.g, small = MAP.W < 500, k, pts;
  if (S.goal) {
    P.glyph(g, 'ring', pt(S.goal[0])[0], pt(S.goal[0])[1], 11, PAL.ink); MAP.tag(S.goal[0], 'from ' + D.n[S.goal[0]], PAL.ink, PAL.night);
    P.glyph(g, 'ring', pt(S.goal[1])[0], pt(S.goal[1])[1], 11, PAL.ink); MAP.tag(S.goal[1], 'to ' + D.n[S.goal[1]], PAL.ink, PAL.night);
  }
  if (S.line.length > 1) {
    pts = S.line.map(pt);
    P.ribbon(g, pts, PAL.mint, PAL.mint, small ? 2.4 : 3.2, 0.9);
    for (k = 0; k < pts.length; k++) P.glyph(g, 'star', pts[k][0], pts[k][1], small ? 4 : 5, PAL.mint);
  } else if (S.line.length === 1) P.glyph(g, 'star', pt(S.line[0])[0], pt(S.line[0])[1], 8, PAL.mint);
  if (S.drag && S.line.length) { var l = pt(S.line[S.line.length - 1]); P.ribbon(g, [l, [S.fx, S.fy]], PAL.mint, PAL.mint, 1, 0.5, [3, 5]); }
  if (S.short) {
    pts = S.short.map(pt);
    P.ribbon(g, pts, PAL.ice, PAL.ice, small ? 1.6 : 2.2, 0.95);
    for (k = 0; k < pts.length; k++) P.glyph(g, 'dot', pts[k][0], pts[k][1], small ? 5 : 6.5, PAL.ice);
    var a = S.line[0], b = S.line[S.line.length - 1];
    MAP.tag(a, D.n[a], PAL.mint, PAL.night); MAP.tag(b, D.n[b], PAL.mint, PAL.night);
  }
}

$('clear').addEventListener('click', function () { S.line = []; S.short = null; S.drag = false; WK.stop(); hearLabel(); out(); draw(); });
$('pair').addEventListener('click', function () {
  var r = LOOPRNG(S.seed), a, d, c, tries = 0, i, list;
  S.seed = (S.seed * 1103515245 + 12345) >>> 0;
  var top = M.order.slice(0, 300);
  while (tries++ < 60) {
    a = top[(r() * top.length) | 0]; d = levels(a, 12); list = [];
    for (i = 0; i < top.length; i++) if (d[top[i]] >= 7 && d[top[i]] <= 10) list.push(top[i]);
    if (list.length) { c = list[(r() * list.length) | 0]; S.goal = [a, c]; break; }
  }
  S.line = []; S.short = null; WK.stop(); hearLabel(); out(); draw();
});
var LOOPRNG;
function hearLabel() { var on = WK.playing(); $('hear').setAttribute('aria-pressed', on ? 'true' : 'false'); $('hear').textContent = on ? 'stop' : 'hear the end'; }
$('hear').addEventListener('click', function () {
  if (WK.playing()) { WK.stop(); hearLabel(); return; }
  var e = S.line.length ? S.line[S.line.length - 1] : (S.goal ? S.goal[1] : -1);
  if (e < 0) { $('now').textContent = 'draw a line first.'; return; }
  WK.play([{ i: e, tag: 'b' }], function (k, info) {
    $('now').textContent = info ? 'hearing ' + info.title + ' (' + D.n[info.i] + ')' : 'sound: the end star plays a preview only after you tap hear, and only when sound is on.';
    hearLabel();
  });
});
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M; LOOPRNG = b.LOOP.rng; buildAdj();
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.55 }); MAP.resize();
  $('pair').click();
  $('meta').textContent = 'data: ' + D.n.length + ' artists, each linked to the six that sound nearest.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
