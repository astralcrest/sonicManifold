/* the landing's engine. the month counts (TAP, SHU, SRV) are inlined in index.html (the page fetches nothing).
   one groove of every play, drawn once in four layers (all, then one per hand that pressed play); a live comet
   reads the groove play by play; the record turns slowly, tilts with the device or the pointer, and answers a finger;
   scroll lights one hand at a time. r11: the needle is a scrubber (the numbers recount to wherever it sits), a press blooms ink from the finger, a flick of the page spins the record up and smears it, the page's light takes the hue of the hand under the needle. reduced motion = one still frame. */
(function () {
'use strict';
var TAP = window.TAP, SHU = window.SHU, SRV = window.SRV;
var D0 = document, $ = function (s, r) { return (r || D0).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || D0).querySelectorAll(s)); };
var root = D0.documentElement, disc = $('.disc'), cv = $('#groove'), lab = $('.label'), plat = $('.platter'), live = $('#live'), stage = $('.stage'), tilt = $('.tilt'), rd = $('.read b');
if (!TAP || !cv || !cv.getContext || !disc || !lab || !plat) return;
var reduce = false, hov = true, gam = false;
try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; hov = matchMedia('(hover:hover)').matches; gam = matchMedia('(color-gamut: p3)').matches; } catch (e) {}
/* r13 lite: save-data, prefers-reduced-data, or a device that cannot hold 30 fps over its first ten frames gets a still
   record pressed in the three inks (a poster): no wind-up, no loop, nothing fetched. `hand` paints the groove, `inked` shows the answer */
var lite = 0;
try { var cn = navigator.connection; lite = (cn && cn.saveData) || matchMedia('(prefers-reduced-data: reduce)').matches ? 1 : 0; } catch (e) {}
if (lite) { reduce = true; root.classList.add('lite'); }
var NM = TAP.length, N = 0, m, i, j, k;
/* r13 coherence: the record is pressed in one ice ink until the guess locks (or the page is scrolled past the guess); then
   the three hands bleed into the grooves from the label out. a lock in an earlier visit is remembered */
var GK = 'sm.guess', inked = 0;
try { inked = localStorage.getItem(GK) ? 1 : 0; } catch (e) {}
if (inked) root.classList.add('inked');
var hand = inked || lite;
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
var COL = new Uint32Array([0xe6bcf621, 0xe623a6f5, 0xe6d66f8b]), ICEW = 0xaafecb86, COH = new Uint32Array([0xffe4ffd0, 0xff9ad8ff, 0xffff8ca9]);
var TH0 = 0.6857, ms = 0, G = {}, PX = new Uint16Array(N), PY = new Uint16Array(N), HI = $$('.hi');
var CTX = ['#21f6bc', '#f5a623', '#8b6fd6'], CP3 = ['0.18 1 0.74', '1 0.69 0.18', '0.55 0.4 0.98'];
function ctx2(c) {
  var g = null;
  if (gam) { try { g = c.getContext('2d', { colorSpace: 'display-p3' }); } catch (e) {} }
  return g || c.getContext('2d');
}
/* a canvas colour in display-p3 where the canvas understands it, else the sRGB hex */
function paint(g, k, a) {
  if (!hand) { g.fillStyle = 'rgba(134,203,254,' + a + ')'; return; }
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
    w = ARM[i]; col = hand ? COL[w] : ICEW; coh = COH[w]; hp = pxs[w + 1]; if (!hand) w = 2; a = BA[w]; b = BB[w];
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
  clearTimeout(ltT); ltT = setTimeout(light, reduce ? 0 : ltN++ ? 200 : 2100);
}
/* r13 light on the grooves, drawn once per size after the wind-up: two concentric-ring twins of the groove, each turn in the
   hands that made it (prefix counts over the turn) with a fine per-turn grain. #spec is the lamp: two narrow lobes on one axis,
   the anisotropic sheen vinyl throws under a light, fixed to the room (it turns only with the tilt, and drags a little with a
   fast spin) while the dots run under it. #blur is the same rings all round, the groove's motion blur, shown only at speed */
var ltT = 0, ltN = 0, ltMs = 0;
function light() {
  var S = Math.min(LD || 0, 900); if (!SPC || !BLR || !G.K || !S) return;
  var RGB = hand ? RGBH : ICE3, t0 = performance.now(), k = G.d / S, c = S / 2, M = (c * 2 + 4) | 0, pr = new Float32Array(M * 4), j, rho, i, hw, a, b, n0, n1, n2, tt, br, e, fine = G.pitch / k >= 2.6;
  for (j = 0; j < M; j++) {
    rho = j / 2 * k; if (rho < G.r0 || rho > G.r1) continue;
    i = (G.K - rho * rho) / G.KD; hw = G.pitch * rho / G.KD; a = Math.max(0, (i - hw) | 0); b = Math.min(N, (i + hw) | 0);
    n0 = C0[b] - C0[a]; n1 = C1[b] - C1[a]; n2 = C2[b] - C2[a]; tt = n0 + n1 + n2 || 1;
    br = 0.5 + 0.5 * ((Math.imul((rho / G.pitch) | 0, 0x9e3779b1) >>> 0) / 4294967296);
    if (fine) br *= 0.68 + 0.32 * Math.cos(6.2832 * (rho - G.r0) / G.pitch);
    e = Math.min(1, (rho - G.r0) / (4 * G.pitch), (G.r1 - rho) / (4 * G.pitch));
    pr[j * 4] = (n0 * RGB[0][0] + n1 * RGB[1][0] + n2 * RGB[2][0]) / tt; pr[j * 4 + 1] = (n0 * RGB[0][1] + n1 * RGB[1][1] + n2 * RGB[2][1]) / tt; pr[j * 4 + 2] = (n0 * RGB[0][2] + n1 * RGB[1][2] + n2 * RGB[2][2]) / tt; pr[j * 4 + 3] = br * e;
  }
  var cs = [BLR, SPC], gs = [], ims = [], ds = [], x, y, dx, dy, d, o, q, cw, wt, al;
  for (q = 0; q < 2; q++) { if (cs[q].width !== S) { cs[q].width = S; cs[q].height = S; } gs[q] = cs[q].getContext('2d'); ims[q] = gs[q].createImageData(S, S); ds[q] = ims[q].data; }
  for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
    dx = x + 0.5 - c; dy = y + 0.5 - c; d = Math.sqrt(dx * dx + dy * dy); j = (d * 2) | 0; if (j >= M || !(al = pr[j * 4 + 3])) continue;
    o = (y * S + x) * 4; cw = (dx * 0.875 - dy * 0.485) / d; cw *= cw; wt = cw * cw; wt *= wt; wt *= wt * cw; wt = wt * wt + 0.05 * cw;
    ds[0][o] = pr[j * 4] * 0.92 + 14; ds[0][o + 1] = pr[j * 4 + 1] * 0.92 + 13; ds[0][o + 2] = pr[j * 4 + 2] * 0.92 + 16; ds[0][o + 3] = al * 175;
    ds[1][o] = pr[j * 4] * 0.3 + 172; ds[1][o + 1] = pr[j * 4 + 1] * 0.3 + 168; ds[1][o + 2] = pr[j * 4 + 2] * 0.3 + 181; ds[1][o + 3] = al * wt * 235;
  }
  for (q = 0; q < 2; q++) gs[q].putImageData(ims[q], 0, 0);
  SPC.classList.add('on'); ltMs = performance.now() - t0;
}
/* r13 test handle: the platter's measured speed (deg/s), the comet head (play, screen angle in deg), the flick's own speed, light cost */
window.__rec = { w: function () { return wNow; }, wf: function () { return wf; }, ltMs: function () { return ltMs; }, blur: function () { return alP; },
  head: function () { if (!G.K) return [0, 0]; var r = Math.sqrt(Math.max(0, G.K - G.KD * (hdNow + 0.5))); return [hdNow, (TH0 - (G.r1 - r) * 6.283185307179586 / G.pitch) * 57.29577951308232 + ang]; } };
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
/* r13: the comet reads at a record's pace. its head turns at a constant angle a second (WC, under 33 1/3 = 200 deg/s), as
   calm by the label as at the rim, and never past 45 rpm on screen even while a flick spins the platter; its tail is an arc
   (TA deg), not a count of plays. a finger or the wind-up reads under the stylus: the play the needle sits on, so the head
   only ever moves in and out with the arm and never whips round the record */
var WC = 150, WF = 270, TA = 200, wf = 0, wNow = 0, angP = 0, dtP = 16.7, hdNow = 0;
function ppd(i) { var r = Math.sqrt(Math.max(1, G.K - G.KD * (i + 0.5))); return G.pitch * r / (180 * G.KD); }
function underTip(i0) {
  if (armTh === -99 || !G.K) return i0;
  var q = (armTh - 4.09) * 0.017453292519943295, c = Math.cos(q), s = Math.sin(q), tx = 51 - 2.6 * c - 69.6 * s, ty = 2.6 * -s + 69.6 * c - 38, TW = 6.283185307179586 / G.pitch;
  var rf = Math.max(G.r0, Math.min(G.r1, Math.sqrt(tx * tx + ty * ty) / 50 * G.d / 2)), d = (Math.atan2(ty, tx) - ang * 0.017453292519943295 - TH0 + (G.r1 - rf) * TW) % 6.283185307179586;
  if (d > Math.PI) d -= 6.283185307179586; else if (d < -Math.PI) d += 6.283185307179586;
  var rr = rf + d / TW; return Math.max(0, Math.min(N - 1, (G.K - rr * rr) / G.KD - 0.5));
}
function paintLive() {
  if (!lg || !LD) return;
  lg.clearRect(0, 0, LD, LD);
  if (scrub >= 0) { var sc = Math.min(N - 1, scrub | 0), mm = MON[sc]; hdNow = underTip(sc); band(lg, LD, MST[mm], MST[mm + 1]); comet(lg, LD, hdNow, 120, -1, 0, 1); return; }
  hdNow = Math.min(N - 1, head);
  var W = (iso >= 0 ? 300 : TA) * ppd(hdNow);
  if (lowq) W *= 0.5;
  comet(lg, LD, hdNow, W, iso, 0, lowq ? 2 : 1);
}
function still() { head = N * 0.62; paintLive(); fmt(); }
var lastRd = -1;
function fmt() { if (!rd) return; var v = Math.round((scrub >= 0 ? scrub : head) / 100) * 100; if (v !== lastRd) { lastRd = v; rd.textContent = (v < 1 ? 1 : v).toLocaleString('en-US'); } }
/* ---------------------------------------------------------------- the loop: turn, tilt, comet. one rAF, paused off screen */
var wind = 0, shown = N, fastOn = 0, fr = 0, wr = 0, wg = 0, wb = 0, wr2 = 0, wg2 = 0, wb2 = 0, docH = 1, busy = 0, ang = 0, raf = 0, dropT = 0, last = 0, running = false, vis = true, tx = 0, ty = 0, gx = 0, gy = 0, sx = 0, sy = 0, sv = 0, lastY = scrollY, g0 = null, useG = false, skip = 0;
var IDLE = 0.0045;
var lpA = [], lpL = 0;
function frame(now) {
  raf = 0; if (!running) return;
  if (lpA.length < 10 && lpL) { lpA.push(now - lpL); if (lpA.length === 10 && lpA.slice().sort(function (a, b) { return a - b; })[5] > 33.4) { goLite(); return; } }
  lpL = now;
  var dt = Math.min(48, now - (last || now)); last = now;
  var t0 = performance.now();
  /* r13 the flick: scroll drives the platter like a hand on a heavy record. it comes up in about a tenth of a second, never
     past 45 rpm (WF), and coasts down on the clock, exponentially (0.7 s: 95% gone by 2.1 s), never a hard stop */
  var drv = Math.max(-WF - IDLE * 1000, Math.min(WF - IDLE * 1000, sv * 600));
  sv *= Math.exp(-dt / 90);
  if (Math.abs(drv) > Math.abs(wf)) wf += (drv - wf) * (1 - Math.exp(-dt / 110)); else wf *= Math.exp(-dt / 700);
  var spd = IDLE + wf / 1000;
  spinFx(dt);
  if (wind) { var wp = (now - wind) / 1900; if (wp >= 1) { wind = 0; scrub = -1; head = 0; } else scrub = (1 - Math.pow(1 - wp, 3)) * (N - 1); }
  if (busy) { var e = now - dropT, v = e < 400 ? 0 : Math.min(1, (e - 400) / 650); spd = IDLE + v * (0.2 - IDLE); }
  ang += spd * dt; plat.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
  /* tilt: the device when it speaks, else the pointer; a small lerp so it floats */
  var ttx = useG ? gx : sx, tty = useG ? gy : sy;
  tx += (ttx - tx) * 0.09; ty += (tty - ty) * 0.09;
  if (tilt) { tilt.style.setProperty('--tx', tx.toFixed(2)); tilt.style.setProperty('--ty', ty.toFixed(2)); }
  if (G.K) { head += Math.max(0, WC - Math.abs(wf)) / 1000 * dt * ppd(head); if (head >= N) head = 0; }
  if (!(lowq && (skip ^= 1))) paintLive();
  fmt(); frameFx(now);
  var wk = performance.now() - t0; wsum += wk; wavg = wavg * 0.95 + wk * 0.05; wmax = Math.max(wmax * 0.99, wk); dsum += dt; if (++wn === 90) { lowq = wsum / wn > 6 || dsum / wn > 25 ? 1 : lowq; wsum = 0; wn = 0; dsum = 0; }
  raf = requestAnimationFrame(frame);
}
/* r13 motion blur, tied to the platter's own measured speed (last frame's turn, so the needle's spin-up counts too): past
   about 50 deg/s the dot texture moves more than the eye can hold a frame, so the groove's blurred twin (concentric rings in
   each turn's own hands) fades in, full by 220 deg/s, with a light gaussian (none when the governor has backed off); the lamp's
   highlight drags a few degrees with the spin */
var BLR = $('#blur'), SPC = $('#spec'), alP = 0, lwP = 0, dsum = 0;
function spinFx(dt) {
  var w = Math.abs(ang - angP) / Math.max(1, dtP) * 1000; angP = ang; dtP = dt; if (w > 5000) w = 0; wNow = w;
  var al = Math.max(0, Math.min(1, (w - 50) / 170));
  if (Math.abs(al - alP) > 0.01 || (al === 0 && alP !== 0)) { alP = al; if (BLR) BLR.style.opacity = (al * 0.9).toFixed(3); plat.style.setProperty('--sm', (lowq ? 0 : al * 1.1).toFixed(2) + 'px'); }
  if (w > 80) { if (!fastOn) { fastOn = 1; plat.classList.add('fast'); } } else if (fastOn) { fastOn = 0; plat.classList.remove('fast'); }
  var lw = Math.min(14, w * 0.05) * (wf < 0 ? -1 : 1);
  if (SPC && Math.abs(lw - lwP) > 0.2) { lwP = lw; SPC.style.setProperty('--lw', lw.toFixed(1) + 'deg'); }
}
function start() { if (reduce || running || !vis || D0.hidden) return; running = true; last = 0; lpL = 0; raf = requestAnimationFrame(frame); }
function goLite() {
  if (lite) return; lite = 1; reduce = true; root.classList.add('lite'); stop();
  wind = 0; scrub = -1; shown = N; setLede(N); fr = 0; if (!hand) { hand = 1; draw(); } still(); armTo(head, 1); washTo(head, 1);
}
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
  if (reduce) { shown = v >= 0 ? v + 1 : N; setLede(shown); paintLive(); armTo(v >= 0 ? v : head, 1); }
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
var WASH = $('.wash'), RGBH = [[33, 246, 188], [245, 166, 35], [139, 111, 214]], ICE3 = [[134, 203, 254], [134, 203, 254], [134, 203, 254]];
function mixAt(hd, w, o) {
  var RGB = hand ? RGBH : ICE3, b = Math.min(N, Math.max(w, hd | 0)), a = b - w, t0 = C0[b] - C0[a], t1 = C1[b] - C1[a], t2 = C2[b] - C2[a], tt = t0 + t1 + t2 || 1;
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
  fr++; armTo(scrub >= 0 ? scrub : head, 0, now); if (blT) bleed(now);
  if (gz.on) gaugeTick(now);
  var want = scrub >= 0 ? scrub + 1 : N;
  if (Math.abs(want - shown) > 0.5) { shown += (want - shown) * (scrub >= 0 ? 0.35 : 0.12); if (Math.abs(want - shown) < N * 0.0015) shown = want; setLede(shown); }
  if (scr && !scrAct && !(fr & 3)) scr.value = ((scrub >= 0 ? scrub : head) / N * 1000) | 0;
  if (!(fr & 3)) washTo(scrub >= 0 ? scrub : head);
  if (bs.on || bs.rel) bdraw(now);
}
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
  if (n >= 2 && !inked) ink();
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

/* ---------------------------------------------------------------- the ink comes in */
var blT = 0, iceC = null;
function bleed(now) {
  var u = Math.min(1, (now - blT) / 1900), b = 36 + 70 * (1 - Math.pow(1 - u, 2.2));
  plat.style.setProperty('--b', b.toFixed(1) + '%');
  if (u >= 1) bleedEnd();
}
function bleedEnd() { blT = 0; if (iceC) { iceC.remove(); iceC = null; } cv.classList.remove('bleed'); plat.style.removeProperty('--b'); }
function ink() {
  if (inked) return; inked = 1; root.classList.add('inked'); if (hand) return; hand = 1;
  try { localStorage.setItem(GK, gr ? gr.value : '1'); } catch (e) {}
  if (G.K && !reduce && running) {
    iceC = D0.createElement('canvas'); iceC.id = 'ice'; iceC.width = cv.width; iceC.height = cv.height; iceC.getContext('2d').drawImage(cv, 0, 0);
    plat.insertBefore(iceC, cv); plat.style.setProperty('--b', '36%');
  }
  if (G.K) { draw(); if (iceC) { cv.classList.add('bleed'); blT = performance.now(); } else light(); }
  washTo(head, 1); paintLive();
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
    gres.innerHTML = 'you said ' + v + '%. the log says <b>19%</b> i tapped. ' + tail;
    ink(); iso = 0; if (reduce) paintLive(); gaugeLock(v);
    setTimeout(function () { gaugeEnd(); stage.removeAttribute('data-lock'); iso = cur >= 2 && cur <= 4 ? cur - 2 : -1; if (reduce) paintLive(); }, 4200);
  };
  gl.addEventListener('click', lock);
  gr.addEventListener('keydown', function (e) { if (e.key === 'Enter') lock(); });
  var idT = 0, idOn = 0, idle = function () { clearTimeout(idT); idT = 0; if (idOn && !inked) idT = setTimeout(function () { if (!inked && idOn) ink(); }, 4000); };
  ['input', 'pointerdown', 'keydown', 'focusin'].forEach(function (n) { gui.addEventListener(n, idle, { passive: true }); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { idOn = es[0].isIntersecting; idle(); }, { threshold: 0.9 }).observe(gui);
}
if ('IntersectionObserver' in window) {
  var pio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.className += ' in'; pio.unobserve(e.target); } }); }, { threshold: 0.4 });
  $$('.pips').forEach(function (el) { pio.observe(el); });
} else $$('.pips').forEach(function (el) { el.className += ' in'; });
/* ---------------------------------------------------------------- drop the needle */
/* r13: the first drop in this browser is a run. the needle lowers, the record plays, and the page carries itself down past
   the thesis, the guess and the doors, then goes in. any touch, wheel, key or click hands the page back where it is, and a
   chip at the bottom edge keeps the way in for the rest of the visit. later drops, and reduced motion, go straight in */
var href0, hrefA, RUNK = 'sm.needle.ran', ranMem = 0, run = null, chip = $('#chip'), chipL = chip && $('.ln', chip), chipP = chip && $('i', chip), ENT = $('#enter'), aq = 0;
var RUNEV = ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'keydown'], RUNLINE = hov ? 'one pass down the page, then in. scroll to stay' : 'one pass down the page, then in. tap to stay';
function ran() { if (ranMem) return 1; try { return localStorage.getItem(RUNK) ? 1 : 0; } catch (e) { return 0; } }
function markRan() { ranMem = 1; try { localStorage.setItem(RUNK, '1'); } catch (e) {} }
function go() { if (busy === 1) { busy = 2; location.href = href0; } }
function drop(e) {
  if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  href0 = this.href; hrefA = this.getAttribute('href'); e.preventDefault(); if (busy) return; busy = 1;
  root.classList.add('needle'); armFree();
  if (reduce) { markRan(); setTimeout(go, 200); return; }
  dropT = performance.now(); vis = true; start();
  if (!ran()) { markRan(); if (runStart()) return; }
  setTimeout(go, 1150);
}
function docY(el) { return el.getBoundingClientRect().top + scrollY; }
/* the path: rest at the start, ease past the guess and the doors (half speed there, not stopped), rest at the foot. cubic hermite
   per leg, each leg's time shared by distance, 2.2-3.3 s of scrolling plus a 0.25 s beat at the foot, then in */
function runStart() {
  var vh = innerHeight, y0 = scrollY, y1 = Math.max(0, D0.documentElement.scrollHeight - vh);
  if (y1 - y0 < vh * 0.6) return false;
  var cov = stage.offsetWidth > innerWidth * 0.9 ? stage.offsetHeight - (parseFloat(stage.style.getPropertyValue('--hh')) || 0) : 0, want = [], gu = $('#gui');
  if (gu && gu.offsetHeight) want.push(docY(gu) - cov - (vh - cov) * 0.3);
  var Y = [y0]; want.forEach(function (y) { if (y > Y[Y.length - 1] + vh * 0.3 && y < y1 - vh * 0.3) Y.push(y); }); Y.push(y1);
  var w = [], ws = 0, z, pk = 0, P;
  for (z = 1; z < Y.length; z++) { w.push(Y[z] - Y[z - 1]); ws += w[z - 1]; }
  var legs = function (T) {
    var D = [0], V = [0]; for (z = 1; z < Y.length; z++) D.push(D[z - 1] + T * w[z - 1] / ws);
    for (z = 1; z < Y.length - 1; z++) V.push(0.5 * Math.min((Y[z] - Y[z - 1]) / (D[z] - D[z - 1]), (Y[z + 1] - Y[z]) / (D[z + 1] - D[z])));
    V.push(0); return { Y: Y, D: D, V: V, T: T };
  };
  /* every speed scales with 1/T, so one probe sets T for a peak of 1.9 screens a second, held to 2.2-3.3 s */
  P = legs(2600); for (z = 1; z <= 96; z++) pk = Math.max(pk, runAt(P, z / 96 * 2600) - runAt(P, (z - 1) / 96 * 2600));
  P = legs(Math.max(2200, Math.min(3300, pk * 96 / (vh * 0.0019))));
  run = { t0: performance.now(), P: P, T: P.T, pk: pk * 96 / P.T / vh * 1000, y: y0, raf: 0, hold: 0, peek: 0, lock: 0 };
  RUNEV.forEach(function (n) { addEventListener(n, runCancel, { capture: true, passive: true }); });
  D0.addEventListener('visibilitychange', runCancel);
  if (chip) { chip.setAttribute('href', hrefA); chipL.textContent = RUNLINE; chip.className = 'chip run'; chip.setAttribute('tabindex', '-1'); chip.setAttribute('aria-hidden', 'true'); chip.hidden = false; chipP.style.setProperty('--p', 0); }
  run.raf = requestAnimationFrame(runStep);
  return true;
}
function runAt(P, t) {
  var Y = P.Y, D = P.D, V = P.V, z = 1;
  if (t >= P.T) return Y[Y.length - 1];
  while (z < D.length - 1 && t > D[z]) z++;
  var h = D[z] - D[z - 1], s = (t - D[z - 1]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * Y[z - 1] + (s3 - 2 * s2 + s) * h * V[z - 1] + (3 * s2 - 2 * s3) * Y[z] + (s3 - s2) * h * V[z];
}
function runStep(now) {
  var r = run; if (!r) return; r.raf = 0;
  if (Math.abs(scrollY - r.y) > 6) { runEnd(0); return; }
  var Yf = r.P.Y; Yf[Yf.length - 1] = Math.max(Yf[Yf.length - 1], D0.documentElement.scrollHeight - innerHeight); /* the answer can lengthen the lede mid-run: keep the foot */
  var t = now - r.t0, y = runAt(r.P, t), vh = innerHeight;
  lastY = Math.round(y); scrollTo(0, y); r.y = scrollY;
  chipP.style.setProperty('--p', Math.min(1, t / r.T).toFixed(3));
  if (!r.peek && gui && gui.className.indexOf('done') < 0 && gui.getBoundingClientRect().top < vh * 0.92) { r.peek = 1; ink(); gui.classList.add('peek'); gv.textContent = '19%'; if (!stage.hasAttribute('data-lock')) { r.lock = 1; stage.setAttribute('data-lock', '1'); } }
  if (r.lock && cur >= 2) { r.lock = 0; stage.removeAttribute('data-lock'); }
  if (t >= r.T) { r.hold = setTimeout(function () { runEnd(1); }, 250); return; }
  r.raf = requestAnimationFrame(runStep);
}
function runCancel(e) { if (run && !(e && e.type === 'visibilitychange' && !D0.hidden)) runEnd(0); }
function runEnd(done) {
  var r = run; if (!r) return; run = null;
  if (r.raf) cancelAnimationFrame(r.raf); clearTimeout(r.hold);
  RUNEV.forEach(function (n) { removeEventListener(n, runCancel, { capture: true, passive: true }); });
  D0.removeEventListener('visibilitychange', runCancel);
  if (r.lock) stage.removeAttribute('data-lock');
  if (done) { go(); return; }
  busy = 0; root.classList.remove('needle'); armOff = 0; armTh = -99; sv = 0.12;
  if (r.peek && gui.className.indexOf('done') < 0) { gui.classList.remove('peek'); gset(); }
  chipDrop();
}
/* after a cancel the chip is the drop button, pinned above the safe area; it steps aside while the hero's own button shows */
function chipDrop() {
  if (!chip) return;
  chip.className = 'chip'; chipL.textContent = ''; chip.removeAttribute('tabindex'); chip.removeAttribute('aria-hidden'); chip.hidden = false; root.classList.add('chipped'); chipAway();
}
function chipAway() {
  aq = 0; if (run || chip.hidden || !ENT) return;
  var r = ENT.getBoundingClientRect(), sb = stage.getBoundingClientRect(), cov = sb.width > innerWidth * 0.9 ? Math.max(0, sb.bottom) : 0;
  chip.classList.toggle('away', r.bottom > cov + 8 && r.top < innerHeight);
}
if (chip) {
  chip.addEventListener('click', drop);
  addEventListener('scroll', function () { if (!aq && !run && !chip.hidden) aq = requestAnimationFrame(chipAway); }, { passive: true });
  addEventListener('pageshow', function (e) { if (e.persisted && !chip.hidden) { run = null; chipDrop(); } });
}
window.__needle = { running: function () { return !!run; }, path: function () { return run ? [run.P.Y, run.P.D, run.T, run.pk] : null; }, line: RUNLINE, key: RUNK };
['#enter', '#enter-quiet'].forEach(function (s) { var a = $(s); if (a) a.addEventListener('click', drop); });
addEventListener('pageshow', function (e) { if (e.persisted) { busy = 0; ang = 0; plat.style.transform = ''; root.classList.remove('needle'); armOff = 0; armTh = -99; if (!reduce) start(); } });
var rt = 0, FX = $('.fx');
function hh() { if (FX) stage.style.setProperty('--hh', Math.max(0, FX.offsetTop - 4) + 'px'); }
hh(); addEventListener('resize', hh, { passive: true });
function relayout() { clearTimeout(rt); rt = setTimeout(draw, G.d ? 160 : 0); }
if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(disc); else { addEventListener('resize', relayout, { passive: true }); relayout(); }
/* first frame: the page is already readable; the groove draws after it */
requestAnimationFrame(function () { setTimeout(function () {
  draw(); onScroll(); docH = D0.documentElement.scrollHeight; start();
  if (reduce) washTo(head, 1); else if (!location.hash && !D0.hidden) { lockW(); shown = 0; setLede(0); wind = performance.now(); washTo(0, 1); }
}, 0); });
addEventListener('resize', function () { docH = D0.documentElement.scrollHeight; if (!lpc) lockW(); }, { passive: true });
window.__door = { ink: function () { ink(); return inked; }, inked: function () { return inked; }, lite: function () { return lite; }, hand: function () { return hand; }, gauge: function () { return [gz.g, gz.p, gz.a]; }, armTh: function () { return armTh; }, scrubTo: setScrub, lede: function () { return [FB[0].textContent, FB[1].textContent]; }, bloom: function () { return [bs.on, bs.rel]; }, wind: function () { return wind; }, n: N, months: NM, arm: ARM, month: MON, draw: draw, ms: function () { return ms; }, geom: function () { return G; }, angle: function () { return ang; }, state: function () { return busy; }, th0: TH0, lowq: function () { return lowq; }, work: function () { return [wavg, wmax]; }, step: function () { return cur; },
  counts: function () { var o = [0, 0, 0]; for (var z = 0; z < N; z++) o[ARM[z]]++; return o; } };
})();
