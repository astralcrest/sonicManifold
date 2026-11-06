(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, LOOP, FIT, MAP, cv = $('cv');
var COOL = 3000, REFRACT = 280, SCALE = 0.5, LEN = 70;
var S = { L: [], idx: 0, active: false, level: 0, base: 0.02, lastClap: 0, lastAdv: 0, flash: 0, c: 0, s: 0, token: 0, dirty: true };
var A = { ctx: null, an: null, st: null, buf: null };

function key() { var d = new Date(); return 'sm_applause_' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function load() { try { var v = JSON.parse(localStorage.getItem(key()) || 'null'); if (v) { S.c = v.c | 0; S.s = v.s | 0; } } catch (e) {} }
function save() { try { localStorage.setItem(key(), JSON.stringify({ c: S.c, s: S.s })); } catch (e) {} }

function out(msg) {
  $('num').innerHTML = '<span class="r">' + S.c + '</span> <span class="c">/</span> <span class="g">' + S.s + '</span>';
  if (msg) $('say').textContent = msg;
  else $('say').textContent = 'claps tonight ' + S.c + ', songs advanced ' + S.s + ', on this tablet only.';
}
function thr() { return +$('thr').value / 100; }

function playCur() {
  var my = ++S.token;
  if (!S.active) return;
  WK.play([{ i: S.L[S.idx], tag: 'a' }], function (k, info) {
    if (my !== S.token) return;
    if (k < 0) { setTimeout(function () { if (my === S.token && S.active) playCur(); }, 400); return; }
    $('now').textContent = 'now: ' + info.title + ' (' + D.n[info.i] + ')' + (WK.sound() ? '' : '. sound is off; tap the sound chip to hear it.');
  });
}
function advance() {
  S.idx = Math.min(S.L.length - 1, S.idx + 1); S.s++; S.lastAdv = performance.now(); save(); S.dirty = true; playCur(); out();
}
function clap(now) {
  S.c++; S.lastClap = now; S.flash = now; S.dirty = true;
  if (S.active && now - S.lastAdv > COOL) advance(); else { save(); out(S.active ? 'clap heard, waiting out the 3 second cooldown.' : null); }
}

function tick(now) {
  if (A.an) {
    A.an.getFloatTimeDomainData(A.buf);
    var s = 0, i; for (i = 0; i < A.buf.length; i++) s += A.buf[i] * A.buf[i];
    var rms = Math.sqrt(s / A.buf.length), m = Math.min(1, rms / SCALE);
    S.level = Math.max(m, S.level * 0.9);
    // the room's usual level creeps slowly; only quiet frames feed it, so a clap never raises its own bar
    if (m < thr()) S.base += (m - S.base) * 0.02;
    if (m > thr() && m > S.base * 3 && now - S.lastClap > REFRACT) clap(now);
    S.dirty = true;
  } else S.level *= 0.9;
  if (now - S.flash < 700) S.dirty = true;
  if (S.dirty) { draw(now); S.dirty = false; }
  requestAnimationFrame(tick);
}

function pt(i) { return [MAP.X(i), MAP.Y(i)]; }
function draw(now) {
  MAP.begin();
  var g = MAP.g, W = MAP.W, H = MAP.H, small = W < 500, k, a, b, from = Math.max(0, S.idx - 30), pts = [];
  for (k = from; k <= S.idx; k++) pts.push(pt(S.L[k]));
  if (pts.length > 1) P.ribbon(g, pts, PAL.violet, PAL.violet, small ? 1.8 : 2.4, 0.9);
  for (k = from; k < S.idx; k++) P.glyph(g, 'ring', pts[k - from][0], pts[k - from][1], small ? 4 : 5, PAL.violet);
  a = pt(S.L[S.idx]); P.glyph(g, 'ring', a[0], a[1], small ? 8 : 10, PAL.violet); P.rings(g, a[0], a[1], PAL.ink, 16);
  MAP.tag(S.L[S.idx], D.n[S.L[S.idx]], PAL.ink, PAL.night);
  var age = now - S.flash;
  if (age < 700) { g.save(); g.strokeStyle = PAL.rose; g.globalAlpha = 1 - age / 700; g.lineWidth = 3; g.beginPath(); g.arc(a[0], a[1], 20 + age / 700 * Math.min(W, H) * 0.35, 0, 6.2832); g.stroke(); g.restore(); }
  // the level meter: round capsules, ice under the bar, rose over it
  var x0 = 28, x1 = W - 28, y = H - 26, th = thr();
  g.save(); g.lineCap = 'round'; g.lineWidth = 10;
  g.strokeStyle = '#241b3a'; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  if (S.level > 0.01) { g.strokeStyle = S.level > th ? PAL.rose : PAL.ice; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + (x1 - x0) * Math.min(1, S.level), y); g.stroke(); }
  g.lineCap = 'butt'; g.lineWidth = 2; g.strokeStyle = PAL.amber; g.beginPath(); g.moveTo(x0 + (x1 - x0) * th, y - 12); g.lineTo(x0 + (x1 - x0) * th, y + 12); g.stroke();
  g.font = '500 11px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.globalAlpha = 0.75; g.textAlign = 'left'; g.fillText('room level', x0, y - 18);
  g.textAlign = 'right'; g.fillText('clap line', x1, y - 18); g.restore();
}

function listen() {
  if (A.st) { stopMic(); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { out('no mic here. use tap = clap.'); return; }
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } }).then(function (st) {
    var AC = window.AudioContext || window.webkitAudioContext;
    A.ctx = new AC(); A.st = st; A.an = A.ctx.createAnalyser(); A.an.fftSize = 1024; A.buf = new Float32Array(A.an.fftSize);
    A.ctx.createMediaStreamSource(st).connect(A.an);
    S.active = true; S.base = 0.02; $('listen').setAttribute('aria-pressed', 'true'); $('listen').textContent = 'stop listening';
    out('listening. clap to skip.'); playCur();
  }, function () { out('the mic was not allowed. use tap = clap.'); S.active = true; playCur(); });
}
function stopMic() {
  if (A.st) A.st.getTracks().forEach(function (t) { t.stop(); });
  if (A.ctx) try { A.ctx.close(); } catch (e) {}
  A.st = null; A.an = null; A.ctx = null; S.active = false; S.token++; WK.stop();
  $('listen').setAttribute('aria-pressed', 'false'); $('listen').textContent = 'listen'; out(); S.dirty = true;
}
$('listen').addEventListener('click', listen);
$('clap').addEventListener('click', function () {
  if (!S.active) { S.active = true; playCur(); }
  clap(performance.now());
});
$('zero').addEventListener('click', function () { S.c = 0; S.s = 0; save(); out(); });
$('thr').addEventListener('input', function () { S.dirty = true; });
window.addEventListener('pagehide', function () { if (A.st) stopMic(); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); S.dirty = true; }, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M; LOOP = b.LOOP; FIT = b.FIT;
  return WK.pv().then(function () {
    var path = LOOP.walk(M, M.order[5], FIT.queue.K, 20261106, 160).path;
    S.L = path.filter(function (i) { return WK.title(i); }).slice(0, LEN);
    if (S.L.length < 3) throw new Error('no previews');
    MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5 }); MAP.resize();
    load(); out();
    $('meta').textContent = 'data: ' + S.L.length + ' songs with previews along one auto-play walk through ' + D.n.length + ' artists.';
    requestAnimationFrame(tick);
  });
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
