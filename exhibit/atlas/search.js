/* atlas search (BUILD_SPEC_V2 §1.8, D9). module M5.
   groups, in render order: STOPS (findings ride along under the same header, §1.8's "under STOPS"), TOURS,
   ARTISTS, TRACKS, GENRES / TAGS, DAYS / MONTHS / YEARS. built lazily from ctx.data() on first open only:
   nothing here is fetched at mount or at page load. */

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTHS = {};
MONTH_NAMES.forEach((n, i) => { MONTHS[n] = i + 1; MONTHS[n.slice(0, 3)] = i + 1; });
MONTHS.sept = 9;
/* the one month the site itself names (calendar.js BREAK: the `[ october 2023 ]` instrument-change line, spec H10),
   so a bare "october" leads with the month a visitor has already seen labelled */
const NAMED_MONTH = '2023-10';
/* a bare month word: full name, abbreviation, "sept", or any 3+ letter prefix of a name ("octo"). every 3-letter
   prefix is unique across the twelve names, so a prefix never resolves ambiguously. */
function bareMonth(tok) {
  const t = fold(tok).trim();
  if (MONTHS[t]) return MONTHS[t];
  if (t.length >= 3) { const i = MONTH_NAMES.findIndex((n) => n.startsWith(t)); if (i >= 0) return i + 1; }
  return 0;
}
const plural = (n, one, many) => (n === 1 ? '1 ' + one : Number(n).toLocaleString('en-US') + ' ' + (many || one + 's'));
const playsTxt = (n) => plural(n, 'play');
/* killit's five buried findings that touch a date or the body: no alias ever routes to them, and a date-like
   query never returns any finding at all (the stronger, safer rule — see isDateLike below). kept as a literal
   set so a future search-static.js accident can't smuggle one in through an alias. */
const NO_ALIAS_FINDINGS = new Set([
  'a known date: the data did not move',
  'pelt event attribution: it fires at everything',
  'run-down days to narrower listening: a season',
  'music to heart rate: null',
  'body drives music: a clock, not a cause',
]);
/* R3 M5-a: a STOPS/FINDINGS row for a killit.json `cases[]` entry must never carry the claim's own wording —
   case 3's `c` field literally asserts the claim survived ("hip-hop and r&b is a genre i actually go pick, not
   noise from...") with no hint that it is frozen source data, not a verdict. these four strings are the
   graveyard's own "atlas" case captions (exhibit/rooms/graveyard.js SHORT_A; index i here == killit.json
   cases[i]) — the same words a visitor already reads on the graveyard shelf. deps.SEARCH_STATIC's own
   FINDING_LABELS.cases (search-static.js, package C2) is tried first so the two files are never a hand-kept
   fork of the same table; this literal is what makes the fix hold even before/without that file landing.
   killit's own `c` text is used only if a case index is missing from both (it never should be: this array's
   length always matches killit.cases.length). */
const CASE_LABELS = [
  'even on a relearned map, my picks bridge more than autoplay does',
  'my network has real topological loops, not just tight clusters',
  'when i tap, i cross genre-families more than a model pooled over my taps and autoplay predicts',
  'by play, hip-hop/r&b is over-tapped beyond bucket-size noise',
];
const GROUP_ORDER = ['stops', 'tours', 'artists', 'tracks', 'genres', 'dates'];
const GROUP_TITLE = { stops: 'STOPS', tours: 'TOURS', artists: 'ARTISTS', tracks: 'TRACKS', genres: 'GENRES / TAGS', dates: 'DAYS / MONTHS / YEARS' };
const CAP_PER_GROUP = 8, CAP_TOTAL = 40;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = (s) => String(s == null ? '' : s).toLowerCase();
const pad2 = (n) => String(n).padStart(2, '0');
const hex = (v) => '#' + (v >>> 0).toString(16).padStart(6, '0');

/* exact > prefix > substring > alias, per §1.8. lower is better; -1 = no match. */
function rankMatch(q, label, aliases) {
  const ql = fold(q); if (!ql) return -1;
  const ll = fold(label);
  if (ll === ql) return 0;
  if (ll.startsWith(ql)) return 1;
  if (ll.includes(ql)) return 2;
  if (aliases) for (let i = 0; i < aliases.length; i++) { const al = fold(aliases[i]); if (al === ql || al.startsWith(ql) || al.includes(ql)) return 3; }
  return -1;
}

function parseDateQuery(raw) {
  const q = fold(raw).trim(); if (!q) return null;
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q))) return { type: 'day', iso: m[1] + '-' + m[2] + '-' + m[3] };
  if ((m = /^(\d{4})-(\d{2})$/.exec(q))) return { type: 'month', iso: m[1] + '-' + m[2] };
  if ((m = /^(\d{4})$/.exec(q))) return { type: 'year', year: m[1] };
  if ((m = /^(\d{1,2}):(\d{2})$/.exec(q))) { const h = +m[1]; return h >= 0 && h <= 23 ? { type: 'hour', h } : null; }
  if ((m = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/.exec(q)) && bareMonth(m[2])) return { type: 'day', iso: m[3] + '-' + pad2(bareMonth(m[2])) + '-' + pad2(+m[1]) };
  if ((m = /^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/.exec(q)) && bareMonth(m[1])) return { type: 'day', iso: m[3] + '-' + pad2(bareMonth(m[1])) + '-' + pad2(+m[2]) };
  if ((m = /^([a-z]+)\s+(\d{4})$/.exec(q)) && bareMonth(m[1])) return { type: 'month', iso: m[2] + '-' + pad2(bareMonth(m[1])) };
  if ((m = bareMonth(q))) return { type: 'monthname', m };
  return null;
}
function isDateLike(raw) {
  const q = fold(raw).trim();
  if (!q) return false;
  if (parseDateQuery(raw)) return true;
  if (/^\d{1,4}$/.test(q)) return true;
  if (q === 'date' || q === 'dates') return true;
  return false;
}

const BUILTIN_FAM_ALIASES = {
  'hip-hop · r&b': ['hip hop', 'hiphop', 'rnb', 'r&b', 'r n b', 'rap'],
  'ambient/lofi': ['lofi', 'lo-fi', 'ambient', 'chill'],
  'world/desi': ['desi', 'world'],
  electronic: ['edm', 'dance'],
  'funk/disco': ['funk', 'disco'],
  'rock/metal': ['rock', 'metal'],
  'folk/country': ['folk', 'country'],
};
/* a joined family pair ("hip hop × ambient"): the whole string is tried as one family/alias FIRST (so a literal
   family key like "ambient/lofi", which itself contains "/", is never mis-split into a pair). */
function splitPair(raw) {
  const s = String(raw || '').trim();
  let m = s.match(/^(.+?)\s*×\s*(.+)$/) || s.match(/^(.+?)\s+x\s+(.+)$/i) || s.match(/^(.+?)\s*\+\s*(.+)$/) || s.match(/^(.+?)\s+and\s+(.+)$/i) || s.match(/^(.+?)\s*\/\s*(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : null;
}

export function mount(ctx, deps) {
  if (!ctx.atlas || !ctx.atlas.on) return null;

  const T = (deps.COPY && deps.COPY.search) || {};
  const TXT = {
    placeholder: 'dig the log', /* M7: the crate (proposed for copy.js search.placeholder) */
    // R3 M5-b: the fallback (COPY not wired) must say the same true thing copy.js's COPY.search.footer does —
    // "lands somewhere real" contradicted universe.js's own placeholder dots (R2 C2 #2) and must never come back.
    footer: T.footer || "names and dates from the log · every result lands somewhere; a dust artist's spot is a placeholder",
    loadingArtists: T.loadingArtists || 'loading every artist…',
    loadingTracks: T.loadingTracks || 'loading every track…',
    loadingDays: T.loadingDays || 'loading recorded days…',
    loadingStars: T.loadingStars || 'loading every star…',
    noResults: T.noResults || 'nothing found',
  };

  /* -------------------------------------------------------------- indices (built once data lands) */
  const idx = {
    stopsReady: false, stops: [],
    toursReady: false, tours: [],
    findingsReady: false, findings: [],
    famReady: false, famKeys: [], famAliasMap: {},
    artistsA: null, artistsB: null, artistsMerged: null, /* Map name-lower -> row */
    stars: null, starsReady: false, /* the 388 Tier-A ge50plays stars, universe_nodes.json — always shipped */
    tracksOwn: null, tracksLog: null,
    monthsList: null, monthTotals: null, /* wall.json.months; tap+shuffle+served per month */
    daysSet: null, daysByIso: null, /* Tier B */
  };
  const registered = {}; /* group -> [{id, provider, cache}] */

  /* -------------------------------------------------------------- "heard n of the stops" (W26): distinct stop ids the
     visitor has actually reached, by any means (tour, search, ladder, url) — try/catch storage, per-visitor
     only, never sent anywhere. */
  const SEEN_KEY = 'sm_atlas_menu_seen_v1';
  function loadSeenIds() { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch (e) { return new Set(); } }
  function saveSeenIds(s) { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch (e) {} }
  const seenSet = loadSeenIds();

  function buildStops() {
    if (idx.stopsReady) return;
    const aliasMap = (deps.SEARCH_STATIC && deps.SEARCH_STATIC.stopAliases) || {};
    /* R5 INT: search-static ships STOP_ALIASES as { alias: { stop, angle? } }; it was never read. a plain alias joins its
       stop's row; an angle alias gets its own row that matches by the alias only and routes to that angle */
    const SA = (deps.SEARCH_STATIC && deps.SEARCH_STATIC.STOP_ALIASES) || {}, plain = {}, angled = [];
    Object.keys(SA).forEach((al) => { const v = SA[al] || {}; if (!v.stop) return; if (v.angle) angled.push({ al, stop: v.stop, angle: v.angle }); else (plain[v.stop] = plain[v.stop] || []).push(al); });
    const stops = ctx.stops || [];
    idx.stops = stops.map((s) => ({ id: s.id, label: s.name, aliases: (aliasMap[s.id] || []).concat(plain[s.id] || []) }));
    angled.forEach((x) => { const s = stops.find((t) => t.id === x.stop); if (s) idx.stops.push({ id: s.id, label: x.al, aliasOnly: true, aliases: [x.al], angle: x.angle, name: s.name }); });
    idx.stopsReady = true;
  }
  function buildTours() {
    if (idx.toursReady) return;
    let list = [];
    try { list = ctx.tour.list() || []; } catch (e) {}
    if (!list.length) list = (deps.TOURS || []).map((t) => ({ id: t.id, name: t.name, blurb: t.blurb, stops: (t.stops || []).length }));
    idx.tours = list;
    idx.toursReady = true;
  }
  function buildFindings(killit) {
    if (idx.findingsReady) return;
    const aliasMap = (deps.SEARCH_STATIC && deps.SEARCH_STATIC.findingAliases) || {};
    const rows = [];
    (killit.buried || []).forEach((name) => rows.push({ id: name, label: name, aliases: NO_ALIAS_FINDINGS.has(name) ? [] : (aliasMap[name] || []) }));
    (killit.cases || []).forEach((c, i) => {
      const id = 'case-' + i;
      const siteLabels = deps.SEARCH_STATIC && deps.SEARCH_STATIC.FINDING_LABELS && deps.SEARCH_STATIC.FINDING_LABELS.cases;
      const raw = (siteLabels && siteLabels[i]) || CASE_LABELS[i] || c.c || id;
      const label = raw.length > 64 ? raw.slice(0, 61) + '…' : raw;
      rows.push({ id, label, aliases: aliasMap[id] || [], v: c.v === 'k' ? 'killed' : c.v === 's' ? 'survived' : '' });
    });
    idx.findings = rows;
    idx.findingsReady = true;
  }
  function buildFamilies() {
    if (idx.famReady) return;
    const keys = Object.keys(ctx.FAM || {}).filter((k) => k !== 'unknown');
    const aliasMap = {};
    keys.forEach((k) => { aliasMap[k] = k; });
    const addAliases = (table) => { Object.keys(table || {}).forEach((fam) => { if (keys.indexOf(fam) < 0) return; (table[fam] || []).forEach((a) => { aliasMap[fold(a)] = fam; }); }); };
    addAliases(BUILTIN_FAM_ALIASES);
    addAliases(deps.SEARCH_STATIC && deps.SEARCH_STATIC.familyAliases);
    idx.famKeys = keys; idx.famAliasMap = aliasMap; idx.famReady = true;
  }
  function resolveFamilyToken(tok) {
    const t = fold(tok).trim(); if (!t) return null;
    if (idx.famAliasMap[t]) return idx.famAliasMap[t];
    let hit = idx.famKeys.find((k) => fold(k).startsWith(t)); if (hit) return hit;
    hit = idx.famKeys.find((k) => fold(k).includes(t)); if (hit) return hit;
    const aliasKeys = Object.keys(idx.famAliasMap);
    let ak = aliasKeys.find((a) => a.startsWith(t)); if (ak) return idx.famAliasMap[ak];
    ak = aliasKeys.find((a) => a.includes(t)); if (ak) return idx.famAliasMap[ak];
    return null;
  }
  function famAliasesFor(fam) { return Object.keys(idx.famAliasMap).filter((a) => idx.famAliasMap[a] === fam && a !== fold(fam)); }

  /* rebuilt from scratch on every call from whichever of {listeners, map, the 388 Tier-A stars, the Tier-B
     roster} have resolved so far: no single source is required, so a Tier-A star (e.g. "Drake") is offered the
     moment universe_nodes.json lands, with or without Tier B (universe_artists_all.json) ever answering. */
  function mergeArtists() {
    const m = new Map();
    ((idx.artistsA && idx.artistsA.listeners) || []).forEach((name) => { const k = fold(name); const r = m.get(k) || { name, inListeners: false, inMap: false, inUniverse: false }; r.inListeners = true; m.set(k, r); });
    ((idx.artistsA && idx.artistsA.map) || []).forEach((name) => { const k = fold(name); const r = m.get(k) || { name, inListeners: false, inMap: false, inUniverse: false }; r.inMap = true; m.set(k, r); });
    (idx.stars || []).forEach((s) => {
      const k = fold(s.name);
      const r = m.get(k) || { name: s.name, inListeners: false, inMap: false, inUniverse: false };
      r.inUniverse = true; r.fam = s.fam; r.b = s.b; r.starId = s.id;
      m.set(k, r);
    });
    if (idx.artistsB) {
      const B = idx.artistsB;
      for (let i = 0; i < B.name.length; i++) {
        const name = B.name[i], k = fold(name);
        const r = m.get(k) || { name, inListeners: false, inMap: false, inUniverse: false };
        r.inUniverse = true; r.fam = (B.fam_order && B.fam_order[B.fam[i]]) || idx.famKeys[B.fam[i]] || r.fam; r.plays = B.plays[i]; r.placed = B.placed[i]; r.idx = i;
        m.set(k, r);
      }
    }
    idx.artistsMerged = m;
  }
  function mergeTracks() {
    if (!idx.tracksOwn) return;
    const own = idx.tracksOwn.map((t) => ({ kind: 'own', id: t.f, title: t.t, sub: 'original track' }));
    let log = [];
    if (idx.tracksLog && idx.artistsB) {
      const Tk = idx.tracksLog, names = idx.artistsB.name;
      log = Tk.title.map((title, i) => {
        const artist = names[Tk.artist[i]] || '';
        return { kind: 'log', id: artist + '::' + title + '::' + i, title, artist, plays: Tk.plays[i], sub: artist + ' · ' + playsTxt(Tk.plays[i]) };
      });
    }
    idx.tracksMerged = own.concat(log);
  }

  /* -------------------------------------------------------------- lazy fetch (never on load; first open only) */
  let openedOnce = false, tierBStarted = false;
  function ensureTierA() {
    /* these three read only ctx.stops / ctx.tour.list() / ctx.FAM, already live at mount: no fetch, no wait */
    buildStops(); buildTours(); buildFamilies();
    return Promise.all([
      ctx.data('killit').then((k) => { buildFindings(k); render(); }).catch(() => { buildFindings({}); render(); }),
      ctx.data('twolisteners').then((d) => { idx.artistsA = idx.artistsA || {}; idx.artistsA.listeners = (d.nodes || []).map((n) => n.name); mergeArtists(); render(); }).catch(() => {}),
      ctx.data('mapmorph').then((d) => { idx.artistsA = idx.artistsA || {}; idx.artistsA.map = d.artists || []; mergeArtists(); render(); }).catch(() => {}),
      ctx.data('tracks').then((d) => { idx.tracksOwn = d.tracks || []; mergeTracks(); render(); }).catch(() => { idx.tracksOwn = []; mergeTracks(); render(); }),
      ctx.data('wall').then((d) => {
        idx.monthsList = d.months || [];
        idx.monthTotals = new Map(idx.monthsList.map((mo, i) => [mo, ((d.tap || [])[i] || 0) + ((d.shuffle || [])[i] || 0) + ((d.served || [])[i] || 0)]));
        render();
      }).catch(() => { idx.monthsList = []; idx.monthTotals = new Map(); render(); }),
      /* universe_nodes.json is Tier A (388 ge50plays stars, small, always shipped): the STARS menu group and
         every ARTISTS match must reach these names even when Tier B never loads. node id order is plays order
         (ROUND2_PLAN §0.6), so id itself doubles as the "priority by plays" sort key — no plays count needed. */
      ctx.data('universe_nodes').then((d) => {
        idx.stars = (d.nodes || []).map((n) => ({ id: n.id, name: n.name, fam: idx.famKeys[n.family] || 'untagged', b: n.plays_bucket | 0 }));
        idx.starsReady = true; mergeArtists(); render();
      }).catch(() => { idx.stars = []; idx.starsReady = true; render(); }),
    ]).then(() => { render(); });
  }
  function ensureTierB() {
    if (tierBStarted) return;
    tierBStarted = true;
    /* every catch sets a falsy-but-resolved value and re-renders: a rejected Tier-B fetch must retire its
       "loading…" row for good, never leave it standing (the round-2 stuck-loading bug's root cause was a
       .catch(()=>{}) that set nothing and never called render(), so idx.artistsB/tracksLog stayed `null` —
       "still pending" — forever). */
    ctx.data('universe_artists_all').then((d) => { idx.artistsB = d; mergeArtists(); mergeTracks(); render(); }).catch(() => { idx.artistsB = false; mergeArtists(); mergeTracks(); render(); });
    ctx.data('universe_tracks').then((d) => { idx.tracksLog = d; mergeTracks(); render(); }).catch(() => { idx.tracksLog = false; mergeTracks(); render(); });
    ctx.data('universe_days').then((d) => {
      const set = new Set(), byIso = new Map();
      (d.days || []).forEach((r) => { set.add(r.d); byIso.set(r.d, r); });
      idx.daysSet = set; idx.daysByIso = byIso; render();
    }).catch(() => { idx.daysSet = new Set(); idx.daysByIso = new Map(); render(); });
  }

  /* -------------------------------------------------------------- group builders */
  function collectRegistered(group, q) {
    const out = [];
    (registered[group] || []).forEach((r) => {
      let items = r.cache;
      if (items == null) {
        const v = typeof r.provider === 'function' ? r.provider() : r.provider;
        if (v && typeof v.then === 'function') { v.then((a) => { r.cache = a || []; render(); }); return; }
        items = r.cache = v || [];
      }
      items.forEach((it) => {
        const rk = typeof it.rank === 'number' ? it.rank : rankMatch(q, it.label, it.keys);
        if (rk >= 0) out.push({ kind: 'reg', label: it.label, sub: it.sub, route: it.route, rank: rk, order: 0 });
      });
    });
    return out;
  }

  function matchStops(q) {
    const out = [];
    idx.stops.forEach((s, i) => { const r = s.aliasOnly ? rankMatch(q, '', s.aliases) : rankMatch(q, s.label, s.aliases); if (r >= 0) out.push({ kind: 'stop', label: s.label, sub: s.aliasOnly ? 'stop · ' + s.name : 'stop', route: s.angle ? { stop: s.id, angle: s.angle } : { stop: s.id }, rank: r, order: i }); });
    idx.findings.forEach((f, i) => { const r = rankMatch(q, f.label, f.aliases); if (r >= 0) out.push({ kind: 'finding', label: f.label, sub: f.v ? 'finding · ' + f.v : 'finding', route: { stop: 'graveyard', focus: { finding: f.id } }, rank: r, order: 1000 + i }); });
    return out.concat(collectRegistered('stops', q));
  }
  function matchTours(q) {
    const out = [];
    idx.tours.forEach((t, i) => { const r = rankMatch(q, t.name, [t.blurb]); if (r >= 0) out.push({ kind: 'tour', label: t.name, sub: plural(t.shown != null ? t.shown : (t.stops || t.n || 0), 'stop'), route: { tourPlay: t.id }, rank: r, order: i }); });
    return out.concat(collectRegistered('tours', q));
  }
  function matchArtists(q) {
    const out = [];
    if (idx.artistsMerged) {
      let i = 0;
      idx.artistsMerged.forEach((r) => {
        const rank = rankMatch(q, r.name);
        if (rank >= 0) {
          const chips = [];
          if (r.inListeners) chips.push({ text: 'listeners', route: { stop: 'listeners', focus: { artist: r.name } } });
          if (r.inMap) chips.push({ text: 'map', route: { stop: 'map', focus: { artist: r.name } } });
          /* Tier B gives an exact play count; a Tier-A-only star (no Tier B yet) is never given a fabricated
             number — it reads as simply "in the universe" until the real count can be shown */
          const sub = r.plays != null ? playsTxt(r.plays) : (r.inUniverse ? 'in the universe' : (r.inListeners || r.inMap ? 'also known here' : ''));
          const primary = r.inUniverse ? { stop: 'universe', focus: { artist: r.name } } : r.inListeners ? { stop: 'listeners', focus: { artist: r.name } } : { stop: 'map', focus: { artist: r.name } };
          out.push({ kind: 'artist', label: r.name, sub, chips, route: primary, rank, order: r.idx != null ? r.idx : r.starId != null ? r.starId : 100000 + (i++), bar: crateBar(r.b, r.fam), vox: { fam: r.fam, plays: r.plays } });
        } else i++;
      });
    }
    /* while genuinely in flight (idx.artistsB === null, never resolved either way) the row says so; once Tier B
       answers — a real roster object, or the literal `false` on a 404/reject — this guard clears for good and
       ARTISTS simply falls back to whatever idx.artistsMerged already holds (the 388 Tier-A stars at minimum) */
    if (idx.artistsB === null) out.push({ kind: 'loading', label: TXT.loadingArtists, sub: '', route: null, rank: 9, order: 999999 });
    return out.concat(collectRegistered('artists', q));
  }
  function matchTracks(q) {
    const out = [];
    (idx.tracksMerged || []).forEach((t, i) => {
      const r = rankMatch(q, t.title, t.artist ? [t.artist] : null);
      if (r >= 0) {
        const route = t.kind === 'own' ? { stop: 'make', focus: { track: t.id } } : { stop: 'universe', focus: { artist: t.artist, track: t.title } };
        out.push({ kind: 'track', label: t.title, sub: t.sub, route, rank: r, order: i });
      }
    });
    if (idx.tracksLog === null) out.push({ kind: 'loading', label: TXT.loadingTracks, sub: '', route: null, rank: 9, order: 999999 });
    return out.concat(collectRegistered('tracks', q));
  }
  function matchGenres(raw) {
    const out = [];
    const whole = resolveFamilyToken(raw);
    if (whole) {
      out.push({ kind: 'family', label: whole, sub: 'genre', chip: hex(ctx.famColor ? ctx.famColor(whole) : 0x9a9aa2), route: { stop: 'universe', angle: 'threads', focus: { family: whole } }, rank: 0, order: idx.famKeys.indexOf(whole) });
      return out.concat(collectRegistered('genres', raw));
    }
    const pair = splitPair(raw);
    if (pair) {
      const a = resolveFamilyToken(pair[0]), b = resolveFamilyToken(pair[1]);
      if (a && b && a !== b) {
        out.push({ kind: 'pair', label: a + ' × ' + b, sub: 'genre pair', route: { stop: 'universe', angle: 'threads', focus: { pair: [a, b] } }, rank: 0, order: 0 });
        return out.concat(collectRegistered('genres', raw));
      }
    }
    idx.famKeys.forEach((k, i) => { const r = rankMatch(raw, k, famAliasesFor(k)); if (r >= 0) out.push({ kind: 'family', label: k, sub: 'genre', chip: hex(ctx.famColor ? ctx.famColor(k) : 0x9a9aa2), route: { stop: 'universe', angle: 'threads', focus: { family: k } }, rank: r, order: i }); });
    return out.concat(collectRegistered('genres', raw));
  }
  function matchDates(raw) {
    const d = parseDateQuery(raw);
    if (!d) return [];
    if (d.type === 'day') {
      if (idx.daysSet === null) return [{ kind: 'loading', label: TXT.loadingDays, sub: '', route: null, rank: 9, order: 0 }];
      if (!idx.daysSet.has(d.iso)) return [];
      const rec = idx.daysByIso.get(d.iso);
      return [{ kind: 'day', label: d.iso, sub: (rec ? playsTxt(rec.n) : ''), route: { stop: 'universe', angle: 'day', focus: { day: d.iso } }, rank: 0, order: 0 }];
    }
    const monthRow = (iso, order) => {
      const [y, m] = iso.split('-'), n = idx.monthTotals && idx.monthTotals.get(iso);
      return { kind: 'month', label: MONTH_NAMES[(+m) - 1] + ' ' + y, sub: n ? playsTxt(n) : 'month', route: { stop: 'calendar', focus: { month: iso } }, rank: 0, order };
    };
    if (d.type === 'month') {
      if (!idx.monthsList || idx.monthsList.indexOf(d.iso) < 0) return [];
      return [monthRow(d.iso, 0)];
    }
    /* a bare month word lists every month of that name that holds plays (a month with none is simply not offered,
       like an unrecorded day: never labelled), the site's named month first, then in calendar order */
    if (d.type === 'monthname') {
      if (!idx.monthsList) return [];
      const mm = pad2(d.m);
      return idx.monthsList
        .map((iso, i) => (iso.slice(5, 7) === mm && idx.monthTotals.get(iso) > 0 ? monthRow(iso, iso === NAMED_MONTH ? -1 : i) : null))
        .filter(Boolean)
        .sort(cmp);
    }
    if (d.type === 'year') {
      const first = (idx.monthsList || []).find((mo) => mo.slice(0, 4) === d.year);
      if (!first) return [];
      return [{ kind: 'year', label: d.year, sub: '→ ' + MONTH_NAMES[(+first.slice(5, 7)) - 1] + ' ' + d.year, route: { stop: 'calendar', focus: { month: first } }, rank: 0, order: 0 }];
    }
    if (d.type === 'hour') return [{ kind: 'hour', label: pad2(d.h) + ':00', sub: 'hour', route: { stop: 'clock', focus: { hour: d.h } }, rank: 0, order: 0 }];
    return [];
  }

  function buildGroups(raw) {
    const q = raw.trim();
    if (!q) return [];
    const dateLike = isDateLike(q);
    const pools = {
      stops: matchStops(q).sort(cmp).slice(0, CAP_PER_GROUP),
      tours: matchTours(q).sort(cmp).slice(0, CAP_PER_GROUP),
      artists: matchArtists(q).sort(cmp).slice(0, CAP_PER_GROUP),
      tracks: matchTracks(q).sort(cmp).slice(0, CAP_PER_GROUP),
      genres: matchGenres(q).sort(cmp).slice(0, CAP_PER_GROUP),
      dates: matchDates(q).slice(0, CAP_PER_GROUP),
    };
    if (dateLike) pools.stops = pools.stops.filter((r) => r.kind !== 'finding');
    /* a query that reads as a date is asking for a date: its group leads, ahead of any name that merely shares the
       word (a bare "october" must not open on the artist October London) */
    const order = dateLike ? ['dates'].concat(GROUP_ORDER.filter((k) => k !== 'dates')) : GROUP_ORDER;
    let total = 0;
    const groups = [];
    order.forEach((key) => {
      let items = pools[key]; if (!items.length) return;
      if (total >= CAP_TOTAL) return;
      if (total + items.length > CAP_TOTAL) items = items.slice(0, CAP_TOTAL - total);
      total += items.length;
      groups.push({ key, title: GROUP_TITLE[key], items });
    });
    return groups;
  }
  function cmp(a, b) { return a.rank - b.rank || a.order - b.order; }

  /* -------------------------------------------------------------- the ATLAS menu (W26): every group in full,
     unfiltered, for browsing without typing. It is the same combobox as the typed-query path above — st.flat,
     arrow/Home/End/Enter, activateItem — just fed an unfiltered group list instead of a ranked, capped one. */
  function buildYears() {
    if (!idx.monthsList || !idx.monthsList.length) return [];
    const out = [], seenY = new Set();
    idx.monthsList.forEach((iso) => {
      const y = iso.slice(0, 4); if (seenY.has(y)) return; seenY.add(y);
      out.push({ kind: 'year', label: y, sub: '→ ' + MONTH_NAMES[(+iso.slice(5, 7)) - 1] + ' ' + y, route: { stop: 'calendar', focus: { month: iso } } });
    });
    return out;
  }
  function buildBrowseGroups() {
    const groups = [];
    if (idx.stops.length) groups.push({ key: 'stops', title: 'STOPS', items: idx.stops.map((s, i) => ({ kind: 'stop', label: s.label, sub: 'stop', num: pad2(i + 1), route: { stop: s.id } })) });
    if (idx.tours.length) groups.push({ key: 'tours', title: 'TOURS', items: idx.tours.map((t) => ({ kind: 'tour', label: t.name, sub: plural(t.shown != null ? t.shown : (t.stops || t.n || 0), 'stop'), route: { tourPlay: t.id } })) });
    if (!idx.starsReady) {
      groups.push({ key: 'stars', title: 'STARS', items: [{ kind: 'loading', label: TXT.loadingStars, sub: '', route: null }] });
    } else if (idx.stars.length) {
      /* "plays": ascending node id (ROUND2_PLAN §0.6 ruling — id order IS plays order, most-played first, no
         count needed); "name": alphabetical. M7: the right-hand mark is the crate's plays bar (plays_bucket, five steps,
         in the genre colour). the per-artist tap share that used to sit there is an arm split, cut since R5. */
      const list = idx.stars.slice().sort(st.starSort === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.id - b.id);
      groups.push({
        key: 'stars', title: 'STARS',
        items: list.map((s) => { const r = idx.artistsMerged && idx.artistsMerged.get(fold(s.name)); return { kind: 'artist', label: s.name, sub: '', bar: crateBar(s.b, s.fam), vox: { fam: s.fam, plays: r ? r.plays : undefined }, chip: hex(ctx.famColor ? ctx.famColor(s.fam) : 0x9a9aa2), route: { stop: 'universe', focus: { artist: s.name } } }; }),
      });
    }
    if (idx.famKeys.length) groups.push({ key: 'genres', title: 'GENRES', items: idx.famKeys.map((k) => ({ kind: 'family', label: k, sub: 'genre', chip: hex(ctx.famColor ? ctx.famColor(k) : 0x9a9aa2), route: { stop: 'universe', angle: 'threads', focus: { family: k } } })) });
    const years = buildYears(); if (years.length) groups.push({ key: 'years', title: 'YEARS', items: years });
    return groups;
  }

  /* -------------------------------------------------------------- DOM */
  const top = document.getElementById('top');
  const bar = document.createElement('div');
  bar.className = 'as-bar';
  /* both inputs are WAI-ARIA 1.2 comboboxes that own #as-listbox: that relationship is what makes the listbox a
     combobox popup (keyboard reaches every row through aria-activedescendant from the input, so the scroll region
     itself never needs to be a tab stop; axe's scrollable-region-focusable exempts exactly this). */
  const COMBO = ' role="combobox" aria-controls="as-listbox" aria-expanded="false" aria-autocomplete="list"';
  bar.innerHTML = '<input id="atlas-search-bar-input" type="text"' + COMBO + ' autocomplete="off" spellcheck="false" placeholder="' + esc(TXT.placeholder) + '" aria-label="' + esc(TXT.placeholder) + '"><kbd class="as-kbd" aria-hidden="true">/</kbd>';
  if (top) top.insertBefore(bar, top.children[1] || null); else document.body.appendChild(bar);
  const barInput = bar.querySelector('input');

  const panel = document.createElement('div');
  panel.className = 'as-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="as-sheet-head">' +
      '<label class="as-sheet-label" for="atlas-search-sheet-input">THE CRATE</label>' +
      '<input id="atlas-search-sheet-input" type="text"' + COMBO + ' autocomplete="off" spellcheck="false" placeholder="' + esc(TXT.placeholder) + '" aria-label="' + esc(TXT.placeholder) + '">' +
      '<button type="button" class="as-close" aria-label="close search">close</button>' +
    '</div>' +
    '<div class="as-empty" id="as-empty"></div>' +
    '<div class="as-sort" id="as-sort" role="group" aria-label="sort the stars list" hidden>' +
      '<span class="as-sort-label" aria-hidden="true">sort</span>' +
      '<button type="button" class="as-sortbtn" data-sort="plays" aria-pressed="true">plays</button>' +
      '<button type="button" class="as-sortbtn" data-sort="name" aria-pressed="false">name</button>' +
    '</div>' +
    '<div class="as-list" id="as-listbox" role="listbox" aria-label="search results"></div>' +
    '<div class="as-foot">' + esc(TXT.footer) + '</div>';
  document.body.appendChild(panel);
  const sheetInput = panel.querySelector('#atlas-search-sheet-input');
  const closeBtn = panel.querySelector('.as-close');
  const emptyEl = panel.querySelector('#as-empty');
  const sortEl = panel.querySelector('#as-sort');
  const listEl = panel.querySelector('#as-listbox');
  const footEl = panel.querySelector('.as-foot');

  function setExpanded(on) { const v = on ? 'true' : 'false'; barInput.setAttribute('aria-expanded', v); sheetInput.setAttribute('aria-expanded', v); }
  /* the compact pill in #top is a trigger only (click, focus or '/' opens the panel); every keystroke and the
     combobox's own aria-activedescendant live on the panel's own "ATLAS" input — right-docked on desktop, the
     bottom sheet's header on phones — one input, one place typing happens, on every viewport (W26). */
  function activeInputEl() { return sheetInput; }

  /* -------------------------------------------------------------- state + render */
  const st = { open: false, q: '', flat: [], activeId: -1, prevFocus: null, byKey: false, starSort: 'plays' };

  function optionId(i) { return 'as-opt-' + i; }
  /* M7: a crate row's plays bar, five steps of plays_bucket (the 388 starred artists in fifths by plays; an artist under
     50 plays has none lit), in its genre family's colour. a size and a genre, never who pressed play */
  function crateBar(b, fam) { return { n: Math.max(0, Math.min(5, b | 0)), c: hex(ctx.famColor ? ctx.famColor(fam) : 0x9a9aa2) }; }
  function renderRow(item, i) {
    const cls = 'as-opt' + (item.kind === 'loading' ? ' as-loading' : '');
    /* listbox's required-owned-elements rule (axe: aria-required-children) permits ONLY option/group children,
       so no descendant of #as-listbox may carry its own interactive role, at any depth. the chips are plain,
       role-less <span>s (click-delegated, mouse/touch only) rather than <button>s; the same "also in ..." fact
       is also written into .as-sub in words, so it still reaches screen-reader users through the option's own
       accessible name, just not as a second, separately-operable control (a real <button> here cannot be made
       valid inside a listbox without breaking that structural rule). */
    let chipsHtml = '', chipWordsHtml = '';
    if (item.chips && item.chips.length) {
      chipsHtml = '<span class="as-chips" aria-hidden="true">' + item.chips.map((c, ci) => '<span class="as-chip" data-chip="' + i + ':' + ci + '">' + esc(c.text) + '</span>').join('') + '</span>';
      /* sighted users read the same fact off the visible chips; screen readers get it as words, off-screen so
         the visible .as-sub keeps room for the name itself (a long "also in ..." tail was crowding it out) */
      chipWordsHtml = '<span class="as-sr-only">also in ' + esc(item.chips.map((c) => c.text).join(', ')) + '</span>';
    }
    const swatch = item.chip ? '<i class="as-swatch" style="background:' + item.chip + '" aria-hidden="true"></i>' : '';
    const numHtml = item.num ? '<span class="as-num" aria-hidden="true">' + esc(item.num) + '</span>' : '';
    const rightHtml = (item.right ? '<span class="as-right">' + esc(item.right) + '</span>' : '') +
      (item.bar ? '<span class="as-pbar" aria-hidden="true" style="--fc:' + item.bar.c + '">' + '<i class="on"></i>'.repeat(item.bar.n) + '<i></i>'.repeat(5 - item.bar.n) + '</span>' : '');
    /* role="presentation" makes the wrapper transparent to the a11y tree, so role="option" still reads as a
       direct child of the listbox (WAI-ARIA's listbox>option structural rule) */
    return '<div class="as-row" role="presentation">' +
      '<div class="' + cls + '" role="option" id="' + optionId(i) + '" data-i="' + i + '" aria-selected="false">' +
        '<span class="as-row-main">' + numHtml + swatch + '<span class="as-label">' + esc(item.label) + '</span>' + (item.sub ? '<span class="as-sub">' + esc(item.sub) + '</span>' : '') + chipWordsHtml + '</span>' +
        rightHtml +
      '</div>' +
      chipsHtml +
    '</div>';
  }
  function seenLine() { const ids = new Set(idx.stops.filter((s) => !s.aliasOnly).map((s) => s.id)); let n = 0; seenSet.forEach((id) => { if (ids.has(id)) n++; }); return 'heard ' + n + ' of ' + (ids.size || 16); } /* angle-alias rows are not stops */
  function renderGroups(groups) {
    const flat = [];
    let html = '';
    if (!groups.length) { html = '<div class="as-nores">' + esc(TXT.noResults) + '</div>'; }
    groups.forEach((g) => {
      html += '<div class="as-group-h">' + esc(g.title) + '</div>';
      g.items.forEach((item) => { const i = flat.length; flat.push(item); html += renderRow(item, i); });
    });
    listEl.innerHTML = html;
    st.flat = flat;
    st.activeId = flat.length ? 0 : -1;
    paintActive();
  }
  function render() {
    if (!st.open) return;
    const q = st.q.trim();
    if (!q) {
      emptyEl.hidden = false;
      const plays = (ctx.stats && ctx.stats.plays != null) ? ctx.stats.plays.toLocaleString('en-US') : '97,427';
      const span = (ctx.stats && ctx.stats.span) || 'september 2019 to may 2026';
      emptyEl.innerHTML = '<div class="as-stat">' + esc(plays + ' plays · ' + span) + '</div><div class="as-seen">' + esc(seenLine()) + '</div>';
      sortEl.hidden = false;
      renderGroups(buildBrowseGroups());
      return;
    }
    emptyEl.hidden = true;
    sortEl.hidden = true;
    renderGroups(buildGroups(q));
  }
  function paintActive() {
    const rows = listEl.querySelectorAll('.as-opt');
    rows.forEach((r) => r.setAttribute('aria-selected', 'false'));
    const el = activeInputEl();
    if (st.activeId >= 0 && rows[st.activeId]) {
      rows[st.activeId].setAttribute('aria-selected', 'true');
      rows[st.activeId].scrollIntoView({ block: 'nearest' });
      el.setAttribute('aria-activedescendant', optionId(st.activeId));
    } else el.removeAttribute('aria-activedescendant');
  }

  /* -------------------------------------------------------------- routing (honest: never claim a fly the room can't give) */
  function coarseNow() { return matchMedia('(pointer:coarse)').matches; }
  function waitViewportSettle() {
    if (!coarseNow()) return Promise.resolve();
    const vv = window.visualViewport; if (!vv) return Promise.resolve();
    return new Promise((resolve) => {
      let last = vv.height, stable = 0, done = false; const t0 = performance.now();
      (function tick() {
        if (done) return;
        const h = vv.height;
        if (Math.abs(h - last) < 1) stable++; else { stable = 0; last = h; }
        if (stable >= 2 || performance.now() - t0 >= 350) { done = true; resolve(); return; }
        requestAnimationFrame(tick);
      })();
    });
  }
  function blurActive() { const el = document.activeElement; if (el === barInput || el === sheetInput) el.blur(); }

  /* ctx.route() can throw synchronously (REQUESTS_M5.md: a shell.js bug on a string `stop`) — a dependency's
     defect must never surface as an uncaught error in this module */
  async function safeRoute(desc) { try { return await ctx.route(desc); } catch (e) { console.warn('search: ctx.route', e); return 'arrived'; } }
  async function activateItem(item) {
    if (!item || !item.route || item.kind === 'loading') return;
    blurActive();
    await waitViewportSettle();
    close(true);
    if (item.route.tourPlay != null) { try { ctx.tour.play(item.route.tourPlay, 0); } catch (e) {} return; }
    const res = await safeRoute(item.route);
    if (item.route.focus && res !== 'flew') ctx.toast(item.label + ' · not shown there yet.');
  }
  function activateChip(item, chip) {
    blurActive();
    waitViewportSettle().then(() => { close(true); return safeRoute(chip.route); }).then((res) => { if (chip.route.focus && res !== 'flew') ctx.toast(chip.text + ' · not shown there yet.'); });
  }

  /* -------------------------------------------------------------- open / close / keys */
  function open(q) {
    if (!st.open) {
      st.prevFocus = document.activeElement;
      st.byKey = false;
      st.open = true;
      panel.hidden = false;
      setExpanded(true);
      requestAnimationFrame(() => panel.classList.add('as-on'));
      document.addEventListener('keydown', onKeydownCapture, true);
      if (!openedOnce) { openedOnce = true; ensureTierA(); ensureTierB(); }
    }
    const el = activeInputEl();
    if (q != null) { el.value = q; st.q = q; }
    render();
    el.focus({ preventScroll: true });
    if (typeof el.select === 'function' && q == null) el.select();
    syncVV();
  }
  /* where focus goes on close. a search that flies hands it to the stop row's tour chip (the destination's own
     control; → still steps the tour from a button), or to 'show' while the chrome is hidden; a cancel gives it back
     to where it was, or leaves it on the page. never #atlas-stage as a fallback: its focus ring is a frame round the
     whole viewport and read as a rendering fault. never one of these inputs: focusing the bar re-opens the panel, so
     a bar-click search could not be closed. on a touch-first screen the hand-off happens only when a hardware key
     ('/') opened the search: a code-handed ring after the soft keyboard's Go is a stray mark, not a cue. */
  function focusFirst(els) {
    for (const el of els) {
      if (!el || !el.isConnected || el === barInput || el === sheetInput || el === document.body || typeof el.focus !== 'function' || !el.getClientRects().length) continue;
      el.focus({ preventScroll: true });
      if (document.activeElement === el) return;
    }
  }
  function close(flew) {
    if (!st.open) return;
    st.open = false; voxOf(null);
    setExpanded(false);
    panel.classList.remove('as-on');
    document.removeEventListener('keydown', onKeydownCapture, true);
    setTimeout(() => { if (!st.open) panel.hidden = true; }, 220);
    if (document.activeElement === barInput || document.activeElement === sheetInput) blurActive();
    const pf = st.prevFocus; st.prevFocus = null;
    if (flew === true) { if (st.byKey || !coarseNow()) focusFirst([document.getElementById('ai-tourchip'), document.getElementById('atlas-show')]); }
    else if (pf === barInput) { st.noFocusOpen = true; try { barInput.focus({ preventScroll: true }); } catch (e) {} st.noFocusOpen = false; }
    else focusFirst([pf]);
  }
  function moveActive(delta) {
    if (!st.flat.length) return;
    st.activeId = ((st.activeId < 0 ? 0 : st.activeId) + delta + st.flat.length) % st.flat.length;
    paintActive(); voxOf(listEl.querySelectorAll('.as-opt')[st.activeId]); /* the arrow keys hear the crate too */
  }
  function onInput(e) { st.q = e.target.value; render(); }
  /* the panel is not a native <dialog> (it must stay open across a room-crossing fly, which a modal's own
     light-dismiss would fight), so Tab does not wrap on its own the way showModal() would: join the two ends
     by hand (same recipe as panels.js's wireDialog, W26's "focus trap works" accept). */
  function tabStops() {
    return Array.prototype.filter.call(panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex]'), (el) => el.tabIndex >= 0 && !el.disabled && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
  }
  function onKeydownCapture(e) {
    if (!st.open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      const stops = tabStops(); if (!stops.length) return;
      const a = document.activeElement, first = stops[0], last = stops[stops.length - 1];
      const wrap = e.shiftKey ? (a === first || !panel.contains(a)) : (a === last || !panel.contains(a));
      if (wrap) { e.preventDefault(); e.stopPropagation(); (e.shiftKey ? last : first).focus(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); moveActive(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); moveActive(-1); return; }
    if (e.key === 'Home') { if (st.flat.length) { e.preventDefault(); e.stopPropagation(); st.activeId = 0; paintActive(); } return; }
    if (e.key === 'End') { if (st.flat.length) { e.preventDefault(); e.stopPropagation(); st.activeId = st.flat.length - 1; paintActive(); } return; }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); activateItem(st.flat[st.activeId]); return; }
  }
  barInput.addEventListener('input', onInput);
  sheetInput.addEventListener('input', onInput);
  /* V4 a11y P1-1: a pointer or touch landing on the bar opens the sheet as before, but keyboard focus (Tab) walks
     past it, or a forward-tabbing visitor never reaches the top menu, the tour chip or the next-stop pill (the sheet
     moved focus inside itself and its trap wrapped). Enter or ArrowDown on the focused bar opens it; '/' still does. */
  barInput.addEventListener('focus', () => { if (st.open || st.noFocusOpen) return; let kb = false; try { kb = barInput.matches(':focus-visible'); } catch (e) {} if (!kb) open(); });
  barInput.addEventListener('click', () => { if (!st.open) open(); });
  barInput.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === 'ArrowDown') && !st.open) { e.preventDefault(); open(); } });
  closeBtn.addEventListener('click', close);
  listEl.addEventListener('click', (e) => {
    const chipEl = e.target.closest('.as-chip');
    if (chipEl) { const [i, ci] = chipEl.dataset.chip.split(':').map(Number); const item = st.flat[i]; if (item && item.chips) activateChip(item, item.chips[ci]); return; }
    const row = e.target.closest('.as-opt'); if (!row) return;
    const i = +row.dataset.i; st.activeId = i; activateItem(st.flat[i]);
  });
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  /* M7: hovering an artist row plays its note (genre = pitch, more plays = lower) through the site's one hover voice */
  let voxRow = null;
  function voxOf(row) {
    const item = row ? st.flat[+row.dataset.i] : null;
    if (row === voxRow) return; voxRow = row;
    try {
      if (!item || !item.vox) { ctx.audio.tick(null); return; }
      const b = row.getBoundingClientRect();
      ctx.audio.tick('crate:' + item.label, { fam: item.vox.fam, plays: item.vox.plays, kind: 'label', x: b.left + 18, y: b.top + b.height / 2 });
    } catch (e) {}
  }
  listEl.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') voxOf(e.target.closest('.as-opt')); });
  listEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') voxOf(null); });
  sortEl.addEventListener('click', (e) => {
    const b = e.target.closest('.as-sortbtn'); if (!b) return;
    const v = b.dataset.sort; if (v === st.starSort) return;
    st.starSort = v;
    sortEl.querySelectorAll('.as-sortbtn').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.sort === v)));
    render();
  });

  /* -------------------------------------------------------------- iOS-safe sheet sizing: visualViewport, never vh/env() */
  let vvQueued = false;
  function syncVV() {
    if (vvQueued) return; vvQueued = true;
    requestAnimationFrame(() => {
      vvQueued = false;
      const vv = window.visualViewport;
      const h = vv ? vv.height : innerHeight, top = vv ? vv.offsetTop : 0;
      panel.style.setProperty('--as-vvh', h + 'px');
      panel.style.setProperty('--as-vvtop', top + 'px');
    });
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', syncVV); window.visualViewport.addEventListener('scroll', syncVV); }
  addEventListener('resize', syncVV);
  syncVV();

  /* -------------------------------------------------------------- global keys: '/' must beat Firefox quick-find, so it
     is a raw capturing listener, never ctx.keys (which runs in the bubble phase). M7: the old 'o' alias is gone. */
  function isTypingTarget(el) { return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); }
  function onSlash(e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (ctx.label && ctx.label.isOpen) return;
    e.preventDefault();
    open(); st.byKey = true;
  }
  document.addEventListener('keydown', onSlash, true);

  /* -------------------------------------------------------------- "heard n of the stops" (W26): a per-visitor browse
     progress line, try/catch storage only, never sent anywhere, never gates anything. */
  try {
    ctx.onStop(({ id }) => {
      if (!id || seenSet.has(id)) return;
      seenSet.add(id); saveSeenIds(seenSet);
      if (st.open && !st.q.trim()) render();
    });
  } catch (e) {}

  return {
    open, close,
    register(group, id, provider) {
      (registered[group] || (registered[group] = [])).push({ id, provider, cache: null });
      if (st.open) render();
    },
  };
}
export default { mount };
