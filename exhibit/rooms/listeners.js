/* room 4 — two listeners. same 120 artists as the map; edges by who queued the next song. flip the
   toggle, edges cross-fade, nodes hold still. a bridge joins two different scenes. tap a node to hear it.
   keyboard path: Tab past the toggle reaches a hidden listbox of all 120 artists (source: exhibit/data/twolisteners.json
   nodes[].plays_bucket/name) — arrow keys move a ring over the cluster on the overlay + the name tag, Enter pins it. */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const css = (c, a) => 'rgba(' + c + ',' + a + ')';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const CUE_TEXT = 'the bright lines are jumps between scenes. flip between my taps and autoplay';

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
/* on the shortest stages the open listening post reaches this line: clip it out of sight but keep it announced */
section[data-room="listeners"] .lst-live.clip{width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
section[data-room="listeners"] .lst-tag{position:absolute;transform:translate(-50%,-100%);font:600 11px/1 var(--mono);color:var(--ink);background:rgba(10,1,24,.75);border:1px solid var(--line);border-radius:6px;padding:4px 8px;pointer-events:none;white-space:nowrap}
section[data-room="listeners"] .lst-tag.below{transform:translate(-50%,0)}
/* the listening post sits alone at the top of the stage, on its own ground: the graph runs under it */
section[data-room="listeners"] .lst-post{position:absolute;transform:translateX(-50%);width:min(340px,calc(100vw - 30px));background:rgba(10,1,24,.86);border:1px solid var(--line);border-radius:14px;padding:6px 12px 10px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
section[data-room="listeners"] .lst-post:empty{display:none}
section[data-room="listeners"] .lst-listbox{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
section[data-room="listeners"] .lst-cue{position:absolute;transform:translate(-50%,-100%);font:600 11px/1.4 var(--mono);color:var(--mint2);background:rgba(10,1,24,.78);border:1px solid rgba(125,240,200,.25);border-radius:999px;padding:7px 14px;max-width:min(30rem,80vw);margin:0;text-align:center;pointer-events:none;transition:opacity .4s ease}
/* the rate readout: two rows of a hundred dots, in the reading column where the claim is, always visible */
section[data-room="listeners"] .lst-strip{margin:14px 0 12px;max-width:30rem}
section[data-room="listeners"] .lst-strip-h{font:600 10px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--mute);margin:0 0 9px}
section[data-room="listeners"] .lst-line{display:flex;align-items:baseline;gap:7px;font:600 11.5px/1.4 var(--mono);color:var(--ink);margin:0 0 4px}
section[data-room="listeners"] .lst-line .lst-k{font-weight:400;color:var(--mute)}
section[data-room="listeners"] .lst-line .lst-v{margin-left:auto;font-size:13px}
section[data-room="listeners"] .lst-dots{display:grid;grid-template-columns:repeat(50,1fr);gap:1.4px;margin:0 0 11px}
section[data-room="listeners"] .lst-dots i{display:block;aspect-ratio:1;min-height:3px;border-radius:1px;background:rgba(200,190,220,.16)}
section[data-room="listeners"] .lst-dots i.on{background:var(--c)}
section[data-room="listeners"] .lst-post .post{margin:4px 0 0}
section[data-room="listeners"] .lst-post .post-note{font-size:10.5px;line-height:1.45;margin-top:7px}
/* phones: the readout keeps all 200 dots and both counts, on less paper, so the picture keeps its height */
@media (max-width:640px){section[data-room="listeners"] .lst-wide-only{display:none}section[data-room="listeners"] .lst-why{font-size:14px;line-height:1.38}section[data-room="listeners"] .lst-strip{margin:10px 0 8px}section[data-room="listeners"] .lst-strip-h{margin-bottom:6px}section[data-room="listeners"] .lst-line{margin-bottom:2px}section[data-room="listeners"] .lst-dots{gap:1.2px;margin-bottom:8px}section[data-room="listeners"] .lst-dots i{aspect-ratio:auto;height:5px}}
@media (max-height:720px){section[data-room="listeners"] .lst-why{font-size:12.5px;line-height:1.38}section[data-room="listeners"] .lst-strip{margin:8px 0 6px}section[data-room="listeners"] .lst-strip-h{font-size:9.5px;margin-bottom:5px}section[data-room="listeners"] .lst-line{font-size:10.5px;margin-bottom:2px}section[data-room="listeners"] .lst-line .lst-v{font-size:12px}section[data-room="listeners"] .lst-dots{gap:1.1px;margin-bottom:7px}section[data-room="listeners"] .lst-dots i{aspect-ratio:auto;height:4px}section[data-room="listeners"] .lst-post{padding:5px 10px 8px}section[data-room="listeners"] .lst-post .post-note{font-size:9.5px;margin-top:6px}}
/* a phone held sideways: the reading column is ~190px wide and 270px tall, so every line of it is rationed */
@media (max-height:480px) and (min-aspect-ratio:115/100){section[data-room="listeners"] .lst-strip{margin:6px 0 4px}section[data-room="listeners"] .lst-strip-h{font-size:8.5px;letter-spacing:.12em;margin-bottom:4px}section[data-room="listeners"] .lst-line{font-size:9.5px;margin-bottom:2px}section[data-room="listeners"] .lst-line .lst-v{font-size:11px}section[data-room="listeners"] .lst-dots{gap:1px;margin-bottom:6px}section[data-room="listeners"] .lst-dots i{height:3px}section[data-room="listeners"] .lst-why{font-size:11px;line-height:1.32}section[data-room="listeners"] .lst-cav{font-size:10px;line-height:1.42;margin-top:4px}section[data-room="listeners"] .lst-fine summary{padding:7px 0 4px}}
`;
const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

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

    const fx = d.full_transition_crossing;
    const tap = Math.round(fx.tap * 100), auto = Math.round(fx.auto * 100), nTap = fx.n_tap, nAuto = fx.n_auto;
    this.tapPct = tap; this.autoPct = auto;
    extra.appendChild(el('p', 'say dim short-hide lst-wide-only', 'the bridges are the edges that join two different scenes.'));
    /* the rate, in the exhibit's own material: a hundred dots per listener, filled to the crossing rate,
       with the raw jump counts beside them. the drawn picture is counts; this is what the number compares. */
    const strip = el('div', 'lst-strip');
    strip.setAttribute('role', 'img');
    strip.setAttribute('aria-label', 'of every 100 jumps to a new artist, mine cross between scenes about ' + tap + ' times and autoplay’s about ' + auto + '. i made ' + fmt(nTap) + ' of those jumps in seven years, autoplay made ' + fmt(nAuto) + '. autoplay drew more lines because it made about five times as many jumps. the rate is what the number compares.');
    strip.appendChild(el('p', 'lst-strip-h', 'of every 100 jumps to a new artist'));
    const strRow = (who, jumps, pct, colour) => {
      const line = el('div', 'lst-line');
      line.append(el('span', '', who), el('span', 'lst-k', '· ' + fmt(jumps) + ' jumps'), el('span', 'lst-v', String(pct)));
      const dots = el('div', 'lst-dots'); dots.style.setProperty('--c', colour);
      const frag = document.createDocumentFragment();
      for (let q = 0; q < 100; q++) frag.appendChild(el('i', q < pct ? 'on' : ''));
      dots.appendChild(frag); strip.append(line, dots);
    };
    strRow('my taps', nTap, tap, 'rgb(' + this.MINT + ')');
    strRow('autoplay', nAuto, auto, 'rgb(' + this.AV + ')');
    extra.appendChild(strip);
    extra.appendChild(el('p', 'say lst-why', 'autoplay drew more lines because it made about five times as many jumps. the rate is what the number compares.'));
    extra.appendChild(el('p', 'lst-cav', 'this is a direction, not a size.'));
    const fine = extra.appendChild(el('details', 'lst-fine')); fine.appendChild(el('summary', '', 'why not a size'));
    ['a third to two fifths of my jumps carry no public genre tag, and reasonable ways of handling them put the number anywhere from 1.00 to 1.13.', 'the drawn graph keeps only the busiest ' + n + ' artists and their strongest edges, so it is a picture of my two habits, not the measurement.'].forEach((t) => fine.appendChild(el('p', 'lst-cav', t)));
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
    this.postSlot = root.appendChild(el('div', 'lst-post'));
    /* the post changes height when the player replaces the button: re-check what it now covers */
    if (window.ResizeObserver) new ResizeObserver(() => { this.postRect = null; this.fitLive(); if (this.kbFocusIdx != null) this.showTag(this.kbFocusIdx); }).observe(this.postSlot);

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
    const cx = s.x + s.w / 2, cy = s.y + s.h - 26;
    this.sx = s.x; this.sy = s.y; this.sw = s.w;
    this.tgl.style.left = cx + 'px'; this.tgl.style.top = cy + 'px';
    /* the listbox is clipped to 1px (visually hidden) but must sit at a real on-screen point — an unset/auto
       position here makes focus-follows-scrollIntoView jump the whole page to wherever "auto" resolved to */
    this.listbox.style.left = cx + 'px'; this.listbox.style.top = cy + 'px';
    this.live.style.left = cx + 'px'; this.live.style.top = (cy - 44) + 'px'; this.liveTop = cy - 49;
    const cueTop = cy - 82;
    this.cue.style.left = cx + 'px'; this.cue.style.top = cueTop + 'px'; this.cue.style.maxWidth = Math.max(140, Math.min(320, s.w - 24)) + 'px';
    /* the post lives at the top of the stage in both orientations: below the toggle it fell off the
       bottom of the screen on desktop, and pinned to the tapped node it landed on the name tag on phones */
    this.postSlot.style.left = cx + 'px'; this.postSlot.style.top = (s.y + 2) + 'px';
    this.postRect = null; this.fitLive();
    if (this.kbFocusIdx != null) this.showTag(this.kbFocusIdx);
  },

  fitLive() {
    if (!this.postSlot.firstChild) { this.live.classList.remove('clip'); return; }
    if (!this.postRect) this.postRect = this.postSlot.getBoundingClientRect();
    this.live.classList.toggle('clip', this.postRect.bottom > this.liveTop - 4);
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
    this.announce();
  },

  showTag(i) {
    this.tag.textContent = this.d.nodes[i].name;
    this.placeTag(this.px[i * 2], this.px[i * 2 + 1]);
  },

  /* put the name tag on the node, flipping it under the node rather than off the top of the stage,
     and yield to the listening post when the two would land on each other: the ring still marks the node */
  placeTag(x, y) {
    const t = this.tag, below = (y - 42) < (this.sy || 0);
    t.hidden = false; t.classList.toggle('below', below);
    t.style.left = x + 'px'; t.style.top = (below ? y + 18 : y - 16) + 'px';
    if (!this.postSlot.firstChild) return;
    const a = t.getBoundingClientRect(), b = this.postRect = this.postSlot.getBoundingClientRect();
    if (a.right > b.left + 1 && a.left < b.right - 1 && a.bottom > b.top + 1 && a.top < b.bottom - 1) t.hidden = true;
  },

  selectNode(i, ctx, opts = {}) {
    this.pinned = true; this.kbFocusIdx = i;
    if (opts.note !== false) ctx.audio.note(1 + (i % 5), { dur: 0.5, vol: 0.05 });
    this.showTag(i);
    if (this.lbIndex != null) { const cur = this.listbox.children[this.lbIndex]; if (cur) cur.setAttribute('aria-selected', 'false'); }
    const oi = this.order.indexOf(i);
    if (oi >= 0) { this.lbIndex = oi; const opt = this.listbox.children[oi]; if (opt) { opt.setAttribute('aria-selected', 'true'); this.listbox.setAttribute('aria-activedescendant', opt.id); } }
    if (opts.loadPost !== false) {
      ctx.stopPosts(); this.postSlot.textContent = ''; ctx.post(this.postSlot, this.d.nodes[i].name, { label: 'hear' });
      this.postRect = this.postSlot.getBoundingClientRect(); this.fitLive(); this.placeTag(this.px[i * 2], this.px[i * 2 + 1]);
    }
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
    this.hit.style.cursor = best < 0 ? '' : 'pointer';
    if (best < 0) { this.tag.hidden = true; return; }
    this.showTag(best);
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

  leave(ctx) { ctx.stopPosts(); if (this.tag) this.tag.hidden = true; this.stopDemo(); },

  /* a real hand arrived: the kiosk sequence stops walking the toggle */
  stopDemo() { if (this._demoT) { this._demoT.forEach(clearTimeout); this._demoT = null; } },

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
