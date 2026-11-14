(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, MAP, cv = $('cv'), EX = {}, IDX = {}, FN = [];
var S = { picks: [], mark: null, near: [], cur: null, k: -1, k0: 0, miss: [] };
var IDLE = 'sound: tap any shape or name to hear it, only when sound is on.';
var CH = [], HIT = 20;

function fam(i) { return D.fam[D.f[i]]; }
function fc(i) { return WK.FAMC[fam(i)] || '#9a90b8'; }
function fold(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
// exact names only (case and accents aside): a part of a name never places anyone
function find(q) {
  var f = fold(q); if (!f) return -1;
  if (EX[q.trim()] != null) return EX[q.trim()];
  return IDX[f] != null ? IDX[f] : -1;
}
function partial(q) { var f = fold(q); for (var i = 0; i < FN.length; i++) if (FN[i].indexOf(f) >= 0) return true; return false; }
function flag(k, why) {
  var a = $('a' + k), m = $('m' + k);
  if (why) a.setAttribute('aria-invalid', 'true'); else a.removeAttribute('aria-invalid');
  m.textContent = why || ''; m.hidden = !why;
}
function place(hear) {
  var seen = {}, picks = [], k, miss = [], v, i;
  for (k = 0; k < 5; k++) {
    v = $('a' + k).value; if (!v.trim()) { flag(k, ''); continue; }
    i = find(v);
    if (i < 0) { miss.push(v.trim()); flag(k, partial(v) ? 'pick the full name from the list' : 'not on my map'); continue; }
    flag(k, '');
    if (!seen[i]) { seen[i] = 1; picks.push(i); }
  }
  S.picks = picks; S.miss = miss; S.mark = null; S.near = []; S.k = -1; S.cur = null;
  if (picks.length) {
    var mx = 0, my = 0, m = [0, 0, 0], n = picks.length;
    picks.forEach(function (i) { mx += D.xy[i][0]; my += D.xy[i][1]; for (var c = 0; c < 3; c++) m[c] += D.p[i][c] / n; });
    mx /= n; my /= n; S.mark = [mx, my];
    // the ring is drawn at the flat mean, but nearness is measured in the 3D sound map: the flat map scrambles neighbors
    var d = D.p.map(function (p, i) { return [(p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1]) + (p[2] - m[2]) * (p[2] - m[2]), i]; });
    d.sort(function (a, b) { return a[0] - b[0]; });
    S.near = d.slice(0, 10).map(function (x) { return x[1]; });
  }
  WK.stop(); WK.still(); draw(); out(); hearLabel();
  if (hear && S.near.length) walkFrom(0);
  else if (hear && !miss.length) { $('a0').closest('fieldset').scrollIntoView({ block: 'nearest' }); $('a0').focus({ preventScroll: true }); }
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
  if (S.cur && S.k < 0) { P.glyph(MAP.g, 'dot', MAP.X(S.cur.i), MAP.Y(S.cur.i), 7, S.cur.col); WK.pulse(MAP.g, MAP.X(S.cur.i), MAP.Y(S.cur.i), S.cur.col, 14); MAP.tag(S.cur.i, D.n[S.cur.i], S.cur.col); }
}
// a name chip like MAP.tag. lay() hangs it off a point at distance d, trying the angle a first and then turning
// away from it until the chip sits inside the canvas and clear of every box already laid (else the least covered spot)
var TF = '600 12px "IBM Plex Mono", monospace';
function box(x, y, w, f, text) {
  var co = Math.cos(f), si = Math.sin(f), bx, by;
  if (Math.abs(si) > 0.8) { bx = Math.max(2, Math.min(MAP.W - w - 2, x - w / 2)); by = si > 0 ? y : y - 22; } else { bx = co >= 0 ? x : x - w; by = y - 11; }
  bx = Math.round(bx); by = Math.round(by);
  return [bx, by, bx + w, by + 22, text];
}
function lay(BX, ox, oy, d, a, text) {
  var g = MAP.g; g.save(); g.font = TF; var w = Math.ceil(g.measureText(text).width) + 12; g.restore();
  var W = MAP.W, H = MAP.H, k, j, f, t, o, best = null, bo = 1e9;
  for (k = 0; k < 19; k++) {
    f = a + (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.349 : 0);
    for (j = 0; j < 3; j++) {
      t = box(ox + (d + 12 * j) * Math.cos(f), oy + (d + 12 * j) * Math.sin(f), w, f, text);
      if (t[0] < 2 || t[2] > W - 2 || t[1] < 2 || t[3] > H - 2) continue;
      o = BX.reduce(function (s, b) { return s + Math.max(0, Math.min(t[2], b[2]) - Math.max(t[0], b[0]) + 2) * Math.max(0, Math.min(t[3], b[3]) - Math.max(t[1], b[1]) + 2); }, 0);
      if (o < bo) { bo = o; best = t; }
      if (!o) { k = 99; break; }
    }
  }
  if (!best) { t = box(ox, oy, w, a, text); best = [Math.max(2, Math.min(W - w - 2, t[0])), Math.max(2, Math.min(H - 24, t[1]))]; best = [best[0], best[1], best[0] + w, best[1] + 22, text]; }
  BX.push(best); return best;
}
// the playing stop's name goes in the clear corner farthest from the ring: the chips crowd everywhere near it
function corner(BX, cx, cy, text) {
  var g = MAP.g; g.save(); g.font = TF; var w = Math.ceil(g.measureText(text).width) + 12; g.restore();
  var W = MAP.W, H = MAP.H, cs = [[8, 8], [W - 8 - w, 8], [8, H - 30], [W - 8 - w, H - 30]].map(function (p) {
    return [Math.round(p[0]), Math.round(p[1]), Math.round(p[0] + w), Math.round(p[1] + 22), text];
  }).sort(function (a, b) { return Math.hypot(b[0] + w / 2 - cx, b[1] + 11 - cy) - Math.hypot(a[0] + w / 2 - cx, a[1] + 11 - cy); });
  for (var k = 0; k < cs.length; k++) { var t = cs[k]; if (BX.every(function (b) { return !(t[0] < b[2] + 2 && b[0] < t[2] + 2 && t[1] < b[3] + 2 && b[1] < t[3] + 2); })) return t; }
  return cs[0];
}
function tagDraw(t, fg) {
  var g = MAP.g; g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.setLineDash([]);
  g.font = TF; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = PAL.night; g.fillRect(t[0], t[1], t[2] - t[0], 22); g.strokeStyle = fg; g.lineWidth = 1; g.strokeRect(t[0] + 0.5, t[1] + 0.5, t[2] - t[0] - 1, 21);
  g.fillStyle = fg; g.fillText(t[4], t[0] + 6, t[1] + 11.5); g.restore();
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
// the ten sit only a few pixels apart on the flat map, so each gets a numbered chip on a circle around the ring,
// in the same turn order as the true spots, with a thin line back to where it really sits
function drawMark() {
  var g = MAP.g, small = MAP.W < 500, W = MAP.W, H = MAP.H, n = S.near.length;
  var mx = MAP.ox + S.mark[0] * MAP.scl, my = MAP.oy + S.mark[1] * MAP.scl;
  var R = small ? 64 : 84, cr = small ? 10 : 12, edge = cr + 6;
  var cx = Math.max(R + edge, Math.min(W - R - edge, mx)), cy = Math.max(R + edge, Math.min(H - R - edge, my));
  var tp = S.near.map(function (i) { return [MAP.X(i), MAP.Y(i)]; });
  // the ring shrinks when the ten are tighter than it, so their true spots stay visible around it
  var ds = tp.map(function (p) { return Math.hypot(p[0] - mx, p[1] - my); }).sort(function (a, b) { return a - b; });
  var r = Math.max(5, Math.min(small ? 13 : 17, ds[n >> 1] * 0.6));
  var TAU = 6.2832, mod = function (v) { return ((v % TAU) + TAU) % TAU; };
  var ord = tp.map(function (p, q) { return [Math.atan2(p[1] - cy, p[0] - cx), q]; }), slot;
  // near an edge the circle is pushed inward; if that puts the ring on the circle, the chips leave a gap around it
  var sm = Math.hypot(mx - cx, my - cy), cl = cr + r + 24, fm = Math.atan2(my - cy, mx - cx);
  var cosd = sm > 0.5 ? (R * R + sm * sm - cl * cl) / (2 * R * sm) : 2;
  if (cosd < 1) {
    var dl = Math.acos(Math.max(-1, cosd)), span = TAU - 2 * dl;
    ord.sort(function (a, b) { return mod(a[0] - fm) - mod(b[0] - fm); });
    slot = function (j) { return fm + dl + j * span / (n - 1); };
  } else {
    var st = TAU / n, sx = 0, sy = 0;
    ord.sort(function (a, b) { return a[0] - b[0]; });
    ord.forEach(function (o, j) { sx += Math.cos(o[0] - j * st); sy += Math.sin(o[0] - j * st); });
    var a0 = Math.atan2(sy, sx);
    slot = function (j) { return a0 + j * st; };
  }
  CH = [];
  ord.forEach(function (o, j) { var a = slot(j); CH[o[1]] = { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  var state = function (q) { return S.k < 0 ? 0 : q < S.k ? -1 : q === S.k ? 1 : 0; };

  g.save(); g.setLineDash([]); g.lineCap = 'round';
  S.near.forEach(function (i, q) {
    var c = CH[q], p = tp[q], s = state(q), L = Math.hypot(p[0] - c.x, p[1] - c.y) || 1;
    g.strokeStyle = s === 1 ? PAL.ice : fc(i); g.lineWidth = s === 1 ? 1.6 : 1; g.globalAlpha = s === 1 ? 1 : s < 0 ? 0.25 : 0.6;
    g.beginPath(); g.moveTo(c.x + (p[0] - c.x) * cr / L, c.y + (p[1] - c.y) * cr / L); g.lineTo(p[0], p[1]); g.stroke();
  });
  g.globalAlpha = 1; g.strokeStyle = PAL.ink; g.lineWidth = 2.5;
  g.beginPath(); g.arc(mx, my, r, 0, 6.2832); g.stroke();
  g.lineWidth = 1.5; g.beginPath();
  g.moveTo(mx - r - 16, my); g.lineTo(mx - r - 6, my); g.moveTo(mx + r + 6, my); g.lineTo(mx + r + 16, my);
  g.moveTo(mx, my - r - 16); g.lineTo(mx, my - r - 6); g.moveTo(mx, my + r + 6); g.lineTo(mx, my + r + 16);
  g.stroke(); g.restore();
  S.near.forEach(function (i, q) { P.peb(g, i, tp[q][0], tp[q][1], small ? 3 : 3.6, fc(i)); });
  S.picks.forEach(function (i) { P.glyph(g, 'dot', MAP.X(i), MAP.Y(i), small ? 6 : 8, PAL.ice); });
  if (S.k >= 0 && tp[S.k]) P.glyph(g, 'ring', tp[S.k][0], tp[S.k][1], 9, PAL.ice);

  // name tags steer clear of the chips, the ring and each other. a pick inside the circle gets its tag just outside it, with a line in
  var BX = CH.map(function (c) { return [c.x - cr - 2, c.y - cr - 2, c.x + cr + 2, c.y + cr + 2]; }).concat([[mx - r - 16, my - r - 16, mx + r + 16, my + r + 16]]);
  S.picks.forEach(function (i) { BX.push([MAP.X(i) - 6, MAP.Y(i) - 6, MAP.X(i) + 6, MAP.Y(i) + 6]); });
  var turn = function (x, y) { return Math.hypot(x - cx, y - cy) < 1 ? -1.5708 : Math.atan2(y - cy, x - cx); };
  var tags = S.picks.map(function (i) {
    var x = MAP.X(i), y = MAP.Y(i), inside = Math.hypot(x - cx, y - cy) < R + cr + 14;
    return { x: x, y: y, t: inside ? lay(BX, cx, cy, R + cr + 14, turn(x, y), D.n[i]) : lay(BX, x, y, 12, turn(x, y), D.n[i]) };
  });
  g.save(); g.strokeStyle = PAL.ice; g.lineWidth = 1; g.globalAlpha = 0.7;
  tags.forEach(function (o) {
    var t = o.t, ex = Math.max(t[0], Math.min(t[2], o.x)), ey = Math.max(t[1], Math.min(t[3], o.y));
    if (Math.hypot(ex - o.x, ey - o.y) > 14) { g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(ex, ey); g.stroke(); }
  });
  g.restore();

  g.save(); g.setLineDash([]); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 ' + (small ? 11 : 12) + 'px "IBM Plex Mono", monospace';
  S.near.forEach(function (i, q) {
    var c = CH[q], s = state(q);
    g.globalAlpha = s < 0 ? 0.4 : 1;
    g.fillStyle = fc(i); g.beginPath(); g.arc(c.x, c.y, cr, 0, 6.2832); g.fill();
    g.lineWidth = 1.5; g.strokeStyle = PAL.night; g.stroke();
    if (s === 1) { g.lineWidth = 2.5; g.strokeStyle = PAL.ink; g.beginPath(); g.arc(c.x, c.y, cr + 3, 0, 6.2832); g.stroke(); }
    g.fillStyle = PAL.night; g.fillText(String(q + 1), c.x, c.y + 0.5);
  });
  g.restore();
  tags.forEach(function (o) { tagDraw(o.t, PAL.ice); });
  if (S.k >= 0 && CH[S.k]) {
    var c = CH[S.k];
    WK.pulse(g, c.x, c.y, PAL.ice, cr + 3);
    tagDraw(corner(BX, cx, cy, 'now ' + (S.k + 1) + ': ' + D.n[S.near[S.k]]), PAL.ice);
  }
}
function chipAt(e) {
  if (!S.mark || !CH.length) return -1;
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = HIT * HIT;
  CH.forEach(function (c, q) { var d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y); if (d < bd) { bd = d; best = q; } });
  return best;
}
function out() {
  var ul = $('near'), fm = {}, html = '', ctl = ['clear', 'hear', 'next'];
  ctl.forEach(function (id) { $(id).hidden = !S.mark; });
  if (!S.mark) {
    $('num').innerHTML = '<span class="c">not placed yet</span>'; ul.innerHTML = '';
    $('say').textContent = S.miss.length ? 'no match: ' + S.miss.join(', ') + '. pick names from the list as you type.' : 'type one to five artists you like, then press place me.';
    return;
  }
  S.near.forEach(function (i, q) {
    fm[D.f[i]] = 1;
    html += '<li><button type="button" class="nb" data-i="' + i + '" aria-label="hear ' + WK.esc(D.n[i]) + '"><b class="q">' + (q + 1) + '</b><span class="sw" style="background:' + fc(i) + '"></span><span class="tx"><span class="nm">' + WK.esc(D.n[i]) + '</span><span class="fm">' + WK.esc(fam(i)) + '</span></span></button></li>';
  });
  ul.innerHTML = html; marks();
  $('num').innerHTML = '<span>' + Object.keys(fm).length + '</span>';
  $('say').textContent = S.picks.length + ' placed' + (S.miss.length ? '; no match: ' + S.miss.join(', ') : '') + '. the white ring is the middle of your artists on my map. the ten nearest to it are numbered, nearest first, and play one after another. tap one to jump there.';
}
function marks() {
  var bs = $('near').querySelectorAll('.nb'), q;
  for (q = 0; q < bs.length; q++) bs[q].classList.toggle('on', q === S.k);
}
function hearLabel() {
  var p = WK.playing(); $('hear').setAttribute('aria-pressed', p ? 'true' : 'false');
  $('hear').textContent = p ? 'stop the walk' : 'hear the ten nearest';
}

// these buttons do not start with play/hear, so the shared auto sound-on misses them
$('go').addEventListener('click', function () { WK.setSound(true); place(true); });
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') { WK.setSound(true); place(true); } });
for (var q = 0; q < 5; q++) {
  $('a' + q).addEventListener('change', function (e) { if (find(e.target.value) >= 0) place(false); });
  $('a' + q).addEventListener('input', function (e) { if (e.target.hasAttribute('aria-invalid')) flag(+e.target.id.slice(1), ''); });
}
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
  WK.setSound(true); walkFrom(S.k >= 0 ? (S.k + 1) % S.near.length : 0);
});
$('near').addEventListener('click', function (e) {
  var b = e.target.closest ? e.target.closest('.nb') : null; if (b) { WK.setSound(true); walkFrom(S.near.indexOf(+b.getAttribute('data-i'))); }
});
// a map tap plays on lift, and only if the finger barely moved, so a swipe that starts on the map just scrolls
var pend = null;
cv.addEventListener('pointerup', function (e) { var t = pend; pend = null; if (t && Math.abs(e.clientX - t.x) + Math.abs(e.clientY - t.y) < 8) jump(t.i); });
cv.addEventListener('pointercancel', function () { pend = null; });

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; MAP = new WK.Map($('map'), cv, D, b.M, { dim: 0.5, tap: function (i, e) { pend = { i: i, x: e.clientX, y: e.clientY }; } }); MAP.resize();
  // registered after the map's own listeners, so a chip wins over whatever dot lies under it
  var tip = $('map').querySelector('.wk-tip');
  var onChip = function (e) {
    var q = chipAt(e); if (q < 0) return;
    var i = S.near[q], r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.type === 'pointerdown') pend = { i: i, x: e.clientX, y: e.clientY };
    if (!tip) return;
    tip.innerHTML = '<b>' + (q + 1) + ' ' + WK.esc(D.n[i]) + '</b> <i style="background:' + fc(i) + '"></i>' + WK.esc(fam(i)) + ' · ' + D.pl[i] + ' plays';
    tip.hidden = false; var tw = tip.offsetWidth, lx = x + 12; if (lx + tw > MAP.W - 2) lx = x - 12 - tw;
    tip.style.left = Math.max(0, Math.min(MAP.W - tw, lx)) + 'px'; tip.style.top = Math.max(0, y - 34) + 'px';
  };
  cv.addEventListener('pointermove', onChip); cv.addEventListener('pointerdown', onChip);
  var dl = $('dl'), html = '';
  D.n.forEach(function (n, i) { var f = fold(n); if (EX[n] == null) EX[n] = i; if (IDX[f] == null) IDX[f] = i; FN.push(f); html += '<option value="' + WK.esc(n) + '">'; });
  dl.innerHTML = html;
  $('cnt').textContent = D.n.length.toLocaleString('en-US');
  WK.famKey($('fams'), D, D.fam.map(function (_, f) { return D.f.indexOf(f); }));
  WK.pv(); draw(); out(); hearLabel();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map.';
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
