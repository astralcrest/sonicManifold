/* R19 LABEL: the wall's invite, color key, title slate, credits and statement. exhibit.html?wall=1 only: wallmode.js calls
   default(ctx, window.__wall) once, last of the four wall lanes; with no window.__wall this file does nothing and builds nothing.
   it attaches ctx.wall.card = { show(name), hide(name) } (names: invite, key, slate, credits, statement) and reads, never writes,
   ctx.wall.sound (state, onState), ctx.wall.reset (lastInput, now) and ctx.wall.out (qr). each of those may be missing: the
   invite then follows its own trusted-input clock, the slate waits on that clock, and a slate with no code prints the address.
   every string is in wallcopy.js, every rule in wallcard.css. nothing here sits inside the stage or over a room's own words:
   the dock finds the free band outside the stage (top or foot), the widest gap in it, and yields to anything that moves in. */
const V = new URL(import.meta.url).search || '';
const SHEET = new URL('./wallcard.css' + V, import.meta.url).href;

export default function wallCard(ctx, wall) {
  wall = wall || window.__wall;
  if (!wall || !ctx) return null;
  if (!ctx.wall || typeof ctx.wall !== 'object') ctx.wall = {};
  /* the guard lives on ctx.wall, not in this module: a second copy of the file (another ?v= stamp, a bare import) must not build a second card */
  if (!ctx.wall.cardBoot) {
    /* a caller that reaches for ctx.wall.card before wallcopy.js has loaded is queued, then replayed on the real one */
    const q = [];
    ctx.wall.card = { show: (n) => { q.push(['show', n]); return true; }, hide: (n) => { q.push(['hide', n]); return true; } };
    const boot = import('./wallcopy.js' + V).then((C) => { const api = build(ctx, wall, C); q.forEach(([f, n]) => api[f](n)); return api; });
    Object.defineProperty(ctx.wall, 'cardBoot', { value: boot, enumerable: false });
  }
  return ctx.wall.cardBoot;
}

function build(ctx, wall, C) {
  const doc = document, de = doc.documentElement, O = wall.opts || {}, T = C.TIMING;
  const FL = Object.assign({}, C.FLAGS, { plays: O.plays || 'all' });
  if (!de.classList.contains('wallmode')) de.classList.add('wallmode');
  const oneOf = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  const attract = oneOf(O.attract, ['line', 'slate', 'off'], 'line');
  const posts = oneOf(O.posts, ['qr', 'spotify', 'off'], 'qr');
  const handMs = Math.min(600, Math.max(5, +O.handsoff || 45)) * 1000;
  const now = () => performance.now();
  const hex = (n, d) => '#' + ((n == null ? d : n) >>> 0).toString(16).padStart(6, '0');
  const PAL = ctx.PAL || {};
  const COL = { tap: hex(PAL.tap, 0x21f6bc), shuffle: hex(PAL.shuffle, 0xf5a623), violet: hex(PAL.violet, 0x8b6fd6), rose: hex(PAL.rose, 0xff6e9c), ice: hex(PAL.ice, 0x86cbfe) };
  const rgba = (h, a) => 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
  const el = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* the stylesheet: wallboot links it for the real wall; a page that has not (a lane test, a bare import) gets it from here */
  let link = doc.querySelector('link[data-wall-sheet="wallcard"]');
  if (!link) { link = el('link'); link.rel = 'stylesheet'; link.href = SHEET; link.setAttribute('data-wall-sheet', 'wallcard'); doc.head.appendChild(link); }
  const sheetReady = link.sheet ? Promise.resolve() : new Promise((res) => { link.addEventListener('load', res, { once: true }); link.addEventListener('error', res, { once: true }); setTimeout(res, 2500); });

  /* ------------------------------------------------------------ state */
  const S = { sound: 'locked', handAt: 0, lastTrusted: 0, armed: false, force: { invite: null, key: null }, sheet: null, hold: false, place: null,
    moving: false, yielding: false, yieldAt: 0, improve: 0, fit: 'none', soundSub: false, wrapK: null, wrapId: null };
  const sound = () => (ctx.wall && ctx.wall.sound) || null;
  const reset = () => (ctx.wall && ctx.wall.reset) || null;
  const out = () => (ctx.wall && ctx.wall.out) || null;
  const soundMode = () => (sound() && sound().mode) || O.sound || 'touch';
  const readSound = () => {
    const s = sound();
    if (s && typeof s.state === 'function') { try { const v = s.state(); if (v === 'locked' || v === 'on' || v === 'dozed' || v === 'off') return v; } catch (e) {} }
    if (O.sound === 'off') return 'off';
    const A = ctx.audio;
    return A && A.on && A.ac && A.ac.state === 'running' ? 'on' : 'locked';
  };
  const roomId = () => { const X = window.__exhibit, r = X && X.rooms && X.rooms[ctx.index]; return r ? r.id : ''; };
  const GENRE_ROOMS = { universe: 1 };
  const isGenre = () => !!GENRE_ROOMS[roomId()];

  /* ------------------------------------------------------------ the dock: an invite pill and a key pill */
  const root = el('div'); root.id = 'wallcard'; root.setAttribute('data-wc', '1');
  let inv = null, invText = null, key = null, pInv = null, pInvText = null, pKey = null;
  const keyItems = (list, genre) => {
    if (genre) return [el('li', null, C.KEY.genre)];
    return list.map(([k, t]) => { const li = el('li'), sw = el('i', 'wc-sw'); sw.style.setProperty('--c', COL[k]); sw.setAttribute('data-k', k); sw.setAttribute('aria-hidden', 'true'); li.append(sw, el('span', null, t)); return li; });
  };
  const fillKey = (ul, mode) => { ul.replaceChildren(...keyItems(mode === 'compact' ? C.KEY.compact : C.KEY.full, mode === 'genre')); ul.classList.toggle('wc-genre', mode === 'genre'); ul.setAttribute('data-mode', mode); };
  const mkInvite = (cls) => { const p = el('p', 'wc-pill wc-invite' + (cls || '')), r = el('i', 'wc-ring'); r.setAttribute('aria-hidden', 'true'); const t = el('span', 'wc-text'); p.append(r, t); return [p, t]; };
  function ensureDock() {
    if (inv) return;
    [inv, invText] = mkInvite(); inv.setAttribute('data-part', 'invite'); inv.setAttribute('role', 'note');
    key = el('ul', 'wc-pill wc-key'); key.setAttribute('data-part', 'key'); key.setAttribute('aria-label', C.KEY.label); fillKey(key, 'full');
    [pInv, pInvText] = mkInvite(' wc-probe'); pKey = el('ul', 'wc-pill wc-key wc-probe');
    [pInv, pKey].forEach((p) => { p.style.visibility = 'hidden'; p.style.animation = 'none'; p.setAttribute('aria-hidden', 'true'); });
    root.append(inv, key, pInv, pKey);
  }
  const mc = new Map();
  let fontsKey = 0;
  const measure = (probe, put, id) => {
    const k = innerWidth + 'x' + innerHeight + '|' + fontsKey + '|' + id;
    let d = mc.get(k);
    if (!d) { put(); const b = probe.getBoundingClientRect(); d = { w: Math.ceil(b.width), h: Math.ceil(b.height) }; mc.set(k, d); }
    return d;
  };
  const dimInvite = (text) => measure(pInv, () => { pInvText.textContent = text; }, 'i|' + text);
  const dimKey = (mode) => measure(pKey, () => fillKey(pKey, mode), 'k|' + mode);

  /* ------------------------------------------------------------ obstacles: every box the dock must stay clear of */
  const seeable = (e) => (e.checkVisibility ? e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : (() => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; })());
  const SKIP = { atlas: 1, 'atlas-stage': 1, 'atlas-labels': 1, 'atlas-footground': 1, neb: 1, ink: 1, field: 1, glow: 1, overlay: 1 };
  const KNOWN = '#top,#atlas-info,#atlas-onboard,#atlas-toast,#atlas-dock,#ai-liner,.atlas-ladder,.atlas-ladder-chip,.uf-ks,#ink-key,#atlas-coach,#exdock,#atlas-show,#atlas-note,#sm-cut,#needle-veil';
  function chromeRects(into, withOnboard) {
    const vw = innerWidth, vh = innerHeight, seen = new Set();
    const add = (e) => {
      if (seen.has(e) || e === root || root.contains(e)) return;
      seen.add(e);
      if (e.id === 'atlas-onboard' && !withOnboard) return;
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.05) return;
      const b = e.getBoundingClientRect();
      if (b.width < 2 || b.height < 2 || (b.width >= vw * 0.95 && b.height >= vh * 0.95)) return;
      into.push({ l: b.left, t: b.top, r: b.right, b: b.bottom, who: e.id || String(e.className && e.className.baseVal === undefined ? e.className : '').split(' ')[0] || e.tagName });
    };
    for (const e of doc.body.children) {
      const tag = e.tagName;
      if (tag === 'CANVAS' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'MAIN' || SKIP[e.id]) continue;
      const p = getComputedStyle(e).position;
      if (p === 'fixed' || p === 'absolute') add(e);
    }
    doc.querySelectorAll(KNOWN).forEach(add);
    const X = window.__exhibit, sg = X && X.sig && X.sig();
    if (sg && sg.on && sg.w) { const fs = sg.w / 19.2; into.push({ l: sg.x, t: sg.y - 1.35 * fs, r: sg.x + sg.w, b: sg.y + 0.5 * fs, who: 'signature' }); }
  }
  /* the room's own words and controls that reach into a band: the real glyph boxes of its text, the border boxes of its controls */
  function contentRects(into, bands) {
    const inBands = (b) => bands.some((bd) => b.bottom > bd.y0 && b.top < bd.y1);
    const lab = doc.getElementById('atlas-labels');
    if (lab) for (const e of lab.children) {
      const b = e.getBoundingClientRect();
      if (b.width && b.height && inBands(b) && seeable(e)) into.push({ l: b.left, t: b.top, r: b.right, b: b.bottom, who: 'label' });
    }
    const sec = doc.querySelector('section[data-room].is-active');
    if (!sec) return;
    const area = innerWidth * innerHeight, rng = doc.createRange(), w = doc.createTreeWalker(sec, NodeFilter.SHOW_ELEMENT);
    let n, count = 0;
    while ((n = w.nextNode()) && count++ < 6000) {
      const ctl = n.matches('button,input,select,textarea,a[href],[data-keepout],[class*="hud"],canvas:not(.layer),img,video,svg');
      let texts = null;
      for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.data.trim()) (texts || (texts = [])).push(c);
      if (!ctl && !texts) continue;
      const b = n.getBoundingClientRect();
      if (!b.width || !b.height || !inBands(b) || !seeable(n)) continue;
      if (b.width <= 2 && b.height <= 2) continue;
      if (texts && /^rect\(0(px)?,? ?0(px)?,? ?0(px)?,? ?0(px)?\)$/.test(getComputedStyle(n).clip)) continue;
      if (ctl) { if (b.width * b.height < area * 0.3) into.push({ l: b.left, t: b.top, r: b.right, b: b.bottom, who: 'room' }); continue; }
      for (const t of texts) {
        rng.selectNodeContents(t);
        for (const r of rng.getClientRects()) if (r.width > 1 && r.height > 1 && inBands(r)) into.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, who: 'room' });
      }
    }
  }
  const hits = (a, o, m) => a.l < o.r + m && a.r > o.l - m && a.t < o.b + m && a.b > o.t - m;

  /* ------------------------------------------------------------ placement */
  const GAP = () => Math.max(2, Math.round(innerHeight * 0.0035));
  const clear = () => Math.max(8, Math.round(innerHeight * 0.014));
  function free(obs, ya, yb, l, r, m) {
    const hit = obs.filter((o) => o.b + m > ya && o.t - m < yb).sort((a, b) => a.l - b.l), res = [];
    let x = l;
    for (const o of hit) { const ol = o.l - m, or = o.r + m; if (or <= x) continue; if (ol > x) res.push([x, Math.min(ol, r)]); x = Math.max(x, or); if (x >= r) break; }
    if (x < r) res.push([x, r]);
    return res.filter(([a, b]) => b - a > 1);
  }
  const barLow = () => { const t = doc.getElementById('top'); if (!t) return true; const b = t.getBoundingClientRect(); return b.top + b.height / 2 > innerHeight / 2; };
  /* the best arrangement that fits: both pills stacked in one band, then each in its own free gap, then the invite alone, then the
     key alone; within a step the longest invite and the fullest key first. rank orders the whole list (lower is better) */
  function search() {
    const vw = innerWidth, vh = innerHeight, s = ctx.stage ? ctx.stage() : null;
    if (!s || !(s.h > 0)) return null;
    const m = clear(), padX = Math.max(16, Math.round(vw * 0.014)), gap = GAP();
    const top = { id: 'top', y0: 0, y1: s.y }, foot = { id: 'foot', y0: s.y + s.h, y1: vh };
    const bands = barLow() ? [top, foot] : [foot, top];
    const obs = []; chromeRects(obs, false); contentRects(obs, bands);
    const variants = C.inviteVariants(S.sound, FL), keyModes = isGenre() ? ['genre'] : ['full', 'compact'];
    const fit = (w, h, extra) => {
      const all = extra ? obs.concat(extra) : obs;
      for (const bd of bands) {
        const bh = bd.y1 - bd.y0;
        if (bh < h + 2) continue;
        for (const ya of [bd.y0 + (bh - h) / 2, bd.y0 + 2, bd.y1 - 2 - h]) {
          const iv = free(all, ya, ya + h, padX, vw - padX, m).filter(([a, b]) => b - a >= w);
          if (!iv.length) continue;
          let best = null, bestD = 1e9;
          for (const [a, b] of iv) { const cx = Math.min(Math.max(vw / 2, a + w / 2), b - w / 2), d = Math.abs(cx - vw / 2); if (d < bestD) { bestD = d; best = cx; } }
          return { band: bd.id, y: Math.round(ya), cx: Math.round(best) };
        }
      }
      return null;
    };
    const R = (p, o) => ({ l: p.cx - o.w / 2, r: p.cx + o.w / 2, t: p.y, b: p.y + o.h });
    const part = (p, o, extra) => Object.assign({ y: p.y, cx: p.cx, w: o.w, h: o.h, band: p.band }, extra);
    const nk = keyModes.length;
    for (let vi = 0; vi < variants.length; vi++) {
      const di = dimInvite(variants[vi]);
      for (let ki = 0; ki < nk; ki++) {
        const dk = dimKey(keyModes[ki]), st = fit(Math.max(di.w, dk.w), di.h + gap + dk.h);
        if (st) return { band: st.band, rank: vi * 4 + ki, state: S.sound, inv: part(st, di, { text: variants[vi], vi }), key: part({ y: st.y + di.h + gap, cx: st.cx, band: st.band }, dk, { mode: keyModes[ki], ki }) };
      }
      const pi = fit(di.w, di.h);
      if (!pi) continue;
      for (let ki = 0; ki < nk; ki++) {
        const dk = dimKey(keyModes[ki]), pk = fit(dk.w, dk.h, [R(pi, di)]);
        if (pk) return { band: pi.band + (pk.band !== pi.band ? '+' + pk.band : ''), rank: vi * 4 + 2 + ki, state: S.sound, inv: part(pi, di, { text: variants[vi], vi }), key: part(pk, dk, { mode: keyModes[ki], ki }) };
      }
    }
    for (let vi = 0; vi < variants.length; vi++) {
      const di = dimInvite(variants[vi]), pi = fit(di.w, di.h);
      if (pi) return { band: pi.band, rank: 50 + vi, state: S.sound, inv: part(pi, di, { text: variants[vi], vi }), key: null };
    }
    for (let ki = 0; ki < nk; ki++) {
      const dk = dimKey(keyModes[ki]), pk = fit(dk.w, dk.h);
      if (pk) return { band: pk.band, rank: 100 + ki, state: S.sound, inv: null, key: part(pk, dk, { mode: keyModes[ki], ki }) };
    }
    return null;
  }
  const rectsOf = (p) => [p.inv, p.key].filter(Boolean).map((o) => ({ l: o.cx - o.w / 2, r: o.cx + o.w / 2, t: o.y, b: o.y + o.h }));
  function stillClear(p) {
    const s = ctx.stage ? ctx.stage() : null, m = Math.max(4, clear() - 4);
    if (!s || !p) return false;
    const bands = [{ y0: 0, y1: s.y }, { y0: s.y + s.h, y1: innerHeight }], obs = [];
    chromeRects(obs, false); contentRects(obs, bands);
    return rectsOf(p).every((r) => r.l >= 0 && r.r <= innerWidth && r.t >= 0 && r.b <= innerHeight && !obs.some((o) => hits(r, o, m)));
  }
  const setXY = (e, o) => { e.style.setProperty('--wc-x', Math.round(o.cx - o.w / 2) + 'px'); e.style.setProperty('--wc-y', o.y + 'px'); };
  let moveT = 0;
  function apply(p) {
    ensureDock();
    const was = S.place; S.place = p; S.improve = 0; S.fit = p ? p.band : 'none';
    const write = () => {
      S.moving = false;
      if (p && p.inv) { invText.textContent = p.inv.text; inv.setAttribute('data-state', p.state); setXY(inv, p.inv); }
      if (p && p.key) { if (key.getAttribute('data-mode') !== p.key.mode) fillKey(key, p.key.mode); setXY(key, p.key); }
      refresh();
    };
    clearTimeout(moveT);
    if (was && wantsAny()) { S.moving = true; refresh(); moveT = setTimeout(write, 330); } else write();
  }
  function layout(force) {
    if (!inv || S.sheet || (attract === 'off' && !force)) return;
    const cand = search(), cur = S.place;
    if (!cand) { if (cur) apply(null); return; }
    if (!cur) return apply(cand);
    if (cur.state !== S.sound || (cur.key && (cur.key.mode === 'genre') !== isGenre()) || !stillClear(cur)) return apply(cand);
    if (cand.rank < cur.rank) { if (++S.improve >= 3) apply(cand); } else S.improve = 0;
  }

  /* ------------------------------------------------------------ what shows when */
  function handPresent() {
    if (!S.handAt) return false;
    const age = now() - S.handAt;
    /* in touch mode the sound's own doze comes at handsoff; the invite waits that long for it so both change together */
    return age < handMs + (soundMode() === 'touch' && S.sound === 'on' ? 4000 : 0);
  }
  const wantInvite = () => (S.force.invite != null ? S.force.invite : attract !== 'off' && !S.sheet && !handPresent());
  const wantKey = () => (S.force.key != null ? S.force.key : (attract !== 'off' || FL.keyWhenOff) && !S.sheet);
  const wantsAny = () => wantInvite() || wantKey();
  function refresh() {
    if (!inv) return;
    const p = S.place, ok = !!p && !S.moving && !S.yielding;
    inv.setAttribute('data-on', ok && p.inv && wantInvite() ? '1' : '0');
    key.setAttribute('data-on', ok && p.key && wantKey() ? '1' : '0');
    de.classList.toggle('wc-inviting', !!p && !!p.inv && (S.force.invite != null ? S.force.invite : attract !== 'off'));
  }
  function yieldCheck() {
    if (!inv || !S.place) return;
    const obs = []; chromeRects(obs, !de.classList.contains('wc-inviting'));
    const m = Math.max(2, Math.round(innerHeight * 0.004)), bad = rectsOf(S.place).some((r) => obs.some((o) => hits(r, o, m)));
    if (bad && !S.yielding) { S.yielding = true; S.yieldAt = now(); inv.setAttribute('data-yield', '1'); key.setAttribute('data-yield', '1'); refresh(); }
    else if (!bad && S.yielding) { S.yielding = false; inv.removeAttribute('data-yield'); key.removeAttribute('data-yield'); refresh(); }
    if (S.yielding && now() - S.yieldAt > 1200) layout(true);
  }

  /* ------------------------------------------------------------ the hand */
  function onHand(e) {
    if (e.isTrusted === false) return;
    S.handAt = S.lastTrusted = now(); S.armed = true;
    if (S.sheet && !S.hold) hideSheet(S.sheet);
    refresh();
  }
  const onMove = (e) => { if (e.isTrusted !== false && (e.buttons || e.pointerType === 'touch')) { S.lastTrusted = now(); if (S.handAt) S.handAt = S.lastTrusted; } };
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((t) => addEventListener(t, onHand, { capture: true, passive: true }));
  addEventListener('pointermove', onMove, { capture: true, passive: true });
  function onSound(s) {
    const prev = S.sound; S.sound = s;
    if (s === 'dozed' || (s === 'locked' && prev !== 'locked')) S.handAt = 0;
    layout(true); refresh();
  }
  function hookSound() {
    const s = sound();
    if (S.soundSub || !s || typeof s.onState !== 'function') return;
    S.soundSub = true;
    try { s.onState(onSound); } catch (e) {}
    const v = readSound(); if (v !== S.sound) onSound(v);
  }

  /* ------------------------------------------------------------ sheets: title slate, credits, statement */
  const um = () => Math.min(innerWidth / 100, (innerHeight * 1.77778) / 100);
  /* STATEMENT K4: the code sits at a whole number of device pixels per module. qr.js floors to whole css pixels, which at 2.6667 dpr is
     5.33 device pixels and blurs every module edge; the viewBox lets the svg take any css size, so it takes the largest whole-device-pixel
     size inside QR.units percent of the sheet's width */
  function pixelFit(svg) {
    const mods = +String(svg.getAttribute('viewBox') || '').split(/\s+/)[2];
    if (!(mods > 0)) return;
    const dpr = window.devicePixelRatio || 1, k = Math.max(1, Math.floor((um() * C.QR.units * dpr) / mods)), px = (mods * k) / dpr;
    svg.setAttribute('width', String(px)); svg.setAttribute('height', String(px));
  }
  function qrBox() {
    const q = C.qrFor(FL), box = el('div', 'wc-qrbox'), tile = el('div', 'wc-qrtile'), txt = el('div');
    const draw = () => {
      const o = out(); if (!o || typeof o.qr !== 'function') return false;
      let svg = null;
      try { svg = o.qr(q.url, { size: Math.floor(um() * C.QR.units), label: C.QR.label }); } catch (e) { svg = null; }
      if (!svg || svg.nodeType !== 1) return false;
      pixelFit(svg);
      tile.replaceChildren(svg); tile.hidden = false; return true;
    };
    /* a sheet built before the outside lane has mounted prints the address, then draws the code the moment qr() exists */
    if (!draw()) { tile.hidden = true; (S.lateQr || (S.lateQr = [])).push({ box, draw }); }
    txt.append(el('p', 'wc-qrcap', q.caption), el('p', 'wc-qrurl', q.typed));
    box.append(tile, txt);
    return box;
  }
  function topUpQr() {
    S.lateQr = S.lateQr.filter((x) => x.box.isConnected && !x.draw());
  }
  const sentences = (t) => t.split(/(?<=\.)\s+/);
  function keyRowFull() {
    const ul = el('ul', 'wc-keyfull'); ul.setAttribute('aria-label', C.KEY.label);
    keyItems(C.KEY.full).forEach((li) => { li.firstChild.className = ''; ul.appendChild(li); });
    return ul;
  }
  function slateSheet() {
    const SL = C.SLATE, sec = el('section', 'wc-sheet wc-slate'), fr = el('div', 'wc-frame'), inn = el('div', 'wc-in'), L = el('div', 'wc-l'), R = el('div', 'wc-r');
    const big = el('p', 'wc-bigline'); sentences(C.inviteVariants(S.sound, FL)[0]).forEach((s) => big.appendChild(el('span', null, s)));
    L.append(el('p', 'wc-k', SL.kicker), el('h2', 'wc-h', SL.title), el('p', 'wc-by', SL.by), el('p', 'wc-thesis', SL.thesis), big);
    const wf = el('div', 'wc-waffle'); wf.setAttribute('role', 'img');
    wf.setAttribute('aria-label', SL.splitHead + ': ' + SL.split.map((r) => r[0] + ' ' + r[3]).join(', '));
    let idx = 0;
    SL.split.forEach(([n, k, g]) => { for (let j = 0; j < +n; j++, idx++) { const c = el('span'), gi = el('i', null, g); c.style.setProperty('--c', COL[k]); c.style.setProperty('--b', rgba(COL[k], k === 'violet' ? 0.17 : 0.14)); c.style.setProperty('--i', idx); c.appendChild(gi); wf.appendChild(c); } });
    const split = el('ul', 'wc-split');
    SL.split.forEach(([n, k, g, t]) => { const li = el('li'), b = el('b', null, n); b.style.setProperty('--c', COL[k]); li.append(b, el('span', null, g + ' ' + t)); split.appendChild(li); });
    R.append(el('p', 'wc-kh', SL.splitHead), wf, split);
    const foot = el('div', 'wc-foot'), kr = el('p', 'wc-keyrow');
    [[SL.keyRose, 'rose'], [SL.keyIce, 'ice']].forEach(([t, k]) => { const s = el('span'), i = el('i'); i.style.setProperty('--c', COL[k]); s.append(i, doc.createTextNode(t)); kr.appendChild(s); });
    kr.appendChild(el('span', null, SL.keyUniverse));
    foot.append(kr, qrBox());
    inn.append(L, R, foot); fr.appendChild(inn); sec.appendChild(fr);
    return sec;
  }
  function creditsSheet() {
    const sec = el('section', 'wc-sheet wc-credits'), fr = el('div', 'wc-frame'), inn = el('div', 'wc-in'), L = el('div', 'wc-l'), R = el('div', 'wc-r');
    const TB = C.TOMBSTONE;
    L.append(el('p', 'wc-k', TB.artist + ' · ' + TB.year), el('h2', 'wc-h', TB.title), el('p', 'wc-medium', C.mediumLine(FL)), el('p', 'wc-dim', C.dimensionsLine(FL) + ' · ' + TB.credit));
    if (FL.epigraph) L.appendChild(el('p', 'wc-epi', String(FL.epigraph)));
    L.appendChild(keyRowFull());
    const dl = el('dl', 'wc-rows');
    C.creditRows(posts, FL).forEach(([h, t]) => { dl.append(el('dt', null, h), el('dd', null, t)); });
    const hon = el('p', 'wc-honest'); hon.append(el('span', null, C.HONESTY.ledger), el('span', null, C.HONESTY.n1));
    L.appendChild(hon);
    R.append(dl);
    const foot = el('div', 'wc-foot'); foot.append(el('p', 'wc-sig', C.SIGNATURE), qrBox());
    inn.append(L, R, foot); fr.appendChild(inn); sec.appendChild(fr);
    return sec;
  }
  function statementSheet() {
    const sec = el('section', 'wc-sheet wc-statement'), fr = el('div', 'wc-frame'), inn = el('div', 'wc-in wc-sin'), p = el('p', 'wc-stmt');
    const txt = C.statement(FL), i = txt.indexOf(C.KILL_LINE);
    if (i < 0) p.textContent = txt; else p.append(doc.createTextNode(txt.slice(0, i)), el('span', 'wc-kill', C.KILL_LINE), doc.createTextNode(txt.slice(i + C.KILL_LINE.length)));
    const foot = el('div', 'wc-foot'); foot.append(el('p', 'wc-sig', C.SIGNATURE), keyRowFull());
    inn.append(el('p', 'wc-k', C.TOMBSTONE.artist + ' · ' + C.TOMBSTONE.title), p, foot); fr.appendChild(inn); sec.appendChild(fr);
    return sec;
  }
  const BUILD = { slate: slateSheet, credits: creditsSheet, statement: statementSheet };
  let sheetEl = null, sheetT = 0, sheetGone = 0;
  function showSheet(name, why, hold) {
    if (!BUILD[name]) return false;
    clearTimeout(sheetT); clearTimeout(sheetGone);
    if (sheetEl) { sheetEl.remove(); sheetEl = null; }
    sheetEl = BUILD[name](); sheetEl.setAttribute('data-name', name); sheetEl.setAttribute('role', 'region'); sheetEl.setAttribute('aria-label', C.TOMBSTONE.title); if (why) sheetEl.setAttribute('data-why', why);
    root.appendChild(sheetEl);
    S.sheet = name; S.hold = !!hold; refresh();
    void sheetEl.offsetWidth;
    sheetEl.setAttribute('data-on', '1');
    if (name === 'slate' && !hold) sheetT = setTimeout(() => hideSheet('slate'), T.slateMs);
    return true;
  }
  function hideSheet(name) {
    if (!sheetEl || S.sheet !== name) return false;
    const e = sheetEl; S.sheet = null; S.hold = false; clearTimeout(sheetT);
    e.setAttribute('data-on', '0'); refresh(); layout(true);
    sheetGone = setTimeout(() => { e.remove(); if (sheetEl === e) sheetEl = null; }, T.slateFadeMs + 200);
    return true;
  }

  /* ------------------------------------------------------------ the public face */
  const api = {
    show(name) {
      if (name === 'invite' || name === 'key') { ensureDock(); S.force[name] = true; if (!S.place) layout(true); refresh(); return true; }
      return showSheet(name, 'api', true);
    },
    hide(name) {
      if (name === 'invite' || name === 'key') { S.force[name] = false; refresh(); return true; }
      return hideSheet(name);
    },
  };
  const hidden = (name, value) => Object.defineProperty(api, name, { enumerable: false, value });
  hidden('info', () => ({ state: S.sound, mode: soundMode(), attract, posts, hand: handPresent(), sheet: S.sheet, fit: S.fit, moving: S.moving, yielding: S.yielding, invite: wantInvite(), key: wantKey(),
    place: S.place && { band: S.place.band, rank: S.place.rank, inv: S.place.inv && { text: S.place.inv.text, vi: S.place.inv.vi, cx: S.place.inv.cx, y: S.place.inv.y, w: S.place.inv.w, h: S.place.inv.h },
      key: S.place.key && { mode: S.place.key.mode, ki: S.place.key.ki, cx: S.place.key.cx, y: S.place.key.y, w: S.place.key.w, h: S.place.key.h } } }));
  hidden('relayout', () => { mc.clear(); layout(true); });
  hidden('debug', () => {
    const s = ctx.stage(), bands = [{ id: 'top', y0: 0, y1: s.y }, { id: 'foot', y0: s.y + s.h, y1: innerHeight }], obs = [];
    chromeRects(obs, false); contentRects(obs, bands);
    return { stage: s, bands, obs: obs.map((o) => [o.who, Math.round(o.l), Math.round(o.t), Math.round(o.r), Math.round(o.b)]) };
  });
  hidden('drift', () => ({ dx: root.style.getPropertyValue('--wc-dx'), dy: root.style.getPropertyValue('--wc-dy') }));

  /* ------------------------------------------------------------ boot */
  ctx.wall.card = api;
  doc.body.appendChild(root);
  S.sound = readSound();
  hookSound();
  if (ctx.onStop) try { ctx.onStop(() => { clearTimeout(S.stopT); S.stopT = setTimeout(() => layout(true), 700); }); } catch (e) {}
  if (ctx.tour && typeof ctx.tour.onChange === 'function') {
    try {
      ctx.tour.onChange((a) => {
        if (!a) return;
        const wrap = S.wrapId === a.id && a.playing && S.wrapK != null && a.n > 1 && S.wrapK === a.n - 1 && a.k === 0;
        S.wrapId = a.id; S.wrapK = a.k;
        if (wrap && attract === 'slate' && !S.sheet) showSheet('slate', 'wrap', false);
      });
    } catch (e) {}
  }
  try { wall.onReset && wall.onReset(() => { clearTimeout(sheetT); if (sheetEl) { sheetEl.remove(); sheetEl = null; } S.sheet = null; S.hold = false; S.handAt = 0; S.armed = false; S.force.invite = S.force.key = null; layout(true); refresh(); }); } catch (e) {}
  addEventListener('resize', () => { mc.clear(); clearTimeout(S.resizeT); S.resizeT = setTimeout(() => layout(true), 250); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { fontsKey = 1; mc.clear(); layout(true); }).catch(() => {});

  /* burn-in courtesy: the two pills are statics, so they wander a few pixels an hour (2 to 3 px a minute at the fastest) inside the
     margin the search leaves. drift=off (a projection) keeps them still */
  let phase = Math.random() * 6.28;
  const driftStep = () => {
    phase += 0.35;
    root.style.setProperty('--wc-dx', (Math.round(Math.sin(phase) * 6) / 2) + 'px');
    root.style.setProperty('--wc-dy', (Math.round(Math.sin(phase * 0.7 + 1) * 4) / 2) + 'px');
  };
  if (O.drift !== 'off') { driftStep(); setInterval(driftStep, 20000); }

  /* the reset lane's clock is the one the wall obeys; my own last trusted input counts too, so a lagging clock never raises the slate over a hand */
  const idleMs = () => {
    const r = reset(), own = S.lastTrusted ? now() - S.lastTrusted : Infinity;
    let d = Infinity;
    if (r && typeof r.now === 'function' && typeof r.lastInput === 'function') { try { const v = r.now() - r.lastInput(); if (isFinite(v) && v >= 0) d = v; } catch (e) {} }
    const m = Math.min(d, own);
    return isFinite(m) ? m : 0;
  };
  let ticks = 0;
  setInterval(() => {
    if (doc.hidden) return;
    ticks++;
    hookSound();
    if (S.lateQr && S.lateQr.length) topUpQr();
    if (ticks % 4 === 0) { const s = readSound(); if (s !== S.sound) onSound(s); }
    if (S.handAt && !handPresent()) { S.handAt = 0; refresh(); }
    if (inv) { if (ticks % 2 === 0) yieldCheck(); if (ticks % 6 === 0 && !S.yielding) layout(false); }
    if (attract === 'slate' && !S.sheet && S.armed && idleMs() >= handMs) { S.armed = false; showSheet('slate', 'idle', false); }
  }, 250);

  sheetReady.then(() => {
    if (attract !== 'off' || FL.keyWhenOff) { ensureDock(); layout(true); }
    if (attract === 'slate') setTimeout(() => { if (!S.sheet && !S.handAt) showSheet('slate', 'boot', false); }, 1200);
  });
  return api;
}
