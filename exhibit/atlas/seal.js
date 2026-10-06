/* seal, certificate, long exposure (lazy; photo.js + card.js import it on a save). the seal uses whole-log aggregates
   only: 97,427 plays, the 19.08/16.69/64.23 split (wall.json pct), the 14 family totals (threshold_grid.json column sums,
   fam_order); nothing per day or per artist. the certificate counts the image's own ink; the edition id hashes the url
   hash. no time, no device, nothing about the visitor. */
const N = 97427, ARM = [19.08, 16.69, 64.23];
const FAMN = [4792, 672, 19897, 33, 570, 1008, 24174, 606, 4789, 7294, 2581, 567, 8649, 21795];
const INK = ['#21f6bc', '#f5a623', '#8b6fd6'], ICE = '#86cbfe', BG = '#0a0118';
const MONO = '"JetBrains Mono","SF Mono",ui-monospace,monospace', TAU = Math.PI * 2, C = Math.cos, Sn = Math.sin;

export function drawSeal(g, x, y, r) {
  g.save(); g.translate(x, y); g.lineCap = 'butt';
  g.fillStyle = 'rgba(10,1,24,.88)'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  /* outer ring: who pressed play, three arcs */
  let a = -Math.PI / 2; g.lineWidth = r * 0.13;
  ARM.forEach((p, i) => { const s = TAU * p / 100; g.strokeStyle = INK[i]; g.beginPath(); g.arc(0, 0, r * 0.86, a + 0.04, a + s - 0.04); g.stroke(); a += s; });
  /* a tick per 1,000 plays: 97 ticks + a 0.427 stub, the ring closes on 97,427 */
  const st = TAU / (N / 1000), w = Math.max(1, r * 0.014);
  g.strokeStyle = ICE; g.globalAlpha = 0.6; g.lineWidth = w;
  for (let k = 0; k * 1000 < N; k++) {
    const f = Math.min(1, (N - k * 1000) / 1000), t = -Math.PI / 2 + k * st, c = C(t), s = Sn(t);
    g.beginPath(); g.moveTo(c * r * 0.72, s * r * 0.72); g.lineTo(c * r * (0.72 - 0.08 * f), s * r * (0.72 - 0.08 * f)); g.stroke();
  }
  /* 14 petals, one per family in fam order, length ~ sqrt(whole-log plays) */
  const mx = Math.max(...FAMN), pw = TAU / 14 * 0.22;
  FAMN.forEach((v, k) => {
    const t = -Math.PI / 2 + k * TAU / 14, L = r * (0.16 + 0.42 * Math.sqrt(v / mx)), q = r * 0.1;
    g.beginPath(); g.moveTo(C(t) * q, Sn(t) * q);
    g.quadraticCurveTo(C(t - pw) * L * 0.7, Sn(t - pw) * L * 0.7, C(t) * L, Sn(t) * L);
    g.quadraticCurveTo(C(t + pw) * L * 0.7, Sn(t + pw) * L * 0.7, C(t) * q, Sn(t) * q);
    g.globalAlpha = 0.2; g.fillStyle = ICE; g.fill(); g.globalAlpha = 0.75; g.strokeStyle = ICE; g.stroke();
  });
  g.globalAlpha = 1; g.fillStyle = BG; g.beginPath(); g.arc(0, 0, r * 0.15, 0, TAU); g.fill(); g.fillStyle = ICE; g.font = '600 ' + Math.round(r * 0.3) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('a', 0, r * 0.02); g.restore();
}

/* ink audit: paper off each sampled pixel (soft edges keep their hue), then a hue + saturation window per arm token
   (mint 148-170°, amber 33-50°, violet 248-272°); family hues, fog, white, ice fall outside. mode = what the room's
   colours mean: 3 the split, 2 mint vs violet, 0 other (graveyard amber = chance): no count */
const TWO = /^(chain|game|hundred|listeners|wheel)$/, THREE = /^(arrivals|calendar|clock|threshold|wall|yours|universe)$/;
export const modeOf = (room) => THREE.test(room) ? 3 : TWO.test(room) ? 2 : 0;
export function inkAudit(cv, mode = 3) {
  if (!mode) return { n: 0, pct: null };
  const c = [0, 0, 0], w = cv.width, h = cv.height;
  let d, m = 0; try { d = cv.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { return null; }
  const s = Math.max(1, Math.round(Math.sqrt(w * h / 3e5)));
  for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
    const i = (y * w + x) * 4, r = Math.max(0, d[i] - 10), g = Math.max(0, d[i + 1] - 1), b = Math.max(0, d[i + 2] - 24), mx = Math.max(r, g, b), q = mx - Math.min(r, g, b);
    m++; if (mx < 48 || !q) continue;
    const S = q / mx, H = ((mx === r ? 60 * (g - b) / q : mx === g ? 120 + 60 * (b - r) / q : 240 + 60 * (r - g) / q) + 360) % 360;
    const k = H >= 148 && H <= 170 && S >= 0.6 ? 0 : H >= 33 && H <= 50 && S >= 0.8 ? 1 : H >= 248 && H <= 272 && S >= 0.15 ? 2 : -1;
    if (k >= 0) c[k]++;
  }
  if (mode === 2) { c[2] += c[1]; c[1] = 0; }
  const n = c[0] + c[1] + c[2];
  if (n < Math.max(60, m * 0.002)) return { n, pct: null };
  const raw = c.map((v) => v * 100 / n), pct = raw.map(Math.floor);
  raw.map((v, i) => [v - pct[i], i]).sort((a, b) => b[0] - a[0]).slice(0, 100 - pct[0] - pct[1] - pct[2]).forEach(([, i]) => pct[i]++);
  return { n, pct, two: mode === 2 };
}

/* the edition is the link: fnv-1a of the url hash, nothing else */
export function edition(hash) {
  let h = 0x811c9dc5; const s = String(hash || '#');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const x = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return x.slice(0, 4) + '-' + x.slice(4, 6);
}

export function certLine(au, ed, noun) {
  const p = au && au.pct, head = p ? noun + '\u2019s ink: ' + p[0] + '% mint · ' + (au.two ? '' : p[1] + '% amber · ') + p[2] + '% violet'
    : noun + ': not inked by who pressed play · the whole log: 19 · 17 · 64';
  return [head, 'astralcrest · edition ' + ed];
}

/* photo stamp: the seal lower right, the certificate in a strip under the picture (the canvas grows) */
export function stamp(src, au, ed, dpr) {
  const w = src.width, L = certLine(au, ed, 'this frame'), two = w / dpr < 640;
  let fs = Math.round(11 * dpr); const pad = Math.round(10 * dpr), sh = Math.round((two ? 2 : 1) * fs * 1.5 + pad * 1.4);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = src.height + sh;
  const g = cv.getContext('2d'); g.drawImage(src, 0, 0);
  const r = Math.round(Math.min(34 * dpr, w * 0.07)); drawSeal(g, w - r - pad * 1.4, src.height - r - pad * 1.4, r);
  g.fillStyle = BG; g.fillRect(0, src.height, w, sh);
  g.fillStyle = 'rgba(134,203,254,.35)'; g.fillRect(0, src.height, w, Math.max(1, dpr));
  const t = two ? L : [L.join(' · ')];
  g.font = '500 ' + fs + 'px ' + MONO; while (fs > 6 && Math.max(...t.map((s) => g.measureText(s).width)) > w - pad * 2) g.font = '500 ' + --fs + 'px ' + MONO;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  t.forEach((s, i) => { g.fillStyle = i ? ICE : '#d8d2ea'; g.fillText(s, pad, src.height + pad * 0.7 + fs * (1.15 + i * 1.5)); });
  cv.dataset.cert = t.join(' / ');
  return cv;
}

/* long exposure: `grab(g, w, h)` draws one stage frame. every frame goes into a max-blend (trails), a few evenly spaced
   ones into an additive mean (halos); they meet through `screen`, which rolls off instead of clipping (the tone map).
   the paper comes off each frame (difference) and goes back once, so the black never greys. `stop()` aborts: null */
export function expose({ w, h, ms, coarse, grab, stop }) {
  const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const [fr, fg] = mk(), [mean, mg] = mk(), [tr, tg] = mk(), M = coarse ? 10 : 16;
  mg.fillStyle = tg.fillStyle = '#000'; mg.fillRect(0, 0, w, h); tg.fillRect(0, 0, w, h);
  mg.globalCompositeOperation = 'lighter'; mg.globalAlpha = 1 / M; tg.globalCompositeOperation = 'lighten';
  return new Promise((res) => {
    const t0 = performance.now(); let k = 0, f = 0;
    const step = (now) => {
      if (stop()) { res(null); return; }
      const u = Math.min(1, (now - t0) / ms);
      if (!coarse || f++ % 2 === 0 || u >= 1) {
        fg.globalCompositeOperation = 'source-over'; fg.fillStyle = BG; fg.fillRect(0, 0, w, h); grab(fg, w, h);
        fg.globalCompositeOperation = 'difference'; fg.fillRect(0, 0, w, h); tg.drawImage(fr, 0, 0);
        while (k < M && u >= k / (M - 1)) { mg.drawImage(fr, 0, 0); k++; }
      }
      if (u < 1) { requestAnimationFrame(step); return; }
      const [out, og] = mk(); og.drawImage(mean, 0, 0); og.globalCompositeOperation = 'screen'; og.globalAlpha = 0.7; og.drawImage(tr, 0, 0);
      og.globalCompositeOperation = 'lighter'; og.globalAlpha = 1; og.fillStyle = BG; og.fillRect(0, 0, w, h);
      res(out);
    };
    requestAnimationFrame(step);
  });
}
