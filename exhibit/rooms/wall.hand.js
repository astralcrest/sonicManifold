/* R6 ME · outside the lines: after the pour lands, a song i pressed play on by hand lifts out of the mint jar as a
   five-bar tally, one ° mark per hand play. data: exhibit/data/by_hand.json, shown[0] only (titles 2-5 wait for the
   owner's one-time review). the count is the strict tap column of exhibit/data/universe_tracks.json. never a date or an
   hour beside it. atlas-only: wall.js loads this from the pour branch of frame(), which ?atlas=0 never reaches.
   phone: the tally sits under the jars, beside the pour button. reduced motion: it is simply there, no lift. */
const MINT = '33,246,188', DT0 = 4200, FLY = 700;
const CSS = '.wall-hand{position:absolute;left:0;top:0;width:0;height:0;transform-origin:0 0;pointer-events:none;z-index:2}' +
  '.wall-hand>*{position:absolute;pointer-events:auto}' +
  '.wall-hand button{margin:0;padding:6px 0;border:0;background:none;text-align:left;font:12px/1.5 "JetBrains Mono",ui-monospace,Menlo,monospace;color:#d8d2ea;opacity:0;transition:opacity .6s ease;cursor:pointer;letter-spacing:.01em;visibility:hidden}' +
  '.wall-hand.on button{opacity:1;visibility:visible}.wall-hand.rm button{transition:none}' +
  '.wall-hand b{font-weight:600;color:#21f6bc}.wall-hand i{display:block;font-style:normal;font-size:10.5px;color:rgba(216,210,234,.62);margin-top:3px}' +
  '.wall-hand button:focus-visible{outline:1.5px solid #86cbfe;outline-offset:4px}' +
  '.wall-hand.ph button{font-size:10.5px;line-height:1.45;padding:0}.wall-hand.ph i{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
  '@media (forced-colors:active){.wall-hand b{color:CanvasText}}';
const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export default async function hand(W, ctx) {
  let d = null; try { d = await ctx.data('by_hand'); } catch (e) {}
  const r = d && d.shown && d.shown[0];
  if (!r || !(r.hand_plays > 0)) return;
  if (!W.pour || !W.live() || W.tally) { W._handP = null; return; }
  const P = ctx.particles, A = ctx.audio, red = !!ctx.reduced, N = r.hand_plays, now = () => performance.now();
  let n0 = 0; for (let i = 0; i < P.n; i++) if (P.prov[i] === 0) n0++;
  if (!document.getElementById('wall-hand-css')) { const st = document.createElement('style'); st.id = 'wall-hand-css'; st.textContent = CSS; document.head.appendChild(st); }
  const wrap = document.createElement('div'); wrap.className = 'wall-hand' + (red ? ' rm' : '');
  const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'wall-hand';
  const line = 'a song i pressed play on by hand ' + fmt(N) + ' times: ', tail = ' · ' + r.artist;
  btn.append(line); const b = document.createElement('b'); b.textContent = r.title; btn.append(b, tail);
  const note = document.createElement('i'); note.textContent = 'counted the strict way: the play button, a track’s row, a remote. how the app logged starts wasn’t constant across these years, so read this count on its own.';
  btn.appendChild(note);
  const hit = document.createElement('span'); hit.setAttribute('aria-hidden', 'true');
  wrap.append(btn, hit); wrap.hidden = true; W.root.appendChild(wrap); W.handEl = btn;
  /* the room's hover instrument: a label voice on the track's genre family, its octave from its plays */
  const voice = (e, force) => { const q = (e && e.currentTarget || btn).getBoundingClientRect(); A.tick('hand:' + r.title, { kind: 'label', fam: r.fam, plays: N, x: e && e.clientX != null ? e.clientX : q.left + q.width / 2, y: e && e.clientY != null ? e.clientY : q.top + q.height / 2, force }); };
  for (const el of [btn, hit]) { el.addEventListener('pointerenter', (e) => voice(e)); el.addEventListener('pointerleave', () => A.tick(null)); el.addEventListener('pointerdown', (e) => voice(e, true)); }
  btn.addEventListener('click', (e) => { if (e.detail === 0) voice(null, true); });
  let L0 = null, T = null, start = 0, landed = 0, path = null, pathN = -1, shown = false, tf = '';
  /* the tally's geometry, in world px, from the pour's own layout */
  const lay = (L) => {
    const s = ctx.stage(), phone = s.w < 600, fh = (n0 / (L.J * L.kx)) * L.p, mouth = L.yb - L.hJ, surf = L.yb - fh, gates = Math.ceil(N / 5);
    const under = phone && s.y + s.h - (L.yb + 64) >= 112;
    const sh = phone ? 13 : 18, sx = phone ? 4 : 6.5, gp = phone ? 22 : 33, rp = phone ? 22 : 32;
    let x0, y0, gpr, capX, capY, capW, capBot;
    if (under) {
      const xl = L.ox + 100, xr = L.ox + L.mJ * L.cw; gpr = Math.max(1, Math.min(10, Math.floor((xr - xl + 8) / gp)));
      x0 = xr - gpr * gp + 8; y0 = L.yb + 68; capX = L.ox; capY = L.yb + 64 + 52; capW = Math.min(L.mJ * L.cw, s.x + s.w - 120 - L.ox); capBot = false;
    } else {
      gpr = Math.max(1, Math.min(5, Math.floor((L.jw - 12) / gp)));
      x0 = L.xs[0] + (L.jw - (gpr * gp - 12)) / 2 + 3; y0 = mouth + (phone ? 14 : 24); capX = L.xs[0]; capY = mouth - 10; capW = L.mJ * L.cw; capBot = true;
    }
    const rows = Math.ceil(gates / gpr);
    return { phone, under, sh, sx, gp, rp, gpr, x0, y0, rows, w: gpr * gp - 12, h: (rows - 1) * rp + sh, capX, capY, capW, capBot, surf, sx0: L.xs[0], sx1: L.xs[1], jw: L.jw };
  };
  /* stroke j of the tally: four uprights then the bar across, as runs of ° marks */
  const marks = (j, out) => {
    const q = Math.floor(j / 5), m = j % 5, gx = T.x0 + (q % T.gpr) * T.gp, gy = T.y0 + Math.floor(q / T.gpr) * T.rp, st = T.phone ? 3.25 : 4.5;
    if (m < 4) { for (let y = 0; y <= T.sh + 0.01; y += st) out.push(gx + m * T.sx, gy + y); return out; }
    const ax = gx - 3, ay = gy + T.sh - 2, bx = gx + 3 * T.sx + 3, by = gy + 2, k = T.phone ? 5 : 6;
    for (let i = 0; i <= k; i++) out.push(ax + (bx - ax) * i / k, ay + (by - ay) * i / k); return out;
  };
  const home = (j) => { const p = marks(j, []), n = p.length / 2; let x = 0, y = 0; for (let i = 0; i < p.length; i += 2) { x += p[i]; y += p[i + 1]; } return [x / n, y / n]; };
  const place = () => {
    const ws = wrap.style, cs = btn.style, hs = hit.style;
    wrap.classList.toggle('ph', T.phone);
    cs.left = T.capX + 'px'; cs.width = T.capW + 'px';
    if (T.capBot) { cs.top = ''; cs.bottom = -T.capY + 'px'; } else { cs.bottom = ''; cs.top = T.capY + 'px'; }
    hs.left = T.x0 - 6 + 'px'; hs.top = T.y0 - 6 + 'px'; hs.width = T.w + 12 + 'px'; hs.height = T.h + 12 + 'px';
    ws.transform = tf = '';
  };
  const reset = () => { start = 0; landed = 0; path = null; pathN = -1; shown = false; wrap.hidden = true; wrap.classList.remove('on'); };
  const S = {
    el: btn, wrap,
    st: () => ({ N, landed, shown, start: !!start, phone: !!(T && T.phone), under: !!(T && T.under), text: btn.textContent, box: T && { x0: T.x0, y0: T.y0, w: T.w, h: T.h, rows: T.rows, gpr: T.gpr } }),
    voice: () => ({ kind: 'label', fam: r.fam, plays: N }),
    stop() { if (W.tally !== S) return; W.tally = null; W._handP = null; W.handEl = null; A.tick(null); wrap.remove(); },
    draw(g, k) {
      const pst = W.pour && W.pour.st(); if (!pst || !pst.L) return;
      if (pst.L !== L0) { L0 = pst.L; T = lay(L0); place(); path = null; pathN = -1; }
      if (pst.ph < 2) { if (start) reset(); return; }
      const t = now();
      if (!start) { start = t + (red ? -1e6 : 500); wrap.hidden = false; if (red) { A.note(5, { dur: 1.2, vol: 0.012 }); A.note(8, { at: 0.03, dur: 1.2, vol: 0.01 }); } }
      const dt = Math.min(60, DT0 / N);
      const nl = Math.max(0, Math.min(N, Math.floor((t - start - FLY) / dt) + 1));
      if (nl > landed && !red) for (let j = landed; j < nl; j++) if (j % 5 === 4 || j === N - 1) A.note(8 + (Math.floor(j / 5) % 3), { dur: 0.09, vol: 0.009 });
      landed = nl;
      if (landed !== pathN) { pathN = landed; path = new Path2D(); const pts = []; for (let j = 0; j < landed; j++) marks(j, pts); const rr = T.phone ? 0.95 : 1.3; for (let i = 0; i < pts.length; i += 2) { path.moveTo(pts[i] + rr, pts[i + 1]); path.arc(pts[i], pts[i + 1], rr, 0, 6.2832); } }
      g.save(); g.strokeStyle = 'rgba(' + MINT + ',.92)'; g.lineWidth = T.phone ? 0.75 : 0.9; g.stroke(path);
      /* the grains in flight: up from the mint surface to their stroke */
      if (landed < N) {
        g.fillStyle = 'rgba(' + MINT + ',.85)';
        for (let j = landed; j < N; j++) {
          const u = (t - start - j * dt) / FLY; if (u <= 0) break;
          const e = 1 - Math.pow(1 - Math.min(1, u), 3), h = home(j), fx = T.sx0 + T.jw * (0.12 + 0.76 * ((j * 0.618) % 1)), fy = T.surf - 2;
          let gx = fx + (h[0] - fx) * e, gy = fy + (h[1] - fy) * e - Math.sin(Math.PI * e) * 18;
          /* under the jars the straight arc crosses their count and name labels: drop down the gap between jar 1 and 2 instead */
          if (T.under) {
            const cx = (T.sx0 + T.jw + T.sx1) / 2, q = [[fx, fy], [cx, fy - 6], [cx, h[1]], h], c = [0];
            for (let i = 1; i < 4; i++) c.push(c[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
            let k = 1; const dd = e * c[3]; while (k < 3 && dd > c[k]) k++;
            const f = (dd - c[k - 1]) / (c[k] - c[k - 1] || 1); gx = q[k - 1][0] + (q[k][0] - q[k - 1][0]) * f; gy = q[k - 1][1] + (q[k][1] - q[k - 1][1]) * f;
          }
          g.beginPath(); g.arc(gx, gy, 1.6, 0, 6.2832); g.fill();
        }
      }
      g.restore();
      if (landed >= N && !shown) { shown = true; wrap.classList.add('on'); }
      /* the caption rides the camera with the jars */
      const z = (ctx.view && ctx.view.z) || 1, a = ctx.view && ctx.view.apply ? ctx.view.apply(0, 0) : [0, 0];
      const s2 = 'translate(' + a[0].toFixed(1) + 'px,' + a[1].toFixed(1) + 'px)' + (Math.abs(z - 1) > 1e-3 ? ' scale(' + z.toFixed(4) + ')' : '');
      if (s2 !== tf) { tf = s2; wrap.style.transform = s2; }
    },
  };
  W.tally = S;
}
