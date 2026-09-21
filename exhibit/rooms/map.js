/* room 3 — the map that lied. every particle flies to its artist's position in a retrained
   embedding; a seven-detent dial swaps which retraining (12% -> 100% algorithmic training data).
   particles keep their room-1 provenance colour, so the map arrives already telling the tapped/
   served story. four of my most-played artists are ringed and named and keep their colour at full
   strength, so the visitor can watch a named thing travel while its plays never change: the churn
   is the instrument moving, not the listening. a second view re-targets a deterministic 15% of the
   dots into seven columns — the dose-response curve itself, with a parity line at 1.00.
   track latent-dimension.mp3 is the exhibit's one deliberate key break (10A -> 5B):
   the room where the ruler bends is the room where the music goes out of key. do not fix that. */

const CAP = [
  'trained almost entirely on my own picks. the advantage vanishes.',
  'still mostly my own picks.',
  'the balanced, corrected map.',
  'past the midpoint, more queue than me.',
  'close to a fully served log.',
  'about what an embedding trained on my raw log sees.',
  'algorithm only.',
];
/* 1.61 is the withdrawn embedding-based reading, from researcher.html / index.html ("the finding,
   with its whole history"); it is the sentence the room is built to say out loud. */
const NEG = 'this is the map my first number was measured on. it read 1.61. the map itself inflated it, so i withdrew it.';
const CURVE_CAP = 'each column is one of the seven maps. the more of the training diet the algorithm chose, the higher the number came out.';
const CURVE_CAP_S = 'each column is one of the seven maps. the more the algorithm chose, the higher it read.';
const CURVE_SUB = 'the line at 1.00 is no difference at all.';

const SIGMA = 0.012, TAU = 6.283185307;
const AXMAX = 1.5;      /* columns are drawn from zero, so 1.00 sits two thirds of the way up */
const NPIN = 4, TRN = 14, TRSTEP = 4; /* held artists, ghost-trail length, frames between samples */
const F0 = 146.83;      /* D3. the drone is two sines this far apart, at most 31 cents */
const GV = 0.015;       /* per voice: two voices, 0.03 total, the ceiling the sound brief sets */

const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const mixc = (a, b, k) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  return ((((ar + (((b >> 16) & 255) - ar) * k) | 0) << 16) | (((ag + (((b >> 8) & 255) - ag) * k) | 0) << 8) | (((ab + ((b & 255) - ab) * k) | 0))) >>> 0;
};

{
  const st = document.createElement('style');
  st.textContent = 'section[data-room="map"] .mapwrap{position:absolute;display:flex;flex-direction:column;justify-content:space-between}' +
    'section[data-room="map"] .mhud{pointer-events:none}' +
    'section[data-room="map"] .mbig{font:600 clamp(30px,6.4vw,52px)/1 var(--mono);letter-spacing:-.02em;color:var(--ink)}' +
    'section[data-room="map"] .munit{font:600 12px/1 var(--mono);letter-spacing:.08em;color:var(--mute);margin-left:6px}' +
    'section[data-room="map"] .mline{margin:8px 0 10px;max-width:26rem}' +
    'section[data-room="map"] .mrow{display:flex;gap:8px;align-items:baseline;font:600 12px/1 var(--mono);letter-spacing:.06em;color:var(--mute);margin-bottom:4px}' +
    'section[data-room="map"] .mbi{color:var(--ink);font-size:15px}' +
    'section[data-room="map"] .manch{margin:0 0 9px;font:400 10.5px/1.4 var(--mono);color:var(--mute);opacity:.85}' +
    'section[data-room="map"] .mcross{display:flex;flex-direction:column;gap:6px;max-width:250px}' +
    'section[data-room="map"] .mcrow{display:flex;align-items:center;gap:8px;font:600 11px/1 var(--mono);color:var(--mute)}' +
    'section[data-room="map"] .mclbl{width:58px;flex:none}' +
    'section[data-room="map"] .mbar{flex:1;height:6px;border-radius:3px;background:rgba(189,166,255,.14);overflow:hidden}' +
    'section[data-room="map"] .mbar i{display:block;height:100%;width:0;border-radius:3px;transition:width .5s cubic-bezier(.22,.61,.36,1)}' +
    'section[data-room="map"] .mtap{background:var(--mint)}section[data-room="map"] .mauto{background:var(--orchid)}' +
    'section[data-room="map"] .mcv{width:36px;text-align:right;flex:none;color:var(--ink)}' +
    'section[data-room="map"] .mheld{gap:8px;color:var(--mint2);border-top:1px solid var(--line);padding-top:7px;margin-top:7px}' +
    'section[data-room="map"] .mheldv{color:var(--mint2);letter-spacing:.04em}' +
    'section[data-room="map"] .mdef{margin:9px 0 0;font:400 11px/1.5 var(--mono);color:var(--mute);max-width:30rem}' +
    'section[data-room="map"] .mdefl{display:none}' + /* one short definition everywhere; the long form is in the wall label */
    'section[data-room="map"] .mring{margin:5px 0 0;font:400 10.5px/1.45 var(--mono);color:var(--mute);opacity:.8;max-width:30rem}' +
    'section[data-room="map"] .mctl{pointer-events:auto;display:flex;flex-direction:column;gap:7px;max-width:440px}' +
    'section[data-room="map"] .mcap{margin:0;font:400 clamp(14px,1.8vw,16px)/1.4;color:var(--ink);min-height:1.4em}' +
    'section[data-room="map"] .mcaps{display:block;font:400 12px/1.45 var(--mono);color:var(--mute);margin-top:3px}' +
    'section[data-room="map"] .mtogrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
    'section[data-room="map"] .mtog{display:flex;gap:5px;background:rgba(10,1,24,.6);border:1px solid var(--line);border-radius:999px;padding:4px;flex:none}' +
    'section[data-room="map"] .mtog button{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute);background:none;border:0;border-radius:999px;padding:12px 15px;min-height:40px;cursor:pointer;white-space:nowrap}' +
    'section[data-room="map"] .mtog button.on{color:#06130f;background:linear-gradient(100deg,var(--mint),#62e7ff)}' +
    'section[data-room="map"] .mtog button:focus-visible{outline:2px solid var(--mint);outline-offset:3px}' +
    'section[data-room="map"] .mdrag{margin:0;font:600 11px/1.35 var(--mono);letter-spacing:.05em;color:var(--mute)}' +
    'section[data-room="map"] .mdial{-webkit-appearance:none;appearance:none;width:100%;height:40px;background:transparent;margin:0;touch-action:pan-x}' +
    'section[data-room="map"] .mdial::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--mint),var(--orchid))}' +
    'section[data-room="map"] .mdial::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--mint);margin-top:-8.5px;box-shadow:0 0 0 4px rgba(33,246,188,.15)}' +
    'section[data-room="map"] .mdial::-moz-range-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--mint),var(--orchid))}' +
    'section[data-room="map"] .mdial::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--mint)}' +
    'section[data-room="map"] .mdial:focus-visible{outline:2px solid var(--mint);outline-offset:6px;border-radius:8px}' +
    'section[data-room="map"] .mnote{margin:2px 0 0;font:400 11px/1.5 var(--mono);color:var(--mute);max-width:34rem}' +
    '@media (max-aspect-ratio:115/100){section[data-room="map"] .mline,section[data-room="map"] .mdrag,section[data-room="map"] .mring{display:none}' +
    'section[data-room="map"] .mbig{font-size:clamp(26px,7.4vw,34px)}section[data-room="map"] .mrow{margin:6px 0 3px}' +
    'section[data-room="map"] .manch{margin-bottom:7px}section[data-room="map"] .mdef{margin-top:7px;font-size:10.5px;line-height:1.45}' +
    'section[data-room="map"] .mcap{font-size:14px}section[data-room="map"] .mcaps{font-size:11px}' +
    'section[data-room="map"] .mctl{gap:6px}section[data-room="map"] .mtog button{padding:11px 13px}' +
    'section[data-room="map"] .mdefl{display:none}section[data-room="map"] .mdefs{display:block}}' +
    /* two measured fallbacks: on a stage too short for the whole readout the room drops its own
       trimmings first, and only then the definition line */
    'section[data-room="map"] .mapwrap.mtight .mline,section[data-room="map"] .mapwrap.mtight .mring{display:none}' +
    'section[data-room="map"] .mapwrap.mtight .mbig{font-size:26px}section[data-room="map"] .mapwrap.mtight .mdef{font-size:10px;line-height:1.4;margin-top:6px}' +
    'section[data-room="map"] .mapwrap.mtight .mcross{gap:5px}section[data-room="map"] .mapwrap.mtight .manch{margin-bottom:4px}' +
    'section[data-room="map"] .mapwrap.mtight .mheld{margin-top:5px;padding-top:5px}section[data-room="map"] .mapwrap.mtight .mctl{gap:5px}' +
    /* last resort, and the last things to go: the bars and the sub-caption. the definition of the
       number and the held-plays readout stay on every screen the room runs on */
    'section[data-room="map"] .mapwrap.mtiny .mcross,section[data-room="map"] .mapwrap.mtiny .mcaps{display:none}' +
    'section[data-room="map"] .mapwrap.mtiny .mbig{font-size:23px}' +
    /* on a short stage there is no room to stack a readout, a picture and a dial, so the dots take
       the whole stage and the type floats over them; in the curve view the chart takes it instead */
    'section[data-room="map"] .mapwrap.mtight .mhud,section[data-room="map"] .mapwrap.mtight .mcap{text-shadow:0 1px 10px #0a0118,0 0 22px rgba(10,1,24,.95)}' +
    'section[data-room="map"] .mapwrap.mtight .mhud{padding-bottom:14px;background:linear-gradient(180deg,rgba(10,1,24,.86) 62%,rgba(10,1,24,0))}' +
    'section[data-room="map"] .mapwrap.mtight .mcap{padding:12px 0 2px;background:linear-gradient(0deg,rgba(10,1,24,.88) 42%,rgba(10,1,24,0))}' +
    'section[data-room="map"] .mapwrap.mtight .mcap{font-size:12.5px;line-height:1.35}' +
    'section[data-room="map"] .mapwrap.mtight .mtog button{min-height:38px;padding:10px 13px}' +
    'section[data-room="map"] .mapwrap.mtight .mdial{height:34px}' +
    'section[data-room="map"] .mapwrap.mcurve .mline,section[data-room="map"] .mapwrap.mcurve .mcross,section[data-room="map"] .mapwrap.mcurve .mring{display:none}' +
    '@media (max-aspect-ratio:115/100){section[data-room="map"] .mapwrap.mcurve .mdef{display:none}}' +
    /* a landscape phone has almost no stage left: keep the number, the held readout and the dial */
    'section[data-room="map"] .mapwrap.mtight .mdrag{display:none}' +
    'section[data-room="map"] .mapwrap.mmicro .mdef,section[data-room="map"] .mapwrap.mmicro .manch{display:none}' +
    'section[data-room="map"] .mapwrap.mmicro .mcap{font-size:12px}' +
    'section[data-room="map"] .mapwrap.mcurve.mtight .mhud{visibility:hidden;height:0;overflow:hidden}';
  document.head.appendChild(st);
}

export default {
  id: 'map', track: 'latent-dimension', level: 5, mode: 'map', map: null, ready: false, dr: null, fc: 0, dt: [],

  async mount(root, ctx) {
    const id = await ctx.identity(); const map = id && id.map;
    if (!map || !map.xy || !map.levels) { root.textContent = 'the map did not load.'; return; }
    this.map = map; this.rootEl = root;
    const P = ctx.particles, n = P.n, na = this.na = map.artists.length;

    this.offX = new Float32Array(n); this.offY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u1 = Math.max(ctx.hash(i * 2), 1e-6), u2 = ctx.hash(i * 2 + 1);
      const r = Math.sqrt(-2 * Math.log(u1)) * SIGMA;
      this.offX[i] = r * Math.cos(TAU * u2); this.offY[i] = r * Math.sin(TAU * u2);
    }

    /* every level is normalised on its own min/max so the cloud fills the band between the readout
       and the dial. the transform is one affine map per level, so artists keep their relative
       geometry inside a level and only the frame changes size. */
    this.nxy = [];
    for (let lv = 0; lv < map.xy.length; lv++) {
      const src = map.xy[lv], q = new Float32Array(na * 2);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let a = 0; a < na; a++) { const p = src[a]; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      const kx = 0.94 / Math.max(1e-6, x1 - x0), ky = 0.96 / Math.max(1e-6, y1 - y0);
      for (let a = 0; a < na; a++) { const p = src[a]; q[a * 2] = 0.03 + (p[0] - x0) * kx; q[a * 2 + 1] = 0.02 + (p[1] - y0) * ky; }
      this.nxy.push(q);
    }

    /* the held set: among my 24 most-played artists (mapmorph.json lists artists in play order —
       the same order as twolisteners.json, whose plays_bucket descends), the four that travel
       furthest between the 12% map and the 100% map. nothing about their plays differs per level. */
    const cand = [];
    for (let a = 0; a < Math.min(24, na); a++) {
      const p0 = map.xy[0][a], p6 = map.xy[map.xy.length - 1][a], dx = p6[0] - p0[0], dy = p6[1] - p0[1];
      cand.push([dx * dx + dy * dy, a]);
    }
    cand.sort((u, v) => v[0] - u[0]);
    this.pin = new Uint16Array(NPIN); this.pinName = []; this.pinW = [];
    this.pinMask = new Uint8Array(na);
    for (let k = 0; k < NPIN; k++) { const a = cand[k][1]; this.pin[k] = a; this.pinMask[a] = 1; this.pinName.push(map.artists[a]); this.pinW.push(map.artists[a].length * 6.4 + 12); }
    this.pinX = new Float32Array(NPIN); this.pinY = new Float32Array(NPIN); this.pinSet = false;
    this.tr = new Float32Array(NPIN * TRN * 2); this.trN = 0; this.trH = 0;

    /* the curve view: a fixed ~15% of the dots, chosen once by the shell's own hash, stack into
       seven columns. deterministic, so the same dots always become the measurement. */
    this.sub = new Uint8Array(n); this.col = new Uint8Array(n); this.rank = new Float32Array(n);
    const cnt = new Int32Array(7); let k7 = 0;
    for (let i = 0; i < n; i++) { if (ctx.hash(i * 31 + 7) < 0.15) { this.sub[i] = 1; const c = k7++ % 7; this.col[i] = c; cnt[c]++; } }
    const seen = new Int32Array(7);
    for (let i = 0; i < n; i++) { if (this.sub[i]) { const c = this.col[i]; this.rank[i] = cnt[c] > 1 ? seen[c]++ / (cnt[c] - 1) : 0.5; } }

    const pub = map.published;
    this.colX = new Float32Array(7); this.colH = new Float32Array(7); this.colTop = new Float32Array(7);
    this.biTxt = []; this.lvTxt = [];
    for (let i = 0; i < 7; i++) { this.biTxt.push(pub.bridge_index[i].toFixed(2)); this.lvTxt.push(String(map.levels[i])); }

    const wrap = el('div', 'mapwrap');
    const hud = el('div', 'mhud');
    const big = el('div', 'mbig'); big.appendChild(el('span', 'mpct')); big.appendChild(el('span', 'munit', '% algorithmic')); hud.appendChild(big);
    const row = el('div', 'mrow'); row.appendChild(el('span', '', 'bridge index')); row.appendChild(el('span', 'mbi')); hud.appendChild(row);
    /* 1.05 is the published embedding-free headline: researcher.html, abstract + method
       ("the Bridge Index and the leakage correction"). */
    hud.appendChild(el('p', 'manch', 'headline, measured without any map: 1.05'));
    const cross = el('div', 'mcross');
    const bar = (lbl, cls) => { const r = el('div', 'mcrow'); r.appendChild(el('span', 'mclbl', lbl)); const b = el('div', 'mbar'); b.appendChild(el('i', cls)); r.appendChild(b); r.appendChild(el('span', 'mcv ' + cls + 'v')); cross.appendChild(r); };
    bar('my taps', 'mtap'); bar('autoplay', 'mauto');
    hud.appendChild(cross);
    const held = el('div', 'mcrow mheld'); held.appendChild(el('span', 'mclbl', 'my plays'));
    /* 97,427 is exhibit/data/wall.json (total). it is the one number in this room that never moves. */
    held.appendChild(el('span', 'mheldv', '97,427 · unchanged')); hud.appendChild(held);
    hud.appendChild(el('p', 'mdef mdefl', 'bridge index: how often my own picks cross into another neighbourhood of the map, divided by how often autoplay does. 1.00 means no difference.'));
    hud.appendChild(el('p', 'mdef mdefs', 'bridge index: my crossings between neighbourhoods, divided by autoplay’s. 1.00 means no difference.'));
    hud.appendChild(el('p', 'mring', 'ringed: four of my most-played artists. they keep their colour on every map.'));
    wrap.appendChild(hud);

    const ctl = el('div', 'mctl');
    const cap = el('p', 'mcap'); cap.setAttribute('aria-live', 'polite');
    cap.appendChild(el('span', 'mcapm')); cap.appendChild(el('span', 'mcaps')); ctl.appendChild(cap);
    const togrow = el('div', 'mtogrow');
    const tog = el('div', 'mtog'); tog.setAttribute('role', 'radiogroup'); tog.setAttribute('aria-label', 'what the dots show');
    const bMap = el('button', 'on', 'the map'), bCur = el('button', '', 'see the curve');
    [bMap, bCur].forEach((b) => { b.type = 'button'; b.setAttribute('role', 'radio'); tog.appendChild(b); });
    bMap.setAttribute('aria-checked', 'true'); bMap.tabIndex = 0;
    bCur.setAttribute('aria-checked', 'false'); bCur.tabIndex = -1;
    togrow.appendChild(tog);
    togrow.appendChild(el('p', 'mdrag', 'the plays never change. only the map does.'));
    ctl.appendChild(togrow);
    const dial = el('input', 'mdial'); dial.type = 'range'; dial.min = '0'; dial.max = '6'; dial.step = '1'; dial.value = '5';
    dial.setAttribute('list', 'map-mticks'); dial.setAttribute('aria-label', 'training data, percent algorithmic');
    ctl.appendChild(dial);
    const dl = el('datalist'); dl.id = 'map-mticks'; for (let i = 0; i < 7; i++) { const o = el('option'); o.value = String(i); dl.appendChild(o); } ctl.appendChild(dl);
    wrap.appendChild(ctl);
    root.appendChild(wrap);

    const wall = root.parentElement.querySelector('.wall'), deeper = wall.querySelector('.deeper');
    const note = el('p', 'mnote short-hide', 'a 2-d picture of a retrained embedding shows the mechanism. the measurement is the dial’s numbers, not the picture.');
    wall.insertBefore(note, deeper);

    this.wrap = wrap; this.hudEl = hud; this.ctlEl = ctl;
    this.pct = hud.querySelector('.mpct'); this.bi = hud.querySelector('.mbi');
    this.tapv = hud.querySelector('.mtapv'); this.autov = hud.querySelector('.mautov');
    this.tapBar = hud.querySelector('.mtap'); this.autoBar = hud.querySelector('.mauto');
    this.capM = cap.querySelector('.mcapm'); this.capS = cap.querySelector('.mcaps');
    this.dial = dial; this.bMap = bMap; this.bCur = bCur;

    dial.addEventListener('input', (e) => { e.stopPropagation(); this.pick(parseInt(dial.value, 10), ctx); });
    dial.addEventListener('keydown', (e) => e.stopPropagation());
    bMap.addEventListener('click', () => this.setMode('map', ctx));
    bCur.addEventListener('click', () => this.setMode('curve', ctx));
    tog.addEventListener('keydown', (e) => {
      if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      const next = this.mode === 'map' ? 'curve' : 'map';
      this.setMode(next, ctx); (next === 'map' ? bMap : bCur).focus();
    });
    this.ready = true;
  },

  alive() { return !!this.rootEl && !!this.rootEl.parentElement && this.rootEl.parentElement.classList.contains('is-active'); },

  position(ctx) {
    if (!this.wrap) return;
    const s = ctx.stage(); this.s = s;
    this.wrap.style.left = s.x + 'px'; this.wrap.style.top = s.y + 'px';
    this.wrap.style.width = s.w + 'px'; this.wrap.style.height = s.h + 'px';
    /* the readout sits above the map and the dial below it, so the artists get the middle band of
       the stage and nothing is ever drawn under text. if the two ends cannot both fit, the room
       sheds its own copy rather than letting anything spill over the wall text */
    this.wrap.classList.remove('mtight', 'mtiny', 'mmicro', 'mcurve');
    if (this.hudEl.offsetHeight + this.ctlEl.offsetHeight + 120 > s.h) this.wrap.classList.add('mtight');
    if (this.hudEl.offsetHeight + this.ctlEl.offsetHeight + 96 > s.h) this.wrap.classList.add('mtiny');
    if (this.hudEl.offsetHeight + this.ctlEl.offsetHeight + 40 > s.h) this.wrap.classList.add('mmicro');
    this.wrap.classList.toggle('mcurve', this.mode === 'curve');
    const tight = this.tight = this.wrap.classList.contains('mtight');
    const hud = this.hudEl.offsetHeight, ctl = this.ctlEl.offsetHeight;
    if (tight) { this.y0 = 0.03; this.yh = 0.94; }
    else { this.y0 = Math.min(0.5, (hud + 14) / s.h); this.yh = Math.max(0.18, 1 - (hud + ctl + 28) / s.h); }
    const top = tight ? s.y + 14 : s.y + this.y0 * s.h + 20;
    const base = (tight ? s.y + s.h - ctl - 8 : s.y + (this.y0 + this.yh) * s.h) - 30;
    const gut = s.w < 430 ? 34 : 50, cw = (s.w - gut - 8) / 7, bi = this.map.published.bridge_index;
    this.cBase = base; this.cTop = top; this.cLeft = s.x + gut; this.cFull = Math.max(24, base - top);
    this.colW = Math.min(24, cw * 0.6);
    for (let i = 0; i < 7; i++) { this.colX[i] = s.x + gut + cw * (i + 0.5); this.colH[i] = (bi[i] / AXMAX) * this.cFull; this.colTop[i] = base - this.colH[i]; }
    this.parY = base - (1 / AXMAX) * this.cFull;
    this.small = s.w < 430;
    this.nLabel = s.w < 430 ? 2 : NPIN; /* a narrow stage only has room for two names */
    this.shortCap = tight || s.w < 760;
  },

  applyTargets(ctx) {
    const P = ctx.particles, s = this.s, q = this.nxy[this.level], na = this.na, ox = this.offX, oy = this.offY;
    const y0 = this.y0, yh = this.yh, art = P.artist;
    if (this.mode === 'curve') {
      const sub = this.sub, col = this.col, rk = this.rank, cx = this.colX, ch = this.colH, cwv = this.colW, base = this.cBase;
      const sx = s.x, sy = s.y, sw = s.w, sh = s.h, hash = ctx.hash;
      P.targetPx((i) => {
        if (sub[i]) { const c = col[i]; return [cx[c] + (hash(i * 5 + 2) - 0.5) * cwv, base - rk[i] * ch[c]]; }
        const a = art[i] % na;
        return [sx + (q[a * 2] + ox[i]) * sw, sy + (y0 + (q[a * 2 + 1] + oy[i]) * yh) * sh];
      });
    } else {
      P.target((i) => { const a = art[i] % na; return [q[a * 2] + ox[i], y0 + (q[a * 2 + 1] + oy[i]) * yh]; });
    }
  },

  paint(ctx) {
    const P = ctx.particles, C = ctx.PROV, na = this.na, pinMask = this.pinMask, sub = this.sub, art = P.artist, prov = P.prov;
    const curve = this.mode === 'curve', k = curve ? (this.tight ? 0.88 : 0.85) : 0.3, fog = ctx.PAL.fog;
    const D0 = mixc(C[0], fog, k), D1 = mixc(C[1], fog, k), D2 = mixc(C[2], fog, k), LIFT = ctx.PAL.ice;
    P.color((i) => {
      const a = art[i] % na, p = prov[i];
      if (pinMask[a]) return C[p];              /* the held artists never dim: that is the point */
      if (curve && sub[i]) return LIFT;
      return p === 0 ? D0 : p === 1 ? D1 : D2;
    });
  },

  setLevel(lv, ctx) {
    if (!this.map) return;
    this.level = lv;
    ctx.particles.ease = 0.05;
    this.copy();          /* the caption can change height, so it is written before the band is measured */
    this.position(ctx);
    this.applyTargets(ctx);
    this.paint(ctx);
  },

  pick(lv, ctx) {
    if (lv === this.level || lv < 0 || lv > 6) return;
    this.dial.value = String(lv);
    ctx.audio.note(6 - lv, { dur: 0.3, vol: 0.03 }); /* a light detent tick over the held drone */
    this.setLevel(lv, ctx);
    this.droneSet(ctx);
  },

  markMode(m) {
    this.mode = m;
    const on = m === 'map';
    this.bMap.className = on ? 'on' : ''; this.bMap.setAttribute('aria-checked', String(on)); this.bMap.tabIndex = on ? 0 : -1;
    this.bCur.className = on ? '' : 'on'; this.bCur.setAttribute('aria-checked', String(!on)); this.bCur.tabIndex = on ? -1 : 0;
  },

  setMode(m, ctx) {
    if (m === this.mode || !this.ready) return;
    this.markMode(m);
    ctx.particles.ease = 0.05;
    this.copy(); this.position(ctx); this.applyTargets(ctx); this.paint(ctx);
  },

  copy() {
    if (!this.map) return;
    const m = this.map, lv = this.level, pub = m.published, last = lv === 6;
    this.pct.textContent = String(m.levels[lv]);
    this.bi.textContent = this.biTxt[lv];
    const tap = Math.round(pub.tap_crossing_pct[lv]), auto = Math.round(pub.auto_crossing_pct[lv]);
    this.tapv.textContent = tap + '%'; this.autov.textContent = auto + '%';
    this.tapBar.style.width = tap + '%'; this.autoBar.style.width = auto + '%';
    if (this.mode === 'curve') { this.capM.textContent = this.shortCap ? CURVE_CAP_S : CURVE_CAP; this.capS.textContent = last ? NEG : CURVE_SUB; }
    else { this.capM.textContent = last ? NEG : CAP[lv]; this.capS.textContent = last ? CAP[6] : ''; }
    this.dial.setAttribute('aria-valuetext', 'level ' + (lv + 1) + ' of 7: ' + m.levels[lv] + '% algorithmic, index ' + this.biTxt[lv] + '. my plays unchanged');
  },

  /* a held two-voice drone instead of seven disconnected pings: one sine at D3, one drifting up to
     31 cents above it, so the beat quickens as the algorithmic share rises and the two voices
     resolve into a unison at the lowest level. two voices at 0.015 = 0.03 total. */
  droneSet(ctx) {
    const A = ctx.audio;
    if (!A.ac) return;
    if (A.muted || !this.alive()) { if (this.dr) { const t0 = A.ac.currentTime; this.dr.ga.gain.setTargetAtTime(0, t0, 0.2); this.dr.gb.gain.setTargetAtTime(0, t0, 0.2); } return; }
    if (!this.dr) {
      const ac = A.ac, a = ac.createOscillator(), b = ac.createOscillator(), ga = ac.createGain(), gb = ac.createGain();
      a.type = 'sine'; b.type = 'sine'; a.frequency.value = F0; b.frequency.value = F0;
      ga.gain.value = 0; gb.gain.value = 0;
      a.connect(ga); b.connect(gb); ga.connect(A.sfx); gb.connect(A.sfx);
      a.start(); b.start();
      this.dr = { a, b, ga, gb };
    }
    const t = A.ac.currentTime, k = this.level / 6;
    this.dr.b.frequency.setTargetAtTime(F0 * Math.pow(2, (k * 31) / 1200), t, 0.18);
    this.dr.ga.gain.setTargetAtTime(GV, t, 0.25); this.dr.gb.gain.setTargetAtTime(GV, t, 0.25);
  },
  droneOff(ctx) {
    const d = this.dr, ac = ctx.audio.ac; this.dr = null;
    if (!d) return;
    if (!ac) return;
    const t = ac.currentTime;
    d.ga.gain.cancelScheduledValues(t); d.gb.gain.cancelScheduledValues(t);
    d.ga.gain.setTargetAtTime(0, t, 0.12); d.gb.gain.setTargetAtTime(0, t, 0.12);
    try { d.a.stop(t + 0.6); d.b.stop(t + 0.6); } catch (e) {}
    setTimeout(() => { try { d.ga.disconnect(); d.gb.disconnect(); } catch (e) {} }, 900);
  },

  stopDemo() { for (let i = 0; i < this.dt.length; i++) clearTimeout(this.dt[i]); this.dt.length = 0; },

  /* kiosk: walk the dial down and back up, then hold the curve open long enough to read it */
  demo(ctx) {
    if (!this.ready) return;
    this.stopDemo();
    const seq = [4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 6, 5], step = 620;
    for (let k = 0; k < seq.length; k++) this.dt.push(setTimeout(() => { if (this.alive()) this.pick(seq[k], ctx); }, (k + 1) * step));
    const after = (seq.length + 1) * step;
    this.dt.push(setTimeout(() => { if (this.alive()) this.setMode('curve', ctx); }, after));
    this.dt.push(setTimeout(() => { if (this.alive()) this.setMode('map', ctx); }, after + 8000));
  },

  enter(ctx) {
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5; P.big = false;
    if (!this.ready) return;
    this.position(ctx);
    this.pinSet = false; this.trN = 0; this.trH = 0;
    this.setLevel(this.level, ctx);
    this.droneSet(ctx);
  },

  /* the next room's enter() owns the particles, so leaving only resets this room's own state */
  leave(ctx) { this.stopDemo(); this.droneOff(ctx); if (this.ready && this.mode !== 'map') { this.markMode('map'); this.copy(); } },

  frame(g, t, bands, w, h, ctx) {
    if (!this.ready || !this.s) return;
    const red = ctx.reduced;
    this.fc++;
    if ((this.fc & 63) === 0) this.droneSet(ctx); /* picks the drone up if sound is enabled later, drops it on mute */
    if (this.mode === 'curve') this.drawCurve(g, bands, red);
    this.drawPins(g, bands, red);
  },

  drawCurve(g, bands, red) {
    const s = this.s, base = this.cBase, x0 = this.cLeft, x1 = s.x + s.w - 6, cx = this.colX, ct = this.colTop, cw = this.colW;
    const lv = this.level, f = this.small ? 9 : 10;
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(240,234,255,.22)';
    g.beginPath(); g.moveTo(x0, base); g.lineTo(x1, base); g.stroke();
    /* parity: 1.00 is no difference between my picks and autoplay's */
    g.setLineDash([4, 5]); g.strokeStyle = 'rgba(245,166,35,.55)';
    g.beginPath(); g.moveTo(x0, this.parY); g.lineTo(x1, this.parY); g.stroke(); g.setLineDash([]);
    g.font = '600 ' + f + 'px ui-monospace, Menlo, monospace';
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(245,166,35,.85)'; g.fillText('1.00 · no difference', x0 + 2, this.parY - 5);
    /* the curve itself: one line through the seven column tops */
    g.strokeStyle = 'rgba(134,203,254,' + (red ? 0.8 : 0.7 + bands.mid * 0.3) + ')'; g.lineWidth = 1.6;
    g.beginPath(); for (let i = 0; i < 7; i++) { if (i) g.lineTo(cx[i], ct[i]); else g.moveTo(cx[i], ct[i]); } g.stroke();
    g.lineWidth = 1;
    g.textAlign = 'center';
    for (let i = 0; i < 7; i++) {
      const on = i === lv;
      if (on) { g.strokeStyle = 'rgba(33,246,188,.9)'; g.strokeRect(cx[i] - cw * 0.72, ct[i] - 3, cw * 1.44, base - ct[i] + 3); }
      g.fillStyle = on ? 'rgba(240,234,255,.95)' : 'rgba(164,155,189,.75)';
      g.fillText(this.lvTxt[i], cx[i], base + 13);
      if (on) { g.fillStyle = 'rgba(33,246,188,.95)'; g.fillText(this.biTxt[i], cx[i], ct[i] - 7); }
    }
    g.fillStyle = 'rgba(164,155,189,.8)';
    g.fillText('% of training plays chosen by the algorithm', (x0 + x1) / 2, base + 26);
    g.save(); g.translate(s.x + 11, (this.cTop + base) / 2); g.rotate(-Math.PI / 2);
    g.textAlign = 'center'; g.fillText('bridge index', 0, 0); g.restore();
    g.textAlign = 'left';
  },

  drawPins(g, bands, red) {
    const s = this.s, q = this.nxy[this.level], pin = this.pin, px = this.pinX, py = this.pinY, tr = this.tr;
    const curve = this.mode === 'curve', al = curve ? 0.34 : 1;
    const sx = s.x, sy = s.y, sw = s.w, sh = s.h, y0 = this.y0, yh = this.yh;
    let moved = false;
    for (let k = 0; k < NPIN; k++) {
      const a = pin[k], tx = sx + q[a * 2] * sw, ty = sy + (y0 + q[a * 2 + 1] * yh) * sh;
      if (!this.pinSet || red) { px[k] = tx; py[k] = ty; } else { const dx = tx - px[k], dy = ty - py[k]; if (dx * dx + dy * dy > 0.36) moved = true; px[k] = px[k] + dx * 0.055; py[k] = py[k] + dy * 0.055; }
    }
    this.pinSet = true;
    /* ghost trail: only while the map is actually warping, so a settled map is clean */
    if (moved && !red && (this.fc % TRSTEP) === 0) {
      const hh = this.trH;
      for (let k = 0; k < NPIN; k++) { const o = (k * TRN + hh) * 2; tr[o] = px[k]; tr[o + 1] = py[k]; }
      this.trH = (hh + 1) % TRN; if (this.trN < TRN) this.trN++;
    } else if (!moved && this.trN > 0 && (this.fc % 6) === 0) this.trN--;
    const nT = this.trN;
    if (nT > 1 && !red) {
      for (let k = 0; k < NPIN; k++) {
        for (let j = 0; j < nT; j++) {
          const idx = (this.trH - nT + j + TRN * 2) % TRN, o = (k * TRN + idx) * 2, f = (j + 1) / nT;
          g.fillStyle = 'rgba(125,240,200,' + (0.05 + f * 0.2) * al + ')';
          g.beginPath(); g.arc(tr[o], tr[o + 1], 1 + f * 1.4, 0, TAU); g.fill();
        }
      }
    }
    const r = red ? 7 : 7 + bands.low * 2.2;
    g.lineWidth = 1.4;
    for (let k = 0; k < NPIN; k++) {
      g.strokeStyle = 'rgba(33,246,188,' + 0.85 * al + ')';
      g.beginPath(); g.arc(px[k], py[k], r, 0, TAU); g.stroke();
      if (curve || k >= this.nLabel) continue;
      const sm = this.small, wdt = sm ? this.pinW[k] * 0.88 : this.pinW[k], leftSide = px[k] + 11 + wdt > sx + sw;
      const lx = leftSide ? px[k] - 11 - wdt : px[k] + 11, ly = py[k] + 4;
      g.fillStyle = 'rgba(10,1,24,.82)'; g.fillRect(lx - 4, ly - 11, wdt, 16);
      g.font = sm ? '600 10px ui-monospace, Menlo, monospace' : '600 11px ui-monospace, Menlo, monospace';
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = 'rgba(240,234,255,.95)'; g.fillText(this.pinName[k], lx, ly);
    }
  },
};
