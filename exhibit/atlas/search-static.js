/* search-static.js — package C2. static lookup tables `/` search (M5) reads. no live data lives here:
   artist/track/day rows come from the shipped JSON files at search-open time (§1.8). this file only supplies
   the aliases a visitor might type instead of a canonical id, and the finding names search may return.

   Privacy rule (BUILD_SPEC_V2 §1.8, §3 graveyard, honesty critic #18): five buried findings that touch a date
   or the body get NO alias here, ever — they are reachable only by typing their exact killit.json name, never a
   shorter or friendlier phrase, and never by a date-like query:
     "a known date: the data did not move"
     "pelt event attribution: it fires at everything"
     "run-down days to narrower listening: a season"
     "music to heart rate: null"
     "body drives music: a clock, not a cause"
*/

// STOPS aliases (§1.8 group STOPS; D9). Each alias resolves through ctx.route({stop, angle?}).
export const STOP_ALIASES = {
  'the log': { stop: 'wall' },
  'who pressed play': { stop: 'game' },
  'the ruler': { stop: 'calendar' },
  'your turn': { stop: 'yours' },
  export: { stop: 'yours' },
  'the sky': { stop: 'universe' },
  threads: { stop: 'universe', angle: 'threads' },
  'genre combos': { stop: 'universe', angle: 'threads' },
  /* R5: the hundred jumps, the pour, the chain, the card */
  'bridge index': { stop: 'listeners', angle: 'hundred' },
  'the hundred': { stop: 'listeners', angle: 'hundred' },
  'hundred jumps': { stop: 'listeners', angle: 'hundred' },
  '100 jumps': { stop: 'listeners', angle: 'hundred' },
  'pour': { stop: 'wall', angle: 'pour' },
  'the jars': { stop: 'wall', angle: 'pour' },
  'pour the wall': { stop: 'wall', angle: 'pour' },
  'chain': { stop: 'chain' },
  'the chain': { stop: 'chain' },
  'make a chain': { stop: 'chain' },
  'path': { stop: 'chain' },
  'riff': { stop: 'chain' },
  'hand links': { stop: 'chain', angle: 'hand' },
  'hand only': { stop: 'chain', angle: 'hand' },
  'share card': { stop: 'yours' },
  'your split': { stop: 'yours' },
  'your 19': { stop: 'yours' },
  /* R5 pass 2: the duel */
  'game': { stop: 'game' },
  'the duel': { stop: 'game' },
  'duel': { stop: 'game' },
  'tap or queue': { stop: 'game' },
  'guess': { stop: 'game' },
  /* R5 pass 2: where i bail */
  'bail': { stop: 'bail' },
  'where i bail': { stop: 'bail' },
  'skip': { stop: 'bail' },
  'skips': { stop: 'bail' },
  'skip forward': { stop: 'bail' },
  'five seconds': { stop: 'bail' },
  'hold to listen': { stop: 'bail' },
  '30 seconds': { stop: 'bail', angle: 'line' },
  '30-second line': { stop: 'bail', angle: 'line' },
  'counted play': { stop: 'bail', angle: 'line' },
  'what counts as a play': { stop: 'bail', angle: 'line' },
  'guess first': { stop: 'bail', angle: 'guess' },
  /* R5 pass 2: first meetings */
  'arrivals': { stop: 'arrivals' },
  'first meetings': { stop: 'arrivals' },
  'first': { stop: 'arrivals' },
  'met': { stop: 'arrivals' },
  'the rain': { stop: 'arrivals', angle: 'rain' },
  'discovery': { stop: 'arrivals' },
  'who played it first': { stop: 'arrivals', angle: 'guess' },
  /* R5 pass 2: on loop */
  'loop': { stop: 'loop' },
  'on loop': { stop: 'loop' },
  'repeat': { stop: 'loop' },
  'on repeat': { stop: 'loop' },
  'repeats': { stop: 'loop' },
  'streak': { stop: 'loop' },
  'streaks': { stop: 'loop' },
  'the tower': { stop: 'loop', angle: 'tower' },
  'ten plays': { stop: 'loop', angle: 'ten' },
  'ten plays or more': { stop: 'loop', angle: 'ten' },
  /* R5 pass 2: who held the wheel */
  'who held the wheel': { stop: 'wheel' },
  'who drove': { stop: 'wheel' },
  'session': { stop: 'wheel' },
  'sessions': { stop: 'wheel' },
  'hand-off': { stop: 'wheel' },
  'hand-offs': { stop: 'wheel' },
  'handoff': { stop: 'wheel' },
  'runs': { stop: 'wheel' },
  'strict ruler': { stop: 'wheel', angle: 'strict' },
  'bundled ruler': { stop: 'wheel', angle: 'bundled' },
  /* R5 pass 2: the fade dial */
  'fade dial': { stop: 'listeners', angle: 'fade' },
  'the fade': { stop: 'listeners', angle: 'fade' },
  'play floor': { stop: 'listeners', angle: 'fade' },
  'post hoc': { stop: 'listeners', angle: 'fade' },
  'how fragile': { stop: 'listeners', angle: 'fade' },
  'the 2x2': { stop: 'listeners', angle: 'fade' },
  'conditions': { stop: 'listeners', angle: 'fade' },
  /* R5 pass 2: the thirteen gates */
  'gates': { stop: 'graveyard', angle: 'gates' },
  'the gates': { stop: 'graveyard', angle: 'gates' },
  'thirteen gates': { stop: 'graveyard', angle: 'gates' },
  'the thirteen gates': { stop: 'graveyard', angle: 'gates' },
  'doors': { stop: 'graveyard', angle: 'gates' },
  'the doors': { stop: 'graveyard', angle: 'gates' },
  'gauntlet': { stop: 'graveyard', angle: 'gates' },
  'tap-only markov': { stop: 'graveyard', angle: 'gates' },
  'the gauntlet': { stop: 'graveyard', angle: 'gates' },
  'kill rules': { stop: 'graveyard', angle: 'gates' },
  'pre-declared': { stop: 'graveyard', angle: 'gates' },
  'predeclared': { stop: 'graveyard', angle: 'gates' },
  'what was promised': { stop: 'graveyard', angle: 'gates' },
  /* R5 pass 2: the ghost */
  'ghost': { stop: 'map', angle: 'ghost' },
  'the ghost': { stop: 'map', angle: 'ghost' },
  'map ghost': { stop: 'map', angle: 'ghost' },
  'why no map': { stop: 'map', angle: 'ghost' },
  'simulation': { stop: 'map', angle: 'ghost' },
  'the simulation': { stop: 'map', angle: 'ghost' },
  'planted null': { stop: 'map', angle: 'ghost' },
  'the map lied': { stop: 'map' },
};

// GENRES / TAGS family aliases (§1.8). Keys are lowercase, case-folded at match time by M5.
// Values are canonical `ctx.FAM` keys (exhibit/shell.js FAM, same 14 keys as universe_days_index.json fam_order).
export const FAMILY_ALIASES = {
  'hip hop': 'hip-hop · r&b',
  hiphop: 'hip-hop · r&b',
  rnb: 'hip-hop · r&b',
  'r&b': 'hip-hop · r&b',
  'r n b': 'hip-hop · r&b',
  lofi: 'ambient/lofi',
  'lo-fi': 'ambient/lofi',
  'lo fi': 'ambient/lofi',
  ambient: 'ambient/lofi',
  desi: 'world/desi',
  world: 'world/desi',
  edm: 'electronic',
  electro: 'electronic',
  metal: 'rock/metal',
  rock: 'rock/metal',
  funk: 'funk/disco',
  disco: 'funk/disco',
  folk: 'folk/country',
  country: 'folk/country',
  soundtracks: 'soundtrack',
  score: 'soundtrack',
  untagged: 'untagged',
  'no tag': 'untagged',
  'no genre': 'untagged',
};

// Family-pair joiners (§1.8: "two family names or aliases joined by ×, x, + , and, /"). M5 tries the whole
// query as a single family/alias first; only on failure does it split on one of these tokens (case-insensitive,
// surrounded by optional whitespace) and resolve each side through FAMILY_ALIASES / ctx.FAM directly. This order
// matters because several canonical family names already contain "/" (ambient/lofi, rock/metal, funk/disco,
// folk/country, world/desi) — splitting on "/" first would break those.
export const PAIR_JOINER_RE = /\s*(?:×|x|\+|and|\/)\s*/i;

// FINDINGS (§1.8 group FINDINGS; killit.json only, 16 buried + 4 cases). Aliases are alternate short phrasings
// a visitor might type; M5 resolves an alias to a killit.json entry by ARRAY INDEX (never by retyping the
// finding's text here — some of that text is punctuated in ways this file shouldn't have to reproduce
// byte-for-byte twice). `buried[i]` indexes `killit.json`'s `buried` array; `cases[i]` indexes its `cases` array.
// The five buried indices touching a date or the body are deliberately absent (no alias list for them at all):
// search still finds them by their exact killit.json text, never by a shorter alias, and a date-like query
// (`2023`, `oct`, `date`, any `YYYY…`) must never surface any finding (M5 enforces that filter).
//   buried[1]  "body drives music: a clock, not a cause"           — no aliases
//   buried[4]  "pelt event attribution: it fires at everything"    — no aliases
//   buried[5]  "a known date: the data did not move"                — no aliases
//   buried[6]  "run-down days to narrower listening: a season"      — no aliases
//   buried[7]  "music to heart rate: null"                          — no aliases
export const FINDING_ALIASES = {
  buried: {
    0: ['predictability', 'in-sample mirage', 'next track prediction'],
    2: ['world to jazz', 'genre priming'],
    3: ['choosing more over time', 'rising deliberate choice'],
    8: ['genre trends', 'genre over time'],
    9: ['skip predictor', 'skip prediction'],
    10: ['cross-modal', 'audio to physiology'],
    11: ['taste-shape', 'churn forecast'],
    12: ['portability demo', 'cross-log portability', 'last.fm demo'],
    13: ['passivity decay', 'depth story'],
    14: ['flat 19%', 'flat tap rate'],
    15: ['four-year reign', 'four year reign'],
  },
  // killit.json `cases[]` (0-indexed): 0 and 1 are killed (v:'k'), 2 and 3 survive (v:'s'). The `survive` angle
  // runs case 3 only (§3 graveyard row); case 2 gets no "survives" wording until stats-referee resolves it
  // against the report's tap-only Markov kill (§14 flag #6, H6) — its alias list below is descriptive only and
  // never implies a verdict.
  cases: {
    0: ['embedding bridge index', 'relearned map'],
    1: ['topological loops', 'taste loop'],
    2: ['intent-blind model'],
    3: ['hip-hop test', 'hip-hop over-tapped'],
  },
};

// FINDING_LABELS.cases (R3 C2-b / M5-a). killit.json `cases[].c` states each claim as a live verdict
// ("hip-hop and r&b is a genre i actually go pick, not noise from…"), which is honest for cases 2-3 but
// wrong for cases 0-1 (both killed) and, for case 3, asserts a per-play finding with an intent claim the
// data can't carry (R2_VERIFY_2_honesty P1-4). search.js:buildFindings must never surface killit's own `c`
// text for a STOPS/FINDINGS row; this is the site-side replacement it reads instead. V4 honesty P1-3: each
// label carries its verdict (cases 0-1 are killed and were listing as live claims) and fits 64 characters so
// nothing is cut mid-claim; the graveyard's own SHORT_A captions stay as they are (the card says the verdict).
export const FINDING_LABELS = {
  cases: [
    'relearned-map bridging: killed by 500 redrawn maps',
    'topological loops: a markov chain makes them too',
    'taps cross more than a pooled habit model predicts',
    'hip-hop/r&b over-tapped by play, beyond bucket noise',
  ],
};

export const SEARCH_STATIC = { STOP_ALIASES, FAMILY_ALIASES, PAIR_JOINER_RE, FINDING_ALIASES, FINDING_LABELS };
export default SEARCH_STATIC;
