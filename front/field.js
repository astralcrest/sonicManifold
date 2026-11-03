/* the front = THE FIELD (2026-11-03). one crisp canvas behind seven acts: every artist i have heard, placed in the 3D sound map
   (CLAP UMAP), drawn flat and sharp at device pixels; no glow, no blur. the acts follow the narrative: the count, the hand,
   the two maps (the same artists by sound and by what followed what), what stays, the coda, the record. eight things to play: fly between the maps, drag a line (a radio of stops), whose hand? (guess me or the
   queue), be the queue / be my hand (hear the run and hear it break), the ring you can play (who led to whom), the
   47-second game (keep or let go), where my songs land (each placed by sound beside its nearest artist), bring your export.
   data: front/data/field.json (+ pv.json previews, taste.json the game rows). one sound at a time: the album holds while a
   preview plays and comes back when it stops (music.js hold/release + __radioYield). */
(function () {
'use strict';
var doc = document, html = doc.documentElement, $ = function (s) { return doc.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(doc.querySelectorAll(s)); };
var ST = (window.__front && window.__front.stamps) || {};
var BG = '#06010f', INK = '#efe9ff', MUTE = '#9a90b8', MINT = '#21f6bc', AMBER = '#f5a623', VIOLET = '#8b6fd6', ROSE = '#ff5c7a', ICE = '#bcd3ff', GOLD = '#ffd36b', LINE = '#2a2140';
var FAMC = { 'ambient/lofi': '#5fb8ff', 'classical': '#e9dcae', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ffb3c6', 'hip-hop · r&b': '#ff5c7a', 'jazz': '#ffd36b', 'other': '#9a90b8', 'pop': '#ff8fd6', 'rock/metal': '#c9c2ff', 'soundtrack': '#8fd3b6', 'world/desi': '#f5a623', 'untagged': '#6f6790' };
var SANS = '"Instrument Sans",-apple-system,"Inter",system-ui,sans-serif', MONO = '"IBM Plex Mono",ui-monospace,Menlo,monospace';
var cv = $('#field'), ctx = cv && cv.getContext('2d'), stage = $('#stage');
if (!cv || !ctx) return;
var DPR = 1, W = 1, H = 1, phone = false, reduce = false;
try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* no hint */ }
var F = null, PV = null, pvP = null, pv = null, TASTE = null, MAPS = null, mapsP = null;
var N = 0, P3 = null, PL = [], PMAX = 1, SZ = [], FC = [], HC = [], NN = [], KNN = [], TOP = [], names = [];
var SX = [], SY = [], SA = [], SR = [];       /* screen x, y, alpha, radius this frame */
var RING = [], RA = {}, RI = {}, MINE = [], Q = [], SONG = [], SNB = [];
var scene = 0, blend = 0, from = 0, tStart = 0, yaw = 0.62, pitch = 0.36, last = 0, raf = 0, dirty = true;
var S = { now: -1, line: null, drag: null, played: {}, playing: false, pend: -1, errs: 0, user: false, hover: -1, mine: -1, mode: '', trail: [], rim: -1, game: null, wh: null, pips: null, mt: 0, mb: 0, mFrom: 0, mT0: 0 };
var ease = function (t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); };

function hex(h) { h = h.slice(1); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
var BGc = hex(BG);
function dim(h, k) { var c = hex(h); return 'rgb(' + c.map(function (v, i) { return Math.round(BGc[i] + (v - BGc[i]) * k); }).join(',') + ')'; }
function fetchJ(n) { return fetch('front/data/' + n + '.json?v=' + (ST[n] || '0'), { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); }); }
function text(sel, t) { var e = $(sel); if (e && e.textContent !== t) e.textContent = t; }
function show(sel, on) { var e = $(sel); if (e) e.hidden = !on; }
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var rnd = rng((Date.now() / 1000) | 0);

/* ---------- data ---------- */
function prep(j) {
  F = j; N = F.n.length; names = F.n; P3 = new Float32Array(N * 3);
  var i, k;
  for (i = 0; i < N; i++) { P3[i * 3] = F.p[i][0] / 1000; P3[i * 3 + 1] = F.p[i][1] / 1000; P3[i * 3 + 2] = F.p[i][2] / 1000; }
  PMAX = 1; PL = [];
  for (i = 0; i < N; i++) { var h = F.h[i], p = h[0] + h[1] + h[2]; PL.push(p); if (p > PMAX) PMAX = p; }
  for (i = 0; i < N; i++) {
    var h2 = F.h[i], m = Math.max(h2[0], h2[1], h2[2]);
    HC.push(m === h2[2] ? VIOLET : m === h2[1] ? AMBER : MINT);
    FC.push(FAMC[F.fam[F.f[i]]] || MUTE);
  }
  NN = F.nn;
  TOP = []; for (i = 0; i < N; i++) TOP.push(i); TOP.sort(function (a, b) { return PL[b] - PL[a]; });
  /* three nearest in the 3D map for the threads (desk only) */
  if (!phone) {
    for (i = 0; i < N; i++) {
      var best = [[-1, 9], [-1, 9], [-1, 9]], x = P3[i * 3], y = P3[i * 3 + 1], z = P3[i * 3 + 2];
      for (k = 0; k < N; k++) {
        if (k === i) continue;
        var dx = P3[k * 3] - x, dy = P3[k * 3 + 1] - y, dz = P3[k * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz;
        if (d < best[2][1]) { best[2] = [k, d]; best.sort(function (a, b) { return a[1] - b[1]; }); }
      }
      for (k = 0; k < 3; k++) if (best[k][0] > i) KNN.push(i, best[k][0]);
    }
  }
  RING = F.ring; RA = {}; RI = {};
  for (k = 0; k < RING.length; k++) { RA[k] = RING[k][2]; if (RING[k][0] >= 0) RI[RING[k][0]] = k; }
  MINE = F.mine; Q = F.q;
  SONG = F.s; SNB = [];
  for (k = 0; k < SONG.length; k++) {
    var sp = SONG[k].p, bi = -1, bd = 9;
    for (i = 0; i < N; i++) { var ex = P3[i * 3] - sp[0] / 1000, ey = P3[i * 3 + 1] - sp[1] / 1000, ez = P3[i * 3 + 2] - sp[2] / 1000, dd = ex * ex + ey * ey + ez * ez; if (dd < bd) { bd = dd; bi = i; } }
    SNB.push(bi);
  }
  SX = new Float32Array(N); SY = new Float32Array(N); SA = new Float32Array(N); SR = new Float32Array(N);
}

/* ---------- layout ---------- */
function fit() {
  var b = stage.getBoundingClientRect(); W = Math.max(1, Math.round(b.width)); H = Math.max(1, Math.round(b.height));
  phone = W < 700 || innerWidth < 900; DPR = Math.min(3, Math.max(1, Math.round((window.devicePixelRatio || 1) * 2) / 2));
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  var i, smin = phone ? 1.3 : 1.6, smax = phone ? 4 : 5.5; SZ = [];
  for (i = 0; i < N; i++) SZ.push(smin + (smax - smin) * Math.sqrt(PL[i] / PMAX));
  pathsDirty = true; dirty = true;
}
var cam = { cx: 0, cy: 0, r: 1 };
var dolly = 1; /* a slow push-in on every act change in the field; the ring and the flat maps keep their own frame */
function proj3(x, y, z, out) {
  var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  var x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + 3.2, s = 2.6 / z2 * dolly;
  out[0] = cam.cx + x1 * s * cam.r; out[1] = cam.cy - y1 * s * cam.r; out[2] = z2;
}
var tmp = [0, 0, 0];
function ringXY(k, rr, out) { var a = RA[k]; out[0] = cam.cx + rr * Math.cos(a); out[1] = cam.cy + rr * Math.sin(a); }
/* the per-scene camera: the field sits left of the column on a desk and above the panel on a phone */
function frame() {
  if (scene === 1) { cam.r = Math.min(W, H) * (phone ? 0.33 : 0.40); cam.cx = W * (phone ? 0.5 : 0.5); cam.cy = H * (phone ? 0.5 : 0.5); }
  else if (scene === C_MAPS) { cam.r = Math.min(W, H) * (phone ? 0.43 : 0.46); cam.cx = W * 0.5; cam.cy = H * 0.5; }
  else { cam.r = phone ? Math.min(W * 0.62, H * 0.9) * 0.78 : Math.min(W * 0.74, H * 0.96) * 0.84; cam.cx = W * 0.5; cam.cy = H * 0.5; }
}

/* ---------- scenes ---------- */
var SCENES = ['count', 'hand', 'maps', 'hoods', 'keep', 'coda', 'record'];
var C_COUNT = 0, C_HAND = 1, C_MAPS = 2, C_HOODS = 3, C_KEEP = 4, C_CODA = 5, C_RECORD = 6;
/* the neighborhoods: eight crisp hues for the eight largest, the rest muted; the color is the neighborhood, never the hand */
var HOODC = ['#5fb8ff', '#ff5c7a', '#ffd36b', '#b8ec4a', '#ff8fd6', '#f5a623', '#c9c2ff', '#8fd3b6'];
var ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
function setScene(k) {
  if (k === scene) return;
  from = scene; scene = k; blend = 0; tStart = 0; dirty = true;
  S.hover = -1; S.rim = -1;
  html.setAttribute('data-scene', SCENES[k]);
  if (k !== C_KEEP && S.game) endGame(true);
  if (k === C_MAPS || k === C_HOODS) loadMaps();
  tick();
}
/* positions for the artists in a scene: 3D field (count, keep, coda, record), the ring (hand) or the flat two maps (maps); alpha per scene */
function mapXY(i, out) {
  var a = F.xy[i], b = MAPS ? MAPS.g[i] : a, m = S.mb;
  out[0] = cam.cx + ((a[0] + (b[0] - a[0]) * m) / 1000 - 0.5) * 2 * cam.r; out[1] = cam.cy + ((a[1] + (b[1] - a[1]) * m) / 1000 - 0.5) * 2 * cam.r;
}
function hoodXY(i, out) {
  var b = MAPS ? MAPS.g[i] : F.xy[i];
  var rr = phone ? cam.r * 0.72 : cam.r, cyy = phone ? cam.cy - cam.r * 0.3 : cam.cy;
  out[0] = cam.cx + (b[0] / 1000 - 0.5) * 2 * rr; out[1] = cyy + (b[1] / 1000 - 0.5) * 2 * rr;
}
function place(k, i, out) {
  if (k === C_MAPS) { mapXY(i, out); out[2] = 0.9; out[3] = 0.9; return; }
  if (k === C_HOODS) { hoodXY(i, out); out[2] = MAPS && MAPS.c[i] < 0 ? 0.3 : 0.92; out[3] = 0.95; return; }
  if (k === 1) {
    var r = RI[i];
    if (r === undefined) { proj3(P3[i * 3] * 0.2, P3[i * 3 + 1] * 0.2, P3[i * 3 + 2] * 0.2, tmp); out[0] = tmp[0]; out[1] = tmp[1]; out[2] = 0; return; }
    ringXY(r, cam.r, tmp); out[0] = tmp[0]; out[1] = tmp[1]; out[2] = 1; return;
  }
  proj3(P3[i * 3], P3[i * 3 + 1], P3[i * 3 + 2], tmp); out[0] = tmp[0]; out[1] = tmp[1];
  var depth = 1 - Math.min(1, Math.max(0, (tmp[2] - 1.9) / 2.6));
  out[2] = (k === C_KEEP || k === C_CODA) ? 0.22 : k === C_RECORD ? 0.35 : 0.55 + 0.45 * depth;
  out[3] = 0.75 + 0.5 * depth;
}
var pa = [0, 0, 0, 1], pb = [0, 0, 0, 1];
var reveal = 0, revT0 = 0; /* the overture: the field assembles in the order i first heard its artists, eight cuts by day count */
function layout(now) {
  if (!tStart) tStart = now;
  blend = reduce ? 1 : ease((now - tStart) / 900);
  if (reveal < 8) { if (!revT0) revT0 = now; reveal = reduce ? 8 : 8 * ease((now - revT0) / 7000); if (reveal >= 7.999) reveal = 8; }
  dolly = (scene === C_HAND || scene === C_MAPS || scene === C_HOODS) ? 1 : 0.93 + 0.07 * blend;
  if (S.mb !== S.mt) { var mk = reduce ? 1 : ease((now - S.mT0) / 1100); S.mb = S.mFrom + (S.mt - S.mFrom) * mk; if (mk >= 1) S.mb = S.mt; }
  frame();
  var i, k = blend;
  for (i = 0; i < N; i++) {
    place(scene, i, pa);
    if (k < 1) { place(from, i, pb); SX[i] = pb[0] + (pa[0] - pb[0]) * k; SY[i] = pb[1] + (pa[1] - pb[1]) * k; SA[i] = pb[2] + (pa[2] - pb[2]) * k; SR[i] = SZ[i] * ((pb[3] || 1) + ((pa[3] || 1) - (pb[3] || 1)) * k); }
    else { SX[i] = pa[0]; SY[i] = pa[1]; SA[i] = pa[2]; SR[i] = SZ[i] * (pa[3] || 1); }
    if (reveal < 8 && scene === C_COUNT && F.y0[i] >= reveal) SA[i] = 0;
  }
}

/* ---------- drawing ---------- */
var pathsDirty = true, minePaths = null, qPaths = null;
function buildRing() {
  frame(); var k, j, p;
  minePaths = []; qPaths = [];
  for (k = 0; k < MINE.length; k++) {
    var m = MINE[k], pth = new Path2D(), l = m.l;
    for (j = 0; j < l.length; j++) { var x = cam.cx + l[j][0] / 1000 * cam.r, y = cam.cy + l[j][1] / 1000 * cam.r; if (j) pth.lineTo(x, y); else pth.moveTo(x, y); }
    minePaths.push(pth);
  }
  var o0 = [0, 0], o1 = [0, 0];
  for (k = 0; k < Q.length; k++) {
    var q = Q[k], a0 = RA[q[0]], a1 = RA[q[1]], d = ((a1 - a0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI, span = Math.abs(d), mid = a0 + d / 2;
    var rr = cam.r * (1.05 + 0.42 * Math.pow(span / Math.PI, 0.8)), cx2 = cam.cx + rr * Math.cos(mid), cy2 = cam.cy + rr * Math.sin(mid);
    ringXY(q[0], cam.r, o0); ringXY(q[1], cam.r, o1);
    p = new Path2D(); p.moveTo(o0[0], o0[1]);
    /* two quadratic halves through the outer control point: a swing around the rim */
    var m0x = cam.cx + cam.r * 1.02 * Math.cos(a0), m0y = cam.cy + cam.r * 1.02 * Math.sin(a0), m1x = cam.cx + cam.r * 1.02 * Math.cos(a1), m1y = cam.cy + cam.r * 1.02 * Math.sin(a1);
    p.quadraticCurveTo(m0x + (cx2 - m0x) * 0.4, m0y + (cy2 - m0y) * 0.4, cx2, cy2);
    p.quadraticCurveTo(m1x + (cx2 - m1x) * 0.4, m1y + (cy2 - m1y) * 0.4, o1[0], o1[1]);
    qPaths.push(p);
  }
  pathsDirty = false;
}
function dot(g, x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }
function ring(g, x, y, r, stroke, lw) { g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke(); }
var words = [];
function word(g, x, y, t, fs, w, mono, fill, fixed) {
  g.font = w + ' ' + fs + 'px ' + (mono ? MONO : SANS); g.textBaseline = 'middle'; g.textAlign = 'left';
  var tw = g.measureText(t).width, h = fs * 1.5, tries = fixed ? [[x, y]] : [[x, y], [x - tw - 20, y], [x, y + h], [x, y - h]], b = null, i, q, ok;
  for (i = 0; i < tries.length; i++) {
    b = [tries[i][0] - 3, tries[i][1] - h / 2, tries[i][0] + tw + 3, tries[i][1] + h / 2]; ok = b[0] >= 0 && b[2] <= W && b[1] >= 0 && b[3] <= H;
    for (q = 0; ok && q < words.length; q++) { var o = words[q]; if (!(b[2] + 5 < o[0] || b[0] > o[2] + 5 || b[3] + 2 < o[1] || b[1] > o[3] + 2)) ok = false; }
    if (ok) break;
  }
  if (!ok && !fixed) return;
  words.push(b);
  g.fillStyle = BG; g.fillRect(Math.round(b[0]), Math.round(b[1]), Math.round(b[2] - b[0]), Math.round(b[3] - b[1]));
  g.fillStyle = fill; g.fillText(t, b[0] + 3, (b[1] + b[3]) / 2);
}
function paint(now) {
  var g = ctx, i, k;
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, W, H);
  layout(now); words = [];
  var inRing = scene === 1 && blend >= 1, field = scene !== 1, grown = reveal >= 8;
  /* threads in the field (desk): the skeleton of the map, three nearest each */
  if (field && !phone && (scene === C_COUNT || scene === C_RECORD) && blend >= 1 && grown) {
    g.lineWidth = 0.6; g.strokeStyle = 'rgba(189,211,255,' + (scene === C_RECORD ? 0.05 : 0.09) + ')'; g.beginPath();
    for (k = 0; k < KNN.length; k += 2) { i = KNN[k]; var j = KNN[k + 1]; g.moveTo(SX[i], SY[i]); g.lineTo(SX[j], SY[j]); }
    g.stroke();
  }
  /* the ring's lines: the queue outside in violet, my press inside in mint */
  if (scene === 1 || (from === 1 && blend < 1)) {
    if (pathsDirty) buildRing();
    var la = scene === 1 ? blend : 1 - blend, hi = S.rim;
    for (k = 0; k < qPaths.length; k++) {
      var q = Q[k], on = hi >= 0 && (q[0] === hi || q[1] === hi);
      g.strokeStyle = 'rgba(139,111,214,' + ((hi < 0 ? 0.16 + 0.3 * q[2] / 1000 : on ? 0.95 : 0.05) * la).toFixed(3) + ')'; g.lineWidth = (on ? 1.6 : 0.5) + 1.4 * q[2] / 1000; g.stroke(qPaths[k]);
    }
    for (k = 0; k < minePaths.length; k++) {
      var m = MINE[k], on2 = hi >= 0 && (m.a === hi || m.b === hi);
      g.strokeStyle = 'rgba(33,246,188,' + ((hi < 0 ? 0.45 + 0.45 * m.w / 1000 : on2 ? 1 : 0.07) * la).toFixed(3) + ')'; g.lineWidth = (on2 ? 1.8 : 0.6) + 1.6 * m.w / 1000; g.stroke(minePaths[k]);
    }
  }
  /* the two maps' lines: the queue's runs in violet under, my press-to-press in mint over */
  if (MAPS && (scene === C_MAPS || (from === C_MAPS && blend < 1))) {
    var ma = scene === C_MAPS ? blend : 1 - blend, hot = S.now >= 0 ? S.now : S.hover, LQ = MAPS.lq, LP = MAPS.lp, e;
    for (k = 0; k < LQ.length; k++) { e = LQ[k]; var onq = hot >= 0 && (e[0] === hot || e[1] === hot); g.strokeStyle = 'rgba(139,111,214,' + ((hot < 0 ? 0.22 + 0.4 * e[2] / 1000 : onq ? 0.95 : 0.04) * ma).toFixed(3) + ')'; g.lineWidth = (onq ? 1.5 : 0.6) + 1.0 * e[2] / 1000; g.beginPath(); g.moveTo(SX[e[0]], SY[e[0]]); g.lineTo(SX[e[1]], SY[e[1]]); g.stroke(); }
    for (k = 0; k < LP.length; k++) { e = LP[k]; var onp = hot >= 0 && (e[0] === hot || e[1] === hot); g.strokeStyle = 'rgba(33,246,188,' + ((hot < 0 ? 0.22 + 0.5 * e[2] / 1000 : onp ? 1 : 0.05) * ma).toFixed(3) + ')'; g.lineWidth = (onp ? 1.8 : 0.55) + 1.1 * e[2] / 1000; g.beginPath(); g.moveTo(SX[e[0]], SY[e[0]]); g.lineTo(SX[e[1]], SY[e[1]]); g.stroke(); }
  }
  /* the artists */
  var tint = scene === 0 || (from === 0 && blend < 1 && scene !== 1), hoods = scene === C_HOODS && MAPS && S.hoodBy !== 'hand';
  for (k = 0; k < N; k++) {
    i = TOP[N - 1 - k]; var a = SA[i]; if (a <= 0.01) continue;
    var col = hoods ? (MAPS.c[i] >= 0 && MAPS.c[i] < 8 ? HOODC[MAPS.c[i]] : MUTE) : scene === C_HOODS ? HC[i] : scene === 1 && blend >= 1 ? (FAMC[F.fam[RING[RI[i]] ? RING[RI[i]][3] : F.f[i]]] || MUTE) : tint ? HC[i] : FC[i];
    if (scene === C_RECORD && !isNb(i)) a *= 0.5;
    dot(g, SX[i], SY[i], SR[i], a >= 0.99 ? col : dim(col, a));
  }
  /* the songs: gold in the field */
  if (field && (scene === C_COUNT || scene === C_RECORD)) {
    var sp = [0, 0, 0];
    for (k = 0; k < SONG.length; k++) {
      var s = SONG[k].p; proj3(s[0] / 1000, s[1] / 1000, s[2] / 1000, sp);
      if (scene === C_RECORD) { var nb = SNB[k]; g.strokeStyle = S.mine === k ? GOLD : 'rgba(255,211,107,.35)'; g.lineWidth = S.mine === k ? 1.5 : 0.8; g.beginPath(); g.moveTo(sp[0], sp[1]); g.lineTo(SX[nb], SY[nb]); g.stroke(); }
      dot(g, sp[0], sp[1], scene === C_RECORD ? 4 : 3, GOLD);
      if (S.mine === k) ring(g, sp[0], sp[1], 9, GOLD, 1.5);
      if (scene === C_RECORD && (S.mine === k || k < (phone ? 4 : 8))) word(g, sp[0] + 9, sp[1], SONG[k].t.toLowerCase(), phone ? 10.5 : 11.5, 500, true, GOLD);
    }
  }
  /* the line and its stops */
  var L = S.line;
  if (S.drag && S.drag.on) { g.strokeStyle = MINT; g.lineWidth = 1.5; g.beginPath(); g.moveTo(S.drag.x0, S.drag.y0); g.lineTo(S.drag.x1, S.drag.y1); g.stroke(); }
  if (L && scene === L.scene) {
    g.strokeStyle = MINT; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L.x0, L.y0); g.lineTo(L.x1, L.y1); g.stroke();
    for (k = 0; k < L.stops.length; k++) { i = L.stops[k]; var col2 = k < L.k ? dim(MINT, .55) : k === L.k ? MINT : ICE; ring(g, SX[i], SY[i], 7, col2, 1.5); word(g, SX[i] + 11, SY[i], (k + 1) + ' ' + names[i], phone ? 10.5 : 11.5, 500, false, col2); }
  }
  /* now playing: a ring, its name, the six nearest */
  if (S.now >= 0 && SA[S.now] > 0.3) {
    var n0 = S.now;
    if (scene !== 1) { var nn = NN[n0]; for (k = 0; k < nn.length; k++) { var j2 = nn[k]; g.strokeStyle = 'rgba(139,111,214,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(SX[n0], SY[n0]); g.lineTo(SX[j2], SY[j2]); g.stroke(); } }
    ring(g, SX[n0], SY[n0], 8, MINT, 2); word(g, SX[n0] + 12, SY[n0], names[n0], phone ? 11.5 : 13, 600, false, INK, true);
    if (S.trail.length > 1 && scene !== 1) { g.strokeStyle = 'rgba(33,246,188,.5)'; g.lineWidth = 1; g.beginPath(); for (k = 0; k < S.trail.length; k++) { i = S.trail[k]; if (k) g.lineTo(SX[i], SY[i]); else g.moveTo(SX[i], SY[i]); } g.stroke(); }
  }
  if (S.hover >= 0 && S.hover !== S.now && SA[S.hover] > 0.3) { ring(g, SX[S.hover], SY[S.hover], 7, ICE, 1); word(g, SX[S.hover] + 11, SY[S.hover], names[S.hover], phone ? 10.5 : 11.5, 500, false, ICE); }
  /* the overture's count, then the big names, sized by rank */
  if (scene === 0 && blend >= 1 && !grown) {
    var heard = 0; for (k = 0; k < N; k++) if (F.y0[k] < reveal) heard++;
    g.font = '600 ' + (phone ? 30 : 46) + 'px ' + SANS; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = INK;
    g.fillText(String(heard).replace(/\B(?=(\d{3})+(?!\d))/g, ','), phone ? 14 : 22, phone ? 90 : 82);
    g.font = '500 ' + (phone ? 10 : 11.5) + 'px ' + MONO; g.fillStyle = MUTE;
    g.fillText('artists, in the order i first heard them', phone ? 14 : 22, phone ? 108 : 104);
  }
  if (scene === 0 && blend >= 1 && grown) for (k = 0; k < (phone ? 4 : 10); k++) { i = TOP[k]; if (i !== S.now && i !== S.hover) word(g, SX[i] + SR[i] + 5, SY[i], names[i], phone ? 12 - k * 0.3 : 17 - k * 0.65, k < 3 ? 600 : 500, false, INK); }
  /* the neighborhoods: a numeral and the family that fills each, at its center; the color is the neighborhood */
  if (scene === C_HOODS && blend >= 1 && MAPS && !S.quiet) {
    var cx = [], cy2 = [], cn = [], ci, nh = Math.min(8, MAPS.cm.length);
    for (ci = 0; ci < nh; ci++) { cx.push(0); cy2.push(0); cn.push(0); }
    for (k = 0; k < N; k++) { ci = MAPS.c[k]; if (ci >= 0 && ci < nh) { cx[ci] += SX[k]; cy2[ci] += SY[k]; cn[ci]++; } }
    var byHand = S.hoodBy === 'hand';
    for (ci = 0; ci < nh; ci++) if (cn[ci]) {
      var lab = phone ? ROMAN[ci] : ROMAN[ci] + ' · ' + (byHand ? 'the queue ' + Math.round(MAPS.cm[ci][2] / 10) + ' of 100' : 'mostly ' + F.fam[MAPS.cm[ci][1]]);
      word(g, cx[ci] / cn[ci] - (phone ? 8 : 30), cy2[ci] / cn[ci], lab, phone ? 12 : 12, 600, true, byHand ? VIOLET : HOODC[ci]);
    }
    /* the caption and, on the phone, the key: top left, the text's own room */
    var lx = phone ? 14 : 22, lh = phone ? 13 : 15, ly = phone ? H - 10 - lh * (nh + 1.4) : 66;
    g.font = '500 ' + (phone ? 10.5 : 11.5) + 'px ' + MONO; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = INK; g.fillText(byHand ? 'the same ' + MAPS.cm.length + ' neighborhoods, colored by the hand' : MAPS.cm.length + ' neighborhoods, from what followed what alone', lx, ly);
    g.fillStyle = MUTE; g.fillText(byHand ? (phone ? 'mint me · amber shuffle · violet the queue' : 'mint: my press · amber: shuffle · violet: the queue') : (phone ? 'named by the family that fills it most' : 'the label is the family that fills it most; the numeral is its size rank'), lx, ly + lh);
    if (phone) for (ci = 0; ci < nh; ci++) {
      g.fillStyle = byHand ? VIOLET : HOODC[ci];
      g.fillText(ROMAN[ci] + ' · ' + (byHand ? 'the queue ' + Math.round(MAPS.cm[ci][2] / 10) + ' of 100' : F.fam[MAPS.cm[ci][1]]), lx, ly + lh * (ci + 2.4));
    }
  }
  if (inRing) {
    var big = 0, bigs = [], seen = [];
    for (k = 0; k < RING.length && big < (phone ? 8 : 14); k++) { var r0 = RING[rimOrder[k]]; var ok2 = true; for (i = 0; i < seen.length; i++) { var dA = Math.abs(RA[rimOrder[k]] - seen[i]); dA = Math.min(dA, 6.2832 - dA); if (dA < (phone ? 0.24 : 0.14)) ok2 = false; } if (!ok2) continue; seen.push(RA[rimOrder[k]]); bigs.push(rimOrder[k]); big++; }
    for (k = 0; k < bigs.length; k++) rimName(g, bigs[k], bigs[k] === S.rim ? MINT : INK, phone ? 11 : 12.5, 600);
    if (S.rim >= 0 && bigs.indexOf(S.rim) < 0) rimName(g, S.rim, MINT, phone ? 11 : 12.5, 600);
    g.font = '500 ' + (phone ? 10 : 11) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = MINT; g.fillText('inside: my press', cam.cx, cam.cy - 9); g.fillStyle = VIOLET; g.fillText('outside: the queue', cam.cx, cam.cy + 9);
  }
  if (scene === C_MAPS && blend >= 1 && !S.quiet) {
    g.font = '500 ' + (phone ? 10 : 11) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'bottom';
    var ly = Math.min(H - 8, cam.cy + cam.r + (phone ? 14 : 18)), t1 = S.mb < 0.5 ? 'by sound' : 'by what followed', t2 = phone ? 'mint: my press, then my press · violet: the queue\u2019s run' : 'mint: two presses of mine in a row · violet: two of the queue\u2019s in a row';
    if (!MAPS) t1 = 'the second map is loading…';
    g.fillStyle = INK; g.fillText(t1, cam.cx, ly - (phone ? 14 : 16)); g.fillStyle = MUTE; g.fillText(t2, cam.cx, ly);
  }
  /* the pips: the keep grid and the hold-out rows */
  if ((scene === C_KEEP || scene === C_CODA) && blend >= 1) pips(g);
  if (S.game && S.game.on) countdown(g, now);
}
var rimOrder = [];
function rimName(g, k, col, fs, w) {
  var a = RA[k], o = [0, 0]; ringXY(k, cam.r + 9, o);
  var rot = a, right = Math.cos(a) >= 0;
  g.save(); g.translate(o[0], o[1]); g.rotate(right ? rot : rot + Math.PI); g.font = w + ' ' + fs + 'px ' + SANS; g.textBaseline = 'middle'; g.textAlign = right ? 'left' : 'right';
  var t = RING[k][1].toLowerCase(); if (phone && t.length > 14) t = t.slice(0, 13) + '\u2026'; var tw = g.measureText(t).width;
  g.fillStyle = BG; g.fillRect(right ? -2 : -tw - 2, -fs * 0.75, tw + 4, fs * 1.5); g.fillStyle = col; g.fillText(t, 0, 0); g.restore();
}
function isNb(i) { for (var k = 0; k < SNB.length; k++) if (SNB[k] === i) return true; return false; }
/* two rows of 100 points: what i pressed, what the queue chose; lit = kept (42, 16). scene 3: the frozen export vs the newest months (shuffle 17 to 1.5, the queue 64 to 75) */
function pips(g) {
  var rows = scene === C_KEEP ? [['i pressed play', 42, MINT], ['the queue chose', 16, VIOLET]] : [['the frozen export, of 100 plays', [19, 17, 64]], ['the newest months, of 100 plays', [0, 1.5, 75]]];
  var cols = phone ? 20 : 25, cell = Math.min((W - 60) / cols, phone ? 11 : 16), rowsN = 100 / cols, bh = rowsN * cell, gap = phone ? 44 : 56;
  var x0 = Math.round((W - cols * cell) / 2), y0 = Math.round(cam.cy - (rows.length * bh + gap) / 2), r = cell * 0.3, k, i, c, rr;
  for (k = 0; k < rows.length; k++) {
    var y = y0 + k * (bh + gap);
    g.font = '500 ' + (phone ? 10.5 : 12) + 'px ' + MONO; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillStyle = INK; g.fillText(rows[k][0], x0, y - 8);
    for (i = 0; i < 100; i++) {
      c = i % cols; rr = (i / cols) | 0; var x = x0 + c * cell + cell / 2, yy = y + rr * cell + cell / 2, col;
      if (scene === C_KEEP) col = i < rows[k][1] ? rows[k][2] : dim(rows[k][2], .22);
      else { var h = rows[k][1]; col = i < h[0] ? MINT : i < h[0] + Math.round(h[1]) ? AMBER : i < h[0] + Math.round(h[1]) + h[2] ? VIOLET : dim(ICE, .25); if (k === 1 && i < 100 - 75 - 2) col = dim(ICE, .25); }
      dot(g, x, yy, r, col);
    }
    g.textBaseline = 'top'; g.fillStyle = MUTE;
    var cap = scene === C_KEEP ? (rows[k][1] + ' of 100 kept') : (k === 0 ? (phone ? 'mint 19 me · amber 17 shuffle · violet 64 queue' : 'mint 19 my press · amber 17 shuffle · violet 64 the queue') : (phone ? 'shuffle 1.5 · queue 75 · me about the same' : 'shuffle 1.5 · the queue 75 · my press about the same'));
    g.fillText(cap, Math.min(x0, W - g.measureText(cap).width - 8), y + bh + 6);
  }
}
function countdown(g, now) {
  var G = S.game, left = Math.max(0, G.until - now), fr = left / 47000, cx = phone ? W - 44 : W - 70, cy = phone ? 44 : 70, r = phone ? 24 : 36;
  ring(g, cx, cy, r, LINE, 3); g.strokeStyle = MINT; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * fr); g.stroke();
  g.font = '600 ' + (phone ? 13 : 16) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(Math.ceil(left / 1000), cx, cy);
}

/* ---------- the loop ---------- */
function tick() { if (!raf) raf = requestAnimationFrame(step); }
function step(now) {
  raf = 0;
  var moving = blend < 1 || reveal < 8 || (S.game && S.game.on) || S.drag || S.mb !== S.mt;
  if (!reduce && (scene === 0 || scene === C_RECORD) && !S.drag && blend >= 1 && !S.line) { yaw += 0.00045 * Math.min(40, now - (last || now)); moving = true; }
  last = now;
  paint(now);
  if (moving || dirty) { dirty = false; tick(); }
}
function wake() { dirty = true; tick(); }

/* ---------- pointer ---------- */
function at(e) { var b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
function near(x, y, maxd) {
  var best = -1, bd = (maxd || 14) * (maxd || 14), i;
  for (i = 0; i < N; i++) { if (SA[i] < 0.3) continue; var dx = SX[i] - x, dy = SY[i] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best;
}
function nearSong(x, y) { var sp = [0, 0, 0], best = -1, bd = 196, k; for (k = 0; k < SONG.length; k++) { var s = SONG[k].p; proj3(s[0] / 1000, s[1] / 1000, s[2] / 1000, sp); var dx = sp[0] - x, dy = sp[1] - y; if (dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = k; } } return best; }
function nearRim(x, y) { var best = -1, bd = 400, k, o = [0, 0]; for (k = 0; k < RING.length; k++) { ringXY(k, cam.r, o); var dx = o[0] - x, dy = o[1] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } } return best; }
cv.addEventListener('pointerdown', function (e) {
  if (e.button && e.button !== 0) return;
  var p = at(e); S.drag = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], on: false, id: e.pointerId, t: e.timeStamp };
  try { cv.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
});
cv.addEventListener('pointermove', function (e) {
  var p = at(e);
  if (S.drag && S.drag.id === e.pointerId) { S.drag.x1 = p[0]; S.drag.y1 = p[1]; if (scene !== 1 && Math.hypot(p[0] - S.drag.x0, p[1] - S.drag.y0) > 12) S.drag.on = true; wake(); return; }
  if (e.pointerType !== 'mouse') return;
  var h = scene === 1 ? -1 : near(p[0], p[1]); if (scene === 1) { var r = nearRim(p[0], p[1]); if (r !== S.rim) { S.rim = r; wake(); } }
  if (h !== S.hover) { S.hover = h; cv.style.cursor = h >= 0 ? 'pointer' : scene === 1 ? 'default' : 'crosshair'; wake(); }
});
function up(e) {
  var d = S.drag; if (!d || d.id !== e.pointerId) return; S.drag = null;
  var p = at(e);
  if (d.on) { line(d.x0, d.y0, p[0], p[1]); wake(); return; }
  if (scene === 1) { var r = nearRim(p[0], p[1]); if (r >= 0) { S.rim = r; var ai = RING[r][0]; if (ai >= 0) play(ai, 'rim'); else wake(); } return; }
  if (scene === C_RECORD) { var k = nearSong(p[0], p[1]); if (k >= 0) { mine(k); return; } }
  var i = near(p[0], p[1], phone ? 18 : 14); if (i >= 0) { S.line = null; play(i, 'tap'); } else wake();
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', function () { S.drag = null; wake(); });
addEventListener('keydown', function (e) { if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !(e.target && /input|textarea/i.test(e.target.tagName))) { next(); } });

/* a line across the map: up to seven stops, the artists nearest to evenly spaced points along it */
function line(x0, y0, x1, y1) {
  var stops = [], k, n = 7, seen = {};
  for (k = 0; k < n; k++) { var t = n === 1 ? 0 : k / (n - 1), i = near(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 40); if (i >= 0 && !seen[i]) { seen[i] = 1; stops.push(i); } }
  if (!stops.length) { S.line = null; return; }
  S.line = { x0: x0, y0: y0, x1: x1, y1: y1, stops: stops, k: 0, scene: scene }; S.trail = [];
  play(stops[0], 'stop');
}

/* ---------- sound: one at a time ---------- */
function duck() { var M = window.__smMusic; if (M && M.hold) M.hold(); }
function unduck() { var M = window.__smMusic; if (M && M.release) M.release(); }
window.__radioYield = function () { if (pv && !pv.paused) { S.user = true; pv.pause(); } if (S.game && S.game.on) endGame(true); };
function ppLabel() { var b = $('#b-pp'); if (b) { b.textContent = S.playing ? 'pause' : 'play'; } html.classList.toggle('sm-pv', !!S.playing); }
function el() {
  if (pv) return pv;
  pv = new Audio(); pv.preload = 'auto';
  pv.addEventListener('playing', function () { S.playing = true; S.errs = 0; duck(); ppLabel(); });
  pv.addEventListener('pause', function () { S.playing = false; ppLabel(); if (!pv.ended) unduck(); });
  pv.addEventListener('ended', function () { S.playing = false; if (S.user || (S.game && S.game.on)) { unduck(); ppLabel(); return; } next(); });
  pv.addEventListener('error', function () { S.playing = false; if (++S.errs > 3 || S.pend >= 0) { unduck(); ppLabel(); return; } if (S.game && S.game.on) gameNext(); else next(); });
  return pv;
}
function prefetchPV() { if (!pvP) pvP = fetchJ('pv').then(function (j) { PV = j.a; return PV; }, function (e) { pvP = null; throw e; }); return pvP; }
function sound(i, then) {
  var a = el(), nm = names[i];
  if (!PV) {
    S.pend = i; if (!a.getAttribute('src')) try { a.load(); } catch (x) { /* nothing yet */ }
    text('#np-t', 'finding its sound…');
    prefetchPV().then(function () { if (S.pend === i) { S.pend = -1; sound(i, then); } }, function () { S.pend = -1; text('#np-t', 'the previews did not load here.'); });
    return;
  }
  var p = PV[nm];
  if (!p) { text('#np-t', 'no preview for this one'); if (then) then(false); else next(); return; }
  text('#np-t', p[0]);
  if (a.getAttribute('src') !== p[1]) a.src = p[1]; else try { a.currentTime = 0; } catch (x) { /* not seekable yet */ }
  duck();
  var q; try { q = a.play(); } catch (x) { q = null; }
  if (q && q.catch) q.catch(function () { S.playing = false; unduck(); ppLabel(); });
  if (then) then(true);
}
function play(i, why) {
  html.classList.remove('sm-mine');
  S.user = false; S.mine = -1; S.now = i; S.played[i] = 1; S.trail.push(i); if (S.trail.length > 14) S.trail.shift();
  room(i, why); sound(i); wake();
}
function next() {
  if (S.game && S.game.on) { gameNext(); return; }
  if (S.now < 0 && !S.line) { play(TOP[0], 'start'); return; }
  var L = S.line;
  if (L && L.k + 1 < L.stops.length) { L.k++; play(L.stops[L.k], 'stop'); return; }
  if (L) L.k = L.stops.length;
  if (S.mode === 'hand') { breakRun(); return; }
  walk();
}
/* be the queue: the nearest in sound not yet played */
function walk() {
  var nn = NN[S.now < 0 ? TOP[0] : S.now], c = -1, k;
  for (k = 0; k < nn.length; k++) if (!S.played[nn[k]] && (!PV || PV[names[nn[k]]])) { c = nn[k]; break; }
  if (c < 0) { S.played = {}; c = nn[0]; }
  play(c, 'near');
}
/* be my hand: break the run, a far artist of another family, among the ones i played most */
function breakRun() {
  var cur = S.now < 0 ? TOP[0] : S.now, x = P3[cur * 3], y = P3[cur * 3 + 1], z = P3[cur * 3 + 2], cand = [], k;
  for (k = 0; k < Math.min(N, 400); k++) { var i = TOP[k]; if (i === cur || F.f[i] === F.f[cur] || S.played[i] || (PV && !PV[names[i]])) continue; var dx = P3[i * 3] - x, dy = P3[i * 3 + 1] - y, dz = P3[i * 3 + 2] - z; cand.push([i, dx * dx + dy * dy + dz * dz]); }
  if (!cand.length) { S.played = {}; walk(); return; }
  cand.sort(function (a, b) { return b[1] - a[1]; });
  play(cand[Math.floor(rnd() * Math.min(10, cand.length))][0], 'break');
}
function room(i, why) {
  var h = F.h[i], p = h[0] + h[1] + h[2], hand = h[2] >= h[0] && h[2] >= h[1] ? 'the queue' : h[1] >= h[0] ? 'shuffle' : 'my press';
  var lead = why === 'stop' && S.line ? 'stop ' + (S.line.k + 1) + ' of ' + S.line.stops.length : why === 'near' ? 'the queue walks: nearest in sound' : why === 'break' ? 'my hand breaks the run: far in sound' : why === 'rim' ? 'who led to whom' : why === 'game' ? '47 seconds: keep or let go' : 'now playing';
  text('#np-k', lead); text('#np-n', names[i]);
  text('#np-h', p + ' plays · mostly ' + hand + ' · ' + F.fam[F.f[i]]);
  var a = $('#a-sp'); if (a) a.href = 'https://open.spotify.com/search/' + encodeURIComponent(names[i]);
  show('#np', true);
}
function mine(k) {
  var M = window.__smMusic; if (!M || !M.tracks) return;
  if (pv && !pv.paused) { S.user = true; pv.pause(); }
  S.now = -1; S.line = null; S.mine = k; var f = SONG[k].f; html.classList.add('sm-mine');
  text('#np-k', 'one of mine, placed by its sound'); text('#np-n', SONG[k].t.toLowerCase()); text('#np-h', 'nearest artist in sound: ' + names[SNB[k]]); text('#np-t', ''); show('#np', true);
  M.tracks().then(function (tr) { for (var j = 0; j < tr.length; j++) if (tr[j].f === f) { M.go(j, 0, true); break; } }, function () { /* the album did not load */ });
  $$('#songs button').forEach(function (b, j) { b.classList.toggle('on', j === k); });
  wake();
}

/* ---------- the 47-second game ---------- */
function startGame() {
  if (S.game && S.game.on) return;
  S.game = { on: true, n: 0, kept: 0, until: 0, i: -1, pool: TOP.slice(0, 600) };
  S.mode = ''; S.line = null; text('#g-score', ''); show('#g-ans', true); show('#g-start', false);
  gameNext();
}
function gameNext() {
  var G = S.game; if (!G || !G.on) return;
  if (G.n >= 10) { endGame(false); return; }
  var i = -1, tries = 0;
  while (i < 0 && tries++ < 50) { var c = G.pool[Math.floor(rnd() * G.pool.length)]; if (!S.played[c] && (!PV || PV[names[c]])) i = c; }
  if (i < 0) { endGame(false); return; }
  G.i = i; G.n++; G.until = performance.now() + 47000; S.now = i; S.played[i] = 1;
  room(i, 'game'); text('#g-k', 'song ' + G.n + ' of 10 · you have 47 seconds'); sound(i);
  clearTimeout(G.to); G.to = setTimeout(function () { answer(false, true); }, 47000);
  wake();
}
function answer(keep, late) {
  var G = S.game; if (!G || !G.on) return;
  clearTimeout(G.to); if (keep) G.kept++;
  text('#g-score', 'you kept ' + G.kept + ' of ' + G.n + (late ? ' · the clock let that one go' : ''));
  gameNext();
}
function endGame(quiet) {
  var G = S.game; if (!G) return; G.on = false; clearTimeout(G.to);
  if (pv && !pv.paused && !quiet) { S.user = true; pv.pause(); }
  show('#g-ans', false); show('#g-start', true);
  if (G.n) text('#g-score', 'you kept ' + G.kept + ' of ' + G.n + ' (' + Math.round(100 * G.kept / G.n) + ' of 100). i keep 42 of 100 of what i press, and 16 of 100 of what the queue chose.');
  text('#g-k', 'ten songs, 47 seconds each. keep it or let it go.');
  wake();
}

/* ---------- whose hand? ---------- */
function whose() {
  if (S.wh && S.wh.rows.length) return;
  var go = function (rows) {
    var me = rows.filter(function (r) { return r.arm === 'me'; }), app = rows.filter(function (r) { return r.arm === 'app'; }), pick = [], k;
    for (k = 0; k < 5; k++) { pick.push(me.splice(Math.floor(rnd() * me.length), 1)[0]); pick.push(app.splice(Math.floor(rnd() * app.length), 1)[0]); }
    for (k = pick.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), t = pick[k]; pick[k] = pick[j]; pick[j] = t; }
    S.wh = { rows: pick, n: 0, right: 0 }; whRound();
  };
  if (TASTE) go(TASTE); else fetchJ('taste').then(function (j) { TASTE = j.rows; go(TASTE); }, function () { text('#w-q', 'the game rows did not load here.'); });
}
function whRound() {
  var G = S.wh; if (G.n >= 10) { text('#w-q', 'you got ' + G.right + ' of 10. chance is 5. the log says i pressed play on 19 of every 100; the rest was the app.'); show('#w-ans', false); show('#w-start', true); G.rows = []; return; }
  var r = G.rows[G.n];
  text('#w-k', 'song ' + (G.n + 1) + ' of 10 · whose hand pressed play?'); text('#w-q', r.t + ' · ' + r.a + (r.pa ? ' · right after ' + r.pa : '')); text('#w-r', '');
  show('#w-ans', true); show('#w-start', false);
  var i = names.indexOf(r.a); if (i >= 0 && PV && PV[r.a]) { S.now = i; room(i, 'tap'); sound(i); }
}
function whAnswer(me) {
  var G = S.wh; if (!G || !G.rows.length) return; var r = G.rows[G.n], ok = (r.arm === 'me') === me; if (ok) G.right++;
  text('#w-r', (ok ? 'yes: ' : 'no: ') + (r.arm === 'me' ? 'i pressed play on that one.' : 'the app played that one.') + ' ' + G.right + ' of ' + (G.n + 1) + ' so far.');
  G.n++; setTimeout(whRound, 1400);
}

/* ---------- wiring ---------- */
function on(sel, f) { var e = $(sel); if (e) e.addEventListener('click', f); }
on('#b-pp', function () { var a = el(); if (S.playing) { S.user = true; a.pause(); } else if (S.now >= 0) { S.user = false; sound(S.now); } else next(); });
on('#b-next', function () { S.user = false; next(); });
on('#b-queue', function () { S.mode = 'queue'; S.line = null; walk(); text('#h-mode', 'the queue walks: each next song is the nearest in sound to the last. hear how close it stays.'); });
on('#b-hand', function () { S.mode = 'hand'; S.line = null; breakRun(); text('#h-mode', 'my hand breaks the run: the next song is far in sound, another family. hear the jump.'); });
function loadMaps() { if (!mapsP) mapsP = fetchJ('maps').then(function (j) { MAPS = j; wake(); return j; }, function () { mapsP = null; }); return mapsP; }
function flyTo(t) { if (S.mt === t && S.mb === t) return; S.mFrom = S.mb; S.mt = t; S.mT0 = performance.now(); loadMaps(); wake(); }
on('#m-sound', function () { flyTo(0); text('#m-mode', 'by sound. every line is short here, whichever hand drew it. the queue\u2019s run sits a shade tighter.'); });
on('#m-graph', function () { flyTo(1); text('#m-mode', 'by what followed. every line is short now, by construction: this map was drawn from the lines. the question is which map the other hand\u2019s lines respect.'); });
on('#n-hood', function () { S.hoodBy = ''; text('#n-mode', 'colored by neighborhood. the label is the family that fills it most; the shape is the second map.'); wake(); });
on('#n-hand', function () { S.hoodBy = 'hand'; text('#n-mode', 'colored by the hand that played each artist most. the label is the share of each neighborhood\u2019s inside steps the queue took.'); wake(); });
/* the sound pill: one press starts my album; previews still take their turn (one sound at a time) */
on('#b-sound', function () {
  var M = window.__smMusic; if (!M || !M.toggle) return; M.toggle();
  var lab = function () { var a = M.A && M.A.el, on = a && !a.paused; text('#b-sound', on ? 'sound: on' : 'sound'); html.classList.toggle('sm-album', !!on); };
  if (M.A && M.A.el && !M.A.el.__pill) { M.A.el.__pill = 1; ['play', 'pause', 'ended'].forEach(function (t) { M.A.el.addEventListener(t, lab); }); }
  setTimeout(lab, 400);
});
on('#g-start', startGame); on('#g-keep', function () { answer(true, false); }); on('#g-go', function () { answer(false, false); });
on('#w-start', whose); on('#w-me', function () { whAnswer(true); }); on('#w-app', function () { whAnswer(false); });
function songs() {
  var ol = $('#songs'); if (!ol) return;
  SONG.forEach(function (s, k) { var li = doc.createElement('li'), b = doc.createElement('button'); b.type = 'button'; b.className = 'sg'; b.innerHTML = '<b></b><span></span>'; b.firstChild.textContent = s.t.toLowerCase(); b.lastChild.textContent = 'beside ' + names[SNB[k]]; b.addEventListener('click', function () { mine(k); }); li.appendChild(b); ol.appendChild(li); });
}
/* the acts drive the scene */
function acts() {
  var secs = $$('.act'), io = 'IntersectionObserver' in window;
  if (!io) return;
  var obs = new IntersectionObserver(function (es) {
    var best = null; es.forEach(function (e) { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; });
    if (best) { var k = secs.indexOf(best.target); if (k >= 0) setScene(k); }
  }, { rootMargin: phone ? '-62% 0px -18% 0px' : '-45% 0px -45% 0px', threshold: [0, 0.2, 0.5, 1] });
  secs.forEach(function (s) { obs.observe(s); });
  var dots = $$('.dots a'); dots.forEach(function (a, k) { a.addEventListener('click', function (e) { e.preventDefault(); secs[k].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }); });
  secs.forEach(function (s, k) { new IntersectionObserver(function (es) { if (dots[k]) dots[k].classList.toggle('on', es[0].isIntersecting); }, { rootMargin: phone ? '-62% 0px -18% 0px' : '-45% 0px -45% 0px' }).observe(s); });
}
var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { fit(); wake(); }) : null;
fetchJ('field').then(function (j) {
  fit(); prep(j); fit();
  rimOrder = RING.map(function (r, k) { return k; }).sort(function (a, b) { var pa2 = RING[a][0] >= 0 ? PL[RING[a][0]] : 0, pb2 = RING[b][0] >= 0 ? PL[RING[b][0]] : 0; return pb2 - pa2; });
  html.setAttribute('data-scene', 'count');
  songs(); acts(); if (ro) ro.observe(stage); else addEventListener('resize', function () { fit(); wake(); });
  $$('.lz').forEach(function (e) { e.hidden = true; });
  var R = (window.__ledger && window.__ledger.READY) || {}; R.field = true;
  window.__field = { S: S, n: function () { return N; }, pv: function () { return pv; }, scene: function () { return scene; }, at: function (i) { var o = [0, 0, 0, 0]; place(scene, i, o); return o; }, top: function () { return TOP; }, reveal: function () { return reveal; }, grow: function () { reveal = 8; wake(); }, hoods: function () { return MAPS ? MAPS.cm.length : 0; } };
  wake();
  if (!lite()) setTimeout(prefetchPV, 1200);
}, function () { var h = $('#hint'); if (h) h.textContent = 'the map did not load here. the story is below.'; });
function lite() { try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; } }
})();
