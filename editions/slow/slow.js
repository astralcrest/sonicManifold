(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, FIT, LOOP, MAP, PV, SONGS = [], VIS = null;
var RUNS = 40, STEPSN = 40, PICK = 12, STAY = 30;
var S = { on: false, k: -1, t0: 0, last: 0, listen: 0, credited: false, stays: 0, tick: null, idle: null, N: { visited: 0, withPv: 0, never: 0 } };
var AU = new Audio(); AU.volume = 0.3; AU.preload = 'none';

function dist(a, b) { var dx = D.xy[a][0] - D.xy[b][0], dy = D.xy[a][1] - D.xy[b][1]; return Math.sqrt(dx * dx + dy * dy); }
function startAt(u) { u *= M.tot; var lo = 0, hi = M.N - 1; while (lo < hi) { var m = (lo + hi) >> 1; if (M.cum[m] < u) lo = m + 1; else hi = m; } return lo; }

function choose() {
  var g = LOOP.rng(20261106), K = FIT.queue.K, vis = new Uint8Array(M.N), r, i, j, p;
  for (r = 0; r < RUNS; r++) {
    p = LOOP.walk(M, startAt(g()), K, 7000 + r, STEPSN).path;
    for (j = 0; j < p.length; j++) vis[p[j]] = 1;
  }
  var V = [], cand = [];
  for (i = 0; i < M.N; i++) { if (vis[i]) V.push(i); }
  for (i = 0; i < M.N; i++) {
    if (vis[i]) continue;
    S.N.never++;
    if (!PV[i]) continue;
    S.N.withPv++;
    var best;
    var near = V[0]; best = 1e9;
    for (j = 0; j < V.length; j++) { var dd = dist(i, V[j]); if (dd < best) { best = dd; near = V[j]; } }
    cand.push({ i: i, d: best, near: near });
  }
  S.N.visited = V.length;
  cand.sort(function (a, b) { return b.d - a.d || a.i - b.i; });
  VIS = V;
  SONGS = cand.slice(0, PICK);
  // listen order: shuffled so the farthest is not always first
  for (i = SONGS.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); var t = SONGS[i]; SONGS[i] = SONGS[j]; SONGS[j] = t; }
}

function name(i) { return D.n[i]; }

function draw() {
  MAP.begin();
  var g = MAP.g;
  g.fillStyle = 'rgba(6,1,15,0.62)'; g.fillRect(0, 0, MAP.W, MAP.H);
  g.fillStyle = C.violet || '#8b6fd6'; g.globalAlpha = 0.5;
  for (var j = 0; j < VIS.length; j++) g.fillRect(MAP.X(VIS[j]) - 1.5, MAP.Y(VIS[j]) - 1.5, 3, 3);
  g.globalAlpha = 1;
  var cur = S.on ? SONGS[S.k] : null;
  SONGS.forEach(function (s) {
    var on = cur && cur.i === s.i;
    g.fillStyle = '#bcd3ff'; var z = on ? 11 : 8;
    g.fillRect(MAP.X(s.i) - z / 2, MAP.Y(s.i) - z / 2, z, z);
  });
  if (cur) {
    g.strokeStyle = '#bcd3ff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(MAP.X(cur.i), MAP.Y(cur.i)); g.lineTo(MAP.X(cur.near), MAP.Y(cur.near)); g.stroke();
    g.fillStyle = C.violet || '#8b6fd6'; g.fillRect(MAP.X(cur.near) - 3, MAP.Y(cur.near) - 3, 6, 6);
    MAP.ring(cur.i, '#bcd3ff', 24);
    MAP.tag(cur.i, name(cur.i), C.ink, C.night);
  }
}

function drawStays() {
  var el = $('stays'), h = '';
  for (var i = 0; i < S.stays; i++) h += '<i></i>';
  el.innerHTML = h;
  el.setAttribute('aria-label', S.stays + ' stays past thirty seconds tonight');
  $('n').textContent = S.stays;
}

function show() {
  var s = S.on ? SONGS[S.k] : null;
  $('play').textContent = S.on ? 'stop' : 'play';
  $('play').classList.toggle('go', !S.on);
  $('play').setAttribute('aria-pressed', S.on ? 'true' : 'false');
  $('who').textContent = s ? name(s.i) : '';
  $('dline').innerHTML = s ? 'nearest run artist is <b>' + Math.round(s.d) + '</b> away on a map 1000 wide' : '';
  $('slot').textContent = s ? 'song ' + (S.k + 1) + ' of ' + SONGS.length : '';
  if (!s) $('bar').style.width = '0';
  draw();
}

function playK(k) {
  S.k = k % SONGS.length; S.t0 = performance.now();
  var s = SONGS[S.k];
  AU.src = PV[s.i][1];
  var pr = AU.play();
  if (pr && pr.catch) pr.catch(function () { $('msg').textContent = 'the clip did not start. tap play again.'; stop(); });
  show();
}
function start() {
  if (S.on) return;
  S.on = true; S.last = performance.now(); $('msg').textContent = '';
  playK(S.k < 0 ? 0 : S.k);
  S.tick = setInterval(step, 250);
}
function stop() {
  try { AU.pause(); } catch (e) {}
  S.on = false; S.listen = 0; clearInterval(S.tick); S.tick = null;
  show();
}
function step() {
  var now = performance.now(), dt = (now - S.last) / 1000; S.last = now;
  if (!S.on) return;
  S.listen += dt;
  if (!S.credited && S.listen >= STAY) { S.credited = true; S.stays++; drawStays(); }
  var el = (now - S.t0) / 1000;
  $('bar').style.width = Math.min(100, el / STAY * 100) + '%';
  if (el >= STAY) playK(S.k + 1);
}
AU.addEventListener('ended', function () { if (S.on) playK(S.k + 1); });

function leave() { S.listen = 0; S.credited = false; $('msg').textContent = 'next listener. the count restarts at zero seconds.'; }
function reset() { stop(); S.stays = 0; S.credited = false; S.listen = 0; S.k = -1; $('msg').textContent = ''; drawStays(); show(); }
function bump() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.on || S.stays) reset(); }, 120000); }
['pointerdown', 'keydown'].forEach(function (e) { document.addEventListener(e, bump, true); });

$('play').addEventListener('click', function () { if (S.on) stop(); else start(); });
$('leave').addEventListener('click', leave);
$('reset').addEventListener('click', reset);
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; FIT = a[0].FIT; LOOP = a[0].LOOP; PV = a[1];
  MAP = new WK.Map($('map'), $('cv'), D, M); MAP.resize();
  choose();
  var dm = SONGS.map(function (s) { return s.d; });
  $('what').textContent = 'what plays: 30 s preview clips from the public catalog, one at a time, only after a tap, from the ' + SONGS.length + ' artists farthest from anything the fitted queue reached in ' + RUNS + ' runs. never my own album here.';
  $('toy').textContent = 'a toy. data: ' + RUNS + ' runs of ' + STEPSN + ' steps of the fitted queue on my sound map (' + D.n.length + ' artists, ' + S.N.visited + ' reached, ' + S.N.never + ' never); the ' + SONGS.length + ' songs are the unreached artists with a preview, farthest first (' + Math.round(Math.min.apply(null, dm)) + ' to ' + Math.round(Math.max.apply(null, dm)) + ' on a map 1000 wide).';
  drawStays(); show(); bump();
  window.__slow = { songs: SONGS.map(function (s) { return [name(s.i), Math.round(s.d)]; }), N: S.N };
}).catch(function () { $('msg').textContent = 'the data did not load. reload the page.'; });
})();
