/* room 6 — make your own. the finale: the wall from room 01 re-forms, everything the queue chose
   falls out of the picture, and what is left (the plays i tapped) rises into a camelot wheel: two
   rings, inner is the minor keys, outer is the major ones, and the twenty-two tracks i made from
   this log sit at their real key. tap one to hear it; its harmonic neighbours glow.
   data: exhibit/data/tracks.json, and dot provenance from exhibit/data/wall.json via ctx.identity(). */
const RIM = 0.36, TAU = 6.2831853;
const B1 = 1400, B2 = 2600, SETTLE = 1400; /* beat boundaries in ms, read off the frame clock */
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two'];
function ang(n) { return (n - 1) * 30 - 90; }
function rad(d) { return d * Math.PI / 180; }
/* k of the way from one 0xRRGGBB to another */
function mix(a, b, k) { const r = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * k, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * k, c = (a & 255) + ((b & 255) - (a & 255)) * k; return (r << 16 | g << 8 | c) & 0xffffff; }
function parseKey(k) { return { num: parseInt(k, 10), letter: k.slice(-1) }; }
function sameKey(a, b) { return a.num === b.num && a.letter === b.letter; }
function adjKey(a, b) { if (a.num === b.num && a.letter !== b.letter) return true; if (a.letter === b.letter) { const d = Math.abs(a.num - b.num); return d === 1 || d === 11; } return false; }

export default {
  id: 'make', track: 'reach-back', ready: false, tracks: [], playing: -1, neighborSet: null,
  beat: 0, t0: -1, endAt: 0, ran: false, away: true, demoT: 0, vh: 800, jit: 12, tight: false,
  async mount(root, ctx) {
    const st = document.createElement('style');
    st.textContent = 'section[data-room="make"] .mk{position:absolute;inset:0}'
      + 'section[data-room="make"] .mk-text{position:absolute;display:flex;flex-direction:column;gap:6px;pointer-events:none;transition:top .5s ease}'
      + 'section[data-room="make"] .mk-intro{margin:0;font:400 13px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;color:var(--mute);max-width:30rem}'
      + 'section[data-room="make"] .mk-now{margin:0;font:600 12px/1.4 var(--mono);letter-spacing:.02em;color:var(--mint2)}'
      + 'section[data-room="make"] .mk-next{margin:0;font:400 12px/1.4 var(--mono);color:var(--mute)}'
      + 'section[data-room="make"] .mk-end{margin:0;font:400 11px/1.45 var(--mono);color:#6d6480;max-width:30rem}'
      + '@media (max-width:560px){section[data-room="make"] .mk-text{gap:5px}section[data-room="make"] .mk-intro{font-size:12px;line-height:1.42}section[data-room="make"] .mk-next{font-size:11px}section[data-room="make"] .mk-end{font-size:10.5px}}'
      + 'section[data-room="make"] .mk-labels{position:absolute;inset:0;pointer-events:none;transition:opacity .6s ease}'
      + 'section[data-room="make"] .mk-kl{position:absolute;transform:translate(-50%,-50%);font:600 9px/1 var(--mono);letter-spacing:.05em;color:var(--mute);opacity:.5;white-space:nowrap}'
      + 'section[data-room="make"] .mk-btns{position:absolute;inset:0;transition:opacity .6s ease}'
      + 'section[data-room="make"] .mk-hide .mk-labels,section[data-room="make"] .mk-hide .mk-btns{opacity:0}'
      + 'section[data-room="make"] .mk-trk{position:absolute;width:44px;height:44px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(189,166,255,.22);background:transparent;padding:0;margin:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
      + 'section[data-room="make"] .mk-trk:hover{border-color:var(--mint2)}'
      + 'section[data-room="make"] .mk-trk:focus-visible{outline:2px solid var(--mint);outline-offset:3px;border-color:var(--mint)}'
      + 'section[data-room="make"] .mk-trk:disabled{cursor:default}'
      + 'section[data-room="make"] .mk-trk[aria-pressed="true"]{border-color:var(--mint);box-shadow:0 0 0 3px rgba(33,246,188,.16)}'
      + '@media (prefers-reduced-motion:reduce){section[data-room="make"] .mk-labels,section[data-room="make"] .mk-btns,section[data-room="make"] .mk-text{transition:none}}';
    document.head.appendChild(st);
    let data = null;
    try { data = await ctx.data('tracks'); } catch (e) {}
    try { await ctx.identity(); } catch (e) {} /* every dot needs its prov before the finale can sort the wall */
    const wrap = document.createElement('div'); wrap.className = 'mk'; root.appendChild(wrap); this.wrap = wrap; this.root = root;
    const tracks = data && data.tracks ? data.tracks : [];
    if (!tracks.length) { const p = document.createElement('p'); p.className = 'mk-intro'; p.textContent = 'the track list did not load. reload to try again.'; wrap.appendChild(p); return; }
    this.tracks = tracks.map((t) => Object.assign({}, t, parseKey(t.k)));
    this.playing = Math.max(0, this.tracks.findIndex((t) => t.f === 'reach-back'));

    /* provenance ranks: tapped dots first, then shuffled, then served — the same three-band order room 01 sorts into.
       counting sort, so the 19/81 split below is counted off P.prov (assigned by the shell from exhibit/data/wall.json) */
    const P = ctx.particles, n = P.n, prov = P.prov, cnt = [0, 0, 0];
    for (let i = 0; i < n; i++) cnt[prov[i]]++;
    const off = [0, cnt[0], cnt[0] + cnt[1]], order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = off[prov[i]]++;
    this.order = order; this.tapCount = cnt[0];
    const tapPct = Math.round(cnt[0] / n * 100), restPct = 100 - tapPct; /* 19 / 81 — matches wall.json pct_rounded.tap = 19 */
    const word = WORDS[this.tracks.length] || String(this.tracks.length);
    this.lines = [
      'the wall again. seven years, sorted.',
      'everything the queue or shuffle started, leaving. ' + restPct + '% of the picture.',
      'what is left is the ' + tapPct + '% i tapped. i made ' + word + ' tracks out of all of it anyway. tap one.',
    ];
    /* the short screens get the same sentence with the middle clause dropped, not a different claim */
    this.short = ['the wall again. seven years, sorted.', restPct + '% of it, leaving.', 'what is left is the ' + tapPct + '% i tapped. ' + word + ' tracks. tap one.'];
    this.closings = ['that was the last of the six rooms. the wheel stays up for as long as you want it.', 'that was the last of the six rooms.'];

    const text = document.createElement('div'); text.className = 'mk-text'; wrap.appendChild(text); this.textEl = text;
    const intro = document.createElement('p'); intro.className = 'mk-intro'; text.appendChild(intro); /* filled by the first beat, so no line flashes before the finale starts */
    const now = document.createElement('p'); now.className = 'mk-now'; now.setAttribute('aria-live', 'polite'); text.appendChild(now);
    const next = document.createElement('p'); next.className = 'mk-next'; next.setAttribute('aria-live', 'polite'); text.appendChild(next);
    const end = document.createElement('p'); end.className = 'mk-end'; end.setAttribute('aria-live', 'polite'); text.appendChild(end);
    this.introEl = intro; this.nowEl = now; this.nextEl = next; this.endEl = end;

    const labels = document.createElement('div'); labels.className = 'mk-labels'; labels.setAttribute('aria-hidden', 'true'); wrap.appendChild(labels); this.labelWrap = labels;
    this.labelEls = [];
    for (let k = 1; k <= 12; k++) for (const L of ['A', 'B']) { const s = document.createElement('span'); s.className = 'mk-kl'; s.textContent = k + L; labels.appendChild(s); this.labelEls.push({ el: s, num: k, letter: L }); }

    const btns = document.createElement('div'); btns.className = 'mk-btns'; wrap.appendChild(btns);
    this.btnEls = this.tracks.map((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mk-trk';
      b.setAttribute('aria-label', 'play ' + t.t + ', key ' + t.k + ', ' + t.bpm + ' bpm');
      b.addEventListener('click', () => { this.stopDemo(); this.select(i, ctx, true); });
      btns.appendChild(b); return b;
    });
    this.trackPos = this.tracks.map(() => ({ x: 0, y: 0 }));
    this.ready = true;
  },
  /* ---- layout ------------------------------------------------------------------ */
  layout(ctx) {
    const s = ctx.stage(); this.s = s; this.vh = innerHeight;
    /* on a short screen the wheel would be squeezed to nothing by the copy, so the "next in my order"
       line drops its trailing explanation and the wheel keeps the room it needs */
    this.tight = false; let textH = this.reserve(s);
    if (s.h - textH - 10 < 188) { this.tight = true; textH = this.reserve(s); }
    const availH = Math.max(120, s.h - textH - 10);
    /* below a certain size the ring of key labels is illegible and lands on top of the clusters, so the small
       wheel drops it and takes the space back. the margin is what the labels and the top half of a button need */
    const R0 = Math.min(s.w / 2 - 24, (availH - 36) / 2);
    this.showLabels = R0 >= 78;
    const M = this.showLabels ? 30 : 18;
    const R = Math.max(36, Math.min(s.w / 2 - (this.showLabels ? 34 : 24), (availH - M * 2) / 2));
    this.labelWrap.style.display = this.showLabels ? '' : 'none';
    const cx = s.x + s.w / 2, cy = s.y + availH / 2;
    this.cx = cx; this.cy = cy; this.rIn = R * (this.tight ? 0.66 : 0.6); this.rOut = R;
    this.jit = Math.max(5, Math.min(15, R * 0.14)); /* cluster radius: on a small wheel the clusters have to shrink too, or they merge into one ring */
    const groups = {};
    this.tracks.forEach((t, i) => (groups[t.k] = groups[t.k] || []).push(i));
    /* two tracks in the same key sit either side of that key's angle, far enough apart that their clusters do not merge */
    const spread = Math.max(13, Math.min(30, (this.jit * 2 + 4) / this.rIn * 57.2958));
    Object.values(groups).forEach((idxs) => idxs.forEach((i, gi) => {
      const t = this.tracks[i], o = idxs.length > 1 ? (gi - (idxs.length - 1) / 2) * spread : 0;
      const a = rad(ang(t.num) + o), r = t.letter === 'A' ? this.rIn : this.rOut;
      this.trackPos[i].x = cx + Math.cos(a) * r; this.trackPos[i].y = cy + Math.sin(a) * r;
    }));
    this.labelEls.forEach(({ el, num, letter }) => {
      const a = rad(ang(num)), r = letter === 'A' ? this.rIn - this.jit - 11 : this.rOut + this.jit + 9;
      el.style.left = (cx + Math.cos(a) * r) + 'px'; el.style.top = (cy + Math.sin(a) * r) + 'px';
    });
    /* on a small phone the ring is tight: shrink the hit circles to the spacing between them (never under 28px) rather than let them cover each other's centres */
    const bs = Math.max(28, Math.min(44, Math.round(Math.min(R * 0.4, this.rIn * 0.52))));
    this.btnEls.forEach((b, i) => { b.style.width = b.style.height = bs + 'px'; b.style.left = this.trackPos[i].x + 'px'; b.style.top = this.trackPos[i].y + 'px'; });
    /* two resting places for the copy: hard against the bottom of the stage while the beats run (one line, and the
       wall needs every other pixel), and up where the four settled lines start once the wheel is there */
    this.textTop = s.y + s.h - textH; this.beatTop = s.y + s.h - this.lineH;
    this.textEl.style.left = s.x + 'px'; this.textEl.style.width = s.w + 'px';
    this.textEl.style.top = (this.beat > 0 && this.beat < 3 ? this.beatTop : this.textTop) + 'px';
    if (this.beat) this.introEl.textContent = this.line(this.beat - 1); /* a resize can flip the copy between its long and short form */
    if (this.endEl.textContent) this.endEl.textContent = this.closingText();
    if (this.nextEl.textContent) this.nextEl.textContent = this.nextLine(this.playing);
    this.grid(ctx);
  },
  /* measure the text block at its tallest, so it can never grow down into the .wall copy underneath */
  reserve(s) {
    const t = this.textEl, keep = [this.introEl.textContent, this.nowEl.textContent, this.nextEl.textContent, this.endEl.textContent];
    t.style.left = s.x + 'px'; t.style.width = s.w + 'px';
    let nx = '', nw = '';
    for (let i = 0; i < this.tracks.length; i++) { const a = this.nextLine(i), b = this.nowLine(i); if (a.length > nx.length) nx = a; if (b.length > nw.length) nw = b; }
    this.introEl.textContent = this.line(2); this.nowEl.textContent = nw;
    this.nextEl.textContent = nx; this.endEl.textContent = this.closingText();
    const h = t.offsetHeight;
    /* and again with the one beat line alone: that is all the copy the wall has to leave room for */
    let lg = ''; for (let i = 0; i < 3; i++) { const v = this.line(i); if (v.length > lg.length) lg = v; }
    this.nowEl.textContent = this.nextEl.textContent = this.endEl.textContent = ''; this.introEl.textContent = lg;
    this.lineH = t.offsetHeight;
    this.introEl.textContent = keep[0]; this.nowEl.textContent = keep[1]; this.nextEl.textContent = keep[2]; this.endEl.textContent = keep[3];
    return h;
  },
  /* the wall grid from room 01, duplicated here on purpose (rooms do not import each other) so the
     finale re-forms the same pixel-exact rectangle: a whole number of device pixels per cell, or it moires */
  grid(ctx) {
    const s = this.s, P = ctx.particles, n = P.n, d = P.dpr, wh = Math.max(80, this.beatTop - s.y - 12);
    let cell = Math.max(2, Math.floor(Math.sqrt((s.w * d) * (wh * d) / n)));
    let cols = Math.floor((s.w * d) / cell), rows = Math.ceil(n / cols);
    while (rows * cell > wh * d && cell > 2) { cell--; cols = Math.floor((s.w * d) / cell); rows = Math.ceil(n / cols); }
    const maxRows = Math.floor((wh * d) / cell); if (rows > maxRows) rows = maxRows;
    this.wcell = cell / d; this.wcols = cols; this.wrows = rows; this.wcap = cols * rows;
    this.wox = s.x + (s.w - cols * this.wcell) / 2; this.woy = s.y;
  },
  /* ---- the wheel --------------------------------------------------------------- */
  /* which part of the wheel a dot belongs to: -1 inner rim, -2 outer rim, else a track index.
     keyed off the dot's rank among the tapped dots, so the wheel is built from that ~19% alone */
  slot(i, ctx) {
    const k = this.order[i], h = ctx.hash;
    if (h(k * 2 + 1) < RIM) return h(k * 3 + 1) < 0.5 ? -1 : -2;
    return Math.floor(h(k * 5 + 2) * this.tracks.length);
  },
  layoutParticles(ctx) {
    const P = ctx.particles, prov = P.prov, tp = this.trackPos, cx = this.cx, cy = this.cy, rIn = this.rIn, rOut = this.rOut;
    const hash = ctx.hash, jit = this.jit, cos = Math.cos, sin = Math.sin;
    P.targetPx((i) => {
      if (prov[i] !== 0) return null; /* the queue's plays are out of the picture now: parked off-screen */
      const s = this.slot(i, ctx);
      if (s < 0) { const a = hash(i * 5 + 2) * TAU, r = s === -1 ? rIn : rOut; return [cx + cos(a) * r, cy + sin(a) * r]; }
      const p = tp[s], jr = hash(i * 7 + 9) * jit, ja = hash(i * 11 + 13) * TAU;
      return [p.x + cos(ja) * jr, p.y + sin(ja) * jr];
    });
  },
  paint(ctx) {
    const P = ctx.particles, prov = P.prov, PAL = ctx.PAL, playing = this.playing, nb = this.neighborSet, tracks = this.tracks;
    P.color((i) => {
      if (prov[i] !== 0) return PAL.bg;
      const s = this.slot(i, ctx);
      if (s < 0) return s === -1 ? PAL.orchid : PAL.ice;
      if (s === playing) return PAL.tap;
      if (nb && nb.has(s)) return PAL.mint2;
      return tracks[s].letter === 'A' ? PAL.orchid : PAL.ice;
    });
  },
  line(k) { return (this.tight ? this.short : this.lines)[k]; },
  nowLine(i) { const t = this.tracks[i]; return 'now: ' + t.t + ' · ' + t.k + ' · ' + t.bpm + ' bpm'; },
  closingText() { return this.closings[this.tight ? 1 : 0]; },
  nextLine(i) {
    const t = this.tracks[i], n = this.tracks.length, nx = this.tracks[(i + 1) % n], head = 'next in my order: ' + nx.t + ' (' + nx.k + ')';
    if (this.tight) return head + '.';
    return sameKey(t, nx)
      ? head + '. the same key, so the blend is direct.'
      : adjKey(t, nx)
      ? head + '. one step round the wheel, so the blend is clean.'
      : head + '. a jump across the wheel. in the lab the engine uses a longer dissolve there.';
  },
  select(i, ctx, doPlay) {
    const t = this.tracks[i]; this.playing = i;
    const nb = new Set();
    for (let k = 0; k < this.tracks.length; k++) if (k !== i && adjKey(t, this.tracks[k])) nb.add(k);
    this.neighborSet = nb;
    this.paint(ctx);
    this.btnEls.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    this.nowEl.textContent = this.nowLine(i);
    this.nextEl.textContent = this.nextLine(i);
    if (doPlay) ctx.audio.play(t.f);
  },
  arm(on) { this.btnEls.forEach((b) => { b.disabled = !on; }); this.wrap.classList.toggle('mk-hide', !on); },
  /* ---- the finale -------------------------------------------------------------- */
  beatOne(ctx) {
    const P = ctx.particles, prov = P.prov, PROV = ctx.PROV;
    this.beat = 1; this.t0 = -1; this.endAt = 0;
    this.arm(false); this.introEl.textContent = this.line(0); this.textEl.style.top = this.beatTop + 'px';
    this.nowEl.textContent = ''; this.nextEl.textContent = ''; this.endEl.textContent = '';
    P.ease = 0.1; P.jitter = 0.28; P.big = false; P.swirl = 0.22;
    this.wallTargets(ctx);
    P.color((i) => PROV[prov[i]]);
  },
  wallTargets(ctx) {
    const P = ctx.particles, rows = this.wrows, cell = this.wcell, ox = this.wox, oy = this.woy;
    const order = this.order, cap = this.wcap, n = P.n, keep = cap >= n ? 1 : cap / n, floor = Math.floor;
    P.targetPx((i) => {
      let k = order[i];
      if (keep < 1) { const kk = floor(k * keep); if (floor((k + 1) * keep) === kk) return null; k = kk; }
      return [ox + floor(k / rows) * cell, oy + (k % rows) * cell];
    });
  },
  beatTwo(ctx, quiet) {
    const P = ctx.particles, prov = P.prov, X = P.x, hash = ctx.hash, PAL = ctx.PAL, floor = Math.floor;
    const rows = this.wrows, cell = this.wcell, ox = this.wox, oy = this.woy, order = this.order;
    const cap = this.wcap, n = P.n, keep = cap >= n ? 1 : cap / n, fy = this.vh + 170;
    this.beat = 2; this.introEl.textContent = this.line(1);
    P.swirl = 0; P.ease = 0.045; /* straight down: a fall, not an arc */
    P.targetPx((i) => {
      if (prov[i] === 0) { let k = order[i]; if (keep < 1) { const kk = floor(k * keep); if (floor((k + 1) * keep) === kk) return null; k = kk; } return [ox + floor(k / rows) * cell, oy + (k % rows) * cell]; }
      return [X[i] + (hash(i * 13 + 7) - 0.5) * 22, fy + hash(i * 19 + 3) * 420];
    });
    /* not straight to the background: they keep a trace of their own colour on the way out, so the 81% is seen leaving rather than blinking off */
    const dim = [mix(PAL.bg, ctx.PROV[0], 0.3), mix(PAL.bg, ctx.PROV[1], 0.3), mix(PAL.bg, ctx.PROV[2], 0.3)];
    P.color((i) => (prov[i] === 0 ? PAL.tap : dim[prov[i]]));
    if (!quiet) ctx.audio.note(0, { dur: 1.7, vol: 0.045 });
  },
  beatThree(ctx, t, quiet) {
    const P = ctx.particles;
    this.beat = 3; P.swirl = 0.3; P.ease = 0.05; P.jitter = 0.5; P.big = true; /* fewer dots left: draw each one bigger */
    this.introEl.textContent = this.line(2); this.textEl.style.top = this.textTop + 'px';
    this.layoutParticles(ctx); this.select(this.playing, ctx, false);
    this.arm(true);
    this.endAt = (t || performance.now()) + SETTLE;
    if (!quiet) { ctx.audio.note(4, { dur: 1.9, vol: 0.04 }); ctx.audio.note(7, { at: 0.12, dur: 1.7, vol: 0.03 }); }
  },
  settled() { this.endAt = 0; this.endEl.textContent = this.closingText(); },
  /* ---- lifecycle --------------------------------------------------------------- */
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5; P.big = false; P.touch = false; /* the clusters are buttons; the pointer should not push them away */
    if (!this.ready) { P.scatter(); P.color(() => ctx.PAL.fog); return; }
    const fresh = this.away; this.away = false;
    this.layout(ctx);
    if (!this.ran) { /* first arrival in this visit: the three beats */
      this.ran = true;
      if (ctx.reduced) { this.beatThree(ctx, performance.now(), true); this.settled(); } else this.beatOne(ctx);
      return;
    }
    if (!fresh && this.beat === 1) return this.wallTargets(ctx); /* a resize mid-finale keeps the clock and re-forms at the new size */
    if (!fresh && this.beat === 2) return this.beatTwo(ctx, true);
    this.beatThree(ctx, performance.now(), !fresh); this.settled(); /* afterwards: the short version, straight to the wheel */
  },
  /* left mid-finale (a fast scroll, or the shell settling on the room at startup): it did not happen, so it plays again next time */
  leave(ctx) {
    this.stopDemo(); this.away = true;
    if (ctx && ctx.particles) ctx.particles.big = false; /* this room is the only one that asks for fat dots: hand the field back as it was */
    if (this.beat > 0 && this.beat < 3) { this.beat = 0; this.t0 = -1; this.ran = false; }
  },
  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    if (this.beat === 1 || this.beat === 2) {
      if (this.t0 < 0) this.t0 = t;
      else if (this.beat === 1) { if (t - this.t0 >= B1) this.beatTwo(ctx); }
      else if (t - this.t0 >= B2) this.beatThree(ctx, t);
      return;
    }
    if (this.endAt && t >= this.endAt) this.settled();
    if (this.playing < 0) return;
    const p = this.trackPos[this.playing], r = 15 + bands.low * 9;
    g.beginPath(); g.arc(p.x, p.y, r, 0, TAU);
    g.strokeStyle = 'rgba(33,246,188,' + (0.45 + bands.low * 0.4) + ')'; g.lineWidth = 2; g.stroke();
  },
  /* ---- kiosk ------------------------------------------------------------------- */
  /* three tracks that are harmonic neighbours of each other, so the glow walks one step round the wheel */
  chain() {
    const T = this.tracks, n = T.length;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
      if (b === a || sameKey(T[a], T[b]) || !adjKey(T[a], T[b])) continue;
      for (let c = 0; c < n; c++) { if (c === a || c === b || sameKey(T[b], T[c]) || !adjKey(T[b], T[c])) continue; return [a, b, c]; }
    }
    return [0, 1 % n, 2 % n];
  },
  stopDemo() { clearTimeout(this.demoT); this.demoT = 0; },
  demo(ctx) {
    if (!this.ready) return;
    this.stopDemo();
    const seq = this.chain(), live = () => this.root && this.root.parentElement && this.root.parentElement.classList.contains('is-active');
    const step = (k) => { if (k >= seq.length || !live()) return; this.select(seq[k], ctx, true); this.demoT = setTimeout(() => step(k + 1), 9000); };
    const wait = this.beat > 0 && this.beat < 3 ? Math.max(0, this.t0 + B2 + SETTLE - performance.now()) : 0;
    this.demoT = setTimeout(() => { if (live()) step(0); }, wait + 200);
  },
};
