/* the universe (BUILD_SPEC_V2 §8, package R4): every play as a dot in one 4D sky you can fly through.
   the 388 artists with at least 50 plays are stars: their plays gather around them (a seeded force layout of which
   artists were played back to back for the 245 linked ones, an outer ring for the other 143, spaced evenly in order of
   plays (build_universe.py places them by node id, which is plays order: Spearman(id, ring angle) = 1), and a seeded
   height slab for both), lying flat so the slow orbit at rest turns it like a record. every other play is dust on a faint
   outer shell. the views of the same field:
     sky      every play, no lines
     links    the rate-matched jumps between stars as glyph trails, one arm at a time (GS K3)
     threads  every play pulled into its genre family; the jumps between families as glyph trails, one arm at a time (GS K5)
     day      (only when universe_days_index.json loads: Tier B) a cursor over the recorded days. the camera goes to the
              day's most played artists, which light up as glyph clusters labelled [ name · n ]; everything else is one
              fixed faint haze (the same dots on every day); the day's back-to-back pairs are pooled grey trails (TIER_B §5)
     star     fly to one star and read its card
   the stars come from universe_artists_all.json when it ships (Tier B, roster 'B') and otherwise from the Tier-A files
   alone (roster 'A': universe_nodes.json + universe_edges.json, no play counts); the room is whole in either state.
   positions carry no meaning as distance or direction (GS K4); twinkle and glints are decoration. every number printed
   here comes from exhibit/data/universe_*.json. the room only exists in atlas mode (the section is removed at ?atlas=0). */

const V = new URL(import.meta.url).search || '';
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const hexc = (v) => '#' + (v >>> 0).toString(16).padStart(6, '0');
const rgba = (v, a) => 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
const ymd = (n) => { const s = String(n); return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8); };
const now = () => performance.now();

/* the angles (§3 universe row; C1 references these ids). K4: the list the shell reads (mod.angles) carries `day` only once
   universe_days_index.json has loaded (Tier B), so the angle bar, the tours and the ladder never offer a day that isn't there */
const DAY_ANGLE = { id: 'day', name: 'one day' };
const ANGLES = [{ id: 'sky', name: 'the sky' }, { id: 'links', name: 'links' }, { id: 'threads', name: 'threads' }, { id: 'star', name: 'a star' }];
const hasDayAngle = () => ANGLES.indexOf(DAY_ANGLE) >= 0;
/* the poses, in units of the home distance's nominal 0.78: every dist below is multiplied by S.fit (fitted()), the factor
   that puts the laid-out stars at HOME_FILL of the stage's short side on this stage (framing()). the sky lies flat, so a
   pitch near 1 looks down on it at a slant and the idle orbit (a yaw) turns it in its own plane */
const HOME = { yaw: 0.42, pitch: 0.98, dist: 0.78, look: 'centre' };
const HOME_T = { yaw: 0, pitch: 0.9, dist: 1.2, look: 'centre' }; /* dist: the fallback; framing() sets S.distT */
/* the approach: a turn and a fall in from 1.2x home, so the very first frame is already the whole sky filling the stage
   (VERIFY_1 P0-1: from 2.35 the first seconds showed a sky about 150 px across with its names piled on it) */
const APPROACH = { yaw: -0.5, pitch: 1.22, dist: 1.2, look: 'centre' }; /* 1.2x: home now fits the whole ring inside the stage (P2-9), so the first frame keeps about the size VERIFY_1 accepted at 1.4x */
const HOME_FILL = 0.75, LONG_FILL = 0.92;
/* the outer ring's fit (framing): an upright stage keeps its projected half-width at most RING_UP of the stage's width with
   its middle at RING_CY of the stage's height; a wide one keeps its projected radius at most RING_WIDE of the short side.
   RING_R0: its radius before a roster is in hand (the Tier-A ring at 0.91 plus its stars' spread) */
const RING_UP = 0.44, RING_WIDE = 0.46, RING_R0 = 0.93, RING_CY = 0.45;
const fitted = (p) => Object.assign({}, p, { dist: p.dist * (S.fit || 1) }, p.look === 'centre' && S.homeTy ? { look: undefined, target: [0, S.homeTy, 0] } : null);
const LINK_ARMS = [{ id: 'tap', name: 'my taps' }, { id: 'served', name: 'the queue' }, { id: 'both', name: 'both' }];
const THREAD_ARMS = [{ id: 'tap', name: 'my taps', k: 0 }, { id: 'shuffle', name: 'shuffle', k: 1 }, { id: 'served', name: 'the queue', k: 2 }];
/* the float dock's placard line: LINE_GAP px under the dock's box (css: top:calc(100% + 7px)), about LINE_H px tall, and
   at least LINE_FOOT px over the window's bottom edge; the chip row starts DOCK_TOP px under the stage where the band allows */
const LINE_GAP = 7, LINE_H = 14, LINE_FOOT = 20, DOCK_TOP = 8;
const LOAD_SAY_MS = 1200, MORPH_MS = 2300, STEP_MS = 700, STEP_TOUR_MS = 1200, DIMFAM = 60, FAINT = 1;
/* the day's unlit plays are haze at a weight below one: a fixed 1 in HAZE_EVERY of them (a hash of the dot, the same dots
   on every day, past and future alike) carries weight FAINT, the rest 0. in expectation every unlit play weighs
   FAINT / HAZE_EVERY, which a Uint8 weight cannot hold; at weight 1 each, a big star's unlit cloud summed into cells
   out-shone the day's few lit plays. the share is per play and per screen area: a phone draws one dot per four plays
   (so it keeps four times as many dots) on a stage about half as wide (the same sky in a quarter of the cells) */
const HAZE_EVERY = 5;
/* the dust (every play of an artist under 50 plays) is a fixed dither: a hash-chosen share of its dots (the same dots on
   every frame and in every view) carry weight and the rest none. a kept dust dot weighs TN.dustW, a fraction of a play chosen so
   a dust cell's tone lands in the renderer's haze band (0.03-0.14 of the frame's exposure), where the steady IGN dither
   draws it as a sprinkle of . and ' in the dust's own family hue: a glyph haze behind the stars, never an even lattice and
   never solid specks. TN.dustKeep is per play and per screen area like the day haze (a phone draws one dot per four plays on
   a stage about half as wide). TN.dustOff: a kept dust dot outside a picked-out family; TN.dustSun: while a lock's sun is
   lit (the rest of the sky steps back to a faint speckle with the stars: SUN_KEEP) */
/* the look's tunables (a test hook reads and sets them: api._dbg.tune). dustW: a kept dust dot's weight (a dust cell lands in
   the haze band); coreK / coreRef: the biggest stars' column density is compressed by (coreRef / size)^coreK, a tone
   mapping so a few giants do not set the exposure for the whole sky (a star's size and total ink still grow with its
   plays); pitchWide / pitchUp: home's pitch on a wide stage and on an upright one */
const TN = { dustKeep: 0.22, dustW: 105, dustOff: 40, dustSun: 3, coreK: 0.45, coreRef: 200, pitchWide: 1.25, pitchUp: 1.3, sigLow: 1.4, skyUp: 0.47, skyWide: 0.49 };
/* R5 R2 framing: home's sky fills >= 85% of a wide stage's height and of an upright one's width (tests/r5_sky.mjs). the sky's
   ring fits skyWide / skyUp (THREADS keeps RING_WIDE), and both pitches look down more steeply, so the turning disc is rounder
   and taller on the glass (was pitchWide 0.95, pitchUp 1.2, ring 0.46 / 0.44) */
/* a star's falloff (W43): its dots run from the centre outwards (a 3D gaussian), so the first SIG0 (3.5%) of a star's block lie
   within about half a sigma of its centre, the first SIG1 (19.9%) within one sigma, the first SIG2 (73.9%) within two.
   they weigh STAR_W of a play by class, so every star is a pinpoint core (@W$) inside a soft body (o*+) and a :'. halo,
   the way a lens draws a star: in the crowded middle of the sky the pinpoints stay apart where the bodies overlap
   (VERIFY_1 P1-1: with the core at one sigma the five most played stars, a cell or two apart, ran into one band) */
const STAR_W = [255, 90, 22, 6]; let SIG0 = 0.035; const SIG1 = 0.1987, SIG2 = 0.7385, DUSTC = 4; /* DUSTC: the dust's class */
/* labels (W43): at home the most played stars only, strictly by plays (node order), LAB_DESK / LAB_PHONE of them; the rest
   come in by zoom band as the camera closes in (LAB_BANDS: [first id, zoom over home]) */
const LAB_DESK = 32, LAB_PHONE = 16, LAB_BANDS = [[1, 1.35], [2, 1.9], [3, 2.8]], LEAD_DESK = 96, LEAD_PHONE = 64;
/* links and threads as glyph trails (K1): a trail's weight runs LINK_W0..LINK_W1 by its rate (under the renderer's 0.6
   "strong" mark, so a trail reads as a run of . ' : and never as edge glyphs), one travelling bright cell per PULSE_MS */
const LINK_W0 = 0.22, LINK_W1 = 0.58, PULSE_MS = 2500, SEGMAX = 8192;
/* the tour dolly (K6): while a playing tour holds the sky, the camera glides from DOLLY0 to DOLLY1 of home over the hold */
const DOLLY0 = 1.15, DOLLY1 = 0.9, DOLLY_IN = 0.9, FINALE_YAW = 2.0944; /* the closing stop's slow third of a turn (120 degrees) */
/* a tour's closing stop counts as pulled back when it holds the sky past FINALE_OUT of home (grand's closing look is 1.35
   against a home that since P2-9 frames the whole ring, about 1.04 on a desk) */
const FINALE_OUT = 1.15;
/* the sky's bloom (drawSkyBloom): a soft light in its family's hue under each of the n most played stars, r sigmas wide
   (never more than capR of the stage's short side), at most a strong, screen-blended; hot: the alpha of each one's small,
   whiter centre. the brightest cells get their white from the glyph pass's bleach, not from here, so the core stays
   stars (VERIFY_1 P1-1: 160 sprites at 0.9-1 fogged it pink-white). it fades out as the camera closes in, by
   fadeA - fadeK x (zoom over home's): full at home, gone by 2.7x home (VERIFY_1 P0-3: an uncapped radius whited out the
   stage after eight wheel-ins) */
const SKYB = { n: 60, r: 10, a: 0.45, rLow: 13, aLow: 0.5, op: 'screen', hot: 0.2, res: 1 / 3, capR: 0.12, fadeA: 1.6, fadeK: 0.6 };
/* depth cue: a dot's weight is w x (DEPTH_MIN + (1 - DEPTH_MIN) x near), near running from 1 at the nearest to 0 at the
   farthest anchor of the view (the linked stars' centres in the sky, the fourteen clusters in threads), so the drift reads
   as 3D; anything beyond the anchors clamps. in the glyph pass a near object spreads over more cells and would otherwise
   look dimmer than a far one */
let DEPTH_MIN = 0.55;
/* the day's lit clusters are sized by that day's plays: each lit artist's dots spread in a ball whose on-screen sigma at
   the day's framing is DAY_C cells x sqrt(its lit dots), so its area grows with the plays (The Weeknd · 24 covers eight
   times the cells of Doja Cat · 3) and its core holds about a dot a cell, each a full play's glyph */
const DAY_C = 0.4;
/* the lock-on sun (VERIFY_r3_beauty P1-8). once the flight to a locked star lands (sky, links, a star), the star blooms
   into a glyph sun on the field's own cell grid: a round disc that spans SUN_D0 to SUN_D1 of the stage's short side at the
   arrival framing (R2_VERIFY_2 beauty P1-7: about 0.35, the lit body of the frame, as gcdatlas lands on its Moon), by the
   square root of its plays (the fewest a star has to the most): a textured glyph sphere in the field's own ramp and light
   (sunSprite: near-white at its centre through its falloff classes to its family hue at the limb), a ragged limb, a
   shimmering atmosphere (drawAtmo) and a soft dark falloff round it (moatSprite). it is fixed in the sky, so it grows and
   shrinks with the camera like the star under it (never past SUN_CAP rows or 1.4x its arrival size, whichever is more).
   its NBK partners played right before or after it most often (the worker's partners(): every day's back-to-back changes
   summed, pooled) run out of it as glyph threads tagged [ name · n ]; every other play steps back to a faint speckle in its
   faint hue (weights() and paintState(), as a picked-out family and the day's unlit plays do, once per lock and not per
   frame; the partners keep more of their dots, at the threads' ends) and every other label dims. the size is the star's
   plays and the tags are counts from the file; the texture, the atmosphere and its shimmer, the pulse along a thread, the
   moat and the dark cell backing are decoration. it lets go when the lock does, and the sky comes back in full.
   ATMO: the atmosphere's reach in disc radii; RUN_MAX: no row of the body repeats one glyph more often than this */
/* while a sun is lit (R2_VERIFY_2 beauty P1-7) the rest of the sky steps back to a sparse faint haze: each other star keeps
   a fixed hash-chosen scatter of its dots, SUN_KEEP of 256 but never more than about SUN_DOTS of them (the partners
   SUN_NB_KEEP), each at a weight of one, and the dust sits at TN.dustSun. no cell then comes near one full play, so the
   frame's exposure rests on its floor and the sky's tone is what these weights say: a faint speckle, the stars' shapes
   still in it. (a uniform dimming alone is undone by the renderer's exposure, which re-normalises to the frame's brightest
   cells: the forty equally bright blocks round the old sun.) the locked star's own dots are thinned with them: its body
   is the sun drawn over them */
const SUN_D0 = 0.32, SUN_D1 = 0.38, SUN_CAP = 14, SUN_KEEP = 32, SUN_NB_KEEP = 96, SUN_DOTS = 12, SUN_IN = 700, SUN_OUT = 280, THREAD_CELLS = 170, CELLMAX = 1200;
const ATMO = 1.55, RUN_MAX = 5, LOCK_LAB_R = 0.9;
const GLYPHS = ".:+*@-\\|/'", THREAD_COL = 'rgb(216,210,234)';
const RAMP0 = ".':;+*o%#&8@$W"; /* the field's continuous ramp (glyph-atlas.js RAMP_CHARS); GF.info().ramp gives it in ink order */
const GFONT = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace'; /* the field's own glyph font (glyph-atlas.js) */

/* every sentence this room prints, verbatim from its source (C2 pins the same strings in COPY.universe; C2's win) */
const COPY0 = {
  loading: 'loading…',
  passing: 'passing {name}', /* a long flight goes past a real star (§13: pass-by toast) */
  chip: '{named} artists as stars ({play_share}% of plays) · {dust} more as dust', /* §8.3 chip; {dust} counted from the file that loaded */
  k3: 'line counts and widths are rates at equal sample size; autoplay has about 5x more transitions between these artists in the raw log.', /* §8.3, GS K3 (19,538 / 3,643 = 5.4) */
  both: 'both arms in one grey. pick one to see who started each line.', /* §8.3; LINK_ARMS has two arms (my taps, the queue) and both (VERIFY_1 honesty P2) */
  fog: 'untagged jumps shown as fog. more of autoplay’s than of my taps’ are untagged (about 41% vs 34%), so fog density is a tagging gap, not a behaviour.', /* US §7 / GS K5 */
  k5: '{a} → {b}, {arm}: {n} transitions ({pct}% of that arm’s transitions in this window)', /* US §7 / GS K5 template */
  k5window: 'window: every month from {from} to {to}', /* the weft's own span (universe_bridges.json months with transitions) */
  ring: 'the ring is a drawing order of the fourteen families, not a similarity.', /* help/§8.3: "a drawing order, not a similarity" */
  dayHead: '{d}: {n} plays, {na} artists.', /* TIER_B_DATA_CARD §5 */
  dayTop: 'most played this day: {list}', /* TIER_B_DATA_CARD §5 */
  dayLit: 'the {k} most played artists this day are lit: {s} of its {n} plays.', /* §8.3 (new, same k-of-n form) */
  dayTa: '{T} artist changes this day (skip-button starts not counted): {ta0} i tapped, {ta1} shuffled, {ta2} the queue served.', /* TIER_B §5 */
  dayLogger: 'how the app logged starts wasn’t constant across these years, so read these counts on their own, not against another day’s.', /* GATE_tierb W-B8 */
  dayLines: 'lines join artists played back to back this day. line length means nothing.', /* TIER_B §5.4 verbatim */
  dayPair: '{A} → {B}: played back to back {n} times this day.', /* GATE_tierb K-B2 */
  daySub: 'showing 1 in {k} of this day’s lines', /* §8.3 cap readout */
  noRecord: 'no plays in the export for this date.', /* TIER_B §5.1 verbatim */
  card: '{plays} plays. first play in this export: {first}. last: {last}.', /* GATE_tierb K-B4 */
  cardPlays: '{plays} plays.', /* the same line when the months are withheld (GATE_tierb_privacy_B: no month when first/last is null) */
  cardArms: '{tap} i tapped (strict), {shuffle} shuffled, {served} the queue served, {other} other starts.', /* §8.3 */
  cardLogger: 'how the app logged starts wasn’t constant across these years, so read these counts on their own, not against another artist’s.', /* W-B8 */
  months: 'months with plays: {m}', /* universe_nodes.json months_active */
  nbQueue: 'the queue most often played {x} right before or after it.', /* US §7 */
  nbTap: 'i most often tapped between it and {x}.', /* US §7, only when tap_n >= 10 */
  nbThreads: 'played right before or after it most often in the log: {list} (my taps, shuffle and the queue together, skip-button starts not counted; a tie goes to the artist with more plays). the threads join them; thread length means nothing.', /* the lock-on threads (VERIFY_r3_beauty P1-8): universe_days.json tr summed over every day, pooled over the arms and both orders like the day lines (GATE_tierb K-B3); "length means nothing" as TIER_B §5.4 */
  comet: 'an artist heard in three months or fewer, most of it in one.', /* GS required fix */
  pos0: 'positions come from a seeded force layout of which artists were played back to back. distance and direction mean nothing on their own.', /* GS K4 */
  pos2: 'this artist isn’t joined to the main web by enough back-to-back plays to be laid out, so it sits on the outer ring, spaced evenly in order of plays; where it sits on the ring says nothing else about it.', /* GATE_tierb W-B6; the ring runs in plays order (build_universe.py L428/L460: by node id, Spearman(id, angle) = 1 over all 143), so "means nothing" was false (ROUND2 R4 item 2) */
  pos1: 'this dot’s position is a placeholder so search has somewhere to fly. it isn’t computed from listening and means nothing.', /* GATE_tierb W-B6 */
  track: '{title}, {artist}: {plays} plays, first play in this export {first}.', /* GATE_tierb K-B4 */
  trackPlays: '{title}, {artist}: {plays} plays.',
  callout: 'counted by play, ambient/lo-fi is under-tapped: 0.636× strict (0.50× bundled [0.44, 0.55]). hip-hop/r&b is over-tapped: 1.23× strict (1.22× bundled [1.12, 1.32]). the report marks the hip-hop side caveated on how plays are counted.', /* §8.3 genre callout. B(g) = P(tap|g)/P(tap) is per play (GROUND_TRUTH; ledger 130, 184). no per-track clause (R2_VERIFY_2 honesty P0-1): B_track's null is not 1 but 0.581 [0.560, 0.603] bundled (bg_track_cluster_ci.py L128), and against it hip-hop per track is 1.60x, so the old '0.93 counted by track ... not the genre' compared to the wrong reference; the direction does not flip */
  ladSky: 'THE WHOLE LOG · every play', /* R2_VERIFY_2 honesty P2-6: all but 0.26% of plays fall after february 2022, so a span in years oversold it */ ladDay: 'DAY · {d}', ladStar: 'ARTIST · {name}', ladGenre: 'GENRE · {f}', ladGenreAll: 'GENRE · every family',
  brightest: 'the brightest stars', threadList: 'the threads, as a list', famThreads: 'threads ›', readMore: 'the full readout',
  viewsLabel: 'views of the sky', armLabelL: 'whose jumps the lines show', armLabelT: 'whose jumps the threads show',
  nameLine: '{name} · {family}',
  caveat: 'the export holds very little before february 2022 (253 plays over 44 days). on any date, a quiet or empty day says more about what the export kept than about listening.', /* universe_days_index.json caveat, pinned */
  timeBasis: 'dates use one fixed UTC-7 clock for the whole log (no per-play timezone or daylight saving was kept), not a real local time', /* REQUESTS_privacy_copy #1: the day records carry no hours */
  chipSearch: ', all searchable', /* appended to the chip only when the full roster (Tier B) loaded */
  ringSay: 'the rest ring the edge, spaced evenly in order of plays; where one sits on the ring says nothing else about it.', /* the wall's ring clause (ROUND2 R4 item 2), replacing "the rest ring the edge in no order." */
  sayRoster: 'search finds every artist by name.', /* the wall's sentence, appended only when the full roster (Tier B) loaded */
  sayDays: 'day steps through the recorded days.', /* ... and only when the day records (Tier B) exist */
  tapShare: 'of the back-to-back jumps it was part of that i tapped or the queue served, about {p} in 100 were my taps (shuffle not counted; an estimate, smoothed toward my overall rate).', /* universe_nodes.json tap_share (DATA_CARD: strict tap vs served involvement, beta-binomial shrunk): the Tier-A card */
  prevDay: '‹', nextDay: '›', play: '▸ play', pause: '❚❚ pause', dateLabel: 'a day in the log, as yyyy-mm-dd', rangeLabel: 'step through the recorded days',
legendLabel: 'genre families: tap one to pick it out',
  rampUp: 'the first stretch is the export warming up, not me.', /* R5_PLAN R2: about 880 of the 2,439 days are near-black export ramp-up (universe_days_index.json); the day replay sounds only once this line has shown */
};
const CSS = `
html.atlas section[data-room="universe"] .uv-dock{position:absolute;z-index:1;display:flex;flex-direction:column;gap:6px;padding:0;background:none;border:0;border-radius:0;font:500 11px/1.4 var(--mono);color:var(--mute);box-sizing:border-box;pointer-events:auto}
/* the wide screen's dock (R2_VERIFY_2 beauty P2-8): one borderless row of chips at the stage's foot, each chip its own
   dark glass (gcdatlas's --panel), and the view's one placard line under it as its caption, out of the dock's own box;
   the rest of the placard reads in "more" */
html.atlas section[data-room="universe"] .uv-dock.float .uv-b{background-color:rgba(10,1,24,.74)}
html.atlas section[data-room="universe"] .uv-dock.float .uv-b[aria-pressed="true"],html.atlas section[data-room="universe"] .uv-dock.float .uv-b[aria-checked="true"]{background:linear-gradient(rgba(134,203,254,.12),rgba(134,203,254,.12)),rgba(10,1,24,.74)}
html.atlas section[data-room="universe"] .uv-dock.float .uv-k,html.atlas section[data-room="universe"] .uv-dock.float .uv-tb{text-shadow:0 0 3px #0a0118,0 0 6px #0a0118,0 0 10px #0a0118}
html.atlas section[data-room="universe"] .uv-dock.float.tight .uv-top{column-gap:10px}
html.atlas section[data-room="universe"] .uv-dock.float.tight .uv-k{display:none}
html.atlas section[data-room="universe"] .uv-dock.float.tight .uv-b{padding-left:7px;padding-right:7px;letter-spacing:.1em}
html.atlas section[data-room="universe"] .uv-line{margin:0;font:400 10px/1.45 var(--mono);color:rgba(190,182,214,.92);text-shadow:0 0 3px #0a0118,0 0 6px #0a0118,0 0 10px #0a0118}
html.atlas section[data-room="universe"] .uv-line[hidden]{display:none}
html.atlas section[data-room="universe"] .uv-dock.float .uv-line{position:absolute;left:0;top:calc(100% + 7px);width:max-content;max-width:var(--uv-linew,760px);font-size:9.5px;pointer-events:none}
html.atlas section[data-room="universe"] .uv-dock.inwall .uv-line{font-size:10.5px;color:rgba(164,155,189,.92);text-shadow:none}
/* the rest of the view's placard (fog, the grey of both arms) waits in the wall column for "more", like the wall's dim lines */
html.atlas section[data-room="universe"] .wall .uv-plac{margin:10px 0 0;padding:1px 0 1px 10px;border-left:1px solid rgba(134,203,254,.2);max-width:34rem;font:400 10.5px/1.5 var(--mono)}
html.atlas.ai-less section[data-room="universe"].is-active .wall .uv-plac{display:none}
html.atlas section[data-room="universe"] .uv-dock.inwall{position:static;transform:none;width:auto;margin:10px 0 12px;padding:8px 0 4px;background:none;border:0;border-top:1px solid rgba(134,203,254,.14);border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none}
html.atlas section[data-room="universe"] .uv-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}
html.atlas #uv-bloom{position:fixed;inset:0;width:100vw;height:100vh;z-index:0;mix-blend-mode:screen;pointer-events:none}
@media (forced-colors:active){html.atlas #uv-bloom{display:none}}
@media print{html.atlas #uv-bloom{display:none!important}}
html.atlas section[data-room="universe"] .uv-top{gap:6px 14px}
html.atlas section[data-room="universe"] .uv-angles{gap:4px}
html.atlas section[data-room="universe"] .uv-dock:not(.inwall) .uv-arms,html.atlas section[data-room="universe"] .uv-dock:not(.inwall) .uv-dayctl{margin-left:auto}
html.atlas section[data-room="universe"] .uv-row[hidden],html.atlas section[data-room="universe"] .uv-day[hidden],html.atlas section[data-room="universe"] .uv-plac[hidden]{display:none}
html.atlas section[data-room="universe"] .uv-k{font:600 9.5px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:rgba(164,155,189,.72);margin-right:2px}
html.atlas section[data-room="universe"] .uv-b{font:600 10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);background:rgba(10,1,24,.35);border:1px solid rgba(134,203,254,.22);border-radius:2px;padding:7px 9px;min-height:30px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;-webkit-tap-highlight-color:transparent;transition:color .2s,border-color .2s,background .2s}
html.atlas section[data-room="universe"] .uv-b:hover{color:var(--ink);border-color:rgba(134,203,254,.5)}
html.atlas section[data-room="universe"] .uv-b[aria-pressed="true"],html.atlas section[data-room="universe"] .uv-b[aria-checked="true"]{color:var(--ice);border-color:rgba(134,203,254,.7);background:rgba(134,203,254,.1)}
html.atlas section[data-room="universe"] .uv-b:focus-visible,html.atlas section[data-room="universe"] .uv-date:focus-visible,html.atlas section[data-room="universe"] .uv-range:focus-visible,html.atlas section[data-room="universe"] .uv-lb:focus-visible,html.atlas section[data-room="universe"] .uv-more summary:focus-visible{outline:2px solid var(--ice);outline-offset:3px}
html.atlas section[data-room="universe"] .uv-sw{display:block;width:14px;height:3px;border-radius:2px;flex:none}
html.atlas section[data-room="universe"] .uv-plac{margin:0;max-width:62ch;font:400 10.5px/1.45 var(--mono);color:rgba(164,155,189,.86)}
html.atlas section[data-room="universe"] .uv-plac b{font-weight:500;color:var(--mute)}
html.atlas section[data-room="universe"] .uv-day{display:flex;flex-direction:column;gap:6px}
html.atlas section[data-room="universe"] .uv-date{width:calc(10ch + 20px);font:500 12px/1 var(--mono);letter-spacing:.04em;color:var(--ice);background:rgba(10,1,24,.5);border:1px solid rgba(134,203,254,.3);border-radius:2px;padding:7px 6px;min-height:30px;box-sizing:border-box;text-align:center;font-variant-numeric:tabular-nums}
html.atlas section[data-room="universe"] .uv-date.bad{border-color:rgba(164,155,189,.7);color:var(--mute)}
html.atlas section[data-room="universe"] .uv-dock:not(.inwall) .uv-dayn{display:none}
html.atlas section[data-room="universe"] .uv-dayn{font:500 11px/1 var(--mono);color:var(--ice);font-variant-numeric:tabular-nums;margin-left:4px}
html.atlas section[data-room="universe"] .uv-range{-webkit-appearance:none;appearance:none;width:100%;height:22px;margin:0;background:none;cursor:pointer;touch-action:pan-y}
html.atlas section[data-room="universe"] .uv-range::-webkit-slider-runnable-track{height:2px;background:linear-gradient(90deg,rgba(134,203,254,.5),rgba(134,203,254,.18))}
html.atlas section[data-room="universe"] .uv-range::-moz-range-track{height:2px;background:linear-gradient(90deg,rgba(134,203,254,.5),rgba(134,203,254,.18))}
html.atlas section[data-room="universe"] .uv-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-6px;border-radius:50%;background:#0a0118;border:2px solid var(--ice);box-shadow:0 0 10px rgba(134,203,254,.5)}
html.atlas section[data-room="universe"] .uv-range::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#0a0118;border:2px solid var(--ice);box-shadow:0 0 10px rgba(134,203,254,.5)}
html.atlas section[data-room="universe"] .uv-norec{margin:0;font:500 11px/1.4 var(--mono);color:var(--ink)}
html.atlas section[data-room="universe"] .uv-norec[hidden]{display:none}
html.atlas section[data-room="universe"] .uv-tb{margin:0;font:400 9.5px/1.4 var(--mono);color:rgba(164,155,189,.62)}
html.atlas section[data-room="universe"] .uv-chipline{font:500 11px/1.45 var(--mono);color:var(--ice);opacity:.85;margin:10px 0 0;max-width:34rem}
html.atlas section[data-room="universe"] .uv-legend{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0 0;max-width:34rem}
html.atlas section[data-room="universe"] .uv-legend .uv-b{font-size:9px;letter-spacing:.08em;padding:5px 7px;min-height:26px;gap:6px}
html.atlas section[data-room="universe"] .uv-legend .uv-b i{display:block;width:8px;height:8px;border-radius:1px;flex:none}
html.atlas section[data-room="universe"] .uv-famact{margin:7px 0 0}
html.atlas section[data-room="universe"] .uv-famact[hidden]{display:none}
html.atlas section[data-room="universe"] .uv-more{margin:8px 0 0}
html.atlas section[data-room="universe"] .uv-more[hidden]{display:none}
html.atlas section[data-room="universe"] .uv-more summary{font:600 10.5px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute);cursor:pointer;padding:10px 0 6px;width:max-content}
html.atlas section[data-room="universe"] .uv-lb{max-height:13.5em;overflow-y:auto;overscroll-behavior:contain;margin:4px 0 0;padding:2px 0;border-left:1px solid rgba(134,203,254,.2);scrollbar-width:thin}
html.atlas section[data-room="universe"] .uv-lb div{font:500 11px/1.3 var(--mono);color:var(--mute);padding:5px 10px;cursor:pointer;display:flex;gap:10px;justify-content:space-between}
html.atlas section[data-room="universe"] .uv-lb div span{color:rgba(164,155,189,.6);font-variant-numeric:tabular-nums}
html.atlas section[data-room="universe"] .uv-lb div:hover,html.atlas section[data-room="universe"] .uv-lb div[aria-selected="true"]{color:var(--ice);background:rgba(134,203,254,.08)}
html.atlas section[data-room="universe"] .uv-readout{margin:0 0 8px}
html.atlas section[data-room="universe"] .uv-readout summary{padding:4px 0 6px}
html.atlas section[data-room="universe"] .uv-rd{margin:2px 0 4px;padding:2px 0 2px 10px;border-left:1px solid rgba(134,203,254,.2);max-width:62ch}
html.atlas section[data-room="universe"] .uv-rd p{margin:0 0 5px;font:400 10.5px/1.45 var(--mono);color:rgba(164,155,189,.9)}
html.atlas section[data-room="universe"] .uv-sel{display:none;margin:6px 0 0;font:500 11px/1.4 var(--mono);color:var(--ice)}
html.atlas section[data-room="universe"] .uv-sel:empty{display:none}
html.atlas section[data-room="universe"] .uv-dock.inbar{gap:5px;padding:0;background:none;border:0;border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-top{flex-wrap:nowrap;gap:6px;overflow-x:auto;scrollbar-width:none}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-top::-webkit-scrollbar{display:none}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-angles,html.atlas section[data-room="universe"] .uv-dock.inbar .uv-arms,html.atlas section[data-room="universe"] .uv-dock.inbar .uv-arms>.uv-row,html.atlas section[data-room="universe"] .uv-dock.inbar .uv-dayctl{flex-wrap:nowrap;gap:3px;flex:none}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-b{min-height:34px;padding:0 6px;font-size:9.5px;letter-spacing:.1em;gap:5px;background:rgba(10,1,24,.8)}
@media (pointer:coarse){html.atlas section[data-room="universe"] .uv-b{min-height:44px}html.atlas section[data-room="universe"] .uv-dock.inbar .uv-b{min-height:44px;min-width:44px}html.atlas section[data-room="universe"] .uv-legend .uv-b{min-height:44px}} /* touch targets (R2_REQUESTS_R3 #2) */
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-angles .uv-b{flex:none;justify-content:center;padding:0 6px}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-arms .uv-k{display:none}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-sw{width:8px;height:8px;border-radius:50%}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-arms .uv-b[aria-checked="false"]{min-width:32px;justify-content:center;padding:0 8px}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-ap,html.atlas section[data-room="universe"] .uv-dock.inbar .uv-arms .uv-b[aria-checked="false"] .uv-an,html.atlas section[data-room="universe"] .uv-dock.inbar .uv-play .uv-pw{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;padding:0}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-dayctl .uv-b{min-width:36px;justify-content:center;padding:0 6px;font-size:14px;letter-spacing:0}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-dayrow{flex-wrap:nowrap;gap:8px}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-date{min-height:32px;flex:none;background:rgba(10,1,24,.8)}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-range{flex:1 1 auto;width:auto;min-width:60px}
html.atlas section[data-room="universe"] .uv-dock.inbar .uv-dayn{display:inline;white-space:nowrap;margin:0;text-shadow:0 0 3px #0a0118,0 0 6px #0a0118}
html.atlas section[data-room="universe"] .uv-note{display:flex;flex-direction:column;gap:3px}
html.atlas section[data-room="universe"] .uv-note p{margin:0;max-width:none;font:400 9.5px/1.35 var(--mono);color:rgba(190,182,214,.95);text-shadow:0 0 3px #0a0118,0 0 6px #0a0118,0 0 10px #0a0118}
html.atlas section[data-room="universe"] .uv-note .uv-sel{display:block;font:500 11px/1.35 var(--mono);color:var(--ice)}
html.atlas section[data-room="universe"] .uv-note .uv-sel:empty{display:none}
html.atlas section[data-room="universe"] .uv-note .uv-norec{font:500 11px/1.35 var(--mono);color:var(--ink)}
html.atlas section[data-room="universe"] .uv-note [hidden]{display:none}
/* the coverage caveat (the export before february 2022) is about dates: it shows on the day view only (W44), and there it
   stays in view even in the compact card (the shell's "less" hides .say.dim; TIER_B §5.2, owner critic #10) */
html.atlas section[data-room="universe"]:not([data-uv-angle="day"]):not(.uv-dated) #universe-caveat{display:none!important}
html.atlas.ai-less section[data-room="universe"][data-uv-angle="day"].is-active .wall #universe-caveat,html.atlas.ai-less section[data-room="universe"].uv-dated.is-active .wall #universe-caveat{display:block}
/* V4 honesty P2-5: a card that shows a first or last month (Tier B artist or track) keeps the caveat in view too (TIER_B_DATA_CARD §5) */
/* idle hands the screen to the sky (ROUND2_PLAN §0.4): the room's own controls fade with the rest of the chrome */
html.atlas section[data-room="universe"] .uv-dock{transition:opacity .35s ease-out}
html.atlas.atlas-idle section[data-room="universe"].is-active .uv-dock:not(.inwall){opacity:0;pointer-events:none;transition:opacity 1s ease-in}
/* the narrowest phones: the arms take a second row rather than run off the bar */
@media (max-width:340px){html.atlas section[data-room="universe"] .uv-dock.inbar .uv-top{flex-wrap:wrap;overflow:visible;row-gap:4px}html.atlas section[data-room="universe"] .uv-dock.inbar .uv-arms{margin-left:0}}
@media (max-width:370px){html.atlas section[data-room="universe"] .uv-dock.inbar .uv-b{letter-spacing:.04em;padding:0 5px}html.atlas section[data-room="universe"] .uv-dock.inbar .uv-angles .uv-b{padding:0 5px}}
@media (max-aspect-ratio:115/100){
  html.atlas section[data-room="universe"] .uv-sel{display:block}
  html.atlas section[data-room="universe"] .uv-dock .uv-b{min-height:40px}
  html.atlas section[data-room="universe"] .uv-dock .uv-angles .uv-b{flex:1 1 0;justify-content:center;padding:8px 4px}
  html.atlas section[data-room="universe"] .uv-date{min-height:40px}
  html.atlas section[data-room="universe"] .uv-dock.inwall{gap:5px;margin:6px 0 8px}
  html.atlas section[data-room="universe"] .uv-dock.inwall .uv-plac{font-size:10px;line-height:1.4}
  html.atlas section[data-room="universe"] .uv-dock.inwall .uv-tb{font-size:9px}
  /* the card keeps the sky in view: it scrolls in itself past this height instead of pushing the stage away */
  html.atlas section[data-room="universe"].is-active .wall{max-height:min(40vh,380px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;-webkit-mask-image:linear-gradient(180deg,#000 calc(100% - 18px),transparent);mask-image:linear-gradient(180deg,#000 calc(100% - 18px),transparent)}
  /* on the day view the coverage caveat stays visible on phones even while the card is compact (TIER_B §5.2, owner critic #10) */
  html.atlas.ai-less section[data-room="universe"][data-uv-angle="day"].is-active .wall #universe-caveat{display:block;font-size:11px;line-height:1.4;margin:4px 0 0}
  html.atlas.ai-less section[data-room="universe"].is-active .wall .say:not(.dim){display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  /* the headline stop keeps the most sky: the compact card is the kicker and the coverage caveat (the shell's kicker-only
     state, chrome.css ai-kick, for this stop always). the title stays for screen readers and "more" brings it back */
  html.atlas.ai-less section[data-room="universe"].is-active .wall h2{position:absolute!important;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}
  html.atlas.ai-less section[data-room="universe"].is-active .uv-legend,html.atlas.ai-less section[data-room="universe"].is-active .uv-more,html.atlas.ai-less section[data-room="universe"].is-active .uv-chipline,html.atlas.ai-less section[data-room="universe"].is-active .uv-famact{display:none}
}
@media (max-height:480px) and (min-aspect-ratio:115/100){html.atlas section[data-room="universe"] .uv-sel{display:block}}
@media (max-aspect-ratio:115/100) and (max-height:700px){html.atlas section[data-room="universe"].is-active .wall{max-height:34vh}html.atlas section[data-room="universe"] .uv-dock.inwall .uv-b{min-height:36px}html.atlas section[data-room="universe"] .uv-date{min-height:36px}}
/* a soft scrim between the sky and the reading column: flown in close, stars run under the text, and the text must win.
   css, under the section's own content and over the canvases (phones already have the page's bottom gradient) */
@media (min-aspect-ratio:115/100){html.atlas section[data-room="universe"].is-active::after{content:"";position:fixed;left:0;top:0;bottom:0;width:var(--uv-scrim,40vw);background:linear-gradient(90deg,rgba(10,1,24,.86),rgba(10,1,24,.74) 76%,rgba(10,1,24,0));pointer-events:none;z-index:-1}}
/* landscape: the wall column scrolls in its own space when the info panel above it is tall (a long day readout), so
   nothing in it is ever out of reach (the page itself never scrolls in the atlas) */
@media (min-aspect-ratio:115/100) and (min-height:481px){html.atlas section[data-room="universe"] .wall{max-height:calc(100vh - var(--atlas-infoh,120px) - 26px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(134,203,254,.25) transparent;padding-right:8px;box-sizing:border-box}}
@supports (height:100dvh){@media (min-aspect-ratio:115/100) and (min-height:481px){html.atlas section[data-room="universe"] .wall{max-height:calc(100dvh - var(--atlas-infoh,120px) - 26px)}}}
/* the lock-on sun (drawSun): while it is lit every other star label dims to .35 (a hover or focus brings one back), its
   partners' tags (kind 'tag') stay bright in brackets, and the labels' corner reticle gives way to the star's own body */
html.atlas.uv-sun #atlas-labels .lab.obj.on:not(.lock):not(:hover):not(:focus-visible){opacity:.35}
html.atlas.uv-sun #atlas-labels .lab-ret{visibility:hidden!important}
html.atlas #atlas-labels .lab.tag{color:var(--ink)}
html.atlas #atlas-labels .lab.tag::before{content:"[ ";color:rgba(216,210,234,.5)}
html.atlas #atlas-labels .lab.tag::after{content:" ]";color:rgba(216,210,234,.5)}
html.atlas #atlas-labels .lab.tag:hover,html.atlas #atlas-labels .lab.tag:focus-visible{color:var(--ice)}
/* windows high contrast. the wall card (exhibit.html) and the dock opt out of forced colours (forced-color-adjust:none) to
   paint one solid Canvas placard, and that opt-out inherits: any colour this room authors inside them survives onto Canvas
   (ice or lavender on white). so the room's own ui is repainted by its namespace (every uv-* element and everything in it),
   in whatever view or dock mode shows it, not from a list of the pieces that were on screen when it was written (the chip
   line, the list summaries and rows, the readout and the phone bar's chips all fell through that list) */
@media (forced-colors:active){
  html.atlas section[data-room="universe"] :is([class^="uv-"],[class*=" uv-"]),html.atlas section[data-room="universe"] :is([class^="uv-"],[class*=" uv-"]) *{color:CanvasText!important;text-shadow:none!important}
  html.atlas section[data-room="universe"] :is(.uv-dock,.uv-b,.uv-date,.uv-lb,.uv-note,.uv-line){forced-color-adjust:none;background:Canvas!important}
  html.atlas section[data-room="universe"] :is(.uv-b,.uv-date,.uv-lb){border:1px solid CanvasText!important}
  html.atlas section[data-room="universe"] :is(.uv-b[aria-pressed="true"],.uv-b[aria-checked="true"],.uv-lb [aria-selected="true"]){background:Highlight!important;color:HighlightText!important}
  html.atlas section[data-room="universe"] :is(.uv-b[aria-pressed="true"],.uv-b[aria-checked="true"],.uv-lb [aria-selected="true"]) *{color:HighlightText!important}
  html.atlas section[data-room="universe"] :is(.uv-b,.uv-date,.uv-range,.uv-lb,.uv-more summary):focus-visible{outline:2px solid Highlight!important}
  html.atlas section[data-room="universe"] .uv-range::-webkit-slider-runnable-track{background:CanvasText}
  html.atlas section[data-room="universe"] .uv-range::-moz-range-track{background:CanvasText}
  html.atlas section[data-room="universe"] .uv-range::-webkit-slider-thumb{background:Canvas;border-color:CanvasText;box-shadow:none}
  html.atlas section[data-room="universe"] .uv-range::-moz-range-thumb{background:Canvas;border-color:CanvasText;box-shadow:none}
}
@media (prefers-reduced-motion:reduce){html.atlas section[data-room="universe"] .uv-b,html.atlas section[data-room="universe"] .uv-dock{transition:none}}
@media print{html.atlas section[data-room="universe"] .uv-dock,html.atlas section[data-room="universe"] .uv-legend,html.atlas section[data-room="universe"] .uv-more{display:none!important}}
`;

/* ------------------------------------------------------------------ state */
const S = {
  ctx: null, root: null, sec: null, wall: null, mounted: false, active: false, failed: false,
  A: null, R: null, D: null, B: null, T: null, worker: null, wseq: 0, wcb: new Map(), wfail: false, load: {}, readyP: null,
  angle: 'sky', armL: 'tap', armT: 'tap', famHi: -1, sel: null, hover: -1, hoverLine: null, chord: null, chordHover: null, dayLine: null,
  dayK: -1, playing: false, lastStep: 0, morph: null, rest: 'sky', culled: null, projSig: '', projDirty: true,
  stage: null, dockIn: false, lastT: 0, entered: 0, errs: 0, frameMs: [], pending: [], timeFns: [], placeholder: -1,
  sx: null, sy: null, sd: null, ss: null, ns: 0, k: 1, selAt: 0, focusing: false, painted: '', dockMaxH: 150, dockGap: null, lines: [], chordsL: [], dayPairs: [], daySub: 1, famLabelsOn: false,
  wb: null, /* each dot's base weight for the current view (the P.w the spec names); project() writes P.w = wb x depth cue */
  sun: null, sunOld: null, selDist: 0, pRange: null, grid: null, gcache: null, cb: null, /* the lock-on sun (drawSun) */
  labHov: -1, rampSaid: false, /* R5 R2: the star label under the pointer (its corona); the day replay's ramp-up line has shown */
  rosterKind: null, tierA: false, RA: null, RB: null, raw: null, /* the roster in use ('A' Tier A only, 'B' the full roster), both builds */
  dayIdx: null, dayIdxP: null, /* universe_days_index.json: null while unknown, the parsed file, or false (absent) */
  ring: null, coreR: 0.6, seg: null, segN: 0, linesOn: false, dolly: null, bright: null, /* falloff classes, framing, K1 trails, the tour dolly, bright-cell keepouts */
};
const C = () => { const d = S.ctx && S.ctx.atlas && S.ctx.atlas.deps, u = d && d.COPY && d.COPY.universe; return u ? Object.assign({}, COPY0, u) : COPY0; };
const tpl = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const P = () => S.ctx.particles;
const famName = (f) => (S.R && S.R.famOrder[f]) || (S.D && S.D.meta.fam_order[f]) || FAM_FALLBACK[f] || 'untagged';
const FAM_FALLBACK = ['ambient/lofi', 'classical', 'electronic', 'experimental', 'folk/country', 'funk/disco', 'hip-hop · r&b', 'jazz', 'other', 'pop', 'rock/metal', 'soundtrack', 'world/desi', 'untagged'];
const famHex = (f) => S.ctx.famColor(famName(f));
const perDot = () => P().perDot || 1;

/* ------------------------------------------------------------------ data */
const dataUrl = (name) => new URL('exhibit/data/' + name + '.json' + V, location.href).href;
function loadJSON(name) { return S.ctx.data(name); }
function worker() {
  if (S.worker || S.wfail) return S.worker;
  try {
    const w = new Worker(new URL('./universe.worker.js' + V, import.meta.url), { type: 'module' });
    w.onmessage = (e) => { const m = e.data || {}, cb = S.wcb.get(m.id); if (!cb) return; S.wcb.delete(m.id); if (m.ok) cb.res(m.out); else cb.rej(new Error(m.err)); };
    w.onerror = (e) => { S.wfail = true; try { e.preventDefault(); } catch (x) {} S.wcb.forEach((cb) => cb.rej(new Error('worker'))); S.wcb.clear(); try { w.terminate(); } catch (x) {} S.worker = null; };
    S.worker = w;
  } catch (e) { S.wfail = true; S.worker = null; }
  return S.worker;
}
/* parse off the main thread; a browser without module workers runs the same code here */
async function build(kind, urls) {
  const N = P().n, w = worker();
  if (w) {
    try {
      return await new Promise((res, rej) => { const id = ++S.wseq; S.wcb.set(id, { res, rej }); w.postMessage({ id, kind, urls, N }); });
    } catch (e) { if (!S.wfail) throw e; /* a worker that died: the main thread runs the same code; a missing file stays missing */ }
  }
  const M = await import('./universe.worker.js' + V);
  return M.run(kind, urls, N);
}
/* the layers. Tier B files may be absent (the shipping state until the owner's redaction run): a missing file is a view
   that is not offered, never a loading line that stays. roster: the full roster when it loads, else the Tier-A build
   (rosterA, from the two Tier-A files already in hand), which the room uses at once so it never shows another room's
   shape while the full roster is on its way. days: only once universe_days_index.json said the day records exist, and
   only when a view needs them (the day view, or a lit sun's partners) */
/* the stars' spread factor for this screen (worker run(): sigK): wider where a dot stands for four plays */
const sigK = () => (P().perDot || 1) > 1 ? TN.sigLow : 1;
const indexed = (R) => { R.nameIdx = new Map(); R.names.forEach((n, i) => { const k = String(n).toLowerCase(); if (!R.nameIdx.has(k)) R.nameIdx.set(k, i); }); return R; };
function need(layer) {
  if (S.load[layer]) return S.load[layer];
  let p;
  if (layer === 'roster') p = build('roster', { artists: dataUrl('universe_artists_all'), sigK: sigK() }).then((R) => { S.RB = indexed(R); setRoster(R); return R; });
  else if (layer === 'rosterA') p = (S.readyP || Promise.resolve()).then(() => { if (!S.raw) throw new Error('tier a'); return build('rosterA', Object.assign({ sigK: sigK() }, S.raw)); }).then((R) => { S.RA = indexed(R); if (!S.RB) setRoster(R); return R; });
  else if (layer === 'days') p = (wantRoster(), S.dayIdxP || probeDays()).then((I) => { if (!I) throw new Error('no day records'); return build('days', { days: dataUrl('universe_days'), index: I }); }).then((D) => { S.D = D; onDays(); return D; });
  else if (layer === 'bridges') p = build('bridges', { bridges: dataUrl('universe_bridges') }).then((B) => { S.B = B; onBridges(); return B; }, (e) => { S.bFail = true; if (S.active) renderHud(); throw e; });
  else if (layer === 'tracks') p = loadJSON('universe_tracks').then((T) => { S.T = T; return T; });
  S.load[layer] = p.catch((e) => { console.warn('universe', layer, e && e.message ? e.message : e); S.load[layer] = null; throw e; });
  return S.load[layer];
}
/* the rosters: A at once (fast, Tier A), B when (if) it arrives; B replaces A for good and its dots glide to their places */
function startRosters() {
  /* Tier A failed (a dropped file): the full roster is the fallback, as before R5; both gone is rosterGone */
  if (!S.R && !S.load.rosterA) need('rosterA').catch(() => { if (S.rosterFail) rosterGone(); else wantRoster(); });
}
/* R5 P0 item 6 (perf): universe_artists_all.json (432 KB) is never fetched on mount or entry. it loads when a view asks for
   it: an artist from search or a deep link, a tap or a label pick on a star, a zoom past ROSTER_ZOOM of home, the day records */
const ROSTER_ZOOM = 0.5;
function wantRoster() {
  if (S.RB || S.load.roster || S.rosterFail) return;
  need('roster').catch(() => { S.rosterFail = true; S.tierA = true; if (!S.R) need('rosterA').catch(() => { rosterGone(); }); else if (S.active) { renderChip(); sayTier(); renderHud(); } });
}
/* neither roster: the room has nothing to draw (the Tier-A files themselves failed) and says so once, no loading line */
function rosterGone() { S.failed = true; if (S.active) { try { S.ctx.hud(null); } catch (e) {} } }
function setRoster(R) {
  if (!R || S.R === R) return;
  const was = S.R; S.R = R; S.rosterKind = R.kind; S.tierA = R.kind === 'A' && !!S.rosterFail;
  if (R.kind === 'B') S.tierA = false;
  /* everything cached against the old roster's dots goes */
  S.painted = ''; S.dayXYZ = null; S.dayMoved = null; S.dayF = null; S.pRange = null; S.ring = null; S.dustMask = null; S.hazeMask = null; S.projDirty = true; S.gcache = null;
  if (S.sun) { S.sun = null; S.sunOld = null; sunClass(false); }
  if (S.placeholder >= R.nA) S.placeholder = -1;
  if (S.sel && S.sel.i >= R.nA) { S.sel = null; try { S.ctx.lock(null); } catch (e) {} }
  ringOf(R); coreOf(R);
  if (S.stage) { S.fit = framing(S.stage); }
  if (S.dom) { S.dom.lbStars.textContent = ''; S.dom.lbStars.removeAttribute('aria-activedescendant'); }
  onRoster(!!was);
}
/* universe_days_index.json, once a page: the day view exists only when it loads (K4) */
function probeDays() {
  if (S.dayIdxP) return S.dayIdxP;
  S.dayIdxP = loadJSON('universe_days_index').then((I) => { S.dayIdx = I && typeof I === 'object' ? I : false; }, () => { S.dayIdx = false; }).then(() => { dayAngle(!!S.dayIdx); return S.dayIdx; });
  return S.dayIdxP;
}
/* add or take away the day angle (K4). taking it away while the day view shows goes back to the sky */
function dayAngle(on) {
  const k = ANGLES.indexOf(DAY_ANGLE);
  if (on && k < 0) ANGLES.splice(3, 0, DAY_ANGLE);
  else if (!on && k >= 0) {
    ANGLES.splice(k, 1);
    if (S.D) S.D = null;
    if (S.active && S.angle === 'day') { try { S.ctx.angle.set('sky', { via: 'api', instant: true }); } catch (e) {} }
  }
  if (S.dom) { buildViews(); if (on) buildDayDom(); renderDock(); }
  sayTier();
}
async function loadTierA() {
  const [N, E] = await Promise.all([loadJSON('universe_nodes'), loadJSON('universe_edges')]);
  const nodes = N.nodes || [], edges = E.edges || [];
  S.raw = { nodes: N, edges: E };
  const A = { nodes, edges, n: nodes.length, share: N.named_play_share || 0, top5: N.top5_by_plays || [], small: N.small_systems || { count: 0, plays: 0 }, byName: new Map(), nbQ: new Int32Array(nodes.length).fill(-1), nbT: new Int32Array(nodes.length).fill(-1) };
  nodes.forEach((n) => { const k = String(n.name).toLowerCase(); if (!A.byName.has(k)) A.byName.set(k, n.id); });
  /* strongest neighbour (US §7): the largest auto_rate edge; the tap line only when that edge's tap_n >= 10 */
  const bq = new Float64Array(nodes.length).fill(-1), bt = new Float64Array(nodes.length).fill(-1);
  edges.forEach((e) => {
    [[e.a, e.b], [e.b, e.a]].forEach(([u, v]) => {
      if (e.auto_n > 0 && e.auto_rate > bq[u]) { bq[u] = e.auto_rate; A.nbQ[u] = v; }
      if (e.tap_n > 0 && e.tap_rate > bt[u]) { bt[u] = e.tap_rate; A.nbT[u] = e.tap_n >= 10 ? v : -2; }
    });
  });
  S.A = A;
  S.ns = A.n; S.sx = new Float32Array(A.n); S.sy = new Float32Array(A.n); S.sd = new Float32Array(A.n); S.ss = new Float32Array(A.n);
  return A;
}

/* ------------------------------------------------------------------ geometry */
const starPos = (i) => [S.R.cx[i], S.R.cy[i], S.R.cz[i]];
/* the worker's per-dot hash and the inverse cdf of the chi distribution with 3 degrees of freedom (the radius of a 3D
   standard gaussian), for the day's clusters (built once, on the first day view) */
function hash(i) { let x = (i + 1) * 2654435761 >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; }
let CHI = null;
function chi3(u) {
  if (!CHI) {
    const n = 512, t = new Float32Array(n + 1), erf = (x) => { const a = 1 / (1 + 0.3275911 * x); return 1 - (((((1.061405429 * a - 1.453152027) * a) + 1.421413741) * a - 0.284496736) * a + 0.254829592) * a * Math.exp(-x * x); };
    const cdf = (r) => erf(r / Math.SQRT2) - Math.sqrt(2 / Math.PI) * r * Math.exp(-r * r / 2);
    let r = 0; for (let i = 0; i <= n; i++) { const v = Math.min(0.9995, i / n); while (cdf(r) < v && r < 6) r += 0.004; t[i] = r; }
    CHI = t;
  }
  return CHI[Math.max(0, Math.min(512, (u * 512) | 0))];
}
/* the sky's positions: the day view moves its lit plays into their clusters (dayPlace); every other view uses the file's */
function skyXYZ() { const R = S.R; return S.angle === 'day' && S.dayXYZ && S.dayXYZ.length === R.N * 3 ? S.dayXYZ : R.sky; }
function clusterPos(f) { const c = S.R ? S.R.clusters : null; return c ? [c[f * 4], c[f * 4 + 1], c[f * 4 + 2]] : [0, 0, 0]; }
function lookAt(k) {
  if (k == null) return null;
  const s = String(k).toLowerCase();
  if (s === 'centre' || s === 'center') return [0, 0, 0];
  const f = famIndex(s), i = S.R ? S.R.nameIdx.get(s) : null;
  if (S.angle === 'threads' && f >= 0 && S.R) return clusterPos(f);
  if (i != null) return starPos(i);
  if (f >= 0 && S.R) return clusterPos(f);
  return null;
}
function famIndex(name) {
  const s = String(name || '').toLowerCase().trim(); if (!s) return -1;
  const L = S.R ? S.R.famOrder : FAM_FALLBACK;
  let k = L.indexOf(s); if (k >= 0) return k;
  const norm = (x) => x.replace(/[^a-z]/g, '');
  const n = norm(s); k = L.findIndex((x) => norm(x) === n); if (k >= 0) return k;
  const AL = { hiphop: 6, rnb: 6, rb: 6, hiphoprnb: 6, lofi: 0, ambient: 0, ambientlofi: 0, edm: 2, desi: 12, world: 12, rock: 10, metal: 10, folk: 4, country: 4, funk: 5, disco: 5 };
  return AL[n] != null ? AL[n] : -1;
}

/* each dot's falloff class: 0 within one sigma of its star, 1 within two, 2 beyond, 3 dust (every non-star play) */
function ringOf(R) {
  const n = R.N, rg = new Uint8Array(n).fill(DUSTC);
  for (let i = 0; i < R.nA; i++) {
    if (R.placed[i] === 1) continue;
    const a0 = R.bs[i], m = R.bs[i + 1] - a0, k0 = Math.max(1, Math.round(SIG0 * m)), k1 = Math.round(SIG1 * m), k2 = Math.round(SIG2 * m);
    for (let j = 0; j < m; j++) rg[a0 + j] = j < k0 ? 0 : j < k1 ? 1 : j < k2 ? 2 : 3;
  }
  S.ring = rg; return rg;
}
/* the laid-out core's radius on the ground plane: 95% of its stars' centres lie within it (about the half-width of their
   bounding box: the force layout fills a rounded square, whose far corners hold a few stars), plus a margin for their
   spread. the two rosters share the layout, so they share the framing */
function coreOf(R) {
  const L = [];
  /* centres only (+ a fixed margin): the two rosters share the layout, so they share the framing */
  for (let i = 0; i < R.nA; i++) if (R.placed[i] === 0) L.push(Math.hypot(R.cx[i], R.cz[i]));
  L.sort((a, b) => a - b);
  S.coreR = L.length ? L[Math.min(L.length - 1, Math.floor(0.95 * (L.length - 1)))] + 0.03 : 0.6;
  /* the outer ring (the stars not in the main web): its radius plus two of its stars' sigmas */
  let rr = 0; for (let i = 0; i < R.nA; i++) if (R.placed[i] === 2) rr = Math.max(rr, Math.hypot(R.cx[i], R.cz[i]) + 2 * R.sig[i]);
  S.ringR = rr > 0 ? rr : RING_R0;
  return S.coreR;
}
/* home framing (W43): the camera distance at which the laid-out core, seen from HOME's pitch and turned to any yaw (the
   orbit spins it), fills HOME_FILL of the stage's short side and at most LONG_FILL of its long side, perspective included.
   returned as the factor on the nominal HOME.dist that every pose is multiplied by */
function framing(st) {
  if (!st || !(st.w > 0 && st.h > 0)) return S.fit || 1;
  const portrait = st.w <= st.h;
  /* an upright phone looks down more steeply, so the sky is round and uses the stage's height; a wide stage sees it tilted */
  const up = st.w <= st.h;
  HOME.pitch = up ? TN.pitchUp : TN.pitchWide; HOME_T.pitch = up ? TN.pitchUp : 0.9;
  /* THREADS frames its ring of fourteen clusters (the ring plus the largest cluster's reach) the same way */
  let rt = 0.9, rt2 = 1; if (S.R && S.R.clusters) { let m = 0; for (let f = 0; f < 14; f++) m = Math.max(m, S.R.clusters[f * 4 + 3]); rt = 0.78 + 1.2 * m; rt2 = 0.78 + 2 * m; } /* the ring of centres plus a little of the largest cluster: a cluster's haze may run to the edge */
  S.distT = fitDist(st, rt, HOME_T.pitch);
  /* a wide stage: the ring with its clusters' two-sigma reach at most RING_WIDE of the short side too, as the sky's ring (so
     the weave never runs under the top bar, and an angle change never passes a frame lit over a third: P1-4) */
  if (!portrait) S.distT = Math.max(S.distT, fitDist(st, rt2, HOME_T.pitch, (2 * RING_WIDE * Math.min(st.w, st.h)) / st.w, (2 * RING_WIDE * Math.min(st.w, st.h)) / st.h));
  /* the whole outer ring stays on the glass (R2_VERIFY_2 beauty P1-5: the phone sky ran off both edges with the core at 75%
     of the width; P2-9: off tour the desktop ring ran under the top bar and the reading column): on an upright stage its
     projected half-width at most RING_UP of the stage's width and its middle at RING_CY of the stage's height; on a wide one
     its projected radius at most RING_WIDE of the short side, in the middle. whatever the yaw. the height is set by the look
     target: home looks at a point S.homeTy under (or over) the middle of the sky, on the orbit's own axis, so the sky turns
     in place and only moves up or down the glass */
  const sh = Math.min(st.w, st.h), fwR = portrait ? 2 * TN.skyUp : (2 * TN.skyWide * sh) / st.w, fhR = portrait ? LONG_FILL : (2 * TN.skyWide * sh) / st.h, cyR = portrait ? RING_CY : 0.5;
  let ty = 0, d = 0;
  for (let k = 0; k < 4; k++) {
    d = Math.max(fitDist(st, S.coreR || 0.6, HOME.pitch, 0, 0, ty), fitDist(st, S.ringR || RING_R0, HOME.pitch, fwR, fhR, ty));
    const b = ringBox(st, S.ringR || RING_R0, HOME.pitch, d, ty), cp = Math.cos(HOME.pitch), sc = (2.2 * 0.42 * sh) / (2.2 * d);
    ty -= ((0.5 + (b.y0 + b.y1) / 2 / st.h) - cyR) * st.h / Math.max(0.05, cp * sc);
    ty = clamp(ty, -0.8, 0.8);
  }
  S.homeTy = ty;
  return d / HOME.dist;
}
/* a circle of radius rc on the ground plane (and the height slab's +-0.09), seen from pitch p at distance dist looking at
   (0, ty, 0): its screen box relative to the stage's centre */
function ringBox(st, rc, p, dist, ty) {
  const cp = Math.cos(p), sp = Math.sin(p), F = 2.2 * 0.42 * Math.min(st.w, st.h), D = 2.2 * dist;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, ok = true;
  for (let k = 0; k < 48; k++) for (let h = -1; h <= 1; h += 2) {
    const th = (k / 48) * 6.283185307, x = rc * Math.cos(th), z = rc * Math.sin(th), y = h * 0.09 - (ty || 0), yr = cp * y - sp * z, dep = sp * y + cp * z + D;
    if (dep <= 0.05) { ok = false; continue; }
    const sx = (x * F) / dep, sy = (-yr * F) / dep;
    if (sx < x0) x0 = sx; if (sx > x1) x1 = sx; if (sy < y0) y0 = sy; if (sy > y1) y1 = sy;
  }
  return { x0, x1, y0, y1, ok };
}
function fitDist(st, rc, p, fw0, fh0, ty) {
  const portrait = st.w <= st.h, fw = fw0 || (portrait ? HOME_FILL : LONG_FILL), fh = fh0 || (portrait ? LONG_FILL : HOME_FILL);
  const fits = (dist) => { const b = ringBox(st, rc, p, dist, ty); return b.ok && b.x1 - b.x0 <= fw * st.w && b.y1 - b.y0 <= fh * st.h; };
  let lo = 0.15, hi = 4;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
  return hi;
}

/* ------------------------------------------------------------------ dom */
function buildDom(root, ctx) {
  if (!document.getElementById('uv-css')) { const st = el('style'); st.id = 'uv-css'; st.textContent = CSS; document.head.appendChild(st); }
  const c = C();
  /* the dock: the views, then the controls of the view that is showing (a room control: never bound, native events) */
  const dock = el('div', 'uv-dock'); dock.setAttribute('role', 'group'); dock.setAttribute('aria-label', 'the universe');
  const views = el('div', 'uv-row uv-angles'); views.setAttribute('role', 'toolbar'); views.setAttribute('aria-label', c.viewsLabel);
  const armRow = el('div', 'uv-row uv-arms'); armRow.hidden = true;
  const armK = el('span', 'uv-k', 'lines'); armRow.appendChild(armK);
  const armGroup = el('div', 'uv-row'); armGroup.setAttribute('role', 'radiogroup'); armRow.appendChild(armGroup);
  /* a view's placard in two parts (R2_VERIFY_2 beauty P2-8): its one line rides with the controls (the float dock hangs
     it over the chip row, the phone bar keeps it in its note, the open card under the chips) and the rest, the paragraph,
     reads in the wall column once "more" is open, like the wall's own dim lines */
  const line = el('p', 'uv-line'); line.hidden = true;
  const plac = el('p', 'uv-plac'); plac.hidden = true;
  const top = el('div', 'uv-row uv-top'); top.append(views, armRow);
  dock.append(top, line);
  /* the sky's light (drawSkyBloom): a low-resolution canvas the compositor stretches over the viewport, one of the page's
     own canvas layers, just over the field's glow and screen-blended like it, so it only ever lightens the glyphs under it
     and stays under the wall text, its scrim and every control */
  let bloom = document.getElementById('uv-bloom');
  if (!bloom) { bloom = el('canvas', 'layer uv-bloom'); bloom.id = 'uv-bloom'; bloom.setAttribute('aria-hidden', 'true'); bloom.width = bloom.height = 1; const g0 = document.getElementById('glow') || document.getElementById('field'); if (g0 && g0.parentNode) g0.after(bloom); else document.body.insertBefore(bloom, document.body.firstChild); } /* after the field (and its glow, where the browser has one: WebKit has none), never under the field's opaque ground */
  root.appendChild(dock);
  /* the phone bar's parts (placeParts): a note line over the chips (the selection, links' K3 placard, the time basis with
     a date, the no-record line) and the day row (date, slider, count). the other notes (fog, ring, both arms, the
     day-lines caption) wait for the card's "more", which moves the whole dock, placards and all, into the open card */
  const note = el('div', 'uv-note'), dayrow = el('div', 'uv-row uv-dayrow');
  /* a press on a room control is the control's own: it never reaches the phone card's stop-swipe (a horizontal scrub on the
     day slider is not a swipe to the next stop) */
  dock.addEventListener('pointerdown', (e) => e.stopPropagation());

  /* the wall column: chip line, family legend, brightest stars, the threads list, the phone selection line */
  const slot = S.wall.querySelector('.legend-slot') || S.wall.insertBefore(el('div', 'legend-slot'), S.wall.querySelector('.deeper'));
  const chipline = el('p', 'uv-chipline');
  const legend = el('div', 'uv-legend'); legend.setAttribute('role', 'group'); legend.setAttribute('aria-label', c.legendLabel);
  FAM_FALLBACK.forEach((n, f) => {
    const b = el('button', 'uv-b'); b.type = 'button'; b.dataset.f = f; b.setAttribute('aria-pressed', 'false');
    const i = el('i'); i.style.background = hexc(ctx.famColor(n)); i.setAttribute('aria-hidden', 'true'); b.append(i, document.createTextNode(n));
    b.addEventListener('click', () => famChip(f)); legend.appendChild(b);
  });
  const famact = el('p', 'uv-famact'); famact.hidden = true; const toThreads = el('button', 'uv-b', c.famThreads); toThreads.type = 'button'; famact.appendChild(toThreads);
  toThreads.addEventListener('click', () => { const f = S.famHi; if (f < 0) return; ctx.angle.set('threads', { via: 'tap' }); focusFamily(f, 'tap'); });
  const bright = el('details', 'uv-more'); bright.appendChild(el('summary', '', c.brightest));
  const lbStars = el('div', 'uv-lb'); lbStars.setAttribute('role', 'listbox'); lbStars.tabIndex = 0; lbStars.setAttribute('aria-label', 'the 50 stars with the most plays'); lbStars.id = 'uv-lb-stars'; bright.appendChild(lbStars);
  const tlist = el('details', 'uv-more uv-threadlist'); tlist.hidden = true; tlist.appendChild(el('summary', '', c.threadList));
  const lbThreads = el('div', 'uv-lb'); lbThreads.setAttribute('role', 'listbox'); lbThreads.tabIndex = 0; lbThreads.setAttribute('aria-label', 'the threads of this arm, by family pair'); lbThreads.id = 'uv-lb-threads'; tlist.appendChild(lbThreads);
  const sel = el('p', 'uv-sel'); sel.setAttribute('aria-hidden', 'true');
  slot.append(chipline, plac, legend, famact, bright, tlist, sel); /* the placard's rest straight under the chip line: the first thing "more" adds to the column */
  /* the info panel's hud carries two lines; the rest of the readout (the star card, the day in full, a thread's window)
     opens here, under the panel on wide screens and under the dock in the phone card (placed by layoutDock) */
  const readout = el('details', 'uv-more uv-readout'); readout.hidden = true; readout.appendChild(el('summary', '', c.readMore));
  const rd = el('div', 'uv-rd'); readout.appendChild(rd);
  listbox(lbStars, (opt) => focusArtistIdx(+opt.dataset.i, 'list'));
  listbox(lbThreads, (opt) => focusPair(+opt.dataset.a, +opt.dataset.b, 'list'));
  /* the day cursor's parts are built only once the day records are known to exist (buildDayDom): without Tier B there is
     no day button, date field or slider anywhere in the page */
  S.dom = { dock, top, views, armRow, armK, armGroup, line, plac, bloom, day: null, ctl: null, prev: null, next: null, play: null, date: null, dayn: null, range: null, norec: null, tb: null, chipline, legend, famact, bright, lbStars, tlist, lbThreads, sel, readout, rd, note, dayrow, slot };
  buildViews();
  if (hasDayAngle()) buildDayDom();
}
/* the view buttons: one per angle the room offers now (never 'star', which a tap on a star opens) */
function buildViews() {
  const d = S.dom, ctx = S.ctx; if (!d) return;
  const want = ANGLES.filter((a) => a.id !== 'star').map((a) => a.id).join(',');
  if (d.views.dataset.ids === want) return;
  d.views.dataset.ids = want; d.views.textContent = '';
  ANGLES.filter((a) => a.id !== 'star').forEach((a) => { const b = el('button', 'uv-b', a.id); b.type = 'button'; b.dataset.a = a.id; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => { try { ctx.angle.set(a.id, { via: 'tap' }); } catch (e) {} }); d.views.appendChild(b); });
}
/* the day cursor (TIER_B §5.1): previous/next recorded day, a typed date, play, and an ordinal slider with no marks */
function buildDayDom() {
  const d = S.dom, ctx = S.ctx; if (!d || d.day) return;
  const c = C();
  const day = el('div', 'uv-day'); day.hidden = true;
  const ctl = el('div', 'uv-row uv-dayctl'); ctl.hidden = true;
  const prev = el('button', 'uv-b', c.prevDay), next = el('button', 'uv-b', c.nextDay), play = el('button', 'uv-b uv-play', c.play);
  prev.type = next.type = play.type = 'button'; prev.setAttribute('aria-label', 'previous day with plays'); next.setAttribute('aria-label', 'next day with plays');
  const date = el('input', 'uv-date'); date.type = 'text'; date.inputMode = 'numeric'; date.autocomplete = 'off'; date.spellcheck = false; date.placeholder = 'yyyy-mm-dd'; date.maxLength = 10; date.setAttribute('aria-label', c.dateLabel);
  const dayn = el('span', 'uv-dayn'); dayn.setAttribute('aria-hidden', 'true');
  ctl.append(prev, date, next, play, dayn);
  const range = el('input', 'uv-range'); range.type = 'range'; range.min = '0'; range.max = '0'; range.step = '1'; range.value = '0'; range.setAttribute('aria-label', c.rangeLabel);
  const norec = el('p', 'uv-norec', c.noRecord); norec.hidden = true;
  const tb = el('p', 'uv-tb', c.timeBasis);
  day.append(range, norec, tb); /* no hour strip: per-day hours were withheld from the public files (GATE_tierb_privacy_B A2). the day-lines caption is the view's placard line (renderDock) */
  d.top.append(ctl);
  d.dock.insertBefore(day, d.line.parentNode === d.dock ? d.line : null); /* the phone bar keeps the line in its note; layoutDock re-places the parts below */
  prev.addEventListener('click', () => { stopPlay(); stepDay(-1, 'tap'); });
  next.addEventListener('click', () => { stopPlay(); stepDay(1, 'tap'); });
  play.addEventListener('click', () => { if (S.playing) stopPlay(); else startPlay(); });
  range.addEventListener('input', () => { stopPlay(); setDayK(+range.value, 'range'); });
  range.addEventListener('keydown', (e) => e.stopPropagation());
  date.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); typedDate(); } else if (e.key === 'Escape') { date.value = S.dayK >= 0 && S.D ? ymd(S.D.date[S.dayK]) : ''; date.blur(); } });
  date.addEventListener('change', typedDate);
  date.addEventListener('input', () => { date.classList.remove('bad'); noRec(false); });
  function typedDate() { stopPlay(); const v = date.value.trim(); if (!v) return; const r = api.setDay(v, { via: 'typed' }); if (r !== true) { date.classList.add('bad'); noRec(true); try { ctx.say(C().noRecord); } catch (e) {} } }
  Object.assign(d, { day, ctl, prev, next, play, date, dayn, range, norec, tb });
  if (S.D) d.range.max = String(Math.max(0, S.D.n - 1));
  renderPlay();
  S.dockMode = null; /* the parts go where the current dock mode wants them */
  if (S.active) { layoutDock(); measureDock(); }
}
/* the wall's sentences are true to what loaded (W44/W54): without the full roster nothing says the dust can be searched,
   without the day records nothing says the days can be stepped through; each is appended once its file is in */
function sayTier() {
  const w = S.wall; if (!w) return;
  const say = w.querySelector('.say:not(.dim)'); if (!say) return;
  if (!say.dataset.uvBase) {
    /* the base sentence as INTEGRATION ships it (W54); an older exhibit.html's promises are taken out here */
    let t = say.textContent;
    t = t.replace(/every other artist is dust you can find by name\./i, 'the other artists are dust.').replace(/the other artists are dust you can find by name\./i, 'the other artists are dust.').replace(/,\s*step through the days,/i, ',');
    /* the ring runs in plays order (build_universe.py places the 143 ring stars by node id): an older markup's "in no
       order" is false, so it reads as the room's own sentence until exhibit.html / labels.js / copy.js carry it */
    t = t.replace(/the rest ring the edge in no order\./i, C().ringSay);
    say.dataset.uvBase = t.trim();
  }
  const c = C(), extra = [];
  if (S.rosterKind === 'B') extra.push(c.sayRoster);
  if (hasDayAngle()) extra.push(c.sayDays);
  const t = say.dataset.uvBase + (extra.length ? ' ' + extra.join(' ') : '');
  if (say.textContent !== t) say.textContent = t;
}
/* a keyboard listbox (listeners' pattern): arrows move aria-activedescendant, Enter/Space picks, a click picks */
function listbox(lb, pick) {
  const opts = () => [...lb.querySelectorAll('[role="option"]')];
  const cur = () => { const id = lb.getAttribute('aria-activedescendant'); return id ? document.getElementById(id) : null; };
  const set = (o) => { opts().forEach((x) => x.setAttribute('aria-selected', x === o ? 'true' : 'false')); if (o) { lb.setAttribute('aria-activedescendant', o.id); const t = o.offsetTop, b = t + o.offsetHeight; if (t < lb.scrollTop) lb.scrollTop = t; else if (b > lb.scrollTop + lb.clientHeight) lb.scrollTop = b - lb.clientHeight; } };
  lb.addEventListener('keydown', (e) => {
    const L = opts(); if (!L.length) return; const c0 = cur(); let k = c0 ? L.indexOf(c0) : -1;
    if (e.key === 'ArrowDown') k = Math.min(L.length - 1, k + 1); else if (e.key === 'ArrowUp') k = Math.max(0, k - 1);
    else if (e.key === 'Home') k = 0; else if (e.key === 'End') k = L.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (c0) pick(c0); return; }
    else return;
    e.preventDefault(); e.stopPropagation(); set(L[k]);
  });
  lb.addEventListener('focus', () => { if (!cur()) { const L = opts(); if (L.length) set(L[0]); } });
  lb.addEventListener('click', (e) => { const o = e.target.closest('[role="option"]'); if (o) { set(o); pick(o); } });
}
function fillStarList() {
  const lb = S.dom.lbStars; if (!S.A || lb.childElementCount) return;
  const frag = document.createDocumentFragment();
  S.A.nodes.slice(0, 50).forEach((n) => { /* node ids run in descending plays: file order is plays order */
    const o = el('div'); o.setAttribute('role', 'option'); o.id = 'uv-st-' + n.id; o.dataset.i = n.id; o.setAttribute('aria-selected', 'false');
    o.append(document.createTextNode(n.name)); if (S.R && S.R.plays) o.appendChild(el('span', '', fmt(S.R.plays[n.id]) + ' plays'));
    frag.appendChild(o);
  });
  lb.appendChild(frag);
}
function fillThreadList() {
  const lb = S.dom.lbThreads; lb.textContent = ''; lb.removeAttribute('aria-activedescendant');
  const frag = document.createDocumentFragment();
  S.chordsL.forEach((ch) => { const o = el('div'); o.setAttribute('role', 'option'); o.id = 'uv-th-' + ch.a + '-' + ch.b; o.dataset.a = ch.a; o.dataset.b = ch.b; o.setAttribute('aria-selected', 'false'); o.textContent = famName(ch.a) + ' × ' + famName(ch.b); frag.appendChild(o); });
  lb.appendChild(frag);
}
/* where the dock sits. 'float': bottom-left of the stage on wide screens. 'bar' (a phone held upright): pinned inside the
   stage's bottom edge as one chip row (views + arms, or the day's step buttons), with the day row and one note line over
   it, so the card under the stage never grows with a view (the stage kept 259-288 px of an 844 px phone when the dock
   lived in the card). 'wall': inside the wall card, on a short landscape screen and on an upright one whose card is open
   in full ("more": the card takes the screen, so its controls go with it) */
const dockModeOf = () => (innerWidth <= innerHeight * 1.15 ? (document.documentElement.classList.contains('ai-less') ? 'bar' : 'wall') : innerHeight <= 480 ? 'wall' : 'float');
function placeParts(mode) {
  const d = S.dom, dy = !!d.day;
  if (mode === 'bar') {
    d.note.append(d.sel, d.line); if (dy) d.note.append(d.norec, d.tb);
    if (dy) { d.ctl.append(d.prev, d.next, d.play); d.dayrow.append(d.date, d.range, d.dayn); d.day.append(d.dayrow); }
    d.dock.append(d.note); if (dy) d.dock.append(d.day); d.dock.append(d.top);
  } else {
    if (dy) { d.ctl.append(d.prev, d.date, d.next, d.play, d.dayn); d.day.append(d.range, d.norec, d.tb); }
    d.dayrow.remove(); d.note.remove();
    d.dock.append(d.top); if (dy) d.dock.append(d.day); d.dock.append(d.line); /* the float dock hangs the line under its box (css) */
    d.slot.append(d.sel);
  }
}
function layoutDock() {
  const d = S.dom; if (!d) return;
  const mode = dockModeOf();
  if (mode !== S.dockMode || !d.dock.isConnected) {
    S.dockMode = mode; S.dockIn = mode !== 'float';
    placeParts(mode);
    d.dock.classList.toggle('inwall', mode === 'wall'); d.dock.classList.toggle('inbar', mode === 'bar'); d.dock.classList.toggle('float', mode === 'float');
    if (mode === 'wall') { const h2 = S.wall.querySelector('h2'); S.wall.insertBefore(d.dock, h2 ? h2.nextSibling : S.wall.firstChild); }
    else S.root.appendChild(d.dock);
    /* the bar is measured live wherever keepouts are read (labels, the hint line); the float dock reserves its tallest view */
    if (mode === 'bar') d.dock.setAttribute('data-keepout', ''); else d.dock.removeAttribute('data-keepout');
    renderDock();
  }
  if (mode === 'wall') { if (d.readout.previousSibling !== d.dock) d.dock.after(d.readout); }
  else if (mode === 'bar') { const cav = S.wall.querySelector('#universe-caveat'); if (cav && d.readout.previousSibling !== cav) cav.after(d.readout); }
  else if (S.wall.firstChild !== d.readout) S.wall.insertBefore(d.readout, S.wall.firstChild);
  if (S.sec && S.stage) S.sec.style.setProperty('--uv-scrim', Math.max(40, Math.round(S.stage.x - 10)) + 'px');
  const st = d.dock.style, s = S.stage;
  if (mode !== 'float') d.dock.classList.remove('tight');
  if (mode === 'float') placeFloat();
  else if (mode === 'bar') {
    st.left = Math.round(s.x) + 'px'; st.width = Math.round(s.w) + 'px'; st.maxWidth = ''; st.top = 'auto'; st.minHeight = '0';
    /* while the first-visit hint line shows, the bar sits over the hint's own spot (8px above the card, chrome.js lineSpot),
       computed from the card and not from where the hint is now, so the two never leapfrog; the hint's observer drops it */
    let bottom = innerHeight - (s.y + s.h) + 2;
    const ob = document.getElementById('atlas-onboard'), info = document.getElementById('atlas-info');
    if (ob && !ob.hidden && info && !document.documentElement.classList.contains('atlas-hidden')) { const h = ob.offsetHeight; if (h) bottom = Math.max(bottom, innerHeight - (info.getBoundingClientRect().top - 8 - h) + 6); }
    st.bottom = Math.round(bottom) + 'px';
  } else { st.left = st.width = st.maxWidth = st.bottom = st.top = ''; st.removeProperty('--uv-linew'); }
}
/* the float dock: a row at the stage's left edge, as wide as its chips (at most the stage), bottom-anchored in the band
   under the stage with room for its placard line under it */
function placeFloat() {
  const d = S.dom, st = d.dock.style, s = S.stage;
  st.left = Math.round(s.x) + 'px'; st.width = 'max-content'; st.maxWidth = Math.round(dockW()) + 'px'; st.top = 'auto'; st.minHeight = '0';
  st.setProperty('--uv-linew', lineW() + 'px');
  S.dockGap = dockBottomGap(); st.bottom = Math.round(S.dockGap) + 'px';
}
/* the dock's tallest configuration (links, threads or day), measured once per enter (a layout read, never per frame):
   labels keep out of all of it, and the day counter rides its top edge */
function measureDock() {
  const d = S.dom; if (!d) return;
  const keep = S.angle, views = ['links', 'threads'].concat(d.day ? ['day'] : []), fl = S.dockMode === 'float';
  /* the float row stays one row (R2_VERIFY_2 beauty P2-8): where any view's chips run wider than the dock may be, every
     view drops the arm group's key word and closes up (the radio group keeps its accessible name), so no view jumps */
  if (fl) {
    d.dock.classList.remove('tight'); d.dock.style.maxWidth = 'none'; let nat = 0;
    views.forEach((a) => { S.angle = a; renderDock(); nat = Math.max(nat, d.dock.offsetWidth); });
    d.dock.classList.toggle('tight', nat > dockW()); d.dock.style.maxWidth = Math.round(dockW()) + 'px';
  }
  /* the float dock's line hangs under its box, outside it: the band it keeps is the box and the line together */
  const span = () => { const on = fl && !d.line.hidden, h = d.dock.offsetHeight; return [h, on ? d.line.offsetHeight : 0, Math.max(d.dock.offsetWidth, on ? d.line.offsetWidth : 0)]; };
  S.angle = keep; renderDock();
  const [cur, cl, cw] = span(); let mb = cur, ml = cl, mw = cw, mx = cur + (cl ? LINE_GAP + cl : 0);
  views.forEach((a) => { S.angle = a; renderDock(); const [h, l, w] = span(); mb = Math.max(mb, h); ml = Math.max(ml, l); mw = Math.max(mw, w); mx = Math.max(mx, h + (l ? LINE_GAP + l : 0)); });
  S.angle = keep; renderDock(); S.dockMaxH = mx || 150; S.dockBoxH = mb || 30; S.dockLineH = ml; S.dockMaxW = mw; S.dockCurH = cur;
  if (fl) placeFloat(); /* the band's foot room follows the line as measured (two lines where the stage is narrow) */
}
function renderDock() {
  const d = S.dom; if (!d) return;
  const c = C(), a = S.angle;
  [...d.views.children].forEach((b) => b.setAttribute('aria-pressed', b.dataset.a === a || (a === 'star' && b.dataset.a === 'sky') ? 'true' : 'false'));
  const armsOn = a === 'links' || a === 'threads';
  d.armRow.hidden = !armsOn;
  if (armsOn) {
    const L = a === 'links' ? LINK_ARMS : THREAD_ARMS, cur = a === 'links' ? S.armL : S.armT;
    d.armK.textContent = a === 'links' ? 'lines' : 'threads';
    d.armGroup.setAttribute('aria-label', a === 'links' ? c.armLabelL : c.armLabelT);
    if (d.armGroup.dataset.kind !== a) {
      d.armGroup.textContent = ''; d.armGroup.dataset.kind = a;
      L.forEach((m) => {
        const b = el('button', 'uv-b'); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.arm = m.id;
        const sw = el('i', 'uv-sw'); sw.setAttribute('aria-hidden', 'true'); sw.style.background = hexc(armColour(a, m.id));
        /* the name as its own span (the phone bar shows only the picked arm's name, and drops "my " / "the ") */
        const nm = el('span', 'uv-an'), sp = m.name.indexOf(' '), pre = sp > 0 && /^(my|the)$/.test(m.name.slice(0, sp)) ? m.name.slice(0, sp + 1) : '';
        if (pre) nm.append(el('span', 'uv-ap', pre)); nm.append(document.createTextNode(m.name.slice(pre.length)));
        b.append(sw, nm);
        b.addEventListener('click', () => setArm(m.id, 'tap'));
        b.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); e.stopPropagation(); const B = [...d.armGroup.children], k = B.indexOf(b), n = B.length, j = (k + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : n - 1)) % n; setArm(B[j].dataset.arm, 'key'); B[j].focus(); });
        d.armGroup.appendChild(b);
      });
    }
    [...d.armGroup.children].forEach((b) => { const on = b.dataset.arm === cur; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
  }
  /* placards (R2_VERIFY_2 beauty P2-8): one line with the controls, the rest in the wall column under "more". links: K3
     on the line in every dock (the number stays in view), the grey of both arms and fog in "more"; threads: the ring note
     on the line, fog in "more"; day: the day-lines caption on the line. the phone bar's note keeps K3 alone on the stage;
     the other lines wait for its "more", which moves the dock, line and all, into the open card */
  const bar = S.dockMode === 'bar';
  let ln = '', p = '';
  if (a === 'links') { ln = c.k3; p = (S.armL === 'both' ? c.both + ' ' : '') + c.fog; }
  else if (a === 'threads') { ln = bar ? '' : c.ring; p = c.fog; }
  else if (a === 'day') ln = bar ? '' : c.dayLines;
  d.line.hidden = !ln; if (d.line.textContent !== ln) d.line.textContent = ln;
  d.plac.hidden = !p; if (d.plac.textContent !== p) d.plac.textContent = p;
  if (d.day) {
    d.day.hidden = a !== 'day'; d.ctl.hidden = a !== 'day';
    /* in the bar the time basis and the no-record line live outside the day block: they go with the day view */
    d.tb.hidden = a !== 'day'; d.norec.hidden = !(S.norecOn && a === 'day');
    d.tb.textContent = c.timeBasis; /* the pinned sentence: the day records carry no hours (the index file's own line still names them) */
    if (S.ctx.reduced) d.play.hidden = true;
  }
  d.tlist.hidden = a !== 'threads';
  if (S.sec) S.sec.dataset.uvAngle = a;
}
function armColour(angle, arm) {
  const PAL = S.ctx.PAL;
  if (arm === 'tap') return PAL.tap; if (arm === 'shuffle') return PAL.shuffle; if (arm === 'served') return PAL.violet;
  return 0xa49bbd; /* both: --mute grey, no provenance hue */
}

/* ------------------------------------------------------------------ the api other modules read (§1.11) */
const api = {
  ready: null,
  /* K4: roster 'A' (Tier A only) or 'B' (the full roster), null before either; days: the day records exist (the index
     loaded), false when they are absent, null while unknown; tracks: the track file loaded */
  get has() { return { roster: S.rosterKind, days: S.dayIdx === null ? null : !!S.dayIdx, tracks: !!S.T, threads: !!S.B, xyz: false }; },
  get time() { return { level: S.angle === 'day' ? 'day' : 'all', at: S.angle === 'day' && S.D && S.dayK >= 0 ? ymd(S.D.date[S.dayK]) : null, playing: !!S.playing }; },
  setDay(d, o = {}) {
    if (S.dayIdx === false) return 'no-days';
    if (!S.D) { S.pending.push({ day: d }); need('days').catch(() => { daysGone(); }); return true; }
    const k = dayIndex(d); if (k < 0) return 'no-record';
    setDayK(k, o.via || 'api'); return true;
  },
  stepDay(n) { stepDay(n >= 0 ? 1 : -1, 'api'); },
  play() { startPlay(); }, pause() { stopPlay(); },
  onTime(fn) { if (typeof fn !== 'function') return () => {}; S.timeFns.push(fn); return () => { const k = S.timeFns.indexOf(fn); if (k >= 0) S.timeFns.splice(k, 1); }; },
  get arm() { return S.angle === 'threads' ? S.armT : S.armL; },
  setArm(a) { setArm(a, 'api'); },
  star(name) { const i = artistIdx(name); if (i < 0 || !S.R || i >= S.R.nA) return null; return { id: i, xyz: starPos(i), family: famName(S.R.fam[i]), placed: S.R.placed[i] }; },
  family(name) { const f = famIndex(name); return f < 0 || !S.R ? null : { cluster: clusterPos(f) }; },
  get fit() { return S.fit || 1; }, /* the room's camera-distance factor on this stage (tour poses may scale by it) */
  get shown() { return S.readyAt > 0; }, /* this entry's sky has been drawn in place (roomReady) */
  get medianDay() { return S.D && S.D.median >= 0 ? ymd(S.D.date[S.D.median]) : null; },
  state() { return roomState(); },
};
function roomState() {
  const s = {};
  if (S.angle === 'day' && S.D && S.dayK >= 0) s.t = 'day:' + ymd(S.D.date[S.dayK]);
  if (S.sel && S.R && S.sel.i >= 0) s.n = S.R.names[S.sel.i];
  if (S.angle === 'links') s.arm = S.armL; else if (S.angle === 'threads') s.arm = S.armT;
  if (S.angle === 'threads') { if (S.chord) s.f = famName(S.chord[0]) + ',' + famName(S.chord[1]); else if (S.famHi >= 0) s.f = famName(S.famHi); }
  return s;
}
function fireTime() { const t = api.time; S.timeFns.slice().forEach((f) => { try { f(t); } catch (e) {} }); }

/* ------------------------------------------------------------------ load events */
function onRoster(swap) {
  const R = S.R;
  fillStarList();
  sayTier();
  if (!R || !S.active) return;
  S.painted = '';
  renderChip();
  applyAngleState({ enter: !swap });
  if (S.angle === 'day') frameDay({ enter: true });
  flushPending();
}
/* the day records failed after the index promised them: the day view goes, and any line waiting on it clears */
function daysGone() {
  try { S.ctx.hud(null); } catch (e) {}
  S.dayIdx = false; S.pending = S.pending.filter((f) => !f.day);
  dayAngle(false);
  if (S.active) renderHud();
}
function onDays() {
  const D = S.D, d = S.dom;
  if (d.range) d.range.max = String(Math.max(0, D.n - 1));
  if (S.dayK < 0 && D.median >= 0) S.dayK = D.median;
  if (S.active && S.angle === 'day') { applyAngleState({}); frameDay({ enter: true }); }
  /* a lock that landed before the days: its sun gets its threads now, and the card its partners line */
  if (S.sun) { sunLayout(S.sun); if (sunLit()) { setLabels(); weights(); } }
  if (S.active && S.sel && S.R) renderHud();
  flushPending();
}
function onBridges() {
  buildChords();
  if (S.active && S.angle === 'threads') { applyAngleState({}); }
  flushPending();
}
function renderChip() {
  if (!S.R || !S.A) return;
  const R = S.R, c = C();
  /* the dust count from the file that loaded: the full roster's artists without a star, or Tier A's small_systems.count */
  let dust = 0;
  if (R.kind === 'B') { for (let i = 0; i < R.nA; i++) if (R.placed[i] === 1) dust++; } else dust = S.A.small.count | 0;
  S.dom.chipline.textContent = tpl(c.chip, { named: fmt(S.A.n), play_share: Math.round(100 * S.A.share), dust: fmt(dust) }) + (R.kind === 'B' ? c.chipSearch : '');
}
/* how every dot is drawn, per view. every play is in the glyph pass (their weights summed into cells, hue from one real
   member). stars at full weight are the glyph stars; the dust (every other play) is a fixed dither of full-weight specks
   (dustMask), so the shell reads as sparse points behind the stars, never as an even haze or pixel static. in THREADS
   every play is at full weight in its family's cluster. in the day view the lit plays are at full weight and every
   other play (FAINT, the same for past and future days) is haze. project() then scales each weight by depth */
function paintState() {
  const R = S.R, Pp = P(); if (!R) return;
  const a = S.angle, WB = S.wb, F = R.dFam, dA = R.dA, pl = R.placed, bg = 0x0a0118, f0 = S.famHi;
  /* every dot keeps its family's full hue: a dot steps back by its weight (a dim tone in the renderer's own ramp), never
     by a darkened colour, which the renderer's brightness floor turned into dark smudges */
  const full = new Uint32Array(14), faint = new Uint32Array(14);
  for (let f = 0; f < 14; f++) { const c = famHex(f) >>> 0; full[f] = c; faint[f] = mixHex(c, bg, 0.35); }
  const U = a === 'threads' || a === 'day' ? null : sunLit();
  const key = a === 'threads' ? 'thr' : a === 'day' && S.D && S.dayK >= 0 ? 'day:' + S.dayK : U ? 'sun:' + U.i + ':' + U.nb.length : 'sky:' + f0;
  if (key === S.painted) return;
  S.painted = key;
  Pp.glyphAll(true);
  if (a === 'threads') { Pp.color((i) => full[F[i]]); return; }
  if (key.startsWith('day')) { Pp.color((i) => (WB[i] === 255 ? full[F[i]] : faint[F[i]])); return; }
  if (U) { const K = U.keep; Pp.color((i) => { const k = dA[i]; return k >= 0 && K[k] ? full[F[i]] : faint[F[i]]; }); return; } /* a lit sun: the rest of the sky in its faint hue */
  Pp.color((i) => full[F[i]]);
}
function paint() { S.painted = ''; paintState(); }
function mixHex(a, b, k) { const r = ((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k, g = ((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k, bl = (a & 255) * (1 - k) + (b & 255) * k; return ((r | 0) << 16) | ((g | 0) << 8) | (bl | 0); }

/* ------------------------------------------------------------------ angle state */
function applyAngleState(o) {
  if (!S.active) return;
  const ctx = S.ctx, a = S.angle, c = C();
  renderDock();
  /* no roster yet: the hud stays empty for the first moments (the roster is usually a few hundred ms off), and says
     "loading…" only if it is still coming a while later: never a loading line flashed at every entry (VERIFY_1 P0-1) */
  if (!S.R) { ctx.hud(null); clearTimeout(S.loadT); S.loadT = setTimeout(() => { if (S.active && !S.R && !S.failed) { try { ctx.hud(C().loading); } catch (e) {} } }, LOAD_SAY_MS); return; }
  clearTimeout(S.loadT);
  if (a === 'day' && !S.D) { ctx.hud(c.loading); need('days').catch(() => { daysGone(); }); }
  if (a === 'threads' && !S.B) need('bridges').catch(() => {});
  weights();
  setLabels();
  renderHud();
  ladder();
  if (a === 'day' && S.D) renderDay();
  fireTime();
}
function setAngle(id, via, instant) {
  const prev = S.angle, ctx = S.ctx, red = ctx.reduced || instant;
  if (id !== 'day') stopPlay();
  S.angle = id; S.hoverLine = null; S.dayLine = null;
  if (id !== 'threads') { S.chord = null; }
  if (id === 'threads' || prev === 'threads') { S.sel = null; S.placeholder = -1; ctx.lock(null); }
  if (id === 'day' && S.dayK < 0 && S.D && S.D.median >= 0) S.dayK = S.D.median;
  let ms = 0;
  const want = id === 'threads' ? 'thr' : 'sky';
  if (S.R && want !== S.rest) { startMorph(want, red); ms = red ? 0 : MORPH_MS; }
  else if (!S.R) S.rest = want;
  applyAngleState({});
  /* the camera: threads has its own overview; coming back from it goes home; star flies to the brightest star */
  try {
    if (id === 'threads' && prev !== 'threads') fly(Object.assign({}, HOME_T, { dist: S.distT || HOME_T.dist * (S.fit || 1) }), { instant: red });
    else if (id === 'day' && prev !== 'day') frameDay({ enter: true, instant: red });
    else if ((prev === 'threads' || prev === 'day') && id !== 'star') fly(fitted(HOME), {});
    if (id === 'star' && !S.sel && !S.focusing && S.A && S.A.top5.length) focusArtistIdx(S.A.top5[0], via || 'angle');
  } catch (e) {}
  return ms;
}
function setArm(a, via) {
  if (S.angle === 'threads') { if (!THREAD_ARMS.some((m) => m.id === a)) return; S.armT = a; buildChords(); if (S.chord) selectChord(S.chord[0], S.chord[1]); }
  else { if (!LINK_ARMS.some((m) => m.id === a)) return; S.armL = a; }
  renderDock(); renderHud();
}
/* an angle change between the sky's shape and THREADS' (R2_VERIFY_2 beauty P1-4: links to threads passed through a solid
   glyph ball, every play at the new view's weight while still on the old shell; the incoming names stood over empty
   space). only the named stars travel: each star's body (its dots within one sigma) carries its weight from the old view's
   to the new one's as it moves, and everything else (the stars' outer halos and the dust, every play of an artist under
   50 plays) fades to nothing over the first MORPH_OUT of the morph where it stands, moves unseen, and fades up to the new
   view's weight over the last MORPH_OUT where it lands (dotsMorph). the old view's names go at once and the new view's come
   in only once the morph passes MORPH_LAB (setLabels), when every star is where its name points */
const MORPH_OUT = 0.3, MORPH_LAB = 0.85;
function startMorph(to, instant) {
  const from = S.rest; S.rest = to;
  if (instant || !S.R) { S.morph = null; S.projDirty = true; return; }
  /* the weights the dots leave with: the old view's, as drawn (weights() is about to write the new view's) */
  const n = P().w.length; if (!S.wa || S.wa.length !== n) S.wa = new Uint8Array(n);
  if (S.wb && S.wb.length === n) S.wa.set(S.wb); else S.wa.fill(0);
  const t = now(); S.morph = { from, to, t0: t, dur: MORPH_MS };
  S.projDirty = true;
}
/* how far the angle morph has run (0..1; 1 when none runs) */
function morphU(t) { const M = S.morph; return M ? clamp(((t == null ? now() : t) - M.t0) / M.dur, 0, 1) : 1; }
const labsHeld = () => !!S.morph && morphU() < MORPH_LAB;
const areaK = () => { const st = S.stage, a = st ? Math.min(st.w, st.h) / 800 : 1; return perDot() * a * a; };
function hazeKeep() { return Math.round(clamp(areaK() / HAZE_EVERY, 0.02, 1) * 1000) / 1000; }
/* per play, per screen area, and per cell: when the governor coarsens the lattice (bigger cells hold more dust each), the
   dust thins by as much, so the haze keeps its grain instead of filling every cell */
function dustKeep() { const f = S.cell0 && S.cellNow ? clamp(S.cell0 / S.cellNow, 0.3, 1) : 1; return Math.round(clamp(areaK() * TN.dustKeep * f, 0.01, 1) * 1000) / 1000; }
/* the renderer's cell area in device px now (GF.cellFor: the governor's tier included) */
function cellArea() { try { const G = S.ctx.atlas.GF; if (G && typeof G.cellFor === 'function') { const c = G.cellFor(null); return c[0] * c[1]; } } catch (e) {} return 0; }
/* a fixed dither: 1 for a hash-chosen share `keep` of the dots, the same dots whenever it is asked (salt: which subset) */
function ditherMask(n, keep, salt) {
  const M = new Uint8Array(n);
  for (let d = 0; d < n; d++) { let x = Math.imul((d + 1) ^ salt, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; M[d] = (x >>> 0) / 4294967296 < keep ? 1 : 0; }
  return M;
}
function hazeMask(n) { const keep = hazeKeep(); S.hazeMask = ditherMask(n, keep, 0); S.hazeFor = keep; return S.hazeMask; }
function dustMask(n) {
  const keep = dustKeep();
  if (!(S.dustMask && S.dustMask.length === n && S.dustFor === keep)) { S.dustMask = ditherMask(n, keep, 0x5bd1e995); S.dustFor = keep; }
  return S.dustMask;
}
/* the dust's grain (R2_VERIFY_2 beauty P1-5): every dust dot carries a seeded tone jitter of +-DUST_JIT, so the haze spreads
   over . ' : ; instead of one glyph in alternating cells (at DPR 3 a lattice of ' read as falling tick marks). a kept dust
   dot at TN.dustW sits at about DUST_T0 of the frame's exposure (the haze band's middle), and the renderer's tone runs
   about as weight^0.7 at the low end, so a dot of base weight b sits at t = DUST_T0 (b / dustW)^0.7 and a tone offset j is
   the weight factor ((t + j) / t)^(1 / 0.7), never below DUST_TMIN (the band's floor). a dot's jitter is one of 256 steps,
   by a hash of the dot (the same in every view and on every visit) */
const DUST_JIT = 0.08, DUST_T0 = 0.12, DUST_TMIN = 0.02;
function dustJit(b) {
  const M = S.dj || (S.dj = new Map()), key = b + ':' + TN.dustW; let J = M.get(key); if (J) return J;
  J = new Float32Array(256); const t = DUST_T0 * Math.pow(Math.max(1, b) / Math.max(1, TN.dustW), 0.7);
  for (let k = 0; k < 256; k++) { const j = (((k + 0.5) / 256) * 2 - 1) * DUST_JIT; J[k] = Math.pow(Math.max(DUST_TMIN, t + j) / t, 1 / 0.7); }
  M.set(key, J); return J;
}
function dustHash(n) {
  if (S.dh && S.dh.length === n) return S.dh;
  const H = new Uint8Array(n);
  for (let d = 0; d < n; d++) { let x = Math.imul((d + 1) ^ 0x2545f491, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; H[d] = (x >>> 24) & 255; }
  return (S.dh = H);
}
/* a star's dots' weight factor: 1, or with TN.coreK > 0 a gentle compression of the biggest stars' column density. the full
   roster's giants (the most played artist has a hundred times the plays of the least) would otherwise set the exposure for
   the whole sky; the Tier-A sizes are a bucket proxy whose range is already narrow (about 24 to 1), so they are left alone */
function starScale(R) {
  const key = R.kind + ':' + TN.coreK + ':' + TN.coreRef;
  if (S.scK === key && S.sc) return S.sc;
  const sc = new Float32Array(R.nA).fill(1);
  if (TN.coreK > 0 && R.kind !== 'A') for (let i = 0; i < R.nA; i++) sc[i] = Math.min(1, Math.pow(TN.coreRef / Math.max(1, R.size[i]), TN.coreK));
  S.sc = sc; S.scK = key; return sc;
}
/* a dot's place in its THREADS cluster as a quantile (the worker's own hash, worker buildDots: chi3(hash(d * 13 + 7) x .998)) */
function thrU(d) { return hash(d * 13 + 7) * 0.998; }
function weights() {
  const Pp = P(), R = S.R; if (!R) return;
  const n = Pp.w.length, WB = S.wb && S.wb.length === n ? S.wb : (S.wb = new Uint8Array(n));
  const F = R.dFam, dA = R.dA, pl = R.placed, f = S.famHi;
  if (S.angle === 'day' && S.D && S.dayK >= 0) {
    const HZ = S.hazeMask && S.hazeMask.length === n && S.hazeFor === hazeKeep() ? S.hazeMask : hazeMask(n);
    for (let d = 0; d < n; d++) WB[d] = HZ[d] ? FAINT : 0;
    const D = S.D, k = S.dayK, pd = perDot();
    for (let j = D.topOff[k]; j < D.topOff[k + 1]; j += 2) {
      const i = D.top[j], m0 = D.top[j + 1]; if (i < 0 || i >= R.nA) continue;
      const a0 = R.bs[i], len = R.bs[i + 1] - a0, m = Math.min(len, Math.max(1, Math.round(m0 / pd)));
      for (let q = 0; q < m; q++) WB[a0 + q] = 255; /* a block runs from the star's centre outwards: its innermost dots light */
    }
    dayPlace(k);
  } else if (S.angle === 'threads') {
    /* every play is in its family's cluster here, dust included; each cluster grades from its core out (the worker hashes a
       dot's radius in its cluster, so the same hash gives its falloff class), a picked-out family keeps its weight */
    for (let d = 0; d < n; d++) { const u = thrU(d), w = u < SIG0 ? STAR_W[0] : u < SIG1 ? STAR_W[1] : u < SIG2 ? STAR_W[2] : STAR_W[3]; WB[d] = f < 0 || F[d] === f ? w : Math.max(1, (w * DIMFAM) >> 8); }
  } else {
    /* the sky (and links, and a star): each star grades from its core out (STAR_W by falloff class), the dust is a haze;
       a lit sun keeps its star and its partners and steps every other play back, as a picked-out family does */
    const DM = dustMask(n), RG = S.ring && S.ring.length === n ? S.ring : ringOf(R), U = sunLit(), keep = U ? U.keep : null;
    const SC = starScale(R), lk = S.angle === 'links'; /* links: the dust steps back so the trails read */
    const DH = dustHash(n);
    for (let d = 0; d < n; d++) {
      const k = dA[d], g = RG[d];
      if (g === DUSTC || k < 0 || pl[k] === 1) { if (!DM[d]) { WB[d] = 0; continue; } const b0 = keep ? TN.dustSun : lk || (f >= 0 && F[d] !== f) ? TN.dustOff : TN.dustW, w = keep ? b0 : b0 * dustJit(b0)[DH[d]]; WB[d] = w < 1 ? 1 : w > 255 ? 255 : (w + 0.5) | 0; continue; }
      const w = Math.max(1, (STAR_W[g] * SC[k] + 0.5) | 0);
      WB[d] = keep ? (DH[d] < Math.min(keep[k] === 1 && k !== U.i ? SUN_NB_KEEP : SUN_KEEP, (256 * SUN_DOTS) / (R.bs[k + 1] - R.bs[k])) ? 1 : 0) : f < 0 || F[d] === f ? w : Math.max(1, (w * DIMFAM) >> 8);
    }
  }
  /* the field gets the weights only once this entry's dots stand where the room put them (project(): placed); until then
     it stays empty, never another room's shape or the shell's default layout lit up (VERIFY_1 P0-1) */
  /* (while an angle morph runs, project() writes every dot's weight each frame from the old and new views': the field keeps
     the last frame's until then, never one frame of the new view's weights on the old shape) */
  if (S.placed && !S.morph) Pp.w.set(WB); S.projDirty = true; /* the next projection applies the depth cue */
  paintState();
  try { Pp.glyphMode('cont', { colour: 'sample', bleach: true }); } catch (e) {} /* re-seeds the exposure: a quiet day never renders dimmer for having fewer plays; a star's core bleaches toward white (W38's renderer option) */
}

/* ------------------------------------------------------------------ labels */
function setLabels() {
  const ctx = S.ctx, R = S.R, A = S.A; if (!R || !A) return;
  const items = [], a = S.angle;
  if (labsHeld()) {
    /* an angle morph: no view's names until the stars are where the names point (R2_VERIFY_2 beauty P1-4) */
  } else if (a === 'threads' && S.layT) {
    /* the room's own layout (layoutThreads): each family's name at the slot it found outside its cluster, as a centred
       screen point, so what is drawn is what was checked (no two names within 6 px, none on the chrome) */
    S.layT.forEach((e, f) => items.push({ id: 'f' + f, text: famName(f), x: e.ax, y: e.ay, space: 'screen', r: 0, align: 'c', pri: 40 + Math.log2(1 + R.famPlays[f]), kind: 'region', zoom: null, go: () => focusFamily(f, 'label') }));
  } else if (a === 'threads') {
    /* before the first layout pass: each family's name out past its cluster on the ring's outer side */
    for (let f = 0; f < 14; f++) { const cpos = clusterPos(f), sg = R.clusters[f * 4 + 3], L = Math.hypot(cpos[0], cpos[2]) || 1, k = (L + 1.5 * sg) / L; items.push({ id: 'f' + f, text: famName(f), x: cpos[0] * k, y: cpos[1] + sg * 0.6, z: cpos[2] * k, space: '3d', r: 0.01, pri: 40 + Math.log2(1 + R.famPlays[f]), kind: 'region', go: () => focusFamily(f, 'label') }); }
  } else if (a === 'day' && S.D && S.dayK >= 0) {
    const D = S.D, k = S.dayK;
    /* [ name · n ]: the day's plays of that artist. a label's text never changes under one id (the count is in the id),
       and it sits just off the lit core (the star's innermost dots) rather than off the whole star */
    const F = dayFrame(k), sg = new Map(); if (F) F.lit.forEach((e) => sg.set(e.i, e.sig));
    for (let j = D.topOff[k]; j < D.topOff[k + 1]; j += 2) {
      const i = D.top[j], n = D.top[j + 1]; if (i < 0 || i >= A.n) continue;
      /* the label sits just off the day's cluster (its own size), not off the whole star */
      const it = starItem(i, 2000 + n); it.id = 'd' + i + '_' + n; it.text = R.names[i] + ' · ' + fmt(n); it.r = Math.max(0.008, sg.has(i) ? sg.get(i) * 1.6 : R.sig[i] * 0.8); items.push(it);
    }
  } else if (sunLit()) {
    /* the sun: the locked star's label clears the whole disc; its partners' tags ride their threads (kind 'tag': the
       labels' own class list carries the kind, so the room's css brackets them and keeps them bright while html.uv-sun
       dims every other star label); stars under the disc have no label (their dots are under it) */
    const U = S.sun, i = U.i, near = U.rw * 2.2, pxNear = 1.7 * (U.px0 || U.rw * S.ss[i]), nb = new Set(U.nb.map((o) => o.j)); /* a clear ring round the body, in the sky and on the glass (the steep phone view brings a star from well off the body onto its limb): a name placed beside a star near the limb would sit on it */
    for (let k = 0; k < A.n; k++) {
      if (k === i) { const it = starItem(k); it.r = U.labR || U.rw; it.zoom = null; items.push(it); continue; } /* the disc as drawn: its label sits just outside it (drawSun keeps labR) */
      if (nb.has(k) || Math.hypot(R.cx[k] - R.cx[i], R.cy[k] - R.cy[i], R.cz[k] - R.cz[i]) < near || Math.hypot(S.sx[k] - S.sx[i], S.sy[k] - S.sy[i]) < pxNear) continue;
      items.push(starItem(k));
    }
    U.nb.forEach((o, q) => {
      const j = o.j, T = U.tags[q];
      items.push({ id: 'nb' + j + '_' + o.n, i: j, text: R.names[j] + ' · ' + fmt(o.n), x: T[0], y: T[1], z: T[2], space: '3d', r: T[3], pri: 3000 - q, kind: 'tag', go: () => focusArtistIdx(j, 'label') });
    });
  } else if (S.lay) {
    /* the room's own layout (layoutLabels): each name at the spot it chose, as a screen point whose up-right box is that
       spot; the locked star keeps its own anchor (its reticle sits on the star) */
    S.lay.forEach((e, i) => items.push({ id: 's' + i, i, text: R.names[i], x: e.ax || 0, y: e.ay || 0, space: 'screen', r: 0, pri: 1000 - i, kind: 'obj', zoom: null, go: () => focusArtistIdx(i, 'label') }));
    if (S.sel && S.sel.i >= 0 && S.sel.i < Math.min(A.n, R.nA) && !S.lay.has(S.sel.i)) items.push(starItem(S.sel.i));
  } else {
    for (let i = 0; i < Math.min(A.n, R.nA); i++) items.push(starItem(i));
  }
  if (a === 'day') { const it = counterItem(); if (it) items.push(it); }
  if (S.placeholder >= 0) { const i = S.placeholder; items.push({ id: 'ph', text: R.names[i], x: R.cx[i], y: R.cy[i], z: R.cz[i], space: '3d', r: 0.02, pri: 5000, kind: 'obj', go: () => focusArtistIdx(i, 'label') }); }
  ctx.labels.set('universe', items);
  S.labelHover = -1;
  S.labelIdx = new Map(); items.forEach((it) => { if ((it.kind === 'obj' || it.kind === 'tag') && it.i != null) S.labelIdx.set(it.i, { id: it.id, pri: it.pri }); });
}
function labelOf(i) { return S.labelIdx ? S.labelIdx.get(i) : null; }
/* how many stars carry a label at home: 16 on a phone-sized stage, 32 on a wide one */
function labCap() { const st = S.stage; return st && Math.min(st.w, innerWidth) < 600 ? LAB_PHONE : LAB_DESK; }
/* ... and now: the same density of names as at home, so a sky pulled back (the 90-second opener, grand's closing look)
   carries as many names as it has room for, never home's full set piled on a small disc (VERIFY_1 P1-5, R2_REQUESTS_C1 #3,
   R2_REQUESTS_INTEGRATION #5): home's count x (its on-screen size over home's)^2, at least LAB_MIN, never more than home's */
const LAB_MIN = 6;
function labCapNow() { const c = labCap(), v = S.ctx.view, zr = (HOME.dist * (S.fit || 1)) / Math.max(1e-3, (v && v.dist) || 1); return clamp(Math.round(c * Math.min(1, zr) * Math.min(1, zr)), LAB_MIN, c); }
/* a star's label. priority is strictly by plays (node order: id 0 is the most played), so the brightest names are placed
   first; the first labCap() stars are labelled at every zoom and the rest open in bands as the camera closes in (zoom is
   1/dist, relative to home's). r covers the star's two-sigma body, so the label sits off its bright core. `pri` given:
   the day view's order (that day's plays) */
function starItem(i, pri) {
  const R = S.R, cap = labCap(), z0 = 1 / (HOME.dist * (S.fit || 1));
  let zoom = null;
  if (pri == null) { const b = Math.floor(i / cap); if (b >= 1) { const L = LAB_BANDS[Math.min(LAB_BANDS.length - 1, b - 1)]; zoom = [L[1] * z0, 1e9]; } }
  return { id: 's' + i, i, text: R.names[i], x: R.cx[i], y: R.cy[i], z: R.cz[i], space: '3d', r: Math.max(0.012, R.sig[i] * 2.2), pri: pri == null ? 1000 - i : pri, kind: 'obj', zoom, go: () => focusArtistIdx(i, 'label') };
}
/* a pushed label's leader: a faint glyph trail from its star to the nearest point of its placed box */
function leaderTrails(o) {
  const P = S.lay; if (!P || !P.size) return o;
  const B = segBuf(o / 7 + P.size);
  for (const [i, e] of P) {
    if (!e.pushed || S.sd[i] <= 0.05 || e.ax == null) continue;
    /* to the box the layout gave it (not to wherever the labels drew it): a leader that came and went with the labels'
       own choice fed back into their next choice, and a still sky flickered */
    const r = { left: e.ax + 6, right: e.ax + 6 + (e.w || 0), top: e.ay - 6 - LAB_H, bottom: e.ay - 6 };
    const x = S.sx[i], y = S.sy[i], nx = clamp(x, r.left, r.right), ny = clamp(y, r.top, r.bottom), d = Math.hypot(nx - x, ny - y);
    if (d < 26) continue;
    /* it stops well short of the name (a cell and a half on the diagonal): its glyphs never sit in a cell under the name's
       own box, where the labels would count them against the name */
    const k = (d - 16) / d;
    o = pushSeg(B, o, x, y, x + (nx - x) * k, y + (ny - y) * k, 0.13, 0xd8d2ea, NaN);
  }
  return o;
}

/* ------------------------------------------------------------------ hud, ladder, the phone selection line */
function renderHud() {
  const ctx = S.ctx, c = C(); if (!S.R) return;
  /* two lines in the info panel's hud (the headline of the readout); the rest opens under "the full readout" */
  let head = [], rest = [];
  const split = (L) => { head = L.slice(0, 2); rest = L.slice(2); };
  if (S.sec && !S.sel) S.sec.classList.remove('uv-dated');
  if (S.sel) { const L = cardLines(S.sel); head = L.head; rest = L.rest; if (S.sec) S.sec.classList.toggle('uv-dated', !!L.dated); }
  else if (S.angle === 'threads' && S.chord) split(chordLines(S.chord[0], S.chord[1]));
  else if (S.angle === 'threads' && S.famHi >= 0 && (S.famHi === 0 || S.famHi === 6)) head = [c.callout];
  else if (S.angle === 'threads' && !S.B && !S.bFail) head = [c.loading];
  else if (S.angle === 'day') { const L = dayLines(); head = L.head; rest = L.rest; }
  else if (S.famHi >= 0 && (S.famHi === 0 || S.famHi === 6)) head = [c.callout];
  if (S.angle === 'day' && S.dayLine) { head.unshift(tpl(c.dayPair, { A: S.R.names[S.dayLine.a], B: S.R.names[S.dayLine.b], n: fmt(S.dayLine.n) })); if (head.length > 2) rest.unshift(head.pop()); }
  ctx.hud(head.length ? head.join('\n') : null);
  renderReadout(rest);
  const sel = S.dom.sel, si = S.sel ? S.sel.i : -1;
  sel.textContent = si >= 0 && si < S.R.nA ? S.R.names[si] + ' · ' + famName(S.R.fam[si]) + (S.R.plays ? ' · ' + fmt(S.R.plays[si]) + ' plays' : '') : '';
}
function renderReadout(rest) {
  const d = S.dom; if (!d) return;
  const txt = rest.join('\n');
  if (txt === d.rd.dataset.t) return;
  d.rd.dataset.t = txt; d.rd.textContent = '';
  rest.forEach((l) => d.rd.appendChild(el('p', '', l)));
  d.readout.hidden = !rest.length;
}
function dayLines() {
  const c = C(), D = S.D, R = S.R; if (!D) return { head: [c.loading], rest: [] };
  const k = S.dayK; if (k < 0) return { head: [], rest: [] };
  const d = ymd(D.date[k]), n = D.dn[k], head = [tpl(c.dayHead, { d, n: fmt(n), na: fmt(D.dna[k]) })], rest = [];
  if (S.playing) { head.unshift(c.rampUp); S.rampSaid = true; } /* R5 R2: the replay's sound waits for this line */
  const tops = [];
  let s = 0, cnt = 0;
  for (let j = D.topOff[k]; j < D.topOff[k + 1]; j += 2) { const i = D.top[j], kk = D.top[j + 1]; if (i < 0 || i >= R.nA) continue; tops.push(R.names[i] + ' (' + fmt(kk) + ')'); s += kk; cnt++; }
  if (cnt) { if (S.playing) rest.push(tpl(c.dayLit, { k: cnt, s: fmt(s), n: fmt(n) })); else head.push(tpl(c.dayLit, { k: cnt, s: fmt(s), n: fmt(n) })); }
  if (tops.length) rest.push(tpl(c.dayTop, { list: tops.join(' · ') }));
  const t0 = D.ta[k * 3], t1 = D.ta[k * 3 + 1], t2 = D.ta[k * 3 + 2];
  rest.push(tpl(c.dayTa, { T: fmt(t0 + t1 + t2), ta0: fmt(t0), ta1: fmt(t1), ta2: fmt(t2) }));
  if (S.daySub > 1) rest.push(tpl(c.daySub, { k: S.daySub }));
  rest.push(c.dayLogger, c.timeBasis);
  if (D.meta.caveat) rest.push(D.meta.caveat);
  return { head, rest };
}
function cardLines(sel) {
  const c = C(), R = S.R, A = S.A, i = sel.i, head = [], rest = [];
  if (!R || i < 0 || i >= R.nA || !R.names[i]) return { head, rest }; /* an artist not in this roster (folded into the withheld block, or Tier A only): no card, never an empty slot */
  if (R.kind === 'A') return cardLinesA(i);
  const caveat = S.D ? S.D.meta.caveat : caveatText();
  const hasM = R.first[i] && R.last[i];
  const nameL = tpl(c.nameLine, { name: R.names[i], family: famName(R.fam[i]) });
  const playsL = hasM ? tpl(c.card, { plays: fmt(R.plays[i]), first: R.first[i], last: R.last[i] }) : tpl(c.cardPlays, { plays: fmt(R.plays[i]) });
  if (sel.track) { head.push(sel.track.first ? tpl(c.track, { title: sel.track.title, artist: R.names[i], plays: fmt(sel.track.plays), first: sel.track.first }) : tpl(c.trackPlays, { title: sel.track.title, artist: R.names[i], plays: fmt(sel.track.plays) }), nameL); rest.push(caveat, playsL); }
  else { head.push(nameL, playsL); if (hasM) rest.push(caveat); }
  rest.push(tpl(c.cardArms, { tap: fmt(R.tap[i]), shuffle: fmt(R.shuffle[i]), served: fmt(R.served[i]), other: fmt(R.other[i]) }), c.cardLogger);
  const nd = R.node[i];
  if (nd >= 0 && A && A.nodes[nd]) nodeLines(nd, rest);
  if (sunFor() === i) { const L = partnersOf(i); if (L.length) rest.push(tpl(c.nbThreads, { list: L.map((o) => R.names[o.j] + ' (' + fmt(o.n) + ')').join(' · ') })); }
  const posL = R.placed[i] === 0 ? c.pos0 : R.placed[i] === 2 ? c.pos2 : c.pos1;
  if (R.placed[i] === 1 && !sel.track && head.length === 2) { head.splice(0, 2, head[0] + ' ' + head[1], posL); } /* TB_PRESENT 2d: never below a phone's fold */
  else rest.push(posL);
  return { head, rest, dated: !!(hasM || (sel.track && sel.track.first)) };
}
/* the Tier-A lines of a star's card (universe_nodes.json + universe_edges.json): months with plays, the strongest
   neighbours, the comet line. a value the file does not carry is a line left out, never a blank */
function nodeLines(nd, rest) {
  const c = C(), A = S.A, N = A && A.nodes[nd]; if (!N) return;
  if (N.months_active > 0) rest.push(tpl(c.months, { m: N.months_active }));
  if (A.nbQ[nd] >= 0 && A.nodes[A.nbQ[nd]]) rest.push(tpl(c.nbQueue, { x: A.nodes[A.nbQ[nd]].name }));
  if (A.nbT[nd] >= 0 && A.nodes[A.nbT[nd]]) rest.push(tpl(c.nbTap, { x: A.nodes[A.nbT[nd]].name }));
  if (N.comet) rest.push(c.comet);
}
/* the card with Tier A only: name and family, the smoothed tapped share of its jumps (tap_share) and months with plays;
   no play count, no per-arm count, no dates (the file carries none) */
function cardLinesA(i) {
  const c = C(), R = S.R, A = S.A, head = [tpl(c.nameLine, { name: R.names[i], family: famName(R.fam[i]) })], rest = [];
  const N = A && A.nodes[i], ts = N && typeof N.tap_share === 'number' ? N.tap_share : null;
  if (ts != null) head.push(tpl(c.tapShare, { p: Math.round(100 * ts) }));
  nodeLines(i, rest);
  rest.push(R.placed[i] === 0 ? c.pos0 : c.pos2);
  return { head, rest };
}
function caveatText() { return C().caveat; }
function chordLines(a, b) {
  const c = C(), B = S.B, arm = THREAD_ARMS.find((m) => m.id === S.armT) || THREAD_ARMS[0]; if (!B) return [c.loading];
  const tot = B.armTot[arm.k] || 1, nab = B.pairs[(a * 14 + b) * 3 + arm.k], nba = B.pairs[(b * 14 + a) * 3 + arm.k];
  const pct = (n) => (Math.round((1000 * n) / tot) / 10).toFixed(1);
  return [
    tpl(c.k5, { a: famName(a), b: famName(b), arm: arm.name, n: fmt(nab), pct: pct(nab) }),
    tpl(c.k5, { a: famName(b), b: famName(a), arm: arm.name, n: fmt(nba), pct: pct(nba) }),
    tpl(c.k5window, { from: B.from || '', to: B.to || '' }),
  ];
}
function ladder() {
  const ctx = S.ctx, c = C(); let text = c.ladSky, lv = 'sevenyears';
  if (S.sel && S.R && S.sel.i >= 0) { text = tpl(c.ladStar, { name: S.R.names[S.sel.i] }); lv = 'artist'; }
  else if (S.angle === 'day' && S.D && S.dayK >= 0) { text = tpl(c.ladDay, { d: ymd(S.D.date[S.dayK]) }); lv = 'day'; }
  else if (S.angle === 'threads') { text = S.famHi >= 0 ? tpl(c.ladGenre, { f: famName(S.famHi) }) : S.chord ? tpl(c.ladGenre, { f: famName(S.chord[0]) + ' × ' + famName(S.chord[1]) }) : c.ladGenreAll; lv = 'genre'; }
  try { ctx.ladder.readout(text); ctx.ladder.level(lv); } catch (e) {}
}

/* ------------------------------------------------------------------ the day cursor */
function dayIndex(d) {
  const D = S.D; if (!D) return -1;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '').trim()); if (!m) return -1;
  const v = +(m[1] + m[2] + m[3]); let lo = 0, hi = D.n - 1;
  while (lo <= hi) { const mid = (lo + hi) >> 1, x = D.date[mid]; if (x === v) return mid; if (x < v) lo = mid + 1; else hi = mid - 1; }
  return -1;
}
function setDayK(k, via) {
  const D = S.D; if (!D) return;
  k = clamp(k | 0, 0, D.n - 1); S.dayK = k; S.dayLine = null;
  if (S.dom && S.dom.date) { noRec(false); S.dom.date.classList.remove('bad'); if (document.activeElement !== S.dom.date) S.dom.date.value = ymd(D.date[k]); }
  if (!S.active) return;
  if (S.angle !== 'day') { try { S.ctx.angle.set('day', { via: via || 'api' }); } catch (e) {} return; }
  weights(); setLabels(); renderDay(); renderHud(); ladder(); fireTime();
  if (via === 'play' && S.playing && S.rampSaid && VX) VX.dayChord(k);
  frameDay({ step: via === 'play' || via === 'range' });
}
/* the camera goes to the day: it frames the lit stars that carry most of the day's lit plays (at least 85% of them, by
   distance from their play-weighted centre), so one outlying star with a single play cannot pull the view back out to the
   whole sky; every lit star stays lit and labelled wherever it is. the lit plays of dust artists are scattered on the shell
   and are not framed; a day with no lit star goes home. a visitor's own camera (free camera) or a selected star is left
   alone while stepping. */
function frameDay(o = {}) {
  const ctx = S.ctx, R = S.R, D = S.D, k = S.dayK;
  if (!S.active || S.angle !== 'day' || !R || !D || k < 0 || S.sel) return;
  if (!o.enter && ctx.view.manual) return;
  const red = ctx.reduced || o.instant, fo = o.step ? { short: true, whoosh: false, instant: red } : { instant: red };
  const F = dayFrame(k);
  if (!F || !F.target) { fly(fitted(HOME), fo); return; }
  fly({ target: F.target, dist: F.dist }, fo);
}
/* the renderer's cell (css px) for the cluster sizes; the detail setting's default when the renderer cannot say */
function cellPx() { let c = 0; try { c = +S.ctx.atlas.GF.info().cellCss; } catch (e) {} return c > 0 ? c : S.ctx.lowPower ? 7 : 6; }
/* a day's frame and cluster sizes, shared by the camera (frameDay) and the dots (dayPlace), cached per day and stage.
   frame: the lit stars carrying at least 85% of the day's lit plays (by distance from their play-weighted centre), so one
   outlying star with a single play cannot pull the view back out to the whole sky. size: a lit star's m dots spread in a
   3D gaussian whose sigma is DAY_C cells x sqrt(m) on screen at that frame (world sigma = px x dist / (0.42 x the stage's
   short side)); the frame leaves room for the largest core cluster (r = r0 + 2.2 sigma, solved for the dist it sets) */
function dayFrame(k) {
  const R = S.R, D = S.D; if (!R || !D || k < 0) return null;
  const st = S.stage || { w: innerWidth, h: innerHeight }, cell = cellPx(), fit = 1, pd = perDot(); /* the frame is sized against the stage itself */
  const key = k + ':' + Math.round(st.w) + 'x' + Math.round(st.h) + ':' + cell + ':' + fit + ':' + pd;
  if (S.dayF && S.dayF.key === key) return S.dayF;
  const L = [];
  for (let j = D.topOff[k]; j < D.topOff[k + 1]; j += 2) {
    const i = D.top[j]; if (i < 0 || i >= S.ns || R.placed[i] === 1) continue;
    const len = R.bs[i + 1] - R.bs[i], m = Math.min(len, Math.max(1, Math.round(D.top[j + 1] / pd)));
    L.push({ i, n: D.top[j + 1], m, d: 0, sig: 0, bsig: 0 });
  }
  const out = { key, k, lit: L, target: null, dist: 0 };
  S.dayF = out;
  if (!L.length) return out;
  const centre = (list) => { let w = 0, x = 0, y = 0, z = 0; list.forEach((e) => { x += R.cx[e.i] * e.n; y += R.cy[e.i] * e.n; z += R.cz[e.i] * e.n; w += e.n; }); return [x / w, y / w, z / w]; };
  const near = (c) => { const Ls = L.slice(); Ls.forEach((e) => { e.d = Math.hypot(R.cx[e.i] - c[0], R.cy[e.i] - c[1], R.cz[e.i] - c[2]); }); Ls.sort((p, q) => p.d - q.d); let tot = 0, acc = 0, m = 0; Ls.forEach((e) => { tot += e.n; }); while (m < Ls.length && acc < 0.85 * tot) acc += Ls[m++].n; return Ls.slice(0, Math.max(1, m)); };
  let c = centre(L), core = near(c); c = centre(core); core = near(c);
  const Rpx = 0.42 * Math.min(st.w, st.h);
  let r0 = 0, spx = 0; core.forEach((e) => { r0 = Math.max(r0, e.d); spx = Math.max(spx, DAY_C * cell * Math.sqrt(e.m)); });
  /* on screen a world radius r at the target spans r x Rpx / dist: dist = 1.05 r puts the frame at about 0.8 of the short side */
  const r = r0 / Math.max(0.3, 1 - 2.2 * 1.05 * fit * spx / Rpx);
  const dist = clamp(1.05 * r, 0.16, 1) * fit;
  /* bsig: the bloom's size, by the day's plays rather than dots, so it is the same on a phone (one dot per four plays) */
  L.forEach((e) => { e.sig = (DAY_C * cell * Math.sqrt(e.m) * dist) / Rpx; e.bsig = (DAY_C * cell * Math.sqrt(e.n) * dist) / Rpx; });
  out.target = c; out.dist = dist;
  return out;
}
/* move the day's lit plays into their clusters (S.dayXYZ: the sky's positions with this day's lit dots moved; the last
   day's lit dots go back first). a lit star's dots keep their own directions (the worker's hash) at the radii of a 3D
   gaussian of the day's sigma, innermost first; a lit dust artist's dots stay where they are on the shell */
function dayPlace(k) {
  const R = S.R; if (!R) return;
  const n3 = R.N * 3;
  if (!S.dayXYZ || S.dayXYZ.length !== n3) { S.dayXYZ = R.sky.slice(); S.dayMoved = []; }
  const X = S.dayXYZ, sky = R.sky, mv = S.dayMoved;
  for (let q = 0; q < mv.length; q++) { const o = mv[q] * 3; X[o] = sky[o]; X[o + 1] = sky[o + 1]; X[o + 2] = sky[o + 2]; }
  mv.length = 0;
  const F = dayFrame(k); if (!F) return;
  F.lit.forEach((e) => {
    const a0 = R.bs[e.i], m = e.m, cx = R.cx[e.i], cy = R.cy[e.i], cz = R.cz[e.i];
    for (let q = 0; q < m; q++) {
      const d = a0 + q, o = d * 3, uz = 2 * hash(d * 3 + 1) - 1, ph = 6.283185307 * hash(d * 3 + 2), rr = Math.sqrt(Math.max(0, 1 - uz * uz)), r = e.sig * chi3((q + 0.5) / m);
      X[o] = cx + rr * Math.cos(ph) * r; X[o + 1] = cy + rr * Math.sin(ph) * r; X[o + 2] = cz + uz * r; mv.push(d);
    }
  });
  S.projDirty = true;
}
function stepDay(dir, via) { if (!S.D) return; const n = S.D.n; let k = S.dayK < 0 ? (S.D.median >= 0 ? S.D.median : 0) : S.dayK + dir; if (via === 'play') k = (k + n) % n; setDayK(clamp(k, 0, n - 1), via); }
function startPlay() { if (S.ctx.reduced || !S.D || !S.active) return; if (S.angle !== 'day') { try { S.ctx.angle.set('day', { via: 'tap' }); } catch (e) {} } S.playing = true; S.lastStep = now(); renderPlay(); fireTime(); if (S.angle === 'day') renderHud(); vx(); }
function stopPlay() { if (!S.playing) return; S.playing = false; renderPlay(); fireTime(); if (S.active && S.angle === 'day') renderHud(); }
/* the glyph and the word apart, so the phone bar can show the glyph alone (the word stays in the accessible name) */
function renderPlay() {
  const b = S.dom && S.dom.play; if (!b) return;
  const t = S.playing ? C().pause : C().play, k = t.indexOf(' ');
  b.textContent = ''; b.append(el('span', 'uv-pg', k > 0 ? t.slice(0, k) : t)); if (k > 0) b.append(el('span', 'uv-pw', t.slice(k)));
  b.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
}
function renderDay() {
  const D = S.D, d = S.dom, k = S.dayK; if (!D || k < 0 || !d) return;
  const date = ymd(D.date[k]);
  /* a typed date without a record keeps its neutral line and its text until the cursor moves (setDayK) or the field is
     edited: a relayout re-renders the day (the phone card grows by that very line) and must not clear them */
  if (d.date) {
    if (document.activeElement !== d.date && !d.date.classList.contains('bad')) d.date.value = date;
    d.range.value = String(k); d.range.setAttribute('aria-valuetext', date);
    d.prev.disabled = k <= 0; d.next.disabled = k >= D.n - 1;
    d.dayn.textContent = fmt(D.dn[k]) + ' plays';
  }
  /* the day's back-to-back pairs, pooled over the arms per directed pair (GATE_tierb K-B3) */
  const pairs = new Map();
  for (let j = D.trOff[k]; j < D.trOff[k + 1]; j += 4) { const a = D.tr[j], b = D.tr[j + 1], n = D.tr[j + 3]; if (a === b) continue; const key = a * 4096 + b; pairs.set(key, (pairs.get(key) || 0) + n); }
  let L = [...pairs.entries()].map(([key, n]) => ({ a: Math.floor(key / 4096), b: key % 4096, n }));
  const cap = S.ctx.lowPower ? 150 : 400; S.daySub = 1;
  if (L.length > cap) { const kk = Math.ceil(L.length / cap); S.daySub = kk; L = L.filter((_, q) => q % kk === 0); } /* deterministic 1-in-k, file order */
  S.dayPairs = L;
  counterLabel();
}
/* the counter label rides the day cursor: above the dock's top edge, over the slider's thumb (a layout read on a day
   change only, never per frame). on phones the dock sits in the wall card and prints the count itself */
function counterItem() {
  const D = S.D, d = S.dom;
  if (S.angle !== 'day' || !D || S.dayK < 0 || S.dockIn || !d || !d.day || d.day.hidden) return null;
  const r = d.range.getBoundingClientRect(); if (!(r.width > 0)) return null;
  const frac = D.n > 1 ? S.dayK / (D.n - 1) : 0, x = r.left + 7 + frac * (r.width - 14) - 8, y = dockTop() - 1;
  return { id: 'counter', text: ymd(D.date[S.dayK]) + ' · ' + fmt(D.dn[S.dayK]) + ' plays', x, y, space: 'screen', r: 0, pri: 9000, kind: 'counter' };
}
function counterLabel() { const it = counterItem(); try { if (it) S.ctx.labels.update('universe', 'counter', it); } catch (e) {} }
/* the dock's tallest extent (the day view), measured once per enter; labels keep out of all of it (§1.7 keepouts) */
/* the dock starts at the stage's left edge and stops short of the ladder's readout at the bottom right */
/* the float dock is one row in the band under the stage, below the ladder's foot: as wide as the stage may give it */
function dockW() { return Math.max(260, Math.min(760, lineW())); }
/* the float dock's placard line: from the stage's left edge to its right one, short of the ladder's margin */
function lineW() { const s = S.stage; let r = 0; try { r = (S.ctx.atlas.insets || {}).right || 0; } catch (e) {} return Math.round(Math.max(240, Math.min(s.w, innerWidth - r - 16 - s.x))); }
/* the band the float dock keeps (labels, the hint line and toasts step round it): its row and the line over it */
function dockKeepW() { return Math.min(innerWidth - S.stage.x, Math.max(dockW(), S.dockMaxW || 0)); }
/* the gap under the dock: its chip row starts DOCK_TOP px under the stage, with room kept under it for the placard line
   (whether or not this view has one, so the row never moves with a view) and LINE_FOOT px under that. the first-visit
   hint line and the toasts step up over the dock's band themselves (chrome.js place(): a room's keepouts), so the dock
   stays put while they come and go */
function dockBottomGap() {
  const s = S.stage, row = (S.dom && S.dom.top && S.dom.top.offsetHeight) || 30;
  return Math.max(LINE_FOOT + (S.dockLineH || LINE_H) + LINE_GAP, innerHeight - (s.y + s.h) - DOCK_TOP - row);
}
function dockBottom() { return innerHeight - (S.dockGap != null ? S.dockGap : dockBottomGap()); }
/* the top of the dock's tallest box (the day view grows it upwards) */
function dockTop() { return dockBottom() - (S.dockBoxH || S.dockMaxH || 150); }
/* the float dock's whole band, its tallest box and the placard line under it: labels, the hint line and toasts keep out */
function dockBand(noLine) { const t = dockTop(), b = dockBottom() + (S.dockLineH && !noLine ? LINE_GAP + S.dockLineH : 0); return { x: S.stage.x, y: t, w: dockKeepW(), h: b - t }; }

/* ------------------------------------------------------------------ threads */
function buildChords() {
  const B = S.B; S.chordsL = []; if (!B) return;
  const arm = (THREAD_ARMS.find((m) => m.id === S.armT) || THREAD_ARMS[0]).k, tot = B.armTot[arm] || 1;
  for (let a = 0; a < 14; a++) for (let b = a + 1; b < 14; b++) {
    const n = B.pairs[(a * 14 + b) * 3 + arm] + B.pairs[(b * 14 + a) * 3 + arm];
    if (n > 0) S.chordsL.push({ a, b, n, w: n / tot, pts: new Float32Array(50), fog: a === 13 || b === 13 });
  }
  let mx = 0; S.chordsL.forEach((ch) => { mx = Math.max(mx, ch.w); }); S.chordMax = mx || 1;
  if (S.dom) fillThreadList();
}
function chordCtrl(a, b) {
  const A = clusterPos(a), Bp = clusterPos(b), mx = (A[0] + Bp[0]) / 2, mz = (A[2] + Bp[2]) / 2, len = Math.hypot(A[0] - Bp[0], A[2] - Bp[2]);
  return [A, [mx * 0.22, 0.14 + 0.36 * len, mz * 0.22], Bp];
}
function selectChord(a, b) { S.chord = [Math.min(a, b), Math.max(a, b)]; }

/* ------------------------------------------------------------------ focus */
function artistIdx(name) {
  const s = String(name || '').toLowerCase().trim(); if (!s) return -1;
  if (S.R) { const i = S.R.nameIdx.get(s); return i == null ? -1 : i; }
  if (S.A) { const i = S.A.byName.get(s); return i == null ? -1 : i; }
  return -1;
}
function focusArtistIdx(i, via, track) {
  const ctx = S.ctx, R = S.R; if (!R || i < 0 || i >= R.nA) return false;
  wantRoster();
  if (S.angle === 'threads' && S.active) { S.focusing = true; try { ctx.angle.set('star', { via }); } catch (e) {} S.focusing = false; }
  S.sel = { i, track: track || null }; S.chord = null; S.selAt = now();
  const isStar = R.placed[i] !== 1; S.placeholder = isStar ? -1 : i;
  const name = R.names[i], sg = R.sig[i];
  const dist = (isStar ? clamp(0.26 + sg * 6, 0.3, 0.6) : 0.45) * (S.fit || 1);
  S.selDist = dist; /* the arrival framing the sun is sized at */
  const from = ctx.view.target.slice(), to = starPos(i);
  fly({ target: to, dist }, { lock: name });
  try { ctx.lock(name); } catch (e) {}
  S.trip = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) > 0.35 ? { to: i, from, t0: now(), said: false } : null;
  setLabels(); renderHud(); ladder();
  return true;
}
function focusFamily(f, via) {
  const ctx = S.ctx; if (f < 0) return false;
  S.famHi = f; S.chord = null; S.sel = null; S.placeholder = -1;
  renderLegend(); weights(); renderHud(); ladder();
  if (S.angle === 'threads') { const cpos = clusterPos(f), sg = S.R ? S.R.clusters[f * 4 + 3] : 0.05; fly({ target: cpos, dist: clamp(0.32 + sg * 3, 0.36, 0.8) * (S.fit || 1) }, { lock: famName(f) }); try { ctx.lock(famName(f)); } catch (e) {} }
  return true;
}
function focusPair(a, b, via) {
  const ctx = S.ctx; if (a < 0 || b < 0 || a === b) return false;
  selectChord(a, b); S.famHi = -1; S.sel = null; renderLegend(); weights();
  const [p0, p1, p2] = chordCtrl(S.chord[0], S.chord[1]), apex = [0.25 * p0[0] + 0.5 * p1[0] + 0.25 * p2[0], 0.25 * p0[1] + 0.5 * p1[1] + 0.25 * p2[1], 0.25 * p0[2] + 0.5 * p1[2] + 0.25 * p2[2]];
  const label = famName(S.chord[0]) + ' × ' + famName(S.chord[1]);
  fly({ target: apex, dist: 0.9 * (S.fit || 1) }, { lock: label }); try { ctx.lock(label); } catch (e) {}
  renderHud(); ladder();
  return true;
}
function famChip(f) {
  const on = S.famHi === f;
  if (S.angle === 'day') { try { S.ctx.angle.set('sky', { via: 'tap' }); } catch (e) {} }
  S.famHi = on ? -1 : f; S.chord = null;
  renderLegend(); weights(); renderHud(); ladder();
}
function renderLegend() {
  const d = S.dom; if (!d) return;
  [...d.legend.children].forEach((b) => b.setAttribute('aria-pressed', +b.dataset.f === S.famHi ? 'true' : 'false'));
  d.famact.hidden = S.famHi < 0 || S.angle === 'threads';
}
/* pending focus: a search or deep link can land before the room's files arrive; it is applied when they do */
function flushPending() {
  if (!S.active) { S.pending.length = 0; return; }
  const L = S.pending.splice(0); L.forEach((f) => { try { doFocus(f); } catch (e) { console.warn('universe focus', e); } });
}
function doFocus(desc) {
  const ctx = S.ctx; if (!desc || typeof desc !== 'object') return false;
  if (desc.year != null || desc.month != null) return false; /* no year or month view exists here (GS K1, TIER_B §5.1) */
  let ok = false;
  if (desc.level) { const m = { sevenyears: 'sky', 'seven years': 'sky', day: 'day', artist: 'star', genre: 'threads' }[String(desc.level).toLowerCase()]; if (m && (m !== 'day' || hasDayAngle())) { ctx.angle.set(m, { via: 'focus' }); ok = true; } }
  if (desc.arm) { setArm(String(desc.arm), 'focus'); ok = true; }
  if (desc.day) {
    if (S.dayIdx === false) ok = false; /* no day records ship: a day link lands on the sky */
    else if (!S.D) { S.pending.push({ day: desc.day }); need('days').catch(() => { daysGone(); }); ok = /^\d{4}-\d{2}-\d{2}$/.test(String(desc.day)); }
    else { const k = dayIndex(desc.day); if (k >= 0) { if (S.angle !== 'day') ctx.angle.set('day', { via: 'focus' }); setDayK(k, 'focus'); ok = true; } else { renderNoRecord(desc.day); } }
  }
  if (desc.family != null && !desc.pair) {
    const f = famIndex(desc.family);
    if (f >= 0) { if (S.angle !== 'threads') ctx.angle.set('threads', { via: 'focus' }); focusFamily(f, 'focus'); ok = true; }
  }
  if (desc.pair && desc.pair.length === 2) {
    const a = famIndex(desc.pair[0]), b = famIndex(desc.pair[1]);
    if (a >= 0 && b >= 0 && a !== b) { if (S.angle !== 'threads') ctx.angle.set('threads', { via: 'focus' }); focusPair(a, b, 'focus'); ok = true; }
  }
  if (desc.artist) {
    if (!S.R) { S.pending.push({ artist: desc.artist, track: desc.track }); ok = S.A ? S.A.byName.has(String(desc.artist).toLowerCase()) || true : true; }
    else {
      const i = artistIdx(desc.artist);
      /* not one of the 388 stars and the full roster not in hand yet: wait for it (it flushes the pending focus) */
      if (i < 0 && S.R.kind === 'A' && !S.rosterFail) { S.pending.push({ artist: desc.artist, track: desc.track }); wantRoster(); ok = true; }
      if (i >= 0) {
        if (desc.track) { need('tracks').then(() => { const t = trackOf(i, desc.track); if (S.sel && S.sel.i === i) { S.sel.track = t; renderHud(); } }).catch(() => {}); }
        focusArtistIdx(i, 'focus', null); ok = true;
      }
    }
  }
  return ok;
}
function trackOf(i, title) {
  const T = S.T; if (!T) return null; const t = String(title).toLowerCase();
  for (let k = 0; k < T.title.length; k++) if (T.artist[k] === i && String(T.title[k]).toLowerCase() === t) return { title: T.title[k], plays: T.plays[k], first: T.first[k] };
  return null;
}
/* the no-record line: shown on the day view until the cursor moves or the field is edited (a relayout never clears it) */
function noRec(on) { S.norecOn = !!on; if (S.dom && S.dom.norec) S.dom.norec.hidden = !(S.norecOn && S.angle === 'day'); }
function renderNoRecord(d) { const dm = S.dom; if (!dm || !dm.date) return; noRec(true); dm.date.value = String(d); dm.date.classList.add('bad'); try { S.ctx.say(C().noRecord); } catch (e) {} }

/* ------------------------------------------------------------------ picking (the field's tap and hover) */
function pickStar(sx, sy, rad) {
  if (!S.R || !S.A || S.angle === 'threads' || S.morph) return -1;
  let best = -1, bd = 1e9;
  const day = S.angle === 'day' && S.D && S.dayK >= 0 ? litSet() : null;
  for (let i = 0; i < S.ns; i++) {
    if (S.sd[i] <= 0.05) continue;
    const dx = S.sx[i] - sx, dy = S.sy[i] - sy, r = Math.max(rad, 0.8 * S.R.sig[i] * 2 * S.ss[i]);
    if (dx * dx + dy * dy > r * r) continue;
    /* the star under the finger wins (screen distance), the nearer one in depth breaks a near-tie; on a day view a lit star
       beats an unlit one close by */
    let d = Math.sqrt(dx * dx + dy * dy) + S.sd[i] * 1.5; if (day && day.has(i)) d *= 0.5;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function litSet() { const D = S.D, k = S.dayK, s = new Set(); for (let j = D.topOff[k]; j < D.topOff[k + 1]; j += 2) s.add(D.top[j]); return s; }
function pickLine(sx, sy) {
  const hitPoly = (pts, n, tol) => { for (let q = 0; q + 3 < n * 2; q += 2) { const ax = pts[q], ay = pts[q + 1], bx = pts[q + 2], by = pts[q + 3]; if (ax < -1e4 || bx < -1e4) continue; const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, u = clamp(((sx - ax) * vx + (sy - ay) * vy) / L2, 0, 1), dx = ax + u * vx - sx, dy = ay + u * vy - sy; if (dx * dx + dy * dy < tol * tol) return true; } return false; };
  if (S.angle === 'threads') { for (let k = S.chordsL.length - 1; k >= 0; k--) { const ch = S.chordsL[k]; if (ch.ok && hitPoly(ch.pts, 25, Math.max(8, ch.lw / 2 + 4))) return { kind: 'chord', a: ch.a, b: ch.b }; } return null; }
  if (S.angle === 'day') { for (let k = S.dayPairs.length - 1; k >= 0; k--) { const L = S.dayPairs[k]; if (L.pts && hitPoly(L.pts, 17, Math.max(7, L.lw / 2 + 4))) return { kind: 'day', a: L.a, b: L.b, n: L.n }; } }
  return null;
}
function pickCluster(sx, sy) {
  if (S.angle !== 'threads' || !S.R) return -1;
  let best = -1, bd = 1e9;
  for (let f = 0; f < 14; f++) { const c = clusterPos(f), p = pt3(c[0], c[1], c[2]); if (p[3] <= 0.05) continue; const r = Math.max(18, S.R.clusters[f * 4 + 3] * 1.6 * p[2]), d = Math.hypot(p[0] - sx, p[1] - sy); if (d < r && d < bd) { bd = d; best = f; } }
  return best;
}
function onTap(p) {
  if (!S.R) return false;
  const touch = p.type === 'touch', i = pickStar(p.sx, p.sy, touch ? 26 : 16);
  if (i >= 0) { focusArtistIdx(i, 'tap'); return true; }
  const ln = pickLine(p.sx, p.sy);
  if (ln && ln.kind === 'chord') { focusPair(ln.a, ln.b, 'tap'); return true; }
  if (ln && ln.kind === 'day') { S.dayLine = { a: ln.a, b: ln.b, n: ln.n }; S.sel = null; renderHud(); return true; }
  const f = pickCluster(p.sx, p.sy); if (f >= 0) { focusFamily(f, 'tap'); return true; }
  if (S.sel || S.dayLine || S.chord) { S.sel = null; S.dayLine = null; S.chord = null; S.placeholder = -1; try { S.ctx.lock(null); } catch (e) {} setLabels(); renderHud(); ladder(); }
  return false;
}
function onHover(p) {
  if (S.angle === 'threads') {
    S.hoverLine = pickLine(p.sx, p.sy); const f = S.hoverLine ? -1 : pickCluster(p.sx, p.sy);
    if (f !== S.hoverCluster) { S.hoverCluster = f; try { if (f >= 0) { const c = clusterPos(f), q = pt3(c[0], c[1], c[2]); S.ctx.audio.tick('uf:' + f, { fam: famName(f), x: q[0], y: q[1] }); } else S.ctx.audio.tick(null); } catch (e) {} }
    if (S.hover >= 0) unhover();
    return;
  }
  S.hoverCluster = -1;
  const i = pickStar(p.sx, p.sy, 14);
  if (i !== S.hover) { if (i >= 0) hoverStar(i, 'mouse'); else unhover(); }
  S.hoverLine = i < 0 ? pickLine(p.sx, p.sy) : null;
}
function setHover(i) {
  if (i === S.hover) return;
  const was = S.hover; S.hover = i;
  try { if (was >= 0) { const L = labelOf(was); if (L) S.ctx.labels.update('universe', L.id, { pri: L.pri }); } if (i >= 0) { const L = labelOf(i); if (L) S.ctx.labels.update('universe', L.id, { pri: 5000 }); } } catch (e) {}
}

/* ------------------------------------------------------------------ R5 R2: the sky sings (L1 instrument + L2 dwell) */
/* a star answers a hover (or a touch press) with one tick: pitch = its genre family in the bed's key floor, octave = its
   plays (more plays lower); resting on it plays the artist through post.js after the visitor's one consent. the corona
   (its linked neighbours lit in ice and rung as a soft chord), the kiosk strum and the day replay's chords live in the lazy
   universe.voice.js. nothing maps tap_share to sound (R5_PLAN §5 cut) */
let VX = null, vxP = null;
const COARSE = typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
/* plays for the octave: the full roster's own count; roster A carries none, so plays order stands in (node id = plays order;
   universe_artists_all.json: one star has >= 3000 plays, 31 more have 300-2999, every other Tier-A star 50-299) */
const OCT_A = [1, 32];
function playsOf(i) { const R = S.R; if (!R || i < 0) return null; if (R.plays) return R.plays[i]; return i < OCT_A[0] ? 3000 : i < OCT_A[1] ? 300 : 100; }
function voiceOf(i) { const R = S.R; return { fam: famName(R.fam[i]), plays: playsOf(i), artist: R.names[i] }; }
function vx() {
  if (!vxP) vxP = import('./universe.voice.js' + V).then((m) => {
    VX = m.install({ S, famName, playsOf, hoverStar, unhover });
    const i = S.hover >= 0 ? S.hover : S.labHov; if (S.active && i >= 0) VX.corona(i);
    return VX;
  }).catch((e) => { vxP = null; console.warn('universe voice', e); return null; });
  return vxP;
}
function hoverStar(i, via, x, y) {
  const R = S.R, ctx = S.ctx; if (!R || i < 0 || i >= R.nA) return;
  setHover(i);
  const sx = x != null ? x : S.sx[i], sy = y != null ? y : S.sy[i], v = voiceOf(i);
  try { ctx.audio.tick('u:' + v.artist, { fam: v.fam, plays: v.plays, x: sx, y: sy, force: via === 'touch' || via === 'demo' }); } catch (e) {}
  if (via === 'demo') return;
  try { ctx.post.dwell(v.artist, Object.assign(dwellAt(sx, sy), { touch: via === 'touch' })); } catch (e) {}
  if (VX) VX.corona(i); else vx();
}
/* the dwell pill (~306x56) opens on the star's other side where it would sit over the ladder's hover ground (R2b) */
const PILL_W = 320, PILL_H = 64;
function ladderGround() {
  const k = innerWidth + 'x' + innerHeight; if (S.groundK === k) return S.ground;
  S.groundK = k; S.ground = null;
  try {
    const lad = document.querySelector('.atlas-ladder'); if (!lad) return null;
    const r = lad.getBoundingClientRect(), cs = getComputedStyle(lad, '::before'), px = (v) => parseFloat(v) || 0;
    /* drawn and on the glass only (the phone's ladder is an off-screen drawer) */
    if (r.width > 0 && r.left < innerWidth - 1 && cs.display !== 'none' && cs.content !== 'none' && cs.content !== 'normal') S.ground = { l: r.left + Math.min(0, px(cs.left)), t: r.top + Math.min(0, px(cs.top)), b: r.bottom - Math.min(0, px(cs.bottom)) };
  } catch (e) {}
  return S.ground;
}
function dwellAt(sx, sy) {
  let x = sx + 14; const y = sy + 14, G = ladderGround();
  if (G && x + PILL_W > G.l && y < G.b && y + PILL_H > G.t) {
    const s0 = S.stage ? S.stage.x : 8, fx = sx - 14 - PILL_W;
    x = fx >= s0 || s0 + PILL_W > G.l ? Math.max(8, fx) : s0;
  }
  return { x, y };
}
function unhover() {
  setHover(-1);
  try { S.ctx.audio.tick(null); S.ctx.post.undwell(); } catch (e) {}
  if (VX && S.labHov < 0) VX.off();
}
/* a star's label answers through the labels' own default (tick, light, dwell: hoverVoice below); the room adds the corona */
function onLabelHover(on, it) {
  const i = it && it.i != null && S.R && it.i < S.R.nA ? it.i : -1;
  if (on && i >= 0) { S.labHov = i; if (VX) VX.corona(i); else vx(); }
  else if (!on) { S.labHov = -1; if (VX && S.hover < 0) VX.off(); }
}

/* ------------------------------------------------------------------ per frame: project every dot, then the overlay */
/* the camera's 3D projection. every projection in this room goes through here: when the camera module is missing (a failed
   load leaves the shell's inert stand-in, which has no proj3) the sky is drawn from the fixed home pose instead of throwing */
const Q0 = { cx0: 0, cy0: 0, R: 1, F: 2.2, D: 2.2, cyaw: 1, syaw: 0, cp: 1, sp: 0, tx: 0, ty: 0, tz: 0, fixed: true };
function q3() {
  const v = S.ctx && S.ctx.view;
  if (v && typeof v.proj3 === 'function' && v.mode === 'orbit3d') return v.proj3();
  const s = S.stage || { x: 0, y: 0, w: innerWidth, h: innerHeight }, R = 0.42 * Math.min(s.w, s.h), h = S.angle === 'threads' ? HOME_T : HOME;
  Q0.cx0 = s.x + s.w / 2; Q0.cy0 = s.y + s.h / 2; Q0.R = R; Q0.F = 2.2 * R; Q0.D = 2.2 * h.dist * (S.fit || 1);
  Q0.cyaw = Math.cos(h.yaw); Q0.syaw = Math.sin(h.yaw); Q0.cp = Math.cos(h.pitch); Q0.sp = Math.sin(h.pitch); Q0.tx = Q0.ty = Q0.tz = 0;
  return Q0;
}
/* one point: [screen x, screen y, scale, depth] (the camera's project(), through q3) */
function pt3(x, y, z) {
  const q = q3(), px = x - q.tx, py = y - q.ty, pz = z - q.tz, xr = q.cyaw * px - q.syaw * pz, zr = q.syaw * px + q.cyaw * pz, yr = q.cp * py - q.sp * zr, dep = q.sp * py + q.cp * zr + q.D, s = q.F / dep;
  return [q.cx0 + xr * s, q.cy0 - yr * s, s, dep];
}
function project(t) {
  const ctx = S.ctx, R = S.R, Pp = P(); if (!R) return;
  const q = q3(), M = S.morph;
  const sig = q.cx0 + ',' + q.cy0 + ',' + q.F + ',' + q.D + ',' + q.cyaw + ',' + q.syaw + ',' + q.cp + ',' + q.sp + ',' + q.tx + ',' + q.ty + ',' + q.tz;
  /* the star centres every frame (picking, labels, overlay lines); every dot only when the camera or the morph moved */
  S.k = clamp(q.F / 2.2 / 306, 0.4, 1.4); /* line widths follow the sky's size on screen (1 at a 1440x900 desk) */
  const cx0 = q.cx0, cy0 = q.cy0, F = q.F, D = q.D, cyw = q.cyaw, syw = q.syaw, cp = q.cp, sp = q.sp, ttx = q.tx, tty = q.ty, ttz = q.tz;
  const SX = S.sx, SY = S.sy, SDp = S.sd, SS = S.ss, RX = R.cx, RY = R.cy, RZ = R.cz, PL = R.placed;
  let d0 = 1e9, d1 = -1e9; /* the depth range of the linked stars' centres: the sky's depth-cue anchors */
  for (let i = 0; i < S.ns; i++) {
    const px = RX[i] - ttx, py = RY[i] - tty, pz = RZ[i] - ttz, xr = cyw * px - syw * pz, zr = syw * px + cyw * pz, yr = cp * py - sp * zr, z2 = sp * py + cp * zr, dep = z2 + D;
    SDp[i] = dep; if (dep <= 0.05) { SX[i] = SY[i] = -1e5; SS[i] = 0; continue; } const s = F / dep; SX[i] = cx0 + xr * s; SY[i] = cy0 - yr * s; SS[i] = s;
    if (PL[i] === 0) { if (dep < d0) d0 = dep; if (dep > d1) d1 = dep; }
  }
  if (!M && !S.projDirty && sig === S.projSig) return false;
  S.projSig = sig; S.projDirty = false; S.rmSeed = true;
  const n = Pp.n, TX = Pp.tx, TY = Pp.ty, X = Pp.x, Y = Pp.y, CU = S.culled || (S.culled = new Uint8Array(n));
  const sky = skyXYZ(), A = M ? (M.from === 'thr' ? R.thr : sky) : (S.rest === 'thr' ? R.thr : sky), B = M ? (M.to === 'thr' ? R.thr : sky) : A, SD = Pp.seed;
  let u = 0; if (M) { u = (t - M.t0) / M.dur; if (u >= 1.18) { S.morph = null; S.projDirty = true; u = 1.18; if (!M.lab) S.labNeed = true; } }
  const red = ctx.reduced;
  /* depth cue, folded into the same pass: w = base x (DEPTH_MIN + (1 - DEPTH_MIN) x near), near = 1 at the nearest anchor
     and 0 at the farthest (threads: the fourteen cluster centres). a day's lit plays keep their full weight */
  if ((M ? M.to : S.rest) === 'thr') {
    d0 = 1e9; d1 = -1e9; const Cl = R.clusters;
    for (let f = 0; f < 14; f++) { const px = Cl[f * 4] - ttx, py = Cl[f * 4 + 1] - tty, pz = Cl[f * 4 + 2] - ttz, zr = syw * px + cyw * pz, dep = sp * py + cp * zr + D; if (dep < d0) d0 = dep; if (dep > d1) d1 = dep; }
  }
  if (!(d1 - d0 > 0.02)) { d0 = D - 0.3; d1 = D + 0.3; } /* all anchors behind the camera or on one plane: a fixed band around the target */
  S.depthAt = [d0, d1];
  if (!S.wb || S.wb.length !== n) weights();
  const kB = (1 - DEPTH_MIN) / (d1 - d0);
  const J = PJ; J.cx0 = cx0; J.cy0 = cy0; J.F = F; J.D = D; J.cyw = cyw; J.syw = syw; J.cp = cp; J.sp = sp; J.tx = ttx; J.ty = tty; J.tz = ttz;
  J.kA = DEPTH_MIN + kB * d1; J.kB = kB; J.dm = DEPTH_MIN; J.keep = S.angle === 'day' ? 255 : 256; J.n = n;
  if (M) { J.dk = u < MORPH_OUT ? 1 - u / MORPH_OUT : u > 1 - MORPH_OUT ? Math.min(1, (u - (1 - MORPH_OUT)) / MORPH_OUT) : 0; J.dFrom = u < MORPH_OUT; dotsMorph(A, B, SD, u, S.wb, Pp.w, TX, TY, X, Y, CU, S.wa && S.wa.length === n ? S.wa : S.wb, S.ring && S.ring.length === n ? S.ring : ringOf(R)); }
  else dotsRest(A, S.wb, Pp.w, TX, TY, X, Y, CU);
  /* this entry's first placement: the dots start where they belong, never gathering in from another shape (W41: the room
     never inherits the last room's picture; VERIFY_1 P0-1: a deep link or a door entry gathered from the shell's default
     layout, a lit brick over the whole stage for a second). the room's own approach (a turn and a fall in) is its arrival.
     while the shell's stop-trip crossing runs (W47: it caps every dot's pace), the placed sky tracks the camera exactly
     instead of shearing behind the approach */
  if (!S.placed) { S.placed = true; X.set(TX); Y.set(TY); Pp.ease = Math.max(Pp.ease, 0.35); Pp.swirl = 0; S.readyPend = true; }
  else if (red || (Pp.morph && Pp.morph.on)) { X.set(TX); Y.set(TY); }
}
/* the per-dot projection (+ the depth cue: w = base x k, k = kA - kB x depth clamped to [DEPTH_MIN, 1]; a day's lit plays,
   base == keep, keep their weight), in two loops: at rest, and morphing between two layouts. one loop with the morph as a
   branch fell to JavaScriptCore's baseline tier for good after a threads visit (its optimizing tiers compile a branch not
   yet taken as an exit, and the morph kept taking it): 9 ms a frame at rest on WebKit desk1 instead of 0.4 */
const PJ = { cx0: 0, cy0: 0, F: 1, D: 1, cyw: 1, syw: 0, cp: 1, sp: 0, tx: 0, ty: 0, tz: 0, kA: 1, kB: 0, keep: 256, n: 0, dm: 0.55, dk: 1, dFrom: true };
function dotsRest(A, WB, W, TX, TY, X, Y, CU) {
  const J = PJ, cx0 = J.cx0, cy0 = J.cy0, F = J.F, D = J.D, cyw = J.cyw, syw = J.syw, cp = J.cp, sp = J.sp, ttx = J.tx, tty = J.ty, ttz = J.tz, kA = J.kA, kB = J.kB, keep = J.keep, n = J.n, DM = J.dm;
  for (let i = 0; i < n; i++) {
    const o = i * 3, px = A[o] - ttx, py = A[o + 1] - tty, pz = A[o + 2] - ttz, xr = cyw * px - syw * pz, zr = syw * px + cyw * pz, yr = cp * py - sp * zr, dep = sp * py + cp * zr + D;
    if (dep <= 0.05) { TX[i] = X[i] = -1e4; TY[i] = Y[i] = -1e4; CU[i] = 1; continue; }
    const s = F / dep, nx = cx0 + xr * s, ny = cy0 - yr * s;
    TX[i] = nx; TY[i] = ny;
    if (CU[i]) { CU[i] = 0; X[i] = nx; Y[i] = ny; } /* back from behind the camera: appear in place, never streak in from the edge */
    const b = WB[i];
    if (b !== keep && b > 1) { let k = kA - kB * dep; k = k < DM ? DM : k > 1 ? 1 : k; const w = (b * k + 0.5) | 0; W[i] = w > 0 ? w : 1; } else W[i] = b;
  }
}
/* while morphing, a dot's base weight: a star's body (its dots within one sigma, falloff classes 0 and 1: the named star
   itself) runs from where it left (WA) to where it lands (WB) with its own ease, landing by 0.8 of the morph (before the
   rest fades up round it, so the two never add up to a busier frame than either view); every other dot (a star's outer halo and
   the dust) is the old weight x dk over the first MORPH_OUT of the morph, nothing in the middle, the new weight x dk over
   the last MORPH_OUT (dk from project()), and moves only in between, so it fades out and back in where it stands */
function dotsMorph(A, B, SD, u, WB, W, TX, TY, X, Y, CU, WA, RG) {
  const J = PJ, cx0 = J.cx0, cy0 = J.cy0, F = J.F, D = J.D, cyw = J.cyw, syw = J.syw, cp = J.cp, sp = J.sp, ttx = J.tx, tty = J.ty, ttz = J.tz, kA = J.kA, kB = J.kB, keep = J.keep, n = J.n, DM = J.dm, dk = J.dk, WD = J.dFrom ? WA : WB;
  const un = (u - MORPH_OUT) / (1 - 2 * MORPH_OUT);
  for (let i = 0; i < n; i++) {
    const car = RG[i] <= 1;
    let ui = car ? (u - SD[i] * 0.0143) / 0.7 : un; ui = ui < 0 ? 0 : ui > 1 ? 1 : ui; const e = ui * ui * (3 - 2 * ui), o = i * 3;
    const b = car ? (WA[i] + (WB[i] - WA[i]) * e + 0.5) | 0 : (WD[i] * dk + 0.5) | 0;
    const x = A[o] + (B[o] - A[o]) * e, y = A[o + 1] + (B[o + 1] - A[o + 1]) * e, z = A[o + 2] + (B[o + 2] - A[o + 2]) * e;
    const px = x - ttx, py = y - tty, pz = z - ttz, xr = cyw * px - syw * pz, zr = syw * px + cyw * pz, yr = cp * py - sp * zr, dep = sp * py + cp * zr + D;
    if (dep <= 0.05) { TX[i] = X[i] = -1e4; TY[i] = Y[i] = -1e4; CU[i] = 1; continue; }
    const s = F / dep, nx = cx0 + xr * s, ny = cy0 - yr * s;
    TX[i] = nx; TY[i] = ny;
    if (CU[i]) { CU[i] = 0; X[i] = nx; Y[i] = ny; }
    if (b !== keep && b > 1) { let k = kA - kB * dep; k = k < DM ? DM : k > 1 ? 1 : k; const w = (b * k + 0.5) | 0; W[i] = w > 0 ? w : 1; } else W[i] = b;
  }
}
/* every flight this room starts goes through here, so a relayout mid-flight (the chrome settling, the phone card growing
   by a line) can pick the same flight up again from wherever the camera was stopped */
function fly(pose, o) { S.lastFly = { pose, o: o || {}, at: now() }; S.homeFly = null; try { return S.ctx.view.flyTo(pose, o || {}); } catch (e) { return null; } }
/* the room's own flight home (the approach; k: a tour's arrival lands a little further out, DOLLY0), remembered by its start
   so a relayout can tell it from a tour's pose or a search and send it on to the new home (enter) */
function homeFly(k) {
  const v = S.ctx.view, t0 = now();
  try { if (k && k !== 1) { const h = fitted(HOME); fly(Object.assign({}, h, { dist: h.dist * k }), {}); } else v.home({}); } catch (e) {}
  S.homeFly = { t0, t1: now(), k: k || 1 };
}
/* a long flight across the sky says the name of one real star it goes past, once (never a made-up waypoint) */
function passBy(ctx, t) {
  const T = S.trip; if (!T || T.said || !S.R) return;
  if (!ctx.view.flying) { S.trip = null; return; }
  if ((S.fc = (S.fc || 0) + 1) % 8) return;
  const el = now() - T.t0; if (el < 450) return;
  const tg = ctx.view.target, R = S.R; let best = -1, bd = 0.045 * 0.045;
  for (let i = 0; i < S.ns; i++) { if (i === T.to) continue; const dx = R.cx[i] - tg[0], dy = R.cy[i] - tg[1], dz = R.cz[i] - tg[2], d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return;
  const f = T.from, df = Math.hypot(R.cx[best] - f[0], R.cy[best] - f[1], R.cz[best] - f[2]); if (df < 0.08) return; /* not the star it left */
  T.said = true; try { ctx.toast(tpl(C().passing, { name: R.names[best] }), 1700); } catch (e) {}
}
function drawOverlay(g, t) {
  const a = S.angle;
  if (a === 'day' && S.D && S.dayK >= 0) drawDayBloom(g);
  if (S.sunOld) drawSun(g, t, S.sunOld);
  const U = S.sun, lit = U && U.lit && S.sel && S.sel.i === U.i;
  if (lit) drawSun(g, t, U);
  if (S.sel && S.sel.i >= 0 && !S.morph && !lit) drawReticle(g, t, S.sel.i);
  if (VX) VX.draw(g);
  if (S.hover >= 0 && (!S.sel || S.sel.i !== S.hover)) drawHover(g, S.hover);
}
/* a quadratic bezier in 3D, projected at segs + 1 points into out (x, y pairs; -1e5 behind the camera), no array per
   point. returns false when any point is behind the camera */
function bezProj(q, ax, ay, az, bx, by, bz, cx, cy, cz, segs, out, u0 = 0, u1 = 1) {
  let ok = true;
  const tx = q.tx, ty = q.ty, tz = q.tz, cyw = q.cyaw, syw = q.syaw, cp = q.cp, sp = q.sp, D = q.D, F = q.F, cx0 = q.cx0, cy0 = q.cy0;
  for (let s = 0; s <= segs; s++) {
    const u = u0 + ((u1 - u0) * s) / segs, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    const px = a * ax + b * bx + c * cx - tx, py = a * ay + b * by + c * cy - ty, pz = a * az + b * bz + c * cz - tz;
    const xr = cyw * px - syw * pz, zr = syw * px + cyw * pz, yr = cp * py - sp * zr, dep = sp * py + cp * zr + D;
    if (dep <= 0.05) { out[s * 2] = out[s * 2 + 1] = -1e5; ok = false; continue; }
    const k = F / dep; out[s * 2] = cx0 + xr * k; out[s * 2 + 1] = cy0 - yr * k;
  }
  return ok;
}
/* ------------------------------------------------------------------ K1: the lines as glyph trails */
/* links, threads and a day's pairs are no longer vector strokes on the overlay: every frame they go to the glyph field as
   trail segments (ctx.atlas.setLines, 7 floats each: x0 y0 x1 y1 w 0xRRGGBB pulse), so they read in the field's own ramp
   (. ' : runs, brighter only where a trail is strong) and glow where they cross. a segment runs from the earlier artist
   (more plays) to the later, so its travelling bright cell moves in play order. pulse NaN = none */
function segBuf(n) { if (!S.seg || S.seg.length < n * 7) { const B = new Float32Array(Math.min(SEGMAX, Math.max(1024, Math.ceil(n * 1.5))) * 7); if (S.seg) B.set(S.seg.subarray(0, Math.min(S.seg.length, B.length))); S.seg = B; } return S.seg; }
function pushSeg(B, o, x0, y0, x1, y1, w, c, pulse) { if (o + 7 > B.length) return o; B[o] = x0; B[o + 1] = y0; B[o + 2] = x1; B[o + 3] = y1; B[o + 4] = w; B[o + 5] = c; B[o + 6] = pulse; return o + 7; }
function trails(t) {
  const A = S.ctx.atlas; if (!A || typeof A.setLines !== 'function') return;
  const a = S.angle; let o = 0;
  if (a === 'links' && !S.morph) o = linkTrails(t);
  else if (a === 'threads' && S.B) o = chordTrails(t);
  else if (a === 'day' && S.D && S.dayK >= 0) o = dayTrails(t);
  if (a === 'sky' || a === 'links' || a === 'star') o = leaderTrails(o);
  try {
    if (o) { if (!S.segView || S.segView.length !== o || S.segView.buffer !== S.seg.buffer) S.segView = S.seg.subarray(0, o); A.setLines(S.segView); S.linesOn = true; }
    else if (S.linesOn) { A.setLines(null); S.linesOn = false; }
  } catch (e) {}
}
/* the links (GS K3): one arm's rate-matched edges, weight by the edge's rate against that arm's strongest (both: one even
   grey), a little dimmer at the far side of the sky; untagged ends in the fog hue */
function linkTrails(t) {
  const A = S.A, R = S.R, PAL = S.ctx.PAL, arm = S.armL, v = S.ctx.view; if (!A || !R) return 0;
  const E = A.edges, SX = S.sx, SY = S.sy, SDp = S.sd, fam = R.fam, D0 = 2.2 * Math.max(0.05, v.dist), n = S.ns;
  const col = arm === 'tap' ? PAL.tap : arm === 'served' ? PAL.violet : 0xa49bbd;
  const LM = S.linkMax || (S.linkMax = {});
  if (!LM[arm]) { let m = 0; E.forEach((e) => { const r = arm === 'tap' ? (e.tap_n > 0 ? e.tap_rate : 0) : arm === 'served' ? (e.auto_n > 0 ? e.auto_rate : 0) : 1; if (r > m) m = r; }); LM[arm] = m || 1; }
  const mx = LM[arm], B = segBuf(E.length), tp = t / PULSE_MS;
  let o = 0;
  for (let k = 0; k < E.length; k++) {
    const e = E[k];
    const rate = arm === 'tap' ? (e.tap_n > 0 ? e.tap_rate : 0) : arm === 'served' ? (e.auto_n > 0 ? e.auto_rate : 0) : (e.tap_n > 0 || e.auto_n > 0 ? 1 : 0);
    if (!rate) continue;
    const i = Math.min(e.a, e.b), j = Math.max(e.a, e.b); if (j >= n || SDp[i] <= 0.05 || SDp[j] <= 0.05) continue;
    const near = clamp(1.35 - (((SDp[i] + SDp[j]) / 2) / D0) * 0.7, 0.35, 1);
    const w = (arm === 'both' ? 0.3 : LINK_W0 + (LINK_W1 - LINK_W0) * Math.sqrt(rate / mx)) * (0.6 + 0.4 * near);
    o = pushSeg(B, o, SX[i], SY[i], SX[j], SY[j], w, fam[i] === 13 || fam[j] === 13 ? PAL.fog : col, (tp + hash(k * 7 + 3)) % 1);
  }
  return o;
}
/* the weave (GS K5): each family pair's curve in 24 pieces, weight by its share of the arm's transitions; the pair in focus
   (or under the pointer) strong. every piece gets the head's position in its own parameter so one pulse runs the curve */
function chordTrails(t) {
  const PAL = S.ctx.PAL, arm = S.armT, col = arm === 'tap' ? PAL.tap : arm === 'shuffle' ? PAL.shuffle : PAL.violet;
  /* arriving from the sky, the weave comes in with the clusters' halos over the morph's last MORPH_OUT (a trail lights its
     cells at any weight, so an early faint weave lit the whole ring while the stars were still on their way: P1-4) */
  const mo = S.morph ? clamp((t - S.morph.t0) / S.morph.dur, 0, 1) : 1, mi = clamp((mo - (1 - MORPH_OUT)) / MORPH_OUT, 0, 1), fade = S.morph && S.morph.to === 'thr' ? mi * mi : S.morph ? 0 : 1;
  const L = S.chordsL;
  if (fade <= 0.01) { for (let k = 0; k < L.length; k++) L[k].ok = false; return 0; }
  const q = q3(), kk = S.k, fh = S.famHi, mx = S.chordMax, B = segBuf(L.length * 24), tp = t / (PULSE_MS * 1.6);
  const selA = S.chord ? S.chord[0] : -1, selB = S.chord ? S.chord[1] : -1, hv = S.hoverLine && S.hoverLine.kind === 'chord' ? S.hoverLine : null;
  let o = 0;
  for (let k = 0; k < L.length; k++) {
    const ch = L[k], cc = ch.cc || (ch.cc = chordCtrl(ch.a, ch.b)), p0 = cc[0], p1 = cc[1], p2 = cc[2];
    ch.ok = bezProj(q, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], 24, ch.pts);
    ch.lw = (0.55 + 26 * Math.sqrt(ch.w)) * kk; /* the pick tolerance (pickLine) */
    const hot = (ch.a === selA && ch.b === selB) || (hv && hv.a === ch.a && ch.b === hv.b);
    let w = hot ? 0.74 : (0.07 + 0.36 * Math.sqrt(ch.w / mx)) * fade;
    if (!hot && ((fh >= 0 && ch.a !== fh && ch.b !== fh) || S.chord)) w *= 0.4;
    const c = ch.fog ? PAL.fog : col, u = (tp + hash(k * 11 + 5)) % 1, P = ch.pts;
    for (let s = 0; s < 24; s++) { const x0 = P[s * 2], y0 = P[s * 2 + 1], x1 = P[s * 2 + 2], y1 = P[s * 2 + 3]; if (x0 < -1e4 || x1 < -1e4) continue; o = pushSeg(B, o, x0, y0, x1, y1, w, c, u * 24 - s); }
  }
  return o;
}
/* the day's back-to-back pairs (TIER_B §5.4): pooled grey, weight by the pooled count, the pair in focus strong; each runs
   from the rim of one lit cluster to the rim of the other (2 of its sigmas out along the curve), off the glyphs whose size
   carries the day's plays. a gentle bow to one side keeps a -> b and b -> a two trails */
function dayTrails(t) {
  const R = S.R, L = S.dayPairs, hv = S.hoverLine && S.hoverLine.kind === 'day' ? S.hoverLine : null, sel = S.dayLine, q = q3(), kk = Math.max(0.6, S.k);
  const CX = R.cx, CY = R.cy, CZ = R.cz, F = S.dayF && S.dayF.k === S.dayK ? S.dayF : null, rim = S.dayRim || (S.dayRim = new Map());
  if (S.dayRimK !== F) { rim.clear(); if (F) F.lit.forEach((e) => rim.set(e.i, 2 * e.sig)); S.dayRimK = F; }
  const B = segBuf(L.length * 16);
  let o = 0;
  for (let k = 0; k < L.length; k++) {
    const p = L[k], a = p.a, b = p.b; if (a >= S.ns || b >= S.ns) { p.pts = null; continue; }
    const ax = CX[a], ay = CY[a], az = CZ[a], dx = CX[b] - ax, dy = CY[b] - ay, dz = CZ[b] - az, len = Math.hypot(dx, dy, dz) || 1;
    const side = a < b ? 1 : -1, nx = (-dz / len) * side, nz = (dx / len) * side, bow = 0.16 * len;
    const pts = p.pts || (p.pts = new Float32Array(34));
    const u0 = Math.min(0.4, (rim.get(a) || 0) / len), u1 = Math.max(0.6, 1 - (rim.get(b) || 0) / len);
    bezProj(q, ax, ay, az, ax + dx / 2 + nx * bow, ay + dy / 2 + 0.05 * len, az + dz / 2 + nz * bow, CX[b], CY[b], CZ[b], 16, pts, u0, u1);
    p.lw = Math.min(7, 0.7 + 0.55 * p.n) * kk; /* the pick tolerance (pickLine) */
    const hot = (hv && hv.a === a && hv.b === b) || (sel && sel.a === a && sel.b === b);
    const w = hot ? 0.76 : Math.min(0.5, 0.18 + 0.05 * p.n), c = hot ? 0xd8d2ea : 0xa49bbd;
    for (let s = 0; s < 16; s++) { const x0 = pts[s * 2], y0 = pts[s * 2 + 1], x1 = pts[s * 2 + 2], y1 = pts[s * 2 + 3]; if (x0 < -1e4 || x1 < -1e4) continue; o = pushSeg(B, o, x0, y0, x1, y1, w, c, NaN); }
  }
  return o;
}
/* a soft bloom under each of the day's lit clusters, in its family's hue, as wide as the cluster by the day's plays (so it
   grows with them too). one cached sprite per hue, scaled per cluster: a gradient built per cluster per frame cost more
   raster time than the clusters' glyphs. decoration only: off with the glow setting and at the governor's T4 */
const BLOOM = new Map();
function bloomSprite(c) {
  let cv = BLOOM.get(c); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(c, 0.5)); gr.addColorStop(0.35, rgba(c, 0.2)); gr.addColorStop(1, rgba(c, 0));
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); BLOOM.set(c, cv); return cv;
}
/* the sky's star light: a small hot centre (the hue lifted toward white) inside a wide soft halo in the family hue */
const SKYSPR = new Map();
function skySprite(c) {
  const key = c + ':' + SKYB.hot; let cv = SKYSPR.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const x = cv.getContext('2d'), gr = x.createRadialGradient(48, 48, 0, 48, 48, 48), w = mixHex(c, 0xffffff, 0.5);
  gr.addColorStop(0, rgba(w, SKYB.hot)); gr.addColorStop(0.1, rgba(c, 0.5)); gr.addColorStop(0.35, rgba(c, 0.2)); gr.addColorStop(1, rgba(c, 0));
  x.fillStyle = gr; x.fillRect(0, 0, 96, 96); SKYSPR.set(key, cv); return cv;
}
function drawDayBloom(g) {
  const F = S.dayF, R = S.R; if (!F || F.k !== S.dayK || !F.lit.length) return;
  let on = true; try { on = S.ctx.settings.get('glow') !== false; } catch (e) {}
  if (!on || S.noGlow || (S.ctx.atlas.gov && S.ctx.atlas.gov.tier >= 4)) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let q = 0; q < F.lit.length; q++) {
    const e = F.lit[q], i = e.i; if (S.sd[i] <= 0.05) continue;
    const x = S.sx[i], y = S.sy[i], r = Math.max(9, e.bsig * S.ss[i] * 3.8);
    if (x < -r || y < -r || x > innerWidth + r || y > innerHeight + r) continue;
    g.drawImage(bloomSprite(famHex(R.fam[i])), x - r, y - r, 2 * r, 2 * r);
  }
  g.restore();
}
/* the sky's light (W43): a soft bloom in its family's hue under each of the brightest stars (the most played, by node
   order), as wide as a few of its sigmas on screen and stronger for the bigger ones, so the core, where they crowd, reads
   luminous. decoration only (the stars' size and place carry the plays): off with the glow setting, at the governor's T4,
   and while a sun is lit (it has its own corona) */
function drawSkyBloom() {
  const cv = S.dom && S.dom.bloom; if (!cv) return;
  const R = S.R; let on = true; try { on = S.ctx.settings.get('glow') !== false; } catch (e) {}
  const want = !!R && on && !S.noGlow && !(S.ctx.atlas.gov && S.ctx.atlas.gov.tier >= 4) && !S.morph && !sunLit() && (S.angle === 'sky' || S.angle === 'links' || S.angle === 'star');
  const x = S.bloomX || (S.bloomX = cv.getContext('2d'));
  if (!want) { if (S.bloomOn) { x.clearRect(0, 0, cv.width, cv.height); S.bloomOn = false; } return; }
  /* the light is soft, so it is drawn at a third of the css resolution into the room's own canvas, which the compositor
     stretches over the viewport (a hundred full-size sprites on the overlay filled 30M device pixels a frame on a phone) */
  const n = Math.min(S.ns, SKYB.n), W = innerWidth, H = innerHeight, q = SKYB.res, cw = Math.ceil(W * q), ch = Math.ceil(H * q), low = (P().perDot || 1) > 1, BR = low ? SKYB.rLow : SKYB.r;
  /* the zoom over home's (1 at home, 2 at half its distance) fades the light out as the camera closes in */
  const st = S.stage || { w: W, h: H }, zr = (HOME.dist * (S.fit || 1)) / Math.max(1e-3, S.ctx.view.dist || 1), rCap = SKYB.capR * Math.min(st.w, st.h);
  const BA = (low ? SKYB.aLow : SKYB.a) * clamp(SKYB.fadeA - SKYB.fadeK * zr, 0, 1);
  if (BA <= 0.004) { if (S.bloomOn) { x.clearRect(0, 0, cv.width, cv.height); S.bloomOn = false; } return; }
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const d0 = S.depthAt ? S.depthAt[0] : 0, d1 = S.depthAt ? S.depthAt[1] : 1, kd = d1 > d0 ? 1 / (d1 - d0) : 0;
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, cw, ch);
  x.globalCompositeOperation = SKYB.op; S.bloomOn = true;
  for (let i = 0; i < n; i++) {
    if (S.sd[i] <= 0.05 || R.placed[i] === 1) continue;
    const sx = S.sx[i], sy = S.sy[i], r = Math.min(rCap, Math.max(6, (R.sig[i] / R.sigK) * S.ss[i] * BR));
    if (sx < -r || sy < -r || sx > W + r || sy > H + r) continue;
    const near = clamp((d1 - S.sd[i]) * kd, 0, 1);
    x.globalAlpha = BA * (1 - i / n) * (0.55 + 0.45 * near);
    x.drawImage(skySprite(famHex(R.fam[i])), (sx - r) * q, (sy - r) * q, 2 * r * q, 2 * r * q);
  }
}
function drawReticle(g, t, i) {
  const R = S.R, p = pt3(R.cx[i], R.cy[i], R.cz[i]); if (p[3] <= 0.05) return;
  const r = Math.max(15, R.sig[i] * 2.4 * p[2]) + 4, rot = S.ctx.reduced ? 0 : t * 0.00035, ph = R.placed[i] === 1;
  g.save(); g.strokeStyle = 'rgba(134,203,254,.78)'; g.lineWidth = 1;
  g.beginPath(); g.arc(p[0], p[1], r, 0, 6.2832); if (ph) { g.setLineDash([2, 3]); } g.stroke(); g.setLineDash([]);
  if (ph) { g.beginPath(); g.arc(p[0], p[1], 5, 0, 6.2832); g.stroke(); }
  for (let k = 0; k < 4; k++) { const an = rot + k * 1.5708, c = Math.cos(an), s = Math.sin(an); g.beginPath(); g.moveTo(p[0] + c * (r + 3), p[1] + s * (r + 3)); g.lineTo(p[0] + c * (r + 9), p[1] + s * (r + 9)); g.stroke(); }
  g.restore();
}
function drawHover(g, i) {
  if (S.sd[i] <= 0.05) return;
  const r = Math.max(11, S.R.sig[i] * 2.2 * S.ss[i]) + 2;
  g.save(); g.strokeStyle = 'rgba(134,203,254,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(S.sx[i], S.sy[i], r, 0, 6.2832); g.stroke(); g.restore();
}

/* ------------------------------------------------------------------ the lock-on sun (SUN_* above) */
const sunAngle = () => S.angle === 'sky' || S.angle === 'links' || S.angle === 'star';
/* the star a sun belongs to now: the selection, when it is a star (a placeholder keeps its hollow marker) in a view of the
   whole sky (the day view sizes its clusters by the day's plays, so a sun sized by all of them would contradict it) */
function sunFor() { const s = S.sel, R = S.R; return s && R && s.i >= 0 && s.i < S.ns && R.placed[s.i] !== 1 && sunAngle() ? s.i : -1; }
function sunLit() { const U = S.sun; return U && U.lit && sunFor() === U.i ? U : null; }
function partnersOf(i) {
  const D = S.D, out = []; if (!D || !D.nbJ || i < 0 || i >= D.nbS) return out;
  for (let q = 0; q < D.nbK; q++) { const j = D.nbJ[i * D.nbK + q]; if (j < 0) break; if (j >= S.ns) continue; out.push({ j, n: D.nbN[i * D.nbK + q] }); }
  return out;
}
/* the field's cell grid in css px (the renderer's cell over the field canvas's own pixel ratio), read at most once a second */
function gridOf() {
  const t = now(); if (S.grid && t - S.grid.at < 1000) return S.grid;
  let cw = 0, ch = 0, ox = 0, oy = 0;
  try { const I = S.ctx.atlas.GF.info(), f = document.getElementById('field'), k = f && f.width && f.clientWidth ? f.width / f.clientWidth : 1; cw = I.cell[0] / k; ch = I.cell[1] / k; ox = I.grid.gx0 / k; oy = I.grid.gy0 / k; } catch (e) {}
  if (!(cw > 0 && ch > 0)) { cw = cellPx(); ch = Math.round(cw * 1.8); ox = oy = 0; }
  let font = true; try { font = !document.fonts || document.fonts.check('500 12px "JetBrains Mono"'); } catch (e) {}
  return (S.grid = { cw, ch, ox, oy, font, at: t });
}
function newSun(i) {
  const R = S.R, st = S.stage || { w: innerWidth, h: innerHeight }, G = gridOf();
  /* the disc by the square root of the star's size: its plays in the full roster, its plays-equivalent share in Tier A */
  if (!S.pRange) { let lo = 1e9, hi = 0; for (let k = 0; k < S.ns; k++) { if (R.placed[k] === 1) continue; lo = Math.min(lo, R.size[k]); hi = Math.max(hi, R.size[k]); } S.pRange = [Math.sqrt(lo), Math.sqrt(hi)]; }
  const [a, b] = S.pRange, q = b > a ? clamp((Math.sqrt(R.size[i]) - a) / (b - a), 0, 1) : 1;
  /* at the target one world unit spans 0.42 x the stage's short side / dist px */
  const dist = S.selDist || 0.5, short = Math.min(st.w, st.h), px = short * (SUN_D0 + (SUN_D1 - SUN_D0) * q) / 2, rw = (px * dist) / (0.42 * short), cells = px / G.ch;
  const hue = famHex(R.fam[i]) >>> 0;
  const U = { i, cells, rw, px0: px, ch0: G.ch, reach: Math.max(rw * 2.2, 0.8 * dist), lit: false, t0: 0, out: null, hue, atmoCss: hexc(mixHex(hue, 0xffffff, 0.3)), nb: [], ends: [], tags: [], spr: null, drawn: null, labR: 0 };
  sunLayout(U);
  return U;
}
/* each thread's far end (the partner's star, or just past the disc when the partner sits under it) and its tag's point (the
   end, or a fixed reach along the thread when the partner is far: the tag stays near the sun, on its thread) */
function sunLayout(U) {
  const R = S.R, i = U.i; U.nb = partnersOf(i); U.ends = []; U.tags = [];
  U.keep = new Uint8Array(R.nA); U.keep[i] = 1; U.nb.forEach((o) => { U.keep[o.j] = 1; }); /* the plays that stay lit */
  /* a partner under the disc: its thread runs out along its direction on the ground plane (the sky lies flat and is seen
     from above, so the height slab would fold a near partner's thread onto the disc), to just past the rim */
  U.nb.forEach((o, q) => {
    const j = o.j, dx = R.cx[j] - R.cx[i], dy = R.cy[j] - R.cy[i], dz = R.cz[j] - R.cz[i], d = Math.hypot(dx, dy, dz) || 1e-6, out = U.rw * 1.6;
    if (d >= out) {
      const at = Math.min(1, U.reach / d);
      U.ends.push([R.cx[j], R.cy[j], R.cz[j], 1]);
      U.tags.push([R.cx[i] + dx * at, R.cy[i] + dy * at, R.cz[i] + dz * at, at === 1 ? Math.max(0.012, R.sig[j] * 1.6) : 0.004]);
    } else {
      let px = dx, pz = dz, dp = Math.hypot(px, pz); if (dp < 1e-6) { const a = (q / Math.max(1, U.nb.length)) * 6.283185307; px = Math.cos(a); pz = Math.sin(a); dp = 1; }
      const ux = px / dp, uz = pz / dp;
      U.ends.push([R.cx[i] + ux * out, R.cy[i], R.cz[i] + uz * out, 0]);
      U.tags.push([R.cx[i] + ux * out, R.cy[i], R.cz[i] + uz * out, 0.004]);
    }
  });
}
/* per frame: a new lock gets a sun (lit once its flight lands), a released one collapses */
function syncSun(t) {
  const ctx = S.ctx, want = sunFor();
  let U = S.sun;
  if (U && U.i !== want) { const was = U.lit; if (was && !ctx.reduced) { U.out = t; S.sunOld = U; } S.sun = U = null; if (was) { sunClass(false); setLabels(); weights(); } }
  if (S.sunOld && (ctx.reduced || t - S.sunOld.out >= SUN_OUT)) S.sunOld = null;
  if (want >= 0 && !U) S.sun = U = newSun(want);
  if (U && !U.lit && !ctx.view.flying && !S.morph) {
    U.lit = true; U.t0 = t; sunClass(true); setLabels(); weights();
    /* its threads are the day records' back-to-back partners: fetched now, only where the day records exist (Tier B) */
    if (!S.D && S.dayIdx && !S.load.days) need('days').catch(() => { daysGone(); });
  }
}
/* html.uv-sun: the room's css dims every other star label and hides the labels' corner reticle (the ring replaces it) */
function sunClass(on) { document.documentElement.classList.toggle('uv-sun', !!on); }
function sunK(U, t) {
  if (S.ctx.reduced) return U.out != null ? 0 : 1;
  let k = clamp((t - U.t0) / SUN_IN, 0, 1); k = 1 - (1 - k) * (1 - k) * (1 - k);
  if (U.out != null) k *= 1 - clamp((t - U.out) / SUN_OUT, 0, 1);
  return k;
}
const calmSun = () => S.ctx.reduced || !!(S.ctx.atlas.gov && S.ctx.atlas.gov.tier >= 4); /* no turn, no pulse */
function drawSun(g, t, U) {
  const i = U.i; if (S.sd[i] <= 0.05) return;
  const k = sunK(U, t); if (k <= 0.02) return;
  const G = gridOf(), cw = G.cw, ch = G.ch, full = Math.min(U.rw * S.ss[i], Math.max(ch * SUN_CAP, 1.4 * (U.px0 || 0)));
  if (full < ch * 0.8) return;
  /* the lock label sits just outside the disc as drawn (gcd's up-right offset from the star's projected centre): once the
     cap holds the disc back from the camera, its world radius shrinks, and the label follows it in */
  const rW = (LOCK_LAB_R * full) / Math.max(1e-6, S.ss[i]); /* the labels put a name's corner at 0.72 r (+6 px) out on the diagonal: at 0.9 of the disc its corner meets the ragged limb */
  if (!U.out && Math.abs(rW - (U.labR || 0)) > 0.04 * rW) { U.labR = rW; try { S.ctx.labels.update('universe', 's' + i, { r: rW }); } catch (e) {} }
  const rq = Math.max(cw, Math.round((full * k) / (cw * 0.5)) * cw * 0.5);
  const c0 = Math.floor((S.sx[i] - G.ox) / cw), r0 = Math.floor((S.sy[i] - G.oy) / ch), xc = G.ox + (c0 + 0.5) * cw, yc = G.oy + (r0 + 0.5) * ch;
  const onScreen = !(xc < -rq - SUN_MOAT || yc < -rq - SUN_MOAT || xc > innerWidth + rq + SUN_MOAT || yc > innerHeight + rq + SUN_MOAT);
  let disc = 0, corona = 0;
  if (onScreen) {
    const sp = sunSprite(U, rq, G), Rm = rq + SUN_MOAT;
    g.save(); g.globalAlpha = Math.min(1, k * 1.2); g.drawImage(moatSprite(rq), xc - Rm, yc - Rm, 2 * Rm, 2 * Rm);
    g.globalAlpha = Math.min(1, k * 1.4); g.drawImage(sp.cv, xc - sp.E, yc - sp.E, 2 * sp.E, 2 * sp.E); g.restore();
    disc = sp.n;
    corona = drawAtmo(g, t, U, sp, G, c0, r0, k);
  }
  const threads = U.out == null ? drawThreads(g, t, U, G, xc, yc, rq) : 0;
  U.drawn = { disc, corona, threads, cells: rq / ch, x: xc, y: yc, rows: sunRows(U) };
}
/* the field's continuous ramp in ink order (the renderer's own, so the body speaks the field's language) */
function rampOf() {
  if (S.ramp) return S.ramp;
  let r = ''; try { r = String(S.ctx.atlas.GF.info().ramp || ''); } catch (e) {}
  return (S.ramp = r.length >= 8 ? r : RAMP0);
}
/* smooth seeded value noise on the cell lattice (for the body's granules) */
function vnoise(x, y, sd) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi + sd, yi - sd), b = hash2(xi + 1 + sd, yi - sd), c = hash2(xi + sd, yi + 1 - sd), d = hash2(xi + 1 + sd, yi + 1 - sd);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/* ordered dither on the cell lattice (the renderer's interleaved gradient noise) */
const ign = (c, r) => { const d = c * 0.06711056 + r * 0.00583715, v = 52.9829189 * (d - Math.floor(d)); return v - Math.floor(v); };
/* the body, drawn once per size (half a cell), cell grid, font and glow state into its own canvas and blitted every frame
   (one image a frame: a full-window gradient cost 8.7 ms a frame on a software canvas). out to 2.1 disc radii:
   - a dark moat past the limb, so a locked star in the dense core stands clear of its neighbours (the rest of the sky has
     already stepped back through the dots' weights and hues);
   - a soft glow in the star's hue under the body (off with the glow setting and at the governor's T4);
   - a dark backing on every cell the body covers, so it replaces the field's glyphs there instead of piling on them;
   - one glyph a cell from the field's ramp by a tone that is limb-darkened (bright centre, dim limb), textured (two octaves
     of value noise seeded by the star: granules a few cells across) and grained per cell, ordered-dithered between two
     neighbouring glyphs, with no run of more than RUN_MAX of one glyph in a row (the next cell steps one level toward its
     own tone); the limb wobbles with the angle, so the edge is ragged and never a stamped ellipse;
   - colour: the star's hue lifted toward white by the tone (a hot core, a coloured limb).
   the atmosphere around it (sparse . ' : out to ATMO radii) is laid out here and drawn per frame by drawAtmo, shimmering */
function sunSprite(U, rq, G) {
  let on = true; try { on = S.ctx.settings.get('glow') !== false; } catch (e) {}
  const glow = on && !S.noGlow && !(S.ctx.atlas.gov && S.ctx.atlas.gov.tier >= 4);
  const dpr = devicePixelRatio || 1, key = rq + ':' + G.cw + 'x' + G.ch + '@' + dpr + (G.font ? 'f' : 'n') + (glow ? 'g' : '');
  if (U.spr && U.spr.key === key) return U.spr;
  const ramp = rampOf(), NL = ramp.length, sd = (U.i * 7919 + 17) % 100003;
  const K = Math.ceil((rq * ATMO) / G.cw) + 1, Kr = Math.ceil((rq * ATMO) / G.ch) + 1, w = G.cw * dpr, h = G.ch * dpr, E = Math.ceil(rq * 2.1), half = Math.ceil(E * dpr);
  const cv = U.spr ? U.spr.cv : document.createElement('canvas');
  cv.width = cv.height = 2 * half;
  const x = cv.getContext('2d'), px = Math.max(4, Math.min(w / 0.6, h / 1.08)), R0 = rq * dpr;
  x.clearRect(0, 0, cv.width, cv.height);
  const gm = x.createRadialGradient(half, half, R0 * 0.9, half, half, half), f = (r) => clamp((r * R0 - R0 * 0.9) / Math.max(1, half - R0 * 0.9), 0, 1);
  gm.addColorStop(0, 'rgba(10,1,24,0)'); gm.addColorStop(f(1.18), 'rgba(10,1,24,0.72)'); gm.addColorStop(f(1.6), 'rgba(10,1,24,0.5)'); gm.addColorStop(1, 'rgba(10,1,24,0)');
  x.fillStyle = gm; x.fillRect(0, 0, cv.width, cv.height);
  if (glow) { const r = R0 * 1.7; x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.34; x.drawImage(bloomSprite(U.hue), half - r, half - r, 2 * r, 2 * r); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
  /* the limb's wobble: a few low harmonics of the angle, seeded */
  const ph1 = hash2(sd, 3) * 6.2832, ph2 = hash2(sd, 5) * 6.2832, ph3 = hash2(sd, 9) * 6.2832;
  const limb = (a) => 1 + 0.045 * Math.sin(3 * a + ph1) + 0.03 * Math.sin(5 * a + ph2) + 0.02 * Math.sin(8 * a + ph3);
  const NB = 12, buckets = Array.from({ length: NB }, () => []), rows = [], atmo = [];
  let n = 0;
  x.beginPath();
  for (let r = -Kr; r <= Kr; r++) {
    let prev = -1, run = 0; const row = [];
    for (let c = -K; c <= K; c++) {
      const dx = c * G.cw, dy = r * G.ch, d = Math.hypot(dx, dy) / rq, de = d / limb(Math.atan2(dy, dx));
      if (de > 1) {
        prev = -1; run = 0; row.push(' ');
        /* the atmosphere: sparse, thinning outwards, only the lightest glyphs */
        if (de < ATMO) { const p = 1 - (de - 1) / (ATMO - 1), hs = hash2(c + 101, r - 37); if (hs < 0.55 * Math.pow(p, 1.3)) atmo.push(c, r, p > 0.62 ? 1 : hs < 0.2 ? 9 : 0, 0.18 + 0.37 * p, hash2(c - 11, r + 23) * 6.2832); }
        continue;
      }
      /* the tone: limb darkening x granules x grain, never flat at the top (the ramp's last glyph is rare) */
      const lb = sunTone(de);
      const gr = 0.62 * vnoise(c / 2.3, r / 1.3, sd) + 0.38 * vnoise(c / 1.05, r / 0.6, sd + 57);
      const L = clamp(lb * (0.78 + 0.34 * gr) + (hash2(c, r + sd) - 0.5) * 0.08, 0.04, 0.99);
      const lf = L * (NL - 1);
      let lv = clamp(Math.floor(lf + ign(c + 3, r + 7)), 0, NL - 1);
      if (lv === prev && run >= RUN_MAX) { const up = lf >= lv ? 1 : -1; lv = clamp(lv + up, 0, NL - 1); if (lv === prev) lv = clamp(prev - up, 0, NL - 1); }
      if (lv === prev) run++; else { prev = lv; run = 1; }
      row.push(ramp[lv]);
      const X = Math.round(half + (c - 0.5) * w), Y = Math.round(half + (r - 0.5) * h);
      x.rect(X, Y, Math.round(half + (c + 0.5) * w) - X, Math.round(half + (r + 0.5) * h) - Y);
      buckets[Math.min(NB - 1, (L * NB) | 0)].push(X, Y, lv);
      n++;
    }
    const t = row.join('').replace(/\s+$/, ''); if (t.trim()) rows.push(t);
  }
  x.fillStyle = 'rgba(10,1,24,.9)'; x.fill();
  x.font = '500 ' + px.toFixed(2) + 'px ' + GFONT; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let q = 0; q < NB; q++) {
    const B = buckets[q]; if (!B.length) continue;
    const lm = (q + 0.5) / NB; x.fillStyle = hexc(sunColour(U.hue, lm));
    for (let m = 0; m < B.length; m += 3) x.fillText(ramp[B[m + 2]], B[m] + w / 2, B[m + 1] + h / 2 + px * 0.03);
  }
  U.spr = { key, cv, E: half / dpr, n, rows, atmo: Float32Array.from(atmo) }; U.sprN = (U.sprN || 0) + 1;
  return U.spr;
}
/* the body's light (R2_VERIFY_2 beauty P1-7: a search landed on a dim rose-brown disc among forty blocks as bright as it).
   its tone runs through the star's own falloff classes from the centre out (SUN_TONE: [radius over the disc's, tone]; the
   disc is the star's two-sigma body, so its core, one sigma and two sigma sit at 0.2, 0.42 and 0.83 of the radius), and
   its colour is the field's: the family hue at the renderer's brightness curve (0.34 + 0.66 sqrt(t)), bleached toward
   white over the top of the tone like the field's own bleach, so the core burns near-white and the limb keeps the hue */
const SUN_TONE = [[0, 1], [0.2, 0.99], [0.42, 0.93], [0.83, 0.68], [1, 0.38]];
function sunTone(de) {
  if (de <= 0) return 1; if (de >= 1) return SUN_TONE[SUN_TONE.length - 1][1];
  for (let k = 1; k < SUN_TONE.length; k++) { const a = SUN_TONE[k - 1], b = SUN_TONE[k]; if (de <= b[0]) { const u = (de - a[0]) / (b[0] - a[0]), e = u * u * (3 - 2 * u); return a[1] + (b[1] - a[1]) * e; } }
  return 1;
}
function sunColour(hue, t) {
  const r = (hue >> 16) & 255, g = (hue >> 8) & 255, b = hue & 255, m = Math.max(1, r, g, b), B = (0.34 + 0.66 * Math.sqrt(clamp(t, 0, 1))) * 255 / m;
  const u = clamp((t - 0.45) / 0.45, 0, 1), w = u * u * (3 - 2 * u) * 0.9;
  const f = (v) => Math.min(255, Math.round(v * B + (255 - v * B) * w));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
/* the body's neighbourhood: a soft dark falloff from its limb out to SUN_MOAT px past it (at least SUN_MOAT_A dark over
   the first SUN_MOAT_IN px), drawn under the body from one small cached gradient scaled to size: the rest of the sky
   steps back round the lit star the way a bright body's surroundings fall off (nothing within 200 px of the limb reaches
   half the body's peak), and comes back in full beyond it */
const SUN_MOAT = 300, SUN_MOAT_IN = 215, SUN_MOAT_A = 0.6;
const MOATS = new Map();
function moatSprite(rq) {
  const Rm = rq + SUN_MOAT, key = Math.round(rq / 4); let cv = MOATS.get(key); if (cv) return cv;
  if (MOATS.size > 24) MOATS.clear();
  cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128), f = (px) => clamp(px / Rm, 0, 1);
  gr.addColorStop(0, 'rgba(10,1,24,0.8)'); gr.addColorStop(f(rq), 'rgba(10,1,24,0.78)'); gr.addColorStop(f(rq + 0.5 * SUN_MOAT_IN), 'rgba(10,1,24,0.7)');
  gr.addColorStop(f(rq + SUN_MOAT_IN), 'rgba(10,1,24,' + SUN_MOAT_A + ')'); gr.addColorStop(f(rq + 0.5 * (SUN_MOAT_IN + SUN_MOAT)), 'rgba(10,1,24,0.22)'); gr.addColorStop(1, 'rgba(10,1,24,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256); MOATS.set(key, cv); return cv;
}
/* the body's rows as text (tests read them: no run of one glyph longer than RUN_MAX) */
function sunRows(U) { return U.spr ? U.spr.rows : null; }
/* the atmosphere: the sprite's sparse cells of . : ' past the limb, each shimmering on its own slow phase (still under
   reduced motion and at the governor's T4) */
function drawAtmo(g, t, U, sp, G, c0, r0, k) {
  const A = sp.atmo, n = A.length / 5; if (!n) return 0;
  const calm = calmSun(), B = cellBuf(), kk = Math.min(1, k * 1.2);
  let m = 0;
  for (let q = 0; q < n && m < CELLMAX; q++) {
    const o = q * 5, a = A[o + 3] * kk * (calm ? 0.8 : 0.62 + 0.38 * Math.sin(t * 0.0017 + A[o + 4]));
    if (a < 0.04) continue;
    const b = m * 4; B[b] = c0 + A[o]; B[b + 1] = r0 + A[o + 1]; B[b + 2] = A[o + 2]; B[b + 3] = a; m++;
  }
  blit(g, B, m, glyphRow(U.atmoCss, G), G, 'rgba(10,1,24,.55)');
  return m;
}
function hash2(c, r) { let x = Math.imul((c * 73856093) ^ (r * 19349663), 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; }
/* one row of glyphs (GLYPHS) in one colour at the cell size, drawn once and blitted per cell */
function glyphRow(col, G) {
  const dpr = devicePixelRatio || 1, key = col + ':' + G.cw + 'x' + G.ch + '@' + dpr + (G.font ? 'f' : 'n');
  const M = S.gcache || (S.gcache = new Map()); let a = M.get(key); if (a) return a;
  if (M.size > 12) M.clear();
  const w = Math.max(1, Math.round(G.cw * dpr)), h = Math.max(1, Math.round(G.ch * dpr)), cv = document.createElement('canvas');
  cv.width = w * GLYPHS.length; cv.height = h;
  const x = cv.getContext('2d'), px = Math.max(4, Math.min(w / 0.6, h / 1.08));
  x.font = '500 ' + px.toFixed(2) + 'px ' + GFONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col;
  for (let k = 0; k < GLYPHS.length; k++) x.fillText(GLYPHS[k], k * w + w / 2, h / 2 + px * 0.03);
  a = { cv, w, h }; M.set(key, a);
  return a;
}
/* a direction glyph for a screen direction (y down): - \ | / */
function dirGlyph(dx, dy) { let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI; if (a >= Math.PI) a -= Math.PI; return a < 0.3927 || a >= 2.7489 ? 5 : a < 1.1781 ? 6 : a < 1.9635 ? 7 : 8; }
const cellBuf = () => S.cb || (S.cb = new Float32Array(CELLMAX * 4));
/* cells (column, row, glyph, alpha) onto the overlay: one dark backing path for all of them, then a glyph each */
function blit(g, B, n, A, G, back) {
  if (!n) return;
  const cw = G.cw, ch = G.ch, ox = G.ox, oy = G.oy;
  g.save(); g.beginPath();
  for (let q = 0; q < n; q++) g.rect(ox + B[q * 4] * cw, oy + B[q * 4 + 1] * ch, cw, ch);
  g.fillStyle = back; g.fill();
  for (let q = 0; q < n; q++) { const o = q * 4; g.globalAlpha = B[o + 3]; g.drawImage(A.cv, B[o + 2] * A.w, 0, A.w, A.h, ox + B[o] * cw, oy + B[o + 1] * ch, cw, ch); }
  g.restore();
}
/* a line segment clipped to the window: [x0, y0, x1, y1, u0, u1] (u: where on the segment), or null */
function clipSeg(x0, y0, x1, y1, W, H) {
  let u0 = 0, u1 = 1; const dx = x1 - x0, dy = y1 - y0, P = [-dx, dx, -dy, dy], Q = [x0, W - x0, y0, H - y0];
  for (let k = 0; k < 4; k++) {
    const p = P[k], q = Q[k]; if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p; if (p < 0) { if (r > u1) return null; if (r > u0) u0 = r; } else { if (r < u0) return null; if (r < u1) u1 = r; }
  }
  return [x0 + dx * u0, y0 + dy * u0, x0 + dx * u1, y0 + dy * u1, u0, u1];
}
/* the threads: from just outside the disc to each partner's star (clipped to the window and to the near plane), a cell at a
   time along the line, - | \ / by each step (the classic ascii line), brighter for more plays, fading out along the thread,
   growing out once the disc has opened and carrying a slow pulse outward (decoration) */
function drawThreads(g, t, U, G, xc, yc, rq) {
  const nb = U.nb; if (!nb.length) return 0;
  const calm = calmSun(), grow = calm ? 1 : clamp((t - U.t0 - 250) / 900, 0, 1), ease = 1 - (1 - grow) * (1 - grow);
  if (ease <= 0) return 0;
  const R = S.R, i = U.i, cw = G.cw, ch = G.ch, W = innerWidth, H = innerHeight, B = cellBuf(), nmax = nb[0].n || 1;
  let n = 0;
  for (let q = 0; q < nb.length; q++) {
    const E = U.ends[q]; if (!E) continue;
    let p = pt3(E[0], E[1], E[2]), onStar = E[3] === 1;
    if (p[3] <= 0.1) { /* the partner is behind the camera: the thread runs to where it crosses the near plane */
      const d0 = S.sd[i], u = (0.1 - d0) / (p[3] - d0); if (!(u > 0 && u < 1)) continue;
      p = pt3(R.cx[i] + (E[0] - R.cx[i]) * u, R.cy[i] + (E[1] - R.cy[i]) * u, R.cz[i] + (E[2] - R.cz[i]) * u); onStar = false;
    }
    const dx = p[0] - xc, dy = p[1] - yc, len = Math.hypot(dx, dy); if (len < rq + ch * 1.5) continue;
    const ux = dx / len, uy = dy / len, a0 = rq + ch * 0.55, a1 = len - (onStar ? ch * 0.8 : 0);
    const cl = clipSeg(xc + ux * a0, yc + uy * a0, xc + ux * a1, yc + uy * a1, W, H); if (!cl) continue;
    const [x0, y0, x1, y1, u0, u1] = cl, steps = Math.min(THREAD_CELLS, Math.ceil(Math.max(Math.abs(x1 - x0) / cw, Math.abs(y1 - y0) / ch)));
    /* the threads stay under half the body's light, their pulse included (P1-7: the sun is the one lit body) */
    const base = 0.24 + 0.18 * (nb[q].n / nmax), ph = calm ? -1 : ((t - U.t0) / 2400 + q * 0.21) % 1;
    let pc = 1e9, pr = 1e9;
    for (let s = 0; s <= steps; s++) {
      const f = steps ? s / steps : 0, fu = u0 + (u1 - u0) * f; if (fu > ease) break;
      const c = Math.floor((x0 + (x1 - x0) * f - G.ox) / cw), r = Math.floor((y0 + (y1 - y0) * f - G.oy) / ch);
      if (c === pc && r === pr) continue;
      const dc = c - pc, dr = r - pr, gi = pc > 1e8 ? dirGlyph(ux, uy) : dc && dr ? (dc * dr > 0 ? 6 : 8) : dr ? 7 : 5;
      pc = c; pr = r;
      let al = base * (1 - 0.4 * fu); if (ph >= 0 && Math.abs(fu - ph) < 0.035) al = Math.min(0.36, al * 1.4);
      if (n >= CELLMAX) break;
      const o = n * 4; B[o] = c; B[o + 1] = r; B[o + 2] = gi; B[o + 3] = al; n++;
    }
  }
  blit(g, B, n, glyphRow(THREAD_COL, G), G, 'rgba(10,1,24,.9)');
  return n;
}

/* ------------------------------------------------------------------ the room */
/* the room reports ready (VERIFY_1 P0-1: the shell lifts its boot veil 600 ms after this): once per entry, when the field
   has drawn the sky with this entry's dots in place and the camera on its framing. three ways to read it, whichever the
   shell prefers: the document event `atlas:roomready` {id}, section[data-room="universe"][data-ready], api.shown */
function roomReady() {
  S.readyPend = false; if (S.readyAt) return;
  S.readyAt = now();
  try { if (S.sec) S.sec.dataset.ready = '1'; } catch (e) {}
  try { document.dispatchEvent(new CustomEvent('atlas:roomready', { detail: { id: 'universe', at: S.readyAt } })); } catch (e) {}
}
/* the tour dolly (K6, W43): while a playing tour holds the sky, the camera glides from where the arrival left it (DOLLY0 of
   home, or a stop's own pulled-back pose: the 90-second opener falls in from far out) to DOLLY1 of home over what is left
   of the hold, an ambient move under the idle orbit (no en route, a hand stops it; reduced motion: none). the hold's
   length is read from the tour's own progress (active.holding) over a short sample */
function dolly(ctx, t) {
  let ta = null; try { ta = ctx.tour && ctx.tour.active; } catch (e) {}
  const v = ctx.view;
  if (ctx.reduced || !ta || !ta.id || !ta.playing || S.angle !== 'sky' || S.sel || v.manual || typeof v.travel !== 'function') { S.dolly = null; return; }
  const key = ta.id + ':' + ta.k + ':' + (ta.angleK || 0), h = +ta.holding || 0;
  let D = S.dolly; if (!D || D.key !== key) D = S.dolly = { key, t0: 0, h0: 0, on: false };
  if (D.on || v.flying || h <= 0 || h >= 1) return;
  if (!D.t0) { D.t0 = t; D.h0 = h; return; }
  if (t - D.t0 < 350 || h <= D.h0) return;
  D.on = true;
  const home = HOME.dist * (S.fit || 1), left = (1 - h) / ((h - D.h0) / (t - D.t0));
  if (!(left > 1500)) return;
  /* a tour's closing stop that pulls back (grand's last look at the whole sky) keeps its distance and turns the whole sky
     a slow third of a turn over the hold instead (VERIFY_1 P1-5: "a slow 120-degree yaw over the hold") */
  if (ta.n && ta.k >= ta.n - 1 && v.dist > FINALE_OUT * home) { try { v.travel({ yaw: v.yaw + FINALE_YAW }, { dur: Math.min(30, (0.9 * left) / 1000), ambient: true }).catch(() => {}); } catch (e) {} return; }
  /* always a fall in: to DOLLY1 of home, or a little closer than a stop's own pose that already landed inside that (the
     90-second opener's low, close look), never a pull back out */
  try { v.travel({ dist: Math.min(home * DOLLY1, v.dist * DOLLY_IN) }, { dur: Math.min(30, (0.85 * left) / 1000), ambient: true }).catch(() => {}); } catch (e) {} /* lands a little before the hold ends */
}
/* the sky's labels (W43), laid out by the room. in priority order (plays: node order), each name tries the spots the
   labels would try by themselves (up-right of its star first, then up-left, down-right, down-left, at the star's own
   offset); where none is free (on the sky's brightest cells, on a name placed before it, on the chrome, off the window),
   the name moves out from its star along the star's direction from the centre of the ground plane to the first free spot
   on its outward side, and a faint glyph leader joins it to its star (leaderTrails). a name keeps its spot while that
   spot stays free (so the orbit never reshuffles them); the pass runs a few times a second, and every frame each name
   follows its point through the camera. only names that found a spot are given to the labels, as screen points whose
   up-right box is exactly the spot, so what is drawn is what was checked */
const LABFONT = '400 11px "JetBrains Mono", ui-monospace, Menlo, monospace', LAB_H = 19, LAB_GAP = 8, LAYOUT_MS = 240; /* the labels' own 6 px gap, and 2 px so their half-pixel anchors never tie it */
const QUADS = [[1, -1], [-1, -1], [1, 1], [-1, 1]];
function labW(text) {
  const M = S.labW || (S.labW = new Map()); let w = M.get(text); if (w != null) return w;
  const cv = S.labCv || (S.labCv = document.createElement('canvas').getContext('2d')); cv.font = LABFONT;
  w = Math.ceil(cv.measureText(text + '[  ]').width + (String(text).length + 4) * 0.66 + 11); M.set(text, w); return w;
}
function boxBright(l, t, r, b) {
  const M = S.bmap; if (!M) return false;
  /* a cell of margin: the map is up to a layout pass old while the sky turns under it */
  l -= M.cw / M.k; r += M.cw / M.k; t -= M.ch / M.k / 2; b += M.ch / M.k / 2;
  const c0 = Math.max(0, Math.floor((l * M.k - M.gx0) / M.cw)), c1 = Math.min(M.cols - 1, Math.floor((r * M.k - M.gx0) / M.cw));
  const r0 = Math.max(0, Math.floor((t * M.k - M.gy0) / M.ch)), r1 = Math.min(M.rows - 1, Math.floor((b * M.k - M.gy0) / M.ch));
  for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) if (M.bits[rr * M.cols + cc]) return true;
  return false;
}
/* legibility (VERIFY_1 P1-6: "placement rejects boxes over cells above the dense threshold"): a name keeps off a box in
   which more than COVER_DENSE of the cells (field's last frame) are drawn at DENSE_T or over, a solid patch of glyphs; a
   haze of . and ' under a name is fine (its halo carries it, as gcdatlas's names sit on its starfields). the labels
   module has the last word: a name it does not draw where it was placed gives that spot up (LAB_BAN_MS) and looks again,
   so the layout converges on what the labels accept whatever their own rule is */
const DENSE_T = 0.35, COVER_DENSE = 0.3, LAB_BAN_MS = 2500, LAB_DROP_MS = 12000, LAB_DROPS = 3;
/* (the all-cells fallback of the verify-1 pass is gone: the labels count dense cells too since M6 took request V1, and the
   fallback's latch misread names the labels left out for other reasons, the chrome or the cap on an arrival, as coverage
   drops, and held a phone sky to four names for the rest of the visit) */
function boxCover(l, t, r, b) {
  const M = S.cmap; if (!M) return 0;
  const c0 = Math.max(0, Math.floor((l * M.k - M.gx0) * M.invCw)), c1 = Math.min(M.cols - 1, Math.floor((r * M.k - M.gx0) * M.invCw));
  const r0 = Math.max(0, Math.floor((t * M.k - M.gy0) * M.invCh)), r1 = Math.min(M.rows - 1, Math.floor((b * M.k - M.gy0) * M.invCh));
  if (c1 < c0 || r1 < r0) return 0;
  let n = 0, on = 0; const G = M.GF;
  for (let rr = r0; rr <= r1; rr++) { const o = rr * M.cols; for (let cc = c0; cc <= c1; cc++) { n++; if (G.tFor(o + cc) >= DENSE_T) on++; } }
  return n ? on / n : 0;
}
/* the labels' own ceiling on how many names show (anchors.js: 32, 12 when the governor sheds load, 10 on a touch screen) */
const LABELS_PHONE_CAP = 10;
function labelsCap(touch) { let c = 32; try { const d = S.ctx.labels._debug && S.ctx.labels._debug(); if (d && d.cap > 0) c = d.cap; } catch (e) {} return touch ? Math.min(LABELS_PHONE_CAP, c) : c; }
/* spots the labels turned down: i -> [{t, x, z, ox, oy, ms}]. a spot the labels moved a name off is given up for
   LAB_BAN_MS; one they left the name out of, for LAB_DROP_MS; a name left out LAB_DROPS times running rests for
   LAB_DROP_MS (labRest), so the layout settles on what the labels accept instead of cycling (a still sky stays still) */
function banSpot(M, i, t, e, ms) { let L = M.get(i); if (!L) M.set(i, (L = [])); L.push({ t, x: e.x, z: e.z, ox: e.ox, oy: e.oy, ms: ms || LAB_BAN_MS }); if (L.length > 12) L.shift(); }
function isBanned(M, i, t, x, z, ox, oy) { const L = M && M.get(i); if (!L) return false; for (let k = 0; k < L.length; k++) { const b = L[k]; if (t - b.t < b.ms && b.ox === ox && b.oy === oy && Math.abs(b.x - x) < 1e-6 && Math.abs(b.z - z) < 1e-6) return true; } return false; }
/* the active wall card's box (the labels drop a name anchored on it) */
function wallBox() { const w = document.querySelector('section.is-active .wall'); if (!w) return null; const cs = getComputedStyle(w); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const r = w.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? [r.left, r.top, r.right, r.bottom] : null; }
function coverMap() {
  let GF = null, B = null; try { GF = S.ctx.atlas.GF; B = GF && typeof GF.buffers === 'function' && typeof GF.glyphAt === 'function' ? GF.buffers() : null; } catch (e) {}
  if (!B || !B.cols) return (S.cmap = null);
  const f = document.getElementById('field');
  return (S.cmap = { GF, cols: B.cols, rows: B.rows, gx0: B.gx0, gy0: B.gy0, invCw: B.invCw, invCh: B.invCh, k: f && f.width && innerWidth ? f.width / innerWidth : 1 });
}
/* what the labels keep off besides each other (anchors.js refreshKeepouts' list): the chrome and the room's own dock */
function chromeRects() {
  const out = [], add = (el) => { if (!el) return; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return; const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push([r.left, r.top, r.right, r.bottom]); };
  document.querySelectorAll('[data-keepout], #top > *').forEach(add);
  add(document.querySelector('#atlas-info'));
  const lad = document.querySelector('.atlas-ladder'), n0 = out.length; add(lad);
  /* the ladder's readout and names can sit outside its own box: each visible piece that pokes out counts too */
  if (out.length > n0) { const B = out[out.length - 1]; lad.querySelectorAll('*').forEach((el) => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.left < B[0] || r.top < B[1] || r.right > B[2] || r.bottom > B[3])) add(el); }); }
  ['.atlas-ladder-chip', '#atlas-dock', 'section.is-active .wall'].forEach((q) => add(document.querySelector(q)));
  /* the phone's merged stop row, the end card and the first-visit hint line (R2_REQUESTS_INTEGRATION #6) */
  ['#ai-mrow', '#ai-end', '#atlas-onboard', '#atlas-hint'].forEach((q) => { const e = document.querySelector(q); if (e && !e.hidden) add(e); });
  if (S.dockMode === 'float' && S.stage) { const b = dockBand(); out.push([b.x, b.y, b.x + b.w, b.y + b.h]); }
  return out;
}
const TOUCHQ = '(pointer:coarse),(max-aspect-ratio:115/100)';
function layoutLabels(t) {
  const R = S.R, st = S.stage, L = S.ctx.labels;
  const on = !!(R && st && L && typeof L.update === 'function' && (S.angle === 'sky' || S.angle === 'links' || S.angle === 'star') && !sunLit() && !labsHeld());
  if (!on) { if (S.lay) { S.lay = null; setLabels(); } return; }
  let changed = false;
  if (!S.lay || t - (S.layAt || 0) >= LAYOUT_MS) {
    S.layAt = t; brightRects();
    const keeps = chromeRects(), W = innerWidth, H = innerHeight, boxes = [], prev = S.lay || new Map(), next = new Map();
    let touch = false; try { touch = matchMedia(TOUCHQ).matches; } catch (e) {}
    const PH = touch ? 6 : 0, PV = touch ? 14 : 0; coverMap();
    const BAN = S.labBan || (S.labBan = new Map());
    /* a name's anchor (its box's lower-left, less the labels' 6 px offset) stays on the stage and off the wall card, as
       the labels require (anchors.js inField): never over the reading column, where the sky is behind a scrim and a name
       floats over no art (VERIFY_1 P1-7) */
    const wr = wallBox();
    const free = (l, tp, w) => {
      const r = l + w, b = tp + LAB_H, ax = l - 6, ay = b + 6;
      if (l < 8 || tp < 8 || r > W - 8 || b > H - 8 || ax < st.x || ax > st.x + st.w || ay < st.y || ay > st.y + st.h) return false;
      if (wr && ax >= wr[0] && ax <= wr[2] && ay >= wr[1] && ay <= wr[3]) return false;
      if (boxBright(l, tp, r, b)) return false;
      for (let k = 0; k < keeps.length; k++) { const q = keeps[k]; if (l - PH < q[2] && r + PH > q[0] && tp - PV < q[3] && b + PV > q[1]) return false; }
      for (let k = 0; k < boxes.length; k++) { const q = boxes[k]; if (l < q[2] + LAB_GAP && r > q[0] - LAB_GAP && tp < q[3] + LAB_GAP && b > q[1] - LAB_GAP) return false; }
      return boxCover(l, tp, r, b) <= COVER_DENSE;
    };
    /* the lock's own name and reticle go first (the labels place them before anything else) */
    const sel = S.sel ? S.sel.i : -1;
    if (sel >= 0 && sel < S.ns && S.sd[sel] > 0.05) { const rr = Math.max(10, Math.min(48, Math.max(0.012, R.sig[sel] * 2.2) * S.ss[sel] * 0.9 + 5)); boxes.push([S.sx[sel] - rr, S.sy[sel] - rr, S.sx[sel] + rr, S.sy[sel] + rr]); let lr = null; try { lr = L.rect('universe', 's' + sel); } catch (e) {} if (lr) boxes.push([lr.left, lr.top, lr.right, lr.bottom]); }
    const cap = Math.min(labCapNow(), labelsCap(touch)), z = 1 / Math.max(0.01, S.ctx.view.dist), z0 = 1 / (HOME.dist * (S.fit || 1)), c = pt3(0, 0, 0), step = 0.012 * (S.fit || 1);
    /* the candidates: the most played, a band wider as the camera closes in; at most `cap` of them are shown, the first by
       plays that find a spot (so a name that cannot be placed leaves its place to the next, never an empty sky) */
    let open = Math.round(cap * 1.5); for (const [b, zb] of LAB_BANDS) if (z >= zb * z0) open = cap * (b + 1.5);
    let shown = 0;
    for (let i = 0; i < Math.min(open, S.ns) && shown < cap; i++) {
      if (i === sel || S.sd[i] <= 0.05) continue;
      const sx = S.sx[i], sy = S.sy[i]; if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const w = labW(R.names[i]);
      /* the spot it had, while it stays free */
      const e0 = prev.get(i);
      if (e0) {
        const p = pt3(e0.x, e0.y, e0.z);
        if (p[3] > 0.05) {
          const l = p[0] + e0.ox, tp = p[1] + e0.oy;
          /* the labels put it somewhere else, or left it out (an obstacle or a rule this layout does not see): give the
             spot up for a while */
          let rc = null; try { rc = L.rect('universe', 's' + i); } catch (err) {}
          const dropped = !rc && t - (e0.born || 0) > LAYOUT_MS * 0.8, moved = rc && (Math.abs(rc.left - l) > 3 || Math.abs(rc.top - tp) > 3);
          if (dropped) { banSpot(BAN, i, t, e0, LAB_DROP_MS); const RS = S.labRest || (S.labRest = new Map()), q = RS.get(i) || { n: 0, t: 0 }; q.n = t - q.t < LAB_DROP_MS ? q.n + 1 : 1; q.t = t; RS.set(i, q); }
          else if (moved) banSpot(BAN, i, t, e0);
          else if (free(l, tp, w)) { e0.w = w; next.set(i, e0); boxes.push([l, tp, l + w, tp + LAB_H]); shown++; continue; }
        }
      }
      const banned = (x, z, ox, oy) => isBanned(BAN, i, t, x, z, ox, oy);
      { const q = S.labRest && S.labRest.get(i); if (q && q.n >= LAB_DROPS && t - q.t < LAB_DROP_MS) continue; } /* left out often: rest */
      let e = null;
      const off = Math.max(0.012, R.sig[i] * 2.2) * S.ss[i] * 0.72 + 6;
      for (const [qx, qy] of QUADS) { const ox = qx > 0 ? off : -off - (w - 3), oy = qy < 0 ? -off - LAB_H : off; if (!banned(R.cx[i], R.cz[i], ox, oy) && free(sx + ox, sy + oy, w)) { e = { x: R.cx[i], y: R.cy[i], z: R.cz[i], ox, oy, w, pushed: false }; break; } }
      if (!e && !(S.labFail && t - (S.labFail.get(i) || -1e9) < 700 && i >= 5)) {
        let dx = R.cx[i], dz = R.cz[i], Lr = Math.hypot(dx, dz);
        if (Lr < 1e-3) { const a = hash(i * 31 + 7) * 6.283185307; dx = Math.cos(a); dz = Math.sin(a); Lr = 1; }
        dx /= Lr; dz /= Lr;
        /* never far: a name more than `lead` px from its star reads as a label of something else (the five most played,
           always named, may go a little further) */
        const lead = (touch ? LEAD_PHONE : LEAD_DESK) * (i < 5 ? 2.6 : 1);
        /* out along its own direction; the five most played also try turned directions if that fails */
        const turns = i < 5 ? [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 3.14159] : [0];
        for (let d = 0; d < turns.length && !e; d++) {
          const ca = Math.cos(turns[d]), sa = Math.sin(turns[d]), ux = dx * ca - dz * sa, uz = dx * sa + dz * ca;
          for (let q = 1; q <= (i < 5 ? 60 : 36) && !e; q++) { /* never far: a long leader reads as a line of its own */
            const tt = q * step, x = R.cx[i] + ux * tt, zz = R.cz[i] + uz * tt, p = pt3(x, R.cy[i], zz);
            if (p[3] <= 0.05 || p[0] < -200 || p[0] > W + 200 || p[1] < -200 || p[1] > H + 200 || Math.hypot(p[0] - sx, p[1] - sy) > lead) break;
            /* its outward side first; near a window edge (a phone) the other side of the same point */
            const out = p[0] >= c[0] ? 6 : -6 - (w - 3), inn = p[0] >= c[0] ? -6 - (w - 3) : 6;
            for (const ox of [out, inn]) { for (const oy of [-6 - LAB_H, 6]) if (!banned(x, zz, ox, oy) && free(p[0] + ox, p[1] + oy, w)) { e = { x, y: R.cy[i], z: zz, ox, oy, w, pushed: true }; break; } if (e) break; }
          }
        }
        if (!e) (S.labFail || (S.labFail = new Map())).set(i, t);
      }
      if (!e) continue;
      const p = pt3(e.x, e.y, e.z), l = p[0] + e.ox, tp = p[1] + e.oy;
      e.born = t; next.set(i, e); boxes.push([l, tp, l + w, tp + LAB_H]); shown++;
    }
    if (!S.lay || next.size !== prev.size) changed = true; else for (const i of next.keys()) if (!prev.has(i) || prev.get(i) !== next.get(i)) { changed = true; break; }
    S.lay = next;
  }
  /* every frame: each name follows its point (its box's up-right anchor, as the labels read a screen item) */
  for (const [i, e] of S.lay) { const p = pt3(e.x, e.y, e.z), ax = Math.round((p[0] + e.ox - 6) * 2) / 2, ay = Math.round((p[1] + e.oy + 6 + LAB_H) * 2) / 2; if (ax !== e.ax || ay !== e.ay) { e.ax = ax; e.ay = ay; if (!changed) { try { L.update('universe', 's' + i, { x: ax, y: ay }); } catch (err) {} } } }
  if (changed) setLabels();
}
/* the fourteen family names in THREADS (VERIFY_1 P2-5: on a phone UNTAGGED, WORLD/DESI and SOUNDTRACK piled up and
   HIP-HOP · R&B sat on JAZZ). the sky labels' own collision pass: in order of the family's plays, each name tries a slot
   just outside its cluster on the line out from the ring's centre (on a stage under 420 px wide: all on one circle just
   outside the ring's outer radius), then steps out along that line and turns a little either way round the centre, and
   takes the first slot clear of every name placed before it by 6 px, of the chrome and of the window's edge; a name with no
   free slot is left out, never drawn on another. each keeps its slot (a distance and a turn) while it stays free, and
   follows its cluster through the orbit every frame */
const LABFONT_R = '600 11px "JetBrains Mono", ui-monospace, Menlo, monospace', LAB_HR = 18, TURNS_T = [0, 0.09, -0.09, 0.18, -0.18, 0.27, -0.27, 0.36, -0.36, 0.46, -0.46, 0.58, -0.58], STEPS_T = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16], STEPS_TW = STEPS_T.concat([-1, -2, -3]);
function labWR(text) {
  const M = S.labWR || (S.labWR = new Map()); let w = M.get(text); if (w != null) return w;
  const cv = S.labCv || (S.labCv = document.createElement('canvas').getContext('2d')); cv.font = LABFONT_R;
  const t = String(text).toUpperCase(); w = Math.ceil(cv.measureText(t).width + t.length * 0.14 * 11 + 8 + 3); M.set(text, w); return w;
}
function layoutThreads(t) {
  const R = S.R, L = S.ctx.labels;
  const on = !!(R && R.clusters && S.stage && L && typeof L.update === 'function' && S.angle === 'threads' && !labsHeld());
  if (!on) { if (S.layT) { S.layT = null; if (S.angle === 'threads') setLabels(); } return; }
  const c0 = pt3(0, 0, 0), W = innerWidth, H = innerHeight, narrow = Math.min(S.stage.w, W) < 420;
  /* each cluster on screen: its centre, its reach (two of its sigmas), the direction out from the ring's centre */
  const C = [];
  let rOut = 0;
  for (let f = 0; f < 14; f++) {
    const cp = clusterPos(f), p = pt3(cp[0], cp[1], cp[2]); if (p[3] <= 0.05) { C.push(null); continue; }
    let ux = p[0] - c0[0], uy = p[1] - c0[1]; const d = Math.hypot(ux, uy) || 1; ux /= d; uy /= d;
    const reach = 2 * R.clusters[f * 4 + 3] * p[2];
    C.push({ x: p[0], y: p[1], d, ux, uy, reach }); rOut = Math.max(rOut, d + reach);
  }
  let changed = false;
  if (!S.layT || t - (S.layTAt || 0) >= LAYOUT_MS) {
    S.layTAt = t;
    const keeps = chromeRects(), boxes = [], prev = S.layT || new Map(), next = new Map();
    let touch = false; try { touch = matchMedia(TOUCHQ).matches; } catch (e) {}
    coverMap(); const BANT = S.labBanT || (S.labBanT = new Map()), capT = labelsCap(touch);
    const st = S.stage, wr = wallBox();
    const free = (cx, cy, w) => {
      const l = cx - w / 2, r = cx + w / 2, tp = cy - LAB_HR / 2, b = cy + LAB_HR / 2;
      if (l < 8 || tp < 8 || r > W - 8 || b > H - 8 || cx < st.x || cx > st.x + st.w || cy < st.y || cy > st.y + st.h) return false;
      if (wr && cx >= wr[0] && cx <= wr[2] && cy >= wr[1] && cy <= wr[3]) return false;
      for (let k = 0; k < keeps.length; k++) { const q = keeps[k]; if (l < q[2] && r > q[0] && tp < q[3] && b > q[1]) return false; }
      for (let k = 0; k < boxes.length; k++) { const q = boxes[k]; if (l < q[2] + LAB_GAP && r > q[0] - LAB_GAP && tp < q[3] + LAB_GAP && b > q[1] - LAB_GAP) return false; }
      return boxCover(l, tp, r, b) <= COVER_DENSE;
    };
    const order = Array.from({ length: 14 }, (_, f) => f).sort((a, b) => R.famPlays[b] - R.famPlays[a]);
    for (const f of order) {
      const c = C[f]; if (!c || next.size >= capT) continue;
      const w = labWR(famName(f));
      /* the slot: a distance out from the ring's centre and a turn about it */
      const at = (dist, turn) => { const ca = Math.cos(turn), sa = Math.sin(turn), ux = c.ux * ca - c.uy * sa, uy = c.ux * sa + c.uy * ca, ext = (Math.abs(ux) * w + Math.abs(uy) * LAB_HR) / 2; return [c0[0] + ux * (dist + ext), c0[1] + uy * (dist + ext)]; };
      const base = narrow ? rOut + 4 : c.d + c.reach + 4;
      let e = null;
      const e0 = prev.get(f), bt = (out, turn) => { const L = BANT.get(f); return !!L && L.some((b) => t - b.t < LAB_BAN_MS && b.out === out && b.turn === turn); };
      if (e0) {
        /* the labels left it out where it was: give that slot up for a while */
        let rc = null; try { rc = L.rect('universe', 'f' + f); } catch (err) {}
        if (!rc && t - (e0.born || 0) > LAYOUT_MS * 0.8) { let B = BANT.get(f); if (!B) BANT.set(f, (B = [])); B.push({ t, out: e0.out, turn: e0.turn }); if (B.length > 12) B.shift(); }
        else { const q = at(base + e0.out, e0.turn); if (free(q[0], q[1], w)) e = { out: e0.out, turn: e0.turn, born: e0.born }; }
      }
      if (!e) {
        /* out along its own line first, then turned a little either way; last (a wide stage only: a narrow one keeps every
           name outside the ring), a step in over its cluster's outer haze */
        search: for (const s of narrow ? STEPS_T : STEPS_TW) for (const turn of TURNS_T) {
          if (bt(s * 7, turn)) continue;
          const q = at(base + s * 7, turn); if (free(q[0], q[1], w)) { e = { out: s * 7, turn, born: t }; break search; }
        }
      }
      if (!e) continue;
      const q = at(base + e.out, e.turn); e.w = w;
      boxes.push([q[0] - w / 2, q[1] - LAB_HR / 2, q[0] + w / 2, q[1] + LAB_HR / 2]);
      next.set(f, e);
    }
    if (!S.layT || next.size !== prev.size) changed = true;
    else for (const f of next.keys()) { const a = prev.get(f), b = next.get(f); if (!a || a.out !== b.out || a.turn !== b.turn) { changed = true; break; } }
    S.layT = next;
  }
  /* every frame: each name follows its cluster (a centred screen point) */
  for (const [f, e] of S.layT) {
    const c = C[f]; if (!c) continue;
    const ca = Math.cos(e.turn), sa = Math.sin(e.turn), ux = c.ux * ca - c.uy * sa, uy = c.ux * sa + c.uy * ca, ext = (Math.abs(ux) * e.w + Math.abs(uy) * LAB_HR) / 2;
    const base = narrow ? rOut + 4 : c.d + c.reach + 4, ax = Math.round((c0[0] + ux * (base + e.out + ext) - 1.5) * 2) / 2 /* the labels centre a box at x + 1.5 (their 3 px margin) */, ay = Math.round((c0[1] + uy * (base + e.out + ext)) * 2) / 2;
    if (ax !== e.ax || ay !== e.ay) { e.ax = ax; e.ay = ay; if (!changed) { try { L.update('universe', 'f' + f, { x: ax, y: ay }); } catch (err) {} } }
  }
  if (changed) setLabels();
}
/* the sky's brightest cells (W43): the top 5% of the stage's cells that hold any weight (a margin over the 3% the names
   must keep off), as a bitmap over the renderer's own lattice (its last frame), which the label layout keeps every name
   off. read at most every 150 ms */
function brightRects() {
  const tn = now(); if (S.bright && tn - S.bright < 150) return S.bmap;
  S.bright = tn;
  if (!S.R || !S.stage) return (S.bmap = null);
  let GF = null, B = null; try { GF = S.ctx.atlas.GF; B = GF && typeof GF.buffers === 'function' ? GF.buffers() : null; } catch (e) {}
  if (!B || !B.accW || !B.cols) return (S.bmap = null);
  const f = document.getElementById('field'), k = f && f.width && innerWidth ? f.width / innerWidth : 1, cw = 1 / B.invCw, ch = 1 / B.invCh, st = S.stage;
  const c0 = Math.max(0, Math.floor((st.x * k - B.gx0) * B.invCw)), c1 = Math.min(B.cols, Math.ceil(((st.x + st.w) * k - B.gx0) * B.invCw));
  const r0 = Math.max(0, Math.floor((st.y * k - B.gy0) * B.invCh)), r1 = Math.min(B.rows, Math.ceil(((st.y + st.h) * k - B.gy0) * B.invCh));
  const W = B.accW, vals = S.bvals && S.bvals.length >= (c1 - c0) * (r1 - r0) ? S.bvals : (S.bvals = new Float32Array(Math.max(1, (c1 - c0) * (r1 - r0))));
  let n = 0;
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) { const v = W[r * B.cols + c]; if (v > 0) vals[n++] = v; }
  const bits = S.bmap && S.bmap.bits.length === B.cols * B.rows ? S.bmap.bits : new Uint8Array(B.cols * B.rows);
  bits.fill(0);
  if (n >= 20) {
    const th = vals.subarray(0, n).sort()[Math.floor(0.95 * (n - 1))]; /* 5%: a margin over the brightest 3% the labels must keep off */
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) if (W[r * B.cols + c] >= th) bits[r * B.cols + c] = 1;
  }
  return (S.bmap = { bits, cols: B.cols, rows: B.rows, gx0: B.gx0, gy0: B.gy0, cw, ch, k });
}

export default {
  id: 'universe', track: 'edge-of-the-black-hole', /* R5 R2: 8A keeps all five pentatonic tones under the hover voice (2A left F only). OWNER EAR CHECK; revert: track: 'antares-v2', */
  angles: ANGLES,
  /* K2: no Sobel rim in any view, so every star and every family cluster is a soft core that grades out to haze (gcd's
     own look). 'large' was tried and measured: at home the laid-out core is one body of well over 40 lit cells, so the
     rim still covered a fifth of the sky's lit cells, and in THREADS a third to a half */
  glyph: { edges: false },
  async mount(root, ctx) {
    S.ctx = ctx; S.root = root; S.sec = root.closest('section'); S.wall = S.sec && S.sec.querySelector('.wall');
    if (!ctx.atlas || !ctx.atlas.on || !S.wall) return;
    buildDom(root, ctx);
    sayTier();
    /* Tier A, the day index probe (K4: the angle list is final before the room is first entered) and the Tier-A roster
       (built off the main thread while the stop before is showing, so the sky is there the moment the room opens) */
    api.ready = S.readyP = Promise.all([loadTierA(), probeDays()]).then(() => { fillStarList(); need('rosterA').catch(() => {}); return true; }).catch((e) => { S.failed = true; console.warn('universe tier a', e); return false; });
    ctx.provide('universe', api);
    try { if (ctx.labels && typeof ctx.labels.onHover === 'function') ctx.labels.onHover('universe', onLabelHover); } catch (e) {}
    /* the ladder clears overrides in onStop, which the shell runs after enter(): say the readout again after it (R2b) */
    try { ctx.onStop((ev) => { if (ev && ev.id === 'universe') Promise.resolve().then(() => { if (S.active && S.R) ladder(); }); }); } catch (e) {}
    const ob = document.getElementById('atlas-onboard');
    if (ob && typeof MutationObserver === 'function') new MutationObserver(() => { if (S.active) { layoutDock(); measureDock(); setLabels(); } }).observe(ob, { attributes: true, attributeFilter: ['hidden'] });
    await S.readyP;
    S.mounted = true;
  },
  enter(ctx) {
    if (!ctx.atlas || !ctx.atlas.on || !S.dom) return;
    const Pp = ctx.particles, re = !!ctx.atlas.reenter;
    S.stage = ctx.stage();
    if (!re) {
      S.active = true; S.entered = now(); S.frameMs.length = 0; S.angle = 'sky'; S.sel = null; S.chord = null; S.famHi = -1; S.hover = -1; S.placeholder = -1; S.dayLine = null; S.playing = false; S.sun = S.sunOld = null; sunClass(false);
      Pp.ease = ctx.reduced ? 1 : 0.03; Pp.jitter = 0; Pp.swirl = ctx.reduced ? 0 : 0.34; Pp.touch = false; Pp.big = false;
      if (S.rest !== 'sky') { S.rest = 'sky'; S.morph = null; }
      renderLegend(); renderPlay();
    }
    Pp.glyphAll(true); S.painted = ''; /* the angle state below re-masks and re-colours the field for the current view */
    /* an empty field until this entry's dots are placed (project()), never the last room's shape or the default layout */
    if (!re) { S.placed = false; S.readyAt = 0; try { Pp.w.fill(0); } catch (e) {} }
    const wasFlying = re && ctx.view.flying, fit0 = S.fit || 1, ty0 = S.homeTy || 0;
    /* the flight in the air is the room's own way home (its approach), not a tour's pose or a search: on a new stage it is
       sent again to the new home (the first entry often frames a transient stage while the chrome settles; carried on, the
       approach landed on that stale home and the sky sat smaller and lower than this stage's framing) */
    const H0 = S.homeFly, ownHome = wasFlying && !!H0 && ctx.view._in && ctx.view._in.flyingSince(H0.t0) && !ctx.view._in.flyingSince(H0.t1 + 0.01);
    S.fit = framing(S.stage);
    const tc0 = now();
    ctx.view.configure({ mode: 'orbit3d', distMin: 0.06, distMax: Math.max(2.6, 3.2 * S.fit), home: fitted(HOME), drift: true, speed: 'slow', look: (k) => lookAt(k) });
    const refit = Math.abs(S.fit - fit0) > 1e-3 || Math.abs((S.homeTy || 0) - ty0) > 1e-3;
    if (re && ownHome && refit) homeFly(H0.k);
    else if (re && ownHome) S.homeFly = { t0: tc0, t1: now(), k: H0.k }; /* the camera carried it on (a new start): still ours */
    /* the stage changed shape (the card grew, the phone turned): keep the sky's size on screen, whatever the visitor's zoom,
       and its height on the glass while the camera still looks at home's point */
    else if (re && !wasFlying && !ctx.view.manual && refit) {
      try {
        const tg = ctx.view.target, atHome = !ctx.view.lock && Math.abs(tg[0]) < 1e-3 && Math.abs(tg[2]) < 1e-3 && Math.abs(tg[1] - ty0) < 1e-3;
        ctx.view.set(Object.assign({ dist: ctx.view.dist * S.fit / fit0 }, atHome ? { target: [0, S.homeTy || 0, 0] } : null), { instant: true, lock: ctx.view.lock || undefined });
      } catch (e) {}
    }
    /* a relayout mid-flight: the camera carries whatever flight is running (its own, a tour's pose, a search's) on to the
       same target (camera.js configure); the room no longer re-sends its own last flight, which clobbered a tour's pose */
    S.projDirty = true; S.grid = null; /* the cell grid is read again (a relayout can change the detail) */
    if (!re) {
      /* the approach: from far out and turned, into home; while a tour plays it lands a little further out (DOLLY0), where
         the hold's dolly takes it in */
      if (!ctx.reduced && !ctx.atlas.kiosk) {
        try {
          S.lastFly = null; S.dolly = null; ctx.view.set(fitted(APPROACH), { instant: true });
          let tp = false; try { tp = !!(ctx.tour && ctx.tour.active && ctx.tour.active.id && ctx.tour.active.playing); } catch (e) {}
          homeFly(tp ? DOLLY0 : 1);
          S.approachUntil = now() + 3000;
        } catch (e) {}
      }
      startRosters(); /* the day records load only when a view asks for them (the day view, a lit sun's partners) */
      if (S.R) renderChip();
    }
    layoutDock();
    measureDock();
    applyAngleState({ enter: !re });
    /* the roster is in hand: place the dots now, with the approach pose already set, so the very next frame is the sky */
    if (!re && S.R && !S.placed) { try { project(now()); } catch (e) { console.warn('universe place', e); } }
  },
  leave(ctx) {
    try { ctx.audio.tick(null); } catch (e) {} S.labHov = -1; if (VX) { VX.off(); VX.stopDemo(); }
    S.active = false; S.readyAt = 0; S.readyPend = false; try { if (S.sec) delete S.sec.dataset.ready; } catch (e) {} stopPlay(); S.hover = -1; S.sel = null; S.chord = null; S.dayLine = null; S.sun = S.sunOld = null; sunClass(false); S.dolly = null; S.bright = null; S.bmap = null; S.lay = null; S.layT = null;
    try { if (ctx.atlas && typeof ctx.atlas.setLines === 'function') ctx.atlas.setLines(null); } catch (e) {} S.linesOn = false; /* K1: the shell clears it on exit too */
    try { if (S.bloomOn && S.bloomX) { S.bloomX.clearRect(0, 0, S.dom.bloom.width, S.dom.bloom.height); S.bloomOn = false; } } catch (e) {}
    renderReadout([]); /* the shell clears the hud on a stop change; its second half goes with it */
    try { ctx.ladder.readout(null); ctx.ladder.level(null); } catch (e) {}
    fireTime();
  },
  frame(g, t, bands, w, h, ctx) {
    if (!S.active || !S.R) return;
    const t0 = now();
    if (S.readyPend) roomReady(); /* the field has drawn this entry's placed, framed sky once */
    try {
      const Pp = ctx.particles, dt = S.lastT ? Math.min(60, t - S.lastT) : 16; S.lastT = t;
      if (Pp.ease < 0.35) Pp.ease = Math.min(0.35, Pp.ease + dt * 0.00016); /* gather slowly, then keep up with the camera */
      if (Pp.swirl > 0) Pp.swirl = Math.max(0, Pp.swirl - dt * 0.00018);
      const tp = now(), moved = project(t) !== false; const tq = now(); S.tProj = (S.tProj || 0) * 0.95 + (tq - tp) * 0.05;
      /* the morph has brought the stars where the names point: the new view's names come in (every view, the day's too) */
      if ((S.morph && !S.morph.lab && morphU() >= MORPH_LAB) || S.labNeed) { if (S.morph) S.morph.lab = true; S.labNeed = false; setLabels(); }
      /* reduced motion: once a frame goes by with the dots where they will stay (weights and depth cue final), the exposure
         is seeded again from that frame, so the still sky is one bit-identical frame (the renderer's slow exposure ease,
         at the few frames a second it draws under reduced motion, otherwise crept for ten seconds after every change) */
      if (ctx.reduced && !moved && S.rmSeed) { S.rmSeed = false; try { Pp.glyphMode('cont', { colour: 'sample', bleach: true }); } catch (e) {} }
      trails(t); S.tLines = (S.tLines || 0) * 0.95 + (now() - tq) * 0.05;
      dolly(ctx, t);
      layoutLabels(t);
      layoutThreads(t);
      /* the governor's lattice: the first cell seen at tier 0 is the dust's reference; a coarser one re-weights the dust */
      if (t - (S.cellAt || 0) > 500) {
        if (!S.RB && ctx.view.dist < ROSTER_ZOOM * HOME.dist * (S.fit || 1)) wantRoster();
        S.cellAt = t; const c = cellArea(), tier = ctx.atlas.gov ? ctx.atlas.gov.tier : 0;
        if (c && !S.cell0 && tier === 0) S.cell0 = c;
        if (c && c !== S.cellNow) { const had = S.cellNow; S.cellNow = c; if (had && S.cell0) weights(); }
      }
      if (S.playing && S.angle === 'day' && S.D) {
        let playing = false; try { playing = !!(ctx.tour.active && ctx.tour.active.playing); } catch (e) {}
        if (t - S.lastStep >= (playing ? STEP_TOUR_MS : STEP_MS)) { S.lastStep = t; stepDay(1, 'play'); }
      }
      if (S.sel && ctx.view.state === 'home' && !ctx.view.flying && now() - S.selAt > 600) { S.sel = null; S.placeholder = -1; try { ctx.lock(null); } catch (e) {} setLabels(); renderHud(); ladder(); }
      passBy(ctx, t);
      syncSun(t);
      const to = now(); drawOverlay(g, t); drawSkyBloom(); S.tOver = (S.tOver || 0) * 0.95 + (now() - to) * 0.05;
    } catch (e) { if (S.errs++ < 3) console.error('universe frame', e); }
    const ms = now() - t0; S.frameMs.push(ms); if (S.frameMs.length > 240) S.frameMs.shift();
  },
  setAngle(k, ctx, o = {}) { const a = ANGLES[k]; if (!a) return 0; return setAngle(a.id, o.via, o.instant); },
  focus(desc, ctx) { return doFocus(desc); },
  pick(wx, wy, ctx) { return null; /* the universe answers taps itself (gestures().tap), with a 3D flight */ },
  gestures(ctx) {
    return {
      tap: (p) => onTap(p),
      hover: (p) => onHover(p),
      leave: () => { if (S.hover >= 0) unhover(); if (S.hoverCluster >= 0) { S.hoverCluster = -1; try { S.ctx.audio.tick(null); } catch (e) {} } },
      /* touch (no hover): a press rings the star under the finger and arms the long-press play; held still past 500 ms the
         finger strums whatever it slides over. a mouse keeps the plain drag (no hold), so a still press never blocks the orbit */
      hold: COARSE ? {
        delay: 500,
        press: (p) => { if (p.type === 'mouse') return; const i = pickStar(p.sx, p.sy, 26); if (i >= 0) hoverStar(i, 'touch', p.sx, p.sy); },
        move: (p) => { const i = pickStar(p.sx, p.sy, 26); if (i >= 0 && i !== S.hover) hoverStar(i, 'touch', p.sx, p.sy); },
        end: () => { try { S.ctx.post.undwell({ keep: true }); } catch (e) {} setHover(-1); if (VX && S.labHov < 0) VX.off(); },
      } : undefined,
      cursor: () => (S.hover >= 0 || S.hoverLine || S.hoverCluster >= 0 ? 'pointer' : ''),
    };
  },
  state() { return roomState(); },
  restore(s, ctx) {
    if (!s) return false; const d = {};
    if (s.t && /^day:/.test(s.t)) d.day = s.t.slice(4); if (s.n) d.artist = s.n; if (s.arm) d.arm = s.arm;
    if (s.f) { const f = String(s.f).split(','); if (f.length > 1) d.pair = f.slice(0, 2); else d.family = f[0]; }
    return doFocus(d);
  },
  precision() { return []; },
  keepout(ctx) {
    const d = S.dom; if (!d || !S.stage) return [];
    /* CRIT6A: while the view shows no placard line (the sky), its slot under the chips is free, so the first-visit hint line
       (chrome.js place(), re-read every 500 ms) stays down there instead of stepping up over the sky's lowest stars */
    if (S.dockMode === 'float') return [dockBand(!!(d.line && d.line.hidden))];
    if (S.dockMode === 'bar') return []; /* the bar carries data-keepout: read live, at its current height */
    /* short landscape: the card grows when a view with controls opens, and the chrome above it moves up by as much; keepouts are
       measured at the stop change, so the band the chrome can move into is kept clear from the start */
    const grow = Math.max(0, (S.dockMaxH || 0) - (S.dockCurH || 0)), top = S.stage.y + S.stage.h - grow;
    /* only as wide as the card itself (R2_REQUESTS_M7 #1: the whole band left the ladder chip no bottom-right corner) */
    let right = innerWidth; try { const r = S.wall.getBoundingClientRect(); if (r.width > 0 && r.right < innerWidth - 40) right = r.right + 8; } catch (e) {}
    return [{ x: 0, y: top, w: right, h: innerHeight - top }];
  },
  /* L1: the labels' default tick asks the room first (O(1)) */
  hoverVoice(id, owner) {
    const R = S.R; if (!R || (owner && owner !== 'universe')) return null; const s = String(id);
    if (s === 'ph') return S.placeholder >= 0 && S.placeholder < R.nA ? voiceOf(S.placeholder) : null;
    let m = /^(?:s|d|nb)(\d+)/.exec(s); if (m) { const i = +m[1]; return i < R.nA ? voiceOf(i) : null; }
    m = /^f(\d+)$/.exec(s); return m ? { fam: famName(+m[1]) } : null;
  },
  /* L3: what sits under the phone reticle at (x, y), CSS px. pure: no sound, no light */
  reticle(x, y) { const i = pickStar(x, y, 22); if (i < 0 || !S.R) return null; const v = voiceOf(i); return { id: 'u:' + v.artist, i, fam: v.fam, plays: v.plays, kind: 'glyph', artist: v.artist, x: S.sx[i], y: S.sy[i] }; },
  /* the kiosk demo: a slow strum across 12 stars, then one corona */
  demo(ctx) { vx().then((v) => { if (v && !ctx.demoStopped && S.active) v.demo(); }); },
  stopDemo() { if (VX) VX.stopDemo(); },
  _S: S,
};

/* test hooks: read-only views of the room's state, used by tests/atlas_universe.mjs */
api._dbg = {
  voice() { return vx(); },
  corona() { return VX ? VX.state() : null; },
  neighbours(i) { return VX ? VX.neighbours(i) : null; },
  hoverStar(i, via) { hoverStar(i, via || 'mouse'); },
  unhover() { unhover(); },
  playsOf(i) { return playsOf(i); },
  summary() {
    const R = S.R, W = S.ctx && S.ctx.particles;
    return { angle: S.angle, roster: !!R, rosterKind: S.rosterKind, tierA: S.tierA, dayIdx: S.dayIdx === null ? null : !!S.dayIdx, angles: ANGLES.map((a) => a.id).join(','), fit: +(S.fit || 1).toFixed(3), coreR: +S.coreR.toFixed(3), tLines: +(S.tLines || 0).toFixed(3), lines: S.linesOn, days: !!S.D, bridges: !!S.B, nA: R ? R.nA : 0, N: R ? R.N : 0, perDot: W ? W.perDot : 0, dayK: S.dayK, day: S.D && S.dayK >= 0 ? ymd(S.D.date[S.dayK]) : null, median: api.medianDay, sel: S.sel && R ? R.names[S.sel.i] : null, armL: S.armL, armT: S.armT, famHi: S.famHi, chord: S.chord, rest: S.rest, morph: !!S.morph, dockIn: S.dockIn, dockMode: S.dockMode, errs: S.errs, tProj: +(S.tProj || 0).toFixed(3), tOver: +(S.tOver || 0).toFixed(3), placeholder: S.placeholder, frameMs: S.frameMs.length >= 30 ? +(S.frameMs.reduce((a, b) => a + b, 0) / S.frameMs.length).toFixed(3) : null, frameN: S.frameMs.length, workerMs: R ? { roster: +(R.total_ms || 0).toFixed(1), days: S.D ? +(S.D.total_ms || 0).toFixed(1) : null } : null, worker: !!S.worker && !S.wfail };
  },
  chords() { return S.chordsL.map((c) => ({ a: c.a, b: c.b, n: c.n, w: c.w, fog: c.fog, lw: c.lw })); },
  /* start the frame-cost window over, so a reading covers one view and not the views before it (at 20 fps the 240-frame
     window reaches 12 s back) */
  frameReset() { S.frameMs.length = 0; },
  armTot() { return S.B ? Array.from(S.B.armTot) : null; },
  dayPairs() { return S.dayPairs.map((p) => ({ a: p.a, b: p.b, n: p.n })); },
  lit() { const R = S.R, D = S.D, out = []; if (!R || !D || S.dayK < 0) return out; const W = S.wb; for (let j = D.topOff[S.dayK]; j < D.topOff[S.dayK + 1]; j += 2) { const i = D.top[j], k = D.top[j + 1]; if (i < 0 || i >= R.nA) continue; let c = 0; for (let d = R.bs[i]; d < R.bs[i + 1]; d++) if (W[d] === 255) c++; out.push({ i, k, lit: c, block: R.bs[i + 1] - R.bs[i] }); } return out; },
  weightsHist() { const W = S.wb, h = {}; if (!W) return h; for (let d = 0; d < W.length; d++) h[W[d]] = (h[W[d]] || 0) + 1; return h; },
  /* base weights by class in the sky: stars vs dust (dust = a placed == 1 artist or the withheld block) */
  skyWeights() { const R = S.R, W = S.wb, h = { star: {}, dust: {} }; if (!R || !W) return h; for (let d = 0; d < W.length; d++) { const a = R.dA[d], c = a < 0 || R.placed[a] === 1 ? h.dust : h.star; c[W[d]] = (c[W[d]] || 0) + 1; } return h; },
  /* the rendered weights (base x depth cue) of the stars' dots, near half vs far half of the sky */
  depthCue() {
    const W = S.ctx.particles.w, R = S.R, P = S.ctx.particles, WB = S.wb; if (!R || !S.depthAt) return null;
    const q = q3(), [d0, d1] = S.depthAt; let nN = 0, sN = 0, nF = 0, sF = 0, bad = 0, n = 0;
    for (let d = 0; d < R.N; d++) {
      const a = R.dA[d]; if (a < 0 || R.placed[a] !== 0 || WB[d] !== 255) continue;
      const o = d * 3, p = pt3(R.sky[o], R.sky[o + 1], R.sky[o + 2]), near = clamp((d1 - p[3]) / (d1 - d0), 0, 1), want = 255 * (DEPTH_MIN + (1 - DEPTH_MIN) * near);
      n++; if (Math.abs(W[d] - want) > 3) bad++;
      if (near >= 0.8) { nN++; sN += W[d]; } else if (near <= 0.2) { nF++; sF += W[d]; }
    }
    return { near: nN ? sN / nN : 0, far: nF ? sF / nF : 0, nNear: nN, nFar: nF, off: bad, n, glyph: P.glyph.reduce((x, y) => x + y, 0), N: P.n, D: q.D, at: S.depthAt };
  },
  haze() { return { keep: hazeKeep(), mask: S.hazeMask ? S.hazeMask.reduce((a, b) => a + b, 0) : 0, n: S.hazeMask ? S.hazeMask.length : 0 }; },
  dust() { return { keep: dustKeep(), home: HOME.dist, fit: S.fit || 1 }; },
  /* the linked core's on-screen extent (its stars' centres +- 2 sigma) against the stage, and the depth-cue anchors */
  core() { const R = S.R, s = S.stage; if (!R || !s) return null; let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9; for (let i = 0; i < S.ns; i++) { if (R.placed[i] !== 0 || S.sd[i] <= 0.05) continue; const r = 2 * R.sig[i] * S.ss[i]; y0 = Math.min(y0, S.sy[i] - r); y1 = Math.max(y1, S.sy[i] + r); x0 = Math.min(x0, S.sx[i] - r); x1 = Math.max(x1, S.sx[i] + r); } return { hFrac: (y1 - y0) / s.h, wFrac: (x1 - x0) / s.w, depthAt: S.depthAt }; },
  /* the day's lit clusters: plays, dots, and the rms screen radius of their dots' targets around the star */
  clusters() { const R = S.R, F = S.dayF, P = S.ctx.particles; if (!R || !F || F.k !== S.dayK) return []; return F.lit.map((e) => { const a0 = R.bs[e.i]; let s2 = 0, w2 = 0; const X = S.dayXYZ; for (let q = 0; q < e.m; q++) { const d = a0 + q, dx = P.tx[d] - S.sx[e.i], dy = P.ty[d] - S.sy[e.i]; s2 += dx * dx + dy * dy; if (X) { const ex = X[d * 3] - R.cx[e.i], ey = X[d * 3 + 1] - R.cy[e.i], ez = X[d * 3 + 2] - R.cz[e.i]; w2 += ex * ex + ey * ey + ez * ez; } } return { i: e.i, name: R.names[e.i], n: e.n, m: e.m, rms: Math.sqrt(s2 / e.m), sig: e.sig, wrms: Math.sqrt(w2 / e.m), sigPx: e.sig * S.ss[e.i], onStage: S.sd[e.i] > 0.05 && S.sx[e.i] > 0 && S.sx[e.i] < innerWidth && S.sy[e.i] > 0 && S.sy[e.i] < innerHeight }; }); },
  readout() { const d = S.dom; return d && !d.readout.hidden ? [...d.rd.children].map((p) => p.textContent).join('\n') : ''; },
  /* the lock-on sun: its star, size (cells at the arrival framing, world radius), partners, and what the last frame drew */
  sun() { const U = S.sun, R = S.R; if (!U || !R) return null; return { i: U.i, name: R.names[U.i], lit: U.lit, cells: U.cells, px0: U.px0, rw: U.rw, reach: U.reach, nb: U.nb.map((o) => ({ i: o.j, name: R.names[o.j], n: o.n })), drawn: U.drawn, old: !!S.sunOld, grid: S.grid ? { cw: S.grid.cw, ch: S.grid.ch } : null, ch0: U.ch0, sprN: U.sprN || 0, pxNow: U.rw * S.ss[U.i] }; },
  dustInBox() { const R = S.R; if (!R) return -1; let n = 0; for (let d = 0; d < R.N; d++) { const a = R.dA[d]; if (a >= 0 && R.placed[a] !== 1) continue; const x = R.sky[d * 3], y = R.sky[d * 3 + 1], z = R.sky[d * 3 + 2]; if (Math.abs(x) < 0.56 && Math.abs(z) < 0.56 && Math.abs(y) < 0.09) n++; } return n; },
  famOff() { const R = S.R; if (!R) return -1; let bad = 0; for (let d = 0; d < R.N; d++) { const f = R.dFam[d], c = R.clusters, dx = R.thr[d * 3] - c[f * 4], dy = R.thr[d * 3 + 1] - c[f * 4 + 1], dz = R.thr[d * 3 + 2] - c[f * 4 + 2]; if (Math.hypot(dx, dy, dz) > c[f * 4 + 3] * 4.2) bad++; } return bad; },
  star(i) { const R = S.R; return R ? { name: R.names[i], sx: S.sx[i], sy: S.sy[i], depth: S.sd[i], s: S.ss[i], sig: R.sig[i], placed: R.placed[i], plays: R.plays ? R.plays[i] : null, size: R.size[i] } : null; },
  starsOnScreen(n = 20) { const out = []; for (let i = 0; i < Math.min(S.ns, 388); i++) if (S.sd[i] > 0.05 && S.sx[i] > 40 && S.sx[i] < innerWidth - 40 && S.sy[i] > 40 && S.sy[i] < innerHeight - 40) out.push({ i, name: S.R.names[i], sx: S.sx[i], sy: S.sy[i], plays: S.R.plays ? S.R.plays[i] : null, size: S.R.size[i] }); return out.sort((a, b) => b.size - a.size).slice(0, n); },
  copy() { return C(); },
  /* K1: the trail segments this frame handed to the field: how many, their colours (0xRRGGBB), how many carry a pulse */
  segs() { const B = S.seg, n = S.linesOn && S.segView ? S.segView.length / 7 : 0, cols = new Set(); let pulses = 0; for (let k = 0; k < n; k++) { cols.add(B[k * 7 + 5] >>> 0); if (B[k * 7 + 6] === B[k * 7 + 6]) pulses++; } return { n, cols: [...cols], pulses }; },
  /* W43 falloff: every star dot at its class weight (STAR_W x the star's compression), every dust dot 0 or the haze weight */
  falloff() {
    const R = S.R, W = S.wb; if (!R || !W || S.angle !== 'sky' || sunLit()) return null;
    const RG = S.ring, SC = starScale(R), f = S.famHi; let bad = 0, star = 0, kept = 0, dust = 0; const cls = [0, 0, 0, 0];
    for (let d = 0; d < R.N; d++) {
      const k = R.dA[d], g = RG[d];
      if (g === DUSTC || k < 0 || R.placed[k] === 1) { dust++; if (W[d] > 0) kept++; continue; } /* a kept dust dot carries its grain (dustJit), any weight */
      star++; cls[g]++; const w = Math.max(1, (STAR_W[g] * SC[k] + 0.5) | 0); if (f < 0 && W[d] !== w) bad++;
    }
    return { bad, star, cls, dust, keptShare: dust ? kept / dust : 0, keep: dustKeep(), dustW: TN.dustW, starW: STAR_W.slice(), depthMin: DEPTH_MIN };
  },
  /* tuning (tests only): set the dust's tunables or the home pitch, then re-frame and re-weight */
  tune(o) { if (o) { Object.keys(o).forEach((k) => { if (k in TN) TN[k] = +o[k]; if (/^bloom[NRA]$/.test(k)) SKYB[k.slice(5).toLowerCase()] = +o[k]; if (k === 'bloomRLow') SKYB.rLow = +o[k]; if (k === 'bloomALow') SKYB.aLow = +o[k]; if (k === 'bloomOp') SKYB.op = o[k]; if (k === 'bloomHot') SKYB.hot = +o[k]; if (k === 'depthMin') DEPTH_MIN = +o[k];  if (k === 'starW') STAR_W.splice(0, STAR_W.length, ...o[k]); if (k === 'sig0') { SIG0 = +o[k]; S.ring = null; S.painted = ''; } }); S.dustMask = null; if (S.stage) S.fit = framing(S.stage); try { S.ctx.view.configure({ mode: 'orbit3d', distMin: 0.06, distMax: Math.max(2.6, 3.2 * S.fit), home: fitted(HOME), drift: true, speed: 'slow', look: (k) => lookAt(k) }); S.ctx.view.home({ instant: true }); } catch (e) {} weights(); setLabels(); } return Object.assign({ pitch: HOME.pitch, starW: STAR_W.slice(), fit: S.fit }, TN); },
  hud() { const h = document.getElementById('ai-hud'); return h && !h.hidden ? h.textContent : ''; },
  dayDates() { const D = S.D; if (!D) return null; return Array.from(D.date).map(ymd); },
};
