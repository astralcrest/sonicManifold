(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv');
var S = { heard: {}, fams: {}, cnt: 0, last: -1, cur: -1, down: false, all: false, silent: {} };

function nearest(px, py) {
  var best = -1, bd = 1e18, i, dx, dy, d;
  for (i = 0; i < D.xy.length; i++) { dx = MAP.X(i) - px; dy = MAP.Y(i) - py; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return bd < 60 * 60 ? best : -1;
}
function draw() {
  MAP.begin();
  var g = MAP.g, small = MAP.W < 500, i, r = small ? 4.5 : 6.5;
  var k, j, lit = function (q) { return S.all || S.heard[q]; };
  g.save(); g.lineWidth = 0.7; g.strokeStyle = PAL.ice; g.globalAlpha = S.all ? 0.16 : 0.3; g.beginPath();
  for (i = 0; i < D.xy.length; i++) {
    if (!lit(i)) continue;
    for (k = 0; k < D.nn[i].length; k++) { j = D.nn[i][k]; if (j > i && lit(j)) { g.moveTo(MAP.X(i), MAP.Y(i)); g.lineTo(MAP.X(j), MAP.Y(j)); } }
  }
  g.stroke(); g.restore();
  for (i = 0; i < D.xy.length; i++) {
    if (!lit(i)) continue;
    var rr = (small ? 1.8 : 2.4) + Math.sqrt(D.pl[i] || 1) * (small ? 0.16 : 0.22);
    P.peb(g, i, MAP.X(i), MAP.Y(i), Math.min(r * 1.6, rr), WK.FAMC[D.fam[D.f[i]]] || '#9a90b8');
  }
  if (S.cur >= 0) {
    P.glyph(g, 'dot', MAP.X(S.cur), MAP.Y(S.cur), 8, PAL.ice);
    WK.pulse(g, MAP.X(S.cur), MAP.Y(S.cur), PAL.ice, 12);
    MAP.tag(S.cur, S.silent[S.cur] ? D.n[S.cur] + ' (no clip)' : D.n[S.cur], PAL.ink, PAL.night);
  }
}
function out() {
  var nf = Object.keys(S.fams).length;
  $('num').innerHTML = '<span class="a">' + (S.all ? D.n.length : S.cnt) + '</span>';
  $('say').textContent = S.cur >= 0 ? 'heard ' + (S.all ? D.n.length : S.cnt) + ' of ' + D.n.length.toLocaleString('en-US') + '. now at ' + D.n[S.cur] + '.' : 'turn sound on, then drag across the map.';
  $('keylab').textContent = 'artists heard of ' + D.n.length.toLocaleString('en-US') + ', ' + (S.all ? D.fam.length : nf) + ' of ' + D.fam.length + ' families touched';
}
function hasClip(i) { return !!(WK.title(i)); }
function hit(i) {
  if (i < 0 || i === S.cur) return;
  S.cur = i;
  if (!S.heard[i]) { S.heard[i] = 1; S.cnt++; S.fams[D.f[i]] = 1; }
  WK.pv().then(function () {
    if (S.cur !== i) return;
    if (!hasClip(i)) { S.silent[i] = 1; WK.stop(); WK.still(); $('now').textContent = D.n[i] + ': no clip'; draw(); return; }
    S.last = i;
    WK.play([{ i: i, tag: 'a' }], function (k, info) { if (info && S.cur === i) { $('now').textContent = 'hearing ' + info.title + ' (' + D.n[info.i] + ')'; WK.live(draw); } else if (!info) { WK.still(); draw(); } });
  });
  draw(); out();
}
function at(e) { var r = cv.getBoundingClientRect(); return nearest(e.clientX - r.left, e.clientY - r.top); }
cv.addEventListener('pointerdown', function (e) { S.down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} S.cur = -1; hit(at(e)); e.preventDefault(); });
cv.addEventListener('pointermove', function (e) { if (S.down) hit(at(e)); });
function up() { S.down = false; }
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

$('clear').addEventListener('click', function () { WK.stop(); WK.still(); S.heard = {}; S.fams = {}; S.cnt = 0; S.cur = -1; S.last = -1; S.all = false; S.silent = {}; $('now').textContent = 'sound: clips play only when sound is on.'; draw(); out(); });
$('all').addEventListener('click', function () { S.all = true; draw(); out(); });
$('hear').addEventListener('click', function () {
  var i = S.cur >= 0 ? S.cur : S.last;
  if (i < 0) { $('now').textContent = 'drag across the map first, then replay.'; return; }
  WK.pv().then(function () {
    if (!hasClip(i)) { $('now').textContent = D.n[i] + ': no clip'; return; }
    WK.play([{ i: i, tag: 'a' }], function (k, info) { if (info) { $('now').textContent = 'hearing ' + info.title + ' (' + D.n[info.i] + ')'; WK.live(draw); } else { WK.still(); draw(); } });
  });
});

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; MAP = new WK.Map($('map'), cv, D, b.M, { dim: 0.18, lattice: false }); MAP.resize();
  WK.pv(); draw(); out();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
