(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var COL = { a: '#ff6fae', b: '#efe9ff', o: '#8b6fd6', base: '#5a4a92', line: '#2a2140', night: '#06010f', ink: '#efe9ff' };
  var OWNER_TOP = 200, STEPS = 20, STARTS = 10;
  var F = null, M = null, SAMPLES = null, IDX = new Map(), ADJ = null, STRENGTH = null;
  var HABIT = 1, SEED = 0, WALKS = 8;
  var S = { a: null, b: null }, HOT = -1, CROSS = null, PV = null, AU = null, PLAYING = 0;

  function norm(s) {
    return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---- sides ----
  function sideFromWeights(kind, label, counts, unmatched) {
    // counts: Map(field index -> weight); unmatched: number of distinct names not on the map
    var keys = Array.from(counts.keys()).sort(function (x, y) { return counts.get(y) - counts.get(x); });
    var mx = keys.length ? counts.get(keys[0]) : 1;
    return { kind: kind, label: label, w: counts, order: keys, max: mx, off: unmatched, set: new Set(keys) };
  }
  function fromList(text, label) {
    var lines = String(text).split(/\r?\n/);
    if (lines.length === 1 && lines[0].indexOf(',') > -1) lines = lines[0].split(',');
    var seen = new Set(), counts = new Map(), off = 0, rank = 0;
    lines.forEach(function (raw) {
      var t = raw.replace(/^\s*(?:#?\d+[.)\]:-]?|[-*•])\s+/, '').trim();
      var k = norm(t); if (!k || seen.has(k)) return; seen.add(k); rank++;
      var i = IDX.get(k);
      if (i === undefined) { off++; return; }
      if (!counts.has(i)) counts.set(i, 1 / Math.sqrt(rank));
    });
    return sideFromWeights('list', label, counts, off);
  }
  function fromPlays(rows) {
    // rows: slim {a, ms}; plays over 30 s only
    var by = new Map(), off = new Set(), n = 0, seq = [];
    rows.forEach(function (r) {
      if (!r.a || r.ms < 30000) return; n++;
      var i = IDX.get(norm(r.a));
      if (i === undefined) { off.add(norm(r.a)); return; }
      by.set(i, (by.get(i) || 0) + 1); seq.push([r.ts, i]);
    });
    var s = sideFromWeights('file', 'a Spotify export', by, off.size);
    seq.sort(function (x, y) { return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0; });
    var pr = [], q;
    for (q = 1; q < seq.length; q++) if (seq[q][1] !== seq[q - 1][1]) pr.push([seq[q - 1][1], seq[q][1]]);
    var stp = Math.max(1, Math.floor(pr.length / 1600)); s.pairs = [];
    for (q = 0; q < pr.length && s.pairs.length < 1600; q += stp) s.pairs.push(pr[q]);
    s.plays = n; return s;
  }
  function fromOwner() {
    var tot = F.h.map(function (h) { return h[0] + h[1] + h[2]; });
    var o = tot.map(function (_, i) { return i; }).sort(function (x, y) { return tot[y] - tot[x]; }).slice(0, OWNER_TOP);
    var c = new Map(); o.forEach(function (i) { c.set(i, tot[i]); });
    return sideFromWeights('owner', 'my 200 most played', c, 0);
  }

  // ---- export reading (nothing leaves the tab) ----
  function readFiles(files, side) {
    var js = Array.prototype.filter.call(files, function (f) { return /\.json$/i.test(f.name); });
    var st = $('st-' + side);
    if (!js.length) { st.className = 'st err'; st.textContent = 'no .json files found. use the Streaming_History_Audio_*.json files.'; return; }
    st.className = 'st'; st.textContent = 'reading ' + js.length + ' file' + (js.length > 1 ? 's' : '') + ' in this tab';
    var rows = [], done = 0, errs = 0;
    js.forEach(function (f) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var arr = JSON.parse(r.result);
          if (Array.isArray(arr)) {
            for (var k = 0; k < arr.length; k++) {
              var p = arr[k]; if (!p) continue;
              // keep four fields, drop the rest at load
              rows.push({
                a: p.master_metadata_album_artist_name || p.artistName || '',
                t: p.master_metadata_track_name || p.trackName || '',
                ms: +(p.ms_played != null ? p.ms_played : p.msPlayed) || 0,
                ts: p.ts || p.endTime || ''
              });
            }
          } else errs++;
        } catch (e) { errs++; }
        if (++done === js.length) took(rows, errs, side);
      };
      r.onerror = function () { errs++; if (++done === js.length) took(rows, errs, side); };
      r.readAsText(f);
    });
  }
  function took(rows, errs, side) {
    var st = $('st-' + side);
    if (!rows.length) { st.className = 'st err'; st.textContent = 'no plays found in ' + (errs ? 'those files' : 'that file') + '.'; return; }
    var s = fromPlays(rows);
    if (!s.plays) { st.className = 'st err'; st.textContent = 'no plays over 30 seconds with an artist name.'; return; }
    $('txt-' + side).value = '';
    set(side, s);
  }

  function set(side, s) {
    S[side] = s; HOT = -1; if ($('t1')) $('t1').textContent = 'tap a shape to name it.';
    if (PLAYING && $('hear').textContent === 'stop') stopHear();
    var card = document.querySelector('.side[data-s="' + side + '"]');
    card.classList.toggle('owner', s.kind === 'owner');
    var lab = $('lab-' + side);
    lab.textContent = s.label;
    var st = $('st-' + side); st.className = 'st';
    var placed = s.order.length;
    st.innerHTML = (s.kind === 'file' ? '<b>' + fmt(s.plays) + '</b> plays over 30 seconds. ' : '') +
      'placed: <b>' + fmt(placed) + '</b> artist' + (placed === 1 ? '' : 's') + '. off this map: <b>' + fmt(s.off) + '</b> artist' + (s.off === 1 ? '' : 's') + '.';
    draw();
  }
  function col(side) { return S[side] && S[side].kind === 'owner' ? COL.o : COL[side]; }
  function nm(side) { return S[side] && S[side].kind === 'owner' ? 'the owner' : side; }

  // ---- geometry ----
  function center(s) {
    var sw = 0, x = 0, y = 0;
    s.order.forEach(function (i) { var w = s.w.get(i); sw += w; x += w * F.xy[i][0]; y += w * F.xy[i][1]; });
    x /= sw; y /= sw;
    var v = 0;
    s.order.forEach(function (i) { var w = s.w.get(i), dx = F.xy[i][0] - x, dy = F.xy[i][1] - y; v += w * (dx * dx + dy * dy); });
    return { x: x, y: y, r: Math.sqrt(v / sw) };
  }
  function d3(i, j) { var p = F.p[i], q = F.p[j], a = p[0] - q[0], b = p[1] - q[1], c = p[2] - q[2]; return Math.sqrt(a * a + b * b + c * c); }
  function bridge(A, B, k) {
    var aOnly = A.order.filter(function (i) { return !B.set.has(i); }).slice(0, 60);
    var bOnly = B.order.filter(function (i) { return !A.set.has(i); });
    if (!aOnly.length || !bOnly.length) return [];
    var out = aOnly.map(function (i) {
      var best = -1, bd = Infinity;
      for (var t = 0; t < bOnly.length; t++) { var d = d3(i, bOnly[t]); if (d < bd) { bd = d; best = bOnly[t]; } }
      return [i, best, bd];
    });
    return out.sort(function (x, y) { return x[2] - y[2]; }).slice(0, k);
  }

  // ---- the owner's queue: undirected weighted walk on the drawn pairs ----
  function buildGraph() {
    ADJ = F.n.map(function () { return []; }); STRENGTH = new Float64Array(F.n.length);
    M.lq.forEach(function (e) {
      var w = Math.pow(Math.max(1, e[2]), HABIT);
      ADJ[e[0]].push([e[1], w]); ADJ[e[1]].push([e[0], w]);
      STRENGTH[e[0]] += w; STRENGTH[e[1]] += w;
    });
  }
  function walkReach(from, to) {
    var starts = from.order.filter(function (i) { return ADJ[i].length; }).slice(0, STARTS);
    if (!starts.length) return { k: null, n: 0 };
    var tot = 0, N = F.n.length;
    starts.forEach(function (s) {
      var p = new Float64Array(N); p[s] = 1;
      for (var t = 0; t < STEPS; t++) {
        var q = new Float64Array(N);
        for (var i = 0; i < N; i++) {
          if (!p[i]) continue;
          var nb = ADJ[i], st = STRENGTH[i];
          for (var j = 0; j < nb.length; j++) q[nb[j][0]] += p[i] * nb[j][1] / st;
        }
        p = q;
        to.set.forEach(function (i) { tot += p[i]; });
      }
    });
    return { k: tot / starts.length, n: starts.length };
  }
  function chance(to) {
    var all = 0, inn = 0;
    for (var i = 0; i < STRENGTH.length; i++) { all += STRENGTH[i]; if (to.set.has(i)) inn += STRENGTH[i]; }
    return STEPS * inn / all;
  }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function oneWalk(from, seed) {
    var s = from.order.filter(function (i) { return ADJ[i].length; })[0];
    if (s === undefined) return [];
    var r = rng(seed), path = [s], cur = s;
    for (var t = 0; t < STEPS; t++) {
      var nb = ADJ[cur], x = r() * STRENGTH[cur], j = 0;
      while (j < nb.length - 1 && (x -= nb[j][1]) > 0) j++;
      cur = nb[j][0]; path.push(cur);
    }
    return path;
  }

  // ---- canvases ----
  function ctxOf(id) {
    var c = $(id), r = c.getBoundingClientRect(), d = Math.min(3, window.devicePixelRatio || 1);
    var W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    var g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = COL.night; g.fillRect(0, 0, W, H);
    var pad = 14 * d, sc = (Math.min(W, H) - 2 * pad) / 1000;
    g.imageSmoothingEnabled = false;
    return { g: g, d: d, X: function (v) { return pad + v * sc; }, Y: function (v) { return pad + v * sc; }, sc: sc };
  }
  // the map under every panel: a faint lattice and two-layer squares, additive, cached per canvas size
  var PK = window.WK && window.WK.P, BASES = {};
  function base(c, color) {
    var g = c.g, key = g.canvas.width + 'x' + g.canvas.height + ':' + (color || '');
    if (PK) {
      var b = BASES[key];
      if (!b) {
        b = BASES[key] = document.createElement('canvas'); b.width = g.canvas.width; b.height = g.canvas.height;
        var bg = b.getContext('2d'), d = c.d, small = g.canvas.width / d < 420;
        PK.field(bg, F.xy, function (i) { return c.X(F.xy[i][0]); }, function (i) { return c.Y(F.xy[i][1]); },
          { lo: (small ? 1 : 1.5) * d, hi: (small ? 3 : 4.5) * d, core: 0.6, halo: 0.07, latW: 0.5 * d, col: function () { return color || COL.base; } });
      }
      g.drawImage(b, 0, 0); return;
    }
    var s = Math.max(1, Math.round(1.5 * c.d));
    g.fillStyle = color || COL.base;
    for (var i = 0; i < F.xy.length; i++) g.fillRect(Math.round(c.X(F.xy[i][0]) - s / 2), Math.round(c.Y(F.xy[i][1]) - s / 2), s, s);
  }
  function sq(c, i, size, color) {
    var s = Math.max(2, size * c.d), x = c.X(F.xy[i][0]), y = c.Y(F.xy[i][1]);
    if (PK) { PK.peb(c.g, i, x, y, s * 0.62, color); return; }
    c.g.fillStyle = color;
    c.g.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  }
  function splitSq(c, i, size, ca, cb) {
    var r = Math.max(3, size * c.d) * 0.62, x = c.X(F.xy[i][0]), y = c.Y(F.xy[i][1]), g = c.g;
    [[ca, x - r * 2, x], [cb, x, x + r * 2]].forEach(function (h) { g.save(); g.beginPath(); g.rect(h[1], y - r * 2, h[2] - h[1], r * 4); g.clip(); PK.peb(g, i, x, y, r, h[0]); g.restore(); });
  }
  function sizeOf(s, i, lo, hi) { return lo + (hi - lo) * Math.sqrt(s.w.get(i) / s.max); }
  function line(c, i, j, color, wd) {
    var g = c.g; g.strokeStyle = color; g.lineWidth = wd * c.d;
    g.beginPath(); g.moveTo(c.X(F.xy[i][0]), c.Y(F.xy[i][1])); g.lineTo(c.X(F.xy[j][0]), c.Y(F.xy[j][1])); g.stroke();
  }
  function dots(c, s, color, lo, hi) {
    for (var k = s.order.length - 1; k >= 0; k--) { var i = s.order[k]; sq(c, i, sizeOf(s, i, lo, hi), color); }
  }

  function li(html) { return '<li>' + html + '</li>'; }
  function swatch(color) { return '<span class="sw" style="background:' + color + '"></span>'; }

  function draw() {
    var A = S.a, B = S.b; if (!A || !B || !F) return;
    var ca = col('a'), cb = col('b'), na = nm('a'), nb = nm('b');
    var both = A.order.filter(function (i) { return B.set.has(i); });
    var CA = A.order.length ? center(A) : null, CB = B.order.length ? center(B) : null;

    // one
    var c1 = ctxOf('c1'); base(c1);
    dots(c1, A, ca, 3, 11); dots(c1, B, cb, 3, 11);
    both.forEach(function (i) { splitSq(c1, i, Math.max(sizeOf(A, i, 3, 11), sizeOf(B, i, 3, 11)), ca, cb); });
    if (HOT >= 0) { c1.g.strokeStyle = COL.ink; c1.g.lineWidth = 1.5 * c1.d; c1.g.beginPath(); c1.g.arc(c1.X(F.xy[HOT][0]), c1.Y(F.xy[HOT][1]), 10 * c1.d, 0, 6.2832); c1.g.stroke(); }
    $('f1').innerHTML = '<span style="color:' + ca + '">' + na + '</span>: <b>' + fmt(A.order.length) + '</b> artists placed, off this map: <b>' + fmt(A.off) + '</b>. ' +
      '<span style="color:' + cb + '">' + nb + '</span>: <b>' + fmt(B.order.length) + '</b> placed, off this map: <b>' + fmt(B.off) + '</b>.';

    // two
    var c2 = ctxOf('c2'); base(c2);
    dots(c2, A, '#5d6f94', 3, 5); dots(c2, B, '#8d8a9c', 3, 5);
    both.forEach(function (i) { splitSq(c2, i, 12, ca, cb); });
    var shared = both.slice().sort(function (x, y) { return (B.w.get(y) / B.max + A.w.get(y) / A.max) - (B.w.get(x) / B.max + A.w.get(x) / A.max); });
    $('nshared').textContent = fmt(both.length);
    $('f2').innerHTML = both.length ? 'you share <b>' + fmt(both.length) + '</b> artist' + (both.length > 1 ? 's' : '') + ' of the ' + fmt(new Set(A.order.concat(B.order)).size) + ' placed between you.' : 'you share no artist on this map.';
    $('l2').innerHTML = shared.slice(0, 14).map(function (i) { return li('<span class="split"><i style="background:' + ca + '"></i><i style="background:' + cb + '"></i></span>' + esc(F.n[i])); }).join('') +
      (shared.length > 14 ? li('<span class="m">and ' + fmt(shared.length - 14) + ' more</span>') : '');

    // three
    var c3 = ctxOf('c3'); base(c3);
    dots(c3, A, ca, 2, 5); dots(c3, B, cb, 2, 5);
    [[CA, ca], [CB, cb]].forEach(function (z) {
      if (!z[0]) return; var g = c3.g, x = c3.X(z[0].x), y = c3.Y(z[0].y), d = c3.d;
      g.strokeStyle = z[1]; g.lineWidth = 2 * d; g.beginPath(); g.arc(x, y, z[0].r * c3.sc, 0, Math.PI * 2); g.stroke();
      PK.glyph(g, 'star', x, y, 8 * d, z[1]);
    });
    if (CA && CB) {
      var dist = Math.hypot(CA.x - CB.x, CA.y - CB.y), wide = CA.r >= CB.r ? 'a' : 'b';
      var ratio = Math.max(CA.r, CB.r) / Math.max(1, Math.min(CA.r, CB.r));
      $('f3').innerHTML = 'your centers sit <b>' + fmt(dist) + '</b> apart on a map 1,000 across. ' +
        '<span style="color:' + col(wide) + '">' + nm(wide) + '</span> has the wider map: spread <b>' + fmt(Math.max(CA.r, CB.r)) + '</b> against <b>' + fmt(Math.min(CA.r, CB.r)) + '</b>' +
        (ratio < 1.1 ? ', close to even.' : ', ' + ratio.toFixed(1) + ' times as wide.');
    } else $('f3').textContent = 'one side has no artist on this map yet.';

    // four
    var c4 = ctxOf('c4'); base(c4);
    var ab = bridge(A, B, 5);
    CROSS = ab.length ? ab[0] : null;
    var seenP = new Set(ab.map(function (p) { return p[0] + ':' + p[1]; }));
    var ba = bridge(B, A, 10).filter(function (p) { return !seenP.has(p[1] + ':' + p[0]); }).slice(0, 5);
    dots(c4, A, '#4b5a78', 2, 4); dots(c4, B, '#6b6878', 2, 4);
    ab.forEach(function (p) { line(c4, p[0], p[1], ca, 1.5); });
    ba.forEach(function (p) { line(c4, p[0], p[1], cb, 1.5); });
    ab.forEach(function (p) { sq(c4, p[0], 8, ca); sq(c4, p[1], 8, cb); });
    ba.forEach(function (p) { sq(c4, p[0], 8, cb); sq(c4, p[1], 8, ca); });
    $('f4').innerHTML = ab.length ? 'the closest crossings between what only <span style="color:' + ca + '">' + na + '</span> has and what only <span style="color:' + cb + '">' + nb + '</span> has.' : 'there is nothing to bridge: one side has nothing the other lacks.';
    $('l4').innerHTML = ab.map(function (p) { return li(swatch(ca) + esc(F.n[p[0]]) + ' <span class="m">to</span> ' + swatch(cb) + esc(F.n[p[1]])); }).join('') +
      ba.map(function (p) { return li(swatch(cb) + esc(F.n[p[0]]) + ' <span class="m">to</span> ' + swatch(ca) + esc(F.n[p[1]])); }).join('');

    // five
    var c5 = ctxOf('c5'); base(c5);
    var g5 = c5.g; g5.strokeStyle = '#211a3d'; g5.lineWidth = Math.max(1, 0.6 * c5.d); g5.beginPath();
    M.lq.forEach(function (e) { g5.moveTo(c5.X(F.xy[e[0]][0]), c5.Y(F.xy[e[0]][1])); g5.lineTo(c5.X(F.xy[e[1]][0]), c5.Y(F.xy[e[1]][1])); });
    g5.stroke();
    dots(c5, A, '#4b5a78', 2, 4); dots(c5, B, '#6b6878', 2, 4);
    var touched = new Set();
    [[A, 20261105, ca], [B, 20261106, cb]].forEach(function (z) {
      for (var w = 1; w < WALKS; w++) {
        var q = oneWalk(z[0], z[1] + SEED + 1000 * w);
        q.forEach(function (i) { touched.add(i); });
        PK.ribbon(c5.g, q.map(function (i) { return [c5.X(F.xy[i][0]), c5.Y(F.xy[i][1])]; }), z[2], z[2], 1 * c5.d, 0.6);
      }
    });
    [[oneWalk(A, 20261105 + SEED), ca], [oneWalk(B, 20261106 + SEED), cb]].forEach(function (z) {
      var p = z[0]; p.forEach(function (i) { touched.add(i); });
      if (PK) PK.ribbon(c5.g, p.map(function (i) { return [c5.X(F.xy[i][0]), c5.Y(F.xy[i][1])]; }), z[1], z[1] === COL.b ? '#9a90b8' : '#7f9cff', 2.5 * c5.d, 0.95);
      else for (var k = 1; k < p.length; k++) line(c5, p[k - 1], p[k], z[1], 2.5);
      p.forEach(function (i, k) { sq(c5, i, k === 0 ? 11 : 6, z[1]); });
    });
    var rAB = walkReach(A, B), rBA = walkReach(B, A);
    var r1 = function (v) { return v == null ? 'never' : v < 0.05 ? 'under 0.1 times' : v.toFixed(1) + ' times'; };
    var xAB = rAB.n ? rAB.k / chance(B) : 0, xBA = rBA.n ? rBA.k / chance(A) : 0;
    var vs = function (x) { return x < 0.95 ? ', less often than chance would (' + x.toFixed(1) + ' times chance)' : x < 1.05 ? ', about what chance gives' : ', ' + x.toFixed(1) + ' times chance'; };
    $('f5').innerHTML = (rAB.n && rBA.n) ?
      'from <span style="color:' + ca + '">' + na + '</span>\u2019s artists, auto-play reaches <span style="color:' + cb + '">' + nb + '</span>\u2019s <b>' + r1(rAB.k) + '</b> in 20' + vs(xAB) + '. from <span style="color:' + cb + '">' + nb + '</span>\u2019s, <span style="color:' + ca + '">' + na + '</span>\u2019s <b>' + r1(rBA.k) + '</b>' + vs(xBA) + '.' :
      'one side has no artist on auto-play\u2019s drawn pairs, so there is no walk to take.';
    var sp = function (x) { return '<span style="color:' + col(x) + '">' + nm(x) + '</span>'; };
    $('lead').innerHTML = (both.length ? sp('a') + ' and ' + sp('b') + ' share <b>' + fmt(both.length) + '</b> artist' + (both.length > 1 ? 's' : '') + '. ' : sp('a') + ' and ' + sp('b') + ' share no artist. ') +
      (CA && CB ? sp(CA.r >= CB.r ? 'a' : 'b') + ' ranges wider. ' : '') +
      ((rAB.n && rBA.n) ? 'auto-play carries ' + sp('a') + ' toward ' + sp('b') + ' ' + (xAB < 0.95 ? 'less often than chance would, ' + xAB.toFixed(1) + ' times chance' : xAB < 1.05 ? 'about as often as chance would' : xAB.toFixed(1) + ' times as often as chance') + ' (a toy).' : '');
    $('showing').innerHTML = '<b>showing:</b> a = ' + esc(A.label) + ', b = ' + esc(B.label) + '.';
    var c1f = function (v) { return v < 0.05 ? 'under 0.1' : v.toFixed(1); };
    $('cap5').textContent = (rAB.n && rBA.n) ? 'chance, by where auto-play spends its time: ' + c1f(chance(B)) + ' and ' + c1f(chance(A)) + ' in 20.' : '';
    $('spread').innerHTML = (rAB.n && rBA.n) ? 'at this setting the ' + (2 * WALKS) + ' walks touch <b>' + fmt(touched.size) + '</b> different artists.' : '';
    mirror();
  }


  // ---- six: the mirror (a toy) ----
  var MR = { st: 0, L: null, D: null, FIT: null, M: null, OWN: null, fits: {}, tok: 0 };
  var TRY = [0, 0.5, 1];
  function mrLoad() {
    if (MR.st) return; MR.st = 1;
    var sc = document.createElement('script'); sc.src = 'machine.js';
    sc.onload = function () {
      Promise.all([fetch('../loop/data/loop.json').then(function (r) { return r.json(); }), fetch('../loop/data/fit.json').then(function (r) { return r.json(); })]).then(function (d) {
        MR.L = window.LOOP; MR.D = d[0]; MR.FIT = d[1]; MR.M = MR.L.model(d[0]); MR.OWN = fromOwner(); MR.st = 2; mirror();
      }).catch(function () { MR.st = -1; mirror(); });
    };
    sc.onerror = function () { MR.st = -1; mirror(); };
    document.head.appendChild(sc);
  }
  function mrPairs(s) {
    if (s.pairs && s.pairs.length >= 8) return s.pairs;
    var o = s.order.slice(0, 60), p = [];
    for (var k = 1; k < o.length; k++) p.push([o[k - 1], o[k]]);
    return p;
  }
  function mrSig(s) { return s.kind + ':' + s.order.length + ':' + s.order.slice(0, 12).join(',') + ':' + (s.pairs ? s.pairs.length : 0); }
  function mrFit(s, done) {
    var sig = mrSig(s); if (MR.fits[sig]) return done(MR.fits[sig]);
    var L = MR.L, m = MR.M, pairs = mrPairs(s), tok = ++MR.tok;
    if (pairs.length < 2) { MR.fits[sig] = { K: null }; return done(MR.fits[sig]); }
    var tgt = L.pairStats(m, pairs), starts = L.fitStarts(pairs, 6, L.FIT_SEED), grid = [], f, p, n, r;
    [0, 1].forEach(function (f) { TRY.forEach(function (p) { TRY.forEach(function (n) { TRY.forEach(function (r) { grid.push([0.55, f, p, n, r, 0]); }); }); }); });
    var best = null, bg = 1e9, at = 0, note = $('m6note');
    (function chunk() {
      if (tok !== MR.tok) return;
      var end = Math.min(grid.length, at + 6);
      for (; at < end; at++) { var g = L.gap(L.ruleStats(m, grid[at], starts, L.FIT_SEED), tgt); if (g < bg) { bg = g; best = grid[at]; } }
      if (at < grid.length) { if (note) note.textContent = 'fitting your habits: ' + Math.round(100 * at / grid.length) + '%'; setTimeout(chunk, 0); return; }
      MR.fits[sig] = { K: best, gap: bg, n: pairs.length }; if (note) note.textContent = ''; done(MR.fits[sig]);
    })();
  }
  var MA = {};
  function mrCanvas(id, set, path, color, setColor) {
    var c = ctxOf(id), tok = MA[id] = (MA[id] || 0) + 1; base(c);
    set.order.forEach(function (i) { sq(c, i, 4, setColor); });
    var still = path.length < 2 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var step = function (k) {
      if (k > 0) { var pp = function (q) { return [c.X(F.xy[q][0]), c.Y(F.xy[q][1])]; }, a = pp(path[k - 1]), b = pp(path[k]), s0 = k > 1 ? pp(path[k - 2]) : a, g = c.g; g.save(); g.strokeStyle = color; g.lineWidth = 1.6 * c.d; g.lineCap = 'round'; g.beginPath(); g.moveTo((s0[0] + a[0]) / 2, (s0[1] + a[1]) / 2); g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.stroke(); g.restore(); }
      sq(c, path[k], k === 0 ? 11 : set.set.has(path[k]) ? 8 : 5, k === 0 ? '#efe9ff' : color);
      if (k === 0) PK.glyph(c.g, 'star', c.X(F.xy[path[0]][0]), c.Y(F.xy[path[0]][1]), 9 * c.d, '#efe9ff');
    };
    c.path = path; c.set = set; MC[id] = { path: path, set: set };
    if (still) { path.forEach(function (_, k) { step(k); }); return; }
    var k = 0, t0 = performance.now();
    (function tick(now) {
      if (tok !== MA[id]) return;
      var to = Math.min(path.length - 1, Math.floor((now - t0) / 30));
      for (; k <= to; k++) step(k);
      if (k < path.length) requestAnimationFrame(tick);
    })(t0);
  }
  var MC = {};
  function mrTap(id) {
    return function (e) {
      var m = MC[id]; if (!m) return;
      var r = $(id).getBoundingClientRect(), pad = 14, sc = (Math.min(r.width, r.height) - 2 * pad) / 1000;
      var x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 24 * 24;
      m.path.concat(m.set.order).forEach(function (i) { var dx = pad + F.xy[i][0] * sc - x, dy = pad + F.xy[i][1] * sc - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      var el = $('t6');
      if (best < 0) { el.textContent = 'nothing there. tap closer to a shape.'; return; }
      var st = m.path.indexOf(best);
      el.innerHTML = '<b>' + esc(F.n[best]) + '</b>' + (st >= 0 ? ' · step ' + st + ' of the walk' : ' · on the list, not visited');
    };
  }
  function mrLine(el, who, w, set, whose) {
    var t = new Set(w.path.filter(function (i) { return set.set.has(i); }));
    var dist = new Set(w.path).size;
    el.innerHTML = who + ': ' + (w.loopAt ? 'loops at step <b>' + w.loopAt + '</b>' : 'no loop in <b>40</b> steps') + ', visits <b>' + dist + '</b> distinct artists, <b>' + t.size + '</b> on ' + whose + ' list.';
  }
  function mirror() {
    var A = S.a; if (!F || !A || !$('c6a')) return;
    var f = $('f6'), note = $('m6note');
    if (MR.st === 0) { return; }
    if (MR.st < 0) { f.textContent = 'the walk rule did not load. reload to try again.'; return; }
    if (MR.st === 1) { f.textContent = 'loading the walk rule.'; return; }
    var L = MR.L, m = MR.M, mine = MR.FIT.queue.K.slice(), tok = MR.tok;
    mine[4] = Math.min(1, 0.5 * HABIT);
    var topA = A.order[0], topMe = MR.OWN.order[0];
    if (topA === undefined) { f.textContent = 'a has no placed artist, so there is nothing to start from.'; return; }
    var go = function (fit) {
      if (A !== S.a) return;
      var w1 = L.walk(m, topA, mine, 20261105 + SEED);
      mrCanvas('c6a', A, w1.path, COL.o, '#4b5a78');
      mrLine($('l6a'), 'auto-play on your list', w1, A, 'your');
      if (!fit) { $('l6b').textContent = 'fitting your habits from your list.'; mrCanvas('c6b', MR.OWN, [topMe], COL.a, '#4b5a78'); return; }
      if (!fit.K) { $('l6b').textContent = 'your list is too short to fit your habits.'; mrCanvas('c6b', MR.OWN, [topMe], COL.a, '#4b5a78'); return; }
      var K = fit.K.slice(); K[4] = Math.min(1, K[4] * HABIT);
      var w2 = L.walk(m, topMe, K, 20261106 + SEED);
      mrCanvas('c6b', MR.OWN, w2.path, COL.a, '#4b5a78');
      mrLine($('l6b'), 'your habits on my list', w2, MR.OWN, 'my top 200');
      if (fit.gap > 0.5 || fit.n < 20) $('l6b').innerHTML += ' <b>weak fit</b> (' + fit.n + ' pairs, gap ' + fit.gap.toFixed(2) + ').';
    };
    f.textContent = 'the dial scales how hard each rule repeats pairs that already ran. higher: tighter loops, fewer distinct artists. lower: wider drift.';
    $('g6').innerHTML = '<span style="color:' + COL.o + '">violet</span> = auto-play\'s dials on side a\'s list. <span style="color:' + COL.a + '">ice</span> = habits learned from side a, walking my list. white star = the start.';
    var sig = mrSig(A);
    if (MR.fits[sig]) go(MR.fits[sig]);
    else { go(null); mrFit(A, function (fit) { if (A === S.a) go(fit); }); }
  }

  // ---- tap to name (panel one) ----
  function rankIn(s, i) { return s && s.set.has(i) ? s.order.indexOf(i) + 1 : 0; }
  function tap(e) {
    if (!S.a || !S.b) return;
    var c = $('c1'), r = c.getBoundingClientRect(), pad = 14, sc = (Math.min(r.width, r.height) - 2 * pad) / 1000;
    var x = e.clientX - r.left, y = e.clientY - r.top, best = -1, bd = 22 * 22;
    [S.a, S.b].forEach(function (s) {
      s.order.forEach(function (i) { var dx = pad + F.xy[i][0] * sc - x, dy = pad + F.xy[i][1] * sc - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
    });
    HOT = best;
    var t1 = $('t1');
    if (best < 0) { t1.textContent = 'nothing of yours there. tap closer to a shape.'; draw(); return; }
    var ra = rankIn(S.a, best), rb = rankIn(S.b, best), bits = [];
    if (ra) bits.push('<span style="color:' + col('a') + '">' + nm('a') + '</span> #' + ra);
    if (rb) bits.push('<span style="color:' + col('b') + '">' + nm('b') + '</span> #' + rb);
    t1.innerHTML = '<b>' + esc(F.n[best]) + '</b> · ' + esc(F.fam[F.f[best]] || '') + ' · ' + bits.join(', ');
    draw();
  }

  // ---- hear the closest crossing: one 30 s preview each side, 12 s apiece ----
  function stopHear(msg) {
    PLAYING++; if (AU) { try { AU.pause(); } catch (x) {} }
    $('hear').textContent = 'hear the closest crossing'; $('t4').textContent = msg || '';
  }
  function playOne(i, side, token, next) {
    var e = PV && PV.a ? PV.a[F.n[i]] : null;
    if (!e || !e[1]) { next(); return; }
    if (!AU) { AU = new Audio(); AU.preload = 'auto'; }
    AU.src = e[1]; AU.currentTime = 0;
    $('t4').innerHTML = 'now: <span style="color:' + col(side) + '">' + esc(F.n[i]) + '</span> · ' + esc(e[0]);
    var q; try { q = AU.play(); } catch (x) { q = null; }
    if (q && q.catch) q.catch(function () { if (token === PLAYING) stopHear('the preview did not play here.'); });
    setTimeout(function () { if (token === PLAYING) next(); }, 12000);
  }
  function hear() {
    if ($('hear').textContent === 'stop') { stopHear(); return; }
    if (!CROSS) { $('t4').textContent = 'no crossing to hear yet.'; return; }
    var token = ++PLAYING, pair = CROSS;
    $('hear').textContent = 'stop'; $('t4').textContent = 'loading the previews';
    var go = function () {
      playOne(pair[0], 'a', token, function () {
        playOne(pair[1], 'b', token, function () { if (token === PLAYING) stopHear('two 12-second previews from Apple Music, one per side.'); });
      });
    };
    if (PV) { go(); return; }
    fetch('../../front/data/pv.json').then(function (r) { return r.json(); }).then(function (d) { PV = d; if (token === PLAYING) go(); })
      .catch(function () { if (token === PLAYING) stopHear('the previews did not load.'); });
  }

  // ---- wiring ----
  function bind(side) {
    var card = document.querySelector('.side[data-s="' + side + '"]');
    $('file-' + side).addEventListener('change', function (e) { if (e.target.files && e.target.files.length) readFiles(e.target.files, side); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { card.addEventListener(ev, function (e) { e.preventDefault(); card.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { card.addEventListener(ev, function (e) { e.preventDefault(); card.classList.remove('over'); }); });
    card.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) readFiles(e.dataTransfer.files, side); });
    var tmr = null;
    $('txt-' + side).addEventListener('input', function (e) {
      clearTimeout(tmr); var v = e.target.value;
      tmr = setTimeout(function () { if (v.trim()) set(side, fromList(v, 'a pasted list')); }, 350);
    });
    $('own-' + side).addEventListener('click', function () {
      var other = side === 'a' ? 'b' : 'a';
      if (S[other] && S[other].kind === 'owner') { var st = $('st-' + side); st.className = 'st'; st.innerHTML = 'the owner is already on side ' + other + '. give this side your own music.'; return; }
      $('txt-' + side).value = ''; set(side, fromOwner());
    });
  }
  function samples() {
    $('txt-a').value = ''; $('txt-b').value = '';
    var a = fromList(SAMPLES.a.join('\n'), 'made-up list'), b = fromList(SAMPLES.b.join('\n'), 'made-up list');
    S.a = null; set('a', a); set('b', b);
  }

  var rz = null;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(draw, 120); });

  $('t4').textContent = 'loading my map';
  Promise.all([
    fetch('../../front/data/field.json').then(function (r) { return r.json(); }),
    fetch('../../front/data/maps.json').then(function (r) { return r.json(); }),
    fetch('data/samples.json').then(function (r) { return r.json(); })
  ]).then(function (d) {
    if ($('t4').textContent === 'loading my map') $('t4').textContent = '';
    F = d[0]; M = d[1]; SAMPLES = d[2];
    F.n.forEach(function (name, i) { var k = norm(name); if (!IDX.has(k)) IDX.set(k, i); });
    bind('a'); bind('b');
    $('try').addEventListener('click', samples);
    $('c1').addEventListener('click', tap);
    $('c6a').addEventListener('click', mrTap('c6a')); $('c6b').addEventListener('click', mrTap('c6b'));
    $('hear').addEventListener('click', hear);
    var Q = new URLSearchParams((location.hash || '').slice(1)), KIOSK = /[?&]kiosk=1/.test(location.search);
    var setHabit = function (v) { HABIT = v; $('habit').value = v; $('habit6').value = v; };
    var keep = function () { try { history.replaceState(null, '', '#habit=' + HABIT + '&seed=' + SEED); } catch (e) {} };
    if (Q.has('habit') && isFinite(+Q.get('habit'))) setHabit(Math.max(0, Math.min(4, +Q.get('habit'))));
    if (Q.has('seed') && isFinite(+Q.get('seed'))) SEED = Math.max(0, +Q.get('seed') | 0);
    buildGraph();
    var idle = null, poke = function () { if (!KIOSK) return; clearTimeout(idle); idle = setTimeout(function () { setHabit(1); SEED = 0; buildGraph(); samples(); keep(); }, 120000); };
    ['habit', 'habit6'].forEach(function (id) { $(id).addEventListener('input', function (e) { setHabit(+e.target.value); buildGraph(); draw(); keep(); poke(); }); });
    ['again', 'again6'].forEach(function (id) { $(id).addEventListener('click', function () { SEED++; draw(); keep(); poke(); }); });
    $('try').addEventListener('click', poke); document.addEventListener('pointerdown', poke); poke();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { ob.disconnect(); mrLoad(); } }, { rootMargin: '800px' }).observe($('p6'));
    else mrLoad();
    samples();
  }).catch(function () {
    $('lead').textContent = 'the map did not load. reload the page to try again.';
  });
})();
