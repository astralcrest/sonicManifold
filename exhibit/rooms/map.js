/* room 3 — the map that lied. every particle flies to its artist's position in a retrained
   embedding; a seven-detent dial swaps which retraining (12% -> 100% algorithmic training data).
   particles keep their room-1 provenance colour, so the map arrives already telling the tapped/
   served story. four of my most-played artists are ringed and named and keep their colour at full
   strength, so the visitor can watch a named thing travel while its plays never change: the churn
   is the instrument moving, not the listening. a second view re-targets a deterministic 15% of the
   dots into seven columns — the dose-response curve itself, with a parity line at 1.00.
   track latent-dimension.mp3 is the exhibit's one deliberate key break (10A -> 5B):
   the room where the ruler bends is the room where the music goes out of key. do not fix that.

   colour code, round 4: checked exhibit/data/mapmorph.json for a genre-family tag per artist —
   it has none. its `comm` field is a per-level Louvain cluster id, one Louvain run per retrained
   embedding, matched back to the 12% level "by largest overlap" (its own notes). that is exactly
   the kind of map-shaped structure this room exists to distrust, not a hand-tagged genre. painting
   it with ctx.FAM would dress an artifact of the embedding up as a fact about the music, so the MAP
   view keeps its original tap/shuffle/served provenance colouring. the CURVE view gets the new
   code instead: its seven columns are a real, fixed axis (12% -> 100% algorithmic), so they run
   mint -> violet along it, and the ringed artists' ring is now white so it reads as "marked", not
   as a fourth provenance colour. */

const CAP = [
  'trained almost entirely on my own picks. the advantage vanishes.',
  'still mostly my own picks.',
  'the balanced, corrected map.',
  'past the midpoint, more queue than me.',
  'close to a fully served log.',
  'about what an embedding trained on my raw log sees.',
  'algorithm only.',
];
/* 1.61 is the withdrawn embedding-based reading, from researcher.html / index.html ("the finding,
   with its whole history"); it is the sentence the room is built to say out loud. */
const NEG = 'this is the map my first number was measured on. it read 1.61. the map itself inflated it, so i withdrew it.';
const CURVE_CAP = 'each column is one of the seven maps. the more of the training diet the algorithm chose, the higher the number came out.';
const CURVE_CAP_S = 'each column is one of the seven maps. the more the algorithm chose, the higher it read.';
const CURVE_SUB = 'the line at 1.00 is no difference at all.';

const SIGMA = 0.012, TAU = 6.283185307;
const RISE = 105;       /* ms between one column being released and the next */
const AXMAX = 1.5;      /* columns are drawn from zero, so 1.00 sits two thirds of the way up */
const NPIN = 4, TRN = 14, TRSTEP = 4; /* held artists, ghost-trail length, frames between samples */
const F0 = 196.00;      /* G3: in D minor pentatonic and the third of this room's Eb bed (D3 sat a semitone under its tonic). two sines this far apart, at most 31 cents */
const GV = 0.015;       /* per voice: two voices, 0.03 total, the ceiling the sound brief sets */

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const mixc = (a, b, k) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  return ((((ar + (((b >> 16) & 255) - ar) * k) | 0) << 16) | (((ag + (((b >> 8) & 255) - ag) * k) | 0) << 8) | (((ab + ((b & 255) - ab) * k) | 0))) >>> 0;
};

/* the embedding-free headline, always with its interval and its hedge, in one text node (D13). src: researcher.html
   abstract + method, labels.js threshold "the finding". a bare 1.05 read as a size; it is a direction. */
const D13 = 'without any map: 1.05 [1.03, 1.08], a direction, not a size: how the untagged jumps are handled moves it 1.00 to 1.13; the loosest or 50-play definitions read 1.01';

/* ---- atlas mode (BUILD_SPEC_V2 §3 map row). everything below is reached only when ctx.atlas.on; ?atlas=0 is today. */
const isAtlas = (ctx) => !!(ctx && ctx.atlas && ctx.atlas.on);
const NLAB = 28;   /* artists named beyond the four held ones, in mapmorph order (its play order), revealed as you zoom */
/* glyph weight of an unheld artist's plays. the renderer normalises hue away, so colour cannot dim a glyph (§1.2);
   the weight can. the held four stay at full weight and read brighter than the cloud, as their full-strength colour
   does at ?atlas=0. a weight is emphasis, never a count: every play still sits in its cell. */
const WDIM = 170;
const ANGLES = [{ id: 'm12', name: 'the 12% map' }, { id: 'm100', name: 'the 100% map' }, { id: 'curve', name: 'the curve' }, { id: 'ghost', name: 'the ghost' }];
/* the curve view's categorical families (§6.4): 0 the columns, 1..3 the parked cloud by who pressed play (P.prov + 1) */
const CATS = [{ family: 'neutral' }, { family: 'tap' }, { family: 'shuffle' }, { family: 'served' }];

{
  const S = 'section[data-room="map"] ';
  const st = document.createElement('style');
  st.textContent = [
    '.mapwrap{position:absolute;display:flex;flex-direction:column;justify-content:space-between}',
    '.mhud{pointer-events:none}',
    '.mtop{display:flex;flex-wrap:wrap;align-items:flex-end;gap:4px 20px}',
    '.mbig{font:600 clamp(30px,6.4vw,52px)/1 var(--mono);letter-spacing:-.02em;color:var(--ink)}',
    '.munit{font:600 12px/1 var(--mono);letter-spacing:.08em;color:var(--mute);margin-left:6px}',
    '.mnums{padding-bottom:2px}',
    '.mrow{display:flex;gap:8px;align-items:baseline;font:600 12px/1 var(--mono);letter-spacing:.06em;color:var(--mute);margin-bottom:5px}',
    '.mbi{color:var(--ink);font-size:15px}',
    '.manch{margin:0;font:400 10.5px/1.4 var(--mono);color:var(--mute)}',
    '.mkey{display:flex;flex-wrap:wrap;align-items:center;gap:4px 22px;margin:9px 0 0}',
    '.mkey .legend{margin:0}',
    '.mcross{margin:0;font:600 11px/1.4 var(--mono);color:var(--mute);letter-spacing:.03em}',
    '.mcross b{color:var(--ink);font-weight:600}',
    '.mctl{pointer-events:auto;display:flex;flex-direction:column;gap:8px}',
    '.mcap{margin:0;font:400 clamp(14px,1.8vw,16px)/1.4;color:var(--ink);min-height:1.4em;max-width:40rem}',
    '.mcaps{display:block;font:400 12px/1.45 var(--mono);color:var(--mute);margin-top:3px}',
    '.mtogrow{display:flex;align-items:center;gap:8px 18px;flex-wrap:wrap}',
    '.mtog{display:flex;gap:5px;background:rgba(10,1,24,.6);border:1px solid var(--line);border-radius:999px;padding:4px;flex:none}',
    '.mtog button{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);background:none;border:0;border-radius:999px;padding:12px 15px;min-height:40px;cursor:pointer;white-space:nowrap}',
    '.mtog button.on{color:var(--ink);background:rgba(134,203,254,.16);box-shadow:inset 0 0 0 1px var(--ice)}',
    '.mtog button:focus-visible{outline:2px solid var(--ice);outline-offset:3px}',
    '.mdrag{margin:0;font:600 11px/1.35 var(--mono);letter-spacing:.05em;color:var(--mute)}',
    '.mdrag b{color:var(--ink);font-weight:600}',
    '.mdial{-webkit-appearance:none;appearance:none;flex:1 1 200px;min-width:160px;max-width:460px;height:40px;background:transparent;margin:0;touch-action:pan-x}',
    '.mdial::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--mint),var(--violet))}',
    '.mdial::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--ice);margin-top:-8.5px;box-shadow:0 0 0 4px rgba(134,203,254,.18)}',
    '.mdial::-moz-range-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--mint),var(--violet))}',
    '.mdial::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--ice)}',
    '.mdial:focus-visible{outline:2px solid var(--ice);outline-offset:6px;border-radius:8px}',
    '.mheldposts{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:2px 0 0}',
    '.mheldposts .mheldlbl{flex:0 0 100%;margin:0 0 1px;font:600 11px/1.3 var(--mono);letter-spacing:.06em;color:var(--mute)}',
    '.mheldposts .post{margin:0}',
    '.mheldposts .mheldnote{flex:0 0 100%}',
    '.mheldposts .post-note{margin-top:2px}',
    '.mnote{margin:2px 0 0;font:400 11px/1.55 var(--mono);color:var(--mute);max-width:34rem}',
    '.mnote+.mnote{margin-top:6px}',
  ].map((r) => S + r).join('') +
    '@media (max-aspect-ratio:115/100){' + S + '.mheldposts{display:none}' + S + '.mbig{font-size:clamp(26px,7.4vw,34px)}' + S + '.mkey{margin-top:7px}' + S + '.mcap{font-size:14px}' + S + '.mcaps{font-size:11px}' + S + '.mctl{gap:6px}' + S + '.mtog button{padding:11px 13px}' + S + '.mdial{max-width:none}' + S + '.mdrag{font-size:10.5px;letter-spacing:0}}' +
    S + '.mapwrap.mtight .mheldposts{display:none}' + S + '.mapwrap.mtight .mbig{font-size:26px}' + S + '.mapwrap.mtight .mkey{margin-top:5px}' + S + '.mapwrap.mtight .mctl{gap:5px}' +
    S + '.mapwrap.mtight .mhud,' + S + '.mapwrap.mtight .mcap{text-shadow:0 1px 10px #0a0118,0 0 22px rgba(10,1,24,.95)}' +
    S + '.mapwrap.mtight .mhud{padding-bottom:14px;background:linear-gradient(180deg,rgba(10,1,24,.86) 62%,rgba(10,1,24,0))}' +
    S + '.mapwrap.mtight .mcap{padding:12px 0 2px;background:linear-gradient(0deg,rgba(10,1,24,.88) 42%,rgba(10,1,24,0));font-size:12.5px;line-height:1.35}' +
    S + '.mapwrap.mtight .mtog button{min-height:38px;padding:10px 13px}' + S + '.mapwrap.mtight .mdial{height:34px}' +
    S + '.mapwrap.mtiny .mcross,' + S + '.mapwrap.mtiny .mcaps{display:none}' + S + '.mapwrap.mtiny .mbig{font-size:23px}' +
    S + '.mapwrap.mmicro .manchl{display:none}' + S + '.mapwrap.mmicro .mcap{font-size:12px}' +
    /* sideways phone with the dock open. dvh goes behind @supports: a second declaration in the same block is
       no fallback, because the dvh one carries var(--dockh) and so parses fine on an engine with no dvh and
       only dies at computed value time, taking the vh line with it */
    '@media (max-height:480px) and (min-aspect-ratio:115/100){' + S + '.wall{max-height:calc(100vh - 62px - max(0px, var(--dockh) - 8px))}}' +
    '@supports (height:100dvh){@media (max-height:480px) and (min-aspect-ratio:115/100){' + S + '.wall{max-height:calc(100dvh - 62px - max(0px, var(--dockh) - 8px))}}}' +
    S + '.mapwrap.mcurve .mcross,' + S + '.mapwrap.mcurve .mheldposts{display:none}' +
    S + '.mchead{display:none;align-items:baseline;gap:7px;white-space:nowrap;font:600 11px/1.25 var(--mono);letter-spacing:.05em;color:var(--mute)}' + S + '.mcheadv{font-size:15px;color:var(--ink);letter-spacing:0}' +
    S + '.mapwrap.mcurve.mtight .mhud{padding-bottom:0;background:none}' + S + '.mapwrap.mcurve.mtight .mtop,' + S + '.mapwrap.mcurve.mtight .mkey{display:none}' + S + '.mapwrap.mcurve.mtight .mchead{display:flex}' +
    /* the one-line curve head now carries the interval and the hedge (D13), so it may wrap instead of running off a phone */
    S + '.mchead{flex-wrap:wrap;white-space:normal;row-gap:2px}' + S + '.mchead span{white-space:nowrap}' + S + '.mchead .mchead13{white-space:normal}';
  /* ?atlas=0 is today plus D13's words, never a new layout. the numbers column is placed where today's one-line anchor
     put it (its minimum is that line's width: 40ch, 21ch once the lead-in is dropped; .mrow cannot wrap, so its minimum
     is its width), then takes the rest of its row, so the interval and the hedge wrap inside the column instead of
     pushing it under the big number. .mfit is today's one-line anchor, set only while position() runs the shrink ladder.
     the curve's one-line head flows as text, so the hedge costs it one line, not two */
  const N = 'html:not(.atlas) ' + S;
  st.textContent += N + '.mnums{flex:1 1 0%}' + N + '.mrow{white-space:nowrap}' + N + '.manch{min-width:40ch}' + N + '.mapwrap.mmicro .manch{min-width:21ch}' +
    N + '.mapwrap.mfit .manch{white-space:nowrap;overflow:hidden;max-width:40ch}' + N + '.mapwrap.mfit.mmicro .manch{max-width:21ch}' +
    N + '.mapwrap.mcurve.mtight .mchead{display:block}' + N + '.mchead>span{margin-right:7px}' + N + '.mchead>span:last-child{margin-right:0}' +
    /* the lines D13 adds (--m13, measured in position()) hang below today's row: the numbers column keeps today's box for
       the row's alignment, so nothing above or beside the anchor moves (the big number beside it, the index above it); the
       row gives the new lines their own room underneath. at the last rung, where nothing is left to shed, a wrapped legend
       closes its row gap by the same amount (--m13g), so everything under the legend stays where today's layout put it */
    N + '.mnums{margin-bottom:calc(0px - var(--m13, 0px))}' + N + '.mtop{padding-bottom:var(--m13, 0px)}' +
    N + '.mapwrap.m13 .mkey .legend{row-gap:var(--m13g, 0px)}' + N + '.mapwrap.m13 .mkey{margin-top:var(--m13k, 0px)}';
  /* the tight curve: the chart never runs under its own head. when the head's lines leave the chart less than its 24 px
     floor, the one line about the map used to disappear outright (the curve view is not about the map) — but that also
     dropped 97,427, the one number that never changes, off the stage entirely (R3-c). it keeps its place, just its lead
     ('my ') and trail (' only the map does.') give way, so '97,427 plays never change.' still reads on one short line */
  st.textContent += S + '.mapwrap.m13c .mdrag .mdrago{display:none}';
  /* atlas: the readout and the controls float over the field. the wrapper never takes the pointer (the field under it
     pans and zooms); only the real controls opt back in. the readout stays screen-fixed, never scaled by the camera */
  const A = 'html.atlas ' + S;
  st.textContent += A + '.mapwrap{pointer-events:none}' + A + '.mctl{pointer-events:none}' +
    A + '.mtog,' + A + '.mdial,' + A + '.mheldposts .post,' + A + '.mheldposts button,' + A + '.mheldposts a{pointer-events:auto}' +
    /* the named artist under the pointer, or the one the camera is locked on: a label in the atlas's own voice, counter-scaled
       so it stays 10.5px at any zoom (it rides the camera layer, which scales its children) */
    A + '.mtag{position:absolute;left:0;top:0;transform-origin:0 0;transform:scale(var(--iz,1)) translate(9px,calc(-100% - 7px));font:400 10.5px/1.3 var(--mono);letter-spacing:.06em;color:var(--ink);white-space:nowrap;padding:2px 4px;pointer-events:none;text-shadow:0 0 6px rgba(10,1,24,.95),0 0 2px rgba(10,1,24,.95);opacity:0;transition:opacity .25s ease}' +
    A + '.mtag::before{content:"[ ";color:var(--mute)}' + A + '.mtag::after{content:" ]";color:var(--mute)}' +
    A + '.mtag.on{opacity:1}' + A + '.mtag.sel{color:var(--ice)}' + A + '.mtag.sel::before,' + A + '.mtag.sel::after{color:rgba(134,203,254,.6)}' +
    /* R3-a: the shared S block above (mtight .mtog button / .mdial) reverted to HEAD's ?atlas=0 sizing (38px / 34px) for
       ?atlas=0 parity; atlas mode still needs its own 44px touch targets regardless of aspect ratio (not only the phone
       media query below), restated here at (0,5,3) — html.atlas + [data-room] + .mapwrap.mtight.mtog/.mdial — to beat
       the S rule's (0,4,2) */
    A + '.mapwrap.mtight .mtog button{min-height:44px}' + A + '.mapwrap.mtight .mdial{height:44px}' +
    /* landscape phones (land, 844x390): a short-but-wide stage reaches .mtight without ever matching the portrait-only
       media query below, so .mdial kept its desktop min-width:160px against a ~350 px tight stage, wrapped the toggle
       row onto two lines, and bloated ctl enough to invert the curve chart's top/base (R3-c fallout, found by screenshot:
       the curve's own head text drew over the chart). .mtight relaxes the floor here, aspect ratio aside */
    A + '.mapwrap.mtight .mdial{flex:1 1 60px;min-width:0}' +
    /* phones: the readout and the controls are rationed so the map gets the middle of the stage. the toggle and the dial
       share one row; the caption keeps its words */
    '@media (max-aspect-ratio:115/100){' +
      A + '.mbig{font-size:27px}' + A + '.munit{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase}' +
      A + '.mrow{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:3px}' + A + '.mbi{font-size:13px;letter-spacing:0}' +
      A + '.manch{font-size:10px;line-height:1.35}' + A + '.mkey{margin-top:5px;gap:3px 14px}' +
      A + '.mcap{font-size:13px;line-height:1.35}' + A + '.mtogrow{flex-wrap:nowrap;gap:10px}' +
      A + '.mtog{padding:3px}' + A + '.mtog button{padding:9px 10px;min-height:44px;letter-spacing:.06em;font-size:10.5px}' +
      A + '.mdial{min-width:0;flex:1 1 auto;height:44px}' + A + '.mdrag{font-size:10px;letter-spacing:.02em}' +
    '}' +
    /* R3-b: desktop atlas mode was missing the N block's box treatment below (it is html:not(.atlas)-scoped), so .mnums grew
       unconstrained (flex:0 1 auto) to fit D13's full one-line width and wrapped under .mbig under ~1260px wide. restated
       here for atlas so it gets the identical ?atlas=0 box: .mnums grows to fill the row instead of sizing to content,
       .manch keeps a 40ch minimum so the label + D13 column reads as one block, and the mfit single-line measurement
       (position()) plus --m13/--m13g/--m13k let the wrapped interval/hedge hang below without moving anything above or
       beside the anchor, exactly as it already does at ?atlas=0 */
    A + '.mnums{flex:1 1 0%}' + A + '.mrow{white-space:nowrap}' + A + '.manch{min-width:40ch}' + A + '.mapwrap.mmicro .manch{min-width:21ch}' +
    A + '.mapwrap.mfit .manch{white-space:nowrap;overflow:hidden;max-width:40ch}' + A + '.mapwrap.mfit.mmicro .manch{max-width:21ch}' +
    A + '.mnums{margin-bottom:calc(0px - var(--m13, 0px))}' + A + '.mtop{padding-bottom:var(--m13, 0px)}' +
    A + '.mapwrap.m13 .mkey .legend{row-gap:var(--m13g, 0px)}' + A + '.mapwrap.m13 .mkey{margin-top:var(--m13k, 0px)}' +
    /* zoomed in, the field runs under the readout and the controls: each gets a soft ground of the page colour (invisible
       at home, where the band layout keeps the cloud clear of both), so a number is never read through glyphs */
    /* (pseudo-elements, so no box changes size: the band layout and every number stay where ?atlas=0 puts them) */
    A + '.mhud,' + A + '.mctl{position:relative}' +
    A + '.mhud::before,' + A + '.mctl::before{content:"";position:absolute;left:-28px;right:-28px;z-index:-1;pointer-events:none;opacity:0;transition:opacity .35s ease;-webkit-mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent)}' +
    A + '.mapwrap.mzoom .mhud::before,' + A + '.mapwrap.mzoom .mctl::before{opacity:1}' +
    A + '.mhud::before{top:-10px;bottom:-22px;background:linear-gradient(180deg,rgba(10,1,24,.8) 68%,rgba(10,1,24,0))}' +
    A + '.mctl::before{top:-22px;bottom:-10px;background:linear-gradient(0deg,rgba(10,1,24,.82) 76%,rgba(10,1,24,0))}' +
    A + '.mapwrap.mtight .mhud::before,' + A + '.mapwrap.mtight .mctl::before{display:none}' +
    A + '.mapwrap.mtight .mhud{background:linear-gradient(180deg,rgba(10,1,24,.9) 55%,rgba(10,1,24,0))}' +
    A + '.mapwrap.mtight .mctl{padding-top:14px;background:linear-gradient(0deg,rgba(10,1,24,.92) 70%,rgba(10,1,24,0))}' +
    A + '.mapwrap.mtight .mcap{background:none;padding:0}' +
    /* the compact card (`less`, the phone default) keeps the claim and drops the two definition notes until `more` */
    'html.atlas.ai-less ' + S + '.mnote{display:none}' +
    /* the smallest stages (320-360 wide phones): the legend row goes before the sentence the room exists to say */
    A + '.mapwrap.mmicro .mkey{display:none}' +
    '@media print{' + A + '.mtag{display:none}}';
  document.head.appendChild(st);
}

export default {
  id: 'map', track: 'latent-dimension', level: 5, mode: 'map', map: null, ready: false, dr: null, fc: 0, dt: [],

  async mount(root, ctx) {
    await ctx.identity(); const map = await ctx.artistMap();
    if (!map || !map.xy || !map.levels) { root.textContent = 'the map did not load.'; return; }
    this.map = map; this.rootEl = root;
    const P = ctx.particles, n = P.n, na = this.na = map.artists.length;

    this.offX = new Float32Array(n); this.offY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u1 = Math.max(ctx.hash(i * 2), 1e-6), u2 = ctx.hash(i * 2 + 1);
      const r = Math.sqrt(-2 * Math.log(u1)) * SIGMA;
      this.offX[i] = r * Math.cos(TAU * u2); this.offY[i] = r * Math.sin(TAU * u2);
    }

    /* every level is normalised on its own min/max so the cloud fills the band between the readout
       and the dial. the transform is one affine map per level, so artists keep their relative
       geometry inside a level and only the frame changes size. */
    this.nxy = [];
    for (let lv = 0; lv < map.xy.length; lv++) {
      const src = map.xy[lv], q = new Float32Array(na * 2);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let a = 0; a < na; a++) { const p = src[a]; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      const kx = 0.94 / Math.max(1e-6, x1 - x0), ky = 0.96 / Math.max(1e-6, y1 - y0);
      for (let a = 0; a < na; a++) { const p = src[a]; q[a * 2] = 0.03 + (p[0] - x0) * kx; q[a * 2 + 1] = 0.02 + (p[1] - y0) * ky; }
      this.nxy.push(q);
    }

    /* the held set: among my 24 most-played artists (mapmorph.json lists artists in play order —
       the same order as twolisteners.json, whose plays_bucket descends), the four that travel
       furthest between the 12% map and the 100% map. nothing about their plays differs per level. */
    const cand = [];
    for (let a = 0; a < Math.min(24, na); a++) {
      const p0 = map.xy[0][a], p6 = map.xy[map.xy.length - 1][a], dx = p6[0] - p0[0], dy = p6[1] - p0[1];
      cand.push([dx * dx + dy * dy, a]);
    }
    cand.sort((u, v) => v[0] - u[0]);
    this.pin = new Uint16Array(NPIN); this.pinName = []; this.pinW = [];
    this.pinMask = new Uint8Array(na);
    for (let k = 0; k < NPIN; k++) { const a = cand[k][1]; this.pin[k] = a; this.pinMask[a] = 1; this.pinName.push(map.artists[a]); this.pinW.push(map.artists[a].length * 6.4 + 12); }
    this.pinX = new Float32Array(NPIN); this.pinY = new Float32Array(NPIN); this.pinSet = false;
    this.tr = new Float32Array(NPIN * TRN * 2); this.trN = 0; this.trH = 0;

    /* the curve view: a fixed ~15% of the dots, chosen once by the shell's own hash, stack into
       seven columns. deterministic, so the same dots always become the measurement. */
    this.sub = new Uint8Array(n); this.col = new Uint8Array(n); this.rank = new Float32Array(n);
    const cnt = new Int32Array(7); let k7 = 0;
    for (let i = 0; i < n; i++) { if (ctx.hash(i * 31 + 7) < 0.15) { this.sub[i] = 1; const c = k7++ % 7; this.col[i] = c; cnt[c]++; } }
    const seen = new Int32Array(7);
    for (let i = 0; i < n; i++) { if (this.sub[i]) { const c = this.col[i]; this.rank[i] = cnt[c] > 1 ? seen[c]++ / (cnt[c] - 1) : 0.5; } }

    const pub = map.published;
    this.colX = new Float32Array(7); this.colH = new Float32Array(7); this.colTop = new Float32Array(7);
    this.biTxt = []; this.lvTxt = [];
    for (let i = 0; i < 7; i++) { this.biTxt.push(pub.bridge_index[i].toFixed(2)); this.lvTxt.push(String(map.levels[i])); }

    /* CURVE colour axis: column 0 (12%) mint to column 6 (100%) violet, the reserved hues, computed once off ctx.PAL */
    this.colColor = new Uint32Array(7);
    for (let i = 0; i < 7; i++) this.colColor[i] = mixc(ctx.PAL.tap, ctx.PAL.violet, i / 6);

    const wrap = el('div', 'mapwrap');
    const hud = el('div', 'mhud');
    /* the readout is cut to what the dial changes and the one number it cannot touch: the definition and
       the ringed note moved to the wall text and the wall label, so the map gets the stage */
    const top = el('div', 'mtop');
    const big = el('div', 'mbig'); big.appendChild(el('span', 'mpct')); big.appendChild(el('span', 'munit', '% algorithmic')); top.appendChild(big);
    const nums = el('div', 'mnums');
    const row = el('div', 'mrow'); row.appendChild(el('span', '', 'bridge index')); row.appendChild(el('span', 'mbi')); nums.appendChild(row);
    /* 1.05 is the published embedding-free headline: researcher.html, abstract + method
       ("the Bridge Index and the leakage correction"). */
    const anch = el('p', 'manch'); anch.append(el('span', 'manchl', 'headline, measured '), el('span', 'manchv', D13)); nums.appendChild(anch); /* the shortest stage drops the first half, never the number, its interval or its hedge */
    top.appendChild(nums); hud.appendChild(top);
    /* the two crossing rates the index divides, as one line of type instead of two bars */
    const key = el('div', 'mkey');
    const cross = el('p', 'mcross');
    cross.append(el('span', '', 'crossings: my taps '), el('b', 'mtapv'), el('span', '', ', autoplay '), el('b', 'mautov')); /* every piece is its own element so the shell's watermark sees all of the line */
    key.appendChild(cross);
    /* the matching legend: mapmorph.json carries no genre-family tag to colour the map view by (see the
       comment at the top of this file), so the map view keeps its provenance colouring and this is that
       legend: tap / shuffle / served, the same three colours the dots have always used here. */
    ctx.legend(key, 'prov');
    hud.appendChild(key);
    /* the one-line form of the same two numbers, for a stage too short to stack the readout. the
       value comes from mapmorph.json like every other reading here; 1.05 is the same published
       embedding-free headline the .manch line above carries */
    const chead = el('div', 'mchead');
    chead.appendChild(el('span', '', 'on this map'));
    chead.appendChild(el('span', 'mcheadv'));
    chead.appendChild(el('span', 'mchead13', '· ' + D13));
    hud.appendChild(chead);
    wrap.appendChild(hud);

    const ctl = el('div', 'mctl');
    const cap = el('p', 'mcap'); cap.setAttribute('aria-live', 'polite');
    cap.appendChild(el('span', 'mcapm')); cap.appendChild(el('span', 'mcaps')); ctl.appendChild(cap);
    const togrow = el('div', 'mtogrow');
    const tog = el('div', 'mtog'); tog.setAttribute('role', 'radiogroup'); tog.setAttribute('aria-label', 'what the dots show');
    const bMap = el('button', 'on', 'the map'), bCur = el('button', '', 'see the curve');
    [bMap, bCur].forEach((b) => { b.type = 'button'; b.setAttribute('role', 'radio'); tog.appendChild(b); });
    bMap.setAttribute('aria-checked', 'true'); bMap.tabIndex = 0;
    bCur.setAttribute('aria-checked', 'false'); bCur.tabIndex = -1;
    togrow.appendChild(tog);
    ctl.appendChild(togrow);
    const dial = el('input', 'mdial'); dial.type = 'range'; dial.min = '0'; dial.max = '6'; dial.step = '1'; dial.value = '5';
    dial.setAttribute('list', 'map-mticks'); dial.setAttribute('aria-label', 'training data, percent algorithmic');
    togrow.appendChild(dial);
    /* 97,427 is exhibit/data/wall.json (total). it is the one number in this room that never moves. the lead and trail
       clauses carry a shared class so the tight curve (.m13c) can drop to just '97,427 plays never change.' instead of
       losing the number entirely (R3-c) */
    const drag = el('p', 'mdrag'); drag.append(el('span', 'mdrago', 'my '), el('b', '', '97,427'), el('span', '', ' plays never change.'), el('span', 'mdrago', ' only the map does.')); ctl.appendChild(drag);
    const dl = el('datalist'); dl.id = 'map-mticks'; for (let i = 0; i < 7; i++) { const o = el('option'); o.value = String(i); dl.appendChild(o); } ctl.appendChild(dl);

    /* one listening post per ringed artist, docked: a visitor can hear who is being held still while
       the map warps around them. the four names are the same this.pinName built above from the biggest
       12%-to-100% travel; ctx.post is the shell's own single shared player, so a second click never
       opens a second one. */
    const heldWrap = el('div', 'mheldposts');
    heldWrap.appendChild(el('p', 'mheldlbl', 'hear who is held still:'));
    const heldNote = el('div', 'mheldnote');
    for (let k = 0; k < NPIN; k++) ctx.post(heldWrap, this.pinName[k], { label: 'hear', noteHost: heldNote });
    heldWrap.appendChild(heldNote);
    ctl.appendChild(heldWrap);

    wrap.appendChild(ctl);
    root.appendChild(wrap);

    const wall = root.parentElement.querySelector('.wall'), deeper = wall.querySelector('.deeper');
    /* the definition sits with the wall text, beside the room's claim, instead of on the map */
    wall.insertBefore(el('p', 'mnote short-hide', 'bridge index: how often my taps cross between neighbourhoods of the map, divided by how often autoplay does. 1.00 means no difference.'), deeper);
    wall.insertBefore(el('p', 'mnote short-hide', 'the picture shows the mechanism. the measurement is the dial’s numbers, not the picture.'), deeper);

    this.wrap = wrap; this.hudEl = hud; this.ctlEl = ctl; this.anchEl = anch;
    this.pct = hud.querySelector('.mpct'); this.bi = hud.querySelector('.mbi');
    this.tapv = hud.querySelector('.mtapv'); this.autov = hud.querySelector('.mautov');
    this.capM = cap.querySelector('.mcapm'); this.capS = cap.querySelector('.mcaps');
    this.chv = hud.querySelector('.mcheadv');
    this.dial = dial; this.bMap = bMap; this.bCur = bCur;

    /* the rise: in the curve view the columns are built from the dots themselves, so growing them
       means moving targets. grow is the step each column has been released to, gvis the smoothed
       value the drawn chart follows, so line and label climb with the dots */
    this.grow = new Float32Array(7).fill(1); this.gvis = new Float32Array(7).fill(1); this.ctDraw = new Float32Array(7);
    this.riseAt = 0; this.riseK = 7;

    /* a real visitor's own hand ends any kiosk demo at once: no timer outlives it. the dial and the
       toggle both stop key events from reaching the document, so this listens on the way down */
    wrap.addEventListener('pointerdown', () => { if (this.dt.length) this.stopDemo(); });
    document.addEventListener('keydown', (e) => { if (e.isTrusted && this.dt.length && this.alive()) this.stopDemo(); }, true);

    dial.addEventListener('input', (e) => { e.stopPropagation(); this.pickLevel(parseInt(dial.value, 10), ctx); this.syncAngle(ctx); });
    dial.addEventListener('keydown', (e) => e.stopPropagation());
    bMap.addEventListener('click', () => { this.setMode('map', ctx); this.syncAngle(ctx); });
    bCur.addEventListener('click', () => { this.setMode('curve', ctx); this.syncAngle(ctx); });
    tog.addEventListener('keydown', (e) => {
      if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const next = this.mode === 'map' ? 'curve' : 'map';
      this.setMode(next, ctx); this.syncAngle(ctx); (next === 'map' ? bMap : bCur).focus();
    });
    if (isAtlas(ctx)) this.mountAtlas(root, ctx);
    this.ready = true;
  },

  /* ------------------------------------------------------------------ atlas mode (§3 map row, §1.4, §1.5, D10, D13) */
  angles: ANGLES,
  focusA: -1, hoverA: -1, labOn: false, labT: 0, curveAt: 0, cloudK: 1,

  mountAtlas(root, ctx) {
    const map = this.map, na = this.na;
    this.atlasOn = true;
    this.fold = map.artists.map((s) => String(s).toLowerCase());
    /* who gets a floating [ name ]: the four held artists always, then the next NLAB in mapmorph's own order (its play
       order), each one appearing a little further in. their anchors ease with the pins, so a label travels with its dots */
    const lab = []; for (let k = 0; k < NPIN; k++) lab.push(this.pin[k]);
    for (let a = 0; a < na && lab.length < NPIN + NLAB; a++) if (!this.pinMask[a]) lab.push(a);
    this.labA = Uint16Array.from(lab); this.labX = new Float32Array(lab.length); this.labY = new Float32Array(lab.length); this.labSet = false;
    /* the hover / locked-on tag rides the camera layer, like every world-anchored name */
    this.tagEl = el('div', 'mtag'); this.tagEl.setAttribute('aria-hidden', 'true');
    root.appendChild(this.tagEl);
    this.camL = ctx.view.layer(root, [this.tagEl]);
    this.selX = 0; this.selY = 0;
    /* the hud's pointer targets never cover the field: the wrapper and the control column are pointer-events:none in
       atlas css, the dial, toggle and listening posts opt back in (§3 map row) */
  },

  syncAngle(ctx) {
    if (!isAtlas(ctx) || !this.ready) return;
    const id = this.mode === 'curve' ? 'curve' : this.level === 0 ? 'm12' : this.level === 6 ? 'm100' : null;
    try { if (id && ctx.angle.get().id !== id) ctx.angle.set(id, { via: 'room' }); } catch (e) {}
  },

  /* §1.4: → ms the tour should wait before it starts holding */
  setAngle(k, ctx, o = {}) {
    if (!this.ready) return 0;
    const a = ANGLES[k]; if (!a) return 0;
    if (a.id === 'ghost') return this.gIn(ctx, o); this.ung(ctx);
    const inst = !!o.instant || ctx.reduced;
    if (a.id === 'curve') {
      if (this.mode === 'curve') return 0;
      this.setMode('curve', ctx); if (inst) this.snap(ctx);
      return inst ? 0 : 1300;
    }
    const lv = a.id === 'm12' ? 0 : 6, moved = lv !== this.level || this.mode !== 'map';
    if (this.mode !== 'map') this.setMode('map', ctx);
    this.pickLevel(lv, ctx);
    if (inst) this.snap(ctx);
    return moved && !inst ? 1100 : 0;
  },
  /* R5 ghost: the ghost angle lives in the lazy map.ghost.js, which owns this.ghost while it runs */
  gIn(ctx, o) { if (this.ghost) return 0; import('./map.ghost.js' + new URL(import.meta.url).search).then((m) => m.default(this, ctx, o)).catch((e) => console.warn('ghost', e)); return o.instant || ctx.reduced ? 0 : 1600; },
  ung(ctx) { if (this.ghost) this.ghost.stop(ctx); },
  hoverVoice(id) { return this.ghost ? this.ghost.voice(id) : null; },
  snap(ctx) { const P = ctx.particles; P.x.set(P.tx); P.y.set(P.ty); this.pinSet = false; this.labSet = false; this.grow.fill(1); this.gvis.fill(1); this.riseAt = 0; this.riseK = 7; },

  /* the artist's centre at the current level, in world (stage) css px: the same formula the dots are aimed with */
  artistXY(a) {
    const s = this.s, q = this.nxy[this.level];
    return [s.x + q[a * 2] * s.w, s.y + (this.y0 + q[a * 2 + 1] * this.yh) * s.h];
  },
  findArtist(name) { if (name == null || !this.fold) return -1; return this.fold.indexOf(String(name).toLowerCase()); },
  /* nearest artist centre within 14 screen px (the pins win a tie-break of 4 px) */
  hitArtist(wx, wy, ctx) {
    if (!this.s || this.mode !== 'map') return -1;
    const z = (ctx.view && ctx.view.z) || 1, R = 14 / z, s = this.s, q = this.nxy[this.level], y0 = this.y0, yh = this.yh;
    let best = -1, bd = R * R;
    for (let a = 0; a < this.na; a++) {
      const dx = s.x + q[a * 2] * s.w - wx, dy = s.y + (y0 + q[a * 2 + 1] * yh) * s.h - wy;
      let d = dx * dx + dy * dy; if (this.pinMask[a]) d = Math.max(0, Math.sqrt(d) - 4 / z) ** 2;
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  },

  /* bare-field tap (§1.6 3b): an artist under the finger → the shell flies there and locks on; focus() names it */
  pick(wx, wy, ctx) {
    if (!this.ready || !isAtlas(ctx)) return null;
    const a = this.hitArtist(wx, wy, ctx); if (a < 0) return null;
    const p = this.artistXY(a), name = this.map.artists[a];
    return { label: name, focus: { artist: name }, wx: p[0], wy: p[1], z: Math.max((ctx.view && ctx.view.z) || 1, 2) };
  },

  focus(desc, ctx) {
    if (!desc || !this.ready) return false;
    if (desc.artist != null) {
      const a = this.findArtist(desc.artist); if (a < 0) return false;
      if (this.mode !== 'map') { this.setMode('map', ctx); this.syncAngle(ctx); }
      this.focusArtist(a, ctx);
      return true;
    }
    return false;
  },
  focusArtist(a, ctx) {
    const name = this.map.artists[a], p = this.artistXY(a), v = ctx.view;
    this.focusA = a; this.tagDirty = true; this.flyZ = Math.max(v.z || 1, 2);
    if (!(v.flying && v.lock === name)) { try { v.flyTo({ wx: p[0], wy: p[1], z: this.flyZ }, { speed: 'quick', lock: name }); } catch (e) {} }
    ctx.lock(name);
    this.hudFocus(ctx);
  },
  hudFocus(ctx) {
    if (this.focusA < 0) return;
    /* the room's one claim, applied to one artist: the retraining moves them, their plays do not change */
    ctx.hud(this.map.artists[this.focusA] + ' · where the ' + this.map.levels[this.level] + '% map puts them. turn the dial: the map moves them, their plays stay the same.');
  },
  lockedName(ctx) { const v = ctx.view; return v && v.state === 'locked' ? v.lock : null; },

  /* the field's own gestures: drag pans, a tap names and flies (the shell's default tap via pick()), the pointer over an
     artist names it */
  gestures(ctx) {
    return {
      hover: (p) => { const a = this.hitArtist(p.wx, p.wy, ctx); if (a !== this.hoverA) { this.hoverA = a; this.tagDirty = true; } },
      leave: () => { if (this.hoverA >= 0) { this.hoverA = -1; this.tagDirty = true; } },
      cursor: (p) => (this.hoverA >= 0 ? 'pointer' : ''),
    };
  },

  /* the readout and the controls: no floating label lands on them (refreshed by M6 on stop change and resize) */
  keepout(ctx) {
    if (this.ghost) return this.ghost.ko();
    const out = this.kom ? this.kom.ko(this, ctx) : [];
    if (!this.wrap) return out;
    /* the text and the controls themselves, not their full-width columns: in the tight layout those span the stage */
    this.wrap.querySelectorAll('.mbig,.mnums,.mcross,.mkey .legend,.mchead,.mcap,.mtogrow,.mdrag,.mheldposts').forEach((e) => {
      if (getComputedStyle(e).display === 'none') return;
      const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push({ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 });
    });
    return out;
  },

  /* pan 1-4; the view centre may roam a quarter-stage past every edge, so a locked artist on the rim still comes to the
     middle (the camera keeps the visible window over its bounds). drift in the cloud only (§2.7) */
  camCfg(m) {
    const s = this.s, b = s ? { x: s.x - s.w * 0.25, y: s.y - s.h * 0.25, w: s.w * 1.5, h: s.h * 1.5 } : undefined;
    return { mode: 'pan', zMin: 1, zMax: 4, bounds: b, drift: m === 'map', look: (k) => this.look(k) };
  },
  look(k) {
    if (typeof k !== 'string' || !this.s) return null;
    const m = /^pin:(\d)$/.exec(k);
    if (m) { const i = +m[1]; return i < NPIN ? this.artistXY(this.pin[i]) : null; }
    const a = this.findArtist(k.replace(/^artist:/, ''));
    return a >= 0 ? this.artistXY(a) : null;
  },

  atlasEnter(ctx, re) {
    const v = ctx.view;
    try { v.configure(this.camCfg(this.mode)); } catch (e) {}
    this.glyphs(ctx);
    if (!this.offCam) this.offCam = v.onChange(() => { if (this.alive()) this.camMoved(v); });
    this.camMoved(v);
    clearTimeout(this.labT);
    if (re && this.focusA >= 0) this.follow(ctx); /* a relayout mid-flight (the chrome re-measuring itself) must not strand the lock */
    if (re) this.pushLabels(ctx);
    else { this.labOn = false; ctx.labels.clear('map'); this.labT = setTimeout(() => { if (this.alive()) this.pushLabels(ctx); }, ctx.reduced ? 0 : 700); } /* names arrive once their dots have */
  },

  camMoved(v) {
    const z = v.mode === 'pan' ? v.z || 1 : 1;
    if (this.camL) this.camL.style.setProperty('--iz', String(1 / z));
    const zoomed = z > 1.03; if (zoomed !== this.zoomed) { this.zoomed = zoomed; this.wrap.classList.toggle('mzoom', zoomed); }
    this.tagDirty = true;
  },
  /* glyph field. the map view: continuous, one real play's colour per cell (§6.4 sample). the curve view: categorical, on a
     lattice cut to the columns (curveGrid), so each column is a stack of whole glyph cells in its axis colour. the columns
     take the neutral family (their colour is the axis, not who pressed play; the shape claims nothing it cannot back) at one
     weight (the held artists' emphasis belongs to the map). the line, the tops and the numbers stay exact on the overlay
     (D3). the parked cloud keeps its provenance shapes while it fades out of the field (fadeCloud), so no ghost glyph sits
     behind or between the columns. glyph cells are the texture here, so the dots do not jitter across a cell edge */
  glyphs(ctx) {
    const P = ctx.particles;
    const curve = this.mode === 'curve', sub = this.sub;
    P.glyphAll(true);
    this.gridKey = '';
    if (curve) {
      const prov = P.prov;
      P.catBy((i) => (sub[i] ? 0 : prov[i] + 1));
      P.glyphMode('cat', { cats: CATS });
      P.jitter = 0;
      this.curveGrid(ctx);
    } else { P.glyphMode('cont', { colour: 'sample' }); P.glyphGrid(null); P.jitter = 0.5; }
    const W = P.w, art = P.artist, na = this.na, pm = this.pinMask;
    for (let i = 0; i < P.n; i++) W[i] = curve && sub[i] ? 255 : pm[art[i] % na] ? 255 : WDIM;
    if (curve && this.s) {
      /* a parked play that lands inside a column's rectangle would read as part of the measurement: it sits out the curve
         (weight 0: no cell, no glyph). the columns are the only thing drawn there, as at ?atlas=0 where the cloud fades */
      const TX = P.tx, TY = P.ty, cx = this.colX, hw = this.colW * 0.75 + 4, top = this.cTop - 14, base = this.cBase + 4;
      for (let i = 0; i < P.n; i++) {
        if (sub[i]) continue;
        const y = TY[i]; if (y < top || y > base) continue;
        const x = TX[i]; for (let c = 0; c < 7; c++) if (x > cx[c] - hw && x < cx[c] + hw) { W[i] = 0; break; }
      }
      this.cloudK = -1; this.fadeCloud(ctx, performance.now(), ctx.reduced);
      this.trimKey = ''; this.trimTops(ctx);
    } else this.cloudK = 1;
  },
  /* atlas curve: a column's glyph stack ends at the lattice row nearest its exact top (the line, the tops and the numbers stay
     exact on the overlay, D3). a top cell less than half filled would stand a whole glyph above the reading, so its plays sit
     out (weight 0) and the stack ends one cell lower; half filled or more, it is drawn. the row height follows the renderer's
     lattice (curveGrid's pitch divided for the zoom and the detail step), so this re-runs when that changes */
  trimTops(ctx) {
    if (!this.atlasOn || this.mode !== 'curve' || !this.s || !ctx.atlas.GF || ctx.atlas.GF.stub) return;
    const A = ctx.atlas, v = ctx.view, a = v && v.mode === 'pan' ? v.z || 1 : 1, dpr = ctx.particles.dpr, tier = A.gov ? A.gov.tier : 0;
    if (this.trimTier !== tier || !this.cellCss) { try { this.cellCss = A.GF.stats().cellCss || 0; } catch (e) { this.cellCss = 0; } this.trimTier = tier; }
    if (!this.cellCss) return;
    const cwT = Math.max(3, Math.round(this.cellCss * dpr)), ch = (this.blkW / Math.max(1, Math.round(this.blkW * a * dpr / cwT))) * 1.8;
    const key = ch + '|' + this.gridKey; if (key === this.trimKey) return;
    this.trimKey = key;
    const oy = this.cBase + 0.5, cut = this.trimCut || (this.trimCut = new Float64Array(7));
    for (let c = 0; c < 7; c++) { const hg = oy - this.colTop[c], j = Math.ceil(hg / ch - 1e-9), f = (hg - (j - 1) * ch) / ch; cut[c] = f < 0.5 ? oy - (j - 1) * ch : -1e9; }
    const W = ctx.particles.w, sub = this.sub, col = this.col, rk = this.rank, base = this.cBase, cH = this.colH;
    for (let i = 0; i < W.length; i++) if (sub[i]) { const c = col[i]; W[i] = base - rk[i] * cH[c] < cut[c] ? 0 : 255; }
  },
  /* the curve view parks the cloud: the renderer normalises exposure per room, so neither a colour fade (?atlas=0's 88%)
     nor a uniform weight can dim it; its weight runs to 0 under the veil's 450 ms fade-in instead, and then the cloud is
     out of the field (weight 0: no cell, no glyph). weights only fall here, so a dot already at 0 stays there */
  fadeCloud(ctx, t, red) {
    const k = red || !this.curveAt ? 1 : Math.min(1, Math.max(0, (t - this.curveAt) / 450));
    if (k <= this.cloudK) return;
    this.cloudK = k;
    const P = ctx.particles, W = P.w, art = P.artist, na = this.na, pm = this.pinMask, sub = this.sub, f = 1 - k;
    const wp = Math.round(255 * f), wd = Math.round(WDIM * f);
    for (let i = 0; i < P.n; i++) { if (sub[i]) continue; const v = pm[art[i] % na] ? wp : wd; if (W[i] > v) W[i] = v; }
  },

  pushLabels(ctx) {
    if (!isAtlas(ctx) || !this.labA) return;
    if (this.mode === 'curve') { this.labOn = false; ctx.labels.clear('map'); return; }
    const A = this.labA, X = this.labX, Y = this.labY, items = [];
    if (!this.labSet) { for (let k = 0; k < A.length; k++) { const p = this.artistXY(A[k]); X[k] = p[0]; Y[k] = p[1]; } this.labSet = true; }
    for (let k = 0; k < A.length; k++) {
      const a = A[k], held = k < NPIN, e = k - NPIN;
      items.push({ id: 'a' + a, text: this.map.artists[a], x: X[k], y: Y[k], r: 8, kind: 'obj',
        pri: held ? 20 - k : 10 - e * 0.25, zoom: held || e < 6 ? null : [1 + (e - 5) * 0.11, 99],
        go: (c) => this.focusArtist(a, c || ctx) });
    }
    ctx.labels.set('map', items); this.labOn = true;
  },

  /* labels and the selection tag follow their artists at the pins' pace while the map warps */
  atlasFrame(ctx, red) {
    const L = ctx.labels;
    if (this.labOn && this.labA && this.mode === 'map') {
      const A = this.labA, X = this.labX, Y = this.labY, s = this.s, q = this.nxy[this.level], y0 = this.y0, yh = this.yh;
      for (let k = 0; k < A.length; k++) {
        const a = A[k], tx = s.x + q[a * 2] * s.w, ty = s.y + (y0 + q[a * 2 + 1] * yh) * s.h, dx = tx - X[k], dy = ty - Y[k];
        if (dx * dx + dy * dy < 0.09) continue;
        if (red) { X[k] = tx; Y[k] = ty; } else { X[k] += dx * 0.055; Y[k] += dy * 0.055; }
        L.update('map', 'a' + a, { x: X[k], y: Y[k] });
      }
    }
    /* the locked-on artist: follow it when the dial moves it, drop it when the camera is let go */
    const ln = this.lockedName(ctx);
    if (this.focusA >= 0 && ln !== this.map.artists[this.focusA] && !(ctx.view && ctx.view.flying)) { this.focusA = -1; this.tagDirty = true; ctx.hud(null); }
    const sel = this.focusA >= 0 ? this.focusA : this.hoverA;
    if (sel >= 0 && this.mode === 'map') {
      const p = this.artistXY(sel);
      if (!this.selSet || sel !== this.selA || red) { this.selX = p[0]; this.selY = p[1]; this.selSet = true; this.selA = sel; this.tagDirty = true; }
      else { const dx = p[0] - this.selX, dy = p[1] - this.selY; if (dx * dx + dy * dy > 0.09) { this.selX += dx * 0.055; this.selY += dy * 0.055; this.tagDirty = true; } }
    } else if (this.selA !== -1) { this.selA = -1; this.selSet = false; this.tagDirty = true; }
    if (this.tagDirty && this.tagEl) {
      this.tagDirty = false;
      const t = this.tagEl, on = sel >= 0 && this.mode === 'map';
      /* a named artist already carries its floating label: the tag names only the other 268 (the ice ring marks a lock) */
      const labelled = on && this.labOn && this.labA && this.labA.indexOf(sel) >= 0;
      if (on && !labelled) {
        const nm = this.map.artists[sel]; if (t.textContent !== nm) t.textContent = nm;
        t.style.left = this.selX + 'px'; t.style.top = this.selY + 'px';
        t.classList.toggle('sel', this.focusA === sel); t.classList.add('on');
      } else t.classList.remove('on');
    }
  },

  alive() { return !!this.rootEl && !!this.rootEl.parentElement && this.rootEl.parentElement.classList.contains('is-active'); },

  position(ctx) {
    if (!this.wrap) return;
    const s = ctx.stage(); this.s = s;
    this.wrap.style.left = s.x + 'px'; this.wrap.style.top = s.y + 'px';
    this.wrap.style.width = s.w + 'px'; this.wrap.style.height = s.h + 'px';
    /* the readout sits above the map and the dial below it, so the artists get the middle band of
       the stage and nothing is ever drawn under text. if the two ends cannot both fit, the room
       sheds its own copy rather than letting anything spill over the wall text */
    /* each shrink step is measured once and only re-measured when a class actually landed: the
       thresholds descend, so a step that is not reached cannot be reached by a later one */
    this.wrap.classList.remove('mtight', 'mtiny', 'mmicro', 'mcurve', 'm13', 'm13c');
    /* the ladder is decided on the one-line anchor (.mfit), so the D13 interval and hedge never make the room shed its
       crossings line or its captions. the band below is laid out on the readout as it really is. R3-b: this used to run
       only at ?atlas=0 (fit = !this.atlasOn); atlas mode now reuses it too (the A-prefixed CSS above mirrors N's), so its
       .mnums column matches ?atlas=0's instead of growing to fit D13 unconstrained and wrapping under .mbig below ~1260px */
    const fit = true;
    if (fit) { this.wrap.classList.add('mfit'); this.wrap.style.setProperty('--m13', '0px'); }
    let hud = this.hudEl.offsetHeight, ctl = this.ctlEl.offsetHeight;
    if (hud + ctl + 120 > s.h) {
      this.wrap.classList.add('mtight'); hud = this.hudEl.offsetHeight; ctl = this.ctlEl.offsetHeight;
      if (hud + ctl + 96 > s.h) {
        this.wrap.classList.add('mtiny'); hud = this.hudEl.offsetHeight; ctl = this.ctlEl.offsetHeight;
        if (hud + ctl + 40 > s.h) this.wrap.classList.add('mmicro');
      }
    }
    const tight = this.tight = this.wrap.classList.contains('mtight');
    this.subHidden = this.wrap.classList.contains('mtiny');
    const micro = this.wrap.classList.contains('mmicro');
    if (fit) {
      /* what D13's interval and hedge add to today's anchor at the rung the ladder chose: those lines hang below the row
         (--m13). the last rung has no copy left to shed and its controls already run past the stage, so there the extra
         lines are paid for inside the readout, by a wrapped legend's row gap, and the controls end where they end today */
      const a0 = this.anchEl.getBoundingClientRect().height;
      this.wrap.classList.remove('mfit');
      const d = Math.max(0, this.anchEl.getBoundingClientRect().height - a0);
      this.wrap.style.setProperty('--m13', d + 'px');
      const leg = micro && d > 0 && this.wrap.querySelector('.mkey .legend');
      if (leg && leg.lastElementChild && leg.lastElementChild.offsetTop > leg.firstElementChild.offsetTop) {
        const rg = parseFloat(getComputedStyle(leg).rowGap) || 0, mt = parseFloat(getComputedStyle(leg.parentElement).marginTop) || 0;
        this.wrap.style.setProperty('--m13g', Math.max(0, rg - d) + 'px');
        this.wrap.style.setProperty('--m13k', Math.max(0, mt - Math.max(0, d - rg)) + 'px'); /* what the gap cannot pay, the key's top margin does */
        this.wrap.classList.add('m13');
      }
    }
    this.wrap.classList.toggle('mcurve', this.mode === 'curve');
    /* the last step, the curve view and the anchor's real lines all change the readout, so the band is measured once more */
    if (fit || micro || this.mode === 'curve') { hud = this.hudEl.offsetHeight; ctl = this.ctlEl.offsetHeight; }
    /* the tight curve: at its 24 px floor the chart must still clear its own head (top = head + 8, base = controls − 38) */
    if (tight && this.mode === 'curve' && s.h - ctl - 38 - 24 < hud) { this.wrap.classList.add('m13c'); ctl = this.ctlEl.offsetHeight; }
    if (tight) { this.y0 = 0.03; this.yh = 0.94; }
    else { this.y0 = Math.min(0.5, (hud + 14) / s.h); this.yh = Math.max(0.18, 1 - (hud + ctl + 28) / s.h); }
    const top = tight ? s.y + (this.mode === 'curve' ? hud + 8 : 14) : s.y + this.y0 * s.h + 20;
    const base = (tight ? s.y + s.h - ctl - 8 : s.y + (this.y0 + this.yh) * s.h) - 30;
    /* R5 FIX6: a short tight curve gives the ladder chip its corner column (lazy map.keepout.js, atlas only) */
    if (this.atlasOn && tight && s.h < 360 && !this.kp) this.kp = import('./map.keepout.js' + new URL(import.meta.url).search).then((m) => { this.kom = m; if (this.alive()) this.setLevel(this.level, ctx); }).catch(() => {});
    const kr = this.kr = this.kom ? this.kom.kr(this, s) : 0, gut = s.w < 430 ? 34 : 50, cw = (s.w - gut - 8 - kr) / 7, bi = this.map.published.bridge_index;
    this.cBase = base; this.cTop = top; this.cLeft = s.x + gut; this.cFull = Math.max(24, base - top);
    this.colW = Math.min(24, cw * 0.6);
    /* atlas: a column's glyph block is a whole fraction of the column pitch, so one lattice (pitch blkW, divided into
       cells by the renderer at any zoom or detail step) puts every column's two edges on cell edges */
    this.blkW = cw / Math.max(1, Math.round(cw / this.colW));
    for (let i = 0; i < 7; i++) { this.colX[i] = s.x + gut + cw * (i + 0.5); this.colH[i] = (bi[i] / AXMAX) * this.cFull; this.colTop[i] = base - this.colH[i]; }
    this.parY = base - (1 / AXMAX) * this.cFull;
    this.small = s.w < 430;
    this.nLabel = s.w < 430 ? 2 : NPIN; /* a narrow stage only has room for two names */
    this.shortCap = tight || s.w < 760;
    if (this.ghost) this.ghost.fit(ctx);
    this.curveGrid(ctx);
  },

  /* atlas curve: the glyph lattice on the columns. x from column 0's left block edge at pitch blkW ('divide'), rows counted up
     from half a pixel under the baseline (the bottom dot row sits on the baseline). set only when it changed */
  curveGrid(ctx) {
    if (!this.atlasOn || this.mode !== 'curve' || !this.s) return;
    const g = { ox: this.colX[0] - this.blkW / 2, oy: this.cBase + 0.5, pw: this.blkW, fit: 'divide' }, k = g.ox + '|' + g.oy + '|' + g.pw;
    if (k === this.gridKey) return;
    this.gridKey = k; ctx.particles.glyphGrid(g);
  },

  applyTargets(ctx) {
    const P = ctx.particles, s = this.s, q = this.nxy[this.level], na = this.na, ox = this.offX, oy = this.offY;
    const y0 = this.y0, yh = this.yh, art = P.artist;
    if (this.mode === 'curve') {
      /* atlas: the column's dots fill its glyph block, a quarter pixel inside each edge, so no dot sits in a neighbour cell */
      const sub = this.sub, col = this.col, rk = this.rank, cx = this.colX, ch = this.colH, cwv = this.atlasOn ? this.blkW - 0.5 : this.colW, base = this.cBase, gw = this.grow;
      const sx = s.x, sy = s.y, sw = s.w, sh = s.h, hash = ctx.hash;
      P.targetPx((i) => {
        if (sub[i]) { const c = col[i]; return [cx[c] + (hash(i * 5 + 2) - 0.5) * cwv, base - rk[i] * ch[c] * gw[c]]; }
        const a = art[i] % na;
        return [sx + (q[a * 2] + ox[i]) * sw, sy + (y0 + (q[a * 2 + 1] + oy[i]) * yh) * sh];
      });
    } else {
      P.target((i) => { const a = art[i] % na; return [q[a * 2] + ox[i], y0 + (q[a * 2 + 1] + oy[i]) * yh]; });
    }
  },

  paint(ctx) {
    const P = ctx.particles, C = ctx.PROV, na = this.na, pinMask = this.pinMask, sub = this.sub, col = this.col, art = P.artist, prov = P.prov;
    const curve = this.mode === 'curve', lv = this.level;
    /* the map view only dims the cloud. the curve view parks it: the dots that are not part of the
       measurement fade most of the way into the background, so the seven columns are the brightest
       thing on the stage and the chart's own labels can be read on a phone */
    const sink = curve ? ctx.PAL.bg : ctx.PAL.fog, k = curve ? 0.88 : 0.3;
    const D0 = mixc(C[0], sink, k), D1 = mixc(C[1], sink, k), D2 = mixc(C[2], sink, k);
    const H0 = mixc(C[0], sink, 0.55), H1 = mixc(C[1], sink, 0.55), H2 = mixc(C[2], sink, 0.55);
    const colColor = this.colColor;
    /* atlas: glyph brightness is normalised per cell, so a fade toward the background only shifts the hue (and toward
       violet, a reserved colour). every play keeps its true provenance hue; emphasis rides the glyph weight instead */
    if (this.atlasOn) {
      /* served reads in the reserved violet (#8b6fd6), as its legend chip does: the dimmer served dot tone normalises to a
         near-white lavender in a glyph cell and would stop reading as a provenance at all */
      const V0 = C[0], V1 = C[1], V2 = ctx.PAL.violet;
      P.color((i) => (curve && sub[i] ? colColor[col[i]] : prov[i] === 0 ? V0 : prov[i] === 1 ? V1 : V2)); return;
    }
    P.color((i) => {
      const a = art[i] % na, p = prov[i];
      if (curve) {
        if (sub[i]) return colColor[col[i]];      /* the axis itself: mint (12%) through violet (100%) */
        if (pinMask[a]) return p === 0 ? H0 : p === 1 ? H1 : H2;
        return p === 0 ? D0 : p === 1 ? D1 : D2;
      }
      /* no genre-family tag to colour by here (see the file's top comment), so the map view keeps its
         original provenance colouring; the held artists never dim, which is the whole point of ringing them */
      if (pinMask[a]) return C[p];
      return p === 0 ? D0 : p === 1 ? D1 : D2;
    });
  },

  setLevel(lv, ctx) {
    if (!this.map) return;
    this.level = lv;
    ctx.particles.ease = 0.05;
    this.copy();          /* the caption can change height, so it is written before the band is measured */
    this.position(ctx);
    this.applyTargets(ctx);
    this.paint(ctx);
  },
  /* atlas: locked on an artist, the camera follows them to where the new map puts them (the room's point, made visible) */
  follow(ctx) {
    if (!this.atlasOn || this.focusA < 0 || !this.alive()) return;
    const nm = this.map.artists[this.focusA], v = ctx.view;
    if (v && v.lock === nm) { const p = this.artistXY(this.focusA); try { v.flyTo({ wx: p[0], wy: p[1], z: Math.max(v.z || 1, this.flyZ || 1) }, { speed: 'quick', lock: nm }); } catch (e) {} }
    this.hudFocus(ctx);
  },

  pickLevel(lv, ctx) {
    if (lv === this.level || lv < 0 || lv > 6) return;
    this.dial.value = String(lv);
    ctx.audio.note(6 - lv, { dur: 0.3, vol: 0.03 }); /* a light detent tick over the held drone */
    this.setLevel(lv, ctx);
    this.follow(ctx);
    this.droneSet(ctx);
  },

  markMode(m) {
    this.mode = m;
    const on = m === 'map';
    this.bMap.className = on ? 'on' : ''; this.bMap.setAttribute('aria-checked', String(on)); this.bMap.tabIndex = on ? 0 : -1;
    this.bCur.className = on ? '' : 'on'; this.bCur.setAttribute('aria-checked', String(!on)); this.bCur.tabIndex = on ? -1 : 0;
  },

  setMode(m, ctx) {
    this.ung(ctx);
    if (m === this.mode || !this.ready) return;
    this.markMode(m);
    ctx.particles.ease = 0.05;
    this.copy(); this.position(ctx); this.startRise(ctx); this.applyTargets(ctx); this.paint(ctx);
    /* atlas: the curve draws numbers, so it never drifts and it opens at home; the map drifts. names only on the map */
    if (this.atlasOn && this.alive()) {
      this.curveAt = m === 'curve' ? performance.now() : 0;
      if (m === 'curve') { this.focusA = -1; this.hoverA = -1; this.tagDirty = true; ctx.hud(null); ctx.lock(null); }
      try { ctx.view.configure(this.camCfg(m)); } catch (e) {}
      this.glyphs(ctx);
      this.labSet = false; this.pushLabels(ctx);
    }
  },

  /* the columns are dots, so the reveal is a staggered release of their targets: they gather on the
     axis and grow in level order, left to right. reduced motion gets the finished chart */
  startRise(ctx) {
    const on = this.mode === 'curve' && !ctx.reduced && this.alive();
    this.grow.fill(on ? 0 : 1); this.gvis.fill(on ? 0 : 1);
    this.riseAt = on ? performance.now() : 0; this.riseK = on ? 0 : 7;
  },

  copy() {
    if (!this.map) return;
    const m = this.map, lv = this.level, pub = m.published, last = lv === 6;
    this.pct.textContent = String(m.levels[lv]);
    this.bi.textContent = this.biTxt[lv];
    this.chv.textContent = this.biTxt[lv];
    const tap = Math.round(pub.tap_crossing_pct[lv]), auto = Math.round(pub.auto_crossing_pct[lv]);
    this.tapv.textContent = tap + '%'; this.autov.textContent = auto + '%';
    /* on a stage too short for the sub-caption the withdrawal moves up into the main line: the
       sentence the room exists to say is never the one that gets dropped */
    if (this.mode === 'curve') { this.capM.textContent = last && this.subHidden ? NEG : (this.shortCap ? CURVE_CAP_S : CURVE_CAP).replace(/the algorithm chose/, this.atlasOn ? "i didn't tap" : '$&'); this.capS.textContent = last ? NEG : CURVE_SUB; }
    else { this.capM.textContent = last ? NEG : CAP[lv]; this.capS.textContent = last ? CAP[6] : ''; }
    this.dial.setAttribute('aria-valuetext', 'level ' + (lv + 1) + ' of 7: ' + m.levels[lv] + '% algorithmic, index ' + this.biTxt[lv] + '. my plays unchanged');
  },

  /* a held two-voice drone instead of seven disconnected pings: one sine at G3, one drifting up to
     31 cents above it, so the beat quickens as the algorithmic share rises and the two voices
     resolve into a unison at the lowest level. two voices at 0.015 = 0.03 total. */
  droneSet(ctx) {
    const A = ctx.audio;
    if (!A.ac) return;
    this.drDuck = !!A.ducked;
    /* a listening post is playing: a held tone under someone else's record is a rub, so the drone goes quiet until it stops */
    if (A.muted || A.ducked || !this.alive()) { if (this.dr) { const t0 = A.ac.currentTime; this.dr.ga.gain.setTargetAtTime(0, t0, 0.2); this.dr.gb.gain.setTargetAtTime(0, t0, 0.2); } return; }
    if (!this.dr) {
      const ac = A.ac, a = ac.createOscillator(), b = ac.createOscillator(), ga = ac.createGain(), gb = ac.createGain();
      a.type = 'sine'; b.type = 'sine'; a.frequency.value = F0; b.frequency.value = F0;
      ga.gain.value = 0; gb.gain.value = 0;
      a.connect(ga); b.connect(gb); ga.connect(A.sfx); gb.connect(A.sfx);
      a.start(); b.start();
      this.dr = { a, b, ga, gb };
    }
    const t = A.ac.currentTime, k = this.level / 6;
    this.dr.b.frequency.setTargetAtTime(F0 * Math.pow(2, (k * 31) / 1200), t, 0.18);
    this.dr.ga.gain.setTargetAtTime(GV, t, 0.25); this.dr.gb.gain.setTargetAtTime(GV, t, 0.25);
  },
  droneOff(ctx) {
    const d = this.dr, ac = ctx.audio.ac; this.dr = null;
    if (!d) return;
    if (!ac) return;
    const t = ac.currentTime;
    d.ga.gain.cancelScheduledValues(t); d.gb.gain.cancelScheduledValues(t);
    d.ga.gain.setTargetAtTime(0, t, 0.12); d.gb.gain.setTargetAtTime(0, t, 0.12);
    try { d.a.stop(t + 0.6); d.b.stop(t + 0.6); } catch (e) {}
    setTimeout(() => { try { d.ga.disconnect(); d.gb.disconnect(); } catch (e) {} }, 900);
  },

  stopDemo() { for (let i = 0; i < this.dt.length; i++) clearTimeout(this.dt[i]); this.dt.length = 0; },

  /* kiosk: walk the dial down and back up, then hold the curve open long enough to read it */
  demo(ctx) {
    if (!this.ready) return;
    this.stopDemo();
    const seq = [4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6, 5], step = 620;
    for (let k = 0; k < seq.length; k++) this.dt.push(setTimeout(() => { if (this.alive()) this.pickLevel(seq[k], ctx); }, (k + 1) * step));
    const after = (seq.length + 1) * step;
    this.dt.push(setTimeout(() => { if (this.alive()) this.setMode('curve', ctx); }, after));
    this.dt.push(setTimeout(() => { if (this.alive()) ctx.angle.set('ghost', { via: 'tour' }); }, after + 6000));
    this.dt.push(setTimeout(() => { if (this.alive()) this.setMode('map', ctx); }, after + 22000));
  },

  enter(ctx) {
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5; P.big = false;
    if (!this.ready) return;
    const A = isAtlas(ctx), re = A && !!ctx.atlas.reenter;
    /* atlas: a fresh arrival shows the first angle (the 12% map); a resize or relayout keeps whatever is showing */
    if (A && !re) { this.markMode('map'); this.level = 0; this.dial.value = '0'; this.focusA = -1; this.hoverA = -1; this.curveAt = 0; this.labSet = false; }
    this.position(ctx);
    this.pinSet = false; this.trN = 0; this.trH = 0;
    if (A && re) this.labSet = false;
    this.setLevel(this.level, ctx);
    this.droneSet(ctx);
    if (A) this.atlasEnter(ctx, re);
  },

  /* the next room's enter() owns the particles, so leaving only resets this room's own state */
  leave(ctx) {
    this.ung(ctx); this.stopDemo(); this.droneOff(ctx); if (this.ready && this.mode !== 'map') { this.markMode('map'); this.copy(); }
    if (this.atlasOn) { clearTimeout(this.labT); this.labOn = false; this.focusA = -1; this.hoverA = -1; this.selA = -1; this.selSet = false; if (this.tagEl) this.tagEl.classList.remove('on'); }
  },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready || !this.s) return;
    const red = ctx.reduced;
    this.fc++;
    if ((this.fc & 63) === 0 || (this.dr && !!ctx.audio.ducked !== this.drDuck)) this.droneSet(ctx); /* picks the drone up if sound is enabled later, drops it on mute or under a clip */
    this.zf = this.atlasOn && ctx.view && ctx.view.mode === 'pan' && ctx.view.z > 1 ? ctx.view.z : 1;
    if (this.mode === 'curve') {
      if (this.riseAt) {
        let rel = 0;
        while (this.riseK < 7 && t - this.riseAt >= this.riseK * RISE) { this.grow[this.riseK++] = 1; rel++; }
        if (rel) this.applyTargets(ctx);   /* at most seven retargets, one per column */
        if (this.riseK >= 7) this.riseAt = 0;
      }
      const gv = this.gvis, gw = this.grow, e = red ? 1 : 0.06;
      for (let i = 0; i < 7; i++) gv[i] += (gw[i] - gv[i]) * e;
      /* the field was drawn before this overlay, with the weights of the frame before: the veil covers that frame too */
      if (this.atlasOn) { if (this.cloudK < 1) { this.fadeCloud(ctx, t, red); this.drawVeil(g, t, red); } this.trimTops(ctx); }
      if (this.ghost) return this.ghost.frame(g, t, bands, ctx);
      this.drawCurve(g, bands, red);
    }
    this.drawPins(g, bands, red, ctx);
    if (this.atlasOn) { this.atlasFrame(ctx, red); this.drawSel(g, t, red, ctx); }
  },

  /* the artist the camera is locked on: an ice ring (interface, not provenance), breathing unless motion is reduced */
  drawSel(g, t, red, ctx) {
    if (this.focusA < 0 || this.mode !== 'map' || !this.selSet) return;
    const z = (ctx.view && ctx.view.z) || 1, r = (13 + (red ? 0 : Math.sin(t * 0.004) * 1.5)) / Math.sqrt(z);
    g.save(); g.globalAlpha = 0.9; g.strokeStyle = '#86cbfe'; g.lineWidth = 1.6 / Math.sqrt(z);
    g.beginPath(); g.arc(this.selX, this.selY, r, 0, TAU); g.stroke();
    g.globalAlpha = 0.35; g.beginPath(); g.arc(this.selX, this.selY, r + 5 / Math.sqrt(z), 0, TAU); g.stroke();
    g.restore();
  },

  /* atlas, curve view, while the parked cloud fades out of the field (fadeCloud): the glyphs are at full exposure (the
     renderer normalises brightness per room), so a veil over the chart's rectangle, with the seven columns cut out of it,
     takes them down with their weight. the columns are the measurement and stay untouched. drawn only during the fade */
  drawVeil(g, t, red) {
    const s = this.s, base = this.cBase, top = this.cTop, cx = this.colX, cw = this.colW, ct = this.ctDraw, sm = this.small;
    const k = red || !this.curveAt ? 1 : Math.min(1, (t - this.curveAt) / 450);
    if (k <= 0) return;
    const x0 = s.x - 48, x1 = s.x + s.w + 48, y0 = top - 30, y1 = base + (sm ? 34 : 38);
    g.save();
    const hk = x0 + '|' + x1 + '|' + (k === 1 ? 1 : k.toFixed(2));
    if (this.veilH !== hk) {
      this.veilH = hk; const fe = Math.min(0.2, 56 / Math.max(1, x1 - x0)), c = 'rgba(10,1,24,' + (0.86 * k) + ')';
      this.veilB = g.createLinearGradient(x0, 0, x1, 0); this.veilB.addColorStop(0, 'rgba(10,1,24,0)'); this.veilB.addColorStop(fe, c); this.veilB.addColorStop(1 - fe, c); this.veilB.addColorStop(1, 'rgba(10,1,24,0)');
    }
    g.fillStyle = this.veilB;
    g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0);
    for (let i = 0; i < 7; i++) { const h = base - ct[i] + 6; if (h > 1) g.rect(cx[i] - cw * 0.66, ct[i] - 5, cw * 1.32, h); }
    g.fill('evenodd');
    /* the veil's own top edge fades out too (eight strips of the same feathered fill), so no box is cut into the field */
    for (let q = 0; q < 8; q++) { g.globalAlpha = (q + 0.5) / 8; g.fillRect(x0, y0 - 40 + q * 5, x1 - x0, 5); }
    g.globalAlpha = 1;
    g.restore();
  },

  drawCurve(g, bands, red) {
    const s = this.s, base = this.cBase, x0 = this.cLeft, x1 = s.x + s.w - 6 - (this.kr || 0), cx = this.colX, ch = this.colH, cw = this.colW;
    const lv = this.level, sm = this.small, gv = this.gvis, ct = this.ctDraw, top = this.cTop, M = 'px ui-monospace, Menlo, monospace';
    /* atlas: the chart is drawn in world px and the camera scales it; type, strokes and gaps are divided by the zoom so
       they keep their screen size (the positions they hang from stay exact). zf is 1 at home and at ?atlas=0 */
    const zf = this.zf || 1, u = (v) => v / zf;
    const f = u(sm ? 11 : 12);
    for (let i = 0; i < 7; i++) ct[i] = base - ch[i] * gv[i];
    /* the chart gets its own ground: the strip under the axis and the left gutter are painted out,
       and every label carries a halo, so nothing the room is measuring is read through the cloud */
    g.fillStyle = 'rgba(10,1,24,.88)';
    g.fillRect(s.x, base + u(1.5), s.w, u(sm ? 33 : 36));
    g.fillRect(s.x, top - 12, x0 - s.x - 4, base - top + 13);
    g.lineWidth = u(1);
    g.strokeStyle = 'rgba(240,234,255,.34)';
    g.beginPath(); g.moveTo(x0, base); g.lineTo(x1, base); g.stroke();
    /* parity: 1.00 is no difference between my picks and autoplay's. drawn in ice — this is an axis
       line, the one reserved use ice is for */
    g.setLineDash([u(5), u(5)]); g.lineWidth = u(1.3); g.strokeStyle = 'rgba(134,203,254,.8)';
    g.beginPath(); g.moveTo(x0 - u(5), this.parY); g.lineTo(x1, this.parY); g.stroke(); g.setLineDash([]); g.lineWidth = u(1);
    g.shadowColor = '#0a0118'; g.shadowBlur = 7;
    g.textBaseline = 'alphabetic';
    /* where the reading for the current level will go, so the parity label can step out of its way */
    const vf = u(sm ? 15 : 18), vRoom = this.colTop[lv] - u(10) - vf > top - 12;
    const vy = vRoom ? ct[lv] - u(10) : ct[lv] + vf + u(8);
    g.font = '700 ' + vf + M; const vw = g.measureText(this.biTxt[lv]).width;
    g.font = '600 ' + f + M;
    const lw = g.measureText('no difference').width, ly = this.parY - u(7);
    let lx = x0 + u(6);
    if (gv[lv] > 0.35 && vy - vf < ly && vy + u(3) > ly - f && cx[lv] - vw / 2 - u(8) < lx + lw && cx[lv] + vw / 2 + u(8) > lx) {
      lx = cx[lv] + cw * 0.8 + u(10);
      if (lx + lw > x1) lx = Math.max(x0 + u(6), cx[lv] - cw * 0.8 - u(10) - lw);
    }
    g.fillStyle = 'rgba(134,203,254,.96)';
    g.textAlign = 'right'; g.fillText('1.00', x0 - u(8), this.parY + f * 0.36);   /* the tick, in the gutter */
    g.textAlign = 'left'; g.fillText('no difference', lx, ly);
    /* the curve itself: one line through the seven column tops */
    g.strokeStyle = 'rgba(134,203,254,' + (red ? 0.85 : 0.75 + bands.mid * 0.25) + ')'; g.lineWidth = u(sm ? 1.8 : 2.2);
    g.beginPath(); for (let i = 0; i < 7; i++) { if (i) g.lineTo(cx[i], ct[i]); else g.moveTo(cx[i], ct[i]); } g.stroke();
    g.lineWidth = u(1);
    g.textAlign = 'center';
    for (let i = 0; i < 7; i++) {
      const on = i === lv, h = base - ct[i];
      if (on) {
        /* the selected column outlined in white: the gradient dot colour already says where it sits on
           the mint->violet axis, so the marker that says "this one" has to be a colour that means
           neither end of that axis */
        g.fillStyle = 'rgba(216,210,234,.12)'; g.fillRect(cx[i] - cw * 0.8, ct[i] - 4, cw * 1.6, h + 4);
        g.strokeStyle = 'rgba(216,210,234,.95)'; g.lineWidth = u(1.8);
        g.strokeRect(cx[i] - cw * 0.8, ct[i] - 4, cw * 1.6, h + 4); g.lineWidth = u(1);
      }
      g.font = (on ? '700 ' : '600 ') + (on ? f + u(1) : f) + M;
      g.fillStyle = on ? 'rgba(216,210,234,.98)' : 'rgba(198,190,222,.92)';
      g.fillText(this.lvTxt[i], cx[i], base + f + u(5));
      /* the reading for the level on the dial. the side was chosen from the column's finished
         height, not its current one, so it does not jump when the rise lands */
      if (on && gv[i] > 0.35) {
        /* atlas: a reading with no room above its column sits on the glyph stack, so it gets its own ground */
        if (this.atlasOn && !vRoom) { g.save(); g.shadowBlur = 0; g.fillStyle = 'rgba(10,1,24,.86)'; g.fillRect(cx[i] - vw / 2 - u(3), vy - vf * 0.82, vw + u(6), vf * 1.02); g.restore(); }
        g.font = '700 ' + vf + M; g.fillText(this.biTxt[i], cx[i], vy);
      }
    }
    g.font = '600 ' + u(sm ? 10.5 : 11.5) + M;
    g.fillStyle = 'rgba(198,190,222,.9)';
    g.fillText(this.atlasOn ? "% of training plays i didn't tap" : '% of training plays chosen by the algorithm', (x0 + x1) / 2, base + u(sm ? 29 : 32));
    if (!sm) {
      /* the y title sits below parity, where the tick above it cannot reach */
      g.save(); g.translate(s.x + 12, (this.parY + base) / 2); g.rotate(-Math.PI / 2);
      g.textAlign = 'center'; g.fillText('bridge index', 0, 0); g.restore();
    }
    g.shadowBlur = 0;
    g.textAlign = 'left';
  },

  drawPins(g, bands, red, ctx) {
    const s = this.s, q = this.nxy[this.level], pin = this.pin, px = this.pinX, py = this.pinY, tr = this.tr;
    /* in the curve view the rings are only a reminder that the map is still behind the chart. atlas: the map leaves the
       field in the curve view (fadeCloud), so its reminders leave with it, at the same pace */
    const curve = this.mode === 'curve', al = curve ? (this.atlasOn ? 0.18 * (1 - this.cloudK) : 0.18) : 1;
    const sx = s.x, sy = s.y, sw = s.w, sh = s.h, y0 = this.y0, yh = this.yh;
    let moved = false;
    for (let k = 0; k < NPIN; k++) {
      const a = pin[k], tx = sx + q[a * 2] * sw, ty = sy + (y0 + q[a * 2 + 1] * yh) * sh;
      if (!this.pinSet || red) { px[k] = tx; py[k] = ty; } else { const dx = tx - px[k], dy = ty - py[k]; if (dx * dx + dy * dy > 0.36) moved = true; px[k] = px[k] + dx * 0.055; py[k] = py[k] + dy * 0.055; }
    }
    this.pinSet = true;
    /* ghost trail: only while the map is actually warping, so a settled map is clean */
    if (moved && !red && (this.fc % TRSTEP) === 0) {
      const hh = this.trH;
      for (let k = 0; k < NPIN; k++) { const o = (k * TRN + hh) * 2; tr[o] = px[k]; tr[o + 1] = py[k]; }
      this.trH = (hh + 1) % TRN; if (this.trN < TRN) this.trN++;
    } else if (!moved && this.trN > 0 && (this.fc % 6) === 0) this.trN--;
    if (al <= 0) return;
    const nT = this.trN;
    if (nT > 1 && !red) {
      for (let k = 0; k < NPIN; k++) {
        for (let j = 0; j < nT; j++) {
          const idx = (this.trH - nT + j + TRN * 2) % TRN, o = (k * TRN + idx) * 2, f = (j + 1) / nT;
          g.fillStyle = 'rgba(216,210,234,' + (0.05 + f * 0.2) * al + ')'; /* same neutral as the ring: a trail is a mark, not a provenance */
          g.beginPath(); g.arc(tr[o], tr[o + 1], 1 + f * 1.4, 0, TAU); g.fill();
        }
      }
    }
    /* atlas: rings keep their screen size under the camera (the overlay is drawn in world px, scaled by the zoom) */
    const zs = this.atlasOn && ctx && ctx.view && ctx.view.mode === 'pan' ? 1 / Math.sqrt(ctx.view.z || 1) : 1;
    const r = (red ? 7 : 7 + bands.low * 2.2) * zs;
    g.lineWidth = 1.4 * zs;
    for (let k = 0; k < NPIN; k++) {
      /* held-still ring in white, not a provenance colour: it marks "this artist is being watched",
         which is a different fact from who pressed play on them */
      g.strokeStyle = 'rgba(216,210,234,' + 0.85 * al + ')';
      g.beginPath(); g.arc(px[k], py[k], r, 0, TAU); g.stroke();
      if (curve || k >= this.nLabel || this.atlasOn) continue; /* atlas: the names are DOM labels (D10) */
      const sm = this.small, wdt = sm ? this.pinW[k] * 0.88 : this.pinW[k], leftSide = px[k] + 11 + wdt > sx + sw;
      const lx = leftSide ? px[k] - 11 - wdt : px[k] + 11, ly = py[k] + 4;
      g.fillStyle = 'rgba(10,1,24,.82)'; g.fillRect(lx - 4, ly - 11, wdt, 16);
      g.font = sm ? '600 10px ui-monospace, Menlo, monospace' : '600 11px ui-monospace, Menlo, monospace';
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = 'rgba(240,234,255,.95)'; g.fillText(this.pinName[k], lx, ly);
    }
  },
};
