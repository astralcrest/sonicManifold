/* room 2 — who pressed play? the wall dims to violet fog; two clusters of the same particles pull
   forward into a constellation, one above, one below, both in ink. guess which artist i tapped and which
   one the app queued. data: whopressed.json at the site root, spotify's own reason_start labels. */

const ROUNDS = 5, AY = 0.18, BY = 0.82, DARK = 0x1a1030;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default {
  id: 'game', track: 'hooked-at-first-taste',
  pool: null, cluster: null, rounds: null, ri: 0, score: 0, answered: false, timer: 0, active: false, pulse: null,
  lx: 0, lya: 0, lyb: 0, saidTap: 0, wallTapPct: null, demoOn: false, demoT: 0,

  async mount(root, ctx) {
    const wrap = document.createElement('div'); wrap.className = 'g-wrap';
    wrap.innerHTML =
      '<div class="g-bar" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="g-mid">' +
        '<div class="g-name g-a"></div>' +
        '<div class="g-arrow" aria-hidden="true">&darr;</div>' +
        '<div class="g-name g-b"></div>' +
        '<p class="g-verdict say dim" aria-live="polite"></p>' +
        '<div class="g-posts"></div>' +
        '<div class="row g-row">' +
          '<button type="button" class="btn ghost g-tap">i tapped</button>' +
          '<button type="button" class="btn ghost g-queue">it queued</button>' +
        '</div>' +
        '<p class="g-kbd dim" aria-hidden="true">t = i tapped &middot; q = it queued &middot; n = next</p>' +
      '</div>' +
      '<div class="g-end" hidden>' +
        '<p class="g-score say" aria-live="polite"></p>' +
        '<p class="g-prior say dim" aria-live="polite" hidden></p>' +
        '<p class="g-note say dim">in the real log about 86% of these jumps were autoplay. each hand here is three of one and two of the other, so always guessing autoplay gets you two or three.</p>' +
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
    this.priorEl = wrap.querySelector('.g-prior');
    const kbd = wrap.querySelector('.g-kbd'); if (ctx.coarse) kbd.hidden = true;
    this.tapBtn.addEventListener('click', () => this.answer(ctx, true));
    this.queueBtn.addEventListener('click', () => this.answer(ctx, false));
    wrap.querySelector('.g-again').addEventListener('click', () => this.deal(ctx, true));
    wrap.querySelector('.g-next').addEventListener('click', () => ctx.go(ctx.index + 1));
    /* a real visitor's own pointer, touch or key anywhere in the document ends any kiosk demo immediately: no
       timer outlives a real hand. attached in enter(), removed in leave(), so nothing is listening while this
       room is not the one on screen. */
    this._onDemoBreak = () => { if (this.active) this.stopDemo(); };
    this._onKeydown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dlg = document.getElementById('label'); if (dlg && dlg.open) return; /* the wall label is modal: t / q / n must not answer a round behind it */
      if (!this.active || !this.end.hidden) return; /* score screen: t / q / n have nothing left to answer */
      this.stopDemo();
      const k = e.key.toLowerCase();
      if (k === 't' && !this.tapBtn.disabled) { e.stopPropagation(); this.answer(ctx, true, true); }
      else if (k === 'q' && !this.queueBtn.disabled) { e.stopPropagation(); this.answer(ctx, false, true); }
      else if (k === 'n' && this.answered && this.fwd && this.fwd.isConnected) { e.stopPropagation(); this.advance(ctx); }
    };

    const P = ctx.particles, n = P.n, frac = 240 / n;
    this.cluster = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const u = ctx.hash(i * 31 + 11); this.cluster[i] = u < frac ? 1 : u < frac * 2 ? 2 : 0; }
    /* the visitor's own five answers get spent on the end screen against this real split: exhibit/data/wall.json pct_rounded.tap */
    ctx.data('wall').then((w) => { this.wallTapPct = w && w.pct_rounded && typeof w.pct_rounded.tap === 'number' ? w.pct_rounded.tap : null; }).catch(() => { this.wallTapPct = null; });
    try {
      const r = await fetch('whopressed.json' + ctx.V);
      if (!r.ok) throw 0;
      const j = await r.json();
      if (j && j.pool && j.pool.length) this.pool = j.pool;
    } catch (e) { this.pool = null; }
    this.ready = true;
  },

  place(ctx) {
    /* the panel lives inside the stage, never over the wall text. on a wide screen the two clusters stand to its right; on a phone they sit behind it */
    const s = ctx.stage(), land = innerWidth > innerHeight * 1.15, fx = land ? 0.8 : 0.5;
    this.lx = s.x + s.w * fx; this.lya = s.y + s.h * AY; this.lyb = s.y + s.h * BY;
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
    const INK = ctx.PAL.white; /* both artists in ink: a provenance hue here would answer the question before the visitor does */
    P.color((i) => (cl[i] ? INK : DARK));
  },

  /* a landscape phone's score screen: the clusters are gone, so the text takes the whole stage width instead of a 100-200px column */
  endWide() { return this.end && !this.end.hidden && innerHeight <= 480; },

  deal(ctx, restart) {
    clearTimeout(this.timer); ctx.stopPosts();
    if (!this.pool || !this.pool.length) { this.verdict.textContent = 'the deck did not load. try again in a moment.'; this.row.hidden = true; return; }
    if (restart || !this.rounds) {
      const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
      const tapI = [], autoI = [], all = [];
      for (let i = 0; i < this.pool.length; i++) { all.push(i); (this.pool[i][2] === 1 ? tapI : autoI).push(i); }
      /* three of one kind and two of the other, so a visitor who always answers "it queued" scores two or three, never five */
      const hiT = Math.random() < 0.5, nT = hiT ? 3 : 2, nA = ROUNDS - nT;
      this.rounds = tapI.length >= nT && autoI.length >= nA
        ? shuf(shuf(tapI).slice(0, nT).concat(shuf(autoI).slice(0, nA)))
        : shuf(all).slice(0, Math.min(ROUNDS, all.length));
      this.ri = 0; this.score = 0; this.saidTap = 0;
      this.end.hidden = true; this.mid.hidden = false; this.bar.forEach((b) => { b.className = ''; });
      if (restart) this.place(ctx); /* re-forms the two clusters if the previous game's end screen parked them */
    }
    this.showRound();
  },

  showRound() {
    const hadFocus = this.wrap.contains(document.activeElement);
    const row = this.pool[this.rounds[this.ri]];
    this.elA.textContent = row[0]; this.elB.textContent = row[1];
    this.verdict.textContent = ''; this.verdict.style.color = ''; this.posts.textContent = '';
    this.tapBtn.disabled = false; this.queueBtn.disabled = false;
    this.tapBtn.className = 'btn ghost g-tap'; this.queueBtn.className = 'btn ghost g-queue';
    this.answered = false; this.pulse = null; this.mid.classList.remove('answered');
    this.bar.forEach((b, k) => { b.className = k < this.ri ? 'on' : ''; });
    /* posts.textContent='' above just deleted the focused .g-fwd button; put focus back if it was ours to lose */
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
    this.verdict.style.color = correct ? 'var(--ink)' : 'var(--mute)'; /* right and wrong are not provenance: mint, violet and rose stay reserved */
    this.bar[this.ri].className = correct ? 'ok' : 'bad';
    this.pulse = { t0: performance.now(), ok: correct };
    if (correct) { ctx.audio.note(3, { dur: 0.35 }); ctx.audio.note(5, { at: 0.09, dur: 0.6 }); } else ctx.audio.note(-5, { dur: 0.7, type: 'triangle' });
    const noteHost = document.createElement('div'); noteHost.className = 'g-pnote';
    ctx.post(this.posts, row[0], { noteHost }); ctx.post(this.posts, row[1], { noteHost }); this.posts.appendChild(noteHost);
    this.mid.classList.add('answered');
    /* no timer: a listening post needs longer than any timeout i could pick, so the visitor moves the round on */
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
    /* the visitor's own five answers, spent: their guessed-tap rate against the real one (wall.json pct_rounded.tap) */
    if (this.wallTapPct != null) {
      this.priorEl.textContent = 'you called ' + this.saidTap + ' of ' + n + ' tapped. across the real log, i tapped ' + this.wallTapPct + ' in a hundred.';
      this.priorEl.hidden = false;
    } else this.priorEl.hidden = true;
    this.disperseClusters(ctx); /* the score screen's text now owns the stage; the connector is also gated off in frame() */
    if (this.endWide()) { this.wrap.style.width = ctx.stage().w + 'px'; this.wrap.classList.add('g-endwide'); }
    /* this.mid.hidden=true above can drop focus to <body> the same way showRound()'s posts clear does */
    if (hadFocus) try { this.wrap.querySelector('.g-again').focus({ preventScroll: true }); } catch (e) {}
  },

  disperseClusters(ctx) {
    /* scatters the two clusters back into the plain field, same look as this room's own non-cluster dots;
       place(ctx) (called from enter(), or from deal() on restart) re-forms them */
    const P = ctx.particles;
    P.target((i) => [ctx.hash(i * 13 + 1), ctx.hash(i * 13 + 2)]);
    P.color(() => DARK);
  },

  enter(ctx) {
    this.active = true;
    document.addEventListener('pointerdown', this._onDemoBreak);
    document.addEventListener('touchstart', this._onDemoBreak, { passive: true });
    document.addEventListener('keydown', this._onKeydown);
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5;
    if (!this.ready) return;
    this.place(ctx);
    if (!this.end.hidden) this.disperseClusters(ctx); /* back on the score screen (or a resize there): keep the clusters parked */
    if (!this.rounds) this.deal(ctx, false);
  },
  leave(ctx) {
    this.active = false; this.stopDemo(); clearTimeout(this.timer); this.pulse = null; ctx.stopPosts();
    document.removeEventListener('pointerdown', this._onDemoBreak);
    document.removeEventListener('touchstart', this._onDemoBreak);
    document.removeEventListener('keydown', this._onKeydown);
  },

  stopDemo() { if (this.demoOn) { this.demoOn = false; clearTimeout(this.demoT); } },

  /* kiosk mode only: plays one full round-by-round session by itself, stops at the score screen, restarts on the next call */
  demo(ctx) {
    if (!this.ready || !this.pool) return;
    clearTimeout(this.demoT); this.demoOn = true;
    this.deal(ctx, true);
    this.demoStep(ctx);
  },
  demoStep(ctx) {
    clearTimeout(this.demoT);
    if (!this.demoOn || !this.active) return;
    if (!this.end.hidden) { this.demoOn = false; return; } /* score screen: stop, wait for the next demo() call to restart */
    if (!this.answered) {
      this.demoT = setTimeout(() => {
        if (!this.demoOn || !this.active || this.answered || !this.rounds) return;
        const row = this.pool[this.rounds[this.ri]], truthTap = row[2] === 1;
        this.answer(ctx, Math.random() < 0.5 ? truthTap : !truthTap); /* right half the time, same as a coin flip */
        this.demoStep(ctx);
      }, 2500);
    } else {
      this.demoT = setTimeout(() => {
        if (!this.demoOn || !this.active) return;
        this.advance(ctx);
        this.demoStep(ctx);
      }, 6000);
    }
  },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready) return;
    if (this.end && !this.end.hidden) return; /* score screen is up: don't draw the connector/pulse over its text */
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
};

const css = document.createElement('style');
css.textContent =
'section[data-room="game"] .g-wrap{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:14px;text-align:center}' +
'section[data-room="game"] .g-bar{display:flex;gap:6px}' +
'section[data-room="game"] .g-bar i{width:26px;height:4px;border-radius:2px;background:rgba(189,166,255,.18);display:block}' +
'section[data-room="game"] .g-bar i.on{background:var(--ice)}' +
'section[data-room="game"] .g-bar i.ok{background:var(--ink)}' +
'section[data-room="game"] .g-bar i.bad{background:none;box-shadow:inset 0 0 0 1px var(--mute)}' +
'section[data-room="game"] .g-mid{display:flex;flex-direction:column;align-items:center;gap:12px;flex:1;justify-content:center;max-width:340px}' +
'section[data-room="game"] .g-name{font:italic 500 clamp(21px,4.6vw,38px)/1.15 var(--serif)}' +
'section[data-room="game"] .g-a,section[data-room="game"] .g-b{color:var(--ink)}' + /* no provenance hint before the answer */
'section[data-room="game"] .g-arrow{font:600 18px/1 var(--mono);color:var(--mute)}' +
'section[data-room="game"] .g-verdict{min-height:1.3em;margin:0}' +
'section[data-room="game"] .g-posts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:flex-start}' +
'section[data-room="game"] .g-fwd{flex-basis:100%;max-width:220px;margin:4px auto 0;color:var(--ink)}' +
'section[data-room="game"] .g-row{margin-top:4px;justify-content:center}' +
'section[data-room="game"] .g-mid.answered .g-row{display:none}' +
'section[data-room="game"] .g-kbd{font:400 11px/1.4 var(--mono);color:var(--mute);letter-spacing:.02em;margin:0}' +
'section[data-room="game"] .g-prior{margin:0}' +
'section[data-room="game"] .g-posts .post{margin:0;max-width:none}section[data-room="game"] .g-pnote{flex-basis:100%;text-align:center}section[data-room="game"] .g-pnote .post-note{margin:0}' +
'@media (max-height:720px) and (max-aspect-ratio:115/100){section[data-room="game"] .g-mid.answered .g-name,section[data-room="game"] .g-mid.answered .g-arrow{display:none}section[data-room="game"] .g-name{font-size:20px}}' +
'@media (max-width:640px){section[data-room="game"] .g-mid{gap:8px}section[data-room="game"] .g-pnote .post-note{font-size:10.5px;line-height:1.4}}' +
'section[data-room="game"] .g-tap,section[data-room="game"] .g-queue{color:var(--ink);border-color:rgba(216,210,234,.42)}' +
'section[data-room="game"] .g-tap.ok,section[data-room="game"] .g-queue.ok{background:var(--ink);color:#0a0118}' +
'section[data-room="game"] .g-tap.bad,section[data-room="game"] .g-queue.bad{background:none;color:var(--mute);border:1px dashed var(--mute)}' +
'section[data-room="game"] .g-end{display:flex;flex-direction:column;align-items:center;gap:8px;max-width:34ch}' +
'section[data-room="game"] .g-score{font-weight:600}' +
'@media (max-height:480px) and (min-aspect-ratio:115/100){section[data-room="game"] .g-wrap.g-endwide{overflow-y:auto;overscroll-behavior:contain}section[data-room="game"] .g-end{gap:2px;max-width:none}section[data-room="game"] .g-mid{gap:8px}section[data-room="game"] .g-name{font-size:24px}section[data-room="game"] .g-mid.answered .g-name,section[data-room="game"] .g-mid.answered .g-arrow{display:none}}';
document.head.appendChild(css);
