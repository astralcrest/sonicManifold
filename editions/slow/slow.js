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
function hint() { return (WK.sound() ? '' : 'sound is off until you tap the sound chip at the top. ') + 'the stay clock counts only while you can hear it. on a keyboard: space plays or stops, n skips.'; }

// several of the twelve share one spot, so the drawn shapes are pushed GAP px apart, each with a thin line back to its spot
var GAP = 30;
function layout() {
  if (S.at && S.aw === MAP.W && S.ah === MAP.H) return S.at;
  var at = SONGS.map(function (s) { return [MAP.X(s.i), MAP.Y(s.i)]; }), n = at.length, it, a, c, dx, dy, d, q, m = 24;
  for (it = 0; it < 200; it++) {
    for (a = 0; a < n; a++) for (c = a + 1; c < n; c++) {
      dx = at[c][0] - at[a][0]; dy = at[c][1] - at[a][1]; d = Math.sqrt(dx * dx + dy * dy);
      if (d >= GAP) continue;
      if (d < 0.01) { dx = Math.cos(a * 2.4 + c); dy = Math.sin(a * 2.4 + c); d = 1; }
      q = (GAP - d) / 2 / d; at[a][0] -= dx * q; at[a][1] -= dy * q; at[c][0] += dx * q; at[c][1] += dy * q;
    }
    for (a = 0; a < n; a++) { at[a][0] = Math.max(m, Math.min(MAP.W - m, at[a][0])); at[a][1] = Math.max(m, Math.min(MAP.H - m, at[a][1])); }
  }
  S.aw = MAP.W; S.ah = MAP.H; return (S.at = at);
}

function draw() {
  MAP.begin();
  var g = MAP.g, P = WK.P, PAL = P.PAL, j, at = layout();
  g.save(); g.globalAlpha = 0.5;
  for (j = 0; j < VIS.length; j++) P.peb(g, VIS[j], MAP.X(VIS[j]), MAP.Y(VIS[j]), 2 + 3.2 * TW[VIS[j]], PAL.violet);
  g.restore();
  var cur = S.on ? SONGS[S.k] : null, upto = S.k < 0 ? -1 : S.k;
  var done = at.slice(0, upto + 1), rest = at.slice(Math.max(0, upto));
  if (rest.length > 1) P.ribbon(g, rest, PAL.ice, PAL.ice, 1.2, 0.22, [3, 5]);
  if (done.length > 1) P.ribbon(g, done, PAL.ice, PAL.ink, 2.4, 0.8);
  g.save(); g.strokeStyle = PAL.ink; g.globalAlpha = 0.7; g.lineWidth = 1;
  SONGS.forEach(function (s, j) {
    var x = MAP.X(s.i), y = MAP.Y(s.i);
    if (Math.abs(at[j][0] - x) + Math.abs(at[j][1] - y) < 2) return;
    g.beginPath(); g.moveTo(x, y); g.lineTo(at[j][0], at[j][1]); g.stroke(); P.glyph(g, 'dot', x, y, 3, PAL.ink);
  });
  g.restore();
  SONGS.forEach(function (s, j) {
    var on = cur && cur.i === s.i, r = (on ? 8 : 6) + 3 * TW[s.i], x = at[j][0], y = at[j][1];
    P.peb(g, s.i, x, y, r + 1.6, PAL.ink); P.peb(g, s.i, x, y, r, fcol(s.i), false);
    if (S.res[j] === 'ok') P.glyph(g, 'dot', x, y - r - 7, 4, PAL.mint);
    else if (S.res[j] === 'lf') P.glyph(g, 'dot', x, y - r - 7, 4, PAL.rose);
  });
  if (cur) {
    var cx = at[S.k][0], cy = at[S.k][1], nx = MAP.X(cur.near), ny = MAP.Y(cur.near);
    P.ribbon(g, [[MAP.X(cur.i), MAP.Y(cur.i)], [nx, ny]], PAL.ink, PAL.violet, 2, 0.95);
    P.glyph(g, 'ring', nx, ny, 6, PAL.violet);
    P.rings(g, cx, cy, PAL.ink, 20);
    var st = (S.k + 1) + ' of ' + SONGS.length + ': ' + name(cur.i), sb = songBox(chipW(g, st), cx, cy), nt = 'closest reached', nb = nearBox(chipW(g, nt), nx, ny, sb, cx, cy);
    if (nb) chip(g, nb, nt, PAL.violet);
    chip(g, sb, st, C.ink);
    if (S.sound) WK.pulse(g, cx, cy, PAL.ink, 20);
  }
}
// name chips drawn like the shared map tag. the song's own chip is never covered: the "closest reached" chip takes a free side of its ring, or is left out (the line under the name says it)
var CF = '600 12px "IBM Plex Mono", monospace';
function chipW(g, t) { g.save(); g.font = CF; var w = Math.ceil(g.measureText(t).width) + 12; g.restore(); return w; }
function chip(g, b, t, fg) {
  g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.font = CF; g.textBaseline = 'middle';
  g.fillStyle = C.night; g.fillRect(b.x, b.y, b.w, 22); g.strokeStyle = fg; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, 21);
  g.fillStyle = fg; g.fillText(t, b.x + 6, b.y + 11.5); g.restore();
}
function songBox(w, cx, cy) { var x = cx + 12, y = cy - 14; if (x + w > MAP.W - 2) x = cx - 12 - w; if (y < 11) y = cy + 16; if (x < 2) x = 2; return { x: Math.round(x), y: Math.round(y) - 11, w: w }; }
function nearBox(w, nx, ny, sb, cx, cy) {
  var best = null, bs = -1;
  [[nx + 12, ny - 25], [nx - 12 - w, ny - 25], [nx + 12, ny - 11], [nx - 12 - w, ny - 11], [nx + 12, ny + 3], [nx - 12 - w, ny + 3], [nx - w / 2, ny - 36], [nx - w / 2, ny + 14], [nx - w / 2, ny - 52], [nx - w / 2, ny + 30]].forEach(function (p) {
    var b = { x: Math.round(p[0]), y: Math.round(p[1]), w: w }, gx, gy, qx, qy, s;
    if (b.x < 2 || b.y < 2 || b.x + w > MAP.W - 2 || b.y + 22 > MAP.H - 2) return;
    gx = Math.max(sb.x - b.x - w, b.x - sb.x - sb.w, 0); gy = Math.max(sb.y - b.y - 22, b.y - sb.y - 22, 0);
    if (gx < 4 && gy < 4) return;
    qx = Math.max(b.x, Math.min(cx, b.x + w)); qy = Math.max(b.y, Math.min(cy, b.y + 22));
    if ((qx - cx) * (qx - cx) + (qy - cy) * (qy - cy) < 196) return;
    s = Math.max(gx, gy); if (s > bs) { bs = s; best = b; }
  });
  return best;
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
  $('dline').innerHTML = s ? 'family <b>' + esc(fam(s.i)) + '</b>. the closest the 40 walks came: <b>' + esc(name(s.near)) + '</b>, the violet ring, <b>' + Math.round(s.d) + '</b> away on a map 1000 wide.' : '';
  $('slot').textContent = s ? 'song ' + (S.k + 1) + ' of ' + SONGS.length + '. stay 30 s and the dot turns mint. tap a dot or a bright shape to jump.' : '';
  if (!s) $('bar').style.width = '0';
  drawStays(); draw();
}

function playK(k) {
  S.k = k; S.t0 = performance.now(); S.el = 0; S.credited = false; S.listen = 0;
  var s = SONGS[S.k];
  AU.src = PV[s.i][1];
  var pr = AU.play();
  if (pr && pr.catch) pr.catch(function (e) { if (e && e.name === 'AbortError') return; say('the clip did not start. tap play again.'); mapSay('the clip did not start. tap play again.'); stop(); });
  say(nowLine(k) + (WK.sound() ? '' : ' sound is off, so the clock waits: tap the sound chip at the top.'));
  show();
}
function advance() {
  if (S.k + 1 >= SONGS.length) { stop(); say('that was all ' + SONGS.length + '. you stayed with ' + S.stays + '. press play to hear them again, or start over.'); S.k = -1; show(); return; }
  playK(S.k + 1);
}
function start() {
  if (S.on) return;
  WK.setSound(true);
  S.on = true; S.last = performance.now();
  S.sound = WK.sound();
  playK(S.k < 0 ? 0 : S.k);
  S.tick = setInterval(step, 250); WK.live(draw);
}
function stop() {
  try { AU.pause(); } catch (e) {}
  S.on = false; clearInterval(S.tick); S.tick = null; WK.still();
  show(); bump();
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
// a clip heard to its end counts even when it ends a few ms before the 250 ms clock reaches 30 s
AU.addEventListener('ended', function () { if (!(S.on && WK.sound())) return; if (!S.credited && S.el >= STAY - 1) { S.credited = true; S.res[S.k] = 'ok'; } advance(); });

function leave() {
  WK.setSound(true);
  if (S.k >= 0 && S.res[S.k] !== 'ok') S.res[S.k] = 'lf';
  if (S.on) advance(); else if (S.k + 1 < SONGS.length) { S.k = S.k + 1; start(); } else { S.k = -1; start(); }
}
function jumpK(k) {
  if (k < 0 || k >= SONGS.length) return;
  mapSay('');
  WK.setSound(true);
  if (S.on && S.k >= 0 && S.res[S.k] !== 'ok' && k !== S.k) S.res[S.k] = 'lf';
  S.k = k; if (S.on) playK(k); else start();
}
function tapAt(i) {
  var k = -1; SONGS.forEach(function (s, j) { if (s.i === i) k = j; });
  if (k < 0) { mapSay(VIS.indexOf(i) >= 0 ? D.n[i] + ' (' + fam(i) + '): the 40 walks did reach this one. the bright shapes are the twelve they did not.' : D.n[i] + ' (' + fam(i) + ') has no clip here. tap a bright shape.'); return; }
  jumpK(k);
}
// the reply to a map tap sits on the map itself, where the eye is (the side text is off screen on a phone)
var msT;
function mapSay(t) { var m = $('mapsay'); clearTimeout(msT); m.textContent = t || ''; if (t) msT = setTimeout(function () { m.textContent = ''; }, 6000); }
// a tap or hover near a drawn shape is that song: caught before the map's own nearest-artist lookup
function hit(e) {
  var r = $('cv').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, at = layout(), k = -1, bd = 22 * 22, j, d;
  for (j = 0; j < at.length; j++) { d = (at[j][0] - x) * (at[j][0] - x) + (at[j][1] - y) * (at[j][1] - y); if (d < bd) { bd = d; k = j; } }
  return { k: k, x: x, y: y };
}
['pointerdown', 'pointermove'].forEach(function (ev) {
  $('map').addEventListener(ev, function (e) {
    if (!MAP || !SONGS.length) return;
    var h = hit(e), tip = $('map').querySelector('.wk-tip'); if (h.k < 0) return;
    e.stopPropagation();
    var i = SONGS[h.k].i;
    if (tip) { tip.innerHTML = '<b>' + esc(name(i)) + '</b> <i style="background:' + fcol(i) + '"></i>' + esc(fam(i)) + (D.pl ? ' · ' + D.pl[i] + ' plays' : ''); tip.style.left = Math.max(0, Math.min(MAP.W - 200, h.x + 12)) + 'px'; tip.style.top = Math.max(0, h.y - 34) + 'px'; tip.hidden = false; }
    if (ev === 'pointerdown') jumpK(h.k);
  }, true);
});
function reset() { stop(); S.res = []; S.credited = false; S.listen = 0; S.el = 0; S.k = -1; say(hint()); show(); }
// 120 s with no sound playing and no input clears the count; a visitor who just listens is never reset
function bump() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.on && WK.sound()) { bump(); return; } if (S.on || S.stays) reset(); }, 120000); }
['pointerdown', 'keydown'].forEach(function (e) { document.addEventListener(e, bump, true); });

$('play').addEventListener('click', function () { if (S.on) stop(); else start(); });
$('leave').addEventListener('click', leave);
$('reset').addEventListener('click', reset);
$('stays').addEventListener('click', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-k'); if (k != null) jumpK(+k); });
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName || '') || e.target.isContentEditable) return;
  if (e.key === 'n' || e.key === 'N') { leave(); return; }
  // space on a button a keyboard user tabbed to stays that button's own press
  if (e.key === ' ' && !/button|summary/i.test(e.target.tagName || '')) { e.preventDefault(); if (S.on) stop(); else start(); }
});
// a click with a pointer leaves no focus behind, so space goes back to play or stop; a keyboard press (detail 0) keeps its focus
// (the path, not target.closest: the sound chip rewrites its label on click, which detaches the span that was clicked)
document.addEventListener('click', function (e) { if (!(e.detail > 0) || !e.composedPath) return; var el = e.composedPath().filter(function (x) { return x.tagName && /^(button|summary)$/i.test(x.tagName); })[0]; if (el) el.blur(); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; FIT = a[0].FIT; LOOP = a[0].LOOP; PV = a[1];
  TW = WK.P.weights(D.xy.length, D.pl);
  MAP = new WK.Map($('map'), $('cv'), D, M, { dim: 0.32, tap: tapAt }); MAP.resize();
  choose();
  var dm = SONGS.map(function (s) { return s.d; });
  $('what').textContent = 'what plays: 30 s preview clips from the public catalog, one at a time, only after a tap, from the ' + SONGS.length + ' artists farthest from anywhere the auto-play rule went in ' + RUNS + ' walks. never my own album here.';
  $('toy').textContent = 'a toy. data: ' + RUNS + ' walks of ' + STEPSN + ' steps of the auto-play rule on my sound map (' + D.n.length + ' artists, ' + S.N.visited + ' reached, ' + S.N.never + ' not reached); the ' + SONGS.length + ' songs are the unreached artists with a preview, farthest first (' + Math.round(Math.min.apply(null, dm)) + ' to ' + Math.round(Math.max.apply(null, dm)) + ' on a map 1000 wide). a sample, not a census: more walks reach some of them, and the real queue did play a few.';
  drawStays(); show(); bump(); say(hint());
  window.__slow = { songs: SONGS.map(function (s) { return [name(s.i), Math.round(s.d)]; }), N: S.N, xy: function () { return layout().map(function (q, j) { return [name(SONGS[j].i), q[0], q[1]]; }); } };
}).catch(function () { say('the data did not load. reload the page.'); });
})();
