const CSS = 'section[data-room="listeners"].lst-sw .lst-tgw,section[data-room="listeners"].lst-sw .lst-cue,section[data-room="listeners"].lst-sw .lst-tag,section[data-room="listeners"].lst-sw .lst-post{display:none!important}@media (max-aspect-ratio:115/100){html.lst-sw-on .atlas-ladder-chip,html.lst-sw-on #atlas-info .ai-caption{display:none!important}}';
const V = new URL(import.meta.url).search || '';
let P = null, on = false;
const q = (f) => { try { return f(); } catch (e) { return undefined; } };
const open = (L, ctx) => {
  if (on) return;
  on = true;
  const sec = L.root.parentElement;
  if (!document.getElementById('lst-sw-css')) { const s = document.createElement('style'); s.id = 'lst-sw-css'; s.textContent = CSS; document.head.appendChild(s); }
  sec.classList.add('lst-sw'); document.documentElement.classList.add('lst-sw-on');
  q(() => ctx.labels.clear('listeners'));
  q(() => { L.hoverI = -1; L.tag.hidden = true; });
  (P = P || import('./showwork.js' + V)).then((m) => { if (on) m.default.mount(sec, ctx); }, (e) => console.warn('showwork', e));
};
const close = (L) => {
  if (!on) return;
  on = false;
  q(() => L.root.parentElement.classList.remove('lst-sw')); document.documentElement.classList.remove('lst-sw-on');
  if (P) P.then((m) => m.default.unmount(), () => {});
};
export default {
  attach(L, ctx) {
    if (L.__sw) return; L.__sw = 1;
    const o = {}; ['enter', 'leave', 'setAngle', 'pushLabels'].forEach((k) => { o[k] = L[k]; });
    const sync = (c) => { if (q(() => c.angle.get().id) === 'showwork') open(L, c); };
    L.setAngle = function (k, c, op) {
      const a = L.angles[k], r = o.setAngle.call(L, k, c, op || {});
      if (a && L.ready) { if (a.id === 'showwork') open(L, c); else close(L); }
      return r;
    };
    L.pushLabels = function (c) { if (on) { L.labOn = false; q(() => c.labels.clear('listeners')); return; } return o.pushLabels.call(L, c); };
    L.leave = function (c) { close(L); return o.leave.call(L, c); };
    L.enter = function (c) { const r = o.enter.call(L, c); sync(c); return r; };
    if (L.ready && L.root && L.root.parentElement.classList.contains('is-active')) sync(ctx);
    /* R9: the hundred jumps at rest. the lit squares shimmer in a slow diagonal wave and, until the first press, a ring
       on the first square says where to touch (still under reduced motion and a struggling governor) */
    const fr = L.frame;
    L.frame = function (g, t, b, w, h, c) {
      const r = fr.call(L, g, t, b, w, h, c), H = L.__hd, A = c.atlas;
      if (!H || !H.on || !H.idx) return r;
      if (H.hov >= 0) L.__tch = 1;
      const calm = c.reduced || (A && A.gov && A.gov.tier >= 4);
      if (!calm && !H.run && H.hov < 0) {
        const W = c.particles.w, I = H.idx, U = H.u, ph = (L.__ph = ((L.__ph | 0) + 1) % 4); /* a quarter of the squares a frame */
        for (let cc = ph; cc < 200; cc += 4) {
          const q = cc >= 100 ? 1 : 0, k = cc - q * 100, f = k <= H.lit ? H.fill[q][k] : 0; if (!f) continue;
          const v = (205 + 50 * Math.sin(t * 2.6 - ((k % 10) + ((k / 10) | 0)) * 0.55 - q * 1.4)) | 0;
          for (let j = H.off[cc], e = H.off[cc + 1]; j < e; j++) { const i = I[j]; if (U[i] < f) W[i] = v; }
        }
      }
      if (!L.__tch && H.cp) {
        const cp = H.cp, x = H.gx[0] + cp / 2, y = H.gy[0] + cp / 2, f = calm ? 0.5 : (performance.now() % 1800) / 1800;
        g.save(); g.globalAlpha = 1; g.setLineDash([]); g.lineWidth = 1.5; g.strokeStyle = 'rgba(134,203,254,' + (0.9 - 0.75 * f) + ')';
        g.beginPath(); g.arc(x, y, cp * 0.6 + cp * 0.7 * f, 0, Math.PI * 2); g.stroke();
        g.font = '600 11px ui-monospace,Menlo,monospace'; g.textBaseline = 'middle'; g.textAlign = 'left';
        const s = 'press a square', tw = g.measureText(s).width, tx = x + cp * 1.6, ty = y + cp * 1.6;
        g.fillStyle = 'rgba(10,1,24,.88)'; g.fillRect(tx - 5, ty - 9, tw + 10, 18); g.fillStyle = 'rgba(134,203,254,.95)'; g.fillText(s, tx, ty); g.restore();
      }
      return r;
    };
    lensAttach(L, ctx);
  },
};

/* R10 THE LENS: the my taps / autoplay angles become one lenticular print (exhibit/atlas/lens.js). the toggle, the hidden
   listbox, the listening post and the angle bar stay the real controls; the hand (tilt, drag, a mouse passing over) only
   peeks until a drag ends or a tilt goes well past the middle, then it presses the same toggle. ?lens=0 is the old room */
const LQ = (/[?&]lens=(0|2d)\b/.exec(location.search) || [])[1];
const CAP_C = 'tilt or drag. one side is what i tapped, the other what the queue served. white is both.';
const CAP_F = 'move over it. one side is what i tapped, the other what the queue served. white is both.';
const QINK = '168,142,240', BOTH = '255,243,228';
const LCSS = 'section[data-room="listeners"].lst-lens .lst-toggle button:last-child .lst-sw{background:rgb(' + QINK + ')!important}' +
  'section[data-room="listeners"].lst-lens .lst-cue{white-space:normal;width:max-content;text-overflow:clip;line-height:1.35;border-radius:12px;color:#dfe6ff;border-color:rgba(255,243,228,.28)}' +
  '@media print{section[data-room="listeners"] .lens-cv{display:none!important}}';
const cl01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hx = (n) => ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
function lensAttach(L, ctx) {
  if (L.__lens || LQ === '0') return;
  let mod = null, fail = false;
  const Z = { on: false, lens: null, tilt: null, ph: 0, over: 0, drag: null, peek: null, tp: null, intro: null, introDone: false, sweep: false, sw0: 0,
    held: -2, px: null, lastMode: null, self: false, lt: 0, cost: [], dts: [], pt: 0, R: null, nr: null };
  const ang = (c) => q(() => c.angle.get().id);
  const want = (c) => !fail && L.ready && L.atlasOn && L.root && L.root.parentElement.classList.contains('is-active') && /^(taps|autoplay)$/.test(ang(c) || '');
  const coarse = () => q(() => matchMedia('(pointer:coarse)').matches);
  function cap(c) {
    if (!L.cue) return;
    if (Z.on) { L.cue.textContent = coarse() ? CAP_C : CAP_F; L.cue.hidden = false; }
    q(() => L.fitLive());
  }
  function commit(m, c) { if (m === L.mode) return; Z.self = true; L.flip(m, c); L.syncAngle(c); }
  function touched(c) {
    Z.intro = null; q(() => L.stopDemo());
    if (Z.sweep) { Z.sweep = false; Z.swDone = true; commit(Z.ph >= 0.5 ? 'auto' : 'tap', c); Z.ph = L.mode === 'auto' ? 1 : 0; }
    if (Z.tilt) Z.tilt.ask();
  }
  const camOf = (c) => { const v = c.view; if (!v || !v.apply) return [0, 0, 1]; const a = v.apply(0, 0), b = v.apply(1, 0); return [a[0], a[1], (b[0] - a[0]) || 1]; };
  function bind(c, on) {
    const base = L.hitSpec(c);
    if (!on) { L.offHit = c.gesture.bind(L.hit, base); return; }
    L.offHit = c.gesture.bind(L.hit, Object.assign({}, base, {
      tap: (p) => { touched(c); return base.tap(p); },
      hover: (p) => {
        base.hover(p);
        if (p.type !== 'mouse' || Z.drag != null || !Z.R) return;
        const k = camOf(c), x0 = Z.R.x * k[2] + k[0], u = (p.sx - x0) / (Z.R.w * k[2]);
        Z.peek = (u - 0.5) * 1.6; Z.intro = null;
      },
      leave: () => { base.leave(); Z.peek = null; },
      drag: {
        start: () => { touched(c); Z.peek = null; Z.drag = Z.ph; },
        move: (p, dx) => { const k = camOf(c), w = Z.R ? Z.R.w * k[2] : 400; Z.drag += dx / Math.max(160, w * 0.55); },
        end: () => { const m = cl01(Z.drag) >= 0.5 ? 'auto' : 'tap'; Z.drag = null; commit(m, c); },
      },
    }));
  }
  function setOn(on, c) {
    if (on && !mod) {
      if (!Z.loading) { Z.loading = 1; import('../atlas/lens.js' + V).then((m) => { mod = m; }, (e) => { fail = true; console.warn('lens', e); }); }
      return;
    }
    Z.on = on;
    const sec = L.root.parentElement;
    if (on) {
      if (!document.getElementById('lst-lens-css')) { const s = document.createElement('style'); s.id = 'lst-lens-css'; s.textContent = LCSS; document.head.appendChild(s); }
      if (!Z.lens) {
        try { Z.lens = mod.createLens(L.root, { force2d: LQ === '2d' }); } catch (e) { fail = true; Z.on = false; console.warn('lens', e); return; }
        Z.tilt = mod.createTilt((p) => { Z.tp = p; });
      }
      sec.classList.add('lst-lens'); Z.lens.show(true); bind(c, true);
      Z.ph = L.mode === 'auto' ? 1 : 0; Z.lastMode = L.mode; Z.lt = 0; Z.held = -2; Z.tilt.rebase(Z.ph);
      if (c.reduced) { if (!Z.swDone) { Z.sweep = true; Z.sw0 = performance.now(); } }
      else if (!Z.introDone) { Z.introDone = true; Z.intro = performance.now() + 450; }
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission !== 'function' && coarse()) Z.tilt.ask(); else Z.tilt.resume();
      cap(c);
    } else {
      Z.drag = Z.peek = Z.fix = null; Z.intro = null;
      sec.classList.remove('lst-lens'); if (Z.lens) Z.lens.show(false); bind(c, false);
      if (L.cue && L.interacted) L.cue.hidden = true;
      if (Z.tilt) Z.tilt.stop();
    }
  }
  /* the three layers, in world px. mine are drawn by hand (a tapered curve), the queue's by a ruler (a straight hairline);
     roads both drew are warm white and live on the layer that never moves, with the 120 artists */
  function build(c) {
    const d = L.d, nodes = d.nodes, n = nodes.length, px = L.px, s = c.stage(), pad = 12;
    const R = Z.R = { x: s.x - pad, y: s.y - pad, w: s.w + pad * 2, h: s.h * (L.gh || 1) + pad * 2 };
    const key = (i, j) => (i < j ? i * 512 + j : j * 512 + i), comm = L.nodeComm;
    const mapOf = (E) => { const m = new Map(); for (const e of E) { const k = key(e[0], e[1]); m.set(k, Math.max(e[2], m.get(k) || 0)); } return m; };
    const tm = mapOf(d.tap_edges), am = mapOf(d.auto_edges);
    const br = (k) => { const i = (k / 512) | 0, j = k % 512; return comm[i] !== comm[j] && comm[i] !== 'untagged' && comm[j] !== 'untagged'; };
    const TINK = hx(c.PAL.tap);
    Z.nr = new Float32Array(n); for (let i = 0; i < n; i++) Z.nr[i] = 1.4 + (nodes[i].plays_bucket | 0) * 0.62;
    const hand = (g, k, w, col, a) => {
      const i = (k / 512) | 0, j = k % 512, ax = px[i * 2], ay = px[i * 2 + 1], bx = px[j * 2], by = px[j * 2 + 1];
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, sg = (Math.imul(k + 1, 2654435761) >>> 0) & 1 ? 1 : -1;
      const cx = (ax + bx) / 2 - (dy / len) * len * 0.14 * sg, cy = (ay + by) / 2 + (dx / len) * len * 0.14 * sg, W = 0.35 + w * 0.3, N = 14, P = [], Q = [];
      for (let u = 0; u <= N; u++) {
        const t = u / N, m = 1 - t, x = m * m * ax + 2 * m * t * cx + t * t * bx, y = m * m * ay + 2 * m * t * cy + t * t * by;
        let tx = m * (cx - ax) + t * (bx - cx), ty = m * (cy - ay) + t * (by - cy); const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const hw = W * (0.22 + 0.78 * Math.sin(Math.PI * t));
        P.push(x - ty * hw, y + tx * hw); Q.push(x + ty * hw, y - tx * hw);
      }
      g.beginPath(); g.moveTo(P[0], P[1]);
      for (let u = 2; u < P.length; u += 2) g.lineTo(P[u], P[u + 1]);
      for (let u = Q.length - 2; u >= 0; u -= 2) g.lineTo(Q[u], Q[u + 1]);
      g.closePath(); g.fillStyle = 'rgba(' + col + ',' + a + ')'; g.fill();
    };
    const rule = (g, k, w, col, a) => {
      const i = (k / 512) | 0, j = k % 512;
      g.strokeStyle = 'rgba(' + col + ',' + a + ')'; g.lineWidth = 0.55 + w * 0.12;
      g.beginPath(); g.moveTo(px[i * 2], px[i * 2 + 1]); g.lineTo(px[j * 2], px[j * 2 + 1]); g.stroke();
    };
    const only = (m, o) => [...m].filter(([k]) => !o.has(k)).sort((x, y) => br(x[0]) - br(y[0]) || x[1] - y[1]);
    const tOnly = only(tm, am), aOnly = only(am, tm), both = [...tm].filter(([k]) => am.has(k)).map(([k, w]) => [k, Math.max(w, am.get(k))]);
    const dA = (g) => tOnly.forEach(([k, w]) => { const b = br(k); if (b) hand(g, k, w * 3.2, TINK, 0.07); hand(g, k, w, TINK, b ? 0.78 + w * 0.04 : 0.3 + w * 0.04); });
    const dB = (g) => aOnly.forEach(([k, w]) => { const b = br(k); rule(g, k, w, QINK, b ? 0.55 + w * 0.08 : 0.2 + w * 0.035); });
    Z.dS = (g) => {
      both.forEach(([k, w]) => { hand(g, k, w * 2.6, BOTH, 0.06); hand(g, k, w * 0.75, BOTH, 0.66); });
      const h = L.pinned && L.kbFocusIdx != null ? L.kbFocusIdx : -1;
      if (h >= 0) {
        tm.forEach((w, k) => { if (((k / 512) | 0) === h || k % 512 === h) hand(g, k, w * 1.2, TINK, 0.95); });
        am.forEach((w, k) => { if (((k / 512) | 0) === h || k % 512 === h) rule(g, k, w + 2, QINK, 0.95); });
      }
      for (let i = 0; i < n; i++) {
        const x = px[i * 2], y = px[i * 2 + 1], r = Z.nr[i];
        g.fillStyle = 'rgba(' + hx(c.famColor(nodes[i].community)) + ',.3)'; g.beginPath(); g.arc(x, y, r + 3.2, 0, 6.2832); g.fill();
        g.fillStyle = 'rgba(241,236,255,.93)'; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      }
    };
    Z.lens.layers(R, dA, dB, Z.dS);
    Z.px = px; Z.held = L.pinned && L.kbFocusIdx != null ? L.kbFocusIdx : -1;
  }
  function frame(t, c) {
    const t0 = performance.now();
    if (L.px !== Z.px) build(c);
    const tg = L.mode === 'auto' ? 1 : 0, red = !!c.reduced;
    if (L.mode !== Z.lastMode) { if (!Z.self && Z.tilt.live) Z.tilt.rebase(tg); Z.self = false; Z.lastMode = L.mode; }
    const tl = Z.tilt.live && Z.tp != null && Math.abs(Z.tp - Z.tilt.T.base) > 0.04; /* a phone held still is not a hand */
    const pk = Z.fix != null ? Z.fix : Z.peek != null ? tg + Z.peek : null;
    let hand = Z.drag != null ? Z.drag : pk != null ? pk : tl ? Z.tp : null, goal = tg, ov = 0;
    if (hand != null) {
      goal = cl01(hand); const ex = hand - goal;
      ov = Math.max(-0.2, Math.min(0.2, ex * (pk != null && Z.drag == null ? 0.3 : 0.6)));
      if (Z.drag == null && pk == null) { Z.intro = null; if (L.mode === 'tap' && goal > 0.68) commit('auto', c); else if (L.mode === 'auto' && goal < 0.32) commit('tap', c); }
    } else if (Z.sweep) goal = 0.5 - 0.5 * Math.cos(((t - Z.sw0) / 16000) * 6.2832) * (tg ? -1 : 1);
    else if (Z.intro != null) {
      const u = (t - Z.intro) / 3000;
      if (u >= 1) Z.intro = null; else if (u > 0) { const b = Math.sin(Math.PI * u * u * (3 - 2 * u)); goal = tg ? 1 - b : b; }
    }
    const dt = Z.lt ? Math.min(0.1, (t - Z.lt) / 1000) : 0.016; Z.lt = t;
    if (red && hand == null) Z.ph = goal; else Z.ph += (goal - Z.ph) * Math.min(1, dt * (hand != null ? 18 : Z.intro != null ? 30 : 7));
    Z.over += (ov - Z.over) * Math.min(1, dt * 12);
    const br = !red && hand == null && Z.intro == null && !Z.sweep ? Math.abs(0.03 * Math.sin(t / 1400)) : 0;
    const ph = cl01(Z.ph + (tg ? -br : br));
    const h = L.pinned && L.kbFocusIdx != null ? L.kbFocusIdx : -1;
    if (h !== Z.held) { Z.held = h; Z.lens.restatic(Z.dS); }
    const f = L.kbFocusIdx, ring = f != null && L.px ? [L.px[f * 2], L.px[f * 2 + 1], Z.nr[f] + 6, 0.9] : [0, 0, 0, 0];
    Z.lens.render({ ph, over: Z.over, t: red ? 0 : (t * 0.0006) % 6.2832, ring, cam: camOf(c), vw: innerWidth, vh: innerHeight });
    Z.vis = ph;
    if (Z.pt) { Z.dts.push(t - Z.pt); if (Z.dts.length > 600) Z.dts.shift(); } Z.pt = t;
    Z.cost.push(performance.now() - t0); if (Z.cost.length > 600) Z.cost.shift();
  }
  const fr = L.frame;
  L.frame = function (g, t, b, w, h, c) {
    const on = want(c); if (on !== Z.on) setOn(on, c);
    const r = fr.call(L, g, t, b, w, h, c);
    if (Z.on) { try { frame(t, c); } catch (e) { console.warn('lens', e); fail = true; setOn(false, c); } }
    return r;
  };
  const dt0 = L.drawTrails;
  L.drawTrails = function (c) { if (Z.on) { if (!Z.clr) { Z.clr = 1; q(() => c.atlas.setLines(null)); } return; } Z.clr = 0; return dt0.apply(L, arguments); };
  const lv = L.leave;
  L.leave = function (c) { if (Z.on) setOn(false, c); return lv.call(L, c); };
  const le = L.layoutEdges;
  L.layoutEdges = function (c) { const r = le.call(L, c); if (Z.on) cap(c); return r; };
  const hc = L.hideCue;
  L.hideCue = function () { if (Z.on) { L.interacted = true; L.pulseSet = null; return; } return hc.call(L); };
  const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3) : 0; };
  L.__lens = {
    state: () => ({ on: Z.on, kind: Z.lens ? Z.lens.kind : null, ph: Z.vis, mode: L.mode, held: Z.held, sweep: Z.sweep, intro: Z.intro != null, tilt: Z.tilt ? Z.tilt.live : false, drag: Z.drag != null,
      cost: { p50: pct(Z.cost, 0.5), p95: pct(Z.cost, 0.95), n: Z.cost.length }, dt: { p50: pct(Z.dts, 0.5), p95: pct(Z.dts, 0.95) }, rect: Z.R, cap: L.cue ? L.cue.textContent : '' }),
    peek: (p) => { Z.intro = null; Z.sweep = false; Z.fix = p; },
    unpeek: () => { Z.fix = null; },
    reset: () => { Z.cost.length = 0; Z.dts.length = 0; Z.pt = 0; },
    screen: (wx, wy) => { const k = camOf(ctx); return [wx * k[2] + k[0], wy * k[2] + k[1]]; },
  };
}
