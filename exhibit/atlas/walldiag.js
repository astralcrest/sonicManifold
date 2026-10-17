/* R19 CORE: the installer's overlay, exhibit.html?wall=1&diag=1 only (wallboot.js loads it; never in the default view, never
   in a published shot). it shows what this machine reports, the way the wall will see it: pointer and hover, the pixel ratio
   and the viewport, cores, the GL renderer, the secure context, wake lock, the dots drawn, the sound state, the lanes that
   mounted, the pointer types that touched it, the exits the guard stopped. one console warning names what to fix at launch. */
const W = window.__wall;
const $ = (s) => document.querySelector(s);
const seen = { touch: 0, pen: 0, mouse: 0, untrusted: 0 };
let fps = 0;
function sample() {
  let n = 0, t0 = 0;
  const f = (t) => { if (!t0) t0 = t; n++; if (t - t0 >= 1000) { fps = Math.round((n * 1000) / (t - t0)); n = 0; t0 = t; } requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
function reasons(env, gl) {
  const r = [];
  if (env.pointer === 'fine') r.push('the pointer reports fine: launch with --blink-settings=primaryPointerType=2,availablePointerTypes=2,primaryHoverType=1,availableHoverTypes=1');
  if (env.dpr === 1 && Math.max(innerWidth, env.w) >= 2560) r.push('pixel ratio 1 on a ' + Math.max(innerWidth, env.w) + ' px wide page: launch with --force-device-scale-factor=' + (Math.round((Math.max(innerWidth, env.w) / 1440) * 10000) / 10000) + ' (native width / 1440)');
  if (gl && gl.software) r.push('webgl is software (' + gl.renderer + '): check chrome://gpu, try --ignore-gpu-blocklist');
  if (gl && !gl.webgl2) r.push('no webgl2: the field draws on the 2D path');
  return r;
}
const yn = (b) => (b ? 'yes' : 'no');
function lines() {
  const X = window.__exhibit, ctx = X && X.ctx, env = W.env, gl = env.gl, A = X && X.atlas;
  let sound = '-'; try { sound = ctx && ctx.wall && ctx.wall.sound && typeof ctx.wall.sound.state === 'function' ? ctx.wall.sound.state() : ctx && ctx.audio && typeof ctx.audio.state === 'function' ? String(ctx.audio.state()) : '-'; } catch (e) { sound = 'error'; }
  let field = '-'; try { field = A && A.gl ? (A.gl.on ? 'gl' : '2d (' + A.gl.why() + ')') : '-'; } catch (e) {}
  let lanes = '-'; try { const l = ctx && ctx.atlas && ctx.atlas.wall && ctx.atlas.wall.lanes; if (l) lanes = Object.keys(l).map((k) => k.replace('wall', '') + ' ' + l[k]).join(', '); } catch (e) {}
  let tier = '-'; try { tier = A ? String(A.gov.tier) : '-'; } catch (e) {}
  let wake = env.wakeLock ? 'supported' : 'not supported'; try { const r = ctx && ctx.wall && ctx.wall.reset; if (r && r.wake != null) wake += ', ' + (typeof r.wake === 'function' ? r.wake() : r.wake); } catch (e) {}
  const live = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  const last = W.guard.seen.slice(-3).map((s) => s.kind + ' ' + s.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 60)).join(' | ');
  return [
    'wall diag (diag=1: installers only, never in a shot)',
    'pointer ' + env.pointer + ', any ' + env.anyPointer + ' · hover ' + env.hover + ', any ' + env.anyHover + ' · coarse ' + yn(env.coarse) + ' · touch points ' + env.touchPoints + (W.opts.input === 'touch' ? ' · input=touch shim: js says coarse ' + yn(live('(pointer: coarse)')) : ''),
    'pixel ratio ' + devicePixelRatio + ' · viewport ' + innerWidth + 'x' + innerHeight + ' · screen ' + env.screenW + 'x' + env.screenH,
    'cores ' + env.cores + (env.memory ? ' · memory ' + env.memory + ' GB' : '') + ' · secure context ' + yn(env.secure) + ' · wake lock ' + wake + ' · navigation api ' + yn(env.navigationApi),
    'gl ' + (gl.renderer || '-') + (gl.software ? ' (software)' : '') + ' · webgl2 ' + yn(gl.webgl2) + ' · field ' + field,
    'dots ' + (X && X.P ? X.P.n.toLocaleString('en-US') : '-') + ' · sound ' + sound + ' · fps ' + fps + ' · governor tier ' + tier,
    'lanes ' + lanes,
    'pointers seen: touch ' + seen.touch + ', pen ' + seen.pen + ', mouse ' + seen.mouse + (seen.untrusted ? ', untrusted ' + seen.untrusted : '') + ' · exits stopped ' + W.guard.n + (last ? ' (' + last + ')' : ''),
    'opts ' + Object.keys(W.opts).map((k) => k + '=' + W.opts[k]).join(' '),
  ];
}
function start() {
  if (!W || !W.opts.diag || $('#wall-diag')) return;
  const box = document.createElement('pre');
  box.id = 'wall-diag'; box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483000;margin:0;max-width:calc(100vw - 16px);padding:10px 12px;'
    + 'background:rgba(10,1,24,.88);border:1px solid rgba(134,203,254,.45);border-radius:4px;color:var(--ice,#86cbfe);'
    + 'font:500 max(12px,1.15vh)/1.45 var(--mono,ui-monospace,Menlo,monospace);white-space:pre-wrap;pointer-events:none';
  document.body.appendChild(box);
  addEventListener('pointerdown', (e) => { if (!e.isTrusted) { seen.untrusted++; return; } seen[e.pointerType] = (seen[e.pointerType] || 0) + 1; }, { capture: true, passive: true });
  sample();
  const why = reasons(W.env, W.env.gl);
  if (why.length) console.warn('wall diag: ' + why.join('; '));
  const paint = () => { const L = lines(); if (why.length) L.push('fix at launch: ' + why.join('; ')); box.textContent = L.join('\n'); };
  paint(); setInterval(paint, 500);
}
if (document.body) start(); else addEventListener('DOMContentLoaded', start, { once: true });
export default start;
