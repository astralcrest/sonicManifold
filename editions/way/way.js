(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, cv = $('cv'), ADJ = [];
var S = { line: [], drag: false, id: null, fx: 0, fy: 0, short: null, goal: null, seed: 20261106, walk: null, wk: -1, moved: false };

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
  S.line = [i]; S.short = null; S.walk = null; S.wk = -1; S.moved = false; S.fx = l[0]; S.fy = l[1]; WK.stop(); WK.still(); hearLabel(); out(); draw(); e.preventDefault();
});
cv.addEventListener('pointermove', function (e) {
  if (!S.drag || e.pointerId !== S.id) return;
  var l = local(e), i = nearest(l[0], l[1], 16);
  S.fx = l[0]; S.fy = l[1];
  if (i >= 0 && i !== S.line[S.line.length - 1]) { S.line.push(i); S.moved = true; }
  draw();
});
function up(e) {
  if (!S.drag || e.pointerId !== S.id) return;
  S.drag = false;
  if (S.line.length >= 2) S.short = bfs(S.line[0], S.line[S.line.length - 1]);
  else if (S.line.length === 1 && !S.moved) { var one = S.line[0]; WK.play([{ i: one, tag: 'tap' }], function (k, info) { $('now').textContent = info ? 'hearing ' + info.title + ' by ' + D.n[one] + '. drag from it to draw a way.' : ''; }); }
  out(); draw();
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

function out() {
  var n = S.line.length - 1;
  if (S.drag || n < 1) {
    $('num').innerHTML = '<span class="c">-</span>';
    $('say').textContent = S.drag ? 'crossing stars: ' + Math.max(0, n) + ' so far.' : S.goal ? 'drag a line from ' + D.n[S.goal[0]] + ' to ' + D.n[S.goal[1]] + '. or press any star to hear it.' : 'drag from one star to another.';
    return;
  }
  if (!S.short) { $('num').innerHTML = '<span class="m">' + n + '</span>'; $('say').textContent = 'your line crossed ' + n + ' stars. these two have no path through the links.'; return; }
  var s = S.short.length - 1;
  $('num').innerHTML = '<span class="m">' + n + '</span><span class="c"> / </span><span class="i">' + s + '</span>';
  $('say').textContent = 'yours took ' + n + ' steps, the shortest took ' + s + '. ' + (n === s ? 'you found it.' : n < s ? 'your line crossed ' + n + ' stars because the hops are not always links.' : 'that is ' + Math.round(100 * (n - s) / s) + ' percent longer.') + ' walk either one below and hear every stop.';
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
  if (S.walk && S.wk >= 0) {
    var path = S.walk === 'mine' ? S.line : S.short, col = S.walk === 'mine' ? PAL.mint : PAL.ice, w = pt(path[S.wk]);
    pts = path.slice(0, S.wk + 1).map(pt);
    if (pts.length > 1) P.ribbon(g, pts, col, PAL.ink, small ? 3.2 : 4.2, 1);
    P.rings(g, w[0], w[1], col, 16); WK.pulse(g, w[0], w[1], col, 16);
    MAP.tag(path[S.wk], 'step ' + S.wk + ' of ' + (path.length - 1) + ': ' + D.n[path[S.wk]], col, PAL.night);
  }
}

$('clear').addEventListener('click', function () { S.line = []; S.short = null; S.walk = null; S.wk = -1; S.drag = false; WK.stop(); WK.still(); hearLabel(); out(); draw(); });
$('pair').addEventListener('click', function () {
  var r = LOOPRNG(S.seed), a, d, c, tries = 0, i, list;
  S.seed = (S.seed * 1103515245 + 12345) >>> 0;
  var top = M.order.slice(0, 300);
  while (tries++ < 60) {
    a = top[(r() * top.length) | 0]; d = levels(a, 12); list = [];
    for (i = 0; i < top.length; i++) if (d[top[i]] >= 7 && d[top[i]] <= 10) list.push(top[i]);
    if (list.length) { c = list[(r() * list.length) | 0]; S.goal = [a, c]; break; }
  }
  S.line = []; S.short = null; S.walk = null; S.wk = -1; WK.stop(); WK.still(); hearLabel(); out(); draw();
});
var LOOPRNG;
function hearLabel() {
  var on = WK.playing(), can = S.line.length >= 2;
  $('wm').disabled = !can; $('ws').disabled = !(can && S.short);
  $('wm').setAttribute('aria-pressed', on && S.walk === 'mine' ? 'true' : 'false'); $('ws').setAttribute('aria-pressed', on && S.walk === 'short' ? 'true' : 'false');
  $('wm').textContent = on && S.walk === 'mine' ? 'stop' : 'walk my way, stop by stop' + (can ? ' (' + (S.line.length - 1) + ')' : '');
  $('ws').textContent = on && S.walk === 'short' ? 'stop' : 'walk the short way' + (can && S.short ? ' (' + (S.short.length - 1) + ')' : '');
}
function walk(which) {
  if (WK.playing() && S.walk === which) { WK.stop(); return; }
  var path = which === 'mine' ? S.line : S.short; if (!path || path.length < 2) { $('now').textContent = 'draw a line between two stars first.'; return; }
  S.walk = which;
  WK.play(path.map(function (i) { return { i: i, tag: which }; }), function (k, info) {
    if (info) { S.wk = k; $('now').textContent = 'step ' + k + ' of ' + (path.length - 1) + (which === 'mine' ? ' on my way' : ' on the short way') + ': hearing ' + info.title + ' by ' + D.n[info.i] + (k + 1 < path.length ? ', then ' + D.n[path[k + 1]] : ', the end') + '. tap the other button to compare.'; WK.live(draw); }
    else { S.wk = -1; WK.still(); draw(); $('now').textContent = 'the walk ended. draw another, or walk the other way.'; }
    hearLabel();
  });
}
$('wm').addEventListener('click', function () { walk('mine'); });
$('ws').addEventListener('click', function () { walk('short'); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M; LOOPRNG = b.LOOP.rng; buildAdj();
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.55 }); MAP.resize();
  $('pair').click(); hearLabel();
  $('meta').textContent = 'data: ' + D.n.length + ' artists, each linked to the six that sound nearest.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
