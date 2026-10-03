/* N4 · on loop. loops.json only (counts; no titles, artists or dates). one glyph = one repeat. the tower: a floor per streak
   length (2..13 plays in a row, then 14-19, 20-49, 50+ after a break); area = repeats. a hold loops one bar of the bed and
   climbs a floor per loop; the count read back follows REFEREE3's snap rule. the longest streak is never derived or shown. */
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fmt = (n) => Number(n).toLocaleString('en-US');
const tr = (f) => { try { return f(); } catch (e) {} };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const { floor, min, max, round } = Math, MONO = 'px "JetBrains Mono", ui-monospace, monospace';
const stop = (e) => { e.preventDefault(); e.stopPropagation(); }, on = (e, t, f) => e.addEventListener(t, f);
const IC = 'rgba(134,203,254,', ICE = 0x86cbfe, INK = 0xd9d4ee, MUTE = 0x57507a, BED = 'choose-me-whole', BPM0 = 123.05;
const ANGLES = [{ id: 'tower', name: 'the tower' }, { id: 'ten', name: 'ten plays or more' }];
const ORDER = [0, 4, 2, 6, 1, 5, 3, 7];
const lp = (k) => k + (k === 1 ? ' loop' : ' loops');
const CSS = `@ .lp-hud{position:absolute;box-sizing:border-box;padding:8px 10px;background:rgba(10,1,24,.78);border:1px solid rgba(134,203,254,.24);border-radius:12px}
@ .lp-line{font:400 12.5px/1.45 var(--mono);color:var(--ink);margin:0 2px 6px;min-height:2.9em}
@ .lp-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
@ .lp-hold{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ice);background:rgba(134,203,254,.08);border:1px solid rgba(134,203,254,.55);border-radius:999px;padding:0 16px;min-height:44px;min-width:44px;cursor:pointer;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
@ .lp-hold[aria-pressed="true"]{background:rgba(134,203,254,.24);color:var(--ink)}
@ .lp-hold:focus-visible{outline:2px solid var(--ice);outline-offset:3px}
@ .lp-mine{margin:0;font:400 10.5px/1.4 var(--mono);color:var(--mute)}
@ .lp-kb{display:none;position:absolute;left:10px;bottom:100%;margin:0 0 6px;font:400 10.5px/1.3 var(--mono);color:var(--ice);background:rgba(10,1,24,.86)}
@ .lp-hud.kb .lp-kb{display:block}
@ .lp-hud.cmp .lp-line{font-size:11px;line-height:1.38;margin-bottom:4px}
@ .lp-hud.sd{padding:5px 8px}
@ .lp-hud.sd .lp-line,@ .lp-hud.sd .lp-mine{font-size:10px}
@ .lp-sr{position:absolute;opacity:0;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@ .lp-tag{position:absolute;margin:0;padding:4px 7px;font:400 10.5px/1.35 var(--mono);color:var(--ink);background:rgba(10,1,24,.9);border:1px solid rgba(134,203,254,.35);border-radius:6px;pointer-events:none;white-space:nowrap}
@ .lp-tag[hidden]{display:none}
@media (forced-colors:active){@ .lp-hud,@ .lp-tag{border:1px solid CanvasText}@ .lp-hold{forced-color-adjust:none;background:Canvas;color:CanvasText;border:1px solid CanvasText}@ .lp-hold[aria-pressed="true"]{background:Highlight;color:HighlightText}}`.replace(/@ /g, 'html.atlas section[data-room="loop"] ');
export default {
id: 'loop', track: BED, glyph: { edges: false }, angles: ANGLES,
ready: false, ang: 'tower', hold: null, holds: [], hov: -1, litKey: '', rest: null, flash: 0,
ladderNote: () => 'a glyph here is one repeat: a counted play straight after the same song',
async mount(root, ctx) {
this.ctx = ctx; this.root = root;
if (!ctx.atlas || !ctx.atlas.on) return;
document.head.appendChild(el('style')).textContent = CSS;
let d; try { d = await ctx.data('loops'); } catch (e) {}
if (!d || !d.streaks || !d.tail || !d.ge) { const w = root.parentElement.querySelector('.wall'); if (w) w.appendChild(el('p', 'say dim', 'the tower did not load this time.')); return; }
this.d = d;
const F = this.F = [];
for (let L = 2; L <= 13; L++) { const s = d.streaks[L] || 0; F.push({ lo: L, hi: L, S: s, R: s * (L - 1) }); }
d.tail.forEach((t) => F.push({ lo: t[0], hi: t[1], S: t[2], R: t[3] }));
const off = this.off = new Int32Array(F.length + 1);
F.forEach((f, k) => { off[k + 1] = off[k] + f.R; });
this.n = off[F.length];
if (this.n !== d.repeats || F.reduce((a, f) => a + f.S, 0) !== d.ge['2']) console.warn('loop: counts do not reconcile', this.n, d.repeats);
this.fl = new Uint8Array(this.n); F.forEach((f, k) => this.fl.fill(k, off[k], off[k + 1]));
this.nTen = d.tracks_10plus;
this.build(root, ctx);
tr(() => ctx.audio.onChange(() => { if (this.active() && !this.hold && !this.rest) this.status(); }));
this.ready = true;
},
build(root, ctx) {
const hud = this.hud = root.appendChild(el('div', 'lp-hud')), at = (e, k, v) => { e.setAttribute(k, v); return e; };
at(hud.appendChild(el('p', 'lp-kb', 'space or enter: hold · esc: cancel · ← →: the tower, ten plays or more')), 'aria-hidden', 'true');
this.line = hud.appendChild(el('p', 'lp-line'));
const row = hud.appendChild(el('div', 'lp-row')), b = this.btn = row.appendChild(el('button', 'lp-hold', 'hold to loop'));
b.type = 'button'; at(b, 'aria-pressed', 'false');
at(b, 'aria-label', 'hold to keep the bar looping, let go to step off. arrow keys: the tower, ten plays or more');
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
const sr = hud.appendChild(el('ul', 'lp-sr')); at(sr, 'aria-label', 'the tower, floor by floor');
this.F.forEach((f) => sr.appendChild(el('li', null, this.fname(f) + ': ' + fmt(f.S) + ' streaks, ' + fmt(f.R) + ' repeats')));
sr.appendChild(el('li', null, fmt(this.nTen) + ' songs my log counts 10 times or more'));
this.tag = at(root.appendChild(el('p', 'lp-tag')), 'aria-hidden', 'true'); this.tag.hidden = true;
this.onUp = (e) => this.keyUp(e);
this.onKd = (e) => { if (e.metaKey || e.ctrlKey || e.altKey) return; if (e.key === 'Escape' && this.hold) { stop(e); this.cancel(); } else if (e.key === ' ') this.key(e); };
},
fname(f) { return f.hi === f.lo ? f.lo + ' plays in a row' : f.hi ? f.lo + ' to ' + f.hi + ' plays in a row' : f.lo + ' or more plays in a row'; },
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
if (r.snap) s += ' above 13 plays the floors are grouped, so the count stays at the floor\'s first step.';
if (r.cap) s += ' the tower stops counting there.';
return s;
},
dropText(k, demo) {
const r = this.nAt(k);
let s = (demo ? 'a demo hand held ' : 'you held ') + lp(k) + '. ' + this.reach(k);
if (r) s += ' between them they hold ' + fmt(this.repAt(r.L)) + ' of my ' + fmt(this.n) + ' repeats.';
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
const pad = nar ? 6 : 20, AX = this.AX = nar ? 40 : 58, RC = this.RC = nar ? 40 : 190;
const x0 = this.x0 = s.x + pad, Wt = this.Wt = (side ? s.w - hw - 12 : s.w) - pad * 2;
this.yb = side ? s.y + s.h - 8 : s.y + s.h - hh - 12; this.ty = s.y + 30;
if (!side) this.yb -= ch || 18;
const Wm = this.Wm = max(40, Wt - AX - RC), cx = this.cx = x0 + AX + Wm / 2, F = this.F, nF = F.length;
const gap = nar ? 2 : 3, brk = nar ? 12 : 18, Hv = max(60, this.yb - this.ty), hmin = min(nar ? 7 : 10, max(2, (Hv - brk - gap * nF) / nF / 2));
const tot = (a) => { let h = brk + gap * (nF + 1); for (const f of F) h += max(hmin, f.R * a / Wm); return h; };
let lo = 0, hi = 50; for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (tot(m) > Hv) hi = m; else lo = m; }
const a = this.a = lo;
this.fx = new Float32Array(nF); this.fw = new Float32Array(nF); this.fb = new Float32Array(nF); this.fh = new Float32Array(nF);
let y = this.yb;
for (let k = 0; k < nF; k++) {
const h = max(hmin, F[k].R * a / Wm), w = F[k].R * a / h;
this.fh[k] = h; this.fw[k] = w; this.fx[k] = cx - w / 2; this.fb[k] = y;
y -= h + gap * (k > 11 ? 2 : 1); if (k === 11) { this.brkY = y - brk / 2 + gap / 2; y -= brk; }
}
this.top = y + gap * 2;
const n = this.nTen, asp = Wm / Hv, cols = this.tc = max(8, round(Math.sqrt(n * asp))), rows = Math.ceil(n / cols);
const sp = this.tsp = min(Wm / cols, Hv / rows, 14);
this.tx0 = cx - cols * sp / 2; this.ty0 = this.ty + (Hv - rows * sp) / 2;
this.tcol = new Uint16Array(n); for (let i = 0; i < n; i++) this.tcol[i] = i % cols;
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
const P = ctx.particles, h = ctx.hash;
if (this.ang === 'ten') {
const n = this.nTen, c = this.tc, sp = this.tsp;
P.targetPx((i) => (i < n ? [this.tx0 + (i % c + 0.5) * sp, this.ty0 + (floor(i / c) + 0.5) * sp] : null));
P.color((i) => (i < n ? INK : MUTE)); P.w.fill(210, 0, n);
tr(() => ctx.ladder.readout('1 glyph = 1 song with 10 or more counted plays'));
tr(() => ctx.labels.clear('loop'));
} else {
const n = this.n, FL = this.fl, fx = this.fx, fw = this.fw, fb = this.fb, fh = this.fh;
P.targetPx((i) => { if (i >= n) return null; const k = FL[i]; return [fx[k] + h(i * 3 + 1) * fw[k], fb[k] - h(i * 3 + 2) * fh[k]]; });
this.litKey = ''; this.weigh(ctx, true);
tr(() => ctx.ladder.readout('1 glyph = 1 repeat'));
this.pushLabels(ctx);
}
},
weigh(ctx, force) {
const P = ctx.particles, W = P.w, r = this.hold ? this.nAt(this.hold.k) : this.rest ? this.nAt(this.rest.k) : null, L = r ? r.L : 0;
const cur = this.hold ? this.floorOfL(this.hold.k + 1) : -1, key = L + ':' + cur;
if (!force && key === this.litKey) return; this.litKey = key;
const F = this.F, off = this.off;
for (let k = 0; k < F.length; k++) W.fill(!L ? 175 : F[k].lo >= L ? 255 : 55, off[k], off[k + 1]);
const a = cur >= 0 ? off[cur] : -1, b = cur >= 0 ? off[cur + 1] : -1, n = this.n;
P.color((i) => (i >= n ? MUTE : i >= a && i < b ? ICE : INK));
},
floorOfL(L) { const F = this.F; if (L < 2) return -1; for (let k = 0; k < F.length; k++) if (L <= (F[k].hi || 1e9)) return k; return F.length - 1; },
yOfL(L) {
if (L < 2) return this.yb + 6;
const k = this.floorOfL(L), f = this.F[k], b = this.fb[k], h = this.fh[k];
if (f.lo === f.hi) return b - h / 2;
if (!f.hi) return b - h * 0.35;
return b - h * (L - f.lo + 0.5) / (f.hi - f.lo + 1);
},
pickMode(b) {
const A = this.ctx.audio; if (!A || !A.ac || !A.on || A.muted) return 'silent';
const e = A.els && A.els[A.cur];
return b && e && !e.paused && e.dataset.t === BED && isFinite(e.duration) && e.duration > 4 ? 'bar' : 'synth';
},
begin(via) {
const ctx = this.ctx;
if (via !== 'demo') { this.stopDemo(); tr(() => { if (ctx.tour.active.playing) ctx.tour.pause('user'); }); }
if (!this.ready || this.hold || !this.active()) return;
if (this.ang !== 'tower') tr(() => ctx.angle.set('tower', { via: 'room' }));
const A = ctx.audio, b = tr(() => A.beat(2)) || null, mode = this.pickMode(b);
const len8 = b ? b.len : 30 / BPM0, barMs = len8 * 8000, a0 = A.ac ? A.ac.currentTime : 0;
const h = this.hold = { p0: performance.now(), via, k: 0, barMs, len8, mode, a0, o8: mode === 'bar' ? b.next - b.now : 0.02, s: 0 };
if (mode === 'bar') { h.el = A.els[A.cur]; h.e0 = h.el.currentTime; }
this.rest = null; this.pr(true); this.tag.hidden = true; this.hov = -1;
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
this.litKey = ''; this.weigh(ctx);
const txt = this.dropText(k, demo); this.line.textContent = txt; tr(() => ctx.say(txt));
const mine = this.holds.filter((q) => !q.demo).map((q) => lp(q.k)).slice(this.sd ? -2 : -5);
this.mine.textContent = mine.length ? 'your holds: ' + mine.join(' · ') : '';
return k;
},
cancel() {
if (!this.hold) return;
this.endHold(); this.litKey = ''; this.weigh(this.ctx);
this.line.textContent = 'cancelled. hold again when you are ready.'; this.mine.textContent = '';
},
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
this.ang = a.id; this.hov = -1; this.tag.hidden = true;
if (this.cx) this.place(ctx);
this.status();
return 0;
},
status() {
const s = this.ctx.audio, snd = s.on && !s.muted;
if (this.hold) return;
this.line.textContent = this.ang === 'ten'
? fmt(this.nTen) + ' songs my log counts 10 times or more: one glyph each, no titles. hold to go back to the tower.'
: 'hold anywhere, this button or space: the bar loops while you hold, and every loop climbs a floor.' + (snd ? '' : ' sound is off; the tower still counts.');
},
hoverVoice(id) { const k = /^f\d+$/.test(id) ? +id.slice(1) : -1, f = this.F && this.F[k]; return f ? { deg: k, plays: f.R, kind: 'label' } : null; },
pushLabels(ctx) {
if (this.nar || this.ang !== 'tower') { tr(() => ctx.labels.clear('loop')); return; }
const x = this.cx + this.Wm / 2 + 66, it = [0, 12, 13, 14].map((k) => {
const f = this.F[k];
return { id: 'f' + k, text: k ? (f.hi ? f.lo + ' to ' + f.hi + (k === 13 ? ': a wider range' : '') : '50 or more') : '2 plays in a row', x, y: this.fb[k] - this.fh[k] / 2, space: 'screen', r: 3, kind: 'obj', pri: 15 - k, deg: k, plays: f.R, go: () => this.showFloor(k) };
});
tr(() => ctx.labels.set('loop', it));
},
floorAt(sx, sy) {
if (this.ang !== 'tower' || !this.fb) return -1;
for (let k = 0; k < this.F.length; k++) if (sy <= this.fb[k] + 1.5 && sy >= this.fb[k] - this.fh[k] - 1.5 && sx >= this.x0 && sx <= this.x0 + this.Wt) return k;
return -1;
},
showFloor(k) {
const ctx = this.ctx; this.hov = k;
if (k < 0) { this.tag.hidden = true; tr(() => ctx.audio.tick(null)); return; }
const f = this.F[k], x = this.cx, y = this.fb[k] - this.fh[k] / 2;
tr(() => ctx.audio.tick('loop:f' + k, { deg: k, plays: f.R, x, y }));
const tg = this.tag; tg.textContent = this.fname(f) + ': ' + fmt(f.S) + ' streaks, ' + fmt(f.R) + ' repeats' + (k === 13 ? '. a wider range, so more streaks' : '');
tg.hidden = false;
const s = this.st, w = tg.offsetWidth || 200;
tg.style.left = clamp(x - w / 2, s.x + 4, s.x + s.w - w - 4) + 'px'; tg.style.top = max(s.y + 2, y - this.fh[k] / 2 - 30) + 'px';
},
gestures(ctx) {
return {
dbl: false, wheel: false,
hover: (p) => {
if (this.hold) return;
if (this.ang === 'ten') { const inF = p.sx >= this.tx0 && p.sx <= this.tx0 + this.tc * this.tsp && p.sy >= this.ty0 && p.sy <= this.yb; if (inF !== (this.hov === 99)) { this.hov = inF ? 99 : -1; tr(() => ctx.audio.tick(inF ? 'loop:ten' : null, { deg: 0, plays: this.nTen, x: p.sx, y: p.sy })); } return; }
const k = this.floorAt(p.sx, p.sy); if (k !== this.hov) this.showFloor(k);
},
leave: () => { if (!this.hold) this.showFloor(-1); },
cursor: () => 'pointer',
hold: {
delay: 0,
press: () => this.begin('stage'),
start() {}, move() {},
end: (p, cancelled) => { if (this.hold && this.hold.via === 'stage') (cancelled ? this.cancel() : this.drop()); },
},
};
},
keepout() { const r = this.hud && this.hud.getBoundingClientRect(); return r && r.width ? [{ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 }] : []; },
frame(g, t, bands, w, h, ctx) {
if (!this.ready || !this.fb) return;
const red = ctx.reduced, now = performance.now();
if (this.ang === 'ten') {
if (!red && ((t * 60) | 0) % 4 === 0) { const W = ctx.particles.w, C = this.tcol, n = this.nTen; for (let i = 0; i < n; i++) W[i] = 165 + 90 * Math.sin(t * 1.3 - C[i] * 0.22) | 0; }
g.font = '400 ' + (this.nar ? 9.5 : 10.5) + MONO; g.fillStyle = 'rgba(217,212,238,.62)'; g.textAlign = 'center'; g.textBaseline = 'bottom';
g.fillText(fmt(this.nTen) + ' songs · 10 or more counted plays each', this.cx, this.ty0 - 6);
return;
}
if (this.hold) { if (this.loopsAt(now) !== this.hold.k) this.pump(); }
const F = this.F, nF = F.length, nar = this.nar, xa = this.cx - this.Wm / 2 - 8, xr = this.cx + this.Wm / 2 + 8;
g.globalAlpha = 1; g.font = '400 ' + (nar ? 9 : 10.5) + MONO; g.textBaseline = 'middle';
const r = this.hold ? this.nAt(this.hold.k) : this.rest ? this.nAt(this.rest.k) : null, L = r ? r.L : 0;
for (let k = 0; k < nF; k++) {
const f = F[k], y = this.fb[k] - this.fh[k] / 2, lit = !L || f.lo >= L;
g.fillStyle = lit ? 'rgba(217,212,238,.7)' : 'rgba(217,212,238,.32)';
g.textAlign = 'right'; g.fillText(f.lo === f.hi ? '' + f.lo : f.hi ? f.lo + '–' + f.hi : '50+', xa, y);
g.textAlign = 'left'; g.fillText(fmt(f.S), xr, y);
}
g.textBaseline = 'bottom'; g.fillStyle = 'rgba(217,212,238,.55)';
g.textAlign = 'right'; g.fillText(nar ? 'plays' : 'plays in a row', xa + 4, this.top - 4);
g.textAlign = 'left'; g.fillText('streaks', xr, this.top - 4);
const by = round(this.brkY) + 0.5, x1 = this.cx - this.Wm / 2, x2 = this.cx + this.Wm / 2;
g.strokeStyle = 'rgba(217,212,238,.4)'; g.lineWidth = 1; g.beginPath();
for (let x = x1, u = 0; x <= x2; x += 6, u++) g[u ? 'lineTo' : 'moveTo'](x, by + (u % 2 ? -2.5 : 2.5));
g.stroke();
if (!nar) { g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(217,212,238,.5)'; g.fillText('grouped above', xa, by); }
const hd = this.hold;
if (hd || this.rest) {
const k = hd ? hd.k : this.rest.k, fr = hd && !red ? min(1, ((now - hd.p0) % hd.barMs) / hd.barMs) : 0;
const kk = min(k, 49), y0 = this.yOfL(kk + 1), y1 = kk >= 49 ? y0 : this.yOfL(kk + 2), e = fr * fr * (3 - 2 * fr), y = y0 + (y1 - y0) * e * (hd ? 1 : 0);
const fx = this.floorOfL(kk + 1), ww = fx >= 0 ? this.fw[fx] : 60, pulse = hd && !red ? max(0, 1 - (now - this.flash) / 380) : 0;
g.strokeStyle = IC + (0.85 + 0.15 * pulse) + ')'; g.lineWidth = 2 + pulse * 2;
g.beginPath(); g.moveTo(this.cx - ww / 2 - 10, round(y) + 0.5); g.lineTo(this.cx + ww / 2 + 10, round(y) + 0.5); g.stroke(); g.lineWidth = 1;
g.setLineDash([3, 4]); g.strokeStyle = IC + '.35)'; g.beginPath(); g.moveTo(this.cx, this.yb + 6); g.lineTo(this.cx, y); g.stroke(); g.setLineDash([]);
const lab = (hd && hd.via === 'demo' ? 'demo · ' : '') + lp(k);
g.font = '600 ' + (nar ? 11 : 12.5) + MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
const tw = g.measureText(lab).width + 12, th = nar ? 17 : 19, ty = round(y) - th - 2;
g.fillStyle = 'rgba(10,1,24,.9)'; g.fillRect(this.cx - tw / 2, ty, tw, th);
g.strokeStyle = IC + '.8)'; g.strokeRect(this.cx - tw / 2 + 0.5, ty + 0.5, tw - 1, th - 1);
g.fillStyle = '#86cbfe'; g.fillText(lab, this.cx, ty + th / 2 + 0.5);
g.textBaseline = 'top';
}
},
leave(ctx) {
this.stopDemo(); if (this.hold) this.cancel(); this.hov = -1;
tr(() => { ctx.stopPosts(); ctx.audio.tick(null); });
this.keysOn(false);
tr(() => ctx.ladder.readout(null));
},
demo(ctx, wait) {
if (!this.ready) return;
this.stopDemo(); const T = this._demoT = [], at = (ms, f) => T.push(setTimeout(() => { if (this.active() && this._demoT === T) f(); }, ms)), w0 = wait || 700;
at(w0, () => {
this.begin('demo'); const h = this.hold; if (!h || h.via !== 'demo') return;
at(h.barMs * 5 + 180, () => { if (this.hold && this.hold.via === 'demo') this.drop(); });
at(h.barMs * 5 + 3800, () => { if (this.ang === 'tower' && !tr(() => ctx.tour.active.playing)) tr(() => ctx.angle.set('ten', { via: 'room' })); });
});
},
stopDemo() { if (this._demoT) { this._demoT.forEach(clearTimeout); this._demoT = null; } if (this.hold && this.hold.via === 'demo') this.cancel(); },
};
