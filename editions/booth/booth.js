(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var claims = [], order = [], pos = -1, shown = [], timers = [], idle = 0, autoOn = false, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var go = $('go'), claimEl = $('claim'), refEl = $('ref'), reft = $('reft'), row = $('row'), cnt = $('cnt'), room = $('room'), sig = $('sig'), sg = sig.getContext('2d');
var BED = new Audio('../../audio/bed/brain-rm-rf.mp3'); BED.loop = true; BED.volume = 0.14; BED.preload = 'none';
var PAL = { amber: '#f5a623', rose: '#ff5c7a', mute: '#9a90b8', line: '#2a2140' }, cur = { n: 0, killed: false };

function shuffle() {
  order = claims.map(function (_, i) { return i; });
  for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
  pos = -1; shown = [];
}
function clear() { timers.forEach(clearTimeout); timers = []; WK.still(); }
function say(t) { $('now').textContent = t; }
function draw(c) {
  row.innerHTML = '';
  claims.forEach(function (_, i) {
    var s = document.createElement('i'); if (i === c) s.className = 'now'; else if (shown.indexOf(i) >= 0) s.className = 'dead';
    s.title = 'claim ' + (i + 1); s.addEventListener('click', function () { jump(i); }); row.appendChild(s);
  });
  var n = shown.length;
  cnt.innerHTML = n ? n + ' of ' + claims.length : '<span class="c">none read yet</span>';
}
function type(el, text, speed, done) {
  if (reduce) { el.textContent = text; done && done(); return; }
  var n = 0;
  (function step() { n++; el.textContent = text.slice(0, n); if (n < text.length) timers.push(setTimeout(step, speed)); else done && done(); })();
}
function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function soundLine(c) { return WK.sound() ? 'now playing: one of my own tracks, low, under the words. claim ' + c + ' of ' + claims.length + '.' : 'sound is off. tap the chip at the top to hear one of my own tracks under the words. claim ' + c + ' of ' + claims.length + '.'; }
// the amber ribbon is the lift i wanted; the rose pebbles and flat ribbon are what the check found, a pulse at its end on the beat of the track
function picture(n, killed, u) {
  cur = { n: n, killed: killed };
  var dpr = Math.min(3, devicePixelRatio || 1), W = sig.clientWidth || 600, H = 150, r = rng(7919 * (n + 1)), k, x, y, P = WK.P;
  sig.width = Math.round(W * dpr); sig.height = Math.round(H * dpr); sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  sg.clearRect(0, 0, W, H);
  var x0 = 10, x1 = W - 10, y0 = H - 34, amp = 30 + 50 * r(), bend = 0.6 + 0.8 * r(), ph = r() * 6.28;
  sg.save(); sg.strokeStyle = PAL.line; sg.lineWidth = 1; sg.beginPath(); sg.moveTo(x0, y0); sg.lineTo(x1, y0); sg.stroke();
  sg.font = '500 11px "IBM Plex Mono", monospace'; sg.fillStyle = PAL.mute; sg.textAlign = 'left'; sg.fillText('zero: no effect', x0, H - 16);
  sg.textAlign = 'right'; sg.fillText('read ' + shown.length + ' of ' + claims.length, x1, H - 16);
  sg.restore();
  var pts = []; for (k = 0; k <= 12; k++) { var f = k / 12; x = x0 + (x1 - x0) * f; y = y0 - amp * Math.pow(f, bend) - 6 * Math.sin(ph + f * 28); pts.push([x, y]); }
  P.ribbon(sg, pts, PAL.amber, PAL.amber, 3, killed ? 0.4 : 1, killed ? [5, 6] : null);
  sg.save(); sg.fillStyle = PAL.amber; sg.font = '500 11px "IBM Plex Mono", monospace'; sg.textAlign = 'right'; sg.globalAlpha = killed ? 0.6 : 1; sg.fillText('what i wanted: a lift', x1, pts[12][1] - 10); sg.restore();
  if (!killed) return;
  var m = Math.min(1, u), r2 = rng(104729 * (n + 1)), nn = Math.round(26 * m);
  for (k = 0; k < nn; k++) { x = x0 + (x1 - x0) * (k + 0.5) / 26; y = y0 + (r2() - 0.5) * 16; P.peb(sg, 40 + k + n, x, y, 3 + 2 * r2(), PAL.rose); }
  P.ribbon(sg, [[x0, y0], [x0 + (x1 - x0) * m / 2, y0 - 1.5], [x0 + (x1 - x0) * m, y0]], PAL.rose, PAL.rose, 2.4, 0.9);
  if (m >= 1) {
    sg.save(); sg.fillStyle = PAL.rose; sg.font = '500 11px "IBM Plex Mono", monospace'; sg.textAlign = 'left'; sg.fillText('what the check found: flat', x0, y0 + 26); sg.restore();
    if (!BED.paused && WK.sound()) WK.pulse(sg, x1, y0, PAL.rose, 9);
  }
}
function bump() { clearTimeout(idle); idle = setTimeout(reset, 120000); }
function bed() { if (BED.paused) { var p = BED.play(); if (p && p.catch) p.catch(function () {}); } }
function show(i, fromAuto) {
  bump(); clear(); bed();
  var c = claims[i];
  if (shown.indexOf(i) < 0) shown.push(i);
  var at = order.indexOf(i); if (at >= 0) pos = at;
  draw(i);
  room.dataset.lit = String(Math.min(3, 1 + Math.floor(shown.length / 6)));
  claimEl.textContent = ''; reft.textContent = ''; refEl.classList.remove('on');
  say(soundLine(i + 1));
  picture(c.n, false, 0);
    type(claimEl, c.claim, reduce ? 0 : 24, function () {
    timers.push(setTimeout(function () {
      refEl.classList.add('on');
      var t0 = performance.now(), len = c.referee.length * 14;
      (function grow() {
        var u = Math.min(1, (performance.now() - t0) / Math.max(600, len)); picture(c.n, true, reduce ? 1 : u);
        if (u < 1) timers.push(setTimeout(grow, 40)); else { if (!reduce) WK.live(function () { picture(c.n, true, 1); }); if (autoOn) timers.push(setTimeout(nextAuto, 5000)); }
      })();
      type(reft, c.referee, 14);
    }, reduce ? 0 : 900));
  });
}
function nextAuto() { if (!autoOn) return; if (shown.length >= claims.length) { setAuto(false); say('that was all sixteen. every one was killed. press start over to go again.'); return; } step(1); }
function step(d) {
  var n = order.length, p = -1, k;
  if (d < 0) p = pos - 1;
  else { for (k = 1; k <= n; k++) { var q = (pos + k + n) % n; if (shown.indexOf(order[q]) < 0) { p = q; break; } } if (p < 0) p = (pos + 1 + n) % n; }
  if (p < 0) return;
  show(order[p]);
}
function jump(i) { setAuto(false); show(i); }
function setAuto(on) { autoOn = on; $('auto').setAttribute('aria-pressed', on ? 'true' : 'false'); $('auto').textContent = on ? 'stop reading' : 'read all sixteen'; $('auto').classList.toggle('on', on); }
function reset() {
  clear(); setAuto(false); shuffle(); claimEl.textContent = ''; reft.textContent = ''; refEl.classList.remove('on');
  room.dataset.lit = '0'; draw(-1); go.textContent = 'next claim'; clearTimeout(idle); sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, sig.width, sig.height);
  say('sound is off. tap the chip at the top to hear one of my own tracks under the words. arrow keys step through the claims; tap any dot to jump.');
  try { BED.pause(); BED.currentTime = 0; } catch (e) {}
}
go.addEventListener('click', function () { setAuto(false); step(1); });
$('back').addEventListener('click', function () { setAuto(false); if (pos > 0) step(-1); });
$('auto').addEventListener('click', function () { if (autoOn) { setAuto(false); return; } setAuto(true); if (shown.length >= claims.length) { shown = []; } if (!refEl.classList.contains('on') && pos >= 0) { return; } step(1); });
$('reset').addEventListener('click', reset);
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowRight') { setAuto(false); step(1); } else if (e.key === 'ArrowLeft') { setAuto(false); if (pos > 0) step(-1); }
});
addEventListener('resize', function () { if (pos >= 0 && cur.n) picture(cur.n, refEl.classList.contains('on'), 1); });
fetch('claims.json').then(function (r) { return r.json(); }).then(function (d) { claims = d.claims; reset(); });
})();
