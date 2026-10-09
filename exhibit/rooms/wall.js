/* room 1 — the wall. one dot per play, left to right is seven years, all the same colour: that is what a
   streaming log says. press and hold: colour floods outward from the contact point, recolouring each dot
   by who pressed play. let go and it stops where it is. when the flood has covered the wall it sorts
   itself into three piles. data: exhibit/data/wall.json via ctx.identity().
   before the first hold a slider asks for a guess (of 100 plays, how many did i choose); the guess is kept in
   sessionStorage under GUESS_KEY so a re-walk skips the question and only shows the verdict after the sort.
   when the sort lands, the split is also played once per page load: 100 ticks over 2.4 s in sorted order, one
   per play-in-a-hundred, tapped on A5, shuffled on A4, served on A3 (needs sound on, not reduced motion).
   LABELS OWNER (exhibit/labels.js, wall.rows), suggested row:
     ['sound', 'when the piles land you hear the split once: 100 ticks in 2.4 seconds, 19 high for the plays i tapped, 17 in the middle for shuffle, 64 low for the ones served to me.']
   ATLAS MODE (BUILD_SPEC_V2 §3 wall row, brief R1). the wall is a categorical glyph field: every dot is one play, every
   character one cell of dots, and the character's SHAPE says who pressed play (° o O @ a tap, × x X % a shuffle, _ = ≡ ≣
   the queue; - / | \ only trace an edge) while the colour is one real member dot's colour, sampled, never averaged.
   before the flood every dot draws from the neutral family, in a graded dither so the block reads as texture and not
   a two-character barcode (see neutralTier below). the cell grid is a whole multiple of the dot pitch, centred between dots, so the grid never cuts a dot and
   at the closest zoom (z 5) one character is one dot. the pad goes through ctx.gesture: a press draws an ice ring at once,
   160 ms of stillness commits the flood at the world point under the finger, a move of 6 px first pans instead, a quick
   tap says "press and hold". the flood's centre and radius live in world px, so they ride the camera. the pile names are
   region labels over the sorted piles; the pile percentages stay exact numbers on the overlay (D3). no idle drift here.
   at ?atlas=0 none of this runs: the pad keeps its own pointerdown, the window pointerup, and today's touch-action. */
const GUESS_KEY = 'exhibit.wall.guess';
const TICK_STEP = [8, 3, -2]; /* tapped A5, shuffled A4, served A3: octaves of the same note, so the count reads as one line at three heights */
/* categorical glyph families by P.cat: 1..3 = P.prov + 1 once flooded. before the flood every dot is neutral, but not
   all through ONE cap (round 2, W(barcode)): glyphfield's picker always spends a cell's TOP tone on the last two marks
   of its family once that cell's count clears the frame's own quantile — and on this wall almost every cell does, since
   the block is far denser than the sparse background dust that pulls the quantile down. one cap for the whole wall
   therefore drew '+'/'*' in over half its cells (measured: 50%/21%), a two-character field dressed as four. three caps,
   thirds of the unflooded dots each (neutralTier, a fixed per-dot hash — never reshuffled, so a cell's mix is steady
   frame to frame): the sparsest cap (2: `. '`) as often as the mid cap (3: `' +`) as often as the full cap (4: `+ *`)
   spreads the wall's top tone across all four marks instead of piling it on the last one (measured after: worst mark
   35%). `max` truncates a family to its first N marks, so no cap can print a mark past its own number: 4 (`. ' + *`) is
   still the original wall (this app's own default touch, still used for the flooded provenance families below, whose
   3-mark families never hit this), 2 stops at `. '`, 3 at `. ' +`. */
const CATS = [{ family: 'neutral', max: 4 }, { family: 'tap' }, { family: 'shuffle' }, { family: 'served' },
  { family: 'neutral', max: 2 }, { family: 'neutral', max: 3 }];
/* an unflooded dot's cap, by cat index (0/4/5 -> max 4/2/3): a hash of the dot alone (ctx.hash, the same fixed
   per-index PRNG P.prov itself is drawn from at load), salted apart from prov's own draw so a dot's tier and its
   eventual provenance are two independent coin flips, not one number read twice */
const neutralTier = (i, ctx) => { const u = ctx.hash(i * 97 + 11); return u < 1 / 3 ? 4 : u < 2 / 3 ? 5 : 0; };
const TOUCH_MQ = '(pointer:coarse),(max-aspect-ratio:115/100)'; /* anchors.js: where a tappable label carries its 44 px pad */
const PILE_NAMES = ['i tapped', 'shuffle', 'the queue'];
const HOLD_MS = 160, ZMAX = 5, TAU = 6.283185307179586;
const ctx0 = { debug: false };
function makeNoise(ac) {
  const len = Math.max(1, Math.floor(ac.sampleRate * 2)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
export default {
  id: 'wall', track: 'tryin',
  ready: false, holding: false, r: 0, cx: 0, cy: 0, done: false, sorted: false, cell: 2, rows: 1, cols: 1, ox: 0, oy: 0, cap: 0,
  swellOn: false, swell: null,
  async mount(root, ctx) {
    this.A = !!(ctx.atlas && ctx.atlas.on); this.prec = []; this.reducedMotion = !!ctx.reduced;
    const idn = await ctx.identity();
    const P = ctx.particles, n = P.n;
    const idx = Array.from({ length: n }, (_, i) => i); idx.sort((a, b) => P.prov[a] - P.prov[b] || a - b);
    this.order = new Uint32Array(n); idx.forEach((dot, k) => { this.order[dot] = k; });
    this.lit = new Uint8Array(n);
    this.counts = new Int32Array(3); for (let i = 0; i < n; i++) this.counts[P.prov[i]]++;
    /* exhibit/data/wall.json pct_rounded, resolved through ctx.identity() — the three percentages under the sorted piles */
    const pct = idn && idn.wall && idn.wall.pct_rounded; this.pctVals = pct ? [pct.tap, pct.shuffle, pct.served] : null;
    this.total = idn && idn.wall && typeof idn.wall.total === 'number' ? idn.wall.total : 97427; this.nLit = 0;
    this.root = root;
    const sec = root.parentElement;
    this.say = sec.querySelector('#wall-say'); this.dim = sec.querySelector('#wall-dim'); this.legend = sec.querySelector('#wall-legend');
    /* #wall-say carries the flood's payoff line ("19% i tapped...") — announce it to screen readers when copy() rewrites it */
    if (this.say) { this.say.setAttribute('aria-live', 'polite'); this.say.setAttribute('aria-atomic', 'true'); }
    /* on a phone a long press selects text and any finger drift scrolls the page, which cancels the hold. the pad over the dots opts out of both */
    const pad = document.createElement('div'); pad.style.cssText = 'position:absolute;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none'; pad.addEventListener('contextmenu', (e) => e.preventDefault()); root.appendChild(pad); this.pad = pad;
    const cue = document.createElement('button'); cue.type = 'button'; cue.className = 'cue'; cue.textContent = 'press and hold'; cue.style.touchAction = 'none'; cue.addEventListener('contextmenu', (e) => e.preventDefault()); root.appendChild(cue); this.cue = cue;
    /* the guess: read once, asked once. sessionStorage can throw in private windows, so every touch of it is guarded */
    this.guess = null; try { const g = sessionStorage.getItem(GUESS_KEY); if (g != null && g !== '' && isFinite(+g)) this.guess = Math.max(0, Math.min(100, Math.round(+g))); } catch (e) {}
    this.kiosk = document.documentElement.classList.contains('kiosk');
    if (this.dim && !sec.querySelector('#wall-verdict')) {
      const v = document.createElement('p'); v.className = 'say dim'; v.id = 'wall-verdict'; v.hidden = true; v.setAttribute('aria-live', 'polite');
      this.dim.insertAdjacentElement('afterend', v); this.verdict = v;
    } else this.verdict = sec.querySelector('#wall-verdict');
    if (!this.kiosk) this.buildGuess(root);
    const down = (x, y) => { if (this.done) return this.reset(ctx); this.holding = true; if (this.r === 0) { this.cx = x; this.cy = y; this.commitGuess(); if (this.A) { this.reach(); this.syncAngle(ctx, 'flood'); } } cue.style.opacity = '0'; this.startSwell(ctx); };
    const up = () => { this.holding = false; this._lt = 0; this.viaCue = false; this.releaseSwell(ctx); if (!this.done && this.r > 0) { cue.textContent = 'keep holding'; cue.style.opacity = '.7'; } };
    this._down = down; this._up = up;
    /* bind only to this room's own surfaces, gated on the room being the one on screen: the shared full-viewport
       <section> stays hit-testable during a scroll-snap transition, so a press landing there while another room
       is active must not reset or re-target a wall that isn't showing */
    const live = () => sec.classList.contains('is-active');
    this.live = live;
    /* atlas: the wall lives in world px under the camera, so every screen point is unapplied first (identity at home) */
    const toW = (x, y) => (this.A ? ctx.view.unapply(x, y) : [x, y]);
    const onDown = (e) => { if (!live()) return; if (e.target.closest('a,button:not(.cue)')) return; if (this.A) this.viaCue = e.currentTarget === cue; const w = toW(e.clientX, e.clientY); down(w[0], w[1]); };
    /* atlas: the pad's release arrives through ctx.gesture (hold.end); the window listener is only the cue's way out */
    const onUp = () => { if (this.A && !this.viaCue) return; if (this.holding || this.swellOn) up(); };
    if (!this.A) pad.addEventListener('pointerdown', onDown);
    cue.addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
    if (this.A) { this.spec = this.holdSpec(ctx, false); ctx.gesture.bind(pad, this.spec); }
    cue.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { const s = ctx.stage(), w = toW(s.x + s.w / 2, s.y + s.h / 2); if (this.A) this.viaCue = true; down(w[0], w[1]); } } });
    cue.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    this.note = P.perDot > 1.5 ? ' on this screen one dot is about ' + Math.round(P.perDot) + ' plays.' : '';
    /* R11 PRESS: w pulls the press from anywhere; on the press it slips the plates or sets them back in register */
    if (this.A && ctx.keys && ctx.keys.on) ctx.keys.on('w', () => { if (this.live() && this.riso) this.riso.flip(); else ctx.go('wall', { via: 'key', angle: 'press' }); return true; });
    this.ready = true;
  },
  grid(ctx) {
    /* pixel-exact: a whole number of device pixels per cell, or the wall shimmers with moire */
    const s = ctx.stage(), P = ctx.particles, n = P.n, d = P.dpr;
    let cell = Math.max(2, Math.floor(Math.sqrt((s.w * d) * (s.h * d) / n)));
    let cols = Math.floor((s.w * d) / cell), rows = Math.ceil(n / cols);
    while (rows * cell > s.h * d && cell > 2) { cell--; cols = Math.floor((s.w * d) / cell); rows = Math.ceil(n / cols); }
    const maxRows = Math.floor((s.h * d) / cell); if (rows > maxRows) rows = maxRows;
    const ox0 = this.ox, oy0 = this.oy;
    this.cell = cell / d; this.cols = cols; this.rows = rows; this.cap = cols * rows; this.ox = s.x + (s.w - cols * this.cell) / 2; this.oy = s.y;
    /* atlas: a relayout mid-flood (the chrome settling after the first press arms the sound) moves the wall in world px;
       the flood's centre moves with it, so it stays on the dot that was pressed */
    if (this.A && this.r > 0 && !this.done) { this.cx += this.ox - ox0; this.cy += this.oy - oy0; }
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
      /* atlas: each pile's left edge, for the region labels */
      this.pileL = [0, 1, 2].map((p) => ox + Math.floor(Math.floor(bounds[p] * keep) / rows) * cell);
      const bottom = this.stageH != null ? this.stageY + this.stageH : oy + rows * cell + 16;
      this.pileY = Math.min(oy + rows * cell + 16, bottom - 12);
      /* on a short phone the sorted wall's text (legend + verdict) grows up into the band under the grid. nudge the labels
         up while they still fit between grid and text; when they no longer fit, drop them: the legend in the text carries
         the same three numbers */
      const wl = this.root && this.root.parentElement && this.root.parentElement.querySelector('.wall');
      if (wl) {
        const r = wl.getBoundingClientRect();
        if (r.width && r.right > ox && r.left < ox + this.cols * cell && r.top < this.pileY + 14) this.pileY = r.top - 15 >= oy + rows * cell + 4 ? r.top - 15 : -1;
      }
    }
  },
  paint(ctx) {
    const P = ctx.particles, lit = this.lit, W = ctx.PAL.white, C = ctx.PROV;
    /* atlas, unsorted (R1-c, beauty P2-10): a flat white grid reads as a hard-edged slab. the unlit dots dim
       toward black over the outer 8% of the slab (both axes, so a corner — close to two edges at once — dims
       fastest, the ordinary vignette shape). a pure brightness scale, every channel by the same factor, not a
       blend toward the field's own background: atlas_d2's colour=glyph classifier reads normalized hue only
       (scale-invariant by construction), and blending toward bg's own blue-leaning near-black tint crossed, at
       mid fade, into 'served's hue (misread as neutral->served on ~10% of the unflooded cells); a uniform scale
       leaves white's own ratio exactly where it started at every step, so it can never drift into another
       category's hue. floored (not to 0) so the true edge cell keeps a hue at all, rather than degenerate black.
       sorted keeps the flat piles: a fading provenance colour would read as a claim about confidence that is not
       there. */
    if (this.A && !this.sorted && this.cols > 1 && this.rows > 1) {
      const wR = (W >> 16) & 0xff, wG = (W >> 8) & 0xff, wB = W & 0xff, rows = this.rows, cols = this.cols, EDGE = 0.08;
      P.color((i) => {
        if (lit[i]) return C[P.prov[i]];
        const col = Math.floor(i / rows), row = i % rows;
        const fx = Math.min(col, cols - 1 - col) / (cols - 1), fy = Math.min(row, rows - 1 - row) / (rows - 1);
        const t = Math.max(0.12, Math.min(1, Math.min(fx, fy) / EDGE));
        return (Math.round(wR * t) << 16) | (Math.round(wG * t) << 8) | Math.round(wB * t);
      });
    } else P.color((i) => (lit[i] ? C[P.prov[i]] : W));
    if (this.A) { let k = 0; for (let i = 0; i < lit.length; i++) k += lit[i]; this.nLit = k; }
    if (this.A && this.live && this.live()) { const prov = P.prov; P.catBy((i) => (lit[i] ? prov[i] + 1 : neutralTier(i, ctx))); }
  },
  /* --- the guess. one quiet line under the cue, a range input in ice, the number printed live. sits in the room-body
     (viewport coordinates) so it can never push the wall text; placeGuess() puts it just under the cue --- */
  buildGuess(root) {
    if (!document.getElementById('wall-guess-css')) {
      const st = document.createElement('style'); st.id = 'wall-guess-css';
      st.textContent = '.wg{position:absolute;transform:translateX(-50%);width:min(320px,calc(100vw - 32px));box-sizing:border-box;text-align:center;font:500 11.5px/1.45 var(--mono);letter-spacing:.02em;color:var(--mute);background:rgba(10,1,24,.86);border:1px solid var(--line);border-radius:12px;padding:10px 14px 6px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:opacity .35s ease}'
        + '.wg[hidden]{display:none}.wg label{display:block;margin:0 0 4px;cursor:default}'
        + '.wg input[type=range]{-webkit-appearance:none;appearance:none;display:block;width:100%;height:28px;margin:0;background:transparent;touch-action:none;cursor:pointer;accent-color:var(--ice)}'
        + '.wg input[type=range]::-webkit-slider-runnable-track{height:2px;background:rgba(134,203,254,.38);border-radius:1px}'
        + '.wg input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--ice);border:0;margin-top:-7px}'
        + '.wg input[type=range]::-moz-range-track{height:2px;background:rgba(134,203,254,.38);border-radius:1px}'
        + '.wg input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--ice);border:0}'
        + '.wg input[type=range]:focus-visible{outline:2px solid var(--ice);outline-offset:2px;border-radius:4px}'
        + '.wg .wg-out{display:block;margin-top:2px;font-weight:600;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ice)}'
        /* a gallery screen: a 320px card with 11.5px type is a postcard on a 2560px wall */
        + '@media (min-width:1600px){.wg{width:min(440px,calc(100vw - 32px));font-size:clamp(11.5px,.72vw,17px);padding:14px 20px 10px}.wg .wg-out{font-size:clamp(10.5px,.64vw,15px)}}'
        /* atlas (fix r3, REQUESTS_fix_r3_R2 #1b, REQUESTS_fix_r3_M1 #1): the guess slider's own box is a 44 px target, its
           margins taking the extra height back so the card keeps its size (track and thumb are drawn centred); and the
           press-and-hold pill gets a solid ground, since the woven glyph wall ran straight through its words */
        + 'html.atlas .wg input[type=range]{height:44px;margin:-8px 0}'
        + 'html.atlas section[data-room=wall] .cue{background:rgba(10,1,24,.94);border-color:rgba(134,203,254,.35)}'
        /* R1-a: on a phone the card itself was 11.4% of the chrome budget on top of PRESS AND HOLD (r2_M3 k1). the
           question is already read out by the caption (tours.js), so the label collapses to a11y-only text and the
           slider + its live "you say N" share one <=56px row with no card box at all -- data-keepout (JS) keeps a
           floating [ name ] label off it the same way any other real chrome does. */
        + '@media (max-width:520px){html.atlas .wg{background:none;border:0;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;border-radius:0;padding:0;width:min(300px,calc(100vw - 32px));display:flex;align-items:center;gap:8px;max-height:56px}'
        + 'html.atlas .wg label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}'
        + 'html.atlas .wg input[type=range]{flex:1 1 auto;width:auto;height:44px;margin:0}'
        + 'html.atlas .wg .wg-out{flex:0 0 auto;display:inline;margin:0;font-size:10px}}';
      document.head.appendChild(st);
    }
    const wg = document.createElement('div'); wg.className = 'wg'; wg.hidden = true; wg.setAttribute('data-keepout', '');
    wg.addEventListener('contextmenu', (e) => e.preventDefault());
    const lab = document.createElement('label'); lab.htmlFor = 'wall-guess'; lab.className = 'ai-voice-p'; lab.textContent = 'before you press: of every 100 of my plays, how many do you think i chose myself?';
    const inp = document.createElement('input'); inp.type = 'range'; inp.id = 'wall-guess'; inp.min = '0'; inp.max = '100'; inp.step = '1'; inp.value = '50';
    inp.setAttribute('aria-label', 'your guess: of every 100 of my plays, how many i chose myself'); inp.setAttribute('aria-valuetext', 'you say 50');
    /* the number in print only: the slider's own aria-valuetext already says it, so this is not a live region (it used to be an <output>, role=status, and every arrow was read twice) */
    const out = document.createElement('span'); out.className = 'wg-out'; out.id = 'wall-guess-out'; out.setAttribute('aria-hidden', 'true'); out.textContent = 'you say 50';
    inp.addEventListener('input', () => { out.textContent = 'you say ' + inp.value; inp.setAttribute('aria-valuetext', 'you say ' + inp.value); });
    wg.append(lab, inp, out); root.appendChild(wg); this.wg = wg; this.wgIn = inp;
  },
  commitGuess() {
    if (!this.wg || this.wg.hidden || this.guess != null) return;
    const g = Math.max(0, Math.min(100, Math.round(+this.wgIn.value) || 0)); this.guess = g;
    try { sessionStorage.setItem(GUESS_KEY, String(g)); } catch (e) {}
    this.wg.hidden = true;
  },
  /* R1-c (beauty P2-10): on a wide screen the grid fills only part of the stage's height (it is square-ish, the
     stage is not), so centring the card in the STAGE sat it and the hold pill on the slab's own lower middle,
     with the empty part of the stage wasted below. both now stand in that empty part instead, stacked under the
     slab's true bottom edge (this.oy + this.rows*this.cell, not the stage's), only when there is room for them
     there; short landscape windows and portrait phones (R1-a owns their own, compact placement) keep the old
     centred-in-stage fallback. */
  belowSlab(ctx) {
    if (!this.A || this.done || !(this.rows > 0) || !(this.cell > 0)) return null;
    if (!(innerWidth > innerHeight * 1.15)) return null;
    const s = ctx.stage(), slabB = this.oy + this.rows * this.cell;
    if (s.y + s.h - slabB < 90) return null; /* not enough clearance below the slab for the pill and the card */
    return { cx: this.ox + this.cols * this.cell / 2, slabB, s };
  },
  placeGuess(ctx) {
    if (!this.wg) return;
    const b = this.belowSlab(ctx);
    if (b) {
      this.wg.style.left = Math.round(b.cx) + 'px';
      const cueB = this.cue && this.cue.style.top ? this.cue.getBoundingClientRect().bottom : b.slabB + 14;
      const hh = this.wg.offsetHeight, top0 = Math.max(b.slabB + 14, cueB + 12);
      this.wg.style.top = Math.round(hh ? Math.min(top0, b.s.y + b.s.h - hh) : top0) + 'px';
      return;
    }
    const s = ctx.stage(); this.wg.style.left = (s.x + s.w / 2) + 'px';
    let t = Math.round(s.y + s.h / 2 + 30);
    /* the panel is ~110px tall and grows as the label wraps; on a short phone half-the-stage-plus-30 put its
       bottom edge on the kicker. keep it inside the stage. offsetHeight is 0 while it is hidden, and copy()
       has already settled hidden by the time enter() places it. */
    const hh = this.wg.offsetHeight;
    if (hh) t = Math.max(Math.round(s.y), Math.min(t, Math.round(s.y + s.h - hh)));
    this.wg.style.top = t + 'px';
  },
  /* the initial (unsorted) hold pill: ctx.placeCue's own stage-centre fy=0.5 is what put it on the slab. */
  placeCueUnsorted(ctx) {
    ctx.placeCue(this.cue);
    /* .cue centres on its own `top` (transform:translate(-50%,-50%)), unlike .wg's plain top edge */
    const b = this.belowSlab(ctx); if (b) this.cue.style.top = Math.round(b.slabB + 14 + (this.cue.offsetHeight || 44) / 2) + 'px';
  },
  /* shown only while the wall is still white and untouched, and only until a guess exists */
  syncGuess() { if (this.wg) this.wg.hidden = !(this.guess == null && !this.done && this.r === 0); },
  verdictText() {
    const g = this.guess; if (g == null) return '';
    const T = this.pctVals && this.pctVals[0] != null ? this.pctVals[0] : 19, d = g - T;
    /* nobody's guesses are collected, so the verdict only states the gap: no claim about what other visitors say */
    return 'you said ' + g + '. it was ' + T + '. ' + (Math.abs(d) <= 5 ? 'close.' : d > 0 ? 'you had me ' + d + ' points above the log.' : 'you had me ' + (-d) + ' points below the log.');
  },
  /* --- the split as sound: 100 ticks over 2.4 s in sorted order, once per page load. a count you can hear, not a jingle --- */
  playSplit(ctx) {
    if (this._ticked) return; const A = ctx.audio; if (!A || !A.on || A.muted || ctx.reduced) return;
    this._ticked = true;
    const v = this.pctVals || [19, 17, 64], seq = [];
    for (let p = 0; p < 3 && seq.length < 100; p++) for (let k = 0; k < (v[p] || 0) && seq.length < 100; k++) seq.push(p);
    while (seq.length < 100) seq.push(2);
    /* dip the bed a little so the ticks read; level() restores it from state, so a mute or a clip mid-way is not undone */
    if (A.gain && A.ac && !A.ducked) { A.gain.gain.setTargetAtTime(0.5, A.ac.currentTime, 0.2); setTimeout(() => { try { A.level(); } catch (e) {} }, 2900); }
    for (let i = 0; i < 100; i++) A.note(TICK_STEP[seq[i]], { at: 0.05 + i * 0.024, dur: 0.05, vol: 0.03, type: 'triangle' });
  },
  /* once sorted, the "again" pill moves off the photographed pile: above the stage on wide screens, inside it on a phone. re-applied
     in enter() too, so a return visit finds it already out of the way instead of re-centred */
  positionCue(ctx) {
    const s = ctx.stage(), cs = this.cue.style;
    /* atlas: the pill goes under the bottom-right corner of the grid, clear of the pile names above it and the
       percentages under each pile's middle; on a short stage it falls back to the same search as today */
    if (this.A && this.cols && this.pileY >= 0) {
      const right = this.ox + this.cols * this.cell, y = this.pileY + 36;
      if (y + 22 <= s.y + s.h) { cs.opacity = '.75'; cs.transform = ''; cs.left = Math.round(right - 54) + 'px'; cs.top = Math.round(y) + 'px'; return; }
    }
    cs.opacity = '.75';
    /* wide screens have headroom above the wall: the pill sits there, top-left of the stage */
    cs.transform = ''; cs.left = (s.x + 46) + 'px'; cs.top = (s.y - 26) + 'px';
    const hdr = [...document.querySelectorAll('#top a, #top button')].filter((el) => el && !el.hidden) /* R13: every header control (the atlas menu too: `again` sat on `dig /` sideways) */.map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height);
    const hit = (a, b) => a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 4 && a.bottom > b.top - 4;
    const rw = this.cue.getBoundingClientRect(); if (!hdr.some((b) => hit(rw, b))) return;
    /* on a phone the header is right there, and a tap on the pill landed on the back link. so the pill goes inside the
       stage, bottom-left, clear of the pile labels and the wall text; failing that, under the lowest label; failing that,
       just above the label row */
    cs.transform = 'none'; cs.left = '0px'; cs.top = '0px';
    const r0 = this.cue.getBoundingClientRect(), w = r0.width, h = r0.height, L = s.x + 12;
    const boxes = hdr.slice(), sec = this.root.parentElement;
    const add = (el) => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width && r.height) boxes.push(r); };
    sec.querySelectorAll('.wall *').forEach((el) => { if (!el.firstElementChild && el.textContent.trim()) add(el); });
    add(this.verdict);
    const hasLab = this.sorted && this.pileX && this.pileY >= 0;
    if (hasLab) for (const x of this.pileX) boxes.push({ left: x - 16, right: x + 16, top: this.pileY - 3, bottom: this.pileY + 14 });
    const free = (T) => !boxes.some((b) => hit({ left: L, right: L + w, top: T, bottom: T + h }, b));
    const cands = [s.y + s.h - 48];
    if (hasLab) cands.push(this.pileY + 16, this.pileY - 7 - h);
    let T = cands.find(free); if (T == null) T = cands[cands.length - 1];
    cs.left = (L - r0.left) + 'px'; cs.top = (T - r0.top) + 'px';
  },
  copy() {
    const st = this.done ? 2 : this.r > 0 ? 1 : 0;
    /* write only on a real change: #wall-say and #wall-verdict are live, and a same-text rewrite (every enter()) is read out again */
    const put = (el, s) => { if (el.textContent !== s) el.textContent = s; };
    put(this.say, st === 0 ? 'this is what a streaming log says my taste is: one dot for every play, all of them the same colour.'
      : st === 1 ? 'the same wall, coloured by who pressed play. left to right is ' + (this.A ? 'the whole log.' : 'seven years.')
      : '19% i tapped. 17% i shuffled. 64% was served to me.');
    /* round 2, W(overclaim): "mostly a profile of an algorithm" read as a causal claim the data doesn't carry. served
       (63.5%) is an upper bound on algorithm — it is everything the log can't tell apart from an algorithm, including my
       own albums and playlists running on with shuffle off (main.tex L360/L394(iii): context_uri is absent, so a
       served play with no shuffle is indistinguishable from one my own queue kept going). the honest claim is about who
       STARTED the play, not who chose it. */
    /* R2V2P finding (D4): this honesty rewrite belongs to the atlas branch only. ?atlas=0 must stay pixel-identical
       to HEAD (2d1d313), so the legacy branch keeps HEAD's own words verbatim rather than the corrected copy. */
    put(this.dim, st === 0 ? 'press and hold the wall.' + this.note : st === 1 ? 'keep holding.' : this.A ? 'sorted: most of this log was started by the queue or shuffle, not by me, so a taste profile built from it profiles them too. tap the wall to run it again.' : 'sorted: a taste profile built from this log is mostly a profile of an algorithm. tap the wall to run it again, or scroll on.');
    this.legend.hidden = st === 0;
    /* the verdict waits for the piles to land, then is said once; hidden before it is emptied so the clear is never read */
    if (this.verdict) { const vt = this.sorted ? this.verdictText() : ''; if (!vt) this.verdict.hidden = true; put(this.verdict, vt); if (vt) this.verdict.hidden = false; }
    this.syncGuess();
    if (this.pad) this.pad.style.touchAction = this.cue.style.touchAction = this.done && !this.A ? 'auto' : 'none'; /* once it is sorted, swipes over the wall scroll again (atlas: the page never scrolls; the field owns every touch) */
  },
  reset(ctx) { this.unpour(ctx, 2); this.teardownSwell(); ctx.audio.distant(0.5); this.r = 0; this._lt = 0; this._said = 0; this.done = false; this.sorted = false; this.lit.fill(0); ctx.particles.ease = 0.06; this.layout(ctx); this.paint(ctx); this.copy(); this.cue.style.transform = ''; this.placeCueUnsorted(ctx); this.placeGuess(ctx); this.cue.textContent = 'press and hold'; this.cue.style.opacity = '1'; if (this.A) { this.press = null; this.atlasLabels(ctx); this.syncAngle(ctx, 'unsorted'); } },
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.22; P.big = false; if (!this.ready) return;
    this.grid(ctx); this.layout(ctx); this.paint(ctx); this.copy(); this.placeCueUnsorted(ctx); this.placeGuess(ctx);
    ctx.audio.distant(this.done ? 0 : 0.5 * (1 - this.r / (this.maxR || 1)));
    { const s = ctx.stage(), p = this.pad.style; p.left = s.x + 'px'; p.top = s.y + 'px'; p.width = s.w + 'px'; p.height = s.h + 'px'; }
    if (ctx.reduced && !this.done) { this.lit.fill(1); this.done = true; this.sorted = true; this.copy(); this.layout(ctx); this.paint(ctx); this.cue.textContent = 'again'; } /* copy() before layout(): the pile labels are placed against the sorted text, which copy() just grew */
    if (this.done) this.positionCue(ctx); /* a return visit to an already-sorted wall must not re-centre the pill */
    this._lt = 0;
    if (this.A) this.atlasEnter(ctx);
    if (this.pour) { this.pour.fit(); this.syncAngle(ctx, 'pour'); }
    if (this.riso) this.riso.fit();
  },
  leave(ctx) { this.unpour(ctx); this.unpress(); this.holding = false; this.press = null; this.viaCue = false; if (this.flood) { cancelAnimationFrame(this.flood); this.flood = 0; } ctx.audio.distant(0); this.teardownSwell(); },
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
  drawLabels(g, k = 1) {
    const v = this.pctVals, x = this.pileX, y = this.pileY; if (!v || !x || y < 0) return;
    /* k = 1 / camera zoom: the numbers are anchored in world px and keep their screen size (identity at home, and at ?atlas=0) */
    g.font = (11 * k) + 'px ui-monospace,SFMono-Regular,Menlo,monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = 'rgba(216,210,234,.55)';
    if (v[0] != null) g.fillText(v[0] + '%', x[0], y);
    if (v[1] != null) g.fillText(v[1] + '%', x[1], y);
    if (v[2] != null) g.fillText(v[2] + '%', x[2], y);
    if (ctx0.debug) for (let p = 0; p < 3; p++) if (v[p] != null) this.prec.push({ id: 'pile' + p, text: v[p] + '%', wx: x[p], wy: y });
  },
  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    const k = this.A ? 1 / (ctx.view.z || 1) : 1;
    if (this.A) { ctx0.debug = !!ctx.atlas.debug; this.prec.length = 0; if (this.riso) return; if (this.pour) { this.pour.frame(g, t, k); return this.handDraw(ctx, g, k); } this.drawMargin(g, k, ctx); if (this.press) this.drawPress(g, k); }
    if (this.holding && !this.done) {
      const dt = this._lt ? Math.min(64, t - this._lt) : 16.7; this._lt = t;
      this.r += 0.9 * dt; /* px per second from the frame timestamp, not per frame, so 120 Hz doesn't double the speed */
      ctx.audio.distant(Math.max(0, 0.5 * (1 - this.r / this.maxR))); /* the track opens up as the wall fills */
      const P = ctx.particles, n = P.n, lit = this.lit, TC = P.tc, C = ctx.PROV, prov = P.prov, r2 = this.r * this.r, cx = this.cx, cy = this.cy, CAT = this.A ? P.cat : null;
      for (let i = 0; i < n; i++) {
        if (lit[i]) continue;
        const dx = P.tx[i] - cx, dy = P.ty[i] - cy;
        if (dx * dx + dy * dy <= r2) {
          lit[i] = 1;
          if (CAT) { CAT[i] = prov[i] + 1; this.nLit++; } /* the glyph's shape turns with its colour */
          /* write the packed colour directly (same expression as P.color/shell.js) instead of a full paint() pass over every dot */
          const v = C[prov[i]] >>> 0;
          TC[i] = 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff);
        }
      }
      this.updateSwell(ctx);
      if (this.A) this.hudFlood(ctx, t);
      /* atlas: the flood front is interface, so it is ice (mint is reserved for the plays i tapped) */
      g.strokeStyle = (this.A ? 'rgba(134,203,254,' : 'rgba(125,240,200,') + (0.35 + bands.low * 0.4) + ')'; g.lineWidth = 1.5 * k; g.beginPath(); g.arc(cx, cy, this.r, 0, 6.283); g.stroke();
      if (!this._said) { this._said = 1; this.copy(); }
      if (this.r > this.maxR) {
        this.done = true; this.holding = false; this.copy(); ctx.audio.distant(0); if (this.A) this.hudFlood(ctx, t); this.releaseSwell(ctx);
        /* atlas: the front has passed the whole stage, so every play is lit, including the ones the grid had no cell for
           (a wall smaller than the log, e.g. a phone on its side: 23,625 cells for 24,357 dots, the rest parked off stage and
           so never reached). the sort picks the parked ones by sorted rank, so without this 732 unlit dots landed inside
           the piles as neutral cells (D2). the reduced-motion path and the flood angle already light everything */
        if (this.A) { this.lit.fill(1); this.paint(ctx); } ctx.audio.note(0, { dur: 1.6, vol: 0.05 }); ctx.audio.note(4, { at: 0.05, dur: 1.6, vol: 0.04 });
        /* left the room inside these 900 ms: only mark it sorted. the dots belong to the next room now, and enter() sorts and says the verdict on return */
        setTimeout(() => { if (!this.done) return; this.sorted = true; this.cue.textContent = 'again'; if (!this.root.parentElement.classList.contains('is-active')) return; ctx.particles.ease = 0.04; this.copy(); this.layout(ctx); this.positionCue(ctx); this.playSplit(ctx); if (this.A) { this.atlasLabels(ctx); this.syncAngle(ctx, 'sorted'); } }, 900);
      }
    }
    if (this.sorted) this.drawLabels(g, k);
  },
  /* kiosk mode: nobody is present, so do the room's own gesture — hold from stage centre until the flood finishes */
  demo(ctx) {
    if (!this.ready || !this.root) return;
    const alive = () => this.root.parentElement.classList.contains('is-active'); if (!alive()) return;
    if (this.done) this.reset(ctx);
    if (this.wg) this.wg.hidden = true; /* nobody is there to guess */
    const s = ctx.stage(), c = this.A ? ctx.view.unapply(s.x + s.w / 2, s.y + s.h / 2) : [s.x + s.w / 2, s.y + s.h / 2]; this._down(c[0], c[1]);
    const poll = () => { if (!alive()) return; if (this.done) { this._up(); return; } requestAnimationFrame(poll); };
    requestAnimationFrame(poll);
  },
  /* ================================================================ atlas (BUILD_SPEC_V2 §1.4, §3 wall row). nothing
     below runs at ?atlas=0: every entry point is reached only through `this.A` or through the atlas-only room contract. */
  angles: [{ id: 'unsorted', name: 'unsorted' }, { id: 'flood', name: 'flood' }, { id: 'sorted', name: 'sorted' }, { id: 'pour', name: 'pour' }, { id: 'press', name: 'the press' }],
  /* R5 R3: the pour angle lives in the lazy wall.pour.js, which owns this.pour while it runs */
  pourIn(ctx, o) { import('./wall.pour.js' + new URL(import.meta.url).search).then((m) => m.default(this, ctx, o)).catch((e) => console.warn('pour', e)); return o.instant || ctx.reduced || o.via !== 'tour' ? 0 : 4600; },
  unpour(ctx, re) { if (this.tally) this.tally.stop(); if (this.pour) this.pour.stop(re); },
  /* R11 PRESS: the press angle (a two-ink print of the whole log) lives in the lazy wall.press.js, which owns this.riso while it is up */
  pressIn(ctx, o) { import('./wall.press.js' + new URL(import.meta.url).search).then((m) => m.default(this, ctx, o)).catch((e) => console.warn('press', e)); return o.instant || ctx.reduced || o.via !== 'tour' ? 0 : 2400; },
  unpress() { if (this.riso) this.riso.stop(); },
  /* R6 ME: once the pour has landed, the lazy wall.hand.js lifts the song i pressed play on most by hand out of the mint jar */
  handDraw(ctx, g, k) { if (this.tally) return this.tally.draw(g, k); if (this._handP || this.pour.st().ph < 2) return; this._handP = import('./wall.hand.js' + new URL(import.meta.url).search).then((m) => m.default(this, ctx)).catch((e) => console.warn('hand', e)); },
  hoverVoice(id) { return this.pour ? this.pour.voice(id) : null; },

  /* the flood has to reach the far corner of the wall from wherever it starts: under a zoom, a press on the bare field
     can land outside the grid */
  reach() {
    const x0 = this.ox, y0 = this.oy, x1 = x0 + this.cols * this.cell, y1 = y0 + this.rows * this.cell, cx = this.cx, cy = this.cy;
    const far = Math.max(Math.hypot(cx - x0, cy - y0), Math.hypot(cx - x1, cy - y0), Math.hypot(cx - x0, cy - y1), Math.hypot(cx - x1, cy - y1));
    this.maxR = Math.max(this.maxR || 0, far + 40);
  },
  inWall(p) {
    const m = 24, x0 = this.ox, y0 = this.oy;
    return p.wx >= x0 - m && p.wx <= x0 + this.cols * this.cell + m && p.wy >= y0 - m && p.wy <= y0 + this.rows * this.cell + m;
  },

  /* one input path for the pad (and, under a zoom, for the bare field that the wall has grown into): press, hold, drag, tap */
  holdSpec(ctx, field) {
    const ok = (p) => this.ready && this.live() && !this.riso && (!field || this.inWall(p));
    return {
      hold: {
        delay: HOLD_MS,
        /* 0 ms: the ring appears under the finger before anything is decided, so the felt latency of the flood is zero */
        press: (p) => { if (!ok(p) || this.done) return; this._pressT = performance.now(); this.press = { wx: p.wx, wy: p.wy, t0: this._pressT, shown: 0 }; },
        /* 160 ms of stillness: the flood commits at the world point that was pressed */
        start: (p) => {
          const pr = this.press; this.press = null;
          if (!ok(p)) return;
          if (this.done) { this.reset(ctx); return; }
          this.hand = true; this.viaCue = false; this._floodT = performance.now();
          this._down(pr ? pr.wx : p.wx, pr ? pr.wy : p.wy);
        },
        move() {},
        end: () => { this.press = null; if (this.hand) { this.hand = false; this._up(); } },
      },
      drag: 'camera',
      tap: (p) => {
        if (!ok(p)) return undefined;
        this.taps = (this.taps || 0) + 1;
        if (this.done) { this.reset(ctx); return true; }
        try { ctx.toast('press and hold'); } catch (e) {}
        return undefined; /* falsy: a second tap still makes a double-tap zoom */
      },
      cursor: (p) => (ok(p) ? (this.done ? 'pointer' : 'crosshair') : ''),
    };
  },
  gestures(ctx) { return this.ready ? this.holdSpec(ctx, true) : null; },

  atlasEnter(ctx) {
    const P = ctx.particles, c = this.cell, lit = this.lit, prov = P.prov;
    /* no pointer parting here: in glyph cells it carves a black disc exactly where the flood starts, and the wall's
       density is the measurement (every cell holds the same number of plays) */
    P.touch = false;
    P.glyphAll(true);
    P.glyphMode('cat', { cats: CATS });
    P.catBy((i) => (lit[i] ? prov[i] + 1 : neutralTier(i, ctx)));
    /* the cell grid is a whole multiple of the dot pitch with its lines halfway between dots: an audio-jittered dot
       never hops cells, and at z 5 one character is one dot */
    P.glyphGrid({ ox: this.ox - c / 2, oy: this.oy - c / 2, pw: c, ph: c, fit: 'multiple' });
    /* the glyph cell GF lays over this grid (glyphfield.js layout(): the screen cell, rounded to a whole number of dots),
       for the dark margin round the block */
    { let cs = 6; try { cs = ctx.atlas.GF.info().cellCss || 6; } catch (e) {} const d = P.dpr, cwT = Math.max(3, Math.round(cs * d)), chT = Math.round(cwT * 1.8), pw = c * d;
      this.gcw = pw * Math.max(1, Math.round(cwT / pw)) / d; this.gch = pw * Math.max(1, Math.round(chT / pw)) / d; }
    ctx.view.configure({ mode: 'pan', zMin: 1, zMax: ZMAX, drift: false, look: (k) => this.look(k) });
    this.atlasLabels(ctx);
    /* R12: a tour stop or the w key can ask for the press before the wall is ready (a cold jump to it); the late enter
       pulls the print then, instead of syncing the bar back to the unsorted wall */
    if (ctx.angle.get().id === 'press') { if (!this.riso) this.pressIn(ctx, { instant: true }); return; }
    this.syncAngle(ctx, this.sorted ? 'sorted' : this.r > 0 ? 'flood' : 'unsorted');
  },
  /* the stepper's angle bar follows what the visitor did by hand (a hold that floods, the sort landing, a reset). the
     set is tagged via 'room' and setAngle ignores it, so the bar moves and nothing else does */
  syncAngle(ctx, id) {
    if (!this.A || !this.live || !this.live()) return;
    try { if (ctx.angle.get().id !== id) ctx.angle.set(id, { via: 'room', instant: true }); } catch (e) {}
  },
  look(k) {
    const gh = this.rows * this.cell, m = /^pile:(\d)$/.exec(String(k));
    if (m && this.pileX) return [this.pileX[+m[1]], this.oy + gh / 2];
    if (k === 'centre' || k === 'center') return [this.ox + this.cols * this.cell / 2, this.oy + gh / 2];
    return null;
  },

  /* the three pile names, as region labels centred on their own band's top edge (round 2, W34/C7.3 — they used to sit
     up-right of a point, which on a narrow pile put one name over its neighbour's dots). `align: 'c'` (anchors.js) is
     the module's own centred-box contract: it slides a label horizontally to stay in the window while its anchor
     point stays under it, and already tests every candidate against the chrome keepouts and every other placed pill,
     so none of that is re-derived here. a pile wide enough is centred on x = its own band's midpoint; the shuffle pile
     in the middle (17% of the wall) can be narrower than its own name, and flanked on both sides its centred box would
     spill into a neighbour's and the two would collide — so it alone steps to its own row, under the other two, which
     removes the x-overlap from the collision test rather than hiding one of the three names.
     TOP sits a few px under the edge, not straddling it: `oy` is exactly where the header's chrome ends (a phone's
     brand link sits flush left, right at that seam, so a box centred ON oy pokes up into it), and on a touch/narrow
     screen anchors.js also pads a tappable region label's own hit box by PAD_V (14 px, since every pile carries a
     `go`) for the keepout test specifically — so the clearance TOP needs there is the label's half-height plus that
     pad, not just the half-height. a plain `align:'c'` has no fallback quadrant to retreat to if that padded box
     still pokes into the header, so it just drops the label; keeping the whole padded box clear of oy up front
     avoids needing one. */
  atlasLabels(ctx) {
    if (!this.A || !this.live || !this.live()) return;
    if (!this.sorted || !this.pileL) { ctx.labels.set('wall', []); return; }
    /* w34 (round 3): a name pill just under the grid's TOP edge (the old TOP = oy+14) sits on top of the log
       itself -- unlike a bar-chart room, every cell of this grid is lit once sorted, so there is no gap up there
       for align:'c' to retreat into when it collides (it has none: the coverage gate rejects any candidate over
       ~45% dense glyphs and, for a centred region label, never retries elsewhere). the log's own gap is below the
       grid, where the % numbers already stand (this.pileY, drawLabels' own anchor and precision mark) -- the
       names now stand under THAT, so neither one moves the other's tracked position. */
    if (!(this.pileY >= 0)) { ctx.labels.set('wall', []); return; }
    const bounds = this.pileL.concat([this.ox + this.cols * this.cell]);
    const est = (t) => t.length * 8.2 + 14; /* rough label width incl. padding, close enough to size the decision, not the pixel */
    const MID = 1, stagger = est(PILE_NAMES[MID]) > bounds[MID + 1] - bounds[MID] - 4, BASE = this.pileY + 26;
    /* the staggered row is offset by the SAME touch pad again (anchors.css's transparent border, not just anchors.js's
       sibling GAP=6): on touch two rows only 24 px apart still have their invisible 44 px pads overlap, even though the
       drawn pills themselves never touch. 28 clears the drawn pill (18 px) + GAP with room to spare either way. */
    ctx.labels.set('wall', PILE_NAMES.map((text, p) => ({
      id: 'pile' + p, text, kind: 'region', align: 'c',
      x: (bounds[p] + bounds[p + 1]) / 2, y: stagger && p === MID ? BASE + 28 : BASE,
      r: 0, pri: 6 - p, go: () => this.flyPile(ctx, p),
    })));
  },
  flyPile(ctx, p) {
    const v = this.pctVals, lab = PILE_NAMES[p] + (v && v[p] != null ? ' · ' + v[p] + '%' : '');
    ctx.view.flyTo({ wx: this.pileX[p], wy: this.oy + this.rows * this.cell / 2, z: 2.2 }, { speed: 'quick', lock: lab });
    try { ctx.lock(lab); } catch (e) {}
  },

  /* sort at once: every dot lit, the piles formed, the pile names up. used by the `sorted` angle and by focus */
  sortNow(ctx) {
    if (this.sorted) return false;
    this.holding = false; this.hand = false; this.press = null; this.releaseSwell(ctx); ctx.audio.distant(0);
    if (this.wg) this.wg.hidden = true;
    this.lit.fill(1); this.r = this.maxR || 1; this.done = true; this.sorted = true; this.cue.textContent = 'again';
    ctx.particles.ease = 0.04; this.copy(); this.layout(ctx); this.paint(ctx); this.positionCue(ctx); this.playSplit(ctx); this.atlasLabels(ctx); this.syncAngle(ctx, 'sorted');
    return true;
  },

  setAngle(k, ctx, o = {}) {
    if (!this.ready || !this.live() || o.via === 'room') return 0;
    this.unpour(ctx, 1); this.unpress(); if (k === 3) return this.pourIn(ctx, o); if (k === 4) return this.pressIn(ctx, o);
    if (this.flood) { cancelAnimationFrame(this.flood); this.flood = 0; }
    const inst = !!o.instant || ctx.reduced;
    if (k === 0) {
      if (this.done || this.r > 0) { this.holding = false; this.hand = false; this.releaseSwell(ctx); this.reset(ctx); }
      ctx.view.home({ instant: inst });
      return 0;
    }
    if (k === 1) {
      /* the kiosk's own gesture, on demand: hold from the stage centre until the flood has covered the wall */
      if (this.done) this.reset(ctx);
      if (this.wg) this.wg.hidden = true;
      ctx.view.home({ instant: inst });
      if (ctx.reduced) { this.sortNow(ctx); return 0; }
      const s = ctx.stage(); this._down(s.x + s.w / 2, s.y + s.h / 2);
      const poll = () => { this.flood = 0; if (!this.live()) return; if (this.done || !this.holding) { if (this.holding) this._up(); return; } this.flood = requestAnimationFrame(poll); };
      this.flood = requestAnimationFrame(poll);
      return Math.round(Math.max(0, (this.maxR - this.r) / 0.9) + 900 + 700);
    }
    ctx.view.home({ instant: inst });
    return this.sortNow(ctx) && !inst ? 1400 : 0;
  },

  /* search, the ladder and labels: {prov: 'tap'|'shuffle'|'served'} flies to that pile; {level: 'play'} is the closest zoom */
  focus(d, ctx) {
    if (!this.ready || !d) return false;
    this.unpour(ctx, 1); this.unpress();
    const pv = { tap: 0, tapped: 0, shuffle: 1, shuffled: 1, served: 2, queue: 2 }[d.prov];
    if (pv != null) { this.sortNow(ctx); this.flyPile(ctx, pv); return true; }
    if (d.level === 'play' || d.level === 'one play' || d.level === 'one_play') {
      const c = this.look('centre'); ctx.view.flyTo({ wx: c[0], wy: c[1], z: ZMAX }, { speed: 'quick', lock: 'one play' });
      return true;
    }
    return false;
  },

  /* the numbers this room prints on the overlay, in world px (atlas_precision) */
  precision() { return this.prec ? this.prec.slice() : []; },
  keepout() {
    const out = [];
    [this.cue, this.wg, this.pourBtn, this.handEl, this.riso && this.riso.el].forEach((el) => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(el).opacity !== '0') out.push({ x: r.left, y: r.top, w: r.width, h: r.height }); });
    return out;
  },

  /* a live count while the flood runs, in the info panel's readout line: plays coloured so far, from the dots actually
     lit (one dot is one play here, four on a phone, and the line says "about" there). cleared when the wall is sorted */
  hudFlood(ctx, t) {
    if (this.done) { if (this._hudOn) { this._hudOn = false; try { ctx.hud(null); } catch (e) {} } return; }
    if (t - (this._hudT || 0) < 100) return; this._hudT = t;
    const per = ctx.particles.perDot || 1, n = Math.min(this.total || 97427, Math.round(this.nLit * per)), all = this.total || 97427;
    const c = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    try { ctx.hud((per > 1.5 ? 'about ' : '') + c(n) + ' of ' + c(all) + ' plays coloured by who pressed play'); this._hudOn = true; } catch (e) {}
  },

  /* the block's edge: one glyph cell of dark field round it, fading out (overlay, world px, a cell wide at any zoom). the
     wall is evenly packed, so without it the field's bloom smears the block into the page and its edge does not read.
     decoration only: nothing measured is drawn here, and it never covers a cell of the block */
  drawMargin(g, k, ctx) {
    if (!this.cols || !this.rows || !this.gcw) return;
    const c = this.cell, n = ctx.particles.n, used = Math.min(this.cols, Math.ceil(Math.min(n, this.cap) / this.rows));
    const x0 = this.ox - c / 2, y0 = this.oy - c / 2, x1 = x0 + used * c, y1 = y0 + this.rows * c, mw = this.gcw * k, mh = this.gch * k;
    const side = (ax, ay, bx, by, rx, ry, rw, rh) => { const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, 'rgba(10,1,24,.94)'); gr.addColorStop(1, 'rgba(10,1,24,0)'); g.fillStyle = gr; g.fillRect(rx, ry, rw, rh); };
    side(x0, 0, x0 - mw, 0, x0 - mw, y0, mw, y1 - y0);
    side(x1, 0, x1 + mw, 0, x1, y0, mw, y1 - y0);
    side(0, y0, 0, y0 - mh, x0 - mw, y0 - mh, x1 - x0 + 2 * mw, mh);
    side(0, y1, 0, y1 + mh, x0 - mw, y1, x1 - x0 + 2 * mw, mh);
  },

  /* the press ring: ice (interface), drawn in world px at the pressed point, an arc that closes over the 160 ms the hold
     takes to commit. reduced motion: the closed ring at once */
  drawPress(g, k) {
    const pr = this.press, now = performance.now(), u = this.reducedMotion ? 1 : Math.min(1, (now - pr.t0) / HOLD_MS);
    if (!pr.shown) { pr.shown = now; this._pressShownT = now; }
    const R = 16 * k;
    g.save();
    g.lineWidth = k; g.strokeStyle = 'rgba(134,203,254,.32)'; g.beginPath(); g.arc(pr.wx, pr.wy, R, 0, TAU); g.stroke();
    g.lineWidth = 2 * k; g.lineCap = 'round'; g.strokeStyle = 'rgba(160,214,255,.95)';
    g.beginPath(); g.arc(pr.wx, pr.wy, R, -TAU / 4, -TAU / 4 + TAU * Math.max(0.05, u)); g.stroke();
    g.fillStyle = 'rgba(195,228,255,.9)'; g.beginPath(); g.arc(pr.wx, pr.wy, 1.8 * k, 0, TAU); g.fill();
    g.restore();
  },
};
