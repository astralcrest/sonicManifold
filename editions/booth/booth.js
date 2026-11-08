(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
var claims = [], order = [], pos = -1, shown = [], timers = [], idle = 0, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var go = $('go'), claimEl = $('claim'), refEl = $('ref'), reft = $('reft'), row = $('row'), cnt = $('cnt'), room = $('room'), sig = $('sig'), sg = sig.getContext('2d');
// the booth plays a track of mine, low, under the words
var BED = new Audio('../../audio/bed/brain-rm-rf.mp3'); BED.loop = true; BED.volume = 0.14; BED.preload = 'none';

function shuffle() {
  order = claims.map(function (_, i) { return i; });
  for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
  pos = -1; shown = [];
}
function clear() { timers.forEach(clearTimeout); timers = []; }
function draw(cur) {
  row.innerHTML = '';
  claims.forEach(function (_, i) { var s = document.createElement('i'); if (i === cur) s.className = 'now'; else if (shown.indexOf(i) >= 0) s.className = 'dead'; row.appendChild(s); });
  cnt.textContent = claims.length;
}
function type(el, text, speed, done) {
  if (reduce) { el.textContent = text; done && done(); return; }
  var n = 0;
  (function step() { n++; el.textContent = text.slice(0, n); if (n < text.length) timers.push(setTimeout(step, speed)); else done && done(); })();
}
function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// one picture per claim: the lift i wanted (amber, rising), then what the check found (rose, flat on zero)
function picture(n, killed, u) {
  var dpr = Math.min(3, devicePixelRatio || 1), W = sig.clientWidth || 600, H = 150, r = rng(7919 * (n + 1)), k, x, y;
  sig.width = Math.round(W * dpr); sig.height = Math.round(H * dpr); sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  sg.clearRect(0, 0, W, H);
  var x0 = 8, x1 = W - 8, y0 = H - 34, amp = 30 + 50 * r(), bend = 0.6 + 0.8 * r(), ph = r() * 6.28;
  sg.save(); sg.strokeStyle = '#2a2140'; sg.lineWidth = 1; sg.beginPath(); sg.moveTo(x0, y0); sg.lineTo(x1, y0); sg.stroke();
  sg.font = '500 11px "IBM Plex Mono", monospace'; sg.fillStyle = '#9a90b8'; sg.textAlign = 'left'; sg.fillText('zero: no effect', x0, H - 16);
  sg.restore();
  var pts = []; for (k = 0; k <= 40; k++) { x = x0 + (x1 - x0) * k / 40; y = y0 - amp * Math.pow(k / 40, bend) - 6 * Math.sin(ph + k * 0.7); pts.push([x, y]); }
  sg.save(); sg.strokeStyle = '#f5a623'; sg.lineWidth = 2.4; sg.lineJoin = 'round'; sg.globalAlpha = killed ? 0.35 : 1; if (killed) sg.setLineDash([5, 6]);
  sg.beginPath(); pts.forEach(function (p, i) { if (i) sg.lineTo(p[0], p[1]); else sg.moveTo(p[0], p[1]); }); sg.stroke();
  sg.setLineDash([]); sg.fillStyle = '#f5a623'; sg.font = '500 11px "IBM Plex Mono", monospace'; sg.textAlign = 'right'; sg.fillText('what i wanted: a lift', x1, pts[40][1] - 10); sg.restore();
  if (!killed) return;
  var m = Math.min(1, u);
  sg.save(); sg.fillStyle = '#ff6f91'; sg.strokeStyle = '#ff6f91'; sg.lineWidth = 2;
  var r2 = rng(104729 * (n + 1)), nn = Math.round(26 * m);
  for (k = 0; k < nn; k++) { x = x0 + (x1 - x0) * (k + 0.5) / 26; y = y0 + (r2() - 0.5) * 16; sg.beginPath(); sg.moveTo(x, y - 3.5); sg.lineTo(x + 3.5, y); sg.lineTo(x, y + 3.5); sg.lineTo(x - 3.5, y); sg.closePath(); sg.fill(); }
  sg.globalAlpha = 0.9; sg.beginPath(); sg.moveTo(x0, y0); sg.lineTo(x0 + (x1 - x0) * m, y0); sg.stroke();
  if (m >= 1) { sg.font = '500 11px "IBM Plex Mono", monospace'; sg.textAlign = 'left'; sg.fillText('what the check found: flat', x0, y0 + 26); }
  sg.restore();
}
function bump() { clearTimeout(idle); idle = setTimeout(reset, 120000); }
function bed() { if (BED.paused) { var p = BED.play(); if (p && p.catch) p.catch(function () {}); } }
function confess() {
  bump(); clear(); bed();
  if (pos + 1 >= order.length) shuffle();
  pos++; var i = order[pos], c = claims[i];
  shown.push(i); draw(i);
  room.dataset.lit = String(Math.min(3, 1 + Math.floor(shown.length / 6)));
  claimEl.textContent = ''; reft.textContent = ''; refEl.classList.remove('on');
  picture(c.n, false, 0);
  type(claimEl, c.claim, 28, function () {
    timers.push(setTimeout(function () {
      refEl.classList.add('on');
      var t0 = performance.now(), len = c.referee.length * 14;
      (function grow() { var u = Math.min(1, (performance.now() - t0) / Math.max(600, len)); picture(c.n, true, reduce ? 1 : u); if (u < 1) timers.push(setTimeout(grow, 40)); })();
      type(reft, c.referee, 14);
    }, reduce ? 0 : 900));
  });
}
function reset() {
  clear(); shuffle(); claimEl.textContent = ''; reft.textContent = ''; refEl.classList.remove('on');
  room.dataset.lit = '0'; draw(-1); go.textContent = 'confess'; clearTimeout(idle); sg.clearRect(0, 0, sig.width, sig.height);
  try { BED.pause(); BED.currentTime = 0; } catch (e) {}
}
go.addEventListener('click', function () { confess(); go.textContent = 'confess again'; });
$('reset').addEventListener('click', reset);
addEventListener('resize', function () { if (pos >= 0) picture(claims[order[pos]].n, refEl.classList.contains('on'), 1); });
fetch('claims.json').then(function (r) { return r.json(); }).then(function (d) { claims = d.claims; reset(); });
})();
