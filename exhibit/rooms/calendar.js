/* room 02 — the ruler changed. the whole record as a ribbon of 81 months: one column per month, every dot
   in its month, stacked by who pressed play (tapped at the bottom in mint, shuffle above it in amber, the
   served queue on top in violet). a dotted line at october 2023, where the logger changed its vocabulary.
   one interaction: a scrubber that sweeps a one-month window across the ribbon and reads out that month's
   split. on a desktop, hovering the ribbon does the same thing.
   every number in this room comes from exhibit/data/wall.json (months x tap/shuffle/served), read through
   ctx.identity() so the dots and the readout are counting the same log. */
const BREAK = '2023-10';
const MON_S = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MON_L = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const comma = (n) => String(n | 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const shortM = (m) => MON_S[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const longM = (m) => MON_L[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const pct1 = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0');
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
section[data-room=calendar] .cal-pad{position:absolute;pointer-events:none;background:none}
section[data-room=calendar] .cal-scrub{position:absolute;display:flex;align-items:center}
section[data-room=calendar] .cal-bk{position:absolute;top:50%;width:2px;height:13px;margin-top:-6px;background:rgba(134,203,254,.75);border-radius:1px;pointer-events:none}
section[data-room=calendar] .cal-range{-webkit-appearance:none;appearance:none;width:100%;height:44px;margin:0;padding:0;background:none;border:0;cursor:ew-resize;touch-action:pan-y}
section[data-room=calendar] .cal-range:focus{outline:none}
section[data-room=calendar] .cal-range:focus-visible{outline:2px solid var(--mint);outline-offset:2px;border-radius:999px}
section[data-room=calendar] .cal-range::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:rgba(134,203,254,.24)}
section[data-room=calendar] .cal-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:15px;height:15px;margin-top:-6px;border-radius:50%;background:var(--mint);border:2px solid #0a0118;box-shadow:0 0 10px rgba(33,246,188,.45)}
section[data-room=calendar] .cal-range::-moz-range-track{height:3px;border-radius:2px;background:rgba(134,203,254,.24);border:0}
section[data-room=calendar] .cal-range::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:var(--mint);border:2px solid #0a0118;box-shadow:0 0 10px rgba(33,246,188,.45)}
@media (max-height:480px) and (min-aspect-ratio:115/100){section[data-room=calendar] .cal-m b{font-size:13.5px}section[data-room=calendar] .cal-c,section[data-room=calendar] .cal-n{font-size:10.5px}}
@media (max-width:420px){section[data-room=calendar] .cal-split{gap:9px}section[data-room=calendar] .cal-c{font-size:10.5px}section[data-room=calendar] .cal-c::before{width:7px;height:7px;margin-right:5px}}`;

export default {
  id: 'calendar', track: 'anti-dimmable', ready: false, cur: -1, demoT: 0, mt: 0, t0: 0,

  async mount(root, ctx) {
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
    this.rng.max = String(this.nm - 1);
    this.rng.setAttribute('aria-label', 'scrub the months, ' + longM(this.months[0]) + ' to ' + longM(this.months[this.nm - 1]));
    this.rng.addEventListener('input', () => { this.stopDemo(); this.setMonth(+this.rng.value, ctx); });
    this.rng.addEventListener('pointerdown', () => this.stopDemo());

    /* hovering the ribbon scrubs it, on devices that have a hover. a finger keeps the page scrolling instead */
    if (!ctx.coarse) {
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
    /* one quiet note when the window steps over the line, so the changepoint is audible as well as drawn */
    if (!quiet && was >= 0 && this.breakAt >= 0 && (was < this.breakAt) !== (m < this.breakAt)) ctx.audio.note(2, { dur: 0.5, vol: 0.035 });
  },

  enter(ctx) {
    const P = ctx.particles;
    P.ease = 0.09; P.jitter = 0.25; P.big = false; P.swirl = 0.18; P.touch = false; /* the ribbon stays legible: dots do not part around the pointer here */
    if (!this.ready) { P.scatter(); P.color(() => ctx.PAL.fog); return; }
    const s = ctx.stage(); this.s = s;

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
    this.read.style.left = s.x + 'px'; this.read.style.top = s.y + 'px'; this.read.style.width = rw + 'px';
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
  },

  leave() { this.stopDemo(); },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready || !this.s) return;
    const s = this.s, y0 = this.y0, base = this.base, rh = this.rh, nm = this.nm, colW = this.colW, rw = this.rw;
    const tiny = rh < 230 || rw < 420;

    /* the ribbon breathes with the low band: every column is scaled about its own baseline, which keeps
       the months in proportion to each other while the whole record moves with the track */
    if (!ctx.reduced) {
      const P = ctx.particles, ty = P.ty, hh = this.hh, n = P.n;
      const k = 1 + bands.low * 0.055 + Math.sin(t * 0.00062) * 0.007;
      for (let i = 0; i < n; i++) ty[i] = base - hh[i] * k;
    }

    g.save();
    /* baseline and the quiet year ticks */
    g.strokeStyle = 'rgba(134,203,254,.16)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(s.x, base + 0.5); g.lineTo(s.x + rw, base + 0.5); g.stroke();
    const showYears = colW * 12 > 26;
    g.font = '500 9px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    for (let m = 0; m < nm; m++) {
      if (this.months[m].slice(5) !== '01') continue;
      const x = s.x + (m + 0.5) * colW;
      g.strokeStyle = 'rgba(134,203,254,.22)';
      g.beginPath(); g.moveTo(x, base + 1); g.lineTo(x, base + 4); g.stroke();
      if (showYears) { g.fillStyle = 'rgba(164,155,189,.5)'; g.fillText(this.months[m].slice(0, 4), x, base + 5); }
    }

    /* how empty the empty part is, in its own numbers. only when it fits inside the bare months themselves. */
    if (this.thin) {
      g.font = '500 9.5px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const span = this.thin * colW, fit = this.thinTxt.find((t) => g.measureText(t).width < span - 10);
      if (fit) { g.fillStyle = 'rgba(164,155,189,.5)'; g.fillText(fit, s.x + span / 2, base - 10); }
    }

    /* the window the scrubber is standing in */
    if (this.cur >= 0) {
      const bw = Math.max(colW, 9), cx = s.x + (this.cur + 0.5) * colW, x0 = cx - bw / 2;
      const gr = g.createLinearGradient(0, y0, 0, base);
      gr.addColorStop(0, 'rgba(240,234,255,.015)'); gr.addColorStop(1, 'rgba(240,234,255,.11)');
      g.fillStyle = gr; g.fillRect(x0, y0, bw, base - y0);
      g.strokeStyle = 'rgba(240,234,255,.34)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0 + 0.5, y0); g.lineTo(x0 + 0.5, base); g.moveTo(x0 + bw - 0.5, y0); g.lineTo(x0 + bw - 0.5, base); g.stroke();
    }

    /* the changepoint. it draws itself down the ribbon the first time the room comes up. */
    if (this.breakAt >= 0) {
      if (!this.t0) this.t0 = t;
      if (this.mt < 1) this.mt = Math.min(1, (t - this.t0) / 760);
      const e = 1 - Math.pow(1 - this.mt, 3);
      const x = Math.round(s.x + this.breakAt * colW) + 0.5;
      g.strokeStyle = 'rgba(134,203,254,.62)'; g.lineWidth = 1; g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + (base - y0) * e); g.stroke(); g.setLineDash([]);
      if (this.mt > 0.45) {
        const al = Math.min(1, (this.mt - 0.45) / 0.55);
        const right = x > s.x + rw - 118;
        /* the label and the swing print inside the top of the ribbon, never above it: the readout lives up there */
        g.font = '600 ' + (tiny ? 9.5 : 10) + 'px "JetBrains Mono", ui-monospace, monospace'; g.textBaseline = 'alphabetic';
        g.textAlign = right ? 'right' : 'left'; g.fillStyle = 'rgba(134,203,254,' + (0.88 * al).toFixed(3) + ')';
        g.fillText('october 2023', x + (right ? -6 : 6), y0 + 11);
        /* the swing itself, beside the line: the number moved, the listener did not */
        const yN = y0 + (tiny ? 34 : 40);
        g.font = '600 ' + (tiny ? 10.5 : 12) + 'px "JetBrains Mono", ui-monospace, monospace'; g.fillStyle = 'rgba(33,246,188,' + (0.9 * al).toFixed(3) + ')';
        g.textAlign = 'right'; g.fillText(this.beforeTxt + '%', x - 7, yN);
        g.textAlign = 'left'; g.fillText(this.afterTxt + '%', x + 7, yN);
        g.font = '500 ' + (tiny ? 8.5 : 9.5) + 'px "JetBrains Mono", ui-monospace, monospace'; g.fillStyle = 'rgba(164,155,189,' + (0.72 * al).toFixed(3) + ')';
        g.textAlign = 'right'; g.fillText('tapped, before', x - 7, yN + 12);
        g.textAlign = 'left'; g.fillText('after', x + 7, yN + 12);
      }
    }
    g.restore();
  },

  stopDemo() { if (this.demoT) { clearTimeout(this.demoT); this.demoT = 0; } },

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
};
