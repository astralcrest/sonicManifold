/* hold it up: on a phone, tilt turns the field. a chip in the dock's more shelf turns it on; nothing is stored or sent */
const A = 0.12, DZ = 3, CAP = 30, RATE = 4;
let LIVE = null;
export default function mount(ctx) {
  if (LIVE) return LIVE;
  LIVE = mount0(ctx); const u0 = LIVE.unmount; LIVE.unmount = function () { try { return u0.apply(this, arguments); } finally { LIVE = null; } };
  return LIVE;
}
function mount0(ctx) {
  const w = window, ok = 'DeviceOrientationEvent' in w && matchMedia('(pointer:coarse)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = { on: false, events: 0, nudges: 0, held: 0, cost: 0, shown: false };
  if (!ok) return { unmount() {}, stats: () => S };
  const down = new Set(); let btn = null, mo = null, shelf = null, dead = false, b0 = null, g0 = null, fb = 0, fg = 0, lt = 0, first = null, tm = 0;
  const st = document.createElement('style');
  st.textContent = '#atlas-dock .d-more>button[data-a=tilt]{min-height:44px;min-width:44px}#atlas-dock .d-more>button[data-a=tilt].on .d-ic{color:var(--mint,#7dffc9)}';
  document.head.appendChild(st);
  const view = () => ctx.view;
  const label = (t) => { if (btn) { btn.lastChild.textContent = t; btn.classList.toggle('on', S.on); btn.setAttribute('aria-pressed', String(S.on)); } };
  const pd = (e) => { down.add(e.pointerId); }, pu = (e) => { down.delete(e.pointerId); }, clr = () => down.clear();
  function onO(e) {
    if (e.beta == null || e.gamma == null) return;
    const t0 = performance.now();
    S.events++;
    if (first == null) { first = t0; clearTimeout(tm); }
    if (b0 == null) { b0 = fb = e.beta; g0 = fg = e.gamma; lt = t0; return; }
    fb += A * (e.beta - fb); fg += A * (e.gamma - fg);
    const dt = Math.min(0.05, (t0 - lt) / 1000); lt = t0;
    if (down.size) { S.held++; return; }
    const v = view();
    if (!v || v.flying || !dt) return;
    const cl = (x) => Math.max(-CAP, Math.min(CAP, x)), dz = (x) => (Math.abs(x) < DZ ? 0 : x - Math.sign(x) * DZ);
    const dx = cl(dz(fg - g0)) * RATE * dt, dy = cl(dz(fb - b0)) * RATE * dt;
    if (dx || dy) { S.nudges++; try { v.mode === 'pan' ? v.pan(-dx, -dy) : v.orbitBy(dx, dy); } catch (x) {} }
    S.cost += performance.now() - t0;
  }
  function stop() {
    w.removeEventListener('deviceorientation', onO);
    S.on = false; b0 = g0 = first = null; clearTimeout(tm); label('tilt');
  }
  async function start() {
    const D = w.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') { let r = 'denied'; try { r = await D.requestPermission(); } catch (e) {} if (r !== 'granted') return fail(); }
    S.on = true; b0 = g0 = first = null; w.addEventListener('deviceorientation', onO); label('tilt on');
    tm = setTimeout(() => { if (first == null) fail(); }, 1500);
  }
  function fail() {
    stop(); label('no tilt here');
    setTimeout(() => { dead = true; if (btn) btn.remove(); S.shown = false; }, 2000);
  }
  function put() {
    if (dead || !shelf) return;
    if (!btn) {
      btn = document.createElement('button'); btn.type = 'button'; btn.dataset.a = 'tilt'; btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<span class="d-ic" aria-hidden="true">◌</span>tilt';
      btn.addEventListener('click', () => { S.on ? stop() : start(); });
    }
    if (btn.parentNode !== shelf) { shelf.appendChild(btn); S.shown = true; }
  }
  let tries = 0;
  (function find() {
    shelf = document.getElementById('atlas-dock-more');
    if (!shelf) { if (!dead && tries++ < 50) tm = setTimeout(find, 200); return; }
    put(); mo = new MutationObserver(put); mo.observe(shelf, { childList: true });
  })();
  document.addEventListener('pointerdown', pd, true); ['pointerup', 'pointercancel'].forEach((n) => document.addEventListener(n, pu, true));
  w.addEventListener('blur', clr);
  return {
    unmount() {
      dead = true; stop(); if (mo) mo.disconnect(); if (btn) btn.remove(); st.remove();
      document.removeEventListener('pointerdown', pd, true); ['pointerup', 'pointercancel'].forEach((n) => document.removeEventListener(n, pu, true)); w.removeEventListener('blur', clr);
    },
    stats: () => ({ ...S, perEventMs: S.events ? S.cost / S.events : 0 }),
  };
}
