(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, D, M, MAP, LOOP, PV = null;
var cv = $('cv'), V = 150, R_REACH = 150, TABOO = 12;
var S = { x: 0, y: 0, cur: 0, ta: -1, tb: -1, la: 0, lb: 0, trail: [], seen: [], start: 0, last: 0, active: false, dirty: true, lastPlay: 0, kept: 0, path: [], fchg: 0 };
var CLIP = 7000, AU = new Audio(), R = { on: false, k: -1, list: [], t: 0 };
AU.volume = 0.25;
var H = { a: { id: null, dx: 0, dy: 0, s: 0, key: 0 }, b: { id: null, dx: 0, dy: 0, s: 0, key: 0 } };

function px(i) { return D.xy[i][0]; }
function py(i) { return D.xy[i][1]; }
function taboo(i) { return S.seen.indexOf(i) >= 0; }
function remember(i) { S.seen.push(i); if (S.seen.length > TABOO) S.seen.shift(); }

function pickA(c) {
  var nn = D.nn[c].slice().sort(function (p, q) { return LOOP.dist(M, c, p) - LOOP.dist(M, c, q); }), k;
  for (k = 0; k < nn.length; k++) if (!taboo(nn[k])) return nn[k];
  return nn[0];
}
function pickB(c) {
  var best = -1, bp = -1, i, d;
  for (i = 0; i < M.N; i++) {
    if (i === c || taboo(i)) continue;
    d = Math.hypot(px(i) - px(c), py(i) - py(c));
    if (d < R_REACH && D.pl[i] > bp) { bp = D.pl[i]; best = i; }
  }
  if (best >= 0) return best;
  bp = 1e9;
  for (i = 0; i < M.N; i++) { if (i === c || taboo(i)) continue; d = Math.hypot(px(i) - px(c), py(i) - py(c)); if (d < bp) { bp = d; best = i; } }
  return best;
}
function retarget() { S.ta = pickA(S.cur); S.tb = pickB(S.cur); }

function fam(i) { return D.fam[D.f[i]] || ''; }
function famCol(i) { return WK.FAMC[fam(i)] || PAL.ice; }
function clipOf(i) { return PV && PV[i] ? PV[i] : null; }
function silence() { clearTimeout(R.t); AU.pause(); }
function hear(i, off, done) {
  var c = clipOf(i); silence();
  if (!c) { R.t = setTimeout(done || function () {}, 2500); return null; }
  AU.src = c[1];
  var seek = function () { AU.removeEventListener('loadedmetadata', seek); try { if (off) AU.currentTime = off; } catch (e) {} };
  AU.addEventListener('loadedmetadata', seek);
  var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {});
  R.t = setTimeout(done || function () {}, CLIP);
  return c[0];
}
function sameRun(list, k) { var n = 0; while (k - n > 0 && list[k - n - 1] === list[k]) n++; return n; }
function playBtn() { var b = $('play'); b.textContent = R.on ? 'stop the path' : (S.path.length > 1 ? 'hear the path (' + S.path.length + ' stops)' : 'hear the start'); b.setAttribute('aria-pressed', R.on ? 'true' : 'false'); }
function stopReplay(msg) { R.on = false; R.k = -1; silence(); playBtn(); if (msg) $('now').textContent = msg; S.dirty = true; }
function replayAt(k) {
  if (k >= R.list.length) { stopReplay('that was the whole path: ' + R.list.length + ' stops. pull again to extend it.'); return; }
  R.k = k; var i = R.list[k], t = hear(i, (sameRun(R.list, k) * 5) % 20, function () { replayAt(k + 1); });
  var nx = R.list[k + 1];
  $('now').textContent = 'stop ' + (k + 1) + ' of ' + R.list.length + ': ' + (t ? t + ' by ' : '') + D.n[i] + ' (' + fam(i) + ')' + (t ? '' : ', no clip for this one') + (sameRun(R.list, k) ? ', a later second of the same artist' : '') + (nx === undefined ? '. the last stop.' : '.');
  S.dirty = true;
}
function startReplay(k) { R.on = true; R.list = S.path.slice(); playBtn(); replayAt(k || 0); }
function skip() { if (R.on) { clearTimeout(R.t); replayAt(R.k + 1); } }

function reset() {
  stopReplay();
  S.start = M.order[11]; S.cur = S.start; S.x = px(S.start); S.y = py(S.start); S.la = 0; S.lb = 0; S.trail = [[S.x, S.y, 0]]; S.seen = [S.start]; S.lastPlay = 0; S.path = [S.start]; S.fchg = 0; playBtn();
  retarget(); S.dirty = true; out();
}

function geo() {
  var W = MAP.W, Hh = MAP.H, r = Math.min(W, Hh) * 0.3;
  return { r: r, ax: 44, bx: W - 44, y: Hh / 2 };
}
function setHandle(h, x, y) {
  var G = geo(), ax = h === H.a ? G.ax : G.bx, dx = x - ax, dy = y - G.y, L = Math.hypot(dx, dy);
  if (L > G.r) { dx *= G.r / L; dy *= G.r / L; L = G.r; }
  h.dx = dx; h.dy = dy; h.s = L / G.r < 0.12 ? 0 : L / G.r;
}
function hitTarget(x, y) {
  var list = [[S.ta, 1], [S.tb, 2]], k, j;
  for (k = 0; k < list.length; k++) if (Math.hypot(MAP.X(list[k][0]) - x, MAP.Y(list[k][0]) - y) < 20) return { i: list[k][0], w: list[k][1] };
  for (j = 0; j < S.path.length; j++) if (Math.hypot(MAP.X(S.path[j]) - x, MAP.Y(S.path[j]) - y) < 12) return { i: -1, j: j };
  return null;
}
function hitHandle(x, y) {
  var G = geo(), best = null, bd = 44;
  [[H.a, G.ax], [H.b, G.bx]].forEach(function (d) { var dd = Math.hypot(d[1] + d[0].dx - x, G.y + d[0].dy - y); if (dd < bd) { bd = dd; best = d[0]; } });
  return best;
}
function snd() { if (!WK.sound()) WK.setSound(true); }
function jumpTo(i, w) {
  if (i < 0) return;
  var d = Math.hypot(px(i) - S.x, py(i) - S.y);
  if (w === 1) S.la += d; else S.lb += d;
  S.x = px(i); S.y = py(i); S.trail.push([S.x, S.y, w]); arrive(i, true); S.dirty = true;
}
function local(e) { var b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top, b.width]; }
// only a touch on a handle or a target holds the page still; any other touch on the map scrolls
cv.addEventListener('touchstart', function (e) {
  var l = local(e.changedTouches[0]);
  if (hitTarget(l[0], l[1]) || hitHandle(l[0], l[1])) e.preventDefault();
}, { passive: false });
cv.addEventListener('pointerdown', function (e) {
  var l = local(e), tg = hitTarget(l[0], l[1]);
  if (tg) { snd(); if (tg.j != null) startReplay(tg.j); else jumpTo(tg.i, tg.w); e.preventDefault(); return; }
  var h = hitHandle(l[0], l[1]); if (!h || h.id !== null) return;
  snd(); h.id = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  setHandle(h, l[0], l[1]); S.dirty = true; e.preventDefault();
});
cv.addEventListener('pointermove', function (e) {
  var h = H.a.id === e.pointerId ? H.a : H.b.id === e.pointerId ? H.b : null; if (!h) return;
  var l = local(e); setHandle(h, l[0], l[1]); S.dirty = true;
});
function up(e) {
  [H.a, H.b].forEach(function (h) { if (h.id === e.pointerId) { h.id = null; h.s = 0; h.dx = 0; h.dy = 0; S.dirty = true; } });
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
addEventListener('keydown', function (e) {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'n' && R.on) { skip(); return; }
  if (e.key === 'ArrowLeft') { snd(); H.a.key = 1; e.preventDefault(); } else if (e.key === 'ArrowRight') { snd(); H.b.key = 1; e.preventDefault(); }
});
addEventListener('keyup', function (e) { if (e.key === 'ArrowLeft') H.a.key = 0; else if (e.key === 'ArrowRight') H.b.key = 0; });

function strength(h) { return h.key ? 1 : h.s; }
[['pa', H.a], ['pb', H.b]].forEach(function (d) {
  var b = $(d[0]), h = d[1]; if (!b) return;
  var on = function (e) { snd(); h.key = 1; b.classList.add('go'); b.setAttribute('aria-pressed', 'true'); S.dirty = true; try { b.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); };
  var off = function () { h.key = 0; b.classList.remove('go'); b.setAttribute('aria-pressed', 'false'); S.dirty = true; };
  b.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { b.addEventListener(ev, off); });
  b.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); snd(); h.key = 1; b.classList.add('go'); } });
  b.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') off(); });
});
function unit(tx, ty) { var dx = tx - S.x, dy = ty - S.y, L = Math.hypot(dx, dy); return L < 1 ? [0, 0] : [dx / L, dy / L]; }

function step(dt) {
  var sa = strength(H.a), sb = strength(H.b);
  if (sa + sb < 0.02) { S.active = false; return false; }
  S.active = true;
  var ua = unit(px(S.ta), py(S.ta)), ub = unit(px(S.tb), py(S.tb)), mv = V * dt, x0 = S.x, y0 = S.y;
  S.x = Math.max(0, Math.min(1000, S.x + (sa * ua[0] + sb * ub[0]) * mv));
  S.y = Math.max(0, Math.min(1000, S.y + (sa * ua[1] + sb * ub[1]) * mv));
  // each pull is credited only with the part of the real step that went its way: two pulls that cancel move nothing and earn nothing
  var mx = S.x - x0, my = S.y - y0, m = Math.hypot(mx, my);
  if (m > 1e-6) {
    var ca = Math.max(0, sa * (ua[0] * mx + ua[1] * my) / m), cb = Math.max(0, sb * (ub[0] * mx + ub[1] * my) / m);
    if (ca + cb > 0) { S.la += m * ca / (ca + cb); S.lb += m * cb / (ca + cb); }
  }
  var win = sa > sb * 1.1 ? 1 : sb > sa * 1.1 ? 2 : 0, lt = S.trail[S.trail.length - 1];
  if (Math.hypot(S.x - lt[0], S.y - lt[1]) > 8) { S.trail.push([S.x, S.y, win]); if (S.trail.length > 900) S.trail.shift(); }
  var da = Math.hypot(S.x - px(S.ta), S.y - py(S.ta)), db = Math.hypot(S.x - px(S.tb), S.y - py(S.tb));
  if (da < 14 || db < 14) { arrive(da < db ? S.ta : S.tb); }
  return true;
}
function arrive(i, force) {
  var prev = S.cur, chg = fam(i) !== fam(prev);
  S.cur = i; remember(i); retarget(); S.path.push(i); if (chg) S.fchg++; playBtn();
  var now = Date.now();
  if (R.on) return;
  if (force || now - S.lastPlay > 1500) {
    S.lastPlay = now;
    var t = hear(i, prev === i ? 6 : 0);
    $('now').textContent = 'stop ' + S.path.length + ': ' + D.n[i] + ' (' + fam(i) + (chg ? ', a new family' : '') + '), ' + (t ? 'hearing ' + t : 'no clip for this one') + '.';
  } else $('now').textContent = 'stop ' + S.path.length + ': ' + D.n[i] + ' (' + fam(i) + (chg ? ', a new family' : '') + ').';
}

function out() {
  var t = S.la + S.lb, a = t ? Math.round(100 * S.la / t) : 0;
  $('num').innerHTML = t ? '<span class="a">' + a + '</span><span class="c">:</span><span class="b">' + (100 - a) + '</span>' : '<span class="c">pull to start</span>';
  $('numlab').textContent = t ? 'how far each pull moved it, out of 100' : 'how far each pull moved the point';
  $('say').textContent = t ? 'sounds alike moved it ' + a + ', most played ' + (100 - a) + '. ' + (Math.abs(a - 50) < 8 ? 'close to even.' : a > 50 ? 'sounds alike is winning.' : 'most played is winning.') + ' ' + S.fchg + (S.fchg === 1 ? ' family change' : ' family changes') + ' so far.' : '';
}

function runs() {
  var T = S.trail, r = [], cur = null, i;
  for (i = 1; i < T.length; i++) {
    var w = T[i][2];
    if (!cur || cur.w !== w) { cur = { w: w, p: [[MAP.ox + T[i - 1][0] * MAP.scl, MAP.oy + T[i - 1][1] * MAP.scl]] }; r.push(cur); }
    cur.p.push([MAP.ox + T[i][0] * MAP.scl, MAP.oy + T[i][1] * MAP.scl]);
  }
  return r;
}
function draw() {
  MAP.begin();
  var g = MAP.g, G = geo(), cols = [PAL.ink, PAL.ice, PAL.mint];
  runs().forEach(function (r) { if (r.p.length > 1) P.ribbon(g, r.p, cols[r.w], cols[r.w], MAP.W < 500 ? 2.6 : 3.4, 0.95); });
  var tx = function (i) { return MAP.ox + px(i) * MAP.scl; }, ty = function (i) { return MAP.oy + py(i) * MAP.scl; };
  var X = MAP.ox + S.x * MAP.scl, Y = MAP.oy + S.y * MAP.scl;
  // handle names go under everything else, so a name tag that lands on them stays readable
  g.save(); g.font = '500 12px "IBM Plex Mono", monospace';
  g.fillStyle = PAL.ice; g.textAlign = 'left'; g.fillText('sounds alike', 12, G.y + 52);
  g.fillStyle = PAL.mint; g.textAlign = 'right'; g.fillText('most played', MAP.W - 12, G.y + 52); g.restore();
  P.ribbon(g, [[X, Y], [tx(S.ta), ty(S.ta)]], PAL.ice, PAL.ice, 1, 0.5, [3, 5]);
  P.ribbon(g, [[X, Y], [tx(S.tb), ty(S.tb)]], PAL.mint, PAL.mint, 1, 0.5, [3, 5]);
  P.glyph(g, 'star', tx(S.tb), ty(S.tb), 11, PAL.mint);
  if (strength(H.b) > 0) MAP.tag(S.tb, D.n[S.tb], PAL.mint, PAL.night);
  var pm = 1; S.path.forEach(function (i) { if (D.pl[i] > pm) pm = D.pl[i]; });
  S.path.forEach(function (i, k) {
    var x = tx(i), y = ty(i), fade = R.on && k > R.k ? 0.35 : 1, rr = 4 + 6 * Math.sqrt(D.pl[i] / pm);
    g.save(); g.globalAlpha = fade;
    if (k > 0 && fam(i) !== fam(S.path[k - 1])) { g.strokeStyle = famCol(i); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, rr + 4, 0, 6.2832); g.stroke(); }
    P.peb(g, i, x, y, rr, famCol(i));
    if (S.path.length <= 40) { g.font = '600 10px "IBM Plex Mono", monospace'; g.fillStyle = PAL.ink; g.textAlign = 'center'; g.fillText(String(k + 1), x, y - rr - 3); }
    g.restore();
  });
  if (R.on && R.k >= 0) { var ri = S.path[R.k]; WK.pulse(g, tx(ri), ty(ri), famCol(ri), 14); MAP.tag(ri, (R.k + 1) + ' of ' + S.path.length + ': ' + D.n[ri], famCol(ri), PAL.night); }
  P.peb(g, S.cur, X, Y, 8, PAL.ink);
  P.rings(g, X, Y, PAL.ink, 18); WK.pulse(g, X, Y, S.active && !R.on ? (strength(H.a) > strength(H.b) ? PAL.ice : PAL.mint) : PAL.ink, 18);
  MAP.tag(S.cur, 'here: ' + D.n[S.cur], PAL.ink, PAL.night);
  // the sounds-alike target usually sits inside the point's rings, so it draws on top, named on a chip under the point
  var ax_ = tx(S.ta), ay_ = ty(S.ta);
  g.save(); g.fillStyle = PAL.night; g.beginPath(); g.arc(ax_, ay_, 8, 0, 6.2832); g.fill(); g.restore();
  P.glyph(g, 'dot', ax_, ay_, 8.5, PAL.ice);
  g.save(); g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
  var ct = 'sounds alike: ' + D.n[S.ta], cw = g.measureText(ct).width + 12, cx = Math.round(Math.max(2, Math.min(MAP.W - 2 - cw, X - cw / 2))), cy = Math.round(Y + 40 + 11 < MAP.H - 2 ? Y + 40 : Y - 48);
  g.fillStyle = PAL.night; g.fillRect(cx, cy - 11, cw, 22); g.strokeStyle = PAL.ice; g.lineWidth = 1; g.strokeRect(cx + 0.5, cy - 10.5, cw - 1, 21);
  g.fillStyle = PAL.ice; g.fillText(ct, cx + 6, cy + 0.5); g.restore();
  // handles
  [[H.a, G.ax, PAL.ice, 'dot'], [H.b, G.bx, PAL.mint, 'star']].forEach(function (d) {
    var h = d[0], hx = d[1] + h.dx, hy = G.y + h.dy;
    if (h.s || h.key) P.ribbon(g, [[d[1], G.y], [hx, hy]], d[2], d[2], 2, 0.5);
    g.save(); g.fillStyle = PAL.night; g.beginPath(); g.arc(hx, hy, 28, 0, 6.2832); g.fill(); g.lineWidth = 1.5; g.strokeStyle = d[2]; g.globalAlpha = h.s || h.key ? 1 : 0.6; g.stroke(); g.restore();
    P.glyph(g, d[3], hx, hy, 17, d[2]);
  });
}

var lastT = 0;
function frame(t) {
  var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
  var moved = step(dt); S.fr = (S.fr || 0) + 1;
  if (moved || S.dirty || S.fr % 2 === 0) { draw(); if (moved || S.dirty) out(); S.dirty = false; }
  requestAnimationFrame(frame);
}
$('reset').addEventListener('click', function () { reset(); $('now').textContent = 'back at the start.'; });
$('play').addEventListener('click', function () {
  if (R.on) { stopReplay('stopped. tap hear the path to start again.'); return; }
  if (S.path.length === 1) { var t = hear(S.path[0], 0); $('now').textContent = 'the point starts at ' + D.n[S.path[0]] + ' (' + fam(S.path[0]) + '), ' + (t ? 'hearing ' + t : 'no clip for this one') + '.'; return; }
  startReplay(0);
});
$('ja').addEventListener('click', function () { snd(); if (R.on) stopReplay(); jumpTo(S.ta, 1); });
$('jb').addEventListener('click', function () { snd(); if (R.on) stopReplay(); jumpTo(S.tb, 2); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { MAP.resize(); S.dirty = true; }, 80); });

Promise.all([WK.boot(), WK.pv()]).then(function (a) {
  var b = a[0]; PV = a[1];
  D = b.D; M = b.M; LOOP = b.LOOP;
  MAP = new WK.Map($('map'), cv, D, M, { dim: 0.55 }); MAP.resize();
  reset();
  $('meta').textContent = 'data: ' + D.n.length + ' artists on my sound map. the dot\'s target is the nearest artist in sound that the point has not just visited; the star\'s target is the most played artist within reach of the last one it reached.';
  requestAnimationFrame(frame);
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
