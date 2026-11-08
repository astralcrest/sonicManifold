(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, KEY = 'sm_chorus', MAXM = 5;
var cv = $('cv'), box = $('map'), D = null, map = null, mine = [], store = [], cur = -1, dx = 0, dy = 0, tx = 0, ty = 0, raf = 0, sc = null;
var FAINT = P.mix(PAL.mint, PAL.night, 0.65);

function today() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
function load() {
  var o = null;
  try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  var N = D.n.length;
  if (!o || o.day !== today() || !Array.isArray(o.picks)) { o = { day: today(), picks: [] }; save(o); }
  return o.picks.filter(function (p) { return Array.isArray(p) && p[0] >= 0 && p[0] < N && p[0] % 1 === 0; });
}
function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
function hands() {
  var hs = [], last = null;
  store.forEach(function (p) { if (last === null || p[1] !== last) { hs.push([]); last = p[1]; } hs[hs.length - 1].push(p[0]); });
  return hs;
}
function allPts() { return store.map(function (p) { return p[0]; }).concat(mine); }

function target() {
  var a = allPts(), W = map.W;
  if (!a.length) { tx = 0; ty = 0; return; }
  var mx = 0, my = 0;
  a.forEach(function (i) { mx += map.X(i); my += map.Y(i); });
  mx /= a.length; my /= a.length;
  var lim = 0.15 * W;
  tx = Math.max(-lim, Math.min(lim, (W / 2 - mx) * 0.35));
  ty = Math.max(-lim, Math.min(lim, (map.H / 2 - my) * 0.35));
}
function X(i) { return map.X(i) + dx; }
function Y(i) { return map.Y(i) + dy; }

function chip(i, text, col) {
  var g = map.g, x = X(i) + 12, y = Y(i) - 14;
  g.save(); g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  var w = g.measureText(text).width + 12;
  if (x + w > map.W - 2) x = X(i) - 12 - w; if (y < 11) y = Y(i) + 16; if (x < 2) x = 2;
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = PAL.night; g.fillRect(x, y - 11, w, 22); g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(x + 0.5, y - 10.5, w - 1, 21);
  g.fillStyle = col; g.fillText(text, x + 6, y + 0.5); g.restore();
}
function pts(list) { return list.map(function (i) { return [X(i), Y(i)]; }); }

function draw() {
  if (!map) return;
  map.begin();
  var g = map.g;
  if (dx > 0.5 || dx < -0.5 || dy > 0.5 || dy < -0.5) {
    if (!sc) sc = document.createElement('canvas');
    sc.width = cv.width; sc.height = cv.height;
    sc.getContext('2d').drawImage(cv, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = PAL.night; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(sc, Math.round(dx * map.dpr), Math.round(dy * map.dpr));
    g.setTransform(map.dpr, 0, 0, map.dpr, 0, 0);
  }
  var small = map.W < 500, r = small ? 6 : 8, k;
  hands().forEach(function (h) { if (h.length > 1) P.ribbon(g, pts(h), PAL.mint, PAL.mint, 1.5, 0.15); });
  hands().forEach(function (h) { h.forEach(function (i) { P.glyph(g, 'star', X(i), Y(i), r * 0.8, FAINT); }); });
  if (mine.length > 1) P.ribbon(g, pts(mine), PAL.mint, PAL.mint, 2, 0.95);
  mine.forEach(function (i) { P.glyph(g, 'star', X(i), Y(i), r * 1.15, PAL.mint); });
  if (cur >= 0) WK.pulse(g, X(cur), Y(cur), PAL.mint, r * 1.8);
  if (mine.length) { var l = mine[mine.length - 1]; chip(l, D.n[l].length > 24 ? D.n[l].slice(0, 23) + '…' : D.n[l], PAL.mint); }
}

function drift() {
  cancelAnimationFrame(raf);
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (rm) { dx = tx; dy = ty; draw(); return; }
  (function step() {
    dx += (tx - dx) * 0.04; dy += (ty - dy) * 0.04;
    if (Math.abs(tx - dx) < 0.3 && Math.abs(ty - dy) < 0.3) { dx = tx; dy = ty; draw(); return; }
    draw(); raf = requestAnimationFrame(step);
  })();
}

function ui() {
  var hs = hands(), seen = {};
  store.forEach(function (p) { seen[p[0]] = 1; });
  var m = Object.keys(seen).length;
  $('big').textContent = mine.length;
  $('add').disabled = !mine.length; $('redo').disabled = !mine.length;
  $('count').textContent = hs.length ? hs.length + (hs.length === 1 ? ' hand' : ' hands') + ' tonight, ' + m + (m === 1 ? ' artist' : ' artists') : 'you are the first hand tonight.';
  $('say').textContent = mine.length ? (mine.length < MAXM ? 'tap up to ' + (MAXM - mine.length) + ' more, or add your hand to the room.' : 'five marks. a sixth tap replaces your oldest.') : (hs.length ? 'the faint stars are the room so far. tap an artist to add yours.' : 'you are the first hand tonight.');
  var all = allPts(), a = $('home');
  a.setAttribute('href', all.length ? '../print/chorus.html#pts=' + all.join(',') : '../print/chorus.html');
}

function onst(k, info) {
  if (info) { cur = info.i; $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[info.i] + WK.again(info) + '.'; WK.live(draw); }
  else { cur = -1; WK.still(); draw(); }
}
function tap(i) {
  if (mine.indexOf(i) < 0) { mine.push(i); if (mine.length > MAXM) mine.shift(); }
  target(); ui(); drift();
  WK.play([{ i: i, tag: 'tap' }], onst);
}
function pick(e) {
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 26 * 26, i, ex, ey, d;
  for (i = 0; i < D.xy.length; i++) { ex = X(i) - x; ey = Y(i) - y; d = ex * ex + ey * ey; if (d < bd) { bd = d; best = i; } }
  if (best >= 0) tap(best);
}

$('add').addEventListener('click', function () {
  if (!mine.length) return;
  var t = Date.now(), o = { day: today(), picks: store.concat(mine.map(function (i) { return [i, t]; })) };
  save(o); store = o.picks; mine = []; cur = -1; WK.stop(); WK.still();
  $('now').textContent = 'your hand is in the room. the next person can tap.';
  target(); ui(); drift();
});
$('redo').addEventListener('click', function () {
  mine = []; cur = -1; WK.stop(); WK.still();
  $('now').textContent = 'your marks are cleared. tap an artist to start again.';
  target(); ui(); drift();
});
cv.addEventListener('pointerdown', pick);
var rt = null;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (map) { map.resize(); target(); dx = tx; dy = ty; draw(); } }, 80); });

WK.boot().then(function (b) {
  D = b.D; map = new WK.Map(box, cv, D, b.M, { dim: 0.5, hover: false }); map.resize();
  store = load(); WK.pv(); target(); dx = tx; dy = ty; ui(); draw();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page to try again.'; });
})();
