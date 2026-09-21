/* room 3 — the map that lied. every particle flies to its artist's position in a retrained
   embedding; a seven-detent dial swaps which retraining (12% -> 100% algorithmic training data).
   particles keep their room-1 provenance colour, so the map arrives already telling the tapped/
   served story. track latent-dimension.mp3 is the exhibit's one deliberate key break (10A -> 5B):
   the room where the ruler bends is the room where the music goes out of key. do not fix that. */
const CAP = [
  'trained almost entirely on my own picks — the advantage vanishes.',
  'still mostly my own picks.',
  'the balanced, corrected map.',
  'past the midpoint, more queue than me.',
  'close to a fully served log.',
  'about what an embedding trained on my raw log sees.',
  'algorithm only.',
];
const SIGMA = 0.012, TAU = 6.283185307;
{
  const st = document.createElement('style');
  st.textContent = 'section[data-room="map"] .mapwrap{position:absolute;display:flex;flex-direction:column;justify-content:space-between}' +
    'section[data-room="map"] .mhud{pointer-events:none}' +
    'section[data-room="map"] .mbig{font:600 clamp(32px,7vw,56px)/1 var(--mono);letter-spacing:-.02em;color:var(--ink)}' +
    'section[data-room="map"] .munit{font:600 12px/1 var(--mono);letter-spacing:.08em;color:var(--mute);margin-left:6px}' +
    'section[data-room="map"] .mline{margin:8px 0 12px;max-width:26rem}' +
    'section[data-room="map"] .mrow{display:flex;gap:8px;align-items:baseline;font:600 12px/1 var(--mono);letter-spacing:.06em;color:var(--mute);margin-bottom:10px}' +
    'section[data-room="map"] .mbi{color:var(--ink);font-size:15px}' +
    'section[data-room="map"] .mcross{display:flex;flex-direction:column;gap:6px;max-width:230px}' +
    'section[data-room="map"] .mcrow{display:flex;align-items:center;gap:8px;font:600 11px/1 var(--mono);color:var(--mute)}' +
    'section[data-room="map"] .mclbl{width:58px;flex:none}' +
    'section[data-room="map"] .mbar{flex:1;height:6px;border-radius:3px;background:rgba(189,166,255,.14);overflow:hidden}' +
    'section[data-room="map"] .mbar i{display:block;height:100%;width:0;border-radius:3px;transition:width .5s cubic-bezier(.22,.61,.36,1)}' +
    'section[data-room="map"] .mtap{background:var(--mint)}section[data-room="map"] .mauto{background:var(--orchid)}' +
    'section[data-room="map"] .mcv{width:36px;text-align:right;flex:none;color:var(--ink)}' +
    'section[data-room="map"] .mctl{pointer-events:auto;display:flex;flex-direction:column;gap:8px;max-width:420px}' +
    'section[data-room="map"] .mcap{margin:0;font:400 clamp(14px,1.8vw,16px)/1.4;color:var(--ink);min-height:1.4em}' +
    'section[data-room="map"] .mdrag{margin:0;font:600 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}' +
    'section[data-room="map"] .mdial{-webkit-appearance:none;appearance:none;width:100%;height:44px;background:transparent;margin:2px 0;touch-action:pan-x}' +
    'section[data-room="map"] .mdial::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--mint),var(--orchid))}' +
    'section[data-room="map"] .mdial::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--mint);margin-top:-8.5px;box-shadow:0 0 0 4px rgba(33,246,188,.15)}' +
    'section[data-room="map"] .mdial::-moz-range-track{height:3px;border-radius:2px;background:linear-gradient(90deg,var(--mint),var(--orchid))}' +
    'section[data-room="map"] .mdial::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--mint)}' +
    'section[data-room="map"] .mdial:focus-visible{outline:2px solid var(--mint);outline-offset:6px;border-radius:8px}' +
    'section[data-room="map"] .mnote{margin:2px 0 0;font:400 11px/1.5 var(--mono);color:var(--mute);max-width:34rem}' +
    '@media (max-aspect-ratio:115/100){section[data-room="map"] .mline,section[data-room="map"] .mdrag{display:none}section[data-room="map"] .mrow{margin:8px 0}section[data-room="map"] .mcap{font-size:14px}}';
  document.head.appendChild(st);
}

export default {
  id: 'map', track: 'latent-dimension', level: 5, map: null, ready: false,
  async mount(root, ctx) {
    const id = await ctx.identity(); const map = id && id.map;
    if (!map || !map.xy || !map.levels) { root.textContent = 'the map did not load.'; return; }
    this.map = map;
    const P = ctx.particles, n = P.n;
    this.offX = new Float32Array(n); this.offY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u1 = Math.max(ctx.hash(i * 2), 1e-6), u2 = ctx.hash(i * 2 + 1);
      const r = Math.sqrt(-2 * Math.log(u1)) * SIGMA;
      this.offX[i] = r * Math.cos(TAU * u2); this.offY[i] = r * Math.sin(TAU * u2);
    }
    const wrap = document.createElement('div'); wrap.className = 'mapwrap';
    wrap.innerHTML =
      '<div class="mhud" aria-live="polite">' +
        '<div class="mbig"><span class="mpct"></span><span class="munit">% algorithmic</span></div>' +
        '<p class="say dim mline">nothing about my listening changes. only what the map was trained on.</p>' +
        '<div class="mrow"><span class="mlbl">bridge index</span><span class="mbi"></span></div>' +
        '<div class="mcross">' +
          '<div class="mcrow"><span class="mclbl">my taps</span><div class="mbar"><i class="mtap"></i></div><span class="mcv mtapv"></span></div>' +
          '<div class="mcrow"><span class="mclbl">autoplay</span><div class="mbar"><i class="mauto"></i></div><span class="mcv mautov"></span></div>' +
        '</div>' +
      '</div>' +
      '<div class="mctl">' +
        '<p class="mcap" aria-live="polite"></p>' +
        '<p class="mdrag">drag the dial</p>' +
        '<input type="range" class="mdial" min="0" max="6" step="1" value="5" list="map-mticks" aria-label="training data, percent algorithmic">' +
        '<datalist id="map-mticks"><option value="0"></option><option value="1"></option><option value="2"></option><option value="3"></option><option value="4"></option><option value="5"></option><option value="6"></option></datalist>' +
      '</div>';
    root.appendChild(wrap);
    const wall = root.parentElement.querySelector('.wall'), deeper = wall.querySelector('.deeper');
    ['a 2-d picture of a retrained embedding shows the mechanism. the measurement is the dial’s numbers, not the picture.', 'the result measured on this kind of map was later killed by its own test. my headline uses no map at all.'].forEach((t) => { const p = document.createElement('p'); p.className = 'mnote' + (t.charAt(0) === 'a' ? ' short-hide' : ''); p.textContent = t; wall.insertBefore(p, deeper); });
    this.wrap = wrap;
    this.pct = wrap.querySelector('.mpct'); this.bi = wrap.querySelector('.mbi');
    this.tapv = wrap.querySelector('.mtapv'); this.autov = wrap.querySelector('.mautov');
    this.tapBar = wrap.querySelector('.mtap'); this.autoBar = wrap.querySelector('.mauto');
    this.cap = wrap.querySelector('.mcap');
    this.dial = wrap.querySelector('.mdial');
    this.dial.addEventListener('input', (e) => { e.stopPropagation(); this.setLevel(parseInt(this.dial.value, 10), ctx); });
    this.dial.addEventListener('keydown', (e) => e.stopPropagation());
    this.ready = true;
    this.position(ctx);
  },
  position(ctx) {
    if (!this.wrap) return;
    const s = ctx.stage(); this.s = s;
    this.wrap.style.left = s.x + 'px'; this.wrap.style.top = s.y + 'px';
    this.wrap.style.width = s.w + 'px'; this.wrap.style.height = s.h + 'px';
  },
  paint(ctx) { const P = ctx.particles, C = ctx.PROV; P.color((i) => C[P.prov[i]]); },
  setLevel(lv, ctx) {
    if (!this.map) return;
    this.level = lv;
    const P = ctx.particles, xy = this.map.xy[lv], na = this.map.artists.length, ox = this.offX, oy = this.offY;
    P.ease = 0.05;
    /* the readout sits above the map and the dial below it, so the artists get the middle band of the stage and nothing is drawn under text */
    const s = this.s || ctx.stage(), hud = this.wrap.firstElementChild.offsetHeight, ctl = this.wrap.lastElementChild.offsetHeight;
    const y0 = Math.min(0.5, (hud + 14) / s.h), yh = Math.max(0.18, 1 - (hud + ctl + 28) / s.h);
    P.target((i) => { const a = P.artist[i] % na, pt = xy[a]; return [pt[0] + ox[i], y0 + (pt[1] + oy[i]) * yh]; });
    this.paint(ctx);
    this.copy();
  },
  copy() {
    if (!this.map) return;
    const m = this.map, lv = this.level, pub = m.published;
    this.pct.textContent = String(m.levels[lv]);
    this.bi.textContent = pub.bridge_index[lv].toFixed(2);
    const tap = Math.round(pub.tap_crossing_pct[lv]), auto = Math.round(pub.auto_crossing_pct[lv]);
    this.tapv.textContent = tap + '%'; this.autov.textContent = auto + '%';
    this.tapBar.style.width = tap + '%'; this.autoBar.style.width = auto + '%';
    this.cap.textContent = CAP[lv];
    this.dial.setAttribute('aria-valuetext', 'level ' + (lv + 1) + ' of 7: ' + m.levels[lv] + '% algorithmic, index ' + pub.bridge_index[lv].toFixed(2));
  },
  enter(ctx) {
    const P = ctx.particles; P.ease = 0.05; P.jitter = 0.5; P.big = false;
    if (!this.ready) return;
    this.position(ctx);
    this.setLevel(this.level, ctx);
  },
  leave() {},
  frame(g, t, bands, w, h, ctx) {
    if (ctx.reduced || !this.ready || !this.s) return;
    const s = this.s, cx = s.x + s.w / 2, cy = s.y + s.h / 2, r = Math.min(s.w, s.h) * (0.42 + bands.low * 0.05);
    g.strokeStyle = 'rgba(134,203,254,' + (0.08 + bands.high * 0.1) + ')'; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
  },
};
