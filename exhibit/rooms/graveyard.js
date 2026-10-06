/* room 7: tap a claim. the field falls into a null histogram (amber: a null is chance), then my
   real number drops in last as one ink mark. buried = killed, outside = survived.
   data: exhibit/data/killit.json.
   atlas (BUILD_SPEC_V2 §3): at rest a glyph cemetery, one grave per buried finding, each named by a label (two that
   touch a date stay in the list). a run grids the null's glyphs to the pile's bins; angles: ground, a kill, a survivor. */

const SHORT = [
  'even on a relearned map, my picks bridge more than autoplay does',
  'my network has real topological loops, not just tight clusters',
  'when i tap, i cross genre-families more than habit alone predicts',
  'by play, hip-hop/r&b is over-tapped beyond bucket-size noise; per track it reverses',
];
const NULL_TXT = "a null is what the number looks like when the effect isn't there. i scramble the part that would carry the effect and recompute, hundreds of times.";
const STONE_LINE = 'sixteen of my findings died this way.';
const CAVEAT = 'four of my pre-declared tests are runnable here. two survived. the other twelve kills are in the lab, and most of them are not this pretty.';
/* atlas words (round 2b honesty, R2_VERIFY_1_honesty P1-1, P2-2, P2-3). ?atlas=0 keeps HEAD's words above (the off switch
   is HEAD, D4), and so does the hidden copy of HEAD's panel that places the desktop verdict. case 2 survives only against
   the model pooled over both arms (the tap-only markov floor killed it, ledger 215); the hip-hop card is post-hoc, as the
   wall label says; killit's sixteen buried are separate from the four cards, and not all of them died against a pile.
   the hip-hop card claims only what case 3 tested, a per-play ratio against play-count-matched random groups: no intent,
   no unit other than plays (R2_VERIFY_2_honesty P1-4) */
const SHORT_A = [SHORT[0], SHORT[1], 'when i tap, i cross genre-families more than a model pooled over my taps and autoplay predicts', 'by play, hip-hop/r&b is over-tapped beyond bucket-size noise; per track it reverses'];
const TAG_A = { 3: '(added after)' };
const STONE_A = 'sixteen more are buried in the lab.';
const CAVEAT_A = 'four of my tests are runnable here; the hip-hop one is a check i added after the fact. two survived. sixteen other kills are in the lab, and most of them are not this pretty.';
const V_K = "it's buried in the pile. this one died.";
const V_S = 'it stands outside the pile. this one lived.';
const VS = (c, a) => c.v === 'k' ? V_K : V_S + (a && /intent/.test(c.r) ? ' the agency reading of it died at door 3.' : '');
/* AX: the histogram + marker share one honest scale, but only fill this much of the stage width —
   the rest stays empty black so a survivor (whose value sits past almost all of the pile's mass)
   has somewhere to visibly stand instead of pinning itself to the frame edge. */
const AX = 0.68;
/* atlas: the least share of the stage's height the pile keeps (the verdict plate's fine print gives way first) */
const PILE_MIN = 0.4;
/* atlas: how far the stage's height may move under a standing pile before the pile is cut again (the chrome's hint slot) */
const KEEP_DH = 64, KEEP_OVER = 6;
/* atlas: a buried finding's mound after a run, bottom row up: [row, cells, trail weight] (mounds(), moundLines()). K1 trail
   cells in a categorical room are drawn with marks that belong to no family (· and ¦), in --mute: decoration, never data */
const MOUND_ROWS = [[0, 5, 0.3], [1, 3, 0.4], [2, 1, 0.5]];
const MOUND_HUE = 0xa49bbd; /* --mute */

const TPL = `<div class="gv-pn">
<div class="gv-cards"></div>
<p class="gv-null"></p>
<div class="gv-result" hidden>
<p class="gv-status" aria-live="polite" tabindex="-1"></p>
<p class="gv-nums"></p>
<p class="gv-x"></p>
<p class="gv-rule"></p>
<button type="button" class="btn ghost gv-again">run another</button>
</div>
<div class="gv-buried">
<p class="gv-stoneline"></p>
<button type="button" class="gv-sixteen" aria-expanded="false">the sixteen</button>
<ul class="gv-sixteen-list" hidden></ul>
</div>
<p class="gv-caveat"></p>
</div>`;
/* atlas (verify r3 P1-11): the pile owns the middle of the stage. above it one mono line, the claim ▾: the claim is
   the card that runs, the ▾ opens the other three in place. under the mine marker the verdict is a plate: the verdict,
   its numbers, then in finer print what the test found and the rule it was judged by, word for word as ?atlas=0 prints
   them (round 2, W33: every number the old room showed is on screen after a run, the rule's 5% / 10% included). the rest
   (what a null is, the sixteen, the caveat) is a foot in the wall text, folded away under more ▾ */
const TPL_A = `<div class="gv-pn gv-pick">
<div class="gv-cards" id="gv-cards" role="group" aria-label="my findings: pick one and try to kill it"></div>
<button type="button" class="gv-drop" aria-expanded="false" aria-controls="gv-cards" aria-label="the other findings"><span aria-hidden="true">▾</span></button>
<button type="button" class="gv-again" hidden aria-label="back to the graves" title="back to the graves"><span aria-hidden="true">↺</span></button>
</div>
<div class="gv-result" hidden>
<p class="gv-status" aria-live="polite" tabindex="-1"></p>
<p class="gv-nums"></p>
<div class="gv-fine"><p class="gv-x"></p><p class="gv-rule"></p></div>
</div>
<ul class="gv-sixteen-list" id="gv-sixteen-list" hidden></ul>`;
/* the foot goes into the room's own wall text as a `say dim`: the chrome folds that under more ▾ (html.ai-less) and
   unfolds it in the wall column, so it never takes the pile's room on the stage. before a run it also carries the rule
   the claim on the picker line will be judged by (.gv-rulepre), so the threshold is readable before anything falls */
const FOOT_A = `<p class="gv-null"></p>
<p class="gv-rulepre"></p>
<div class="gv-buried"><p class="gv-stoneline"></p><button type="button" class="gv-sixteen" aria-expanded="false" aria-controls="gv-sixteen-list">the sixteen</button></div>
<p class="gv-caveat"></p>`;

const CSS = `html:not(.atlas) section[data-room=graveyard] .gv-pn{position:absolute;display:flex;flex-direction:column;gap:12px;overflow-y:auto;-webkit-overflow-scrolling:touch}
html:not(.atlas) section[data-room=graveyard] .gv-pn.more{-webkit-mask-image:linear-gradient(#000 calc(100% - 28px),transparent);mask-image:linear-gradient(#000 calc(100% - 28px),transparent)}
html:not(.atlas) section[data-room=graveyard] .gv-cards{display:flex;flex-direction:column;gap:8px;margin-top:auto}
html:not(.atlas) section[data-room=graveyard] .gv-card{display:flex;align-items:center;gap:10px;min-height:44px;padding:10px 14px;border:1px solid var(--line);border-radius:10px;background:rgba(10,1,24,.55);color:var(--ink);font:500 12.5px/1.35 var(--mono);text-align:left;cursor:pointer}
html:not(.atlas) section[data-room=graveyard] .gv-card:hover,html:not(.atlas) section[data-room=graveyard] .gv-card:focus-visible{border-color:var(--ice)}
html:not(.atlas) section[data-room=graveyard] .gv-card:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
html:not(.atlas) section[data-room=graveyard] .gv-card[disabled],html:not(.atlas) section[data-room=graveyard] .gv-card[aria-disabled=true]{opacity:.3;cursor:default}
html:not(.atlas) section[data-room=graveyard] .gv-status:focus{outline:none}
html:not(.atlas) section[data-room=graveyard] .gv-status:focus-visible{outline:2px solid var(--ice);outline-offset:3px;border-radius:2px}
html:not(.atlas) section[data-room=graveyard] .gv-card span{flex:1}
html:not(.atlas) section[data-room=graveyard] .gv-null,html:not(.atlas) section[data-room=graveyard] .gv-x,html:not(.atlas) section[data-room=graveyard] .gv-rule,html:not(.atlas) section[data-room=graveyard] .gv-stoneline,html:not(.atlas) section[data-room=graveyard] .gv-caveat{margin:0;font:400 11.5px/1.55 var(--mono);color:var(--mute)}
/* the plume falls through this copy: 11.5px mono with amber dots scattered through the glyphs was unreadable.
   the loose lines get the same dark pill the cards and the listeners cue already use. */
html:not(.atlas) section[data-room=graveyard] .gv-null,html:not(.atlas) section[data-room=graveyard] .gv-result,html:not(.atlas) section[data-room=graveyard] .gv-buried,html:not(.atlas) section[data-room=graveyard] .gv-caveat{background:rgba(10,1,24,.74);border-radius:10px;padding:8px 12px;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
html:not(.atlas) section[data-room=graveyard] .gv-result{display:flex;flex-direction:column;gap:6px}
html:not(.atlas) section[data-room=graveyard] .gv-status{margin:0;min-height:1.3em;font:600 13.5px/1.4 var(--mono)}
html:not(.atlas) section[data-room=graveyard] .gv-status.k{color:var(--rose)}
html:not(.atlas) section[data-room=graveyard] .gv-status.s{color:var(--mint)}
html:not(.atlas) section[data-room=graveyard] .gv-nums{margin:0;font:500 12px/1.4 var(--mono);color:var(--ink)}
html:not(.atlas) section[data-room=graveyard] .gv-again{align-self:flex-start}
html:not(.atlas) section[data-room=graveyard] .gv-card.on{border-color:var(--ice)}
html:not(.atlas) section[data-room=graveyard] .gv-pn.ran .gv-null{display:none}
html:not(.atlas) section[data-room=graveyard] .gv-pn.ran .gv-card:not(.on){display:none}
html:not(.atlas) section[data-room=graveyard] .gv-buried{margin-top:4px}
html:not(.atlas) section[data-room=graveyard] .gv-sixteen{margin:-12px 0 -14px -8px;padding:0 8px;min-height:44px;min-width:44px;border:0;background:none;color:var(--ice);font:500 11.5px/1.4 var(--mono);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
html:not(.atlas) section[data-room=graveyard] .gv-sixteen:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
html:not(.atlas) section[data-room=graveyard] .gv-sixteen-list{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:5px 16px}
html:not(.atlas) section[data-room=graveyard] .gv-sixteen-list li{font:400 11px/1.4 var(--mono);color:var(--mute)}
@media (max-height:720px) and (max-aspect-ratio:115/100){
html:not(.atlas) section[data-room=graveyard] .gv-pn{gap:5px}
html:not(.atlas) section[data-room=graveyard] .gv-cards{display:grid;grid-template-columns:1fr 1fr;gap:5px}
html:not(.atlas) section[data-room=graveyard] .gv-card{font-size:10.6px;line-height:1.2;padding:5px 8px;min-height:34px}
html:not(.atlas) section[data-room=graveyard] .gv-null,html:not(.atlas) section[data-room=graveyard] .gv-stoneline,html:not(.atlas) section[data-room=graveyard] .gv-caveat{font-size:10.2px;line-height:1.38}
html:not(.atlas) section[data-room=graveyard] .gv-x,html:not(.atlas) section[data-room=graveyard] .gv-rule{font-size:10.2px;line-height:1.32}
html:not(.atlas) section[data-room=graveyard] .gv-status{font-size:12.5px}
html:not(.atlas) section[data-room=graveyard] .gv-result{gap:4px}
/* after a run, the one surviving card no longer needs to share a row — give it the full width back,
   and drop the aggregate graveyard (stones/line/caveat) so the direct result never has to compete
   with it for the little height a short phone has. */
html:not(.atlas) section[data-room=graveyard] .gv-pn.ran .gv-cards{display:flex}
html:not(.atlas) section[data-room=graveyard] .gv-pn.ran .gv-buried,html:not(.atlas) section[data-room=graveyard] .gv-pn.ran .gv-caveat{display:none}
}`;

/* atlas layout: every block is placed in viewport px by layoutA(); nothing here sets a position */
const S_ = 'html.atlas section[data-room=graveyard] ';
const CSS_A = [
  S_ + '.gv-pick{position:absolute;display:flex;align-items:flex-start;gap:2px;pointer-events:none;font:500 12.5px/1.35 var(--mono);color:var(--ink)}',
  S_ + '.gv-pick>*{pointer-events:auto}',
  S_ + '.gv-cards{flex:0 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
  S_ + '.gv-card{display:flex;align-items:center;min-height:44px;width:100%;padding:0 4px;border:0;border-radius:4px;background:none;color:var(--ink);font:inherit;text-align:left;cursor:pointer}',
  S_ + '.gv-card>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  S_ + '.gv-card:hover>span{text-decoration:underline;text-decoration-color:var(--ice);text-underline-offset:3px}',
  S_ + '.gv-tag{color:var(--mute)}',
  S_ + '.gv-card:focus-visible,' + S_ + '.gv-drop:focus-visible,' + S_ + '.gv-again:focus-visible,' + S_ + '.gv-sixteen:focus-visible{outline:2px solid var(--ice);outline-offset:-2px}',
  S_ + '.gv-card[aria-disabled=true]{cursor:default}',
  S_ + '.gv-cards:not(.open) .gv-card:not(.cur){display:none}',
  /* the ▾ opens the list in place, on a plate over the pile's top; the claim on show is marked */
  S_ + '.gv-cards.open{background:rgba(10,1,24,.9);border:1px solid var(--line);border-radius:6px;padding:3px;box-shadow:0 10px 30px rgba(0,0,0,.45)}',
  S_ + '.gv-cards.open .gv-card>span{white-space:normal}',
  /* a claim that wraps to three lines outgrows the 44 px row and would sit 2 px from the next; keep one rhythm */
  S_ + '.gv-cards.open .gv-card{padding:5px 4px}',
  S_ + '.gv-cards.open .gv-card.cur{color:var(--ice)}',
  S_ + '.gv-drop,' + S_ + '.gv-again{flex:0 0 auto;min-width:44px;min-height:44px;padding:0;border:0;border-radius:4px;background:none;color:var(--ice);font:500 14px/1 var(--mono);cursor:pointer}',
  S_ + '.gv-drop[aria-expanded=true] span{display:inline-block;transform:rotate(180deg)}',
  S_ + '.gv-again{margin-left:6px;color:var(--mute)}',
  S_ + '.gv-again:hover{color:var(--ice)}',
  /* the verdict: a plate under the mine marker */
  S_ + '.gv-result{position:absolute;display:flex;flex-direction:column;gap:2px;padding:7px 11px;border:1px solid var(--line);border-radius:6px;background:rgba(10,1,24,.84);pointer-events:auto;max-width:min(460px,calc(100vw - 32px));box-sizing:border-box}',
  S_ + '.gv-result[hidden]{display:none}',
  S_ + '.gv-off,' + S_ + '.gv-off *{visibility:hidden!important;pointer-events:none!important}',
  /* the fine print under the verdict: what the test found, then the rule it was judged by (a thin ice rule marks it) */
  S_ + '.gv-fine{display:flex;flex-direction:column;gap:4px;margin-top:5px;padding-top:6px;border-top:1px solid var(--line)}',
  S_ + '.gv-fine p{margin:0;font:400 11px/1.45 var(--mono);color:var(--mute)}',
  S_ + '.gv-fine .gv-rule{padding-left:8px;border-left:1px solid rgba(134,203,254,.5)}',
  S_ + '.gv-result.gv-narrow .gv-fine p{font-size:10.5px;line-height:1.42}',
  S_ + '.gv-result.gv-tiny .gv-fine{margin-top:3px;padding-top:4px;gap:2px}',
  S_ + '.gv-result.gv-tiny .gv-fine p{font-size:10px;line-height:1.38}',
  S_ + '.gv-status{margin:0;font:600 13px/1.35 var(--mono)}',
  S_ + '.gv-status.k{color:var(--rose)}',
  S_ + '.gv-status.s{color:var(--mint)}',
  S_ + '.gv-status:focus{outline:none}',
  S_ + '.gv-status:focus-visible{outline:2px solid var(--ice);outline-offset:3px;border-radius:2px}',
  /* the phone plate stacks its lines 1-2 px apart, so a ring round the verdict line cut through the numbers under it: there
     the ring goes round the plate (desktop's HEAD box has the room for the line's own ring) */
  S_ + '.room-body:not(.gv-hg) .gv-status:focus-visible{outline:none}',
  S_ + '.room-body:not(.gv-hg) .gv-result:has(.gv-status:focus-visible){outline:2px solid var(--ice);outline-offset:2px}',
  S_ + '.gv-nums{margin:0;font:500 11.5px/1.35 var(--mono);color:var(--ink)}',
  S_ + '.gv-result.gv-narrow .gv-status{font-size:12px}',
  S_ + '.gv-result.gv-narrow .gv-nums{font-size:10.5px}',
  S_ + '.gv-result.gv-tiny{padding:4px 6px;gap:1px}',
  S_ + '.gv-result.gv-tiny .gv-status{font-size:10.5px}',
  S_ + '.gv-result.gv-tiny .gv-nums{font-size:10px}',
  /* the foot: the rest, in mono, in the wall column; the chrome's more ▾ folds it (.say.dim) */
  S_ + '.wall .gv-more{display:flex;flex-direction:column;gap:6px;margin:12px 0 4px;max-width:34rem}',
  S_ + '.gv-more p{margin:0;font:400 11.5px/1.5 var(--mono);color:var(--mute)}',
  S_ + '.gv-more.ran .gv-null,' + S_ + '.gv-more.ran .gv-rulepre,' + S_ + '.gv-more:not(.ran) .gv-x,' + S_ + '.gv-more:not(.ran) .gv-rule{display:none}',
  S_ + '.gv-fine:empty{display:none}',
  S_ + '.gv-buried{display:flex;flex-wrap:wrap;align-items:center;column-gap:10px}',
  S_ + '.gv-sixteen{margin:-12px 0 -14px -8px;padding:0 8px;min-height:44px;min-width:44px;border:0;background:none;color:var(--ice);font:500 11px/1.45 var(--mono);text-decoration:underline;text-underline-offset:2px;cursor:pointer}',
  'html.atlas.ai-less section[data-room=graveyard] .gv-more{display:none}',
  S_ + '.gv-sixteen-list{position:absolute;list-style:none;margin:0;padding:10px 12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:5px 16px;overflow-y:auto;overscroll-behavior:contain;background:rgba(10,1,24,.92);border:1px solid var(--line);border-radius:6px;pointer-events:auto}',
  S_ + '.gv-sixteen-list[hidden]{display:none}',
  S_ + '.gv-sixteen-list li{font:400 11px/1.4 var(--mono);color:var(--mute)}',
  S_ + '.gv-sixteen-list li.gv-mark{color:var(--ice)}',
  /* desktop (.gv-hg): the plate takes HEAD's verdict box, padding, gaps and type, so every line of it lands where ?atlas=0
     prints it; no border (a hairline would move the text by a pixel), a scrim that fades out to the right instead of a slab */
  S_ + '.gv-hg .gv-result{gap:6px;padding:8px 12px;border:0;border-radius:10px 0 0 10px;max-width:none;box-sizing:border-box;background:linear-gradient(90deg,rgba(10,1,24,.9),rgba(10,1,24,.78) 50%,rgba(10,1,24,0))}',
  S_ + '.gv-hg .gv-status{font:600 13.5px/1.4 var(--mono);align-self:flex-start}',
  S_ + '.gv-hg .gv-nums{font:500 12px/1.4 var(--mono)}',
  S_ + '.gv-hg .gv-fine{display:contents}',
  S_ + '.gv-hg .gv-fine p{font:400 11.5px/1.55 var(--mono)}',
  S_ + '.gv-hg .gv-fine .gv-rule{position:relative;padding-left:0;border-left:0}',
  S_ + '.gv-hg .gv-fine .gv-rule::before{content:"";position:absolute;left:-8px;top:4px;bottom:4px;width:1px;background:rgba(134,203,254,.5)}',
].join('\n');
/* desktop (round 2b, D3: every number within 1 px of ?atlas=0). a hidden copy of HEAD's own panel (its template, its CSS,
   HEAD's words, every class renamed gvh- so no atlas rule reaches it) is laid out on the stage the way HEAD's layout() lays
   it out after a run; the plate then stands on its verdict box and the picker line on its claim card */
const TPL_H = TPL.replace(/\bgv-/g, 'gvh-').replace(/ aria-live="polite"| tabindex="-1"/g, '');
const CSS_H = CSS.replace(/html:not\(\.atlas\) section\[data-room=graveyard\] /g, 'html.atlas section[data-room=graveyard] .gvh-root ').replace(/\.gv-/g, '.gvh-') +
  '\nhtml.atlas section[data-room=graveyard] .gvh-root,html.atlas section[data-room=graveyard] .gvh-root *{visibility:hidden!important;pointer-events:none!important}';

const KIOSK = /[?&]kiosk=1\b/.test(location.search);
const atlasOn = (ctx) => !!(ctx && ctx.atlas && ctx.atlas.on);
/* atlas: the buried names that touch a date get no floating label until the owner confirms (§14 flag 7) */
const HELD = [/^a known date/, /^pelt event attribution/];
/* atlas angles: the ground, the kill case (0: the relearned map) and the survivor the scientists caption quotes (3) */
const ANGLE_CASE = { kill: 0, survive: 3 };
const RUN_MS = 4000 + 900 + 650 + 120; /* release + settle + drop, then a breath: the tour holds only once settled */
/* ground colours: violet soil and mounds, ink headstones (no provenance hue: nothing here is a tap, a shuffle or a serve) */
const SOIL = 0x57507a, STONE = 0xd8d2ea, MOUND = 0x7d74a6;
const shortName = (t) => { const k = String(t).indexOf(':'); return k > 0 ? String(t).slice(0, k) : String(t); };
const INK = '#d8d2ea', INK_RGB = '216,210,234';
function mix(a, b, t) {
  const c = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
}
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
  atl: false, graves: [], buriedT: [], binTop: null, cellCss: 6, cellT: -1e9, hudT: 0, hudPct: -1,
  angles: [{ id: 'ground', name: 'the ground' }, { id: 'kill', name: 'a kill' }, { id: 'survive', name: 'a survivor' }, { id: 'gates', name: 'thirteen gates' }],
  ladderNote: (a) => (a === 'gates' ? 'the doors are drawn to shape' : undefined),
  async mount(root, ctx) {
    this.root = root;
    const A = atlasOn(ctx);
    const st = document.createElement('style'); st.textContent = A ? CSS + '\n' + CSS_A + '\n' + CSS_H : CSS; document.head.appendChild(st);
    root.innerHTML = A ? TPL_A : TPL;
    if (A) { /* the foot, in the wall text before its `go deeper` link */
      const wall = root.parentElement && root.parentElement.querySelector('.wall'), foot = document.createElement('div');
      foot.className = 'say dim gv-more'; foot.innerHTML = FOOT_A;
      if (wall) { const dp = wall.querySelector('.deeper'); if (dp) wall.insertBefore(foot, dp); else wall.appendChild(foot); } else root.appendChild(foot);
    }
    const Q = { pn: '.gv-pn', cd: '.gv-cards', nl: '.gv-null', rs: '.gv-result', ss: '.gv-status', nm: '.gv-nums', xEl: '.gv-x', ru: '.gv-rule', rp: '.gv-rulepre', ag: '.gv-again', sxBtn: '.gv-sixteen', sxList: '.gv-sixteen-list', sl: '.gv-stoneline', cv: '.gv-caveat', drop: '.gv-drop', more: '.gv-more' };
    const sec = root.parentElement || root;
    for (const k in Q) this[k] = sec.querySelector('.room-body ' + Q[k] + ', .wall .gv-more ' + Q[k] + ', .wall ' + Q[k]) || root.querySelector(Q[k]);
    if (A) this.mountAtlas(ctx);
    this.nl.textContent = NULL_TXT;
    this.sl.textContent = A ? STONE_A : STONE_LINE;
    this.cv.textContent = A ? CAVEAT_A : CAVEAT;
    this.ag.addEventListener('click', () => this.again(ctx, true));
    /* the verdict takes focus after a run; space there would otherwise reach the shell as 'next room' */
    this.ss.addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); } });
    this.pn.addEventListener('scroll', () => this.checkScroll(), { passive: true });
    /* any hand in the room during the first-visit run takes over: the run stops and the cards come back */
    this._onHand = (e) => {
      if (!e.isTrusted) return;
      this._autoDone = true;
      /* V4 gesture P2-4: a press on the panel itself only stops the auto-run timer; the full again() reset ran
         around the tap and re-closed the list it had just opened (first phone tap swallowed). the panel's own
         handlers cancel the run when they act. */
      if (this.pn && e.target && e.target.nodeType === 1 && this.pn.contains(e.target)) { if (this._autoT) { clearTimeout(this._autoT); this._autoT = 0; } this.unhook(); this._auto = false; return; }
      this.cancelAuto(ctx);
    };
    /* deep-linked straight here: a hand that arrives before the room has finished entering counts too */
    if (location.hash === '#' + this.id && !KIOSK) { addEventListener('pointerdown', this._onHand, { passive: true }); addEventListener('keydown', this._onHand); }
    this.sxBtn.addEventListener('click', () => {
      const open = this.sxList.hidden;
      if (open && this.drop) this.placeSixteen();
      this.sxList.hidden = !open;
      this.sxBtn.setAttribute('aria-expanded', String(open));
      this.checkScroll();
    });
    this.cum = new Float32Array(24);
    this.cases = [];
    try {
      const d = await ctx.data('killit');
      this.cases = (d && d.cases) || [];
      this.cases.forEach((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'gv-card';
        const claim = document.createElement('span'); claim.textContent = (A ? SHORT_A : SHORT)[i] || c.c;
        if (A && TAG_A[i]) { const tg = document.createElement('span'); tg.className = 'gv-tag'; tg.textContent = ' ' + TAG_A[i]; claim.appendChild(tg); }
        b.appendChild(claim);
        if (A && i === 0) b.classList.add('cur'); /* atlas: the line shows one claim, the first until another runs */
        b.addEventListener('click', () => { if (this._busy) return; if (this.drop) this.openList(false); this.run(ctx, i, true); });
        this.cd.appendChild(b);
      });
      this.preRule();
      const buried = ((d && d.buried) || []).map((t) => (A ? t.replace('p = 0.0000', 'p ≤ 0.0001') : t)); /* a zero p is a rounding artefact; the atlas says the bound */
      this.buriedT = buried.slice();
      buried.forEach((title) => {
        const li = document.createElement('li'); li.textContent = title;
        this.sxList.appendChild(li);
      });
    } catch (e) {
      const p = document.createElement('p'); p.className = 'gv-null'; p.textContent = 'the graveyard data did not load.';
      this.cd.replaceWith(p);
    }
    this.ready = true;
    if (A) import('./graveyard.dead.js' + new URL(import.meta.url).search).then((m) => m.default(this, ctx)).catch(() => {});
    this.checkScroll();
  },
  /* atlas controls: the ▾ opens the claims in place (escape or a press anywhere else folds them), the ↺ goes back to the
     graves; escape or a press elsewhere also folds the sixteen */
  mountAtlas(ctx) {
    this.drop.addEventListener('click', () => this.openList(!this.cd.classList.contains('open')));
    /* escape folds the open claims wherever focus is (safari does not focus a clicked button, so the key reaches <body>);
       capture, so it folds this first and goes no further */
    addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !this.cd.classList.contains('open') || !this.active()) return; e.preventDefault(); e.stopPropagation(); this.openList(false); this.drop.focus({ preventScroll: true }); }, true);
    this._outside = (e) => {
      if (this.cd.classList.contains('open') && !this.pn.contains(e.target)) this.openList(false);
      if (!this.sxList.hidden && !this.sxList.contains(e.target) && e.target !== this.sxBtn) this.sixteen(false);
    };
    addEventListener('pointerdown', this._outside, { capture: true, passive: true });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.sxList.hidden && this.active()) { e.stopPropagation(); this.sixteen(false); } }, true);
  },
  active() { const sec = this.root && this.root.parentElement; return !!sec && sec.classList.contains('is-active'); },
  openList(on) {
    if (!this.drop) return;
    this.cd.classList.toggle('open', !!on); this.drop.setAttribute('aria-expanded', String(!!on));
  },
  sixteen(on) {
    this.sxList.hidden = !on; this.sxBtn.setAttribute('aria-expanded', String(!!on));
    if (!on) [].forEach.call(this.sxList.children, (li) => li.classList.remove('gv-mark'));
  },
  /* atlas (verify r3 P1-11): the picker line at the stage's top, the pile in the middle, then the marker's number and the
     verdict plate. the chrome's bottom hint line, where it lies over the stage (a phone held upright), is kept clear */
  layoutA(ctx) {
    const s = ctx.stage();
    this._hg = this.headGeo(s, ctx);
    this.root.classList.toggle('gv-hg', this._hg);
    if (this._hg) { this.layoutHead(ctx, s); return; }
    this.rs.style.width = '';
    const short = s.h < 400; /* a 320 x 568 phone or a phone held sideways: tighter margins, a smaller plate */
    const top = s.y + (short ? 2 : Math.max(4, Math.round(s.h * 0.025)));
    this.pn.style.left = Math.round(s.x) + 'px'; this.pn.style.top = Math.round(top) + 'px'; this.pn.style.maxWidth = Math.round(s.w) + 'px';
    const pickB = top + 44;
    let bottom = s.y + s.h;
    /* a phone's unfolded card (more ▾) takes the stage down to a sliver: the picker line and the verdict plate would sit on
       the card's own text there, so they stand down until the card folds again (the pile stays, under the card) */
    this._tiny = s.h < 140; this.pn.classList.toggle('gv-off', this._tiny); this.rs.classList.toggle('gv-off', this._tiny);
    const ob = document.getElementById('atlas-onboard');
    if (ob && !ob.hidden) { const r = ob.getBoundingClientRect(); if (r.height && r.top < bottom && r.top > s.y + s.h * 0.5 && r.right > s.x && r.left < s.x + s.w) bottom = r.top - 6; }
    this.rs.classList.toggle('gv-narrow', s.w < 480); this.rs.classList.toggle('gv-tiny', s.w < 340 || short);
    this.rs.style.maxWidth = Math.round(Math.min(460, s.w)) + 'px';
    /* the plate's band is the tallest of the four verdicts at this width (its fine print wraps to two or three lines), so
       whichever claim runs, its plate fits under the pile and above the chrome. the pile keeps at least PILE_MIN of the
       stage's height: on a short stage (a small phone, one held sideways) the finding's line, then the rule, step down
       into the foot under more ▾ (shown there after a run), and the plate keeps the verdict and its numbers */
    const MARK = short ? 27 : 30, pileTop = pickB + (short ? 26 : Math.max(30, Math.round(s.h * 0.04)));
    /* a pile standing (or falling) stays where it is when the stage's height moved by no more than the chrome's hint slot
       (KEEP_DH) and the plate still fits under it: the slot empties as a run starts and refills as it settles (a phone's
       stage grows ~35 px, then shrinks), and re-cutting the pile for each of those slid every grain up and down the screen
       at the very moment it settled. a bigger change (a card unfolded and folded, a rotation) lays the pile out afresh */
    const L = this._lay, P0 = this._pileA;
    /* (round 2b) the plate may run up to KEEP_OVER past a stage that shrank a hair: a phone's caption gaining or losing a
       line moves the stage 2 px, and each re-cut then slid the settled pile and left its marker a cell off for a moment */
    const keep = this.state !== 'idle' && P0 && L && L.x === s.x && L.w === s.w && Math.abs(L.h - s.h) <= KEEP_DH && Math.abs(P0.y - pileTop) <= 4 && P0.y + P0.h + MARK + this._plateH <= bottom + KEEP_OVER;
    if (!keep) {
      let PLATE = 0;
      for (let lv = 0; lv <= 2; lv++) {
        this.placeFine(lv); PLATE = Math.max(short ? 44 : 52, this.plateMax() + 2);
        if (bottom - PLATE - MARK - pileTop >= PILE_MIN * s.h) break;
      }
      /* 26px over the pile's top: a survivor's number stands there, on its flagpole */
      const base = bottom - PLATE - MARK;
      this._pileA = { x: s.x, y: pileTop, w: s.w, h: Math.max(short ? 60 : 80, base - pileTop) };
      this._plateY = this._pileA.y + this._pileA.h + MARK; this._plateH = PLATE;
      this._lay = { x: s.x, w: s.w, h: s.h }; /* the stage this pile was cut for */
    }
    /* the ground (at rest, before any run) has no plate to leave room for: the cemetery takes the band down to the stage's
       foot, so the graves and their names spread out instead of crowding into the pile's band over an empty strip */
    this._groundA = { x: s.x, y: pileTop, w: s.w, h: Math.max(this._pileA.h, bottom - (short ? 8 : 14) - pileTop) };
    this.layGraves(ctx);
    this.placePlate(); this.placeSixteen();
  },
  /* HEAD's geometry (desktop D3; phones keep the layout above under the "shown somewhere" ruling): on a screen not held
     upright, and not a phone on its side (a coarse pointer on a stage under 420 tall), the atlas stands HEAD's pile on
     HEAD's band, so the baseline, the marker and `mine · x` fall on HEAD's pixels, and the verdict's lines on HEAD's too */
  headGeo(s, ctx) {
    if (s.w < 480 || (s.h < 420 && ctx.coarse)) return false;
    try { return !matchMedia('(max-aspect-ratio: 115/100)').matches; } catch (e) { return innerWidth > innerHeight * 1.15; }
  },
  layoutHead(ctx, s) {
    const f = s.h < 420 ? 0.3 : 0.46, pr = { x: s.x, y: s.y + s.h * (0.98 - f), w: s.w, h: s.h * f }; /* pile(): HEAD's own expression */
    this._tiny = false; this.pn.classList.remove('gv-off'); this.rs.classList.remove('gv-off', 'gv-narrow', 'gv-tiny');
    this.placeFine(0);
    const G = this._ghost = this.ghostAll(s);
    /* the picker line stands where HEAD's claim card stood (the highest of the four), so a run never moves it and no
       verdict reaches up into it */
    let top = Infinity; for (const g of G) if (g && g.cardT < top) top = g.cardT;
    top = Math.max(s.y + 2, isFinite(top) ? top : s.y + Math.round(s.h * 0.025));
    this.pn.style.left = Math.round(s.x) + 'px'; this.pn.style.top = Math.round(top) + 'px'; this.pn.style.maxWidth = Math.round(s.w) + 'px';
    this._pickR = { l: s.x, t: top, r: s.x + s.w, b: top + 44 };
    this._pileA = pr; this._plateH = 0; this._lay = { x: s.x, w: s.w, h: s.h };
    /* the ground at rest: the band under the picker line down to the stage's foot (no verdict stands in it yet) */
    const gTop = top + 44 + Math.max(30, Math.round(s.h * 0.04)), bottom = s.y + s.h;
    this._groundA = { x: s.x, y: gTop, w: s.w, h: Math.max(pr.h, bottom - 14 - gTop) };
    this.layGraves(ctx);
    this.placePlate(); this.placeSixteen();
  },
  /* HEAD's panel after a run of each case, laid out hidden where HEAD lays it out (left s.x, top s.y, width s.w, height
     _runH, content pushed to the bottom): per case, the claim card's top and the verdict box. measured again when the
     stage or the fonts change */
  ghostAll(s) {
    const key = [s.x, s.y, s.w, s.h, this.cases.length, document.fonts ? document.fonts.status : ''].join(',');
    if (this._gKey === key && this._ghost) return this._ghost;
    if (!this._gh) {
      const w = this._gh = document.createElement('div'); w.className = 'gvh-root'; w.setAttribute('aria-hidden', 'true'); w.inert = true;
      w.innerHTML = TPL_H; this.root.appendChild(w);
      const q = (c) => w.querySelector('.gvh-' + c);
      /* HEAD's words that the atlas retired stand in as x-masks: this copy's type is monospaced, so a mask that keeps every
         space and mark (the line-break chances) wraps exactly as the words do, and the retired claims never sit in the DOM */
      const mask = (t) => t.replace(/[a-z0-9]/gi, 'x');
      q('null').textContent = mask(NULL_TXT); q('stoneline').textContent = mask(STONE_LINE); q('caveat').textContent = mask(CAVEAT); q('again').textContent = 'run another';
      const cd = q('cards'); SHORT.map(mask).forEach((t) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'gvh-card'; b.tabIndex = -1; const sp = document.createElement('span'); sp.textContent = t; b.appendChild(sp); cd.appendChild(b); });
      q('pn').classList.add('ran'); q('result').hidden = false;
      /* late fonts: measure again */
      if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { this._gKey = ''; if (this.atl && this.active() && this._ctx) this.layout(this._ctx); });
    }
    const w = this._gh, q = (c) => w.querySelector('.gvh-' + c), pn = q('pn'), cards = w.querySelectorAll('.gvh-card');
    const runH = Math.max(120, (s.y + s.h * 0.98) - s.h * (s.h < 420 ? 0.3 : 0.46) - 14 - s.y); /* HEAD's _runH */
    pn.style.left = s.x + 'px'; pn.style.top = s.y + 'px'; pn.style.width = s.w + 'px'; pn.style.height = runH + 'px';
    const out = this.cases.map((c, i) => {
      cards.forEach((b, k) => b.classList.toggle('on', k === i));
      const ss = q('status'); ss.className = 'gvh-status ' + (c.v === 'k' ? 'k' : 's'); ss.textContent = VS(c, this.atl);
      q('nums').textContent = this.numsOf(c); q('x').textContent = c.x; q('rule').textContent = c.r;
      pn.scrollTop = 0;
      const cr = cards[i] && cards[i].getBoundingClientRect(), rr = q('result').getBoundingClientRect();
      return { cardT: cr ? cr.top : s.y, l: rr.left, t: rr.top, w: rr.width, h: rr.height };
    });
    this._gKey = key;
    return out;
  },
  /* where the fine print lives: lv 0 both lines on the plate, 1 the finding's line in the foot, 2 both in the foot (after
     the pre-run rule, in ?atlas=0's order: the finding, then the rule) */
  placeFine(lv) {
    const fine = this.rs && this.rs.querySelector('.gv-fine'), x = this.xEl, ru = this.ru; if (!fine || !x || !ru || !this.more) return;
    const anchor = this.rp ? this.rp.nextSibling : this.more.firstChild;
    if (lv >= 2) { this.more.insertBefore(ru, anchor); this.more.insertBefore(x, ru); }
    else if (lv === 1) { if (ru.parentElement !== fine) fine.appendChild(ru); this.more.insertBefore(x, anchor); }
    else { fine.appendChild(x); fine.appendChild(ru); }
  },
  /* the plate's height for the tallest of the four verdicts, measured on a hidden copy (no live region, no focus stop) */
  plateMax() {
    if (!this.rs || !this.cases.length) return 0;
    const cl = this.rs.cloneNode(true), st = cl.style;
    cl.hidden = false; cl.setAttribute('aria-hidden', 'true');
    cl.querySelectorAll('[aria-live],[tabindex]').forEach((e) => { e.removeAttribute('aria-live'); e.removeAttribute('tabindex'); });
    const cx = cl.querySelector('.gv-x'), cr = cl.querySelector('.gv-rule');
    st.visibility = 'hidden'; st.pointerEvents = 'none'; st.left = '0px'; st.top = '0px';
    (this.rs.parentElement || this.root).appendChild(cl);
    const q = (s) => cl.querySelector(s); let h = 0;
    this.cases.forEach((c) => {
      q('.gv-status').textContent = VS(c, this.atl); q('.gv-nums').textContent = this.numsOf(c);
      if (cx) cx.textContent = c.x; if (cr) cr.textContent = c.r;
      h = Math.max(h, cl.offsetHeight);
    });
    cl.remove();
    return h;
  },
  numsOf(c) { return 'observed ' + rnd2(c.o) + ' · ' + c.sz + ' redraws · ' + ord(c.pc) + ' percentile'; },
  /* the verdict plate: centred under the marker's number, kept inside the stage */
  placePlate() {
    const pr = this._pileA; if (!pr || this.rs.hidden) return;
    if (this._hg) { /* desktop: on HEAD's verdict box, unrounded (HEAD's own lines are not rounded either) */
      const g = this._ghost && this._ghost[this.curCase]; if (!g) return;
      const st = this.rs.style; st.left = g.l + 'px'; st.top = g.t + 'px'; st.width = g.w + 'px'; st.maxWidth = 'none';
      return;
    }
    /* measured at the band's left edge: a shrink-to-fit box is squeezed by whatever room is left of its current left, so
       measured where the last verdict stood (a narrower plate pushed out under its marker) it reads narrow, is placed too
       far right, then widens past the stage (360x640, a survivor after a kill: 3 px out) */
    const st = this.rs.style; st.left = Math.round(pr.x) + 'px';
    const m = this.markerAt(), w = Math.min(this.rs.offsetWidth, pr.w), mx = m ? m.x : pr.x + pr.w / 2;
    st.left = Math.round(Math.max(pr.x, Math.min(pr.x + pr.w - w, mx - w / 2))) + 'px';
    st.top = Math.round(this._plateY) + 'px';
  },
  /* the sixteen: a list on a plate over the pile band (the foot is too short for it, and it must open from search too) */
  placeSixteen() {
    const pr = this._pileA; if (!pr) return;
    const L = this.sxList.style;
    if (this._tiny && this.sxBtn) { /* the stage is under the unfolded card: the list hangs from its own button instead */
      const r = this.sxBtn.getBoundingClientRect(), top = Math.round(r.bottom + 4), w = Math.min(innerWidth - 16, 560);
      L.left = Math.round(Math.max(8, Math.min(innerWidth - 8 - w, r.left))) + 'px'; L.top = top + 'px'; L.width = Math.round(w) + 'px'; L.maxHeight = Math.max(120, innerHeight - top - 64) + 'px';
      return;
    }
    const w = Math.min(pr.w - 16, 560);
    L.left = Math.round(pr.x + 8) + 'px'; L.top = Math.round(pr.y) + 'px'; L.width = Math.round(w) + 'px'; L.maxHeight = Math.round(pr.h) + 'px';
  },
  /* the panel's content is bottom-aligned (margin-top:auto on the cards), so its bottom edge is where the
     text meets the grains: at rest just above the horizon line, while a card runs just above the pile's top. */
  layout(ctx) {
    if (this.atl && this.drop) { this.layoutA(ctx); return; }
    const s = ctx.stage(), f = s.h < 420 ? 0.3 : 0.46, base = s.y + s.h * 0.98;
    this.pn.style.left = s.x + 'px'; this.pn.style.top = s.y + 'px'; this.pn.style.width = s.w + 'px';
    this._restH = Math.max(120, base - 22 - s.y);
    this._runH = Math.max(120, base - s.h * f - 14 - s.y);
    /* atlas: the ground below the panel is the cemetery, and the pile fills the same band later, so the panel keeps one
       height (and the labels one keepout) whether a card has run or not */
    if (this.atl) { this._restH = this._runH; this.pn.classList.toggle('gv-compact', s.w < 560 || s.h < 520); this.layGraves(ctx); }
    this.fit();
  },
  fit() {
    if (!this._restH) return;
    this.pn.style.height = (this.pn.classList.contains('ran') ? this._runH : this._restH) + 'px';
    this.checkScroll();
  },
  /* the panel is allowed to scroll as a last resort (some device/content combo we didn't anticipate),
     but it must never trap a visitor: no overscroll containment (so a swipe that hits the panel's own
     top/bottom keeps going and scrolls the page), and a bottom fade only appears when there is in fact
     more to see, as an honest affordance rather than a decoration. */
  checkScroll() {
    if (!this.pn) return;
    const pn = this.pn, more = pn.scrollHeight > pn.clientHeight + 1 && pn.scrollTop + pn.clientHeight < pn.scrollHeight - 2;
    pn.classList.toggle('more', more);
  },
  /* aria-disabled, not disabled: a disabled button drops keyboard focus to <body>, and the next space there is the shell's 'next room' */
  busy(b) {
    this._busy = b;
    const btns = this.cd.querySelectorAll('button'); for (let i = 0; i < btns.length; i++) btns[i].setAttribute('aria-disabled', b ? 'true' : 'false');
  },
  /* focus moves only for a run the visitor started, and only if focus is still in this room (or dropped to <body>) */
  mayFocus() {
    const sec = this.root && this.root.parentElement, a = document.activeElement;
    return !!sec && sec.classList.contains('is-active') && (!a || a === document.body || sec.contains(a));
  },
  /* every dot in the field is a grain. the pile fills the lower half of the stage; cards and verdict sit above it. */
  groundBand(ctx) { return this.atl && this._groundA ? this._groundA : this.pile(ctx); },
  pile(ctx) { if (this.atl && this._pileA) return this._pileA; const s = ctx.stage(), f = s.h < 420 ? 0.3 : 0.46; return { x: s.x, y: s.y + s.h * (0.98 - f), w: s.w, h: s.h * f }; },
  computePile(ctx, i) {
    const c = this.cases[i], P = ctx.particles, N = P.n, pr = this.pile(ctx);
    if (!this.gx || this.gx.length !== N) { this.gx = new Float32Array(N); this.gy = new Float32Array(N); this.rel = new Float32Array(N); this.out = new Uint8Array(N); }
    const cn = c.cn, bins = cn.length, colW = pr.w * AX / bins, maxC = Math.max.apply(null, cn) || 1;
    this.maxC = maxC; this.bins = bins; /* drawMarker reuses these so the marker is scaled from the exact same numbers that placed the grains */
    let tot = 0; for (let b = 0; b < bins; b++) tot += cn[b];
    const cumF = this.cum; let acc = 0; for (let b = 0; b < bins; b++) { acc += cn[b]; cumF[b] = acc / tot; }
    const top = this.binTop && this.binTop.length === bins ? this.binTop : (this.binTop = new Float32Array(bins)); top.fill(0);
    for (let k = 0; k < N; k++) {
      const u = ctx.hash(k * 13 + i * 7919 + 1); let b = 0; while (b < bins - 1 && u > cumF[b]) b++;
      const hb = cn[b] / maxC;
      this.gx[k] = pr.x + (b + 0.08 + ctx.hash(k * 3 + 1) * 0.84) * colW;
      const hk = ctx.hash(k * 5 + 2) * hb * pr.h;
      this.gy[k] = pr.y + pr.h - hk;
      if (hk > top[b]) top[b] = hk; /* the highest grain of each column: where its glyph stack really ends */
      this.rel[k] = ctx.hash(k * 11 + 5);
    }
    if (this.atl) { this.pileRect = pr; this._gspec = this.gridSpec(ctx, pr, bins); this.mounds(ctx); }
    return pr;
  },
  ground(ctx) { /* idle: a quiet horizon of grains along the baseline */
    if (this.atl) { this.groundAtlas(ctx); return; }
    const P = ctx.particles, pr = this.pile(ctx), fog = ctx.PAL.fog;
    P.targetPx((k) => [pr.x + ctx.hash(k * 3 + 1) * pr.w, pr.y + pr.h - ctx.hash(k * 17 + 9) * 5]); P.color(() => fog);
  },
  run(ctx, i, user) {
    if (!this.cases[i] || this.state === 'running' || this.state === 'dropping') return;
    this.curCase = i; this._auto = false; this._userRun = !!user; /* a run by hand is the visitor's; only the first-visit timer marks its own */
    const P = ctx.particles, N = P.n, nul = this.nullHue(ctx);
    this.pileRect = this.computePile(ctx, i);
    this.pn.classList.add('ran'); this.markCard(i); this.fit();
    if (this.more) { this.more.classList.add('ran'); this.ag.hidden = false; this.openList(false); this.sixteen(false); }
    P.color(() => nul);
    if (this.atl) this.pileGlyphs(ctx);
    if (ctx.reduced) { const gx = this.gx, gy = this.gy; P.targetPx((k) => [gx[k], gy[k]]); this.out.fill(1); }
    else if (this.atl) { /* atlas: park every grain, weightless, on the line just under the panel; they fall from there */
      P.ease = 0.13; this.out.fill(0);
      const y0 = this.spawnY(); for (let k = 0; k < N; k++) { P.x[k] = this.gx[k]; P.y[k] = y0; P.tx[k] = P.x[k]; P.ty[k] = y0; }
    } else { /* park every grain above the top of the screen, then let them go a few at a time */
      P.ease = 0.13; this.out.fill(0);
      for (let k = 0; k < N; k++) { P.x[k] = this.gx[k]; P.y[k] = -30 - ctx.hash(k * 7 + 3) * 300; P.tx[k] = P.x[k]; P.ty[k] = P.y[k]; }
    }
    if (this.atl && !ctx.reduced) ctx.particles.w.fill(0); /* nothing is drawn until it is released */
    this.busy(true); this.rs.hidden = true; this.settleAt = 0;
    this.nextTick = 0; /* granular-tick rate gate, reset per run */
    if (this.atl && user) ctx.view.home({}); /* a card pressed while the camera sits on a grave: bring the whole pile into view */
    if (ctx.reduced) { this.state = 'settled'; this.settle(ctx); } else { this.state = 'running'; this.runStart = performance.now(); this.hudPct = -1; }
  },
  /* a null is chance, so the pile is amber, pulled a quarter of the way to the background so the
     whole pile never shouts louder than the one mark that decides it */
  nullHue(ctx) { return mix(ctx.PAL.amber, ctx.PAL.bg, 0.25); },
  markCard(i) { const bs = this.cd.querySelectorAll('button'); for (let k = 0; k < bs.length; k++) { bs[k].classList.toggle('on', k === i); if (this.drop && i >= 0) bs[k].classList.toggle('cur', k === i); } this.preRule(); },
  /* atlas: the foot's rule line is the rule of the claim on the picker line (the first until another runs), in its own
     words; a run hides it (.gv-more.ran), since the plate then prints the same rule under its verdict */
  preRule() {
    if (!this.rp || !this.drop) return;
    const bs = this.cd.querySelectorAll('button'); let k = 0; for (; k < bs.length; k++) if (bs[k].classList.contains('cur')) break;
    const c = this.cases[k] || this.cases[0]; this.rp.textContent = c ? c.r : '';
  },
  settle(ctx) {
    this.state = 'settled'; this.settleAt = 0; this.busy(false);
    if (this.atl) { ctx.hud(null); if (this.gw) ctx.particles.w.set(this.gw); this.pileLabels(ctx); }
    const c = this.cases[this.curCase], k = c.v === 'k';
    this.ss.className = 'gv-status ' + (k ? 'k' : 's');
    this.ss.textContent = VS(c, this.atl);
    if (k) ctx.audio.note(-9, { dur: 1.6, type: 'triangle', vol: 0.05 }); /* F2: the bed's tonic */ else { ctx.audio.note(2, { dur: 0.7 }); ctx.audio.note(4, { at: 0.12, dur: 0.8 }); ctx.audio.note(7, { at: 0.24, dur: 1.2 }); }
    this.nm.textContent = this.numsOf(c);
    this.xEl.textContent = c.x; this.ru.textContent = c.r;
    this.rs.hidden = false;
    if (this.atl) this.placePlate();
    this.checkScroll();
    if (this._userRun) { this._userRun = false; if (this.mayFocus()) this.ss.focus({ preventScroll: true }); }
  },
  again(ctx, user) {
    const refocus = user && this.mayFocus();
    this._userRun = false;
    this.state = 'idle'; this.curCase = -1; this.pileRect = null; this.rs.hidden = true; this.pn.classList.remove('ran'); this.markCard(-1);
    if (this.more) { this.more.classList.remove('ran'); this.ag.hidden = true; }
    this._auto = false;
    ctx.particles.ease = 0.06; this.ground(ctx); this.busy(false); this.fit();
    if (this.atl) { ctx.hud(null); this._shown = null; this._drawn = null; this.moundLines(ctx, null); }
    if (refocus) { const b = this.cd.querySelector(this.drop ? 'button.cur' : 'button'); if (b) b.focus({ preventScroll: true }); }
  },
  enter(ctx) {
    if (this.gates) return this.gates.fit(ctx);
    this.atl = atlasOn(ctx); this._ctx = ctx;
    if (this.atl) ctx.view.configure({ mode: 'pan', zMin: 1, zMax: 3, drift: false, look: (k) => this.look(k, ctx) });
    if (!this.ready) return;
    this.layout(ctx);
    const P = ctx.particles; P.ease = 0.06; P.jitter = 0.35; P.big = false; P.swirl = 0;
    if (this.state !== 'idle' && this.cases[this.curCase]) {
      /* reflow the pile for the new viewport; if still falling, frame() finishes the fall on its own clock */
      this.pileRect = this.computePile(ctx, this.curCase);
      const gx = this.gx, gy = this.gy, nul = this.nullHue(ctx);
      /* atlas: grains still falling keep falling from where they are; only the ones already down re-target */
      if (this.atl && this.state === 'running' && this.out) { const o = this.out, y0 = this.spawnY(); for (let k = 0; k < P.n; k++) if (!o[k]) { P.x[k] = gx[k]; P.y[k] = y0; } P.targetPx((k) => (o[k] ? [gx[k], gy[k]] : [gx[k], y0])); } else P.targetPx((k) => [gx[k], gy[k]]);
      P.color(() => nul);
      if (this.atl) { this.pileGlyphs(ctx); if (this.state === 'settled') this.pileLabels(ctx); }
    } else { this.state = 'idle'; this.ground(ctx); }
    ctx.audio.distant(0.85);
    /* first visit only, and never in kiosk (demo() covers that): after a breath, run the card that dies */
    /* spent only once it actually starts: a pass-through (or webkit settling a deep link through a second activate) must not use it up */
    if (!this._autoDone && !this._autoT && !KIOSK && this.state === 'idle') {
      const kIdx = this.cases.findIndex((c) => /relearned/.test(c.c) && c.v === 'k');
      if (kIdx >= 0) {
        addEventListener('pointerdown', this._onHand, { passive: true });
        addEventListener('keydown', this._onHand);
        this._autoT = setTimeout(() => { this._autoT = 0; if (this.state === 'idle' && !this._autoDone) { this._autoDone = true; if (ctx.acted) ctx.acted('graveyard'); this.run(ctx, kIdx); this._auto = true; if (this.state === 'settled') this.unhook(); } }, 1200);
      }
    }
  },
  unhook() {
    removeEventListener('pointerdown', this._onHand);
    removeEventListener('keydown', this._onHand);
  },
  cancelAuto(ctx) {
    if (this._autoT) { clearTimeout(this._autoT); this._autoT = 0; }
    this.unhook();
    if (this._auto) { this._auto = false; if (ctx && this.state !== 'idle') this.again(ctx); }
  },
  leave(ctx) {
    this.ung(ctx, 1);
    ctx.audio.distant(0);
    this.moundLines(ctx, null); this._mK = -1; /* the shell drops a room's trails on exit too (K1) */
    if (this.drop) { this.openList(false); this.sixteen(false); }
    this.stopDemo(ctx);
    this.atl = false;
  },
  /* cancels any kiosk demo or first-visit run in flight and gives the cards back to whoever just touched the room */
  stopDemo(ctx) {
    if (this._demoT1) { clearTimeout(this._demoT1); this._demoT1 = 0; }
    if (this._demoT2) { clearTimeout(this._demoT2); this._demoT2 = 0; }
    clearTimeout(this._demoT3);
    this.cancelAuto(ctx);
    if (this.cd) this.busy(false);
  },
  /* a 3-8ms bandpass-filtered noise burst, generated once and replayed — no new asset, no allocation
     in the per-frame path (only when a grain actually lands and the rate gate opens). */
  grain(ctx, freq, pan, vol, lenMs) {
    const ac = ctx.audio.ac; if (!ac || ctx.audio.muted) return;
    if (!this._gbuf || this._gbufAc !== ac) {
      const n = Math.max(1, Math.round(ac.sampleRate * 0.008));
      this._gbuf = ac.createBuffer(1, n, ac.sampleRate);
      const d = this._gbuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this._gbufAc = ac;
    }
    const t = ac.currentTime, dur = lenMs / 1000;
    const src = ac.createBufferSource(); src.buffer = this._gbuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 7;
    const gn = ac.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + 0.001); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    if (ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan)); bp.connect(pn); pn.connect(gn); } else bp.connect(gn);
    gn.connect(ctx.audio.sfx);
    src.start(t); src.stop(t + dur + 0.01);
  },
  drawMarker(g, ctx, drop) {
    const c = this.cases[this.curCase], pr = this.pileRect; if (!c || !pr) return;
    const bins = c.cn.length, frac = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * bins)));
    const mx = pr.x + frac * pr.w * AX;
    if (drop != null) { /* mine, on its way down: one ink grain falling onto the axis at the observed value */
      const y0 = this.atl ? this.spawnY() : pr.y - 70, y = y0 + (pr.y + pr.h - y0) * drop * drop;
      g.fillStyle = INK; g.beginPath(); g.arc(mx, y, 3.5, 0, 6.2832); g.fill();
      return;
    }
    const ink = INK;
    if (c.v !== 'k') {
      /* survives: stands past almost all of the pile's mass, out in the empty margin AX leaves —
         a full flagpole, plus a faint tick back to the pile's edge so the eye can measure the gap */
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, pr.y - 14); g.lineTo(mx, pr.y + pr.h + 6); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.moveTo(mx - 5, pr.y - 14); g.lineTo(mx + 5, pr.y - 14); g.lineTo(mx, pr.y - 4); g.closePath(); g.fill();
      const edgeX = pr.x + pr.w * AX;
      g.strokeStyle = 'rgba(' + INK_RGB + ',.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(edgeX, pr.y - 14); g.lineTo(mx, pr.y - 14); g.stroke();
      g.font = '600 10px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'bottom';
      g.fillStyle = ink; g.fillText('mine · ' + rnd2(c.o), mx, pr.y - 16);
      g.textAlign = 'left';
    } else {
      /* killed: the observed value sits inside the null's own bulk, so the line only rises as high
         as that column's own grains do (same maxC/colW as the pile itself) — it reads as buried,
         not as a beacon poking out of the sand. the pile still covers the body of this line; a small
         caret + value sits just below the baseline, outside the grains, so the verdict is findable
         without unburying the number. */
      const bIdx = Math.min(bins - 1, Math.max(0, Math.floor(frac * bins)));
      const hb = (c.cn[bIdx] || 0) / (this.maxC || 1);
      const topY = this.atl ? this.stackTop(ctx, bIdx, pr.y + pr.h * (1 - hb)) : pr.y + pr.h * (1 - hb);
      const mk = this._mk || (this._mk = { x: 0, top: 0, b: 0 }); mk.x = mx; mk.top = topY; mk.b = bIdx; /* read by the R2 precision test */
      g.strokeStyle = 'rgba(' + INK_RGB + ',.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, pr.y + pr.h); g.lineTo(mx, topY); g.stroke();
      const by = pr.y + pr.h + 4;
      g.fillStyle = ink;
      g.beginPath(); g.moveTo(mx, by); g.lineTo(mx - 4, by + 7); g.lineTo(mx + 4, by + 7); g.closePath(); g.fill();
      g.font = '600 10px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('mine · ' + rnd2(c.o), mx, by + 9);
      g.textAlign = 'left';
    }
  },
  frame(g, t, bands, w, h, ctx) {
    if (this.gates) return this.gates.frame(g, t, ctx);
    if (this.state === 'running') {
      const prog = Math.min(1, (t - this.runStart) / 4000), P = ctx.particles, N = P.n, rel = this.rel, out = this.out, gx = this.gx, gy = this.gy;
      /* atlas: one honest readout line while the pile forms, 4 Hz: how far through the release it is, and how many
         redraws the finished histogram holds (a proportional reveal, not redraws arriving one by one) */
      if (this.atl && t - this.hudT >= 250) { const pct = Math.round(100 * prog); this.hudT = t; if (pct !== this.hudPct) { this.hudPct = pct; ctx.hud('\u27f3 pile ' + pct + '% down \u00b7 ' + this.cases[this.curCase].sz + ' redraws'); } }
      let landedK = -1;
      for (let k = 0; k < N; k++) { if (!out[k] && prog >= rel[k]) { P.tx[k] = gx[k]; P.ty[k] = gy[k]; out[k] = 1; landedK = k; } }
      if (this.atl && this.gw) this.fadeIn(P, out, gy);
      /* sparse granular ticks as grains land: rate-gated to ~<=25/s, one candidate per frame, silent once nothing new lands */
      if (landedK >= 0 && t >= (this.nextTick || 0) && this.pileRect) {
        const pr = this.pileRect;
        const heightFrac = 1 - Math.min(1, Math.max(0, (gy[landedK] - pr.y) / pr.h));
        const colFrac = Math.min(1, Math.max(0, (gx[landedK] - pr.x) / (pr.w * AX)));
        this.grain(ctx, 480 + heightFrac * 3300, colFrac * 2 - 1, 0.008 + Math.random() * 0.012, 3 + Math.random() * 5);
        this.nextTick = t + 40 + Math.random() * 40;
      }
      if (prog >= 1) { if (!this.settleAt) this.settleAt = t + 900; else if (t >= this.settleAt) { this.state = 'dropping'; this.dropStart = t; if (this.atl && this.gw) P.w.set(this.gw); } }
    }
    if (this.state === 'dropping' && t - this.dropStart >= 650) { this.settle(ctx); if (this._auto) this.unhook(); }
    if (this.atl && this.state !== 'idle') { /* the mounds rise with the pile (a quarter of the release) and then hold */
      const mk = this.state === 'running' ? Math.min(1, Math.round(20 * Math.min(1, (t - this.runStart) / 1000)) / 20) : 1;
      if (t - (this._syncT || 0) >= 400) { this._syncT = t; if (this.syncMounds()) this._mK = -1; }
      if (mk !== this._mK) { this._mK = mk; this.moundLines(ctx, mk); }
    }
    if (this.pileRect && this.state !== 'idle') {
      const pr = this.pileRect, killed = this.state === 'settled' && this.cases[this.curCase] && this.cases[this.curCase].v === 'k';
      if (killed) this.drawMarker(g, ctx);
      g.strokeStyle = 'rgba(134,203,254,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(pr.x, pr.y + pr.h + 1.5); g.lineTo(pr.x + pr.w, pr.y + pr.h + 1.5); g.stroke();
      if (this.state === 'settled' && !killed) this.drawMarker(g, ctx);
      if (this.state === 'dropping') this.drawMarker(g, ctx, Math.min(1, (t - this.dropStart) / 650));
      if (killed) { /* the grain that landed: bright, on the axis, on top of everything */
        const c = this.cases[this.curCase], fr = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * c.cn.length)));
        const lx = pr.x + fr * pr.w * AX, ly = pr.y + pr.h;
        g.fillStyle = 'rgba(' + INK_RGB + ',.18)'; g.beginPath(); g.arc(lx, ly, 9, 0, 6.2832); g.fill();
        g.fillStyle = INK; g.beginPath(); g.arc(lx, ly, 4, 0, 6.2832); g.fill();
      }
    }
  },
  /* ---------------------------------------------------------------- atlas (§1.4, §3) */
  /* sixteen graves on four staggered rows, back to front, in the band the pile will later fill. a back row sits higher
     and a little smaller, so the ground reads as a field seen from above rather than a line of stones */
  layGraves(ctx) {
    const s = ctx.stage(), pr = this.groundBand(ctx), base = pr.y + pr.h, n = this.buriedT.length || 16, h = ctx.hash;
    const soilH = Math.max(12, Math.min(44, pr.h * 0.13)), rows = 4, per = Math.ceil(n / rows);
    const front = base - soilH * 0.45, back = pr.y + Math.max(28, pr.h * 0.12), gap = (front - back) / (rows - 1); /* the back row's names need ~28 px over it */
    const unit = Math.max(24, Math.min(70, s.w / 9, gap * 1.25));
    const G = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / per), c = i % per; /* i = 0 is the back left; r = rows - 1 is the front row */
      const sc = 0.66 + 0.34 * (r / (rows - 1)), mw = unit * sc, mh = mw * 0.2, hw = mw * 0.46, hh = mw * 0.82;
      const off = (r % 2 ? 0.28 : -0.06) + (h(i * 53 + 1) - 0.5) * 0.16, fx = (c + 0.5 + off) / per;
      const x = s.x + s.w * (0.07 + 0.86 * Math.min(1, Math.max(0, fx))), y = back + r * gap;
      const title = this.buriedT[i] || '', held = HELD.some((re) => re.test(title));
      G.push({ i, x, y, mw, mh, hw, hh, title, short: shortName(title), held, row: r });
    }
    this.graves = G; this.groundBase = base; this.soilH = soilH;
  },
  groundAtlas(ctx) {
    const P = ctx.particles, pr = this.groundBand(ctx), base = pr.y + pr.h, G = this.graves, ng = G.length, h = ctx.hash;
    const soilH = this.soilH || 20, share = ng ? 0.4 : 0;
    const kind = this.gkind && this.gkind.length === P.n ? this.gkind : (this.gkind = new Uint8Array(P.n)); /* 0 soil, 1 mound, 2 stone */
    P.targetPx((k) => {
      const u = h(k * 29 + 4);
      if (u < share) { /* a grave: a headstone with a rounded top, standing in a low mound */
        const g = G[Math.min(ng - 1, (u / share * ng) | 0)], v = h(k * 31 + 7), a = h(k * 37 + 11), b = h(k * 41 + 13);
        if (v < 0.42) { kind[k] = 1; const th = Math.PI * a, r = Math.sqrt(b); return [g.x + Math.cos(th) * r * g.mw * 0.5, g.y - Math.sin(th) * r * g.mh]; }
        kind[k] = 2;
        const rr = g.hw * 0.5, body = g.hh - rr, x = (a - 0.5) * g.hw, yy = b * g.hh, y0 = g.y - g.mh * 0.4;
        if (yy <= body) return [g.x + x, y0 - yy];
        const ang = Math.PI * a, rad = rr * Math.sqrt(b); /* the arch: a half disc on top of the body */
        return [g.x + Math.cos(ang) * rad, y0 - body - Math.sin(ang) * rad];
      }
      kind[k] = 0;
      const x = pr.x + h(k * 3 + 1) * pr.w, d = Math.pow(h(k * 17 + 9), 1.7); /* soil: dense at the baseline, thinning upward */
      return [x, base - 1.5 - d * soilH];
    });
    P.color((k) => (kind[k] === 2 ? STONE : kind[k] === 1 ? MOUND : SOIL));
    /* the soil is most of the dots: weigh it down so the stones, not the ground, carry the density */
    const W = P.w; for (let k = 0; k < P.n; k++) W[k] = kind[k] === 2 ? 255 : kind[k] === 1 ? 170 : 60;
    P.jitter = 0.12;
    P.glyphAll(true); P.glyphMode('cont'); P.glyphGrid(null);
    this.groundLabels(ctx);
  },
  groundLabels(ctx) {
    const items = [];
    this.graves.forEach((g) => {
      if (g.held || !g.title) return; /* held names: in the list, never floating (owner flag) */
      items.push({ id: 'g' + g.i, text: g.short, x: g.x + g.hw * 0.3, y: g.y - g.mh * 0.4 - g.hh, r: 3, pri: 2 + g.row, kind: 'obj', go: (c) => this.focusGrave(g, c, true) });
    });
    ctx.labels.set('graveyard', items);
  },
  pileGlyphs(ctx) {
    const P = ctx.particles, pr = this.pileRect || this.pile(ctx), c = this.cases[this.curCase], bins = c ? c.cn.length : 22;
    P.jitter = 0; /* resting sand never shivers across a cell edge: the stack top is exact */
    P.catBy(() => 1); P.glyphAll(true);
    P.glyphMode('cat', { cats: [{ family: 'neutral' }, { family: 'null' }] });
    /* the grid is cut to the bins: whole cells per column, rows counted up from the baseline */
    P.glyphGrid(this._gspec = this.gridSpec(ctx, pr, bins));
    this.pileTexture(ctx); this.pileWeights(ctx);
    ctx.labels.set('graveyard', this.buriedLabels(ctx));
  },
  /* the pile's glyph grid: whole cells per column, rows counted up from the baseline (`divide`: the renderer picks the
     cell count per column inside its base cell +-25%, round 2 W03). a phone's 10.9 px column is two 5.4 px cells, which
     the categorical weave now reads as sand (the r3 '88' pairs are gone), instead of one 10.9 x 19.5 px cell that jumped
     the field's pitch 1.55x between stops (G15) */
  gridSpec(ctx, pr, bins) {
    return { ox: pr.x, oy: pr.y + pr.h, pw: pr.w * AX / bins, fit: 'divide' };
  },
  readCell(ctx) {
    const A = ctx.atlas, GF = A && A.GF, now = performance.now();
    if (GF && !GF.stub && now - this.cellT > 500) { this.cellT = now; try { const st = GF.stats(); if (st && st.cellCss) this.cellCss = st.cellCss; } catch (e) {} }
  },
  /* one cell of that grid in device px at pan zoom a: glyphfield.js layout(), the same maths */
  cellDev(ctx, a) {
    const pr = this.pileRect, c = this.cases[this.curCase]; if (!pr || !c) return null;
    const g = this._gspec || this.gridSpec(ctx, pr, c.cn.length); this.readCell(ctx);
    /* the renderer's own answer when it has one (GF.cellFor runs the function its layout runs); the copy below is the
       fallback for a renderer without it */
    const GFc = ctx.atlas && ctx.atlas.GF; if (GFc && !GFc.stub && GFc.cellFor) { const r = GFc.cellFor(g, a); if (r && r[0] > 0 && r[1] > 0) return [r[0], r[1]]; }
    const DPR = ctx.particles.dpr || 1, cwT = Math.max(3, Math.round(this.cellCss * DPR)), chT = Math.round(cwT * 1.8), sc = a * DPR;
    const pw = Math.max(1e-3, g.pw * sc), ph = Math.max(1e-3, (g.ph || g.pw) * sc);
    let cw, ch;
    if (g.fit === 'divide') { cw = pw / Math.max(1, Math.round(pw / cwT)); ch = g.ph ? ph / Math.max(1, Math.round(ph / chT)) : cw * 1.8; }
    else { cw = pw * Math.max(1, Math.round(cwT / pw)); ch = ph * Math.max(1, Math.round(chT / ph)); }
    while (cw < 3) cw *= 2;
    while (ch < 4) ch *= 2;
    return [cw, ch];
  },
  /* the line the grains fall from: just under the panel (its bottom edge is 14px above the pile's top), so the plume
     never runs under the finding cards or the top bar. a grain fades in over the first part of its fall */
  spawnY() { const pr = this.pileRect; return pr ? pr.y - 8 : 0; },
  /* the pile's texture (verify r1: interior cells all saturated to the family's densest glyph, a brick of 8s). every grain
     in one home-pose cell shares a hashed weight, so neighbouring cells step through : ; 8 like a heap of sand; the
     grains within one cell of each column's top keep full weight, so a column's rendered top (and the buried line
     snapped to it) is exactly where it was. weight is brightness only: the columns' heights carry the histogram */
  pileTexture(ctx) {
    const P = ctx.particles, N = P.n, pr = this.pileRect, top = this.binTop, c = this.cases[this.curCase]; if (!pr || !top || !c) return;
    const bins = c.cn.length, colW = pr.w * AX / bins, chW = this.cellH(ctx, 1), base = pr.y + pr.h, h = ctx.hash;
    const cd = this.cellDev(ctx, 1), cwW = cd ? cd[0] / (ctx.particles.dpr || 1) : colW; /* one glyph column, world px */
    const gw = this.gw && this.gw.length === N ? this.gw : (this.gw = new Uint8Array(N)), gx = this.gx, gy = this.gy;
    for (let k = 0; k < N; k++) {
      const b = Math.min(bins - 1, Math.max(0, Math.floor((gx[k] - pr.x) / colW))), hk = base - gy[k];
      if (hk > top[b] - chW) { gw[k] = 255; continue; }
      const col = Math.floor((gx[k] - pr.x) / cwW), row = Math.floor(hk / chW), u = h(col * 7919 + row * 104729 + this.curCase * 13 + 5);
      gw[k] = Math.round(255 * (0.06 + 0.94 * Math.pow(u, 1.4)));
    }
  },
  /* grains not yet released weigh nothing (parked, never drawn); released ones fade in as they fall */
  pileWeights(ctx) {
    const P = ctx.particles, W = P.w, N = P.n, gw = this.gw, out = this.out;
    if (!gw) { W.fill(255); return; }
    if (this.state !== 'running' || !out) { W.set(gw); return; }
    for (let k = 0; k < N; k++) W[k] = out[k] ? gw[k] : 0;
    this.fadeIn(P, out, this.gy);
  },
  fadeIn(P, out, gy) {
    const W = P.w, Y = P.y, gw = this.gw, N = P.n, y0 = this.spawnY();
    for (let k = 0; k < N; k++) {
      if (!out[k]) continue;
      const d = Y[k] - y0, span = gy[k] - y0, f = span <= 1 ? 1 : d / Math.min(48, Math.max(6, span * 0.6));
      const q = f >= 1 ? gw[k] : f <= 0 ? 0 : (gw[k] * f) | 0; W[k] = q;
    }
  },
  /* one glyph row of the pile's grid in world px at zoom a (the same maths as glyphfield.js layout(), fit 'divide') */
  cellH(ctx, a) {
    const cd = this.cellDev(ctx, a); return cd ? cd[1] / (a * (ctx.particles.dpr || 1)) : 10;
  },
  /* the buried findings while a card runs (round 2b, beauty P2-3: the names floated over nothing). a named grave keeps
     its name wherever the pile (at its final height, plus one glyph row), the marker, the picker line and the verdict
     leave room, and the name now stands over a low mound at the free spot nearest its grave: 5 / 3 / 1 cells of the pile's lattice,
     drawn as a K1 trail (moundLines) in --mute. a trail in a categorical room takes marks of no family (· and ¦), so a
     mound is never read as the null's sand, nor as a claim that every buried finding died against a pile (most of the
     sixteen did not). the rest stay in `the sixteen` */
  mounds(ctx) {
    const pr = this.pileRect, c = this.cases[this.curCase], top = this.binTop, S = ctx.stage(), shown = this._shown = [];
    if (!pr || !c || !top || !this.graves.length || !this._gspec) return;
    const bins = c.cn.length, colW = pr.w * AX / bins, base = pr.y + pr.h, dpr = ctx.particles.dpr || 1, cd = this.cellDev(ctx, 1);
    const cw = cd ? cd[0] / dpr : 6, ch = cd ? cd[1] / dpr : 10.8, ox = this._gspec.ox, oy = this._gspec.oy;
    const frac = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * bins))), mx = pr.x + frac * pr.w * AX, mb = Math.min(bins - 1, Math.floor(frac * bins));
    const hit = (a, b, m) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
    const clearOfPile = (r) => { for (let b = Math.max(0, Math.floor((r.left - pr.x) / colW)); b <= Math.min(bins - 1, Math.floor((r.right - pr.x) / colW)); b++) if (r.bottom > base - top[b] - ch - 3) return false; return true; };
    /* what is already there: the null's and mine's own names, and on a desktop the picker line and the verdict */
    const taken = [], nl = this.nullAt(ctx), ml = this.mineAt();
    if (nl) taken.push({ left: nl.x - 4, top: nl.y - 24, right: nl.x + 84, bottom: nl.y + 6 });
    if (ml) taken.push(this.labRect(ml.x, ml.y, 'mine'));
    if (this._hg) {
      if (this._pickR) taken.push({ left: this._pickR.l, top: this._pickR.t, right: this._pickR.r, bottom: this._pickR.b });
      const gr = this._ghost && this._ghost[this.curCase]; if (gr) taken.push({ left: gr.l, top: gr.t, right: gr.l + gr.w, bottom: gr.t + gr.h });
    }
    this.chromeRects().forEach((r) => taken.push(r));
    /* each name, front rows first, takes the free spot nearest its own grave: the grave's cell first, then out in rings
       (a column step costs a little more than a row step), so a name the pile or the verdict now covers moves up the slope
       or aside instead of vanishing. a name with no free spot within reach stays in `the sixteen` */
    const OFF = this._offs || (this._offs = (() => { const o = []; for (let dy = -40; dy <= 40; dy++) for (let dx = -18; dx <= 18; dx += 2) o.push([dx, dy, Math.hypot(dx * 1.6, dy * 1.8)]); return o.sort((p, q) => p[2] - q[2]); })());
    const order = this.graves.filter((g) => !g.held && g.title).sort((a, b) => b.row - a.row || a.i - b.i);
    for (const g of order) {
      const ic0 = Math.round((g.x - ox) / cw - 0.5), jr0 = Math.max(1, Math.floor((oy - g.y) / ch));
      for (const [dx, dy] of OFF) {
        const jr = jr0 + dy; if (jr < 1) continue; /* on the ground above the axis */
        const cx = ox + (ic0 + dx + 0.5) * cw;
        const mr = { left: cx - 2.5 * cw, right: cx + 2.5 * cw, top: oy - (jr + 3) * ch, bottom: oy - jr * ch };
        if (mr.left < S.x + 2 || mr.right > S.x + S.w - 2) continue;
        const ay = mr.top - 2 - 9.5, lr = this.cRect(cx, ay, g.short);
        if (lr.left < S.x || lr.right > S.x + S.w || lr.top < S.y + 2) continue;
        if (!this._hg && lr.top < pr.y - 12) continue; /* a phone: never up into the picker line the grains fall past */
        if (!clearOfPile(mr) || !clearOfPile(lr)) continue;
        const nearM = (r) => r.right > mx - 40 && r.left < mx + 40 && (c.v !== 'k' || r.bottom > base - top[mb] - 3);
        if (nearM(mr) || nearM(lr)) continue; /* the marker and its number */
        if (taken.some((t) => hit(lr, t, 4) || hit(mr, t, 3))) continue;
        taken.push(lr, mr);
        shown.push({ g, cx, cw, y0: oy - jr * ch, ch, ay });
        break;
      }
    }
    if (!this._mseg || this._mseg.length < shown.length * MOUND_ROWS.length * 7) { this._mseg = new Float32Array(Math.max(16, this.graves.length) * MOUND_ROWS.length * 7); this._mView = null; }
    this._mK = -1; this._drawn = []; this._dKey = null; this._syncT = 0; /* frame() hands the names' mounds to the renderer as their labels show */
  },
  /* a mound stands only under a name the label layer is showing: a name it had to hide (a pill that came later, a chrome
     keepout that moved, labels switched off) takes its mound with it, so no mound is ever left without its name. true when
     the drawn set changed */
  syncMounds() {
    const sh = this._shown || [], on = new Set();
    document.querySelectorAll('.atlas-lab.on').forEach((e) => on.add(e.textContent));
    const d = sh.filter((m) => on.has(m.g.short)), key = d.map((m) => m.g.i).join(',');
    if (key === this._dKey) return false;
    this._dKey = key; this._drawn = d; return true;
  },
  /* the mounds as K1 segments (x0 y0 x1 y1 w 0xRRGGBB pulse), one per row, each spanning its cells' centres; k (0..1)
     scales the weight, so they rise with the pile; null clears them */
  moundLines(ctx, k) {
    const A = ctx.atlas; if (!A || typeof A.setLines !== 'function') return;
    const sh = this._drawn, buf = this._mseg;
    if (k == null || !sh || !sh.length || !buf) { if (this._mOn) { A.setLines(null); this._mOn = false; } return; }
    let o = 0;
    for (const m of sh) for (const [row, n, w] of MOUND_ROWS) {
      const y = m.y0 - (row + 0.5) * m.ch, hw = n > 1 ? (n - 1) / 2 * m.cw : 0.2 * m.cw;
      buf[o] = m.cx - hw; buf[o + 1] = y; buf[o + 2] = m.cx + hw; buf[o + 3] = y; buf[o + 4] = w * k; buf[o + 5] = MOUND_HUE; buf[o + 6] = NaN; o += 7;
    }
    if (!this._mView || this._mView.length !== o) this._mView = buf.subarray(0, o);
    A.setLines(this._mView); this._mOn = true;
  },
  buriedLabels(ctx) {
    return (this._shown || []).map((m) => ({ id: 'g' + m.g.i, text: m.g.short, x: m.cx, y: m.ay, r: 3, align: 'c', pri: 1 + m.g.row * 0.1, kind: 'obj', go: (cc) => this.focusGrave(m.g, cc, true) }));
  },
  /* where anchors.js puts a centred ('c') label at (x, y): its 11px measure, the pill's 19px */
  cRect(x, y, text) {
    const c = this._mc || (this._mc = document.createElement('canvas').getContext('2d'));
    c.font = '400 11px "JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace';
    const t = String(text), w = c.measureText(t).width + t.length * 0.66 + 8 + 3, left = x - (w - 3) / 2;
    return { left, top: y - 9.5, right: left + w, bottom: y + 9.5 };
  },
  /* the chrome the label layer keeps names off (anchors.js refreshKeepouts, the same selectors), as viewport rects */
  chromeRects() {
    const out = [], add = (el) => {
      if (!el) return; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    };
    document.querySelectorAll('[data-keepout], #top > *, .atlas-ladder, .atlas-ladder *').forEach(add);
    ['#atlas-info', '.atlas-ladder-chip', '#atlas-dock', 'section.is-active .wall'].forEach((q) => add(document.querySelector(q)));
    return out;
  },
  /* the null's and mine's label anchors (pileLabels), shared with mounds() so no grave's name is put on them */
  nullAt(ctx) {
    const c = this.cases[this.curCase], pr = this.pileRect, top = this.binTop; if (!c || !pr) return null;
    const cn = c.cn, bins = cn.length, maxC = Math.max.apply(null, cn) || 1, colW = pr.w * AX / bins, base = pr.y + pr.h;
    /* THE NULL sits on the pile's right flank (the last column still 40% of the peak), clear of the panel above it */
    let bf = bins - 1; while (bf > 0 && cn[bf] / maxC < 0.4) bf--;
    const nx = pr.x + (bf + 1) * colW + 6, chW = this.cellH(ctx, 1);
    /* ...and above every column its box spans (verify r1: it sat on the flank's own glyphs) */
    let hi = 0; for (let b = bf + 1; b < bins && pr.x + b * colW < nx + 96; b++) hi = Math.max(hi, top && top[b] ? top[b] + chW : 0);
    return { x: nx, y: Math.min(base - pr.h * (cn[bf] / maxC) * 0.55, base - hi + 1) };
  },
  mineAt() {
    const c = this.cases[this.curCase], pr = this.pileRect; if (!c || !pr) return null;
    const cn = c.cn, bins = cn.length, maxC = Math.max.apply(null, cn) || 1, base = pr.y + pr.h;
    const frac = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * bins))), b = Math.min(bins - 1, Math.max(0, Math.floor(frac * bins)));
    /* mine at the top of the buried line for a kill, halfway up the pole for a survivor */
    return { x: pr.x + frac * pr.w * AX, y: c.v === 'k' ? base - pr.h * (cn[b] / maxC) : base - pr.h * 0.45 };
  },
  /* where anchors.js will put an obj label anchored at (x, y) (home pose, so world = screen): up-right, or the next
     corner that fits the window (a name near a phone's right edge flips left, back over the pile, which the r3 phone
     shots showed). the width is anchors.js's own measure: canvas metrics of its 11px mono + letter-spacing + padding */
  labRect(x, y, text) {
    const c = this._mc || (this._mc = document.createElement('canvas').getContext('2d'));
    c.font = '400 11px "JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace';
    const t = String(text), w = c.measureText(t).width + t.length * 0.66 + 8 + 3, h = 19, off = 3 * 0.72 + 6, M = 8, W = innerWidth, H = innerHeight;
    for (const [qx, qy] of [[1, -1], [-1, -1], [1, 1], [-1, 1]]) {
      const left = qx > 0 ? x + off : x - off - (w - 3), top = qy < 0 ? y - off - h : y + off;
      if (left >= M && top >= M && left + w <= W - M && top + h <= H - M) return { left, top, right: left + w, bottom: top + h };
    }
    return { left: x + off, top: y - off - h, right: x + off + w, bottom: y - off };
  },
  pileLabels(ctx) {
    const nl = this.nullAt(ctx), ml = this.mineAt(); if (!nl || !ml) return;
    ctx.labels.set('graveyard', [
      { id: 'null', text: 'the null', kind: 'region', x: nl.x, y: nl.y, r: 0, pri: 4 },
      { id: 'mine', text: 'mine', kind: 'obj', x: ml.x, y: ml.y, r: 5, pri: 6 },
    ].concat(this.buriedLabels(ctx)));
  },
  /* the rendered top of a column's glyph stack, in world px: the grid cuts each bin into whole cells and counts rows up
     from the baseline (glyphfield.js layout(), `divide`), so the highest grain's row ends at a whole number of rows */
  stackTop(ctx, b, exact) {
    const A = ctx.atlas, GF = A && A.GF, pr = this.pileRect;
    if (!pr || A.noglyph || !GF || GF.stub || !this.binTop) return exact;
    const a = ctx.view.mode === 'pan' ? ctx.view.z || 1 : 1, cd = this.cellDev(ctx, a); if (!cd) return exact;
    const chW = cd[1] / (a * (ctx.particles.dpr || 1)), H = this.binTop[b] || 0;
    return pr.y + pr.h - Math.max(0, Math.ceil(H / chW - 1e-6)) * chW;
  },
  look(k, ctx) {
    if (k === 'marker') { const p = this.markerAt(); return p ? [p.x, p.y] : null; }
    const m = /^grave:(\d+)$/.exec(String(k)); if (m) { const g = this.graves[+m[1]]; return g ? [g.x, g.y - g.hh * 0.5] : null; }
    return null;
  },
  markerAt() {
    const c = this.cases[this.curCase], pr = this.pileRect; if (!c || !pr) return null;
    const frac = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * c.cn.length)));
    return { x: pr.x + frac * pr.w * AX, y: pr.y + pr.h * 0.62 };
  },
  /* a run the tour or search asked for: whatever is on the ground now makes way first */
  forceRun(ctx, i) {
    if (!this.cases[i]) return 0;
    this.cancelAuto(ctx); this._autoDone = true;
    if (this.state !== 'idle') this.again(ctx, false);
    this.run(ctx, i, false);
    ctx.view.home({});
    return ctx.reduced ? 0 : RUN_MS;
  },
  setAngle(k, ctx, o = {}) {
    const a = this.angles[k]; if (!a || !this.ready || !atlasOn(ctx)) return 0;
    if (a.id === 'gates') return this.gIn(ctx, o); this.ung(ctx);
    if (a.id === 'ground') { this.cancelAuto(ctx); this._autoDone = true; if (this.state !== 'idle') this.again(ctx, false); ctx.view.home({}); return 0; }
    return this.forceRun(ctx, ANGLE_CASE[a.id]);
  },
  /* R6 gates: the thirteen gates live in the lazy gates.js, which owns this.gates while it runs */
  gIn(ctx, o) { if (this.gates) return 0; this.cancelAuto(ctx); this._autoDone = true; import('./gates.js' + new URL(import.meta.url).search).then((m) => m.default(this, ctx, o)).catch((e) => console.warn('gates', e)); return o.instant || ctx.reduced ? 0 : 5600; },
  ung(ctx, quiet) { const G = this.gates; if (G) { this.gates = null; G.stop(ctx); if (!quiet) this.ground(ctx); } },
  focusGrave(g, ctx, fly) {
    if (this.state !== 'idle') this.again(ctx, false);
    if (fly !== false) ctx.view.flyTo({ wx: g.x, wy: g.y - g.hh * 0.5, z: Math.max(2.2, ctx.view.z || 1) }, { speed: 'quick', lock: g.short });
    ctx.lock(g.short);
    ctx.hud(g.title);
  },
  /* search: {finding: 'case-N' | a buried title}. a case runs; a buried name flies to its grave (or, for a held name,
     opens the list with that line marked) */
  focus(desc, ctx) {
    if (!desc || desc.finding == null || !this.ready) return false;
    const f = String(desc.finding), m = /^case-(\d+)$/.exec(f);
    if (m) { const i = +m[1]; if (!this.cases[i]) return false; this.forceRun(ctx, i); return true; }
    const ci = this.cases.findIndex((c) => c.c === f); if (ci >= 0) { this.forceRun(ctx, ci); return true; }
    const g = this.graves.find((x) => x.title === f); if (!g) return false;
    this.cancelAuto(ctx); this._autoDone = true;
    if (g.held) {
      if (this.state !== 'idle') this.again(ctx, false);
      this.sxList.hidden = false; this.sxBtn.setAttribute('aria-expanded', 'true');
      [].forEach.call(this.sxList.children, (li) => { li.classList.toggle('gv-mark', li.textContent === f); if (li.textContent === f) try { li.scrollIntoView({ block: 'nearest' }); } catch (e) {} });
      this.checkScroll(); ctx.hud(g.title);
      return true;
    }
    this.focusGrave(g, ctx, desc.fly !== false);
    return true;
  },
  /* a tap on the field: a grave (not a held one) at rest, the marker once a card has run */
  pick(wx, wy) {
    if (!this.ready || this.gates) return null;
    if (this.state === 'idle') {
      let best = null, bd = Infinity;
      this.graves.forEach((g) => { const d = Math.hypot(wx - g.x, wy - (g.y - g.hh * 0.5)); if (d < bd) { bd = d; best = g; } });
      if (!best || best.held || bd > Math.max(18, best.mw * 0.75)) return null;
      return { label: best.short, wx: best.x, wy: best.y - best.hh * 0.5, z: 2.2, focus: { finding: best.title, fly: false } };
    }
    if (this.state === 'settled') { const p = this.markerAt(); if (p && Math.abs(wx - p.x) < 22) return { label: 'mine', wx: p.x, wy: p.y, z: 2 }; }
    return null;
  },
  /* labels keep off the panel (its box keeps one height in atlas mode, so this rect holds for the whole stop) */
  keepout() {
    if (this.gates) return this.gates.ko();
    if (!this.pn) return [];
    const out = [];
    for (const el of this.drop ? [this.pn, this.rs, this.sxList] : [this.pn]) { if (el.hidden) continue; const r = el.getBoundingClientRect(); if (r.width && r.height) out.push({ x: r.left, y: r.top, w: r.width, h: r.height }); }
    return out;
  },
  /* the numbers this room draws on the overlay, for the precision test */
  precision() {
    const c = this.cases[this.curCase], pr = this.pileRect; if (!c || !pr || this.state !== 'settled') return [];
    const frac = Math.min(1, Math.max(0, (c.o - c.lo) / (c.w * c.cn.length))), mx = pr.x + frac * pr.w * AX, text = 'mine · ' + rnd2(c.o);
    return [{ id: 'mine', text, wx: mx, wy: c.v === 'k' ? pr.y + pr.h + 13 : pr.y - 16 }];
  },
  /* kiosk: nobody's here. show one kill, then one survivor, twelve seconds apart, then reset. */
  demo(ctx) {
    if (!this.ready || !this.root || !this.root.parentElement || !this.root.parentElement.classList.contains('is-active')) return;
    const kIdx = this.cases.findIndex((c) => c.v === 'k'), sIdx = this.cases.findIndex((c) => c.v === 's');
    if (kIdx < 0 || sIdx < 0) return;
    const stillHere = () => this.root && this.root.parentElement && this.root.parentElement.classList.contains('is-active');
    this.run(ctx, kIdx);
    this._demoT1 = setTimeout(() => { if (stillHere()) { this.again(ctx); this.run(ctx, sIdx); } }, 12000);
    this._demoT2 = setTimeout(() => { if (stillHere()) this.again(ctx); }, 24000);
    this._demoT3 = setTimeout(() => { if (stillHere()) ctx.angle.set('gates', { via: 'tour' }); }, 26000);
  },
};
