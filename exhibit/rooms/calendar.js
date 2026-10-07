/* room 02 — the ruler changed. the whole record as a ribbon of 81 months: one column per month, every dot
   in its month, stacked by who pressed play (tapped at the bottom in mint, shuffle above it in amber, the
   served queue on top in violet). a dotted line at october 2023, where the logger changed its vocabulary.
   one interaction: a scrubber that sweeps a one-month window across the ribbon and reads out that month's
   split. on a desktop, hovering the ribbon does the same thing.
   every number in this room comes from exhibit/data/wall.json (months x tap/shuffle/served), read through
   ctx.identity() so the dots and the readout are counting the same log.
   ATLAS MODE (BUILD_SPEC_V2 §3 calendar row, brief R1): the ribbon is a categorical glyph field (o O @ i tapped, x X % a
   shuffle, - = ≡ the queue; colour sampled from one member dot). the cell grid DIVIDES the month pitch, so every glyph
   column sits inside one month and month edges are cell edges; on a phone one cell is one month. rows count up from the
   baseline. the camera pans and zooms (z 1-4, no drift); the pad that scrubs rides the camera, so hover and tap read the
   month under the pointer at any zoom, and a drag pans. october 2023 is a floating [ label ] at the top of the line
   (the one date this room names: an instrument change, already on the wall text); every number stays an exact overlay
   mark at a constant screen size. angles: ribbon, line (zoomed on the break), after (the window walks to the last month). */
const BREAK = '2023-10';
const TOUCH_MQ = '(pointer:coarse),(max-aspect-ratio:115/100)'; /* anchors.js: where a label carries its 44 px touch pad */
const LINE_Z = 1.6, LINE_GAP = 40, PLATE_Y = 4, LINE_BAND = 110, LINE_OFF = 0.35; /* the line view's zoom ceiling, the clear band under the readout, the plate's padding, the swing's reach either side of the line (screen px), how far off the stage's centre the line may sit */
const CATS = [{ family: 'neutral' }, { family: 'tap' }, { family: 'shuffle' }, { family: 'served' }];
const dbg = { on: false };
const MON_S = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MON_L = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const comma = (n) => String(n | 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const shortM = (m) => MON_S[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const longM = (m) => MON_L[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const pct1 = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0');
/* where an anchored [ name ] label puts its name, relative to its box: measured once on a hidden twin of the labels
   module's own button (same classes, so the same css: padding, the "[ " before it, font, line height), in this engine,
   so the name can be put exactly where the overlay used to print it. re-measured until the webfont has loaded */
let LABM = null;
function labMetrics(host) {
  if (LABM && LABM.ok) return LABM;
  let lead = 17.9, base = 12.3, w = 118, ok = false;
  try {
    const el = document.createElement('button'), pr = document.createElement('span');
    el.type = 'button'; el.tabIndex = -1; el.className = 'lab atlas-lab obj hi'; el.setAttribute('aria-hidden', 'true'); /* hi: it is always one of the top eight object labels (anchors.js HI_N), so it is drawn in the hi style */
    el.style.cssText = 'visibility:hidden;transform:none;transition:none';
    el.textContent = 'october 2023';
    pr.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(pr); (host || document.body).appendChild(el);
    const er = el.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(el.firstChild);
    const l = rg.getBoundingClientRect().left - er.left, bs = pr.getBoundingClientRect().bottom - er.top;
    el.remove();
    if (l > 0 && bs > 0) { lead = l; base = bs; w = er.width; ok = !document.fonts || document.fonts.status === 'loaded'; }
  } catch (e) {}
  LABM = { lead, base, w, ok };
  return LABM;
}
/* 0xRRGGBB toward 0xRRGGBB */
function mix(a, b, k) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * k) | 0) << 16) | (((ag + (bg - ag) * k) | 0) << 8) | ((ab + (bb - ab) * k) | 0);
}

const TPL = `<div class="cal-read" aria-hidden="true">
<p class="cal-m"><b></b><span class="cal-n"></span></p>
<p class="cal-split"><span class="cal-c cal-t"></span><span class="cal-c cal-s"></span><span class="cal-c cal-v"></span></p>
</div>
<div class="cal-pad" aria-hidden="true"></div>
<div class="cal-scrub"><span class="cal-bk" aria-hidden="true"></span><input class="cal-range" type="range" min="0" step="1" value="0"></div>`;

const CSS = `section[data-room=calendar] .cal-read{position:absolute;margin:0;display:flex;flex-direction:column;gap:3px;pointer-events:none}
section[data-room=calendar] .cal-m{margin:0;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
section[data-room=calendar] .cal-m b{font:600 clamp(15px,1.35vw,19px)/1.2 var(--mono);letter-spacing:.06em;color:var(--ink)}
section[data-room=calendar] .cal-n{font:400 clamp(11.5px,1.02vw,13px)/1.2 var(--mono);letter-spacing:.04em;color:var(--mute)}
section[data-room=calendar] .cal-split{margin:0;display:flex;gap:14px;flex-wrap:wrap}
section[data-room=calendar] .cal-c{font:600 clamp(11.5px,1.02vw,13px)/1.3 var(--mono);letter-spacing:.04em;white-space:nowrap}
section[data-room=calendar] .cal-c::before{content:"";display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;vertical-align:0;background:currentColor}
section[data-room=calendar] .cal-t{color:var(--mint)}
section[data-room=calendar] .cal-s{color:var(--amber)}
section[data-room=calendar] .cal-v{color:var(--violet)}
html.atlas section[data-room=calendar] .cal-read{align-items:flex-start}
/* zoomed: a plate round the readout. its padding is taken back by the margin, so no number moves when it comes on */
html.atlas section[data-room=calendar] .cal-read.cal-zoom{background:rgba(10,1,24,.82);padding:4px 6px;margin:-4px 0 0 -6px;box-sizing:content-box;border-radius:2px}
/* W35: off while a tour holds the line angle on a phone (syncReadHidden); higher specificity than .cal-read's own display so it always wins */
html.atlas section[data-room=calendar] .cal-read.cal-hide{display:none}
/* the glyph keeps the square's box (8 + 6 px, 7 + 5 on a phone), so every number after it sits where ?atlas=0 prints it */
html.atlas section[data-room=calendar] .cal-c::before{height:auto;border-radius:0;background:none;font-weight:700;vertical-align:baseline;letter-spacing:0;overflow:visible}
html.atlas section[data-room=calendar] .cal-t::before{content:"@"}
html.atlas section[data-room=calendar] .cal-s::before{content:"%"}
html.atlas section[data-room=calendar] .cal-v::before{content:"="}
section[data-room=calendar] .cal-pad{position:absolute;pointer-events:none;background:none}
section[data-room=calendar] .cal-scrub{position:absolute;display:flex;align-items:center}
section[data-room=calendar] .cal-bk{position:absolute;top:50%;width:2px;height:13px;margin-top:-6px;background:rgba(134,203,254,.75);border-radius:1px;pointer-events:none}
section[data-room=calendar] .cal-range{-webkit-appearance:none;appearance:none;width:100%;height:44px;margin:0;padding:0;background:none;border:0;cursor:ew-resize;touch-action:pan-y;color:var(--ice)}
section[data-room=calendar] .cal-range:focus{outline:none}
section[data-room=calendar] .cal-range:focus-visible{outline:2px solid var(--ice);outline-offset:2px;border-radius:999px}
section[data-room=calendar] .cal-range::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:rgba(134,203,254,.24)}
section[data-room=calendar] .cal-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:15px;height:15px;margin-top:-6px;border-radius:50%;background:currentColor;border:2px solid #0a0118;box-shadow:0 0 10px rgba(134,203,254,.45)}
section[data-room=calendar] .cal-range::-moz-range-track{height:3px;border-radius:2px;background:rgba(134,203,254,.24);border:0}
section[data-room=calendar] .cal-range::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:currentColor;border:2px solid #0a0118;box-shadow:0 0 10px rgba(134,203,254,.45)}
@media (max-height:480px) and (min-aspect-ratio:115/100){section[data-room=calendar] .cal-m b{font-size:13.5px}section[data-room=calendar] .cal-c,section[data-room=calendar] .cal-n{font-size:10.5px}}
@media (max-width:420px){section[data-room=calendar] .cal-split{gap:9px}section[data-room=calendar] .cal-c{font-size:10.5px}section[data-room=calendar] .cal-c::before{width:7px;height:7px;margin-right:5px}}`;

export default {
  id: 'calendar', track: 'anti-dimmable', ready: false, cur: -1, demoT: 0, mt: 0, t0: 0, focusM: -1, walkT: 0,

  async mount(root, ctx) {
    this.A = !!(ctx.atlas && ctx.atlas.on); this.prec = [];
    if (!document.getElementById('cal-css')) { const st = document.createElement('style'); st.id = 'cal-css'; st.textContent = CSS; document.head.appendChild(st); }
    await ctx.identity();
    const w = await ctx.data('wall').catch(() => null);
    const P = ctx.particles, n = P.n;
    if (!w || !w.months || !w.months.length) return;
    const tot = w.months.map((_, k) => w.tap[k] + w.shuffle[k] + w.served[k]);
    this.months = w.months; this.nm = tot.length; this.tap = w.tap; this.sh = w.shuffle; this.sv = w.served; this.tot = tot;
    this.breakAt = w.months.indexOf(BREAK);

    /* the 10.9-point swing, recomputed here from the same months the ribbon draws, so the line the visitor
       reads is the line the picture is made of. "before" is every month up to the changepoint; the
       changepoint month itself counts as after, which is how the era-stability audit split it. */
    const bi = this.breakAt < 0 ? 0 : this.breakAt;
    let bt = 0, bn = 0, at = 0, an = 0;
    for (let k = 0; k < this.nm; k++) { if (k < bi) { bt += w.tap[k]; bn += tot[k]; } else { at += w.tap[k]; an += tot[k]; } }
    this.beforeTxt = pct1(bt, bn); this.afterTxt = pct1(at, an);

    /* one dot per play in played order: walk the monthly totals and hand the dots out */
    const acc = []; let run = 0; for (const t of tot) { run += t; acc.push(run); }
    const mon = new Uint16Array(n), rank = new Int32Array(n), cnt = new Int32Array(this.nm);
    let k = 0;
    for (let i = 0; i < n; i++) { const play = (i + 0.5) * (run / n); while (k < acc.length - 1 && play >= acc[k]) k++; mon[i] = k; cnt[k]++; }
    /* inside a month the dots sort by who pressed play, tapped first, so each column reads as a stack and
       not as confetti. the same order gives every month a contiguous run of dot indices, which is how the
       scrubber can relight one month without walking the whole field. */
    const ordA = new Array(n); for (let i = 0; i < n; i++) ordA[i] = i;
    ordA.sort((a, b) => mon[a] - mon[b] || P.prov[a] - P.prov[b] || a - b);
    const ord = Int32Array.from(ordA);
    const seen = new Int32Array(this.nm); for (let i = 0; i < n; i++) { const d = ord[i]; rank[d] = seen[mon[d]]++; }
    const mstart = new Int32Array(this.nm + 1); let s0 = 0; for (let m = 0; m < this.nm; m++) { mstart[m] = s0; s0 += cnt[m]; } mstart[this.nm] = s0;
    this.mon = mon; this.rank = rank; this.cnt = cnt; this.ord = ord; this.mstart = mstart;
    this.max = 1; for (let m = 0; m < this.nm; m++) if (cnt[m] > this.max) this.max = cnt[m];
    this.hh = new Float32Array(n);

    /* the left of the ribbon is almost bare and that is the record, not a bug: say how bare, in its own
       numbers, so nobody reads the empty third as a broken chart. the run is measured, not hand-set. */
    let maxTot = 1; for (let m = 0; m < this.nm; m++) if (tot[m] > maxTot) maxTot = tot[m];
    let thin = 0, thinN = 0;
    while (thin < this.nm && tot[thin] < maxTot * 0.05) { thinN += tot[thin]; thin++; }
    this.thin = thin >= 6 ? thin : 0;
    this.thinTxt = this.thin
      ? [comma(thinN) + ' plays in the first ' + thin + ' months, ' + pct1(thinN, run) + '% of the record',
        comma(thinN) + ' plays in the first ' + thin + ' months',
        comma(thinN) + ' plays in ' + thin + ' months']
      : null;

    const sec = root.parentElement;
    const slot = sec && sec.querySelector('.legend-slot');
    if (slot) ctx.legend(slot, 'prov');

    const box = document.createElement('div'); box.innerHTML = TPL;
    while (box.firstChild) root.appendChild(box.firstChild);
    this.root = root; this.sec = sec;
    this.read = root.querySelector('.cal-read'); this.mEl = root.querySelector('.cal-m b'); this.nEl = root.querySelector('.cal-n');
    this.cT = root.querySelector('.cal-t'); this.cS = root.querySelector('.cal-s'); this.cV = root.querySelector('.cal-v');
    this.pad = root.querySelector('.cal-pad'); this.scrub = root.querySelector('.cal-scrub');
    this.bk = root.querySelector('.cal-bk'); this.rng = root.querySelector('.cal-range');
    /* W35: the month readout goes dark only while a TOUR is actively driving this room's line angle on a phone-shaped
       screen (TOUCH_MQ, the same "phone" test wall.js and this file already use elsewhere) — a tour caption is already
       saying the two numbers that matter there, and the readout's box sat on top of it. free camera (no tour, or a
       paused one) always keeps the readout: nobody is speaking for it then. angle and tour state are the shell's own
       (ctx.angle.get, ctx.tour.active), never re-derived, so this never drifts from what setAngle/the tour actually did. */
    this._readHidden = false;
    try { this.touchMq = matchMedia(TOUCH_MQ); } catch (e) { this.touchMq = null; }
    const syncRead = () => this.syncReadHidden(ctx);
    if (this.touchMq) { try { this.touchMq.addEventListener('change', syncRead); } catch (e) { try { this.touchMq.addListener(syncRead); } catch (e2) {} } }
    try { ctx.angle.onChange(syncRead); } catch (e) {}
    try { ctx.tour.onChange(syncRead); } catch (e) {}
    this.rng.max = String(this.nm - 1);
    this.rng.setAttribute('aria-label', 'scrub the months, ' + longM(this.months[0]) + ' to ' + longM(this.months[this.nm - 1]));
    this.rng.addEventListener('input', () => { this.stopDemo(); this.setMonth(+this.rng.value, ctx); });
    this.rng.addEventListener('pointerdown', () => this.stopDemo());

    /* atlas: one input path. the pad rides the camera (hover reads the month under the pointer at any zoom), a tap sets
       the month (a finger has no hover), and a drag pans. its own pointermove listener is never attached */
    if (this.A) {
      this.pad.style.pointerEvents = 'auto';
      ctx.view.layer(root, [this.pad]);
      const monthAt = (p) => Math.floor((p.wx - this.s.x) / ((this.rw || this.s.w) / this.nm));
      ctx.gesture.bind(this.pad, {
        hover: (p) => { if (!this.s || !this.sec.classList.contains('is-active')) return; this.stopDemo(); this.setMonth(monthAt(p), ctx); },
        tap: (p) => { if (!this.s || !this.sec.classList.contains('is-active')) return undefined; this.taps = (this.taps || 0) + 1; this.stopDemo(); this.setMonth(monthAt(p), ctx); return undefined; },
        drag: 'camera', cursor: 'crosshair',
      });
    }
    /* hovering the ribbon scrubs it, on devices that have a hover. a finger keeps the page scrolling instead */
    if (!ctx.coarse && !this.A) {
      this.pad.style.pointerEvents = 'auto';
      this.pad.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' || !this.s || !this.sec.classList.contains('is-active')) return;
        this.stopDemo();
        const m = Math.floor((e.clientX - this.s.x) / ((this.rw || this.s.w) / this.nm));
        this.setMonth(m, ctx);
      });
    }
    this.ready = true;
  },

  /* relight one month's dots: restore whatever was lit, then blend the new month toward white.
     a month is a contiguous run in this.ord, so this touches a thousand dots, not a hundred thousand. */
  tint(ctx, m, bright) {
    if (m < 0 || m >= this.nm) return;
    const P = ctx.particles, ord = this.ord, prov = P.prov, C = ctx.PROV, TC = P.tc, Cc = P.c, red = ctx.reduced;
    const a = this.mstart[m], b = this.mstart[m + 1];
    for (let k = a; k < b; k++) {
      const i = ord[k]; let v = C[prov[i]] >>> 0;
      if (bright) v = mix(v, 0xffffff, 0.42);
      const p = 0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff);
      TC[i] = p; if (red) Cc[i] = p;
    }
  },

  setMonth(m, ctx, quiet) {
    if (!this.ready) return;
    m = m < 0 ? 0 : m > this.nm - 1 ? this.nm - 1 : m;
    if (m === this.cur) return;
    const was = this.cur; this.cur = m;
    this.tint(ctx, was, false); this.tint(ctx, m, true);
    if (this.rng && +this.rng.value !== m) this.rng.value = String(m);
    const key = this.months[m], t = this.tap[m], s = this.sh[m], v = this.sv[m], n = this.tot[m];
    const a = pct1(t, n), b = pct1(s, n), c = pct1(v, n);
    this.mEl.textContent = shortM(key);
    this.nEl.textContent = n === 1 ? '1 play' : comma(n) + ' plays';
    this.cT.textContent = a + '% i tapped'; this.cS.textContent = b + '% i shuffled'; this.cV.textContent = c + '% served';
    this.rng.setAttribute('aria-valuetext', longM(key) + ': ' + (n === 1 ? '1 play' : comma(n) + ' plays') + ', ' + a + '% i tapped, ' + b + '% i shuffled, ' + c + '% served');
    this.readDirty = true; /* its height may have changed: re-measured on the next pose change, never here (a scrub or a walk would force a layout per month) */
    /* one quiet note when the window steps over the line, so the changepoint is audible as well as drawn */
    if (!quiet && was >= 0 && this.breakAt >= 0 && (was < this.breakAt) !== (m < this.breakAt)) ctx.audio.note(2, { dur: 0.5, vol: 0.035 });
  },

  enter(ctx) {
    const P = ctx.particles;
    P.ease = 0.09; P.jitter = 0.25; P.big = false; P.swirl = 0.18; P.touch = false; /* the ribbon stays legible: dots do not part around the pointer here */
    if (!this.ready) { P.scatter(); P.color(() => ctx.PAL.fog); return; }
    const s = ctx.stage(); this.s = s;
    if (this.A) P.jitter = 0; /* glyph cells are the texture here: a jittered dot on a row edge only makes the cell flicker */

    /* the room dots own the right margin they stand in. where they cross the scrubber's band the whole
       ribbon steps in with it, so a month column and the thumb under it still line up. */
    const scrubH = 44, yearH = 20;
    let rw = s.w;
    const nav = document.getElementById('dots');
    if (nav) {
      const nr = nav.getBoundingClientRect(), top = s.y + s.h - scrubH, bot = s.y + s.h;
      if (nr.width && nr.top < bot + 4 && nr.bottom > top - 4) rw = Math.min(rw, Math.max(160, nr.left - 8 - s.x));
    }
    this.rw = rw;
    this.read.style.left = s.x + 'px'; this.read.style.top = s.y + 'px';
    /* atlas: zoomed, the ribbon runs under the readout, which then gets an opaque plate (.cal-zoom, set on every pose
       change); it shrink-wraps its two lines (same wrap width), so the plate covers the text and not the whole row */
    if (this.A) { this.read.style.width = ''; this.read.style.maxWidth = rw + 'px'; } else this.read.style.width = rw + 'px';
    const readH = Math.max(34, Math.min(s.h * 0.3, this.read.offsetHeight || 46)) + 10;
    const y0 = s.y + readH, y1 = Math.max(y0 + 48, s.y + s.h - scrubH - yearH);
    const rh = y1 - y0;
    this.y0 = y0; this.base = y1; this.rh = rh;

    const colW = rw / this.nm, cw = Math.max(1, colW * 0.84), off = (colW - cw) / 2;
    const per = Math.max(1, Math.round(cw));            /* one dot per pixel across a column */
    const rowsMax = Math.ceil(this.max / per);
    const rowH = Math.min(1, (rh - 10) / rowsMax);      /* shrink the row pitch until the tallest month fits */
    const gx = cw / per, mon = this.mon, rank = this.rank, hh = this.hh;
    this.colW = colW;
    P.targetPx((i) => {
      const m = mon[i], r = rank[i], h = ((r / per) | 0) * rowH;
      hh[i] = h;
      return [s.x + m * colW + off + (r % per) * gx, y1 - h];
    });
    const C = ctx.PROV, prov = P.prov; P.color((i) => C[prov[i]]);

    this.pad.style.left = s.x + 'px'; this.pad.style.top = y0 + 'px'; this.pad.style.width = rw + 'px'; this.pad.style.height = rh + 'px';
    this.scrub.style.left = s.x + 'px'; this.scrub.style.top = (s.y + s.h - scrubH) + 'px'; this.scrub.style.width = rw + 'px'; this.scrub.style.height = scrubH + 'px';
    if (this.breakAt >= 0) this.bk.style.left = 'calc(7px + ' + (100 * this.breakAt / (this.nm - 1)).toFixed(3) + '% - ' + (14 * this.breakAt / (this.nm - 1)).toFixed(3) + 'px)';

    const start = this.cur >= 0 ? this.cur : (this.breakAt >= 0 ? this.breakAt : 0);
    this.cur = -1; this.setMonth(start, ctx, true);
    this.t0 = 0; this.mt = ctx.reduced ? 1 : 0; /* the line draws itself down the ribbon on arrival */
    this.syncReadHidden(ctx); /* W35: a fresh entry always starts on angle 0 (never 'line'), but settle it explicitly rather than trust a stale flag from the room's last visit */
    if (this.A) this.atlasEnter(ctx, y1);
  },

  leave() { this.stopDemo(); this.focusM = -1; clearTimeout(this.fitT); if (this.offView) { this.offView(); this.offView = null; } },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready || !this.s) return;
    const s = this.s, y0 = this.y0, base = this.base, rh = this.rh, nm = this.nm, colW = this.colW, rw = this.rw;
    const tiny = rh < 230 || rw < 420;
    /* atlas: k = 1 / zoom. the marks live in world px but keep their screen size and hairline weight (1 at home) */
    const k = this.A ? 1 / (ctx.view.z || 1) : 1, F = (px) => (px * k) + 'px';
    if (this.A) { dbg.on = !!ctx.atlas.debug; this.prec.length = 0; }

    /* the ribbon breathes with the low band: every column is scaled about its own baseline, which keeps
       the months in proportion to each other while the whole record moves with the track.
       atlas: it holds still, because a breathing column top would flick glyph rows on and off */
    if (!ctx.reduced && !this.A) {
      const P = ctx.particles, ty = P.ty, hh = this.hh, n = P.n;
      const k = 1 + bands.low * 0.055 + Math.sin(t * 0.00062) * 0.007;
      for (let i = 0; i < n; i++) ty[i] = base - hh[i] * k;
    }

    g.save();
    /* baseline and the quiet year ticks */
    g.strokeStyle = 'rgba(134,203,254,.16)'; g.lineWidth = k;
    g.beginPath(); g.moveTo(s.x, base + 0.5 * k); g.lineTo(s.x + rw, base + 0.5 * k); g.stroke();
    const showYears = colW * 12 > 26 * k;
    g.font = '500 ' + F(9) + ' "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    for (let m = 0; m < nm; m++) {
      if (this.months[m].slice(5) !== '01') continue;
      const x = s.x + (m + 0.5) * colW;
      g.strokeStyle = 'rgba(134,203,254,.22)';
      g.beginPath(); g.moveTo(x, base + k); g.lineTo(x, base + 4 * k); g.stroke();
      if (showYears) { g.fillStyle = 'rgba(164,155,189,.5)'; g.fillText(this.months[m].slice(0, 4), x, base + 5 * k); if (dbg.on) this.prec.push({ id: 'y' + this.months[m].slice(0, 4), text: this.months[m].slice(0, 4), wx: x, wy: base + 5 * k }); }
    }

    /* how empty the empty part is, in its own numbers. only when it fits inside the bare months themselves. */
    if (this.thin) {
      g.font = '500 ' + F(9.5) + ' "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const span = this.thin * colW, fit = this.thinTxt.find((t) => g.measureText(t).width < span - 10 * k);
      if (fit) {
        /* atlas: the first months' few plays are whole characters now, not single pixels; a dark backing keeps the line legible over them */
        if (this.A) { const tw = g.measureText(fit).width; g.fillStyle = 'rgba(10,1,24,.8)'; g.fillRect(s.x + span / 2 - tw / 2 - 4 * k, base - 19 * k, tw + 8 * k, 13 * k); }
        g.fillStyle = 'rgba(164,155,189,.5)'; g.fillText(fit, s.x + span / 2, base - 10 * k); if (dbg.on) this.prec.push({ id: 'thin', text: fit, wx: s.x + span / 2, wy: base - 10 * k });
      }
    }

    /* the window the scrubber is standing in */
    if (this.cur >= 0) {
      /* atlas, zoomed: it starts where the visible line does, under the readout's plate, not up through the chrome */
      const bw = Math.max(colW, 9 * k), cx = s.x + (this.cur + 0.5) * colW, x0 = cx - bw / 2, wy = this.A && k < 0.999 ? this.lineTop(ctx) : y0;
      const gr = g.createLinearGradient(0, wy, 0, base);
      gr.addColorStop(0, 'rgba(240,234,255,.015)'); gr.addColorStop(1, 'rgba(240,234,255,.11)');
      g.fillStyle = gr; g.fillRect(x0, wy, bw, base - wy);
      g.strokeStyle = 'rgba(240,234,255,.34)'; g.lineWidth = k;
      g.beginPath(); g.moveTo(x0 + 0.5 * k, wy); g.lineTo(x0 + 0.5 * k, base); g.moveTo(x0 + bw - 0.5 * k, wy); g.lineTo(x0 + bw - 0.5 * k, base); g.stroke();
    }

    /* the changepoint. it draws itself down the ribbon the first time the room comes up. */
    if (this.breakAt >= 0) {
      if (!this.t0) this.t0 = t;
      if (this.mt < 1) this.mt = Math.min(1, (t - this.t0) / 760);
      const e = 1 - Math.pow(1 - this.mt, 3);
      const x = Math.round(s.x + this.breakAt * colW) + 0.5, yT = this.lineTop(ctx);
      if (this.A) {
        /* atlas: the stacks beside it are whole characters, so the line is 2 px of ice on a dark casing (the pixel pair
           either side of the month edge), and zoomed it starts at the top of its visible part, under the readout's plate,
           never up through the readout or the chrome */
        const xl = x - 0.5, ya = k < 0.999 ? yT : y0, yb = ya + (base - ya) * e;
        g.strokeStyle = 'rgba(10,1,24,.9)'; g.lineWidth = 5 * k;
        g.beginPath(); g.moveTo(xl, ya); g.lineTo(xl, yb); g.stroke();
        g.strokeStyle = 'rgba(134,203,254,.95)'; g.lineWidth = 2 * k; g.setLineDash([4 * k, 3 * k]);
        g.beginPath(); g.moveTo(xl, ya); g.lineTo(xl, yb); g.stroke(); g.setLineDash([]);
      } else {
        g.strokeStyle = 'rgba(134,203,254,.62)'; g.lineWidth = k; g.setLineDash([3 * k, 4 * k]);
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + (base - y0) * e); g.stroke(); g.setLineDash([]);
      }
      if (this.mt > 0.45) {
        const al = Math.min(1, (this.mt - 0.45) / 0.55);
        const right = x > s.x + rw - 118 * k;
        /* the label and the swing print inside the top of the ribbon, never above it: the readout lives up there.
           atlas: the name is the floating ◦ october 2023 label instead, unless labels are switched off */
        g.font = '600 ' + F(tiny ? 9.5 : 10) + ' "JetBrains Mono", ui-monospace, monospace'; g.textBaseline = 'alphabetic';
        g.textAlign = right ? 'right' : 'left'; g.fillStyle = 'rgba(134,203,254,' + (0.88 * al).toFixed(3) + ')';
        if (!this.A || !this.labelsOn(ctx)) { g.fillText('october 2023', x + (right ? -6 : 6) * k, yT + 11 * k); if (dbg.on) this.prec.push({ id: 'break', text: 'october 2023', wx: x + (right ? -6 : 6) * k, wy: yT + 11 * k }); }
        /* the swing itself, beside the line: the number moved, the listener did not. atlas, zoomed: it rides the top of the
           visible line with the [ october 2023 ] label (the line view is about these two numbers), on a dark plate,
           because the stacks behind it are whole characters now */
        const yN = yT + (this.footLock && k < 0.999 ? 17 : tiny ? 34 : 40) * k, fN = '600 ' + F(tiny ? 10.5 : 12) + ' "JetBrains Mono", ui-monospace, monospace', fW = '500 ' + F(tiny ? 8.5 : 9.5) + ' "JetBrains Mono", ui-monospace, monospace';
        if (this.A && k < 0.999) {
          g.font = fN; const wb = g.measureText(this.beforeTxt + '%').width, wa = g.measureText(this.afterTxt + '%').width;
          g.font = fW; const wl = Math.max(wb, g.measureText('tapped, before').width), wr = Math.max(wa, g.measureText('after').width);
          g.fillStyle = 'rgba(10,1,24,' + (0.78 * al).toFixed(3) + ')';
          g.fillRect(x - 7 * k - wl - 4 * k, yN - 13 * k, wl + 9 * k, 29 * k); g.fillRect(x + 2 * k, yN - 13 * k, wr + 9 * k, 29 * k);
        }
        g.font = fN; g.fillStyle = 'rgba(33,246,188,' + (0.9 * al).toFixed(3) + ')';
        g.textAlign = 'right'; g.fillText(this.beforeTxt + '%', x - 7 * k, yN);
        g.textAlign = 'left'; g.fillText(this.afterTxt + '%', x + 7 * k, yN);
        g.font = fW; g.fillStyle = 'rgba(164,155,189,' + (0.72 * al).toFixed(3) + ')';
        g.textAlign = 'right'; g.fillText('tapped, before', x - 7 * k, yN + 12 * k);
        g.textAlign = 'left'; g.fillText('after', x + 7 * k, yN + 12 * k);
        if (dbg.on) this.prec.push({ id: 'before', text: this.beforeTxt + '%', wx: x - 7 * k, wy: yN }, { id: 'after', text: this.afterTxt + '%', wx: x + 7 * k, wy: yN });
      }
    }
    /* last, not first: masks the field AND every mark this room just drew above (the thin-months caption, a year
       label) that a pan can otherwise centre or align part-way into the excluded margin */
    if (this.A) this.maskEdges(g, ctx);
    g.restore();
  },

  /* R1-b: the ribbon is a continuous field with no clip of its own — at the line's zoom some of the 81 months can
     render past the stage's own right edge (desktop: under the ladder rail) or hard against a portrait phone's
     side, since linePose()'s wl/wr only decide which columns matter for ceiling-scoring, not what is actually
     drawn. masked back to background every frame, in world coordinates re-derived from the CURRENT pose (so it
     holds through the fly-in and any relayout, not just the settled pose) — the same technique wall.js's
     drawMargin uses, for the same reason: a field, not a room-owned box, has nothing else to clip it. */
  maskEdges(g, ctx) {
    const v = ctx.view; if (!v || v.mode !== 'pan' || !v.unapply) return;
    const st = ctx.stage(); if (!(st.w > 0)) return;
    const portrait = innerWidth <= innerHeight * 1.15, side = portrait ? 16 : 0;
    /* landscape: stage() already gives up its own right margin to the ladder rail once insets.right is set, but
       that margin can be no wider than the rail itself — a full rail-width of extra clearance beyond it, so a
       column never merely touches the rail's own left edge, comes off insets.right again here */
    const insR = portrait ? 0 : ((ctx.atlas.insets && ctx.atlas.insets.right) || 0);
    const yT = st.y - 400, yB = st.y + st.h + 400, FAR = 60000;
    g.fillStyle = '#0a0118';
    const wxR = v.unapply(st.x + st.w - side - insR, 0)[0]; g.fillRect(wxR, yT, FAR, yB - yT);
    if (side > 0) { const wxL = v.unapply(st.x + side, 0)[0]; g.fillRect(wxL - FAR, yT, FAR, yB - yT); }
  },

  stopDemo() { if (this.demoT) { clearTimeout(this.demoT); this.demoT = 0; } if (this.walkT) { clearTimeout(this.walkT); this.walkT = 0; } },

  /* W35: recomputed on every angle change, every tour tick and every viewport-shape change (never polled) — the three
     things that can make the answer change. 'holds' = the tour is actively driving (playing its hold or still flying
     to it, the same test chrome.js's tourDriving() uses), not merely "a tour exists"; a paused or finished tour hands
     the readout back, same as free camera. */
  syncReadHidden(ctx) {
    if (!this.read) return;
    let hide = false;
    if (this.sec && this.sec.classList.contains('is-active') && this.touchMq && this.touchMq.matches) {
      let id = null; try { id = ctx.angle.get().id; } catch (e) {}
      if (id === 'line') { const a = ctx.tour && ctx.tour.active; hide = !!(a && a.id && (a.playing || a.enRoute)); }
    }
    if (hide === this._readHidden) return;
    this._readHidden = hide; this.read.classList.toggle('cal-hide', hide);
  },

  /* kiosk: walk the window across the break, which is the whole argument of the room in one gesture */
  demo(ctx) {
    if (!this.ready) return;
    this.stopDemo();
    const alive = () => this.sec && this.sec.classList.contains('is-active') && !ctx.demoStopped;
    const bi = this.breakAt >= 0 ? this.breakAt : (this.nm >> 1);
    const from = Math.max(0, bi - 13), to = Math.min(this.nm - 1, bi + 13);
    if (ctx.reduced) { this.setMonth(bi, ctx, true); return; }
    let m = from; this.setMonth(m, ctx, true);
    const step = () => {
      this.demoT = 0;
      if (!alive()) return;
      if (++m > to) return;
      this.setMonth(m, ctx);
      this.demoT = setTimeout(step, 300);
    };
    this.demoT = setTimeout(step, 600);
  },
  /* ================================================================ atlas (BUILD_SPEC_V2 §1.4, §3 calendar row) */
  angles: [{ id: 'ribbon', name: 'the ribbon' }, { id: 'line', name: 'the line' }, { id: 'after', name: 'after the line' }],

  labelsOn(ctx) { try { const v = ctx.settings.get('labels'); return v !== false && v !== 'off'; } catch (e) { return true; } },

  atlasEnter(ctx, y1) {
    const P = ctx.particles, prov = P.prov, s = this.s;
    P.glyphAll(true);
    P.glyphMode('cat', { cats: CATS });
    P.catBy((i) => prov[i] + 1);
    /* the grid divides the month pitch, so month edges are cell edges; its rows count up from half a pixel under the
       baseline (the bottom dot row sits on the baseline itself). a phone gets one cell per month */
    /* one cell per month on a phone, and on a desktop where half a month would be under ~6.5 device px (a dpr 1 screen),
       where a 4.8 px glyph is unreadable; otherwise the default cell, two glyph columns per month */
    const one = ctx.lowPower || this.colW * P.dpr / 2 < 6.5;
    P.glyphCell(one ? Math.max(4, Math.min(12, this.colW)) : null);
    /* R2V2P finding (D2 regional): before/after the october 2023 break must each hold their own categorical share --
       without a zone boundary the grid's Boyer-Moore majority vote blends the two eras at the seam, reading up to
       3.1 points more tapped than the dots before the break. P.glyphZones (already built for exactly this, shell.js
       glyphZones/GCFG.zones) resets the vote at the break column. */
    P.glyphGrid({ ox: s.x, oy: y1 + 0.5, pw: this.colW, fit: 'divide', zones: this.breakAt > 0 ? [this.breakAt] : null });
    ctx.view.configure({ mode: 'pan', zMin: 1, zMax: 4, drift: false, look: (k) => this.look(k, ctx) });
    this.atlasLabels(ctx);
    if (this.offView) this.offView();
    this.offView = ctx.view.onChange(() => this.pinBreak(ctx));
    this.pinBreak(ctx);
  },
  /* the top of the visible part of the line, in world px: y0 at home (and at ?atlas=0); zoomed, the world y now shown
     just under whatever sits over the top of the line on screen (the readout's plate, a chrome chip: pinY, measured on
     each pose change), never so low that the swing under it would leave the stacks */
  lineTop(ctx) {
    if (!this.A || !ctx.view || !(ctx.view.z > 1.0005)) return this.y0;
    const z = ctx.view.z, top = ctx.view.unapply(0, this.pinY || this.y0 + 8)[1];
    return Math.min(this.base - 60 / z, Math.max(this.y0, top));
  },
  /* where the NAME of [ october 2023 ] goes (world px): 6 px right of the line, on a baseline 11 px under the line's top,
     which is where ?atlas=0 prints it. at home, where that would sit on the readout's own text (a narrow phone wraps the
     readout down past the ribbon's top, and the labels module would hide the label), it steps down under that text */
  breakTarget(ctx) {
    const z = this.A ? ctx.view.z || 1 : 1, x = Math.round(this.s.x + this.breakAt * this.colW) + 0.5, m = labMetrics(this.root);
    let y = this.lineTop(ctx) + 11 / z;
    if (z < 1.0005) {
      /* the labels module tests a label's HIT box against the keepouts, and counts a touch as a hit: on a touch-first
         screen that is the pill plus its 44 px pad (anchors.js PAD_H 6 / PAD_V 14, same media query), which labMetrics'
         twin (living in this room, not in the labels layer) does not carry. so the step clears the pad, by two pixels (the module rounds) */
      let ph = 0, pv = 0; try { if (matchMedia(TOUCH_MQ).matches) { ph = 6; pv = 14; } } catch (e) {}
      const L = x + 6 - m.lead - ph, R = x + 6 - m.lead + m.w + ph;
      for (const k of this.keepout()) if (L < k.x + k.w && R > k.x && y - m.base - pv < k.y + k.h + 2 && y - m.base + 19 + pv > k.y) y = Math.max(y, k.y + k.h + m.base + pv + 2);
    }
    return [x + 6 / z, y];
  },
  /* the anchor that puts the name there. the labels module sets a box off its anchor by its own rules (style, zoom, the
     lock's plate), so the first guess (its rule today: off = 4.32·z + 6 right and off + 18 up) is refined by what it
     actually did: fitBreak() measures the placed name and keeps the residual, in screen px */
  breakAnchor(ctx) {
    /* the line view (fix r2): the camera is locked on october 2023, so the labels module puts its reticle on the anchor
       and the label just up-right of it. the anchor is the line's foot, where the change meets the baseline, and not the
       name's old place at the top, where the reticle landed on the 11.8% */
    if (this.footLock) return { x: Math.round(this.s.x + this.breakAt * this.colW), y: this.base };
    const z = this.A ? ctx.view.z || 1 : 1, m = labMetrics(this.root), off = 0.72 * 6 * z + 6, t = this.breakTarget(ctx), c = this.labCorr || [0, 0];
    return { x: t[0] + (c[0] - off - m.lead) / z, y: t[1] + (c[1] + off + 18 - m.base) / z };
  },
  fitBreak(ctx) {
    clearTimeout(this.fitT);
    this.fitT = setTimeout(() => requestAnimationFrame(() => {
      if (!this.s || this.breakAt < 0 || this.footLock || !this.sec.classList.contains('is-active') || (this.fitN = (this.fitN || 0) + 1) > 3) return;
      const lab = [...document.querySelectorAll('#atlas-labels .lab.on')].find((e) => e.textContent === 'october 2023'), tn = lab && lab.firstChild;
      if (!tn || tn.nodeType !== 3) return;
      const rg = document.createRange(); rg.selectNodeContents(tn); const r = rg.getBoundingClientRect(); if (!r.width) return;
      let asc = 0; try { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(lab).font; asc = c.measureText('o').fontBoundingBoxAscent || 0; } catch (e) {}
      if (!asc) return;
      const t = ctx.view.apply(...this.breakTarget(ctx)), dx = t[0] - r.left, dy = t[1] - (r.top + asc);
      /* a label the module put in another quadrant (blocked up-right) is not chased */
      if ((Math.abs(dx) < 0.35 && Math.abs(dy) < 0.35) || Math.abs(dx) > 40 || Math.abs(dy) > 40) return;
      const c = this.labCorr || [0, 0]; this.labCorr = [c[0] + dx, c[1] + dy];
      this.pinBreak(ctx, true);
    }), 120);
  },
  /* the break label is pinned in screen terms: right of the line and just under its top, or under the top of the
     visible part of the line when a zoom has pushed the top off the stage (the labels module anchors in world px, so
     the anchor is re-derived from the pose, only when the pose changes) */
  pinBreak(ctx, fit) {
    if (!this.s || !this.sec.classList.contains('is-active')) return;
    const z = ctx.view.z || 1, zoomed = z > 1.0005;
    this.read.classList.toggle('cal-zoom', zoomed);
    if (this.breakAt < 0) return;
    /* fix r3 (REQUESTS_fix_r3_C1 #1): the reticle goes to the foot whenever the camera is locked on the line, zoomed or
       not (a line view that cannot zoom left it on the 11.8%); the swing's place and plates still follow the zoom */
    this.footLock = !!this.A && ctx.view.lock === 'october 2023';
    if (zoomed) {
      /* what covers the top of the line on screen: the readout's plate and any chrome over the top half of the stage */
      const sx = ctx.view.apply(Math.round(this.s.x + this.breakAt * this.colW) + 0.5, 0)[0], L = sx - 24, R = sx + 150;
      /* where the readout really ends (a narrow phone wraps it to a third line, below the ribbon's top), plate included */
      if (this.readDirty !== false) { this.readB = this.s.y + this.read.offsetHeight - PLATE_Y; this.readDirty = false; }
      /* a rect covers the top of the line only if it reaches into the band the swing (and, unlocked, the label) would
         take under t: the desk ladder column beside a line that sits right of centre starts far below that band, and
         taking its foot as the line's top put the swing at the foot (fix r3) */
      let t = Math.max(this.y0, this.readB + 7);
      const band = this.footLock ? 34 : 74, ks = this.keepScreen().filter((k) => k.left < R && k.right > L && k.bottom > this.s.y - 60 && k.top < this.s.y + this.s.h * 0.45).sort((a, b) => a.top - b.top);
      for (const k of ks) if (k.top < t + band && k.bottom > t) t = k.bottom;
      /* the label's box, not just the line, starts under t; with the label down at the foot only the swing rides up here */
      this.pinY = this.footLock ? t : t + labMetrics(this.root).base - 11 + 4;
    }
    if (!fit) this.fitN = 0;
    const a = this.breakAnchor(ctx);
    ctx.labels.update('calendar', 'break', { x: a.x, y: a.y });
    this.fitBreak(ctx);
  },

  colX(m) { return this.s.x + (m + 0.5) * this.colW; },
  /* the top of month m's stack, from the same numbers the layout used */
  colTop(m) {
    const cw = Math.max(1, this.colW * 0.84), per = Math.max(1, Math.round(cw)), rowsMax = Math.ceil(this.max / per), rowH = Math.min(1, (this.rh - 10) / rowsMax);
    return this.base - Math.max(0, Math.ceil(this.cnt[m] / per) - 1) * rowH;
  },
  look(k, ctx) {
    if (!this.s) return null;
    const mid = this.y0 + (this.base - this.y0) * 0.38;
    /* the line's own view: linePose() (its zoom is the pose's own, <= 1.6; a caller that forces another zoom gets this
       centre at that zoom) */
    if (k === 'break' && this.breakAt >= 0) {
      const p = ctx ? this.linePose(ctx) : null;
      return p ? [p.cx, p.cy] : [this.s.x + this.breakAt * this.colW, (this.y0 + this.base) / 2];
    }
    if (k === 'after' && this.breakAt >= 0) return [this.s.x + (this.breakAt + this.nm) / 2 * this.colW, (this.y0 + this.base) / 2];
    const m = /^month:(\d{4}-\d{2})$/.exec(String(k)); if (m) { const i = this.months.indexOf(m[1]); if (i >= 0) return [this.colX(i), mid]; }
    return null;
  },

  /* ◦ october 2023 sits where the overlay used to print the name, just right of the top of the line; a month that
     search or the ladder flew to gets its own ◦ name over its column */
  atlasLabels(ctx) {
    if (!this.A || !this.s || !this.sec.classList.contains('is-active')) return;
    const items = [];
    if (this.breakAt >= 0) {
      const a = this.breakAnchor(ctx);
      items.push({ id: 'break', text: 'october 2023', kind: 'obj', x: a.x, y: a.y, r: 0, pri: 8,
        go: (c) => { c.angle.set('line', { via: 'tap' }); try { c.lock('october 2023'); } catch (e) {} } });
    }
    if (this.focusM >= 0 && this.focusM !== this.breakAt) {
      const m = this.focusM, name = longM(this.months[m]);
      items.push({ id: 'focus', text: name, kind: 'obj', x: this.colX(m) - 5, y: this.colTop(m) - 4, r: 0, pri: 9,
        go: (c) => this.focus({ month: this.months[m] }, c) });
    }
    ctx.labels.set('calendar', items);
  },

  setAngle(k, ctx, o = {}) {
    if (!this.ready || !this.s) return 0;
    this.stopDemo();
    const inst = !!o.instant || ctx.reduced, bi = this.breakAt >= 0 ? this.breakAt : 0;
    if (k === 0) { this.setMonth(bi, ctx, true); ctx.view.home({ instant: inst }); return 0; }
    if (k === 1) {
      this.setMonth(bi, ctx, true);
      const p = this.linePose(ctx);
      ctx.view.flyTo(p ? { cx: p.cx, cy: p.cy, z: p.z } : { z: LINE_Z, look: 'break' }, { speed: 'quick', lock: 'october 2023' });
      try { ctx.lock('october 2023'); } catch (e) {}
      return inst ? 0 : 650;
    }
    /* after: the window walks from the line to the last month, one month a beat, and stays there */
    ctx.view.home({ instant: inst });
    const last = this.nm - 1;
    if (inst) { this.setMonth(last, ctx, true); return 0; }
    let m = Math.max(bi, Math.min(this.cur, last)); this.setMonth(m, ctx, true);
    const step = () => { this.walkT = 0; if (!this.sec.classList.contains('is-active')) return; if (++m > last) return; this.setMonth(m, ctx, m !== last); this.walkT = setTimeout(step, 55); };
    this.walkT = setTimeout(step, 250);
    return 250 + (last - m) * 55 + 300;
  },

  /* search and the ladder: {month: 'YYYY-MM'} (or a day, read as its month), {year: 'YYYY'} = the first month of that year */
  focus(d, ctx) {
    if (!this.ready || !d || !this.s) return false;
    let key = d.month != null ? String(d.month).trim().toLowerCase() : d.day != null ? String(d.day).slice(0, 7) : null;
    /* "october 2023" / "oct 2023" as well as "2023-10" */
    if (key && !/^\d{4}-\d{2}/.test(key)) { const w = /^([a-z]+)\s+(\d{4})$/.exec(key), i = w ? MON_L.indexOf(w[1]) >= 0 ? MON_L.indexOf(w[1]) : MON_S.indexOf(w[1].slice(0, 3)) : -1; key = i >= 0 ? w[2] + '-' + String(i + 1).padStart(2, '0') : null; }
    if (key) key = key.slice(0, 7);
    if (!key && d.year != null) { const y = String(d.year).slice(0, 4); key = this.months.find((mm) => mm.slice(0, 4) === y) || null; }
    const m = key ? this.months.indexOf(key) : -1; if (m < 0) return false;
    this.stopDemo(); this.setMonth(m, ctx, true); this.focusM = m;
    const name = longM(this.months[m]);
    /* framed, not just centred: the whole column, its [ name ] above it and the baseline with its year under it, between
       the readout's plate and the scrubber, at the largest zoom <= 2.2 that shows all of it */
    const x = this.colX(m), p = this.A ? this.framePose(ctx, [[x - 2 * this.colW, this.colTop(m) - 26, x + 2 * this.colW, this.base + 16]], 2.2, this.keepScreen(), false) : null;
    ctx.view.flyTo(p ? { cx: p.cx, cy: p.cy, z: p.z } : { wx: x, wy: (this.colTop(m) + this.base) / 2, z: 2.2 }, { speed: 'quick', lock: name });
    try { ctx.lock(name); } catch (e) {}
    this.atlasLabels(ctx);
    return true;
  },

  /* ---- the line view (fix r2, r3). the line near the middle of the stage, at the largest zoom <= LINE_Z where every
     column on screen (the viewport, less a tall panel down the left) ends under its own ceiling, one of them on it, and
     the baseline with its year labels still clears the scrubber. a column's ceiling:
     - under the readout's plate, or within LINE_BAND px of the line (where the swing rides): LINE_GAP px under the plate;
     - anywhere else: 8 px under the stage's top, and 12 px under any chrome over the top band that it runs under.
     fix r3: round 2 held every column on screen to the plate's ceiling. since the desk stage gave its right edge to the
     ladder, the ribbon's right end (the four tallest months of the log) is on screen past the stage at any zoom around
     the line, and the view could not zoom at all (z 1). those months now stop under the chrome over them instead.
     "ends" is the rendered top: the top of the glyph cell that holds the column's top dot row, on the lattice this zoom
     lays out (rows count up from half a pixel under the baseline, cells DIVIDE the month pitch, GF §6.3). at each zoom
     the line may sit off centre by up to LINE_OFF of the stage when that keeps a taller column off screen (35%: on the
     inset desk stage the log's last months leave the screen only past 31% at z 1.6); every pose is scored after the
     camera's own pan clamp. the least-bad pose when nothing fits */
  ceilings(ctx, st) {
    const rr = this.read.getBoundingClientRect(), zoomed = this.read.classList.contains('cal-zoom');
    let top = rr.bottom + (zoomed ? 0 : PLATE_Y);
    const band = [], plate = [rr.left - (zoomed ? 0 : 6), rr.right + (zoomed ? 0 : 6)];
    for (const k of this.keepChrome()) {
      if (k.bottom >= st.y + st.h * 0.3) continue;
      if (k.right > st.x && k.left < st.x + st.w && k.bottom > top && k.left < plate[1] && k.right > plate[0]) top = k.bottom;
      band.push([k.left, k.right, k.bottom + 12]);
    }
    return { top, plate, band, floor: st.y + 8 };
  },
  ceilOf(C, sx0, sx1, lineS) {
    let c = C.floor;
    for (const k of C.band) if (sx0 < k[1] && sx1 > k[0] && k[2] > c) c = k[2];
    if ((sx0 < C.plate[1] && sx1 > C.plate[0]) || (sx1 > lineS - LINE_BAND && sx0 < lineS + LINE_BAND)) c = Math.max(c, C.top + LINE_GAP);
    return c;
  },
  linePose(ctx) {
    const v = ctx.view, st = v && (v.stageRect || ctx.stage()), c0x = v && v.cx0, c0y = v && v.cy0;
    if (!this.s || this.breakAt < 0 || !st || !(st.w > 0) || !isFinite(c0x) || !isFinite(c0y)) return null;
    const bx = this.s.x + this.breakAt * this.colW, dpr = ctx.particles.dpr || 1, oy = this.base + 0.5;
    const C = this.ceilings(ctx, st), top = C.top;
    const sb = this.scrub.getBoundingClientRect(), bot = (sb.height ? sb.top : st.y + st.h - 44) - 4 - 16;
    /* on screen: the STAGE (round 2, W(rail) — st.w is already narrowed by the ladder's own insets.right, K8/
       ctx.atlas.insets, since ctx.stage() reads it; a raw innerWidth here let the "which columns are on screen"
       test see past the desktop rail, so a candidate pose could pass with a column, a year label or the thin-months
       caption actually sitting under the rail, or past a narrower stage's own edge, never checked against either),
       less a panel that runs down the left of the stage (the desktop info card and wall text) */
    let vx0 = st.x;
    const wall = this.sec.querySelector('.wall');
    [document.getElementById('atlas-info'), wall].forEach((el) => { const r = el && el.getBoundingClientRect(); if (r && r.width && r.height > innerHeight * 0.4 && r.right <= st.x + 1) vx0 = Math.max(vx0, r.right); });
    const vx1 = st.x + st.w;
    let css = 0; try { css = ctx.atlas.GF.info().cellCss || 0; } catch (e) {}
    const cwT = Math.max(3, Math.round(css * dpr)), tops = new Float64Array(this.nm), ceil = new Float64Array(this.nm);
    const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
    let best = null;
    for (let z = LINE_Z; z >= 1 - 1e-9; z -= 0.02) {
      const hw = st.w / 2 / z, hh = st.h / 2 / z, mx = 0.15 * st.w / z, my = 0.15 * st.h / z;
      let rx0 = st.x + hw - mx, rx1 = st.x + st.w - hw + mx, ry0 = st.y + hh - my, ry1 = st.y + st.h - hh + my;
      if (rx0 > rx1) { const c = st.x + st.w / 2; rx0 = c - mx; rx1 = c + mx; }
      if (ry0 > ry1) { const c = st.y + st.h / 2; ry0 = c - my; ry1 = c + my; }
      /* this zoom's cell height in world px, and each month's rendered top (css 0: no glyph field, the top dot row) */
      let chW = 0;
      if (css) { const pw = this.colW * z * dpr; let cw = pw / Math.max(1, Math.round(pw / cwT)); while (cw < 3) cw *= 2; let ch = cw * 1.8; while (ch < 4) ch *= 2; chW = ch / (z * dpr); }
      for (let m = 0; m < this.nm; m++) { const y = this.colTop(m); tops[m] = !this.cnt[m] ? Infinity : chW ? oy - Math.ceil((oy - y) / chW - 1e-6) * chW : y; }
      let zBest = null;
      for (let j = -12; j <= 12; j++) {
        const cx = cl(bx + (j / 12) * LINE_OFF * st.w / z, rx0, rx1), off = Math.abs((bx - cx) * z);
        if (off > LINE_OFF * st.w + 0.5) continue;
        const wl = cx + (vx0 - c0x) / z, wr = cx + (vx1 - c0x) / z, lineS = (bx - cx) * z + c0x;
        /* the view's y: the most restrictive column on screen touches its ceiling */
        let cyT = Infinity, any = false;
        for (let m = 0; m < this.nm; m++) {
          const x0 = this.s.x + m * this.colW; ceil[m] = NaN;
          if (!(x0 + this.colW > wl && x0 < wr) || !isFinite(tops[m])) continue;
          const sx0 = (x0 - cx) * z + c0x; ceil[m] = this.ceilOf(C, sx0, sx0 + this.colW * z, lineS); any = true;
          const q = tops[m] - (ceil[m] - c0y) / z; if (q < cyT) cyT = q;
        }
        if (!any) continue;
        const cy = cl(cyT, ry0, ry1), baseS = (this.base - cy) * z + c0y;
        let gap = Infinity, topS = 0, ct = 0;
        for (let m = 0; m < this.nm; m++) { if (ceil[m] !== ceil[m]) continue; const t = (tops[m] - cy) * z + c0y, g = t - ceil[m]; if (g < gap) { gap = g; topS = t; ct = ceil[m]; } }
        const bad = Math.max(0, baseS - bot) + (gap < 0 ? -gap : 0.25 * gap);
        const cand = { cx, cy, z, bad, off, topS, baseS, top, ceil: ct };
        if (!best || bad < best.bad - 1e-6) best = cand;
        if (bad <= 0.5 && (!zBest || off < zBest.off)) zBest = cand;
      }
      if (zBest) return zBest;
    }
    return best;
  },

  /* ---- framing (fix r1; the same routine as clock.js). every rect in `want` (world px) shown whole, inside the stage
     and clear of `keep` (screen rects), at the largest zoom <= z, scored after the camera's own pan clamp (camera.js
     panRange: 15%/z of give). fixed: only z itself, and the least-bad pose when nothing is clean */
  framePose(ctx, want, z, keep, fixed) {
    const v = ctx.view, st = v.stageRect || ctx.stage(), c0x = v.cx0, c0y = v.cy0, pad = 8;
    if (!st || !(st.w > 0) || !isFinite(c0x) || !want.length) return null;
    const U = [st.x + pad, st.y + pad, st.x + st.w - pad, st.y + st.h - pad];
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const r of want) { if (r[0] < bx0) bx0 = r[0]; if (r[1] < by0) by0 = r[1]; if (r[2] > bx1) bx1 = r[2]; if (r[3] > by1) by1 = r[3]; }
    const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
    const zs = [z]; if (!fixed) { for (let zz = z - 0.05; zz > 1 + 1e-6; zz -= 0.05) zs.push(zz); if (z > 1) zs.push(1); }
    let worst = null;
    for (const zz of zs) {
      const hw = st.w / 2 / zz, hh2 = st.h / 2 / zz, mx = 0.15 * st.w / zz, my = 0.15 * st.h / zz;
      let rx0 = st.x + hw - mx, rx1 = st.x + st.w - hw + mx, ry0 = st.y + hh2 - my, ry1 = st.y + st.h - hh2 + my;
      if (rx0 > rx1) { const c = st.x + st.w / 2; rx0 = c - mx; rx1 = c + mx; }
      if (ry0 > ry1) { const c = st.y + st.h / 2; ry0 = c - my; ry1 = c + my; }
      const bw = (bx1 - bx0) * zz, bh = (by1 - by0) * zz, N = 12, ux = (U[0] + U[2]) / 2, uy = (U[1] + U[3]) / 2;
      let best = null;
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const L = U[0] + (U[2] - U[0] - bw) * i / N, T = U[1] + (U[3] - U[1] - bh) * j / N;
        const cx = cl(bx0 - (L - c0x) / zz, rx0, rx1), cy = cl(by0 - (T - c0y) / zz, ry0, ry1);
        let bad = 0;
        for (const w of want) {
          const l = (w[0] - cx) * zz + c0x, t = (w[1] - cy) * zz + c0y, r = (w[2] - cx) * zz + c0x, b = (w[3] - cy) * zz + c0y;
          bad += Math.max(0, U[0] - l) + Math.max(0, U[1] - t) + Math.max(0, r - U[2]) + Math.max(0, b - U[3]);
          for (const k of keep) { const ox = Math.min(r, k.right) - Math.max(l, k.left), oy = Math.min(b, k.bottom) - Math.max(t, k.top); if (ox > 0 && oy > 0) bad += Math.min(ox, oy); }
        }
        const d = Math.hypot(((bx0 + bx1) / 2 - cx) * zz + c0x - ux, ((by0 + by1) / 2 - cy) * zz + c0y - uy);
        if (!best || bad < best.bad - 1e-6 || (Math.abs(bad - best.bad) <= 1e-6 && d < best.d)) best = { bad, d, cx, cy, z: zz };
      }
      if (best.bad <= 0.5) return best;
      if (!worst || best.bad < worst.bad) worst = best;
    }
    return fixed ? worst : null;
  },
  /* the chrome over the field (the anchors module's keepout set, plus the sound chip), the readout's plate, the scrubber */
  keepScreen() {
    const out = this.keepChrome(), add = (el, g = 0) => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push(g ? { left: r.left - g, top: r.top - g, right: r.right + g, bottom: r.bottom + g } : r); };
    add(this.read, 7); add(this.scrub);
    return out;
  },
  /* the chrome over the field: only what is on screen (a phone parks the ladder's panel just off the right edge, full
     height, and a line near that edge took it for chrome over the top of the stage) */
  keepChrome() {
    const out = [];
    document.querySelectorAll('#top > *, #atlas-sound-chip, #atlas-info, .atlas-ladder, .atlas-ladder-chip, #atlas-dock, [data-keepout]').forEach((el) => { if (el.hidden) return; const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight) out.push(r); });
    return out;
  },

  precision() { return this.prec ? this.prec.slice() : []; },
  /* the readout's text itself, piece by piece (not its line boxes: the split line wraps on a phone and its box is then the
     full stage width, which hid the break label sitting beside the text) */
  keepout() {
    const out = [];
    [this.mEl, this.nEl, this.cT, this.cS, this.cV].forEach((el) => { const r = el && el.getBoundingClientRect(); if (r && r.width) out.push({ x: r.left, y: r.top, w: r.width, h: r.height }); });
    return out;
  },
};
