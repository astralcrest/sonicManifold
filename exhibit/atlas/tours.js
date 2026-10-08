/* package C1 — tours and captions. exhibit/atlas/tours.js
   BUILD_SPEC_V2.md §4 is the contract; every stop here is transcribed from §4.3 verbatim.
   this file has no logic and fetches nothing: it is data. tour.js (M4) resolves the
   {tokens} at play time and types the caption through ctx.caption; universe.js (R4)
   resolves `focus` and `day`. tests/atlas_content.mjs re-derives every number from the
   real shipped files and checks it against `src` here, so a data rebuild that moves a
   number will fail that test rather than ship silently.

   token rules (§4.2, resolved by M4 before typing):
     {named}       count of nodes in universe_nodes.json                    (388)
     {dust_artists} count of placed==1 rows in universe_artists_all.json    (not used by any
                   caption below; documented here only because §4.2 defines it)
     {play_share}  round(100 * universe_nodes.named_play_share)             (68)
     {per_dot}     '' at P.perDot==1, else ' (on this screen one dot is four plays)'
     {every_dot}   'every play is a dot' | 'every fourth play is a dot on this screen'
     {one_play}    'one play' | 'four plays'
     {median_day}  median n over universe_days.json days with d >= 2022-02-01,
                   first (file-order) day whose n equals it                  (2022-03-29, n=58)
     {neighbour}   for the stop's focused star, the name at the far end of its largest
                   auto_rate edge in universe_edges.json; stop is skipped if none

   `focus: 'top5_by_plays[0]'` (scientists·star, musicians·star) is the literal sentinel
   string tour.js's own `resolveFocusToken()` matches (`/^top5_by_plays\[(\d)\]$/`) and
   resolves against universe_nodes.json's `top5_by_plays`/`nodes` at play time — not
   something this file resolves. On the file this build reads it is node 0, Phaeleh;
   atlas_content.mjs's drift check re-derives that and fails if a data rebuild moves it.

   Round 2 (W46/W48/W49/W50/W59, gated on W41+W43 passing): TOURS is reordered to
   ninety, grand, minute, scientists, musicians, artists — the door's own chip order
   (W49) — and the panel/door pull tour names straight from this array, so no other
   file needs to change for the order or the `minute` rename to take effect except the
   door's own static markup (index.html, package F1, flagged in R2_REQUESTS_C1.md).
   `ninety` now opens on the universe sky (the showpiece first, MS2/A-C3) and its old
   opening threshold stop is dropped rather than kept, since the new opener's own line
   ("97,427 plays. whose were they?") already says what threshold said; `minute` gets
   the same opener ahead of its unchanged stops with the probe kept last; `grand` gets
   a closing pulled-back-sky stop after `threads` so the tour ends on the whole log
   before the end card, not on the genre-thread ball.

   Round 2, critique pass (main-session review of the round-2 preview, 7 items, all in this
   file): #1 "was in code" -> "was written down" (checkably false for most pre-declarations,
   which are prose); #2 the bridge-index headline now carries all three standing failure
   conditions, not just the loosest one; #3 the sky openers drop "pulled together by what i
   played back to back" (implies position=meaning; kNN overlap is 0.16-0.29) for a bare "means
   nothing on its own"; #4 ninety's calendar stop no longer claims zero change on my side (the
   strict set moved 1.87 points); #5 the wall's guess is no longer spoiled before the reveal
   (unsorted/flood/sorted each get their own `{angle,caption}` then-entry); #6 the grand finale
   sky is framed tighter (dist 1.35, was 2.4); #7 the mid-tour universe caption (day-angle stop)
   leads with what the sky is and ends on "whose were they?", disclaimer moved to `more`. Items
   that touch files outside tours.js (the graveyard CAVEAT, the label cap, the finale's idle-yaw
   rate, the off-tour room-change caption reset) are requests, not edits — R2_REQUESTS_C1.md.

   Round 2, verify-2 pass (R2_VERIFY_2_honesty.md, stats-referee, 2026-09-28; ROUND2_PLAN C1
   items 1-4, all in this file): #1 (P0) scientists' `survive` stop shipped the VERIFY_1 P0-2
   caption the referee had already killed once (wrong statistical unit: the case-3 null scores a
   play-count-matched partition on per-play B, so "counted by artist" is wrong, and "a genre i go
   and pick" is an intent claim the test doesn't carry) — R2_REQUESTS_M4.md's L67 request to fix
   it was never applied; replaced with the referee's settled, unit-free string (no "counted by
   X" claim at all). #2 (P1) scientists' `star` stop described a per-arm/play-count card that
   only exists with Tier B loaded; in the shipping (Tier-B-404) state the HUD shows a smoothed
   tap-share estimate instead, so the caption now matches what actually ships. #3 (P1) the grand
   tour's mid-tour universe sky caption (also chrome.js's off-tour default for universe/sky,
   VERIFY_1 P1-4 back again since W08 moved the disclaimer out of `.say` on desktop) asserted the
   seeded layout as meaning with no "means nothing" line; now carries it inline, and moves the
   "rest ring the edge" clause to what GATE_tierb_privacy's ring-order recompute actually found
   (in order of plays, not "no order"). #4 (P0) `ninety`/`minute` stop 1 kept the pre-W46
   `pose:{dist:2.35}` (a far pull-back that leaves the showpiece a 150-260px blob for most of an
   8s hold, per tests/V2B/vid_uni_desk) even though the opener's own caption has said "every
   artist... is a star" (the full sky) since W46 landed; pose now carries the request's own low,
   cinematic pitch (.25, well under the room's calibrated home pitch of .95-1.2) at dist:0.8 —
   tuned down from the request's suggested dist:1.0, which pixel-scanned to only 56% of the
   stage's short side on desktop against that flatter pitch, short of the >=60% accept bar
   (tests/round2_C1_accept.mjs; 0.8 measures 67% desk / 73% phone, both stable through the hold).
   The fix text also asks for a yaw-drift ambient move in place of the room's
   default arrival pull-back-glide on this stop — that is camera.js/universe.js territory, not
   tours.js data (same category as the finale's idle-yaw rate above), so it is requested, not
   edited, in R2_REQUESTS_C1.md.

   Round 3 (ROUND3_OPEN.md package C1, 2026-09-28, five items, all in this file): C1-a (P1) the
   grand finale (stop 12) moves off `sky, dist:1.35` — which pixel-scanned to ~0.63 of the stage
   short side, under the >=0.65 accept bar, and never showed the LINKS view on any stop in any
   tour — onto `links, dist:1.0, pitch:.3, arm:'both'`, all co-listening trails lit together; C1-e
   folds into the same stop, "the whole seven years" -> "the whole log" (honesty P2-6). C1-b the
   grand opener's old machine/advancing/queue framing of the 81% is now "the queue or shuffle
   started", matching the wall room's own current wording for the same share. C1-c the
   musicians·threads stop (still `pending: 'stats-referee'`) still carried the exact per-artist
   framing R2_VERIFY_2 killed once already (honesty P0-1, see the graveyard·survive stop's own
   comment below for that history); replaced with universe.js's own cleared callout (R2_DONE_R4
   item 1) so a future un-pend can't ship the killed wording by accident. C1-d the ninety/minute
   opener dropped its lead disclaimer ("where it sits means nothing on its own") — that caveat still ships on the
   star-detail card and every stop that focuses a star — in favour of a sourced star count via
   {named}. See R3_DONE_C1.md for full before/after text and acceptance-test results.

   Round 5 (R5_PLAN §4, tours agent, 2026-10-01): every tour is reordered by coolness and engagement
   persistence. `gate: true` marks a tour's threshold: chrome.js counts the stepper from the stop after it
   (01/06, never 01/18). A tour's `capSpeed` multiplies the typing rate and `capWords` reveals whole words
   only (chrome.js). `minute` keeps its id (door links use #tour=minute) and is now the 45 s pitch. Binding
   copy: never "seven years" (253 plays over 44 days predate 2022-02), never "discover" or "the algorithm
   chose"; autoplay = the next song starting on its own, shuffle off; 1.05 always with [1.03, 1.08], "a
   direction, not a size" and a failure clause; plain words ("100 jumps") before the term "bridge index".

   Round 5 pass 2 (2026-10-02): the stops that landed in pass 2 are in, captions from each
   R5/<id>/integrate/tours.json with the REFEREE_APPLIED / REFEREE2 / REFEREE3 caption rules applied: the
   duel (game), bail, loop, arrivals ("first full play", REFEREE2 P1-C3), wheel ("i didn't start by hand",
   REFEREE2 P1; scientists' long rule-based string split at its sentence breaks), the fade dial (listeners
   angle, replaces the autoplay then-entry in grand and scientists), the gates (graveyard angle) and the
   ghost (map angle). tour.js keys then-captions by angle id (capByAngle) and types one only when the angle
   id changes, so a stop can carry at most ONE caption per angle id in its `then`; three gates captions and
   two ghost captions therefore span two stops (the extra stop's own caption is the next sentence), never
   repeated same-angle then-entries.

   Round 5 TOURS3 (2026-10-02, R5/CRIT6 §2 + §6): grand reordered to threshold, universe, wall, game, bail, listeners,
   chain, arrivals, clock, map, graveyard·gates, graveyard·kill, calendar, loop, wheel, make, yours (17 stops). the wall
   moves up so its pour teaches the mint/amber/violet key before the stops that use it; the map precedes the gates (their
   copy cites a killed embedding arm); the fade and ghost angles leave grand (scientists keeps both). tour.js INT2 now
   types each then-step's own caption, so the gates' three sentences share one stop over the doors. ninety re-paced:
   wall 3, game 15 (ceiling; the room ends it at about 12.5 s), bail 8, universe 16, and its listeners stop gains the other two 1.05 conditions. */

export const DWELL = { short: 0.45, normal: 1, long: 1.7 };

/* shared src lists (copied into each stop so every stop still reads on its own) */
const S_PAIR = ['exhibit/data/twolisteners.json#full_transition_crossing', 'derive:tap_cross_pct', 'derive:auto_cross_pct', 'exhibit/rooms/hundred.js'];
const S_BI = ['exhibit/data/twolisteners.json#full_transition_crossing', 'derive:tap_cross_pct', 'derive:auto_cross_pct', 'exhibit/labels.js#threshold.finding'];
const S_EDGES = ['exhibit/data/universe_edges.json', 'derive:edge_count', 'derive:hand_link_count', 'derive:hand_link_floor', 'derive:named_count'];
const S_GATES = ['exhibit/data/gates.json#caption', 'exhibit/data/gates.json#tally'];
const S_GAME = ['exhibit/data/whopressed2.json', 'exhibit/rooms/game.js'];
/* R9 postcards: one sourced share line per stop (s/<stop>.html unfurls it; chrome.js `share` sends it). each is a caption
   in this file verbatim or trimmed, except the bridge line (R5 brief); atlas_content.mjs verifies every number against src */
const SHARE = {
  threshold: { line: 'spotify logged what i played and i assumed the log was a record of me. the queue or shuffle started four fifths of it.', src: ['exhibit.html#threshold.say', 'exhibit/data/wall.json#pct_rounded'] },
  universe: { line: 'my 388 most-played artists, one star each. where one sits means nothing on its own.', src: ['exhibit/data/universe_nodes.json#nodes', 'derive:named_count'] },
  game: { line: 'can you tell who pressed play? play a run, then send the same deck to a friend.', src: ['exhibit/data/whopressed2.json', 'exhibit/rooms/game.js'] },
  bail: { line: '61% of my skip-forward presses came inside 5 s, most in runs.', src: ['exhibit/data/bail.json#pct_in5', 'exhibit/data/bail.json#bins', 'exhibit/data/bail.json#n_in5_in_runs'] },
  listeners: { line: 'of 100 tagged jumps, do my picks cross genre more than autoplay?', src: ['exhibit/data/twolisteners.json#full_transition_crossing', 'derive:tap_cross_pct', 'derive:auto_cross_pct', 'exhibit/rooms/hundred.js'] },
  chain: { line: 'make a chain: start anywhere and follow a real link. 482 links join 293 of the 388 stars of my sky; on 264 of them i made the jump by hand at least 3 times.', src: ['exhibit/data/universe_edges.json#edges', 'derive:edge_count', 'derive:linked_node_count', 'derive:named_count', 'derive:hand_link_count', 'derive:hand_link_floor'] },
  wall: { line: '19 of every 100 plays started by my hand, 17 by shuffle, 64 by the queue.', src: ['exhibit/data/wall.json#total', 'exhibit/data/wall.json#pct_rounded'] },
  arrivals: { line: '6,277 artists, falling in the order of their first full play in my log. for about two in three, the queue started that play.', src: ['exhibit/data/arrivals.json#n', 'derive:arrivals_n', 'exhibit/data/arrivals.json#folded.bundled'] },
  loop: { line: 'hold to loop. 12,390 times my log shows the same song twice in a row. most of those repeats sit in streaks of 14 or more.', src: ['exhibit/data/loops.json#repeats', 'exhibit/data/loops.json#tail'] },
  wheel: { line: '5,489 listening sessions. inside them the wheel changed hands 20,688 times (bundled reading).', src: ['exhibit/data/wheel_agg.json#sessions.n', 'exhibit/data/wheel_agg.json#ruler.bundled.handoffs'] },
  calendar: { line: 'october 2023: the app changed how it records what started a song. my tapped share reads 11.8% before the line and 22.7% after. nothing about me moved 10.9 points that month.', src: ['exhibit.html#calendar.say', 'exhibit.html#calendar.say.dim', 'exhibit/labels.js#calendar.swing'] },
  clock: { line: 'my whole log folded onto one day: midnight at the top, noon at the bottom. the busiest hour is 14:00, on one fixed clock, all year.', src: ['exhibit/data/clock.json#hours', 'derive:hour14_total', 'exhibit/data/clock.json#tap_share_by_hour', 'exhibit/labels.js#clock.hour'] },
  map: { line: 'a program learned a map of my artists from my plays. the more of its diet was songs i didn’t pick, the higher my number read on it. my headline uses no map.', src: ['exhibit/labels.js#map.curve', 'exhibit/labels.js#map.withdrawn'] },
  graveyard: { line: 'each card is a claim i once made. press it: 150 to 500 fake versions of my data fall first. if my real number lands in that pile, the claim dies.', src: ['exhibit/data/killit.json#buried', 'exhibit/data/killit.json#cases', 'researcher.html#graveyard'] },
  make: { line: 'the 81% falls away; the 19% i tapped becomes a wheel of my 22 tracks, placed by musical key. pick one: the glow shows which others mix cleanly with it.', src: ['exhibit.html#make.say', 'exhibit/data/wall.json#pct_rounded', 'exhibit/data/tracks.json'] },
  yours: { line: 'find your own split: drop your export, nothing leaves your tab.', src: ['exhibit.html#yours.say'] },
};

/* R5 R6 gates: gates.json `caption`, verbatim, split at its sentence breaks (REFEREE2 C1); no digits */
const GATES1 = 'the thirteen tests the headline faced, each written down before it ran, as doors.';
const GATES2 = 'three slammed: two killed readings of the headline (its first form, its \'agency\' reading), one killed an embedding arm; the headline\'s direction stayed.';
const GATES3 = 'four could never have closed, and two more were set too high to close: writing a test down first fixes the order, not the power.';
/* R6 CAPTION8: the grand tour's plain-words gates (the verbatim gates.json three stay on the scientists tour) */
const GATES1P = 'before each test of my main finding ran, i wrote down what result would kill it. each door is one test.';
const GATES2P = 'three doors slammed: they killed two readings of the finding and a map-based version. the plain direction stayed.';
const GATES3P = 'four doors could never have closed, and i set two too high to close. writing a test down first fixes the order, not its strength.';
/* R5 R5 ghost: the referee's cap (REFEREE_APPLIED "exact copy"), split at its sentence break; the second line carries the 1.05 hedge */
const GHOST1 = 'a made-up world where both kinds of song change genre equally often. a map trained the same way still sees a gap. that\'s one reason my headline uses no map.';
const GHOST2 = 'one reason the headline uses no map: 1.05 [1.03, 1.08], a direction, not a size: how the untagged jumps are handled moves it 1.00 to 1.13; the loosest or 50-play definitions read 1.01.';
/* the bridge-index ratio with its conditions (bi REFEREE2 C-4 / tours brief: never a bare "a third of jumps" rate) */
const TAPS1 = '69.9 ÷ 66.3 = 1.05, likely 1.03 to 1.08, the bridge index: a direction, not a size. how untagged jumps are handled moves it 1.00 to 1.13; loosest or 50-play definitions read 1.01.';

export const TOURS = [
  {
    // R5 §4.2: the pocket tour. every caption <= 90 chars, typed twice as fast, whole words only (76 s authored; TOURS3
    // re-paced it per CRIT6 §6, see the stop notes)
    id: 'ninety',
    name: 'the single',
    blurb: 'for a phone and a minute and a half',
    capSpeed: 2, capWords: true,
    stops: [
      {
        room: 'threshold', angle: 'whole', hold: 6, gate: true,
        share: SHARE.threshold,
        caption: '97,427 plays in my log. i assumed i started them. who actually did?',
        src: ['exhibit/data/wall.json#total'],
      },
      {
        // light and preloaded, so the 858 KB universe stays off the first stop; under via:'tour' the heap pours at once.
        // TOURS3 (CRIT6 §6): the tour's arrival waits out the pour (wall.js pourIn 4.6 s), so hold 3 = a 3 s tail once it lands
        room: 'wall', angle: 'pour', hold: 3,
        share: SHARE.wall,
        caption: '19 of every 100 plays started by my hand, 17 by shuffle, 64 by the queue.',
        src: ['exhibit/data/wall.json#pct_rounded'],
      },
      {
        // R5 R1 duel. CRIT6A: the room ends the stop itself (game.js dTour: 8 s idle, its own demo card, then tour.js
        // holdLeft advances at about 12.5 s; each visitor call keeps it open 12 s more, three calls max). hold 15 = the ceiling
        room: 'game', angle: 'round', hold: 15,
        share: SHARE.game,
        caption: 'your turn: swipe who pressed play, me or the queue. a coin gets half.',
        src: S_GAME.slice(),
      },
      {
        room: 'listeners', angle: 'hundred', hold: 8,
        share: SHARE.listeners,
        caption: 'of 100 tagged jumps, about 70 of mine switch genre. when the queue runs on, about 66.',
        src: S_PAIR.slice(),
        then: [{
          angle: 'taps',
          caption: '1.05, likely 1.03 to 1.08: a direction, not a size; untagged jumps move it 1.00 to 1.13.',
          src: S_BI.slice(),
        }, {
          // TOURS3 (CRIT6 §4 P1, V4 P2-2): the other two conditions on 1.05, a second step over the same picture (90-char cap)
          angle: 'taps',
          caption: 'the loosest or 50-play definitions read 1.01. that\'s how fragile it is.',
          src: ['exhibit/labels.js#threshold.finding', 'exhibit/data/bi_conditions.json'],
        }],
      },
      {
        // R5 N1 bail (REFEREE_APPLIED #2: "skip-forward presses", never "skips"). TOURS3 (CRIT6 §6): the demo thumb lets go
        // about 3.8 s after arrival (bail.js demo 1200 + 2600 ms); hold 8 leaves a 4 s tail. on a 390 phone the caption's
        // two-chunk carousel outlasts the hold (about 5.5 s tail measured at 7 or 8), so the rest is chrome.js's read time
        room: 'bail', angle: 'heap', hold: 8,
        share: SHARE.bail,
        caption: 'let go when you’d skip. 61% of my skip-forward presses came inside 5 s, most in runs.',
        src: ['exhibit/data/bail.json#pct_in5', 'exhibit/data/bail.json#bins', 'exhibit/data/bail.json#n_in5_in_runs'],
      },
      {
        // TOURS3 (CRIT6 §6): 16 s on the most stunning stop. no scripted strum: tours.js has no demo hook (the strum is kiosk-only)
        room: 'universe', angle: 'sky', hold: 16,
        share: SHARE.universe,
        caption: 'my {named} most-played artists. where one sits means nothing. press one to hear it.',
        src: ['exhibit/data/universe_nodes.json', 'derive:named_count'],
      },
      {
        room: 'yours', angle: 'bars', hold: 8,
        share: SHARE.yours,
        caption: 'find your own split: drop your export, nothing leaves your tab.',
        src: ['exhibit.html#yours.say'],
      },
    ],
  },
  {
    // R5 §4.1: opens on the most stunning stop after the gate; the threads/links coda is retired (the chain replaces it).
    // TOURS3 (R5/CRIT6 §2): threshold, sky, wall, game, bail, listeners, chain, arrivals, clock, map, gates, pile, calendar,
    // loop, wheel, make, yours (17); the fade and ghost angles left this tour (scientists keeps both).
    // R12 UNFOLD: + wall·press after the wall, + clock·glass after the clock (19 with the gate; the record counts 18)
    id: 'grand',
    name: 'the long play',
    blurb: 'from one play to the whole log',
    stops: [
      {
        room: 'threshold', angle: 'whole', gate: true,
        share: SHARE.threshold,
        pose: { yaw: 0, pitch: 0, z: 1 },
        caption: 'every dot is a song i played. i assumed i\'d picked most of them. i started about one in five; shuffle or the queue started the rest.',
        src: ['exhibit.html#threshold.say'],
      },
      {
        // no pose: R5 R2 tuned the room's own home framing to fill >= 85% of the stage; hold 12 lets the kiosk strum finish
        room: 'universe', angle: 'sky', hold: 12,
        share: SHARE.universe,
        caption: 'each star is an artist i played 50 times or more: {named} of them. colour is genre. where a star sits means nothing. press one to hear it.',
        src: ['exhibit.html#universe.say', 'exhibit/data/universe_nodes.json', 'derive:named_count', 'exhibit/data/universe_edges.json'],
      },
      {
        // TOURS3 (CRIT6 §2): stop 2, right after the sky: the headline split, and the mint/amber/violet key the game, the
        // listeners and the later stops lean on. the guess stays unspoiled (R2 critique #5): the question on the unsorted wall, then the pour answers it
        room: 'wall', angle: 'unsorted', hold: 7,
        share: SHARE.wall,
        pose: { z: 1 },
        caption: '97,427 plays, all one colour for now. guess before they pour: of every 100, how many did i start by hand?',
        src: ['exhibit/data/wall.json#total'],
        then: [
          {
            angle: 'pour',
            caption: 'mint: i picked it, 19 in 100. amber: shuffle, 17. violet: it just played on next, 64.',
            src: ['exhibit/data/wall.json#total', 'exhibit/data/wall.json#pct_rounded', 'exhibit/labels.js#wall.the pour'],
          },
          {
            // R6 ME: the by-hand tally needs about 5.4 s after the pour lands; a second step over the same pour holds the picture (tour.js then dwell 6 s)
            angle: 'pour',
            caption: 'one song lifts out of the mint jar: Outside the Lines · Phaeleh. i pressed play on it by hand 99 times.',
            src: ['exhibit/data/by_hand.json'],
          },
          {
            // also chrome.js's off-tour caption for a sorted wall (pickCaption reads the grand tour), so it never shows the question
            angle: 'sorted',
            caption: 'same plays, back on the wall in three piles: mine, shuffle\'s, the queue\'s. tap a pile to go there.',
            src: ['exhibit/rooms/wall.js#flyPile'],
          },
        ],
      },
      {
        // R12 UNFOLD: the press, right after the piles: the same two provenances as a two-ink print (wall.press.js;
        // the room's own capFor line takes over off the tour). hold 9 after the drum roll lands
        room: 'wall', angle: 'press', hold: 9,
        share: SHARE.wall,
        caption: 'mint plate: my taps. violet plate: the queue. where one ink prints alone, we disagreed.',
        src: ['exhibit/data/wall.json#tap', 'exhibit/data/wall.json#served', 'exhibit/rooms/wall.press.js'],
      },
      {
        // R5 R1 duel (game fragment, REFEREE2 C3). CRIT6A: the room ends the stop itself (8 s idle, its own demo card, then
        // tour.js holdLeft at about 12.5 s; a visitor's calls keep it open 12 s each, three max). hold 15 = the ceiling
        room: 'game', angle: 'round', hold: 15,
        share: SHARE.game,
        pose: { z: 1 },
        caption: 'two songs from my log, back to back. did i pick the second one, or did it just come on next? your call. a coin gets half right.',
        src: S_GAME.slice(),
      },
      {
        // R5 N1 bail (REFEREE_APPLIED #1 and #5, verbatim): the demo thumb holds 2.6 s and drops; the then turns to the 30-second line
        room: 'bail', angle: 'heap', hold: 9,
        share: SHARE.bail,
        caption: 'hold to listen, let go when you’d skip. i pressed skip-forward 12,441 times; 7,559 of those came inside five seconds.',
        src: ['exhibit/data/bail.json'],
        then: [{
          angle: 'line',
          caption: 'spotify only counts a play after 30 seconds: that\'s the line. 9,537 of my skip-forward presses came before it.',
          src: ['exhibit/data/bail.json', 'derive:bail_pre30'],
        }],
      },
      {
        // R5 L4: plain words, then the term, then the conditions. TOURS3 (CRIT6 §2): the fade dial left the grand tour; it
        // stays in scientists and one angle away
        room: 'listeners', angle: 'hundred', hold: 9,
        share: SHARE.listeners,
        caption: '100 jumps between two genre-tagged artists. when i picked the next song, about 70 switched genre. when autoplay ran on (the next song starting by itself, shuffle off), about 66.',
        src: S_PAIR.slice(),
        then: [{
          angle: 'taps',
          caption: '69.9 ÷ 66.3 = 1.05, likely 1.03 to 1.08. i call it the bridge index. a direction, not a size.',
          src: S_BI.slice(),
        }, {
          angle: 'taps',
          caption: 'and it\'s fragile. how i count jumps to untagged artists moves it anywhere from 1.00 to 1.13; the loosest or 50-play definitions read 1.01.',
          src: ['exhibit/labels.js#threshold.finding', 'exhibit/data/bi_conditions.json'],
        }],
      },
      {
        // hold 11: the room's kiosk demo (five hops from Phaeleh, then the riff) runs about 10 s
        room: 'chain', angle: 'all', hold: 11,
        share: SHARE.chain,
        caption: 'a line joins two artists i played back to back. mint: i made that jump myself. violet: it just came on next. build a chain and hear it.',
        src: S_EDGES.slice(),
      },
      {
        // R5 N3 arrivals (REFEREE_APPLIED P1-C1 + REFEREE2 P1-C3 "first full play"); the demo rains all 6,277 then lifts one, about 6.5 s
        room: 'arrivals', angle: 'rain', hold: 10,
        share: SHARE.arrivals,
        caption: '6,277 artists, falling in the order of their first full play in my log. for about two in three, the queue started that play.',
        src: ['exhibit/data/arrivals.json', 'derive:arrivals_n', 'derive:arrivals_queue_in_three'],
      },
      {
        /* no pose, same reason: 'busiest' is hourPose() on hour 14, fitted so the wedge and the readout stay whole */
        room: 'clock', angle: 'busiest',
        share: SHARE.clock,
        caption: 'my whole log folded onto one day: midnight at the top, noon at the bottom. the busiest hour is 14:00, on one fixed clock, all year.',
        src: ['exhibit/data/clock.json#hours', 'derive:hour14_total', 'exhibit/data/clock.json#tap_share_by_hour', 'exhibit/labels.js#clock.hour'],
      },
      {
        // R12 UNFOLD: the glass, right after the dial: the same day as 24 panes (rose.js; clock.js's capFor line off the tour)
        room: 'clock', angle: 'glass', hold: 9,
        share: SHARE.clock,
        caption: 'the same day in glass. a pane’s colours: who started its plays. its glow: how many.',
        src: ['exhibit/data/clock.json#tap', 'exhibit/data/clock.json#shuffle', 'exhibit/data/clock.json#served', 'exhibit/atlas/rose.js'],
      },
      {
        room: 'map', angle: 'm12', then: ['m100', 'curve'],
        share: SHARE.map,
        pose: { z: 1 },
        caption: 'a program learned a map of my artists from my plays. the more of its diet was songs i didn’t pick, the higher my number read on it. my headline uses no map.',
        src: ['exhibit/labels.js#map.curve', 'exhibit/labels.js#map.withdrawn'],
      },
      {
        // R5 R6 gates: gates.json `caption` verbatim, its three sentences over the doors (tour.js INT2 types each then-step's
        // own caption, so the angle id repeats). TOURS3 (CRIT6 §2): the doors come after the map (their copy cites a killed
        // embedding arm) and before the pile. no pose: the gates angle frames the doors itself
        room: 'graveyard', angle: 'gates', hold: 7,
        share: SHARE.graveyard,
        caption: GATES1P,
        src: S_GATES.slice(),
        then: [
          { angle: 'gates', caption: GATES2P, src: S_GATES.slice() },
          { angle: 'gates', caption: GATES3P, src: S_GATES.slice() },
        ],
      },
      {
        // the pile, after the doors (TOURS3, CRIT6 §2)
        room: 'graveyard', angle: 'kill',
        share: SHARE.graveyard,
        pose: { z: 1 },
        caption: 'each card is a claim i once made. press it: 150 to 500 fake versions of my data fall first. if my real number lands in that pile, the claim dies.',
        src: ['exhibit/data/killit.json#buried', 'exhibit/data/killit.json#cases', 'researcher.html#graveyard', 'exhibit/labels.js#graveyard.what falls'],
      },
      {
        /* no pose: the room's own 'line' angle frames the break (linePose, z <= 1.6, fitted to the stage). a hand-set
           {z:2.4, look:'break'} put the baseline under the fold and the swing under the ladder (fix r3; framing gate) */
        room: 'calendar', angle: 'line',
        share: SHARE.calendar,
        caption: 'october 2023: the app changed how it records what started a song. my tapped share reads 11.8% before the line and 22.7% after. nothing about me moved 10.9 points that month.',
        src: ['exhibit.html#calendar.say', 'exhibit.html#calendar.say.dim'],
      },
      {
        // R5 N4 loop (REFEREE_APPLIED P1-1 verbatim; pass 3 "my log counts"); hold 13 covers the five-loop demo
        room: 'loop', angle: 'tower', hold: 13,
        share: SHARE.loop,
        caption: 'a pedalboard of my repeats, one ring per run length. twice is a solid ring; fifty or more is 35 glyphs you can count.',
        src: ['exhibit/data/loops.json'],
        then: [{
          angle: 'ten',
          caption: '1,957 songs my log counts 10 times or more: one glyph each, no titles.',
          src: ['exhibit/data/loops.json#tracks_10plus'],
        }],
      },
      {
        // R5 N5 wheel, aggregate view only (REFEREE_APPLIED #3 with REFEREE2 P1 "i didn't start by hand"); {handoffs} is the
        // named ruler's own count. the strict then is also chrome.js's off-tour caption for the strict ruler
        room: 'wheel', angle: 'bundled', hold: 11,
        share: SHARE.wheel,
        caption: 'a run is songs in a row started the same way. mint bars: runs i started. violet: runs i didn’t. most of mine are one song long.',
        src: ['exhibit/data/wheel_agg.json#ruler.bundled'],
        then: [{
          angle: 'strict',
          caption: '5,489 listening sessions. on the strict reading the wheel changed hands 14,795 times inside them. mint: runs i started by hand. violet: runs i didn’t.',
          src: ['exhibit/data/wheel_agg.json#sessions.n', 'exhibit/data/wheel_agg.json#ruler.strict.handoffs'],
        }],
      },
      {
        room: 'make', angle: 'wheel',
        share: SHARE.make,
        pose: { z: 1 },
        caption: 'the 81% falls away; the 19% i tapped becomes a wheel of my 22 tracks, placed by musical key. pick one: the glow shows which others mix cleanly with it.',
        src: ['exhibit.html#make.say', 'exhibit/data/tracks.json'],
      },
      {
        // the side room closes the tour; R7's card renderer is live there. the end card follows (chrome.js)
        // TODO(R5 R8 call it first): the calibration card joins this stop when R8 lands (not built this round)
        room: 'yours', angle: 'bars', hold: 8,
        share: SHARE.yours,
        caption: 'find your own split: drop your export, nothing leaves your tab. then make a card of it.',
        src: ['exhibit.html#yours.say'],
      },
    ],
    // TODO(R5 §4.1 phone fallback): coarse pointers run threshold > wall·pour > game > universe > bail > ... only if
    // universe misses first-interactive <= 2.5 s on the throttled phone (P0 decides; not wired here)
    // TODO(R5 §4.1 holds): bar-aware holds (ctx.audio.beat) and downbeat cinema cuts are wave-3 items, not built
  },
  {
    // R5 §4.3: the 45-second pitch. the id stays 'minute' so the door's #tour=minute links keep working
    id: 'minute',
    name: 'the radio edit',
    blurb: 'the short cut, for someone in a hurry',
    capSpeed: 2, capWords: true,
    stops: [
      {
        room: 'universe', angle: 'sky', hold: 6,
        share: SHARE.universe,
        caption: 'my {named} most-played artists, one star each. where one sits means nothing on its own.',
        src: ['exhibit/data/universe_nodes.json', 'derive:named_count'],
      },
      {
        room: 'wall', angle: 'pour', hold: 6,
        share: SHARE.wall,
        caption: '81 of every 100 plays started without my hand. and that\'s the generous reading.',
        src: ['exhibit/data/wall.json#pct_rounded', 'exhibit.html#make.say'],
      },
      {
        room: 'listeners', angle: 'hundred', hold: 7,
        share: SHARE.listeners,
        caption: 'of 100 tagged jumps, about 70 of mine switch genre, about 66 of the queue\'s. loosest rules: a tie.',
        src: S_PAIR.slice(),
      },
      {
        // R5 R1 duel: the result card's link deals a friend the same deck (exhibit.html#game&s=<seed>)
        room: 'game', angle: 'round', hold: 7,
        share: SHARE.game,
        caption: 'can you tell who pressed play? play a run, then send the same deck to a friend.',
        src: S_GAME.slice(),
      },
      {
        room: 'bail', angle: 'heap', hold: 6,
        share: SHARE.bail,
        caption: '61% of my skip-forward presses came inside five seconds, most in runs.',
        src: ['exhibit/data/bail.json#pct_in5', 'exhibit/data/bail.json#n_in5_in_runs'],
      },
      {
        room: 'calendar', angle: 'line', hold: 7,
        share: SHARE.calendar,
        caption: 'the logger itself moved: my tapped share jumped 10.9 points in october 2023, when the app changed how it records a start.',
        src: ['exhibit.html#calendar.say', 'exhibit.html#calendar.say.dim'],
      },
      {
        room: 'yours', angle: 'bars', hold: 6,
        share: SHARE.yours,
        caption: 'run yours: drop your spotify export here. nothing leaves your tab.',
        src: ['exhibit.html#yours.say'],
      },
    ],
  },
  {
    // R5 §4.4
    id: 'scientists',
    name: 'liner notes for scientists',
    blurb: 'what i claim, and what i did to try to kill it',
    stops: [
      {
        room: 'threshold', angle: 'whole', gate: true,
        share: SHARE.threshold,
        caption: 'the instrument is one field: the export’s reason_start, spotify’s own record of what started each play.',
        src: ['exhibit/labels.js#wall.split'],
      },
      {
        // hundred → taps → the fade dial (the conditions as an instrument; bi fragment replaces the autoplay then-entry)
        room: 'listeners', angle: 'hundred', hold: 9,
        share: SHARE.listeners,
        caption: '100 jumps between two genre-tagged artists, same session. my pick (play button, track row, remote): about 70 crossed genre. autoplay (the next song starting on its own, shuffle off): about 66.',
        src: S_PAIR.slice(),
        then: [
          {
            angle: 'taps',
            caption: 'bridge index 1.05, likely 1.03 to 1.08: a direction, not a size. a third of my jumps and two fifths of autoplay\'s carry no genre tag; how they are handled moves the index 1.00 to 1.13. loosest definitions: 1.01.',
            src: ['exhibit/labels.js#threshold.finding', 'exhibit/data/bi_conditions.json'],
          },
          {
            angle: 'fade',
            caption: 'a dial that drops my rarely played artists, step by step. while the bracket stays right of the dashed 1.00, the direction holds: up to 20 plays. by 50 plays the index sits 0.045 lower.',
            src: ['exhibit/data/bi_conditions.json'],
          },
        ],
      },
      {
        room: 'map', angle: 'curve',
        share: SHARE.map,
        caption: 'leakage. retrain an embedding (a learned artist map) on a bigger share of plays i didn’t tap and the same bridge index climbs from 0.99 to 1.46. my first reading, 1.61, came off one; withdrawn. my headline uses no map.',
        src: ['exhibit/labels.js#map.curve', 'exhibit/labels.js#map.withdrawn'],
      },
      {
        // R5 R5 ghost: why no map (its own stop: one caption per angle id per stop)
        room: 'map', angle: 'ghost', hold: 8,
        share: SHARE.map,
        caption: GHOST1,
        src: ['exhibit/data/ghost.json'],
        then: [{ angle: 'ghost', caption: GHOST2, src: ['exhibit/data/ghost.json', 'exhibit/labels.js#threshold.finding'] }],
      },
      {
        room: 'graveyard', angle: 'kill',
        share: SHARE.graveyard,
        caption: 'each card is a claim i once made. press it: 150 to 500 fake versions of my data fall first. if my real number lands in that pile, the claim dies.',
        src: ['exhibit/labels.js#graveyard.what falls', 'exhibit/labels.js#graveyard.verdict'],
      },
      {
        // VERIFY_2 #1: the referee's settled, unit-free string (no "counted by X" claim). R5 R6: the gates follow
        room: 'graveyard', angle: 'survive',
        share: SHARE.graveyard,
        caption: 'this one stood outside its pile: 0 of 150 same-sized random groups came as far. but i added this check after the fact, and it counts plays.',
        src: ['exhibit/data/killit.json#cases.3.c', 'exhibit/data/killit.json#cases.3.x'],
        then: [{ angle: 'gates', caption: GATES1, src: S_GATES.slice() }],
      },
      {
        room: 'graveyard', angle: 'gates', hold: 7,
        share: SHARE.graveyard,
        caption: GATES2,
        src: S_GATES.slice(),
        then: [{ angle: 'gates', caption: GATES3, src: S_GATES.slice() }],
      },
      {
        room: 'wall', angle: 'sorted',
        share: SHARE.wall,
        caption: 'back to the instrument. on the broad reading i tapped 19 in every 100 plays; on the strictest (play button, track row, remote), 11.5.',
        src: ['exhibit/labels.js#wall.split', 'exhibit/labels.js#game.labels', 'exhibit/data/wall.json#pct_rounded', 'exhibit/labels.js#calendar.survived'],
      },
      {
        // R5 N1 bail: the 30-second line, what counts as a play (REFEREE_APPLIED #4 verbatim)
        room: 'bail', angle: 'line', hold: 12,
        share: SHARE.bail,
        caption: 'the 30-second line: spotify only counts a play past 30 s. 27,961 of 125,388 track rows never got there; the other stops count only the 97,427 that did.',
        src: ['exhibit/data/bail.json'],
      },
      {
        // R5 N5 wheel: REFEREE_APPLIED #1 with REFEREE2 P1, split at its sentence breaks (220 gate). one caption per angle id
        // per stop (header), so the strict line is the same template shortened, with the shape caveat inline
        room: 'wheel', angle: 'bundled', hold: 9,
        share: SHARE.wheel,
        caption: 'who held the wheel (bundled): runs i started by hand are mostly one play (median 1); runs i didn’t start by hand go longer (median 2).',
        src: ['exhibit/data/wheel_agg.json#ruler.bundled'],
        then: [
          {
            angle: 'bundled',
            caption: 'don’t read a habit into that: by hand is the smaller share (18,591 of 97,427 plays), and a smaller share makes shorter runs by arithmetic alone. shapes, not a rate comparison. flip the ruler.',
            src: ['exhibit/data/wheel_agg.json#ruler.bundled', 'exhibit/data/wheel_agg.json#sessions.plays'],
          },
          {
            angle: 'strict',
            caption: 'who held the wheel (strict): runs i started by hand, median 1; runs i didn’t start by hand, median 4. by hand is the smaller share again (11,176 of 97,427 plays): shapes, not a rate comparison.',
            src: ['exhibit/data/wheel_agg.json#ruler.strict', 'exhibit/data/wheel_agg.json#sessions.plays'],
          },
        ],
      },
      {
        room: 'calendar', angle: 'line',
        share: SHARE.calendar,
        caption: 'instrument failure: the bundled tapped rate reads 11.8% before october 2023 and 22.7% after, against a stability bar of 3 points i wrote down first. the strict set swings 1.87 points.',
        src: ['exhibit/labels.js#calendar.swing', 'exhibit/labels.js#calendar.survived'],
      },
      {
        room: 'yours', angle: 'bars',
        share: SHARE.yours,
        caption: 'run the same split on your own export, in this tab: same field, same broad ruler on both sides. nothing is uploaded.',
        src: ['exhibit.html#yours.say'],
      },
    ],
  },
  {
    // R5 §4.5
    id: 'musicians',
    name: 'liner notes for musicians',
    blurb: 'the tracks i made about this log, and how they mix',
    stops: [
      {
        room: 'threshold', angle: 'whole', gate: true,
        share: SHARE.threshold,
        caption: 'turn the sound on. from here, every hover plays one note in the key of the track underneath.',
        src: [],
      },
      {
        room: 'universe', angle: 'sky', hold: 12,
        share: SHARE.universe,
        caption: '{named} artists, each a note: the genre picks the pitch, more plays sit lower. a star’s strongest links ring with it. where one sits means nothing.',
        src: ['exhibit/data/universe_nodes.json', 'derive:named_count', 'exhibit/data/universe_edges.json'],
      },
      {
        // R5 N4 loop: the pedal
        room: 'loop', angle: 'tower', hold: 14,
        share: SHARE.loop,
        caption: 'the bar keeps looping while you hold; my log answers with how many streaks got that far.',
        src: ['exhibit/data/loops.json'],
      },
      {
        // R5 N1 bail: the first five seconds (REFEREE_APPLIED #3: never "decide")
        room: 'bail', angle: 'heap', hold: 12,
        share: SHARE.bail,
        caption: '7,559 of my 12,441 skip-forward presses came inside five seconds, most of them in runs, thumbing through a queue.',
        src: ['exhibit/data/bail.json'],
      },
      {
        room: 'chain', angle: 'all', hold: 11,
        share: SHARE.chain,
        caption: 'every hop is a note. build a riff out of real jumps, then send it.',
        src: ['exhibit/data/universe_edges.json'],
      },
      {
        // R5 R1 duel: call it on the beat
        room: 'game', angle: 'round', hold: 15,
        share: SHARE.game,
        caption: 'call it on the beat: each name rings its genre as a note, and the answer lands on the next beat.',
        src: S_GAME.slice(),
      },
      {
        room: 'listeners', angle: 'hundred', hold: 9,
        share: SHARE.listeners,
        caption: 'two voices, one per ear: my picks on the left, autoplay on the right. of 100 jumps between tagged artists, about 70 and about 66 switch genre. the left plays on alone.',
        src: S_PAIR.slice(),
        then: [
          { angle: 'taps', caption: TAPS1, src: S_BI.slice() },
          {
            angle: 'autoplay',
            caption: '4,876 jumps of mine, 26,938 of autoplay’s (the next song starting on its own, shuffle off). autoplay draws more lines; the number compares rates, not lines.',
            src: ['exhibit/data/twolisteners.json#full_transition_crossing', 'exhibit/rooms/listeners.js#.lst-why'],
          },
        ],
      },
      {
        room: 'clock', angle: 'day',
        share: SHARE.clock,
        caption: 'the whole log folded onto one day: midnight at the top, noon at the bottom.',
        src: ['exhibit/labels.js#HINTS.clock'],
      },
      {
        room: 'make', angle: 'wheel',
        share: SHARE.make,
        caption: '22 tracks i made, placed by musical key. the glow marks the keys that mix cleanly with the one you tap. that is music theory, not a finding.',
        src: ['exhibit/data/tracks.json', 'exhibit/labels.js#make.wheel'],
        then: [{ angle: 'blend', caption: 'put two of them together and hear what the key does.', src: ['exhibit.html#make.say'] }],
      },
    ],
  },
  {
    // R5 §4.6
    id: 'artists',
    name: 'liner notes for artists & designers',
    blurb: 'the views i\'d frame and hang',
    stops: [
      {
        room: 'threshold', angle: 'close', gate: true,
        share: SHARE.threshold,
        caption: '{every_dot}; each character is one cell of dots, heavier where more fall.',
        src: ['exhibit.html#threshold.say.dim'],
      },
      {
        // R5 R2 fragment: the sky caption keeps "means nothing" in every tour
        room: 'universe', angle: 'sky', hold: 12,
        share: SHARE.universe,
        caption: '{named} artists as stars. the colour is the genre family; no colour here is decoration. where one sits means nothing on its own.',
        src: ['exhibit/data/universe_nodes.json', 'derive:named_count', 'exhibit/labels.js#threshold.colours'],
      },
      {
        room: 'wall', angle: 'pour', hold: 10,
        share: SHARE.wall,
        caption: '97,427 plays poured into three jars by who started them: mint my hand, amber shuffle, violet the queue.',
        src: ['exhibit/data/wall.json#total', 'exhibit/labels.js#threshold.colours'],
      },
      {
        // R5 N3 arrivals: the rain (REFEREE_APPLIED P1-C1, REFEREE2 P1-C3)
        room: 'arrivals', angle: 'rain', hold: 10,
        share: SHARE.arrivals,
        caption: 'every artist in my log, falling in the order of their first full play. colour = who started that play.',
        src: ['exhibit/data/arrivals.json'],
      },
      {
        room: 'chain', angle: 'all', hold: 11,
        share: SHARE.chain,
        caption: 'a comet for every hop: mint where my hand crossed, violet where the queue did.',
        src: ['exhibit/data/universe_edges.json'],
      },
      {
        // R5 N5 wheel: the two skylines (the rows/textile view is held: wheel_rows not cleared this round)
        room: 'wheel', angle: 'bundled', hold: 10,
        share: SHARE.wheel,
        caption: 'two skylines out of 5,489 sessions: mint is runs i started by hand, violet is runs i didn’t. each one plays back as a phrase.',
        src: ['exhibit/data/wheel_agg.json#sessions.n'],
      },
      {
        // R5 N4 loop: the tower
        room: 'loop', angle: 'tower', hold: 12,
        share: SHARE.loop,
        caption: 'a pedalboard of my repeats, one ring per run length. twice is a solid ring; fifty or more is 35 glyphs you can count.',
        src: ['exhibit/data/loops.json'],
      },
      {
        room: 'calendar', angle: 'ribbon',
        share: SHARE.calendar,
        caption: 'the same plays again, 81 months wide, each month stacked by who pressed play.',
        src: ['exhibit.html#calendar.say'],
      },
      {
        room: 'make', angle: 'wheel',
        share: SHARE.make,
        caption: '22 tracks, one wheel. put two of them together.',
        src: ['exhibit/data/tracks.json', 'exhibit.html#make.say'],
      },
    ],
  },
];

// ids match exhibit/atlas/ladder.js's own LEVELS exactly (no underscores: 'oneplay', 'sevenyears') —
// ladder.js merges this array over its own D7 defaults by `id`, so an id it doesn't recognise is
// silently dropped rather than added (SKELETON_NOTES: the implementation wins where it differs from
// the spec's prose notation 'one_play'/'seven_years').
export const LADDER = {
  levels: [
    { id: 'oneplay', name: 'ONE PLAY', route: { stop: 'wall', angle: 'sorted', pose: { z: 5 } } }, // zMax, §3 wall row
    { id: 'session', name: 'SESSION', route: { stop: 'wheel', angle: 'bundled' } }, // R5 N5: the rung opens who held the wheel; still no number
    { id: 'day', name: 'DAY', route: { stop: 'universe', angle: 'day' } },
    { id: 'artist', name: 'ARTIST', route: { stop: 'universe', angle: 'star' } },
    { id: 'genre', name: 'GENRE', route: { stop: 'universe', angle: 'threads' } },
    { id: 'year', name: 'YEAR', route: { stop: 'calendar', angle: 'ribbon' } },
    { id: 'sevenyears', name: 'THE WHOLE LOG', route: { stop: 'universe', angle: 'sky' } },
  ],
};
