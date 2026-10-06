/* a 1200x630 share card as a 7-inch sleeve (a canvas that never joins the page) + a save / copy / share bar. title = A
   side, fine print = B side, the label = a ring of arm glyphs round the seal (seal.js); pseudonym, url, a certificate of
   the card's own ink. it draws only what it is handed plus that furniture; it fetches no data, stores and sends nothing. */
export const W = 1200, H = 630;
const PAD = 64, MONO = '"JetBrains Mono","SF Mono",ui-monospace,monospace';
const TOK = { ink: '#f0eaff', ice: '#86cbfe', mute: '#a49bbd', tap: '#21f6bc', shuffle: '#f5a623', served: '#8b6fd6', bg: '#0a0118' };
const col = (c) => TOK[c] || c || TOK.ink;
const BASEURL = 'astralcrest.github.io/sonicManifold/';

function fit(g, s, w) {
  if (g.measureText(s).width <= w) return s;
  while (s.length > 1 && g.measureText(s + '…').width > w) s = s.slice(0, -1);
  return s + '…';
}
function wrap(g, s, w, max) {
  const out = []; let line = '';
  for (const word of String(s).split(/\s+/)) {
    const t = line ? line + ' ' + word : word;
    if (g.measureText(t).width > w && line) { out.push(line); line = word; } else line = t;
  }
  if (line) out.push(line);
  if (out.length > max) { out.length = max; out[max - 1] = fit(g, out[max - 1] + ' …', w); }
  return out;
}

const DX = W - PAD - 92, DY = 104, DR = 98;
const side = (g, t, x, y) => { g.strokeStyle = TOK.ice; g.lineWidth = 1.5; g.strokeRect(x, y - 17, 22, 22); g.font = '700 14px ' + MONO; g.fillStyle = TOK.ice; g.textAlign = 'center'; g.fillText(t, x + 11, y - 1); g.textAlign = 'left'; };
/* the record: grooves, 36 arm glyphs in whole-log proportion (7 ° · 6 × · 23 ≡; the order means nothing), the seal */
function disc(g, S) {
  g.fillStyle = '#05000c'; g.beginPath(); g.arc(DX, DY, DR, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(134,203,254,.13)'; g.lineWidth = 1;
  for (let r = DR * 0.72; r < DR - 2; r += 3.5) { g.beginPath(); g.arc(DX, DY, r, 0, Math.PI * 2); g.stroke(); }
  g.font = '700 14px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 36; i++) {
    const k = i < 7 ? 0 : i < 13 ? 1 : 2, t = -Math.PI / 2 + i * Math.PI / 18;
    g.fillStyle = col(['tap', 'shuffle', 'served'][k]); g.fillText('°×≡'[k], DX + Math.cos(t) * DR * 0.6, DY + Math.sin(t) * DR * 0.6);
  }
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (S) S.drawSeal(g, DX, DY, DR * 0.48);
}

export function draw(spec, S) {
  const s = spec || {}, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); if (!g) return null;
  const T = (f, c, t, x, y, al) => { g.font = f + ' ' + MONO; g.fillStyle = col(c); g.textAlign = al || 'left'; g.fillText(t, x, y); };
  const IW = W - PAD * 2;
  g.fillStyle = TOK.bg; g.fillRect(0, 0, W, H); g.textBaseline = 'alphabetic';
  const RW = IW - DR * 2 - 40;
  side(g, 'A', PAD, 124);
  if (s.kicker) { g.font = '600 15px ' + MONO; if ('letterSpacing' in g) g.letterSpacing = '3px'; T('600 15px', 'ice', fit(g, String(s.kicker).toUpperCase(), RW - 36), PAD + 36, 76); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
  let dw = 0;
  if (s.demo) { g.font = '600 14px ' + MONO; const tw = g.measureText('DEMO DATA').width + 24; dw = tw + 16; g.strokeStyle = TOK.ice; g.lineWidth = 1.5; g.strokeRect(PAD + RW - tw, 56, tw, 30); T('600 14px', 'ice', 'DEMO DATA', PAD + RW - tw + 12, 76); }
  if (s.title) { g.font = '600 36px ' + MONO; T('600 36px', 'ink', fit(g, s.title, RW - 36), PAD + 36, 124); }
  let y = s.hero && s.hero.length ? 176 : 200;
  const hero = (s.hero || []).slice(0, 3), big = hero.length > 2 ? 44 : 52;
  for (const r of hero) {
    y += big; let x = PAD;
    for (const sg of r.segs || []) { const t = String(sg[0]); T('700 ' + big + 'px', sg[1], t, x, y); x += g.measureText(t).width; }
    y = (r.strip ? strip(g, r.strip, y + 22) : y) + 26;
  }
  const rows = (s.rows || []).slice(0, 7);
  if (rows.length) {
    const cx = Math.max(...rows.map((r) => (r.cells || []).length)) > 2 ? [W - PAD - 220, W - PAD] : [W - PAD];
    if (s.cols) { s.cols.slice(1).forEach((c, i) => T('500 14px', 'mute', String(c), cx[i], y + 8, 'right')); y += 16; }
    const rh = Math.min(48, Math.floor((470 - y) / rows.length));
    for (const r of rows) {
      y += rh; const c = r.cells || [], k = r.colors || [];
      g.font = '500 22px ' + MONO; T('500 22px', k[0], fit(g, String(c[0] || ''), cx[0] - PAD - 180), PAD, y);
      for (let i = 1; i < c.length && i <= cx.length; i++) T('700 30px', k[i], String(c[i]), cx[i - 1], y, 'right');
    }
    y += 16;
  }
  if (s.note) { y = Math.max(y, 420) + 10; g.font = '500 22px ' + MONO; T('500 22px', 'ink', fit(g, s.note, IW), PAD, y); }
  if (s.fine) { g.font = '400 16px ' + MONO; const L = wrap(g, s.fine, IW - 36, 3); side(g, 'B', PAD, 528 - (L.length - 1) * 22); L.forEach((l, i) => T('400 16px', 'mute', l, PAD + 36, 528 - (L.length - 1 - i) * 22)); }
  g.strokeStyle = 'rgba(134,203,254,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(PAD, 546.5); g.lineTo(W - PAD, 546.5); g.stroke();
  T('600 18px', 'ink', 'astralcrest', PAD, 576);
  const path = s.path || 'exhibit.html';
  g.font = '500 17px ' + MONO; T('500 17px', 'ice', fit(g, BASEURL + path, IW - 200), W - PAD, 576, 'right');
  /* count this card's ink before the (inked) record goes on */
  const au = S && S.inkAudit(cv);
  disc(g, S);
  if (S) { g.font = '400 13px ' + MONO; cv.dataset.cert = S.certLine(au, S.edition(path.replace(/^[^#]*/, '') || '#'), 'this sleeve').join(' · '); T('400 13px', 'mute', fit(g, cv.dataset.cert, IW), PAD, 606); }
  return cv;
}

/* 100 cells, coloured by counts (sum 100): glyph chars when given, dots otherwise */
function strip(g, st, y) {
  const pitch = (W - PAD * 2) / 100, cnt = st.counts || [], cs = st.colors || [], gl = st.glyphs;
  let k = 0, left = cnt[0] || 0;
  g.font = '700 16px ' + MONO; g.textAlign = 'center';
  for (let i = 0; i < 100; i++) {
    while (left <= 0 && k < cnt.length - 1) left = cnt[++k] || 0;
    const on = left-- > 0, x = PAD + pitch * (i + 0.5);
    g.fillStyle = on ? col(cs[k]) : 'rgba(164,155,189,.25)';
    if (gl && on) g.fillText(gl[k] || 'o', x, y + 6);
    else { g.beginPath(); g.arc(x, y, 3.8, 0, Math.PI * 2); g.fill(); }
  }
  return y;
}

/* the seal loads with the card: no fetch mid-parse */
const SP = import('./seal.js' + new URL(import.meta.url).search).catch(() => null);
export async function render(spec) {
  const S = await SP;
  try { await Promise.race([document.fonts.load('600 36px "JetBrains Mono"'), new Promise((r) => setTimeout(r, 400))]); } catch (e) {}
  return draw(spec, S);
}

export function toFile(cv, name) {
  return new Promise((res) => { if (!cv || !cv.toBlob) { res(null); return; } cv.toBlob((b) => res(b ? new File([b], name || 'card.png', { type: 'image/png' }) : null), 'image/png'); });
}

const IOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ios safari shows a blob download as a page: there the png goes to a tab opened inside the click, to hold and save */
export function save(file, name, tab) {
  if (!file) { try { tab && tab.close(); } catch (e) {} return false; }
  const url = URL.createObjectURL(file);
  if (tab) { try { tab.location.href = url; } catch (e) { tab = null; } }
  if (!tab) { const a = document.createElement('a'); a.href = url; a.download = name || file.name || 'card.png'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

export async function copyText(text) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
  try {
    const t = document.createElement('textarea'); t.value = text; t.readOnly = true; t.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return !!ok;
  } catch (e) { return false; }
}

export async function share({ file, text, title } = {}) {
  if (!navigator.share) return 'unsupported';
  const d = { title: title || 'sonicManifold', text: text || '' };
  try { if (file && navigator.canShare && navigator.canShare({ files: [file] })) d.files = [file]; } catch (e) {}
  try { await navigator.share(d); return 'shared'; } catch (e) { return e && e.name === 'AbortError' ? 'cancelled' : 'unsupported'; }
}

const CSS = `.cd-bar{display:flex;flex-wrap:wrap;align-items:center;gap:2px 16px;margin:0}
.cd-b{margin:0;padding:6px 0;border:0;background:none;color:var(--ice,#86cbfe);font:500 11px/1.4 var(--mono,monospace);text-decoration:underline;text-underline-offset:3px;cursor:pointer}
.cd-b:focus-visible{outline:2px solid var(--mint,#21f6bc);outline-offset:3px}
.cd-b:disabled{opacity:.45;cursor:default}
.cd-b[hidden],.cd-s:empty{display:none}
.cd-s{font:400 11px/1.4 var(--mono,monospace);color:var(--mute,#a49bbd)}
@media (hover:hover){.cd-b:not(:disabled):hover{color:#b6e0ff}}
@media (pointer:coarse){.cd-b{display:inline-flex;align-items:center;min-height:44px;min-width:44px}}`;

export function bar(host, opts = {}) {
  if (!document.getElementById('cd-css')) { const st = document.createElement('style'); st.id = 'cd-css'; st.textContent = CSS; document.head.appendChild(st); }
  const L = Object.assign({ save: 'save picture', copy: 'the run-out groove', share: 'share' }, opts.labels || {}), ctx = opts.ctx;
  const el = document.createElement('div'); el.className = 'cd-bar' + (opts.cls ? ' ' + opts.cls : ''); el.setAttribute('role', 'group'); el.setAttribute('aria-label', opts.label || 'share this card');
  const btn = (k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'cd-b cd-' + k; b.textContent = L[k]; b.disabled = true; el.appendChild(b); return b; };
  const bS = btn('save'), bC = btn('copy'), bH = btn('share'), st = document.createElement('span');
  bC.setAttribute('aria-label', L.copy + ': copy as text');
  st.className = 'cd-s'; st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite'); el.appendChild(st);
  bH.hidden = !navigator.share; if (host) host.appendChild(el);
  let cur = null, stT = 0;
  const say = (t) => { st.textContent = t; clearTimeout(stT); if (t) stT = setTimeout(() => { st.textContent = ''; }, 4000); };
  const tone = (step, e) => { const A = ctx && ctx.audio; try { if (A.tick && e) A.tick(e.currentTarget, { kind: 'control', x: e.clientX }); else A.note(step, { type: 'triangle', vol: 0.025, dur: 0.18 }); } catch (er) {} };
  const done = (k, ok, t) => { say(t); if (ok) tone(k === 'share' ? 9 : 7); try { opts.onAction && opts.onAction(k, ok); } catch (e) {} };
  [bS, bC, bH].forEach((b) => b.addEventListener('pointerenter', (e) => { if (!b.disabled && e.pointerType === 'mouse') tone(5, e); }));
  bS.addEventListener('click', () => {
    if (!cur) return;
    const c = cur; let tab = null;
    try { if (IOS()) tab = window.open('', '_blank'); } catch (e) {}
    const go = (f) => done('save', save(f, c.name, tab), f ? 'picture saved' : 'could not draw the picture');
    if (c.file) go(c.file); else c.p.then(go);
  });
  bC.addEventListener('click', () => { if (cur) copyText(cur.text).then((ok) => done('copy', ok, ok ? 'text copied' : 'could not copy')); });
  bH.addEventListener('click', () => {
    if (!cur) return;
    share({ file: cur.file, text: cur.text, title: cur.title }).then((r) => {
      if (r === 'unsupported') copyText(cur.text).then((ok) => done('share', ok, ok ? 'text copied instead' : ''));
      else done('share', r === 'shared', r === 'shared' ? 'shared' : '');
    });
  });
  return {
    el,
    set(spec, text, name) {
      const c = { spec, text: text || '', name: name || 'card.png', title: spec && spec.title, file: null };
      c.p = render(spec).then((cv) => toFile(cv, c.name)).then((f) => { c.file = f; return f; });
      cur = c; bS.disabled = bC.disabled = bH.disabled = false; say('');
      return c.p;
    },
    clear() { cur = null; bS.disabled = bC.disabled = bH.disabled = true; say(''); },
    destroy() { cur = null; clearTimeout(stT); el.remove(); },
  };
}
