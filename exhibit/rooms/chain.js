/* N2 · the chain: universe_nodes + universe_edges only (no universe.js). link floors: TF hand / QF queue jumps, both
	directions summed, counts never rates. the visitor makes the order: no real sequence replays. */
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (n) => Number(n).toLocaleString('en-US');
const rgbs = (h, a) => 'rgba(' + ((h >> 16) & 255) + ',' + ((h >> 8) & 255) + ',' + (h & 255) + ',' + a + ')';
const ring = (g, x, y, r, fill) => { g.beginPath(); g.arc(x, y, r, 0, 6.283); fill ? g.fill() : g.stroke(); };
const tryf = (f) => { try { return f(); } catch (e) {} };
const FAMS = ['ambient/lofi', 'classical', 'electronic', 'experimental', 'folk/country', 'funk/disco', 'hip-hop · r&b', 'jazz', 'other', 'pop', 'rock/metal', 'soundtrack', 'world/desi', 'untagged'];
const PENT = ['D', 'F', 'G', 'A', 'C'];
const WB = [0, 1, 1.7, 2.8, 4.6, 7.5]; /* dots per plays quintile: an order, not a size */
const DUST = 0.32, HOP_MS = 520, MAXHOP = 60, TF = 3, QF = 17, ICE = 0x86cbfe;
const ANGLES = [{ id: 'all', name: 'every link' }, { id: 'hand', name: 'hand only' }];

const CSS = `@ .ch-hud{position:absolute;transform:translateY(-100%);box-sizing:border-box;padding:8px 10px;background:rgba(10,1,24,.8);border:1px solid rgba(134,203,254,.24);border-radius:12px;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
@ .ch-line{font:400 12px/1.45 var(--mono);color:var(--ink);margin:0 2px 4px;min-height:2.9em}
@ .ch-line b{font-weight:600;color:var(--ice)}
@ .ch-h{color:#21f6bc}
@ .ch-q{color:#8b6fd6}
@ .ch-path{font:400 10.5px/1.4 var(--mono);color:var(--mute);margin:0 2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl;text-align:left}
@ .ch-path:empty,@ .ch-out[hidden],@ .ch-hud.cmp .ch-path{display:none}
@ .ch-row{display:flex;flex-wrap:wrap;gap:5px}
@ .ch-row button{font:600 10.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mute);background:rgba(134,203,254,.06);border:1px solid rgba(134,203,254,.26);border-radius:999px;padding:0 11px;min-height:44px;min-width:44px;cursor:pointer;white-space:nowrap}
@ .ch-row button:hover{color:var(--ink);border-color:var(--ice)}
@ .ch-row button[aria-pressed="true"]{color:var(--ink);background:rgba(134,203,254,.18);box-shadow:inset 0 0 0 1px var(--ice)}
@ .ch-row button:disabled{opacity:.38;cursor:default}
@ .ch-row button:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
@ .ch-hud.kb{outline:2px solid var(--ice);outline-offset:2px}
@ .ch-row .ch-go{color:var(--ice);border-color:rgba(134,203,254,.6)}
@ .ch-lb{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@ .ch-kb{display:none;font:400 10.5px/1.3 var(--mono);color:var(--ice);margin:0 2px 6px}
@ .ch-hud.kb .ch-kb,@ .ch-out{display:block}
@ .ch-out{width:100%;box-sizing:border-box;margin:0 0 6px;font:400 11px/1.4 var(--mono);color:var(--ink);background:rgba(10,1,24,.9);border:1px solid rgba(134,203,254,.3);border-radius:6px;padding:6px}
@ .ch-hud.cmp .ch-line{font-size:11px;line-height:1.38;margin-bottom:3px}
@ .ch-hud.cmp .ch-row{gap:4px;flex-wrap:nowrap}
@ .ch-hud.sd .ch-row{flex-wrap:wrap}
@ .ch-hud.cmp .ch-row button{padding:0 9px;letter-spacing:.03em}
@media (max-height:480px) and (min-aspect-ratio:115/100){@ .ch-line{min-height:0;margin-bottom:3px}}
@media (forced-colors:active){@ .ch-hud{border:1px solid CanvasText}@ .ch-row button[aria-pressed="true"]{forced-color-adjust:none;background:Highlight;color:HighlightText}}`.replace(/@ /g, 'html.atlas section[data-room="chain"] ');

export default {
	id: 'chain', track: 'save-her', glyph: { edges: false }, angles: ANGLES,
	ready: false, chain: [], hand: false, sel: 0, hov: -1, cands: [], hopT: -1e9, riffT: -1, riffStep: 200, ended: '', urlDone: false, dirtyL: true, kb: false,

	async mount(root, ctx) {
		this.ctx = ctx; this.root = root;
		if (!ctx.atlas || !ctx.atlas.on) return;
		document.head.appendChild(el('style')).textContent = CSS;
		let N, E;
		try { [N, E] = await Promise.all([ctx.data('universe_nodes'), ctx.data('universe_edges')]); } catch (e) {}
		if (!N || !E || !N.nodes || !E.edges) { const w = root.parentElement.querySelector('.wall'); if (w) w.appendChild(el('p', 'say dim', 'the links did not load this time.')); return; }
		const nodes = N.nodes, n = this.n = nodes.length, edges = E.edges, m = this.m = edges.length, U = (f) => Uint16Array.from(edges, f);
		this.name = nodes.map((d) => d.name);
		this.fam = Uint8Array.from(nodes, (d) => clamp(d.family | 0, 0, 13));
		this.bk = Uint8Array.from(nodes, (d) => clamp(d.plays_bucket | 0, 1, 5));
		/* universe layout, middle spread (r -> sqrt r), order kept */
		const warp = (d, c) => { const dx = d.xy[0] - 0.5, dy = d.xy[1] - 0.5, r = Math.hypot(dx, dy) || 1e-6; return 0.5 + (c ? dy : dx) * 0.455 * Math.sqrt(Math.min(r, 0.5) / 0.455) / r; };
		this.ux = Float32Array.from(nodes, (d) => warp(d, 0)); this.uy = Float32Array.from(nodes, (d) => warp(d, 1));
		this.byName = new Map(nodes.map((d, i) => [String(d.name).toLowerCase(), i]));
		this.ea = U((e) => e.a); this.eb = U((e) => e.b); this.et = U((e) => e.tap_n | 0); this.eq = U((e) => e.auto_n | 0);
		this.adj = Array.from({ length: n }, () => []); this.ekey = new Map();
		for (let k = 0; k < m; k++) { const a = this.ea[k], b = this.eb[k]; this.adj[a].push(k); this.adj[b].push(k); this.ekey.set(a * 4096 + b, k); this.ekey.set(b * 4096 + a, k); }
		this.deg = Uint8Array.from(this.adj, (l) => Math.min(255, l.length));
		const top = N.top5_by_plays || [], tr = (i) => { const q = top.indexOf(i); return q < 0 ? 9 : q; };
		this.starts = [];
		for (let i = 0; i < n; i++) if (this.deg[i]) this.starts.push(i);
		this.starts.sort((a, b) => (tr(a) - tr(b)) || (this.bk[b] - this.bk[a]) || this.name[a].localeCompare(this.name[b]));
		this.px = new Float32Array(n * 2); this.segBuf = new Float32Array(MAXHOP * 14);
		this.buildUI(root);
		this.ready = true;
	},

	buildUI(root) {
		const lb = this.lb = root.appendChild(el('div', 'ch-lb')), hud = this.hud = root.appendChild(el('div', 'ch-hud')), at = (e, k, v) => { e.setAttribute(k, v); return e; };
		lb.tabIndex = 0; at(lb, 'role', 'listbox'); at(lb, 'aria-label', 'the chain: pick a star');
		this.line = at(hud.appendChild(el('p', 'ch-line')), 'aria-live', 'polite');
		at(hud.appendChild(el('p', 'ch-kb', '← → pick a link · enter hops · backspace undoes')), 'aria-hidden', 'true');
		this.path = at(hud.appendChild(el('p', 'ch-path')), 'aria-hidden', 'true');
		const o = this.out = at(hud.appendChild(el('textarea', 'ch-out')), 'aria-label', 'your chain as text, to copy'); o.readOnly = true; o.rows = 3; o.hidden = true;
		const row = hud.appendChild(el('div', 'ch-row'));
		const btn = (lab, f, c) => { const b = row.appendChild(el('button', c || '')); b.type = 'button'; if (lab) at(b, 'aria-label', lab); b.addEventListener('click', () => { this.stopDemo(); f(); }); return b; };
		this.bUndo = btn('undo the last hop', () => this.undo());
		this.bHand = btn('hand only: show only links i crossed by hand', () => this.setHand(!this.hand, true));
		this.bRiff = btn('riff: play the chain back as notes', () => this.riff());
		this.bSend = btn('send the chain to a friend', () => this.share(), 'ch-go'); this.bSend.textContent = 'send';
		this.bNew = btn(null, () => (this.chain.length ? this.reset(true) : this.surprise()));
		lb.addEventListener('focus', () => { this.kb = true; hud.classList.add('kb'); this.fillList(); this.lbMark(); });
		lb.addEventListener('blur', () => { this.kb = false; hud.classList.remove('kb'); });
		lb.addEventListener('keydown', (e) => this.key(e));
	},

	layout(ctx) {
		const s = this.st = ctx.stage(), side = s.h < 340 && s.w > s.h * 1.25, cmp = side || s.w < 420 || s.h < 470;
		const hw = side ? Math.min(260, s.w * 0.5) : s.w, gw = s.w - (side ? hw + 8 : 0), bh = Math.max(80, s.h - (side ? 0 : Math.min(s.h * 0.3, cmp ? 104 : 112)));
		const S = this.S = Math.min(gw, bh) * 0.96, ox = s.x + (gw - S) / 2, oy = s.y + (bh - S) / 2;
		for (let i = 0; i < this.n; i++) { this.px[i * 2] = ox + this.ux[i] * S; this.px[i * 2 + 1] = oy + this.uy[i] * S; }
		this.box = { x: ox, y: oy };
		const h = this.hud.style; this.hud.classList.toggle('cmp', cmp); this.hud.classList.toggle('sd', side);
		h.left = (s.x + s.w - hw) + 'px'; h.top = (s.y + s.h) + 'px'; h.width = hw + 'px';
		this.cmp = cmp; this.labels();
		this.lb.style.left = s.x + 'px'; this.lb.style.top = (s.y + s.h - 20) + 'px';
		this.dirtyL = true;
	},
	labels() {
		const c = this.cmp, L = this.chain.length;
		this.bUndo.textContent = c ? 'undo' : '↶ undo'; this.bHand.textContent = c ? 'hand' : 'hand only'; this.bRiff.textContent = c ? 'riff' : '▸ riff';
		this.bNew.textContent = L ? 'new' : 'surprise';
		this.bNew.setAttribute('aria-label', L ? 'new: clear the chain and pick a new star' : 'surprise: start from a star picked at random');
	},

	enter(ctx) {
		const P = ctx.particles, s = () => this.st;
		P.ease = 0.06; P.jitter = 0.35; P.big = false; P.touch = false;
		if (!this.ready) { P.scatter(); P.color(() => 0x57507a); return; }
		this.layout(ctx); this.lw = performance.now(); /* names after the dots land */
		tryf(() => ctx.view.configure({ mode: 'pan', zMin: 1, zMax: 5, bounds: { x: s().x - s().w * 0.2, y: s().y - s().h * 0.2, w: s().w * 1.4, h: s().h * 1.4 }, drift: true, look: (k) => this.look(k) }));
		this.placeDots(ctx);
		P.glyphAll(true); P.glyphMode('cont', { colour: 'sample', edges: false });
		this.hand = false; this.bHand.setAttribute('aria-pressed', 'false'); /* shell enters on angle 0 */
		if (!this.urlDone) { this.urlDone = true; this.fromHash(ctx); }
		this.after(ctx, 'url');
	},

	placeDots(ctx) {
		const P = ctx.particles, N = P.n, n = this.n, S = this.S, px = this.px, bx = this.box, h = ctx.hash, bk = this.bk;
		if (!this.dn || this.dn.length !== N) {
			const cdf = new Float32Array(n), dn = this.dn = new Uint16Array(N); let acc = 0;
			for (let i = 0; i < n; i++) cdf[i] = acc += WB[bk[i]];
			for (let i = 0; i < N; i++) {
				if (h(i * 3 + 1) < DUST) { dn[i] = 65535; continue; }
				const u = h(i * 7 + 3) * acc; let lo = 0, hi = n - 1;
				while (lo < hi) { const md = (lo + hi) >> 1; if (cdf[md] < u) lo = md + 1; else hi = md; }
				dn[i] = lo;
			}
		}
		const dn = this.dn, col = FAMS.map((f) => ctx.famColor(f) >>> 0), fog = ctx.PAL.fog, fam = this.fam, cx = bx.x + S / 2, cy = bx.y + S / 2;
		P.targetPx((i) => {
			const k = dn[i], d = k === 65535, r = d ? S * 0.24 * Math.sqrt(-2 * Math.log(1 - h(i * 5 + 2) * 0.995)) : Math.sqrt(h(i * 13 + 5)) * S * (0.004 + bk[k] * 0.0034), a = h(i * 17 + 9) * 6.283;
			return [(d ? cx : px[k * 2]) + Math.cos(a) * r, (d ? cy : px[k * 2 + 1]) + Math.sin(a) * r];
		});
		P.color((i) => (dn[i] === 65535 ? fog : col[fam[dn[i]]]));
	},
	weigh(ctx) {
		const P = ctx.particles, N = P.n, dn = this.dn, w = P.w, on = this.chain.length > 0, lit = new Uint8Array(this.n);
		if (!dn) return;
		if (on) { this.chain.forEach((i) => { lit[i] = 2; }); this.cands.forEach((c) => { lit[c.j] = 2; }); }
		else for (let i = 0; i < this.n; i++) lit[i] = this.deg[i] ? 2 : 1;
		for (let i = 0; i < N; i++) { const k = dn[i]; w[i] = k === 65535 ? (on ? 10 : 50) : lit[k] === 2 ? 255 : lit[k] ? 110 : 16; }
	},

	cur() { return this.chain.length ? this.chain[this.chain.length - 1] : -1; },
	ek(a, b) { return this.ekey.get(a * 4096 + b); },
	candsOf(i) {
		if (i < 0) return [];
		const out = [], x0 = this.px[i * 2], y0 = this.px[i * 2 + 1];
		for (const k of this.adj[i]) {
			const j = this.ea[k] === i ? this.eb[k] : this.ea[k];
			if ((this.hand && !this.et[k]) || this.chain.includes(j)) continue;
			out.push({ j, k, a: Math.atan2(this.px[j * 2 + 1] - y0, this.px[j * 2] - x0) });
		}
		return out.sort((p, q) => p.a - q.a); /* by angle, for ← → */
	},
	links() { const L = []; for (let k = 0; k < this.m; k++) if (!this.hand || this.et[k]) L.push(k); return L; },
	start(i, ctx, via) {
		if (!this.ready || !(i >= 0 && i < this.n)) return;
		this.chain = [i]; this.clear(); this.note(i, 0); this.after(ctx, via);
	},
	clear() { this.ended = ''; this.riffT = -1; this.hopT = -1e9; this.out.hidden = true; },
	hopTo(j, ctx, via) {
		ctx = ctx || this.ctx; const i = this.cur(), k = this.ek(i, j);
		if (i < 0) { this.start(j, ctx, via); return true; }
		if (this.chain.includes(j) || k == null || (this.hand && !this.et[k]) || this.chain.length > MAXHOP) return false;
		this.chain.push(j); this.clear(); this.hopT = performance.now();
		const b = ctx.audio.beat && ctx.audio.beat(4);
		this.note(j, b ? b.next - b.now : 0);
		tryf(() => ctx.buzz(8));
		this.after(ctx, via); this.follow(ctx, j);
		return true;
	},
	undo() {
		if (!this.chain.length) return;
		this.chain.pop(); this.clear();
		this.ctx.audio.note(-1, { dur: 0.25, vol: 0.035, type: 'triangle' });
		this.after(this.ctx, 'undo');
	},
	reset(say) { this.chain = []; this.clear(); this.after(this.ctx, say ? 'new' : null); },
	surprise() { const L = this.starts; this.start(L[(Math.random() * Math.min(L.length, 120)) | 0], this.ctx, 'surprise'); },
	setHand(on, user) {
		if (on === this.hand || !this.ready) return;
		this.hand = on; this.bHand.setAttribute('aria-pressed', String(on));
		this.ctx.audio.tick('ch:hand' + +on, { deg: on ? 3 : 0, kind: 'control' });
		const id = on ? 'hand' : 'all';
		if (user) tryf(() => { const a = this.ctx.angle.get(); if (a && a.id !== id) this.ctx.angle.set(id, { via: 'room' }); });
		this.after(this.ctx, 'hand');
	},
	setAngle(k) { const a = ANGLES[k]; if (a) this.setHand(a.id === 'hand', false); return 0; },
	after(ctx, via) {
		this.cands = this.candsOf(this.cur()); this.sel = 0;
		if (this.chain.length && !this.cands.length) this.ended = this.chain.length > 1 ? 'dead' : this.deg[this.chain[0]] ? 'nohand' : 'none';
		if (this.ended === 'dead' && via !== 'url' && via !== 'undo') ctx.audio.note(-5, { dur: 1.1, vol: 0.05 });
		this.refresh(ctx, via);
	},
	refresh(ctx, via) {
		if (!this.ready) return;
		const L = this.chain.length;
		this.weigh(ctx); this.dirtyL = true; this.status(via); this.pushLabels(ctx); if (this.kb) this.fillList();
		this.bUndo.disabled = !L; this.bRiff.disabled = this.bSend.disabled = L < 2;
		this.labels();
		tryf(() => ctx.hud(L ? 'chain · ' + (L - 1) + (L === 2 ? ' hop' : ' hops') + ' · at ' + this.name[this.cur()] : null));
	},

	status(via) {
		const L = this.chain.length, ln = this.line, nm = this.name, c = this.cur(), nc = this.cands.length;
		const add = (t, c) => ln.appendChild(c ? el(c === 'b' ? 'b' : 'span', c === 'b' ? '' : c, t) : document.createTextNode(t));
		const cnt = (v, fl) => (v ? fmt(v) + (v === 1 ? ' time' : ' times') : 'fewer than ' + fl + ' times');
		ln.textContent = ''; this.path.textContent = this.chain.map((i) => nm[i]).join(' → ');
		if (!L) { add('pick a star to start, or press '); add('surprise', 'b'); add('. its links light up; follow one.'); if (via === 'new') this.say('chain cleared. pick a star to start.'); return; }
		if (L === 1) {
			add('start: '); add(nm[c], 'b');
			add(this.ended === 'none' ? '. no link from here clears the floor. pick another star.' : this.ended === 'nohand' ? '. no hand link from here. turn off hand only, or pick another star.' : '. ' + nc + (nc === 1 ? ' link lights up' : ' links light up') + '. pick one.');
		} else {
			const a = this.chain[L - 2], k = this.ek(a, c);
			add('between '); add(nm[a], 'b'); add(' and '); add(nm[c], 'b'); add(': i made the jump ');
			add('by hand ' + cnt(this.et[k], TF), 'ch-h'); add('; '); add('the queue made it ' + cnt(this.eq[k], QF), 'ch-q'); add('. ');
			if (this.ended) add('dead end: every link from here is already in your chain. play the riff, or send it.');
		}
		if (via && via !== 'url') this.say(L === 1 ? 'start: ' + nm[c] + '. ' + (nc ? nc + ' links.' : 'no links.') : 'hop ' + (L - 1) + ': ' + nm[c] + '. ' + ln.textContent.replace(/^between .*?: /, '') + (this.ended ? '' : ' ' + nc + ' links onward.'));
	},
	say(t) { tryf(() => this.ctx.say(t)); },

	deg5(i) { const f = this.fam[i]; return f === 13 ? 0 : f % 5; },
	note(i, at) { this.ctx.audio.note(this.deg5(i) - (this.bk[i] === 5 ? 5 : 0), { at: Math.max(0, at || 0), dur: 0.55, vol: 0.06, type: 'triangle' }); },
	riffText() { return this.chain.map((i) => PENT[this.deg5(i)]).join(' '); },
	riff() {
		const L = this.chain.length, A = this.ctx.audio; if (L < 2) return;
		const b = A.beat && A.beat(2), st = b ? b.len : 0.2, at0 = b ? b.next - b.now : 0.05;
		this.chain.forEach((i, q) => this.note(i, at0 + q * st));
		this.riffStep = st * 1000; this.riffT = performance.now() + at0 * 1000;
		this.say('the riff: ' + this.riffText());
	},
	hoverVoice(id) { const i = /^n\d+$/.test(id) ? +id.slice(1) : this.byName.get(String(id).toLowerCase()); return i >= 0 && i < this.n ? this.voice(i) : null; },
	voice(i) { return { fam: FAMS[this.fam[i]], plays: this.bk[i] > 4 ? 400 : 100, artist: this.name[i] }; },

	link() { return location.origin + location.pathname + '#chain&r=' + this.chain.join('.'); },
	shareText() { return (this.chain.length - 1) + ' hops through astralcrest\'s sky: ' + this.path.textContent + '. riff: ' + this.riffText() + '. build your own:'; },
	async share() {
		if (this.chain.length < 2) return;
		const text = this.shareText(), url = this.link();
		try { if (navigator.share) { await navigator.share({ title: 'the chain · sonic manifold', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
		try { await navigator.clipboard.writeText(text + ' ' + url); this.ctx.toast('chain copied · paste it to a friend'); return; } catch (e) {}
		const o = this.out; o.hidden = false; o.value = text + ' ' + url; o.focus(); o.select();
	},
	fromHash(ctx) {
		const m = /^#chain(?:=|&(?:.*&)?r=)([\d.]+)/.exec(String((ctx.atlas && ctx.atlas.hash0) || ''));
		if (m) this.applyIds(m[1].split('.').map(Number), ctx);
	},
	applyIds(ids, ctx) {
		if (!(ids[0] >= 0 && ids[0] < this.n)) return false;
		this.chain = [ids[0]]; this.clear();
		for (let q = 1; q < ids.length && q <= MAXHOP; q++) { const b = ids[q], k = this.ek(this.cur(), b); if (k == null || this.chain.includes(b)) break; if (!this.et[k]) this.setHand(false); this.chain.push(b); }
		this.after(ctx, 'url');
		if (this.chain.length > 1) setTimeout(() => { if (this.active()) this.riff(); }, ctx.reduced ? 0 : 900);
		return true;
	},
	active() { const p = this.root.parentElement; return !!p && p.classList.contains('is-active'); },

	nodeAt(wx, wy, r) {
		const R = r / (this.ctx.view.z || 1), px = this.px; let best = -1, bd = R * R;
		for (let i = 0; i < this.n; i++) { const dx = px[i * 2] - wx, dy = px[i * 2 + 1] - wy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
		return best;
	},
	pick(wx, wy) { const i = this.ready ? this.nodeAt(wx, wy, 26) : -1; return i < 0 ? null : { label: this.name[i], wx: this.px[i * 2], wy: this.px[i * 2 + 1], focus: { artist: this.name[i] } }; },
	tapAt(p, ctx) {
		if (!this.ready) return;
		this.stopDemo();
		const i = this.nodeAt(p.wx, p.wy, 26); if (i < 0) return;
		if (!this.chain.length) this.start(i, ctx, 'tap'); else this.labelGo(i);
	},
	labelGo(i) {
		const c = this.cur(); this.stopDemo();
		if (c < 0) return this.start(i, this.ctx, 'label');
		if (i === c || this.hopTo(i, this.ctx, 'label')) return;
		tryf(() => this.ctx.toast((this.chain.includes(i) ? this.name[i] + ' is already in your chain' : 'no ' + (this.hand ? 'hand ' : '') + 'link from ' + this.name[c] + ' to ' + this.name[i]) + ' · pick a lit star', 2200));
	},
	dwell(i, ctx, x, y, extra) {
		this.hov = i; const P = ctx.post;
		if (i < 0) { ctx.audio.tick(null); if (P.undwell) P.undwell(); return; }
		const v = this.voice(i);
		ctx.audio.tick('ch:' + i, Object.assign({ fam: v.fam, plays: v.plays, x, y }, extra));
		if (P.dwell && (!extra || extra.kind !== 'label')) P.dwell(v.artist, Object.assign({ x: x + 12, y: y + 12 }, extra && { touch: true }));
	},
	gestures(ctx) {
		const at = (i, f, extra) => { const q = i < 0 ? [0, 0] : ctx.view.apply(this.px[i * 2], this.px[i * 2 + 1]); this.dwell(i, ctx, q[0], q[1], extra); };
		return {
			tap: (p) => this.tapAt(p, ctx),
			hover: (p) => at(this.nodeAt(p.wx, p.wy, 22)),
			leave: () => this.dwell(-1, ctx),
			cursor: (p) => (this.ready && this.nodeAt(p.wx, p.wy, 26) >= 0 ? 'pointer' : 'grab'),
			hold: { delay: 160, press: (p) => { const i = p.type === 'mouse' ? -1 : this.nodeAt(p.wx, p.wy, 26); if (i >= 0) at(i, 0, { force: true }); }, start() {}, move() {}, end: () => { if (ctx.post.undwell) ctx.post.undwell({ keep: true }); } },
		};
	},
	list() { return this.chain.length ? this.cands.map((c) => c.j) : this.starts; },
	fillList() {
		const lb = this.lb, L = this.list(), c = this.cur(), nm = this.name;
		lb.textContent = '';
		lb.setAttribute('aria-label', c < 0 ? 'pick a start: ' + L.length + ' artists with a link' : L.length ? 'links from ' + nm[c] + ': ' + L.length + '. arrows move, enter hops, backspace undoes' : 'no links onward from ' + nm[c] + '. backspace undoes');
		L.forEach((j, q) => {
			const k = c < 0 ? 0 : this.ek(c, j);
			const o = lb.appendChild(el('div', '', nm[j] + (c < 0 ? '' : ' · by hand ' + (this.et[k] || 'under ' + TF) + ' · the queue ' + (this.eq[k] || 'under ' + QF))));
			o.id = 'ch-o' + q; o.setAttribute('role', 'option'); o.setAttribute('aria-selected', 'false');
		});
		this.sel = clamp(this.sel, 0, Math.max(0, L.length - 1));
	},
	lbMark() {
		const lb = this.lb, o = lb.children[this.sel], j = this.list()[this.sel];
		lb.querySelectorAll('[aria-selected="true"]').forEach((x) => x.setAttribute('aria-selected', 'false'));
		if (o) { o.setAttribute('aria-selected', 'true'); lb.setAttribute('aria-activedescendant', o.id); } else lb.removeAttribute('aria-activedescendant');
		this.dirtyL = true;
		if (j != null) { const q = this.ctx.view.apply(this.px[j * 2], this.px[j * 2 + 1]); this.dwell(j, this.ctx, q[0], q[1], { kind: 'label' }); }
	},
	key(e) {
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		const L = this.list(), n = L.length, k = e.key; let s = this.sel;
		if (k === 'ArrowRight' || k === 'ArrowDown') s = n ? (s + 1) % n : 0;
		else if (k === 'ArrowLeft' || k === 'ArrowUp') s = n ? (s - 1 + n) % n : 0;
		else if (k === 'Home') s = 0;
		else if (k === 'End') s = Math.max(0, n - 1);
		else if (k === 'Enter' || k === ' ') { this.stopDemo(); if (L[s] != null) this.hopTo(L[s], this.ctx, 'key'); s = 0; }
		else if (k === 'Backspace' || k === 'Delete') { this.undo(); s = 0; }
		else return;
		e.preventDefault(); e.stopPropagation(); this.sel = s; this.lbMark();
	},

	pushLabels(ctx) {
		const it = [], px = this.px, c = this.cur(), add = (i, pri, zoom) => { const v = this.voice(i); it.push(Object.assign({ id: 'n' + i, text: v.artist, x: px[i * 2], y: px[i * 2 + 1], r: 3 + this.bk[i] * 1.6, kind: 'obj', pri, zoom, go: () => this.labelGo(i) }, v)); };
		if (c < 0) this.starts.forEach((i, q) => add(i, 1000 - q, q < (this.cmp ? 6 : 40) ? null : q < 120 ? [1.8, 99] : [3, 99]));
		else { add(c, 9000); this.cands.forEach((o) => add(o.j, 8000 - o.j * 0.01)); this.chain.forEach((i, q) => { if (i !== c) add(i, 7000 + q, [1.4, 99]); }); }
		tryf(() => ctx.labels.set('chain', this.lw ? [] : it));
	},
	look(k) { const i = typeof k === 'string' && this.byName ? this.byName.get(k.replace(/^artist:/, '').toLowerCase()) : null; return i == null ? null : [this.px[i * 2], this.px[i * 2 + 1]]; },
	focus(desc, ctx) {
		if (!this.ready || !desc) return false;
		if (Array.isArray(desc.chain)) return this.applyIds(desc.chain.map(Number), ctx);
		const i = desc.artist == null ? null : this.byName.get(String(desc.artist).toLowerCase()); if (i == null) return false;
		this.start(i, ctx, 'focus'); this.follow(ctx, i, true); return true;
	},
	follow(ctx, i, always) {
		const v = ctx.view, s = this.st, x = this.px[i * 2], y = this.px[i * 2 + 1], q = v.apply(x, y), mx = s.w * 0.18, my = s.h * 0.18;
		if (always || q[0] < s.x + mx || q[0] > s.x + s.w - mx || q[1] < s.y + my || q[1] > s.y + s.h - Math.max(my, 130)) tryf(() => v.flyTo({ wx: x, wy: y, z: Math.max(v.z || 1, 1) }, { speed: 'quick' }));
	},
	keepout() { const r = this.hud && this.hud.getBoundingClientRect(); return r && r.width ? [{ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 }] : []; },

	segs(t, z, f) {
		const L = this.chain.length, px = this.px, MINT = this.ctx.PAL.tap, VIO = this.ctx.PAL.violet;
		for (let q = 0; q + 1 < L && q < MAXHOP; q++) {
			const a = this.chain[q], b = this.chain[q + 1], k = this.ek(a, b), last = q === L - 2, p = last ? this.hopP(t) : 1;
			const x0 = px[a * 2], y0 = px[a * 2 + 1], x1 = x0 + (px[b * 2] - x0) * p, y1 = y0 + (px[b * 2 + 1] - y0) * p, len = Math.hypot(x1 - x0, y1 - y0) || 1;
			const cols = this.et[k] && this.eq[k] ? [MINT, VIO] : [this.et[k] ? MINT : VIO], nx = -(y1 - y0) / len * 2 / z, ny = (x1 - x0) / len * 2 / z;
			cols.forEach((c, s) => { const sg = cols.length > 1 ? (s ? 1 : -1) : 0; f(x0 + nx * sg, y0 + ny * sg, x1 + nx * sg, y1 + ny * sg, c, q); });
			if (last && p < 1) f(x0, y0, x1, y1, cols, -1);
		}
	},
	hopP(t) { return this.ctx.reduced ? 1 : 1 - Math.pow(1 - clamp((t - this.hopT) / HOP_MS, 0, 1), 3); },
	riffPos(t) { if (this.riffT < 0) return -1; const r = (t - this.riffT) / this.riffStep; if (r > this.chain.length) this.riffT = -1; return r < 0 || r > this.chain.length ? -1 : r; },

	frame(g, t, bands, w, h, ctx) {
		if (!this.ready) return;
		if (this.lw && t - this.lw > 1400) { this.lw = 0; this.pushLabels(ctx); }
		const z = ctx.view.z || 1, px = this.px, L = this.chain.length, c = this.cur(), lw = 1 / z, rp = this.riffPos(t);
		const anim = t - this.hopT < HOP_MS + 40 || this.riffT >= 0;
		if ((this.dirtyL || anim) && ctx.atlas.setLines) {
			const buf = this.segBuf; let o = 0;
			this.segs(t, z * 1.1, (x0, y0, x1, y1, col, q) => { if (q < 0) return; buf.set([x0, y0, x1, y1, 0.72, col, rp >= q && rp < q + 1 ? rp - q : NaN], o); o += 7; });
			tryf(() => ctx.atlas.setLines(o ? buf.subarray(0, o) : null)); this.dirtyL = anim;
		}
		g.globalAlpha = 1; g.lineCap = 'round';
		if (c < 0) {
			/* hi-dpi: web bitmap per zoom, on og's grid; 2nd blit = beat */
			const hb = bands.high * 0.857, T = g.getTransform(), k = T.a, { x, y } = this.box, D = Math.ceil(this.S * k) + 1, key = [k, this.hand, x, y, D] + '', cv = this.wc || (this.wc = el('canvas'));
			const web = (o, A) => { o.lineWidth = lw * 0.8; o.strokeStyle = rgbs(ICE, A); o.beginPath(); for (const q of this.links()) { const a = this.ea[q] * 2, b = this.eb[q] * 2; o.moveTo(px[a], px[a + 1]); o.lineTo(px[b], px[b + 1]); } o.stroke(); };
			if (devicePixelRatio < 2 || D > 2048 || this.wk !== key && this.wk2 !== key) { this.wk2 = key; web(g, 0.07 * (1 + hb)); }
			else {
				if (this.wk !== key) { this.wk = key; cv.width = cv.height = D; const o = cv.getContext('2d'), X = (k * x + T.e) | 0, Y = (k * y + T.f) | 0; this.wo = [X - T.e, Y - T.f]; o.setTransform(k, 0, 0, k, T.e - X, T.f - Y); o.lineCap = 'round'; web(o, 0.07); }
				const X = Math.round(T.e + this.wo[0]), Y = Math.round(T.f + this.wo[1]); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cv, X, Y); if (hb > 0.02) { g.globalAlpha = hb; g.drawImage(cv, X, Y); g.globalAlpha = 1; } g.setTransform(T);
			}
		} else {
			const x0 = px[c * 2], y0 = px[c * 2 + 1], sj = this.kb && this.cands[this.sel] ? this.cands[this.sel].j : -1;
			g.lineWidth = lw * 1.1;
			for (const { j } of this.cands) {
				const on = j === sj || j === this.hov;
				g.strokeStyle = rgbs(ICE, on ? 0.9 : 0.34 + bands.high * 0.2); g.beginPath(); g.moveTo(x0, y0); g.lineTo(px[j * 2], px[j * 2 + 1]); g.stroke();
				ring(g, px[j * 2], px[j * 2 + 1], (on ? 7 : 4.5) * lw);
			}
		}
		this.segs(t, z, (x0, y0, x1, y1, col, q) => {
			if (q < 0) { if (!ctx.reduced) this.comet(g, x0, y0, x1, y1, col, lw, this.hopP(t)); return; }
			for (let s = 0; s < 2; s++) { g.lineWidth = (s ? 2.4 : 9) * lw; g.strokeStyle = rgbs(col, s ? 0.95 : 0.16); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
		});
		if (rp >= 0 && L > 1) {
			const q = Math.min(L - 1, Math.floor(rp)), f = rp - q, a = this.chain[q] * 2, b = this.chain[Math.min(L - 1, q + 1)] * 2;
			g.fillStyle = '#fff'; ring(g, px[a] + (px[b] - px[a]) * f, px[a + 1] + (px[b + 1] - px[a + 1]) * f, 3.2 * lw, 1);
			g.strokeStyle = rgbs(ICE, 0.6 * (1 - f)); g.lineWidth = lw; ring(g, px[a], px[a + 1], (6 + f * 14) * lw);
		}
		g.strokeStyle = rgbs(ICE, 0.95); g.lineWidth = 1.6 * lw;
		if (c >= 0) ring(g, px[c * 2], px[c * 2 + 1], (9 + (ctx.reduced ? 0 : Math.sin(t * 0.006) * 2) + bands.low * 4) * lw);
		const i = this.hov; g.lineWidth = lw;
		if (i >= 0 && i !== c) ring(g, px[i * 2], px[i * 2 + 1], 7 * lw);
	},
	comet(g, x0, y0, x1, y1, cols, lw, p) {
		const dx = x1 - x0, dy = y1 - y0;
		for (let s = 0; s < 14; s++) {
			const f = 1 - s * 0.045 / Math.max(0.2, p); if (f <= 0) break;
			g.fillStyle = rgbs(cols[s % cols.length], 0.85 * (1 - s / 14));
			ring(g, x0 + dx * f + Math.sin(s * 2.3) * lw * s * 0.5, y0 + dy * f + Math.cos(s * 1.7) * lw * s * 0.5, (2.6 - s * 0.15) * lw, 1);
		}
		g.fillStyle = '#fff'; ring(g, x1, y1, 3.4 * lw, 1);
	},

	leave(ctx) {
		this.stopDemo(); this.hov = -1; this.riffT = -1; this.dirtyL = true; this.wc = this.wk = null;
		tryf(() => { ctx.stopPosts(); ctx.audio.tick(null); });
	},

	demo(ctx) {
		if (!this.ready) return;
		this.stopDemo(); let seed = 7;
		const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296, T = this._demoT = [], at = (ms, f) => T.push(setTimeout(() => { if (this.active()) f(); }, ms));
		at(600, () => this.start(this.starts[0], ctx, 'demo'));
		for (let s = 1; s <= 5; s++) at(600 + s * 1500, () => { if (this.cands.length) this.hopTo(this.cands[(rnd() * this.cands.length) | 0].j, ctx, 'demo'); });
		at(9900, () => this.riff());
	},
	stopDemo() { if (this._demoT) { this._demoT.forEach(clearTimeout); this._demoT = null; } },
};
