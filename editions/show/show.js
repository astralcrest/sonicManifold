(function () {
  var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vs = [].slice.call(document.querySelectorAll('video'));
  var wl = document.getElementById('wl'), pb = document.getElementById('wl-play'), fs = document.getElementById('wl-fs');
  var userPaused = rm;
  function go(v) { if (v.preload !== 'auto') v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (!(v === wl && userPaused) && !rm) go(v); }
        else v.pause();
      });
    }, { rootMargin: '120px', threshold: 0.15 });
    vs.forEach(function (v) { io.observe(v); });
  } else if (!rm) { vs.forEach(go); }
  // the button names what a tap will do to the video as it is now, so a refused autoplay still reads "play"
  function label() { if (pb && wl) { var on = !wl.paused && !userPaused; pb.textContent = on ? 'pause' : 'play'; pb.setAttribute('aria-pressed', String(on)); } }
  label();
  if (pb && wl) {
    pb.addEventListener('click', function () { if (wl.paused) { userPaused = false; go(wl); } else { userPaused = true; wl.pause(); } label(); });
    ['play', 'playing', 'pause', 'ended'].forEach(function (ev) { wl.addEventListener(ev, label); });
  }
  if (fs && wl) {
    var can = wl.requestFullscreen || wl.webkitRequestFullscreen || wl.webkitEnterFullscreen;
    if (!can) fs.hidden = true;
    fs.addEventListener('click', function () {
      if (!userPaused) go(wl);
      if (wl.requestFullscreen) wl.requestFullscreen(); else if (wl.webkitRequestFullscreen) wl.webkitRequestFullscreen(); else if (wl.webkitEnterFullscreen) wl.webkitEnterFullscreen();
    });
  }

  /* wall loop: scene captions + scene picker */
  var SCENES = [
    ['1 the count, by who pressed play', 'every dot is an artist, placed by how they sound. a line joins an artist to its three nearest in sound. a dot\'s color is how most of its plays began. a bigger dot is an artist i played more times.'],
    ['2 the sound map, by family', 'every dot is an artist, placed by how they sound. a line joins an artist to its three nearest in sound. color is the genre family. a bigger dot is an artist i played more times.'],
    ['3 the followed-by map, by neighborhood', 'every dot is an artist, placed by what followed what, so artists that follow each other sit close. a line is two artists played back to back. color is the neighborhood: the eight biggest, i to viii by size. a bigger dot is an artist i played more times.'],
    ['4 the ring', 'my most played artists in a circle. every dot is an artist, colored by its family. a line is one play, then the next. mint lines across the inside: my press, the long jumps. thin violet arcs on the rim: auto-play. 19 of every 100 plays were my press; the ring draws about as many lines of each. a bigger dot is an artist i played more times.'],
    ['5 the record', 'the gold squares are my own songs. one at a time, a song lights up the 40 artists nearest it in sound. every other dot is an artist, and a bigger dot is an artist i played more times.']
  ];
  // per-scene keys: colors as the loop draws them (make_wall_loop.py palette); 'more' is a plain note
  var MINT = '#21f6bc', VIO = '#8b6fd6', AMB = '#f5a623', GOLD = '#ffd36b', ICE = '#bcd3ff', MUTE = '#9a90b8';
  var SKEYS = [
    [['dot', MINT, 'my press'], ['dot', VIO, 'auto-play'], ['dot', AMB, 'shuffle']],
    [['dot', '#ff5c7a', 'hip-hop · r&b'], ['dot', '#ff4fa3', 'electronic'], ['dot', '#5fb8ff', 'ambient/lofi'], ['dot', AMB, 'world/desi'], ['dot', '#ff8fd6', 'pop'], ['dot', MUTE, 'other'], ['dot', '#c9c2ff', 'rock/metal'], ['more', '', 'and 7 smaller families']],
    [['line', ICE, 'back to back'], ['dot', '#5fb8ff', 'i'], ['dot', '#ff5c7a', 'ii'], ['dot', GOLD, 'iii'], ['dot', '#b8ec4a', 'iv'], ['dot', '#ff8fd6', 'v'], ['dot', AMB, 'vi'], ['dot', '#c9c2ff', 'vii'], ['dot', '#8fd3b6', 'viii'], ['dot', MUTE, 'the rest']],
    [['line', MINT, 'my press'], ['line', VIO, 'auto-play'], ['dot', '#ff5c7a', 'hip-hop · r&b'], ['dot', '#ff4fa3', 'electronic'], ['dot', '#ffb3c6', 'funk/disco'], ['dot', '#5fb8ff', 'ambient/lofi'], ['more', '', 'and 4 more families']],
    [['sq', GOLD, 'my songs'], ['line', GOLD, 'nearest in sound'], ['more', '', 'other dots: artists, by family']]
  ];
  function glyph(k, c) {
    if (k === 'line') return '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M1 7h12" stroke="' + c + '" stroke-width="2.5" stroke-linecap="round"/></svg>';
    if (k === 'sq') return '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="2" y="2" width="10" height="10" fill="' + c + '"/></svg>';
    return '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="' + c + '"/></svg>';
  }
  var keyEl = document.getElementById('wl-keys');
  function sceneKey(i) {
    if (!keyEl) return;
    keyEl.innerHTML = SKEYS[i].map(function (d) { return '<li>' + (d[0] === 'more' ? '' : glyph(d[0], d[1])) + d[2] + '</li>'; }).join('');
  }
  var IDLE = 'five scenes, 18 seconds each: the count, the sound map, the followed-by map, the ring, the record. press play.';
  var capEl = document.getElementById('wl-line'), scBtns = [].slice.call(document.querySelectorAll('#wl-scenes button'));
  var lastKey = '';
  function sceneOf(t) { return Math.max(0, Math.min(4, Math.floor(t / 18))); }
  function showCap() {
    if (!wl || !capEl) return;
    // a paused frame keeps its own scene's caption and key; only the untouched poster gets the overview
    var i = wl.currentTime > 0 ? sceneOf(wl.currentTime) : -1;
    var key = String(i);
    if (key === lastKey) return;
    lastKey = key;
    capEl.innerHTML = '';
    sceneKey(i < 0 ? 0 : i);
    if (i < 0) { capEl.textContent = IDLE; }
    else {
      var b = document.createElement('b'); b.textContent = SCENES[i][0];
      capEl.appendChild(b); capEl.appendChild(document.createElement('br'));
      capEl.appendChild(document.createTextNode(SCENES[i][1]));
    }
    scBtns.forEach(function (x, k) { x.setAttribute('aria-pressed', String(k === i)); });
  }
  if (wl) {
    ['timeupdate', 'play', 'playing', 'pause', 'ended', 'seeked'].forEach(function (ev) { wl.addEventListener(ev, showCap); });
    showCap();
    scBtns.forEach(function (btn, k) {
      btn.addEventListener('click', function () {
        userPaused = false; label();
        var t = k * 18 + 0.05;
        function seek() { try { wl.currentTime = t; } catch (e) {} }
        if (wl.readyState < 1) { wl.addEventListener('loadedmetadata', seek, { once: true }); } else { seek(); }
        go(wl);
      });
    });
  }
  var keysSrc = document.querySelector('#strip .keys');
  function stripKeys(list) {
    if (!keysSrc) return '';
    return list.map(function (k) { var li = keysSrc.querySelector('li[data-k="' + k + '"]'); return li ? li.outerHTML : ''; }).join('');
  }

  /* picture viewer */
  var figs = [].slice.call(document.querySelectorAll('.page figure')).filter(function (f) { return f.querySelector('img'); });
  var vw, vimg, vstage, vcap, vkeys, vcount, vbtn = {};
  var idx = 0, S = 1, TX = 0, TY = 0, opener = null, isOpen = false;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; }
  function build() {
    vw = el('div', 'vw'); vw.hidden = true;
    vw.setAttribute('role', 'dialog'); vw.setAttribute('aria-modal', 'true'); vw.setAttribute('aria-label', 'picture viewer');
    vstage = el('div', 'vstage'); vimg = el('img', 'vimg'); vimg.alt = ''; vimg.draggable = false; vstage.appendChild(vimg);
    var foot = el('div', 'vfoot'); vcap = el('p', 'vcap'); vkeys = el('ul', 'keys vkeys'); vkeys.setAttribute('aria-label', 'key');
    var bar = el('div', 'vbar'); vcount = el('span', 'vcount');
    bar.appendChild(vcount);
    [['prev', '‹', 'previous picture'], ['next', '›', 'next picture'], ['in', '+', 'zoom in'], ['out', '−', 'zoom out'], ['close', '×', 'close viewer']].forEach(function (d) {
      var b = el('button', '', d[1]); b.type = 'button'; b.setAttribute('aria-label', d[2]); vbtn[d[0]] = b; bar.appendChild(b);
    });
    foot.appendChild(vcap); foot.appendChild(vkeys); foot.appendChild(bar);
    vw.appendChild(vstage); vw.appendChild(foot); document.body.appendChild(vw);
    vbtn.prev.addEventListener('click', function () { step(-1); });
    vbtn.next.addEventListener('click', function () { step(1); });
    vbtn['in'].addEventListener('click', function () { zoomAt(S * 1.5, 0, 0); });
    vbtn.out.addEventListener('click', function () { zoomAt(S / 1.5, 0, 0); });
    vbtn.close.addEventListener('click', close);
    vstage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = vstage.getBoundingClientRect();
      zoomAt(S * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    }, { passive: false });
    gestures();
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function limits() {
    var w = vimg.offsetWidth * S, h = vimg.offsetHeight * S;
    return [Math.max(0, (w - vstage.clientWidth) / 2), Math.max(0, (h - vstage.clientHeight) / 2)];
  }
  function apply() {
    var l = limits(); TX = clamp(TX, -l[0], l[0]); TY = clamp(TY, -l[1], l[1]);
    vimg.style.transform = 'translate(' + TX + 'px,' + TY + 'px) scale(' + S + ')';
    vimg.style.cursor = S > 1 ? 'grab' : 'default';
    vbtn['in'].disabled = S >= 4; vbtn.out.disabled = S <= 1;
  }
  function zoomAt(ns, cx, cy) {
    ns = clamp(ns, 1, 4);
    if (ns < 1.02) ns = 1;
    TX = cx - (cx - TX) * ns / S; TY = cy - (cy - TY) * ns / S; S = ns;
    if (S === 1) { TX = 0; TY = 0; }
    apply();
  }
  function srcOf(f) { var a = f.querySelector('a.big'); return a ? a.getAttribute('href') : f.querySelector('img').getAttribute('src'); }
  function show(i) {
    idx = (i + figs.length) % figs.length;
    var f = figs[idx], im = f.querySelector('img');
    S = 1; TX = 0; TY = 0; apply();
    vimg.src = srcOf(f); vimg.alt = im.alt || '';
    var c = f.querySelector('figcaption'); vcap.textContent = c ? c.textContent : (im.alt || '');
    vcount.textContent = (idx + 1) + ' of ' + figs.length;
    // a key only where the picture is drawn in those colors; pictures with their own key or labels get none
    var vk = (f.getAttribute('data-vkey') || '').split(',').filter(Boolean), kh = stripKeys(vk);
    vkeys.hidden = !kh; vkeys.innerHTML = kh;
    [-1, 1].forEach(function (d) { var n = figs[(idx + d + figs.length) % figs.length]; new Image().src = srcOf(n); });
  }
  function step(d) { show(idx + d); }
  function open(i) {
    if (!vw) build();
    opener = document.activeElement;
    isOpen = true; vw.hidden = false;
    document.documentElement.classList.add('vlock'); document.body.classList.add('vlock');
    show(i);
    vbtn.close.focus();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false; vw.hidden = true;
    document.documentElement.classList.remove('vlock'); document.body.classList.remove('vlock');
    var b = figs[idx].querySelector('.ob') || opener;
    if (b && b.focus) b.focus();
  }
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === '+' || e.key === '=') { zoomAt(S * 1.5, 0, 0); }
    else if (e.key === '-' || e.key === '_') { zoomAt(S / 1.5, 0, 0); }
    else if (e.key === 'Tab') {
      var bs = [vbtn.prev, vbtn.next, vbtn['in'], vbtn.out, vbtn.close].filter(function (b) { return !b.disabled; });
      var i = bs.indexOf(document.activeElement);
      e.preventDefault();
      if (e.shiftKey) bs[i <= 0 ? bs.length - 1 : i - 1].focus(); else bs[(i + 1) % bs.length].focus();
    }
  });
  function gestures() {
    var P = {}, g = null, lastTap = 0, lastX = 0, lastY = 0;
    function n() { return Object.keys(P).length; }
    function pts() { return Object.keys(P).map(function (k) { return P[k]; }); }
    function rel(x, y) { var r = vstage.getBoundingClientRect(); return [x - r.left - r.width / 2, y - r.top - r.height / 2]; }
    function base(moved) {
      var p = pts(), r;
      if (p.length === 2) {
        var m = rel((p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
        g = { pinch: true, d0: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, s0: S, tx0: TX, ty0: TY, mx: m[0], my: m[1], moved: true };
      } else if (p.length === 1) {
        g = { pinch: false, sx: p[0].x, sy: p[0].y, tx0: TX, ty0: TY, moved: !!moved, target: g && g.target };
      }
    }
    vstage.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      P[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { vstage.setPointerCapture(e.pointerId); } catch (x) {}
      var t = e.target; base(false); if (n() === 1) g.target = t;
    });
    vstage.addEventListener('pointermove', function (e) {
      if (!P[e.pointerId] || !g) return;
      P[e.pointerId] = { x: e.clientX, y: e.clientY };
      var p = pts();
      if (g.pinch && p.length === 2) {
        var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        var ns = clamp(g.s0 * d / g.d0, 1, 4);
        TX = g.mx - (g.mx - g.tx0) * ns / g.s0; TY = g.my - (g.my - g.ty0) * ns / g.s0; S = ns;
        if (S < 1.02) { S = 1; TX = 0; TY = 0; }
        apply();
      } else if (!g.pinch) {
        var dx = e.clientX - g.sx, dy = e.clientY - g.sy;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
        lastX = dx; lastY = dy;
        if (S > 1) { TX = g.tx0 + dx; TY = g.ty0 + dy; apply(); }
      }
    });
    function up(e) {
      if (!P[e.pointerId]) return;
      var wasG = g; delete P[e.pointerId];
      if (n() > 0) { base(true); return; }
      g = null;
      if (!wasG || wasG.pinch) return;
      var dx = e.clientX - wasG.sx, dy = e.clientY - wasG.sy;
      if (wasG.moved) {
        if (S === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
        return;
      }
      var now = Date.now();
      if (wasG.target === vstage) { close(); return; }
      if (now - lastTap < 320) {
        lastTap = 0;
        if (S > 1) zoomAt(1, 0, 0); else { var c = rel(e.clientX, e.clientY); zoomAt(2.5, c[0], c[1]); }
      } else lastTap = now;
    }
    vstage.addEventListener('pointerup', up);
    vstage.addEventListener('pointercancel', function (e) { delete P[e.pointerId]; g = null; });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.pic');
    if (!t) return;
    var f = t.closest('figure'), i = figs.indexOf(f);
    if (i < 0) return;
    e.preventDefault();
    open(i);
  });
  window.addEventListener('resize', function () { if (isOpen) apply(); });

  /* live room */
  var room = document.querySelector('.room3d');
  if (room) {
    var cube = room.querySelector('.cube'), W = 0, H = 0, yaw = 0, pitch = 0, small = null;
    var rbtns = [].slice.call(document.querySelectorAll('#room-btns button'));
    var imgs = [].slice.call(room.querySelectorAll('img[data-l]'));
    var lastTouch = -1e9, dragging = false, anim = null, vis = true, curK = -1, last = 0;
    function setSrc() {
      var s = window.innerWidth < 700;
      if (s === small) return; small = s;
      imgs.forEach(function (im) { im.src = s ? im.getAttribute('data-s') : im.getAttribute('data-l'); });
    }
    function paint() { cube.style.transform = 'translateZ(' + (W * 0.3) + 'px) rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)'; }
    function mark() {
      var k = ((Math.round(yaw / 90) % 4) + 4) % 4;
      if (k === curK) return; curK = k;
      rbtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === k)); });
    }
    function size() {
      W = room.clientWidth; H = W * 9 / 16;
      room.style.setProperty('--W', W + 'px'); room.style.setProperty('--H', H + 'px'); room.style.setProperty('--p', (W / 2) + 'px');
      setSrc(); paint();
    }
    size(); mark();
    window.addEventListener('resize', size);
    room.addEventListener('pointerdown', function (e) {
      dragging = true; anim = null; lastTouch = performance.now();
      room._x = e.clientX; room._y = e.clientY;
      try { room.setPointerCapture(e.pointerId); } catch (x) {}
    });
    room.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      yaw -= (e.clientX - room._x) * 0.25;
      pitch = clamp(pitch + (e.clientY - room._y) * 0.1, -12, 12);
      room._x = e.clientX; room._y = e.clientY; lastTouch = performance.now();
      paint(); mark();
    });
    function endDrag() { dragging = false; lastTouch = performance.now(); }
    room.addEventListener('pointerup', endDrag); room.addEventListener('pointercancel', endDrag);
    room.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { turnTo(Math.round(yaw / 90) * 90 - 90); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { turnTo(Math.round(yaw / 90) * 90 + 90); e.preventDefault(); }
    });
    function turnTo(target) {
      lastTouch = performance.now();
      if (rm) { yaw = target; pitch = 0; paint(); mark(); return; }
      anim = { t0: performance.now(), y0: yaw, y1: target, p0: pitch };
      requestAnimationFrame(tick);
    }
    rbtns.forEach(function (b, k) {
      b.addEventListener('click', function () {
        var d = ((k * 90 - yaw) % 360 + 540) % 360 - 180;
        turnTo(yaw + d);
      });
    });
    function tick(now) {
      if (anim) {
        var u = Math.min(1, (now - anim.t0) / 600), e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        yaw = anim.y0 + (anim.y1 - anim.y0) * e; pitch = anim.p0 * (1 - e);
        if (u >= 1) anim = null;
        paint(); mark();
      } else if (!rm && !dragging && vis && now - lastTouch > 8000 && last) {
        yaw += 6 * Math.min(0.1, (now - last) / 1000); paint(); mark();
      }
      last = now;
      if (!rm || anim) requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; last = 0; }, { threshold: 0.05 }).observe(room);
    }
    if (!rm) requestAnimationFrame(tick);
  }
})();
