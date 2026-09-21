/* sonic manifold — exhibit shell.
   One persistent particle field (one dot per play) that every room re-targets, a small audio
   engine for the soundtrack with an analyser, and the room lifecycle. No libraries.

   ROOM CONTRACT (exhibit/rooms/<id>.js):
     export default {
       id: 'wall',                 // matches <section data-room="wall">
       track: 'autotropic',        // basename of audio/bed/<track>.mp3, or null to keep the current one
       async mount(root, ctx) {},  // once, first time the room comes near; build DOM inside `root`
       enter(ctx) {},              // every time the room becomes the active one
       leave(ctx) {},              // when another room becomes active
       frame(g, t, bands, w, h, ctx) {} // optional: draw on the overlay canvas while active (g = 2d context, CSS px)
     }
   ctx = { reduced, coarse, particles, audio, data(name), go(i), stage() }
*/

import { postCSS } from './post.js?v=2';
/* every module and data url carries the shell's own ?v= so a service-worker cache can never mix versions */
const V = new URL(import.meta.url).search || '';
const $ = (s, r = document) => r.querySelector(s);
{ const st = document.createElement('style'); st.textContent = postCSS; document.head.appendChild(st); }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = matchMedia('(pointer: coarse)').matches;
export const PAL = { bg: 0x0a0118, white: 0xd8d2ea, tap: 0x21f6bc, shuffle: 0xf5a623, served: 0x6b5a86, mint2: 0x7df0c8, orchid: 0xbda6ff, ice: 0x86cbfe, rose: 0xff6e9c, amber: 0xf5a623, fog: 0x57507a };
export const PROV = [PAL.tap, PAL.shuffle, PAL.served];
export function hash(i) { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; }

/* ------------------------------------------------------------------ particles */
const TOTAL_PLAYS = 97427;
const lowPower = coarse || (navigator.hardwareConcurrency || 4) <= 4 || Math.min(innerWidth, innerHeight) < 700;
const N = lowPower ? Math.round(TOTAL_PLAYS / 4) : TOTAL_PLAYS; /* phones draw one dot per four plays; the caption says so */

const field = $('#field');
const over = $('#overlay');
const fg = field.getContext('2d', { alpha: false });
const glow = $('#glow'), gg = glow && !lowPower && !reduced ? glow.getContext('2d') : null; if (glow && !gg) glow.remove();
/* pointer: dots part around it, a press leaves a ripple */
const PT = { x: -999, y: -999, on: false, ripples: [] };
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || PT.down) { PT.x = e.clientX; PT.y = e.clientY; PT.on = true; PT.last = performance.now(); } }, { passive: true });
addEventListener('pointerdown', (e) => { PT.down = true; PT.x = e.clientX; PT.y = e.clientY; PT.on = true; PT.last = performance.now(); if (!reduced && PT.ripples.length < 6) PT.ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); }, { passive: true });
const ptOff = (e) => { PT.down = false; if (!e || e.pointerType !== 'mouse') PT.on = false; };
addEventListener('pointerup', ptOff, { passive: true }); addEventListener('pointercancel', ptOff, { passive: true }); document.addEventListener('mouseleave', () => { PT.on = false; });
const og = over.getContext('2d');
let W = 0, H = 0, PW = 0, PH = 0, DPR = 1, img = null, buf32 = null;
const BG = 0xff18010a; /* #0a0118 as little-endian ABGR */

const P = {
  n: N, perDot: TOTAL_PLAYS / N,
  x: new Float32Array(N), y: new Float32Array(N),
  tx: new Float32Array(N), ty: new Float32Array(N),
  c: new Uint32Array(N), tc: new Uint32Array(N),
  seed: new Float32Array(N),
  prov: new Uint8Array(N),   /* 0 tapped · 1 shuffled · 2 served: assigned once, kept for the whole visit */
  artist: new Uint16Array(N), /* index into mapmorph.artists: where this play lives in rooms 3 and 4 */
  ease: 0.07, jitter: 0.6, big: false,
  swirl: 0.4,  /* how much a dot arcs on its way to a new target (0 = straight). reset on every room change */
  touch: true, /* dots part around the pointer */
  /* fn(i, n) -> [x, y] in stage-normalised 0..1 (or null to park the dot off-screen) */
  target(fn) {
    const s = stage();
    for (let i = 0; i < N; i++) {
      const p = fn(i, N);
      if (!p) { this.tx[i] = -50; this.ty[i] = -50; continue; }
      this.tx[i] = s.x + p[0] * s.w; this.ty[i] = s.y + p[1] * s.h;
    }
    if (reduced) { this.x.set(this.tx); this.y.set(this.ty); }
  },
  /* fn(i, n) -> [x, y] in CSS px (for pixel-exact grids) */
  targetPx(fn) {
    for (let i = 0; i < N; i++) { const p = fn(i, N); if (!p) { this.tx[i] = -50; this.ty[i] = -50; } else { this.tx[i] = p[0]; this.ty[i] = p[1]; } }
    if (reduced) { this.x.set(this.tx); this.y.set(this.ty); }
  },
  get dpr() { return DPR; },
  /* fn(i, n) -> 0xRRGGBB */
  color(fn) {
    for (let i = 0; i < N; i++) {
      const v = fn(i, N) >>> 0;
      this.tc[i] = 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff);
    }
    if (reduced) this.c.set(this.tc);
  },
  scatter() { this.target(() => [Math.random(), Math.random()]); },
};
for (let i = 0; i < N; i++) { P.seed[i] = Math.random() * 6.283; P.x[i] = Math.random() * innerWidth; P.y[i] = Math.random() * innerHeight; P.c[i] = P.tc[i] = 0xff8c8ca0; }

/* the part of the viewport rooms may draw into: leaves room for wall text at the bottom on phones */
export function stage() {
  const top = Math.max(64, H * 0.1);
  if (W > H * 1.15) { /* landscape: wall text lives bottom-left, the stage takes the right-hand side */
    const x = Math.max(W * 0.4, 430), w = W - x - Math.max(64, W * 0.06);
    return { x, y: top, w, h: H - top - Math.max(56, H * 0.09) };
  }
  const padX = Math.max(16, W * 0.05); /* portrait: stage on top, text underneath. the stage ends where the active room's text begins */
  let h = H * 0.46; const sec = sections[Math.max(0, active)], wl = sec && sec.querySelector('.wall');
  if (wl && wl.offsetTop > 0) h = Math.max(H * 0.26, Math.min(h, wl.offsetTop - top - 16));
  return { x: padX, y: top, w: W - padX * 2, h };
}

function resize() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5);
  PW = Math.round(W * DPR); PH = Math.round(H * DPR);
  field.width = PW; field.height = PH; over.width = Math.round(W * (devicePixelRatio || 1)); over.height = Math.round(H * (devicePixelRatio || 1));
  og.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
  img = fg.createImageData(PW, PH); buf32 = new Uint32Array(img.data.buffer);
  if (gg) { glow.width = Math.max(2, PW >> 2); glow.height = Math.max(2, PH >> 2); }
  if (active >= 0 && rooms[active] && rooms[active].mod && rooms[active].mod.enter) rooms[active].mod.enter(ctx);
}

function blend(a, b, k) { /* per-channel lerp of two ABGR ints */
  const ar = a & 255, ag = (a >> 8) & 255, ab = (a >> 16) & 255, br = b & 255, bg = (b >> 8) & 255, bb = (b >> 16) & 255;
  return 0xff000000 | ((ab + (bb - ab) * k) << 16) | ((ag + (bg - ag) * k) << 8) | (ar + (br - ar) * k);
}

function drawField(t, bands) {
  buf32.fill(BG);
  const X = P.x, Y = P.y, TX = P.tx, TY = P.ty, C = P.c, TC = P.tc, SD = P.seed, buf = buf32, pw = PW, ph = PH, dpr = DPR;
  const e = P.ease, j = reduced ? 0 : P.jitter * (0.5 + bands.low * 2.2), two = DPR > 1 || P.big;
  /* a moving pointer parts the dots; a resting one lets them close again (a held press keeps them open) */
  const idle = PT.down ? 0 : performance.now() - (PT.last || 0), pk = idle < 500 ? 9 : idle > 1700 ? 0 : 9 * (1 - (idle - 500) / 1200);
  const sw = reduced ? 0 : P.swirl, push = PT.on && P.touch && !reduced && pk > 0, mx = PT.x, my = PT.y, R = PT.down ? 130 : 84, R2 = R * R;
  const spark = !reduced && bands.high > 0.16, tick = (((t * 0.06) | 0) * 7919) | 0, ta = t * 0.0011, tb = t * 0.0013;
  for (let i = 0; i < N; i++) {
    const s = SD[i]; let x = X[i], y = Y[i];
    const dx = TX[i] - x, dy = TY[i] - y;
    /* every dot has its own pace and arcs in from one side, so a room change flows instead of sliding */
    const ei = reduced ? e : e * (0.5 + s * 0.16), si = s > 3.1416 ? sw : -sw;
    x += (dx - dy * si) * ei; y += (dy + dx * si) * ei;
    if (push) { const qx = x - mx, qy = y - my, d2 = qx * qx + qy * qy; if (d2 < R2 && d2 > 0.5) { const f = (1 - d2 / R2) * pk / Math.sqrt(d2); x += (qx - qy * 0.5) * f; y += (qy + qx * 0.5) * f; } }
    X[i] = x; Y[i] = y;
    let c = C[i];
    if (c !== TC[i]) c = C[i] = (dx < 0.5 && dx > -0.5 && dy < 0.5 && dy > -0.5) ? TC[i] : blend(c, TC[i], 0.12);
    const px = ((x + Math.sin(ta + s) * j) * dpr) | 0, py = ((y + Math.cos(tb + s * 1.7) * j) * dpr) | 0;
    if (px < 0 || py < 0 || px >= pw - 1 || py >= ph - 1) continue;
    const o = py * pw + px; if (spark && ((i + tick) & 255) === 0) c = 0xffffffff; /* hi-hats make a few dots glint */
    buf[o] = c;
    if (two) { buf[o + 1] = c; buf[o + pw] = c; buf[o + pw + 1] = c; }
  }
  fg.putImageData(img, 0, 0);
  if (gg) { gg.globalCompositeOperation = 'copy'; gg.filter = 'blur(2px)'; gg.drawImage(field, 0, 0, glow.width, glow.height); gg.filter = 'none'; gg.globalCompositeOperation = 'difference'; gg.fillStyle = '#0a0118'; gg.fillRect(0, 0, glow.width, glow.height); /* take the background back out, so only the dots bloom */ }
}

/* ------------------------------------------------------------------ audio */
const A = {
  ac: null, gain: null, an: null, els: [], srcs: [], g: [], cur: -1, want: null, on: false, muted: false, ducked: false, fft: null,
  unlock() {
    if (this.ac) { this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC(); this.gain = this.ac.createGain(); this.an = this.ac.createAnalyser();
    this.an.fftSize = 512; this.an.smoothingTimeConstant = 0.82; this.fft = new Uint8Array(this.an.frequencyBinCount);
    this.lp = this.ac.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.4;
    this.gain.connect(this.lp); this.lp.connect(this.an); this.an.connect(this.ac.destination);
    for (let k = 0; k < 2; k++) {
      const el = new Audio(); el.preload = 'auto'; el.loop = true; el.crossOrigin = 'anonymous';
      const src = this.ac.createMediaElementSource(el), g = this.ac.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(this.gain); this.els.push(el); this.srcs.push(src); this.g.push(g);
    }
    this.on = true; this.level(); if (this.wantDistant) this.distant(this.wantDistant); if (this.want) this.play(this.want);
  },
  level() { if (!this.gain) return; const v = this.muted ? 0 : this.ducked ? 0.0001 : 0.85; this.gain.gain.setTargetAtTime(v, this.ac.currentTime, 0.25); },
  play(track) {
    this.want = track; if (!this.on || !track) return;
    const url = 'audio/bed/' + track + '.mp3';
    if (this.cur >= 0 && this.els[this.cur].dataset.t === track) return;
    const nx = this.cur === 0 ? 1 : 0, el = this.els[nx], t = this.ac.currentTime;
    el.dataset.t = track; el.src = url; el.currentTime = 0;
    el.play().catch(() => {});
    this.g[nx].gain.cancelScheduledValues(t); this.g[nx].gain.setTargetAtTime(1, t, 0.9);
    if (this.cur >= 0) { const old = this.cur; this.g[old].gain.cancelScheduledValues(t); this.g[old].gain.setTargetAtTime(0, t, 0.9); setTimeout(() => { if (this.cur !== old) this.els[old].pause(); }, 4200); }
    this.cur = nx;
  },
  mute(m) { this.muted = m; this.level(); },
  /* interface tones: D minor pentatonic, quiet, skipped when muted. step 0 = D4 */
  note(step, o = {}) {
    if (!this.ac || this.muted || !this.on) return;
    const SC = [0, 3, 5, 7, 10], oct = Math.floor(step / 5), semi = SC[((step % 5) + 5) % 5] + 12 * oct;
    const t = this.ac.currentTime + (o.at || 0), osc = this.ac.createOscillator(), g = this.ac.createGain(), dur = o.dur || 0.5;
    osc.type = o.type || 'sine'; osc.frequency.value = 293.66 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol || 0.07, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.an); osc.start(t); osc.stop(t + dur + 0.05);
  },
  duck(d) { this.ducked = d; this.level(); },
  /* 0 = open, 1 = distant (the graveyard plays its track from the next room over) */
  distant(k) { if (!this.lp) { this.wantDistant = k; return; } this.lp.frequency.setTargetAtTime(k > 0 ? 20000 * Math.pow(0.03, k) : 20000, this.ac.currentTime, 0.5); },
  bands() {
    if (!this.an || this.muted || reduced) return ZERO;
    this.an.getByteFrequencyData(this.fft); const f = this.fft; let lo = 0, mi = 0, hi = 0;
    for (let i = 1; i < 8; i++) lo += f[i]; for (let i = 8; i < 48; i++) mi += f[i]; for (let i = 48; i < 160; i++) hi += f[i];
    B.low += ((lo / (7 * 255)) - B.low) * 0.35; B.mid += ((mi / (40 * 255)) - B.mid) * 0.35; B.high += ((hi / (112 * 255)) - B.high) * 0.35; return B;
  },
};
const ZERO = { low: 0, mid: 0, high: 0 }, B = { low: 0, mid: 0, high: 0 };

/* ------------------------------------------------------------------ rooms */
const sections = [...document.querySelectorAll('section[data-room]')];
const rooms = sections.map((el) => ({ el, id: el.dataset.room, mod: null, loading: null, mounted: false }));
let active = -1;
const cache = {};
let identityP = null;
const ctx = {
  reduced, coarse, particles: P, audio: A, stage, PAL, PROV, hash, V,
  /* resolves once every dot knows who pressed play on it and which artist it belongs to */
  identity() {
    if (!identityP) identityP = Promise.all([this.data('wall').catch(() => null), this.data('mapmorph').catch(() => null)]).then(([w, m]) => {
      if (w && w.tap) { const edges = []; let acc = 0; for (let k = 0; k < w.tap.length; k++) { const t = w.tap[k], sh = w.shuffle[k], v = w.served[k], tot = t + sh + v; edges.push([acc + tot, t / (tot || 1), (t + sh) / (tot || 1)]); acc += tot; } let k = 0; for (let i = 0; i < N; i++) { const play = (i + 0.5) * (acc / N); while (k < edges.length - 1 && play >= edges[k][0]) k++; const u = hash(i); P.prov[i] = u < edges[k][1] ? 0 : u < edges[k][2] ? 1 : 2; } }
      else for (let i = 0; i < N; i++) { const u = hash(i); P.prov[i] = u < 0.19 ? 0 : u < 0.36 ? 1 : 2; }
      const na = m && m.artists ? m.artists.length : 300; for (let i = 0; i < N; i++) P.artist[i] = Math.floor(hash(i * 7 + 3) * na);
      return { wall: w, map: m };
    });
    return identityP;
  },
  data(name) { return cache[name] || (cache[name] = fetch('exhibit/data/' + name + '.json' + V).then((r) => { if (!r.ok) throw new Error(name); return r.json(); })); },
  /* centre a room's single affordance on the stage */
  placeCue(el, fy = 0.5) { const st = stage(); el.style.left = (st.x + st.w / 2) + 'px'; el.style.top = (st.y + st.h * fy) + 'px'; },
  go(i) { const r = rooms[clamp(i, 0, rooms.length - 1)]; r.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); },
  get index() { return active; },
};

async function load(i) {
  const r = rooms[i]; if (!r || r.mounted) return r;
  if (!r.loading) r.loading = import('./rooms/' + r.id + '.js' + V).then(async (m) => { r.mod = m.default; const root = $('.room-body', r.el) || r.el; try { await r.mod.mount(root, ctx); } catch (e) { console.warn('room', r.id, e); } r.mounted = true; return r; }).catch((e) => { console.warn('room failed', r.id, e); r.mounted = true; return r; });
  return r.loading;
}

async function activate(i) {
  if (i === active) return;
  const prev = rooms[active]; active = i;
  if (prev && prev.mod && prev.mod.leave) try { prev.mod.leave(ctx); } catch (e) {}
  sections.forEach((s, k) => s.classList.toggle('is-active', k === i));
  dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  og.clearRect(0, 0, W, H);
  const r = await load(i); if (active !== i) return;
  P.swirl = 0.4; P.touch = true;
  if (r.mod) { if (r.mod.track) A.play(r.mod.track); if (r.mod.enter) try { r.mod.enter(ctx); } catch (e) { console.warn(e); } }
  load(i + 1);
  try { history.replaceState(null, '', '#' + r.id); } catch (e) {}
}

/* nav dots */
const nav = $('#dots'); const dots = rooms.map((r, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dot'; b.setAttribute('aria-label', 'room ' + (i + 1) + ': ' + (r.el.dataset.title || r.id)); b.dataset.t = r.el.dataset.title || r.id; b.addEventListener('click', () => ctx.go(i)); nav.appendChild(b); return b; });

const io = new IntersectionObserver((es) => { let best = null; es.forEach((e) => { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; }); if (best && best.intersectionRatio > 0.55) activate(sections.indexOf(best.target)); }, { threshold: [0.55, 0.8] });
sections.forEach((s) => io.observe(s));

addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button,a,[role=button]'))) { e.preventDefault(); ctx.go(active + 1); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); ctx.go(active - 1); }
  else if (e.key === 'm') { $('#mute').click(); }
});

/* threshold */
const enter = $('#enter'), enterQuiet = $('#enter-quiet'), muteBtn = $('#mute');
function begin(sound) { document.body.classList.add('entered'); if (sound) { A.unlock(); } else { A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; } ctx.go(1); }
enter.addEventListener('click', () => begin(true));
enterQuiet.addEventListener('click', () => begin(false));
muteBtn.addEventListener('click', () => { const m = !A.muted; if (!m) A.unlock(); A.mute(m); muteBtn.setAttribute('aria-pressed', String(m)); muteBtn.textContent = m ? 'sound off' : 'sound on'; });
document.addEventListener('visibilitychange', () => { if (A.ac) { if (document.hidden) A.ac.suspend(); else if (!A.muted) A.ac.resume(); } });

/* loop */
let last = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (document.hidden) return; if (reduced && t - last < 250) return; last = t;
  const bands = A.bands(); drawField(t, bands);
  og.clearRect(0, 0, W, H);
  const r = rooms[active]; if (r && r.mod && r.mod.frame) { try { r.mod.frame(og, t, bands, W, H, ctx); } catch (e) {} }
  for (let k = PT.ripples.length - 1; k >= 0; k--) { const rp = PT.ripples[k], a = (t - rp.t) / 900; if (a >= 1 || a < 0) { PT.ripples.splice(k, 1); continue; } og.strokeStyle = 'rgba(125,240,200,' + (0.5 * (1 - a) * (1 - a)) + ')'; og.lineWidth = 1.2; og.beginPath(); og.arc(rp.x, rp.y, 8 + a * 120, 0, 6.283); og.stroke(); }
}
addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
resize(); P.scatter();
const start = Math.max(0, rooms.findIndex((r) => '#' + r.id === location.hash));
if (start > 0) { document.body.classList.add('entered'); A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; rooms[start].el.scrollIntoView(); }
activate(start);
requestAnimationFrame(loop);
window.__exhibit = { ctx, rooms, P, A };
