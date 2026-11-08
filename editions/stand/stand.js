(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv'), IDX = {};
var S = { picks: [], mark: null, near: [], cur: null };

function find(q) {
  q = q.trim().toLowerCase(); if (!q) return -1;
  if (IDX[q] != null) return IDX[q];
  for (var i = 0; i < D.n.length; i++) if (D.n[i].toLowerCase().indexOf(q) === 0) return i;
  return -1;
}
function place() {
  var seen = {}, picks = [], k, miss = 0, v, i;
  for (k = 0; k < 5; k++) {
    v = $('a' + k).value; if (!v.trim()) continue;
    i = find(v);
    if (i < 0) { miss++; continue; }
    if (!seen[i]) { seen[i] = 1; picks.push(i); }
  }
  S.picks = picks; S.miss = miss; S.mark = null; S.near = [];
  if (picks.length) {
    var mx = 0, my = 0;
    picks.forEach(function (i) { mx += D.xy[i][0]; my += D.xy[i][1]; });
    mx /= picks.length; my /= picks.length; S.mark = [mx, my];
    var d = D.xy.map(function (p, i) { return [(p[0] - mx) * (p[0] - mx) + (p[1] - my) * (p[1] - my), i]; });
    d.sort(function (a, b) { return a[0] - b[0]; });
    S.near = d.slice(0, 10).map(function (x) { return x[1]; });
  }
  WK.stop(); draw(); out();
}
function draw() {
  MAP.begin();
  if (S.mark) drawMark();
  if (S.cur) { P.glyph(MAP.g, 'dot', MAP.X(S.cur.i), MAP.Y(S.cur.i), 6, S.cur.col); WK.pulse(MAP.g, MAP.X(S.cur.i), MAP.Y(S.cur.i), S.cur.col, 14); MAP.tag(S.cur.i, D.n[S.cur.i], S.cur.col); }
}
function onst(k, info) {
  if (info) {
    var tap = info.tag === 'tap', tot = S.near.length;
    S.cur = { i: info.i, col: tap ? PAL.mint : PAL.ice };
    $('now').textContent = tap ? 'hearing ' + info.title + ' by ' + D.n[info.i] + '.' : 'step ' + (k + 1) + ' of ' + tot + ': ' + D.n[info.i] + (k + 1 < tot ? ', then ' + D.n[S.near[k + 1]] : '') + '. hearing ' + info.title + '.';
    WK.live(draw);
  } else { S.cur = null; WK.still(); draw(); $('now').textContent = 'sound: a preview plays only after you tap, and only when sound is on.'; }
  hearLabel();
}
function drawMark() {
  var g = MAP.g, small = MAP.W < 500, k, i, mx, my, r = small ? 13 : 17;
  mx = MAP.ox + S.mark[0] * MAP.scl; my = MAP.oy + S.mark[1] * MAP.scl;
  g.save(); g.lineWidth = 0.7; g.strokeStyle = PAL.ice; g.globalAlpha = 0.5;
  g.beginPath();
  S.near.forEach(function (i) { g.moveTo(mx, my); g.lineTo(MAP.X(i), MAP.Y(i)); });
  g.stroke(); g.restore();
  S.near.forEach(function (i) { P.peb(g, i, MAP.X(i), MAP.Y(i), small ? 5 : 7, WK.FAMC[D.fam[D.f[i]]] || '#9a90b8'); });
  S.picks.forEach(function (i) { P.glyph(g, 'dot', MAP.X(i), MAP.Y(i), small ? 6 : 8, PAL.ice); });
  g.save(); g.setLineDash([]); g.strokeStyle = PAL.ink; g.lineWidth = 3;
  g.beginPath(); g.arc(mx, my, r, 0, 6.2832); g.stroke();
  g.lineWidth = 1.5; g.beginPath(); g.arc(mx, my, r + 7, 0, 6.2832); g.stroke();
  g.lineWidth = 1.5; g.beginPath();
  g.moveTo(mx - r - 22, my); g.lineTo(mx - r - 10, my); g.moveTo(mx + r + 10, my); g.lineTo(mx + r + 22, my);
  g.moveTo(mx, my - r - 22); g.lineTo(mx, my - r - 10); g.moveTo(mx, my + r + 10); g.lineTo(mx, my + r + 22);
  g.stroke(); g.restore();
  S.picks.forEach(function (i) { MAP.tag(i, D.n[i], PAL.ice, PAL.night); });
}
function out() {
  var ul = $('near'), fam = {}, html = '';
  if (!S.mark) {
    $('num').innerHTML = '<span class="c">not placed yet</span>'; ul.innerHTML = '';
    $('say').textContent = S.miss ? 'no match yet. pick a name from the list as you type.' : 'type one to five artists you like, then press place me.';
    return;
  }
  S.near.forEach(function (i) {
    fam[D.f[i]] = 1;
    html += '<li><span class="sw" style="background:' + (WK.FAMC[D.fam[D.f[i]]] || '#9a90b8') + '"></span><span class="nm">' + WK.esc(D.n[i]) + '</span></li>';
  });
  ul.innerHTML = html;
  var nf = Object.keys(fam).length;
  $('num').innerHTML = '<span>' + nf + '</span>';
  $('say').textContent = S.picks.length + ' placed' + (S.miss ? ', ' + S.miss + ' with no match' : '') + '. the white ring is the middle of your artists on my map: where you stand. the ten nearest to it are listed, nearest first; tap one to hear it.';
}
function hearLabel() { var p = WK.playing(); $('hear').setAttribute('aria-pressed', p ? 'true' : 'false'); $('hear').textContent = p ? 'stop the preview' : 'hear the ten nearest, one by one'; }

$('go').addEventListener('click', place);
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') place(); });
$('clear').addEventListener('click', function () {
  for (var k = 0; k < 5; k++) $('a' + k).value = '';
  S.miss = 0; place();
});
$('hear').addEventListener('click', function () {
  if (WK.playing()) { WK.stop(); hearLabel(); return; }
  if (!S.near.length) { $('now').textContent = 'place yourself first.'; return; }
  WK.play(S.near.map(function (i) { return { i: i, tag: 'near' }; }), onst).then(function () { if (!WK.playing()) $('now').textContent = 'no clips for these ten.'; hearLabel(); });
});

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; MAP = new WK.Map($('map'), cv, D, b.M, { dim: 0.5, tap: function (i) { WK.play([{ i: i, tag: 'tap' }], onst); } }); MAP.resize();
  var dl = $('dl'), html = '';
  D.n.forEach(function (n, i) { IDX[n.toLowerCase()] = i; html += '<option value="' + WK.esc(n) + '">'; });
  dl.innerHTML = html;
  draw(); out();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
