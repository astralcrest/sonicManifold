/* room 4 — two listeners. same 120 artists as the map; edges by who queued the next song. flip the
   toggle, edges cross-fade, nodes hold still. a bridge joins two different scenes. tap a node to hear it. */
import { post, stopAll } from '../post.js?v=2';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const css = (c, a) => 'rgba(' + c + ',' + a + ')';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

const CSS = `
section[data-room="listeners"] .lst-cav{font:400 11px/1.55 var(--mono);color:var(--mute);opacity:.72;margin:6px 0 0;max-width:32rem}
section[data-room="listeners"] .lst-fine summary{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);cursor:pointer;padding:12px 0 6px;width:max-content}
section[data-room="listeners"] .lst-fine summary:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
section[data-room="listeners"] .lst-hit{position:absolute;cursor:pointer}
section[data-room="listeners"] .lst-toggle{position:absolute;transform:translate(-50%,-50%);display:flex;gap:6px;background:rgba(10,1,24,.6);border:1px solid var(--line);border-radius:999px;padding:5px}
section[data-room="listeners"] .lst-toggle button{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);background:none;border:0;border-radius:999px;padding:13px 16px;min-height:44px;cursor:pointer;white-space:nowrap}
section[data-room="listeners"] .lst-toggle button.on{color:#06130f;background:linear-gradient(100deg,var(--mint),#62e7ff)}
section[data-room="listeners"] .lst-toggle button:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
section[data-room="listeners"] .lst-live{position:absolute;transform:translate(-50%,-50%);font:600 10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);opacity:.75;white-space:nowrap}
section[data-room="listeners"] .lst-tag{position:absolute;transform:translate(-50%,-100%);font:600 11px/1 var(--mono);color:var(--ink);background:rgba(10,1,24,.75);border:1px solid var(--line);border-radius:6px;padding:4px 8px;pointer-events:none;white-space:nowrap}
section[data-room="listeners"] .lst-post{position:absolute;transform:translateX(-50%);width:min(320px,80vw)}
`;

export default {
  id: 'listeners', track: 'dorian-manifold',
  ready: false, mode: 'tap', fadeStart: null,

  async mount(root, ctx) {
    document.head.appendChild(el('style')).textContent = CSS;
    await ctx.identity();
    const wall = root.parentElement.querySelector('.wall'), extra = el('div');
    wall.insertBefore(extra, wall.querySelector('.deeper'));
    this.extra = extra;

    let d = null; try { d = await ctx.data('twolisteners'); } catch (e) {}
    if (!d || !d.nodes || !d.nodes.length) { extra.appendChild(el('p', 'say dim', 'the network data did not load this time.')); return; }
    this.d = d;
    const nodes = d.nodes, n = nodes.length;
    const ramp = [ctx.PAL.tap, ctx.PAL.ice, ctx.PAL.amber, ctx.PAL.mint2, ctx.PAL.rose, ctx.PAL.orchid, ctx.PAL.white, ctx.PAL.shuffle, ctx.PAL.fog];
    const commColor = {}; let k = 0;
    for (const c of d.communities) commColor[c] = c === 'untagged' ? ctx.PAL.served : ramp[k++ % ramp.length];
    this.nodeColor = new Uint32Array(n); for (let i = 0; i < n; i++) this.nodeColor[i] = commColor[nodes[i].community] >>> 0;
    this.nodeComm = nodes.map((nd) => nd.community);
    this.MINT = rgb(ctx.PAL.tap).join(); this.AV = mix(rgb(ctx.PAL.amber), rgb(ctx.PAL.orchid), 0.62).join(); this.DIM = '200,190,220';

    const tap = Math.round(d.full_transition_crossing.tap * 100), auto = Math.round(d.full_transition_crossing.auto * 100);
    extra.appendChild(el('p', 'say dim short-hide', 'the bridges are the edges that join two different scenes.'));
    extra.appendChild(el('p', 'say', n + ' artists, drawn twice. of every 100 jumps to a different artist, mine cross scenes about ' + tap + ' times, autoplay’s about ' + auto + '.'));
    extra.appendChild(el('p', 'lst-cav', 'this is a direction, not a size.'));
    const fine = extra.appendChild(el('details', 'lst-fine')); fine.appendChild(el('summary', '', 'why not a size'));
    ['a third to two fifths of my jumps carry no public genre tag, and reasonable ways of handling them put the number anywhere from 1.00 to 1.13.', 'the picture is my two habits, not the measurement: the drawn graph keeps only the busiest artists.'].forEach((t) => fine.appendChild(el('p', 'lst-cav', t)));
    fine.open = innerWidth > innerHeight * 1.15;
    fine.addEventListener('toggle', () => { if (this.ready && root.parentElement.classList.contains('is-active')) this.enter(ctx); });

    this.hit = root.appendChild(el('div', 'lst-hit'));
    this.hit.addEventListener('click', (e) => this.tapAt(e.clientX, e.clientY, ctx));

    const tgl = el('div', 'lst-toggle'); tgl.setAttribute('role', 'radiogroup'); tgl.setAttribute('aria-label', 'which edges to show');
    const bTap = el('button', 'on', 'my taps'); bTap.type = 'button'; bTap.setAttribute('role', 'radio'); bTap.setAttribute('aria-checked', 'true');
    const bAuto = el('button', '', 'autoplay'); bAuto.type = 'button'; bAuto.setAttribute('role', 'radio'); bAuto.setAttribute('aria-checked', 'false');
    tgl.append(bTap, bAuto); root.appendChild(tgl); this.tgl = tgl; this.bTap = bTap; this.bAuto = bAuto;
    bTap.addEventListener('click', () => this.flip('tap')); bAuto.addEventListener('click', () => this.flip('auto'));
    tgl.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation(); this.flip(this.mode === 'tap' ? 'auto' : 'tap'); (this.mode === 'tap' ? bTap : bAuto).focus();
    });

    this.live = root.appendChild(el('p', 'lst-live')); this.live.setAttribute('aria-live', 'polite');
    this.tag = root.appendChild(el('div', 'lst-tag')); this.tag.hidden = true;
    this.postSlot = root.appendChild(el('div', 'lst-post'));
    this.announce(); this.ready = true;
  },

  buildEdges(list) {
    const n = list.length, x1 = new Float32Array(n), y1 = new Float32Array(n), x2 = new Float32Array(n), y2 = new Float32Array(n), a0 = new Float32Array(n), br = new Uint8Array(n);
    const px = this.px, comm = this.nodeComm;
    for (let k = 0; k < n; k++) {
      const e = list[k], i = e[0], j = e[1], w = e[2];
      x1[k] = px[i * 2]; y1[k] = px[i * 2 + 1]; x2[k] = px[j * 2]; y2[k] = px[j * 2 + 1];
      a0[k] = 0.1 + 0.16 * ((w - 1) / 4);
      br[k] = (comm[i] !== comm[j] && comm[i] !== 'untagged' && comm[j] !== 'untagged') ? 1 : 0;
    }
    return { x1, y1, x2, y2, a0, br, n };
  },

  layoutEdges(ctx) {
    const nodes = this.d.nodes, n = nodes.length, s = ctx.stage();
    this.gh = Math.max(0.6, 1 - 84 / s.h); /* the graph stops above the toggle */
    this.px = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { this.px[i * 2] = s.x + nodes[i].xy[0] * s.w; this.px[i * 2 + 1] = s.y + nodes[i].xy[1] * s.h * this.gh; }
    this.tapPre = this.buildEdges(this.d.tap_edges); this.autoPre = this.buildEdges(this.d.auto_edges);
    this.hit.style.left = s.x + 'px'; this.hit.style.top = s.y + 'px'; this.hit.style.width = s.w + 'px'; this.hit.style.height = s.h + 'px';
    const cx = s.x + s.w / 2, cy = s.y + s.h - 26, tall = innerWidth <= innerHeight * 1.15;
    this.tgl.style.left = cx + 'px'; this.tgl.style.top = cy + 'px';
    this.live.style.left = cx + 'px'; this.live.style.top = (cy - 48) + 'px';
    this.postSlot.style.left = cx + 'px'; this.postSlot.style.top = (tall ? s.y : cy + 42) + 'px';
  },

  announce() { this.live.textContent = this.mode === 'tap' ? 'showing: my taps' : 'showing: autoplay'; },

  flip(mode) {
    if (mode === this.mode || !this.ready) return;
    this.fromPre = this.mode === 'tap' ? this.tapPre : this.autoPre;
    this.fromCol = this.mode === 'tap' ? this.MINT : this.AV;
    this.mode = mode;
    this.bTap.className = mode === 'tap' ? 'on' : ''; this.bTap.setAttribute('aria-checked', String(mode === 'tap'));
    this.bAuto.className = mode === 'auto' ? 'on' : ''; this.bAuto.setAttribute('aria-checked', String(mode === 'auto'));
    this.fadeStart = this.reduced ? null : performance.now();
    this.announce();
  },

  tapAt(x, y, ctx) {
    if (!this.ready) return;
    const px = this.px, n = this.d.nodes.length; let best = -1, bd = 28 * 28;
    for (let i = 0; i < n; i++) { const dx = px[i * 2] - x, dy = px[i * 2 + 1] - y, dist = dx * dx + dy * dy; if (dist < bd) { bd = dist; best = i; } }
    if (best < 0) return;
    const name = this.d.nodes[best].name;
    this.tag.hidden = false; this.tag.textContent = name; this.tag.style.left = px[best * 2] + 'px'; this.tag.style.top = (px[best * 2 + 1] - 16) + 'px';
    stopAll(ctx); this.postSlot.textContent = ''; post(this.postSlot, name, ctx, { label: 'hear' });
  },

  enter(ctx) {
    const P = ctx.particles; this.reduced = ctx.reduced;
    P.ease = 0.05; P.jitter = 0.5; P.big = false;
    if (!this.ready) { P.scatter(); P.color(() => 0x6b5a86); return; }
    const nodeColor = this.nodeColor, nodes = this.d.nodes, n = nodes.length;
    const gh = this.gh = Math.max(0.6, 1 - 84 / ctx.stage().h);
    P.target((i) => { const nd = nodes[P.artist[i] % n]; const r = Math.sqrt(ctx.hash(i)) * (0.008 + nd.plays_bucket * 0.009), a = ctx.hash(i * 97 + 13) * 6.283; return [clamp(nd.xy[0] + Math.cos(a) * r, 0, 1), clamp(nd.xy[1] + Math.sin(a) * r, 0, 1) * gh]; });
    P.color((i) => nodeColor[P.artist[i] % n]);
    this.layoutEdges(ctx);
  },

  leave(ctx) { stopAll(ctx); if (this.tag) this.tag.hidden = true; },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    let p = 1; if (this.fadeStart != null) p = clamp((t - this.fadeStart) / 900, 0, 1);
    const subK = 1 + (bands.low - 0.5) * 0.1, hi = bands.high * 0.15;
    const draw = (pre, mul, col) => {
      if (!pre || mul <= 0.01) return;
      const { x1, y1, x2, y2, a0, br, n } = pre;
      for (let k = 0; k < n; k++) {
        const a = Math.min(1, a0[k] * mul * subK + (br[k] ? hi : 0));
        if (a <= 0.01) continue;
        g.globalAlpha = a; g.strokeStyle = br[k] ? css(col, 1) : css(this.DIM, 1); g.lineWidth = br[k] ? 2.2 : 1;
        g.beginPath(); g.moveTo(x1[k], y1[k]); g.lineTo(x2[k], y2[k]); g.stroke();
      }
    };
    const curPre = this.mode === 'tap' ? this.tapPre : this.autoPre, curCol = this.mode === 'tap' ? this.MINT : this.AV;
    if (p < 1) { draw(this.fromPre, 1 - p, this.fromCol); draw(curPre, p, curCol); } else draw(curPre, 1, curCol);
    g.globalAlpha = 1;
  },
};
