/* exhibit/atlas/photo.js — package M8: photo and share (BUILD_SPEC_V2 §9.6, §9.8, §5; BRIEF M8).
   Two entry points: a `share` chip (copies the exact-view URL) and a `photo` chip that opens a 5-action
   bar — save picture · copy as text · freeze · labels · done. Mounts its own DOM (module convention):
   into #atlas-info when the chrome (M3) has already landed one, else a small standalone dock, so the
   feature is complete and testable on its own regardless of build order (chrome always mounts before
   photo, §SKELETON 2, so #atlas-info exists whenever M3 has landed).
   Privacy (§9.8): the burned caption and the copy-as-text footer name only the pseudonym and the public
   URL, never a real name or a local path. */
export function mount(ctx) {
  if (!ctx.atlas || !ctx.atlas.on) return null; /* ?atlas=0: the shell keeps its inert default */

  const doc = document, body = doc.body;
  const stopId = () => { const st = ctx.stops || [], i = ctx.index; return (st[i] && st[i].id) || 'atlas'; };
  const caption = () => 'sonic manifold · ' + stopId() + ' · astralcrest.github.io/sonicManifold/exhibit.html';
  const tell = (msg) => { try { ctx.toast(msg); } catch (e) {} try { ctx.say(msg); } catch (e) {} };

  /* ---------------------------------------------------------------- DOM: two chips + the 5-action bar */
  const host = doc.getElementById('atlas-info');
  const standalone = !host;
  const dock = doc.createElement('div');
  dock.className = 'atlas-photodock' + (standalone ? ' atlas-photodock-standalone' : '');
  dock.dataset.idle = 'hide'; /* §1.12: faded with the rest of the chrome once M3's idle system lands */

  const shareBtn = doc.createElement('button');
  shareBtn.type = 'button'; shareBtn.className = 'atlas-chip'; shareBtn.dataset.act = 'share'; shareBtn.textContent = 'share';

  const group = doc.createElement('div'); group.className = 'atlas-photogroup';
  const photoBtn = doc.createElement('button');
  photoBtn.type = 'button'; photoBtn.className = 'atlas-chip'; photoBtn.dataset.act = 'photo';
  photoBtn.textContent = 'photo'; photoBtn.setAttribute('aria-expanded', 'false'); photoBtn.setAttribute('aria-controls', 'atlas-photobar');

  const bar = doc.createElement('div');
  bar.id = 'atlas-photobar'; bar.className = 'atlas-photobar'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'photo actions'); bar.hidden = true;

  const mkBtn = (act, text, pressed) => {
    const b = doc.createElement('button'); b.type = 'button'; b.className = 'atlas-chip atlas-photobar-btn'; b.dataset.act = act; b.textContent = text;
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed));
    return b;
  };
  const saveBtn = mkBtn('save', 'save picture');
  const copyBtn = mkBtn('copy', 'copy as text');
  const freezeBtn = mkBtn('freeze', 'freeze', false);
  const labelsBtn = mkBtn('labels', 'labels', true);
  const doneBtn = mkBtn('done', 'done');
  bar.append(saveBtn, copyBtn, freezeBtn, labelsBtn, doneBtn);
  group.append(photoBtn, bar);
  dock.append(shareBtn, group);
  (host || body).appendChild(dock);

  /* ---------------------------------------------------------------- state */
  let opened = false, frozen = false, savedEase = null, pendingEase = null, easeHooked = false, forceEase = null, opener = null;

  /* a room may reassign P.ease on its own clock while it is the active one (an arrival choreography, a
     flood's payoff, …), independent of anything photo.js does — freeze must out-rank that for as long as
     the bar says frozen, not just for one instant. Rather than race a per-frame re-pin against whatever
     timing the active room uses, the property itself is guarded: while frozen, an external write is
     remembered (so a legitimate change is not lost) but does not take effect until done() restores it;
     photo.js's own writes go through `forceEase`, which bypasses the trap. */
  function hookEase() {
    if (easeHooked) return; easeHooked = true;
    const P = ctx.particles; let real = P.ease;
    try {
      Object.defineProperty(P, 'ease', {
        configurable: true, enumerable: true,
        get() { return real; },
        set(v) { if (frozen) { pendingEase = v; return; } real = v; },
      });
      forceEase = (v) => { real = v; };
    } catch (e) { easeHooked = false; forceEase = null; } /* a sealed P (should never happen): best effort, one frame's lag */
  }

  function labelsCurrentlyOn() { let v; try { v = ctx.settings.get('labels'); } catch (e) { v = true; } return v !== false && v !== 'off'; }

  /* Escape is handled on `document`, capture phase, only while the bar is open — not as a keydown
     listener scoped to `bar` itself. A bar-scoped bubble listener only ever fires when the event's
     target is a descendant of `bar`, i.e. only once focus has actually landed inside it; the same
     capture-phase idiom already used by the ladder and search panels (ladder.js `onPanelKey`,
     search.js `onKeydownCapture`) instead intercepts Escape unconditionally while open, so it reaches
     the shell's window-level `Escape → view.home()` fallback (shell.js) before that bubble-phase
     listener ever runs — true regardless of focus, and not a race against propagation order. */
  function onDocKeydown(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault(); e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    closeBar();
  }

  function focusEl(el) {
    if (!el || typeof el.focus !== 'function') return false;
    try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) { return false; } }
    return doc.activeElement === el;
  }

  /* drop `is-open` once focus has actually left the dock, not the instant close() runs. A host stylesheet
     may key the dock's own visibility off `.is-open` (chrome.css's compact-card exemption, W18) — dropping
     the class the moment we hand focus back can make that ancestor go display:none again on the very next
     rendered frame (a real, observed browser behaviour: the freshly non-rendered element is unfocused
     asynchronously, moving focus to <body>), undoing the focus-return we just did. Waiting for a real
     focusout first means the class only ever comes off once nothing inside the dock still needs it focusable. */
  function dropOpenClass() {
    if (dock.contains(doc.activeElement)) {
      dock.addEventListener('focusout', function onOut(e) {
        if (dock.contains(e.relatedTarget)) return; // focus moved within the dock; still needs is-open
        dock.removeEventListener('focusout', onOut);
        dock.classList.remove('is-open');
      });
    } else {
      dock.classList.remove('is-open');
    }
  }

  function openBar() {
    if (opened) return;
    /* the opener is whatever actually had focus when open() was invoked (normally photoBtn, but a
       future overflow-row entry or a programmatic call may differ) — falls back to photoBtn so focus
       still returns somewhere sensible when open() is called with nothing focused (e.g. from a test). */
    opener = (doc.activeElement && doc.activeElement !== body) ? doc.activeElement : null;
    opened = true; photoBtn.setAttribute('aria-expanded', 'true'); photoBtn.hidden = true; bar.hidden = false;
    dock.classList.add('is-open');
    labelsBtn.setAttribute('aria-pressed', String(labelsCurrentlyOn()));
    try { ctx.idle.wake(); } catch (e) {}
    doc.addEventListener('keydown', onDocKeydown, true);
    focusEl(saveBtn);
  }
  function closeBar() {
    if (!opened) return;
    if (frozen) setFrozen(false);
    doc.removeEventListener('keydown', onDocKeydown, true);
    opened = false; photoBtn.setAttribute('aria-expanded', 'false'); photoBtn.hidden = false; bar.hidden = true;
    /* focus the opener (or fall back to the chip) *before* dropping `is-open` — a host stylesheet may key the
       dock's own visibility off `.is-open` (e.g. chrome.css's compact-card exemption), so moving focus first
       means the target is still guaranteed on-screen at the moment it's asked to take focus; only once that
       has resolved does the dock's open-state styling stand down. */
    const back = opener; opener = null;
    if (!focusEl(back)) focusEl(photoBtn);
    dropOpenClass();
  }

  function setFrozen(on) {
    on = !!on; if (on === frozen) return;
    if (on) {
      hookEase();
      savedEase = ctx.particles.ease; pendingEase = null;
      if (forceEase) forceEase(0); else ctx.particles.ease = 0;
      frozen = true;
      try { ctx.idle.hold('photo', true); } catch (e) {}
    } else {
      frozen = false; /* flip before restoring, so a room reacting to the new value sees the real number */
      const restoreTo = pendingEase != null ? pendingEase : savedEase;
      if (forceEase) forceEase(restoreTo); else ctx.particles.ease = restoreTo;
      savedEase = null; pendingEase = null;
      try { ctx.idle.hold('photo', false); } catch (e) {}
    }
    freezeBtn.setAttribute('aria-pressed', String(on));
  }

  function setLabelsOn(on) {
    on = !!on;
    try { ctx.settings.set('labels', on); } catch (e) {}
    labelsBtn.setAttribute('aria-pressed', String(on));
  }

  /* ---------------------------------------------------------------- the capture flash (§9: decorative, never data) */
  function flash() {
    if (ctx.reduced) return;
    const el = doc.createElement('div'); el.className = 'atlas-photoflash'; el.setAttribute('aria-hidden', 'true');
    body.appendChild(el);
    const gone = () => { if (el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener('animationend', gone, { once: true });
    setTimeout(gone, 700); /* belt and braces: an animation that never fires must not leak the node */
  }

  function triggerDownload(href, name) {
    const a = doc.createElement('a'); a.href = href; a.download = name; a.rel = 'noopener';
    body.appendChild(a); a.click(); body.removeChild(a);
  }

  /* ---------------------------------------------------------------- composite #field + #glow(screen) + #overlay */
  function composite() {
    const field = doc.getElementById('field'), glowEl = doc.getElementById('glow'), overlay = doc.getElementById('overlay');
    if (!field || !overlay) return null;
    const dpr = self.devicePixelRatio || 1;
    const outW = overlay.width || Math.round(innerWidth * dpr), outH = overlay.height || Math.round(innerHeight * dpr);
    if (!outW || !outH) return null;
    const oc = doc.createElement('canvas'); oc.width = outW; oc.height = outH;
    const g = oc.getContext('2d');
    g.drawImage(field, 0, 0, outW, outH);
    if (glowEl && glowEl.width && glowEl.height) {
      g.save();
      if ('filter' in g) { try { g.filter = 'blur(' + Math.max(1, Math.round(7 * dpr)) + 'px)'; } catch (e) {} }
      g.globalCompositeOperation = 'screen';
      g.drawImage(glowEl, 0, 0, outW, outH);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    g.drawImage(overlay, 0, 0, outW, outH);
    const text = caption(), fs = Math.max(11, Math.round(11 * dpr)), pad = Math.round(9 * dpr);
    g.font = '600 ' + fs + 'px "JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace';
    g.textBaseline = 'alphabetic';
    const tw = g.measureText(text).width, barH = fs + pad * 1.6;
    g.fillStyle = 'rgba(10,1,24,0.62)';
    g.fillRect(0, outH - barH, Math.min(outW, tw + pad * 2), barH);
    g.fillStyle = '#86cbfe';
    g.fillText(text, pad, outH - barH / 2 + fs * 0.32);
    return oc;
  }

  /* ---------------------------------------------------------------- the five actions + share */
  async function savePicture() {
    let oc; try { oc = composite(); } catch (e) { oc = null; }
    if (!oc) { tell('this browser blocks saving pictures'); return { ok: false }; }
    let dataUrl;
    try { dataUrl = oc.toDataURL('image/png'); } catch (e) { tell('this browser blocks saving pictures'); return { ok: false }; }
    try { triggerDownload(dataUrl, 'sonic-manifold-' + stopId() + '.png'); } catch (e) { tell('this browser blocks saving pictures'); return { ok: false }; }
    flash();
    return { ok: true };
  }

  async function writeClipboard(text) {
    try { if (self.isSecureContext !== false && navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; } } catch (e) {}
    try {
      const ta = doc.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
      body.appendChild(ta); ta.focus(); ta.select();
      const ok = !!(doc.execCommand && doc.execCommand('copy'));
      body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  async function copyText() {
    let body_ = ''; try { body_ = (ctx.atlas.GF && ctx.atlas.GF.toText()) || ''; } catch (e) { body_ = ''; }
    const text = body_ + '\n\n' + caption();
    const copied = await writeClipboard(text);
    if (copied) tell('copied as text');
    else {
      try {
        const blob = new Blob([text], { type: 'text/plain' }), url = URL.createObjectURL(blob);
        triggerDownload(url, 'sonic-manifold-' + stopId() + '.txt');
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } catch (e) {}
      tell('saved as a text file');
    }
    flash();
    return { ok: true, text, copied };
  }

  async function share() {
    const url = location.href;
    const copied = await writeClipboard(url);
    tell(copied ? 'link copied' : 'select and copy the link');
    return { ok: copied, url };
  }

  /* ---------------------------------------------------------------- wiring */
  shareBtn.addEventListener('click', () => { share(); });
  photoBtn.addEventListener('click', () => { openBar(); });
  saveBtn.addEventListener('click', () => { savePicture(); });
  copyBtn.addEventListener('click', () => { copyText(); });
  freezeBtn.addEventListener('click', () => { setFrozen(!frozen); });
  labelsBtn.addEventListener('click', () => { setLabelsOn(!labelsCurrentlyOn()); });
  doneBtn.addEventListener('click', () => { closeBar(); });
  try { ctx.onStop(() => { if (opened) closeBar(); }); } catch (e) {} /* a room change ends the photo mode for the room that is leaving, not the one arriving */

  return {
    get isOpen() { return opened; },
    get isFrozen() { return frozen; },
    get labelsOn() { return labelsCurrentlyOn(); },
    open: openBar, close: closeBar,
    toggleFreeze(on) { setFrozen(on === undefined ? !frozen : on); },
    toggleLabels(on) { setLabelsOn(on === undefined ? !labelsCurrentlyOn() : on); },
    savePicture, copyText, share,
  };
}
export default { mount };
