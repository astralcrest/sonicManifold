/* package M4 — tour engine (BUILD_SPEC_V2 §1.10, §4, §9.6; SKELETON_NOTES "Activation"/"P (atlas)").
   Owns ctx.tour only. No DOM (panels.js draws the tours sheet; chrome.js draws the stepper that reads
   ctx.tour.active every frame). Everything here is a plain state machine plus one cancellation token
   ("epoch") so a manual navigation, a pause or a new play() can interrupt an in-flight hold or flight
   without leaving two clocks running (engineering critic #2: tour.js is the only atlas autoplay driver).

   Design notes for the modules that read ctx.tour.active:
   - active.k is 0-based everywhere (matches play(id, k=0)); render "STOP k+1 / n".
   - off-tour (active.id === null) active.k/active.n track the visitor's position in the WALK, not a
     tour; next()/prev() step the walk directly, matching the shell's own FAC.tour stub default.
   - pause() never cancels the running hold, it only freezes active.holding in place (the onFrame driver
     stops accumulating elapsed time while !active.playing); resume() re-flies to the same stop first
     (via, gotoTourStop) and then continues the hold from a fresh wait, matching "p resumes at the same
     stop" — a stop the visitor may have physically left via search/tap/ladder in the meantime.
   - next()/prev() while a tour is active are themselves "tour keys" (§1.10): they do
     NOT count as the "manual input" that pauses a tour. Only navigation with a via other than 'tour'
     (search, tap, ladder, url, a key with no tour meaning), a camera drag/zoom (ctx.view.manual) or a
     room control does.

   ROUND2_PLAN K3 (W20): toggle()/isPlaying()/on('end', fn) are additive — active.k/active.n keep their
   original raw meaning (chrome.js indexes def.stops[a.k] directly), so a Tier-B day stop is skipped the
   same way an unresolved {neighbour} token always was, never by renumbering the stops around it.
*/
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function mount(ctx, deps) {
  if (!ctx.atlas || !ctx.atlas.on) return null;
  const { TOURS = [], DWELL = { short: 0.45, normal: 1, long: 1.7 }, KIOSK, reduced, P } = deps || {};
  const byId = (id) => TOURS.find((t) => t.id === id) || null;

  /* R6: why = the last pause's reason ('user' | 'manual' | 'end' ...), hand = a step the visitor asked for (next/prev) is in flight */
  const active = { id: null, k: 0, n: 0, playing: false, angleK: 0, angleN: 1, holding: 0, enRoute: false, why: null, hand: false };
  const CHANGEFNS = [];
  const EVFNS = {};
  const sub = (list, fn) => { list.push(fn); return () => { const k = list.indexOf(fn); if (k >= 0) list.splice(k, 1); }; };
  function fire() { CHANGEFNS.slice().forEach((f) => { try { f(active); } catch (e) { console.warn('tour onChange', e); } }); }
  /* K3: a named event bus alongside onChange (fired on every state tick) — 'end' fires once, only at a tour's
     natural completion (never on a manual pause), so chrome.js's end card doesn't have to re-derive it. */
  function on(ev, fn) { const list = EVFNS[ev] || (EVFNS[ev] = []); return sub(list, fn); }
  function emit(ev, payload) { (EVFNS[ev] || []).slice().forEach((f) => { try { f(payload); } catch (e) { console.warn('tour on:' + ev, e); } }); }

  let epoch = 0;            /* bumped to cancel any in-flight hold/flight/typing */
  let curStopId = null;     /* room id the camera is actually standing in right now */
  let manualTimer = 0;      /* kiosk: resume 45s after the last manual pause with no further input */
  let capPromise = Promise.resolve(); /* R3 M4-a/b: the real ctx.caption.type() promise currently in flight —
     chrome.js's own compact-card carousel already paces a caption's full read (typeChunks), so this is the
     authoritative "is this caption done yet" signal. Reading it (never estimating chars-per-second again)
     replaces the old readSec guess that used to run its own hold AFTER caption.type() had already been
     awaited to completion, effectively summing the two. */
  const CAP_PAD_MS = 1500;  /* R3 M4-a: courtesy pause once a caption's own carousel resolves */

  /* -------------------------------------------------------------- guarded "seen k of n" (the visitor's
     own progress only: no badges, no streaks, §4.1) */
  const SEEN_KEY = 'sm_atlas_seen_v1';
  function loadSeen() { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function saveSeen(obj) { try { localStorage.setItem(SEEN_KEY, JSON.stringify(obj)); } catch (e) {} }
  let seenMap = loadSeen();
  function markSeen(id, k) { const s = new Set(seenMap[id] || []); s.add(k); seenMap[id] = [...s]; saveSeen(seenMap); }
  function seenCount(id) { return (seenMap[id] || []).length; }

  /* -------------------------------------------------------------- token resolution (§4.2). every number
     in a caption is sourced from a shipped data file; a token that cannot resolve skips the whole stop
     rather than typing a hole. universe_* files ship regardless of whether R4 has mounted yet. */
  const TC = {};
  const dataOr = (name, fallback) => ctx.data(name).catch(() => fallback);
  const getNodes = () => TC.nodes || (TC.nodes = dataOr('universe_nodes', { nodes: [], named_play_share: 0, top5_by_plays: [] }));
  const getArtistsAll = () => TC.all || (TC.all = dataOr('universe_artists_all', { placed: [] }));
  const getDays = () => TC.days || (TC.days = dataOr('universe_days', { days: [] }));
  const getEdges = () => TC.edges || (TC.edges = dataOr('universe_edges', { edges: [] }));

  async function medianDay() {
    if (TC.medianDay !== undefined) return TC.medianDay;
    const d = await getDays();
    const days = (d.days || []).filter((r) => r.d >= '2022-02-01');
    if (!days.length) return (TC.medianDay = null);
    const ns = days.map((r) => r.n).slice().sort((a, b) => a - b), m = ns.length;
    const med = m % 2 ? ns[(m - 1) / 2] : (ns[m / 2 - 1] + ns[m / 2]) / 2;
    const hit = days.find((r) => r.n === med);
    return (TC.medianDay = hit ? hit.d : null);
  }
  async function neighbourOf(starName) {
    if (!starName) return null;
    const [nodes, edges] = await Promise.all([getNodes(), getEdges()]);
    const node = (nodes.nodes || []).find((n) => n.name === starName);
    if (!node) return null;
    let best = null, bestRate = -1;
    (edges.edges || []).forEach((e) => {
      if (e.a !== node.id && e.b !== node.id) return;
      if (e.auto_rate > bestRate) { bestRate = e.auto_rate; best = e.a === node.id ? e.b : e.a; }
    });
    if (best == null) return null;
    const other = (nodes.nodes || []).find((n) => n.id === best);
    return other ? other.name : null;
  }
  /* -------------------------------------------------------------- K4/W21: a stop or then-angle whose own angle
     is 'day' is skipped exactly like an unresolved {neighbour} token when Tier B never loaded. peek('universe')
     is the live, authoritative source once the room has mounted; the direct index fetch below only covers a
     tour's very first hop into the universe (nothing has set `has` yet because the room itself hasn't mounted) —
     the same "ask before landing" shape resolveCaption's own {median_day}/{named} fetches already use. */
  function daysHas() { const u = ctx.peek && ctx.peek('universe'); return u && u.has && typeof u.has.days === 'boolean' ? u.has.days : null; }
  async function daysAvailable() {
    const known = daysHas(); if (known != null) return known;
    if (TC.daysIdx !== undefined) return TC.daysIdx;
    try { await ctx.data('universe_days_index'); return (TC.daysIdx = true); } catch (e) { return (TC.daysIdx = false); }
  }
  /* best-effort synchronous read for callers (chrome.js's per-frame render) that cannot await; never guesses
     "unavailable" — only peek()'s or the fetch above's confirmed false skips anything (K4 wording, literally) */
  function daysAvailableSync() { const known = daysHas(); return known != null ? known : (TC.daysIdx !== undefined ? TC.daysIdx : true); }
  const thenAngleId = (t) => (typeof t === 'string' ? t : t.angle);
  async function visibleThen(stopThen) {
    if (!stopThen || !stopThen.some((t) => thenAngleId(t) === 'day')) return stopThen || [];
    return (await daysAvailable()) ? stopThen : stopThen.filter((t) => thenAngleId(t) !== 'day');
  }
  /* exposed on the api for chrome.js (M3): its tourState() reads def.stops.length verbatim (R2_REQUESTS_M4.md #1) */
  function effectiveStopCount(id) {
    const def = byId(id); if (!def) return 0;
    const daysOk = daysAvailableSync();
    return def.stops.filter((sd) => !sd.pending && (daysOk || sd.angle !== 'day')).length;
  }
  async function resolveFocusToken(raw) {
    const m = /^top5_by_plays\[(\d)\]$/.exec(raw || '');
    if (!m) return null;
    const nodes = await getNodes();
    const id = (nodes.top5_by_plays || [])[+m[1]];
    if (id == null) return null;
    const node = (nodes.nodes || []).find((n) => n.id === id);
    return node ? { artist: node.name } : null;
  }
  function perDot() { return (P && P.perDot) || 1; }
  function syncToken(name) {
    const pd = perDot();
    if (name === 'per_dot') return pd === 1 ? '' : ' (on this screen one dot is four plays)';
    if (name === 'every_dot') return pd === 1 ? 'every play is a dot' : 'every fourth play is a dot on this screen';
    if (name === 'one_play') return pd === 1 ? 'one play' : 'four plays';
    return null;
  }
  /* returns null (never a partial string with a hole) when a token cannot be resolved */
  async function resolveCaption(raw, extra) {
    if (!raw) return '';
    let text = raw;
    if (/\{per_dot\}/.test(text)) text = text.replace(/\{per_dot\}/g, syncToken('per_dot'));
    if (/\{every_dot\}/.test(text)) text = text.replace(/\{every_dot\}/g, syncToken('every_dot'));
    if (/\{one_play\}/.test(text)) text = text.replace(/\{one_play\}/g, syncToken('one_play'));
    if (/\{named\}|\{dust_artists\}|\{play_share\}/.test(text)) {
      /* R5: only {dust_artists} needs the full roster; {named}/{play_share} read the Tier A nodes, so a landing never pulls artists_all */
      const needAll = /\{dust_artists\}/.test(text);
      const [nodes, all] = await Promise.all([getNodes(), needAll ? getArtistsAll() : Promise.resolve({ placed: [] })]);
      const named = (nodes.nodes || []).length;
      const dust = (all.placed || []).filter((p) => p === 1).length;
      const share = Math.round(100 * (nodes.named_play_share || 0));
      if (!named && /\{named\}/.test(text)) return null;
      text = text.replace(/\{named\}/g, String(named)).replace(/\{dust_artists\}/g, String(dust)).replace(/\{play_share\}/g, String(share));
    }
    if (/\{median_day\}/.test(text)) {
      const day = await medianDay();
      if (day == null) return null;
      text = text.replace(/\{median_day\}/g, day);
    }
    if (/\{neighbour\}/.test(text)) {
      const nb = await neighbourOf(extra && extra.starName);
      if (nb == null) return null; /* §4.2: the stop is skipped if the star has no kept edge */
      text = text.replace(/\{neighbour\}/g, nb);
    }
    return text;
  }

  /* -------------------------------------------------------------- the runner. gotoTourStop presents a
     stop (activate + angle + fly + focus + type the caption) without holding; driver() adds the hold,
     the then-angles and the advance-to-next-stop loop, and only runs while active.playing. */
  function angleBar(frac) { const n = 18, f = Math.round(clamp(frac, 0, 1) * n); return '#'.repeat(f) + '-'.repeat(n - f); }
  /* CRIT6A: holdLeft(ms) lets the room on screen re-time the hold in flight: "end this stop ms from now" (shorter or
     longer than authored). the game uses it to advance once its own demo card lands, or to keep a visitor's run going.
     a call made before the hold starts (still flying in) waits for that stop's hold. playing time only, like the hold. */
  let lead = null, pend = null;
  function holdFor(ms, my, main) {
    return new Promise((resolve) => {
      let elapsed = 0, h = null;
      if (main) {
        if (pend && pend.my === my && pend.k === active.k) ms = pend.left;
        pend = null; h = lead = { my, k: active.k, set(left) { ms = elapsed + left; } };
      }
      const off = ctx.onFrame((t, dt) => {
        if (my !== epoch) { off(); if (lead === h) lead = null; resolve(); return; }
        if (!active.playing) return; /* frozen: pause() does not cancel epoch, it just stops accumulation */
        elapsed += dt || 16.7;
        active.holding = ms > 0 ? clamp(elapsed / ms, 0, 1) : 1;
        if (elapsed >= ms) { off(); if (lead === h) lead = null; resolve(); }
      });
    });
  }
  function holdLeft(left) {
    if (!active.id || !active.playing || !(left >= 0)) return false;
    if (lead && lead.my === epoch && lead.k === active.k) lead.set(left);
    else pend = { my: epoch, k: active.k, left };
    return true;
  }
  /* R3 M4-a: kicks off a caption WITHOUT blocking the caller on its full typing/carousel — the entrance
     stop used to `await` this to completion before the driver's own hold even started, so a phone's
     multi-chunk carousel (chrome.js typeChunks) added its whole read time on top of the hold instead of
     inside it. Stashing the live promise on `capPromise` lets dwellFor race it against the authored hold
     instead of summing them. */
  function startCaption(text, opts) {
    let p; try { p = Promise.resolve(ctx.caption.type(text, opts)); } catch (e) { p = Promise.resolve(); }
    capPromise = p.catch(() => {});
    return capPromise;
  }
  /* R3 M4-a: the actual per-stop/per-angle dwell — max(authored hold, caption carousel + pad), never the
     sum. `hasCaption` false (a then-angle with no caption of its own, e.g. `flood`) skips racing capPromise
     entirely so a stale in-flight caption from three angles ago can never stretch this hold. */
  function dwellFor(minMs, hasCaption, my) {
    if (!hasCaption) return holdFor(minMs, my, true);
    const capP = capPromise;
    return Promise.all([holdFor(minMs, my, true), capP.then(() => (my === epoch ? holdFor(CAP_PAD_MS, my) : undefined))]);
  }
  async function gotoTourStop(id, k, my) {
    const def = byId(id); if (!def || !def.stops || !def.stops[k]) return;
    const stopDef = def.stops[k];
    /* R2_VERIFY_1_honesty P0-2: a stop held `pending` an owner/referee flag never plays — same skip path
       an unresolved {neighbour} token or an absent Tier-B day angle already use, so a caption ships only
       once the flag clears in tours.js, never because the pending marker was forgotten at typing time. */
    if (stopDef.pending) { await skipStop(id, k, my); return; }
    const visThen = await visibleThen(stopDef.then);
    if (my !== epoch) return;
    active.id = id; active.k = k; active.n = def.stops.length;
    active.angleK = 0; active.angleN = 1 + visThen.length; active.holding = 0; fire();

    if (stopDef.angle === 'day' && !(await daysAvailable())) { await skipStop(id, k, my); return; }
    if (my !== epoch) return;

    let focusObj = null;
    if (stopDef.focus) focusObj = typeof stopDef.focus === 'string' ? await resolveFocusToken(stopDef.focus) : stopDef.focus;
    if (my !== epoch) return;
    let dayVal = stopDef.day; if (dayVal === '{median_day}') dayVal = (await daysAvailable()) ? await medianDay() : null;
    if (my !== epoch) return;

    const caption = await resolveCaption(stopDef.caption, { starName: focusObj && focusObj.artist });
    if (my !== epoch) return;
    if (caption == null) { await skipStop(id, k, my); return; }

    const isNewRoom = curStopId !== stopDef.room;
    if (isNewRoom) { active.enRoute = true; fire(); }
    try { await ctx.go(stopDef.room, { angle: stopDef.angle, via: 'tour', instant: !!reduced }); } catch (e) {}
    if (my !== epoch) return;
    curStopId = stopDef.room;
    if (stopDef.pose) {
      active.enRoute = true; fire();
      let speed = 'quick'; try { speed = ctx.settings.get('travel') || 'quick'; } catch (e) {}
      try { await ctx.view.flyTo(stopDef.pose, { speed }); } catch (e) {}
    }
    if (my !== epoch) return;
    active.enRoute = false; fire();

    const focusDesc = Object.assign({}, focusObj || {}, dayVal ? { day: dayVal } : {}, stopDef.arm ? { arm: stopDef.arm } : {});
    if (Object.keys(focusDesc).length) { try { await ctx.go(stopDef.room, { focus: focusDesc, via: 'tour' }); } catch (e) {} }
    if (my !== epoch) return;
    /* R3 M4-a: not awaited — driver()'s dwellFor races this same promise against the authored hold, so
       the visible carousel and the hold run concurrently instead of the carousel's full read time landing
       entirely before the hold even begins. */
    startCaption(caption, { cursor: !reduced });
  }
  async function skipStop(id, k, my) {
    const def = byId(id); if (!def) return;
    if (k >= def.stops.length - 1) {
      if (KIOSK) return gotoTourStop(id, 0, my);
      active.playing = false; active.why = 'end'; fire(); emit('end', { id }); return;
    }
    return gotoTourStop(id, k + 1, my);
  }
  async function driver(my) {
    for (;;) {
      if (my !== epoch) return;
      const def = byId(active.id); if (!def) return;
      const stopDef = def.stops[active.k]; if (!stopDef) return;
      let dwellMul = 1; try { dwellMul = DWELL[ctx.settings.get('dwell') || 'normal']; } catch (e) {} if (!dwellMul) dwellMul = 1;
      /* R3 M4-a: max(authored hold, the entrance caption's own carousel + pad), raced via dwellFor —
         never a sum of the two. */
      await dwellFor((stopDef.hold || 9) * dwellMul * 1000, !!stopDef.caption, my);
      if (my !== epoch) return;
      const visThen = await visibleThen(stopDef.then);
      if (my !== epoch) return;
      if (visThen.length) {
        /* R3 M4-b: a room can flip its OWN angle mid-hold, on its own timeline, not the driver's — the
           wall room's "the flood has covered it, sort now" transition calls ctx.angle.set(...,{via:'room'})
           as soon as ITS animation lands, which can be well before this loop's own ti=1 gets there. A
           caption keyed to the loop's step index goes stale for that whole gap (measured: 6+ s of the
           sorted piles under the still-unanswered question). ctx.angle.set() fires onChange SYNCHRONOUSLY,
           ahead of its own returned (possibly animated) promise, for every caller — the tour's explicit
           set() below included — so one listener for the rest of this stop's dwell is the single source
           the caption now tracks, whoever actually changed the picture. */
        /* R5 INT2: captions are kept per then-step as well as per angle id, so a stop whose `then` repeats one angle
           (several sentences over one picture) types each step's own caption; a room's own flip still reads the
           first caption written for that angle. a caption is retyped only when its text changes */
        const capByAngle = {}, capAt = [];
        for (const t of visThen) {
          let txt = null;
          if (t && typeof t === 'object' && t.caption) {
            txt = await resolveCaption(t.caption, {});
            if (my !== epoch) return;
          }
          capAt.push(txt);
          if (txt != null && capByAngle[thenAngleId(t)] == null) capByAngle[thenAngleId(t)] = txt;
        }
        let lastCap = null, step = -1;
        const say = (txt) => { if (txt != null && txt !== lastCap) { lastCap = txt; startCaption(txt, { cursor: !reduced }); } };
        const offAngle = ctx.angle.onChange((a) => { if (my === epoch) say(step >= 0 ? capAt[step] : capByAngle[a.id]); });
        try {
          for (let ti = 0; ti < visThen.length; ti++) {
            if (my !== epoch) return;
            const t = visThen[ti], angleId = thenAngleId(t);
            active.angleK = ti + 1; fire();
            try { step = ti; const p = ctx.angle.set(angleId, { via: 'tour', instant: !!reduced }); step = -1; await p; } catch (e) { step = -1; }
            if (my !== epoch) return;
            say(capAt[ti]);
            await dwellFor(6 * dwellMul * 1000, capAt[ti] != null, my);
            if (my !== epoch) return;
          }
        } finally { offAngle(); }
      }
      if (my !== epoch) return;
      markSeen(active.id, active.k);
      if (active.k >= def.stops.length - 1) {
        if (KIOSK) { await gotoTourStop(active.id, 0, my); if (my !== epoch) return; continue; }
        active.playing = false; active.why = 'end'; fire(); emit('end', { id: active.id }); return;
      }
      await gotoTourStop(active.id, active.k + 1, my);
      if (my !== epoch) return;
    }
  }
  async function startFrom(id, k, my) {
    await gotoTourStop(id, k, my);
    if (my !== epoch) return;
    if (active.playing) await driver(my);
  }

  /* -------------------------------------------------------------- off-tour: the walk itself */
  function walkList() { return ctx.stops.filter((s) => !s.side); }
  function currentStopObj() { const i = ctx.index; return (ctx.stops || []).find((s) => s.i === i) || null; }
  function stepWalk(dir, via) {
    const walk = walkList(), cur = currentStopObj();
    const p = cur ? walk.findIndex((s) => s.id === cur.id) : -1;
    const q = clamp((p < 0 ? 0 : p) + dir, 0, walk.length - 1);
    if (!walk[q] || (p >= 0 && q === p)) return Promise.resolve(false);
    return ctx.go(walk[q].id, { via: via || 'key' });
  }

  /* -------------------------------------------------------------- public API */
  function list() { return TOURS.map((t) => { const S = t.stops || []; return { id: t.id, name: t.name, blurb: t.blurb, stops: S.length, shown: S.length - (S[0] && S[0].gate ? 1 : 0) }; }); }
  function play(id, k, opts) {
    const def = byId(id); if (!def || !def.stops || !def.stops.length) return;
    opts = opts || {};
    clearTimeout(manualTimer);
    const my = ++epoch;
    let wantPlay = opts.autoplay !== false;
    if (reduced && !KIOSK) wantPlay = false; /* §9.3: reduced motion starts tours paused, kiosk excepted */
    active.playing = wantPlay; active.why = null; active.hand = false;
    startFrom(id, clamp(k || 0, 0, def.stops.length - 1), my).catch((e) => console.warn('tour', e));
  }
  function pause(reason) {
    if (!active.id || !active.playing) return;
    active.playing = false; active.why = reason || null; fire();
    if (KIOSK) { clearTimeout(manualTimer); manualTimer = setTimeout(() => resume(), 45000); }
  }
  function resume() {
    if (!active.id) return;
    clearTimeout(manualTimer);
    active.playing = true; active.why = null; fire();
    const my = ++epoch;
    startFrom(active.id, active.k, my).catch((e) => console.warn('tour', e));
  }
  /* K3: the one control both the space key and chrome.js's play/pause button drive (§0.9/W09) */
  function isPlaying() { return !!(active.id && active.playing); }
  function toggle() {
    if (!active.id) { play('grand', active.k || 0); return; }
    if (active.playing) pause('manual'); else resume();
  }
  function stepTour(dir) {
    if (!active.id) return stepWalk(dir, 'key');
    const def = byId(active.id); if (!def) return Promise.resolve(false);
    const k = clamp(active.k + dir, 0, def.stops.length - 1);
    if (k === active.k) return Promise.resolve(false);
    const wasPlaying = active.playing, my = ++epoch;
    active.hand = true;
    (async () => { try { await gotoTourStop(active.id, k, my); } finally { if (my === epoch) active.hand = false; } if (my !== epoch) return; if (wasPlaying) await driver(my); })().catch((e) => console.warn('tour', e));
    return Promise.resolve(true);
  }
  const api = {
    list, active, play, pause, resume, toggle, isPlaying, holdLeft,
    next: () => stepTour(1), prev: () => stepTour(-1),
    onChange(fn) { return sub(CHANGEFNS, fn); },
    on, resolveCaption, effectiveStopCount,
    seen: seenCount, angleBar,
  };

  /* -------------------------------------------------------------- manual-pause detection (§1.10): a stop
     change whose via is not 'tour' (search/tap/ladder/url/key/door), a camera drag or zoom (ctx.view.manual),
     or a click on a room control, all end autoplay with the way back left in ctx.tour.active.playing=false. */
  ctx.onStop(({ id, via }) => {
    /* 'mount' is the shell's own one-time catch-up ping (fired once after every module has mounted, for
       whichever room already happened to be active) — never a navigation, so it must never pause a tour
       a url.js deep link just started playing. */
    /* FIX3: 'url' is not a departure either: the shell's boot activation (activate(start, 'url')) reports once its room has
       loaded, which on a fast load lands after this module mounted and a deep link (or the bare page's grand tour) began
       playing, and parked it paused (#tour=grand&stop=1 read playing:false ~70 ms after atlasReady). url.js's own go()s
       are the same once-only deep-link apply */
    const nav = via !== 'tour' && via !== 'mount' && via !== 'url';
    if (active.id && active.playing && nav) pause('user');
    curStopId = id;
    if (!active.id) { const walk = walkList(), k = walk.findIndex((s) => s.id === id); active.k = k < 0 ? 0 : k; active.n = walk.length; fire(); }
    else if (nav) {
      /* V4 a11y P1-3: the grand tour sits paused from load, so a Home/End/digit/search/route jump used to leave
         active.k where the tour last was and j/k, Space and the next-stop pill stepped from a stale stop */
      const def = byId(active.id), k = def ? def.stops.findIndex((s) => s.room === id) : -1;
      if (k >= 0 && k !== active.k) { active.k = k; fire(); }
    }
  });
  try {
    ctx.view.onChange(() => { if (active.id && active.playing && ctx.view.manual) pause('user'); });
  } catch (e) {}
  function isChromeEl(el) { return !!(el.closest && el.closest('#top,#atlas-dock,.atlas-panel,#atlas-info,.atlas-ladder,#atlas-labels,dialog')); }
  document.addEventListener('pointerdown', (e) => {
    if (!active.id || !active.playing) return;
    const el = e.target && e.target.closest && e.target.closest('button,input,select,[role="button"],[role="slider"],a[href]');
    if (!el || isChromeEl(el) || !el.closest('section[data-room]')) return;
    pause('user');
  }, { capture: true, passive: true });
  const TOURKEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ']', 'j', ' ', 'ArrowLeft', 'ArrowUp', 'PageUp', '[', 'k', '.', ',', 'Home', 'h', 'End', 'p', '+', '=', '-', 'r', 'Escape', 'm', 'l', '?', 'v', 'g', 'y', '/', 'o', 'e', 'E']);
  document.addEventListener('keydown', (e) => {
    if (!active.id || !active.playing) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (/^[0-9]$/.test(e.key) || TOURKEYS.has(e.key)) return;
    pause('user');
  }, { capture: true, passive: true });

  /* -------------------------------------------------------------- keys this module registers (§2.6): p and
     space both toggle play/pause (starting the grand tour from the visitor's current stop if none is active,
     R2 critique: "space toggles it". space must still activate a focused button
     natively (BUILD_SPEC_V2 Gotchas), so it hands back to the default there instead of toggling. */
  ctx.keys.on('p', () => { toggle(); return true; });
  ctx.keys.on(' ', (e) => {
    const t = e && e.target;
    if (t && t.closest && t.closest('button,a,[role="button"]')) return false;
    toggle();
    return true;
  });

  return api;
}
export default { mount };
