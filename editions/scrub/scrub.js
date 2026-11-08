(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv');
var S = { heard: {}, fams: {}, cnt: 0, last: -1, cur: -1, down: false, all: false, silent: {}, trail: [], walk: null, tm: 0 };
var IDLE = 'sound: clips play only when sound is on.';

function fam(i) { return D.fam[D.f[i]]; }
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
    P.peb(g, i, MAP.X(i), MAP.Y(i), Math.min(r * 1.6, rr), WK.FAMC[fam(i)] || '#9a90b8');
  }
  var tr = S.walk ? S.walk.list : S.trail.slice(-14);
  if (tr.length > 1) {
    var cut = S.walk && S.walk.k >= 0 ? S.walk.k : tr.length - 1;
    MAP.line(tr, tr.length, PAL.ice, [3, 5], 1.2);
    MAP.ribbon(tr.slice(0, cut + 1), null, PAL.violet, PAL.mint, small ? 2 : 2.6);
  }
  if (S.cur >= 0) {
    P.glyph(g, 'dot', MAP.X(S.cur), MAP.Y(S.cur), 8, PAL.mint);
    if (WK.playing()) WK.pulse(g, MAP.X(S.cur), MAP.Y(S.cur), PAL.mint, 12);
    else { g.save(); g.strokeStyle = PAL.mint; g.lineWidth = 1.5; g.beginPath(); g.arc(MAP.X(S.cur), MAP.Y(S.cur), 13, 0, 6.2832); g.stroke(); g.restore(); }
    MAP.tag(S.cur, S.silent[S.cur] ? D.n[S.cur] + ' (no clip)' : D.n[S.cur], PAL.ink, PAL.night);
  }
}
function out() {
  var nf = Object.keys(S.fams).length, c = S.all ? D.n.length : S.cnt;
  $('num').innerHTML = c ? '<span class="a">' + c + '</span>' : '<span class="c">nothing heard yet</span>';
  if (!S.walk) $('say').textContent = S.cur >= 0 ? 'heard ' + c + ' of ' + D.n.length.toLocaleString('en-US') + '. now at ' + D.n[S.cur] + ' (' + fam(S.cur) + ').' : 'turn sound on, then drag across the map. on a laptop you can also focus the map and use the arrow keys.';
  $('keylab').textContent = 'artists heard of ' + D.n.length.toLocaleString('en-US') + ', ' + (S.all ? D.fam.length : nf) + ' of ' + D.fam.length + ' sound families touched';
}
function hasClip(i) { return !!(WK.title(i)); }
function say(info, i) {
  var f = fam(i), prev = S.trail.length > 1 ? fam(S.trail[S.trail.length - 2]) : null;
  return 'hearing ' + info.title + ' by ' + D.n[i] + ' (' + f + (prev && prev !== f && !S.walk ? ', a new family' : '') + ').';
}
function playOne(i) {
  S.walk = null;
  WK.pv().then(function () {
    if (S.cur !== i) return;
    if (!hasClip(i)) { S.silent[i] = 1; WK.stop(); WK.still(); $('now').textContent = D.n[i] + ': no clip, so it lights silent.'; draw(); return; }
    S.last = i;
    WK.play([{ i: i, tag: 'a' }], function (k, info) { if (info && S.cur === i) { $('now').textContent = say(info, i); WK.live(draw); } else if (!info) { WK.still(); draw(); } });
  });
}
function hit(i, now) {
  if (i < 0 || i === S.cur) return;
  clearTimeout(S.tm); S.walk = null; S.cur = i;
  if (!S.heard[i]) { S.heard[i] = 1; S.cnt++; S.fams[D.f[i]] = 1; }
  if (S.trail[S.trail.length - 1] !== i) { S.trail.push(i); if (S.trail.length > 300) S.trail.shift(); }
  if (now) playOne(i); else S.tm = setTimeout(function () { if (S.cur === i) playOne(i); }, 140);
  draw(); out(); btns();
}
function walkFrom(k0) {
  var list = S.trail.slice(-12);
  if (list.length < 2) { $('now').textContent = 'drag across the map first, then replay your path.'; return; }
  clearTimeout(S.tm);
  S.walk = { list: list, k0: k0, k: -1 };
  var seq = list.slice(k0).map(function (i) { return { i: i, tag: 'a' }; });
  WK.play(seq, function (k, info) {
    if (!S.walk) return;
    if (info) {
      var kk = S.walk.k0 + k, prev = kk > 0 ? fam(list[kk - 1]) : null, f = fam(info.i);
      S.walk.k = kk; S.cur = info.i;
      var same = kk > 0 && list[kk - 1] === info.i;
      $('say').textContent = 'step ' + (kk + 1) + ' of ' + list.length + ' on your path: ' + D.n[info.i] + ' (' + f + (prev && prev !== f ? ', a new family' : '') + ')' + (kk + 1 < list.length ? ', then ' + D.n[list[kk + 1]] : ', the last stop') + '.';
      $('now').textContent = 'hearing ' + info.title + (same ? ' (same artist again)' : '') + '.';
      WK.live(draw);
    } else { WK.still(); S.walk = null; draw(); out(); $('now').textContent = IDLE; }
    btns();
  }).then(function () { if (!WK.playing() && S.walk) { S.walk = null; $('now').textContent = 'no clips along this path.'; draw(); } btns(); });
}
function hop() {
  var from = S.cur >= 0 ? S.cur : S.last, best = -1, bd = 1e18, k, j, dx, dy, d;
  if (from < 0) { $('now').textContent = 'drag across the map first, then hop to the next artist.'; return; }
  for (k = 0; k < D.nn[from].length; k++) {
    j = D.nn[from][k]; if (j < 0 || S.heard[j]) continue;
    dx = D.xy[j][0] - D.xy[from][0]; dy = D.xy[j][1] - D.xy[from][1]; d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = j; }
  }
  if (best < 0) { for (j = 0; j < D.xy.length; j++) { if (S.heard[j]) continue; dx = D.xy[j][0] - D.xy[from][0]; dy = D.xy[j][1] - D.xy[from][1]; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } } }
  if (best >= 0) { S.cur = -1; hit(best, true); }
}
function next() {
  if (S.walk && WK.playing()) { var k = S.walk.k + 1; if (k >= S.walk.list.length) { WK.stop(); return; } walkFrom(k); return; }
  hop();
}
function btns() {
  var w = !!S.walk && WK.playing();
  $('hear').textContent = w ? 'stop the replay' : 'replay my path'; $('hear').setAttribute('aria-pressed', w ? 'true' : 'false');
  $('next').textContent = w ? 'next stop on the path' : 'next artist i have not heard';
}
function at(e) { var r = cv.getBoundingClientRect(); return nearest(e.clientX - r.left, e.clientY - r.top); }
cv.addEventListener('pointerdown', function (e) { S.down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} S.cur = -1; hit(at(e), true); e.preventDefault(); });
cv.addEventListener('pointermove', function (e) { if (S.down) hit(at(e), false); });
function up() { S.down = false; }
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('keydown', function (e) {
  var v = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key], from, k, j, best = -1, bs = 0, dx, dy, c;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); return; }
  if (!v) return; e.preventDefault();
  from = S.cur >= 0 ? S.cur : S.last;
  if (from < 0) { var m = 0; for (j = 1; j < D.xy.length; j++) if ((D.pl[j] || 0) > (D.pl[m] || 0)) m = j; S.cur = -1; hit(m, true); return; }
  for (k = 0; k < D.nn[from].length; k++) {
    j = D.nn[from][k]; if (j < 0) continue;
    dx = D.xy[j][0] - D.xy[from][0]; dy = D.xy[j][1] - D.xy[from][1]; c = (dx * v[0] + dy * v[1]) / (Math.sqrt(dx * dx + dy * dy) || 1);
    if (c > bs) { bs = c; best = j; }
  }
  if (best >= 0 && bs > 0.3) hit(best, true);
});

$('clear').addEventListener('click', function () { clearTimeout(S.tm); WK.stop(); WK.still(); S.heard = {}; S.fams = {}; S.cnt = 0; S.cur = -1; S.last = -1; S.all = false; S.silent = {}; S.trail = []; S.walk = null; $('now').textContent = IDLE; draw(); out(); btns(); });
$('all').addEventListener('click', function () { S.all = true; draw(); out(); });
$('hear').addEventListener('click', function () { if (S.walk && WK.playing()) { WK.stop(); return; } walkFrom(0); });
$('next').addEventListener('click', next);

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; MAP = new WK.Map($('map'), cv, D, b.M, { dim: 0.18, lattice: false }); MAP.resize();
  WK.pv(); draw(); out(); btns();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
