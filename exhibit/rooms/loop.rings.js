/* LOOP2 · the loop pedal's rings (loaded by rooms/loop.js on the loop stop only). one ring per run length the log ships
   (2..14, 20, 50 plays in a row), laid out as a pedalboard. a ring holds one glyph per streak that reached it, spread
   round 320 degrees of one fixed radius, so its ink is its count: twice is solid, fifty or more is 35 glyphs you can
   count. the 40 degree gap is the loop's seam; it turns while the bar loops. a held loop engages the next pedal. not
   concentric: glyph cells are 1.8x taller than wide, so 15 nested rings would blur into a disc on a phone. nothing here
   is ordered by time; no single streak is placed. */
const { min, max, round, floor, cos, sin, PI, abs } = Math, TAU = PI * 2, SWEEP = TAU * 8 / 9;
const MONO = 'px "JetBrains Mono", ui-monospace, monospace', INK = 0xd9d4ee, ICE = 0x86cbfe, MUTE = 0x57507a;
const IK = 'rgba(217,212,238,', IC = 'rgba(134,203,254,';
const NUM = ['', '', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'];
const word = (L) => (L === 2 ? 'twice' : L === 3 ? 'three times' : L === 10 ? 'ten in a row' : L === 20 ? 'twenty' : L === 50 ? 'fifty or more' : NUM[L]);
export const phrase = (L) => (L === 2 ? 'twice' : (NUM[L] || (L === 20 ? 'twenty' : 'fifty')) + ' times') + ' in a row or more';
const fmt = (n) => Number(n).toLocaleString('en-US');
export const clicks = (n) => max(1, round(n / 100));

export function rings(d) {
  const RS = [], ge = d.ge; let off = 0;
  for (const k of Object.keys(ge)) {
    const L = +k, n = ge[k]; if (!(L >= 2) || !(n > 0)) continue;
    RS.push({ L, n, word: word(L), off });
    off += n;
  }
  RS.sort((a, b) => a.L - b.L);
  RS.forEach((r) => { r.ext = SWEEP; });
  return { RS, n: off };
}

/* the board: pedals in reading order inside the ring area (the stage above the panel, or left of it in landscape, minus
   the ladder chip's reserve); the grid with the largest ring wins. every ring has the same radius, so ink is count */
export function layout(R, s, side, hw) {
  const nar = R.nar, x0 = s.x + (nar ? 6 : 20), Wt = (side ? s.w - hw - 12 : s.w) - (nar ? 12 : 40);
  const ty = R.ty = s.y + (nar ? 10 : 24), Hv = max(80, R.yb - ty), RS = R.RS, nR = RS.length;
  let lh = nar ? 30 : 26;
  const fit = (lh, fw, fh) => { let b = null; for (let c = 2; c <= 8; c++) { const rows = Math.ceil(nR / c), cw = Wt / c, chh = Hv / rows, r = min(cw * fw, (chh - lh) * fh); if (!b || r > b.r) b = { c, rows, cw, chh, r }; } return b; };
  /* a tiny stage (an se phone, a landscape phone) drops the word row: the tag and the panel carry the words there */
  let best = fit(lh, 0.31, 0.36); R.tiny = best.r < 16; if (R.tiny) { lh = 0; best = fit(0, 0.4, 0.4); }
  const { c, rows, cw, chh } = best, r = R.r = min(best.r, nar ? 46 : 64);
  R.cols = c; R.cw = cw; R.chh = chh; R.bx = x0; R.bw = Wt; R.bh = rows * chh; R.by = ty + (Hv - rows * chh) / 2; R.band = nar ? 5 : 4.5; R.lh = lh;
  R.cx = x0 + Wt / 2; R.cy = ty + Hv / 2; R.R = rows * chh / 2;
  const N = R.n, DX = R.DX = new Float32Array(N), DY = R.DY = new Float32Array(N), h = R.ctx.hash;
  RS.forEach((q, k) => {
    const row = floor(k / c), inRow = min(c, nR - row * c), col = k - row * c;
    q.bl = x0 + (Wt - inRow * cw) / 2 + col * cw; q.bt = R.by + row * chh; q.x = q.bl + cw / 2; q.y = q.bt + (chh - lh) / 2 + 4; q.r = r;
    for (let j = 0; j < q.n; j++) {
      const i = q.off + j, a = -PI / 2 + (j + 0.2 + 0.6 * h(i * 5 + 1)) / q.n * q.ext, rr = r + (h(i * 5 + 2) - 0.5) * R.band;
      DX[i] = rr * cos(a); DY[i] = rr * sin(a);
    }
  });
  const n = R.nTen, asp = Wt / Hv, cols = R.tc = max(8, round(Math.sqrt(n * asp))), rws = Math.ceil(n / cols);
  const sp = R.tsp = min(Wt / cols, Hv / rws, 14);
  R.tx0 = R.cx - cols * sp / 2; R.ty0 = ty + (Hv - rws * sp) / 2;
  R.tcol = new Uint16Array(n); for (let i = 0; i < n; i++) R.tcol[i] = i % cols;
}

export function place(R, P) {
  const n = R.n, DX = R.DX, DY = R.DY, RS = R.RS, CX = new Float32Array(RS.length), CY = new Float32Array(RS.length), K = new Uint8Array(n);
  RS.forEach((q, k) => { CX[k] = q.x; CY[k] = q.y; K.fill(k, q.off, q.off + q.n); });
  P.targetPx((i) => (i < n ? [CX[K[i]] + DX[i], CY[K[i]] + DY[i]] : null));
  R.spun = 0;
}

/* which ring the hold has reached (-1 = none yet) and which ring the playhead is sweeping toward */
export function state(R) {
  const h = R.hold, k = h ? h.k : R.rest ? R.rest.k : 0, a = ringOfK(R, k), nx = h ? ringOfK(R, k + 1) : -1;
  return { a, nx, k };
}
export function ringOfK(R, k) { const r = R.nAt(k); return r ? R.RS.findIndex((q) => q.L === r.L) : -1; }

export function weigh(R, P, force) {
  const s = state(R), key = s.a + ':' + s.nx + ':' + !!R.hold;
  if (!force && key === R.litKey) return; R.litKey = key;
  const W = P.w, RS = R.RS, idle = s.a < 0 && s.nx < 0;
  RS.forEach((r, k) => W.fill(idle ? 230 : k === s.a ? 255 : k === s.nx ? 140 : k < s.a ? 165 : 60, r.off, r.off + r.n));
  const lo = s.a >= 0 ? RS[s.a].off : -1, hi = s.a >= 0 ? lo + RS[s.a].n : -1, n = R.n;
  P.color((i) => (i >= n ? MUTE : i >= lo && i < hi ? ICE : INK));
}

/* the reached rings turn while the bar loops: one turn per 2 to 4 bars, written straight to the dots so a ring
   never shrinks onto its chord. off under reduced motion, a struggling governor (tier 4+) and a trip in flight */
export function spin(R, ctx, now) {
  const h = R.hold, P = ctx.particles, A = ctx.atlas, tier = A && A.gov ? A.gov.tier : 0;
  if (!h || ctx.reduced || tier >= 4 || (P.morph && P.morph.on)) return;
  const a = ringOfK(R, h.k); if (a < 0) return;
  const DX = R.DX, DY = R.DY, el = (now - h.p0) / h.barMs, X = P.x, Y = P.y, TX = P.tx, TY = P.ty;
  for (let k = 0; k <= a; k++) {
    const r = R.RS[k], cx = r.x, cy = r.y, f = TAU * el / (2 + (k % 3)), c = cos(f), s = sin(f);
    for (let i = r.off, e = r.off + r.n; i < e; i++) { const x = cx + DX[i] * c - DY[i] * s, y = cy + DX[i] * s + DY[i] * c; TX[i] = X[i] = x; TY[i] = Y[i] = y; }
  }
  R.spun = 1;
}

/* R9: at rest the pedals breathe in a wave down the board, so the stop is alive before anyone holds (never 255: that is the lit ring) */
export function idle(R, ctx, t) {
  const A = ctx.atlas; if (R.hold || R.rest || ctx.reduced || (A && A.gov && A.gov.tier >= 4)) return;
  const k = (R.idleK = ((R.idleK | 0) + 1) % R.RS.length), r = R.RS[k]; /* one ring a frame: the cost is spread thin */
  ctx.particles.w.fill(196 + 48 * Math.sin(t * 2.4 - k * 0.65) | 0, r.off, r.off + r.n);
}
export function ringAt(R, sx, sy) {
  if (!R.RS || R.ang !== 'tower') return -1;
  return R.RS.findIndex((q) => abs(sx - q.x) <= R.cw / 2 && sy >= q.y - R.chh / 2 + R.lh / 2 && sy <= q.y + R.chh / 2 + R.lh / 2);
}
export const ringXY = (R, k) => { const q = R.RS[k]; return [q.x, q.y - q.r]; };

/* a ring's own count as a pulse: one quiet click per hundred streaks (rounded, at least one), 16 a second. a new pulse
   replaces the one in flight, so sweeping across rings never stacks trains */
export function pulse(R, k) { const r = R.RS[k]; R.pz = r ? { k, n: clicks(r.n), i: 0, t0: 0 } : null; R.pzLast = R.pz ? R.pz.n : 0; }
function pulseStep(R, A) {
  const z = R.pz; if (!z || !A || !A.ac || !A.on || A.muted) { if (z && (!A || A.muted || !A.on)) R.pz = null; return; }
  const now = A.ac.currentTime; if (!z.t0) z.t0 = now + 0.02;
  while (z.i < z.n) { const t = z.t0 + z.i / 16; if (t > now + 0.12) break; z.i++; if (t >= now - 0.02) A.note(9 - (z.k % 5), { at: max(0, t - now), dur: 0.05, vol: 0.022, type: 'triangle' }); }
  if (z.i >= z.n) R.pz = null;
}

function rr(g, x, y, w, h, q) { g.beginPath(); g.moveTo(x + q, y); g.arcTo(x + w, y, x + w, y + h, q); g.arcTo(x + w, y + h, x, y + h, q); g.arcTo(x, y + h, x, y, q); g.arcTo(x, y, x + w, y, q); g.closePath(); }

/* the board's still parts (bodies, unlit LEDs, ring tracks, words, counts) are painted once per state into a layer the size
   of the overlay and blitted each frame; only the playhead, the lit LEDs and the flash are drawn live */
function board(R, g, s, key) {
  const c = g.canvas, tf = g.getTransform(), L = R.lay || (R.lay = document.createElement('canvas'));
  if (L.width !== c.width || L.height !== c.height) { L.width = c.width; L.height = c.height; R.layKey = ''; }
  key += ':' + c.width + 'x' + c.height + ':' + tf.a + ':' + R.cx + ':' + R.cy;
  if (R.layKey === key) return L;
  R.layKey = key;
  const b = L.getContext('2d'), fc = R.fc, nar = R.nar, RS = R.RS, h = R.hold, cw = R.cw, chh = R.chh, ip = nar ? 3 : 6, fs = nar ? 9 : 10.5;
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, L.width, L.height); b.setTransform(tf);
  b.lineWidth = 1; b.textAlign = 'center'; b.textBaseline = 'middle';
  RS.forEach((q, k) => {
    const cur = k === s.a, hv = k === R.hov, far = h && k > max(s.a, s.nx);
    b.strokeStyle = fc ? '#fff' : cur ? IC + '.55)' : hv ? IK + '.4)' : IK + '.15)';
    rr(b, round(q.bl + ip) + 0.5, round(q.bt + ip) + 0.5, round(cw - 2 * ip), round(chh - 2 * ip), R.tiny ? 5 : nar ? 8 : 12); b.stroke();
    if (!R.tiny) { b.fillStyle = IK + '.16)'; b.beginPath(); b.arc(q.bl + cw - ip - 8, q.bt + ip + 8, nar ? 2.5 : 3, 0, TAU); b.fill(); }
    b.setLineDash([1, 4]); b.strokeStyle = fc ? '#fff' : IK + (far ? '.1)' : '.22)'); b.beginPath(); b.arc(q.x, q.y, q.r, 0, TAU); b.stroke(); b.setLineDash([]);
    /* the word under the ring; the count inside it on the reached or pointed pedal */
    b.font = (cur ? '600 ' : '400 ') + fs + MONO; b.fillStyle = fc ? '#fff' : cur ? '#86cbfe' : IK + (far ? '.38)' : '.74)');
    if (!R.tiny) b.fillText(q.word, q.x, q.y + q.r + R.lh * 0.66);
    if ((cur || hv) && !R.tiny) { b.font = '600 ' + (nar ? 11 : 13) + MONO; b.fillStyle = fc ? '#fff' : cur ? '#86cbfe' : IK + '.9)'; b.fillText(fmt(q.n), q.x, q.y + 0.5); }
  });
  if (h && s.a < 0 && s.nx >= 0) { const q = RS[s.nx]; b.font = '400 ' + (nar ? 8.5 : 10) + MONO; b.fillStyle = fc ? '#fff' : IC + '.8)'; b.fillText(h.via === 'demo' ? 'demo' : 'loop 1', q.x, q.y + 0.5); }
  return L;
}

export function draw(R, g, ctx, now) {
  try { pulseStep(R, ctx.audio); } catch (e) {}
  const red = ctx.reduced, nar = R.nar, RS = R.RS, s = state(R), h = R.hold, cw = R.cw, ip = nar ? 3 : 6;
  const fr = h ? ((now - h.p0) % h.barMs) / h.barMs : 0, pz = h && !red ? max(0, 1 - (now - R.flash) / 420) : 0;
  const L = board(R, g, s, [s.a, s.nx, R.hov, !!h, h && h.via, R.fc, R.tiny].join());
  const tf = g.getTransform(), d = tf.a, x0 = max(0, floor((R.bx - 4) * d + tf.e)), y0 = max(0, floor((R.by - 4) * d + tf.f));
  const bw = min(L.width - x0, Math.ceil((R.bw + 8) * d)), bh = min(L.height - y0, Math.ceil((R.bh + 8) * d));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); if (bw > 0 && bh > 0) g.drawImage(L, x0, y0, bw, bh, x0, y0, bw, bh); g.restore();
  g.lineWidth = 1;
  if (!R.tiny) RS.forEach((q, k) => {
    const led = k === s.a ? (h && !red && fr > 0.2 ? 0.5 : 1) : s.a >= 0 && k < s.a ? 0.4 : 0;
    if (led) { g.fillStyle = IC + led + ')'; g.beginPath(); g.arc(q.bl + cw - ip - 8, q.bt + ip + 8, nar ? 2.5 : 3, 0, TAU); g.fill(); }
  });
  if (h && s.nx >= 0) {
    const q = RS[s.nx], a1 = -PI / 2 + TAU * (red ? 1 : fr), rp = q.r + R.band + 2;
    g.strokeStyle = IC + (red ? '.5)' : '.9)'); g.lineWidth = 2; g.beginPath(); g.arc(q.x, q.y, rp, -PI / 2, a1); g.stroke(); g.lineWidth = 1;
    if (!red) { g.fillStyle = IC + '1)'; g.beginPath(); g.arc(q.x + rp * cos(a1), q.y + rp * sin(a1), 2.6, 0, TAU); g.fill(); }
  }
  if (s.a >= 0 && pz > 0) { const q = RS[s.a]; g.strokeStyle = IC + (0.7 * pz) + ')'; g.lineWidth = 1 + 3 * pz; g.beginPath(); g.arc(q.x, q.y, q.r + R.band + 2, 0, TAU); g.stroke(); g.lineWidth = 1; }
}
