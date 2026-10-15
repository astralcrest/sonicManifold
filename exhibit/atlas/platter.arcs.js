/* R18 PLATTER · return arcs on the record (after Wattenberg, The Shape of Song). a tap on the groove names the artist i
   played most around there and joins each stretch of that artist's plays to the next one with a chord across the disc:
   a week of daily returns is a tight fan of short loops, a slow burn a few long spans. the data is the public day file
   (exhibit/data/universe_days.json: each day's top eight artists, and its artist-to-artist changes by arm), fetched on the
   first tap only. a node is one day of that artist, never a play: repeats inside a day merge, so no streak is ever drawn.
   a chord's colour is how i got back to the artist on the later day, read off that day's changes into it: mint, i tapped
   my way back; amber, shuffle; violet, the queue served it. a day whose records hold no change into it (or a tie) keeps the
   record's own uncoloured ink. nothing is dated or labelled. the chords are stroked once per selection, one stroke each
   ('lighter', so a fan glows where it is dense), into two offscreen canvases in record space: all of them, and my own
   returns alone. a frame is one drawImage under the record's turn (all of them; lifted, mine alone), two only while a lift
   fades between them. each day is a bead on the groove where its chords meet.
   alpha: ALPHA (.12) x sqrt(1500 / chords), held to .2 to .6 (the densest artist today, 582 chords, sits on .2). the overlay is
   laid over the field's canvas, so 'lighter' adds only among the chords themselves, and a flat .12 line vanished into the
   print (R18 shots); a soft wide pass under each colour gives the thin core a halo off the dots.
   cap: CAP chords (half on a phone); the day file holds at most 582 for any one artist, so the cap does not bite today */
const TAU = 6.283185307179586, CAP = 3000, ALPHA = 0.12, PULL = 0.35, E = 1.03;
const lit = (v) => { const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255, m = Math.max(r, g, b, 1) / 255; return [r, g, b].map((c) => Math.round(c / m)).join(','); };

export function createArcs(ctx, low) {
  const PC = ctx.PROV_CHIP || [0x21f6bc, 0xf5a623, 0x8b6fd6], COL = [lit(PC[0]), lit(PC[1]), lit(PC[2]), '216,210,234'];
  const cap = low ? CAP >> 1 : CAP;
  let D = null, Dp = null, names = null;
  const S = { a: -1, name: '', nodes: null, chords: 0, capped: false, key: '', M: null, A: null, t0: 0, out: 0, ms: 0, bake: 0, mix: [0, 0, 0, 0] };

  /* the day file, indexed once: where each day starts on the record (plays before it), and the log's length */
  function load() {
    if (Dp) return Dp;
    Dp = Promise.all([ctx.data('universe_days'), ctx.data('universe_nodes').catch(() => null)]).then(([J, N]) => {
      const days = (J && J.days) || [], n = days.length, off = new Float64Array(n + 1);
      for (let k = 0; k < n; k++) off[k + 1] = off[k] + (days[k].n | 0);
      names = N && N.nodes ? N.nodes.map((x) => String(x.name)) : null;
      D = { days, n, off, total: off[n] || 1, nA: names ? names.length : 388 };
      return D;
    }).catch(() => { Dp = null; return null; });
    return Dp;
  }
  /* the day holding the play at log fraction f */
  function dayAt(f) {
    const p = f * D.total; let lo = 0, hi = D.n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (D.off[m] <= p) lo = m; else hi = m - 1; }
    return lo;
  }
  /* the named star i played most on that day, else on the nearest day within a week that has one; top: it was that
     day's most played artist outright (one day in eight the leader is an artist without a star, and the caption says less) */
  function topNear(k) {
    for (let d = 0; d <= 7; d++) for (const s of d ? [-1, 1] : [1]) {
      const j = k + s * d; if (j < 0 || j >= D.n) continue;
      const T = D.days[j].top || [];
      for (let q = 0; q + 1 < T.length; q += 2) if (T[q] >= 0 && T[q] < D.nA) return [T[q], !d && !q];
    }
    return [-1, false];
  }
  /* every day the artist was in that day's top eight, in log order: where it sits (the day's middle, as a log fraction)
     and how i got back to it that day (the arm with most changes into it; -1 when the records hold none, or a tie) */
  function nodesOf(a) {
    const out = [];
    for (let k = 0; k < D.n; k++) {
      const x = D.days[k], T = x.top || [];
      let hit = false; for (let q = 0; q + 1 < T.length; q += 2) if (T[q] === a) { hit = true; break; }
      if (!hit) continue;
      const R = x.tr || [], c = [0, 0, 0];
      for (let q = 0; q + 3 < R.length; q += 4) if (R[q + 1] === a && R[q] !== a && R[q + 2] >= 0 && R[q + 2] < 3) c[R[q + 2]] += R[q + 3] | 0;
      const mx = Math.max(c[0], c[1], c[2]); let arm = -1;
      if (mx > 0) { const w = [0, 1, 2].filter((j) => c[j] === mx); if (w.length === 1) arm = w[0]; }
      out.push([(D.off[k] + (x.n | 0) * 0.5) / D.total, arm]);
    }
    return out;
  }
  function pickAt(f) {
    return load().then((d) => {
      if (!d || !d.n) return null;
      const [a, top] = topNear(dayAt(Math.min(1, Math.max(0, f))));
      return a < 0 ? null : { a, top, name: names && names[a] ? names[a] : '' };
    });
  }
  /* bake: pos(f) -> [x, y] on the record (unit radius), the spiral the dots are laid on; side = canvas px */
  function bake(pos, side, dpr, key) {
    const t0 = performance.now(), nodes = S.nodes; if (!nodes || nodes.length < 2) { S.M = S.A = null; return; }
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = side; return c; };
    const A = S.A && S.A.width === side ? S.A : mk(), M = S.M && S.M.width === side ? S.M : mk();
    const k = side / (2 * E), lw = (low ? 1.1 : 1.25) * dpr / k;
    const n = Math.min(nodes.length - 1, cap), mix = [0, 0, 0, 0], al = Math.min(0.6, Math.max(0.2, ALPHA * Math.sqrt(1500 / Math.max(1, n))));
    const P = new Float32Array((n + 1) * 2), cof = (j) => (nodes[j][1] < 0 ? 3 : nodes[j][1]);
    for (let j = 0; j <= n; j++) { const q = pos(nodes[j][0]); P[2 * j] = q[0]; P[2 * j + 1] = q[1]; }
    for (let j = 1; j <= n; j++) mix[cof(j)]++;
    const chord = (g, j) => { const x0 = P[2 * j - 2], y0 = P[2 * j - 1], x1 = P[2 * j], y1 = P[2 * j + 1]; g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) * 0.5 * (1 - PULL), (y0 + y1) * 0.5 * (1 - PULL), x1, y1); };
    for (const [cv, only] of [[A, -1], [M, 0]]) {
      const g = cv.getContext('2d'), want = (c) => only < 0 || c === only;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, side, side); g.setTransform(k, 0, 0, k, side / 2, side / 2);
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
      /* the halo: one wide faint path per colour (no build-up wanted here) */
      for (let c = 0; c < 4; c++) {
        if (!want(c) || !mix[c]) continue; g.beginPath();
        for (let j = 1; j <= n; j++) if (cof(j) === c) chord(g, j);
        g.globalAlpha = al * 0.2; g.lineWidth = lw * 3.4; g.strokeStyle = 'rgb(' + COL[c] + ')'; g.stroke();
      }
      /* the core: one stroke per chord, so where returns crowd, the light builds */
      g.globalAlpha = al; g.lineWidth = lw;
      for (let j = 1; j <= n; j++) { const c = cof(j); if (!want(c)) continue; g.strokeStyle = 'rgb(' + COL[c] + ')'; g.beginPath(); chord(g, j); g.stroke(); }
      /* the beads: a day of that artist on the groove, coloured like the chord that arrives at it (the first has none: ink) */
      for (let c = 0; c < 4; c++) {
        if (!want(c)) continue; const rb = lw * 1.25; let any = false; g.beginPath();
        for (let j = 0; j <= n; j++) if ((j ? cof(j) : 3) === c) { g.moveTo(P[2 * j] + rb, P[2 * j + 1]); g.arc(P[2 * j], P[2 * j + 1], rb, 0, TAU); any = true; }
        if (any) { g.globalAlpha = Math.min(0.95, al * 1.7); g.fillStyle = 'rgb(' + COL[c] + ')'; g.fill(); }
      }
    }
    S.A = A; S.M = M; S.key = key; S.chords = n; S.capped = nodes.length - 1 > cap; S.mix = mix; S.alpha = al; S.bake = performance.now() - t0;
  }
  return {
    S, load, pickAt, nodesOf: (a) => (D ? nodesOf(a) : []),
    /* a new selection: its nodes now, its canvases on the next draw (the spiral and the size are the platter's) */
    set(hit) {
      if (!hit || !D) return false; const nd = nodesOf(hit.a); if (nd.length < 2) return false; /* one day only: no return to join */
      S.a = hit.a; S.name = hit.name; S.nodes = nd; S.key = ''; S.t0 = performance.now(); S.out = 0; return true;
    },
    clear(now) { if (S.a < 0) return; S.out = now || performance.now(); },
    /* off the record: the selection and its canvases go at once (a canvas holds its pixels until it is dropped) */
    drop() { S.a = -1; S.nodes = null; S.out = 0; S.name = ''; S.key = ''; S.M = S.A = null; },
    nameOf: (a) => (names && names[a] ? names[a] : ''),
    get on() { return S.a >= 0 && !S.out; },
    /* g: the overlay, M: the record's transform [a, b, c, d, e, f] (record units to world px); lift: 0..1 */
    draw(g, M, now, lift, side, dpr, pos, key, red) {
      if (S.a < 0) return;
      const t0 = performance.now();
      let al = 1;
      if (S.out) { al = 1 - (now - S.out) / (red ? 200 : 300); if (al <= 0) { S.a = -1; S.nodes = null; S.out = 0; S.name = ''; return; } }
      if (key !== S.key) bake(pos, side, dpr, key);
      if (!S.A) return;
      const u = Math.min(1, (now - S.t0) / (red ? 200 : 900)), e = 1 - Math.pow(1 - u, 3);
      if (red) al *= u;
      g.save(); g.transform(M[0], M[1], M[2], M[3], M[4], M[5]);
      /* the reveal reads the log: from the rim (the oldest plays) in toward the label, as the stylus would */
      if (!red && e < 1) { g.beginPath(); g.arc(0, 0, E + 0.02, 0, TAU); g.arc(0, 0, Math.max(0, (E + 0.02) * (1 - e)), 0, TAU, true); g.clip('evenodd'); al *= 0.35 + 0.65 * e; }
      g.globalCompositeOperation = 'lighter';
      /* the machine on the record: all of them; lifted: mine alone; between, the one fades into the other (mint stays within 3 %) */
      const aA = al * (1 - 0.97 * lift), aM = al * lift; S.n = 0;
      if (lift < 0.999 && aA > 0.004) { g.globalAlpha = aA; g.drawImage(S.A, -E, -E, 2 * E, 2 * E); S.n++; }
      if (lift > 0.001 && S.mix[0] && aM > 0.004) { g.globalAlpha = aM; g.drawImage(S.M, -E, -E, 2 * E, 2 * E); S.n++; }
      g.restore();
      S.ms = performance.now() - t0;
    },
    state: () => ({ a: S.a, name: S.name, nodes: S.nodes ? S.nodes.length : 0, chords: S.chords, capped: S.capped, cap, mix: S.mix.slice(), alpha: S.alpha, bakeMs: S.bake, ms: S.ms, draws: S.n || 0, side: S.A ? S.A.width : 0, on: S.a >= 0 && !S.out, loaded: !!D }),
  };
}
