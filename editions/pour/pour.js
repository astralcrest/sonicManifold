(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, LOOP, MAP, cv = $('cv');
var STEPS = 100, HELD = 64, TOP = 60, TABOO = 12, COLW = 48;
var S = { p: HELD, seed: 20261106, path: [], who: [], rank: [], hear: null, dirty: true, tilt: false, sm: HELD, cur: 1, walked: false };

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

function famCol(i) { return WK.FAMC[D.fam[D.f[i]]] || PAL.ice; }
function rad(i, small) { return Math.max(3, Math.min(small ? 8 : 10, 2 + Math.log(1 + D.pl[i]) * 0.85)); }
function draw() {
  MAP.begin();
  var g = MAP.g, W = MAP.W, H = MAP.H, small = W < 500, n = S.path.length, k, a, b, cell, y0 = 34, y1 = H - 22, fade, auto;
  for (k = 1; k < n; k++) {
    a = pt(S.path[k - 1]); b = pt(S.path[k]); auto = S.who[k - 1]; fade = S.walked && k > S.cur ? 0.35 : 1;
    P.ribbon(g, [a, b], auto ? PAL.violet : PAL.mint, auto ? PAL.violet : PAL.mint, small ? 1.6 : 2.2, (auto ? 0.9 : 0.55) * fade, auto ? null : [3, 5]);
  }
  for (k = 1; k < n; k++) {
    b = pt(S.path[k]); auto = S.who[k - 1]; fade = S.walked && k > S.cur ? 0.3 : 1;
    g.save(); g.globalAlpha = 0.7 * fade; P.peb(g, S.path[k], b[0], b[1], rad(S.path[k], small), famCol(S.path[k])); g.restore();
    g.save(); g.globalAlpha = fade; P.glyph(g, auto ? 'ring' : 'star', b[0], b[1], small ? 4.5 : 6, auto ? PAL.violet : PAL.mint); g.restore();
  }
  a = pt(S.path[0]); P.rings(g, a[0], a[1], PAL.ink, 14); MAP.tag(S.path[0], 'start', PAL.ink, PAL.night);
  if (S.walked || S.hear) { b = pt(S.path[S.cur]); P.rings(g, b[0], b[1], S.who[S.cur - 1] ? PAL.violet : PAL.mint, 12); MAP.tag(S.path[S.cur], 'step ' + S.cur + ': ' + D.n[S.path[S.cur]], PAL.ink, PAL.night); }
  else MAP.tag(S.path[n - 1], D.n[S.path[n - 1]], PAL.ink, PAL.night);
  if (S.hear) { b = pt(S.hear.i); WK.pulse(g, b[0], b[1], S.hear.col, rad(S.hear.i, small) + 6); }
  cell = (y1 - y0) / STEPS;
  g.save(); g.lineCap = 'round';
  for (k = 0; k < STEPS; k++) {
    var y = y0 + (k + 0.5) * cell, au = S.who[k] === 1, hw = au ? 3 : 10, ff = S.walked && k + 1 > S.cur ? 0.35 : 1;
    g.globalAlpha = ff;
    g.strokeStyle = au ? PAL.violet : PAL.mint; g.lineWidth = Math.max(1.5, cell * 0.62);
    g.beginPath(); g.moveTo(COLW / 2 - 2 - hw, y); g.lineTo(COLW / 2 - 2 + hw, y); g.stroke();
    g.fillStyle = famCol(S.path[k + 1]); g.beginPath(); g.arc(COLW - 6, y, D.f[S.path[k + 1]] !== D.f[S.path[k]] ? Math.max(2, cell * 0.5) : Math.max(1.1, cell * 0.28), 0, 6.2832); g.fill();
  }
  if (S.walked) { var yc = y0 + (S.cur - 0.5) * cell; g.globalAlpha = 1; g.strokeStyle = PAL.ink; g.lineWidth = 1.5; g.strokeRect(1.5, yc - cell * 0.8, COLW - 3, cell * 1.6); }
  g.globalAlpha = 0.7; g.font = '500 11px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'left';
  g.fillText('step 1', 4, 22); g.fillText('100', 10, H - 6);
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
  $('num').innerHTML = '<span class="a">' + S.p + '</span> <span class="c">of 100</span>';
  $('say').textContent = s.auto + ' of the 100 steps are auto-play\'s, ' + mine + ' are mine. the night touches ' + s.fams + ' of ' + D.fam.length + ' families. pebble color is the family, bigger means more plays. ' + (S.p === HELD ? 'this is the setting that matches my log.' : 'the setting that matches my log is ' + HELD + '.');
}
var NOW0 = 'press hear to listen in step order, or tap any shape or step. sound must be on.';
function update() { WK.stop(); WK.still(); S.hear = null; S.walked = false; build(); draw(); out(); $('now').textContent = NOW0; hearLabel(); }
function setP(p) { S.p = Math.max(0, Math.min(100, Math.round(p))); $('pl').value = S.p; update(); }

$('pl').addEventListener('input', function () { setP(+this.value); });
$('mylog').addEventListener('click', function () { setP(HELD); });
$('again').addEventListener('click', function () { S.seed = (S.seed * 1103515245 + 12345) >>> 0; S.rank = shuffled(S.seed); S.cur = 1; update(); });

function hearLabel() {
  var on = WK.playing();
  $('hear').setAttribute('aria-pressed', on ? 'true' : 'false');
  $('hear').textContent = on ? 'stop the clips' : (S.walked && S.cur > 1 ? 'hear from step ' + S.cur : 'hear the night, step 1 on');
}
function playFrom(c, single) {
  var list = [], k, last = Math.min(STEPS, c + 99);
  c = Math.max(1, Math.min(STEPS, c)); S.cur = c; S.walked = true;
  for (k = c; k <= (single ? c : last); k++) list.push({ i: S.path[k], tag: S.who[k - 1] ? 'a' : 'b' });
  WK.play(list, function (k, info) {
    if (info) {
      var st = c + k, prev = st > 1 ? S.path[st - 1] : S.path[0], who = S.who[st - 1], msg;
      S.cur = st; S.hear = { i: info.i, col: who ? PAL.violet : PAL.mint };
      msg = 'step ' + st + ' of ' + STEPS + ' (' + (who ? 'auto-play' : 'my press') + '): ' + D.n[info.i] + ', ' + D.fam[D.f[info.i]];
      if (D.f[info.i] !== D.f[prev]) msg += ', a change from ' + D.fam[D.f[prev]];
      if (st < STEPS) msg += '. next: ' + D.n[S.path[st + 1]];
      if (WK.title(info.i)) msg += '. hearing ' + info.title;
      $('now').textContent = msg;
      WK.live(draw);
    } else { S.hear = null; WK.still(); draw(); $('now').textContent = NOW0; }
    hearLabel();
  });
  hearLabel(); draw();
}
$('hear').addEventListener('click', function () {
  if (WK.playing()) { WK.stop(); hearLabel(); return; }
  playFrom(S.walked ? S.cur : 1, false);
});
function nextStep() { playFrom(S.walked ? Math.min(STEPS, S.cur + 1) : 1, false); }
$('next').addEventListener('click', nextStep);
document.addEventListener('keydown', function (e) {
  var t = e.target && e.target.tagName;
  if (e.metaKey || e.ctrlKey || e.altKey || t === 'INPUT') return;
  if (e.key === 'n') nextStep();
  else if (e.key === 'ArrowRight') setP(S.p + 5);
  else if (e.key === 'ArrowLeft') setP(S.p - 5);
});
cv.addEventListener('pointerdown', function (e) {
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, y0 = 34, y1 = MAP.H - 22, st;
  if (x > COLW || y < y0 || y > y1) return;
  st = Math.floor((y - y0) / ((y1 - y0) / STEPS)) + 1; playFrom(st, false);
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
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.5, tap: function (i) {
    var st = S.path.indexOf(i, 1);
    if (st > 0) { playFrom(st, false); return; }
    WK.play([{ i: i, tag: 'tap' }], function (k, info) {
      if (info) { S.hear = { i: i, col: famCol(i) }; $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[i] + ', ' + D.fam[D.f[i]] + '. not on this night; tap a pebble on the path to walk from there.'; WK.live(draw); }
      else { S.hear = null; WK.still(); draw(); $('now').textContent = NOW0; }
      hearLabel();
    });
  } }); MAP.resize(); fit();
  S.rank = shuffled(S.seed); update();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map, ' + STEPS + ' steps per pour.';
  requestAnimationFrame(frame);
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
