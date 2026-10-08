/* the lens (R10): two pictures of the same 120 artists printed as one lenticular card. three layers are drawn once in
   world px on 2d canvases (A = only-mine roads, B = only-the-queue's, S = what both share plus the artists, which never
   move), then one WebGL2 draw call per frame interlaces A and B under a ridge pitch: the phase picks which strip of every
   lenticule faces you, a little sweep across the card makes the flip travel, and a few px of slide make the unshared
   roads drift while S holds still. no WebGL2, a lost context or ?lens=2d: the same card in canvas 2d, flipped by columns. */
const VS = `#version 300 es
in vec2 c;uniform vec4 uR;uniform vec3 uC;uniform vec2 uV;out vec2 vU;out vec2 vW;
void main(){vU=c;vW=uR.xy+c*uR.zw;vec2 s=vW*uC.z+uC.xy;gl_Position=vec4(s.x/uV.x*2.-1.,1.-s.y/uV.y*2.,0.,1.);}`;
const FS = `#version 300 es
precision highp float;in vec2 vU;in vec2 vW;uniform sampler2D uA,uB,uS;uniform vec4 uR,uP,uRing;uniform vec2 uK;out vec4 o;
float sl(float p){return clamp((p-.5)/uK.y+.5,0.,1.);}
float pick(float s,float l,float a){return s<=0.?0.:s>=1.?1.:clamp((s-l)/a+.5,0.,1.);}
void main(){vec2 sz=uR.zw,cp=vU*sz;float z=uP.w,ph=uP.x,ov=uP.y;
vec2 q=abs(cp-sz*.5)-(sz*.5-10.);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-10.;float m=clamp(.5-d*z,0.,1.);if(m<=0.)discard;
float L=cp.x/uK.x,li=floor(L),l=L-li,xn=li*uK.x/sz.x,pe=ph+.38*(xn-.5),a=max(fwidth(L),.05);
vec3 w=vec3(pick(sl(pe+.035),l,a),pick(sl(pe),l,a),pick(sl(pe-.035),l,a));
float sd=10./sz.x;vec4 A=texture(uA,vU+vec2(ph*sd,0.)),B=texture(uB,vU-vec2((1.-ph)*sd,0.)),S=texture(uS,vU);
vec4 K=vec4(mix(A.r,B.r,w.r),mix(A.g,B.g,w.g),mix(A.b,B.b,w.b),mix(A.a,B.a,w.g));
float n=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.55);
vec3 g=vec3(.045,.032,.085)+(n-.5)*.028;g*=1.-.4*dot(vU-.5,vU-.5);
vec3 col=g*(1.-K.a)+K.rgb;col=col*(1.-S.a)+S.rgb;
float r=2.*l-1.,hp=(ph-.5)*1.6+ov*2.,sp=exp(-pow((r-hp)*2.4,2.))*(.045+.03*sin(uP.z+xn*7.+vU.y*3.));
float band=exp(-pow((xn*.8+vU.y*.3-(ph*1.3-.15+ov*1.5))*3.2,2.))*.085;
vec3 hol=mix(vec3(.86,.9,1.),.55+.45*cos(6.2832*(xn*.7+vU.y*.2+ph+vec3(0.,.33,.67))),.55);
col=col*(1.-.24*pow(abs(r),6.))+hol*(sp+band*1.2);col*=1.-ov*(xn-.5)*1.8;
float rim=clamp(1.-abs(d*z+1.2),0.,1.)*(.16+.22*mix(1.-xn,xn,ph));col+=vec3(rim*.9,rim*.95,rim);
float rd=abs(length(vW-uRing.xy)-uRing.z)*z;col=mix(col,vec3(.53,.8,1.),(1.-smoothstep(.7,1.8,rd))*uRing.w);
o=vec4(col*m,m);}`;

export function createLens(host, opt = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'lens-cv'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none';
  host.insertBefore(cv, host.firstChild);
  const L = { A: null, B: null, S: null, R: null, k: 1 }, U = {};
  let gl = null, c2 = null, tex = [], prog = null, kind = '2d', cw = 0, ch = 0, dpr = 1, dirty = 7, shown = false;
  const mk = () => document.createElement('canvas');
  function initGL() {
    if (opt.force2d) return false;
    try { gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return false;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error('lens shader: ' + gl.getShaderInfoLog(x)); return x; };
    try {
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('lens link');
    } catch (e) { console.warn(e); gl = null; return false; }
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'c'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uR', 'uC', 'uV', 'uP', 'uRing', 'uK', 'uA', 'uB', 'uS'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    for (let i = 0; i < 3; i++) {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tex.push(t);
    }
    gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1); gl.uniform1i(U.uS, 2);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.clearColor(0, 0, 0, 0);
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); toCanvas2d(); }, { once: true });
    kind = 'webgl2'; return true;
  }
  function toCanvas2d() {
    /* a context, once taken, keeps its kind: swap in a fresh canvas for the 2d path */
    gl = null; kind = '2d';
    const n = cv.cloneNode(); cv.replaceWith(n); api.el = n; c2 = n.getContext('2d'); cw = ch = 0; dirty = 7; cvRef = n;
  }
  let cvRef = cv;
  if (!initGL()) { c2 = cv.getContext('2d'); kind = '2d'; }

  /* world rect R, three draw callbacks (g in world px). texture scale: DPR (cap 2) with headroom for the zoom, 2048 a side at most */
  function layers(R, dA, dB, dS) {
    const d = Math.min(2, window.devicePixelRatio || 1), k = Math.min(d * 1.35, 2048 / Math.max(R.w, R.h, 1));
    L.R = R; L.k = k;
    const W = Math.max(2, Math.ceil(R.w * k)), H = Math.max(2, Math.ceil(R.h * k));
    ['A', 'B', 'S'].forEach((id, i) => {
      const c = L[id] || (L[id] = mk()); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      g.setTransform(k, 0, 0, k, -R.x * k, -R.y * k); g.lineCap = 'round'; g.lineJoin = 'round';
      [dA, dB, dS][i](g, k);
    });
    dirty = 7;
  }
  function restatic(dS) {
    if (!L.S) return; const c = L.S, g = c.getContext('2d'), k = L.k, R = L.R;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(k, 0, 0, k, -R.x * k, -R.y * k); dS(g, k);
    dirty |= 4;
  }
  function size(vw, vh) {
    const d = Math.min(2, window.devicePixelRatio || 1), W = Math.round(vw * d), H = Math.round(vh * d);
    if (W === cw && H === ch && d === dpr) return;
    cw = W; ch = H; dpr = d; cvRef.width = W; cvRef.height = H;
  }
  const sel = (p) => Math.max(0, Math.min(1, (p - 0.5) / 0.3 + 0.5));
  function rr(g, R, r) { g.beginPath(); g.moveTo(R.x + r, R.y); g.arcTo(R.x + R.w, R.y, R.x + R.w, R.y + R.h, r); g.arcTo(R.x + R.w, R.y + R.h, R.x, R.y + R.h, r); g.arcTo(R.x, R.y + R.h, R.x, R.y, r); g.arcTo(R.x, R.y, R.x + R.w, R.y, r); g.closePath(); }
  let last = '';
  function draw2d(st) {
    const R = L.R, k = L.k, g = c2, ph = st.ph, z = st.cam[2];
    const key = ph.toFixed(3) + st.over.toFixed(3) + st.cam.join() + st.ring.join() + cw + 'x' + ch + dirty;
    if (key === last) return; last = key; dirty = 0;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
    g.setTransform(dpr * z, 0, 0, dpr * z, dpr * st.cam[0], dpr * st.cam[1]);
    g.save(); rr(g, R, 10); g.fillStyle = '#0b0816'; g.fill(); g.clip();
    const sd = 10, P = 7, s0 = sel(ph - 0.19), s1 = sel(ph + 0.19), W = R.w;
    const sl = (c, x, w, off) => { const sx = (x + off) * k; if (w > 0.2 && sx >= 0 && sx < c.width) g.drawImage(c, sx, 0, Math.min(w * k, c.width - sx), c.height, R.x + x, R.y, w, R.h); };
    if (s1 <= 0) g.drawImage(L.A, R.x - ph * sd, R.y, R.w, R.h);
    else if (s0 >= 1) g.drawImage(L.B, R.x + (1 - ph) * sd, R.y, R.w, R.h);
    else for (let x = 0; x < W; x += P) {
      const s = sel(ph + 0.38 * (x / W - 0.5)), w = Math.min(P, W - x), b = s * w;
      if (b > 0) sl(L.B, x, b, -(1 - ph) * sd);
      if (b < w) sl(L.A, x + b, w - b, ph * sd);
    }
    g.drawImage(L.S, R.x, R.y, R.w, R.h);
    const gr = g.createLinearGradient(R.x, R.y, R.x + R.w, R.y + R.h * 0.3), c = Math.max(0.05, Math.min(0.95, ph * 1.3 - 0.15 + st.over * 1.5));
    gr.addColorStop(Math.max(0, c - 0.2), 'rgba(220,230,255,0)'); gr.addColorStop(c, 'rgba(220,230,255,.09)'); gr.addColorStop(Math.min(1, c + 0.2), 'rgba(220,230,255,0)');
    g.fillStyle = gr; g.fillRect(R.x, R.y, R.w, R.h);
    if (st.ring[3] > 0) { g.globalAlpha = st.ring[3]; g.strokeStyle = '#86cbfe'; g.lineWidth = 1.6 / z; g.beginPath(); g.arc(st.ring[0], st.ring[1], st.ring[2], 0, 6.2832); g.stroke(); g.globalAlpha = 1; }
    g.restore();
    rr(g, R, 10); g.strokeStyle = 'rgba(220,214,240,.28)'; g.lineWidth = 1 / z; g.stroke();
  }
  function drawGL(st) {
    const R = L.R;
    if (dirty) { ['A', 'B', 'S'].forEach((id, i) => { if (dirty & (1 << i)) { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, L[id]); } }); dirty = 0; }
    gl.viewport(0, 0, cw, ch); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform4f(U.uR, R.x, R.y, R.w, R.h); gl.uniform3f(U.uC, st.cam[0], st.cam[1], st.cam[2]); gl.uniform2f(U.uV, cw / dpr, ch / dpr);
    gl.uniform4f(U.uP, st.ph, st.over, st.t, st.cam[2]); gl.uniform4f(U.uRing, st.ring[0], st.ring[1], st.ring[2], st.ring[3]);
    gl.uniform2f(U.uK, 3.5, 0.3);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  const api = {
    el: cv,
    get kind() { return kind; },
    layers, restatic,
    show(on) { if (on === shown) return; shown = on; cvRef.style.display = on ? 'block' : 'none'; if (!on && gl) gl.clear(gl.COLOR_BUFFER_BIT); last = ''; },
    /* st: { ph 0..1 (0 = A), over (the bend past either edge), t (ms), ring [x, y, r, alpha] world, cam [ox, oy, z]: screen = world * z + o, vw, vh } */
    render(st) {
      if (!L.R || !shown) return;
      size(st.vw, st.vh);
      if (gl) { if (gl.isContextLost()) return; drawGL(st); } else draw2d(st);
    },
    destroy() { try { cvRef.remove(); } catch (e) {} if (gl) { const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } },
  };
  return api;
}

/* the hand, by any of three routes: a drag (always), a tilted phone (when the orientation sensor is allowed), a mouse
   passing over the card on a desk. each gives a phase; the room decides what a phase commits to. nothing is stored or sent */
export function createTilt(onPhase) {
  const T = { on: false, asked: false, got: 0, g0: null, base: 0, f: null };
  function onO(e) {
    if (e.gamma == null) return;
    T.got++;
    if (T.g0 == null || T.f == null) { T.g0 = T.f = e.gamma; return; }
    T.f += 0.18 * (e.gamma - T.f);
    const d = T.f - T.g0, dz = Math.abs(d) < 2 ? 0 : d - Math.sign(d) * 2;
    onPhase(T.base + dz / 20);
  }
  function listen() { if (T.on) return; T.on = T.ok = true; window.addEventListener('deviceorientation', onO); }
  return {
    T,
    /* call from inside a tap or a click: iOS asks once, behind its own sheet; everywhere else it simply listens */
    ask() {
      if (T.asked) { if (T.ok) listen(); return; } T.asked = true;
      const D = window.DeviceOrientationEvent; if (!D || !matchMedia('(pointer:coarse)').matches) return;
      if (typeof D.requestPermission === 'function') { D.requestPermission().then((r) => { if (r === 'granted') listen(); }, () => {}); } else listen();
    },
    resume() { if (T.ok) listen(); },
    rebase(p) { T.base = p; T.g0 = T.f; },
    get live() { return T.on && T.got > 1; },
    stop() { T.on = false; T.g0 = T.f = null; T.got = 0; window.removeEventListener('deviceorientation', onO); },
  };
}
