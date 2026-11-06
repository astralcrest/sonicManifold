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


  /* the shared look: crisp organic pebbles (one cached Path2D per artist), flat family color, 1 px night rim, flowing
     quadratic ribbons, key glyphs for the three hands. no blur, no shadow, no gradient. */
  var PAL = { mint: '#21f6bc', amber: '#f5a623', violet: '#8b6fd6', rose: '#ff5c7a', ice: '#bcd3ff', ink: '#efe9ff', night: '#06010f', gold: '#ffd36b' };
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')'; }
  var HASP = typeof Path2D !== 'undefined', PEB = {};
  function pebble(i) {
    if (PEB[i]) return PEB[i];
    var s = ((i + 1) * 2654435761) >>> 0 || 1, r = function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    var n = 7 + ((r() * 3) | 0), rot = r() * 6.2832, pts = [], k, a, rad, p = new Path2D();
    for (k = 0; k < n; k++) { a = rot + k * 6.2832 / n; rad = 0.78 + 0.22 * r(); pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
    p.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (k = 0; k < n; k++) { var q = pts[(k + 1) % n]; p.quadraticCurveTo(pts[k][0], pts[k][1], (pts[k][0] + q[0]) / 2, (pts[k][1] + q[1]) / 2); }
    p.closePath(); return (PEB[i] = p);
  }
  // one pebble at (x, y), radius r px, flat color, night rim when big enough to carry one
  function peb(g, i, x, y, r, col, rim) {
    if (!HASP || r < 1.4) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.8, r), 0, 6.2832); g.fill(); return; }
    g.save(); g.translate(x, y); g.scale(r, r); g.fillStyle = col; var p = pebble(i); g.fill(p);
    if (rim !== false && r > 2.2) { g.lineWidth = 1 / r; g.strokeStyle = PAL.night; g.stroke(p); }
    g.restore();
  }
  // key glyphs: star (my press), ring (auto-play), diamond (shuffle), dot, big star in a ring (my own songs)
  function star4(g, x, y, r) {
    g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.closePath();
  }
  function glyph(g, kind, x, y, r, col) {
    g.save(); g.setLineDash([]); g.globalAlpha = 1; g.fillStyle = col; g.strokeStyle = col; g.lineJoin = 'round';
    if (kind === 'star') { star4(g, x, y, r * 1.25); g.fill(); g.lineWidth = 1; g.strokeStyle = PAL.night; g.stroke(); }
    else if (kind === 'ring') { g.beginPath(); g.arc(x, y, r * 0.85, 0, 6.2832); g.lineWidth = 2; g.stroke(); }
    else if (kind === 'diamond') { g.beginPath(); g.moveTo(x, y - r * 1.1); g.lineTo(x + r * 0.9, y); g.lineTo(x, y + r * 1.1); g.lineTo(x - r * 0.9, y); g.closePath(); g.fill(); g.lineWidth = 1; g.strokeStyle = PAL.night; g.stroke(); }
    else if (kind === 'own') { g.beginPath(); g.arc(x, y, r * 1.5, 0, 6.2832); g.lineWidth = 1.5; g.stroke(); star4(g, x, y, r * 1.15); g.fill(); }
    else { g.beginPath(); g.arc(x, y, r * 0.7, 0, 6.2832); g.fill(); }
    g.restore();
  }
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
  // thin ice lattice: each artist to its three nearest (sounds alike)
  function lattice(g, xy, X, Y, o) {
    o = o || {}; var E = knn3(xy);
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = o.alpha == null ? 0.14 : o.alpha;
    g.strokeStyle = o.col || PAL.ice; g.lineWidth = o.w || 0.6; g.beginPath();
    for (var k = 0; k < E.length; k += 2) { g.moveTo(X(E[k]), Y(E[k])); g.lineTo(X(E[k + 1]), Y(E[k + 1])); }
    g.stroke(); g.restore();
  }
  // o: col(i) -> hex, t (weights), lo/hi radius-ish size in px (the old square side), core alpha, lattice alpha (0 = none), skip(i)
  function field(g, xy, X, Y, o) {
    o = o || {}; var N = xy.length, t = o.t || weights(N, o.pl), lo = o.lo || 1.5, hi = o.hi || 5, i, r;
    var col = o.col || function () { return PAL.mute || '#9a90b8'; };
    if (o.lattice !== 0) lattice(g, xy, X, Y, { alpha: o.lattice, col: o.latCol, w: o.latW });
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = o.core == null ? 0.9 : Math.min(1, o.core + 0.1);
    for (i = N - 1; i >= 0; i--) { if (o.skip && o.skip(i)) continue; r = (lo + (hi - lo) * t[i]) * 0.62; peb(g, i, X(i), Y(i), r, col(i)); }
    g.restore();
  }
  // a path as a flowing ribbon (quadratic through the midpoints), color runs from a to b, optional width by weight (0..1 per point)
  function ribbon(g, pts, a, b, w, alpha, dash, wts) {
    var n = pts.length; if (n < 2) return;
    if (n === 2) { var dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1]; pts = [pts[0], [(pts[0][0] + pts[1][0]) / 2 - dy * 0.14, (pts[0][1] + pts[1][1]) / 2 + dx * 0.14], pts[1]]; n = 3; wts = null; }
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = alpha == null ? 0.95 : alpha;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []);
    w = w || 2.5;
    for (var k = 1; k < n; k++) {
      var p0 = pts[k - 1], p1 = pts[k], p2 = pts[Math.min(n - 1, k + 1)];
      var sx = k === 1 ? p0[0] : (p0[0] + p1[0]) / 2, sy = k === 1 ? p0[1] : (p0[1] + p1[1]) / 2;
      var ex = k === n - 1 ? p1[0] : (p1[0] + p2[0]) / 2, ey = k === n - 1 ? p1[1] : (p1[1] + p2[1]) / 2;
      g.strokeStyle = mix(a, b || a, n > 2 ? (k - 1) / (n - 2) : 0);
      g.lineWidth = wts ? w * (0.7 + 0.9 * (wts[k] || 0)) : w;
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(p1[0], p1[1], ex, ey); g.stroke();
    }
    g.restore();
  }
  // stops along a path: the hand's glyph ('star' | 'ring' | 'diamond' | 'dot'), color running from a to b
  function stops(g, pts, a, b, s, kind) {
    var n = pts.length; s = s || 5;
    for (var k = 0; k < n; k++) glyph(g, kind || 'dot', pts[k][0], pts[k][1], s * 0.62, mix(a, b || a, n > 1 ? k / (n - 1) : 0));
  }
  // the current stop: three concentric crisp rings
  function rings(g, x, y, col, s) {
    s = s || 12;
    g.save(); g.globalCompositeOperation = 'source-over'; g.setLineDash([]); g.strokeStyle = col || PAL.ink;
    [[s, 1.5, 1], [s + 10, 1, 0.55], [s + 20, 1, 0.25]].forEach(function (r) { g.globalAlpha = r[2]; g.lineWidth = r[1]; g.beginPath(); g.arc(x, y, r[0] / 2 + 2, 0, 6.2832); g.stroke(); });
    g.restore();
  }
  var P = { PAL: PAL, rgb: rgb, mix: mix, knn3: knn3, weights: weights, lattice: lattice, field: field, ribbon: ribbon, stops: stops, rings: rings, peb: peb, glyph: glyph };

  function Map(box, cv, D, M, opt) {
    var g = cv.getContext('2d'), self = this, base = null, T = weights(D.xy.length, D.pl);
    opt = opt || {};
    this.g = g; this.W = 0; this.H = 0; this.opt = opt;
    this.resize = function () {
      var dpr = Math.min(3, root.devicePixelRatio || 1);
      self.W = Math.max(200, box.clientWidth); self.H = Math.max(200, box.clientHeight); self.dpr = dpr;
      cv.width = Math.round(self.W * dpr); cv.height = Math.round(self.H * dpr); cv.style.width = self.W + 'px'; cv.style.height = self.H + 'px';
      var pad = self.W < 500 ? 14 : 28; self.scl = Math.min(self.W - 2 * pad, self.H - 2 * pad) / 1000;
      self.ox = (self.W - 1000 * self.scl) / 2; self.oy = (self.H - 1000 * self.scl) / 2; base = null;
    };
    this.X = function (i) { return self.ox + D.xy[i][0] * self.scl; };
    this.Y = function (i) { return self.oy + D.xy[i][1] * self.scl; };
    this.pts = function (p, n) { var o = []; for (var k = 0; k < (n == null ? p.length : n); k++) o.push([self.X(p[k]), self.Y(p[k])]); return o; };
    this.lattice = function (ctx, alpha) { lattice(ctx || g, D.xy, self.X, self.Y, { alpha: alpha }); };
    this.begin = function () {
      if (!base) {
        base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
        var b = base.getContext('2d'); b.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
        b.fillStyle = C.night; b.fillRect(0, 0, self.W, self.H);
        var small = self.W < 500, k = opt.dim == null ? 1 : opt.dim;
        if (opt.lattice !== false) lattice(b, D.xy, self.X, self.Y, { alpha: 0.16 * (k < 1 ? 0.6 : 1) });
        field(b, D.xy, self.X, self.Y, { t: T, lattice: 0, lo: small ? 1.6 : 2.4, hi: small ? 5 : 8, core: 0.8 * k,
          col: function (i) { return FAMC[D.fam[D.f[i]]] || C.mute; } });
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.drawImage(base, 0, 0);
      g.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
    };
    this.ribbon = function (p, n, a, b, w, dash) { ribbon(g, self.pts(p, n), a, b, w || (self.W < 500 ? 1.75 : 2.25), 0.88, dash, p.map ? p.map(function (i) { return T[i]; }) : null); };
    this.stops = function (p, n, a, b, s, kind) { stops(g, self.pts(p, n), a, b, s || (self.W < 500 ? 4 : 5), kind); };
    this.stop = function (i, col, s) { rings(g, self.X(i), self.Y(i), col, s); };
    this.line = function (p, n, col, dash, w) { ribbon(g, self.pts(p, n), col, col, w || 1.5, 0.95, dash); };
    this.squares = function (p, n, col, s, kind) { stops(g, self.pts(p, n), col, col, s || 5, kind); };
    this.ring = function (i, col, s) { glyph(g, 'ring', self.X(i), self.Y(i), (s || 12) * 0.62, col); };
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

  /* ---------- sound: off until the chip is on; every preview and voice on every wall respects it ---------- */
  var SND = false, ELS = [], chip = null;
  try { SND = localStorage.getItem('sm_sound') === '1'; } catch (e) {}
  function chipLabel() { if (!chip) return; chip.textContent = SND ? 'sound on' : 'sound off, tap to hear'; chip.setAttribute('aria-pressed', SND ? 'true' : 'false'); chip.classList.toggle('on', SND); }
  function setSound(on) {
    SND = !!on; try { localStorage.setItem('sm_sound', SND ? '1' : '0'); } catch (e) {}
    ELS.forEach(function (a) { a.muted = !SND; }); chipLabel();
    if (!SND && root.speechSynthesis) try { root.speechSynthesis.cancel(); } catch (e) {}
  }
  function nudge() { if (!chip) return; chip.classList.add('nudge'); clearTimeout(nudge.t); nudge.t = setTimeout(function () { chip.classList.remove('nudge'); }, 2200); }
  if (root.HTMLMediaElement && !HTMLMediaElement.prototype.__wk) {
    var op = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (ELS.indexOf(this) < 0) ELS.push(this);
      this.muted = !SND; if (!SND) nudge();
      return op.apply(this, arguments);
    };
    HTMLMediaElement.prototype.__wk = 1;
  }
  if (root.speechSynthesis && !root.speechSynthesis.__wk) {
    var osp = root.speechSynthesis.speak.bind(root.speechSynthesis);
    root.speechSynthesis.speak = function (u) { if (!SND) { nudge(); return; } return osp(u); };
    root.speechSynthesis.__wk = 1;
  }

  /* ---------- the top strip, identical on every wall: what this shows, the key, sound, where this wall sits; then the sticky nav ---------- */
  var WALLS = [['loop', 'walk the loop'], ['two', 'the two of you'], ['taste', 'the taste test'], ['haunted', 'the haunted night'], ['seeds', 'the two seeds'], ['undo', 'undo a year'], ['blind', 'blind or named'], ['booth', 'the graveyard booth'], ['slow', 'the slow room'], ['tug', 'tug of two hands'], ['telephone', 'telephone'], ['stutter', 'the stutter']];
  var KEYS = {
    press: ['my press', 'a play i chose by hand', '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 1Q10 10 19 10Q10 10 10 19Q10 10 1 10Q10 10 10 1Z" fill="#21f6bc"/></svg>', '#21f6bc'],
    auto: ['auto-play', 'the app\'s own next pick', '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="#8b6fd6" stroke-width="2.4"/></svg>', '#8b6fd6'],
    shuffle: ['shuffle', 'a random next pick', '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 1.5L17 10L10 18.5L3 10Z" fill="#f5a623"/></svg>', '#f5a623'],
    alike: ['sounds alike', 'nearest neighbors on the sound map', '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M2 14L10 8L18 12" fill="none" stroke="#bcd3ff" stroke-width="1.2"/><circle cx="10" cy="8" r="2.4" fill="#bcd3ff"/></svg>', '#bcd3ff'],
    own: ['my own songs', 'songs i made', '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="8.4" fill="none" stroke="#ffd36b" stroke-width="1.3"/><path d="M10 3.5Q10 10 16.5 10Q10 10 10 16.5Q10 10 3.5 10Q10 10 10 3.5Z" fill="#ffd36b"/></svg>', '#ffd36b']
  };
  var CSS = '#wk-strip,#wk-nav{font-family:"Instrument Sans",system-ui,sans-serif;background:#06010f;color:#efe9ff;box-sizing:border-box}' +
    '#wk-strip{display:flex;flex-wrap:wrap;align-items:center;gap:12px 28px;padding:16px 48px;border-bottom:1px solid #241b3a}' +
    '#wk-strip .wk-line{flex:1 1 300px;max-width:560px;margin:0;font:500 17px/1.4 "Instrument Sans",system-ui,sans-serif;color:#efe9ff}' +
    '#wk-strip .wk-keys{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0;padding:0;list-style:none}' +
    '#wk-strip .wk-keys li{display:inline-flex;align-items:center;gap:7px;font:500 13px/1.2 "Instrument Sans",system-ui,sans-serif;color:var(--c)}' +
    '#wk-strip .wk-keys li svg{flex:none}' +
    '#wk-strip #wk-snd{font:500 14px/1.1 "IBM Plex Mono",ui-monospace,monospace;min-height:44px;min-width:44px;padding:0 18px;border-radius:22px;border:1.5px solid #bcd3ff;background:transparent;color:#efe9ff;cursor:pointer}' +
    '#wk-strip #wk-snd.on{background:#21f6bc;border-color:#21f6bc;color:#06010f}' +
    '#wk-strip #wk-snd.nudge{background:#f5a623;border-color:#f5a623;color:#06010f}' +
    '#wk-strip .wk-pos{margin:0;font:500 13px/1.2 "IBM Plex Mono",ui-monospace,monospace;color:#9a90b8;margin-left:auto;white-space:nowrap}' +
    '#wk-strip .wk-pos a{color:#bcd3ff}' +
    '#wk-nav{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:6px;padding:0 48px;border-bottom:1px solid #241b3a;overflow:hidden}' +
    '#wk-nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;color:#bcd3ff;text-decoration:none;font:500 13px/1 "IBM Plex Mono",ui-monospace,monospace;white-space:nowrap;border-radius:22px}' +
    '#wk-nav a:hover{background:#1a1230}#wk-nav a.sp{margin-left:auto}#wk-nav a[aria-disabled]{opacity:.35;pointer-events:none}' +
    '#wk-nav a:focus-visible,#wk-strip a:focus-visible,#wk-strip button:focus-visible{outline:2px solid #bcd3ff;outline-offset:2px}' +
    '@media(max-width:700px){#wk-strip{padding:16px 24px;gap:12px}#wk-strip .wk-pos{margin-left:0;white-space:normal}#wk-nav{padding:0 12px}#wk-nav a{padding:0 10px}#wk-nav a .nm{display:none}}' +
    'details.fine{border-top:1px solid #241b3a;margin:8px 0 0}details.fine summary{min-height:44px;display:flex;align-items:center;gap:10px;cursor:pointer;font:500 12px "IBM Plex Mono",monospace;letter-spacing:.14em;color:#9a90b8;list-style:none}' +
    'details.fine summary::-webkit-details-marker{display:none}details.fine summary::before{content:"+";display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border:1px solid #241b3a;color:#bcd3ff}details.fine[open] summary::before{content:"\\2212"}' +
    'details.fine p{font:13px/1.6 "IBM Plex Mono",monospace;color:#9a90b8;margin:0 0 10px;max-width:560px}';
  function esca(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function strip() {
    var b = document.body; if (!b || document.getElementById('wk-strip')) return;
    var n = parseInt(b.getAttribute('data-wall'), 10); if (!n) return;
    var line = b.getAttribute('data-line') || '', keys = (b.getAttribute('data-keys') || '').split(',').filter(Boolean);
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var s = document.createElement('div'); s.id = 'wk-strip';
    s.innerHTML = '<p class="wk-line">' + esca(line) + '</p>' + (keys.length ? '<ul class="wk-keys" aria-label="key">' : '') + keys.map(function (k) { var d = KEYS[k]; return d ? '<li style="--c:' + d[3] + '" title="' + esca(d[1]) + '">' + d[2] + d[0] + '</li>' : ''; }).join('') + (keys.length ? '</ul>' : '') +
      '<button type="button" id="wk-snd" aria-pressed="false"></button><p class="wk-pos">wall ' + n + ' of ' + WALLS.length + ' &middot; <a href="../walls/">all walls</a></p>';
    var L = WALLS.length, pv_ = WALLS[(n + L - 2) % L], nx_ = WALLS[n % L];
    var nav = document.createElement('nav'); nav.id = 'wk-nav'; nav.setAttribute('aria-label', 'the walls');
    nav.innerHTML = '<a href="../walls/">all walls</a><a class="sp" href="../' + pv_[0] + '/" rel="prev">&lsaquo; ' + ((n + L - 2) % L + 1) + '<span class="nm">&nbsp;' + pv_[1] + '</span></a><a href="../' + nx_[0] + '/" rel="next">' + (n % L + 1) + '<span class="nm">&nbsp;' + nx_[1] + '</span> &rsaquo;</a>';
    b.insertBefore(nav, b.firstChild); b.insertBefore(s, b.firstChild);
    chip = document.getElementById('wk-snd'); chipLabel();
    chip.addEventListener('click', function () { setSound(!SND); });
    var fit = function () { document.documentElement.style.setProperty('--sh', (s.offsetHeight + nav.offsetHeight) + 'px'); document.documentElement.style.setProperty('--nh', nav.offsetHeight + 'px'); };
    fit(); root.addEventListener('resize', fit); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }
  strip();

  root.WK = { sound: function () { return SND; }, setSound: setSound, P: P, j: j, FAMC: FAMC, C: C, $: $, boot: boot, Map: Map, pv: pv, title: title, play: play, stop: stop, playing: playing, esc: esc };
})(window);
