(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, MAP, PAIRS = [], order = [], oi = 0;
var S = { phase: 'dark', pair: null, flip: false, named: false, p1: -1, p2: -1, ns: 0, nc: 0, hs: 0, hc: 0, playing: -1, idle: null };
var AU = new Audio(); AU.volume = 0.3; AU.preload = 'none';

function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// round 1 plays the pair; round 2 plays each one's nearest in sound, on the same side
function opt(k, first) { return (S.phase === 'dark' || first ? S.pair.o : S.pair.pr)[S.flip ? 1 - k : k]; }

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
  if (S.phase !== 'dark') [0, 1].forEach(function (k) {
    var a = opt(k, true), b = opt(k);
    P.ribbon(g, [[MAP.X(a.i), MAP.Y(a.i)], [MAP.X(b.i), MAP.Y(b.i)]], P.PAL.ice, P.PAL.ice, 1.5, 0.8, [4, 4]);
    g.save(); g.globalAlpha = 0.6; P.peb(g, a.i, MAP.X(a.i), MAP.Y(a.i), 5, WK.FAMC[a.f] || C.mute); g.restore();
  });
  lit.forEach(function (x) {
    var i = x.i, col = WK.FAMC[D.fam[D.f[i]]] || C.mute;
    P.peb(g, i, MAP.X(i), MAP.Y(i), 7, col);
    P.rings(g, MAP.X(i), MAP.Y(i), x.ring || C.ink, x.rs || 18);
    MAP.tag(i, x.tag, x.ring || C.ink, C.night);
  });
}
function litNow() {
  return [0, 1].map(function (k) { var o = opt(k); return { i: o.i, tag: (k ? 'B' : 'A') + (S.named || S.phase === 'result' ? ': ' + o.n : '') + ' (near the first ' + (k ? 'B' : 'A') + ')' }; });
}
function resLit() {
  var l = litNow(), same = S.p1 === S.p2;
  l[S.p2].ring = same ? C.ink : C.rose; l[S.p2].rs = 24; l[S.p2].tag = 'your pick: ' + opt(S.p2).n;
  return l;
}

function tally() {
  $('big').textContent = S.nc + ' of ' + (S.ns + S.nc);
  $('big2').textContent = S.hc + ' of ' + (S.hs + S.hc);
  var n = S.ns + S.nc, h = S.hs + S.hc;
  $('cmp').textContent = n && h ? 'tonight: with names ' + Math.round(100 * S.nc / n) + ' of 100 switched, without names ' + Math.round(100 * S.hc / h) + ' of 100. if names matter, the first runs higher.' : 'if names matter, the first number runs higher than the second. tonight, in this tab.';
}

function showPair() {
  stop();
  S.pair = PAIRS[order[oi % order.length]]; S.flip = Math.random() < 0.5; S.named = oi % 2 === 0; S.phase = 'dark'; S.p1 = S.p2 = -1;
  document.body.className = 'dark';
  ['a', 'b'].forEach(function (id) { var sq = $('sq' + id); sq.style.removeProperty('--c'); sq.style.background = ''; $('nm' + id).classList.add('hide'); $('nm' + id).textContent = ''; });
  $('ph').textContent = 'round 1 of 2: two clips, no names. pick one.';
  $('hint').textContent = 'tap a card to hear it. then tap "this one" under the one you like more.';
  $('hint').classList.remove('hide');
  $('resbox').classList.add('hide');
  $('pka').classList.remove('on'); $('pkb').classList.remove('on');
  $('pka').textContent = $('pkb').textContent = 'this one';
  drawMap(null);
}

function showNear() {
  stop();
  S.phase = 'near'; document.body.className = S.named ? 'seen' : 'dark'; if (MAP) MAP.resize();
  ['a', 'b'].forEach(function (id, k) {
    var o = opt(k), col = WK.FAMC[o.f] || C.mute, sq = $('sq' + id);
    if (S.named) { sq.style.setProperty('--c', col); sq.style.background = col; $('nm' + id).textContent = o.n; $('nm' + id).classList.remove('hide'); }
    sq.setAttribute('aria-label', 'clip ' + (k ? 'B' : 'A') + (S.named ? ', ' + o.n + ', ' + o.f : '') + ', tap to hear');
  });
  $('ph').textContent = 'round 2 of 2: two new clips. A sits next to the first A in sound, B next to the first B. ' + (S.named ? 'names shown.' : 'no names this time.');
  $('hint').textContent = 'you picked ' + (S.p1 ? 'B' : 'A') + '. hear both new clips, then pick again. switching sides is fine.';
  $('pka').classList.remove('on'); $('pkb').classList.remove('on');
  drawMap(litNow());
}

function pick(k) {
  if (S.phase === 'dark') { S.p1 = k; showNear(); return; }
  if (S.phase !== 'near') return;
  S.p2 = k; S.phase = 'result'; stop();
  var same = S.p1 === S.p2;
  if (S.named) { if (same) S.ns++; else S.nc++; } else { if (same) S.hs++; else S.hc++; }
  $('pka').classList.toggle('on', k === 0); $('pkb').classList.toggle('on', k === 1);
  var r = $('res'); r.className = 'res ' + (same ? 'same' : 'chg');
  r.textContent = same ? 'same side as before.' : 'you switched sides.';
  $('com').textContent = S.named ? (same ? 'names shown, and you stayed: the sound held.' : 'names shown, and you switched: a name, or the new clip, pulled you.') : (same ? 'no names, and you stayed.' : 'no names, and you switched: the sound alone moved you.');
  $('ph').textContent = 'result';
  $('hint').classList.add('hide');
  $('resbox').classList.remove('hide');
  if (!S.named) { document.body.className = 'seen'; if (MAP) MAP.resize(); ['a', 'b'].forEach(function (id, j) { var o = opt(j), col = WK.FAMC[o.f] || C.mute, sq = $('sq' + id); sq.style.setProperty('--c', col); sq.style.background = col; $('nm' + id).textContent = o.n; $('nm' + id).classList.remove('hide'); }); }
  drawMap(resLit());
  tally();
  var rb = $('resbox'); if (rb.scrollIntoView && innerWidth <= 900) rb.scrollIntoView({ block: 'nearest' });
}

function reset() { S.ns = S.nc = S.hs = S.hc = 0; tally(); oi = 0; shuffle(order); showPair(); }
function bump() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.ns + S.nc + S.hs + S.hc > 0 || S.phase !== 'dark') reset(); }, 120000); }
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
  if (MAP && $('map').clientWidth && $('map').clientWidth !== MAP.W) MAP.resize();
  drawMap(S.phase === 'result' ? resLit() : litNow());
}

Promise.all([WK.boot([WK.j('../taste/pairs.json')])]).then(function (a) {
  D = a[0].D; M = a[0].M; PAIRS = a[0].extra[0].pairs.filter(function (p) { return p.pr && p.pr.length === 2; });
  MAP = new WK.Map($('map'), $('cv'), D, M); MAP.resize();
  order = shuffle(PAIRS.map(function (_, i) { return i; }));
  tally(); showPair(); bump();
}).catch(function () { $('hint').textContent = 'the pairs did not load. reload the page.'; });
})();
