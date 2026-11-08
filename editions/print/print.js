/* printable pages: shared plumbing (hash inputs, the field, the two looks, the strip) and the five sheets. needs wallkit.js (WK.P) and, for QR codes, receipt.js (smReceipt.qr). nothing is stored. */
(function () {
  'use strict';
  var WK = window.WK, P = WK.P, FAMC = WK.FAMC;
  var NIGHT = '#06010f', MINT = '#21f6bc', VIOLET = '#8b6fd6', AMBER = '#f5a623', ICE = '#bcd3ff', ROSE = '#ff5c7a', GOLD = '#ffd36b';
  var MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace', SANS = '"Instrument Sans", system-ui, sans-serif';
  var SC = 3; // print resolution: always 3 device pixels per css pixel
  var SITE = 'https://astralcrest.github.io/sonicManifold/editions/';
  var D = null, W = null;

  /* ---------- small helpers ---------- */
  function hash() {
    var o = {}; location.hash.replace(/^#/, '').split('&').forEach(function (kv) {
      if (!kv) return; var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '1' : kv.slice(i + 1);
      try { v = decodeURIComponent(v); } catch (e) {} o[k] = v;
    }); return o;
  }
  function ints(s, N) { if (!s) return []; return String(s).split(',').map(Number).filter(function (x) { return isFinite(x) && x % 1 === 0 && x >= 0 && x < N; }); }
  function int1(s, N) { var a = ints(s, N); return a.length ? a[0] : -1; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hexrgb(h) { h = String(h).replace('#', ''); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mx(a, b, t) { var x = hexrgb(a), y = hexrgb(b); return '#' + [0, 1, 2].map(function (i) { var v = Math.round(x[i] + (y[i] - x[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function pad3(n) { return ('000' + n).slice(-3); }
  function dateStr() { var m = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], d = new Date(); return m[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function theme(paper) {
    return paper ? { paper: 1, bg: '#ffffff', ink: NIGHT, mute: '#5d5478', line: '#cfc8e0', darken: 0.22, lat: mx(ICE, NIGHT, 0.5), plate: '#ffffff' }
      : { paper: 0, bg: NIGHT, ink: '#efe9ff', mute: '#9a90b8', line: '#241b3a', darken: 0, lat: ICE, plate: '#efe9ff' };
  }
  function fc(i, T, dim) {
    var c = FAMC[D.fam[D.f[i]]] || '#9a90b8'; if (T.darken) c = mx(c, NIGHT, T.darken); if (dim) c = mx(c, T.bg, dim); return c;
  }
  function tx(g, s, x, y, font, col, al) { g.font = font; g.fillStyle = col; g.textAlign = al || 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  function wrapT(g, text, maxw) {
    var out = [], line = ''; String(text).split(' ').forEach(function (w) { var t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxw && line) { out.push(line); line = w; } else line = t; });
    if (line) out.push(line); return out;
  }
  function fit(g, s, maxw) { if (g.measureText(s).width <= maxw) return s; while (s.length > 1 && g.measureText(s + '...').width > maxw) s = s.slice(0, -1); return s + '...'; }
  function nm(i) { return D.n[i]; }

  /* the field: every artist as a pebble in family color, ice lines to each one's three nearest. returns the coordinate maps */
  function field(g, T, x, y, s, o) {
    o = o || {}; var sc = s / 1000;
    var X = function (i) { return x + D.xy[i][0] * sc; }, Y = function (i) { return y + D.xy[i][1] * sc; };
    P.field(g, D.xy, X, Y, { t: W, lo: 1.4 + s / 260, hi: 3.5 + s / 70, core: 0.85, lattice: o.lat == null ? (T.paper ? 0.2 : 0.14) : o.lat, latCol: T.lat, latW: T.paper ? 0.5 : 0.6, col: function (i) { return fc(i, T, o.dim); } });
    return { X: X, Y: Y };
  }
  // a ribbon; on paper it gets a night casing so mint and amber hold on white
  function rib(g, T, pts, a, b, w, dash) {
    if (pts.length < 2) return;
    if (T.paper) P.ribbon(g, pts, NIGHT, NIGHT, w + 2.6, 0.92, dash);
    P.ribbon(g, pts, a, b, w, 0.98, dash);
  }
  function qrDraw(g, T, url, x, y, size) {
    var mat; try { mat = window.smReceipt.qr(url); } catch (e) { return false; }
    var n = mat.length, q = 2, mod = Math.floor(size / (n + 2 * q) * SC) / SC, side = mod * (n + 2 * q);
    g.fillStyle = T.plate; g.fillRect(x, y, side, side);
    g.fillStyle = NIGHT; mat.forEach(function (row, r) { row.forEach(function (d, c) { if (d) g.fillRect(x + (c + q) * mod, y + (r + q) * mod, mod, mod); }); });
    if (T.paper) { g.strokeStyle = NIGHT; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, side - 1, side - 1); }
    return side;
  }
  function legend(g, T, x, y, items, gap) {
    items.forEach(function (it) {
      var gx = x + 7;
      if (it[0] === 'peb') P.peb(g, 5, gx, y - 3, 5, it[1]);
      else if (it[0] === 'line') { g.strokeStyle = it[1]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 14, y - 3); g.stroke(); gx = x + 7; }
      else if (it[0] === 'ringthin') { g.strokeStyle = it[1]; g.lineWidth = 1.6; g.beginPath(); g.arc(gx, y - 3, 5, 0, 6.2832); g.stroke(); }
      else P.glyph(g, it[0], gx, y - 3, 6, it[1]);
      tx(g, it[2], x + 20, y, '500 8.5px ' + MONO, T.mute); g.font = '500 8.5px ' + MONO;
      x += 20 + g.measureText(it[2]).width + (gap || 14);
    });
  }
  function topNN(cur, visited, rule) { // nearest unvisited of the six nearest in sound
    var l = D.nn[cur]; for (var k = 0; k < l.length; k++) if (!visited[l[k]]) return l[k]; return -1;
  }

  /* ---------- the five sheets ---------- */
  var PAGES = {};

  // 1. the split stub
  PAGES.stub = {
    mm: [148, 105], px: [559, 397],
    init: function (H) {
      var a = int1(H.a, D.n.length); if (a < 0) a = Math.floor(Math.random() * 100);
      var k = H.k == null ? null : Math.max(0, Math.min(12, parseInt(H.k, 10) || 0));
      var n = parseInt(H.n, 10); if (!(n > 0)) n = 1 + Math.floor(Math.random() * 999);
      return { a: a, k: k, n: n, date: dateStr(), tape: H.tape === '1' };
    },
    // the 62 mm continuous tape (DK-2205): the same two halves stacked, tear line across
    mmOf: function (st) { return st.tape ? [62, 190] : [148, 105]; },
    pxOf: function (st) { return st.tape ? [234, 718] : [559, 397]; },
    toggle: { key: 'tape', on: 'A6 slip', off: '62 mm tape' },
    alt: function (st) { return 'the split stub' + (st.tape ? ' on 62 mm tape. top half' : '. left half') + ': the point you ended on, ' + nm(st.a) + ', and its six nearest in sound. ' + (st.tape ? 'bottom' : 'right') + ' half: the wall copy, stub ' + pad3(st.n) + '.'; },
    drawTape: function (g, T, st) {
      var w = 234, h = 718, hh = h / 2, s = 200, x0 = 17, a = st.a, near = D.nn[a].slice(0, 6);
      g.fillStyle = T.bg; g.fillRect(0, 0, w, h);
      var half = function (y0, flip) {
        g.save(); g.translate(0, y0);
        if (flip) { g.translate(x0 + s, 0); g.scale(-1, 1); }
        var f = field(g, T, flip ? 0 : x0, 46, s, {});
        g.strokeStyle = T.lat; g.lineWidth = 1.2; g.globalAlpha = 0.9; g.beginPath();
        near.forEach(function (j) { g.moveTo(f.X(a), f.Y(a)); g.lineTo(f.X(j), f.Y(j)); }); g.stroke(); g.globalAlpha = 1;
        near.forEach(function (j) { P.peb(g, j, f.X(j), f.Y(j), 4.6, fc(j, T, 0)); });
        P.glyph(g, 'star', f.X(a), f.Y(a), 8, MINT);
        g.restore();
        g.strokeStyle = T.line; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 46.5, s - 1, s - 1);
      };
      // top: the visitor's half
      tx(g, 'the split stub \u00b7 your half', x0, 20, '500 8px ' + MONO, T.mute);
      g.font = '600 16px ' + SANS; tx(g, fit(g, nm(a), s), x0, 39, '600 16px ' + SANS, T.ink);
      half(0, false);
      g.font = '500 7.5px ' + MONO; var nl = wrapT(g, 'nearest in sound: ' + near.map(nm).join(', '), s).slice(0, 3);
      nl.forEach(function (l, k) { tx(g, l, x0, 262 + k * 10, '500 7.5px ' + MONO, T.mute); });
      tx(g, st.date, x0, 300, '500 9px ' + MONO, T.ink);
      if (st.k != null) tx(g, 'you kept ' + st.k + ' of 12', x0 + s, 300, '600 11px ' + SANS, T.ink, 'right');
      P.glyph(g, 'own', x0 + 5, 318, 3.2, GOLD);
      tx(g, 'my album: 23 songs by astralcrest', x0 + 16, 321, '500 7.5px ' + MONO, T.mute);
      tx(g, 'nothing was stored. a toy.', x0, 336, '500 7.5px ' + MONO, T.mute);
      // tear line across
      g.save(); g.strokeStyle = T.mute; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(10, hh); g.lineTo(w - 10, hh); g.stroke(); g.restore();
      tx(g, 'tear here', w / 2, hh - 4, '500 7.5px ' + MONO, T.mute, 'center');
      // bottom: the wall's copy, mirrored
      g.save(); g.translate(0, hh);
      tx(g, 'the split stub \u00b7 the wall\'s half', x0, 20, '500 8px ' + MONO, T.mute);
      tx(g, 'no. ' + pad3(st.n), x0, 40, '600 22px ' + SANS, T.ink);
      half(0, true);
      tx(g, 'same point, mirrored. no names.', x0, 262, '500 7.5px ' + MONO, T.mute);
      tx(g, st.date, x0, 300, '500 9px ' + MONO, T.ink);
      g.font = '500 7.5px ' + MONO; wrapT(g, 'tear on the dotted line. one half goes home, one half goes on the wall.', s).forEach(function (l, k) { tx(g, l, x0, 318 + k * 10, '500 7.5px ' + MONO, T.mute); });
      g.restore();
    },
    draw: function (g, T, st) {
      if (st.tape) return PAGES.stub.drawTape(g, T, st);
      var w = 559, h = 397, hw = w / 2, s = 240, a = st.a, near = D.nn[a].slice(0, 6), i;
      g.fillStyle = T.bg; g.fillRect(0, 0, w, h);
      var half = function (x0, flip) {
        g.save();
        if (flip) { g.translate(x0 + s, 0); g.scale(-1, 1); }
        var f = field(g, T, flip ? 0 : x0, 64, s, {});
        g.strokeStyle = T.lat; g.lineWidth = 1.2; g.globalAlpha = 0.9; g.beginPath();
        near.forEach(function (j) { g.moveTo(f.X(a), f.Y(a)); g.lineTo(f.X(j), f.Y(j)); }); g.stroke(); g.globalAlpha = 1;
        near.forEach(function (j) { P.peb(g, j, f.X(j), f.Y(j), 5.2, fc(j, T, 0)); });
        P.glyph(g, 'star', f.X(a), f.Y(a), 9, MINT);
        g.restore();
        g.strokeStyle = T.line; g.lineWidth = 1; g.strokeRect(x0 + 0.5, 64.5, s - 1, s - 1);
      };
      // left: the visitor's half
      var x0 = 20;
      tx(g, 'the split stub · your half', x0, 27, '500 8.5px ' + MONO, T.mute);
      g.font = '600 19px ' + SANS; tx(g, fit(g, nm(a), s), x0, 52, '600 19px ' + SANS, T.ink);
      half(x0, false);
      g.font = '500 8px ' + MONO; var nl = wrapT(g, 'nearest in sound: ' + near.map(nm).join(', '), s).slice(0, 2);
      nl.forEach(function (l, k) { tx(g, l, x0, 321 + k * 11, '500 8px ' + MONO, T.mute); });
      tx(g, st.date, x0, 354, '500 9px ' + MONO, T.ink);
      if (st.k != null) tx(g, 'you kept ' + st.k + ' of 12', x0 + s, 355, '600 13px ' + SANS, T.ink, 'right');
      P.glyph(g, 'own', x0 + 5, 369, 3.2, GOLD);
      tx(g, 'my album: 23 songs by astralcrest', x0 + 16, 372, '500 8px ' + MONO, T.mute);
      tx(g, 'nothing was stored. a toy.', x0, 387, '500 7.5px ' + MONO, T.mute);
      // tear line
      g.save(); g.strokeStyle = T.mute; g.lineWidth = 1; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(hw, 10); g.lineTo(hw, h - 10); g.stroke(); g.restore();
      g.save(); g.translate(hw - 5, h / 2); g.rotate(-Math.PI / 2); tx(g, 'tear here', 0, 0, '500 7.5px ' + MONO, T.mute, 'center'); g.restore();
      // right: the wall's copy, same drawing mirrored
      var x1 = hw + 20;
      tx(g, 'the split stub · the wall\'s half', x1, 27, '500 8.5px ' + MONO, T.mute);
      tx(g, 'no. ' + pad3(st.n), x1, 52, '600 24px ' + SANS, T.ink);
      half(x1, true);
      tx(g, 'same point, mirrored. no names.', x1, 321, '500 8px ' + MONO, T.mute);
      tx(g, st.date, x1, 354, '500 9px ' + MONO, T.ink);
      g.font = '500 8px ' + MONO; wrapT(g, 'tear on the dotted line. one half goes home, one half goes on the wall.', s).forEach(function (l, k) { tx(g, l, x1, 372 + k * 10, '500 8px ' + MONO, T.mute); });
    }
  };

  // 2. the chorus poster
  PAGES.chorus = {
    mm: [210, 297], px: [794, 1123],
    init: function (H) {
      var N = D.n.length, pts = ints(H.pts, N);
      if (!pts.length) {
        var r = rng(20261106), cur = Math.floor(r() * 100), seen = {}; pts = [cur]; seen[cur] = 1;
        while (pts.length < 12) {
          var l = D.nn[cur].filter(function (j) { return !seen[j]; }); if (!l.length) break;
          cur = l[Math.min(l.length - 1, Math.floor(r() * r() * l.length * 1.6))]; seen[cur] = 1; pts.push(cur);
        }
        return { pts: pts, toy: true };
      }
      return { pts: pts };
    },
    alt: function (st) { return 'the chorus poster: ' + st.pts.length + ' visitors tonight, each one a mint star on my sound map, joined by one ribbon in play order. nobody chose the whole path.'; },
    draw: function (g, T, st) {
      var w = 794, h = 1123, s = 660, fx = 67, fy = 340, n = st.pts.length;
      g.fillStyle = T.bg; g.fillRect(0, 0, w, h);
      tx(g, 'astralcrest · sonicManifold', 48, 62, '500 11px ' + MONO, T.mute);
      var num = String(n); g.font = '600 168px ' + SANS; var nw = g.measureText(num).width;
      tx(g, num, 44, 232, '600 168px ' + SANS, T.ink);
      g.fillStyle = MINT; g.fillRect(48, 246, Math.min(nw, 300), 7);
      tx(g, n === 1 ? 'visitor' : 'visitors', 44 + nw + 18, 188, '600 38px ' + SANS, T.ink);
      tx(g, 'tonight', 44 + nw + 18, 232, '600 38px ' + SANS, T.ink);
      tx(g, 'nobody chose the whole path.', 48, 296, '500 28px ' + SANS, T.ink);
      tx(g, 'each star is one visitor\'s point. the ribbon joins them in the order they came.', 48, 320, '500 11px ' + MONO, T.mute);
      var f = field(g, T, fx, fy, s, { dim: T.paper ? 0.4 : 0.5, lat: T.paper ? 0.1 : 0.07 });
      g.strokeStyle = T.line; g.lineWidth = 1; g.strokeRect(fx + 0.5, fy + 0.5, s - 1, s - 1);
      var pts = st.pts.map(function (i) { return [f.X(i), f.Y(i)]; });
      rib(g, T, pts, MINT, MINT, 2.4);
      pts.forEach(function (p) { if (T.paper) P.glyph(g, 'star', p[0], p[1], 8.6, NIGHT); P.glyph(g, 'star', p[0], p[1], 7.4, MINT); });
      legend(g, T, 48, 1034, [['star', MINT, 'one visitor\'s point'], ['line', MINT, 'play order'], ['peb', '#9a90b8', 'artists on my map, by genre family']]);
      tx(g, 'no names. nothing was stored. one night.', 48, 1060, '500 10px ' + MONO, T.mute);
      if (st.toy) tx(g, 'a toy chain stands in for tonight\'s visitors.', 48, 1078, '500 10px ' + MONO, T.mute);
      var q = qrDraw(g, T, SITE + 'walls/', w - 48 - 70, 1018, 70);
      if (q) tx(g, 'walk the walls', w - 48 - 70 + q / 2, 1018 + q + 12, '500 8.5px ' + MONO, T.mute, 'center');
    }
  };

  // 3. the taste card
  PAGES.taste = {
    mm: [152.4, 101.6], px: [576, 384],
    init: function (H) {
      var N = D.n.length, R = [];
      if (H.r) H.r.split(',').forEach(function (t) { var p = t.split('.').map(Number); if (p.length >= 4 && p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N && p[0] !== p[1]) R.push({ a: p[0], b: p[1], p: p[2] ? 1 : 0, s: p[3] ? 1 : 0 }); });
      else if (H.a != null && H.b != null) { var a = int1(H.a, N), b = int1(H.b, N); if (a >= 0 && b >= 0 && a !== b) R.push({ a: a, b: b, p: H.p === '1' ? 1 : 0, s: H.s === '1' ? 1 : 0 }); }
      if (!R.length) {
        var g = rng(1106), sw = [1, 0, 1, 1, 0, 1], used = {};
        for (var k = 0; k < 6; k++) { var a2, b2; do { a2 = Math.floor(g() * 300); } while (used[a2]); used[a2] = 1; do { b2 = Math.floor(g() * 300); } while (b2 === a2 || used[b2]); used[b2] = 1; R.push({ a: a2, b: b2, p: g() < 0.5 ? 0 : 1, s: sw[k] }); }
        return { R: R, toy: true };
      }
      return { R: R.slice(0, 6) };
    },
    alt: function (st) { var c = st.R.filter(function (r) { return r.s; }).length; return 'the taste card: the names changed your pick ' + c + ' of ' + st.R.length + ' times.'; },
    draw: function (g, T, st) {
      var w = 576, h = 384, s = 336, R = st.R, c = R.filter(function (r) { return r.s; }).length, one = R.length === 1;
      g.fillStyle = T.bg; g.fillRect(0, 0, w, h);
      var f = field(g, T, 24, 24, s, { dim: T.paper ? 0.25 : 0.35, lat: 0.08 });
      g.strokeStyle = T.line; g.lineWidth = 1; g.strokeRect(24.5, 24.5, s - 1, s - 1);
      R.forEach(function (r) { rib(g, T, [[f.X(r.a), f.Y(r.a)], [f.X(r.b), f.Y(r.b)]], r.s ? ROSE : T.lat, r.s ? ROSE : T.lat, r.s ? 1.9 : 1.2); });
      R.forEach(function (r) { [r.a, r.b].forEach(function (i, k) {
        if (k === r.p) P.glyph(g, 'star', f.X(i), f.Y(i), 7, MINT); else P.peb(g, i, f.X(i), f.Y(i), 4.6, fc(i, T, 0));
      }); });
      var x = 384, cw = w - 24 - x;
      tx(g, 'the taste card', x, 36, '500 8.5px ' + MONO, T.mute);
      var big = one ? (c ? 'yes' : 'no') : String(c);
      tx(g, big, x - 2, 112, '600 76px ' + SANS, c ? ROSE : T.ink);
      g.font = '600 76px ' + SANS; var bw = g.measureText(big).width;
      if (!one) tx(g, 'of ' + R.length, x + bw + 10, 112, '600 24px ' + SANS, T.ink);
      var head = one ? (c ? 'the names changed your pick' : 'the names did not change your pick') : (c === 0 ? 'the names never changed your pick' : c === 1 ? 'time the names changed your pick' : 'times the names changed your pick');
      g.font = '600 16px ' + SANS; wrapT(g, head, cw).forEach(function (l, k) { tx(g, l, x, 140 + k * 19, '600 16px ' + SANS, T.ink); });
      var y = 196;
      R.forEach(function (r) {
        P.peb(g, r.a, x + 8, y - 4, 6.5, fc(r.a, T, 0)); P.peb(g, r.b, x + 30, y - 4, 6.5, fc(r.b, T, 0));
        P.glyph(g, 'star', x + (r.p ? 30 : 8), y - 4, 6, MINT);
        if (r.s) { g.fillStyle = ROSE; g.fillRect(x + 48, y - 6, 28, 3); tx(g, 'changed', x + 84, y - 1, '500 8.5px ' + MONO, T.ink); }
        else { g.strokeStyle = T.lat; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 48, y - 4.5); g.lineTo(x + 76, y - 4.5); g.stroke(); tx(g, 'same', x + 84, y - 1, '500 8.5px ' + MONO, T.mute); }
        y += one ? 0 : 24;
        if (one) { g.font = '500 9px ' + MONO; tx(g, fit(g, 'a: ' + nm(r.a), cw), x, y + 20, '500 9px ' + MONO, T.ink); tx(g, fit(g, 'b: ' + nm(r.b), cw), x, y + 33, '500 9px ' + MONO, T.ink); y += 40; }
      });
      legend(g, T, x, 340, [['star', MINT, 'your pick']], 8);
      g.font = '500 8px ' + MONO; wrapT(g, R.length + (one ? ' pair' : ' pairs') + ', a toy. it says nothing about taste. nothing was stored.', cw).forEach(function (l, k) { tx(g, l, x, 356 + k * 10, '500 8px ' + MONO, T.mute); });
    }
  };

  // 4. the mirror card
  PAGES.mirror = {
    mm: [152.4, 101.6], px: [576, 384],
    init: function (H) {
      var N = D.n.length, A = ints(H.a, N).slice(0, 8), B = ints(H.b, N).slice(0, 8), toy = false;
      if (!A.length || !B.length) {
        toy = true; var g = rng(1107), pick = function () { var o = []; while (o.length < 5) { var i = Math.floor(g() * 300); if (o.indexOf(i) < 0) o.push(i); } return o; };
        A = pick(); B = pick();
      }
      var cen = function (L) { var x = 0, y = 0; L.forEach(function (i) { x += D.xy[i][0]; y += D.xy[i][1]; }); return [x / L.length, y / L.length]; };
      var ca = cen(A), cb = cen(B), m = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2];
      var near = 0, bd = 1e18, i; for (i = 0; i < D.xy.length; i++) { var d = Math.pow(D.xy[i][0] - m[0], 2) + Math.pow(D.xy[i][1] - m[1], 2); if (d < bd) { bd = d; near = i; } }
      var pa = -1, pb = -1, pd = 1e18; A.forEach(function (x) { B.forEach(function (y) { var d = Math.pow(D.xy[x][0] - D.xy[y][0], 2) + Math.pow(D.xy[x][1] - D.xy[y][1], 2); if (d < pd) { pd = d; pa = x; pb = y; } }); });
      var mode = function (L) { var c = {}, best = -1, bk = 0; L.forEach(function (i) { var k = D.f[i]; c[k] = (c[k] || 0) + 1; if (c[k] > best) { best = c[k]; bk = k; } }); return D.fam[bk]; };
      return { A: A, B: B, ca: ca, cb: cb, m: m, near: near, pa: pa, pb: pb, fa: mode(A), fb: mode(B), toy: toy };
    },
    alt: function (st) { return 'the mirror card: two lists on my sound map. they meet near ' + nm(st.near) + '.'; },
    draw: function (g, T, st) {
      var w = 576, h = 384, s = 336;
      g.fillStyle = T.bg; g.fillRect(0, 0, w, h);
      var f = field(g, T, 24, 24, s, { dim: T.paper ? 0.3 : 0.4, lat: 0.06 });
      g.strokeStyle = T.line; g.lineWidth = 1; g.strokeRect(24.5, 24.5, s - 1, s - 1);
      var sc = s / 1000, px = function (p) { return [24 + p[0] * sc, 24 + p[1] * sc]; };
      var pa = px(st.ca), pb = px(st.cb), pm = px(st.m);
      rib(g, T, [pa, pb], ROSE, ROSE, 1.6, [5, 4]);
      st.A.forEach(function (i) { P.peb(g, i, f.X(i), f.Y(i), 6, ICE); P.peb(g, i, f.X(i), f.Y(i), 2.2, T.paper ? NIGHT : '#06010f', false); });
      st.B.forEach(function (i) { g.save(); g.strokeStyle = T.paper ? NIGHT : '#efe9ff'; g.lineWidth = 2.2; g.beginPath(); g.arc(f.X(i), f.Y(i), 6, 0, 6.2832); g.stroke(); g.restore(); });
      // names, on small chips so they never sit on the dots
      g.font = '500 7.5px ' + MONO;
      st.A.concat(st.B).forEach(function (i) {
        var t = fit(g, nm(i), 84), tw = g.measureText(t).width + 6, x = f.X(i) + 9, y = f.Y(i) - 9;
        if (x + tw > 24 + s - 2) x = f.X(i) - 9 - tw; if (y < 34) y = f.Y(i) + 16;
        g.fillStyle = T.bg; g.fillRect(Math.round(x), Math.round(y - 8), Math.round(tw), 11); tx(g, t, Math.round(x) + 3, Math.round(y), '500 7.5px ' + MONO, T.ink);
      });
      g.save(); g.strokeStyle = ROSE; g.lineWidth = 2.4; g.beginPath(); g.arc(pm[0], pm[1], 8, 0, 6.2832); g.stroke(); g.fillStyle = ROSE; g.beginPath(); g.arc(pm[0], pm[1], 2.4, 0, 6.2832); g.fill(); g.restore();
      var x = 384, cw = w - 24 - x;
      tx(g, 'the mirror card', x, 36, '500 8.5px ' + MONO, T.mute);
      tx(g, 'the two of you meet near', x, 70, '500 9px ' + MONO, T.mute);
      g.font = '600 25px ' + SANS; wrapT(g, nm(st.near), cw).slice(0, 3).forEach(function (l, k) { tx(g, l, x, 98 + k * 28, '600 25px ' + SANS, T.ink); });
      g.fillStyle = ROSE; g.fillRect(x, 160, 40, 3);
      tx(g, 'closest across your two lists', x, 188, '500 8.5px ' + MONO, T.mute);
      g.font = '600 12.5px ' + SANS; tx(g, fit(g, nm(st.pa), cw), x, 205, '600 12.5px ' + SANS, T.ink); tx(g, fit(g, 'and ' + nm(st.pb), cw), x, 221, '600 12.5px ' + SANS, T.ink);
      g.font = '500 8.5px ' + MONO;
      var fl = st.fa === st.fb ? ['both lists sit mostly in', st.fa] : ['one list sits mostly in', st.fa, 'the other in', st.fb];
      var yy = 246; if (st.fa === st.fb) { tx(g, fl[0], x, yy, '500 8.5px ' + MONO, T.mute); tx(g, fit(g, fl[1], cw), x, yy + 12, '600 11px ' + SANS, T.ink); }
      else { tx(g, fl[0], x, yy, '500 8.5px ' + MONO, T.mute); tx(g, fit(g, fl[1], cw), x, yy + 12, '600 11px ' + SANS, T.ink); tx(g, fl[2], x, yy + 27, '500 8.5px ' + MONO, T.mute); tx(g, fit(g, fl[3], cw), x, yy + 39, '600 11px ' + SANS, T.ink); }
      legend(g, T, x, 316, [['peb', ICE, 'one of you']], 8);
      g.save(); g.strokeStyle = T.paper ? NIGHT : '#efe9ff'; g.lineWidth = 2; g.beginPath(); g.arc(x + 7 + 80, 313, 4.6, 0, 6.2832); g.stroke(); g.restore();
      tx(g, 'the other', x + 98, 316, '500 8.5px ' + MONO, T.mute);
      g.save(); g.strokeStyle = ROSE; g.lineWidth = 2; g.beginPath(); g.arc(x + 7, 331, 4.6, 0, 6.2832); g.stroke(); g.fillStyle = ROSE; g.beginPath(); g.arc(x + 7, 331, 1.6, 0, 6.2832); g.fill(); g.restore();
      tx(g, 'meeting point', x + 20, 334, '500 8.5px ' + MONO, T.mute);
      g.font = '500 8px ' + MONO; wrapT(g, 'distances in sound only. no score, no reading of you.' + (st.toy ? ' two toy lists stand in.' : ''), cw).forEach(function (l, k) { tx(g, l, x, 356 + k * 10, '500 8px ' + MONO, T.mute); });
    }
  };

  // 5. the receipt, round two
  function pack(p) { return p.map(function (i) { return ('00' + i.toString(36)).slice(-3); }).join(''); }
  function unpack(s) { var o = []; for (var i = 0; i + 3 <= s.length; i += 3) { var v = parseInt(s.slice(i, i + 3), 36); if (isFinite(v)) o.push(v); } return o; }
  PAGES.receipt2 = {
    mm: [80, 201], px: [302, 760],
    init: function (H) {
      var N = D.n.length, path = H.q ? unpack(H.q).filter(function (i) { return i < N; }) : ints(H.p, N), toy = false;
      if (path.length < 2) {
        toy = true; var r = rng(1108), cur = Math.floor(r() * 100), seen = {}; path = [cur]; seen[cur] = 1;
        while (path.length < 21) {
          var l = D.nn[cur].filter(function (j) { return !seen[j]; }); if (!l.length) break;
          cur = l[Math.floor(r() * Math.min(l.length, 4))]; seen[cur] = 1; path.push(cur);
        }
      }
      path = path.slice(0, 41);
      var seenA = {}, matched = 0, k;
      for (k = 0; k + 1 < path.length; k++) { seenA[path[k]] = 1; if (topNN(path[k], seenA) === path[k + 1]) matched++; }
      var rule = [path[0]], vis = {}; vis[path[0]] = 1;
      for (k = 0; k + 1 < path.length; k++) { var nx = topNN(rule[rule.length - 1], vis); if (nx < 0) break; vis[nx] = 1; rule.push(nx); }
      var url = SITE + 'print/receipt2.html#q=' + pack(path);
      return { path: path, rule: rule, steps: path.length - 1, matched: matched, url: url, toy: toy };
    },
    alt: function (st) { return 'your presses vs auto-play: ' + st.matched + ' of ' + st.steps + ' steps were auto-play\'s.'; },
    draw: function (g, T, st) {
      var w = 302, h = 760, x = 16, s = 270, i;
      g.fillStyle = T.bg; g.fillRect(0, 0, w, h);
      tx(g, 'astralcrest · sonicManifold', x, 24, '500 9px ' + MONO, T.mute);
      tx(g, 'your presses', x, 56, '600 25px ' + SANS, T.ink); tx(g, 'vs auto-play', x, 82, '600 25px ' + SANS, T.ink);
      tx(g, st.steps + ' steps · nothing was stored · a toy', x, 102, '500 9px ' + MONO, T.mute);
      var f = field(g, T, x, 114, s, { dim: T.paper ? 0.3 : 0.4, lat: 0.08 });
      g.strokeStyle = T.line; g.lineWidth = 1; g.strokeRect(x + 0.5, 114.5, s - 1, s - 1);
      var pr = st.rule.map(function (j) { return [f.X(j), f.Y(j)]; }), py = st.path.map(function (j) { return [f.X(j), f.Y(j)]; });
      rib(g, T, pr, VIOLET, VIOLET, 2.2); pr.slice(1).forEach(function (p) { P.glyph(g, 'ring', p[0], p[1], 5, VIOLET); });
      rib(g, T, py, MINT, MINT, 2.4); py.slice(1).forEach(function (p) { P.glyph(g, 'star', p[0], p[1], 4.4, MINT); });
      var sx = py[0][0], sy = py[0][1]; g.save(); g.strokeStyle = T.paper ? NIGHT : '#efe9ff'; g.lineWidth = 1.5; [5, 9].forEach(function (rr) { g.beginPath(); g.arc(sx, sy, rr, 0, 6.2832); g.stroke(); }); g.restore();
      var N = String(st.matched); g.font = '600 66px ' + SANS; var nw = g.measureText(N).width;
      tx(g, N, x - 2, 462, '600 66px ' + SANS, T.ink);
      g.fillStyle = MINT; g.fillRect(x, 470, Math.min(nw, 120), 5);
      tx(g, 'of ' + st.steps + ' steps', x + nw + 12, 436, '600 14px ' + SANS, T.ink); tx(g, 'were auto-play\'s', x + nw + 12, 454, '600 14px ' + SANS, T.ink);
      g.strokeStyle = T.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 490.5); g.lineTo(w - x, 490.5); g.stroke();
      var cols = 20, gap = s / cols, kinds = [['star', MINT, 19], ['diamond', AMBER, 17], ['ring', VIOLET, 64]], idx = 0;
      kinds.forEach(function (kd) { for (var q = 0; q < kd[2]; q++, idx++) { var cx = x + gap / 2 + (idx % cols) * gap, cy = 508 + Math.floor(idx / cols) * 14; P.glyph(g, kd[0], cx, cy, 4.4, kd[1]); } });
      tx(g, 'in my log, of every 100 plays:', x, 592, '500 9.5px ' + MONO, T.ink);
      tx(g, 'i pressed 19, shuffle dealt 17,', x, 605, '500 9.5px ' + MONO, T.ink);
      tx(g, 'auto-play served 64.', x, 618, '500 9.5px ' + MONO, T.ink);
      g.font = '500 8px ' + MONO; wrapT(g, 'a step is auto-play\'s when you pressed the nearest artist in sound you had not visited yet. a toy rule, not a finding.', s).forEach(function (l, k) { tx(g, l, x, 637 + k * 10, '500 8px ' + MONO, T.mute); });
      var qs = 84, q = qrDraw(g, T, st.url, w - x - qs, 668, qs), reopen = !!q;
      if (!q) q = qrDraw(g, T, SITE + 'print/receipt2.html', w - x - qs, 668, qs);
      var lines = reopen ? ['scan to reopen', 'your ' + st.steps + ' steps', 'on your phone'] : ['scan to take', 'your own steps', 'on your phone'];
      lines.forEach(function (l, k) { tx(g, l, x, 690 + k * 12, '500 9px ' + MONO, T.mute); });
      tx(g, 'astralcrest.github.io/sonicManifold', w / 2, 750, '500 8px ' + MONO, T.mute, 'center');
    }
  };

  /* ---------- the strip, the chips, the two looks ---------- */
  var KEYS = {
    press: ['my press', '#21f6bc', '<path d="M10 1Q10 10 19 10Q10 10 10 19Q10 10 1 10Q10 10 10 1Z" fill="#21f6bc"/>'],
    auto: ['auto-play', '#8b6fd6', '<circle cx="10" cy="10" r="7" fill="none" stroke="#8b6fd6" stroke-width="2.4"/>'],
    shuffle: ['shuffle', '#f5a623', '<path d="M10 1.5L17 10L10 18.5L3 10Z" fill="#f5a623"/>'],
    alike: ['sounds alike', '#bcd3ff', '<path d="M2 14L10 8L18 12" fill="none" stroke="#bcd3ff" stroke-width="1.2"/><circle cx="10" cy="8" r="2.4" fill="#bcd3ff"/>'],
    own: ['my own songs', '#ffd36b', '<circle cx="10" cy="10" r="8.4" fill="none" stroke="#ffd36b" stroke-width="1.3"/><path d="M10 3.5Q10 10 16.5 10Q10 10 10 16.5Q10 10 3.5 10Q10 10 10 3.5Z" fill="#ffd36b"/>'],
    changed: ['changed by the names', '#ff5c7a', '<circle cx="10" cy="10" r="7" fill="none" stroke="#ff5c7a" stroke-width="2.4"/><circle cx="10" cy="10" r="2" fill="#ff5c7a"/>']
  };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function boot() {
    var b = document.body, name = b.getAttribute('data-page'), spec = PAGES[name], H = hash();
    var sheet = document.getElementById('sheet'), cv = document.getElementById('cv');
    var forceDark = H.dark === '1';
    var paper = !forceDark && (H.paper === '1' || b.hasAttribute('data-paper'));
    b.classList.toggle('paper', paper);
    var keys = (b.getAttribute('data-keys') || '').split(',').filter(Boolean);
    var bar = document.createElement('header'); bar.className = 'bar';
    bar.innerHTML = '<p class="line">' + esc(b.getAttribute('data-line') || '') + '</p>' +
      (keys.length ? '<ul class="keys" aria-label="key">' + keys.map(function (k) { var d = KEYS[k]; return d ? '<li style="--c:' + d[1] + '"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">' + d[2] + '</svg>' + d[0] + '</li>' : ''; }).join('') + '</ul>' : '') +
      '<div class="ctl"><button type="button" class="go" id="pr-print">print</button><button type="button" id="pr-look" aria-pressed="false"></button>' + (spec.toggle ? '<button type="button" id="pr-alt" aria-pressed="false"></button>' : '') + '<a class="btn" href="../walls/">back to the walls</a></div>' +
      '<p class="where">take-home ' + (spec.n || '') + ' of 5 &middot; <a href="./">all five</a> &middot; <a href="../walls/">the walls</a> &middot; <a href="../../">sonic manifold</a></p>';
    b.insertBefore(bar, b.firstChild);
    cv.setAttribute('role', 'img');
    var st = spec.init(H), look = paper ? 'paper' : 'dark';
    var lookBtn = document.getElementById('pr-look'), altBtn = document.getElementById('pr-alt'), pageCss = document.createElement('style');
    document.head.appendChild(pageCss);
    function size() {
      var MM = spec.mmOf ? spec.mmOf(st) : spec.mm;
      sheet.style.setProperty('--w', MM[0] + 'mm');
      pageCss.textContent = '@page { size: ' + MM[0] + 'mm ' + MM[1] + 'mm; margin: 0; }';
      return spec.pxOf ? spec.pxOf(st) : spec.px;
    }
    function paint() {
      var T = theme(look === 'paper'), g = cv.getContext('2d'), PX = size();
      cv.width = PX[0] * SC; cv.height = PX[1] * SC;
      g.setTransform(SC, 0, 0, SC, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round';
      spec.draw(g, T, st);
      b.classList.toggle('paper', look === 'paper');
      lookBtn.textContent = look === 'paper' ? 'dark look' : 'paper look';
      lookBtn.setAttribute('aria-pressed', look === 'paper' ? 'true' : 'false');
      cv.setAttribute('aria-label', spec.alt(st));
      if (altBtn) { var on = !!st[spec.toggle.key]; altBtn.textContent = on ? spec.toggle.on : spec.toggle.off; altBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    }
    if (altBtn) altBtn.addEventListener('click', function () {
      var k = spec.toggle.key; st[k] = !st[k];
      var h = location.hash.replace(/^#/, '').split('&').filter(function (kv) { return kv && kv.split('=')[0] !== k; });
      if (st[k]) h.push(k + '=1');
      try { history.replaceState(null, '', location.pathname + location.search + (h.length ? '#' + h.join('&') : '')); } catch (e) {}
      paint();
    });
    document.getElementById('pr-print').addEventListener('click', function () { window.print(); });
    lookBtn.addEventListener('click', function () { look = look === 'paper' ? 'dark' : 'paper'; paint(); });
    var prev = null;
    window.addEventListener('beforeprint', function () { prev = look; var want = forceDark ? 'dark' : 'paper'; if (look !== want) { look = want; paint(); } });
    window.addEventListener('afterprint', function () { if (prev && look !== prev) { look = prev; paint(); } prev = null; });
    paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  }

  function start() {
    var N0 = ['600 20px "Instrument Sans"', '500 11px "IBM Plex Mono"', '600 11px "IBM Plex Mono"'];
    var fonts = Promise.all(N0.map(function (f) { return document.fonts ? document.fonts.load(f) : null; })).catch(function () {});
    Promise.all([fetch('../loop/data/loop.json').then(function (r) { return r.json(); }), fonts]).then(function (a) {
      D = a[0]; W = P.weights(D.xy.length, D.pl); boot();
    }).catch(function () { var p = document.createElement('p'); p.style.cssText = 'padding:24px 48px;font:13px "IBM Plex Mono",monospace;color:#ff5c7a'; p.textContent = 'the map did not load. check your connection and reload.'; document.body.insertBefore(p, document.body.firstChild); });
  }
  PAGES.stub.n = 1; PAGES.chorus.n = 2; PAGES.taste.n = 3; PAGES.mirror.n = 4; PAGES.receipt2.n = 5;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
