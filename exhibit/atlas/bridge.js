/* draw a bridge: hold a star name, tap a second; no pair number */
const RM = matchMedia('(prefers-reduced-motion: reduce)'), FC = matchMedia('(forced-colors: active)');
const HOLD = 400, LIFE = 6000, TRAVEL = 1600, MAXA = 3, MINT = '#8ff0c8';
const L2 = 'across the whole log, jumps across families read 1.05, likely 1.03 to 1.08: a direction, not a size';
const CSS = '#bridge-cv{position:fixed;inset:0;width:100vw;height:100vh;z-index:5;pointer-events:none}' +
  '.bridge-cap{position:fixed;left:0;top:0;z-index:5;margin:0;max-width:min(330px,92vw);text-align:center;pointer-events:none;color:var(--ink,#eaf6ff);padding:6px 10px;border-radius:4px;background:rgba(10,1,24,.78);opacity:0;transition:opacity .5s}' +
  '.bridge-cap.on{opacity:1}.bridge-cap span{display:block}' +
  '.bridge-cap .bl2{margin-top:4px;font:500 10px/1.4 var(--mono,monospace);color:var(--mute,#b9c4d6)}' +
  '@media (forced-colors:active){.bridge-cap,.bridge-cap .bl2{color:CanvasText;background:Canvas}}';

let inst = null;
export default function mount(ctx) {
  if (inst) return inst;
  ctx = ctx || window.__exhibit.ctx;
  const doc = document, cv = doc.createElement('canvas'), g = cv.getContext('2d'), st = doc.createElement('style');
  st.textContent = CSS; doc.head.appendChild(st);
  cv.id = 'bridge-cv'; cv.setAttribute('aria-hidden', 'true'); cv.hidden = true; doc.body.appendChild(cv);
  const arcs = []; let armed = null, armT = 0, press = null, unF = null, frames = 0, cost = 0, vw = 0, vh = 0, dead = false;

  const room = () => { try { const r = ctx.atlas.deps.rooms[ctx.index]; return r.id === 'universe' ? r : null; } catch (e) { return null; } };
  const US = () => { const r = room(), s = r && r.mod && r.mod._S; return s && s.R ? s : null; };
  function idxOf(x, y) {
    const S = US(); if (!S) return -1; let t, b = 1e9;
    doc.querySelectorAll('#atlas-labels .lab.obj.on:not(.static)').forEach((el) => { const r = el.getBoundingClientRect(); const d = Math.hypot(x - r.left - r.width / 2, y - r.top - r.height / 2); if (x > r.left - 6 && x < r.right + 6 && y > r.top - 6 && y < r.bottom + 6 && d < b) { t = el; b = d; } });
    const i = t ? S.R.names.indexOf(t.textContent.split(' \u00b7 ')[0]) : -1;
    return i < S.R.nA ? i : -1;
  }
  function star(i) {
    const S = US(), R = S && S.R; if (!R) return null;
    const x = S.sx[i], y = S.sy[i]; if (!(x === x) || !(y === y)) return null;
    const v = room().mod.hoverVoice('s' + i, 'universe') || {};
    return { i, x, y, name: R.names[i], fam: v.fam || 'untagged', plays: v.plays };
  }
  const live = () => arcs.length > 0 || !!armed;
  function size() {
    vw = innerWidth; vh = innerHeight; const d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(vw * d); cv.height = Math.round(vh * d); g.setTransform(d, 0, 0, d, 0, 0);
  }
  const sub = () => { if (!unF) { cv.hidden = false; size(); unF = ctx.onFrame(frame); } };
  function idle() {
    if (live() || !unF) return;
    unF(); unF = null; g.clearRect(0, 0, vw, vh); cv.hidden = true;
  }
  function killArc(a) { clearTimeout(a.t2); a.cap.remove(); arcs.splice(arcs.indexOf(a), 1); }
  const clearAll = () => { while (arcs.length) killArc(arcs[0]); armed = null; clearTimeout(armT); idle(); };
  const voice = (s) => { try { ctx.audio.tick('universe:s' + s.i, { kind: 'label', fam: s.fam, plays: s.plays, x: s.x, y: s.y, force: true }); } catch (e) {} };

  function make(a, b) {
    while (arcs.length >= MAXA) killArc(arcs[0]);
    const same = a.fam === b.fam, cap = doc.createElement('p');
    cap.className = 'ai-voice-p bridge-cap'; cap.setAttribute('role', 'status');
    const l1 = doc.createElement('span'), l2 = doc.createElement('span');
    l1.textContent = 'a bridge: ' + a.name + ' (' + a.fam + ') to ' + b.name + ' (' + b.fam + ') · ' + (same ? 'same family' : 'across families');
    l2.className = 'bl2'; l2.textContent = L2; cap.append(l1, l2); doc.body.appendChild(cap);
    const o = { a: a.i, b: b.i, an: a.name, bn: b.name, af: a.fam, bf: b.fam, same, t0: performance.now(), cap, w: cap.offsetWidth, h: cap.offsetHeight, ax: a.x, ay: a.y, bx: b.x, by: b.y, t2: 0 };
    arcs.push(o); sub();
    requestAnimationFrame(() => cap.classList.add('on'));
    if (!RM.matches) { voice(a); o.t2 = setTimeout(() => { const s = star(b.i); if (s && arcs.includes(o)) voice(s); }, 800); }
  }
  function ctl(o) {
    const dx = o.bx - o.ax, dy = o.by - o.ay, L = Math.hypot(dx, dy) || 1, f = dx > 0 ? 1 : -1, nx = f * dy / L, ny = -f * dx / L;
    return [(o.ax + o.bx) / 2 + nx * 0.22 * L, (o.ay + o.by) / 2 + ny * 0.22 * L];
  }
  const bz = (o, c, t) => { const u = 1 - t; return [u * u * o.ax + 2 * u * t * c[0] + t * t * o.bx, u * u * o.ay + 2 * u * t * c[1] + t * t * o.by]; };

  function frame(t) {
    const t0 = performance.now(); frames++;
    g.clearRect(0, 0, vw, vh);
    const fc = FC.matches, col = fc ? 'CanvasText' : MINT;
    if (armed) {
      const s = star(armed.i);
      if (s) { const w = RM.matches ? 0 : Math.sin(t / 220); g.strokeStyle = col; g.lineWidth = 1.2; g.globalAlpha = 0.6 + 0.3 * w; g.beginPath(); g.arc(s.x, s.y, 13 + 2 * w, 0, 6.283); g.stroke(); g.globalAlpha = 1; }
    }
    for (let k = arcs.length - 1; k >= 0; k--) {
      const o = arcs[k], age = t0 - o.t0;
      if (age > LIFE) { killArc(o); continue; }
      const A = star(o.a), B = star(o.b); if (A && B) { o.ax = A.x; o.ay = A.y; o.bx = B.x; o.by = B.y; }
      const c = ctl(o), p = RM.matches ? 1 : Math.min(1, age / TRAVEL), e = p * p * (3 - 2 * p);
      const fade = age > LIFE - 700 ? (LIFE - age) / 700 : 1, N = 28, m = Math.max(1, Math.round(N * e));
      g.strokeStyle = col; g.lineCap = 'round';
      for (let pass = fc ? 1 : 0; pass < 2; pass++) {
        g.lineWidth = pass ? 1.6 : 7; g.globalAlpha = fade * (pass ? 0.95 : 0.2);
        g.beginPath(); for (let i = 0; i <= m; i++) { const q = bz(o, c, i / N); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke();
      }
      g.globalAlpha = fade; g.fillStyle = col;
      for (const [x, y] of [[o.ax, o.ay], [o.bx, o.by]]) { g.beginPath(); g.arc(x, y, 2.6, 0, 6.283); g.fill(); }
      if (!RM.matches && p < 1) { const q = bz(o, c, e); g.globalAlpha = 0.28; g.beginPath(); g.arc(q[0], q[1], 9, 0, 6.283); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(q[0], q[1], 3.6, 0, 6.283); g.fill(); }
      const m2 = bz(o, c, 0.5), x = Math.max(12, Math.min(vw - o.w - 12, m2[0] - o.w / 2)), y = Math.max(8, Math.min(vh - o.h - 8, m2[1] + 14));
      o.cap.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';
    }
    cost += performance.now() - t0; if (!live()) idle();
  }

  function onDown(e) {
    if (!room()) return;
    if (press && e.pointerId !== press.id) { clearTimeout(press.t); press = null; return; }
    const i = idxOf(e.clientX, e.clientY), id = e.pointerId;
    press = { id, i, x: e.clientX, y: e.clientY, t: 0, at: performance.now(), held: false };
    if (i >= 0) press.t = setTimeout(() => {
      if (!press || press.id !== id) return;
      press.held = true; const s = star(i); if (!s) return;
      armed = { i }; sub(); clearTimeout(armT); armT = setTimeout(() => { armed = null; idle(); }, 10000);
    }, HOLD);
  }
  function onMove(e) { if (press && e.pointerId === press.id && !press.held && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) { clearTimeout(press.t); press.i = -2; } }
  function onUp(e) {
    const p = press; if (!p || e.pointerId !== p.id) return; press = null; clearTimeout(p.t);
    if (p.held || p.i === -2 || e.type === 'pointercancel') return;
    if (performance.now() - p.at > 450 || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) return;
    if (armed && p.i >= 0 && p.i !== armed.i) { const a = star(armed.i), b = star(p.i); armed = null; clearTimeout(armT); if (a && b) make(a, b); else idle(); return; }
    if (p.i < 0) clearAll(); /* a tap elsewhere ends the arcs */
    else if (armed) { armed = null; idle(); }
  }
  const onKey = (e) => { if (e.key === 'Escape' && live()) clearAll(); };
  const H = { pointerdown: onDown, pointermove: onMove, pointerup: onUp, pointercancel: onUp, keydown: onKey };
  for (const k in H) doc.addEventListener(k, H[k], { capture: true, passive: true });
  addEventListener('resize', size, { passive: true });
  const offStop = ctx.onStop ? ctx.onStop(() => clearAll()) : null;

  return (inst = {
    unmount() {
      if (dead) return; dead = true; inst = null; clearAll(); if (press) clearTimeout(press.t);
      for (const k in H) doc.removeEventListener(k, H[k], true);
      removeEventListener('resize', size); if (offStop) offStop(); cv.remove(); st.remove();
    },
    stats() {
      return {
        subscribed: !!unF, armed: armed && armed.i, frames, costMs: cost / (frames || 1),
        bead: arcs.some((o) => !RM.matches && performance.now() - o.t0 < TRAVEL),
        arcs: arcs.map((o) => ({ a: o.an, b: o.bn, aFam: o.af, bFam: o.bf, same: o.same, ax: o.ax, ay: o.ay, bx: o.bx, by: o.by })),
      };
    },
  });
}
