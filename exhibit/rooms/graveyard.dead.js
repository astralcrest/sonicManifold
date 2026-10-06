/* graveyard · KILLED VERDICTS SOUND DEAD (R6 SOUND, move 6). atlas only (loaded from graveyard.js mount when atlas is on).
   killed titles are struck through: the graves' names, the sixteen in the list, a claim once its run has buried it, and
   `mine` over a kill. hover, focus or a press on a killed name shows its verdict, word for word from killit.json (the text
   after a buried title's colon; a run's own `x`); nothing here writes a verdict. opening a grave plays one damped dead
   note: the key floor's lowest tone at or above D3, triangle under a closing low-pass, gone in 0.4 s, <= 0.03 + 0.008. */
const HEAD = "sixteen B-sides that didn't make the record";
const S = 'html.atlas section[data-room=graveyard] ';
const CSS = [
  'html.atlas.gy-on #atlas-labels .lab.obj{text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:rgba(232,224,255,.6)}',
  'html.atlas.gy-on #atlas-labels .lab.obj::before,html.atlas.gy-on #atlas-labels .lab.obj::after{display:inline-block;white-space:pre}',
  'html.atlas.gy-on.gy-s #atlas-labels .lab.obj{text-decoration:none}',
  S + '.gv-sixteen-list::before{content:"' + HEAD + '";grid-column:1/-1;font:600 10.5px/1.4 var(--mono);letter-spacing:.08em;color:var(--ice)}',
  S + '.gv-sixteen-list li s{text-decoration-thickness:1px;color:var(--ink)}',
  S + '.gv-card.gy-k>span:first-child{text-decoration:line-through;text-decoration-thickness:1px}',
  '.gy-tip{position:fixed;z-index:4;max-width:280px;margin:0;font:400 10.5px/1.4 var(--mono);color:var(--ink);background:rgba(10,1,24,.9);border:1px solid rgba(134,203,254,.35);border-radius:6px;padding:5px 8px;pointer-events:none}',
  '.gy-tip[hidden]{display:none}',
  '.gy-tip b{font-weight:600;color:var(--mute)}',
  '@media (forced-colors:active){.gy-tip{border:1px solid CanvasText}}',
  '@media print{.gy-tip{display:none}}',
].join('\n');

export default function dead(M, ctx) {
  if (M.dead) return;
  const D = document, html = D.documentElement, A = ctx.audio;
  D.head.appendChild(D.createElement('style')).textContent = CSS;
  const verdictOf = (t) => { const k = String(t).indexOf(':'); return k > 0 ? String(t).slice(k + 1).trim() : ''; };

  /* the sixteen: the finding struck, its verdict standing; textContent is unchanged, so search's match still holds */
  [].forEach.call(M.sxList.children, (li) => {
    const t = li.textContent, k = t.indexOf(':'); if (k <= 0) return;
    const s = D.createElement('s'); s.textContent = t.slice(0, k); li.textContent = ''; li.append(s, t.slice(k));
  });
  M.sxList.setAttribute('aria-label', HEAD + ': each killed finding with its verdict');
  if (M.sxBtn) M.sxBtn.textContent = 'the sixteen B-sides';

  /* the verdict on hover / focus / press, under the name */
  const tip = D.createElement('p'); tip.className = 'gy-tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  D.body.appendChild(tip);
  let tipT = 0;
  const hide = () => { clearTimeout(tipT); tip.hidden = true; };
  function show(item, info) {
    let v = '';
    const m = /^g(\d+)$/.exec(item.id);
    if (m) { const g = M.graves.find((x) => x.i === +m[1]); v = g ? verdictOf(g.title) : ''; }
    else if (item.id === 'mine' && M.state === 'settled') { const c = M.cases[M.curCase]; if (c && c.v === 'k') v = c.x; }
    if (!v) return hide();
    tip.textContent = ''; const b = D.createElement('b'); b.textContent = 'killed · '; tip.append(b, v);
    tip.hidden = false;
    const r = info.el ? info.el.getBoundingClientRect() : { left: info.sx, right: info.sx, top: info.sy, bottom: info.sy };
    const w = tip.offsetWidth, h = tip.offsetHeight, x = Math.max(8, Math.min(innerWidth - w - 8, (r.left + r.right) / 2 - w / 2));
    tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(r.bottom + 6 + h < innerHeight - 8 ? r.bottom + 6 : r.top - h - 6) + 'px';
    clearTimeout(tipT); if (info.via === 'touch' || info.via === 'lock') tipT = setTimeout(hide, 2600);
  }
  const hook = (on, item, info) => { if (on) show(item, info); else hide(); };
  try { ctx.labels.onHover('graveyard', hook); ctx.labels.onFocus('graveyard', hook); } catch (e) {}

  /* one damped dead note when a grave is opened */
  let lastT = 0;
  function thud(x) {
    if (!A || !A.ac || !A.on || A.muted || !A.sfx || A.ac.state !== 'running') return;
    const now = performance.now(); if (now - lastT < 300) return; lastT = now;
    try {
      let rel = 0; try { const p = A.pitches().map((c) => (c - 2 + 12) % 12).sort((a, b) => a - b); rel = p.length ? p[0] : 0; } catch (e) {}
      const ac = A.ac, t = ac.currentTime + 0.01, f = 146.83 * Math.pow(2, rel / 12);
      const o = ac.createOscillator(), s = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(), gs = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f; s.type = 'sine'; s.frequency.value = f / 2;
      lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(160, t + 0.25);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      gs.gain.setValueAtTime(0, t); gs.gain.linearRampToValueAtTime(0.008, t + 0.006); gs.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(lp); lp.connect(g); s.connect(gs);
      let out = ac.createGain(); out.gain.value = 1; g.connect(out); gs.connect(out);
      if (x != null && isFinite(x) && typeof ac.createStereoPanner === 'function') { const p = ac.createStereoPanner(); p.pan.value = Math.max(-0.5, Math.min(0.5, (x / (innerWidth || 1)) - 0.5)); out.connect(p); out = p; }
      out.connect(A.sfx); o.start(t); s.start(t); o.stop(t + 0.45); s.stop(t + 0.35);
      M.dead.notes.push({ f, t: now, peak: 0.03 + 0.008 });
    } catch (e) {}
  }

  const sync = () => html.classList.toggle('gy-on', !!M.active());
  const oe = M.enter, ol = M.leave, os = M.settle, oa = M.again, of = M.focusGrave;
  M.enter = function (c) { const r = oe.apply(this, arguments); html.classList.add('gy-on'); return r; };
  M.leave = function (c) { html.classList.remove('gy-on', 'gy-s'); hide(); return ol.apply(this, arguments); };
  M.settle = function (c) {
    const r = os.apply(this, arguments), cs = this.cases[this.curCase], k = !!cs && cs.v === 'k';
    html.classList.toggle('gy-s', !!cs && !k);
    if (k) { const b = this.cd.querySelectorAll('button')[this.curCase]; if (b) b.classList.add('gy-k'); }
    return r;
  };
  M.again = function () { html.classList.remove('gy-s'); return oa.apply(this, arguments); };
  M.focusGrave = function (g) { const r = of.apply(this, arguments); thud(null); return r; };
  M.dead = { notes: [], tip, thud, head: HEAD };
  sync();
}
