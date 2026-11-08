(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP, PV = null, ADJ = null;
var cv = $('cv'), TH = 16, COOL = 900;
var S = { cur: 0, deals: [], last: 0, listening: false, hear: null, got: false };

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
function srt(c) { return D.nn[c].slice().sort(function (a, b) { return LOOP.dist(M, c, a) - LOOP.dist(M, c, b); }); }
function startAt() { var p = M.order.slice(0, 300).filter(function (i) { return PV && PV[i]; }); return p[Math.floor(Math.random() * p.length)]; }

function hearOf(i, col) {
  S.hear = { i: i, col: col };
  WK.play([{ i: i, tag: 'tap' }], function (k, info) {
    if (info) { $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[i]; WK.live(draw); }
    else { S.hear = null; WK.still(); draw(); }
  });
  draw();
}
function shakeNow() {
  var now = Date.now(); if (now - S.last < COOL) return; S.last = now;
  var c = S.cur, t, tries = 0, press;
  do { t = Math.floor(Math.random() * M.N); tries++; } while ((t === c || (PV && !PV[t])) && tries < 400);
  press = srt(c)[0];
  var J = bfs(c, t), j = bfs(c, press);
  S.deals.push({ c: c, t: t, p: press, J: J, j: j });
  if (S.deals.length > 40) S.deals.shift();
  S.cur = press;
  render();
  hearOf(t, PAL.amber);
}
function render() {
  var d = S.deals[S.deals.length - 1];
  if (!d) { $('num').textContent = '-'; $('say').textContent = 'shake the phone, or tap shake.'; draw(); return; }
  var sj = 0, sp = 0; S.deals.forEach(function (x) { sj += Math.max(0, x.J); sp += Math.max(0, x.j); });
  $('num').textContent = d.J < 0 ? '?' : d.J;
  $('say').textContent = 'shake ' + S.deals.length + ': from ' + D.n[d.c] + ' shuffle leaped to ' + D.n[d.t] + ', then a press hops to ' + D.n[d.p] + '. shuffle\'s jump was ' + d.J + (d.J === 1 ? ' step' : ' steps') + ', a press\'s was ' + d.j + '. over ' + S.deals.length + (S.deals.length === 1 ? ' shake' : ' shakes') + ' the averages are ' + (sj / S.deals.length).toFixed(1) + ' and ' + (sp / S.deals.length).toFixed(1) + '. a toy rule, not my data.';
  draw();
}
function draw() {
  MAP.begin();
  var g = MAP.g, X = MAP.X, Y = MAP.Y, n = S.deals.length, k, d, thick = MAP.W < 500 ? 2.6 : 3.4;
  for (k = Math.max(0, n - 6); k < n - 1; k++) {
    d = S.deals[k];
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.t), Y(d.t)]], PAL.amber, PAL.amber, 1.4, 0.28);
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.p), Y(d.p)]], PAL.mint, PAL.mint, 1.6, 0.28);
  }
  if (n) {
    d = S.deals[n - 1];
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.t), Y(d.t)]], PAL.amber, PAL.amber, thick, 0.95);
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.p), Y(d.p)]], PAL.mint, PAL.mint, thick, 0.95);
    P.peb(g, d.t, X(d.t), Y(d.t), 9, WK.FAMC[D.fam[D.f[d.t]]] || PAL.amber); P.glyph(g, 'diamond', X(d.t), Y(d.t), 13, PAL.amber);
    P.peb(g, d.p, X(d.p), Y(d.p), 8, WK.FAMC[D.fam[D.f[d.p]]] || PAL.mint); P.glyph(g, 'star', X(d.p), Y(d.p), 12, PAL.mint);
    P.peb(g, d.c, X(d.c), Y(d.c), 9, PAL.ink); P.rings(g, X(d.c), Y(d.c), PAL.ink, 18);
  } else {
    P.peb(g, S.cur, X(S.cur), Y(S.cur), 9, PAL.ink); P.rings(g, X(S.cur), Y(S.cur), PAL.ink, 18);
    g.save(); g.font = '500 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.fillText('shake the phone, or tap shake.', MAP.W / 2, MAP.H - 16); g.restore();
  }
  if (S.hear) WK.pulse(g, X(S.hear.i), Y(S.hear.i), S.hear.col, 16);
}

var lx = 0, ly = 0, lz = 0, have = false;
function onMotion(e) {
  var a = e.accelerationIncludingGravity; if (!a) return;
  var x = a.x || 0, y = a.y || 0, z = a.z || 0;
  if (have) { var m = Math.abs(x - lx) + Math.abs(y - ly) + Math.abs(z - lz); if (m > TH * 2) shakeNow(); }
  lx = x; ly = y; lz = z; have = true; S.got = true; $('nophone').hidden = true;
}
function listen() { if (S.listening) return; S.listening = true; addEventListener('devicemotion', onMotion); $('alw').hidden = true; $('say').textContent = 'shake is on. shake the phone, or tap shake.'; }
var DM = window.DeviceMotionEvent;
if (DM) {
  if (typeof DM.requestPermission === 'function') {
    $('alw').hidden = false;
    $('alw').addEventListener('click', function () {
      DM.requestPermission().then(function (r) { if (r === 'granted') listen(); else $('say').textContent = 'motion was not allowed. tap shake instead.'; }).catch(function () { $('say').textContent = 'motion is not available here. tap shake instead.'; });
    });
  } else if ('ontouchstart' in window) listen();
}
setTimeout(function () { if (!S.got) $('nophone').hidden = false; }, 1500);
$('dl').addEventListener('click', function () { S.last = 0; shakeNow(); });
$('sr').addEventListener('click', function () { WK.stop(); WK.still(); S.hear = null; S.deals = []; S.cur = startAt(); $('now').textContent = 'tap any shape on the map to hear it.'; render(); });
addEventListener('keydown', function (e) { if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey && !e.altKey) { S.last = 0; shakeNow(); } });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; LOOP = a[0].LOOP; PV = a[1];
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.6, tap: function (i) { hearOf(i, WK.FAMC[D.fam[D.f[i]]] || PAL.ice); } }); MAP.resize(); S.cur = startAt(); render();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
