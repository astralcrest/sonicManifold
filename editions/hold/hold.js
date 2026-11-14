(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, PV = null;
var cv = $('cv'), HOLD_MS = 2000, COUNT = 12, HINT = $('now').textContent;
// st: 0 upcoming, 1 kept, 2 skipped
var S = { list: [], st: [], k: 0, t0: 0, held: false, kept: false, raf: 0, done: false, phase: 'idle', tok: 0, heard: false, ended: false };

function deal() {
  var pool = M.order.slice(0, 200).filter(function (i) { return PV && PV[i]; }), out = [], n;
  while (out.length < COUNT && pool.length) { n = Math.floor(Math.random() * pool.length); out.push(pool.splice(n, 1)[0]); }
  S.list = out; S.st = out.map(function () { return 0; }); S.k = 0; S.held = false; S.kept = false; S.done = false; S.phase = 'idle'; S.heard = false; S.tok++; $('home').hidden = true;
  WK.stop(); WK.still(); $('hold').classList.remove('go'); setBar(0); $('now').textContent = HINT; render();
}
function setBar(f) { $('bar').firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + '%'; }
function fam(i) { return D.fam[D.f[i]]; }
function fcol(i) { return WK.FAMC[fam(i)] || PAL.ice; }
function decided() { return S.st.some(function (x) { return x !== 0; }); }
function snd() { return WK.sound() ? '' : ' sound is off: tap the sound chip at the top.'; }
function keptN() { return S.st.filter(function (x) { return x === 1; }).length; }

function keptNames() { var o = []; S.list.forEach(function (a, n) { if (S.st[n] === 1) o.push(D.n[a]); }); return o.length ? ': ' + o.join(', ') : ''; }
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
    var pf = S.k > 0 ? S.list[S.k - 1] : null, fc = pf == null ? '' : (fam(pf) !== fam(i) ? ' family change from ' + fam(pf) + '.' : ' same family as the last song.');
    $('now').textContent = 'song ' + (S.k + 1) + ' of 12.' + fc + (nextName() ? ' next up: ' + nextName() + '.' : ' last song.');
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
  if (!D || S.held || S.done) return;
  if (S.phase !== 'playing') { WK.setSound(true); startClip(); return; }
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
  WK.famKey($('fams'), D, S.list);
  $('num').innerHTML = decided() ? K : '<span class="c">none decided yet</span>';
  var tt = S.done ? null : (PV[i] && PV[i][0]);
  $('song').innerHTML = S.done ? '&nbsp;' : WK.esc(tt || nm); $('by').textContent = tt ? nm : '';
  $('hold').disabled = S.done; $('sk').disabled = S.done || S.held;
  if (S.done) { var kl = S.list.filter(function (a, n) { return S.st[n] === 1; }), hm = $('home'); hm.hidden = false; hm.setAttribute('href', '../print/stub.html#a=' + (kl.length ? kl[kl.length - 1] : S.list[S.list.length - 1]) + '&k=' + K); }
  if (S.done) { $('say').textContent = 'you kept ' + K + ' of 12' + keptNames() + '. of new songs i pressed, 42 of 100 ended up in my library; of auto-play\'s, 16 (my numbers, in-sample). this one is a toy.'; setBtn('all 12 heard'); draw(); return; }
  if (S.phase !== 'playing') { $('say').textContent = 'press play to hear song ' + n + ' of 12: ' + nm + ' (' + fam(i) + ', ' + D.pl[i] + ' plays in my log). then decide.'; setBtn('play song ' + n + ' of 12'); }
  else if (S.held && S.kept) { $('say').textContent = 'kept: song ' + n + ' of 12, ' + nm + '. let go for the next one.'; setBtn('kept. let go for next'); }
  else if (S.held) { $('say').textContent = 'keeping song ' + n + ' of 12: ' + nm + '. hold two seconds. let go = skip.'; setBtn('keeping... keep holding'); }
  else { $('say').textContent = 'song ' + n + ' of 12 is playing: ' + nm + '. like it? hold to keep. let go = skip.' + snd(); setBtn('hold to keep song ' + n); }
  draw();
}

function draw() {
  MAP.begin();
  var g = MAP.g, k, i, x, y, pts = MAP.pts(S.list), cur = Math.min(S.k, S.list.length - 1);
  if (pts.length > 1) {
    P.ribbon(g, pts, PAL.ice, PAL.ice, 1.2, 0.22, [3, 5]);
    if (cur > 0) P.ribbon(g, pts.slice(0, cur + 1), PAL.ink, PAL.ink, 2.6, 0.9);
  }
  S.list.forEach(function (a, n) {
    x = MAP.X(a); y = MAP.Y(a);
    // what you kept is yours, so ink: the family pebble inside a solid ink ring (mint and the star mean my press on every wall)
    if (S.st[n] === 1) { P.peb(g, a, x, y, 9, fcol(a)); g.save(); g.strokeStyle = PAL.ink; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 13, 0, 6.2832); g.stroke(); g.restore(); }
    else if (S.st[n] === 2) P.glyph(g, 'dot', x, y, 3, '#3a3052');
    else if (n !== S.k) { P.peb(g, a, x, y, 3.5 + 3 * Math.log(1 + D.pl[a]) / Math.log(1 + D.pl[M.order[0]]), fcol(a)); g.save(); g.globalAlpha = 0.35; P.glyph(g, 'ring', x, y, 9, PAL.ink); g.restore(); }
  });
  if (!S.done && S.list.length) {
    i = S.list[S.k]; x = MAP.X(i); y = MAP.Y(i);
    P.peb(g, i, x, y, 10, fcol(i)); P.rings(g, x, y, PAL.ink, 22);
    if (S.phase === 'playing') WK.pulse(g, x, y, PAL.ink, 18);
  }
  // the name chips go on last, so no pebble, ring or pulse lands on their words; the current one on top
  k = S.k + 1;
  if (!S.done && k < S.list.length && S.st[k] !== 1 && S.st[k] !== 2) MAP.tag(S.list[k], 'next ' + D.n[S.list[k]], '#9a90b8');
  if (!S.done && S.list.length) MAP.tag(S.list[S.k], (S.k + 1) + '/12 ' + D.n[S.list[S.k]], PAL.ink);
}

// a tap takes the nearest upcoming song of the deal, not the nearest of all artists (too dense to hit on a phone)
function tap(e) {
  if (!MAP || S.done || S.held) return;
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, n, best = -1, bd = 28 * 28, dx, dy, d;
  for (n = S.k + 1; n < S.list.length; n++) { dx = MAP.X(S.list[n]) - x; dy = MAP.Y(S.list[n]) - y; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = n; } }
  if (best < 0) return;
  var t = S.list[S.k]; S.list[S.k] = S.list[best]; S.list[best] = t; S.tok++; WK.stop(); startClip();
}
cv.addEventListener('pointerdown', tap);
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); draw(); }, 80); });
var hb = $('hold');
hb.addEventListener('pointerdown', function (e) { e.preventDefault(); try { hb.setPointerCapture(e.pointerId); } catch (x) {} press(); });
hb.addEventListener('pointerup', release); hb.addEventListener('pointercancel', release);
hb.addEventListener('contextmenu', function (e) { e.preventDefault(); });
// the strip's play pill and the front's autostart arrive as a plain click; the pointer path is already 'playing' by then
hb.addEventListener('click', function () { if (D && S.phase !== 'playing' && !S.done && !S.held) { WK.setSound(true); startClip(); } });
// space is the hold on every target, so a focused button never fires on it
function typing(t) { return t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName || '') || t.isContentEditable); }
addEventListener('keydown', function (e) {
  if (e.code !== 'Space' || typing(e.target)) return;
  e.preventDefault(); var a = document.activeElement; if (a && a !== hb && a !== document.body && a.blur) a.blur();
  if (!e.repeat) press();
}, true);
addEventListener('keyup', function (e) { if (e.code === 'Space' && !typing(e.target)) { e.preventDefault(); release(); } }, true);
hb.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } });
hb.addEventListener('keyup', function (e) { if (e.key === 'Enter') release(); });
$('again').addEventListener('click', deal);
$('sk').addEventListener('click', skip);
var sc = document.getElementById('wk-snd'); if (sc) sc.addEventListener('click', function () { setTimeout(function () { if (D) render(); }, 0); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; PV = a[1];
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5 }); MAP.resize(); deal();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
