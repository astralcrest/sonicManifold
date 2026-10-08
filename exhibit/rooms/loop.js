/* N4 + LOOP2 · on loop, a loop pedal. loops.json only (counts; no titles, artists or dates). the rings (loop.rings.js): one
   per run length the file ships (2..14, 20, 50 plays in a row), one glyph per streak that reached it. a hold loops one bar
   of the bed and steps out a ring per loop; the count read back follows REFEREE3's snap rule. the file has no arm split, so
   one ink. no single streak is ever derived or shown. the angle id stays 'tower' (tours, search and tests address it). */
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fmt = (n) => Number(n).toLocaleString('en-US');
const tr = (f) => { try { return f(); } catch (e) {} };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const { floor, min, max } = Math, MONO = 'px "JetBrains Mono", ui-monospace, monospace';
const stop = (e) => { e.preventDefault(); e.stopPropagation(); }, on = (e, t, f) => e.addEventListener(t, f);
const INK = 0xd9d4ee, MUTE = 0x57507a, BED = 'choose-me-whole', BPM0 = 123.05;
const ANGLES = [{ id: 'tower', name: 'the rings' }, { id: 'ten', name: 'ten plays or more' }];
const ORDER = [0, 4, 2, 6, 1, 5, 3, 7];
const lp = (k) => k + (k === 1 ? ' loop' : ' loops');
const CSS = `@ .lp-hud{position:absolute;box-sizing:border-box;padding:8px 10px;background:rgba(10,1,24,.78);border:1px solid rgba(134,203,254,.24);border-radius:12px}
@ .lp-line{font:400 12.5px/1.45 var(--mono);color:var(--ink);margin:0 2px 6px;min-height:2.9em}
@ .lp-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
@ .lp-hold{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ice);background:rgba(134,203,254,.08);border:1px solid rgba(134,203,254,.55);border-radius:999px;padding:0 16px;min-height:44px;min-width:44px;cursor:pointer;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
@ .lp-hold[aria-pressed="true"]{background:rgba(134,203,254,.24);color:var(--ink)}
@ .lp-hold:focus-visible{outline:2px solid var(--ice);outline-offset:3px}
@ .lp-hold.lp-cue{animation:lpCue 1.9s ease-in-out infinite}
@keyframes lpCue{50%{box-shadow:0 0 0 8px rgba(134,203,254,.16);border-color:var(--ice)}}
@media (prefers-reduced-motion:reduce){@ .lp-hold.lp-cue{animation:none}}
@ .lp-mine{margin:0;font:400 10.5px/1.4 var(--mono);color:var(--mute)}
@ .lp-kb{display:none;position:absolute;left:10px;bottom:100%;margin:0 0 6px;font:400 10.5px/1.3 var(--mono);color:var(--ice);background:rgba(10,1,24,.86)}
@ .lp-hud.kb .lp-kb{display:block}
@ .lp-hud.cmp .lp-line{font-size:11px;line-height:1.38;margin-bottom:4px}
@ .lp-hud.sd{padding:5px 8px}
@ .lp-hud.sd .lp-line,@ .lp-hud.sd .lp-mine{font-size:10px}
@ .lp-sr{position:absolute;opacity:0;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@ .lp-tag{position:absolute;margin:0;padding:4px 7px;text-align:center;font:400 10.5px/1.35 var(--mono);color:var(--ink);background:rgba(10,1,24,.9);border:1px solid rgba(134,203,254,.35);border-radius:6px;pointer-events:none;white-space:nowrap}
@ .lp-tag[hidden]{display:none}
@media (forced-colors:active){@ .lp-hud,@ .lp-tag{border:1px solid CanvasText}@ .lp-hold{forced-color-adjust:none;background:Canvas;color:CanvasText;border:1px solid CanvasText}@ .lp-hold[aria-pressed="true"]{background:Highlight;color:HighlightText}}`.replace(/@ /g, 'html.atlas section[data-room="loop"] ');
export default {
id: 'loop', track: BED, glyph: { edges: false }, angles: ANGLES,
ready: false, ang: 'tower', hold: null, holds: [], hov: -1, litKey: '', rest: null, flash: 0, pz: null, spun: 0,
ladderNote: () => 'a mark here is one streak, drawn on every ring it reached',
async mount(root, ctx) {
this.ctx = ctx; this.root = root;
if (!ctx.atlas || !ctx.atlas.on) return;
document.head.appendChild(el('style')).textContent = CSS;
let d, RG; try { [d, RG] = await Promise.all([ctx.data('loops'), import('./loop.rings.js' + new URL(import.meta.url).search)]); } catch (e) {}
if (!d || !d.streaks || !d.tail || !d.ge || !RG) { const w = root.parentElement.querySelector('.wall'); if (w) w.appendChild(el('p', 'say dim', 'the rings did not load this time.')); return; }
this.d = d; this.RG = RG;
const F = this.F = [];
for (let L = 2; L <= 13; L++) { const s = d.streaks[L] || 0; F.push({ lo: L, hi: L, S: s, R: s * (L - 1) }); }
d.tail.forEach((t) => F.push({ lo: t[0], hi: t[1], S: t[2], R: t[3] }));
this.reps = F.reduce((a, f) => a + f.R, 0);
if (this.reps !== d.repeats || F.reduce((a, f) => a + f.S, 0) !== d.ge['2']) console.warn('loop: counts do not reconcile', this.reps, d.repeats);
const g = RG.rings(d); this.RS = g.RS; this.n = g.n;
this.nTen = d.tracks_10plus;
this.fc = !!tr(() => matchMedia('(forced-colors: active)').matches);
this.build(root, ctx);
tr(() => ctx.audio.onChange(() => { if (this.active() && !this.hold && !this.rest) this.status(); }));
this.ready = true;
},
build(root, ctx) {
const hud = this.hud = root.appendChild(el('div', 'lp-hud')), at = (e, k, v) => { e.setAttribute(k, v); return e; };
at(hud.appendChild(el('p', 'lp-kb', 'space or enter: hold · esc: cancel · ← →: the rings, ten plays or more')), 'aria-hidden', 'true');
this.line = hud.appendChild(el('p', 'lp-line'));
const row = hud.appendChild(el('div', 'lp-row')), b = this.btn = row.appendChild(el('button', 'lp-hold lp-cue', 'hold to loop'));
b.type = 'button'; at(b, 'aria-pressed', 'false');
at(b, 'aria-label', 'hold to keep the bar looping, let go to step off. arrow keys: the rings, ten plays or more');
on(b, 'pointerdown', (e) => { if (e.button > 0) return; e.preventDefault(); tr(() => b.setPointerCapture(e.pointerId)); this.begin('button'); });
const up = (e) => { if (this.hold && this.hold.via === 'button') (e.type === 'pointercancel' ? this.cancel() : this.drop()); };
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => on(b, t, up));
on(b, 'contextmenu', (e) => e.preventDefault());
on(b, 'click', (e) => e.preventDefault());
on(b, 'keydown', (e) => this.key(e, true));
on(b, 'keyup', (e) => this.keyUp(e));
on(b, 'focus', () => hud.classList.toggle('kb', !this.nar));
on(b, 'blur', () => { hud.classList.remove('kb'); if (this.hold && this.hold.via === 'key') this.drop(); });
this.mine = at(row.appendChild(el('p', 'lp-mine')), 'aria-hidden', 'true');
const sr = hud.appendChild(el('ul', 'lp-sr')); at(sr, 'aria-label', 'the rings, from the inside out');
this.RS.forEach((r) => sr.appendChild(el('li', null, this.RG.phrase(r.L) + ': ' + fmt(r.n) + ' streaks')));
sr.appendChild(el('li', null, fmt(this.nTen) + ' songs my log counts 10 times or more'));
this.tag = at(root.appendChild(el('p', 'lp-tag')), 'aria-hidden', 'true'); this.tag.hidden = true;
this.onUp = (e) => this.keyUp(e);
this.onKd = (e) => { if (e.metaKey || e.ctrlKey || e.altKey) return; if (e.key === 'Escape' && this.hold) { stop(e); this.cancel(); } else if (e.key === ' ') this.key(e); };
},
nAt(k) {
const g = this.d.ge;
if (!(k >= 1)) return null;
if (k <= 13) return { n: g[String(k + 1)], kk: k, L: k + 1 };
if (k <= 18) return { n: g['14'], kk: 13, L: 14, snap: true };
if (k === 19) return { n: g['20'], kk: 19, L: 20 };
if (k <= 48) return { n: g['20'], kk: 19, L: 20, snap: true };
return { n: g['50'], kk: 49, L: 50, cap: true };
},
repAt(L) { let r = 0; this.F.forEach((f) => { if (f.lo >= L) r += f.R; }); return r; },
reach(k) {
const r = this.nAt(k);
if (!r) return 'the first loop had not come round yet. hold until the bar starts over.';
let s = 'my log shows ' + fmt(r.n) + ' streaks of at least ' + lp(r.kk) + ' (' + (r.cap ? '50 or more' : r.L) + ' plays in a row).';
if (r.snap) s += ' past 14 plays the rings jump to 20, then 50, so the count stays on the last ring passed.';
if (r.cap) s += ' the rings stop counting there.';
return s;
},
dropText(k, demo) {
const r = this.nAt(k);
let s = (demo ? 'a demo hand held ' : 'you held ') + lp(k) + '. ' + this.reach(k);
if (r) s += ' between them they hold ' + fmt(this.repAt(r.L)) + ' of my ' + fmt(this.reps) + ' repeats.';
return s;
},
layout(ctx) {
const s = this.st = ctx.stage(), side = s.h < 420 && s.w > s.h * 1.2, nar = this.nar = s.w < 560, H = this.hud.style;
const hw = side ? min(250, s.w * 0.6) : min(s.w, 600);
this.hud.classList.toggle('cmp', side || nar); const sd = this.sd = side || (nar && s.h < 460); this.hud.classList.toggle('sd', sd);
const cr = nar && tr(() => document.querySelector('.atlas-ladder-chip').getBoundingClientRect()), ch = cr && cr.width ? cr.height + (side ? 26 : 6) : 0;
H.width = hw + 'px'; H.left = (side ? s.x + s.w - hw : s.x + (s.w - hw) / 2) + 'px';
const L0 = this.line.textContent, M0 = this.mine.textContent; H.minHeight = '0';
this.line.textContent = this.dropText(17, !sd); this.mine.textContent = 'your holds: ' + Array(sd ? 2 : 5).fill(lp(17)).join(' · ');
const hh = this.hud.offsetHeight || 110; H.minHeight = hh + 'px'; this.line.textContent = L0; this.mine.textContent = M0;
if (side) { H.top = s.y + max(0, (s.h - ch - hh) / 2) + 'px'; H.bottom = 'auto'; } else { H.top = 'auto'; H.bottom = max(0, innerHeight - s.y - s.h) + 'px'; }
this.yb = side ? s.y + s.h - 8 : s.y + s.h - hh - 12;
if (!side) this.yb -= ch || 18;
this.RG.layout(this, s, side, hw);
},
enter(ctx) {
const P = ctx.particles, re = ctx.atlas && ctx.atlas.reenter;
P.ease = 0.08; P.jitter = 0.15; P.big = false; P.touch = false; P.swirl = 0.2;
if (!this.ready) { P.scatter(); P.color(() => MUTE); return; }
if (!re) { this.ang = 'tower'; this.hov = -1; this.tag.hidden = true; this.rest = null; }
this.layout(ctx);
tr(() => ctx.view.configure({ mode: 'none' }));
P.glyphAll(true); P.glyphMode('cont', { colour: 'sample', edges: false }); P.glyphCell(4);
this.place(ctx); this.status();
tr(() => ctx.ladder.level('oneplay'));
this.keysOn(false); this.keysOn(true);
if (!re && ctx.tour && ctx.tour.active && ctx.tour.active.playing) this.demo(ctx, 1200);
},
pr(v) { this.btn.setAttribute('aria-pressed', '' + v); },
keysOn(v) { const f = v ? 'addEventListener' : 'removeEventListener'; window[f]('keydown', this.onKd, true); window[f]('keyup', this.onUp); this.keysUp = v; },
active() { const p = this.root && this.root.parentElement; return !!p && p.classList.contains('is-active'); },
place(ctx) {
const P = ctx.particles;
tr(() => ctx.labels.clear('loop'));
if (this.ang === 'ten') {
const n = this.nTen, c = this.tc, sp = this.tsp;
P.targetPx((i) => (i < n ? [this.tx0 + (i % c + 0.5) * sp, this.ty0 + (floor(i / c) + 0.5) * sp] : null));
P.color((i) => (i < n ? INK : MUTE)); P.w.fill(210, 0, n);
tr(() => ctx.ladder.readout('1 mark = 1 song with 10 or more counted plays'));
} else {
this.RG.place(this, P);
this.weigh(ctx, true);
tr(() => ctx.ladder.readout('1 mark = 1 streak, on each ring it reached'));
}
},
weigh(ctx, force) { if (this.RS && this.ang === 'tower') this.RG.weigh(this, ctx.particles, force); },
home() { const ctx = this.ctx; if (this.spun && this.ang === 'tower') this.RG.place(this, ctx.particles); this.litKey = ''; this.weigh(ctx); },
pickMode(b) {
const A = this.ctx.audio; if (!A || !A.ac || !A.on || A.muted) return 'silent';
const e = A.els && A.els[A.cur];
return b && e && !e.paused && e.dataset.t === BED && isFinite(e.duration) && e.duration > 4 ? 'bar' : 'synth';
},
begin(via) {
const ctx = this.ctx;
if (via !== 'demo') { this.btn.classList.remove('lp-cue'); this.stopDemo(); tr(() => { if (ctx.tour.active.playing) ctx.tour.pause('user'); }); }
if (!this.ready || this.hold || !this.active()) return;
if (this.ang !== 'tower') tr(() => ctx.angle.set('tower', { via: 'room' }));
const A = ctx.audio, b = tr(() => A.beat(2)) || null, mode = this.pickMode(b);
const len8 = b ? b.len : 30 / BPM0, barMs = len8 * 8000, a0 = A.ac ? A.ac.currentTime : 0;
const h = this.hold = { p0: performance.now(), via, k: 0, barMs, len8, mode, a0, o8: mode === 'bar' ? b.next - b.now : 0.02, s: 0 };
if (mode === 'bar') { h.el = A.els[A.cur]; h.e0 = h.el.currentTime; }
this.rest = null; this.pr(true); this.tag.hidden = true; this.hov = -1; this.pz = null;
tr(() => ctx.audio.tick(null));
this.litKey = ''; this.weigh(ctx);
this.line.textContent = (via === 'demo' ? 'a demo hand is holding. ' : '') + 'holding: the bar plays, and comes round again while you hold.';
this.tm = setInterval(() => this.pump(), 25); this.pump();
},
loopsAt(t) { const h = this.hold; return h ? floor((t - h.p0) / h.barMs) : 0; },
pump() {
const h = this.hold; if (!h) return;
const ctx = this.ctx, A = ctx.audio, k = this.loopsAt(performance.now());
if (k !== h.k) { h.k = k; this.flash = performance.now(); this.weigh(ctx); this.live(); }
if (h.mode === 'silent' && A.on && !A.muted && A.ac) { h.mode = 'synth'; h.a0 = A.ac.currentTime - (performance.now() - h.p0) / 1000; }
if (h.mode === 'bar') {
const e = h.el, bar = h.barMs / 1000;
if (A.muted || !A.on || e !== A.els[A.cur] || e.paused) h.mode = A.on && !A.muted ? 'synth' : 'silent';
else if (e.currentTime >= h.e0 + bar - 0.006 || e.currentTime < h.e0 - 0.5) { try { e.currentTime = h.e0 + max(0, (e.currentTime - h.e0) % bar); } catch (x) { h.mode = 'synth'; } }
}
if (h.mode === 'silent' || !A.ac) return;
const now = A.ac.currentTime;
for (let g = 0; g < 16; g++) {
const t = h.a0 + h.o8 + h.s * h.len8; if (t > now + 0.15) break;
const s = h.s++, bi = floor(s / 8), pos = s % 8; if (t < now - 0.02) continue;
const at = max(0, t - now);
for (let m = max(1, bi - 7); m <= bi; m++) if (ORDER[(m - 1) % 8] === pos) tr(() => A.note(m <= 11 ? 6 - m : -5 + ((m - 12) % 5), { at, dur: 0.32, vol: 0.034, type: 'sine' }));
if (h.mode === 'synth' && (pos === 0 || pos === 3 || pos === 6)) tr(() => A.note(pos ? -5 : 0, { at, dur: 0.18, vol: pos ? 0.026 : 0.03, type: 'triangle' }));
}
},
live() {
const k = this.hold.k, r = this.nAt(k);
this.mine.textContent = !r ? 'loop 0' : 'loop ' + k + ' · ' + fmt(r.n) + ' of my streaks got at least ' + (r.snap || r.cap ? lp(r.kk) : 'this far');
},
endHold() { clearInterval(this.tm); this.tm = 0; const h = this.hold; this.hold = null; this.pr(false); return h; },
drop() {
if (!this.hold) return;
const ctx = this.ctx, t = performance.now(), k = this.loopsAt(t), h = this.endHold(), demo = h.via === 'demo';
tr(() => ctx.audio.note(-5, { dur: 1.3, vol: 0.07, type: 'sine' }));
tr(() => ctx.buzz(14));
this.rest = k >= 1 ? { k } : null;
this.holds.push({ k, demo }); if (this.holds.length > 5) this.holds.shift();
this.home();
const txt = this.dropText(k, demo); this.line.textContent = txt; tr(() => ctx.say(txt));
const mine = this.holds.filter((q) => !q.demo).map((q) => lp(q.k)).slice(this.sd ? -2 : -5);
this.mine.textContent = mine.length ? 'your holds: ' + mine.join(' · ') : '';
return k;
},
cancel() {
if (!this.hold) return;
this.endHold(); this.home();
this.line.textContent = 'cancelled. hold again when you are ready.'; this.mine.textContent = '';
},
/* a press let go before 380 ms on the field is a tap: no hold is counted, the ring under it plays its count */
tapEnd(p) { this.endHold(); this.home(); this.status(); this.showRing(this.RG.ringAt(this, p.sx, p.sy), true); },
key(e, onBtn) {
const k = e.key, t = e.target;
if (!this.active() || !this.ready) return false;
if (!onBtn) { if (k !== ' ' || (t && t.closest && t.closest('button,a,input,select,textarea,[role=button],dialog'))) return false; }
else if (k === 'ArrowLeft' || k === 'ArrowRight') { stop(e); if (!this.hold) tr(() => (k === 'ArrowLeft' ? this.ctx.angle.prev() : this.ctx.angle.next())); return true; }
else if (k === 'Escape') { if (this.hold) { stop(e); this.cancel(); } return true; }
else if (k !== ' ' && k !== 'Enter') return false;
stop(e);
if (!e.repeat && !this.hold) { this.begin('key'); if (this.hold) this.hold.key = k; }
return true;
},
keyUp(e) { if (this.hold && this.hold.via === 'key' && e.key === this.hold.key) { e.preventDefault(); this.drop(); } },
setAngle(k, ctx) {
const a = ANGLES[k]; if (!a || !this.ready) return 0;
if (this.hold && a.id !== 'tower') this.cancel();
if (a.id === this.ang && this.cx) return 0;
this.ang = a.id; this.hov = -1; this.tag.hidden = true; this.pz = null;
if (this.cx) this.place(ctx);
this.status();
return 0;
},
status() {
const s = this.ctx.audio, snd = s.on && !s.muted;
if (this.hold) return;
this.line.textContent = this.ang === 'ten'
? fmt(this.nTen) + ' songs my log counts 10 times or more: one glyph each, no titles. hold to go back to the rings.'
: (this.nar ? 'hold anywhere: the bar loops, and each loop lights the next ring.' : 'hold anywhere, or space: the bar loops while you hold, and each loop steps out one ring.') + (snd ? '' : ' sound is off; the rings still count.');
},
hoverVoice(id) { const k = /^r\d+$/.test(id) ? +id.slice(1) : -1, r = this.RS && this.RS[k]; return r ? { deg: k, plays: r.n, kind: 'label' } : null; },
showRing(k, tap) {
if (k === this.hov && !tap) return;
this.hov = k;
if (k < 0) { this.tag.hidden = true; this.pz = null; return; }
const r = this.RS[k], tg = this.tag;
tg.textContent = this.RG.phrase(r.L) + ': ' + fmt(r.n) + ' streaks · a click per hundred';
tg.hidden = false;
const s = this.st, w = tg.offsetWidth || 200;
tg.style.left = clamp(r.x - w / 2, s.x + 4, s.x + s.w - w - 4) + 'px'; tg.style.top = max(s.y + 2, r.bt - (tg.offsetHeight || 22) - 2) + 'px';
this.RG.pulse(this, k);
},
gestures(ctx) {
return {
dbl: false, wheel: false,
tap: (p) => { if (this.hold || this.ang !== 'tower') return false; const k = this.RG.ringAt(this, p.sx, p.sy); this.showRing(k, true); return k >= 0; },
hover: (p) => {
if (this.hold) return;
if (this.ang === 'ten') { const inF = p.sx >= this.tx0 && p.sx <= this.tx0 + this.tc * this.tsp && p.sy >= this.ty0 && p.sy <= this.yb; if (inF !== (this.hov === 99)) { this.hov = inF ? 99 : -1; tr(() => ctx.audio.tick(inF ? 'loop:ten' : null, { deg: 0, plays: this.nTen, x: p.sx, y: p.sy })); } return; }
this.showRing(this.RG.ringAt(this, p.sx, p.sy));
},
leave: () => { if (!this.hold) this.showRing(-1); },
cursor: () => 'pointer',
hold: {
delay: 0,
press: () => this.begin('stage'),
start() {}, move() {},
end: (p, cancelled) => { const h = this.hold; if (!h || h.via !== 'stage') return; if (cancelled) this.cancel(); else if (performance.now() - h.p0 < 380 && this.ang === 'tower') this.tapEnd(p); else this.drop(); },
},
};
},
keepout() { const r = this.hud && this.hud.getBoundingClientRect(); return r && r.width ? [{ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 }] : []; },
frame(g, t, bands, w, h, ctx) {
if (!this.ready || !this.DX) return;
const red = ctx.reduced, now = performance.now();
if (this.ang === 'ten') {
if (!red && ((t * 60) | 0) % 4 === 0) { const W = ctx.particles.w, C = this.tcol, n = this.nTen; for (let i = 0; i < n; i++) W[i] = 165 + 90 * Math.sin(t * 1.3 - C[i] * 0.22) | 0; }
g.font = '400 ' + (this.nar ? 9.5 : 10.5) + MONO; g.fillStyle = 'rgba(217,212,238,.62)'; g.textAlign = 'center'; g.textBaseline = 'bottom';
g.fillText(fmt(this.nTen) + ' songs · 10 or more counted plays each', this.cx, this.ty0 - 6);
return;
}
if (this.hold && this.loopsAt(now) !== this.hold.k) this.pump();
this.RG.spin(this, ctx, now); this.RG.idle(this, ctx, t);
g.globalAlpha = 1; this.RG.draw(this, g, ctx, now); g.textBaseline = 'top';
},
leave(ctx) {
this.stopDemo(); if (this.hold) this.cancel(); this.hov = -1; this.pz = null;
tr(() => { ctx.stopPosts(); ctx.audio.tick(null); });
this.keysOn(false);
tr(() => ctx.ladder.readout(null));
},
demo(ctx, wait) {
if (!this.ready) return;
this.stopDemo(); const T = this._demoT = [], at = (ms, f) => T.push(setTimeout(() => { if (this.active() && this._demoT === T) f(); }, ms)), w0 = wait || 700;
at(w0, () => {
this.begin('demo'); const h = this.hold; if (!h || h.via !== 'demo') return;
at(h.barMs * 5 + 180, () => { if (this.hold && this.hold.via === 'demo') { this.drop(); tr(() => { const U = ctx.tour; if (U.active.playing && U.holdLeft) U.holdLeft(4200); }); } });
at(h.barMs * 5 + 3800, () => { if (this.ang === 'tower' && !tr(() => ctx.tour.active.playing)) tr(() => ctx.angle.set('ten', { via: 'room' })); });
});
},
stopDemo() { if (this._demoT) { this._demoT.forEach(clearTimeout); this._demoT = null; } if (this.hold && this.hold.via === 'demo') this.cancel(); },
};
