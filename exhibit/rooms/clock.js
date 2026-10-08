/* room 04 — what held. seven years folded onto one 24-hour dial.
   every dot in the field is one play, placed on the hour it started: angle = hour, midnight at the top,
   clockwise, noon at the bottom. the annulus grows outward from a fixed inner circle, so each hour's
   radial thickness is that hour's play count and the outer silhouette is the shape of the day. inside
   an hour the three provenance bands stack outward in the order the wall text names: served underneath,
   shuffle over it, what i tapped on the outside.
   one interaction: drag or arrow-key the hand round the dial and read that hour's count and tapped share.
   every number on screen comes from exhibit/data/clock.json. nothing here is fitted or smoothed.
   ATLAS MODE (BUILD_SPEC_V2 §3 clock row, brief R1): the annulus is a categorical glyph field (o O @ what i tapped on
   the outside, x X % shuffle in the middle, - = ≡ the queue underneath; colour sampled from one member dot). the dial
   and its readout ride the camera in the cam layer, so the hand is read in world px at any zoom and the readout in the
   hole scales with the dial it belongs to; the line under the dial stays on the glass. dragging the dial turns the hand
   (a room control: the camera never sees it), dragging the field outside it pans, and the wheel zooms over both. the
   busiest hour gets a [ label ] and the three bands their region names. no idle drift: the numbers hold still. */

const NUMWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four'];
/* an hour under this many plays is a few hundred coin flips: its share moves a lot and means little.
   the room says so out loud rather than quietly dropping those hours. */
const BUSY = 5000;

const TPL = '<div class="ck-wrap">'
  + '<div class="ck-dial" role="slider" tabindex="0" aria-label="hour of the day"'
  + ' aria-valuemin="0" aria-valuemax="23" aria-valuenow="14" aria-valuetext="">'
  + '<div class="ck-read" aria-hidden="true"><span class="ck-hr"></span><span class="ck-n"></span><span class="ck-t"></span></div>'
  + '</div></div>'
  + '<p class="ck-note"><span class="ck-lead"></span><span class="ck-cav"></span><span class="ck-more short-hide"></span></p>';

const CSS = 'section[data-room=clock] .ck-wrap{position:absolute;pointer-events:none}'
  + 'section[data-room=clock] .ck-dial{position:absolute;inset:0;pointer-events:auto;border-radius:50%;cursor:grab;touch-action:pan-y;-webkit-tap-highlight-color:transparent}'
  + 'section[data-room=clock] .ck-dial.grab{cursor:grabbing}'
  + 'section[data-room=clock] .ck-dial:focus-visible{outline:2px solid var(--ice);outline-offset:4px}'
  + 'section[data-room=clock] .ck-read{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 14px;pointer-events:none;text-align:center;white-space:nowrap;background:radial-gradient(closest-side,rgba(10,1,24,.94),rgba(10,1,24,.8) 62%,rgba(10,1,24,0))}'
  + 'section[data-room=clock] .ck-hr{font:600 20px/1 var(--mono);letter-spacing:-.02em;color:var(--ink);text-shadow:0 0 12px rgba(10,1,24,.95),0 0 4px rgba(10,1,24,1)}'
  + 'section[data-room=clock] .ck-n,section[data-room=clock] .ck-t{font:500 9.5px/1.35 var(--mono);letter-spacing:.04em;color:var(--mute);text-shadow:0 0 10px rgba(10,1,24,.95)}'
  + 'section[data-room=clock] .ck-t{color:var(--mint)}'
  + 'section[data-room=clock] .ck-note{position:absolute;margin:0;pointer-events:none;font:400 clamp(10px,1.05vw,12px)/1.45 var(--mono);color:var(--mute);text-align:center}'
  + 'section[data-room=clock] .ck-more{opacity:.78}'
  /* atlas: a zoomed ring runs under the line on the glass; an opaque plate keeps it readable (padding 0, so the text holds its place) */
  + 'html.atlas section[data-room=clock] .ck-note{background:rgba(10,1,24,.78);box-shadow:0 0 0 4px rgba(10,1,24,.78);border-radius:2px}'
  /* a phone has two lines of room under the dial: it keeps the busy-hours range and the utc-7 caveat and
     drops the thin-hour aside, which is a footnote to the range and not a finding. */
  + '@media (max-width:700px){section[data-room=clock] .ck-more{display:none}}'
  + '@media (prefers-reduced-motion:reduce){section[data-room=clock] .ck-dial{cursor:default}}';

const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const hh = (h) => (h < 10 ? '0' + h : '' + h) + ':00';
const TAU = 6.283185307179586;
/* how much room outside the data the axis ring needs: tick, gap, and the 00/06/12/18 labels */
const AXIS = 32;
const CATS = [{ family: 'neutral' }, { family: 'tap' }, { family: 'shuffle' }, { family: 'served' }];
const dbg = { on: false };

export default {
  id: 'clock', track: 'cant-resist-the-bite', ready: false, hour: 14, d: null, geo: null,
  hrOf: null, drag: false, lastTick: 0, sweep: 0,

  async mount(root, ctx) {
    this.root = root; this.A = !!(ctx.atlas && ctx.atlas.on); this.prec = [];
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root.innerHTML = TPL;
    this.wrap = root.querySelector('.ck-wrap');
    this.dial = root.querySelector('.ck-dial');
    this.elHr = root.querySelector('.ck-hr');
    this.elN = root.querySelector('.ck-n');
    this.elT = root.querySelector('.ck-t');
    this.lead = root.querySelector('.ck-lead');
    this.more = root.querySelector('.ck-more');
    this.cav = root.querySelector('.ck-cav');
    /* the caveat is said once, here under the dial where the hours are read. an older wall line repeats it:
       hide that copy if it is still in the page (a no-op once exhibit.html drops it). */
    const dup = root.parentElement && root.parentElement.querySelector('.wall .say.dim');
    if (dup && /utc-7/.test(dup.textContent)) dup.hidden = true;
    this.note = root.querySelector('.ck-note');
    /* atlas: the dial and its readout are world-anchored dom (the cam layer); the wheel over the dial zooms the camera */
    if (this.A) { ctx.view.layer(root, [this.wrap]); this.dial.setAttribute('data-atlas-wheel', ''); }

    const slot = root.parentElement && root.parentElement.querySelector('.legend-slot');
    if (slot) ctx.legend(slot, 'prov');

    await ctx.identity();
    const c = await ctx.data('clock').catch(() => null);
    if (c && Array.isArray(c.tap) && c.tap.length === 24) this.d = c;

    if (this.d) {
      const c2 = this.d, tot = [], maxT = { n: -1, h: 0 };
      for (let h = 0; h < 24; h++) {
        tot[h] = c2.tap[h] + c2.shuffle[h] + c2.served[h];
        if (tot[h] > maxT.n) { maxT.n = tot[h]; maxT.h = h; }
      }
      this.tot = tot;
      this.maxTot = maxT.n || 1;
      this.hour = this.homeHour = maxT.h; /* open on the hour that carries the most plays, not on an arbitrary one */
      /* the honest reading: the busiest hours, where a share is built on thousands of plays */
      let lo = null, hi = null, nBusy = 0;
      for (let h = 0; h < 24; h++) {
        if (tot[h] < BUSY) continue;
        nBusy++;
        const s = c2.tap_share_by_hour[h];
        if (lo === null || s < c2.tap_share_by_hour[lo]) lo = h;
        if (hi === null || s > c2.tap_share_by_hour[hi]) hi = h;
      }
      if (lo !== null) {
        this.lead.textContent = 'the ' + (NUMWORD[nBusy] || nBusy) + ' hours over ' + group(BUSY)
          + ' plays run ' + c2.tap_share_by_hour[lo].toFixed(1) + '% tapped at ' + hh(lo)
          + ' to ' + c2.tap_share_by_hour[hi].toFixed(1) + '% at ' + hh(hi) + '.';
      }
      /* name the thin hours by their own numbers so nobody reads the widest swing on the dial as a finding */
      let thin = 0, thinH = 0, thinBest = -1;
      for (let h = 0; h < 24; h++) {
        if (tot[h] >= BUSY) continue;
        thin++;
        if (c2.tap_share_by_hour[h] > thinBest) { thinBest = c2.tap_share_by_hour[h]; thinH = h; }
      }
      this.more.textContent = ' quiet hours swing wider on less: ' + hh(thinH) + ' is '
        + thinBest.toFixed(1) + '% on ' + group(tot[thinH]) + ' plays.';
      this.assign(ctx);
    } else {
      this.lead.textContent = 'the hourly counts did not load, so this dial is holding an even ring and claiming nothing.';
      this.more.textContent = '';
    }
    this.cav.textContent = ' hours are read on one fixed clock, all year, so only roughly local.';

    this.dial.addEventListener('pointerdown', (e) => {
      if (!this.d) return;
      this.stopDemo();
      this.drag = true; this.touched = true; this.dial.classList.add('grab');
      try { this.dial.setPointerCapture(e.pointerId); } catch (err) {}
      this.fromPointer(e, ctx);
    });
    this.dial.addEventListener('pointermove', (e) => { if (this.drag) this.fromPointer(e, ctx); });
    const end = (e) => {
      if (!this.drag) return;
      this.drag = false; this.dial.classList.remove('grab');
      try { this.dial.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    this.dial.addEventListener('pointerup', end);
    this.dial.addEventListener('pointercancel', end);
    this.dial.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      let to = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = this.hour + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = this.hour - 1;
      else if (e.key === 'PageUp') to = this.hour + 6;
      else if (e.key === 'PageDown') to = this.hour - 6;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = 23;
      if (to === null) return;
      /* the shell moves between rooms on the arrow keys: while the hand has focus, they belong to the hand */
      e.preventDefault(); e.stopPropagation();
      this.stopDemo();
      this.set(to, ctx);
    });

    this.render();
    this.ready = true;
  },

  /* which hour each dot belongs to. a dot already knows who pressed play on it (ctx.identity), so it is
     drawn from that provenance's own distribution over the day: the three bins add back up to the
     published totals, 18,591 tapped / 16,262 shuffled / 62,574 served. computed once, not per layout. */
  assign(ctx) {
    const P = ctx.particles, N = P.n, c = this.d;
    if (this.hrOf && this.hrOf.length === N) return;
    const cum = [new Float64Array(24), new Float64Array(24), new Float64Array(24)];
    const arr = [c.tap, c.shuffle, c.served];
    for (let p = 0; p < 3; p++) {
      let s = 0; for (let h = 0; h < 24; h++) s += arr[p][h];
      let a = 0; for (let h = 0; h < 24; h++) { a += arr[p][h]; cum[p][h] = a / (s || 1); }
    }
    const out = new Uint8Array(N), prov = P.prov;
    for (let i = 0; i < N; i++) {
      const cp = cum[prov[i]] || cum[2], u = ctx.hash(i * 13 + 5);
      let h = 0; while (h < 23 && u > cp[h]) h++;
      out[i] = h;
    }
    this.hrOf = out;
  },

  layout(ctx) {
    const s = ctx.stage();
    const note = this.note;
    /* the nav dots run down the right edge of a narrow screen; the line under the dial steps aside for them */
    const land = innerWidth > innerHeight * 1.15;
    const gutter = innerWidth <= 640 && !land ? 34 : 0;
    let noteLeft = s.x, noteW = Math.max(120, s.w - gutter), noteH = 0;
    /* a phone on its side leaves the stage about 250px wide and 150px tall once this line has wrapped four
       times. the band between the wall text and the stage is empty there, so the line borrows it and comes
       back to two lines, which is most of the dial's radius back. measured off the wall, not guessed. */
    if (land && s.h < 340) {
      const wall = this.root && this.root.parentElement && this.root.parentElement.querySelector('.wall');
      const wr = wall ? wall.getBoundingClientRect().right : s.x;
      noteLeft = Math.min(s.x, Math.max(s.x - 150, wr + 18));
      noteW = s.x + s.w - noteLeft;
    }
    if (note) { note.style.left = noteLeft + 'px'; note.style.width = noteW + 'px'; }
    const noteOf = (lead) => {
      if (this.lead) this.lead.style.display = lead ? '' : 'none';
      return note ? Math.min(s.h * 0.34, note.offsetHeight + 10) : 0;
    };
    /* the axis ring (ticks plus the four hour labels) lives outside the data and has to fit too,
       or a phone prints "12" straight through the line under the dial */
    const fit = (nh, axis) => { const half = Math.min(s.w, s.h - nh) / 2, R = Math.max(40, (half - axis) / 0.94); return { half, R }; };
    /* atlas: the dial is also the finger target (a 44 px band outside the 12 px hub dead zone, 12 px of pannable field
       above and beside it). the room keeps everything HEAD shows (the busy-hours sentence and 00/06/12/18) whenever that
       still fits, measured here and not guessed from the stage height; only a stage too short for both gives up the four
       numbers (the 24 ticks stay), then the sentence (the utc-7 caveat stays).
       R2V2P finding: `half - R` is `(axis - 0.06*half)/0.94`, a strictly decreasing function of `half` that goes under
       12 for any half > ~345px -- not because the field is actually cramped, but because R grows 6% faster than half
       by construction (the /0.94 in `fit`, tuned so 1440's half of 342 just clears 12). On phones half is bounded by
       the narrow width (max ~176px in this room's own stages), so it never nears that line; on desktop the stage is
       hundreds of px into open field on every side, so the 12px concern doesn't apply either -- it only fires there
       as a formula artefact. BUILD_SPEC's own rule is scoped to "at 390 and 320 wide" (phones), so bypass the finger
       check once the stage is desktop-scale rather than let the artefact keep dropping 00/06/12/18 forever upward. */
    const ok = (f) => !this.A || s.w > 500 || (f.R - 12 >= 44 && f.half - f.R >= 12);
    let lead = true, axis = AXIS;
    noteH = noteOf(true);
    let f = fit(noteH, AXIS);
    if (!ok(f)) { axis = 16; f = fit(noteH, axis); }
    if (!ok(f)) { lead = false; noteH = noteOf(false); f = fit(noteH, axis); }
    this.tiny = axis !== AXIS; this.noteH = noteH;
    const cx = s.x + s.w / 2, cy = s.y + (s.h - noteH) / 2;
    const R = f.R;
    this.geo = { s, cx, cy, R, rIn: R * 0.5, span: R * 0.44 };
    if (this.wrap) {
      this.wrap.style.left = (cx - R) + 'px'; this.wrap.style.top = (cy - R) + 'px';
      this.wrap.style.width = this.wrap.style.height = (R * 2) + 'px';
    }
    if (note) note.style.top = (s.y + s.h - noteH + 4) + 'px';
    /* the readout lives in the hole, so it is sized off the dial and not off the viewport: a phone held
       sideways leaves a small dial, and a viewport-sized 14:00 would sit straight across the annulus. */
    if (this.elHr) {
      this.elHr.style.fontSize = Math.max(14, Math.min(34, R * 0.21)).toFixed(1) + 'px';
      const sub = Math.max(10.5, Math.min(12, R * 0.088)).toFixed(1) + 'px'; /* the floor was 8.2px: too small to read on the two narrowest phones, and the scrim behind the readout can carry the extra width */
      this.elN.style.fontSize = sub; this.elT.style.fontSize = sub;
    }
    return this.geo;
  },

  /* radial extent of one hour: proportional to its count, plus a hairline so a nearly empty hour is
     still visibly there rather than silently gone. */
  thick(h) { return 2.5 + (this.tot[h] / this.maxTot) * this.geo.span; },

  enter(ctx) {
    if (!this.ready) return;
    const g = this.layout(ctx), P = ctx.particles;
    P.ease = 0.05; P.jitter = 0.5; P.big = false; P.swirl = 0.45;
    const C = ctx.PROV, prov = P.prov, hash = ctx.hash;
    if (!this.d) {
      const rIn = g.rIn, span = g.span * 0.5;
      P.targetPx((i) => {
        const a = (hash(i * 13 + 5)) * TAU - TAU / 4, r = rIn + hash(i * 7 + 1) * span;
        return [g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r];
      });
      P.color(() => ctx.PAL.fog);
      return;
    }
    this.maxTot = Math.max.apply(null, this.tot) || 1;
    /* per hour: where the served band ends and the shuffle band ends, as fractions of that hour's thickness */
    const f1 = new Float64Array(24), f2 = new Float64Array(24), th = new Float64Array(24);
    const c = this.d;
    for (let h = 0; h < 24; h++) {
      const t = this.tot[h] || 1;
      f1[h] = c.served[h] / t; f2[h] = (c.served[h] + c.shuffle[h]) / t; th[h] = this.thick(h);
    }
    const hr = this.hrOf, rIn = g.rIn, cx = g.cx, cy = g.cy;
    P.targetPx((i) => {
      const h = hr[i], p = prov[i];
      const lo = p === 2 ? 0 : p === 1 ? f1[h] : f2[h];
      const hi = p === 2 ? f1[h] : p === 1 ? f2[h] : 1;
      const a = ((h + hash(i * 3 + 2)) / 24) * TAU - TAU / 4;
      const r = rIn + th[h] * (lo + hash(i * 7 + 1) * Math.max(0.001, hi - lo));
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    P.color((i) => C[prov[i]]);
    this.render();
    if (this.A) this.atlasEnter(ctx);
  },

  fromPointer(e, ctx) {
    const g = this.geo; if (!g) return;
    /* atlas: the dial is in world px under the camera; the pointer is unapplied into the same space (identity at home) */
    let px = e.clientX, py = e.clientY, dz = 144;
    if (this.A) { const w = ctx.view.unapply(px, py), z = ctx.view.z || 1; px = w[0]; py = w[1]; dz = 144 / (z * z); }
    const dx = px - g.cx, dy = py - g.cy;
    if (dx * dx + dy * dy < dz) return; /* dead zone at the hub: a shaky hand there would spin the hand */
    let u = (Math.atan2(dy, dx) + TAU / 4) / TAU;
    u = ((u % 1) + 1) % 1;
    this.set(Math.floor(u * 24), ctx);
  },

  set(h, ctx) {
    h = ((h % 24) + 24) % 24;
    if (h === this.hour) return;
    this.hour = h;
    this.render();
    const now = performance.now();
    if (ctx && now - this.lastTick > 55) {
      this.lastTick = now;
      /* a soft tick as the hand crosses into an hour: it climbs to midday and comes back down, so a full turn never
         leaps two octaves at midnight. note() keeps it in the bed's key and is silent when muted. */
      ctx.audio.note(Math.round(7 * (1 - Math.abs(h - 12) / 12)) - 2, { dur: 0.13, vol: 0.022, type: 'sine' });
    }
  },

  render() {
    const h = this.hour, c = this.d;
    if (!this.dial) return;
    this.dial.setAttribute('aria-valuenow', String(h));
    if (!c) { this.dial.setAttribute('aria-valuetext', hh(h)); if (this.elHr) this.elHr.textContent = hh(h); return; }
    const n = this.tot[h], sh = c.tap_share_by_hour[h];
    this.elHr.textContent = hh(h);
    this.elN.textContent = group(n) + (n === 1 ? ' play' : ' plays');
    this.elT.textContent = sh.toFixed(1) + '% tapped';
    this.dial.setAttribute('aria-valuetext', hh(h) + ' to ' + hh((h + 1) % 24) + ', ' + group(n)
      + ' plays, ' + sh.toFixed(1) + ' percent of them tapped');
  },

  frame(gx, t, bands, w, hgt, ctx) {
    const g = this.geo; if (!g) return;
    const cx = g.cx, cy = g.cy, rIn = g.rIn;
    const outer = this.d ? rIn + g.span + 3 : rIn + g.span * 0.5;
    /* atlas: k = 1 / zoom. ticks, labels and the hand keep their screen weight while their positions stay exact world px */
    const k = this.A ? 1 / (ctx.view.z || 1) : 1;
    if (this.A) { dbg.on = !!ctx.atlas.debug; this.prec.length = 0; }

    if (this.sweep) {
      if (ctx.demoStopped) this.stopDemo();
      else {
        const k = (t - this.sweep) / 15000;
        if (k >= 1) { this.stopDemo(); this.set(this.homeHour, ctx); }
        else this.set(Math.floor(k * 24), ctx);
      }
    }

    /* the axis: hour ticks and four labels. ice, because ice is the interface and never the data. */
    gx.strokeStyle = 'rgba(134,203,254,.22)'; gx.lineWidth = k;
    for (let q = 0; q < 24; q++) {
      const a = (q / 24) * TAU - TAU / 4, big = q % 6 === 0;
      const r0 = outer + 4, r1 = outer + (big ? 12 : 7);
      gx.beginPath();
      gx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      gx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      gx.stroke();
    }
    gx.font = '600 ' + (10 * k) + 'px "JetBrains Mono", ui-monospace, Menlo, monospace';
    gx.fillStyle = 'rgba(134,203,254,.5)';
    gx.textAlign = 'center'; gx.textBaseline = 'middle';
    /* atlas, zoomed: an hour number the pose has carried off the dial's part of the stage (under the chrome, the line
       under the dial or the signature) is left out, never moved */
    const zs = this.A && k < 0.999, sg = g.s, sb = sg.y + sg.h - (this.noteH || 0);
    for (let q = 0; q < (this.tiny ? 0 : 4); q++) {
      const a = ((q * 6) / 24) * TAU - TAU / 4, r = outer + 22;
      if (zs) { const p = ctx.view.apply(cx + Math.cos(a) * r, cy + Math.sin(a) * r); if (p[0] < sg.x + 8 || p[0] > sg.x + sg.w - 8 || p[1] < sg.y + 8 || p[1] > sb - 8) continue; }
      gx.fillText(['00', '06', '12', '18'][q], cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      if (dbg.on) this.prec.push({ id: 'h' + q * 6, text: ['00', '06', '12', '18'][q], wx: cx + Math.cos(a) * r, wy: cy + Math.sin(a) * r });
    }

    if (!this.d) { gx.textAlign = 'left'; gx.textBaseline = 'alphabetic'; return; }

    /* the hand, and the wedge of the hour it is standing in. the hand starts outside the readout so it
       never rules a line through the number it is there to produce. */
    const h = this.hour, a0 = (h / 24) * TAU - TAU / 4, a1 = ((h + 1) / 24) * TAU - TAU / 4;
    const rOut = rIn + this.thick(h), am = (a0 + a1) / 2, rTip = outer + 3;
    gx.beginPath();
    gx.arc(cx, cy, rIn, a0, a1);
    gx.arc(cx, cy, rOut, a1, a0, true);
    gx.closePath();
    gx.fillStyle = 'rgba(134,203,254,.14)'; gx.fill();
    gx.strokeStyle = 'rgba(134,203,254,.75)'; gx.lineWidth = 1.3 * k; gx.stroke();

    gx.lineCap = 'round';
    gx.strokeStyle = 'rgba(134,203,254,.16)'; gx.lineWidth = 6 * k;
    gx.beginPath();
    gx.moveTo(cx + Math.cos(am) * rIn * 0.9, cy + Math.sin(am) * rIn * 0.9);
    gx.lineTo(cx + Math.cos(am) * rTip, cy + Math.sin(am) * rTip);
    gx.stroke();
    gx.strokeStyle = 'rgba(160,214,255,.95)'; gx.lineWidth = 1.8 * k; gx.stroke();
    gx.lineCap = 'butt';
    gx.fillStyle = '#c3e4ff';
    gx.beginPath(); gx.arc(cx + Math.cos(am) * rTip, cy + Math.sin(am) * rTip, 3.2 * k, 0, TAU); gx.fill();
    /* R9: alive at rest. a glint walks the rim once every nine seconds and, until the first touch, a ring at the hand's tip
       says what to do with it (both held still under reduced motion and a struggling governor) */
    const calm = ctx.reduced || (ctx.atlas && ctx.atlas.gov && ctx.atlas.gov.tier >= 4), now = performance.now();
    if (!calm && !this.drag && !this.sweep) {
      const ga = ((now % 9000) / 9000) * TAU - TAU / 4, gr = gx.createRadialGradient(cx + Math.cos(ga) * (outer + 5), cy + Math.sin(ga) * (outer + 5), 0, cx + Math.cos(ga) * (outer + 5), cy + Math.sin(ga) * (outer + 5), 18 * k);
      gr.addColorStop(0, 'rgba(195,228,255,.55)'); gr.addColorStop(1, 'rgba(134,203,254,0)');
      gx.strokeStyle = gr; gx.lineWidth = 3 * k; gx.beginPath(); gx.arc(cx, cy, outer + 5, ga - 0.22, ga + 0.05); gx.stroke();
    }
    if (!this.touched && this.A) {
      const tx = cx + Math.cos(am) * rTip, ty = cy + Math.sin(am) * rTip, f = calm ? 0.5 : (now % 1800) / 1800, left = Math.cos(am) < 0;
      gx.strokeStyle = 'rgba(134,203,254,' + (0.9 - 0.75 * f) + ')'; gx.lineWidth = 1.5 * k; gx.beginPath(); gx.arc(tx, ty, (9 + 14 * f) * k, 0, TAU); gx.stroke();
      gx.font = '600 ' + (11 * k) + 'px "JetBrains Mono", ui-monospace, Menlo, monospace'; gx.fillStyle = 'rgba(134,203,254,.95)';
      const tw = gx.measureText('drag the hand').width, S = g.s, x = left ? Math.max(tx - 26 * k, S.x + 4 + tw) : Math.min(tx + 26 * k, S.x + S.w - 4 - tw), lo = left ? x > tx - 16 * k : x < tx + 16 * k;
      gx.textAlign = left ? 'right' : 'left'; gx.fillText('drag the hand', x, ty + (lo ? 34 : 14) * k);
    }

    gx.textAlign = 'left'; gx.textBaseline = 'alphabetic';
  },

  leave(ctx) { this.stopDemo(); this.drag = false; this.focusH = -1; if (this.dial) this.dial.classList.remove('grab'); if (this.offView) { this.offView(); this.offView = null; } clearTimeout(this.labT); },

  stopDemo() { this.sweep = 0; },

  /* kiosk: nobody is here. walk the hand once round the day and leave it on the busiest hour. */
  demo(ctx) {
    if (!this.ready || !this.d) return;
    const sec = this.root && this.root.parentElement;
    if (!sec || !sec.classList.contains('is-active')) return;
    this.sweep = performance.now();
  },
  /* ================================================================ atlas (BUILD_SPEC_V2 §1.4, §3 clock row) */
  angles: [{ id: 'day', name: 'the day' }, { id: 'busiest', name: 'the busiest hour' }],
  focusH: -1,

  atlasEnter(ctx) {
    const P = ctx.particles, prov = P.prov;
    P.touch = false; /* a band's radial thickness is its hour's count: the pointer must not carve holes in it */
    P.glyphAll(true);
    P.glyphMode('cat', { cats: CATS });
    P.catBy((i) => prov[i] + 1);
    /* round 2, W(D2 blank hours): the clock never told the shell's D2 thinning pass which hour a cell belongs to, so its
       "never hide the last drawn cell of a bin" guard had no bin to hold — a quiet hour's one or two cells could be
       thinned away like any other sparse cell, blanking it in some frames (measured worst: 320x568, 19/30). P.regionBy
       already exists for exactly this (the calendar's own months use it the same way); it was never called here. this
       gives every cell a bin. the strat pass (shell.js) still reads a cell's bin off whichever member dot it happens to
       be showing that frame, which drifts at an hour's own boundary — filed to INTEGRATION (R2_REQUESTS_R1.md) as the
       remaining half of the fix, since that pass is shell.js's, not this room's */
    P.regionBy(this.hrOf ? ((i) => this.hrOf[i]) : null);
    /* a phone gets a finer cell, so the thin tapped rim on the outside keeps at least one character of its own */
    P.glyphCell(ctx.lowPower ? 5 : null);
    ctx.view.configure({ mode: 'pan', zMin: 1, zMax: 3, drift: false, look: (k) => this.look(k, ctx) });
    this.atlasLabels(ctx);
    /* the hole labels are re-checked against the readout once a pose settles (see atlasLabels) */
    if (this.offView) this.offView();
    this.offView = ctx.view.onChange(() => { clearTimeout(this.labT); this.labT = setTimeout(() => this.atlasLabels(ctx), 90); });
  },

  /* the chrome that sits over the field (the anchors module's keepout set, plus the sound chip) and the line on the glass */
  keepScreen() {
    const out = [], add = (el) => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push(r); };
    document.querySelectorAll('#top > *, #atlas-sound-chip, #atlas-info, .atlas-ladder, .atlas-ladder-chip, #atlas-dock, [data-keepout]').forEach(add);
    add(this.note);
    return out;
  },
  /* ---- the hour view (fix r3). round 2 centred the hour's wedge but fitted only the wedge, the readout and the ring's
     top, at up to z 1.5: the rest of the ring then ran off the stage (under the ladder's names on desk, off the right
     edge on a phone) and its foot over the line under the dial, and the pull-down that kept the top clear left the
     wedge low-left. now the whole ring frames the hour:
     - the view centres on the wedge's midpoint (the middle of the hour's radial extent at its mid-angle), as far as the
       ring and the camera's own pan clamp allow;
     - the ring is its rendered outline: every hour's outer edge and the hand's tip over this hour, one glyph cell (the
       field's screen grid) past the outermost dot, and it stays whole inside the stage less 8 px;
     - chrome that spans the ring's width over the stage's foot or head (the line under the dial) moves that edge in;
       any other chrome over the stage is scored where the outline crosses it;
     - the zoom is the largest <= z0 at which all of that holds with the wedge within a tenth of the stage of its centre
       (on a 1440 desk no zoom fits the ring round an exactly centred wedge: the dial's top would leave the stage even
       at z 1). if no zoom brings it that near, the zoom that brings it nearest.
     the least-bad pose when nothing is clean. fixed: z0 only (look(), where the caller has already chosen the zoom) */
  hourPose(ctx, h, z0, fixed) {
    const g = this.geo, v = ctx.view; if (!g || !v || !this.root) return null;
    const st = v.stageRect || ctx.stage(), c0x = v.cx0, c0y = v.cy0, pad = 8;
    if (!st || !(st.w > 0) || !isFinite(c0x) || !isFinite(c0y)) return null;
    const P = [], rTip = (this.d ? g.rIn + g.span + 3 : g.rIn + g.span * 0.5) + 3 + 5;
    for (let q = 0; q < 24; q++) {
      const r = g.rIn + (this.d ? this.thick(q) : g.span * 0.5);
      for (let e = 0; e < 4; e++) { const a = ((q + e / 4) / 24) * TAU - TAU / 4; P.push([g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r]); }
    }
    for (let e = 0; e <= 4; e++) { const a = ((h + e / 4) / 24) * TAU - TAU / 4; P.push([g.cx + Math.cos(a) * rTip, g.cy + Math.sin(a) * rTip]); }
    let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
    for (const p of P) { if (p[0] < X0) X0 = p[0]; if (p[0] > X1) X1 = p[0]; if (p[1] < Y0) Y0 = p[1]; if (p[1] > Y1) Y1 = p[1]; }
    let cw = 0, ch = 0;
    try { const B = ctx.atlas.GF.buffers(), dpr = ctx.particles.dpr || 1; if (B && B.invCw > 0) { cw = 1 / B.invCw / dpr; ch = 1 / B.invCh / dpr; } } catch (e) {}
    let U0 = st.x + pad + cw, U1 = st.y + pad + ch, U2 = st.x + st.w - pad - cw, U3 = st.y + st.h - pad - ch;
    const keep = [];
    for (const k of this.keepScreen()) {
      if (k.right <= st.x || k.left >= st.x + st.w || k.bottom <= st.y || k.top >= st.y + st.h) continue;
      if (k.right - k.left >= st.w * 0.5) { if (k.top > st.y + st.h / 2) U3 = Math.min(U3, k.top - 4 - ch); else U1 = Math.max(U1, k.bottom + 4 + ch); }
      else keep.push(k);
    }
    const mid = this.wedge(h, 0.5), cl = (x, a, b) => (x < a ? a : x > b ? b : x);
    const score = (cx, cy, z) => {
      let bad = 0;
      for (const p of P) {
        const sx = (p[0] - cx) * z + c0x, sy = (p[1] - cy) * z + c0y;
        bad += Math.max(0, U0 - sx) + Math.max(0, sx - U2) + Math.max(0, U1 - sy) + Math.max(0, sy - U3);
        for (const k of keep) { const l = k.left - cw, r = k.right + cw, t = k.top - ch, b = k.bottom + ch; if (sx > l && sx < r && sy > t && sy < b) bad += Math.min(sx - l, r - sx, sy - t, b - sy); }
      }
      return bad;
    };
    const range = (z) => {
      const hw = st.w / 2 / z, hh2 = st.h / 2 / z, mx = 0.15 * st.w / z, my = 0.15 * st.h / z;
      let rx0 = st.x + hw - mx, rx1 = st.x + st.w - hw + mx, ry0 = st.y + hh2 - my, ry1 = st.y + st.h - hh2 + my;
      if (rx0 > rx1) { const c = st.x + st.w / 2; rx0 = c - mx; rx1 = c + mx; }
      if (ry0 > ry1) { const c = st.y + st.h / 2; ry0 = c - my; ry1 = c + my; }
      return [rx0, rx1, ry0, ry1];
    };
    const zs = []; for (let z = z0; z >= (fixed ? z0 : 1) - 1e-9; z -= 0.01) zs.push(z);
    /* at each zoom (largest first): the centre nearest the wedge at which the ring is whole, within the pan clamp. the
       first zoom that brings the wedge within a tenth of the stage of the centre wins; else the zoom that leaves it
       nearest; else the least-bad */
    let near = null, least = null;
    for (const z of zs) {
      const R = range(z);
      const fx0 = Math.max(R[0], X1 - (U2 - c0x) / z), fx1 = Math.min(R[1], X0 - (U0 - c0x) / z);
      const fy0 = Math.max(R[2], Y1 - (U3 - c0y) / z), fy1 = Math.min(R[3], Y0 - (U1 - c0y) / z);
      const cx = fx0 <= fx1 ? cl(mid[0], fx0, fx1) : cl((X0 + X1) / 2 - (U0 + U2 - 2 * c0x) / (2 * z), R[0], R[1]);
      const cy = fy0 <= fy1 ? cl(mid[1], fy0, fy1) : cl((Y0 + Y1) / 2 - (U1 + U3 - 2 * c0y) / (2 * z), R[2], R[3]);
      const bad = score(cx, cy, z);
      if (bad > 0.5) { if (!least || bad < least.bad - 1e-6) least = { cx, cy, z, bad }; continue; }
      const dx = (mid[0] - cx) * z, dy = (mid[1] - cy) * z;
      if (Math.abs(dx) <= 0.1 * st.w && Math.abs(dy) <= 0.1 * st.h) return { cx, cy, z, bad };
      const off = Math.hypot(dx, dy); if (!near || off < near.off - 1e-6) near = { cx, cy, z, bad, off };
    }
    return near || least;
  },
  flyHour(ctx, h) {
    const lab = hh(h), p = this.hourPose(ctx, h, 1.5);
    ctx.view.flyTo(p ? { cx: p.cx, cy: p.cy, z: p.z } : { z: 1.5, look: 'hour:' + h }, { speed: 'quick', lock: lab });
    try { ctx.lock(lab); } catch (e) {}
  },

  /* a point inside hour h's wedge: mid-angle, at fraction f of the hour's radial thickness (or a band's own middle) */
  wedge(h, f) {
    const g = this.geo, a = ((h + 0.5) / 24) * TAU - TAU / 4, r = g.rIn + (this.d ? this.thick(h) : g.span * 0.5) * f;
    return [g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r];
  },
  band(h, p) { /* p: 0 tapped (outer), 1 shuffle (middle), 2 served (inner) -> the band's middle, as a fraction of the hour */
    const c = this.d, t = this.tot[h] || 1, f1 = c.served[h] / t, f2 = (c.served[h] + c.shuffle[h]) / t;
    return p === 2 ? f1 / 2 : p === 1 ? (f1 + f2) / 2 : (f2 + 1) / 2;
  },
  /* hour:N: the hour view's centre for a caller that has already fixed the zoom at 1.5 (a tour stop's own pose). the
     busiest angle and search fly to hourPose()'s own zoom instead */
  look(k, ctx) {
    if (!this.geo) return null;
    const m = /^hour:(\d{1,2})$/.exec(String(k));
    if (m) { const h = +m[1] % 24, p = ctx && this.A ? this.hourPose(ctx, h, 1.5, true) : null; return p ? [p.cx, p.cy] : this.wedge(h, 0.55); }
    if (k === 'centre' || k === 'center') return [this.geo.cx, this.geo.cy];
    return null;
  },

  /* where the three band names can be read: [ busiest hour ] and THE QUEUE sit in the clear hole, each touching its own
     hour's inner edge (the queue is the innermost band, so the hole is its side of the ring); SHUFFLE and WHAT I
     TAPPED ride the thin early-morning side, each anchored on its own band, so their boxes run outward off the ring
     instead of across the thick afternoon. on a small dial the readout's keepout hides the hole labels */
  atlasLabels(ctx) {
    if (!this.A || !this.geo || !this.root.parentElement.classList.contains('is-active')) return;
    if (!this.d) { ctx.labels.set('clock', []); return; }
    const g = this.geo, hb = this.homeHour, items = [];
    const inner = (h, f) => { const a = ((h + 0.5) / 24) * TAU - TAU / 4, r = g.rIn * f; return [g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r]; };
    const b = inner(hb, 0.86);
    items.push({ id: 'busiest', text: 'busiest hour', kind: 'obj', x: b[0], y: b[1], r: 0, pri: 9, go: (c) => { c.angle.set('busiest', { via: 'tap' }); } });
    /* R9: THE QUEUE left the hole (the readout's keepout pushed it onto the evening ring on a phone) for the thin
       early-morning side with the other two band names, anchored in the middle of its own band at 03:00 */
    const c = this.d, q = this.wedge(3, c.served[3] / (this.tot[3] || 1) / 2);
    items.push({ id: 'band2', text: 'the queue', kind: 'region', x: q[0] + 2, y: q[1], r: 0, pri: 6 });
    /* each anchored on the outer edge of its own band, where it meets the next band out (or the dial's rim) */
    const f2 = (c.served[5] + c.shuffle[5]) / (this.tot[5] || 1), sh = this.wedge(5, f2);
    items.push({ id: 'band1', text: 'shuffle', kind: 'region', x: sh[0] + 2, y: sh[1], r: 0, pri: 5 });
    /* the rim at 07:00 when the name fits beside the dial; on a narrow phone, the rim just past midnight, where the
       name runs along the top of the ring instead (region text measures ~8.2 px a character at 11 px, .14em) */
    let tp = this.wedge(7, 1), dy = 12;
    if (tp[0] + 7 + 13 * 8.2 + 12 > g.s.x + g.s.w + 24) { tp = this.wedge(1, 1); dy = -4; }
    items.push({ id: 'band0', text: 'what i tapped', kind: 'region', x: tp[0] + 2, y: tp[1] + dy, r: 0, pri: 7 });
    /* zoomed, the readout grows with the dial while a label keeps its screen size, and the labels module measured its
       keepouts at home: a label whose box (anchors.js: 5 px right of and 23 px above its anchor, 18 px tall) would now
       sit on the readout is left out until the camera comes back */
    const v = ctx.view, rd = this.root.querySelector('.ck-read'), rr = v && v.z > 1.0005 && rd ? rd.getBoundingClientRect() : null;
    const wOf = (it) => (it.text.length + (it.kind === 'obj' ? 4 : 0)) * (it.kind === 'region' ? 8.2 : 6.93) + 11;
    ctx.labels.set('clock', rr && rr.width ? items.filter((it) => { const p = v.apply(it.x, it.y), l = p[0] + 5, t = p[1] - 23; return !(l < rr.right && l + wOf(it) > rr.left && t < rr.bottom && t + 18 > rr.top); }) : items);
  },

  setAngle(k, ctx, o = {}) {
    if (!this.ready || !this.geo) return 0;
    this.stopDemo();
    const inst = !!o.instant || ctx.reduced;
    if (k === 0) { ctx.view.home({ instant: inst }); return 0; }
    if (this.d) this.set(this.homeHour, ctx);
    this.flyHour(ctx, this.hour);
    return inst ? 0 : 650;
  },

  /* search: {hour: 14 | '14' | '14:00'} turns the hand there and flies onto the wedge */
  focus(d, ctx) {
    if (!this.ready || !d || d.hour == null || !this.geo) return false;
    const h = parseInt(String(d.hour), 10); if (!(h >= 0 && h <= 23)) return false;
    this.stopDemo(); this.set(h, ctx); this.focusH = h;
    this.flyHour(ctx, h);
    return true;
  },

  precision() { return this.prec ? this.prec.slice() : []; },
  /* the line under the dial, and the readout in the hole (a small dial on a phone leaves no room beside it) */
  keepout() {
    const out = [];
    [this.note, this.root && this.root.querySelector('.ck-read')].forEach((el) => { const r = el && el.getBoundingClientRect(); if (r && r.width) out.push({ x: r.left, y: r.top, w: r.width, h: r.height }); });
    return out;
  },
};
