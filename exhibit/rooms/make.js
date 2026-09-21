/* room 6 — make your own. the shared particles become a camelot wheel: two rings, inner
   is the minor keys, outer is the major ones, and the twenty-two tracks i made from this
   log sit at their real key. tap one to hear it; its harmonic neighbours glow. data:
   exhibit/data/tracks.json. */
const RIM = 0.4, CJIT = 15, TAU = 6.2831853;
function ang(n) { return (n - 1) * 30 - 90; }
function rad(d) { return d * Math.PI / 180; }
function parseKey(k) { return { num: parseInt(k, 10), letter: k.slice(-1) }; }
function sameKey(a, b) { return a.num === b.num && a.letter === b.letter; }
function adjKey(a, b) { if (a.num === b.num && a.letter !== b.letter) return true; if (a.letter === b.letter) { const d = Math.abs(a.num - b.num); return d === 1 || d === 11; } return false; }

export default {
  id: 'make', track: 'reach-back', ready: false, tracks: [], playing: -1, neighborSet: null,
  async mount(root, ctx) {
    const st = document.createElement('style');
    st.textContent = 'section[data-room="make"] .mk{position:absolute;inset:0}'
      + 'section[data-room="make"] .mk-text{position:absolute;display:flex;flex-direction:column;gap:6px;pointer-events:none}'
      + 'section[data-room="make"] .mk-intro{margin:0;font:400 13px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;color:var(--mute);max-width:30rem}'
      + 'section[data-room="make"] .mk-now{margin:0;font:600 12px/1.4 var(--mono);letter-spacing:.02em;color:var(--mint2)}'
      + 'section[data-room="make"] .mk-next{margin:0;font:400 12px/1.4 var(--mono);color:var(--mute)}'
      + 'section[data-room="make"] .mk-labels{position:absolute;inset:0;pointer-events:none}'
      + 'section[data-room="make"] .mk-kl{position:absolute;transform:translate(-50%,-50%);font:600 9px/1 var(--mono);letter-spacing:.05em;color:var(--mute);opacity:.5;white-space:nowrap}'
      + 'section[data-room="make"] .mk-btns{position:absolute;inset:0}'
      + 'section[data-room="make"] .mk-trk{position:absolute;width:44px;height:44px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(189,166,255,.22);background:transparent;padding:0;margin:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
      + 'section[data-room="make"] .mk-trk:hover{border-color:var(--mint2)}'
      + 'section[data-room="make"] .mk-trk:focus-visible{outline:2px solid var(--mint);outline-offset:3px;border-color:var(--mint)}'
      + 'section[data-room="make"] .mk-trk[aria-pressed="true"]{border-color:var(--mint);box-shadow:0 0 0 3px rgba(33,246,188,.16)}';
    document.head.appendChild(st);
    let data = null;
    try { data = await ctx.data('tracks'); } catch (e) {}
    const wrap = document.createElement('div'); wrap.className = 'mk'; root.appendChild(wrap);
    const tracks = data && data.tracks ? data.tracks : [];
    if (!tracks.length) { const p = document.createElement('p'); p.className = 'mk-intro'; p.textContent = 'the track list did not load. reload to try again.'; wrap.appendChild(p); return; }
    this.tracks = tracks.map((t) => Object.assign({}, t, parseKey(t.k)));
    this.playing = Math.max(0, this.tracks.findIndex((t) => t.f === 'reach-back'));

    const text = document.createElement('div'); text.className = 'mk-text'; wrap.appendChild(text); this.textEl = text;
    const intro = document.createElement('p'); intro.className = 'mk-intro short-hide';
    intro.textContent = 'twenty-two tracks i made from this data, placed by key. tap one.';
    text.appendChild(intro);
    const now = document.createElement('p'); now.className = 'mk-now'; now.setAttribute('aria-live', 'polite'); text.appendChild(now);
    const next = document.createElement('p'); next.className = 'mk-next'; next.setAttribute('aria-live', 'polite'); text.appendChild(next);
    this.nowEl = now; this.nextEl = next;

    const labels = document.createElement('div'); labels.className = 'mk-labels'; labels.setAttribute('aria-hidden', 'true'); wrap.appendChild(labels);
    this.labelEls = [];
    for (let n = 1; n <= 12; n++) for (const L of ['A', 'B']) { const s = document.createElement('span'); s.className = 'mk-kl'; s.textContent = n + L; labels.appendChild(s); this.labelEls.push({ el: s, num: n, letter: L }); }

    const btns = document.createElement('div'); btns.className = 'mk-btns'; wrap.appendChild(btns);
    this.btnEls = this.tracks.map((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mk-trk';
      b.setAttribute('aria-label', 'play ' + t.t + ', key ' + t.k + ', ' + t.bpm + ' bpm');
      b.addEventListener('click', () => this.select(i, ctx, true));
      btns.appendChild(b); return b;
    });
    this.trackPos = this.tracks.map(() => ({ x: 0, y: 0 }));
    this.ready = true;
  },
  layout(ctx) {
    const s = ctx.stage(), textH = s.w < 520 ? 112 : 78, availH = Math.max(140, s.h - textH);
    const R = Math.max(60, Math.min(s.w, availH) / 2 * 0.82);
    const cx = s.x + s.w / 2, cy = s.y + availH / 2;
    this.cx = cx; this.cy = cy; this.rIn = R * 0.6; this.rOut = R;
    const groups = {};
    this.tracks.forEach((t, i) => (groups[t.k] = groups[t.k] || []).push(i));
    Object.values(groups).forEach((idxs) => idxs.forEach((i, gi) => {
      const t = this.tracks[i], off = idxs.length > 1 ? (gi - (idxs.length - 1) / 2) * 13 : 0;
      const a = rad(ang(t.num) + off), r = t.letter === 'A' ? this.rIn : this.rOut;
      this.trackPos[i].x = cx + Math.cos(a) * r; this.trackPos[i].y = cy + Math.sin(a) * r;
    }));
    this.labelEls.forEach(({ el, num, letter }) => {
      const a = rad(ang(num)), r = letter === 'A' ? this.rIn - 16 : this.rOut + 16;
      el.style.left = (cx + Math.cos(a) * r) + 'px'; el.style.top = (cy + Math.sin(a) * r) + 'px';
    });
    this.btnEls.forEach((b, i) => { b.style.left = this.trackPos[i].x + 'px'; b.style.top = this.trackPos[i].y + 'px'; });
    this.textEl.style.left = s.x + 'px'; this.textEl.style.top = (s.y + availH + 10) + 'px'; this.textEl.style.width = s.w + 'px';
  },
  layoutParticles(ctx) {
    const P = ctx.particles, tp = this.trackPos, n = this.tracks.length, cx = this.cx, cy = this.cy, rIn = this.rIn, rOut = this.rOut, hash = ctx.hash;
    P.targetPx((i) => {
      const u = hash(i);
      if (u < RIM) { const ring = hash(i * 3 + 1) < 0.5 ? 0 : 1, a = hash(i * 5 + 2) * TAU, r = ring ? rOut : rIn; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
      const ti = Math.floor(hash(i * 3 + 1) * n), p = tp[ti], jr = hash(i * 7 + 9) * CJIT, ja = hash(i * 11 + 13) * TAU;
      return [p.x + Math.cos(ja) * jr, p.y + Math.sin(ja) * jr];
    });
  },
  paint(ctx) {
    const P = ctx.particles, PAL = ctx.PAL, n = this.tracks.length, playing = this.playing, nb = this.neighborSet, hash = ctx.hash, tracks = this.tracks;
    P.color((i) => {
      const u = hash(i);
      if (u < RIM) return hash(i * 3 + 1) < 0.5 ? PAL.orchid : PAL.ice;
      const ti = Math.floor(hash(i * 3 + 1) * n);
      if (ti === playing) return PAL.tap;
      if (nb && nb.has(ti)) return PAL.mint2;
      return tracks[ti].letter === 'A' ? PAL.orchid : PAL.ice;
    });
  },
  select(i, ctx, doPlay) {
    const t = this.tracks[i]; this.playing = i;
    const nb = new Set();
    for (let k = 0; k < this.tracks.length; k++) if (k !== i && adjKey(t, this.tracks[k])) nb.add(k);
    this.neighborSet = nb;
    this.paint(ctx);
    this.btnEls.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const n = this.tracks.length, nx = this.tracks[(i + 1) % n];
    this.nowEl.textContent = 'now: ' + t.t + ' · ' + t.k + ' · ' + t.bpm + ' bpm';
    this.nextEl.textContent = sameKey(t, nx)
      ? 'next in my order: ' + nx.t + ' (' + nx.k + '). the same key, so the blend is direct.'
      : adjKey(t, nx)
      ? 'next in my order: ' + nx.t + ' (' + nx.k + '). one step round the wheel, so the blend is clean.'
      : 'next in my order: ' + nx.t + ' (' + nx.k + '). a jump across the wheel. in the lab the engine uses a longer dissolve there.';
    if (doPlay) ctx.audio.play(t.f);
  },
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5; P.big = false; P.touch = false; /* the clusters are buttons; the pointer should not push them away */
    if (!this.ready) { P.scatter(); P.color(() => ctx.PAL.fog); return; }
    this.layout(ctx); this.layoutParticles(ctx); this.select(this.playing, ctx, false);
  },
  leave() {},
  frame(g, t, bands) {
    if (!this.ready || this.playing < 0) return;
    const p = this.trackPos[this.playing], r = 15 + bands.low * 9;
    g.beginPath(); g.arc(p.x, p.y, r, 0, TAU);
    g.strokeStyle = 'rgba(33,246,188,' + (0.45 + bands.low * 0.4) + ')'; g.lineWidth = 2; g.stroke();
  },
};
