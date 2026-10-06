/* your hand: a press or drag on the field lays ° in mint on the field's own cell grid, then fades. a listener only; the camera
   keeps every drag. loaded on the first press, subscribed to the frame only while a mark is alive. nothing leaves the tab. */
const LIFE = 3000, HOLD = 500, CAP = 512, GAP = 160, MINT = '#21f6bc', KEY = 'sm_hand_v1';
const RM = matchMedia('(prefers-reduced-motion: reduce)'), FC = matchMedia('(forced-colors: active)');
const MC = new Int32Array(CAP), MR = new Int32Array(CAP), MT = new Float64Array(CAP);
const S = { laid: 0, session: 0, alive: 0, ticks: 0, frames: 0, cost: 0, cw: 0, ch: 0, D: 1, presses: 0 };
let head = 0, cv = null, g = null, spr = null, hot = null, unF = null, down = new Set(), lc = -1e9, lr = -1e9, tickT = -1e9, gx0 = 0, gy0 = 0, W = 0, H = 0;
try { S.session = +sessionStorage.getItem(KEY) || 0; } catch (e) { /* storage blocked: the count restarts */ }
const X = () => window.__exhibit;
const now = () => performance.now();

function grid() {
  const x = X(), field = document.getElementById('field');
  let cw = 8, ch = 14, a = 0, b = 0;
  try { const i = x.atlas.GF.info(); if (i.cell[0] > 0) { cw = i.cell[0]; ch = i.cell[1]; a = i.grid.gx0; b = i.grid.gy0; } } catch (e) { /* the default pitch */ }
  S.D = field && field.width ? field.width / innerWidth : devicePixelRatio || 1;
  S.cw = cw; S.ch = ch; gx0 = a; gy0 = b;
}
function sprite() {
  const w = Math.ceil(S.cw * 2), h = Math.ceil(S.ch * 2), c = document.createElement('canvas');
  c.width = w; c.height = h;
  const q = c.getContext('2d'), fc = FC.matches;
  q.font = '700 ' + S.cw * 1.9 + 'px "JetBrains Mono",ui-monospace,monospace'; q.textAlign = 'center'; q.textBaseline = 'middle';
  q.fillStyle = fc ? 'CanvasText' : MINT;
  if (!fc) { q.shadowColor = MINT; q.shadowBlur = S.cw * 0.7; }
  q.fillText('°', w / 2, h * 0.42);
  spr = c;
}
function make() {
  if (cv) return;
  const st = document.createElement('style');
  st.textContent = '#sm-hand{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100svh;z-index:1;pointer-events:none}';
  document.head.appendChild(st);
  cv = document.createElement('canvas'); cv.id = 'sm-hand'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv); g = cv.getContext('2d');
}
function size() {
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * S.D); cv.height = Math.round(H * S.D);
  sprite();
}

function lay(c, r, t) {
  MC[head] = c; MR[head] = r; MT[head] = t; head = (head + 1) % CAP;
  S.laid++; S.session++; lc = c; lr = r;
  try { sessionStorage.setItem(KEY, String(S.session)); } catch (e) { /* ignore */ }
}
function at(e, first) {
  const c = Math.floor((e.clientX * S.D - gx0) / S.cw), r = Math.floor((e.clientY * S.D - gy0) / S.ch), t = now();
  if (first || RM.matches) { if (first) lay(c, r, t); }
  else if (c !== lc || r !== lr) {
    let a = lc, b = lr, n = 0;
    const dc = Math.abs(c - a), dr = Math.abs(r - b), sc = a < c ? 1 : -1, sr = b < r ? 1 : -1;
    let er = dc - dr;
    if (a === -1e9 || dc + dr > 60) lay(c, r, t);
    else while ((a !== c || b !== r) && n++ < 80) { const e2 = 2 * er; if (e2 > -dr) { er -= dr; a += sc; } if (e2 < dc) { er += dc; b += sr; } lay(a, b, t); }
  }
  S.alive = Math.min(CAP, S.alive + 1);
  wake(e);
}
function wake(e) {
  if (!unF) { const x = X(); if (x && x.ctx) unF = x.ctx.onFrame(frame); }
  const t = now(), x = X(), A = x && x.ctx && x.ctx.audio;
  if (t - tickT >= GAP && A && A.tick && !A.muted) {
    tickT = t; S.ticks++;
    try { A.tick('hand:' + (S.laid % 9), { kind: 'label', fam: 'neutral', plays: S.laid, x: e.clientX, y: e.clientY, force: true }); } catch (er) { /* the voice is optional */ }
  }
}

function frame() {
  const t0 = now(), rm = RM.matches;
  if (innerWidth !== W || innerHeight !== H) size();
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  let n = 0;
  for (let i = 0; i < CAP; i++) {
    const age = t0 - MT[i];
    if (age < 0 || age >= LIFE || MT[i] === 0) continue;
    n++;
    g.globalAlpha = rm || age < HOLD ? 1 : 1 - (age - HOLD) / (LIFE - HOLD);
    g.drawImage(spr, Math.round(gx0 + (MC[i] - 0.5) * S.cw), Math.round(gy0 + (MR[i] - 0.5) * S.ch));
  }
  g.globalAlpha = 1; S.alive = n;
  if (!n && !down.size && unF) { unF(); unF = null; }
  S.frames++; S.cost += now() - t0;
}

function press(e) {
  if (!document.documentElement.classList.contains('atlas')) return;
  const x = X(); if (!x || !x.ctx) return;
  S.presses++; make(); grid(); size();
  down.add(e.pointerId == null ? 0 : e.pointerId);
  lc = -1e9; lr = -1e9; hot = e.pointerId == null ? 0 : e.pointerId;
  if (down.size === 1) at(e, true);
}
function onDown(e) { if (e.target && e.target.id === 'atlas-stage' && (e.pointerType !== 'mouse' || e.button === 0 || e.button === 2)) press(e); }
function onMove(e) {
  if (!down.size) return;
  if (e.pointerType === 'mouse' && !e.buttons) { down.clear(); return; }
  if (down.size > 1 || (e.pointerId != null && e.pointerId !== hot)) return;
  at(e, false);
}
function onUp(e) { down.delete(e.pointerId == null ? 0 : e.pointerId); }
addEventListener('pointerdown', onDown, { capture: true, passive: true });
addEventListener('pointermove', onMove, { capture: true, passive: true });
addEventListener('pointerup', onUp, { capture: true, passive: true });
addEventListener('pointercancel', onUp, { capture: true, passive: true });

/* the loader hands over the press that woke it, which came before this module existed */
export function first(e) { if (e && e.target && e.target.id === 'atlas-stage') press(e); }
export function stats() { return { ...S, subscribed: !!unF, down: down.size, canvas: !!cv, reduced: RM.matches }; }
