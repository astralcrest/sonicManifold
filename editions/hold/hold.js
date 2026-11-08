(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, PV = null;
var cv = $('cv'), HOLD_MS = 2000, COUNT = 12;
// st: 0 upcoming, 1 kept, 2 skipped
var S = { list: [], st: [], k: 0, t0: 0, held: false, kept: false, raf: 0, done: false, phase: 'idle', tok: 0, heard: false, ended: false };

function deal() {
  var pool = M.order.slice(0, 200).filter(function (i) { return PV && PV[i]; }), out = [], n;
  while (out.length < COUNT && pool.length) { n = Math.floor(Math.random() * pool.length); out.push(pool.splice(n, 1)[0]); }
  S.list = out; S.st = out.map(function () { return 0; }); S.k = 0; S.held = false; S.kept = false; S.done = false; S.phase = 'idle'; S.heard = false; S.tok++;
  WK.stop(); WK.still(); $('hold').classList.remove('go'); setBar(0); $('now').textContent = ''; render();
}
function setBar(f) { $('bar').firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + '%'; }
function keptN() { return S.st.filter(function (x) { return x === 1; }).length; }

function nextName() { var n = S.list[S.k + 1]; return n == null ? null : D.n[n]; }
function setBtn(t) { $('hold').textContent = t; }
function advance() {
  S.k++; S.held = false; S.kept = false; S.ended = false; S.heard = false; setBar(0);
  if (S.k >= S.list.length) { S.done = true; S.phase = 'idle'; WK.still(); render(); return; }
  render(); startClip();
}
function startClip() {
  var i = S.list[S.k], my = ++S.tok;
  S.phase = 'playing'; S.heard = false; render();
  WK.play([{ i: i, tag: 'a' }], function (k, info) {
    if (my !== S.tok) return;
    if (k < 0) {
      WK.still();
      if (!S.heard) { S.phase = 'idle'; render(); $('say').textContent = 'that clip did not load. press play to try again.'; return; }
      if (S.held) { S.ended = true; return; }
      S.st[S.k] = 2; advance(); return;
    }
    S.heard = true;
    $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[i] + (nextName() ? '. next up: ' + nextName() + '.' : '. last song.');
    WK.live(draw);
  });
}
function tick() {
  if (!S.held) return;
  var f = (performance.now() - S.t0) / HOLD_MS;
  if (f >= 1 && !S.kept) { S.kept = true; S.st[S.k] = 1; f = 1; render(); }
  setBar(f);
  S.raf = requestAnimationFrame(tick);
}
function press() {
  if (S.held || S.done) return;
  if (S.phase !== 'playing') { startClip(); return; }
  S.held = true; S.kept = false; S.t0 = performance.now();
  $('hold').classList.add('go'); $('hold').setAttribute('aria-pressed', 'true'); render();
  S.raf = requestAnimationFrame(tick);
}
function release() {
  if (!S.held) return;
  cancelAnimationFrame(S.raf); S.tok++; WK.stop(); WK.still();
  $('hold').classList.remove('go'); $('hold').setAttribute('aria-pressed', 'false');
  if (!S.kept) S.st[S.k] = 2;
  advance();
}
function skip() { if (S.done || S.held) return; S.tok++; WK.stop(); WK.still(); S.st[S.k] = 2; advance(); }

function render() {
  var K = keptN(), i = S.list[S.k], n = S.k + 1, nm = S.done ? '' : D.n[i];
  $('num').textContent = K;
  $('song').innerHTML = S.done ? '&nbsp;' : WK.esc(nm);
  $('hold').disabled = S.done; $('sk').disabled = S.done || S.held;
  if (S.done) { $('say').textContent = 'you kept ' + K + ' of 12. in my log, 42 of 100 songs i started myself stayed, and 16 of 100 of auto-play\'s. this one is a toy.'; setBtn('all 12 heard'); return; }
  if (S.phase !== 'playing') { $('say').textContent = 'press play to hear song ' + n + ' of 12: ' + nm + '. then decide.'; setBtn('play song ' + n + ' of 12'); }
  else if (S.held && S.kept) { $('say').textContent = 'kept: song ' + n + ' of 12, ' + nm + '. let go for the next one.'; setBtn('kept. let go for next'); }
  else if (S.held) { $('say').textContent = 'keeping song ' + n + ' of 12: ' + nm + '. hold two seconds. let go = skip.'; setBtn('keeping... keep holding'); }
  else { $('say').textContent = 'song ' + n + ' of 12 is playing: ' + nm + '. like it? hold to keep. let go = skip.'; setBtn('hold to keep song ' + n); }
  draw();
}

function draw() {
  MAP.begin();
  var g = MAP.g, k, i, x, y;
  S.list.forEach(function (a, n) {
    x = MAP.X(a); y = MAP.Y(a);
    if (S.st[n] === 1) { P.peb(g, a, x, y, 9, WK.FAMC[D.fam[D.f[a]]] || PAL.mint); P.glyph(g, 'star', x, y, 12, PAL.mint); }
    else if (S.st[n] === 2) P.glyph(g, 'dot', x, y, 3, '#3a3052');
    else if (n !== S.k) P.glyph(g, 'ring', x, y, 9, '#6f6790');
  });
  if (!S.done && S.list.length) {
    i = S.list[S.k]; x = MAP.X(i); y = MAP.Y(i);
    P.peb(g, i, x, y, 10, PAL.ink); P.rings(g, x, y, PAL.ink, 22);
    if (S.phase === 'playing') WK.pulse(g, x, y, PAL.mint, 18);
  }
}

function tap(i) {
  var n = S.list.indexOf(i);
  if (S.done || S.held || n <= S.k) return;
  var t = S.list[S.k]; S.list[S.k] = i; S.list[n] = t; S.tok++; WK.stop(); startClip();
}
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });
var hb = $('hold');
hb.addEventListener('pointerdown', function (e) { e.preventDefault(); try { hb.setPointerCapture(e.pointerId); } catch (x) {} press(); });
hb.addEventListener('pointerup', release); hb.addEventListener('pointercancel', release);
hb.addEventListener('contextmenu', function (e) { e.preventDefault(); });
addEventListener('keydown', function (e) { if (e.code === 'Space' && !e.repeat && !/BUTTON|INPUT/.test((e.target || {}).tagName || '')) { e.preventDefault(); press(); } });
addEventListener('keyup', function (e) { if (e.code === 'Space') release(); });
$('again').addEventListener('click', deal);
$('sk').addEventListener('click', skip);

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; PV = a[1];
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5, tap: tap }); MAP.resize(); deal();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
