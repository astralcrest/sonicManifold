/* listeners angle · SHOW YOUR WORK (R6 SYW): the headline's session-block bootstrap, re-run in a worker in this tab.
   data: exhibit/data/bi_sessions.json (a multiset of per-session counts: no ids, no dates, no order). mounts only when
   its angle opens (mount(host, ctx)); the worker starts only on a press of "run it". the pour is the resamples
   landing in a glyph histogram; reduced motion draws the final histogram once. */
const V = new URL(import.meta.url).search || '';
const LEDGER_SEED = 20260921, X0 = 0.98, X1 = 1.13;
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const f2 = (v) => (+v).toFixed(2), f4 = (v) => (+v).toFixed(4);
const q = (f) => { try { return f(); } catch (e) { return undefined; } };
const CSS = `
.sw{position:absolute;z-index:6;top:calc(var(--sw-t,0px) + 16px);right:calc(var(--sw-r,0px) + 20px);width:min(420px,34vw);max-height:calc(100% - var(--sw-t,0px) - var(--sw-b,0px) - 32px);overflow:auto;box-sizing:border-box;padding:16px 18px 14px;background:var(--ai-panel2,rgba(10,1,24,.9));border:1px solid var(--ai-line,rgba(134,203,254,.28));border-radius:10px;color:var(--ink,#f0eaff);font:400 12px/1.5 var(--mono,ui-monospace,monospace);pointer-events:auto;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.sw p{margin:0}
.sw-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 0 10px}
.sw-h b{font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ice,#86cbfe)}
.sw-h span{color:var(--mute,#a49bbd);font-size:11px}
.sw-arm{display:flex;align-items:center;gap:8px;color:var(--mute,#a49bbd);font-size:11.5px}
.sw-arm i{display:block;width:12px;height:3px;border-radius:2px;flex:none}
.sw-arm b{color:var(--ink,#f0eaff);font-weight:600}
.sw-pt{margin:8px 0 10px!important;font-size:13px}
.sw-pt b{font-weight:600;font-size:15px}
.sw-pt span{color:var(--mute,#a49bbd)}
.sw-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px}
.sw-ctl label{display:flex;align-items:center;gap:6px;color:var(--mute,#a49bbd);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.sw-ctl input{width:7.6em;min-height:36px;box-sizing:border-box;padding:0 8px;font:500 13px/1 var(--mono,monospace);color:var(--ink,#f0eaff);background:rgba(134,203,254,.06);border:1px solid var(--line,rgba(189,166,255,.22));border-radius:6px}
.sw-ctl input:focus-visible{outline:2px solid var(--ice,#86cbfe);outline-offset:2px}
.sw-ctl button{display:flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;font:600 11px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--ice,#86cbfe);background:rgba(10,1,24,.6);border:1px solid rgba(134,203,254,.45);border-radius:999px;cursor:pointer;white-space:nowrap}
.sw-ctl button.sw-new{color:var(--mute,#a49bbd);border-color:var(--line,rgba(189,166,255,.22))}
.sw-ctl button:hover{border-color:var(--ice,#86cbfe);background:rgba(134,203,254,.1)}
.sw-ctl button:focus-visible{outline:2px solid var(--ice,#86cbfe);outline-offset:3px}
.sw-ctl button[disabled]{opacity:.5;cursor:default}
.sw-bad{color:var(--rose,#ff6e9c);font-size:11px}
.sw-cv{display:block;width:100%;height:172px;margin:2px 0 6px}
.sw-pg{min-height:1.5em;color:var(--mute,#a49bbd);font-size:11px}
.sw-res{font-weight:600;font-size:12.5px;min-height:1.5em}
.sw-pw{margin:6px 0 0!important;color:var(--ink,#f0eaff);font-size:11.5px;line-height:1.55}
.sw-ms{margin:6px 0 0!important;color:var(--ice,#86cbfe);font-size:11px;min-height:1.5em}
.sw-fine{margin:8px 0 0;color:var(--mute,#a49bbd);font-size:10.5px;line-height:1.5}
.sw-fine summary{cursor:pointer;font:600 10.5px/1 var(--mono,monospace);letter-spacing:.1em;text-transform:uppercase;padding:8px 0 4px;width:max-content}
.sw-fine summary:focus-visible{outline:2px solid var(--ice,#86cbfe);outline-offset:3px}
.sw-fine p{margin:4px 0 0}
.sw-x{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@media (max-width:640px){.sw{position:fixed;top:calc(var(--sw-t,0px) + 8px);left:16px;right:16px;width:auto;bottom:var(--sw-y,112px);max-height:none;padding:12px 14px 10px}.sw-cv{height:136px}.sw-pt{margin:6px 0 8px!important}}
@media (forced-colors:active){.sw-ctl button{forced-color-adjust:none;background:Canvas;color:CanvasText;border:1px solid CanvasText}}
@media print{.sw-ctl{display:none}}`;

const SW = {
  host: null, ctx: null, root: null, d: null, w: null, raf: 0, ro: null, mounted: false,
  vals: null, lv: [], n: 0, landed: 0, queue: [], drops: [], res: null, running: false, seed: LEDGER_SEED, B: 2000, t0: 0, needle: 0,

  /* host: the element the card sits in (the listeners section). opts.B overrides the resample count (tests). */
  mount(host, ctx, opts) {
    if (this.mounted) return this.ready;
    this.mounted = true; this.host = host; this.ctx = ctx || {}; this.opts = opts || {};
    if (!document.getElementById('sw-css')) { const s = el('style'); s.id = 'sw-css'; s.textContent = CSS; document.head.appendChild(s); }
    const tier = q(() => this.ctx.atlas.gov.tier) || 0;
    const phone = !!(this.ctx.coarse || q(() => matchMedia('(pointer:coarse)').matches));
    this.B = this.opts.B || (phone && tier >= 4 ? 500 : 2000);
    this.reduced = !!(this.ctx.reduced || q(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
    this.build();
    this.fit = () => { const r = this.root; if (!r) return; let y = q(() => this.ctx.atlas.insets.bottom) || 0; ['uf-tab', 'atlas-dock'].forEach((i) => { const e = document.getElementById(i); if (e) { const t = e.getBoundingClientRect().top; if (t > 0 && (!y || t < y + 40)) y = Math.min(y || t, t); } }); if (y > 120) r.style.setProperty('--sw-y', Math.round(innerHeight - y + 8) + 'px'); };
    this.fit(); setTimeout(this.fit, 400); addEventListener('resize', this.fit);
    this.ready = fetch(new URL('../data/bi_sessions.json' + V, import.meta.url)).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { if (!this.mounted) return; this.d = d; this.fill(); }, (e) => { if (this.pg) this.pg.textContent = 'the session counts did not load'; console.warn('showwork', e); });
    return this.ready;
  },

  unmount() {
    if (!this.mounted) return;
    this.mounted = false;
    if (this.w) { this.w.terminate(); this.w = null; }
    cancelAnimationFrame(this.raf); this.raf = 0;
    if (this.ro) { this.ro.disconnect(); this.ro = null; }
    removeEventListener('resize', this.fit);
    if (this.root) this.root.remove();
    this.root = null; this.running = false; this.res = null; this.vals = null; this.lv = []; this.queue = []; this.drops = [];
  },

  state() {
    return { mounted: this.mounted, running: this.running, seed: this.seed, B: this.B, n: this.n, landed: this.landed,
      res: this.res && { point: this.res.point, lo: this.res.lo, hi: this.res.hi, ms: this.res.ms, S: this.res.S }, loaded: !!this.d };
  },

  build() {
    const r = this.root = el('section', 'sw');
    r.setAttribute('role', 'region'); r.setAttribute('aria-label', 'show your work: the headline, re-run in this tab');
    const ins = q(() => this.ctx.atlas.insets) || {};
    [['t', ins.top], ['b', ins.bottom], ['r', ins.right]].forEach(([k, v]) => r.style.setProperty('--sw-' + k, (v || 0) + 'px'));
    const h = el('p', 'sw-h'); h.append(el('b', '', 'show your work'), el('span', '', 'the headline, re-run in this tab')); r.append(h);
    this.arms = [0, 1].map((g) => { const p = el('p', 'sw-arm'), i = el('i'); i.setAttribute('aria-hidden', 'true'); i.style.background = g ? 'var(--violet,#8b6fd6)' : 'var(--mint,#21f6bc)'; p.append(i, el('span')); r.append(p); return p.lastChild; });
    this.pt = el('p', 'sw-pt'); r.append(this.pt);
    const c = el('div', 'sw-ctl'), lab = el('label', '', 'seed');
    this.inp = el('input'); this.inp.type = 'text'; this.inp.inputMode = 'numeric'; this.inp.autocomplete = 'off'; this.inp.spellcheck = false;
    this.inp.value = String(LEDGER_SEED); this.inp.setAttribute('aria-label', 'seed (the published run used 20260921)');
    this.inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.go(); } });
    lab.append(this.inp);
    this.btn = el('button', 'sw-run', '⟳ run it'); this.btn.type = 'button'; this.btn.addEventListener('click', () => this.go());
    this.nb = el('button', 'sw-new', 'new seed'); this.nb.type = 'button';
    this.nb.addEventListener('click', () => { const a = new Uint32Array(1); crypto.getRandomValues(a); this.inp.value = String(a[0] % 1e9); this.go(); });
    this.bad = el('span', 'sw-bad'); this.bad.setAttribute('role', 'status');
    c.append(lab, this.btn, this.nb, this.bad); r.append(c);
    this.cv = el('canvas', 'sw-cv'); this.cv.setAttribute('role', 'img'); r.append(this.cv);
    this.pg = el('p', 'sw-pg', 'loading the session counts'); this.pg.setAttribute('aria-hidden', 'true'); r.append(this.pg);
    this.rs = el('p', 'sw-res'); this.rs.setAttribute('aria-live', 'polite'); r.append(this.rs);
    this.pw = el('p', 'sw-pw'); r.append(this.pw);
    this.ms = el('p', 'sw-ms'); r.append(this.ms);
    this.fine = el('details', 'sw-fine'); this.fine.append(el('summary', '', 'how this works')); r.append(this.fine);
    this.host.append(r);
    this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(this.cv);
  },

  fill() {
    const d = this.d, H = d.headline, T = [0, 1, 2, 3].map((j) => d.t.reduce((a, t) => a + t[j] * t[4], 0));
    this.arms[0].innerHTML = ''; this.arms[1].innerHTML = '';
    const arm = (s, who, rate, n) => { s.append(who + ' crossed a genre on ', el('b', '', (rate * 100).toFixed(1) + '%'), ' of ' + fmt(n) + ' jumps'); };
    arm(this.arms[0], 'my own picks', T[1] / T[0], T[0]); arm(this.arms[1], 'autoplay', T[3] / T[2], T[2]);
    this.pt.innerHTML = ''; this.pt.append("mine ÷ autoplay's = ", el('b', '', f4(H.bi)), el('span', '', ', likely ' + f2(H.ci[0]) + ' to ' + f2(H.ci[1])));
    this.S = d.t.reduce((a, t) => a + t[4], 0);
    this.pg.textContent = 'press run it: ' + fmt(this.B) + ' resamples of ' + fmt(this.S) + ' listening sessions, in a worker in this tab';
    this.pw.textContent = 'published: ' + f2(H.bi) + ' [' + f2(H.ci[0]) + ', ' + f2(H.ci[1]) + '] on seed ' + H.seed + '; ' + this.tail();
    const sp = d.split;
    [
      'each resample draws ' + fmt(this.S) + ' sessions with replacement, adds up their jumps in each arm, and divides my crossing rate by autoplay\'s. the middle 95% of those ratios is the interval; the point never moves, only the interval does.',
      'the file holds counts only: for each session, how many tagged jumps each arm made and how many crossed a genre (' + d.partition + '). no ids, dates, hours, durations, artists, tracks or order.',
      'the longest 1% of sessions (more than ' + sp.cap + ' tagged jumps, ' + sp.n_sessions_split + ' of them) ship dealt into pieces of at most ' + sp.cap + ', so no block stands out; the point and both totals are unchanged, and the split narrows the interval by about 1%, slightly anti-conservative.',
      'published run: numpy, B = ' + fmt(H.B) + ', seed ' + H.seed + ' (ledger ' + H.ledger + '). this tab: mulberry32, B = ' + fmt(this.B) + ', so the third decimal can differ from the published one.',
    ].forEach((t) => this.fine.append(el('p', '', t)));
    this.cv.setAttribute('aria-label', 'histogram of resampled ratios; empty until you run it');
    this.draw();
  },

  tail() { return 'a direction, not a size: ' + this.d.conditions[0] + '; ' + this.d.conditions[1]; },

  go() {
    if (!this.d || !this.mounted) return;
    const s = this.inp.value.trim();
    if (!/^\d{1,10}$/.test(s) || +s > 4294967295) { this.bad.textContent = 'a whole number, 0 to 4294967295'; return; }
    this.bad.textContent = '';
    this.seed = +s;
    if (this.w) this.w.terminate();
    this.vals = new Float64Array(this.B); this.lv = []; this.n = 0; this.landed = 0; this.queue = []; this.drops = []; this.res = null; this.needle = 0;
    this.running = true; this.btn.disabled = true; this.rs.textContent = ''; this.ms.textContent = '';
    this.cv.setAttribute('aria-label', 'histogram of resampled ratios, filling');
    this.pg.textContent = 'resampling 0 / ' + fmt(this.B);
    this.w = new Worker(new URL('./showwork.worker.js' + V, import.meta.url));
    this.w.onmessage = (e) => this.msg(e.data);
    this.w.onerror = (e) => { this.running = false; this.btn.disabled = false; this.pg.textContent = 'the worker stopped'; console.warn('showwork worker', e.message); };
    this.w.postMessage({ t: this.d.t, seed: this.seed, B: this.B, step: 100 });
    this.t0 = performance.now(); this.lastT = this.t0;
    this.tick();
  },

  msg(m) {
    if (!this.mounted) return;
    if (m.done) {
      this.res = m; this.running = false; this.btn.disabled = false;
      this.w.terminate(); this.w = null;
      if (this.reduced) { this.flush(); this.finish(); } else this.tick();
      return;
    }
    for (let i = 0; i < m.v.length; i++) { this.vals[this.n++] = m.v[i]; this.queue.push(m.v[i]); }
    this.pg.textContent = 'resampling ' + fmt(m.k) + ' / ' + fmt(this.B) + (this.reduced ? '' : ', pouring');
    if (this.reduced) this.queue.length = 0;
  },

  flush() { this.queue.length = 0; this.drops.length = 0; this.lv = Array.from(this.vals.subarray(0, this.n)); this.landed = this.n; },

  finish() {
    const r = this.res, H = this.d.headline, lo1 = Array.prototype.filter.call(this.vals.subarray(0, this.n), (v) => v <= 1).length, b = '[' + f2(r.lo) + ', ' + f2(r.hi) + ']';
    this.pg.textContent = 'this run: ' + f4(r.point) + ', 95% of resamples between ' + f4(r.lo) + ' and ' + f4(r.hi);
    this.rs.textContent = 'mine ÷ autoplay\'s = ' + f2(r.point) + ', likely ' + f2(r.lo) + ' to ' + f2(r.hi) + ' on seed ' + this.seed;
    this.pw.textContent = 'same counts (longest 1% split), your seed: ' + f2(r.point) + ' ' + b + ' on seed ' + this.seed + '; ' + this.tail() +
      (this.seed === H.seed ? '' : '. published: ' + f2(H.bi) + ' [' + f2(H.ci[0]) + ', ' + f2(H.ci[1]) + '] on seed ' + H.seed);
    this.ms.textContent = fmt(r.B) + ' resamples in ' + fmt(Math.max(1, Math.round(r.ms))) + ' ms in this tab, nothing left it';
    this.cv.setAttribute('aria-label', 'histogram of ' + fmt(r.B) + ' resampled ratios, ' + (lo1 ? fmt(lo1) + ' of them at or below 1.00' : 'all above 1.00') + '; point ' + f4(r.point) + ', 95% interval ' + f4(r.lo) + ' to ' + f4(r.hi));
    this.draw();
  },

  /* the pour: release queued resamples at a pace a person can watch (about 1.6 s for the whole run however fast the
     worker is), each one a glyph falling into its column */
  tick() {
    if (this.raf || this.reduced) return;
    const step = (t) => {
      this.raf = 0;
      if (!this.mounted) return;
      const dt = Math.min(64, t - this.lastT); this.lastT = t;
      const g = this.geo();
      if (g) {
        const rel = Math.max(1, Math.ceil(this.B / 1600 * dt));
        for (let i = 0; i < rel && this.queue.length; i++) {
          const v = this.queue.shift(), c = this.col(v, g);
          if (this.drops.length > 260 || c < 0) { this.land(v); continue; }
          this.drops.push({ v, c, y: -g.ch * (1 + Math.random() * 3), vy: 0 });
        }
        const floor = g.base;
        for (let i = this.drops.length - 1; i >= 0; i--) {
          const p = this.drops[i]; p.vy += dt * 0.0026 * g.ch; p.y += p.vy * dt / 16;
          const top = floor - this.hgt(p.c, g) * g.ch;
          if (p.y >= top - g.ch * 0.5) { this.land(p.v); this.drops.splice(i, 1); }
        }
      } else { this.flush(); }
      if (this.res && !this.queue.length && !this.drops.length) {
        if (this.needle < 1) { this.needle = Math.min(1, this.needle + dt / 520); this.draw(); this.raf = requestAnimationFrame(step); return; }
        this.draw(); this.finish(); return;
      }
      this.draw();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },

  land(v) { this.lv.push(v); this.landed++; },

  geo() {
    const cv = this.cv, w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const fs = w < 380 ? 10 : 11, ch = Math.round(fs * 1.15), cw = fs * 0.62;
    const cols = Math.max(24, Math.floor(w / cw)), cwr = w / cols, rows = Math.floor(h / ch) - 3;
    return { w, h, dpr, fs, ch, cw: cwr, cols, rows, base: rows * ch, bw: (X1 - X0) / cols };
  },

  col(v, g) { const c = Math.floor((v - X0) / g.bw); return c < 0 || c >= g.cols ? -1 : c; },

  /* bins from the resamples that have landed so far */
  bins(g) {
    const b = new Float32Array(g.cols);
    for (const v of this.lv) { const c = this.col(v, g); if (c >= 0) b[c]++; }
    this.bc = b; return b;
  },

  hgt(c, g) { const b = this.bc; return b ? b[c] / (this.B * g.bw * 36) * g.rows : 0; },

  draw() {
    const g = this.geo(); if (!g) return;
    const x = this.cv.getContext('2d'), cs = getComputedStyle(this.root);
    const C = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    const INK = C('--ink', '#f0eaff'), MUTE = C('--mute', '#a49bbd'), ICE = C('--ice', '#86cbfe'), DIM = C('--violet-dim', '#6b5a86');
    x.setTransform(g.dpr, 0, 0, g.dpr, 0, 0); x.clearRect(0, 0, g.w, g.h);
    x.font = '500 ' + g.fs + 'px ' + (C('--mono', 'ui-monospace, monospace'));
    x.textAlign = 'center'; x.textBaseline = 'bottom';
    const cx = (c) => (c + 0.5) * g.cw, xv = (v) => (v - X0) / g.bw * g.cw;
    const b = this.bins(g), r = this.res, done = r && !this.queue.length && !this.drops.length;
    const cLo = done ? this.col(r.lo, g) : -1, cHi = done ? this.col(r.hi, g) : -1;
    /* the 1.00 line: no difference between the two arms */
    const c1 = this.col(1, g);
    x.fillStyle = DIM;
    for (let k = 0; k < g.rows; k++) x.fillText('¦', cx(c1), (k + 1) * g.ch);
    /* columns: full cells weave * and +, the top cell steps down the ramp by how full it is */
    for (let c = 0; c < g.cols; c++) {
      const h = Math.min(g.rows, b[c] / (this.B * g.bw * 36) * g.rows); if (h <= 0) continue;
      x.fillStyle = done && (c < cLo || c > cHi) ? DIM : INK;
      x.globalAlpha = done ? 1 : 0.86;
      const full = Math.floor(h), fr = h - full;
      for (let k = 0; k < full; k++) x.fillText(k % 2 ? '+' : '*', cx(c), g.base - k * g.ch);
      if (fr > 0.05 && full < g.rows) x.fillText(fr < 0.34 ? '.' : fr < 0.67 ? ':' : '+', cx(c), g.base - full * g.ch);
    }
    x.globalAlpha = 1;
    /* falling resamples */
    x.fillStyle = INK; x.globalAlpha = 0.55;
    for (const p of this.drops) x.fillText('o', cx(p.c), p.y + g.ch);
    x.globalAlpha = 1;
    /* axis: a dotted floor and three ticks */
    x.fillStyle = DIM;
    for (let c = 0; c < g.cols; c++) x.fillText('·', cx(c), g.base + g.ch);
    x.fillStyle = MUTE;
    [1, 1.05, 1.1].forEach((v) => x.fillText(f2(v), Math.min(g.w - 14, Math.max(14, xv(v))), g.base + g.ch * 2));
    if (done) {
      /* the interval, in ice: a bracket under the floor, its two ends at the 2.5th and 97.5th percentiles */
      x.fillStyle = ICE;
      const y = g.base + g.ch * 3;
      for (let c = cLo + 1; c < cHi; c++) x.fillText('-', cx(c), y);
      x.fillText('[', cx(cLo), y); x.fillText(']', cx(cHi), y);
      x.textAlign = 'left'; const lt = '95%: ' + f2(r.lo) + ' to ' + f2(r.hi), tw = x.measureText(lt).width;
      x.fillText(lt, Math.min(g.w - tw - 2, cx(cHi) + g.cw * 1.5), y);
      x.textAlign = 'center';
      /* the point lands on the floor (it never moves with the seed) */
      const cp = this.col(r.point, g), e = this.reduced ? 1 : 1 - Math.pow(1 - this.needle, 3), py = e * g.base;
      x.fillStyle = INK;
      for (let k = 0; k * g.ch < py; k++) x.fillText('|', cx(cp), py - k * g.ch);
      x.fillText('v', cx(cp), py);
      x.font = '600 ' + (g.fs + 1) + 'px ' + (C('--mono', 'monospace'));
      x.textAlign = cx(cp) > g.w - 60 ? 'right' : 'left';
      x.fillText(f4(r.point), cx(cp) + g.cw, Math.max(g.ch, py - g.ch * Math.max(1, g.rows - 2)));
      x.textAlign = 'center';
    }
  },
};
export default SW;
