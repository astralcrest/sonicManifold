/* the engine room: a live x-ray of how this frame is drawn, loaded only on `x`, ?x=1 or the dock. numbers are read from the
   page or measured here, else n/a; nothing is sent or stored. closed, it is unsubscribed and costs nothing */
const N = 120, IV = new Float32Array(N), WK = new Float32Array(N), TMP = new Float32Array(N);
const RM = matchMedia('(prefers-reduced-motion: reduce)'), FC = matchMedia('(forced-colors: active)');
const GOVT = ['full detail', 'cells one step coarser', 'cells two steps coarser', 'bloom off', 'twinkle, glints, edges, drift off', 'labels capped at 12, flights jump'];
const S = { open: false, frames: 0, cost: 0, costMs: NaN, cN: 0, p50: NaN, p95: NaN, w50: NaN, w95: NaN, last: NaN, slow: 0, spark: 0, lives: 0, ticks: 0 };
let k = 0, filled = 0, unF = null, timer = 0, el = null, Q = {}, cv, g, btn, back = null, cssP = null, lastLive = '', liveT = 0;
let an2 = null, buf, RES = [], full = false, po = null, lpo = null, lt = -1, stopT = 0, stopId = '', govLog = '', sw = 'n/a', swT = -1e9;
const X = () => window.__exhibit;
const f = (v, d = 1) => (v == null || v !== v ? 'n/a' : v.toFixed(d));
const n0 = (v) => (v == null || v !== v ? 'n/a' : Math.round(v).toLocaleString('en-US'));
const T = (q, v) => { Q[q].textContent = v; }, now = () => performance.now();
const onoff = (m) => (m.matches ? 'on' : 'off');

const inst = new Promise((res) => {
  (function w(i) { const x = X(); if (x && x.ctx) return res(x); if (i < 300) setTimeout(() => w(i + 1), 100); })(0);
}).then((x) => {
  const c = x.ctx;
  c.keys.on('x', () => { toggle(); });
  c.onStop((ev) => { stopT = now(); stopId = (ev && ev.id) || 'stop'; });
  if (c.atlas && c.atlas.onGov) c.atlas.onGov((t) => { govLog = 'stepped to ' + t + ' at ' + f(now() / 1000) + ' s (45 frames over 26 ms)'; });
});

export function toggle(force) { return inst.then(() => ((force === undefined ? !S.open : !!force) ? show() : hide())); }
export function stats() { return { ...S, filled, subscribed: !!unF, timer: !!timer, an: !!an2 }; }

/* the only per-frame work: the interval, and frame start to the room drawn */
function onF(t, dt) {
  const t0 = now();
  if (dt > 0 && dt < 1000) { IV[k] = dt; WK[k] = S.last = t0 - t; k = (k + 1) % N; if (filled < N) filled++; }
  S.frames++; S.cost += now() - t0;
}
function pct(src, p) { TMP.set(src); const a = TMP.subarray(0, filled); a.sort(); return a[Math.min(filled - 1, Math.floor(p * filled))]; }

function build() {
  const row = (k, t) => '<div><dt>' + t + '</dt><dd data-k="' + k + '"></dd></div>';
  document.body.insertAdjacentHTML('beforeend', '<div id="eng" role="dialog" aria-modal="true" aria-labelledby="eng-h" tabindex="-1" hidden><div class="eng-top"><h2 id="eng-h">engine room</h2><button type="button" class="eng-x" aria-label="close the engine room (x or escape)">×</button></div>' +
    '<p class="eng-how" data-k="how"></p><canvas aria-hidden="true"></canvas><dl>' +
    row('fr', 'frame') + row('wk', 'work') + row('fd', 'field') + row('gv', 'governor') + row('br', 'breath') +
    '<div><dt>sound</dt><dd><span data-k="sn"></span><span class="eng-bars" aria-hidden="true"><i><b></b></i><i><b></b></i><i><b></b></i></span></dd></div>' +
    row('nt', 'requests') + row('lt', 'long tasks') + row('sw', 'worker') + row('st', 'stop') + row('tr', 'tour') + row('yo', 'your screen') + row('pc', 'this panel') +
    '</dl><p class="eng-foot">measured in this tab; nothing leaves it or is kept.</p><p class="eng-sr" aria-live="polite" data-k="sr"></p></div>');
  el = document.getElementById('eng');
  el.querySelectorAll('[data-k]').forEach((d) => { Q[d.dataset.k] = d; });
  Q.bars = el.querySelectorAll('.eng-bars b');
  cv = el.querySelector('canvas'); g = cv.getContext('2d'); btn = el.querySelector('.eng-x');
  btn.addEventListener('click', hide);
}
function css() {
  return cssP || (cssP = new Promise((res) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('engine.css' + new URL(import.meta.url).search, import.meta.url).href;
    l.onload = l.onerror = res; document.head.appendChild(l);
  }));
}
async function show() {
  if (S.open) return;
  S.open = true; await css(); if (!S.open) return;
  if (!el) build();
  const c = X().ctx, ins = (c.atlas && c.atlas.insets) || {};
  el.style.setProperty('--eng-top', Math.max(56, (ins.top | 0) + 10) + 'px');
  back = document.activeElement;
  filled = k = S.frames = S.cost = S.cN = 0; S.costMs = NaN;
  unF = c.onFrame(onF);
  resOpen();
  el.hidden = false; requestAnimationFrame(() => { if (S.open) el.classList.add('on'); });
  btn.focus();
  addEventListener('keydown', key, true); el.addEventListener('focusout', trap);
  tick(); timer = setInterval(tick, RM.matches ? 1000 : 250);
}
function hide() {
  if (!S.open) return;
  S.open = false;
  if (unF) { unF(); unF = null; }
  clearInterval(timer); timer = 0;
  removeEventListener('keydown', key, true);
  if (po) po.disconnect(); if (lpo) lpo.disconnect(); po = lpo = null;
  untap();
  if (!el) return;
  el.removeEventListener('focusout', trap); el.classList.remove('on'); el.hidden = true;
  try { if (back && document.contains(back)) back.focus({ preventScroll: true }); } catch (e) {}
  back = null;
}
/* focus stays in the panel; x and escape close it, ahead of the camera's escape */
function key(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const q = e.key === 'Escape' || e.key === 'x';
  if (q || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); if (q) hide(); else btn.focus(); }
}
function trap(e) { if (!el.contains(e.relatedTarget)) setTimeout(() => { if (S.open && !el.contains(document.activeElement)) btn.focus({ preventScroll: true }); }, 0); }

function resOpen() {
  const rec = (e) => RES.push([e.startTime, e.transferSize || 0]);
  RES = []; lt = -1;
  try { const L = performance.getEntriesByType('resource'); full = L.length >= 250; L.forEach(rec); po = new PerformanceObserver((l) => l.getEntries().forEach(rec)); po.observe({ type: 'resource' }); } catch (e) {}
  try { if (PerformanceObserver.supportedEntryTypes.includes('longtask')) { lpo = new PerformanceObserver((l) => { lt += l.getEntries().length; }); lpo.observe({ type: 'longtask' }); lt = 0; } } catch (e) {}
}
/* a read-only fan-out from the mix analyser; the shell's own smoothing is untouched */
function untap() { if (an2) { try { X().ctx.audio.an.disconnect(an2); } catch (e) {} an2 = null; } }
function bands() {
  const A = X().ctx.audio;
  if (!A || !A.ac || !A.an || A.muted || !A.on) { untap(); return null; }
  if (!an2) {
    try { an2 = A.ac.createAnalyser(); an2.fftSize = A.an.fftSize; an2.smoothingTimeConstant = A.an.smoothingTimeConstant; A.an.connect(an2); buf = new Uint8Array(an2.frequencyBinCount); } catch (e) { an2 = null; return null; }
  }
  an2.getByteFrequencyData(buf); let lo = 0, mi = 0, hi = 0;
  for (let i = 1; i < 8; i++) lo += buf[i]; for (let i = 8; i < 48; i++) mi += buf[i]; for (let i = 48; i < 160; i++) hi += buf[i];
  return [lo / 1785, mi / 10200, hi / 28560];
}
function swState() {
  const s = navigator.serviceWorker;
  if (!s) { sw = 'n/a here'; return; }
  s.getRegistration().then((r) => { sw = r ? (s.controller ? 'registered, controlling this page' : 'registered, not controlling') : 'none registered'; }, () => { sw = 'n/a'; });
}

function tick() {
  const t0 = now(), x = X(), c = x.ctx, at = x.atlas || {}, P = x.P;
  S.ticks++;
  if (filled) {
    S.p50 = pct(IV, 0.5); S.p95 = pct(IV, 0.95); S.w50 = pct(WK, 0.5); S.w95 = pct(WK, 0.95);
    S.slow = 0; for (let i = 0; i < filled; i++) if (IV[i] > 26) S.slow++;
  }
  if (t0 - swT > 5000) { swT = t0; swState(); }
  let st = null, gc = null, sky = null;
  try { st = at.GF && !at.GF.stub ? at.GF.stats() : null; gc = at.glyphCfg(); sky = at.sky(); } catch (e) {}
  const dots = P ? n0(P.n) + ' dots' + (P.perDot > 1.01 ? ' (one per ' + f(P.perDot, 0) + ' plays)' : '') : 'n/a', grid = st ? st.cols + '×' + st.rows : 'n/a';
  T('how', 'how this frame is drawn: ' + (P ? n0(P.n) : 'n/a') + ' dots → ' + grid + ' density grid → a glyph per lit cell → ' +
    (gc ? (gc.mode === 'cat' ? 'one colour per category' : 'colour sampled from its dots') : 'colour n/a') + '; this frame ' + f(S.last) + ' ms');
  T('fr', 'every ' + f(S.p50) + ' ms, p95 ' + f(S.p95) + ' (last ' + filled + ' frames' + (RM.matches ? '; reduced motion: 4 redraws a second' : '') + ')');
  T('wk', 'p50 ' + f(S.w50) + ' · p95 ' + f(S.w95) + ' ms (frame start to the room drawn)');
  T('fd', dots + (st ? ' → ' + grid + ' cells of ' + f(st.cellCss) + ' px · ' + n0(st.occ) + ' lit · ' + n0(st.drawn) + ' drawn' + (sky && sky.n ? ' · ' + n0(sky.n) + ' groove marks' : '') : ' · grid n/a'));
  const gov = c.atlas && c.atlas.gov, gt = gov ? gov.tier | 0 : -1;
  T('gv', gt < 0 ? 'n/a' : 'tier ' + gt + ' · ' + GOVT[gt] + ' · ' + (govLog || (gt ? 'stepped before this panel opened' : 'steps after 45 frames over 26 ms')) + ' · now ' + S.slow + '/' + filled + ' over 26 ms');
  const fl = c.fieldListens;
  T('br', !fl ? 'n/a' : !fl.on ? 'off (' + (fl.reason || 'off') + ')' : (fl.live ? 'live · gain ' + f(fl.gain, 3) + ' · ' + fl.twinkles + ' twinkles' : 'resting (needs sound)') + (fl.n >= 120 ? ' · self-check p95 ' + f(fl.p95, 2) + ' ms' : fl.n ? ' · self-check ' + fl.n + '/120' : ''));
  const b = bands();
  T('sn', b ? 'low ' + f(b[0], 2) + ' mid ' + f(b[1], 2) + ' high ' + f(b[2], 2) : 'off (sound is off)');
  for (let i = 0; i < 3; i++) Q.bars[i].style.transform = 'scaleX(' + (b ? Math.min(1, b[i] * 1.6).toFixed(3) : 0) + ')';
  let rn = 0, rb = 0, ab = 0; for (const r of RES) { ab += r[1]; if (r[0] >= stopT) { rn++; rb += r[1]; } }
  T('nt', 'since ' + (stopT ? stopId : 'page load') + ': ' + rn + ' · ' + n0(rb / 1024) + ' KB · page ' + RES.length + (full ? '+' : '') + ' · ' + n0(ab / 1024) + ' KB over the wire');
  T('lt', lt < 0 ? 'n/a in this browser' : lt + ' over 50 ms since this panel opened');
  T('sw', sw);
  const r = x.rooms[c.index]; let a = null; try { a = c.angle.get(); } catch (e) {}
  T('st', (r ? r.id : 'n/a') + (a && a.n > 1 ? ' · angle ' + (a.k + 1) + '/' + a.n + ' ' + (a.name || a.id) : ''));
  const ta = c.tour && c.tour.active;
  T('tr', ta && ta.id ? ta.id + ' · stop ' + (ta.k + 1) + '/' + ta.n + ' · ' + (ta.playing ? 'playing' : 'paused') : 'none');
  T('yo', 'dpr ' + f(devicePixelRatio, 2) + ' · ' + innerWidth + '×' + innerHeight + ' · reduced motion ' + onoff(RM) + ' · forced colours ' + onoff(FC));
  spark();
  const s = 'frame p95 ' + Math.round(S.p95) + ' ms, governor tier ' + gt + ', stop ' + (r ? r.id : 'n/a');
  if (t0 - liveT >= 1000 && s !== lastLive && filled >= 30) { lastLive = s; liveT = t0; Q.sr.textContent = s; S.lives++; }
  S.cost += now() - t0;
  if (++S.cN >= (RM.matches ? 2 : 8) && S.frames) { S.costMs = S.cost / S.frames; S.cost = S.frames = S.cN = 0; }
  T('pc', f(S.costMs, 3) + ' ms a frame (its own scripts)');
}
/* the last 120 frame intervals, oldest left; the line is 16.7 ms */
function spark() {
  const d = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
  if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
  S.spark++;
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
  const top = Math.max(34, (S.p95 || 0) * 1.25), bw = w / N, y = (v) => h - Math.min(1, v / top) * (h - 2);
  g.fillStyle = FC.matches ? '#fff' : '#86cbfe';
  for (let i = 0; i < filled; i++) { const v = IV[(k - filled + i + N) % N], yy = y(v); g.globalAlpha = v > 26 ? 1 : 0.55; g.fillRect(i * bw, yy, Math.max(1, bw - 0.6), h - yy); }
  g.globalAlpha = 1; g.fillStyle = FC.matches ? '#fff' : '#a49bbd'; g.fillRect(0, Math.round(y(16.7)), w, 1);
}
