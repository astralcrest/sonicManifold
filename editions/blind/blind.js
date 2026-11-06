(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, MAP, PAIRS = [], order = [], oi = 0;
var S = { phase: 'dark', pair: null, flip: false, p1: -1, p2: -1, same: 0, chg: 0, playing: -1, idle: null };
var AU = new Audio(); AU.volume = 0.3; AU.preload = 'none';

function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function opt(k) { return S.pair.o[S.flip ? 1 - k : k]; }

function stop() {
  try { AU.pause(); } catch (e) {}
  if (S.playing >= 0) setPlay(S.playing, false);
  S.playing = -1; $('bara').style.width = '0'; $('barb').style.width = '0';
}
function setPlay(k, on) {
  var id = k ? 'b' : 'a', L = k ? 'B' : 'A';
  $('sq' + id).setAttribute('aria-pressed', on ? 'true' : 'false');
  $('sq' + id).setAttribute('aria-label', 'clip ' + L + (on ? ', playing, tap to stop' : ', tap to hear'));
  $('st' + id).textContent = on ? 'playing. tap to stop' : 'tap to hear';
}
function toggle(k) {
  var was = S.playing; stop();
  if (was === k) return;
  AU.src = opt(k).u; var pr = AU.play(); if (pr && pr.catch) pr.catch(function () { stop(); });
  S.playing = k; setPlay(k, true);
}
AU.addEventListener('ended', stop);
AU.addEventListener('timeupdate', function () {
  if (S.playing < 0 || !AU.duration) return;
  $(S.playing ? 'barb' : 'bara').style.width = Math.min(100, AU.currentTime / AU.duration * 100) + '%';
});

function drawMap(lit) {
  MAP.begin();
  if (!lit) return;
  var g = MAP.g, P = WK.P;
  if (lit.length > 1) P.ribbon(g, [[MAP.X(lit[0].i), MAP.Y(lit[0].i)], [MAP.X(lit[1].i), MAP.Y(lit[1].i)]], P.PAL.ice, P.PAL.ink, 1.5, 0.7, [4, 4]);
  lit.forEach(function (x) {
    var i = x.i, col = WK.FAMC[D.fam[D.f[i]]] || C.mute;
    P.stops(g, [[MAP.X(i), MAP.Y(i)]], col, col, 10);
    P.rings(g, MAP.X(i), MAP.Y(i), x.ring || C.ink, x.rs || 18);
    MAP.tag(i, x.tag, C.ink, C.night);
  });
}

function resLit() {
  var a = opt(S.p1), b = opt(S.p2), same = S.p1 === S.p2, o = opt(1 - S.p1);
  if (same) return [{ i: a.i, tag: 'both: ' + a.n, ring: C.mint, rs: 24 }, { i: o.i, tag: o.n }];
  return [{ i: a.i, tag: 'dark: ' + a.n, ring: C.mint, rs: 24 }, { i: b.i, tag: 'seen: ' + b.n, ring: C.amber, rs: 24 }];
}

function tally() {
  var m = S.same + S.chg;
  $('big').textContent = S.chg + ' of ' + m;
  $('ns').textContent = S.same; $('nc').textContent = S.chg;
  $('m1').style.width = (m ? S.same / m * 100 : 0) + '%'; $('m2').style.width = (m ? S.chg / m * 100 : 0) + '%';
  $('meter').setAttribute('aria-label', 'names changed the pick ' + S.chg + ' of ' + m + ' times tonight');
}

function showPair() {
  stop();
  S.pair = PAIRS[order[oi % order.length]]; S.flip = Math.random() < 0.5; S.phase = 'dark'; S.p1 = S.p2 = -1;
  document.body.className = 'dark';
  ['a', 'b'].forEach(function (id) { var sq = $('sq' + id); sq.style.removeProperty('--c'); sq.style.background = ''; $('nm' + id).classList.add('hide'); });
  $('ph').textContent = 'round 1 of 2. dark.';
  $('hint').textContent = 'tap a square to hear it. tap again to stop. then tap this one under your pick.';
  $('hint').classList.remove('hide');
  $('resbox').classList.add('hide');
  $('pka').classList.remove('on'); $('pkb').classList.remove('on');
  $('pka').textContent = $('pkb').textContent = 'this one';
  drawMap(null);
}

function showSeen() {
  stop();
  S.phase = 'seen'; document.body.className = 'seen'; if (MAP) MAP.resize();
  ['a', 'b'].forEach(function (id, k) {
    var o = opt(k), col = WK.FAMC[o.f] || C.mute, sq = $('sq' + id);
    sq.style.setProperty('--c', col); sq.style.background = col;
    $('nm' + id).textContent = o.n; $('nm' + id).classList.remove('hide');
    sq.setAttribute('aria-label', 'clip ' + (k ? 'B' : 'A') + ', ' + o.n + ', ' + o.f + ', tap to hear');
  });
  $('ph').textContent = 'round 2 of 2. seen. same two clips, now with names.';
  $('hint').textContent = 'pick again. a different pick is fine.';
  $('pka').classList.remove('on'); $('pkb').classList.remove('on');
  var lit = [0, 1].map(function (k) { return { i: opt(k).i, tag: opt(k).n }; });
  drawMap(lit);
}

function pick(k) {
  if (S.phase === 'dark') { S.p1 = k; showSeen(); return; }
  if (S.phase !== 'seen') return;
  S.p2 = k; S.phase = 'result'; stop();
  var same = S.p1 === S.p2; if (same) S.same++; else S.chg++;
  $('pka').classList.toggle('on', k === 0); $('pkb').classList.toggle('on', k === 1);
  var r = $('res'); r.className = 'res ' + (same ? 'same' : 'chg');
  r.textContent = same ? 'same pick with the names shown.' : 'the names changed the pick.';
  $('ph').textContent = 'result';
  $('hint').classList.add('hide');
  $('resbox').classList.remove('hide');
  var a = opt(S.p1), b = opt(S.p2);
  drawMap(resLit());
  tally();
  var rb = $('resbox'); if (rb.scrollIntoView && innerWidth <= 900) rb.scrollIntoView({ block: 'nearest' });
}

function reset() { S.same = S.chg = 0; tally(); oi = 0; shuffle(order); showPair(); }
function bump() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.same + S.chg > 0 || S.phase !== 'dark') reset(); }, 120000); }
['pointerdown', 'keydown'].forEach(function (e) { document.addEventListener(e, bump, true); });

$('sqa').addEventListener('click', function () { toggle(0); });
$('sqb').addEventListener('click', function () { toggle(1); });
$('pka').addEventListener('click', function () { pick(0); });
$('pkb').addEventListener('click', function () { pick(1); });
$('next').addEventListener('click', function () { oi++; showPair(); });
$('reset').addEventListener('click', reset);

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); redraw(); }, 80); });
function redraw() {
  if (S.phase === 'dark') return drawMap(null);
  // the phone hides the map in the dark round; size it to the room it now has before the first seen draw
  if (MAP && $('map').clientWidth && $('map').clientWidth !== MAP.W) MAP.resize();
  var lit = [0, 1].map(function (k) { return { i: opt(k).i, tag: opt(k).n }; });
  if (S.phase === 'result') lit = resLit();
  drawMap(lit);
}

Promise.all([WK.boot([WK.j('../taste/pairs.json')])]).then(function (a) {
  D = a[0].D; M = a[0].M; PAIRS = a[0].extra[0].pairs;
  MAP = new WK.Map($('map'), $('cv'), D, M); MAP.resize();
  order = shuffle(PAIRS.map(function (_, i) { return i; }));
  tally(); showPair(); bump();
}).catch(function () { $('hint').textContent = 'the pairs did not load. reload the page.'; });
})();
