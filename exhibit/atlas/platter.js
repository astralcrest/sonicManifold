/* the record (R11 THRESHOLD): the threshold's first form. every play is laid on one groove, the landing's spiral (equal
   area per play, outside in, oldest first), so where a dot sits on the record is when it was played, and its colour,
   once the room has asked, is who started it. the record turns slowly; a drag turns it by hand and tilts it.
   the tonearm is the grand tour's read head: it rests on the groove as far in as the tour has got (lead-in at the rim,
   the last stop by the label), and a short comet shows the plays just read under it. arm, rim and comet are Canvas2D on
   the shell's overlay; the dots stay the glyph field. the thesis is the frame's largest type. off the threshold, on a
   wide screen, a small neutral copy of the record keeps the arm where the tour is. reduced motion: nothing turns, the
   arm jumps. the globe stays one angle away (threshold.js). */
const TAU = 6.283185307179586, R0F = 0.34, TH0 = 0.6857, LEAN = 0.42, SPIN = 0.00008;
let GAP = 2.15, BAND = 0.22; /* glyph rows from one turn of the groove to the next; the groove's width as a share of that */
const PD = 1.24, PA = -0.62, AL = 1.0; /* the arm: its pivot sits PD radii out at angle PA (upper right), AL radii long */
/* r13: the platter is heavy. it follows the hand and the camera at most WMAX (45 rpm, rad/ms) and eases in over about 70 ms,
   so a hard swipe never flings the groove faster than a record turns. the lamp sits up and to the right (LX, LY): the groove
   catches it in two narrow lobes on that axis, the label's paper takes a soft highlight, the arm casts its shadow down-left */
const WMAX = 270 * Math.PI / 180 / 1000, LAMP = -0.506, LW = [0.24, 0.12, 0.05];
const THESIS = "i didn't press play on most of my music.";
const WIDE = '(min-width:1024px) and (min-aspect-ratio:115/100) and (min-height:560px)';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lit = (v) => { const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255, m = Math.max(r, g, b, 1) / 255; return [r, g, b].map((c) => Math.round(c / m)).join(','); };
/* the stylus for a groove radius r (record units): where the circle of radius r meets the arm's reach from the pivot */
function stylus(r) {
  const c = clamp((PD * PD + r * r - AL * AL) / (2 * PD * r), -1, 1), a = PA + Math.acos(c);
  return [r * Math.cos(a), r * Math.sin(a), a];
}
/* tour stop k of n -> a groove radius: the lead-in at the rim, the last stop by the label */
const radiusAt = (k, n) => 1 - (1 - R0F) * (0.04 + 0.92 * (n > 1 ? clamp(k / (n - 1), 0, 1) : 0));

export default function platter(room, ctx) {
  const P = ctx.particles, n = P.n, h = ctx.hash, red = !!ctx.reduced;
  const U = new Float32Array(n), C = new Float32Array(n), S = new Float32Array(n), KD = (1 - R0F * R0F) / n;
  const COL = ctx.PROV.map(lit);
  let turns = 0, TW = 0;
  const st = { on: true, turns: 0, k: 0, n: 1, r: 1, rs: 1, cx: 0, cy: 0, R: 0, kk: 1, a: 0, sx: 0, sy: 0, at: 0, mini: false, w: 0, pt: 0, a0: null, fe: 16.7, ms: 0 };
  /* the groove: play i at radius sqrt(1 - KD (i + .5)) (r^2 falls linearly, so every play gets the same area), and the
     angle falls as the groove runs in, the way a stylus reads it while the record turns clockwise. each dot sits across
     the groove's width by a fixed hash, so a turn of the groove is a band of glyphs with dark land either side */
  function lay(T) {
    if (T === turns) return; turns = st.turns = T; TW = TAU * T / (1 - R0F);
    const w = BAND * (1 - R0F) / T;
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(1 - KD * (i + 0.5)), th = TH0 - (1 - r) * TW;
      U[i] = r + (h(i * 7 + 3) - 0.5) * w; C[i] = Math.cos(th); S[i] = Math.sin(th);
    }
  }
  /* about 2.3 glyph cells from one turn of the groove to the next, so each turn reads as its own band */
  function fitTurns(R) {
    const GF = ctx.atlas && ctx.atlas.GF, b = GF && GF.buffers && GF.buffers(), ch = b && b.invCh ? 1 / (b.invCh * (P.dpr || 1)) : 12;
    lay(clamp(Math.round((1 - R0F) * R * Math.cos(LEAN) / (GAP * ch)), 3, 22));
  }
  function geom(low, o = st) {
    const s = room.s, m = Math.min(s.w, s.h), vz = room.vz || 1, g = room.grow(m, vz);
    o.R = m * room.fit * vz * (1 + (low || 0) * 0.05); o.cx = s.x + s.w / 2 + g[0]; o.cy = s.y + s.h / 2 + g[1];
    o.kk = Math.cos(clamp(LEAN - (room.vpit || 0) * 0.95 + room.py * 0.12, 0.02, 1.3));
  }
  function place(ctx, t, low) {
    if (!turns) fitTurns(Math.min(room.s.w, room.s.h) * room.fit);
    geom(low);
    const at = (red ? 0 : t * SPIN) + (room.vyaw || 0) + room.px * 0.08, dt = st.pt ? Math.min(64, Math.max(0, t - st.pt)) : 0; st.pt = t;
    let a = at;
    if (!red && st.a0 !== null && dt > 0) { let d = (at - st.a0) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; const m = WMAX * dt; a = st.a0 + clamp(d * (1 - Math.exp(-dt / 70)), -m, m); }
    if (dt > 0) { st.w = st.a0 === null ? 0 : Math.abs(a - st.a0) / dt * 57295.8; st.fe += (dt - st.fe) * 0.05; }
    st.a = st.a0 = a; const ca = Math.cos(a), sa = Math.sin(a);
    const TX = P.tx, TY = P.ty, cx = st.cx, cy = st.cy, R = st.R, Rk = R * st.kk;
    for (let i = 0; i < n; i++) { const u = U[i], c = C[i], s = S[i]; TX[i] = cx + R * u * (c * ca - s * sa); TY[i] = cy + Rk * u * (s * ca + c * sa); }
    /* reduced motion re-places on a lattice change (threshold.relaid): this is the lattice these targets are for */
    const GF = ctx.atlas && ctx.atlas.GF, b = GF && GF.buffers && GF.buffers();
    if (b && b.cols) room.lk = [b.cols, b.rows, b.gx0, b.gy0, b.invCw, b.invCh, P.dpr];
  }
  function target() { const A = ctx.tour && ctx.tour.active; if (A && A.n > 0) { st.k = A.k | 0; st.n = A.n | 0; } return radiusAt(st.k, st.n); }
  /* the index of the play under a point of the record at radius r and record angle b: the groove turn nearest r */
  function under(r, b) {
    const t0 = TH0 - (1 - r) * TW; let d = (b - t0) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
    const rr = 1 - (TH0 - (t0 + d)) / TW;
    return clamp(Math.round((1 - rr * rr) / KD - 0.5), 0, n - 1);
  }
  function xy(i) { const ca = Math.cos(st.a), sa = Math.sin(st.a), u = U[i], c = C[i], s = S[i]; return [st.cx + st.R * u * (c * ca - s * sa), st.cy + st.R * st.kk * u * (s * ca + c * sa)]; }
  /* the overlay: the rim, the label's edge, the comet of plays just read, the arm. called from the room's frame */
  function draw(g, t) {
    if (!st.on || !st.R) return;
    const want = target(), dt = st.t ? Math.min(64, t - st.t) : 16; st.t = t;
    if (t - (st.ft || 0) > 1000) { st.ft = t; fitThesis(); } /* the liner note under it settles over the first second */
    st.rs = red ? want : st.rs + (want - st.rs) * Math.min(1, dt * 0.0035);
    const R = st.R, kk = st.kk, cx = st.cx, cy = st.cy, lw = Math.max(1, R / 220);
    g.save();
    g.lineWidth = lw; g.strokeStyle = 'rgba(216,210,234,.22)';
    g.beginPath(); g.ellipse(cx, cy, R * 1.04, R * 1.04 * kk, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(216,210,234,.16)'; g.beginPath(); g.ellipse(cx, cy, R * R0F * 0.9, R * R0F * 0.9 * kk, 0, 0, TAU); g.stroke();
    const t0 = performance.now(), lite = st.fe > 25 || (ctx.atlas && ctx.atlas.gov && ctx.atlas.gov.tier >= 3);
    /* the label sits proud of the groove: a soft occlusion ring, the paper lit from the lamp's side, the spindle a metal glint */
    const LR = R * R0F * 0.9, lx = Math.cos(LAMP), ly = Math.sin(LAMP);
    g.strokeStyle = 'rgba(4,0,10,.32)'; g.lineWidth = Math.max(2, R * 0.03); g.beginPath(); g.ellipse(cx, cy, LR + R * 0.012, (LR + R * 0.012) * kk, 0, 0, TAU); g.stroke();
    const lg = g.createRadialGradient(cx + lx * LR * 0.45, cy + ly * LR * 0.45 * kk, 0, cx, cy, LR);
    lg.addColorStop(0, 'rgba(58,44,88,.5)'); lg.addColorStop(0.55, 'rgba(30,20,50,.42)'); lg.addColorStop(1, 'rgba(16,9,30,.5)');
    g.fillStyle = lg; g.beginPath(); g.ellipse(cx, cy, LR, LR * kk, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(4,0,10,.5)'; g.beginPath(); g.ellipse(cx - R * 0.006, cy + R * 0.009 * kk, R * 0.02, R * 0.02 * kk, 0, 0, TAU); g.fill();
    const sg = g.createRadialGradient(cx + lx * R * 0.006, cy + ly * R * 0.006, 0, cx, cy, R * 0.018);
    sg.addColorStop(0, 'rgba(250,246,255,.95)'); sg.addColorStop(0.5, 'rgba(164,155,189,.75)'); sg.addColorStop(1, 'rgba(60,50,84,.7)');
    g.fillStyle = sg; g.beginPath(); g.ellipse(cx, cy, R * 0.016, R * 0.016 * kk, 0, 0, TAU); g.fill();
    st.gl = 0; if (!lite) glints(g, R, kk, cx, cy, lw);
    /* the stylus on the screen, then the plays just read: clockwise of it, since the record carries them past */
    const sv = stylus(st.rs), sx = cx + R * sv[0], sy = cy + R * kk * sv[1]; st.sx = sx; st.sy = sy;
    const hd = under(st.rs, sv[2] - st.a), span = Math.max(60, Math.round(TAU * 2 * st.rs / (TW * KD) * 0.3)), ig = room.ig === 2;
    const step = Math.max(1, Math.round(span / 260)), sz = Math.max(2, R / 95), nb = 4, bw = span / nb;
    g.globalCompositeOperation = 'lighter';
    for (let b = 0; b < nb; b++) {
      const to = hd - b * bw, from = Math.max(0, to - bw), al = (1 - b / nb) * (1 - b / nb) * 0.7 + 0.05, z = sz * (1.6 - b * 0.2);
      for (let k = 0; k < 3; k++) {
        if (!ig && k) continue;
        g.beginPath();
        for (let i = from | 0; i < to; i += step) { if (ig && P.prov[i] !== k) continue; const p = xy(i); g.rect(p[0] - z / 2, p[1] - z / 2, z, z); }
        g.fillStyle = 'rgba(' + (ig ? COL[k] : '216,210,234') + ',' + al + ')'; g.fill();
      }
    }
    const rg = g.createRadialGradient(sx, sy, 0, sx, sy, R * 0.09);
    rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(0.3, 'rgba(134,203,254,.35)'); rg.addColorStop(1, 'rgba(134,203,254,0)');
    g.fillStyle = rg; g.fillRect(sx - R * 0.09, sy - R * 0.09, R * 0.18, R * 0.18);
    g.globalCompositeOperation = 'source-over';
    arm(g, cx + R * PD * Math.cos(PA), cy + R * kk * PD * Math.sin(PA), sx, sy, R, lw, 0.9);
    g.restore();
    st.ms = performance.now() - t0;
  }
  /* the lamp on the groove: each turn of the spiral, where it crosses the lamp's axis (both lobes), drawn as a short arc in three
     widths, so the sheen has a bright core and soft shoulders. the arcs are the spiral itself at the record's angle, so as the
     record turns they creep along the axis by one groove a turn: the light follows the rotation. past ~50 deg/s the turns also
     blur into rings, as a spinning record's grooves do */
  function glints(g, R, kk, cx, cy, lw) {
    const T = turns, bw = Math.max(lw, BAND * (1 - R0F) / T * R * 0.9), sp = Math.max(0, Math.min(1, (st.w - 50) / 170));
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; st.gl = 0;
    for (let p = 0; p < 3; p++) {
      const hw = LW[p], al = [0.1, 0.18, 0.34][p]; g.beginPath();
      for (let lobe = 0; lobe < 2; lobe++) {
        const ph = LAMP + lobe * Math.PI;
        for (let j = -1; j <= T + 1; j++) {
          let first = true;
          for (let q = -3; q <= 3; q++) {
            const f = ph + hw * q / 3, r = 1 - (TH0 + st.a - f + TAU * j - TAU * Math.floor((TH0 + st.a - ph) / TAU)) * (1 - R0F) / (TAU * T);
            if (r < R0F || r > 1) { first = true; continue; }
            const x = cx + R * r * Math.cos(f), y = cy + R * kk * r * Math.sin(f);
            if (first) { g.moveTo(x, y); first = false; } else { g.lineTo(x, y); st.gl++; }
          }
        }
      }
      g.lineWidth = bw * (p === 0 ? 1.6 : p === 1 ? 1.1 : 0.7); g.strokeStyle = 'rgba(240,234,255,' + al + ')'; g.stroke();
    }
    if (sp > 0) {
      g.lineWidth = bw * 1.3; g.strokeStyle = 'rgba(216,210,234,' + (sp * 0.16).toFixed(3) + ')'; g.beginPath();
      for (let j = 0; j < T; j++) { const r = 1 - (j + 0.5) * (1 - R0F) / T; g.moveTo(cx + R * r, cy); g.ellipse(cx, cy, R * r, R * r * kk, 0, 0, TAU); }
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }
  /* the arm from its pivot to the stylus: a counterweight behind the pivot, the tube, a short angled headshell */
  function arm(g, px, py, sx, sy, R, lw, al) {
    const dx = sx - px, dy = sy - py, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hc = 0.16 * R, ha = 0.42;
    const hx = sx - hc * (ux * Math.cos(ha) + uy * Math.sin(ha)), hy = sy - hc * (uy * Math.cos(ha) - ux * Math.sin(ha));
    const ox = -0.05 * R, oy = 0.075 * R, bx = px - ux * R * 0.2, by = py - uy * R * 0.2;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let k = 0; k < 2; k++) { g.strokeStyle = k ? 'rgba(2,0,8,.3)' : 'rgba(2,0,8,.14)'; g.lineWidth = lw * (k ? 4 : 10); g.beginPath(); g.moveTo(bx + ox, by + oy); g.lineTo(hx + ox * 0.18, hy + oy * 0.18); g.lineTo(sx, sy); g.stroke(); }
    g.strokeStyle = 'rgba(10,1,24,.75)'; g.lineWidth = lw * 6;
    g.beginPath(); g.moveTo(px - ux * R * 0.2, py - uy * R * 0.2); g.lineTo(hx, hy); g.lineTo(sx, sy); g.stroke();
    g.strokeStyle = 'rgba(134,203,254,' + al + ')'; g.lineWidth = lw * 2.4;
    g.beginPath(); g.moveTo(px - ux * R * 0.12, py - uy * R * 0.12); g.lineTo(hx, hy); g.stroke();
    g.lineWidth = lw * 5; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + (sx - hx) * 0.82, hy + (sy - hy) * 0.82); g.stroke();
    g.lineWidth = lw * 7; g.beginPath(); g.moveTo(px - ux * R * 0.13, py - uy * R * 0.13); g.lineTo(px - ux * R * 0.21, py - uy * R * 0.21); g.stroke();
    g.fillStyle = 'rgba(10,1,24,.9)'; g.beginPath(); g.arc(px, py, R * 0.05, 0, TAU); g.fill();
    g.lineWidth = lw * 1.4; g.strokeStyle = 'rgba(216,210,234,' + al * 0.6 + ')'; g.stroke();
    g.fillStyle = 'rgba(134,203,254,' + al + ')'; g.beginPath(); g.arc(px, py, R * 0.017, 0, TAU); g.fill();
  }
  /* ---------------------------------------------------------------- the thesis */
  let th = null;
  function thesis(root) {
    if (!th) {
      th = document.createElement('p'); th.className = 'thr-thesis'; th.textContent = THESIS;
      th.style.cssText = 'position:fixed;margin:0;z-index:3;pointer-events:none;font:italic 400 40px/1.04 var(--serif-voice,Georgia,serif);letter-spacing:-.01em;color:#f0eaff;text-wrap:balance;text-shadow:0 0 24px rgba(10,1,24,.9),0 0 3px rgba(10,1,24,.9);opacity:0;transition:opacity .8s ease';
      if (red) th.style.transition = 'none';
      root.appendChild(th);
    }
    fitThesis();
  }
  /* wide: the left column, above the liner note. upright: under the record, as large as two lines allow */
  function fitThesis() {
    if (!th) return;
    const s = room.s, W = innerWidth, H = innerHeight, de = document.documentElement;
    th.style.display = '';
    if (matchMedia(WIDE).matches && s.x > 300) {
      const ln = document.querySelector('#atlas-info .ai-liner'), lt = ln && ln.getBoundingClientRect().top, l = Math.min(80, W * 0.06);
      th.style.left = l + 'px'; th.style.width = Math.min(520, s.x - l - 28) + 'px'; th.style.top = 'auto'; th.style.textAlign = 'left';
      th.style.bottom = Math.round(H - (lt > H * 0.3 ? lt : H - 240) + 34) + 'px'; th.style.fontSize = clamp(W * 0.044, 40, 72) + 'px';
    } else {
      const o = {}; geom(0, o);
      const top = o.cy + o.R * o.kk * 1.06 + 8, room2 = s.y + s.h - top, fs = clamp(Math.min(room2 / 2.2, W / 13.5), 18, 34);
      if (room2 < 2 * fs || H < 420) { th.style.display = 'none'; return; }
      th.style.left = '16px'; th.style.width = (W - 32) + 'px'; th.style.bottom = 'auto'; th.style.top = top + 'px'; th.style.textAlign = 'center'; th.style.fontSize = fs + 'px';
    }
  }
  /* ---------------------------------------------------------------- the small record, off the threshold */
  let mini = null, mArm = null, mOff = null, mK = -1;
  function miniBuild() {
    const S0 = 60, d = Math.min(3, Math.max(2, devicePixelRatio || 1)), box = document.createElement('div');
    box.className = 'thr-mini'; box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:8px;bottom:calc(var(--dockh,84px) + 18px);width:' + S0 + 'px;height:' + S0 + 'px;z-index:4;pointer-events:none;opacity:0;transition:opacity .6s ease';
    const disc = document.createElement('canvas'), am = document.createElement('canvas');
    [disc, am].forEach((c) => { c.width = c.height = S0 * d; c.style.cssText = 'position:absolute;left:0;top:0;width:' + S0 + 'px;height:' + S0 + 'px'; box.appendChild(c); });
    const R = S0 * d * 0.36, cx = S0 * d * 0.42, cy = S0 * d * 0.56, g = disc.getContext('2d');
    if (!turns) lay(9);
    g.fillStyle = 'rgba(10,1,24,.85)'; g.beginPath(); g.arc(cx, cy, R * 1.06, 0, TAU); g.fill();
    g.fillStyle = 'rgba(216,210,234,.5)';
    const stp = Math.max(1, Math.floor(n / 2600)), z = d * 0.6;
    g.beginPath(); for (let i = 0; i < n; i += stp) g.rect(cx + R * U[i] * C[i] - z / 2, cy + R * U[i] * S[i] - z / 2, z, z); g.fill();
    g.strokeStyle = 'rgba(216,210,234,.35)'; g.lineWidth = d * 0.6; g.beginPath(); g.arc(cx, cy, R * 1.06, 0, TAU); g.stroke();
    disc.style.transformOrigin = (cx / d) + 'px ' + (cy / d) + 'px';
    if (!red && disc.animate) disc.animate([{ transform: 'rotate(0turn)' }, { transform: 'rotate(1turn)' }], { duration: 48000, iterations: Infinity });
    mini = { box, am, d, R, cx, cy };
    document.body.appendChild(box);
  }
  function miniArm(force) {
    const k = st.k; if (!mini || (!force && k === mK)) return; mK = k;
    const m = mini, g = m.am.getContext('2d'), sv = stylus(radiusAt(st.k, st.n));
    g.clearRect(0, 0, m.am.width, m.am.height);
    arm(g, m.cx + m.R * PD * Math.cos(PA), m.cy + m.R * PD * Math.sin(PA), m.cx + m.R * sv[0], m.cy + m.R * sv[1], m.R, m.d * 0.5, 0.95);
  }
  function miniShow(on) {
    on = on && matchMedia(WIDE).matches && !!(ctx.atlas && ctx.atlas.on); st.mini = on;
    if (on && !mini) miniBuild();
    if (!mini) return;
    if (on) { target(); miniArm(true); if (!mOff && ctx.tour && ctx.tour.onChange) mOff = ctx.tour.onChange(() => { target(); miniArm(false); }); }
    mini.box.style.opacity = on ? '1' : '0';
  }
  return {
    st, lay, place, draw, under, xy, radiusAt, stylus,
    enter(ctx, root, keep) {
      if (!keep) { st.on = true; st.t = 0; st.rs = target(); }
      fitTurns(Math.min(room.s.w, room.s.h) * room.fit); if (st.on) P.w.fill(255);
      thesis(root); th.style.opacity = '1'; miniShow(false);
    },
    form(on) { st.on = on; },
    leave() { st.on = false; if (th) th.style.opacity = '0'; miniShow(true); },
    get thesis() { return th; }, get mini() { return mini && mini.box; }, WMAX,
  };
}
