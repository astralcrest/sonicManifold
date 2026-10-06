/* listeners · the hundred · HEAR THE INDEX (R6 SOUND, move 4). two held tones: autoplay on the key floor's lowest tone at
   or above D3, my picks at that frequency times the bridge index (the ratio is the interval: 1.00 = one clean note).
   two fainter tones at x1.03 and x1.08 hold the range's slowest and fastest beat against autoplay, (r - 1) * f Hz.
   sounds only while the control is hovered, held or toggled from the keyboard; never before a gesture, never muted;
   every gain node <= 0.016, the four together <= 0.038. no motion: the explaining line only shows and hides. */
const COND = '1.05 [1.03, 1.08], a direction, not a size: how the untagged jumps are handled moves it 1.00 to 1.13; the loosest or 50-play definitions read 1.01.';
const SAY = 'two held notes. the steady one is autoplay; mine sits higher by the bridge index, so the pair beats. at 1.00 you would hear one clean note. two fainter notes hold the slowest and fastest beat the range allows. the index: ';
const LO = 1.03, HI = 1.08, D3 = 146.83, VM = 0.015, VG = 0.004, KEEP = 6000, CAP = 20000;
const S = 'html.atlas section[data-room="listeners"] ';
const CSS = [
  '.hd-hear{touch-action:manipulation;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}',
  '.hd-hear[aria-pressed="true"]{border-color:var(--ice);background:rgba(134,203,254,.14)}',
  '.hd-ear{position:absolute;z-index:2;margin:0;font:400 11px/1.45 var(--mono);color:var(--ink);background:rgba(10,1,24,.9);border:1px solid rgba(134,203,254,.35);border-radius:6px;padding:7px 10px;pointer-events:none}',
  '.hd-ear[hidden]{display:none}',
  '.hd-ear b{font-weight:400;color:var(--ice)}',
  '.hd.nr .hd-ear{font-size:10.5px}',
  '.hd.nr .hd-play{order:-1}',
  '.hd.nr .hd-r{flex:1 1 100%}',
  '.hd.bs .hd-play{padding:0 10px;gap:5px;letter-spacing:.06em}',
].map((r) => S + r).join('\n') + '\n@media (forced-colors:active){' + S + '.hd-ear{border:1px solid CanvasText}}\n@media print{' + S + '.hd-hear,' + S + '.hd-ear{display:none}}';

export default function hear(H, ctx) {
  if (H.hear || !H.foot) return;
  const D = document, A = ctx.audio, el = (t, c, x) => { const e = D.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  D.head.appendChild(el('style')).textContent = CSS;
  const fx = H.L.d.full_transition_crossing, BI = fx.tap / fx.auto;
  const b = el('button', 'hd-play hd-hear'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
  const g = b.appendChild(el('span', '', '∿')); g.setAttribute('aria-hidden', 'true'); const bt = b.appendChild(el('span', '', 'hear the index')); b.setAttribute('aria-label', 'hear the index');
  const ln = el('p', 'hd-ear'); ln.id = 'hd-ear'; ln.hidden = true; ln.append(SAY, el('b', '', COND));
  b.setAttribute('aria-describedby', 'hd-ear');
  const r = H.foot.querySelector('.hd-r'); H.foot.insertBefore(b, r ? r.nextSibling : null); H.root.appendChild(ln);

  /* want: 0 none, 'm' mouse hover, 't' touch hold, 'k' a keyboard (or quick-tap) toggle that runs until KEEP */
  const st = { want: 0, live: null, peak: 0, made: 0, gest: 0 };
  let poll = 0, keepT = 0, capT = 0, downT = 0;
  const can = () => !!(A && A.ac && A.on && !A.muted && A.sfx && A.ac.state === 'running');
  function floorHz() {
    let rel = 0; try { const p = A.pitches().map((c) => (c - 2 + 12) % 12).sort((x, y) => x - y); rel = p.length ? p[0] : 0; } catch (e) {}
    return D3 * Math.pow(2, rel / 12);
  }
  function start() {
    if (st.live || !can()) return;
    const ac = A.ac, t = ac.currentTime + 0.02, f = floorHz(), nodes = [];
    const voice = (hz, vol, at, rise, pan) => {
      const o = ac.createOscillator(), gn = ac.createGain(); o.type = 'triangle'; o.frequency.value = hz;
      gn.gain.setValueAtTime(0, t); gn.gain.setValueAtTime(0, at); gn.gain.linearRampToValueAtTime(vol, at + rise);
      o.connect(gn); let out = gn;
      if (typeof ac.createStereoPanner === 'function') { const p = ac.createStereoPanner(); p.pan.value = pan; gn.connect(p); out = p; }
      out.connect(A.sfx); o.start(t); nodes.push({ o, g: gn, out, f: hz, vol });
      st.peak = Math.max(st.peak, vol);
    };
    /* autoplay first, alone, so the clean note is heard before mine comes in and the beating starts */
    voice(f, VM, t, 0.35, 0.35);
    voice(f * BI, VM, t + 0.6, 0.5, -0.35);
    voice(f * LO, VG, t + 0.6, 0.8, -0.35);
    voice(f * HI, VG, t + 0.6, 0.8, -0.35);
    st.live = { nodes, f, t0: performance.now() }; st.made++;
    clearTimeout(capT); capT = setTimeout(() => off(), CAP);
  }
  function stop() {
    const L = st.live; if (!L) return; st.live = null;
    try {
      const t = A.ac.currentTime;
      L.nodes.forEach((n) => { const p = n.g.gain; p.cancelScheduledValues(t); p.setValueAtTime(p.value, t); p.linearRampToValueAtTime(0, t + 0.25); n.o.stop(t + 0.3); });
    } catch (e) {}
    setTimeout(() => L.nodes.forEach((n) => { try { n.o.disconnect(); n.g.disconnect(); n.out.disconnect(); } catch (e) {} }), 450);
  }
  function place() {
    const s = ctx.stage(), fr = H.foot.getBoundingClientRect(), w = Math.min(fr.width, s.w - 16, 560);
    ln.style.width = w + 'px'; ln.style.left = Math.round(Math.max(s.x + 8, fr.left + (fr.width - w) / 2)) + 'px';
    const tg = H.L && H.L.tgPos, lim = tg && tg.offsetHeight ? tg.getBoundingClientRect().top : s.y + s.h - 56, h = ln.offsetHeight, c = H.cond.getBoundingClientRect().top - 4;
    /* over the foot's own conditions line (the line quotes the full condition), else over the grids' foot */
    ln.style.top = Math.round(lim - 8 - c >= h ? c : Math.max(s.y + 4, fr.top - h - 8)) + 'px';
  }
  function on(kind) {
    st.want = kind; b.setAttribute('aria-pressed', String(kind === 'k'));
    ln.hidden = false; place(); start();
    if (!poll) poll = setInterval(tick, 200);
  }
  function off() {
    st.want = 0; b.setAttribute('aria-pressed', 'false'); ln.hidden = true;
    clearTimeout(keepT); clearTimeout(capT); clearInterval(poll); poll = 0; stop();
  }
  /* sound turned off, the angle left, or the context arriving late (the press that unlocked it is still held) */
  function tick() {
    if (!st.want || !H.on) return off();
    if (st.live && !can()) stop(); else if (!st.live && can()) start();
  }
  b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !st.want) on('m'); });
  b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' ? st.want === 'm' : st.want === 't') off(); });
  b.addEventListener('pointerdown', (e) => { if (!e.isTrusted) return; st.gest++; if (e.pointerType !== 'mouse') { downT = performance.now(); clearTimeout(keepT); on('t'); } });
  ['pointerup', 'pointercancel'].forEach((ty) => b.addEventListener(ty, (e) => {
    if (e.pointerType === 'mouse' || st.want !== 't') return;
    /* a quick tap keeps it sounding for a few seconds (the tap is what unlocks audio on a phone); a hold ends on release */
    if (ty === 'pointerup' && performance.now() - downT < 350) { st.want = 'k'; keepT = setTimeout(off, KEEP); } else off();
  }));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('click', (e) => { if (e.detail !== 0) return; st.gest++; if (st.want === 'k') off(); else { on('k'); clearTimeout(keepT); keepT = setTimeout(off, CAP); } });
  b.addEventListener('blur', () => { if (st.want === 'k') off(); });
  D.addEventListener('visibilitychange', () => { if (D.hidden) off(); });
  const oh = H.hide, op = H.play, ol = H.layout;
  H.hide = function (c) { off(); return oh.call(this, c); };
  H.play = function (c, auto) { if (!auto) off(); return op.call(this, c, auto); };
  /* beside the grids (a phone on its side) the foot is a narrow column: the control says 'hear' so it shares PLAY's row */
  H.layout = function (c) {
    let v = ol.call(this, c); const t = this.root.classList.contains('bs') ? 'hear' : 'hear the index';
    if (bt.textContent !== t) { bt.textContent = t; v = ol.call(this, c); }
    if (!ln.hidden) place(); return v;
  };
  if (H.on) try { H.layout(ctx); } catch (e) {}
  H.hear = { btn: b, line: ln, on, off, BI, state: () => ({ want: st.want, live: !!st.live, made: st.made, gest: st.gest, peak: st.peak,
    voices: st.live ? st.live.nodes.map((n) => ({ f: n.f, vol: n.vol, g: n.g.gain.value })) : [], base: st.live ? st.live.f : null }) };
}
