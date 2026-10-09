(function () {
  'use strict';
  var d = document, mm = function (q) { return window.matchMedia && matchMedia(q).matches; };
  d.documentElement.classList.add('js');
  var all = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* folds: every technical fold starts closed, so the short read is the page; abstract, limits and cite stay open (data-keep).
     one control opens or closes the lot; a deep link opens its own fold. */
  all('details.fold,details.pt').forEach(function (x) {
    if (x.getAttribute('data-keep') === null && !(x.parentElement && x.closest('[data-keep]'))) x.removeAttribute('open');
  });
  all('details.fold').forEach(function (f) {
    var s = f.querySelector('summary'), w = (f.textContent || '').replace(s.textContent, '').trim().split(/\s+/).length;
    s.setAttribute('data-min', Math.max(1, Math.round(w / 230)) + ' min read');
  });
  function reveal(el) { for (var p = el; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; }
  function hash() { var t = location.hash && d.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) reveal(t); }
  addEventListener('hashchange', hash); hash();
  addEventListener('beforeprint', function () { all('details').forEach(function (x) { x.open = true; }); });

  var folds = all('details.fold'), readBtns = [];
  var secOf = function (f) { return f.closest('section'); };
  function sync() {
    var every = folds.every(function (f) { return f.open; });
    readBtns.forEach(function (b) { b.setAttribute('aria-pressed', every ? 'true' : 'false'); b.textContent = every ? 'fold it back' : 'read everything'; });
    all('.toc a').forEach(function (a) {
      var s = d.getElementById(a.getAttribute('href').slice(1)), f = s && s.querySelector('details.fold');
      if (f) a.setAttribute('data-open', f.open ? 'true' : 'false'); else a.removeAttribute('data-open');
    });
  }
  function toggleAll() {
    var every = folds.every(function (f) { return f.open; });
    all('details.fold,details.pt').forEach(function (x) { x.open = !every || x.hasAttribute('data-keep') || !!x.closest('[data-keep]'); });
    sync();
  }
  all('button.readall').forEach(function (b) { b.onclick = toggleAll; readBtns.push(b); });
  d.addEventListener('toggle', sync, true);
  sync();

  /* contents: current section, and a progress hairline when css scroll timelines are missing */
  var links = all('.toc a'), cur = null, ol = d.querySelector('.toc ol'), nav = d.querySelector('.toc'), tb = null;
  /* phone: the eleven tabs fold behind one line, contents plus where you are */
  if (nav && ol) {
    tb = d.createElement('button'); tb.type = 'button'; tb.className = 'tocb'; tb.setAttribute('aria-expanded', 'false');
    tb.innerHTML = 'contents <i aria-hidden="true">&#9662;</i> <b></b>'; nav.insertBefore(tb, ol);
    var shut = function () { nav.classList.remove('open'); tb.setAttribute('aria-expanded', 'false'); };
    tb.onclick = function () { var o = nav.classList.toggle('open'); tb.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) shut(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { shut(); tb.focus(); } });
  }
  function mark(id) {
    if (id === cur) return; cur = id;
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      if (on) { a.setAttribute('aria-current', 'true'); if (tb) tb.lastChild.textContent = a.textContent; if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = a.offsetLeft - 48; } else a.removeAttribute('aria-current');
    });
  }
  var secs = links.map(function (a) { return d.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  var tick = function () {
    var best = secs[0];
    secs.forEach(function (s) { if (s.getBoundingClientRect().top < innerHeight * .3) best = s; });
    if (best) mark(best.id);
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(tick, { rootMargin: '-20% 0px -70% 0px', threshold: [0, 1] });
    secs.forEach(function (s) { io.observe(s); });
  } else addEventListener('scroll', tick, { passive: true });
  tick();
  var bar = d.querySelector('.prog');
  if (bar && !(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'))) {
    var raf = 0;
    addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0; var h = d.documentElement.scrollHeight - innerHeight;
        bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
      });
    }, { passive: true });
  }

  /* ledger: stamps land one by one when the list comes into view */
  var led = d.querySelector('.ledger');
  if (led) {
    var lis = all('li', led), go = function () { lis.forEach(function (l, i) { setTimeout(function () { l.classList.add('in'); }, i * 70); }); };
    if ('IntersectionObserver' in window && !mm('(prefers-reduced-motion:reduce)')) {
      var lo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { lo.disconnect(); go(); } }, { rootMargin: '0px 0px -25% 0px' });
      lo.observe(led);
    } else lis.forEach(function (l) { l.classList.add('in'); });
  }

  /* the record: every play of the log, in order, as one spiral groove. each run is a month's tapped, shuffled and served plays (counts as on the landing). */
  var rc = d.getElementById('rec');
  if (rc && rc.getContext) {
    var TAP = [3,0,0,0,0,0,7,0,0,0,0,0,4,8,3,1,0,0,1,0,0,0,0,2,4,5,0,0,0,132,218,97,178,160,198,234,122,138,157,281,268,251,295,285,255,117,114,243,65,330,373,286,502,383,416,355,432,301,201,368,356,317,283,232,275,211,499,386,514,330,371,436,444,663,468,986,868,699,838,1243,379],
      SHU = [0,0,0,0,0,0,40,0,0,0,0,0,7,77,22,8,0,0,0,0,0,0,0,8,7,21,0,3,0,154,37,491,413,427,429,439,736,901,648,385,344,462,479,252,110,189,171,68,0,32,90,132,342,162,396,420,401,356,24,225,370,707,721,379,237,174,724,438,418,346,116,130,555,35,34,49,128,196,403,194,0],
      SRV = [5,0,0,0,0,0,0,0,0,0,0,0,1,5,5,4,0,0,0,0,0,0,0,0,0,2,0,0,0,1000,1609,647,1018,738,528,1660,690,560,875,1372,1516,1444,1724,1596,1329,527,828,1296,370,1018,1127,702,1634,1294,1483,1008,1263,1051,900,890,889,696,240,657,584,618,1110,973,951,1039,1686,1094,631,1901,1560,3225,2188,2152,2138,3324,1199];
    var CL = ['#21f6bc', '#f5a623', '#8b6fd6'], runs = [], N = 0, mi, ki, cn;
    for (mi = 0; mi < TAP.length; mi++) { cn = [TAP[mi], SHU[mi], SRV[mi]]; for (ki = 0; ki < 3; ki++) if (cn[ki]) { runs.push([N, N + cn[ki], ki]); N += cn[ki]; } }
    var cx = rc.getContext('2d'), D = 0, R1 = 0, R0 = 0, KD = 0, PT = 0, done = 0, lw = 1, TAU = 6.283185307179586;
    var rad = function (i) { return Math.sqrt(R1 * R1 - KD * i); };
    var ang = function (i) { return (R1 - rad(i)) * TAU / PT + 0.69; };
    var seg = function (a, b, k) {
      var n = Math.max(1, Math.ceil((ang(b) - ang(a)) / 0.05)), j, t, r, x, y;
      cx.beginPath();
      for (j = 0; j <= n; j++) {
        t = a + (b - a) * j / n; r = rad(t); x = D / 2 + r * Math.cos(ang(t)); y = D / 2 + r * Math.sin(ang(t));
        if (j) cx.lineTo(x, y); else cx.moveTo(x, y);
      }
      cx.strokeStyle = CL[k]; cx.stroke();
    };
    var upto = function (from, to) {
      cx.lineWidth = lw; cx.lineCap = 'butt';
      runs.forEach(function (r) { if (r[1] > from && r[0] < to) seg(Math.max(r[0], from), Math.min(r[1], to), r[2]); });
    };
    var dpr = function () { return Math.min(Math.max(window.devicePixelRatio || 1, 2), 3); };
    var base = function () {
      var w = rc.getBoundingClientRect().width;
      if (w < 40) return false;
      D = rc.width = rc.height = Math.min(Math.round(w * dpr()), 1500);
      var c = D / 2; R1 = c * 0.955; R0 = c * 0.3; KD = (R1 * R1 - R0 * R0) / N; PT = Math.max(1.4, Math.sqrt(Math.PI * KD)); lw = PT * 0.92;
      var bg = cx.createRadialGradient(c, c, 0, c, c, c); bg.addColorStop(0, '#0d0718'); bg.addColorStop(0.96, '#08030f'); bg.addColorStop(1, '#2a1f3d');
      cx.fillStyle = bg; cx.beginPath(); cx.arc(c, c, c * 0.985, 0, TAU); cx.fill();
      return true;
    };
    var label = function () {
      var c = D / 2;
      cx.fillStyle = '#1d1230'; cx.beginPath(); cx.arc(c, c, R0 * 0.96, 0, TAU); cx.fill();
      cx.strokeStyle = 'rgba(189,166,255,.25)'; cx.lineWidth = Math.max(1, D / 600); cx.stroke();
      cx.fillStyle = '#05010a'; cx.beginPath(); cx.arc(c, c, D * 0.011, 0, TAU); cx.fill();
    };
    var still = function () { if (base()) { upto(0, N); label(); done = N; } };
    if (mm('(prefers-reduced-motion:reduce)')) still();
    else if (base()) {
      var t0 = 0, step = function (t) {
        if (!t0) t0 = t;
        var u = Math.min(1, (t - t0) / 2200), to = Math.round((1 - Math.pow(1 - u, 3)) * N);
        upto(done, to); done = to; label();
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    var rt = 0;
    addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (Math.abs(rc.getBoundingClientRect().width * dpr() - D) > 2 && D <= 1498) still(); }, 200);
    });
  }

  var NS = 'http://www.w3.org/2000/svg';
  function el(n, a, p) { var e = d.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function shell(root, h, q) { root.innerHTML = '<h2>' + h + '</h2><p class="xq">' + q + '</p>'; }

  /* 1. what counts as a tap: drag the line. every figure here is on the page. */
  var sp = d.getElementById('xp-split');
  if (sp) {
    shell(sp, 'drag the line', 'where does tapped end and served begin?');
    var svg = el('svg', { viewBox: '0 0 600 100', role: 'img', 'aria-label': 'one hundred dots, one per percent of plays. tapped dots are mint, shuffle dots amber, queue dots violet, and plays that are neither are gray.' }, null);
    sp.appendChild(svg);
    var dots = [];
    for (var i = 0; i < 100; i++) dots.push(el('circle', { cx: 12 + (i % 25) * 24, cy: 12 + Math.floor(i / 25) * 25, r: 8.5, 'class': 'dot' }, svg));
    var rg = d.createElement('input');
    rg.type = 'range'; rg.min = 0; rg.max = 100; rg.step = 0.1; rg.value = 11.5; rg.setAttribute('aria-label', 'share of plays counted as tapped');
    sp.appendChild(rg);
    var g = d.createElement('div'); g.className = 'grp';
    [['strict set', 11.5], ['bundled set', 19.1]].forEach(function (b) {
      var x = d.createElement('button'); x.type = 'button'; x.textContent = b[0] + ' ' + b[1] + '%';
      x.onclick = function () { rg.value = b[1]; draw(); }; g.appendChild(x);
    });
    sp.appendChild(g);
    var out = d.createElement('p'); out.className = 'out'; out.setAttribute('aria-live', 'polite'); sp.appendChild(out);
    var draw = function () {
      var p = +rg.value;
      if (Math.abs(p - 11.5) < 0.45) p = rg.value = 11.5; else if (Math.abs(p - 19.1) < 0.45) p = rg.value = 19.1;
      dots.forEach(function (c, i) { var x = i + 0.5; c.setAttribute('class', 'dot' + (x < p ? ' t' : x < 19.8 ? ' n' : x < 36.5 ? ' s' : '')); });
      var m = p === 11.5 ? 'strict taps: <b>clickrow, playbtn and remote</b>, 11.5% of plays. this is the arm the headline uses.'
        : p === 19.1 ? 'bundled taps add <b>backbtn and fwdbtn</b>, 19.1% of plays. that share is not stable across the october 2023 logger change: 11.8% before, 22.7% after. the strict set is the one that holds.'
        : 'the log has no cut here. it has two: the strict set and the bundled set.';
      out.innerHTML = m + ' <em>served plays are 80.2% either way: 16.7% shuffle-driven autoadvance, 63.5% the queue. 0.5% are ambiguous and left out.</em>';
    };
    rg.addEventListener('input', draw); draw();
  }

  /* 2. the bridge index as a direction: a sign and an interval, never a size */
  var br = d.getElementById('xp-bridge');
  if (br) {
    var S = [
      ['holds under', 'the headline', 1.03, 1.08, 'u', 'the interval sits above 1: the deliberate steps cross more.'],
      ['holds under', 'before the 2023 logger change', 1.022, 1.100, 'u', 'the interval sits above 1 for plays before 2023-09-01, the era cut set just ahead of the october 2023 logger change.'],
      ['holds under', 'after it', 1.018, 1.088, 'u', 'the interval sits above 1 after it too.'],
      ['holds under', 'iOS only', 1.046, 1.124, 'u', 'the interval sits above 1 within iOS.'],
      ['holds under', 'macOS only', 1.008, 1.077, 'u', 'the interval sits above 1 within macOS, close to the line.'],
      ['holds under', 'artist clusters', 1.021, 1.090, 'u', 'the interval sits above 1 when the bootstrap clusters on departure artist.'],
      ['fails under', 'untagged tail, any treatment', 1.00, 1.13, 'r', 'depending on how the untagged tail is treated the index lands anywhere in this range. the direction is reported and the size is not.'],
      ['fails under', 'tail: each artist alone', 0.983, 1.015, 'b', 'every untagged artist gets its own community: the interval brackets 1. no direction.'],
      ['fails under', 'tail: all pooled', 1.109, 1.161, 'u', 'every untagged artist shares one community: the interval sits above 1. the two treatments bracket 1, so the direction is reported and the size is not.'],
      ['fails under', 'the loosest arms', 0.991, 1.033, 'b', 'bundled taps against a shuffle-included comparator: the interval brackets 1. no direction.'],
      ['fails under', 'coverage matching', 0.977, 1.038, 'b', 'both arms held to artists with 50 plays or more: the interval brackets 1. no direction.']
    ];
    shell(br, 'press a condition', 'is the line still to the left of the band?');
    var nw = innerWidth < 640, VW = nw ? 340 : 600, f = nw ? 12 : 10.5;
    var s2 = el('svg', { viewBox: '0 0 ' + VW + ' ' + (nw ? 110 : 96), role: 'img', 'aria-label': 'a number line. a dashed line marks no difference. a band shows the interval for the chosen condition.' }, null);
    br.appendChild(s2);
    var X = function (v) { return 14 + (v - 0.97) / 0.17 * (VW - 28); };
    el('rect', { x: 14, y: 34, width: X(1) - 14, height: 38, fill: 'var(--border)', opacity: .35 }, s2);
    var bd = el('rect', { 'class': 'band up', y: 38, height: 30, rx: 3, x: X(1.03), width: X(1.08) - X(1.03) }, s2);
    el('line', { 'class': 'zero', x1: X(1), x2: X(1), y1: 16, y2: 86 }, s2);
    [['no difference', X(1) + 6, 24, 'start'], ['queue crosses more', 14, 102, 'start'], ['taps cross more', VW - 14, 102, 'end']].forEach(function (t) {
      el('text', { 'class': 'axl', x: t[1], y: t[2], 'text-anchor': t[3], style: 'font-size:' + f + 'px' }, s2).textContent = t[0];
    });
    var o2 = d.createElement('p'); o2.className = 'out'; o2.setAttribute('aria-live', 'polite');
    var grp = {}, btns = [];
    S.forEach(function (r, i) {
      if (!grp[r[0]]) { grp[r[0]] = d.createElement('div'); grp[r[0]].className = 'grp'; grp[r[0]].innerHTML = '<span>' + r[0] + '</span>'; br.appendChild(grp[r[0]]); }
      var b = d.createElement('button'); b.type = 'button'; b.textContent = r[1]; b.setAttribute('aria-pressed', 'false');
      b.onclick = function () { pick(i); }; grp[r[0]].appendChild(b); btns.push(b);
    });
    var sl = d.createElement('div'); sl.className = 'grp'; sl.innerHTML = '<span>the untagged tail, by hand</span>';
    var rs = d.createElement('input'); rs.type = 'range'; rs.min = 0; rs.max = 1; rs.step = 1; rs.value = 0; rs.setAttribute('aria-label', 'untagged artists: one value at each end');
    sl.appendChild(rs); br.appendChild(sl);
    var lab = d.createElement('p'); lab.className = 'axl2'; lab.innerHTML = '<span>each untagged artist alone</span><span>all untagged artists pooled</span>'; br.appendChild(lab);
    rs.oninput = function () { pick(+rs.value ? 8 : 7); };
    br.appendChild(o2);
    var pick = function (i) {
      if (history.replaceState) try { history.replaceState(null, '', '#xp-bridge:' + i); } catch (e) {}
      var r = S[i], lo = r[2], hi = r[3];
      btns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      bd.setAttribute('x', X(lo)); bd.setAttribute('width', X(hi) - X(lo));
      bd.setAttribute('class', 'band ' + (r[4] === 'u' ? 'up' : 'br'));
      o2.innerHTML = '<b>' + r[1] + '</b>, ' + (r[4] === 'r' ? lo.toFixed(2) + ' to ' + hi.toFixed(2) : '[' + lo + ', ' + hi + ']') + '. ' + r[5];
    };
    var m0 = /^#xp-bridge:(\d+)/.exec(location.hash); pick(m0 && S[+m0[1]] ? +m0[1] : 0);
  }
})();
