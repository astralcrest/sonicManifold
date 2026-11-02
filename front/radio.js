/* the front = THE RADIO (pick 2, 2026-11-02). one canvas: every artist with a sound vector as a crisp square, placed by the
   sound map (two UMAP axes over CLAP vectors of three 30 s previews), sized by plays, colored by family; per-play motes
   jittered round each artist; gold squares = my songs placed by the same ears. a tap plays that artist's 30 s Apple
   preview at once, inside the gesture; a drag draws a line and the radio walks its stops; when the stops run out it
   walks the nearest sounds. the text lives in its own solid room (#room). no veil, no toast, nothing asks first.
   data: front/data/radio.json (positions, families, hands, six nearest, mood tags) and front/data/pv.json (one preview
   per artist), both stamped by the build. the album is music.js's: it starts on the first press like everywhere else on
   the site and is held at 15 percent under a preview. */
(function () {
'use strict';
var doc = document, $ = function (s) { return doc.querySelector(s); };
var cv = $('#sky'), stage = $('#stage'); if (!cv || !stage || !cv.getContext) return;
var ctx = cv.getContext('2d');
var ST = (window.__front || {}).stamps || {};
var BG = '#06010f', INK = '#efe9ff', MINT = '#21f6bc', VIOLET = '#8b6fd6', GOLD = '#ffd36b', MUTE = '#9a90b8';
var FAMC = { 'ambient/lofi': '#5fb8ff', 'classical': '#e9dcae', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ff7a3d', 'hip-hop · r&b': '#ff2e55', 'jazz': '#ffd36b', 'pop': '#ff9ad5', 'rock/metal': '#c9c9d6', 'soundtrack': '#8fe0d4', 'world/desi': '#ffb347', 'other': '#8d8da6', 'untagged': '#5e5a74' };
var SANS = '"Instrument Sans",-apple-system,"Inter",system-ui,sans-serif', MONO = '"IBM Plex Mono",ui-monospace,Menlo,monospace';
var R = null, PV = null, pvP = null, pv = null, base = null;
var W = 0, H = 0, DPR = 1, phone = false, TOP = 50, BOT = 30, PADX = .05;
var X = [], Y = [], SZ = [], P = [], PMAX = 1, SX = [], SY = [], boxes = [], lbox = {};
var S = { now: -1, line: null, trail: [], played: {}, playing: false, pend: -1, hover: -1, drag: null, errs: 0, user: false, mine: -1 };
var duckT = 0;

function hex(h) { h = h.slice(1); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
var BGc = hex(BG);
function dim(h, k) { var c = hex(h); return 'rgb(' + c.map(function (v, i) { return Math.round(BGc[i] + (v - BGc[i]) * k); }).join(',') + ')'; }
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v); }
function fetchJ(n) { return fetch('front/data/' + n + '.json?v=' + (ST[n] || '0'), { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); }); }
function famc(i) { return FAMC[R.fam[R.f[i]]] || MUTE; }
function text(sel, t) { var e = $(sel); if (e && e.textContent !== t) e.textContent = t; }

/* ---------- layout + the still layer ---------- */
function fit() {
  var b = stage.getBoundingClientRect(); W = Math.max(1, Math.round(b.width)); H = Math.max(1, Math.round(b.height));
  DPR = Math.min(3, window.devicePixelRatio || 1); phone = W < 640; TOP = (phone ? 56 : 64) + 8;
  /* the css owns the canvas size (100% of the stage); a px width here would hold the old width through a resize */
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  var n = R.n.length, ih = H - TOP - BOT, iw = W * (1 - 2 * PADX);
  PMAX = 1; P = [];
  for (var i = 0; i < n; i++) { var h = R.h[i], p = h[0] + h[1] + h[2]; P.push(p); if (p > PMAX) PMAX = p; }
  var smin = 3, smax = phone ? 11 : 15;
  X = []; Y = []; SZ = [];
  for (i = 0; i < n; i++) { X.push(PADX * W + R.xy[i][0] / 1000 * iw); Y.push(TOP + R.xy[i][1] / 1000 * ih); SZ.push(Math.round(smin + (smax - smin) * Math.sqrt(P[i] / PMAX))); }
  SX = []; SY = [];
  for (i = 0; i < R.s.length; i++) { SX.push(PADX * W + R.s[i].x / 1000 * iw); SY.push(TOP + R.s[i].y / 1000 * ih); }
}
function hit(b) { for (var i = 0; i < boxes.length; i++) { var q = boxes[i]; if (!(b[2] < q[0] || b[0] > q[2] || b[3] < q[1] || b[1] > q[3])) return true; } return false; }
function still() {
  base = doc.createElement('canvas'); base.width = cv.width; base.height = cv.height;
  var g = base.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  var r = rng(20261102), per = phone ? 6 : 3, jit = phone ? 6 : 9, n = R.n.length, i, k, order = [];
  for (i = 0; i < n; i++) {
    var m = Math.max(1, Math.round(P[i] / per)); g.fillStyle = dim(famc(i), .55);
    for (k = 0; k < m; k++) g.fillRect(Math.round(X[i] + gauss(r) * jit) - 1, Math.round(Y[i] + gauss(r) * jit) - 1, 2, 2);
    order.push(i);
  }
  order.sort(function (a, b) { return P[a] - P[b]; });
  for (k = 0; k < n; k++) { i = order[k]; var s = SZ[i]; g.fillStyle = famc(i); g.fillRect(Math.round(X[i] - s / 2), Math.round(Y[i] - s / 2), s, s); }
  boxes = [[0, 0, W, TOP - 4]]; lbox = {};
  /* every gold square first, each one an obstacle, so no label is ever drawn through a square or a square through a label */
  for (k = 0; k < R.s.length; k++) { g.fillStyle = GOLD; g.fillRect(Math.round(SX[k] - 3.5), Math.round(SY[k] - 3.5), 7, 7); boxes.push([SX[k] - 5, SY[k] - 5, SX[k] + 5, SY[k] + 5]); }
  var fs = phone ? 11.5 : 12.5; g.font = '600 ' + fs + 'px ' + SANS; g.textBaseline = 'middle'; g.textAlign = 'left';
  var ss = R.s.slice().map(function (s, j) { return j; }).sort(function (a, b) { return SY[a] - SY[b]; });
  for (k = 0; k < ss.length; k++) {
    var j = ss[k], t = R.s[j].t.toLowerCase(), tw = g.measureText(t).width, x = SX[j], y = SY[j];
    var b = plate([[x + 8, y], [x - 8 - tw, y], [x + 8, y + fs * 1.2], [x + 8, y - fs * 1.2]], tw, fs * .7);
    if (!b) continue;
    boxes.push(b); g.fillStyle = BG; g.fillRect(Math.round(b[0] - 3), Math.round(b[1]), Math.round(tw + 6), Math.round(fs * 1.4)); g.fillStyle = GOLD; g.fillText(t, b[0], (b[1] + b[3]) / 2);
  }
  var top = order.slice().reverse().slice(0, phone ? 11 : 28);
  for (k = 0; k < top.length; k++) {
    i = top[k]; var f2 = Math.round((phone ? 11 : 11.5) + (phone ? 3 : 5) * Math.sqrt(P[i] / PMAX)); g.font = '600 ' + f2 + 'px ' + SANS;
    var nm = R.n[i], w2 = g.measureText(nm).width, hx = X[i] + SZ[i] / 2 + 5;
    var bb = plate([[hx, Y[i]], [X[i] - SZ[i] / 2 - 5 - w2, Y[i]]], w2, f2 * .72);
    if (!bb) continue;
    boxes.push(bb); lbox[i] = [bb[0] - 3, bb[1], bb[2] + 3, bb[1] + f2 * 1.44]; g.fillStyle = BG; g.fillRect(Math.round(bb[0] - 3), Math.round(bb[1]), Math.round(w2 + 6), Math.round(f2 * 1.44)); g.fillStyle = INK; g.fillText(nm, bb[0], Y[i]);
  }
}
/* the first spot in the list that is on the map and clear of every placed box, as [x0,y0,x1,y1]; null when none is */
function plate(spots, tw, hh) {
  for (var i = 0; i < spots.length; i++) {
    var b = [spots[i][0], spots[i][1] - hh, spots[i][0] + tw, spots[i][1] + hh];
    if (b[0] >= 4 && b[2] <= W - 4 && b[1] >= TOP - 4 && b[3] <= H - 2 && !hit(b)) return b;
  }
  return null;
}
/* a word on the map always sits on a solid patch of night: the text has its own room even out here. returns its box;
   a word that would land on an earlier one this frame moves to the other side, then below */
var words = [];
function word(g, x, y, t, fs, w, mono, fill, align) {
  g.font = w + ' ' + fs + 'px ' + (mono ? MONO : SANS); g.textBaseline = 'middle'; g.textAlign = 'left';
  var tw = g.measureText(t).width, h = fs * 1.5, tries = align === 'fixed' ? [[x, y]] : [[x, y], [x - tw - 16 - (SZ[S.now] || 0), y], [x, y + h + 2], [x, y - h - 2]], b = null, i, q, ok;
  for (i = 0; i < tries.length; i++) {
    b = [tries[i][0] - 3, tries[i][1] - h / 2, tries[i][0] + tw + 3, tries[i][1] + h / 2]; ok = b[0] >= 0 && b[2] <= W;
    for (q = 0; ok && q < words.length; q++) { var o = words[q]; if (!(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3])) ok = false; }
    if (ok) break;
  }
  words.push(b);
  g.fillStyle = BG; g.fillRect(Math.round(b[0]), Math.round(b[1]), Math.round(b[2] - b[0]), Math.round(b[3] - b[1]));
  g.fillStyle = fill; g.fillText(t, b[0] + 3, (b[1] + b[3]) / 2);
}
function sq(g, x, y, s, fill) { g.fillStyle = fill; g.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); }
function box(g, x, y, s, stroke, lw) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeRect(Math.round(x - s / 2) + .5, Math.round(y - s / 2) + .5, s, s); }
function paint() {
  if (!base) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(base, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  var g = ctx, i, k, L = S.line, fs = phone ? 12 : 13, late = []; words = [];
  if (S.now >= 0) { var nb = SZ[S.now] / 2 + 8; words.push([X[S.now] - nb, Y[S.now] - nb, X[S.now] + nb, Y[S.now] + nb]); }
  if (S.trail.length > 1) { g.strokeStyle = dim(MINT, .45); g.lineWidth = 1.5; g.beginPath(); for (i = 0; i < S.trail.length; i++) { var t = S.trail[i]; if (i) g.lineTo(X[t], Y[t]); else g.moveTo(X[t], Y[t]); } g.stroke(); }
  if (S.drag && S.drag.on) { g.strokeStyle = MINT; g.lineWidth = 2; g.beginPath(); g.moveTo(S.drag.x0, S.drag.y0); g.lineTo(S.drag.x1, S.drag.y1); g.stroke(); sq(g, S.drag.x0, S.drag.y0, 6, MINT); sq(g, S.drag.x1, S.drag.y1, 6, MINT); }
  if (L) {
    g.strokeStyle = MINT; g.lineWidth = 2; g.beginPath(); g.moveTo(L.x0, L.y0); g.lineTo(L.x1, L.y1); g.stroke(); sq(g, L.x0, L.y0, 6, MINT); sq(g, L.x1, L.y1, 6, MINT);
    for (k = 0; k < L.stops.length; k++) {
      i = L.stops[k]; var done = k < L.k, col = done ? dim(MINT, .55) : MINT;
      box(g, X[i], Y[i], SZ[i] + 8, col, 2);
      late.push([X[i] + SZ[i] / 2 + 8, Y[i] + fs * .1, (k + 1) + ' ' + R.n[i], done ? MUTE : INK, i]);
    }
  }
  if (S.now >= 0) {
    var n0 = S.now, nn = R.nn[n0];
    for (k = 0; k < nn.length; k++) { var j = nn[k]; g.strokeStyle = dim(VIOLET, .8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(X[n0], Y[n0]); g.lineTo(X[j], Y[j]); g.stroke(); sq(g, X[j], Y[j], 7, VIOLET); }
    box(g, X[n0], Y[n0], SZ[n0] + 12, MINT, 3);
    if (!L || L.stops.indexOf(n0) < 0) late.push([X[n0] + SZ[n0] / 2 + 10, Y[n0], R.n[n0], INK, n0]);
  }
  for (k = 0; k < late.length; k++) { var lb = lbox[late[k][4]]; if (lb) { g.fillStyle = BG; g.fillRect(Math.round(lb[0]), Math.round(lb[1]), Math.round(lb[2] - lb[0]), Math.round(lb[3] - lb[1])); } word(g, late[k][0], late[k][1], late[k][2], fs, 600, false, late[k][3]); }
  if (S.mine >= 0) { box(g, SX[S.mine], SY[S.mine], 15, GOLD, 2); }
  if (S.hover >= 0 && S.hover !== S.now) word(g, X[S.hover] + SZ[S.hover] / 2 + 8, Y[S.hover], R.n[S.hover], fs, 600, false, INK);
}

/* ---------- picking ---------- */
function pt(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
function nearest(x, y, r) {
  var best = -1, bd = 1e18;
  for (var i = 0; i < X.length; i++) { var dx = X[i] - x, dy = Y[i] - y, d = dx * dx + dy * dy, rr = r + SZ[i] / 2; if (d < bd && d <= rr * rr) { bd = d; best = i; } }
  return best;
}
function nearestSong(x, y, r) {
  var best = -1, bd = r * r;
  for (var j = 0; j < SX.length; j++) { var dx = SX[j] - x, dy = SY[j] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } }
  return best;
}
function makeLine(x0, y0, x1, y1) {
  var nst = phone ? 5 : 7, sep = phone ? 34 : 46, stops = [], k, i;
  for (k = 0; k < nst; k++) {
    var t = (k + .5) / nst, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, best = -1, bd = 1e18;
    for (i = 0; i < X.length; i++) {
      if (stops.indexOf(i) >= 0) continue;
      var far = true; for (var s = 0; s < stops.length; s++) { var q = stops[s], ex = X[q] - X[i], ey = Y[q] - Y[i]; if (ex * ex + ey * ey < sep * sep) { far = false; break; } }
      if (!far) continue;
      var dx = X[i] - px, dy = Y[i] - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) stops.push(best);
  }
  if (!stops.length) return;
  S.line = { x0: x0, y0: y0, x1: x1, y1: y1, stops: stops, k: 0 }; S.trail = []; S.played = {};
  play(stops[0], 'stop');
}

/* ---------- the room ---------- */
function room(i, why) {
  var L = S.line, nm = R.n[i], k;
  var lead = why === 'stop' && L ? 'now playing · stop ' + (L.k + 1) + ' of ' + L.stops.length : why === 'tap' ? 'now playing · you tapped it' : why === 'pick' ? 'now playing · from the six' : why === 'near' ? 'now playing · nearest in sound to the last one' : 'now playing · my most played, to start';
  text('#np-k', lead); text('#np-n', nm); text('#np-t', '');
  var a = $('#a-sp'); if (a) { a.hidden = false; a.href = 'https://open.spotify.com/search/' + encodeURIComponent(nm); }
  var md = $('#mood'); if (md) {
    while (md.children.length > 1) md.removeChild(md.lastChild);
    var m = R.md[i];
    for (k = 0; k < 4; k++) { var row = doc.createElement('div'); row.className = 'mb'; var sp = doc.createElement('span'); sp.textContent = R.prompts[m[k]]; var bar = doc.createElement('i'); bar.style.width = Math.max(6, m[4 + k]) + '%'; row.appendChild(sp); row.appendChild(bar); md.appendChild(row); }
    md.hidden = false;
  }
  var ol = $('#near'); if (ol) {
    ol.textContent = '';
    R.nn[i].forEach(function (j) { var li = doc.createElement('li'), b = doc.createElement('button'); b.type = 'button'; b.className = 'nr'; b.textContent = R.n[j]; b.addEventListener('click', function () { S.line = null; play(j, 'pick'); }); li.appendChild(b); ol.appendChild(li); });
  }
  var h = $('#hint'); if (h) h.textContent = '';
}
function roomMine(j) {
  var s = R.s[j];
  text('#np-k', 'now playing · one of mine, placed by its sound'); text('#np-n', s.t.toLowerCase()); text('#np-t', 'by me, on the album. the gold squares are the album, heard by the same model.');
  var a = $('#a-sp'); if (a) a.hidden = true;
  var md = $('#mood'); if (md) md.hidden = true;
  var ol = $('#near'); if (ol) ol.textContent = '';
  var h = $('#hint'); if (h) h.textContent = '';
}
/* one transport: while a preview plays the album chip steps aside (css on html.sm-pv) and the now line says the album is underneath */
function ppLabel() { var b = $('#b-pp'); if (b) { b.textContent = S.playing ? 'pause' : 'play'; b.classList.toggle('on', S.playing); } doc.documentElement.classList.toggle('sm-pv', !!S.playing); }
function key() {
  var k = $('#key'); if (!k) return; k.textContent = '';
  var cnt = {}; for (var i = 0; i < R.f.length; i++) cnt[R.f[i]] = (cnt[R.f[i]] || 0) + 1;
  var fams = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
  fams.forEach(function (f) { var s = doc.createElement('span'), c = doc.createElement('i'); c.style.background = FAMC[R.fam[f]] || MUTE; s.appendChild(c); s.appendChild(doc.createTextNode(R.fam[f])); k.appendChild(s); });
  var g = doc.createElement('span'), gi = doc.createElement('i'); gi.style.background = GOLD; g.appendChild(gi); g.appendChild(doc.createTextNode('my songs')); k.appendChild(g);
  var v = doc.createElement('span'), vi = doc.createElement('i'); vi.style.background = VIOLET; v.appendChild(vi); v.appendChild(doc.createTextNode('nearest in sound')); k.appendChild(v);
}

/* ---------- sound ---------- */
function album() { var M = window.__smMusic; return M && M.A ? M.A : null; }
function duck() { var A = album(); if (A && A.el) A.el.volume = .15; if (!duckT) duckT = setInterval(function () { var B = album(); if (B && B.el && B.el.volume > .2) B.el.volume = .15; }, 400); }
function unduck() { if (duckT) { clearInterval(duckT); duckT = 0; } var A = album(); if (A && A.el) A.el.volume = 1; }
function el() {
  if (pv) return pv;
  pv = new Audio(); pv.preload = 'auto';
  pv.addEventListener('playing', function () { S.playing = true; S.errs = 0; duck(); ppLabel(); });
  pv.addEventListener('pause', function () { S.playing = false; ppLabel(); if (!pv.ended) unduck(); });
  pv.addEventListener('ended', function () { S.playing = false; if (S.user) { unduck(); ppLabel(); return; } next(); });
  pv.addEventListener('error', function () { S.playing = false; if (++S.errs > 3 || S.pend >= 0) { unduck(); ppLabel(); return; } next(); });
  return pv;
}
function prefetchPV() {
  if (!pvP) pvP = fetchJ('pv').then(function (j) { PV = j.a; return PV; }, function (e) { pvP = null; throw e; });
  return pvP;
}
function sound(i) {
  var a = el(), nm = R.n[i];
  if (!PV) {
    S.pend = i;
    /* webkit: a load() inside the press marks this element as started by a person, so the play after the fetch is allowed */
    if (!a.getAttribute('src')) try { a.load(); } catch (x) { /* nothing yet */ }
    text('#np-t', 'finding its sound…');
    prefetchPV().then(function () { if (S.pend === i) { S.pend = -1; sound(i); } }, function () { S.pend = -1; text('#np-t', 'the previews did not load here.'); });
    return;
  }
  var p = PV[nm];
  if (!p) { text('#np-t', 'no preview for this one'); next(); return; }
  text('#np-t', p[0]);
  if (a.getAttribute('src') !== p[1]) a.src = p[1]; else try { a.currentTime = 0; } catch (x) { /* not seekable yet */ }
  duck();
  var q; try { q = a.play(); } catch (x) { q = null; }
  if (q && q.catch) q.catch(function () { S.playing = false; unduck(); ppLabel(); });
}
function play(i, why) {
  S.user = false; S.mine = -1;
  var M = window.__smMusic; if (M && M.hold) M.hold();
  S.now = i; S.played[i] = 1; S.trail.push(i); if (S.trail.length > 14) S.trail.shift();
  room(i, why); sound(i); paint();
}
function next() {
  if (S.now < 0 && !S.line) { start(); return; }
  var L = S.line;
  if (L && L.k + 1 < L.stops.length) { L.k++; play(L.stops[L.k], 'stop'); return; }
  if (L) { L.k = L.stops.length; }
  var nn = R.nn[S.now], c = -1, k;
  for (k = 0; k < nn.length; k++) if (!S.played[nn[k]] && PV && PV[R.n[nn[k]]]) { c = nn[k]; break; }
  if (c < 0) { S.played = {}; c = nn[0]; }
  play(c, 'near');
}
function start() { var best = 0; for (var i = 1; i < P.length; i++) if (P[i] > P[best]) best = i; S.line = null; play(best, 'start'); }
function mine(j) {
  var M = window.__smMusic; if (!M || !M.tracks) return;
  if (pv && !pv.paused) { S.user = true; pv.pause(); }
  S.now = -1; S.line = null; S.mine = j; roomMine(j); paint();
  var f = R.s[j].f;
  M.tracks().then(function (tr) { for (var k = 0; k < tr.length; k++) if (tr[k].f === f) { M.go(k); return; } }, function () { text('#np-t', 'the album did not load here.'); });
}

/* ---------- pointer ---------- */
cv.addEventListener('pointerdown', function (e) {
  if (e.button && e.button !== 0) return;
  try { cv.setPointerCapture(e.pointerId); } catch (x) { /* capture is a convenience */ }
  var p = pt(e); S.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, on: false, id: e.pointerId };
  if (R) prefetchPV().catch(function () { /* the tap will say so */ });
});
cv.addEventListener('pointermove', function (e) {
  if (!R) return;
  var p = pt(e);
  if (S.drag && S.drag.id === e.pointerId) {
    S.drag.x1 = p.x; S.drag.y1 = p.y;
    if (!S.drag.on && Math.hypot(p.x - S.drag.x0, p.y - S.drag.y0) > 10) S.drag.on = true;
    if (S.drag.on) paint();
    return;
  }
  if (e.pointerType === 'mouse') { var k = nearest(p.x, p.y, 14); if (k !== S.hover) { S.hover = k; cv.style.cursor = k >= 0 || nearestSong(p.x, p.y, 12) >= 0 ? 'pointer' : 'crosshair'; paint(); } }
});
cv.addEventListener('pointerup', function (e) {
  var d = S.drag; if (!d || d.id !== e.pointerId || !R) return;
  S.drag = null; var p = pt(e);
  if (d.on) { makeLine(d.x0, d.y0, p.x, p.y); paint(); return; }
  var s = nearestSong(p.x, p.y, phone ? 24 : 14); if (s >= 0) { mine(s); return; }
  var k = nearest(p.x, p.y, phone ? 26 : 16);
  if (k >= 0) { S.line = null; play(k, 'tap'); } else paint();
});
cv.addEventListener('pointercancel', function () { S.drag = null; paint(); });
cv.addEventListener('pointerleave', function () { if (S.hover >= 0) { S.hover = -1; paint(); } });

/* ---------- controls ---------- */
var bpp = $('#b-pp'); if (bpp) bpp.addEventListener('click', function () {
  if (S.playing && pv) { S.user = true; pv.pause(); return; }
  if (S.now >= 0 && pv && pv.getAttribute('src')) { S.user = false; duck(); var q; try { q = pv.play(); } catch (x) { q = null; } if (q && q.catch) q.catch(function () { unduck(); }); return; }
  if (R) start();
});
var bnx = $('#b-next'); if (bnx) bnx.addEventListener('click', function () { if (R) next(); });
var bdp = $('#b-deep'); if (bdp) bdp.addEventListener('click', function () {
  var on = bdp.getAttribute('aria-pressed') !== 'true', d = $('#deep');
  bdp.setAttribute('aria-pressed', on ? 'true' : 'false'); doc.documentElement.classList.toggle('deep', on);
  if (d) { d.hidden = !on; if (on) d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
});
var brm = $('#b-rooms'); if (brm) brm.addEventListener('click', function () {
  var r = $('#rooms'); if (!r) return; r.scrollIntoView({ block: 'start', behavior: 'smooth' }); var a = r.querySelector('a'); if (a) a.focus({ preventScroll: true });
});
doc.addEventListener('keydown', function (e) {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.key === 'n' || e.key === 'N') { if (R) next(); }
});

/* ---------- boot ---------- */
var rt = 0;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (!R) return; fit(); still(); paint(); }, 120); });
fetchJ('radio').then(function (j) {
  R = j; fit(); still(); paint(); key();
  var h = $('#hint'); if (h) h.textContent = phone ? 'squares are artists, near is alike. tap one, or drag a line.' : 'squares are artists, near is alike. tap one for 30 s, drag a line for a radio. n: next.';
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { still(); paint(); });
  setTimeout(function () { prefetchPV().catch(function () { /* fetched again on the first press */ }); }, 2500);
  window.__radio = { S: S, n: function () { return R.n.length; }, X: X, Y: Y, SX: SX, SY: SY, pv: function () { return pv; }, play: function (i) { play(i, 'tap'); }, line: makeLine };
}, function () {
  text('#np-k', 'the map did not load here. the other rooms below still open.');
});
})();
