(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var claims = [], order = [], pos = -1, shown = [], hist = [], timers = [], idle = 0, autoOn = false, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var go = $('go'), back = $('back'), claimEl = $('claim'), refEl = $('ref'), reft = $('reft'), row = $('row'), cnt = $('cnt'), room = $('room'), sig = $('sig'), sg = sig.getContext('2d');
var BED = new Audio('../../audio/bed/brain-rm-rf.mp3'); BED.loop = true; BED.volume = 0.14; BED.preload = 'none';
var PAL = { amber: '#efe9ff', rose: '#ff5c7a', mute: '#9a90b8', line: '#2a2140' }, cur = { c: null, killed: false }, H = 160, FONT = '500 11px "IBM Plex Mono", monospace';

function shuffle() {
  order = claims.map(function (_, i) { return i; });
  for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
  pos = -1; shown = []; hist = [];
}
function clear() { timers.forEach(clearTimeout); timers = []; WK.still(); }
function say(t) { $('now').textContent = t; }
function draw(c) {
  if (row.children.length !== claims.length) {
    row.innerHTML = '';
    claims.forEach(function (_, i) { var s = document.createElement('button'); s.type = 'button'; s.addEventListener('click', function () { jump(i); }); row.appendChild(s); });
  }
  Array.prototype.forEach.call(row.children, function (s, i) {
    var read = shown.indexOf(i) >= 0;
    s.className = i === c ? 'now' : read ? 'dead' : '';
    s.setAttribute('aria-label', 'claim ' + (i + 1) + (i === c ? ', showing' : read ? ', read' : ''));
    if (i === c) s.setAttribute('aria-current', 'true'); else s.removeAttribute('aria-current');
  });
  var n = shown.length;
  cnt.innerHTML = n ? n + ' of ' + claims.length : '<span class="c">none read yet</span>';
  back.disabled = hist.length < 2;
}
function type(el, text, speed, done) {
  if (reduce) { el.textContent = text; done && done(); return; }
  var n = 0;
  (function step() { n++; el.textContent = text.slice(0, n); if (n < text.length) timers.push(setTimeout(step, speed)); else done && done(); })();
}
function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function soundLine() { return WK.sound() ? 'now playing: one of my songs, low, under the words.' : 'sound off, tap to hear one of my songs under the words.'; }
// pale: what i hoped. rose: what the check found, in the claim's own shape (claims.json "shape"), with the grave's numbers under it.
// a sketch, not to scale, except "swing", which is drawn from the grave's own rates (19 hoped, 11.8 then 22.7 found)
function picture(c, killed, u) {
  cur = { c: c, killed: killed };
  var dpr = Math.min(3, devicePixelRatio || 1), W = sig.clientWidth || 600, r = rng(7919 * c.n), k, f, x, y, P = WK.P, sh = c.shape || 'gone';
  sig.width = Math.round(W * dpr); sig.height = Math.round(H * dpr); sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  sg.clearRect(0, 0, W, H);
  var x0 = 10, x1 = W - 30, y0 = H - 50, A = 60, bend = 0.6 + 0.8 * r(), ph = r() * 6.28;
  var yv = function (v) { return y0 - A * v / 22.7; };
  var fy = function (f) { return sh === 'swing' ? (f < 0.5 ? yv(11.8) : yv(22.7)) : sh === 'flip' ? y0 + 10 * Math.pow(f, 0.8) : sh === 'less' ? y0 - 0.12 * A * Math.pow(f, bend) : y0; };
  sg.save(); sg.strokeStyle = PAL.line; sg.lineWidth = 1; sg.beginPath(); sg.moveTo(x0, y0); sg.lineTo(x1, y0); sg.stroke(); sg.restore();
  var pts = []; for (k = 0; k <= 12; k++) { f = k / 12; x = x0 + (x1 - x0) * f; y = sh === 'swing' ? yv(19) - 2 * Math.sin(ph + f * 28) : y0 - A * Math.pow(f, bend) - 6 * Math.sin(ph + f * 28); pts.push([x, y]); }
  P.ribbon(sg, pts, PAL.amber, PAL.amber, 3, killed ? 0.4 : 1, killed ? [5, 6] : null);
  sg.save(); sg.fillStyle = PAL.amber; sg.font = FONT; sg.globalAlpha = killed ? 0.6 : 1;
  if (sh === 'swing') { sg.textAlign = 'left'; sg.fillText('what i hoped', x0, pts[0][1] - 10); } else { sg.textAlign = 'right'; sg.fillText('what i hoped', x1, pts[12][1] - 10); }
  sg.restore();
  if (!killed) return;
  var m = Math.min(1, u), r2 = rng(104729 * c.n), nn = Math.round(26 * m), jit = sh === 'gone' ? 16 : 10;
  for (k = 0; k < nn; k++) { f = (k + 0.5) / 26; x = x0 + (x1 - x0) * f; y = fy(f) + (r2() - 0.5) * jit; P.peb(sg, 40 + k + c.n, x, y, 3 + 2 * r2(), PAL.rose); }
  var rp = []; for (k = 0; k <= 12; k++) { f = m * k / 12; rp.push([x0 + (x1 - x0) * f, fy(f) - (sh === 'gone' ? 1.5 * Math.sin(Math.PI * k / 12) : 0)]); }
  P.ribbon(sg, rp, PAL.rose, PAL.rose, 2.4, 0.9);
  if (m >= 1) {
    sg.save(); sg.fillStyle = PAL.rose; sg.font = FONT; sg.textAlign = 'left'; sg.fillText('found: ' + c.found, x0, H - 4); sg.restore();
    if (!BED.paused && WK.sound()) WK.pulse(sg, x1, fy(1), PAL.rose, 9);
  }
}
function bump() { clearTimeout(idle); idle = setTimeout(reset, 120000); }
function bed() { if (BED.paused) { var p = BED.play(); if (p && p.catch) p.catch(function () {}); } }
// still: the first screen, one claim already typed with its finished sketch, no music until a press. fromBack: a step back through the reading history, so it is not pushed again
function show(i, still, fromBack) {
  clear(); if (!still) { bump(); bed(); }
  var c = claims[i];
  if (shown.indexOf(i) < 0) shown.push(i);
  if (!fromBack && hist[hist.length - 1] !== i) hist.push(i);
  var at = order.indexOf(i); if (at >= 0) pos = at;
  draw(i);
  room.dataset.lit = String(Math.min(3, 1 + Math.floor(shown.length / 6)));
  sig.setAttribute('aria-label', 'claim ' + c.n + ', a sketch: a pale line for what i hoped, a rose line for what the check found: ' + c.found + '.');
  if (still) { claimEl.textContent = c.claim; reft.textContent = c.referee; refEl.classList.add('on'); picture(c, true, 1); return; }
  claimEl.textContent = ''; reft.textContent = ''; refEl.classList.remove('on');
  say(soundLine());
  picture(c, false, 0);
  type(claimEl, c.claim, reduce ? 0 : 24, function () {
    timers.push(setTimeout(function () {
      refEl.classList.add('on');
      var t0 = performance.now(), len = c.referee.length * 14;
      (function grow() {
        var u = Math.min(1, (performance.now() - t0) / Math.max(600, len)); picture(c, true, reduce ? 1 : u);
        if (u < 1) timers.push(setTimeout(grow, 40)); else { if (!reduce) WK.live(function () { picture(c, true, 1); }); if (autoOn) timers.push(setTimeout(nextAuto, 5000)); }
      })();
      type(reft, c.referee, 14);
    }, reduce ? 0 : 900));
  });
}
function nextAuto() { if (!autoOn) return; if (shown.length >= claims.length) { setAuto(false); say('that was all sixteen, each killed as i wrote it. press start over to go again.'); return; } step(); }
function step() {
  var n = order.length, p = -1, k;
  for (k = 1; k <= n; k++) { var q = (pos + k + n) % n; if (shown.indexOf(order[q]) < 0) { p = q; break; } }
  if (p < 0) p = (pos + 1 + n) % n;
  show(order[p]);
}
function goBack() { setAuto(false); if (hist.length < 2) return; hist.pop(); show(hist[hist.length - 1], false, true); }
function jump(i) { setAuto(false); show(i); }
function setAuto(on) { autoOn = on; $('auto').setAttribute('aria-pressed', on ? 'true' : 'false'); $('auto').textContent = on ? 'stop reading' : 'read all sixteen'; $('auto').classList.toggle('on', on); }
function reset() {
  clear(); setAuto(false); shuffle();
  go.textContent = 'next claim'; clearTimeout(idle); show(order[0], true);
  say((WK.sound() ? 'sound on: one of my songs, low, under the words.' : 'sound off, tap to hear one of my songs under the words.') + ' arrow keys step through the claims; tap any dot to jump.');
  try { BED.pause(); BED.currentTime = 0; } catch (e) {}
}
go.addEventListener('click', function () { setAuto(false); step(); });
back.addEventListener('click', goBack);
$('auto').addEventListener('click', function () { if (autoOn) { setAuto(false); return; } setAuto(true); if (shown.length >= claims.length) { shown = []; } if (!refEl.classList.contains('on') && pos >= 0) { return; } step(); });
$('reset').addEventListener('click', reset);
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowRight') { setAuto(false); step(); } else if (e.key === 'ArrowLeft') goBack();
});
function redraw() { if (cur.c) picture(cur.c, refEl.classList.contains('on'), 1); }
addEventListener('resize', redraw);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
WK.primary(go);
fetch('claims.json').then(function (r) { return r.json(); }).then(function (d) { claims = d.claims; reset(); });
})();
