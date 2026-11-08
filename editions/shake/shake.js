(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP, PV = null, ADJ = null;
var cv = $('cv'), TH = 16, COOL = 900;
var S = { cur: 0, deals: [], last: 0, listening: false, hear: null, got: false, view: -1, tok: 0, seq: [], sk: -1 };

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
function srt(c) { return D.nn[c].slice().sort(function (a, b) { return LOOP.dist(M, c, a) - LOOP.dist(M, c, b); }); }
function startAt() { var p = M.order.slice(0, 300).filter(function (i) { return PV && PV[i]; }); return p[Math.floor(Math.random() * p.length)]; }

function fam(i) { return D.fam[D.f[i]]; }
function fcol(i) { return WK.FAMC[fam(i)] || PAL.ice; }
function rad(i, lo, hi) { return lo + (hi - lo) * Math.log(1 + D.pl[i]) / Math.log(1 + D.pl[M.order[0]]); }
function setNum(v) { $('num').innerHTML = v == null ? '<span class="c">shake to start</span>' : String(v); }
function snd() { return WK.sound() ? '' : ' sound is off: tap the sound chip to hear it.'; }
function hearSeq(seq, from) {
  var my = ++S.tok, list = [], k;
  S.seq = seq;
  for (k = from; k < seq.length; k++) if (PV[seq[k].i] && !(k > 0 && seq[k].i === seq[k - 1].i)) list.push({ i: seq[k].i, tag: String(k) });
  if (!list.length) { S.hear = null; $('now').textContent = 'no more clips here. shake again.'; S.sk = seq.length; draw(); return; }
  WK.play(list, function (k, info) {
    if (my !== S.tok) return;
    if (info) {
      var q = seq[parseInt(info.tag, 10)], prev = parseInt(info.tag, 10) > 0 ? seq[parseInt(info.tag, 10) - 1] : null;
      S.sk = parseInt(info.tag, 10); S.hear = { i: info.i, col: q.col };
      $('now').textContent = q.label + ': ' + info.title + ' by ' + D.n[info.i] + ' (' + fam(info.i) + ')' + (prev && D.n[prev.i] === D.n[info.i] ? '. same artist as the last clip.' : '.') + (S.sk < seq.length - 1 ? ' next clip: ' + seq[S.sk + 1].label + '.' : ' last clip.') + snd();
      WK.live(draw);
    } else { S.hear = null; WK.still(); draw(); }
  });
  draw();
}
function hearOf(i, col) {
  S.hear = { i: i, col: col };
  var my = ++S.tok; S.sk = -1;
  WK.play([{ i: i, tag: 'tap' }], function (k, info) {
    if (my !== S.tok) return;
    if (info) { $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[i]; WK.live(draw); }
    else { S.hear = null; WK.still(); draw(); }
  });
  draw();
}
function shakeNow() {
  var now = Date.now(); if (now - S.last < COOL) return; S.last = now;
  var c = S.cur, t, tries = 0, press;
  do { t = Math.floor(Math.random() * M.N); tries++; } while ((t === c || (PV && !PV[t])) && tries < 400);
  press = srt(c)[0];
  var J = bfs(c, t), j = bfs(c, press);
  S.deals.push({ c: c, t: t, p: press, J: J, j: j });
  if (S.deals.length > 40) S.deals.shift();
  S.cur = press;
  S.view = S.deals.length - 1;
  render();
  hearSeq([{ i: t, col: PAL.amber, label: 'shuffle landed' }, { i: press, col: PAL.mint, label: 'a press hops' }], 0);
}
function render() {
  var d = S.deals[S.view < 0 ? S.deals.length - 1 : S.view];
  if (!d) { setNum(null); $('say').textContent = 'shake the phone, or tap shake.'; draw(); return; }
  var sj = 0, sp = 0; S.deals.forEach(function (x) { sj += Math.max(0, x.J); sp += Math.max(0, x.j); });
  setNum(d.J < 0 ? '?' : d.J);
  $('say').textContent = 'shake ' + (S.deals.indexOf(d) + 1) + ' of ' + S.deals.length + ': from ' + D.n[d.c] + ' shuffle leaped to ' + D.n[d.t] + ', then a press hops to ' + D.n[d.p] + '. shuffle\'s jump was ' + d.J + (d.J === 1 ? ' step' : ' steps') + ', a press\'s was ' + d.j + '. over ' + S.deals.length + (S.deals.length === 1 ? ' shake' : ' shakes') + ' the averages are ' + (sj / S.deals.length).toFixed(1) + ' and ' + (sp / S.deals.length).toFixed(1) + '. ' + (fam(d.c) !== fam(d.t) ? 'shuffle crossed from ' + fam(d.c) + ' to ' + fam(d.t) + '. ' : 'shuffle stayed in ' + fam(d.t) + '. ') + (fam(d.c) !== fam(d.p) ? 'the press crossed to ' + fam(d.p) + '.' : 'the press stayed in ' + fam(d.p) + '.') + ' a toy rule, not my data.' + snd();
  draw();
}
function draw() {
  MAP.begin();
  var g = MAP.g, X = MAP.X, Y = MAP.Y, n = S.view < 0 ? S.deals.length : S.view + 1, k, d, thick = MAP.W < 500 ? 2.6 : 3.4;
  for (k = Math.max(0, n - 6); k < n - 1; k++) {
    d = S.deals[k];
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.t), Y(d.t)]], PAL.amber, PAL.amber, 1.4, 0.28);
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.p), Y(d.p)]], PAL.mint, PAL.mint, 1.6, 0.28);
  }
  if (n) {
    d = S.deals[n - 1];
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.t), Y(d.t)]], PAL.amber, PAL.amber, thick, 0.95);
    P.ribbon(g, [[X(d.c), Y(d.c)], [X(d.p), Y(d.p)]], PAL.mint, PAL.mint, thick, 0.95);
    P.peb(g, d.t, X(d.t), Y(d.t), rad(d.t, 6, 12), fcol(d.t)); P.glyph(g, 'diamond', X(d.t), Y(d.t), 13, PAL.amber);
    P.peb(g, d.p, X(d.p), Y(d.p), rad(d.p, 6, 12), fcol(d.p)); P.glyph(g, 'star', X(d.p), Y(d.p), 12, PAL.mint);
    P.peb(g, d.c, X(d.c), Y(d.c), rad(d.c, 6, 12), fcol(d.c)); P.rings(g, X(d.c), Y(d.c), PAL.ink, 18);
    MAP.tag(d.c, 'from ' + D.n[d.c], PAL.ink); MAP.tag(d.t, 'shuffle ' + D.n[d.t], PAL.amber); if (d.p !== d.t) MAP.tag(d.p, 'press ' + D.n[d.p], PAL.mint);
  } else {
    P.peb(g, S.cur, X(S.cur), Y(S.cur), rad(S.cur, 6, 12), fcol(S.cur)); P.rings(g, X(S.cur), Y(S.cur), PAL.ink, 18);
    g.save(); g.font = '500 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.fillText('shake the phone, tap shake, or press d.', MAP.W / 2, MAP.H - 16); g.restore();
  }
  if (S.hear && WK.playing()) WK.pulse(g, X(S.hear.i), Y(S.hear.i), S.hear.col, 16);
}

var lx = 0, ly = 0, lz = 0, have = false, peaks = [], chip, bar, fillEl, lab, flashT;
function mkChip() {
  chip = document.createElement('button'); chip.type = 'button';
  chip.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:50;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid currentColor;background:rgba(10,12,20,.85);color:#e8ecf4;font:500 13px "IBM Plex Mono",monospace;cursor:pointer';
  lab = document.createElement('span'); bar = document.createElement('span'); fillEl = document.createElement('i');
  bar.style.cssText = 'display:inline-block;width:48px;height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden';
  fillEl.style.cssText = 'display:block;height:100%;width:0;background:#7fe3c0';
  bar.appendChild(fillEl); chip.appendChild(lab); chip.appendChild(bar); document.body.appendChild(chip);
  bar.style.display = 'none';
}
function setChip(t) { lab.textContent = t; }
function onMotion(e) {
  var a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
  var x = a.x, y = a.y || 0, z = a.z || 0;
  S.got = true; $('nophone').hidden = true;
  if (have) {
    var dx = x - lx, dy = y - ly, dz = z - lz, m = Math.sqrt(dx * dx + dy * dy + dz * dz), now = Date.now();
    fillEl.style.width = Math.min(100, m / 30 * 100) + '%';
    if (m > 12) {
      if (!peaks.length || now - peaks[peaks.length - 1] > 80) peaks.push(now);
      peaks = peaks.filter(function (t) { return now - t < 600; });
      if (peaks.length >= 2 && now - S.last >= COOL) { peaks = []; flash(); shakeNow(); }
    }
  }
  lx = x; ly = y; lz = z; have = true;
}
function flash() { setChip('shook'); clearTimeout(flashT); flashT = setTimeout(function () { setChip('shake me'); }, 700); }
function listen() {
  if (S.listening) return; S.listening = true; addEventListener('devicemotion', onMotion);
  $('alw').hidden = true; bar.style.display = 'inline-block'; setChip('shake me');
  $('say').textContent = 'shake is on. shake the phone, tap shake, or press d.';
}
mkChip();
var DM = window.DeviceMotionEvent;
if (DM && typeof DM.requestPermission === 'function') {
  setChip('tap to allow motion'); $('alw').hidden = false;
  var ask = function () {
    if (S.listening) return;
    DM.requestPermission().then(function (r) { if (r === 'granted') listen(); else { setChip('motion not allowed'); $('dl').hidden = false; $('say').textContent = 'motion was not allowed. tap shake instead.'; } }).catch(function () { setChip('motion not available'); $('say').textContent = 'motion is not available here. tap shake instead.'; });
  };
  chip.addEventListener('click', ask); $('alw').addEventListener('click', ask);
} else if (DM) {
  listen();
  setTimeout(function () { if (!S.got) setChip('no motion here, tap shake'); }, 1500);
} else {
  setChip('no motion here, tap shake');
}
chip.addEventListener('click', function () { if (S.listening) { S.last = 0; flash(); shakeNow(); } });
setTimeout(function () { if (!S.got) $('nophone').hidden = false; }, 1500);
$('dl').addEventListener('click', function () { S.last = 0; shakeNow(); });
$('nc').addEventListener('click', function () { if (!S.seq.length) { $('now').textContent = 'shake first, then step through the clips.'; return; } hearSeq(S.seq, Math.min(S.seq.length - 1, S.sk + 1)); });
$('ea').addEventListener('click', function () {
  if (S.deals.length < 2) { $('now').textContent = 'shake at least twice to step back.'; return; }
  S.view = (S.view < 0 ? S.deals.length - 1 : S.view) - 1; if (S.view < 0) S.view = S.deals.length - 1;
  var d = S.deals[S.view]; render();
  hearSeq([{ i: d.t, col: PAL.amber, label: 'shuffle landed' }, { i: d.p, col: PAL.mint, label: 'a press hops' }], 0);
});
$('sr').addEventListener('click', function () { S.tok++; S.seq = []; S.sk = -1; S.view = -1; WK.stop(); WK.still(); S.hear = null; S.deals = []; S.cur = startAt(); $('now').textContent = 'turn the sound chip on, then shake.'; render(); });
addEventListener('keydown', function (e) { if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey && !e.altKey) { S.last = 0; shakeNow(); } });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; LOOP = a[0].LOOP; PV = a[1];
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.6, tap: function (i) { hearOf(i, WK.FAMC[D.fam[D.f[i]]] || PAL.ice); } }); MAP.resize(); S.cur = startAt(); render();
  var sc = document.getElementById('wk-snd'); if (sc) sc.addEventListener('click', function () { setTimeout(render, 0); });
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
