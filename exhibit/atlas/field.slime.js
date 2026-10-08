/* R10 THE SLIME CHAIN: a WebGL2 physarum (Jones 2010) under the print. food = stars (plays bucket); scent = the edges
   (tap_n mint, auto_n violet, pale where both share). lives in the room's layout, so it turns with the stars. ?field=slime.
   no WebGL2 / renderable half float / shader: stands down. reduced motion: one still frame. */
const LIVE = { universe: 1, chain: 1 };
const CAP = {
  both: 'mint: my taps. violet: the queue. thick where i went often. a picture, not a forecast.',
  tap: 'only my taps grow now, thick where i went often. a picture of the links, not a forecast.',
  queue: 'only the queue grows now, thick where it went often. a picture, not a forecast.',
};
/* a: agent rows, t: trail side, k: step every k frames, d: dpr cap. 3 = the shell governor is struggling */
const TIERS = [{ a: 256, t: 512, k: 1, d: 2 }, { a: 128, t: 384, k: 1, d: 1.5 }, { a: 64, t: 384, k: 2, d: 1 }, { a: 64, t: 384, k: 4, d: 1 }];
const AW = 256, SPW = 2048, SUB = '0.16';
/* the colour code (shell.js PAL): mint = i tapped it, violet = the machine served it; rose stays reserved for killed findings */
const ICE = [0.129,0.965,0.737], ROSE = [0.545,0.435,0.839];
const V3 = '#version 300 es\n', TRI = V3 + 'void main(){gl_Position=vec4(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.,0.,1.);}';
/* agents: xy, heading, age; the first uK.z are the cool species */
const FS_STEP = V3 + `precision highp float;precision highp int;
uniform highp sampler2D uS,uSp;uniform mediump sampler2D uT,uF;uniform vec4 uP,uK,uFood[4];uniform float uN,uSeed,uRb;out vec4 o;
uint pcg(uint v){uint s=v*747796405u+2891336453u;uint w=((s>>((s>>28u)+4u))^s)*277803737u;return (w>>22u)^w;}
float rnd(uint v){return float(pcg(v))*(1./4294967295.);}
float sense(vec2 p,float sp){vec4 t=texture(uT,p),f=texture(uF,p);float s=.3*mix(t.r,t.g,sp)+.07*mix(t.g,t.r,sp)+uK.w*mix(f.r,f.g,sp);
for(int i=0;i<4;i++){vec4 q=uFood[i];if(q.z>0.){vec2 d=p-q.xy;s+=q.z*exp(-dot(d,d)/q.w);}}return s;}
vec2 dir(float a){return vec2(cos(a),sin(a));}
void main(){ivec2 ij=ivec2(gl_FragCoord.xy);vec4 a=texelFetch(uS,ij,0);uint id=uint(ij.y*${AW}+ij.x);
float sp=(float(id)+.5)/uN<uK.z?0.:1.;uint sd=id*1973u+uint(uSeed)*9277u;float r1=rnd(sd),r2=rnd(sd^0x9e3779b9u);
vec2 p=a.xy;float th=a.z;
if(r1<uK.y||length(p-.5)>uRb){vec4 s=texelFetch(uSp,ivec2(int(r2*${SPW}.),int(sp)),0);
o=vec4(s.xy+(vec2(rnd(sd+7u),rnd(sd+11u))-.5)*s.z,rnd(sd+13u)*6.2832,0.);return;}
float F=sense(p+uP.z*dir(th),sp),L=sense(p+uP.z*dir(th+uP.x),sp),R=sense(p+uP.z*dir(th-uP.x),sp);
if(F>L&&F>R){}else if(F<L&&F<R)th+=(r2<.5?-1.:1.)*uP.y;else if(L>R)th+=uP.y*(.5+r2*.5);else th-=uP.y*(.5+r2*.5);
o=vec4(p+uP.w*dir(th),th,a.w+1.);}`;
const VS_DEP = V3 + `uniform highp sampler2D uS;uniform float uN,uG;out vec4 vC;
void main(){int id=gl_VertexID;vec4 a=texelFetch(uS,ivec2(id%${AW},id/${AW}),0);
gl_Position=vec4(a.xy*2.-1.,0.,1.);gl_PointSize=1.;vC=(float(id)+.5)/uN<uG?vec4(1,0,0,0):vec4(0,1,0,0);}`;
const FS_DEP = V3 + 'precision mediump float;in vec4 vC;out vec4 o;uniform float uA;void main(){o=vC*uA;}';
/* 3x3 binomial blur from 4 bilinear taps, then decay */
const FS_DIF = V3 + `precision mediump float;uniform sampler2D uT;uniform vec2 uPx,uDD;out vec4 o;
vec4 at(vec2 u,float x,float y){return texture(uT,u+vec2(x,y)*uPx);}
void main(){vec2 u=gl_FragCoord.xy*uPx;vec4 b=.25*(at(u,-.5,-.5)+at(u,.5,-.5)+at(u,-.5,.5)+at(u,.5,.5));o=min(mix(texture(uT,u),b,uDD.x)*uDD.y,vec4(80.));}`;
/* scent: links as capsules, stars as discs */
const VS_SC = V3 + `in vec2 aC;in vec4 aAB;in vec3 aW;out vec2 vP;flat out vec4 vAB;flat out vec3 vW;
void main(){vec2 A=aAB.xy,B=aAB.zw,d=B-A;float l=length(d);d=l>1e-6?d/l:vec2(1,0);float r=aW.z*2.2;
vP=mix(A-d*r,B+d*r,aC.x)+vec2(-d.y,d.x)*r*aC.y;vAB=aAB;vW=aW;gl_Position=vec4(vP*2.-1.,0.,1.);}`;
const FS_SC = V3 + `precision highp float;in vec2 vP;flat in vec4 vAB;flat in vec3 vW;out vec4 o;
void main(){vec2 pa=vP-vAB.xy,ba=vAB.zw-vAB.xy;vec2 q=pa-ba*clamp(dot(pa,ba)/max(dot(ba,ba),1e-9),0.,1.);o=vec4(vW.xy*exp(-dot(q,q)/(vW.z*vW.z)),0.,0.);}`;
/* composite through the room's homography (perspective via w); pale where both share; 6-tap halo */
const VS_CMP = V3 + `in vec2 aC;uniform mat3 uH;uniform vec2 uRes;out vec2 vU;
void main(){vec3 h=uH*vec3(aC,1.);vU=aC;gl_Position=vec4(h.x*2./uRes.x-h.z,h.z-h.y*2./uRes.y,0.,h.z);}`;
const FS_CMP = V3 + `precision mediump float;in vec2 vU;uniform sampler2D uT;uniform vec2 uTx;uniform vec4 uC;uniform vec3 uI,uR;out vec4 o;
void main(){vec2 t=texture(uT,vU).rg,g=vec2(0);
for(int i=0;i<6;i++){float a=float(i)*1.0472+.5;g+=texture(uT,vU+vec2(cos(a),sin(a))*uTx*3.5).rg;}
vec2 e=1.-exp(-uC.x*t),h=1.-exp(-uC.x*.09*g);
vec3 c=uI*e.x+uR*e.y+vec3(1.,.95,1.)*pow(e.x*e.y,.7)*1.3+(uI*h.x+uR*h.y)*uC.y;
vec2 m=min(vU,1.-vU);float f=smoothstep(0.,.07,min(m.x,m.y));if(uC.w>0.)f*=1.-smoothstep(.465,.5,length(vU-.5));
c*=f*uC.z;o=vec4(c,clamp(max(c.r,max(c.g,c.b)),0.,1.));}`;

export function mount(ctx, deps) {
  const m0 = performance.now(), A = ctx.atlas, api = { on: false, reason: '', tier: 0, room: '', steps: 0, composes: 0, frameMs: [], cpuMs: [], still: false };
  A.slime = api;
  const fail = (r) => { api.on = false; api.reason = r; return api; };
  const cv = document.createElement('canvas');
  let gl = null;
  try { gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch (e) {}
  if (!gl) return fail('no webgl2');
  const cbf = gl.getExtension('EXT_color_buffer_float'), cbh = gl.getExtension('EXT_color_buffer_half_float');
  if (!cbf && !cbh) return fail('no renderable float');
  const PSC = gl.getExtension('KHR_parallel_shader_compile'), TX = gl.TEXTURE_2D, FB = gl.FRAMEBUFFER;
  const tex = (w, h, f32, lin, data) => {
    const t = gl.createTexture(), fl = lin ? gl.LINEAR : gl.NEAREST; gl.bindTexture(TX, t);
    gl.texImage2D(TX, 0, f32 ? gl.RGBA32F : gl.RGBA16F, w, h, 0, gl.RGBA, data ? gl.FLOAT : f32 ? gl.FLOAT : gl.HALF_FLOAT, data || null);
    [[gl.TEXTURE_MIN_FILTER, fl], [gl.TEXTURE_MAG_FILTER, fl], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(TX, k, v));
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(FB, fb); gl.framebufferTexture2D(FB, gl.COLOR_ATTACHMENT0, TX, t, 0);
    const ok = gl.checkFramebufferStatus(FB) === gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(FB, null);
    const o = { t, fb }; if (!ok) { del(o); return null; } return o;
  };
  const del = (o) => { if (o) { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.fb); } };
  const p16 = tex(4, 4, false, true); if (!p16) return fail('half float not renderable');
  const p32 = cbf && tex(4, 4, true, false), SF = !!p32;
  del(p16); del(p32); api.fmt = SF ? 32 : 16;
  const progs = {};
  const prog = (name, vs, fs) => {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([k, src]) => { const s = gl.createShader(k); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(p, s); });
    gl.linkProgram(p); progs[name] = { p, u: {} };
  };
  prog('step', TRI, FS_STEP); prog('dep', VS_DEP, FS_DEP); prog('dif', TRI, FS_DIF); prog('sc', VS_SC, FS_SC); prog('cmp', VS_CMP, FS_CMP);
  let P = null;
  const use = (n) => { P = progs[n]; gl.useProgram(P.p); };
  const U = (n) => (n in P.u ? P.u[n] : (P.u[n] = gl.getUniformLocation(P.p, n)));
  const u1 = (n, v) => gl.uniform1f(U(n), v), u2 = (n, a, b) => gl.uniform2f(U(n), a, b);
  const bind = (unit, n, t) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(TX, t); gl.uniform1i(U(n), unit); };
  const target = (o, w, h) => { gl.bindFramebuffer(FB, o ? o.fb : null); gl.viewport(0, 0, w, h); };
  const buf = (a) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.STATIC_DRAW); return b; };
  const quad = buf([0, -1, 1, -1, 0, 1, 1, 1]), sq = buf([0, 0, 1, 0, 0, 1, 1, 1]), inst = gl.createBuffer();
  const vaoE = gl.createVertexArray(), vaoQ = gl.createVertexArray();

  cv.id = 'field-slime'; cv.className = 'layer'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'z-index:0;mix-blend-mode:screen;opacity:0;transition:opacity .9s ease';
  const st = document.createElement('style'), de = document.documentElement;
  st.textContent = 'html.fs-live #field,html.fs-live #glow{filter:saturate(.22) brightness(.78)}#field,#glow{transition:filter .9s}html.fs-live #neb{opacity:.25!important}@media (forced-colors:active){#field-slime{display:none}}';
  document.head.appendChild(st);
  const over = document.getElementById('overlay');
  if (over && over.parentNode) over.parentNode.insertBefore(cv, over); else document.body.appendChild(cv);
  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('context lost'); cv.remove(); de.classList.remove('fs-live'); });

  let tier = 0, S = null, T = null, Sc = null, Sp = null, dom = null, ready = false, seed = 1, fN = 0;
  let room = '', live = false, grow = 0, share = 0.5, H = null, Hk = '', settle = 0, wantK = null, W = 0, Ht = 0;
  const food = new Float32Array(16), foodT = [0, 0, 0, 0]; let foodK = 0;
  const size = () => {
    const d = Math.min(TIERS[tier].d, devicePixelRatio || 1); W = innerWidth; Ht = innerHeight;
    const w = Math.round(W * d), h = Math.round(Ht * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  };
  addEventListener('resize', () => { size(); if (api.still) compose(); }, { passive: true });

  let NE = null;
  const loadNE = () => NE || (NE = Promise.all([ctx.data('universe_nodes'), ctx.data('universe_edges')]).then(([N, E]) => ({ nodes: N.nodes || [], edges: E.edges || [] })));
  const roomMod = (id) => { const r = (deps.rooms || []).find((x) => x.id === id); return r && r.mod; };
  function layoutOf(id, d) {
    if (id === 'universe') {
      const u = ctx.peek('universe'); if (!u || !u.star) return null;
      const uv = [];
      for (const n of d.nodes) { const s = u.star(n.name); if (!s) return null; uv.push([(s.xyz[0] + 1) / 2, (s.xyz[2] + 1) / 2]); }
      return { uv, disc: 1 };
    }
    const m = roomMod('chain'); if (id !== 'chain' || !m || !m.ready || !m.ux || !m.box) return null;
    const g = 0.08, k = 1 / (1 + 2 * g);
    return { uv: d.nodes.map((n, i) => [(m.ux[i] + g) * k, (m.uy[i] + g) * k]), g, disc: 0 };
  }
  /* unit square -> css px (x·w, y·w, w), column-major */
  const lin3 = (f) => { const a = f(0, 0), b = f(1, 0), c = f(0, 1); return new Float32Array([b[0] - a[0], b[1] - a[1], b[2] - a[2], c[0] - a[0], c[1] - a[1], c[2] - a[2], a[0], a[1], a[2]]); };
  function homography() {
    const v = ctx.view;
    if (room === 'universe' && v && v.mode === 'orbit3d' && v.proj3) {
      const q = v.proj3(); /* the platter plane y=0, universe.js project */
      return lin3((u, w) => {
        const px = 2 * u - 1 - q.tx, py = -q.ty, pz = 2 * w - 1 - q.tz, xr = q.cyaw * px - q.syaw * pz, zr = q.syaw * px + q.cyaw * pz, dep = q.sp * py + q.cp * zr + q.D;
        return [q.cx0 * dep + q.F * xr, q.cy0 * dep - q.F * (q.cp * py - q.sp * zr), dep];
      });
    }
    const m = roomMod('chain'); if (room !== 'chain' || !m || !m.box || !dom) return null;
    const g = dom.g, s = 1 + 2 * g;
    return lin3((u, w) => { const x = m.box.x + (u * s - g) * m.SX, y = m.box.y + (w * s - g) * m.SY, a = v && v.apply ? v.apply(x, y) : [x, y]; return [a[0], a[1], 1]; });
  }
  const toUV = (x, y) => {
    if (!H) return null;
    const [a, b, c, d, e, f, g, h, i] = H, A0 = e * i - f * h, B0 = f * g - d * i, C0 = d * h - e * g, det = a * A0 + b * B0 + c * C0;
    if (!det) return null;
    const u = A0 * x + B0 * y + C0, v = (c * h - b * i) * x + (a * i - c * g) * y + (b * g - a * h), w = (b * f - c * e) * x + (c * d - a * f) * y + (a * e - b * d);
    return w ? [u / w, v / w] : null;
  };

  function build(d, L) {
    const lg = (n, mx) => (n > 0 ? 0.3 + 0.7 * Math.log1p(n) / Math.log1p(mx) : 0);
    let mT = 1, mQ = 1; d.edges.forEach((e) => { mT = Math.max(mT, e.tap_n | 0); mQ = Math.max(mQ, e.auto_n | 0); });
    const E = [], N = [];
    d.edges.forEach((e) => { const a = L.uv[e.a], b = L.uv[e.b], wT = lg(e.tap_n | 0, mT), wQ = lg(e.auto_n | 0, mQ); if (a && b && wT + wQ > 0) E.push([a, b, wT, wQ]); });
    d.nodes.forEach((n, i) => { const p = L.uv[i]; if (p) N.push([p, Math.max(1, n.plays_bucket | 0) / 5]); });
    const I = new Float32Array((E.length + N.length) * 7); let o = 0, rb = 0;
    E.forEach(([a, b, wT, wQ]) => { I.set([a[0], a[1], b[0], b[1], wT, wQ, 0.0045 + 0.0055 * Math.max(wT, wQ)], o); o += 7; });
    N.forEach(([p, w]) => { I.set([p[0], p[1], p[0], p[1], 0.3 * w, 0.3 * w, 0.0025 + 0.003 * w], o); o += 7; rb = Math.max(rb, Math.hypot(p[0] - 0.5, p[1] - 0.5)); });
    gl.bindBuffer(gl.ARRAY_BUFFER, inst); gl.bufferData(gl.ARRAY_BUFFER, I, gl.STATIC_DRAW);
    gl.bindVertexArray(vaoE);
    const at = (n) => gl.getAttribLocation(progs.sc.p, n), aC = at('aC'), aAB = at('aAB'), aW = at('aW');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(aC); gl.vertexAttribPointer(aC, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.enableVertexAttribArray(aAB); gl.vertexAttribPointer(aAB, 4, gl.FLOAT, false, 28, 0); gl.vertexAttribDivisor(aAB, 1);
    gl.enableVertexAttribArray(aW); gl.vertexAttribPointer(aW, 3, gl.FLOAT, false, 28, 16); gl.vertexAttribDivisor(aW, 1);
    gl.bindVertexArray(null);
    /* reborn past the outermost star: no hull ring */
    dom = Object.assign({}, L, { nE: E.length, nN: N.length, rb: Math.min(0.495, rb + 0.012) });
    /* spawn rows: cool, rose. 1/8 at stars, the rest along links by weight² */
    const sp = new Float32Array(SPW * 8), rnd = mulberry(7), nw = []; let an = 0; N.forEach((n) => nw.push(an += n[1]));
    for (let s = 0; s < 2; s++) {
      const cw = [], list = E.filter((e) => e[2 + s] > 0); let acc = 0; list.forEach((e) => cw.push(acc += e[2 + s] * e[2 + s]));
      for (let k = 0; k < SPW; k++) {
        const j = (s * SPW + k) * 4;
        if (k < SPW / 8 || !list.length) { const n = N[pick(nw, rnd() * an)]; sp.set([n[0][0], n[0][1], 0.012], j); }
        else { const e = list[pick(cw, rnd() * acc)], t = rnd(); sp.set([e[0][0] + (e[1][0] - e[0][0]) * t, e[0][1] + (e[1][1] - e[0][1]) * t, 0.005], j); }
      }
    }
    del(Sp); Sp = tex(SPW, 2, true, false, sp) || tex(SPW, 2, false, false, sp);
    const a = new Float32Array(AW * AW * 4);
    for (let k = 0; k < AW * AW; k++) { const q = ((k < AW * AW * share ? 0 : SPW) + ((rnd() * SPW / 8) | 0)) * 4; a.set([sp[q] + (rnd() - 0.5) * 0.02, sp[q + 1] + (rnd() - 0.5) * 0.02, rnd() * 6.2832], k * 4); }
    if (S) S.forEach(del);
    S = [tex(AW, AW, SF, false, a), tex(AW, AW, SF, false, a)];
    trail();
  }
  function mulberry(a) { return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(c, v) { let lo = 0, hi = c.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < v) lo = m + 1; else hi = m; } return lo; }
  function trail() {
    const n = TIERS[tier].t;
    if (T) T.forEach(del); del(Sc);
    T = [tex(n, n, false, true), tex(n, n, false, true)]; Sc = tex(n, n, false, true);
    T.concat([Sc]).forEach((x) => { target(x, n, n); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); });
    if (dom) {
      use('sc'); target(Sc, n, n); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(vaoE); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, dom.nE + dom.nN); gl.bindVertexArray(null); gl.disable(gl.BLEND);
    }
    target(null, cv.width, cv.height);
  }

  const bands = () => { try { return (deps.A && deps.A.bands && deps.A.bands()) || { low: 0, mid: 0 }; } catch (e) { return { low: 0, mid: 0 }; } };
  function step() {
    const n = TIERS[tier].t, N = TIERS[tier].a * AW, px = 1 / n, b = bands();
    use('step'); target(S[1], AW, TIERS[tier].a);
    bind(0, 'uS', S[0].t); bind(1, 'uT', T[0].t); bind(2, 'uF', Sc.t); bind(3, 'uSp', Sp.t);
    gl.uniform4f(U('uP'), 0.5 + 0.12 * b.mid, 0.42, 9 * px, (1.05 + 0.5 * b.low) * px);
    gl.uniform4f(U('uK'), 0, grow < 1 ? 0.0004 + 0.0026 * grow : 0.003, share, 10);
    gl.uniform4fv(U('uFood'), food); u1('uN', N); u1('uSeed', seed = (seed + 1) % 100000); u1('uRb', dom.rb);
    gl.drawArrays(gl.TRIANGLES, 0, 3); S.reverse();
    use('dep'); target(T[0], n, n); bind(0, 'uS', S[0].t);
    u1('uN', N); u1('uG', share); u1('uA', 65536 / N * (n / 512) * (n / 512));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.POINTS, 0, N); gl.disable(gl.BLEND);
    use('dif'); target(T[1], n, n); bind(0, 'uT', T[0].t); u2('uPx', px, px); u2('uDD', 0.5, 0.9);
    gl.drawArrays(gl.TRIANGLES, 0, 3); T.reverse(); api.steps++;
  }
  function compose() {
    if (!T || !dom) return;
    target(null, cv.width, cv.height); api.composes++;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!H) return;
    const n = TIERS[tier].t, b = bands();
    use('cmp'); bind(0, 'uT', T[0].t);
    gl.uniformMatrix3fv(U('uH'), false, H); u2('uRes', W, Ht); u2('uTx', 1 / n, 1 / n);
    gl.uniform4f(U('uC'), 0.075 * (1 + 0.3 * b.low), 0.32, 1, dom.disc); gl.uniform3fv(U('uI'), ICE); gl.uniform3fv(U('uR'), ROSE);
    gl.bindVertexArray(vaoQ); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  }

  function want() {
    if (room === 'universe') {
      let a = ''; try { a = ctx.angle.get().id; } catch (e) {}
      if (a === 'threads' || a === 'day') return null; /* stars off their places */
      const u = ctx.peek('universe'), arm = a === 'links' && u ? u.arm : '';
      return arm === 'tap' ? 'tap' : arm === 'served' ? 'queue' : 'both';
    }
    const m = room === 'chain' && roomMod('chain');
    return m ? (m.hand ? 'tap' : 'both') : null;
  }
  const prevCap = typeof A.capFor === 'function' ? A.capFor : null; /* R10 merge: the bath's line, when the veins hold none */
  /* R11: the room's own line first; the veins speak once the visitor picks an arm, or after it has sat */
  let roomT = performance.now(), capTm = 0;
  const veinCap = (id) => (api.on && live && room === id && wantK && (wantK !== 'both' || performance.now() - roomT > 6500) ? CAP[wantK] : null);
  A.capFor = (id, a) => veinCap(id) || (prevCap ? prevCap(id, a) : null);
  const recap = () => { try { const ta = ctx.tour && ctx.tour.active; if (!(ta && ta.playing)) ctx.caption.clear(); } catch (e) {} };
  /* the chrome may not dim before the veins' line has typed (same hold as the bath's: no half-fade and relight in quiet mode) */
  const lineDue = (on) => { try { ctx.idle.hold('veins-line', on); } catch (e) {} };
  function setRoom(id) {
    const was = live; room = api.room = id; roomT = performance.now(); clearTimeout(capTm); lineDue(false);
    if (LIVE[id] && api.on) { lineDue(true); capTm = setTimeout(() => { lineDue(false); if (api.on && live) recap(); }, 6600); }
    H = null; Hk = ''; live = false; dom = null;
    de.classList.remove('fs-live'); cv.style.opacity = T ? SUB : '0';
    if (was) recap();
    if (!LIVE[id] || !api.on) return;
    loadNE().then((d) => {
      let tries = 0;
      const go = () => {
        if (room !== id) return;
        const L = layoutOf(id, d);
        if (!L) { if (++tries < 80) setTimeout(go, 100); return; }
        grow = 0; settle = 0; api.still = false; wantK = want(); share = wantK === 'tap' ? 1 : wantK === 'queue' ? 0 : 0.5;
        size(); build(d, L); live = true; recap();
      };
      go();
    }).catch(() => {});
  }
  function pour(x, y) {
    if (!live || ctx.reduced) return;
    const p = toUV(x, y); if (!p || p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1) return;
    const k = foodK++ % 4; food.set([p[0], p[1], 0, 0.008], k * 4); foodT[k] = performance.now(); api.poured = (api.poured || 0) + 1;
  }
  /* a tap pours food; a hold stays the room's listening post */
  let pd = null;
  const on = (k, f) => addEventListener(k, f, { passive: true });
  on('pointerdown', (e) => { pd = !e.isPrimary || (e.target && e.target.closest && e.target.closest('button,a,input,textarea,select,dialog,[role=dialog],#atlas-info,.atlas-ladder,.ch-hud,header')) ? null : { x: e.clientX, y: e.clientY, t: performance.now() }; });
  on('pointermove', (e) => { if (pd && Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 10) pd = null; });
  on('pointerup', () => { if (pd && performance.now() - pd.t < 450) pour(pd.x, pd.y); pd = null; });
  on('pointercancel', () => { pd = null; });

  const gov = { dts: [], since: 0 };
  function governor(t, dt) {
    if (!(dt > 0 && dt < 250) || t - gov.since < 1500) return;
    if (A.gov && A.gov.tier >= 4) { if (tier < 3) retier(3, t); return; }
    if (tier === 3) return retier(2, t);
    gov.dts.push(dt); if (gov.dts.length < 90) return;
    const p50 = gov.dts.sort((a, b) => a - b)[45]; gov.dts.length = 0;
    if (p50 > 21 && tier < 2) retier(tier + 1, t);
  }
  function retier(k, t) { const n = TIERS[tier].t; tier = api.tier = k; gov.since = t; gov.dts.length = 0; size(); if (TIERS[k].t !== n) { trail(); grow = 0.6; } }
  function frame(t, dt) {
    if (!ready || !live) return;
    const c0 = performance.now(), w = want();
    if (w !== wantK) { wantK = w; recap(); }
    if (!wantK) { if (cv.style.opacity !== SUB) { cv.style.opacity = SUB; de.classList.remove('fs-live'); } return; }
    if (cv.style.opacity !== '1') { cv.style.opacity = '1'; de.classList.add('fs-live'); }
    share += ((wantK === 'tap' ? 1 : wantK === 'queue' ? 0 : 0.5) - share) * Math.min(1, (dt || 16) / 900);
    for (let k = 0; k < 4; k++) { const age = (t - foodT[k]) / 9000; food[k * 4 + 2] = foodT[k] && age < 1 ? 45 * (1 - age) * Math.min(1, age * 8) : 0; }
    H = homography() || H;
    const hk = H ? H.join(',') : '';
    if (ctx.reduced) {
      if (settle < 260) { grow = 1; for (let k = 0; k < 26; k++) step(); settle += 26; if (settle >= 260) { api.still = true; compose(); Hk = hk; } }
      else if (hk !== Hk) { Hk = hk; compose(); }
      return;
    }
    governor(t, dt);
    grow = Math.min(1, grow + (dt || 16) / 3200);
    const k = TIERS[tier].k;
    if (k && ++fN % k === 0) step();
    if (k || hk !== Hk) { compose(); Hk = hk; }
    api.cpuMs.push(performance.now() - c0); api.frameMs.push(dt);
    if (api.cpuMs.length > 240) { api.cpuMs.shift(); api.frameMs.shift(); }
  }
  const link = () => {
    if (PSC) for (const n in progs) if (!gl.getProgramParameter(progs[n].p, PSC.COMPLETION_STATUS_KHR)) { setTimeout(link, 40); return; }
    const l0 = performance.now();
    for (const n in progs) if (!gl.getProgramParameter(progs[n].p, gl.LINK_STATUS)) { console.warn('field.slime', n, gl.getProgramInfoLog(progs[n].p)); fail('shader'); cv.remove(); return; }
    const a = gl.getAttribLocation(progs.cmp.p, 'aC');
    gl.bindVertexArray(vaoQ); gl.bindBuffer(gl.ARRAY_BUFFER, sq); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    api.on = ready = true; size(); api.linkMs = performance.now() - l0;
    const r = (deps.rooms || [])[ctx.index]; setRoom(r ? r.id : '');
  };
  setTimeout(link, 60);
  ctx.onStop((ev) => { if (ev && (ev.id !== room || (LIVE[ev.id] && !live))) setRoom(ev.id); });
  ctx.onFrame(frame);
  api.mountMs = performance.now() - m0;
  /* test seams; bench syncs on a 1 px read */
  const px1 = new Uint8Array(4), sync = () => { target(null, 1, 1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); };
  api.bench = (n) => { if (!live) return -1; sync(); const t0 = performance.now(); for (let k = 0; k < n; k++) { step(); compose(); sync(); } return (performance.now() - t0) / n; };
  api.pour = pour; api.toUV = toUV;
  api.get = () => ({ live, room, want: wantK, share, tier, steps: api.steps, still: api.still, dom: dom && { nE: dom.nE, nN: dom.nN } });
  return api;
}
export default { mount };
