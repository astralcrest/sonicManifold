/* copy.js — package C2. every string a visitor can read in atlas chrome + the universe stop.
   nothing here is invented: `SRC` cites, for every number, the file or gate that computed it.
   verbatim sentences are marked `verbatim: true` in `SRC` and must equal their source byte-for-byte
   (the two declared exceptions are noted inline: the 0.636 strict anchor, and the K3 "about 5x" placard). */

export const COPY = {
  // ctx.stats — must equal universe_days_index.json's first_date/last_date (atlas_copy.mjs checks this).
  stats: {
    plays: 97427,
    span: 'september 2019 to may 2026',
    firstDay: '2019-09-05',
    lastDay: '2026-05-10',
  },

  chrome: {
    lockedOn: 'needle down',
    freeCamera: '° your hand',
    // R6 M1: the stepper is a tracklist and a tour is the queue (the tour's names live in tours.js)
    nextStop: 'up next · {stop} ›',
    backToTour: 'put the needle back · {stop} ›',
    startAgain: 'play it again ›',
    mpillNext: 'up next ›',
    mpillBack: 'needle back ›',
    enRoute: 'crossfading',
    angleBar: 'bar {k} / {n}',
    // R6 move 3: how the visitor reached each stop, in the arms' own glyphs (≡ the tour, ° their pick, × shuffle).
    // plain counts, kept for this tab only; never compared with the log's rate.
    shuffle: '× shuffle',
    servedKey: 'how you reached each stop: ≡ the tour moved on, ° you picked it, × shuffle',
    servedEnd: 'you started {n} of your {total} stops by hand. i started 19 of every 100 plays.',
    // W40/W12 (ROUND2_PLAN §0.9): "anywhere" stopped being true once the prompt could sit over a specific
    // control, so the chip only claims what §1.9 arming actually does — it shows while ctx.audio.state() is
    // 'off'/'arming' and hides on 'on'/'muted' (INTEGRATION W45 arms on the first pointerup/touchend/click/keydown).
    soundChip: '♪ tap for sound',
    soundOff: 'sound off',
    soundOn: 'sound on',
    // R6 M9: the hint leads with sound
    onboarding: 'hover to hear · hold to loop · drag to turn · / to dig the log',
    onboardingTouch: 'touch to hear · hold to loop · drag to turn',
    // W40/W10 tour end card: verbatim source for chrome.js's CC.end*/CC.contact fallbacks (chrome.js ~L40-45).
    endHead: 'end of the record.',
    endFly: 'take the wheel ›',
    endExport: 'run it on your own export ›',
    endReport: 'the report ›',
    endAgain: 'play it again ›',
    contact: 'questions or a dataset of your own · astralcrest',
    toasts: {
      pressAndHold: 'press and hold',
      zoomedOut: 'zoomed all the way out · next stop with → or the pill',
      tourPaused: 'you took the wheel · ▶ hands it back to the queue',
      sessionNotCounted: "single sessions aren't in the public data; only their totals are",
      linkCopied: 'link copied',
      detailLowered: 'marks made bigger so the music keeps up',
      photoBlocked: 'this browser blocks saving pictures',
      noRecordDate: 'no plays in the export for this date.', // verbatim, TIER_B_DATA_CARD.md §5
      wakeOnly: null, // wake guard is silent by design (§1.6); no toast fires
    },
  },

  settings: {
    detail: 'detail', detailNames: { ultra: 'finest', fine: 'fine', normal: 'plain', bold: 'big' }, travel: 'travel speed',
    dwellNames: { short: 'a breath', normal: 'a verse', long: 'the whole song' }, fade: 'let the words go quiet',
    glow: 'glow', labels: 'names', twinkle: 'shimmer', textSize: 'text size', pinch: 'pinch zooms',
    pinchOptions: { atlas: 'the atlas', page: 'the page' },
    footerGrid: '{cols} × {rows} marks on this screen',
  },

  // help overlay: every control, plus the five mandatory accuracy notes (§2.6).
  help: {
    controls: [
      'drag: turn or pan the field',
      'pinch / ctrl+wheel / wheel: zoom',
      'double-tap or double-click: zoom in',
      'tap a name: go there',
      'arrow keys (field focused): pan or turn; +/- zoom; 0 or escape: home',
      '/ or o: search',
      'p or space: pause or resume the tour',
      '[ ] or , .: step stops or angles',
      'g: glow · v: detail · y: travel speed · l: labels · m: mute',
      'e: how to read this stop',
      '?: what every key does',
    ],
    accuracy: [
      'in a categorical room, the shape of a character says who pressed play; colour is not needed to read it.',
      'on a small screen one dot stands for four plays, not one.',
      "the clock and the universe's day view both read on one fixed clock, all year (no per-play timezone or daylight saving was kept), not a real local time.",
      "a star's position in the universe carries no meaning as distance; its depth is a seeded drawing offset unless a 3d layout file ships.",
      'twinkle and the occasional bright glint are decoration everywhere on this site and carry no data.',
    ],
  },

  photo: {
    bar: ['save the sleeve', 'the run-out groove: copy the marks as text', 'hold this frame', 'names', 'done'],
    share: 'share',
  },

  ladder: {
    readout: '1 mark ≈ {n} plays',
    ariaValuetext: '1 mark is about {n} plays',
    // W40/W31: the phone chip is one line with no room for a sentence. `phoneChip` fires on a stop with a real
    // play-count reading; `rung` is the fallback on a stop without one (ladder.js RUNG_FOR_NOTE supplies the
    // word — artist, shares, readings, clusters, pile, graves, track) — never ladder.js's full unavailable-reading sentence.
    phoneChip: '{g} 1 mark ≈ {n}',
    rung: '{g} {rung}',
  },

  // W40/W26: the ATLAS menu (search.js reads these via deps.COPY.search) — canonical source so the footer
  // line and the "seen n of 11" count are never retyped or drift out of sync with what actually ships.
  search: {
    // R2 C2 #2: "lands somewhere real" contradicted universe.js's own pos1 (a dust artist's dot is a placeholder
    // with no computed position); this says the same thing search actually does without the false claim.
    footer: "names and dates from the log · every result lands somewhere; a dust artist's spot is a placeholder",
    placeholder: 'dig the log',
    seen: 'heard {n} of {total}',
  },

  // R6 M5: the tape counter (it replaced a mission clock). it never runs on its own and never passes stats.lastDay: on a stop
  // with a date of its own the ● and the count follow that day, else the tape reads full.
  tplus: {
    whole: 'the whole log',
    at: 'play {n} of {total}',
  },

  // §6.4 wall label addition: the categorical glyph legend. R2 C2 #3: this had drifted from the shipped
  // legend (labels.js `shape` row) and the renderer's actual FAMILIES (glyph-atlas.js) — missing the `°`/`×`
  // tap/shuffle prefixes, using a hyphen instead of `_` for the queue's low mark (the hyphen is a DIR_CHARS
  // edge glyph, never a served-family shape), and missing `≣` and the trailing edge-glyph disambiguation.
  // Now byte-identical to labels.js's `shape` string (this field is unused/dead elsewhere — labels.js hardcodes
  // its own copy rather than importing COPY.glyphLegend — so keep the two in sync by hand if either changes).
  glyphLegend: 'the shape of each mark says who pressed play without colour: tally strokes a tap, dice pips a shuffle, conveyor slats the queue. heavier marks hold more plays; hairlines only trace an edge. in text, ° stands for a tap, × a shuffle, ≡ the queue.',

  // §7 front door alternate h1 (D13/H16 owner-checkpoint flag #4; F1 applies it, the old line stays as a comment token there).
  doorH1: "I didn't press play on most of my music.",

  universe: {
    // §8.1 wall text — already live in exhibit.html verbatim; reproduced here so R4/labels can quote it without
    // retyping. Read from exhibit.html at build time if this ever drifts (atlas_copy.mjs diffs both).
    kicker: 'the sky',
    title: 'the universe',
    // W40/W54: Tier-A-true base sentence — no "find by name", no "step through the days" (those describe
    // Tier-B files that may be 404 this round). R4 appends the day/search clause only once Tier B loads.
    say: 'every artist i played at least 50 times is a star. where a star sits means nothing on its own: the linked ones come from a seeded layout of what i played back to back, and the rest ring the edge in order of plays. the other artists are dust. drag to turn it, tap a star.',
    sayDim1: '19 in every 100 plays i tapped, 17 arrived shuffled, 64 the queue served (a few of those started some other way). in this view a tap means the strict set (play button, click, remote): 11.5 in every 100.',
    // sayDim2 == index.caveat, read live from universe_days_index.json by R4; not retyped here to avoid drift.

    // W40: no "all searchable" claim in the Tier-A base (dust isn't searchable until universe_artists_all.json
    // loads) and no literal dust count baked in — {dust_artists} is resolved at runtime by R4. R4 appends
    // ", all searchable" itself only once that file is actually present.
    ladderChip: '{named} artists as stars ({play_share}% of plays) · {dust_artists} more as dust',

    // K4 position sentence (GATE_science K4, resolved) — placed == 0 nodes.
    posLayout: 'positions come from a seeded force layout of which artists were played back to back. distance and direction mean nothing on their own.',
    // placed == 1 (dust/placeholder), TIER_B_DATA_CARD §5 verbatim.
    posPlaceholder: "this dot's position is a placeholder so search has somewhere to land. it isn't computed from listening and means nothing.",
    // placed == 2 (outer ring) — ROUND2 R4 item 2: the ring runs in plays order, so "means nothing" was false.
    posRing: 'this artist isn’t joined to the main web by enough back-to-back plays to be laid out, so it sits on the outer ring, spaced evenly in order of plays; where it sits on the ring says nothing else about it.',

    comet: 'an artist heard in three months or fewer, most of it in one.', // verbatim, GATE_science

    // strongest-neighbour lines, verbatim (GATE_science, UNIVERSE_SPEC §7).
    neighbourQueue: 'the queue most often played {X} right before or after it.',
    neighbourTap: 'i most often tapped between it and {X}.', // only when tap_n >= 10

    // links angle (§8.3)
    armSelectorLinks: ['MY TAPS', 'THE QUEUE', 'BOTH'],
    bothPlacard: 'both arms in one grey. pick one to see who started each line.',
    // K3 placard — DECLARED DEVIATION #2 from GATE_science.md's own K3 text ("...5x more transitions in the raw
    // log."): this exact wording, with "about" and "between these artists", is BUILD_SPEC_V2 §8.3's placard.
    k3Placard: 'line counts and widths are rates at equal sample size; autoplay has about 5x more transitions between these artists in the raw log.',
    // fog placard, verbatim (UNIVERSE_SPEC §7 / GATE_science K5, sourced main.tex L382).
    fogPlacard: "untagged jumps shown as fog. more of autoplay's than of my taps' are untagged (about 41% vs 34%), so fog density is a tagging gap, not a behaviour.",

    // threads angle (§8.3, the owner's "genre-combo network")
    armSelectorThreads: ['MY TAPS', 'SHUFFLE', 'THE QUEUE'],
    threadsReadout: '{famA} → {famB}, {arm}: {n} transitions ({pct}% of that arm’s transitions in this window)',

    // day angle (§8.3, Tier B) — every sentence here is TIER_B_DATA_CARD §5 verbatim or C1-style templates.
    dayHeader: '{d}: {n} plays, {na} artists.',
    dayMostPlayed: 'most played this day: {name} ({k})',
    // the one NEW sentence the gate lets survive for the family mix (marked new; not in TIER_B_DATA_CARD §5).
    dayLitNew: 'the {k} most played artists this day are lit: {s} of its {n} plays.',
    dayArms: '{n} plays this day: {tap} i tapped, {shuffle} shuffled, {served} the queue served, {other} other starts.',
    dayArmsStrictNote: 'a tap here means the strict set (play button, click, remote); skip-button starts count as other.',
    dayArmsLoggerNote: "how the app logged starts wasn't constant across these years, so read these counts on their own, not against another day's.",
    dayLinesCaption: 'lines join artists played back to back this day. line length means nothing.',
    dayLineTap: '{A} → {B}: played back to back {n} times this day.',
    dayChanges: '{T} artist changes this day (skip-button starts not counted): {ta0} i tapped, {ta1} shuffled, {ta2} the queue served.',
    dayShowingSubsample: 'showing 1 in {k}',
    dayNoRecord: 'no plays in the export for this date.',

    // star card (§8.3)
    starPlays: '{plays} plays. first play in this export: {first}. last: {last}.',
    starArms: '{tap} i tapped, {shuffle} shuffled, {served} the queue served, {other} other starts.',
    starArmsLoggerNote: "how the app logged starts wasn't constant across these years, so read these counts on their own, not against another artist's.",
    starFromTrack: '{title}, {artist}: {plays} plays, first play in this export {first}.',

    // genre callout (§8.3, S1). the strict anchor is 0.636 — DECLARED DEVIATION #1 from
    // UNIVERSE_SPEC.md §7's rounded "0.64× strict" (owner's standing rule: quote strict, not rounded, on
    // public surfaces). the per-track clause was killed (R2_VERIFY_2 honesty P0-1: B_track's null isn't 1,
    // so the old per-track reading compared to the wrong reference) — no replacement ships.
    genreCallout: 'counted by play, ambient/lo-fi is under-tapped: 0.636× strict (0.50× bundled [0.44, 0.55]). hip-hop/r&b is over-tapped: 1.23× strict (1.22× bundled [1.12, 1.32]). the report marks the hip-hop side caveated on how plays are counted.',

    // VC panel. reuse exhibit/labels.js threshold "the finding" verbatim — do not retype it a second time
    // anywhere else; every consumer imports this one string.
    bridgeIndexHeadline: 'when i pick the next track it crosses into another genre family more often than when autoplay runs on: bridge index 1.05, 95% interval 1.03 to 1.08. a third of my jumps and two fifths of autoplay\'s carry no public genre tag, and reasonable ways of handling them put the number anywhere from 1.00 to 1.13. with the loosest definitions of a tap and of autoplay it reads 1.01, interval 0.99 to 1.03, and when both sides are held to artists with at least 50 plays it reads 1.01, interval 0.98 to 1.04. neither separates from 1. it holds across partitions, by device and by era. a direction, not a size.',
    // corpus sentence, UNIVERSE_SPEC.md §7 verbatim. HELD (pending: 'stats-referee', H11: 12,336 vs Tier-B's
    // 13,545 tracks unreconciled). Never shown until cleared; 13,545 is never printed.
    // R2 C2 #1 reverified: 12,336 counts unique track TITLES, not tracks — recomputed on qualified plays it's
    // 12,336 unique titles / 13,545 unique (artist, title) pairs (Tier-B's count) / 14,000 unique URIs. Still
    // unconsumed by any file in this repo (grep confirms) and still gated behind `pending`, so it stays HELD
    // as-is; the "tracks" label itself needs an owner-side reconciliation of GROUND_TRUTH.md/main.tex, not a
    // site-side fix — see R2_REQUESTS_C2.md.
    corpusSentence: '12,336 tracks, 6,288 artists... 4,770 listening hours',
    corpusSentencePending: 'stats-referee',

    // deeper link
    deeper: 'go deeper: the real network →',
    deeperHref: 'lab.html#fig-26',
  },
};

export default COPY;

/* SRC — citation ledger. every number that appears in COPY or in this package's proposal files
   (labels_proposal.json, exhibit_html_proposal.html, kill_reconcile.json) is listed here with its source.
   `derive:` entries are computed expressions over shipped files, evaluated the same way C1's are. */
export const SRC = [
  { n: '97,427', where: 'stats.plays, universe.say/sayDim1 (via exhibit.html)', src: 'exhibit/data/wall.json#total; GATE_science.md recompute #1' },
  { n: '2019-09-05', where: 'stats.firstDay', src: 'exhibit/data/universe_days_index.json#first_date' },
  { n: '2026-05-10', where: 'stats.lastDay, the tape counter end', src: 'exhibit/data/universe_days_index.json#last_date' },
  { n: '', where: 'tplus.at {n}/{total}', src: 'derive: running sum of exhibit/data/universe_days.json days[].n through the cursor day; the sum over every day is 97,427' },
  { n: '19', where: 'universe.sayDim1, chrome.servedEnd', src: 'GATE_science.md W1 replacement (verbatim); GROUND_TRUTH.md L20-22, main.tex L108' },
  { n: '17', where: 'universe.sayDim1', src: 'GATE_science.md W1 replacement (verbatim)' },
  { n: '64', where: 'universe.sayDim1', src: 'GATE_science.md W1 replacement (verbatim)' },
  { n: '0.7', where: 'universe.sayDim1', src: 'GATE_science.md W1 replacement (verbatim)' },
  { n: '11.5', where: 'universe.sayDim1', src: 'GATE_science.md W1 replacement (verbatim)' },
  { n: '253', where: 'index.caveat (quoted live from the data file, not retyped)', src: 'exhibit/data/universe_days_index.json#caveat' },
  { n: '44', where: 'index.caveat', src: 'exhibit/data/universe_days_index.json#caveat' },
  { n: '388', where: 'ladderChip {named} token, resolved by R4', src: 'exhibit/data/universe_nodes.json (length)' },
  // W40 (REQUESTS_privacy_copy.md #3): the old dust-artist-count ledger literal is removed, not renumbered —
  // the unlisted fold is still running, so {dust_artists} is resolved at runtime by R4 from
  // universe_artists_all.json's live placed==1 count and never a fixed number in shipped copy or in this ledger.
  { n: '68', where: 'ladderChip {play_share} token', src: 'derive: round(100*named_play_share); universe_nodes.json named_play_share=0.6772; GATE_science.md RESOLUTION' },
  { n: '5x / 5', where: 'universe.k3Placard ("about 5x")', src: 'derive: 19538/3643=5.36; GATE_science.md K3 RESOLUTION (tap total 3,643; served total 19,538)', deviation: 'wording deviates from GATE_science.md’s own K3 text ("...5x more transitions in the raw log.") per BUILD_SPEC_V2 §8.3 — declared deviation #2' },
  { n: '41 / 34', where: 'universe.fogPlacard', src: 'UNIVERSE_SPEC.md §7 fog caption (verbatim, sourced main.tex L382)' },
  { n: '1.05 / 1.03 / 1.08 / 1.00 / 1.13 / 1.01 / 0.99 / 1.03 / 0.98 / 1.04', where: 'universe.bridgeIndexHeadline', src: 'exhibit/labels.js threshold "the finding" row L12 (verbatim, not retyped elsewhere)' },
  { n: '1.23 / 1.22 / 1.12 / 1.32', where: 'universe.genreCallout (hip-hop/r&b)', src: 'UNIVERSE_SPEC.md §7 genre callout (S1, GATE_science.md RESOLUTION), ledger row 184' },
  { n: '0.636', where: 'universe.genreCallout (ambient/lo-fi strict)', src: 'researcher.html caveat row; owner’s standing rule (strict anchor = 0.636)', deviation: 'UNIVERSE_SPEC.md §7 rounds this to "0.64× strict" — declared deviation #1, BUILD_SPEC_V2 line 620' },
  { n: '0.50 / 0.44 / 0.55', where: 'universe.genreCallout (ambient/lo-fi bundled)', src: 'UNIVERSE_SPEC.md §7 genre callout (S1)' },
  // the killed per-track genre clause (R2_VERIFY_2 honesty P0-1: B_track's null isn't 1). no key and no text ship; this
  // row only keeps the hold on the record so the clause can never clear as written (R2_REQUESTS_R4 W2). no number cited.
  { n: '', where: 'universe.genreCalloutTrackClause (killed, not shipped)', src: 'R2_VERIFY_2_honesty.md P0-1; R3_DONE_C2.md C2-a (key deleted)', pending: 'killed: never ships as written; a replacement needs a ledgered, play-count-stratified rerun (owner/paper)' },
  { n: '12,336 / 6,288 / 4,770', where: 'universe.corpusSentence', src: 'UNIVERSE_SPEC.md §7 VC panel corpus sentence', pending: 'stats-referee (§14 flag #6, H11: unreconciled against Tier-B’s 13,545 tracks; 13,545 never printed)' },
  { n: '16', where: 'kill_reconcile.json, labels_proposal.json graveyard.tally', src: 'exhibit/data/killit.json#buried (length)' },
  { n: '4', where: 'kill_reconcile.json, tours (grand 9, C1)', src: 'exhibit/data/killit.json#cases (length)' },
  { n: '18', where: 'kill_reconcile.json, labels_proposal.json graveyard.tally', src: 'researcher.html #graveyard <ol> (count of <li>)' },
  { n: '27', where: 'kill_reconcile.json N (distinct union)', src: 'derive: count of kill_reconcile.json rows, i.e. 9 same + 9 killit-only + 9 researcher-only' },
];
