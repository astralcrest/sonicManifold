/* sonic manifold atlas: the camera (BUILD_SPEC_V2 §1.5, package M2).
   world = the active room's own css-px layout (today's screen space, built from stage()). the camera never moves a
   particle, never calls resize() and never writes stage(); it holds one pose and hands out the numbers every consumer
   uses. one formula per mode, shared by apply, unapply, matrix and project:
     pan      sx = (wx - cx)·z + cx0          matrix = [z, 0, 0, z, cx0 - cx·z, cy0 - cy·z]   (home = identity)
     orbit    the room projects its own sphere from yaw, pitch, z (radius scale); world = screen
     orbit3d  p = xyz - target, yaw about y, pitch about x, depth = z2 + 2.2·dist, s = 2.2·R / depth
   pan poses are stored against the stage (u, v, z), so a resize or rotation re-applies the same view to the new stage
   instead of going home (§1.5). flights use gcdatlas's speed table (starts at once, peaks mid-trip, settles gently)
   and gcdatlas's van wijk-nuij zoom-and-pan path (pan and orbit3d). a trip of more than 1.5 of the current view's widths
   is a hop (out, across, in, with the whoosh), and so is every flight that locks on a name, even to a target on screen
   (the trip profile below). reduced motion: every flight is a jump. */

const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fin = (v) => typeof v === 'number' && isFinite(v);
const num = (v, d) => { if (v === null || v === undefined || v === '') return d; const n = +v; return isFinite(n) ? n : d; };
const wrapA = (a) => { a = (a + PI) % TAU; if (a < 0) a += TAU; return a - PI; };
const now = () => performance.now();
const f3 = (v) => String(+(+v).toFixed(3) || 0);

/* gcdatlas's fly-to speed profile: local speed v(x) = sin(πx)·0.85 + 0.15(1-x) + 0.025x over 64 slices. PROG[i] is the
   time fraction at which the trip is i/64 done; ease(u) inverts it (progress at time u). */
const PROG = (() => { const t = [0]; let acc = 0; for (let i = 1; i <= 64; i++) { const x = (i - 0.5) / 64; acc += 1 / (Math.sin(PI * x) * 0.85 + 0.15 * (1 - x) + 0.025 * x); t.push(acc); } return t.map((v) => v / acc); })();
export function ease(u) {
  if (!(u > 0)) return 0; if (u >= 1) return 1;
  let lo = 0, hi = 64; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PROG[m] <= u) lo = m; else hi = m; }
  return (lo + (u - PROG[lo]) / (PROG[hi] - PROG[lo])) / 64;
}
/* van wijk & nuij optimal zoom-and-pan (numerically stable forms, rho 1.3). w = visible world width, u = distance along the line */
export function vwPath(u1, w0, w1, rho = 1.3) {
  if (u1 < 1e-7 * Math.min(w0, w1)) { const k = Math.log(w1 / w0); return { S: Math.abs(k) / rho + 1e-6, u: () => 0, w: (s) => w0 * Math.exp(Math.sign(k) * rho * s) }; }
  const r4 = rho * rho * rho * rho;
  const b0 = (w1 * w1 - w0 * w0 + r4 * u1 * u1) / (2 * w0 * rho * rho * u1), b1 = (w1 * w1 - w0 * w0 - r4 * u1 * u1) / (2 * w1 * rho * rho * u1);
  const r0 = -Math.asinh(b0), r1 = -Math.asinh(b1);
  return { S: (r1 - r0) / rho, u: (s) => w0 * Math.sinh(rho * s) / (rho * rho * Math.cosh(rho * s + r0)), w: (s) => w0 * Math.cosh(r0) / Math.cosh(rho * s + r0) };
}

/* pose strings (§5 `c=`): pan `z,u,v` · orbit `o,yaw,pitch,z` · orbit3d `u,yaw,pitch,dist,x,y,z` */
export function decode(str) {
  if (typeof str !== 'string') return null;
  const a = str.trim().split(','); if (!a.length || a.length > 7) return null;
  const n = (k) => { const v = parseFloat(a[k]); return isFinite(v) ? v : null; };
  if (a[0] === 'o') { const y = n(1), p = n(2), z = n(3); return y === null || p === null || z === null || a.length !== 4 ? null : { mode: 'orbit', yaw: y, pitch: p, z }; }
  if (a[0] === 'u') { const v = [1, 2, 3, 4, 5, 6].map(n); return a.length !== 7 || v.some((x) => x === null) ? null : { mode: 'orbit3d', yaw: v[0], pitch: v[1], dist: v[2], target: [v[3], v[4], v[5]] }; }
  const z = n(0), u = n(1), v = n(2); return a.length !== 3 || z === null || u === null || v === null ? null : { mode: 'pan', z, u, v };
}
export function encode(p) {
  if (!p || typeof p !== 'object') return '';
  if (p.mode === 'pan') return f3(p.z) + ',' + f3(p.u) + ',' + f3(p.v);
  if (p.mode === 'orbit') return 'o,' + f3(p.yaw) + ',' + f3(p.pitch) + ',' + f3(p.z);
  if (p.mode === 'orbit3d') { const t = p.target || [0, 0, 0]; return 'u,' + f3(p.yaw) + ',' + f3(p.pitch) + ',' + f3(p.dist) + ',' + f3(t[0]) + ',' + f3(t[1]) + ',' + f3(t[2]); }
  return '';
}

/* the trip profile (object trips and K6 travel): log view width = the straight line from w0 to w1 plus A·sin(πe), A ≥ 0
   chosen so the widest view of the trip is wPeak (A = 0 when the ends are already that wide, so a target dead ahead is a
   straight zoom and the pull-out grows smoothly with the distance). the pan follows the width (fr ∝ ∫w de), so the view
   slides across at one steady screen speed while it is out: out, across, in. at(e, o) writes [pan fraction, view width]
   into o. S is its length in the vw metric (ds² = (du/w)² + (d ln w / ρ)²), for the timing */
const TN = 64;
export function tripPath(du, w0, w1, wPeak, rho = 1.3) {
  const l0 = Math.log(w0), l1 = Math.log(w1), lp = Math.log(wPeak);
  let A = 0;
  if (lp > Math.max(l0, l1) + 1e-9) {
    const top = (a) => { let m = -Infinity; for (let i = 0; i <= TN; i++) { const e = i / TN, v = l0 + (l1 - l0) * e + a * Math.sin(PI * e); if (v > m) m = v; } return m; };
    let lo = 0, hi = lp - Math.min(l0, l1) + 1;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (top(m) < lp) lo = m; else hi = m; }
    A = (lo + hi) / 2;
  }
  const W = new Float64Array(TN + 1), F = new Float64Array(TN + 1);
  let peak = 0, S = 0;
  for (let i = 0; i <= TN; i++) { const e = i / TN; W[i] = Math.exp(l0 + (l1 - l0) * e + A * Math.sin(PI * e)); if (W[i] > peak) peak = W[i]; }
  for (let i = 1; i <= TN; i++) F[i] = F[i - 1] + (W[i - 1] + W[i]) / 2;
  const tot = F[TN];
  for (let i = 1; i <= TN; i++) F[i] /= tot;
  F[TN] = 1;
  for (let i = 1; i <= TN; i++) S += Math.hypot(du * (F[i] - F[i - 1]) * 2 / (W[i - 1] + W[i]), Math.log(W[i] / W[i - 1]) / rho);
  return {
    S, A, peak, trip: true,
    at(e, o) { const x = clamp(e, 0, 1) * TN, i = Math.min(TN - 1, x | 0); o[0] = F[i] + (F[i + 1] - F[i]) * (x - i); o[1] = Math.exp(l0 + (l1 - l0) * e + A * Math.sin(PI * e)); return o; },
  };
}
/* the same at(e, o) and peak over the van wijk-nuij path, so a flight steps either one the same way */
function vwTrip(du, w0, w1) {
  const p = vwPath(du, w0, w1, 1.3); let peak = Math.max(w0, w1);
  for (let i = 1; i < 24; i++) peak = Math.max(peak, p.w(p.S * i / 24));
  p.peak = peak;
  p.at = (e, o) => { const s = e * p.S; o[1] = p.w(s); o[0] = du > 1e-9 ? clamp(p.u(s) / du, 0, 1) : e; return o; };
  return p;
}

const MODES = ['pan', 'orbit', 'orbit3d'];
/* travel is a trip, not a cut (G2). flight times (s) from the path length L in the vw metric: clamp(base + perL·L, base,
   max), gcdatlas's cinematic / quick / warp form, capped for worlds a screen or two across */
const PAN_DUR = { slow: [1.6, 0.42, 4.0], quick: [1.3, 0.2, 2.4], warp: [0.3, 0.1, 0.6] };
/* a hop goes out, across and in: a target more than HOP_W of the current view's widths away, or any object trip (a flight
   that locks on a name: a label, a tap on the field, a search hit, a stop's named angle), even to a target on screen */
const HOP_W = 1.5;
const HOP_DUR = { slow: [2.2, 0.42, 4.0], quick: [1.6, 0.2, 2.4], warp: [0.4, 0.1, 0.6] };
const HOP3_DUR = { slow: [2.4, 0.42, 8.0], quick: [1.8, 0.2, 4.5], warp: [0.6, 0.03, 0.9] };
/* an object trip's widest view is (1 + TRIP_K·x) of the wider end's view, x = the distance in those widths (≤ HOP_W):
   about 0.87x of the zoom for a name a third of the screen away, meeting the vw path's own 0.6x where a trip becomes a long hop */
const TRIP_K = 0.5;
/* the only flights kept brisk: a keyboard home (0, escape) and a double-tap */
const NUDGE = 0.5;
/* mid-flight the view may pull out to PULL_FLOOR of the room's widest zoom, never further */
const PULL_FLOOR = 0.5;
/* a stop change lands like the end of a trip (K6): the new room opens pulled back to ARRIVE.pull of its home and glides in */
const ARRIVE = { pull: 0.6, dur: { slow: 2.4, quick: 1.8, warp: 0.6 } };
const SPEEDS = { slow: 'slow', cinematic: 'slow', quick: 'quick', normal: 'quick', warp: 'warp', fast: 'warp' };
const peakOf = (wRef, w1, du) => { const wm = Math.max(wRef, w1); return wm * (1 + TRIP_K * Math.min(du / wm, HOP_W)); };

export function createView(ctx) {
  const RED = !!(ctx && ctx.reduced);
  const AT = () => (ctx && ctx.atlas) || {};
  const tier = () => { const g = AT().gov; return g && g.tier ? g.tier : 0; };
  const S = {
    mode: 'none', cfg: {}, st: { x: 0, y: 0, w: 1, h: 1 }, cx0: 0, cy0: 0, b: null, home: null,
    zMin: 1, zMax: 3, dMin: 0.06, dMax: 2.6,
    cx: 0, cy: 0, z: 1, zT: 1, anc: null,                      /* pan (z doubles as the orbit radius scale) */
    yaw: 0, pitch: 0, dist: 1, distT: 1, tx: 0, ty: 0, tz: 0,   /* orbit / orbit3d */
    dcx: 0, dcy: 0, dyaw: 0, dA: 0, dTau: 0,                    /* idle drift, kept apart from the pose (§2.7) */
    lock: null, manual: false, manualAt: -1e9, settleAt: -1e9, gest: false, hand: false, outToast: false,
    fl: null, dirty: true, why: 'config', lastState: '', cfgAt: 0, resizeAt: 0,
  };
  const CH = [], MAN = [], LAYERS = [];
  const P3 = { cx0: 0, cy0: 0, R: 1, F: 1, D: 2.2, cyaw: 1, syaw: 0, cp: 1, sp: 0, tx: 0, ty: 0, tz: 0 };

  function readStage() {
    let s = null; try { s = ctx.stage && ctx.stage(); } catch (e) {}
    if (!s || !(s.w > 0) || !(s.h > 0)) s = { x: 0, y: 0, w: innerWidth || 1, h: innerHeight || 1 };
    return { x: +s.x || 0, y: +s.y || 0, w: +s.w, h: +s.h };
  }
  function dirty(why) { S.dirty = true; if (!S.why || why === 'config' || why === 'resize') S.why = why; }
  /* where the view centre may roam at zoom z: the visible part of the stage stays over the room's world rect, with 15%/z of
     give. at z = 1 that is a nudge; zoomed in, every edge of the room can be brought to the middle of the stage */
  const RNG = [0, 0, 0, 0];
  function panRange(z) {
    const b = S.b || S.st, hw = S.st.w / 2 / z, hh = S.st.h / 2 / z, mx = 0.15 * b.w / z, my = 0.15 * b.h / z;
    let x0 = b.x + hw - mx, x1 = b.x + b.w - hw + mx, y0 = b.y + hh - my, y1 = b.y + b.h - hh + my;
    if (x0 > x1) { const c = b.x + b.w / 2; x0 = c - mx; x1 = c + mx; }
    if (y0 > y1) { const c = b.y + b.h / 2; y0 = c - my; y1 = c + my; }
    RNG[0] = x0; RNG[1] = x1; RNG[2] = y0; RNG[3] = y1; return RNG;
  }
  function clampPan() { const r = panRange(S.z); S.cx = clamp(S.cx, r[0], r[1]); S.cy = clamp(S.cy, r[2], r[3]); }
  function safeLook(k) { try { const r = S.cfg.look(k, ctx); return Array.isArray(r) && r.every(fin) ? r : null; } catch (e) { return null; } }
  function bake() {
    if (S.dcx || S.dcy) { S.cx += S.dcx; S.cy += S.dcy; S.dcx = S.dcy = 0; }
    if (S.dyaw) { S.yaw = wrapA(S.yaw + S.dyaw); S.dyaw = 0; }
    S.dA = 0; S.dTau = 0;
  }
  function endFlight(ok) {
    const f = S.fl; if (!f) return; S.fl = null; clearTimeout(f.timer);
    /* stopped mid-trip (or mid-arrival) the view may be further out than the room allows: it eases back into range */
    if (!ok) { S.zT = clamp(S.z, S.zMin, S.zMax); S.distT = clamp(S.dist, S.dMin, S.dMax); }
    try { f.res(ok); } catch (e) {}
  }
  function normPose() {
    const st = S.st;
    if (S.mode === 'pan') return { mode: 'pan', z: S.z, u: (S.cx - st.x) / st.w, v: (S.cy - st.y) / st.h };
    if (S.mode === 'orbit') return { mode: 'orbit', yaw: S.yaw, pitch: S.pitch, z: S.z };
    if (S.mode === 'orbit3d') return { mode: 'orbit3d', yaw: S.yaw, pitch: S.pitch, dist: S.dist, target: [S.tx, S.ty, S.tz] };
    return { mode: 'none' };
  }
  /* any pose form -> an absolute target in the current mode, clamped; null when it does not fit this mode. raw: what the
     pose leaves out is taken from the pose without the idle drift (an ambient move runs under a drift that carries on) */
  function resolve(p, raw) {
    if (p == null) return null;
    if (typeof p === 'string') { p = decode(p); if (!p) return null; }
    if (typeof p !== 'object') return null;
    const m = S.mode; if (m === 'none' || (p.mode && p.mode !== m)) return null;
    if (m === 'pan') {
      const st = S.st; let x = null, y = null;
      if (p.look != null && S.cfg.look) { const r = safeLook(p.look); if (r) { x = r[0]; y = r[1]; } }
      if (x === null) {
        if (fin(p.wx) && fin(p.wy)) { x = p.wx; y = p.wy; }
        else if (fin(p.cx) && fin(p.cy)) { x = p.cx; y = p.cy; }
        else if (fin(p.u) && fin(p.v)) { x = st.x + p.u * st.w; y = st.y + p.v * st.h; }
        else if (raw) { x = S.cx; y = S.cy; }
        else { x = S.cx + S.dcx; y = S.cy + S.dcy; }
      }
      const z = clamp(num(p.z, S.z), S.zMin, S.zMax), r = panRange(z);
      return { cx: clamp(x, r[0], r[1]), cy: clamp(y, r[2], r[3]), z };
    }
    const yaw0 = raw ? S.yaw : S.yaw + S.dyaw;
    if (m === 'orbit') return { yaw: wrapA(num(p.yaw, yaw0)), pitch: clamp(num(p.pitch, S.pitch), -1.52, 1.52), z: clamp(num(p.z, S.z), S.zMin, S.zMax) };
    let t = null;
    if (p.look != null) { if (p.look === 'centre' || p.look === 'center') t = [0, 0, 0]; else if (S.cfg.look) t = safeLook(p.look); }
    if (!t && Array.isArray(p.target) && p.target.length === 3 && p.target.every(fin)) t = p.target;
    if (!t && fin(p.x) && fin(p.y)) t = [p.x, p.y, num(p.z3, 0)];
    if (!t) t = [S.tx, S.ty, S.tz];
    return { yaw: wrapA(num(p.yaw, yaw0)), pitch: clamp(num(p.pitch, S.pitch), -1.52, 1.52), dist: clamp(num(p.dist, S.dist), S.dMin, S.dMax), t: t.map((v) => clamp(v, -1.5, 1.5)) };
  }
  /* put the camera on q. place() leaves the idle drift running (an ambient move lands under it); jump() is a new pose */
  function place(q) {
    if (S.mode === 'pan') { S.cx = q.cx; S.cy = q.cy; S.z = S.zT = q.z; S.anc = null; clampPan(); }
    else if (S.mode === 'orbit') { S.yaw = q.yaw; S.pitch = q.pitch; S.z = S.zT = q.z; }
    else if (S.mode === 'orbit3d') { S.yaw = q.yaw; S.pitch = q.pitch; S.dist = S.distT = q.dist; S.tx = q.t[0]; S.ty = q.t[1]; S.tz = q.t[2]; }
    dirty('set');
  }
  function jump(q) { place(q); S.dcx = S.dcy = S.dyaw = 0; S.dA = 0; S.dTau = 0; S.settleAt = now(); }
  /* the travel speed: the visitor's own pick always wins (slow is the default); reduced motion reads as quick */
  function speedOf(o) {
    if (tier() >= 5) return 'warp';
    if (RED) return 'quick';
    let user = null; try { user = SPEEDS[ctx.settings.get('travel')] || null; } catch (e) {}
    return user || SPEEDS[o && o.speed] || SPEEDS[S.cfg.speed] || 'slow';
  }
  function sameQ(a, b) {
    if (S.mode === 'pan') { const z = Math.max(a.z, b.z); return Math.abs(a.cx - b.cx) * z < 1.5 && Math.abs(a.cy - b.cy) * z < 1.5 && Math.abs(a.z - b.z) < 1e-3 * z; }
    const ang = Math.abs(wrapA(a.yaw - b.yaw)) < 1e-3 && Math.abs(a.pitch - b.pitch) < 1e-3;
    if (S.mode === 'orbit') return ang && Math.abs(a.z - b.z) < 1e-3 * a.z;
    return ang && Math.abs(a.dist - b.dist) < 1e-3 * a.dist && Math.hypot(a.t[0] - b.t[0], a.t[1] - b.t[1], a.t[2] - b.t[2]) < 1e-3;
  }
  /* one flight at a time; a new flight or any input aborts the current one from wherever the camera is.
     o: speed, lock (an object trip: always the hop path), hop (true / false overrides that), short (a reframe: straight,
     no hop), nudge (short, and at most NUDGE s), pullback (K6: the widest zoom as a share of the starting zoom),
     dur (s), whoosh:false, ambient (K6: a camera move that is not a trip), ref (a carried trip's reference view).
     src: the pose as the caller gave it; the same flight asked for again while it flies (the same target, or the same
     pose sent again by a room after the chrome's relayout) keeps flying: no restart, no second pull-out */
  function fly(q, o, src) {
    o = o || {};
    const amb = !!o.ambient, cur = S.fl;
    let key = null; if (src != null) { try { key = typeof src === 'string' ? src : JSON.stringify(src); } catch (e) {} }
    if (cur && !amb && !cur.amb && cur.mode === S.mode && (sameQ(cur.q, q) || (key !== null && cur.key === key))) return cur.pr;
    /* a trip that takes over from one in flight keeps that chain's starting view as its reference, so stepping from name
       to name mid-flight never ratchets the view further out */
    const ref = cur && !cur.amb && cur.mode === S.mode ? cur.ref : 0;
    endFlight(false); if (!amb) bake(); S.anc = null;
    const f = { t0: now(), mode: S.mode, q, key, res: null, pr: null, dur: 0, hop: false, amb, ref: 0, path: null };
    f.pr = new Promise((r) => { f.res = r; });
    const sp = speedOf(o), short = !!o.short || !!o.nudge;
    const pb = fin(o.pullback) && o.pullback > 0 && o.pullback < 1 ? Math.max(o.pullback, 0.1) : null;
    const trip = !short && !amb && (pb !== null || (o.hop !== undefined ? !!o.hop : !!o.lock));
    const T = (tab, L) => clamp(tab[sp][0] + tab[sp][1] * L, tab[sp][0], tab[sp][2]);
    let dur = 0;
    if (S.mode === 'pan') {
      /* w = the visible world width. past HOP_W widths the vw path pulls out by itself (about 0.62x at 1.5, 0.37x at 3);
         nearer, an object trip takes the trip profile so it still goes out, across and in */
      const dx = q.cx - S.cx, dy = q.cy - S.cy, du = Math.hypot(dx, dy), W = S.st.w, w0 = W / S.z, w1 = W / q.z;
      f.ref = fin(o.ref) && o.ref > 0 ? o.ref : ref || S.z;
      const far = !short && du / w0 > HOP_W;
      let path = vwTrip(du, w0, w1);
      if (trip) { const wPk = pb !== null ? w0 / pb : peakOf(W / f.ref, w1, du); if (pb !== null ? path.peak < wPk : !far) path = tripPath(du, w0, w1, wPk); }
      f.hop = !amb && (far || trip);
      Object.assign(f, { x0: S.cx, y0: S.cy, dx, dy, du, W, path });
      dur = du < 0.25 && Math.abs(q.z - S.z) < 1e-4 && pb === null ? 0 : T(f.hop ? HOP_DUR : PAN_DUR, Math.max(0, path.S || 0));
    } else if (S.mode === 'orbit') {
      const dyw = wrapA(q.yaw - S.yaw), dp = q.pitch - S.pitch, lz = Math.log(q.z / S.z), ang = Math.hypot(dyw, dp);
      Object.assign(f, { y0: S.yaw, dyw, p0: S.pitch, dp, lz0: Math.log(S.z), lz, ref: S.z });
      /* a swing about the sphere already reads as travel; only K6 pulls it back (the view width here is 1/z) */
      if (pb !== null) { f.path = tripPath(0, 1 / S.z, 1 / q.z, 1 / (S.z * pb)); f.hop = true; }
      const base = 0.9 + 0.55 * ang + 0.8 * Math.abs(lz);
      dur = ang < 1e-4 && Math.abs(lz) < 1e-4 && pb === null ? 0 : sp === 'slow' ? clamp(base * 1.5, 1.2, 3.4) : sp === 'warp' ? clamp(base * 0.45, 0.4, 1.0) : clamp(base, 0.8, 2.6);
      if (f.hop) dur = Math.max(dur, T(HOP_DUR, f.path.S + ang));
    } else {
      const dyw = wrapA(q.yaw - S.yaw), dp = q.pitch - S.pitch, g0 = [S.tx, S.ty, S.tz];
      const dT = Math.hypot(q.t[0] - g0[0], q.t[1] - g0[1], q.t[2] - g0[2]), ld = Math.log(q.dist / S.dist), ang = Math.hypot(dyw, dp);
      /* gcdatlas's own 3d flight: the van wijk-nuij path over (target travel, view width). the view width at the target is
         kW·dist layout units (the projection shows R/dist px per unit). a step (set(), a day step) is a reframe, not a trip:
         no path, dist straight in log space */
      const kW = S.st.w / (0.42 * Math.min(S.st.w, S.st.h)), w0 = kW * S.dist, w1 = kW * q.dist;
      f.ref = fin(o.ref) && o.ref > 0 ? o.ref : ref || S.dist;
      const far = !short && dT / w0 > HOP_W;
      let path = short ? null : vwTrip(dT, w0, w1);
      if (path && trip) { const wPk = pb !== null ? w0 / pb : peakOf(kW * f.ref, w1, dT); if (pb !== null ? path.peak < wPk : !far) path = tripPath(dT, w0, w1, wPk); }
      f.hop = !amb && (far || trip);
      Object.assign(f, { y0: S.yaw, dyw, p0: S.pitch, dp, g0, ld0: Math.log(S.dist), ld, dT, kW, path });
      const slow = clamp(1.6 + 0.9 * dT + 0.5 * Math.abs(ld) + 0.35 * ang, 2.0, 6.0);
      dur = dT < 1e-5 && Math.abs(ld) < 1e-5 && ang < 1e-5 && pb === null ? 0 : short ? clamp(0.5 + 0.3 * dT + 0.2 * ang, 0.5, 0.9) : sp === 'slow' ? slow : sp === 'warp' ? clamp(slow * 0.25, 0.4, 0.9) : Math.max(1.0, slow * 0.55);
      if (f.hop && dur > 0) dur = Math.max(dur, T(HOP3_DUR, Math.max(0, path.S || 0)));
    }
    if (o.nudge && dur > 0) dur = Math.min(dur, NUDGE);
    if (o.dur > 0 && dur > 0) dur = o.dur;
    if (dur <= 0 || RED) {
      if (amb) { if (!RED) place(q); f.res(!RED); return f.pr; }
      jump(q); f.res(true); return f.pr;
    }
    f.dur = dur * 1000; S.fl = f;
    f.timer = setTimeout(() => { if (S.fl === f) { land(f); } }, f.dur + 400); /* a hidden tab or a stalled loop still arrives */
    if (!amb && o.whoosh !== false && (dur >= 0.8 || f.hop)) { try { ctx.audio && ctx.audio.whoosh && ctx.audio.whoosh(dur); } catch (e) {} }
    dirty('fly');
    return f.pr;
  }
  function land(f) { S.fl = null; clearTimeout(f.timer); if (f.amb) place(f.q); else jump(f.q); dirty('fly'); try { f.res(true); } catch (e) {} }
  const PA = [0, 0];
  function stepFlight(t) {
    const f = S.fl, u = clamp((Math.max(t, now()) - f.t0) / f.dur, 0, 1);
    if (u >= 1) { land(f); return; }
    const e = ease(u);
    if (f.mode === 'pan') {
      f.path.at(e, PA);
      S.cx = f.x0 + f.dx * PA[0]; S.cy = f.y0 + f.dy * PA[0]; S.z = S.zT = clamp(f.W / PA[1], S.zMin * PULL_FLOOR, S.zMax);
      if (!fin(S.z)) S.z = S.zT = f.q.z;
    } else if (f.mode === 'orbit') {
      S.yaw = wrapA(f.y0 + f.dyw * e); S.pitch = f.p0 + f.dp * e;
      S.z = S.zT = f.path ? clamp(1 / f.path.at(e, PA)[1], S.zMin * PULL_FLOOR, S.zMax) : Math.exp(f.lz0 + f.lz * e);
    } else {
      S.yaw = wrapA(f.y0 + f.dyw * e); S.pitch = f.p0 + f.dp * e;
      let fr = e, d;
      if (f.path) { f.path.at(e, PA); d = PA[1] / f.kW; if (f.dT > 1e-6) fr = PA[0]; }
      else d = Math.exp(f.ld0 + f.ld * e);
      S.tx = f.g0[0] + (f.q.t[0] - f.g0[0]) * fr; S.ty = f.g0[1] + (f.q.t[1] - f.g0[1]) * fr; S.tz = f.g0[2] + (f.q.t[2] - f.g0[2]) * fr;
      S.dist = S.distT = clamp(d, S.dMin * PULL_FLOOR, S.dMax / PULL_FLOOR);
    }
    if (!(fin(S.cx) && fin(S.cy) && fin(S.z) && fin(S.yaw) && fin(S.pitch) && fin(S.dist) && fin(S.tx) && fin(S.ty) && fin(S.tz))) { land(f); return; }
    dirty('fly');
  }
  /* manual input: stops any flight where it is, keeps the drift where it got to, pauses a playing tour (§1.10) */
  function input(kind, keepLock) {
    endFlight(false); bake();
    const tn = now(), fresh = !S.manual || tn - S.manualAt > 250 || (!keepLock && S.lock); /* a wheel burst tells the world once, not 60 times a second */
    S.manual = true; S.manualAt = tn;
    if (!keepLock) S.lock = null;
    try { const T = ctx.tour, a = T && T.active; if (a && a.playing && T.pause) T.pause('manual'); } catch (e) {}
    if (fresh) {
      for (let k = 0; k < MAN.length; k++) { try { MAN[k](kind); } catch (e) {} }
      try { document.dispatchEvent(new CustomEvent('atlas:manual', { detail: { kind } })); } catch (e) {}
    }
    dirty('input');
  }
  const keepOrbit = () => S.mode === 'orbit3d' || S.mode === 'orbit';
  function outToast(zoomingOut, atLimit) {
    if (!zoomingOut || !atLimit || S.outToast) return;
    S.outToast = true;
    try { ctx.toast && ctx.toast('zoomed all the way out · next stop with → or the pill'); } catch (e) {}
  }

  /* ------------------------------------------------------------------ raw moves (no input bookkeeping) */
  function panRaw(dx, dy) {
    if (S.mode === 'pan') { S.cx -= dx / S.z; S.cy -= dy / S.z; S.anc = null; S.zT = clamp(S.z, S.zMin, S.zMax); clampPan(); dirty('input'); }
    else if (S.mode === 'orbit3d') slideRaw(dx, dy);
  }
  /* the sign is chosen so the surface facing the camera follows the finger under §1.5's projection, which is how gcdatlas
     feels (its own `yaw -= dx` moves a camera position; here the pose rotates the points, so the sign flips) */
  function orbitRaw(dx, dy) {
    if (!keepOrbit()) return;
    S.yaw = wrapA(S.yaw + dx * 0.005); S.pitch = clamp(S.pitch - dy * 0.005, -1.52, 1.52); dirty('input');
  }
  function slideRaw(dx, dy) {
    if (S.mode !== 'orbit3d') return;
    const R = 0.42 * Math.min(S.st.w, S.st.h), s = (2.2 * R) / (2.2 * S.dist), yw = S.yaw + S.dyaw, cy = Math.cos(yw), sy = Math.sin(yw), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
    const ax = dx / s, ay = dy / s;
    S.tx = clamp(S.tx - cy * ax + (-sp * sy) * ay, -1.5, 1.5);
    S.ty = clamp(S.ty + cp * ay, -1.5, 1.5);
    S.tz = clamp(S.tz + sy * ax + (-sp * cy) * ay, -1.5, 1.5);
    dirty('input');
  }
  /* exact zoom (pinch, trackpad gesture): the world point under (sx, sy) stays under it; no easing */
  function zoomRaw(f, sx, sy) {
    if (!(f > 0) || !fin(f)) return;
    if (S.mode === 'pan') {
      if (!fin(sx)) { sx = S.cx0; sy = S.cy0; }
      const wx = (sx - S.cx0) / S.z + S.cx, wy = (sy - S.cy0) / S.z + S.cy;
      S.z = S.zT = clamp(S.z * f, S.zMin, S.zMax); S.cx = wx - (sx - S.cx0) / S.z; S.cy = wy - (sy - S.cy0) / S.z; S.anc = null; clampPan();
    } else if (S.mode === 'orbit') S.z = S.zT = clamp(S.z * f, S.zMin, S.zMax);
    else if (S.mode === 'orbit3d') S.dist = S.distT = clamp(S.dist / f, S.dMin, S.dMax);
    else return;
    dirty('input');
  }
  /* pinch: exact spread ratio about the old midpoint, which then follows the fingers to the new one (pan rooms) */
  function pinchRaw(ratio, mx0, my0, mx1, my1) {
    if (S.mode === 'pan') {
      const wx = (mx0 - S.cx0) / S.z + S.cx, wy = (my0 - S.cy0) / S.z + S.cy;
      S.z = S.zT = clamp(S.z * ratio, S.zMin, S.zMax); S.cx = wx - (mx1 - S.cx0) / S.z; S.cy = wy - (my1 - S.cy0) / S.z; S.anc = null; clampPan(); dirty('input');
    } else zoomRaw(ratio);
  }
  /* eased zoom (wheel, keys, buttons, ladder): a target followed in log space at k = 7/s, anchored at (sx, sy) */
  function zoomEase(f, sx, sy, instant) {
    if (!(f > 0) || !fin(f)) return;
    if (S.mode === 'pan') {
      const was = S.zT; S.zT = clamp(S.zT * f, S.zMin, S.zMax);
      outToast(f < 1, was <= S.zMin + 1e-6);
      if (!fin(sx) || !fin(sy)) { sx = S.cx0; sy = S.cy0; }
      S.anc = { sx, sy, wx: (sx - S.cx0) / S.z + S.cx, wy: (sy - S.cy0) / S.z + S.cy };
      if (instant || RED) { S.z = S.zT; S.cx = S.anc.wx - (sx - S.cx0) / S.z; S.cy = S.anc.wy - (sy - S.cy0) / S.z; S.anc = null; clampPan(); }
    } else if (S.mode === 'orbit') {
      const was = S.zT; S.zT = clamp(S.zT * f, S.zMin, S.zMax); outToast(f < 1, was <= S.zMin + 1e-6);
      if (instant || RED) S.z = S.zT;
    } else if (S.mode === 'orbit3d') {
      const was = S.distT; S.distT = clamp(S.distT / f, S.dMin, S.dMax); outToast(f < 1, was >= S.dMax - 1e-6);
      if (instant || RED) S.dist = S.distT;
    } else return;
    dirty('input');
  }
  function wheelRaw(e) {
    if (S.mode === 'none') return false;
    const k = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1, rate = e.ctrlKey ? 0.01 : 0.0022; /* ctrl+wheel is a trackpad pinch: finer steps, faster rate */
    const x = clamp((e.deltaY || 0) * k * rate, -0.6, 0.6); if (!x) return true;
    input('wheel', keepOrbit());
    zoomEase(Math.exp(-x), e.clientX, e.clientY);
    return true;
  }
  function dblRaw(sx, sy) {
    if (S.mode === 'none') return;
    const atMax = S.mode === 'orbit3d' ? S.distT <= S.dMin * 1.001 : S.zT >= S.zMax * 0.999;
    if (atMax) { home({ nudge: true }); return; }
    input('dbl', keepOrbit());
    zoomEase(1.6, sx, sy);
  }
  /* keyboard on the focused field: the camera moves the way the arrow points (§1.6); shift = 4 steps */
  function keyRaw(key, shift) {
    const m = shift ? 4 : 1, A = key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';
    if (S.mode === 'none') {
      if (!A) return false;
      try { if (key === 'ArrowRight' || key === 'ArrowDown') ctx.tour.next(); else ctx.tour.prev(); } catch (e) {}
      return true;
    }
    if (A) {
      const dx = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0, dy = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
      if (S.mode === 'pan') { input('key', false); panRaw(-dx * 48 * m, -dy * 48 * m); }
      else { input('key', true); orbitRaw(-dx * 24 * m, -dy * 24 * m); }
      return true;
    }
    if (key === '+' || key === '=') { input('key', keepOrbit()); zoomEase(1.25); return true; }
    if (key === '-' || key === '_') { input('key', keepOrbit()); zoomEase(0.8); return true; }
    if (key === '0' || key === 'Escape') { home({ nudge: true }); return true; }
    return false;
  }

  /* ------------------------------------------------------------------ the css-transform layer for world-anchored room dom */
  function layerOf(root) {
    if (!root || root.nodeType !== 1) return null;
    let L = LAYERS.find((l) => l.root === root);
    if (!L) {
      const el = document.createElement('div'); el.className = 'atlas-cam'; el.setAttribute('data-atlas-cam', '');
      root.appendChild(el);
      L = { root, el, sec: root.closest ? root.closest('section') : null, tf: '' };
      LAYERS.push(L); pushLayer(L);
    }
    return L;
  }
  /* move elements into the layer without changing the tab order: the layer goes where the first of them stood, they move
     in document order, and focus that was inside one of them comes back to it */
  function adopt(root, els) {
    const L = layerOf(root); if (!L) return null;
    const list = [...(els || [])].filter((e) => e && e.nodeType === 1 && e !== L.el && !L.el.contains(e) && !e.contains(L.el));
    if (!list.length) return L.el;
    list.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const fa = document.activeElement, back = !!fa && fa !== document.body && list.some((e) => e === fa || e.contains(fa));
    if (!L.el.firstChild && list[0].parentNode) list[0].parentNode.insertBefore(L.el, list[0]);
    const frag = document.createDocumentFragment(); list.forEach((e) => frag.appendChild(e)); L.el.appendChild(frag);
    if (back && fa.isConnected) { try { fa.focus({ preventScroll: true }); } catch (e) {} }
    return L.el;
  }
  function pushLayer(L) {
    const live = S.mode === 'pan' && (!L.sec || L.sec.classList.contains('is-active'));
    let tf = '';
    if (live) { const m = matrix(); if (m[0] !== 1 || m[4] !== 0 || m[5] !== 0) tf = 'matrix(' + m.join(',') + ')'; }
    if (tf !== L.tf) { L.tf = tf; L.el.style.transform = tf; }
  }

  /* ------------------------------------------------------------------ the one formula per mode */
  function matrix() {
    if (S.mode !== 'pan') return [1, 0, 0, 1, 0, 0];
    const z = S.z; return [z, 0, 0, z, S.cx0 - (S.cx + S.dcx) * z, S.cy0 - (S.cy + S.dcy) * z];
  }
  function apply(wx, wy) { if (S.mode !== 'pan') return [wx, wy]; const z = S.z; return [(wx - (S.cx + S.dcx)) * z + S.cx0, (wy - (S.cy + S.dcy)) * z + S.cy0]; }
  function unapply(sx, sy) { if (S.mode !== 'pan') return [sx, sy]; const z = S.z; return [(sx - S.cx0) / z + S.cx + S.dcx, (sy - S.cy0) / z + S.cy + S.dcy]; }
  function proj3() {
    const R = 0.42 * Math.min(S.st.w, S.st.h), yw = S.yaw + S.dyaw;
    P3.cx0 = S.cx0; P3.cy0 = S.cy0; P3.R = R; P3.F = 2.2 * R; P3.D = 2.2 * S.dist;
    P3.cyaw = Math.cos(yw); P3.syaw = Math.sin(yw); P3.cp = Math.cos(S.pitch); P3.sp = Math.sin(S.pitch); P3.tx = S.tx; P3.ty = S.ty; P3.tz = S.tz;
    return P3;
  }
  function project(x, y, z) {
    if (S.mode === 'orbit3d') {
      const q = proj3(), px = x - q.tx, py = y - q.ty, pz = (z || 0) - q.tz;
      const xr = q.cyaw * px - q.syaw * pz, zr = q.syaw * px + q.cyaw * pz, yr = q.cp * py - q.sp * zr, z2 = q.sp * py + q.cp * zr;
      const depth = z2 + q.D, s = q.F / depth;
      return [q.cx0 + xr * s, q.cy0 - yr * s, s, depth];
    }
    if (S.mode === 'pan') { const a = apply(x, y); return [a[0], a[1], S.z, 1]; }
    return [x, y, 1, 1];
  }
  /* a hook for the page's css: html[data-atlas-cam] = the chip state, html.atlas-cam-away while the view is off its home pose
     (a zoomed field can run under the wall text; the chrome may want a scrim there). written only when it changes */
  let docState = '', docAway = null;
  function markDoc(st) {
    const h = S.home; let away = false;
    if (S.mode === 'pan' && h) away = Math.abs(S.z - h.z) > 1e-3 || Math.abs(S.cx - h.cx) > 0.5 || Math.abs(S.cy - h.cy) > 0.5; /* drift is not a move */
    else if (S.mode === 'orbit3d' && h) away = S.dist < h.dist * 0.9 || Math.hypot(S.tx - h.t[0], S.ty - h.t[1], S.tz - h.t[2]) > 0.02;
    else if (S.mode === 'orbit' && h) away = S.z > h.z * 1.1;
    const root = document.documentElement;
    if (st !== docState) { docState = st; root.setAttribute('data-atlas-cam', st); }
    if (away !== docAway) { docAway = away; root.classList.toggle('atlas-cam-away', away); }
  }
  function state() {
    if (S.lock) return 'locked';
    if (S.manual) return 'free';
    try { const a = ctx.tour && ctx.tour.active; if (a && a.playing) return 'tour'; } catch (e) {}
    return 'home';
  }

  /* ------------------------------------------------------------------ public */
  function configure(o) {
    o = o || {};
    const re = !!AT().reenter, mode = MODES.includes(o.mode) ? o.mode : 'none';
    const keep = re && mode === S.mode && mode !== 'none' ? normPose() : null;
    /* a relayout mid-flight (the chrome re-measuring itself) must not stop the flight: it continues to the same target on
       the new stage, in the time it had left */
    let carry = null;
    if (keep && S.fl) {
      const f = S.fl, st = S.st; S.fl = null; clearTimeout(f.timer);
      carry = { res: f.res, left: Math.max(0.12, (f.dur - (now() - f.t0)) / 1000), amb: f.amb, hop: f.hop, ref: f.ref, key: f.key, q: mode === 'pan' ? { z: f.q.z, u: (f.q.cx - st.x) / st.w, v: (f.q.cy - st.y) / st.h } : f.q };
    }
    const dr = keep ? { x: S.dcx / S.st.w, y: S.dcy / S.st.h, yaw: S.dyaw, a: S.dA, tau: S.dTau } : null; /* the drift carries on through a relayout */
    endFlight(false); S.anc = null; S.dcx = S.dcy = S.dyaw = 0; S.dA = 0; S.dTau = 0;
    let arrive = null;
    S.cfg = { drift: !!o.drift, wheel: o.wheel !== false, dbl: o.dbl === undefined ? 'zoom' : o.dbl, speed: o.speed || null, look: typeof o.look === 'function' ? o.look : null };
    S.mode = mode; S.cfgAt = now();
    if (mode !== 'none') {
      S.st = readStage(); S.cx0 = S.st.x + S.st.w / 2; S.cy0 = S.st.y + S.st.h / 2;
      const b = o.bounds; S.b = b && fin(b.x) && fin(b.y) && b.w > 0 && b.h > 0 ? { x: b.x, y: b.y, w: b.w, h: b.h } : null;
      if (mode === 'orbit3d') {
        S.dMin = num(o.distMin, num(o.zMin, 0.06)); S.dMax = num(o.distMax, num(o.zMax, 2.6));
        if (!(S.dMax > S.dMin)) { S.dMin = 0.06; S.dMax = 2.6; }
      } else {
        const d = mode === 'orbit' ? [0.6, 2.2] : [1, 3];
        S.zMin = num(o.zMin, d[0]); S.zMax = num(o.zMax, d[1]); if (!(S.zMax >= S.zMin)) { S.zMin = d[0]; S.zMax = d[1]; }
      }
      /* home: pan {cx, cy, z} | {u, v, z}; orbit {yaw, pitch, z}; orbit3d {yaw, pitch, dist, target | look} */
      const h = o.home || {};
      if (mode === 'pan') { S.cx = S.cx0; S.cy = S.cy0; S.z = S.zT = 1; }
      if (mode === 'pan') S.home = resolve(Object.assign({ z: 1 }, fin(h.cx) || fin(h.u) || fin(h.wx) || h.look != null ? {} : { cx: S.cx0, cy: S.cy0 }, h, { mode: undefined })) || { cx: S.cx0, cy: S.cy0, z: 1 };
      else if (mode === 'orbit') S.home = { yaw: wrapA(num(h.yaw, 0)), pitch: clamp(num(h.pitch, 0), -1.52, 1.52), z: clamp(num(h.z, 1), S.zMin, S.zMax) };
      else {
        S.tx = S.ty = S.tz = 0; S.home = resolve(Object.assign({ yaw: 0, pitch: 0, dist: 1 }, h, { mode: undefined }));
        if (!S.home) S.home = { yaw: 0, pitch: 0, dist: 1, t: [0, 0, 0] };
      }
      if (keep) {
        /* a trip carried through the relayout may be pulled out past the room's range: it stays there and flies on */
        const zLo = carry ? S.zMin * PULL_FLOOR : S.zMin, dHi = carry ? S.dMax / PULL_FLOOR : S.dMax;
        if (mode === 'pan') { S.z = S.zT = clamp(keep.z, zLo, S.zMax); S.cx = S.st.x + keep.u * S.st.w; S.cy = S.st.y + keep.v * S.st.h; if (!carry) clampPan(); }
        else if (mode === 'orbit') { S.z = S.zT = clamp(keep.z, zLo, S.zMax); }
        else { S.dist = S.distT = clamp(keep.dist, S.dMin, dHi); S.yaw = keep.yaw; S.pitch = keep.pitch; S.tx = keep.target[0]; S.ty = keep.target[1]; S.tz = keep.target[2]; }
        if (dr && S.cfg.drift) { S.dcx = dr.x * S.st.w; S.dcy = dr.y * S.st.h; S.dyaw = dr.yaw; S.dA = dr.a; S.dTau = dr.tau; }
      } else {
        S.lock = null; S.manual = false; S.manualAt = -1e9; S.outToast = false;
        jump(S.home);
        const pd = S.pend; S.pend = null; let sent = false;
        if (pd && now() - pd.t < 5000) { const q = resolve(pd.pose); if (q) { S.lock = pd.o.lock || null; jump(q); sent = true; } }
        if (!sent && !re) arrive = takeArrival();
      }
    } else if (!re) { S.lock = null; S.manual = false; S.outToast = false; S.pend = null; }
    LAYERS.forEach(pushLayer);
    dirty(re ? 'resize' : 'config');
    if (carry) {
      const q = mode === 'pan' ? resolve(carry.q) : mode === 'orbit' ? carry.q : { yaw: carry.q.yaw, pitch: carry.q.pitch, dist: carry.q.dist, t: carry.q.t };
      if (q) fly(q, { dur: carry.left, whoosh: false, ambient: carry.amb, hop: carry.hop, ref: carry.ref }, carry.key).then(carry.res); else carry.res(false);
    }
    if (arrive) arriveIn(arrive);
  }
  /* the landing half of a stop change's trip (the room change is the "across"): the shell marks a stop change with
     ctx.atlas.arrive = { t: performance.now(), dur?, pullback? } (or true for the length of enter()), and the new room's
     first configure opens the view pulled back to `pullback` (default 0.6) of its home and glides in over `dur` s
     (default 2.4 / 1.8 / 0.6 at slow / quick / warp). once per mark; never on a relayout, never after a pose was sent for
     the room, never with reduced motion. a room that flies somewhere at once simply flies from there */
  function takeArrival() {
    const a = AT().arrive; if (!a || RED) return null;
    if (typeof a !== 'object') return {};
    const t = a.t; if (!fin(t) || now() - t > 2500 || t === S.arrT) return null;
    S.arrT = t; return a;
  }
  function arriveIn(a) {
    const h = S.home; if (!h || S.mode === 'none' || S.hand) return;
    const pull = fin(a.pullback) && a.pullback > 0 ? clamp(a.pullback, PULL_FLOOR, 1) : ARRIVE.pull;
    if (S.mode === 'orbit3d') S.dist = S.distT = h.dist / pull; else S.z = S.zT = h.z * pull;
    dirty('set');
    fly(h, { dur: fin(a.dur) && a.dur > 0 ? a.dur : ARRIVE.dur[speedOf(null)], hop: false });
  }
  /* K6: a trip to `pose` (any pose form; null = this room's home) whose view, at its widest (mid-path), is pulled back to
     `pullback` x the starting zoom (default 0.6; 1 = no pull-back, a straight glide; a trip that would pull out further by
     itself keeps its own path), over `dur` s (default: the travel speed's hop time for the path), locking on `lock` if given. a target
     equal to the start makes a breath: out and back in. `ambient: true` is a camera move, not a trip (a tour's slow dolly):
     no whoosh, no en route (view.flight and view.flying stay empty), the lock is left alone, the idle drift keeps turning,
     any hand stops it, and under reduced motion it does not move at all (resolves false). otherwise reduced motion lands
     at once, with no pull-back. resolves true on landing, false when stopped or impossible (no camera here) */
  /* the hand wins: while a drag or a pinch holds the camera, nothing else moves it. a flight, a jump or a room's pose asked
     for then (a tour landing its stop late, a room re-sending its pose after the chrome's relayout) resolves false and
     changes nothing, not even the lock; the hand already paused the tour, and resuming it lands the stop again */
  function travel(pose, o) {
    o = Object.assign({}, o || {});
    if (S.mode === 'none' || S.hand) return Promise.resolve(false);
    const amb = !!o.ambient;
    if (amb && RED) return Promise.resolve(false);
    const q = pose == null ? S.home : resolve(pose, amb); if (!q) return Promise.resolve(false);
    if (o.pullback === undefined) o.pullback = amb ? 1 : 0.6;
    if (!amb) { S.lock = o.lock || null; S.manual = false; }
    if (RED) { endFlight(false); jump(q); return Promise.resolve(true); }
    return fly(q, o);
  }
  function set(pose, o) {
    o = o || {};
    if (S.hand) return Promise.resolve(false);
    /* a room whose enter() configures its camera late (after data arrives) still gets the pose it was sent to */
    if (S.mode === 'none' && pose != null) { S.pend = { pose, o, t: now() }; return Promise.resolve(false); }
    const q = resolve(pose); if (!q) return Promise.resolve(false);
    S.lock = o.lock || null; S.manual = false;
    if (o.instant || RED) { endFlight(false); jump(q); return Promise.resolve(true); }
    return fly(q, { short: true, whoosh: false });
  }
  function flyTo(pose, o) {
    o = o || {}; if (S.hand) return Promise.resolve(false);
    const q = resolve(pose);
    if (!q) { if (o.lock) { S.lock = o.lock; S.manual = false; dirty('fly'); } return Promise.resolve(false); }
    S.lock = o.lock || null; S.manual = false;
    if (o.instant) { endFlight(false); jump(q); return Promise.resolve(true); }
    return fly(q, o, pose);
  }
  function home(o) {
    o = o || {}; if (S.mode === 'none' || !S.home || S.hand) return Promise.resolve(false);
    S.lock = null; S.manual = false;
    if (o.instant || RED) { endFlight(false); jump(S.home); return Promise.resolve(true); }
    return fly(S.home, { speed: o.speed, nudge: !!o.nudge });
  }

  let lastT = 0;
  const DBG = !!AT().debug, COST = { n: 0, sum: 0, max: 0, cb: 0 }; /* ?atlasdebug=1: what the camera itself costs per frame */
  function tick(t) {
    requestAnimationFrame(tick);
    const c0 = DBG ? performance.now() : 0;
    const dt = lastT ? clamp((t - lastT) / 1000, 0, 0.1) : 0.016; lastT = t;
    if (S.fl) stepFlight(t);
    /* an ambient move (a dolly) owns the zoom, and the idle drift keeps turning under it */
    if (S.mode !== 'none' && (!S.fl || S.fl.amb)) {
      const k = RED ? 1 : 1 - Math.exp(-7 * dt), easeZ = !S.fl;
      if (easeZ && (S.mode === 'pan' || S.mode === 'orbit')) {
        if (S.zT !== S.z) {
          S.z = Math.exp(Math.log(S.z) + (Math.log(S.zT) - Math.log(S.z)) * k);
          if (Math.abs(S.zT - S.z) <= 1e-4 * S.zT) S.z = S.zT;
          if (S.mode === 'pan') { if (S.anc) { S.cx = S.anc.wx - (S.anc.sx - S.cx0) / S.z; S.cy = S.anc.wy - (S.anc.sy - S.cy0) / S.z; } clampPan(); if (S.z === S.zT) S.anc = null; }
          dirty('zoom');
        }
      } else if (easeZ && S.distT !== S.dist) {
        S.dist = Math.exp(Math.log(S.dist) + (Math.log(S.distT) - Math.log(S.dist)) * k);
        if (Math.abs(S.distT - S.dist) <= 1e-4 * S.distT) S.dist = S.distT;
        dirty('zoom');
      }
      /* idle drift (§2.7): only where the room allows it, 4 s after the last hand, never during a trip, pressed or reduced */
      const tn = now();
      if (S.cfg.drift && !RED && !AT().nodrift && tier() < 4 && !S.gest && S.zT === S.z && S.distT === S.dist && tn - S.manualAt > 4000 && tn - S.settleAt > 1200 && !document.hidden) {
        S.dA = Math.min(1, S.dA + dt / 2.5); S.dTau += dt;
        if (S.mode === 'pan') { const a = S.dA * 0.006 * S.st.w / S.z; S.dcx = a * Math.sin(S.dTau * 0.2417); S.dcy = a * 0.72 * Math.sin(S.dTau * 0.1698); dirty('drift'); }
        else if (S.mode === 'orbit3d') { S.dyaw += 0.035 * S.dA * dt; dirty('drift'); }
      }
    }
    const st = state(); if (st !== S.lastState) { S.lastState = st; dirty('state'); }
    if (S.dirty) {
      const why = S.why || 'input'; S.dirty = false; S.why = '';
      markDoc(st);
      for (let k = 0; k < LAYERS.length; k++) pushLayer(LAYERS[k]);
      const c1 = DBG ? performance.now() : 0;
      for (let k = 0; k < CH.length; k++) { try { CH[k](view, why); } catch (e) {} }
      if (DBG) COST.cb += performance.now() - c1;
    }
    if (DBG) { const d = performance.now() - c0; COST.n++; COST.sum += d; if (d > COST.max) COST.max = d; }
  }
  requestAnimationFrame(tick); /* registered before the shell's first loop frame, so every frame sees one pose from drawField to the labels */

  /* a room that does not re-run configure after a resize still gets its pose re-applied to the new stage */
  addEventListener('resize', () => {
    S.resizeAt = now(); clearTimeout(S.rzT);
    S.rzT = setTimeout(() => {
      if (S.mode === 'none' || S.cfgAt >= S.resizeAt) return;
      const re = AT(); const was = re.reenter; try { re.reenter = true; } catch (e) {}
      const keepCfg = Object.assign({}, S.cfg, { mode: S.mode, zMin: S.mode === 'orbit3d' ? S.dMin : S.zMin, zMax: S.mode === 'orbit3d' ? S.dMax : S.zMax, bounds: S.b });
      const h = S.home; configure(Object.assign(keepCfg, { home: S.mode === 'pan' ? { u: (h.cx - S.st.x) / S.st.w, v: (h.cy - S.st.y) / S.st.h, z: h.z } : S.mode === 'orbit3d' ? { yaw: h.yaw, pitch: h.pitch, dist: h.dist, target: h.t } : h }));
      try { re.reenter = was; } catch (e) {}
    }, 420);
  }, { passive: true });

  const sub = (list, fn) => { if (typeof fn !== 'function') return () => {}; list.push(fn); return () => { const k = list.indexOf(fn); if (k >= 0) list.splice(k, 1); }; };
  const view = {
    configure, set, flyTo, home, travel,
    pan(dx, dy) { if (S.mode !== 'pan' && S.mode !== 'orbit3d') return; input('pan', false); panRaw(+dx || 0, +dy || 0); },
    zoomBy(f, sx, sy) { if (S.mode === 'none') return; input('zoom', keepOrbit()); zoomEase(+f, sx, sy); },
    zoomTo(z, o) { if (S.mode === 'none' || !(z > 0)) return; input('zoom', keepOrbit()); const cur = S.mode === 'orbit3d' ? 1 / S.distT : S.zT; zoomEase(z / cur, undefined, undefined, !!(o && o.instant)); },
    orbitBy(dx, dy) { if (!keepOrbit()) return; input('orbit', true); orbitRaw(+dx || 0, +dy || 0); },
    apply, unapply, matrix, project, proj3,
    layer(root, els) { const L = layerOf(root); if (!L) return root; if (els) adopt(root, els); return L.el; },
    adopt,
    onChange(fn) { return sub(CH, fn); },
    onManual(fn) { return sub(MAN, fn); },
    pose() { return encode(normPose()); },
    poseN: normPose, encode, decode, ease,
    cost() { const r = { frames: COST.n, meanMs: COST.n ? COST.sum / COST.n : 0, maxMs: COST.max, listenersMs: COST.n ? COST.cb / COST.n : 0 }; COST.n = COST.sum = COST.max = COST.cb = 0; return r; },
    get mode() { return S.mode; },
    get cx() { return S.cx + S.dcx; }, get cy() { return S.cy + S.dcy; },
    get z() { return S.mode === 'orbit3d' ? 1 / S.dist : S.z; },
    get yaw() { return S.yaw + S.dyaw; }, get pitch() { return S.pitch; }, get dist() { return S.dist; },
    get target() { return [S.tx, S.ty, S.tz]; },
    get zMin() { return S.mode === 'orbit3d' ? 1 / S.dMax : S.zMin; }, get zMax() { return S.mode === 'orbit3d' ? 1 / S.dMin : S.zMax; },
    get state() { return state(); }, get manual() { return S.manual; }, get lock() { return S.lock; }, get lockLabel() { return S.lock; },
    get flying() { return !!S.fl && !S.fl.amb; }, get drift() { return !!S.cfg.drift; },
    /* the trip in progress, for the chrome's `en route >>>`: its length (s), whether it is a hop, how far along (0-1).
       an ambient move (a dolly) is not a trip: null */
    get flight() { const f = S.fl; return f && !f.amb ? { dur: f.dur / 1000, hop: !!f.hop, u: clamp((now() - f.t0) / f.dur, 0, 1) } : null; },
    /* the travel speed flights use now: 'slow' | 'quick' | 'warp' (the visitor's pick; quick under reduced motion) */
    get speed() { return speedOf(null); },
    get home0() { return S.home; }, get stageRect() { return S.st; }, get cx0() { return S.cx0; }, get cy0() { return S.cy0; },
    /* the gesture layer's private handle: raw moves plus the input bookkeeping they need */
    _in: {
      input, panRaw, orbitRaw, slideRaw, zoomRaw, pinchRaw, zoomEase, wheel: wheelRaw, dbl: dblRaw, key: keyRaw,
      keepOrbit, setGest(on) { S.gest = !!on; }, setHand(on) { S.hand = !!on; }, flyingSince(t) { return !!S.fl && !S.fl.amb && S.fl.t0 >= t; },
      get mode() { return S.mode; }, get wheelOn() { return S.cfg.wheel !== false; }, get dblMode() { return S.cfg.dbl; },
    },
  };
  return view;
}
export default { createView };
