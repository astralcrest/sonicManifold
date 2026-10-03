/* R6 thirteen gates: lazy angle of graveyard.js. data: gates.json (extract_gates.py parses researcher.html; referee passes
1-3). caption verbatim (C1); door strings are the file's own, so C2/C3 live in the data. slammed = fired, opened = ran and
stood, bricked = could never close, added later = revision (none fired). no dot here is a play. */
const KIND = { kill: ['slammed', 0, 3000, 'slam'], survive: ['opened', 2, 100, 'open'], brick: ['bricked', 0, 0, 'brick'], revision: ['added later', 1, 12, 'later'] };
const STONE = 0xd8d2ea, MOUND = 0x7d74a6, SOIL = 0x57507a, LIGHT = 0xf0eaff, ICE = 'rgba(134,203,254,', INK = 'rgba(216,210,234,';
const KIOSK = /[?&]kiosk=1\b/.test(location.search), now = () => performance.now(), pk = (v) => (0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)) >>> 0;
let CSS = null;
export default async function gates(M, C, o = {}) {
let J = null; try { J = await C.data('gates'); } catch (e) {}
if (!J || !J.doors || M.gates || !M.active() || C.angle.get().id !== 'gates') return;
if (!CSS) { CSS = document.createElement('style'); CSS.textContent = '.gt{position:absolute;display:flex;flex-direction:column;gap:10px;pointer-events:none;color:#e8e2f6;font:12px/1.45 ui-monospace,Menlo,monospace}.gt p{margin:0}.gtp{flex:none;pointer-events:auto;overflow-y:auto;max-width:78ch}.gtc{font:15px/1.42 system-ui,sans-serif}.gtt,.gtw,.gtl{color:#bdb4d4}.gth{color:#86cbfe;text-transform:uppercase;letter-spacing:.06em}.gtp p+p{margin-top:5px}.gts{flex:1;position:relative;min-height:120px}.gt .gtd{position:absolute;pointer-events:auto;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:0;background:transparent;border:0;border-radius:6px;color:#bdb4d4;font:11px/1.2 ui-monospace,Menlo,monospace;cursor:pointer;touch-action:manipulation}.gt .gtd:focus-visible{outline:2px solid #86cbfe;outline-offset:2px}.gtd i{font-style:normal;text-align:center}.gtd.on{color:#86cbfe}.gtk{pointer-events:auto;display:flex;flex-wrap:wrap;gap:8px}.gtk button{font:inherit;text-transform:uppercase;color:inherit;background:#0a0118b3;border:1px solid #d8d2ea66;border-radius:99px;padding:9px 14px;min-height:40px;cursor:pointer}.gtk button:hover,.gtk button:focus-visible{border-color:#86cbfe;color:#86cbfe;outline:none}.gtx{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.gt.tight .gtc{font-size:13px;line-height:1.36}.gt.tight .gtk button{padding:6px 10px;min-height:34px}@media (forced-colors:active){.gt .gtd{border:1px solid ButtonText}}'; document.head.appendChild(CSS); }
const A = C.audio, P = C.particles, N = P.n, h = C.hash, red = !!C.reduced, D = J.doors, n = D.length;
const el = (t, c, x, p) => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; if (p) p.appendChild(e); return e; };
M.cancelAuto(C); M._autoDone = true; if (M.state !== 'idle') M.again(C, false);
const hid = [M.pn, M.rs, M.sxList].filter(Boolean); hid.forEach((e) => { e.style.visibility = 'hidden'; });
C.labels.set('graveyard', []); C.hud(null); C.view.home({ instant: true }); C.view.configure({ mode: 'none' });
const W = el('div', 'gt', 0, M.root), pane = el('div', 'gtp', 0, W), strip = el('div', 'gts', 0, W), keys = el('div', 'gtk', 0, W);
strip.setAttribute('role', 'toolbar'); strip.setAttribute('aria-label', 'thirteen gates: arrow keys walk the doors');
const cnt = {}; D.forEach((d) => { cnt[d.kind] = (cnt[d.kind] || 0) + 1; });
const tally = cnt.kill + ' slammed · ' + cnt.survive + ' opened · ' + cnt.brick + ' bricked · ' + cnt.revision + ' added in revision, none fired';
const pad2 = (i) => (i < 10 ? '0' : '') + i;
const power = (d) => (d.kind === 'brick' ? 'power: none. it could never have closed.' : d.low_power ? 'power: little. its bar was set too high to close.' : '');
const lines = (d) => [d.name, 'rule: ' + d.rule, 'verdict: ' + d.verdict, d.number, power(d), 'ledger row ' + d.ledger].filter(Boolean);
const btns = D.map((d, j) => {
const b = el('button', 'gtd', 0, strip); b.type = 'button'; b.tabIndex = j ? -1 : 0; b.dataset.kind = d.kind;
b.setAttribute('aria-label', 'door ' + d.i + ' of ' + n + ', ' + KIND[d.kind][0] + ': ' + d.name);
const x = el('span', 'gtx', lines(d).slice(1).join(' '), b); x.id = 'gt-d' + d.i; b.setAttribute('aria-describedby', x.id);
el('i', '', pad2(d.i), b); const tg = el('i', 'gtl', 0, b); tg.style.whiteSpace = 'pre'; b._t = (sh) => { tg.textContent = KIND[d.kind][sh ? 3 : 0] + (d.low_power ? (sh ? '\nbar ↑' : '\nbar too high') : ''); };
return b;
});
const kb = (t, f) => { const b = el('button', '', t, keys); b.type = 'button'; b.addEventListener('click', f); return b; };
kb('slam them again', () => run(true)); kb('back to the graves', () => C.angle.set('ground', { via: 'room' }));
let G = null, sel = -1, pin = false, tmr = [], due = new Float64Array(n), at = new Float64Array(n), fz = new Float64Array(n);
const dI = new Uint8Array(N), lst = new Int32Array(N), st0 = new Int32Array(n + 2);
const view = () => {
pane.textContent = '';
if (sel < 0) { el('p', 'gtc', J.caption, pane); el('p', 'gtt', tally, pane); return; }
const d = D[sel], L = lines(d); el('p', 'gth', 'door ' + pad2(d.i) + ' of ' + n + ' · ' + KIND[d.kind][0], pane);
L.forEach((t, k) => el('p', k === 0 ? '' : k === L.length - 1 || t === power(d) ? 'gtw' : '', t, pane));
};
/* one door: frame 40%, leaf by state, light spilt under an open one */
function door(j) {
const g = G.d[j], { x, y, w, hh, base } = g, t = Math.max(1.5, w * 0.09), cx = x + w / 2, ay = y + w / 2, d = D[j], s = at[j] ? d.kind : 'pend';
const X = P.tx, Y = P.ty, TC = P.tc, Wt = P.w, rev = d.kind === 'revision', ramp = rev ? Math.min(1, fz[j]) : 1;
for (let q = st0[j + 1]; q < st0[j + 2]; q++) {
const k = lst[q], v = h(k * 31 + 7), a = h(k * 37 + 11), b = h(k * 41 + 13); let px, py, col = STONE, wt = 255;
if (v < 0.4) {
if (a < 0.62) { px = a < 0.31 ? x + b * t : x + w - b * t; py = ay + h(k * 43 + 17) * (base - ay); }
else { const th = Math.PI * b, r = w / 2 - h(k * 43 + 17) * t; px = cx + Math.cos(th) * r; py = ay - Math.sin(th) * r; }
wt = rev ? (at[j] ? 150 * ramp : 0) : 255; if (rev) col = MOUND;
} else {
px = x + t + a * (w - 2 * t); py = y + b * hh;
if (py < ay) { const dx = px - cx, dy = ay - py, r = w / 2 - t; if (dx * dx + dy * dy > r * r) py = 2 * ay - py; }
if (s === 'pend') { wt = rev ? 0 : 22; col = MOUND; }
else if (s === 'kill') wt = 235;
else if (s === 'brick') { const bh = Math.max(3, w / 5), bw = w / 2.2, gp = 1.2, rw = Math.floor((base - py) / bh), fy = (base - py) - rw * bh, fx = ((px - x - t + (rw % 2 ? bw / 2 : 0)) % bw + bw) % bw;
if (fx < gp) px += gp; else if (fx > bw - gp) px -= gp; if (fy < gp) py -= gp; else if (fy > bh - gp) py += gp; col = MOUND; wt = 170; }
else { /* open: leaf at the hinge, light on the floor */
if (v < 0.68) { px = x + t + a * w * 0.16; py = ay + (0.05 * (1 - a)) * hh + b * (base - ay - 0.08 * hh * a); col = rev ? MOUND : STONE; wt = (rev ? 120 : 210) * ramp; }
else { const sh = G.soil + 2, dy = Math.pow(b, 1.6) * sh, hw = (w / 2) * (1 + (dy / sh) * 1.4); px = cx + (a * 2 - 1) * hw; py = base + 1 + dy; col = rev ? MOUND : LIGHT; wt = (rev ? 50 : 140 - 100 * b) * ramp; }
}
}
X[k] = px; Y[k] = py; TC[k] = pk(col); Wt[k] = wt;
if (red) { P.x[k] = px; P.y[k] = py; P.c[k] = TC[k]; }
}
}
function place() {
const X = P.tx, Y = P.ty, TC = P.tc, Wt = P.w, rows = G.rb.length;
for (let q = st0[0]; q < st0[1]; q++) { const k = lst[q], r = G.rb[(h(k * 7 + 3) * rows) | 0], d = Math.pow(h(k * 17 + 9), 1.7);
X[k] = r[0] + h(k * 3 + 1) * r[1]; Y[k] = r[2] + 1.5 + d * G.soil; TC[k] = pk(SOIL); Wt[k] = 60; if (red) { P.x[k] = X[k]; P.y[k] = Y[k]; P.c[k] = TC[k]; } }
for (let j = 0; j < n; j++) door(j);
}
S_fit();
function S_fit() {
const s = C.stage(); W.style.cssText = 'left:' + s.x + 'px;top:' + s.y + 'px;width:' + s.w + 'px;height:' + s.h + 'px';
W.classList.toggle('tight', s.w < 600 || s.h < 560);
pane.style.height = ''; let ph = 0; const s0 = sel; /* one height: the tallest card */
for (let j = -1; j < n; j++) { sel = j; view(); ph = Math.max(ph, pane.scrollHeight); } sel = s0; view();
pane.style.height = Math.min(ph, s.h * (s.w < 600 ? 0.5 : 0.36)) + 'px';
const r = strip.getBoundingClientRect(), so = 7, lab = 49; let B = null;
for (const cols of [13, 7, 5, 4]) {
const rows = Math.ceil(n / cols), px = r.width / cols, rh = r.height / rows; let dh = rh - lab - 8, dw = dh / 2.1;
if (dw > px * 0.66) { dw = px * 0.66; dh = dw * 2.1; } if (!B || dw * dh > B.a) B = { cols, rows, px, rh, dw, dh, a: dw * dh };
}
const { cols, rows, px, rh, dw, dh } = B, d = [], rb = []; btns.forEach((b) => b._t(px < 84));
for (let j = 0; j < n; j++) {
const row = (j / cols) | 0, c = j % cols, inRow = Math.min(cols, n - row * cols), x0 = r.left + (r.width - inRow * px) / 2 + c * px;
const top = r.top + row * rh + (rh - dh - lab) / 2 + 15; d.push({ x: x0 + (px - dw) / 2, y: top, w: dw, hh: dh, base: top + dh, bx: x0, bw: px, by: r.top + row * rh, bh: rh });
if (!c) rb.push([r.left + (r.width - inRow * px) / 2, inRow * px, top + dh]);
}
G = { d, rb, soil: so, cols, rows };
btns.forEach((b, j) => { const q = d[j]; b.style.cssText = 'left:' + (q.bx - r.left) + 'px;top:' + (q.by - r.top) + 'px;width:' + q.bw + 'px;height:' + q.bh + 'px'; });
/* 40% floor, 13 equal doors (counting sort: a door's dots are one run of lst) */
st0.fill(0); for (let k = 0; k < N; k++) { const u = h(k * 29 + 4), j = u < 0.4 ? 0 : 1 + Math.min(n - 1, (((u - 0.4) / 0.6) * n) | 0); dI[k] = j; st0[j + 1]++; }
for (let j = 1; j <= n + 1; j++) st0[j] += st0[j - 1];
const fill = st0.slice(); for (let k = 0; k < N; k++) lst[fill[dI[k]]++] = k;
P.jitter = 0.1; P.ease = 0.12; P.swirl = 0; P.glyphAll(true); P.glyphMode('cont'); P.glyphGrid(null);
place();
}
/* on the bed's beat: slam = lowest, open = higher, brick = muted tick, revision = faint high chime (key floor snaps all) */
function sound(j, a) {
const k = D[j].kind;
if (k === 'kill') { A.note(-5, { at: a, dur: 1.1, type: 'triangle', vol: 0.05 }); A.note(-10, { at: a, dur: 0.7, type: 'sine', vol: 0.03 }); }
else if (k === 'survive') A.note(3, { at: a, dur: 0.9, vol: 0.04 });
else if (k === 'brick') A.note(0, { at: a, dur: 0.05, type: 'triangle', vol: 0.014 });
else A.note(7, { at: a, dur: 1.4, vol: 0.016 });
}
function run(user) {
tmr.forEach(clearTimeout); tmr = []; at.fill(0); fz.fill(0); place();
const b = A.beat ? A.beat(2) : null, step = b ? Math.max(0.28, Math.min(0.42, b.len)) : 0.34, a0 = b ? Math.max(0.05, b.next - b.now) : 0.08, t0 = now();
for (let j = 0; j < n; j++) { const a = a0 + j * step; sound(j, a); due[j] = t0 + a * 1000; if (red) { at[j] = t0; fz[j] = 1; door(j); } }
if (KIOSK && !user) tmr.push(setTimeout(() => walk(0), (a0 + n * step) * 1000 + 1500));
}
function walk(j) { if (!S.alive()) return; show(j % n, 'kiosk'); tmr.push(setTimeout(() => walk(j + 1), 3200)); }
function show(j, via, force) {
if (j === sel && !force) return; sel = j; view();
btns.forEach((b, k) => { b.classList.toggle('on', k === j); if (j >= 0) b.tabIndex = k === j ? 0 : -1; });
if (j < 0) return; const d = D[j], q = G.d[j], K = KIND[d.kind];
A.tick('gt:' + d.i, d.kind === 'brick' ? { deg: 0, kind: 'control', x: q.x + q.w / 2, force } : { deg: K[1], plays: K[2], x: q.x + q.w / 2, y: q.y + q.hh * 0.4, force });
}
const stopKiosk = () => { if (KIOSK) { tmr.forEach(clearTimeout); tmr = []; } };
btns.forEach((b, j) => {
b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !pin) show(j, 'hover'); });
b.addEventListener('pointerdown', (e) => { stopKiosk(); if (e.pointerType !== 'mouse') show(j, 'touch', true); });
b.addEventListener('focus', () => show(j, 'focus'));
b.addEventListener('click', () => { pin = true; show(j, 'click'); at[j] = 0; fz[j] = 0; door(j); due[j] = now() + 60; sound(j, 0.05); });
});
strip.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pin) { show(-1); A.tick(null); } });
strip.addEventListener('keydown', (e) => {
const k = e.key, j = Math.max(0, sel); let to = -1;
if (k === 'ArrowRight' || k === 'ArrowDown') to = Math.min(n - 1, sel < 0 ? 0 : j + 1); else if (k === 'ArrowLeft' || k === 'ArrowUp') to = Math.max(0, j - 1);
else if (k === 'Home') to = 0; else if (k === 'End') to = n - 1;
else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); pin = false; show(-1); return; } else return;
e.preventDefault(); e.stopPropagation(); stopKiosk(); pin = true; btns[to].focus({ preventScroll: true });
});
const ko = () => [...pane.children, ...btns, ...keys.children].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 }; });
const S = {
alive: () => M.gates === S && M.active(),
fit: () => { S_fit(); for (let j = 0; j < n; j++) if (at[j]) { fz[j] = 1; door(j); } },
ko, voice: () => null,
st: () => ({ n, sel, pin, kinds: D.map((d) => d.kind), res: [...at].map(Boolean), G, tally, cols: G.cols }),
frame(g, tt) {
const t = now();
for (let j = 0; j < n; j++) {
if (!at[j] && due[j] && t >= due[j]) { at[j] = t; fz[j] = red ? 1 : 0; door(j); }
if (at[j] && D[j].kind === 'revision' && fz[j] < 1) { fz[j] = red ? 1 : Math.min(1, (t - at[j]) / 900); door(j); }
}
for (let j = 0; j < n; j++) {
const q = G.d[j], d = D[j], e = at[j] ? t - at[j] : -1, on = j === sel, x = q.x, y = q.y, w = q.w, ay = y + w / 2, base = q.base;
let sx = 0;
if (!red && d.kind === 'kill' && e >= 0 && e < 420) sx = Math.sin(e / 18) * 2.2 * (1 - e / 420);
g.save(); g.translate(sx, 0);
g.beginPath(); g.moveTo(x, base); g.lineTo(x, ay); g.arc(x + w / 2, ay, w / 2, Math.PI, 0); g.lineTo(x + w, base);
if (d.kind === 'revision') g.setLineDash([3, 3]);
g.strokeStyle = on ? ICE + '.95)' : INK + (d.kind === 'revision' ? 0.4 * (at[j] ? fz[j] : 0.25) : 0.3) + ')'; g.lineWidth = on ? 1.6 : 1; g.stroke(); g.setLineDash([]);
if (e >= 0 && !red) {
if (d.kind === 'kill' && e < 700) { g.fillStyle = INK + (0.32 * (1 - e / 700)) + ')'; g.fill(); }
else if (d.kind !== 'kill' && d.kind !== 'brick' && e < 900) { const f = Math.min(1, e / 500); g.fillStyle = INK + (0.16 * (1 - f)) + ')'; g.fillRect(x, ay, w * (1 - 0.84 * f), base - ay); }
}
if (at[j] && d.kind !== 'brick' && d.kind !== 'revision') { g.fillStyle = d.kind === 'kill' ? INK + '.1)' : 'rgba(240,234,255,.07)'; g.fill(); }
if (e >= 0 && d.kind === 'brick') { /* mortar, course by course */
const f = red ? 1 : Math.min(1, e / 700), bh = Math.max(9, w / 3.4), bw = w / 1.8; let r = 0; g.clip(); g.strokeStyle = '#0a0118'; g.lineWidth = 3; g.beginPath();
for (let yy = base; yy > base - f * (base - y); yy -= bh, r++) { g.moveTo(x, yy); g.lineTo(x + w, yy); for (let xx = x + (r % 2 ? bw / 2 : bw); xx < x + w; xx += bw) { g.moveTo(xx, yy); g.lineTo(xx, yy - bh); } }
g.stroke();
}
if (d.low_power && at[j]) { const by = y - 5; g.strokeStyle = INK + (0.55 * fz[j]) + ')'; g.beginPath(); g.moveTo(x - 4, by); g.lineTo(x + w + 4, by); g.moveTo(x - 4, by - 3); g.lineTo(x - 4, by + 3); g.moveTo(x + w + 4, by - 3); g.lineTo(x + w + 4, by + 3); g.stroke(); }
g.restore();
}
},
stop(c) {
tmr.forEach(clearTimeout); tmr = []; W.remove(); hid.forEach((e) => { e.style.visibility = ''; });
A.tick(null); c.hud(null); P.ease = 0.06; c.view.configure({ mode: 'pan', zMin: 1, zMax: 3, drift: false, look: (k) => M.look(k, c) });
},
};
M.gates = S; run(false);
}
