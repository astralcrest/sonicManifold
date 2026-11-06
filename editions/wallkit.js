/* shared by the walls: the gallery painter (WK.P) for every map, and for seeds, undo, blind and slow: loads the loop wall's machine and data by relative path, draws the map, plays previews. no storage. */
(function (root) {
  'use strict';
  var FAMC = { 'ambient/lofi': '#5fb8ff', 'classical': '#e9dcae', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ffb3c6', 'hip-hop · r&b': '#ff5c7a', 'jazz': '#ffd36b', 'other': '#9a90b8', 'pop': '#ff8fd6', 'rock/metal': '#c9c2ff', 'soundtrack': '#8fd3b6', 'world/desi': '#f5a623', 'untagged': '#6f6790' };
  var C = { ink: '#efe9ff', mute: '#9a90b8', mint: '#21f6bc', amber: '#f5a623', violet: '#8b6fd6', rose: '#ff5c7a', ice: '#bcd3ff', night: '#06010f' };
  var $ = function (id) { return document.getElementById(id); };
  function j(u) { return fetch(u).then(function (r) { return r.json(); }); }

  // loop.js exports the machine when a module object is present, and returns before its own page code runs
  function loadLoop() {
    return fetch('../loop/loop.js').then(function (r) { return r.text(); }).then(function (src) {
      var m = { exports: {} };
      new Function('module', src).call({}, m);
      return m.exports;
    });
  }
  function boot(extra) {
    return Promise.all([loadLoop(), j('../loop/data/loop.json'), j('../loop/data/fit.json')].concat(extra || [])).then(function (a) {
      var LOOP = a[0], D = a[1], FIT = a[2];
      return { LOOP: LOOP, D: D, FIT: FIT, M: LOOP.model(D), extra: a.slice(3) };
    });
  }


  /* the gallery look, shared by every wall: crisp squares only, no blur, no shadow. luminosity comes from additive
     compositing ('lighter'): a bright core square plus a larger dim square of the same hue, so dense rooms brighten. */
  var PAL = { mint: '#21f6bc', amber: '#f5a623', violet: '#8b6fd6', rose: '#ff5c7a', ice: '#bcd3ff', ink: '#efe9ff', night: '#06010f', gold: '#ffd36b' };
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')'; }
  // each artist to its three nearest on the flat map, as a deduplicated flat edge list; cached per coordinate array
  var EDGES = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function knn3(xy) {
    if (EDGES && EDGES.has(xy)) return EDGES.get(xy);
    var N = xy.length, CS = 40, GW = 26, cells = {}, i, k, out = [], seen = {};
    for (i = 0; i < N; i++) { var key = ((xy[i][0] / CS) | 0) + ',' + ((xy[i][1] / CS) | 0); (cells[key] || (cells[key] = [])).push(i); }
    for (i = 0; i < N; i++) {
      var cx = (xy[i][0] / CS) | 0, cy = (xy[i][1] / CS) | 0, best = [[1e18, -1], [1e18, -1], [1e18, -1]];
      for (var r = 1; r < GW; r++) {
        for (var gx = cx - r; gx <= cx + r; gx++) for (var gy = cy - r; gy <= cy + r; gy++) {
          if (r > 1 && gx > cx - r && gx < cx + r && gy > cy - r && gy < cy + r) continue;
          var c = cells[gx + ',' + gy]; if (!c) continue;
          for (k = 0; k < c.length; k++) {
            var j = c[k]; if (j === i) continue;
            var dx = xy[i][0] - xy[j][0], dy = xy[i][1] - xy[j][1], d = dx * dx + dy * dy;
            if (d < best[2][0]) { best[2] = [d, j]; best.sort(function (a, b) { return a[0] - b[0]; }); }
          }
        }
        if (best[2][1] >= 0 && best[2][0] <= (r * CS) * (r * CS)) break;
      }
      for (k = 0; k < 3; k++) { var b = best[k][1]; if (b < 0) continue; var lo = Math.min(i, b), hi = Math.max(i, b), sk = lo * N + hi; if (!seen[sk]) { seen[sk] = 1; out.push(lo, hi); } }
    }
    var E = new Int32Array(out); if (EDGES) EDGES.set(xy, E); return E;
  }
  // 0..1 weight per artist: log plays when known, else play rank (every map here is ordered most played first)
  function weights(N, pl) {
    var t = new Float32Array(N), i;
    if (pl) { var mx = Math.log(1 + Math.max.apply(null, pl)); for (i = 0; i < N; i++) t[i] = Math.log(1 + pl[i]) / mx; }
    else for (i = 0; i < N; i++) t[i] = 1 - Math.sqrt(i / N);
    return t;
  }
  function lattice(g, xy, X, Y, o) {
    o = o || {}; var E = knn3(xy);
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = o.alpha == null ? 0.12 : o.alpha;
    g.strokeStyle = o.col || PAL.violet; g.lineWidth = o.w || 0.5; g.beginPath();
    for (var k = 0; k < E.length; k += 2) { g.moveTo(X(E[k]), Y(E[k])); g.lineTo(X(E[k + 1]), Y(E[k + 1])); }
    g.stroke(); g.restore();
  }
  // o: col(i) -> hex, t (weights), lo/hi core size in px, core/halo alpha, lattice alpha (0 = none), skip(i)
  function field(g, xy, X, Y, o) {
    o = o || {}; var N = xy.length, t = o.t || weights(N, o.pl), lo = o.lo || 1.5, hi = o.hi || 5, i, s, h, x, y;
    var col = o.col || function () { return PAL.mute || '#9a90b8'; };
    if (o.lattice !== 0) lattice(g, xy, X, Y, { alpha: o.lattice, col: o.latCol, w: o.latW });
    g.save(); g.globalCompositeOperation = 'lighter';
    g.globalAlpha = o.halo == null ? 0.11 : o.halo;
    for (i = 0; i < N; i++) { if (o.skip && o.skip(i)) continue; s = Math.max(1, Math.round(lo + (hi - lo) * t[i])); h = s * 2 + 3; g.fillStyle = col(i); g.fillRect(Math.round(X(i) - h / 2), Math.round(Y(i) - h / 2), h, h); }
    g.globalAlpha = o.core == null ? 0.82 : o.core;
    for (i = 0; i < N; i++) { if (o.skip && o.skip(i)) continue; s = Math.max(1, Math.round(lo + (hi - lo) * t[i])); g.fillStyle = col(i); g.fillRect(Math.round(X(i) - s / 2), Math.round(Y(i) - s / 2), s, s); }
    g.restore();
  }
  // a path as a ribbon whose color runs from the first step (a) to the last (b); pts = [[x, y], ...]
  function ribbon(g, pts, a, b, w, alpha, dash) {
    var n = pts.length; if (n < 2) return;
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha == null ? 0.95 : alpha;
    g.lineWidth = w || 2.5; g.lineCap = dash ? 'butt' : 'square'; g.lineJoin = 'miter'; g.setLineDash(dash || []);
    for (var k = 1; k < n; k++) {
      g.strokeStyle = mix(a, b || a, n > 2 ? (k - 1) / (n - 2) : 0);
      g.beginPath(); g.moveTo(pts[k - 1][0], pts[k - 1][1]); g.lineTo(pts[k][0], pts[k][1]); g.stroke();
    }
    g.restore();
  }
  // small bright squares at the stops, each with a dim square of its hue behind it
  function stops(g, pts, a, b, s) {
    var n = pts.length; s = s || 5;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (var k = 0; k < n; k++) {
      var c = mix(a, b || a, n > 1 ? k / (n - 1) : 0), x = pts[k][0], y = pts[k][1], h = s * 2 + 4;
      g.globalAlpha = 0.22; g.fillStyle = c; g.fillRect(Math.round(x - h / 2), Math.round(y - h / 2), h, h);
      g.globalAlpha = 1; g.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
    }
    g.restore();
  }
  // the current stop: three concentric crisp square rings
  function rings(g, x, y, col, s) {
    s = s || 12; x = Math.round(x) + 0.5; y = Math.round(y) + 0.5;
    g.save(); g.globalCompositeOperation = 'source-over'; g.setLineDash([]); g.strokeStyle = col || PAL.ink;
    [[s, 1.5, 1], [s + 10, 1, 0.55], [s + 20, 1, 0.25]].forEach(function (r) { g.globalAlpha = r[2]; g.lineWidth = r[1]; var h = Math.round(r[0] / 2); g.strokeRect(x - h, y - h, 2 * h, 2 * h); });
    g.restore();
  }
  var P = { PAL: PAL, rgb: rgb, mix: mix, knn3: knn3, weights: weights, lattice: lattice, field: field, ribbon: ribbon, stops: stops, rings: rings };

  function Map(box, cv, D, M, opt) {
    var g = cv.getContext('2d'), self = this, base = null, T = weights(D.xy.length, D.pl);
    opt = opt || {};
    this.g = g; this.W = 0; this.H = 0; this.opt = opt;
    this.resize = function () {
      var dpr = Math.min(2, root.devicePixelRatio || 1);
      self.W = Math.max(200, box.clientWidth); self.H = Math.max(200, box.clientHeight); self.dpr = dpr;
      cv.width = self.W * dpr; cv.height = self.H * dpr; cv.style.width = self.W + 'px'; cv.style.height = self.H + 'px';
      var pad = self.W < 500 ? 14 : 28; self.scl = Math.min(self.W - 2 * pad, self.H - 2 * pad) / 1000;
      self.ox = (self.W - 1000 * self.scl) / 2; self.oy = (self.H - 1000 * self.scl) / 2; base = null;
    };
    this.X = function (i) { return Math.round(self.ox + D.xy[i][0] * self.scl) + 0.5; };
    this.Y = function (i) { return Math.round(self.oy + D.xy[i][1] * self.scl) + 0.5; };
    this.pts = function (p, n) { var o = []; for (var k = 0; k < (n == null ? p.length : n); k++) o.push([self.X(p[k]), self.Y(p[k])]); return o; };
    this.lattice = function (ctx, alpha) { lattice(ctx || g, D.xy, self.X, self.Y, { alpha: alpha }); };
    this.begin = function () {
      if (!base) {
        base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
        var b = base.getContext('2d'); b.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
        b.fillStyle = C.night; b.fillRect(0, 0, self.W, self.H);
        var small = self.W < 500, k = opt.dim == null ? 1 : opt.dim;
        if (opt.lattice !== false) self.lattice(b, 0.12);
        field(b, D.xy, self.X, self.Y, { t: T, lattice: 0, lo: small ? 1 : 1.5, hi: small ? 3.5 : 5.5, core: 0.82 * k, halo: 0.11 * k,
          col: function (i) { return FAMC[D.fam[D.f[i]]] || C.mute; } });
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.drawImage(base, 0, 0);
      g.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
    };
    this.ribbon = function (p, n, a, b, w, dash) { ribbon(g, self.pts(p, n), a, b, w || (self.W < 500 ? 1.75 : 2.25), 0.88, dash); };
    this.stops = function (p, n, a, b, s) { stops(g, self.pts(p, n), a, b, s || (self.W < 500 ? 4 : 5)); };
    this.stop = function (i, col, s) { rings(g, self.X(i), self.Y(i), col, s); };
    this.line = function (p, n, col, dash, w) { ribbon(g, self.pts(p, n), col, col, w || 1.5, 0.95, dash); };
    this.squares = function (p, n, col, s) { stops(g, self.pts(p, n), col, col, s || 5); };
    this.ring = function (i, col, s) { g.save(); g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash([]); var h = Math.round(s / 2); g.strokeRect(self.X(i) - h, self.Y(i) - h, 2 * h, 2 * h); g.restore(); };
    // a number box on a dark chip so the digits never sit on the dots, nudged to stay inside the canvas
    this.tag = function (i, text, fg, bg) {
      g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
      var w = g.measureText(text).width + 12, x = self.X(i) + 12, y = self.Y(i) - 14;
      if (x + w > self.W - 2) x = self.X(i) - 12 - w; if (y < 11) y = self.Y(i) + 16; if (x < 2) x = 2;
      x = Math.round(x); y = Math.round(y);
      g.fillStyle = bg || C.night; g.fillRect(x, y - 11, w, 22); g.strokeStyle = fg || C.ink; g.lineWidth = 1; g.strokeRect(x + 0.5, y - 10.5, w - 1, 21);
      g.fillStyle = fg || C.ink; g.fillText(text, x + 6, y + 0.5); g.restore();
    };
  }

  var PV = null, pvP = null, AU = null, plist = [], pk = -1, onstate = null;
  function pv() {
    if (PV) return Promise.resolve(PV);
    if (!pvP) pvP = j('../loop/data/pv.json').then(function (x) { PV = x.a; return PV; });
    return pvP;
  }
  function title(i) { return PV && PV[i] ? PV[i][0] : null; }
  function playing() { return pk >= 0; }
  function stop() { if (AU) AU.pause(); pk = -1; if (onstate) onstate(-1, null); }
  function next(k) {
    while (k < plist.length && !(PV && PV[plist[k].i])) k++;
    if (k >= plist.length) { stop(); return; }
    if (!AU) { AU = new Audio(); AU.volume = 0.25; AU.addEventListener('ended', function () { if (pk >= 0) next(pk + 1); }); }
    var t = PV[plist[k].i]; pk = k; AU.src = t[1];
    var pr = AU.play(); if (pr && pr.catch) pr.catch(function () {});
    if (onstate) onstate(k, { title: t[0], tag: plist[k].tag, i: plist[k].i });
  }
  // list = [{i: artist index, tag: 'a' | 'b'}]; one preview at a time, only after a tap; onst(k, info) is told every change, k = -1 when stopped
  function play(list, onst) { onstate = onst; plist = list; return pv().then(function () { next(0); }, function () { if (onst) onst(-1, null); }); }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  root.WK = { P: P, j: j, FAMC: FAMC, C: C, $: $, boot: boot, Map: Map, pv: pv, title: title, play: play, stop: stop, playing: playing, esc: esc };
})(window);
