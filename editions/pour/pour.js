(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, LOOP, MAP, cv = $('cv');
var STEPS = 100, HELD = 64, TOP = 60, TABOO = 12, COLW = 38;
var S = { p: HELD, seed: 20261106, path: [], who: [], rank: [], dirty: true, tilt: false, sm: HELD };

function shuffled(seed) {
  var r = LOOP.rng(seed), a = [], i, j, t;
  for (i = 0; i < STEPS; i++) a.push(i);
  for (i = STEPS - 1; i > 0; i--) { j = (r() * (i + 1)) | 0; t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
// step k is auto-play's when its rank is under p, so raising p only ever turns more steps over
function build() {
  var path = [M.order[3]], who = [], seen = [path[0]], k, c, nn, pick, r, u, i, tot, acc;
  function taboo(i) { return seen.indexOf(i) >= 0; }
  for (k = 0; k < STEPS; k++) {
    c = path[path.length - 1]; pick = -1;
    if (S.rank[k] < S.p) {
      nn = D.nn[c].filter(function (j) { return j >= 0; }).sort(function (a, b) { return LOOP.dist(M, c, a) - LOOP.dist(M, c, b); });
      for (i = 0; i < nn.length; i++) if (!taboo(nn[i])) { pick = nn[i]; break; }
      if (pick < 0) pick = nn[0];
      who.push(1);
    } else {
      r = LOOP.rng(S.seed + k * 7919)(); tot = 0;
      for (i = 0; i < TOP; i++) if (!taboo(M.order[i])) tot += D.pl[M.order[i]];
      u = r * tot; acc = 0;
      for (i = 0; i < TOP; i++) { var a = M.order[i]; if (taboo(a)) continue; acc += D.pl[a]; if (acc >= u) { pick = a; break; } }
      if (pick < 0) pick = M.order[0];
      who.push(0);
    }
    path.push(pick); seen.push(pick); if (seen.length > TABOO) seen.shift();
  }
  S.path = path; S.who = who;
}

function fit() {
  var W = MAP.W, H = MAP.H, pad = W < 500 ? 14 : 28, avail = W - COLW - pad;
  MAP.scl = Math.min(avail - pad, H - 2 * pad) / 1000;
  MAP.ox = COLW + pad + (avail - pad - 1000 * MAP.scl) / 2; MAP.oy = (H - 1000 * MAP.scl) / 2;
}
function pt(i) { return [MAP.X(i), MAP.Y(i)]; }

function draw() {
  MAP.begin();
  var g = MAP.g, W = MAP.W, H = MAP.H, small = W < 500, n = S.path.length, k, a, b, cell, y0 = 34, y1 = H - 22;
  for (k = 1; k < n; k++) {
    a = pt(S.path[k - 1]); b = pt(S.path[k]);
    P.ribbon(g, [a, b], S.who[k - 1] ? PAL.violet : PAL.mint, S.who[k - 1] ? PAL.violet : PAL.mint, small ? 1.6 : 2.2, S.who[k - 1] ? 0.9 : 0.55, S.who[k - 1] ? null : [3, 5]);
  }
  for (k = 1; k < n; k++) {
    b = pt(S.path[k]); P.glyph(g, S.who[k - 1] ? 'ring' : 'star', b[0], b[1], small ? 4.5 : 6, S.who[k - 1] ? PAL.violet : PAL.mint);
  }
  a = pt(S.path[0]); P.rings(g, a[0], a[1], PAL.ink, 14); MAP.tag(S.path[0], 'start', PAL.ink, PAL.night);
  MAP.tag(S.path[n - 1], D.n[S.path[n - 1]], PAL.ink, PAL.night);
  // the column: step 1 at the top, step 100 at the bottom
  cell = (y1 - y0) / STEPS;
  g.save(); g.lineCap = 'round';
  for (k = 0; k < STEPS; k++) {
    var y = y0 + (k + 0.5) * cell, auto = S.who[k] === 1;
    g.strokeStyle = auto ? PAL.violet : PAL.mint; g.lineWidth = Math.max(1.5, cell * 0.62);
    var hw = auto ? 3 : 10;
    g.beginPath(); g.moveTo(COLW / 2 + 6 - hw, y); g.lineTo(COLW / 2 + 6 + hw, y); g.stroke();
  }
  g.font = '500 11px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'left';
  g.globalAlpha = 0.7; g.fillText('step 1', 6, 22); g.fillText('100', 10, H - 6);
  g.restore();
}

function stats() {
  var fam = {}, k, auto = 0;
  for (k = 0; k < S.path.length; k++) fam[D.f[S.path[k]]] = 1;
  for (k = 0; k < S.who.length; k++) auto += S.who[k];
  return { fams: Object.keys(fam).length, auto: auto };
}
function out() {
  var s = stats(), mine = STEPS - s.auto;
  $('num').innerHTML = '<span class="a">' + S.p + '</span>';
  $('say').textContent = s.auto + ' of the 100 steps are auto-play\'s, ' + mine + ' are mine. the night touches ' + s.fams + ' of ' + D.fam.length + ' families. ' + (S.p === HELD ? 'this is the setting that matches my log.' : 'the setting that matches my log is ' + HELD + '.');
}
function update() { build(); draw(); out(); WK.stop(); hearLabel(); }
function setP(p) { S.p = Math.max(0, Math.min(100, Math.round(p))); $('pl').value = S.p; update(); }

$('pl').addEventListener('input', function () { setP(+this.value); });
$('mylog').addEventListener('click', function () { setP(HELD); });
$('again').addEventListener('click', function () { S.seed = (S.seed * 1103515245 + 12345) >>> 0; S.rank = shuffled(S.seed); update(); });

var playing = false;
function hearLabel() { playing = WK.playing(); $('hear').setAttribute('aria-pressed', playing ? 'true' : 'false'); $('hear').textContent = playing ? 'stop' : 'hear the first 8'; }
$('hear').addEventListener('click', function () {
  if (WK.playing()) { WK.stop(); hearLabel(); return; }
  var list = [], k;
  for (k = 1; k <= 8; k++) list.push({ i: S.path[k], tag: S.who[k - 1] ? 'a' : 'b' });
  WK.play(list, function (k, info) {
    $('now').textContent = info ? 'hearing ' + info.title + ' (' + D.n[info.i] + '), step ' + (k + 1) + ' of 8' : 'sound: previews play only after you tap hear, and only when sound is on.';
    hearLabel();
  });
});

// tilt: right = more auto-play. iOS only grants the sensor inside a tap.
var tiltBtn = $('tilt'), gotEvent = false;
function onori(e) {
  var a = (screen.orientation && screen.orientation.angle) || window.orientation || 0, g = e.gamma, b = e.beta, v;
  if (g == null || b == null) return;
  gotEvent = true;
  v = a === 90 ? -b : (a === 270 || a === -90) ? b : a === 180 ? -g : g;
  var target = Math.max(0, Math.min(100, (v + 30) / 60 * 100));
  S.sm += (target - S.sm) * 0.25;
  if (Math.round(S.sm) !== S.p) { S.p = Math.round(S.sm); $('pl').value = S.p; S.pending = true; }
}
function startTilt() {
  window.addEventListener('deviceorientation', onori);
  S.tilt = true; tiltBtn.classList.add('on'); tiltBtn.setAttribute('aria-pressed', 'true'); tiltBtn.textContent = 'tilt on';
  setTimeout(function () { if (!gotEvent) { tiltBtn.textContent = 'no tilt sensor here'; tiltBtn.disabled = true; window.removeEventListener('deviceorientation', onori); S.tilt = false; } }, 1800);
}
if ('DeviceOrientationEvent' in window) {
  tiltBtn.hidden = false;
  tiltBtn.addEventListener('click', function () {
    if (S.tilt) { window.removeEventListener('deviceorientation', onori); S.tilt = false; tiltBtn.classList.remove('on'); tiltBtn.setAttribute('aria-pressed', 'false'); tiltBtn.textContent = 'allow tilt'; return; }
    var R = window.DeviceOrientationEvent.requestPermission;
    if (typeof R === 'function') {
      R.call(window.DeviceOrientationEvent).then(function (r) { if (r === 'granted') { gotEvent = false; startTilt(); } else { tiltBtn.textContent = 'tilt not allowed, use the slider'; } }, function () { tiltBtn.textContent = 'tilt not allowed, use the slider'; });
    } else { gotEvent = false; startTilt(); }
  });
}
function frame() { if (S.pending) { S.pending = false; update(); } requestAnimationFrame(frame); }

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); fit(); draw(); }, 80); });

WK.boot().then(function (b) {
  D = b.D; M = b.M; LOOP = b.LOOP;
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5 }); MAP.resize(); fit();
  S.rank = shuffled(S.seed); update();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map, ' + STEPS + ' steps per pour.';
  requestAnimationFrame(frame);
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
