(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, LOOP, FIT, MAP, cv = $('cv');
var COOL = 3000, REFRACT = 280, SCALE = 0.2, LEN = 70;
var S = { L: [], idx: 0, active: false, level: 0, base: 0.02, lastClap: 0, lastAdv: 0, flash: 0, c: 0, s: 0, token: 0, dirty: true, tapI: -1 };
var A = { ctx: null, an: null, st: null, buf: null };

function key() { var d = new Date(); return 'sm_applause_' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function load() { try { var v = JSON.parse(localStorage.getItem(key()) || 'null'); if (v) { S.c = v.c | 0; S.s = v.s | 0; } } catch (e) {} }
function save() { try { localStorage.setItem(key(), JSON.stringify({ c: S.c, s: S.s })); } catch (e) {} }

function out(msg) {
  $('num').innerHTML = '<span class="r">' + S.c + '</span> <span class="c">/</span> <span class="g">' + S.s + '</span>';
  var step = S.active ? 'step ' + (S.idx + 1) + ' of ' + S.L.length + ': ' + D.n[S.L[S.idx]] + (S.L[S.idx + 1] != null ? ', then ' + D.n[S.L[S.idx + 1]] : ', the last one') + '.' : '';
  $('say').textContent = msg ? msg + (step ? ' ' + step : '') : (step || 'tap listen for claps, allow the mic, then clap. no mic? tap clap for me.');
}
function thr() { return +$('thr').value / 100; }

function famCol(i) { return WK.FAMC[D.fam[D.f[i]]] || PAL.ice; }
function rad(i, small) { return Math.max(3, Math.min(small ? 8 : 10, 2 + Math.log(1 + D.pl[i]) * 0.85)); }
function describe(i) {
  var prev = S.idx > 0 ? S.L[S.idx - 1] : -1, m = D.fam[D.f[i]];
  if (prev >= 0 && prev === i) m += ', same artist as the last song';
  else if (prev >= 0 && D.f[prev] !== D.f[i]) m += ', a change from ' + D.fam[D.f[prev]];
  return m;
}
function playCur() {
  var my = ++S.token; S.tapI = -1;
  if (!S.active) return;
  WK.play([{ i: S.L[S.idx], tag: 'a' }], function (k, info) {
    if (my !== S.token) return;
    if (k < 0) { WK.still(); setTimeout(function () { if (my === S.token && S.active) ended(); }, 400); return; }
    $('now').textContent = 'step ' + (S.idx + 1) + ' of ' + S.L.length + ': ' + info.title + ' by ' + D.n[info.i] + ', ' + describe(info.i) + WK.again(info) + (S.L[S.idx + 1] != null ? '. next: ' + D.n[S.L[S.idx + 1]] : '') + (WK.sound() ? '' : '. sound is off; tap the sound chip to hear it.');
    WK.live(function () { S.dirty = true; });
  });
}
function ended() { S.idx = (S.idx + 1) % S.L.length; S.dirty = true; playCur(); out('the song ended, so auto-play moved on by itself. that does not count as a skip.'); }
function step(count) {
  S.idx = Math.max(0, Math.min(S.L.length - 1, S.idx + 1)); S.lastAdv = performance.now();
  if (count) { S.s++; save(); }
  S.dirty = true; playCur(); out();
}
function advance() { step(true); }
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
  var g = MAP.g, W = MAP.W, H = MAP.H, small = W < 500, k, a, b, from = Math.max(0, S.idx - 30), pts = [], to = Math.min(S.L.length - 1, S.idx + 8), ahead = [];
  for (k = from; k <= S.idx; k++) pts.push(pt(S.L[k]));
  for (k = S.idx; k <= to; k++) ahead.push(pt(S.L[k]));
  if (ahead.length > 1) P.ribbon(g, ahead, PAL.violet, PAL.violet, 1.4, 0.35, [3, 5]);
  if (pts.length > 1) P.ribbon(g, pts, PAL.violet, PAL.violet, small ? 1.8 : 2.4, 0.9);
  for (k = S.idx + 1; k <= to; k++) { b = pt(S.L[k]); g.save(); g.globalAlpha = 0.3; P.peb(g, S.L[k], b[0], b[1], rad(S.L[k], small), famCol(S.L[k])); g.restore(); g.save(); g.globalAlpha = 0.5; P.glyph(g, 'ring', b[0], b[1], small ? 3.5 : 4.5, PAL.violet); g.restore(); }
  for (k = from; k < S.idx; k++) {
    var ft = 0.35 + 0.65 * (k - from) / Math.max(1, S.idx - from);
    g.save(); g.globalAlpha = 0.75 * ft; P.peb(g, S.L[k], pts[k - from][0], pts[k - from][1], rad(S.L[k], small), famCol(S.L[k])); g.restore();
    g.save(); g.globalAlpha = ft; P.glyph(g, 'ring', pts[k - from][0], pts[k - from][1], small ? 4 : 5, PAL.violet); g.restore();
  }
  a = pt(S.L[S.idx]); P.peb(g, S.L[S.idx], a[0], a[1], rad(S.L[S.idx], small) + 2, famCol(S.L[S.idx])); P.glyph(g, 'ring', a[0], a[1], small ? 8 : 10, PAL.violet); P.rings(g, a[0], a[1], PAL.ink, 16);
  if (WK.playing()) { if (S.tapI >= 0) { b = pt(S.tapI); P.peb(g, S.tapI, b[0], b[1], 8, famCol(S.tapI)); WK.pulse(g, b[0], b[1], PAL.mint, 14); } else WK.pulse(g, a[0], a[1], PAL.violet, 16); }
  MAP.tag(S.L[S.idx], 'step ' + (S.idx + 1) + ': ' + D.n[S.L[S.idx]], PAL.ink, PAL.night);
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
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { out('no mic here. press clap for me.'); return; }
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } }).then(function (st) {
    var AC = window.AudioContext || window.webkitAudioContext;
    A.ctx = new AC(); A.st = st; A.an = A.ctx.createAnalyser(); A.an.fftSize = 1024; A.buf = new Float32Array(A.an.fftSize);
    A.ctx.createMediaStreamSource(st).connect(A.an);
    S.active = true; S.base = 0.02; $('listen').setAttribute('aria-pressed', 'true'); $('listen').textContent = 'stop listening';
    out('listening. clap to skip.'); $('play').textContent = 'stop the walk'; if (!WK.playing()) playCur();
  }, function () { out('the mic was not allowed. press clap for me, or the c key.'); S.active = true; $('play').textContent = 'stop the walk'; playCur(); });
}
function stopMic() {
  if (A.st) A.st.getTracks().forEach(function (t) { t.stop(); });
  if (A.ctx) try { A.ctx.close(); } catch (e) {}
  A.st = null; A.an = null; A.ctx = null; S.active = false; S.token++; WK.stop(); WK.still(); S.tapI = -1; $('play').textContent = 'play the walk first';
  $('listen').setAttribute('aria-pressed', 'false'); $('listen').textContent = 'listen for claps'; out(); S.dirty = true;
}
$('listen').addEventListener('click', listen);
$('clap').addEventListener('click', function () {
  if (!S.active) { S.active = true; $('play').textContent = 'stop the walk'; playCur(); }
  clap(performance.now());
});
function startWalk() {
  if (S.active && !A.st) { S.active = false; S.token++; WK.stop(); WK.still(); S.tapI = -1; $('play').textContent = 'play the walk first'; out(); S.dirty = true; return; }
  S.active = true; $('play').textContent = 'stop the walk'; out('playing. nothing skips until the room claps.'); playCur();
}
$('play').addEventListener('click', startWalk);
$('go').addEventListener('click', function () { if (!S.active) { S.active = true; $('play').textContent = 'stop the walk'; } step(false); });
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey || (e.target && e.target.tagName === 'INPUT')) return;
  if (e.key === 'c') $('clap').click(); else if (e.key === 'n') $('go').click();
});
$('zero').addEventListener('click', function () { S.c = 0; S.s = 0; save(); out(); });
$('thr').addEventListener('input', function () { S.dirty = true; });
window.addEventListener('pagehide', function () { if (A.st) stopMic(); });
function tap(i) {
  var at = S.L.indexOf(i);
  if (at >= 0 && at !== S.idx) { S.idx = at; S.active = true; S.dirty = true; playCur(); out('jumped to step ' + (at + 1) + '.'); return; }
  var my = ++S.token; S.tapI = i;
  WK.play([{ i: i, tag: 'tap' }], function (k, info) {
    if (my !== S.token) return;
    if (k < 0) { S.tapI = -1; WK.still(); S.dirty = true; if (S.active) setTimeout(function () { if (my === S.token && S.active) playCur(); }, 400); return; }
    $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[i] + '. not on the walk, so it resumes after. tap a ring on the walk to jump there.';
    WK.live(function () { S.dirty = true; });
  });
}
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); S.dirty = true; }, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M; LOOP = b.LOOP; FIT = b.FIT;
  return WK.pv().then(function () {
    var path = LOOP.walk(M, M.order[5], FIT.queue.K, 20261106, 160).path;
    S.L = path.filter(function (i, n, a) { return WK.title(i) && (n === 0 || a[n - 1] !== i); }).slice(0, LEN);
    if (S.L.length < 3) throw new Error('no previews');
    MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5, tap: tap }); MAP.resize();
    load(); out();
    $('meta').textContent = 'data: ' + S.L.length + ' songs with previews along one auto-play walk through ' + D.n.length + ' artists.';
    requestAnimationFrame(tick);
  });
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
