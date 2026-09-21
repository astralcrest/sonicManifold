/* room 4 — two listeners. same 120 artists as the map; edges by who queued the next song. flip the
   toggle, edges cross-fade, nodes hold still. a bridge joins two different scenes. tap a node to hear it.
   keyboard path: Tab past the toggle reaches a hidden listbox of all 120 artists (source: exhibit/data/twolisteners.json
   nodes[].plays_bucket/name) — arrow keys move a ring over the cluster on the overlay + the name tag, Enter pins it. */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const css = (c, a) => 'rgba(' + c + ',' + a + ')';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const CUE_TEXT = 'the bright lines are jumps between scenes. flip to autoplay and watch them thin';

const CSS = `
section[data-room="listeners"] .lst-cav{font:400 11px/1.55 var(--mono);color:var(--mute);opacity:.72;margin:6px 0 0;max-width:32rem}
section[data-room="listeners"] .lst-fine summary{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);cursor:pointer;padding:12px 0 6px;width:max-content}
section[data-room="listeners"] .lst-fine summary:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
section[data-room="listeners"] .lst-hit{position:absolute}
section[data-room="listeners"] .lst-toggle{position:absolute;transform:translate(-50%,-50%);display:flex;gap:6px;background:rgba(10,1,24,.6);border:1px solid var(--line);border-radius:999px;padding:5px}
section[data-room="listeners"] .lst-toggle button{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);background:none;border:0;border-radius:999px;padding:13px 16px;min-height:44px;cursor:pointer;white-space:nowrap}
section[data-room="listeners"] .lst-toggle button.on{color:#06130f;background:linear-gradient(100deg,var(--mint),#62e7ff)}
section[data-room="listeners"] .lst-toggle button:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
section[data-room="listeners"] .lst-live{position:absolute;transform:translate(-50%,-50%);font:600 10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);opacity:.75;white-space:nowrap}
section[data-room="listeners"] .lst-tag{position:absolute;transform:translate(-50%,-100%);font:600 11px/1 var(--mono);color:var(--ink);background:rgba(10,1,24,.75);border:1px solid var(--line);border-radius:6px;padding:4px 8px;pointer-events:none;white-space:nowrap}
section[data-room="listeners"] .lst-post{position:absolute;transform:translateX(-50%);width:min(320px,80vw)}
section[data-room="listeners"] .lst-listbox{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
section[data-room="listeners"] .lst-cue{position:absolute;transform:translate(-50%,-100%);font:600 11px/1.4 var(--mono);color:var(--mint2);background:rgba(10,1,24,.78);border:1px solid rgba(125,240,200,.25);border-radius:999px;padding:7px 14px;max-width:min(30rem,80vw);margin:0;text-align:center;pointer-events:none;transition:opacity .4s ease}
section[data-room="listeners"] .lst-bars{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;gap:3px;font:600 9px/1 var(--mono);color:var(--mute);pointer-events:none}
section[data-room="listeners"] .lst-bar-row{display:flex;align-items:center;gap:6px;white-space:nowrap}
section[data-room="listeners"] .lst-bar-lb{width:34px;text-transform:uppercase;letter-spacing:.06em;text-align:right}
section[data-room="listeners"] .lst-bar-track{width:60px;height:4px;background:rgba(200,190,220,.2);border-radius:2px;overflow:hidden}
section[data-room="listeners"] .lst-bar-fill{display:block;height:100%;border-radius:2px}
section[data-room="listeners"] .lst-bar-val{width:24px}
`;

export default {
  id: 'listeners', track: 'dorian-manifold',
  ready: false, mode: 'tap', fadeStart: null,

  async mount(root, ctx) {
    document.head.appendChild(el('style')).textContent = CSS;
    await ctx.identity();
    this.root = root;
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
    /* keyboard listbox order: most-played first, then name — same 120 artists as the cloud, no new data */
    this.order = nodes.map((_, i) => i).sort((a, b) => (nodes[b].plays_bucket - nodes[a].plays_bucket) || nodes[a].name.localeCompare(nodes[b].name));

    const tap = Math.round(d.full_transition_crossing.tap * 100), auto = Math.round(d.full_transition_crossing.auto * 100);
    this.tapPct = tap; this.autoPct = auto;
    extra.appendChild(el('p', 'say dim short-hide', 'the bridges are the edges that join two different scenes.'));
    extra.appendChild(el('p', 'say', n + ' artists, drawn twice. of every 100 jumps to a different artist, mine cross scenes about ' + tap + ' times, autoplay’s about ' + auto + '.'));
    extra.appendChild(el('p', 'lst-cav', 'this is a direction, not a size.'));
    const fine = extra.appendChild(el('details', 'lst-fine')); fine.appendChild(el('summary', '', 'why not a size'));
    ['a third to two fifths of my jumps carry no public genre tag, and reasonable ways of handling them put the number anywhere from 1.00 to 1.13.', 'the picture is my two habits, not the measurement: the drawn graph keeps only the busiest artists.'].forEach((t) => fine.appendChild(el('p', 'lst-cav', t)));
    fine.open = innerWidth > innerHeight * 1.15 && innerHeight >= 480; /* closed on phones in either orientation */
    fine.addEventListener('toggle', () => { if (this.ready && root.parentElement.classList.contains('is-active')) this.enter(ctx); });

    this.hit = root.appendChild(el('div', 'lst-hit'));
    this.hit.setAttribute('aria-hidden', 'true'); /* pointer-only decoration; the listbox below is the real control */
    this.hit.addEventListener('click', (e) => this.tapAt(e.clientX, e.clientY, ctx));
    this.hit.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.hoverAt(e.clientX, e.clientY); });

    const tgl = el('div', 'lst-toggle'); tgl.setAttribute('role', 'radiogroup'); tgl.setAttribute('aria-label', 'which edges to show');
    const bTap = el('button', 'on', 'my taps'); bTap.type = 'button'; bTap.setAttribute('role', 'radio'); bTap.setAttribute('aria-checked', 'true'); bTap.tabIndex = 0;
    const bAuto = el('button', '', 'autoplay'); bAuto.type = 'button'; bAuto.setAttribute('role', 'radio'); bAuto.setAttribute('aria-checked', 'false'); bAuto.tabIndex = -1;
    tgl.append(bTap, bAuto); root.appendChild(tgl); this.tgl = tgl; this.bTap = bTap; this.bAuto = bAuto;
    bTap.addEventListener('click', () => this.flip('tap', ctx)); bAuto.addEventListener('click', () => this.flip('auto', ctx));
    tgl.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation(); this.flip(this.mode === 'tap' ? 'auto' : 'tap', ctx); (this.mode === 'tap' ? bTap : bAuto).focus();
    });

    /* keyboard + screen-reader path onto the artist cloud: a visually-hidden, focusable listbox right after the toggle in tab order */
    const listbox = el('div', 'lst-listbox'); listbox.tabIndex = 0; listbox.setAttribute('role', 'listbox');
    listbox.setAttribute('aria-label', n + ' artists, most played first');
    this.order.forEach((ni, oi) => {
      const opt = el('div', '', nodes[ni].name); opt.id = 'lst-opt-' + oi; opt.setAttribute('role', 'option'); opt.setAttribute('aria-selected', 'false');
      listbox.appendChild(opt);
    });
    root.appendChild(listbox); this.listbox = listbox; this.lbIndex = null;
    listbox.addEventListener('focus', () => { if (this.lbIndex == null) this.setListboxFocus(0, ctx); });
    listbox.addEventListener('blur', () => { this.kbFocusIdx = null; if (!this.pinned) this.tag.hidden = true; });
    listbox.addEventListener('keydown', (e) => {
      const total = this.order.length; let idx = this.lbIndex == null ? 0 : this.lbIndex;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this.selectNode(this.order[idx], ctx); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') idx = Math.min(total - 1, idx + 1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') idx = Math.max(0, idx - 1);
      else if (e.key === 'Home') idx = 0;
      else if (e.key === 'End') idx = total - 1;
      else return;
      e.preventDefault(); e.stopPropagation(); this.setListboxFocus(idx, ctx);
    });

    this.live = root.appendChild(el('p', 'lst-live')); this.live.setAttribute('aria-live', 'polite');
    this.tag = root.appendChild(el('div', 'lst-tag')); this.tag.hidden = true;
    this.cue = root.appendChild(el('p', 'lst-cue', CUE_TEXT)); this.cue.hidden = true; this.cue.setAttribute('aria-hidden', 'true'); /* decorative echo of the always-present prose above */
    this.bars = root.appendChild(el('div', 'lst-bars')); this.bars.hidden = true; this.bars.setAttribute('aria-hidden', 'true'); /* the same two numbers are already in the sentence above, in words */
    const rowTap = el('div', 'lst-bar-row'), rowAuto = el('div', 'lst-bar-row');
    rowTap.append(el('span', 'lst-bar-lb', 'taps'), el('span', 'lst-bar-track'), el('span', 'lst-bar-val', '~' + tap));
    rowAuto.append(el('span', 'lst-bar-lb', 'auto'), el('span', 'lst-bar-track'), el('span', 'lst-bar-val', '~' + auto));
    this.tapFill = el('span', 'lst-bar-fill'); this.tapFill.style.width = tap + '%'; this.tapFill.style.background = 'rgb(' + this.MINT + ')';
    this.autoFill = el('span', 'lst-bar-fill'); this.autoFill.style.width = auto + '%'; this.autoFill.style.background = 'rgb(' + this.AV + ')';
    rowTap.querySelector('.lst-bar-track').appendChild(this.tapFill); rowAuto.querySelector('.lst-bar-track').appendChild(this.autoFill);
    this.bars.append(rowTap, rowAuto);
    this.postSlot = root.appendChild(el('div', 'lst-post'));

    root.addEventListener('pointerdown', () => this.hideCue(), { once: true });
    root.addEventListener('keydown', () => this.hideCue(), { once: true });

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
    this.clusterR = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.px[i * 2] = s.x + nodes[i].xy[0] * s.w; this.px[i * 2 + 1] = s.y + nodes[i].xy[1] * s.h * this.gh;
      this.clusterR[i] = clamp((0.008 + nodes[i].plays_bucket * 0.009) * s.w, 14, 60);
    }
    this.tapPre = this.buildEdges(this.d.tap_edges); this.autoPre = this.buildEdges(this.d.auto_edges);
    this.hit.style.left = s.x + 'px'; this.hit.style.top = s.y + 'px'; this.hit.style.width = s.w + 'px'; this.hit.style.height = s.h + 'px';
    const cx = s.x + s.w / 2, cy = s.y + s.h - 26, tall = innerWidth <= innerHeight * 1.15;
    this.tgl.style.left = cx + 'px'; this.tgl.style.top = cy + 'px';
    /* the listbox is clipped to 1px (visually hidden) but must sit at a real on-screen point — an unset/auto
       position here makes focus-follows-scrollIntoView jump the whole page to wherever "auto" resolved to */
    this.listbox.style.left = cx + 'px'; this.listbox.style.top = cy + 'px';
    this.live.style.left = cx + 'px'; this.live.style.top = (cy - 48) + 'px';
    const cueTop = cy - 82;
    this.cue.style.left = cx + 'px'; this.cue.style.top = cueTop + 'px'; this.cue.style.maxWidth = Math.max(140, Math.min(320, s.w - 24)) + 'px';
    this.bars.style.left = cx + 'px'; this.bars.style.top = cueTop + 'px';
    this.postSlot.style.left = cx + 'px'; this.postSlot.style.top = (tall ? s.y : cy + 42) + 'px';
  },

  announce() { this.live.textContent = this.mode === 'tap' ? 'showing: my taps' : 'showing: autoplay'; },

  flip(mode, ctx) {
    if (mode === this.mode || !this.ready) return;
    this.fromPre = this.mode === 'tap' ? this.tapPre : this.autoPre;
    this.fromCol = this.mode === 'tap' ? this.MINT : this.AV;
    this.mode = mode;
    this.bTap.className = mode === 'tap' ? 'on' : ''; this.bTap.setAttribute('aria-checked', String(mode === 'tap')); this.bTap.tabIndex = mode === 'tap' ? 0 : -1;
    this.bAuto.className = mode === 'auto' ? 'on' : ''; this.bAuto.setAttribute('aria-checked', String(mode === 'auto')); this.bAuto.tabIndex = mode === 'auto' ? 0 : -1;
    this.fadeStart = this.reduced ? null : performance.now();
    if (ctx && ctx.audio) ctx.audio.note(mode === 'tap' ? 6 : 1, { dur: 0.4, vol: 0.06 }); /* taps = higher, autoplay = lower */
    if (!this.barsShown) { this.barsShown = true; this.bars.hidden = false; }
    this.announce();
  },

  showTag(i) {
    const px = this.px; this.tag.hidden = false; this.tag.textContent = this.d.nodes[i].name;
    this.tag.style.left = px[i * 2] + 'px'; this.tag.style.top = (px[i * 2 + 1] - 16) + 'px';
  },

  selectNode(i, ctx, opts = {}) {
    this.pinned = true; this.kbFocusIdx = i;
    if (opts.note !== false) ctx.audio.note(1 + (i % 5), { dur: 0.5, vol: 0.05 });
    this.showTag(i);
    if (this.lbIndex != null) { const cur = this.listbox.children[this.lbIndex]; if (cur) cur.setAttribute('aria-selected', 'false'); }
    const oi = this.order.indexOf(i);
    if (oi >= 0) { this.lbIndex = oi; const opt = this.listbox.children[oi]; if (opt) { opt.setAttribute('aria-selected', 'true'); this.listbox.setAttribute('aria-activedescendant', opt.id); } }
    if (opts.loadPost !== false) { ctx.stopPosts(); this.postSlot.textContent = ''; ctx.post(this.postSlot, this.d.nodes[i].name, { label: 'hear' }); }
  },

  setListboxFocus(idx, ctx) {
    if (this.lbIndex != null) { const prev = this.listbox.children[this.lbIndex]; if (prev) prev.setAttribute('aria-selected', 'false'); }
    this.lbIndex = idx;
    const opt = this.listbox.children[idx]; if (opt) { opt.setAttribute('aria-selected', 'true'); this.listbox.setAttribute('aria-activedescendant', opt.id); }
    const ni = this.order[idx]; this.kbFocusIdx = ni; this.showTag(ni);
  },

  showCue() { if (this.cue && !this.interacted) this.cue.hidden = false; },
  hideCue() { this.interacted = true; if (this.cue && !this.cue.hidden) this.cue.hidden = true; this.pulseSet = null; },

  showIntro() {
    if (!this.root || !this.root.parentElement.classList.contains('is-active') || this.interacted) return;
    const pre = this.tapPre;
    if (pre) {
      const cand = []; for (let k = 0; k < pre.n; k++) if (pre.br[k]) cand.push(k);
      cand.sort((a, b) => pre.a0[b] - pre.a0[a]);
      this.pulseSet = new Set(cand.slice(0, 4)); this.pulseStart = performance.now();
    }
    this.showCue();
  },

  hoverAt(x, y) {
    if (!this.ready || this.pinned) return;
    const px = this.px, n = this.d.nodes.length; let best = -1, bd = 24 * 24;
    for (let i = 0; i < n; i++) { const dx = px[i * 2] - x, dy = px[i * 2 + 1] - y, dist = dx * dx + dy * dy; if (dist < bd) { bd = dist; best = i; } }
    this.tag.hidden = best < 0; this.hit.style.cursor = best < 0 ? '' : 'pointer';
    if (best >= 0) { this.tag.textContent = this.d.nodes[best].name; this.tag.style.left = px[best * 2] + 'px'; this.tag.style.top = (px[best * 2 + 1] - 16) + 'px'; }
  },
  tapAt(x, y, ctx) {
    if (!this.ready) return;
    const px = this.px, n = this.d.nodes.length; let best = -1, bd = 28 * 28;
    for (let i = 0; i < n; i++) { const dx = px[i * 2] - x, dy = px[i * 2 + 1] - y, dist = dx * dx + dy * dy; if (dist < bd) { bd = dist; best = i; } }
    if (best < 0) { this.pinned = false; this.kbFocusIdx = null; return; }
    this.selectNode(best, ctx);
  },

  enter(ctx) {
    const P = ctx.particles; this.reduced = ctx.reduced;
    P.ease = 0.05; P.jitter = 0.5; P.big = false; P.touch = false; /* here the pointer names artists; it should not scatter them */
    if (!this.ready) { P.scatter(); P.color(() => 0x6b5a86); return; }
    const nodeColor = this.nodeColor, nodes = this.d.nodes, n = nodes.length;
    const gh = this.gh = Math.max(0.6, 1 - 84 / ctx.stage().h);
    P.target((i) => { const nd = nodes[P.artist[i] % n]; const r = Math.sqrt(ctx.hash(i)) * (0.008 + nd.plays_bucket * 0.009), a = ctx.hash(i * 97 + 13) * 6.283; return [clamp(nd.xy[0] + Math.cos(a) * r, 0, 1), clamp(nd.xy[1] + Math.sin(a) * r, 0, 1) * gh]; });
    P.color((i) => nodeColor[P.artist[i] % n]);
    this.layoutEdges(ctx);
    if (!this.introShown) { /* first-time visitor: the core interaction (tap/keyboard-select a node) is otherwise undiscoverable */
      this.introShown = true;
      if (this.reduced) this.showCue();
      else { clearTimeout(this._introT); const root = this.root; this._introT = setTimeout(() => this.showIntro(), 1400); }
    }
  },

  leave(ctx) { ctx.stopPosts(); if (this.tag) this.tag.hidden = true; if (this._demoT) { this._demoT.forEach(clearTimeout); this._demoT = null; } },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    let p = 1; if (this.fadeStart != null) p = clamp((t - this.fadeStart) / 900, 0, 1);
    const subK = 1 + (bands.low - 0.5) * 0.1, hi = bands.high * 0.15;
    let pulse = null;
    if (this.pulseSet && this.mode === 'tap') {
      const pt = (t - this.pulseStart) / 1600;
      if (pt >= 1) this.pulseSet = null; else pulse = { set: this.pulseSet, k: Math.sin(clamp(pt, 0, 1) * Math.PI) * 0.55 };
    }
    const draw = (pre, mul, col, pl) => {
      if (!pre || mul <= 0.01) return;
      const { x1, y1, x2, y2, a0, br, n } = pre;
      for (let k = 0; k < n; k++) {
        let a = Math.min(1, a0[k] * mul * subK + (br[k] ? hi : 0));
        if (pl && pl.set.has(k)) a = Math.min(1, a + pl.k);
        if (a <= 0.01) continue;
        g.globalAlpha = a; g.strokeStyle = br[k] ? css(col, 1) : css(this.DIM, 1); g.lineWidth = br[k] ? 2.2 : 1;
        g.beginPath(); g.moveTo(x1[k], y1[k]); g.lineTo(x2[k], y2[k]); g.stroke();
      }
    };
    const curPre = this.mode === 'tap' ? this.tapPre : this.autoPre, curCol = this.mode === 'tap' ? this.MINT : this.AV;
    if (p < 1) { draw(this.fromPre, 1 - p, this.fromCol, null); draw(curPre, p, curCol, pulse); } else draw(curPre, 1, curCol, pulse);
    if (this.kbFocusIdx != null && this.px) {
      const i = this.kbFocusIdx, px = this.px, base = this.clusterR ? this.clusterR[i] : 20, r = base + (this.reduced ? 0 : Math.sin(t * 0.005) * 2);
      g.globalAlpha = 0.85; g.strokeStyle = 'rgb(' + this.MINT + ')'; g.lineWidth = 2;
      g.beginPath(); g.arc(px[i * 2], px[i * 2 + 1], Math.max(10, r), 0, 6.283); g.stroke();
    }
    g.globalAlpha = 1;
  },

  /* kiosk mode, unattended: perform the room's own story so a passer-by sees the finding without touching anything */
  demo(ctx) {
    if (!this.ready || !this.root) return;
    const still = () => this.root.parentElement.classList.contains('is-active');
    const t1 = setTimeout(() => { if (still() && this.mode === 'tap') this.flip('auto', ctx); }, 4000);
    const t2 = setTimeout(() => { if (still() && this.mode === 'auto') this.flip('tap', ctx); }, 10000);
    const t3 = setTimeout(() => {
      if (!still()) return;
      const nodes = this.d.nodes; let best = -1;
      for (let k = 0; k < this.order.length; k++) { const ni = this.order[k]; if (nodes[ni].community !== 'untagged') { best = ni; break; } }
      if (best >= 0) this.selectNode(best, ctx, { loadPost: false });
    }, 10800);
    this._demoT = [t1, t2, t3];
  },
};
