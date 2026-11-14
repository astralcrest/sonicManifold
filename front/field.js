/* the front = THE FIELD (2026-11-03). one crisp canvas behind seven acts: every artist i have heard, placed in the 3D sound map
   (CLAP UMAP), drawn flat and sharp at device pixels; no glow, no blur. the acts follow the narrative: the count, the hand,
   the two maps (the same artists by sound and by what followed what), what stays, the coda, the record. eight things to play: fly between the maps, draw a curve (a radio of stops; faster = deeper in the field), whose hand? (guess me or the
   queue), be auto-play / be my hand (hear the run and hear it break), the ring you can play (who led to whom, in four looks), sounds like (the six nearest in sound), the
   47-second game (keep or let go), where my songs land (each placed by sound beside its nearest artist), bring your export.
   data: front/data/field.json (+ pv.json previews, taste.json the game rows). one sound at a time: the album holds while a
   preview plays and comes back when it stops (music.js hold/release + __radioYield). */
(function () {
'use strict';
var doc = document, html = doc.documentElement, $ = function (s) { return doc.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(doc.querySelectorAll(s)); };
var ST = (window.__front && window.__front.stamps) || {};
var BG = '#06010f', INK = '#efe9ff', MUTE = '#9a90b8', MINT = '#21f6bc', AMBER = '#f5a623', VIOLET = '#8b6fd6', ROSE = '#ff5c7a', ICE = '#bcd3ff', GOLD = '#ffd36b', LINE = '#2a2140';
var FAMC = { 'ambient/lofi': '#3d8bff', 'classical': '#7fd37f', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ffb3c6', 'hip-hop · r&b': '#ff5c7a', 'jazz': '#d9b8ff', 'other': '#9a90b8', 'pop': '#ff8fd6', 'rock/metal': '#c9c2ff', 'soundtrack': '#38c2d6', 'world/desi': '#ea5a2a', 'untagged': '#6f6790' };
var SANS = '"Instrument Sans",-apple-system,"Inter",system-ui,sans-serif', MONO = '"IBM Plex Mono",ui-monospace,Menlo,monospace';
var cv = $('#field'), ctx = cv && cv.getContext('2d'), stage = $('#stage');
if (!cv || !ctx) return;
var DPR = 1, W = 1, H = 1, phone = false, reduce = false;
try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* no hint */ }
var F = null, PV = null, pvP = null, pv = null, TASTE = null, MAPS = null, mapsP = null;
var N = 0, P3 = null, PL = [], PMAX = 1, SZ = [], FC = [], HC = [], NN = [], KNN = [], TOP = [], names = [];
var SX = [], SY = [], SA = [], SR = [];       /* screen x, y, alpha, radius this frame */
var RING = [], RA = {}, RI = {}, RF = [], GA = {}, TX = [], EDG = [], RPX = null, RPY = null, RRING = 1, LASP = 1, RL = null, rlP = null, ZD = null, MINE = [], Q = [], SONG = [], SNB = [], RD = [], RLONE = 0, RZERO = 0, RNODOT = 0, KB = null, LFM = 0, APPL = 0, NOLAB = 0;
var KNN2 = null, NB2 = null, DW = [], PG = null, CLB = null;
/* phone: the drawing is fitted to the points it actually has (the cloud is a ribbon, not a box), and the fit arrives slowly, as a zoom in */
var FITS = {};
var pendT = 0, pendF = null, VA = null, lastIn = -1e9, lastPaint = 0, ZMAX = 24, hold = 0, lastTap = null, zc = null, fitB = null, drawB = null, zcOn = false, zcT = '', ov = null, ovg = null, ovRaf = 0, domC = null, domT = -1e9, domStale = true;
var scene = 0, blend = 0, from = 0, tStart = 0, yaw = 0.62, pitch = 0.36, last = 0, raf = 0, dirty = true;
var DEMO = { on: false, t0: 0, a: null, n: 0, last: 0 };
/* the phone keeps the caption strip and the playing strip clear: no box, no anchor under them */
var WBp = 0, NBp = 0, FINR = null, FINH = 0;
var S = { rt: [], now: -1, line: null, drag: null, played: {}, playing: false, pend: -1, errs: 0, user: false, hover: -1, mine: -1, mode: '', trail: [], rim: -1, game: null, wh: null, pips: null, mt: 0, mb: 0, mFrom: 0, mT0: 0, color: '', fam: -1, hoodHi: -1, grow: null, keepT0: 0, sn: 0, tn: [], hoodSeen: false, look: 0, lookFrom: 0, lookT0: 0, lookB: 1, like: { on: false, seq: null, k: 0 }, zb: 0 };
/* the curve radio's camera: a glide on top of the view, eased toward the stop that is playing (field acts only) */
var GL = { x: 0, y: 0, z: 1 }, gliding = false, glT = 0;
/* first heard: eight cuts of the log by sitting count (never a date), deep violet first to gold last */
var FIRSTC = ['#2b2342', '#443a6e', '#5d5596', '#7a74b8', '#9a97d2', '#bbbce6', '#dcdcf4', '#f4f2ff']; /* early to late: a neutral ramp that borrows no key color */
function rgba(h, a) { var c = hex(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
var ease = function (t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); };

function hex(h) { h = h.slice(1); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
var BGc = hex(BG);
function dim(h, k) { var c = hex(h); return 'rgb(' + c.map(function (v, i) { return Math.round(BGc[i] + (v - BGc[i]) * k); }).join(',') + ')'; }
function fetchJ(n) { return fetch('front/data/' + n + '.json?v=' + (ST[n] || '0'), { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); }); }
function text(sel, t) { var e = $(sel); if (e && e.textContent !== t) e.textContent = t; }
function show(sel, on) { var e = $(sel); if (e) e.hidden = !on; }
/* on a phone the card sits in the column's flow above the acts, and the plates take a shorter shape once it shows: that would move the act under the reader and flip the scene (camera reset). so whenever the column reflows, the page scrolls by exactly what the current act moved, before the scene observer measures; a scroll of our own does not move the reference */
var NPR = { el: null, top: 0, on: false, exp: -1 };
function npRef() { var e = $('#a-' + SCENES[scene]); NPR.el = e; NPR.top = e ? e.getBoundingClientRect().top : 0; }
function npShow() {
  var e = $('#np'); if (!e) return;
  /* on the phone the strip is fixed and must sit above the stage, so it leaves the column's stacking context */
  if (phone && e.parentElement !== doc.body) doc.body.appendChild(e);
  if (phone && !NPR.on && 'ResizeObserver' in window) {
    NPR.on = true; npRef();
    addEventListener('scroll', function () { if (Math.abs(scrollY - NPR.exp) > 1) npRef(); }, { passive: true });
    var ro = new ResizeObserver(function () { if (!NPR.el) return; var d = NPR.el.getBoundingClientRect().top - NPR.top; if (Math.abs(d) > 1) { scrollBy({ top: d, left: 0, behavior: 'instant' }); NPR.exp = scrollY; } });
    ro.observe(e); var col = $('#col'); if (col) ro.observe(col);
  }
  e.hidden = false;
}
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var rnd = rng((Date.now() / 1000) | 0);

/* ---------- data ---------- */
var FAM0 = null;
function apple(i) { return !!(F.fa && FAM0 && F.fa[i] !== FAM0[i]); }
function prep(j) {
  F = j; N = F.n.length; names = F.n; P3 = new Float32Array(N * 3);
  FAM0 = F.f; if (F.fa && F.fa.length === N) F.f = F.fa; /* the display family: Last.fm, else Apple's label (disclosed) */
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
  /* the ring's honest degree: how many mint and violet lines end at each rim name, and how many names have a line at all */
  RD = RING.map(function () { return [0, 0]; });
  for (k = 0; k < MINE.length; k++) { RD[MINE[k].a][0]++; RD[MINE[k].b][0]++; }
  for (k = 0; k < Q.length; k++) { RD[Q[k][0]][1]++; RD[Q[k][1]][1]++; }
  /* the rim by family: each name in its display family, the families in size order, the old follow order kept inside each */
  RF = RING.map(function (r) { return r[0] >= 0 ? F.f[r[0]] : r[3]; });
  var cnt = {}, ord, slot = 0, gap = 2.5, at2 = [], gx = {}, gy = {};
  for (k = 0; k < RING.length; k++) cnt[RF[k]] = (cnt[RF[k]] || 0) + 1;
  ord = RING.map(function (r, k2) { return k2; }).sort(function (a, b) { return cnt[RF[b]] - cnt[RF[a]] || RF[a] - RF[b] || RING[a][2] - RING[b][2]; });
  for (k = 0; k < ord.length; k++) { if (k && RF[ord[k]] !== RF[ord[k - 1]]) slot += gap; at2[ord[k]] = slot; slot += 1; }
  for (k = 0; k < RING.length; k++) {
    RA[k] = -Math.PI / 2 + 2 * Math.PI * (at2[k] + 0.5) / (slot + gap); TX[k] = (at2[k] + 0.5) / slot;
    gx[RF[k]] = (gx[RF[k]] || 0) + Math.cos(RA[k]); gy[RF[k]] = (gy[RF[k]] || 0) + Math.sin(RA[k]);
  }
  GA = {}; for (k in gx) GA[k] = Math.atan2(gy[k], gx[k]);
  EDG = []; for (k = 0; k < MINE.length; k++) EDG.push([MINE[k].a, MINE[k].b, MINE[k].w, 1]);
  for (k = 0; k < Q.length; k++) EDG.push([Q[k][0], Q[k][1], Q[k][2], 0]);
  /* one width scale for both hands, so the picture keeps the real proportion (auto-play's pairs carry far more plays) */
  var EP = {}, ET = [];
  for (k = 0; k < EDG.length; k++) { var ee = EDG[k]; ee[5] = 0; ET.push(ee[2]); EP[(ee[0] < ee[1] ? ee[0] + ',' + ee[1] : ee[1] + ',' + ee[0]) + ':' + ee[3]] = 1; }
  ET = cuts3(ET);
  for (k = 0; k < EDG.length; k++) { var e3 = EDG[k], pk = e3[0] < e3[1] ? e3[0] + ',' + e3[1] : e3[1] + ',' + e3[0]; e3[4] = step3(e3[2], ET); if (EP[pk + ':' + (1 - e3[3])]) e3[5] = 1; }
  RPX = new Float32Array(RING.length); RPY = new Float32Array(RING.length);
  RLONE = 0; RZERO = 0; RNODOT = 0;
  for (k = 0; k < RING.length; k++) { var dg = RD[k][0] + RD[k][1]; if (dg === 0) RZERO++; else if (dg === 1) RLONE++; if (RING[k][0] < 0) RNODOT++; }
  var UNT = F.fam.indexOf('untagged'); LFM = 0; APPL = 0; NOLAB = 0;
  for (i = 0; i < N; i++) { if (FAM0[i] !== UNT) LFM++; else if (F.f[i] !== UNT) APPL++; else NOLAB++; }
  SONG = F.s; SNB = [];
  for (k = 0; k < SONG.length; k++) {
    var sp = SONG[k].p, bi = -1, bd = 9;
    for (i = 0; i < N; i++) { var ex = P3[i * 3] - sp[0] / 1000, ey = P3[i * 3 + 1] - sp[1] / 1000, ez = P3[i * 3 + 2] - sp[2] / 1000, dd = ex * ex + ey * ey + ez * ez; if (dd < bd) { bd = dd; bi = i; } }
    SNB.push(bi);
  }
  SX = new Float32Array(N); SY = new Float32Array(N); SA = new Float32Array(N); SR = new Float32Array(N); ZD = new Float32Array(N);
}

/* ---------- layout ---------- */
function fit() {
  var b = stage.getBoundingClientRect(); W = Math.max(1, Math.round(b.width)); H = Math.max(1, Math.round(b.height));
  phone = W < 700 || innerWidth < 900; FITS = {}; DPR = Math.min(3, Math.max(1, Math.round((window.devicePixelRatio || 1) * 2) / 2));
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  if (ov) { ov.width = cv.width; ov.height = cv.height; }
  domStale = true;
  var i, smin = phone ? 1.5 : 1.8, smax = phone ? 4.6 : 6.6; SZ = [];
  for (i = 0; i < N; i++) SZ.push(smin + (smax - smin) * Math.sqrt(PL[i] / PMAX));
  pathsDirty = true; dirty = true;
}
var cam = { cx: 0, cy: 0, r: 1 }, cam0 = { cx: 0, cy: 0, r: 1 }, view = { z: 1, px: 0, py: 0 }, PTRS = {};
var dolly = 1; /* a slow push-in on every act change in the field; the ring and the flat maps keep their own frame */
function proj3(x, y, z, out) {
  var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  var x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + 3.2, s = 2.6 / z2 * dolly;
  out[0] = cam.cx + x1 * s * cam.r; out[1] = cam.cy - y1 * s * cam.r; out[2] = z2;
}
var tmp = [0, 0, 0];
/* the text column on a desk: the card (360 px), or the open drawer and the card beside it; the drawing never runs under either */
function leftCol() { return phone ? 0 : (html.classList.contains('drawer') ? Math.min(520, W * 0.44) + Math.min(320, W * 0.34) + 24 : Math.min(360, W * 0.3)); }
/* the per-scene camera: on a desk the field fills the screen, nudged right of the card; on a phone it sits above the panel */
function frame() {
  /* on a desk the text has its own left column (360 px); the drawing fills the rest and never runs under it */
  var x0 = leftCol(), Wc = W - x0, cx0 = x0 + Wc / 2;
  /* on a phone the what strip owns the top of the stage: the drawing is centered in the room below it, so the rim names never run under the chips */
  var we = document.getElementById('what'), wb = we && (phone || scene === 1) ? we.offsetTop + we.offsetHeight + 6 : 0, npI = phone ? document.getElementById('np') : null, nb = npI && !npI.hidden ? 54 : 0, Hp = H - wb - nb, cyp = wb + Hp * 0.5;
  WBp = phone ? wb : 0; NBp = nb;
  if (phone && scene === C_COUNT && wb) { wb += 66; Hp = H - wb - nb; cyp = wb + Hp * 0.5; }
  if (phone && scene === C_RECORD && FINH) { nb += FINH; Hp = H - wb - nb; cyp = wb + Hp * 0.5; }
  if (scene === 1) { cam.r = Math.min(Wc, Hp) * (phone ? 0.36 : 0.41); cam.cx = phone ? W * 0.5 : cx0; cam.cy = cyp; }
  else if (scene === C_MAPS) { cam.r = Math.min(Wc, phone ? Hp : H) * (phone ? 0.43 : 0.44); cam.cx = phone ? W * 0.5 : cx0; cam.cy = phone ? cyp : H * 0.5; }
  else if (phone && scene === C_RECORD) { cam.r = Math.min(W * 1.0, Hp * 0.9) * 0.78; cam.cx = W * 0.5; cam.cy = cyp; }
  else if (scene === C_RECORD && FINH) { cam.r = Math.min(Wc * 0.6, (H - FINH) * 0.96) * 0.84; cam.cx = cx0 - 60; cam.cy = (H - FINH) * 0.52; }
  else { cam.r = phone ? Math.min(W * 0.72, Hp * 0.9) * 0.78 : Math.min(Wc * 0.6, H * 0.96) * 0.84; cam.cx = phone ? W * 0.5 : cx0; cam.cy = phone ? cyp : H * 0.5; }
  cam0.cx = cam.cx; cam0.cy = cam.cy; cam0.r = cam.r;
  if (phone && FITS[scene] && FITS[scene].s > 1) { var ff = FITS[scene], fa = ff.a < 1 ? ease(ff.a) : 1; cam.cx -= ff.dx * fa; cam.cy -= ff.dy * fa; cam.r *= 1 + (ff.s - 1) * fa; cam0.cx = cam.cx; cam0.cy = cam.cy; cam0.r = cam.r; }
  cam.r *= view.z; cam.cx += view.px; cam.cy += view.py;
  if (scene === C_COUNT || scene === C_RECORD) { cam.r *= GL.z; cam.cx += GL.x; cam.cy += GL.y; }
}
/* the radio glide is folded into the view, so the picture does not jump back when a hand takes over the zoom */
function unglide() { if (isField(scene)) { view.z = Math.min(ZMAX, view.z * GL.z); view.px += GL.x; view.py += GL.y; } GL.x = 0; GL.y = 0; GL.z = 1; if (S.line) S.line.follow = false; clampView(); frame(); }
function isField(k) { return k === C_COUNT || k === C_RECORD; }
/* zoom about a screen point: the artist under the finger stays under the finger */
function zoomAt(mx, my, f) {
  if (isField(scene) && (GL.x || GL.y || GL.z !== 1)) unglide();
  VA = null;
  var z = Math.min(ZMAX, Math.max(1, view.z * f)); f = z / view.z; if (f === 1) return;
  var cx = cam.cx, cy = cam.cy; cx = mx - (mx - cx) * f; cy = my - (my - cy) * f;
  view.z = z; view.px = cx - cam0.cx; view.py = cy - cam0.cy; clampView(); pathsDirty = true; wake();
}
/* an eased move of the view (200 ms): double tap, keys, fit, find. the target is a zoom and the screen point that ends up under (tx, ty) */
function fitPhone(now) {
  var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0, i;
  var o = [0, 0, 0, 0];
  for (i = 0; i < N; i++) { place(scene, i, o); if (!(o[2] > 0.05)) continue; n++; if (o[0] < x0) x0 = o[0]; if (o[0] > x1) x1 = o[0]; if (o[1] < y0) y0 = o[1]; if (o[1] > y1) y1 = o[1]; }
  if (n < 20 || x1 - x0 < 10 || y1 - y0 < 10) { FITS[scene] = { s: 1, dx: 0, dy: 0, a: 1, t0: now }; return; }
  var we = document.getElementById('what'), wb = we ? we.offsetTop + we.offsetHeight + 10 : 50, aw = W - 28, ah = H - wb - 14;
  var s = Math.min(aw / (x1 - x0), ah / (y1 - y0)) * 0.9; s = Math.max(1, Math.min(2.6, s)); if (s < 1.04) s = 1;
  FITS[scene] = { s: s, dx: (x0 + x1) / 2 - cam0.cx, dy: (y0 + y1) / 2 - (wb + ah / 2), a: s > 1 ? 0 : 1, t0: now };
}
function animView(z1, x1, y1, ms) {
  if (isField(scene) && (GL.x || GL.y || GL.z !== 1)) unglide();
  VA = { t0: performance.now(), dur: reduce ? 1 : ms, z0: view.z, z1: z1, x0: cam.cx, y0: cam.cy, x1: x1, y1: y1 }; wake();
}
function zoomTo(mx, my, zt, ms) { zt = Math.min(ZMAX, Math.max(1, zt)); var f = zt / view.z; animView(zt, mx - (mx - cam.cx) * f, my - (my - cam.cy) * f, ms || 200); }
function stepView(now) {
  if (!VA) return;
  var e = ease((now - VA.t0) / VA.dur);
  view.z = VA.z0 * Math.pow(VA.z1 / VA.z0, e);
  view.px = VA.x0 + (VA.x1 - VA.x0) * e - cam0.cx; view.py = VA.y0 + (VA.y1 - VA.y0) * e - cam0.cy;
  if (e >= 1) { view.z = VA.z1; VA = null; } clampView(); pathsDirty = true;
}
function clampView() { if (view.z <= 1) { view.z = 1; view.px = 0; view.py = 0; return; } var lim = cam0.r * view.z; view.px = Math.max(-lim, Math.min(lim, view.px)); view.py = Math.max(-lim, Math.min(lim, view.py)); }
/* a room's center on screen: the mean of its artists as they sit now */
function hoodCenter(h) { var sx = 0, sy = 0, n = 0, k, o = [0, 0, 0, 0]; if (!MAPS) return null; for (k = 0; k < N; k++) if (MAPS.c[k] === h) { place(scene, k, o); sx += o[0]; sy += o[1]; n++; } return n ? [sx / n, sy / n] : null; }
/* jump to a room: the camera glides until the room sits in the middle, closer (her "room jump") */
function jumpHood(h) { var c = hoodCenter(h); if (!c) return; var zt = Math.min(ZMAX, Math.max(2.2, view.z)), f = zt / view.z; animView(zt, cam0.cx - (c[0] - cam.cx) * f, cam0.cy - (c[1] - cam.cy) * f, 380); }
function resetView() { if (isField(scene) && (GL.x || GL.y || GL.z !== 1)) unglide(); GL.x = 0; GL.y = 0; GL.z = 1; if (S.line) S.line.follow = false; S.drawArm = false; animView(1, cam0.cx, cam0.cy, 220); }

/* ---------- scenes ---------- */
var SCENES = ['count', 'hand', 'maps', 'hoods', 'keep', 'coda', 'record'];
var C_COUNT = 0, C_HAND = 1, C_MAPS = 2, C_HOODS = 3, C_KEEP = 4, C_CODA = 5, C_RECORD = 6;
/* the rooms: eight crisp hues for the eight largest, the rest muted; the color is the room, never the hand */
/* a room wears its majority family's color, the hex act iii taught; two rooms of one family are told apart by number */
function hoodCol(ci) { var m = MAPS && MAPS.cm && MAPS.cm[ci]; return (m && FAMC[F.fam[m[1]]]) || MUTE; }
var ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
function setScene(k) {
  if (k === scene) return;
  clearTimeout(pendT); pendT = 0; from = scene; scene = k; blend = 0; tStart = 0; dirty = true;
  S.hover = -1; S.rim = -1; S.rt = []; S.fam = -1; S.hoodHi = -1; S.grow = null; view.z = 1; view.px = 0; view.py = 0; VA = null; S.drawArm = false; GL.x = 0; GL.y = 0; GL.z = 1; pathsDirty = true;
  if (k !== C_MAPS) S.like.seq = null;
  if (k === C_HAND) loadRing();
  S.color = k === C_HOODS || k === C_RECORD ? 'hood' : 'family'; var k2b = $('#key2'); if (k2b) k2b.hidden = S.color !== 'family'; chips();
  if (k === C_KEEP) S.keepT0 = 0;
  S.finT0 = 0;
  html.setAttribute('data-scene', SCENES[k]);
  $$('.act.more').forEach(function (a) { a.classList.remove('more'); });
  if (NPR.on) npRef();
  var npE = $('#np'); if (npE) { npE.classList.remove('open'); var alb = window.__smMusic && window.__smMusic.A && window.__smMusic.A.el; if (phone && !npE.hidden && !(pv && !pv.paused) && !(S.mine >= 0 && alb && !alb.paused)) npE.hidden = true; }
  if (k !== C_KEEP && S.game) endGame(true);
  if (k === C_MAPS || k === C_HOODS || k === C_RECORD) loadMaps();
  whatFor(k);
  if (!phone) clStart(500);
  if (k === C_HOODS && !S.hoodSeen) { S.hoodSeen = true; loadMaps().then(function () { if (MAPS && scene === C_HOODS && !S.grow) { S.grow = { t0: performance.now() + 700, c: 0, done: false, dur: 6500, hood: true }; wake(); } }); }
  tick();
}
/* the color of an artist under a mode: the hand that played it most, its family, its room, or when i first heard it */
function colorOf(i, m) {
  if (m === 'hood') return MAPS && MAPS.c[i] >= 0 && MAPS.c[i] < 8 ? hoodCol(MAPS.c[i]) : MUTE;
  if (m === 'hand') return HC[i];
  if (m === 'first') return FIRSTC[Math.min(7, Math.max(0, F.y0[i]))];
  return FC[i];
}
function keyOf(i, m) { return m === 'hood' ? (MAPS && MAPS.c[i] < 8 ? MAPS.c[i] : -1) : m === 'hand' ? HC[i] : m === 'first' ? F.y0[i] : F.f[i]; }
function chips() {
  $$('#hoods .row .chip:not([data-tm]), #maps .row .chip:not([data-tm])').forEach(function (b) { var c = b.getAttribute('data-c'); b.classList.toggle('on', c ? c === S.color : b.id === 'm-grow' ? !!S.grow : b.id === 'n-walk' ? S.mode === 'log' : b.id === 'n-jump' ? S.hoodHi >= 0 : b.id === 'm-like' ? S.like.on : false); });
  var ms = $('#m-sound'), mg = $('#m-graph'); if (ms && mg) { ms.hidden = S.mt === 0; mg.hidden = S.mt === 1; }
  $$('.key button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-f') === S.fam); b.classList.toggle('off', S.fam >= 0 && +b.getAttribute('data-f') !== S.fam); });
  var k2 = $('#key2'); if (k2) k2.hidden = S.color !== 'family';
  var k1 = $('#key'); if (k1 && k1.children.length) k1.hidden = !(scene === C_MAPS || scene === C_HAND || (scene === C_HOODS && (S.color === 'family' || (phone && S.color === 'hood'))));
  var nc = $('#n-color'); if (nc) nc.textContent = NCOL[S.color] || NCOL.hood;
  $$('#hl-list button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-h') === S.hoodHi); });
  var hd = $('#hl-d'); if (hd) hd.textContent = S.hoodHi >= 0 && HD[S.hoodHi] ? HD[S.hoodHi] : '';
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
    out[0] = RPX[r]; out[1] = RPY[r]; out[2] = 1; return;
  }
  proj3(P3[i * 3], P3[i * 3 + 1], P3[i * 3 + 2], tmp); out[0] = tmp[0]; out[1] = tmp[1];
  var depth = 1 - Math.min(1, Math.max(0, (tmp[2] - 1.9) / 2.6));
  out[2] = (k === C_KEEP || k === C_CODA) ? 0.22 : k === C_RECORD ? 0.5 : 0.55 + 0.45 * depth;
  out[3] = 0.75 + 0.5 * depth; out[4] = 1 - depth;
}
var pa = [0, 0, 0, 1, 0.5], pb = [0, 0, 0, 1, 0.5];
var reveal = 0, revT0 = 0; /* the overture: the field assembles in the order i first heard its artists, eight cuts by day count */
function layout(now) {
  if (!tStart) tStart = now;
  blend = reduce ? 1 : ease((now - tStart) / 900);
  if (reveal < 8) { if (!revT0) revT0 = now; reveal = reduce ? 8 : 8 * ease((now - revT0) / 7000); if (reveal >= 7.999) reveal = 8; }
  dolly = (scene === C_HAND || scene === C_MAPS || scene === C_HOODS) ? 1 : 0.93 + 0.07 * blend;
  if (S.mb !== S.mt) { var mk = reduce ? 1 : ease((now - S.mT0) / 1100); S.mb = S.mFrom + (S.mt - S.mFrom) * mk; if (mk >= 1) S.mb = S.mt; }
  /* as it grew: the second map assembles in the order the log happened, eight cuts by sitting count */
  var gc = 9;
  if (S.grow && (scene === C_MAPS || scene === C_HOODS)) { gc = reduce ? 8 : 8.2 * ease((now - S.grow.t0) / (S.grow.dur || 11000)); if (gc >= 8) { gc = 8; S.grow.done = true; } S.grow.c = gc; }
  stepView(now); frame();
  if (scene === C_HAND || from === C_HAND) ringPos(now);
  var i, k = blend;
  for (i = 0; i < N; i++) {
    pa[4] = 0.5; place(scene, i, pa); ZD[i] = pa[4];
    if (k < 1) { place(from, i, pb); SX[i] = pb[0] + (pa[0] - pb[0]) * k; SY[i] = pb[1] + (pa[1] - pb[1]) * k; SA[i] = pb[2] + (pa[2] - pb[2]) * k; SR[i] = SZ[i] * ((pb[3] || 1) + ((pa[3] || 1) - (pb[3] || 1)) * k); }
    else { SX[i] = pa[0]; SY[i] = pa[1]; SA[i] = pa[2]; SR[i] = SZ[i] * (pa[3] || 1); }
    if (reveal < 8 && scene === C_COUNT && F.y0[i] >= reveal) SA[i] = 0;
    if (gc < 8 && F.y0[i] >= gc) SA[i] = 0;
  }
  if (phone && scene !== C_HAND && k >= 1 && !FITS[scene] && view.z === 1) fitPhone(now);
  if (phone && FITS[scene] && FITS[scene].a < 1) { FITS[scene].a = Math.min(1, (now - FITS[scene].t0) / 1700); dirty = true; pathsDirty = true; }
  /* the camera eases along the curve: the stop that plays drifts to the middle, a little closer */
  var L = S.line; gliding = false;
  if (L && L.follow && scene === L.scene && blend >= 1 && L.k < L.stops.length) {
    /* the ease is per millisecond, not per frame, so a heavy frame does not slow the glide */
    var si = L.stops[L.k], ex = cam0.cx - SX[si], ey = cam0.cy - SY[si], zt = phone ? 1.5 : 1.7, gdt = glT ? Math.min(100, now - glT) : 16.7, kk = reduce ? 1 : 1 - Math.pow(0.94, gdt / 16.7);
    GL.x += ex * kk; GL.y += ey * kk; GL.z += (zt - GL.z) * kk;
    gliding = Math.abs(ex) > 0.6 || Math.abs(ey) > 0.6 || Math.abs(zt - GL.z) > 0.004;
  }
  glT = L && L.follow ? now : 0;
}
/* ---------- the ring's four looks: R radial, F bundled, C constellations, T arcs ---------- */
var LOOKN = ['straight lines', 'gathered by family', 'as islands', 'as arcs'];
var LOOKT = ['radial: names on the rim, grouped by family; every line bends through the hubs of its two families, so the bundles show which families lead to which.',
  'bundled: the same lines; the names placed by a force layout of who followed whom, and lines that run together drawn as one.',
  'constellations: one island per family, the most played at its center. a line inside an island stays in a family; a curve between islands crosses families.',
  'arcs: every name on one line, grouped by family. my press arcs above in mint, auto-play arcs below in violet.'];
function ringChk() { var c = 0, k; for (k = 0; k < RING.length; k++) c = (c + (k + 1) * RING[k][1].length) % 1000003; return c; }
function loadRing() { if (!rlP) rlP = fetchJ('ring').then(function (j) { if (j && j.n === RING.length && j.chk === ringChk()) RL = j; return RL; }, function () { rlP = null; return null; }); return rlP; }
function lookXY(L, k, out) {
  if (L === 3) { var hw = phone ? W * 0.45 : Math.min(W * 0.4, cam.r * 1.6); out[0] = cam.cx + (TX[k] - 0.5) * 2 * hw; out[1] = cam.cy + (phone ? 0 : H * 0.04); return; }
  if (L === 1 && RL) { var p = RL.F.p[k]; out[0] = fx(p[0]); out[1] = fy(p[1]); return; }
  if (L === 2 && RL) { var p2 = RL.C.p[k]; out[0] = ix(p2[0]); out[1] = iy(p2[1]); return; }
  out[0] = cam.cx + RRING * Math.cos(RA[k]); out[1] = cam.cy + RRING * Math.sin(RA[k]);
}
function ringPos(now) {
  RRING = cam.r * (phone ? 0.8 : 0.84); LASP = phone ? 1 : Math.min(1.5, W * 0.4 / cam.r);
  if (S.lookB < 1) S.lookB = reduce ? 1 : ease((now - S.lookT0) / 900);
  var a = [0, 0], b = [0, 0], t = S.lookB, k;
  for (k = 0; k < RING.length; k++) {
    lookXY(S.look, k, a);
    if (t < 1) { lookXY(S.lookFrom, k, b); RPX[k] = b[0] + (a[0] - b[0]) * t; RPY[k] = b[1] + (a[1] - b[1]) * t; } else { RPX[k] = a[0]; RPY[k] = a[1]; }
  }
}
function fx(v) { return cam.cx + v / 1000 * cam.r * LASP; }
function fy(v) { return cam.cy + v / 1000 * cam.r * 0.96; }
function ix(v) { return cam.cx + v / 1000 * cam.r * 1.02; }
function iy(v) { return cam.cy + v / 1000 * cam.r * 1.02; }
/* one link in a look: R bends through the anchors of its two families (one cubic, so links between the same two families bundle),
   F follows its bundled polyline, C curves between islands, T arcs above (mint) or below (violet) */
function edge(g, k, L) {
  var e = EDG[k], a = e[0], b = e[1], ax = RPX[a], ay = RPY[a], bx = RPX[b], by = RPY[b], j;
  if (L === 3) {
    var m = (ax + bx) / 2, rx = Math.abs(bx - ax) / 2, up = e[3] === 1, ry = Math.max(4, Math.min(rx, up ? ay - 34 : H - ay - 16));
    if (rx < 0.5) return;
    if (up) { g.moveTo(m - rx, ay); g.ellipse(m, ay, rx, ry, 0, Math.PI, 2 * Math.PI); } else { g.moveTo(m + rx, ay); g.ellipse(m, ay, rx, ry, 0, 0, Math.PI); }
    return;
  }
  if (L === 1 && RL) { var pl = RL.F.e[k]; g.moveTo(fx(pl[0]), fy(pl[1])); for (j = 2; j < pl.length; j += 2) g.lineTo(fx(pl[j]), fy(pl[j + 1])); return; }
  g.moveTo(ax, ay);
  if (L === 0) {
    var fa = RF[a], fb = RF[b], ka = fa === fb ? 0.66 : 0.4;
    g.bezierCurveTo(cam.cx + RRING * ka * Math.cos(GA[fa]), cam.cy + RRING * ka * Math.sin(GA[fa]), cam.cx + RRING * ka * Math.cos(GA[fb]), cam.cy + RRING * ka * Math.sin(GA[fb]), bx, by); return;
  }
  if (L === 2 && RF[a] !== RF[b]) { var dx = bx - ax, dy = by - ay; g.quadraticCurveTo((ax + bx) / 2 - dy * 0.2, (ay + by) / 2 + dx * 0.2, bx, by); return; }
  g.lineTo(bx, by);
}
function hitWords(x0, y0, x1, y1) { for (var q = 0; q < words.length; q++) { var o = words[q]; if (!(x1 < o[0] || x0 > o[2] || y1 < o[1] || y0 > o[3])) return true; } return false; }
/* the rim's names: most played first, as many as fit without touching, off the card, the rail and the key */
function rimLabels(g) {
  var acc = [], k, n = 0, cap = phone ? 40 : 120, rr = RRING + 12, sel = S.rim, list = sel >= 0 ? [sel].concat(rimOrder) : rimOrder;
  for (k = 0; k < list.length && n < cap; k++) {
    var rk = list[k]; if (k > 0 && rk === sel) continue;
    var big = n < (phone ? 4 : 10) || rk === sel, fs = phone ? (big ? 12 : 10.5) : (big ? 12 : 9.5), need = fs * 1.2 / rr, ok = true, j, a = RA[rk];
    for (j = 0; j < acc.length && ok; j++) { var dA = Math.abs(a - acc[j][0]); dA = Math.min(dA, 6.2832 - dA); if (dA < (need + acc[j][1]) / 2) ok = false; }
    if (!ok) continue;
    var t = cut(RING[rk][1].toLowerCase(), phone ? 13 : 19); g.font = (big ? 600 : 500) + ' ' + fs + 'px ' + SANS;
    var tw = g.measureText(t).width, c = Math.cos(a), s2 = Math.sin(a), x1 = cam.cx + rr * c, y1 = cam.cy + rr * s2, x2 = cam.cx + (rr + tw) * c, y2 = cam.cy + (rr + tw) * s2;
    if (rk !== sel && (Math.min(x1, x2) < 2 || Math.max(x1, x2) > W - 2 || Math.min(y1, y2) < 2 || Math.max(y1, y2) > H - 2 || hitWords(Math.min(x1, x2) - 3, Math.min(y1, y2) - 3, Math.max(x1, x2) + 3, Math.max(y1, y2) + 3))) continue;
    acc.push([a, need]); n++;
    rimName(g, rk, rk === sel ? MINT : big ? INK : '#bdb4d6', fs, big ? 600 : 500, t, rr);
  }
}
/* the curve radio: a freehand path, smoothed (Catmull-Rom); in the field its depth comes from the speed of the drag (fast = deeper) */
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
/* a curve is stored in field coordinates: offsets from the camera center in units of the camera radius, the same frame the dots are projected in,
   so zoom, pan, the radio glide and a resize move it exactly as they move the dots */
function lineXY(L, p, out) { var r = cam.r * dolly; out[0] = cam.cx + p[0] * r; out[1] = cam.cy + p[1] * r; }
function curve(raw) {
  var pts = [raw[0]], k, j, q;
  for (k = 1; k < raw.length; k++) { q = pts[pts.length - 1]; if (Math.hypot(raw[k][0] - q[0], raw[k][1] - q[1]) >= 6) pts.push(raw[k]); }
  if (pts.length < 2) pts.push(raw[raw.length - 1]);
  var sp = pts.map(function (p, i) { var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; return Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(1, b[2] - a[2]); });
  var sd = function (v) { return clamp01((v - 0.25) / 1.6); }, out = [];
  for (k = 0; k < pts.length - 1; k++) {
    var p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
    for (j = 0; j < 6; j++) {
      var t = j / 6, t2 = t * t, t3 = t2 * t, xy = [0, 0], c;
      for (c = 0; c < 2; c++) xy[c] = 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3);
      out.push([xy[0], xy[1], sd(sp[k] + (sp[k + 1] - sp[k]) * t)]);
    }
  }
  q = pts[pts.length - 1]; out.push([q[0], q[1], sd(sp[sp.length - 1])]);
  var deep = isField(scene), fr = cam.r * dolly;
  for (k = 0; k < out.length; k++) { out[k][0] = (out[k][0] - cam.cx) / fr; out[k][1] = (out[k][1] - cam.cy) / fr; }
  S.line = { c: out, scene: scene, k: 0, stops: [], cam: deep, follow: deep };
  S.trail = []; S.tn = []; S.sn = 0; S.like.seq = null;
  restop(S.line);
  if (!S.line.stops.length) { S.line = null; return; }
  play(S.line.stops[0], 'stop');
}
function depthAt(L, p) { return clamp01(p[2] + S.zb); }
function restop(L) {
  var c = L.c, len = 0, k, acc = [0], o = [0, 0], o2 = [0, 0];
  for (k = 1; k < c.length; k++) { lineXY(L, c[k - 1], o); lineXY(L, c[k], o2); len += Math.hypot(o2[0] - o[0], o2[1] - o[1]); acc.push(len); }
  var n = Math.max(3, Math.min(9, Math.round(len / 70))), stops = [], seen = {}, j = 0;
  for (k = 0; k < n; k++) {
    var s = len * k / (n - 1); while (j < c.length - 2 && acc[j + 1] < s) j++;
    var u = acc[j + 1] > acc[j] ? (s - acc[j]) / (acc[j + 1] - acc[j]) : 0, pa2 = c[j], pb2 = c[Math.min(c.length - 1, j + 1)];
    var pt = [pa2[0] + (pb2[0] - pa2[0]) * u, pa2[1] + (pb2[1] - pa2[1]) * u, pa2[2] + (pb2[2] - pa2[2]) * u];
    lineXY(L, pt, o);
    var i = pick(o[0], o[1], L.cam ? depthAt(L, pt) : -1, seen); if (i >= 0) { seen[i] = 1; stops.push(i); }
  }
  L.stops = stops; L.k = 0;
}
function pick(x, y, d, seen) {
  var best = -1, bd = Infinity, R2 = phone ? 56 : 48, i;
  for (i = 0; i < N; i++) {
    if (SA[i] < 0.3 || seen[i]) continue;
    if (KB && SX[i] >= KB.x && SX[i] <= KB.x + KB.w && SY[i] >= KB.y && SY[i] <= KB.y + KB.h) continue;
    var dx = SX[i] - x, dy = SY[i] - y, q = dx * dx + dy * dy; if (q > R2 * R2) continue;
    if (d >= 0) { var dz = (ZD[i] - d) * 70; q += dz * dz; }
    if (q < bd) { bd = q; best = i; }
  }
  return best;
}
/* the 2D sound map's three nearest per artist (the threads of the maps act, both sizes) */
function knn2() {
  if (KNN2) return; KNN2 = []; NB2 = [];
  var i, k, xy = F.xy;
  for (i = 0; i < N; i++) {
    var b = [[-1, 1e12], [-1, 1e12], [-1, 1e12]], x = xy[i][0], y = xy[i][1];
    for (k = 0; k < N; k++) { if (k === i) continue; var dx = xy[k][0] - x, dy = xy[k][1] - y, d = dx * dx + dy * dy; if (d < b[2][1]) { b[2] = [k, d]; b.sort(function (p, q) { return p[1] - q[1]; }); } }
    NB2.push([b[0][0], b[1][0], b[2][0]]);
    for (k = 0; k < 3; k++) if (b[k][0] > i || NB2[b[k][0]].indexOf(i) < 0) KNN2.push(i, b[k][0]);
  }
}
/* sounds like: the six nearest to a tapped artist in the 2D sound map (CLAP), lit in ice, heard in turn */
function likeFrom(i) {
  var a = F.xy[i], best = [], k;
  for (k = 0; k < N; k++) { if (k === i) continue; var dx = F.xy[k][0] - a[0], dy = F.xy[k][1] - a[1]; best.push([k, dx * dx + dy * dy]); }
  best.sort(function (p, q) { return p[1] - q[1]; });
  S.like.seq = [i].concat(best.slice(0, 6).map(function (b) { return b[0]; })); S.like.k = 0; S.line = null; S.mode = '';
  /* the six sit close in sound: zoom until they spread to about a thumb's width, the tapped one in the middle */
  layout(performance.now()); var far = 1; for (k = 1; k < S.like.seq.length; k++) far = Math.max(far, Math.hypot(SX[S.like.seq[k]] - SX[i], SY[S.like.seq[k]] - SY[i]));
  var zt = Math.min(8, Math.max(1, view.z * (phone ? 70 : 110) / far)); if (zt > view.z * 1.05) zoomAt(SX[i], SY[i], zt / view.z);
  layout(performance.now()); view.px += cam0.cx - SX[i]; view.py += cam0.cy - SY[i]; clampView(); pathsDirty = true;
  text('#m-mode', 'you are hearing ' + names[i] + ', then the six artists nearest to it in sound, one after another.'); say('the six nearest in sound, one after another.', 'now');
  play(i, 'like');
}
/* a crisp outline around a room: the convex hull of its points on screen (monotone chain) */
function hull(pts) {
  pts.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }, lo = [], up = [], i;
  for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop(); lo.push(pts[i]); }
  for (i = pts.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop(); up.push(pts[i]); }
  lo.pop(); up.pop(); return lo.concat(up);
}

/* ---------- drawing ---------- */
var pathsDirty = true;
function dot(g, x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }
/* a point is two crisp discs: a wide dim one of the same hue (additive, so crowds brighten) and a sharp core */
/* organic crisp pebbles: one irregular rounded outline per artist, seeded by its index, cached at unit radius */
var PEB = [];
function pebPath(i) {
  var r = rng(i * 7919 + 17), n = 7 + Math.floor(r() * 3), k, a, rr, pts = [], p = new Path2D(), mx, my;
  for (k = 0; k < n; k++) { a = k / n * 6.2832 + r() * 0.5; rr = 0.78 + r() * 0.3; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  mx = (pts[n - 1][0] + pts[0][0]) / 2; my = (pts[n - 1][1] + pts[0][1]) / 2; p.moveTo(mx, my);
  for (k = 0; k < n; k++) { var q = pts[(k + 1) % n]; p.quadraticCurveTo(pts[k][0], pts[k][1], (pts[k][0] + q[0]) / 2, (pts[k][1] + q[1]) / 2); }
  p.closePath(); return p;
}
function peb(g, i, x, y, r, fill, a) {
  if (r < 1.6 || typeof Path2D === 'undefined') return dot(g, x, y, r, fill);
  var p = PEB[i] || (PEB[i] = pebPath(i)); r *= 1.12;
  g.fillStyle = fill; g.translate(x, y); g.scale(r, r); g.fill(p);
  /* a rim and one highlight once a mark is big enough to carry them: the point reads as a thing, not a dab */
  if (r >= 3.2) { g.lineWidth = 0.9 / r; g.strokeStyle = 'rgba(6,1,15,.5)'; g.stroke(p); if (a === undefined) a = 1; g.fillStyle = 'rgba(255,255,255,' + (0.26 * a).toFixed(3) + ')'; g.beginPath(); g.ellipse(-0.28, -0.34, 0.34, 0.22, -0.7, 0, 6.2832); g.fill(); }
  g.scale(1 / r, 1 / r); g.translate(-x, -y);
}
function halo(g, x, y, r, col, a) { g.fillStyle = col; g.globalAlpha = (phone ? 0.16 : 0.13) * a; g.beginPath(); g.arc(x, y, r * (phone ? 2.1 : 2.4) + 1, 0, 6.2832); g.fill(); }
function cuts3(a) { var b = a.slice().sort(function (p, q) { return p - q; }), n = b.length; return n ? [b[Math.floor(n * 0.6)], b[Math.floor(n * 0.88)]] : [0, 0]; }
function step3(w, T) { return w >= T[1] ? 2 : w >= T[0] ? 1 : 0; }
var LW3 = [0.8, 1.9, 3.4];
function star(g, x, y, r, fill) { var k, a, rr; g.fillStyle = fill; g.beginPath(); for (k = 0; k < 8; k++) { a = -1.5708 + k * 0.7854; rr = k % 2 ? r * 0.38 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function mark(g, x, y, r) { if (!phone) ring(g, x, y, r + 8, 'rgba(255,211,107,.22)', 1); star(g, x, y, r, GOLD); if (!phone || scene === C_RECORD) ring(g, x, y, r + 3.5, 'rgba(255,211,107,.8)', 1); }
function ring(g, x, y, r, stroke, lw) { g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke(); }

/* ---------- the key: a solid plate on the canvas that says what a point, its size, its color and its lines mean in THIS act ---------- */
function sq(c) { return ['sq', c]; }
function ln(c) { return ['ln', c]; }
function bsq(n) { return ['bsq', n, ICE]; }
function stk(n, c) { return ['stk', n, c || ICE]; }
function gstar() { return ['star']; }
var SZK = ['fewer plays ', bsq(3), bsq(6), bsq(9), ' more plays'], THK = ['once ', ['wedge', ICE], ' often'];
function cut(t, n) { return t.length > n ? t.slice(0, n - 1) + '…' : t; }
function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function famRows() {
  var rows = [], cur = [], w = 0, mx = KMX, fs = phone ? 10.5 : 11.5;
  F.fam.forEach(function (nm) { var iw = 18 + nm.length * fs * 0.62 + 6; if (cur.length && w + iw > mx) { rows.push(cur); cur = []; w = 0; } cur.push(sq(FAMC[nm] || MUTE), nm + ' '); w += iw; });
  if (cur.length) rows.push(cur); return rows;
}
function colorRows(m) {
  var t, k;
  if (m === 'hood') return [['color = the room\u2019s main family']];
  if (m === 'hand') return [[['press'], 'my press ', ['shuf'], 'shuffle ', ['auto'], 'auto-play']];
  if (m === 'first') { t = ['early ']; for (k = 0; k < 8; k++) t.push(sq(FIRSTC[k])); t.push(' late'); return [t]; }
  return famRows();
}
function walkTok() {
  var L = S.line;
  if (L && scene === L.scene) return ['stops: ', sq(MINT), 'now ', sq(ICE), 'next'];
  if (S.like.seq && scene === C_MAPS) return [ln(ICE), 'six nearest in sound'];
  if (S.sn > 0 && (S.mode === 'queue' || S.mode === 'hand' || S.mode === 'log') && S.trail.length > 1 && scene !== C_HAND) return [ln(S.mode === 'queue' ? VIOLET : S.mode === 'log' ? ICE : MINT), 'the walk · numbers = steps'];
  if (S.now >= 0 && isField(scene)) return [ln(ICE), 'lines = its six nearest in sound'];
  return null;
}
var LNK = [ln(MINT), 'my press ', ln(VIOLET), 'auto-play ', ln('#bcb6cc'), 'both'];
function keyLines() {
  var L = [], m = S.color || 'family', w = walkTok(), k, na, nl, gc, cr = [];
  if (scene === C_COUNT) {
    L.push(SZK); L.push([sq(MINT), 'my press ', sq(AMBER), 'shuffle ', sq(VIOLET), 'auto-play']); L.push([gstar(), 'my songs']);
    if (w) L.push(w);
  } else if (scene === C_HAND) {
    L.push(SZK); L.push([ln(MINT), 'my press ', ln(VIOLET), 'auto-play']); L.push(THK);
    if (S.rim >= 0) L.push([cut(RING[S.rim][1].toLowerCase(), phone ? 18 : 26) + ': ' + RD[S.rim][0] + ' mint, ' + RD[S.rim][1] + ' violet']);
    else L.push([LOOKN[S.look]]);
    if (S.rt.length) L.push(['numbers = the walk, strongest line first']);
  } else if (scene === C_MAPS) {
    L.push(SZK); cr = colorRows(m); for (k = 0; k < cr.length; k++) L.push(cr[k]);
    if (S.mb < 0.5) L.push([ln(ICE), 'nearest in sound']); else { L.push(LNK); L.push(THK); }
    if (!MAPS) L.push(['loading…']);
    else if (S.grow) {
      gc = S.grow.c || 0; na = 0; nl = 0; var nq = 0;
      for (k = 0; k < N; k++) if (F.y0[k] < gc) na++;
      for (k = 0; k < MAPS.lp.length; k++) if (MAPS.lp[k][3] < gc) nl++;
      for (k = 0; k < MAPS.lq.length; k++) if (MAPS.lq[k][3] < gc) nq++;
      L.push([num(na) + ' artists · ' + nl + ' mint · ' + nq + ' violet' + (S.grow.done ? '' : ' …')]);
    } else if (w) L.push(w);
  } else if (scene === C_HOODS && MAPS) {
    L.push(SZK); cr = colorRows(m); for (k = 0; k < cr.length; k++) L.push(cr[k]);
    if (S.grow && !S.grow.done && S.grow.hood) {
      gc = S.grow.c || 0; na = 0; nl = 0;
      for (k = 0; k < N; k++) if (F.y0[k] < gc) na++;
      for (k = 0; k < MAPS.le.length; k++) if (MAPS.le[k][3] < gc) nl++;
      L.push([num(na) + ' artists · ' + num(nl) + ' lines']);
    } else if (w) L.push(w);
    else { L.push(THK); if (m === 'hood') L.push([['dash', ICE], 'across rooms']); }
  } else if (scene === C_KEEP) {
    L.push(['one dot = one song']); L.push([sq(MINT), 'my press ', sq(VIOLET), 'auto-play · bright = kept']);
  } else if (scene === C_CODA) {
    L.push(['one dot = 1 of 100 plays']); L.push([sq(MINT), 'my press ', sq(AMBER), 'shuffle ', sq(VIOLET), 'auto-play']); L.push(['top: frozen · bottom: newest']);
  } else if (scene === C_RECORD) {
    L.push([gstar(), 'my songs']); L.push(SZK);
  }
  return L;
}
function tokW(g, t) { return typeof t === 'string' ? g.measureText(t).width : t[0] === 'ln' || t[0] === 'dash' ? 22 : t[0] === 'wedge' ? 34 : t[0] === 'stk' ? 18 : t[0] === 'bsq' ? t[1] + 6 : t[0] === 'star' ? 18 : 14; }
var KW = null, KCv = null, KBt = null, KSig = '', KMX = 280, KCOL = {};
function keyBox(g) {
  var lines = keyLines(); if (!lines.length) return null;
  var fs = phone ? 11.5 : 12, lh = fs + 10, pad = 10, w = 0, i, j, lw;
  g.font = '500 ' + fs + 'px ' + MONO;
  for (i = 0; i < lines.length; i++) { lw = 0; for (j = 0; j < lines[i].length; j++) lw += tokW(g, lines[i][j]); if (lw > w) w = lw; }
  return { x: 0, y: 0, w: Math.ceil(w) + pad * 2, h: lines.length * lh + pad * 2 - 4, lines: lines, fs: fs, lh: lh, pad: pad };
}
/* the key lives in the act's own text panel, under the how line: never over the drawing, the controls or a tooltip */
function keySync() {
  if (!F || blend < 0.35) { if (KW) KW.hidden = true; return; }
  var act = $('#a-' + SCENES[scene]), plate = act && act.querySelector('.plate'); if (!plate) { if (KW) KW.hidden = true; return; }
  if (!KW) {
    KW = doc.createElement('div'); KW.id = 'kw'; KBt = doc.createElement('button'); KBt.type = 'button'; KBt.className = 'chip'; KBt.id = 'kb'; KBt.textContent = 'key'; KBt.setAttribute('aria-expanded', 'true');
    KCv = doc.createElement('canvas'); KCv.setAttribute('role', 'img'); KCv.setAttribute('aria-label', 'key to the picture');
    KBt.addEventListener('click', function () { KCOL[scene] = !KCOL[scene]; KSig = ''; keySync(); });
    KW.appendChild(KBt); KW.appendChild(KCv);
  }
  if (KW.parentNode !== plate) { var how = plate.querySelector('.how'), sub = plate.querySelector('.sub'); plate.insertBefore(KW, !phone && sub ? sub.nextSibling : how ? how.nextSibling : null); KSig = ''; }
  KW.hidden = false; KMX = Math.max(160, plate.clientWidth - 48);
  var g = KCv.getContext('2d'), b = keyBox(g); if (!b) { KW.hidden = true; return; }
  var sig = JSON.stringify(b.lines) + KMX + DPR + scene + (KCOL[scene] ? 'c' : 'o'); if (sig === KSig) return; KSig = sig;
  if (phone && KCOL[scene] === undefined) { KCOL[scene] = false; KCv.hidden = false; KCv.style.height = b.h + 'px'; KCOL[scene] = true; }
  KBt.hidden = !phone; KBt.setAttribute('aria-expanded', KCOL[scene] ? 'false' : 'true'); KCv.hidden = phone && !!KCOL[scene];
  KCv.width = Math.round(b.w * DPR); KCv.height = Math.round(b.h * DPR); KCv.style.width = b.w + 'px'; KCv.style.height = b.h + 'px';
  g.setTransform(DPR, 0, 0, DPR, 0, 0); drawKey(g, b);
}
function drawKey(g, b) {
  var i, j, t, x;
  g.fillStyle = 'rgba(18,10,34,.92)'; rrect(g, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 7); g.fill(); g.strokeStyle = LINE; g.lineWidth = 1; g.stroke();
  g.font = '500 ' + b.fs + 'px ' + MONO; g.textBaseline = 'middle'; g.textAlign = 'left';
  for (i = 0; i < b.lines.length; i++) {
    var y = b.y + b.pad + i * b.lh + b.lh / 2 - 2; x = b.x + b.pad;
    for (j = 0; j < b.lines[i].length; j++) {
      t = b.lines[i][j];
      if (typeof t === 'string') { g.fillStyle = i === 0 ? INK : '#d8d0ee'; g.fillText(t, x, y); x += g.measureText(t).width; }
      else if (t[0] === 'sq') { g.fillStyle = t[1]; g.beginPath(); g.arc(x + 5, y, 4.6, 0, 6.2832); g.fill(); x += 14; }
      else if (t[0] === 'press') { g.fillStyle = MINT; g.beginPath(); g.moveTo(x + 5, y - 5.4); g.quadraticCurveTo(x + 5, y, x + 10.4, y); g.quadraticCurveTo(x + 5, y, x + 5, y + 5.4); g.quadraticCurveTo(x + 5, y, x - .4, y); g.quadraticCurveTo(x + 5, y, x + 5, y - 5.4); g.fill(); x += 14; }
      else if (t[0] === 'auto') { g.strokeStyle = VIOLET; g.lineWidth = 1.6; g.beginPath(); g.arc(x + 5, y, 4, 0, 6.2832); g.stroke(); x += 14; }
      else if (t[0] === 'shuf') { g.fillStyle = AMBER; g.beginPath(); g.moveTo(x + 5, y - 5); g.lineTo(x + 9.5, y); g.lineTo(x + 5, y + 5); g.lineTo(x + .5, y); g.closePath(); g.fill(); x += 14; }
      else if (t[0] === 'bsq') { g.fillStyle = t[2]; rrect(g, x, y - t[1] / 2, t[1], t[1], t[1] * 0.4); g.fill(); x += t[1] + 6; }
      else if (t[0] === 'stk') { g.strokeStyle = t[2]; g.lineWidth = t[1]; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 15, y); g.stroke(); x += 18; }
      else if (t[0] === 'wedge') { g.fillStyle = t[1]; g.beginPath(); g.moveTo(x, y - 0.5); g.lineTo(x + 30, y - 2.6); g.lineTo(x + 30, y + 2.6); g.lineTo(x, y + 0.5); g.closePath(); g.fill(); x += 34; }
      else if (t[0] === 'dash') { g.strokeStyle = t[1]; g.lineWidth = 2; g.lineCap = 'round'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 19, y); g.stroke(); g.setLineDash([]); x += 22; }
      else if (t[0] === 'star') { mark(g, x + 6, y, 5); x += 18; }
      else { g.strokeStyle = t[1]; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 19, y); g.stroke(); x += 22; }
    }
  }
}
function rrect(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function badge(g, x, y, n, fill) {
  dot(g, x, y, 6.5, fill); g.font = '600 ' + (n > 9 ? 8 : 9) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = BG; g.fillText(String(n), x, y + 0.5); g.textAlign = 'left';
}
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
/* labels keep off the rail, the card, the drawer and the player on a desk */
var DOMW = ['.dots', '#b-deep', '#np', '.plate', '.dr', '#hint', '.top .brand', '.top .tr', '#zc', '#what'];
function domWords(now) {
  var DL = phone ? ['.top .brand', '.top .tr', '#zc', '#what', '#np'] : DOMW;
  if (domC && !domStale && now - domT < 160) return domC.slice();
  var out = [], sb = stage.getBoundingClientRect(), i, j, es, r;
  for (i = 0; i < DL.length; i++) {
    es = $$(DL[i]);
    for (j = 0; j < es.length; j++) { r = es[j].getBoundingClientRect(); if (r.width > 0 && r.bottom > sb.top && r.top < sb.bottom) out.push([r.left - sb.left - 4, r.top - sb.top - 4, r.right - sb.left + 4, r.bottom - sb.top + 4]); }
  }
  domC = out; domT = now; domStale = false;
  return out.slice();
}
function paint(now) {
  var g = ctx, i, k;
  g.setTransform(DPR, 0, 0, DPR, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, W, H);
  if (scene !== 1) { var gx, gy, gs = phone ? 24 : 30; g.fillStyle = 'rgba(188,211,255,.05)'; for (gy = gs; gy < H; gy += gs) for (gx = gs; gx < W; gx += gs) g.fillRect(gx, gy, 1, 1); }
  layout(now); words = domWords(now); DW = words.slice(); KB = null; keySync();
  if (scene === C_RECORD && blend >= 1 && FINR) DW.push(FINR); else if (scene !== C_RECORD) { FINR = null; FINH = 0; }
  var inRing = scene === 1 && blend >= 1, field = scene !== 1, grown = reveal >= 8;
  /* threads in the field (desk): the skeleton of the map, three nearest each */
  if (field && isField(scene) && blend >= 1 && grown) {
    g.lineWidth = phone ? 0.5 : 0.6; g.strokeStyle = 'rgba(189,211,255,' + (scene === C_RECORD ? 0.1 : 0.11) + ')'; g.beginPath();
    for (k = 0; k < KNN.length; k += 2) { i = KNN[k]; var j = KNN[k + 1]; g.moveTo(SX[i], SY[i]); g.lineTo(SX[j], SY[j]); }
    g.stroke();
  }
  /* the ring's lines in the chosen look: auto-play in violet under, my press in mint over */
  if (scene === 1 || (from === 1 && blend < 1)) {
    var la = scene === 1 ? blend : 1 - blend, hi = S.rim, lk = S.lookB < 1 ? -1 : S.look, pass, e2;
    if (S.lookB < 1) la *= 0.3;
    if (lk === 2 && RL && scene === 1) for (k = 0; k < RL.C.isl.length; k++) { var il = RL.C.isl[k]; ring(g, ix(il[1]), iy(il[2]), il[3] / 1000 * cam.r * 1.02 + 5, rgba(FAMC[F.fam[il[0]]] || MUTE, 0.28 * la), 1); }
    for (pass = 0; pass < 2; pass++) for (k = 0; k < EDG.length; k++) {
      e2 = EDG[k]; if (e2[3] !== pass || (pass === 0 && e2[5])) continue;
      var onE = hi >= 0 && (e2[0] === hi || e2[1] === hi), wE = e2[2] / 1000, tE = false, q4;
      for (q4 = 0; q4 < S.rt.length; q4++) if (S.rt[q4][0] === k) tE = true;
      var alE = tE ? 1 : hi < 0 ? 0.24 + 0.1 * e2[4] : onE ? 1 : 0.035;
      if (!tE && S.rt.length) alE *= phone ? 0.3 : 0.45;
      g.strokeStyle = rgba(pass ? (e2[5] ? AMBER : MINT) : VIOLET, alE * la); g.lineWidth = LW3[e2[4]] + (onE ? 0.8 : 0) + (tE ? (phone ? 3 : 2) : 0);
      g.beginPath(); edge(g, k, lk); g.stroke();
    }
    if (scene === 1 && blend >= 1 && S.rt.length) for (k = 0; k < S.rt.length; k++) { var rtE = EDG[S.rt[k][0]], rto = S.rt[k][1], rtc = rtE[3] ? (rtE[5] ? AMBER : MINT) : VIOLET; ring(g, RPX[rto], RPY[rto], phone ? 9 : 7, rtc, phone ? 2 : 1.5); badge(g, RPX[rto] - 9, RPY[rto] - 9, k + 1, rtc); }
    if (scene === 1 && blend >= 1) for (k = 0; k < RING.length; k++) {
      var fcol = FAMC[F.fam[RF[k]]] || MUTE;
      if (S.look === 0 && S.lookB >= 1) { var ca = Math.cos(RA[k]), sa2 = Math.sin(RA[k]); g.strokeStyle = fcol; g.lineWidth = phone ? 1.4 : 2; g.beginPath(); g.moveTo(cam.cx + (RRING + 4) * ca, cam.cy + (RRING + 4) * sa2); g.lineTo(cam.cx + (RRING + 9) * ca, cam.cy + (RRING + 9) * sa2); g.stroke(); }
      if (RING[k][0] < 0) { g.strokeStyle = fcol; g.lineWidth = 1; g.strokeRect(Math.round(RPX[k]) - 2.5, Math.round(RPY[k]) - 2.5, 5, 5); }
    }
  }
  /* the sound map's own skeleton: each artist to its 3 nearest in the 2D sound map, faint; it fades out as the dots fly to map two */
  if (scene === C_MAPS && blend >= 1 && S.mb < 0.99) {
    knn2(); g.lineWidth = 0.6; g.strokeStyle = 'rgba(189,211,255,' + (0.1 * (1 - S.mb)).toFixed(3) + ')'; g.beginPath();
    for (k = 0; k < KNN2.length; k += 2) { i = KNN2[k]; var j3 = KNN2[k + 1]; if (SA[i] > 0.01 && SA[j3] > 0.01) { g.moveTo(SX[i], SY[i]); g.lineTo(SX[j3], SY[j3]); } }
    g.stroke();
  }
  /* the two maps' lines: auto-play's runs in violet under, my press-to-press in mint over. they belong to map two (who followed whom):
     their alpha rides the fly (S.mb), so on the sound map, where a link can span the whole strip, they are not drawn at all */
  if (MAPS && S.mb > 0.01 && (scene === C_MAPS || (from === C_MAPS && blend < 1))) {
    var ma = (scene === C_MAPS ? blend : 1 - blend) * S.mb * (S.like.seq ? 0.35 : 1), hot = S.now >= 0 ? S.now : S.hover, LQ = MAPS.lq, LP = MAPS.lp, e, gcut = S.grow && scene === C_MAPS ? S.grow.c : 9, fl = S.fam;
    if (!MAPS.t3) { MAPS.t3 = { p: cuts3(LP.map(function (q) { return q[2]; })), q: cuts3(LQ.map(function (q) { return q[2]; })) }; var kp = {}, kq = {}; LP.forEach(function (q) { kp[Math.min(q[0], q[1]) + ',' + Math.max(q[0], q[1])] = 1; }); LQ.forEach(function (q) { kq[Math.min(q[0], q[1]) + ',' + Math.max(q[0], q[1])] = 1; }); LP.forEach(function (q) { q[4] = kq[Math.min(q[0], q[1]) + ',' + Math.max(q[0], q[1])] ? 1 : 0; }); LQ.forEach(function (q) { q[4] = kp[Math.min(q[0], q[1]) + ',' + Math.max(q[0], q[1])] ? 1 : 0; }); }
    var T3 = MAPS.t3, lists = [[LQ, T3.q, '139,111,214', 0], [LP, T3.p, '33,246,188', 1]], li, st3;
    for (li = 0; li < 2; li++) for (k = 0; k < lists[li][0].length; k++) {
      e = lists[li][0][k]; if (e[3] >= gcut || SA[e[0]] <= 0 || SA[e[1]] <= 0) continue;
      var onl = hot >= 0 && (e[0] === hot || e[1] === hot), dl = fl >= 0 && F.f[e[0]] !== fl && F.f[e[1]] !== fl ? 0.2 : 1, both = e[4] === 1; if (both && li === 0) continue;
      st3 = step3(e[2], lists[li][1]);
      g.strokeStyle = 'rgba(' + (both ? '188,182,204' : lists[li][2]) + ',' + ((hot < 0 ? 0.42 + 0.1 * st3 : onl ? 1 : 0.04) * ma * dl).toFixed(3) + ')'; g.lineWidth = LW3[st3] + (onl ? 0.8 : 0); g.beginPath(); g.moveTo(SX[e[0]], SY[e[0]]); g.lineTo(SX[e[1]], SY[e[1]]); g.stroke();
    }
  }
  /* the rooms: the graph's own edges (any hand), colored when both ends share the color key; a crisp hull around each of the eight */
  if (MAPS && scene === C_HOODS && blend >= 1) {
    var LE = MAPS.le, cmode = S.color || 'hood', hh = S.hoodHi, hot2 = S.now >= 0 ? S.now : S.hover, hcut = S.grow ? S.grow.c : 9;
    for (k = 0; k < LE.length; k++) {
      e = LE[k]; if (SA[e[0]] <= 0 || SA[e[1]] <= 0 || e[3] >= hcut) continue;
      var ka = keyOf(e[0], cmode), same = ka !== -1 && ka === keyOf(e[1], cmode), al = same ? 0.14 + 0.36 * e[2] / 1000 : 0.05, lit = hot2 >= 0 && (e[0] === hot2 || e[1] === hot2);
      if (S.fam >= 0 && F.f[e[0]] !== S.fam && F.f[e[1]] !== S.fam) al *= 0.2;
      if (hh >= 0 && !(MAPS.c[e[0]] === hh && MAPS.c[e[1]] === hh)) al *= 0.2;
      if (hot2 >= 0) al = lit ? 0.95 : al * 0.3;
      g.strokeStyle = rgba(same ? colorOf(e[0], cmode) : ICE, Math.min(1, lit ? al : al * 1.6 + (same ? 0.12 : 0))); g.lineWidth = LW3[e[2] >= 350 ? 2 : e[2] >= 210 ? 1 : 0] + (lit ? 0.8 : 0); g.beginPath(); g.moveTo(SX[e[0]], SY[e[0]]); g.lineTo(SX[e[1]], SY[e[1]]); g.stroke();
    }
    if (cmode === 'hood') {
      var hp = [], ci2, nh2 = Math.min(8, MAPS.cm.length);
      for (ci2 = 0; ci2 < nh2; ci2++) hp.push([]);
      for (k = 0; k < N; k++) { ci2 = MAPS.c[k]; if (ci2 >= 0 && ci2 < nh2 && SA[k] > 0.5) hp[ci2].push([SX[k], SY[k]]); }
      for (ci2 = 0; ci2 < nh2; ci2++) if (hp[ci2].length > 3 && hh === ci2) {
        var hu = hull(hp[ci2]), dimh = hh >= 0 && hh !== ci2; g.beginPath(); for (k = 0; k < hu.length; k++) { if (k) g.lineTo(hu[k][0], hu[k][1]); else g.moveTo(hu[k][0], hu[k][1]); } g.closePath();
        g.fillStyle = rgba(hoodCol(ci2), dimh ? 0.015 : 0.05); g.fill(); g.strokeStyle = rgba(hoodCol(ci2), dimh ? 0.15 : hh === ci2 ? 0.9 : 0.45); g.lineWidth = hh === ci2 ? 1.4 : 0.8; g.stroke();
      }
    }
  }
  var LKs = S.like.seq && scene === C_MAPS && blend >= 1 ? S.like.seq : null, LKo = {};
  if (LKs) { for (k = 0; k < LKs.length; k++) LKo[LKs[k]] = 1; g.strokeStyle = rgba(ICE, 0.85); g.lineWidth = 1; g.beginPath(); for (k = 1; k < LKs.length; k++) { g.moveTo(SX[LKs[0]], SY[LKs[0]]); g.lineTo(SX[LKs[k]], SY[LKs[k]]); } g.stroke(); }
  /* the artists */
  var tint = scene === 0 || (from === 0 && blend < 1 && scene !== 1), cmap = (scene === C_MAPS || scene === C_HOODS) ? (S.color || (scene === C_HOODS ? 'hood' : 'family')) : '';
  var pass2, inR = scene === 1 && blend >= 1;
  for (pass2 = 0; pass2 < 2; pass2++) {
    if (pass2 === 0) { if (inR) continue; g.globalCompositeOperation = 'lighter'; }
    for (k = 0; k < N; k++) {
      i = TOP[N - 1 - k]; var a = SA[i]; if (a <= 0.01 || SX[i] < -24 || SX[i] > W + 24 || SY[i] < -24 || SY[i] > H + 24) continue;
      var col = cmap ? colorOf(i, cmap) : inR ? FC[i] : tint ? HC[i] : FC[i];
      if (LKs && !LKo[i]) a *= 0.4;
      if (scene === C_RECORD && !isNb(i)) a *= 0.7;
      if (cmap && S.fam >= 0 && F.f[i] !== S.fam) a *= 0.18;
      if (cmap && S.hoodHi >= 0 && MAPS && MAPS.c[i] !== S.hoodHi) a *= 0.22;
      if (pass2 === 0) halo(g, SX[i], SY[i], SR[i] * (phone ? 1.25 : 1), col, a);
      else peb(g, i, SX[i], SY[i], SR[i] * (phone ? 1.25 : 1), a >= 0.99 ? col : dim(col, a), a);
    }
    if (pass2 === 0) { g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  }
  /* the songs: gold in the field */
  if (field && (scene === C_COUNT || scene === C_RECORD)) {
    var sp = [0, 0, 0], SPX = [], SPY = [];
    for (k = 0; k < SONG.length; k++) {
      var s = SONG[k].p; proj3(s[0] / 1000, s[1] / 1000, s[2] / 1000, sp); SPX.push(sp[0]); SPY.push(sp[1]);
      var nb = SNB[k]; g.strokeStyle = S.mine === k ? GOLD : scene === C_RECORD ? 'rgba(188,211,255,.5)' : 'rgba(188,211,255,.2)'; g.lineWidth = S.mine === k ? 1.6 : 1; g.beginPath(); g.moveTo(sp[0], sp[1]); g.lineTo(SX[nb], SY[nb]); g.stroke();
      mark(g, sp[0], sp[1], phone ? (scene === C_RECORD ? 6 : 5) : scene === C_RECORD ? 7.5 : 6.5);
      if (S.mine === k) ring(g, sp[0], sp[1], 13, GOLD, 1.5);
    }
    /* labels after every gold dot is down, and never on top of another gold dot */
    if (scene === C_RECORD) {
      var lfs = phone ? 10.5 : 11.5, lh2 = lfs * 0.75 + 2, lt, ltw, lc, lx, ly, lok, q2;
      g.font = '500 ' + lfs + 'px ' + MONO;
      for (k = 0; k < SONG.length; k++) {
        if (!(S.mine === k || k < (phone ? 4 : 8))) continue;
        lt = SONG[k].t.toLowerCase(); ltw = g.measureText(lt).width;
        lc = [[9, 0], [-9 - ltw, 0], [9, -14], [9, 14], [-9 - ltw, -14], [-9 - ltw, 14]];
        for (q2 = 0; q2 < lc.length; q2++) {
          lx = SPX[k] + lc[q2][0]; ly = SPY[k] + lc[q2][1]; lok = lx >= 2 && lx + ltw <= W - 2;
          for (var d2 = 0; lok && d2 < SONG.length; d2++) if (d2 !== k && SPX[d2] > lx - 7 && SPX[d2] < lx + ltw + 7 && SPY[d2] > ly - lh2 - 5 && SPY[d2] < ly + lh2 + 5) lok = false;
          if (lok) break;
        }
        if (lok) word(g, lx, ly, lt, lfs, 500, true, GOLD);
        else if (S.mine === k) word(g, SPX[k] + 9, SPY[k], lt, lfs, 500, true, GOLD);
      }
    }
  }
  /* the demo stroke: once the field is up and nothing has been touched, a curve draws itself and its stops light, so the radio needs no words */
  if (DEMO.on && (S.drag || S.line || S.now >= 0 || !isField(scene))) DEMO.on = false;
  if (!DEMO.on && DEMO.n < 2 && isField(scene) && reveal >= 8 && blend >= 1 && !S.line && S.now < 0 && !S.drag && DEMO.last && now - DEMO.last > (DEMO.n ? 30000 : 4500)) demoStart(now);
  if (DEMO.on) {
    var ddt = now - DEMO.t0, P0 = DEMO.a, du = Math.min(1, ddt / 2400);
    if (ddt > 6500) { DEMO.on = false; DEMO.last = now; }
    else {
      var ax0 = SX[P0[0]], ay0 = SY[P0[0]], bx0 = SX[P0[1]], by0 = SY[P0[1]], cx0 = SX[P0[2]], cy0 = SY[P0[2]], qx = 2 * bx0 - (ax0 + cx0) / 2, qy = 2 * by0 - (ay0 + cy0) / 2, dsteps = 48, px0 = ax0, py0 = ay0, tt, k2;
      g.strokeStyle = ICE; g.lineWidth = 2.4; g.setLineDash([]); g.beginPath();
      for (k2 = 0; k2 <= Math.floor(dsteps * du); k2++) { tt = k2 / dsteps; px0 = (1 - tt) * (1 - tt) * ax0 + 2 * (1 - tt) * tt * qx + tt * tt * cx0; py0 = (1 - tt) * (1 - tt) * ay0 + 2 * (1 - tt) * tt * qy + tt * tt * cy0; if (k2) g.lineTo(px0, py0); else g.moveTo(px0, py0); }
      g.stroke();
      ring(g, px0, py0, du < 1 ? 9 : 6, ICE, 2);
      for (k2 = 0; k2 < 3; k2++) if (du >= k2 / 2) { ring(g, SX[P0[k2]], SY[P0[k2]], 8, MINT, 1.6); badge(g, SX[P0[k2]] - 10, SY[P0[k2]] - 10, k2 + 1, MINT); }
      word(g, Math.max(8, Math.min(px0 + 14, W - (phone ? 300 : 360))), Math.min(H - 24, py0 + 22), du < 1 ? 'draw a curve like this' : 'a radio: each stop plays in turn. draw yours.', phone ? 11.5 : 13, 600, true, ICE, true);
    }
  }
  /* the curve and its stops */
  var L = S.line, lo = [0, 0], lo2 = [0, 0];
  if (L && scene === L.scene) {
    g.strokeStyle = 'rgba(188,211,255,.42)';
    for (k = 1; k < L.c.length; k++) { lineXY(L, L.c[k - 1], lo); lineXY(L, L.c[k], lo2); g.lineWidth = L.cam ? 2.8 - 2.2 * depthAt(L, L.c[k]) : 1; g.beginPath(); g.moveTo(lo[0], lo[1]); g.lineTo(lo2[0], lo2[1]); g.stroke(); }
    for (k = 0; k + 1 < L.stops.length; k++) { var sa = L.stops[k], sb = L.stops[k + 1]; g.strokeStyle = k < L.k ? dim(MINT, .55) : k === L.k ? MINT : ICE; g.lineWidth = k === L.k ? 2 : 1.4; g.beginPath(); g.moveTo(SX[sa], SY[sa]); g.lineTo(SX[sb], SY[sb]); g.stroke(); }
    for (k = 0; k < L.stops.length; k++) {
      i = L.stops[k]; var col2 = k < L.k ? dim(MINT, .55) : k === L.k ? MINT : ICE;
      ring(g, SX[i], SY[i], 7, col2, 1.5); badge(g, SX[i] - 10, SY[i] - 10, k + 1, col2);
      word(g, SX[i] + 11, SY[i], names[i], phone ? 10.5 : 11.5, 500, false, col2, k === L.k || k === L.k + 1);
    }
  }
  if (LKs) for (k = 0; k < LKs.length; k++) { i = LKs[k]; ring(g, SX[i], SY[i], k ? 6 : 8, k === S.like.k ? MINT : ICE, 1.3); if (i !== S.now) word(g, SX[i] + 9, SY[i], cut(names[i], 24), phone ? 10.5 : 11.5, 500, false, ICE, k === S.like.k + 1); }
  /* the depth dial (phone: two fingers up or down) */
  if (isField(scene) && (S.zb !== 0 || (S.pinch && S.pinch.mode === 'depth'))) {
    var dx0 = W - 16, dy0 = H * 0.3, dh = H * 0.3, dyz = dy0 + dh * (1 - (S.zb + 1) / 2);
    g.fillStyle = LINE; g.fillRect(dx0 - 1, dy0, 2, dh); g.fillStyle = ICE; g.fillRect(dx0 - 6, Math.round(dyz) - 1, 12, 3);
    g.font = '500 10px ' + MONO; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = MUTE; g.fillText('deep', dx0 - 8, dy0 + 5); g.fillText('near', dx0 - 8, dy0 + dh - 5); g.textAlign = 'left';
  }
  /* whose hand: the pair, 1 then 2, tied by a dashed ice line */
  if (S.wh && S.wh.pair && isField(scene)) {
    var wp = S.wh.pair;
    if (wp[0] >= 0 && wp[1] >= 0) { g.strokeStyle = ICE; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(SX[wp[0]], SY[wp[0]]); g.lineTo(SX[wp[1]], SY[wp[1]]); g.stroke(); g.setLineDash([]); }
    for (k = 0; k < 2; k++) if (wp[k] >= 0) { ring(g, SX[wp[k]], SY[wp[k]], 9, k ? MINT : ICE, 1.6); badge(g, SX[wp[k]] - 10, SY[wp[k]] - 10, k + 1, k ? MINT : ICE); if (wp[k] !== S.now) word(g, SX[wp[k]] + 12, SY[wp[k]], names[wp[k]], phone ? 11 : 12.5, 500, false, k ? MINT : ICE, true); }
  }
  /* now playing: a ring, its name, the six nearest */
  if (S.now >= 0 && SA[S.now] > 0.3) {
    var n0 = S.now;
    if (scene !== 1 && !LKs && !(scene === C_MAPS && S.mb >= 0.5)) { var nn = NN[n0]; for (k = 0; k < nn.length; k++) { var j2 = nn[k]; g.strokeStyle = 'rgba(188,211,255,' + (k < 2 ? '.85' : '.6') + ')'; g.lineWidth = k < 2 ? 1.8 : 1.1; g.beginPath(); g.moveTo(SX[n0], SY[n0]); g.lineTo(SX[j2], SY[j2]); g.stroke(); } }
    ring(g, SX[n0], SY[n0], 8, MINT, 2); word(g, SX[n0] + 12, SY[n0], names[n0], phone ? 11.5 : 13, 600, false, INK, true);
    if (S.trail.length > 1 && !(L && scene === L.scene)) {
      var tc = S.mode === 'queue' ? VIOLET : S.mode === 'log' ? ICE : MINT;
      g.strokeStyle = rgba(tc, 0.8); g.lineWidth = 2.2; g.beginPath(); for (k = 0; k < S.trail.length; k++) { i = S.trail[k]; if (k) g.lineTo(SX[i], SY[i]); else g.moveTo(SX[i], SY[i]); } g.stroke();
      if (S.mode === 'queue' || S.mode === 'hand' || S.mode === 'log') for (k = Math.max(0, S.trail.length - 8); k < S.trail.length; k++) { i = S.trail[k]; if (SA[i] > 0.3) badge(g, SX[i] - 9, SY[i] - 9, S.tn[k], k === S.trail.length - 1 ? MINT : tc); }
    }
  }
  if (S.hover >= 0 && S.hover !== S.now && SA[S.hover] > 0.3) { ring(g, SX[S.hover], SY[S.hover], 7, ICE, 1); word(g, SX[S.hover] + 11, SY[S.hover], names[S.hover], phone ? 10.5 : 11.5, 500, false, ICE); }
  /* the overture's count, then the big names, sized by rank */
  if (scene === 0 && blend >= 1 && !grown) {
    var heard = 0; for (k = 0; k < N; k++) if (F.y0[k] < reveal) heard++;
    g.font = '600 ' + (phone ? 36 : 68) + 'px ' + SANS; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (phone) { g.fillStyle = 'rgba(6,1,15,.82)'; g.fillRect(8, H - 36 - 34, Math.max(g.measureText(String(heard)).width + 20, 250), 70); }
    g.fillStyle = INK;
    /* under the what strip on every width: the strip is centered on desk and reaches the count's column below about 1300px */
    var we = document.getElementById('what'), wb = we ? we.offsetTop + we.offsetHeight : 0, wy = phone ? H - 36 - NBp : Math.max(110, wb + 64);
    g.fillText(String(heard).replace(/\B(?=(\d{3})+(?!\d))/g, ','), phone ? 14 : 220, wy);
    g.font = '500 ' + (phone ? 12 : 11.5) + 'px ' + MONO; g.fillStyle = MUTE;
    g.fillText('artists, in the order i first heard them', phone ? 14 : 222, wy + (phone ? 16 : 22));
  }
  if (scene === 0 && blend >= 1 && grown) for (k = 0; k < (phone ? 5 : 10); k++) { i = TOP[k]; if (i !== S.now && i !== S.hover) word(g, SX[i] + SR[i] + 6, SY[i], names[i], phone ? 14.5 - k * 0.6 : 22 - k * 1.1, k < 3 ? 600 : 500, false, INK); }
  /* the rooms: a numeral and the family that fills each, at its center; the color is the room */
  if (scene === C_HOODS && blend >= 1 && MAPS && !S.quiet) {
    var cx = [], cy2 = [], cn = [], ci, nh = MAPS.cm.length;
    for (ci = 0; ci < nh; ci++) { cx.push(0); cy2.push(0); cn.push(0); }
    for (k = 0; k < N; k++) { ci = MAPS.c[k]; if (ci >= 0 && ci < nh && SA[k] > 0.01) { cx[ci] += SX[k]; cy2[ci] += SY[k]; cn[ci]++; } }
    var cm2 = S.color || 'hood';
    for (ci = 0; ci < nh; ci++) if (cn[ci] && !(S.grow && !S.grow.done) && (S.hoodHi < 0 || S.hoodHi === ci) && (!phone || ci < 8 || S.hoodHi === ci)) {
      var lab = (ci + 1) + ' · mostly ' + F.fam[MAPS.cm[ci][1]], hx = cx[ci] / cn[ci] - (phone ? 10 : 34), hy = cy2[ci] / cn[ci], sub = MAPS.cm[ci][0] + ' artists · auto-play took ' + Math.round(MAPS.cm[ci][2] / 10) + ' of 100 steps inside';
      /* a lit room on a phone: the two lines sit at the bottom left of the stage, clear of the dots and inside the screen */
      if (phone && S.hoodHi === ci) { sub = MAPS.cm[ci][0] + ' artists · auto-play ' + Math.round(MAPS.cm[ci][2] / 10) + ' of 100 steps'; hx = 12; hy = H - 96; }
      word(g, hx, hy, lab, phone ? 11 : 15, 600, true, hoodCol(ci), S.hoodHi === ci);
      if (S.hoodHi === ci) word(g, hx, hy + (phone ? 15 : 17), sub, phone ? 10 : 10.5, 500, true, MUTE, S.hoodHi === ci);
    }
    if (!phone) for (k = 0; k < 8; k++) { i = TOP[k]; if (i !== S.now && i !== S.hover && SA[i] > 0.5) word(g, SX[i] + SR[i] + 4, SY[i], names[i], 11, 500, false, INK); }
  }
  if (scene === C_MAPS && blend >= 1 && MAPS && S.mb >= 0.99 && !phone && !(S.grow && !S.grow.done)) for (k = 0; k < 10; k++) { i = TOP[k]; if (i !== S.now && i !== S.hover && SA[i] > 0.5) word(g, SX[i] + SR[i] + 4, SY[i], names[i], 11, 500, false, ICE); }
  if (inRing && S.lookB >= 1) {
    if (S.look === 0) rimLabels(g);
    else {
      if (S.look === 2 && RL) for (k = 0; k < RL.C.isl.length; k++) { var il2 = RL.C.isl[k], ir = il2[3] / 1000 * cam.r * 1.02 + 5; word(g, ix(il2[1]) - 20, iy(il2[2]) - ir - 9, F.fam[il2[0]], phone ? 9.5 : 10.5, 500, true, FAMC[F.fam[il2[0]]] || MUTE); }
      if (S.rim >= 0) word(g, RPX[S.rim] + 8, RPY[S.rim], RING[S.rim][1].toLowerCase(), phone ? 11.5 : 13, 600, false, MINT, true);
      for (k = 0; k < (phone ? 6 : 18); k++) { var rk2 = rimOrder[k]; if (rk2 !== S.rim) word(g, RPX[rk2] + 7, RPY[rk2], cut(RING[rk2][1].toLowerCase(), 20), k < 5 ? (phone ? 11 : 12) : (phone ? 9.5 : 10.5), k < 5 ? 600 : 500, false, k < 5 ? INK : '#cfc6e8'); }
    }
  }
  /* the pips: the keep grid and the hold-out rows */
  if ((scene === C_KEEP || scene === C_CODA) && blend >= 1) pips(g);
  if (S.game && S.game.on) countdown(g, now);
  if (scene === C_RECORD && blend >= 1) finale(g, now);
  clDraw(g);
}
/* the last word, drawn on the picture: the question the front opened with, answered as far as one log can */
var FIN = ['so, is my taste my own?', 'one log cannot settle it. it points one way:', 'my press crosses a family a little more often,', 'and what i press, i keep.', 'the 23 songs in gold are what i made from it; they sit between the rooms.'];
function finale(g, now) {
  if (!S.finT0) { S.finT0 = now + 900; dirty = true; }
  var a = Math.min(1, Math.max(0, (now - S.finT0) / 1800)); if (a <= 0) { dirty = true; return; }
  if (a < 1) dirty = true;
  var x0 = leftCol(), cx = x0 + (W - x0) / 2, big = phone ? Math.min(27, (W - 40) / 12) : Math.min(54, (W - x0 - 80) / 13), mid = phone ? 13 : 18, sm = phone ? 10.5 : 13, gap = phone ? 4 : 10;
  var hs = [big, mid, mid, mid, sm], tot = 0, k; for (k = 0; k < hs.length; k++) tot += hs[k] * 1.25 + gap; tot -= gap;
  var y = phone ? H - NBp - 22 - tot : H - 60 - tot, ya = y; FINH = Math.round(tot + 30 + (phone ? 8 : 40)); if (!phone) cx = x0 + (W - x0 - 300) / 2;
  g.save(); g.globalAlpha = a * 0.84; g.fillStyle = BG; g.fillRect(x0 + 8, y - 16, (phone ? W : W - 300) - x0 - 16, tot + 30); g.restore();
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'top';
  for (k = 0; k < FIN.length; k++) { g.font = (k === 0 ? 600 : k === 2 || k === 3 ? 600 : 400) + ' ' + hs[k] + 'px ' + SANS; g.fillStyle = k === 2 || k === 3 ? MINT : k === 4 ? GOLD : k === 0 ? INK : '#cfc7e8'; var line = FIN[k]; if (k === 2 && phone) line = 'my press crosses a family a little more often,'; while (g.measureText(line).width > (phone ? W - 32 : W - x0 - 340) && hs[k] > 9) { hs[k] -= 1; g.font = (k === 0 ? 600 : 400) + ' ' + hs[k] + 'px ' + SANS; } g.fillText(line, cx, ya); ya += hs[k] * 1.25 + gap; }
  g.restore();
  FINR = [x0 + 8, y - 16, (phone ? W : W - 300) - 8, y + tot + 14];
}
var rimOrder = [];
function rimName(g, k, col, fs, w, t, rr) {
  var a = RA[k], o = [cam.cx + rr * Math.cos(a), cam.cy + rr * Math.sin(a)];
  var rot = a, right = Math.cos(a) >= 0;
  g.save(); g.translate(o[0], o[1]); g.rotate(right ? rot : rot + Math.PI); g.font = w + ' ' + fs + 'px ' + SANS; g.textBaseline = 'middle'; g.textAlign = right ? 'left' : 'right';
  var tw = g.measureText(t).width;
  g.fillStyle = BG; g.fillRect(right ? -2 : -tw - 2, -fs * 0.75, tw + 4, fs * 1.5); g.fillStyle = col; g.fillText(t, 0, 0); g.restore();
}
function isNb(i) { for (var k = 0; k < SNB.length; k++) if (SNB[k] === i) return true; return false; }
/* two rows of 100 points: what i pressed, what auto-play chose; lit = kept (42, 16). scene 3: the frozen export vs the newest months (shuffle 17 to 1.5, auto-play 64 to 75) */
function pipXY(row, i) { var c = i % PG.cols, r = (i / PG.cols) | 0; return [PG.x0 + c * PG.cell + PG.cell / 2, PG.y0 + row * (PG.bh + PG.gap) + r * PG.cell + PG.cell / 2, PG.cell * 0.6]; }
function wbox(x0, y0, x1, y1) { words.push([x0 - 3, y0 - 3, x1 + 3, y1 + 3]); }
function pips(g) {
  var rows = scene === C_KEEP ? [['my press', 42, MINT], ['auto-play', 16, VIOLET]] : [['the frozen export, of 100 plays', [19, 17, 64]], ['the newest months, of 100 plays', [0, 1.5, 75]]];
  var lit = 1; if (scene === C_KEEP) { if (!S.keepT0) S.keepT0 = performance.now(); lit = reduce ? 1 : ease((performance.now() - S.keepT0) / 1800); }
  var xl = phone || !html.classList.contains('drawer') ? 0 : leftCol(), cols = phone ? 20 : 25, cell = Math.min((W - xl - 60) / cols, phone ? 10 : 16), rowsN = 100 / cols, bh = rowsN * cell, gap = phone ? 44 : 56;
  var x0 = Math.round(xl + (W - xl - cols * cell) / 2), y0 = Math.round(cam.cy - (rows.length * bh + gap) / 2 - (phone ? 30 : 0)), r = cell * 0.3, k, i, c, rr, fs = phone ? 10.5 : 12, tw;
  if (phone) { var we = document.getElementById('what'); if (we) y0 = Math.max(y0, we.offsetTop + we.offsetHeight + 26); }
  PG = { x0: x0, y0: y0, cell: cell, bh: bh, gap: gap, cols: cols, rx: 0, ry: 0 };
  for (k = 0; k < rows.length; k++) {
    var y = y0 + k * (bh + gap);
    g.font = '500 ' + fs + 'px ' + MONO; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillStyle = INK; g.fillText(rows[k][0], x0, y - 8); wbox(x0, y - 8 - fs * 1.2, x0 + g.measureText(rows[k][0]).width, y - 8);
    for (i = 0; i < 100; i++) {
      c = i % cols; rr = (i / cols) | 0; var x = x0 + c * cell + cell / 2, yy = y + rr * cell + cell / 2, col;
      if (scene === C_KEEP) col = i < Math.round(rows[k][1] * lit) ? rows[k][2] : dim(rows[k][2], .22);
      else {
        /* the newest months: my share was not re-judged (faint), then shuffle 1.5, then auto-play 75, so auto-play row holds 75 points */
        var h = rows[k][1], me = k === 1 ? 100 - Math.round(h[1]) - h[2] : h[0];
        var sh = Math.round(h[1]), half = (h[1] % 1 !== 0) && i === me + sh - 1;
        col = i < me ? (k === 1 ? null : MINT) : i < me + sh ? (half ? dim(AMBER, .5) : AMBER) : i < me + sh + h[2] ? VIOLET : dim(ICE, .25);
      }
      if (col === null) { g.beginPath(); g.arc(x, yy, Math.max(1, r - .7), 0, 6.2832); g.strokeStyle = MINT; g.lineWidth = 1; g.stroke(); }
      else dot(g, x, yy, r, col);
    }
    wbox(x0, y, x0 + cols * cell, y + bh);
    g.textBaseline = 'top'; g.fillStyle = MUTE;
    var cap = scene === C_KEEP ? (rows[k][1] + ' of 100 kept') : (k === 0 ? 'my press 19 · shuffle 17 · auto-play 64' : 'shuffle 1.5 · auto-play 75 · the rest: my press, not re-judged here');
    if (phone && cap.indexOf(' · the rest') > 0) { var c2 = cap.split(' · the rest'); c2 = [c2[0], 'the rest' + c2[1]]; } else c2 = [cap];
    tw = Math.max.apply(null, c2.map(function (q) { return g.measureText(q).width; })); var cx = Math.max(8, Math.min(x0, W - tw - 8));
    for (var ci = 0; ci < c2.length; ci++) g.fillText(c2[ci], cx, y + bh + 6 + ci * fs * 1.35); wbox(cx, y + bh + 6, cx + tw, y + bh + 6 + fs * 1.3 * c2.length);
    if (scene === C_KEEP) { g.font = '600 ' + (phone ? 22 : 30) + 'px ' + SANS; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillStyle = rows[k][2]; var nt = String(Math.round(rows[k][1] * lit)); g.fillText(nt, x0 + cols * cell, y - 6); wbox(x0 + cols * cell - g.measureText(nt).width, y - 6 - (phone ? 22 : 30), x0 + cols * cell, y - 6); }
  }
  /* the first hearing: a 60 second ruler; the like lands at 47 seconds (median) */
  if (scene === C_KEEP && lit >= 1) {
    var ry = y0 + rows.length * (bh + gap) - gap + (phone ? 40 : 52), rw = cols * cell, t;
    g.strokeStyle = LINE; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, ry); g.lineTo(x0 + rw, ry); g.stroke();
    g.font = '500 ' + (phone ? 10 : 11) + 'px ' + MONO; g.textBaseline = 'top'; g.fillStyle = MUTE;
    for (t = 0; t <= 60; t += 10) { var tx = x0 + rw * t / 60; g.strokeStyle = t % 30 ? LINE : MUTE; g.beginPath(); g.moveTo(tx, ry - (t % 30 ? 3 : 5)); g.lineTo(tx, ry + (t % 30 ? 3 : 5)); g.stroke(); if (t === 0 || t === 60) { g.textAlign = t ? 'right' : 'left'; g.fillText(t + ' s', tx, ry + 8); } }
    var mx = x0 + rw * 47 / 60, rl = phone ? '47 s: the like lands' : '47 s in: the like lands, on the first hearing', rlx = Math.min(Math.max(mx, x0 + 90), x0 + rw - 90);
    dot(g, mx, ry, phone ? 4 : 5, MINT); g.fillStyle = MINT; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(rl, rlx, ry - 10);
    tw = g.measureText(rl).width; wbox(rlx - tw / 2, ry - 10 - 14, rlx + tw / 2, ry + 22); PG.rx = mx; PG.ry = ry;
  }
  g.textAlign = 'left';
}
function countdown(g, now) {
  var G = S.game, left = Math.max(0, G.until - now), fr = left / 47000, cx = phone ? W - 44 : W - 70, cy = phone ? 44 : 70, r = phone ? 24 : 36;
  ring(g, cx, cy, r, LINE, 3); g.strokeStyle = MINT; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 6.2832 * fr); g.stroke();
  g.font = '600 ' + (phone ? 13 : 16) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(Math.ceil(left / 1000), cx, cy);
}

/* ---------- callouts: the card's sentences, one at a time, each tied by a one-pixel leader to the thing it names ----------
   the sentences live in the template (each act's ol.cl, read by screen readers too); the anchors come from this frame's geometry */
var ACC = [ICE, MINT, ICE, VIOLET, MINT, AMBER, GOLD], CLMS = 4000;
var CL = { list: null, k: -1, sc: -1, to: 0, one: null, at: {} };
var LOOKS = ['straight: names on the rim, grouped by family; straight lines inside.', 'gathered: lines that share a road are pulled together.', 'islands: one per family; a curve crosses families.', 'arcs: my press above in mint, auto-play below.'];
var NSAY = { hood: 'colored by room: drawn from what followed what alone.', family: 'colored by family; no room was told a family.', first: 'colored by first heard, in eight cuts of the log.' };
function clItems(sc) {
  var act = document.getElementById('a-' + SCENES[sc]), v = String(S.mt); if (!act) return [];  /* by id: the opener is a .act with no scene, so an index would be off by one */
  return Array.prototype.slice.call(act.querySelectorAll('.cl li')).filter(function (li) { var d = li.getAttribute('data-v'); return d === null || sc !== C_MAPS || d === v; }).map(function (li) { return { t: li.textContent, at: li.getAttribute('data-at') }; });
}
function tmLabel() {
  var on = !!(CL.list && CL.k >= 0), s = on ? 'point it out · ' + (CL.k + 1) + ' of ' + CL.list.length : 'point it out';
  $$('[data-tm]').forEach(function (b) { if (b.textContent !== s) b.textContent = s; b.classList.toggle('on', on); });
}
function clReady() {
  if (blend < 1 || S.drag || S.pinch) return false;
  if (scene === C_COUNT && reveal < 8) return false;
  if (scene === C_HOODS && (!MAPS || (S.grow && !S.grow.done))) return false;
  if (scene === C_MAPS && (S.mb !== S.mt || (S.mt === 1 && !MAPS) || (S.grow && !S.grow.done))) return false;
  if (scene === C_HAND && S.lookB < 1) return false;
  if (scene === C_KEEP && (!S.keepT0 || performance.now() - S.keepT0 < 1900)) return false;
  return true;
}
function clStop() { clearTimeout(CL.to); var had = CL.list || CL.one; CL.list = null; CL.k = -1; CL.one = null; tmLabel(); if (had) wake(); }
function clStart(delay) {
  clearTimeout(CL.to); CL.one = null; CL.at = {}; CL.sc = scene; CL.list = clItems(scene); CL.k = -1;
  if (!CL.list.length) { CL.list = null; tmLabel(); return; }
  tmLabel(); CL.to = setTimeout(clStep, delay || 0);
}
function clStep() {
  if (!CL.list || CL.sc !== scene) { CL.list = null; CL.k = -1; tmLabel(); return; }
  if (!clReady()) { CL.to = setTimeout(clStep, 400); return; }
  CL.k++;
  if (CL.k >= CL.list.length) { CL.list = null; CL.k = -1; tmLabel(); wake(); return; }
  tmLabel(); wake(); CL.to = setTimeout(clStep, CLMS);
}
/* one callout for a press of a chip: it replaces the sequence and leaves after the same 4 s */
function say(t, at) {
  clearTimeout(CL.to); CL.list = null; CL.k = -1; CL.at = {}; CL.one = { t: t, at: at, sc: scene }; tmLabel(); wake();
  CL.to = setTimeout(function () { CL.one = null; wake(); }, CLMS + 500);
}
function inDW(x, y) {
  if (x < 8 || x > W - (phone ? 40 : 8) || y < (phone ? Math.max(56, WBp) : 8) || y > H - 8 - NBp) return true;
  for (var q = 0; q < DW.length; q++) { var o = DW[q]; if (x >= o[0] && x <= o[2] && y >= o[1] && y <= o[3]) return true; }
  return false;
}
function inW(x, y) { if (inDW(x, y)) return true; for (var q = 0; q < words.length; q++) { var o = words[q]; if (x >= o[0] - 4 && x <= o[2] + 4 && y >= o[1] - 4 && y <= o[3] + 4) return true; } return false; }
/* the densest spot of a kind: the point with the most like points within rad; the most played are never the anchor (no name beside a number) */
function denseOf(test, lim, rad, skip) {
  var cand = [], best = -1, bc = -1, k, j, i;
  for (k = 0; k < Math.min(N, lim); k++) { i = TOP[k]; if (SA[i] > 0.3 && test(i) && !inDW(SX[i], SY[i])) cand.push([i, k]); }
  for (k = 0; k < cand.length; k++) {
    if (cand[k][1] < skip || inW(SX[cand[k][0]], SY[cand[k][0]])) continue;
    var c = 0, x = SX[cand[k][0]], y = SY[cand[k][0]];
    for (j = 0; j < cand.length; j++) { var dx = SX[cand[j][0]] - x, dy = SY[cand[j][0]] - y; if (dx * dx + dy * dy < rad * rad) c++; }
    if (c > bc) { bc = c; best = cand[k][0]; }
  }
  return best;
}
function songXY(k, o) { var p = SONG[k].p; proj3(p[0] / 1000, p[1] / 1000, p[2] / 1000, o); return o; }
function roomDot(c) { for (var k = 20; k < N; k++) { var i = TOP[k]; if (MAPS.c[i] === c && SA[i] > 0.5 && !inW(SX[i], SY[i])) return i; } return -1; }
function hullOf(c, g) { var pts = [], k, q; for (k = 0; k < N; k++) if (MAPS.c[k] === c && SA[k] > 0.5) pts.push([SX[k], SY[k]]); if (pts.length < 4) return; var hu = hull(pts), n = hu.length, cx = 0, cy = 0, pad = phone ? 9 : 13; if (n < 3) return; for (k = 0; k < n; k++) { cx += hu[k][0]; cy += hu[k][1]; } cx /= n; cy /= n; var P = hu.map(function (p) { var dx = p[0] - cx, dy = p[1] - cy, d = Math.sqrt(dx * dx + dy * dy) || 1; return [p[0] + dx / d * pad, p[1] + dy / d * pad]; }); g.beginPath(); g.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2); for (k = 0; k < n; k++) { q = P[(k + 1) % n]; g.quadraticCurveTo(P[k][0], P[k][1], (P[k][0] + q[0]) / 2, (P[k][1] + q[1]) / 2); } g.closePath(); g.fillStyle = rgba(hoodCol(c), 0.05); g.fill(); g.strokeStyle = rgba(hoodCol(c), 0.72); g.lineWidth = 1.2; g.stroke(); }
/* an anchor: a function of the live frame that returns [x, y, ring radius (0 = a point), the number for {n}, an emphasis to draw] */
function anchorOf(key) {
  var i, k, best = -1, bv = -1, o = [0, 0, 0], HAND = { mint: MINT, amber: AMBER, violet: VIOLET };
  if (HAND[key]) { i = denseOf(function (j) { return HC[j] === HAND[key]; }, 700, 40, 30); return i < 0 ? null : function () { return [SX[i], SY[i], 22]; }; }
  if (key === 'dense') { i = denseOf(function () { return true; }, 900, 30, 30); return i < 0 ? null : function () { return [SX[i], SY[i], 22]; }; }
  if (key === 'now') return function () { var n = S.now; return n >= 0 && SA[n] > 0.3 ? [SX[n], SY[n], 12] : [cam.cx, cam.cy, 0]; };
  if (key === 'ctr') return function () { return [cam.cx, cam.cy, 0]; };
  if (key === 'gold' || key === 'gline' || key === 'gsong') {
    var P = SONG.map(function (s0, j) { return songXY(j, [0, 0, 0]); });
    for (k = 0; k < P.length; k++) { if (inDW(P[k][0], P[k][1])) continue; var c = 0; for (var j = 0; j < P.length; j++) if (Math.hypot(P[j][0] - P[k][0], P[j][1] - P[k][1]) < 50) c++; if (c > bv) { bv = c; best = k; } }
    if (best < 0) return null;
    if (key === 'gold') return function () { songXY(best, o); return [o[0], o[1], 24]; };
    if (key === 'gline') {
      var bl = -1, bk = -1;
      for (k = 0; k < P.length; k++) { var nb = SNB[k], L2 = Math.hypot(SX[nb] - P[k][0], SY[nb] - P[k][1]); if (!inDW((SX[nb] + P[k][0]) / 2, (SY[nb] + P[k][1]) / 2) && L2 > bl && L2 < 220) { bl = L2; bk = k; } }
      if (bk < 0) return null;
      return function () { songXY(bk, o); var n2 = SNB[bk], x = o[0], y = o[1]; return [(x + SX[n2]) / 2, (y + SY[n2]) / 2, 0, null, function (g) { g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(SX[n2], SY[n2]); g.stroke(); }]; };
    }
    var fk = -1, fd = -1;
    for (k = 0; k < P.length; k++) { if (inDW(P[k][0], P[k][1])) continue; var d = Math.hypot(P[k][0] - P[best][0], P[k][1] - P[best][1]); if (d > fd) { fd = d; fk = k; } }
    return fk < 0 ? null : function () { songXY(fk, o); return [o[0], o[1], 9]; };
  }
  if (key === 'hubm' || key === 'hubv') {
    var col = key === 'hubm' ? 0 : 1;
    for (k = 0; k < RING.length; k++) if (RD[k][col] > bv && !inDW(RPX[k], RPY[k])) { bv = RD[k][col]; best = k; }
    if (best < 0) return null;
    return function () { return [RPX[best], RPY[best], 0, null, function (g) { var q, e; g.lineWidth = 1.6; g.strokeStyle = col ? VIOLET : MINT; for (q = 0; q < EDG.length; q++) { e = EDG[q]; if (e[3] === 1 - col && (e[0] === best || e[1] === best)) { g.beginPath(); edge(g, q, S.look); g.stroke(); } } }]; };
  }
  if (key === 'cross') {
    for (k = 0; k < EDG.length; k++) { var e = EDG[k]; if (e[3] === 1 && RF[e[0]] !== RF[e[1]] && e[2] > bv) { bv = e[2]; best = k; } }
    if (best < 0) return null;
    return function () {
      var e2 = EDG[best], a = e2[0], b = e2[1], x, y;
      if (S.look === 0) { var fa = GA[RF[a]], fb = GA[RF[b]]; x = (RPX[a] + 3 * (cam.cx + RRING * 0.4 * Math.cos(fa)) + 3 * (cam.cx + RRING * 0.4 * Math.cos(fb)) + RPX[b]) / 8; y = (RPY[a] + 3 * (cam.cy + RRING * 0.4 * Math.sin(fa)) + 3 * (cam.cy + RRING * 0.4 * Math.sin(fb)) + RPY[b]) / 8; }
      else { x = (RPX[a] + RPX[b]) / 2; y = (RPY[a] + RPY[b]) / 2; }
      return [x, y, 0, null, function (g) { g.strokeStyle = MINT; g.lineWidth = 2.2; g.beginPath(); edge(g, best, S.look); g.stroke(); }];
    };
  }
  if (key === 'rim0') { k = rimOrder[0]; return function () { return [RPX[k], RPY[k], 0]; }; }
  if (key === 'isl') { if (!RL) return null; var il = RL.C.isl.slice().sort(function (p, q) { return q[3] - p[3]; })[0]; return function () { return [ix(il[1]), iy(il[2]), il[3] / 1000 * cam.r * 1.02 + 5]; }; }
  if (key === 'thread') {
    knn2();
    for (k = 0; k < 300 && best < 0; k++) { i = TOP[k]; if (SA[i] <= 0.3 || inW(SX[i], SY[i]) || k < 30) continue; var dd = 0; for (var q = 0; q < 3; q++) dd += Math.hypot(SX[NB2[i][q]] - SX[i], SY[NB2[i][q]] - SY[i]); if (dd > 30) best = i; }
    if (best < 0) return null;
    return function () { return [SX[best], SY[best], 14, null, function (g) { g.strokeStyle = ICE; g.lineWidth = 1.2; g.beginPath(); for (var q2 = 0; q2 < 3; q2++) { var j2 = NB2[best][q2]; g.moveTo(SX[best], SY[best]); g.lineTo(SX[j2], SY[j2]); } g.stroke(); }]; };
  }
  if ((key === 'lp' || key === 'lq') && MAPS) {
    var LL = key === 'lp' ? MAPS.lp : MAPS.lq, lc = key === 'lp' ? MINT : VIOLET;
    for (k = 0; k < LL.length; k++) { var f = LL[k], ln2 = Math.hypot(SX[f[0]] - SX[f[1]], SY[f[0]] - SY[f[1]]); if (f[2] > bv && ln2 > 40 && ln2 < 260 && SA[f[0]] > 0.3 && SA[f[1]] > 0.3 && !inDW((SX[f[0]] + SX[f[1]]) / 2, (SY[f[0]] + SY[f[1]]) / 2)) { bv = f[2]; best = k; } }
    if (best < 0) return null;
    return function () { var f2 = LL[best]; return [(SX[f2[0]] + SX[f2[1]]) / 2, (SY[f2[0]] + SY[f2[1]]) / 2, 0, null, function (g) { g.strokeStyle = lc; g.lineWidth = 2.4; g.beginPath(); g.moveTo(SX[f2[0]], SY[f2[0]]); g.lineTo(SX[f2[1]], SY[f2[1]]); g.stroke(); }]; };
  }
  if ((key === 'room0' || key === 'room1' || key === 'roomq') && MAPS) {
    var rc = key === 'room0' ? 0 : 1, nq = 0;
    if (key === 'roomq') for (k = 0; k < Math.min(8, MAPS.cm.length); k++) if (MAPS.cm[k][2] > bv) { bv = MAPS.cm[k][2]; rc = k; }
    nq = Math.round(MAPS.cm[rc][2] / 10); i = roomDot(rc);
    return i < 0 ? null : function () { return [SX[i], SY[i], 0, nq, function (g) { hullOf(rc, g); }]; };
  }
  if (/^[kc]/.test(key) && PG) {
    var at = { kmint: [0, 41], kviolet: [1, 15], c17: [0, 27], c15: [1, 23], c75: [1, 62] }[key];
    if (at) return function () { return PG ? pipXY(at[0], at[1]) : null; };
    if (key === 'k47') return function () { return PG && PG.rx ? [PG.rx, PG.ry, 9] : null; };
  }
  return null;
}
function clCur() {
  if (CL.one && CL.one.sc === scene) return CL.one;
  if (CL.list && CL.k >= 0 && CL.sc === scene) return CL.list[CL.k];
  return null;
}
function clDraw(g) {
  CLB = null;
  var it = clCur(); if (!it || !clReady()) return;
  var key = (CL.one ? 'one' : CL.k) + ':' + it.at;
  if (!(key in CL.at)) CL.at[key] = anchorOf(it.at);
  var f = CL.at[key], a = f && f(); if (!a || a[0] < 0 || a[0] > W || a[1] < 0 || a[1] > H) return;
  var ac = ACC[scene], t = it.t.replace('{n}', a[3] != null ? a[3] : ''), fs = 13, lh = Math.round(fs * 1.4), pad = 10, mw = phone ? Math.min(250, W - 56) : 280;
  if (a[4]) a[4](g);
  g.font = '500 ' + fs + 'px ' + SANS; g.textBaseline = 'middle'; g.textAlign = 'left';
  var ws = t.split(' '), lines = [], cur = '', q, tw = 0;
  for (q = 0; q < ws.length; q++) { var tt = cur ? cur + ' ' + ws[q] : ws[q]; if (cur && g.measureText(tt).width > mw) { lines.push(cur); cur = ws[q]; } else cur = tt; }
  lines.push(cur); for (q = 0; q < lines.length; q++) tw = Math.max(tw, g.measureText(lines[q]).width);
  var bw = Math.ceil(tw) + pad * 2, bh = lines.length * lh + pad * 2 - 2, rr = a[2] || 5;
  /* where the box goes: away from the middle of the picture first, then every other way, never on the card, the key, a label or the rail */
  var vx = a[0] - cam.cx, vy = a[1] - cam.cy, vl = Math.hypot(vx, vy) || 1, dirs = [[vx / vl, vy / vl]], c8 = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
  c8.forEach(function (d) { var l = Math.hypot(d[0], d[1]); dirs.push([d[0] / l, d[1] / l]); });
  dirs.sort(function (p, r2) { return (r2[0] * vx + r2[1] * vy) - (p[0] * vx + p[1] * vy); });
  var ds = scene === C_HAND ? [150, 190, 60, 100] : [28, 56, 96, 150, 210, 280], top = phone ? Math.max(56, WBp) : 10, hb = H - 10 - NBp, rgt = W - (phone ? 40 : 10), box = null, pass, di, dk, best = null, bestS = Infinity, ALL = words.concat(DW, KB ? [KB] : []);
  for (pass = 0; pass < 3 && !box; pass++) for (dk = 0; dk < ds.length && !box; dk++) for (di = 0; di < dirs.length && !box; di++) {
    var d0 = dirs[di], px = a[0] + d0[0] * (rr + ds[dk]), py = a[1] + d0[1] * (rr + ds[dk]), bx = px + d0[0] * bw / 2 - bw / 2, by = py + d0[1] * bh / 2 - bh / 2;
    if (bx < 10 || by < top || bx + bw > rgt || by + bh > hb) continue;
    if (a[0] > bx - rr - 4 && a[0] < bx + bw + rr + 4 && a[1] > by - rr - 4 && a[1] < by + bh + rr + 4) continue;
    /* last pass: nothing is clear, so take the spot that covers the least of any label, closer first */
    if (pass === 2) { var sc2 = (rr + ds[dk]) * 2; for (q = 0; q < ALL.length; q++) { var o2 = ALL[q], ow = Math.min(bx + bw, o2[2]) - Math.max(bx, o2[0]), oh = Math.min(by + bh, o2[3]) - Math.max(by, o2[1]); if (ow > 0 && oh > 0) sc2 += ow * oh; } if (sc2 < bestS) { bestS = sc2; best = [Math.round(bx), Math.round(by)]; } continue; }
    var L3 = pass === 0 ? words : DW.concat(KB ? [KB] : []), ok = true;
    for (q = 0; ok && q < L3.length; q++) { var o = L3[q]; if (!(bx + bw + 4 < o[0] || bx - 4 > o[2] || by + bh + 4 < o[1] || by - 4 > o[3])) ok = false; }
    if (ok) box = [Math.round(bx), Math.round(by)];
  }
  if (!box) box = best || [Math.round(Math.max(10, Math.min(rgt - bw, a[0] - bw / 2))), Math.round(Math.max(top, Math.min(hb - bh, a[1] + rr + 24)))];
  var X = box[0], Y = box[1], ex = Math.max(X, Math.min(a[0], X + bw)), ey = Math.max(Y, Math.min(a[1], Y + bh)), an = Math.atan2(ey - a[1], ex - a[0]);
  g.strokeStyle = ac; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0] + Math.cos(an) * rr, a[1] + Math.sin(an) * rr); g.lineTo(ex, ey); g.stroke();
  ring(g, a[0], a[1], rr, ac, a[2] ? 1 : 1.4);
  g.fillStyle = BG; g.fillRect(X, Y, bw, bh); g.strokeStyle = ac; g.lineWidth = phone ? 2 : 1; g.strokeRect(X + 0.5, Y + 0.5, bw - 1, bh - 1);
  var LEAD = { mint: MINT, violet: VIOLET, amber: AMBER, gold: GOLD }, m = /^(mint|violet|amber|gold):/.exec(lines[0]);
  for (q = 0; q < lines.length; q++) {
    var ly = Y + pad + q * lh + lh / 2 - 1, lx = X + pad, s2 = lines[q];
    if (q === 0 && m) { g.fillStyle = LEAD[m[1]]; g.fillText(m[0], lx, ly); lx += g.measureText(m[0]).width; s2 = s2.slice(m[0].length); }
    g.fillStyle = INK; g.fillText(s2, lx, ly);
  }
  CLB = { x: X, y: Y, w: bw, h: bh, ax: a[0], ay: a[1], t: t };
}

/* ---------- the loop ---------- */
function tick() { if (!raf) raf = requestAnimationFrame(step); }
function canSpin(now) { return !reduce && (scene === 0 || scene === C_RECORD) && !S.drag && !S.pinch && !VA && view.z <= 1.05 && blend >= 1 && !S.line && S.hover < 0 && now - lastIn > 1500; }
function demoStart(now) {
  var c = [], k, t, a, b, d, bd, best, m;
  for (k = 0; k < Math.min(60, TOP.length); k++) { t = TOP[k]; if (SA[t] > 0.5 && SX[t] > 40 && SX[t] < W - 40 && SY[t] > 110 && SY[t] < H - 60) c.push(t); }
  if (c.length < 3) return;
  a = c[0]; bd = -1; best = c[1];
  for (k = 1; k < c.length; k++) { d = Math.hypot(SX[c[k]] - SX[a], SY[c[k]] - SY[a]); if (d > bd) { bd = d; best = c[k]; } }
  b = best; bd = -1; best = -1;
  for (k = 1; k < c.length; k++) { if (c[k] === b) continue; d = Math.min(Math.hypot(SX[c[k]] - SX[a], SY[c[k]] - SY[a]), Math.hypot(SX[c[k]] - SX[b], SY[c[k]] - SY[b])); if (d > bd) { bd = d; best = c[k]; } }
  if (best < 0) return;
  m = best; DEMO.on = true; DEMO.t0 = now; DEMO.a = [a, m, b]; DEMO.n++; wake();
}
function step(now) {
  raf = 0;
  if (doc.hidden) return;
  if (!dirty && now - lastPaint < 14) { tick(); return; }
  var other = blend < 1 || reveal < 8 || DEMO.on || (S.game && S.game.on) || !!VA || S.mb !== S.mt || (S.grow && !S.grow.done) || (scene === C_KEEP && S.keepT0 && now - S.keepT0 < 1900) || gliding || S.lookB < 1, spin = canSpin(now);
  /* a slow turn needs 30 frames a second, not 120: the frames go to the hand */
  if (spin && !other && !dirty && now - lastPaint < 30) { tick(); return; }
  /* while the page scrolls, the crossfade paints at 30 a second so the scroll itself keeps its frames */
  if (phone && now - lastScroll < 250 && now - lastPaint < 30) { tick(); return; }
  if (spin) yaw += 0.0000698 * Math.min(60, now - (last || now));
  last = now; lastPaint = now;
  paint(now); zcSync();
  if (other || spin || dirty) { dirty = false; tick(); }
}
function wake() { dirty = true; tick(); }
doc.addEventListener('visibilitychange', function () { if (!doc.hidden) { last = 0; wake(); } });
function walkMode(m) { if (S.mode !== m) { S.trail = []; S.tn = []; S.sn = 0; } S.mode = m; S.line = null; }

/* ---------- pointer ---------- */
function at(e) { var b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; }
function near(x, y, maxd) {
  if (KB && x >= KB.x && x <= KB.x + KB.w && y >= KB.y && y <= KB.y + KB.h) return -1;
  var best = -1, lim = maxd || 14, bd = lim, i;
  /* shapes closer than a finger can tell apart (1.5 px): the bigger one, the one the eye sees, answers */
  for (i = 0; i < N; i++) { if (SA[i] < 0.3) continue; var dx = SX[i] - x, dy = SY[i] - y, d = Math.sqrt(dx * dx + dy * dy); if (d >= lim) continue; if (best < 0 || d < bd - 1.5 || (d < bd + 1.5 && PL[i] > PL[best])) { bd = d; best = i; } }
  return best;
}
function nearSong(x, y) { var sp = [0, 0, 0], best = -1, bd = 196, k; for (k = 0; k < SONG.length; k++) { var s = SONG[k].p; proj3(s[0] / 1000, s[1] / 1000, s[2] / 1000, sp); var dx = sp[0] - x, dy = sp[1] - y; if (dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = k; } } return best; }
function nearRim(x, y) {
  var best = -1, bd = phone ? 576 : 400, k;
  for (k = 0; k < RING.length; k++) { var dx = RPX[k] - x, dy = RPY[k] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
  if (best < 0 && S.look === 0 && S.lookB >= 1) { /* a tap on a rim name */
    var rx = x - cam.cx, ry = y - cam.cy, rad = Math.hypot(rx, ry), an = Math.atan2(ry, rx), ba = 0.03;
    if (rad > RRING - 12 && rad < RRING + 150) for (k = 0; k < RING.length; k++) { var dA = Math.abs(an - RA[k]); dA = Math.min(dA, 6.2832 - dA); if (dA < ba) { ba = dA; best = k; } }
  }
  return best;
}
function pinch() { var ids = Object.keys(PTRS); if (ids.length < 2) return null; var a = PTRS[ids[0]], b = PTRS[ids[1]]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }; }
/* one machine. a finger or mouse goes down: under 10 px and 300 ms it is a tap (a second tap near the first zooms in there);
   past 10 px it is a pan when the view is zoomed, a drawn curve when it is not; zoomed, a half-second hold or the draw chip arms a curve.
   two fingers: pinch about their midpoint, or the depth dial. the curve is drawn on its own canvas so the field never waits on it. */
var TAP_PX = 10, TAP_MS = 300, LP_MS = 380;
function drawing() { return !!(S.drag && S.drag.mode === 'draw'); }
function ovBegin(d) { d.ovi = 0; d.on = true; ovFlush(); }
function ovFlush() {
  ovRaf = 0; var d = S.drag; if (!ov || !d || d.mode !== 'draw') return;
  ovg.setTransform(DPR, 0, 0, DPR, 0, 0); ovg.strokeStyle = MINT; ovg.lineWidth = 1.5; ovg.lineJoin = 'round';
  var k = Math.max(1, d.ovi || 1); ovg.beginPath(); ovg.moveTo(d.pts[k - 1][0], d.pts[k - 1][1]);
  for (; k < d.pts.length; k++) ovg.lineTo(d.pts[k][0], d.pts[k][1]);
  ovg.stroke(); d.ovi = d.pts.length;
}
function ovClear() { if (ov) ovg.clearRect(0, 0, ov.width, ov.height); }
function endHold() { clearTimeout(hold); hold = 0; }
cv.addEventListener('pointerdown', function (e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  clStop(); VA = null; lastIn = e.timeStamp; domStale = true;
  var p = at(e); PTRS[e.pointerId] = p;
  try { cv.setPointerCapture(e.pointerId); } catch (x) { /* fine */ }
  if (Object.keys(PTRS).length >= 2) {
    endHold(); clearTimeout(pendT); pendT = 0; S.drag = null; ovClear();
    var q = pinch(); q.d = Math.max(24, q.d); q.d0 = q.d; q.x0 = q.x; q.y0 = q.y; q.zb0 = S.zb; q.mode = ''; S.pinch = q; wake(); return;
  }
  var hit = near(p[0], p[1], phone ? 18 : 14);
  var d = S.drag = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], on: false, id: e.pointerId, t: e.timeStamp, mode: '', hit: hit, px: view.px, py: view.py, pts: [[p[0], p[1], e.timeStamp]] };
  if (view.z > 1.05 && isField(scene) && (GL.x || GL.y || GL.z !== 1)) unglide();
  endHold(); if (view.z > 1.05) hold = setTimeout(function () { hold = 0; if (S.drag === d && !d.mode) { d.mode = 'draw'; ovBegin(d); try { navigator.vibrate && navigator.vibrate(8); } catch (x) { /* fine */ } } }, LP_MS);
});
cv.addEventListener('pointermove', function (e) {
  var p = at(e);
  if (PTRS[e.pointerId]) PTRS[e.pointerId] = p;
  if (S.pinch) {
    var q = pinch(), P0 = S.pinch; if (!q) return;
    q.d = Math.max(24, q.d);
    if (!P0.mode) {
      var dd = q.d - P0.d0, dx = q.x - P0.x0, dy = q.y - P0.y0;
      if (isField(scene) && Math.abs(dy) > 12 && Math.abs(dd) < 6 && Math.abs(dx) < Math.abs(dy) * 0.5) P0.mode = 'depth';
      else if (Math.abs(dd) > 4 || Math.hypot(dx, dy) > 6) P0.mode = 'zoom';
      else return;
    }
    if (P0.mode === 'depth') { S.zb = Math.max(-1, Math.min(1, P0.zb0 + (P0.y0 - q.y) / (H * 0.4))); wake(); return; }
    zoomAt(q.x, q.y, q.d / P0.d); view.px += q.x - P0.x; view.py += q.y - P0.y; clampView(); pathsDirty = true;
    P0.d = q.d; P0.x = q.x; P0.y = q.y; wake(); return;
  }
  var d = S.drag;
  if (d && d.id === e.pointerId) {
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null, k;
    d.x1 = p[0]; d.y1 = p[1];
    if (!d.mode && Math.hypot(p[0] - d.x0, p[1] - d.y0) > TAP_PX) {
      endHold(); clearTimeout(pendT); pendT = 0; d.mode = view.z > 1.05 && !S.drawArm ? 'pan' : 'draw'; if (d.mode === 'draw') ovBegin(d);
    }
    if (d.mode === 'pan') { view.px = d.px + (p[0] - d.x0); view.py = d.py + (p[1] - d.y0); clampView(); pathsDirty = true; wake(); return; }
    if (d.mode === 'draw') {
      if (evs && evs.length > 1) { var b = cv.getBoundingClientRect(); for (k = 0; k < evs.length && d.pts.length < 1500; k++) d.pts.push([evs[k].clientX - b.left, evs[k].clientY - b.top, evs[k].timeStamp]); }
      else if (d.pts.length < 1500) d.pts.push([p[0], p[1], e.timeStamp]);
      if (!ovRaf) ovRaf = requestAnimationFrame(ovFlush);
    }
    return;
  }
  if (e.pointerType !== 'mouse') return;
  var h = scene === 1 ? -1 : near(p[0], p[1]); if (scene === 1) { var r = nearRim(p[0], p[1]); if (r !== S.rim) { S.rim = r; wake(); } }
  if (h !== S.hover) { S.hover = h; cv.style.cursor = h >= 0 ? 'pointer' : scene === 1 ? 'default' : 'crosshair'; wake(); }
});
function later(f) { pendF = function () { pendF = null; f(); }; pendT = setTimeout(function () { pendT = 0; pendF(); }, 260); }
function up(e) {
  endHold(); lastIn = e.timeStamp; delete PTRS[e.pointerId];
  if (S.pinch) {
    if (Object.keys(PTRS).length < 2) {
      var dep = S.pinch.mode === 'depth'; S.pinch = null;
      if (dep && S.line && S.line.scene === scene && S.line.cam) { restop(S.line); if (S.line.stops.length) { S.line.follow = true; play(S.line.stops[0], 'stop'); } }
      var rid = Object.keys(PTRS)[0];
      if (rid !== undefined && view.z > 1.05) { var rp = PTRS[rid]; S.drag = { x0: rp[0], y0: rp[1], x1: rp[0], y1: rp[1], on: false, id: +rid, t: e.timeStamp, mode: 'pan', hit: -1, px: view.px, py: view.py, pts: [] }; } else S.drag = null;
    }
    wake(); return;
  }
  var d = S.drag; if (!d || d.id !== e.pointerId) return; S.drag = null;
  var p = at(e);
  if (d.mode === 'pan') { wake(); return; }
  if (d.mode === 'draw') {
    d.pts.push([p[0], p[1], e.timeStamp]); S.drawArm = false; ovClear();
    if (d.pts.length > 2 || Math.hypot(p[0] - d.x0, p[1] - d.y0) > TAP_PX) curve(d.pts); wake(); return;
  }
  if (e.type === 'pointercancel') { wake(); return; }
  if (lastTap && e.timeStamp - lastTap.t < 260 && Math.hypot(p[0] - lastTap.x, p[1] - lastTap.y) < 32) {
    lastTap = null; clearTimeout(pendT); pendT = 0; if (view.z > ZMAX * 0.8) resetView(); else zoomTo(p[0], p[1], Math.max(view.z * 2.6, 2.6), 220); return;
  }
  lastTap = { t: e.timeStamp, x: p[0], y: p[1] };
  if (pendT) { clearTimeout(pendT); pendT = 0; pendF(); }
  if (scene === 1) { var r = nearRim(p[0], p[1]); if (r >= 0) { S.rim = r; var ai = RING[r][0]; if (ai >= 0) { later(function () { play(ai, 'rim'); }); } else wake(); } return; }
  if (scene === C_RECORD) { var k = nearSong(p[0], p[1]); if (k >= 0) { mine(k); return; } }
  var i = d.hit >= 0 ? d.hit : near(p[0], p[1], phone ? 18 : 14);
  if (i >= 0) { later(function () { S.line = null; if (scene === C_MAPS && S.like.on) likeFrom(i); else { S.like.seq = null; play(i, 'tap'); } }); } else wake();
}
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', function (e) { endHold(); delete PTRS[e.pointerId]; S.pinch = null; S.drag = null; ovClear(); wake(); });
cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
/* zoom: a trackpad pinch arrives as a wheel with ctrl; ctrl, cmd or alt + wheel zooms about the cursor; the plain wheel keeps scrolling the story.
   desktop Safari sends gesture events instead of wheel for a pinch */
cv.addEventListener('wheel', function (e) {
  if (!(e.ctrlKey || e.metaKey || e.altKey)) return;
  e.preventDefault(); lastIn = e.timeStamp;
  var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1); dy = Math.max(-80, Math.min(80, dy));
  var p = at(e); zoomAt(p[0], p[1], Math.exp(-dy * 0.009));
}, { passive: false });
var gs0 = 0;
cv.addEventListener('gesturestart', function (e) { e.preventDefault(); VA = null; gs0 = view.z; });
cv.addEventListener('gesturechange', function (e) { e.preventDefault(); if (!gs0) return; var p = at(e); zoomAt(p[0], p[1], gs0 * e.scale / view.z); });
cv.addEventListener('gestureend', function (e) { e.preventDefault(); gs0 = 0; });
var lastScroll = -1e9;
addEventListener('scroll', function () { domStale = true; lastIn = lastScroll = performance.now(); }, { capture: true, passive: true });
addEventListener('resize', function () { domStale = true; });
addEventListener('sm:drawer', function () { domStale = true; pathsDirty = true; frame(); wake(); });
/* the zoom chips: fit (with the zoom level) and draw, only while zoomed */
var ZI = { find: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14.5 14.5"/>', draw: '<path d="M1.5 12C4 3 7 15 9.5 8S13 4 14.5 3"/>', fit: '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/>', zin: '<path d="M2.5 8h11M8 2.5v11"/>', zout: '<path d="M2.5 8h11"/>' };
var findB = null, zfEl = null, gkEl = null, gkDone = false;
function zbtn(kind, label) {
  var b = doc.createElement('button'); b.type = 'button'; b.className = 'chip z-' + kind; b.setAttribute('aria-label', label); b.title = label;
  b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">' + ZI[kind] + '</svg><span>' + ({ find: 'find', draw: 'draw a radio', fit: 'fit', zin: 'in', zout: 'out' }[kind] || '') + '</span>'; return b;
}
function zcBuild() {
  zc = doc.createElement('div'); zc.id = 'zc'; zc.hidden = true;
  findB = zbtn('find', 'find an artist'); drawB = zbtn('draw', 'draw a curve for a radio'); fitB = zbtn('fit', 'zoom back out to fit');
  var zi = zbtn('zin', 'zoom in'), zo = zbtn('zout', 'zoom out');
  drawB.setAttribute('aria-pressed', 'false');
  zfEl = doc.createElement('div'); zfEl.className = 'zf'; zfEl.hidden = true;
  zfEl.innerHTML = '<input type="search" list="f-names" placeholder="artist" aria-label="find an artist" autocomplete="off">';
  var zin = zfEl.firstChild;
  function go() { var v = zin.value; if (!v) return; find(v); zfEl.hidden = true; findB.classList.remove('on'); zin.blur(); }
  zin.addEventListener('change', go); zin.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') { zfEl.hidden = true; findB.classList.remove('on'); } });
  findB.addEventListener('click', function () { zfEl.hidden = !zfEl.hidden; findB.classList.toggle('on', !zfEl.hidden); if (!zfEl.hidden) zin.focus(); });
  fitB.addEventListener('click', function () { resetView(); });
  zi.addEventListener('click', function () { zoomTo(W / 2, H / 2, view.z * 1.6, 200); }); zo.addEventListener('click', function () { zoomTo(W / 2, H / 2, view.z / 1.6, 200); });
  drawB.addEventListener('click', function () { S.drawArm = !S.drawArm; zcSync(true); });
  [findB, drawB, fitB, zi, zo].forEach(function (x) { zc.appendChild(x); }); zc.appendChild(zfEl); stage.appendChild(zc);
  gkEl = doc.createElement('div'); gkEl.id = 'gk'; gkEl.setAttribute('aria-hidden', 'true'); gkEl.textContent = 'pinch or scroll: zoom · drag: pan · hold: draw · double tap: zoom in'; stage.appendChild(gkEl);
  cv.addEventListener('pointerdown', function () { if (gkDone || !zcOn) return; gkDone = true; gkEl.classList.add('on'); setTimeout(function () { gkEl.classList.remove('on'); }, 4000); }, { passive: true });
  ov = doc.createElement('canvas'); ov.id = 'field-ov'; ov.setAttribute('aria-hidden', 'true'); ov.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2';
  ov.width = cv.width; ov.height = cv.height; ovg = ov.getContext('2d'); cv.insertAdjacentElement('afterend', ov);
}
function zcSync(force) {
  if (!zc) return; var on = (scene === C_COUNT || scene === C_MAPS || scene === C_HOODS || scene === C_RECORD) && blend >= 0.5;
  if (on !== zcOn || force) { zcOn = on; zc.hidden = !on; domStale = true; if (!on) { S.drawArm = false; zfEl.hidden = true; findB.classList.remove('on'); } drawB.classList.toggle('on', !!S.drawArm); drawB.setAttribute('aria-pressed', S.drawArm ? 'true' : 'false'); }
  if (on) { var t = 'zoom back out to fit (now ' + (view.z < 10 ? view.z.toFixed(1) : Math.round(view.z)) + 'x)'; if (t !== zcT) { zcT = t; fitB.setAttribute('aria-label', t); fitB.title = t; } }
}
addEventListener('keydown', function (e) { if (e.target && /input|textarea/i.test(e.target.tagName)) return; if (e.key === '+' || e.key === '=') zoomTo(W / 2, H / 2, view.z * 1.6, 200); else if (e.key === '-') zoomTo(W / 2, H / 2, view.z / 1.6, 200); else if (e.key === '0') resetView(); });
addEventListener('keydown', function (e) { if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !(e.target && /input|textarea/i.test(e.target.tagName))) { next(); } });

/* ---------- sound: one at a time ---------- */
function duck() { var M = window.__smMusic; if (M && M.hold) M.hold(); }
function unduck() { var M = window.__smMusic; if (M && M.release) M.release(); }
window.__radioYield = function () { if (pv && !pv.paused) { S.user = true; pv.pause(); } if (S.game && S.game.on) endGame(true); };
function npSilent() { if (!phone) return; var e = $('#np'); if (!e || e.hidden) return; var q = function () { var alb = window.__smMusic && window.__smMusic.A && window.__smMusic.A.el; return !S.playing && !(pv && !pv.paused) && !(alb && !alb.paused) && S.pend < 0; }; if (q()) setTimeout(function () { if (q() && !e.hidden) e.hidden = true; }, 1100); }
function albumEl() { var M = window.__smMusic; return M && M.A && M.A.el; }
function anyOn() { var a = albumEl(); return !!(S.playing || (a && !a.paused) || S.wallOn); }
/* the one sound cue: "sound on" whenever anything plays (a preview, the album, a gold song), one string when nothing does */
function ppLabel() { npSilent(); var b = $('#b-pp'); if (b) { b.textContent = S.playing ? 'pause' : 'play'; } if (anyOn() || S.pend >= 0) setHear(true); else if (S.hear === undefined) setHear(false); html.classList.toggle('sm-pv', !!S.playing); }
var HT = 0, WT = 0;
function setHear(on) { S.hear = !!on; var lab = on ? 'sound on' : phone ? 'sound off' : 'sound off, tap to hear'; ['#b-hear', '#wr-hear'].forEach(function (q) { var h = $(q); if (h) { h.classList.toggle('on', on); h.textContent = lab; } }); }
function hushWall() { var fr = $('#wr-f'); if (html.classList.contains('sm-wall') && fr && fr.contentWindow) try { fr.contentWindow.postMessage({ sm: 'front', ev: 'hush' }, location.origin); } catch (x) { /* fine */ } S.wallOn = false; }
(function () { var t = setInterval(function () { var a = albumEl(); if (!a || a.__hear) return; a.__hear = 1; clearInterval(t); ['play', 'pause', 'ended'].forEach(function (e) { a.addEventListener(e, ppLabel); }); ppLabel(); }, 700); })();
function el() {
  if (pv) return pv;
  pv = new Audio(); pv.preload = 'auto';
  pv.addEventListener('playing', function () { S.playing = true; S.errs = 0; duck(); ppLabel(); });
  pv.addEventListener('pause', function () { S.playing = false; ppLabel(); if (!pv.ended && !document.documentElement.classList.contains('sm-wall')) unduck(); });
  pv.addEventListener('ended', function () { S.playing = false; if (S.user || (S.game && S.game.on) || (S.wh && S.wh.pair)) { unduck(); ppLabel(); return; } next(); });
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
  text('#np-t', p[0]); hushWall();
  if (a.getAttribute('src') !== p[1]) a.src = p[1]; else try { a.currentTime = 0; } catch (x) { /* not seekable yet */ }
  duck();
  var q; try { q = a.play(); } catch (x) { q = null; }
  if (q && q.catch) q.catch(function () { S.playing = false; unduck(); ppLabel(); });
  if (then) then(true);
}
function play(i, why) {
  html.classList.remove('sm-mine');
  S.user = false; S.mine = -1; S.now = i; S.played[i] = 1; S.playScene = scene; S.trail.push(i); S.tn.push(++S.sn); if (S.trail.length > 14) { S.trail.shift(); S.tn.shift(); }
  room(i, why); sound(i); wake(); walkTimer(why); DEMO.on = false; if (isField(scene) || scene === C_HOODS) whatFor(scene);
}
function next() {
  if (S.game && S.game.on) { gameNext(); return; }
  var LK = S.like; if (LK.seq && scene === C_MAPS && LK.k + 1 < LK.seq.length) { LK.k++; play(LK.seq[LK.k], 'like'); return; }
  if (S.now < 0 && !S.line) { play(TOP[0], 'start'); return; }
  var L = S.line;
  if (L && L.k + 1 < L.stops.length) { L.k++; play(L.stops[L.k], 'stop'); return; }
  if (L) L.k = L.stops.length;
  if (S.mode === 'hand') { breakRun(); return; }
  if (S.mode === 'log') { walkLog(); return; }
  if (scene === C_HAND && !S.mode && RING.length) { walkRing(); return; }
  walk();
}
/* the ring walks its own lines: from here, the strongest followed-by line to a name not yet played; the walk is drawn on the ring */
function walkRing() {
  var cur = S.now, r = cur >= 0 ? RI[cur] : undefined, k, e, o, ai, best = -1, bw = -1, bk = -1, bo = -1, pass;
  if (r === undefined) { for (k = 0; k < RING.length; k++) if (RING[k][0] >= 0 && (!PV || PV[names[RING[k][0]]])) { S.rt = []; S.rim = k; play(RING[k][0], 'ringwalk'); return; } walk(); return; }
  for (pass = 0; pass < 2 && best < 0; pass++) for (k = 0; k < EDG.length; k++) {
    e = EDG[k]; if (e[0] !== r && e[1] !== r) continue; o = e[0] === r ? e[1] : e[0]; ai = RING[o][0];
    if (ai < 0 || (pass === 0 && S.played[ai]) || (PV && !PV[names[ai]])) continue;
    if (e[2] > bw) { bw = e[2]; best = ai; bk = k; bo = o; }
  }
  if (best < 0) { walk(); return; }
  S.rt.push([bk, bo]); if (S.rt.length > 10) S.rt.shift();
  S.rim = bo; play(best, 'ringwalk');
}
function walkTimer(why) { clearTimeout(WT); WT = 0; var walkish = why === 'ringwalk' || why === 'near' || why === 'rim' || why === 'log' || why === 'hood'; if (!walkish || !(scene === C_HAND || scene === C_HOODS)) return; var sc = scene, at = S.now; WT = setTimeout(function () { WT = 0; if (scene === sc && S.now === at && !S.user && S.now >= 0 && !(S.game && S.game.on) && !(S.wh && S.wh.pair)) next(); }, 9000); }
/* the log walks: from here, the artist that most often followed or preceded it in the log, not yet played */
function walkLog() {
  loadMaps().then(function () {
    var cur = S.now < 0 ? TOP[0] : S.now, nb = MAPS.nb ? MAPS.nb[cur] : [], c = -1, k;
    for (k = 0; k < nb.length; k++) if (nb[k] >= 0 && !S.played[nb[k]] && (!PV || PV[names[nb[k]]])) { c = nb[k]; break; }
    if (c < 0) { for (k = 0; k < nb.length; k++) if (nb[k] >= 0 && (!PV || PV[names[nb[k]]])) { c = nb[k]; break; } }
    if (c < 0) { walk(); return; }
    play(c, 'log');
  });
}
/* find an artist by name: light it, zoom to it, hear it */
function find(q) {
  q = (q || '').trim().toLowerCase(); if (!q) return;
  var i = -1, k; for (k = 0; k < N; k++) if (names[k].toLowerCase() === q) { i = k; break; }
  if (i < 0) for (k = 0; k < N; k++) if (names[k].toLowerCase().indexOf(q) === 0) { i = k; break; }
  if (i < 0) for (k = 0; k < N; k++) if (names[k].toLowerCase().indexOf(q) >= 0) { i = k; break; }
  if (i < 0) { text('#f-r', 'not in the field: ' + q); return; }
  text('#f-r', ''); S.line = null; S.mode = '';
  VA = null; if (isField(scene) && (GL.x || GL.y || GL.z !== 1)) unglide(); layout(performance.now());
  var zt = Math.max(view.z, 2.5), ff = zt / view.z;
  animView(zt, W / 2 - (SX[i] - cam.cx) * ff, H / 2 - (SY[i] - cam.cy) * ff, 380);
  play(i, 'find');
}
/* a cartoon of auto-play: the nearest in sound not yet played (a rule, not the log) */
function walk() {
  var nn = NN[S.now < 0 ? TOP[0] : S.now], c = -1, k;
  for (k = 0; k < nn.length; k++) if (!S.played[nn[k]] && (!PV || PV[names[nn[k]]])) { c = nn[k]; break; }
  if (c < 0) { S.played = {}; c = nn[0]; }
  play(c, 'near');
}
/* a cartoon of my press: a far artist of another family, among the ones i played most (a rule, not the log) */
function breakRun() {
  var cur = S.now < 0 ? TOP[0] : S.now, x = P3[cur * 3], y = P3[cur * 3 + 1], z = P3[cur * 3 + 2], cand = [], k;
  for (k = 0; k < Math.min(N, 400); k++) { var i = TOP[k]; if (i === cur || F.f[i] === F.f[cur] || S.played[i] || (PV && !PV[names[i]])) continue; var dx = P3[i * 3] - x, dy = P3[i * 3 + 1] - y, dz = P3[i * 3 + 2] - z; cand.push([i, dx * dx + dy * dy + dz * dz]); }
  if (!cand.length) { S.played = {}; walk(); return; }
  cand.sort(function (a, b) { return b[1] - a[1]; });
  play(cand[Math.floor(rnd() * Math.min(10, cand.length))][0], 'break');
}
function room(i, why) {
  var h = F.h[i], p = h[0] + h[1] + h[2];
  var Ls = S.line, nx = Ls && Ls.stops[Ls.k + 1], lead = why === 'stop' && Ls ? 'stop ' + (Ls.k + 1) + ' of ' + Ls.stops.length + ': ' + cut(names[i], 22) + (nx >= 0 ? ', next: ' + cut(names[nx], 22) : ', last stop') : why === 'near' ? 'step ' + S.sn + (S.mode === 'queue' ? ': a cartoon of auto-play, the nearest in sound' : ': the nearest in sound') : why === 'break' ? 'step ' + S.sn + ': a cartoon of my press, a far jump' : why === 'like' ? (S.like.k ? 'sounds like ' + S.like.k + ' of ' + (S.like.seq.length - 1) + ': ' + cut(names[i], 22) + (S.like.k + 1 < S.like.seq.length ? ', next: ' + cut(names[S.like.seq[S.like.k + 1]], 22) : ', the last') : 'sounds like: ' + cut(names[i], 22) + ' first, then its six nearest in sound') : why === 'ringwalk' ? 'step ' + S.sn + ' on the ring: who followed it most' : why === 'rim' ? 'who led to whom' : why === 'hood' ? 'the most played artist of that room' : why === 'log' ? 'step ' + S.sn + ': the log walks to who followed it most' : why === 'find' ? 'found: zoomed to it' : why === 'back' ? 'back one: ' + cut(names[i], 22) : why === 'game' ? '47 seconds: keep or let go' : 'now playing';
  text('#np-k', lead); text('#np-n', names[i]);
  text('#np-h', p + ' plays · ' + F.fam[F.f[i]] + (apple(i) ? ' (Apple\u2019s label)' : '') + (scene === C_HOODS && MAPS && MAPS.c[i] >= 0 && MAPS.c[i] < 8 ? ' · room ' + ROMAN[MAPS.c[i]] : ''));
  text('#np-x', why === 'ringwalk' ? 'the walk so far: ' + S.trail.map(function (n) { return names[n]; }).join(', then ') + '. each step takes the strongest line out of the last stop; mint = my press, violet = auto-play.' : why === 'like' ? 'lit in ice: the six artists nearest to it in sound, on whichever map is showing.' : scene === C_MAPS ? (S.mb < 0.5 ? 'the ice threads: its six nearest in sound. next walks there.' : 'mint lines: my press before or after it. violet: auto-play\u2019s run through it. faint gray: every other followed-by.') : scene === C_HOODS ? 'lit: its steps in the graph, in its room\u2019s color when both ends share the room.' : scene === C_HAND ? 'lit on the ring: who it followed and who followed it.' : 'the ice threads: its six nearest in sound. next walks there.');
  var a = $('#a-sp'); if (a) a.href = 'https://open.spotify.com/search/' + encodeURIComponent(names[i]);
  npShow();
}
function mine(k) {
  var M = window.__smMusic; if (!M || !M.tracks) return;
  if (pv && !pv.paused) { S.user = true; pv.pause(); }
  S.now = -1; S.line = null; S.mine = k; var f = SONG[k].f; html.classList.add('sm-mine');
  text('#np-k', 'one of mine, placed by its sound'); text('#np-n', SONG[k].t.toLowerCase()); text('#np-h', 'nearest artist in sound: ' + names[SNB[k]]); text('#np-t', ''); npShow();
  M.tracks().then(function (tr) { for (var j = 0; j < tr.length; j++) if (tr[j].f === f) { M.go(j, 0, true); break; } }, function () { /* the album did not load */ });
  $$('#songs button').forEach(function (b, j) { b.classList.toggle('on', j === k); });
  wake();
}

/* ---------- the 47-second game ---------- */
function startGame() {
  if (S.game && S.game.on) return;
  if (S.game && S.game.max === 3 && S.game.n >= 3) { S.game.on = true; S.game.max = 10; S.mode = ''; S.line = null; show('#g-ans', true); show('#g-start', false); text('#g-start', 'play: keep it?'); gameNext(); return; }
  S.game = { on: true, n: 0, kept: 0, until: 0, i: -1, max: 3, pool: TOP.slice(0, 600) };
  S.mode = ''; S.line = null; text('#g-score', ''); show('#g-ans', true); show('#g-start', false);
  gameNext();
}
function gameNext() {
  var G = S.game; if (!G || !G.on) return;
  if (G.n >= G.max) { endGame(false); return; }
  var i = -1, tries = 0;
  while (i < 0 && tries++ < 50) { var c = G.pool[Math.floor(rnd() * G.pool.length)]; if (!S.played[c] && (!PV || PV[names[c]])) i = c; }
  if (i < 0) { endGame(false); return; }
  G.i = i; G.n++; G.until = performance.now() + 47000; S.now = i; S.played[i] = 1;
  room(i, 'game'); text('#g-k', 'song ' + G.n + ' of ' + G.max + ': ' + names[i] + ' is playing. would you keep it? 47 seconds.'); sound(i);
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
  if (G.n) text('#g-score', 'you kept ' + G.kept + ' of ' + G.n + ' (' + Math.round(100 * G.kept / G.n) + ' of 100). i keep 42 of 100 of what i press, and 16 of 100 of what auto-play chose.');
  var more = G.max === 3 && G.n >= 3 && G.pool.length;
  text('#g-start', more ? 'seven more?' : 'play: keep it?');
  text('#g-k', more ? 'three songs done. seven more makes the full round of ten.' : 'three songs, 47 seconds each. keep it or let it go. then seven more if you like.');
  wake();
}

/* ---------- whose hand? ---------- */
function whose() {
  if (S.wh && S.wh.rows.length) { if (S.wh.max === 3 && S.wh.n >= 3) { S.wh.max = 10; text('#w-start', 'play: whose finger?'); whRound(); } return; }
  var go = function (rows) {
    /* same-artist steps are left out, as the bridge index leaves them out */
    rows = rows.filter(function (r) { return r.pa !== r.a; });
    var me = rows.filter(function (r) { return r.arm === 'me'; }), app = rows.filter(function (r) { return r.arm === 'app'; }), pick = [], k;
    for (k = 0; k < 5; k++) { pick.push(me.splice(Math.floor(rnd() * me.length), 1)[0]); pick.push(app.splice(Math.floor(rnd() * app.length), 1)[0]); }
    for (k = pick.length - 1; k > 0; k--) { var j = Math.floor(rnd() * (k + 1)), t = pick[k]; pick[k] = pick[j]; pick[j] = t; }
    S.wh = { rows: pick, n: 0, right: 0, max: 3 }; whRound();
  };
  if (!PV) prefetchPV();
  if (TASTE) go(TASTE); else fetchJ('taste').then(function (j) { TASTE = j.rows; go(TASTE); }, function () { text('#w-q', 'the game rows did not load here.'); });
}
function whRound() {
  var G = S.wh; clearTimeout(G.to);
  show('#w-hear', false);
  if (G.n >= G.max) { G.pair = null; var more = G.max === 3; text('#w-k', more ? 'three pairs done. seven more makes the full round of ten.' : 'whose finger? three pairs from the log, then seven more.'); text('#w-q', 'you got ' + G.right + ' of ' + G.n + '. chance is ' + (G.n / 2) + '. the log says i pressed play on 19 of every 100; the rest was shuffle and auto-play.'); text('#w-r', ''); show('#w-ans', false); show('#w-start', true); text('#w-start', more ? 'seven more?' : 'play: whose finger?'); if (!more) G.rows = []; return; }
  var r = G.rows[G.n], ia = names.indexOf(r.a), ip = r.pa && r.pa !== r.a ? names.indexOf(r.pa) : -1, same = r.pa === r.a;
  text('#w-k', 'pair ' + (G.n + 1) + ' of ' + G.max); text('#w-q', (same ? r.a + ' played, then ' + r.a + ' again: ' : r.pa ? r.pa + ' played. then ' : '') + (same ? '' : r.a + ', ') + r.t + '. who pressed play on it?');
  show('#w-r', true); text('#w-r', 'a hint: near or far barely helps. 70 in 100 of my presses cross to another family; 66 of auto-play’s.');
  show('#w-hear', ip >= 0); if (ip >= 0) { text('#w-h1', '1: ' + cut(r.pa, 14)); text('#w-h2', '2: ' + cut(r.a, 14)); }
  show('#w-ans', true); show('#w-start', false);
  G.pair = [ip, ia];
  var go2 = function () { if (S.wh === G && G.rows[G.n] === r && ia >= 0 && PV && PV[r.a]) { S.now = ia; room(ia, 'tap'); sound(ia); whHi(1); if (isField(scene)) whatFor(scene); } };
  if (ip >= 0 && PV && PV[r.pa]) { S.now = ip; room(ip, 'tap'); sound(ip); whHi(0); G.to = setTimeout(go2, 7000); } else go2();
}
function whHi(k) { ['#w-h1', '#w-h2'].forEach(function (q, j) { var b = $(q); if (b) b.classList.toggle('on', j === k); }); }
function whHear(k) { var G = S.wh; if (!G || !G.pair) return; var i = G.pair[k]; if (i < 0) return; clearTimeout(G.to); S.user = false; S.now = i; room(i, 'tap'); sound(i); whHi(k); if (isField(scene)) whatFor(scene); }
function whAnswer(me) {
  var G = S.wh; if (!G || !G.rows.length) return; var r = G.rows[G.n], ok = (r.arm === 'me') === me; if (ok) G.right++;
  text('#w-r', (ok ? 'yes: ' : 'no: ') + (r.arm === 'me' ? 'my press.' : 'auto-play.') + ' ' + G.right + ' of ' + (G.n + 1) + ' so far.');
  G.n++; setTimeout(whRound, 1400);
}

/* ---------- wiring ---------- */
function on(sel, f) { var e = $(sel); if (e) e.addEventListener('click', f); }
on('#b-pp', function () { var a = el(); if (S.playing) { S.user = true; a.pause(); } else if (S.now >= 0) { S.user = false; sound(S.now); } else next(); });
on('#b-next', function () { S.user = false; next(); });
on('#b-prev', function () { var t = S.trail; if (t.length < 2) return; t.pop(); S.tn.pop(); var p = t.pop(); S.tn.pop(); S.user = false; if (S.line) S.line.k = Math.max(-1, S.line.k - 2); play(p, 'back'); });
on('#b-queue', function () { walkMode('queue'); walk(); text('#h-mode', 'a cartoon of auto-play, not the log: each next song is the nearest in sound to the last.'); say('a cartoon of auto-play: the nearest in sound.', 'now'); });
on('#b-look', function () {
  var nx = (S.look + 1) % 4;
  var go = function () { S.lookFrom = S.look; S.look = nx; S.lookT0 = performance.now(); S.lookB = 0; S.rim = -1; text('#h-look', LOOKT[nx]); say(LOOKS[nx], ['rim0', 'ctr', 'isl', 'ctr'][nx]); };
  if ((nx === 1 || nx === 2) && !RL) loadRing().then(function (r) { if (!r) nx = 3; go(); }); else go();
});
on('#m-like', function () {
  S.like.on = !S.like.on; if (!S.like.on) S.like.seq = null; chips();
  text('#m-mode', S.like.on ? 'sounds like: tap an artist. it and the six nearest to it in sound light up in ice and play in turn.' : 'sounds like is off: a tap plays one artist, and next walks to its nearest.'); if (S.like.on) say('tap an artist: it and its six nearest play.', 'dense'); else clStop(); wake();
});
on('#b-hand', function () { walkMode('hand'); breakRun(); text('#h-mode', 'a cartoon of my press, not the log: a far jump to another family. in the log the gap is small: 70 vs 66 of 100 steps cross a family.'); say('a cartoon of my press: a far jump.', 'now'); });
document.addEventListener('click', function (e) { var m = e.target && e.target.closest ? e.target.closest('[data-more]') : null; if (!m) return; var act = m.closest('.act'); if (act) act.classList.add('more'); });
var NCOL = { hood: 'color: rooms', family: 'color: families', first: 'color: first heard' };
on('#n-color', function () { var ord = ['hood', 'family', 'first'], nx = ord[(ord.indexOf(S.color) + 1) % ord.length], b = $('#hoods .row .chip[data-c="' + nx + '"]'); if (b) b.click(); });
on('#n-walk', function () { walkMode('log'); S.hoodHi = -1; chips(); walkLog(); text('#n-mode', 'the log walks: each next artist is the one that most often sat beside the last in the log. the ice trail is the path; see whether it stays in one room.'); say('the log walks: who most often sat beside it.', 'now'); });
var fi = $('#f-q'); if (fi) { fi.addEventListener('change', function () { find(fi.value); }); fi.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); find(fi.value); } }); }
function datalist() { var dl = $('#f-names'); if (!dl) return; var frag = doc.createDocumentFragment(), k; for (k = 0; k < Math.min(N, 600); k++) { var o = doc.createElement('option'); o.value = names[TOP[k]]; frag.appendChild(o); } dl.appendChild(frag); }
function loadMaps() { if (!mapsP) mapsP = fetchJ('maps').then(function (j) { MAPS = j; hoodList(); wake(); return j; }, function () { mapsP = null; }); return mapsP; }
function flyTo(t) { if (S.mt === t && S.mb === t) return; S.mFrom = S.mb; S.mt = t; S.mT0 = performance.now(); loadMaps(); chips(); wake(); }
on('#m-sound', function () { S.grow = null; flyTo(0); chips(); text('#m-mode', 'by sound: a model\u2019s ear placed every artist (UMAP of CLAP). the map is a strip, so lines are drawn on the followed-by map only; auto-play\u2019s run sits a shade tighter in sound.'); clStart(0); });
on('#m-graph', function () { S.grow = null; flyTo(1); chips(); text('#m-mode', 'by what followed: the log placed them (a force layout of the transition graph). every line is short now by construction; the question is which map the other starter\u2019s lines respect.'); clStart(0); });
var NMODE = { hood: 'colored by room: eleven rooms the log drew from what followed what alone; each outline is a room, colored by the family that fills it most.', family: 'colored by family (Last.fm labels, Apple\u2019s where Last.fm has none). a room that matches a family was never told the family; a room that mixes them is the log\u2019s own.', first: 'colored by when i first heard each artist, in eight cuts of the log. early rooms and late rooms show.', hand: 'colored by who pressed play on each artist most. mint rooms are mine; violet rooms auto-play walks alone.' };
$$('#hoods .row .chip[data-c]').forEach(function (b) { b.addEventListener('click', function () { S.color = b.getAttribute('data-c'); S.hoodHi = -1; text('#n-mode', NMODE[S.color]); chips(); var k2 = $('#key2'); if (k2) k2.hidden = S.color !== 'family'; if (NSAY[S.color]) say(NSAY[S.color], 'room0'); wake(); }); });
on('#m-grow', function () { loadMaps().then(function () { if (S.mb < 1) flyTo(1); S.grow = { t0: performance.now() + 900, c: 0, done: false }; chips(); text('#m-mode', 'as it grew: the second map assembles in the order the log happened, eight cuts by count. watch the rooms form before the names.'); wake(); }); });
function key() {
  var k = $('#key'), k2 = $('#key2'); if (!F) return;
  if (k) { k.innerHTML = ''; k.hidden = false;
    F.fam.forEach(function (nm, f) { var b = doc.createElement('button'); b.type = 'button'; b.setAttribute('data-f', f); b.innerHTML = '<i></i><span></span>'; b.firstChild.style.background = FAMC[nm] || MUTE; b.lastChild.textContent = nm; b.addEventListener('click', function () { S.fam = S.fam === f ? -1 : f; chips(); wake(); }); k.appendChild(b); }); }
  if (k2) { k2.innerHTML = ''; F.fam.forEach(function (nm) { var b = doc.createElement('span'); b.className = 'ks'; b.innerHTML = '<i></i><span></span>'; b.firstChild.style.background = FAMC[nm] || MUTE; b.lastChild.textContent = nm; k2.appendChild(b); }); }
  chips();
}
var HD = [];
/* light a room, glide to it and hear its most played artist; a second tap on the same room (list only) lets go */
function pickHood(h, keep) {
  if (!MAPS) return;
  S.hoodHi = (S.hoodHi === h && !keep) ? -1 : h;
  if (S.hoodHi >= 0) {
    var best = -1, k2; for (k2 = 0; k2 < N; k2++) { var i2 = TOP[k2]; if (MAPS.c[i2] === h && (!PV || PV[names[i2]])) { best = i2; break; } }
    if (best >= 0) play(best, 'hood');
    jumpHood(h); text('#n-mode', 'room ' + (h + 1) + ' of ' + Math.min(8, MAPS.cm.length) + ' · ' + (HD[h] || ''));
  } else { resetView(); text('#n-mode', NMODE[S.color] || NMODE.hood); }
  chips(); wake();
}
on('#n-jump', function () { loadMaps().then(function () { if (!MAPS) return; if (S.grow && !S.grow.done) { S.grow.done = true; S.grow.c = 8; } pickHood(S.hoodHi >= 0 ? (S.hoodHi + 1) % Math.min(8, MAPS.cm.length) : 0, true); }); });
function hoodList() {
  var ol = $('#hl-list'); if (!ol || !MAPS || ol.childElementCount) return;
  MAPS.cm.slice(0, 8).forEach(function (c, h) {
    var li = doc.createElement('li'), b = doc.createElement('button'); b.type = 'button'; b.setAttribute('data-h', h);
    b.innerHTML = '<i></i><b></b><span></span>'; b.firstChild.style.background = hoodCol(h); b.children[1].textContent = h + 1; b.lastChild.textContent = F.fam[c[1]]; HD[h] = c[0] + ' artists · ' + Math.round(c[3] / 10) + ' of 100 plays in ' + F.fam[c[1]] + (c[5] ? ', ' + Math.round(c[5] / 10) + ' in ' + F.fam[c[4]] : '') + ' · auto-play took ' + Math.round(c[2] / 10) + ' of 100 steps inside';
    b.addEventListener('click', function () { pickHood(h, false); });
    li.appendChild(b); ol.appendChild(li);
  });
}
/* the sound pill: one press starts my album; previews still take their turn (one sound at a time) */
/* the what strip: one plain line per act and the fixed key (mint star = my press, violet ring = auto-play, amber diamond = shuffle, ice dot = sounds alike, gold = my songs) */
var KG = { press: ['my press', '<path d="M6 .6Q6 6 11.4 6Q6 6 6 11.4Q6 6 .6 6Q6 6 6 .6Z" fill="#21f6bc"/>'], auto: ['auto-play', '<circle cx="6" cy="6" r="4.2" fill="none" stroke="#8b6fd6" stroke-width="1.6"/>'], shuffle: ['shuffle', '<path d="M6 .9L10.2 6L6 11.1L1.8 6Z" fill="#f5a623"/>'], alike: ['sounds alike', '<path d="M1.2 8.4L6 4.8L10.8 7.2" fill="none" stroke="#bcd3ff" stroke-width=".9"/><circle cx="6" cy="4.8" r="1.5" fill="#bcd3ff"/>'], mine: ['my songs', '<circle cx="6" cy="6" r="5" fill="none" stroke="#ffd36b" stroke-width=".9"/><path d="M6 2.1Q6 6 9.9 6Q6 6 6 9.9Q6 6 2.1 6Q6 6 6 2.1Z" fill="#ffd36b"/>'] }; /* the same marks as the walls kit's KEYS, scaled to 12 */
var WHAT = [
  ['every shape is an artist i played, colored by who pressed play. close together = sounds alike.', ['press', 'shuffle', 'auto', 'mine']],
  ['my 245 most played on a ring. a line = two artists often back to back. tap a name for its lines.', ['press', 'auto']],
  ['the same artists twice, colored by family. ice line = nearest in sound. a line = two plays in a row.', ['alike', 'press', 'auto']],
  ['eleven rooms the log built from what followed what. color = the family that fills each room most.', []],
  ['did the song stay in my library? split by who picked it.', ['press', 'auto']],
  ['the export i froze, then the months after it. did the habit hold?', ['press', 'shuffle', 'auto']],
  ['my 23 songs in gold, each beside the artist it sounds most like; behind them, the eleven rooms. tap one to play it.', ['mine', 'alike']]
];
function whatFor(k) {
  var w = WHAT[k] || WHAT[0], el = $('#what-k'), b = $('#b-hear'); if (!el) return; text('#what-l', w[0]);
  $$('#what-k .kc').forEach(function (e) { e.parentNode.removeChild(e); });
  var keys = w[1].slice(); if (S.now >= 0 && (isField(k) || k === C_HOODS) && keys.indexOf('alike') < 0) keys.push('alike');
  var KC = { press: '#21f6bc', auto: '#8b6fd6', shuffle: '#f5a623', alike: '#bcd3ff', mine: '#ffd36b' };
  keys.forEach(function (key) { var c = doc.createElement('span'); c.className = 'kc'; c.style.setProperty('--kcb', KC[key] + '73'); c.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true">' + KG[key][1] + '</svg>' + KG[key][0]; if (b && b.parentNode === el) el.insertBefore(c, b); else el.appendChild(c); });
}
(function () { var e = $('#np'); if (!e) return; var sx = 0, sy = 0, id = -1; if ('MutationObserver' in window) { new MutationObserver(function () { doc.documentElement.classList.toggle('sm-np', !e.hidden); }).observe(e, { attributes: true, attributeFilter: ['hidden'] }); }
  /* a desk with the drawer open: the what strip sits under the card (template: html.drawer.sm-np #what) */
  if ('ResizeObserver' in window) new ResizeObserver(function () { if (!phone && !e.hidden) doc.documentElement.style.setProperty('--npb', Math.round(e.getBoundingClientRect().bottom) + 'px'); }).observe(e); e.addEventListener('pointerdown', function (ev) { if (ev.pointerType === 'mouse') return; sx = ev.clientX; sy = ev.clientY; id = ev.pointerId; }, { passive: true }); ['pointerup', 'pointercancel'].forEach(function (t) { e.addEventListener(t, function () { id = -1; }, { passive: true }); }); e.addEventListener('pointermove', function (ev) { if (ev.pointerId !== id || !phone) return; var dx = ev.clientX - sx, dy = ev.clientY - sy; if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) { id = -1; e.hidden = true; if (pv && !pv.paused) { S.user = true; try { pv.pause(); } catch (x) { /* fine */ } S.playing = false; ppLabel(); } } }, { passive: true }); })();
/* contact: a small sheet with the address, never a bare hash jump */
function cpop(on) { var c = $('#cpop'); if (!c) return; c.hidden = !on; if (on) { c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); var x = $('#cp-x'); if (x) x.focus(); } else { c.removeAttribute('role'); c.removeAttribute('aria-modal'); } }
['#b-contact', '#b-contact2', '#b-contact3'].forEach(function (s) { var a = $(s); if (a) a.addEventListener('click', function (e) { e.preventDefault(); cpop(true); }); });
on('#cp-x', function () { cpop(false); });
on('#cpop', function (e) { if (e.target && e.target.id === 'cpop') cpop(false); });
on('#cp-copy', function () { var b = $('#cp-copy'); try { navigator.clipboard.writeText('astralcrestlab@proton.me').then(function () { text('#cp-copy', 'copied'); setTimeout(function () { text('#cp-copy', 'copy the address'); }, 1800); }); } catch (x) { if (b) b.textContent = 'select it above'; } });
addEventListener('keydown', function (e) { if (e.key === 'Escape') cpop(false); });
on('#b-hear', function () {
  var a = el(), alb = albumEl();
  if (anyOn()) { if (S.playing && a && !a.paused) { S.user = true; try { a.pause(); } catch (x) { /* fine */ } S.playing = false; } if (alb && !alb.paused) { var M = window.__smMusic; if (M && M.toggle) M.toggle(); else try { alb.pause(); } catch (x2) { /* fine */ } } hushWall(); clearTimeout(HT); HT = 0; setHear(false); ppLabel(); return; }
  try { localStorage.setItem('sm_sound', '1'); } catch (e2) { /* fine */ }
  if (html.classList.contains('sm-wall')) { var fr = $('#wr-f'); if (fr && fr.contentWindow) try { fr.contentWindow.postMessage({ sm: 'front', ev: 'start' }, location.origin); } catch (x3) { /* fine */ } return; }
  if (S.now >= 0) { sound(S.now); S.playing = true; ppLabel(); return; }
  var i = TOP[Math.floor(Math.random() * Math.min(12, TOP.length))]; if (i !== undefined) play(i, 'tap');
});
on('#b-sound', function () {
  var M = window.__smMusic; if (!M || !M.toggle) return; M.toggle();
  setTimeout(function () { var a = M.A && M.A.el; if (!a || a.paused) return; if (pv && !pv.paused) { S.user = true; pv.pause(); } var fr = $('#wr-f'); if (html.classList.contains('sm-wall') && fr && fr.contentWindow) try { fr.contentWindow.postMessage({ sm: 'front', ev: 'hush' }, location.origin); } catch (x) { /* fine */ } }, 450);
  var lab = function () { var a = M.A && M.A.el, on = a && !a.paused; text('#b-sound', on ? 'album playing' : 'my album'); html.classList.toggle('sm-album', !!on); };
  if (M.A && M.A.el && !M.A.el.__pill) { M.A.el.__pill = 1; ['play', 'pause', 'ended'].forEach(function (t) { M.A.el.addEventListener(t, lab); }); }
  setTimeout(lab, 400);
});
on('#g-start', startGame); on('#g-keep', function () { answer(true, false); }); on('#g-go', function () { answer(false, false); });
on('#w-start', whose); on('#b-begin', function () { var a = $('#a-count'); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); on('#w-me', function () { whAnswer(true); }); on('#w-app', function () { whAnswer(false); }); on('#w-h1', function () { whHear(0); }); on('#w-h2', function () { whHear(1); });
$$('[data-tm]').forEach(function (b) { b.addEventListener('click', function () { if (CL.list && CL.k >= 0 && CL.sc === scene) { clearTimeout(CL.to); clStep(); } else clStart(0); }); });
function songs() {
  var ol = $('#songs'); if (!ol) return;
  SONG.forEach(function (s, k) { var li = doc.createElement('li'), b = doc.createElement('button'); b.type = 'button'; b.className = 'sg'; b.innerHTML = '<b></b><span></span>'; b.firstChild.textContent = s.t.toLowerCase(); b.lastChild.textContent = 'beside ' + names[SNB[k]]; b.setAttribute('aria-label', 'my song ' + s.t.toLowerCase() + ', beside ' + names[SNB[k]]); b.addEventListener('click', function () { mine(k); }); li.appendChild(b); ol.appendChild(li); });
}
/* the acts: an observer names the act under the reading line; the dots rail follows it */
function acts() {
  var secs = $$('.act'), io = 'IntersectionObserver' in window, ft = $('footer.foot');
  if (io && ft && phone) new IntersectionObserver(function (es) { doc.documentElement.classList.toggle('sm-foot', es[0].isIntersecting); }, { threshold: 0.05 }).observe(ft);
  if (!io) return;
  var obs = new IntersectionObserver(function (es) {
    var best = null; es.forEach(function (e) { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; });
    if (best && !phone) { var k = secs.indexOf(best.target); if (k >= 0) { html.classList.toggle('sm-open', k === 0); setScene(Math.max(0, k - 1)); } }
  }, { rootMargin: phone ? '-62% 0px -18% 0px' : '-45% 0px -45% 0px', threshold: [0, 0.2, 0.5, 1] });
  secs.forEach(function (s) { obs.observe(s); });
  if (phone) {
    var SC = -1, SQ = 0;
    var byScroll = function () { SQ = 0; var line = innerHeight * 0.62, k = 0, i; for (i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top <= line) k = i; if (k !== SC) { SC = k; if (k === 0) { if (scrollY < 80) html.classList.add('sm-open'); } else html.classList.remove('sm-open'); setScene(Math.max(0, k - 1)); } };
    var ask = function () { if (!SQ) SQ = requestAnimationFrame(byScroll); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); setTimeout(byScroll, 50); setTimeout(byScroll, 900);
  }
  /* the scroll itself also names the act (the one under the reading line), so a jump or a late observer never leaves a stale act */
  var dots = $$('.dots a'); dots.forEach(function (a, k) { a.addEventListener('click', function (e) { e.preventDefault(); secs[k].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }); });
  secs.forEach(function (s, k) { new IntersectionObserver(function (es) { if (dots[k]) dots[k].classList.toggle('on', es[0].isIntersecting); }, { rootMargin: phone ? '-62% 0px -18% 0px' : '-45% 0px -45% 0px' }).observe(s); });
}
/* ---------- the ghost tile (act i drawer): one sampled sitting, two paths from the same start, in the act's own sound-map
   coordinates (front/data/ghost.json). drawn small inside the card, never on the field; no names, no dates, no number.
   the two lines below are the refereed wording: patch them here and nowhere else. ---------- */
var GHOST_LINE = 'the button walks to the nearest sound it has not played yet, every step, so it stays far closer than the path my listening took. that is the rule doing what it says, not a finding about me.';
var GHOST_CAP = 'one sitting of many, near the middle of the range; the button stays closer in nearly all of them.';
var GH = null, ghP = null, ghNear = !('IntersectionObserver' in window), ghDraw = function () {};
function ghost() {
  text('#gh-line', GHOST_LINE); text('#gh-cap', GHOST_CAP);
  var c = $('#gh-cv'); if (!c) return;
  if (!ghNear) new IntersectionObserver(function (es, io) { if (es[0].isIntersecting) { ghNear = true; io.disconnect(); ghDraw(); } }, { rootMargin: '900px 0px' }).observe(c);
  ghDraw = function () {
    var w = c.clientWidth, h = c.clientHeight; if (w < 10 || h < 10) return;
    if (!GH) { if (!ghNear) return; if (!ghP) ghP = fetchJ('ghost').then(function (j) { GH = j; ghDraw(); }, function () { ghP = null; }); return; }
    var d = Math.min(3, Math.max(1, window.devicePixelRatio || 1)), g = c.getContext('2d'), i;
    c.width = Math.round(w * d); c.height = Math.round(h * d); g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, w, h);
    /* the act's resting view: the same yaw, pitch and perspective as the field at rest */
    var cy = Math.cos(0.62), sy = Math.sin(0.62), cp = Math.cos(0.36), sp = Math.sin(0.36);
    var pj = function (x, y, z) { var x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, s = 2.6 / (y * sp + z1 * cp + 3.2); return [x1 * s, -y1 * s]; };
    var R = GH.r.map(function (q) { return pj(q[0] / 1000, q[1] / 1000, q[2] / 1000); }), Q2 = GH.g.map(function (q) { return pj(q[0] / 1000, q[1] / 1000, q[2] / 1000); });
    var x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    R.concat(Q2).forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    var k = Math.min((w - 40) / Math.max(1e-3, x1 - x0), (h - 40) / Math.max(1e-3, y1 - y0)), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    var X = function (v) { return Math.round(w / 2 + (v - mx) * k) + 0.5; }, Y = function (v) { return Math.round(h / 2 + (v - my) * k) + 0.5; };
    /* every artist in the field, one dim pixel each, for the ground */
    if (P3) { g.fillStyle = dim(ICE, 0.3); for (i = 0; i < N; i++) { var q = pj(P3[i * 3], P3[i * 3 + 1], P3[i * 3 + 2]), px = X(q[0]), py = Y(q[1]); if (px > 1 && py > 1 && px < w - 1 && py < h - 1) g.fillRect(px - 0.5, py - 0.5, 1, 1); } }
    var line = function (P, col) {
      g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
      P.forEach(function (q, j) { if (j) g.lineTo(X(q[0]), Y(q[1])); else g.moveTo(X(q[0]), Y(q[1])); }); g.stroke();
      g.fillStyle = col; P.forEach(function (q) { g.fillRect(X(q[0]) - 1.5, Y(q[1]) - 1.5, 3, 3); });
    };
    line(R, ICE); line(Q2, VIOLET);
    ring(g, X(R[0][0]), Y(R[0][1]), 6, INK, 1);
  };
  if ('ResizeObserver' in window) new ResizeObserver(function () { ghDraw(); }).observe(c);
  ghDraw();
}
ghost();
var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { fit(); wake(); }) : null;
fetchJ('field').then(function (j) {
  fit(); prep(j); fit();
  ghDraw();
  rimOrder = RING.map(function (r, k) { return k; }).sort(function (a, b) { var pa2 = RING[a][0] >= 0 ? PL[RING[a][0]] : 0, pb2 = RING[b][0] >= 0 ? PL[RING[b][0]] : 0; return pb2 - pa2; });
  html.setAttribute('data-scene', 'count');
  zcBuild(); songs(); key(); datalist(); chips(); acts(); if (ro) ro.observe(stage); else addEventListener('resize', function () { fit(); wake(); });
  $$('.lz').forEach(function (e) { e.hidden = true; });
  var R = (window.__ledger && window.__ledger.READY) || {}; R.field = true;
  whatFor(scene);

// the wall room: any wall link opens the wall inside the front, with a rail to walk the walls
var WALLS = [['loop','walk the loop'],['two','the two of you'],['taste','the taste test'],['haunted','the haunted night'],['seeds','the two seeds'],['undo','undo a year'],['blind','blind or named'],['booth','the confession booth'],['slow','the slow room'],['tug','tug of two hands'],['telephone','telephone'],['stutter','the stutter'],['meet','meet in the middle'],['hold','hold to keep'],['shake','shake the shuffle'],['pour','the pour'],['applause','clap to skip'],['way','draw the long way'],['stand','where you land'],['scrub','scrub by ear'],['longhold','the long hold'],['crossings','family crossings'],['radio','draw a radio'],['hand','whose finger'],['chorus','the chorus']];
var WR = { k: -1, was: '' };
function wallIdx(slug) { for (var i = 0; i < WALLS.length; i++) if (WALLS[i][0] === slug) return i; return -1; }
function wallOpen(slug, push) {
  var k = wallIdx(slug), box = $('#wallroom'); if (k < 0 || !box) return;
  if (S.game && S.game.on) endGame(false);
  var a = el(); WR.resume = !!(a && !a.paused); if (WR.resume) { S.user = true; try { a.pause(); } catch (x) { /* fine */ } S.playing = false; ppLabel(); }
  WR.k = k; duck(); box.hidden = false; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); document.documentElement.classList.add('sm-wall');
  $('#wr-n').textContent = 'wall ' + (k + 1) + ' of ' + WALLS.length; $('#wr-name').textContent = WALLS[k][1];
  var wf = $('#wr-full'); if (wf) wf.href = 'editions/' + slug + '/';
  var fr = $('#wr-f'); if (fr.getAttribute('src') !== 'editions/' + slug + '/') fr.src = 'editions/' + slug + '/';
  if (push !== false) { WR.was = location.hash; try { history.pushState({ wall: slug }, '', '#wall=' + slug); } catch (x) { /* fine */ } }
  $('#wr-x').focus();
  fr.onload = function () { try { fr.contentWindow.scrollTo(0, 0); } catch (x) { /* fine */ } };
}
function wallClose(pop) {
  var box = $('#wallroom'); if (!box || box.hidden) return;
  box.hidden = true; box.removeAttribute('role'); box.removeAttribute('aria-modal'); document.documentElement.classList.remove('sm-wall'); $('#wr-f').src = 'about:blank'; WR.k = -1; unduck();
  if (WR.resume) { WR.resume = false; var ra = el(); if (ra && ra.paused && !ra.ended && S.now >= 0) { S.user = false; var pr = ra.play(); if (pr && pr.catch) pr.catch(function () { /* fine */ }); S.playing = true; ppLabel(); } }
  if (!pop && /^#wall=/.test(location.hash)) { try { history.pushState(null, '', WR.was && !/^#wall=/.test(WR.was) ? WR.was : location.pathname); } catch (x) { /* fine */ } }
}
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a.wl, a.wk') : null; if (!a) return;
  var m = /editions\/([a-z]+)\//.exec(a.getAttribute('href') || ''); if (!m || wallIdx(m[1]) < 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault(); wallOpen(m[1]);
});
$('#wr-x').addEventListener('click', function () { wallClose(false); });
on('#wr-hear', function () { var b = $('#b-hear'); if (b) b.click(); });
ppLabel();
$('#wr-prev').addEventListener('click', function () { if (WR.k >= 0) wallOpen(WALLS[(WR.k + WALLS.length - 1) % WALLS.length][0]); });
$('#wr-next').addEventListener('click', function () { if (WR.k >= 0) wallOpen(WALLS[(WR.k + 1) % WALLS.length][0]); });
addEventListener('keydown', function (e) { if (WR.k < 0) return; if (e.key === 'Escape') wallClose(false); else if (e.key === 'ArrowRight') $('#wr-next').click(); else if (e.key === 'ArrowLeft') $('#wr-prev').click(); });
addEventListener('popstate', function () { var m = /^#wall=([a-z]+)$/.exec(location.hash); if (m) wallOpen(m[1], false); else wallClose(true); });
(function () { var m = /^#wall=([a-z]+)$/.exec(location.hash); if (m) setTimeout(function () { wallOpen(m[1], false); }, 300); })();
// the game of it: every wall you play is remembered on this phone; the play chip deals the next one, the rail counts, the pictures and chips mark what you played
var PLAYED = (function () { try { var j = JSON.parse(localStorage.getItem('sm_played') || '[]'); return j.filter(function (x) { return wallIdx(x) >= 0; }); } catch (e) { return []; } })();
function playedSave() { try { localStorage.setItem('sm_played', JSON.stringify(PLAYED)); } catch (e) { /* fine */ } }
function played(slug) { return PLAYED.indexOf(slug) >= 0; }
function unplayed() { return WALLS.map(function (w) { return w[0]; }).filter(function (x) { return !played(x); }); }
function dealOne(not) { var u = unplayed().filter(function (x) { return x !== not; }); if (!u.length) u = WALLS.map(function (w) { return w[0]; }).filter(function (x) { return x !== not; }); return u[Math.floor(Math.random() * u.length)]; }
function playedPaint() {
  var n = PLAYED.length, L = WALLS.length, all = n >= L, b = $('#b-walls'), bn = $('#b-play-n'), p = $('#wr-p');
  if (bn) bn.textContent = all ? 'all ' + L + ' played' : (n ? n + ' of ' + L + ' played' : 'play a wall');
  if (b) { b.classList.toggle('all', all); b.setAttribute('aria-label', all ? 'you played every wall. open the walls index' : 'play a wall you have not played yet, ' + n + ' of ' + L + ' played'); }
  if (p) p.textContent = n + ' of ' + L + ' played';
  $$('a.wl, a.wk').forEach(function (a) { var m = /editions\/([a-z]+)\//.exec(a.getAttribute('href') || ''); a.classList.toggle('did', !!(m && played(m[1]))); });
  var d = $('#wr-done'); if (d) d.hidden = !(WR.k >= 0 && played(WALLS[WR.k][0]));
}
function playedMark(slug) { if (wallIdx(slug) < 0 || played(slug)) return; PLAYED.push(slug); playedSave(); playedPaint(); }
var wrT = 0;
function wrArm() { clearTimeout(wrT); var k = WR.k; if (k < 0) return; wrT = setTimeout(function () { if (WR.k === k) playedMark(WALLS[k][0]); }, 45000); }
addEventListener('message', function (e) {
  var d = e.data; if (!d || d.sm !== 'wall' || WR.k < 0) return;
  if (d.ev === 'stop') { S.wallOn = false; ppLabel(); }
  else if (d.ev === 'end') { S.wallOn = false; ppLabel(); playedMark(WALLS[WR.k][0]); var nx = $('#wr-next'); if (nx) nx.classList.add('go'); var nm = $('#wr-name'); if (nm) nm.textContent = WALLS[WR.k][1] + '. next: ' + WALLS[(WR.k + 1) % WALLS.length][1]; }
  else if (d.ev === 'play') { S.wallOn = true; wrArm(); duck(); if (pv && !pv.paused) { S.user = true; pv.pause(); } ppLabel(); }
});
var _wallOpen = wallOpen;
wallOpen = function (slug, push) { _wallOpen(slug, push); var nx = $('#wr-next'); if (nx) nx.classList.remove('go'); wrArm(); playedPaint(); };
var _wallClose = wallClose;
wallClose = function (pop) { clearTimeout(wrT); S.wallOn = false; _wallClose(pop); playedPaint(); ppLabel(); };
(function () { var wd = $('#wr-deal'); if (wd) wd.addEventListener('click', function () { wallOpen(dealOne(WR.k >= 0 ? WALLS[WR.k][0] : '')); }); })();
(function () { var b = $('#b-walls'); if (!b) return; b.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey) return; if (PLAYED.length >= WALLS.length) return; e.preventDefault(); wallOpen(dealOne('')); }); })();
playedPaint();
  window.__field = { fits: function () { return FITS; }, demo: function () { return DEMO; }, S: S, n: function () { return N; }, pv: function () { return pv; }, scene: function () { return scene; }, at: function (i) { var o = [0, 0, 0, 0]; place(scene, i, o); return o; }, top: function () { return TOP; }, reveal: function () { return reveal; }, grow: function () { reveal = 8; wake(); }, hoods: function () { return MAPS ? MAPS.cm.length : 0; }, ring: function () { return { look: S.look, b: S.lookB, rl: !!RL, x: Array.prototype.slice.call(RPX), y: Array.prototype.slice.call(RPY) }; }, cl: function () { return { k: CL.k, n: CL.list ? CL.list.length : 0, one: CL.one ? CL.one.t : '', box: CLB }; }, tell: function () { clStart(0); }, view: function () { return { z: view.z, px: view.px, py: view.py }; }, line: function () { var L = S.line; if (!L) return null; var o = [0, 0], pts = [], k; for (k = 0; k < L.c.length; k++) { lineXY(L, L.c[k], o); pts.push([o[0], o[1]]); } return { pts: pts, field: L.c.slice(0, 3).map(function (p) { return [p[0], p[1]]; }), stops: L.stops.map(function (i) { return [SX[i], SY[i]]; }) }; } };
  wake(); DEMO.last = performance.now(); if (!phone) clStart(400);
  if (!lite()) { if (window.requestIdleCallback) requestIdleCallback(prefetchPV, { timeout: 4000 }); else setTimeout(prefetchPV, 2500); }
}, function () { var h = $('#hint'); if (h) h.textContent = 'the map did not load here. the story is below.'; });
function lite() { try { return !!(navigator.connection && navigator.connection.saveData); } catch (e) { return false; } }
})();
/* the glossary: every dotted term (<dfn data-g>) opens one small night box with a plain definition from front/data/gloss.json.
   hover on a desk, tap on a phone, focus from the keyboard. the box stays inside the card or drawer that holds the term,
   above or below it, never over the field. */
(function () {
'use strict';
var doc = document, ST = (window.__front && window.__front.stamps) || {}, G = null, gP = null, box = null, cur = null, want = null, pt = 'mouse';
function load() {
  if (!gP) gP = fetch('front/data/gloss.json?v=' + (ST.gloss || '0'), { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('gloss ' + r.status); return r.json(); }).then(function (j) { G = (j && j.g) || {}; return G; }, function () { gP = null; return null; });
  return gP;
}
function mk() { if (!box) { box = doc.createElement('p'); box.id = 'gl'; box.setAttribute('role', 'tooltip'); box.hidden = true; doc.body.appendChild(box); } return box; }
function hide() { want = null; if (cur) { cur.classList.remove('on'); cur.removeAttribute('aria-describedby'); } cur = null; if (box) box.hidden = true; }
function place(el) {
  var rs = el.getClientRects(); if (!rs.length) { hide(); return; }
  var r = el.getBoundingClientRect(), dr = el.closest('.dr'), host = dr || el.closest('.plate') || doc.getElementById('col') || doc.body, hb = host.getBoundingClientRect();
  var top = Math.max(0, hb.top), bot = Math.min(innerHeight, hb.bottom), lft = Math.max(0, hb.left) + 8, rgt = Math.min(innerWidth, hb.right) - 8, st = doc.getElementById('stage');
  if (!dr && st && innerWidth < 900) top = Math.max(top, st.getBoundingClientRect().bottom); /* a phone: the field owns the top of the screen */
  if (r.bottom < top || r.top > bot) { hide(); return; }
  var bx = mk(); bx.style.maxWidth = Math.max(160, Math.min(300, rgt - lft)) + 'px'; bx.hidden = false;
  var bw = bx.offsetWidth, bh = bx.offsetHeight, x = Math.max(lft, Math.min(rs[0].left, rgt - bw)), y = r.bottom + 6;
  if (y + bh > bot - 4) { var ya = r.top - 6 - bh; y = ya >= top + 4 ? ya : Math.max(top + 4, bot - bh - 4); }
  bx.style.left = Math.round(x) + 'px'; bx.style.top = Math.round(y) + 'px';
}
function show(el) {
  want = el;
  load().then(function () {
    if (want !== el || !G || !G[el.getAttribute('data-g')]) return;
    if (cur && cur !== el) { cur.classList.remove('on'); cur.removeAttribute('aria-describedby'); }
    cur = el; el.classList.add('on'); el.setAttribute('aria-describedby', 'gl');
    var bx = mk(), t = G[el.getAttribute('data-g')], c = t.indexOf(': ');
    bx.textContent = '';
    if (c > 0 && c < 48) { var b = doc.createElement('b'); b.textContent = t.slice(0, c + 1); bx.appendChild(b); bx.appendChild(doc.createTextNode(' ' + t.slice(c + 2))); } else bx.textContent = t;
    place(el);
  });
}
function dfnOf(e) { var t = e.target; return t && t.closest ? t.closest('dfn[data-g]') : null; }
Array.prototype.forEach.call(doc.querySelectorAll('dfn[data-g]'), function (d) { if (!d.closest('summary')) d.tabIndex = 0; });
doc.addEventListener('pointerdown', function (e) { pt = e.pointerType || 'mouse'; }, true);
doc.addEventListener('pointerover', function (e) { if (e.pointerType !== 'mouse') return; var d = dfnOf(e); if (d) show(d); });
doc.addEventListener('pointerout', function (e) { if (e.pointerType !== 'mouse') return; var d = dfnOf(e); if (d && (d === cur || d === want) && !(e.relatedTarget && d.contains(e.relatedTarget))) hide(); });
doc.addEventListener('click', function (e) {
  var d = dfnOf(e);
  if (d) { e.preventDefault(); if (pt === 'mouse') show(d); else if (cur === d) hide(); else show(d); return; } /* in a card's summary, a term never folds the card */
  if (cur && pt !== 'mouse') hide();
}, true);
doc.addEventListener('focusin', function (e) { var d = dfnOf(e); if (d) show(d); });
doc.addEventListener('focusout', function (e) { var d = dfnOf(e); if (d && d === cur) hide(); });
doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) { hide(); e.stopPropagation(); } }, true);
addEventListener('scroll', function () { if (cur) { if (pt === 'mouse') hide(); else place(cur); } }, { capture: true, passive: true });
addEventListener('resize', hide);
setTimeout(load, 1500);
})();
