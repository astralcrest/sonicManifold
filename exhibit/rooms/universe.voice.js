/* R5 R2 · the sky sings (R5_PLAN §2 R2; the L1 instrument API: R5/L1/API.md). lazy: universe.js
   imports it on the first hover, press, label hover or kiosk demo, never on mount. universe.js itself sends the hover tick
   (pitch = family, octave = plays, more plays lower) and the dwell; this module adds:
   - the corona: the hovered star's linked neighbours, from universe_edges.json links only (the strongest first, by the two
     arms' transition counts together), light in ice; the strongest four ring as a soft chord, 40 ms apart, on the bed's
     next sixteenth when one is near. each note is that neighbour's family degree in the bed's key floor, octave by plays,
     the same mapping as the tick
   - the kiosk demo: a slow strum across 12 named stars, left to right, then one corona
   - the day replay: each played day sounds its three most played lit artists, and only once the ramp-up line has shown
   no per-artist arm rate (tap_share) reaches the sound (R5_PLAN §5 cut). where a star sits still means nothing. */
const ICE = '134,203,254', LIT_MAX = 12, CHORD = 4, STAG = 0.04, D4 = 293.66, FADE_IN = 220, FADE_OUT = 420;
const STRUM = 12, STRUM_MS = 430;

export function install(U) {
  const S = U.S, ctx = S.ctx, A = ctx.audio, FAMK = Object.keys(ctx.FAM || {});
  let adj = null, inv = null, invFor = null, cor = null, voices = [], demoT = [];
  const now = () => performance.now();

  /* node id -> [[node, weight], ...] strongest first (a tie goes to the more played node, which is the lower id) */
  function buildAdj() {
    const n = S.A ? S.A.n : 0, E = (S.raw && S.raw.edges && S.raw.edges.edges) || [], L = Array.from({ length: n }, () => []);
    for (const e of E) {
      const a = e.a | 0, b = e.b | 0, w = (e.tap_n | 0) + (e.auto_n | 0);
      if (a === b || a < 0 || b < 0 || a >= n || b >= n || w <= 0) continue;
      L[a].push([b, w]); L[b].push([a, w]);
    }
    L.forEach((l) => l.sort((x, y) => y[1] - x[1] || x[0] - y[0]));
    adj = L; return L;
  }
  /* the roster's index of a node, and a star's node (roster A is node order; the full roster carries R.node) */
  function nodeOf(i) { const R = S.R; if (!R || i < 0 || i >= R.nA) return -1; return R.kind === 'A' ? i : R.node ? R.node[i] : -1; }
  function idxOf(nd) {
    const R = S.R; if (!R) return -1; if (R.kind === 'A') return nd;
    if (invFor !== R) { inv = new Int32Array(S.A ? S.A.n : 0).fill(-1); for (let i = 0; i < R.nA; i++) { const k = R.node ? R.node[i] : -1; if (k >= 0 && k < inv.length && inv[k] < 0) inv[k] = i; } invFor = R; }
    return nd >= 0 && nd < inv.length ? inv[nd] : -1;
  }
  function neighbours(i) {
    const nd = nodeOf(i); if (nd < 0) return [];
    const L = (adj || buildAdj())[nd] || [], out = [];
    for (let q = 0; q < L.length && out.length < LIT_MAX; q++) { const j = idxOf(L[q][0]); if (j >= 0) out.push(j); }
    return out;
  }

  /* ---------------------------------------------------------------- sound */
  function floorRel() { const r = A.pitches().map((pc) => (pc - 2 + 12) % 12); r.sort((a, b) => a - b); return r; }
  function deg(j) { const k = FAMK.indexOf(String(U.famName(S.R.fam[j])).toLowerCase()); return k < 0 || k >= 13 ? 0 : k; }
  const octave = (p) => (p == null || !(+p >= 0) ? 0 : p < 30 ? 1 : p < 300 ? 0 : p < 3000 ? -1 : -2);
  function hush() {
    const t = A.ac ? A.ac.currentTime : 0;
    voices.forEach((v) => { try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + 0.03); v.o.stop(t + 0.05); } catch (e) {} });
    voices = [];
  }
  /* a soft chord of stars js (at most four), staggered; returns the pitch classes it played (tests) */
  function chord(js, vol) {
    if (!A || !A.ac || A.muted || !A.on || !A.sfx || !js.length || !S.R) return null;
    hush();
    const ac = A.ac, R = floorRel(), L = R.length || 1, b = A.beat ? A.beat(4) : null;
    const t0 = b && b.next - b.now < 0.16 && b.next > ac.currentTime ? b.next : ac.currentTime + 0.025;
    const v = (vol || 0.014) / Math.sqrt(js.length), pcs = [];
    js.slice(0, CHORD).forEach((j, q) => {
      const semi = R[((deg(j) % L) + L) % L] + 12 * octave(U.playsOf(j)), f = D4 * Math.pow(2, semi / 12), t = t0 + q * STAG, dur = 1.1;
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); let out = g;
      if (typeof ac.createStereoPanner === 'function' && S.sx) { const p = ac.createStereoPanner(), W = innerWidth || 1; p.pan.value = Math.max(-0.6, Math.min(0.6, (S.sx[j] / W) * 1.2 - 0.6)); g.connect(p); out = p; }
      out.connect(A.sfx); o.start(t); o.stop(t + dur + 0.05);
      voices.push({ o, g }); pcs.push((((semi + 2) % 12) + 12) % 12);
    });
    return pcs;
  }

  /* ---------------------------------------------------------------- the corona */
  function corona(i) {
    if (!S.R || i < 0) { off(); return; }
    if (cor && cor.i === i && !cor.off) return;
    const lit = neighbours(i);
    cor = { i, lit, t0: now(), off: 0, pcs: null };
    cor.pcs = chord(lit.slice(0, CHORD));
  }
  function off() { if (cor && !cor.off) cor.off = now(); }
  function draw(g) {
    const c = cor; if (!c || !S.R || !S.sx) return;
    const t = now(), a = (ctx.reduced ? 1 : Math.min(1, (t - c.t0) / FADE_IN)) * (c.off ? Math.max(0, 1 - (t - c.off) / FADE_OUT) : 1);
    if (a <= 0) { if (c.off) cor = null; return; }
    const i = c.i, R = S.R; if (S.sd[i] <= 0.05) return;
    const x0 = S.sx[i], y0 = S.sy[i], r0 = Math.max(11, R.sig[i] * 2.2 * S.ss[i]) + 2;
    g.save(); g.lineWidth = 1;
    for (let q = 0; q < c.lit.length; q++) {
      const j = c.lit[q]; if (S.sd[j] <= 0.05) continue;
      const x = S.sx[j], y = S.sy[j], dx = x - x0, dy = y - y0, d = Math.hypot(dx, dy) || 1, r = Math.max(6, R.sig[j] * 1.6 * S.ss[j]) + 2, strong = q < CHORD;
      if (d > r0 + r + 4) { g.strokeStyle = 'rgba(' + ICE + ',' + (0.2 * a).toFixed(3) + ')'; g.beginPath(); g.moveTo(x0 + (dx / d) * r0, y0 + (dy / d) * r0); g.lineTo(x - (dx / d) * r, y - (dy / d) * r); g.stroke(); }
      g.strokeStyle = 'rgba(' + ICE + ',' + ((strong ? 0.85 : 0.5) * a).toFixed(3) + ')'; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.stroke();
    }
    g.restore();
  }

  /* ---------------------------------------------------------------- the day replay */
  function dayChord(k) {
    const D = S.D, R = S.R; if (!D || !R || k < 0) return null;
    const js = []; for (let q = D.topOff[k]; q < D.topOff[k + 1] && js.length < 3; q += 2) { const i = D.top[q]; if (i >= 0 && i < R.nA) js.push(i); }
    return chord(js, 0.012);
  }

  /* ---------------------------------------------------------------- the kiosk demo */
  function stopDemo() { demoT.forEach(clearTimeout); demoT = []; }
  function demo() {
    stopDemo(); const R = S.R, st = S.stage; if (!R || !st || !S.sx) return;
    const on = []; for (let i = 0; i < Math.min(R.nA, 120); i++) if (R.placed[i] !== 1 && S.sd[i] > 0.05 && S.sx[i] > st.x + 20 && S.sx[i] < st.x + st.w - 20 && S.sy[i] > st.y + 20 && S.sy[i] < st.y + st.h - 20) on.push(i);
    if (!on.length) return;
    on.sort((a, b) => S.sx[a] - S.sx[b]);
    const pick = []; for (let q = 0; q < Math.min(STRUM, on.length); q++) pick.push(on[Math.floor((q * on.length) / Math.min(STRUM, on.length))]);
    let hub = -1, best = -1; for (let i = 0; i < Math.min(R.nA, 24); i++) { const n = neighbours(i).length; if (S.sd[i] > 0.05 && n > best) { best = n; hub = i; } }
    const at = (ms, f) => demoT.push(setTimeout(() => { if (!ctx.demoStopped && S.active) f(); }, ms));
    pick.forEach((i, q) => at(600 + q * STRUM_MS, () => U.hoverStar(i, 'demo')));
    const tc = 600 + pick.length * STRUM_MS + 500;
    if (hub >= 0) at(tc, () => { U.hoverStar(hub, 'demo'); corona(hub); });
    at(tc + 4800, () => U.unhover());
  }

  return { corona, off, draw, chord, dayChord, demo, stopDemo, neighbours, state: () => (cor ? { i: cor.i, lit: cor.lit.slice(), pcs: cor.pcs, off: !!cor.off } : null), adj: () => adj || buildAdj() };
}
