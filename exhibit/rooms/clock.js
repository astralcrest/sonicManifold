/* room 04 — what held. seven years folded onto one 24-hour dial.
   every dot in the field is one play, placed on the hour it started: angle = hour, midnight at the top,
   clockwise, noon at the bottom. the annulus grows outward from a fixed inner circle, so each hour's
   radial thickness is that hour's play count and the outer silhouette is the shape of the day. inside
   an hour the three provenance bands stack outward in the order the wall text names: served underneath,
   shuffle over it, what i tapped on the outside.
   one interaction: drag or arrow-key the hand round the dial and read that hour's count and tapped share.
   every number on screen comes from exhibit/data/clock.json. nothing here is fitted or smoothed. */

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
  /* a phone has two lines of room under the dial: it keeps the busy-hours range and the utc-7 caveat and
     drops the thin-hour aside, which is a footnote to the range and not a finding. */
  + '@media (max-width:700px){section[data-room=clock] .ck-more{display:none}}'
  + '@media (prefers-reduced-motion:reduce){section[data-room=clock] .ck-dial{cursor:default}}';

const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const hh = (h) => (h < 10 ? '0' + h : '' + h) + ':00';
const TAU = 6.283185307179586;
/* how much room outside the data the axis ring needs: tick, gap, and the 00/06/12/18 labels */
const AXIS = 32;

export default {
  id: 'clock', track: 'too-fiery-hot', ready: false, hour: 14, d: null, geo: null,
  hrOf: null, drag: false, lastTick: 0, sweep: 0,

  async mount(root, ctx) {
    this.root = root;
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
    this.cav.textContent = ' hours are read at a fixed utc-7 for all seven years, so only roughly local.';

    this.dial.addEventListener('pointerdown', (e) => {
      if (!this.d) return;
      this.stopDemo();
      this.drag = true; this.dial.classList.add('grab');
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
    if (note) {
      note.style.left = noteLeft + 'px'; note.style.width = noteW + 'px';
      noteH = Math.min(s.h * 0.34, note.offsetHeight + 10);
    }
    const cx = s.x + s.w / 2, cy = s.y + (s.h - noteH) / 2;
    /* the axis ring (ticks plus the four hour labels) lives outside the data and has to fit too,
       or a phone prints "12" straight through the line under the dial */
    const half = Math.min(s.w, s.h - noteH) / 2;
    const R = Math.max(40, (half - AXIS) / 0.94);
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
      const sub = Math.max(8.2, Math.min(12, R * 0.088)).toFixed(1) + 'px';
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
  },

  fromPointer(e, ctx) {
    const g = this.geo; if (!g) return;
    const dx = e.clientX - g.cx, dy = e.clientY - g.cy;
    if (dx * dx + dy * dy < 144) return; /* dead zone at the hub: a shaky hand there would spin the hand */
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

    if (this.sweep) {
      if (ctx.demoStopped) this.stopDemo();
      else {
        const k = (t - this.sweep) / 15000;
        if (k >= 1) { this.stopDemo(); this.set(this.homeHour, ctx); }
        else this.set(Math.floor(k * 24), ctx);
      }
    }

    /* the axis: hour ticks and four labels. ice, because ice is the interface and never the data. */
    gx.strokeStyle = 'rgba(134,203,254,.22)'; gx.lineWidth = 1;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * TAU - TAU / 4, big = k % 6 === 0;
      const r0 = outer + 4, r1 = outer + (big ? 12 : 7);
      gx.beginPath();
      gx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      gx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      gx.stroke();
    }
    gx.font = '600 10px "JetBrains Mono", ui-monospace, Menlo, monospace';
    gx.fillStyle = 'rgba(134,203,254,.5)';
    gx.textAlign = 'center'; gx.textBaseline = 'middle';
    for (let k = 0; k < 4; k++) {
      const a = ((k * 6) / 24) * TAU - TAU / 4, r = outer + 22;
      gx.fillText(['00', '06', '12', '18'][k], cx + Math.cos(a) * r, cy + Math.sin(a) * r);
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
    gx.strokeStyle = 'rgba(134,203,254,.75)'; gx.lineWidth = 1.3; gx.stroke();

    gx.lineCap = 'round';
    gx.strokeStyle = 'rgba(134,203,254,.16)'; gx.lineWidth = 6;
    gx.beginPath();
    gx.moveTo(cx + Math.cos(am) * rIn * 0.9, cy + Math.sin(am) * rIn * 0.9);
    gx.lineTo(cx + Math.cos(am) * rTip, cy + Math.sin(am) * rTip);
    gx.stroke();
    gx.strokeStyle = 'rgba(160,214,255,.95)'; gx.lineWidth = 1.8; gx.stroke();
    gx.lineCap = 'butt';
    gx.fillStyle = '#c3e4ff';
    gx.beginPath(); gx.arc(cx + Math.cos(am) * rTip, cy + Math.sin(am) * rTip, 3.2, 0, TAU); gx.fill();

    gx.textAlign = 'left'; gx.textBaseline = 'alphabetic';
  },

  leave(ctx) { this.stopDemo(); this.drag = false; if (this.dial) this.dial.classList.remove('grab'); },

  stopDemo() { this.sweep = 0; },

  /* kiosk: nobody is here. walk the hand once round the day and leave it on the busiest hour. */
  demo(ctx) {
    if (!this.ready || !this.d) return;
    const sec = this.root && this.root.parentElement;
    if (!sec || !sec.classList.contains('is-active')) return;
    this.sweep = performance.now();
  },
};
