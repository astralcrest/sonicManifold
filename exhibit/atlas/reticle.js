/* R5 L3 phone hover: a fixed sight the field moves under (API: R5/L3/API.md) */
const HIDE = new Set(['threshold', 'game', 'bail', 'loop']), GAP = 45, R_LAB = 26, BW = 168, RS = 22, RH = 20; /* BW: reticle.css */
const KO = '#top>*,#dots,#exdock,#atlas-dock,#atlas-info,#ai-caption,#ai-hud,.atlas-ladder-chip,.atlas-panel,section.is-active .wall,.is-active [data-keepout]';
const CP = { capture: true, passive: true }, now = () => performance.now();

export function install(ctx, view, G) {
  const doc = document, A = ctx.audio, el = doc.createElement('div'), S0 = G.stage, css = doc.createElement('link');
  el.className = 'atlas-sight'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<b></b><i></i><i></i><i></i><i></i><u></u><s></s>';
  el.hidden = true; css.rel = 'stylesheet'; css.href = new URL('reticle.css' + new URL(import.meta.url).search, import.meta.url).href;
  css.onload = () => { el.hidden = false; }; doc.head.appendChild(css);
  (S0 ? S0.parentNode : doc.body).insertBefore(el, S0 ? S0.nextSibling : null);
  const rd = el.querySelector('s'), ring = el.querySelector('b');
  let on = false, X = 0, Y = 0, cur = null, key = null, hush = false, armed = '', hand = -1e9, /* the visitor's last drag: a pill waits for one */ lastS = 0, raf = 0, ko = [], koAt = 0, lit = null, watch = 0, n = 0, why = '';
  const room = () => { const rs = ctx.atlas && ctx.atlas.deps && ctx.atlas.deps.rooms; return (rs && rs[ctx.index]) || null; };
  const over = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  function keepouts() {
    ko = []; koAt = now();
    doc.querySelectorAll(KO).forEach((e) => { const r = e.getBoundingClientRect(); if (r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden') ko.push(r); });
    const m = (room() || {}).mod;
    try { if (m && m.keepout) (m.keepout(ctx) || []).forEach((k) => { if (k && k.w > 0 && k.h > 0) ko.push({ left: k.x, top: k.y, right: k.x + k.w, bottom: k.y + k.h }); }); } catch (e) {}
  }
  /* 50% x 42% of the stage, else the nearest clear spot on three lines */
  function place() {
    keepouts();
    const s = ctx.stage(), hw = Math.min(BW, s.w) / 2, y0 = s.y + s.h * 0.42;
    for (const f of [0, -1, 1]) {
      const x = s.x + s.w / 2 + f * Math.min(s.w / 4, s.w / 2 - hw);
      for (let d = 0; d <= s.h * 0.3; d += 24) for (const y of d ? [y0 - d, y0 + d] : [y0]) {
        const b = { left: x - hw, right: x + hw, top: y - RS - 6, bottom: y + RS + 8 + RH };
        if (b.top >= s.y && b.bottom <= s.y + s.h && !ko.some((k) => over(b, k))) return [x, y];
      }
    }
    return null;
  }
  function wanted() {
    const r = room(), m = G.mode;
    if (!r || !r.mod || HIDE.has(r.id) || r.mod.reticle === false) return 'stop';
    if (view.mode === 'none') return 'nocam';
    return m === 'pinch' || m === 'dead' || m === 'hold' || m === 'drag' ? 'gesture' : '';
  }
  function update(force) {
    let p = null; why = wanted();
    if (!why) { p = force || !on || now() - koAt > 700 ? place() : [X, Y]; if (!p) why = 'keepout'; }
    if (why) { if (on) { on = false; el.classList.remove('on'); const g = why === 'gesture'; setCur(null, g); hush = g; } return; }
    if (p[0] !== X || p[1] !== Y) { X = p[0]; Y = p[1]; el.style.transform = 'translate3d(' + Math.round(X) + 'px,' + Math.round(Y) + 'px,0)'; }
    if (!on) { on = true; el.classList.add('on'); }
    sample();
  }

  const voice = (m, id, o) => { try { return (m.hoverVoice && m.hoverVoice(id, o)) || null; } catch (e) { return null; } };
  const mk = (o, id, text, v, sx, sy, x) => Object.assign({ key: o + ':' + text, owner: o, id, text: String(text), fam: v.fam, plays: v.plays, deg: v.deg, artist: v.artist || null, kind: v.kind, sx, sy }, x);
  function pickAt(m, o, x, y) {
    const w = m.pick && view.unapply(x, y), h = w && m.pick(w[0], w[1], ctx); if (!h || h.label == null) return null;
    const id = String(h.label), p = h.wx != null ? view.apply(h.wx, h.wy) : [x, y], v = voice(m, id, o) || {};
    return mk(o, id, id, Object.assign({}, v, { artist: v.artist || (h.focus && h.focus.artist) }), p[0], p[1]);
  }
  function resolve() {
    const r = room(), m = r.mod, o = r.id;
    try {
      if (typeof m.reticle === 'function') { const h = m.reticle(X, Y, ctx); if (!h) return null; const id = h.id != null ? h.id : h.text; return mk(o, id, h.text || h.artist || id, h, h.sx != null ? h.sx : h.x != null ? h.x : X, h.sy != null ? h.sy : h.y != null ? h.y : Y, { open: h.open }); }
      const h = pickAt(m, o, X, Y); if (h) return h;
      let b = null, bd = R_LAB; /* nearest label, pick() at its anchor first */
      ctx.labels._debug().items.forEach((q) => { const it = q.it, p = q.p, d = p && p.ok && it.voice !== false && (it.kind === 'obj' || it.go) ? Math.hypot(p.sx - X, p.sy - Y) : 1e9; if (d < bd) { bd = d; b = q; } });
      return b && (pickAt(m, o, b.p.sx, b.p.sy) || mk(b.owner, b.it.id, b.it.text, voice(m, b.it.id, b.owner) || b.it, b.p.sx, b.p.sy, { kind: 'label', lab: true }));
    } catch (e) { return null; }
  }
  function labOf(c, sel) {
    try {
      const r = ctx.labels.rect(c.owner, c.id);
      if (!r) { for (const b of doc.querySelectorAll('#atlas-labels .lab.on')) if (b.textContent === c.text) return b.matches(sel || '*') ? b : null; return null; }
      const e = doc.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return e && e.closest ? e.closest(sel || '#atlas-labels .lab') : null;
    } catch (e) { return null; }
  }
  function setCur(c, quiet) {
    const k = c ? c.key : null, P = ctx.post || {};
    const off = () => { const s = armed && P.state && P.state(); if (s && (s.artist === armed || s.pending)) P.undwell(); armed = ''; };
    if (k !== key) {
      cur = c; key = k;
      if (lit) { lit.classList.remove('vx-on'); lit = null; }
      el.classList.toggle('hit', !!c); rd.textContent = c ? c.text : '';
      if (c) { lit = labOf(c); if (lit) lit.classList.add('vx-on'); el.classList.toggle('lab', !!lit); }
      if (quiet || hush) { hush = false; return; }
      if (!c) { A.tick(null); off(); return; }
      if (!ctx.reduced && ring.animate) ring.animate([{ boxShadow: '0 0 0 0 #86cbfeb3' }, { boxShadow: '0 0 0 14px #86cbfe00' }], 500);
      if (A.tick(k, { fam: c.fam, plays: c.plays, deg: c.deg, kind: c.kind === 'label' || c.kind === 'control' ? c.kind : 'glyph', x: c.sx, y: c.sy }) !== undefined) n++;
      if (!c.artist) off();
    } else if (c) cur = c; else return;
    if (!quiet && c.artist && armed !== c.artist && P.dwell && now() - hand < 4000) { P.dwell(c.artist, { x: X - 70, y: Y + RS + 10 + RH }); armed = c.artist; }
  }
  function sample() { if (!on) return; const t = now(); if (t - lastS < GAP) { schedule(); return; } lastS = t; setCur(resolve()); }
  function schedule() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(false); }); }

  G.bind(el, { drag: 'camera', tap: (p) => {
    const c = cur; if (!c) return G.tapAt(p.sx, p.sy);
    if (c.open) { try { c.open(); } catch (e) {} return true; }
    const b = c.lab && labOf(c, '#atlas-labels button'); if (b) b.click(); else G.tapAt(c.sx, c.sy);
    return true;
  } });
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return; cancelAnimationFrame(watch);
    const f = () => { if (G.mode === 'cam' || G.mode === 'pinch') hand = now(); update(false); watch = G.active ? requestAnimationFrame(f) : 0; }; watch = requestAnimationFrame(f);
  }, CP);
  addEventListener('pointerup', () => setTimeout(() => update(true), 0), CP);
  addEventListener('resize', () => update(true), { passive: true });
  view.onChange(() => { if (on || !why || why === 'nocam') schedule(); });
  ctx.onStop(() => { hush = false; hand = -1e9; setCur(null); update(true); setTimeout(() => update(true), 420); });
  try { ctx.atlas.onGov(() => update(true)); } catch (e) {}
  setInterval(() => { if (on && !doc.hidden && !G.active) update(true); }, 1000);
  update(true);
  return { el, sample: () => { lastS = 0; update(true); }, state: () => ({ on, x: X, y: Y, why, key, text: cur && cur.text, artist: cur && cur.artist, ticks: n }) };
}
export default { install };
