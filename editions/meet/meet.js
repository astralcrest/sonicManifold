(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP, PV = null, ADJ = null;
var cv = $('cv');
var S = { hear: -1, a: null, b: null, drag: null, mid: -1, lastPlay: 0, steps: null, route: [], wk: -1, tok: 0 };

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
function path(a, b) {
  if (a === b) return [a];
  var A = adj(), par = new Int32Array(M.N).fill(-2), q = [a], h = 0, u, k, v, out = [];
  par[a] = -1;
  while (h < q.length) { u = q[h++]; for (k = 0; k < A[u].length; k++) { v = A[u][k]; if (par[v] === -2) { par[v] = u; if (v === b) { h = q.length; break; } q.push(v); } } }
  if (par[b] === -2) return [];
  for (v = b; v !== -1; v = par[v]) out.push(v);
  return out.reverse();
}
function fam(i) { return D.fam[D.f[i]]; }
function fcol(i) { return WK.FAMC[fam(i)] || PAL.ice; }
// before two spots there is no number and no label: the strip's you: line and the map caption say what to do
function setNum(t) { $('num').textContent = t == null ? '' : String(t); $('numlab').hidden = t == null; }
function soundHint() { return WK.sound() ? '' : ' sound is off: tap the sound chip at the top.'; }
// #say is its words plus the sound hint, so a press that turns sound on rewrites it
function setSay(t) { S.say = t; $('say').textContent = t ? t + soundHint() : ''; }
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
    var r1 = path(na, m), r2 = path(m, nb);
    S.route = r1.length && r2.length ? r1.concat(r2.slice(1)) : [];
    S.mi = S.route.indexOf(m);
    if (m !== S.mid) {
      if (S.wk >= 0) { S.tok++; WK.stop(); S.hear = -1; }
      S.mid = m; S.wk = -1;
      var now = Date.now();
      if (now - S.lastPlay > 2500) { S.lastPlay = now; playList([{ i: m, tag: 'mid' }], false); }
      // the throttle above can skip the last pick of a drag: once the pick holds still, play it if it is not the one heard
      clearTimeout(S.mt); S.mt = setTimeout(settle, 300);
    }
    var mxs = Math.max(sa, sb);
    setNum(sa < 0 || sb < 0 ? '?' : mxs);
    setSay(sa < 0 || sb < 0 ? 'out of reach in the graph.' : D.n[m] + ' is ' + sa + (sa === 1 ? ' step' : ' steps') + ' from your first spot and ' + sb + (sb === 1 ? ' step' : ' steps') + ' from your second. nearest on the map to the point halfway between your spots. the route has ' + S.route.length + ' stops.');
  } else {
    setNum(null); S.route = [];
    setSay('');
  }
  var rk = S.route.join(',');
  if (rk !== S.rk) { S.rk = rk; WK.famKey($('fams'), D, S.route); }
  draw();
}

function settle() { if (S.a && S.b && S.mid >= 0 && S.wk < 0 && S.hear !== S.mid) { S.lastPlay = Date.now(); playList([{ i: S.mid, tag: 'mid' }], false); } }
function playList(list, walking) {
  var my = ++S.tok;
  WK.play(list, function (k, info) {
    if (my !== S.tok) return;
    if (info) {
      var ri = walking ? parseInt(info.tag.slice(1), 10) : -1, line;
      S.wk = ri; S.hear = info.i;
      line = (walking ? 'stop ' + (ri + 1) + ' of ' + S.route.length + ': ' : 'halfway: ') + info.title + ' by ' + D.n[info.i] + ' (' + fam(info.i) + ').';
      if (walking && ri > 0) {
        var pr = S.route[ri - 1];
        line += fam(pr) !== fam(info.i) ? ' family change from ' + fam(pr) + '.' : ' same family as the last stop.';
      }
      $('now').textContent = line + (walking && ri < S.route.length - 1 ? ' next stop: ' + D.n[S.route[ri + 1]] + '.' : '');
      WK.live(draw);
    } else { S.hear = -1; WK.still(); draw(); if (walking && my === S.tok) $('now').textContent = 'end of the route. tap walk the route to hear it again.'; }
  });
}
function walkFrom(from) {
  var list = [], r;
  clearTimeout(S.mt);
  if (!S.route.length) { $('now').textContent = 'place two spots first, or tap pick two spots for me.'; return; }
  for (r = from; r < S.route.length; r++) if (PV[S.route[r]]) list.push({ i: S.route[r], tag: 'r' + r });
  if (!list.length) { $('now').textContent = 'no more clips on this route. tap walk the route to start over.'; S.wk = -1; draw(); return; }
  S.lastPlay = Date.now(); playList(list, true);
}
function tagAt(g, x, y, text, col) {
  g.save(); g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  var w = g.measureText(text).width + 10, h = 20, tx = Math.round(x + 14), ty = Math.round(y - 16);
  if (tx + w > MAP.W - 2) tx = Math.round(x - 14 - w); if (ty < 12) ty = Math.round(y + 18);
  g.fillStyle = PAL.night; g.fillRect(tx, ty - h / 2, w, h); g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(tx + 0.5, ty - h / 2 + 0.5, w - 1, h - 1);
  g.fillStyle = col; g.fillText(text, tx + 5, ty + 0.5); g.restore();
}
function sp(k) { return [MAP.ox + S[k][0] * MAP.scl, MAP.oy + S[k][1] * MAP.scl]; }
function drawRoute(g) {
  var R = S.route, n = R.length, k, pts, cur = S.wk, i, x, y, r, mx = Math.log(1 + D.pl[M.order[0]]);
  if (n < 2) return;
  pts = MAP.pts(R);
  P.ribbon(g, pts, PAL.ice, PAL.ice, 1.6, cur >= 0 ? 0.28 : 0.55);
  if (cur > 0) P.ribbon(g, pts.slice(0, cur + 1), PAL.ice, PAL.mint, 3, 0.95);
  for (k = 0; k < n; k++) {
    i = R[k]; x = pts[k][0]; y = pts[k][1]; r = 4 + 5 * Math.log(1 + D.pl[i]) / mx;
    P.peb(g, i, x, y, r, fcol(i));
    if (!PV[i]) { g.save(); g.globalAlpha = 0.5; g.fillStyle = PAL.night; g.fillRect(x - 1, y - 1, 2, 2); g.restore(); }
  }
  if (cur >= 0 && cur < n) {
    P.rings(g, pts[cur][0], pts[cur][1], PAL.mint, 16);
    if (WK.playing()) WK.pulse(g, pts[cur][0], pts[cur][1], PAL.mint, 15);
  } else if (S.hear >= 0 && WK.playing() && S.hear === S.mid) WK.pulse(g, MAP.X(S.mid), MAP.Y(S.mid), PAL.mint, 16);
}
// your spot: a crosshair with its number, a mark nothing else on the map uses
function spot(g, x, y, n) {
  g.save(); g.setLineDash([]); g.globalAlpha = 1; g.strokeStyle = g.fillStyle = PAL.ink; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y - 16); g.lineTo(x, y - 6); g.moveTo(x, y + 6); g.lineTo(x, y + 16); g.moveTo(x - 16, y); g.lineTo(x - 6, y); g.moveTo(x + 6, y); g.lineTo(x + 16, y); g.stroke();
  g.beginPath(); g.arc(x, y, 2.5, 0, 6.2832); g.fill();
  g.font = '600 11px "IBM Plex Mono", monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
  var tx = x + 19 > MAP.W ? x - 19 : x + 7, ty = y - 21 < 0 ? y + 7 : y - 21;
  g.fillStyle = PAL.night; g.fillRect(tx, ty, 12, 14); g.fillStyle = PAL.ink; g.fillText(n, tx + 6, ty + 7.5);
  g.restore();
}
function draw() {
  MAP.begin();
  var g = MAP.g, pa, pb, m, mp;
  if (S.a) pa = sp('a');
  if (S.b) pb = sp('b');
  if (S.a && S.b) {
    P.ribbon(g, [pa, pb], PAL.ice, PAL.ice, 1, 0.35, [2, 5]);
    drawRoute(g);
    mp = [MAP.ox + S.mx * MAP.scl, MAP.oy + S.my * MAP.scl];
    m = S.mid;
    if (m >= 0) {
      P.ribbon(g, [mp, [MAP.X(m), MAP.Y(m)]], PAL.ink, PAL.ink, 1, 0.6, [3, 4]);
      P.peb(g, m, MAP.X(m), MAP.Y(m), 7 + 6 * Math.log(1 + D.pl[m]) / Math.log(1 + D.pl[M.order[0]]), fcol(m));
      P.glyph(g, 'ring', MAP.X(m), MAP.Y(m), 16, PAL.ink);
    }
    P.glyph(g, 'dot', mp[0], mp[1], 5, PAL.ice);
  }
  if (pa) spot(g, pa[0], pa[1], '1');
  if (pb) spot(g, pb[0], pb[1], '2');
  // names last, so no mark ever sits on a name
  if (S.a && S.b && m >= 0) tagAt(g, MAP.X(m), MAP.Y(m), D.n[m], PAL.ink);
  if (S.a && S.b && S.wk >= 0 && S.wk < S.route.length) MAP.tag(S.route[S.wk], (S.wk + 1) + '/' + S.route.length + ' ' + D.n[S.route[S.wk]], PAL.mint);
  if (!S.a || !S.b) {
    g.save(); g.font = '500 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center';
    g.fillText(S.a ? 'now the second spot.' : 'tap two spots.', MAP.W / 2, MAP.H - 16); g.restore();
  }
}

$('rs').addEventListener('click', function () { S.tok++; S.route = []; S.wk = -1; WK.stop(); S.a = S.b = null; S.mid = -1; S.steps = null; S.hear = -1; $('now').textContent = ''; update(); });
$('walk').addEventListener('click', function () { walkFrom(0); });
$('nxt').addEventListener('click', function () { walkFrom(S.wk < 0 ? 0 : S.wk + 1); });
$('again').addEventListener('click', function () { if (!(S.a && S.b)) { $('now').textContent = 'place two spots first.'; return; } S.mid = -1; S.lastPlay = 0; update(); });
$('rnd').addEventListener('click', function () {
  var pool = M.order.slice(0, 300).filter(function (i) { return PV[i]; }), a = pool[Math.floor(Math.random() * pool.length)], b, t = 0;
  do { b = pool[Math.floor(Math.random() * pool.length)]; t++; } while ((b === a || Math.hypot(D.xy[a][0] - D.xy[b][0], D.xy[a][1] - D.xy[b][1]) < 250) && t < 60);
  S.tok++; S.a = D.xy[a].slice(); S.b = D.xy[b].slice(); S.mid = -1; S.lastPlay = 0; S.wk = -1; update();
});
addEventListener('keydown', function (e) { if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return; if (e.key === 'n') walkFrom(S.wk < 0 ? 0 : S.wk + 1); else if (e.key === 'r') $('rnd').click(); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; LOOP = a[0].LOOP; PV = a[1];
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.6 }); MAP.resize(); update();
}).catch(function () { S.say = ''; $('say').textContent = 'the data did not load. reload the page.'; });
// the chip, the strip's play button, or any play-shaped button can turn sound on: rewrite the hint after the press lands
document.addEventListener('click', function () { setTimeout(function () { if (S.say) setSay(S.say); }, 0); }, true);
addEventListener('message', function (e) { if (e.data && e.data.sm === 'front') setTimeout(function () { if (S.say) setSay(S.say); }, 0); });
})();
