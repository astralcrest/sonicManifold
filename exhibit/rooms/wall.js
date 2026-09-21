/* room 1 — the wall. one dot per play, left to right is seven years, all the same colour: that is what a
   streaming log says. press and hold: colour floods outward from the contact point, recolouring each dot
   by who pressed play. let go and it stops where it is. when the flood has covered the wall it sorts
   itself into three piles. data: exhibit/data/wall.json via ctx.identity(). */
function makeNoise(ac) {
  const len = Math.max(1, Math.floor(ac.sampleRate * 2)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
export default {
  id: 'wall', track: 'autotropic',
  ready: false, holding: false, r: 0, cx: 0, cy: 0, done: false, sorted: false, cell: 2, rows: 1, cols: 1, ox: 0, oy: 0, cap: 0,
  swellOn: false, swell: null,
  async mount(root, ctx) {
    const idn = await ctx.identity();
    const P = ctx.particles, n = P.n;
    const idx = Array.from({ length: n }, (_, i) => i); idx.sort((a, b) => P.prov[a] - P.prov[b] || a - b);
    this.order = new Uint32Array(n); idx.forEach((dot, k) => { this.order[dot] = k; });
    this.lit = new Uint8Array(n);
    this.counts = new Int32Array(3); for (let i = 0; i < n; i++) this.counts[P.prov[i]]++;
    /* exhibit/data/wall.json pct_rounded, resolved through ctx.identity() — the three percentages under the sorted piles */
    const pct = idn && idn.wall && idn.wall.pct_rounded; this.pctVals = pct ? [pct.tap, pct.shuffle, pct.served] : null;
    this.root = root;
    const sec = root.parentElement;
    this.say = sec.querySelector('#wall-say'); this.dim = sec.querySelector('#wall-dim'); this.legend = sec.querySelector('#wall-legend');
    /* #wall-say carries the flood's payoff line ("19% i tapped...") — announce it to screen readers when copy() rewrites it */
    if (this.say) { this.say.setAttribute('aria-live', 'polite'); this.say.setAttribute('aria-atomic', 'true'); }
    /* on a phone a long press selects text and any finger drift scrolls the page, which cancels the hold. the pad over the dots opts out of both */
    const pad = document.createElement('div'); pad.style.cssText = 'position:absolute;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none'; pad.addEventListener('contextmenu', (e) => e.preventDefault()); root.appendChild(pad); this.pad = pad;
    const cue = document.createElement('button'); cue.type = 'button'; cue.className = 'cue'; cue.textContent = 'press and hold'; cue.style.touchAction = 'none'; cue.addEventListener('contextmenu', (e) => e.preventDefault()); root.appendChild(cue); this.cue = cue;
    const down = (x, y) => { if (this.done) return this.reset(ctx); this.holding = true; if (this.r === 0) { this.cx = x; this.cy = y; } cue.style.opacity = '0'; this.startSwell(ctx); };
    const up = () => { this.holding = false; this._lt = 0; this.releaseSwell(ctx); if (!this.done && this.r > 0) { cue.textContent = 'keep holding'; cue.style.opacity = '.7'; } };
    this._down = down; this._up = up;
    /* bind only to this room's own surfaces, gated on the room being the one on screen: the shared full-viewport
       <section> stays hit-testable during a scroll-snap transition, so a press landing there while another room
       is active must not reset or re-target a wall that isn't showing */
    const live = () => sec.classList.contains('is-active');
    const onDown = (e) => { if (!live()) return; if (e.target.closest('a,button:not(.cue)')) return; down(e.clientX, e.clientY); };
    const onUp = () => { if (this.holding || this.swellOn) up(); };
    pad.addEventListener('pointerdown', onDown); cue.addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
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
    this.stageX = s.x; this.stageW = s.w; this.stageY = s.y; this.stageH = s.h;
  },
  layout(ctx) {
    const P = ctx.particles, rows = this.rows, cell = this.cell, ox = this.ox, oy = this.oy, sorted = this.sorted, order = this.order, cap = this.cap, n = P.n, keep = cap >= n ? 1 : cap / n;
    P.targetPx((i) => { let k = sorted ? order[i] : i; if (keep < 1) { const kk = Math.floor(k * keep); if (Math.floor((k + 1) * keep) === kk) return null; k = kk; } return [ox + Math.floor(k / rows) * cell, oy + (k % rows) * cell]; });
    /* pile label anchors, computed once here (not per frame): x = centre column of each provenance band, y = just under the grid */
    if (this.counts) {
      const c = this.counts, bounds = [0, c[0], c[0] + c[1], n], px = [];
      for (let p = 0; p < 3; p++) {
        const kA = Math.floor(bounds[p] * keep), kB = Math.max(kA, Math.floor(bounds[p + 1] * keep) - 1);
        px.push(ox + (Math.floor(kA / rows) + Math.floor(kB / rows) + 1) / 2 * cell);
      }
      this.pileX = px;
      const bottom = this.stageH != null ? this.stageY + this.stageH : oy + rows * cell + 16;
      this.pileY = Math.min(oy + rows * cell + 16, bottom - 12);
    }
  },
  paint(ctx) { const P = ctx.particles, lit = this.lit, W = ctx.PAL.white, C = ctx.PROV; P.color((i) => (lit[i] ? C[P.prov[i]] : W)); },
  /* once sorted, the "again" pill moves off the photographed pile: top-left of the stage, low opacity. re-applied
     in enter() too, so a return visit finds it already out of the way instead of re-centred */
  positionCue(ctx) {
    const s = ctx.stage();
    this.cue.style.left = (s.x + 46) + 'px';
    this.cue.style.top = (s.y - 4) + 'px';
    this.cue.style.opacity = '.45';
  },
  copy() {
    const st = this.done ? 2 : this.r > 0 ? 1 : 0;
    this.say.textContent = st === 0 ? 'this is what a streaming log says my taste is: one dot for every play, all of them the same colour.'
      : st === 1 ? 'the same wall, coloured by who pressed play. left to right is seven years.'
      : '19% i tapped. 17% i shuffled. 64% was served to me.';
    this.dim.textContent = st === 0 ? 'press and hold the wall.' + this.note : st === 1 ? 'keep holding.' : 'sorted: a taste profile built from this log is mostly a profile of an algorithm. tap the wall to run it again, or scroll on.';
    this.legend.hidden = st === 0;
    if (this.pad) this.pad.style.touchAction = this.cue.style.touchAction = this.done ? 'auto' : 'none'; /* once it is sorted, swipes over the wall scroll again */
  },
  reset(ctx) { this.teardownSwell(); ctx.audio.distant(0.5); this.r = 0; this._lt = 0; this._said = 0; this.done = false; this.sorted = false; this.lit.fill(0); ctx.particles.ease = 0.06; this.layout(ctx); this.paint(ctx); this.copy(); ctx.placeCue(this.cue); this.cue.textContent = 'press and hold'; this.cue.style.opacity = '1'; },
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.22; P.big = false; if (!this.ready) return;
    this.grid(ctx); this.layout(ctx); this.paint(ctx); this.copy(); ctx.placeCue(this.cue);
    ctx.audio.distant(this.done ? 0 : 0.5 * (1 - this.r / (this.maxR || 1)));
    { const s = ctx.stage(), p = this.pad.style; p.left = s.x + 'px'; p.top = s.y + 'px'; p.width = s.w + 'px'; p.height = s.h + 'px'; }
    if (ctx.reduced && !this.done) { this.lit.fill(1); this.done = true; this.sorted = true; this.layout(ctx); this.paint(ctx); this.copy(); this.cue.textContent = 'again'; }
    if (this.done) this.positionCue(ctx); /* a return visit to an already-sorted wall must not re-centre the pill */
    this._lt = 0;
  },
  leave(ctx) { this.holding = false; ctx.audio.distant(0); this.teardownSwell(); },
  /* --- the flood's own sound: a quiet rising filtered-noise swell under the visitor's hand, on top of the shared distant() sweep --- */
  startSwell(ctx) {
    const A = ctx.audio; if (!A.ac || A.muted || this.swellOn) return;
    const ac = A.ac; if (!this._noise) this._noise = makeNoise(ac);
    const src = ac.createBufferSource(); src.buffer = this._noise; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.value = 220;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    const g = ac.createGain(); g.gain.value = 0;
    if (pan) pan.pan.value = this.stageW ? Math.max(-1, Math.min(1, (this.cx - (this.stageX + this.stageW / 2)) / (this.stageW / 2))) : 0;
    src.connect(bp); if (pan) { bp.connect(pan); pan.connect(g); } else bp.connect(g);
    g.connect(A.sfx); src.start(); g.gain.setTargetAtTime(0.015, ac.currentTime, 0.3);
    this.swell = { src, bp, pan, g }; this.swellOn = true;
  },
  updateSwell(ctx) {
    if (!this.swellOn || !this.swell) return;
    const ac = ctx.audio.ac; if (!ac) return;
    const k = Math.min(1, this.r / (this.maxR || 1));
    this.swell.bp.frequency.setTargetAtTime(220 + k * 2600, ac.currentTime, 0.06);
    this.swell.g.gain.setTargetAtTime(Math.min(0.05, 0.012 + k * 0.038), ac.currentTime, 0.1);
  },
  releaseSwell(ctx) {
    if (!this.swellOn || !this.swell) { this.swellOn = false; return; }
    const A = ctx.audio, sw = this.swell; this.swellOn = false;
    if (!A.ac) return this.teardownSwell();
    const t = A.ac.currentTime; sw.g.gain.cancelScheduledValues(t); sw.g.gain.setTargetAtTime(0, t, 0.12);
    setTimeout(() => { if (this.swell === sw) this.swell = null; try { sw.src.stop(); } catch (e) {} try { sw.src.disconnect(); sw.bp.disconnect(); sw.pan && sw.pan.disconnect(); sw.g.disconnect(); } catch (e) {} }, 500);
  },
  teardownSwell() {
    if (this.swell) { const sw = this.swell; try { sw.src.stop(); } catch (e) {} try { sw.src.disconnect(); sw.bp.disconnect(); sw.pan && sw.pan.disconnect(); sw.g.disconnect(); } catch (e) {} }
    this.swell = null; this.swellOn = false;
  },
  drawLabels(g) {
    const v = this.pctVals, x = this.pileX, y = this.pileY; if (!v || !x) return;
    g.font = '11px ui-monospace,SFMono-Regular,Menlo,monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = 'rgba(216,210,234,.55)';
    if (v[0] != null) g.fillText(v[0] + '%', x[0], y);
    if (v[1] != null) g.fillText(v[1] + '%', x[1], y);
    if (v[2] != null) g.fillText(v[2] + '%', x[2], y);
  },
  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    if (this.holding && !this.done) {
      const dt = this._lt ? Math.min(64, t - this._lt) : 16.7; this._lt = t;
      this.r += 0.9 * dt; /* px per second from the frame timestamp, not per frame, so 120 Hz doesn't double the speed */
      ctx.audio.distant(Math.max(0, 0.5 * (1 - this.r / this.maxR))); /* the track opens up as the wall fills */
      const P = ctx.particles, n = P.n, lit = this.lit, TC = P.tc, C = ctx.PROV, prov = P.prov, r2 = this.r * this.r, cx = this.cx, cy = this.cy;
      for (let i = 0; i < n; i++) {
        if (lit[i]) continue;
        const dx = P.tx[i] - cx, dy = P.ty[i] - cy;
        if (dx * dx + dy * dy <= r2) {
          lit[i] = 1;
          /* write the packed colour directly (same expression as P.color/shell.js) instead of a full paint() pass over every dot */
          const v = C[prov[i]] >>> 0;
          TC[i] = 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff);
        }
      }
      this.updateSwell(ctx);
      g.strokeStyle = 'rgba(125,240,200,' + (0.35 + bands.low * 0.4) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, this.r, 0, 6.283); g.stroke();
      if (!this._said) { this._said = 1; this.copy(); }
      if (this.r > this.maxR) {
        this.done = true; this.holding = false; this.copy(); ctx.audio.distant(0); this.releaseSwell(ctx); ctx.audio.note(0, { dur: 1.6, vol: 0.05 }); ctx.audio.note(4, { at: 0.05, dur: 1.6, vol: 0.04 });
        setTimeout(() => { if (!this.done) return; this.sorted = true; ctx.particles.ease = 0.04; this.layout(ctx); this.cue.textContent = 'again'; this.positionCue(ctx); }, 900);
      }
    }
    if (this.sorted) this.drawLabels(g);
  },
  /* kiosk mode: nobody is present, so do the room's own gesture — hold from stage centre until the flood finishes */
  demo(ctx) {
    if (!this.ready || !this.root) return;
    const alive = () => this.root.parentElement.classList.contains('is-active'); if (!alive()) return;
    if (this.done) this.reset(ctx);
    const s = ctx.stage(); this._down(s.x + s.w / 2, s.y + s.h / 2);
    const poll = () => { if (!alive()) return; if (this.done) { this._up(); return; } requestAnimationFrame(poll); };
    requestAnimationFrame(poll);
  },
};
