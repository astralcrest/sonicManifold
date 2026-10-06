/* package M6 — anchored labels, `ctx.labels` (BUILD_SPEC_V2 §1.7, REFERENCE.md §4, D10).
   name DOM buttons (M8, R6: liner notes, no brackets; a starred artist's name carries its plays mark, below) anchored in field/camera space, up-right of their object, no leader lines. Greedy by
   priority, max 32 visible (governor T5: 12), 6px gap, keepouts, 0.8s fade in / 0.3s fade out. Off-screen indicator
   for the locked object. Recomputes placement only when the camera or an item changed (view.onChange / set / update),
   never in the render hot loop; keepout rects and label widths are cached, not read every frame.

   the locked object (fix r1): what the camera chip calls LOCKED ON is the camera's lock label (view.lock), however it
   was set (a label click, a tap on the field, a search result, a tour stop). the label with that text is the target:
   placed first whatever its zoom band or the cap, ice and at full opacity on a plate, with a reticle on the object
   itself, and every other label keeps clear of the reticle. a manual camera move (FREE CAMERA) keeps the selection so
   the off-screen chip can lead back to it; home, a tour, a room change or ctx.lock(null) end it. chrome.js announcing
   ctx.lock as a document `atlas:lock` event (REQUESTS_fix_r1_M6.md) makes ctx.lock(null) end it immediately.

   legibility (fix r1, replaced round 2): the top 8 object labels by priority read 11px in ink at .85. a label used to
   get a translucent plate once it sat on occupied glyph cells; round 2 (M6 W1) found that read as a grey sticky note
   over the art on desktop as much as it ever did on touch, so no label but the lock carries a background any more —
   a stronger triple text-shadow halo (anchors.css) carries legibility instead, and a candidate position whose box
   would cover too dense a patch of drawn glyphs (coverage() against the field's last frame, DENSE_ON on a pointer
   screen, the stricter PHONE_COVER on touch) is rejected during the search below rather than compensated after.

   touch (fix r2): on a touch-first screen every tappable label is a 44px target. anchors.css grows the box by a
   transparent pad (PAD_H/PAD_V) and cancels it with a negative margin, so the pill is drawn exactly where it is placed
   here. placement keeps every pad off every other label's pill and off the chrome, a press in a pad goes to the
   nearest pill, and the layer is bound to the gesture layer like the field, so a drag that starts on a label still
   turns the camera instead of dying on the label. labels with nowhere to go are plain spans, not buttons. round 2:
   a phone also caps the field at PHONE_CAP labels (lower than the governor's own MAX_VISIBLE_GOV), so a dense stop
   never shows more names than it can lay out legibly; candidates are already sorted by priority (plays), so the cap
   drops the least-played names first.

   the viewport (fix r2): a label is drawn whole, 8px inside the window, or not at all. up-right of its object first;
   at a window edge it takes the next corner that fits (up-left, down-right, down-left), still touching its object;
   an object off the window has no label (the locked one gets the off-screen chip instead). round 2 (M6 W2): "the
   window" here means the visible stage, not the raw viewport — a candidate whose own anchor point projects outside
   ctx.atlas.stage0() (less the ladder's own margin, ctx.atlas.insets.right) or under the active room's `.wall` text
   column is culled the same way, so a name never floats in the blank margin behind the caption with nothing under it
   to point at; a locked object that lands there gets the off-screen chip instead, exactly as if it left the window.

   declutter (round 2): two labels collide when their drawn pills (never the touch pad) come within GAP; a touch pad
   may sit over another label's pad or pill, it only ever has to stay off a keepout. a candidate tries its 4 corners
   at the usual offset and, before it is dropped, tries them again at double that offset with a thin 1px leader drawn
   back to the object (`.lab-leader`), so a crowded cluster thins out gracefully instead of losing labels outright.
   refresh() is the shell's hook after it re-measures its own chrome: same as a resize, a keepout re-read followed by
   a re-place. */

const MAX_VISIBLE = 32, MAX_VISIBLE_GOV = 12, PHONE_CAP = 10, GAP = 6, EDGE_MARGIN = 24, NODE_CAP = 96;
const HI_N = 8, OBJ_OFF = 6, VIEW_M = 8;
const TOUCH_MQ = '(pointer:coarse),(max-aspect-ratio:115/100)'; /* the same switch as chrome.css's 44px pass */
const PAD_H = 6, PAD_V = 14; /* anchors.css: the pad around a tappable label's pill on a touch screen, css px */
const OFF_PAD = 11; /* ... and around the off-screen chip's */
const TAP_DEDUPE = 700; /* ms: a press the gesture layer already took as a tap is not taken again by its click */
const QUADS = [[1, -1], [-1, -1], [1, 1], [-1, 1]]; /* up-right, up-left, down-right, down-left */
const LABEL_H = 18, LABEL_H_HI = 19, LABEL_H_LOCK = 21; /* line-height 1.3 + padding (+ the lock's 1px border) */
const OFF_W = 160, OFF_H = 26; // the off-screen indicator's own generous footprint, so its clamp never clips it at an edge
const RET_MIN = 10, RET_MAX = 48; /* reticle half-size, css px */
/* round 2 (M6 W1/W3): share of a candidate box's glyph cells that are drawn above which the position is rejected
   outright (tried again at another corner/ring, or the label drops) instead of getting a plate to compensate.
   touch reads denser and its type is smaller, so its own ceiling is stricter. */
const DENSE_ON = 0.45, PHONE_COVER = 0.35;
/* round 2 fix (V1, R2_REQUESTS_R4): the per-cell tone a cell must reach to count as "drawn" in coverage() below --
   the same DENSE_T the universe's own boxCover() culls against. glyphAt() alone is a haze floor away from bare, so a
   faint dust cell (`.`/`'`, dithered in well under DENSE_ON/PHONE_COVER of the time) still counted as "on" and made
   almost every box on a hazy sky read 0.4-0.9 covered -- coverMax rejected nearly everywhere. Thresholding on tFor
   instead leaves the ceilings themselves (DENSE_ON, PHONE_COVER) meaning what they always meant: the share of a box
   sitting on cells actually dense enough to bury a label, not merely touched by the lightest dither. */
const COVER_T = 0.35;
const MONO = '"JetBrains Mono","SF Mono",ui-monospace,Menlo,monospace';
const FONTS = {
  obj: ['400 10.5px ' + MONO, 0.06 * 10.5, 8, false, false],
  hi: ['400 11px ' + MONO, 0.06 * 11, 8, false, false],
  lock: ['500 11px ' + MONO, 0.06 * 11, 12, false, false],
  counter: ['400 10.5px ' + MONO, 0.06 * 10.5, 8, false, false],
  tag: ['400 10.5px ' + MONO, 0.06 * 10.5, 8, true, false], /* universe.js still draws [ ] round a tag */
  region: ['600 11px ' + MONO, 0.14 * 11, 8, false, true],
  regionlock: ['600 11px ' + MONO, 0.14 * 11, 12, false, true],
}; /* [font, letter-spacing px/char (canvas measureText ignores it), horizontal padding+border, brackets, uppercase] */

export function mount(ctx, deps) {
  if (!ctx || !ctx.atlas || !ctx.atlas.on) return null; /* shell keeps its own inert default (§SKELETON facades) */

  const doc = document;
  let layer = doc.getElementById('atlas-labels');
  if (!layer) {
    layer = doc.createElement('div');
    layer.id = 'atlas-labels';
    layer.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(layer);
  }
  const retEl = doc.createElement('div');
  retEl.className = 'lab-ret';
  retEl.innerHTML = '<i></i><i></i><i></i><i></i>';
  layer.appendChild(retEl);
  let retOn = false, retKey = null;
  let tapAt = -1e9;
  /* fix r3: WebKit/iOS hit-test a touch tap's compatibility click afresh, a few ms after touchend. when another layer took
     the tap (a listeners node, the bare field) and the re-placement it caused put a pill under the finger, that click
     lands on the pill and would override the selection the tap just made. a pointer click counts only when the press
     that produced it began on this layer; keyboard and scripted clicks (detail 0) always count. */
  let downHere = false;
  const onAnyDown = (e) => { const t = e.target; downHere = !!(t && t.nodeType === 1 && layer.contains(t)); };
  addEventListener('pointerdown', onAnyDown, { capture: true, passive: true });
  const takesClick = (e) => (!e || !(e.detail > 0) || downHere) && performance.now() - tapAt >= TAP_DEDUPE;
  const offEl = doc.createElement('button');
  offEl.type = 'button'; offEl.className = 'lab-off'; offEl.tabIndex = -1;
  layer.appendChild(offEl);
  let offVisible = false, offTarget = null;
  offEl.addEventListener('click', (e) => { if (takesClick(e)) offGo(); });
  function offGo() { if (offTarget) activate(offTarget.o, offTarget.id); }

  /* ---- touch-first screen: pads on, and the gap rule that keeps a pad off every other pill ------------------ */
  let mq = null, touch = false;
  try { mq = matchMedia(TOUCH_MQ); touch = mq.matches; } catch (e) {}
  const onMq = () => { touch = !!(mq && mq.matches); markDirty(); };
  try { mq && mq.addEventListener('change', onMq); } catch (e) { try { mq && mq.addListener(onMq); } catch (e2) {} }
  function hitOf(rect) { return touch ? { left: rect.left - PAD_H, top: rect.top - PAD_V, right: rect.right + PAD_H, bottom: rect.bottom + PAD_V } : rect; }
  function inView(r, W, H) { return r.left >= VIEW_M && r.top >= VIEW_M && r.right <= W - VIEW_M && r.bottom <= H - VIEW_M; }

  /* ---- measurement (canvas metrics only; never a DOM layout read) ---------------------------------------- */
  const mcanvas = doc.createElement('canvas');
  const mctx = mcanvas.getContext('2d');
  const widthCache = new Map(); /* key: style+'|'+text -> css px */
  function measure(style, text, sig) {
    const key = style + '|' + text + '|' + (sig || '');
    let w = widthCache.get(key);
    if (w != null) return w;
    const [font, sp, pad, brackets, upper] = FONTS[style] || FONTS.obj;
    mctx.font = font;
    const t = (upper ? String(text).toUpperCase() : String(text)) + (sig ? '\u00a0' + sig : ''); /* the mark is the label's ::after */
    w = mctx.measureText(t + (brackets ? '[  ]' : '')).width + (t.length + (brackets ? 4 : 0)) * sp + pad;
    w += 3; /* small safety margin: canvas measureText vs rendered CSS text can differ by a px or two */
    widthCache.set(key, w);
    return w;
  }
  /* the mono webfont may still be loading when the first labels are measured (gcdatlas's own "rebuild after the
     webfont loads" lesson, REFERENCE.md §2): drop the cache and re-place once it's actually ready. */
  try { if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { widthCache.clear(); markDirty(); }); } catch (e) {}

  /* ---- keepout rects: refreshed on resize / stop change / governor change, and (throttled, from a timer) while the
     camera moves, since a room readout riding the camera layer moves with it; never inside place() ---------------- */
  let keepRects = [];
  /* round 2 (M6 W2): the visible field, and the active room's text column, refreshed at the same cadence as the
     keepouts above (never read inside doPlace/place()). a candidate whose own anchor lands outside stageRect or
     inside wallRect is culled before any corner is tried — see inField() below. */
  let stageRect = null, wallRect = null;
  function refreshStageRect() {
    try {
      const s = ctx.atlas.stage0 ? ctx.atlas.stage0() : null;
      if (!s) { stageRect = null; return; }
      /* stage0() is the home rect *without* the desktop ladder rail (M7 W30's own margin), so that's the one piece
         of chrome it never subtracts itself; every other edge it already resolves against the chrome's own insets. */
      const insR = (ctx.atlas.insets && +ctx.atlas.insets.right) || 0;
      stageRect = { left: s.x, top: s.y, right: s.x + s.w - insR, bottom: s.y + s.h };
    } catch (e) { stageRect = null; }
  }
  function refreshKeepouts() {
    const rects = [];
    const add = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return null;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { const k = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; rects.push(k); return k; }
      return null;
    };
    doc.querySelectorAll('[data-keepout]').forEach(add);
    doc.querySelectorAll('#top > *').forEach(add);
    add(doc.querySelector('#atlas-info'));
    const lad = add(doc.querySelector('.atlas-ladder'));
    /* the ladder's readout and names can sit outside its own box: each visible piece that pokes out is a keepout too */
    if (lad) doc.querySelectorAll('.atlas-ladder *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.left < lad.left || r.top < lad.top || r.right > lad.right || r.bottom > lad.bottom)) add(el);
    });
    add(doc.querySelector('.atlas-ladder-chip'));
    add(doc.querySelector('.atlas-sight.on')); /* the phone's fixed sight reads its own name; no label sits under it */
    add(doc.querySelector('#atlas-dock'));
    wallRect = add(doc.querySelector('section.is-active .wall'));
    try {
      const rooms = ctx.atlas.deps && ctx.atlas.deps.rooms;
      const r = rooms && rooms[ctx.index];
      const mod = r && r.mod;
      if (mod && typeof mod.keepout === 'function') {
        (mod.keepout(ctx) || []).forEach((k) => rects.push({ left: k.x, top: k.y, right: k.x + k.w, bottom: k.y + k.h }));
      }
    } catch (e) {}
    keepRects = rects;
    refreshGridScale();
    refreshStageRect();
  }
  function hitsKeepout(rect) {
    for (let k = 0; k < keepRects.length; k++) if (rectsOverlap(rect, keepRects[k], 0)) return true;
    return false;
  }
  /* round 2 (M6 W2): is this raw anchor point (the object's own screen position, before any corner offset) somewhere
     a label could honestly point at — inside the visible stage, and not under the room's own caption column? a null
     stageRect (no ctx.atlas.stage0, e.g. the dev harness) never culls, so every existing non-atlas-page test still
     sees the whole viewport as the field, exactly as before this round. */
  function inField(sx, sy) {
    if (stageRect && (sx < stageRect.left || sx > stageRect.right || sy < stageRect.top || sy > stageRect.bottom)) return false;
    if (wallRect && sx >= wallRect.left && sx <= wallRect.right && sy >= wallRect.top && sy <= wallRect.bottom) return false;
    return true;
  }

  /* ---- occupancy: the glyph field's last drawn frame (GF.tFor, dense at COVER_T or over) under a label's box --- */
  let gridScale = 1; /* device px of the field canvas per css px (the shell caps its DPR, so not devicePixelRatio) */
  function refreshGridScale() {
    try { const f = doc.getElementById('field'); gridScale = f && f.width && innerWidth ? f.width / innerWidth : 1; } catch (e) { gridScale = 1; }
  }
  function gf() {
    const G = (deps && deps.GF) || ctx.atlas.GF || (ctx.atlas.deps && ctx.atlas.deps.GF);
    return G && !G.stub && typeof G.buffers === 'function' && typeof G.tFor === 'function' ? G : null;
  }
  function coverage(rect) {
    const G = gf(); if (!G) return 0;
    let b; try { b = G.buffers(); } catch (e) { b = null; }
    if (!b || !b.cols || !b.rows) return 0;
    const d = gridScale, cols = b.cols, rows = b.rows;
    const c0 = Math.max(0, Math.floor((rect.left * d - b.gx0) * b.invCw)), c1 = Math.min(cols - 1, Math.floor((rect.right * d - b.gx0) * b.invCw));
    const r0 = Math.max(0, Math.floor((rect.top * d - b.gy0) * b.invCh)), r1 = Math.min(rows - 1, Math.floor((rect.bottom * d - b.gy0) * b.invCh));
    if (c1 < c0 || r1 < r0) return 0;
    let n = 0, on = 0;
    /* V1: a cell counts as "on" only at DENSE_T or over (COVER_T here, same number) -- not merely drawn. a faint
       dust dither cell is real ink but not the kind of clutter coverMax exists to keep a label off of. */
    for (let r = r0; r <= r1; r++) { const o = r * cols; for (let c = c0; c <= c1; c++) { n++; if (G.tFor(o + c) >= COVER_T) on++; } }
    return n ? on / n : 0;
  }

  /* ---- store: ownerId -> Map(id -> item); nodes: 'owner\u0000id' -> {el, on, kind, text, hi, lock, plate, rect} */
  const store = new Map();
  const nodes = new Map(), fading = new Set();
  let locked = null; /* {owner, id}: the label the viewer clicked, a tie-break hint for which item carries the lock */
  let selText = null, selLow = null; /* the selected object's label text (view.lock, kept through a manual move) */
  let lockSeen = false, lockLabel = null; /* chrome's ctx.lock, when chrome announces it (atlas:lock) */
  let dirty = true, raf = 0, frameSeq = 0;

  function markDirty() { covN = 0; covPass = false; dirty = true; if (!raf) raf = requestAnimationFrame(onRaf); }
  /* the coverage gate reads the field's last frame, which keeps moving after the event that placed the labels (dots
     still flying into a sorted wall): while a candidate is turned away by coverage alone, look again every 150 ms, for
     at most ~4.5 s after the last real change, so a name shows once its ground clears instead of on the next stray event.
     such a look only adds names: a label already standing where it stood keeps its place whatever moved under it */
  let covT = 0, covN = 0, covRej = false, covPass = false;
  function covRetry() { covT = 0; covN++; covPass = true; dirty = true; if (!raf) raf = requestAnimationFrame(onRaf); }
  function onRaf() { raf = 0; if (dirty) { dirty = false; frameSeq++; doPlace(); } }

  function normalize(it) {
    return {
      id: it.id, text: it.text, low: String(it.text == null ? '' : it.text).toLowerCase(), x: it.x, y: it.y, z: it.z,
      space: it.space || 'world', r: it.r != null && +it.r >= 0 ? +it.r : 6, align: it.align === 'c' ? 'c' : null,
      pri: it.pri || 0, kind: it.kind || 'obj', zoom: it.zoom || null, go: it.go,
      fam: it.fam, plays: it.plays, artist: it.artist, voice: it.voice, /* R5 L1: what its hover sounds like */
    };
  }

  function destroyNode(owner, id) {
    const key = owner + '\u0000' + id;
    const n = nodes.get(key);
    if (n && hovKey === key) fireLab(key, false, 'mouse'); /* a label that goes away under the pointer has been left */
    if (n) { n.el.remove(); if (n.leaderEl) n.leaderEl.remove(); nodes.delete(key); }
  }

  function api_set(ownerId, items) {
    const m = new Map();
    (items || []).forEach((it) => { if (it && it.id != null) m.set(it.id, normalize(it)); });
    const old = store.get(ownerId);
    if (old) old.forEach((_, id) => { if (!m.has(id)) destroyNode(ownerId, id); });
    store.set(ownerId, m);
    markDirty();
  }
  function api_update(ownerId, id, patch) {
    const m = store.get(ownerId); if (!m) return;
    const it = m.get(id); if (!it) return;
    Object.assign(it, patch);
    if (patch && 'r' in patch) it.r = it.r != null && +it.r >= 0 ? +it.r : 6;
    if (patch && 'text' in patch) it.low = String(it.text == null ? '' : it.text).toLowerCase();
    markDirty();
  }
  function api_clear(ownerId) {
    const m = store.get(ownerId); if (!m) return;
    m.forEach((_, id) => destroyNode(ownerId, id));
    store.delete(ownerId);
    if (locked && locked.owner === ownerId) { locked = null; }
    markDirty();
  }

  /* ---- projection: world (pan) / screen / 3d (orbit3d, view.project) --------------------------------------- */
  function projectItem(item) {
    if (item.space === 'screen') return { sx: item.x, sy: item.y, s: 1, ok: true };
    if (item.space === '3d') {
      if (ctx.view && ctx.view.stub) return { sx: -1e5, sy: -1e5, s: 1, ok: false }; /* no camera: no honest 3d position */
      try {
        const [sx, sy, s, depth] = ctx.view.project(item.x, item.y, item.z || 0);
        return { sx, sy, s: s || 1, ok: depth > 0.05 };
      } catch (e) { return { sx: item.x, sy: item.y, s: 1, ok: true }; }
    }
    try {
      const [sx, sy] = ctx.view.apply(item.x, item.y);
      const z = (ctx.view && typeof ctx.view.z === 'number') ? ctx.view.z : 1;
      return { sx, sy, s: z, ok: true };
    } catch (e) { return { sx: item.x, sy: item.y, s: 1, ok: true }; }
  }

  function zoomMeasure() {
    try {
      if (ctx.view && ctx.view.mode === 'orbit3d') return 1 / Math.max(1e-6, ctx.view.dist || 1);
      return (ctx.view && typeof ctx.view.z === 'number') ? ctx.view.z : 1;
    } catch (e) { return 1; }
  }

  function rectsOverlap(a, b, gap, gapY) {
    const gy = gapY == null ? gap : gapY;
    return !(a.right + gap < b.left || a.left - gap > b.right || a.bottom + gy < b.top || a.top - gy > b.bottom);
  }

  /* ---- M8 (R6) liner notes. a starred artist's name (the 388 in universe_nodes.json) carries its plays mark: ▮ x its
     plays_bucket (fifths by plays among those 388), in its genre family's colour; never who pressed play (R5 cut list).
     on hover, focus, touch or lock a second line reads `n plays · first yyyy-mm` from universe_artists_all.json, fetched
     on the visitor's own hover/touch, or once the universe's own full roster has loaded (never on mount or entry). */
  const FAMN = Object.keys(ctx.FAM || {}).filter((k) => k !== 'unknown'), SIG = new Map(), META = new Map();
  let sigReq = false, metaReq = false, uniApi = null;
  const relabel = () => { widthCache.clear(); nodes.forEach((n) => { n.text = null; }); markDirty(); };
  function wantSig() {
    if (sigReq || typeof ctx.data !== 'function') return; sigReq = true;
    ctx.data('universe_nodes').then((d) => {
      ((d && d.nodes) || []).forEach((n) => {
        const k = String(n.name).toLowerCase(), c = ctx.famColor ? ctx.famColor(FAMN[n.family] || 'untagged') : 0x9a9aa2;
        if (!SIG.has(k)) SIG.set(k, { s: '▮'.repeat(Math.max(1, Math.min(5, n.plays_bucket | 0))), c: '#' + ((c >>> 0) & 0xffffff).toString(16).padStart(6, '0') });
      });
      relabel();
    }).catch(() => {});
  }
  function wantMeta() {
    if (metaReq || typeof ctx.data !== 'function') return; metaReq = true;
    ctx.data('universe_artists_all').then((B) => {
      const nm = (B && B.name) || [];
      for (let i = 0; i < nm.length; i++) { const k = String(nm[i]).toLowerCase(); if (SIG.has(k) && !META.has(k)) META.set(k, Number(B.plays[i]).toLocaleString('en-US') + ' plays' + (B.first && B.first[i] ? ' · first ' + B.first[i] : '')); }
      relabel();
    }).catch(() => {});
  }
  function uniCheck() {
    const rs = ctx.atlas.deps && ctx.atlas.deps.rooms, r = rs && rs[ctx.index];
    if (metaReq || !r || r.id !== 'universe') return;
    if (uniApi) { try { if (uniApi.has.roster === 'B') wantMeta(); } catch (e) {} return; }
    try { ctx.need('universe').then((a) => { uniApi = a; }).catch(() => {}); } catch (e) {}
  }
  const sigOf = (item) => { const g = item.kind === 'obj' ? SIG.get(item.low) : null; return g ? g.s : ''; };
  function lin(el, item) {
    const g = item.kind === 'obj' ? SIG.get(item.low) : null, m = g ? META.get(item.low) : null;
    if (g) { el.dataset.sig = g.s; el.style.setProperty('--fh', g.c); } else if (el.dataset.sig) { delete el.dataset.sig; el.style.removeProperty('--fh'); }
    if (m) el.dataset.meta = m; else if (el.dataset.meta) delete el.dataset.meta;
  }

  /* ---- the selection: the camera's lock label, or chrome's once it announces ctx.lock ---------------------- */
  function syncSel() {
    let vl = null, st = 'home';
    try { vl = ctx.view.lock || null; st = ctx.view.state || 'home'; } catch (e) {}
    let s;
    if (lockSeen) s = lockLabel && (st === 'locked' || st === 'free') ? lockLabel : null;
    else s = vl ? vl : st === 'free' ? selText : null;
    if (s !== selText) { selText = s; selLow = s == null ? null : String(s).toLowerCase(); }
  }
  function matchesSel(item) {
    const t = item.low;
    return t === selLow || (t.length > selLow.length + 3 && t.startsWith(selLow + ' · ')); /* a day's `name · n` */
  }
  function onLockEvent(e) {
    lockSeen = true;
    const l = e && e.detail ? e.detail.label : null;
    lockLabel = l == null || l === '' ? null : String(l);
    markDirty();
  }
  doc.addEventListener('atlas:lock', onLockEvent);

  /* ---- R5 L1, the instrument: every label answers a mouse hover, a touch press, a focus and a new lock with one tick
     (ctx.audio.tick: the note is its family, lower = more plays) and light (ice text + the halo on its object); a label
     with an artist starts the dwell (post.js). rooms add data (item fam/plays/artist, or a hoverVoice(id, owner) export)
     or take over with onHover/onFocus returning false. API: R5/L1/API.md */
  const HOOKS = { hover: new Map(), focus: new Map() };
  function hook(kind, owner, fn) {
    if (typeof fn !== 'function') return () => {};
    const m = HOOKS[kind]; let set = m.get(owner); if (!set) m.set(owner, (set = new Set()));
    set.add(fn); return () => set.delete(fn);
  }
  let hovKey = null;
  function fireLab(key, on, via) {
    const cut = key.indexOf('\u0000'), owner = key.slice(0, cut), id = key.slice(cut + 1);
    const m = store.get(owner), item = m && m.get(id), n = nodes.get(key);
    if (n && via !== 'lock') n.el.classList.toggle('vx-on', !!on);
    if (!item) { if (!on && hovKey === key) { hovKey = null; try { ctx.audio.tick(null); } catch (e) {} } return; }
    if (on && via !== 'lock' && SIG.has(item.low)) wantMeta(); /* the visitor reached for a name: its second line */
    const p = projectItem(item), info = { owner, id: item.id, el: n ? n.el : null, via, sx: p.sx, sy: p.sy };
    let quiet = item.voice === false;
    const run = (set) => { if (set) set.forEach((fn) => { try { if (fn(on, item, info) === false) quiet = true; } catch (e) { console.warn('labels hook', e); } }); };
    const H = via === 'focus' || via === 'lock' ? HOOKS.focus : HOOKS.hover;
    run(H.get(owner)); run(H.get('*'));
    const A = ctx.audio, P = ctx.post;
    if (!on) {
      if (hovKey === key) { hovKey = null; if (!quiet && A && A.tick) A.tick(null); }
      if (via === 'mouse' && P && P.undwell) P.undwell();
      return;
    }
    if (quiet || !A || typeof A.tick !== 'function') return;
    let v = null;
    try { const rs = ctx.atlas.deps && ctx.atlas.deps.rooms, r = rs && rs[ctx.index], mod = r && r.mod; if (mod && typeof mod.hoverVoice === 'function') v = mod.hoverVoice(item.id, owner); } catch (e) {}
    if (!v) v = item;
    if (via !== 'lock') hovKey = key;
    A.tick(owner + ':' + item.id, { fam: v.fam, plays: v.plays, deg: v.deg, kind: v.kind === 'control' ? 'control' : 'label', x: p.sx, y: p.sy, force: via === 'touch' });
    if (v.artist && (via === 'mouse' || via === 'touch') && P && P.dwell) {
      const r = n && n.rect;
      P.dwell(v.artist, { x: r ? r.left : p.sx + 12, y: r ? r.bottom + 6 : p.sy + 12, touch: via === 'touch' });
    }
  }
  function labDown(p) {
    if (!p || p.type === 'mouse') return;
    const n = nodeAt(p.sx, p.sy) || nodeOfEl(p.e ? p.e.target : null);
    if (n) fireLab(n.owner + '\u0000' + n.id, true, 'touch');
  }
  function labUp(p) { if (p && p.type !== 'mouse' && ctx.post && ctx.post.undwell) ctx.post.undwell({ keep: true }); }

  /* a label you can press is a button; one with nowhere to go is a span (no pointer, no target, no pad) */
  function makeEl(interactive, key) {
    const el = doc.createElement(interactive ? 'button' : 'span');
    if (interactive) {
      el.type = 'button'; el.tabIndex = -1; el.addEventListener('click', (e) => onLabelClick(e, key));
      el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !e.buttons) fireLab(key, true, 'mouse'); });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') fireLab(key, false, 'mouse'); });
      el.addEventListener('focus', () => fireLab(key, true, 'focus'));
      el.addEventListener('blur', () => fireLab(key, false, 'focus'));
    }
    el.addEventListener('wheel', onLabelWheel, { passive: false });
    return el;
  }
  function ensureNode(owner, id, item) {
    const key = owner + '\u0000' + id;
    let n = nodes.get(key);
    const interactive = item.kind === 'obj' || !!item.go;
    if (!n) {
      const el = makeEl(interactive, key);
      layer.insertBefore(el, retEl);
      n = { el, owner, id, interactive, on: false, text: null, kind: null, hi: false, lock: false, rect: null, seenFrame: frameSeq };
      nodes.set(key, n);
    } else if (n.interactive !== interactive) {
      const el = makeEl(interactive, key);
      el.className = n.el.className; el.textContent = n.el.textContent; el.style.cssText = n.el.style.cssText;
      n.el.replaceWith(el); n.el = el; n.interactive = interactive;
    }
    if (n.kind !== item.kind || n.text !== item.text) {
      /* a text change (a ticking counter) rebuilds the class list: keep the state classes, 'on' included, or the label
         would drop to opacity 0 while its node still believes it is shown */
      n.el.className = 'lab atlas-lab ' + item.kind + (n.hi ? ' hi' : '') + (n.lock ? ' lock' : '') + (n.on ? ' on' : '');
      n.el.textContent = item.text; lin(n.el, item);
      n.kind = item.kind; n.text = item.text;
    }
    n.el.classList.toggle('static', !interactive);
    n.el.style.pointerEvents = interactive ? '' : 'none';
    n.seenFrame = frameSeq;
    return n;
  }
  function showNode(c, rect, style) {
    const n = ensureNode(c.ownerId, c.id, c.item);
    const hi = style === 'hi', lock = style === 'lock' || style === 'regionlock';
    if (n.hi !== hi) { n.hi = hi; n.el.classList.toggle('hi', hi); }
    if (n.lock !== lock) { n.lock = lock; n.el.classList.toggle('lock', lock); }
    n.rect = rect;
    n.el.style.transform = 'translate3d(' + Math.round(rect.left) + 'px,' + Math.round(rect.top) + 'px,0)';
    if (!n.on) { n.on = true; n.el.style.transition = ''; requestAnimationFrame(() => { if (n.on) n.el.classList.add('on'); }); }
    return n;
  }
  function hideNode(c) {
    const n = nodes.get(c.ownerId + '\u0000' + c.id);
    if (n && n.on) { n.on = false; n.el.classList.remove('on'); n.offT = performance.now(); fading.add(n); }
    if (n && n.lock) { n.lock = false; n.el.classList.remove('lock'); } /* a former lock fades out as a plain label */
    if (n) hideLeader(n);
  }

  /* round 2: a candidate placed on the 2x ring reads as detached from its object, so it gets a thin 1px leader back
     to the anchor point. one lazily-created element per node (most nodes never need one); it fades with the label. */
  function setLeader(n, ax, ay, rect) {
    if (!n.leaderEl) { const el = doc.createElement('i'); el.className = 'lab-leader'; el.setAttribute('aria-hidden', 'true'); layer.insertBefore(el, retEl); n.leaderEl = el; }
    const nx = ax < rect.left ? rect.left : ax > rect.right ? rect.right : ax;
    const ny = ay < rect.top ? rect.top : ay > rect.bottom ? rect.bottom : ay;
    const dx = nx - ax, dy = ny - ay, len = Math.max(0, Math.hypot(dx, dy) - 1), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    n.leaderEl.style.width = len.toFixed(1) + 'px';
    n.leaderEl.style.transform = 'translate3d(' + ax.toFixed(1) + 'px,' + ay.toFixed(1) + 'px,0) rotate(' + ang.toFixed(2) + 'deg)';
    if (!n.leaderOn) { n.leaderOn = true; requestAnimationFrame(() => { if (n.leaderOn) n.leaderEl.classList.add('on'); }); }
  }
  function hideLeader(n) {
    if (n.leaderOn) { n.leaderOn = false; n.leaderEl.classList.remove('on'); }
  }

  function showRet(sx, sy, R, key) {
    const s = Math.round(R * 2);
    retEl.style.width = s + 'px'; retEl.style.height = s + 'px';
    retEl.style.transform = 'translate3d(' + Math.round(sx - R) + 'px,' + Math.round(sy - R) + 'px,0)';
    if (!retOn || retKey !== key) {
      /* a new target: re-run the settle-in (ring closes from 1.5x), and the new selection sounds its note */
      if (retKey !== key) { const k = key; requestAnimationFrame(() => { if (retKey === k) fireLab(k, true, 'lock'); }); }
      retEl.classList.remove('on'); retOn = true; retKey = key;
      requestAnimationFrame(() => { if (retOn) retEl.classList.add('on'); });
    }
  }
  function hideRet() { if (retOn) { retOn = false; retKey = null; retEl.classList.remove('on'); } }

  function doPlace() {
    const W = innerWidth, H = innerHeight;
    if (settingsLabelsOff()) { layer.style.display = 'none'; return; }
    layer.style.display = '';
    syncSel();

    /* pass 1: which item carries the lock (the clicked one if it still names the selection, then obj over region) */
    let lk = null;
    if (selLow != null) {
      store.forEach((m, o) => m.forEach((it, id) => {
        if (!matchesSel(it)) return;
        const s = (locked && locked.owner === o && locked.id === id ? 4e6 : 0) + (it.kind === 'obj' ? 2e6 : it.kind === 'region' ? 1e6 : 0) + (it.pri || 0);
        if (!lk || s > lk.s) lk = { o, id, s };
      }));
    }
    if (locked && !(lk && lk.o === locked.owner && lk.id === locked.id)) locked = null;

    /* pass 2: project; the locked item ignores its zoom band (a fly-in can land outside the band it was labelled in) */
    const zoom = zoomMeasure();
    const candidates = [];
    let lockC = null;
    store.forEach((m, ownerId) => {
      m.forEach((item, id) => {
        const isLock = !!lk && lk.o === ownerId && lk.id === id;
        if (!isLock && item.zoom && (zoom < item.zoom[0] || zoom > item.zoom[1])) { destroyNode(ownerId, id); return; }
        const p = projectItem(item);
        const near = p.ok && p.sx > -80 && p.sx < W + 80 && p.sy > -80 && p.sy < H + 80; /* keep the node (no churn at an edge) */
        /* the object itself is in the window: its pixel radius, or (0.72 of it) a big disc still reaching in.
           round 2 (M6 W2): and its own anchor point reads as somewhere in the field (inField) — an object whose
           position projects behind the caption column or past the ladder's margin gets no label at all, same as
           one that left the window outright (the locked one falls through to the off-screen chip instead). */
        const e = Math.max(0, item.r * (p.s || 1) * 0.72);
        const onscreen = near && p.sx >= -e && p.sx <= W + e && p.sy >= -e && p.sy <= H + e && inField(p.sx, p.sy);
        if (isLock) lockC = { ownerId, id, item, p, onscreen };
        if (!near) { destroyNode(ownerId, id); return; }
        if (!isLock) candidates.push({ ownerId, id, item, p, pri: item.pri, onscreen });
      });
    });

    const govCap = (ctx.atlas.gov && ctx.atlas.gov.tier >= 5) ? MAX_VISIBLE_GOV : MAX_VISIBLE;
    /* round 2 (M6 W3): a phone's own ceiling, stricter than the governor's — candidates are sorted by pri (plays)
       below, so a dense stop keeps its most-played names first and simply shows fewer, not smaller or crowded ones. */
    const cap = touch ? Math.min(PHONE_CAP, govCap) : govCap;
    /* round 2 (M6 W1/W3): the coverage ceiling a candidate box may not cross to be accepted (DENSE_ON legibility
       threshold everywhere; the touch pass reads busier at its smaller type, so PHONE_COVER is stricter still) */
    const coverMax = touch ? PHONE_COVER : DENSE_ON;
    /* every placed pill (and the reticle): {r}. two pills keep GAP apart; a touch pad may sit over another label's
       pad or pill (a press in a pad still resolves to the nearest pill), so collision is always the drawn pill, never
       the pad -- only a keepout (real chrome) ever turns a pad away (round 2, src the C7 dense-core fix) */
    const placed = [];
    const collides = (rect) => { for (let k = 0; k < placed.length; k++) if (rectsOverlap(rect, placed[k].r, GAP, GAP)) return true; return false; };
    /* a centred box slides along x to stay in the window while its anchor is still under it; otherwise it has no place */
    const centredRect = (sx, sy, w, h) => {
      const left = Math.round(Math.max(VIEW_M, Math.min(W - VIEW_M - w, sx - (w - 3) / 2))), top = Math.round(sy - h / 2);
      const r = { left, top, right: left + w, bottom: top + h };
      return sx >= left + 2 && sx <= r.right - 5 && inView(r, W, H) ? r : null;
    };
    let shown = 0, hiN = 0, retShown = false;
    covRej = false;

    /* the locked object first: reticle on the object, label just outside the reticle's up-right corner (or the next
       free corner), both reserved before any other label is placed */
    if (lockC && lockC.onscreen) {
      const { item, p } = lockC;
      const region = item.kind === 'region';
      const rpx = item.r * (p.s || 1);
      let off = region ? Math.max(rpx * 0.72, 5) : rpx * 0.72 + OBJ_OFF;
      if (!region && item.align !== 'c' && p.sx >= 0 && p.sx <= W && p.sy >= 0 && p.sy <= H) {
        const R = Math.max(RET_MIN, Math.min(RET_MAX, rpx * 0.9 + 5));
        const rr = { left: p.sx - R, top: p.sy - R, right: p.sx + R, bottom: p.sy + R };
        if (!hitsKeepout({ left: p.sx - 2, top: p.sy - 2, right: p.sx + 2, bottom: p.sy + 2 })) {
          showRet(p.sx, p.sy, R, lockC.ownerId + '\u0000' + lockC.id);
          retShown = true;
          placed.push({ r: rr });
          off = Math.max(off, R + 3);
        }
      }
      const style = region ? 'regionlock' : 'lock';
      const w = measure(style, item.text, sigOf(item)), h = LABEL_H_LOCK;
      if (!region) uniCheck();
      const pad = touch && (item.kind === 'obj' || !!item.go);
      let best = null, fallback = null;
      if (item.align === 'c') { const rect = centredRect(p.sx, p.sy, w, h); if (rect && !hitsKeepout(hitOf(rect))) best = rect; }
      else {
        for (const [qx, qy] of QUADS) {
          const left = qx > 0 ? p.sx + off : p.sx - off - (w - 3), top = qy < 0 ? p.sy - off - h : p.sy + off;
          const rect = { left, top, right: left + w, bottom: top + h };
          if (hitsKeepout(pad ? hitOf(rect) : rect)) continue;
          if (inView(rect, W, H)) { best = rect; break; }
          if (!fallback) fallback = rect;
        }
        /* no corner fits the window (the object sits in one): slide the free corner in, it stays beside the reticle */
        if (!best && fallback) {
          const fw = fallback.right - fallback.left, fh = fallback.bottom - fallback.top;
          const left = Math.max(VIEW_M, Math.min(W - VIEW_M - fw, fallback.left)), top = Math.max(VIEW_M, Math.min(H - VIEW_M - fh, fallback.top));
          const rect = { left, top, right: left + fw, bottom: top + fh };
          if (!hitsKeepout(pad ? hitOf(rect) : rect)) best = rect;
        }
      }
      if (best) { placed.push({ r: best }); shown++; showNode(lockC, best, style); }
      else hideNode(lockC);
    } else if (lockC) hideNode(lockC); /* the object left the window: the chip below leads back, no stray name at the edge */
    if (!retShown) hideRet();

    candidates.sort((a, b) => b.pri - a.pri);
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const kind = c.item.kind;
      const rpx = c.item.r * (c.p.s || 1);
      const off = kind === 'region' ? Math.max(rpx * 0.72, 5) : rpx * 0.72 + OBJ_OFF;
      const style = kind === 'obj' && hiN < HI_N ? 'hi' : kind;
      const w = measure(style, c.item.text, sigOf(c.item)), h = style === 'hi' ? LABEL_H_HI : LABEL_H;
      if (kind === 'obj' && !sigReq) wantSig();
      const pad = touch && (kind === 'obj' || !!c.item.go);
      /* whole and inside the window, touching its object, clear of every keepout and every other placed pill:
         up-right first, then the next corner, at the usual offset and (round 2) again at double it -- 4 quads x 2
         rings, 8 tries, before the candidate is dropped. the 2x ring reads as detached, so it gets a 1px leader. */
      let rect = null, ring2 = false;
      const n0 = covPass ? nodes.get(c.ownerId + '\u0000' + c.id) : null, kr = n0 && n0.on && n0.rect;
      const covOk = (r) => (kr && r.left === kr.left && r.top === kr.top) || coverage(r) <= coverMax;
      if (c.onscreen && shown < cap) {
        if (c.item.align === 'c') {
          const r = centredRect(c.p.sx, c.p.sy, w, h);
          if (r && !hitsKeepout(pad ? hitOf(r) : r) && !collides(r)) { if (covOk(r)) rect = r; else covRej = true; }
        } else {
          ringLoop: for (let ring = 0; ring < 2; ring++) {
            const o = ring ? off * 2 : off;
            for (const [qx, qy] of QUADS) {
              const left = qx > 0 ? c.p.sx + o : c.p.sx - o - (w - 3), top = qy < 0 ? c.p.sy - o - h : c.p.sy + o; /* measure()'s 3px safety sits on the object's side */
              const r = { left, top, right: left + w, bottom: top + h };
              if (!inView(r, W, H) || hitsKeepout(pad ? hitOf(r) : r) || collides(r)) continue;
              /* round 2 (M6 W1/W3): a corner that clears every keepout can still land on a solid patch of glyphs --
                 try the next corner/ring instead of covering it, the same read the old plate logic sampled */
              if (!covOk(r)) { covRej = true; continue; }
              rect = r; ring2 = !!ring;
              break ringLoop;
            }
          }
        }
      }
      if (!rect) { hideNode(c); continue; }
      placed.push({ r: rect });
      shown++;
      if (style === 'hi') hiN++;
      const n = showNode(c, rect, style);
      if (ring2) setLeader(n, c.p.sx, c.p.sy, rect); else hideLeader(n);
    }

    if (covRej && !covT && covN < 30) covT = setTimeout(covRetry, 150);

    /* a pill fading out (0.3 s) under one just placed reads as two names on top of each other: drop it at once */
    fading.forEach((n) => {
      if (n.on || performance.now() - n.offT > 400) { fading.delete(n); return; }
      if (n.rect && placed.some((q) => rectsOverlap(n.rect, q.r, 0, 0))) { n.el.style.transition = 'none'; fading.delete(n); }
    });

    /* GC nodes that have not been touched in a while (bounds memory even under a churning item set) */
    if (nodes.size > NODE_CAP) {
      const stale = [];
      nodes.forEach((n, key) => { if (frameSeq - n.seenFrame > 30) stale.push(key); });
      stale.forEach((key) => { const n = nodes.get(key); if (n) { n.el.remove(); if (n.leaderEl) n.leaderEl.remove(); } nodes.delete(key); });
    }

    /* off-screen indicator for the locked object */
    if (lockC && !lockC.onscreen) {
      const rawX = lockC.p.sx, rawY = lockC.p.sy;
      let cxp = Math.max(EDGE_MARGIN, Math.min(W - EDGE_MARGIN - OFF_W, rawX));
      let cyp = Math.max(EDGE_MARGIN, Math.min(H - EDGE_MARGIN - OFF_H, rawY));
      // the edge-clamped chip doesn't compete in the greedy pass above; nudge it clear of a keepout it lands on
      // (the common case is real chrome pinned at a screen corner), sliding along whichever axis moves it less.
      for (let guard = 0, tries = 0; guard < keepRects.length && tries < keepRects.length + 2; tries++) {
        const k = keepRects[guard], op = touch ? OFF_PAD : 0, box = { left: cxp, top: cyp - op, right: cxp + OFF_W, bottom: cyp + OFF_H + op };
        if (rectsOverlap(box, k, 0)) {
          const downY = Math.min(H - EDGE_MARGIN - OFF_H, k.bottom + 8 + op), rightX = Math.min(W - EDGE_MARGIN - OFF_W, k.right + 8);
          if (Math.abs(downY - cyp) <= Math.abs(rightX - cxp)) cyp = downY; else cxp = rightX;
          guard = 0; /* re-check every keepout against the moved box */
        } else guard++;
      }
      const dx = rawX - cxp, dy = rawY - cyp;
      let arrow;
      if (Math.abs(dx) >= Math.abs(dy)) arrow = dx < 0 ? '‹' : '›';
      else arrow = dy < 0 ? '⌃' : '⌄';
      offEl.textContent = arrow + ' ' + lockC.item.text;
      offTarget = { o: lockC.ownerId, id: lockC.id };
      offEl.style.transform = 'translate3d(' + Math.round(cxp) + 'px,' + Math.round(cyp) + 'px,0)';
      if (!offVisible) { offVisible = true; requestAnimationFrame(() => offEl.classList.add('on')); }
    } else if (offVisible) {
      offVisible = false; offEl.classList.remove('on');
    }
  }

  function settingsLabelsOff() {
    try { return ctx.settings.get('labels') === false; } catch (e) { return false; }
  }

  function onLabelWheel(e) {
    if (e.defaultPrevented) return; /* the gesture layer's own label forwarding already zoomed on this one */
    e.preventDefault();
    const k = e.deltaMode === 1 ? 33 : 1;
    const raw = -e.deltaY * 0.0022 * k;
    const clamped = Math.max(-0.6, Math.min(0.6, raw));
    const factor = Math.exp(clamped);
    try { ctx.view.zoomBy(factor, e.clientX, e.clientY); } catch (err) {}
  }

  /* ---- presses. on a touch screen pads can meet in the gap between two pills: the press goes to the nearest pill */
  function nodeAt(x, y) {
    let best = null, bd = Infinity;
    nodes.forEach((n) => {
      if (!n.on || !n.rect || !n.interactive) return;
      const h = hitOf(n.rect);
      if (x < h.left || x > h.right || y < h.top || y > h.bottom) return;
      const r = n.rect, dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      const d = dx * dx + dy * dy;
      if (d < bd || (d === bd && n.lock)) { bd = d; best = n; }
    });
    return best;
  }
  function nodeOfEl(el) {
    const lab = el && el.closest ? el.closest('.lab') : null; if (!lab) return null;
    let hit = null; nodes.forEach((n) => { if (n.el === lab) hit = n; });
    return hit;
  }
  /* a press the gesture layer judged a tap (it owns presses on the layer, so a drag from a label turns the camera) */
  function onLayerTap(p) {
    const t = p && p.e ? p.e.target : null;
    if (t && t.closest && t.closest('.lab-off')) { tapAt = performance.now(); offGo(); return true; }
    const n = (p ? nodeAt(p.sx, p.sy) : null) || nodeOfEl(t);
    if (!n) return false;
    tapAt = performance.now();
    activate(n.owner, n.id);
    return true;
  }
  /* the button's own click: a keyboard or scripted press, or a pointer press on the layer the gesture layer did not take
     as a tap (no gesture layer here, or a slow press) */
  function onLabelClick(e, key) {
    if (!takesClick(e)) return;
    let n = nodes.get(key);
    if (touch && e && e.detail > 0) { const m = nodeAt(e.clientX, e.clientY); if (m) n = m; }
    if (n) activate(n.owner, n.id);
  }

  function activate(ownerId, id) {
    const m = store.get(ownerId); const item = m && m.get(id);
    if (!item) return;
    locked = { owner: ownerId, id };
    const go = item.go;
    if (typeof go === 'function') { try { go(ctx); } catch (e) { console.warn('anchors go', e); } markDirty(); return; }
    if (go && typeof go === 'object') { try { ctx.route(Object.assign({}, go)); } catch (e) { console.warn('anchors route', e); } markDirty(); return; }
    try {
      const z = (ctx.view && typeof ctx.view.z === 'number' && ctx.view.z > 1.6) ? ctx.view.z : 1.6;
      const pose = item.space === '3d' ? { x: item.x, y: item.y, z3: item.z || 0, dist: 1.6 } : { wx: item.x, wy: item.y, z };
      ctx.view.flyTo(pose, { speed: 'quick', lock: item.text });
    } catch (e) {}
    try { if (typeof ctx.lock === 'function') ctx.lock(item.text); } catch (e) {}
    markDirty();
  }

  let koT = 0;
  function onView() {
    markDirty();
    if (!koT) koT = setTimeout(() => { koT = 0; refreshKeepouts(); markDirty(); }, 200); /* throttle: always one after the last move */
  }
  refreshKeepouts();
  const offView = ctx.view.onChange(onView);
  const offStop = ctx.onStop(() => { refreshKeepouts(); markDirty(); });
  const offGov = ctx.atlas.onGov ? ctx.atlas.onGov(() => { refreshKeepouts(); markDirty(); }) : null;
  const offSettings = ctx.settings.onChange ? ctx.settings.onChange(() => markDirty()) : null;
  const resizeHandler = () => { refreshKeepouts(); markDirty(); };
  addEventListener('resize', resizeHandler, { passive: true });
  /* the layer answers presses the way the field does: drag turns the camera, a tap goes to the nearest pill */
  let offBind = null;
  try {
    const GS = ctx.gesture;
    /* R5: a touch press on a name sounds at once; held 500 ms (past the 450 ms tap limit, so taps are unchanged) it is
       the long-press that starts the dwell clip. post.js owns that 500 ms timer; lifting keeps a started clip */
    if (GS && !GS.stub && typeof GS.bind === 'function') offBind = GS.bind(layer, { drag: 'camera', dbl: false, tap: onLayerTap, hold: { delay: 500, press: labDown, end: labUp } });
  } catch (e) { offBind = null; }
  markDirty();

  const api = {
    set: api_set,
    update: api_update,
    clear: api_clear,
    /* the last placed box of a shown label (css px), or null when it was decluttered, culled or is fading out */
    rect(ownerId, id) { const n = nodes.get(ownerId + '\u0000' + id); return n && n.on && n.rect ? { left: n.rect.left, top: n.rect.top, right: n.rect.right, bottom: n.rect.bottom } : null; },
    /* round 2 (W58): the shell's hook after it re-measures its own chrome (a font load, an orientation change it
       handles itself) -- same as a resize, a keepout re-read followed by a re-place, one frame later */
    refresh() { refreshKeepouts(); markDirty(); },
    /* R5 L1: fn(on, item, {owner, id, el, via, sx, sy}) for every label of `owner` ('*' = all); return false = no default */
    onHover: (owner, fn) => hook('hover', owner, fn),
    onFocus: (owner, fn) => hook('focus', owner, fn),
    /* debug / test hooks (harmless in production, used by tests/atlas_labels.mjs and the harness) */
    _recompute: doPlace,
    _count: () => layer.querySelectorAll('.lab.on').length,
    _nodeCount: () => nodes.size,
    _locked: () => locked,
    _sel: () => selText,
    _ret: () => retOn,
    _offVisible: () => offVisible,
    _touch: () => touch,
    _bound: () => !!offBind,
    _debug: () => { const items = []; store.forEach((m, o) => m.forEach((it, id) => items.push({ owner: o, id, it, p: projectItem(it) }))); return { items, keepRects, sel: selText, cap: (ctx.atlas.gov && ctx.atlas.gov.tier >= 5) ? MAX_VISIBLE_GOV : MAX_VISIBLE }; },
    _dispose() { clearTimeout(koT); clearTimeout(covT); offView && offView(); offStop && offStop(); offGov && offGov(); offSettings && offSettings(); removeEventListener('resize', resizeHandler); removeEventListener('pointerdown', onAnyDown, { capture: true }); doc.removeEventListener('atlas:lock', onLockEvent); try { offBind && offBind(); mq && mq.removeEventListener('change', onMq); } catch (e) {} },
  };
  return api;
}

export default { mount };
