(function () {
  'use strict';
  var d = document, mm = function (q) { return window.matchMedia && matchMedia(q).matches; };
  d.documentElement.classList.add('js');
  var all = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* folds: open on desktop, closed on phone; abstract, limits and cite stay open (data-keep) */
  var phone = mm('(max-width:700px)');
  all('details.fold,details.pt').forEach(function (x) {
    if (phone && x.getAttribute('data-keep') === null && !(x.parentElement && x.closest('[data-keep]'))) x.removeAttribute('open');
  });
  all('details.fold').forEach(function (f) {
    var s = f.querySelector('summary'), w = (f.textContent || '').replace(s.textContent, '').trim().split(/\s+/).length;
    s.setAttribute('data-min', Math.max(1, Math.round(w / 230)) + ' min read');
  });
  function reveal(el) { for (var p = el; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; }
  function hash() { var t = location.hash && d.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) reveal(t); }
  addEventListener('hashchange', hash); hash();
  addEventListener('beforeprint', function () { all('details').forEach(function (x) { x.open = true; }); });

  /* contents: current section, and a progress hairline when css scroll timelines are missing */
  var links = all('.toc a'), cur = null, ol = d.querySelector('.toc ol');
  function mark(id) {
    if (id === cur) return; cur = id;
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      if (on) { a.setAttribute('aria-current', 'true'); if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = a.offsetLeft - 48; } else a.removeAttribute('aria-current');
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

  var NS = 'http://www.w3.org/2000/svg';
  function el(n, a, p) { var e = d.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function shell(root, h, q) { root.innerHTML = '<h3>' + h + '</h3><p class="xq">' + q + '</p>'; }

  /* 1. what counts as a tap: drag the line. every figure here is on the page. */
  var sp = d.getElementById('xp-split');
  if (sp) {
    shell(sp, 'drag the line', 'where does tapped end and queued begin?');
    var svg = el('svg', { viewBox: '0 0 600 100', role: 'img', 'aria-label': 'one hundred dots, one per percent of plays. tapped dots are gold, queued dots are blue, plays that are neither are grey.' }, null);
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
      dots.forEach(function (c, i) { c.setAttribute('class', 'dot' + (i + 0.5 < p ? ' t' : '')); c.style.fill = i + 0.5 < p ? '' : (i >= 19.8 ? '' : 'var(--border)'); });
      var m = p === 11.5 ? 'strict taps: <b>clickrow, playbtn and remote</b>, 11.5% of plays. this is the arm the headline uses.'
        : p === 19.1 ? 'bundled taps add <b>backbtn and fwdbtn</b>, 19.1% of plays. that share is not stable across the 2023-10 logger change: 11.8% before, 22.7% after. the strict set is the one that holds.'
        : 'the log has no cut here. it has two: the strict set and the bundled set.';
      out.innerHTML = m + ' <em>queued plays are 80.2% either way. 0.5% are ambiguous and left out.</em>';
    };
    rg.addEventListener('input', draw); draw();
  }

  /* 2. the bridge index as a direction: a sign and an interval, never a size */
  var br = d.getElementById('xp-bridge');
  if (br) {
    var S = [
      ['holds under', 'the headline', 1.03, 1.08, 'u', 'the interval sits above 1: the deliberate steps cross more.'],
      ['holds under', 'before the 2023-09 changepoint', 1.022, 1.100, 'u', 'the interval sits above 1 before the logging changepoint.'],
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
