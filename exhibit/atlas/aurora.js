/* the paper breathes: three dim blobs, one per arm, under every play. radius follows the whole-log arm share, brightness follows the whole-log hour
   profile at an hour hand that laps the clock every 4 minutes. 96 px wide, 4 draws a second, peak about a tenth over the paper. nothing sent or kept */
const W = 96, PERIOD = [[47, 61], [73, 53], [89, 67]], LAP = 240, FPS = 4, OPA = 0.16;
const ARMS = ['tap', 'shuffle', 'served'], SHARE = [0.19, 0.17, 0.64];
const hex = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
const CSS = '#atlas-aurora{position:fixed;inset:0;width:100vw;height:100vh;height:100svh;display:block;z-index:0;pointer-events:none;mix-blend-mode:lighten;opacity:' + OPA + '}' +
  '@media (forced-colors:active){#atlas-aurora{display:none}}';

export function mount(ctx) {
  const st = { frames: 0, draws: 0, ms: 0, mounted: false, hand: 0, dom: 0, swell: 0 };
  const fc = matchMedia('(forced-colors: active)').matches;
  const field = document.getElementById('field');
  if (fc || !field || !field.parentNode) return { unmount() {}, stats: () => ({ ...st }) };
  const P = ctx.PAL, col = [P.tap, P.shuffle, P.violet].map(hex);
  const H = Math.max(24, Math.min(64, Math.round(W * innerHeight / innerWidth)));
  const sty = document.createElement('style'); sty.textContent = CSS; document.head.appendChild(sty);
  const cv = document.createElement('canvas'); cv.id = 'atlas-aurora'; cv.width = W; cv.height = H; cv.setAttribute('aria-hidden', 'true');
  field.parentNode.insertBefore(cv, field.nextSibling); /* #field is opaque, so the wash sits just over it and lightens: only what is darker than the wash (the paper) lifts */
  const g = cv.getContext('2d'), img = g.createImageData(W, H), px = img.data;
  let prof = [new Float32Array(24).fill(1), new Float32Array(24).fill(1), new Float32Array(24).fill(1)];
  let timer = 0, dead = false;
  const t0 = performance.now(), reduced = !!ctx.reduced;
  /* under text (and 2 px round it) the wash keeps a quarter of its alpha, so the dimmest caption ink clears 7:1; two 3x3 box
     passes feather the edge. measured every draw: labels move with their stars */
  const keep = new Float32Array(W * H).fill(1), tmp = new Float32Array(W * H), ROOTS = 'section[data-room].is-active,#atlas-info,#atlas-onboard,#hint,#atlas-labels,#top,#ai-caption';
  function measure() {
    keep.fill(1);
    const sx = W / innerWidth, sy = H / innerHeight;
    document.querySelectorAll(ROOTS).forEach((root) => [root, ...root.querySelectorAll('*')].forEach((el) => {
      let tx = false; for (let n = el.firstChild; n && !tx; n = n.nextSibling) tx = n.nodeType === 3 && n.nodeValue.trim() !== '';
      if (!tx) return;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return;
      const x0 = Math.max(0, Math.floor(r.left * sx) - 2), x1 = Math.min(W - 1, Math.ceil(r.right * sx) + 1), y0 = Math.max(0, Math.floor(r.top * sy) - 2), y1 = Math.min(H - 1, Math.ceil(r.bottom * sy) + 1);
      for (let y = y0; y <= y1; y++) keep.fill(0.25, y * W + x0, y * W + x1 + 1);
    }));
    for (let p = 0; p < 2; p++) {
      tmp.set(keep);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let a = 0, n = 0;
        for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (yy >= 0 && yy < H && xx >= 0 && xx < W) { a += tmp[yy * W + xx]; n++; }
        keep[y * W + x] = a / n;
      }
    }
  }

  function draw(now) {
    try { measure(); } catch (e) {}
    const c0 = performance.now(), t = (now - t0) / 1000, hand = ((t / LAP) * 24) % 24, h0 = hand | 0, fr = hand - h0;
    let low = 0;
    const A = ctx.audio;
    if (A && A.on && !A.muted && typeof A.bands === 'function') { try { low = Math.min(1, A.bands().low || 0); } catch (e) {} }
    const lit = [0, 0, 0], B = [];
    for (let a = 0; a < 3; a++) {
      const p = prof[a]; lit[a] = 0.8 + 0.2 * (p[h0] * (1 - fr) + p[(h0 + 1) % 24] * fr);
    }
    const dom = lit[0] >= lit[1] && lit[0] >= lit[2] ? 0 : lit[1] >= lit[2] ? 1 : 2;
    for (let a = 0; a < 3; a++) {
      const [pa, pb] = PERIOD[a], w = 6.2832 * t, sw = a === dom ? 1 + 0.3 * low : 1;
      B.push({ x: (0.25 + 0.25 * a) * W + 0.2 * W * Math.sin(w / pa + a * 2.1), y: (0.35 + 0.15 * a) * H + 0.22 * H * Math.sin(w / pb + a), r: (0.22 + 0.6 * SHARE[a]) * W * sw, k: lit[a] });
    }
    for (let y = 0, i = 0; y < H; y++) {
      for (let x = 0; x < W; x++, i += 4) {
        let r = 0, gg = 0, b = 0, al = 0;
        for (let a = 0; a < 3; a++) {
          const q = B[a], dx = (x - q.x) / q.r, dy = (y - q.y) / q.r, d = 1 - dx * dx - dy * dy;
          if (d > 0) { const v = d * d * q.k; r += col[a][0] * v; gg += col[a][1] * v; b += col[a][2] * v; al += v; }
        }
        if (al > 0) { px[i] = Math.min(255, r / al); px[i + 1] = Math.min(255, gg / al); px[i + 2] = Math.min(255, b / al); px[i + 3] = Math.min(255, al * 200) * keep[i >> 2]; } else px[i + 3] = 0;
      }
    }
    g.putImageData(img, 0, 0);
    st.draws++; st.ms += performance.now() - c0; st.hand = hand; st.blobs = B.map((q) => ({ x: q.x / W, y: q.y / H, k: q.k })); st.dom = dom; st.swell = low;
  }
  const run = () => { if (!timer && !dead && !document.hidden && !reduced) timer = setInterval(() => { st.frames++; draw(performance.now()); }, 1000 / FPS); };
  const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };
  const vis = () => (document.hidden ? stop() : run());
  document.addEventListener('visibilitychange', vis);
  st.mounted = true;
  let st2 = 0; /* a new stop moves its text: re-measure and redraw once it has settled (the only redraw under reduced motion) */
  const offStop = ctx.onStop ? ctx.onStop(() => { clearTimeout(st2); st2 = setTimeout(() => { if (!dead) draw(performance.now()); }, 700); }) : null;

  const fin = (d) => {
    if (dead) return;
    if (d && d.tap && d.shuffle && d.served) prof = ARMS.map((k) => { const v = Float32Array.from(d[k]), m = Math.max(...v) || 1; return v.map((x) => x / m); });
    draw(performance.now()); st.frames++;
    run();
  };
  Promise.resolve(ctx.data ? ctx.data('clock') : null).then(fin, () => fin(null));

  return {
    unmount() { dead = true; stop(); clearTimeout(st2); if (typeof offStop === 'function') offStop(); document.removeEventListener('visibilitychange', vis); cv.remove(); sty.remove(); st.mounted = false; },
    stats() { return { ...st, timer: !!timer, avgMs: st.draws ? st.ms / st.draws : 0 }; },
  };
}
export default mount;
