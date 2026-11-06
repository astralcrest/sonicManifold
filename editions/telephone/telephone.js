(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP, PV = null, ADJ = null;
var KEY = 'sm_tel_v1', LIMIT = 10;
var S = { chain: [], more: false, cands: [] };

function load() {
  try { var j = JSON.parse(localStorage.getItem(KEY)); if (j && j.c && j.c.length && j.c.every(function (i) { return i >= 0 && i < M.N; })) return j.c; } catch (e) {}
  return null;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify({ c: S.chain })); } catch (e) {} }

function srt(c) { return D.nn[c].slice().sort(function (a, b) { return LOOP.dist(M, c, a) - LOOP.dist(M, c, b); }); }
function newStart() {
  var pool = M.order.slice(0, 300).filter(function (i) { return !PV || PV[i]; });
  return pool[Math.floor(Math.random() * pool.length)];
}
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
function toyEnd(start, n) {
  var cur = start, seen = {}, k, c, nx; seen[cur] = 1;
  for (k = 0; k < n; k++) { c = srt(cur); nx = -1; for (var j = 0; j < c.length; j++) if (!seen[c[j]]) { nx = c[j]; break; } if (nx < 0) break; cur = nx; seen[cur] = 1; }
  return cur;
}

function cands() {
  var cur = S.chain[S.chain.length - 1];
  return srt(cur).filter(function (i) { return S.chain.indexOf(i) < 0; }).slice(0, 6);
}

function pick(i) {
  if (S.chain.length - 1 >= LIMIT && !S.more) return;
  S.chain.push(i); save();
  WK.play([{ i: i, tag: 'a' }], function (k, info) { $('now').textContent = info ? 'hearing ' + info.title + ' (' + D.n[i] + ')' : 'the last song is ringed. pick one of the six that sound closest to it.'; });
  render();
}

function render() {
  var cur = S.chain[S.chain.length - 1], n = S.chain.length - 1;
  S.cands = cands();
  $('last').textContent = D.n[cur];
  var done = n >= LIMIT && !S.more;
  var box = $('cands'); box.innerHTML = '';
  box.style.display = done ? 'none' : '';
  S.cands.forEach(function (i, k) {
    var b = document.createElement('button'); b.type = 'button';
    b.style.setProperty('--acc', WK.FAMC[D.fam[D.f[i]]] || PAL.ice);
    b.innerHTML = '<span class="n">' + (k + 1) + '</span>' + WK.esc(D.n[i]);
    b.addEventListener('click', function () { pick(i); });
    box.appendChild(b);
  });
  $('after').classList.toggle('show', done);
  if (n < 1) { $('num').textContent = '-'; $('say').textContent = 'no hands yet. the chain starts at one song. pick the next.'; }
  else {
    var R = bfs(S.chain[0], cur), r = bfs(S.chain[0], toyEnd(S.chain[0], n));
    $('num').textContent = R < 0 ? '?' : R;
    $('numlab').textContent = 'steps from the start, after ' + n + (n === 1 ? ' hand' : ' hands');
    $('say').textContent = 'after ' + n + (n === 1 ? ' hand' : ' hands') + ' the chain ended ' + (R < 0 ? 'out of reach' : R + (R === 1 ? ' step' : ' steps')) + ' from its start; the toy rule alone ended ' + (r < 0 ? 'out of reach' : r) + '.';
  }
  draw();
}

var BOX = [];
function tag(i, text, col) {
  var g = MAP.g, w, h = 20, x, y, t, k, hit;
  g.save(); g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  w = g.measureText(text).width + 10; x = Math.round(MAP.X(i) + 12); y = Math.round(MAP.Y(i) - 12);
  if (x + w > MAP.W - 2) x = Math.round(MAP.X(i) - 12 - w); if (y < h / 2 + 1) y = Math.round(MAP.Y(i) + 14);
  for (t = 0; t < 3; t++) {
    hit = BOX.some(function (b) { return x < b[0] + b[2] && x + w > b[0] && y - h / 2 < b[1] + h / 2 && y + h / 2 > b[1] - h / 2; });
    if (!hit) break; y += h;
  }
  BOX.push([x, y, w]);
  g.fillStyle = PAL.night; g.fillRect(x, y - h / 2, w, h); g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(x + 0.5, y - h / 2 + 0.5, w - 1, h - 1);
  g.fillStyle = col; g.fillText(text, x + 5, y + 0.5); g.restore();
}
function draw() {
  MAP.begin(); BOX = [];
  var g = MAP.g, ch = S.chain, cur = ch[ch.length - 1], X = function (i) { return MAP.X(i); }, Y = function (i) { return MAP.Y(i); };
  S.cands.forEach(function (i) { P.ribbon(g, [[X(cur), Y(cur)], [X(i), Y(i)]], PAL.ice, PAL.ice, 1, 0.5); });
  if (ch.length > 1) { MAP.ribbon(ch, ch.length, PAL.ice, PAL.ink, MAP.W < 500 ? 2.6 : 3.4); MAP.stops(ch, ch.length, PAL.ice, PAL.ink, 4, 'dot'); }
  S.cands.forEach(function (i, k) { P.peb(g, i, X(i), Y(i), 9, WK.FAMC[D.fam[D.f[i]]] || PAL.ice); tag(i, String(k + 1), PAL.ice); });
  P.peb(g, ch[0], X(ch[0]), Y(ch[0]), 8, PAL.ink); tag(ch[0], 'start', '#9a90b8');
  P.peb(g, cur, X(cur), Y(cur), 9, PAL.ink); P.rings(g, X(cur), Y(cur), PAL.ink, 20);
}

function fresh() { S.chain = [newStart()]; S.more = false; save(); render(); }

$('nw').addEventListener('click', fresh);
$('kg').addEventListener('click', function () { S.more = true; render(); });
$('pc').addEventListener('click', function () {
  WK.play(S.chain.map(function (i) { return { i: i, tag: 'a' }; }), function (k, info) { $('now').textContent = info ? 'link ' + (k + 1) + ': ' + info.title + ' (' + D.n[info.i] + ')' : 'the last song is ringed. pick one of the six that sound closest to it.'; });
});
addEventListener('keydown', function (e) {
  var k = parseInt(e.key, 10); if (!(k >= 1 && k <= 6) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (S.cands[k - 1] !== undefined && $('cands').style.display !== 'none') pick(S.cands[k - 1]);
});
$('cv').addEventListener('click', function (e) {
  var b = this.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, best = -1, bd = 32;
  S.cands.forEach(function (i) { var d = Math.hypot(MAP.X(i) - x, MAP.Y(i) - y); if (d < bd) { bd = d; best = i; } });
  if (best >= 0 && $('cands').style.display !== 'none') pick(best);
});
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; LOOP = a[0].LOOP; PV = a[1];
  MAP = new WK.Map($('map'), $('cv'), D, M, { dim: 0.6 }); MAP.resize();
  var c = load(); if (c) { S.chain = c; render(); } else fresh();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
