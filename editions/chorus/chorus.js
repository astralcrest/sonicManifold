(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, KEY = 'sm_chorus', MAXM = 5;
var cv = $('cv'), box = $('map'), D = null, map = null, mine = [], store = [], cur = -1, nowI = null;
var ROOM = PAL.ink;

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

function X(i) { return map.X(i); }
function Y(i) { return map.Y(i); }

function chip(i, text, col) {
  // below the star, so the hover name tip (drawn above the pointer) never sits on it
  var g = map.g, x = X(i) + 12, y = Y(i) + 16;
  g.save(); g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  var w = g.measureText(text).width + 12;
  if (x + w > map.W - 2) x = X(i) - 12 - w; if (y > map.H - 11) y = Y(i) - 14; if (x < 2) x = 2;
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = PAL.night; g.fillRect(x, y - 11, w, 22); g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(x + 0.5, y - 10.5, w - 1, 21);
  g.fillStyle = col; g.fillText(text, x + 6, y + 0.5); g.restore();
}
function pts(list) { return list.map(function (i) { return [X(i), Y(i)]; }); }

function draw() {
  if (!map) return;
  map.begin();
  var g = map.g;
  var small = map.W < 500, r = small ? 6 : 8, hs = hands();
  // the room's picks are the question here, so the map steps back under them
  if (hs.length) { g.save(); g.globalAlpha = 0.4; g.fillStyle = PAL.night; g.fillRect(0, 0, map.W, map.H); g.restore(); }
  hs.forEach(function (h) { if (h.length > 1) P.ribbon(g, pts(h), ROOM, ROOM, 1.25, 0.5); });
  hs.forEach(function (h) { h.forEach(function (i) { P.glyph(g, 'star', X(i), Y(i), r, ROOM); }); });
  if (mine.length > 1) P.ribbon(g, pts(mine), PAL.mint, PAL.mint, 2, 0.95);
  mine.forEach(function (i) { P.glyph(g, 'star', X(i), Y(i), r * 1.15, PAL.mint); });
  if (cur >= 0) WK.pulse(g, X(cur), Y(cur), PAL.mint, r * 1.8);
  if (mine.length) { var l = mine[mine.length - 1]; chip(l, D.n[l].length > 24 ? D.n[l].slice(0, 23) + '…' : D.n[l], PAL.mint); }
}

function ui() {
  var hs = hands(), seen = {};
  store.forEach(function (p) { seen[p[0]] = 1; });
  var m = Object.keys(seen).length;
  $('big').textContent = mine.length;
  $('add').disabled = !mine.length; $('redo').disabled = !mine.length;
  $('count').textContent = hs.length ? hs.length + (hs.length === 1 ? ' set' : ' sets') + ' on this screen tonight, ' + m + (m === 1 ? ' artist' : ' artists') : '';
  $('say').textContent = mine.length ? (mine.length < MAXM ? 'tap up to ' + (MAXM - mine.length) + ' more, or add your marks.' : 'five marks. a sixth tap replaces your oldest.') : (hs.length ? 'the white stars are earlier sets on this screen. tap an artist to add yours.' : 'no sets on this screen yet tonight.');
  var all = allPts(), a = $('home');
  a.setAttribute('href', all.length ? '../print/chorus.html#pts=' + all.join(',') : '../print/chorus.html');
}

function nowText() {
  var s = nowI.title + ' by ' + D.n[nowI.i];
  $('now').textContent = WK.sound() ? 'hearing ' + s + WK.again(nowI) + '.' : 'sound is off: ' + s + '. turn sound on at the top.';
}
function onst(k, info) {
  if (info) { cur = info.i; nowI = info; nowText(); WK.live(draw); }
  else { cur = -1; nowI = null; WK.still(); draw(); }
}
function tap(i) {
  if (mine.indexOf(i) < 0) { mine.push(i); if (mine.length > MAXM) mine.shift(); }
  ui(); draw();
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
  $('now').textContent = 'your marks are saved on this screen for tonight. tap an artist to start a new set.';
  ui(); draw();
});
$('redo').addEventListener('click', function () {
  mine = []; cur = -1; WK.stop(); WK.still();
  $('now').textContent = 'your marks are cleared. tap an artist to start again.';
  ui(); draw();
});
cv.addEventListener('pointerdown', pick);
$('nm').addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' || !D) return;
  e.preventDefault();
  var v = this.value.trim().toLowerCase(), i;
  for (i = 0; i < D.n.length; i++) if (D.n[i].toLowerCase() === v) { this.value = ''; tap(i); return; }
  $('now').textContent = v ? 'that name is not on my map. pick one from the list.' : 'type an artist, then press enter.';
});
// no play button here: a tap on the map plays, so the strip's play button must never pick up "start over"
WK.primary('#none');
$('wk-snd').addEventListener('click', function () { if (nowI) nowText(); });
var rt = null;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (map) { map.resize(); draw(); } }, 80); });

WK.boot().then(function (b) {
  D = b.D; map = new WK.Map(box, cv, D, b.M, { dim: 0.5 }); map.resize();
  WK.famKey($('fams'), D, D.fam.map(function (_, f) { return D.f.indexOf(f); }));
  $('dl').innerHTML = D.n.map(function (n) { return '<option value="' + WK.esc(n) + '">'; }).join('');
  store = load(); WK.pv(); ui(); draw();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page to try again.'; });
})();
