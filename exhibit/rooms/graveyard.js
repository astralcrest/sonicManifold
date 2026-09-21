/* room 5 — tap a claim: the field falls into a null histogram, an amber line marks the real
   number. buried = killed, outside = survived. data: exhibit/data/killit.json. */

const SHORT = [
  'even on a relearned map, my picks bridge more than autoplay does',
  'my network has real topological loops, not just tight clusters',
  'when i tap, i cross genre-families more than habit alone predicts',
  'hip-hop/r&b is a genre i actually pick, not bucket-size noise',
];
const NULL_TXT = "a null is what the number looks like when the effect isn't there. i scramble the part that would carry the effect and recompute, hundreds of times.";
const STONE_LINE = 'sixteen of my findings died this way.';
const CAVEAT = 'four of my pre-declared tests are runnable here. two survived. the other twelve kills are in the lab — most of them are not this pretty.';
const V_K = "it's buried in the pile. this one died.";
const V_S = 'it stands outside the pile. this one lived.';

const TPL = `<div class="gv-pn">
<div class="gv-cards"></div>
<p class="gv-null"></p>
<div class="gv-result" hidden>
<p class="gv-status" aria-live="polite"></p>
<p class="gv-nums"></p>
<p class="gv-x"></p>
<p class="gv-rule"></p>
<button type="button" class="btn ghost gv-again">run another</button>
</div>
<div class="gv-stones"></div>
<p class="gv-stoneline"></p>
<p class="gv-caveat"></p>
</div>`;

const CSS = `section[data-room=graveyard] .gv-pn{position:absolute;display:flex;flex-direction:column;gap:12px;overflow-y:auto;overscroll-behavior:contain}
section[data-room=graveyard] .gv-cards{display:flex;flex-direction:column;gap:8px}
section[data-room=graveyard] .gv-card{display:flex;align-items:center;gap:10px;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:rgba(10,1,24,.55);color:var(--ink);font:500 12.5px/1.35 var(--mono);text-align:left;cursor:pointer}
section[data-room=graveyard] .gv-card:hover,section[data-room=graveyard] .gv-card:focus-visible{border-color:var(--mint)}
section[data-room=graveyard] .gv-card:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
section[data-room=graveyard] .gv-card[disabled]{opacity:.3;cursor:default}
section[data-room=graveyard] .gv-card span{flex:1}
section[data-room=graveyard] .gv-null,section[data-room=graveyard] .gv-x,section[data-room=graveyard] .gv-rule,section[data-room=graveyard] .gv-stoneline,section[data-room=graveyard] .gv-caveat{margin:0;font:400 11.5px/1.55 var(--mono);color:var(--mute)}
section[data-room=graveyard] .gv-result{display:flex;flex-direction:column;gap:6px}
section[data-room=graveyard] .gv-status{margin:0;min-height:1.3em;font:600 13.5px/1.4 var(--mono)}
section[data-room=graveyard] .gv-status.k{color:var(--rose)}
section[data-room=graveyard] .gv-status.s{color:var(--mint)}
section[data-room=graveyard] .gv-nums{margin:0;font:500 12px/1.4 var(--mono);color:var(--ink)}
section[data-room=graveyard] .gv-again{align-self:flex-start}
section[data-room=graveyard] .gv-card.on{border-color:var(--mint)}
section[data-room=graveyard] .gv-pn.ran .gv-null{display:none}
section[data-room=graveyard] .gv-pn.ran .gv-card:not(.on){display:none}
section[data-room=graveyard] .gv-stones{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
section[data-room=graveyard] .gv-stone{width:9px;height:12px;border-radius:4px 4px 1px 1px;background:rgba(189,166,255,.4)}
@media (max-height:720px) and (max-aspect-ratio:115/100){section[data-room=graveyard] .gv-card{font-size:11.5px;padding:6px 12px}section[data-room=graveyard] .gv-cards{gap:6px}section[data-room=graveyard] .gv-pn{gap:8px}}`;

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
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root.innerHTML = TPL;
    const Q = { pn: '.gv-pn', cd: '.gv-cards', nl: '.gv-null', rs: '.gv-result', ss: '.gv-status', nm: '.gv-nums', xEl: '.gv-x', ru: '.gv-rule', ag: '.gv-again', so: '.gv-stones', sl: '.gv-stoneline', cv: '.gv-caveat' };
    for (const k in Q) this[k] = root.querySelector(Q[k]);
    this.nl.textContent = NULL_TXT;
    this.sl.textContent = STONE_LINE;
    this.cv.textContent = CAVEAT;
    this.ag.addEventListener('click', () => this.again(ctx));
    this.cum = new Float32Array(24);
    this.cases = [];
    try {
      const d = await ctx.data('killit');
      this.cases = (d && d.cases) || [];
      this.cases.forEach((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'gv-card';
        const claim = document.createElement('span'); claim.textContent = SHORT[i] || c.c;
        b.appendChild(claim);
        b.addEventListener('click', () => this.run(ctx, i));
        this.cd.appendChild(b);
      });
      const buried = (d && d.buried) || [];
      buried.forEach((title) => {
        const s = document.createElement('span'); s.className = 'gv-stone'; s.title = title; s.setAttribute('aria-hidden', 'true');
        this.so.appendChild(s);
      });
    } catch (e) {
      const p = document.createElement('p'); p.className = 'gv-null'; p.textContent = 'the graveyard data did not load.';
      this.cd.replaceWith(p);
    }
    this.ready = true;
  },
  layout(ctx) {
    const s = ctx.stage();
    this.pn.style.left = s.x + 'px'; this.pn.style.top = s.y + 'px';
    this.pn.style.width = s.w + 'px'; this.pn.style.height = (s.h * (s.h < 420 ? 0.66 : 0.5)) + 'px';
  },
  busy(b) {
    const btns = this.cd.querySelectorAll('button'); for (let i = 0; i < btns.length; i++) btns[i].disabled = b;
  },
  /* every dot in the field is a grain. the pile fills the lower half of the stage; cards and verdict sit above it. */
  pile(ctx) { const s = ctx.stage(), f = s.h < 420 ? 0.3 : 0.46; return { x: s.x, y: s.y + s.h * (0.98 - f), w: s.w, h: s.h * f }; },
  computePile(ctx, i) {
    const c = this.cases[i], P = ctx.particles, N = P.n, pr = this.pile(ctx);
    if (!this.gx || this.gx.length !== N) { this.gx = new Float32Array(N); this.gy = new Float32Array(N); this.rel = new Float32Array(N); this.out = new Uint8Array(N); }
    const cn = c.cn, bins = cn.length, colW = pr.w / bins, maxC = Math.max.apply(null, cn) || 1;
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
  run(ctx, i) {
    if (!this.cases[i] || this.state === 'running') return;
    this.curCase = i;
    const P = ctx.particles, N = P.n, orch = ctx.PAL.orchid;
    this.pileRect = this.computePile(ctx, i);
    this.pn.classList.add('ran'); this.markCard(i);
    P.color(() => orch);
    if (ctx.reduced) { const gx = this.gx, gy = this.gy; P.targetPx((k) => [gx[k], gy[k]]); this.out.fill(1); }
    else { /* park every grain above the top of the screen, then let them go a few at a time */
      P.ease = 0.13; this.out.fill(0);
      for (let k = 0; k < N; k++) { P.x[k] = this.gx[k]; P.y[k] = -30 - ctx.hash(k * 7 + 3) * 300; P.tx[k] = P.x[k]; P.ty[k] = P.y[k]; }
    }
    this.busy(true); this.rs.hidden = true; this.settleAt = 0;
    if (ctx.reduced) { this.state = 'settled'; this.settle(ctx); } else { this.state = 'running'; this.runStart = performance.now(); }
  },
  markCard(i) { const bs = this.cd.querySelectorAll('button'); for (let k = 0; k < bs.length; k++) bs[k].classList.toggle('on', k === i); },
  settle(ctx) {
    this.state = 'settled'; this.settleAt = 0; this.busy(false);
    const c = this.cases[this.curCase], k = c.v === 'k';
    this.ss.className = 'gv-status ' + (k ? 'k' : 's');
    this.ss.textContent = k ? V_K : V_S;
    this.nm.textContent = 'observed ' + rnd2(c.o) + ' · ' + c.sz + ' redraws · ' + ord(c.pc) + ' percentile';
    this.xEl.textContent = c.x; this.ru.textContent = c.r;
    this.rs.hidden = false;
  },
  again(ctx) {
    this.state = 'idle'; this.curCase = -1; this.pileRect = null; this.rs.hidden = true; this.pn.classList.remove('ran'); this.markCard(-1);
    ctx.particles.ease = 0.06; this.ground(ctx); this.busy(false);
  },
  enter(ctx) {
    if (!this.ready) return;
    this.layout(ctx);
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.35; P.big = false;
    if ((this.state === 'settled' || this.state === 'running') && this.cases[this.curCase]) {
      /* reflow the pile for the new viewport; if still falling, frame() finishes the fall on its own clock */
      this.pileRect = this.computePile(ctx, this.curCase);
      const gx = this.gx, gy = this.gy, orch = ctx.PAL.orchid;
      P.targetPx((k) => [gx[k], gy[k]]); P.color(() => orch);
    } else { this.state = 'idle'; this.ground(ctx); }
    ctx.audio.distant(0.85);
  },
  leave(ctx) { ctx.audio.distant(0); },
  drawMarker(g, ctx) {
    const c = this.cases[this.curCase], pr = this.pileRect; if (!c || !pr) return;
    const bins = c.cn.length, frac = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * bins)));
    const mx = pr.x + frac * pr.w;
    const amber = '#' + ctx.PAL.amber.toString(16).padStart(6, '0');
    g.strokeStyle = amber; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, pr.y - 14); g.lineTo(mx, pr.y + pr.h + 6); g.stroke();
    g.fillStyle = amber; g.beginPath(); g.moveTo(mx - 5, pr.y - 14); g.lineTo(mx + 5, pr.y - 14); g.lineTo(mx, pr.y - 4); g.closePath(); g.fill();
  },
  frame(g, t, bands, w, h, ctx) {
    if (this.state === 'running') {
      const prog = Math.min(1, (t - this.runStart) / 4000), P = ctx.particles, N = P.n, rel = this.rel, out = this.out, gx = this.gx, gy = this.gy;
      for (let k = 0; k < N; k++) { if (!out[k] && prog >= rel[k]) { P.tx[k] = gx[k]; P.ty[k] = gy[k]; out[k] = 1; } }
      if (prog >= 1) { if (!this.settleAt) this.settleAt = t + 900; else if (t >= this.settleAt) this.settle(ctx); }
    }
    if (this.pileRect && this.state !== 'idle') { const pr = this.pileRect; g.strokeStyle = 'rgba(189,166,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pr.x, pr.y + pr.h + 1.5); g.lineTo(pr.x + pr.w, pr.y + pr.h + 1.5); g.stroke(); }
    if (this.state === 'settled' && this.pileRect) this.drawMarker(g, ctx);
  },
};
