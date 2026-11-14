(function () {
'use strict';
var $ = WK.$, P = WK.P, PAL = P.PAL, esc = WK.esc;
var KIND = { press: { col: PAL.mint, gly: 'star', lab: 'my press' }, queue: { col: PAL.violet, gly: 'ring', lab: 'auto-play' }, shuffle: { col: PAL.amber, gly: 'diamond', lab: 'shuffle' } };
var STEP = 5000, STEP_NOCLIP = 2500;
var D, M, PV, EV, m, st = $('st'), sg = st.getContext('2d'), sbox = $('mapin');
var e = 0, plays = [], k = 0, go = false, timer = null, AU = new Audio(), SW = 0, SH = 0, sdpr = 1;
AU.volume = 0.3; AU.preload = 'auto';

function fcol(i) { return WK.FAMC[D.fam[D.f[i]]] || PAL.ink; }
function fname(i) { return D.fam[D.f[i]] || 'other'; }
function hand(p) { return p.src === 'queue' ? 'auto-play' : p.src === 'press' ? 'my press' : 'shuffle'; }
function load(n) {
  e = (n + EV.length) % EV.length; stopPlay();
  plays = EV[e].p.filter(function (p) { return KIND[p[2]] && D.xy[p[0]]; }).map(function (p) { return { i: p[0], t: p[1], src: p[2] }; });
  k = 0; stats(); say(); draw();
}
function cross() { var c = 0, q; for (q = 1; q < plays.length; q++) if (D.f[plays[q].i] !== D.f[plays[q - 1].i]) c++; return c; }
function stats() {
  var seen = {}, nf = 0; plays.forEach(function (p) { if (!seen[D.f[p.i]]) { seen[D.f[p.i]] = 1; nf++; } });
  $('big').innerHTML = cross() + '<span class="c"> of ' + Math.max(0, plays.length - 1) + ' steps</span>';
  $('big2').innerHTML = '<b>' + nf + '</b>families touched of ' + D.fam.length;
  $('ev').textContent = 'sitting ' + (e + 1) + ' of ' + EV.length + ', ' + plays.length + ' plays.';
  $('leg').innerHTML = Object.keys(seen).map(function (f) { var n = D.fam[f]; return '<li><i style="background:' + (WK.FAMC[n] || PAL.ink) + '"></i>' + esc(n) + '</li>'; }).join('');
}
function say() {
  if (!plays.length) { $('say').textContent = 'no plays in this sitting. try the next one.'; return; }
  var p = plays[k], nx = plays[k + 1];
  $('say').textContent = 'step ' + (k + 1) + ' of ' + plays.length + ': ' + (D.n[p.i] || '') + ', ' + fname(p.i) + ', ' + hand(p) + (k === 0 ? ' (the start)' : '') + ', then ' + (nx ? (D.n[nx.i] || '') + (D.f[nx.i] !== D.f[p.i] ? ' (a crossing into ' + fname(nx.i) + ')' : '') : 'the sitting ends') + '.';
}

function segs(a, b, alpha) {
  if (b <= a) return [];
  var runs = [], q, cur = null, prev = null, pt;
  for (q = a; q <= b; q++) {
    pt = [m.X(plays[q].i), m.Y(plays[q].i)];
    if (!cur || D.f[plays[q].i] !== cur.f) {
      cur = { f: D.f[plays[q].i], q: q, pts: prev ? [prev] : [] }; runs.push(cur);
    }
    if (!cur.pts.length || cur.pts[cur.pts.length - 1][0] !== pt[0] || cur.pts[cur.pts.length - 1][1] !== pt[1]) cur.pts.push(pt);
    prev = pt;
  }
  runs.forEach(function (r) { var c = WK.FAMC[D.fam[r.f]] || PAL.ink; P.ribbon(m.g, r.pts, c, c, m.W < 500 ? 3 : 4, alpha); });
  return runs;
}
// an ink tick across the ribbon at each crossing, so a change reads without telling two close hues apart.
// it sits on the first curve P.ribbon draws for the new run (with its bow for a two-point run), at the point nearest the middle of the step
function ticks(runs, on) {
  var g = m.g, h = m.W < 500 ? 6 : 7;
  g.save(); g.globalCompositeOperation = 'source-over'; g.setLineDash([]); g.strokeStyle = PAL.ink; g.lineWidth = 2; g.lineCap = 'butt';
  runs.forEach(function (r) {
    if (!r.q || r.pts.length < 2) return;
    var p = r.pts, a = p[0], b = p[1], c = b, e, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, t, u, x = 0, y = 0, bd = 1e9, bt = 0.5, d;
    if (p.length === 2) { c = [mx - (b[1] - a[1]) * 0.14, my + (b[0] - a[0]) * 0.14]; e = [(c[0] + b[0]) / 2, (c[1] + b[1]) / 2]; }
    else e = [(b[0] + p[2][0]) / 2, (b[1] + p[2][1]) / 2];
    for (t = 0.1; t < 0.96; t += 0.05) {
      u = 1 - t; var qx = u * u * a[0] + 2 * u * t * c[0] + t * t * e[0], qy = u * u * a[1] + 2 * u * t * c[1] + t * t * e[1];
      d = (qx - mx) * (qx - mx) + (qy - my) * (qy - my); if (d < bd) { bd = d; bt = t; x = qx; y = qy; }
    }
    var tx = 2 * (1 - bt) * (c[0] - a[0]) + 2 * bt * (e[0] - c[0]), ty = 2 * (1 - bt) * (c[1] - a[1]) + 2 * bt * (e[1] - c[1]);
    d = Math.hypot(tx, ty);
    if (!(d > 0)) return;
    tx /= d; ty /= d;
    g.globalAlpha = !on || r.q <= k ? 1 : 0.45;
    g.beginPath(); g.moveTo(x - ty * h, y + tx * h); g.lineTo(x + ty * h, y - tx * h); g.stroke();
  });
  g.restore();
}
function draw() {
  if (!m) return;
  m.begin();
  var g = m.g, q, p, n = plays.length, on = go || k > 0;
  if (n) {
    var runs = segs(0, n - 1, on ? 0.32 : 0.85);
    if (on) segs(0, k, 0.95);
    for (q = 0; q < n; q++) {
      p = plays[q]; var past = !on || q <= k;
      g.globalAlpha = past ? 1 : 0.45; P.glyph(g, KIND[p.src].gly, m.X(p.i), m.Y(p.i), m.W < 500 ? 4.5 : 5.5, fcol(p.i)); g.globalAlpha = 1;
    }
    ticks(runs, on);
    if (on) {
      p = plays[k]; var x = m.X(p.i), y = m.Y(p.i);
      P.glyph(g, KIND[p.src].gly, x, y, 10, fcol(p.i));
      P.rings(g, x, y, fcol(p.i), 14);
      if (go) WK.pulse(g, x, y, fcol(p.i), 16);
      m.tag(p.i, (k + 1) + '/' + n, fcol(p.i));
    }
  }
  drawStrip();
}
function geom() { var pad = SW < 500 ? 12 : 24, n = Math.max(1, plays.length); return { pad: pad, cw: (SW - 2 * pad) / n }; }
function drawStrip() {
  sg.setTransform(sdpr, 0, 0, sdpr, 0, 0); sg.fillStyle = PAL.night; sg.fillRect(0, 0, SW, SH);
  if (!plays.length || !(SW > 0)) return;
  var gm = geom(), q, p, x, on = go || k > 0, cy = 30, ch = 28, gap = gm.cw > 8 ? 1.5 : 0.5;
  for (q = 0; q < plays.length; q++) {
    p = plays[q]; x = gm.pad + q * gm.cw;
    sg.globalAlpha = !on || q <= k ? 1 : 0.4; sg.fillStyle = fcol(p.i); sg.fillRect(x + gap / 2, cy, Math.max(1, gm.cw - gap), ch); sg.globalAlpha = 1;
    P.glyph(sg, KIND[p.src].gly, x + gm.cw / 2, cy + ch + 16, Math.max(1.5, Math.min(5, gm.cw * 0.4)), KIND[p.src].col);
    if (q > 0 && D.f[p.i] !== D.f[plays[q - 1].i]) { sg.fillStyle = PAL.ink; sg.fillRect(Math.round(x) - 0.5, cy - 12, 1.5, 12); }
  }
  if (on) {
    x = gm.pad + k * gm.cw; var b = WK.beat();
    sg.strokeStyle = PAL.ink; sg.lineWidth = 2; sg.strokeRect(x, cy - 2 - (go ? 2 * b : 0), gm.cw, ch + 4 + (go ? 4 * b : 0));
  }
}
function resize() {
  m.resize();
  sdpr = Math.min(3, window.devicePixelRatio || 1); SW = Math.max(200, st.clientWidth); SH = 88;
  st.width = Math.round(SW * sdpr); st.height = Math.round(SH * sdpr);
  draw();
}

function stopPlay() { go = false; clearTimeout(timer); AU.pause(); WK.still(); btn(); }
function btn() { var b = $('go'); b.textContent = go ? 'pause' : (k > 0 && k < plays.length - 1 ? 'play on' : 'play the sitting'); b.setAttribute('aria-pressed', go ? 'true' : 'false'); }
function playAt() {
  clearTimeout(timer);
  if (!go) return;
  if (k >= plays.length) { k = plays.length - 1; stopPlay(); $('now').textContent = 'the sitting ended. press play the sitting to hear it again.'; draw(); return; }
  var p = plays[k], rep = 0, q = k, u = PV && PV[p.i] ? PV[p.i][1] : null;
  while (q > 0 && plays[q - 1].i === p.i) { rep++; q--; }
  if (u) {
    AU.src = u; var off = (rep * 6) % 24, seek = function () { AU.removeEventListener('loadedmetadata', seek); try { if (off) AU.currentTime = off; } catch (x) {} };
    AU.addEventListener('loadedmetadata', seek); var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {});
  } else AU.pause();
  var ct = u ? PV[p.i][0] : null, same = ct && p.t && ct.trim().toLowerCase() === p.t.trim().toLowerCase();
  $('now').textContent = 'in my log: ' + (p.t ? '“' + p.t + '” by ' : '') + (D.n[p.i] || '') + ', ' + fname(p.i) + '.' + (u ? (same ? ' the clip is this song.' : ct ? ' the clip: “' + ct + '”.' : ' the clip is another song by this artist.') : '') + (rep ?' same artist as the last ' + (rep === 1 ? 'play' : rep + ' plays') + ', so the clip starts a few seconds later.' : '') + (u ? '' : ' no clip for this one.') + (WK.sound() ? '' : ' sound is off, turn it on at the top.');
  say(); draw(); btn();
  timer = setTimeout(function () { k++; playAt(); }, u ? STEP : STEP_NOCLIP);
}
function start(at) {
  if (!plays.length) return;
  k = Math.max(0, Math.min(plays.length - 1, at == null ? (k >= plays.length - 1 ? 0 : k) : at));
  go = true; WK.live(draw); playAt();
}
function jump(at) { start(at); }

$('go').addEventListener('click', function () { if (go) { stopPlay(); say(); draw(); } else start(); });
$('stop').addEventListener('click', function () { stopPlay(); $('now').textContent = 'stopped.'; draw(); });
$('nx').addEventListener('click', function () { if (!plays.length) return; jump(Math.min(plays.length - 1, k + 1)); });
$('ne').addEventListener('click', function () { load(e + 1); $('now').textContent = ''; });
$('re').addEventListener('click', function () { var n = Math.floor(Math.random() * EV.length); load(n === e ? n + 1 : n); $('now').textContent = ''; });
st.addEventListener('pointerdown', function (ev) {
  if (!plays.length) return; var r = st.getBoundingClientRect(), gm = geom();
  var q = Math.floor((ev.clientX - r.left - gm.pad) / gm.cw); if (q < 0 || q >= plays.length) return; jump(q);
});
addEventListener('keydown', function (ev) {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return; var t = ev.target && ev.target.tagName;
  if (t === 'BUTTON' || t === 'INPUT' || t === 'SUMMARY') return;
  if (ev.code === 'Space') { ev.preventDefault(); $('go').click(); }
  else if (ev.key === 'ArrowRight') { ev.preventDefault(); $('nx').click(); }
  else if (ev.key === 'ArrowLeft') { ev.preventDefault(); jump(Math.max(0, k - 1)); }
  else if (ev.key === 'n') $('ne').click();
});
var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (m) resize(); }, 80); });

WK.boot([WK.j('../haunted/data/haunted.json'), WK.pv()]).then(function (a) {
  D = a.D; M = a.M; EV = a.extra[0].ev; PV = a.extra[1];
  m = new WK.Map(sbox, $('cv'), D, M, {
    dim: 0.5,
    tap: function (i) {
      var best = -1, q, bd = 1e9;
      for (q = 0; q < plays.length; q++) if (plays[q].i === i) { var d = Math.abs(q - k); if (d < bd) { bd = d; best = q; } }
      if (best >= 0) jump(best);
    }
  });
  resize(); load(0);
}).catch(function () { $('say').textContent = 'the data did not load. reload the page.'; $('big').innerHTML = '<span class="c">no data</span>'; });
})();
