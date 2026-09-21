/* room 1 — the wall. one dot per play, left to right is seven years, all the same colour: that is what a
   streaming log says. press and hold: colour floods outward from the contact point, recolouring each dot
   by who pressed play. let go and it stops where it is. when the flood has covered the wall it sorts
   itself into three piles. data: exhibit/data/wall.json via ctx.identity(). */
export default {
  id: 'wall', track: 'autotropic',
  ready: false, holding: false, r: 0, cx: 0, cy: 0, done: false, sorted: false, cell: 2, rows: 1, cols: 1, ox: 0, oy: 0, cap: 0,
  async mount(root, ctx) {
    await ctx.identity();
    const P = ctx.particles, n = P.n;
    const idx = Array.from({ length: n }, (_, i) => i); idx.sort((a, b) => P.prov[a] - P.prov[b] || a - b);
    this.order = new Uint32Array(n); idx.forEach((dot, k) => { this.order[dot] = k; });
    this.lit = new Uint8Array(n);
    const sec = root.parentElement;
    this.say = sec.querySelector('#wall-say'); this.dim = sec.querySelector('#wall-dim'); this.legend = sec.querySelector('#wall-legend');
    /* on a phone a long press selects text and any finger drift scrolls the page, which cancels the hold. the pad over the dots opts out of both */
    const pad = document.createElement('div'); pad.style.cssText = 'position:absolute;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none'; pad.addEventListener('contextmenu', (e) => e.preventDefault()); root.appendChild(pad); this.pad = pad;
    const cue = document.createElement('button'); cue.type = 'button'; cue.className = 'cue'; cue.textContent = 'press and hold'; cue.style.touchAction = 'none'; cue.addEventListener('contextmenu', (e) => e.preventDefault()); root.appendChild(cue); this.cue = cue;
    const down = (x, y) => { if (this.done) return this.reset(ctx); this.holding = true; if (this.r === 0) { this.cx = x; this.cy = y; } cue.style.opacity = '0'; };
    const up = () => { this.holding = false; if (!this.done && this.r > 0) { cue.textContent = 'keep holding'; cue.style.opacity = '.7'; } };
    sec.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button:not(.cue)')) return; down(e.clientX, e.clientY); });
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    cue.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { const s = ctx.stage(); down(s.x + s.w / 2, s.y + s.h / 2); } } });
    cue.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    this.note = P.perDot > 1.5 ? ' on this screen one dot is about ' + Math.round(P.perDot) + ' plays.' : '';
    this.ready = true;
  },
  grid(ctx) {
    /* pixel-exact: a whole number of device pixels per cell, or the wall shimmers with moire */
    const s = ctx.stage(), P = ctx.particles, n = P.n, d = P.dpr;
    let cell = Math.max(2, Math.floor(Math.sqrt((s.w * d) * (s.h * d) / n)));
    let cols = Math.floor((s.w * d) / cell), rows = Math.ceil(n / cols);
    while (rows * cell > s.h * d && cell > 2) { cell--; cols = Math.floor((s.w * d) / cell); rows = Math.ceil(n / cols); }
    const maxRows = Math.floor((s.h * d) / cell); if (rows > maxRows) rows = maxRows;
    this.cell = cell / d; this.cols = cols; this.rows = rows; this.cap = cols * rows; this.ox = s.x + (s.w - cols * this.cell) / 2; this.oy = s.y;
    this.maxR = Math.hypot(s.w, s.h) + 40;
  },
  layout(ctx) {
    const P = ctx.particles, rows = this.rows, cell = this.cell, ox = this.ox, oy = this.oy, sorted = this.sorted, order = this.order, cap = this.cap, n = P.n, keep = cap >= n ? 1 : cap / n;
    P.targetPx((i) => { let k = sorted ? order[i] : i; if (keep < 1) { const kk = Math.floor(k * keep); if (Math.floor((k + 1) * keep) === kk) return null; k = kk; } return [ox + Math.floor(k / rows) * cell, oy + (k % rows) * cell]; });
  },
  paint(ctx) { const P = ctx.particles, lit = this.lit, W = ctx.PAL.white, C = ctx.PROV; P.color((i) => (lit[i] ? C[P.prov[i]] : W)); },
  copy() {
    const st = this.done ? 2 : this.r > 0 ? 1 : 0;
    this.say.textContent = st === 0 ? 'this is what a streaming log says my taste is: one dot for every play, all of them the same colour.'
      : st === 1 ? 'the same wall, coloured by who pressed play. left to right is seven years.'
      : '19% i tapped. 17% i shuffled. 64% was served to me.';
    this.dim.textContent = st === 0 ? 'press and hold the wall.' + this.note : st === 1 ? 'keep holding.' : 'sorted: a taste profile built from this log is mostly a profile of an algorithm. scroll on.';
    this.legend.hidden = st === 0;
    if (this.pad) this.pad.style.touchAction = this.cue.style.touchAction = this.done ? 'auto' : 'none'; /* once it is sorted, swipes over the wall scroll again */
  },
  reset(ctx) { ctx.audio.distant(0.5); this.r = 0; this.done = false; this.sorted = false; this.lit.fill(0); ctx.particles.ease = 0.06; this.layout(ctx); this.paint(ctx); this.copy(); this.cue.textContent = 'press and hold'; this.cue.style.opacity = '1'; },
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.22; P.big = false; if (!this.ready) return;
    this.grid(ctx); this.layout(ctx); this.paint(ctx); this.copy(); ctx.placeCue(this.cue);
    ctx.audio.distant(this.done ? 0 : 0.5 * (1 - this.r / (this.maxR || 1)));
    { const s = ctx.stage(), p = this.pad.style; p.left = s.x + 'px'; p.top = s.y + 'px'; p.width = s.w + 'px'; p.height = s.h + 'px'; }
    if (ctx.reduced && !this.done) { this.lit.fill(1); this.done = true; this.sorted = true; this.layout(ctx); this.paint(ctx); this.copy(); this.cue.textContent = 'again'; }
  },
  leave(ctx) { this.holding = false; ctx.audio.distant(0); },
  frame(g, t, bands, w, h, ctx) {
    if (!this.ready || !this.holding || this.done) return;
    this.r += 15; /* ~900 px/s at 60 fps */
    ctx.audio.distant(Math.max(0, 0.5 * (1 - this.r / this.maxR))); /* the track opens up as the wall fills */
    const P = ctx.particles, n = P.n, lit = this.lit, r2 = this.r * this.r, cx = this.cx, cy = this.cy; let changed = false;
    for (let i = 0; i < n; i++) { if (lit[i]) continue; const dx = P.tx[i] - cx, dy = P.ty[i] - cy; if (dx * dx + dy * dy <= r2) { lit[i] = 1; changed = true; } }
    if (changed) this.paint(ctx);
    g.strokeStyle = 'rgba(125,240,200,' + (0.35 + bands.low * 0.4) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, this.r, 0, 6.283); g.stroke();
    if (this.r === 15) this.copy();
    if (this.r > this.maxR) {
      this.done = true; this.holding = false; this.copy(); ctx.audio.distant(0); ctx.audio.note(0, { dur: 1.6, vol: 0.05 }); ctx.audio.note(4, { at: 0.05, dur: 1.6, vol: 0.04 });
      setTimeout(() => { if (!this.done) return; this.sorted = true; ctx.particles.ease = 0.04; this.layout(ctx); this.cue.textContent = 'again'; this.cue.style.opacity = '.6'; }, 900);
    }
  },
};
