/* N3 · first meetings. mount reads arrivals.json only (codes, no names); the roster loads on type-box focus or a tap.
 pools = folded.bundled; the guess is judged on arm_strict and never asks an o; glyph weight = plays bucket, a picture only. */
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const at = (e, k, v) => { e.setAttribute(k, v); return e; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (n) => Number(n).toLocaleString('en-US');
const tryf = (f) => { try { return f(); } catch (e) {} };
const rgba = (h, a) => 'rgba(' + ((h >> 16) & 255) + ',' + ((h >> 8) & 255) + ',' + (h & 255) + ',' + a + ')';
const abgr = (v) => (0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)) >>> 0;
const ring = (g, x, y, r, f) => { g.beginPath(); g.arc(x, y, r, 0, 6.283); f ? g.fill() : g.stroke(); };
const MF = 'px "JetBrains Mono", ui-monospace, monospace';
const ARM = ['my hand', 'shuffle', 'the queue'];
const RAIN_S = 16, FLY_S = 1.1, TICK_MS = 84, CLOUD_W = 7, ICE = 0x86cbfe, NS = 20;
const ANGLES = [{ id: 'rain', name: 'the rain' }, { id: 'guess', name: 'who played it first?' }];
const CSS = `@ .ar-hud{font:400 12px/1.45 var(--mono);color:var(--ink);--b:rgba(134,203,254,.28);position:absolute;transform:translateY(-100%);box-sizing:border-box;padding:8px 10px;background:rgba(10,1,24,.82);border:1px solid var(--b);border-radius:12px;backdrop-filter:blur(5px)}
@ .ar-line{margin:0 2px 6px;min-height:4.4em}
@ .ar-line b{font-weight:600;color:var(--ice)}
@ .ar-line small{display:block;font-size:10.5px;color:var(--mute)}
@ .ar-row{display:flex;align-items:center;gap:6px;margin:0 0 6px;position:relative}
@ .ar-hud button{font:600 10.5px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--mute);background:rgba(134,203,254,.06);border:1px solid var(--b);border-radius:999px;padding:0 11px;min-height:44px;min-width:44px;cursor:pointer;white-space:nowrap}
@ .ar-hud button:hover,@ .ar-hud [aria-pressed=true]{color:var(--ink);border-color:var(--ice)}
@ .ar-hud [aria-pressed=true]{background:rgba(134,203,254,.18)}
@ .ar-hud button:disabled{opacity:.38}
@ .ar-hud :focus-visible{outline:2px solid var(--ice);outline-offset:2px}
@ .ar-hud button.ar-ok{opacity:1;color:#0a0118;background:var(--ice);border-color:var(--ice)}
@ .ar-hud button.ar-no{opacity:1;color:#8a8398;border-color:#5a5468;background:rgba(138,131,152,.12)}
@ .ar-sc{flex:1 1 auto;min-width:60px;height:44px;margin:0;accent-color:#86cbfe}
@ .ar-q{flex:1 1 auto;min-width:0;box-sizing:border-box;height:44px;font:13px/1 var(--mono);color:inherit;background:rgba(10,1,24,.9);border:1px solid var(--b);border-radius:999px;padding:0 14px}
@ .ar-q::placeholder{color:var(--mute)}
@ .ar-ls{position:absolute;left:0;right:0;bottom:calc(100% + 4px);margin:0;padding:4px;list-style:none;background:rgba(10,1,24,.96);border:1px solid var(--b);border-radius:10px;z-index:2;max-height:240px;overflow:auto}
@ .ar-ls li{line-height:1.2;padding:0 10px;min-height:40px;display:flex;align-items:center;border-radius:6px;cursor:pointer}
@ .ar-ls [aria-selected=true],@ .ar-ls li:hover{background:rgba(134,203,254,.18)}
@ .ar-hud .ar-a{flex:1 1 0;padding:0 6px}
@ .ar-pt{display:flex;align-items:center;gap:8px;min-height:44px}
@ .ar-pt .post{margin:0;flex:0 1 auto;min-width:0;max-width:62%}
@ .ar-pt .post-btn{max-width:100%;min-height:44px;padding:0 14px}
@ .ar-pt .post-t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@ .ar-pt .post-note{order:1;flex:1 1 0;margin:0;font-size:10px;line-height:1.3}
@ .ar-hint{margin:0 2px;font-size:10.5px;line-height:1.35;color:var(--mute)}
@ .cmp .ar-line{font-size:11px;line-height:1.38;margin-bottom:4px;min-height:5.6em}
@ .cmp button{padding:0 8px;letter-spacing:.02em}
@ .side{overflow:auto}
@ .side .ar-row{flex-wrap:wrap}
@ .side button{white-space:normal;line-height:1.1}
@ [hidden]{display:none!important}
@media (forced-colors:active){@ .ar-hud,@ .ar-ls{border:1px solid CanvasText}@ [aria-pressed=true],@ .ar-hud button.ar-ok{forced-color-adjust:none;background:Highlight;color:HighlightText}}`.replace(/@ /g, 'html.atlas section[data-room="arrivals"] ');

export default {
id: 'arrivals', track: 'cant-resist-the-bite', glyph: { edges: false }, angles: ANGLES, ladderNote: 'artist sizes are not play counts',
ready: false, L: 0, cur: 0, run: false, speed: 1, done: false, guess: false, pq: -1, sel: -1, hov: -1,
names: null, lower: null, nodes: null, score: [0, 0, 0], tickT: 0, stT: 0, lastT: 0, anim: null, opt: -1, spK: 0,
async mount(root, ctx) {
 this.ctx = ctx; this.root = root;
 if (!ctx.atlas?.on) return;
 document.head.appendChild(el('style')).textContent = CSS;
 let D; try { D = await ctx.data('arrivals'); } catch (e) {}
 if (!D?.arm_bundled) return root.parentElement.querySelector('.wall')?.appendChild(el('p', 'say dim', 'the arrivals did not load this time.'));
 const n = this.n = D.n, cs = D.arm_codes, A = D.idx_alpha, fc = D.fam_codes, U8 = () => new Uint8Array(n), U16 = () => new Uint16Array(n);
 this.D = D; this.FAMS = D.fam_order; this.PBV = D.pb_edges;
 const pool = this.pool = U8(), strict = this.strict = U8(), fam = this.fam = U8(), pb = this.pb = U8();
 const aIdx = this.aIdx = U16(), inv = this.inv = U16(), rank = this.rank = U16(), cnt = [0, 0, 0], cum = this.cum = new Uint16Array((n + 1) * 3);
 for (let k = 0; k < n; k++) {
  const p = Math.min(2, cs.indexOf(D.arm_bundled[k]));
  pool[k] = p; strict[k] = cs.indexOf(D.arm_strict[k]); fam[k] = Math.max(0, fc.indexOf(D.fam[k])); pb[k] = +D.pb[k] || 0;
  const j = A.indexOf(D.idx[2 * k]) * 91 + A.indexOf(D.idx[2 * k + 1]); aIdx[k] = j; inv[j] = k;
  rank[k] = cnt[p]++; cum.set(cnt, (k + 1) * 3);
}
 const F = D.folded?.bundled || {};
 this.tot = [F.hand, F.shuffle, F.queue];
 this.lists = cnt.map((c) => new Uint16Array(c));
 for (let k = 0; k < n; k++) this.lists[pool[k]][rank[k]] = k;
 this.ax = new Float32Array(n); this.ay = new Float32Array(n); this.x0 = new Float32Array(n);
 this.sp = new Float32Array(NS * 4);
 this.buildUI(root);
 this.ready = true;
},
buildUI(root) {
 const hud = this.hud = root.appendChild(el('div', 'ar-hud')), row = () => hud.appendChild(el('div', 'ar-row'));
 this.line = hud.appendChild(el('p', 'ar-line'));
 const btn = (r, txt, f, aria) => { const b = r.appendChild(el('button', '', txt)); b.type = 'button'; if (aria) at(b, 'aria-label', aria); b.addEventListener('click', () => { this.halt(); f(); }); return b; };
 const r1 = row(), r2 = row();
 this.bPlay = btn(r1, '❚❚', () => this.toggle(), 'pause the rain');
 const sc = this.sc = at(r1.appendChild(el('input', 'ar-sc')), 'type', 'range');
 sc.min = 0; sc.max = this.n; sc.step = 1; sc.value = 0; at(sc, 'aria-label', 'scrub the rain');
 sc.addEventListener('input', () => { this.halt(); this.scrub(+sc.value); });
 this.bA = [0, 1, 2].map((a) => { const b = btn(r1, (a + 1) + ' ' + ['my hand', 'shuffle', 'queue'][a], () => this.answer(a)); b.className = 'ar-a'; b.hidden = true; return b; });
 this.bGuess = at(btn(r1, 'guess', () => this.setGuess(!this.guess, true), 'guess: who played it first?'), 'aria-pressed', 'false');
 const q = this.q = r2.appendChild(el('input', 'ar-q')); q.id = 'ar-q'; q.type = 'text'; q.placeholder = 'type an artist'; q.autocomplete = 'off'; q.spellcheck = false;
 at(at(at(at(at(q, 'aria-label', 'type an artist'), 'role', 'combobox'), 'aria-autocomplete', 'list'), 'aria-expanded', 'false'), 'aria-controls', 'ar-ls');
 const ls = this.ls = at(at(r2.appendChild(el('ul', 'ar-ls')), 'role', 'listbox'), 'aria-label', 'artists'); ls.id = 'ar-ls'; ls.hidden = true;
 q.addEventListener('focus', () => { this.halt(); this.loadNames(); });
 q.addEventListener('input', () => this.suggest());
 q.addEventListener('keydown', (e) => this.qKey(e));
 q.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== q) this.closeList(); }, 160));
 ls.addEventListener('pointerdown', (e) => { const li = e.target.closest('li[data-j]'); if (li) { e.preventDefault(); this.choose(+li.dataset.j); } });
 this.bDeal = btn(r2, 'deal', () => this.deal(), 'deal one of my most-played artists'); this.bDeal.hidden = true;
 this.pt = hud.appendChild(el('div', 'ar-pt'));
 this.idle();
},
idle() { this.pt.textContent = ''; this.pt.appendChild(el('p', 'ar-hint', (this.ctx.coarse ? 'hold' : 'hover') + ' a glyph to hear it; ' + (this.ctx.coarse ? 'tap' : 'click') + ' to name it.' + (this.guess ? '' : ' guess turns it into a game: who played it first?'))); },
layout(ctx) {
 const s = this.st = ctx.stage(), side = s.h < 340 && s.w > s.h * 1.25, cmp = side || s.w < 460 || s.h < 470;
 const hw = side ? Math.min(280, s.w * 0.5) : Math.min(s.w, 620), h = this.hud.style;
 this.hud.className = 'ar-hud' + (cmp ? ' cmp' : '') + (side ? ' side' : ''); h.maxHeight = side ? s.h - 40 + 'px' : '';
 h.width = hw + 'px'; h.left = (s.x + s.w - hw - (side ? 0 : (s.w - hw) / 2)) + 'px'; h.top = (s.y + s.h) + 'px';
 const hh = side ? 0 : this.hud.offsetHeight + 10, a = this.area = { x: s.x, y: s.y, w: s.w - (side ? hw + 10 : 0), h: Math.max(120, s.h - hh) };
 const yB = this.yB = a.y + a.h - (cmp ? 30 : 36), top = a.y + a.h * (cmp ? 0.22 : 0.2);
 this.cloud = [a.y + 2, Math.max(30, a.h * 0.17)];
 const g = Math.max(10, a.w * 0.045), cw = this.cw = Math.min((a.w - g * 4) / 3, 300), x0 = a.x + (a.w - cw * 3 - g * 2) / 2, M = Math.max(...this.tot);
 const cols = this.cols = Math.max(4, Math.ceil(Math.sqrt(cw * M / Math.max(40, yB - top)))), c = this.c = cw / cols;
 this.px = [0, 1, 2].map((p) => x0 + p * (cw + g));
 this.ptop = this.tot.map((t) => yB - Math.ceil(t / cols) * c);
 for (let k = 0; k < this.n; k++) {
  const r = this.rank[k], rw = (r / cols) | 0; let col = r - rw * cols; if (rw & 1) col = cols - 1 - col;
  this.ax[k] = this.px[this.pool[k]] + (col + 0.5) * c; this.ay[k] = yB - (rw + 0.5) * c;
  this.x0[k] = a.x + a.w * (0.04 + 0.92 * ctx.hash(k * 7 + 3));
}
 this.placeAll(ctx);
},
/* dot i -> arrival floor(i n / N): in the cloud until it lands */
placeAll(ctx) {
 const P = ctx.particles, N = P.n, n = this.n, h = ctx.hash, c = this.c, a = this.area, cl = this.cloud, L = this.L;
 const fog = ctx.PAL.fog, col = [ctx.PAL.tap, ctx.PAL.shuffle, ctx.PAL.served];
 if (!this.dk || this.dk.length !== N) { this.dk = new Uint16Array(N); for (let i = 0; i < N; i++) this.dk[i] = Math.floor(i * n / N); this.colA = col.map(abgr); this.fogA = abgr(fog); }
 const dk = this.dk, pb = this.pb, pool = this.pool, F = () => new Float32Array(N), cx = this.cx = F(), cy = this.cy = F(), dx = this.dx = F(), dy = this.dy = F();
 for (let i = 0; i < N; i++) {
  const k = dk[i], s = c * (0.7 + pb[k] * 0.06);
  cx[i] = a.x + a.w * h(i * 3 + 1); cy[i] = cl[0] + cl[1] * Math.pow(h(i * 11 + 5), 1.6);
  dx[i] = this.ax[k] + (h(i * 5 + 2) - 0.5) * s; dy[i] = this.ay[k] + (h(i * 13 + 7) - 0.5) * s;
}
 P.targetPx((i) => (dk[i] < L ? [dx[i], dy[i]] : [cx[i], cy[i]]));
 P.color((i) => (dk[i] < L ? col[pool[dk[i]]] : fog));
 for (let i = 0; i < N; i++) P.w[i] = dk[i] < L ? 60 + pb[dk[i]] * 21 : CLOUD_W;
 this.dFirst = (k) => Math.ceil(k * N / n);
},
/* direct writes: no dot eases across the stage */
land(a, b, on) {
 const P = this.ctx.particles, dk = this.dk;
 for (let i = this.dFirst(a), i1 = this.dFirst(b); i < i1; i++) {
  const k = dk[i];
  if (on) { P.x[i] = P.tx[i] = this.dx[i]; P.y[i] = P.ty[i] = this.dy[i]; P.c[i] = P.tc[i] = this.colA[this.pool[k]]; P.w[i] = 60 + this.pb[k] * 21; }
  else { P.tx[i] = this.cx[i]; P.ty[i] = this.cy[i]; P.c[i] = P.tc[i] = this.fogA; P.w[i] = CLOUD_W; }
}
},
setL(L) {
 L = clamp(L | 0, 0, this.n);
 if (L !== this.L) this.land(Math.min(L, this.L), Math.max(L, this.L), L > this.L);
 this.L = L;
},
offKeys() { if (this.keysOff) this.keysOff.forEach(tryf); this.keysOff = null; },
finish() { if (this.L < this.n) { this.setL(this.n); this.cur = this.n + this.fly(); this.run = false; this.done = true; this.sync(); } },
enter(ctx) {
 const P = ctx.particles;
 P.ease = 0.08; P.jitter = 0.2; P.big = false; P.touch = false;
 if (!this.ready) { P.scatter(); P.color(() => 0x57507a); return; }
 const re = this.keysOff && ctx.atlas.reenter; this.offKeys(); this.anim = null; this.hov = -1;
 if (!re) { this.L = this.cur = 0; this.done = false; }
 this.layout(ctx);
 const s = this.st;
 tryf(() => ctx.view.configure({ mode: 'pan', zMin: 1, zMax: 4, bounds: { x: s.x, y: s.y, w: s.w, h: s.h }, drift: false }));
 P.glyphAll(true); P.glyphMode('cont', { colour: 'sample', edges: false });
 ctx.ladder.level('artist');
 /* capture: a ' ' ctx.keys handler registered later (the tour's) is asked first */
 const sp = (e) => { if (e.key === ' ' && !e.defaultPrevented && this.key(e) !== false) e.preventDefault(); };
 document.addEventListener('keydown', sp, true);
 this.keysOff = ['1', '2', '3', 'd'].map((k) => ctx.keys.on(k, (e) => this.key(e))).concat(() => document.removeEventListener('keydown', sp, true));
/* a resize re-enters: keep the rain and the guess */
 if (re) { this.sel = -1; this.pq >= 0 ? this.setLabel(this.pq, this.skyPos()) : tryf(() => ctx.labels.clear('arrivals')); return this.sync(true); }
 this.setGuess(false);
 if (ctx.reduced) { this.setL(this.n); this.cur = this.n; this.done = true; this.run = false; } else this.play(0);
 this.sync(true); this.status();
},
play(from) {
 if (from != null) { this.setL(from); this.cur = from; this.done = false; }
 if (this.cur >= this.n + this.fly()) { this.setL(0); this.cur = 0; this.done = false; }
 this.run = !this.ctx.reduced; this.lastT = 0; this.sync();
},
fly() { return FLY_S * this.n / RAIN_S; },
toggle() { if (this.run) { this.run = false; this.sync(); } else this.play(); },
scrub(v) {
 this.run = false; v = clamp(v, 0, this.n);
 this.cur = this.ctx.reduced ? v : Math.min(this.n + this.fly(), v + this.fly() / 2); this.setL(v); this.done = v >= this.n;
 this.sync(); this.status();
},
sync(force) {
 const p = this.run, b = this.bPlay;
 b.hidden = !!this.ctx.reduced || this.guess; b.textContent = p ? '❚❚' : '▶'; at(b, 'aria-label', (p ? 'pause' : 'play') + ' the rain');
 if (force || +this.sc.value !== this.L) { this.sc.value = this.L; at(this.sc, 'aria-valuetext', this.landedText()); }
},
landedText() { const c = this.counts(); return this.of() + ' arrived: my hand ' + fmt(c[0]) + ', shuffle ' + fmt(c[1]) + ', the queue ' + fmt(c[2]); },
of() { return fmt(this.L) + ' of ' + fmt(this.n); },
counts() { const o = this.L * 3, C = this.cum; return [C[o], C[o + 1], C[o + 2]]; },
status(msg, speak) {
 const ln = this.line, add = (t, tag) => ln.appendChild(tag ? el(tag, '', t) : document.createTextNode(t));
 ln.textContent = '';
 if (msg) { msg.forEach((m) => add(m[0], m[1])); if (speak) this.say(msg.map((m) => (m[1] === 'small' ? ' ' : '') + m[0]).join('')); return; }
 const c = this.counts();
 if (this.L >= this.n) { add(fmt(this.n) + ' artists. '); add('my hand ' + fmt(c[0]) + ' · shuffle ' + fmt(c[1]) + ' · the queue ' + fmt(c[2]), 'b'); add('. type one of yours.'); }
 else { add('they fall in the order of their first full play in my log: '); add(this.of(), 'b'); add(' have landed.'); }
 this.ctx.hud((innerWidth < 500 ? '\u00a0'.repeat(7) : 'first meetings · ') + this.of() + ' landed');
},
armText(k) {
 if (this.strict[k] !== 3) return ARM[this.pool[k]];
 return this.pool[k] ? 'an app restart or error, counted with the queue' : 'my hand (a skip forward or back landed on it)';
},
nameOf(k) { const j = this.aIdx[k]; return this.names ? this.names[j] : this.nodes && j < this.nodes.length ? this.nodes[j].name : null; },
nm(k) { return this.nameOf(k) || 'arrival ' + fmt(k + 1); },
voice(k) { return { fam: this.FAMS[this.fam[k]], plays: this.PBV[this.pb[k]], artist: this.nameOf(k) || undefined }; },
hoverVoice(id) { const m = /^ar(\d+)$/.exec(id), k = m ? +m[1] : this._pk && this._pk.label === id ? this._pk.k : -1; return k >= 0 && k < this.n ? this.voice(k) : null; },
tick(k, o) { const v = this.voice(k); tryf(() => this.ctx.audio.tick('ar' + k, Object.assign({ fam: v.fam, plays: v.plays }, o))); },
loadNames() {
 if (this.namesP) return this.namesP;
 this.status([['loading every artist…']]);
 return (this.namesP = this.ctx.data('universe_artists_all').then((d) => {
  if (d?.name?.length !== this.n) throw 0;
  this.names = d.name; this.lower = d.name.map((s) => String(s).toLowerCase());
  if (this.pq < 0 && this.sel < 0) this.status();
  if (this.q.value) this.suggest();
  return true;
 }).catch(() => { this.namesP = null; this.status([['the names did not load.']]); return false; }));
},
loadNodes() { return this.nodesP || (this.nodesP = this.ctx.data('universe_nodes').then((d) => (this.nodes = d.nodes)).catch(() => (this.nodesP = null))); },
suggest() {
 const v = this.q.value.trim().toLowerCase(), ls = this.ls, L = this.lower, pre = [], sub = []; ls.textContent = ''; this.opt = -1;
 if (!v || !L) return this.closeList();
 for (let j = 0; j < L.length && pre.length < 6; j++) { const i = L[j].indexOf(v); if (!i) pre.push(j); else if (i > 0 && sub.length < 6) sub.push(j); }
 const hits = pre.concat(sub).slice(0, 6);
 hits.forEach((j, q) => { const li = at(at(ls.appendChild(el('li', '', this.names[j])), 'role', 'option'), 'aria-selected', 'false'); li.id = 'ar-o' + q; li.dataset.j = j; });
 if (!hits.length) at(ls.appendChild(el('li', '', 'not in my log under that name')), 'role', 'option');
 ls.hidden = false; at(this.q, 'aria-expanded', 'true');
},
closeList() { this.ls.hidden = true; at(this.q, 'aria-expanded', 'false').removeAttribute('aria-activedescendant'); this.opt = -1; },
qKey(e) {
 const os = [...this.ls.querySelectorAll('li[data-j]')], n = os.length, k = e.key;
 const dn = k === 'ArrowDown';
 if (dn || k === 'ArrowUp') {
  if (!n) return; e.preventDefault();
  this.opt = this.opt < 0 ? (dn ? 0 : n - 1) : (this.opt + (dn ? 1 : n - 1)) % n;
  os.forEach((o, q) => at(o, 'aria-selected', String(q === this.opt))); at(this.q, 'aria-activedescendant', os[this.opt].id);
 } else if (k === 'Enter') { e.preventDefault(); const o = os[Math.max(0, this.opt)]; if (o) this.choose(+o.dataset.j); }
 else if (k === 'Escape' && !this.ls.hidden) { e.preventDefault(); e.stopPropagation(); this.closeList(); }
},
choose(j) {
 if (!(j >= 0 && j < this.n)) return;
 this.closeList(); if (this.names) this.q.value = this.names[j];
 const k = this.inv[j]; this.guess ? this.ask(k) : this.lift(k);
},
lift(k) {
 this.finish(); this.sel = k; this.pq = -1;
 const nm = this.nm(k), to = this.liftPos(k);
 this.go(k, [this.ax[k], this.ay[k]], to, 600);
 this.status([[nm, 'b'], [': arrival ' + fmt(k + 1) + ' of ' + fmt(this.n) + '. first full play in my log: '], [this.armText(k), 'b'], ['.'], ['a full play = 30 seconds or more.', 'small']], 1);
 this.tick(k, { kind: 'glyph', force: true });
 this.setLabel(k, to); this.hear(k);
},
go(k, f, to, d, burst) { this.anim = { k, f, to, t0: performance.now(), d: this.ctx.reduced ? 0 : d, burst }; },
liftPos(k) { const p = this.pool[k]; return [this.px[p] + this.cw / 2, Math.max(this.area.y + 30, this.ptop[p] - 34)]; },
skyPos() { return [this.area.x + this.area.w / 2, this.cloud[0] + this.cloud[1] + 26]; },
setLabel(k, p) {
 const v = this.voice(k);
 tryf(() => (v.artist ? this.ctx.labels.set('arrivals', [Object.assign({ id: 'ar' + k, text: v.artist, x: p[0], y: p[1], r: 10, kind: 'obj', pri: 9999, go: () => this.hear(k) }, v)]) : this.ctx.labels.clear('arrivals')));
},
hear(k) { const nm = this.nameOf(k), pt = this.pt; pt.textContent = ''; if (!nm) return this.idle(); tryf(() => this.ctx.post(pt, nm, { label: 'hear', noteHost: pt })); },
say(t) { this.ctx.say(t); },
setGuess(on, user) {
 if (!this.ready) return;
 const g = this.guess = !!on; at(this.bGuess, 'aria-pressed', String(g)); this.bA.forEach((b) => { b.hidden = !g; }); this.bDeal.hidden = !g; this.sc.hidden = g; this.sync();
 if (user) tryf(() => this.ctx.angle.set(g ? 'guess' : 'rain', { via: 'room' }));
 this.pq = -1; this.answerBtns(false);
 if (g) {
  this.finish(); this.sel = -1; this.anim = null; this.ctx.labels.clear('arrivals'); this.idle();
  this.status([['who played it first? press '], ['deal', 'b'], [' for one of my most-played artists, or type one of yours.']]);
 } else if (user) this.status();
},
setAngle(k) { this.setGuess(k === 1); return 0; },
answerBtns(on) { this.bA.forEach((b) => { b.disabled = !on; b.classList.remove('ar-ok', 'ar-no'); }); },
async deal() {
 if (!(await this.loadNodes()) || !this.guess) return;
 this.q.value = '';
 for (let t = 0; t < 40; t++) { const c = this.inv[(Math.random() * this.nodes.length) | 0]; if (this.strict[c] !== 3 && c !== this.pq && c !== this.sel) return this.ask(c); }
},
ask(k) {
 if (!this.guess) return this.lift(k);
 const nm = this.nm(k); this.sel = -1; this.anim = null; this.pq = -1; this.answerBtns(false);
 if (this.strict[k] === 3) return this.status([[nm, 'b'], [' first arrived by a skip press or an app restart, so it is not asked here. press '], ['deal', 'b'], [' for another.']]);
 this.pq = k; this.answerBtns(true);
 this.setLabel(k, this.skyPos()); this.hear(k);
 this.status([[nm, 'b'], [': who played it first? press 1 my hand, 2 shuffle or 3 the queue.'], ['a first full play: 30 seconds or more.', 'small']], 1);
 this.tick(k, { kind: 'label', force: true });
},
answer(a) {
 const k = this.pq; if (k < 0) return;
 const s = this.strict[k], right = s === a, A = this.ctx.audio, S = this.score, nm = this.nm(k), to = this.liftPos(k);
 this.pq = -1; S[1]++; if (right) { S[0]++; S[2]++; } else S[2] = 0;
 this.answerBtns(false); this.bA[a].classList.add(right ? 'ar-ok' : 'ar-no'); this.bA[s].classList.add('ar-ok');
 this.sel = k; this.go(k, this.skyPos(), to, 700, right);
 this.setLabel(k, to);
 const b = A.beat?.(4), t = b ? b.next - b.now : 0, tri = (st, d, o) => A.note(st, { at: t + d, dur: o, vol: 0.045, type: 'triangle' });
 if (right) { A.note(0, { at: t, dur: 0.7, vol: 0.05, type: 'sine' }); tri(0, 0, 0.7); tryf(() => this.ctx.buzz(14)); } else { tri(5, 0, 0.32); tri(3, 0.26, 0.6); }
 const tail = 'right ' + S[0] + ' of ' + S[1] + (S[2] > 1 ? ' · streak ' + S[2] : ''), said = right ? 'right. ' : 'you said ' + ARM[a] + '. ';
 this.status([[nm, 'b'], [': first full play in my log: '], [ARM[s], 'b'], ['. ' + said], [tail + ' · d deals another.', 'small']], 1);
},
key(e) {
 if (!this.ready || !this.active()) return false;
 const t = e.target, k = e.key;
 if (k === ' ') { if (t.closest?.('button,a,[role=button],input') || this.ctx.tour?.isPlaying?.()) return false; this.halt(); this.toggle(); return; }
 if (!this.guess) return false;
 if (k === 'd') return void this.deal();
 if (this.pq < 0) return false;
 this.answer(+k - 1);
},
active() { return !!this.root.parentElement?.classList.contains('is-active'); },
hit(wx, wy) {
 for (let p = 0; p < 3; p++) {
  const x0 = this.px[p]; if (wx < x0 || wx > x0 + this.cw) continue;
  const row = Math.floor((this.yB - wy) / this.c); let col = Math.floor((wx - x0) / this.c);
  if (row < 0 || col < 0 || col >= this.cols) return -1;
  if (row & 1) col = this.cols - 1 - col;
  const k = this.lists[p][row * this.cols + col]; return k != null && k < this.L && k !== this.pq ? k : -1;
}
 return -1;
},
hoverAt(p, ctx, touch) {
 const k = this.ready ? this.hit(p.wx, p.wy) : -1, P = ctx.post;
 if (k < 0) { this.hov = -1; ctx.audio.tick(null); P.undwell?.(touch ? { keep: true } : undefined); return; }
 const q = ctx.view.apply(this.ax[k], this.ay[k]);
 this.hov = k; this.tick(k, { x: q[0], y: q[1], force: touch });
 const nm = this.nameOf(k); if (nm && this.pq < 0) P.dwell?.(nm, { x: q[0] + 12, y: q[1] + 12, touch });
},
pick(wx, wy) {
 const k = this.ready ? this.hit(wx, wy) : -1; if (k < 0) return null;
 const nm = this.nameOf(k), label = this.nm(k); this._pk = { label, k };
 return { label, wx: this.ax[k], wy: this.ay[k], focus: nm ? { artist: nm } : null };
},
async tapAt(p, ctx) {
 this.halt();
 const k = this.ready ? this.hit(p.wx, p.wy) : -1; if (k < 0) return;
 if (this.pq >= 0) return tryf(() => ctx.toast('pick my hand, shuffle or the queue first', 2200));
 await this.loadNames(); if (this.active()) this.lift(k);
},
gestures(ctx) {
 let acc = 0;
 const un = (o) => ctx.post.undwell?.(o);
 return {
  tap: (p) => this.tapAt(p, ctx),
  hover: (p) => this.hoverAt(p, ctx),
  leave: () => { this.hov = -1; ctx.audio.tick(null); un(); },
  cursor: (p) => (this.ready && this.hit(p.wx, p.wy) >= 0 ? 'pointer' : 'ew-resize'),
  drag: { start: () => { acc = 0; this.halt(); }, move: (p, dx, dy) => {
   if ((ctx.view.z || 1) > 1.02) return ctx.view.pan(dx, dy);
   acc += dx * this.n / Math.max(120, this.area.w); const s = acc | 0; if (s) { acc -= s; this.scrub(this.L + s); }
  }, end() {} },
  hold: { delay: 160, press: (p) => { if (p.type !== 'mouse') this.hoverAt(p, ctx, true); }, start() {}, move() {}, end: () => un({ keep: true }) },
 };
},
async focus(d) {
 if (!this.ready || !d || d.artist == null || !(await this.loadNames())) return false;
 const j = this.lower.indexOf(String(d.artist).toLowerCase()); if (j < 0) return false;
 this.choose(j); return true;
},
keepout() { const r = this.hud?.getBoundingClientRect(); return r?.width ? [{ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 }] : []; },
splash(x, y, t, s) { const o = this.spK * 4, S = this.sp; S[o] = x; S[o + 1] = y; S[o + 2] = t; S[o + 3] = s; this.spK = (this.spK + 1) % NS; },
frame(g, t, bands, w, h, ctx) {
 if (!this.ready || !this.area) return;
 const dt = this.lastT ? Math.min(0.1, (t - this.lastT) / 1000) : 0; this.lastT = t;
 const n = this.n, F = this.fly(), lw = 1 / (ctx.view.z || 1), PC = ctx.PROV_CHIP, quiet = this.sel < 0 && this.pq < 0;
 if (this.run) {
  this.cur += dt * this.speed * n / RAIN_S;
  const L = clamp(Math.floor(this.cur - F), 0, n);
  if (L > this.L) {
   const k = L - 1; this.setL(L);
   if (t - this.tickT >= TICK_MS) { this.tickT = t; this.tick(k, { x: ctx.view.apply(this.ax[k], 0)[0], vol: 0.016 }); this.splash(this.ax[k], this.ay[k], t, 1); }
   if (t - this.stT > 250) { this.stT = t; this.sync(); if (quiet) this.status(); }
  }
  if (this.cur >= n + F) { this.run = false; this.done = true; this.setL(n); this.sync(); if (quiet) this.status(); this.chord(); }
}
 g.globalAlpha = 1;
 if (!ctx.reduced) {
  const k1 = Math.min(n, Math.floor(this.cur) + 1), pb = this.pb, pool = this.pool, ax = this.ax, ay = this.ay, x0 = this.x0, top = this.cloud[0] + this.cloud[1] * 0.6;
  for (let p = 0; p < 3; p++) {
   g.fillStyle = rgba(PC[p], 0.95); g.beginPath();
   for (let k = this.L; k < k1; k++) {
    const u = (this.cur - k) / F; if (pool[k] !== p || u < 0 || u > 1) continue;
    const e = u * u * (3 - 2 * u), x = x0[k] + (ax[k] - x0[k]) * e, y = top + (ay[k] - top) * u * u, r = (1 + pb[k] * 0.22) * lw;
    g.rect(x - r, y - r * 1.6, r * 2, r * 3.2);
   }
   g.fill();
  }
}
 const S = this.sp; g.lineWidth = lw;
 for (let s = 0; s < NS; s++) { const o = s * 4, a = (t - S[o + 2]) / (420 * S[o + 3]); if (a >= 0 && a < 1) { g.strokeStyle = rgba(ICE, 0.5 * (1 - a)); ring(g, S[o], S[o + 1], (2 + a * 12) * S[o + 3] * lw); } }
 if (this.cL !== this.L) { this.cL = this.L; this.cS = this.counts().map(fmt); }
 const cmp = this.area.w < 420, yB = this.yB;
 g.textAlign = 'center'; g.textBaseline = 'alphabetic';
 for (let p = 0; p < 3; p++) {
  const x = this.px[p] + this.cw / 2;
  g.fillStyle = 'rgba(164,155,189,.95)'; g.font = '500 ' + (cmp ? 9.5 : 10.5) + MF; g.fillText(ARM[p].toUpperCase(), x, yB + 21);
  g.fillStyle = rgba(PC[p], 1); g.font = '600 ' + (cmp ? 13 : 15) + MF; g.fillText(this.cS[p], x, yB + (cmp ? 35 : 39));
  g.strokeStyle = rgba(PC[p], 0.28); g.beginPath(); g.moveTo(this.px[p], yB + 1.5); g.lineTo(this.px[p] + this.cw, yB + 1.5); g.stroke();
}
 const hv = this.hov;
 if (hv >= 0 && hv < this.L) { g.strokeStyle = rgba(ICE, 0.95); g.lineWidth = 1.2 * lw; ring(g, this.ax[hv], this.ay[hv], Math.max(this.c * 0.9, 4 * lw)); }
/* nothing about the asked arrival's pool is drawn before the answer */
 if (this.pq >= 0) {
  const s = this.skyPos();
  g.fillStyle = '#fff'; ring(g, s[0], s[1], 3 * lw, 1);
  g.strokeStyle = rgba(ICE, 0.9); g.lineWidth = 1.4 * lw; ring(g, s[0], s[1], (9 + (ctx.reduced ? 0 : Math.sin(t * 0.005) * 2) + bands.low * 4) * lw);
}
 const A = this.anim;
 if (A && this.sel >= 0) {
  const u = A.d ? clamp((t - A.t0) / A.d, 0, 1) : 1, e = 1 - Math.pow(1 - u, 3), x = A.f[0] + (A.to[0] - A.f[0]) * e, y = A.f[1] + (A.to[1] - A.f[1]) * e, k = A.k;
  g.lineWidth = lw; g.strokeStyle = rgba(ICE, 0.55); g.beginPath(); g.moveTo(this.ax[k], this.ay[k]); g.lineTo(x, y); g.stroke();
  g.strokeStyle = rgba(ICE, 0.95); ring(g, this.ax[k], this.ay[k], 3.2 * lw);
  g.fillStyle = rgba(PC[this.pool[k]], 1); ring(g, x, y, 3.6 * lw, 1);
  g.lineWidth = 1.6 * lw; ring(g, x, y, (9 + bands.low * 3) * lw);
  if (u >= 1 && A.burst && !ctx.reduced) { A.burst = false; for (let q = 0; q < 3; q++) this.splash(x, y, t + q * 140, 2.4); }
}
},
chord() {
 const A = this.ctx.audio, b = A.beat?.(2), st = b ? b.len : 0.22, t = b ? b.next - b.now : 0.05;
 [0, 3, 5].forEach((s, q) => A.note(s, { at: t + q * st, dur: 1.4 - q * 0.2, vol: 0.045, type: 'triangle' }));
 this.say(this.landedText() + '.');
},
leave(ctx) {
 this.halt(); this.run = false; this.hov = this.pq = this.sel = -1; this.anim = null; this.closeList();
 this.offKeys();
 tryf(() => { ctx.stopPosts(); ctx.audio.tick(null); ctx.ladder.level(null); });
},
demo(ctx) {
 if (!this.ready) return;
 this.halt(); const T = this._demoT = [], later = (ms, f) => T.push(setTimeout(() => { if (this.active()) f(); }, ms));
 this.setGuess(false); this.sel = -1; this.anim = null; this.q.value = ''; this.speed = 4; if (!ctx.reduced) this.play(0);
 const k = this.D.demo, ms = ctx.reduced ? 400 : ((RAIN_S + FLY_S) / 4) * 1000 + 600;
 this.loadNodes().then(() => {
  const nm = this.nameOf(k); if (!nm || this._demoT !== T) return;
  for (let i = 1; i <= nm.length; i++) later(ms + i * 110, () => { this.q.value = nm.slice(0, i); });
  later(ms + nm.length * 110 + 500, () => { this.speed = 1; this.lift(k); });
 });
},
halt() { if (this._demoT) { this._demoT.forEach(clearTimeout); this._demoT = null; } this.speed = 1; },
};
