(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv'), IDX = {}, PM = 1;
var S = { picks: [], mark: null, near: [], cur: null, k: -1, k0: 0, miss: 0 };
var IDLE = 'sound: tap any shape or name to hear it, only when sound is on.';

function fam(i) { return D.fam[D.f[i]]; }
function fc(i) { return WK.FAMC[fam(i)] || '#9a90b8'; }
function find(q) {
  q = q.trim().toLowerCase(); if (!q) return -1;
  if (IDX[q] != null) return IDX[q];
  for (var i = 0; i < D.n.length; i++) if (D.n[i].toLowerCase().indexOf(q) === 0) return i;
  return -1;
}
function place(hear) {
  var seen = {}, picks = [], k, miss = 0, v, i;
  for (k = 0; k < 5; k++) {
    v = $('a' + k).value; if (!v.trim()) continue;
    i = find(v);
    if (i < 0) { miss++; continue; }
    if (!seen[i]) { seen[i] = 1; picks.push(i); }
  }
  S.picks = picks; S.miss = miss; S.mark = null; S.near = []; S.k = -1; S.cur = null;
  if (picks.length) {
    var mx = 0, my = 0;
    picks.forEach(function (i) { mx += D.xy[i][0]; my += D.xy[i][1]; });
    mx /= picks.length; my /= picks.length; S.mark = [mx, my];
    var d = D.xy.map(function (p, i) { return [(p[0] - mx) * (p[0] - mx) + (p[1] - my) * (p[1] - my), i]; });
    d.sort(function (a, b) { return a[0] - b[0]; });
    S.near = d.slice(0, 10).map(function (x) { return x[1]; });
    PM = Math.log(1 + Math.max.apply(null, S.near.map(function (i) { return D.pl[i] || 0; })));
  }
  WK.stop(); WK.still(); draw(); out(); hearLabel();
  if (hear && S.near.length) walkFrom(0);
}
function walkFrom(k0) {
  if (!S.near.length) { $('now').textContent = 'place yourself first.'; return; }
  S.k0 = k0;
  WK.play(S.near.slice(k0).map(function (i) { return { i: i, tag: 'near' }; }), onst).then(function () {
    if (!WK.playing()) { $('now').textContent = 'no clip for ' + D.n[S.near[k0]] + ' or the ones after it.'; }
    hearLabel();
  });
}
function jump(i) {
  var k = S.near.indexOf(i);
  if (k >= 0) walkFrom(k); else WK.play([{ i: i, tag: 'tap' }], onst);
}
function draw() {
  MAP.begin();
  if (S.mark) drawMark();
  if (S.cur) { P.glyph(MAP.g, 'dot', MAP.X(S.cur.i), MAP.Y(S.cur.i), 7, S.cur.col); WK.pulse(MAP.g, MAP.X(S.cur.i), MAP.Y(S.cur.i), S.cur.col, 14); MAP.tag(S.cur.i, D.n[S.cur.i], S.cur.col); }
}
function onst(k, info) {
  if (info) {
    var tap = info.tag === 'tap', tot = S.near.length, kk = S.k0 + k;
    S.cur = { i: info.i, col: tap ? PAL.mint : PAL.ice }; S.k = tap ? -1 : kk;
    if (tap) $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[info.i] + ' (' + fam(info.i) + ').';
    else {
      var prev = kk > 0 ? fam(S.near[kk - 1]) : null, nx = kk + 1 < tot ? ', then ' + D.n[S.near[kk + 1]] : ', the last one';
      $('now').textContent = 'stop ' + (kk + 1) + ' of ' + tot + ': ' + D.n[info.i] + ' (' + fam(info.i) + (prev && prev !== fam(info.i) ? ', a new family' : '') + ')' + nx + '. hearing ' + info.title + WK.again(info) + '.';
    }
    WK.live(draw);
  } else { S.cur = null; S.k = -1; WK.still(); draw(); $('now').textContent = IDLE; }
  marks(); hearLabel();
}
function drawMark() {
  var g = MAP.g, small = MAP.W < 500, i, mx, my, r = small ? 13 : 17;
  mx = MAP.ox + S.mark[0] * MAP.scl; my = MAP.oy + S.mark[1] * MAP.scl;
  g.save(); g.lineWidth = 0.7; g.strokeStyle = PAL.ice; g.globalAlpha = 0.35;
  g.beginPath();
  S.near.forEach(function (i) { g.moveTo(mx, my); g.lineTo(MAP.X(i), MAP.Y(i)); });
  g.stroke(); g.restore();
  var pts = [[mx, my]].concat(S.near.map(function (i) { return [MAP.X(i), MAP.Y(i)]; }));
  if (S.k >= 0) {
    P.ribbon(g, pts.slice(S.k + 1), PAL.ice, PAL.ice, 1.2, 0.35, [4, 5]);
    P.ribbon(g, pts.slice(0, S.k + 2), PAL.violet, PAL.mint, small ? 2 : 2.6, 0.95);
  }
  S.near.forEach(function (i, q) {
    var w = Math.log(1 + (D.pl[i] || 0)) / (PM || 1), rr = (small ? 4 : 5.5) + (small ? 3 : 5) * w;
    P.peb(g, i, MAP.X(i), MAP.Y(i), rr, fc(i));
    if (S.k >= 0 && q < S.k) P.glyph(g, 'dot', MAP.X(i), MAP.Y(i), 4, PAL.night);
  });
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
  var ul = $('near'), fm = {}, html = '', ctl = ['clear', 'hear', 'next'];
  ctl.forEach(function (id) { $(id).hidden = !S.mark; });
  if (!S.mark) {
    $('num').innerHTML = '<span class="c">not placed yet</span>'; ul.innerHTML = '';
    $('say').textContent = S.miss ? 'no match yet. pick a name from the list as you type.' : 'type one to five artists you like, then press place me.';
    return;
  }
  S.near.forEach(function (i, q) {
    fm[D.f[i]] = 1;
    html += '<li><button type="button" class="nb" data-i="' + i + '" aria-label="hear ' + WK.esc(D.n[i]) + '"><b class="q">' + (q + 1) + '</b><span class="sw" style="background:' + fc(i) + '"></span><span class="nm">' + WK.esc(D.n[i]) + '</span><span class="fm">' + WK.esc(fam(i)) + '</span></button></li>';
  });
  ul.innerHTML = html; marks();
  $('num').innerHTML = '<span>' + Object.keys(fm).length + '</span>';
  $('say').textContent = S.picks.length + ' placed' + (S.miss ? ', ' + S.miss + ' with no match' : '') + '. the white ring is the middle of your artists on my map. the ten nearest to it are numbered, nearest first, and play one after another. tap one to jump there.';
}
function marks() {
  var bs = $('near').querySelectorAll('.nb'), q;
  for (q = 0; q < bs.length; q++) bs[q].classList.toggle('on', q === S.k);
}
function hearLabel() {
  var p = WK.playing(); $('hear').setAttribute('aria-pressed', p ? 'true' : 'false');
  $('hear').textContent = p ? 'stop the walk' : 'hear the ten nearest';
}

$('go').addEventListener('click', function () { place(true); });
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') place(true); });
for (var q = 0; q < 5; q++) $('a' + q).addEventListener('change', function (e) { if (IDX[e.target.value.trim().toLowerCase()] != null) place(false); });
$('clear').addEventListener('click', function () {
  for (var k = 0; k < 5; k++) $('a' + k).value = '';
  $('now').textContent = IDLE; place(false);
});
$('hear').addEventListener('click', function () {
  if (WK.playing()) { WK.stop(); return; }
  walkFrom(0);
});
$('next').addEventListener('click', function () {
  if (!S.near.length) return;
  walkFrom(S.k >= 0 ? (S.k + 1) % S.near.length : 0);
});
$('near').addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('.nb') : null; if (b) walkFrom(S.near.indexOf(+b.getAttribute('data-i')));
});

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; MAP = new WK.Map($('map'), cv, D, b.M, { dim: 0.5, tap: function (i) { jump(i); } }); MAP.resize();
  var dl = $('dl'), html = '';
  D.n.forEach(function (n, i) { IDX[n.toLowerCase()] = i; html += '<option value="' + WK.esc(n) + '">'; });
  dl.innerHTML = html;
  WK.pv(); draw(); out(); hearLabel();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
