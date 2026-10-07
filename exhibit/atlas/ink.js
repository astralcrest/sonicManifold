/* the hand's ink: a pen stroke draws itself under the room title. mint and wobbly when the caption is the person's, a straight
   40% ruler when it is the machine's. sibling svg after the heading, never inside it, no attribute ever set on it. nothing sent or stored */
const NS = 'http://www.w3.org/2000/svg', MINT = '#21f6bc', DUR = 700;
const CSS = '.ink-s{position:absolute;pointer-events:none;overflow:visible;z-index:1;color:var(--ink,#e8f0f6)}' +
  '.ink-s path{fill:none;stroke-width:1.5;stroke-linecap:round}.ink-s circle{fill:none;stroke-width:1.2}' +
  '@media (forced-colors:active){.ink-s path,.ink-s circle{stroke:CanvasText!important;stroke-opacity:1!important}}';
const seed = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (s) => () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export function pathFor(text, w, person) {
  const y = 2.5, e = Math.max(w - 5, 4);
  if (!person) return 'M0,' + y + 'L' + w + ',' + y;
  const r = rng(seed(text)), j = () => ((r() - 0.5) * 2.4).toFixed(2);
  return 'M0,' + (y + +j() * 0.5) + 'C' + (e * 0.3).toFixed(1) + ',' + (y + +j()) + ' ' + (e * 0.62).toFixed(1) + ',' + (y + +j()) + ' ' + e.toFixed(1) + ',' + (y + +j() * 0.6);
}

export default function mount(ctx) {
  ctx = ctx || (window.__exhibit && window.__exhibit.ctx);
  const doc = document, st = doc.createElement('style'), S = { draws: 0, kind: '', w: 0, d: '' };
  st.textContent = CSS; doc.head.appendChild(st);
  const RM = matchMedia('(prefers-reduced-motion: reduce)'), jobs = [], timers = {};
  const track = (hid, rid) => {
    const h = doc.getElementById(hid); if (!h) return null;
    const svg = el('svg', { class: 'ink-s', 'aria-hidden': 'true', focusable: 'false', height: '5' });
    svg.style.display = 'none'; h.after(svg);
    const o = { h, svg, rid, text: '' }; jobs.push(o); return o;
  };
  const measure = (h) => {
    const rg = doc.createRange(); rg.selectNodeContents(h);
    const rs = rg.getClientRects(), hb = h.getBoundingClientRect();
    if (!rs.length || !hb.width || !hb.height || !h.textContent.trim()) return null;
    const l = rs[rs.length - 1];
    return { w: Math.min(l.width, hb.width), bottom: Math.min(l.bottom, hb.bottom) - hb.top, left: l.left - hb.left };
  };
  function draw(o, animate) {
    const t = o.h.textContent.trim(), m = t && measure(o.h);
    if (!m || m.w < 8) { o.svg.style.display = 'none'; return; }
    const cap = doc.getElementById('ai-caption'), person = o.rid ? true : !!(cap && cap.classList.contains('ai-voice-p'));
    const w = Math.round(m.w), d = pathFor(t, w, person), s = o.svg, col = person ? MINT : 'currentColor';
    s.replaceChildren(); s.style.cssText = 'display:block;left:' + (o.h.offsetLeft + Math.max(m.left, 0)) + 'px;top:' + (o.h.offsetTop + m.bottom - 1) + 'px;width:' + w + 'px';
    s.setAttribute('width', w); s.setAttribute('viewBox', '0 0 ' + w + ' 8');
    const p = el('path', { d, stroke: col, 'stroke-opacity': person ? 1 : 0.4 }); s.appendChild(p);
    let ring = null;
    if (person) { ring = el('circle', { cx: Math.max(w - 2.5, 2), cy: 2.5, r: 1.7, stroke: col }); s.appendChild(ring); }
    S.draws++; S.kind = o.kind = person ? 'hand' : 'ruler'; S.w = w; S.d = d;
    if (!animate || RM.matches) return;
    const L = p.getTotalLength();
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
    if (ring) ring.style.opacity = 0;
    p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset ' + DUR + 'ms cubic-bezier(.4,.1,.3,1)'; p.style.strokeDashoffset = 0;
    if (ring) { ring.style.transition = 'opacity 120ms ease-out ' + (DUR - 60) + 'ms'; ring.style.opacity = 1; }
  }
  const later = (o, animate, ms) => {
    clearTimeout(timers[o.h.id]);
    timers[o.h.id] = setTimeout(() => { if (o.h.isConnected) draw(o, animate); }, ms);
  };
  let title = null, tries = 0, tm = 0;
  const mo = new MutationObserver((recs) => {
    for (const o of jobs) if (recs.some((r) => r.target === o.h || o.h.contains(r.target))) later(o, true, o.rid ? 220 : 160);
  });
  const moCap = new MutationObserver(() => {
    const cap = doc.getElementById('ai-caption'), kind = cap && cap.classList.contains('ai-voice-p') ? 'hand' : 'ruler';
    if (title && title.kind && title.kind !== kind) later(title, false, 60);
  });
  const init = () => {
    if (!title && !(title = track('ai-title', 0)) && tries++ < 60) { tm = setTimeout(init, 250); return; }
    if (!jobs.some((o) => o.rid)) track('ai-end-h', 1);
    jobs.forEach((o) => mo.observe(o.h, { childList: true, characterData: true, subtree: true }));
    /* the caption can turn out to be the person's after the title stroke is drawn: redraw it when the voice class flips */
    const cap = doc.getElementById('ai-caption'); if (cap) moCap.observe(cap, { attributes: true, attributeFilter: ['class'] });
    if (title && title.h.textContent.trim()) later(title, true, 100);
  };
  init();
  const off = ctx && ctx.onStop ? ctx.onStop(() => { if (title) later(title, true, 260); }) : null;
  let rt = 0;
  const onR = () => { clearTimeout(rt); rt = setTimeout(() => jobs.forEach((o) => draw(o, false)), 150); };
  addEventListener('resize', onR);
  return {
    unmount() {
      mo.disconnect(); moCap.disconnect(); if (typeof off === 'function') off(); removeEventListener('resize', onR);
      Object.values(timers).forEach(clearTimeout); clearTimeout(rt); clearTimeout(tm); jobs.forEach((o) => o.svg.remove()); document.querySelectorAll('.ink-s').forEach((e) => e.remove()); st.remove(); jobs.length = 0;
    },
    stats() { return { ...S, subscribed: false, svgs: jobs.length }; },
  };
}
