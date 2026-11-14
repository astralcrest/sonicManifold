(function () {
'use strict';
var $ = WK.$, C = WK.C, D, M, FIT, LOOP, MAP, K, R;
var S = { a: -1, b: -1, seed: 1, pa: null, pb: null, hit: null, ran: '', cur: null, dirty: true, fresh: false, done: false, lastG: -1 };
// seed two's yellow is in no family color and no shared key color, so it never sinks into a cluster
var VIO = '#8b6fd6', YEL = '#f5e642', INK = '#efe9ff', NIGHT = '#06010f';
var keyEl = document.querySelector('#wk-strip .wk-keys');
if (keyEl) [[INK, 'where they meet', 'the first stops of the two walks that sit in one neighborhood', '<path d="M4.5 4.5L15.5 15.5M15.5 4.5L4.5 15.5" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>'],
  [YEL, 'seed two', 'the auto-play walk from seed two', '<circle cx="10" cy="10" r="5.5" fill="' + YEL + '"/>'],
  [VIO, 'seed one', 'the auto-play walk from seed one', '<circle cx="10" cy="10" r="6.5" fill="none" stroke="' + VIO + '" stroke-width="2.4"/>']].forEach(function (k) {
  var li = document.createElement('li'); li.style.setProperty('--c', k[0]); li.title = k[2];
  li.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">' + k[3] + '</svg>' + k[1]; keyEl.insertBefore(li, keyEl.firstChild);
});

function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function bigrams(s) { var o = {}, n = 0; s = ' ' + s + ' '; for (var i = 0; i < s.length - 1; i++) { o[s.substr(i, 2)] = (o[s.substr(i, 2)] || 0) + 1; n++; } return { o: o, n: n }; }
function dice(a, b) { var x = 0; for (var k in a.o) if (b.o[k]) x += Math.min(a.o[k], b.o[k]); return a.n + b.n ? 2 * x / (a.n + b.n) : 0; }

var NN, NT = null;
function names() { if (!NN) NN = D.n.map(function (n) { return norm(n || ''); }); return NN; }
function titles() {
  if (NT || !WK.title) return NT;
  var any = false, t = [];
  for (var i = 0; i < M.N; i++) { var s = WK.title(i); t.push(s ? norm(s) : ''); if (s) any = true; }
  if (any) NT = t; return NT;
}

// artist name first, then a song title (once the previews' titles have loaded), then a prefix, then a part of a name; the most played wins a tie
function resolve(q) {
  var n = norm(q), N = names(), i, best = -1, via = null;
  if (!n) return { none: true, empty: true };
  var T = titles();
  function pick(test, label) { var b = -1; for (i = 0; i < M.N; i++) if (N[i] && test(i) && (b < 0 || D.pl[i] > D.pl[b])) b = i; return b >= 0 ? b : -1; }
  best = pick(function (i) { return N[i] === n; });
  if (best >= 0) return { i: best };
  if (T) { for (i = 0; i < M.N; i++) if (T[i] && T[i] === n && (best < 0 || D.pl[i] > D.pl[best])) best = i; if (best >= 0) return { i: best, song: WK.title(best) }; }
  best = pick(function (i) { return N[i].indexOf(n) === 0; });
  if (best >= 0) return { i: best };
  if (n.length >= 3) {
    best = pick(function (i) { return N[i].indexOf(n) >= 0; });
    if (best >= 0) return { i: best };
    if (T) { for (i = 0; i < M.N; i++) if (T[i] && T[i].indexOf(n) >= 0 && (best < 0 || D.pl[i] > D.pl[best])) best = i; if (best >= 0) return { i: best, song: WK.title(best) }; }
  }
  var bq = bigrams(n), sc = [];
  for (i = 0; i < M.N; i++) if (N[i]) sc.push([dice(bq, bigrams(N[i])), i]);
  sc.sort(function (x, y) { return y[0] - x[0] || D.pl[y[1]] - D.pl[x[1]]; });
  return { none: true, near: sc.slice(0, 3).map(function (x) { return x[1]; }) };
}

function setMsg(id, r, input) {
  var el = $(id), esc = WK.esc;
  if (r.empty) { el.textContent = 'type an artist or a song.'; return; }
  if (!r.none) { el.innerHTML = r.song ? 'song "' + esc(r.song) + '", by ' + esc(D.n[r.i]) : esc(D.n[r.i]); return; }
  el.innerHTML = 'not in my field. nearest names: ' + r.near.map(function (i) { return '<button type="button" data-i="' + i + '" data-t="' + input + '">' + esc(D.n[i]) + '</button>'; }).join('');
}
['ma', 'mb'].forEach(function (id) {
  $(id).addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $(b.getAttribute('data-t')).value = D.n[+b.getAttribute('data-i')]; run();
  });
});

function touchOf(a, b) {
  var n = a.length, i, k;
  for (k = 0; k < n; k++) {
    for (i = 0; i <= k; i++) if (LOOP.dist(M, a[k], b[i]) <= R) return { step: k, a: k, b: i };
    for (i = 0; i < k; i++) if (LOOP.dist(M, b[k], a[i]) <= R) return { step: k, a: i, b: k };
  }
  var best = 1e9, bp = null;
  for (k = 0; k < n; k++) for (i = 0; i < n; i++) { var d = LOOP.dist(M, a[k], b[i]); if (d < best) { best = d; bp = { a: k, b: i }; } }
  return { never: true, gap: best / M.RH, a: bp.a, b: bp.b };
}

// the rule nearly always takes its top pick, so the same two seeds walk the same way every time: after a walk, the button draws a new pair instead
var TOP = [];
function newPair() {
  var g = LOOP.rng((Math.random() * 1e9) | 0), x = TOP[(g() * TOP.length) | 0], y = TOP[(g() * TOP.length) | 0];
  if (y === x) y = TOP[(TOP.indexOf(x) + 37) % TOP.length];
  $('sa').value = D.n[x]; $('sb').value = D.n[y]; run();
}
function setWalk(on) { ['hear', 'step', 'sn'].forEach(function (id) { $(id).disabled = !on; }); }
function run() {
  var ra = resolve($('sa').value), rb = resolve($('sb').value);
  setMsg('ma', ra, 'sa'); setMsg('mb', rb, 'sb');
  if (ra.none || rb.none) {
    WK.stop(); S.a = S.b = -1; S.pa = S.pb = S.hit = S.cur = null; S.ran = ''; S.dirty = true;
    var big = $('big'); big.textContent = 'no walk'; big.className = 'big ink';
    $('say').textContent = 'one of the seeds is not in my field, so there is nothing to walk yet.';
    $('now').textContent = ''; $('fams').innerHTML = ''; $('run').textContent = 'walk both seeds';
    setWalk(false); hearLabel(); draw(); return;
  }
  var key = ra.i + '|' + rb.i;
  S.ran = key; S.a = ra.i; S.b = rb.i; S.dirty = false; setWalk(true);
  S.pa = LOOP.walk(M, S.a, K, S.seed).path; S.pb = LOOP.walk(M, S.b, K, S.seed + 7).path;
  S.hit = touchOf(S.pa, S.pb);
  var h = S.hit, big = $('big');
  if (h.never) { big.textContent = 'never'; big.className = 'big ink'; $('say').textContent = 'in 40 steps the two paths never share a neighborhood. the closest they get is ' + h.gap.toFixed(2) + ' of one random hop in sound, seed one step ' + h.a + ' to seed two step ' + h.b + '.'; $('sn').value = Math.max(h.a, h.b); }
  else {
    big.textContent = h.step === 0 && h.a === 0 && h.b === 0 ? 'step 0' : 'step ' + h.step; big.className = 'big ink';
    var A = S.pa[h.a], B = S.pb[h.b], t1 = M.order[0];
    $('say').textContent = (h.step === 0 ? 'the two seeds already sit in one neighborhood.' : 'the walks first meet at step ' + h.step + ': ' + (A === B ? 'both at ' + D.n[A] + (h.a !== h.b ? ' (seed one step ' + h.a + ', seed two step ' + h.b + ')' : '') : 'seed one at ' + D.n[A] + ' (step ' + h.a + '), seed two at ' + D.n[B] + ' (step ' + h.b + ')') + '.') + ((A === t1 || B === t1) && D.n[t1] ? ' ' + D.n[t1] + ' is my most played artist.' : '');
    $('sn').value = h.step;
  }
  WK.famKey($('fams'), D, S.pa.concat(S.pb));
  // the picture shows the walks up to the meeting; the first press still plays from the two seeds
  S.fresh = true; S.done = false; END = -1;
  $('run').textContent = 'two new seeds'; WK.stop(); $('step').disabled = false; hearLabel(); where(); draw();
}

var AUX = null, lastI = -1, rep = 0, L = [], LIST = [], OFF = 0, END = -1, PT = 0, MAXPL = 1;
// a fixed pace like the front's walks: each stop gets about 9 s, not its whole 30 s preview
var PACE = 9000;
(function () { var p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { AUX = this; return p.apply(this, arguments); }; })();
function seek(t) { if (!AUX) return; var go = function () { try { AUX.currentTime = Math.min(t, Math.max(0, (AUX.duration || 30) - 8)); } catch (e) {} }; if (AUX.readyState > 0) go(); else AUX.addEventListener('loadedmetadata', go, { once: true }); }
function fam(i) { return D.fam[D.f[i]] || 'untagged'; }
function famLine(p, k) { return fam(p[k]) + (k > 0 && D.f[p[k]] !== D.f[p[k - 1]] ? ', a new family after ' + fam(p[k - 1]) : ''); }
function wt(i) { return Math.log(1 + (D.pl ? D.pl[i] : 1)) / MAXPL; }

// a name that already ends in a period (Bobby V.) gets no second one
function dot(t) { return /[.!?]$/.test(t) ? t : t + '.'; }
function where() {
  if (S.a < 0 || WK.playing()) return;
  var s = +$('sn').value, last = S.pa.length - 1;
  $('step').disabled = s >= last;
  $('now').textContent = 'step ' + s + ' of ' + last + ': seed one is at ' + D.n[S.pa[s]] + ' (' + famLine(S.pa, s) + ')' + dot(s < last ? ', then ' + D.n[S.pa[s + 1]] : '') + ' seed two is at ' + D.n[S.pb[s]] + ' (' + famLine(S.pb, s) + ')' + dot(s < last ? ', then ' + D.n[S.pb[s + 1]] : '');
}
function onst(k, info) {
  clearTimeout(PT);
  var s = +$('sn').value, last = S.pa ? S.pa.length - 1 : 40;
  if (info) {
    var tap = info.tag === 'tap';
    S.cur = { i: info.i, col: tap ? INK : info.tag === 'seed one' ? VIO : YEL };
    if (tap) { S.lastG = -1; $('now').textContent = 'hearing ' + info.title + ' by ' + D.n[info.i] + ' (' + fam(info.i) + ').'; }
    else {
      var gk = OFF + k, m = L[gk], rp = false, p = m.w ? S.pb : S.pa, nx = L[gk + 1];
      if (info.i === lastI) { rep++; seek(6 * rep); rp = true; } else rep = 0;
      lastI = info.i; S.lastG = gk; $('sn').value = m.step; s = m.step;
      $('now').textContent = 'step ' + s + ' of ' + last + ', playing ' + info.tag + ': ' + info.title + ', by ' + D.n[info.i] + ' (' + famLine(p, s) + ').' + (rp ? ' same artist as the clip before, so it starts ' + 6 * rep + ' seconds in.' : '') + (nx ? ' next: ' + (nx.step !== s ? 'step ' + nx.step + ', ' : '') + (nx.w ? 'seed two' : 'seed one') + '.' : END < last ? ' last stop for now.' : ' last stop.');
      PT = setTimeout(function () { if (gk + 1 < LIST.length) go(gk + 1); else WK.stop(); }, PACE);
    }
    WK.live(draw);
  } else {
    S.done = S.lastG >= 0 && S.lastG === LIST.length - 1 && END < last; S.lastG = -1;
    if (S.done) $('sn').value = END;
    S.cur = null; WK.still(); where(); draw();
    if (S.done) $('now').textContent = 'stopped two steps after the walks ' + (S.hit && S.hit.never ? 'come closest' : 'meet') + '. keep going plays the rest.';
  }
  hearLabel();
}

function draw() {
  if (!MAP) return;
  MAP.begin(); var g = MAP.g, T = [];
  if (S.cur) { WK.pulse(g, MAP.X(S.cur.i), MAP.Y(S.cur.i), S.cur.col, 14); T.push([S.cur.i, D.n[S.cur.i], S.cur.col]); }
  if (S.a >= 0) drawWalks(T);
  tags(T);
}
// the name chips, each moved off the ones placed before it, so close stops never stack their words
function tags(T) {
  var g = MAP.g, W = MAP.W, H = MAP.H, put = [];
  g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.setLineDash([]);
  g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  T.forEach(function (t) {
    var w = Math.ceil(g.measureText(t[1]).width) + 12, X = MAP.X(t[0]), Y = MAP.Y(t[0]), c = [], s, k, x, y, ok;
    for (s = 0; s < 6; s++) c.push([X + 12, Y - 14 - 24 * s], [X - 12 - w, Y - 14 - 24 * s], [X + 12, Y + 16 + 24 * s], [X - 12 - w, Y + 16 + 24 * s]);
    for (k = 0; k < c.length; k++) {
      x = Math.round(Math.max(2, Math.min(W - w - 2, c[k][0]))); y = Math.round(Math.max(12, Math.min(H - 12, c[k][1])));
      ok = put.every(function (r) { return x + w + 2 <= r[0] || r[0] + r[2] + 2 <= x || y + 13 <= r[1] - 11 || r[1] + 13 <= y - 11; });
      if (ok) break;
    }
    put.push([x, y, w]);
    g.fillStyle = NIGHT; g.fillRect(x, y - 11, w, 22); g.strokeStyle = t[2]; g.lineWidth = 1; g.strokeRect(x + 0.5, y - 10.5, w - 1, 21);
    g.fillStyle = t[2]; g.fillText(t[1], x + 6, y + 0.5);
  });
  g.restore();
}
// where the walks meet: a crisp ink cross on a night outline (the star is the key's mark for my press)
function cross(g, x, y, r) {
  g.save(); g.setLineDash([]); g.lineCap = 'round';
  [[NIGHT, 5], [INK, 2.4]].forEach(function (s) { g.strokeStyle = s[0]; g.lineWidth = s[1]; g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke(); });
  g.restore();
}
// a new family: a small triangle in that family's color just under the stop
function famTick(g, x, y, col) {
  g.save(); g.setLineDash([]); g.fillStyle = col; g.strokeStyle = NIGHT; g.lineWidth = 1; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 5, y + 14); g.lineTo(x - 5, y + 14); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function walkDraw(g, p, col, kind, k) {
  WK.P.ribbon(g, MAP.pts(p), col, col, 1.2, 0.22);
  MAP.ribbon(p, k + 1, col, col);
  for (var j = 0; j <= k; j++) {
    var x = MAP.X(p[j]), y = MAP.Y(p[j]);
    if (j > 0 && D.f[p[j]] !== D.f[p[j - 1]]) famTick(g, x, y, WK.FAMC[fam(p[j])] || C.mute);
    WK.P.glyph(g, kind, x, y, 3 + 3.5 * wt(p[j]), col);
  }
}
function drawWalks(T) {
  var g = MAP.g, h = S.hit, s = +$('sn').value;
  walkDraw(g, S.pa, VIO, 'ring', s); walkDraw(g, S.pb, YEL, 'dot', s);
  if (h) {
    var xa = MAP.X(S.pa[h.a]), ya = MAP.Y(S.pa[h.a]), xb = MAP.X(S.pb[h.b]), yb = MAP.Y(S.pb[h.b]);
    g.save(); g.strokeStyle = INK; g.lineWidth = 1.5; g.setLineDash(h.never ? [4, 4] : []); g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke(); g.restore();
    var gr = h.never ? 5 : 7; cross(g, xa, ya, gr); cross(g, xb, yb, gr);
  }
  MAP.stop(S.pa[s], VIO, 14); MAP.stop(S.pb[s], YEL, 14);
  if (h && h.step === 0 && !h.never) { T.push([S.pa[0], 'start together', INK]); return; }
  if (h) { if (h.never) T.push([S.pa[h.a], 'closest', INK]); else T.push([h.step === h.a ? S.pa[h.a] : S.pb[h.b], 'step ' + h.step, INK]); }
  T.push([S.pa[0], 'one', VIO], [S.pb[0], 'two', YEL]);
}

function keepGoing() { return S.done && END >= 0 && END < S.pa.length - 1 && +$('sn').value === END; }
function hearLabel() {
  var p = WK.playing();
  $('hear').textContent = p ? 'stop the sound' : S.a < 0 || S.fresh ? 'play the walks' : keepGoing() ? 'keep going' : 'play from step ' + $('sn').value;
  $('hear').setAttribute('aria-pressed', p ? 'true' : 'false');
  WK.primary($('hear').disabled ? null : '#hear');
}
// the meeting is the point: a press plays to two steps past it (or past the closest pass), and keep going plays the rest
function stopAt() { var h = S.hit, last = S.pa.length - 1; return h ? Math.min(last, (h.never ? Math.max(h.a, h.b) : h.step) + 2) : last; }
function go(o) { clearTimeout(PT); OFF = o; WK.play(LIST.slice(o), onst); }
function playFrom(s) {
  if (S.a < 0) return;
  var last = S.pa.length - 1, e = s <= stopAt() ? stopAt() : last;
  S.fresh = false; S.done = false; S.lastG = -1; clearTimeout(PT);
  $('now').textContent = 'loading previews';
  WK.pv().then(function () {
    var j; LIST = []; L = []; lastI = -1; rep = 0; END = e;
    for (j = s; j <= e; j++) {
      if (WK.title(S.pa[j])) { LIST.push({ i: S.pa[j], tag: 'seed one' }); L.push({ step: j, w: 0 }); }
      if (S.pb[j] !== S.pa[j] && WK.title(S.pb[j])) { LIST.push({ i: S.pb[j], tag: 'seed two' }); L.push({ step: j, w: 1 }); }
    }
    if (!LIST.length) { $('now').textContent = 'no preview for these stops.'; hearLabel(); return; }
    go(0);
  }, function () { $('now').textContent = 'the previews did not load. reload the page.'; });
}
function jump(s) {
  if (!S.pa) return;
  var was = WK.playing(); if (was) WK.stop();
  S.fresh = false; S.done = false;
  $('sn').value = Math.max(0, Math.min(S.pa.length - 1, s)); where(); hearLabel(); draw(); if (was) playFrom(+$('sn').value);
}
$('sn').addEventListener('input', function () { jump(+$('sn').value); });
$('hear').addEventListener('click', function () {
  if (WK.playing()) { WK.stop(); return; }
  if (S.fresh) { $('sn').value = 0; where(); draw(); playFrom(0); return; }
  playFrom(keepGoing() ? END + 1 : +$('sn').value);
});
$('step').addEventListener('click', function () { jump(+$('sn').value + 1); });
document.addEventListener('keydown', function (e) {
  if (/INPUT|TEXTAREA/.test((e.target.tagName || '')) && e.target.type !== 'range') return;
  if (e.key === 'ArrowRight') { jump(+$('sn').value + 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { jump(+$('sn').value - 1); e.preventDefault(); }
});
$('run').addEventListener('click', function () { if (S.dirty || S.a < 0) run(); else newPair(); });
['sa', 'sb'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); }); $(id).addEventListener('input', function () { S.dirty = true; $('run').textContent = 'walk both seeds'; }); });
$('back').addEventListener('click', function (e) { if (history.length > 1 && document.referrer && !/kiosk=1/.test(location.search)) { e.preventDefault(); history.back(); } });

function sizeUp() { MAP.resize(); draw(); }
WK.boot([]).then(function (b) {
  D = b.D; M = b.M; FIT = b.FIT; LOOP = b.LOOP; K = FIT.queue.K;
  // same neighborhood = within the median distance from an artist to its own sixth-nearest neighbor
  var ds = [], i; for (i = 0; i < M.N; i++) { var j = D.nn[i][5]; if (j >= 0) ds.push(LOOP.dist(M, i, j)); }
  ds.sort(function (x, y) { return x - y; }); R = ds[ds.length >> 1];
  $('def').textContent = 'same neighborhood: two stops within ' + (R / M.RH).toFixed(2) + ' of one random hop in sound, the median distance from an artist to its sixth-nearest. rule: the auto-play rule matched to my log, ' + M.N.toLocaleString('en-US') + ' artists, 40 steps. a toy, not a prediction.';
  MAXPL = Math.log(1 + Math.max.apply(null, D.pl));
  MAP = new WK.Map($('map'), $('cv'), D, M, { tap: function (i) {
    if (S.a >= 0) { var ka = S.pa.indexOf(i), kb = S.pb.indexOf(i), t = ka >= 0 && kb >= 0 ? Math.min(ka, kb) : ka >= 0 ? ka : kb; if (t >= 0) { jump(t); playFrom(t); return; } }
    WK.play([{ i: i, tag: 'tap' }], onst);
  } }); MAP.resize();
  window.addEventListener('resize', sizeUp);
  WK.pv().catch(function () {});
  for (i = 0; i < 150; i++) if (D.n[M.order ? M.order[i] : i]) TOP.push(M.order[i]);
  newPair();
});
})();
