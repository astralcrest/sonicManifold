/* the landing's engine. the month counts (TAP, SHU, SRV) are inlined in index.html (the page fetches nothing).
   one groove of every play, drawn once in four layers (all, then one per hand that pressed play); a live comet
   reads the groove play by play; the record turns slowly, tilts with the device or the pointer, and answers a finger;
   scroll lights one hand at a time; the three doors preview where they go. r11: the needle is a scrubber (the numbers recount to wherever it sits), a press blooms ink from the finger, a flick of the page spins the record up and smears it, the page's light takes the hue of the hand under the needle. reduced motion = one still frame. */
(function () {
'use strict';
var TAP = window.TAP, SHU = window.SHU, SRV = window.SRV;
var D0 = document, $ = function (s, r) { return (r || D0).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || D0).querySelectorAll(s)); };
var root = D0.documentElement, disc = $('.disc'), cv = $('#groove'), lab = $('.label'), plat = $('.platter'), live = $('#live'), stage = $('.stage'), tilt = $('.tilt'), rd = $('.read b');
if (!TAP || !cv || !cv.getContext || !disc || !lab || !plat) return;
var reduce = false, hov = true, gam = false;
try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; hov = matchMedia('(hover:hover)').matches; gam = matchMedia('(color-gamut: p3)').matches; } catch (e) {}
var NM = TAP.length, N = 0, m, i, j, k;
for (m = 0; m < NM; m++) N += TAP[m] + SHU[m] + SRV[m];
/* play by play in month order: 0 tapped, 1 shuffle, 2 the queue. a month is drawn as three runs in order (tapped, shuffle, queue) at its exact counts: the month's share as arc length */
var ARM = new Uint8Array(N), MON = new Uint8Array(N), MST = new Uint32Array(NM + 1), seed = 0x2f6b4e1d;
function rnd() { seed = seed + 0x6d2b79f5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
for (m = 0, i = 0; m < NM; m++) {
  var a0 = i, c = [TAP[m], SHU[m], SRV[m]]; MST[m] = i;
  for (k = 0; k < 3; k++) for (j = 0; j < c[k]; j++) { ARM[i] = k; MON[i++] = m; }
}
MST[NM] = N;
var C0 = new Uint32Array(N + 1), C1 = new Uint32Array(N + 1), C2 = new Uint32Array(N + 1);
for (i = 0; i < N; i++) { C0[i + 1] = C0[i] + (ARM[i] === 0 ? 1 : 0); C1[i + 1] = C1[i] + (ARM[i] === 1 ? 1 : 0); C2[i + 1] = C2[i] + (ARM[i] === 2 ? 1 : 0); }
/* image words (a b g r): mint, amber, violet; and the lit twin of each for the isolating layers */
var COL = new Uint32Array([0xe6bcf621, 0xe623a6f5, 0xe6d66f8b]), COH = new Uint32Array([0xffe4ffd0, 0xff9ad8ff, 0xffff8ca9]);
var TH0 = 0.6857, ms = 0, G = {}, PX = new Uint16Array(N), PY = new Uint16Array(N), HI = $$('.hi');
var CTX = ['#21f6bc', '#f5a623', '#8b6fd6'], CP3 = ['0.18 1 0.74', '1 0.69 0.18', '0.55 0.4 0.98'];
function ctx2(c) {
  var g = null;
  if (gam) { try { g = c.getContext('2d', { colorSpace: 'display-p3' }); } catch (e) {} }
  return g || c.getContext('2d');
}
/* a canvas colour in display-p3 where the canvas understands it, else the sRGB hex */
function paint(g, k, a) {
  var s = '#000'; g.fillStyle = s;
  if (gam) { g.fillStyle = 'color(display-p3 ' + CP3[k] + ' / ' + a + ')'; if (g.fillStyle !== '#000000') return; }
  var h = CTX[k]; g.fillStyle = 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
}
function draw() {
  var r = disc.getBoundingClientRect(); if (r.width < 40) return;
  var t0 = performance.now(), dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3), D = Math.min(Math.round(r.width * dpr), 1800), c = D / 2, ed = D / r.width;
  var layers = [cv].concat(HI), imgs = [], pxs = [], g = [];
  for (k = 0; k < 4; k++) {
    if (layers[k].width !== D) { layers[k].width = D; layers[k].height = D; }
    g[k] = ctx2(layers[k]);
    imgs[k] = g[k].createImageData(D, D); pxs[k] = new Uint32Array(imgs[k].data.buffer);
  }
  var px = pxs[0];
  var R1 = c * 0.954, R0 = Math.min(R1 * 0.85, lab.getBoundingClientRect().width / 2 * ed + c * 0.05), KD = (R1 * R1 - R0 * R0) / N, A = Math.PI * KD, p = Math.max(1.25, Math.sqrt(A)), s = A / p, TW = 6.283185307179586 / p,
    K = R1 * R1, pr = R1, cs = Math.cos(TH0), sn = Math.sin(TH0), x, y, rr, dl, cd, sd, t2, col, coh, hp, w, u, v, a, b, o, bx, by, x0, y0, ix, kx = 65535 / D,
    BA = [s * 0.22, s * 0.19, s * 0.4], BB = [p * 0.4, p * 0.19, p * 0.22], OA = s * 0.22, OB = p * 0.22;
  for (i = 0; i < N; i++) {
    rr = Math.sqrt(K - KD * (i + 0.5)); dl = (pr - rr) * TW; pr = rr; cd = 1 - dl * dl * 0.5; sd = dl - dl * dl * dl / 6; t2 = cs * cd + sn * sd; sn = sn * cd - cs * sd; cs = t2;
    if ((i & 4095) === 0) { t2 = 1 / Math.sqrt(cs * cs + sn * sn); cs *= t2; sn *= t2; }
    t2 = rr + (Math.imul(i, 0x9e3779b1) / 4294967296) * p * 0.9; x = c + t2 * cs; y = c + t2 * sn; PX[i] = x * kx; PY[i] = y * kx;
    w = ARM[i]; col = COL[w]; coh = COH[w]; hp = pxs[w + 1]; a = BA[w]; b = BB[w];
    for (o = (w === 1 ? 1 : 0); o >= (w === 1 ? -1 : 0); o -= 2) {
      x0 = x + o * (OB * cs - OA * sn); y0 = y + o * (OA * cs + OB * sn);
      for (u = -a; u <= a; u += 0.7) { bx = x0 - u * sn; by = y0 + u * cs; for (v = -b; v <= b; v += 0.7) { ix = ((by + v * sn) | 0) * D + ((bx + v * cs) | 0); px[ix] = col; hp[ix] = coh; } }
    }
  }
  for (k = 0; k < 4; k++) g[k].putImageData(imgs[k], 0, 0);
  cv.className = 'on';
  ms = performance.now() - t0;
  G = { d: D, dpr: ed, r0: R0, r1: R1, pitch: p, step: s, turns: (R1 - R0) / p, K: K, KD: KD };
  sizeLive();
}
/* ---------------------------------------------------------------- the live layer: a comet reading the groove */
var wavg = 0, wmax = 0, LD = 0, lg = null, head = 0, scrub = -1, lowq = 0, wsum = 0, wn = 0;
function sizeLive() {
  if (!live) return;
  var r = disc.getBoundingClientRect(); LD = Math.round(r.width * Math.min(window.devicePixelRatio || 1, 2));
  if (live.width !== LD) { live.width = LD; live.height = LD; }
  lg = ctx2(live); still();
}
function comet(g, S, hd, W, iso, off, step) {
  var kk = S / 65535, nb = 4, bw = W / nb, b, t, e, from, to, z, sz = Math.max(1.5, S / 300);
  g.globalCompositeOperation = 'lighter';
  for (b = 0; b < nb; b++) {
    to = hd - b * bw; from = to - bw; if (to < 0) break; if (from < 0) from = 0;
    var al = (1 - b / nb) * (1 - b / nb) * 0.62 + 0.03, zz = sz * (1.7 - b * 0.22);
    for (t = 0; t < 3; t++) {
      if (iso >= 0 && iso !== t) continue;
      g.beginPath();
      for (z = from | 0; z < to; z += step) if (ARM[z] === t) g.rect(PX[z] * kk - zz / 2 + off, PY[z] * kk - zz / 2 + off, zz, zz);
      paint(g, t, al); g.fill();
    }
  }
  var hx = PX[hd | 0] * kk + off, hy = PY[hd | 0] * kk + off, rg = g.createRadialGradient(hx, hy, 0, hx, hy, S * 0.045);
  rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.25, 'rgba(190,250,235,.5)'); rg.addColorStop(1, 'rgba(190,250,235,0)');
  g.fillStyle = rg; g.fillRect(hx - S * 0.05, hy - S * 0.05, S * 0.1, S * 0.1);
  g.globalCompositeOperation = 'source-over';
}
var iso = -1;
function band(g, S, a, b) {
  var kk = S / 65535, zz = Math.max(2, S / 200), t, z;
  g.globalCompositeOperation = 'lighter';
  for (t = 0; t < 3; t++) { g.beginPath(); for (z = a; z < b; z++) if (ARM[z] === t) g.rect(PX[z] * kk - zz / 2, PY[z] * kk - zz / 2, zz, zz); paint(g, t, 0.97); g.fill(); }
  g.globalCompositeOperation = 'source-over';
}
function paintLive() {
  if (!lg || !LD) return;
  lg.clearRect(0, 0, LD, LD);
  if (scrub >= 0) { var sc = Math.min(N - 1, scrub | 0), mm = MON[sc]; band(lg, LD, MST[mm], MST[mm + 1]); comet(lg, LD, sc, 120, -1, 0, 1); return; }
  var W = iso >= 0 ? 2800 : 1500;
  if (lowq) W *= 0.5;
  comet(lg, LD, Math.min(N - 1, head), W, iso, 0, lowq ? 2 : 1);
}
function still() { head = N * 0.62; paintLive(); fmt(); }
var lastRd = -1;
function fmt() { if (!rd) return; var v = Math.round((scrub >= 0 ? scrub : head) / 100) * 100; if (v !== lastRd) { lastRd = v; rd.textContent = (v < 1 ? 1 : v).toLocaleString('en-US'); } }
/* ---------------------------------------------------------------- the loop: turn, tilt, comet. one rAF, paused off screen */
var wind = 0, shown = N, fastOn = 0, fr = 0, wr = 0, wg = 0, wb = 0, wr2 = 0, wg2 = 0, wb2 = 0, docH = 1, lastDs = -2, busy = 0, ang = 0, raf = 0, dropT = 0, last = 0, running = false, vis = true, tx = 0, ty = 0, gx = 0, gy = 0, sx = 0, sy = 0, sv = 0, lastY = scrollY, g0 = null, useG = false, skip = 0;
var IDLE = 0.0045;
function frame(now) {
  raf = 0; if (!running) return;
  var dt = Math.min(48, now - (last || now)); last = now;
  var t0 = performance.now(), spd = IDLE + Math.min(0.45, Math.abs(sv)) * (sv < 0 ? -1 : 1);
  sv *= 0.94;
  var sm = Math.min(1, Math.abs(sv) / 0.28);
  if (sm > 0.14) { plat.style.setProperty('--sm', (sm * 2.4).toFixed(2) + 'px'); if (!fastOn) { fastOn = 1; plat.classList.add('fast'); } } else if (fastOn) { fastOn = 0; plat.classList.remove('fast'); }
  if (wind) { var wp = (now - wind) / 1900; if (wp >= 1) { wind = 0; scrub = -1; head = 0; } else scrub = (1 - Math.pow(1 - wp, 3)) * (N - 1); }
  if (busy) { var e = now - dropT, v = e < 400 ? 0 : Math.min(1, (e - 400) / 650); spd = IDLE + v * (0.2 - IDLE); }
  ang += spd * dt; plat.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
  /* tilt: the device when it speaks, else the pointer; a small lerp so it floats */
  var ttx = useG ? gx : sx, tty = useG ? gy : sy;
  tx += (ttx - tx) * 0.09; ty += (tty - ty) * 0.09;
  if (tilt) { tilt.style.setProperty('--tx', tx.toFixed(2)); tilt.style.setProperty('--ty', ty.toFixed(2)); }
  head += (N / 46000) * dt * (iso >= 0 ? 1.7 : 1); if (head >= N) head = 0;
  if (!(lowq && (skip ^= 1))) paintLive();
  fmt(); frameFx(now);
  var wk = performance.now() - t0; wsum += wk; wavg = wavg * 0.95 + wk * 0.05; wmax = Math.max(wmax * 0.99, wk); if (++wn === 90) { lowq = wsum / wn > 6 ? 1 : lowq; wsum = 0; wn = 0; }
  raf = requestAnimationFrame(frame);
}
function start() { if (reduce || running || !vis || D0.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
/* the pointer: tilts the record, and a finger or a press reads it by radius */
function toRad(ev) {
  var r = disc.getBoundingClientRect(), dx = ev.clientX - r.left - r.width / 2, dy = ev.clientY - r.top - r.height / 2, f = Math.sqrt(dx * dx + dy * dy) / (r.width / 2);
  if (!G.K) return -1;
  var rr = f * G.d / 2; if (rr > G.r1 || rr < G.r0) return -1;
  return Math.max(0, Math.min(N - 1, (G.K - rr * rr) / G.KD));
}
var deckEl = $('.deck'), scr = $('#scr'), scrAct = 0, scrT = 0;
/* the needle is a scrubber: wherever it sits (finger, hover, the slider, arrow keys) the numbers above recount to that play */
function setScrub(v) {
  var was = scrub >= 0; scrub = v; if (!reduce && !running) { vis = true; start(); }
  if (was !== v >= 0) stage.classList.toggle('scrubbing', v >= 0);
  if (reduce) { shown = v >= 0 ? v + 1 : N; setLede(shown); paintLive(); doorsFollow(); armTo(v >= 0 ? v : head, 1); }
}
/* the tonearm is the hand: its stylus sits on the groove at the radius being read (the comet, or the finger), found by bisection on the arm's own geometry */
var ARMSW = $('.arm .sw'), armTh = -99, armOff = 0, armAt = 0;
function tipD(th) { var q = (th - 4.09) * 0.017453292519943295, c = Math.cos(q), s = Math.sin(q), vx = -2.6, vy = 69.6; return Math.sqrt(Math.pow(101 + c * vx - s * vy - 50, 2) + Math.pow(12 + s * vx + c * vy - 50, 2)); }
function armTo(i, snap, now) {
  if (!ARMSW || armOff || !G.K) return;
  /* eased by time, not by frame: a slow frame (a loaded machine, a throttled tab) still lands the arm in the same span */
  var dt = now && armAt ? Math.min(200, now - armAt) : 16.7; if (now) armAt = now;
  var rho = Math.sqrt(Math.max(0, G.K - G.KD * (Math.min(N - 1, i) + 0.5))) / (G.d / 2) * 50, lo = 0, hi = 50, m2, k3;
  for (k3 = 0; k3 < 18; k3++) { m2 = (lo + hi) / 2; if (tipD(m2) > rho) lo = m2; else hi = m2; }
  armTh = armTh === -99 || snap ? m2 : armTh + (m2 - armTh) * (1 - Math.pow(0.78, dt / 16.7));
  ARMSW.style.transition = 'none'; ARMSW.style.transform = 'rotate(' + armTh.toFixed(2) + 'deg)';
}
function armFree() { armOff = 1; if (ARMSW) { ARMSW.style.transition = ''; ARMSW.style.transform = ''; } }
var FB = $$('#finding b'), FT = FB.map(function (e) { return e.textContent; }), fnd = $('#finding'), lp = '', lpc = 0;
function lockW() { FB.forEach(function (e, z) { e.style.minWidth = ''; e.textContent = FT[z]; e.style.minWidth = e.getBoundingClientRect().width + 'px'; }); lp = ''; }
function setLede(n) {
  if (!fnd || FB.length < 2) return;
  if (n >= N - 0.5) { if (lpc) { FB.forEach(function (e, z) { e.textContent = FT[z]; }); fnd.classList.remove('cnt'); lpc = 0; lp = ''; } return; }
  var pl = Math.max(1, Math.round(n)), k0 = Math.round(100 * C0[pl] / pl) + '%|' + pl;
  if (k0 === lp) return; lp = k0; lpc = 1;
  FB[0].textContent = pl.toLocaleString('en-US'); FB[1].textContent = k0.split('|')[0]; fnd.classList.add('cnt');
}
if (scr) {
  var relScr = function () { clearTimeout(scrT); scrAct = 0; setScrub(-1); };
  scr.addEventListener('input', function () { wind = 0; scrAct = 1; setScrub(scr.value / 1000 * (N - 1)); clearTimeout(scrT); scrT = setTimeout(relScr, 1800); });
  ['pointerup', 'pointercancel', 'blur'].forEach(function (n) { scr.addEventListener(n, function () { if (scrAct) relScr(); }); });
}
/* a press: ink halftone spreads from the finger over the groove, in the hand of the plays under each dot */
var bl = $('#bloom'), bg = null, bs = { on: 0, rel: 0, x: 0.5, y: 0.5, t0: 0 }, BUF = [new Float32Array(5200), new Float32Array(5200), new Float32Array(5200)];
function bpt(ev) { var r = disc.getBoundingClientRect(); bs.x = (ev.clientX - r.left) / r.width; bs.y = (ev.clientY - r.top) / r.height; }
function bdraw(now) {
  if (!bl || !G.K) return;
  var D = Math.round(disc.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2));
  if (bl.width !== D) { bl.width = D; bl.height = D; bg = null; }
  bg = bg || ctx2(bl); bg.clearRect(0, 0, D, D);
  var t = (now - bs.t0) / 1000, al = bs.on ? 1 : Math.max(0, 1 - (now - bs.rel) / 520);
  if (al <= 0) { bs.rel = 0; return; }
  var R = 1.2 * (1 - Math.exp(-t * 2.4)), R2 = 1.2 * (1 - Math.exp(-Math.max(0, t - 0.45) * 2.4)), c = D / 40, rows = Math.ceil(D / (c * 0.866)), cols = Math.ceil(D / c), cx = bs.x * D, cy = bs.y * D, n = [0, 0, 0], gx2, gy2, x, y, dd, ag, ag2, sz, rr, ix, h, arm, bf;
  var lo = G.r0 / G.d, hi = G.r1 / G.d;
  for (gy2 = 0; gy2 < rows; gy2++) for (gx2 = 0; gx2 < cols; gx2++) {
    x = (gx2 + (gy2 & 1 ? 0.5 : 0)) * c; y = gy2 * c * 0.866;
    rr = Math.sqrt((x - D / 2) * (x - D / 2) + (y - D / 2) * (y - D / 2)) / D; if (rr < lo || rr > hi) continue;
    dd = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / D; ag = R - dd; if (ag <= 0) continue; ag2 = R2 - dd;
    sz = c * (0.5 * Math.exp(-ag * 9) + 0.12 * Math.exp(-ag * 1.8) + 0.3 * Math.exp(-dd * 3.2) + (ag2 > 0 ? 0.3 * Math.exp(-ag2 * 11) : 0)); if (sz < 0.4) continue;
    h = (Math.imul(gy2 * 977 + gx2, 0x9e3779b1) >>> 0) / 4294967296;
    ix = (G.K - rr * rr * G.d * G.d) / G.KD + (h - 0.5) * 900; ix = ix < 0 ? 0 : ix > N - 1 ? N - 1 : ix | 0;
    arm = ARM[ix]; bf = BUF[arm]; if (n[arm] < 5196) { bf[n[arm]++] = x; bf[n[arm]++] = y; bf[n[arm]++] = sz; }
  }
  bg.globalCompositeOperation = 'lighter';
  for (var k2 = 0; k2 < 3; k2++) {
    bg.beginPath(); bf = BUF[k2];
    for (var q = 0; q < n[k2]; q += 3) { bg.moveTo(bf[q] + bf[q + 2], bf[q + 1]); bg.arc(bf[q], bf[q + 1], bf[q + 2], 0, 6.2832); }
    paint(bg, k2, 0.78 * al); bg.fill();
  }
  bg.globalCompositeOperation = 'source-over';
}
var gc = $('#gauge'), gg = null, gz = { on: 0, g: -1, p: 0, a: 0, t0: 0, fade: 0 };
function gaugeDraw() {
  if (!gc || !G.K) return;
  var D = Math.round(disc.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2));
  if (gc.width !== D) { gc.width = D; gc.height = D; gg = null; }
  gg = gg || ctx2(gc); gg.clearRect(0, 0, D, D);
  if (gz.g < 0 || gz.a <= 0) return;
  var r = D / 2 * 0.975, st = -1.5707963, f = [C0[N] / N, C1[N] / N, C2[N] / N], q = gz.p, c0 = 0, k4, e;
  gg.lineWidth = D * 0.024; gg.lineCap = 'butt'; gg.globalAlpha = gz.a;
  gg.strokeStyle = 'rgba(240,234,255,.12)'; gg.beginPath(); gg.arc(D / 2, D / 2, r, 0, 6.2832); gg.stroke();
  for (k4 = 0; k4 < 3; k4++) {
    e = Math.min(q, c0 + f[k4]);
    if (e > c0) { paint(gg, k4, 1); gg.strokeStyle = gg.fillStyle; gg.beginPath(); gg.arc(D / 2, D / 2, r, st + c0 * 6.2832, st + e * 6.2832); gg.stroke(); }
    c0 += f[k4];
  }
  var ta = st + gz.g * 6.2832, c1 = Math.cos(ta), s1 = Math.sin(ta);
  gg.strokeStyle = '#f0eaff'; gg.lineWidth = Math.max(2, D * 0.011); gg.beginPath(); gg.moveTo(D / 2 + c1 * (r - D * 0.04), D / 2 + s1 * (r - D * 0.04)); gg.lineTo(D / 2 + c1 * (r + D * 0.022), D / 2 + s1 * (r + D * 0.022)); gg.stroke();
  gg.globalAlpha = 1;
}
function gaugeTick(now) {
  if (gz.t0) { var u = Math.min(1, (now - gz.t0) / 1500); gz.p = 1 - Math.pow(1 - u, 3); }
  if (gz.fade) { gz.a = Math.max(0, 1 - (now - gz.fade) / 800); if (gz.a <= 0) { gz.on = 0; gz.g = -1; gz.t0 = 0; gz.fade = 0; } }
  gaugeDraw();
}
function gaugeGuess(v) { if (gz.t0 || gz.fade) return; gz.g = v / 100; gz.p = 0; gz.a = 0.75; gz.on = !reduce; gaugeDraw(); }
function gaugeLock(v) { gz.g = v / 100; gz.a = 1; gz.fade = 0; if (reduce) { gz.p = 1; gaugeDraw(); } else { gz.p = 0; gz.t0 = performance.now(); gz.on = 1; } }
function gaugeEnd() { if (reduce) { gz.g = -1; gaugeDraw(); } else gz.fade = performance.now(); }
if (deckEl) {
  deckEl.addEventListener('pointermove', function (ev) { if (bs.on) bpt(ev); if (ev.pointerType !== 'mouse' && !ev.buttons && ev.pressure === 0) return; wind = 0; setScrub(toRad(ev)); });
  deckEl.addEventListener('pointerdown', function (ev) { wind = 0; setScrub(toRad(ev)); if (!reduce && ev.button < 1) { bpt(ev); bs.on = 1; bs.rel = 0; bs.t0 = performance.now(); start(); } });
  ['pointerleave', 'pointerup', 'pointercancel'].forEach(function (n) { deckEl.addEventListener(n, function () { if (bs.on) { bs.on = 0; bs.rel = performance.now(); } if (!scrAct) { setScrub(-1); if (reduce) still(); } }); });
}
/* the page's light: the hue of the hand under the needle, a window of plays around it; the stage glow and a slow wash behind the copy both take it */
var WASH = $('.wash'), RGB = [[33, 246, 188], [245, 166, 35], [139, 111, 214]];
function mixAt(hd, w, o) {
  var b = Math.min(N, Math.max(w, hd | 0)), a = b - w, t0 = C0[b] - C0[a], t1 = C1[b] - C1[a], t2 = C2[b] - C2[a], tt = t0 + t1 + t2 || 1;
  o[0] = (t0 * RGB[0][0] + t1 * RGB[1][0] + t2 * RGB[2][0]) / tt; o[1] = (t0 * RGB[0][1] + t1 * RGB[1][1] + t2 * RGB[2][1]) / tt; o[2] = (t0 * RGB[0][2] + t1 * RGB[1][2] + t2 * RGB[2][2]) / tt;
}
var mo = [0, 0, 0], wInit = 0;
/* the record's own halo takes the hue of the hand under the needle (provenance colour, on the record only); the page wash behind the copy stays neutral and just drifts with the needle */
function washTo(hd, snap) {
  mixAt(hd, 2600, mo);
  var l = snap || !wInit ? 1 : 0.1;
  if (!wInit && WASH) { WASH.style.setProperty('--wh', 'rgba(134,203,254,.1)'); WASH.style.setProperty('--wh2', 'rgba(189,166,255,.075)'); }
  wInit = 1; wr += (mo[0] - wr) * l; wg += (mo[1] - wg) * l; wb += (mo[2] - wb) * l;
  stage.style.setProperty('--wh', 'rgba(' + (wr | 0) + ',' + (wg | 0) + ',' + (wb | 0) + ',.3)');
  if (WASH) { var sy = Math.min(1, scrollY / Math.max(1, docH - innerHeight)); WASH.style.setProperty('--wx', (14 + 26 * (0.5 + 0.5 * Math.sin(hd / N * 6.2832 * 2 + sy * 3))).toFixed(1) + '%'); WASH.style.setProperty('--wy', (10 + 70 * sy).toFixed(1) + '%'); }
}
function frameFx(now) {
  fr++; armTo(scrub >= 0 ? scrub : head, 0, now);
  if (gz.on) gaugeTick(now);
  var want = scrub >= 0 ? scrub + 1 : N;
  if (Math.abs(want - shown) > 0.5) { shown += (want - shown) * (scrub >= 0 ? 0.35 : 0.12); if (Math.abs(want - shown) < N * 0.0015) shown = want; setLede(shown); }
  if (scr && !scrAct && !(fr & 3)) scr.value = ((scrub >= 0 ? scrub : head) / N * 1000) | 0;
  if (!(fr & 3)) washTo(scrub >= 0 ? scrub : head);
  if (bs.on || bs.rel) bdraw(now);
  if (scrub !== lastDs && !(fr & 1)) { lastDs = scrub; doorsFollow(); }
}
function doorsFollow() { if (typeof DOORS !== 'undefined') DOORS.forEach(function (d) { if (d.vis && !d.on) dpaint(d, 0); }); }
if (!reduce) {
  addEventListener('pointermove', function (ev) { if (ev.pointerType === 'mouse' && !useG) { sx = (ev.clientX / innerWidth - 0.5) * 2 * 7; sy = -(ev.clientY / innerHeight - 0.5) * 2 * 5; } }, { passive: true });
  var onOri = function (ev) {
    if (ev.gamma == null || ev.beta == null) return;
    if (!g0) g0 = { b: ev.beta, g: ev.gamma };
    useG = true; gx = Math.max(-9, Math.min(9, (ev.gamma - g0.g) * 0.35)); gy = Math.max(-7, Math.min(7, -(ev.beta - g0.b) * 0.3));
  };
  var askOri = function () {
    removeEventListener('pointerdown', askOri);
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') addEventListener('deviceorientation', onOri); }).catch(function () {});
      }
    } catch (e) {}
  };
  if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') addEventListener('pointerdown', askOri, { once: false });
    else addEventListener('deviceorientation', onOri);
  }
  addEventListener('scroll', function () { var y = scrollY; sv += (y - lastY) * 0.004; lastY = y; }, { passive: true });
  D0.addEventListener('visibilitychange', function () { if (D0.hidden) stop(); else start(); });
}
/* ---------------------------------------------------------------- scroll: one hand lit at a time; reveals */
var steps = $$('.step'), cur = -1, tick = 0;
function pick() {
  tick = 0;
  var sb = stage.getBoundingClientRect(), wide = sb.width < innerWidth * 0.9 ? sb.height > innerHeight * 0.9 : false, probe = wide ? innerHeight * 0.5 : sb.bottom + (innerHeight - sb.bottom) * 0.38, n = 0;
  var lr = steps[steps.length - 1].getBoundingClientRect(); if (lr.bottom <= probe) n = steps.length - 1;
  steps.forEach(function (el, z) { var r = el.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) n = z; });
  if (steps[0].getBoundingClientRect().bottom > probe) n = 0;
  if (n !== cur) { cur = n; stage.setAttribute('data-s', n); iso = n >= 2 && n <= 4 ? n - 2 : -1; if (reduce) paintLive(); }
}
function onScroll() { if (!tick) tick = requestAnimationFrame(pick); }
addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll, { passive: true });
var nativeTL = false; try { nativeTL = CSS.supports('animation-timeline', 'view()'); } catch (e) {}
if (!nativeTL && 'IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.18 });
  $$('.rv').forEach(function (el) { io.observe(el); });
} else if (!nativeTL) $$('.rv').forEach(function (el) { el.classList.add('in'); });
if ('IntersectionObserver' in window) {
  var sio = new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); else stop(); }, { rootMargin: '80px' });
  sio.observe($('.story'));
}

/* ---------------------------------------------------------------- the guess: the page's first question */
var gui = $('#gui'), gr = $('#gr'), gv = $('#gv'), gm = $('#gm'), gl = $('#gl'), gres = $('#gres');
function gset() { var v = +gr.value; gv.textContent = v + '%'; gm.style.left = v + '%'; }
if (gui && gr) {
  gset(); gr.addEventListener('input', function () { gset(); gaugeGuess(+gr.value); });
  var lock = function () {
    if (gui.className.indexOf('done') > -1) return;
    var v = +gr.value; gui.className += ' done'; stage.setAttribute('data-lock', '1'); gl.disabled = true; gl.style.opacity = '.45';
    var tail = v < 11 ? 'lower than even the strictest reading.' : v <= 27 ? 'about right.' : 'more than i did. the queue and shuffle did the rest.';
    gres.innerHTML = 'you said ' + v + '%. the log says <b>19%</b> i tapped (11.5% by the strictest reading). ' + tail;
    iso = 0; if (reduce) paintLive(); gaugeLock(v);
    setTimeout(function () { gaugeEnd(); stage.removeAttribute('data-lock'); iso = cur >= 2 && cur <= 4 ? cur - 2 : -1; if (reduce) paintLive(); }, 4200);
  };
  gl.addEventListener('click', lock);
  gr.addEventListener('keydown', function (e) { if (e.key === 'Enter') lock(); });
}
if ('IntersectionObserver' in window) {
  var pio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.className += ' in'; pio.unobserve(e.target); } }); }, { threshold: 0.4 });
  $$('.pips').forEach(function (el) { pio.observe(el); });
} else $$('.pips').forEach(function (el) { el.className += ' in'; });
/* ---------------------------------------------------------------- drop the needle */
var href0;
function go() { if (busy === 1) { busy = 2; location.href = href0; } }
function drop(e) {
  if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  href0 = this.href; e.preventDefault(); if (busy) return; busy = 1;
  root.classList.add('needle'); armFree();
  if (reduce) { setTimeout(go, 200); return; }
  dropT = performance.now(); vis = true; start(); setTimeout(go, 1150);
}
['#enter', '#enter-quiet'].forEach(function (s) { var a = $(s); if (a) a.addEventListener('click', drop); });
addEventListener('pageshow', function (e) { if (e.persisted) { busy = 0; ang = 0; plat.style.transform = ''; root.classList.remove('needle'); armOff = 0; armTh = -99; if (!reduce) start(); } });
var rt = 0;
function relayout() { clearTimeout(rt); rt = setTimeout(draw, G.d ? 160 : 0); }
if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(disc); else { addEventListener('resize', relayout, { passive: true }); relayout(); }
/* ---------------------------------------------------------------- the three doors, each previewing where it goes */
var MX = 1; for (m = 0; m < NM; m++) MX = Math.max(MX, TAP[m] + SHU[m] + SRV[m]);
var LINES = []; for (i = 0; i < 16; i++) LINES.push(0.35 + rnd() * 0.6);
var SUB = [[], [], []]; for (i = 0; i < N; i += 22) SUB[ARM[i]].push(i);
var DOORS = $$('.door').map(function (el) {
  var c = $('canvas', el), d = { el: el, c: c, g: null, S: 0, W: 0, H: 0, on: 0, t0: 0, kind: el.getAttribute('data-k'), p: 0 };
  return d;
});
function dsize(d) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(d.c.clientWidth * dpr), h = Math.round(d.c.clientHeight * dpr);
  if (!w || !h) return false;
  if (d.c.width !== w || d.c.height !== h) { d.c.width = w; d.c.height = h; } d.W = w; d.H = h; d.g = d.g || d.c.getContext('2d'); return true;
}
function dpaint(d, t) {
  if (!dsize(d)) return;
  var g = d.g, W = d.W, H = d.H, u = H / 120, z, b, tt;
  g.clearRect(0, 0, W, H);
  if (d.kind === 'lab') {
    var bw = W / NM, top = H * 0.12, base = H * 0.9, gr = d.on ? Math.min(1, t / 1.6) : 1;
    for (m = 0; m < NM; m++) {
      var f = Math.max(0, Math.min(1, gr * (NM + 14) / NM - m / NM * 1)) , v = [TAP[m], SHU[m], SRV[m]], y = base, tot = (v[0] + v[1] + v[2]) / MX;
      f = d.on ? Math.max(0, Math.min(1, gr * 1.5 - m / NM)) : 1;
      var wob = d.on ? 1 + 0.06 * Math.sin(t * 3 + m * 0.5) : 1;
      var cm = scrub >= 0 ? MON[scrub | 0] : NM;
      for (k = 2; k >= 0; k--) { var hh = v[k] / MX * (base - top) * f * wob; paint(g, k, m <= cm ? 0.9 : 0.16); g.fillRect(m * bw + bw * 0.12, y - hh, bw * 0.76, hh); y -= hh; }
    }
    g.fillStyle = 'rgba(134,203,254,.55)'; g.fillRect(0, base + 1, W, Math.max(1, u * 0.8));
    if (d.on) { var sxp = ((t * 0.35) % 1) * W; g.fillStyle = 'rgba(134,203,254,.5)'; g.fillRect(sxp, top, Math.max(1, u), base - top); }
  } else if (d.kind === 'report') {
    var lh = H / (LINES.length + 2), hl = scrub >= 0 ? scrub / N * (LINES.length + 1) : d.on ? (t * 2.2) % (LINES.length + 2) : 5.5, pad = W * 0.08;
    for (z = 0; z < LINES.length; z++) {
      var ly = (z + 1.2) * lh, lw = (W - pad * 2) * LINES[z], on = d.on || scrub >= 0 ? Math.abs(hl - z - 0.5) < 0.9 : z === 5;
      g.fillStyle = on ? 'rgba(134,203,254,.85)' : 'rgba(164,155,189,.32)'; g.fillRect(pad, ly, lw, Math.max(2, lh * 0.34));
      if (z % 5 === 3) { paint(g, 2, on ? 0.95 : 0.55); g.fillRect(pad - Math.max(5, u * 6), ly, Math.max(3, u * 3), Math.max(2, lh * 0.34)); }
    }
    if (d.on) { g.fillStyle = 'rgba(255,122,156,.8)'; g.fillRect(pad, (hl + 0.62) * lh, (W - pad * 2) * 0.5 * (0.4 + 0.6 * Math.abs(Math.sin(t * 2.2))), Math.max(1.5, u * 1.4)); }
  } else {
    var S = Math.min(H * 1.9, W * 0.62), cx = W * 0.74, cy = H * 0.5, ar = d.on ? t * 0.55 : 0.4;
    g.save(); g.translate(cx, cy); g.rotate(ar); g.translate(-S / 2, -S / 2);
    var kk = S / 65535, sz = Math.max(1.4, S / 130);
    for (k = 0; k < 3; k++) { g.beginPath(); var L = SUB[k]; for (z = 0; z < L.length; z++) g.rect(PX[L[z]] * kk, PY[L[z]] * kk, sz, sz); paint(g, k, 0.8); g.fill(); }
    g.restore();
    if (d.on || scrub >= 0) { g.save(); g.translate(cx - S / 2, cy - S / 2); comet(g, S, scrub >= 0 ? scrub : (t * 9000) % N, 1800, -1, 0, 1); g.restore(); }
  }
}
var dRaf = 0, dT0 = 0;
function dloop(now) {
  dRaf = 0; var any = 0;
  DOORS.forEach(function (d) { if (d.on) { any = 1; dpaint(d, (now - d.t0) / 1000); } });
  if (any) dRaf = requestAnimationFrame(dloop);
}
function dset(d, on) {
  if (reduce) return;
  if (on && !d.on) { d.on = 1; d.t0 = performance.now(); if (!dRaf) dRaf = requestAnimationFrame(dloop); el_cls(d, 1); }
  else if (!on && d.on) { d.on = 0; dpaint(d, 0); el_cls(d, 0); }
}
function el_cls(d, on) { d.el.classList.toggle('live', !!on); }
DOORS.forEach(function (d) {
  d.el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') dset(d, 1); });
  d.el.addEventListener('pointerleave', function () { dset(d, 0); });
  d.el.addEventListener('focusin', function () { dset(d, 1); });
  d.el.addEventListener('focusout', function () { dset(d, 0); });
});
if ('IntersectionObserver' in window) {
  var dio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { var d = DOORS.filter(function (x) { return x.el === e.target; })[0]; d.vis = e.isIntersecting; if (e.isIntersecting) dpaint(d, 0); });
  });
  DOORS.forEach(function (d) { dio.observe(d.el); });
  var dq = 0;
  var pickDoor = function () {
    dq = 0; if (hov) return; var best = null, bd = 1e9, vh = innerHeight;
    DOORS.forEach(function (d) { var r = d.el.getBoundingClientRect(), vis = Math.min(r.bottom, vh) - Math.max(r.top, 0); if (vis > r.height * 0.6) { var dd = Math.abs(r.top + r.height / 2 - vh / 2); if (dd < bd) { bd = dd; best = d; } } });
    DOORS.forEach(function (d) { dset(d, d === best); });
  };
  addEventListener('scroll', function () { if (!dq && !hov) dq = requestAnimationFrame(pickDoor); }, { passive: true });
}
addEventListener('resize', function () { DOORS.forEach(function (d) { if (!d.on) dpaint(d, 0); }); }, { passive: true });
/* first frame: the page is already readable; the groove draws after it */
requestAnimationFrame(function () { setTimeout(function () {
  draw(); onScroll(); docH = D0.documentElement.scrollHeight; start();
  if (reduce) washTo(head, 1); else if (!location.hash && !D0.hidden) { lockW(); shown = 0; setLede(0); wind = performance.now(); washTo(0, 1); }
}, 0); });
addEventListener('resize', function () { docH = D0.documentElement.scrollHeight; if (!lpc) lockW(); }, { passive: true });
window.__door = { gauge: function () { return [gz.g, gz.p, gz.a]; }, armTh: function () { return armTh; }, scrubTo: setScrub, lede: function () { return [FB[0].textContent, FB[1].textContent]; }, bloom: function () { return [bs.on, bs.rel]; }, wind: function () { return wind; }, n: N, months: NM, arm: ARM, month: MON, draw: draw, ms: function () { return ms; }, geom: function () { return G; }, angle: function () { return ang; }, state: function () { return busy; }, th0: TH0, lowq: function () { return lowq; }, work: function () { return [wavg, wmax]; }, step: function () { return cur; },
  counts: function () { var o = [0, 0, 0]; for (var z = 0; z < N; z++) o[ARM[z]]++; return o; } };
})();
