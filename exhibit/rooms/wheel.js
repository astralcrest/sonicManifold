/* N5 · who held the wheel, the aggregate view. data: exhibit/data/wheel_agg.json only (aggregates; passed the privacy gate and
   the stats-referee twice: R5/wheel/PII.md, REFEREE2.md). a run = plays in a row, inside one session,
   with the same driver: started by hand, or not. two skylines, one per driver, on one scale: each bar is a run length and its
   height is that driver's share of its own runs. shapes, not a rate comparison. the rows view (one row per session) is held:
   it would only ever be asked for when the data file says rows exist (d.rows === true), and this round it never does, so
   no request for a rows file is made. nothing here names a longest run or a longest session: the top bar is open-ended. */
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const fmt = (n) => Number(n).toLocaleString('en-US');
const tryf = (f) => { try { return f(); } catch (e) {} };
const RUL = ['bundled', 'strict'];
const ANGLES = [{ id: 'bundled', name: 'bundled ruler' }, { id: 'strict', name: 'strict ruler' }];
const WHO = ['started by hand', 'not started by hand'];
const PAREN = ['(served or shuffled)', '(served, shuffled, or skipped to)'];
const DUST = 0.14, GAP = 26, NB = 6, STEPMS = 190, DIMW = 118, DUSTW = 34;

const CSS = `@ .wh-hud{position:absolute;box-sizing:border-box;padding:10px 12px 11px;background:rgba(10,1,24,.8);border:1px solid rgba(134,203,254,.22);border-radius:12px;-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
@ .wh-k{margin:0;font:600 10.5px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}
@ .wh-n{margin:3px 0 0;font:600 42px/1 var(--mono);color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
@ .wh-s{margin:4px 0 9px;font:400 11.5px/1.4 var(--mono);color:var(--mute)}
@ .wh-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 9px}
@ .wh-rg{display:inline-flex;border:1px solid rgba(134,203,254,.3);border-radius:999px;padding:1px}
@ .wh-rg button,@ .wh-play{font:600 10.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;border-radius:999px;min-height:44px;min-width:44px;cursor:pointer;white-space:nowrap}
@ .wh-rg button{color:var(--mute);background:none;border:0;padding:0 12px}
@ .wh-rg button:hover{color:var(--ink)}
@ .wh-rg button[aria-checked="true"]{color:var(--ink);background:rgba(134,203,254,.18);box-shadow:inset 0 0 0 1px var(--ice)}
@ .wh-play{color:var(--ice);background:rgba(10,1,24,.6);border:1px solid rgba(134,203,254,.5);padding:0 14px}
@ .wh-play:hover{border-color:var(--ice);background:rgba(134,203,254,.1)}
@ .wh-rg button:focus-visible,@ .wh-play:focus-visible{outline:2px solid var(--ice);outline-offset:2px}
@ .wh-leg{list-style:none;margin:0 0 7px;padding:0;font:400 11.5px/1.55 var(--mono);color:var(--ink)}
@ .wh-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:-1px}
@ .wh-leg span{color:var(--mute)}
@ .wh-note{margin:0;font:400 10.5px/1.45 var(--mono);color:var(--mute)}
@ .wh-hud.cmp{padding:8px 10px 9px;background:#0a0118f5}
@ .wh-hud.cmp .wh-n{font-size:30px}
@ .wh-hud.cmp .wh-s{margin-bottom:6px;font-size:10.5px}
@ .wh-hud.cmp .wh-row{margin-bottom:6px;flex-wrap:nowrap}
@ .wh-hud.cmp .wh-rg button{padding:0 9px}
@ .wh-hud.cmp .wh-play{padding:0 11px}
@ .wh-hud.cmp .wh-leg{font-size:10.5px;line-height:1.45;margin-bottom:4px}
@ .wh-hud.cmp .wh-note{font-size:10px;line-height:1.4}
@ .wh-tag{position:absolute;z-index:2;max-width:250px;margin:0;font:400 10.5px/1.4 var(--mono);color:var(--ink);background:rgba(10,1,24,.9);border:1px solid rgba(134,203,254,.35);border-radius:6px;padding:5px 8px;pointer-events:none}
@ .wh-tag b{font-weight:600;color:var(--ice)}
@ .wh-tag span{display:block;color:var(--mute)}
@ .wh-kb{position:absolute;pointer-events:none;border-radius:6px}
@ .wh-kb:focus{outline:none}
@ .wh-kb:focus-visible{outline:2px solid var(--ice);outline-offset:4px}
@ .wh-kb div{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
@ .wh-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media (forced-colors:active){@ .wh-hud,@ .wh-tag{border:1px solid CanvasText}@ .wh-rg button[aria-checked="true"]{forced-color-adjust:none;background:Highlight;color:HighlightText}@ .wh-play{border:1px solid CanvasText}@ .wh-leg i{forced-color-adjust:none}}
@media print{@ .wh-play,@ .wh-rg{display:none}}`.replace(/@ /g, 'html.atlas section[data-room="wheel"] ');

export default {
  id: 'wheel', track: 'tryin', glyph: { edges: false }, angles: ANGLES, reticle: false,
  /* the ladder prints no play count here: every bar is a share of runs, and the dots only fill the shapes */
  ladderNote: 'the bars are shares',
  ready: false, view: 'agg', r: 0, hov: -1, kb: -1, lit: -2, run: null, cnt: null, on: false, flash: -1e9, demoT: null, introT: 0,

  async mount(root, ctx) {
    this.ctx = ctx; this.root = root;
    if (!ctx.atlas || !ctx.atlas.on) return;
    document.head.appendChild(el('style')).textContent = CSS;
    let d = null;
    try { d = await ctx.data('wheel_agg'); } catch (e) {}
    const ok = d && d.ruler && RUL.every((k) => d.ruler[k] && Array.isArray(d.ruler[k].hand_hist) && d.ruler[k].hand_hist.length === NB && d.ruler[k].machine_hist.length === NB) && d.sessions;
    if (!ok) { const w = root.parentElement.querySelector('.wall'); if (w) w.appendChild(el('p', 'say dim', 'the sessions did not load this time.')); return; }
    this.d = d; this.view = 'agg'; /* d.rows is never true this round: the rows view is held, so no rows file is asked for */
    this.bins = d.run_buckets.map((b) => b.replace('-', '–'));
    /* shares[r][driver][bin] and their running sums, from the file's histograms */
    this.sh = RUL.map((k) => { const R = d.ruler[k]; return [R.hand_hist, R.machine_hist].map((h) => { const n = h.reduce((a, b) => a + b, 0) || 1; return Float64Array.from(h, (v) => v / n); }); });
    this.cum = this.sh.map((r) => r.map((s) => { const c = new Float64Array(NB + 1); for (let k = 0; k < NB; k++) c[k + 1] = c[k] + s[k]; c[NB] = 1.0000001; return c; }));
    this.mx = [0, 1].map((v) => Math.max(...this.sh.map((r) => Math.max(...r[v])))); /* one scale for both rulers: nothing jumps on a flip */
    /* every dot keeps its driver and its place in that driver's order for the visit, so a flip pours dots between bars */
    const P = ctx.particles, N = P.n, h = ctx.hash;
    this.drv = new Uint8Array(N); this.rk = new Float32Array(N); this.jx = new Float32Array(N); this.bar = new Uint8Array(N).fill(255);
    let a = 0;
    for (let i = 0; i < N; i++) { if (h(i * 11 + 3) < DUST) { this.drv[i] = 2; continue; } this.drv[i] = a & 1; a++; }
    const nd = [Math.ceil(a / 2), Math.floor(a / 2)], q = [0, 0];
    for (let i = 0; i < N; i++) { const v = this.drv[i]; this.jx[i] = h(i * 13 + 7); if (v < 2) { this.rk[i] = (q[v] + h(i * 17 + 5)) / nd[v]; q[v]++; } }
    this.buildUI(root);
    this.ready = true;
  },

  buildUI(root) {
    const at = (e, k, v) => { e.setAttribute(k, v); return e; };
    const hud = this.hud = root.appendChild(el('div', 'wh-hud'));
    hud.appendChild(el('p', 'wh-k', 'the wheel changed hands'));
    this.nEl = at(hud.appendChild(el('p', 'wh-n', '0')), 'aria-hidden', 'true');
    this.sEl = hud.appendChild(el('p', 'wh-s'));
    this.srEl = hud.appendChild(el('p', 'wh-sr'));
    const row = hud.appendChild(el('div', 'wh-row'));
    const rg = this.rg = at(at(row.appendChild(el('div', 'wh-rg')), 'role', 'radiogroup'), 'aria-label', 'ruler: what counts as started by hand');
    this.rb = RUL.map((k, i) => {
      const b = at(rg.appendChild(el('button', '', k)), 'role', 'radio'); b.type = 'button';
      b.addEventListener('click', () => { this.stopDemo(); this.setRuler(i, true); });
      b.addEventListener('keydown', (e) => { if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return; e.preventDefault(); e.stopPropagation(); const j = 1 - i; this.stopDemo(); this.setRuler(j, true); this.rb[j].focus(); });
      return b;
    });
    const pb = this.pb = row.appendChild(el('button', 'wh-play')); pb.type = 'button';
    pb.append(at(el('span', '', '▸ '), 'aria-hidden', 'true'), this.pbT = el('span', '', 'play the shapes'));
    at(pb, 'aria-label', 'play the two shapes as two phrases');
    pb.addEventListener('click', () => { this.stopDemo(); this.phrase(this.ctx); });
    const leg = hud.appendChild(el('ul', 'wh-leg'));
    this.legP = [0, 1].map((v) => { const li = leg.appendChild(el('li')), sw = at(li.appendChild(el('i')), 'aria-hidden', 'true'); sw.style.background = v ? '#8b6fd6' : '#21f6bc'; li.appendChild(document.createTextNode(WHO[v])); return v ? li.appendChild(el('span', '')) : null; })[1];
    this.noteEl = hud.appendChild(el('p', 'wh-note'));
    const kb = this.kbEl = at(at(root.appendChild(el('div', 'wh-kb')), 'role', 'listbox'), 'aria-label', 'the two skylines, 12 bars. arrows walk the bars, up and down change skyline, space plays both shapes');
    kb.tabIndex = 0;
    for (let b = 0; b < NB * 2; b++) { const o = at(at(kb.appendChild(el('div')), 'role', 'option'), 'aria-selected', 'false'); o.id = 'wh-o' + b; }
    kb.addEventListener('focus', () => this.kbTo(this.kb < 0 ? 0 : this.kb));
    kb.addEventListener('blur', () => this.setHov(-1, this.ctx));
    kb.addEventListener('keydown', (e) => this.key(e));
    this.tag = root.appendChild(el('p', 'wh-tag')); this.tag.hidden = true; at(this.tag, 'aria-hidden', 'true');
  },

  /* ------------------------------------------------------------------ copy for the active ruler (every number from the file) */
  R() { return this.d.ruler[RUL[this.r]]; },
  copy() {
    const R = this.R(), rn = RUL[this.r], S = this.d.sessions, cmp = this.cmp;
    this.sEl.textContent = 'times, in ' + fmt(S.n) + ' sessions · ' + rn + ' reading';
    this.srEl.textContent = rn + ' reading: the wheel changed hands ' + fmt(R.handoffs) + ' times in ' + fmt(S.n) + ' listening sessions.';
    this.legP.textContent = ' ' + PAREN[this.r];
    this.noteEl.textContent = cmp
      ? 'shapes, not a rate comparison: by hand is the smaller share (' + fmt(R.hand_plays) + ' of ' + fmt(S.plays) + ' plays), and a smaller share makes shorter runs by arithmetic alone.'
      : 'each skyline is its own runs, by length, as a share of its runs. by hand is the smaller share (' + fmt(R.hand_plays) + ' of ' + fmt(S.plays) + ' plays, ' + rn + '), and a smaller share makes shorter runs by arithmetic alone. shapes, not a rate comparison.';
    this.rb.forEach((b, i) => { b.setAttribute('aria-checked', String(i === this.r)); b.tabIndex = i === this.r ? 0 : -1; });
    const kb = this.kbEl.children;
    for (let b = 0; b < NB * 2; b++) kb[b].textContent = this.barText(b);
  },
  binTxt(k) { const s = this.d.run_buckets[k]; return /\+$/.test(s) ? 'runs of ' + parseInt(s, 10) + ' or more plays' : /-/.test(s) ? 'runs of ' + s.replace('-', ' or ') + ' plays' : 'runs of ' + s + (s === '1' ? ' play' : ' plays'); },
  med(v) { const R = this.R(), m = v ? R.machine_median : R.hand_median, s = this.d.run_buckets; for (let k = 0; k < NB; k++) { const a = parseInt(s[k], 10), b = /\+$/.test(s[k]) ? 1e9 : /-/.test(s[k]) ? parseInt(s[k].split('-')[1], 10) : a; if (m >= a && m <= b) return k; } return -1; },
  barText(b) {
    const v = b >= NB ? 1 : 0, k = b % NB, R = this.R(), n = (v ? R.machine_hist : R.hand_hist)[k], of = v ? R.machine_runs : R.hand_runs;
    return WHO[v] + ', ' + this.binTxt(k) + ': ' + fmt(n) + ' of ' + fmt(of) + ' runs (' + RUL[this.r] + ' reading)' + (this.med(v) === k ? '. the median run lands here' : '');
  },

  /* ------------------------------------------------------------------ layout: only from enter(), sized to ctx.stage() */
  layout(ctx) {
    const s = this.st = ctx.stage(), side = s.h < 440 && s.w > s.h * 1.2, nar = !side && s.w < 600, cmp = this.cmp = side || nar || s.h < 560;
    const hs = this.hud.style; this.hud.classList.toggle('cmp', cmp);
    const hw = side ? Math.min(260, s.w * 0.44) : nar ? s.w : Math.min(318, s.w * 0.42);
    hs.width = hw + 'px'; hs.left = (s.x + s.w - hw) + 'px'; hs.top = s.y + 'px';
    this.copy();
    const hH = this.hud.offsetHeight || 220;
    let bx = s.x, by = s.y + 4, bw = s.w, bh = s.h - 10;
    if (side) bw = s.w - hw - 14;
    else if (nar) { by = s.y + hH + 10; bh = s.y + s.h - by - 6; }
    const ind = !side && !nar && bw > 520 ? 96 : 0, x0 = bx + ind, colW = (bw - ind) / NB, w = Math.min(120, colW * 0.74);
    const A = Math.max(60, bh - GAP), U = A / (this.mx[0] + this.mx[1]), yh = by + this.mx[0] * U + GAP / 2;
    this.g = { x0, colW, w, pad: (colW - w) / 2, U, yh, top: by, bot: by + bh, ind, bx };
    /* the hud sits over the tall end of no bar: if it does on this stage, the skylines take the width beside it instead */
    if (!side && !nar) {
      const hb = s.y + hH + 8, hx = s.x + s.w - hw - 8;
      let clash = false;
      for (let k = 0; k < NB; k++) if (x0 + (k + 1) * colW > hx && yh - GAP / 2 - this.mx[0] * U * this.maxBin(0, k) < hb) clash = true;
      if (clash) { const w2 = hx - bx - 8, cw2 = (w2 - ind) / NB; Object.assign(this.g, { colW: cw2, w: Math.min(120, cw2 * 0.74) }); this.g.pad = (cw2 - this.g.w) / 2; }
    }
    const G = this.g, ks = this.kbEl.style;
    ks.left = (G.x0 - 4) + 'px'; ks.top = G.top + 'px'; ks.width = (G.colW * NB + 8) + 'px'; ks.height = (G.bot - G.top) + 'px';
  },
  maxBin(v, k) { return Math.max(this.sh[0][v][k], this.sh[1][v][k]) / this.mx[v]; },
  bxOf(k) { return this.g.x0 + k * this.g.colW + this.g.pad; },
  barRect(b, r) {
    const G = this.g, v = b >= NB ? 1 : 0, k = b % NB, hgt = Math.max(1.5, this.sh[r == null ? this.r : r][v][k] * G.U), x = this.bxOf(k);
    return v ? [x, G.yh + GAP / 2, G.w, hgt] : [x, G.yh - GAP / 2 - hgt, G.w, hgt];
  },

  /* ------------------------------------------------------------------ the field: dots fill the two shapes */
  placeDots(ctx) {
    const P = ctx.particles, G = this.g, s = this.st, sh = this.sh[this.r], cm = this.cum[this.r], drv = this.drv, rk = this.rk, jx = this.jx, bar = this.bar, h = ctx.hash;
    const hb = G.yh - GAP / 2, mb = G.yh + GAP / 2;
    P.targetPx((i) => {
      const v = drv[i];
      if (v === 2) { bar[i] = 255; return [s.x + h(i * 5 + 1) * s.w, s.y + h(i * 5 + 2) * s.h]; }
      const C = cm[v], r = rk[i]; let k = 0;
      while (k < NB - 1 && r >= C[k + 1]) k++;
      bar[i] = v * NB + k;
      const off = Math.min(sh[v][k], Math.max(0, r - C[k])) * G.U, x = this.bxOf(k) + jx[i] * G.w;
      return [x, v ? mb + off : hb - off];
    });
    this.weigh(ctx, this.lit);
  },
  colour(ctx) { const P = ctx.particles, c = [ctx.PAL.tap, ctx.PAL.violet, ctx.PAL.fog], drv = this.drv; P.color((i) => c[drv[i]]); },
  /* the light half of a hover or the playhead: that bar at full weight, the rest a step back. one pass, only on a change */
  weigh(ctx, b) {
    this.lit = b; const W = ctx.particles.w, bar = this.bar, N = W.length;
    for (let i = 0; i < N; i++) { const k = bar[i]; W[i] = k === 255 ? DUSTW : b < 0 || k === b ? 255 : DIMW; }
  },

  enter(ctx) {
    const P = ctx.particles;
    P.ease = 0.075; P.jitter = 0.25; P.big = false; P.touch = false;
    if (!this.ready) { P.scatter(); P.color(() => 0x57507a); return; }
    const first = !this.on; this.on = true;
    tryf(() => ctx.view.configure({ mode: 'none' }));
    const k = tryf(() => ctx.angle.get().k) | 0; this.r = k === 1 ? 1 : 0;
    this.layout(ctx);
    P.glyphAll(true); P.glyphMode('cont', { colour: 'sample', edges: false });
    this.colour(ctx); this.placeDots(ctx);
    if (first) {
      this.hov = -1; this.tag.hidden = true;
      this.count(0, this.R().handoffs, ctx);
      clearTimeout(this.introT); this.introT = setTimeout(() => { if (this.on) this.phrase(ctx); }, ctx.reduced ? 200 : 900);
    } else this.nEl.textContent = fmt(this.cnt ? this.cnt.to : this.R().handoffs);
  },
  leave(ctx) {
    this.on = false; this.stopDemo(); clearTimeout(this.introT); this.stopRun(); this.cnt = null; this.hov = -1; this.lit = -2;
    if (this.tag) this.tag.hidden = true;
    tryf(() => { ctx.stopPosts(); ctx.audio.tick(null); });
  },

  /* ------------------------------------------------------------------ the ruler */
  setAngle(k, ctx) { if (!this.ready || (k !== 0 && k !== 1)) return 0; return this.setRuler(k, false) ? (ctx && ctx.reduced ? 0 : 900) : 0; },
  setRuler(i, user) {
    if (!this.ready || i === this.r) return false;
    const ctx = this.ctx, was = this.R().handoffs;
    this.r = i; this.copy();
    if (this.on) { this.placeDots(ctx); this.count(was, this.R().handoffs, ctx); }
    if (user) tryf(() => { const a = ctx.angle.get(); if (a && a.id !== RUL[i]) ctx.angle.set(RUL[i], { via: 'room' }); });
    tryf(() => ctx.audio.tick('wh:ruler' + i, { deg: i ? 2 : 0, kind: 'control' }));
    tryf(() => ctx.say(this.srEl.textContent));
    if (this.hov >= 0) this.setHov(this.hov, ctx, null, true);
    if (this.on) { clearTimeout(this.introT); this.introT = setTimeout(() => { if (this.on) this.phrase(ctx); }, ctx.reduced ? 100 : 700); }
    return true;
  },
  /* the counter rolls from the old count to the new one, with a short run of soft clicks: hand-offs, not one per hand-off */
  count(from, to, ctx) {
    if (ctx.reduced) { this.cnt = { from: to, to, t0: 0, dur: 1 }; this.nEl.textContent = fmt(to); return; }
    this.cnt = { from, to, t0: performance.now(), dur: 1300 };
    const A = ctx.audio; if (!A || !A.on || A.muted) return;
    for (let q = 0; q < 9; q++) tryf(() => A.note(10, { at: 1.3 * Math.pow(q / 9, 0.6), dur: 0.035, vol: 0.012, type: 'triangle' }));
  },

  /* ------------------------------------------------------------------ the sound: two phrases */
  phrase(ctx) {
    if (!this.ready || !this.on) return;
    this.stopRun();
    const A = ctx.audio, b = tryf(() => A.beat && A.beat(2)), st = b && b.len > 0.12 && b.len < 0.4 ? b.len : STEPMS / 1000, at0 = b ? Math.max(0, b.next - b.now) : 0.04;
    const sh = this.sh[this.r];
    for (let k = 0; k < NB; k++) {
      tryf(() => A.note(k, { at: at0 + k * st, dur: 0.32, vol: 0.022 + 0.055 * Math.sqrt(sh[0][k]), type: 'triangle' }));
      tryf(() => A.note(k - 5, { at: at0 + (NB + 1 + k) * st, dur: 0.4, vol: 0.026 + 0.06 * Math.sqrt(sh[1][k]), type: 'sine' }));
    }
    tryf(() => A.note(10, { at: at0 + NB * st, dur: 0.03, vol: 0.03, type: 'triangle' })); /* the hand-off: a soft click */
    this.run = { t0: performance.now() + at0 * 1000, st: st * 1000, k: -2 };
  },
  stopRun() { if (this.run) { this.run = null; if (this.on && this.ctx) this.weigh(this.ctx, this.hov); } },

  /* ------------------------------------------------------------------ hover, touch, keyboard */
  barAt(x, y) {
    const G = this.g; if (!G) return -1;
    const k = Math.floor((x - G.x0) / G.colW); if (k < 0 || k >= NB || y < G.top - 6 || y > G.bot + 6) return -1;
    return y < G.yh ? k : NB + k;
  },
  hoverVoice(id) { const m = /^wh:(\d+)$/.exec(String(id)); if (!m) return null; const b = +m[1], v = b >= NB ? 1 : 0; return { deg: b % NB, plays: v ? 1000 : 100, kind: v ? 'glyph' : 'label' }; },
  setHov(b, ctx, via, force) {
    if (b === this.hov && !force) return;
    this.hov = b;
    if (b < 0) { this.tag.hidden = true; tryf(() => ctx.audio.tick(null)); if (!this.run) this.weigh(ctx, -1); return; }
    const [x, y, w, hh] = this.barRect(b), v = b >= NB ? 1 : 0, cx = x + w / 2, cy = v ? y + hh : y;
    tryf(() => ctx.audio.tick('wh:' + b, Object.assign({ x: cx, y: cy, force: !!force }, this.hoverVoice('wh:' + b))));
    if (!this.run) this.weigh(ctx, b);
    const R = this.R(), k = b % NB, t = this.tag; t.textContent = '';
    t.append(el('b', '', WHO[v] + ' · ' + this.binTxt(k)), el('span', '', fmt((v ? R.machine_hist : R.hand_hist)[k]) + ' of ' + fmt(v ? R.machine_runs : R.hand_runs) + ' runs · ' + RUL[this.r] + ' reading'));
    if (this.med(v) === k) t.append(el('span', '', 'the median run lands here'));
    t.hidden = false;
    /* beside the bar's end, on whichever side keeps it off the hud and inside the stage */
    const s = this.st, tw = Math.min(t.offsetWidth || 250, s.w - 16), th = t.offsetHeight || 52, hr = this.hud.getBoundingClientRect(), G = this.g;
    const cl = (a, lo, hi) => Math.max(lo, Math.min(hi, a)), X = (l) => cl(l, s.x + 4, s.x + s.w - tw - 4), Y = (u) => cl(u, s.y + 2, s.y + s.h - th - 2);
    const cand = [[X(cx + 12), Y(v ? cy + 8 : cy - th - 8)], [X(x + w + 10), Y(v ? G.yh + GAP : G.yh - GAP - th)], [X(x - tw - 10), Y(v ? G.yh + GAP : G.yh - GAP - th)], [X(cx + 12), Y(v ? G.yh - GAP - th : G.yh + GAP)]];
    const hit = (p) => p[0] < hr.right && p[0] + tw > hr.left && p[1] < hr.bottom && p[1] + th > hr.top;
    const pos = cand.find((p) => !hit(p)) || cand[0];
    t.style.left = Math.round(pos[0]) + 'px'; t.style.top = Math.round(pos[1]) + 'px';
  },
  kbTo(b) {
    const kb = this.kbEl, o = kb.children;
    if (this.kb >= 0 && o[this.kb]) o[this.kb].setAttribute('aria-selected', 'false');
    this.kb = b; o[b].setAttribute('aria-selected', 'true'); kb.setAttribute('aria-activedescendant', o[b].id);
    this.setHov(b, this.ctx, null, true);
  },
  key(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    let b = this.kb < 0 ? 0 : this.kb; const v = b >= NB ? NB : 0, k = b - v;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); this.stopDemo(); if (e.key === ' ') this.phrase(this.ctx); else this.setHov(b, this.ctx, null, true); return; }
    if (e.key === 'ArrowRight') b = v + Math.min(NB - 1, k + 1);
    else if (e.key === 'ArrowLeft') b = v + Math.max(0, k - 1);
    else if (e.key === 'ArrowUp') b = k;
    else if (e.key === 'ArrowDown') b = NB + k;
    else if (e.key === 'Home') b = v;
    else if (e.key === 'End') b = v + NB - 1;
    else return;
    e.preventDefault(); e.stopPropagation(); this.stopDemo(); this.kbTo(b);
  },
  gestures(ctx) {
    const at = (p, via, force) => { this.ptr = p.type || via; if (this.ready) this.setHov(this.barAt(p.sx, p.sy), ctx, via, force); };
    return {
      hover: (p) => at(p, 'mouse'),
      /* a lifted finger also "leaves": on touch the bar stays lit until the next press */
      leave: () => { if (this.ready && this.ptr === 'mouse') this.setHov(-1, ctx); },
      tap: (p) => { this.stopDemo(); at(p, p.type === 'mouse' ? 'mouse' : 'touch', true); },
      hold: { delay: 160, press: (p) => { this.stopDemo(); at(p, 'touch', true); }, start() {}, move: (p) => at(p, 'touch'), end() {} },
      /* a drag across the skylines plays them like strings */
      drag: { start: (p) => { this.stopDemo(); at(p, 'touch'); }, move: (p) => at(p, 'touch'), end() {} },
      dbl: false, wheel: false,
      cursor: (p) => (this.ready && this.barAt(p.sx, p.sy) >= 0 ? 'pointer' : 'default'),
    };
  },
  keepout() { const r = this.hud && this.hud.getBoundingClientRect(); return r && r.width ? [{ x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 }] : []; },

  /* ------------------------------------------------------------------ the overlay: contours, axis, light */
  frame(g, t, bands, w, h, ctx) {
    if (!this.ready || !this.g) return;
    const G = this.g, now = performance.now(), c = this.cnt, run = this.run;
    if (c && c.t0) {
      const p = Math.min(1, (now - c.t0) / c.dur), e = 1 - Math.pow(1 - p, 3), v = Math.round(c.from + (c.to - c.from) * e), s = fmt(v);
      if (this.nEl.textContent !== s) this.nEl.textContent = s;
      if (p >= 1) c.t0 = 0;
    }
    let pk = -1;
    if (run) {
      const q = Math.floor((now - run.t0) / run.st);
      if (q > NB * 2) this.stopRun();
      else {
        pk = q < 0 ? -1 : q < NB ? q : q === NB ? -3 : NB + q - NB - 1;
        if (q === NB && run.k !== q) this.flash = now;
        if (run.k !== q) { run.k = q; if (pk >= 0 || q === NB) this.weigh(ctx, pk >= 0 ? pk : -1); }
      }
    }
    const hb = G.yh - GAP / 2, mb = G.yh + GAP / 2, sh = this.sh[this.r], x1 = G.x0 + G.colW * NB;
    g.save(); g.lineWidth = 1.2; g.lineJoin = 'round';
    for (let v = 0; v < 2; v++) {
      g.strokeStyle = v ? 'rgba(139,111,214,.9)' : 'rgba(33,246,188,.85)'; g.beginPath();
      for (let k = 0; k < NB; k++) {
        const x = this.bxOf(k), hh = Math.max(1.5, sh[v][k] * G.U), y = v ? mb + hh : hb - hh, y0 = v ? mb : hb;
        g.moveTo(x, y0); g.lineTo(x, y); g.lineTo(x + G.w, y); g.lineTo(x + G.w, y0);
      }
      g.stroke();
    }
    const fl = Math.max(0, 1 - (now - this.flash) / 420);
    g.strokeStyle = 'rgba(134,203,254,' + (0.22 + fl * 0.7) + ')'; g.lineWidth = 1 + fl * 1.5;
    g.beginPath(); g.moveTo(G.x0, hb + 0.5); g.lineTo(x1, hb + 0.5); g.moveTo(G.x0, mb - 0.5); g.lineTo(x1, mb - 0.5); g.stroke();
    g.font = '600 11px ui-monospace,Menlo,monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillStyle = 'rgba(216,210,234,.86)';
    for (let k = 0; k < NB; k++) g.fillText(this.bins[k], this.bxOf(k) + G.w / 2, G.yh);
    if (G.ind) { g.textAlign = 'left'; g.fillStyle = 'rgba(216,210,234,.5)'; g.fillText('plays in a run', G.bx, G.yh); }
    const box = (b, a, lw) => { if (b < 0) return; const [x, y, ww, hh] = this.barRect(b); g.strokeStyle = 'rgba(134,203,254,' + a + ')'; g.lineWidth = lw; g.strokeRect(x - 3, y - 3, ww + 6, hh + 6); };
    box(pk, 0.95, 2); if (this.hov !== pk) box(this.hov, 0.9, 1.6);
    g.restore();
  },

  demo(ctx) {
    if (!this.ready) return;
    this.stopDemo();
    const T = this.demoT = [], at = (ms, f) => T.push(setTimeout(() => { if (this.on) f(); }, ms));
    at(400, () => this.phrase(ctx));
    at(4600, () => this.setRuler(1, true));
    at(9200, () => this.setRuler(0, true));
  },
  stopDemo() { if (this.demoT) { this.demoT.forEach(clearTimeout); this.demoT = null; } },

  state() {
    return { ready: this.ready, view: this.view, ruler: RUL[this.r], shown: this.nEl && this.nEl.textContent, hov: this.hov, lit: this.lit, run: !!this.run,
      paren: this.legP && this.legP.textContent.trim(), g: this.g && { x0: this.g.x0, colW: this.g.colW, w: this.g.w, yh: this.g.yh, U: this.g.U, top: this.g.top, bot: this.g.bot } };
  },
};
