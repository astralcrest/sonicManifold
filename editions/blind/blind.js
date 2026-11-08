(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, MAP, PAIRS = [], order = [], oi = 0, TW = null;
var S = { phase: 'dark', pair: null, flip: false, named: false, p1: -1, p2: -1, ns: 0, nc: 0, hs: 0, hc: 0, playing: -1, idle: null, heard: [false, false], seq: false };
var RES = [];
var AU = new Audio(); AU.volume = 0.3; AU.preload = 'none';

function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function opt(k, first) { return (S.phase === 'dark' || first ? S.pair.o : S.pair.pr)[S.flip ? 1 - k : k]; }
function reveal() { return S.named || S.phase === 'result'; }
function say(t) { $('now').textContent = t; }

function nowLine(k) {
  var o = opt(k), L = k ? 'B' : 'A';
  if (!reveal()) return 'playing ' + L + ' (names hidden). ' + (S.heard[0] && S.heard[1] ? 'you have heard both: pick one.' : 'then hear ' + (k ? 'A' : 'B') + '.');
  var t = WK.title(o.i);
  return 'playing ' + L + ': ' + (t ? '“' + t + '” by ' : '') + o.n + ', ' + o.f + '.';
}
function gate() {
  var ok = S.heard[0] && S.heard[1] && S.phase !== 'result';
  $('pka').disabled = $('pkb').disabled = !ok;
}
function stop() {
  try { AU.pause(); } catch (e) {}
  if (S.playing >= 0) setPlay(S.playing, false);
  S.playing = -1; $('bara').style.width = '0'; $('barb').style.width = '0'; WK.still(); if (MAP && S.phase !== 'dark') redraw();
  $('play').textContent = S.heard[0] && S.heard[1] ? 'play both again' : 'play both, A then B';
}
function setPlay(k, on) {
  var id = k ? 'b' : 'a', L = k ? 'B' : 'A';
  $('sq' + id).setAttribute('aria-pressed', on ? 'true' : 'false');
  $('sq' + id).setAttribute('aria-label', 'clip ' + L + (on ? ', playing, tap to stop' : ', tap to hear'));
  $('st' + id).textContent = on ? 'playing. tap to stop' : (S.heard[k] ? 'heard. tap to hear again' : 'tap to hear');
}
function toggle(k, seq) {
  var was = S.playing; S.seq = !!seq; stop();
  if (was === k && !seq) return;
  AU.src = opt(k).u; var pr = AU.play(); if (pr && pr.catch) pr.catch(function () { S.seq = false; stop(); });
  S.playing = k; setPlay(k, true); say(nowLine(k) + (WK.sound() ? '' : ' sound is off: tap the sound chip at the top.'));
  if (S.phase !== 'dark') WK.live(redraw);
}
function done() {
  var k = S.playing; if (WK.sound()) S.heard[k] = true;
  if (S.seq && k === 0) { toggle(1, true); } else { S.seq = false; stop(); say(!WK.sound() ? 'sound was off, so that does not count as heard. tap the chip at the top, then play again.' : S.heard[0] && S.heard[1] ? 'you have heard both. pick the one you like more.' : 'now hear ' + (k ? 'A' : 'B') + '.'); }
  gate();
}
AU.addEventListener('ended', function () { if (S.playing >= 0) done(); });
AU.addEventListener('timeupdate', function () {
  if (S.playing < 0 || !AU.duration) return;
  $(S.playing ? 'barb' : 'bara').style.width = Math.min(100, AU.currentTime / AU.duration * 100) + '%';
  if (AU.currentTime >= 5 && !S.heard[S.playing] && WK.sound()) { S.heard[S.playing] = true; gate(); if (S.heard[0] && S.heard[1] && !S.seq) say('you have heard both. pick the one you like more.'); }
});

function labelBox(g, text, x, y) {
  g.save(); g.font = '500 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle'; var w = g.measureText(text).width + 16;
  g.fillStyle = C.night; g.fillRect(x - w / 2, y - 14, w, 28); g.strokeStyle = C.ice; g.lineWidth = 1; g.strokeRect(x - w / 2 + .5, y - 13.5, w - 1, 27);
  g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(text, x, y + .5); g.restore();
}
function drawMap(lit) {
  MAP.begin();
  var g = MAP.g, P = WK.P;
  if (!lit) { labelBox(g, 'names hidden: the map lights up after your first pick', MAP.W / 2, MAP.H - 30); return; }
  var i0 = S.phase === 'dark' ? null : opt(S.p1, true);
  [0, 1].forEach(function (k) {
    var a = opt(k, true), b = opt(k);
    P.ribbon(g, [[MAP.X(a.i), MAP.Y(a.i)], [MAP.X(b.i), MAP.Y(b.i)]], P.PAL.ice, P.PAL.ice, 1.5, 0.8, [4, 4]);
    P.peb(g, a.i, MAP.X(a.i), MAP.Y(a.i), 5 + 5 * TW[a.i], WK.FAMC[a.f] || C.mute);
  });
  if (i0) P.glyph(g, 'star', MAP.X(i0.i), MAP.Y(i0.i), 7, P.PAL.mint);
  lit.forEach(function (x, k) {
    var i = x.i, col = WK.FAMC[D.fam[D.f[i]]] || C.mute, on = S.playing === k;
    P.peb(g, i, MAP.X(i), MAP.Y(i), 6 + 6 * TW[i], col);
    P.rings(g, MAP.X(i), MAP.Y(i), x.ring || C.ink, x.rs || 18);
    if (on) WK.pulse(g, MAP.X(i), MAP.Y(i), x.ring || C.ink, 20);
    MAP.tag(i, x.tag, x.ring || C.ink, C.night);
  });
  if (S.phase === 'result') { var pk = opt(S.p2); P.glyph(g, 'star', MAP.X(pk.i), MAP.Y(pk.i), 9, P.PAL.mint); }
}
function litNow() {
  return [0, 1].map(function (k) { var o = opt(k); return { i: o.i, tag: (k ? 'B' : 'A') + (reveal() ? ': ' + o.n : '') + ' (near the first ' + (k ? 'B' : 'A') + ')' }; });
}
function resLit() {
  var l = litNow(), same = S.p1 === S.p2;
  l[S.p2].ring = same ? C.ink : C.rose; l[S.p2].rs = 24; l[S.p2].tag = 'your pick: ' + opt(S.p2).n;
  return l;
}

function num(id, a, b) { $(id).innerHTML = b ? a + ' of ' + b : '<span class="c">no rounds yet</span>'; }
function tally() {
  var n = S.ns + S.nc, h = S.hs + S.hc;
  num('big', S.nc, n); num('big2', S.hc, h);
  $('cmp').textContent = n && h ? 'tonight: with names ' + Math.round(100 * S.nc / n) + ' of 100 switched, without names ' + Math.round(100 * S.hc / h) + ' of 100. if names matter, the first is higher.' : 'play a few rounds. the names-shown rounds and the names-hidden rounds alternate. tonight, in this tab.';
}

function showPair() {
  stop();
  S.pair = PAIRS[order[oi % order.length]]; S.flip = Math.random() < 0.5; S.named = oi % 2 === 0; S.phase = 'dark'; S.p1 = S.p2 = -1; S.heard = [false, false];
  document.body.className = 'dark';
  ['a', 'b'].forEach(function (id, k) { var sq = $('sq' + id); sq.style.removeProperty('--c'); sq.style.background = ''; $('nm' + id).classList.add('hide'); $('nm' + id).textContent = ''; setPlay(k, false); });
  $('ph').textContent = 'pair ' + (oi + 1) + ', round 1 of 2: two clips, no names.';
  say('tap play both, or tap a card (or press a or b) to hear one. the pick buttons turn on once both have played five seconds.');
  $('resbox').classList.add('hide');
  $('pka').classList.remove('on'); $('pkb').classList.remove('on');
  $('pka').textContent = $('pkb').textContent = 'this one';
  $('play').textContent = 'play both, A then B';
  gate();
  drawMap(null);
}

function showNear() {
  stop();
  S.phase = 'near'; S.heard = [false, false]; document.body.className = S.named ? 'seen' : 'dark'; if (MAP) MAP.resize();
  ['a', 'b'].forEach(function (id, k) {
    var o = opt(k), col = WK.FAMC[o.f] || C.mute, sq = $('sq' + id);
    if (S.named) { sq.style.setProperty('--c', col); sq.style.background = col; $('nm' + id).textContent = o.n; $('nm' + id).classList.remove('hide'); }
    sq.setAttribute('aria-label', 'clip ' + (k ? 'B' : 'A') + (S.named ? ', ' + o.n + ', ' + o.f : '') + ', tap to hear');
    $('st' + id).textContent = S.named ? o.f + '. tap to hear' : 'tap to hear';
  });
  $('ph').textContent = 'pair ' + (oi + 1) + ', round 2 of 2: two new clips. A sits next to the first A in sound, B next to the first B. ' + (S.named ? 'names shown.' : 'no names this time.');
  say('you picked ' + (S.p1 ? 'B' : 'A') + '. play both new clips, then pick again. switching sides is fine.' + (S.named ? ' tap a lit shape on the map to hear it.' : ''));
  $('play').textContent = 'play both new clips';
  $('pka').classList.remove('on'); $('pkb').classList.remove('on');
  gate();
  drawMap(litNow());
}

function pick(k) {
  if (S.phase === 'dark') { if (!(S.heard[0] && S.heard[1])) return; S.p1 = k; showNear(); return; }
  if (S.phase !== 'near' || !(S.heard[0] && S.heard[1])) return;
  S.p2 = k; S.phase = 'result'; stop();
  var same = S.p1 === S.p2;
  if (S.named) { RES.push(S.pair.o[0].i + '.' + S.pair.o[1].i + '.' + (S.flip ? 1 - k : k) + '.' + (same ? 0 : 1)); if (RES.length > 6) RES.shift(); $('home').setAttribute('href', '../print/taste.html#r=' + RES.join(',')); }
  if (S.named) { if (same) S.ns++; else S.nc++; } else { if (same) S.hs++; else S.hc++; }
  $('pka').classList.toggle('on', k === 0); $('pkb').classList.toggle('on', k === 1);
  var r = $('res'); r.className = 'res ' + (same ? 'same' : 'chg');
  r.textContent = same ? 'same side as before.' : 'you switched sides.';
  $('com').textContent = S.named ? (same ? 'names shown, and you stayed: the sound held.' : 'names shown, and you switched: a name, or the new clip, pulled you.') : (same ? 'no names, and you stayed.' : 'no names, and you switched: the sound alone moved you.');
  $('ph').textContent = 'pair ' + (oi + 1) + ': result';
  say('names are now shown on both cards. tap a card to hear it with its name, or tap next pair.');
  $('resbox').classList.remove('hide');
  if (!S.named) { document.body.className = 'seen'; if (MAP) MAP.resize(); ['a', 'b'].forEach(function (id, j) { var o = opt(j), col = WK.FAMC[o.f] || C.mute, sq = $('sq' + id); sq.style.setProperty('--c', col); sq.style.background = col; $('nm' + id).textContent = o.n; $('nm' + id).classList.remove('hide'); $('st' + id).textContent = o.f + '. tap to hear'; }); }
  gate();
  drawMap(resLit());
  tally();
  var rb = $('resbox'); if (rb.scrollIntoView && innerWidth <= 900) rb.scrollIntoView({ block: 'nearest' });
}

function tapAt(i) {
  if (S.phase === 'dark' || !S.pair) return;
  [0, 1].forEach(function (k) { var o = opt(k), a = opt(k, true); if (o.i === i || a.i === i) { if (o.i === i) toggle(k); } });
}

function reset() { S.ns = S.nc = S.hs = S.hc = 0; tally(); oi = 0; shuffle(order); showPair(); }
function bump() { clearTimeout(S.idle); S.idle = setTimeout(function () { if (S.ns + S.nc + S.hs + S.hc > 0 || S.phase !== 'dark') reset(); }, 120000); }
['pointerdown', 'keydown'].forEach(function (e) { document.addEventListener(e, bump, true); });

$('sqa').addEventListener('click', function () { toggle(0); });
$('sqb').addEventListener('click', function () { toggle(1); });
$('play').addEventListener('click', function () { if (S.playing >= 0 && S.seq) { S.seq = false; stop(); } else toggle(0, true); });
$('pka').addEventListener('click', function () { pick(0); });
$('pkb').addEventListener('click', function () { pick(1); });
$('next').addEventListener('click', function () { oi++; showPair(); });
$('reset').addEventListener('click', reset);
document.addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test((e.target.tagName || ''))) return;
  if (e.key === 'a' || e.key === 'A') toggle(0); else if (e.key === 'b' || e.key === 'B') toggle(1);
});

var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); redraw(); }, 80); });
function redraw() {
  if (S.phase === 'dark') return drawMap(null);
  if (MAP && $('map').clientWidth && $('map').clientWidth !== MAP.W) MAP.resize();
  drawMap(S.phase === 'result' ? resLit() : litNow());
}

Promise.all([WK.boot([WK.j('../taste/pairs.json')]), WK.pv()]).then(function (a) {
  D = a[0].D; M = a[0].M; PAIRS = a[0].extra[0].pairs.filter(function (p) { return p.pr && p.pr.length === 2; });
  TW = WK.P.weights(D.xy.length, D.pl);
  MAP = new WK.Map($('map'), $('cv'), D, M, { tap: tapAt }); MAP.resize();
  order = shuffle(PAIRS.map(function (_, i) { return i; }));
  tally(); showPair(); bump();
}).catch(function () { say('the pairs did not load. reload the page.'); });
})();
