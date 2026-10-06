/* package M7 — the aggregation-scale ladder (BUILD_SPEC_V2 §1.9, D7).
   ctx.ladder = { readout(text|null), level(id|null), onPick(fn) } */

const ONE_PLAY = 1, SEVEN_YEARS = 97427, SNAP_PX = 14, POLL_MS = 250;
const LOG_SPAN = Math.log10(SEVEN_YEARS); /* log10(ONE_PLAY) is 0, so this is the whole axis */
/* the shown N moves only when the live one is more than 15% away from it, or when the camera zooms: the threshold's
   sphere breathes with the bass, and a readout that follows every breath reads as noise. once the live value has held
   still for two seconds (8 polls within 4%) and the shown one is more than 6% off it (past two-figure rounding, so a
   value sitting on a rounding edge never flickers) and more than one dot's worth of plays off (at N near 12 one step
   of the median is 8%), the shown one settles onto it: a room that finished flying in is not left reading a number
   from mid-flight */
const HYST = 0.15, ZOOM_EPS = 0.005, STEADY_N = 8, STEADY_SPAN = 1.04, SETTLE = 0.06;
const ROW_PX = 15; /* one label row: closer than this to a tick, the marker's readout joins that tick's row */
/* the landscape strip's column: rooms get the stage left of it (ctx.atlas.insets.right = the strip's footprint + this
   gutter), and nothing the strip draws may leave it, so no level name, value or readout ever sits over a room */
const GUTTER = 24, FIT_PX = 4;
const STRIP_Q = '(min-aspect-ratio:115/100) and (min-height:481px)'; /* ladder.css's strip query, verbatim */
/* the phone chip lives in the brand bar's row, never on the stage: rooms own every pixel of stage(), and a chip there
   hid their numbers (calendar's "73.8% served", yours' demo line). it takes the first of these that fits clear of the
   bar's own contents; failing all, the stage's right margin (landscape phones, where the bar holds the menu) */
const CHIP_GAP = 10;
/* W30: the desktop strip's box must fit inside ATL.stage0()'s reserved right margin (86.4px at 1440), and no
   gcdatlas-width name or "1 glyph ≈ N plays" sentence renders that small. so at rest the box holds only the
   instrument itself (rail, ticks, marker, the compact .al-mini pill); everything worded (names, values, the
   caption, the marker's full pill, the foot readout) is revealed by ladder.css only on rail hover/focus/drag
   or the phone sheet opening, the same convention §1.9's values already used. those revealed elements are
   positioned off the tick (ladder.css `right`), not off this box, so they are free to read outward over the
   stage while shown; nothing does at rest, when the box (and so ctx.atlas.insets.right) is all that is real */
/* W32: unlabelled minor dashes at each plays-per-mark decade, purely textural (the rail "reads as an
   instrument"); hidden when the axis goes ordinal (non-monotonic data), since a decade has no meaning there */
const MINOR_DECADES = [10, 100, 1000, 10000];
/* R7B: the knob. the rail's vertical geometry stays the logical axis (ticks, marker, drag, snap), but nothing of it is
   drawn: a rotary knob of dial glyphs is, with the scale names set round it like the stops on an amp. KD is the knob's
   box, KC its centre's distance in from the rail's right edge (the knob sticks 4px past the rail). */
const KD = 84, KC = 38, RING = '∙◦◠◌◇○◖◔◐◓◕◎◍●', RING_R = 35, STOP_R = 48;
const ROWS = false; /* the old per-row readouts (lit row, marker pill) are replaced by the knob's centre, serif name and foot line */

/* §1.9's own derivation of each tick from the shipped Tier-B files (play-weighted medians of universe_days `n`,
   universe_artists_all `plays`, the 14 family totals, the four complete years). the M7 test re-derives them from
   exhibit/data and fails if a data change moves one. they put the ticks on the log axis from the first frame, so the
   marker and the lit level mean something before the lazy load, which recomputes them and replaces these. */
const SEED = { day: 97, artist: 110, genre: 19897, year: 20633 };

/* D7 order and the honest §1.9 route table. C1's tours.js LADDER.levels overrides route/name per id below, never the
   order and never an invented value. */
const LEVELS = [
  { id: 'oneplay', name: 'ONE PLAY', route: { stop: 'wall', angle: 'sorted', pose: { z: 999 } } },
  { id: 'session', name: 'SESSION', route: { stop: 'wheel', angle: 'bundled' } },
  { id: 'day', name: 'DAY', route: { stop: 'universe', angle: 'day' } },
  { id: 'artist', name: 'ARTIST', route: { stop: 'universe', angle: 'star' } },
  { id: 'genre', name: 'GENRE', route: { stop: 'universe', angle: 'threads' } },
  { id: 'year', name: 'YEAR', route: { stop: 'calendar', angle: 'ribbon' } },
  { id: 'sevenyears', name: 'THE WHOLE LOG', route: { stop: 'universe', angle: 'sky' } },
];

/* what a glyph is at a stop (VERIFY_r1_honesty P1-6). "1 glyph ≈ N plays" is printed only where every drawn dot is one
   play AND the number of dots in each place is the real number of plays there: the threshold, the wall, the calendar,
   the clock, the make room's wall and the universe. everywhere else N would count a design (the game's clusters, the
   graves), a null test (the pile), the maps' readings (the curve) or an even-handed deal of dots to artists or tracks
   (the map cloud, the listeners, the make wheel: P.artist is a hash, not a play count), so the ladder prints no number
   and no marker there and says why. a room with a truer unit calls ctx.ladder.readout(text), which always wins. a stop
   this table does not know gets no number: a new room has to be checked before the ladder counts its dots.
   a room module may declare its own answer instead: `ladderNote(angleId)` (or a plain `ladderNote` value) returning
   null when every drawn dot is one play in its real place, or a short reason when it is not; undefined falls back here. */
const NO_COUNT = 'no play count here';
/* W31: the phone chip is one line and never has room for NO_COUNT's whole sentence, so a no-count stop shows
   the rung noteFor() already names instead ("⇕ artist", "⇕ shares") — a short word per known reason, keyed on
   the sentence itself so a room's own custom ladderNote (VERIFY_r1_honesty's escape hatch) still degrades to
   the bare icon rather than guessing at a word that was never written for this table */
const RUNG_FOR_NOTE = {
  'artist sizes are not play counts': 'artist',
  'the columns are the maps’ readings': 'readings',
  'the clusters are drawn to shape': 'clusters',
  'the pile is the null test': 'pile',
  'the graves are drawn to shape': 'graves',
  'track sizes are not play counts': 'track',
  'the bars are shares': 'shares',
  'the doors are drawn to shape': 'doors',
};
function noteFor(id, angle, mod) {
  if (mod && mod.ladderNote !== undefined) {
    let v; try { v = typeof mod.ladderNote === 'function' ? mod.ladderNote(angle) : mod.ladderNote; } catch (e) { v = ''; }
    if (v === null || typeof v === 'string') return v;
  }
  switch (id) {
    case 'threshold': case 'wall': case 'calendar': case 'clock': case 'universe': return null;
    case 'make': return mod && mod.beat === 3 ? 'track sizes are not play counts' : null;
    case 'map': return angle === 'curve' || (mod && mod.mode === 'curve') ? 'the columns are the maps’ readings' : 'artist sizes are not play counts';
    case 'listeners': return 'artist sizes are not play counts';
    case 'game': return 'the clusters are drawn to shape';
    case 'graveyard': return mod && mod.state && mod.state !== 'idle' ? 'the pile is the null test' : 'the graves are drawn to shape';
    case 'yours': return 'the bars are shares';
    default: return '';
  }
}

const fmt = (n) => Math.round(n).toLocaleString('en-US');
/* live text is rewritten in its existing Text node, never by textContent: WebKit drops the click of a press whose
   pressed node left the document in between, so a readout changing under a finger ate the phone chip's tap */
function setText(el, str) {
  const t = el.firstChild;
  if (t && t.nodeType === 3 && !t.nextSibling) { if (t.data !== str) t.data = str; } else el.textContent = str;
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/* two significant figures, whole plays: 104 -> 100, 156 -> 160, 1,234 -> 1,200, 7 -> 7 */
function sig2(n) {
  if (n < 10) return Math.max(1, Math.round(n));
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

/* the four middle levels are play-weighted medians (§1.9): the size of the day, artist, genre or year a typical PLAY
   sits in, not the size of a typical day or artist (a typical artist has 2 plays, a typical day 56). every place a
   value is printed says so: the aria text here, and the note shown with the values */
const TYPICAL = new Set(['day', 'artist', 'genre', 'year']);
const TYPICAL_NOTE = 'day, artist, genre, year: those of a typical play';

function wmedian(pairs) {
  const sorted = pairs.slice().sort((a, b) => a[0] - b[0]);
  const total = sorted.reduce((s, p) => s + p[1], 0), half = total / 2;
  let c = 0;
  for (const [v, w] of sorted) { c += w; if (c >= half) return v; }
  return sorted.length ? sorted[sorted.length - 1][0] : 0;
}

export function mount(ctx, deps) {
  if (!ctx.atlas || !ctx.atlas.on) return null;
  const GF = (deps && deps.GF) || null, P = (deps && deps.P) || null, ROOMS = (deps && deps.rooms) || [];
  /* no glyph pass this visit (?glyph=0, or glyphfield.js failed to load and the shell kept its stub): every mark on
     screen is one dot, so the readout counts dots (four plays each on a phone), never a glyph that is not drawn */
  const DOTS = !!((deps && deps.NOGLYPH) || !GF || GF.stub);
  const UNIT = DOTS ? 'dot' : 'glyph';

  const levels = LEVELS.map((lv) => ({ ...lv }));
  ((deps && deps.LADDER && deps.LADDER.levels) || []).forEach((row) => {
    const lv = levels.find((l) => l.id === row.id);
    if (!lv) return;
    if (row.name) lv.name = row.name;
    if (row.route !== undefined) lv.route = row.route;
  });
  const byId = {}; levels.forEach((lv) => { byId[lv.id] = lv; });
  const DAY_ROUTE = byId.day.route; /* kept so refreshDayRung() can restore it if it nulls the route and later learns Tier B did load */
  byId.oneplay.value = ONE_PLAY; byId.sevenyears.value = SEVEN_YEARS;
  Object.keys(SEED).forEach((k) => { byId[k].value = SEED[k]; });

  /* every mutable binding up front: several functions below are defined (and some run) before their
     own textual `let`, and a `let` read/written ahead of its own statement throws (temporal dead zone) */
  let ordinal = false, dataPromise = null;
  let overrideText = null, overrideLevel = null;
  let mode = 'plays', note = null, modeKey = '', shownN = null, shownZ = null;
  const ring = [];
  let litIdx = -1, markerFrac = 0, markOn = true;
  let dragging = false, manual = false, dragCenter = null, dragLastY = 0;
  let panelOpen = false, selIdx = 0, hovered = false, focused = false;
  let railH = 400;
  let insetR = -1, chipKey = '', chipDown = false;
  /* K4: DAY only routes through universe's 'day' angle, which only exists once universe_days_index.json (Tier
     B) has loaded; null until known, so the rung stays offered until the site can actually tell it is absent */
  let daysAvailable = null, daysProbeP = null;
  const fitMemo = new Map();
  const last = { text: null, aria: null, now: null, now_i: -1, inrow: null, vnow: null, mlab: null, mtop: null, under: -1, mini: null, chip: null, voice: null };

  function computeTicks(daysFile, artistsFile) {
    const days = (daysFile && daysFile.days) || [];
    const plays = (artistsFile && artistsFile.plays) || [];
    const names = (artistsFile && artistsFile.name) || [];
    if (!days.length || !plays.length) return;

    const dayMed = wmedian(days.map((d) => [d.n, d.n]));
    const artistMed = wmedian(plays.map((p) => [p, p]));
    const famTotals = new Array(14).fill(0);
    days.forEach((d) => (d.fam || []).forEach((v, i) => { famTotals[i] += v; }));
    const genreMed = wmedian(famTotals.map((t) => [t, t]));
    const byYear = {};
    days.forEach((d) => { const y = d.d.slice(0, 4); byYear[y] = (byYear[y] || 0) + d.n; });
    const completeYears = ['2022', '2023', '2024', '2025'].filter((y) => byYear[y] != null);
    const yearMed = completeYears.length ? wmedian(completeYears.map((y) => [byYear[y], byYear[y]])) : 0;
    const seven = days.reduce((s, d) => s + d.n, 0) || SEVEN_YEARS;

    byId.day.value = dayMed; byId.artist.value = artistMed; byId.genre.value = genreMed;
    byId.year.value = yearMed; byId.sevenyears.value = seven;
    /* never rearrange D7's order: a non-monotonic result keeps the real values but spaces the ticks ordinally,
       with no marker and no lit level (a log-placed marker on an ordinal axis would point at the wrong level) */
    const seq = [ONE_PLAY, dayMed, artistMed, genreMed, yearMed, seven];
    ordinal = !seq.every((v, i) => i === 0 || v > seq[i - 1]);
    let topIdx = 0; for (let i = 1; i < plays.length; i++) if (plays[i] > plays[topIdx]) topIdx = i;
    if (names[topIdx]) byId.artist.route = { ...byId.artist.route, focus: { artist: names[topIdx] } };
    render();
  }

  /* K4: DAY only exists once universe_days_index.json is in; hide the rung (and stop offering its route) the
     moment that is known to have failed, on both platforms (the phone sheet and the desktop strip share this
     DOM). unknown (still loading, or never asked) leaves the rung as it was: offered, same as every other. */
  function refreshDayRung() {
    const i = idxOf('day'); if (i < 0) return;
    const off = daysAvailable === false;
    tickEls[i].classList.toggle('al-no-rung', off);
    byId.day.route = off ? null : DAY_ROUTE;
  }
  function setDaysAvailable(v) { if (daysAvailable === v) return; daysAvailable = v; refreshDayRung(); }
  /* R3 M7-a: peek('universe').has.days is the live, authoritative K4 source (false the instant the room's own
     index probe resolves absent, true once it loaded, null only mid-probe or before the room has ever mounted)
     — the same source tour.js's own daysHas() reads, kept consistent rather than re-deriving the answer. read
     at mount and on every poll (liveUpdate already runs one every POLL_MS), so a room that mounts and learns K4
     AFTER the ladder still updates the rung within one poll, no interaction required. */
  function daysHas() { const u = ctx.peek && ctx.peek('universe'); return u && u.has && typeof u.has.days === 'boolean' ? u.has.days : null; }
  function syncDaysHas() { const d = daysHas(); if (d != null) setDaysAvailable(d); }
  /* fallback for every stop reached before the room has mounted at all (peek() has nothing yet): the same
     lightweight index fetch, but started unconditionally at mount — not gated behind the rail's own first
     hover/focus/drag, which a visit that never touches the ladder (a tour walking wall -> threshold -> finale)
     may never give it before a DAY-lit stop needs the answer (round-3 M7-a: exactly that finding). */
  function probeDaysIndex() {
    if (daysProbeP) return daysProbeP;
    daysProbeP = ctx.data('universe_days_index').then(() => setDaysAvailable(true), () => setDaysAvailable(false));
    return daysProbeP;
  }
  function ensureData() {
    if (dataPromise) return dataPromise;
    dataPromise = Promise.all([ctx.data('universe_days'), ctx.data('universe_artists_all')])
      .then(([d, a]) => computeTicks(d, a)).catch(() => {});
    return dataPromise;
  }

  /* ---------------------------------------------------------------------------------------- DOM */
  const root = document.createElement('div');
  root.className = 'atlas-ladder';
  /* the idle fade dims the words, never the box: the strip's ground is the box's ::before, and a ground at half
     strength let a zoomed field swamp the names it is there to keep legible (VERIFY_r3_beauty P1-5) */
  root.innerHTML =
    '<div class="al-cap" data-idle="dim">PLAYS PER MARK</div>' +
    '<div class="al-rail" data-idle="dim">' +
    '<div class="al-track" role="slider" tabindex="0" aria-orientation="vertical" ' +
    'aria-label="aggregation scale: how many plays one mark stands for" ' +
    'aria-valuemin="0" aria-valuemax="' + (levels.length - 1) + '" aria-valuenow="0">' +
    '<div class="al-knob" aria-hidden="true"><div class="al-kbody"><div class="al-kdisc"></div><div class="al-kring"></div><div class="al-kstops"></div>' +
    '<div class="al-kc"></div><div class="al-kp"><i>°</i></div></div><div class="al-voice"></div><div class="al-pad"></div></div>' +
    '<div class="al-line" aria-hidden="true"></div><div class="al-marker" aria-hidden="true"></div></div>' +
    '<svg class="al-leaders" aria-hidden="true"></svg>' +
    '<div class="al-mlab" aria-hidden="true"></div>' +
    '<div class="al-mini" aria-hidden="true"></div>' +
    '</div>' +
    '<div class="al-readout" data-idle="dim"></div>' +
    '<div class="al-note" aria-hidden="true" data-idle="dim"></div>' +
    /* W31: the phone sheet's own zoom step, since the chip that used to be the only way in no longer has the
       whole strip's drag surface behind it once it is just a stage-corner readout. desktop never shows these
       (they render only inside .al-open, which a mouse hover never sets — the panel/scrim/chip are hidden
       outright in the desktop query) */
    '<div class="al-zoom"><button type="button" class="al-zoom-btn" data-dir="-1" aria-label="zoom out">−</button>' +
    '<button type="button" class="al-zoom-btn" data-dir="1" aria-label="zoom in">+</button></div>';
  const railEl = root.querySelector('.al-rail');
  const trackEl = root.querySelector('.al-track');
  const markerEl = root.querySelector('.al-marker');
  const capEl = root.querySelector('.al-cap');
  const readoutEl = root.querySelector('.al-readout');
  const mlabEl = root.querySelector('.al-mlab');
  const miniEl = root.querySelector('.al-mini');
  root.querySelector('.al-note').textContent = TYPICAL_NOTE;
  const kcEl = root.querySelector('.al-kc'), voiceEl = root.querySelector('.al-voice'), kptrEl = root.querySelector('.al-kp');
  const ringEls = [...RING].map((c, k) => {
    const g = document.createElement('span'); g.className = 'al-kg'; g.textContent = c;
    g.style.setProperty('--a', (k * 360 / RING.length).toFixed(2) + 'deg'); g.dataset.k = k;
    root.querySelector('.al-kring').appendChild(g); return g;
  });
  const stopEls = LEVELS.map(() => { const d = document.createElement('i'); root.querySelector('.al-kstops').appendChild(d); return d; });
  /* W32: minor decade dashes, positioned once (their frac never changes) and drawn under the named ticks */
  MINOR_DECADES.filter((v) => v > ONE_PLAY && v < SEVEN_YEARS).forEach((v) => {
    const m = document.createElement('div');
    m.className = 'al-minor'; m.setAttribute('aria-hidden', 'true');
    m.style.top = (clamp01(Math.log10(v) / LOG_SPAN) * 100).toFixed(3) + '%';
    railEl.insertBefore(m, railEl.firstChild);
  });
  const STRIP = typeof matchMedia === 'function' ? matchMedia(STRIP_Q) : { matches: false };
  const leadersEl = root.querySelector('.al-leaders');
  const SVGNS = 'http://www.w3.org/2000/svg';
  /* the tick buttons are siblings of the slider, not descendants of it (a focusable child inside
     role=slider is an axe "nested-interactive" violation), positioned over the shared rail instead.
     each carries one label row read right to left off the tick: the level name (always shown, clickable),
     its sourced value (on hover/focus/drag) and, on the lit level only, the live readout */
  const tickEls = levels.map((lv) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'al-tick'; b.dataset.id = lv.id; b.tabIndex = -1;
    b.innerHTML = '<span class="al-lab"><span class="al-now"></span><span class="al-val"></span><span class="al-name">' + lv.name + '</span></span>';
    b.addEventListener('click', () => pickTick(lv));
    railEl.appendChild(b);
    return b;
  });
  const nowEls = tickEls.map((b) => b.querySelector('.al-now'));
  /* R3 M7-b: the phone sheet's own leader line, one per rung — a straight run from the tick's true mark to
     wherever al-open's evenly-spaced list puts its name (render()'s own dy, below). invisible everywhere else
     (ladder.css gates opacity on .al-open) and zero-length wherever the two positions still coincide. */
  const leaderEls = levels.map(() => {
    const l = document.createElementNS(SVGNS, 'line');
    l.setAttribute('class', 'al-leader'); leadersEl.appendChild(l);
    return l;
  });
  document.body.appendChild(root);

  const chip = document.createElement('button');
  chip.type = 'button'; chip.className = 'atlas-ladder-chip'; chip.dataset.idle = 'dim';
  chip.setAttribute('aria-haspopup', 'true'); chip.setAttribute('aria-expanded', 'false');
  chip.setAttribute('aria-label', 'aggregation scale panel');
  /* W31: 44x44 hit, <=110x29 visual — the button itself is the (invisible) 44px hit target, and .al-chip-pill,
     sized to its own content, is the small line actually drawn, centred inside it */
  chip.innerHTML = '<span class="al-chip-pill"><span class="al-chip-ic" aria-hidden="true">⇕</span><span class="al-chip-txt"></span></span>';
  document.body.appendChild(chip);
  const chipTxt = chip.querySelector('.al-chip-txt');

  const scrim = document.createElement('div');
  scrim.className = 'atlas-ladder-scrim';
  document.body.appendChild(scrim);

  /* ------------------------------------------------------------------------------------ geometry */
  const idxOf = (id) => levels.findIndex((l) => l.id === id);
  function fracFor(id) {
    const lv = byId[id];
    if (ordinal) return idxOf(id) / (levels.length - 1);
    if (id === 'oneplay') return 0;
    if (id === 'sevenyears') return 1;
    if (id === 'session') return clamp01(Math.log10(byId.day.value) / LOG_SPAN) / 2;
    return clamp01(Math.log10(lv.value) / LOG_SPAN);
  }
  function nearestIdx(n) {
    const l = Math.log10(Math.max(1, n)); let best = -1, bd = Infinity;
    levels.forEach((lv, i) => {
      /* SESSION has no number, so nothing is ever nearest to it; DAY is the same the moment K4 hides its rung
         (Tier B absent) — a hidden tick must never be the one thing "exactly one boxed rung" (W32) expects lit */
      if (lv.id === 'session' || lv.value == null || tickEls[i].classList.contains('al-no-rung')) return;
      const d = Math.abs(Math.log10(lv.value) - l); if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function ariaTextFor(lv) {
    const nm = lv.name.toLowerCase();
    if (lv.id === 'session') return 'session: who held the wheel, no play count on this rung';
    if (lv.value == null) return nm;
    const n = fmt(lv.value) + (lv.value === 1 ? ' play' : ' plays');
    if (lv.id === 'oneplay') return nm + ': ' + n;
    if (lv.id === 'sevenyears') return nm + ': every play, ' + n;
    if (TYPICAL.has(lv.id)) return nm + ': a typical play’s ' + lv.id + ' has about ' + n;
    return nm + ', about ' + n;
  }
  /* the true log position of a value -> its place on the displayed (nudged) axis: piecewise linear through the ticks */
  function dispFrac(f) {
    if (!(levels[0]._frac != null)) return f;
    if (f <= levels[0]._true) return levels[0]._frac;
    for (let i = 1; i < levels.length; i++) {
      const a = levels[i - 1], b = levels[i];
      if (f <= b._true) return b._true > a._true ? a._frac + (b._frac - a._frac) * (f - a._true) / (b._true - a._true) : b._frac;
    }
    return levels[levels.length - 1]._frac;
  }
  function positionMarkerFrac(frac) { markerFrac = clamp01(frac); const t = (markerFrac * 100).toFixed(3) + '%'; markerEl.style.top = t; miniEl.style.top = t; knobTo(markerFrac); }
  /* the pointer's angle at a display fraction: piecewise linear between the stops' own angles, the same map dispFrac
     inverts, so the pointer is on a stop exactly when the marker is on its tick. the glyph ring warms toward it */
  let knobKey = '';
  function knobTo(f) {
    if (!(levels[0]._ang != null)) return;
    let a = levels[levels.length - 1]._ang;
    if (f <= levels[0]._frac) a = levels[0]._ang;
    else for (let i = 1; i < levels.length; i++) {
      const p = levels[i - 1], q = levels[i];
      if (f <= q._frac) { a = q._frac > p._frac ? p._ang + (q._ang - p._ang) * (f - p._frac) / (q._frac - p._frac) : q._ang; break; }
    }
    /* the knob's own face is the dial glyph for where it points: ∙ at one play, filling up to ● at the whole log */
    const gi = Math.round(clamp01((f - levels[0]._frac) / ((levels[levels.length - 1]._frac - levels[0]._frac) || 1)) * (RING.length - 1));
    if (kcEl.textContent !== RING[gi]) kcEl.textContent = RING[gi];
    const k = a.toFixed(1); if (k === knobKey) return; knobKey = k;
    kptrEl.style.setProperty('--ap', k + 'deg');
    ringEls.forEach((el, j) => {
      let d = Math.abs((((a - j * 360 / ringEls.length) % 360) + 540) % 360 - 180);
      el.style.opacity = (0.45 + 0.55 * Math.max(0, 1 - d / 48)).toFixed(2);
    });
  }
  function render() {
    setText(capEl, ordinal ? 'SCALE' : 'PLAYS PER MARK');
    root.classList.toggle('al-ordinal', ordinal); /* W32: the decade dashes assume a log axis; hide them on the rare ordinal fallback */
    /* D7's order is monotonic in value but two neighbours (day/artist, genre/year) sit within a few px of each
       other in log space; nudge the DISPLAYED marks apart (never a value) so every tick and its name stays its own
       row, same idea as label decluttering. the marker goes through the same nudge (dispFrac), so a readout equal
       to a level's value sits on that level's row, not on its neighbour's */
    fitMemo.clear();
    const trackH = railH = trackEl.clientHeight || 400, minGap = 22 / trackH;
    let prevFrac = -Infinity;
    levels.forEach((lv, i) => {
      let f = lv._true = fracFor(lv.id);
      if (f < prevFrac + minGap) f = prevFrac + minGap;
      prevFrac = f; lv._frac = f;
      tickEls[i].style.top = (f * 100).toFixed(3) + '%';
      const valEl = tickEls[i].querySelector('.al-val');
      setText(valEl, lv.id === 'session' ? '' : lv.value != null ? fmt(lv.value) : '');
      tickEls[i].setAttribute('aria-label', ariaTextFor(lv));
    });
    /* R2-P1 tap target, second pass: .al-name's ::before wants a 44px-tall reach centred on the row — fine for
       every row except the two the comment above already names (day/artist, genre/year), nudged to sit exactly
       minGap (22px) apart. Unclamped, both neighbours would claim the same pixels there, and since the later
       one in DOM paints on top, it would win the whole shared strip, leaving the earlier one's reach toward it
       at ~0 (found live: two un-clamped 22px insets tie exactly at each other's own centre, and worse, since
       ladder.css's insets are measured from al-name's own EDGE, not its centre, 22px each way on an already
       ~19px pill reaches past its neighbour's own natural (unextended) box too). Split each gap between
       CENTRES in half, then subtract the pill's own half-height (already free, built into its natural box) to
       get the ::before's own inset from the edge — every row still reaches the full 44 where there's room, the
       two tight pairs get the most either can have (11px each way from centre) without ever crossing the
       midpoint into a neighbour's own territory. */
    const halfH = tickEls[0].querySelector('.al-name').getBoundingClientRect().height / 2;
    /* R3 M7-b: the phone sheet (.al-open) never inherits the desktop split above — with 7 rungs in the same
       <=340px rail, the two tight pairs' real gap (the whole reason for that split) can be as little as 22px,
       so no split of it will ever clear 44px (found live: 42/42/31/31/20-23/31-34px). Its rows lay out on an
       even, index-spaced grid instead (openGap, constant for every row, never crowded by a data value sitting
       close to its neighbour's), each with the desktop split's own min(24,gap/2) headroom — always the full 24,
       since openGap is >=44px at every rail height this file ships to (a 320x568 sheet's worst case is 340px's
       50vh floor / 6 = 47px). The row's true tick keeps its real log position (the instrument stays honest);
       only its NAME is carried to the list slot, by a transform (--al-open-dy) ladder.css applies only inside
       .al-open, with a leader line (leaderEls) drawn for exactly the distance carried. */
    /* R7B: every name is carried off its tick's true (log) row onto a stop on an arc round the knob, which sits at the
       rail's middle. strip: tight arc; phone sheet: the stops are 44px apart so each name keeps a real reach, and the
       arc's radius is whatever the sheet's width leaves. the tick itself never moves, so the instrument stays honest */
    const SM = STRIP.matches;
    /* at rest the knob is small and only it is drawn. hovered / focused / dragged (strip) or the sheet open, the knob turns up to
       scale S about a centre KCX in from the rail's right edge and the names stand on an arc of radius Rn round it, each with its
       plays-per-mark count. strip: ~150px ring. sheet: as big as the sheet's width leaves room for beside the names */
    const W = root.clientWidth || innerWidth;
    const S = SM ? 1.78 : Math.max(1.2, Math.min(2.1, (W - 277) / 48));
    const KCX = SM ? 82 : Math.round(48 * S + 2);
    const Rn = SM ? 100 : 138;
    const g = SM ? 30 : 44;
    root.style.setProperty('--al-s', S.toFixed(3));
    root.style.setProperty('--al-kx', (KCX - KC) + 'px');
    root.style.setProperty('--al-vy', (48 * S - 42 + (SM ? 18 : 6)).toFixed(1) + 'px');
    /* the strip's rail can be crushed by a tall info card (the end card): the knob then rides up so its arc stays above the rail's foot */
    const ky = SM ? Math.min(trackH / 2, trackH - 150) : trackH / 2;
    root.style.setProperty('--al-ky', ky.toFixed(1) + 'px');
    const half = SM ? g / 2 - 2.5 : Math.min(24, g / 2), mid = levels.length >> 1;
    levels.forEach((lv, i) => {
      const ay = (i - mid) * g, phi = Math.asin(Math.max(-1, Math.min(1, ay / Rn)));
      lv._ang = -90 - phi * 180 / Math.PI; /* the pointer's css rotation (clockwise from up) at this stop */
      const nameEl = tickEls[i].querySelector('.al-name');
      nameEl.style.setProperty('--al-hit-up', Math.max(0, half - halfH).toFixed(1) + 'px');
      nameEl.style.setProperty('--al-hit-down', Math.max(0, half - halfH).toFixed(1) + 'px');
      const lab = tickEls[i].querySelector('.al-lab');
      lab.style.setProperty('--al-arc-dy', (ky + ay - lv._frac * trackH).toFixed(1) + 'px');
      lab.style.setProperty('--al-arc-r', (9 + KCX + Rn * Math.cos(phi)).toFixed(1) + 'px');
      stopEls[i].style.setProperty('--a', lv._ang.toFixed(2) + 'deg');
    });
    knobKey = '';
    publishInset();
    paint();
  }

  /* CRIT6A: the rest-state number rides the marker at the rail, where the rung names also end (>=1200 px they rest dim, the lit
     one boxed), so "12" sat on SESSION and "140" on ARTIST. when a shown name shares the number's row, the number steps left
     of it ("140 ARTIST"), same height, same marker. measured only when its text, place or the layout changes */
  let miniKey = '';
  function placeMini(txt, lit) {
    const key = txt + '|' + (markOn ? markerFrac.toFixed(4) : '-') + '|' + lit + '|' + railH + '|' + innerWidth + 'x' + innerHeight;
    if (key === miniKey) return;
    miniKey = key; miniEl.style.right = '';
    if (!txt || !markOn) return;
    const m = miniEl.getBoundingClientRect(); if (!m.width) return;
    const tr = trackEl.getBoundingClientRect(), cy = tr.top + markerFrac * tr.height, top = cy - m.height / 2 - 2, bot = cy + m.height / 2 + 2;
    let L = Infinity;
    tickEls.forEach((t) => {
      const n = t.querySelector('.al-name'), q = n.getBoundingClientRect();
      if (!q.width || q.top >= bot || q.bottom <= top || q.right <= m.left || q.left >= m.right || +getComputedStyle(n).opacity < 0.05) return;
      L = Math.min(L, q.left);
    });
    if (L < Infinity) miniEl.style.right = Math.round(5 + m.right - L + 6) + 'px';
  }

  /* ------------------------------------------------------------------------------------- readout */
  function fmtReadout(n) { return '1 ' + UNIT + ' ≈ ' + fmt(n) + (Math.round(n) === 1 ? ' play' : ' plays'); }
  /* on a level's own row the caption above the rail already says the unit (PLAYS PER MARK), so the row drops it: the
     row then fits the column beside its name. the pill riding the marker and the line under the rail keep the whole */
  function fmtRow(n) { return '1 ' + UNIT + ' ≈ ' + fmt(n); }
  function fmtAria(n) { return '1 ' + UNIT + ' is about ' + fmt(n) + (Math.round(n) === 1 ? ' play' : ' plays'); }
  /* the universe's override names its level ("DAY · 2023-10-14"); on the lit row the name is already there */
  function detailFor(text, lv) {
    const m = /^\s*([^·]+?)\s*·\s*(.+)$/.exec(text || '');
    return m && lv && m[1].toUpperCase() === lv.name.toUpperCase() ? m[2] : text;
  }
  function paint() {
    let text = '', short = '', aria = '', lit = -1, frac = null, nowText = '', pill = '';
    if (mode === 'override') {
      text = short = aria = overrideText;
      if (overrideLevel) { lit = idxOf(overrideLevel); frac = byId[overrideLevel]._frac; nowText = pill = detailFor(overrideText, byId[overrideLevel]); }
    } else if (mode === 'note') {
      text = aria = NO_COUNT + (note ? ': ' + note : ''); short = NO_COUNT;
    } else if (shownN != null) {
      text = short = fmtReadout(shownN); aria = fmtAria(shownN);
      if (!ordinal) { lit = nearestIdx(shownN); frac = dispFrac(clamp01(Math.log10(shownN) / LOG_SPAN)); nowText = fmtRow(shownN); pill = text; }
    }
    /* W30/W31: the two compact, always-legible forms — the desktop rest-state pill (bare number, no unit
       words: the caption states those once hover reveals it) and the phone chip's one line, which per W31
       must show the rung's name on a no-count stop, never NO_COUNT's full sentence. the icon itself lives
       only in the markup's own .al-chip-ic span (mount()); chipShort is text-only, or the chip read it
       twice — verify-1 finding "the chip also reads '⇕ ⇕ readings'" */
    let miniTxt = '', chipShort = '';
    if (mode === 'plays' && shownN != null) { miniTxt = fmt(shownN); chipShort = fmt(shownN) + ' / ' + UNIT; }
    else if (mode === 'note') { const w = RUNG_FOR_NOTE[note]; miniTxt = w || ''; chipShort = w || ''; }
    else if (mode === 'override') { const d = overrideLevel ? pill : short; chipShort = d || short || ''; }
    if (manual) { lit = selIdx; frac = levels[selIdx]._frac; nowText = pill = ''; aria = ariaTextFor(levels[selIdx]); }
    litIdx = lit;

    if (!dragging) {
      markOn = frac != null; root.classList.toggle('al-nomark', !markOn);
      if (markOn) positionMarkerFrac(frac);
    }
    tickEls.forEach((el, i) => { el.classList.toggle('al-sel', i === lit); stopEls[i].classList.toggle('al-sel', i === lit); });
    const vs = lit >= 0 ? levels[lit].name.toLowerCase() : mode === 'note' ? 'no play count' : '';
    if (last.voice !== vs) { setText(voiceEl, vs); last.voice = vs; }
    /* the live number sits where it really is on the axis: on the marker. only when the marker is at the lit level
       (within one row) does it join that level's row; otherwise the lit name is a landmark and the number rides the
       marker, so "1 glyph ≈ 12 plays" is never printed beside DAY (a day is 97) as if the two were the same */
    let mlab = '', under = -1;
    if (dragging) nowText = ''; /* mid-drag the line under the strip reads live; no row claims the moving number */
    else if (ROWS && lit >= 0 && frac != null && nowText) {
      if (Math.abs(levels[lit]._frac - frac) * railH >= ROW_PX) {
        mlab = pill; nowText = '';
        let bd = ROW_PX; levels.forEach((lv, i) => { const d = Math.abs(lv._frac - frac) * railH; if (i !== lit && d < bd) { bd = d; under = i; } });
      }
    } else nowText = '';
    /* a row or pill that would leave the ladder's column (a long artist name, a five-figure N beside a long level name)
       is not drawn there: the line under the rail says it instead. measured once per text and layout, remembered */
    const fk = (mlab ? 'm|' + mlab : 'r' + lit + '|' + nowText) + '|' + colKey();
    const fitKnown = fitMemo.has(fk);
    if ((mlab || nowText) && fitKnown && !fitMemo.get(fk)) { mlab = ''; nowText = ''; under = -1; }
    if (last.mlab !== mlab) { setText(mlabEl, mlab); last.mlab = mlab; }
    if (mlab) { const t = (clamp01(frac) * 100).toFixed(3) + '%'; if (last.mtop !== t) { mlabEl.style.top = t; last.mtop = t; } }
    if (last.under !== under) { if (last.under >= 0) tickEls[last.under].classList.remove('al-under'); if (under >= 0) tickEls[under].classList.add('al-under'); last.under = under; }
    if (last.now_i !== lit || last.now !== nowText) {
      if (last.now_i >= 0 && last.now_i !== lit) { setText(nowEls[last.now_i], ''); tickEls[last.now_i].classList.remove('al-now-on'); }
      if (lit >= 0) { setText(nowEls[lit], nowText); tickEls[lit].classList.toggle('al-now-on', !!nowText); }
      last.now_i = lit; last.now = nowText;
    }
    /* the strip carries the readout (lit row or marker), so the line under it only speaks when neither does */
    const inrow = !!mlab || (lit >= 0 && !!nowText);
    if (last.inrow !== inrow) { root.classList.toggle('al-inrow', inrow); last.inrow = inrow; }
    if (last.text !== text) { setText(readoutEl, text); last.text = text; }
    if (last.mini !== miniTxt) { setText(miniEl, miniTxt); last.mini = miniTxt; }
    placeMini(miniTxt, lit);
    if (last.chip !== chipShort) { setText(chipTxt, chipShort); last.chip = chipShort; }
    if (last.aria !== aria) { trackEl.setAttribute('aria-valuetext', aria || 'aggregation scale'); last.aria = aria; }
    const vnow = String(lit >= 0 ? lit : selIdx);
    if (last.vnow !== vnow) { trackEl.setAttribute('aria-valuenow', vnow); last.vnow = vnow; }
    if ((mlab || nowText) && !fitKnown) {
      const el = mlab ? mlabEl : tickEls[lit].querySelector('.al-lab');
      fitMemo.set(fk, fitsColumn(el));
      if (!fitMemo.get(fk)) paint();
    }
  }
  /* ------------------------------------------------------------------------ the strip's column, the chip's slot */
  function colKey() { return (STRIP.matches ? 's' : 'p') + innerWidth + 'x' + innerHeight + (panelOpen ? 'o' : ''); }
  function fitsColumn(el) {
    const q = el.getBoundingClientRect(), r = root.getBoundingClientRect();
    if (!q.width || !r.width) return true;
    /* strip: the box itself, not the gutter left of it (the gutter is where the ground fades in over a zoomed field, so
       a word there sat on a half ground); panel: the panel's own box */
    const left = STRIP.matches ? r.left - FIT_PX : r.left + FIT_PX;
    return q.left >= left;
  }
  /* rooms lay out inside ctx.stage(); in the landscape strip the stage must end where the ladder's column begins
     (shell.js stageAtlas reads insets.right). published once the css has made the strip fixed, and again only when
     the footprint changes (strip <-> chip across the media query, a resize), each change one relayout */
  function publishInset() {
    let r = 0;
    if (STRIP.matches) {
      if (getComputedStyle(root).position !== 'fixed') return; /* ladder.css not applied yet: measure on the next render */
      const q = root.getBoundingClientRect();
      if (!q.width) return;
      r = Math.max(0, Math.round(innerWidth - q.left + GUTTER));
    }
    const ins = ctx.atlas.insets || (ctx.atlas.insets = { top: 0, bottom: 0, left: 0 });
    const prev = ins.right || 0;
    ins.right = r; insetR = r;
    if (Math.abs(prev - r) >= 2) { try { ctx.relayout(); } catch (e) {} }
  }
  function visibleRect(el) {
    if (!el || !el.getClientRects().length) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null;
    const q = el.getBoundingClientRect();
    return q.width > 0 && q.height > 0 ? { left: q.left, top: q.top, right: q.right, bottom: q.bottom } : null;
  }
  /* R3 M7-c: a room's declared obstacles ([data-keepout], mod.keepout()) are opt-in, and two rooms never opted
     a real line in (yours' own served-percentage line, game's round announcement) — the chip sat right on both
     at 844x390. Rather than chase every room for one more declaration, read what is actually on screen: every
     non-wall text node the active room rendered, each line's own real client rect (a Range's, not its element's
     — a clipped/off-screen technique still lays the text out at a real position, so this still keeps clear of
     it even where CSS makes it invisible to the eye). the wall is excluded on purpose: it is already its own,
     separately reserved region (chrome.js layoutInfo/insets), not a spot the chip ever competes for. */
  function textObstacles(sec) {
    const obs = [];
    const tw = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      const el = n.parentElement;
      if (!el || el.closest('.wall')) continue;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) { if (r.width > 0 && r.height > 0) obs.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }); }
    }
    return obs;
  }
  /* verify-1 P1: a room's own chart (the map curve's axis numbers, §1.9 D3) is painted straight onto the shared
     #overlay canvas with fillText — it has no DOM box to declare via [data-keepout] or mod.keepout(ctx), so the
     chip's obstacle list above never saw it and sat right on '86'/'100'. rather than teach the chip one room's
     geometry (a band-aid that only helps the next visitor to file a bug against a *different* room's canvas
     text), sample what is actually painted under the candidate spot, the same ink-alpha test shell.js already
     uses for its own hint placement (og.getImageData, alpha>110 = ink) — so this clears ANY room's canvas
     content, known or not, without any other file changing. */
  let ovlEl, ovlCtx, ovlBad = false;
  /* FIX3: ink = opaque AND lit (a channel > INK_L). rooms paint background-coloured masks and plates on #overlay (calendar's
     edge mask is a full-height #0a0118 band at the stage's right edge, the map/yours plates under their text): opaque, but
     nothing to dodge, and counted as ink they blocked every y in the chip's column, so the walk gave up on real text */
  const isInk = (d, k) => d[k] > INK_A && (d[k - 1] > INK_L || d[k - 2] > INK_L || d[k - 3] > INK_L);
  const INK_A = 110, INK_L = 60, INK_PAD = 6, INK_STEP = 8; /* 6px clearance per the fix note; the step is coarser than a DOM
    keepout jump on purpose — the ink test has no edge to jump straight above (a pixel count, not a rect), so it
    has to walk there, and a room whose own chart fills most of a short landscape stage (the map curve) can need
    a long walk */
  /* true once real content (not a hairline's antialiased edge) sits in the rect. the alpha test and the tolerance
     (ink pixels scale with dpr^2) match shell.js's own og.getImageData ink check verbatim, so a stroke that is
     allowed to cross the shell's hint is allowed to cross the chip too — only real text blocks it */
  /* R3_PERF: a walk asks about many rects in one column (the calendar on a phone: ~66 readbacks a poll, a long frame every
     250 ms). from a placement's second ask on, the column is read once and each ask counts the same device pixels from
     per-row ink sums (getImageData truncates its arguments; off-canvas pixels are transparent either way) */
  let inkCol = null, inkAsks = 0, inkT = 0, inkB = 0;
  const overlayBlocked = (L, T, R, Bt) => overlayInk(L, T, R, Bt) > 30 * (devicePixelRatio || 1) ** 2;
  function overlayInk(L, T, R, Bt) {
    if (ovlBad) return 0;
    try {
      if (!ovlCtx) { ovlEl = document.getElementById('overlay'); ovlCtx = ovlEl && ovlEl.getContext && ovlEl.getContext('2d'); if (!ovlCtx) { ovlBad = true; return 0; } }
      const dpr = devicePixelRatio || 1;
      const x0 = Math.max(0, Math.floor(L)), y0 = Math.max(0, Math.floor(T));
      const w = Math.max(0, Math.ceil(R) - x0), h = Math.max(0, Math.ceil(Bt) - y0);
      if (w <= 0 || h <= 0) return 0;
      const sx = Math.trunc(x0 * dpr), sy = Math.trunc(y0 * dpr), sw = Math.trunc(w * dpr), sh = Math.trunc(h * dpr);
      if (!inkCol && ++inkAsks > 1 && inkB > inkT) {
        const cy = Math.trunc(Math.max(0, Math.floor(inkT)) * dpr), ch = Math.ceil(Math.ceil(inkB) * dpr) + 1 - cy;
        const d = ovlCtx.getImageData(sx, cy, sw, ch).data, pre = new Uint32Array(ch + 1);
        for (let r = 0, k = 3; r < ch; r++) { let n = 0; for (let c = 0; c < sw; c++, k += 4) if (isInk(d, k)) n++; pre[r + 1] = pre[r] + n; }
        inkCol = { sx, sw, cy, ch, pre };
      }
      let ink = 0;
      if (inkCol && sx === inkCol.sx && sw === inkCol.sw && sy >= inkCol.cy && sy + sh <= inkCol.cy + inkCol.ch) ink = inkCol.pre[sy + sh - inkCol.cy] - inkCol.pre[sy - inkCol.cy];
      else { const d = ovlCtx.getImageData(x0 * dpr, y0 * dpr, w * dpr, h * dpr).data; for (let k = 3; k < d.length; k += 4) if (isInk(d, k)) ink++; }
      return ink;
    } catch (e) { ovlBad = true; return 0; } /* a throwing getImageData (Brave farbling, Firefox resistFingerprinting) means readback can never be trusted here either — fail open, DOM keepout still applies */
  }
  /* W31 (main-session ruling §0.2): the chip lives at the stage's own bottom-right corner, thumb reach, not
     hunted for a free run in the brand bar any more — ctx.stage() already ends above the dock/merged-row
     chrome (M3/M4's own reserved bottom), so the corner sits clear of both by construction. a room's declared
     keepout (K7, or its own mod.keepout(ctx)) still pushes the chip straight up clear of it, and now so does
     whatever the room painted on the overlay canvas (above): the corner is the one placement W31 asks for, so
     the fallback is "higher on the same corner", never sideways — matches the DOM-keepout fallback exactly. */
  function placeChip(force) {
    if (STRIP.matches) { chipKey = ''; return; }
    if (chipDown) return; /* never slide the chip out from under a finger: the next poll after the release places it */
    /* the end card owns the whole bottom of the screen on a phone and the chip sat on its seal caption: no chip while it is open */
    const endEl = document.getElementById('ai-end'), endOpen = !!(endEl && !endEl.hidden);
    const setOff = (v) => { if (chip.classList.contains('al-chip-off') !== v) chip.classList.toggle('al-chip-off', v); };
    setOff(endOpen);
    if (endOpen) return;
    /* a phone held upright: the chip has one fixed home, the masthead's free right end. rooms paint their content on canvas where no DOM
       obstacle walk can see it, so a chip that floats over the field will always land on somebody's glyphs somewhere */
    if (innerHeight > innerWidth && innerWidth < 700) {
      setOff(false);
      const cw = chip.getBoundingClientRect().width || 80;
      const hx = Math.round(innerWidth - 12 - cw);
      if (force || chipKey !== 'home') { chipKey = 'home'; chip.style.left = hx + 'px'; chip.style.top = '-6px'; chip.style.right = 'auto'; }
      else if (parseInt(chip.style.left, 10) !== hx) chip.style.left = hx + 'px';
      return;
    }
    let st = null; try { st = ctx.stage(); } catch (e) {}
    if (!st || st.w <= 0 || st.h <= 0) return;
    const obs = [];
    let toastQ = null;
    const push = (q) => { if (q) obs.push(q); };
    const sec = document.querySelector('section[data-room].is-active');
    if (sec) sec.querySelectorAll('[data-keepout]').forEach((el) => push(visibleRect(el)));
    if (sec) textObstacles(sec).forEach(push);
    /* the hint toast (#atlas-toast) lives outside the room's section, so the walk never saw it: it is a hard obstacle while shown */
    if (document.documentElement.classList.contains('ai-toast-on')) {
      toastQ = visibleRect(document.getElementById('atlas-toast'));
      if (toastQ) obs.push(toastQ);
    }
    const hard = obs.slice(); /* FIX3: what the chip may never cover: declared keepout elements, text, and (below) the room's controls */
    if (sec) sec.querySelectorAll('button,a[href],input,select,[role="slider"]').forEach((el) => { if (!el.closest('.wall')) { const q = visibleRect(el); if (q) hard.push(q); } });
    try {
      const r = ROOMS[ctx.index], mod = r && r.mod;
      if (mod && typeof mod.keepout === 'function') (mod.keepout(ctx) || []).forEach((k) => { if (k && k.w > 0 && k.h > 0) obs.push({ left: k.x, top: k.y, right: k.x + k.w, bottom: k.y + k.h }); });
    } catch (e) {}
    /* the DOM/keepout obstacle set alone no longer tells the whole story (a static camera pose can still have a
       moving canvas underneath, e.g. the map curve zooming): resolve fresh every poll, same 250ms cadence the
       readout already updates on, and only touch the DOM when the resolved spot actually moves. measuring
       straight off the live box (never blanking left/top/right first) matters: only one of left/right is ever
       set at once, so the box is shrink-to-fit regardless — blanking them first and then returning early on an
       unchanged key (as a resolve-every-poll design has to allow) would have left the chip pinned at its bare
       CSS position (top:10px/right:12px) the instant its target spot stopped moving, which is most of the time */
    const q = chip.getBoundingClientRect(), w = q.width, h = q.height;
    const x = st.x + st.w - CHIP_GAP - w, yMax = st.y + st.h - CHIP_GAP - h;
    inkCol = null; inkAsks = 0; inkT = st.y - INK_PAD; inkB = yMax + h + INK_PAD; /* every ask below shares x; y stays in [st.y, yMax] */
    const guardMax = obs.length + Math.ceil(st.h / INK_STEP) + 4;
    /* the ink walk (unlike a DOM keepout jump, which clears a whole rect in one bound) can need one step per
       INK_STEP px of the stage's own height in the worst case (a chart that fills a short landscape stage) —
       size the budget off the real stage, not a guess, so it can always reach the far end and never gives up
       early. dir -1 climbs toward the stage's own top (today's only direction); dir +1 gives ground back
       toward the natural bottom-right corner instead, for the one shape climbing can't solve: an obstacle
       sitting just above the corner with real, unobstructed room still below it inside the stage (R3 M7-c —
       yours' own served-percentage lines sit exactly here; climbing overshoots past them into a much bigger
       obstacle above, when the actual fix was a few px lower, still inside the stage). */
    function walk(dir) {
      let y = yMax;
      for (let guard = 0; guard < guardMax; guard++) {
        const hit = obs.find((o) => x < o.right + CHIP_GAP && x + w > o.left - CHIP_GAP && y < o.bottom + CHIP_GAP && y + h > o.top - CHIP_GAP);
        if (hit) {
          const ny = dir < 0 ? Math.max(st.y, hit.top - CHIP_GAP - h) : Math.min(yMax, hit.bottom + CHIP_GAP);
          if (dir < 0 ? ny >= y : ny <= y) return { y, blocked: true }; /* no more room this direction: least-bad, not the bar */
          y = ny; continue;
        }
        if (overlayBlocked(x, y - INK_PAD, x + w, y + h + INK_PAD)) {
          const ny = dir < 0 ? Math.max(st.y, y - INK_STEP) : Math.min(yMax, y + INK_STEP);
          if (dir < 0 ? ny >= y : ny <= y) return { y, blocked: true };
          y = ny; continue;
        }
        return { y, blocked: false };
      }
      return { y, blocked: true };
    }
    const clearOfDOM = (y, L = obs) => !L.some((o) => x < o.right && x + w > o.left && y < o.bottom && y + h > o.top);
    const up = walk(-1);
    let y = up.y;
    /* switching to the downward result only ever trades DOWN, never trades ink for a worse ink problem: full
       clearance (!down.blocked) is always accepted; a DOM-only clearance is accepted only when climbing was
       ALREADY compromised by this stop's own canvas ink (upInk) — the actual bug this fixes (a DOM obstacle
       with real, unobstructed stage below it, R3 M7-c) never trades a genuinely ink-clean "up" for an ink-dirty
       "down": that regression (once real, on calendar's own day numbers) is exactly what upInk guards against */
    if (up.blocked) {
      const upInk = overlayBlocked(x, up.y - INK_PAD, x + w, up.y + h + INK_PAD);
      const down = walk(1);
      if (!down.blocked || (upInk && clearOfDOM(down.y))) y = down.y;
      /* FIX3: both ways blocked used to leave the chip wherever the climb stopped, often on the stage's top text (se calendar,
         landscape yours/map). least-bad is now the spot clear of text and controls (a room's mod.keepout() box may be a whole
         panel with empty corners: yours' is) with the least ink, then clear of the boxes too, then nearest the corner. ink is padded
         vertically only: the chip is pinned to the corner's x, so a stroke beside it (the calendar's october line) could never be
         walked off, and padding sideways only made every y look blocked */
      else { let best = Infinity; for (let yy = yMax; yy >= st.y; yy -= INK_STEP) if (clearOfDOM(yy, hard)) { const n = 2 * overlayInk(x, yy - INK_PAD, x + w, yy + h + INK_PAD) + !clearOfDOM(yy); if (n < best) { best = n; y = yy; } } }
    }
    const xC = Math.max(12, Math.min(x, innerWidth - 12 - w)); y = Math.max(st.y, 12, Math.min(y, innerHeight - 12 - h));
    const nx = Math.round(xC), ny = Math.round(y), key = nx + ',' + ny;
    /* while the hint is up the chip clears it where the stage has room; where there is no room that is clear of both the hint and the
       room's own text it steps out of the way for the hint's few seconds rather than sit on either */
    setOff(!!toastQ && hard.some((o) => nx < o.right && nx + w > o.left && ny < o.bottom && ny + h > o.top));
    if (!force && key === chipKey) return;
    chipKey = key;
    chip.style.left = nx + 'px'; chip.style.top = ny + 'px'; chip.style.right = 'auto';
  }
  function stopNow() {
    const r = ROOMS[ctx.index];
    return r ? { id: r.id, mod: r.mod || null } : { id: '', mod: null };
  }
  function liveUpdate() {
    syncDaysHas();
    const st = stopNow(); let ang = '';
    try { ang = ctx.angle.get().id; } catch (e) {}
    const nt = overrideText != null ? null : noteFor(st.id, ang, st.mod);
    const m = overrideText != null ? 'override' : nt != null ? 'note' : 'plays';
    const key = m + '|' + st.id + '|' + ang + '|' + (nt || '');
    if (key !== modeKey) { modeKey = key; shownN = null; shownZ = null; ring.length = 0; }
    mode = m; note = nt;
    if (m === 'plays') {
      let n = DOTS ? ((P && P.perDot) || 1) : null;
      if (!DOTS) try {
        const s = GF && typeof GF.stats === 'function' ? GF.stats() : null;
        if (s && Number.isFinite(s.medianN) && s.medianN > 0) n = s.medianN * ((P && P.perDot) || 1);
      } catch (e) {}
      if (n != null && Number.isFinite(n)) {
        let z = 1; try { z = +ctx.view.z || 1; } catch (e) {}
        const zoomed = shownZ != null && Math.abs(Math.log(z / shownZ)) > ZOOM_EPS;
        ring.push(n); if (ring.length > STEADY_N) ring.shift();
        if (shownN == null || zoomed || Math.abs(n / shownN - 1) > HYST) { shownN = sig2(n); shownZ = z; }
        else if (ring.length === STEADY_N) {
          const s = ring.slice().sort((a, b) => a - b), med = (s[(STEADY_N >> 1) - 1] + s[STEADY_N >> 1]) / 2;
          if (s[STEADY_N - 1] <= s[0] * STEADY_SPAN && Math.abs(med / shownN - 1) > SETTLE && Math.abs(med - shownN) > ((P && P.perDot) || 1)) shownN = sig2(med);
        }
      }
    }
    /* the strip's rail is as tall as the room's info card leaves it (the end card crushes it to a few dozen px): the rows are
       laid out off that height, so a change that no resize announced has to re-lay them or they stack on one another
       (the end card's "THE WH0LEEEEE") */
    const th = trackEl.clientHeight || 0;
    if (th && Math.abs(th - railH) > 1) render(); else paint();
    if (insetR < 0) publishInset(); /* the strip's css arrived after mount */
    placeChip(false);
  }
  /* R3 M7-a: resolve K4 before the very first paint, not on the visitor's first touch of the rail — see
     probeDaysIndex()'s own comment for why both sources are needed. */
  syncDaysHas();
  if (daysAvailable == null) probeDaysIndex();
  render();
  liveUpdate();
  const pollId = setInterval(liveUpdate, POLL_MS);
  const onResize = () => { render(); placeChip(true); };
  addEventListener('resize', onResize, { passive: true });
  const onMode = () => { render(); placeChip(true); };
  try { STRIP.addEventListener('change', onMode); } catch (e) {}

  /* the idle fade never runs while the visitor is using the ladder (§1.12: pointer over chrome, focus in chrome, a drag) */
  function syncHold() { try { ctx.idle.hold('ladder', hovered || focused || dragging || panelOpen); } catch (e) {} }
  railEl.addEventListener('pointerenter', () => { hovered = true; ensureData(); syncHold(); });
  railEl.addEventListener('pointerleave', () => { hovered = false; syncHold(); });
  root.addEventListener('focusin', () => { focused = true; syncHold(); });
  root.addEventListener('focusout', (e) => { focused = !!(e.relatedTarget && root.contains(e.relatedTarget)); syncHold(); });

  /* ----------------------------------------------------------------------------------- pick/route */
  const pickSubs = [];
  function firePick(lv) { pickSubs.slice().forEach((fn) => { try { fn({ id: lv.id, name: lv.name }); } catch (e) {} }); }
  function pickTick(lv) {
    if (!lv.route) { try { ctx.toast("single sessions aren't in the public data; only their totals are"); } catch (e) {} return; }
    try { ctx.route(lv.route).then(() => firePick(lv)).catch(() => {}); } catch (e) {}
    closePanel();
  }

  /* -------------------------------------------------------------------------------------- drag */
  trackEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.al-tick,.al-pad')) return; /* a tick is a plain button: let its own click fire */
    ensureData(); manual = false; dragging = true; dragLastY = e.clientY;
    try { trackEl.setPointerCapture(e.pointerId); } catch (err) {}
    /* with no live N (a stop whose glyphs are not plays) the handle starts where the finger went down */
    if (!markOn) { const r = trackEl.getBoundingClientRect(); markerFrac = clamp01((e.clientY - r.top) / (r.height || 1)); markerEl.style.top = (markerFrac * 100).toFixed(3) + '%'; knobTo(markerFrac); }
    try { dragCenter = ctx.stage(); } catch (err) { dragCenter = { x: innerWidth / 2, y: innerHeight / 2, w: 0, h: 0 }; }
    trackEl.classList.add('al-dragging'); root.classList.add('al-drag'); syncHold();
  });
  trackEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - dragLastY; dragLastY = e.clientY;
    if (dy) {
      const h = trackEl.clientHeight || 1;
      markerFrac = clamp01(markerFrac + dy / Math.max(h, 200));
      markerEl.style.top = (markerFrac * 100).toFixed(3) + '%'; knobTo(markerFrac);
      const cx = dragCenter.x + dragCenter.w / 2, cy = dragCenter.y + dragCenter.h / 2;
      try { ctx.view.zoomBy(Math.exp(-dy * 0.008), cx, cy); } catch (err) {}
    }
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false; trackEl.classList.remove('al-dragging'); root.classList.remove('al-drag'); syncHold();
    const mr = markerEl.getBoundingClientRect(), my = mr.top + mr.height / 2;
    let best = null, bestD = Infinity;
    tickEls.forEach((el, i) => { const r = el.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - my); if (d < bestD) { bestD = d; best = levels[i]; } });
    paint();
    if (best && bestD <= SNAP_PX) pickTick(best);
  }
  trackEl.addEventListener('pointerup', endDrag);
  trackEl.addEventListener('pointercancel', endDrag);

  /* --------------------------------------------------------------------------- W31: sheet zoom −/+ */
  /* one tap = the zoom a ZOOM_STEP_DY drag would give (H2's own dy -> exp(-dy*0.008) mapping), so the
     marker nudges by exactly the amount a real drag of that length would have moved it */
  const ZOOM_STEP_DY = 90;
  function zoomStep(dir) {
    let c; try { c = ctx.stage(); } catch (e) { c = { x: innerWidth / 2, y: innerHeight / 2, w: 0, h: 0 }; }
    const dy = -dir * ZOOM_STEP_DY;
    try { ctx.view.zoomBy(Math.exp(-dy * 0.008), c.x + c.w / 2, c.y + c.h / 2); } catch (e) {}
    if (markOn) positionMarkerFrac(markerFrac + dy / (railH || 400));
  }
  root.querySelectorAll('.al-zoom-btn').forEach((b) => b.addEventListener('click', () => zoomStep(+b.dataset.dir)));

  /* ----------------------------------------------------------------------------------- keyboard */
  /* arrows step from the level that is lit now, not from the top of the ladder. a rung K4 has hidden (DAY,
     Tier B absent) is skipped rather than landed on, the same way a hidden option never gets a tab stop */
  function step(to) {
    if (!manual) selIdx = litIdx >= 0 ? litIdx : 0;
    manual = true;
    let n = selIdx;
    for (let guard = 0; guard < levels.length; guard++) {
      const next = Math.max(0, Math.min(levels.length - 1, to(n)));
      if (next === n) break;
      n = next;
      if (!tickEls[n].classList.contains('al-no-rung')) break;
    }
    selIdx = n; paint();
  }
  trackEl.addEventListener('focus', () => { ensureData(); });
  trackEl.addEventListener('blur', () => { manual = false; paint(); });
  trackEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step((k) => k - 1); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step((k) => k + 1); }
    else if (e.key === 'Home') { e.preventDefault(); step(() => 0); }
    else if (e.key === 'End') { e.preventDefault(); step(() => levels.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickTick(levels[manual ? selIdx : Math.max(0, litIdx)]); }
  });

  /* ------------------------------------------------------------------------------------- phone */
  function onPanelKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePanel(); } }
  function openPanel() {
    if (panelOpen) return;
    panelOpen = true; root.classList.add('al-open'); scrim.classList.add('al-open');
    chip.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onPanelKey, true);
    syncHold(); render();
    /* the panel is still sliding in: never let focus scroll the fixed page to reach it */
    requestAnimationFrame(() => { try { trackEl.focus({ preventScroll: true }); } catch (e) { trackEl.focus(); } });
  }
  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false; root.classList.remove('al-open'); scrim.classList.remove('al-open');
    chip.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onPanelKey, true);
    syncHold();
  }
  chip.addEventListener('pointerenter', ensureData);
  chip.addEventListener('pointerdown', () => { chipDown = true; });
  const chipUp = () => { chipDown = false; };
  addEventListener('pointerup', chipUp, true);
  addEventListener('pointercancel', chipUp, true);
  chip.addEventListener('click', () => { ensureData(); if (panelOpen) closePanel(); else openPanel(); });
  scrim.addEventListener('click', closePanel);
  trackEl.addEventListener('pointerenter', ensureData);

  ctx.onStop(() => { overrideText = null; overrideLevel = null; manual = false; modeKey = ''; closePanel(); liveUpdate(); placeChip(true); });

  return {
    readout(text) { overrideText = text == null ? null : String(text); liveUpdate(); },
    level(id) { overrideLevel = id && byId[id] ? id : null; liveUpdate(); },
    onPick(fn) { pickSubs.push(fn); return () => { const k = pickSubs.indexOf(fn); if (k >= 0) pickSubs.splice(k, 1); }; },
    __stop() { clearInterval(pollId); removeEventListener('resize', onResize); try { STRIP.removeEventListener('change', onMode); } catch (e) {} removeEventListener('pointerup', chipUp, true); removeEventListener('pointercancel', chipUp, true); },
  };
}
export default { mount };
