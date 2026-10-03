/* package M4 — url.js (BUILD_SPEC_V2 §5). Owns ctx.url only. Parses ctx.atlas.hash0 exactly once (the
   shell already activated the room-only prefix of it before any module mounted, SKELETON_NOTES "ctx.atlas
   hash0"), then layers on the richer #tour=/&a=/&c=/#universe&... forms the shell's own early parse does
   not know about. Writing is history.replaceState only, throttled to <=1/s, never touches Back/Forward.
   Same as gcdatlas (its updateHash is replaceState-only, no popstate): Back leaves the atlas, it never
   steps back one stop. */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function decodePose(s) {
  if (!s) return null;
  const p = String(s).split(',');
  if (p[0] === 'o' && p.length >= 4) { const yaw = +p[1], pitch = +p[2], z = +p[3]; return isFinite(yaw) && isFinite(pitch) && isFinite(z) ? { yaw, pitch, z } : null; }
  if (p[0] === 'u' && p.length >= 7) { const yaw = +p[1], pitch = +p[2], dist = +p[3], x = +p[4], y = +p[5], z = +p[6]; return [yaw, pitch, dist, x, y, z].every(isFinite) ? { yaw, pitch, dist, target: [x, y, z] } : null; }
  if (p.length >= 3) { const z = +p[0], u = +p[1], v = +p[2]; return [z, u, v].every(isFinite) ? { z, u, v } : null; }
  return null;
}
function parseParams(parts) {
  const params = {};
  parts.forEach((p) => { const eq = p.indexOf('='); if (eq < 0) return; try { params[decodeURIComponent(p.slice(0, eq))] = decodeURIComponent(p.slice(eq + 1)); } catch (e) {} });
  return params;
}
function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return { kind: 'none' };
  const parts = raw.split('&');
  let first = ''; try { first = decodeURIComponent(parts[0] || ''); } catch (e) { first = parts[0] || ''; }
  const params = parseParams(parts.slice(1));
  const mt = /^tour=(.+)$/.exec(first);
  if (mt) { const stop = params.stop ? Math.max(1, parseInt(params.stop, 10) || 1) : 1; return { kind: 'tour', id: mt[1], stop, play: params.play !== '0' }; }
  if (first === 'universe') return { kind: 'universe', params };
  if (!first) return { kind: 'none' };
  /* `#chain=12.40.7`: the room token ends at '=' (the room reads the rest from hash0) */
  return { kind: 'stop', room: first.split('=')[0], angle: params.a, pose: params.c };
}

export function mount(ctx, deps) {
  if (!ctx.atlas || !ctx.atlas.on) return null;
  const reduced = !!(deps && deps.reduced);
  const UNIVERSE_ANGLES = ['sky', 'links', 'threads', 'day', 'star'];

  /* -------------------------------------------------------------- apply the deep link once, defensively:
     an unknown room, tour id, angle or day/level falls back silently, never an error (§5). */
  async function applyUniverse(params) {
    const angle = UNIVERSE_ANGLES.indexOf(params.a) >= 0 ? params.a : 'sky';
    const focus = {};
    if (params.n) focus.artist = params.n;
    if (params.t) { const m = /^day:(\d{4}-\d{2}-\d{2})$/.exec(params.t); if (m) focus.day = m[1]; /* year:/month: have no view here: dropped, no error (TIER_B §5.1) */ }
    if (params.f) { const fams = params.f.split(',').map((s) => s.trim()).filter(Boolean); if (fams.length > 1) focus.pair = fams.slice(0, 2); else if (fams.length === 1) focus.family = fams[0]; }
    if (params.arm) focus.arm = params.arm;
    try { await ctx.go('universe', { angle, focus: Object.keys(focus).length ? focus : undefined, via: 'url', instant: true }); } catch (e) { console.warn('url universe', e); }
  }
  async function applyOnce() {
    const parsed = parseHash(ctx.atlas.hash0);
    /* W20 (G5/A-C12b): a bare exhibit.html has nothing to restore, so it lands on the grand tour, playing —
       tour.js's own play() already parks it paused under reduced motion, so nothing extra is needed here. */
    if (parsed.kind === 'none') { try { ctx.tour.play('grand', 0); } catch (e) { console.warn('url grand', e); } return; }
    if (parsed.kind === 'tour') {
      const known = ctx.tour.list().some((t) => t.id === parsed.id);
      if (!known) return; /* garbage tour id: stay at the threshold, no error */
      const autoplay = parsed.play && !reduced;
      try { ctx.tour.play(parsed.id, Math.max(0, parsed.stop - 1), { autoplay }); } catch (e) { console.warn('url tour', e); }
      return;
    }
    if (parsed.kind === 'universe') { await applyUniverse(parsed.params); return; }
    if (parsed.kind === 'stop') {
      const pose = parsed.pose ? decodePose(parsed.pose) : null;
      if (!parsed.angle && !pose) return; /* the shell's own early read already landed the room */
      try { await ctx.go(parsed.room, { angle: parsed.angle || undefined, pose: pose || undefined, via: 'url', instant: true }); } catch (e) { console.warn('url stop', e); }
    }
  }

  /* -------------------------------------------------------------- write (throttled <=1/s, replaceState only) */
  const hashState = { stop: null, angle: null, pose: null, uni: {} };
  let queued = false, lastWrite = -1e9;
  function serialize() {
    if (!hashState.stop) return null;
    const parts = [];
    if (hashState.stop === 'universe') {
      if (hashState.angle) parts.push('a=' + encodeURIComponent(hashState.angle));
      const u = hashState.uni || {};
      if (u.t) parts.push('t=' + encodeURIComponent(u.t));
      if (u.n) parts.push('n=' + encodeURIComponent(u.n));
      if (u.arm) parts.push('arm=' + encodeURIComponent(u.arm));
      if (u.f) parts.push('f=' + encodeURIComponent(u.f));
    } else {
      if (hashState.angle) parts.push('a=' + encodeURIComponent(hashState.angle));
      if (hashState.pose) parts.push('c=' + hashState.pose);
    }
    return '#' + encodeURIComponent(hashState.stop) + (parts.length ? '&' + parts.join('&') : '');
  }
  function doWrite() {
    lastWrite = performance.now();
    const hash = serialize(); if (!hash) return;
    try { if (location.hash !== hash) history.replaceState(null, '', hash); } catch (e) {}
  }
  function scheduleWrite() {
    if (queued) return;
    const wait = Math.max(0, 1000 - (performance.now() - lastWrite));
    queued = true;
    setTimeout(() => { queued = false; doWrite(); }, wait);
  }
  function write(partial) {
    if (!partial) return;
    if (partial.stop != null) { if (partial.stop !== hashState.stop) { hashState.angle = null; hashState.pose = null; hashState.uni = {}; } hashState.stop = partial.stop; }
    if (partial.angle !== undefined) hashState.angle = partial.angle || null;
    if (partial.pose !== undefined) hashState.pose = partial.pose || null;
    if (partial.uni) hashState.uni = Object.assign({}, hashState.uni, partial.uni);
    scheduleWrite();
  }
  function read() {
    const parsed = parseHash(location.hash);
    return Object.assign({}, hashState, { live: parsed });
  }

  /* keep angle/pose (and, best-effort, the universe's own substate) in sync as the visitor moves */
  try { ctx.angle.onChange((a) => write({ angle: a && a.id !== 'main' ? a.id : null })); } catch (e) {}
  let poseT = 0;
  try {
    ctx.view.onChange(() => {
      clearTimeout(poseT);
      poseT = setTimeout(() => { let p = ''; try { p = ctx.view.pose(); } catch (e) {} write({ pose: p || null }); }, 400);
    });
  } catch (e) {}
  function syncUniverse() {
    if (hashState.stop !== 'universe') return;
    const api = ctx.peek('universe'); if (!api) return;
    try { const s = typeof api.state === 'function' ? api.state() : null; if (s) write({ uni: { t: s.t, n: s.n, arm: s.arm, f: s.f } }); } catch (e) {}
  }
  let uniPoll = 0;
  ctx.onStop(({ id }) => {
    /* the stop's current angle, not null: a deep link's &a= was already applied by ctx.go before onStop ran, and a null here wiped it from the hash for every room (R5 fade M4) */
    let ang = null; try { const a = ctx.angle.get(); ang = a && a.id !== 'main' ? a.id : null; } catch (e) {}
    write({ stop: id, angle: ang, pose: null });
    clearInterval(uniPoll);
    if (id === 'universe') { syncUniverse(); uniPoll = setInterval(syncUniverse, 800); }
  });

  applyOnce().catch((e) => console.warn('url applyOnce', e));

  return { write, read };
}
export default { mount };
