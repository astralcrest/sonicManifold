(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP, PV = null, ADJ = null;
var cv = $('cv');
var S = { hear: -1, a: null, b: null, drag: null, mid: -1, lastPlay: 0, steps: null };

function adj() {
  if (ADJ) return ADJ;
  ADJ = []; var i, k; for (i = 0; i < M.N; i++) ADJ.push([]);
  for (i = 0; i < M.N; i++) for (k = 0; k < D.nn[i].length; k++) { ADJ[i].push(D.nn[i][k]); ADJ[D.nn[i][k]].push(i); }
  return ADJ;
}
function bfs(a, b) {
  if (a === b) return 0;
  var A = adj(), dist = new Int16Array(M.N).fill(-1), q = [a], h = 0; dist[a] = 0;
  while (h < q.length) { var u = q[h++]; for (var k = 0; k < A[u].length; k++) { var v = A[u][k]; if (dist[v] < 0) { dist[v] = dist[u] + 1; if (v === b) return dist[v]; q.push(v); } } }
  return -1;
}
function nearest(x, y, needClip) {
  var best = -1, bd = 1e18, i, d;
  for (i = 0; i < M.N; i++) {
    if (needClip && PV && !PV[i]) continue;
    d = (D.xy[i][0] - x) * (D.xy[i][0] - x) + (D.xy[i][1] - y) * (D.xy[i][1] - y);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function toMap(e) { var b = cv.getBoundingClientRect(); return [(e.clientX - b.left - MAP.ox) / MAP.scl, (e.clientY - b.top - MAP.oy) / MAP.scl]; }
function clamp(v) { return Math.max(0, Math.min(1000, v)); }
function hit(p) {
  var d = [S.a ? Math.hypot(S.a[0] - p[0], S.a[1] - p[1]) : 1e9, S.b ? Math.hypot(S.b[0] - p[0], S.b[1] - p[1]) : 1e9];
  var k = d[0] <= d[1] ? 'a' : 'b';
  return { k: k, d: d[k === 'a' ? 0 : 1] * MAP.scl };
}
function setPt(k, p) { S[k] = [clamp(p[0]), clamp(p[1])]; update(); }

cv.addEventListener('pointerdown', function (e) {
  var p = toMap(e), h;
  e.preventDefault();
  if (!S.a) S.drag = { id: e.pointerId, k: 'a' }, setPt('a', p);
  else if (!S.b) S.drag = { id: e.pointerId, k: 'b' }, setPt('b', p);
  else { h = hit(p); S.drag = { id: e.pointerId, k: h.k }; setPt(h.k, p); }
  try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  if (e.pointerType === 'touch') { S.touch = S.touch || {}; S.touch[e.pointerId] = S.drag.k; }
});
cv.addEventListener('pointermove', function (e) {
  var k = S.touch && S.touch[e.pointerId] || (S.drag && S.drag.id === e.pointerId ? S.drag.k : null);
  if (!k || !(e.buttons || e.pointerType === 'touch')) return;
  setPt(k, toMap(e));
});
function up(e) { if (S.touch) delete S.touch[e.pointerId]; if (S.drag && S.drag.id === e.pointerId) S.drag = null; }
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

function update() {
  if (S.a && S.b) {
    var mx = (S.a[0] + S.b[0]) / 2, my = (S.a[1] + S.b[1]) / 2, m = nearest(mx, my, true);
    var na = nearest(S.a[0], S.a[1], false), nb = nearest(S.b[0], S.b[1], false);
    var sa = bfs(m, na), sb = bfs(m, nb);
    S.mx = mx; S.my = my; S.steps = [sa, sb, na, nb];
    if (m !== S.mid) {
      S.mid = m;
      var now = Date.now();
      if (now - S.lastPlay > 2500) { S.lastPlay = now; WK.play([{ i: m, tag: 'a' }], function (k, info) { S.hear = info ? m : -1; $('now').textContent = info ? 'hearing ' + info.title + ' by ' + D.n[m] : ''; if (info) WK.live(draw); else { WK.still(); draw(); } }); }
    }
    var mxs = Math.max(sa, sb);
    $('num').textContent = sa < 0 || sb < 0 ? '?' : mxs;
    $('say').textContent = sa < 0 || sb < 0 ? 'out of reach in the graph.' : D.n[m] + ' is ' + sa + (sa === 1 ? ' step' : ' steps') + ' from one of you and ' + sb + (sb === 1 ? ' step' : ' steps') + ' from the other. nearest in sound to the point halfway between you.';
  } else {
    $('num').textContent = '-';
    $('say').textContent = S.a ? 'one spot down. tap a second spot on the map.' : 'tap two spots on the map, then drag either one.';
  }
  draw();
}

function tagAt(g, x, y, text, col) {
  g.save(); g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  var w = g.measureText(text).width + 10, h = 20, tx = Math.round(x + 14), ty = Math.round(y - 16);
  if (tx + w > MAP.W - 2) tx = Math.round(x - 14 - w); if (ty < 12) ty = Math.round(y + 18);
  g.fillStyle = PAL.night; g.fillRect(tx, ty - h / 2, w, h); g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(tx + 0.5, ty - h / 2 + 0.5, w - 1, h - 1);
  g.fillStyle = col; g.fillText(text, tx + 5, ty + 0.5); g.restore();
}
function sp(k) { return [MAP.ox + S[k][0] * MAP.scl, MAP.oy + S[k][1] * MAP.scl]; }
function draw() {
  MAP.begin();
  var g = MAP.g, pa, pb, m, mp;
  if (S.a) pa = sp('a');
  if (S.b) pb = sp('b');
  if (S.a && S.b) {
    P.ribbon(g, [pa, pb], PAL.ice, PAL.ice, 1.4, 0.7);
    mp = [MAP.ox + S.mx * MAP.scl, MAP.oy + S.my * MAP.scl];
    m = S.mid;
    if (m >= 0) {
      P.ribbon(g, [mp, [MAP.X(m), MAP.Y(m)]], PAL.violet, PAL.violet, 1, 0.6, [3, 4]);
      P.peb(g, m, MAP.X(m), MAP.Y(m), 10, WK.FAMC[D.fam[D.f[m]]] || PAL.violet);
      P.glyph(g, 'ring', MAP.X(m), MAP.Y(m), 16, PAL.violet);
      tagAt(g, MAP.X(m), MAP.Y(m), D.n[m], PAL.violet);
      if (S.hear === m && WK.playing()) WK.pulse(g, MAP.X(m), MAP.Y(m), PAL.ice, 16);
    }
    P.glyph(g, 'dot', mp[0], mp[1], 5, PAL.ice);
  }
  if (pa) { P.glyph(g, 'ring', pa[0], pa[1], 18, PAL.ink); P.glyph(g, 'dot', pa[0], pa[1], 4, PAL.ink); }
  if (pb) { P.glyph(g, 'ring', pb[0], pb[1], 18, PAL.ink); P.glyph(g, 'dot', pb[0], pb[1], 4, PAL.ink); }
  if (!S.a || !S.b) {
    g.save(); g.font = '500 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center';
    g.fillText(S.a ? 'now the second spot.' : 'tap two spots.', MAP.W / 2, MAP.H - 16); g.restore();
  }
}

$('rs').addEventListener('click', function () { WK.stop(); S.a = S.b = null; S.mid = -1; S.steps = null; S.hear = -1; $('now').textContent = ''; update(); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; LOOP = a[0].LOOP; PV = a[1];
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.6 }); MAP.resize(); update();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
