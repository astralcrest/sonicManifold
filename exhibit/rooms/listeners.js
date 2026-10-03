/* room 4 — two listeners. same 120 artists as the map; edges by who queued the next song. flip the
   toggle, edges cross-fade, nodes hold still. a bridge joins two different scenes. tap a node to hear it.
   keyboard path: Tab past the toggle reaches a hidden listbox of all 120 artists (source: exhibit/data/twolisteners.json
   nodes[].plays_bucket/name) — arrow keys move a ring over the cluster on the overlay + the name tag, Enter pins it. */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const css = (c, a) => 'rgba(' + c + ',' + a + ')';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const CUE_TEXT = 'the bright lines are jumps between scenes. flip between my taps and autoplay';
const CUE_TEXT_S = 'the bright lines are jumps between scenes'; /* a narrow stage: the toggle right under it says the rest */

const CSS = `
section[data-room="listeners"] .lst-cav{font:400 12px/1.55 var(--mono);color:var(--mute);margin:6px 0 0;max-width:32rem}
section[data-room="listeners"] .lst-fine summary{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);cursor:pointer;padding:12px 0 6px;width:max-content}
section[data-room="listeners"] .lst-fine summary:focus-visible{outline:2px solid var(--ice);outline-offset:3px}
/* the two disclosures share one row while closed; an open one takes the full width */
section[data-room="listeners"] .lst-fines{display:flex;flex-wrap:wrap;column-gap:22px}
section[data-room="listeners"] .lst-fines details[open]{flex:0 0 100%}
section[data-room="listeners"] .lst-fine .legend{margin:8px 0 0}
section[data-room="listeners"] .lst-hit{position:absolute}
section[data-room="listeners"] .lst-toggle{position:absolute;transform:translate(-50%,-50%);display:flex;gap:6px;background:rgba(10,1,24,.6);border:1px solid var(--line);border-radius:999px;padding:5px}
section[data-room="listeners"] .lst-toggle button{display:flex;align-items:center;gap:8px;font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);background:none;border:0;border-radius:999px;padding:13px 16px;min-height:44px;cursor:pointer;white-space:nowrap}
/* each button carries the line colour it draws, so the toggle is the edge legend */
section[data-room="listeners"] .lst-toggle .lst-sw{display:block;width:14px;height:3px;border-radius:2px;flex:none}
section[data-room="listeners"] .lst-toggle button.on{color:var(--ink);background:rgba(134,203,254,.16);box-shadow:inset 0 0 0 1px var(--ice)}
section[data-room="listeners"] .lst-toggle button:focus-visible{outline:2px solid var(--ice);outline-offset:3px}
section[data-room="listeners"] .lst-live{position:absolute;transform:translate(-50%,-50%);font:600 12px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute);white-space:nowrap}
/* on the shortest stages the open listening post reaches this line: clip it out of sight but keep it announced */
section[data-room="listeners"] .lst-live.clip{width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
section[data-room="listeners"] .lst-tag{position:absolute;transform:translate(-50%,-100%);font:600 11px/1 var(--mono);color:var(--ink);background:rgba(10,1,24,.75);border:1px solid var(--line);border-radius:6px;padding:4px 8px;pointer-events:none;white-space:nowrap}
section[data-room="listeners"] .lst-tag.below{transform:translate(-50%,0)}
/* the listening post sits alone at the top of the stage, on its own ground: the graph runs under it */
section[data-room="listeners"] .lst-post{position:absolute;transform:translateX(-50%);width:min(340px,calc(100vw - 30px));background:rgba(10,1,24,.86);border:1px solid var(--line);border-radius:14px;padding:6px 12px 10px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
section[data-room="listeners"] .lst-post:empty{display:none}
section[data-room="listeners"] .lst-listbox{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
section[data-room="listeners"] .lst-cue{position:absolute;transform:translate(-50%,-100%);font:600 11px/1.3 var(--mono);color:var(--ice);background:rgba(10,1,24,.86);border:1px solid rgba(134,203,254,.3);border-radius:999px;padding:5px 13px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;pointer-events:none;transition:opacity .4s ease}
/* the rate readout: two rows of a hundred dots, in the reading column where the claim is, always visible */
section[data-room="listeners"] .lst-strip{margin:14px 0 12px;max-width:30rem}
section[data-room="listeners"] .lst-strip-h{font:600 10px/1.35 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--mute);margin:0 0 9px}
section[data-room="listeners"] .lst-line{display:flex;align-items:baseline;gap:7px;font:600 11.5px/1.4 var(--mono);color:var(--ink);margin:0 0 4px}
section[data-room="listeners"] .lst-line .lst-k{font-weight:400;color:var(--mute)}
section[data-room="listeners"] .lst-line .lst-v{margin-left:auto;font-size:13px}
section[data-room="listeners"] .lst-ratio{font:400 12px/1.45 var(--mono);color:var(--mute);margin:-3px 0 0}
section[data-room="listeners"] .lst-dots{display:grid;grid-template-columns:repeat(50,1fr);gap:1.4px;margin:0 0 11px}
section[data-room="listeners"] .lst-dots i{display:block;aspect-ratio:1;min-height:3px;border-radius:1px;background:rgba(200,190,220,.16)}
section[data-room="listeners"] .lst-dots i.on{background:var(--c)}
section[data-room="listeners"] .lst-post .post{margin:4px 0 0}
section[data-room="listeners"] .lst-post .post-note{font-size:10.5px;line-height:1.45;margin-top:7px}
/* phones: the readout keeps all 200 dots and both counts, on less paper, so the picture keeps its height */
@media (max-width:640px){section[data-room="listeners"] .lst-wide-only{display:none}section[data-room="listeners"] .lst-why{font-size:14px;line-height:1.38}section[data-room="listeners"] .lst-strip{margin:10px 0 8px}section[data-room="listeners"] .lst-strip-h{margin-bottom:6px}section[data-room="listeners"] .lst-line{margin-bottom:2px}section[data-room="listeners"] .lst-dots{gap:1.2px;margin-bottom:8px}section[data-room="listeners"] .lst-dots i{aspect-ratio:auto;height:5px}}
@media (max-height:720px){section[data-room="listeners"] .lst-why{font-size:12.5px;line-height:1.38}section[data-room="listeners"] .lst-strip{margin:8px 0 6px}section[data-room="listeners"] .lst-strip-h{font-size:11px;margin-bottom:5px}section[data-room="listeners"] .lst-line{font-size:10.5px;margin-bottom:2px}section[data-room="listeners"] .lst-line .lst-v{font-size:12px}section[data-room="listeners"] .lst-dots{gap:1.1px;margin-bottom:7px}section[data-room="listeners"] .lst-dots i{aspect-ratio:auto;height:4px}section[data-room="listeners"] .lst-post{padding:5px 10px 8px}section[data-room="listeners"] .lst-post .post-note{font-size:9.5px;margin-top:6px}}
/* a phone held sideways: the reading column is ~190px wide and 270px tall, so every line of it is rationed */
@media (max-height:480px) and (min-aspect-ratio:115/100){section[data-room="listeners"] .lst-strip{margin:5px 0 3px}section[data-room="listeners"] .lst-strip-h{font-size:10.5px;letter-spacing:.1em;margin-bottom:4px}section[data-room="listeners"] .lst-line{font-size:9.5px;margin-bottom:2px}section[data-room="listeners"] .lst-line .lst-v{font-size:11px}section[data-room="listeners"] .lst-dots{gap:1px;margin-bottom:4px}section[data-room="listeners"] .lst-dots i{height:3px}section[data-room="listeners"] .lst-why{font-size:11px;line-height:1.32}section[data-room="listeners"] .lst-cav{font-size:10px;line-height:1.42;margin-top:4px}section[data-room="listeners"] .lst-fine summary{padding:7px 0 4px;font-size:10px;letter-spacing:.05em}section[data-room="listeners"] .lst-fines{column-gap:14px}}
/* sideways phone with the dock open: the scrolling wall ends above the dock instead of under it */
@media (max-height:480px) and (min-aspect-ratio:115/100){section[data-room="listeners"] .wall{max-height:calc(100vh - 62px - max(0px, var(--dockh) - 8px))}}
/* dvh behind @supports: a second declaration in the same block is no fallback here, because this one carries
   var(--dockh) and so survives parsing on an engine with no dvh, then dies at computed value time */
@supports (height:100dvh){@media (max-height:480px) and (min-aspect-ratio:115/100){section[data-room="listeners"] .wall{max-height:calc(100dvh - 62px - max(0px, var(--dockh) - 8px))}}}
`;
const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/* K1 trail tuning (W39, ROUND2_PLAN.md R3; re-tuned round 3, P2 "faint dotted rain"). Measured on the live field
   (r2_R3.mjs): a hard-edged, ~800-dot cluster is what makes every one of the 120 node clusters draw its own
   Sobel-rim glyph, and that alone already accounts for the whole 37% baseline — 118-400 edges cannot add enough
   new haze cells to dilute that by dilution alone. So this room still asks for `edges:false` on its own dot field
   (atlasEnter) to hold that gate; it is orthogonal to trail brightness (the renderer's "strong" bracket, LINE.strong
   in glyphfield.js, is a tone/glyph choice, never a Sobel rim).
   Round 2 then capped every trail's weight (K1_W_MAX 0.5) under that 0.6 "strong" line, so no arm could ever draw as
   a bright directional mark ( - / | \\ ) — only its brief once-per-K1_PULSE_MS pulse head ever touched pv>=0.5, and
   even that lit only 1-3 cells for K1_PULSE_TRAVEL_MS out of the whole segment, which read as a stray flicker, not
   the "bright lines" the room's own cue promises. Round 3: the busiest quartile of arms (K1_W_TOPQ, w===5 — ~21-22%
   of both edge sets, the closest a 5-bucket rate already gives to a quartile) now draws continuously in the strong
   bracket (K1_W_STRONG..+STRONGSPAN, 0.6-0.8, jittered per edge so the busy arms don't all read one identical
   brightness), so the periodic pulse travels along an already-bright line instead of blinking alone in the dark.
   Every other arm keeps the old faint base weight (K1_W0/K1_W1) — the haze band is correct for them, only the
   claim's own busiest arms needed to be visible: a hub artist can still sit at the shared end of 30-45 edges at
   once (this graph's own degree), and the renderer unions overlapping weights at a cell, so K1_W_MAX (now 0.8, just
   above the top band) stays the hard backstop regardless of what adds into it (a hub union or the intro pulseK).
   The audio-reactive shimmer the old stroke draw gave bridge edges is dropped for K1 (kept only in the ?atlas=0
   legacy draw): at this weight scale it would swing further than the base signal it was riding on. */
const K1_W0 = 0.02, K1_W1 = 0.035, K1_W_TOPQ = 5, K1_W_STRONG = 0.6, K1_W_STRONGSPAN = 0.2, K1_W_MAX = 0.8, K1_PULSE_MS = 2500, K1_PULSE_TRAVEL_MS = 300;
/* a stable per-edge 0..1 jitter (not Math.random — every reload and every engine must agree), reused for K1_W_STRONGSPAN */
const jitter01 = (k) => ((Math.imul(k + 1, 2246822519) >>> 0) / 4294967296);

/* ---- atlas mode (BUILD_SPEC_V2 §3 listeners row). reached only when ctx.atlas.on; ?atlas=0 is today, byte for byte */
const isAtlas = (ctx) => !!(ctx && ctx.atlas && ctx.atlas.on);
/* R5 L4: angle 0 is the hundred jumps, a lazy module (hundred.js) that wraps this room through attach() */
const ANGLES = [{ id: 'hundred', name: 'the hundred jumps' }, { id: 'taps', name: 'my taps' }, { id: 'autoplay', name: 'autoplay' }, { id: 'fade', name: 'the fade dial' }];
/* the zoom at which each plays bucket (1-5 quantiles, twolisteners.json) earns its floating name: the most played at once */
const LZOOM = [0, 2.3, 1.9, 1.55, 1.2, 1];
const ACSS = `
html.atlas section[data-room="listeners"] .lst-tgw{position:absolute;z-index:1;transform:translate(-50%,-100%);display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 8px;pointer-events:none;width:max-content}
html.atlas section[data-room="listeners"] .lst-tgw .lst-toggle{position:static;transform:none;pointer-events:auto}
html.atlas section[data-room="listeners"] .lst-door{pointer-events:auto;display:flex;align-items:center;gap:6px;font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ice);background:rgba(10,1,24,.6);border:1px solid rgba(134,203,254,.45);border-radius:999px;padding:13px 16px;min-height:44px;cursor:pointer;white-space:nowrap;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
html.atlas section[data-room="listeners"] .lst-door:hover{border-color:var(--ice);background:rgba(134,203,254,.1)}
html.atlas section[data-room="listeners"] .lst-door:focus-visible{outline:2px solid var(--ice);outline-offset:3px}
html.atlas section[data-room="listeners"] .lst-door .lst-star{font-size:12px;letter-spacing:0;opacity:.85}
/* the selected (or hovered) artist's name, in the atlas's label voice. it rides the camera layer and is counter-scaled,
   so it stays 10.5px while the graph under it zooms */
html.atlas section[data-room="listeners"] .lst-tag{transform-origin:0 0;transform:scale(var(--iz,1)) translate(-50%,-100%);font:400 10.5px/1.3 var(--mono);letter-spacing:.06em;color:var(--ice);background:none;border:0;border-radius:0;padding:2px 4px;text-shadow:0 0 6px rgba(10,1,24,.95),0 0 2px rgba(10,1,24,.95)}
html.atlas section[data-room="listeners"] .lst-tag.below{transform:scale(var(--iz,1)) translate(-50%,0)}
html.atlas section[data-room="listeners"] .lst-tag::before{content:"[ ";color:rgba(134,203,254,.6)}
html.atlas section[data-room="listeners"] .lst-tag::after{content:" ]";color:rgba(134,203,254,.6)}
html.atlas section[data-room="listeners"] .lst-hit{touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
/* phones: toggle and door share one row; every button keeps a 44px target (VERIFY_r3_a11y P1: this override
   dropped both back to 40px under the base 44px rule above — the padding shrinks to fit the row, the target does not) */
@media (max-width:520px){
html.atlas section[data-room="listeners"] .lst-tgw{gap:6px}
html.atlas section[data-room="listeners"] .lst-toggle{gap:3px;padding:3px}
html.atlas section[data-room="listeners"] .lst-toggle button{padding:10px 10px;min-height:44px;letter-spacing:.05em;font-size:10.5px;gap:6px}
html.atlas section[data-room="listeners"] .lst-toggle .lst-sw{width:10px}
html.atlas section[data-room="listeners"] .lst-door{padding:10px 11px;min-height:44px;letter-spacing:.05em;font-size:10.5px}
}
/* the compact card (\`less\`, the phone default): the rate strip, its reading and the disclosures wait behind \`more\`,
   so the graph gets the screen. the wall's first line and the tour caption still carry the claim */
html.atlas.ai-less section[data-room="listeners"] .lst-extra{display:none}
@media (max-width:359px){
html.atlas section[data-room="listeners"] .lst-toggle button{padding:9px 8px;letter-spacing:.02em;font-size:10px;gap:4px}
html.atlas section[data-room="listeners"] .lst-toggle .lst-sw{width:7px}
html.atlas section[data-room="listeners"] .lst-door{padding:9px 9px;letter-spacing:.02em;font-size:10px;gap:4px}
}
@media print{html.atlas section[data-room="listeners"] .lst-tgw,html.atlas section[data-room="listeners"] .lst-tag{display:none}}
@media (forced-colors:active){html.atlas section[data-room="listeners"] .lst-door{forced-color-adjust:none;background:Canvas;color:CanvasText;border:1px solid CanvasText}}
`;

export default {
  id: 'listeners', track: 'dorian-manifold',
  ready: false, mode: 'tap', fadeStart: null,

  async mount(root, ctx) {
    this.ctxRef = ctx;
    /* R5 PERF2: the two angle modules load beside the identity + data waits below, not after them */
    if (isAtlas(ctx)) { const V = ctx.V || ''; this.modP = [import('./hundred.js' + V), import('./fade.js' + V)]; this.modP.forEach((p) => p.catch(() => {})); }
    document.head.appendChild(el('style')).textContent = CSS + (isAtlas(ctx) ? ACSS : '');
    await ctx.identity();
    this.root = root;
    const wall = root.parentElement.querySelector('.wall'), extra = el('div', isAtlas(ctx) ? 'lst-extra' : null);
    wall.insertBefore(extra, wall.querySelector('.deeper'));
    this.extra = extra;

    let d = null; try { d = await ctx.data('twolisteners'); } catch (e) {}
    if (!d || !d.nodes || !d.nodes.length) { extra.appendChild(el('p', 'say dim', 'the network data did not load this time.')); return; }
    this.d = d;
    const nodes = d.nodes, n = nodes.length;
    /* clusters take the site-wide genre-family hue (ctx.FAM), not a private ramp: untagged falls back to grey inside famColor */
    this.nodeColor = new Uint32Array(n); for (let i = 0; i < n; i++) this.nodeColor[i] = ctx.famColor(nodes[i].community) >>> 0;
    this.nodeComm = nodes.map((nd) => nd.community);
    /* edges follow PROVENANCE only: mint = my taps, violet = autoplay (shuffle + served, the toggle's other state) */
    this.MINT = rgb(ctx.PAL.tap).join(); this.AV = rgb(ctx.PAL.violet).join(); this.DIM = '200,190,220';
    /* K1 hues: the same two provenance colours and the same neutral, as plain 0xRRGGBB numbers for setLines' c field */
    this.palTapN = ctx.PAL.tap; this.palAutoN = ctx.PAL.violet; this.DIMN = 0xc8bedc;
    /* keyboard listbox order: most-played first, then name — same 120 artists as the cloud, no new data */
    this.order = nodes.map((_, i) => i).sort((a, b) => (nodes[b].plays_bucket - nodes[a].plays_bucket) || nodes[a].name.localeCompare(nodes[b].name));

    const fx = d.full_transition_crossing;
    /* one decimal on screen (69.9 / 66.3) so the two printed rates divide to the 1.05 headline; whole numbers gave 70 / 66 = 1.06 */
    const r1 = (v) => (Math.round(v * 1000) / 10).toFixed(1), tap1 = r1(fx.tap), auto1 = r1(fx.auto), /* half-up: toFixed alone gives 69.8 for 69.85 */ ratio = (fx.tap / fx.auto).toFixed(2);
    const tap = Math.round(fx.tap * 100), auto = Math.round(fx.auto * 100), nTap = fx.n_tap, nAuto = fx.n_auto;
    this.tapPct = tap; this.autoPct = auto;
    extra.appendChild(el('p', 'say dim short-hide lst-wide-only', 'the bridges are the edges that join two different scenes.'));
    /* the rate, in the exhibit's own material: a hundred dots per listener, filled to the crossing rate,
       with the raw jump counts beside them. the drawn picture is counts; this is what the number compares. */
    const strip = el('div', 'lst-strip');
    strip.setAttribute('role', 'img');
    strip.setAttribute('aria-label', 'of every 100 jumps to a new artist, mine cross into another scene ' + tap1 + ' times and autoplay’s ' + auto1 + '. ' + tap1 + ' against ' + auto1 + ' is the bridge index: ' + ratio + ', a direction, not a size. i made ' + fmt(nTap) + ' of those jumps in ' + (isAtlas(ctx) ? 'the whole log' : 'seven years') + ', autoplay made ' + fmt(nAuto) + '. autoplay drew more lines because it made about five times as many jumps. the rate is what the number compares.');
    strip.appendChild(el('p', 'lst-strip-h', 'of every 100 jumps to a new artist, how many cross into another scene'));
    const strRow = (who, jumps, pct, shown, colour) => {
      const line = el('div', 'lst-line');
      line.append(el('span', '', who), el('span', 'lst-k', '· ' + fmt(jumps) + ' jumps'), el('span', 'lst-v', shown));
      const dots = el('div', 'lst-dots'); dots.style.setProperty('--c', colour);
      const frag = document.createDocumentFragment();
      for (let q = 0; q < 100; q++) frag.appendChild(el('i', q < pct ? 'on' : ''));
      dots.appendChild(frag); strip.append(line, dots);
    };
    strRow('my taps', nTap, tap, tap1, 'rgb(' + this.MINT + ')');
    strRow('autoplay', nAuto, auto, auto1, 'rgb(' + this.AV + ')');
    strip.appendChild(el('p', 'lst-ratio', tap1 + ' against ' + auto1 + ' is the bridge index: ' + ratio + ', a direction, not a size.')).setAttribute('aria-hidden', 'true'); /* the strip's aria-label already says it */
    extra.appendChild(strip);
    extra.appendChild(el('p', 'say lst-why', 'autoplay drew more lines because it made about five times as many jumps. the rate is what the number compares.'));
    const fines = extra.appendChild(el('div', 'lst-fines'));
    const fine = fines.appendChild(el('details', 'lst-fine')); fine.appendChild(el('summary', '', 'why not a size'));
    [(isAtlas(ctx) ? 'a third of my jumps and two fifths of autoplay’s' : 'a third to two fifths of my jumps') + ' carry no public genre tag, and reasonable ways of handling them put the number anywhere from 1.00 to 1.13.', 'the drawn graph keeps only the busiest ' + n + ' artists and their strongest edges, so it is a picture of my two habits, not the measurement.'].forEach((t) => fine.appendChild(el('p', 'lst-cav', t)));
    fine.open = !isAtlas(ctx) && innerWidth > innerHeight * 1.15 && innerHeight >= 860; /* closed on phones and on laptop-height screens, where open it ran into the wall label button; closed in the atlas, whose wall column starts under the info panel */
    fine.addEventListener('toggle', () => { if (this.ready && root.parentElement.classList.contains('is-active')) this.relay(ctx); });

    /* the colour code, in one more disclosure ("the colours") rather than new always-on lines: on a short phone stage the
       graph already meets the wall text at its tightest point, so nothing here may add height unconditionally.
       the sentence covers what a screen reader needs; the chips below it are aria-hidden decoration of the same fact. */
    const clr = fines.appendChild(el('details', 'lst-fine')); clr.appendChild(el('summary', '', 'the colours'));
    clr.appendChild(el('p', 'lst-cav', 'each cluster is coloured by genre family, grey for no public tag. the bridge lines are coloured by who pressed play: mint for my taps, violet for autoplay.'));
    /* no provenance chips here: only two line colours appear and the toggle buttons carry them */
    ctx.legend(clr, 'fam', { items: d.communities });
    clr.open = false; /* closed everywhere: open, the ten family chips pushed the wall into the label button */
    this.wallEl = wall; this.fines = [fine, clr];
    clr.addEventListener('toggle', () => { if (clr.open && fine.open) fine.open = false; if (this.ready && root.parentElement.classList.contains('is-active')) this.relay(ctx); });
    fine.addEventListener('toggle', () => { if (fine.open && clr.open) clr.open = false; });

    this.hit = root.appendChild(el('div', 'lst-hit'));
    this.hit.setAttribute('aria-hidden', 'true'); /* pointer-only decoration; the listbox below is the real control */
    if (isAtlas(ctx)) {
      /* one element, one input path (§1.4): the gesture layer owns this element and hands over world coordinates, so a
         tap or a hover lands on the right node at any zoom. the native click/pointermove pair (screen coordinates) is
         never attached here: the two would double-fire, and screen px against world-px node centres miss once panned */
      this.offHit = ctx.gesture.bind(this.hit, this.hitSpec(ctx));
    } else {
      this.hit.addEventListener('click', (e) => this.tapAt(e.clientX, e.clientY, ctx));
      this.hit.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.hoverAt(e.clientX, e.clientY); });
    }

    const tgl = el('div', 'lst-toggle'); tgl.setAttribute('role', 'radiogroup'); tgl.setAttribute('aria-label', 'which edges to show');
    const bTap = el('button', 'on', 'my taps'); bTap.prepend(this.swatch(this.MINT)); bTap.type = 'button'; bTap.setAttribute('role', 'radio'); bTap.setAttribute('aria-checked', 'true'); bTap.tabIndex = 0;
    const bAuto = el('button', '', 'autoplay'); bAuto.prepend(this.swatch(this.AV)); bAuto.type = 'button'; bAuto.setAttribute('role', 'radio'); bAuto.setAttribute('aria-checked', 'false'); bAuto.tabIndex = -1;
    tgl.append(bTap, bAuto); root.appendChild(tgl); this.tgl = tgl; this.bTap = bTap; this.bAuto = bAuto;
    this.tgPos = tgl;
    if (isAtlas(ctx)) {
      /* D15: the constellations are their own stop now; the old third toggle state survives only as a door to it */
      const w = el('div', 'lst-tgw'); root.insertBefore(w, tgl); w.appendChild(tgl);
      const door = el('button', 'lst-door'); door.type = 'button';
      door.append(el('span', '', 'constellations'), el('span', 'lst-star', '›'));
      door.setAttribute('aria-label', 'constellations: fly to the universe stop, every artist i played 50 times or more as a star');
      /* ctx.go resolves a stop id itself (ctx.route hands a string id straight to the activation path, REQUESTS_R3 #1) */
      door.addEventListener('click', () => { try { ctx.go('universe', { angle: 'sky', via: 'tap' }); } catch (e) {} });
      w.appendChild(door); this.door = door; this.tgPos = w;
    }
    bTap.addEventListener('click', () => { this.flip('tap', ctx); this.syncAngle(ctx); }); bAuto.addEventListener('click', () => { this.flip('auto', ctx); this.syncAngle(ctx); });
    tgl.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation(); this.flip(this.mode === 'tap' ? 'auto' : 'tap', ctx); this.syncAngle(ctx); (this.mode === 'tap' ? bTap : bAuto).focus();
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
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); this.selectNode(this.order[idx], ctx, { fly: true }); return; }
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
    if (window.ResizeObserver) new ResizeObserver(() => { this.postRect = null; this.fitLive(); if (this.kbFocusIdx != null) this.showTag(this.kbFocusIdx); if (this.atlasOn) this.labVis(ctx); }).observe(this.postSlot);
    if (isAtlas(ctx)) this.mountAtlas(root, ctx);

    root.addEventListener('pointerdown', () => this.hideCue(), { once: true });
    root.addEventListener('keydown', () => this.hideCue(), { once: true });

    this.announce(); this.ready = true;
  },

  /* ------------------------------------------------------------------ atlas mode (§3 listeners row, §1.4-§1.7, D10, D15) */
  angles: ANGLES,
  vz: 1, hoverI: -1, labOn: false, labT: 0, hidLab: new Set(),

  mountAtlas(root, ctx) {
    this.atlasOn = true;
    const h = this.modP[0].then((m) => m.default.attach(this, ctx), (e) => console.warn('hundred', e));
    this.modP[1].then((m) => h.then(() => m.default.attach(this, ctx)), (e) => console.warn('fade', e));
    const nodes = this.d.nodes;
    this.fold = nodes.map((nd) => String(nd.name).toLowerCase());
    /* the name tag rides the camera layer (§1.5), so it sits on its node at any pose; tab order is untouched (it is
       aria-hidden decoration of the listbox) */
    this.camL = ctx.view.layer(root, [this.tag]);
    /* label widths for the post keepout, measured once on a canvas with the labels' own font (never a layout read) */
    const m = document.createElement('canvas').getContext('2d'); m.font = '400 10.5px "JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace';
    this.labW = nodes.map((nd) => m.measureText(nd.name + '[  ]').width + nd.name.length * 0.63 + 11);
  },

  hitSpec(ctx) {
    return {
      tap: (p) => this.tapAt(p.wx, p.wy, ctx),
      hover: (p) => this.hoverAt(p.wx, p.wy),
      leave: () => { if (!this.pinned) { this.hoverI = -1; this.tag.hidden = true; this.labVis(); } },
      cursor: (p) => (this.ready && this.nodeAt(p.wx, p.wy, 24) >= 0 ? 'pointer' : 'grab'),
    };
  },
  /* the bare field around the graph (once the camera has moved it past the stage rect): same names, same taps */
  gestures(ctx) {
    return { hover: (p) => this.hoverAt(p.wx, p.wy), leave: () => { if (!this.pinned) { this.hoverI = -1; this.tag.hidden = true; this.labVis(); } } };
  },
  pick(wx, wy, ctx) {
    if (!this.ready || !this.atlasOn) return null;
    const i = this.nodeAt(wx, wy, 28); if (i < 0) return null;
    const nm = this.d.nodes[i].name;
    return { label: nm, focus: { artist: nm }, wx: this.px[i * 2], wy: this.px[i * 2 + 1], z: Math.max(this.vz, 1.6) };
  },
  focus(desc, ctx) {
    if (!desc || !this.ready || desc.artist == null || !this.fold) return false;
    const i = this.fold.indexOf(String(desc.artist).toLowerCase()); if (i < 0) return false;
    this.selectNode(i, ctx, { fly: true });
    return true;
  },
  look(k) {
    if (typeof k !== 'string' || !this.fold || !this.px) return null;
    const i = this.fold.indexOf(k.replace(/^artist:/, '').toLowerCase());
    return i < 0 ? null : [this.px[i * 2], this.px[i * 2 + 1]];
  },
  syncAngle(ctx) {
    if (!this.atlasOn) return;
    const id = this.mode === 'tap' ? 'taps' : 'autoplay';
    try { if (ctx.angle.get().id !== id) ctx.angle.set(id, { via: 'room' }); } catch (e) {}
  },
  setAngle(k, ctx, o = {}) {
    const a = ANGLES[k]; if (!a || !this.ready || a.id === 'hundred' || a.id === 'fade') return 0;
    const m = a.id === 'taps' ? 'tap' : 'auto'; if (m === this.mode) return 0;
    this.flip(m, ctx); if (o.instant) this.fadeStart = null;
    return o.instant || ctx.reduced ? 0 : 900; /* the edge cross-fade */
  },
  /* the toggle row, the cue/live line and an open listening post: no floating label lands on them (M6 refreshes these on
     stop change and resize; the post's own rect is kept clear by labVis below, since it opens mid-visit) */
  keepout(ctx) {
    const out = [], add = (e) => { if (!e || e.hidden) return; const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 }); };
    add(this.tgPos); add(this.cue); if (this.postSlot && this.postSlot.firstChild) add(this.postSlot);
    return out;
  },

  atlasEnter(ctx) {
    const P = ctx.particles, v = ctx.view, re = !!(ctx.atlas && ctx.atlas.reenter);
    const st = ctx.stage(), b = { x: st.x - st.w * 0.25, y: st.y - st.h * 0.25, w: st.w * 1.5, h: st.h * 1.5 }; /* a locked node on the rim still reaches the middle */
    try { v.configure({ mode: 'pan', zMin: 1, zMax: 3, bounds: b, drift: true, look: (k) => this.look(k) }); } catch (e) {}
    /* continuous glyphs, one real play's hue per cell: every cluster is its genre family (ctx.FAM), never a blend.
       edges:false (W39): each of the 120 clusters is dense and >=40 cells on its own, so it draws a Sobel rim
       regardless of the K2 'large' component gate; the family hue already reads each cluster's shape, it needs no
       outline. Forward-compatible: today gfRoom() ignores an opts.edges it doesn't forward (R2_REQUESTS_R3.md #1). */
    P.glyphAll(true); P.glyphMode('cont', { colour: 'sample', edges: false });
    if (!this.offCam) this.offCam = v.onChange(() => { if (!this.root.parentElement.classList.contains('is-active')) return; this.setIz(ctx); if (this.postSlot.firstChild || this.hidLab.size) this.labVis(); });
    this.setIz(ctx);
    if (!re) { this.pinned = false; this.kbFocusIdx = null; this.hoverI = -1; this.tag.hidden = true; }
    else if (this.pinned && this.kbFocusIdx != null && v.lock === this.d.nodes[this.kbFocusIdx].name) {
      /* a relayout mid-flight (the chrome re-measuring itself when the hud or lock chip changes) must not strand the lock */
      const i = this.kbFocusIdx; try { v.flyTo({ wx: this.px[i * 2], wy: this.px[i * 2 + 1], z: Math.max(v.z || 1, this.flyZ || 1) }, { speed: 'quick', lock: v.lock }); } catch (e) {}
    }
    clearTimeout(this.labT);
    if (re) this.pushLabels(ctx);
    else { this.labOn = false; ctx.labels.clear('listeners'); this.labT = setTimeout(() => { if (this.root.parentElement.classList.contains('is-active')) this.pushLabels(ctx); }, ctx.reduced ? 0 : 700); }
  },
  setIz(ctx) { if (this.camL) this.camL.style.setProperty('--iz', String(1 / ((ctx.view && ctx.view.z) || 1))); },

  /* 120 names (D10): priority = plays bucket, the quieter buckets revealed as you zoom in; a tap on one selects it */
  pushLabels(ctx) {
    if (!this.atlasOn || !this.px) return;
    const nodes = this.d.nodes, items = [], ord = this.order;
    for (let k = 0; k < ord.length; k++) {
      const i = ord[k], nd = nodes[i], b = nd.plays_bucket | 0, zmin = LZOOM[Math.max(1, Math.min(5, b))];
      items.push({ id: 'n' + i, text: nd.name, x: this.px[i * 2], y: this.px[i * 2 + 1], r: Math.max(6, this.clusterR[i] * 0.55), kind: 'obj',
        pri: b * 2 - k * 0.001, zoom: this.hidLab.has(i) ? [1e9, 1e9] : zmin > 1 ? [zmin, 99] : null,
        go: (c) => this.selectNode(i, c || ctx, { fly: true }) });
    }
    ctx.labels.set('listeners', items); this.labOn = true;
    this.labVis();
  },
  labZoom(i) { const b = this.d.nodes[i].plays_bucket | 0, z = LZOOM[Math.max(1, Math.min(5, b))]; return z > 1 ? [z, 99] : null; },
  /* which floating names stand down: the one the tag is already naming (no twin), and any whose box would land on an
     open listening post (its play button must stay reachable). recomputed only when the camera, the tag or the post changes */
  labVis() {
    if (!this.atlasOn || !this.labOn || !this.px) return;
    const ctx = this.ctxRef; if (!ctx) return;
    const hid = new Set(), tagI = !this.tag.hidden ? (this.pinned ? this.kbFocusIdx : this.hoverI) : null;
    if (tagI != null && tagI >= 0) hid.add(tagI);
    if (this.postSlot.firstChild) {
      const b = this.postSlot.getBoundingClientRect(), v = ctx.view, z = (v && v.z) || 1, n = this.d.nodes.length;
      if (b.width > 0) for (let i = 0; i < n; i++) {
        const q = v.apply(this.px[i * 2], this.px[i * 2 + 1]), off = Math.max(Math.max(6, this.clusterR[i] * 0.55) * z * 0.72, 5);
        const l = q[0] + off, t = q[1] - off - 18, r = l + this.labW[i], bt = t + 18;
        if (r > b.left - 6 && l < b.right + 6 && bt > b.top - 6 && t < b.bottom + 6) hid.add(i);
      }
    }
    const L = ctx.labels;
    this.hidLab.forEach((i) => { if (!hid.has(i)) L.update('listeners', 'n' + i, { zoom: this.labZoom(i) }); });
    hid.forEach((i) => { if (!this.hidLab.has(i)) L.update('listeners', 'n' + i, { zoom: [1e9, 1e9] }); });
    this.hidLab = hid;
  },
  /* a selection in the atlas: the camera flies to the node (quick) and locks on its name; the hud names its family */
  atlasSelect(i, ctx, opts) {
    const nd = this.d.nodes[i], v = ctx.view, x = this.px[i * 2], y = this.px[i * 2 + 1];
    if (opts.fly) this.flyZ = Math.max((v && v.z) || 1, 1.6);
    if (opts.fly && v && !(v.flying && v.lock === nd.name)) { try { v.flyTo({ wx: x, wy: y, z: this.flyZ }, { speed: 'quick', lock: nd.name }); } catch (e) {} }
    if (opts.fly) ctx.lock(nd.name);
    ctx.hud(nd.name + ' · ' + (nd.community === 'untagged' ? 'no public genre tag' : nd.community));
    requestAnimationFrame(() => this.labVis());
  },

  /* portrait, a disclosure open: the wall would grow up past the stage's 26% floor and run under the
     toggle, so it becomes a scroll box that ends where that floor does, scrolled to the opened text */
  capWall() {
    if (this.atlasOn) return; /* the atlas chrome owns the wall card (§2.3) */
    const w = this.wallEl, H = innerHeight, open = this.fines.some((f) => f.open);
    const fade = 'linear-gradient(180deg,transparent,#000 24px)';
    if (!open || innerWidth > H * 1.15) { w.style.maxHeight = w.style.overflowY = w.style.overscrollBehavior = w.style.webkitMaskImage = w.style.maskImage = ''; return; }
    const pb = parseFloat(getComputedStyle(w.parentElement).paddingBottom) || 0;
    w.style.maxHeight = Math.floor(H - pb - (Math.max(64, H * 0.1) + H * 0.26 + 18)) + 'px';
    w.style.overflowY = 'auto'; w.style.overscrollBehavior = 'contain';
    w.style.webkitMaskImage = w.style.maskImage = w.scrollHeight > w.clientHeight + 1 ? fade : '';
    w.scrollTop = w.scrollHeight;
  },

  swatch(c) { const i = el('i', 'lst-sw'); i.style.background = 'rgb(' + c + ')'; i.setAttribute('aria-hidden', 'true'); return i; },

  buildEdges(list) {
    const n = list.length, x1 = new Float32Array(n), y1 = new Float32Array(n), x2 = new Float32Array(n), y2 = new Float32Array(n), a0 = new Float32Array(n), br = new Uint8Array(n);
    /* K1 (W39): each edge's trail weight (0..1, see K1_W0/K1_W1 above) and its own pulse phase in ms, so parallel
       trails don't all flash together — every edge still completes one pulse every K1_PULSE_MS, just out of step */
    const wt = new Float32Array(n), ph = new Float32Array(n);
    const px = this.px, comm = this.nodeComm;
    for (let k = 0; k < n; k++) {
      const e = list[k], i = e[0], j = e[1], w = e[2];
      x1[k] = px[i * 2]; y1[k] = px[i * 2 + 1]; x2[k] = px[j * 2]; y2[k] = px[j * 2 + 1];
      a0[k] = 0.1 + 0.16 * ((w - 1) / 4);
      wt[k] = w >= K1_W_TOPQ ? K1_W_STRONG + K1_W_STRONGSPAN * jitter01(k) : K1_W0 + K1_W1 * ((w - 1) / 4);
      br[k] = (comm[i] !== comm[j] && comm[i] !== 'untagged' && comm[j] !== 'untagged') ? 1 : 0;
      ph[k] = (Math.imul(k + 1, 2654435761) >>> 0) % K1_PULSE_MS;
    }
    return { x1, y1, x2, y2, a0, br, wt, ph, n };
  },

  layoutEdges(ctx) {
    const nodes = this.d.nodes, n = nodes.length, s = ctx.stage();
    this.gh = this.ghFor(s); /* the graph stops above the toggle */
    this.px = new Float32Array(n * 2);
    this.clusterR = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.px[i * 2] = s.x + nodes[i].xy[0] * s.w; this.px[i * 2 + 1] = s.y + nodes[i].xy[1] * s.h * this.gh;
      this.clusterR[i] = clamp((0.008 + nodes[i].plays_bucket * 0.009) * s.w, 14, 60);
    }
    this.tapPre = this.buildEdges(this.d.tap_edges); this.autoPre = this.buildEdges(this.d.auto_edges);
    /* K1: the most either a single frame ever writes is one full crossfade (the outgoing set plus the incoming one) */
    if (this.atlasOn) this.segBuf = new Float32Array((this.tapPre.n + this.autoPre.n) * 7);
    this.hit.style.left = s.x + 'px'; this.hit.style.top = s.y + 'px'; this.hit.style.width = s.w + 'px'; this.hit.style.height = s.h + 'px';
    let cx = s.x + s.w / 2, cy = s.y + s.h - 29; /* the toggle is ~56px tall: its lower edge stays on the stage, clear of the dock */
    this.sx = s.x; this.sy = s.y; this.sw = s.w;
    if (this.atlasOn) {
      /* atlas: the toggle row (with the door) hangs from the stage's bottom edge and may wrap on a narrow stage; the cue and
         the live line keep their places above its first row. its lower edge is today's toggle's (1 px inside the stage),
         so a one-row toggle sits exactly where ?atlas=0 puts it (and ghFor keeps today's graph height) */
      this.tgPos.style.left = cx + 'px'; this.tgPos.style.top = (s.y + s.h - 1) + 'px';
      cy = s.y + s.h - 1 - (this.tgH || 56) + 28;
    } else { this.tgPos.style.left = cx + 'px'; this.tgPos.style.top = cy + 'px'; }
    /* the listbox is clipped to 1px (visually hidden) but must sit at a real on-screen point — an unset/auto
       position here makes focus-follows-scrollIntoView jump the whole page to wherever "auto" resolved to */
    this.listbox.style.left = cx + 'px'; this.listbox.style.top = cy + 'px';
    this.live.style.left = cx + 'px'; this.live.style.top = (cy - 44) + 'px'; this.liveTop = cy - 49;
    /* the cue sits in the gap between the graph's lower edge and the toggle, on one line, so it never
       lies across the clusters; a narrow stage gets the short form */
    this.cue.textContent = s.w >= 600 ? CUE_TEXT : CUE_TEXT_S;
    this.cue.style.left = cx + 'px'; this.cue.style.top = (cy - 31) + 'px'; this.cue.style.maxWidth = Math.max(140, s.w - 16) + 'px';
    /* the post lives at the top of the stage in both orientations: below the toggle it fell off the
       bottom of the screen on desktop, and pinned to the tapped node it landed on the name tag on phones */
    this.postSlot.style.left = cx + 'px'; this.postSlot.style.top = (s.y + 2) + 'px';
    this.postRect = null; this.fitLive();
    if (this.kbFocusIdx != null) this.showTag(this.kbFocusIdx);
  },

  fitLive() {
    if (this.cue && !this.cue.hidden) { this.live.classList.add('clip'); return; } /* the cue is using its line */
    if (!this.postSlot.firstChild) { this.live.classList.remove('clip'); return; }
    if (!this.postRect) this.postRect = this.postSlot.getBoundingClientRect();
    this.live.classList.toggle('clip', this.postRect.bottom > this.liveTop - 4);
  },

  announce() { this.live.textContent = this.mode === 'tap' ? 'showing: my taps' : 'showing: autoplay'; },

  flip(mode, ctx) {
    if (mode === this.mode || !this.ready) return;
    this.fromPre = this.mode === 'tap' ? this.tapPre : this.autoPre;
    this.fromCol = this.mode === 'tap' ? this.MINT : this.AV;
    this.fromColN = this.mode === 'tap' ? this.palTapN : this.palAutoN;
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
    if (this.atlasOn) { if (!this.pinned) this.hoverI = i; this.labVis(); }
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
    if (this.atlasOn) this.atlasSelect(i, ctx, opts);
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

  showCue() { if (this.cue && !this.interacted) { this.cue.hidden = false; this.fitLive(); } },
  hideCue() { this.interacted = true; if (this.cue && !this.cue.hidden) { this.cue.hidden = true; this.fitLive(); } this.pulseSet = null; },

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
    const px = this.px, n = this.d.nodes.length, R = 24 / this.vz; let best = -1, bd = R * R; /* 24 screen px at any zoom (vz = 1 at ?atlas=0) */
    for (let i = 0; i < n; i++) { const dx = px[i * 2] - x, dy = px[i * 2 + 1] - y, dist = dx * dx + dy * dy; if (dist < bd) { bd = dist; best = i; } }
    if (!this.atlasOn) this.hit.style.cursor = best < 0 ? '' : 'pointer'; /* atlas: the gesture layer sets the cursor */
    this.hoverI = best;
    if (best < 0) { this.tag.hidden = true; if (this.atlasOn) this.labVis(); return; }
    this.showTag(best);
  },
  nodeAt(x, y, r) {
    const px = this.px, n = this.d.nodes.length, R = r / this.vz; let best = -1, bd = R * R;
    for (let i = 0; i < n; i++) { const dx = px[i * 2] - x, dy = px[i * 2 + 1] - y, dist = dx * dx + dy * dy; if (dist < bd) { bd = dist; best = i; } }
    return best;
  },
  tapAt(x, y, ctx) {
    if (!this.ready) return;
    const best = this.nodeAt(x, y, 28);
    if (best < 0) { this.pinned = false; this.kbFocusIdx = null; if (this.atlasOn) { this.tag.hidden = true; this.labVis(); } return; }
    this.selectNode(best, ctx, { fly: this.atlasOn });
    return true;
  },

  relay(ctx) { if (this.atlasOn) ctx.relayout(); else this.enter(ctx); },
  /* the graph's share of the stage height: today 84px are kept for the toggle and the cue (the 56px toggle, 1px under
     it, 27px over it); in the atlas the toggle row is measured (one layout read per enter), since it can wrap on a narrow
     stage, and keeps the same 28px. a one-row toggle (56px) gives today's height exactly, so the graph and every
     scene-jump line land where ?atlas=0 draws them at the home pose */
  ghFor(s) {
    if (!this.atlasOn || !this.tgPos) return Math.max(0.6, 1 - 84 / s.h);
    this.tgPos.style.maxWidth = Math.max(160, s.w) + 'px';
    this.tgH = this.tgPos.offsetHeight || 56;
    return Math.max(0.45, 1 - (this.tgH + 28) / s.h);
  },

  enter(ctx) {
    const P = ctx.particles; this.reduced = ctx.reduced;
    P.ease = 0.05; P.jitter = 0.5; P.big = false; P.touch = false; /* here the pointer names artists; it should not scatter them */
    if (!this.ready) { P.scatter(); P.color(() => 0x6b5a86); return; }
    this.capWall();
    const nodeColor = this.nodeColor, nodes = this.d.nodes, n = nodes.length;
    const gh = this.gh = this.ghFor(ctx.stage());
    P.target((i) => { const nd = nodes[P.artist[i] % n]; const r = Math.sqrt(ctx.hash(i)) * (0.008 + nd.plays_bucket * 0.009), a = ctx.hash(i * 97 + 13) * 6.283; return [clamp(nd.xy[0] + Math.cos(a) * r, 0, 1), clamp(nd.xy[1] + Math.sin(a) * r, 0, 1) * gh]; });
    P.color((i) => nodeColor[P.artist[i] % n]);
    this.layoutEdges(ctx);
    if (this.atlasOn) this.atlasEnter(ctx);
    if (!this.introShown) { /* first-time visitor: the core interaction (tap/keyboard-select a node) is otherwise undiscoverable */
      this.introShown = true;
      if (this.reduced) this.showCue();
      else { clearTimeout(this._introT); const root = this.root; this._introT = setTimeout(() => this.showIntro(), 1400); }
    }
  },

  leave(ctx) {
    ctx.stopPosts(); if (this.tag) this.tag.hidden = true; this.stopDemo();
    if (this.atlasOn) {
      clearTimeout(this.labT); this.labOn = false; this.hidLab = new Set(); this.hoverI = -1; this.pinned = false; this.kbFocusIdx = null; if (this.postSlot) this.postSlot.textContent = '';
      /* K1: belt-and-braces alongside the shell's own room-exit clear (K1 contract) — never leave a stale trail set for the next room */
      try { if (ctx.atlas && typeof ctx.atlas.setLines === 'function') ctx.atlas.setLines(null); } catch (e) {}
    }
  },

  /* a real hand arrived: the kiosk sequence stops walking the toggle */
  stopDemo() { if (this._demoT) { this._demoT.forEach(clearTimeout); this._demoT = null; } },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    if (this.atlasOn) this.vz = ctx.view && ctx.view.mode === 'pan' ? ctx.view.z || 1 : 1;
    let p = 1; if (this.fadeStart != null) p = clamp((t - this.fadeStart) / 900, 0, 1);
    const subK = 1 + (bands.low - 0.5) * 0.1, hi = bands.high * 0.15;
    let pulseSet = null, pulseK = 0;
    if (this.pulseSet && this.mode === 'tap') {
      const pt = (t - this.pulseStart) / 1600;
      if (pt >= 1) this.pulseSet = null; else { pulseSet = this.pulseSet; pulseK = Math.sin(clamp(pt, 0, 1) * Math.PI) * 0.55; }
    }
    /* atlas: the graph is drawn in world px and the camera scales it; strokes thin as it zooms so lines stay lines */
    const zk = this.atlasOn ? Math.pow(this.vz, 0.7) : 1;
    const curPre = this.mode === 'tap' ? this.tapPre : this.autoPre, curCol = this.mode === 'tap' ? this.MINT : this.AV;
    if (this.atlasOn) {
      this.drawTrails(ctx, t, p, subK, curPre, pulseSet, pulseK);
    } else {
      const lwB = 2.2 / zk, lwD = 1 / zk;
      const draw = (pre, mul, col, pl) => {
        if (!pre || mul <= 0.01) return;
        const { x1, y1, x2, y2, a0, br, n } = pre;
        for (let k = 0; k < n; k++) {
          let a = Math.min(1, a0[k] * mul * subK + (br[k] ? hi : 0));
          if (pl && pl.has(k)) a = Math.min(1, a + pulseK);
          if (a <= 0.01) continue;
          g.globalAlpha = a; g.strokeStyle = br[k] ? css(col, 1) : css(this.DIM, 1); g.lineWidth = br[k] ? lwB : lwD;
          g.beginPath(); g.moveTo(x1[k], y1[k]); g.lineTo(x2[k], y2[k]); g.stroke();
        }
      };
      if (p < 1) { draw(this.fromPre, 1 - p, this.fromCol, null); draw(curPre, p, curCol, pulseSet); } else draw(curPre, 1, curCol, pulseSet);
    }
    if (this.kbFocusIdx != null && this.px) {
      const i = this.kbFocusIdx, px = this.px, base = this.clusterR ? this.clusterR[i] : 20, r = base + (this.reduced ? 0 : Math.sin(t * 0.005) * 2);
      g.globalAlpha = 0.85; g.strokeStyle = '#86cbfe'; g.lineWidth = 2 / zk; /* a selection ring is interface: ice */
      g.beginPath(); g.arc(px[i * 2], px[i * 2 + 1], Math.max(10, r), 0, 6.283); g.stroke();
    }
    g.globalAlpha = 1;
  },

  /* K1 (W39): the bridge graph as glyph trails (ctx.atlas.setLines) instead of ctx.stroke() chords on the overlay
     canvas, so the graph reads in the same glyph language as the rest of the atlas. Only atlas mode calls this —
     ?atlas=0 keeps the vector chords above, byte for byte, since the glyph field itself is atlas-only. The old
     stroke draw's audio-reactive "hi" bridge boost is not carried into K1 (see the tuning comment above); pulseK
     (the first-visit intro highlight) still applies, and stays inside K1_W_MAX same as every other segment. */
  drawTrails(ctx, t, p, subK, curPre, pulseSet, pulseK) {
    const A = ctx.atlas; if (!A || typeof A.setLines !== 'function' || !this.segBuf) return;
    const curColN = this.mode === 'tap' ? this.palTapN : this.palAutoN;
    const buf = this.segBuf; let o = 0;
    if (p < 1 && this.fromPre) o = this.fillSegs(buf, o, this.fromPre, (1 - p) * subK, this.fromColN, t, null, 0);
    o = this.fillSegs(buf, o, curPre, p * subK, curColN, t, pulseSet, pulseK);
    try { A.setLines(o ? buf.subarray(0, o) : null); } catch (e) {}
  },

  /* packs one edge set into buf at buf[off..]: 7 floats per segment (x0,y0,x1,y1,w,c,pulse — the K1 contract), x0/y0
     the "from" node so the pulse travels i -> j, in play order. w is held under K1_W_MAX (0.8 — above the top
     quartile's 0.6-0.8 band on purpose, headroom for a hub node's many edges unioning together at one cell) no
     matter what the intro boost adds. pulse is NaN (no pulse) outside its brief travel window: the renderer draws a pulse head
     at full brightness regardless of w, so an always-on pulse would force every edge into the strong bracket. */
  fillSegs(buf, off, pre, mul, colN, t, pulseSet, pulseK) {
    const { x1, y1, x2, y2, br, wt, ph, n } = pre;
    let o = off;
    for (let k = 0; k < n; k++) {
      let w = wt[k] * mul;
      if (pulseSet && pulseSet.has(k)) w += pulseK;
      if (w > K1_W_MAX) w = K1_W_MAX; else if (w < 0) w = 0;
      buf[o] = x1[k]; buf[o + 1] = y1[k]; buf[o + 2] = x2[k]; buf[o + 3] = y2[k]; buf[o + 4] = w;
      buf[o + 5] = br[k] ? colN : this.DIMN;
      const ph2 = (t + ph[k]) % K1_PULSE_MS;
      buf[o + 6] = ph2 < K1_PULSE_TRAVEL_MS ? ph2 / K1_PULSE_TRAVEL_MS : NaN;
      o += 7;
    }
    return o;
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
