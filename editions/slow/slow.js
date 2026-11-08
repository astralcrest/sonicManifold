(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, FIT, LOOP, MAP, PV, TW, SONGS = [], VIS = null;
var RUNS = 40, STEPSN = 40, PICK = 12, STAY = 30;
var S = { on: false, k: -1, t0: 0, last: 0, listen: 0, el: 0, sound: false, res: [], credited: false, stays: 0, tick: null, idle: null, N: { visited: 0, withPv: 0, never: 0 } };
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
function fam(i) { return D.fam[D.f[i]]; }
function fcol(i) { return WK.FAMC[fam(i)] || C.mute; }
function say(t) { $('now').textContent = t; }

function draw() {
  MAP.begin();
  var g = MAP.g, P = WK.P, PAL = P.PAL, j, k;
  g.save(); g.globalAlpha = 0.5;
  for (j = 0; j < VIS.length; j++) P.peb(g, VIS[j], MAP.X(VIS[j]), MAP.Y(VIS[j]), 2 + 3.2 * TW[VIS[j]], PAL.violet);
  g.restore();
  var cur = S.on ? SONGS[S.k] : null, upto = S.k < 0 ? -1 : S.k;
  var done = SONGS.slice(0, upto + 1).map(function (s) { return [MAP.X(s.i), MAP.Y(s.i)]; });
  var rest = SONGS.slice(Math.max(0, upto)).map(function (s) { return [MAP.X(s.i), MAP.Y(s.i)]; });
  if (rest.length > 1) P.ribbon(g, rest, PAL.ice, PAL.ice, 1.2, 0.22, [3, 5]);
  if (done.length > 1) P.ribbon(g, done, PAL.ice, PAL.ink, 2.4, 0.8);
  SONGS.forEach(function (s, j) {
    var on = cur && cur.i === s.i, r = (on ? 8 : 6) + 3 * TW[s.i];
    P.peb(g, s.i, MAP.X(s.i), MAP.Y(s.i), r + 1.6, PAL.ink); P.peb(g, s.i, MAP.X(s.i), MAP.Y(s.i), r, fcol(s.i), false);
    if (S.res[j] === 'ok') P.glyph(g, 'dot', MAP.X(s.i), MAP.Y(s.i) - r - 7, 4, PAL.mint);
    else if (S.res[j] === 'lf') P.glyph(g, 'dot', MAP.X(s.i), MAP.Y(s.i) - r - 7, 4, PAL.rose);
  });
  if (cur) {
    P.ribbon(g, [[MAP.X(cur.i), MAP.Y(cur.i)], [MAP.X(cur.near), MAP.Y(cur.near)]], PAL.ink, PAL.violet, 2, 0.95);
    P.glyph(g, 'ring', MAP.X(cur.near), MAP.Y(cur.near), 6, PAL.violet);
    P.rings(g, MAP.X(cur.i), MAP.Y(cur.i), PAL.ink, 20);
    MAP.tag(cur.i, (S.k + 1) + ' of ' + SONGS.length + ': ' + name(cur.i), C.ink, C.night); MAP.tag(cur.near, 'nearest it reached', PAL.violet, C.night);
    if (S.sound) WK.pulse(g, MAP.X(cur.i), MAP.Y(cur.i), PAL.ink, 20);
  }
}

function drawStays() {
  var el = $('stays'), h = '', n = 0, k;
  for (k = 0; k < SONGS.length; k++) { var c = S.res[k] === 'ok' ? 'ok' : S.res[k] === 'lf' ? 'lf' : ''; if (S.on && k === S.k) c += ' cur'; if (S.res[k] === 'ok') n++; h += '<i class="' + c + '" data-k="' + k + '" title="song ' + (k + 1) + ': ' + esc(name(SONGS[k].i)) + '"></i>'; }
  el.innerHTML = h;
  S.stays = n;
  el.setAttribute('aria-label', n + ' of ' + SONGS.length + ' songs stayed with past thirty seconds tonight');
  $('n').innerHTML = (n || S.res.some(Boolean)) ? n + ' of ' + SONGS.length : '<span class="c">no stays yet</span>';
}
function esc(s) { return WK.esc(s); }

function nowLine(k) {
  var s = SONGS[k], t = WK.title(s.i), prev = k > 0 ? SONGS[k - 1] : null, ch = prev && fam(prev.i) !== fam(s.i);
  return 'song ' + (k + 1) + ' of ' + SONGS.length + ': ' + (t ? '“' + t + '” by ' : '') + name(s.i) + ', ' + fam(s.i) + (ch ? ' (family changed from ' + fam(prev.i) + ')' : '') + '.' + (prev && prev.i === s.i ? ' same artist as the last one.' : '');
}
function show() {
  var s = S.k >= 0 ? SONGS[S.k] : null;
  $('play').textContent = S.on ? 'stop' : (S.k < 0 ? 'play the first one' : 'play');
  $('play').classList.toggle('go', !S.on);
  $('play').setAttribute('aria-pressed', S.on ? 'true' : 'false');
  $('who').textContent = s ? name(s.i) : '';
  $('dline').innerHTML = s ? 'family <b>' + esc(fam(s.i)) + '</b>. the closest auto-play ever came: <b>' + esc(name(s.near)) + '</b>, the violet ring, <b>' + Math.round(s.d) + '</b> away on a map 1000 wide.' : '';
  $('slot').textContent = s ? 'song ' + (S.k + 1) + ' of ' + SONGS.length + '. stay 30 s and the dot turns mint. tap a dot or a bright shape to jump.' : '';
  if (!s) $('bar').style.width = '0';
  drawStays(); draw();
}

function playK(k) {
  S.k = k; S.t0 = performance.now(); S.el = 0; S.credited = false; S.listen = 0;
  var s = SONGS[S.k];
  AU.src = PV[s.i][1];
  var pr = AU.play();
  if (pr && pr.catch) pr.catch(function () { say('the clip did not start. tap play again.'); stop(); });
  say(nowLine(k) + (WK.sound() ? '' : ' sound is off, so the clock waits: tap the sound chip at the top.'));
  show();
}
function advance() {
  if (S.k + 1 >= SONGS.length) { stop(); say('that was all ' + SONGS.length + '. you stayed with ' + S.stays + '. press play to hear them again, or start over.'); S.k = -1; show(); return; }
  playK(S.k + 1);
}
function start() {
  if (S.on) return;
  S.on = true; S.last = performance.now();
  S.sound = WK.sound();
  playK(S.k < 0 ? 0 : S.k);
  S.tick = setInterval(step, 250); WK.live(draw);
}
function stop() {
  try { AU.pause(); } catch (e) {}
  S.on = false; clearInterval(S.tick); S.tick = null; WK.still();
  show();
}
function step() {
  var now = performance.now(), dt = (now - S.last) / 1000; S.last = now;
  if (!S.on) return;
  var snd = WK.sound();
  if (snd !== S.sound) { S.sound = snd; if (snd) say(nowLine(S.k)); }
  if (!snd) { if (!AU.paused) AU.pause(); return; }
  if (AU.paused && !AU.ended) { var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {}); }
  S.el += dt;
  if (!S.credited && S.el >= STAY) { S.credited = true; S.res[S.k] = 'ok'; drawStays(); }
  $('bar').style.width = Math.min(100, S.el / STAY * 100) + '%';
  if (S.el >= STAY) advance();
}
AU.addEventListener('ended', function () { if (S.on && WK.sound()) advance(); });

function leave() {
  if (S.k >= 0 && S.res[S.k] !== 'ok') S.res[S.k] = 'lf';
  if (S.on) advance(); else if (S.k + 1 < SONGS.length) { S.k = S.k + 1; start(); } else { S.k = -1; start(); }
}
function jumpK(k) {
  if (k < 0 || k >= SONGS.length) return;
  if (S.on && S.k >= 0 && S.res[S.k] !== 'ok' && k !== S.k) S.res[S.k] = 'lf';
  S.k = k; if (S.on) playK(k); else start();
}
function tapAt(i) {
  var k = -1; SONGS.forEach(function (s, j) { if (s.i === i) k = j; });
  if (k < 0) { say(VIS.indexOf(i) >= 0 ? D.n[i] + ' (' + fam(i) + '): auto-play did reach this one. the bright shapes are the twelve it never did.' : D.n[i] + ' (' + fam(i) + ') has no clip here. tap a bright shape.'); return; }
  jumpK(k);
}
function reset() { stop(); S.res = []; S.credited = false; S.listen = 0; S.el = 0; S.k = -1; say('sound is off until you tap the sound chip at the top. the stay clock counts only while you can hear it. on a keyboard: space plays or stops, n skips.'); show(); }
function bump() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.on || S.stays) reset(); }, 120000); }
['pointerdown', 'keydown'].forEach(function (e) { document.addEventListener(e, bump, true); });

$('play').addEventListener('click', function () { if (S.on) stop(); else start(); });
$('leave').addEventListener('click', leave);
$('reset').addEventListener('click', reset);
$('stays').addEventListener('click', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-k'); if (k != null) jumpK(+k); });
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select|button|summary/i.test(e.target.tagName || '')) return;
  if (e.key === ' ') { e.preventDefault(); if (S.on) stop(); else start(); } else if (e.key === 'n' || e.key === 'N') leave();
});
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; FIT = a[0].FIT; LOOP = a[0].LOOP; PV = a[1];
  TW = WK.P.weights(D.xy.length, D.pl);
  MAP = new WK.Map($('map'), $('cv'), D, M, { dim: 0.32, tap: tapAt }); MAP.resize();
  choose();
  var dm = SONGS.map(function (s) { return s.d; });
  $('what').textContent = 'what plays: 30 s preview clips from the public catalog, one at a time, only after a tap, from the ' + SONGS.length + ' artists farthest from anywhere auto-play went in ' + RUNS + ' walks. never my own album here.';
  $('toy').textContent = 'a toy. data: ' + RUNS + ' walks of ' + STEPSN + ' steps of the auto-play rule on my sound map (' + D.n.length + ' artists, ' + S.N.visited + ' reached, ' + S.N.never + ' never); the ' + SONGS.length + ' songs are the unreached artists with a preview, farthest first (' + Math.round(Math.min.apply(null, dm)) + ' to ' + Math.round(Math.max.apply(null, dm)) + ' on a map 1000 wide).';
  drawStays(); show(); bump();
  window.__slow = { songs: SONGS.map(function (s) { return [name(s.i), Math.round(s.d)]; }), N: S.N };
}).catch(function () { say('the data did not load. reload the page.'); });
})();
