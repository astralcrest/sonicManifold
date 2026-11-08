(function () {
  'use strict';
  var COL = { press: '#21f6bc', shuffle: '#f5a623', queue: '#8b6fd6' }, GLY = { press: 'star', shuffle: 'diamond', queue: 'ring' }, ROSE = '#ff5c7a', STEP = 2200;
  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d'), mapEl = $('map');
  var M, H, PV = null, adj = [], ev = 0, step = 0, presses = [], bent = [], playing = true, listening = false, timer = null, resumeT = null;
  var aud = new Audio(); aud.preload = 'none'; aud.onerror = function () {};
  var W = 0, Ht = 0, OX = 0, OY = 0, SC = 1, dpr = 1, dots = null;

  function D(a, b) { var p = M.xy[a], q = M.xy[b]; return Math.hypot(p[0] - q[0], p[1] - q[1]); }
  function real() { return H.ev[ev].p; }

  function compute() {
    var r = real(), n = r.length, used = {}, out = [r[0][0]]; used[r[0][0]] = 1;
    for (var j = 1; j < n; j++) {
      var prev = out[j - 1], target = r[j][0], pick = target, pressed = presses.indexOf(j) >= 0;
      if (prev !== r[j - 1][0] || pressed) {
        var best = null, bd = 1e9, c = adj[prev] || [];
        for (var k = 0; k < c.length; k++) {
          var a = c[k]; if (used[a] || a === prev) continue;
          var d = D(a, target); if (d < bd) { bd = d; best = a; }
        }
        pick = best === null ? target : best;
      }
      if (pressed) {
        var normal = pick, alt = null, ad = 1e9, c2 = adj[prev] || [];
        for (var m = 0; m < c2.length; m++) {
          var b = c2[m]; if (used[b] || b === prev || b === normal) continue;
          var d2 = D(b, normal); if (d2 < ad) { ad = d2; alt = b; }
        }
        if (alt !== null) pick = alt;
      }
      if (used[pick]) pick = target;
      out.push(pick); used[pick] = 1;
    }
    bent = out;
  }

  function yourBend() {
    if (!presses.length) return null;
    var r = real(), s = 0, c = 0;
    for (var j = 1; j < r.length; j++) if (bent[j] !== r[j][0]) { s += D(r[j][0], bent[j]); c++; }
    return { m: c ? s / c / 1000 : 0, n: c };
  }
  function myBend() {
    var r = real(), s = 0, c = 0;
    for (var j = 1; j < r.length; j++) {
      if (r[j][2] !== 'press') continue;
      var top = null, tw = -1, es = M.eo[r[j - 1][0]] || [];
      for (var k = 0; k < es.length; k++) if (es[k][1] > tw) { tw = es[k][1]; top = es[k][0]; }
      if (top === null) continue;
      s += D(r[j][0], top); c++;
    }
    return c ? s / c / 1000 : null;
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = mapEl.clientWidth; Ht = mapEl.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Ht * dpr); cv.style.width = W + 'px'; cv.style.height = Ht + 'px';
    var pad = 22, s = Math.min(W - 2 * pad, Ht - 2 * pad);
    SC = s / 1000; OX = (W - s) / 2; OY = (Ht - s) / 2;
    dots = null; draw();
  }
  function px(i) { return [OX + M.xy[i][0] * SC, OY + M.xy[i][1] * SC]; }
  var PK = window.WK && window.WK.P;
  function buildDots() {
    dots = document.createElement('canvas'); dots.width = cv.width; dots.height = cv.height;
    var g = dots.getContext('2d'); g.scale(dpr, dpr);
    var X = function (i) { return px(i)[0]; }, Y = function (i) { return px(i)[1]; }, small = W < 500;
    if (PK) PK.field(g, M.xy, X, Y, { lo: small ? 1.6 : 2.2, hi: small ? 4.5 : 7, core: 0.6, col: function () { return '#4a4280'; } });
    else { g.fillStyle = '#3a2f5c'; for (var i = 0; i < M.xy.length; i++) { var p = px(i); g.fillRect(p[0] - 1, p[1] - 1, 2, 2); } }
  }
  function sqr(c, x, y, s, fill, kind) {
    if (PK) { ctx.save(); ctx.globalAlpha = fill ? 1 : 0.4; PK.glyph(ctx, kind || 'dot', x, y, s * 0.9, c); ctx.restore(); return; }
    if (fill) { ctx.fillStyle = c; ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s); return; }
    ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - s / 2) + .5, Math.round(y - s / 2) + .5, s - 1, s - 1);
  }
  function draw() {
    if (!M || !H) return;
    if (!dots) buildDots();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(dots, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r = real(), n = r.length, sq = W < 500 ? 8 : 11, i, p, q, pts = [], bp = [];
    var any = presses.length > 0 && bent.length === n;
    for (i = 0; i < n; i++) { pts.push(px(r[i][0])); if (any) bp.push(px(bent[i])); }
    if (PK) PK.ribbon(ctx, pts, '#8b6fd6', '#bcd3ff', any ? 1.5 : (W < 500 ? 2 : 2.5), any ? 0.45 : 0.9);
    else { ctx.lineWidth = 1; ctx.strokeStyle = '#4a3d72'; ctx.beginPath(); pts.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }
    if (any) {
      if (PK) PK.ribbon(ctx, bp, ROSE, '#ffb3c6', W < 500 ? 2 : 2.5, 0.95);
      else { ctx.strokeStyle = ROSE; ctx.lineWidth = 1; ctx.beginPath(); bp.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }
    }
    for (i = 0; i < n; i++) {
      p = pts[i]; var lit = i <= step, c = COL[r[i][2]];
      sqr(c, p[0], p[1], sq, lit, GLY[r[i][2]]);
      if (any && bent[i] !== r[i][0]) { q = bp[i]; sqr(ROSE, q[0], q[1], sq, i <= step, 'dot'); }
    }
    var cur = px(any ? bent[step] : r[step][0]);
    if (listening && PV && PV[curArtist()]) WK.pulse(ctx, cur[0], cur[1], any && bent[step] !== r[step][0] ? ROSE : COL[r[step][2]], sq + 6);
    if (PK) PK.rings(ctx, cur[0], cur[1], '#efe9ff', sq + 8);
    else { ctx.strokeStyle = '#efe9ff'; ctx.lineWidth = 2; ctx.strokeRect(cur[0] - sq, cur[1] - sq, sq * 2, sq * 2); }
  }

  function curArtist() { return presses.length ? bent[step] : real()[step][0]; }
  function text() {
    var r = real(), a = curArtist(), t = r[step], title = presses.length && bent[step] !== t[0] ? '' : t[1];
    var arm = bent[step] !== t[0] ? 'bent by you' : ({ press: 'i pressed', shuffle: 'shuffle picked', queue: 'auto-play picked' })[t[2]];
    $('now').innerHTML = '';
    var s = document.createElement('span'); s.textContent = (M.n[a] || '') + (title ? ' · ' + title : ''); $('now').appendChild(s);
    var sm = document.createElement('small'); var nx = step < r.length - 1 ? M.n[presses.length ? bent[step + 1] : r[step + 1][0]] : null; sm.textContent = 'step ' + (step + 1) + ' of ' + r.length + ': ' + (M.n[a] || '') + (nx ? ', then ' + nx : ', end of evening') + ' · ' + arm; $('now').appendChild(sm);
    var y = yourBend(), m = myBend(), v = $('verdict'); v.innerHTML = '';
    $('bend').textContent = y === null ? 'none yet' : y.n ? y.m.toFixed(2) : 'none';
    function line(lab, val) { var d = document.createElement('div'); d.textContent = lab + ': ' + val; v.appendChild(d); }
    line('your bend', y === null ? 'none yet' : y.n ? y.m.toFixed(2) + ' of the map, over the ' + y.n + ' songs you changed' : 'none, no song changed');
    line('my presses that evening', m === null ? 'none' : m.toFixed(2) + ' of the map, a different measure');
    var cnt = { press: 0, shuffle: 0, queue: 0 }; r.forEach(function (x) { cnt[x[2]]++; });
    $('ev').textContent = 'an evening in ' + H.ev[ev].s + ' · evening ' + (ev + 1) + ' of ' + H.ev.length + ' · of these ' + r.length + ' plays: i pressed ' + cnt.press + ', shuffle picked ' + cnt.shuffle + ', auto-play picked ' + cnt.queue + '.';
    $('back').disabled = step === 0; var last = step >= r.length - 1; $('skip').textContent = last ? 'next evening' : 'swap next song';
  }

  function hash() {
    if (!/kiosk=1/.test(location.search)) try { history.replaceState(null, '', '#e=' + ev + '&i=' + step + (presses.length ? '&p=' + presses.join(',') : '')); } catch (e) {}
  }
  function stopAudio() { try { aud.pause(); aud.removeAttribute('src'); } catch (e) {} }
  function syncAudio() {
    if (!listening) return;
    if (!aud.paused && !aud.ended && aud.src) return;
    var a = curArtist(), p = PV && PV[a];
    if (!p) { stopAudio(); $('now').lastChild.textContent += ' · no preview of this artist'; return; }
    $('now').lastChild.textContent += ' · a preview of this artist'; try { aud.src = p[1]; var pr = aud.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
  }
  function render() { text(); draw(); hash(); syncAudio(); if (listening && PV && PV[curArtist()]) WK.live(draw); else WK.still(); }

  function tick() {
    clearTimeout(timer);
    if (!playing || document.hidden) return;
    timer = setTimeout(function () {
      if (step < real().length - 1) { step++; render(); tick(); } else playing = false;
    }, STEP);
  }
  function poke() {
    return;
  }

  function load(e, i, p) {
    ev = e; step = Math.max(0, Math.min(i, real().length - 1)); presses = (p || []).filter(function (x) { return x >= 1 && x < real().length; });
    compute(); playing = step < real().length - 1; render(); tick();
  }
  function doReset() {
    listening = false; stopAudio(); $('hear').setAttribute('aria-pressed', 'false'); $('hear').textContent = 'hear this song';
    load(Math.floor(Math.random() * H.ev.length), 0, []);
  }
  $('skip').onclick = function () {
    var n = real().length; if (step >= n - 1) { load((ev + 1) % H.ev.length, 0, []); return; }
    clearTimeout(resumeT);
    var k = step + 1; if (presses.indexOf(k) < 0) presses.push(k);
    presses.sort(function (a, b) { return a - b; }); compute(); step = k; playing = step < n - 1; render(); tick();
  };
  $('back').onclick = function () {
    if (step === 0) return;
    var ix = presses.indexOf(step); if (ix >= 0) { presses.splice(ix, 1); compute(); }
    step--; playing = false; render(); clearTimeout(resumeT); resumeT = setTimeout(function () { if (step < real().length - 1) { playing = true; tick(); } }, 3000);
  };
  $('next').onclick = function () { clearTimeout(resumeT); load((ev + 1) % H.ev.length, 0, []); };
  $('reset').onclick = doReset;
  $('hear').onclick = function () {
    var b = $('hear');
    if (listening) { listening = false; stopAudio(); b.setAttribute('aria-pressed', 'false'); b.textContent = 'hear this song'; render(); return; }
    listening = true; b.setAttribute('aria-pressed', 'true'); b.textContent = 'stop sound';
    if (PV) syncAudio();
    else { $('now').lastChild.textContent += ' · loading previews'; fetch('../loop/data/pv.json').then(function (r) { return r.json(); }).then(function (j) { PV = j.a; render(); }).catch(function () { PV = {}; }); }
  };
  cv.addEventListener('pointerdown', function (e) {
    var b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, r = real(), best = -1, bd = 16, i, p, d;
    for (i = 0; i < r.length; i++) { p = px(r[i][0]); d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } }
    if (best < 0) return;
    clearTimeout(resumeT); step = best; playing = false; stopAudio(); render();
    resumeT = setTimeout(function () { if (step < real().length - 1) { playing = true; tick(); } }, 3000);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { clearTimeout(timer); stopAudio(); } else { if (listening) syncAudio(); tick(); } });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 120); });

  Promise.all([fetch('data/map.json').then(function (r) { return r.json(); }), fetch('data/haunted.json').then(function (r) { return r.json(); })]).then(function (a) {
    M = a[0]; H = a[1]; M.eo = [];
    M.e.forEach(function (e) { (adj[e[0]] = adj[e[0]] || []).push(e[1]); (M.eo[e[0]] = M.eo[e[0]] || []).push([e[1], e[2]]); });
    var h = {}; location.hash.slice(1).split('&').forEach(function (kv) { var s = kv.split('='); h[s[0]] = s[1]; });
    var e0 = h.e !== undefined && +h.e >= 0 && +h.e < H.ev.length ? +h.e : Math.floor(Math.random() * H.ev.length);
    var p0 = h.p ? h.p.split(',').map(Number).filter(function (x) { return x === x; }) : [];
    size(); load(e0, +h.i || 0, p0);
  }).catch(function () { $('now').textContent = 'the map did not load. refresh to try again.'; });
})();
