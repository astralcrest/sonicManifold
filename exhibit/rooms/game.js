/* room: who pressed play?
   ?atlas=0 (the rollback): the five-round game. two clusters of the same particles pull forward, one above, one below,
   both in ink; guess whether i tapped the second artist or the app queued it. data: whopressed.json at the site root.
   atlas (R5 R1, THE DUEL): endless, musical, one gesture, scored against a coin. one card "A → B" in the middle, the two
   artists' constellations either side of it (desktop) or above and below it (phone), a beat ring at the bed's tempo.
   swipe up/right = i tapped, down/left = the queue; t/q, ←/→ (inside the card) and the buttons do the same. a fair coin
   picks each card's pile client-side, so the coin line in the HUD is the exact binomial upper tail at p = 0.5. data:
   exhibit/data/whopressed2.json (build_whopressed2.py, private). nothing here ever answers by itself: a provenance colour
   appears only after a commit, and a run-out tempo clock is a pass, never an answer. */

const ROUNDS = 5, AY = 0.18, BY = 0.82, DARK = 0x1a1030;
const ATLAS_CLUSTER = 900, FOGW = 14, RMAX = 2.6, UMIN = Math.exp(-RMAX * RMAX / 2), EDGE = 24, GAP = 16;
/* duel */
const RUN = 16, SWIPE = 60, TEMPO_AFTER = 5, TEMPO_BEATS = 8, NOMBPM = 96, AUTO = 1900, NSPARK = 48;
const TRAIL_ICE = 0x86cbfe, TRAIL_W = 0.2, ASH = '#a49bbd';
const SPARK_CH = ['*', '+', '·'], ASH_CH = ['.', ',', '\'', '·'];
const SITE = 'https://astralcrest.github.io/sonicManifold/';
const atlasOn = (ctx) => !!(ctx && ctx.atlas && ctx.atlas.on);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hexs = (v) => '#' + (v >>> 0).toString(16).padStart(6, '0');
const pad2 = (n) => (n < 10 ? '0' : '') + n;
const tryf = (f) => { try { return f(); } catch (e) { return undefined; } };

/* P(X >= k), X ~ Binomial(n, 1/2): how often a coin does at least this well. log space, so a long run never underflows */
export function coinTail(k, n) {
  if (n <= 0 || k <= 0) return 1; if (k > n) return 0;
  let lc = 0, s = 0; const L2 = n * Math.LN2;
  for (let i = 0; i <= n; i++) { if (i > 0) lc += Math.log((n - i + 1) / i); if (i >= k) s += Math.exp(lc - L2); }
  return Math.min(1, s);
}
/* a swipe: 1 = i tapped (up or right), 0 = the queue (down or left), -1 = not past SWIPE px on its main axis */
export function swipeDir(dx, dy) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (Math.max(ax, ay) <= SWIPE) return -1;
  return ax >= ay ? (dx > 0 ? 1 : 0) : (dy < 0 ? 1 : 0);
}
function seedNum(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* the deal: per card a fair coin picks the pile (1 = tapped, 0 = queue), then the next unseen card of that pile. a pile
   that runs out is reshuffled (same seed stream); the coin never falls back to the other pile (REFEREE2 C5) */
export function makeDeck(pairs, seed) {
  const rnd = mulberry(seedNum(String(seed))), piles = [[], []], pos = [0, 0];
  for (let i = 0; i < pairs.length / 3; i++) piles[pairs[i * 3 + 2] ? 1 : 0].push(i);
  const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  shuf(piles[0]); shuf(piles[1]);
  return { next() { const t = rnd() < 0.5 ? 1 : 0, p = piles[t]; if (!p.length) return -1; if (pos[t] >= p.length) { shuf(p); pos[t] = 0; } return p[pos[t]++]; } };
}
const newSeed = () => { let s = ''; const r = new Uint32Array(2); tryf(() => crypto.getRandomValues(r)); if (!r[0]) { r[0] = (Math.random() * 4294967296) >>> 0; r[1] = (Math.random() * 4294967296) >>> 0; } s = (r[0].toString(36) + r[1].toString(36)).slice(0, 7); return s || 'deck'; };

export default {
  id: 'game', track: 'dorian-manifold',
  pool: null, cluster: null, rounds: null, ri: 0, score: 0, answered: false, timer: 0, active: false, pulse: null,
  lx: 0, lxb: 0, lya: 0, lyb: 0, saidTap: 0, wallTapPct: null, demoOn: false, demoT: 0, D: null,
  angles: [{ id: 'round', name: 'the round' }],

  async mount(root, ctx) {
    this.ctx = ctx;
    const P = ctx.particles, n = P.n, frac = (atlasOn(ctx) ? Math.min(ATLAS_CLUSTER, n * 0.04) : 240) / n;
    this.cluster = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const u = ctx.hash(i * 31 + 11); this.cluster[i] = u < frac ? 1 : u < frac * 2 ? 2 : 0; }
    this._onDemoBreak = (e) => { if (this.active && (!e || e.isTrusted !== false)) this.stopDemo(); };
    if (atlasOn(ctx)) return this.dMount(root, ctx);
    const wrap = document.createElement('div'); wrap.className = 'g-wrap';
    wrap.innerHTML =
      '<div class="g-bar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
      '<p class="g-round" id="g-round" aria-live="polite" aria-atomic="true"></p>' +
      '<div class="g-mid">' +
        '<div class="g-name g-a"></div>' +
        '<div class="g-arrow" aria-hidden="true">&darr;</div>' +
        '<div class="g-name g-b"></div>' +
        '<p class="g-verdict say dim" aria-live="polite"></p>' +
        '<div class="g-posts"></div>' +
        '<div class="row g-row">' +
          '<button type="button" class="btn ghost g-tap" aria-describedby="g-round">i tapped</button>' +
          '<button type="button" class="btn ghost g-queue" aria-describedby="g-round">it queued</button>' +
        '</div>' +
        '<p class="g-kbd dim" aria-hidden="true">t = i tapped &middot; q = it queued &middot; n = next</p>' +
      '</div>' +
      '<div class="g-end" hidden>' +
        '<p class="g-score say"></p>' +
        '<p class="g-prior say dim" hidden></p>' +
        '<p class="g-note say dim">most of these jumps were autoplay. each hand here is three of one and two of the other, so always guessing autoplay gets you two or three.</p>' +
        '<p class="g-caveat say dim">these labels are spotify’s own record of what started each play, not my memory of what i did.</p>' +
        '<div class="row"><button type="button" class="btn g-again">again</button><button type="button" class="btn ghost g-next">keep going</button></div>' +
      '</div>';
    root.appendChild(wrap); this.wrap = wrap;
    this.bar = [].slice.call(wrap.querySelectorAll('.g-bar i'));
    this.elA = wrap.querySelector('.g-a'); this.elB = wrap.querySelector('.g-b');
    this.verdict = wrap.querySelector('.g-verdict'); this.posts = wrap.querySelector('.g-posts');
    this.tapBtn = wrap.querySelector('.g-tap'); this.queueBtn = wrap.querySelector('.g-queue');
    this.row = wrap.querySelector('.g-row'); this.mid = wrap.querySelector('.g-mid');
    this.end = wrap.querySelector('.g-end'); this.scoreEl = wrap.querySelector('.g-score');
    this.priorEl = wrap.querySelector('.g-prior'); this.roundEl = wrap.querySelector('.g-round');
    const kbd = wrap.querySelector('.g-kbd'); if (ctx.coarse) kbd.hidden = true;
    this.tapBtn.addEventListener('click', () => this.answer(ctx, true));
    this.queueBtn.addEventListener('click', () => this.answer(ctx, false));
    wrap.querySelector('.g-again').addEventListener('click', () => this.deal(ctx, true));
    wrap.querySelector('.g-next').addEventListener('click', () => ctx.go(ctx.index + 1));
    this._onKeydown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dlg = document.getElementById('label'); if (dlg && dlg.open) return;
      if (!this.active || !this.end.hidden) return;
      this.stopDemo();
      const k = e.key.toLowerCase();
      if (k === 't' && !this.tapBtn.disabled) { e.stopPropagation(); this.answer(ctx, true, true); }
      else if (k === 'q' && !this.queueBtn.disabled) { e.stopPropagation(); this.answer(ctx, false, true); }
      else if (k === 'n' && this.answered && this.fwd && this.fwd.isConnected) { e.stopPropagation(); this.advance(ctx); }
    };
    /* the end screen spends the visitor's five answers against the real split: exhibit/data/wall.json pct_rounded.tap */
    ctx.data('wall').then((w) => { this.wallTapPct = w && w.pct_rounded && typeof w.pct_rounded.tap === 'number' ? w.pct_rounded.tap : null; }).catch(() => { this.wallTapPct = null; });
    try {
      const r = await fetch('whopressed.json' + ctx.V);
      if (!r.ok) throw 0;
      const j = await r.json();
      if (j && j.pool && j.pool.length) this.pool = j.pool;
    } catch (e) { this.pool = null; }
    this.ready = true;
  },

  /* ?atlas=0: the five-round game */
  place(ctx) {
    const s = ctx.stage(), land = innerWidth > innerHeight * 1.15, fx = land ? 0.8 : 0.5;
    this.lx = this.lxb = s.x + s.w * fx; this.lya = s.y + s.h * AY; this.lyb = s.y + s.h * BY;
    const ws = this.wrap.style; ws.left = s.x + 'px'; ws.top = s.y + 'px'; ws.width = (land && !this.endWide() ? s.w * 0.6 : s.w) + 'px'; ws.height = s.h + 'px'; this.wrap.classList.toggle('g-endwide', this.endWide());
    const P = ctx.particles, cl = this.cluster;
    P.target((i) => {
      const t = cl[i];
      if (t === 0) return [ctx.hash(i * 13 + 1), ctx.hash(i * 13 + 2)];
      const cy = t === 1 ? AY : BY;
      const u = Math.max(1e-4, ctx.hash(i * 29 + 3)), v = ctx.hash(i * 29 + 5);
      const rad = Math.sqrt(-2 * Math.log(u));
      return [clamp01(fx + rad * Math.cos(6.283 * v) * 0.045), clamp01(cy + rad * Math.sin(6.283 * v) * 0.04)];
    });
    const INK = ctx.PAL.white; /* both in ink: a provenance hue here would answer the question before the visitor does */
    P.color((i) => (cl[i] ? INK : DARK));
  },
  endWide() { return this.end && !this.end.hidden && innerHeight <= 480; },
  deal(ctx, restart) {
    clearTimeout(this.timer); ctx.stopPosts();
    if (!this.pool || !this.pool.length) { this.verdict.textContent = 'the deck did not load. try again in a moment.'; this.row.hidden = true; return; }
    if (restart || !this.rounds) {
      const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
      const tapI = [], autoI = [], all = [];
      for (let i = 0; i < this.pool.length; i++) { all.push(i); (this.pool[i][2] === 1 ? tapI : autoI).push(i); }
      /* three of one kind and two of the other, so always answering "it queued" scores two or three, never five */
      const hiT = Math.random() < 0.5, nT = hiT ? 3 : 2, nA = ROUNDS - nT;
      this.rounds = tapI.length >= nT && autoI.length >= nA
        ? shuf(shuf(tapI).slice(0, nT).concat(shuf(autoI).slice(0, nA)))
        : shuf(all).slice(0, Math.min(ROUNDS, all.length));
      this.ri = 0; this.score = 0; this.saidTap = 0;
      this.end.hidden = true; this.mid.hidden = false; this.bar.forEach((b) => { b.className = ''; });
      if (restart) this.place(ctx);
    }
    this.showRound();
  },
  showRound() {
    const hadFocus = this.wrap.contains(document.activeElement);
    const row = this.pool[this.rounds[this.ri]];
    this.elA.textContent = row[0]; this.elB.textContent = row[1];
    this.roundEl.textContent = 'round ' + (this.ri + 1) + ' of ' + this.rounds.length + ': ' + row[0] + ', then ' + row[1] + (/[.!?]$/.test(row[1]) ? '' : '.');
    this.verdict.textContent = ''; this.verdict.style.color = ''; this.posts.textContent = '';
    this.tapBtn.disabled = false; this.queueBtn.disabled = false;
    this.tapBtn.className = 'btn ghost g-tap'; this.queueBtn.className = 'btn ghost g-queue';
    this.answered = false; this.pulse = null; this.mid.classList.remove('answered');
    this.bar.forEach((b, k) => { b.className = k < this.ri ? 'on' : ''; });
    if (hadFocus) try { this.tapBtn.focus({ preventScroll: true }); } catch (e) {}
  },
  answer(ctx, guessedTap, viaKey) {
    if (this.answered || !this.pool) return; this.answered = true;
    if (guessedTap) this.saidTap++;
    const row = this.pool[this.rounds[this.ri]], truthTap = row[2] === 1, correct = guessedTap === truthTap;
    if (correct) this.score++;
    this.tapBtn.disabled = true; this.queueBtn.disabled = true;
    const okBtn = truthTap ? this.tapBtn : this.queueBtn, badBtn = truthTap ? this.queueBtn : this.tapBtn;
    okBtn.classList.add('ok'); badBtn.classList.add('bad');
    this.verdict.textContent = (correct ? 'yes. ' : 'no. ') + (truthTap ? 'i tapped this one.' : 'it queued. nobody chose that.');
    this.verdict.style.color = correct ? 'var(--ink)' : 'var(--mute)';
    this.bar[this.ri].className = correct ? 'ok' : 'bad';
    this.pulse = { t0: performance.now(), ok: correct };
    if (correct) { ctx.audio.note(3, { dur: 0.35 }); ctx.audio.note(5, { at: 0.09, dur: 0.6 }); } else ctx.audio.note(-5, { dur: 0.7, type: 'triangle' });
    const noteHost = document.createElement('div'); noteHost.className = 'g-pnote';
    ctx.post(this.posts, row[0], { noteHost }); ctx.post(this.posts, row[1], { noteHost }); this.posts.appendChild(noteHost);
    this.mid.classList.add('answered');
    const nx = document.createElement('button'); nx.type = 'button'; nx.className = 'btn ghost g-fwd';
    nx.textContent = this.ri + 1 >= this.rounds.length ? 'see the score' : 'next pair';
    nx.addEventListener('click', () => this.advance(ctx)); this.posts.appendChild(nx); this.fwd = nx;
    if (viaKey) try { nx.focus({ preventScroll: true }); } catch (e) {}
  },
  advance(ctx) {
    ctx.stopPosts(); this.ri++;
    if (this.ri >= this.rounds.length) this.showEnd(ctx); else this.showRound();
  },
  showEnd(ctx) {
    const hadFocus = this.wrap.contains(document.activeElement);
    this.mid.hidden = true; this.end.hidden = false;
    const n = this.rounds.length;
    this.scoreEl.textContent = 'you got ' + this.score + ' of ' + n + '. a coin flip averages ' + (n / 2) + '.';
    if (this.wallTapPct != null) {
      this.priorEl.textContent = 'you called ' + this.saidTap + ' of ' + n + ' tapped. across the real log, i tapped ' + this.wallTapPct + ' in a hundred.';
      this.priorEl.hidden = false;
    } else this.priorEl.hidden = true;
    this.roundEl.textContent = this.scoreEl.textContent + (this.priorEl.hidden ? '' : ' ' + this.priorEl.textContent);
    this.disperseClusters(ctx);
    if (this.endWide()) { this.wrap.style.width = ctx.stage().w + 'px'; this.wrap.classList.add('g-endwide'); }
    if (hadFocus) try { this.wrap.querySelector('.g-again').focus({ preventScroll: true }); } catch (e) {}
  },
  disperseClusters(ctx) {
    const P = ctx.particles;
    P.target((i) => [ctx.hash(i * 13 + 1), ctx.hash(i * 13 + 2)]);
    P.color(() => DARK);
  },

  enter(ctx) {
    this.active = true; this.ctx = ctx;
    document.addEventListener('pointerdown', this._onDemoBreak);
    document.addEventListener('touchstart', this._onDemoBreak, { passive: true });
    if (this.D) return this.dEnter(ctx);
    document.addEventListener('keydown', this._onKeydown);
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5;
    if (!this.ready) return;
    this.place(ctx);
    if (!this.end.hidden) this.disperseClusters(ctx);
    if (!this.rounds) this.deal(ctx, false);
  },
  leave(ctx) {
    this.active = false; this.stopDemo(); clearTimeout(this.timer); this.pulse = null; ctx.stopPosts();
    document.removeEventListener('pointerdown', this._onDemoBreak);
    document.removeEventListener('touchstart', this._onDemoBreak);
    if (this.D) return this.dLeave(ctx);
    document.removeEventListener('keydown', this._onKeydown);
  },

  stopDemo() {
    if (this.D) { this.dStopDemo(); return; }
    if (this.demoOn) { this.demoOn = false; clearTimeout(this.demoT); }
  },
  demo(ctx) {
    if (this.D) { this.dDemo(ctx); return; }
    if (!this.ready || !this.pool) return;
    clearTimeout(this.demoT); this.demoOn = true;
    this.deal(ctx, true);
    this.demoStep(ctx);
  },
  demoStep(ctx) {
    clearTimeout(this.demoT);
    if (!this.demoOn || !this.active) return;
    if (!this.end.hidden) { this.demoOn = false; return; }
    if (!this.answered) {
      this.demoT = setTimeout(() => {
        if (!this.demoOn || !this.active || this.answered || !this.rounds) return;
        const row = this.pool[this.rounds[this.ri]], truthTap = row[2] === 1;
        this.answer(ctx, Math.random() < 0.5 ? truthTap : !truthTap);
        this.demoStep(ctx);
      }, 2500);
    } else {
      this.demoT = setTimeout(() => { if (!this.demoOn || !this.active) return; this.advance(ctx); this.demoStep(ctx); }, 6000);
    }
  },

  frame(g, t, bands, w, h, ctx) {
    if (this.D) { this.dFrame(t, bands, ctx); return; }
    if (!this.ready) return;
    if (this.end && !this.end.hidden) return;
    let col = 'rgba(134,203,254,' + (0.3 + bands.high * 0.25) + ')', shake = 0;
    if (this.pulse) {
      const el = (t - this.pulse.t0) / 900;
      if (el >= 1) this.pulse = null;
      else {
        const rgb = this.pulse.ok ? '240,234,255' : '164,155,189';
        const a = ctx.reduced ? 0.85 : 0.9 - 0.5 * el;
        col = 'rgba(' + rgb + ',' + a + ')';
        if (!ctx.reduced) {
          if (!this.pulse.ok && el < 0.15) shake = Math.sin(el * 300) * 3;
          g.fillStyle = 'rgba(' + rgb + ',0.9)';
          for (let k = 0; k < 10; k++) {
            const ph = el * 1.4 - k * 0.06;
            if (ph <= 0 || ph >= 1) continue;
            g.beginPath(); g.arc(this.lx + shake, this.lya + (this.lyb - this.lya) * ph, 2.2, 0, 6.283); g.fill();
          }
        }
      }
    }
    g.strokeStyle = col; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(this.lx + shake, this.lya + 18); g.lineTo(this.lx + shake, this.lyb - 18); g.stroke();
  },

  /* atlas hooks */
  setAngle() { return 0; }, /* one angle, the duel itself: a tour never answers it */
  focus() { return false; },
  pick() { return null; },
  precision() { return []; },
  hoverVoice(id) { const D = this.D, c = D && D.cur >= 0 ? D.cur : -1; if (c < 0 || (id !== 'a' && id !== 'b')) return null; const k = D.pairs[c * 3 + (id === 'a' ? 0 : 1)]; return { fam: D.famKey(k), artist: D.names[k], kind: 'label' }; },
  keepout() {
    const D = this.D, out = [];
    if (!D || !this.active) return out;
    [D.col, D.hud, D.endEl].forEach((el) => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width && r.height) out.push({ x: r.left, y: r.top, w: r.width, h: r.height }); });
    return out;
  },
  gestures(ctx) {
    if (!this.D) return null;
    const hit = (p) => this.dHitCluster(p.sx, p.sy);
    return {
      tap: () => true,
      dbl: false,
      hover: (p) => { const k = hit(p); if (k) this.dVoice(k, ctx, 'glyph'); else this.dUnvoice(ctx); },
      leave: () => this.dUnvoice(ctx),
      cursor: (p) => (hit(p) ? 'pointer' : 'grab'),
      drag: this.dragSpec,
      hold: this.dHold((p) => { if (p.type === 'mouse') return; const k = hit(p); if (k) this.dVoice(k, ctx, 'glyph', true); }),
    };
  },

  /* the duel (atlas) */
  async dMount(root, ctx) {
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const wrap = this.wrap = root.appendChild(el('div', 'gd'));
    let was = tryf(() => ctx.tour.active.playing); tryf(() => ctx.tour.onChange((a) => { if (a.playing && !was && this.active) this.dTour(ctx); was = a.playing; }));
    const D = this.D = { cur: -1, phase: 'idle', n: 0, k: 0, streak: 0, best: 0, hist: [], tempo: false, dx: 0, dy: 0, seed: '', dealt: [], demo: false, endShown: false, sparks: new Float32Array(NSPARK * 6), sparkN: 0, sparkMode: 0, sparkCol: '#fff', geo: null, el };
    D.hud = wrap.appendChild(el('p', 'gd-hud')); D.hud.setAttribute('aria-hidden', 'true');
    D.sr = wrap.appendChild(el('p', 'gd-sr')); D.sr.setAttribute('aria-live', 'polite'); D.sr.setAttribute('aria-atomic', 'true');
    D.fx = wrap.appendChild(el('canvas', 'gd-fx')); D.fx.setAttribute('aria-hidden', 'true');
    const col = D.col = wrap.appendChild(el('div', 'gd-col'));
    const slot = col.appendChild(el('div', 'gd-slot'));
    slot.insertAdjacentHTML('beforeend', '<svg class="gd-ring" aria-hidden="true" focusable="false"><rect x="0" y="0" width="100%" height="100%" rx="18" pathLength="100"/></svg>');
    D.ring = slot.firstChild; D.ringR = D.ring.firstChild;
    const card = D.card = slot.appendChild(el('div', 'gd-card'));
    card.setAttribute('role', 'group'); card.setAttribute('aria-label', 'the card');
    D.demoTag = card.appendChild(el('span', 'gd-demo', 'demo')); D.demoTag.hidden = true;
    D.stamp = card.appendChild(el('span', 'gd-stamp')); D.stamp.setAttribute('aria-hidden', 'true');
    card.appendChild(el('p', 'gd-kick', 'who started the second song?')).setAttribute('aria-hidden', 'true');
    const pair = card.appendChild(el('div', 'gd-pair'));
    const nameBtn = (k) => { const b = pair.appendChild(el('button', 'gd-n gd-n' + k)); b.type = 'button'; b.dataset.k = k; return b; };
    D.nA = nameBtn('a'); pair.appendChild(el('span', 'gd-ar', '→')).setAttribute('aria-hidden', 'true'); D.nB = nameBtn('b');
    D.verdict = card.appendChild(el('p', 'gd-v'));
    const row = D.row = col.appendChild(el('div', 'gd-row'));
    const btn = (cls, txt, lab, f) => { const b = el('button', 'btn ghost ' + cls, txt); b.type = 'button'; if (lab) b.setAttribute('aria-label', lab); b.addEventListener('click', (e) => { if (e.isTrusted !== false) this.dStopDemo(); f(); }); return b; };
    D.bQ = row.appendChild(btn('gd-bq', '', 'it queued', () => this.dCommit(0, ctx)));
    D.bT = row.appendChild(btn('gd-bt', '', 'i tapped', () => this.dCommit(1, ctx)));
    D.bNext = row.appendChild(btn('gd-next', 'next card ›', null, () => this.dNext(ctx))); D.bNext.hidden = true;
    D.kbd = col.appendChild(el('p', 'gd-kbd')); D.kbd.setAttribute('aria-hidden', 'true');
    D.bTempo = row.appendChild(btn('gd-tempo gd-x', 'tempo', 'tempo: the card must be called within eight beats; a run-out is a pass, never an answer', () => this.dTempo(!D.tempo, ctx))); D.bTempo.hidden = true; D.bTempo.setAttribute('aria-pressed', 'false');
    D.bStop = row.appendChild(btn('gd-stop gd-x', 'stop here', 'stop here and see your result', () => this.dEnd(ctx))); D.bStop.hidden = true;
    const end = D.endEl = wrap.appendChild(el('div', 'gd-end')); end.hidden = true; end.setAttribute('role', 'group'); end.setAttribute('aria-label', 'your result');
    D.eScore = end.appendChild(el('p', 'gd-escore'));
    D.eCoin = end.appendChild(el('p', 'gd-ecoin'));
    D.eHist = end.appendChild(el('p', 'gd-ehist')); D.eHist.setAttribute('aria-hidden', 'true');
    D.eBase = end.appendChild(el('p', 'gd-ebase'));
    end.appendChild(el('p', 'gd-ecav', 'these labels are spotify’s own record of what started each play (reason_start), not my memory of what i did. the deck keeps only pairs seen under one label, so these are not typical jumps.'));
    D.eBar = end.appendChild(el('div', 'gd-ebar'));
    const er = end.appendChild(el('div', 'gd-row'));
    er.appendChild(btn('gd-more', 'keep going', null, () => this.dResume(ctx)));
    er.appendChild(btn('gd-new', 'new deck', 'new deck: a fresh shuffle', () => this.dNewRun(ctx, newSeed(), true)));
    D.thumb = wrap.appendChild(el('div', 'gd-thumb')); D.thumb.setAttribute('aria-hidden', 'true'); D.thumb.hidden = true;

    /* click / enter on a name is the keyboard path to hearing it */
    [D.nA, D.nB].forEach((b) => {
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this.dVoice(b.dataset.k, ctx, 'label'); });
      b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this.dUnvoice(ctx); });
      b.addEventListener('focus', () => this.dVoice(b.dataset.k, ctx, 'label', false, true));
      b.addEventListener('blur', () => { ctx.audio.tick(null); });
      b.addEventListener('click', () => { const nm = this.dName(b.dataset.k); if (!nm) return; const r = b.getBoundingClientRect(); tryf(() => ctx.post.playArtist(nm, { quiet: true, x: r.right + 6, y: r.bottom + 4 })); });
    });
    /* ← → only inside the card, so the shell's stop-stepping keeps them elsewhere */
    col.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (D.phase !== 'ask') return; e.preventDefault(); e.stopPropagation(); this.dStopDemo(); this.dCommit(e.key === 'ArrowRight' ? 1 : 0, ctx, true); }
    });
    this.dragSpec = {
      start: () => { if (D.phase !== 'ask') return; D.dragOn = true; D.dx = D.dy = 0; this.dStopDemo(); card.classList.add('drag'); tryf(() => ctx.post.undwell({ keep: true })); },
      move: (p, dx, dy) => { if (!D.dragOn) return; D.dx += dx; D.dy += dy; this.dCardAt(D.dx, D.dy); },
      end: () => { if (!D.dragOn) return; D.dragOn = false; card.classList.remove('drag'); const d = swipeDir(D.dx, D.dy); this.dCardAt(0, 0); if (d >= 0) this.dCommit(d, ctx); },
    };
    if (ctx.gesture && ctx.gesture.bind) ctx.gesture.bind(card, {
      drag: this.dragSpec, dbl: false, wheel: false,
      tap: (p) => { const t = p && p.e && p.e.target; if ((D.phase === 'shown' || D.phase === 'pass') && !(t && t.closest && t.closest('.gd-n'))) this.dNext(ctx); return true; },
      hold: this.dHold((p) => { if (p.type === 'mouse') return; const t = document.elementFromPoint(p.sx, p.sy), b = t && t.closest && t.closest('.gd-n'); if (b) this.dVoice(b.dataset.k, ctx, 'label', true); }),
    });
    let data = null;
    try { data = await ctx.data('whopressed2'); } catch (e) {}
    if (!data || !data.pairs || !data.names || !data.base) { D.verdict.textContent = 'the deck did not load. try again in a moment.'; D.row.hidden = true; this.ready = true; return; }
    D.data = data; D.pairs = data.pairs; D.names = data.names;
    const FK = data.fam_keys || [];
    D.famKey = (k) => FK[data.fam[k]] || 'untagged';
    D.eBase.textContent = 'of the jumps in this pool (my hand on play, a row or a remote, vs the queue running on with shuffle off), ' + data.base.auto_pct + '% were the queue. this deck is half and half on purpose, so always guessing the queue scores like a coin.';
    this.ready = true;
  },
  /* a press is a tap until 450 ms; a finger that rests, then swipes, still swipes (the hold hands its moves to the drag) */
  dHold(press) {
    const D = this.D; let lp = null;
    return { delay: 450, press: (p) => { lp = p; press(p); }, start: (p) => { lp = p; }, end: () => { lp = null; tryf(() => this.ctx.post.undwell({ keep: true })); if (D.dragOn) this.dragSpec.end(); },
      move: (p) => { if (!lp) return; const dx = p.sx - lp.sx, dy = p.sy - lp.sy; if (!D.dragOn) { if (Math.hypot(dx, dy) < 6) return; this.dragSpec.start(); } lp = p; this.dragSpec.move(p, dx, dy); } };
  },
  noSel(e) { const t = e.target, n = t && (t.nodeType === 1 ? t : t.parentElement); if (!(n && n.closest && n.closest('textarea,input,[contenteditable]'))) e.preventDefault(); },
  dName(k) { const D = this.D; return D && D.cur >= 0 ? D.names[D.pairs[D.cur * 3 + (k === 'a' ? 0 : 1)]] : null; },
  dVoice(k, ctx, kind, touch, noDwell) {
    const D = this.D, nm = this.dName(k); if (!nm) return;
    const g = D.geo, c = g && (k === 'a' ? g.A : g.B), b = k === 'a' ? D.nA : D.nB, r = kind === 'label' ? b.getBoundingClientRect() : null;
    const x = r ? r.left + r.width / 2 : c ? c.x : 0, y = r ? r.top + r.height / 2 : c ? c.y : 0;
    D.hov = k;
    ctx.audio.tick('g:' + k + ':' + nm, { fam: D.famKey(D.pairs[D.cur * 3 + (k === 'a' ? 0 : 1)]), x, y, kind, force: !!touch });
    if (!noDwell && ctx.post && ctx.post.dwell) tryf(() => ctx.post.dwell(nm, { x: (r ? r.right : x) + 10, y: (r ? r.bottom : y) + 8, touch: !!touch }));
  },
  dUnvoice(ctx) { if (this.D) this.D.hov = null; ctx.audio.tick(null); if (ctx.post && ctx.post.undwell) tryf(() => ctx.post.undwell()); },
  dHitCluster(sx, sy) {
    const g = this.D && this.D.geo; if (!g || this.D.cur < 0) return null;
    for (const [k, c] of [['a', g.A], ['b', g.B]]) { if (!c || !c.on) continue; const u = (sx - c.x) / c.rx, v = (sy - c.y) / c.ry; if (u * u + v * v <= 1) return k; }
    return null;
  },
  dCardAt(dx, dy) {
    const D = this.D, red = this.ctx && this.ctx.reduced;
    D.card.style.transform = dx || dy ? 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' + (red ? '' : ' rotate(' + (dx * 0.05).toFixed(2) + 'deg)') : '';
    const d = swipeDir(dx, dy);
    D.card.classList.toggle('gd-will', d >= 0);
    D.stamp.textContent = d === 1 ? 'i tapped' : d === 0 ? 'it queued' : '';
    D.bT.classList.toggle('gd-hot', d === 1); D.bQ.classList.toggle('gd-hot', d === 0);
  },

  dEnter(ctx) {
    const D = this.D, P = ctx.particles;
    P.ease = 0.05; P.jitter = 0.5;
    tryf(() => ctx.view.configure({ mode: 'none', drift: false }));
    P.glyphAll(true); P.glyphMode('cont', { colour: 'mean' });
    tryf(() => ctx.labels.set('game', []));
    if (!this.offKeys && ctx.keys) {
      const k = (key, f) => ctx.keys.on(key, (e) => { if (!this.active || !D.pairs || (e && /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || ''))) return false; this.dStopDemo(); return f(); });
      const offs = [k('t', () => (D.phase === 'ask' ? (this.dCommit(1, ctx, true), true) : false)), k('q', () => (D.phase === 'ask' ? (this.dCommit(0, ctx, true), true) : false)), k('n', () => (D.phase === 'shown' || D.phase === 'pass' ? (this.dNext(ctx), true) : false))];
      this.offKeys = () => offs.forEach((f) => f());
    }
    this.dTour(ctx);
    document.addEventListener('selectstart', this.noSel); tryf(() => ctx.idle.hold('game', true)); /* no long-press selection; no first tap spent waking the chrome */
    D.kbd.textContent = ctx.coarse ? 'swipe the card up if i tapped it, down if the queue did · tap a name to hear it' : 't or → i tapped · q or ← it queued · n next · rest on a name to hear it';
    if (!this.ready || !D.pairs) { P.scatter && P.scatter(); return; }
    if (!D.seed) {
      const m = /^#game(?:=|&(?:.*&)?s=)([a-z0-9]{1,16})/i.exec(String((ctx.atlas && ctx.atlas.hash0) || ''));
      this.dNewRun(ctx, m ? m[1].toLowerCase() : newSeed(), false);
    } else { this.dLayout(ctx); this.dPaint(ctx); }
  },
  dLeave(ctx) {
    const D = this.D; if (!D) return;
    clearTimeout(D.revT); clearTimeout(D.autoT); clearTimeout(D.tourT); this.dStopDemo(); document.removeEventListener('selectstart', this.noSel); tryf(() => ctx.idle.hold('game', false));
    if (this.offKeys) { this.offKeys(); this.offKeys = null; }
    tryf(() => { ctx.audio.tick(null); ctx.atlas.setLines(null); });
    D.sparkN = 0; this.dClearFx();
    if (D.phase === 'wait') D.phase = 'ask'; /* a reveal cut off by leaving: the card is asked again, never answered for you */
    D.dragOn = false; this.dCardAt(0, 0); D.card.classList.remove('drag');
  },

  dNewRun(ctx, seed, focus) {
    const D = this.D; if (!D.pairs) return;
    clearTimeout(D.revT); clearTimeout(D.autoT);
    D.seed = seed; D.deck = makeDeck(D.pairs, seed); D.dealt = [];
    D.n = D.k = D.streak = D.best = 0; D.hist = []; D.endShown = false; D.tempo = false;
    D.bTempo.hidden = true; D.bTempo.setAttribute('aria-pressed', 'false'); D.bStop.hidden = true;
    D.endEl.hidden = true; D.col.hidden = false;
    this.dLayout(ctx); this.dDeal(ctx);
    if (focus) tryf(() => D.bT.focus({ preventScroll: true }));
  },
  dDeal(ctx) {
    const D = this.D;
    clearTimeout(D.revT); clearTimeout(D.autoT); tryf(() => ctx.stopPosts());
    const c = D.deck.next(); if (c < 0) { this.dEnd(ctx); return; }
    D.cur = c; D.dealt.push(c); D.phase = 'ask'; D.reveal = -1; D.dx = D.dy = 0; D.pulse0 = performance.now();
    const a = D.names[D.pairs[c * 3]], b = D.names[D.pairs[c * 3 + 1]];
    D.nA.textContent = a; D.nB.textContent = b;
    D.nA.setAttribute('aria-label', 'hear ' + a); D.nB.setAttribute('aria-label', 'hear ' + b);
    D.verdict.textContent = ''; D.card.classList.remove('gd-ok', 'gd-bad', 'gd-pass');
    D.row.classList.remove('gd-done'); D.bT.ariaDisabled = D.bQ.ariaDisabled = null; D.bT.hidden = D.bQ.hidden = false;
    const hadNext = D.row.contains(document.activeElement); D.bNext.hidden = true;
    if (hadNext) tryf(() => D.bT.focus({ preventScroll: true }));
    this.dCardAt(0, 0); this.dLabels();
    D.sr.textContent = 'card ' + (D.dealt.length) + ': ' + a + ', then ' + b + '. did i tap ' + b + ', or did the queue play it on?';
    if (D.tempo) this.dArmTempo(ctx);
    this.dPaint(ctx);
    this.dBells(ctx);
    this.dHud();
  },
  dLabels() { const L = this.D.geo && this.D.geo.side; this.D.bQ.textContent = L ? '← it queued' : '↓ it queued'; this.D.bT.textContent = L ? 'i tapped →' : '↑ i tapped'; },
  /* genre as a degree of the bed's key floor (voice.js's mapping) */
  dBells(ctx) {
    const A = ctx.audio, D = this.D; if (!A || !A.ac || A.muted || !A.on || !A.sfx) return;
    const b = A.beat && A.beat(1), len = b ? b.len : 0.42, at0 = b ? Math.max(0.02, b.next - b.now) : 0.05;
    const R = (A.pitches ? A.pitches() : [2]).map((pc) => (pc - 2 + 12) % 12).sort((x, y) => x - y), L = R.length || 1, FK = Object.keys(ctx.FAM);
    [0, 1].forEach((j) => {
      const fk = FK.indexOf(D.famKey(D.pairs[D.cur * 3 + j])), d = fk < 0 || fk >= 13 ? 0 : fk, semi = R[d % L];
      this.dBell(A, 293.66 * Math.pow(2, semi / 12), at0 + j * len, j ? 0.35 : -0.35);
    });
  },
  dBell(A, f, at, pan) {
    const ac = A.ac, t = ac.currentTime + at, g = ac.createGain(), out = typeof ac.createStereoPanner === 'function' ? ac.createStereoPanner() : null;
    if (out) { out.pan.value = pan; g.connect(out); out.connect(A.sfx); } else g.connect(A.sfx);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    [[1, 1], [2, 0.32], [3, 0.12]].forEach(([m, v]) => { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = f * m; og.gain.value = v; o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.15); });
  },
  dCommit(guess, ctx, viaKey) {
    const D = this.D; if (!D || D.phase !== 'ask' || D.cur < 0) return;
    D.phase = 'wait'; D.guess = guess; D.viaKey = !!viaKey;
    D.bT.ariaDisabled = D.bQ.ariaDisabled = 'true'; /* not disabled: that would drop the keyboard focus to body */ D.bT.classList.remove('gd-hot'); D.bQ.classList.remove('gd-hot');
    tryf(() => ctx.audio.tick('g:commit' + D.dealt.length, { deg: guess ? 2 : 0, kind: 'control', force: true }));
    const A = ctx.audio, b = A && A.beat && A.beat(1), wait = b ? Math.max(0, b.next - b.now) : 0;
    if (wait > 0.02) D.revT = setTimeout(() => this.dReveal(ctx), wait * 1000); else this.dReveal(ctx);
  },
  dReveal(ctx) {
    const D = this.D; if (D.phase !== 'wait') return;
    const truth = D.pairs[D.cur * 3 + 2] ? 1 : 0, ok = D.guess === truth;
    D.phase = 'shown'; D.reveal = performance.now(); D.truth = truth; D.ok = ok;
    D.n++; if (ok) { D.k++; D.streak++; D.best = Math.max(D.best, D.streak); } else D.streak = 0;
    D.hist.push(ok ? 1 : 0); if (!D.demo) this.dTour(ctx, 1);
    D.verdict.textContent = (ok ? 'yes: ' : 'no: ') + (truth ? 'i tapped this one.' : 'the queue played this one on.');
    D.card.classList.add(ok ? 'gd-ok' : 'gd-bad');
    D.row.classList.add('gd-done'); D.bT.hidden = D.bQ.hidden = true; D.bNext.hidden = false;
    if (D.viaKey || D.col.contains(document.activeElement)) tryf(() => D.bNext.focus({ preventScroll: true }));
    D.bTempo.hidden = D.n < TEMPO_AFTER; D.bStop.hidden = false;
    D.sr.textContent = D.verdict.textContent + ' ' + D.k + ' of ' + D.n + ', streak ' + D.streak + '.';
    this.dHud(); this.dFx(ctx, ok, truth); this.dSound(ctx, ok);
    if (ok) tryf(() => ctx.buzz(18));
    this.dAuto(ctx);
  },
  dAuto(ctx) {
    const D = this.D; clearTimeout(D.autoT);
    D.autoT = setTimeout(() => {
      if (!this.active || (D.phase !== 'shown' && D.phase !== 'pass') || D.demo) return;
      const st = tryf(() => ctx.post.state()) || {};
      if (D.hov || D.dragOn || st.open || (st.quiet && st.artist)) { this.dAuto(ctx); return; } /* listening or about to: wait */
      this.dNext(ctx);
    }, D.tempo ? 1100 : AUTO);
  },
  dNext(ctx) {
    const D = this.D; if (D.phase !== 'shown' && D.phase !== 'pass') return;
    if (D.n >= RUN && !D.endShown) { this.dEnd(ctx); return; }
    this.dDeal(ctx);
  },
  dSound(ctx, ok) {
    const A = ctx.audio; if (!A || !A.ac || A.muted || !A.on) return;
    const b = A.beat && A.beat(4), st = b ? Math.max(0.07, b.len) : 0.09;
    if (ok) {
      [0, 2, 3, 5].forEach((s, i) => A.note(s, { at: i * st, dur: 0.4, vol: 0.04 }));
      const S = this.D.streak; if (S === 5 || S === 10 || S === 20) A.note(S === 5 ? 7 : S === 10 ? 8 : 10, { at: 4 * st, dur: 0.9, vol: 0.045 });
    } else {
      const ac = A.ac, t = ac.currentTime + 0.01, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(146.83, t); o.frequency.exponentialRampToValueAtTime(73.42, t + 0.55);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      o.connect(g); g.connect(A.sfx); o.start(t); o.stop(t + 0.8);
      if (A.whoosh) A.whoosh(0.3);
    }
  },
  dTempo(on, ctx) {
    const D = this.D; D.tempo = on; D.bTempo.setAttribute('aria-pressed', on ? 'true' : 'false'); D.bTempo.textContent = on ? 'tempo: on' : 'tempo';
    if (on && D.phase === 'ask') this.dArmTempo(ctx); this.dHud();
  },
  dArmTempo(ctx) {
    const D = this.D, b = ctx.audio && ctx.audio.beat && ctx.audio.beat(1), bpm = (b ? b.bpm : NOMBPM) * (1 + Math.min(0.08, 0.02 * D.streak));
    D.tLen = (TEMPO_BEATS * 60000) / bpm; D.t0 = performance.now();
  },
  dPass(ctx) {
    const D = this.D; if (D.phase !== 'ask') return;
    D.phase = 'pass'; D.hist.push(-1); D.streak = 0;
    D.verdict.textContent = 'pass: the clock ran out. no score, and no answer given.';
    D.card.classList.add('gd-pass'); D.row.classList.add('gd-done'); D.bT.hidden = D.bQ.hidden = true; D.bNext.hidden = false;
    D.sr.textContent = D.verdict.textContent; this.dHud(); this.dAuto(ctx);
  },
  dHud() {
    const D = this.D;
    D.hud.textContent = 'STREAK ' + pad2(D.streak) + ' · ' + D.k + '/' + D.n + (D.n ? ' · A COIN DOES AT LEAST THIS WELL ' + this.dPct(coinTail(D.k, D.n)) + ' OF THE TIME' : ' · ' + (D.geo && D.geo.side ? 'DRAG THE CARD ← OR → TO ANSWER' : 'SWIPE THE CARD ↑ OR ↓ TO ANSWER')) + (D.tempo ? ' · TEMPO' : '');
    if (this.ctx) this.dRefit(this.ctx);
  },
  dPct(p) { return p >= 0.9995 ? '100%' : p < 0.001 ? 'UNDER 0.1%' : (p * 100).toFixed(1) + '%'; },
  async dEnd(ctx) {
    const D = this.D; if (!D.n) return;
    clearTimeout(D.autoT); clearTimeout(D.revT); if (D.phase === 'wait') { D.phase = 'ask'; D.bT.ariaDisabled = D.bQ.ariaDisabled = null; }
    D.endShown = true;
    const hadFocus = D.col.contains(document.activeElement);
    D.col.hidden = true; D.endEl.hidden = false; tryf(() => ctx.atlas.setLines(null)); D.lines = false;
    const pct = this.dPct(coinTail(D.k, D.n)).toLowerCase(), hist = D.hist.map((h) => (h > 0 ? '●' : h === 0 ? '○' : '·')).join('');
    D.eScore.textContent = 'you called ' + D.k + ' of ' + D.n + '. longest streak ' + D.best + '.';
    D.eCoin.textContent = 'a coin does at least this well ' + pct + ' of the time.';
    D.eHist.textContent = hist;
    D.sr.textContent = D.eScore.textContent + ' ' + D.eCoin.textContent;
    const link = SITE + 'exhibit.html#game&s=' + D.seed;
    const text = 'who pressed play? i called ' + D.k + ' of ' + D.n + ' (longest streak ' + D.best + ').\na coin does at least this well ' + pct + ' of the time.\n' + hist + '\nsame deck: ' + link;
    if (hadFocus) tryf(() => D.endEl.querySelector('.gd-more').focus({ preventScroll: true }));
    try {
      const C = await import('../atlas/card.js' + (ctx.V || ''));
      if (!D.cbar) D.cbar = C.bar(D.eBar, { ctx, label: 'share your result' });
      D.cbar.set({
        kicker: 'who pressed play?', title: 'my hand or the queue', demo: !!D.demo,
        hero: [{ segs: [[String(D.k), 'ice'], [' of ' + D.n, 'ink']] }],
        cols: ['', 'you'],
        rows: [{ cells: ['longest streak', String(D.best)] }, { cells: ['a coin does at least this well', pct] }],
        note: 'one of two things started each song: my hand or the queue.',
        fine: 'labels: spotify’s reason_start. the deck is half and half on purpose and keeps only pairs seen under one label, so these are not typical jumps.',
        path: 'exhibit.html#game&s=' + D.seed,
      }, text, 'who-pressed-play.png');
    } catch (e) { /* the result still reads above; only the picture is missing */ }
  },
  dResume(ctx) { const D = this.D; D.endEl.hidden = true; D.col.hidden = false; this.dLayout(ctx); if (D.phase === 'ask') { this.dPaint(ctx); tryf(() => D.bT.focus({ preventScroll: true })); } else { this.dDeal(ctx); tryf(() => D.bT.focus({ preventScroll: true })); } },

  /* layout: the card in the middle, a constellation either side */
  dLayout(ctx) {
    const D = this.D, s = ctx.stage(), ws = this.wrap.style;
    ws.left = s.x + 'px'; ws.top = s.y + 'px'; ws.width = s.w + 'px'; ws.height = s.h + 'px';
    const dpr = Math.min(2, devicePixelRatio || 1), fx = D.fx; fx.width = Math.round(s.w * dpr); fx.height = Math.round(s.h * dpr); fx.style.width = s.w + 'px'; fx.style.height = s.h + 'px'; D.fxDpr = dpr;
    if (D.col.hidden) return; /* the result panel is up: the pair keeps its last places */
    const side = s.w >= 600 && s.w > s.h * 0.92, low = s.h < 430;
    this.wrap.classList.toggle('gd-side', side); this.wrap.classList.toggle('gd-low', low);
    const gw = side ? Math.min(380, Math.max(250, s.w * 0.4)) : Math.min(380, s.w - 8);
    D.col.style.width = gw + 'px';
    const GF = ctx.atlas && ctx.atlas.GF, cc = (GF && GF.info && +GF.info().cellCss) || 6;
    const H = D.hud.getBoundingClientRect(), top = Math.max(s.y + EDGE * 0.5, H.bottom + 8);
    D.col.style.top = ((top + s.y + s.h - EDGE * 0.5) / 2 - s.y) + 'px';
    const C0 = D.col.getBoundingClientRect();
    const C = { l: C0.left, t: C0.top, r: C0.right, b: C0.bottom }; D.colH = C0.height; D.hudH = H.height;
    const obs = this.obstacles(s);
    const fit = (x0, y0, x1, y1, prefer) => {
      const w = x1 - x0, h = y1 - y0; if (w < 36 || h < 36) return { on: false, x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: 0, ry: 0 };
      let ry = Math.min(h / 2, side ? s.h * 0.24 : 150), rx = Math.min(w / 2, side ? 150 : ry * 1.35, Math.max(ry, 40) * 1.6);
      ry = Math.min(ry, rx * 1.1);
      let x = prefer != null ? Math.min(x1 - rx, Math.max(x0 + rx, prefer)) : (x0 + x1) / 2, y = (y0 + y1) / 2;
      if (side) y = Math.min(y1 - ry, Math.max(y0 + ry, (C.t + C.b) / 2));
      /* off the ladder's pieces: slide away along the free axis, then shrink */
      for (let it = 0; it < 12; it++) {
        const q = obs.find((o) => x + rx > o.left - 6 && x - rx < o.right + 6 && y + ry > o.top - 6 && y - ry < o.bottom + 6); if (!q) break;
        const nx = q.left - 6 - rx; if (nx - rx >= x0) { x = nx; continue; }
        rx *= 0.85; ry *= 0.85; x = Math.min(x1 - rx, Math.max(x0 + rx, x));
      }
      return { on: rx >= 18 && ry >= 18, x, y, rx, ry };
    };
    const m = GAP + cc;
    D.geo = side
      ? { side, cc, col: C, A: fit(s.x + EDGE, top, C.l - m, s.y + s.h - EDGE), B: fit(C.r + m, top, s.x + s.w - EDGE, s.y + s.h - EDGE) }
      : { side, cc, col: C, A: fit(s.x + EDGE, top, s.x + s.w - EDGE, C.t - m, s.x + s.w * 0.5), B: fit(s.x + EDGE, C.b + m, s.x + s.w - EDGE, s.y + s.h - EDGE * 0.5, s.x + s.w * 0.5) };
    this.dLabels();
    this.dTargets(ctx);
    this.fogWeights(ctx, s, this.cluster);
  },
  /* a wrapped name, verdict or HUD line moves the column: re-place the pair */
  dRefit(ctx) { const D = this.D; if (D.geo && !D.col.hidden && (Math.abs(D.col.offsetHeight - D.colH) > 1 || Math.abs(D.hud.offsetHeight - D.hudH) > 1)) this.dLayout(ctx); },
  dTargets(ctx, kick) {
    const D = this.D, s = ctx.stage(), g = D.geo, cl = this.cluster, cc = g.cc, hash = ctx.hash;
    const fr = (c, k) => (c.on ? [(c.x - s.x) / s.w, (c.y - s.y) / s.h, Math.max(1, c.rx - cc) / RMAX / s.w * k, Math.max(1, c.ry - cc * 1.8) / RMAX / s.h * k] : null);
    const fa = fr(g.A, 1), fb = fr(g.B, kick || 1);
    ctx.particles.target((i) => {
      const t = cl[i], f = t === 1 ? fa : t === 2 ? fb : null;
      if (!f) return [hash(i * 13 + 1), hash(i * 13 + 2)];
      const u = UMIN + (1 - UMIN) * Math.max(1e-4, hash(i * 29 + 3)), v = hash(i * 29 + 5), rad = Math.sqrt(-2 * Math.log(u));
      return [clamp01(f[0] + rad * Math.cos(6.283 * v) * f[2]), clamp01(f[1] + rad * Math.sin(6.283 * v) * f[3])];
    });
  },
  dPaint(ctx) {
    const D = this.D; if (D.cur < 0) return;
    const cl = this.cluster, ca = ctx.famColor(D.famKey(D.pairs[D.cur * 3])), cb = D.phase === 'shown' && D.ok === false ? 0x6e6680 : ctx.famColor(D.famKey(D.pairs[D.cur * 3 + 1]));
    ctx.particles.color((i) => (cl[i] === 1 ? ca : cl[i] === 2 ? cb : DARK));
    D.trailDirty = true;
  },
  /* ice until the call: provenance colour would answer it */
  dTrail(ctx, t) {
    const D = this.D, g = D.geo, A = ctx.atlas; if (!g || !A || !A.setLines) return;
    if (D.cur < 0 || !g.A.on || !g.B.on || !D.endEl.hidden) { if (D.lines) { A.setLines(null); D.lines = false; } return; }
    const C = g.col, buf = D.tbuf || (D.tbuf = new Float32Array(14));
    let p0, p1, p2, p3;
    if (g.side) { const cy = (C.t + C.b) / 2; p0 = [g.A.x + g.A.rx * 0.7, g.A.y]; p1 = [C.l - 6, cy]; p2 = [C.r + 6, cy]; p3 = [g.B.x - g.B.rx * 0.7, g.B.y]; }
    else { const cx = (C.l + C.r) / 2; p0 = [g.A.x, g.A.y + g.A.ry * 0.7]; p1 = [cx, C.t - 6]; p2 = [cx, C.b + 6]; p3 = [g.B.x, g.B.y - g.B.ry * 0.7]; }
    const shown = D.phase === 'shown', col = shown ? (D.truth ? ctx.PAL.tap : ctx.PAL.violet) : TRAIL_ICE;
    const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), L = l1 + l2 || 1;
    let ph = NaN, w = TRAIL_W;
    if (shown) { const e = (t - D.reveal) / 900; w = e < 1 ? 0.55 - 0.25 * e : 0.3; if (!ctx.reduced && e < 1) ph = e; }
    else if (!ctx.reduced) { const e = ((t - (D.pulse0 || t)) % 2600) / 1400; if (e <= 1) ph = e; }
    const at = ph === ph ? ph * L : -1;
    buf[0] = p0[0]; buf[1] = p0[1]; buf[2] = p1[0]; buf[3] = p1[1]; buf[4] = w; buf[5] = col; buf[6] = at >= 0 && at <= l1 ? at / (l1 || 1) : NaN;
    buf[7] = p2[0]; buf[8] = p2[1]; buf[9] = p3[0]; buf[10] = p3[1]; buf[11] = w; buf[12] = col; buf[13] = at > l1 ? (at - l1) / (l2 || 1) : NaN;
    A.setLines(buf); D.lines = true;
  },
  dFx(ctx, ok, truth) {
    const D = this.D, g = D.geo, c = g && g.B; this.dPaint(ctx);
    if (!c || !c.on || ctx.reduced) return;
    const S = D.sparks, s = ctx.stage(); let n = 0;
    for (let i = 0; i < NSPARK; i++, n++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()), o = i * 6;
      S[o] = c.x - s.x + Math.cos(a) * c.rx * r * 0.8; S[o + 1] = c.y - s.y + Math.sin(a) * c.ry * r * 0.8;
      if (ok) { const v = 120 + Math.random() * 220; S[o + 2] = Math.cos(a) * v; S[o + 3] = Math.sin(a) * v; } else { S[o + 2] = (Math.random() - 0.5) * 24; S[o + 3] = 20 + Math.random() * 50; }
      S[o + 4] = 0; S[o + 5] = (Math.random() * 4) | 0;
    }
    D.sparkN = n; D.sparkMode = ok ? 1 : 0; D.sparkCol = ok ? hexs(truth ? ctx.PAL.tap : ctx.PAL.violet) : ASH; D.sparkT = performance.now();
    if (ok) { this.dTargets(ctx, 1.9); clearTimeout(D.kickT); D.kickT = setTimeout(() => { if (this.active) this.dTargets(ctx); }, 320); }
  },
  dClearFx() { const D = this.D, x = D.fx.getContext('2d'); if (x) x.clearRect(0, 0, D.fx.width, D.fx.height); D.fxDirty = false; },
  dFrame(t, bands, ctx) {
    const D = this.D; if (!D || !this.ready || !D.pairs) return;
    this.dTrail(ctx, t);
    const A = ctx.audio, b = A && A.on && !A.muted && A.beat ? A.beat(1) : null;
    const ph = b ? b.phase : 0.999, op = ctx.reduced || !b ? 0.22 : 0.16 + 0.55 * Math.pow(1 - ph, 3);
    if (Math.abs(op - (D.ringOp || 0)) > 0.01) { D.ring.style.opacity = op.toFixed(3); D.ringOp = op; }
    let rem = 1;
    if (D.tempo && D.phase === 'ask' && !D.demo && D.tLen) { rem = 1 - (performance.now() - D.t0) / D.tLen; if (rem <= 0) { rem = 0; this.dPass(ctx); } }
    if (rem !== D.rem) { D.ringR.style.strokeDashoffset = ((1 - rem) * 100).toFixed(1); D.rem = rem; }
    if (D.sparkN) {
      const x = D.fx.getContext('2d'), S = D.sparks, dpr = D.fxDpr || 1, el = (t - D.sparkT) / 1000, life = D.sparkMode ? 0.95 : 1.5;
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, D.fx.width, D.fx.height);
      if (el >= life) { D.sparkN = 0; return; }
      const a = 1 - el / life, CH = D.sparkMode ? SPARK_CH : ASH_CH;
      x.font = '600 ' + (D.sparkMode ? 15 : 13) + 'px "JetBrains Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.fillStyle = D.sparkCol; x.globalAlpha = a;
      for (let i = 0; i < D.sparkN; i++) {
        const o = i * 6, drag = D.sparkMode ? 1 - Math.min(0.6, el * 0.6) : 1;
        const px = S[o] + S[o + 2] * el * drag, py = S[o + 1] + S[o + 3] * el * drag + (D.sparkMode ? 0 : 40 * el * el);
        x.fillText(CH[S[o + 5] % CH.length], px, py);
      }
      x.globalAlpha = 1;
    }
  },

  /* CRIT6A: a playing tour waits 8 s for the visitor's swipe; idle, the ghost thumb calls one card and the stop ends
     once its answer shows (tour.js holdLeft). a visitor's own calls hold the stop 12 s per card; after three it moves on */
  dTour(ctx, hit) {
    const D = this.D, T = ctx.tour, a = T && T.active; clearTimeout(D.tourT);
    if (!a || !a.playing || !T.holdLeft) return;
    if (hit) { D.tourN = (D.tourN || 0) + 1; T.holdLeft(D.tourN < 3 ? 12000 : 3500); return; }
    D.tourN = 0;
    D.tourT = setTimeout(() => { if (this.active && a.playing && D.phase === 'ask' && !D.demo) { this.dDemo(ctx, 1); T.holdLeft(4600); } }, 8000);
  },
  /* kiosk: a ghost thumb swipes three cards at random, marked demo (a playing tour: one, see dTour) */
  dDemo(ctx, n) {
    const D = this.D; if (!D || !D.pairs || !this.active) return;
    this.dStopDemo();
    D.demo = true; D.demoTag.hidden = false; D.thumb.hidden = false;
    this.dNewRun(ctx, newSeed(), false); D.demo = true; D.demoTag.hidden = false;
    const T = D.demoT = [], at = (ms, f) => T.push(setTimeout(() => { if (this.active && D.demo) f(); }, ms));
    n = n || 3;
    for (let k = 0; k < n; k++) {
      const t0 = 1200 + k * 4200, dir = Math.random() < 0.5 ? 1 : 0, side = D.geo.side;
      const vx = side ? (dir ? 1 : -1) : 0, vy = side ? 0 : (dir ? -1 : 1);
      at(t0, () => { const r = D.card.getBoundingClientRect(), w = this.wrap.getBoundingClientRect(); D.thumb.style.left = (r.left + r.width / 2 - w.left) + 'px'; D.thumb.style.top = (r.top + r.height / 2 - w.top) + 'px'; D.thumb.className = 'gd-thumb on'; D.thumb.style.transform = ''; });
      for (let s = 1; s <= 8; s++) at(t0 + 300 + s * 70, () => { const d = s * 11; this.dCardAt(vx * d, vy * d); D.thumb.style.transform = 'translate(' + vx * d + 'px,' + vy * d + 'px)'; });
      at(t0 + 1000, () => { this.dCardAt(0, 0); D.thumb.className = 'gd-thumb'; if (D.phase === 'ask') this.dCommit(dir, ctx); });
      at(t0 + 3600, () => { if (D.phase === 'shown') this.dDeal(ctx); });
    }
    at(1200 + n * 4200, () => this.dStopDemo());
  },
  dStopDemo() {
    const D = this.D; if (!D || !D.demo) return;
    (D.demoT || []).forEach(clearTimeout); D.demoT = null;
    D.demo = false; D.demoTag.hidden = true; D.thumb.hidden = true; D.thumb.className = 'gd-thumb';
    /* the demo's calls were never the visitor's: a fresh run starts clean */
    if (this.active && this.ctx) this.dNewRun(this.ctx, newSeed(), false); else D.seed = ''; /* left mid-demo: the next visit deals afresh */
  },

  /* shared */
  obstacles(s) {
    const out = [];
    document.querySelectorAll('.atlas-ladder,.atlas-ladder *,.atlas-ladder-chip').forEach((el) => {
      const q = el.getBoundingClientRect(); if (!q.width || !q.height || q.left >= innerWidth || q.right <= 0) return;
      if (q.right <= s.x || q.left >= s.x + s.w || q.bottom <= s.y || q.top >= s.y + s.h) return;
      if (getComputedStyle(el).visibility === 'hidden') return;
      out.push({ left: q.left, top: q.top, right: q.right, bottom: q.bottom });
    });
    return out;
  },
  /* about one fog dot per three cells keeps a weight, so the constellations carry the density */
  fogWeights(ctx, s, cl) {
    const P = ctx.particles, W = P.w, n = P.n, h = ctx.hash, cw = ctx.lowPower ? 7 : 6, cells = (s.w * s.h) / (cw * cw * 1.8);
    if (!W) return;
    let nf = 0; for (let i = 0; i < n; i++) if (!cl || !cl[i]) nf++;
    const on = Math.min(1, (0.35 * cells) / Math.max(1, nf));
    for (let i = 0; i < n; i++) {
      if (cl && cl[i]) { W[i] = 255; continue; }
      W[i] = h(i * 17 + 5) < on ? FOGW + ((Math.pow(h(i * 19 + 3), 3) * 80) | 0) : 0;
    }
  },
};

const css = document.createElement('style');
const Q = 'html.atlas section[data-room="game"] ';
css.textContent = (
/* ?atlas=0 */
'@G .g-wrap{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:14px;text-align:center}' +
'@G .g-bar{display:flex;gap:6px}' +
'@G .g-round,@G .gd-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}' +
'@G .g-bar i{width:26px;height:4px;border-radius:2px;background:rgba(189,166,255,.18);display:block}' +
'@G .g-bar i.on{background:var(--ice)}' +
'@G .g-bar i.ok{background:var(--ink)}' +
'@G .g-bar i.bad{background:none;box-shadow:inset 0 0 0 1px var(--mute)}' +
'@G .g-mid{display:flex;flex-direction:column;align-items:center;gap:12px;flex:1;justify-content:center;max-width:340px}' +
'@G .g-name{font:italic 500 clamp(21px,4.6vw,38px)/1.15 var(--serif)}' +
'@G .g-a,@G .g-b{color:var(--ink)}' +
'@G .g-arrow{font:600 18px/1 var(--mono);color:var(--mute)}' +
'@G .g-verdict{min-height:1.3em;margin:0}' +
'@G .g-posts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:flex-start}' +
'@G .g-fwd{flex-basis:100%;max-width:220px;margin:4px auto 0;color:var(--ink)}' +
'@G .g-row{margin-top:4px;justify-content:center}' +
'@G .g-mid.answered .g-row{display:none}' +
'@G .g-kbd{font:400 11px/1.4 var(--mono);color:var(--mute);letter-spacing:.02em;margin:0}' +
'@G .g-prior{margin:0}' +
'@G .g-posts .post{margin:0;max-width:none}@G .g-pnote{flex-basis:100%;text-align:center}@G .g-pnote .post-note{margin:0}' +
'@media (max-height:720px) and (max-aspect-ratio:115/100){@G .g-mid.answered .g-name,@G .g-mid.answered .g-arrow{display:none}@G .g-name{font-size:20px}}' +
'@media (max-width:640px){@G .g-mid{gap:8px}@G .g-pnote .post-note{font-size:10.5px;line-height:1.4}}' +
'@G .g-tap,@G .g-queue{color:var(--ink);border-color:rgba(216,210,234,.42)}' +
'@G .g-tap.ok,@G .g-queue.ok{background:var(--ink);color:#0a0118}' +
'@G .g-tap.bad,@G .g-queue.bad{background:none;color:var(--mute);border:1px dashed var(--mute)}' +
'@G .g-end{display:flex;flex-direction:column;align-items:center;gap:8px;max-width:34ch}' +
'@G .g-score{font-weight:600}' +
'@media (min-width:1600px){@G .g-mid{max-width:clamp(340px,26vw,560px)}@G .g-kbd{font-size:clamp(11px,.7vw,16px)}@G .g-arrow{font-size:clamp(18px,1.1vw,26px)}}' +
'@media (max-height:480px) and (min-aspect-ratio:115/100){@G .g-wrap.g-endwide{overflow-y:auto;overscroll-behavior:contain}@G .g-end{gap:2px;max-width:none}@G .g-mid{gap:8px}@G .g-name{font-size:24px}}' +
/* atlas: the duel */
Q + '.gd{position:absolute;pointer-events:none}' +
Q + '.gd [hidden]{display:none!important}' +
Q + '.gd-fx{position:absolute;left:0;top:0;pointer-events:none}' +
Q + '.gd-hud{position:absolute;right:0;top:0;margin:0;max-width:100%;text-align:right;font:600 11px/1.55 var(--mono);letter-spacing:.08em;color:var(--ice);text-shadow:0 0 8px #0a0118}' +
Q + '.gd-col{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px;background:#0a0118f5;box-shadow:0 0 0 12px #0a0118f5;border-radius:16px}' +
Q + '.gd-col>*{pointer-events:auto}' +
Q + '.gd-slot{position:relative;width:100%}' +
Q + '.gd-ring{position:absolute;left:-7px;top:-7px;width:calc(100% + 14px);height:calc(100% + 14px);overflow:visible;pointer-events:none;opacity:.22}' +
Q + '.gd-ring rect{fill:none;stroke:#86cbfe;stroke-width:1.2;stroke-dasharray:100;stroke-dashoffset:0}' +
Q + '.gd-card{position:relative;box-sizing:border-box;width:100%;padding:16px 14px 12px;text-align:center;background:#0a0118;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);border:1px solid rgba(134,203,254,.3);border-radius:14px;touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none;transition:transform .28s cubic-bezier(.2,.8,.2,1),border-color .2s}' +
Q + '.gd-card.drag{transition:none;cursor:grabbing}' +
Q + '.gd-card.gd-will{border-color:#86cbfe}' +
Q + '.gd-kick{margin:0 0 8px;font:500 10px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}' +
Q + '.gd-pair{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;column-gap:6px;row-gap:0}' +
Q + '.gd-n{font:italic 500 clamp(20px,2.3vw,30px)/1.2 var(--serif);color:var(--ink);background:none;border:0;padding:2px 6px;margin:0;border-radius:6px;cursor:pointer;max-width:100%;overflow-wrap:anywhere;text-shadow:0 0 12px #0a0118}' +
Q + '.gd-n:hover{color:var(--ice)}' +
Q + '.gd-n:focus-visible{outline:2px solid var(--ice);outline-offset:2px}' +
Q + '.gd-ar{font:600 18px/1 var(--mono);color:var(--ice)}' +
Q + '.gd-v{margin:8px 0 0;min-height:1.35em;font:500 12px/1.35 var(--mono);color:var(--ink)}' +
Q + '.gd-card.gd-bad .gd-v,' + Q + '.gd-card.gd-pass .gd-v{color:var(--mute)}' +
Q + '.gd-stamp{position:absolute;left:50%;top:-11px;transform:translateX(-50%);padding:2px 8px;font:600 10px/1.4 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#0a0118;background:#86cbfe;border-radius:4px;opacity:0;transition:opacity .12s;white-space:nowrap}' +
Q + '.gd-card.gd-will .gd-stamp{opacity:1}' +
Q + '.gd-demo{position:absolute;right:8px;top:6px;font:600 9px/1.4 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#86cbfe;border:1px solid #86cbfe;border-radius:3px;padding:0 5px}' +
Q + '.gd-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
Q + '.gd-row .btn{color:var(--ink);border-color:rgba(216,210,234,.42);background:rgba(10,1,24,.72);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);min-width:9.5em}' +
Q + '.gd-row .btn.gd-hot{border-color:#86cbfe;color:#86cbfe}' +
Q + '.gd-row .btn[aria-disabled=true]{opacity:.55}' +
Q + '.gd-row .btn:focus-visible{outline:2px solid var(--ice)}' +
Q + '.gd-kbd{margin:0;font:400 10.5px/1.4 var(--mono);color:var(--mute);text-align:center;text-shadow:0 0 8px #0a0118}' +
Q + '.gd-row:not(.gd-done) .gd-x{display:none}' +
Q + '.gd-row .gd-x{min-width:0;font:500 10.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);background:rgba(10,1,24,.6);border:1px solid rgba(216,210,234,.28);border-radius:999px;padding:6px 12px;min-height:32px;cursor:pointer}' +
Q + '.gd-row .gd-x[aria-pressed="true"]{color:#86cbfe;border-color:#86cbfe}' +
Q + '.gd-end{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,calc(100% - 8px));max-height:100%;overflow-y:auto;box-sizing:border-box;padding:18px 16px;display:flex;flex-direction:column;gap:8px;text-align:center;background:rgba(10,1,24,.86);border:1px solid rgba(134,203,254,.3);border-radius:14px;pointer-events:auto}' +
Q + '.gd-end p{margin:0}' +
Q + '.gd-escore{font:600 16px/1.35 var(--mono);color:var(--ink)}' +
Q + '.gd-ecoin{font:500 13px/1.4 var(--mono);color:var(--ice)}' +
Q + '.gd-ehist{font:500 14px/1.2 var(--mono);color:var(--ink);letter-spacing:.12em;overflow-wrap:anywhere}' +
Q + '.gd-ebase,' + Q + '.gd-ecav{font:400 11px/1.45 var(--mono);color:var(--mute)}' +
Q + '.gd-ebar{display:flex;justify-content:center}' +
Q + '.gd-thumb{position:absolute;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;border:1.5px solid rgba(134,203,254,.85);background:rgba(134,203,254,.16);pointer-events:none;opacity:0;transition:opacity .2s}' +
Q + '.gd-thumb.on{opacity:1}' +
Q + '.gd-low .gd-kbd{display:none}' +
Q + '.gd-low .gd-kick{margin-bottom:4px}' +
Q + '.gd-low .gd-col{gap:6px}' +
Q + '.gd-low .gd-card{padding:10px 12px 8px}' +
'@media (pointer:coarse){' + Q + '.gd-row .gd-x{min-height:44px;padding:8px 14px}}' +
'@media (max-width:400px){' + Q + '.gd-hud{font-size:10px;letter-spacing:.05em}' + Q + '.gd-row .btn{min-width:0;flex:1 1 0}' + Q + '.gd-row{width:100%;flex-wrap:nowrap}}' +
'@media (prefers-reduced-motion:reduce){' + Q + '.gd-card{transition:none}}' +
'@media (forced-colors:active){' + Q + '.gd-card,' + Q + '.gd-end{border:1px solid CanvasText}' + Q + '.gd-ring rect{stroke:CanvasText}' + Q + '.gd-stamp{forced-color-adjust:none;background:Highlight;color:HighlightText}}').replace(/@G/g, 'section[data-room="game"]');
document.head.appendChild(css);
