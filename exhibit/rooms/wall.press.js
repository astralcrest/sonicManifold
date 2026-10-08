/* R11 THE PRESS (the wall's fifth angle). the whole log pulled as a two-ink print: one plate for the plays i tapped
   (mint), one for the plays the queue ran on (violet), each scaled to its own busiest month (wall.json, one column of
   the screen per month; shuffle stays off the press), screened at 15 and 75 degrees and laid on the paper, which is the
   page itself. a ruler of 24 solid spots under it does the same with the hours (clock.json). registered, the two inks
   only part where the hand and the queue disagreed; the knob slips the violet plate, and then every month parts.
   the plates are baked once into offscreen canvases; a turn of the knob only recomposes them (two blits). canvas 2d
   only, so a blocked webgl changes nothing. reduced motion: the sheet lands registered without the roll, the knob
   still turns. the ink bath yields while the sheet is up and comes back when it goes. */
const CAP = 'mint is what i tapped, violet what the queue played. they part where the two disagreed.';
const ALT = 'the press: the whole log printed in two inks, mint for the plays i tapped, violet for the plays the queue ran on, month by month, with the 24 hours as spots underneath.';
const TAU = Math.PI * 2, D2R = Math.PI / 180, STEPS = 12;
const { min, max, sqrt, hypot, round, ceil, floor, abs, atan2 } = Math;
const cl01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const q = (f) => { try { return f(); } catch (e) { return undefined; } };
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const dPt = (a, r) => [(40 + r * Math.sin(a * D2R)).toFixed(1), (40 - r * Math.cos(a * D2R)).toFixed(1)];
const dArc = (a0, a1) => { const p0 = dPt(a0, 29), p1 = dPt(a1, 29); return 'M' + p0[0] + ' ' + p0[1] + 'A29 29 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p1[0] + ' ' + p1[1]; };
const CSS = '.wp-press{position:absolute;pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
  '.wp-press canvas{position:absolute;left:0;top:0;touch-action:none;cursor:ew-resize}' +
  '.wp-knob{position:absolute;display:flex;align-items:center;gap:12px;pointer-events:auto;-webkit-user-select:none;user-select:none}' +
  'html.atlas .wp-knob .k-dial{width:60px;height:60px}.wp-knob .k-name,.wp-knob .k-say{display:block;text-align:left}html.atlas .wp-knob .k-say{min-height:0;margin-top:6px;white-space:nowrap;min-width:11ch}' +
  '@media (forced-colors:active){.wp-knob .k-arc,.wp-knob .k-needle line{stroke:Highlight}}';
const word = (v) => (v < 0.03 ? 'in register' : v < 0.4 ? 'a hair off' : v < 0.8 ? 'slipped' : 'way off');
const norm = (a) => { const m = max(...a, 1); return a.map((x) => x / m); };

export default async function press(W, C, o = {}) {
  const idn = await C.identity(), wj = idn && idn.wall;
  const want = () => W.live() && q(() => C.angle.get().id) === 'press';
  if (!want() || !wj || !Array.isArray(wj.tap)) return;
  const clk = await C.data('clock').catch(() => null);
  if (!want()) return;
  if (W.riso) W.riso.stop();
  const doc = document, mk = (t, c) => { const e = doc.createElement(t); if (c) e.className = c; return e; };
  const red = !!C.reduced, coarse = !!q(() => matchMedia('(pointer:coarse)').matches);
  const FC = !!q(() => matchMedia('(forced-colors:active)').matches), PAL = C.PAL || {};
  /* the two inks are the colour code's own (mint = i tapped, violet = the queue); forced colours print one ink, the
     queue's plate as rings */
  let inkA = hex(PAL.tap != null ? PAL.tap : 0x21f6bc), inkB = hex(PAL.violet != null ? PAL.violet : 0x8b6fd6), paper = hex(PAL.bg != null ? PAL.bg : 0x0a0118);
  if (FC) { const s = mk('span'); s.style.cssText = 'color:CanvasText;background:Canvas;position:absolute'; doc.body.appendChild(s); const cs = getComputedStyle(s); inkA = inkB = cs.color; paper = cs.backgroundColor; s.remove(); }
  const HA = norm(wj.tap), HB = norm(wj.served), NM = HA.length;
  const RA = clk && Array.isArray(clk.tap) ? norm(clk.tap) : null, RB = clk && Array.isArray(clk.served) ? norm(clk.served) : null;

  if (!doc.getElementById('wp-press-css')) { const st = mk('style'); st.id = 'wp-press-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const box = mk('div', 'wp-press'), cv = mk('canvas'), g = cv.getContext('2d');
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', ALT); cv.style.background = paper;
  box.appendChild(cv); W.root.appendChild(box); box.style.background = paper;
  const kw = mk('div', 'wp-knob');
  kw.innerHTML = '<div class="k-dial" role="slider" tabindex="0" aria-label="register: slips the violet plate against the mint" aria-valuemin="0" aria-valuemax="100" aria-keyshortcuts="w">' +
    '<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false"><path class="k-track" d="' + dArc(-135, 135) + '"/><path class="k-arc" d=""/>' +
    '<circle class="k-cap" cx="40" cy="40" r="21"/><g class="k-needle"><line x1="40" y1="40" x2="40" y2="23"/></g></svg></div>' +
    '<div><span class="k-name">register</span><span class="k-say"></span></div>';
  box.appendChild(kw);
  const dial = kw.firstChild, arc = kw.querySelector('.k-arc'), needle = kw.querySelector('.k-needle'), sayEl = kw.querySelector('.k-say');

  const ST = { on: true, v: 0, bakes: 0, bakeMs: 0, composes: 0, dots: 0, rolled: red || !!o.instant ? 1 : 0, clicks: 0, fc: FC };
  let v = 0, R = null, dpr = 1, PA = null, PB = null, raf = 0, rollRaf = 0, flipRaf = 0, rollT0 = 0, lastClick = 0;

  /* ------------------------------------------------------------------ the plates */
  function plate(H, R24, col, deg, ring, seed) {
    const c = mk('canvas'), w = cv.width, h = cv.height; c.width = w; c.height = h;
    const x = c.getContext('2d'), p = (coarse ? 3.9 : 5.2) * dpr, th = deg * D2R, ux = Math.cos(th) * p, uy = Math.sin(th) * p;
    const padX = w * 0.04, top = h * 0.07, waveH = h * (R24 ? 0.7 : 0.86), mid = top + waveH / 2, half = waveH / 2, span = w - 2 * padX;
    const env = (u) => { const f = u * (NM - 1), k = floor(f), t = f - k; return k >= NM - 1 ? H[NM - 1] : H[k] + (H[k + 1] - H[k]) * t; };
    const N = ceil(hypot(w, h) / 2 / p) + 1, cx = w / 2, cy = h / 2;
    let n = 0;
    x.fillStyle = x.strokeStyle = col; x.lineWidth = max(1, 0.18 * p);
    x.beginPath();
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
      const X = cx + i * ux - j * uy, Y = cy + i * uy + j * ux;
      if (X < padX - p || X > w - padX + p || Y < top - p || Y > top + waveH + p) continue;
      const u = (X - padX) / span; if (u < 0 || u > 1) continue;
      const e = env(u) * 0.97; if (e < 0.004) continue;
      const vv = abs(Y - mid) / half / e; if (vv >= 1) continue;
      const hz = hash(i, j, seed); if (hz < 0.012) continue; /* a starved dot, as a real drum leaves */
      const d = Math.pow(1 - vv * vv, 0.7) * (0.93 + 0.07 * Math.sin(u * 9.1 + seed));
      const r = p * 0.52 * sqrt(d) * (0.9 + 0.16 * hz); if (r < 0.35) continue;
      x.moveTo(X + r, Y); x.arc(X, Y, r, 0, TAU); n++;
    }
    /* the month rule: one pin dot per month on the centre line, so the empty stretches still read as time */
    const pr = max(0.8, 0.7 * dpr);
    for (let k = 0; k < NM; k++) { const X = padX + (k / (NM - 1)) * span; x.moveTo(X + pr, mid); x.arc(X, mid, pr, 0, TAU); }
    if (ring) x.stroke(); else x.fill();
    /* the hour ruler: 24 solid spots, area for count, each plate to its own busiest hour */
    if (R24) {
      const ry = top + waveH + (h - top - waveH) * 0.5, cw = span / 24, rm = min(cw * 0.46, (h - top - waveH) * 0.32);
      x.beginPath();
      R24.forEach((val, k) => { const r = rm * sqrt(val); if (r < 0.6) return; const X = padX + (k + 0.5) * cw; x.moveTo(X + r, ry); x.arc(X, ry, r, 0, TAU); });
      if (ring) x.stroke(); else x.fill();
    }
    /* registration marks: a ring and a cross at each corner, on both plates, so the slip shows even where no month does */
    const m = 9 * dpr, rr = 5 * dpr, inset = 12 * dpr;
    x.lineWidth = max(1, 1.1 * dpr); x.beginPath();
    [[inset, inset], [w - inset, inset], [inset, h - inset], [w - inset, h - inset]].forEach(([X, Y]) => { x.moveTo(X + rr, Y); x.arc(X, Y, rr, 0, TAU); x.moveTo(X - m, Y); x.lineTo(X + m, Y); x.moveTo(X, Y - m); x.lineTo(X, Y + m); });
    x.stroke();
    ST.dots += n;
    return c;
  }
  function bake() {
    const t0 = performance.now(); ST.dots = 0;
    PA = plate(HA, RA, inkA, 15, false, 1); PB = plate(HB, RB, inkB, 75, FC, 2);
    ST.bakes++; ST.bakeMs = +(performance.now() - t0).toFixed(1);
  }
  /* ra, rb: how far each drum has rolled (0..1), for the arrival only */
  function compose(ra = 1, rb = 1) {
    const w = cv.width, h = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    if (!PA) return;
    if (ra > 0) g.drawImage(PA, 0, 0, ra * w, h, 0, 0, ra * w, h);
    if (rb > 0) {
      g.globalCompositeOperation = FC ? 'source-over' : 'lighter';
      g.translate(w / 2 + v * 0.045 * w, h / 2 - v * 0.035 * h); g.rotate(v * 1.1 * D2R); g.translate(-w / 2, -h / 2);
      g.drawImage(PB, 0, 0, rb * w, h, 0, 0, rb * w, h);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    g.globalCompositeOperation = 'source-over';
    /* the drum: a pale bar at the edge still rolling */
    [ra, rb].forEach((f) => { if (f > 0 && f < 1) { g.fillStyle = 'rgba(216,210,234,.55)'; g.fillRect(f * w - dpr, 0, 2 * dpr, h); } });
    ST.composes++;
  }
  const req = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; compose(); }); };
  function roll() {
    cancelAnimationFrame(rollRaf); rollT0 = performance.now(); ST.rolled = 0;
    const step = () => {
      const t = (performance.now() - rollT0) / 1000, ra = ease(t / 0.8), rb = ease((t - 0.6) / 0.8);
      compose(ra, rb);
      if (rb < 1 && W.riso === S) rollRaf = requestAnimationFrame(step); else { rollRaf = 0; ST.rolled = 1; }
    };
    rollRaf = requestAnimationFrame(step);
  }
  const stopRoll = () => { if (rollRaf) { cancelAnimationFrame(rollRaf); rollRaf = 0; ST.rolled = 1; } };

  /* ------------------------------------------------------------------ the knob */
  function click() {
    const A = C.audio, t = performance.now();
    if (!A || !A.ac || !A.sfx || A.muted || A.ac.state !== 'running' || A.clipState === 'hot' || t - lastClick < 35) return;
    lastClick = t; ST.clicks++;
    q(() => {
      const ac = A.ac, now = ac.currentTime, os = ac.createOscillator(), gn = ac.createGain();
      os.type = 'triangle'; os.frequency.value = 1760; /* A6, a tone of D minor pentatonic */
      gn.gain.setValueAtTime(0.0001, now); gn.gain.exponentialRampToValueAtTime(0.045, now + 0.003); gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      os.connect(gn); gn.connect(A.sfx); os.start(now); os.stop(now + 0.06);
    });
  }
  function paintDial() {
    const a = -135 + 270 * v;
    needle.style.transform = 'rotate(' + a.toFixed(1) + 'deg)';
    arc.setAttribute('d', v > 0.004 ? dArc(-135, a) : '');
    dial.setAttribute('aria-valuenow', String(round(v * 100))); dial.setAttribute('aria-valuetext', word(v));
    if (sayEl.textContent !== word(v)) sayEl.textContent = word(v);
  }
  function set(nv) {
    nv = cl01(+nv || 0); if (nv === v || (abs(nv - v) < 1e-4 && nv % 1)) return;
    const s0 = floor(v * STEPS + 1e-6), s1 = floor(nv * STEPS + 1e-6);
    v = ST.v = nv; if (s0 !== s1) click();
    stopRoll(); paintDial(); req();
  }
  function flip() {
    cancelAnimationFrame(flipRaf); const from = v, to = v > 0.5 ? 0 : 1;
    if (red) { set(to); return; }
    const t0 = performance.now(), step = () => { const k = ease((performance.now() - t0) / 650); set(from + (to - from) * k); flipRaf = k < 1 && W.riso === S ? requestAnimationFrame(step) : 0; };
    flipRaf = requestAnimationFrame(step);
  }
  dial.addEventListener('keydown', (e) => {
    const k = e.key, d = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05, PageUp: 0.25, PageDown: -0.25 }[k];
    if (d == null && k !== 'Home' && k !== 'End') return;
    e.preventDefault(); e.stopPropagation();
    set(k === 'Home' ? 0 : k === 'End' ? 1 : v + d);
  });
  const dialAt = (e) => { const b = dial.getBoundingClientRect(), a = atan2(e.clientX - b.left - b.width / 2, b.top + b.height / 2 - e.clientY) / D2R; return (max(-135, min(135, a)) + 135) / 270; };
  dial.addEventListener('pointerdown', (e) => { e.preventDefault(); q(() => dial.setPointerCapture(e.pointerId)); q(() => dial.focus({ preventScroll: true })); dial.dataset.drag = '1'; set(dialAt(e)); });
  dial.addEventListener('pointermove', (e) => { if (dial.dataset.drag) set(dialAt(e)); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => dial.addEventListener(t, () => { delete dial.dataset.drag; }));

  /* the print itself: one finger slides the plate sideways, two fingers twist it */
  const P2 = new Map(); let v0 = 0, x0 = null, tw = null, acc = 0;
  const twA = () => { const [a, b] = [...P2.values()]; return atan2(b[1] - a[1], b[0] - a[0]); };
  cv.addEventListener('pointerdown', (e) => {
    q(() => cv.setPointerCapture(e.pointerId)); P2.set(e.pointerId, [e.clientX, e.clientY]); stopRoll(); cancelAnimationFrame(flipRaf);
    v0 = v; acc = 0;
    if (P2.size === 1) { x0 = e.clientX; tw = null; } else if (P2.size === 2) { x0 = null; tw = twA(); }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!P2.has(e.pointerId)) return; P2.set(e.pointerId, [e.clientX, e.clientY]);
    if (P2.size >= 2 && tw != null) { const a = twA(); let d = a - tw; d -= TAU * Math.round(d / TAU); tw = a; acc += d; set(v0 + acc / (Math.PI / 2)); }
    else if (x0 != null && R) set(v0 + (e.clientX - x0) / (R.w * 0.6));
  });
  const lift = (e) => { P2.delete(e.pointerId); tw = null; v0 = v; acc = 0; x0 = P2.size === 1 ? [...P2.values()][0][0] : null; };
  ['pointerup', 'pointercancel'].forEach((t) => cv.addEventListener(t, lift));
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ------------------------------------------------------------------ layout */
  function fit() {
    const s = C.stage(), ph = s.w < 600, KH = ph ? 66 : 80, gap = ph ? 10 : 16;
    const w = round(s.w), h = round(max(140, min(s.h - KH - gap, s.w * (ph ? 0.9 : 0.66)))), oy = round(max(0, (s.h - h - KH - gap) / 2));
    R = { x: round(s.x), y: round(s.y) + oy, w, h };
    /* the sheet of paper is the whole stage, so nothing of the field shows round the print and no drag reaches the camera */
    box.style.left = round(s.x) + 'px'; box.style.top = round(s.y) + 'px'; box.style.width = w + 'px'; box.style.height = round(s.h) + 'px';
    dpr = min(3, devicePixelRatio || 1);
    cv.width = round(w * dpr); cv.height = round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.style.top = oy + 'px';
    kw.style.right = gap + 'px'; kw.style.top = (oy + h + gap) + 'px';
    bake();
  }
  let rzT = 0;
  const onRz = () => { clearTimeout(rzT); rzT = setTimeout(() => { if (W.riso === S) { fit(); stopRoll(); compose(); } }, 160); };
  addEventListener('resize', onRz);

  /* ------------------------------------------------------------------ the room around it */
  const wgWas = !!(W.wg && !W.wg.hidden);
  W.holding = W.hand = false; W.press = null; q(() => W.releaseSwell(C));
  if (W.wg) W.wg.hidden = true; if (W.cue) W.cue.hidden = true;
  q(() => C.labels.set('wall', [])); q(() => C.hud(null));
  const put = (el, s) => { if (el && el.textContent !== s) el.textContent = s; };
  put(W.say, 'the whole log as a print: one plate for my taps, one for the queue, each to its own scale.');
  put(W.dim, 'in register the inks part only where we disagreed. ' + (coarse ? 'drag the print or twist two fingers' : 'turn the knob or press w') + ' to slip the plates. shuffle stays off the press.');
  const ink = C.atlas && C.atlas.ink;
  if (ink && ink.hush) q(() => ink.hush(true));
  /* the phone sight names what it rests on; on the sheet there is nothing to name */
  const retWas = W.reticle; W.reticle = false;
  /* the caption goes through the chrome's one slot, after anything the field layers say (they are hushed here) */
  const AT = C.atlas;
  if (AT && !AT.__press) { AT.__press = 1; const prev = AT.capFor; AT.capFor = (id, a) => (typeof prev === 'function' ? prev(id, a) : null) || (id === 'wall' && a === 'press' ? CAP : null); }
  q(() => { const ta = C.tour && C.tour.active; if (!(ta && ta.playing)) C.caption.clear(); });

  const S = {
    el: kw, fit: () => { fit(); compose(); }, set, flip, get: () => v,
    stats: () => Object.assign({}, ST, { rect: R, dpr, w: cv.width, h: cv.height, inks: [inkA, inkB], paper }),
    stop() {
      if (W.riso !== S) return;
      W.riso = null; ST.on = false;
      [raf, rollRaf, flipRaf].forEach((r) => cancelAnimationFrame(r)); clearTimeout(rzT);
      removeEventListener('resize', onRz);
      box.remove(); PA = PB = null;
      if (ink && ink.hush) q(() => ink.hush(false));
      W.reticle = retWas;
      if (AT && AT.press === S) AT.press = null;
      if (W.cue) W.cue.hidden = false; if (W.wg && wgWas && !W.done) W.wg.hidden = false;
      q(() => W.copy()); q(() => W.atlasLabels(C));
    },
  };
  W.riso = S; if (AT) AT.press = S;
  fit(); paintDial();
  if (red || o.instant) compose(); else roll();
  return S;
}
