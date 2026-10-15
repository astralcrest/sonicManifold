/* R18 FIELD_GL: the field on one WebGL2 canvas (RES_TECH 4.2, phase 1: the hybrid compositor).
   the CPU still eases, bins and prints every play into the shell's frame buffer (fieldLoop, the sky, GF.render). this module
   uploads that frame once a frame and composes the bloom the 2D path drew on #glow: the same downsample (1/4 desk, 1/6 phone),
   the same 2 px blur where the 2D canvas has a filter, the background taken back out, the quarter-size halo added back, the
   same screen blend at the same opacity. the field's own pixels are fetched, never filtered, so where no bloom lands the
   picture is the 2D one byte for byte. what a 2D canvas cannot keep is added here, each off until asked: trails (the last
   frame, kept), wide gamut on a P3 screen (the colour code a little more vivid, every code hue within dE2000 2.3 of PAL).
   mount() returns null and the 2D canvas stays when there is no WebGL2, the GL would be software (failIfMajorPerformanceCaveat)
   or a program fails to build; `why` says which. a lost context hands the field back to the 2D canvas at once (onLost); a
   restored one is rebuilt and handed back (onRestored). a second loss is final. nothing is allocated per frame. */
export let why = '';
const VS = '#version 300 es\nvoid main(){gl_Position=vec4(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.,0.,1.);}';
const HD = '#version 300 es\nprecision highp float;\nout vec4 o;\n';
/* the 2D canvas's blur(2px): a gaussian of sigma 2 texels at the bloom's own size, 13 taps */
const GW = (() => { const w = []; let s = 0; for (let k = 0; k < 7; k++) { w[k] = Math.exp(-k * k / 8); s += k ? 2 * w[k] : w[k]; } return w.map((x) => (x / s).toFixed(7)).join(','); })();
/* down: one bilinear tap at each target pixel's centre (the 2D drawImage's own sampling); D takes the background out here
   when there is no blur pass after it (the 2D path's 'difference' fill) */
const FS_DOWN = HD + 'uniform sampler2D F;uniform vec2 S;uniform vec3 BG;uniform float D;\n' +
  'void main(){vec3 c=texture(F,gl_FragCoord.xy/S).rgb;o=vec4(D>.5?abs(c-BG):c,1.);}';
const FS_BLUR = HD + 'uniform sampler2D F;uniform vec2 S,T;uniform vec3 BG;uniform float D;\nconst float W[7]=float[7](' + GW + ');\n' +
  'void main(){vec2 u=gl_FragCoord.xy/S;vec3 c=texture(F,u).rgb*W[0];for(int k=1;k<7;k++){vec2 d=T*float(k);c+=(texture(F,u+d).rgb+texture(F,u-d).rgb)*W[k];}o=vec4(D>.5?abs(c-BG):c,1.);}';
/* out: the field (fetched), the bloom screened over it at opacity A (the 2D path's css screen blend: f + A g (1 - f)), the
   halo added inside the bloom at A2 ('lighter'), trails as max(now, last * K), then sRGB bytes or the P3 transform.
   B = 1 blits a finished trail frame instead. rows: the frame buffer's row 0 is the top; the canvas's is the bottom (FL) */
const FS_OUT = HD + 'uniform sampler2D F,GA,GQ,PR;uniform vec2 S;uniform float A,A2,K,FL,B,P3,CH;uniform mat3 M1,M2,M2i,M1i,SP;\n' +
  'vec3 lin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(.04045,c));}\n' +
  'vec3 enc(vec3 c){c=clamp(c,0.,1.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}\n' +
  'vec3 cb(vec3 x){return sign(x)*pow(abs(x),vec3(1./3.));}\n' +
  /* linear sRGB -> OKLab, chroma x CH, -> linear sRGB (now possibly outside sRGB, inside P3) -> linear P3 -> the sRGB curve */
  'vec3 p3(vec3 c){vec3 l=lin(c);if(CH!=1.){vec3 b=M2*cb(M1*l);b.yz*=CH;vec3 m=M2i*b;l=M1i*(m*m*m);}return enc(SP*l);}\n' +
  'void main(){vec2 fc=gl_FragCoord.xy;vec3 c;\n' +
  ' if(B>.5){c=texelFetch(PR,ivec2(fc),0).rgb;}\n' +
  ' else{ivec2 q=ivec2(int(fc.x),int(FL>.5?S.y-fc.y:fc.y));vec3 f=texelFetch(F,q,0).rgb;\n' +
  '  if(A>0.){vec2 u=(vec2(q)+.5)/S;vec3 g=min(texture(GA,u).rgb+A2*texture(GQ,u).rgb,1.);c=f+A*g*(1.-f);}else c=f;\n' +
  '  if(K>0.)c=max(c,texelFetch(PR,ivec2(fc),0).rgb*K);}\n' +
  ' o=vec4(P3>.5?p3(c):c,1.);}';
/* row-major (transposed to glsl's column order on upload). OKLab (Ottosson 2020), and linear sRGB -> linear Display P3 (both D65) */
const M1 = [0.4122214708, 0.5363325363, 0.0514459929, 0.2119034982, 0.6806995451, 0.1073969566, 0.0883024619, 0.2817188376, 0.6299787005];
const M2 = [0.2104542553, 0.7936177850, -0.0040720468, 1.9779984951, -2.4285922050, 0.4505937099, 0.0259040371, 0.7827717662, -0.8086757660];
const M2i = [1, 0.3963377774, 0.2158037573, 1, -0.1055613458, -0.0638541728, 1, -0.0894841775, -1.2914855480];
const M1i = [4.0767416621, -3.3077115913, 0.2309699292, -1.2684380046, 2.6097574011, -0.3413193965, -0.0041960863, -0.7034186147, 1.7076147010];
const SP = [0.8224621, 0.177538, 0, 0.0331941, 0.9668058, 0, 0.0170827, 0.0723974, 0.9105199];
/* PAL_P3: PAL through this transform at CH 1.08, as display-p3 bytes, and CIEDE2000 against the sRGB PAL (FIELD_GL/bench/p3.py).
   tap #21f6bc -> 105 245 190 (1.40) · shuffle #f5a623 -> 237 168 52 (2.28) · served #6b5a86 -> 105 90 133 (0.81)
   violet #8b6fd6 -> 135 110 213 (1.16) · rose #ff6e9c -> 242 114 155 (1.16) · white #d8d2ea -> 215 210 234 (0.82) */
export const CHROMA = 1.08;
const BG = [10 / 255, 1 / 255, 24 / 255];

export function mount(o = {}) {
  why = '';
  if (typeof WebGL2RenderingContext === 'undefined') { why = 'no webgl2'; return null; }
  const cv = document.createElement('canvas');
  const opt = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: true, powerPreference: 'high-performance' };
  let gl = null; try { gl = cv.getContext('webgl2', opt); } catch (e) {}
  if (!gl) { why = 'no hardware webgl2 (failIfMajorPerformanceCaveat or none)'; return null; }
  const S = { ok: false, lost: 0, final: false, pw: 0, ph: 0, gw: 2, gh: 2, qw: 2, qh: 2, p3: false, p3why: '', ch: 1, decay: 0, cur: 0, frames: 0, renderer: '' };
  let PD = null, PB = null, PO = null, texF = null, gA = null, gB = null, gQ = null, T = [null, null];
  const want3 = o.p3 === true, LX = gl.getExtension('WEBGL_lose_context');
  function shader(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) { why = 'shader: ' + (gl.getShaderInfoLog(s) || '').slice(0, 160); return null; } return s; }
  function program(fs) {
    const v = shader(gl.VERTEX_SHADER, VS), f = shader(gl.FRAGMENT_SHADER, fs); if (!v || !f) return null;
    const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { if (!gl.isContextLost()) why = 'link: ' + (gl.getProgramInfoLog(p) || '').slice(0, 160); return null; }
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let k = 0; k < n; k++) { const a = gl.getActiveUniform(p, k); const nm = a.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }
  function build() {
    PD = program(FS_DOWN); PB = program(FS_BLUR); PO = program(FS_OUT);
    if (!PD || !PB || !PO) { S.ok = false; return false; }
    gl.useProgram(PD.p); gl.uniform1i(PD.u.F, 0); gl.uniform3fv(PD.u.BG, BG);
    gl.useProgram(PB.p); gl.uniform1i(PB.u.F, 0); gl.uniform3fv(PB.u.BG, BG);
    gl.useProgram(PO.p); gl.uniform1i(PO.u.F, 0); gl.uniform1i(PO.u.GA, 1); gl.uniform1i(PO.u.GQ, 2); gl.uniform1i(PO.u.PR, 3);
    for (const [k, m] of [['M1', M1], ['M2', M2], ['M2i', M2i], ['M1i', M1i], ['SP', SP]]) if (PO.u[k]) gl.uniformMatrix3fv(PO.u[k], false, [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
    /* wide gamut: the drawing buffer in Display P3 and every pixel through the transform; the bytes of an sRGB canvas would
       otherwise be read as P3 and every colour would come out oversaturated. only where the browser composites the buffer as
       P3 (managed()): WebKit keeps the attribute but shows the bytes as sRGB, so there every colour would come out paler */
    S.p3 = false; S.p3why = want3 ? '' : 'not asked';
    if (want3 && 'drawingBufferColorSpace' in gl) {
      try { gl.drawingBufferColorSpace = 'display-p3'; S.p3 = gl.drawingBufferColorSpace === 'display-p3' && managed(); } catch (e) { S.p3 = false; }
      if (!S.p3) { S.p3why = 'the browser shows a P3 buffer as sRGB'; try { gl.drawingBufferColorSpace = 'srgb'; } catch (e) {} }
    } else if (want3) S.p3why = 'no drawingBufferColorSpace';
    S.ch = S.p3 ? (o.chroma > 0 ? o.chroma : CHROMA) : 1;
    gl.uniform1f(PO.u.P3, S.p3 ? 1 : 0); gl.uniform1f(PO.u.CH, S.ch);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.DITHER);
    try { const d = gl.getExtension('WEBGL_debug_renderer_info'); S.renderer = String(d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) {}
    S.ok = true; return true;
  }
  /* is a P3 drawing buffer composited as P3? tap at chroma 1 is P3 116 242 192, which is sRGB 33 246 188: a browser that
     manages the buffer draws it into an sRGB canvas with red near 33; one that shows the bytes as they are, near 116 */
  function managed() {
    let r = 255;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(116 / 255, 242 / 255, 192 / 255, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    try { const c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0, 1, 1); r = g.getImageData(0, 0, 1, 1).data[0]; } catch (e) {}
    gl.clearColor(BG[0], BG[1], BG[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return r < 75;
  }
  function tex(w, h) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function target(w, h) { const t = tex(w, h), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.clearColor(BG[0], BG[1], BG[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, fb }; }
  function drop(x) { if (!x || gl.isContextLost()) return; if (x.fb) { gl.deleteFramebuffer(x.fb); gl.deleteTexture(x.t); } else gl.deleteTexture(x); }
  function freeTrails() { drop(T[0]); drop(T[1]); T = [null, null]; }
  function alloc() {
    if (!S.ok || !S.pw) return;
    drop(texF); drop(gA); drop(gB); drop(gQ); freeTrails();
    texF = tex(S.pw, S.ph); gA = target(S.gw, S.gh); gB = target(S.gw, S.gh); gQ = target(S.qw, S.qh);
    if (S.decay > 0) T = [target(S.pw, S.ph), target(S.pw, S.ph)];
  }
  function pass(P, fb, w, h, src) { gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); }
  cv.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); S.ok = false; S.lost++; S.final = S.lost >= 2; texF = gA = gB = gQ = null; T = [null, null];
    try { o.onLost && o.onLost(S.final); } catch (err) {}
  }, false);
  cv.addEventListener('webglcontextrestored', () => {
    if (S.final) return;
    if (build()) { alloc(); try { o.onRestored && o.onRestored(); } catch (err) {} }
  }, false);
  if (!build()) { const w = why || 'build failed'; try { if (LX) LX.loseContext(); } catch (e) {} why = w; return null; }
  const R = {
    canvas: cv,
    get ok() { return S.ok; },
    get p3() { return S.p3; },
    /* the frame buffer's size (the shell's PW x PH) and the bloom's (the 2D #glow's and its quarter-size halo's) */
    size(pw, ph, gw, gh, qw, qh) {
      S.pw = pw; S.ph = ph; S.gw = Math.max(2, gw | 0); S.gh = Math.max(2, gh | 0); S.qw = Math.max(2, qw | 0); S.qh = Math.max(2, qh | 0);
      if (cv.width !== pw) cv.width = pw; if (cv.height !== ph) cv.height = ph;
      alloc();
    },
    /* one frame: u8 = the frame buffer's bytes (RGBA, row 0 at the top); a = the bloom's opacity (0 = none); a2 = the halo's
       weight inside it (0 = none); blur = the 2D canvas would have blurred it; dt = this frame's ms (trails fade per second) */
    frame(u8, a, a2, blur, dt) {
      if (!S.ok || !texF) return false;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texF);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, S.pw, S.ph, gl.RGBA, gl.UNSIGNED_BYTE, u8);
      if (a > 0) {
        pass(PD, gA.fb, S.gw, S.gh, texF); gl.uniform2f(PD.u.S, S.gw, S.gh); gl.uniform1f(PD.u.D, blur ? 0 : 1); gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (blur) {
          pass(PB, gB.fb, S.gw, S.gh, gA.t); gl.uniform2f(PB.u.S, S.gw, S.gh); gl.uniform2f(PB.u.T, 1 / S.gw, 0); gl.uniform1f(PB.u.D, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
          pass(PB, gA.fb, S.gw, S.gh, gB.t); gl.uniform2f(PB.u.T, 0, 1 / S.gh); gl.uniform1f(PB.u.D, 1); gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        if (a2 > 0) { pass(PD, gQ.fb, S.qw, S.qh, gA.t); gl.uniform2f(PD.u.S, S.qw, S.qh); gl.uniform1f(PD.u.D, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); }
      }
      const tr = S.decay > 0 && T[0], dst = tr ? T[S.cur] : null, prev = tr ? T[S.cur ^ 1] : null;
      pass(PO, tr ? dst.fb : null, S.pw, S.ph, texF);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, gA.t); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, gQ.t);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tr ? prev.t : gB.t);
      gl.uniform2f(PO.u.S, S.pw, S.ph); gl.uniform1f(PO.u.A, a > 0 ? a : 0); gl.uniform1f(PO.u.A2, a > 0 && a2 > 0 ? a2 : 0);
      gl.uniform1f(PO.u.K, tr ? (dt > 0 ? Math.pow(S.decay, Math.min(dt, 100) / 16.667) : S.decay) : 0); gl.uniform1f(PO.u.FL, 1); gl.uniform1f(PO.u.B, 0); gl.uniform1f(PO.u.P3, tr ? 0 : S.p3 ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (tr) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, dst.t);
        gl.uniform1f(PO.u.B, 1); gl.uniform1f(PO.u.P3, S.p3 ? 1 : 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
        S.cur ^= 1;
      }
      gl.activeTexture(gl.TEXTURE0);
      S.frames++;
      return true;
    },
    /* persistence (RES_TECH 4.8): each frame keeps max(now, last x k), k per 60 Hz frame (k^(dt/16.7) at any other rate);
       0 is off (and frees the two frame-sized targets) */
    trails(k) {
      const d = Math.max(0, Math.min(0.97, +k || 0));
      if (d === S.decay) return S.ok;
      S.decay = d;
      if (!S.ok) return false;
      if (d > 0 && !T[0] && S.pw) { T = [target(S.pw, S.ph), target(S.pw, S.ph)]; S.cur = 0; }
      else if (d === 0) freeTrails();
      return true;
    },
    info() { return { ok: S.ok, lost: S.lost, final: S.final, p3: S.p3, p3why: S.p3why, chroma: S.ch, trails: S.decay, size: [S.pw, S.ph], glow: [S.gw, S.gh], halo: [S.qw, S.qh], frames: S.frames, renderer: S.renderer, why }; },
    /* test seams: a real context loss and its restore, through the browser's own extension */
    lose() { if (LX) LX.loseContext(); return !!LX; },
    restore() { if (LX) LX.restoreContext(); return !!LX; },
  };
  return R;
}
export default { mount };
