/* room 7: tap a claim. the field falls into a null histogram (amber: a null is chance), then my
   real number drops in last as one ink mark. buried = killed, outside = survived.
   data: exhibit/data/killit.json. */

const SHORT = [
  'even on a relearned map, my picks bridge more than autoplay does',
  'my network has real topological loops, not just tight clusters',
  'when i tap, i cross genre-families more than habit alone predicts',
  'hip-hop/r&b is a genre i actually pick, not bucket-size noise',
];
const NULL_TXT = "a null is what the number looks like when the effect isn't there. i scramble the part that would carry the effect and recompute, hundreds of times.";
const STONE_LINE = 'sixteen of my findings died this way.';
const CAVEAT = 'four of my pre-declared tests are runnable here. two survived. the other twelve kills are in the lab, and most of them are not this pretty.';
const V_K = "it's buried in the pile. this one died.";
const V_S = 'it stands outside the pile. this one lived.';
/* AX: the histogram + marker share one honest scale, but only fill this much of the stage width —
   the rest stays empty black so a survivor (whose value sits past almost all of the pile's mass)
   has somewhere to visibly stand instead of pinning itself to the frame edge. */
const AX = 0.68;

const TPL = `<div class="gv-pn">
<div class="gv-cards"></div>
<p class="gv-null"></p>
<div class="gv-result" hidden>
<p class="gv-status" aria-live="polite" tabindex="-1"></p>
<p class="gv-nums"></p>
<p class="gv-x"></p>
<p class="gv-rule"></p>
<button type="button" class="btn ghost gv-again">run another</button>
</div>
<div class="gv-buried">
<p class="gv-stoneline"></p>
<button type="button" class="gv-sixteen" aria-expanded="false">the sixteen</button>
<ul class="gv-sixteen-list" hidden></ul>
</div>
<p class="gv-caveat"></p>
</div>`;

const CSS = `section[data-room=graveyard] .gv-pn{position:absolute;display:flex;flex-direction:column;gap:12px;overflow-y:auto;-webkit-overflow-scrolling:touch}
section[data-room=graveyard] .gv-pn.more{-webkit-mask-image:linear-gradient(#000 calc(100% - 28px),transparent);mask-image:linear-gradient(#000 calc(100% - 28px),transparent)}
section[data-room=graveyard] .gv-cards{display:flex;flex-direction:column;gap:8px;margin-top:auto}
section[data-room=graveyard] .gv-card{display:flex;align-items:center;gap:10px;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:rgba(10,1,24,.55);color:var(--ink);font:500 12.5px/1.35 var(--mono);text-align:left;cursor:pointer}
section[data-room=graveyard] .gv-card:hover,section[data-room=graveyard] .gv-card:focus-visible{border-color:var(--ice)}
section[data-room=graveyard] .gv-card:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
section[data-room=graveyard] .gv-card[disabled],section[data-room=graveyard] .gv-card[aria-disabled=true]{opacity:.3;cursor:default}
section[data-room=graveyard] .gv-status:focus{outline:none}
section[data-room=graveyard] .gv-status:focus-visible{outline:2px solid var(--ice);outline-offset:3px;border-radius:2px}
section[data-room=graveyard] .gv-card span{flex:1}
section[data-room=graveyard] .gv-null,section[data-room=graveyard] .gv-x,section[data-room=graveyard] .gv-rule,section[data-room=graveyard] .gv-stoneline,section[data-room=graveyard] .gv-caveat{margin:0;font:400 11.5px/1.55 var(--mono);color:var(--mute)}
section[data-room=graveyard] .gv-result{display:flex;flex-direction:column;gap:6px}
section[data-room=graveyard] .gv-status{margin:0;min-height:1.3em;font:600 13.5px/1.4 var(--mono)}
section[data-room=graveyard] .gv-status.k{color:var(--rose)}
section[data-room=graveyard] .gv-status.s{color:var(--mint)}
section[data-room=graveyard] .gv-nums{margin:0;font:500 12px/1.4 var(--mono);color:var(--ink)}
section[data-room=graveyard] .gv-again{align-self:flex-start}
section[data-room=graveyard] .gv-card.on{border-color:var(--ice)}
section[data-room=graveyard] .gv-pn.ran .gv-null{display:none}
section[data-room=graveyard] .gv-pn.ran .gv-card:not(.on){display:none}
section[data-room=graveyard] .gv-buried{margin-top:4px}
section[data-room=graveyard] .gv-sixteen{margin-top:2px;padding:0;border:0;background:none;color:var(--ice);font:500 11.5px/1.4 var(--mono);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
section[data-room=graveyard] .gv-sixteen:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
section[data-room=graveyard] .gv-sixteen-list{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:5px 16px}
section[data-room=graveyard] .gv-sixteen-list li{font:400 11px/1.4 var(--mono);color:var(--mute)}
@media (max-height:720px) and (max-aspect-ratio:115/100){
section[data-room=graveyard] .gv-pn{gap:5px}
section[data-room=graveyard] .gv-cards{display:grid;grid-template-columns:1fr 1fr;gap:5px}
section[data-room=graveyard] .gv-card{font-size:10.6px;line-height:1.2;padding:5px 8px;min-height:34px}
section[data-room=graveyard] .gv-null,section[data-room=graveyard] .gv-stoneline,section[data-room=graveyard] .gv-caveat{font-size:10.2px;line-height:1.38}
section[data-room=graveyard] .gv-x,section[data-room=graveyard] .gv-rule{font-size:10.2px;line-height:1.32}
section[data-room=graveyard] .gv-status{font-size:12.5px}
section[data-room=graveyard] .gv-result{gap:4px}
/* after a run, the one surviving card no longer needs to share a row — give it the full width back,
   and drop the aggregate graveyard (stones/line/caveat) so the direct result never has to compete
   with it for the little height a short phone has. */
section[data-room=graveyard] .gv-pn.ran .gv-cards{display:flex}
section[data-room=graveyard] .gv-pn.ran .gv-buried,section[data-room=graveyard] .gv-pn.ran .gv-caveat{display:none}
}`;

const KIOSK = /[?&]kiosk=1\b/.test(location.search);
const INK = '#d8d2ea', INK_RGB = '216,210,234';
function mix(a, b, t) {
  const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
}
function rnd2(n) { return Math.round(n * 100) / 100; }
function ord(n) {
  n = Math.round(n * 10) / 10;
  if (!Number.isInteger(n)) return n + 'th';
  const m = n % 100; if (m >= 11 && m <= 13) return n + 'th';
  const d = n % 10; return n + (d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th');
}

export default {
  id: 'graveyard', track: 'no-masks-ad-infinitum',
  ready: false, state: 'idle', curCase: -1, pileRect: null, settleAt: 0,
  async mount(root, ctx) {
    this.root = root;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root.innerHTML = TPL;
    const Q = { pn: '.gv-pn', cd: '.gv-cards', nl: '.gv-null', rs: '.gv-result', ss: '.gv-status', nm: '.gv-nums', xEl: '.gv-x', ru: '.gv-rule', ag: '.gv-again', sxBtn: '.gv-sixteen', sxList: '.gv-sixteen-list', sl: '.gv-stoneline', cv: '.gv-caveat' };
    for (const k in Q) this[k] = root.querySelector(Q[k]);
    this.nl.textContent = NULL_TXT;
    this.sl.textContent = STONE_LINE;
    this.cv.textContent = CAVEAT;
    this.ag.addEventListener('click', () => this.again(ctx, true));
    /* the verdict takes focus after a run; space there would otherwise reach the shell as 'next room' */
    this.ss.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); } });
    this.pn.addEventListener('scroll', () => this.checkScroll(), { passive: true });
    /* any hand in the room during the first-visit run takes over: the run stops and the cards come back */
    this._onHand = (e) => { if (e.isTrusted) { this._autoDone = true; this.cancelAuto(ctx); } };
    /* deep-linked straight here: a hand that arrives before the room has finished entering counts too */
    if (location.hash === '#' + this.id && !KIOSK) { addEventListener('pointerdown', this._onHand, { passive: true }); addEventListener('keydown', this._onHand); }
    this.sxBtn.addEventListener('click', () => {
      const open = this.sxList.hidden;
      this.sxList.hidden = !open;
      this.sxBtn.setAttribute('aria-expanded', String(open));
      this.checkScroll();
    });
    this.cum = new Float32Array(24);
    this.cases = [];
    try {
      const d = await ctx.data('killit');
      this.cases = (d && d.cases) || [];
      this.cases.forEach((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'gv-card';
        const claim = document.createElement('span'); claim.textContent = SHORT[i] || c.c;
        b.appendChild(claim);
        b.addEventListener('click', () => { if (!this._busy) this.run(ctx, i, true); });
        this.cd.appendChild(b);
      });
      const buried = (d && d.buried) || [];
      buried.forEach((title) => {
        const li = document.createElement('li'); li.textContent = title;
        this.sxList.appendChild(li);
      });
    } catch (e) {
      const p = document.createElement('p'); p.className = 'gv-null'; p.textContent = 'the graveyard data did not load.';
      this.cd.replaceWith(p);
    }
    this.ready = true;
    this.checkScroll();
  },
  /* the panel's content is bottom-aligned (margin-top:auto on the cards), so its bottom edge is where the
     text meets the grains: at rest just above the horizon line, while a card runs just above the pile's top. */
  layout(ctx) {
    const s = ctx.stage(), f = s.h < 420 ? 0.3 : 0.46, base = s.y + s.h * 0.98;
    this.pn.style.left = s.x + 'px'; this.pn.style.top = s.y + 'px'; this.pn.style.width = s.w + 'px';
    this._restH = Math.max(120, base - 22 - s.y);
    this._runH = Math.max(120, base - s.h * f - 14 - s.y);
    this.fit();
  },
  fit() {
    if (!this._restH) return;
    this.pn.style.height = (this.pn.classList.contains('ran') ? this._runH : this._restH) + 'px';
    this.checkScroll();
  },
  /* the panel is allowed to scroll as a last resort (some device/content combo we didn't anticipate),
     but it must never trap a visitor: no overscroll containment (so a swipe that hits the panel's own
     top/bottom keeps going and scrolls the page), and a bottom fade only appears when there is in fact
     more to see, as an honest affordance rather than a decoration. */
  checkScroll() {
    if (!this.pn) return;
    const pn = this.pn, more = pn.scrollHeight > pn.clientHeight + 1 && pn.scrollTop + pn.clientHeight < pn.scrollHeight - 2;
    pn.classList.toggle('more', more);
  },
  /* aria-disabled, not disabled: a disabled button drops keyboard focus to <body>, and the next space there is the shell's 'next room' */
  busy(b) {
    this._busy = b;
    const btns = this.cd.querySelectorAll('button'); for (let i = 0; i < btns.length; i++) btns[i].setAttribute('aria-disabled', b ? 'true' : 'false');
  },
  /* focus moves only for a run the visitor started, and only if focus is still in this room (or dropped to <body>) */
  mayFocus() {
    const sec = this.root && this.root.parentElement, a = document.activeElement;
    return !!sec && sec.classList.contains('is-active') && (!a || a === document.body || sec.contains(a));
  },
  /* every dot in the field is a grain. the pile fills the lower half of the stage; cards and verdict sit above it. */
  pile(ctx) { const s = ctx.stage(), f = s.h < 420 ? 0.3 : 0.46; return { x: s.x, y: s.y + s.h * (0.98 - f), w: s.w, h: s.h * f }; },
  computePile(ctx, i) {
    const c = this.cases[i], P = ctx.particles, N = P.n, pr = this.pile(ctx);
    if (!this.gx || this.gx.length !== N) { this.gx = new Float32Array(N); this.gy = new Float32Array(N); this.rel = new Float32Array(N); this.out = new Uint8Array(N); }
    const cn = c.cn, bins = cn.length, colW = pr.w * AX / bins, maxC = Math.max.apply(null, cn) || 1;
    this.maxC = maxC; this.bins = bins; /* drawMarker reuses these so the marker is scaled from the exact same numbers that placed the grains */
    let tot = 0; for (let b = 0; b < bins; b++) tot += cn[b];
    const cumF = this.cum; let acc = 0; for (let b = 0; b < bins; b++) { acc += cn[b]; cumF[b] = acc / tot; }
    for (let k = 0; k < N; k++) {
      const u = ctx.hash(k * 13 + i * 7919 + 1); let b = 0; while (b < bins - 1 && u > cumF[b]) b++;
      const hb = cn[b] / maxC;
      this.gx[k] = pr.x + (b + 0.08 + ctx.hash(k * 3 + 1) * 0.84) * colW;
      this.gy[k] = pr.y + pr.h - ctx.hash(k * 5 + 2) * hb * pr.h;
      this.rel[k] = ctx.hash(k * 11 + 5);
    }
    return pr;
  },
  ground(ctx) { /* idle: a quiet horizon of grains along the baseline */
    const P = ctx.particles, pr = this.pile(ctx), fog = ctx.PAL.fog;
    P.targetPx((k) => [pr.x + ctx.hash(k * 3 + 1) * pr.w, pr.y + pr.h - ctx.hash(k * 17 + 9) * 5]); P.color(() => fog);
  },
  run(ctx, i, user) {
    if (!this.cases[i] || this.state === 'running' || this.state === 'dropping') return;
    this.curCase = i; this._auto = false; this._userRun = !!user; /* a run by hand is the visitor's; only the first-visit timer marks its own */
    const P = ctx.particles, N = P.n, nul = this.nullHue(ctx);
    this.pileRect = this.computePile(ctx, i);
    this.pn.classList.add('ran'); this.markCard(i); this.fit();
    P.color(() => nul);
    if (ctx.reduced) { const gx = this.gx, gy = this.gy; P.targetPx((k) => [gx[k], gy[k]]); this.out.fill(1); }
    else { /* park every grain above the top of the screen, then let them go a few at a time */
      P.ease = 0.13; this.out.fill(0);
      for (let k = 0; k < N; k++) { P.x[k] = this.gx[k]; P.y[k] = -30 - ctx.hash(k * 7 + 3) * 300; P.tx[k] = P.x[k]; P.ty[k] = P.y[k]; }
    }
    this.busy(true); this.rs.hidden = true; this.settleAt = 0;
    this.nextTick = 0; /* granular-tick rate gate, reset per run */
    if (ctx.reduced) { this.state = 'settled'; this.settle(ctx); } else { this.state = 'running'; this.runStart = performance.now(); }
  },
  /* a null is chance, so the pile is amber, pulled a quarter of the way to the background so the
     whole pile never shouts louder than the one mark that decides it */
  nullHue(ctx) { return mix(ctx.PAL.amber, ctx.PAL.bg, 0.25); },
  markCard(i) { const bs = this.cd.querySelectorAll('button'); for (let k = 0; k < bs.length; k++) bs[k].classList.toggle('on', k === i); },
  settle(ctx) {
    this.state = 'settled'; this.settleAt = 0; this.busy(false);
    const c = this.cases[this.curCase], k = c.v === 'k';
    this.ss.className = 'gv-status ' + (k ? 'k' : 's');
    this.ss.textContent = k ? V_K : V_S;
    if (k) ctx.audio.note(-9, { dur: 1.6, type: 'triangle', vol: 0.05 }); /* F2: the tonic of the room's F minor bed, low and dark. A2 was a bright major third over it */ else { ctx.audio.note(2, { dur: 0.7 }); ctx.audio.note(4, { at: 0.12, dur: 0.8 }); ctx.audio.note(7, { at: 0.24, dur: 1.2 }); }
    this.nm.textContent = 'observed ' + rnd2(c.o) + ' · ' + c.sz + ' redraws · ' + ord(c.pc) + ' percentile';
    this.xEl.textContent = c.x; this.ru.textContent = c.r;
    this.rs.hidden = false;
    this.checkScroll();
    if (this._userRun) { this._userRun = false; if (this.mayFocus()) this.ss.focus({ preventScroll: true }); }
  },
  again(ctx, user) {
    const refocus = user && this.mayFocus();
    this._userRun = false;
    this.state = 'idle'; this.curCase = -1; this.pileRect = null; this.rs.hidden = true; this.pn.classList.remove('ran'); this.markCard(-1);
    this._auto = false;
    ctx.particles.ease = 0.06; this.ground(ctx); this.busy(false); this.fit();
    if (refocus) { const b = this.cd.querySelector('button'); if (b) b.focus({ preventScroll: true }); }
  },
  enter(ctx) {
    if (!this.ready) return;
    this.layout(ctx);
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.35; P.big = false; P.swirl = 0;
    if (this.state !== 'idle' && this.cases[this.curCase]) {
      /* reflow the pile for the new viewport; if still falling, frame() finishes the fall on its own clock */
      this.pileRect = this.computePile(ctx, this.curCase);
      const gx = this.gx, gy = this.gy, nul = this.nullHue(ctx);
      P.targetPx((k) => [gx[k], gy[k]]); P.color(() => nul);
    } else { this.state = 'idle'; this.ground(ctx); }
    ctx.audio.distant(0.85);
    /* first visit only, and never in kiosk (demo() covers that): after a breath, run the card that dies */
    /* spent only once it actually starts: a pass-through (or webkit settling a deep link through a second activate) must not use it up */
    if (!this._autoDone && !this._autoT && !KIOSK && this.state === 'idle') {
      const kIdx = this.cases.findIndex((c) => /relearned/.test(c.c) && c.v === 'k');
      if (kIdx >= 0) {
        addEventListener('pointerdown', this._onHand, { passive: true });
        addEventListener('keydown', this._onHand);
        this._autoT = setTimeout(() => { this._autoT = 0; if (this.state === 'idle' && !this._autoDone) { this._autoDone = true; if (ctx.acted) ctx.acted('graveyard'); this.run(ctx, kIdx); this._auto = true; if (this.state === 'settled') this.unhook(); } }, 1200);
      }
    }
  },
  unhook() {
    removeEventListener('pointerdown', this._onHand);
    removeEventListener('keydown', this._onHand);
  },
  cancelAuto(ctx) {
    if (this._autoT) { clearTimeout(this._autoT); this._autoT = 0; }
    this.unhook();
    if (this._auto) { this._auto = false; if (ctx && this.state !== 'idle') this.again(ctx); }
  },
  leave(ctx) {
    ctx.audio.distant(0);
    this.stopDemo(ctx);
  },
  /* cancels any kiosk demo or first-visit run in flight and gives the cards back to whoever just touched the room */
  stopDemo(ctx) {
    if (this._demoT1) { clearTimeout(this._demoT1); this._demoT1 = 0; }
    if (this._demoT2) { clearTimeout(this._demoT2); this._demoT2 = 0; }
    this.cancelAuto(ctx);
    if (this.cd) this.busy(false);
  },
  /* a 3-8ms bandpass-filtered noise burst, generated once and replayed — no new asset, no allocation
     in the per-frame path (only when a grain actually lands and the rate gate opens). */
  grain(ctx, freq, pan, vol, lenMs) {
    const ac = ctx.audio.ac; if (!ac || ctx.audio.muted) return;
    if (!this._gbuf || this._gbufAc !== ac) {
      const n = Math.max(1, Math.round(ac.sampleRate * 0.008));
      this._gbuf = ac.createBuffer(1, n, ac.sampleRate);
      const d = this._gbuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this._gbufAc = ac;
    }
    const t = ac.currentTime, dur = lenMs / 1000;
    const src = ac.createBufferSource(); src.buffer = this._gbuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 7;
    const gn = ac.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + 0.001); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan)); bp.connect(pn); pn.connect(gn); } else bp.connect(gn);
    gn.connect(ctx.audio.sfx);
    src.start(t); src.stop(t + dur + 0.01);
  },
  drawMarker(g, ctx, drop) {
    const c = this.cases[this.curCase], pr = this.pileRect; if (!c || !pr) return;
    const bins = c.cn.length, frac = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * bins)));
    const mx = pr.x + frac * pr.w * AX;
    if (drop != null) { /* mine, on its way down: one ink grain falling onto the axis at the observed value */
      const y = pr.y - 70 + (pr.h + 70) * drop * drop;
      g.fillStyle = INK; g.beginPath(); g.arc(mx, y, 3.5, 0, 6.2832); g.fill();
      return;
    }
    const ink = INK;
    if (c.v !== 'k') {
      /* survives: stands past almost all of the pile's mass, out in the empty margin AX leaves —
         a full flagpole, plus a faint tick back to the pile's edge so the eye can measure the gap */
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, pr.y - 14); g.lineTo(mx, pr.y + pr.h + 6); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.moveTo(mx - 5, pr.y - 14); g.lineTo(mx + 5, pr.y - 14); g.lineTo(mx, pr.y - 4); g.closePath(); g.fill();
      const edgeX = pr.x + pr.w * AX;
      g.strokeStyle = 'rgba(' + INK_RGB + ',.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(edgeX, pr.y - 14); g.lineTo(mx, pr.y - 14); g.stroke();
      g.font = '600 10px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.fillStyle = ink; g.fillText('mine · ' + rnd2(c.o), mx, pr.y - 16);
      g.textAlign = 'left';
    } else {
      /* killed: the observed value sits inside the null's own bulk, so the line only rises as high
         as that column's own grains do (same maxC/colW as the pile itself) — it reads as buried,
         not as a beacon poking out of the sand. the pile still covers the body of this line; a small
         caret + value sits just below the baseline, outside the grains, so the verdict is findable
         without unburying the number. */
      const bIdx = Math.min(bins - 1, Math.max(0, Math.floor(frac * bins)));
      const hb = (c.cn[bIdx] || 0) / (this.maxC || 1);
      const topY = pr.y + pr.h * (1 - hb);
      g.strokeStyle = 'rgba(' + INK_RGB + ',.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, pr.y + pr.h); g.lineTo(mx, topY); g.stroke();
      const by = pr.y + pr.h + 4;
      g.fillStyle = ink;
      g.beginPath(); g.moveTo(mx, by); g.lineTo(mx - 4, by + 7); g.lineTo(mx + 4, by + 7); g.closePath(); g.fill();
      g.font = '600 10px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('mine · ' + rnd2(c.o), mx, by + 9);
      g.textAlign = 'left';
    }
  },
  frame(g, t, bands, w, h, ctx) {
    if (this.state === 'running') {
      const prog = Math.min(1, (t - this.runStart) / 4000), P = ctx.particles, N = P.n, rel = this.rel, out = this.out, gx = this.gx, gy = this.gy;
      let landedK = -1;
      for (let k = 0; k < N; k++) { if (!out[k] && prog >= rel[k]) { P.tx[k] = gx[k]; P.ty[k] = gy[k]; out[k] = 1; landedK = k; } }
      /* sparse granular ticks as grains land: rate-gated to ~<=25/s, one candidate per frame, silent once nothing new lands */
      if (landedK >= 0 && t >= (this.nextTick || 0) && this.pileRect) {
        const pr = this.pileRect;
        const heightFrac = 1 - Math.min(1, Math.max(0, (gy[landedK] - pr.y) / pr.h));
        const colFrac = Math.min(1, Math.max(0, (gx[landedK] - pr.x) / (pr.w * AX)));
        this.grain(ctx, 480 + heightFrac * 3300, colFrac * 2 - 1, 0.008 + Math.random() * 0.012, 3 + Math.random() * 5);
        this.nextTick = t + 40 + Math.random() * 40;
      }
      if (prog >= 1) { if (!this.settleAt) this.settleAt = t + 900; else if (t >= this.settleAt) { this.state = 'dropping'; this.dropStart = t; } }
    }
    if (this.state === 'dropping' && t - this.dropStart >= 650) { this.settle(ctx); if (this._auto) this.unhook(); }
    if (this.pileRect && this.state !== 'idle') {
      const pr = this.pileRect, killed = this.state === 'settled' && this.cases[this.curCase] && this.cases[this.curCase].v === 'k';
      if (killed) this.drawMarker(g, ctx);
      g.strokeStyle = 'rgba(134,203,254,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pr.x, pr.y + pr.h + 1.5); g.lineTo(pr.x + pr.w, pr.y + pr.h + 1.5); g.stroke();
      if (this.state === 'settled' && !killed) this.drawMarker(g, ctx);
      if (this.state === 'dropping') this.drawMarker(g, ctx, Math.min(1, (t - this.dropStart) / 650));
      if (killed) { /* the grain that landed: bright, on the axis, on top of everything */
        const c = this.cases[this.curCase], fr = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * c.cn.length)));
        const lx = pr.x + fr * pr.w * AX, ly = pr.y + pr.h;
        g.fillStyle = 'rgba(' + INK_RGB + ',.18)'; g.beginPath(); g.arc(lx, ly, 9, 0, 6.2832); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(lx, ly, 4, 0, 6.2832); g.fill();
      }
    }
  },
  /* kiosk: nobody's here. show one kill, then one survivor, twelve seconds apart, then reset. */
  demo(ctx) {
    if (!this.ready || !this.root || !this.root.parentElement || !this.root.parentElement.classList.contains('is-active')) return;
    const kIdx = this.cases.findIndex((c) => c.v === 'k'), sIdx = this.cases.findIndex((c) => c.v === 's');
    if (kIdx < 0 || sIdx < 0) return;
    const stillHere = () => this.root && this.root.parentElement && this.root.parentElement.classList.contains('is-active');
    this.run(ctx, kIdx);
    this._demoT1 = setTimeout(() => { if (stillHere()) { this.again(ctx); this.run(ctx, sIdx); } }, 12000);
    this._demoT2 = setTimeout(() => { if (stillHere()) this.again(ctx); }, 24000);
  },
};
