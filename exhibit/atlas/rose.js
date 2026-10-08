/* R11 ROSE · the clock room's glass angle (R10/RESEARCH art P3 + music C5). the 24-hour dial as a rose window: one lancet
   per hour, midnight at the top, clockwise, the lead lines are the hour divisions. inside a lancet the panes stack as the
   dial's bands do: the queue (violet) innermost, shuffle (amber), what i tapped (mint) at the pointed tip, each pane's
   length that hour's share. a pane's brightness is that hour's plays (linear, over a fixed floor so a quiet hour is dim
   glass and not a hole). the oculus ring is the whole log's three shares. nothing else is coloured: the stone and the lead
   are dark, the light is white. two canvases are baked once per layout (dim glass, lit glass); a frame only moves a light:
   lit glass is shown through a soft disc around the light, a blurred copy spills onto the field on the far side. the light
   opens on the visitor's own hour (the hour only, never a date, never a claim about mine) and the hand drags it round.
   the hum: 24 quiet partials, one an hour, through the shell's interface bus. pitch folds the day onto the D minor
   pentatonic ladder (midnight low, noon high) and each pitch moves to the nearest tone of the bed's key (A.pitches());
   each partial's level is its hour's share of plays, so the busy afternoon is the top of the chord. a hover or a drag
   brightens one hour's partial; the low-pass opens with the plays at the light's hour. silent before sound is armed,
   while muted, and whenever a listening post holds or wants the speakers. canvas 2d and raw web audio only. */
const TAU = 6.283185307179586, D4 = 293.66, SC = [0, 3, 5, 7, 10], HUM = 0.05;
const ang = (h) => (h / 24) * TAU - TAU / 4;
const tryf = (f) => { try { return f(); } catch (e) { return undefined; } };
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, (h || w) | 0); return c; };
const rgb = (n, L, a) => {
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255, w = Math.max(0, L - 1) * 0.6, k = Math.min(1, L);
  const f = (v) => Math.round(Math.min(255, v * k + (255 - v * k) * w));
  return 'rgba(' + f(r) + ',' + f(g) + ',' + f(b) + ',' + (a == null ? 1 : a) + ')';
};
/* a seeded jitter, so a pane's quarries are the same on every bake */
const jit = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export function createRose(ctx, d) {
  const A = ctx.audio, html = document.documentElement, PC = ctx.PROV_CHIP || [0x21f6bc, 0xf5a623, 0x8b6fd6];
  const COL = { tap: PC[0], shuffle: PC[1], queue: PC[2] };
  const tot = [], f1 = [], f2 = []; let max = 1, sum = 0;
  for (let h = 0; h < 24; h++) { tot[h] = d.tap[h] + d.shuffle[h] + d.served[h]; max = Math.max(max, tot[h]); sum += tot[h]; }
  for (let h = 0; h < 24; h++) { const t = tot[h] || 1; f1[h] = d.served[h] / t; f2[h] = (d.served[h] + d.shuffle[h]) / t; }
  const pct = d.pct || { tap: 19.08, shuffle: 16.69, served: 64.23 };
  const R = { on: false, light: 14, to: 14, hover: -1, drag: false, intro: 0, geo: null, G: null, L: null, B: null, S: null, key: '', paths: null, scale: 0, lk: '', cost: [] };
  const forced = () => tryf(() => matchMedia('(forced-colors: active)').matches);

  /* ---------------------------------------------------------------- the bake */
  function radii(g) {
    const Rw = g.R * 0.94 + 4;
    return { Rw, rA: Rw * 0.95, rL: Rw * 0.84, rS: g.R * 0.5, o0: g.R * 0.415, o1: g.R * 0.47, lw: Math.max(1.4, g.R * 0.016) };
  }
  function lancet(p, h, r) {
    const a0 = ang(h), a1 = ang(h + 1), am = (a0 + a1) / 2, rc = r.rL + (r.rA - r.rL) * 0.78, c = Math.cos, s = Math.sin;
    p.moveTo(c(a0) * r.rS, s(a0) * r.rS); p.arc(0, 0, r.rS, a0, a1);
    p.lineTo(c(a1) * r.rL, s(a1) * r.rL);
    p.quadraticCurveTo(c(a1) * rc, s(a1) * rc, c(am) * r.rA, s(am) * r.rA);
    p.quadraticCurveTo(c(a0) * rc, s(a0) * rc, c(a0) * r.rL, s(a0) * r.rL);
    p.closePath();
  }
  function sector(g, r0, r1, a0, a1) { g.beginPath(); g.arc(0, 0, r1, a0, a1); g.arc(0, 0, r0, a1, a0, true); g.closePath(); }
  /* one copy of the window. lum(h) = pane brightness for hour h (1 = the pane's own colour, above 1 = towards white) */
  function paint(g, r, lum, lit, flat) {
    const { Rw, rA, rS, o0, o1, lw } = r;
    g.fillStyle = flat ? '#000' : '#0b0614'; g.beginPath(); g.arc(0, 0, Rw, 0, TAU); g.fill();
    if (!flat) { const st = g.createRadialGradient(0, 0, rS, 0, 0, Rw); st.addColorStop(0, 'rgba(26,18,38,1)'); st.addColorStop(1, 'rgba(8,5,14,1)'); g.fillStyle = st; g.beginPath(); g.arc(0, 0, Rw, 0, TAU); g.arc(0, 0, o1, 0, TAU, true); g.fill('evenodd'); }
    const L = rA - rS, cols = [COL.queue, COL.shuffle, COL.tap];
    for (let h = 0; h < 24; h++) {
      const a0 = ang(h), a1 = ang(h + 1), am = (a0 + a1) / 2, e = 0.02, Lh = lum(h);
      const cut = [rS, rS + f1[h] * L, rS + f2[h] * L, rA + 2];
      g.save(); const p = new Path2D(); lancet(p, h, r); g.clip(p);
      for (let b = 0; b < 3; b++) {
        /* each pane is cut into quarries (a split down the middle, and the long queue pane once across), each a little
           lighter or darker than its neighbour: only the luminance moves, never the hue */
        const r0 = cut[b], r1 = cut[b + 1], mids = b === 0 && r1 - r0 > L * 0.3 ? [r0, (r0 + r1) / 2, r1] : [r0, r1];
        for (let q = 0; q + 1 < mids.length; q++) for (let s = 0; s < 2; s++) {
          const j = flat ? 1 : 0.84 + 0.32 * jit(h * 31 + b * 7 + q * 3 + s);
          sector(g, mids[q], mids[q + 1], s ? am : a0 - e, s ? a1 + e : am);
          if (lit && !flat) {
            const rm = (mids[q] + mids[q + 1]) / 2, x = Math.cos(am) * rm, y = Math.sin(am) * rm, gr = g.createRadialGradient(x, y, 0, x, y, Math.max(6, mids[q + 1] - mids[q]));
            gr.addColorStop(0, rgb(cols[b], Lh * j * 1.25)); gr.addColorStop(1, rgb(cols[b], Lh * j * 0.8)); g.fillStyle = gr;
          } else g.fillStyle = rgb(cols[b], Lh * j);
          g.fill();
        }
        if (!flat) { g.strokeStyle = '#06030b'; g.lineWidth = lw * 0.45; g.beginPath(); g.moveTo(Math.cos(am) * r0, Math.sin(am) * r0); g.lineTo(Math.cos(am) * r1, Math.sin(am) * r1); g.stroke(); if (mids.length > 2) { g.beginPath(); g.arc(0, 0, mids[1], a0, a1); g.stroke(); } }
        if (b) { g.strokeStyle = flat ? '#fff' : '#06030b'; g.lineWidth = lw * 0.8; g.beginPath(); g.arc(0, 0, r0, a0 - e, a1 + e); g.stroke(); }
      }
      /* seeds and bubbles in the glass: specks of light and dark, no colour */
      if (!flat) for (let k = 0; k < 14; k++) {
        const u = jit(h * 97 + k), v = jit(h * 53 + k * 5), rr = rS + u * (rA - rS), aa = a0 + v * (a1 - a0);
        g.fillStyle = k & 1 ? 'rgba(255,255,255,' + (lit ? 0.16 : 0.07) + ')' : 'rgba(0,0,0,.18)';
        g.beginPath(); g.arc(Math.cos(aa) * rr, Math.sin(aa) * rr, lw * (0.25 + 0.35 * jit(k + h)), 0, TAU); g.fill();
      }
      g.restore();
      /* the lead: the came round each lancet, then a hairline of light along it */
      g.strokeStyle = flat ? '#fff' : '#06030b'; g.lineWidth = lw * (h % 6 === 0 ? 1.5 : 1.1); g.stroke(p);
      if (!flat) { g.strokeStyle = 'rgba(255,246,255,.07)'; g.lineWidth = lw * 0.3; g.stroke(p); }
      /* the stone between two arches is pierced by a small round light, dark */
      if (!flat) { const rc = (r.rL + Rw) / 2 + lw, x = Math.cos(a0) * rc, y = Math.sin(a0) * rc; g.fillStyle = '#040208'; g.beginPath(); g.arc(x, y, (Rw - r.rL) * 0.2, 0, TAU); g.fill(); g.strokeStyle = 'rgba(90,72,120,.45)'; g.lineWidth = lw * 0.5; g.stroke(); }
    }
    /* the oculus ring: the whole log's three shares, from midnight round */
    const sh = [[COL.tap, pct.tap], [COL.shuffle, pct.shuffle], [COL.queue, pct.served]], tt = sh.reduce((s, x) => s + x[1], 0);
    let a = -TAU / 4;
    for (const [c, v] of sh) {
      const b = a + (v / tt) * TAU, nq = Math.max(1, Math.round((b - a) / (TAU / 40)));
      for (let q = 0; q < nq; q++) {
        const qa = a + ((b - a) * q) / nq, qb = a + ((b - a) * (q + 1)) / nq;
        sector(g, o0, o1, qa - 0.002, qb + 0.002); g.fillStyle = rgb(c, (lit ? 1.05 : 0.45) * (flat ? 1 : 0.86 + 0.28 * jit(q * 13 + c % 97))); g.fill();
        if (q && !flat) { g.strokeStyle = '#06030b'; g.lineWidth = lw * 0.45; g.beginPath(); g.moveTo(Math.cos(qa) * o0, Math.sin(qa) * o0); g.lineTo(Math.cos(qa) * o1, Math.sin(qa) * o1); g.stroke(); }
      }
      g.strokeStyle = flat ? '#fff' : '#06030b'; g.lineWidth = lw; g.beginPath(); g.moveTo(Math.cos(a) * o0, Math.sin(a) * o0); g.lineTo(Math.cos(a) * o1, Math.sin(a) * o1); g.stroke();
      a = b;
    }
    g.fillStyle = flat ? '#000' : '#07040d'; g.beginPath(); g.arc(0, 0, o0, 0, TAU); g.fill();
    g.strokeStyle = flat ? '#fff' : '#06030b'; g.lineWidth = lw * 1.4;
    for (const rr of [o0, o1, rS]) { g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.stroke(); }
    g.lineWidth = lw * 1.8; g.beginPath(); g.arc(0, 0, Rw - lw, 0, TAU); g.stroke();
    if (!flat) { g.strokeStyle = 'rgba(120,100,150,.35)'; g.lineWidth = lw * 0.5; g.beginPath(); g.arc(0, 0, Rw - lw * 0.2, 0, TAU); g.stroke(); }
  }
  function bake(geo, scale) {
    const r = radii(geo), pad = r.Rw * 0.02 + 2, half = r.Rw + pad, side = Math.min(2048, Math.ceil(half * 2 * scale)), k = side / (half * 2);
    const mk = (lum, lit, flat) => { const c = cv(side), g = c.getContext('2d'); g.setTransform(k, 0, 0, k, half * k, half * k); paint(g, r, lum, lit, flat); return c; };
    const n = (h) => tot[h] / max, fl = forced();
    R.G = mk((h) => (fl ? 1 : 0.06 + 0.62 * n(h)), false, fl);
    if (!fl) {
      R.Lt = mk((h) => 0.2 + 1.12 * n(h), true, false);
      const s1 = cv(side / 6), s2 = cv(Math.max(24, side / 14));
      s1.getContext('2d').drawImage(R.Lt, 0, 0, s1.width, s1.height); s2.getContext('2d').drawImage(s1, 0, 0, s2.width, s2.height);
      /* the glow is the light, not the glass: blurred, two panes' colours would mix into a fourth (amber and violet make a
         rose, which is reserved), so the blurred copy keeps only its brightness, a white a touch warm */
      tryf(() => { const g2 = s2.getContext('2d'), im = g2.getImageData(0, 0, s2.width, s2.height), a = im.data; for (let i = 0; i < a.length; i += 4) { const y = 0.3 * a[i] + 0.55 * a[i + 1] + 0.15 * a[i + 2]; a[i] = Math.min(255, y * 1.04); a[i + 1] = y; a[i + 2] = y * 0.94; } g2.putImageData(im, 0, 0); });
      R.blur = s2; R.L = cv(side); R.B = cv(s2.width);
      if (!R.S) { R.S = cv(96); const g = R.S.getContext('2d'), gr = g.createRadialGradient(48, 48, 0, 48, 48, 48); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,252,246,.55)'); gr.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, 96, 96); }
    } else R.Lt = R.L = R.B = R.blur = null;
    R.paths = []; for (let h = 0; h < 24; h++) { const p = new Path2D(); lancet(p, h, r); R.paths.push(p); }
    R.r = r; R.half = half; R.scale = scale; R.lk = '';
  }

  /* ---------------------------------------------------------------- a frame: only the light moves */
  const wrap = (x) => ((x % 24) + 24) % 24;
  /* the visitor's own hour, as a position on the day (hour and minutes, nothing else is read) */
  const nowHour = () => { const d0 = new Date(); return d0.getHours() + d0.getMinutes() / 60; };
  function sun(geo, hr, k) { const a = ang(hr), rr = R.r.Rw * k; return [geo.cx + Math.cos(a) * rr, geo.cy + Math.sin(a) * rr, a]; }
  R.frame = (gx, now, geo, sel, kz) => {
    const t0 = performance.now();
    if (!geo || !R.on) return;
    const T = tryf(() => gx.getTransform()), dev = T ? Math.hypot(T.a, T.b) : 2, want = Math.min(3, Math.max(1, dev));
    const gk = geo.cx.toFixed(1) + ',' + geo.cy.toFixed(1) + ',' + geo.R.toFixed(1) + ',' + forced();
    const moved = gk !== R.key;
    if (moved || !R.G || want > R.scale * 1.3) { R.key = gk; bake(geo, moved ? want : Math.max(want, R.scale)); }
    const calm = ctx.reduced || (ctx.atlas && ctx.atlas.gov && ctx.atlas.gov.tier >= 4);
    /* left alone, the light keeps the visitor's time: a minute's step, once a minute */
    if (!R.user && t0 - R.rt > 60000) { R.rt = t0; R.to = nowHour(); }
    /* the light eases the short way round to where it was sent; reduced motion puts it there */
    if (calm || R.drag) R.light = R.to; else { let df = wrap(R.to - R.light + 12) - 12; R.light = Math.abs(df) < 0.002 ? R.to : wrap(R.light + df * 0.12); }
    const r = R.r, half = R.half, x0 = geo.cx - half, y0 = geo.cy - half, D = half * 2;
    let rev = 1;
    if (R.intro && !calm) { rev = Math.min(1, (now - R.intro) / 1500); rev = 1 - Math.pow(1 - rev, 3); if (rev >= 1) R.intro = 0; }
    gx.save();
    if (rev < 1) { gx.beginPath(); gx.arc(geo.cx, geo.cy, r.o0 * 0.6 + (r.Rw - r.o0 * 0.6 + 2) * rev, 0, TAU); gx.clip(); }
    gx.globalCompositeOperation = 'source-over'; gx.globalAlpha = 1;
    gx.drawImage(R.G, x0, y0, D, D);
    if (R.Lt) {
      const S = sun(geo, R.light, 1.06), lk = R.light.toFixed(3);
      if (lk !== R.lk) {
        R.lk = lk;
        const L = R.L, g = L.getContext('2d'), w = L.width, k = w / D, sx = (S[0] - x0) * k, sy = (S[1] - y0) * k;
        g.globalCompositeOperation = 'copy'; g.drawImage(R.Lt, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        const gr = g.createRadialGradient(sx, sy, 0, sx, sy, r.Rw * 2.1 * k);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.3, 'rgba(0,0,0,.88)'); gr.addColorStop(0.62, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,.06)');
        g.fillStyle = gr; g.fillRect(0, 0, w, w); g.globalCompositeOperation = 'source-over';
        const B = R.B, b = B.getContext('2d'), bw = B.width, bk = bw / D;
        b.globalCompositeOperation = 'copy'; b.drawImage(R.blur, 0, 0, bw, bw);
        b.globalCompositeOperation = 'destination-in';
        const g2 = b.createRadialGradient((S[0] - x0) * bk, (S[1] - y0) * bk, 0, (S[0] - x0) * bk, (S[1] - y0) * bk, r.Rw * 1.9 * bk);
        g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = g2; b.fillRect(0, 0, bw, bw); b.globalCompositeOperation = 'source-over';
      }
      gx.drawImage(R.L, x0, y0, D, D);
      if (R.hover >= 0 && R.paths[R.hover]) { gx.save(); gx.translate(geo.cx, geo.cy); gx.clip(R.paths[R.hover]); gx.globalAlpha = 0.85; gx.drawImage(R.Lt, -half, -half, D, D); gx.restore(); }
      /* the window's colours thrown past it, on the far side from the light, and a bloom over the lit glass */
      gx.globalCompositeOperation = 'lighter';
      /* the glass streams outward: the lit, blurred window drawn bigger and fainter five times (a radial blur), each
         step pushed a little away from the light, so the colours fan out into the room on the far side */
      const ux = -Math.cos(S[2]) * r.Rw, uy = -Math.sin(S[2]) * r.Rw, nS = calm ? 2 : 5;
      for (let i = 1; i <= nS; i++) {
        const Dc = D * (1 + 0.13 * i), ox = ux * 0.035 * i, oy = uy * 0.035 * i;
        gx.globalAlpha = 0.3 * (1 - i / (nS + 1)); gx.drawImage(R.B, geo.cx + ox - Dc / 2, geo.cy + oy - Dc / 2, Dc, Dc);
      }
      gx.globalAlpha = 0.16; gx.drawImage(R.blur, geo.cx + ux * 0.12 - D * 0.54, geo.cy + uy * 0.12 - D * 0.54, D * 1.08, D * 1.08);
      gx.globalAlpha = 0.3; gx.drawImage(R.B, x0, y0, D, D);
      /* the light itself, and a few slow rays across the glass. white: light is not one of the four inks */
      const br = calm ? 0.9 : 0.82 + 0.18 * Math.sin(now / 1300), ss = r.Rw * 0.62;
      gx.globalAlpha = br; gx.drawImage(R.S, S[0] - ss / 2, S[1] - ss / 2, ss, ss);
      if (!calm) {
        for (let i = 0; i < 5; i++) {
          const a = S[2] + Math.PI + (i - 2) * 0.16 + 0.05 * Math.sin(now / 2400 + i * 1.7), len = r.Rw * 1.7, wd = 0.035 + 0.02 * jit(i);
          const lg = gx.createLinearGradient(S[0], S[1], S[0] + Math.cos(a) * len, S[1] + Math.sin(a) * len);
          lg.addColorStop(0, 'rgba(255,250,240,.09)'); lg.addColorStop(1, 'rgba(255,250,240,0)'); gx.fillStyle = lg; gx.globalAlpha = 1;
          gx.beginPath(); gx.moveTo(S[0], S[1]); gx.lineTo(S[0] + Math.cos(a - wd) * len, S[1] + Math.sin(a - wd) * len); gx.lineTo(S[0] + Math.cos(a + wd) * len, S[1] + Math.sin(a + wd) * len); gx.closePath(); gx.fill();
        }
        /* glints: a speck of the glass catches the light and lets go, more of them the nearer the light */
        gx.strokeStyle = 'rgba(255,252,246,.9)'; gx.lineWidth = (kz || 1) * 0.9;
        for (let i = 0; i < 36; i++) {
          const h = jit(i * 3.1) * 24, rr = r.rS + jit(i * 5.7) * (r.rA - r.rS), dh = Math.abs(wrap(h - R.light + 12) - 12);
          if (dh > 4) continue;
          const tw = Math.sin(now / (700 + 400 * jit(i)) + i * 2.3), al = tw * (1 - dh / 4) * (0.4 + 0.6 * tot[h | 0] / max);
          if (al <= 0.15) continue;
          const a = ang(h), x = geo.cx + Math.cos(a) * rr, y = geo.cy + Math.sin(a) * rr, z = (2 + 3 * al) * (kz || 1);
          gx.globalAlpha = al; gx.beginPath(); gx.moveTo(x - z, y); gx.lineTo(x + z, y); gx.moveTo(x, y - z); gx.lineTo(x, y + z); gx.stroke();
        }
        gx.globalAlpha = 1;
      }
      gx.globalCompositeOperation = 'source-over'; gx.globalAlpha = 1;
    }
    /* the hour the readout reads: an ice outline, ice being the interface */
    if (sel >= 0 && R.paths[sel]) { gx.save(); gx.translate(geo.cx, geo.cy); gx.strokeStyle = 'rgba(134,203,254,.8)'; gx.lineWidth = 1.4 * (kz || 1); gx.stroke(R.paths[sel]); gx.restore(); }
    gx.restore();
    R.cost.push(performance.now() - t0); if (R.cost.length > 240) R.cost.shift();
  };
  R.sunAt = (geo) => (R.r ? sun(geo, R.light, 1.06) : null);
  R.set = (on) => {
    if (on === R.on) return;
    R.on = on;
    if (on) { R.light = R.to = nowHour(); R.user = false; R.rt = performance.now(); R.intro = ctx.reduced ? 0 : R.rt; }
    hum.want(on);
  };
  /* a drag holds its hour's partial up; a key or a tour step lifts it for a moment */
  let kt = 0;
  R.lightTo = (h, drag) => {
    R.to = wrap(h); R.user = true; clearTimeout(kt);
    if (drag != null) R.drag = !!drag;
    if (drag == null && R.hover < 0) { hum.focus(Math.floor(R.to)); kt = setTimeout(() => hum.focus(R.drag ? Math.floor(R.to) : R.hover), 1500); } else hum.focus(R.drag ? Math.floor(R.to) : R.hover);
  };
  R.hoverAt = (h) => { R.hover = h; hum.focus(h >= 0 ? h : R.drag ? Math.floor(R.to) : -1); };
  R.release = () => { R.drag = false; hum.focus(R.hover); };

  /* ---------------------------------------------------------------- the hum */
  const hum = (() => {
    let N = null, want = false, foc = -1, iv = 0, quietSince = 0, key = '', lastF = null, lastLp = 0, lastM = -1;
    const share = tot.map((n) => n / (sum || 1));
    const why = () => {
      if (!A || !A.ac || !A.on || A.ac.state !== 'running') return 'off';
      if (A.muted) return 'muted';
      const s = tryf(() => ctx.post.state()) || {};
      if (s.open || s.started || A.ducked || (!('open' in s) && html.classList.contains('exd-open'))) return 'clip';
      return '';
    };
    /* the fold: midnight is the low D, the ladder climbs to noon and back, so neighbouring hours are neighbouring notes */
    const deg = (h) => -5 + Math.round(9 * (1 - Math.abs(h - 12) / 12));
    const semi = (dg) => {
      const raw = SC[((dg % 5) + 5) % 5] + 12 * Math.floor(dg / 5), ok = tryf(() => A.pitches()) || [2, 5, 7, 9, 0];
      for (let x = 0; x < 7; x++) { if (ok.includes((((raw - x + 2) % 12) + 12) % 12)) return raw - x; if (ok.includes((((raw + x + 2) % 12) + 12) % 12)) return raw + x; }
      return raw;
    };
    const freq = (h) => D4 * Math.pow(2, semi(deg(h)) / 12);
    function build() {
      const ac = A.ac, m = ac.createGain(), lp = ac.createBiquadFilter(), n = 12, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = k === 1 ? 1 : k === 2 ? 0.22 : k === 3 ? 0.1 : 0.03 / k;
      const w = ac.createPeriodicWave(re, im);
      m.gain.value = 0; lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = 900; lp.connect(m); m.connect(A.sfx);
      const P = [];
      for (let h = 0; h < 24; h++) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.setPeriodicWave(w); o.frequency.value = freq(h); o.detune.value = ((h * 7) % 5 - 2) * 1.6; g.gain.value = share[h];
        o.connect(g); g.connect(lp); o.start(); P.push({ o, g });
      }
      N = { m, lp, P }; key = ''; lastF = null; lastM = -1; lastLp = 0;
    }
    function teardown() { if (!N) return; const n = N; N = null; for (const p of n.P) tryf(() => { p.o.stop(); p.o.disconnect(); p.g.disconnect(); }); tryf(() => { n.lp.disconnect(); n.m.disconnect(); }); }
    function tick() {
      const w = why(), live = want && !w;
      if (!live) {
        if (N) { if (lastM !== 0) { lastM = 0; const t = A.ac.currentTime; N.m.gain.cancelScheduledValues(t); N.m.gain.setTargetAtTime(0, t, 0.03); } if (!quietSince) quietSince = performance.now(); else if (performance.now() - quietSince > 700) teardown(); }
        if (!want && !N) { clearInterval(iv); iv = 0; }
        return;
      }
      quietSince = 0;
      if (!N) build();
      const t = A.ac.currentTime, k = String(tryf(() => A.pitches()));
      if (k !== key) { key = k; for (let h = 0; h < 24; h++) N.P[h].o.frequency.setTargetAtTime(freq(h), t, 0.12); }
      if (lastM !== HUM) { lastM = HUM; N.m.gain.cancelScheduledValues(t); N.m.gain.setTargetAtTime(HUM, t, 1.1); }
      if (foc !== lastF) {
        lastF = foc;
        for (let h = 0; h < 24; h++) {
          const dd = foc < 0 ? 9 : Math.min(Math.abs(h - foc), 24 - Math.abs(h - foc));
          N.P[h].g.gain.setTargetAtTime(share[h] * (dd === 0 ? 3 : dd === 1 ? 2 : 1) + (dd === 0 ? 0.04 : dd === 1 ? 0.012 : 0), t, 0.09);
        }
      }
      const lp = Math.round(500 + 2600 * (tot[Math.floor(wrap(R.light))] / max) + (foc >= 0 ? 700 : 0));
      if (Math.abs(lp - lastLp) > 25) { lastLp = lp; N.lp.frequency.setTargetAtTime(lp, t, 0.25); }
    }
    return {
      want(on) { want = on; if (on && !iv) iv = setInterval(tick, 40); tick(); },
      focus(h) { foc = h == null ? -1 : h; if (iv) tick(); },
      why, deg, freq,
      state: () => ({ want, why: why(), nodes: N ? N.P.length : 0, master: N ? N.m.gain.value : 0, sfx: A && A.sfx ? A.sfx.gain.value : null, focus: foc, freqs: N ? N.P.map((p) => p.o.frequency.value) : [], gains: N ? N.P.map((p) => p.g.gain.value) : [], lp: N ? N.lp.frequency.value : 0 }),
      stop() { want = false; teardown(); clearInterval(iv); iv = 0; },
    };
  })();
  R.hum = hum;
  R.state = () => ({ on: R.on, light: R.light, to: R.to, hover: R.hover, drag: R.drag, baked: !!R.G, scale: R.scale, side: R.G ? R.G.width : 0, cost: R.cost.slice(), hum: hum.state() });
  R.canvases = () => ({ G: R.G, Lt: R.Lt });
  R.destroy = () => { R.on = false; hum.stop(); R.G = R.Lt = R.L = R.B = R.blur = null; };
  return R;
}
