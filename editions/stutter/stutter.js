(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL;
var CLIP = 1500, N = 100;
var KIND = { press: { col: PAL.mint, gly: 'star', lab: 'my press' }, queue: { col: PAL.violet, gly: 'ring', lab: 'auto-play' }, shuffle: { col: PAL.amber, gly: 'diamond', lab: 'shuffle' } };
var cv = $('cv'), g = cv.getContext('2d'), box = $('map');
var D0 = null, plays = [], names = null, FAM = null, FI = null, PV = null, fchg = 0, AU = new Audio(), PRE = new Audio(), idx = 0, held = false, timer = null, W = 0, Ht = 0, dpr = 1;
AU.preload = 'auto'; AU.volume = 0.3; PRE.preload = 'auto'; PRE.volume = 0;

function resize() {
  dpr = Math.min(3, window.devicePixelRatio || 1); W = Math.max(200, box.clientWidth); Ht = Math.max(200, box.clientHeight);
  cv.width = Math.round(W * dpr); cv.height = Math.round(Ht * dpr); cv.style.width = W + 'px'; cv.style.height = Ht + 'px';
  draw();
}
function draw() {
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalAlpha = 1; g.fillStyle = PAL.night; g.fillRect(0, 0, W, Ht);
  if (!plays.length) return;
  var fin = idx >= N && !held, cx = W / 2, cy = Ht / 2, R = Math.min(W, Ht) / 2 - (W < 500 ? 30 : 46), r0 = Math.max(5, R * 0.052), k, a, x, y, p, kd, on;
  for (k = 0; k < plays.length; k++) {
    p = plays[k]; kd = KIND[p.src]; a = -Math.PI / 2 + k * 6.2832 / plays.length; x = cx + Math.cos(a) * R; y = cy + Math.sin(a) * R;
    on = !fin && (held || idx > 0) && k === idx;
    if (k < idx) { g.globalAlpha = 0.82; P.peb(g, p.i, x, y, r0 * sz(p), kd.col); g.globalAlpha = 1; }
    else if (on) { P.peb(g, p.i, x, y, r0 * 1.7 * sz(p), kd.col); P.glyph(g, kd.gly, x, y, r0 * 2.2, PAL.night); g.save(); g.strokeStyle = kd.col; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r0 * 2.5, 0, 6.2832); g.stroke(); g.restore(); }
    else { g.globalAlpha = 0.5; P.peb(g, p.i, x, y, r0 * 0.85, '#3a3158'); g.globalAlpha = 1; }
    var fx = cx + Math.cos(a) * R * 0.84, fy = cy + Math.sin(a) * R * 0.84, fc = WK.FAMC[FAM[FI[p.i]]] || '#3a3158';
    g.globalAlpha = k < idx || on ? 1 : 0.35; g.fillStyle = fc; g.beginPath(); g.arc(fx, fy, on ? r0 * 0.7 : r0 * 0.42, 0, 6.2832); g.fill(); g.globalAlpha = 1;
    if (k > 0 && k <= idx && FI[p.i] !== FI[plays[k - 1].i]) { var pa = -Math.PI / 2 + (k - 1) * 6.2832 / plays.length; g.save(); g.strokeStyle = fc; g.lineWidth = 1.2; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(cx + Math.cos(pa) * R * 0.84, cy + Math.sin(pa) * R * 0.84); g.lineTo(fx, fy); g.stroke(); g.restore(); }
  }
  var cur = plays[Math.min(plays.length - 1, idx)];
  g.textAlign = 'center';
  if (!fin && (idx > 0 || held)) {
    var kd2 = KIND[cur.src];
    P.glyph(g, kd2.gly, cx, cy - 18, Math.min(34, R * 0.2), kd2.col);
    g.fillStyle = PAL.ink; g.font = '600 ' + (W < 500 ? 17 : 22) + 'px "Instrument Sans", sans-serif'; g.fillText(trim(names[cur.i] || '', 22), cx, cy + R * 0.2);
    g.fillStyle = kd2.col; g.font = '500 12px "IBM Plex Mono", monospace'; g.fillText(kd2.lab, cx, cy + R * 0.2 + 22);
    g.fillStyle = WK.FAMC[FAM[FI[cur.i]]] || PAL.ink; g.fillText(FAM[FI[cur.i]] || '', cx, cy + R * 0.2 + 60);
    WK.pulse(g, cx + Math.cos(-Math.PI / 2 + idx * 6.2832 / plays.length) * R, cy + Math.sin(-Math.PI / 2 + idx * 6.2832 / plays.length) * R, kd2.col, r0 * 2.5);
    g.fillStyle = PAL.mute || '#9a90b8'; g.fillText((idx + 1) + ' of ' + N, cx, cy + R * 0.2 + 42);
  } else {
    g.fillStyle = PAL.ink; g.font = '500 ' + (W < 500 ? 15 : 18) + 'px "Instrument Sans", sans-serif'; g.fillText(fin ? 'that was the night' : 'tap play the night', cx, cy);
    g.fillStyle = PAL.mute || '#9a90b8'; g.font = '500 12px "IBM Plex Mono", monospace'; g.fillText(fin ? 'tap play to hear it again' : 'or tap any shape to start there', cx, cy + 24);
  }
}
var PM = 1;
function sz(p) { return 0.75 + 0.6 * Math.sqrt((D0.pl[p.i] || 0) / PM); }
function geoms() { var cx = W / 2, cy = Ht / 2, R = Math.min(W, Ht) / 2 - (W < 500 ? 30 : 46); return { cx: cx, cy: cy, R: R }; }
function nearest(x, y, lim) {
  var G = geoms(), best = -1, bd = lim * lim, k, a, dx, dy, d;
  for (k = 0; k < plays.length; k++) { a = -Math.PI / 2 + k * 6.2832 / plays.length; dx = G.cx + Math.cos(a) * G.R - x; dy = G.cy + Math.sin(a) * G.R - y; d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
  return best;
}
function trim(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function clipOf(i) { return PV && PV[i] ? PV[i][1] : null; }
function preload(k) { var p = plays[k]; if (p && clipOf(p.i)) { try { PRE.src = clipOf(p.i); } catch (e) {} } }

function playAt() {
  clearTimeout(timer);
  if (!held) return;
  if (idx >= N) { held = false; end(); return; }
  var p = plays[idx], u = clipOf(p.i);
  var rep = 0, q = idx; while (q > 0 && plays[q - 1].i === p.i) { rep++; q--; }
  if (u) { AU.src = u; var off = (rep * 4) % 24, seek = function () { AU.removeEventListener('loadedmetadata', seek); try { if (off) AU.currentTime = off; } catch (e) {} }; AU.addEventListener('loadedmetadata', seek); var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {}); }
  else AU.pause();
  $('now').textContent = 'play ' + (idx + 1) + ': ' + (p.t ? '\u201c' + p.t + '\u201d by ' : '') + (names[p.i] || '') + ', ' + KIND[p.src].lab + ', ' + (FAM[FI[p.i]] || '') + '.' + (rep ? ' same artist as the last ' + rep + ': one clip per artist here, so a later second of it.' : '') + (u ? '' : ' no clip for this one.');
  var SAY = { press: 'i pressed play on this one myself (my press, mint star).', queue: 'auto-play picked this one on its own (violet ring).', shuffle: 'this one came from a random shuffle (amber diamond).' };
  $('say').textContent = 'play ' + (idx + 1) + ' of ' + N + ': ' + SAY[p.src] + (idx > 0 && FI[p.i] !== FI[plays[idx - 1].i] ? ' a new family: ' + (FAM[FI[p.i]] || '') + '.' : '');
  preload(idx + 1); draw(); counts();
  timer = setTimeout(function () { idx++; playAt(); }, CLIP); WK.live(draw);
}
function btn() { var b = $('hold'); b.classList.toggle('go', held); b.setAttribute('aria-pressed', held ? 'true' : 'false'); b.textContent = held ? 'pause' : (idx >= N ? 'play it again' : idx > 0 ? 'keep playing' : 'play the night'); }
function end() {
  AU.pause(); WK.still(); btn();
  $('now').textContent = 'that was a night: all ' + N + ' plays. tap play to hear it again, or tap a shape to start anywhere.'; draw();
}
function press() {
  if (held || !plays.length) return;
  if (idx >= N) idx = 0;
  held = true; btn(); playAt();
}
function release() {
  if (!held) return;
  held = false; clearTimeout(timer); AU.pause(); WK.still(); btn();
  $('now').textContent = 'paused at play ' + (idx + 1) + ' of ' + N + '. tap keep playing to go on.'; draw();
}
function toggle() { if (held) release(); else press(); }
function jump(k) {
  k = Math.max(0, Math.min(N - 1, k)); clearTimeout(timer); idx = k;
  if (held) playAt(); else { held = true; btn(); playAt(); }
}
function counts() {
  var c = { press: 0, queue: 0, shuffle: 0 }; plays.forEach(function (p) { c[p.src]++; });
  $('c-press').textContent = c.press; $('c-auto').textContent = c.queue; $('c-shuf').textContent = c.shuffle;
  $('numlab').textContent = 'of these ' + plays.length + ' plays';
}

var hb = $('hold');
hb.addEventListener('click', toggle);
$('next').addEventListener('click', function () { if (idx < N - 1) jump(idx + 1); });
cv.addEventListener('click', function (e) {
  var r = cv.getBoundingClientRect(), k = nearest(e.clientX - r.left, e.clientY - r.top, 26);
  if (k >= 0) jump(k); else toggle();
});
var tip = document.createElement('div'); tip.className = 'wk-tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true'); box.style.position = 'relative'; box.appendChild(tip);
cv.addEventListener('pointermove', function (e) {
  var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, k = nearest(x, y, 16);
  if (k < 0 || !plays.length) { tip.hidden = true; return; }
  var p = plays[k];
  tip.innerHTML = '<b>' + WK.esc(names[p.i] || '') + '</b> <i style="background:' + (WK.FAMC[FAM[FI[p.i]]] || '#6f6790') + '"></i>' + WK.esc(FAM[FI[p.i]] || '') + ' · ' + KIND[p.src].lab + ' · play ' + (k + 1);
  tip.style.left = Math.max(0, Math.min(W - 220, x + 12)) + 'px'; tip.style.top = Math.max(0, y - 34) + 'px'; tip.hidden = false;
});
cv.addEventListener('pointerleave', function () { tip.hidden = true; });
addEventListener('keydown', function (e) {
  if (e.metaKey || e.ctrlKey || e.altKey || (e.target && /BUTTON|INPUT|TEXTAREA/.test(e.target.tagName))) return;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) toggle(); }
  else if (e.key === 'ArrowRight' || e.key === 'n') { e.preventDefault(); if (idx < N - 1) jump(idx + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); if (idx > 0) jump(idx - 1); }
});
$('again').addEventListener('click', function () { release(); idx = 0; btn(); $('now').textContent = 'back at the start. tap play the night.'; $('say').textContent = 'tap play the night. each play is a 1.5 s clip, one after another, until the end or until you pause.'; draw(); });
var rt;
addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 80); });

Promise.all([WK.j('../haunted/data/haunted.json'), WK.j('../loop/data/loop.json'), WK.pv()]).then(function (a) {
  var ev = a[0].ev, k, used = 0;
  D0 = a[1]; PM = Math.max.apply(null, D0.pl) || 1; names = a[1].n; FAM = a[1].fam; FI = a[1].f; PV = a[2];
  for (k = 0; k < ev.length && plays.length < N; k++) {
    used++;
    ev[k].p.forEach(function (p) { if (plays.length < N && KIND[p[2]]) plays.push({ i: p[0], src: p[2], t: p[1] }); });
  }
  var rp = 0; plays.forEach(function (p, k) { if (k) { if (plays[k - 1].i === p.i) rp++; if (FI[plays[k - 1].i] !== FI[p.i]) fchg++; } });
  $('fp1').textContent = 'this ring is ' + plays.length + ' plays from ' + used + ' evenings in my log, in the order they happened. ' + rp + ' of the steps stay on the same artist (an album, or auto-play repeating it); ' + fchg + ' steps cross into another family.';
  if ($('fam')) $('fam').textContent = 'inner ring: the family of each play. ' + fchg + ' of 99 steps cross into another family.';
  counts(); resize();
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; });
})();
