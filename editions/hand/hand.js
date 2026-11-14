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
  var rev = phase === 'revealed', c2 = rev ? KIND[pr.hand].col : PAL.ice;
  var tags = pr.a === pr.b && rev ? [{ x: ax, y: ay, t: '1 and 2: ' + trim(D.n[pr.a], 22), c: c2 }]
    : [{ x: ax, y: ay, t: '1: ' + trim(D.n[pr.a], 22), c: PAL.ink }, { x: bx, y: by, t: rev ? '2: ' + trim(D.n[pr.b], 22) : '2: ?', c: c2 }];
  g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.textBaseline = 'middle';
  place(g, map.W, map.H, big, tags).forEach(function (q, k) {
    g.fillStyle = PAL.night; g.fillRect(q[0], q[1], q[2], 22); g.strokeStyle = tags[k].c; g.lineWidth = 1; g.strokeRect(q[0] + 0.5, q[1] + 0.5, q[2] - 1, 21);
    g.fillStyle = tags[k].c; g.fillText(tags[k].t, q[0] + 6, q[1] + 11.5);
  });
  g.restore();
}
function trim(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
// name chips beside their dots: each one takes the first spot that covers no earlier chip and no other dot
function place(g, W, H, big, tags) {
  g.font = '600 12px "IBM Plex Mono", monospace';
  var out = [], ring = big * 1.5 + 2;
  tags.forEach(function (tg) {
    var w = Math.ceil(g.measureText(tg.t).width) + 12, x = tg.x, y = tg.y, best = null, bs = 1e9;
    [[x + 12, y - 25], [x - 12 - w, y - 25], [x + 12, y + 5], [x - 12 - w, y + 5], [x - w / 2, y - ring - 26], [x - w / 2, y + ring + 4], [x + 12, y - 55], [x - 12 - w, y - 55], [x + 12, y + 35], [x - 12 - w, y + 35]].some(function (c) {
      var r = [Math.round(Math.max(2, Math.min(W - 2 - w, c[0]))), Math.round(Math.max(2, Math.min(H - 24, c[1]))), w, 22], s = 0;
      out.forEach(function (o) { var ox = Math.min(r[0] + w, o[0] + o[2]) - Math.max(r[0], o[0]) + 2, oy = Math.min(r[1] + 22, o[1] + 22) - Math.max(r[1], o[1]) + 2; if (ox > 0 && oy > 0) s += 10 * ox * oy; });
      tags.forEach(function (d) { var rad = d.x === x && d.y === y ? big * 0.8 : ring, cx = Math.max(r[0], Math.min(d.x, r[0] + w)), cy = Math.max(r[1], Math.min(d.y, r[1] + 22)), e = rad * rad - (cx - d.x) * (cx - d.x) - (cy - d.y) * (cy - d.y); if (e > 0) s += e; });
      if (s < bs) { bs = s; best = r; }
      return s === 0;
    });
    out.push(best);
  });
  return out;
}

function hearBoth() {
  if (phase === 'revealed' || phase === 'done' || !pairs.length) return;
  var pr = pairs[r], my = ++token; clearTimeout(timer); started2 = false; cur = -1;
  $('gp').disabled = $('ga').disabled = true; $('hear').classList.add('go');
  var step = function (n) {
    if (my !== token) return;
    if (n === 2) { cur = -1; $('hear').classList.remove('go'); $('hear').textContent = 'hear both again'; $('now').textContent = 'both clips done. who pressed play on the second?'; return; }
    var i = n === 0 ? pr.a : pr.b, t = n === 0 ? pr.at : pr.bt, name = D.n[i];
    cur = n; if (n === 1) { started2 = true; enable(); }
    $('now').textContent = n === 0 ? 'clip 1 of 2: ' + name + '. in my log the song was “' + t + '”.' : 'clip 2 of 2' + (pr.a === pr.b ? ', the same preview again' : '') + '. its name shows when you guess.';
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
  $('say').innerHTML = '<b style="color:' + (ok ? PAL.mint : PAL.rose) + '">' + (ok ? 'yes' : 'no') + '</b>, it was ' + KIND[pr.hand].lab + '. the two songs were ' + band(d) + '.';
  $('now').textContent = 'play 2 was “' + pr.bt + '” by ' + D.n[pr.b] + '.';
  score();
  if (r + 1 >= ROUNDS) { phase = 'done'; $('again').hidden = false; $('nxt').hidden = true; $('step').textContent = 'ten pairs done. saying auto-play every time would get ' + tally.queue[1] + ' of 10.'; }
  else { $('nxt').hidden = false; $('nxt').focus({ preventScroll: true }); }
  $('big').parentNode.scrollIntoView({ block: 'nearest' });
  draw();
}
function score() {
  var right = tally.press[0] + tally.queue[0], n = tally.press[1] + tally.queue[1];
  // mint only when the guesses beat saying auto-play every time, which scores every auto-play pair
  $('big').className = 'big ' + (n && right > tally.queue[1] ? 'mint' : 'ink');
  $('big').innerHTML = n ? 'right ' + right + ' of ' + n : '<span class="c">no guesses yet</span>';
  $('numlab').textContent = n ? 'right guesses tonight, out of the pairs you answered' : 'right guesses, out of the pairs you have answered';
  $('c-press').textContent = tally.press[0] + ' of ' + tally.press[1]; $('c-auto').textContent = tally.queue[0] + ' of ' + tally.queue[1];
}
function setPair() {
  var pr = pairs[r], d = dist(pr.a, pr.b);
  phase = 'ready'; started2 = false; cur = -1; $('hear').disabled = false; $('hear').textContent = 'hear both';
  $('gp').disabled = $('ga').disabled = true; $('nxt').hidden = true;
  $('step').textContent = 'pair ' + (r + 1) + ' of ' + ROUNDS;
  $('say').textContent = 'play 1 is ' + D.n[pr.a] + '. play 2’s name is hidden. the two are ' + band(d) + ' on the map.';
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
  if (k === 'h') { if (phase === 'ready' && !WK.sound()) WK.setSound(true); hearBoth(); } else if (k === '1') answer('press'); else if (k === '2') answer('queue'); else if (k === 'n') { if (!$('again').hidden) again(); else next(); }
});
var rt = null;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (map) { map.resize(); draw(); } }, 80); });

Promise.all([WK.boot([WK.j('../haunted/data/haunted.json')]), WK.pv()]).then(function (a) {
  D = a[0].D; evs = a[0].extra[0].ev;
  map = new WK.Map(box, cv, D, a[0].M, { dim: 0.5 }); map.resize();
  build(); score(); setPair(); WK.live(draw);
}, function () { $('say').textContent = 'the data did not load. reload the page to try again.'; });
})();
