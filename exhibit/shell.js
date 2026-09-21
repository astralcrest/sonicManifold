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

import { postCSS, post, stopAll } from './post.js?v=4';
import { LABELS, HINTS } from './labels.js?v=4';
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
/* bloom: every device starts with it; the governor in loop() takes it away from any that cannot hold the frame rate */
const glow = $('#glow'); let gg = glow && !reduced ? glow.getContext('2d') : null; if (glow && !gg) glow.remove();
const GDIV = lowPower ? 6 : 4, canvasBlur = !!gg && 'filter' in gg; /* safari has no canvas filter: blur the element instead */
if (gg && !canvasBlur) { if (lowPower) { gg = null; glow.remove(); } else glow.style.filter = 'blur(7px)'; } /* css blur on a live canvas is a slow path on older webkit: phones without canvas filter get no bloom at all */
/* pointer: dots part around it, a press leaves a ripple */
const PT = { x: -999, y: -999, on: false, ripples: [] };
addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || PT.down) { PT.x = e.clientX; PT.y = e.clientY; PT.on = true; PT.last = performance.now(); } }, { passive: true });
addEventListener('pointerdown', (e) => { PT.down = true; PT.x = e.clientX; PT.y = e.clientY; PT.on = true; PT.last = performance.now(); if (!reduced && PT.ripples.length < 6) PT.ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); }, { passive: true });
const ptOff = (e) => { PT.down = false; if (!e || e.pointerType !== 'mouse') PT.on = false; };
addEventListener('pointerup', ptOff, { passive: true }); addEventListener('pointercancel', ptOff, { passive: true }); document.addEventListener('mouseleave', () => { PT.on = false; });
const og = over.getContext('2d');
let W = 0, H = 0, PW = 0, PH = 0, DPR = 1, ODPR = 1, img = null, buf32 = null;
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
  ODPR = devicePixelRatio || 1; og.setTransform(ODPR, 0, 0, ODPR, 0, 0);
  img = fg.createImageData(PW, PH); buf32 = new Uint32Array(img.data.buffer);
  if (gg) { glow.width = Math.max(2, (PW / GDIV) | 0); glow.height = Math.max(2, (PH / GDIV) | 0); }
  if (active >= 0 && rooms[active] && rooms[active].mod && rooms[active].mod.enter) rooms[active].mod.enter(ctx);
  sigPlace();
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
  if (gg) { glow.style.opacity = (0.72 + Math.min(0.28, bands.mid * 0.9)).toFixed(3); gg.globalCompositeOperation = 'copy'; if (canvasBlur) gg.filter = 'blur(2px)'; gg.drawImage(field, 0, 0, glow.width, glow.height); if (canvasBlur) gg.filter = 'none'; gg.globalCompositeOperation = 'difference'; gg.fillStyle = '#0a0118'; gg.fillRect(0, 0, glow.width, glow.height); /* take the background back out, so only the dots bloom */ }
}

/* ------------------------------------------------------------------ audio */
const A = {
  ac: null, gain: null, an: null, els: [], srcs: [], g: [], cur: -1, want: null, on: false, muted: false, ducked: false, fft: null,
  unlock() {
    if (this.ac) { this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ac = new AC(); try { this.ac.resume(); } catch (e) {} this.gain = this.ac.createGain(); this.an = this.ac.createAnalyser();
    this.an.fftSize = 512; this.an.smoothingTimeConstant = 0.82; this.fft = new Uint8Array(this.an.frequencyBinCount);
    this.lp = this.ac.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.4;
    /* everything leaves through one limiter. interface tones have their own bus, which ducks under a listening post too */
    this.lim = this.ac.createDynamicsCompressor(); this.lim.threshold.value = -6; this.lim.knee.value = 4; this.lim.ratio.value = 12; this.lim.attack.value = 0.003; this.lim.release.value = 0.2;
    this.sfx = this.ac.createGain(); this.sfx.gain.value = 1;
    this.gain.connect(this.lp); this.lp.connect(this.an); this.sfx.connect(this.an); this.an.connect(this.lim); this.lim.connect(this.ac.destination);
    this.ac.addEventListener('statechange', () => { if (this.ac.state === 'running') this.rearm(); });
    for (let k = 0; k < 2; k++) {
      const el = new Audio(); el.preload = 'auto'; el.loop = true;
      const src = this.ac.createMediaElementSource(el), g = this.ac.createGain(); g.gain.value = 0;
      src.connect(g); g.connect(this.gain); this.els.push(el); this.srcs.push(src); this.g.push(g);
    }
    /* ios only lets an <audio> element start outside a tap if it has already been started inside one. rooms change on scroll, so
       the second deck is started (silent: its gain is 0) and paused right here, inside the visitor's first tap */
    try { const spare = this.els[1]; spare.src = 'audio/bed/' + (this.want || 'hitting-the-infinite-derivative') + '.mp3'; const pr = spare.play(); if (pr && pr.then) pr.then(() => { if (this.cur !== 1) spare.pause(); }).catch(() => {}); } catch (e) {}
    this.on = true; this.level(); if (this.wantDistant) this.distant(this.wantDistant); if (this.want) this.play(this.want);
  },
  level() { if (!this.gain) return; const v = this.muted ? 0 : this.ducked ? 0.0001 : 0.85; this.gain.gain.setTargetAtTime(v, this.ac.currentTime, 0.25); this.sfx.gain.setTargetAtTime(this.muted ? 0 : this.ducked ? 0.2 : 1, this.ac.currentTime, 0.1); },
  /* a phone pauses <audio> when the tab goes to the background and does not start it again by itself */
  rearm() { if (this.cur >= 0 && !this.muted && this.els[this.cur].paused) this.els[this.cur].play().catch(() => {}); },
  play(track, xf = 0.9) {
    this.want = track; if (!this.on || !track) return;
    const url = 'audio/bed/' + track + '.mp3';
    if (this.cur >= 0 && this.els[this.cur].dataset.t === track) return;
    const nx = this.cur === 0 ? 1 : 0, el = this.els[nx], t = this.ac.currentTime;
    el.dataset.t = track; el.src = url; el.currentTime = 0;
    el.play().catch(() => { const again = () => { removeEventListener('pointerdown', again); if (this.els[this.cur] === el) el.play().catch(() => {}); }; addEventListener('pointerdown', again, { once: true }); });
    this.g[nx].gain.cancelScheduledValues(t); this.g[nx].gain.setTargetAtTime(1, t, xf);
    if (this.cur >= 0) { const old = this.cur; this.g[old].gain.cancelScheduledValues(t); this.g[old].gain.setTargetAtTime(0, t, xf); setTimeout(() => { if (this.cur !== old) this.els[old].pause(); }, 1500 + xf * 3000); }
    this.cur = nx;
  },
  mute(m) { this.muted = m; this.level(); },
  /* interface tones: D minor pentatonic, quiet, skipped when muted. step 0 = D4 */
  note(step, o = {}) {
    if (!this.ac || this.muted || !this.on) return;
    const SC = [0, 3, 5, 7, 10], oct = Math.floor(step / 5), semi = SC[((step % 5) + 5) % 5] + 12 * oct;
    const t = this.ac.currentTime + (o.at || 0), osc = this.ac.createOscillator(), g = this.ac.createGain(), dur = o.dur || 0.5;
    osc.type = o.type || 'sine'; osc.frequency.value = 293.66 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol || 0.05, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.sfx); osc.start(t); osc.stop(t + dur + 0.05);
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
let goK = -1, goT = 0;
/* camelot distance between two of my tracks decides how long the rooms dissolve into each other */
let KEYS = null;
function xfade(from, to) {
  if (!KEYS || !from || !to || !KEYS[from] || !KEYS[to]) return 0.9;
  const a = KEYS[from], b = KEYS[to], na = parseInt(a, 10), nb = parseInt(b, 10), same = a.slice(-1) === b.slice(-1), d = Math.min((na - nb + 12) % 12, (nb - na + 12) % 12);
  return a === b ? 0.6 : (d === 0 || (same && d === 1)) ? 0.9 : 1.8;
}
const ctx = {
  reduced, coarse, particles: P, audio: A, stage, PAL, PROV, hash, V,
  post: (host, artist, opts) => post(host, artist, ctx, opts), stopPosts: () => stopAll(ctx),
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
  go(i) { const k = clamp(i, 0, rooms.length - 1), now = performance.now(); if (k === goK && now - goT < 700) return; goK = k; goT = now; const r = rooms[k]; r.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); },
  /* kiosk only: true the moment a real hand arrives. a room whose demo runs on timers polls this and stops */
  demoStopped: true,
  get index() { return active; },
};

async function load(i) {
  const r = rooms[i]; if (!r || r.mounted) return r;
  if (!r.loading) r.loading = import('./rooms/' + r.id + '.js' + V).then(async (m) => { r.mod = m.default; const root = $('.room-body', r.el) || r.el; try { await r.mod.mount(root, ctx); } catch (e) { console.warn('room', r.id, e); } r.mounted = true; return r; }).catch((e) => { console.warn('room failed', r.id, e); r.mounted = true; return r; });
  return r.loading;
}

async function activate(i) {
  if (i === active) return;
  ctx.demoStopped = true; /* whatever was demonstrating itself is not the active room any more */
  const prev = rooms[active]; active = i;
  if (prev && prev.mod && prev.mod.leave) try { prev.mod.leave(ctx); } catch (e) {}
  sections.forEach((s, k) => s.classList.toggle('is-active', k === i));
  dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  og.clearRect(0, 0, W, H);
  const r = await load(i); if (active !== i) return;
  P.swirl = 0.4; P.touch = true;
  if (r.mod) { if (r.mod.track) A.play(r.mod.track, xfade(prev && prev.mod && prev.mod.track, r.mod.track)); if (r.mod.enter) try { r.mod.enter(ctx); } catch (e) { console.warn(e); } }
  load(i + 1); sigPlace();
  if (labelDlg && labelDlg.open) renderLabel(); armHint(); kioskStep();
  try { history.replaceState(null, '', '#' + r.id); } catch (e) {}
}

ctx.data('tracks').then((d) => { KEYS = {}; (d.tracks || []).forEach((t) => { KEYS[t.f] = t.k; }); }).catch(() => {});

/* nav dots */
const nav = $('#dots'); const dots = rooms.map((r, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dot'; b.setAttribute('aria-label', 'room ' + (i + 1) + ': ' + (r.el.dataset.title || r.id)); b.dataset.t = r.el.dataset.title || r.id; b.addEventListener('click', () => ctx.go(i)); nav.appendChild(b); return b; });

const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) activate(sections.indexOf(e.target)); }); }, { rootMargin: '-49% 0px -49% 0px', threshold: 0 });
sections.forEach((s) => io.observe(s));

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return; /* cmd+l, cmd+m, cmd+arrowdown belong to the browser */
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (labelDlg && labelDlg.open && e.key !== 'l') return; /* the label is a modal: arrows and space belong to it while it is open */
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button,a,[role=button]'))) { e.preventDefault(); ctx.go(active + 1); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); ctx.go(active - 1); }
  else if (e.key === 'm') { $('#mute').click(); }
  else if (e.key === 'l') { toggleLabel(); }
  else if (e.key === 'Home') { e.preventDefault(); ctx.go(0); }
  else if (e.key === 'End') { e.preventDefault(); ctx.go(rooms.length - 1); }
});

/* threshold */
const enter = $('#enter'), enterQuiet = $('#enter-quiet'), muteBtn = $('#mute');
function begin(sound) { document.body.classList.add('entered'); if (sound) { A.unlock(); } else { A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; } ctx.go(1); }
enter.addEventListener('click', () => begin(true));
enterQuiet.addEventListener('click', () => begin(false));
muteBtn.addEventListener('click', () => { const m = !A.muted; if (!m) A.unlock(); A.mute(m); muteBtn.setAttribute('aria-pressed', String(m)); muteBtn.textContent = m ? 'sound off' : 'sound on'; });
document.addEventListener('visibilitychange', () => { if (A.ac) { if (document.hidden) A.ac.suspend(); else if (!A.muted) { A.ac.resume(); A.rearm(); } } });

/* exit: hand the link on. the native share sheet where there is one, the clipboard otherwise */
const shareBtn = $('#share');
if (shareBtn) shareBtn.addEventListener('click', async () => {
  const url = location.origin + location.pathname, say = (m) => { const was = 'send this to someone'; shareBtn.textContent = m; setTimeout(() => { shareBtn.textContent = was; }, 2200); };
  try { if (navigator.share) { await navigator.share({ title: document.title, url }); return; } await navigator.clipboard.writeText(url); say('link copied'); } catch (e) { if (e && e.name !== 'AbortError') say(url.replace(/^https?:\/\//, '')); }
});

/* ------------------------------------------------------------------ wall labels */
const labelBtn = $('#labelbtn'), labelDlg = $('#label');
function renderLabel() {
  const L = LABELS[rooms[Math.max(0, active)].id]; if (!L || !labelDlg) return;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const box = $('.lb-body', labelDlg); box.textContent = '';
  box.appendChild(el('p', 'lb-k', L.kicker)); box.appendChild(el('h3', 'lb-t', L.title)); if (L.by) box.appendChild(el('p', 'lb-by', L.by));
  const dl = el('dl', 'lb-rows'); L.rows.forEach(([k, v]) => { dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', '', v)); }); box.appendChild(dl);
  if (L.more) { const a = el('a', 'lb-more', L.more[1] + ' →'); a.href = L.more[0]; box.appendChild(a); }
}
function toggleLabel() { if (!labelDlg || !labelDlg.showModal) return; if (labelDlg.open) labelDlg.close(); else { renderLabel(); labelDlg.showModal(); } }
if (labelBtn && labelDlg) {
  if (!labelDlg.showModal) labelBtn.remove();
  labelBtn.addEventListener('click', toggleLabel);
  $('.lb-x', labelDlg).addEventListener('click', () => labelDlg.close());
  labelDlg.addEventListener('click', (e) => { if (e.target === labelDlg) labelDlg.close(); });
  labelDlg.addEventListener('close', () => { try { labelBtn.focus({ preventScroll: true }); } catch (e) {} });
}

/* ------------------------------------------------------------------ idle hints: one line, only after a visitor has done nothing in a room for a while */
const hintEl = $('#hint'); let hintT = 0, acted = new Set();
function armHint() {
  clearTimeout(hintT); if (hintEl) hintEl.classList.remove('on');
  const id = rooms[Math.max(0, active)].id; if (!hintEl || !HINTS[id] || acted.has(id) || KIOSK) return;
  hintT = setTimeout(() => {
    if (rooms[active].id !== id || acted.has(id)) return;
    const s = stage();
    hintEl.textContent = HINTS[id];
    hintEl.style.left = (s.x + s.w / 2) + 'px'; hintEl.style.top = (s.y + 4) + 'px';
    hintEl.classList.add('on'); /* top of the stage: the controls live at the bottom */
    /* a couple of rooms (the graveyard's panel, in particular) fill the top of the stage too —
       nudge below whatever is already on screen there rather than print two lines on top of each other */
    requestAnimationFrame(() => {
      if (!hintEl.classList.contains('on')) return;
      const hr = hintEl.getBoundingClientRect();
      const sec = rooms[active].el; let maxBottom = null;
      const near = [...sec.querySelectorAll('.room-body *, .wall *')];
      if (labelBtn && labelBtn.isConnected) near.push(labelBtn); /* on a phone the placard sits under the title bar, where the hint wants to print */
      near.forEach((el) => {
        if (el === hintEl || el.contains(hintEl) || !el.textContent || !el.textContent.trim()) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        if (r.left < hr.right && r.right > hr.left && r.top < hr.bottom && r.bottom > hr.top) maxBottom = maxBottom == null ? r.bottom : Math.max(maxBottom, r.bottom);
      });
      if (maxBottom != null) {
        const shifted = maxBottom + 10;
        if (shifted + hr.height < s.y + s.h - 8) hintEl.style.top = shifted + 'px'; else hintEl.classList.remove('on');
      }
    });
  }, 9000);
}
const didAct = (e) => { if (active < 0 || !e.target.closest || !e.target.closest('section[data-room]') || e.target.closest('.wall a')) return; acted.add(rooms[active].id); clearTimeout(hintT); if (hintEl) hintEl.classList.remove('on'); };
addEventListener('pointerdown', didAct, { passive: true }); addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ' || /^[tqn]$/i.test(e.key) || /^Arrow(Left|Right)$/.test(e.key)) didAct(e); });

/* ------------------------------------------------------------------ kiosk: exhibit.html?kiosk=1 runs unattended. it walks the rooms, lets each one demonstrate itself, and starts over */
const KIOSK = /[?&]kiosk=1\b/.test(location.search); let kioskT = 0, demoT = 0, lastTouch = 0;
const HANDSOFF = 45000; /* nothing demonstrates itself until the screen has been left alone this long */
/* a demo is a sequence of timers. the moment a real hand arrives, stop the one that is running and do not start another */
function stopDemo() {
  clearTimeout(demoT); demoT = 0; ctx.demoStopped = true;
  const r = rooms[active]; if (r && r.mod && r.mod.stopDemo) { try { r.mod.stopDemo(ctx); } catch (e) {} }
}
function kioskStep() {
  clearTimeout(kioskT); clearTimeout(demoT); if (!KIOSK) return;
  const dwell = active === 0 ? 14000 : rooms[active].id === 'make' ? 44000 : 32000;
  kioskT = setTimeout(() => {
    if (performance.now() - lastTouch < HANDSOFF) return kioskStep(); /* someone is using it: wait */
    goK = -1; ctx.go(active + 1 >= rooms.length ? 0 : active + 1);
  }, dwell);
  const r = rooms[active];
  if (r && r.mod && r.mod.demo && performance.now() - lastTouch > HANDSOFF) demoT = setTimeout(() => {
    demoT = 0;
    if (rooms[active] !== r || performance.now() - lastTouch <= HANDSOFF) return;
    ctx.demoStopped = false; try { r.mod.demo(ctx); } catch (e) {}
  }, 3500);
}
if (KIOSK) {
  document.documentElement.classList.add('kiosk'); lastTouch = -1e9;
  try { history.scrollRestoration = 'manual'; } catch (e) {} scrollTo(0, 0); /* a reload on a gallery screen starts at the threshold, not wherever the last loop was */
  document.body.classList.add('entered'); /* no threshold to click through on a gallery screen. sound needs one touch: browsers do not let a page start audio by itself */
  addEventListener('pointerdown', (e) => { if (e.isTrusted && !A.on) A.unlock(); }, { passive: true });
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, (e) => { if (!e.isTrusted) return; lastTouch = performance.now(); stopDemo(); }, { passive: true }));
}

const againBtn = $('#again'); if (againBtn) againBtn.addEventListener('click', () => { goK = -1; ctx.go(0); });

/* ------------------------------------------------------------------ signature: the title and the byline, quietly, in the corner of the stage,
   so the frames a visitor photographs carry them. drawn on the overlay canvas, which is aria-hidden, so no screen reader has to hear it twice. */
const SIG = 'mostly the machine · astralcrest', SIGFONT = '500 10px "JetBrains Mono", ui-monospace, Menlo, monospace';
let sigOn = false, sigX = 0, sigY = 0, sigW = 0, sigT = -1e9;
function sigPlace() {
  sigOn = false;
  if (active < 0 || !rooms[active] || H < 480) return; /* a phone held sideways has no height to spare */
  const s = stage();
  og.font = SIGFONT; sigW = og.measureText(SIG).width;
  /* never over a room's controls or the wall text: just under the stage first, on the stage's own bottom edge if that band is taken */
  const sec = rooms[active].el, els = [...sec.querySelectorAll('.room-body button,.room-body a,.room-body input,.room-body select,.room-body img,.room-body svg')];
  sec.querySelectorAll('.room-body *,.wall *').forEach((el) => { if (!el.firstElementChild && el.textContent && el.textContent.trim()) els.push(el); });
  const boxes = els.map((el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.06) return null;
    const r = el.getBoundingClientRect(); return r.width && r.height ? r : null;
  }).filter(Boolean);
  const nr = nav && nav.getBoundingClientRect(); /* the room dots own the right margin where they stand */
  for (const y of [s.y + s.h + 11, s.y + s.h - 3]) {
    let edge = s.x + s.w;
    if (nr && nr.width && y > nr.top - 8 && y - 12 < nr.bottom + 8) edge = Math.min(edge, nr.left - 10);
    const x = edge - sigW; if (x < s.x + 8) continue;
    const L = x - 8, R = x + sigW + 8, T = y - 13, Bt = y + 5;
    if (boxes.some((r) => r.left < R && r.right > L && r.top < Bt && r.bottom > T)) continue;
    sigX = x; sigY = y; sigOn = true; return;
  }
}
function drawSig() {
  if (!sigOn) return;
  og.setTransform(ODPR, 0, 0, ODPR, 0, 0);
  og.globalAlpha = 1; og.globalCompositeOperation = 'source-over'; og.shadowBlur = 0; og.shadowColor = 'transparent';
  if ('filter' in og) og.filter = 'none';
  og.textAlign = 'left'; og.textBaseline = 'alphabetic'; og.font = SIGFONT; og.fillStyle = 'rgba(240,234,255,.26)';
  og.fillText(SIG, sigX, sigY);
}

/* loop */
let last = 0, slow = 0, seen = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (document.hidden) { last = t; return; } if (reduced && t - last < 250) return;
  /* governor: after a settling second, 45 frames slower than ~38 fps cost the device its bloom */
  if (gg && last) { const dt = t - last; if (++seen > 60 && dt < 200) { slow = dt > 26 ? slow + 1 : Math.max(0, slow - 0.5); if (slow > 45) { gg = null; glow.remove(); } } }
  last = t;
  const bands = A.bands(); drawField(t, bands);
  og.clearRect(0, 0, W, H);
  const r = rooms[active]; if (r && r.mod && r.mod.frame) { try { r.mod.frame(og, t, bands, W, H, ctx); } catch (e) {} }
  for (let k = PT.ripples.length - 1; k >= 0; k--) { const rp = PT.ripples[k], a = (t - rp.t) / 900; if (a >= 1 || a < 0) { PT.ripples.splice(k, 1); continue; } og.strokeStyle = 'rgba(125,240,200,' + (0.5 * (1 - a) * (1 - a)) + ')'; og.lineWidth = 1.2; og.beginPath(); og.arc(rp.x, rp.y, 8 + a * 120, 0, 6.283); og.stroke(); }
  if (t - sigT > 900) { sigT = t; sigPlace(); } /* rooms build their controls over a second or two: re-check the corner now and then */
  drawSig();
}
/* turning a phone sideways shortens every 100vh section, so the scroll offset the visitor was standing at can land
   inside a later section and the observer hands the exhibit a room they never asked for (webkit does this every time).
   remember the room on the first raw resize event and put them back once the layout has settled. */
let rotFrom = -1, rotT = 0;
addEventListener('resize', () => {
  if (rotFrom < 0) rotFrom = active;
  clearTimeout(resize.t); resize.t = setTimeout(resize, 150);
  clearTimeout(rotT); rotT = setTimeout(() => {
    const want = rotFrom; rotFrom = -1;
    if (want < 0 || want === active || !rooms[want]) return;
    goK = -1; rooms[want].el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, 420);
});
resize(); P.scatter();
const start = Math.max(0, rooms.findIndex((r) => '#' + r.id === location.hash));
if (start > 0) { document.body.classList.add('entered'); A.muted = true; muteBtn.setAttribute('aria-pressed', 'true'); muteBtn.textContent = 'sound off'; rooms[start].el.scrollIntoView(); }
activate(start);
requestAnimationFrame(loop);
window.__exhibit = { ctx, rooms, P, A, sig: () => ({ on: sigOn, x: Math.round(sigX), y: Math.round(sigY), w: Math.round(sigW), text: SIG }) };
