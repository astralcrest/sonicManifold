/* shared by the seeds and undo walls: loads the loop wall's machine and data by relative path, draws the map, plays previews. no storage. */
(function (root) {
  'use strict';
  var FAMC = { 'ambient/lofi': '#5fb8ff', 'classical': '#e9dcae', 'electronic': '#ff4fa3', 'experimental': '#b8ec4a', 'folk/country': '#d9a066', 'funk/disco': '#ffb3c6', 'hip-hop · r&b': '#ff5c7a', 'jazz': '#ffd36b', 'other': '#9a90b8', 'pop': '#ff8fd6', 'rock/metal': '#c9c2ff', 'soundtrack': '#8fd3b6', 'world/desi': '#f5a623', 'untagged': '#6f6790' };
  var C = { ink: '#efe9ff', mute: '#9a90b8', mint: '#21f6bc', amber: '#f5a623', night: '#06010f' };
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

  function Map(box, cv, D, M) {
    var g = cv.getContext('2d'), self = this, base = null;
    this.g = g; this.W = 0; this.H = 0;
    this.resize = function () {
      var dpr = Math.min(2, root.devicePixelRatio || 1);
      self.W = Math.max(200, box.clientWidth); self.H = Math.max(200, box.clientHeight); self.dpr = dpr;
      cv.width = self.W * dpr; cv.height = self.H * dpr; cv.style.width = self.W + 'px'; cv.style.height = self.H + 'px';
      var pad = self.W < 500 ? 14 : 28; self.scl = Math.min(self.W - 2 * pad, self.H - 2 * pad) / 1000;
      self.ox = (self.W - 1000 * self.scl) / 2; self.oy = (self.H - 1000 * self.scl) / 2; base = null;
    };
    this.X = function (i) { return Math.round(self.ox + D.xy[i][0] * self.scl) + 0.5; };
    this.Y = function (i) { return Math.round(self.oy + D.xy[i][1] * self.scl) + 0.5; };
    this.begin = function () {
      if (!base) {
        base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height;
        var b = base.getContext('2d'); b.setTransform(self.dpr, 0, 0, self.dpr, 0, 0); b.globalAlpha = 0.45;
        var sz = self.W < 500 ? 2 : 3;
        for (var i = 0; i < M.N; i++) { b.fillStyle = FAMC[D.fam[D.f[i]]] || C.mute; b.fillRect(self.X(i) - 1.5, self.Y(i) - 1.5, sz, sz); }
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.night; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(base, 0, 0);
      g.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
    };
    this.line = function (p, n, col, dash, w) {
      g.strokeStyle = col; g.lineWidth = w || 1.5; g.setLineDash(dash || []); g.beginPath();
      for (var k = 0; k < n; k++) { if (k) g.lineTo(self.X(p[k]), self.Y(p[k])); else g.moveTo(self.X(p[k]), self.Y(p[k])); }
      g.stroke(); g.setLineDash([]);
    };
    this.squares = function (p, n, col, s) {
      g.fillStyle = col; s = s || 5;
      for (var k = 0; k < n; k++) g.fillRect(self.X(p[k]) - s / 2, self.Y(p[k]) - s / 2, s, s);
    };
    this.ring = function (i, col, s) { g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash([]); g.strokeRect(self.X(i) - s / 2, self.Y(i) - s / 2, s, s); };
    // a number box on a dark chip so the digits never sit on the dots, nudged to stay inside the canvas
    this.tag = function (i, text, fg, bg) {
      g.font = '600 12px "IBM Plex Mono", monospace'; g.textBaseline = 'middle';
      var w = g.measureText(text).width + 8, x = self.X(i) + 9, y = self.Y(i) - 11;
      if (x + w > self.W - 2) x = self.X(i) - 9 - w; if (y < 9) y = self.Y(i) + 12; if (x < 2) x = 2;
      g.fillStyle = bg || C.night; g.fillRect(x, y - 9, w, 18); g.fillStyle = fg || C.ink; g.fillText(text, x + 4, y);
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
  root.WK = { j: j, FAMC: FAMC, C: C, $: $, boot: boot, Map: Map, pv: pv, title: title, play: play, stop: stop, playing: playing, esc: esc };
})(window);
