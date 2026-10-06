/* your side of the record: on the end card, the owner's seal beside the visitor's own. same recipe, but the arcs are how this
   visitor reached each stop, one tick per mark their hand laid, one petal per stop seen. reads two sessionStorage keys
   (sm_atlas_served_v1, sm_hand_v1); nothing is written, sent, or kept. */
const TAU = Math.PI * 2, INK = ['#21f6bc', '#f5a623', '#8b6fd6'], ICE = '#86cbfe', BG = '#0a0118';
const MONO = '"JetBrains Mono","SF Mono",ui-monospace,monospace';
const RM = matchMedia('(prefers-reduced-motion: reduce)'), FC = matchMedia('(forced-colors: active)'), PH = matchMedia('(max-width:600px)');
const S = { shown: false, hands: 0, queue: 0, shuffle: 0, stops: 0, total: 0, marks: 0, shares: [0, 0, 0], edition: '', line: '', handsOff: false, size: 0, draws: 0, animated: false };
let seal = null;
export function stats() { return { ...S, shares: S.shares.slice() }; }

function edition(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const x = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return x.slice(0, 4) + '-' + x.slice(4, 6);
}
function drawVisitor(g, r, p) {
  const fc = FC.matches, ink = (i) => (fc ? 'CanvasText' : INK[i]), ice = fc ? 'CanvasText' : ICE;
  g.save(); g.translate(r + 1, r + 1); g.lineCap = 'butt';
  g.fillStyle = fc ? 'Canvas' : 'rgba(10,1,24,.88)'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  if (fc) { g.strokeStyle = 'CanvasText'; g.lineWidth = 1; g.stroke(); }
  /* arcs in the owner's order: ° hand, × shuffle, ≡ queue */
  let a = -Math.PI / 2; g.lineWidth = r * 0.13;
  const tot = S.hands + S.shuffle + S.queue;
  if (!tot) { g.strokeStyle = ice; g.globalAlpha = 0.25; g.beginPath(); g.arc(0, 0, r * 0.86, 0, TAU); g.stroke(); g.globalAlpha = 1; }
  S.shares.forEach((q, i) => {
    if (q <= 0) return;
    const s = TAU * q * p, gap = q > 0.99 ? 0 : 0.04;
    g.strokeStyle = ink(i); g.beginPath(); g.arc(0, 0, r * 0.86, a + gap, Math.max(a + gap, a + TAU * q * p - gap)); g.stroke(); a += TAU * q;
  });
  /* 97 slots like the owner's ring: a tick per mark of your hand (cap 97), a dot for each slot still open */
  const n = Math.min(97, S.marks), st = TAU / 97;
  g.strokeStyle = ice; g.fillStyle = ice; g.lineWidth = Math.max(1, r * 0.014);
  for (let k = 0; k < 97; k++) {
    const t = -Math.PI / 2 + k * st, c = Math.cos(t), s = Math.sin(t);
    if (k < n) { g.globalAlpha = 0.7; g.beginPath(); g.moveTo(c * r * 0.72, s * r * 0.72); g.lineTo(c * r * 0.64, s * r * 0.64); g.stroke(); }
    else { g.globalAlpha = 0.28; g.beginPath(); g.arc(c * r * 0.72, s * r * 0.72, Math.max(0.5, r * 0.01), 0, TAU); g.fill(); }
  }
  if (S.marks > 97) { g.globalAlpha = 0.9; g.lineWidth = Math.max(2, r * 0.03); g.beginPath(); g.moveTo(0, -r * 0.72); g.lineTo(0, -r * 0.6); g.stroke(); }
  /* a petal per stop seen */
  const m = Math.max(1, S.total), pw = TAU / m * 0.22;
  for (let k = 0; k < Math.min(S.stops, m); k++) {
    const t = -Math.PI / 2 + k * TAU / m, L = r * 0.5, q = r * 0.1, c = Math.cos, s = Math.sin;
    g.beginPath(); g.moveTo(c(t) * q, s(t) * q);
    g.quadraticCurveTo(c(t - pw) * L * 0.7, s(t - pw) * L * 0.7, c(t) * L, s(t) * L);
    g.quadraticCurveTo(c(t + pw) * L * 0.7, s(t + pw) * L * 0.7, c(t) * q, s(t) * q);
    g.globalAlpha = 0.2; g.fill(); g.globalAlpha = 0.75; g.stroke();
  }
  g.globalAlpha = 1; g.fillStyle = fc ? 'Canvas' : BG; g.beginPath(); g.arc(0, 0, r * 0.15, 0, TAU); g.fill();
  g.fillStyle = ice; g.font = '600 ' + Math.round(r * 0.3) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('a', 0, r * 0.02);
  g.restore();
}
function sizeOf() { return PH.matches ? 96 : innerWidth >= 900 ? 160 : 120; }
function ctxFor(cv, px) {
  const d = Math.min(3, devicePixelRatio || 1);
  cv.width = cv.height = Math.round(px * d); cv.style.width = cv.style.height = px + 'px';
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, px, px); return g;
}

let LIVE = null;
export default function mount(ctx) {
  if (LIVE) return LIVE;
  LIVE = mount0(ctx); const u0 = LIVE.unmount; LIVE.unmount = function () { try { return u0.apply(this, arguments); } finally { LIVE = null; } };
  return LIVE;
}
function mount0(ctx) {
  const end = document.getElementById('ai-end'), srv = document.getElementById('ai-end-served');
  if (!end || !srv) return { unmount() {}, stats };
  let raf = 0, key = '', offTour = null, dead = false;
  const st = document.createElement('style');
  st.textContent = '#ai-end .vs-wrap{display:flex;gap:16px;align-items:flex-end;margin:8px 0 2px}#ai-end .vs-fig{margin:0;display:flex;flex-direction:column;align-items:center;gap:3px}' +
    '#ai-end .vs-fig canvas{display:block;border-radius:50%;background:' + BG + '}#ai-end .vs-lab{font:500 10px/1 ' + MONO + ';letter-spacing:.08em;color:var(--ink,#cde)}' +
    '#ai-end .vs-line{margin:0 0 6px;font:italic 400 12px/1.4 var(--serif-voice,Georgia,serif);color:var(--ink,#cde)}' +
    '@media (max-width:600px){#ai-end .vs-wrap{gap:12px}}@media (forced-colors:active){#ai-end .vs-lab,#ai-end .vs-line{color:CanvasText}#ai-end .vs-fig canvas{background:Canvas}}';
  document.head.appendChild(st);
  const wrap = document.createElement('div'); wrap.className = 'vs-wrap'; wrap.setAttribute('role', 'img');
  const mk = (t) => { const f = document.createElement('figure'), c = document.createElement('canvas'), l = document.createElement('figcaption'); f.className = 'vs-fig'; l.className = 'vs-lab'; l.textContent = t; c.setAttribute('aria-hidden', 'true'); f.append(c, l); wrap.appendChild(f); return c; };
  const cvMe = mk('me'), cvYou = mk('you');
  const line = document.createElement('p'); line.className = 'ai-voice-p vs-line';
  srv.after(wrap, line); wrap.hidden = line.hidden = true;

  function read() {
    let sv = {}, hm = 0;
    try { sv = JSON.parse(sessionStorage.getItem('sm_atlas_served_v1') || '{}') || {}; } catch (e) { sv = {}; }
    try { hm = parseInt(sessionStorage.getItem('sm_hand_v1') || '0', 10) || 0; } catch (e) { hm = 0; }
    const v = Object.values(sv), m = /of your (\d+) stops/.exec(srv.textContent || '');
    S.hands = v.filter((x) => x === '°').length; S.queue = v.filter((x) => x === '≡').length; S.shuffle = v.filter((x) => x === '×').length;
    S.stops = v.length; S.total = m ? +m[1] : (ctx && ctx.tour && ctx.tour.active && ctx.tour.active.id && ctx.tour.list ? (ctx.tour.list().find((t) => t.id === ctx.tour.active.id) || {}).shown : 0) || S.stops;
    S.marks = Math.max(0, hm);
    const t = S.hands + S.queue + S.shuffle;
    S.shares = t ? [S.hands / t, S.shuffle / t, S.queue / t] : [0, 0, 0];
    S.handsOff = !S.hands && !S.shuffle && S.queue > 0;
    S.edition = edition('v' + S.hands + '.' + S.shuffle + '.' + S.queue + '.' + S.marks);
    const mk1 = S.marks + (S.marks === 1 ? ' mark' : ' marks') + ' on the log';
    S.line = 'this visit: ' + (S.handsOff ? 'you let the queue run, all ' + S.total + ' stops · ' + mk1
      : 'you pressed play on ' + S.hands + ' of ' + S.total + ' stops · ' + mk1 + ' · edition ' + S.edition);
  }
  async function refresh() {
    if (dead || end.hidden) { S.shown = false; return; }
    read();
    const px = sizeOf(), k = S.line + '|' + px;
    wrap.hidden = line.hidden = false; S.shown = true; S.size = px;
    if (line.textContent !== S.line) line.textContent = S.line;
    wrap.setAttribute('aria-label', 'seals: the owner’s, and yours. ' + S.line);
    if (k === key) return; key = k;
    if (!seal) { try { seal = (await import('./seal.js' + new URL(import.meta.url).search)).drawSeal; } catch (e) { seal = null; } }
    if (dead) return;
    const r = px / 2 - 1, gm = ctxFor(cvMe, px);
    if (seal) { try { seal(gm, r + 1, r + 1, r); } catch (e) {} }
    const gy = ctxFor(cvYou, px); cancelAnimationFrame(raf); S.animated = false;
    if (RM.matches) { drawVisitor(gy, r, 1); S.draws++; return; }
    S.animated = true; const t0 = performance.now();
    (function f(t) {
      const p = Math.min(1, (t - t0) / 600); gy.clearRect(0, 0, px, px); drawVisitor(gy, r, 1 - Math.pow(1 - p, 3)); S.draws++;
      if (p < 1) raf = requestAnimationFrame(f);
    })(t0);
  }
  const mo = new MutationObserver(() => { refresh(); });
  mo.observe(end, { attributes: true, attributeFilter: ['hidden'] });
  try { if (ctx && ctx.tour && ctx.tour.onChange) offTour = ctx.tour.onChange(() => { if (!end.hidden) refresh(); }); } catch (e) {}
  addEventListener('resize', onR);
  function onR() { if (!end.hidden) refresh(); }
  refresh();
  return {
    stats,
    unmount() { dead = true; mo.disconnect(); cancelAnimationFrame(raf); removeEventListener('resize', onR); if (typeof offTour === 'function') offTour(); wrap.remove(); line.remove(); st.remove(); },
  };
}
