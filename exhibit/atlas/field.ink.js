/* R10 THE INK (?field=ink): a stable-fluids bath (Stam 1999; trimmed port after Dobryakov's WebGL fluid, MIT) screened
   over the print. each play drops dye in play order where the room draws its dot, so the bath makes the room's picture,
   then bleeds. families dealt from threshold_grid as the globe deals them (the silent-day blur stays blurred). */
const { min, max, round, sqrt } = Math;
const FULL = { threshold: 1, universe: 1, wall: 1, calendar: 1 };
const RAMP = [[.2,.8,.25], [.65,.9,.12], [.9,.9,.3], [.1,.6,.62], [.1,.35,.95], [.2,.2,.7], [.55,.1,.85], [.85,.1,.8], [.9,.15,.25], [1,.4,.05]]; /* R11: no hue of the reserved code (mint, amber, violet, rose, ice) */
const POS = { electronic: 0, classical: .07, 'ambient/lofi': .15, 'folk/country': .24, other: .33, jazz: .42, 'world/desi': .5, experimental: .57, 'rock/metal': .64, soundtrack: .72, pop: .8, 'funk/disco': .88, 'hip-hop · r&b': 1 };
const SMOKE = [.34, .32, .43], COOL = [0.129,0.965,0.737], ROSE = [0.545,0.435,0.839]; /* the colour code: mint = tapped, violet = served */
const FAM0 = ['ambient/lofi', 'classical', 'electronic', 'experimental', 'folk/country', 'funk/disco', 'hip-hop · r&b', 'jazz', 'other', 'pop', 'rock/metal', 'soundtrack', 'world/desi', 'untagged'];
const CAP = { fam: 'one dye per family, dropped in the order i played. a picture of order, not a measurement.', arm: 'mint where i tapped, violet where the queue played. a picture of order, not a measurement.' };
function ramp(t) { const x = max(0, min(1, t)) * 9, k = min(8, x | 0), f = x - k, a = RAMP[k], b = RAMP[k + 1]; return [0, 1, 2].map((j) => a[j] + (b[j] - a[j]) * f); }
const VS = '#version 300 es\nin vec2 a;out vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0,1);}';
const H = '#version 300 es\nprecision highp float;precision mediump sampler2D;in vec2 v;out vec4 o;uniform vec2 T;';
const NB = (S) => ['-vec2(T.x,0)', '+vec2(T.x,0)', '-vec2(0,T.y)', '+vec2(0,T.y)'].map((d) => 'texture(' + S + ',v' + d + ')'), [L, R, B, A] = NB('V'), [cL, cR, cB, cA] = NB('C'), [dL, dR, dB, dA] = NB('D');
const FS = {
 curl: H + 'uniform sampler2D V;void main(){o=vec4(.5*(' + R + '.y-' + L + '.y-' + A + '.x+' + B + '.x),0,0,1);}',
 /* vorticity confinement + a curl-noise drift */
 vort: H + 'uniform sampler2D V,C;uniform float k,dt,t,dr,asp;void main(){float l=' + cL + '.x,r=' + cR + '.x,b=' + cB + '.x,u=' + cA + '.x,c=texture(C,v).x;' +
  'vec2 f=.5*vec2(abs(u)-abs(b),abs(r)-abs(l));f/=length(f)+1e-4;f*=k*c*vec2(1,-1);vec2 p=v*vec2(asp,1)*2.6;' +
  'float X=p.x*1.3+t*.11,Y=p.y*1.1-t*.09,E=p.x*.7-p.y*1.9+t*.07;vec2 d=vec2(-1.1*sin(X)*sin(Y)-1.14*cos(E),-1.3*cos(X)*cos(Y)-.42*cos(E));' +
  'o=vec4(clamp(texture(V,v).xy+(f+dr*vec2(d.x,-d.y))*dt,-900.,900.),0,1);}',
 div: H + 'uniform sampler2D V;void main(){float l=' + L + '.x,r=' + R + '.x,b=' + B + '.y,u=' + A + '.y;vec2 c=texture(V,v).xy;' +
  'if(v.x-T.x<0.)l=-c.x;if(v.x+T.x>1.)r=-c.x;if(v.y-T.y<0.)b=-c.y;if(v.y+T.y>1.)u=-c.y;o=vec4(.5*(r-l+u-b),0,0,1);}',
 clr: H + 'uniform sampler2D V;uniform float k;void main(){o=k*texture(V,v);}',
 jac: H + 'uniform sampler2D V,D;void main(){o=vec4(.25*(' + L + '.x+' + R + '.x+' + B + '.x+' + A + '.x-texture(D,v).x),0,0,1);}',
 grad: H + 'uniform sampler2D V,W;void main(){o=vec4(texture(W,v).xy-.5*vec2(' + R + '.x-' + L + '.x,' + A + '.x-' + B + '.x),0,1);}',
 advV: H + 'uniform sampler2D V;uniform float dt,ds;void main(){o=texture(V,v-dt*texture(V,v).xy*T)/(1.+ds*dt);}',
 /* dye creeps only into thinner ink, so two dyes keep a seam (no brown) */
 advD: H + 'uniform sampler2D V,D;uniform vec2 S;uniform float dt,bl,ds,kp;void main(){vec2 c=v-dt*texture(V,v).xy*S;vec4 d=texture(D,c),m=texture(D,c+vec2(T.x,0)),q=texture(D,c-vec2(T.x,0));' +
  'if(q.a>m.a)m=q;q=texture(D,c+vec2(0,T.y));if(q.a>m.a)m=q;q=texture(D,c-vec2(0,T.y));if(q.a>m.a)m=q;d+=(m-d)*bl*max(0.,m.a*kp-d.a);o=d*ds;}',
 /* chroma, sheen, a bright front, and a pale vein where two dyes meet (the crossing) */
 disp: H + 'uniform sampler2D D;uniform float I,g;vec3 h(vec4 c){return c.rgb/max(c.a,.002);}void main(){vec4 d=texture(D,v),l=' + dL + ',r=' + dR + ',b=' + dB + ',u=' + dA + ';' +
  'float a=d.a;vec3 c=h(d);c=clamp(mix(vec3(dot(c,vec3(.3,.55,.15))),c,1.55),0.,1.);' +
  'float s=(length(h(l)-h(r))+length(h(b)-h(u)))*min(min(l.a,r.a),min(b.a,u.a));vec2 G=vec2(r.a-l.a,u.a-b.a);' +
  'float df=dot(normalize(vec3(-G*g,1)),vec3(-.42,.5,.76)),i=1.-exp(-a*2.4);' +
  'vec3 e=c*i*(.5+.62*df)+vec3(.9,.86,1)*(pow(max(df,0.),30.)*i*.22+smoothstep(.18,.75,s)*.5);e*=1.+.8*smoothstep(.03,.22,length(G))*(1.-a);' +
  'e+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5)-.5)/180.;o=vec4(e*I,1);}',
 pts: '#version 300 es\nprecision highp float;precision highp int;in vec4 k;uniform int M;out vec4 o;void main(){vec2 q=gl_PointCoord*2.-1.;float g=exp(-dot(q,q)*3.2);if(M==0){float a=g*k.a;o=vec4(k.rgb*a,a);}else o=vec4(k.xy*g,0,0);}',
};
const PV = '#version 300 es\nprecision highp float;precision highp int;in vec2 p;in vec4 q;in float s;uniform vec3 C[16];uniform float Z;uniform int M;out vec4 k;void main(){gl_Position=vec4(p*2.-1.,0,1);gl_PointSize=max(1.,s*Z);' +
 'k=M==0?(q.x<0.?vec4(0):vec4(C[int(q.x)],q.y)):vec4(q.zw,0,0);}';
export const TUNE = { diss: .9985, bleed: .1, keep: .85, sheen: 5, curl: 9, drift: 1.6, fly: .1, stir: 16, px: 2 };
const ST = { on: false, hush: false, reason: '', room: '', mode: 'arm', tier: 0, frames: 0, drops: 0, ms: new Float32Array(240), mi: 0, hold: false, still: false, dye: 0, sim: 0, iters: 0, gpu: '' };
export function stats() {
 const a = Array.from(ST.ms.slice(0, min(ST.mi, 240))).sort((x, y) => x - y), q = (p) => (a.length ? +a[min(a.length - 1, (a.length * p) | 0)].toFixed(3) : 0);
 const o = Object.assign({}, ST, { p50: q(.5), p95: q(.95) }); delete o.ms; return o;
}
/* WebGL2, a hardware renderer, a renderable RGBA16F target */
const FB = 0x8d40, mk = (t) => document.createElement(t), $ = (i) => document.getElementById(i);
export function probe(cv) {
 let gl = null;
 try { gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' }); } catch (e) {}
 if (!gl) return { why: 'no webgl2' };
 const ri = gl.getExtension('WEBGL_debug_renderer_info'), rn = String(gl.getParameter(ri ? ri.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
 if (/swiftshader|llvmpipe|software|basic render/i.test(rn)) return { why: 'software renderer', rn };
 if (!gl.getExtension('EXT_color_buffer_float')) return { why: 'no half-float target', rn };
 const t = gl.createTexture(), f = gl.createFramebuffer();
 gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
 gl.bindFramebuffer(FB, f); gl.framebufferTexture2D(FB, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
 const good = gl.checkFramebufferStatus(FB) === gl.FRAMEBUFFER_COMPLETE;
 gl.bindFramebuffer(FB, null); gl.deleteFramebuffer(f); gl.deleteTexture(t);
 return good ? { gl, rn } : { why: 'no half-float target', rn };
}
export function mount(ctx, api) {
 const P = api.P, n = P.n, reduced = !!api.reduced, low = !!api.lowPower, X = window.__exhibit;
 if (X) X.ink = { stats, tune: TUNE };
 const cv = mk('canvas'); cv.id = 'ink'; cv.className = 'layer'; cv.setAttribute('aria-hidden', 'true');
 const pr = probe(cv); ST.gpu = pr.rn || '';
 if (!pr.gl) { ST.reason = pr.why; return null; }
 const gl = pr.gl, de = document.documentElement, now = () => performance.now();
 const css = mk('style');
 css.textContent = '#ink{z-index:0;mix-blend-mode:screen;opacity:0;transition:opacity 1.2s}html.ink-on #neb{opacity:.35}' +
    '#ink-key{position:fixed;left:4%;right:4%;top:0;z-index:40;display:flex;flex-wrap:wrap;justify-content:center;gap:2px 10px;scroll-margin:0 env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);visibility:hidden;' +
  'margin:0;padding:6px;font:10px/1.5 var(--mono);color:var(--ink);background:#0a0118c8;pointer-events:none;opacity:0;transition:opacity .4s,visibility 0s .4s}' +
  '#ink-key.on{opacity:1;visibility:visible;transition:opacity .4s}#ink-key i{display:inline-block;width:9px;height:9px;margin-right:4px;border-radius:50%}#ink-key em{flex-basis:100%;text-align:center;font-style:normal;color:var(--mute)}' +
  /* R13 CHROME3: the key is the visitor's own (a hold, two fingers, i): while it shows, the line slot under the stage gives way */
  '';
 document.head.appendChild(css);
 const ref = $('atlas-footground') || $('overlay');
 ref.parentNode.insertBefore(cv, ref); de.classList.add('ink-on'); ST.on = true;
 const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
 const vsh = sh(gl.VERTEX_SHADER, VS), PR = {};
 for (const k in FS) {
  const p = gl.createProgram(); gl.attachShader(p, k === 'pts' ? sh(gl.VERTEX_SHADER, PV) : vsh); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS[k]));
  ['a', 'q', 's'].forEach((nm, j) => gl.bindAttribLocation(p, j, k === 'pts' && !j ? 'p' : nm));
  gl.linkProgram(p); PR[k] = { p, u: {} };
 }
 const use = (k) => { const o = PR[k]; gl.useProgram(o.p); return o; };
 const U = (o, nm) => (nm in o.u ? o.u[nm] : (o.u[nm] = gl.getUniformLocation(o.p, nm)));
 const tri = gl.createVertexArray();
 gl.bindVertexArray(tri); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
 /* 7 floats a point: x, y, colour, weight, vx, vy, size */
 const MAXP = low ? 1400 : 3200, PB = new Float32Array(MAXP * 7), PS = new Float32Array(400 * 7);
 function vao(bytes) {
  const va = gl.createVertexArray(), b = gl.createBuffer(); gl.bindVertexArray(va); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.DYNAMIC_DRAW);
  [2, 4, 1].forEach((c, j) => { gl.enableVertexAttribArray(j); gl.vertexAttribPointer(j, c, gl.FLOAT, false, 28, [0, 8, 24][j]); });
  gl.bindVertexArray(null); return { va, b };
 }
 const VD = vao(PB.byteLength), VSt = vao(PS.byteLength);
 function fbo(w, h) {
  const t = gl.createTexture(), f = gl.createFramebuffer(), T2 = gl.TEXTURE_2D; gl.bindTexture(T2, t);
  [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([a, b]) => gl.texParameteri(T2, a, b));
  gl.texImage2D(T2, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.bindFramebuffer(FB, f); gl.framebufferTexture2D(FB, gl.COLOR_ATTACHMENT0, T2, t, 0);
  gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  return { t, f };
 }
 const pair = (w, h) => { const o = { r: fbo(w, h), w: fbo(w, h), sw() { const x = o.r; o.r = o.w; o.w = x; } }; return o; };
 const del = (...xs) => xs.forEach((x) => { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); });
 let VEL, PRS, DYE, DIV, CURL, sw = 0, shh = 0, dw = 0, dh = 0, CW = 0, CH = 0;
 /* grids from the short side: 128 sim / 256 dye (tier 1: 96 / 192) */
 const DPR = () => min(devicePixelRatio || 1, low ? TUNE.px : 1.5);
 function size() {
  const W = innerWidth, Hh = innerHeight, asp = W / Hh, s = ST.tier ? 96 : 128, d = ST.tier ? 192 : 256, lg = (z) => (asp >= 1 ? [round(z * asp), z] : [z, round(z / asp)]);
  const [nw, nh] = lg(s), [mw, mh] = lg(d);
  CW = round(W * DPR()); CH = round(Hh * DPR()); if (cv.width !== CW || cv.height !== CH) { cv.width = CW; cv.height = CH; }
  if (nw === sw && nh === shh && mw === dw && mh === dh) return;
  const old = DYE, ow = dw, oh = dh;
  if (VEL) del(VEL.r, VEL.w, PRS.r, PRS.w, DIV, CURL);
  sw = nw; shh = nh; dw = mw; dh = mh; ST.sim = min(sw, shh); ST.dye = min(dw, dh);
  VEL = pair(sw, shh); PRS = pair(sw, shh); DIV = fbo(sw, shh); CURL = fbo(sw, shh); DYE = pair(dw, dh);
  if (old) { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, old.r.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, DYE.r.f); gl.blitFramebuffer(0, 0, ow, oh, 0, 0, dw, dh, gl.COLOR_BUFFER_BIT, gl.LINEAR); del(old.r, old.w); }
 }
 size();
 function pass(k, tgt, w, h, set) {
  const o = use(k), dy = k === 'advD' || k === 'disp'; gl.bindVertexArray(tri); gl.bindFramebuffer(FB, tgt ? tgt.f : null); gl.viewport(0, 0, w, h);
  gl.uniform2f(U(o, 'T'), 1 / (dy ? dw : w), 1 / (dy ? dh : h));
  let unit = 0; set(o, (nm, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U(o, nm), unit++); });
  gl.drawArrays(gl.TRIANGLES, 0, 3);
 }
 const f1 = (o, nm, x) => gl.uniform1f(U(o, nm), x);
 const PAL = new Float32Array(48); let FAMN = FAM0, TOT = null;
 function palette(names) {
  FAMN = names;
  names.forEach((nm, f) => {
   let c = POS[nm] != null ? ramp(POS[nm]) : SMOKE;
   if (TOT && POS[nm] != null) { const k = .42 * (1 - min(1, 1.6 * sqrt(TOT[f] / max(...TOT)))); c = c.map((x) => x + (1 - x) * k); }
   PAL.set(c, f * 3);
  });
  PAL.set(COOL, 42); PAL.set(ROSE, 45);
 }
 palette(FAM0);
 /* families dealt as the globe deals them: famI by index (index = place in time), famT through the stride */
 const famI = new Uint8Array(n).fill(13), famT = new Uint8Array(n).fill(13), ordT = new Int32Array(n), armT = new Uint8Array(n);
 for (let i = 0; i < n; i++) ordT[i] = i;
 let dealt = false, armed = false, TCF = null;
 ctx.data('threshold_grid').then((G) => {
  const g = G && G.g, nD = G && G.days | 0, F = 14; if (!g || g.length !== nD * F) return;
  const K = nD * F, cum = new Float64Array(K + 1); TOT = new Array(F).fill(0);
  for (let k = 0; k < K; k++) { cum[k + 1] = cum[k] + (g[k] > 0 ? g[k] : 0); TOT[k % F] += g[k]; }
  const tot = cum[K]; palette(Array.isArray(G.fam_order) && G.fam_order.length === F ? G.fam_order : FAM0);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a); let qs = max(1, round(n * .6180339887)); while (n > 1 && gcd(qs, n) !== 1) qs++;
  for (let i = 0; i < n; i++) ordT[(i * qs) % n] = i;
  let k = 0; for (let p = 0; p < n; p++) { const j = min(tot - 1, Math.floor((p + .5) * tot / n)); while (k < K - 1 && cum[k + 1] <= j) k++; famI[p] = famT[ordT[p]] = k % F; }
  /* the universe colours a dot by its artist's family; its exact colour (full or faint) names it */
  TCF = new Map(); const bg = 0x0a0118;
  FAMN.forEach((nm, f) => { const c = ctx.famColor(nm) >>> 0; [0, .35].forEach((q) => { const v = [0, 8, 16].map((s) => ((((c >> s) & 255) * (1 - q) + ((bg >> s) & 255) * q) | 0)); TCF.set((0xff000000 | (v[0] << 16) | (v[1] << 8) | v[2]) >>> 0, f); }); });
  dealt = true; restart();
 }).catch(() => {});
 /* by hand: P.prov by month (wall.json); the globe re-reads the same months at its own play order */
 function arm() {
  if (armed) return; armed = true;
  Promise.resolve(ctx.identity && ctx.identity()).then(() => ctx.data('wall')).then((w) => {
   if (!w || !w.tap) return; const E = []; let acc = 0;
   for (let k = 0; k < w.tap.length; k++) { const m = w.tap[k] + w.shuffle[k] + w.served[k]; acc += m; E.push([acc, w.tap[k] / (m || 1)]); }
   let k = 0; for (let p = 0; p < n; p++) { const play = (p + .5) * (acc / n); while (k < E.length - 1 && play >= E[k][0]) k++; const i = ordT[p]; armT[i] = ctx.hash(i) < E[k][1] ? 0 : 1; }
  }).catch(() => {});
 }
 const PTR = new Map(), offs = [], splats = []; let held = 0, two = null, keyT = 0;
 const keyEl = mk('p'); keyEl.id = 'ink-key'; keyEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(keyEl);
 /* R13 CHROME3: the key sat at the foot of the screen at z 40, straight across the phone dock's keys (and the desk deck, and
    the line under a sideways stage). it now sits on the chrome, never in it: upright just above the card (and the dock), sideways
    and on the desk in the band under the stage (inside the stage's foot when that band is too short), centred on the stage,
    stepping up over any of the room's own controls. it stays for its read time even after a short hold */
 let keyHide = 0, keyShown = 0, keyNeed = 0;
 function placeKey() {
  const W = innerWidth, H = innerHeight, st = keyEl.style, kh = keyEl.offsetHeight;
  let s = null; try { s = ctx.stage(); } catch (e) {}
  if (!s || !(s.w > 0)) s = { x: 0, y: 0, w: W, h: H };
  const box = (e) => { if (!e || !e.getClientRects().length) return null; const c = getComputedStyle(e); return c.visibility === 'hidden' || c.display === 'none' || +c.opacity < 0.05 ? null : e.getBoundingClientRect(); };
  const tb = box($('top')), topLim = (tb && tb.bottom < H / 2 ? tb.bottom : 0) + 4;
  const kcs = getComputedStyle(keyEl), sab = parseFloat(kcs.scrollMarginBottom) || 0, sal = parseFloat(kcs.scrollMarginLeft) || 0, sar = parseFloat(kcs.scrollMarginRight) || 0;
  let x0 = max(8 + sal, round(s.x)), x1 = min(W - 8 - sar, round(s.x + s.w));
  /* a narrow landscape stage (659 wide: 165 px) would stack the thirteen families into a tower; widen the band round it, clear of the card column */
  if (W > H * 1.15 && x1 - x0 < 360) { const ir = box($('atlas-info')), lo = max(8 + sal, ir && ir.right < W / 2 ? round(ir.right) + 8 : 0), hi = W - 8 - sar, ww = min(360, hi - lo); x0 = round(max(lo, min((x0 + x1) / 2 - ww / 2, hi - ww))); x1 = x0 + ww; }
  st.left = x0 + 'px'; st.right = (W - x1) + 'px';
  let foot = H - sab - 4;
  for (const e of [$('atlas-dock'), de.classList.contains('atlas-deck') ? $('top') : null]) { const r = box(e); if (r && r.top > H / 2) foot = min(foot, r.top - 6); }
  let top;
  if (W <= H * 1.15) { const r = box($('atlas-info')) || box($('atlas-show')); top = min(foot, r && r.top > H / 3 ? r.top - 6 : foot) - kh; }
  else { top = s.y + s.h + 4; if (top + kh > foot) top = s.y + s.h - kh - 6; }
  const sec = document.querySelector('section[data-room].is-active'), L = x0, R = x1;
  const keeps = [...(sec ? sec.querySelectorAll('button,[data-keepout],input,select,[class*="hud"]') : []), ...document.querySelectorAll('.atlas-ladder-chip,#exdock:not(.is-off),#atlas-toast.on,#atlas-onboard:not([hidden]),.uf-ks.on')].map(box).filter((r) => r && r.width && r.height && r.left < R && r.right > L);
  for (let g = 0; g < 10; g++) { const hit = keeps.filter((r) => r.top < top + kh + 4 && r.bottom > top - 4); if (!hit.length) break; top = min(...hit.map((r) => r.top)) - kh - 6; }
  st.top = round(max(topLim, min(top, H - sab - kh - 2))) + 'px';
 }
 function keyCheck() {
  if (!keyEl.classList.contains('on')) return;
  if (!ST.hold && now() - keyT > 4000 && now() - keyShown >= keyNeed) key(false); else { placeKey(); keyHide = setTimeout(keyCheck, 200); } /* the stage and the panels can move under it (a listening post opening) */
 }
 function key(show) {
  clearTimeout(keyHide);
  if (show) {
   const rgb = (f) => 'rgb(' + [0, 1, 2].map((j) => round(PAL[f * 3 + j] * 255)).join(',') + ')', am = ST.mode === 'arm', was = keyEl.textContent;
   keyEl.innerHTML = (am ? [[14, 'i tapped'], [15, 'the queue']] : FAMN.map((nm, f) => [f, nm])).map(([f, nm]) => '<span><i style="background:' + rgb(f) + '"></i>' + nm + '</span>').join('') +
    '<em>hold to slow it · two fingers or i: ' + (am ? 'by family' : 'by hand') + '</em>';
   keyT = now();
   if (!keyEl.classList.contains('on') || was !== keyEl.textContent) { keyShown = keyT; keyNeed = 1500 + (keyEl.textContent.length + 40) * 28; }
   placeKey(); keyHide = setTimeout(keyCheck, 200);
  }
  de.classList.toggle('ink-key-on', !!show);
  keyEl.classList.toggle('on', !!show);
 }
 let userMode = false, roomT = now(), touched = '', capTm = 0, lastRoom = '';
 /* the bath's own line comes 6.6 s after the room's; until it has typed the chrome may not dim, or a quiet-mode
    visitor (idle at 6 s) would see the chrome half-fade and relight for that line */
 const lineDue = (on) => { try { ctx.idle.hold('ink-line', on); } catch (e) {} };
 /* R11: by hand (mint taps, violet queue) is the default under every key; family dyes only in the universe, whose key names families */
 function autoMode() {
  if (ST.room === lastRoom) return; lastRoom = ST.room;
  roomT = now(); clearTimeout(capTm); lineDue(false);
  if (ST.on && FULL[ST.room]) { lineDue(true); capTm = setTimeout(() => { lineDue(false); if (ST.on) caption(); }, 6600); }
  if (!userMode) { ST.mode = ST.room === 'universe' ? 'fam' : 'arm'; if (ST.mode === 'arm') arm(); }
 }
 function toggle() { userMode = true; touched = ST.room; ST.mode = ST.mode === 'arm' ? 'fam' : 'arm'; if (ST.mode === 'arm') arm(); caption(); key(true); restart(true); }
 const on = (t, f) => { addEventListener(t, f, { passive: true, capture: true }); offs.push(() => removeEventListener(t, f, true)); };
 on('pointerdown', (e) => {
  PTR.set(e.pointerId, { x: e.clientX, y: e.clientY, mv: 0 });
  if (PTR.size === 2 && e.pointerType === 'touch') two = { t: now(), mv: 0 };
  clearTimeout(held); held = setTimeout(() => { const q = PTR.get(e.pointerId); if (q && q.mv < 10 && PTR.size === 1) { ST.hold = true; key(true); } }, 380);
 });
 on('pointermove', (e) => {
  const q = PTR.get(e.pointerId); if (!q) return;
  const dx = e.clientX - q.x, dy = e.clientY - q.y, d = Math.abs(dx) + Math.abs(dy); q.mv += d; if (two) two.mv += d;
  q.x = e.clientX; q.y = e.clientY;
  if (q.mv > 10 && !reduced && splats.length < 96) splats.push(e.clientX, e.clientY, dx, dy);
 });
 const up = (e) => {
  PTR.delete(e.pointerId); clearTimeout(held);
  if (two && !PTR.size) { if (now() - two.t < 450 && two.mv < 30) toggle(); two = null; }
  if (ST.hold && !PTR.size) { ST.hold = false; keyT = now() - 2200; }
 };
 on('pointerup', up); on('pointercancel', up);
 const kOff = ctx.keys && ctx.keys.on ? ctx.keys.on('i', toggle) : null;
 /* R10 merge: the bath's line goes through the chrome's one caption slot (ctx.atlas.capFor), after any line the veins
    hold while they are live, so a room ever shows one caption and the phone card keeps its height */
 const AT = ctx.atlas, prevCap = AT && typeof AT.capFor === 'function' ? AT.capFor : null;
 const inkCap = (id) => { const sl = AT && AT.slime; if (!ST.on || ST.hush || (sl && sl.on && sl.get && sl.get().live)) return null; if (!FULL[ST.room] || ST.room !== id) return null; /* R11: the room's own line is read first; the bath speaks after it has sat, or once touched, never unprompted on the threshold */ return touched === id || (id !== 'threshold' && now() - roomT > 6500) ? CAP[ST.mode] : null; };
 if (AT) AT.capFor = (id, a) => (prevCap ? prevCap(id, a) : null) || inkCap(id);
 function caption() {
  de.classList.toggle('ink-off', !FULL[ST.room]);
  try { const ta = ctx.tour && ctx.tour.active; if (!(ta && ta.playing) && ctx.caption) ctx.caption.clear(); } catch (e) {}
 }
 let cur = 0, first = true, gatherN = 0, fadeT = 0, dropped = 0;
 function restart(keep) { cur = 0; first = true; gatherN = 0; dropped = 0; if (!keep) fadeT = now(); if (reduced) settle(); }
 const room = () => { const r = api.rooms && api.rooms[ctx.index]; return r ? r.id : ''; };
 const mat = () => { const M = api.matrix(); return M ? [M[0], M[4], M[5]] : [1, 0, 0]; };
 function batch(budget) {
  const [ma, me, mf] = mat(), W = innerWidth, Hh = innerHeight, thr = ST.room === 'threshold', uni = ST.room === 'universe' && TCF, ar = ST.mode === 'arm';
  const X = P.x, Y = P.y, TX = P.tx, WT = P.w, GM = P.glyph, TC = P.tc, PO = P.prov, sz = (low ? 3.4 : 2.6) / min(dw, dh), wk = low ? .9 : .55;
  let m = 0, seen = 0;
  while (m < budget && seen < budget * 3) {
   const i = thr ? ordT[cur] : cur; if (++cur >= n) { cur = 0; first = false; } seen++;
   if (TX[i] < -40) continue;
   const w = GM[i] ? WT[i] / 255 : 1; if (w <= .02) continue;
   const sx = X[i] * ma + me, sy = Y[i] * ma + mf; if (sx < -8 || sy < -8 || sx > W + 8 || sy > Hh + 8) continue;
   let c; if (ar) c = (thr ? armT[i] : PO[i]) ? 15 : 14; else { c = thr ? famT[i] : famI[i]; if (uni) { const u = TCF.get(TC[i]); if (u !== undefined) c = u; } }
   const o = m * 7; PB[o] = sx / W; PB[o + 1] = 1 - sy / Hh; PB[o + 2] = c; PB[o + 3] = min(.95, (.35 + .65 * w) * wk); PB[o + 4] = PB[o + 5] = 0; PB[o + 6] = sz * (.8 + .5 * w); m++;
  }
  ST.drops += m; dropped += m; return m;
 }
 function stirs(moving) {
  const W = innerWidth, Hh = innerHeight, [ma, me, mf] = mat(); let m = 0;
  const put = (x, y, vx, vy, s) => PS.set([x / W, 1 - y / Hh, -1, 0, vx, -vy, s], m++ * 7);
  if (moving) for (let k = 0; k < 90; k++) { const i = (Math.random() * n) | 0, dx = (P.tx[i] - P.x[i]) * ma, dy = (P.ty[i] - P.y[i]) * ma; if (P.tx[i] > -40 && dx * dx + dy * dy > 16) put(P.x[i] * ma + me, P.y[i] * ma + mf, dx * TUNE.fly, dy * TUNE.fly, .05); }
  for (let k = 0; k < splats.length; k += 4) put(splats[k], splats[k + 1], splats[k + 2] * TUNE.stir, splats[k + 3] * TUNE.stir, .17);
  splats.length = 0; return m;
 }
 function points(V, arr, m, mode, tgt, w, h) {
  if (!m) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, V.b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr, 0, m * 7);
  const o = use('pts'); gl.bindVertexArray(V.va); gl.bindFramebuffer(FB, tgt.f); gl.viewport(0, 0, w, h);
  gl.uniform3fv(U(o, 'C'), PAL); gl.uniform1i(U(o, 'M'), mode); f1(o, 'Z', min(w, h));
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, mode ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.POINTS, 0, m); gl.disable(gl.BLEND);
 }
 function step(dt, t, ms, md, bands) {
  const it = ST.iters = ST.tier ? 8 : low ? 14 : 20, slow = ST.hold ? .14 : 1, d = dt * slow, rest = reduced ? 0 : 1;
  if (!ST.tier) pass('curl', CURL, sw, shh, (o, tx) => tx('V', VEL.r.t));
  pass('vort', VEL.w, sw, shh, (o, tx) => { tx('V', VEL.r.t); tx('C', CURL.t); f1(o, 'k', ST.tier ? 0 : TUNE.curl * rest); f1(o, 'dt', d); f1(o, 't', t * .001); f1(o, 'asp', sw / shh); f1(o, 'dr', rest * TUNE.drift * (1 + 4 * min(.5, bands.low || 0))); }); VEL.sw();
  points(VSt, PS, ms, 1, VEL.r, sw, shh);
  pass('div', DIV, sw, shh, (o, tx) => tx('V', VEL.r.t));
  pass('clr', PRS.w, sw, shh, (o, tx) => { tx('V', PRS.r.t); f1(o, 'k', .8); }); PRS.sw();
  for (let k = 0; k < it; k++) { pass('jac', PRS.w, sw, shh, (o, tx) => { tx('V', PRS.r.t); tx('D', DIV.t); }); PRS.sw(); }
  pass('grad', VEL.w, sw, shh, (o, tx) => { tx('V', PRS.r.t); tx('W', VEL.r.t); }); VEL.sw();
  pass('advV', VEL.w, sw, shh, (o, tx) => { tx('V', VEL.r.t); f1(o, 'dt', d); f1(o, 'ds', .6); }); VEL.sw();
  points(VD, PB, md, 0, DYE.r, dw, dh);
  const fade = !dropped && now() - fadeT < 3000 ? .93 : TUNE.diss;
  pass('advD', DYE.w, dw, dh, (o, tx) => { tx('V', VEL.r.t); tx('D', DYE.r.t); gl.uniform2f(U(o, 'S'), 1 / sw, 1 / shh); f1(o, 'dt', d); f1(o, 'bl', TUNE.bleed * slow); f1(o, 'kp', TUNE.keep); f1(o, 'ds', 1 - (1 - fade) * slow); }); DYE.sw();
 }
 const show = () => pass('disp', null, CW, CH, (o, tx) => { tx('D', DYE.r.t); f1(o, 'I', 1); f1(o, 'g', TUNE.sheen); });
 const vis = () => { cv.style.opacity = FULL[ST.room] ? '1' : '.28'; };
 /* reduced motion: all drops at once, a few still bleed steps, one frame, then nothing */
 let settleT = 0;
 function settle() {
  clearTimeout(settleT);
  settleT = setTimeout(function chunk() {
   if (!ST.on) return;
   if (!dealt) { settleT = setTimeout(chunk, 200); return; }
   if (!ST.still || ST.room !== room()) { ST.room = room(); autoMode(); caption(); cur = 0; first = true; ST.still = true; gl.bindFramebuffer(FB, DYE.r.f); gl.clear(gl.COLOR_BUFFER_BIT); }
   for (let q = 0; q < 4 && first; q++) points(VD, PB, batch(MAXP), 0, DYE.r, dw, dh);
   if (first) { settleT = setTimeout(chunk, 0); return; }
   for (let q = 0; q < 6; q++) step(.016, 0, 0, 0, {});
   show(); cv.style.transition = 'none'; vis(); ST.frames++;
  }, 450);
 }
 let frameN = 0, slowN = 0, odd = 0, linked = false;
 const offStop = ctx.onStop ? ctx.onStop(() => { ST.room = room(); autoMode(); ST.still = false; caption(); restart(); if (!reduced) vis(); }) : null;
 ST.room = room(); autoMode(); caption(); if (!reduced) requestAnimationFrame(vis);
 const offGov = api.onGov ? api.onGov((k) => { if (k >= 3 && !ST.tier) { ST.tier = 1; size(); } }) : null;
 cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); off('context lost'); });
 function frame(t, dtt) {
  if (!ST.on || ST.hush) return;
  if (!linked) { linked = true; for (const k in PR) if (!gl.getProgramParameter(PR[k].p, gl.LINK_STATUS)) { off('shader ' + k); return; } }
  const t0 = now(), dt = min(.033, (dtt || 16) / 1000);
  /* governor: ~2 s under 40 fps drops to 192 dye / 8 passes / no curl, then every other frame, then frozen */
  if (dtt > 0 && dtt < 200 && ++frameN > 90) { slowN = dtt > 25 ? slowN + 1 : max(0, slowN - .5); if (slowN > 120 && ST.tier < 3) { ST.tier++; slowN = frameN = 0; if (ST.tier === 1) size(); } }
  if (ST.tier >= 3 || ((ST.tier === 2 || !FULL[ST.room]) && (odd ^= 1))) return;
  size();
  /* the drops wait for the room's dots to gather; the flight stirs meanwhile */
  let mv = 0; for (let k = 0; k < 48; k++) { const i = ((k * 2654435761) >>> 0) % n; if (P.tx[i] > -40) { const a = P.tx[i] - P.x[i], b = P.ty[i] - P.y[i]; if (a * a + b * b > 36) mv++; } }
  const moving = mv > 8; gatherN = moving ? 0 : gatherN + 1;
  const md = dealt && gatherN > 6 ? batch(min(MAXP, Math.ceil(n / (first ? (low ? 110 : 150) : (low ? 540 : 700))))) : 0;
  step(dt, t, stirs(moving), md, ctx.audio && ctx.audio.bands ? ctx.audio.bands() : {});
  show(); ST.frames++;
  ST.ms[ST.mi++ % 240] = now() - t0;
 }
 const offFrame = reduced ? null : ctx.onFrame(frame);
 if (reduced) settle();
 function off(why) {
  ST.on = false; ST.reason = why || 'off'; offs.forEach((f) => f()); [offFrame, offStop, offGov, kOff].forEach((f) => f && f());
  clearTimeout(capTm); clearTimeout(keyHide); lineDue(false); cv.remove(); keyEl.remove(); css.remove(); de.classList.remove('ink-on', 'ink-off', 'ink-key-on'); caption();
 }
 /* R11 PRESS: a room may hush the bath while it covers the stage (no frames, no caption), and wake it again after */
 const hush = (v) => { ST.hush = !!v; cv.style.visibility = v ? 'hidden' : ''; };
 return { stats, off, toggle, hush };
}
export default { mount, probe, stats };
