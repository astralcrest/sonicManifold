/* R5 L1 · the instrument: one voice for every hover (R5_PLAN §1 L1; API in R5/L1/API.md).
   pitch = genre family as a degree of the bed's key floor (shell inKey + keyFloor, via A.pitches()); octave = plays, MORE
   PLAYS = LOWER, the one convention site-wide; pan = screen x; timbre = kind: glyph a sine pluck, label a triangle,
   control a soft short click. change-gated, >= 40 ms apart, <= 6 voices (the oldest is stolen), gain / sqrt(live),
   never above 0.04, silent while muted or before the unlock. the light is one reused ice ring that blooms where the
   hovered thing is and rests there (a static ring under reduced motion); it never takes a provenance colour. */
const MAXV = 6, GAP = 40, VMAX = 0.04, D4 = 293.66, REST = 2400, LET_GO = 250;
const VOL = { glyph: 0.032, label: 0.026, control: 0.02 };
const DUR = { glyph: 0.45, label: 0.32, control: 0.07 };
const CSS = '.vx-h{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .25s ease}' +
  '.vx-h.on{opacity:1}' +
  '.vx-h i{position:absolute;left:-13px;top:-13px;width:26px;height:26px;box-sizing:border-box;border-radius:50%;border:1.5px solid #86cbfe;box-shadow:0 0 12px rgba(134,203,254,.42);opacity:.75}' +
  '.vx-h i.a{animation:vxa .5s ease-out both}.vx-h i.b{animation:vxb .5s ease-out both}' +
  '@keyframes vxa{0%{opacity:1;transform:scale(.4)}100%{opacity:.75;transform:scale(1)}}' +
  '@keyframes vxb{0%{opacity:1;transform:scale(.4)}100%{opacity:.75;transform:scale(1)}}' +
  '#atlas-labels .lab.vx-on{color:#86cbfe}' +
  '@media (forced-colors:active){.vx-h i{border-color:Highlight;box-shadow:none}}';

export function install(A, deps) {
  const ctx = deps.ctx, reduced = !!deps.reduced;
  const FAMK = Object.keys((ctx && ctx.FAM) || {});
  const live = [];
  let last = null, lastT = -1e9, halo = null, ring = null, flip = 0, restT = 0;

  /* families 0..12 are the taxonomy; untagged / unknown sit on the root, softer */
  function degree(o) {
    if (o.deg != null && isFinite(o.deg)) return [Math.floor(+o.deg), false];
    if (o.fam == null) return [0, false];
    const k = typeof o.fam === 'number' ? o.fam : FAMK.indexOf(String(o.fam).toLowerCase());
    return k < 0 || k >= 13 ? [0, true] : [k, false];
  }
  const octave = (p) => (p == null || !(+p >= 0) ? 0 : p < 30 ? 1 : p < 300 ? 0 : p < 3000 ? -1 : -2);
  /* the floor's classes as semitones above D, ascending: degree 0 is the lowest allowed tone at or above D */
  function floorRel() { const r = A.pitches().map((pc) => (pc - 2 + 12) % 12); r.sort((a, b) => a - b); return r; }

  function prune(t) { for (let i = live.length - 1; i >= 0; i--) if (live[i].end <= t) live.splice(i, 1); }
  function steal(v, t) {
    try { const g = v.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + 0.015); } catch (e) {}
    try { v.osc.stop(t + 0.02); } catch (e) {}
    try { if (v.o2) v.o2.stop(t + 0.02); } catch (e) {}
  }

  function light(o) {
    if (o.x == null || o.y == null || !isFinite(o.x) || !isFinite(o.y)) return;
    if (!halo) {
      const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      halo = document.createElement('div'); halo.className = 'vx-h'; halo.setAttribute('aria-hidden', 'true');
      ring = document.createElement('i'); halo.appendChild(ring); document.body.appendChild(halo);
    }
    halo.style.transform = 'translate3d(' + Math.round(o.x) + 'px,' + Math.round(o.y) + 'px,0)';
    /* two identical keyframe names: switching between them restarts the bloom with no layout read */
    flip ^= 1; ring.className = reduced ? '' : flip ? 'a' : 'b';
    halo.classList.add('on');
    clearTimeout(restT); restT = setTimeout(fade, REST);
  }
  function fade() { clearTimeout(restT); if (halo) halo.classList.remove('on'); }

  function sound(o, kind) {
    const ac = A.ac, t = ac.currentTime, R = floorRel(), L = R.length || 1;
    const [d, soft] = degree(o);
    const semi = R[((d % L) + L) % L] + 12 * octave(o.plays) + (kind === 'control' ? 12 : 0);
    const f = D4 * Math.pow(2, semi / 12), dur = DUR[kind], att = kind === 'control' ? 0.002 : 0.006;
    prune(t);
    while (live.length >= MAXV) steal(live.shift(), t);
    const v = (Math.min(VMAX, +o.vol > 0 ? +o.vol : VOL[kind]) * (soft ? 0.7 : 1)) / Math.sqrt(live.length + 1);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = kind === 'label' ? 'triangle' : 'sine'; osc.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    /* a low note gets its own octave as a quiet partial, so a laptop speaker still carries it; the pitch class is unchanged */
    let o2 = null;
    if (f < 140) { o2 = ac.createOscillator(); const g2 = ac.createGain(); o2.frequency.value = f * 2; g2.gain.value = 0.35; o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + dur + 0.05); }
    let out = g;
    if (o.x != null && isFinite(o.x) && typeof ac.createStereoPanner === 'function') {
      const p = ac.createStereoPanner(), W = innerWidth || 1;
      p.pan.value = Math.max(-0.6, Math.min(0.6, (o.x / W) * 1.2 - 0.6)); g.connect(p); out = p;
    }
    out.connect(A.sfx); osc.start(t); osc.stop(t + dur + 0.05);
    live.push({ osc, o2, g, end: t + dur + 0.05 });
    if (A._log) A._log.push({ t: performance.now(), f, semi, pc: (((semi + 2) % 12) + 12) % 12, live: live.length, kind, gain: v });
    return semi;
  }

  function tick(target, o) {
    /* let go: the gate opens at once; the ring lingers a moment, so a label that slides from under a still pointer
       (a re-placement) does not blink */
    if (target == null) { last = null; clearTimeout(restT); restT = setTimeout(fade, LET_GO); return undefined; }
    o = o || {};
    if (target === last && !o.force) return undefined;
    const now = performance.now();
    if (now - lastT < GAP) return undefined; /* the gate does not advance: the next move on this target sounds it */
    last = target; lastT = now;
    light(o);
    if (!A.ac || A.muted || !A.on || !A.sfx) return undefined;
    const kind = o.kind === 'label' || o.kind === 'control' ? o.kind : 'glyph';
    try { return sound(o, kind); } catch (e) { return undefined; }
  }

  return { tick, live: () => { if (A.ac) prune(A.ac.currentTime); return live.length; }, fade };
}
