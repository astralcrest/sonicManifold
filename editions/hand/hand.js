(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, ROUNDS = 10, CLIP = 12000;
var cv = $('cv'), box = $('map'), D = null, map = null, evs = [], pairs = [], r = 0, phase = 'idle', guess = null;
var tally = { press: [0, 0], queue: [0, 0] }, token = 0, timer = null, cur = -1, started2 = false;
var KIND = { press: { col: PAL.mint, gly: 'star', lab: 'my press' }, queue: { col: '#a48cf0', gly: 'ring', lab: 'auto-play' } };

function dist(a, b) { var dx = D.xy[a][0] - D.xy[b][0], dy = D.xy[a][1] - D.xy[b][1]; return Math.sqrt(dx * dx + dy * dy); }
function band(d) { return d < 60 ? 'close in sound' : d > 150 ? 'a jump' : 'mid'; }

function build() {
  var pool = [], e, k, p, q;
  evs.forEach(function (ev, ei) {
    for (k = 1; k < ev.p.length; k++) {
      p = ev.p[k - 1]; q = ev.p[k];
      if (q[2] !== 'press' && q[2] !== 'queue') continue;
      if (!WK.title(p[0]) || !WK.title(q[0])) continue;
      pool.push({ a: p[0], at: p[1], b: q[0], bt: q[1], hand: q[2] });
    }
  });
  pairs = [];
  var seen = {};
  while (pairs.length < ROUNDS && pool.length) {
    var x = pool.splice((Math.random() * pool.length) | 0, 1)[0], key = x.a + '_' + x.b;
    if (seen[key]) continue; seen[key] = 1; pairs.push(x);
  }
}

function draw() {
  if (!map || !pairs.length) return;
  var pr = pairs[Math.min(r, pairs.length - 1)], g = map.g, ax = map.X(pr.a), ay = map.Y(pr.a), bx = map.X(pr.b), by = map.Y(pr.b), big = map.W < 500 ? 9 : 12;
  map.begin();
  map.line([pr.a, pr.b], 2, PAL.ice, [6, 6], 1.6);
  var fa = WK.FAMC[D.fam[D.f[pr.a]]] || PAL.ice, fb = WK.FAMC[D.fam[D.f[pr.b]]] || PAL.ice;
  P.peb(g, pr.a, ax, ay, big, fa); P.peb(g, pr.b, bx, by, big, fb);
  if (phase === 'revealed') { var kd = KIND[pr.hand]; P.glyph(g, kd.gly, bx, by, big * 1.1, PAL.night); g.save(); g.strokeStyle = kd.col; g.lineWidth = 2; g.beginPath(); g.arc(bx, by, big * 1.5, 0, 6.2832); g.stroke(); g.restore(); }
  if (cur === 0) WK.pulse(g, ax, ay, PAL.ice, big * 1.4);
  if (cur === 1) WK.pulse(g, bx, by, PAL.ice, big * 1.4);
  map.tag(pr.a, '1: ' + trim(D.n[pr.a], 22), PAL.ink);
  map.tag(pr.b, phase === 'revealed' ? '2: ' + trim(D.n[pr.b], 22) : '2: ?', phase === 'revealed' ? KIND[pr.hand].col : PAL.ice);
}
function trim(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function hearBoth() {
  if (phase === 'revealed' || phase === 'done' || !pairs.length) return;
  var pr = pairs[r], my = ++token; clearTimeout(timer); started2 = false; cur = -1;
  $('gp').disabled = $('ga').disabled = true; $('hear').classList.add('go');
  var step = function (n) {
    if (my !== token) return;
    if (n === 2) { cur = -1; $('hear').classList.remove('go'); $('hear').textContent = 'hear both again'; $('now').textContent = 'both clips done. who pressed play on the second?'; return; }
    var i = n === 0 ? pr.a : pr.b, t = n === 0 ? pr.at : pr.bt, name = D.n[i];
    cur = n; if (n === 1) { started2 = true; enable(); }
    $('now').textContent = 'clip ' + (n + 1) + ' of 2: ' + name + (n === 1 && pr.a === pr.b ? ' again, the same preview' : '') + '. in my log the song was “' + t + '”.';
    WK.play([{ i: i, tag: n }], function () {});
    timer = setTimeout(function () { if (my !== token) return; WK.stop(); step(n + 1); }, CLIP);
  };
  step(0);
}
function enable() { if (phase === 'ready') { $('gp').disabled = $('ga').disabled = false; } }

function answer(h) {
  if (phase !== 'ready' || !started2) return;
  var pr = pairs[r], ok = h === pr.hand;
  token++; clearTimeout(timer); WK.stop(); cur = -1;
  phase = 'revealed'; tally[pr.hand][1]++; if (ok) tally[pr.hand][0]++;
  $('gp').disabled = $('ga').disabled = true; $('hear').classList.remove('go'); $('hear').disabled = true;
  var d = dist(pr.a, pr.b);
  $('say').innerHTML = '<b style="color:' + (ok ? PAL.mint : PAL.rose) + '">' + (ok ? 'yes' : 'no') + '</b>, it was ' + KIND[pr.hand].lab + '. the two songs were ' + band(d) + '. hint: close in sound = auto-play more often; a jump = more often my press.';
  $('now').textContent = 'play 2 was “' + pr.bt + '” by ' + D.n[pr.b] + '.';
  score();
  if (r + 1 >= ROUNDS) { phase = 'done'; $('again').hidden = false; $('nxt').hidden = true; $('step').textContent = 'ten pairs done'; }
  else { $('nxt').hidden = false; $('nxt').focus(); }
  draw();
}
function score() {
  var right = tally.press[0] + tally.queue[0], n = tally.press[1] + tally.queue[1];
  $('big').className = 'big ' + (n && right / n >= 0.5 ? 'mint' : 'ink');
  $('big').innerHTML = n ? 'right ' + right + ' of ' + n : '<span class="c">no guesses yet</span>';
  $('numlab').textContent = n ? 'right guesses tonight, out of the pairs you answered' : 'right guesses, out of the pairs you have answered';
  $('c-press').textContent = tally.press[0] + ' of ' + tally.press[1]; $('c-auto').textContent = tally.queue[0] + ' of ' + tally.queue[1];
}
function setPair() {
  var pr = pairs[r], d = dist(pr.a, pr.b);
  phase = 'ready'; started2 = false; cur = -1; $('hear').disabled = false; $('hear').textContent = 'hear both';
  $('gp').disabled = $('ga').disabled = true; $('nxt').hidden = true;
  $('step').textContent = 'pair ' + (r + 1) + ' of ' + ROUNDS;
  $('say').textContent = 'play 1 is ' + D.n[pr.a] + '. play 2 is hidden. the two are ' + band(d) + ' on the map.';
  $('now').textContent = 'press hear both. sound off? turn it on at the top.';
  draw();
}
function next() { if (phase !== 'revealed') return; r++; setPair(); $('hear').focus(); }
function again() { token++; clearTimeout(timer); WK.stop(); tally = { press: [0, 0], queue: [0, 0] }; r = 0; build(); score(); $('again').hidden = true; setPair(); }

$('hear').addEventListener('click', hearBoth);
$('gp').addEventListener('click', function () { answer('press'); });
$('ga').addEventListener('click', function () { answer('queue'); });
$('nxt').addEventListener('click', next);
$('again').addEventListener('click', again);
addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  var k = e.key.toLowerCase();
  if (k === 'h') hearBoth(); else if (k === '1') answer('press'); else if (k === '2') answer('queue'); else if (k === 'n') { if (!$('again').hidden) again(); else next(); }
});
var rt = null;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (map) { map.resize(); draw(); } }, 80); });

Promise.all([WK.boot([WK.j('../haunted/data/haunted.json')]), WK.pv()]).then(function (a) {
  D = a[0].D; evs = a[0].extra[0].ev;
  map = new WK.Map(box, cv, D, a[0].M, { dim: 0.5 }); map.resize();
  build(); score(); setPair(); WK.live(draw);
}, function () { $('say').textContent = 'the data did not load. reload the page to try again.'; });
})();
