(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP, PV = null, ADJ = null;
var KEY = 'sm_tel_v1', LIMIT = 10;
// only a kiosk tablet passes one browser's chain from visitor to visitor; on the web one person makes every link
if (new URLSearchParams(location.search).get('kiosk') === '1') {
  document.querySelector('.lines .take').lastChild.textContent = 'nobody chose the whole path, and nobody can say whose it is.';
  $('cv').setAttribute('aria-label', $('cv').getAttribute('aria-label').replace('one link per press', 'one link per visitor'));
}
var S = { hear: -1, chain: [], more: false, cands: [], sel: -1 };
var CLIP = 7000, AU = new Audio(), R = { on: false, k: -1, list: [], t: 0 };
AU.volume = 0.25;
function fam(i) { return D.fam[D.f[i]] || ''; }
function famCol(i) { return WK.FAMC[fam(i)] || PAL.ice; }
function silence() { clearTimeout(R.t); AU.pause(); }
function hear(i, off, ms, done) {
  var c = PV && PV[i]; silence();
  S.hear = i; WK.live(draw);
  var fin = function () { S.hear = -1; WK.still(); draw(); if (done) done(); };
  if (!c) { R.t = setTimeout(fin, 2500); return null; }
  AU.src = c[1];
  var seek = function () { AU.removeEventListener('loadedmetadata', seek); try { if (off) AU.currentTime = off; } catch (e) {} };
  AU.addEventListener('loadedmetadata', seek);
  var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {});
  R.t = setTimeout(fin, ms || CLIP);
  return c[0];
}
function sameRun(list, k) { var n = 0; while (k - n > 0 && list[k - n - 1] === list[k]) n++; return n; }
function stopReplay(msg) { R.on = false; R.k = -1; silence(); S.hear = -1; WK.still(); $('pc').textContent = 'hear every link in order'; if (msg) $('now').textContent = msg; draw(); }
function replayAt(k) {
  if (k >= R.list.length) { stopReplay('that was the whole chain: ' + R.list.length + ' links.'); return; }
  R.k = k; var i = R.list[k], nx = R.list[k + 1], run = sameRun(R.list, k);
  var t = hear(i, (run * 5) % 20, CLIP, function () { replayAt(k + 1); });
  $('now').textContent = 'link ' + (k + 1) + ' of ' + R.list.length + ': ' + (t ? t + ' by ' : '') + D.n[i] + ' (' + fam(i) + ')' + (t ? '' : ', no clip for this one') + (nx !== undefined ? '. next: ' + D.n[nx] + (fam(nx) !== fam(i) ? ', a new family' : '') + '.' : '. the last link.') + (run ? ' same artist as the last link, so a later second of it.' : '');
  draw();
}
function startReplay(k) { R.on = true; R.list = S.chain.slice(); $('pc').textContent = 'stop the replay'; replayAt(k || 0); }
function skip() { if (R.on) { clearTimeout(R.t); replayAt(R.k + 1); } }

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

function choose(i) {
  if (R.on) stopReplay();
  if (S.chain.length - 1 >= LIMIT && !S.more) return;
  if (S.sel === i) { pick(i); return; }
  if (!WK.sound()) WK.setSound(true);
  S.sel = i;
  var k = S.cands.indexOf(i), t = hear(i, 0, 12000, function () { if (!R.on) $('now').textContent = idleSel(); });
  $('now').textContent = (k + 1) + ' of ' + S.cands.length + ': ' + (t ? 'hearing ' + t + ' by ' : 'no clip for ') + D.n[i] + ' (' + fam(i) + '). tap it again to add it as link ' + (S.chain.length + 1) + ', or tap another to hear that.';
  render();
}
function idleSel() { return S.sel >= 0 ? 'tap ' + D.n[S.sel] + ' again to add it, or pick another to hear.' : idle(); }
function pick(i) {
  S.chain.push(i); S.sel = -1; save();
  var st = S.chain.length, prev = S.chain[st - 2], chg = fam(i) !== fam(prev);
  if (!AU.paused) { S.hear = i; WK.live(draw); }
  render();
  if (!AU.paused) $('now').textContent = 'link ' + st + total() + ' added: ' + D.n[i] + ' (' + fam(i) + (chg ? ', a new family' : '') + '), ' + (PV && PV[i] ? 'still playing it' : 'no clip for this one') + tail().replace(/^, /, '. ');
}

function total() { return S.more ? '' : ' of ' + (LIMIT + 1); }
function tail() {
  if (S.chain.length - 1 >= LIMIT && !S.more) return ', the chain is full.';
  if (!S.cands.length) return '. every neighbor is already in the chain, so it ends here.';
  return ', now pick the next song.';
}
function idle() { var n = S.chain.length; return 'step ' + n + total() + ': ' + D.n[S.chain[n - 1]] + tail(); }
function render() {
  var cur = S.chain[S.chain.length - 1], n = S.chain.length - 1, done = n >= LIMIT && !S.more;
  S.cands = done ? [] : cands();
  $('last').textContent = D.n[cur];
  var stuck = !done && !S.cands.length;
  var box = $('cands'); box.innerHTML = '';
  box.style.display = done || stuck ? 'none' : '';
  S.cands.forEach(function (i, k) {
    var b = document.createElement('button'); b.type = 'button';
    b.style.setProperty('--acc', WK.FAMC[D.fam[D.f[i]]] || PAL.ice);
    b.innerHTML = '<span class="n">' + (k + 1) + '</span> ' + WK.esc(D.n[i]);
    b.setAttribute('data-go', (S.sel === i ? 'add ' : 'hear ') + D.n[i]);
    b.setAttribute('aria-pressed', S.sel === i ? 'true' : 'false'); if (S.sel === i) b.classList.add('on');
    b.addEventListener('click', function () { choose(i); });
    box.appendChild(b);
  });
  $('after').classList.toggle('show', done || stuck);
  $('kg').style.display = stuck ? 'none' : '';
  WK.famKey($('fams'), D, S.chain.concat(S.cands));
  WK.primary(null); // keeps the default play target; the call re-reads its data-go words
  var hm = $('home'); hm.hidden = n < 1; if (n >= 1) hm.setAttribute('href', '../print/receipt2.html#p=' + S.chain.slice(0, 41).join(','));
  if (!R.on && S.sel < 0 && AU.paused) $('now').textContent = idle();
  if (n < 1) { $('num').innerHTML = '<span class="c">add a link</span>'; $('say').textContent = 'no presses yet. the chain starts at one song. tap a numbered song to hear it, then tap again to add it.'; }
  else {
    var Rh = bfs(S.chain[0], cur), r = bfs(S.chain[0], toyEnd(S.chain[0], n));
    $('num').textContent = Rh < 0 ? '?' : Rh;
    $('numlab').textContent = 'hops from the first song to the last, after ' + n + (n === 1 ? ' press' : ' presses');
    $('say').textContent = 'after ' + n + (n === 1 ? ' press' : ' presses') + ' the chain ended ' + (Rh < 0 ? 'out of reach' : Rh + (Rh === 1 ? ' step' : ' steps')) + ' from its start; the toy rule alone ended ' + (r < 0 ? 'out of reach' : r) + '.';
  }
  draw();
}

// labels go on last, after every mark. each tries spots around its own pebble, nearest first, and takes the first that
// covers no other label, pebble, ring or link number; one pushed away keeps a thin lead back to its pebble
var BOX = [], OBS = [], LF = '600 12px "IBM Plex Mono", monospace';
function cost(x, y, w, h) {
  var n = 0;
  BOX.forEach(function (b) { if (x < b.x + b.w + 2 && x + w + 2 > b.x && y < b.y + b.h + 2 && y + h + 2 > b.y) n += 4; });
  OBS.forEach(function (o) {
    if (o.r) { var qx = Math.max(x, Math.min(o.x, x + w)), qy = Math.max(y, Math.min(o.y, y + h)); if ((qx - o.x) * (qx - o.x) + (qy - o.y) * (qy - o.y) < o.r * o.r) n++; }
    else if (x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y) n++;
  });
  return n;
}
// up-right, up-left, down-right, down-left, right, left, up, down
var AROUND = [-0.6, -2.54, 0.6, 2.54, 0, 3.1416, -1.5708, 1.5708];
function place(i, text, col, rr, cand) {
  var g = MAP.g, h = 20, ax = MAP.X(i), ay = MAP.Y(i), w, best = null, bs = 1e9, d, k, a, r, c, sn, x, y, n;
  g.save(); g.font = LF; w = Math.ceil(g.measureText(text).width) + 10; g.restore();
  for (d = 0; d < 5 && bs > 0; d++) for (k = 0; k < AROUND.length; k++) {
    a = AROUND[k]; r = rr + 5 + d * 13; c = Math.cos(a); sn = Math.sin(a);
    x = ax + c * r; y = ay + sn * r;
    x = c > 0.3 ? x : c < -0.3 ? x - w : x - w / 2; y = sn > 0.3 ? y : sn < -0.3 ? y - h : y - h / 2;
    x = Math.round(Math.max(2, Math.min(MAP.W - w - 2, x))); y = Math.round(Math.max(2, Math.min(MAP.H - h - 2, y)));
    n = cost(x, y, w, h); if (n < bs) { bs = n; best = [x, y]; if (!n) break; }
  }
  var b = { x: best[0], y: best[1], w: w, h: h, ax: ax, ay: ay, rr: rr, text: text, col: col, cand: cand };
  BOX.push(b); return b;
}
function paint(b) {
  var g = MAP.g, cx = Math.max(b.x, Math.min(b.ax, b.x + b.w)), cy = Math.max(b.y, Math.min(b.ay, b.y + b.h)), dd = Math.hypot(cx - b.ax, cy - b.ay);
  g.save(); g.globalAlpha = 1; g.setLineDash([]);
  if (dd > b.rr + 14) { g.strokeStyle = b.col; g.lineWidth = 1; g.beginPath(); g.moveTo(b.ax + (cx - b.ax) * (b.rr + 2) / dd, b.ay + (cy - b.ay) * (b.rr + 2) / dd); g.lineTo(cx, cy); g.stroke(); }
  g.font = LF; g.textBaseline = 'middle';
  g.fillStyle = PAL.night; g.fillRect(b.x, b.y, b.w, b.h); g.strokeStyle = b.col; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  g.fillStyle = b.col; g.fillText(b.text, b.x + 5, b.y + b.h / 2 + 0.5); g.restore();
}
function draw() {
  MAP.begin(); BOX = []; OBS = [];
  if (!S.chain.length) return;
  var g = MAP.g, ch = S.chain, cur = ch[ch.length - 1], X = function (i) { return MAP.X(i); }, Y = function (i) { return MAP.Y(i); };
  var k0 = R.on ? R.k : ch.length - 1, pm = 1, RR = {};
  ch.forEach(function (i) { if (D.pl[i] > pm) pm = D.pl[i]; });
  S.cands.forEach(function (i) { P.ribbon(g, [[X(cur), Y(cur)], [X(i), Y(i)]], PAL.ice, PAL.ice, S.sel === i ? 2 : 1, S.sel === i ? 0.9 : 0.5); });
  if (ch.length > 1) {
    if (R.on && k0 < ch.length - 1) MAP.line(ch.slice(k0), null, PAL.ice, [3, 5], 1);
    if (k0 > 0) MAP.ribbon(ch.slice(0, k0 + 1), k0 + 1, PAL.ice, PAL.ink, MAP.W < 500 ? 2.6 : 3.4);
    else if (!R.on) MAP.ribbon(ch, ch.length, PAL.ice, PAL.ink, MAP.W < 500 ? 2.6 : 3.4);
  }
  S.cands.forEach(function (i) {
    var rr = 6 + 6 * Math.sqrt(D.pl[i] / pm);
    P.peb(g, i, X(i), Y(i), rr, famCol(i)); RR[i] = rr; OBS.push({ x: X(i), y: Y(i), r: rr + (S.sel === i ? 7 : 2) });
    if (S.sel === i) { g.save(); g.strokeStyle = PAL.ink; g.lineWidth = 2; g.beginPath(); g.arc(X(i), Y(i), rr + 5, 0, 6.2832); g.stroke(); g.restore(); }
  });
  ch.forEach(function (i, k) {
    var rr = 4 + 6 * Math.sqrt(D.pl[i] / pm), x = X(i), y = Y(i), ring = k > 0 && fam(i) !== fam(ch[k - 1]);
    g.save(); g.globalAlpha = R.on && k > k0 ? 0.35 : 1;
    if (ring) { g.strokeStyle = famCol(i); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, rr + 4, 0, 6.2832); g.stroke(); }
    P.peb(g, i, x, y, rr, k === 0 || k === ch.length - 1 ? PAL.ink : famCol(i));
    RR[i] = rr; OBS.push({ x: x, y: y, r: rr + (ring ? 5 : 1) });
    if (ch.length <= 30) { g.font = '600 10px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.fillText(String(k + 1), x, y - rr - 3); var tw = g.measureText(String(k + 1)).width; OBS.push({ x: x - tw / 2 - 1, y: y - rr - 12, w: tw + 2, h: 11 }); }
    g.restore();
  });
  P.rings(g, X(cur), Y(cur), PAL.ink, 20); OBS.push({ x: X(cur), y: Y(cur), r: 24 });
  if (S.hear >= 0) WK.pulse(g, X(S.hear), Y(S.hear), PAL.ice, 18);
  // most important first: the link being replayed, then the numbered songs you can tap, then where the chain began
  var L = [];
  if (R.on && R.k >= 0) L.push(place(ch[R.k], (R.k + 1) + ' of ' + ch.length + ': ' + D.n[ch[R.k]], famCol(ch[R.k]), RR[ch[R.k]]));
  S.cands.forEach(function (i, k) { L.push(place(i, String(k + 1), S.sel === i ? PAL.ink : PAL.ice, RR[i], i)); });
  L.push(place(ch[0], 'start', '#9a90b8', RR[ch[0]]));
  L.forEach(paint);
}

function fresh() { stopReplay(); S.chain = [newStart()]; S.more = false; S.sel = -1; save(); render(); }

$('nw').addEventListener('click', fresh);
$('kg').addEventListener('click', function () { S.more = true; render(); });
$('pc').addEventListener('click', function () { if (R.on) stopReplay('stopped.'); else startReplay(0); });
addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' && R.on) { skip(); return; }
  if (e.key === 'Enter' && S.sel >= 0 && !/BUTTON/.test(e.target && e.target.tagName)) { pick(S.sel); return; }
  var k = parseInt(e.key, 10); if (!(k >= 1 && k <= 6)) return;
  if (S.cands[k - 1] !== undefined && $('cands').style.display !== 'none') choose(S.cands[k - 1]);
});
$('cv').addEventListener('click', function (e) {
  var b = this.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, best = -1, bd = 32, link = -1, ld = 14;
  if ($('cands').style.display !== 'none') {
    BOX.forEach(function (q) { if (best < 0 && q.cand != null && x >= q.x - 4 && x <= q.x + q.w + 4 && y >= q.y - 4 && y <= q.y + q.h + 4) best = q.cand; });
    if (best < 0) S.cands.forEach(function (i) { var d = Math.hypot(MAP.X(i) - x, MAP.Y(i) - y); if (d < bd) { bd = d; best = i; } });
  }
  if (best >= 0) { choose(best); return; }
  S.chain.forEach(function (i, k) { var d = Math.hypot(MAP.X(i) - x, MAP.Y(i) - y); if (d < ld) { ld = d; link = k; } });
  if (link >= 0) { if (R.on) { clearTimeout(R.t); replayAt(link); } else startReplay(link); }
});
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; LOOP = a[0].LOOP; PV = a[1];
  MAP = new WK.Map($('map'), $('cv'), D, M, { dim: 0.6 }); MAP.resize();
  var c = load(); if (c) { S.chain = c; render(); } else fresh();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
