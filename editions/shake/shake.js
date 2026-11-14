(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, PV = null, ADJ = null, PR = null;
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
// my real presses: the artists i pressed right before or after each one (two presses in a row in my log), both with a clip
function prs() {
  if (PR) return PR;
  PR = []; for (var i = 0; i < M.N; i++) PR.push([]);
  D.r.forEach(function (e) { if (PV[e[0]] && PV[e[1]]) { PR[e[0]].push(e[1]); PR[e[1]].push(e[0]); } });
  return PR;
}
function startAt() { var p = M.order.slice(0, 300).filter(function (i) { return prs()[i].length; }); return p[Math.floor(Math.random() * p.length)]; }

function fam(i) { return D.fam[D.f[i]]; }
function fcol(i) { return WK.FAMC[fam(i)] || PAL.ice; }
function rad(i, lo, hi) { return lo + (hi - lo) * Math.log(1 + D.pl[i]) / Math.log(1 + D.pl[M.order[0]]); }
function setNum(v) { $('num').innerHTML = v == null ? '<span class="c">shake to start</span>' : String(v); }
function snd() { return WK.sound() ? '' : ' sound is off: tap the sound chip at the top.'; }
var NOW = { t: '', s: false };
function setNow(t, s) { NOW = { t: t, s: !!s }; $('now').textContent = t + (s ? snd() : ''); }
function dot(s) { return /[.!?]$/.test(s) ? s : s + '.'; }
function stp(n) { return n + (n === 1 ? ' step' : ' steps'); }
function hearSeq(seq, from) {
  var my = ++S.tok, list = [], k;
  S.seq = seq;
  for (k = from; k < seq.length; k++) if (PV[seq[k].i] && !(k > 0 && seq[k].i === seq[k - 1].i)) list.push({ i: seq[k].i, tag: String(k) });
  if (!list.length) { S.hear = null; setNow('no more clips here. shake again.'); S.sk = seq.length; draw(); return; }
  WK.play(list, function (k, info) {
    if (my !== S.tok) return;
    if (info) {
      var q = seq[parseInt(info.tag, 10)], prev = parseInt(info.tag, 10) > 0 ? seq[parseInt(info.tag, 10) - 1] : null;
      S.sk = parseInt(info.tag, 10); S.hear = { i: info.i, col: q.col };
      setNow(q.label + ': ' + info.title + ' by ' + D.n[info.i] + ' (' + fam(info.i) + ')' + (prev && D.n[prev.i] === D.n[info.i] ? '. same artist as the last clip.' : '.') + (S.sk < seq.length - 1 ? ' next clip: ' + seq[S.sk + 1].label + '.' : ' last clip.'), true);
      WK.live(draw); draw();
    } else { S.hear = null; WK.still(); draw(); }
  });
  draw();
}
function hearOf(i, col) {
  S.hear = { i: i, col: col };
  var my = ++S.tok; S.sk = -1;
  WK.play([{ i: i, tag: 'tap' }], function (k, info) {
    if (my !== S.tok) return;
    if (info) { setNow('hearing ' + info.title + ' by ' + dot(D.n[i]), true); WK.live(draw); }
    else { S.hear = null; WK.still(); draw(); }
  });
  draw();
}
function shakeNow() {
  var now = Date.now(); if (!M || now - S.last < COOL) return; S.last = now;
  var c = S.cur, t, tries = 0, R = prs(), press = R[c][Math.floor(Math.random() * R[c].length)];
  do { t = Math.floor(Math.random() * M.N); tries++; } while ((t === c || !R[t].length) && tries < 400);
  var J = bfs(c, t), j = bfs(c, press);
  S.deals.push({ c: c, t: t, p: press, J: J, j: j });
  if (S.deals.length > 40) S.deals.shift();
  S.cur = t;
  S.view = S.deals.length - 1;
  render();
  hearSeq([{ i: t, col: PAL.amber, label: 'shuffle landed' }, { i: press, col: PAL.mint, label: 'my press' }], 0);
}
function render() {
  var d = S.deals[S.view < 0 ? S.deals.length - 1 : S.view];
  WK.famKey($('fams'), D, d ? [d.c, d.t, d.p] : [S.cur]);
  if (!d) { setNum(null); $('say').textContent = 'shake the phone, or tap shake.'; draw(); return; }
  var sj = 0, sp = 0; S.deals.forEach(function (x) { sj += Math.max(0, x.J); sp += Math.max(0, x.j); });
  setNum(d.J < 0 ? '?' : d.J);
  $('say').textContent = 'shake ' + (S.deals.indexOf(d) + 1) + ' of ' + S.deals.length + '. from ' + D.n[d.c] + ' (' + fam(d.c) + '), shuffle leaped ' + stp(d.J) + ' to ' + D.n[d.t] + ' (' + fam(d.t) + '). my press went ' + stp(d.j) + ' to ' + D.n[d.p] + ' (' + fam(d.p) + '), an artist i pressed right before or after ' + dot(D.n[d.c]) + ' so far shuffle averages ' + (sj / S.deals.length).toFixed(1) + ' steps, my presses ' + (sp / S.deals.length).toFixed(1) + '. shuffle is a toy rule; the press is from my log.';
  draw();
}
function draw() {
  MAP.begin();
  var g = MAP.g, X = MAP.X, Y = MAP.Y, n = S.view < 0 ? S.deals.length : S.view + 1, k, d, tl = null, thick = MAP.W < 500 ? 2.6 : 3.4;
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
    tl = [[d.c, 'from ' + D.n[d.c], PAL.ink], [d.t, 'shuffle ' + D.n[d.t], PAL.amber]].concat(d.p !== d.t ? [[d.p, 'press ' + D.n[d.p], PAL.mint]] : []);
  } else {
    P.peb(g, S.cur, X(S.cur), Y(S.cur), rad(S.cur, 6, 12), fcol(S.cur)); P.rings(g, X(S.cur), Y(S.cur), PAL.ink, 18);
    g.save(); g.font = '500 13px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.fillText('shake the phone, tap shake, or press d.', MAP.W / 2, MAP.H - 16); g.restore();
  }
  if (S.hear && WK.playing()) WK.pulse(g, X(S.hear.i), Y(S.hear.i), S.hear.col, 16);
  if (tl) tags(tl);
}
// the name tags in MAP.tag's look, each on the spot by its dot that covers the earlier tags and the other two marks least, so none is hidden
function tags(list) {
  var g = MAP.g, put = [];
  g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  list.forEach(function (t, a) {
    var x0 = MAP.X(t[0]), y0 = MAP.Y(t[0]), w = Math.ceil(g.measureText(t[1]).width) + 12, best = null, bo = Infinity;
    var obs = put.concat(list.filter(function (u, b) { return b !== a; }).map(function (u) { return [MAP.X(u[0]) - 13, MAP.Y(u[0]) - 13, 26, 26]; }));
    [[12, -25], [12, 5], [-12 - w, -25], [-12 - w, 5], [-w / 2, -40], [-w / 2, 18], [12, 29], [-12 - w, 29], [12, -49], [-12 - w, -49]].forEach(function (o) {
      var x = Math.round(Math.max(2, Math.min(MAP.W - 2 - w, x0 + o[0]))), y = Math.round(Math.max(2, Math.min(MAP.H - 24, y0 + o[1]))), ov = 0;
      obs.forEach(function (r) { ov += Math.max(0, Math.min(x + w, r[0] + r[2]) - Math.max(x, r[0])) * Math.max(0, Math.min(y + 22, r[1] + r[3]) - Math.max(y, r[1])); });
      if (ov < bo) { bo = ov; best = [x, y, w, 22]; }
    });
    put.push(best);
    g.fillStyle = PAL.night; g.fillRect(best[0], best[1], w, 22); g.strokeStyle = t[2]; g.lineWidth = 1; g.strokeRect(best[0] + 0.5, best[1] + 0.5, w - 1, 21);
    g.fillStyle = t[2]; g.fillText(t[1], best[0] + 6, best[1] + 11.5);
  });
  g.restore();
}

var lx = 0, ly = 0, lz = 0, have = false, peaks = [], flashT;
// one permission button (allow shake, iOS only); the motion level is a quiet meter, not a second button
function setLab(t) { $('mlab').textContent = t; }
function onMotion(e) {
  var a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
  var x = a.x, y = a.y || 0, z = a.z || 0;
  if (!S.got) { S.got = true; $('nophone').hidden = true; $('meter').hidden = false; }
  if (have) {
    var dx = x - lx, dy = y - ly, dz = z - lz, m = Math.sqrt(dx * dx + dy * dy + dz * dz), now = Date.now();
    $('mfill').style.width = Math.min(100, m / 30 * 100) + '%';
    if (m > 12) {
      if (!peaks.length || now - peaks[peaks.length - 1] > 80) peaks.push(now);
      peaks = peaks.filter(function (t) { return now - t < 600; });
      if (peaks.length >= 2 && now - S.last >= COOL) { peaks = []; flash(); shakeNow(); }
    }
  }
  lx = x; ly = y; lz = z; have = true;
}
function flash() { setLab('shook'); clearTimeout(flashT); flashT = setTimeout(function () { setLab('motion'); }, 700); }
function listen() {
  if (S.listening) return; S.listening = true; addEventListener('devicemotion', onMotion);
  $('alw').hidden = true;
}
function nomotion(t) { $('alw').hidden = true; $('say').textContent = t; }
var DM = window.DeviceMotionEvent;
if (DM && typeof DM.requestPermission === 'function') {
  $('alw').hidden = false;
  $('alw').addEventListener('click', function () {
    if (S.listening) return;
    DM.requestPermission().then(function (r) {
      if (r === 'granted') { listen(); $('say').textContent = 'shake is on. shake the phone, tap shake, or press d.'; }
      else nomotion('motion was not allowed. tap shake instead.');
    }).catch(function () { nomotion('motion is not available here. tap shake instead.'); });
  });
} else if (DM) listen();
setTimeout(function () { if (!S.got) $('nophone').hidden = false; }, 1500);
// a tap on shake is a play press: sound comes on, as it does for the strip's play pill
$('dl').addEventListener('click', function () { WK.setSound(true); S.last = 0; shakeNow(); });
$('nc').addEventListener('click', function () { if (!S.seq.length) { setNow('shake first, then step through the clips.'); return; } hearSeq(S.seq, Math.min(S.seq.length - 1, S.sk + 1)); });
$('ea').addEventListener('click', function () {
  if (S.deals.length < 2) { setNow('shake at least twice to step back.'); return; }
  S.view = (S.view < 0 ? S.deals.length - 1 : S.view) - 1; if (S.view < 0) S.view = S.deals.length - 1;
  var d = S.deals[S.view]; render();
  hearSeq([{ i: d.t, col: PAL.amber, label: 'shuffle landed' }, { i: d.p, col: PAL.mint, label: 'my press' }], 0);
});
$('sr').addEventListener('click', function () { S.tok++; S.seq = []; S.sk = -1; S.view = -1; WK.stop(); WK.still(); S.hear = null; S.deals = []; S.cur = startAt(); setNow('tap shake to hear where shuffle landed, then my press.'); render(); });
addEventListener('keydown', function (e) { if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey && !e.altKey) { WK.setSound(true); S.last = 0; shakeNow(); } });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; PV = a[1];
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.6, tap: function (i) { hearOf(i, WK.FAMC[D.fam[D.f[i]]] || PAL.ice); } }); MAP.resize(); S.cur = startAt(); render();
  var sc = document.getElementById('wk-snd'); if (sc) sc.addEventListener('click', function () { setTimeout(function () { render(); if (NOW.t) setNow(NOW.t, NOW.s); }, 0); });
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
